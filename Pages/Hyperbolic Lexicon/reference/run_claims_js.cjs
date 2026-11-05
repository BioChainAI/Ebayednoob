#!/usr/bin/env node
// Hyperbolic Lexicon, Phase 2: the JavaScript engines against the Python reference, and the decisions of L1, L3(f),
// L4(a) and L4(b) (PREREGISTRATION.md: L1, L3, L4, the common rules, and Amendment 4 items 1-8).
//
//   node "Pages/Hyperbolic Lexicon/reference/run_claims_js.cjs"          the decisive run: results/claims-phase2.json, .md
//   node "Pages/Hyperbolic Lexicon/reference/run_claims_js.cjs" --dry    the registered dry run (Amendment 4 item 7):
//                                                                        results/dry/claims-phase2.json, .md
//
// Run it AFTER the Python side: python3 -B run_claims.py --phase2 [--dry] writes results[/dry]/phase2-python.json and
// the per-instance lists in ~/.cache/hyperbolic-lexicon/phase2[-dry]/ (HL_CACHE overrides the cache root). L3(f) reads
// Phase 1's results[/dry]/claims.json and l3f-python.txt. Needs Node 22, the WordNet archive and EWT files in the
// cache, V1 in the cache (the decisive run refuses without it, for Node or in Python's results: V1 is pinned, so its
// cells are in force; a dry run goes on without it, says so, and counts the V1 cells as not run), and Playwright's
// Chromium.
//
// What it does, in order (each step refuses to go on when its inputs are not the registered ones):
//   1. Parity first (Amendment 4 item 8): spawns tests/parity-lexicon.cjs and refuses to run if any line fails or is
//      skipped (in a dry run only, V1's lines may be skipped when V1 is not cached here); checks the data wrappers
//      data/*.js against the pins and reference/golden/make_js_data_v1.cjs --check.
//   2. L1 in Node (items 2 and 3): loads the instance lists with golden/l1_instances_v1.cjs, checked against
//      golden/l1_instances_v1.meta.json and against the digests of the inputs Python ran (dry: the Rng(4000 + i)
//      strings and the repository Markdown spike S6 used); per instance set and vocabulary, every instance's record
//      (lexicon_core.js) and its SHA-256, the list digest and the id-stream SHA-256, compared with Python's; on a
//      mismatch, instance by instance, the first 20 differing instances kept with both records (in the cache; the
//      JSON keeps a window of each, but for (b), UD EWT, whose text is not committed, only SHA-256s). Control 1: per
//      case, S6's platform normaliser (toLowerCase, NFD, minus \p{Mn}) against the reference's R(s) (Python's per-case
//      SHA-256 list), and this core's table R(s) against the same list.
//   3. L1 in Chromium: serves the repository root over HTTP (a Node http server on a free local port, stopped at the
//      end), opens tests/l1-harness.html (the shared cores, data/*.js and lexicon_core.js by relative path), hands it
//      the instance bytes in base64 chunks and V1's bytes, and compares the page's per-instance digests and id streams
//      with Python's as for Node; control 1 in the page; the Chromium version and the page's Unicode behaviour.
//   4. L3(f) (item 4): the words by lexicon_core.js's address rule from the archive read by golden/wordnet_v1.cjs (the
//      nouns; dry: the verb forest), H^3 points by decoder3d.js pointExact, H^2 points by the core's exact tree; the
//      canonical point list's SHA-256 against claims.json's, and the 2,000 sampled lines against l3f-python.txt.
//   5. L4(a) (item 5): rank lists in H^3 and H^2 for every query of the mammal spanning subtree and queries 0-199 of the
//      noun query sample (dry: the verb stand-in subtree and the 200 verb queries Rng(4000).sample(13767, 200));
//      every rank list's SHA-256 and the exact MAPs and mean ranks against Python's; the small set also in Chromium
//      (reported). L4(b) (item 6): Node's float64 counts over the whole query sample and its controls (reported);
//      the decision is Python's.
//   6. Decisions: L1 per vocabulary cell and runtime, L3(f), L4(a), L4(b); results[/dry]/claims-phase2.json and .md,
//      with the versions (Node, Chromium, the Unicode/ICU each runtime reports, Python's from phase2-python.json),
//      timings, counterexamples, controls and Python's reported metrics passed through.
// The runner's own per-instance lists go to <cache>/phase2[-dry]/js/ (outside git). Exits 1 when it refuses or
// fails; 0 when the results are written, whatever they decide.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const zlib = require('zlib');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const REF = __dirname;
const SYS = path.resolve(REF, '..');
const ROOT = path.resolve(SYS, '..', '..');
const LC = require(path.join(SYS, 'lexicon_core.js'));
const HP = require(path.join(SYS, '..', 'Hyperbolic Oracles', 'hyperbolic_core.js'));
const L = require('./golden/l1_instances_v1.cjs');
const W = require('./golden/wordnet_v1.cjs');

const DRY = process.argv.includes('--dry');
const OFF = DRY ? 3000 : 0;                    // Amendment 1 item 10: +3000 on every seed in a dry run
const RESULTS = path.join(REF, 'results', ...(DRY ? ['dry'] : []));
const CACHE = process.env.HL_CACHE || path.join(os.homedir(), '.cache', 'hyperbolic-lexicon');
const P2_CACHE = path.join(CACHE, DRY ? 'phase2-dry' : 'phase2');
const JS_DIR = path.join(P2_CACHE, 'js');
const HARNESS = 'Pages/Hyperbolic Lexicon/tests/l1-harness.html';
const KEEP = 20;                               // counterexamples kept per cell, as run_claims.py
const CLIP = 240;                              // characters of a record kept in the JSON (run_claims.py's P2_CLIP)
const EXAMPLES = 3;                            // examples per control cell (run_claims.py's P2_EXAMPLES)
// L1's Data: "UD EWT (CC BY-SA 4.0, text not committed)" (run_claims.py's P2_TEXT_NOT_COMMITTED and P2_TEXT_FIELDS):
// for these sets the committed JSON keeps no record window or token list, only indices, offsets, lengths and SHA-256s.
const TEXT_NOT_COMMITTED = new Set(['b']);
const TEXT_FIELDS = ['registered', 'control', 'ours', 'hf'];
const L4A_BIG_QUERIES = 200;                   // Amendment 4 item 5: queries 0-199 of the large set
const CHUNK_INSTANCES = 2000, CHUNK_BYTES = 1 << 20;   // per page.evaluate (memory only; changes no result)

const T0 = performance.now();
const secs = t => Math.round((performance.now() - t) / 100) / 10;
const log = msg => console.log(msg);
const rel = p => path.relative(REF, p);
const nodeSha = b => crypto.createHash('sha256').update(b).digest('hex');   // file checks only; the engines hash with the core
function refuse(msg) { console.error(`REFUSED: ${msg}`); process.exit(1); }
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));

// run_claims.py's exact_decision and combine
function exactDecision(failures, controlFailed = true) { return !controlFailed ? 'void' : failures === 0 ? 'supported' : 'refuted'; }
function combine(...ds) {
    if (ds.includes('refuted')) return 'refuted';
    if (ds.includes('void')) return 'void';
    return ds.length && ds.every(d => d === 'supported') ? 'supported' : 'inconclusive';
}
function firstDifference(a, b) {               // phase2.py first_difference, on strings
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
    return n;
}
const windowAt = (s, k) => s.slice(Math.max(0, k - 40), Math.max(0, k - 40) + CLIP);
const qText = q => (q === null || q === undefined ? null : `${q.n}/${q.d}`);
const frac = q => ({ exact: qText(q), float: q.toNumber() });
const readLines = p => { const t = fs.readFileSync(p, 'utf8'); const a = t.split('\n'); if (a[a.length - 1] === '') a.pop(); return a; };
function concat(parts) {
    let n = 0;
    for (const p of parts) n += p.length;
    const out = new Uint8Array(n);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
}
function gitInfo() {
    const run = args => { const r = spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
    return { git_head: run(['rev-parse', 'HEAD']), system_uncommitted_changes: !!run(['status', '--porcelain', '--', SYS]) };
}
// The Unicode behaviour a runtime shows through its own functions (the twin of tests/l1-harness.html's env()).
function unicodeProbe() {
    const assigned = cp => /^\p{Assigned}$/u.test(String.fromCodePoint(cp));
    const hexcps = s => Array.from(s, ch => ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
    const markers = {};
    let newest = 'none of the markers';
    for (const [cp, v] of [[0x2FFC, '15.1'], [0x0897, '16.0'], [0x20C1, '17.0']]) {
        const a = assigned(cp);
        markers['U+' + cp.toString(16).toUpperCase().padStart(4, '0') + ' (new in ' + v + ')'] = a;
        if (a) newest = v;
    }
    const dt = Intl.DateTimeFormat().resolvedOptions();
    return { markersAssigned: markers, newestMarkerAssigned: newest, lowercase_U0130: hexcps(String.fromCodePoint(0x130).toLowerCase()),
        lowercase_final_sigma: hexcps(String.fromCodePoint(0x391, 0x3A3).toLowerCase()), nfd_U1E9B_U0323: hexcps(String.fromCodePoint(0x1E9B, 0x323).normalize('NFD')),
        intlLocale: dt.locale, intlTimeZone: dt.timeZone };
}

// ================================================================== 0. the Python side's results
const PY_PATH = path.join(RESULTS, 'phase2-python.json');
if (!fs.existsSync(PY_PATH)) refuse(`no ${rel(PY_PATH)}: run python3 -B run_claims.py --phase2${DRY ? ' --dry' : ''} first`);
const PY = readJson(PY_PATH);
if (PY.dry !== DRY) refuse(`${rel(PY_PATH)} is ${PY.dry ? 'a dry run' : 'not a dry run'}`);
if (!PY.claims || !PY.claims.L1 || !PY.claims.L4) refuse(`${rel(PY_PATH)} lacks L1 or L4 (run_claims.py --phase2 without a claim name writes both)`);
if (PY.cache.dir !== path.basename(P2_CACHE)) refuse(`${rel(PY_PATH)} names the cache directory ${PY.cache.dir}, not ${path.basename(P2_CACHE)}`);
const PY1 = PY.claims.L1, PY4 = PY.claims.L4;
// the JSON this runner writes passes Python's control and Hugging Face examples through: none may carry EWT text
for (const name of Object.keys(PY1.sets || {}).filter(n => TEXT_NOT_COMMITTED.has(n))) {
    const exs = [...Object.values(PY1.sets[name].cells || {}).map(c => (c.hf_agreement || {}).examples || []),
        ...['2', '3'].flatMap(n => Object.values(((PY1.controls || {})[n] || {}).cells || {}).map(byset => (byset[name] || {}).examples || []))].flat();
    if (exs.some(e => TEXT_FIELDS.some(k => k in e))) refuse(`${rel(PY_PATH)} carries text of set ${name} in its examples (L1 Data: not committed); rerun the current run_claims.py --phase2`);
}
// V1 is pinned (Amendment 1 item 3), so its cells are in force (Amendment 4 item 2: "The cells are V0 and V1, each in
// Node and in Chromium"): the decisive run refuses unless both Python and Node have it. A dry run may go without.
const V1_NODE = LC.v1Available();
if (!DRY && PY1.vocabularies.V1 && PY1.vocabularies.V1.skipped) refuse(`${rel(PY_PATH)} skipped V1 (${PY1.vocabularies.V1.skipped}); L1's V1 cells are in force`);
if (!DRY && !V1_NODE) refuse(`V1 is not cached for Node under ${CACHE} (run reference/golden/make_vocab_v1.py; HL_CACHE must name the cache Python used): L1's V1 cells are in force`);
const CLAIMS_PATH = path.join(RESULTS, 'claims.json');
if (!fs.existsSync(CLAIMS_PATH)) refuse(`no ${rel(CLAIMS_PATH)} (Phase 1's run_claims.py${DRY ? ' --dry' : ''} writes the Python side of L3(f))`);
const PY_L3 = readJson(CLAIMS_PATH).claims.L3;
if (!PY_L3) refuse(`${rel(CLAIMS_PATH)} has no L3`);
const pyCachePath = p => path.join(CACHE, p);   // run_claims.py writes cache paths relative to the cache root
log(`Phase 2, JavaScript engines${DRY ? ' (dry run)' : ''}: against ${rel(PY_PATH)} (started ${PY.started})`);

// ================================================================== 1. parity and the data wrappers
function checkParity() {
    const t = performance.now();
    const r = spawnSync(process.execPath, [path.join(SYS, 'tests', 'parity-lexicon.cjs'), '--quiet'], { encoding: 'utf8', maxBuffer: 256 << 20 });
    const lines = `${r.stdout || ''}${r.stderr || ''}`.split('\n');
    const summary = lines.filter(l => l.startsWith('Parity:')).pop() || '';
    const m = /^Parity: (\d+)\/(\d+) lines pass(?:, (\d+) FAIL)?(?:, (\d+) skipped)?/.exec(summary);
    const failing = lines.filter(l => /^FAIL\s/.test(l) || /^\s+FAIL\s/.test(l));
    // Amendment 4 item 8 asks for every Phase 1 trace line reproduced before any decisive run, so there a skipped line
    // refuses the run. READING: a dry run is not decisive; it may skip V1's lines when V1 is not cached here (its V1
    // cells are then not run, and L1 is not supported).
    const skipped = lines.map(l => /^(?:ok {2}|skip|FAIL) {2}(.+): \d+\/\d+, (\d+) skipped \(/.exec(l)).filter(Boolean).map(x => ({ section: x[1], lines: +x[2] }));
    const badSkips = skipped.filter(s => !(DRY && s.section.includes('(V1)') && !V1_NODE));
    const out = { command: 'node tests/parity-lexicon.cjs --quiet', exit: r.status, summary, pass: m ? +m[1] : null, fail: m ? +(m[3] || 0) : null,
        skip: m ? +(m[4] || 0) : null, skipped_sections: skipped, seconds: secs(t) };
    if (r.status !== 0 || !m || out.fail) refuse(`tests/parity-lexicon.cjs does not pass (exit ${r.status}): ${summary || 'no summary'}\n${failing.slice(0, 20).join('\n')}`);
    if (badSkips.length) refuse(`tests/parity-lexicon.cjs skipped lines: ${badSkips.map(s => `${s.section} (${s.lines})`).join(', ')}`);
    return out;
}
function checkData() {
    const t = performance.now();
    const r = spawnSync(process.execPath, [path.join(REF, 'golden', 'make_js_data_v1.cjs'), '--check'], { encoding: 'utf8' });
    const files = [['unicode_15_1_v1.js', 'unicode_15_1_v1', LC.PINS.unicode], ['vocab_v0_lex0.js', 'vocab_v0_lex0', LC.PINS.V0]].map(([file, name, pin]) => {
        const p = path.join(SYS, 'data', file);
        if (!fs.existsSync(p)) refuse(`data/${file} is missing: run reference/golden/make_js_data_v1.cjs`);
        const bytes = LC.utf8(require(p)[name]);
        return { file: `data/${file}`, bytes: bytes.length, sha256: LC.sha256Hex(bytes), pinned: bytes.length === pin.bytes && LC.sha256Hex(bytes) === pin.sha256 };
    });
    if (r.status !== 0) refuse(`make_js_data_v1.cjs --check exits ${r.status}: ${(r.stdout + r.stderr).trim().split('\n').pop()}`);
    const bad = files.filter(f => !f.pinned);
    if (bad.length) refuse(`data wrappers differ from the pins: ${bad.map(f => f.file).join(', ')}`);
    return { make_js_data_v1_check: 'exit 0', files, seconds: secs(t) };
}
log('1. parity (tests/parity-lexicon.cjs) and the data wrappers ...');
const PARITY = checkParity();
log(`   ${PARITY.summary}`);
const DATA = checkData();
log(`   data/*.js: ${DATA.files.map(f => `${f.file} ${f.sha256.slice(0, 12)}…`).join(', ')} equal the pins`);

// ================================================================== 2. L1: the instance sets and the vocabularies
function l1Sets() {
    let sets;
    if (DRY) {
        const dryD = L.dryD(), [row] = L.checkLists({ dry_d: dryD });
        if (!row[3]) refuse('the Rng(4000 + i) strings do not match the dry_d pin of golden/l1_instances_v1.meta.json');
        const md = L.markdown();
        sets = [{ name: 'dry_d', blobs: dryD, sha256: row[2], pinned: 'golden/l1_instances_v1.meta.json dry_d' },
            { name: 'markdown', blobs: md.map(x => x.data), files: md.map(x => x.path), sha256: L.digest(md.map(x => x.data)), pinned: null }];
    } else {
        const lists = L.loadAll();             // throws unless all four match golden/l1_instances_v1.meta.json
        sets = ['a', 'b', 'c', 'd'].map(name => ({ name, blobs: lists[name], sha256: L.digest(lists[name]), pinned: 'golden/l1_instances_v1.meta.json' }));
    }
    // the inputs Python ran must be these, by digest (Amendment 4 item 2: Chromium receives Node's bytes)
    const names = Object.keys(PY1.sets);
    if (names.join() !== sets.map(S => S.name).join()) refuse(`Python's L1 sets are ${names.join(', ')}, not ${sets.map(S => S.name).join(', ')}`);
    for (const S of sets) {
        const p = PY1.sets[S.name];
        if (p.instances !== S.blobs.length || p.instances_sha256 !== S.sha256) refuse(`L1 set ${S.name}: Node's ${S.blobs.length} instances (${S.sha256}) are not the ${p.instances} Python ran (${p.instances_sha256})`);
        if (S.files && JSON.stringify(S.files) !== JSON.stringify(p.files)) refuse(`L1 set ${S.name}: the Markdown files differ from Python's`);
    }
    return sets;
}
function l1Vocabs() {
    const out = [], skipped = {};
    for (const tag of ['V0', 'V1']) {
        const py = PY1.vocabularies[tag];
        if ((py.skipped || (tag === 'V1' && !V1_NODE)) && !DRY) refuse(`vocabulary ${tag} is not available to both runners; its cells are in force`);
        if (py.skipped) { skipped[tag] = `Python skipped it: ${py.skipped}`; continue; }
        if (tag === 'V1' && !V1_NODE) { skipped[tag] = 'V1 is not cached for Node (run reference/golden/make_vocab_v1.py; a dry run only)'; continue; }
        const v = tag === 'V0' ? LC.loadV0() : LC.loadV1();
        if (v.sha256 !== py.sha256 || v.size !== py.entries) refuse(`vocabulary ${tag}: Node's ${v.sha256} is not Python's ${py.sha256}`);
        out.push({ tag, v });
    }
    return { vocabs: out, skipped };
}
// Python's per-instance digests and records (the cache files run_claims.py wrote), each file checked against the JSON
const PY_LISTS = new Map();
function pyHexes(setName, tag) {
    const key = `${setName}.${tag}`;
    if (!PY_LISTS.has(key)) {
        const cell = PY1.sets[setName].cells[tag], p = pyCachePath(cell.records_sha256_file);
        if (!fs.existsSync(p)) refuse(`${p} is missing: rerun python3 -B run_claims.py --phase2${DRY ? ' --dry' : ''}`);
        const buf = fs.readFileSync(p);
        if (nodeSha(buf) !== cell.records_list_sha256) refuse(`${p} is not the list ${rel(PY_PATH)} describes`);
        PY_LISTS.set(key, readLines(p));
    }
    return PY_LISTS.get(key);
}
const PY_RECORDS = new Map();
function pyRecord(setName, tag, i) {
    const key = `${setName}.${tag}`;
    if (!PY_RECORDS.has(key)) {
        const p = pyCachePath(PY1.sets[setName].cells[tag].records_file);
        const lines = zlib.gunzipSync(fs.readFileSync(p)).toString('utf8').split('\n');
        lines.pop();
        PY_RECORDS.set(key, lines);
    }
    return PY_RECORDS.get(key)[i];
}

// One engine's results for one set and vocabulary against Python's: the list digest, then instance by instance on a
// mismatch (the first KEEP with both records), and the id stream. records(indices) gives the engine's own records.
// READING: "keeping ... both records": the JSON (committed) holds a CLIP-character window of each record from just
// before the first difference, as run_claims.py's examples do; the full records go to <cache>/phase2[-dry]/js/
// (outside git). Records of (b) carry UD EWT text, which is not committed (L1 Data): for (b) the JSON keeps no
// window, only the instance, the offset, the lengths and both SHA-256s.
async function compareCell(runtime, S, tag, hexes, stream, ms, records) {
    const py = PY1.sets[S.name].cells[tag], digest = LC.listDigest(hexes);
    fs.mkdirSync(JS_DIR, { recursive: true });
    const file = path.join(JS_DIR, `${runtime}.${S.name}.${tag}.sha256.txt`);
    const body = hexes.map(h => h + '\n').join('');
    fs.writeFileSync(file, body);
    // the core's SHA-256 (orbital_core.js) against Node's crypto on the same lines: the list digest is the file's hash
    if (nodeSha(Buffer.from(body, 'ascii')) !== digest) throw new Error(`${file}: the core's list digest is not the file's SHA-256`);
    const differ = [];
    if (digest !== py.records_list_sha256) {
        const P = pyHexes(S.name, tag), n = Math.max(P.length, hexes.length);
        for (let i = 0; i < n; i++) if (P[i] !== hexes[i]) differ.push(i);
    }
    const kept = differ.slice(0, KEEP), counter = [];
    if (kept.length) {
        const mine = await records(kept), full = [];
        const fullFile = path.join(JS_DIR, `${runtime}.${S.name}.${tag}.counterexamples.jsonl`), withheld = TEXT_NOT_COMMITTED.has(S.name);
        kept.forEach((i, k) => {
            const a = pyRecord(S.name, tag, i) ?? null, b = mine[k] ?? null, at = a !== null && b !== null ? firstDifference(a, b) : 0;
            full.push(JSON.stringify({ instance: i, python: a, [runtime]: b }));
            const ce = { instance: i, python_sha256: pyHexes(S.name, tag)[i] ?? null, [`${runtime}_sha256`]: hexes[i] ?? null, first_difference_at: at,
                python_record_length: a === null ? null : a.length, [`${runtime}_record_length`]: b === null ? null : b.length };
            if (withheld) ce.text = `not committed (L1 Data: UD EWT text is not committed); both records are in ${path.relative(CACHE, fullFile)}`;
            else Object.assign(ce, { python: a === null ? null : windowAt(a, at), [runtime]: b === null ? null : windowAt(b, at) });
            counter.push(ce);
        });
        fs.writeFileSync(fullFile, full.join('\n') + '\n');
    }
    const ps = py.id_stream;
    const streamEqual = stream.sha256 === ps.sha256 && stream.instances === ps.instances && stream.ids === ps.ids && stream.bytes === ps.bytes;
    return {
        instances: hexes.length, records_list_sha256: digest, python_records_list_sha256: py.records_list_sha256, list_equal: digest === py.records_list_sha256,
        differing_instances: differ.length, id_stream: { ...stream, python_sha256: ps.sha256, equal: streamEqual },
        counterexamples: counter, records_sha256_file: path.relative(CACHE, file), seconds: Math.round(ms / 100) / 10,
    };
}
// Control 1's comparison from one engine's rows [sha(platform), sha(table R), platform === table] for a set.
// READING: Amendment 4 item 3 compares the platform normaliser with "the reference's" R(s), so the count that decides
// is platform against Python's per-case SHA-256 list; this core's own table R(s) must give that same list (reported as
// table_list_equal), and platform against this core's table is reported beside it.
function control1Result(S, rows, ms, examples) {
    const py = PY1.controls['1'].sets[S.name], p = pyCachePath(py.file);
    if (!fs.existsSync(p) || nodeSha(fs.readFileSync(p)) !== py.list_sha256) refuse(`${p} is not control 1's list ${rel(PY_PATH)} describes`);
    const ref = readLines(p);
    if (ref.length !== rows.length) refuse(`control 1 (${S.name}): ${rows.length} cases here, ${ref.length} in Python's list`);
    let platformVsReference = 0, platformVsTable = 0, tableVsReference = 0;
    const firstPlatform = [];
    rows.forEach(([hp, ht, same], i) => {
        if (hp !== ref[i]) { platformVsReference++; if (firstPlatform.length < EXAMPLES) firstPlatform.push(i); }
        if (!same) platformVsTable++;
        if (ht !== ref[i]) tableVsReference++;
    });
    const tableDigest = LC.listDigest(rows.map(r => r[1]));
    return { cases: rows.length, platform_differs_from_reference: platformVsReference, platform_differs_from_this_cores_table: platformVsTable,
        this_cores_table_list_sha256: tableDigest, python_list_sha256: py.list_sha256, table_list_equal: tableDigest === py.list_sha256,
        table_cases_differing_from_reference: tableVsReference, first_cases_where_the_platform_differs: firstPlatform, examples, seconds: Math.round(ms / 100) / 10 };
}
// a few platform/table pairs where they differ (code points, a window of 16 around the first difference)
function control1Examples(S, rows) {
    const out = [];
    for (let i = 0; i < rows.length && out.length < EXAMPLES; i++) {
        if (rows[i][2]) continue;
        const s = LC.fromCps(LC.decodeUtf8(S.blobs[i]).cps), a = LC.cpsOf(LC.platformNormalise(s)), b = LC.cpsOf(LC.tableLowerNfdDropMn(s));
        let k = 0;
        while (k < a.length && k < b.length && a[k] === b[k]) k++;
        const hx = cps => cps.slice(Math.max(0, k - 4), k + 12).map(c => c.toString(16).toUpperCase().padStart(4, '0')).join(' ');
        out.push({ case: i, first_difference_at_code_point: k, platform: hx(a), table: hx(b) });
    }
    return out;
}

// ------------------------------------------------------------------ L1 in Node
function nodeRun(S, vocabs) {
    const t = performance.now(), hexes = {}, parts = {}, ids = {};
    for (const { tag } of vocabs) { hexes[tag] = []; parts[tag] = []; ids[tag] = 0; }
    for (const blob of S.blobs) {
        const r = LC.nb(blob);
        for (const { tag, v } of vocabs) {
            hexes[tag].push(LC.recordSha256(LC.recordNb(r, v)));
            const x = LC.encodeNb(r, v).ids;   // memoised per word: the same pieces as the record's
            parts[tag].push(LC.leb128([x.length]), LC.leb128(x));
            ids[tag] += x.length;
        }
    }
    const streams = {};
    for (const { tag } of vocabs) { const s = concat(parts[tag]); streams[tag] = { instances: S.blobs.length, ids: ids[tag], bytes: s.length, sha256: LC.sha256Hex(s) }; }
    return { hexes, streams, ms: performance.now() - t };
}
function nodeControl1(S) {
    const t = performance.now();
    const rows = S.blobs.map(b => {
        const s = LC.fromCps(LC.decodeUtf8(b).cps), p = LC.platformNormalise(s), r = LC.tableLowerNfdDropMn(s);
        return [LC.sha256Hex(LC.utf8(p)), LC.sha256Hex(LC.utf8(r)), p === r];
    });
    return control1Result(S, rows, performance.now() - t, control1Examples(S, rows));
}
async function l1Node(sets, vocabs) {
    const out = { sets: {}, control1: {} };
    for (const S of sets) {
        log(`   Node ${S.name}: ${S.blobs.length} instances`);
        const r = nodeRun(S, vocabs);
        out.sets[S.name] = {};
        for (const { tag, v } of vocabs) {
            out.sets[S.name][tag] = await compareCell('node', S, tag, r.hexes[tag], r.streams[tag], r.ms, async idx => idx.map(i => LC.record(S.blobs[i], v)));
            const c = out.sets[S.name][tag];
            log(`     ${tag}: ${c.differing_instances} differing instances; list ${c.list_equal ? 'equal' : 'DIFFERENT'}; id stream ${c.id_stream.equal ? 'equal' : 'DIFFERENT'} (${c.seconds} s for both vocabularies)`);
        }
        if (PY1.controls['1'].sets[S.name]) {
            out.control1[S.name] = nodeControl1(S);
            const c = out.control1[S.name];
            log(`     control 1: the platform differs from the reference on ${c.platform_differs_from_reference}/${c.cases}; table list ${c.table_list_equal ? 'equal' : 'DIFFERENT'}`);
        }
    }
    return out;
}

// ------------------------------------------------------------------ L1 (and L4(a)'s small set) in Chromium
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.txt': 'text/plain; charset=utf-8' };
function serve(root) {                         // GET/HEAD of files under root, nothing else; 127.0.0.1, a free port
    const server = http.createServer((req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
        let p;
        try { p = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); } catch { res.writeHead(400); res.end(); return; }
        const file = path.resolve(root, '.' + p);
        if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
        fs.readFile(file, (err, data) => {
            if (err) { res.writeHead(404); res.end(); return; }
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            res.end(req.method === 'HEAD' ? undefined : data);
        });
    });
    return new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve(server)); });
}
function chunks(blobs) {                       // base64 chunks of at most CHUNK_INSTANCES instances or about CHUNK_BYTES
    const out = [];
    let cur = [], bytes = 0;
    for (const b of blobs) {
        if (cur.length && (cur.length >= CHUNK_INSTANCES || bytes + b.length > CHUNK_BYTES)) { out.push(cur); cur = []; bytes = 0; }
        cur.push(Buffer.from(b.buffer, b.byteOffset, b.length).toString('base64'));
        bytes += b.length;
    }
    if (cur.length) out.push(cur);
    return out;
}
async function l1Chromium(sets, vocabs, small) {
    let pw;
    try { pw = require('playwright'); } catch (e) { return { not_run: `playwright cannot be loaded: ${e.message}` }; }
    const t = performance.now(), server = await serve(ROOT), port = server.address().port;
    let browser = null;
    const errors = [];
    try {
        browser = await pw.chromium.launch();
        const page = await browser.newPage();
        page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
        page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
        const url = `http://127.0.0.1:${port}/${HARNESS.split('/').map(encodeURIComponent).join('/')}`;
        const resp = await page.goto(url);
        if (!resp || !resp.ok()) throw new Error(`the harness page did not load (${resp ? resp.status() : 'no response'})`);
        const ready = await page.evaluate(() => window.L1H.ready());
        const loaded = { V0: ready.V0 };
        if (vocabs.some(x => x.tag === 'V1')) {
            const v1 = LC.SOURCES.vocab_v1, bytes = fs.readFileSync(path.join(CACHE, v1.cache));
            loaded.V1 = await page.evaluate(b64 => window.L1H.setV1(b64), bytes.toString('base64'));
        }
        for (const { tag, v } of vocabs) if (loaded[tag].sha256 !== v.sha256) throw new Error(`the page's ${tag} is ${loaded[tag].sha256}`);
        const env = { version: browser.version(), playwright: require('playwright/package.json').version, harness: HARNESS, served_from: 'the repository root over http://127.0.0.1:<free port>',
            icu: 'not exposed to pages (no version string); see the Unicode behaviour below',
            core: ready.core, unicode_table: ready.unicodeTable, ...(await page.evaluate(() => window.L1H.env())) };
        log(`   Chromium ${env.version} (Playwright ${env.playwright}); the page's newest assigned Unicode marker: ${env.newestMarkerAssigned}`);
        const out = { environment: env, sets: {}, control1: {} };
        const tags = vocabs.map(x => x.tag);
        for (const S of sets) {
            log(`   Chromium ${S.name}: ${S.blobs.length} instances`);
            await page.evaluate(tg => window.L1H.begin(tg), tags);
            const hexes = Object.fromEntries(tags.map(tg => [tg, []]));
            for (const c of chunks(S.blobs)) {
                const r = await page.evaluate(list => window.L1H.chunk(list), c);
                for (const tg of tags) for (const h of r[tg]) hexes[tg].push(h);
            }
            const end = await page.evaluate(() => window.L1H.end());
            out.sets[S.name] = {};
            for (const tag of tags) {
                const records = async idx => page.evaluate(([tg, list]) => window.L1H.records(tg, list), [tag, idx.map(i => Buffer.from(S.blobs[i]).toString('base64'))]);
                out.sets[S.name][tag] = await compareCell('chromium', S, tag, hexes[tag], end.streams[tag], end.ms, records);
                const c = out.sets[S.name][tag];
                log(`     ${tag}: ${c.differing_instances} differing instances; list ${c.list_equal ? 'equal' : 'DIFFERENT'}; id stream ${c.id_stream.equal ? 'equal' : 'DIFFERENT'} (${c.seconds} s in the page for both vocabularies)`);
            }
            if (PY1.controls['1'].sets[S.name]) {
                const rows = [];
                let ms = 0;
                for (const c of chunks(S.blobs)) {
                    const r = await page.evaluate(list => window.L1H.control1(list), c);
                    for (const x of r.rows) rows.push([x[0], x[1], x[2] === 1]);
                    ms += r.ms;
                }
                // the examples come from the page's own outputs, read back as code points
                const ex = [];
                for (let i = 0; i < rows.length && ex.length < EXAMPLES; i++) {
                    if (rows[i][2]) continue;
                    const pair = await page.evaluate(b64 => { const LCp = window.LexiconCore, b = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
                        const s = LCp.fromCps(LCp.decodeUtf8(b).cps); return [LCp.cpsOf(LCp.platformNormalise(s)), LCp.cpsOf(LCp.tableLowerNfdDropMn(s))]; }, Buffer.from(S.blobs[i]).toString('base64'));
                    const [a, b] = pair;
                    let k = 0;
                    while (k < a.length && k < b.length && a[k] === b[k]) k++;
                    const hx = cps => cps.slice(Math.max(0, k - 4), k + 12).map(cc => cc.toString(16).toUpperCase().padStart(4, '0')).join(' ');
                    ex.push({ case: i, first_difference_at_code_point: k, platform: hx(a), table: hx(b) });
                }
                out.control1[S.name] = control1Result(S, rows, ms, ex);
                const c = out.control1[S.name];
                log(`     control 1: the platform differs from the reference on ${c.platform_differs_from_reference}/${c.cases}; table list ${c.table_list_equal ? 'equal' : 'DIFFERENT'}`);
            }
        }
        // L4(a)'s small set in the page (Amendment 4 item 5: reported)
        if (small) {
            const tr = performance.now();
            const spec = { words: small.words.map(LC.wordStr), offsets: small.offsets, graph: small.nb[0], closure: small.nb[1], queries: small.queries };
            const r = await page.evaluate(sp => window.L1H.rank(sp), spec);
            out.l4a = { set: small.name, trees: {}, seconds: secs(tr) };
            for (const tree of ['H3', 'H2']) {
                const x = r[tree];
                out.l4a.trees[tree] = l4aCompare(PY4.a[small.name][tree], { ...x, queries_without_graph_neighbours: null, queries_without_closure_neighbours: null }, small, x.ms);
                log(`   Chromium L4(a) ${small.name} ${tree}: ${out.l4a.trees[tree].differing_rank_lists} differing rank lists, exact values ${out.l4a.trees[tree].exact_values_equal ? 'equal' : 'DIFFERENT'}`);
            }
        }
        out.page_errors = errors;
        out.seconds = secs(t);
        return out;
    } catch (e) {
        return { not_run: `Chromium failed: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`, page_errors: errors };
    } finally {
        if (browser) await browser.close();
        await new Promise(r => server.close(r));
    }
}

// ================================================================== L3(f) (Amendment 4 item 4)
function l3f(wn) {
    const t = performance.now(), pos = DRY ? 'verb' : 'noun', rep = PY_L3.reported;
    if (rep.forest !== pos) refuse(`${rel(CLAIMS_PATH)}'s L3 ran on the ${rep.forest} forest, not the ${pos} forest`);
    const tw = performance.now();
    const F = LC.forestOf(wn, pos);            // lexicon_core.js's address rule on the archive read by wordnet_v1.cjs
    const msWords = performance.now() - tw, N = F.offsets.length;
    if (N !== PY_L3.cases) refuse(`L3: ${N} ${pos} synsets here, ${PY_L3.cases} in ${rel(CLAIMS_PATH)}`);
    const tp = performance.now();
    const canon = LC.canonicalPointList(F.offsets, F.words, { h3: 'pointExact' });   // H^3: decoder3d.js pointExact
    const msPoints = performance.now() - tp;
    const shaEqual = canon.sha256 === rep.canonical_point_list_sha256;
    // the 2,000 sampled lines: node i = Rng(1000 + i).below(N) in offset order (dry: Rng(4000 + i))
    const fpath = path.join(REF, rep.f_sample_file), fl = readLines(fpath), head = fl[0], pyLines = fl.slice(1);
    const hm = /Rng\((\d+) \+ i\)\.below\((\d+)\).*Canonical point list SHA-256: ([0-9a-f]{64})/.exec(head);
    if (!hm || +hm[1] !== 1000 + OFF || +hm[2] !== N || hm[3] !== rep.canonical_point_list_sha256) refuse(`${rel(fpath)}'s header does not match this run (${head.slice(0, 120)})`);
    if (pyLines.length !== 2000) refuse(`${rel(fpath)} holds ${pyLines.length} lines, not 2,000`);
    const mine = Array.from({ length: 2000 }, (_, i) => { const k = new HP.Rng(1000 + OFF + i).below(N); return LC.l3fLine(F.offsets[k], F.words[k], canon.lines3[k], canon.lines2[k]); });
    const cmp = lines => { const d = []; lines.forEach((x, i) => { if (x !== pyLines[i]) d.push(i); }); return d; };
    const differ = cmp(mine);
    // a control of the comparison itself (reported): one digit changed in one line must be caught, and only there
    const bent = mine.slice(), j = 1234 % bent.length;
    bent[j] = bent[j].replace(/(\d)(?!.*\d)/, d => String((+d + 1) % 10));
    const caught = cmp(bent);
    // READING: Amendment 4 adds no control for L3(f); L3's registered controls 1-4 ran in Phase 1 (claims.json), and
    // L3(f) is read as void if any of them passed there
    const controlsP1 = PY_L3.control, controlsFailed = Object.values(controlsP1).every(x => x > 0);
    const failures = (shaEqual ? 0 : 1) + differ.length;
    return {
        decision: exactDecision(failures, controlsFailed),
        rule: 'supported if the canonical point list has the SHA-256 claims.json records and the 2,000 sampled lines equal l3f-python.txt line for line; refuted by any difference; void if a control of L3 passed (Phase 1)',
        forest: pos, nodes: N,
        canonical_point_list: { node_sha256: canon.sha256, python_sha256: rep.canonical_point_list_sha256, equal: shaEqual, bytes: canon.bytes, h3: 'decoder3d.js TreeEmbedding3D pointExact (t = 3/4)', h2: "lexicon_core.js's exact H^2 tree (D3, t = 11/13)" },
        sample: { lines: mine.length, equal: mine.length - differ.length, differing: differ.length, file: rel(fpath),
            counterexamples: differ.slice(0, KEEP).map(i => ({ line: i, python: pyLines[i], node: mine[i] })) },
        comparison_control: { what: 'one digit changed in one Node line must make exactly that line differ (reported; a check of the comparison, not a registered control)', caught: caught.length === 1 && caught[0] === j },
        phase1_controls: { source: rel(CLAIMS_PATH), counts: controlsP1, all_failed_as_required: controlsFailed, phase1_decision: PY_L3.decision },
        ms: { words: Math.round(msWords), h3_point_exact_and_h2_points_all: Math.round(msPoints), per_node: Math.round(msPoints / N * 1000) / 1000 },
        seconds: secs(t),
    };
}

// ================================================================== L4 (Amendment 4 items 5 and 6)
function l4Sets(wn) {
    const pos = DRY ? 'verb' : 'noun', F = LC.forestOf(wn, pos), N = F.offsets.length;
    const anc = LC.closure(wn.synsets[pos]), desc = LC.descendants(anc);
    let smallOffs, smallName, bigName, bigQ, smallNote;
    if (DRY) {
        // run_claims.py's READING: the stand-in for the mammals is the spanning subtree of the verb root with the most
        // descendants, ties to the smallest offset
        const subtree = r => { const out = [], st = [r]; while (st.length) { const o = st.pop(); out.push(o); st.push(...(F.children.get(o) || [])); } return out; };
        let best = null, bestSize = -1;
        for (const r of F.roots) { const n = subtree(r).length; if (n > bestSize) { best = r; bestSize = n; } }   // roots sorted: the first of the largest
        smallOffs = subtree(best).sort();
        smallName = 'verbs-subtree'; bigName = 'verbs';
        smallNote = `the spanning subtree of ${best} (${wn.synsets.verb.get(best).lemmas.join(', ')})`;
        bigQ = new HP.Rng(1000 + OFF).sample(N, 200);
    } else {
        // the mammal spanning subtree: every noun whose spanning-parent chain reaches mammal.n.01, checked against the pin
        const reaches = o => { while (o !== null && o !== undefined) { if (o === LC.MAMMAL) return true; o = F.parent.get(o); } return false; };
        smallOffs = F.offsets.filter(reaches);
        const m = readJson(path.join(REF, 'golden', 'wordnet_v1.meta.json')).mammal;
        if (smallOffs.length !== m.spanningNodes || W.sha256(smallOffs.join('\n')) !== m.spanningSha256) refuse('the mammal spanning subtree does not match golden/wordnet_v1.meta.json');
        smallName = 'mammals'; bigName = 'nouns'; smallNote = 'the mammal spanning subtree (golden/wordnet_v1.meta.json mammal.spanningSha256)';
        bigQ = new HP.Rng(1000).sample(N, 1000);
    }
    const mk = (name, offs, queries, note) => ({ name, offsets: offs, words: offs.map(o => F.wordOf.get(o)), queries, note,
        nb: [LC.graphNeighbours(offs, F.parent, F.children), LC.closureNeighbours(offs, anc, desc)] });
    const small = mk(smallName, smallOffs, smallOffs.map((_, i) => i), smallNote), big = mk(bigName, F.offsets, bigQ, `the ${pos} forest`);
    for (const S of [small, big]) {
        const p = PY4.sets[S.name];
        if (!p || p.nodes !== S.offsets.length || p.queries !== S.queries.length) refuse(`L4 set ${S.name}: ${S.offsets.length} nodes and ${S.queries.length} queries here, not Python's`);
    }
    return { small, big };
}
// L4(a) for one set and tree in Node: the rank lists and the exact summary (run_claims.py's p2_l4a)
function l4aRun(S, arm, queries) {
    const t = performance.now(), rs = queries.map(u => LC.rankQuery(arm, u, S.nb, S.offsets, 'sha'));
    const shas = rs.map(r => r.sha), g = rs.map(r => r.ap[0]), c = rs.map(r => r.ap[1]);
    return { rs, summary: { queries: rs.length, candidates_per_query: arm.n - 1, rank_list_sha256: shas, rank_lists_digest: LC.listDigest(shas),
        graph_map: qText(LC.mapExact(g)), closure_map: qText(LC.mapExact(c)),
        graph_mean_rank: qText(LC.meanRank(rs.map(r => r.ranks[0]))), closure_mean_rank: qText(LC.meanRank(rs.map(r => r.ranks[1]))),
        graph_ap_list_digest: LC.listDigest(g.map(LC.qOrDash)), closure_ap_list_digest: LC.listDigest(c.map(LC.qOrDash)),
        queries_without_graph_neighbours: g.filter(a => a === null).length, queries_without_closure_neighbours: c.filter(a => a === null).length }, ms: performance.now() - t };
}
// one engine's L4(a) summary against Python's: every rank list's SHA-256, the exact MAPs and mean ranks
const EXACT = ['graph_map', 'closure_map', 'graph_mean_rank', 'closure_mean_rank'];
function l4aCompare(py, js, S, ms) {
    const n = Math.max(py.rank_list_sha256.length, js.rank_list_sha256.length), differ = [];
    for (let k = 0; k < n; k++) if (py.rank_list_sha256[k] !== js.rank_list_sha256[k]) differ.push(k);
    const exact = Object.fromEntries(EXACT.map(f => [f, { python: py[f].exact, js: js[f], equal: py[f].exact === js[f] }]));
    const exactEqual = EXACT.every(f => exact[f].equal);
    return { queries: js.rank_list_sha256.length, python_queries: py.queries, differing_rank_lists: differ.length,
        rank_lists_digest: js.rank_lists_digest, python_rank_lists_digest: py.rank_lists_digest,
        first_differing: differ.slice(0, KEEP).map(k => ({ query_index: k, query: S.offsets[S.queries[k]], python: py.rank_list_sha256[k] ?? null, js: js.rank_list_sha256[k] ?? null })),
        exact, exact_values_equal: exactEqual,
        ap_list_digests_equal: py.graph_ap_list_digest === js.graph_ap_list_digest && py.closure_ap_list_digest === js.closure_ap_list_digest,
        queries_without_neighbours: js.queries_without_graph_neighbours === null ? null : { graph: js.queries_without_graph_neighbours, closure: js.queries_without_closure_neighbours,
            equal: js.queries_without_graph_neighbours === py.queries_without_graph_neighbours && js.queries_without_closure_neighbours === py.queries_without_closure_neighbours },
        failures: differ.length + EXACT.filter(f => !exact[f].equal).length + (js.rank_list_sha256.length === py.queries ? 0 : 1),
        seconds: Math.round(ms / 100) / 10 };
}
// L4(b)'s counts for one set and tree (run_claims.py's p2_float), from lexicon_core.js's float keys
function floatRun(S, arm, queries, cols) {
    const t = performance.now(), fr = queries.map(u => LC.floatQuery(arm, u, cols)), WL = S.words, offs = S.offsets;
    const k = fr.findIndex(r => r.first);
    let first = null;
    if (k >= 0) {
        const r = fr[k], [pos, a, b, fa, fb] = r.first;
        first = { query_index: k, query: offs[r.query], query_word_length: WL[r.query].length, position_in_exact_order: pos, pair: [offs[a], offs[b]],
            word_lengths: [WL[a].length, WL[b].length], deeper_word_length: Math.max(WL[a].length, WL[b].length), float_keys: [String(fa), String(fb)] };
    }
    const deeper = fr.filter(r => r.first).map(r => Math.max(WL[r.first[1]].length, WL[r.first[2]].length)), hist = {};
    for (const x of deeper.sort((a, b) => a - b)) hist[x] = (hist[x] || 0) + 1;
    return { queries: fr.length, queries_with_inversion: fr.filter(r => r.inversions > 0).length, inversions: fr.reduce((s, r) => s + r.inversions, 0),
        float_ties_of_strictly_ordered_pairs: fr.reduce((s, r) => s + r.ties, 0), queries_with_float_ties: fr.filter(r => r.ties > 0).length,
        nonfinite_float_keys: fr.reduce((s, r) => s + r.nonfinite, 0), first_inversion: first,
        deeper_word_length_at_each_querys_first_inversion: { queries: deeper.length, min: deeper.length ? deeper[0] : null, max: deeper.length ? deeper[deeper.length - 1] : null, histogram: hist },
        seconds: secs(t), per_query_inversions: fr.map(r => r.inversions), per_query_float_ties: fr.map(r => r.ties) };
}
const pyFloat = s => (s === 'inf' ? Infinity : s === '-inf' ? -Infinity : s === 'nan' ? NaN : Number(s));
// Node's float counts beside Python's (reported): per query, the inversions and float ties
function floatAgreement(py, js) {
    const n = Math.min(py.per_query_inversions.length, js.per_query_inversions.length), diff = [];
    for (let k = 0; k < n; k++) if (py.per_query_inversions[k] !== js.per_query_inversions[k] || py.per_query_float_ties[k] !== js.per_query_float_ties[k]) diff.push(k);
    const fi = (a, b) => (!a && !b) || (!!a && !!b && a.query === b.query && a.position_in_exact_order === b.position_in_exact_order
        && a.pair.join() === b.pair.join() && a.float_keys.every((x, i) => Object.is(pyFloat(x), pyFloat(b.float_keys[i]))));
    return { queries_compared: n, queries_where_counts_differ: diff.length + Math.abs(py.per_query_inversions.length - js.per_query_inversions.length),
        first_differing: diff.slice(0, EXAMPLES).map(k => ({ query_index: k, python: [py.per_query_inversions[k], py.per_query_float_ties[k]], node: [js.per_query_inversions[k], js.per_query_float_ties[k]] })),
        totals_equal: ['queries_with_inversion', 'inversions', 'float_ties_of_strictly_ordered_pairs', 'nonfinite_float_keys'].every(f => py[f] === js[f]),
        first_inversion_equal: fi(py.first_inversion, js.first_inversion) };
}
const dropLists = x => { const { per_query_inversions, per_query_float_ties, rank_list_sha256, ...rest } = x; return rest; };   // eslint-disable-line no-unused-vars
function l4Node(sets) {
    const { small, big } = sets, t = performance.now(), out = { a: {}, b: { set: big.name, queries: big.queries.length, trees: {} }, controls: {} };
    const arms = {};
    let graphApSmall = null;
    for (const [S, queries] of [[small, small.queries], [big, big.queries.slice(0, L4A_BIG_QUERIES)]]) {
        out.a[S.name] = {};
        for (const tree of ['H3', 'H2']) {
            const ta = performance.now(), arm = arms[`${S.name}.${tree}`] = tree === 'H3' ? LC.h3Arm(S.words) : LC.h2Arm(S.words), msArm = performance.now() - ta;
            const r = l4aRun(S, arm, queries);
            out.a[S.name][tree] = { ...l4aCompare(PY4.a[S.name][tree], r.summary, S, r.ms), seconds_arm: Math.round(msArm / 100) / 10 };
            if (S === small && tree === 'H3') graphApSmall = new Map(r.rs.map(x => [x.query, x.ap[0]]));
            const c = out.a[S.name][tree];
            log(`   Node L4(a) ${S.name} ${tree}: ${c.differing_rank_lists}/${c.queries} differing rank lists, exact MAPs and mean ranks ${c.exact_values_equal ? 'equal' : 'DIFFERENT'} (${c.seconds} s)`);
        }
    }
    // (b): float64 over the large set's whole query sample, H3 and H2 (reported; Python decides)
    const withInv = new Set();
    for (const tree of ['H3', 'H2']) {
        const arm = arms[`${big.name}.${tree}`], js = floatRun(big, arm, big.queries, LC.floatCols(arm, 'float64')), py = PY4.b.trees[tree];
        js.per_query_inversions.forEach((x, k) => { if (x) withInv.add(k); });
        out.b.trees[tree] = { node: dropLists(js), agreement_with_python: floatAgreement(py, js) };
        log(`   Node L4(b) ${big.name} ${tree}: ${js.queries_with_inversion}/${js.queries} queries with an inversion (Python ${py.queries_with_inversion}), ${js.inversions} inversions (Python ${py.inversions}) (${js.seconds} s)`);
    }
    out.b.node_queries_with_an_inversion_in_H3_or_H2 = withInv.size;
    // control 1: float32, every query of the small set in H3; control 2: the acosh evaluator with index ties
    const armS = arms[`${small.name}.H3`];
    const c1 = floatRun(small, armS, small.queries, LC.floatCols(armS, 'float32'));
    out.controls['1'] = { node: dropLists(c1), agreement_with_python: floatAgreement(PY4.controls['1'], c1) };
    log(`   Node L4 control 1 (float32, ${small.name} H3): ${c1.queries_with_inversion}/${c1.queries} queries with an inversion (Python ${PY4.controls['1'].queries_with_inversion})`);
    const t2 = performance.now(), cols = LC.floatCols(armS, 'float64'), gnb = small.nb[0];
    let tied = 0, differ = 0;
    const examples = [];
    for (const u of small.queries) {
        if (!LC.exactTie(armS.keys(u), u, gnb[u])) continue;
        tied++;
        const fap = LC.acoshAp(u, gnb[u], LC.floatKeys(cols, u)), g = graphApSmall.get(u);
        if (!fap.eq(g)) { differ++; if (examples.length < EXAMPLES) examples.push({ query: small.offsets[u], exact_pessimistic_ap: frac(g), acosh_index_ap: frac(fap) }); }
    }
    const py2 = PY4.controls['2'];
    out.controls['2'] = { node: { queries: small.queries.length, queries_with_an_exact_tie: tied, queries_whose_ap_differs: differ, examples,
        status: tied === 0 ? 'N/A: no exact neighbour/non-neighbour tie' : differ ? 'shows its weakness' : 'passed: the test it controls is void', seconds: secs(t2) },
        agreement_with_python: { ties_equal: tied === py2.queries_with_an_exact_tie, differing_equal: differ === py2.queries_whose_ap_differs } };
    log(`   Node L4 control 2 (acosh, index ties): ${out.controls['2'].node.status}, ${differ}/${tied} tied queries differ (Python ${py2.queries_whose_ap_differs}/${py2.queries_with_an_exact_tie})`);
    out.seconds = secs(t);
    return out;
}

// ================================================================== 6. decisions and the report
const fix = (x, d) => (typeof x === 'number' ? x.toFixed(d) : String(x));   // json_safe writes nan as null
function writeReport(R) {
    fs.mkdirSync(RESULTS, { recursive: true });
    const stem = path.join(RESULTS, 'claims-phase2');
    fs.writeFileSync(stem + '.json', JSON.stringify(R, null, 1) + '\n');
    const C = R.claims, md = [];
    md.push(`# Hyperbolic Lexicon, Phase 2: the JavaScript engines against the reference${DRY ? ' (dry run)' : ''}`, '',
        `Run ${R.started} with ${R.preregistration} by \`reference/run_claims_js.cjs${DRY ? ' --dry' : ''}\`, against \`${R.inputs.phase2_python.file}\` (started ${R.inputs.phase2_python.started}). `
        + `Node ${R.environment.node.version} (ICU ${R.environment.node.icu}, Unicode ${R.environment.node.unicode}); `
        + (R.environment.chromium.version ? `Chromium ${R.environment.chromium.version} (Playwright ${R.environment.chromium.playwright}; newest Unicode marker assigned in the page: ${R.environment.chromium.newestMarkerAssigned}); ` : `Chromium not run (${R.environment.chromium.not_run}); `)
        + `Python ${R.environment.python.python} (unicodedata ${R.environment.python.python_unicodedata}). Parity first: ${R.parity.pass}/${R.parity.pass + R.parity.fail} lines of tests/parity-lexicon.cjs pass${R.parity.skip ? `, ${R.parity.skip} skipped` : ''}.`, '',
        '| Claim | Cell | Decision | What decided it |', '| --- | --- | --- | --- |');
    for (const [k, c] of Object.entries(C.L1.cells)) md.push(`| L1 | ${k} | ${c.decision} | ${c.summary} |`);
    md.push(`| L1 | all cells | ${C.L1.decision} | ${C.L1.summary} |`);
    md.push(`| L3(f) | ${C.L3f.forest} forest | ${C.L3f.decision} | canonical list ${C.L3f.canonical_point_list.equal ? 'equal' : 'DIFFERENT'} (${C.L3f.canonical_point_list.node_sha256.slice(0, 16)}…), ${C.L3f.sample.equal}/${C.L3f.sample.lines} sampled lines equal |`);
    md.push(`| L4(a) | Python and Node | ${C.L4a.decision} | ${C.L4a.summary} |`);
    md.push(`| L4(b) | the reference | ${C.L4b.decision} | ${C.L4b.summary} |`, '');
    md.push('## L1', '', '| Set | Vocab | Runtime | Instances | Differing | Record list | Id stream | Seconds (both vocabularies) |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const [s, sv] of Object.entries(C.L1.sets)) for (const [tag, cv] of Object.entries(sv.cells)) for (const rt of ['node', 'chromium']) {
        const x = cv[rt];
        if (!x) continue;
        md.push(`| ${s} | ${tag} | ${rt} | ${x.instances} | ${x.differing_instances} | \`${x.records_list_sha256.slice(0, 16)}…\` ${x.list_equal ? 'equal' : 'DIFFERENT'} | \`${x.id_stream.sha256.slice(0, 16)}…\` ${x.id_stream.equal ? 'equal' : 'DIFFERENT'} | ${x.seconds} |`);
    }
    md.push('', 'Control 1 (platform normaliser against the reference\'s R(s); must differ on at least one case): '
        + ['node', 'chromium'].map(rt => { const sets = C.L1.controls['1'][rt] || { not_run: 'no result' }; return `${rt}: ` + (sets.not_run ? 'not run' : Object.entries(sets).map(([s, x]) => `${s} ${x.platform_differs_from_reference}/${x.cases} (table list ${x.table_list_equal ? 'equal' : 'DIFFERENT'})`).join(', ')); }).join('; ') + '.');
    for (const n of ['2', '3']) md.push(`Control ${n} (the reference): shows its weakness ${JSON.stringify(C.L1.controls[n].shows_its_weakness)}.`);
    md.push('', 'Reported (from the reference): ' + Object.entries(C.L1.sets).map(([s, sv]) => Object.entries(sv.cells).map(([tag, cv]) =>
        `${s} ${tag}: fertility ${fix(cv.python_metrics.fertility, 4)}, [UNK] rate ${fix(cv.python_metrics.unkRate, 4)}, fail-closed ${cv.python_metrics.failClosed}, HF differs ${cv.hf_agreement ? `${cv.hf_agreement.instances_whose_tokens_differ}/${cv.hf_agreement.instances}` : 'not run'}`).join('; ')).join('; ') + '.', '');
    md.push('## L3(f)', '', `Words by lexicon_core.js's address rule, H³ by decoder3d.js pointExact, H² by the core's exact tree: ${C.L3f.nodes} nodes; canonical point list `
        + `\`${C.L3f.canonical_point_list.node_sha256}\` (Python \`${C.L3f.canonical_point_list.python_sha256}\`); sampled lines ${C.L3f.sample.equal}/${C.L3f.sample.lines} equal; `
        + `${C.L3f.ms.per_node} ms per node for both points; comparison control caught: ${C.L3f.comparison_control.caught}.`, '');
    md.push('## L4', '', '| Set | Tree | Engine | Queries | Differing rank lists | Graph MAP | Closure MAP | Graph mean rank | Closure mean rank | Seconds |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const [s, trees] of Object.entries(C.L4a.node)) for (const [tree, x] of Object.entries(trees)) {
        const py = PY4.a[s][tree];
        const cell = (f, d) => `${fix(py[f].float, d)} ${x.exact[f].equal ? '=' : '≠'}`;
        md.push(`| ${s} | ${tree} | node | ${x.queries} | ${x.differing_rank_lists} | ${cell('graph_map', 6)} | ${cell('closure_map', 6)} | ${cell('graph_mean_rank', 3)} | ${cell('closure_mean_rank', 3)} | ${x.seconds} |`);
    }
    if (C.L4a.chromium && C.L4a.chromium.trees) for (const [tree, x] of Object.entries(C.L4a.chromium.trees)) {
        const py = PY4.a[C.L4a.chromium.set][tree];
        const cell = (f, d) => `${fix(py[f].float, d)} ${x.exact[f].equal ? '=' : '≠'}`;
        md.push(`| ${C.L4a.chromium.set} | ${tree} | chromium (reported) | ${x.queries} | ${x.differing_rank_lists} | ${cell('graph_map', 6)} | ${cell('closure_map', 6)} | ${cell('graph_mean_rank', 3)} | ${cell('closure_mean_rank', 3)} | ${x.seconds} |`);
    }
    const b = C.L4b;
    md.push('', `(b) on ${b.python.set}, decided by the reference: ` + Object.entries(b.python.trees).map(([t, x]) => `${t} ${x.queries_with_inversion}/${x.queries} queries with an inversion`).join(', ')
        + `; ${b.python.queries_with_an_inversion_in_H3_or_H2} in H3 or H2: **${b.decision}**. Node (reported): `
        + Object.entries(b.node.trees).map(([t, x]) => `${t} ${x.node.queries_with_inversion}/${x.node.queries} (per-query counts differ from Python's on ${x.agreement_with_python.queries_where_counts_differ})`).join(', ') + '.',
    `Control 1 (float32): Python ${b.controls['1'].python.queries_with_inversion}/${b.controls['1'].python.queries}, Node ${b.controls['1'].node.queries_with_inversion}/${b.controls['1'].node.queries} queries with an inversion. `
        + `Control 2: Python ${b.controls['2'].python.status} (${b.controls['2'].python.queries_whose_ap_differs}/${b.controls['2'].python.queries_with_an_exact_tie}), Node ${b.controls['2'].node.status} (${b.controls['2'].node.queries_whose_ap_differs}/${b.controls['2'].node.queries_with_an_exact_tie}).`, '');
    md.push('## Timings (seconds)', '', Object.entries(R.timings).map(([k, v]) => `${k} ${v}`).join(', ') + '.', '',
        '## Full results', '', '`claims-phase2.json` (counterexamples, controls, environments). The runner\'s per-instance lists are in '
        + `\`~/.cache/hyperbolic-lexicon/${R.cache.dir}/js/\` (HL_CACHE overrides the root).`, '');
    fs.writeFileSync(stem + '.md', md.join('\n'));
    return stem;
}

async function main() {
    const timings = { parity_and_data: Math.round((PARITY.seconds + DATA.seconds) * 10) / 10 };
    // ---- L1
    log('2. L1: the instance lists and vocabularies ...');
    let t = performance.now();
    const sets = l1Sets(), { vocabs, skipped } = l1Vocabs();
    timings.l1_instance_lists = secs(t);
    log(`   ${sets.map(S => `${S.name} ${S.blobs.length} (${S.sha256.slice(0, 12)}…)`).join(', ')} equal Python's inputs; vocabularies ${vocabs.map(x => x.tag).join(', ')}${Object.keys(skipped).length ? `; skipped ${JSON.stringify(skipped)}` : ''}`);
    t = performance.now();
    const node1 = await l1Node(sets, vocabs);
    timings.l1_node = secs(t);
    // WordNet, L4's sets (the small one also goes to Chromium)
    t = performance.now();
    const wn = W.load();
    const l4sets = l4Sets(wn);
    timings.wordnet_and_l4_sets = secs(t);
    log('3. L1 in Chromium (and L4(a)\'s small set) ...');
    t = performance.now();
    const chrom = await l1Chromium(sets, vocabs, l4sets.small);
    timings.chromium = secs(t);
    if (chrom.not_run) log(`   NOT RUN: ${chrom.not_run}`);
    // ---- L3(f)
    log('4. L3(f) in Node ...');
    t = performance.now();
    const L3f = l3f(wn);
    timings.l3f = secs(t);
    log(`   canonical point list ${L3f.canonical_point_list.equal ? 'equal' : 'DIFFERENT'} (${L3f.canonical_point_list.node_sha256.slice(0, 16)}…); ${L3f.sample.equal}/${L3f.sample.lines} sampled lines equal: ${L3f.decision}`);
    // ---- L4
    log('5. L4 in Node ...');
    t = performance.now();
    const node4 = l4Node(l4sets);
    timings.l4_node = secs(t);

    // ---- decisions
    // L1, per vocabulary cell and runtime. READING: run_claims.py's exact_decision (void first): a cell is void when a
    // control passes (control 1 in that runtime; controls 2 and 3 from the reference, for that vocabulary), else
    // refuted by any differing instance or id stream in any set, else supported.
    const cells = {}, l1sets = {};
    for (const S of sets) {
        l1sets[S.name] = { instances: S.blobs.length, instances_sha256: S.sha256, python_instances_sha256: PY1.sets[S.name].instances_sha256, pinned: S.pinned,
            ...(S.files ? { files: S.files } : {}), cells: {} };
        for (const { tag } of vocabs) {
            const py = PY1.sets[S.name].cells[tag];
            l1sets[S.name].cells[tag] = { node: node1.sets[S.name][tag], ...(chrom.sets ? { chromium: chrom.sets[S.name][tag] } : {}),
                python_metrics: py.metrics, ...(py.hf_agreement ? { hf_agreement: py.hf_agreement } : {}) };
        }
    }
    const c2w = PY1.controls['2'].shows_its_weakness, c3w = PY1.controls['3'].shows_its_weakness;
    const c1w = rt => { const c = rt === 'node' ? node1.control1 : chrom.control1; return !!c && Object.keys(c).length > 0 && Object.values(c).some(x => x.platform_differs_from_reference > 0); };
    for (const tag of ['V0', 'V1']) for (const rt of ['node', 'chromium']) {
        const key = `${tag} ${rt === 'node' ? 'Node' : 'Chromium'}`;
        if (skipped[tag]) { cells[key] = { decision: 'skipped', summary: skipped[tag] }; continue; }
        if (rt === 'chromium' && chrom.not_run) { cells[key] = { decision: 'not run', summary: chrom.not_run }; continue; }
        const per = sets.map(S => l1sets[S.name].cells[tag][rt]);
        const differing = per.reduce((s, x) => s + x.differing_instances, 0), streams = per.filter(x => !x.id_stream.equal).length;
        const controls = { 1: c1w(rt), 2: !!c2w[tag], 3: !!c3w[tag] };
        const ok = Object.values(controls).every(Boolean);
        const decision = exactDecision(differing + streams, ok);
        cells[key] = { decision, differing_instances: differing, id_streams_differing: streams, instances: per.reduce((s, x) => s + x.instances, 0),
            controls_show_their_weakness: controls,
            summary: `${differing} of ${per.reduce((s, x) => s + x.instances, 0)} instances differ, ${streams} id streams differ; controls 1/2/3 show their weakness: ${controls[1]}/${controls[2]}/${controls[3]}` };
    }
    // READING: a cell that could not run (Chromium unavailable) is 'not run', and L1 as a whole is then inconclusive
    // (run_claims.py's combine): the claim names both runtimes. A skipped V1 cell (not cached; a dry run only, the
    // decisive run refuses) counts the same way: the cells are V0 and V1 (Amendment 4 item 2), and V1's are in force.
    const runCells = Object.values(cells).filter(c => c.decision !== 'skipped' && c.decision !== 'not run');
    const l1Decision = combine(...Object.values(cells).map(c => (c.decision === 'skipped' ? 'not run' : c.decision)));
    // L4(a): all-or-nothing over both sets and both trees. READING: run_claims.py's READING 9 — L4's control 2 names
    // no part, so a passing control 2 (ties present, no AP differs) voids (a) as well as (b); control 1 is (b)'s alone.
    const l4aFail = Object.values(node4.a).flatMap(tr => Object.values(tr)).reduce((s, x) => s + x.failures, 0);
    const c2passed = String(PY4.controls['2'].status).startsWith('passed');
    const l4aDecision = exactDecision(l4aFail, !c2passed);
    const R = {
        preregistration: 'PREREGISTRATION.md with Amendments 1-4', phase: 2, engine: 'node and chromium (lexicon_core.js) against the python reference',
        dry: DRY, started: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        environment: {
            node: { version: process.version, v8: process.versions.v8, icu: process.versions.icu, unicode: process.versions.unicode, cldr: process.versions.cldr,
                platform: `${os.platform()} ${os.release()} ${os.arch()}`, core: LC.version, unicode_behaviour: unicodeProbe() },
            chromium: chrom.not_run ? { not_run: chrom.not_run } : chrom.environment,
            python: PY.environment, ...gitInfo(),
        },
        inputs: { phase2_python: { file: rel(PY_PATH), started: PY.started, sha256: nodeSha(fs.readFileSync(PY_PATH)) },
            phase1_claims: { file: rel(CLAIMS_PATH), sha256: nodeSha(fs.readFileSync(CLAIMS_PATH)) } },
        cache: { root: '~/.cache/hyperbolic-lexicon (HL_CACHE overrides)', dir: path.basename(P2_CACHE) },
        parity: PARITY, data: DATA,
        claims: {
            L1: { decision: l1Decision, summary: `${runCells.length} of ${Object.keys(cells).length} cells run; ${Object.entries(cells).map(([k, c]) => `${k} ${c.decision}`).join(', ')}`,
                rule: 'per vocabulary cell and runtime: supported if no instance differs (record SHA-256) and every id stream is equal, refuted by any difference, void if a control passes; all four cells combined as run_claims.py combines (a cell not run or skipped makes L1 inconclusive unless another is refuted or void)',
                cells, sets: l1sets,
                controls: { '1': { what: "S6's platform normaliser s.toLowerCase().normalize('NFD') minus \\p{Mn} against the reference's R(s) (Python's per-case SHA-256), per case; must differ on >= 1 case in each runtime",
                    node: node1.control1, chromium: chrom.not_run ? { not_run: chrom.not_run } : chrom.control1 },
                '2': { what: PY1.controls['2'].what, shows_its_weakness: c2w, cells: PY1.controls['2'].cells },
                '3': { what: PY1.controls['3'].what, shows_its_weakness: c3w, cells: PY1.controls['3'].cells } },
                reference: { trace_check: PY1.trace_check, hugging_face: PY1.hugging_face, vocabularies: PY1.vocabularies },
                chromium_page_errors: chrom.page_errors || [] },
            L3f: L3f,
            L4a: { decision: l4aDecision, summary: `${l4aFail} failures (rank lists and exact values) over ${Object.keys(node4.a).join(' and ')}, H3 and H2; Python's control 2: ${PY4.controls['2'].status}`,
                rule: 'every rank list SHA-256 equal and the graph-edge and closure MAP and mean rank equal as exact rationals, both sets, H3 and H2 (Python and Node); Chromium on the small set is reported',
                node: node4.a, chromium: chrom.l4a || (chrom.not_run ? { not_run: chrom.not_run } : null) },
            L4b: { decision: PY4.b.decision, summary: `decided by the reference: ${PY4.b.queries_with_an_inversion_in_H3_or_H2}/${PY4.b.queries} queries with an inversion in H3 or H2; Node (reported) ${node4.b.node_queries_with_an_inversion_in_H3_or_H2}`,
                python: { set: PY4.b.set, queries: PY4.b.queries, queries_with_an_inversion_in_H3_or_H2: PY4.b.queries_with_an_inversion_in_H3_or_H2,
                    trees: Object.fromEntries(Object.entries(PY4.b.trees).map(([k, v]) => [k, dropLists(v)])) },
                node: node4.b,
                controls: { '1': { python: dropLists(PY4.controls['1']), node: node4.controls['1'].node, agreement: node4.controls['1'].agreement_with_python },
                    '2': { python: PY4.controls['2'], node: node4.controls['2'].node, agreement: node4.controls['2'].agreement_with_python } } },
        },
        timings: { ...timings, total: secs(T0) },
    };
    const stem = writeReport(R);
    log(`\nL1 ${l1Decision} (${R.claims.L1.summary}); L3(f) ${L3f.decision}; L4(a) ${l4aDecision}; L4(b) ${PY4.b.decision} (the reference)`);
    log(`wrote ${rel(stem)}.json and .md (${secs(T0)} s)`);
}

main().catch(e => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
