// The extractor the pins share (reference/golden/owl_extract.cjs), without any sibling checkout.
//
//   node "Pages/Engram Minds Eye/tests/owl-extract.cjs"
//
// Checks: the sandbox's TextEncoder, TextDecoder (with its fatal and ignoreBOM options) and SHA-256 against Node's on
// random inputs, its timer and timing globals (deterministic), and that the sandbox has no process, no require and
// refuses string evaluation; grab, constStatement and functionHashes, including three harmless upstream edits (a split
// constant declaration, a lone brace in a comment, an unrelated local of a helper's name earlier in the file);
// withHelpers (a helper moved out of a named function, as Owl's O3 did to engramGrid); stripKeys (top level only); the
// differential set against Engram's own verifier (engram_core.js verifyBiochain) on bridges_v1.json's "longer"
// record; findSource on a scratch git repository (working tree, history, not found); locate with a core module (names
// spread over two files, an identical copy, a conflicting copy); and checkPin end to end on a scratch "upstream" with a
// small v1 pin and a differential set:
//   the pinned commit                                             exit 0
//   an unrelated upstream commit                                  exit 0, NOTE provenance
//   a rewritten body with the same results                        exit 0, NOTE body changed, behaviour identical
//   the same, without a differential set                          exit 0, NOTE body changed; same results on the v1 inputs
//   v1's results kept, the differential set's changed             exit 1
//   a behaviour change                                            exit 1
//   a core module beside it defining the name differently         exit 1
//   the pinned content absent (history without it)                exit 2
//   no checkout                                                   exit 2
// The scratch repositories live in the system's temporary folder and are removed afterwards. Exits 1 on any failure.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');
const X = require('../reference/golden/owl_extract.cjs');

let failed = 0;
const line = (ok, label, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`); };
const nodeSha = s => crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');

// ---- the sandbox
{
    const sb = X.sandbox();
    const enc = sb.run('(s) => Array.from(new TextEncoder().encode(s))'), dec = sb.run('(a) => new TextDecoder().decode(new Uint8Array(a))'), sh = sb.run('(s) => __sandboxSha256Hex(s)');
    // the options Owl's strict verifier uses: fatal (throws on ill-formed bytes) and ignoreBOM (keeps a leading U+FEFF)
    const decOpt = sb.run('(a, o) => { try { return new TextDecoder("utf-8", o).decode(new Uint8Array(a)); } catch (e) { return "THREW " + e.name; } }');
    const nodeOpt = (a, o) => { try { return new TextDecoder('utf-8', o).decode(new Uint8Array(a)); } catch (e) { return 'THREW ' + e.name; } };
    let seed = 2026, n = 0, bad = 0;
    const rnd = k => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed % k; };
    for (let t = 0; t < 1500; t++) {
        let s = '';
        for (let i = rnd(50); i > 0; i--) { const k = rnd(6); s += String.fromCharCode(k === 0 ? 0xD800 + rnd(0x800) : k === 1 ? rnd(0x80) : k === 2 ? rnd(0x800) : k === 3 ? rnd(0x10000) : k === 4 ? 0xFEFF : rnd(256)); }
        n += 2; bad += JSON.stringify(enc(s)) !== JSON.stringify(Array.from(new TextEncoder().encode(s))); bad += sh(s) !== nodeSha(s);
        const bytes = Array.from({ length: rnd(40) }, () => { const k = rnd(4); return k === 0 ? 0x80 + rnd(0x40) : k === 1 ? 0xC0 + rnd(0x40) : k === 2 ? 0xEF : rnd(256); });
        if (rnd(5) === 0) bytes.unshift(0xEF, 0xBB, 0xBF);
        n++; bad += dec(bytes) !== new TextDecoder().decode(new Uint8Array(bytes));
        for (const o of [{ fatal: true }, { ignoreBOM: true }, { fatal: true, ignoreBOM: true }]) { n++; bad += decOpt(bytes, o) !== nodeOpt(bytes, o); }
    }
    for (const L of [0, 55, 56, 63, 64, 65, 1000, 70000]) { n++; bad += sh('a'.repeat(L)) !== nodeSha('a'.repeat(L)); }
    line(!bad && sh('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'sandbox: UTF-8 coder (the decoder plain, fatal and with ignoreBOM) and SHA-256 agree with Node', `${n - bad}/${n}`);
    let evalRefused = false;
    try { sb.run('eval("1")'); } catch (e) { evalRefused = true; }
    line(sb.run('typeof process') === 'undefined' && sb.run('typeof require') === 'undefined' && evalRefused, 'sandbox: no process, no require, string evaluation refused');
    const api = sb.compile(['SC'], 'async function h(x) { return SC.sha256Hex(x.t); }\nfunction keys(o) { return Object.keys(o).join(); }\nreturn { h, keys };', [X.HASH_NS])();
    api.h({ t: 'é' }).then(v => line(v === nodeSha('é'), 'sandbox: compile with an injected SC.sha256Hex; object arguments are copied in'));
    line(api.keys({ b: 1, a: 2 }) === 'b,a', 'sandbox: a copied argument keeps its key order');
    // a page's timers, made deterministic: callbacks run as microtasks in the order set, delays ignored
    sb.run(`(async () => {
        const log = [];
        setTimeout(x => log.push('timer ' + x), 50, 1);
        clearTimeout(setTimeout(() => log.push('cleared'), 0));
        queueMicrotask(() => log.push('microtask'));
        await new Promise(r => setTimeout(r, 1000));
        const a = performance.now(), b = performance.now();
        let refused = false;
        try { setTimeout('log.push(1)'); } catch (e) { refused = true; }
        return JSON.stringify({ log, monotonic: b > a, clone: structuredClone({ x: [1, { y: 'é' }] }), refused });
    })()`).then(v => line(v === '{"log":["timer 1","microtask"],"monotonic":true,"clone":{"x":[1,{"y":"é"}]},"refused":true}',
        'sandbox: setTimeout, clearTimeout, queueMicrotask, performance.now and structuredClone, deterministic; a string timer refused', v));
}

// ---- grab and functionHashes
{
    const src = 'export const K = 3;\nexport function add(a, b = {}) { return a + b; }\nconst f = x => { return [x]; };\nasync function g() { if (1) { return 2; } }\n';
    line(X.grab(src, 'add') === 'function add(a, b = {}) { return a + b; }' && X.grab(src, 'f') === 'const f = x => { return [x]; };' && X.grab(src, 'g').endsWith('return 2; } }'), 'grab: a function (default parameters), an arrow const, an async function');
    const h = X.functionHashes(src, ['add', 'missing']);
    line(h.add === nodeSha('function add(a, b = {}) { return a + b; }') && h.missing === null, 'functionHashes: the text grab takes; null when missing');
    line(X.changedBodies(src, src.replace('a + b', 'b + a'), ['add', 'f']).join() === 'add', 'changedBodies: names whose text differs');
}
// three harmless upstream edits (overhaul review): the extraction must still give runnable, identical code
{
    const BASE = [
        'export const MAX_GROW_BYTES = 10;   // a cap',
        'const CHUNK = 4, SEGMENTS = 2;',
        'export function topSeals(list) {',
        '  const cands = list.filter(s => s.ok);         // a local of the helper\'s name, earlier in the file',
        '  return cands;',
        '}',
        'const cands = t => t.length;',
        'export function grow(text) {',
        '  // a lone "{" in a comment, and in a string, a template literal and a regular expression: "{" `${text}{`',
        '  const s = `${text}{`, re = /[{]/, half = cands(s) / 2;',
        '  if (re.test(s)) { return { n: cands(s), c: CHUNK * SEGMENTS, m: MAX_GROW_BYTES, half, q: "}" }; }',
        '  return null;',
        '}',
        '',
    ].join('\n');
    const run = src => X.sandbox().compile([], [...new Set(['MAX_GROW_BYTES', 'CHUNK', 'SEGMENTS'].map(n => X.constStatement(src, n)))].join('\n') +
        '\n' + X.grab(src, 'cands') + '\n' + X.grab(src, 'grow') + '\nreturn { grow };')().grow('ab');
    const variants = {
        'as written': BASE,
        'the declaration split in two': BASE.replace('const CHUNK = 4, SEGMENTS = 2;', 'const CHUNK = 4;\nconst SEGMENTS = 2;'),
        'one declarator per line': BASE.replace('const CHUNK = 4, SEGMENTS = 2;', 'const CHUNK = 4,\n  SEGMENTS = 2;'),
    };
    const want = JSON.stringify({ n: 3, c: 8, m: 10, half: 1.5, q: '}' }), got = Object.entries(variants).map(([k, v]) => { try { return JSON.stringify(run(v)); } catch (e) { return `${k}: ${e.message}`; } });
    line(got.every(g => g === want), 'grab and constStatement: a split constant declaration, a lone brace in a comment, a local of a helper\'s name earlier in the file', got.filter(g => g !== want).join('; '));
    line(X.grab(BASE, 'cands') === 'const cands = t => t.length;' && X.constStatement(BASE, 'MAX_GROW_BYTES') === 'const MAX_GROW_BYTES = 10;   // a cap' &&
        X.constStatement(BASE, 'SEGMENTS') === 'const CHUNK = 4, SEGMENTS = 2;' && X.grab(BASE, 'grow').endsWith('return null;\n}'),
        'grab takes the least-indented declaration; constStatement the whole statement to the end of its line, without "export "');
    line(JSON.stringify(X.stripKeys({ source: { commit: 'a' }, list: [{ source: 'human' }] }, ['source'])) === '{"list":[{"source":"human"}]}', 'stripKeys: the top-level provenance only, nested data kept');
}
// a named function whose work moved into top-level helpers (Owl's O3: engramGrid calls letterGrid, which reads
// LETTER_GRIDS): withHelpers appends what the body uses, transitively and once, and leaves a complete body unchanged
{
    const BEFORE = [
        'const SC = { sha256Hex };',
        'export function grid(t) { return [...t].map(c => c.charCodeAt(0) & 1); }',
        'export function key(t) { return grid(t).join(""); }',
        '',
    ].join('\n');
    const AFTER = [
        'const SC = { sha256Hex };',
        'const CELLS = new Map();',
        'function cell(c) { let v = CELLS.get(c); if (v === undefined) { v = bit(c); CELLS.set(c, v); } return v; }',
        'const bit = c => c.charCodeAt(0) & 1;   // a helper of the helper',
        'export function grid(t) { /* cell( in a comment */ const o = { cell: 0 }; o.cell = 1; return [...t].map(c => cell(c)).concat(...none()); }',
        'function none() { return [[]]; }',
        'export function key(t) { return grid(t).join(""); }',
        'export function unused() { return SC; }',
        '',
    ].join('\n');
    const body = src => ['grid', 'key'].map(n => X.grab(src, n)).join('\n');
    const run = src => X.sandbox().compile([], X.withHelpers(src, body(src)) + '\nreturn { key };')().key('abcab');
    let threw = '';
    try { X.sandbox().compile([], body(AFTER) + '\nreturn { key };')().key('ab'); } catch (e) { threw = e.message; }
    const added = X.withHelpers(AFTER, body(AFTER)).slice(body(AFTER).length + 1);
    line(X.withHelpers(BEFORE, body(BEFORE)) === body(BEFORE) && /cell is not defined/.test(threw) && run(AFTER) === run(BEFORE) && run(AFTER) === '10110' &&
        added === 'const CELLS = new Map();\nfunction cell(c) { let v = CELLS.get(c); if (v === undefined) { v = bit(c); CELLS.set(c, v); } return v; }\nconst bit = c => c.charCodeAt(0) & 1;\nfunction none() { return [[]]; }',
        'withHelpers: a complete body unchanged; a helper moved out of a named function appended with its own helpers, in source order; a spread call is a use, a property or a comment is not', threw);
    line(!X.withHelpers(AFTER, 'function f() { return SC; }', ['SC']).includes('const SC') && X.withHelpers(AFTER, 'function f() { return SC; }').includes('const SC'),
        'withHelpers: a name the caller provides (a sandbox parameter) is never taken from the source');
}
// the differential set: bridges_v1.json's "longer" record (Owl's grower), altered one field at a time, against
// engram_core.js's verifyBiochain (Owl's verifyIntegrity steps, synchronous): each rejection must be the intended one
{
    const EC = require('../engram_core.js'), BC = require('../biochain_v1.js');
    const rec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reference', 'golden', 'bridges_v1.json'), 'utf8')).biochains.list[1].record;
    const accepted = ['as grown', 'leafHashes absent', 'chainId altered', 'legacy streams and chunkLens'];
    const set = X.tamperSet(rec), bad = [];
    for (const t of set) {
        const v = EC.verifyBiochain(BC, t.record), changed = JSON.stringify(t.record) !== JSON.stringify(rec);
        if (v.ok !== accepted.includes(t.label) || changed === (t.label === 'as grown')) bad.push(`${t.label}: ${v.reasons[0]}`);
    }
    line(set.length === 14 && !bad.length, 'tamperSet: 14 records, each altered as labelled; Engram\'s verifier rejects exactly the altered ones', bad.join('; '));
    const g = (verify, cap) => ({ MAX_GROW_BYTES: 10, verifyIntegrity: async r => verify(r),
        growBiochain: async t => { if (t.length > cap) throw new Error(`capped at ${cap}`); return { chainId: 'BC-' + t.length, origBytes: t.length }; } });
    const pinned = g(r => EC.verifyBiochain(BC, r), 10);
    Promise.all([X.differential(pinned, g(r => EC.verifyBiochain(BC, r), 10), rec), X.differential(pinned, g(r => EC.verifyBiochain(BC, { ...r, merkleRoot: null }), 11), rec)]).then(([same, weak]) => {
        const differ = rows => rows.filter(x => JSON.stringify(x.want) !== JSON.stringify(x.got)).map(x => x.label).join(', ');
        line(same.length === 16 && differ(same) === '' && differ(weak) === 'merkleRoot altered, grow 11 bytes (one over the cap)',
            'differential: the same growers agree on all 16; one without the Merkle comparison and with a larger cap differs on exactly those', differ(weak));
    });
}

// ---- findSource and checkPin on scratch repositories
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'owl-extract-'));
const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, '-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...a], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
const V1 = 'export const K = 3;\nexport function add(a, b) { return a + b + K - 3; }\nexport function other() { return "x"; }\n';
try {
    const up = path.join(tmp, 'upstream');
    fs.mkdirSync(path.join(up, 'lib'), { recursive: true });
    git(up, 'init', '-q');
    fs.writeFileSync(path.join(up, 'lib/lib.js'), V1); git(up, 'add', '.'); git(up, 'commit', '-qm', 'v1');
    const c1 = git(up, 'rev-parse', 'HEAD');
    fs.writeFileSync(path.join(up, 'lib/lib.js'), V1.replace('"x"', '"y"')); git(up, 'commit', '-qam', 'unrelated');
    const f1 = X.findSource(up, 'lib/lib.js', nodeSha(V1)), f2 = X.findSource(up, 'lib/lib.js', nodeSha(V1.replace('"x"', '"y"')));
    line(f1 && f1.src === V1 && f1.where === `git ${c1.slice(0, 7)}` && f2 && f2.where === 'working tree' && X.findSource(up, 'lib/lib.js', '0'.repeat(64)) === null && X.findSource(tmp, 'lib/lib.js', nodeSha(V1)) === null,
        'findSource: the working tree, then git history; null when not found or not a repository');
    git(up, 'reset', '-q', '--hard', c1);
    // locate: a core module first; names spread over the core and biomesh.js (a partial move) are taken from both; a
    // name in both files must have the same text (an ES module's own export hides `export *`, so the pages would run it)
    const mv = path.join(tmp, 'moved');
    fs.mkdirSync(mv);
    fs.writeFileSync(path.join(mv, 'core.js'), 'export const K = 3;\nexport function add(a, b) { return a + b + K - 3; }\n');
    const MAIN = 'export * from "./core.js";\nexport function other() { return "x"; }\n';
    fs.writeFileSync(path.join(mv, 'main.js'), MAIN);
    const l1 = X.locate(mv, ['core.js', 'main.js'], ['add']), l2 = X.locate(mv, ['core.js', 'main.js'], ['add', 'other'], ['export const K']);
    line(l1 && l1.file === 'core.js' && !l1.conflicts.length && l2 && l2.file === 'core.js + main.js' && X.grab(l2.src, 'add').includes('K - 3') && X.locate(mv, ['core.js', 'main.js'], ['missing']) === null,
        'locate: the first candidate that defines every name, else the candidates together (the core\'s definition first)');
    fs.writeFileSync(path.join(mv, 'main.js'), MAIN + 'export function add(a, b) { return a + b + K - 3; }\n');
    const l3 = X.locate(mv, ['core.js', 'main.js'], ['add']);
    fs.writeFileSync(path.join(mv, 'main.js'), MAIN + 'export function add(a, b) { return 0; }\n');
    const l4 = X.locate(mv, ['core.js', 'main.js'], ['add']);
    line(l3 && !l3.conflicts.length && l3.shared.map(c => `${c.name}:${c.files}`).join() === 'add:core.js,main.js' && l4 && l4.conflicts.map(c => `${c.name}:${c.files}`).join() === 'add:core.js,main.js',
        'locate: a copy with the same text is listed as shared; a different one is a conflict');

    // the pin: out.json = { source: { sha256 }, results } from add() on fixed inputs; check.cjs is its --check
    const pinDir = path.join(tmp, 'pin');
    fs.mkdirSync(pinDir);
    const results = src => X.sandbox().compile([], X.grab(src, 'add') + '\n' + X.line(src, 'export const K').replace(/^export /, '') + '\nreturn { add };')();
    const make = (src, sha) => JSON.stringify({ source: { sha256: sha }, results: [[1, 2], [5, -7], [0.5, 0.25]].map(([a, b]) => results(src).add(a, b)) }) + '\n';
    fs.writeFileSync(path.join(pinDir, 'out.json'), make(V1, nodeSha(V1)));
    fs.writeFileSync(path.join(pinDir, 'check.cjs'), `'use strict';
const fs = require('fs'), path = require('path');
const X = require(${JSON.stringify(require.resolve('../reference/golden/owl_extract.cjs'))});
const OUT = path.join(__dirname, 'out.json'), rec = JSON.parse(fs.readFileSync(OUT, 'utf8')).source;
const results = src => X.sandbox().compile([], X.grab(src, 'add') + '\\n' + X.line(src, 'export const K').replace(/^export /, '') + '\\nreturn { add };')();
const make = (src, sha) => JSON.stringify({ source: { sha256: sha }, results: [[1, 2], [5, -7], [0.5, 0.25]].map(([a, b]) => results(src).add(a, b)) }) + '\\n';
X.checkPin({ name: 'scratch pin', repo: { name: 'scratch', root: process.argv[2] },
    sources: [{ file: 'lib/lib.js', sha256: rec.sha256, candidates: ['lib/core.js', 'lib/lib.js'], names: ['add'], lines: ['export const K'] }],
    outputs: [{ label: 'out.json', path: OUT }],
    build: async (S, mode) => [make(S['lib/lib.js'], mode === 'reproduction' ? rec.sha256 : null)],
    behaviour: t => JSON.parse(t[0]).results,
    differential: process.argv[3] === '--no-differential' ? undefined :
        async (P, L) => [[1e9, 7], [-3, 3]].map(([a, b]) => ({ label: \`add(\${a}, \${b})\`, want: results(P['lib/lib.js']).add(a, b), got: results(L['lib/lib.js']).add(a, b) })),
    bodies: [{ file: 'lib/lib.js', names: ['add'], pinned: () => X.findSource(process.argv[2], 'lib/lib.js', rec.sha256).src }] });
`);
    const check = (root, ...more) => { const r = spawnSync(process.execPath, [path.join(pinDir, 'check.cjs'), root, ...more], { encoding: 'utf8' }); return { code: r.status, out: r.stdout + r.stderr }; };
    let r = check(up);
    line(r.code === 0 && /ok {4}reproduction out\.json/.test(r.out), 'checkPin: the pinned commit gives 0', `exit ${r.code}`);
    fs.writeFileSync(path.join(up, 'lib/lib.js'), V1.replace('"x"', '"y"')); git(up, 'commit', '-qam', 'unrelated upstream work');
    r = check(up);
    line(r.code === 0 && /NOTE provenance: lib\/lib\.js is now/.test(r.out) && !/NOTE body/.test(r.out), 'checkPin: an unrelated upstream commit gives 0 with NOTE provenance', `exit ${r.code}`);
    fs.writeFileSync(path.join(up, 'lib/lib.js'), V1.replace('"x"', '"y"').replace('return a + b + K - 3;', 'return (a + b) + (K - 3);')); git(up, 'commit', '-qam', 'same behaviour');
    r = check(up);
    line(r.code === 0 && /ok {4}live +the current code on the differential set/.test(r.out) && /NOTE body changed, behaviour identical: add/.test(r.out), 'checkPin: a rewritten body with the same results gives 0 with a NOTE', `exit ${r.code}`);
    r = check(up, '--no-differential');
    line(r.code === 0 && /NOTE body changed; same results on the v1 inputs: add/.test(r.out), 'checkPin: without a differential set the NOTE claims only the v1 inputs', `exit ${r.code}`);
    fs.writeFileSync(path.join(up, 'lib/lib.js'), V1.replace('return a + b + K - 3;', 'return a > 100 ? 0 : a + b + K - 3;'));
    r = check(up);
    line(r.code === 1 && /ok {4}live +the current code on the v1 inputs/.test(r.out) && /FAIL {2}live +the current code on the differential set/.test(r.out) && /NOTE body changed: add/.test(r.out),
        'checkPin: v1\'s results kept but the differential set\'s changed gives 1', `exit ${r.code}`);
    fs.writeFileSync(path.join(up, 'lib/lib.js'), V1.replace('return a + b + K - 3;', 'return a + b + K - 2;'));
    r = check(up);
    line(r.code === 1 && /FAIL {2}live/.test(r.out) && /ok {4}reproduction/.test(r.out), 'checkPin: a behaviour change gives 1 (the reproduction still passes)', `exit ${r.code}`);
    fs.writeFileSync(path.join(up, 'lib/lib.js'), V1.replace('"x"', '"y"').replace('return a + b + K - 3;', 'return (a + b) + (K - 3);'));
    fs.writeFileSync(path.join(up, 'lib/core.js'), 'export function add(a, b) { return a + b + K - 3; }\n');
    r = check(up);
    line(r.code === 1 && /FAIL {2}live +lib\/lib\.js +\(defined differently in more than one file.*add \(lib\/core\.js, lib\/lib\.js\)/.test(r.out),
        'checkPin: a core module beside it that defines the name differently gives 1, naming the name and the files', `exit ${r.code}`);
    fs.rmSync(path.join(up, 'lib/core.js'));
    const fresh = path.join(tmp, 'fresh');
    fs.mkdirSync(path.join(fresh, 'lib'), { recursive: true });
    git(fresh, 'init', '-q'); fs.writeFileSync(path.join(fresh, 'lib/lib.js'), V1.replace('"x"', '"z"')); git(fresh, 'add', '.'); git(fresh, 'commit', '-qm', 'without the pinned content');
    r = check(fresh);
    line(r.code === 2 && /skip  reproduction/.test(r.out) && /ok {4}live/.test(r.out), 'checkPin: pinned content absent gives 2, never 0 (the live contract still runs)', `exit ${r.code}`);
    r = check(path.join(tmp, 'no-such-checkout'));
    line(r.code === 2 && /skipped: no scratch checkout/.test(r.out), 'checkPin: no checkout gives 2', `exit ${r.code}`);
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}
// the sidecar names, for each pinned source, a commit and the SHA-256 the pins record
{
    const P = X.provenance();
    const ok = Object.values(P.sources).every(s => /^[0-9a-f]{40}$/.test(s.commit) && /^[0-9a-f]{64}$/.test(s.sha256));
    const golden = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reference', 'golden', 'bridges_v1.json'), 'utf8')).source.files;
    line(ok && Object.entries(golden).every(([f, h]) => P.sources[`Owl-Academy:${f}`].sha256 === h), 'biochain_v1.provenance.json: a commit per source, the SHA-256 bridges_v1.json records');
}
setTimeout(() => { console.log(`\n${failed ? `${failed} FAIL` : 'the extractor holds'}`); process.exit(failed ? 1 : 0); }, 50);
