// Pins the biochain, version 2, from Owl Academy's Firebase-free core (overhaul E3). The v1 pin stays as it is
// beside it (D4): biochain_v1.js and bridges_v1.json are never edited.
//
//   node "Pages/Engram Minds Eye/reference/golden/make_bridges_v2.cjs" <Owl-Academy commit>     write the pin
//   node "Pages/Engram Minds Eye/reference/golden/make_bridges_v2.cjs" --check [--owl <checkout>] compare
//
// The Owl-Academy checkout is OWL_ACADEMY_DIR, else ../Owl-Academy beside this repository (scripts/lib/siblings.cjs);
// --owl overrides both. With a commit, every file is read from that commit's git objects (git show), never from the
// working tree, so the commit is the whole pin: to repin, run it again with another commit. It reads, at that commit:
//   scripts/biomesh-core.js                          the Firebase-free core (MIT, Copyright (c) 2026 Ebayednoob)
//   tests/vendor/VENDOR.json                         Owl's record of the contract vectors it vendors, by SHA-256
//   tests/vendor/shdccp2-contract/LICENSE, suites/   RFC 07's contract vectors (CC0-1.0, from BioChainAI/SHD-CCP-core):
//                                                    shdccp2_record, shdccp2_tamper, shdccp2_tamper_open, engram1_keys
// and writes:
//   ../../biochain_v2.js    the core's synchronous code, verbatim, as a UMD module (BiochainV2): biochain_v1.js's set
//                           (owl_extract.cjs SYNC) with qconj and chainFrames exported, the engram grid built once per
//                           letter (F15), and the strict verifier of RFC 07 section 12 (verifyIntegrityStrict,
//                           synchronous, its SHA-256 a parameter: EngramCore.verifyBiochainStrict passes orbital_core.js's),
//                           the GROWN/1 commitment and the kind registry. Its header carries SPDX MIT, the copyright of
//                           the source, a NOTICE line and the commit that last changed the source file.
//   bridges_v2.json         what that code gives on fixed inputs: its strict verdict, self-consistency (verifyIntegrity,
//                           run as written) and label on bridges_v1.json's five biochains, on the differential set of
//                           owl_extract.cjs (tamperSet of the "longer" record, each row named by its tamper) and on every
//                           case of the two tamper suites;
//                           the records of shdccp2_record regrown and compared with the vectors; the engram1_keys keys;
//                           the keys of 10,000 seeded tokens against biochain_v1.js (the grid built once gives the same
//                           keys); the kinds and the strict checks
//   ../../VENDOR.json       every file this folder holds from another repository, with its SHA-256, licence, the commit
//                           it was read at and, for the vectors, where Owl took them from
//   vendor/shdccp2-contract/LICENSE and suites/*.json   the four suites and their licence, byte for byte as Owl holds them
//                           (each SHA-256 checked against Owl's tests/vendor/VENDOR.json before anything is written)
// The source must carry "SPDX-License-Identifier: MIT": nothing else is copied here under that header.
//
// --check (owl_extract.cjs's checkPin) compares content, not commits:
//   reproduction   biochain_v2.js, bridges_v2.json and VENDOR.json rebuilt from the pinned content (the core and the
//                  vendored files, found by SHA-256 in the checkout or its git history) must match byte for byte, and
//                  so must the vendored copies; content that cannot be found makes the check skipped (exit 2), never
//                  passed
//   live contract  the checkout's current scripts/biomesh-core.js on the same inputs (the vendored suites as pinned
//                  here) must give bridges_v2.json's verdicts, records and keys; a changed body with the same results
//                  prints a NOTE, and so does a changed file or commit
// Exits 0 when both hold, 1 when either fails, 2 when the checkout or the pinned content is missing.
// Owl's code runs in a vm context without process or require (owl_extract.cjs's sandbox).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const X = require('./owl_extract.cjs');
const siblings = require('../../../../scripts/lib/siblings.cjs');

const ARGS = process.argv.slice(2), CHECK = ARGS.includes('--check'), owlAt = ARGS.indexOf('--owl');
const OWL = path.resolve(owlAt >= 0 ? ARGS[owlAt + 1] : siblings.dir('Owl-Academy'));
const COMMIT = ARGS.find((a, i) => !a.startsWith('--') && (owlAt < 0 || i !== owlAt + 1));
const SYSTEM = path.join(__dirname, '..', '..');
const F_CORE = 'scripts/biomesh-core.js', F_OWL_VENDOR = 'tests/vendor/VENDOR.json', OWL_VDIR = 'tests/vendor/';
const SUITES = ['shdccp2_record', 'shdccp2_tamper', 'shdccp2_tamper_open', 'engram1_keys'];
// the vendored files: their path in Owl (under tests/vendor/) and here (under this folder)
const VENDORED = ['shdccp2-contract/LICENSE', ...SUITES.map(s => `shdccp2-contract/suites/${s}.json`)]
    .map(p => ({ owl: OWL_VDIR + p, here: 'reference/golden/vendor/' + p }));
const OUT_JS = path.join(SYSTEM, 'biochain_v2.js'), OUT_JSON = path.join(__dirname, 'bridges_v2.json'), OUT_VENDOR = path.join(SYSTEM, 'VENDOR.json');
const REL_JSON = 'reference/golden/bridges_v2.json';
const sha256 = s => crypto.createHash('sha256').update(typeof s === 'string' ? Buffer.from(s, 'utf8') : s).digest('hex');

// What biochain_v2.js holds, in this order after the constants (owl_extract.cjs CONST_NAMES): owl_extract.cjs SYNC
// (biochain_v1.js's functions) with the grid cache of F15 beside engramGrid, then the strict verifier and what it uses
const V2_NAMES = ['M64', 'fold64', 'qmul', 'qconj', 'qn', 'crystalQuat', 'quatHex', 'PAR_MASK', 'popcountEven', 'crystallize', 'unpackPacket', 'packWord',
    'mulberry32', 'engramCharGrid', 'LETTER_GRIDS', 'letterGrid', 'engramGrid', 'engramGridHex', 'engramHex', 'engramJ', 'tokenizeEngrams', 'engramStreamFromText',
    'frameStream', 'parseBiochainStream', 'parseBiochainStreamStrict', 'BW', 'BR', 'cands', 'upd', 'encodeChunk', 'decodeChunk', 'chainFrames', 'recreateChunks',
    'recreateText', 'parseCodexStream',
    'SHA256_K', 'SHA256_H0', 'UTF8', 'rotr', 'sha256HexSync', 'leafHashSync', 'merkleRootSync', 'chainWeaves', 'segCutsOf', 'STRICT_CHECKS', 'ENGRAM_FIELDS',
    'hasOwn', 'numEq', 'verifyIntegrityStrict', 'failedCheck', 'strictLabel', 'grownCommitment', 'KINDS', 'validateKind'];
const missingSync = X.SYNC.filter(n => !V2_NAMES.includes(n));
if (missingSync.length) throw new Error(`V2_NAMES lacks SYNC names: ${missingSync.join(', ')}`);
// what it exports: biochain_v1.js's names (crystallizeBytes kept as an alias of crystallize) plus qconj and chainFrames
// (F77), and the strict verifier's
const EXPORTS = ['MAX_GROW_BYTES', 'STREAM_VERSION', 'CHUNK', 'SEGMENTS', 'fold64', 'qmul', 'qconj', 'qn', 'crystalQuat', 'quatHex', 'popcountEven', 'crystallize',
    'crystallizeBytes: crystallize', 'unpackPacket', 'packWord', 'mulberry32', 'engramGrid', 'engramGridHex', 'engramHex', 'engramJ', 'tokenizeEngrams',
    'engramStreamFromText', 'frameStream', 'parseBiochainStream', 'parseBiochainStreamStrict', 'encodeChunk', 'decodeChunk', 'chainFrames', 'recreateChunks',
    'recreateText', 'parseCodexStream', 'sha256HexSync', 'leafHashSync', 'merkleRootSync', 'chainWeaves', 'STRICT_CHECKS', 'verifyIntegrityStrict', 'failedCheck',
    'strictLabel', 'grownCommitment', 'KINDS', 'validateKind'];
const EXPORT_LIST = EXPORTS.join(', ');

// the module body: the constants, V2_NAMES verbatim, and any top-level helper they call that is not listed (none at
// the first pin; withHelpers keeps a later upstream refactor runnable)
function v2Body(src) {
    const consts = [...new Set(X.CONST_NAMES.map(n => X.constStatement(src, n)))];
    return X.withHelpers(src, consts.concat(V2_NAMES.map(n => X.grab(src, n))).join('\n'));
}
// the source's licence header: its first two lines, "// SPDX-License-Identifier: MIT" and its copyright line
function licenceOf(src) {
    const [a, b] = src.split('\n');
    if (a !== '// SPDX-License-Identifier: MIT' || !/^\/\/ Copyright \(c\) \d{4} \S/.test(b || '')) throw new Error(`${F_CORE} does not start with an MIT SPDX line and a copyright line: refusing to copy it under MIT`);
    return b.slice(3);
}

// ------------------------------------------------------------------ the deterministic inputs
// 10,000 tokens for the engram grid (F15): lengths 1-12 over letters, digits, the apostrophe and a few characters
// whose upper case is several letters or none, drawn by mulberry32(20261108) (written here, as RFC 07 section 9.2 has it)
function seededTokens(n = 10000, seed = 20261108) {
    let s = seed >>> 0;
    const rng = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const A = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\'', 'ß', 'é', 'İ', 'ﬁ', 'ı', 'ſ'];
    return Array.from({ length: n }, () => Array.from({ length: 1 + Math.floor(rng() * 12) }, () => A[Math.floor(rng() * A.length)]).join(''));
}
const recordText = input => (typeof input.text === 'string' ? input.text
    : input.text_parts.map(p => (typeof p === 'string' ? p : p.repeat.repeat(Math.ceil(p.length / p.repeat.length)).slice(0, p.length))).join(''));
// a grown record against a vector's expected record: fields equal, or <field>_sha256 and <field>_length for long ones
function sameAsVector(rec, expect) {
    for (const [k, v] of Object.entries(expect)) {
        const m = /^(.*)_(sha256|length)$/.exec(k);
        if (m && typeof rec[m[1]] === 'string' && !(k in rec)) { if ((m[2] === 'sha256' ? sha256(rec[m[1]]) : rec[m[1]].length) !== v) return false; }
        else if (JSON.stringify(rec[k]) !== JSON.stringify(v)) return false;
    }
    const want = new Set(Object.keys(expect).map(k => k.replace(/_(sha256|length)$/, '')));
    return Object.keys(rec).every(k => want.has(k));
}

// ------------------------------------------------------------------ the three files
// core: the source text; suites: name -> text (as pinned here); prov: the provenance VENDOR.json records
async function build(core, suites, prov) {
    const copyright = licenceOf(core), body = v2Body(core), coreSha = sha256(core), cf = prov.core;
    const js = `// SPDX-License-Identifier: MIT
// ${copyright}
// NOTICE: copied from Owl-Academy (BioChainAI/Owl-Academy), MIT License, ${copyright}; the licence text is in
// NOTICE beside this file. Source: ${F_CORE} at Owl-Academy ${prov.commit}, last changed in
// ${cf.commit}, SHA-256 ${coreSha}.
// The biochain, version 2: generated by reference/golden/make_bridges_v2.cjs. Do not edit: run it again with an
// Owl-Academy commit to repin, and with --check to compare. biomesh-core.js's synchronous code, verbatim: the SHD-CCP
// stream codec, the order-2 rank coder that recreates a biochain's text losslessly, the chiral weave, the token engram
// layer (each letter's grid built once) and the codex parser, as in biochain_v1.js; and the strict verifier of RFC 07
// section 12 (verifyIntegrityStrict: synchronous, its SHA-256 a parameter, sha256HexSync by default), the GROWN/1
// commitment and the kind registry. EngramCore.verifyBiochainStrict and importBiochainChecked run it with
// orbital_core.js's SHA-256; tests/bridges-v2.cjs checks the verdicts against reference/golden/bridges_v2.json.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.BiochainV2 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
${body}
return { source: ${JSON.stringify({ repository: prov.repository, commit: prov.commit, file: F_CORE, fileCommit: cf.commit, sha256: coreSha })},
         ${EXPORT_LIST} };
});
`;
    // the pinned code, run as written in a sandbox: the module body, and growBiochain and verifyIntegrity (async; their
    // SC.sha256Hex is SHA-256 over UTF-8, as seal-crypto.js computes it)
    const sb = X.sandbox();
    const all = X.withHelpers(core, body + '\n' + X.grab(core, 'growBiochain') + '\n' + X.grab(core, 'verifyIntegrity'), X.HASH_PARAMS);
    const C = sb.compile(X.HASH_PARAMS, all + `\nreturn { ${EXPORT_LIST}, growBiochain, verifyIntegrity };`, X.HASH_INJECT)();
    const plain = v => JSON.parse(JSON.stringify(v));
    async function verdict(rec) {
        const v = C.verifyIntegrityStrict(rec), f = C.failedCheck(v);
        let self = false;
        try { self = (await C.verifyIntegrity(rec)).ok === true; } catch (e) { self = false; }
        return plain({ ok: v.ok, failed: v.failed, legacy: v.legacy, ...(f && f.fields ? { fields: f.fields } : {}), self_consistent: self, label: C.strictLabel(v, self) });
    }
    const v1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'bridges_v1.json'), 'utf8'));
    const bridges = [];
    for (const b of v1.biochains.list) bridges.push({ name: b.name, ...await verdict(b.record) });
    const differential = [];
    // tamper: owl_extract.cjs tamperSet's description of the change (verdict() returns the strict label as `label`)
    for (const t of X.tamperSet(v1.biochains.list[1].record)) differential.push({ tamper: t.label, ...await verdict(t.record) });
    const tamper = {};
    for (const name of ['shdccp2_tamper', 'shdccp2_tamper_open']) {
        const S = JSON.parse(suites[name]), cases = [];
        for (const c of S.cases) {
            const v = await verdict(c.input.record);
            cases.push({ id: c.id, ...v, as_expected: Object.keys(c.expect).every(k => JSON.stringify(c.expect[k]) === JSON.stringify(v[k])) });
        }
        tamper[name] = { status: S.status, cases };
    }
    const records = [];
    for (const c of JSON.parse(suites.shdccp2_record).cases) {
        const text = recordText(c.input), engrams = c.input.engrams !== false;
        try {
            const rec = plain(await C.growBiochain(text, { engrams }));
            const v = C.verifyIntegrityStrict(rec);
            records.push({ id: c.id, chainId: rec.chainId, as_vector: !c.expect.error && sameAsVector(rec, c.expect), strict: v.ok ? 'strict ok' : C.strictLabel(v) });
        } catch (e) {
            records.push({ id: c.id, error: c.expect.error || null, threw: true });
        }
    }
    const keys = JSON.parse(suites.engram1_keys).cases.map(c => { const k = C.engramHex(c.input.key_text); return { id: c.id, key: k, as_vector: k === c.expect.key_hex }; });
    // the grid built once (F15): the same keys as biochain_v1.js (biomesh.js at 2be626f's text) on 10,000 tokens
    const BC1 = require(path.join(SYSTEM, 'biochain_v1.js')), toks = seededTokens();
    const k2 = toks.map(t => C.engramHex(t)), k1 = toks.map(t => BC1.engramGridHex(BC1.engramGrid(t)));
    const out = {
        format: 'bridges_v2_golden', version: 2,
        source: { repository: prov.repository, commit: prov.commit, files: { [F_CORE]: { sha256: coreSha, commit: cf.commit } },
            suites: Object.fromEntries(SUITES.map(s => [s, sha256(suites[s])])) },
        note: 'What Owl Academy\'s Firebase-free core gives on fixed inputs: its strict verdict (verifyIntegrityStrict with its own SHA-256), its self-consistency (verifyIntegrity) and the label of RFC 07 section 12.4, on bridges_v1.json\'s biochains, on owl_extract.cjs\'s differential set and on the vendored tamper suites; the vendored records regrown; the engram/1 keys. EngramCore.verifyBiochainStrict must give the same verdicts with orbital_core.js\'s SHA-256 (tests/bridges-v2.cjs).',
        strict_checks: plain(C.STRICT_CHECKS),
        kinds: Object.keys(plain(C.KINDS)),
        bridges_v1: bridges,
        differential,
        tamper,
        records,
        engram1_keys: keys,
        engram_grid: { tokens: toks.length, recipe: 'seededTokens() in make_bridges_v2.cjs: mulberry32(20261108), lengths 1-12', keys_sha256: sha256(k2.join('\n')), same_as_v1: k2.every((k, i) => k === k1[i]) },
    };
    const json = JSON.stringify(out, null, 1) + '\n';
    const files = [
        { path: 'biochain_v2.js', sha256: sha256(js), licence: 'MIT', copyright, from: { repository: prov.repository, path: F_CORE, commit: cf.commit, sha256: coreSha },
            generated: 'the source\'s synchronous code, verbatim, by reference/golden/make_bridges_v2.cjs' },
        { path: REL_JSON, sha256: sha256(json), generated: 'what the pinned code gives on fixed inputs, by reference/golden/make_bridges_v2.cjs' },
        ...VENDORED.map(v => { const p = prov.vendored[v.here], text = v.here.endsWith('LICENSE') ? suites.LICENSE : suites[path.basename(v.here, '.json')]; return { path: v.here, sha256: sha256(text), licence: 'CC0-1.0', from: { repository: prov.repository, path: v.owl, commit: p.commit }, upstream: p.upstream }; }),
    ];
    const vendor = {
        format: 'engram-vendor/1',
        note: 'What Pages/Engram Minds Eye holds from other repositories, each pinned by SHA-256 (paths relative to this folder), written by reference/golden/make_bridges_v2.cjs from one Owl-Academy commit. biochain_v2.js is MIT (Owl-Academy, see NOTICE); the contract vectors are CC0-1.0 (RFC 07, BioChainAI/SHD-CCP-core, decision D5c), taken from Owl\'s tests/vendor at the same commit, whose VENDOR.json pins them by the same SHA-256. tests/bridges-v2.cjs checks every SHA-256 offline; make_bridges_v2.cjs --check rebuilds the files from the pinned content. The v1 pins (biochain_v1.js and the others) are recorded in biochain_v1.provenance.json.',
        owl: { repository: prov.repository, commit: prov.commit },
        files,
    };
    return { js, json, vendor: JSON.stringify(vendor, null, 1) + '\n', out };
}

// ------------------------------------------------------------------ write, or check
const readHere = rel => fs.readFileSync(path.join(SYSTEM, rel), 'utf8');
const suitesHere = () => Object.fromEntries([...SUITES.map(s => [s, readHere(`reference/golden/vendor/shdccp2-contract/suites/${s}.json`)]), ['LICENSE', readHere('reference/golden/vendor/shdccp2-contract/LICENSE')]]);
// the provenance recorded in VENDOR.json, in the form build takes
function recordedProv() {
    const V = JSON.parse(fs.readFileSync(OUT_VENDOR, 'utf8')), byPath = Object.fromEntries(V.files.map(f => [f.path, f]));
    const core = byPath['biochain_v2.js'].from;
    return { repository: V.owl.repository, commit: V.owl.commit, core: { commit: core.commit, sha256: core.sha256 },
        vendored: Object.fromEntries(VENDORED.map(v => [v.here, { commit: byPath[v.here].from.commit, upstream: byPath[v.here].upstream, sha256: byPath[v.here].sha256, owl: v.owl }])) };
}

if (CHECK) {
    if (!fs.existsSync(OUT_VENDOR) || !fs.existsSync(OUT_JSON)) { console.log('FAIL  VENDOR.json or bridges_v2.json is missing: run with an Owl-Academy commit first'); process.exit(1); }
    const prov = recordedProv(), live = { ...prov, commit: null, core: { commit: null } };
    X.checkPin({
        name: 'make_bridges_v2 (biochain_v2.js, bridges_v2.json, VENDOR.json, the vendored vectors)',
        repo: { name: 'Owl-Academy', root: OWL },
        sources: [
            { file: F_CORE, sha256: prov.core.sha256, candidates: [F_CORE], names: [...X.CONST_NAMES, ...V2_NAMES, 'growBiochain', 'verifyIntegrity'] },
            ...VENDORED.map(v => ({ file: v.owl, sha256: prov.vendored[v.here].sha256, liveOptional: true })),
        ],
        pin: 'v2',
        outputs: [{ label: 'biochain_v2.js', path: OUT_JS }, { label: 'bridges_v2.json', path: OUT_JSON }, { label: 'VENDOR.json', path: OUT_VENDOR },
            ...VENDORED.map(v => ({ label: v.here, path: path.join(SYSTEM, v.here) }))],
        // reproduction: everything from the pinned content; live: the checkout's core on the suites as pinned here
        build: async (S, mode) => {
            const suites = mode === 'reproduction'
                ? Object.fromEntries(VENDORED.map(v => [v.here.endsWith('LICENSE') ? 'LICENSE' : path.basename(v.here, '.json'), S[v.owl]]))
                : suitesHere();
            const b = await build(S[F_CORE], suites, mode === 'reproduction' ? prov : live);
            return [b.js, b.json, b.vendor, ...VENDORED.map(v => S[v.owl])];
        },
        behaviour: texts => X.stripKeys(JSON.parse(texts[1]), ['source']),
        bodies: [{ file: F_CORE, names: [...X.CONST_NAMES, ...V2_NAMES], pinned: () => fs.readFileSync(OUT_JS, 'utf8') }],
        commitNotes: () => { const c = X.lastCommit(OWL, [F_CORE]); return c && c !== prov.core.commit ? [`the last commit to touch ${F_CORE} is ${c.slice(0, 7)}; v2 recorded ${prov.core.commit.slice(0, 7)}`] : []; },
    }).catch(e => { console.error(e); process.exit(1); });
} else {
    (async () => {
        if (!COMMIT) { console.error('usage: make_bridges_v2.cjs <Owl-Academy commit> | --check [--owl <checkout>]'); process.exit(2); }
        if (!fs.existsSync(OWL)) { console.error(`no Owl-Academy checkout at ${OWL} (OWL_ACADEMY_DIR, or --owl)`); process.exit(2); }
        const git = args => execFileSync('git', ['-C', OWL, ...args], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
        const commit = git(['rev-parse', '--verify', `${COMMIT}^{commit}`]).toString().trim();
        const show = f => git(['show', `${commit}:${f}`]).toString('utf8');
        const lastChanged = f => git(['log', '-1', '--format=%H', commit, '--', f]).toString().trim();
        const core = show(F_CORE), owlVendor = JSON.parse(show(F_OWL_VENDOR));
        const vendored = {}, suites = {};
        for (const v of VENDORED) {
            const text = show(v.owl), rel = v.owl.slice(OWL_VDIR.length);
            const src = owlVendor.sources.find(s => s.files.some(f => f.path === rel)), entry = src && src.files.find(f => f.path === rel);
            if (!entry) throw new Error(`${v.owl} is not listed in Owl's ${F_OWL_VENDOR} at ${commit.slice(0, 7)}`);
            if (entry.sha256 !== sha256(text)) throw new Error(`${v.owl}: SHA-256 ${sha256(text).slice(0, 12)}… is not the ${entry.sha256.slice(0, 12)}… Owl's ${F_OWL_VENDOR} records`);
            vendored[v.here] = { commit: lastChanged(v.owl), upstream: { repository: src.repository, commit: src.commit, path: entry.upstream, ...(entry.lastChanged ? { lastChanged: entry.lastChanged } : {}) } };
            suites[v.here.endsWith('LICENSE') ? 'LICENSE' : path.basename(v.here, '.json')] = text;
        }
        const prov = { repository: 'BioChainAI/Owl-Academy', commit, core: { commit: lastChanged(F_CORE) }, vendored };
        const b = await build(core, suites, prov);
        const write = (file, text) => { const was = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null; if (was === text) return 'unchanged'; fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); return was === null ? 'written' : 'rewritten'; };
        const done = [['biochain_v2.js', write(OUT_JS, b.js)], ['bridges_v2.json', write(OUT_JSON, b.json)], ['VENDOR.json', write(OUT_VENDOR, b.vendor)],
            ...VENDORED.map(v => [v.here, write(path.join(SYSTEM, v.here), suites[v.here.endsWith('LICENSE') ? 'LICENSE' : path.basename(v.here, '.json')])])];
        const o = b.out, tamperOk = Object.values(o.tamper).map(t => `${t.cases.filter(c => c.as_expected).length}/${t.cases.length}`).join(' and ');
        console.log(done.map(([f, w]) => `${f} ${w}`).join('; '));
        console.log(`Owl-Academy ${commit.slice(0, 7)} (${F_CORE} last changed in ${prov.core.commit.slice(0, 7)}): biochains ${o.bridges_v1.map(x => `${x.name}: ${x.label}`).join('; ')}; ` +
            `differential ${o.differential.length}; tamper suites as expected ${tamperOk}; records as the vectors ${o.records.filter(r => r.as_vector || r.threw).length}/${o.records.length}; ` +
            `engram1_keys ${o.engram1_keys.filter(k => k.as_vector).length}/${o.engram1_keys.length}; the grid built once gives v1's keys: ${o.engram_grid.same_as_v1}`);
    })().catch(e => { console.error(e && e.message ? e.message : e); process.exit(1); });
}
