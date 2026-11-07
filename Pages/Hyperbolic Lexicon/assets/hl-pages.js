// Hyperbolic Lexicon: the page engine (Phase 5), shared by lexicon-2d.html and lexicon-3d.html.
//
// It composes lexicon_core.js (loaded unchanged: N_B, WordPiece, the L3 rule, map A, the exact H^2 and H^3 trees, the
// codec, the chain section) with Hyperbolic Oracles' hyperbolic_core.js, decoder3d.js and twin3d.js and Engram Mind's
// Eye's engram_core.js, and adds what only a page needs: the named tree a page draws, bounded views of it, exact charts
// (an isometry computed in BigInt, floats only at the last step), lowest common ancestors and paths, decoding and
// precision readings, X(5, q) for display, the coupler on a BERT-style pair, a shard's grow-sign-verify flow and an
// Engram Mind's Eye import. It decides no claim. Nothing here reimplements the L3 rule or map A: the core's own
// nounWords, verbWords, forestOf and mapA run on "wn-lite", built from two data files:
//   data/wordnet_nouns_v1.js   every noun synset in offset order: offset, first lemma, L3 spanning parent
//   data/wordnet_map_a_v1.js   the verb forest, and the WordNet index entries of V0's entries
// both written by reference/golden/make_wordnet_view_v1.cjs (which parses its own output back with parseNouns,
// parseMapA and buildLite below, and checks what they give against the decisive runs' records before writing).
//
// API (Explainers 13 and 14 describe the pages that use it):
//   LexiconPages.version, PINS, ROOTS, parseNouns(text), parseMapA(text), buildLite(nouns, mapA), load({ onStep }),
//   ratio(n, d), toDisk(placed, spread), shard { TAMPERS, run, tamper }, engram { KEY, readLocal, importText,
//   importTurns }; a loaded Lex: node, parentKey, children, ancestors, edges, search, analyse, point, cosh, decode,
//   bits, float64Kept, ids, lca, path, view, chart, nearest, quaternion, rotation, lps, vertex, lpsBall, couple,
//   addrTable, verifyNouns.
// Additions beyond the Phase 5 spec's list (no signature there is changed): LexiconPages.placedOf(y) (a float
// hyperboloid point as { d, u, y }), dyadic(x) (a double as an exact BigInt times a power of two), pow2(k), STEPS,
// shard.SAMPLE (the panel's sample text), shard.CAP, shard.CAP_ENGRAMS, shard.webcrypto();
// decode(dim, w, { authority }) (false skips decodeExact, for bulk checks); addrTableAsync() (addrTable in yielding steps);
// Lex.ok, Lex.timings, Lex.label(keyOrNode), Lex.wordOf(keyOrWord), Lex.defaultCentre(analysis), Lex.mapA
// ({ words, report }), Lex.forest ({ noun, verb }: offsets, words), Lex.lite; Analysis.error (a lone surrogate is
// reported there, not thrown); decode(3, w).exactWord; path(...).lcpLetters and .treeLcp; vertex(...).trail (the
// walk's last three vertices); lpsBall(...).extra (non-tree edges inside the ball); View.nodes[].roles and
// View.edges[].hidden (named nodes an edge passes without drawing them); LCA.a and LCA.b (the two keys); Node.pos,
// .root and .piece; Token and EngramImport turn fields as documented at their functions. Chart.geodesic's endpoints are
// the exact placements; its interior samples are float points { d, u, y } (no R, D).
//
// Load order in a page: orbital_core.js, hyperbolic_core.js, decoder3d.js, twin3d.js, fence.js, ttmpt_core_v1.js,
// engram_core.js, biochain_v1.js, data/unicode_15_1_v1.js, data/vocab_v0_lex0.js, data/wordnet_nouns_v1.js,
// data/wordnet_map_a_v1.js, lexicon_core.js, this file. In Node: require('./assets/hl-pages.js') (it reads the data
// wrappers with require, and engram_core.js and biochain_v1.js on first use).
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        const path = require('path');
        const dataSource = name => {
            const p = path.join(__dirname, '..', 'data', name + '.js');
            try { return require(p)[name]; } catch (e) { if (e && e.code === 'MODULE_NOT_FOUND') return null; throw e; }
        };
        let engram = null;
        const engramSource = () => engram || (engram = { EC: require('../../Engram Minds Eye/engram_core.js'), BC: require('../../Engram Minds Eye/biochain_v1.js') });
        module.exports = factory(require('../lexicon_core.js'), require('../../Hyperbolic Oracles/hyperbolic_core.js'),
            require('../../Hyperbolic Oracles/decoder3d.js'), require('../../Hyperbolic Oracles/twin3d.js'), dataSource, engramSource);
    } else {
        root.LexiconPages = factory(root.LexiconCore, root.HPCore, root.HPDecode3D, root.HPTwin3D,
            name => { const d = root.LexiconData || {}; return typeof d[name] === 'string' ? d[name] : null; },
            () => ({ EC: root.EngramCore, BC: root.BiochainV1 }));
    }
})(typeof self !== 'undefined' ? self : this, function (LC, C, D3, T3, dataSource, engramSource) {
'use strict';
if (!LC || !C || !D3 || !T3) throw new Error('hl-pages.js needs lexicon_core.js, hyperbolic_core.js, decoder3d.js and twin3d.js first');
const { Q, P } = C;

// ================================================================== pins (each with its provenance)
const PINS = {
    // the two texts, as make_wordnet_view_v1.cjs prints them (it refuses to write unless the checks below hold)
    nounsText: { name: 'wordnet_nouns_v1', sha256: '46196fea15009e2ac2bc76f76388d9b749175347a6e038be9a6d2a7fb6319a01', bytes: 2138095, nodes: 82115 },
    mapAText: { name: 'wordnet_map_a_v1', sha256: '10f78a4c4ed3f5510710b9542c3b19d9a43f2c80dd174baa9824175043c05486', bytes: 465846, verbs: 13767, verbRoots: 559, index: 6296 },
    // SHA-256 of 'offset word' lines of the noun words (LC.wordsSha256), measured; it implies the L3 canonical point
    // list eb22bf00... (results/claims.json L3), which make_wordnet_view_v1.cjs recomputes before it writes
    nounWordsSha256: '80373c793ea62678f48be1c16e10fefd8df35dfcfb8bb415024de80bf6218c5f',
    // reference/traces/address_v1.txt, line 246 (verb_words_sha256)
    verbWordsSha256: 'ec39f99762d2814876ee1339664903308a7c36a0c47ba535e7279cec85e9c3d7',
    // results/claims-phase3.json claims.L8.d.global.laddr.python (field 4) and the whole string; its SHA-256 is
    // claims.L10.python_session.laddrHash, and LVOCAB/1's is claims.L10.python_session.lvocabHash
    addrTableRoot: '30b17bc3992d5bab98e8955bc215c03c5706e5847b2ed4a7c7b22f39635349e1',
    laddr: 'LADDR/1|df22705601de2e425cd090edc5df05619ce4a08df336f40bf92a1ed59f9ca1ff|cbda5ea6eef7f36a97a43d4a75f85e07fccbb4f23657d27b4ccbc93e2646ab59|L3/1|30b17bc3992d5bab98e8955bc215c03c5706e5847b2ed4a7c7b22f39635349e1|3/4|11/13|D3',
    laddrHash: '83f09be9c4de55b74aba7d0eea47fc29d9217fae06231ca8dd0fba239e760904',
    lvocabHash: '55962675fc6953c82d2ddd1d239f6879faba8f9bedd8128b5fe53054ac1f3c56',
    // results/claims.json claims.L3.reported.canonical_point_list_sha256; 29,442,565 bytes (lexicon_core.js measured)
    canonicalPointList: { sha256: 'eb22bf00689ec86da05f0f4ba6338abc0ba0a1549ada844a134cbce154a3ebc6', bytes: 29442565, nouns: 82115 },
    // map A of V0 on the full archive (LC.mapA), measured; equal on wn-lite (make_wordnet_view_v1.cjs checks it)
    mapAReport: { per_root: { 0: 2493, 1: 537, 2: 1103, 3: 1982, 4: 1962, 5: 115 }, shared_addresses: 161, entries_sharing: 338, max_len: 49 },
    // results/claims.json claims.L7.reported.per_q: structure.iota, structure.vertices, structure.diameter, girth, r
    lps: { 13: { iota: 5, n: 2184, diameter: 7, girth: 8, r: 3 }, 17: { iota: 4, n: 4896, diameter: 9, girth: 8, r: 3 },
        29: { iota: 12, n: 12180, diameter: 8, girth: 9, r: 4 } },
    // data/l6_view_v1.js, the JSON text's SHA-256 (Explainer 12)
    l6View: '38fc6aac0e52c3fd4d38ba54688774efc8077e7f417b138bdf1c310008780655',
    // the trace this engine reproduces line for line (reference/traces/pages_v1.txt; tests/pages-lexicon.cjs)
    trace: 'pages_v1',
};
const ROOTS = [
    { letter: 0, name: 'nouns: entity.n.01 and its tree', short: 'noun' },
    { letter: 1, name: 'verbs (virtual root)', short: 'verb' },
    { letter: 2, name: 'adjective and adverb lemmas, spelled', short: 'adj/adv' },
    { letter: 3, name: '## pieces, spelled', short: '##' },
    { letter: 4, name: 'other whole words, spelled', short: 'other' },
    { letter: 5, name: 'specials, digits and punctuation', short: 'special' },
];
const POS_OF = { n: 'noun', v: 'verb', a: 'adj', r: 'adv' };
const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
const later = () => new Promise(r => setTimeout(r, 0));

// ================================================================== exact helpers
const absB = a => (a < 0n ? -a : a);
const gcdB = LC.gcdB, bitLength = LC.bitLength;
function lowest(n, d) {                        // n/d in lowest terms, d > 0
    if (d < 0n) { n = -n; d = -d; }
    const g = gcdB(n, d) || 1n;
    return [n / g, d / g];
}
const sameWord = (a, b) => a.length === b.length && a.every((g, i) => g === b[i]);
const cmpWord = (a, b) => { const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i]; return a.length - b.length; };
const cmpBig = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const wordStr = LC.wordStr;
const lead = (a, b) => { let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++; return k; };

// 2^k as a double, exactly (0 below 2^-1074, Infinity above 2^1023)
function pow2(k) {
    if (k > 1023) return Infinity;
    if (k < -1074) return 0;
    if (k >= -1022) { const dv = new DataView(new ArrayBuffer(8)); dv.setUint32(0, (k + 1023) * 1048576); dv.setUint32(4, 0); return dv.getFloat64(0); }
    return pow2(-1022) * pow2(k + 1022);
}
// n/d correctly rounded to the nearest double, ties to even (Python's float(Fraction(n, d))); BigInt n, d > 0
function ratio(n, d) {
    n = BigInt(n); d = BigInt(d);
    if (d <= 0n) throw new RangeError('ratio needs d > 0');
    if (n === 0n) return 0;
    const neg = n < 0n, a = neg ? -n : n;
    let e = bitLength(a) - bitLength(d);       // 2^(e-1) < a/d < 2^(e+1)
    if (e >= 0 ? a < (d << BigInt(e)) : (a << BigInt(-e)) < d) e -= 1;   // now 2^e <= a/d < 2^(e+1)
    if (e > 1023) return neg ? -Infinity : Infinity;
    const lsb = Math.max(e - 52, -1074);
    let num = a, den = d;
    if (lsb >= 0) den <<= BigInt(lsb); else num <<= BigInt(-lsb);
    let q = num / den;
    const r2 = 2n * (num - q * den);
    if (r2 > den || (r2 === den && (q & 1n) === 1n)) q += 1n;
    const v = Number(q) * pow2(lsb);
    return neg ? -v : v;
}
// a finite double as [m, e] with x = m 2^e exactly, m odd (or 0)
function dyadic(x) {
    if (!Number.isFinite(x)) throw new RangeError('not a finite double');
    if (x === 0) return [0n, 0];
    const dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, x);
    const hi = dv.getUint32(0), lo = dv.getUint32(4), ex = (hi >>> 20) & 0x7FF;
    let m = (BigInt(hi & 0xFFFFF) << 32n) | BigInt(lo), e;
    if (ex === 0) e = -1074; else { m |= 1n << 52n; e = ex - 1075; }
    while ((m & 1n) === 0n) { m >>= 1n; e += 1; }
    return [hi >>> 31 ? -m : m, e];
}
const distOf = z => (z <= 1 ? 0 : z < 1e8 ? Math.acosh(z) : Math.log(2 * z));
// a direction from BigInt components: each scaled down by one power of two to at most 2^60, then normalised
function unitOf(R) {
    let b = 0;
    for (const x of R) b = Math.max(b, bitLength(x));
    const s = BigInt(Math.max(0, b - 60)), f = R.map(x => Number(x >> s)), n = Math.hypot(...f);
    return n > 0 ? f.map(x => x / n) : f.map(() => 0);
}
// a float hyperboloid point (cosh d, sinh d u) as { d, u, y }
function placedOf(y) {
    const z = y[0], s = y.slice(1), n = Math.hypot(...s);
    const d = n === 0 ? 0 : z < 1e8 ? Math.asinh(n) : Math.log(2 * z);
    return { d, u: n > 0 ? s.map(x => x / n) : s.map(() => 0), y };
}
// a placed point in the Poincare disk or ball: r = tanh(d / (2 spread)) along u
const toDisk = (placed, spread = 1) => { const r = Math.tanh(placed.d / (2 * spread)); return placed.u.map(x => r * x); };

// ================================================================== the data: parsers and wn-lite
const OFFSET = /^[0-9]{8}$/, INT = /^-?(?:0|[1-9][0-9]*)$/, PRINTABLE = /^[\x21-\x7e]+$/;
function bad(what, k, line) { return new Error(`${what} line ${k + 1}: ${JSON.stringify(line.slice(0, 80))}`); }
function forestCheck(F, what) {
    const n = F.offsets.length;
    for (let i = 0; i < n; i++) {
        if (i && !(F.offsets[i - 1] < F.offsets[i])) throw new Error(`${what}: offsets are not strictly increasing at ${F.offsets[i]}`);
        const p = F.parent[i];
        if (p < -1 || p >= n || p === i) throw new Error(`${what}: ${F.offsets[i]} has parent index ${p}`);
    }
    return F;
}
// "offset first_lemma parent" lines (comments start with '#'; '# nodes N' declares the count)
function parseNouns(text) {
    if (typeof text !== 'string') throw new TypeError('parseNouns takes the text');
    const offsets = [], lemmas = [], parents = [];
    let declared = null;
    const lines = text.split('\n');
    if (lines[lines.length - 1] !== '') throw new Error('the nouns text ends with LF');
    for (let k = 0; k < lines.length - 1; k++) {
        const line = lines[k];
        if (line[0] === '#') { const m = /^# nodes ([0-9]+)$/.exec(line); if (m) declared = Number(m[1]); continue; }
        const f = line.split(' ');
        if (f.length !== 3 || !OFFSET.test(f[0]) || !PRINTABLE.test(f[1]) || !INT.test(f[2])) throw bad('nouns', k, line);
        offsets.push(f[0]); lemmas.push(f[1]); parents.push(Number(f[2]));
    }
    if (declared === null || declared !== offsets.length) throw new Error(`the nouns text declares ${declared} nodes and has ${offsets.length}`);
    return forestCheck({ offsets, lemmas, parent: Int32Array.from(parents) }, 'nouns');
}
// "v offset first_lemma parent" and "i entry pos tagsense first_offset" lines
function parseMapA(text) {
    if (typeof text !== 'string') throw new TypeError('parseMapA takes the text');
    const offsets = [], lemmas = [], parents = [], index = [];
    const decl = {};
    const lines = text.split('\n');
    if (lines[lines.length - 1] !== '') throw new Error('the map A text ends with LF');
    for (let k = 0; k < lines.length - 1; k++) {
        const line = lines[k];
        if (line[0] === '#') { const m = /^# (verbs|index) ([0-9]+):/.exec(line); if (m) decl[m[1]] = Number(m[2]); continue; }
        const f = line.split(' ');
        if (f[0] === 'v' && f.length === 4 && OFFSET.test(f[1]) && PRINTABLE.test(f[2]) && INT.test(f[3])) {
            if (index.length) throw bad('map A (a verb after the index)', k, line);
            offsets.push(f[1]); lemmas.push(f[2]); parents.push(Number(f[3]));
        } else if (f[0] === 'i' && f.length === 5 && PRINTABLE.test(f[1]) && POS_OF[f[2]] && /^[0-9]+$/.test(f[3]) && OFFSET.test(f[4])) {
            index.push({ entry: f[1], pos: POS_OF[f[2]], tagsense: Number(f[3]), first: f[4] });
        } else throw bad('map A', k, line);
    }
    if (decl.verbs !== offsets.length || decl.index !== index.length) throw new Error(`the map A text declares ${decl.verbs} verbs and ${decl.index} index rows, and has ${offsets.length} and ${index.length}`);
    return { verbs: forestCheck({ offsets, lemmas, parent: Int32Array.from(parents) }, 'verbs'), index };
}
// wn-lite: the shape lexicon_core.js's forest functions and mapA read (wordnet_v1.cjs's load(), restricted): each
// synset with its first lemma and one '@' pointer to its spanning parent; each index entry with its tagsense count
// and first offset. closure() must not be called on it (it carries the spanning parent only).
function buildLite(nouns, mapA) {
    const lite = { synsets: { noun: new Map(), verb: new Map() }, index: { noun: new Map(), verb: new Map(), adj: new Map(), adv: new Map() } };
    for (const [pos, F, p] of [['noun', nouns, 'n'], ['verb', mapA.verbs, 'v']]) {
        const m = lite.synsets[pos];
        for (let i = 0; i < F.offsets.length; i++) {
            const par = F.parent[i];
            m.set(F.offsets[i], { pos, offset: F.offsets[i], lemmas: [F.lemmas[i]], ptrs: par < 0 ? [] : [{ sym: '@', offset: F.offsets[par], pos: p }] });
        }
    }
    for (const x of mapA.index) lite.index[x.pos].set(x.entry, { lemma: x.entry, tagsense: x.tagsense, offsets: [x.first] });
    return lite;
}

// ================================================================== load: the checks, then the named tree
const STEPS = ['data', 'parse', 'words', 'mapA', 'tree'];
const PRIO = ['centre', 'lca', 'extra', 'path', 'ancestor', 'child', 'sibling', 'grandchild'];
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function load({ onStep = null } = {}) {
    const t0 = now(), checks = [], timings = {};
    const say = i => { if (onStep) onStep(STEPS[i], i, STEPS.length); };
    const stop = (stage, msg) => { const e = new Error(msg); e.stage = stage; return e; };
    const record = (name, ok, detail, t) => { const c = { name, ok, detail, ms: now() - t }; checks.push(c); return c; };

    // 1. the texts and the pins
    say(0);
    let t = now(), v0;
    try { LC.tables(); v0 = LC.loadV0(); } catch (e) { throw stop('data', 'the pinned Unicode table or V0 did not load: ' + e.message); }
    const texts = {}, parts = [];
    let dataOk = true;
    for (const [k, pin] of [['nouns', PINS.nounsText], ['mapA', PINS.mapAText]]) {
        const x = dataSource(pin.name);
        if (typeof x !== 'string') throw stop('data', `data/${pin.name}.js did not load (LexiconData.${pin.name} is missing)`);
        const b = LC.textBytes(x), sha = LC.sha256Hex(b), ok = sha === pin.sha256 && b.length === pin.bytes;
        dataOk = dataOk && ok;
        parts.push(`${pin.name}: ${fmt(b.length)} B, sha256 ${sha.slice(0, 12)}… ${ok ? '= the pin' : '≠ the pin ' + pin.sha256.slice(0, 12) + '… (' + fmt(pin.bytes) + ' B)'}`);
        texts[k] = x;
    }
    record('the two WordNet texts equal their pins (SHA-256 and size)', dataOk, parts.join('; '), t);
    timings.data = now() - t;

    // 2. parse, wn-lite
    say(1); t = now();
    let nouns, mapAData, lite;
    try { nouns = parseNouns(texts.nouns); mapAData = parseMapA(texts.mapA); lite = buildLite(nouns, mapAData); } catch (e) { throw stop('parse', 'the WordNet texts did not parse: ' + e.message); }
    const vRoots = mapAData.verbs.parent.reduce((s, p) => s + (p < 0 ? 1 : 0), 0);
    record('parsed; wn-lite built', nouns.offsets.length === PINS.nounsText.nodes && mapAData.verbs.offsets.length === PINS.mapAText.verbs && vRoots === PINS.mapAText.verbRoots && mapAData.index.length === PINS.mapAText.index,
        `${fmt(nouns.offsets.length)} nouns, ${fmt(mapAData.verbs.offsets.length)} verbs (${vRoots} roots), ${fmt(mapAData.index.length)} index rows`, t);
    timings.parse = now() - t;

    // 3. the words, by the core's L3 rule
    say(2); t = now();
    let nounWords, verbWords;
    try { nounWords = LC.nounWords(lite); verbWords = LC.verbWords(lite); } catch (e) { throw stop('words', 'the L3 rule refused the forests: ' + e.message); }
    const nSha = LC.wordsSha256(nounWords), vSha = LC.wordsSha256(verbWords);
    record('noun and verb words (the core\'s nounWords, verbWords) equal their pins', nSha === PINS.nounWordsSha256 && vSha === PINS.verbWordsSha256,
        `nouns ${nSha.slice(0, 12)}… ${nSha === PINS.nounWordsSha256 ? '✓' : '✗'}; verbs ${vSha.slice(0, 12)}… ${vSha === PINS.verbWordsSha256 ? '✓' : '✗'}`, t);
    timings.words = now() - t;

    // 4. map A, by the core
    say(3); t = now();
    let mapWords, report;
    try { [mapWords, report] = LC.mapA(v0.entries, lite, nounWords, verbWords); } catch (e) { throw stop('mapA', 'map A failed: ' + e.message); }
    const want = PINS.mapAReport, perOk = [0, 1, 2, 3, 4, 5].every(r => report.per_root[r] === want.per_root[r]);
    record('map A (the core\'s mapA) on V0: per-root counts, shared addresses and the longest word equal the record',
        perOk && report.shared_addresses === want.shared_addresses && report.entries_sharing === want.entries_sharing && report.max_len === want.max_len,
        `per root ${[0, 1, 2, 3, 4, 5].map(r => fmt(report.per_root[r])).join(' / ')}; ${report.shared_addresses} shared addresses held by ${report.entries_sharing} entries; longest ${report.max_len} letters`, t);
    timings.mapA = now() - t;

    // 5. the named tree
    say(4); t = now();
    const Lex = makeLex({ v0, nouns, mapAData, lite, nounWords, verbWords, mapWords, report });
    timings.tree = now() - t;
    Lex.checks = checks;
    Lex.ok = checks.every(c => c.ok === true);
    Lex.timings = timings;
    Lex.ms = now() - t0;
    return Lex;
}

function makeLex({ v0, nouns, mapAData, lite, nounWords, verbWords, mapWords, report }) {
    const nodes = new Map(), kids = new Map();
    const mk = (key, word, kind, name, extra) => { const n = Object.assign({ key, word, kind, name, ids: [], parent: null, depth: 0, len: word.length, nChildren: 0 }, extra); nodes.set(key, n); return n; };
    mk('', [], 'origin', 'the origin');
    for (let r = 1; r < 6; r++) mk(String(r), [r], 'root', ROOTS[r].name, { root: r });
    const forest = {};
    for (const [kind, F, W, p] of [['noun', nouns, nounWords, 'n'], ['verb', mapAData.verbs, verbWords, 'v']]) {
        const keys = new Array(F.offsets.length), words = new Array(F.offsets.length);
        for (let i = 0; i < F.offsets.length; i++) {
            const w = W.get(F.offsets[i]), key = wordStr(w);
            words[i] = w; keys[i] = key;
            mk(key, w, kind, F.lemmas[i].replace(/_/g, ' '), { offset: F.offsets[i], lemma: F.lemmas[i], i, pos: p, root: w[0] });
        }
        for (let i = 0; i < keys.length; i++) {
            const par = F.parent[i];
            nodes.get(keys[i]).parent = par >= 0 ? keys[par] : kind === 'noun' ? '' : '1';
        }
        forest[kind] = { offsets: F.offsets, words, keys };
    }
    const tokenKeys = new Array(v0.size);
    mapWords.forEach((w, id) => {
        const key = wordStr(w);
        tokenKeys[id] = key;
        let n = nodes.get(key);
        if (!n) n = mk(key, w, 'token', v0.entries[id], { piece: v0.entries[id], root: w[0] });
        n.ids.push(id);
    });
    for (const n of nodes.values()) {             // a token's named parent: its longest proper prefix that is named
        if (n.kind !== 'token') continue;
        for (let j = n.key.length - 1; j >= 1; j--) { const s = n.key.slice(0, j); if (nodes.has(s)) { n.parent = s; break; } }
    }
    for (const r of ['0', '1', '2', '3', '4', '5']) nodes.get(r).parent = '';
    for (const n of nodes.values()) {
        if (n.parent === null) continue;
        if (!kids.has(n.parent)) kids.set(n.parent, []);
        kids.get(n.parent).push(n.key);
    }
    for (const [k, list] of kids) { list.sort((a, b) => cmpWord(nodes.get(a).word, nodes.get(b).word)); nodes.get(k).nChildren = list.length; }
    const byLen = [...nodes.values()].sort((a, b) => a.len - b.len);
    for (const n of byLen) if (n.parent !== null) n.depth = nodes.get(n.parent).depth + 1;

    // ---- words and keys
    const DIGITS = /^[0-5]*$/;
    function wordOf(x) {
        if (Array.isArray(x)) { if (!x.every(g => Number.isInteger(g) && g >= 0 && g < 6) || !P.isReduced(x)) throw new RangeError('not a reduced word: ' + x.join('')); return x; }
        if (x && typeof x === 'object' && Array.isArray(x.word)) return x.word;
        if (typeof x === 'string') {
            const n = nodes.get(x);
            if (n) return n.word;
            if (!DIGITS.test(x)) throw new RangeError('not a key: ' + x);
            return wordOf(Array.from(x, Number));
        }
        throw new TypeError('a key, a word or a node');
    }
    const keyOf = x => (typeof x === 'string' && nodes.has(x) ? x : wordStr(wordOf(x)));
    const node = x => { try { return nodes.get(keyOf(x)) || null; } catch (e) { return null; } };
    function namedParentOfKey(key) {             // the named parent of any key (a named node's own, else its longest named proper prefix)
        const n = nodes.get(key);
        if (n) return n.parent;
        for (let j = key.length - 1; j >= 0; j--) if (nodes.has(key.slice(0, j))) return key.slice(0, j);
        return null;
    }
    const parentKey = x => namedParentOfKey(keyOf(x));
    const children = x => (kids.get(keyOf(x)) || []).slice();
    function ancestors(x) {
        const out = [];
        let p = parentKey(x);
        while (p !== null) { out.push(p); p = nodes.get(p).parent; }
        return out.reverse();
    }
    function edges(x) {                          // the letters of each named edge from the origin down to x
        const key = keyOf(x), chain = ancestors(key).concat([key]), w = wordOf(key), out = [];
        for (let i = 1; i < chain.length; i++) out.push(w.slice(chain[i - 1].length, chain[i].length));
        return out;
    }
    function label(x) {
        const n = typeof x === 'object' && x && x.kind ? x : node(x);
        if (!n) return typeof x === 'string' ? x : wordStr(wordOf(x));
        if (n.kind === 'noun' || n.kind === 'verb') return `${n.name}.${n.pos} (${n.offset})`;
        return n.name;
    }

    // ---- search: first lemmas (space = underscore, any case) and V0 pieces, by prefix
    let SEARCH = null;
    function search(query, limit = 20) {
        if (!SEARCH) {
            SEARCH = [];
            for (const kind of ['noun', 'verb']) forest[kind].keys.forEach(k => SEARCH.push([nodes.get(k).lemma.toLowerCase(), k]));
            v0.entries.forEach((e, id) => SEARCH.push([e.toLowerCase(), tokenKeys[id]]));
            SEARCH.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
        }
        const q = String(query || '').trim().toLowerCase().replace(/\s+/g, '_');
        if (!q) return [];
        let lo = 0, hi = SEARCH.length;
        while (lo < hi) { const m = (lo + hi) >> 1; if (SEARCH[m][0] < q) lo = m + 1; else hi = m; }
        const out = [], seen = new Set();
        for (let i = lo; i < SEARCH.length && out.length < limit && SEARCH[i][0].startsWith(q); i++) {
            const k = SEARCH[i][1];
            if (!seen.has(k)) { seen.add(k); out.push(nodes.get(k)); }
        }
        return out;
    }

    // ---- text
    const SPECIAL = new Set(LC.SPECIALS);
    function encodeOne(s) {
        const bytes = LC.utf8(s), r = LC.nb(bytes), e = LC.encodeNb(r, v0), failed = [];
        r.failed.forEach((f, k) => { if (f) failed.push(LC.fromCps(LC.decodeUtf8(bytes.subarray(r.spans[k][0], r.spans[k][1])).cps)); });
        return { ids: e.ids, pieces: e.pieces, spans: e.spans, failed };
    }
    function token(i, id, piece, span, segment) {
        const key = tokenKeys[id], n = nodes.get(key), word = n.word;
        return { i, piece, id, span, segment, special: SPECIAL.has(piece), word, key, len: word.length, root: word[0], rootName: ROOTS[word[0]].short, node: n,
            synset: n.kind === 'noun' || n.kind === 'verb' ? n : null };
    }
    function analyse(text, { pair = null } = {}) {
        const out = { text, pair, tokens: [], unk: 0, failedWords: [], idStreamHex: '', idStreamSha256: '', error: null };
        let parts;
        try { parts = pair ? [encodeOne(String(pair[0])), encodeOne(String(pair[1]))] : [encodeOne(String(text === undefined || text === null ? '' : text))]; } catch (e) { out.error = e.message; }
        if (parts) {
            const T = out.tokens;
            if (!pair) parts[0].ids.forEach((id, k) => T.push(token(T.length, id, parts[0].pieces[k], parts[0].spans[k], 0)));
            else {
                const cls = v0.ids.get('[CLS]'), sep = v0.ids.get('[SEP]');
                T.push(token(0, cls, '[CLS]', null, 0));
                parts[0].ids.forEach((id, k) => T.push(token(T.length, id, parts[0].pieces[k], parts[0].spans[k], 0)));
                T.push(token(T.length, sep, '[SEP]', null, 0));
                if (parts[1].ids.length) {
                    parts[1].ids.forEach((id, k) => T.push(token(T.length, id, parts[1].pieces[k], parts[1].spans[k], 1)));
                    T.push(token(T.length, sep, '[SEP]', null, 1));
                }
            }
            for (const p of parts) out.failedWords.push(...p.failed);
        }
        out.unk = out.tokens.filter(t => t.id === v0.unk).length;
        const stream = LC.idStream([out.tokens.map(t => t.id)]);
        out.idStreamHex = LC.hex(stream);
        out.idStreamSha256 = LC.sha256Hex(stream);
        return out;
    }
    function defaultCentre(analysis) {
        const syn = analysis.tokens.filter(t => t.synset).map(t => t.key);
        if (syn.length >= 2) return syn.slice(1).reduce((acc, k) => lca(acc, k).named, syn[0]);
        if (syn.length === 1) return nodes.get(syn[0]).parent;
        return '';
    }

    // ---- exact points and frames (memoised per key)
    const MEMO = { 2: new Map(), 3: new Map() }, FMEMO = { 2: new Map(), 3: new Map() };
    function point(dim, x) {
        const w = wordOf(x), key = wordStr(w), m = MEMO[dim];
        if (!m) throw new RangeError('dim is 2 or 3');
        let p = m.get(key);
        if (!p) {
            p = dim === 2 ? { X: LC.H2_TREE.point(w), den: LC.H2_TREE.den(w.length), n: w.length } : { X: LC.h3Point(w), den: LC.h3Den(w.length), n: w.length };
            m.set(key, p);
        }
        return p;
    }
    function frame(dim, x) {
        const w = wordOf(x), key = wordStr(w), m = FMEMO[dim];
        let f = m.get(key);
        if (!f) { f = { N: dim === 2 ? LC.H2_TREE.frames([w])[0] : LC.h3Frames([w])[0], den: dim === 2 ? LC.H2_TREE.den(w.length) : LC.h3Den(w.length) }; m.set(key, f); }
        return f;
    }
    const lorentzKey = (A, B) => { let s = A[0] * B[0]; for (let k = 1; k < A.length; k++) s -= A[k] * B[k]; return s; };
    function cosh(dim, a, b) {
        const A = point(dim, a), B = point(dim, b), [n, d] = lowest(lorentzKey(A.X, B.X), A.den * B.den), value = ratio(n, d);
        return { n, d, value, dist: distOf(value), text: `${n}/${d}` };
    }
    // dim 2: D3's exact decoder; dim 3: h3DecodeInt, and decoder3d.js's decodeExact (the authority Amendment 4 item 4
    // names for L3(e)) unless { authority: false } (bulk checks)
    function decode(dim, x, { authority = true } = {}) {
        const w = wordOf(x), { X, n } = point(dim, w);
        if (dim === 2) { const [word, ties] = LC.H2_TREE.decode(X, n); return { word, ties, ok: sameWord(word, w), authority: null }; }
        const word = LC.h3DecodeInt(X, n), ex = authority ? LC.h3DecodeExact(X, n) : null;
        return { word, ties: null, ok: sameWord(word, w), authority: ex ? sameWord(ex, word) : null, exactWord: ex };
    }
    function bits(dim, x) { const { X, den, n } = point(dim, x); return { coords: LC.coordBits(X, den), point: LC.pointBits(X, den), den, n }; }
    // the exact point stored in float64 (each coordinate correctly rounded), read back exactly over one power of two
    // and decoded exactly: how many leading letters survive
    function float64Kept(dim, x) {
        const w = wordOf(x), { X, den, n } = point(dim, w);
        const parts = X.map(c => dyadic(ratio(c, den)));
        const S = parts.reduce((s, [m, e]) => (m !== 0n && -e > s ? -e : s), 0);
        const V = parts.map(([m, e]) => m * (1n << BigInt(e + S)));
        const got = dim === 2 ? LC.H2_TREE.decode(V, n)[0] : LC.h3DecodeInt(V, n);
        return lead(got, w);
    }
    function ids(x) { const w = wordOf(x), parts = LC.certifyParts(w); return { id: LC.wordId(w), id59: LC.id59(w), id64: LC.id64(w), certified: parts.every(Boolean), parts }; }

    // ---- lowest common ancestors and paths
    function lca(a, b) {
        const wa = wordOf(a), wb = wordOf(b), ka = wordStr(wa), kb = wordStr(wb), k = lead(wa, wb);
        let named = null, synset = null;
        for (let j = k; j >= 0 && (named === null || synset === null); j--) {
            const nd = nodes.get(ka.slice(0, j));
            if (!nd) continue;
            if (named === null) named = nd.key;
            if (synset === null && (nd.kind === 'noun' || nd.kind === 'verb')) synset = nd.key;
        }
        const L = named.length, pathKeys = [], pathWords = [];
        for (let j = wa.length; j > L; j--) { pathWords.push(wa.slice(0, j)); if (nodes.has(ka.slice(0, j))) pathKeys.push(ka.slice(0, j)); }
        pathWords.push(wa.slice(0, L)); pathKeys.push(named);
        for (let j = L + 1; j <= wb.length; j++) { pathWords.push(wb.slice(0, j)); if (nodes.has(kb.slice(0, j))) pathKeys.push(kb.slice(0, j)); }
        return { a: ka, b: kb, lcp: k, common: wa.slice(0, k), named, synset, up: wa.length - L, down: wb.length - L, letters: wa.length + wb.length - 2 * L, pathKeys, pathWords };
    }
    function path(dim, a, b) {
        const l = lca(a, b), tau = dim === 2 ? Math.log(12) : Math.log(7), c = cosh(dim, a, b), wa = wordOf(a), wb = wordOf(b);
        const lcpLetters = wa.length + wb.length - 2 * l.lcp, tree = l.letters * tau;
        return { letters: l.letters, tau, tree, geodesic: c.dist, detour: tree - c.dist, cosh: c, lcpLetters, treeLcp: lcpLetters * tau, lca: l };
    }

    // ---- the view around a word (Phase 5 spec 3.6)
    function view(centreKey, opts = {}) {
        const o = Object.assign({ siblings: 24, children: 48, grandchildren: 4, extra: [], paths: [], maxNodes: 400, siblingPage: 0, childPage: 0 }, opts);
        const c = node(centreKey);
        if (!c) throw new RangeError('no named node ' + centreKey);
        const G = { centre: [c.key], ancestor: ancestors(c.key), sibling: [], child: [], grandchild: [], extra: [], path: [], lca: [] };
        const paging = { siblings: { from: 0, to: 0, total: 0, prev: false, next: false }, children: { from: 0, to: 0, total: 0, prev: false, next: false } };
        let S = [], ic = 0;
        if (c.parent !== null) {
            S = kids.get(c.parent); ic = S.indexOf(c.key);
            // pages of `siblings` positions, page 0 centred on the centre: together they visit each sibling once
            const start = ic - Math.floor(o.siblings / 2) + o.siblingPage * o.siblings;
            const from = Math.max(0, Math.min(S.length, start)), to = Math.max(from, Math.min(S.length, start + o.siblings));
            G.sibling = S.slice(from, to).filter(k => k !== c.key);
            paging.siblings = { from, to, total: S.length, prev: from > 0, next: to < S.length };
        }
        const K = kids.get(c.key) || [];
        { const from = Math.min(K.length, o.childPage * o.children), to = Math.min(K.length, from + o.children);
            G.child = K.slice(from, to);
            paging.children = { from, to, total: K.length, prev: from > 0, next: to < K.length }; }
        if (K.length <= 48 && o.grandchildren > 0) for (const k of G.child.slice(0, 12)) G.grandchild.push(...(kids.get(k) || []).slice(0, o.grandchildren));
        const seenX = new Set();
        for (const x of o.extra) { let k; try { k = keyOf(x); } catch (e) { continue; } if (nodes.has(k) && !seenX.has(k)) { seenX.add(k); G.extra.push(k); } }
        for (const pr of o.paths) {
            let l; try { l = lca(pr[0], pr[1]); } catch (e) { continue; }
            for (const k of l.pathKeys) if (k !== l.named) G.path.push(k);
            G.lca.push(l.named);
        }
        const size = () => new Set([].concat(...Object.values(G))).size;
        let truncated = false;
        const cut = (name, f) => { if (size() > o.maxNodes) { const before = G[name].length; G[name] = f(G[name]); if (G[name].length < before) truncated = true; } };
        cut('grandchild', () => []);
        cut('sibling', L => L.filter(k => Math.abs(S.indexOf(k) - ic) <= 8));
        cut('child', L => L.slice(0, 24));
        cut('extra', L => L.slice(0, 64));
        if (size() > o.maxNodes) truncated = true;
        const order = ['ancestor', 'centre', 'lca', 'path', 'extra', 'child', 'sibling', 'grandchild'], roles = new Map();
        for (const g of order) for (const k of G[g]) { if (!roles.has(k)) roles.set(k, new Set()); roles.get(k).add(g); }
        const drawn = new Set(roles.keys()), list = [];
        for (const [k, set] of roles) list.push({ key: k, rel: PRIO.find(r => set.has(r)), roles: [...set] });
        const E = [], V = [];
        for (const k of drawn) {
            if (k === '') continue;
            let p = nodes.get(k).parent, hidden = 0;
            while (p !== null && !drawn.has(p)) { p = nodes.get(p).parent; hidden++; }
            if (p === null) continue;
            const w = nodes.get(k).word;
            E.push({ from: p, to: k, letters: w.slice(p.length), hidden });
            for (let j = p.length + 1; j < k.length; j++) if (!nodes.has(k.slice(0, j))) V.push({ word: w.slice(0, j), from: p, to: k });
        }
        return { centre: c.key, nodes: list, edges: E, virtual: V, paging, truncated };
    }

    // ---- charts: the recentring isometry in BigInt, floats at the last step (Phase 5 spec 3.5)
    function chart(dim, centre) {
        const cw = wordOf(centre), { N, den: dc } = frame(dim, cw), J = dim === 2 ? [-1n, 1n, 1n] : [-1n, 1n, 1n, 1n], memo = new Map();
        function place(x) {
            const w = wordOf(x), key = wordStr(w);
            let p = memo.get(key);
            if (p) return p;
            const { X, den } = point(dim, w);
            const R = N.map((col, i) => { let s = -col[0] * X[0]; for (let k = 1; k < X.length; k++) s += col[k] * X[k]; return J[i] * s; });
            const D = dc * den, z = ratio(R[0], D), d = distOf(z), u = unitOf(R.slice(1));
            p = { R, D, d, u, y: [Math.cosh(d), ...u.map(v => Math.sinh(d) * v)], coshText() { const [a, b] = lowest(R[0], D); return `${a}/${b}`; } };
            memo.set(key, p);
            return p;
        }
        function geodesic(a, b, n = 12) {
            const pa = place(a), pb = place(b), delta = cosh(dim, a, b).dist;
            if (!(delta > 1e-12)) return [placedOf(pa.y)];
            const out = [], sh = Math.sinh(delta);
            for (let i = 0; i <= n; i++) {
                if (i === 0) { out.push({ d: pa.d, u: pa.u, y: pa.y }); continue; }
                if (i === n) { out.push({ d: pb.d, u: pb.u, y: pb.y }); continue; }
                const t = i / n, s0 = Math.sinh((1 - t) * delta) / sh, s1 = Math.sinh(t * delta) / sh;
                out.push(placedOf(pa.y.map((v, k) => s0 * v + s1 * pb.y[k])));
            }
            return out;
        }
        // three frame arms of x (3D only): T = M_c^-1 L_x exactly (L_x = C.X.boost of x's exact point), then to floats;
        // the endpoints T (cosh a, sinh a R(q) e_k), q = x's word quaternion
        function frameAxes(x, arm = 0.6) {
            if (dim !== 3) throw new RangeError('frame axes are drawn in H^3');
            const w = wordOf(x), { X, den } = point(3, w);
            const Minv = N.map((row, i) => row.map((v, j) => new Q(J[i] * J[j] * v, dc)));
            const L = C.X.boost(X.map(v => new Q(v, den))), T = C.X.matmul(Minv, L).map(r => r.map(e => ratio(e.n, e.d)));
            const R = T3.rotOfQuat(P.wordQuaternion(w)).map(r => r.map(e => ratio(e.n, e.d)));
            const ch = Math.cosh(arm), sh = Math.sinh(arm);
            return [0, 1, 2].map(k => { const v = [ch, sh * R[0][k], sh * R[1][k], sh * R[2][k]]; return T.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2] + r[3] * v[3]); });
        }
        return { dim, centre: wordStr(cw), place, geodesic, frameAxes };
    }

    // ---- nearest in a candidate set, by exact keys (LC.h2Arm / LC.h3Arm)
    function nearest(dim, key, keys, k = 8) {
        const q = keyOf(key), cand = [q], seen = new Set([q]);
        for (const x of keys) { let s; try { s = keyOf(x); } catch (e) { continue; } if (!seen.has(s)) { seen.add(s); cand.push(s); } }
        if (cand.length < 2) return [];
        const words = cand.map(wordOf), arm = dim === 2 ? LC.h2Arm(words) : LC.h3Arm(words), K = arm.keys(0), den2 = arm.den * arm.den;
        const order = cand.map((_, i) => i).slice(1).sort((a, b) => cmpBig(K[a], K[b]) || a - b), count = new Map();
        for (const i of order) count.set(K[i], (count.get(K[i]) || 0) + 1);
        return order.slice(0, k).map(i => { const [n, d] = lowest(K[i], den2), v = ratio(n, d); return { key: cand[i], cosh: { n, d }, dist: distOf(v), tie: count.get(K[i]) > 1 }; });
    }

    // ---- 3D readings
    const quaternion = x => P.wordQuaternion(wordOf(x));
    function rotation(x) {
        const R = T3.rotOfQuat(quaternion(x));
        return { R, ok: C.X.isOrthogonal(R), f: R.map(r => r.map(e => ratio(e.n, e.d))) };
    }
    function vertex(x, q) {
        const w = wordOf(x), G = lpsGraph(q), v = G.reduction(w), states = [0];
        for (const g of w) states.push(G.nbr[states[states.length - 1] * 6 + g]);
        const walkV = states[states.length - 1];
        return { v, m: G.matrix(v), dist: G.dist[v], walk: walkV, agree: walkV === v, trail: states.slice(-3) };
    }
    function lpsBall(q, v, r = 2) {
        const G = lpsGraph(q), depth = new Map([[v, 0]]), nodesOut = [{ v, depth: 0, parent: -1, gen: -1 }], edgesOut = [], extra = [];
        for (let i = 0; i < nodesOut.length; i++) {
            const u = nodesOut[i].v;
            if (nodesOut[i].depth >= r) continue;
            for (let g = 0; g < 6; g++) {
                const t = G.nbr[u * 6 + g];
                if (!depth.has(t)) { depth.set(t, nodesOut[i].depth + 1); nodesOut.push({ v: t, depth: nodesOut[i].depth + 1, parent: u, gen: g }); edgesOut.push([u, t, g]); }
            }
        }
        for (const nd of nodesOut) for (let g = 0; g < 6; g++) {
            const t = G.nbr[nd.v * 6 + g];
            if (depth.has(t) && nd.v < t && !edgesOut.some(e => (e[0] === nd.v && e[1] === t) || (e[0] === t && e[1] === nd.v))) extra.push([nd.v, t, g]);
        }
        return { nodes: nodesOut, edges: edgesOut, extra };
    }
    // the coupler (Engram's E5 law) on the segments of a pair: structure 0 is segment A, 1 is B
    function couple(analysis, { chirality = 'mirror', skip = null } = {}) {
        const { EC } = engramCores(), cp = new EC.Coupler(chirality), checks = [];
        for (const t of analysis.tokens) {
            const w = P.wordQuaternion(t.word), before = cp.q[1];
            cp.twist(w, t.segment);
            if (skip === t.i) cp.q = [cp.q[0], before];
            checks.push({ i: t.i, segment: t.segment, ok: cp.check(t.i) });
        }
        const fl = q => T3.rotOfQuat(q).map(r => r.map(e => ratio(e.n, e.d)));
        return { chirality, skip, checks, held: checks.filter(c => c.ok).length, total: checks.length, q1: cp.q[0], q2: cp.q[1], issued: cp.issued.slice(), f1: fl(cp.q[0]), f2: fl(cp.q[1]) };
    }

    // ---- the whole-data checks, on demand
    let ADDR = null, addrPending = null;
    const addrOf = (rows, rootHex, ms) => {
        const l = LC.laddr({ vocab: v0, root: rootHex });
        return { rows, root: rootHex, ok: rootHex === PINS.addrTableRoot, laddr: { text: l.text, sha256: l.sha256, ok: l.text === PINS.laddr && l.sha256 === PINS.laddrHash }, ms };
    };
    function addrTable() {
        if (ADDR) return ADDR;
        const t = now(), rows = LC.addrRows(v0.entries, mapWords);
        ADDR = addrOf(rows, LC.addrTableRoot(rows), now() - t);
        return ADDR;
    }
    // the same table in steps of tens of milliseconds, yielding between them, so building it never holds the page for
    // half a second: the rows by the core's addrRows on slices (each row's id is its index in the slice, so it is set
    // back to the entry's), and the RFC 6962 root from the roots of aligned power-of-two blocks of leaves, joined by the
    // core's rfcNodeHash with RFC 6962's split (every split point of a list longer than a block is a multiple of the
    // block). Memoised with addrTable(): whichever finishes first is kept. ms counts the work, not the waits.
    function addrTableAsync({ rowChunk = 512, leafChunk = 1024 } = {}) {
        if (ADDR) return Promise.resolve(ADDR);
        if (addrPending) return addrPending;
        addrPending = (async () => {
            let ms = 0, t;
            const n = mapWords.length, rows = [];
            for (let a = 0; a < n; a += rowChunk) {
                if (ADDR) return ADDR;
                t = now();
                const part = LC.addrRows(v0.entries.slice(a, a + rowChunk), mapWords.slice(a, a + rowChunk));
                for (let j = 0; j < part.length; j++) rows.push(a + j + part[j].slice(part[j].indexOf('|')));
                ms += now() - t; await later();
            }
            const blocks = [];
            for (let a = 0; a < n; a += leafChunk) {
                if (ADDR) return ADDR;
                t = now(); blocks.push(LC.rfcRoot(rows.slice(a, a + leafChunk).map(r => LC.utf8(r)))); ms += now() - t; await later();
            }
            if (ADDR) return ADDR;
            t = now();
            const mth = (lo, hi) => (hi - lo <= leafChunk ? blocks[lo / leafChunk] : (k => LC.rfcNodeHash(mth(lo, lo + k), mth(lo + k, hi)))(LC.largestPow2Below(hi - lo)));
            const rootHex = n ? LC.hex(mth(0, n)) : LC.addrTableRoot(rows);
            ms += now() - t;
            if (!ADDR) ADDR = addrOf(rows, rootHex, ms);
            return ADDR;
        })().finally(() => { addrPending = null; });
        return addrPending;
    }
    async function verifyNouns({ onProgress = null, chunk = 4096 } = {}) {
        const t = now(), F = forest.noun, n = F.offsets.length, say = (stage, done) => { if (onProgress) onProgress(stage, done, n); };
        // the points in chunks with yields, so the progress bar moves (each word's point is its own: chunking changes nothing)
        say('H3 points', 0); await later();
        const P3 = [];
        for (let a = 0; a < n; a += chunk) { P3.push(...LC.h3Points(F.words.slice(a, a + chunk))); await later(); }
        say('H2 points', 0); await later();
        const P2 = [];
        for (let a = 0; a < n; a += chunk) { P2.push(...LC.H2_TREE.points(F.words.slice(a, a + chunk))); await later(); }
        const lines3 = new Array(n), lines2 = new Array(n);
        for (let a = 0; a < n; a += chunk) {
            const b = Math.min(n, a + chunk);
            for (let i = a; i < b; i++) {
                const len = F.words[i].length;
                lines3[i] = `${F.offsets[i]} H3 ${LC.coordsText(P3[i], LC.h3Den(len))}`;
                lines2[i] = `${F.offsets[i]} H2 ${LC.coordsText(P2[i], LC.H2_TREE.den(len))}`;
            }
            say('lines', b); await later();
        }
        say('SHA-256', n); await later();
        const text = lines3.concat(lines2).join('\n'), bytes = LC.textBytes(text);
        // WebCrypto's native SHA-256 where the context offers it (29.4 MB: the core's JS hash blocks for about 0.7 s)
        let sha256 = null;
        if (subtleOk()) { try { sha256 = [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join(''); } catch (e) { sha256 = null; } }
        if (sha256 === null) sha256 = LC.sha256Hex(bytes);
        return { sha256, bytes: text.length, ok: sha256 === PINS.canonicalPointList.sha256 && text.length === PINS.canonicalPointList.bytes, ms: now() - t };
    }

    return {
        v0, checks: [], ok: false, ms: 0, timings: {},
        counts: { nouns: nouns.offsets.length, verbs: mapAData.verbs.offsets.length, tokens: v0.size, perRoot: Object.assign({}, report.per_root), named: nodes.size },
        lite, forest, mapA: { words: mapWords, report },
        node, parentKey, children, ancestors, edges, search, label, wordOf, defaultCentre,
        analyse, point, cosh, decode, bits, float64Kept, ids,
        lca, path, view, chart, nearest,
        quaternion, rotation, lps: lpsGraph, vertex, lpsBall, couple,
        addrTable, addrTableAsync, verifyNouns,
    };
}

// ================================================================== X(5, q), for display (a port of reference/lexicon/lps.py)
const LPS = {};
function lpsGraph(q) {
    if (LPS[q]) return LPS[q];
    const pin = PINS.lps[q];
    if (!pin) throw new RangeError('X(5, q) is drawn for q = 13, 17 and 29');
    let iota = 1;
    while ((iota * iota + 1) % q) iota++;
    const qb = BigInt(q), ib = BigInt(iota), md = x => Number(((x % qb) + qb) % qb);
    const phi = ([a, b, c, d]) => [md(a + b * ib), md(c + d * ib), md(-c + d * ib), md(a - b * ib)];
    const inv = e => { let r = 1, b = e % q, x = q - 2; while (x) { if (x & 1) r = (r * b) % q; b = (b * b) % q; x >>= 1; } return r; };
    const canon = m => { for (const e of m) if (e % q) { const i = inv(e); return m.map(x => (x * i) % q); } throw new Error('the zero matrix has no projective class'); };
    const mmul = (x, y) => [(x[0] * y[0] + x[1] * y[2]) % q, (x[0] * y[1] + x[1] * y[3]) % q, (x[2] * y[0] + x[3] * y[2]) % q, (x[2] * y[1] + x[3] * y[3]) % q];
    const enc = m => ((m[0] * q + m[1]) * q + m[2]) * q + m[3];
    const mats = P.GENS.map(g => phi(g)), verts = [[1, 0, 0, 1]], index = new Map([[enc([1, 0, 0, 1]), 0]]), nbr = [], dist = [0], parent = [-1];
    for (let i = 0; i < verts.length; i++) {
        for (const M of mats) {
            const c = canon(mmul(verts[i], M)), k = enc(c);
            let j = index.get(k);
            if (j === undefined) { j = verts.length; index.set(k, j); verts.push(c); dist.push(dist[i] + 1); parent.push(i); }
            nbr.push(j);
        }
    }
    const n = verts.length;
    let girth = Infinity, diameter = 0;
    for (let u = 0; u < n; u++) {
        if (dist[u] > diameter) diameter = dist[u];
        for (let g = 0; g < 6; g++) { const v = nbr[u * 6 + g]; if (!(parent[v] === u || parent[u] === v)) girth = Math.min(girth, dist[u] + dist[v] + 1); }
    }
    if (iota !== pin.iota || n !== pin.n || diameter !== pin.diameter || girth !== pin.girth) throw new Error(`X(5, ${q}) built here (iota ${iota}, ${n} vertices, diameter ${diameter}, girth ${girth}) is not the L7 record's`);
    const G = { q, iota, n, diameter, girth, r: (girth - 1) >> 1, nbr: Int32Array.from(nbr), dist: Int32Array.from(dist), parent: Int32Array.from(parent),
        matrix: v => verts[v].slice(),
        vertexOf: m => { const j = index.get(enc(canon(m.map(x => ((x % q) + q) % q)))); return j === undefined ? null : j; },
        walk: w => { let v = 0; for (const g of w) v = G.nbr[v * 6 + g]; return v; },
        reduction: w => index.get(enc(canon(phi(P.wordQuaternion(w))))) };
    LPS[q] = G;
    return G;
}

// ================================================================== Engram Mind's Eye's cores, when a page loads them
function engramCores() {
    const x = engramSource ? engramSource() : null;
    if (!x || !x.EC) throw new Error('this needs engram_core.js (with twin3d.js, fence.js and ttmpt_core_v1.js) loaded first');
    return x;
}

// ================================================================== the shard panel's logic (Explainer 11's lab, adapted)
const SHARD = { cap: 60000, capEngrams: 6000, corpusId: 'lexicon-pages-v1', spdx: 'NOASSERTION' };
// the panel's built-in sample (1,500 bytes or more, so that T7 has two full frames to swap)
const SAMPLE = ['A hyperbolic lexicon gives every word of its vocabulary one address in a tree of reduced words, and every',
    'address one exact point in the hyperbolic plane and in hyperbolic space. The nouns hang from entity, the verbs from',
    'a virtual root, and the other pieces of the vocabulary are spelled letter by letter under roots of their own. A',
    'shard of text is grown into a biochain: its bytes are cut into frames of 720, each frame becomes a packet and a',
    'residual, the leaves are hashed, and the frames are woven into one exact quaternion. The record is then committed',
    'with the hashes of the vocabulary and of the address table, signed with a key the registry lists, placed in a',
    'corpus tree, and checked by a verifier that recomputes everything it can and trusts nothing it cannot. Break one',
    'bit of the stream, change one digit of a hash, swap two frames or sign with a revoked key, and the verifier names',
    'the first check that fails. The page shows what it computed and how long it took; it decides nothing, because the',
    'claims about these records were decided by the registered runs. Dogs chase cats, cats climb trees, and oxygen and',
    'nitrogen are gases: the words of this paragraph land on points of the noun tree, and their lowest common',
    'ancestors are drawn in gold on the pages that show them. Each token also carries a frame, the rotation of its',
    'own word quaternion, and a vertex of three finite Cayley graphs, so one address is read three ways at once, and',
    'every reading can be checked by exact arithmetic.'].join(' ');
const subtleOk = () => !!(typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle && (typeof globalThis.isSecureContext === 'undefined' || globalThis.isSecureContext !== false));
function randomScalar() {
    const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (!c || !c.getRandomValues) throw new Error('no random source (crypto.getRandomValues) here');
    const b = new Uint8Array(32);
    c.getRandomValues(b);
    return BigInt('0x' + LC.hex(b)) % (LC.P256.n - 1n) + 1n;
}
async function makeKey(kv, epoch, webcrypto) {
    if (webcrypto) {
        const k = await LC.newKeyPair();
        return { keyId: k.keyId, publicJwk: k.publicJwk, sign: c => LC.attestSign(k.privateKey, { keyId: k.keyId, keyVector: kv, epochToken: epoch }, c) };
    }
    const d = randomScalar(), jwk = LC.testJwk(d);
    return { keyId: LC.keyIdOf(jwk), publicJwk: jwk, sign: async c => LC.attestDet(d, kv, c, epoch) };
}
async function shardRun(Lex, text, { engrams = false, laddr = 'recompute', corpusId = SHARD.corpusId, spdx = SHARD.spdx, source = 'page:lexicon', epoch = null, webcrypto = null } = {}) {
    const { EC, BC } = LC.chainCores(), v0 = Lex.v0, T = {};
    const { data } = LC.shardText(String(text));
    if (!data.length) throw new Error('nothing to grow: the text is empty');
    if (data.length > SHARD.cap) throw new Error(`the panel grows texts of up to 60,000 bytes (the shard cap), and this one has ${fmt(data.length)}`);
    if (engrams && data.length > SHARD.capEngrams) throw new Error(`with the engram layer on, the panel grows texts of up to 6,000 bytes, and this one has ${fmt(data.length)}: Owl's rule recomputes the layer with biomesh.js's engramStreamFromText, whose median was 9.3 s on a full shard in L8. Turn the layer off or shorten the text.`);
    const wc = webcrypto === null ? subtleOk() : !!webcrypto;
    epoch = epoch || LC.epochTokenOf(new Date().toISOString().slice(0, 10));
    let t = now();
    const record = LC.growSync(String(text), { engrams });
    T.grow = now() - t;
    const lv = LC.lvocab({ vocab: v0 });
    t = now();
    let la;
    if (laddr === 'pinned') la = { text: PINS.laddr, sha256: LC.sha256Str(PINS.laddr), source: 'pinned: the decisive run\'s string', root: PINS.addrTableRoot };
    else { const A = Lex.addrTableAsync ? await Lex.addrTableAsync() : Lex.addrTable(); la = { text: A.laddr.text, sha256: A.laddr.sha256, source: 'recomputed here from this page\'s data', root: A.root }; }
    la.rootOk = la.root === PINS.addrTableRoot;
    la.equalsRun = la.sha256 === PINS.laddrHash && la.text === PINS.laddr;
    T.laddr = now() - t;
    const identity = LC.identityIdOf(), kv = LC.keyVectorOf(identity, epoch);
    const keyA = await makeKey(kv, epoch, wc), keyB = await makeKey(kv, epoch, wc);
    const registry = LC.registrySnapshot([{ publicJwk: keyA.publicJwk, keyVector: kv, status: 'active' }, { publicJwk: keyB.publicJwk, keyVector: kv, status: 'revoked' }]);
    const session = await LC.chainSession({ vocab: v0, lvocab: lv.text, laddr: la.text, registry: registry.text, registrySha256: registry.sha256 });
    t = now();
    const lp = LC.lprep({ record, text: data, corpusId, shardIndex: 0, spdx, sourceSha: LC.sha256Str(source), lvocabHash: session.lvocabHash, laddrHash: session.laddrHash, vocab: v0 });
    T.lprep = now() - t;
    const weave = LC.weaveReport(record.leafHashes, record.segCuts);
    const tree = LC.corpusTree([lp.text]), lcorpus = LC.lcorpus({ corpusId, tree, spdxSha: LC.spdxSetSha([spdx]) });
    const empty = LC.hex(tree.mth(0, 0)), lgrow = LC.lgrow({ corpusId, nOld: 0, rootOld: empty, nNew: 1, rootNew: lcorpus.root, proof: [] });
    t = now();
    const attestation = await keyA.sign(lp.text);
    T.sign = now() - t;
    const pkg = LC.makePackage({ record, lprep: lp.text, attestation, lcorpus: lcorpus.text, inclusion: tree.path(0), lgrow: lgrow.text, consistency: [] });
    const vopts = wc ? {} : { skip: ['attestation'] };
    t = now();
    const verdict = await LC.verifyPackage(session, pkg, vopts);
    T.verify = now() - t;
    t = now();
    const owl = EC.verifyBiochain(BC, record);         // Owl's rule; with the engram layer it recomputes the layer (engram_core.js)
    T.owl = now() - t;
    const idList = [...new Set(LC.encode(data, v0).ids)].sort((a, b) => a - b);
    const run = { bytes: data.length, K: record.leafHashes.length, record,
        lvocab: { text: lv.text, sha256: lv.sha256, equalsRun: lv.sha256 === PINS.lvocabHash }, laddr: la,
        keys: { active: keyA.keyId, revoked: keyB.keyId }, identity, keyVector: kv, epoch, registry, session,
        lprep: { text: lp.text, sha256: lp.sha256, fields: lp.text.split('|') }, weave, lcorpus: { text: lcorpus.text, root: lcorpus.root }, lgrow: { text: lgrow.text, sha256: lgrow.sha256 },
        attestation, pkg, verdict, verdictText: LC.verdictText(verdict), accepted: verdict.failed === '-', owl, ids: idList, webcrypto: wc, vopts, timings: T, engrams };
    Object.defineProperty(run, '_keyB', { value: keyB, enumerable: false });
    return run;
}
const TAMPERS = ['T1', 'T2', 'T3', 'T4', 'T7', 'T8', 'T9'];
const clone = o => JSON.parse(JSON.stringify(o));
const lastDigit = s => s.slice(0, -1) + (s.endsWith('0') ? '1' : '0');   // spike S4's rule, as the trace and the run use it
async function shardTamper(run, name) {
    const { BC, EC } = LC.chainCores();
    const make = {
        T1: async () => { const p = clone(run.pkg); delete p.record.leafHashes; delete p.record.merkleRoot; return { p, what: `leafHashes (${run.K}) and merkleRoot removed` }; },
        T2: async () => {
            const p = clone(run.pkg), s = p.record.stream, at = LC.frameOffsets(s)[0][0], old = s.slice(at, at + 16);
            const nw = LC.refixParity(LC.word16(BigInt('0x' + old) ^ (1n << 24n)));
            p.record.stream = s.slice(0, at) + nw + s.slice(at + 16);
            return { p, what: `frame 0's packet ${old} → ${nw}: crystal32 bit 0 (word bit 24) flipped, parity re-fixed` };
        },
        T3: async () => { const p = clone(run.pkg), old = p.lprep.split('|')[9], nw = lastDigit(old); p.lprep = LC.withField(p.lprep, 'lvocabHash', nw); return { p, what: `the LPREP/1's lvocabHash …${old.slice(-6)} → …${nw.slice(-6)}`, unchanged: true }; },
        T4: async () => {
            if (!run.webcrypto) return { skip: 'needs WebCrypto, which this context does not offer' };
            const p = clone(run.pkg); p.attestation = await run._keyB.sign(p.lprep);
            return { p, what: `the same LPREP/1 signed by ${run.keys.revoked}, which the registry marks revoked`, unchanged: true };
        },
        T7: async () => {
            if (run.K < 2) return { skip: 'one frame, nothing to swap: the text needs more than 720 bytes' };
            const p = clone(run.pkg); p.record.stream = LC.swapFrames(p.record.stream, 0);
            return { p, what: run.K === 2 && run.bytes < 1440 ? 'frames 0 and 1 swapped; frame 1 was the short last frame' : 'frames 0 and 1 swapped, both 720 bytes' };
        },
        T8: async () => { const p = clone(run.pkg), old = p.record.chainId; p.record.chainId = lastDigit(old); return { p, what: `chainId …${old.slice(-6)} → …${p.record.chainId.slice(-6)}` }; },
        T9: async () => {
            const frames = LC.framesStrict(run.pkg.record.stream);
            for (let k = 0; k < frames.length; k++) {
                const fr = frames[k], chunk = Uint8Array.from(BC.decodeChunk(fr.residual, fr.chunkLen)), fl = LC.silentFlips(fr.residual, chunk, 1);
                if (!fl.length) continue;
                const p = clone(run.pkg), s = p.record.stream, [, r0, rl] = LC.frameOffsets(s)[k];
                p.record.stream = s.slice(0, r0) + fl[0].alt + s.slice(r0 + rl);
                const where = fl[0].kind === 'escape' ? 'inside a raw-byte escape\'s rank code' : fl[0].kind === 'padding' ? 'in the padding after the last code' : 'elsewhere';
                return { p, what: `frame ${k}, hex digit ${fl[0].i}, bit ${fl[0].bit}, ${where}: the first silent flip in spike S4's order` };
            }
            return { skip: 'no single residual bit of any frame flips without changing the decode' };
        },
    };
    if (!make[name]) throw new RangeError('the tampers are ' + TAMPERS.join(', '));
    const r = await make[name]();
    if (r.skip) return { name, what: r.skip, skip: r.skip, verdict: null, owl: null, firstFail: null, unchanged: false, letters: '' };
    const v = await LC.verifyPackage(run.session, r.p, run.vopts), owl = EC.verifyBiochain(BC, r.p.record), first = v.checks.find(x => x.ok === false);
    return { name, what: r.what, verdict: v, verdictText: LC.verdictText(v), owl, firstFail: first ? { name: first.name, detail: first.detail } : null, unchanged: !!r.unchanged,
        letters: v.checks.map(c => (c.ok === true ? 'P' : c.ok === null ? '–' : 'F')).join('') };
}

// ================================================================== Engram Mind's Eye sessions (read only)
const ENGRAM_KEY = 'engram-minds-eye/session/1';
function readLocal() {
    try {
        const ls = typeof localStorage !== 'undefined' ? localStorage : null;
        if (!ls) return { found: false, error: 'this context has no localStorage' };
        const raw = ls.getItem(ENGRAM_KEY);
        if (raw === null) return { found: false };
        const s = JSON.parse(raw);
        if (s && s.version === 2 && Array.isArray(s.turns) && s.turns.length) return { found: true, turns: s.turns };
        if (s && Array.isArray(s.humans) && s.humans.length) return { found: true, turns: s.humans.filter(x => typeof x === 'string').map(text => ({ source: 'human', text })), note: 'an older session (v1): your words only' };
        return { found: false, error: 'the stored session is empty or not a session' };
    } catch (e) { return { found: false, error: e.message }; }
}
function importText(Lex, text) {
    const { EC, BC } = engramCores();
    const det = EC.detectImport(text);
    if (det.kind === 'lattice_seed' || det.kind === 'environment') {
        const e = new Error(`${det.kind === 'lattice_seed' ? 'a lattice seed' : 'an ENVIRONMENT/1 object'} is not a dialogue; open it on Engram Mind's Eye's 3D page`);
        e.kind = det.kind;
        throw e;
    }
    const imp = EC.importAny(text, { BC });
    return importTurns(Lex, imp.turns, imp.label, imp);
}
function importTurns(Lex, turns, label, imp = null) {
    const { EC } = engramCores();
    if (!Array.isArray(turns) || !turns.length) throw new Error('no turns to import');
    const live = EC.liveOf(turns), P = live.chain.packets, memo = new Map();
    const an = s => { if (!memo.has(s)) memo.set(s, Lex.analyse(s)); return memo.get(s); };
    const turnOf = new Array(P.length);
    const T = live.turns.map((t, j) => {
        for (let k = t.first; k < t.first + t.count; k++) turnOf[k] = j;
        const text = typeof t.text === 'string' ? t.text : t.tokens ? t.tokens.join(' ') : null;
        return { source: t.source, first: t.first, count: t.count, text: text === null ? undefined : text, grids: !!t.grids, analysis: text === null ? null : an(text) };
    });
    const packets = P.map((p, k) => {
        const grid = !!live.turns[turnOf[k]].grids;
        return { index: k, turn: turnOf[k], source: p.source, token: p.token, key: EC.hexLsb(p.grid), analysis: grid ? null : an(p.token), sameKey: [], differs: false };
    });
    const byKey = new Map();
    packets.forEach(p => { if (!byKey.has(p.key)) byKey.set(p.key, []); byKey.get(p.key).push(p.index); });
    const addr = p => (p.analysis ? p.analysis.tokens.map(t => t.key).join(' ') : null);
    for (const p of packets) {
        p.sameKey = byKey.get(p.key).filter(i => i !== p.index);
        const mine = addr(p);
        p.differs = mine !== null && p.sameKey.some(i => { const o = addr(packets[i]); return o !== null && o !== mine; });
    }
    const words = new Map();
    let toks = 0, syn = 0;
    for (const p of packets) {
        if (!p.analysis) continue;
        for (const t of p.analysis.tokens) {
            toks++; if (t.synset) syn++;
            let w = words.get(t.key);
            if (!w) { w = { key: t.key, bySource: {}, count: 0 }; words.set(t.key, w); }
            w.bySource[p.source] = (w.bySource[p.source] || 0) + 1; w.count++;
        }
    }
    return { kind: imp ? imp.kind : 'engram_local', label: label || (imp ? imp.label : 'this browser\'s Engram Mind\'s Eye session'), verified: imp ? imp.verified : null,
        checks: imp ? imp.checks : [], turns: T, packets, words: [...words.values()],
        summary: { packets: packets.length, textTurns: T.filter(t => t.analysis).length, gridPackets: packets.filter(p => !p.analysis).length, synsetShare: toks ? syn / toks : 0 } };
}

return {
    version: 'lexicon-pages-1',
    PINS, ROOTS, STEPS,
    parseNouns, parseMapA, buildLite, load,
    ratio, toDisk, placedOf, dyadic, pow2,
    shard: { TAMPERS, SAMPLE, CAP: SHARD.cap, CAP_ENGRAMS: SHARD.capEngrams, run: shardRun, tamper: shardTamper, webcrypto: subtleOk },
    engram: { KEY: ENGRAM_KEY, readLocal, importText, importTurns },
};
});
