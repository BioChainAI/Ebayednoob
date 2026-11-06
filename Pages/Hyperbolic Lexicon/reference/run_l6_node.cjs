#!/usr/bin/env node
// Hyperbolic Lexicon, Phase 4: the Node re-evaluation of L6's measured snapped tables (PREREGISTRATION.md Amendment 10
// item 11, "The Node re-evaluation"; the Common rules, "Authority"). Reported, deciding nothing: L6 and L4(c) were
// decided by the Python reference in the decisive run (results/claims-phase4.json), and this run changes no decision.
// It is what the browser needs before it shows L6 or L4(c) as holding.
//
//   node "Pages/Hyperbolic Lexicon/reference/run_l6_node.cjs"       results/l6-node.json and .md (about 2 minutes)
//
// It reads, and never writes: lexicon_core.js (used unchanged), results/claims-phase4.json, results/l6-tables/ (the
// committed snapped texts), traces/l6_v1.txt, the WordNet archive in the cache (golden/wordnet_v1.cjs), and the
// decisive run's per-query AP files in ~/.cache/hyperbolic-lexicon/phase4/registered/tables/ (HL_CACHE overrides the
// cache root), whose SHA-256s the committed record pins (each run's aps_sha). It writes results/l6-node.json and .md.
//
// What it does, in order (it refuses, writing nothing, when an input is not the registered one):
//   1. The traces first (A10.11: "after traces on Rng(8000 + i) toy tables"): lexicon_core.js's l6ParitySections
//      regenerates reference/traces/l6_v1.txt line for line; one failing line refuses the run. (tests/parity-lexicon.cjs
//      runs the same section with every other trace.)
//   2. The instance in Node: the closure set S of mammal.n.01 (01861778) from the archive, with lexicon_core.js's
//      closure and descendants (wordnet.py's twins), as embed.closure_set builds it: the root and every noun with it
//      among its hypernym + instance-hypernym ancestors, in offset order. n, the closure edges inside S and the SHA-256
//      of the LF-joined offsets are checked against the record and golden/wordnet_v1.meta.json. The closure neighbours
//      (closureNeighbours) and graph-edge neighbours (graphNeighbours over the full noun spanning forest), A10.2.
//   3. The exact arm: results/l6-tables/exact-h3.snap.txt.gz (the canonical H^3 lines of Amendment 1 item 6 for S),
//      its SHA-256 against the record's snap_sha, its text against this core's own lines (decoder3d.js pointExact on
//      the core's L3 words of S); its rationals over one common denominator as a lexicon_core.js Arm ('lorentz'),
//      ranked by evaluateSnapped (pessimistic ties).
//   4. The 50 measured tables (A10.8: every cell with a frozen lr, seeds 0-4): results/l6-tables/learned-<g>-d<d>-s<s>
//      .snap.txt.gz, its SHA-256 against the run's snap_sha and its LBENCH/1 snapSha, parsed by parseSnapText (offsets
//      must be S's, d the run's), ranked exactly by SnapArm (Lorentz kappa_u(v) by BigInt cross-multiplication;
//      Euclidean |n_u - n_v|^2) and evaluateSnapped, all 1,182 queries against the other 1,181.
//   5. Per table, against the record: the exact closure and graph-edge MAPs as p/q in lowest terms (compared as text;
//      the JSON keeps each text's SHA-256, the p/q itself only where they differ), the two LBENCH/1 MAP hashes (A10.12:
//      "a track that holds a snapped table must reproduce its two MAP hashes") and its six-decimal MAPs, the pooled
//      mean ranks, the exact tie count, and the per-query APs. For the exact arm the record gives each metric's AP-list
//      SHA-256 (the APs as p/q, '-' for none, LF-joined), which Node's must equal. For a measured run the record gives
//      aps_sha, the SHA-256 of the run's .aps.json in the cache: JSON {closure, graph, frac_closure, frac_graph}, the
//      last two being the fractional-tie APs of A10.11, which lexicon_core.js does not compute. READING: that file is
//      read only when its SHA-256 is the record's; Node's closure and graph APs are compared with it query by query,
//      and the file's text is rebuilt from Node's two lists and the file's two fractional lists, whose SHA-256 must be
//      aps_sha again. Node's own AP-list SHA-256s (as the exact arm's) are written for every table.
//   6. results/l6-node.json and .md: Node's version, lexicon_core.js's version and SHA-256, the commit, the inputs'
//      SHA-256s, every table's comparison and the totals. Every difference is listed, none is dropped.
// Exits 1 when it refuses; 0 when the results are written, whatever they show.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const T0 = performance.now();
const REF = __dirname;
const SYS = path.resolve(REF, '..');
const ROOT = path.resolve(SYS, '..', '..');
const CORE_PATH = path.join(SYS, 'lexicon_core.js');
const LC = require(CORE_PATH);
const W = require('./golden/wordnet_v1.cjs');

const RESULTS = path.join(REF, 'results');
const TABLES = path.join(RESULTS, 'l6-tables');
const RECORD_PATH = path.join(RESULTS, 'claims-phase4.json');
const TRACE_PATH = path.join(REF, 'traces', 'l6_v1.txt');
const LBENCH_PATH = path.join(RESULTS, 'lbench-phase4.txt');
const CACHE = process.env.HL_CACHE || path.join(os.homedir(), '.cache', 'hyperbolic-lexicon');
const APS_DIR = path.join(CACHE, 'phase4', 'registered', 'tables');
const OUT = path.join(RESULTS, 'l6-node');
const KEEP = 5;                                // differing queries kept per table and metric

const log = msg => console.log(msg);
const rel = p => path.relative(ROOT, p);
const relRef = p => path.relative(REF, p);    // file names in the results, as claims-phase4.json writes them
const tilde = p => (p.startsWith(os.homedir() + path.sep) ? '~' + p.slice(os.homedir().length) : p);
const secs = t => Math.round((performance.now() - t) / 10) / 100;
const nodeSha = b => crypto.createHash('sha256').update(typeof b === 'string' ? Buffer.from(b, 'utf8') : b).digest('hex');   // files only
function refuse(msg) { console.error(`REFUSED: ${msg}`); process.exit(1); }
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const PREREG_LABEL = (() => {
    const n = [...fs.readFileSync(path.join(SYS, 'PREREGISTRATION.md'), 'utf8').matchAll(/^### Amendment (\d+) /gm)].map(m => +m[1]);
    return n.length ? `PREREGISTRATION.md with Amendments 1-${Math.max(...n)}` : 'PREREGISTRATION.md';
})();
const git = args => { const r = spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.replace(/\s+$/, '') : null; };
const relSys = p => path.relative(ROOT, path.join(SYS, p));
// the LBENCH/1 fields of A10.12, by name
const LBENCH_FIELDS = ['kind', 'protocol', 'instanceId', 'instanceSha', 'arm', 'geometry', 'd', 'seed', 'lr', 'protocolSha', 'settingsSha', 'budget',
    'floatTableSha', 'snapBits', 'snapSha', 'closureMapSha', 'graphMapSha', 'closureMap', 'graphMap', 'track', 'engine', 'wallMs'];
function lbenchFields(s) {
    const f = s.split('|');
    if (f.length !== LBENCH_FIELDS.length || f[0] !== 'LBENCH/1') refuse(`not an LBENCH/1 record: ${s.slice(0, 80)}`);
    return Object.fromEntries(LBENCH_FIELDS.map((k, i) => [k, f[i]]));
}
const sixDecimals = q => q.toNumber().toFixed(6);    // format(float(MAP), '.6f'): Q.toNumber is correctly rounded
const apsDigest = aps => LC.sha256Hex(LC.textBytes(aps.map(LC.qOrDash).join('\n')));   // run_claims_phase4.py's exact_arm aps_sha
const apStr = a => (a === null || a === undefined ? null : LC.qOrDash(a));

// ================================================================== 0. inputs and the state of the repository
const STARTED = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
const CORE_BYTES = fs.readFileSync(CORE_PATH);
const RECORD_BYTES = fs.readFileSync(RECORD_PATH);
const R4 = JSON.parse(RECORD_BYTES.toString('utf8'));
if (R4.mode !== 'registered' || R4.step !== 'measure') refuse(`${rel(RECORD_PATH)} is mode ${R4.mode}, step ${R4.step}: not the decisive run`);
const META = readJson(path.join(REF, 'golden', 'wordnet_v1.meta.json')).mammal;
const INST = R4.instance;
if (INST.root !== LC.MAMMAL || INST.n !== META.closureNodes || INST.E !== META.closureEdges || INST.instance_sha !== META.closureSha256)
    refuse(`the record's instance (${INST.root}, n ${INST.n}, E ${INST.E}, ${INST.instance_sha.slice(0, 12)}…) is not golden/wordnet_v1.meta.json's mammal closure set`);
const WATCH = ['lexicon_core.js', 'reference/run_l6_node.cjs', 'reference/results/claims-phase4.json', 'reference/results/l6-tables', 'reference/traces/l6_v1.txt',
    'reference/golden/wordnet_v1.cjs', 'reference/golden/wordnet_v1.meta.json'];
const GIT = (() => {
    const st = git(['status', '--porcelain', '--', ...WATCH.map(relSys)]), paths = st ? st.split('\n').filter(Boolean) : [];
    const coreAtHead = git(['rev-parse', `HEAD:${relSys('lexicon_core.js')}`]), coreHere = git(['hash-object', CORE_PATH]);
    return { head: git(['rev-parse', 'HEAD']), record_head: R4.head, uncommitted_inputs: paths, lexicon_core_js_as_committed: !!coreAtHead && coreAtHead === coreHere,
        lexicon_core_js_git_blob: coreHere };
})();
log(`Phase 4, the Node re-evaluation (A10.11, reported, deciding nothing): ${rel(RECORD_PATH)} (run at ${R4.head.slice(0, 7)})`);
log(`   Node ${process.version}; lexicon_core.js ${LC.version}, SHA-256 ${nodeSha(CORE_BYTES).slice(0, 16)}… (${GIT.lexicon_core_js_as_committed ? 'as committed at HEAD' : 'DIFFERS FROM HEAD'}); repository ${GIT.head ? GIT.head.slice(0, 7) : '?'}`
    + (GIT.uncommitted_inputs.length ? `; uncommitted: ${GIT.uncommitted_inputs.join('; ')}` : ''));

// ================================================================== 1. the traces first
log('1. the L6 trace (reference/traces/l6_v1.txt, Rng(8000 + i) toy tables) in lexicon_core.js ...');
let t = performance.now();
const TRACE_BYTES = fs.readFileSync(TRACE_PATH);
const traceLines = LC.l6ParitySections({ l6: TRACE_BYTES.toString('utf8') })[0].run();
const traceFail = traceLines.filter(l => !l.ok);
const TRACE = { file: relRef(TRACE_PATH), sha256: nodeSha(TRACE_BYTES), lines: traceLines.length, pass: traceLines.length - traceFail.length, fail: traceFail.length,
    how: 'lexicon_core.js l6ParitySections: l6TraceLines regenerates every line from Rng(8000 + i), header included, and each is compared with the file', seconds: secs(t) };
if (traceFail.length) refuse(`the L6 trace fails ${traceFail.length} of ${traceLines.length} lines: ${traceFail.slice(0, 5).map(l => `${l.label}: ${l.detail}`).join('; ')}`);
log(`   ${TRACE.pass}/${TRACE.lines} lines pass (${TRACE.seconds} s)`);

// ================================================================== 2. the instance in Node
log('2. the mammal closure set S from the WordNet archive ...');
t = performance.now();
const wn = W.load();
const nouns = wn.synsets.noun, anc = LC.closure(nouns), desc = LC.descendants(anc);
const S = [LC.MAMMAL, ...[...anc].filter(([, a]) => a.has(LC.MAMMAL)).map(([o]) => o)].sort();
const index = new Map(S.map((o, i) => [o, i]));
const closureEdges = S.reduce((s, o) => s + [...anc.get(o)].filter(a => index.has(a)).length, 0);
const sSha = LC.sha256Hex(LC.textBytes(S.join('\n')));
if (S.length !== INST.n || closureEdges !== INST.E || sSha !== INST.instance_sha)
    refuse(`S in Node has ${S.length} nodes, ${closureEdges} closure edges, SHA-256 ${sSha}: not the record's ${INST.n}, ${INST.E}, ${INST.instance_sha}`);
const F = LC.spanningForest(nouns);
const NB = { closure: LC.closureNeighbours(S, anc, desc), graph: LC.graphNeighbours(S, F.parent, F.children) };
const graphless = S.filter((_, i) => !NB.graph[i].length), closureless = S.filter((_, i) => !NB.closure[i].length);
if (graphless.join() !== INST.graphless_offsets.join() || closureless.length !== INST.queries_without_closure_neighbours)
    refuse(`queries without graph-edge neighbours ${graphless.join(', ')} (record ${INST.graphless_offsets.join(', ')}), without closure neighbours ${closureless.length}`);
const WORDS = LC.nounWords(wn);
const INSTANCE = { root: LC.MAMMAL, n: S.length, closure_edges: closureEdges, instance_sha: sSha, equals_record: true, equals_golden_meta: true,
    closure_neighbour_pairs: NB.closure.reduce((s, x) => s + x.length, 0), graph_neighbour_pairs: NB.graph.reduce((s, x) => s + x.length, 0),
    queries_without_graph_neighbours: graphless, wordnet_zip_sha256: W.ZIP_SHA256 || null,
    how: 'lexicon_core.js closure, descendants, spanningForest, closureNeighbours, graphNeighbours, nounWords over golden/wordnet_v1.cjs load()', seconds: secs(t) };
log(`   n ${S.length}, ${closureEdges} closure edges, SHA-256 ${sSha.slice(0, 12)}… (the record's and the pin's); ${graphless.length} queries without graph-edge neighbours (${secs(t)} s)`);

// ================================================================== the comparison of one evaluated table with the record
function mapCmp(ev, name, py, lb) {
    const node = LC.mapText(ev.map[name]), pyText = py.maps[name].exact, out = {
        equal: node === pyText, float: ev.map[name].toNumber(), node_sha256: LC.mapSha(ev.map[name]), python_sha256: LC.sha256Hex(LC.textBytes(pyText)),
        chars: node.length, lbench_sha256: lb[name === 'closure' ? 'closureMapSha' : 'graphMapSha'],
        lbench_six_decimals: { node: sixDecimals(ev.map[name]), lbench: lb[name === 'closure' ? 'closureMap' : 'graphMap'] } };
    out.lbench_sha_equal = out.node_sha256 === out.lbench_sha256;
    out.lbench_six_decimals.equal = out.lbench_six_decimals.node === out.lbench_six_decimals.lbench;
    if (!out.equal) { out.node_exact = node; out.python_exact = pyText; }
    return out;
}
function meanRankCmp(ev, py) {
    return Object.fromEntries(['closure', 'graph'].map(k => {
        const node = LC.qOrDash(ev.meanRank[k]), p = py.mean_rank[k].exact;
        return [k, { node, python: p, equal: node === p }];
    }));
}
// the per-query APs against a list of the record's (strings 'p/q' or null), query by query
function apListCmp(nodeAps, pyAps) {
    const nodeS = nodeAps.map(apStr), differ = [];
    const n = Math.max(nodeS.length, pyAps.length);
    for (let i = 0; i < n; i++) if (nodeS[i] !== (pyAps[i] === undefined ? undefined : pyAps[i])) differ.push(i);
    return { queries: nodeS.length, python_queries: pyAps.length, with_ap: nodeS.filter(x => x !== null).length, differing: differ.length,
        first_differing: differ.slice(0, KEEP).map(i => ({ offset: S[i], node: nodeS[i] ?? null, python: pyAps[i] ?? null })) };
}
function evaluate(arm) {
    const t1 = performance.now(), ev = LC.evaluateSnapped(arm, { closure: NB.closure, graph: NB.graph });
    return { ev, seconds: secs(t1) };
}

// ================================================================== 3. the exact arm
log('3. the exact arm (results/l6-tables/exact-h3.snap.txt.gz) ...');
t = performance.now();
const EX = R4.exact_arm;
const exactPath = path.join(TABLES, 'exact-h3.snap.txt.gz');
const exactGz = fs.readFileSync(exactPath), exactText = zlib.gunzipSync(exactGz).toString('utf8');
const exactLines = exactText.split('\n');
const exactSnapSha = LC.sha256Hex(LC.textBytes(exactText));
// this core's own canonical H^3 lines for S (Amendment 1 item 6; decoder3d.js pointExact on the L3 words)
const ownText = S.map(o => `${o} H3 ${LC.h3PointText(WORDS.get(o))}`).join('\n');
// the text's rationals over one common denominator (the least common multiple of the q's) as an Arm
const fracs = exactLines.map((ln, i) => {
    const f = ln.split(' ');
    if (f.length !== 6 || f[0] !== S[i] || f[1] !== 'H3') refuse(`line ${i + 1} of exact-h3.snap.txt is not 'offset H3 c0 c1 c2 c3' for ${S[i]}`);
    return f.slice(2).map(c => { const m = /^(-?\d+)\/(\d+)$/.exec(c); if (!m || BigInt(m[2]) < 1n) refuse(`not p/q: ${c}`); return [BigInt(m[1]), BigInt(m[2])]; });
});
if (fracs.length !== S.length) refuse(`exact-h3.snap.txt has ${fracs.length} lines for ${S.length} nodes`);
let D = 1n;
for (const row of fracs) for (const [, q] of row) D = D / LC.gcdB(D, q) * q;
const exactArm = new LC.Arm('exact-h3', 'lorentz', [0, 1, 2, 3].map(k => fracs.map(row => row[k][0] * (D / row[k][1]))), D);
const exEval = evaluate(exactArm), exLb = lbenchFields(EX.lbench);
const EXACT = {
    file: relRef(exactPath), gz_sha256: nodeSha(exactGz), lines: exactLines.length,
    snap_sha: { node: exactSnapSha, python: EX.snap_sha, lbench: exLb.snapSha, equal: exactSnapSha === EX.snap_sha && exactSnapSha === exLb.snapSha },
    text_equals_this_cores_lines: ownText === exactText,
    common_denominator: { bits: D.toString(2).length, is_power_of_7: (() => { let x = D; while (x % 7n === 0n) x /= 7n; return x === 1n; })() },
    maps: { closure: mapCmp(exEval.ev, 'closure', EX, exLb), graph: mapCmp(exEval.ev, 'graph', EX, exLb) },
    mean_rank: meanRankCmp(exEval.ev, EX),
    ties: { node: exEval.ev.ties, python: EX.ties.exact, equal: exEval.ev.ties === EX.ties.exact },
    aps: Object.fromEntries(['closure', 'graph'].map(k => {
        const node = apsDigest(exEval.ev.aps[k]);
        return [k, { node_sha256: node, python_sha256: EX.aps_sha[k], equal: node === EX.aps_sha[k], with_ap: exEval.ev.aps[k].filter(a => a !== null).length }];
    })),
    seconds: { evaluate: exEval.seconds, total: secs(t) },
};
EXACT.equal = EXACT.snap_sha.equal && EXACT.text_equals_this_cores_lines && ['closure', 'graph'].every(k => EXACT.maps[k].equal && EXACT.maps[k].lbench_sha_equal
    && EXACT.mean_rank[k].equal && EXACT.aps[k].equal) && EXACT.ties.equal;
log(`   closure MAP ${EXACT.maps.closure.float.toFixed(6)} ${EXACT.maps.closure.equal ? '=' : 'DIFFERS FROM'} the record, graph-edge ${EXACT.maps.graph.float.toFixed(6)} ${EXACT.maps.graph.equal ? '=' : 'DIFFERS'}; `
    + `AP lists ${EXACT.aps.closure.equal && EXACT.aps.graph.equal ? 'equal' : 'DIFFER'}; ties ${EXACT.ties.node}; text = this core's lines: ${EXACT.text_equals_this_cores_lines} (${EXACT.seconds.total} s)`);

// ================================================================== 4-5. the 50 measured tables
const LEARNED = R4.runs.filter(r => r.kind === 'learned');
if (LEARNED.length !== 50) refuse(`the record has ${LEARNED.length} measured runs, not 50`);
const LBENCH_LINES = new Set(fs.readFileSync(LBENCH_PATH, 'utf8').split('\n').filter(Boolean));
log(`4. the ${LEARNED.length} measured tables, ranked by SnapArm and evaluateSnapped ...`);
const TABLE_ROWS = [];
for (const run of LEARNED) {
    const t1 = performance.now();
    if (run.diverged_epoch !== null || !run.snap_sha) refuse(`${run.key} has no table (diverged at ${run.diverged_epoch})`);
    const name = `learned-${run.geometry}-d${run.d}-s${run.seed}`, file = path.join(TABLES, `${name}.snap.txt.gz`);
    if (!fs.existsSync(file)) refuse(`${rel(file)} is missing`);
    const gz = fs.readFileSync(file), text = zlib.gunzipSync(gz).toString('utf8'), lb = lbenchFields(run.lbench);
    const snapSha = LC.sha256Hex(LC.textBytes(text)), parsed = LC.parseSnapText(text);
    const offsetsEqual = parsed.offsets.length === S.length && parsed.offsets.every((o, i) => o === S[i]);
    if (!offsetsEqual || parsed.d !== run.d) refuse(`${rel(file)}: offsets ${offsetsEqual ? 'are' : 'are not'} S's, d ${parsed.d} (the run's ${run.d})`);
    const { ev, seconds } = evaluate(new LC.SnapArm(parsed.N, run.geometry, LC.SNAP_K));
    const row = {
        table: name, key: run.key, geometry: run.geometry, d: run.d, seed: run.seed, lr: run.lr, file: relRef(file), gz_sha256: nodeSha(gz),
        snap_sha: { node: snapSha, python: run.snap_sha, lbench: lb.snapSha, equal: snapSha === run.snap_sha && snapSha === lb.snapSha },
        lbench_record_in_file: LBENCH_LINES.has(run.lbench),
        maps: { closure: mapCmp(ev, 'closure', run, lb), graph: mapCmp(ev, 'graph', run, lb) },
        mean_rank: meanRankCmp(ev, run),
        ties: { node: ev.ties, python: run.ties.exact, equal: ev.ties === run.ties.exact },
        aps: { node_sha256: { closure: apsDigest(ev.aps.closure), graph: apsDigest(ev.aps.graph) } },
    };
    // the per-query APs against the run's own file, read only when its SHA-256 is the record's aps_sha
    const apsPath = path.join(APS_DIR, `${run.key}.aps.json`);
    if (!fs.existsSync(apsPath)) row.aps.compared = { available: false, reason: `${tilde(apsPath)} is not in the cache` };
    else {
        const bytes = fs.readFileSync(apsPath), sha = nodeSha(bytes);
        if (sha !== run.aps_sha) row.aps.compared = { available: false, reason: `${tilde(apsPath)} has SHA-256 ${sha}, not the record's aps_sha ${run.aps_sha}` };
        else {
            const py = JSON.parse(bytes.toString('utf8'));
            const keys = Object.keys(py).join(',');
            if (keys !== 'closure,graph,frac_closure,frac_graph') refuse(`${apsPath} holds ${keys}`);
            const rebuilt = JSON.stringify({ closure: ev.aps.closure.map(apStr), graph: ev.aps.graph.map(apStr), frac_closure: py.frac_closure, frac_graph: py.frac_graph });
            const rebuiltSha = nodeSha(rebuilt);
            row.aps.compared = { available: true, file_sha256: sha,
                closure: apListCmp(ev.aps.closure, py.closure), graph: apListCmp(ev.aps.graph, py.graph),
                python_sha256: { closure: LC.sha256Hex(LC.textBytes(py.closure.map(a => a ?? '-').join('\n'))), graph: LC.sha256Hex(LC.textBytes(py.graph.map(a => a ?? '-').join('\n'))) },
                aps_sha_rebuilt: { node: rebuiltSha, python: run.aps_sha, equal: rebuiltSha === run.aps_sha } };
            row.aps.compared.equal = row.aps.compared.closure.differing === 0 && row.aps.compared.graph.differing === 0 && row.aps.compared.aps_sha_rebuilt.equal
                && row.aps.compared.python_sha256.closure === row.aps.node_sha256.closure && row.aps.compared.python_sha256.graph === row.aps.node_sha256.graph;
        }
    }
    row.seconds = { evaluate: seconds, total: secs(t1) };
    row.equal = row.snap_sha.equal && ['closure', 'graph'].every(k => row.maps[k].equal && row.maps[k].lbench_sha_equal && row.mean_rank[k].equal)
        && row.ties.equal && row.aps.compared.available && row.aps.compared.equal;
    TABLE_ROWS.push(row);
    log(`   ${name.padEnd(24)} closure ${row.maps.closure.float.toFixed(6)} graph ${row.maps.graph.float.toFixed(6)}  MAPs ${row.maps.closure.equal && row.maps.graph.equal ? 'equal' : 'DIFFER'}, `
        + `APs ${row.aps.compared.available ? (row.aps.compared.equal ? 'equal' : 'DIFFER') : 'NOT COMPARED'}, ties ${row.ties.node}${row.equal ? '' : '  <-- DIFFERENCE'} (${row.seconds.total} s)`);
}

// ================================================================== totals and the differences, every one
const count = f => TABLE_ROWS.filter(f).length;
const TOTALS = {
    tables: TABLE_ROWS.length,
    snap_sha_equal: count(r => r.snap_sha.equal),
    closure_map_equal: count(r => r.maps.closure.equal), graph_map_equal: count(r => r.maps.graph.equal),
    lbench_map_hashes_equal: count(r => r.maps.closure.lbench_sha_equal && r.maps.graph.lbench_sha_equal),
    lbench_six_decimals_equal: count(r => r.maps.closure.lbench_six_decimals.equal && r.maps.graph.lbench_six_decimals.equal),
    mean_ranks_equal: count(r => r.mean_rank.closure.equal && r.mean_rank.graph.equal),
    ties_equal: count(r => r.ties.equal),
    per_query_aps_compared: count(r => r.aps.compared.available),
    per_query_aps_equal: count(r => r.aps.compared.available && r.aps.compared.equal),
    aps_sha_rebuilt_equal: count(r => r.aps.compared.available && r.aps.compared.aps_sha_rebuilt.equal),
    queries_compared: TABLE_ROWS.reduce((s, r) => s + (r.aps.compared.available ? r.aps.compared.closure.queries + r.aps.compared.graph.queries : 0), 0),
    queries_differing: TABLE_ROWS.reduce((s, r) => s + (r.aps.compared.available ? r.aps.compared.closure.differing + r.aps.compared.graph.differing : 0), 0),
    lbench_records_in_file: count(r => r.lbench_record_in_file),
    tables_equal: count(r => r.equal),
    exact_arm_equal: EXACT.equal,
};
const DIFFERENCES = [];
const noteDiff = (table, field, detail) => DIFFERENCES.push({ table, field, detail });
for (const [name, r] of [['exact-h3', EXACT], ...TABLE_ROWS.map(x => [x.table, x])]) {
    if (!r.snap_sha.equal) noteDiff(name, 'snap_sha', r.snap_sha);
    for (const k of ['closure', 'graph']) {
        if (!r.maps[k].equal) noteDiff(name, `${k} MAP`, { node: r.maps[k].node_exact, python: r.maps[k].python_exact });
        if (!r.maps[k].lbench_sha_equal) noteDiff(name, `LBENCH/1 ${k}MapSha`, { node: r.maps[k].node_sha256, lbench: r.maps[k].lbench_sha256 });
        if (!r.maps[k].lbench_six_decimals.equal) noteDiff(name, `LBENCH/1 ${k}Map`, r.maps[k].lbench_six_decimals);
        if (!r.mean_rank[k].equal) noteDiff(name, `${k} mean rank`, r.mean_rank[k]);
    }
    if (!r.ties.equal) noteDiff(name, 'ties', r.ties);
    if (name === 'exact-h3') {
        if (!r.text_equals_this_cores_lines) noteDiff(name, 'text', 'the committed lines differ from this core\'s pointExact lines');
        for (const k of ['closure', 'graph']) if (!r.aps[k].equal) noteDiff(name, `${k} AP list`, r.aps[k]);
    } else if (!r.aps.compared.available) noteDiff(name, 'per-query APs not compared', r.aps.compared.reason);
    else {
        for (const k of ['closure', 'graph']) if (r.aps.compared[k].differing) noteDiff(name, `${k} APs`, r.aps.compared[k]);
        if (!r.aps.compared.aps_sha_rebuilt.equal) noteDiff(name, 'aps_sha rebuilt', r.aps.compared.aps_sha_rebuilt);
    }
    if (name !== 'exact-h3' && !r.lbench_record_in_file) noteDiff(name, 'LBENCH/1 record', 'the run\'s record is not a line of results/lbench-phase4.txt');
}
TOTALS.differences = DIFFERENCES.length;

// ================================================================== 6. the files
const RUNTIME_S = secs(T0);
const R = {
    title: 'The Node re-evaluation of L6\'s measured snapped tables and the exact arm',
    status: 'reported, deciding nothing; A10.11',
    what: 'PREREGISTRATION.md Amendment 10 item 11 ("The Node re-evaluation"): after the decisive run, lexicon_core.js re-evaluates the 50 measured snapped tables, after traces on Rng(8000 + i) toy tables. It is reported, and it is needed before the browser shows L6 or L4(c) as holding (Common rules, "Authority"). L6 and L4(c) were decided by the Python reference; nothing here changes a decision.',
    preregistration: PREREG_LABEL,
    started: STARTED,
    runner: 'reference/run_l6_node.cjs',
    environment: {
        node: process.version, v8: process.versions.v8, platform: `${os.type()} ${os.release()} ${os.arch()}`, cpus: os.cpus().length,
        lexicon_core_js: { version: LC.version, sha256: nodeSha(CORE_BYTES), bytes: CORE_BYTES.length, git_blob: GIT.lexicon_core_js_git_blob,
            as_committed_at_head: GIT.lexicon_core_js_as_committed, used: 'unchanged: parseSnapText, SnapArm, Arm, evaluateSnapped, mapText, mapSha, closure, descendants, spanningForest, closureNeighbours, graphNeighbours, nounWords, h3PointText, l6ParitySections' },
        git_head: GIT.head, uncommitted_inputs: GIT.uncommitted_inputs,
    },
    inputs: {
        record: { file: relRef(RECORD_PATH), sha256: nodeSha(RECORD_BYTES), run_head: R4.head, label: R4.label, mode: R4.mode, step: R4.step },
        lbench: { file: relRef(LBENCH_PATH), sha256: nodeSha(fs.readFileSync(LBENCH_PATH)), lines: LBENCH_LINES.size },
        tables: relRef(TABLES),
        per_query_aps: `${tilde(APS_DIR)} (the decisive run's cache; each file read only when its SHA-256 is the record's aps_sha)`,
        wordnet: 'golden/wordnet_v1.cjs load() of the cached nltk_data wordnet.zip, its SHA-256 checked against the pin',
    },
    readings: [
        { id: 'node-1', text: 'The exact arm is ranked from its committed text (the canonical H^3 lines of Amendment 1 item 6 for S): each line\'s four rationals are brought to one common denominator, the least common multiple of their denominators, and ranked as a lexicon_core.js Arm of kind lorentz. Its keys are positive multiples of rank.py\'s over 7^Lmax, so the order and the ties are the same; the text is also checked against this core\'s own pointExact lines.' },
        { id: 'node-2', text: 'A measured run\'s aps_sha hashes its .aps.json in the cache, which also holds the fractional-tie APs (A10.11), a quantity lexicon_core.js does not compute. That file is read only when its SHA-256 is the committed aps_sha; Node\'s closure and graph-edge APs are compared with it query by query, and the file is rebuilt from Node\'s two lists and its own two fractional lists, which must give aps_sha again. Without the file, the table\'s per-query APs are counted as not compared, never as equal.' },
        { id: 'node-3', text: 'The exact MAPs are compared as their p/q texts in lowest terms. The JSON keeps each text\'s SHA-256 (as LBENCH/1\'s closureMapSha and graphMapSha), its length and its binary64 value, and the texts themselves only where Node and the record differ.' },
        { id: 'node-4', text: 'The Lorentz keys are lexicon_core.js\'s exact kappa classes (SnapArm.keys); the reference ranked by the integer floor(a 2^(4K) / b), another image of the same order (tests/parity-lexicon.cjs checks that both give the same classes). The tie count is candidates minus distinct keys, summed over queries, in both.' },
    ],
    trace: TRACE,
    instance: INSTANCE,
    exact_arm: EXACT,
    tables: TABLE_ROWS,
    totals: TOTALS,
    differences: DIFFERENCES,
    runtime_s: RUNTIME_S,
};
fs.writeFileSync(OUT + '.json', JSON.stringify(R, null, 1) + '\n');
fs.writeFileSync(OUT + '.md', report(R));
log(`\n${TOTALS.tables_equal}/${TOTALS.tables} measured tables equal the record in every compared field; the exact arm ${EXACT.equal ? 'equal' : 'DIFFERS'}; `
    + `${DIFFERENCES.length} difference(s)${DIFFERENCES.length ? ': ' + DIFFERENCES.map(x => `${x.table} ${x.field}`).join('; ') : ''}`);
log(`wrote ${rel(OUT)}.json and .md (${RUNTIME_S} s)`);
process.exit(0);

// ================================================================== the Markdown report
function report(R) {
    const T = R.totals, E = R.exact_arm, e = R.environment, md = [];
    const yes = b => (b ? 'yes' : '**NO**');
    const f6 = x => x.toFixed(6);
    md.push(`# Hyperbolic Lexicon, Phase 4: the Node re-evaluation of L6 (A10.11)`, '',
        '**Reported, deciding nothing; A10.11.** L6 and L4(c) were decided by the Python reference in the decisive run '
        + `(\`results/claims-phase4.json\`, run at ${R.inputs.record.run_head.slice(0, 7)}). This run ranks the committed snapped texts again in Node with `
        + '`lexicon_core.js`, unchanged, and compares every exact value with that record. It is the check the Common rules ("Authority") ask for before the '
        + 'browser shows L6 or L4(c) as holding.', '',
        `Run ${R.started} with ${R.preregistration} by \`reference/run_l6_node.cjs\`: Node ${e.node} (V8 ${e.v8}, ${e.platform}); `
        + `\`lexicon_core.js\` ${e.lexicon_core_js.version}, SHA-256 \`${e.lexicon_core_js.sha256}\` (${e.lexicon_core_js.as_committed_at_head ? 'as committed' : '**not as committed**'} at ${e.git_head ? e.git_head.slice(0, 7) : '?'}); `
        + `record SHA-256 \`${R.inputs.record.sha256.slice(0, 16)}…\`; ${R.runtime_s} s in all.`
        + (e.uncommitted_inputs.length ? ` Uncommitted when it ran (git status of this runner and its inputs): ${e.uncommitted_inputs.map(x => `\`${x}\``).join(', ')}.` : ' This runner and every input were as committed.'), '',
        '## Summary', '',
        '| What | Equal to the record |', '| --- | --- |',
        `| The L6 trace (\`traces/l6_v1.txt\`, \`Rng(8000 + i)\` toy tables), first | ${R.trace.pass}/${R.trace.lines} lines |`,
        `| The instance S in Node (n, closure edges, SHA-256 \`${R.instance.instance_sha.slice(0, 8)}…\`, the six queries without graph-edge neighbours) | yes |`,
        `| The exact arm: closure and graph-edge MAP (p/q), LBENCH/1 MAP hashes, mean ranks, ties, both AP lists, its text | ${yes(E.equal)} |`,
        `| Snapped text SHA-256 (record and LBENCH/1) | ${T.snap_sha_equal}/${T.tables} |`,
        `| Exact closure MAP (p/q) | ${T.closure_map_equal}/${T.tables} |`,
        `| Exact graph-edge MAP (p/q) | ${T.graph_map_equal}/${T.tables} |`,
        `| LBENCH/1 closureMapSha and graphMapSha (A10.12) | ${T.lbench_map_hashes_equal}/${T.tables} |`,
        `| LBENCH/1 six-decimal MAPs | ${T.lbench_six_decimals_equal}/${T.tables} |`,
        `| Pooled mean ranks, closure and graph-edge | ${T.mean_ranks_equal}/${T.tables} |`,
        `| Exact tie counts | ${T.ties_equal}/${T.tables} |`,
        `| Per-query APs (closure and graph-edge, query by query) | ${T.per_query_aps_equal}/${T.per_query_aps_compared} tables compared (of ${T.tables}); ${T.queries_differing} of ${T.queries_compared} query APs differ |`,
        `| The run's aps_sha rebuilt from Node's APs | ${T.aps_sha_rebuilt_equal}/${T.per_query_aps_compared} |`,
        `| **Tables equal in every field** | **${T.tables_equal}/${T.tables}**, and the exact arm ${E.equal ? 'too' : '**not**'} |`, '',
        R.differences.length ? `**Differences (${R.differences.length}), every one:**` : '**Differences: none.**', '');
    for (const d of R.differences) md.push(`- ${d.table}, ${d.field}: \`${JSON.stringify(d.detail).slice(0, 400)}\``);
    if (R.differences.length) md.push('');
    md.push('## How', '',
        `1. **The traces first.** \`lexicon_core.js\` \`l6ParitySections\` regenerated \`reference/traces/l6_v1.txt\` (SHA-256 \`${R.trace.sha256.slice(0, 16)}…\`) from its seeds: ${R.trace.pass}/${R.trace.lines} lines equal, in ${R.trace.seconds} s. A failing line would have refused the run.`,
        `2. **The instance.** S built in Node from the WordNet archive (the core's \`closure\`, \`descendants\`): ${R.instance.n} synsets, ${R.instance.closure_edges} closure edges, SHA-256 \`${R.instance.instance_sha}\`, equal to the record and to \`golden/wordnet_v1.meta.json\`. Closure neighbours: ${R.instance.closure_neighbour_pairs} (query, neighbour) pairs; graph-edge neighbours over the full noun spanning forest: ${R.instance.graph_neighbour_pairs}; no graph-edge neighbours: ${R.instance.queries_without_graph_neighbours.join(', ')} (left out of the graph-edge MAP, A10.2).`,
        '3. **Ranking.** Every table is parsed by `parseSnapText` (offsets S\'s, in order; d the run\'s) and ranked by `SnapArm` (Lorentz: κ_u(v) = |n_u − n_v|²/(4^32 − |n_v|²) by BigInt cross-multiplication; Euclidean: |n_u − n_v|²) and `evaluateSnapped`, every one of the 1,182 queries against the other 1,181, ties pessimistic. The exact arm is ranked from its committed lines as an `Arm` (READING node-1).',
        '4. **Comparison.** MAPs as p/q texts; the LBENCH/1 fields a track holding a snapped table must reproduce (A10.12); mean ranks; ties; per-query APs against the run\'s own AP file, read only when its SHA-256 is the committed `aps_sha` (READING node-2).', '');
    md.push('## The exact arm', '',
        `\`${E.file}\`: ${E.lines} lines, SHA-256 \`${E.snap_sha.node.slice(0, 16)}…\` (record ${E.snap_sha.equal ? 'equal' : '**different**'}); equal to this core's own \`pointExact\` lines: ${yes(E.text_equals_this_cores_lines)}; common denominator a power of 7: ${E.common_denominator.is_power_of_7} (${E.common_denominator.bits} bits).`, '',
        '| Metric | MAP (Node) | p/q equal | LBENCH/1 hash | Mean rank (Node) | Mean rank equal | AP list SHA-256 equal |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const k of ['closure', 'graph']) md.push(`| ${k === 'graph' ? 'graph-edge' : k} | ${f6(E.maps[k].float)} | ${yes(E.maps[k].equal)} | ${yes(E.maps[k].lbench_sha_equal)} | ${E.mean_rank[k].node} | ${yes(E.mean_rank[k].equal)} | ${yes(E.aps[k].equal)} |`);
    md.push('', `Exact ties: ${E.ties.node} (record ${E.ties.python}). ${E.seconds.total} s.`, '');
    md.push('## The 50 measured tables', '',
        '| Table | lr | Snap SHA-256 | Closure MAP | Graph-edge MAP | MAPs p/q equal | LBENCH/1 hashes | Mean ranks | Ties (Node / record) | Query APs differing (closure, graph) | aps_sha rebuilt | Seconds |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of R.tables) {
        const c = r.aps.compared;
        md.push(`| ${r.table} | ${r.lr} | \`${r.snap_sha.node.slice(0, 8)}…\` ${r.snap_sha.equal ? '=' : '**≠**'} | ${f6(r.maps.closure.float)} | ${f6(r.maps.graph.float)} | ${yes(r.maps.closure.equal && r.maps.graph.equal)} | `
            + `${yes(r.maps.closure.lbench_sha_equal && r.maps.graph.lbench_sha_equal)} | ${yes(r.mean_rank.closure.equal && r.mean_rank.graph.equal)} | ${r.ties.node} / ${r.ties.python} | `
            + `${c.available ? `${c.closure.differing} of ${c.closure.queries}, ${c.graph.differing} of ${c.graph.with_ap}` : '**not compared**'} | ${c.available ? yes(c.aps_sha_rebuilt.equal) : '—'} | ${r.seconds.total} |`);
    }
    md.push('', 'The graph-edge AP column counts the queries with an AP (1,176); the six without one are null in both lists and are compared as null.', '',
        '## Readings', '');
    for (const x of R.readings) md.push(`- **${x.id}.** ${x.text}`);
    md.push('', `Runtime: ${R.runtime_s} s (the instance ${R.instance.seconds} s; the exact arm ${E.seconds.total} s; the 50 tables ${Math.round(R.tables.reduce((s, r) => s + r.seconds.total, 0) * 100) / 100} s).`, '');
    return md.join('\n');
}
