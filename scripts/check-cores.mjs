// The shared cores' integrity manifest, scripts/cores.json, and its check (overhaul F25: a manifest, no move).
//
//   node scripts/check-cores.mjs                 check
//   node scripts/check-cores.mjs --base <ref>    also compare with <ref>'s cores.json: a core whose policy there is
//                                                frozen, a v1 pin or not edited (D4) and whose recorded SHA-256
//                                                changed fails, unless cores.json sanctions that exact change; the
//                                                other changed cores are listed with the consumer suites that must pass
//   node scripts/check-cores.mjs --update        rewrite sha256, exports, names used and pages from the files
//
// For every core: its SHA-256 must be the recorded one. A changed core fails until the same change updates
// cores.json (--update) and its consumers' suites pass (CI runs them in the same workflow: tests/run-all.cjs). The
// recorded exports must all still exist (cores marked "additive only" may gain names, never lose them).
// For every consumer: the names it uses of each core (alias.name and alias.name.name, scripts/lib/core-names.cjs) must
// exist in that core as Node loads it, and must be the names recorded, so a new dependency shows up in review.
// The pages that load each core by <script src> are listed for information; a difference is a NOTE, not a failure.
// A sanctioned change (D4 allows a frozen core to change only by the user's decision, e.g. D17) is recorded on that
// core in cores.json, in the same change, and names the new SHA-256, so it covers that one change only:
//   "sanctioned": { "sha256": "<the core's new SHA-256>", "reason": "<the decision, e.g. D17, PR #32>" }
// --update never writes it. Exits 1 on any failure, 0 otherwise.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'scripts', 'cores.json');
const N = require('./lib/core-names.cjs');
const args = process.argv.slice(2), UPDATE = args.includes('--update'), baseAt = args.indexOf('--base'), BASE = baseAt >= 0 ? args[baseAt + 1] : null;
const M = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
let failed = 0;
const out = (ok, label, detail = '') => { if (ok === false) failed++; console.log(`${ok === null ? 'NOTE' : ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`); };

// the pages that load a core by <script src="...file">
function pagesLoading(file) {
    const base = path.basename(file), hits = [];
    const walk = dir => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (e.name.startsWith('.') || e.name === 'node_modules') continue;
            const p = path.join(dir, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.name.endsWith('.html')) {
                const src = fs.readFileSync(p, 'utf8');
                for (const m of src.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) {
                    if (path.basename(decodeURIComponent(m[1].split('?')[0])) !== base) continue;
                    if (path.resolve(path.dirname(p), decodeURIComponent(m[1].split('?')[0])) === path.join(ROOT, file)) { hits.push(path.relative(ROOT, p)); break; }
                }
            }
        }
    };
    walk(path.join(ROOT, 'Pages'));
    walk(path.join(ROOT, 'scripts'));
    return hits.sort();
}

const loaded = {};
for (const [id, c] of Object.entries(M.cores)) {
    const p = path.join(ROOT, c.file);
    if (!fs.existsSync(p)) { out(false, `${id}: ${c.file} is missing`); continue; }
    const h = sha256(fs.readFileSync(p));
    try { loaded[id] = require(p); } catch (e) { out(false, `${id}: ${c.file} does not load in Node`, e.message); continue; }
    const exportsNow = Object.keys(loaded[id]).sort();
    if (UPDATE) { c.sha256 = h; c.exports = exportsNow; c.pages = pagesLoading(c.file); continue; }
    const consumers = M.consumers.filter(k => Object.values(k.aliases).includes(id)).map(k => k.file);
    out(h === c.sha256, `${id}: ${c.file} SHA-256 ${h.slice(0, 12)}…`, h === c.sha256 ? `(${c.policy})` :
        `recorded ${String(c.sha256).slice(0, 12)}…: a core changed (${c.policy}). Update scripts/cores.json in the same change (node scripts/check-cores.mjs --update) and run its consumers' suites: ${c.suites.join('; ')}${consumers.length ? `; consumers: ${consumers.join(', ')}` : ''}`);
    const lost = (c.exports || []).filter(n => !exportsNow.includes(n));
    out(!lost.length, `${id}: every recorded export is still there`, lost.length ? `removed: ${lost.join(', ')}` : `${exportsNow.length} exports${exportsNow.length > c.exports.length ? ` (${exportsNow.length - c.exports.length} new: run --update)` : ''}`);
    const pages = pagesLoading(c.file), was = c.pages || [];
    const added = pages.filter(x => !was.includes(x)), gone = was.filter(x => !pages.includes(x));
    if (added.length || gone.length) out(null, `${id}: the pages that load it changed`, `${added.length ? `new: ${added.join(', ')}` : ''}${gone.length ? ` gone: ${gone.join(', ')}` : ''} (--update records them)`);
}
for (const k of M.consumers) {
    const p = path.join(ROOT, k.file);
    if (!fs.existsSync(p)) { out(false, `consumer ${k.file} is missing`); continue; }
    const used = N.usedNames(fs.readFileSync(p, 'utf8'), k.aliases).map(u => ({ ...u, path: N.normalise(loaded[k.aliases[u.alias]], u.path) }));
    const byCore = {};
    for (const u of used) (byCore[k.aliases[u.alias]] = byCore[k.aliases[u.alias]] || new Set()).add(u.path.join('.'));
    const names = Object.fromEntries(Object.entries(byCore).map(([id, s]) => [id, [...s].sort()]).sort());
    const missing = used.filter(u => loaded[k.aliases[u.alias]] && N.lookup(loaded[k.aliases[u.alias]], u.path) === undefined && !(k.ignore || []).includes(`${u.alias}.${u.path.join('.')}`));
    if (UPDATE) { k.uses = names; continue; }
    out(!missing.length, `${k.file}: every core name it uses exists`, missing.length ? `missing: ${[...new Set(missing.map(u => `${k.aliases[u.alias]}.${u.path.join('.')}`))].join(', ')}` : Object.entries(names).map(([id, l]) => `${id} ${l.length}`).join(', '));
    const rec = k.uses || {}, diff = [];
    for (const id of new Set([...Object.keys(rec), ...Object.keys(names)])) {
        const a = rec[id] || [], b = names[id] || [];
        const plus = b.filter(x => !a.includes(x)), minus = a.filter(x => !b.includes(x));
        if (plus.length) diff.push(`${id} +${plus.join(' +')}`);
        if (minus.length) diff.push(`${id} -${minus.join(' -')}`);
    }
    out(!diff.length, `${k.file}: the names it uses are the recorded ones`, diff.length ? `${diff.join('; ')} (review, then --update)` : '');
}
if (BASE) {
    let old = null;
    try { old = JSON.parse(execFileSync('git', ['-C', ROOT, 'show', `${BASE}:scripts/cores.json`], { stdio: ['ignore', 'pipe', 'ignore'] }).toString()); } catch (e) { out(null, `no scripts/cores.json at ${BASE}`, 'nothing to compare'); }
    if (old) {
        const changed = Object.entries(M.cores).filter(([id, c]) => !old.cores[id] || old.cores[id].sha256 !== c.sha256);
        if (!changed.length) out(null, `no core changed since ${BASE}`);
        for (const [id, c] of changed) {
            if (!old.cores[id]) { out(null, `${id} is new since ${BASE}: its consumers' suites must pass in this change`, c.suites.join('; ')); continue; }
            const policy = old.cores[id].policy;                    // the base's policy: a change cannot relax its own
            if (!/^(frozen|v1 pin|not edited)/.test(policy)) { out(null, `${id} changed since ${BASE}: its consumers' suites must pass in this change`, c.suites.join('; ')); continue; }
            const s = c.sanctioned, ok = !!(s && s.sha256 === c.sha256 && typeof s.reason === 'string' && s.reason.trim());
            out(ok, `${id} changed since ${BASE}, and its policy is "${policy}"`, ok ? `sanctioned: ${s.reason}; its consumers' suites must pass in this change: ${c.suites.join('; ')}` :
                `this core changes only by the user's decision: record it on the core in scripts/cores.json, in the same change, as "sanctioned": { "sha256": "${c.sha256}", "reason": "<the decision>" }`);
        }
    }
}
// JSON with one-space indents, a list of strings on one line (wrapped near 120 columns) so the manifest stays readable
function format(v, ind = '') {
    const next = ind + ' ';
    if (Array.isArray(v) && v.every(x => typeof x === 'string')) {
        const lines = [];
        let cur = '';
        for (const x of v.map(y => JSON.stringify(y))) { if (cur && (next + cur + x).length > 118) { lines.push(cur.trimEnd()); cur = ''; } cur += x + ', '; }
        if (cur) lines.push(cur.replace(/, $/, ''));
        return lines.length <= 1 ? `[${lines[0] || ''}]` : `[\n${lines.map(l => next + l).join('\n')}\n${ind}]`;
    }
    if (Array.isArray(v)) return v.length ? `[\n${v.map(x => next + format(x, next)).join(',\n')}\n${ind}]` : '[]';
    if (v && typeof v === 'object') { const k = Object.keys(v); return k.length ? `{\n${k.map(key => `${next}${JSON.stringify(key)}: ${format(v[key], next)}`).join(',\n')}\n${ind}}` : '{}'; }
    return JSON.stringify(v);
}
if (UPDATE) {
    fs.writeFileSync(MANIFEST, format(M) + '\n');
    console.log(`updated ${path.relative(ROOT, MANIFEST)}: ${Object.keys(M.cores).length} cores, ${M.consumers.length} consumers`);
} else {
    console.log(`\n${failed ? `${failed} FAIL` : `every core is as recorded (${Object.keys(M.cores).length} cores, ${M.consumers.length} consumers)`}`);
    process.exit(failed ? 1 : 0);
}
