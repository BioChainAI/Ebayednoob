// Hyperbolic Lexicon: the browser core (Phase 2; the chain section, Phase 3).
//
// One module that runs the lexicon's exact front end and geometry in a page or in Node, on the shared cores loaded
// unchanged (D1):
//   orbital_core.js     (scripts/geometric-build)   SHA-256 (sha256: Uint8Array -> Uint8Array(32)), toHex
//   hyperbolic_core.js  (Pages/Hyperbolic Oracles)  exact rationals Q, the norm-5 tree P, the shared Rng
//   decoder3d.js        (Pages/Hyperbolic Oracles)  TreeEmbedding3D: the exact H^3 tree (geometry half)
// The text half is a line-by-line twin of the Python reference's reference/lexicon/normalise.py and wordpiece.py
// (and of unicode_tables.py's lookups): the strict UTF-8 decoder, N_B with byte spans, WordPiece, LEB128, the id
// stream and L1's record. The geometry half (the section "geometry") is the twin of address.py, h3tree.py,
// h2exact.py, flat.py and rank.py (with wordnet.py's forest functions and phase2.py's float rankings): the L3 address
// rule and its controls, certifyWord, the D6 id codec, map A, exact H^3 points (decoder3d.js pointExact, and integer
// frames over 7^n), D3's exact H^2 tree with exact decoding, the canonical point list, rank lists with pessimistic AP,
// MAP and mean rank as exact rationals, and L4(b)'s float64 keys and inversions.
//
// Implements, in PREREGISTRATION.md: D5 (N_B on the pinned Unicode 15.1 table, failing closed on Cn; the JS never
// calls String.prototype.normalize, toLowerCase or \p{} -- the one exception is platformNormalise, L1's control 1);
// L1 with Amendment 1 items 1 and 2 (N_B, WordPiece, the id stream), Amendment 2 item 3 (the readings of N_B and of
// control 3), Amendment 4 items 1-3 (Node and Chromium as engines, L1's record, control 1 as spike S6 ran it); D3, D6,
// L3 with Amendment 1 items 4-6 and Amendment 2 item 3 (the rule, its controls, the codec, map A, the canonical point
// list), Amendment 4 item 4 (L3(f): pointExact for H^3, this core's H^2 tree), L4 with Amendment 1 item 5 and
// Amendment 4 items 5-6 (rank lists, exact AP and mean rank, the float64 key left to right, inversions, control 2's
// evaluator). The geometry takes WordNet as a wn object (reference/golden/wordnet_v1.cjs's load(), Node only); a page
// without one still runs points_v1.txt and the WordNet-free lines of address_v1.txt.
//
// Data: the table and V0 reach a page without fetch, so file:// works: data/unicode_15_1_v1.js and
// data/vocab_v0_lex0.js (written by reference/golden/make_js_data_v1.cjs) register their files' exact text in
// root.LexiconData. In Node the core reads reference/golden/ (and V1 from ~/.cache/hyperbolic-lexicon, or HL_CACHE)
// directly. Either way a table or vocabulary is refused unless its SHA-256 and size are the pinned ones (PINS).
//
// runParity(traces, vocabs, wn) checks this module against reference/traces/*.txt, one line per trace line
// (normalise_v1, wordpiece_v1, address_v1, points_v1, rank_v1). tests/parity-lexicon.cjs runs it in Node.
//
// Phase 4 adds, at the end of the geometry half and called by nothing above it, the twin of reference/lexicon/learned.py's
// snapping and exact ranking of learned tables (Amendment 10 items 6 and 11): snapTable, snapText and parseSnapText,
// SnapArm (Lorentz kappa_u(v) compared by BigInt cross-multiplication; Euclidean |n_u - n_v|^2), evaluateSnapped
// (APs, ranks and MAPs through rankQuery and mapExact unchanged), and l6TraceLines / l6ParitySections for
// reference/traces/l6_v1.txt, which tests/parity-lexicon.cjs runs after the other sections.
//
// The section "chain" (Phase 3, L8-L11, Amendment 7) is the twin of reference/lexicon/chain.py, records.py,
// manifest.py, attest.py and verify.py: growSync (Owl Academy's growBiochain, synchronous, field for field), the
// synthetic and gloss shards, the records LVOCAB/1, LADDR/1, LPREP/1 (Tier S and P), LCORPUS/1 and LGROW/1, RFC 6962
// with RFC 9162's proofs, the exact weave, ATTEST/1 (WebCrypto ECDSA P-256), the hardened verifier (verifyPackage) and
// chainTraceLines (reference/traces/chain_v1.txt). It runs on Engram Mind's Eye's biochain_v1.js (Owl's codec,
// verbatim) and engram_core.js, unchanged, which it looks up lazily: a page that does not load them (with twin3d.js,
// fence.js and ttmpt_core_v1.js, which engram_core.js needs) runs everything else as before.
//
// Load order in a page: orbital_core.js, hyperbolic_core.js, decoder3d.js, data/unicode_15_1_v1.js,
// data/vocab_v0_lex0.js, lexicon_core.js (the data files may also come after the core: they are read on first use).
// For the chain section also twin3d.js, fence.js (Hyperbolic Oracles), ttmpt_core_v1.js, engram_core.js and
// biochain_v1.js (Engram Mind's Eye), before the first chain call. In Node: require('./lexicon_core.js').
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        const fs = require('fs'), path = require('path'), os = require('os');
        // Node reads the pinned files themselves (as bytes, so nothing is decoded before the hash check)
        const cache = process.env.HL_CACHE || path.join(os.homedir(), '.cache', 'hyperbolic-lexicon');
        const nodeData = (name, src) => {
            const p = src.golden ? path.join(__dirname, 'reference', 'golden', src.golden) : path.join(cache, src.cache);
            return fs.existsSync(p) ? fs.readFileSync(p) : null;
        };
        // the chain section's cores, required on first use (Engram Mind's Eye: biochain_v1.js, engram_core.js)
        const chainNode = () => ({ BC: require('../Engram Minds Eye/biochain_v1.js'), EC: require('../Engram Minds Eye/engram_core.js') });
        module.exports = factory(require('../../scripts/geometric-build/orbital_core.js'), require('../Hyperbolic Oracles/hyperbolic_core.js'),
            require('../Hyperbolic Oracles/decoder3d.js'), nodeData, chainNode);
    } else root.LexiconCore = factory(root.OrbitalCore, root.HPCore, root.HPDecode3D, name => (root.LexiconData || {})[name],
        () => ({ BC: root.BiochainV1, EC: root.EngramCore }));
})(typeof self !== 'undefined' ? self : this, function (O, C, D3, dataSource, chainSource) {
'use strict';
if (!O || !C || !D3) throw new Error('lexicon_core.js needs orbital_core.js, hyperbolic_core.js and decoder3d.js first');

// ================================================================== pins (reference/golden/*.meta.json)
// The browser cannot read the meta files, so the pins are written here; tests/parity-lexicon.cjs checks that they
// equal the meta files.
const PINS = {
    unicode: { name: 'unicode_15_1_v1', sha256: '30bed6fbc1fec1f4382d212d7792de48d99f10713f728d28329f8d7506712229', bytes: 142624, version: '15.1.0' },
    V0: { name: 'vocab_v0_lex0', sha256: 'df22705601de2e425cd090edc5df05619ce4a08df336f40bf92a1ed59f9ca1ff', bytes: 55648, entries: 8192 },
    V1: { name: 'vocab_v1', sha256: '07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3', bytes: 231508, entries: 30522,
        revision: '86b5e0934494bd15c9632b12f734a8a67f723594' },
};
// where Node finds each file (pages use root.LexiconData[name] instead)
const SOURCES = {
    unicode_15_1_v1: { golden: 'unicode_15_1_v1.json' },
    vocab_v0_lex0: { golden: 'vocab_v0_lex0.txt' },
    vocab_v1: { cache: 'bert-base-uncased/' + PINS.V1.revision + '/vocab.txt' },
};
const dataOf = name => { const x = dataSource(name, SOURCES[name]); return x === undefined ? null : x; };

// ================================================================== bytes, hex, UTF-8
const HEX = Array.from({ length: 256 }, (_, i) => (i < 16 ? '0' : '') + i.toString(16));
function hex(bytes) { let s = ''; for (let i = 0; i < bytes.length; i++) s += HEX[bytes[i]]; return s; }
const hexs = b => (b.length ? hex(b) : '-');           // the traces' convention: '-' when empty
function fromHex(h) {
    if (h.length % 2) throw new Error('odd hex length');
    const out = new Uint8Array(h.length / 2);
    for (let i = 0; i < out.length; i++) {
        const v = parseInt(h.slice(2 * i, 2 * i + 2), 16);
        if (!(v >= 0) || HEX[v] !== h.slice(2 * i, 2 * i + 2)) throw new Error('not lower-case hex: ' + h.slice(2 * i, 2 * i + 2));
        out[i] = v;
    }
    return out;
}
const sha256Hex = bytes => O.toHex(O.sha256(bytes));

// UTF-8 of a list of code points (no surrogates: they have no UTF-8, as in Python's strict encoder)
function utf8FromCps(cps) {
    let n = 0;
    for (let i = 0; i < cps.length; i++) { const c = cps[i]; n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; }
    const out = new Uint8Array(n);
    let o = 0;
    for (let i = 0; i < cps.length; i++) {
        const c = cps[i];
        if (c < 0x80) out[o++] = c;
        else if (c < 0x800) { out[o++] = 0xC0 | (c >> 6); out[o++] = 0x80 | (c & 0x3F); }
        else if (c < 0x10000) {
            if (c >= 0xD800 && c <= 0xDFFF) throw new Error(`surrogate 0x${c.toString(16)} has no UTF-8`);
            out[o++] = 0xE0 | (c >> 12); out[o++] = 0x80 | ((c >> 6) & 0x3F); out[o++] = 0x80 | (c & 0x3F);
        } else if (c <= 0x10FFFF) {
            out[o++] = 0xF0 | (c >> 18); out[o++] = 0x80 | ((c >> 12) & 0x3F); out[o++] = 0x80 | ((c >> 6) & 0x3F); out[o++] = 0x80 | (c & 0x3F);
        } else throw new Error('not a code point: ' + c);
    }
    return out;
}
// the code points of a JS string (UTF-16 pairs joined; a lone surrogate is refused, as Python's encoder refuses it)
function cpsOf(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
        const u = s.charCodeAt(i);
        if (u >= 0xD800 && u <= 0xDBFF && i + 1 < s.length) {
            const v = s.charCodeAt(i + 1);
            if (v >= 0xDC00 && v <= 0xDFFF) { out.push(0x10000 + ((u - 0xD800) << 10) + (v - 0xDC00)); i++; continue; }
        }
        if (u >= 0xD800 && u <= 0xDFFF) throw new Error('lone surrogate at UTF-16 index ' + i);
        out.push(u);
    }
    return out;
}
const utf8 = s => utf8FromCps(cpsOf(s));
// a JS string from code points (String.fromCodePoint in chunks: it is spread over its arguments)
function fromCps(cps) {
    let s = '';
    for (let i = 0; i < cps.length; i += 4096) s += String.fromCodePoint.apply(null, Array.prototype.slice.call(cps, i, i + 4096));
    return s;
}
const toBytes = x => (typeof x === 'string' ? utf8(x) : x instanceof Uint8Array ? x : Uint8Array.from(x));

class InvalidUTF8 extends Error {
    // .offset: where the first ill-formed sequence starts (Python's UnicodeDecodeError.start)
    constructor(offset) { super(`invalid UTF-8 at byte offset ${offset}`); this.name = 'InvalidUTF8'; this.offset = offset; }
}

// The strict decoder of Unicode Table 3-7 (well-formed byte sequences). Decoding goes sequence by sequence, so the
// first ill-formed sequence starts where the last well-formed one ended: at a stray byte, or at the lead byte of a
// truncated or interrupted sequence. That is the offset reported, as CPython's UnicodeDecodeError.start.
// READING (Amendment 2 item 3): as in reference/lexicon/normalise.py; tests/parity-lexicon.cjs checks it against an
// independent Table 3-7 scanner and the traces' invalid cases.
// Returns the code points and each one's byte offset (starts has one more entry: the total).
function utf8Step(bytes, i) {                  // length of the well-formed sequence at i, or 0
    const n = bytes.length, b0 = bytes[i];
    if (b0 < 0x80) return 1;
    let need, lo = 0x80, hi = 0xBF;
    if (b0 >= 0xC2 && b0 <= 0xDF) need = 1;
    else if (b0 >= 0xE0 && b0 <= 0xEF) { need = 2; if (b0 === 0xE0) lo = 0xA0; else if (b0 === 0xED) hi = 0x9F; }
    else if (b0 >= 0xF0 && b0 <= 0xF4) { need = 3; if (b0 === 0xF0) lo = 0x90; else if (b0 === 0xF4) hi = 0x8F; }
    else return 0;                             // 80..C1, F5..FF never start a sequence
    for (let j = 1; j <= need; j++) {
        if (i + j >= n) return 0;
        const b = bytes[i + j];
        if (b < lo || b > hi) return 0;
        lo = 0x80; hi = 0xBF;                  // only the second byte has a narrowed range
    }
    return need + 1;
}
function decodeUtf8(bytes) {
    const n = bytes.length, cps = new Uint32Array(n), starts = new Int32Array(n + 1);
    let i = 0, k = 0;
    while (i < n) {
        const len = utf8Step(bytes, i);
        if (!len) throw new InvalidUTF8(i);
        const b0 = bytes[i];
        let c = len === 1 ? b0 : len === 2 ? b0 & 0x1F : len === 3 ? b0 & 0x0F : b0 & 0x07;
        for (let j = 1; j < len; j++) c = (c << 6) | (bytes[i + j] & 0x3F);
        starts[k] = i; cps[k++] = c; i += len;
    }
    starts[k] = n;
    return { cps: cps.subarray(0, k), starts: starts.subarray(0, k + 1) };
}
function utf8FirstBad(bytes) {                 // -1 when well-formed, else decodeUtf8's offset (allocates nothing)
    for (let i = 0; i < bytes.length;) { const len = utf8Step(bytes, i); if (!len) return i; i += len; }
    return -1;
}

// ================================================================== the pinned Unicode 15.1 table (unicode_tables.py)
// The only source of Unicode facts for N_B (D5). Nothing below reads the platform's Unicode.
const CATEGORIES = ['Lu', 'Ll', 'Lt', 'Lm', 'Lo', 'Mn', 'Mc', 'Me', 'Nd', 'Nl', 'No', 'Pc', 'Pd', 'Ps', 'Pe', 'Pi', 'Pf',
    'Po', 'Sm', 'Sc', 'Sk', 'So', 'Zs', 'Zl', 'Zp', 'Cc', 'Cf', 'Cs', 'Co', 'Cn'];
const UNK = '[UNK]';
// BERT's CJK ranges (_is_chinese_char), step 2; BERT's ASCII punctuation ranges (_is_punctuation), step 6.
const CJK_RANGES = [[0x4E00, 0x9FFF], [0x3400, 0x4DBF], [0x20000, 0x2A6DF], [0x2A700, 0x2B73F], [0x2B740, 0x2B81F],
    [0x2B820, 0x2CEAF], [0xF900, 0xFAFF], [0x2F800, 0x2FA1F]];
const ASCII_PUNCT_RANGES = [[0x21, 0x2F], [0x3A, 0x40], [0x5B, 0x60], [0x7B, 0x7E]];
// one flag byte per code point (normalise.py _flags)
const DROP = 1, SPACE = 2, CJK = 4, CN = 8, MN = 16, PUNCT = 32, NFDX = 64, LOW = 128;

function verifyPin(bytes, pin, what) {
    const digest = sha256Hex(bytes);
    if (digest !== pin.sha256 || bytes.length !== pin.bytes) {
        throw new Error(`${what}: sha256 ${digest} (${bytes.length} B) is not the pinned ${pin.sha256} (${pin.bytes} B)`);
    }
}

// The table from its file's text (or bytes), refused unless its SHA-256 and size are PINS.unicode's.
function tablesFromText(textOrBytes) {
    const bytes = toBytes(textOrBytes);
    verifyPin(bytes, PINS.unicode, 'unicode_15_1_v1.json');
    let text = '';                             // the file is ASCII (Python decodes it as 'ascii')
    for (let i = 0; i < bytes.length; i += 8192) {
        const part = bytes.subarray(i, i + 8192);
        for (let j = 0; j < part.length; j++) if (part[j] > 0x7F) throw new Error('the table is not ASCII');
        text += String.fromCharCode.apply(null, part);
    }
    const t = JSON.parse(text);
    if (t.unicode !== PINS.unicode.version) throw new Error(`table is Unicode ${t.unicode}, not ${PINS.unicode.version}`);
    return buildTables(t);
}

function buildTables(t) {
    const index = new Map(CATEGORIES.map((c, i) => [c, i]));
    // category_codes(): zero (Lu) where no range covers a code point, as in Python (the table covers all of them)
    const codes = new Uint8Array(0x110000);
    const gcStarts = [], gcValues = [];
    for (const [a, b, v] of t.gc) { codes.fill(index.get(v), a, b + 1); gcStarts.push(a); gcValues.push(v); }
    const category = cp => {                   // bisect_right(starts, cp) - 1, as unicode_tables.category
        let lo = 0, hi = gcStarts.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (cp < gcStarts[mid]) hi = mid; else lo = mid + 1; }
        return gcValues[lo - 1];
    };
    const lowerMap = new Map(t.lower.map(([cp, v]) => [cp, v]));
    const decompMap = new Map(t.decomp.map(([cp, v]) => [cp, v]));
    const cccMap = new Map();
    for (const [a, b, v] of t.ccc) for (let cp = a; cp <= b; cp++) cccMap.set(cp, v);
    const bitmap = ranges => { const m = new Uint8Array(0x110000); for (const [a, b] of ranges) m.fill(1, a, b + 1); return m; };
    const ign = bitmap(t.caseIgnorable), cas = bitmap(t.casedNotIgnorable);
    const whitespace = t.whitespace.slice();
    const h = t.hangul;
    const sb = h.sBase, lb = h.lBase, vb = h.vBase, tb = h.tBase, sc = h.lCount * h.vCount * h.tCount, nc = h.vCount * h.tCount, tc = h.tCount;
    function hangulNfd(cp) {                   // the algorithmic decomposition of a precomposed syllable, or null
        const s = cp - sb;
        if (!(s >= 0 && s < sc)) return null;
        if (s % tc) return [lb + Math.floor(s / nc), vb + Math.floor((s % nc) / tc), tb + s % tc];
        return [lb + Math.floor(s / nc), vb + Math.floor((s % nc) / tc)];
    }
    // full_decomp_map(): recursive canonical decomposition (Hangul included), before canonical ordering
    const fullDecomp = new Map();
    const rec = cp => {
        const hd = hangulNfd(cp);
        if (hd !== null) return hd;
        const d = decompMap.get(cp);
        if (d === undefined) return [cp];
        const r = [];
        for (const x of d) for (const y of rec(x)) r.push(y);
        return r;
    };
    for (const cp of decompMap.keys()) fullDecomp.set(cp, rec(cp));
    for (let cp = sb; cp < sb + sc; cp++) fullDecomp.set(cp, hangulNfd(cp));
    // _flags(): per category, then the overrides in normalise.py's order
    const perCat = CATEGORIES.map(c => {
        let f = 0;
        if (c[0] === 'C' && c !== 'Cn') f |= DROP;
        if (c === 'Zs') f |= SPACE;
        if (c === 'Cn') f |= CN;
        if (c === 'Mn') f |= MN;
        if (c[0] === 'P') f |= PUNCT;
        return f;
    });
    const flags = new Uint8Array(0x110000);
    for (let cp = 0; cp < 0x110000; cp++) flags[cp] = perCat[codes[cp]];
    for (const cp of [0x00, 0xFFFD]) flags[cp] |= DROP;
    for (const cp of [0x09, 0x0A, 0x0D]) flags[cp] = (flags[cp] & ~DROP) | SPACE;
    for (const cp of whitespace) flags[cp] |= SPACE;
    for (const [a, b] of CJK_RANGES) for (let cp = a; cp <= b; cp++) flags[cp] |= CJK;
    for (const [a, b] of ASCII_PUNCT_RANGES) for (let cp = a; cp <= b; cp++) flags[cp] |= PUNCT;
    for (const cp of fullDecomp.keys()) flags[cp] |= NFDX;
    for (const cp of cccMap.keys()) flags[cp] |= NFDX;
    for (const cp of lowerMap.keys()) flags[cp] |= LOW;
    return {
        unicode: t.unicode, sha256: PINS.unicode.sha256, codes, flags, lowerMap, decompMap, fullDecomp, cccMap, ign, cas, whitespace,
        category, hangulNfd,
        lower: cp => lowerMap.get(cp) || [cp],
        decomposition: cp => decompMap.get(cp) || null,
        ccc: cp => cccMap.get(cp) || 0,
        caseIgnorable: cp => ign[cp] === 1,
        casedNotIgnorable: cp => cas[cp] === 1,
    };
}

let TABLES = null;
function tables() {                            // the pinned table, read on first use
    if (!TABLES) {
        const x = dataOf(PINS.unicode.name);
        if (x === null) throw new Error('no Unicode table: load data/unicode_15_1_v1.js (or run in Node beside reference/golden)');
        TABLES = tablesFromText(x);
    }
    return TABLES;
}

// ================================================================== N_B (normalise.py; Amendment 1 item 1)
// The result of N_B on one input: words, fail-closed flags, byte spans, per-code-point source indices (into the
// decoded input), the input's code-point byte offsets, and each word's code points (for WordPiece).
class NB {
    constructor(words, failed, spans, src, starts, wcps) {
        this.words = words; this.failed = failed; this.spans = spans; this.src = src; this.starts = starts; this.wcps = wcps;
    }
    cpSpan(i) { return [this.starts[i], this.starts[i + 1]]; }      // byte span of input code point i
    get cpSpans() { return this.src.map(s => s.map(i => this.cpSpan(i))); }
    get text() { return this.words.join(' '); }
    get textBytes() {                          // UTF-8 of the words joined by U+0020, built from their code points
        const parts = [];
        this.words.forEach((w, k) => { if (k) parts.push([0x20]); parts.push(this.failed[k] ? cpsOf(UNK) : this.wcps[k]); });
        const all = [];
        for (const p of parts) for (const c of p) all.push(c);
        return utf8FromCps(all);
    }
}

// CPython's handle_capital_sigma inside one token: a cased code point before (case-ignorable ones skipped) and none
// after (the same skip). cas is "cased and not case-ignorable", so a code point in both sets is skipped.
function finalSigma(cps, k, ign, cas) {
    let j = k - 1;
    while (j >= 0 && ign[cps[j]]) j--;
    if (j < 0 || !cas[cps[j]]) return false;
    j = k + 1;
    const n = cps.length;
    while (j < n && ign[cps[j]]) j++;
    return j === n || !cas[cps[j]];
}

// Step 5's three parts on one token (cps with their source indices), shared by nb and tableLowerNfdDropMn.
function lowerToken(T, cps, src) {            // CPython 3.13 str.lower: full mappings, Final_Sigma
    const lc = [], ls = [];
    for (let k = 0; k < cps.length; k++) {
        const c = cps[k];
        if (c === 0x3A3) {                     // decided on the code points before lowering, as CPython does
            lc.push(finalSigma(cps, k, T.ign, T.cas) ? 0x3C2 : 0x3C3);
            ls.push(src[k]);
            continue;
        }
        const m = T.lowerMap.get(c);
        if (m === undefined) { lc.push(c); ls.push(src[k]); }
        else for (const x of m) { lc.push(x); ls.push(src[k]); }   // U+0130 -> i + U+0307, both from the one input
    }
    return [lc, ls];
}
function nfdToken(T, cps, src) {              // recursive decomposition, then stable canonical ordering by ccc
    const pc = [], ps = [];
    for (let k = 0; k < cps.length; k++) {
        const d = T.fullDecomp.get(cps[k]);
        if (d === undefined) { pc.push(cps[k]); ps.push(src[k]); }
        else for (const x of d) { pc.push(x); ps.push(src[k]); }
    }
    // each maximal run of code points listed in the ccc table is sorted stably by its class (insertion sort is
    // stable, as Python's sorted is)
    const ccc = T.cccMap, n = pc.length;
    let i = 0;
    while (i < n) {
        if (!ccc.has(pc[i])) { i++; continue; }
        let j = i + 1;
        while (j < n && ccc.has(pc[j])) j++;
        for (let a = i + 1; a < j; a++) {
            const c = pc[a], s = ps[a], v = ccc.get(c);
            let b = a - 1;
            while (b >= i && ccc.get(pc[b]) > v) { pc[b + 1] = pc[b]; ps[b + 1] = ps[b]; b--; }
            pc[b + 1] = c; ps[b + 1] = s;
        }
        i = j;
    }
    return [pc, ps];
}
function dropMn(F, cps, src) {
    const kc = [], ks = [];
    for (let k = 0; k < cps.length; k++) if (!(F[cps[k]] & MN)) { kc.push(cps[k]); ks.push(src[k]); }
    return [kc, ks];
}
const orFlags = (F, cps) => { let f = 0; for (let k = 0; k < cps.length; k++) f |= F[cps[k]]; return f; };
const minOf = a => { let m = a[0]; for (let k = 1; k < a.length; k++) if (a[k] < m) m = a[k]; return m; };
const maxOf = a => { let m = a[0]; for (let k = 1; k < a.length; k++) if (a[k] > m) m = a[k]; return m; };

// N_B on a UTF-8 byte string (Uint8Array, Buffer or array of bytes). stripAccents = false is L1's control 3.
// READING (Amendment 2 item 3): stripAccents = false skips NFD and the Mn removal together and keeps the lowercase.
function nb(data, stripAccents = true) {
    const bytes = toBytes(data);
    const T = tables(), F = T.flags;
    const { cps: s, starts } = decodeUtf8(bytes);
    // Steps 1-3: whitespace tokens as code points with their source indices, and the OR of their flags.
    const tokens = [];
    let tc = [], ts = [], tflags = 0;          // the token being built: code points, source indices, flags
    for (let i = 0; i < s.length; i++) {
        const c = s[i], f = F[c];
        if (!(f & (DROP | SPACE | CJK))) { tc.push(c); ts.push(i); tflags |= f; continue; }
        if (f & DROP) continue;
        if (tc.length) { tokens.push([tc, ts, tflags]); tc = []; ts = []; tflags = 0; }
        if (f & CJK) tokens.push([[c], [i], f]);
    }
    if (tc.length) tokens.push([tc, ts, tflags]);

    const words = [], failed = [], spans = [], wsrc = [], wcps = [];
    const span = (i, j) => [starts[i], starts[j + 1]];
    for (let [cps, src, tf] of tokens) {
        if (tf & CN) {
            // Step 4: fail closed. src is increasing, so its ends give the smallest start and the largest end.
            words.push(UNK); failed.push(true); spans.push(span(src[0], src[src.length - 1])); wsrc.push([]); wcps.push([]);
            continue;
        }
        if (tf & LOW) { [cps, src] = lowerToken(T, cps, src); tf = orFlags(F, cps); }
        if (stripAccents && (tf & NFDX)) { [cps, src] = nfdToken(T, cps, src); tf = orFlags(F, cps); }
        if (stripAccents && (tf & MN)) [cps, src] = dropMn(F, cps, src);
        // Step 6: punctuation is a word of its own; the runs between are words; empty words are dropped.
        const pieces = [];
        if (!(tf & PUNCT)) { if (cps.length) pieces.push([cps, src]); }
        else {
            let a = 0;
            for (let k = 0; k < cps.length; k++) {
                if (F[cps[k]] & PUNCT) {
                    if (k > a) pieces.push([cps.slice(a, k), src.slice(a, k)]);
                    pieces.push([cps.slice(k, k + 1), src.slice(k, k + 1)]);
                    a = k + 1;
                }
            }
            if (a < cps.length) pieces.push([cps.slice(a), src.slice(a)]);
        }
        for (const [pc, ps] of pieces) {
            words.push(fromCps(pc)); failed.push(false); spans.push(span(minOf(ps), maxOf(ps))); wsrc.push(ps); wcps.push(pc);
        }
    }
    return new NB(words, failed, spans, wsrc, starts, wcps);
}

// N1, the registered fallback (D5), registered only if L1 is refuted: the bytes as given, a leading BOM stripped,
// CRLF to LF, ASCII A-Z lowercased.
function n1(data) {
    let b = toBytes(data);
    if (b.length >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) b = b.subarray(3);
    const out = [];
    for (let i = 0; i < b.length; i++) {
        if (b[i] === 0x0D && b[i + 1] === 0x0A) { out.push(0x0A); i++; continue; }
        out.push(b[i] >= 0x41 && b[i] <= 0x5A ? b[i] + 0x20 : b[i]);
    }
    return Uint8Array.from(out);
}

// ================================================================== WordPiece (wordpiece.py; Amendment 1 item 2)
const SPECIALS = ['[PAD]', '[UNK]', '[CLS]', '[SEP]', '[MASK]'];
const MAX_CHARS = 100;                         // BERT's max_input_chars_per_word, in code points

class Vocab {
    // entries in id order (each distinct, non-empty, without LF); [UNK] required
    constructor(entries, name = null) {
        this.entries = Array.from(entries);
        this.ids = new Map();
        this.entries.forEach((e, i) => {
            if (this.ids.has(e)) throw new Error(`duplicate vocabulary entry ${JSON.stringify(e)} at ids ${this.ids.get(e)} and ${i}`);
            if (e === '' || e.includes('\n')) throw new Error(`bad vocabulary entry ${JSON.stringify(e)} at id ${i}`);
            this.ids.set(e, i);
        });
        if (!this.ids.has(UNK)) throw new Error('the vocabulary has no [UNK]');
        this.unk = this.ids.get(UNK);
        this.name = name;
        this.maxLen = Math.max(...this.entries.map(e => cpsOf(e).length));   // bounds the match loop; changes no result
        this.memo = [new Map(), new Map()];    // per word, longest-first and shortest-first
    }
    // one entry per line, LF after each, id = line number (strict UTF-8, as Python's blob.decode('utf-8'))
    static fromBytes(bytes, name = null) {
        const { cps } = decodeUtf8(toBytes(bytes));
        if (!cps.length || cps[cps.length - 1] !== 0x0A) throw new Error('a vocabulary file ends with LF');
        const entries = [];
        let a = 0;
        for (let k = 0; k < cps.length; k++) if (cps[k] === 0x0A) { entries.push(fromCps(cps.subarray(a, k))); a = k + 1; }
        return new Vocab(entries, name);
    }
    toBytes() { const all = []; for (const e of this.entries) { for (const c of cpsOf(e)) all.push(c); all.push(0x0A); } return utf8FromCps(all); }
    get sha256() { return sha256Hex(this.toBytes()); }
    get size() { return this.entries.length; }
    // the pieces of one N_B word as [id, piece, cpStart, cpEnd] (memoised per word); cps: the word's code points
    word(w, shortest = false, cps = null) {
        const memo = this.memo[shortest ? 1 : 0];
        let hit = memo.get(w);
        if (hit === undefined) { hit = wordpiece(w, cps || cpsOf(w), this.ids, this.unk, this.maxLen, shortest); memo.set(w, hit); }
        return hit;
    }
}

// BERT's WordpieceTokenizer on one word, counting characters as code points; shortest = true is L1's control 2.
function wordpiece(w, cps, ids, unk, maxLen, shortest) {
    const n = cps.length;
    if (n > MAX_CHARS) return [[unk, UNK, 0, n]];
    const u = new Array(n + 1);                // UTF-16 offset of each code-point boundary, to slice w
    u[0] = 0;
    for (let k = 0; k < n; k++) u[k + 1] = u[k] + (cps[k] > 0xFFFF ? 2 : 1);
    const sub = (a, b) => (a === 0 ? w.slice(u[a], u[b]) : '##' + w.slice(u[a], u[b]));
    const out = [];
    let start = 0;
    while (start < n) {
        let hit = null;
        if (shortest) {
            for (let end = start + 1; end <= Math.min(n, start + maxLen); end++) {
                const p = sub(start, end), i = ids.get(p);
                if (i !== undefined) { hit = [i, p, start, end]; break; }
            }
        } else {
            for (let end = Math.min(n, start + maxLen); end > start; end--) {
                const p = sub(start, end), i = ids.get(p);
                if (i !== undefined) { hit = [i, p, start, end]; break; }
            }
        }
        if (hit === null) return [[unk, UNK, 0, n]];
        out.push(hit);
        start = hit[3];
    }
    return out;
}

// WordPiece over an N_B result: ids, pieces and byte spans (a piece's span: the smallest start and largest end of
// its code points' source spans; a whole word's piece and an [UNK] word take the word's span).
function encodeNb(r, vocab, shortest = false) {
    const ids = [], pieces = [], spans = [];
    for (let k = 0; k < r.words.length; k++) {
        const w = r.words[k], sp = r.spans[k], src = r.src[k];
        if (r.failed[k]) { ids.push(vocab.unk); pieces.push(UNK); spans.push(sp); continue; }
        const n = r.wcps[k].length;
        for (const [i, piece, a, b] of vocab.word(w, shortest, r.wcps[k])) {
            ids.push(i); pieces.push(piece);
            if (a === 0 && b === n) spans.push(sp);
            else { const part = src.slice(a, b); spans.push([r.cpSpan(minOf(part))[0], r.cpSpan(maxOf(part))[1]]); }
        }
    }
    return { ids, pieces, spans };
}
// N_B, then WordPiece, of one UTF-8 instance
function encode(data, vocab, { shortest = false, stripAccents = true } = {}) { return encodeNb(nb(data, stripAccents), vocab, shortest); }

// unsigned LEB128: seven bits per byte, low bits first, top bit set on all but the last byte
function leb128(ids) {
    const out = [];
    for (let x of ids) {
        if (!(Number.isSafeInteger(x) && x >= 0)) throw new Error('LEB128 here is unsigned (and a safe integer)');
        for (;;) { const b = x % 128; x = Math.floor(x / 128); if (x) out.push(b | 0x80); else { out.push(b); break; } }
    }
    return Uint8Array.from(out);
}
// Amendment 1 item 2: over the instances in order, LEB128(number of ids) then LEB128 of each id
function idStream(idLists) {
    const parts = [];
    let n = 0;
    for (const ids of idLists) { const a = leb128([ids.length]), b = leb128(ids); parts.push(a, b); n += a.length + b.length; }
    const out = new Uint8Array(n);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
}

// L1's record (Amendment 4 item 2): the normalised text as UTF-8 hex, TAB, the pieces separated by single spaces,
// each id,start,end,hex (the piece's UTF-8 hex), or '-' when there is none. The twin of the reference's
// lexicon/phase2.py record_of and record (shortest: control 2; stripAccents = false: control 3).
// READING: empty text is written '-', as traces/normalise_v1.txt writes the same field (hexs) and as the reference's
// record_of reads it (so an instance with no words has the record '-' TAB '-'). An instance that is not valid UTF-8
// has no record: InvalidUTF8 is thrown, as the reference raises (no L1 instance is invalid).
function piecesField(e) {
    let s = '';
    for (let k = 0; k < e.ids.length; k++) s += (k ? ' ' : '') + e.ids[k] + ',' + e.spans[k][0] + ',' + e.spans[k][1] + ',' + hex(utf8(e.pieces[k]));
    return s || '-';
}
function recordNb(r, vocab, shortest = false) { return hexs(r.textBytes) + '\t' + piecesField(encodeNb(r, vocab, shortest)); }
function record(data, vocab, { shortest = false, stripAccents = true } = {}) { return recordNb(nb(data, stripAccents), vocab, shortest); }
// an instance's digest (phase2.py sha_hex: SHA-256 of the record's UTF-8) and a list's (list_digest: SHA-256 of the
// lines, LF after each)
const recordSha256 = rec => sha256Hex(utf8(rec));
const listDigest = lines => sha256Hex(utf8(lines.map(x => x + '\n').join('')));

// the pinned vocabularies, each refused unless its SHA-256, size and entry count are the pins
function vocabFromText(textOrBytes, tag) {
    const pin = PINS[tag];
    if (!pin || !pin.entries) throw new Error('no pinned vocabulary ' + tag);
    const bytes = toBytes(textOrBytes);
    verifyPin(bytes, pin, `vocabulary ${tag}`);
    const v = Vocab.fromBytes(bytes, tag);
    if (v.size !== pin.entries) throw new Error(`vocabulary ${tag} has ${v.size} entries, not ${pin.entries}`);
    return v;
}
const VOCABS = {};
function loadVocab(tag) {
    if (!VOCABS[tag]) {
        const x = dataOf(PINS[tag].name);
        if (x === null) throw new Error(`vocabulary ${tag} is not available (${tag === 'V0' ? 'load data/vocab_v0_lex0.js' : 'not cached: run reference/golden/make_vocab_v1.py'})`);
        VOCABS[tag] = vocabFromText(x, tag);
    }
    return VOCABS[tag];
}
const loadV0 = () => loadVocab('V0');
const loadV1 = () => loadVocab('V1');
const v1Available = () => !!VOCABS.V1 || dataOf(PINS.V1.name) !== null;

// ================================================================== the trace lines (reference/traces_text.py)
function normaliseLine(name, data) {
    let r;
    try { r = nb(data); } catch (e) {
        if (e instanceof InvalidUTF8) return [name, hexs(data), 'invalid@' + e.offset, '-', '-'].join('\t');
        throw e;
    }
    let words = '';
    for (let k = 0; k < r.words.length; k++) {
        words += (k ? ' ' : '') + r.spans[k][0] + ',' + r.spans[k][1] + ',' + (r.failed[k] ? '!' : hex(utf8FromCps(r.wcps[k])));
    }
    return [name, hexs(data), 'ok', hexs(r.textBytes), words || '-'].join('\t');
}
function wordpieceLine(name, tag, r, vocab) { return [name, tag, piecesField(encodeNb(r, vocab))].join('\t'); }

// ================================================================== L1 control 1 (the platform's own functions)
// Spike S6's platform normaliser, verbatim: the one place in this file that calls the platform's Unicode
// (tests/parity-lexicon.cjs checks that nothing else does). It must differ from the table on a case of (c).
function platformNormalise(s) { return s.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, ''); }
// What S6 compared it with: R(s) = drop Mn(NFD(s.lower())), here on the pinned table.
// READING: on the whole string, as S6's R(s): no step 1-4 (nothing dropped, no whitespace tokens, no fail-closed),
// Final_Sigma decided over the whole string as CPython's str.lower does; a JS string in, a JS string out.
function tableLowerNfdDropMn(s) {
    const T = tables();
    let cps = cpsOf(s), src = cps.map((_, i) => i);
    [cps, src] = lowerToken(T, cps, src);
    [cps, src] = nfdToken(T, cps, src);
    [cps, src] = dropMn(T.flags, cps, src);
    return fromCps(cps);
}

// ================================================================== text parity with the reference
// Each check is one line: { section, label, ok, detail } (skip: true when it could not run). traces holds the trace
// files' texts ({ normalise, wordpiece }); vocabs = { V0, V1 } (V1 may be null: its lines are then skipped).
const dataLines = text => text.split('\n').filter(l => l && !l.startsWith('#'));
const short = (s, n = 160) => (s.length > n ? s.slice(0, n) + '…' : s);
function firstDiff(want, got) {
    let i = 0;
    while (i < want.length && want[i] === got[i]) i++;
    return `at char ${i}: trace "${short(want.slice(Math.max(0, i - 20)), 80)}" vs core "${short(got.slice(Math.max(0, i - 20)), 80)}"`;
}
function textParitySections(traces, vocabs) {
    const line = (section, label, ok, detail = '') => ({ section, label, ok: !!ok, detail });
    const ctx = {};
    const cases = () => {                       // [name, bytes] of every case, in the normaliser trace's order
        if (!ctx.cases) ctx.cases = dataLines(traces.normalise).map(l => { const f = l.split('\t'); return [f[0], f[1] === '-' ? new Uint8Array(0) : fromHex(f[1])]; });
        return ctx.cases;
    };
    const nbOf = () => {                        // N_B of each valid case (null when invalid), computed once
        if (!ctx.nb) ctx.nb = new Map(cases().map(([name, data]) => { try { return [name, nb(data)]; } catch (e) { if (e instanceof InvalidUTF8) return [name, null]; throw e; } }));
        return ctx.nb;
    };
    const wordpieceSection = tag => ({ name: `wordpiece_v1.txt (${tag})`, run() {
        const out = [], v = vocabs[tag], lines = dataLines(traces.wordpiece).filter(l => l.split('\t')[1] === tag);
        const header = traces.wordpiece.split('\n').find(l => l.startsWith(`# vocab ${tag}:`));
        if (!v) return lines.map(l => ({ section: tag, label: l.split('\t')[0], ok: false, skip: true, detail: `${tag} is not available` }));
        const want = `# vocab ${tag}: ${v.size} entries, sha256 ${v.sha256}`;
        out.push(line(tag, 'header', header === want, header === want ? `${v.size} entries` : `trace "${header}" vs core "${want}"`));
        const nbs = nbOf(), byName = new Map();
        for (const l of lines) byName.set(l.split('\t')[0], l);
        const stream = [];
        for (const [name] of cases()) {
            const r = nbs.get(name);
            if (r === null) { if (byName.has(name)) out.push(line(tag, name, false, 'the trace has a line for an invalid case')); continue; }
            const got = wordpieceLine(name, tag, r, v), want = byName.get(name);
            stream.push(encodeNb(r, v).ids);
            if (want === undefined) { out.push(line(tag, name, false, 'no trace line')); continue; }
            out.push(line(tag, name, got === want, got === want ? short(got.split('\t')[2], 60) : firstDiff(want, got)));
        }
        const s = idStream(stream), got = ['idstream', tag, String(stream.length), String(s.length), sha256Hex(s)].join('\t');
        const wantS = lines.find(l => l.startsWith('idstream\t'));
        out.push(line(tag, 'idstream', got === wantS, got === wantS ? `${stream.length} cases, ${s.length} B, sha256 ${got.split('\t')[4].slice(0, 16)}…` : `trace "${wantS}" vs core "${got}"`));
        const extra = lines.filter(l => { const n = l.split('\t')[0]; return n !== 'idstream' && !nbs.has(n); });
        if (extra.length) out.push(line(tag, 'extra lines', false, `${extra.length} trace lines name no case`));
        return out;
    } });
    return [
        { name: 'normalise_v1.txt', run() {
            const out = [], header = traces.normalise.split('\n').find(l => l.startsWith('# N_B = '));
            out.push(line('N_B', 'table pin in the header', !!header && header.endsWith(`(sha256 ${tables().sha256})`), PINS.unicode.sha256.slice(0, 16) + '…'));
            for (const want of dataLines(traces.normalise)) {
                const f = want.split('\t'), got = normaliseLine(f[0], f[1] === '-' ? new Uint8Array(0) : fromHex(f[1]));
                out.push(line('N_B', f[0], got === want, got === want ? short(f.slice(2).join(' '), 60) : firstDiff(want, got)));
            }
            return out;
        } },
        wordpieceSection('V0'),
        wordpieceSection('V1'),
    ];
}

// ===== geometry
// The geometry half: a line-by-line twin of reference/lexicon/address.py, h3tree.py, h2exact.py, flat.py and rank.py
// (with wordnet.py's forest functions and phase2.py's float rankings), on hyperbolic_core.js's P (the norm-5 tree), Q
// (exact rationals over BigInt) and Rng, and decoder3d.js's TreeEmbedding3D. Words are arrays of letters 0..5 (the
// generators 1 +- 2i, 1 +- 2j, 1 +- 2k); exact integers are BigInt throughout; a forest is passed as Maps, the shape
// reference/golden/wordnet_v1.cjs gives (wn.synsets[pos]: offset -> { ptrs: [{ sym, offset, pos }], ... }).
// Implements, in PREREGISTRATION.md: L3's rule and its controls, (c) certifyWord, (e) exact points (H^3 by
// decoder3d.js pointExact, t = 3/4, and by integer frames over 7^n; H^2 by D3's tree, t = 11/13), (f) the canonical
// point list (Amendment 1 item 6; Amendment 4 item 4), (g) D6's id codec; L4(a)'s rank lists and exact AP, MAP and
// mean rank (Amendment 1 item 5; Amendment 2 item 3; Amendment 4 item 5); L4(b)'s float64 ranking and its two
// controls' evaluators (Amendment 4 item 6); map A (Amendment 1 item 4, Amendment 2 item 3). Nothing here runs a claim.
const { Q, P } = C;
const absB = a => (a < 0n ? -a : a);
function gcdB(a, b) { a = absB(a); b = absB(b); while (b) { const t = a % b; a = b; b = t; } return a; }
const bitLength = a => { a = absB(a); return a === 0n ? 0 : a.toString(2).length; };   // Python's int.bit_length
const powB = (b, n) => BigInt(b) ** BigInt(n);
const cmpBig = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sameWord = (a, b) => a.length === b.length && a.every((g, i) => g === b[i]);
const cmpWord = (a, b) => {                    // Python's tuple order: letter by letter, a proper prefix first
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return a.length - b.length;
};
const maxLength = words => words.reduce((m, w) => Math.max(m, w.length), 0);   // no spread: 82,115 words
const asMap = m => (m instanceof Map ? m : new Map(Object.entries(m)));
// the bytes of a text that is ASCII in practice (rank lists, point lists), without a code-point pass
function textBytes(s) {
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c > 0x7F) return utf8(s); b[i] = c; }
    return b;
}
function bisectLeft(S, x) { let lo = 0, hi = S.length; while (lo < hi) { const m = (lo + hi) >> 1; if (S[m] < x) lo = m + 1; else hi = m; } return lo; }
function bisectRight(S, x) { let lo = 0, hi = S.length; while (lo < hi) { const m = (lo + hi) >> 1; if (x < S[m]) hi = m; else lo = m + 1; } return lo; }
// Python's stable sorted(range(n), key=keys.__getitem__) on BigInt keys: ties keep index order
const orderByKey = keys => keys.map((_, i) => i).sort((a, b) => cmpBig(keys[a], keys[b]));

// ------------------------------------------------------------------ the forests (wordnet.py)
const POS = ['noun', 'verb', 'adj', 'adv'];
const ENTITY = '00001740', MAMMAL = '01861778';
// the L3 spanning parent: the first '@' (hypernym) or '@i' (instance hypernym) pointer of the data line
function spanningParent(syn) { for (const p of syn.ptrs) if (p.sym === '@' || p.sym === '@i') return p.offset; return null; }
function closureParents(syn) { return syn.ptrs.filter(p => p.sym === '@' || p.sym === '@i').map(p => p.offset); }
// parent (offset -> offset or null), children (offset -> offsets sorted), roots (sorted). Offsets are 8-digit ASCII,
// so the default string sort is Python's.
function spanningForest(map) {
    const parent = new Map(), children = new Map(), roots = [];
    for (const [off, syn] of asMap(map)) {
        const p = spanningParent(syn);
        parent.set(off, p);
        if (p === null) roots.push(off); else { if (!children.has(p)) children.set(p, []); children.get(p).push(off); }
    }
    for (const list of children.values()) list.sort();
    roots.sort();
    return { parent, children, roots };
}
// every node's ancestors in the hypernym + instance-hypernym closure (multiple inheritance kept)
function closure(map) {
    map = asMap(map);
    const anc = new Map();
    const visit = off => {
        if (anc.has(off)) return anc.get(off);
        const s = new Set();
        anc.set(off, s);
        for (const p of closureParents(map.get(off))) { s.add(p); for (const a of visit(p)) s.add(a); }
        return s;
    };
    for (const off of map.keys()) visit(off);
    return anc;
}
function descendants(anc) {
    const desc = new Map();
    for (const off of anc.keys()) desc.set(off, new Set());
    for (const [off, a] of anc) for (const x of a) desc.get(x).add(off);
    return desc;
}

// ------------------------------------------------------------------ the L3 rule and its controls (address.py)
const VARIANTS = ['rule', 'zero', 'trunc'];
const NOUN_ROOT = [0], VERB_ROOT = [1];
const ID59_MAX_LEN = 25, ID64_MAX_LEN = 27;
// ceil(log5 c) in integers, without the max(1, .): 0 for a single child (L3 control 1)
function lettersForZero(c) { let m = 0, p = 1; while (p < c) { p *= 5; m++; } return m; }
// max(1, ceil(log5 c)): the least m with 5^m >= c, at least 1
const lettersFor = c => Math.max(1, lettersForZero(c));
// The word of child k (0-based, in offset order) of a node with c children. 'rule': the L3 rule; 'zero' (control 1):
// m = ceil(log5 c), so an only child shares its parent's word; 'trunc' (control 2): children beyond the fifth folded
// into the fifth.
function childWord(parentWord, k, c, variant = 'rule') {
    if (!(Number.isInteger(k) && Number.isInteger(c) && k >= 0 && k < c)) throw new RangeError(`child ${k} of ${c}`);
    let m;
    if (variant === 'rule') m = lettersFor(c);
    else if (variant === 'zero') m = lettersForZero(c);
    // READING (Amendment 2 item 3, as address.py): every child takes one letter, the digit min(k, 4)
    else if (variant === 'trunc') { m = 1; k = Math.min(k, 4); }
    else throw new Error(`unknown variant ${variant}`);
    const digits = [];
    let x = k;
    for (let i = 0; i < m; i++) { digits.push(x % 5); x = Math.floor(x / 5); }
    if (x) throw new RangeError(`child ${k} does not fit ${m} letters`);
    const w = Array.from(parentWord);
    for (let i = digits.length - 1; i >= 0; i--) w.push(P.children(w)[digits[i]]);
    return w;
}
// offset -> word for a spanning forest. virtual false: one tree, its root at rootWord (the nouns: entity.n.01 at [0]);
// true: the roots, in offset order, are the children of a virtual root at rootWord by the rule (the verbs: 559 roots
// under [1]); null: false for a single root. The same stack walk as address.py, so the Map's order is its dict's.
function forestWords(parent, childrenOf, roots, rootWord, variant = 'rule', virtual = null) {
    parent = asMap(parent); childrenOf = asMap(childrenOf);
    if (virtual === null || virtual === undefined) virtual = roots.length !== 1;
    const rw = Array.from(rootWord);
    let stack;
    if (virtual) stack = roots.map((o, k) => [o, childWord(rw, k, roots.length, variant)]);
    else {
        if (roots.length !== 1) throw new Error(`a forest of ${roots.length} roots needs a virtual root`);
        stack = [[roots[0], rw]];
    }
    const out = new Map();
    while (stack.length) {
        const [o, w] = stack.pop();
        if (out.has(o)) throw new Error(`${o} reached twice: not a forest`);
        out.set(o, w);
        const ks = childrenOf.get(o) || [];
        ks.forEach((c, k) => {
            if (parent.get(c) !== o) throw new Error(`${c} is listed under ${o} but its parent is ${parent.get(c)}`);
            stack.push([c, childWord(w, k, ks.length, variant)]);
        });
    }
    if (out.size !== parent.size) throw new Error(`${parent.size - out.size} nodes are not reachable from the roots`);
    return out;
}
const WORDS_CACHE = new WeakMap();             // per wn object: 'noun:rule' -> words (do not mutate)
function cachedWords(wn, key, make) {
    if (!WORDS_CACHE.has(wn)) WORDS_CACHE.set(wn, new Map());
    const m = WORDS_CACHE.get(wn);
    if (!m.has(key)) m.set(key, make());
    return m.get(key);
}
// The L3 words of all noun synsets (entity.n.01 at [0]) and of the verb forest (Amendment 1 item 10: the roots under
// a virtual root at [1]), from a wn object as reference/golden/wordnet_v1.cjs's load() returns it.
function nounWords(wn, variant = 'rule') {
    return cachedWords(wn, 'noun:' + variant, () => {
        const { parent, children, roots } = spanningForest(wn.synsets.noun);
        if (roots.length !== 1 || roots[0] !== ENTITY) throw new Error(`the noun forest has roots ${roots.slice(0, 5)}..., not entity.n.01 alone`);
        return forestWords(parent, children, roots, NOUN_ROOT, variant, false);
    });
}
function verbWords(wn, variant = 'rule') {
    return cachedWords(wn, 'verb:' + variant, () => {
        const { parent, children, roots } = spanningForest(wn.synsets.verb);
        return forestWords(parent, children, roots, VERB_ROOT, variant, true);
    });
}
// A forest as aligned arrays in offset order: what the canonical point list and the rankings take.
function forestOf(wn, pos, variant = 'rule') {
    const words = pos === 'noun' ? nounWords(wn, variant) : pos === 'verb' ? verbWords(wn, variant) : null;
    if (!words) throw new Error('pos is noun or verb');
    const { parent, children, roots } = spanningForest(wn.synsets[pos]);
    const offsets = [...words.keys()].sort();
    return { pos, offsets, words: offsets.map(o => words.get(o)), wordOf: words, parent, children, roots };
}
const wordStr = w => w.join('');               // the canonical text of a word: its letters as digits ('0213')
// SHA-256 of the lines 'offset word' + LF in offset order (spike S3's verb.words.sha256)
function wordsSha256(words, offsets = null) {
    words = asMap(words);
    const offs = offsets || [...words.keys()].sort();
    return sha256Hex(textBytes(offs.map(o => `${o} ${wordStr(words.get(o))}\n`).join('')));
}

// ------------------------------------------------------------------ L3(c): certifyWord (address.py certify)
// The three checks of Amendment 1 item 6 with hyperbolic_core.js's P (the twins of hpstep.problems): the integer
// quaternion has norm exactly 5^len, right division returns the word, and the word is reduced. decoder3d.js's
// certifyWord(w, L) is the same conjunction; tests/parity-lexicon.cjs checks that they agree.
function certifyParts(word) {
    const q = P.wordQuaternion(word), n = word.length, rd = P.rightDivide(q, n);
    return [q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3] === powB(5, n), rd !== null && sameWord(rd, word), P.isReduced(word)];
}
const certify = word => certifyParts(word).every(Boolean);

// ------------------------------------------------------------------ D6: the bijective mixed-radix id (address.py)
// the number of reduced words shorter than n letters, the empty word included: 1 + 6 (5^(n-1) - 1) / 4
const startOf = n => (n === 0 ? 0n : 1n + 6n * (powB(5, n - 1) - 1n) / 4n);
// id(w) = (reduced words shorter than w) + (rank at its length: first letter base 6, then each later letter's index
// among children(word so far), base 5; the first letter most significant). READING (Amendment 2 item 3, as address.py):
// the empty word is id 0.
function wordId(word) {
    if (!word.length) return 0n;
    if (!(Number.isInteger(word[0]) && word[0] >= 0 && word[0] < 6)) throw new RangeError(`not a letter: ${word[0]}`);
    let r = BigInt(word[0]);
    for (let i = 1; i < word.length; i++) {
        const j = P.children([word[i - 1]]).indexOf(word[i]);   // children() depends on the last letter only
        if (j < 0) throw new RangeError(`letter ${i} (${word[i]}) is not a child of ${word[i - 1]}`);
        r = r * 5n + BigInt(j);
    }
    return startOf(word.length) + r;
}
function idWord(n) {
    n = BigInt(n);
    if (n < 0n) throw new RangeError('ids are non-negative');
    if (n === 0n) return [];
    let L = 1;
    while (startOf(L + 1) <= n) L++;
    let r = n - startOf(L);
    const idx = [];
    for (let i = 0; i < L - 1; i++) { idx.push(Number(r % 5n)); r /= 5n; }
    const w = [Number(r)];
    for (let i = idx.length - 1; i >= 0; i--) w.push(P.children(w)[idx[i]]);
    return w;
}
// L3(g): null for a word too long (not covered, never a failure)
const id59 = w => (w.length <= ID59_MAX_LEN ? wordId(w) : null);
const id64 = w => (w.length <= ID64_MAX_LEN ? wordId(w) : null);

// ------------------------------------------------------------------ L3(d): ancestors are exactly the proper prefixes
// A trie walk (Amendment 1 item 6). Returns the failures [offset, sorted met, sorted ancestors]; [] when (d) holds.
function prefixCheck(words, parent) {
    words = asMap(words); parent = asMap(parent);
    const END = -1, trie = new Map();
    for (const [o, w] of words) {
        let node = trie;
        for (const g of w) { if (!node.has(g)) node.set(g, new Map()); node = node.get(g); }
        if (!node.has(END)) node.set(END, []);
        node.get(END).push(o);
    }
    const fails = [];
    for (const [o, w] of words) {
        const met = [];
        let node = trie;
        for (let i = 0; i < w.length - 1; i++) { node = node.get(w[i]); const e = node.get(END); if (e) met.push(...e); }
        const anc = [];
        let p = parent.get(o);
        while (p !== null && p !== undefined) { anc.push(p); p = parent.get(p); }
        const sm = new Set(met), sa = new Set(anc);
        if (met.length !== anc.length || sm.size !== sa.size || [...sm].some(x => !sa.has(x))) fails.push([o, met.slice().sort(), anc.slice().sort()]);
    }
    return fails;
}

// ------------------------------------------------------------------ bits and canonical text (h3tree.py)
// each coordinate X_i / d in lowest terms, [p, q] with q >= 1 (0 is 0/1)
const coordsLowest = (X, d) => X.map(x => { const g = gcdB(x, d); return [x / g, d / g]; });
// Amendment 1 item 6 (f): 'p/q' in lowest terms (q written even when 1), space-joined
const coordsText = (X, d) => coordsLowest(X, d).map(([p, q]) => `${p}/${q}`).join(' ');
const qText = qs => qs.map(x => `${x.n}/${x.d}`).join(' ');           // the same text from Q values (already lowest)
const coordBits = (X, d) => coordsLowest(X, d).map(([p, q]) => [bitLength(p), bitLength(q)]);
function pointBits(X, d) {                     // over one common denominator: numerator bits plus denominator bits
    const lo = coordsLowest(X, d);
    let D = 1n;
    for (const [, q] of lo) D = D * q / gcdB(D, q);
    return lo.reduce((s, [p, q]) => s + bitLength(p * (D / q)), 0) + bitLength(D);
}

// ------------------------------------------------------------------ the sorted trie walk (h3tree.py walk)
// The state of every word, each distinct prefix computed once: step(state, prev, g, i) gives the state of
// word[:i + 1] from that of word[:i] (prev = word[i - 1], null at the root). Words are visited in sorted order with a
// stack of the previous word's prefix states.
function walk(words, state0, step) {
    const order = words.map((_, i) => i).sort((a, b) => cmpWord(words[a], words[b]));
    const out = new Array(words.length), stack = [state0];
    let prev = [];
    for (const j of order) {
        const w = words[j], lim = Math.min(w.length, prev.length);
        let k = 0;
        while (k < lim && w[k] === prev[k]) k++;
        stack.length = k + 1;
        for (let i = k; i < w.length; i++) stack.push(step(stack[stack.length - 1], i ? w[i - 1] : null, w[i], i));
        out[j] = stack[w.length];
        prev = w;
    }
    return out;
}

// ------------------------------------------------------------------ H^3: the octahedral tree, t = 3/4 (h3tree.py)
// decoder3d.js's TreeEmbedding3D is the authority (Amendment 1 item 6; Amendment 4 item 4 names its pointExact).
// Its exact steps times 7 are integer matrices (cosh tau = 25/7, sinh tau = 24/7, rotations are signed permutations),
// so a word of n letters has an integer frame over 7^n: h3Points builds those once per distinct prefix, for ranking
// and for speed. tests/parity-lexicon.cjs proves the two equal word by word.
const EMB3 = new D3.TreeEmbedding3D();         // t = 3/4: D3's tree, L3(e)
const H3_TAU = Math.log(7);
const int7 = M => M.map(row => row.map(x => { const y = x.mul(new Q(7n)); if (y.d !== 1n) throw new Error('7 times a step matrix is not integral'); return y.n; }));
const STEP7 = EMB3.stepQ.map(int7);            // STEP7[s] = 7 * decoder3d's exact step for OCTA direction s
const STEP7_INV = EMB3.stepInvQ.map(int7);     // 7 * J M^T J
const sparseColumns = M => M[0].map((_, j) => M.map((row, k) => [k, row[j]]).filter(([, x]) => x !== 0n));
const COLS7 = STEP7.map(sparseColumns);
if (!COLS7.every(cols => cols.every(t => t.length === 1 || t.length === 2))) throw new Error('a step column has more than two terms');
const slot3 = (prev, g) => (prev === null ? g : D3.slotDirection([prev], g));   // slotDirection reads the last letter only
function h3Step(F, prev, g) {                  // F (4 integer columns) times STEP7 of the slot of g after prev
    return COLS7[slot3(prev, g)].map(terms => {
        if (terms.length === 1) { const [k, c] = terms[0], a = F[k]; return [c * a[0], c * a[1], c * a[2], c * a[3]]; }
        const [[k1, c1], [k2, c2]] = terms, a = F[k1], b = F[k2];
        return [c1 * a[0] + c2 * b[0], c1 * a[1] + c2 * b[1], c1 * a[2] + c2 * b[2], c1 * a[3] + c2 * b[3]];
    });
}
const I4 = [[1n, 0n, 0n, 0n], [0n, 1n, 0n, 0n], [0n, 0n, 1n, 0n], [0n, 0n, 0n, 1n]];
const h3Frames = words => walk(words.map(w => Array.from(w)), I4, h3Step);
const h3Points = words => h3Frames(words).map(F => F[0]);   // x = X / 7^len: the frame's first column
const h3Point = word => h3Points([word])[0];
const h3Den = n => powB(7, n);
const h3OnSheet = (X, n) => X[0] > 0n && X[0] * X[0] - X[1] * X[1] - X[2] * X[2] - X[3] * X[3] === powB(49, n);
const h3Fractions = (X, n) => { const d = h3Den(n); return X.map(x => new Q(x, d)); };
// decoder3d.js's pointExact (the Q frame product, word by word) and its canonical text
const h3PointExact = word => EMB3.pointExact(Array.from(word));
const h3PointText = word => qText(h3PointExact(word));
// decoder3d.js's decodeExact on x = X / 7^n, to depth L (default n): the authority for L3(e)
const h3DecodeExact = (X, n, L = n) => EMB3.decodeExact(h3Fractions(X, n), L);
// The same greedy descent on integers only (h3tree.decode_int): the query is held as c x with c > 0 and carried by
// 7 J M^T J, so every comparison and tie is decodeExact's. X may carry any positive scale.
function h3DecodeInt(X, L) {
    const word = [];
    let v = X.slice();
    for (let l = 0; l < L; l++) {
        const allowed = P.children(word);
        let best = null, bk = 0;
        allowed.forEach((g, k) => {
            const a = D3.OCTA[D3.slotDirection(word, g)];
            const s = BigInt(a[0]) * v[1] + BigInt(a[1]) * v[2] + BigInt(a[2]) * v[3];
            if (best === null || s > best) { best = s; bk = k; }          // ties to the lowest index
        });
        const g = allowed[bk], S = STEP7_INV[D3.slotDirection(word, g)];
        word.push(g);
        v = S.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2] + r[3] * v[3]);
    }
    return word;
}
// L3 control 3, decoder3d.js's float placement and float greedy decoding.
// READING: decoder3d.js's float point multiplies right to left (S_1 (S_2 (... e_0))), hpstep's left to right
// (the frame product); the control is decided by the reference, and this one is JS's own, reported only.
const h3FloatOk = word => sameWord(EMB3.decode(EMB3.point(Array.from(word)), word.length), word);

// ------------------------------------------------------------------ H^2: D3's exact tree (h2exact.py)
// Root letters 0..5 take the directions (1,0), (3/5,4/5), (3/5,-4/5), (-7/25,24/25), (-7/25,-24/25), (-1,0); below
// the root P.children(w)[k] takes the first five in the local frame. A step is R(u) B(t); frames compose left to
// right; a point is the frame's first column. With m = (1+t)/(1-t) an integer, N_n = h (25m)^n F_n is integral
// (h = 2 for even m, 1 for odd), so a point of n letters is an integer 3-vector over den(n) = h (d/g)^n; the proof is
// in h2exact.py's docstring, and every division is checked here as there.
// an exact rational from a Q, a BigInt, an integer, 'p/q' or [p, q]; never from a float (11/13 has no double)
function toQ(t) {
    if (t instanceof Q) return t;
    if (typeof t === 'bigint' || Number.isInteger(t)) return new Q(BigInt(t));
    if (typeof t === 'string') return Q.parse(t);
    if (Array.isArray(t)) return new Q(BigInt(t[0]), BigInt(t[1]));
    throw new TypeError('t is a Q, a BigInt, an integer, "p/q" or [p, q]');
}
const T_D3 = new Q(11n, 13n);
const qi = n => new Q(BigInt(n));
const H2_DIRS = [[qi(1), qi(0)], [new Q(3n, 5n), new Q(4n, 5n)], [new Q(3n, 5n), new Q(-4n, 5n)], [new Q(-7n, 25n), new Q(24n, 25n)],
    [new Q(-7n, 25n), new Q(-24n, 25n)], [qi(-1), qi(0)]];
const J3 = [-1, 1, 1];
// the direction index of child g: the generator itself at the root (prev null), else its index among P.children
const h2Slot = (prev, g) => (prev === null ? g : P.children([prev]).indexOf(g));
const qMatmul = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s.add(a.mul(B[k][j])), Q.ZERO)));
const lcmB = (a, b) => a * b / gcdB(a, b);
class H2Tree {
    constructor(t = T_D3) {
        this.t = toQ(t);
        const tt = this.t.mul(this.t);
        this.cosh = Q.ONE.add(tt).div(Q.ONE.sub(tt)); this.sinh = Q.TWO.mul(this.t).div(Q.ONE.sub(tt));
        this.m = this.cosh.add(this.sinh);                       // e^tau
        this.tau = 2 * Math.atanh(this.t.toNumber());
        const B = [[this.cosh, this.sinh, Q.ZERO], [this.sinh, this.cosh, Q.ZERO], [Q.ZERO, Q.ZERO, Q.ONE]];
        this.rot = H2_DIRS.map(([u1, u2]) => [[Q.ONE, Q.ZERO, Q.ZERO], [Q.ZERO, u1, u2.neg()], [Q.ZERO, u2, u1]]);
        this.stepQ = this.rot.map(R => qMatmul(R, B));
        this.stepInvQ = this.stepQ.map(M => [0, 1, 2].map(i => [0, 1, 2].map(j => (J3[i] * J3[j] < 0 ? M[j][i].neg() : M[j][i]))));
        // the integer scheme: K = d S integral, N_{n+1} = N_n K / g, den(n) = h (d / g)^n
        let d;
        if (this.m.d === 1n) {
            const m = this.m.n;
            [this.g, this.h] = m % 2n === 0n ? [2n, 2n] : [1n, 1n];
            d = 25n * m * this.g;
        } else {
            d = 1n;
            for (const M of this.stepQ) for (const row of M) for (const x of row) d = lcmB(d, x.d);
            this.g = 1n; this.h = 1n;
        }
        this.d = d; this.c = d / this.g;
        const integral = M => M.map(row => row.map(x => { const y = x.mul(new Q(d)); if (y.d !== 1n) throw new Error(`${d} times a step is not integral`); return y.n; }));
        this.K = this.stepQ.map(integral);
        this.Kinv = this.stepInvQ.map(integral);
        this.cols = this.K.map(K => [0, 1, 2].map(j => [0, 1, 2].filter(k => K[k][j] !== 0n).map(k => [k, K[k][j]])));
        this.dirs25 = H2_DIRS.map(([u1, u2]) => [u1.mul(qi(25)).n, u2.mul(qi(25)).n]);
    }
    den(n) { return this.h * powB(this.c, n); }  // the denominator of every point (and frame) of n letters
    // ---- exact points
    _step(N, prev, g) {
        const gg = this.g;
        return this.cols[h2Slot(prev, g)].map(terms => {
            let c0 = 0n, c1 = 0n, c2 = 0n;
            for (const [k, c] of terms) { const a = N[k]; c0 += c * a[0]; c1 += c * a[1]; c2 += c * a[2]; }
            if (gg !== 1n) {
                if (c0 % gg || c1 % gg || c2 % gg) throw new Error('the integer frame is not divisible: the scaling proof does not apply');
                c0 /= gg; c1 /= gg; c2 /= gg;
            }
            return [c0, c1, c2];
        });
    }
    frames(words) { const h = this.h; return walk(words.map(w => Array.from(w)), [[h, 0n, 0n], [0n, h, 0n], [0n, 0n, h]], (N, prev, g) => this._step(N, prev, g)); }
    points(words) { return this.frames(words).map(N => N[0]); }   // x = X / den(len)
    point(word) { return this.points([word])[0]; }
    pointQ(word) {                               // the Q frame product, left to right (slow; for tests)
        let M = [0, 1, 2].map(i => [0, 1, 2].map(j => (i === j ? Q.ONE : Q.ZERO)));
        word.forEach((g, i) => { M = qMatmul(M, this.stepQ[h2Slot(i ? word[i - 1] : null, g)]); });
        return M.map(r => r[0]);
    }
    onSheet(X, n) { const D = this.den(n); return X[0] > 0n && X[0] * X[0] - X[1] * X[1] - X[2] * X[2] === D * D; }
    fractions(X, n) { const D = this.den(n); return X.map(x => new Q(x, D)); }
    // ---- exact greedy decoding: [word, ties] on integers (X may carry any positive scale). The query is held as c y
    // with c > 0 and carried by K_inv = d J S^T J; each score is 25 (u1 y1 + u2 y2) scaled by c; ties to the lower
    // index, counted.
    decode(X, L) {
        const word = [];
        let v = X.slice(), ties = 0;
        for (let l = 0; l < L; l++) {
            const allowed = P.children(word), root = !word.length;
            let best = null, bk = 0, nbest = 0;
            allowed.forEach((g, k) => {
                const [a, b] = this.dirs25[root ? g : k], sc = a * v[1] + b * v[2];
                if (best === null || sc > best) { best = sc; bk = k; nbest = 1; } else if (sc === best) nbest++;
            });
            if (nbest > 1) ties++;
            const g = allowed[bk], S = this.Kinv[root ? g : bk];
            word.push(g);
            v = [S[0][0] * v[0] + S[0][1] * v[1] + S[0][2] * v[2], S[1][0] * v[0] + S[1][1] * v[1] + S[1][2] * v[2], S[2][0] * v[0] + S[2][1] * v[1] + S[2][2] * v[2]];
        }
        return [word, ties];
    }
    // spike S2's TreeH2Exact.decode, line for line, on Q: [word, ties, last local point]
    decodeFraction(y, L) {
        const word = [];
        let local = y.map(toQ), ties = 0;
        for (let l = 0; l < L; l++) {
            const allowed = P.children(word);
            const scores = allowed.map((g, k) => { const u = H2_DIRS[!word.length ? g : k]; return u[0].mul(local[1]).add(u[1].mul(local[2])); });
            let best = null, bk = -1;
            scores.forEach((sc, k) => { if (best === null || sc.cmp(best) > 0) { best = sc; bk = k; } });
            if (scores.filter(sc => sc.eq(best)).length > 1) ties++;
            const g = allowed[bk], bs = word.length ? bk : g;
            word.push(g);
            const M = this.stepInvQ[bs];
            local = [0, 1, 2].map(i => [0, 1, 2].reduce((s, k) => s.add(M[i][k].mul(local[k])), Q.ZERO));
        }
        return [word, ties, local];
    }
    decodes(word) { return sameWord(this.decode(this.point(word), word.length)[0], word); }   // L3(e) in H^2
}
const H2_TREE = new H2Tree(T_D3);              // D3's tree (t = 11/13); new H2Tree(new Q(3n, 4n)) is L3's control 4

// ------------------------------------------------------------------ the flat trees F3, F3*, F2, F2* (flat.py)
// Used here for points_v1.txt (L5's arms, Amendment 1 item 7): the trees' frames and directions without the boost.
// R(u) in R^3 is hpstep's rot_to (a signed permutation, det +1); in R^2 the Gaussian rational u1 + i u2.
function rotTo(u) {                            // decode3d.py rot_to, line for line (decoder3d.js keeps its own private)
    const i = u.findIndex(x => x !== 0), perm = [i, (i + 1) % 3, (i + 2) % 3], M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    perm.forEach((row, col) => { M[row][col] = 1; });
    if (u[i] < 0) for (let r = 0; r < 3; r++) { M[r][0] = -M[r][0]; M[r][1] = -M[r][1]; }
    return M.map(r => r.map(x => BigInt(x)));
}
const ROT3 = D3.OCTA.map(rotTo);
const U25 = H2_DIRS.map(([u1, u2]) => [u1.mul(qi(25)).n, u2.mul(qi(25)).n]);   // 25 u as a Gaussian integer
class FlatTree {
    constructor(dim, star = false) {
        if (dim !== 2 && dim !== 3) throw new RangeError('dim is 2 or 3');
        this.dim = dim; this.star = !!star; this.kind = 'euclid'; this.tau = 1.0;
        this.name = `F${dim}` + (star ? '*' : '');
    }
    den(n) { const d = this.dim === 2 ? powB(25, n) : 1n; return this.star && n >= 1 ? d * powB(4, n - 1) : d; }
    _grow(i) { const f = this.dim === 2 ? 25n : 1n; return this.star && i >= 1 ? f * 4n : f; }   // den(i + 1) / den(i)
    _step3([R, Pt], prev, g, i) {
        const U = ROT3[slot3(prev, g)];
        const R2 = [0, 1, 2].map(r => [0, 1, 2].map(c => R[r][0] * U[0][c] + R[r][1] * U[1][c] + R[r][2] * U[2][c]));
        const f = this._grow(i);
        return [R2, [Pt[0] * f + R2[0][0], Pt[1] * f + R2[1][0], Pt[2] * f + R2[2][0]]];
    }
    _step2([[za0, zb0], Pt], prev, g, i) {     // R = (za + i zb) / 25^i; R' = R u over 25^(i+1)
        const [ua, ub] = U25[h2Slot(prev, g)], za = za0 * ua - zb0 * ub, zb = za0 * ub + zb0 * ua, f = this._grow(i);
        return [[za, zb], [Pt[0] * f + za, Pt[1] * f + zb]];
    }
    states(words) {
        words = words.map(w => Array.from(w));
        if (this.dim === 3) return walk(words, [[[1n, 0n, 0n], [0n, 1n, 0n], [0n, 0n, 1n]], [0n, 0n, 0n]], (s, p, g, i) => this._step3(s, p, g, i));
        return walk(words, [[1n, 0n], [0n, 0n]], (s, p, g, i) => this._step2(s, p, g, i));
    }
    points(words) { return this.states(words).map(s => s[1]); }   // x = X / den(len)
    point(word) { return this.points([word])[0]; }
}
const F3 = new FlatTree(3), F2 = new FlatTree(2), F3S = new FlatTree(3, true), F2S = new FlatTree(2, true);

// ------------------------------------------------------------------ exact ranking (rank.py)
// An arm is a candidate set as integer coordinate columns over ONE common denominator den. Its key against a query X
// is a BigInt, ascending = nearer: 'lorentz' X0 Y0 - X1 Y1 - X2 Y2 (- X3 Y3) = -<x, y> den^2; 'euclid' |Y|^2 - 2 X.Y.
class Arm {
    constructor(name, kind, cols, den, tau = null) {
        if (kind !== 'lorentz' && kind !== 'euclid') throw new Error(`unknown kind ${kind}`);
        this.name = name; this.kind = kind; this.den = BigInt(den); this.tau = tau;
        this.cols = cols.map(c => Array.from(c, x => BigInt(x)));
        this.n = this.cols[0].length; this.dim = this.cols.length;
        if (this.cols.some(c => c.length !== this.n)) throw new Error('ragged columns');
        this.sq = null;
        if (kind === 'euclid') { this.sq = new Array(this.n); for (let i = 0; i < this.n; i++) { let s = 0n; for (const c of this.cols) s += c[i] * c[i]; this.sq[i] = s; } }
    }
    // points[i] * scales[i] / den is node i (scales bring each point to the common denominator)
    static fromPoints(name, kind, points, scales, den, tau = null) {
        const dim = points[0].length;
        return new Arm(name, kind, Array.from({ length: dim }, (_, k) => points.map((p, i) => p[k] * scales[i])), den, tau);
    }
    vector(i) { return this.cols.map(c => c[i]); }
    keys(u) {                                  // the key of every node (u's own included) against node u
        const c = this.cols, n = this.n, out = new Array(n);
        if (this.kind === 'lorentz') {
            if (this.dim === 4) {
                const [x0, x1, x2, x3] = c, a0 = x0[u], a1 = x1[u], a2 = x2[u], a3 = x3[u];
                for (let i = 0; i < n; i++) out[i] = a0 * x0[i] - a1 * x1[i] - a2 * x2[i] - a3 * x3[i];
            } else if (this.dim === 3) {
                const [x0, x1, x2] = c, a0 = x0[u], a1 = x1[u], a2 = x2[u];
                for (let i = 0; i < n; i++) out[i] = a0 * x0[i] - a1 * x1[i] - a2 * x2[i];
            } else {
                const a = this.vector(u);
                for (let i = 0; i < n; i++) { let s = a[0] * c[0][i]; for (let k = 1; k < this.dim; k++) s -= a[k] * c[k][i]; out[i] = s; }
            }
            return out;
        }
        const b = this.vector(u).map(x => 2n * x);
        for (let i = 0; i < n; i++) { let s = this.sq[i]; for (let k = 0; k < this.dim; k++) s -= b[k] * c[k][i]; out[i] = s; }
        return out;
    }
    key(u, v) {
        const a = this.vector(u), b = this.vector(v);
        if (this.kind === 'lorentz') { let s = a[0] * b[0]; for (let k = 1; k < this.dim; k++) s -= a[k] * b[k]; return s; }
        let s = this.sq[v]; for (let k = 0; k < this.dim; k++) s -= 2n * a[k] * b[k]; return s;
    }
}
// The H3 and H2 arms over the common denominators 7^Lmax and den(Lmax) (h3tree.arm, h2exact.arm)
function h3Arm(words, name = 'H3', points = null) {
    const pts = points || h3Points(words), L = maxLength(words);
    return Arm.fromPoints(name, 'lorentz', pts, words.map(w => powB(7, L - w.length)), powB(7, L), H3_TAU);
}
function h2Arm(words, name = 'H2', t = T_D3, points = null) {
    const T = toQ(t).eq(T_D3) ? H2_TREE : new H2Tree(t), pts = points || T.points(words), L = maxLength(words);
    return Arm.fromPoints(name, 'lorentz', pts, words.map(w => powB(T.c, L - w.length)), T.den(L), T.tau);
}
function flatArm(words, dim, star = false, name = null) {
    const T = [F3, F2, F3S, F2S].find(x => x.dim === dim && x.star === !!star), pts = T.points(words), L = maxLength(words), D = T.den(L);
    return Arm.fromPoints(name || T.name, 'euclid', pts, words.map(w => D / T.den(w.length)), D, T.tau);
}
// the exact sum of Q values by balanced pairwise addition (rank.exact_sum)
function exactSum(values) {
    let xs = values.map(toQ);
    if (!xs.length) return Q.ZERO;
    while (xs.length > 1) { const ys = []; for (let i = 0; i < xs.length; i += 2) ys.push(i + 1 < xs.length ? xs[i].add(xs[i + 1]) : xs[i]); xs = ys; }
    return xs[0];
}
// AP (pessimistic ties) and neighbour ranks from the sorted candidate keys S; nb: neighbour indices
function apAndRanks(S, keys, nb) {
    if (!nb.length) return [null, []];
    const nk = nb.map(v => keys[v]).sort(cmpBig), terms = [], rankOf = new Map(), n = nk.length;
    let before = 0, i = 0;
    while (i < n) {
        const K = nk[i];
        let j = i + 1;
        while (j < n && nk[j] === K) j++;
        const g = j - i, lo = bisectLeft(S, K), hi = bisectRight(S, K), eNon = hi - lo - g;   // tied non-neighbours rank first
        for (let t = 1; t <= g; t++) terms.push(new Q(BigInt(before + t), BigInt(lo + eNon + t)));
        before += g;
        rankOf.set(K, 1 + hi - before);                    // 1 + non-neighbours with key <= K
        i = j;
    }
    return [exactSum(terms).div(qi(n)), nb.map(v => rankOf.get(keys[v]))];
}
function rankText(order, keys, offsets) {
    const lines = new Array(order.length);
    let g = -1, last = null;
    order.forEach((i, j) => { const k = keys[i]; if (k !== last) { g++; last = k; } lines[j] = `${offsets[i]} ${g}`; });
    return lines.join('\n');
}
// Rank every other node of the arm against node u (Amendment 1 item 5). nbSets: neighbour tables (nb[u] = the
// neighbour indices of u), e.g. [graph-edge, closure]; rankList: null, 'sha' or 'text' (needs offsets, in offset
// order). Returns { query, ap: [Q | null], ranks: [[int] in nb[u]'s order], sha, text }.
function rankQuery(arm, u, nbSets, offsets = null, rankList = null) {
    const keys = arm.keys(u);
    let sha = null, text = null, S;
    if (rankList) {
        const order = orderByKey(keys);                    // stable: ties stay in index (offset) order
        order.splice(order.indexOf(u), 1);
        S = order.map(i => keys[i]);
        const t = rankText(order, keys, offsets);
        sha = sha256Hex(textBytes(t));
        if (rankList === 'text') text = t;
    } else {
        S = keys.slice().sort(cmpBig);
        S.splice(bisectLeft(S, keys[u]), 1);               // the query itself (any equal key: the same key)
    }
    const ap = [], ranks = [];
    for (const nb of nbSets) {
        const nbl = Array.from(nb[u]);
        if (nbl.includes(u)) throw new Error(`node ${u} is listed as its own neighbour`);
        const [a, r] = apAndRanks(S, keys, nbl);
        ap.push(a); ranks.push(r);
    }
    return { query: u, ap, ranks, sha, text };
}
const qOrDash = x => (x === null || x === undefined ? '-' : `${x.n}/${x.d}`);
// MAP: the exact mean of the APs, queries without neighbours (null) left out
function mapExact(aps) { const xs = aps.filter(a => a !== null && a !== undefined); return exactSum(xs).div(qi(xs.length)); }
// mean rank over all (query, neighbour) pairs pooled. READING (Amendment 2 item 3, as rank.py): pooled, not per query.
function meanRank(rankLists) {
    let total = 0n, count = 0n;
    for (const r of rankLists) { for (const x of r) total += BigInt(x); count += BigInt(r.length); }
    return new Q(total, count);
}
// graph-edge neighbours inside the set `offsets` (sorted): its children inside and the spanning parent when inside
function graphNeighbours(offsets, parent, children) {
    parent = asMap(parent); children = asMap(children);
    const index = new Map(offsets.map((o, i) => [o, i]));
    return offsets.map(o => {
        const nb = (children.get(o) || []).filter(c => index.has(c)).map(c => index.get(c)), p = parent.get(o);
        if (p !== null && p !== undefined && index.has(p)) nb.push(index.get(p));
        return nb.sort((a, b) => a - b);
    });
}
// closure neighbours inside the set: closure ancestors and descendants
function closureNeighbours(offsets, anc, desc) {
    const index = new Map(offsets.map((o, i) => [o, i]));
    return offsets.map(o => {
        const s = new Set([...anc.get(o), ...desc.get(o)]);
        return [...s].filter(x => index.has(x) && x !== o).map(x => index.get(x)).sort((a, b) => a - b);
    });
}
const bitsPerNode = (points, dens) => { const b = points.map((X, i) => pointBits(X, dens[i])); return [new Q(BigInt(b.reduce((s, x) => s + x, 0)), BigInt(b.length)), b.reduce((m, x) => Math.max(m, x), 0)]; };

// ------------------------------------------------------------------ L4(b): float64 ranking (phase2.py; Amendment 4 item 6)
// Each coordinate X / den rounded to the nearest float64 by hyperbolic_core.js's Q.toNumber (correctly rounded, as
// CPython's int / int); 'float32' then rounds that float64 to float32 (Float32Array's conversion: nearest, ties to even,
// as numpy's astype) for control 1.
function floatCols(arm, dtype = 'float64') {
    const D = arm.den, cols = arm.cols.map(c => Float64Array.from(c, x => new Q(x, D).toNumber()));
    if (dtype === 'float64') return cols;
    if (dtype === 'float32') return cols.map(c => Float32Array.from(c));
    throw new Error('dtype is float64 or float32');
}
// The float key of every node against node u: x0 y0 - x1 y1 - x2 y2 (- x3 y3), left to right, one IEEE-754 operation
// at a time. JavaScript never contracts a * b - c into a fused multiply-add, so plain arithmetic is the item's. Float32
// columns are computed in float32: Math.fround after each operation (a float64 product or difference of two float32
// values, rounded once to float32, is the correctly rounded float32 result).
function floatKeys(cols, u) {
    const n = cols[0].length, dim = cols.length, q = cols.map(c => c[u]);
    if (cols[0] instanceof Float32Array) {
        const f = Math.fround, out = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            let k = f(f(q[0] * cols[0][i]) - f(q[1] * cols[1][i]));
            for (let j = 2; j < dim; j++) k = f(k - f(q[j] * cols[j][i]));
            out[i] = k;
        }
        return out;
    }
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        let k = q[0] * cols[0][i] - q[1] * cols[1][i];
        for (let j = 2; j < dim; j++) k = k - q[j] * cols[j][i];
        out[i] = k;
    }
    return out;
}
// the candidates (every node but u) in exact order (key, then index = offset order) and their exact keys
function exactOrder(keys, u) { const order = orderByKey(keys); order.splice(order.indexOf(u), 1); return [order, order.map(i => keys[i])]; }
// over adjacent pairs in exact order: an inversion is a strictly ordered pair (exact keys differ) whose float keys
// strictly decrease; a float tie one whose float keys are equal. NaN compares false both ways: neither.
function adjacentFlags(S, fk) {
    const inv = [], tie = [];
    for (let i = 0; i + 1 < S.length; i++) { const strict = S[i] !== S[i + 1]; inv.push(strict && fk[i] > fk[i + 1]); tie.push(strict && fk[i] === fk[i + 1]); }
    return [inv, tie];
}
// one query of L4(b): { query, inversions, ties, nonfinite, first: null or [position, a, b, float key a, float key b] }
function floatQuery(arm, u, cols, keys = null) {
    const [order, S] = exactOrder(keys || arm.keys(u), u), all = floatKeys(cols, u), fk = order.map(i => all[i]);
    let inversions = 0, ties = 0, nonfinite = 0, first = null;
    for (const x of fk) if (!Number.isFinite(x)) nonfinite++;
    for (let i = 0; i + 1 < S.length; i++) {
        if (S[i] === S[i + 1]) continue;
        if (fk[i] > fk[i + 1]) { if (!inversions) first = [i, order[i], order[i + 1], fk[i], fk[i + 1]]; inversions++; }
        else if (fk[i] === fk[i + 1]) ties++;
    }
    return { query: u, inversions, ties, nonfinite, first };
}
// L4 control 2: an exact neighbour/non-neighbour tie; the AP of a candidate order; the float evaluator that sorts by
// float64 acosh(max(1, key)), then node index.
function exactTie(keys, u, nbrs) {
    const nbs = new Set(nbrs), nk = new Set([...nbs].map(v => keys[v]));
    for (let w = 0; w < keys.length; w++) if (w !== u && !nbs.has(w) && nk.has(keys[w])) return true;
    return false;
}
function apOfOrder(order, nbrs) {
    const nbs = new Set(nbrs);
    if (!nbs.size) return null;
    let hits = 0, total = Q.ZERO;
    order.forEach((v, j) => { if (nbs.has(v)) { hits++; total = total.add(new Q(BigInt(hits), BigInt(j + 1))); } });
    return total.div(qi(nbs.size));
}
// READING: max(1, key) as Python's max(1.0, x) (1.0 unless x > 1.0, so NaN gives 1.0, where Math.max gives NaN);
// acosh is V8's Math.acosh, which may differ from the C library's (phase2.py's) in the last bit: Node's result is
// reported, the reference decides.
function acoshOrder(fk, u) {
    const d = Array.from(fk, x => Math.acosh(x > 1 ? x : 1));
    return d.map((_, v) => v).filter(v => v !== u).sort((a, b) => (d[a] < d[b] ? -1 : d[a] > d[b] ? 1 : a - b));
}
const acoshAp = (u, nbrs, fk) => apOfOrder(acoshOrder(fk, u), nbrs);

// ------------------------------------------------------------------ L3(f): the canonical point list (Amendment 1 item 6)
// One line per node in offset order, 'offset H3 c0 c1 c2 c3' then 'offset H2 c0 c1 c2', coordinates in lowest terms
// 'p/q', lines joined by LF without a final LF (run_claims.py's canon). H^3 by decoder3d.js's pointExact as Amendment 4
// item 4 says (opts.h3 = 'bigint' for the integer frames, equal by proof and by test), H^2 by D3's exact tree.
function canonicalPointLines(offsets, words, { h3 = 'pointExact', points3 = null, points2 = null } = {}) {
    let lines3;
    if (h3 === 'pointExact') lines3 = words.map((w, i) => `${offsets[i]} H3 ${h3PointText(w)}`);
    else { const P3 = points3 || h3Points(words); lines3 = words.map((w, i) => `${offsets[i]} H3 ${coordsText(P3[i], h3Den(w.length))}`); }
    const P2 = points2 || H2_TREE.points(words);
    const lines2 = words.map((w, i) => `${offsets[i]} H2 ${coordsText(P2[i], H2_TREE.den(w.length))}`);
    return { lines3, lines2 };
}
function canonicalPointList(offsets, words, opts = {}) {
    const { lines3, lines2 } = canonicalPointLines(offsets, words, opts), text = lines3.concat(lines2).join('\n');
    return { lines3, lines2, sha256: sha256Hex(textBytes(text)), bytes: text.length };
}
// a line of results/l3f-python.txt: offset TAB word TAB H3 line TAB H2 line
const l3fLine = (offset, word, line3, line2) => `${offset}\t${wordStr(word)}\t${line3}\t${line2}`;

// ------------------------------------------------------------------ map A (Amendment 1 item 4; address.py map_a)
const MAP_A_SPECIALS = ['[PAD]', '[UNK]', '[CLS]', '[SEP]', '[MASK]'];
const isAsciiDigits = s => s.length > 0 && cpsOf(s).every(c => c >= 0x30 && c <= 0x39);
// [PAD], [UNK], [CLS], [SEP], [MASK] and V1's [unusedN] (N ASCII digits)
const isSpecial = e => MAP_A_SPECIALS.includes(e) || (e.startsWith('[unused') && e.endsWith(']') && isAsciiDigits(e.slice(7, -1)));
// N_B's punctuation (Amendment 1 item 1 step 6), read from the pinned table as N_B reads it
const nbPunct = cp => !!(tables().flags[cp] & PUNCT);
function digitsWord(root, values, m) {         // [root] then each value in m base-5 digits, most significant first
    const w = [root];
    for (let v of values) {
        const digits = [];
        for (let i = 0; i < m; i++) { digits.push(v % 5); v = Math.floor(v / 5); }
        if (v) throw new RangeError('value does not fit');
        for (let i = digits.length - 1; i >= 0; i--) w.push(P.children(w)[digits[i]]);
    }
    return w;
}
// One reduced word per vocabulary entry (entries in id order): [words, report]. wn.index[pos]: lemma -> { tagsense,
// offsets }; nounWordsMap / verbWordsMap: offset -> word. READING (Amendment 2 item 3, as address.py): roots decided
// in the order root 5, lemma, '##', other; '##' removed once from the front; punctuation from the pinned table.
function mapA(entries, wn, nounWordsMap, verbWordsMap, isPunct = nbPunct) {
    const index = wn.index, rootOf = [], lemmaWord = new Map();
    entries.forEach((e, i) => {
        const cont = e.startsWith('##');
        if (!cont && (isSpecial(e) || (e.length > 0 && (cpsOf(e).every(c => c >= 0x30 && c <= 0x39) || cpsOf(e).every(isPunct))))) { rootOf.push(5); return; }
        if (cont) { rootOf.push(3); return; }
        const listed = POS.filter(pos => !e.includes('_') && index[pos].has(e));
        if (listed.length) {
            let best = listed[0];                // the largest tagsense_cnt, ties in the order noun, verb, adj, adv
            for (const pos of listed) if (index[pos].get(e).tagsense > index[best].get(e).tagsense) best = pos;
            if (best === 'noun') { rootOf.push(0); lemmaWord.set(i, nounWordsMap.get(index.noun.get(e).offsets[0])); }
            else if (best === 'verb') { rootOf.push(1); lemmaWord.set(i, verbWordsMap.get(index.verb.get(e).offsets[0])); }
            else rootOf.push(2);
            return;
        }
        rootOf.push(4);
    });
    const text = entries.map((e, i) => (rootOf[i] === 3 ? e.slice(2) : e));
    const alphaSet = new Set();
    text.forEach((t, i) => { if (rootOf[i] !== 5) for (const c of cpsOf(t)) alphaSet.add(c); });
    const alphabet = [...alphaSet].sort((a, b) => a - b), letter = new Map(alphabet.map((c, j) => [c, j]));
    const mA = alphabet.length ? lettersFor(alphabet.length) : 1, n5 = rootOf.filter(r => r === 5).length, m5 = n5 ? lettersFor(n5) : 1;
    const words = [];
    let j5 = 0;
    text.forEach((t, i) => {
        const r = rootOf[i];
        if (r === 5) words.push(digitsWord(5, [j5++], m5));
        else if (r === 0 || r === 1) words.push(Array.from(lemmaWord.get(i)));
        else words.push(digitsWord(r, cpsOf(t).map(c => letter.get(c)), mA));
    });
    const holders = new Map();
    words.forEach((w, i) => { const k = w.join(','); if (!holders.has(k)) holders.set(k, []); holders.get(k).push(i); });
    const shared = [...holders.values()].filter(ids => ids.length > 1).sort((a, b) => a[0] - b[0]);
    const perRoot = {};
    for (let r = 0; r < 6; r++) perRoot[r] = rootOf.filter(x => x === r).length;
    return [words, { entries: entries.length, per_root: perRoot, n5, m5, alphabet: alphabet.length, m_alphabet: mA, distinct_words: holders.size,
        shared_addresses: shared.length, entries_sharing: shared.reduce((s, ids) => s + ids.length, 0), shared, max_len: words.reduce((m, w) => Math.max(m, w.length), 0) }];
}

// ------------------------------------------------------------------ the geometry traces (reference/traces_geometry.py)
// Each function writes its trace's lines exactly as traces_geometry.py does (comments included); wn = a wn object
// (wordnet_v1.cjs's load()) or null, in which case the lines that need WordNet are left out and reported as skipped.
function wordOf(rng, L) {                      // Amendment 1 item 9's draw: root letter below(6), then children(w)[below(5)]
    const w = [rng.below(6)];
    while (w.length < L) w.push(P.children(w)[rng.below(5)]);
    return w;
}
const ADDRESS_HEAD = ['# address_v1: the L3 rule (lexicon.address). letters <c> <max(1, ceil log5 c)> <ceil log5 c>',
    '# child <i> <parent> <k> <c> <rule word> <zero word> <trunc word>: case i from Rng(8300 + i): parent',
    '# of length 1 + below(12), cap = (5, 25, 125, 700)[below(4)], c = 1 + below(cap), k = below(c)',
    '# verb <offset> <word>: the verb forest, roots under the virtual root [1] (Amendment 1, item 10)'];
function addressTraceLines(wn) {
    const lines = ADDRESS_HEAD.slice();
    const cs = Array.from({ length: 31 }, (_, i) => i + 1).concat([124, 125, 126, 127, 559, 624, 625, 626, 3125, 3126]);
    for (const c of cs) lines.push(`letters ${c} ${lettersFor(c)} ${lettersForZero(c)}`);
    for (let i = 0; i < 200; i++) {
        const rng = new C.Rng(8300 + i), parent = wordOf(rng, 1 + rng.below(12));
        const cap = [5, 25, 125, 700][rng.below(4)], c = 1 + rng.below(cap), k = rng.below(c);
        lines.push(`child ${i} ${wordStr(parent)} ${k} ${c} ${VARIANTS.map(v => wordStr(childWord(parent, k, c, v))).join(' ')}`);
    }
    if (!wn) return { lines, complete: false };
    const vw = verbWords(wn);
    lines.push(`verb_words_sha256 ${wordsSha256(vw)}`);
    for (const o of [...vw.keys()].sort()) lines.push(`verb ${o} ${wordStr(vw.get(o))}`);
    return { lines, complete: true };
}
const POINTS_HEAD = ['# points_v1: word i from Rng(8000 + i), length 1 + below(40). Lines "<i> <tree> c0 c1 c2 [c3]" with',
    '# each coordinate in lowest terms p/q (Amendment 1, item 6 (f)); "<i> id <id> <id59|-> <id64|->";',
    '# "<i> H2t34dec <word> <ties>": the greedy decode of the t = 3/4 H^2 point (L3 control 4)'];
const pointsTraceWords = () => Array.from({ length: 300 }, (_, i) => { const rng = new C.Rng(8000 + i); return wordOf(rng, 1 + rng.below(40)); });
// H3 lines by decoder3d.js's pointExact (the function Amendment 4 item 4 names); the integer frames are checked
// against it separately (tests/parity-lexicon.cjs)
function pointsTraceLines() {
    const lines = POINTS_HEAD.slice(), words = pointsTraceWords(), T34 = new H2Tree(new Q(3n, 4n));
    const P34 = T34.points(words);
    const trees = [['H2', H2_TREE.points(words), n => H2_TREE.den(n)], ['H2t34', P34, n => T34.den(n)]]
        .concat([F3, F3S, F2, F2S].map(T => [T.name, T.points(words), n => T.den(n)]));
    words.forEach((w, i) => {
        const n = wordId(w), a = id59(w), b = id64(w);
        lines.push(`${i} word ${w.length} ${wordStr(w)}`);
        lines.push(`${i} id ${n} ${a === null ? '-' : a} ${b === null ? '-' : b}`);
        lines.push(`${i} H3 ${h3PointText(w)}`);
        for (const [name, pts, den] of trees) lines.push(`${i} ${name} ${coordsText(pts[i], den(w.length))}`);
        const [dec, ties] = T34.decode(P34[i], w.length);
        lines.push(`${i} H2t34dec ${wordStr(dec)} ${ties}`);
    });
    return { lines, complete: true };
}
const RANK_HEAD = ['# rank_v1: verb-forest queries, query i = Rng(8100 + i).below(13767) in offset order, against the',
    '# other 13,766 verbs. "<offset> <tree> sha <rank-list sha256>", "... ap_graph|ap_closure <n/d>",',
    '# "... ranks_graph|ranks_closure <r,r,...>" (neighbours in index order; "-" if none); then',
    '# "list <tree> <line>" for the first 100 rank-list lines of query 0'];
function rankTraceLines(wn) {
    const lines = RANK_HEAD.slice();
    if (!wn) return { lines, complete: false };
    const f = forestOf(wn, 'verb'), offs = f.offsets, words = f.words;
    const gNb = graphNeighbours(offs, f.parent, f.children), anc = closure(wn.synsets.verb), cNb = closureNeighbours(offs, anc, descendants(anc));
    const queries = Array.from({ length: 20 }, (_, i) => new C.Rng(8100 + i).below(offs.length)), heads = [];
    for (const [name, arm] of [['H3', h3Arm(words)], ['H2', h2Arm(words)]]) {
        queries.forEach((u, j) => {
            const r = rankQuery(arm, u, [gNb, cNb], offs, j === 0 ? 'text' : 'sha');
            lines.push(`${offs[u]} ${name} sha ${r.sha}`);
            ['graph', 'closure'].forEach((label, k) => {
                lines.push(`${offs[u]} ${name} ap_${label} ${qOrDash(r.ap[k])}`);
                lines.push(`${offs[u]} ${name} ranks_${label} ${r.ranks[k].join(',') || '-'}`);
            });
            if (j === 0) heads.push(...r.text.split('\n').slice(0, 100).map(l => `list ${name} ${l}`));
        });
    }
    return { lines: lines.concat(heads), complete: true };
}

// ------------------------------------------------------------------ geometry parity with the reference
// One line per trace line, comments included, regenerated from the trace's own seeds (nothing is read from the trace
// but the expected text). traces = { address, points, rank } (file texts); wn = a wn object or null (then the lines
// that need WordNet are reported as skipped, never passed).
function geometryParitySections(traces, wn = null) {
    const section = (file, tag, fields, make) => ({ name: `${file}${wn ? '' : ' (no WordNet: its lines are skipped)'}`, run() {
        const text = traces[tag], out = [], line = (label, ok, detail = '') => ({ section: tag, label, ok: !!ok, detail });
        if (typeof text !== 'string') return [line('file', false, `reference/traces/${file} is missing`)];
        const want = text.split('\n');
        out.push(line('file', want[want.length - 1] === '' && (want.length < 2 || want[want.length - 2] !== ''), 'ends with one LF'));
        want.pop();
        const { lines: got, complete } = make();
        want.forEach((w, j) => {
            const label = w.startsWith('#') ? `comment ${j + 1}` : w.split(' ').slice(0, fields).join(' ');
            if (j >= got.length) { out.push(complete ? line(label, false, 'the core wrote no such line') : { section: tag, label, ok: false, skip: true, detail: 'needs WordNet' }); return; }
            out.push(line(label, got[j] === w, got[j] === w ? short(w.split(' ').slice(fields).join(' '), 60) : firstDiff(w, got[j])));
        });
        if (got.length > want.length) out.push(line('extra lines', false, `the core wrote ${got.length - want.length} lines more than the trace`));
        return out;
    } });
    return [
        section('address_v1.txt', 'address', 2, () => addressTraceLines(wn)),
        section('points_v1.txt', 'points', 2, () => pointsTraceLines()),
        section('rank_v1.txt', 'rank', 3, () => rankTraceLines(wn)),
    ];
}

// ------------------------------------------------------------------ L6 and L4(c): snapped learned tables (Phase 4)
// The twin of reference/lexicon/learned.py's snapping and exact ranking (PREREGISTRATION.md Amendment 10 item 6), for
// the Node re-evaluation of the measured snapped tables (item 11; the Common rules, "Authority"). New in Phase 4: no
// function above calls anything here. A table is an array of rows of doubles in offset order (a Lorentz row
// (x0, x1, ..., xd), a Euclidean row (x1, ..., xd)); a snapped table is its dyadic integers n, BigInt rows; its text
// is 'offset n_1 ... n_d' per node (for Lorentz, the integers of the Poincare point), LF-joined, with no final LF.
// Keys against a query u, ascending = nearer:
//   lorentz  kappa_u(v) = |n_u - n_v|^2 / (4^K - |n_v|^2): an exact rational, compared with another by BigInt
//            cross-multiplication (a e against c b; both denominators are positive), so it orders and ties the
//            candidates exactly as -<lift_u, lift_v>_L = 1 + 2 4^K kappa_u(v) / (4^K - |n_u|^2) does (A10.6);
//   euclid   |n_u - n_v|^2, a BigInt (4^K times the squared distance of the dyadic points).
// READING (A10.6, "the key kappa_u(v), an exact Fraction"): rankQuery and apAndRanks (rank.py's _ap_and_ranks), used
// here unchanged, compare keys with < and ===, which a pair (a, b) does not support. So SnapArm.keys(u) hands them, for
// Lorentz, the index of each node's exact kappa class (0 for the smallest kappa), found by one stable sort by
// cross-multiplication with ties decided by it too. AP, neighbour ranks and rank lists use only the order and the ties
// of the keys, so they are kappa's own; the Python reference's integer key floor(a 2^(4K) / b) is another image of
// the same order, and tests/parity-lexicon.cjs checks that both give the same classes.
const SNAP_K = 32;
const floorDivB = (a, b) => { const q = a / b; return a % b !== 0n && (a < 0n) !== (b < 0n) ? q - 1n : q; };   // Python's //
// learned.poincare: x_k / (1 + x0) in binary64, 1 + x0 rounded first
function poincareRow(x) { const s = 1 + x[0], out = []; for (let k = 1; k < x.length; k++) out.push(x[k] / s); return out; }
// floor(2^K x + 1/2) of the double x read exactly (learned.snap's Euclidean snap and its READING). Below 2^(52 - K):
// y = x 2^K is exact and t = floor(y + 0.5) in binary64 is never below the exact floor and at most one above it, which
// happens at one double only (y = 1/2 - 2^-54, where y + 0.5 rounds to 1); t - 0.5 is exact, so t - 0.5 > y finds it
// and t steps down by one. Otherwise from x's exact rational (learned.snap's Fraction path).
function snapCoord(x, K = SNAP_K) {
    if (!Number.isFinite(x)) throw new Error('a table with a non-finite entry has no snap (A10.5: the run diverged)');
    if (Math.abs(x) < Math.pow(2, 52 - K)) {
        const y = x * Math.pow(2, K), t = Math.floor(y + 0.5);
        return BigInt(t - 0.5 > y ? t - 1 : t);
    }
    const f = Q.fromDouble(x);
    return floorDivB(2n * f.n * (1n << BigInt(K)) + f.d, 2n * f.d);
}
// A10.6's snap, row by row (learned.snap). lorentz: fence.dyadic(poincare(x), K), i.e. n_k = floor(2^K p_k + 1/2) in
// fence.js's own binary64 arithmetic (Math.floor(v * s + 0.5)),
// then one unit in, coordinatewise, while |n|^2 >= 4^K (hyperbolic_core.js's fence.js rule, written again here because
// the geometry half does not load fence.js); euclid: floor(2^K x + 1/2) of each coordinate, with no rim rule.
function snapTable(X, geometry, K = SNAP_K) {
    if (geometry !== 'lorentz' && geometry !== 'euclid') throw new Error(`unknown geometry ${geometry}`);
    const lim = 1n << BigInt(2 * K), s = Math.pow(2, K);
    return X.map(row => {
        const x = Array.from(row);
        if (!x.every(Number.isFinite)) throw new Error('a table with a non-finite entry has no snap (A10.5: the run diverged)');
        if (geometry === 'euclid') return x.map(v => snapCoord(v, K));
        let n = poincareRow(x).map(v => BigInt(Math.floor(v * s + 0.5)));
        while (n.reduce((a, t) => a + t * t, 0n) >= lim) n = n.map(t => (t > 0n ? t - 1n : t < 0n ? t + 1n : 0n));
        return n;
    });
}
function snapText(offsets, N) {
    if (offsets.length !== N.length) throw new Error('offsets and rows differ in number');
    return N.map((row, i) => `${offsets[i]} ${row.join(' ')}`).join('\n');
}
// learned.parse_snap_text, failing closed: every line 'offset n_1 ... n_d' with one d >= 1, integers in decimal, the
// offsets strictly increasing (A10.6: rows in offset order), and no final LF (an empty line is refused).
// READING (A10.6): "rows in offset order" and "with no final LF" are taken as conditions a stored text must meet, so a
// text that breaks either is refused rather than repaired (the Python parser assumes them).
const SNAP_INT = /^-?(?:0|[1-9][0-9]*)$/;
function parseSnapText(text) {
    if (typeof text !== 'string' || !text.length) throw new Error('an empty snapped text');
    const offsets = [], N = [];
    let d = -1;
    for (const ln of text.split('\n')) {
        const f = ln.split(' ');
        if (f.length < 2 || !f[0].length) throw new Error(`a snapped text line needs an offset and at least one integer: "${short(ln, 60)}"`);
        if (d < 0) d = f.length - 1;
        else if (f.length - 1 !== d) throw new Error(`a ragged snapped text: ${f.length - 1} integers where the first line has ${d}`);
        if (offsets.length && !(offsets[offsets.length - 1] < f[0])) throw new Error(`offsets out of order at ${f[0]}`);
        const row = f.slice(1);
        if (!row.every(t => SNAP_INT.test(t))) throw new Error(`not a decimal integer in the line of ${f[0]}`);
        offsets.push(f[0]);
        N.push(row.map(t => BigInt(t)));
    }
    return { offsets, N, d };
}
// A10.6's float table bytes: little-endian float64, row-major (a Lorentz row with x0 first); their SHA-256 names it
function floatTableBytes(X) {
    const w = X.length ? X[0].length : 0, dv = new DataView(new ArrayBuffer(8 * w * X.length));
    X.forEach((row, i) => { if (row.length !== w) throw new Error('ragged table'); for (let k = 0; k < w; k++) dv.setFloat64(8 * (i * w + k), row[k], true); });
    return new Uint8Array(dv.buffer);
}
const floatTableSha = X => sha256Hex(floatTableBytes(X));
// the sign of a/b - c/e for b, e > 0, by cross-multiplication
function kappaCmp(a, b, c, e) { const l = a * e, r = c * b; return l < r ? -1 : l > r ? 1 : 0; }
// the exact class index of every a[v]/b[v] (b[v] > 0): equal ratios share one, smaller ratios get smaller ones
function kappaClasses(a, b) {
    const order = a.map((_, i) => i).sort((i, j) => kappaCmp(a[i], b[i], a[j], b[j]));   // stable: ties in index order
    const out = new Array(a.length);
    let g = -1, prev = -1;
    for (const i of order) { if (prev < 0 || kappaCmp(a[prev], b[prev], a[i], b[i]) !== 0) g++; out[i] = BigInt(g); prev = i; }
    return out;
}
// A snapped table as an arm for rankQuery (duck-typed as there: .n and .keys(u)). N: BigInt rows (snapTable or
// parseSnapText). A Lorentz point on or past the rim (|n|^2 >= 4^K) is no snap and is refused, as learned.py refuses it.
class SnapArm {
    constructor(N, geometry, K = SNAP_K) {
        if (geometry !== 'lorentz' && geometry !== 'euclid') throw new Error(`unknown geometry ${geometry}`);
        this.geometry = geometry; this.kind = `snap-${geometry}`; this.K = K;
        this.N = N.map(row => Array.from(row, t => BigInt(t)));
        this.n = this.N.length; this.dim = this.n ? this.N[0].length : 0;
        if (!this.n || !this.dim || this.N.some(row => row.length !== this.dim)) throw new Error('a snapped table needs rows of one length d >= 1');
        this.b = null;
        if (geometry === 'lorentz') {
            const four = 1n << BigInt(2 * K);
            this.b = this.N.map(row => four - row.reduce((s, t) => s + t * t, 0n));
            if (this.b.some(x => x <= 0n)) throw new Error('a dyadic Lorentz point on or past the rim (|n|^2 >= 4^K): not a fence.dyadic snap');
        }
    }
    sq(u) {                                    // |n_u - n_v|^2 for every v, exact
        const a = this.N[u], d = this.dim, out = new Array(this.n);
        for (let v = 0; v < this.n; v++) { const r = this.N[v]; let s = 0n; for (let k = 0; k < d; k++) { const t = a[k] - r[k]; s += t * t; } out[v] = s; }
        return out;
    }
    kappa(u) { const a = this.sq(u); return a.map((x, v) => new Q(x, this.b[v])); }   // Lorentz: kappa_u(v) as Q
    keys(u) { const a = this.sq(u); return this.geometry === 'lorentz' ? kappaClasses(a, this.b) : a; }
}
// the number of query u's candidates tied with an earlier candidate: candidates minus distinct keys among them
function candidateTies(keys, u) { const seen = new Set(); for (let v = 0; v < keys.length; v++) if (v !== u) seen.add(keys[v]); return keys.length - 1 - seen.size; }
// learned.evaluate's twin: every node ranked against all the others by rankQuery (pessimistic ties), for each named
// neighbour table of nbSets ({ closure, graph }, nb[u] the neighbour indices of u). Returns, per name, the APs (Q, null
// for a query without neighbours) and neighbour ranks in query order, the exact MAP (mapExact, queries without
// neighbours left out; null if none has any) and the pooled mean rank (meanRank; null without neighbours); ties (as
// candidateTies, summed); and with offsets and rankList = 'sha' the rank-list SHA-256 of every query.
function evaluateSnapped(arm, nbSets, offsets = null, rankList = null) {
    const names = Object.keys(nbSets), tables = names.map(k => nbSets[k]);
    tables.forEach((t, k) => { if (t.length !== arm.n) throw new Error(`neighbour set ${names[k]} has ${t.length} entries for ${arm.n} nodes`); });
    let last = null;
    const memo = { n: arm.n, keys: u => (last = arm.keys(u)) };
    const aps = tables.map(() => []), ranks = tables.map(() => []), shas = [];
    let ties = 0;
    for (let u = 0; u < arm.n; u++) {
        const r = rankQuery(memo, u, tables, offsets, rankList);
        r.ap.forEach((a, k) => aps[k].push(a));
        r.ranks.forEach((x, k) => ranks[k].push(x));
        if (rankList) shas.push(r.sha);
        ties += candidateTies(last, u);
    }
    const out = { aps: {}, ranks: {}, map: {}, meanRank: {}, ties, shas: rankList ? shas : null };
    names.forEach((name, k) => {
        out.aps[name] = aps[k]; out.ranks[name] = ranks[k];
        out.map[name] = aps[k].some(a => a !== null) ? mapExact(aps[k]) : null;
        out.meanRank[name] = ranks[k].some(r => r.length) ? meanRank(ranks[k]) : null;
    });
    return out;
}
// The MAP as LBENCH/1 writes it (A10.12): 'p/q' in lowest terms and that text's SHA-256
const mapText = m => qOrDash(m);
const mapSha = m => sha256Hex(textBytes(qOrDash(m)));

// ---- the L6 trace (reference/traces_l6.py): 18 toy cases, case i from Rng(8000 + i); its docstring gives the draws
const L6_HEAD = [
    '# l6_v1: snapped toy tables ranked exactly (Amendment 10 items 6 and 11). Case i from Rng(8000 + i), i = 0..17:',
    '# float (i < 6: K = 32; i < 12: K = 8) or grid (K = 32), lorentz for even i, d = 2, 3, 5 by (i mod 6) div 2.',
    '# "<i> case <kind> <geometry> <d> <K> <n>"; "<i> node <offset> <spanning parent: index, x outside, - root>',
    '# <parents> <closure neighbours> <graph neighbours>" (indices; "-" if none); "<i> floatsha <sha256>" (float',
    '# cases: the table\'s little-endian bytes); "<i> snap <offset> <n_1 ... n_d>" (the snapped text) and',
    '# "<i> snapsha <sha256>"; "<i> ap <offset> <closure AP> <graph AP> <rank-list sha256>" and "<i> ranks <offset>',
    '# <closure ranks> <graph ranks>" (pessimistic ties); "<i> map closure|graph <p/q> <sha256 of p/q>";',
    '# "<i> meanrank <closure> <graph>" (pooled); "<i> ties <candidates minus distinct keys, summed over queries>"',
];
const L6_CASES = 18, L6_SEED = 8000;
const L6_SCALES = { lorentz: [1e-3, 0.1, 1, 4, 30, 1e4, 1e11], euclid: [1e-3, 0.1, 1, 4, 30, 1e4, 1e7] };
const l6CaseSpec = i => ({ kind: i < 12 ? 'float' : 'grid', geometry: i % 2 ? 'euclid' : 'lorentz', d: [2, 3, 5][Math.floor((i % 6) / 2)], K: i >= 6 && i < 12 ? 8 : 32 });
const intsText = xs => xs.join(',') || '-';
function l6Dag(rng) {
    const n = 20 + rng.below(25), offsets = [];
    for (let j = 0; j < n; j++) offsets.push(String(10000000 + 1000 * j + rng.below(1000)).padStart(8, '0'));
    const span = [null], parents = [[]];
    for (let j = 1; j < n; j++) {
        const p1 = rng.below(j), p2 = rng.below(j), o = rng.below(10), s = rng.below(4), q = rng.below(j), p = Math.min(p1, p2);
        parents.push((s === 0 && q !== p ? [p, q] : [p]).sort((x, y) => x - y));
        span.push(j >= 2 && o === 0 ? 'x' : p);
    }
    return { n, offsets, span, parents };
}
function l6NeighbourSets(offsets, span, parents) {
    const n = offsets.length, anc = [];
    for (let j = 0; j < n; j++) { const s = new Set(); for (const p of parents[j]) { s.add(p); for (const a of anc[p]) s.add(a); } anc.push(s); }
    const ancM = new Map(), descM = new Map(offsets.map(o => [o, new Set()]));
    offsets.forEach((o, j) => { ancM.set(o, new Set([...anc[j]].map(a => offsets[a]))); for (const a of anc[j]) descM.get(offsets[a]).add(o); });
    const parent = new Map(offsets.map((o, j) => [o, span[j] === null ? null : span[j] === 'x' ? 'outside' : offsets[span[j]]])), children = new Map();
    for (const [o, p] of parent) if (p !== null && p !== 'outside') { if (!children.has(p)) children.set(p, []); children.get(p).push(o); }
    return { closure: closureNeighbours(offsets, ancM, descM), graph: graphNeighbours(offsets, parent, children) };
}
function l6FloatTable(rng, n, geometry, d) {
    const rows = [];
    for (let j = 0; j < n; j++) {
        const t = rng.below(6), src = rng.below(j + 1);
        if (t === 0 && src < j) { rows.push(rows[src].slice()); continue; }
        const scale = L6_SCALES[geometry][rng.below(7)], xs = [];
        for (let k = 0; k < d; k++) xs.push((2 * rng.random() - 1) * scale);
        if (geometry === 'lorentz') { let acc = 0; for (const x of xs) acc = acc + x * x; xs.unshift(Math.sqrt(1 + acc)); }
        rows.push(xs);
    }
    return rows;
}
function l6GridTable(rng, n, d) {
    const m = BigInt(3037000000 + rng.below(400)), rows = [];
    for (let j = 0; j < n; j++) {
        const t = rng.below(10), src = rng.below(j + 1);
        if (t === 0 && src < j) rows.push(rows[src].slice());
        else if (t === 1 && src < j) {
            const perm = rng.shuffle(Array.from({ length: d }, (_, k) => k)), signs = [];
            for (let k = 0; k < d; k++) signs.push(rng.below(2));
            rows.push(perm.map((pk, k) => (signs[k] ? -rows[src][pk] : rows[src][pk])));
        } else if (t === 2) rows.push(new Array(d).fill(0n));
        else if (t === 3 || t === 4) rows.push([m, BigInt(rng.below(4))].concat(new Array(d - 2).fill(0n)));
        else { const r = []; for (let k = 0; k < d; k++) r.push(BigInt(rng.below(2147483649) - 1073741824)); rows.push(r); }
    }
    return rows;
}
// One case of the trace: its lines and its data. armOf(N, geometry, K) makes the arm the case is ranked with (default
// SnapArm: the controls in tests/parity-lexicon.cjs pass a float key instead). The arm ranks the PARSED snapped text,
// as the re-evaluation of a stored table does.
function l6Case(i, armOf = (N, g, K) => new SnapArm(N, g, K)) {
    const { kind, geometry, d, K } = l6CaseSpec(i), rng = new C.Rng(L6_SEED + i);
    const { n, offsets, span, parents } = l6Dag(rng), nb = l6NeighbourSets(offsets, span, parents);
    const lines = [`${i} case ${kind} ${geometry} ${d} ${K} ${n}`];
    for (let j = 0; j < n; j++) lines.push(`${i} node ${offsets[j]} ${span[j] === null ? '-' : span[j]} ${intsText(parents[j])} ${intsText(nb.closure[j])} ${intsText(nb.graph[j])}`);
    let X = null, N;
    if (kind === 'float') {
        X = l6FloatTable(rng, n, geometry, d);
        lines.push(`${i} floatsha ${floatTableSha(X)}`);
        N = snapTable(X, geometry, K);
    } else N = l6GridTable(rng, n, d);
    const text = snapText(offsets, N), parsed = parseSnapText(text);
    if (parsed.offsets.join('\n') !== offsets.join('\n')) throw new Error('the snapped text did not parse back');
    for (const ln of text.split('\n')) lines.push(`${i} snap ${ln}`);
    lines.push(`${i} snapsha ${sha256Hex(textBytes(text))}`);
    const ev = evaluateSnapped(armOf(parsed.N, geometry, K), { closure: nb.closure, graph: nb.graph }, offsets, 'sha');
    for (let u = 0; u < n; u++) {
        lines.push(`${i} ap ${offsets[u]} ${qOrDash(ev.aps.closure[u])} ${qOrDash(ev.aps.graph[u])} ${ev.shas[u]}`);
        lines.push(`${i} ranks ${offsets[u]} ${intsText(ev.ranks.closure[u])} ${intsText(ev.ranks.graph[u])}`);
    }
    for (const name of ['closure', 'graph']) lines.push(`${i} map ${name} ${mapText(ev.map[name])} ${mapSha(ev.map[name])}`);
    lines.push(`${i} meanrank ${qOrDash(ev.meanRank.closure)} ${qOrDash(ev.meanRank.graph)}`);
    lines.push(`${i} ties ${ev.ties}`);
    return { i, kind, geometry, d, K, n, offsets, span, parents, closure: nb.closure, graph: nb.graph, X, N: parsed.N, text, ev, lines };
}
// reference/traces/l6_v1.txt as traces_l6.py writes it, comments included
function l6TraceLines(armOf = undefined) {
    const lines = L6_HEAD.slice(), cases = [];
    for (let i = 0; i < L6_CASES; i++) { const c = l6Case(i, armOf); cases.push(c); lines.push(...c.lines); }
    return { lines, complete: true, cases };
}
// One line per trace line, comments included, regenerated from the trace's seeds (nothing is read from the trace but
// the expected text); traces.l6 = the file's text. got: an l6TraceLines() result to compare against (default: computed).
function l6ParitySections(traces, got = null) {
    return [{ name: 'l6_v1.txt', run() {
        const text = traces.l6, out = [], line = (label, ok, detail = '') => ({ section: 'l6', label, ok: !!ok, detail });
        if (typeof text !== 'string') return [line('file', false, 'reference/traces/l6_v1.txt is missing (reference/traces_l6.py writes it)')];
        const want = text.split('\n');
        out.push(line('file', want[want.length - 1] === '' && (want.length < 2 || want[want.length - 2] !== ''), 'ends with one LF'));
        want.pop();
        const g = (got || l6TraceLines()).lines;
        want.forEach((w, j) => {
            const label = w.startsWith('#') ? `comment ${j + 1}` : w.split(' ').slice(0, 3).join(' ');
            if (j >= g.length) { out.push(line(label, false, 'the core wrote no such line')); return; }
            out.push(line(label, g[j] === w, g[j] === w ? short(w.split(' ').slice(3).join(' '), 60) : firstDiff(w, g[j])));
        });
        if (g.length > want.length) out.push(line('extra lines', false, `the core wrote ${g.length - want.length} lines more than the trace`));
        return out;
    } }];
}
// ===== end of geometry

// ================================================================== chain (Phase 3: L8-L11, Amendment 7)
// Language shards as Owl-valid biochains, the records, the RFC 6962 manifest, the exact weave and the hardened,
// attested import. On biochain_v1.js (Owl's codec, verbatim) and engram_core.js (chainQuaternion, packetQuaternions,
// unfold, qprod, the engram layer), both unchanged, with orbital_core.js's synchronous SHA-256 and WebCrypto ECDSA.
// The section is lazy: those two cores (and the ones engram_core.js needs: twin3d.js, fence.js, ttmpt_core_v1.js) are
// looked up on the first call of a chain function, so a page that loads only the text and geometry cores still works.
// In a page: twin3d.js, fence.js, ttmpt_core_v1.js, engram_core.js and biochain_v1.js, before or after lexicon_core.js
// but before the first chain call. In Node they are required from ../Engram Minds Eye/ on that call.
//
// Implements, in PREREGISTRATION.md: D7, D8; L8 with Amendment 7 items 1-3 (growSync: Owl's growBiochain's steps in
// its order and its record field for field, spike S4's grower; the synthetic shards; the records LVOCAB/1, LADDR/1,
// LPREP/1 with Tier P, LCORPUS/1, LGROW/1); L9 with items 4-5 (RFC 6962 with RFC 9162's proof algorithms, the exact
// weave and its segment sub-weaves, control 1's shdccp/2 Merkle rule, control 2's XOR summary); L10 with item 6 (the
// package and the hardened verifier, checks in the registered order) and L11 with item 7 (the LADDR value recomputed
// once per session; per-check times).
let CHAIN_CORES = null;
function chainCores() {
    if (!CHAIN_CORES) {
        const x = chainSource ? chainSource() : null;
        if (!x || !x.BC || !x.EC) throw new Error('the chain section needs biochain_v1.js and engram_core.js (with twin3d.js, fence.js and ttmpt_core_v1.js) loaded first');
        CHAIN_CORES = x;
    }
    return CHAIN_CORES;
}
// Values the browser cannot read from reference/golden; tests/chain-lexicon.cjs checks them against the meta files.
const CHAIN_PINS = {
    trainSetSha: 'bc86a44d55ee251c718eeb28ecd729396f82e4bca0d530097595cee9794e287f',   // l1_instances_v1.meta.json instances.a
    wordnetZipSha256: 'cbda5ea6eef7f36a97a43d4a75f85e07fccbb4f23657d27b4ccbc93e2646ab59', // wordnet_v1.meta.json source.sha256
    wordnetUrl: 'https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip',
    c0Spdx: 'LicenseRef-WordNet-3.0', synthSpdx: 'CC0-1.0', c0CorpusId: 'wordnet30-c0', synthCorpusId: 'lexicon-synth-v1',
    nbSpec: 'nb_spec_v1',                      // reference/golden/nb_spec_v1.txt: normaliserSpecSha is its SHA-256
    nbSpecSha256: '4ceb92c48d9cbe92204931da3ab2ef1133f74bfb2bd53af26d482af7e69316fd', nbSpecBytes: 2601,   // records.py's pin
};
const CHAIN_SOURCES = { nb_spec_v1: { golden: 'nb_spec_v1.txt' } };

// ---- bytes and hashes. Owl hashes JS strings as UTF-8 (seal-crypto's sha256Hex over TextEncoder); every string
// hashed here is ASCII except a leaf's inner string, which is a chunk's bytes as Latin-1 characters.
function strBytes(s) {                         // the UTF-8 of a JS string; an ASCII string byte for byte
    const n = s.length, out = new Uint8Array(n);
    for (let i = 0; i < n; i++) { const c = s.charCodeAt(i); if (c > 0x7F) return utf8(s); out[i] = c; }
    return out;
}
const sha256Str = s => sha256Hex(strBytes(s));
// the UTF-8 of String.fromCharCode(...bytes): bytes 0x80-0xFF become two bytes
function latin1Utf8(bytes) {
    let n = bytes.length;
    for (let i = 0; i < bytes.length; i++) if (bytes[i] > 0x7F) n++;
    const out = new Uint8Array(n);
    let o = 0;
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if (b < 0x80) out[o++] = b; else { out[o++] = 0xC0 | (b >> 6); out[o++] = 0x80 | (b & 0x3F); }
    }
    return out;
}
function concatBytes(parts) {
    let n = 0;
    for (const p of parts) n += p.length;
    const out = new Uint8Array(n);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
}
const bytesEq = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
function isHex(s, n = -1, lower = true) {      // a string of hex digits (lower case only, by default), of length n if n >= 0
    if (typeof s !== 'string' || (n >= 0 && s.length !== n)) return false;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (!((c >= 48 && c <= 57) || (c >= 97 && c <= 102) || (!lower && c >= 65 && c <= 70))) return false;
    }
    return true;
}
const isDecimal = s => typeof s === 'string' && s.length > 0 && (s === '0' || s.charCodeAt(0) !== 48) && [...s].every(c => c >= '0' && c <= '9');

// ---- Owl's grower, synchronous (spike S4's growSync; scripts/biomesh.js growBiochain at 7f45f35, step for step)
const qconj = a => [a[0], -a[1], -a[2], -a[3]];   // biomesh.js's qconj, which biochain_v1.js does not export
// a leaf: sha256Hex(i + "|" + sha256Hex(String.fromCharCode(...chunk))), both over UTF-8
const leafHash = (i, chunk) => sha256Str(i + '|' + sha256Hex(latin1Utf8(chunk)));
// the shdccp/2 Merkle rule (L9 control 1): pairwise SHA-256 over the two hex strings joined, an odd last node
// duplicated; '' for no leaves (the grower then writes sha256Hex("empty"))
function merkleShdccp2(leaves) {
    let level = leaves.slice();
    while (level.length > 1) {
        if (level.length & 1) level.push(level[level.length - 1]);
        const next = [];
        for (let i = 0; i < level.length; i += 2) next.push(sha256Str(level[i] + level[i + 1]));
        level = next;
    }
    return level.length ? level[0] : '';
}
function weavesOf(chunks) {                     // [chiral, mirror] float weaves (biomesh.js, as Owl writes them)
    const { BC } = chainCores();
    const cq = chunks.map(c => BC.crystalQuat(c));
    let wf = [1, 0, 0, 0], wm = [1, 0, 0, 0];
    for (const q of cq) wf = BC.qn(BC.qmul(q, wf));
    for (let k = cq.length - 1; k >= 0; k--) wm = BC.qn(BC.qmul(qconj(cq[k]), wm));
    return [wf, wm];
}
const segCutsOf = (K, S) => Array.from({ length: S + 1 }, (_, i) => Math.round(i * K / S));
const chunksOf = (data, size) => { const out = []; for (let i = 0; i < data.length; i += size) out.push(data.subarray(i, i + size)); return out; };
const shipOf = (streamHexLen, engramHexLen, K) => streamHexLen / 2 + engramHexLen / 2 + K * 32 + 40;
// The text of a shard as a JS string and as UTF-8: a string is encoded as Owl's TextEncoder encodes it (a lone
// surrogate written as U+FFFD, as the reference's chain.js_utf8), and the engram layer reads the string as given;
// bytes must be valid UTF-8 (strict decoding, as the reference's bytes.decode('utf-8')).
function shardText(input) {
    if (typeof input !== 'string') { const data = toBytes(input); return { text: fromCps(decodeUtf8(data).cps), data }; }
    const cps = [];
    for (let i = 0; i < input.length; i++) {
        const u = input.charCodeAt(i);
        if (u >= 0xD800 && u <= 0xDBFF && i + 1 < input.length) {
            const v = input.charCodeAt(i + 1);
            if (v >= 0xDC00 && v <= 0xDFFF) { cps.push(0x10000 + ((u - 0xD800) << 10) + (v - 0xDC00)); i++; continue; }
        }
        cps.push(u >= 0xD800 && u <= 0xDFFF ? 0xFFFD : u);
    }
    return { text: input, data: utf8FromCps(cps) };
}
// BioChain-AI protocol/shdccp_kernel.py's packet (L8 control 1, the reference's chain.kernel_crystallize): as
// crystallize, but each crystal byte 0x80 (int8 code -128) written as 0x81 (-127), parity recomputed
function kernelCrystallize(bytes) {
    const { BC } = chainCores();
    const w = BigInt('0x' + BC.crystallizeBytes(bytes));
    let q = (w >> 24n) & 0xFFFFFFFFn, k = 0n;
    for (const sh of [24n, 16n, 8n, 0n]) { const v = (q >> sh) & 0xFFn; k = (k << 8n) | (v === 0x80n ? 0x81n : v); }
    return refixParity(word16((w & ~(0xFFFFFFFFn << 24n)) | (k << 24n)));
}
// L8 control 2, a grower that hashes leaves over binary bytes (the reference's chain.leaf_hash_binary and its
// READING): SHA-256(ASCII(i + '|') followed by the 32 raw bytes of SHA-256(chunk)), lowercase hex
const leafHashBinary = (i, chunk) => sha256Hex(concatBytes([strBytes(i + '|'), O.sha256(chunk)]));
// The engram layer (biomesh.js engramStreamFromText) as engram_core.js engramStream computes it, token for token
// (tokenizeBiomesh, crystallize, hexLsb upper-cased, computeJ, the mean J to 4 places), with each distinct token's
// packet computed once: the same stream, count and mean J (tests/chain-lexicon.cjs checks it against engramStream),
// about twice as fast on glosses, whose tokens repeat.
function engramLayer(text) {
    const { EC } = chainCores();
    const tokens = EC.tokenizeBiomesh(text), memo = new Map();
    let stream = '', jsum = 0;
    for (const t of tokens) {
        let m = memo.get(t);
        if (!m) { const g = EC.crystallize(t); m = [hexUpper(EC.hexLsb(g)), EC.computeJ(g)]; memo.set(t, m); }
        stream += m[0]; jsum += m[1];
    }
    return { stream, count: tokens.length, meanJ: tokens.length ? +(jsum / tokens.length).toFixed(4) : 0 };
}
const hexUpper = h => { let s = ''; for (let i = 0; i < h.length; i++) { const c = h.charCodeAt(i); s += c >= 97 && c <= 102 ? String.fromCharCode(c - 32) : h.charAt(i); } return s; };
// growSync(text, { engrams, packets, leaves }) -> Owl's record: chainId, stream, streamVersion, leafHashes,
// merkleRoot, weaveChiral, weaveMirror, segCuts, segments, [engramStream, engramCount, engramMeanJ], origBytes,
// shippedBytes, value, in that key order (the reference's chain.grow). The engram layer is engramLayer (engram_core.js
// engramStream's, ~50x faster than biomesh.js engramStreamFromText; make_biomesh_compat_v1.cjs and
// tests/bridges-lexicon.cjs check it against Owl's own). packets: 'owl' (default) or 'kernel' (control 1); leaves: 'owl' (default) or 'binary'
// (control 2). T (optional) accumulates ms per stage.
function growSync(input, opts = {}, T = null) {
    const { BC, EC } = chainCores();
    const withEngrams = opts.engrams !== false;
    const pack = opts.packets === 'kernel' ? kernelCrystallize : opts.packets === undefined || opts.packets === 'owl' ? BC.crystallizeBytes : null;
    const leafOf = opts.leaves === 'binary' ? leafHashBinary : opts.leaves === undefined || opts.leaves === 'owl' ? leafHash : null;
    if (!pack || !leafOf) throw new Error('packets is owl or kernel; leaves is owl or binary');
    const { text, data } = shardText(input);
    if (!data.length) throw new Error('Nothing to grow.');
    if (data.length > BC.MAX_GROW_BYTES) throw new Error(`Grow input capped at ${BC.MAX_GROW_BYTES} bytes (got ${data.length}).`);
    const clock = T ? (T.clock || nowMs) : null;
    let t = clock ? clock() : 0;
    const lap = k => { if (T) { const u = clock(); T[k] = (T[k] || 0) + u - t; t = u; } };
    const chunks = chunksOf(data, BC.CHUNK);
    const residuals = chunks.map(c => BC.encodeChunk(c));
    lap('encode');
    const packets = chunks.map(c => pack(c));
    lap('crystal');
    const leafHashes = chunks.map((c, i) => leafOf(i, c));
    const root = merkleShdccp2(leafHashes);
    lap('hash');
    const stream = BC.frameStream(packets, residuals);
    const segCuts = segCutsOf(chunks.length, BC.SEGMENTS);
    const [wf, wm] = weavesOf(chunks);
    lap('weave');
    const merkleRoot = root || sha256Str('empty');
    const chainId = 'BC-' + sha256Str(merkleRoot + '|' + BC.quatHex(wf)).slice(0, 24);
    lap('hash');
    const eng = withEngrams ? engramLayer(text) : null;
    lap('engram');
    const ship = shipOf(stream.length, eng ? eng.stream.length : 0, leafHashes.length);
    const rec = { chainId, stream, streamVersion: BC.STREAM_VERSION, leafHashes, merkleRoot,
        weaveChiral: BC.quatHex(wf), weaveMirror: BC.quatHex(wm), segCuts, segments: BC.SEGMENTS };
    if (eng) { rec.engramStream = eng.stream; rec.engramCount = eng.count; rec.engramMeanJ = eng.meanJ; }
    rec.origBytes = data.length; rec.shippedBytes = Math.round(ship); rec.value = +(data.length / ship).toFixed(4);
    return rec;
}
const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
// L8's fields, in Owl's order, and the fields of two records that differ (JSON text of each value; key order last)
const OWL_FIELDS = ['chainId', 'stream', 'streamVersion', 'leafHashes', 'merkleRoot', 'weaveChiral', 'weaveMirror', 'segCuts', 'segments',
    'engramStream', 'engramCount', 'engramMeanJ', 'origBytes', 'shippedBytes', 'value'];
function recordDiff(a, b) {
    const ka = Object.keys(a), kb = Object.keys(b), keys = [...new Set([...OWL_FIELDS, ...ka, ...kb])];
    const bad = keys.filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    if (ka.join() !== kb.join()) bad.push('(key order)');
    return bad;
}

// ---- the stream, frame by frame (strict, as the reference's chain.frames): 16 hex digits of packet, 8 hex digits of
// residual length n, then exactly n hex digit pairs, frame after frame to the end of the string. Owl's
// parseBiochainStream reads the length with parseInt (a sign, spaces, a prefix of hex digits) and a short last
// residual without complaint; a well-formed stream parses the same both ways. Either case is read here; the
// verifier's 'canonical' check then requires the stream to be exactly what frameStream writes.
function framesStrict(stream) {
    const { BC } = chainCores();
    if (typeof stream !== 'string' || !stream.length) throw new Error('no stream');
    const frames = [];
    let p = 0;
    while (p < stream.length) {
        if (p + 24 > stream.length) throw new Error(`frame ${frames.length}: truncated header`);
        const packet = stream.slice(p, p + 16), len = stream.slice(p + 16, p + 24);
        if (!isHex(packet, 16, false) || !isHex(len, 8, false)) throw new Error(`frame ${frames.length}: malformed header`);
        const n = parseInt(len, 16) * 2;
        if (p + 24 + n > stream.length) throw new Error(`frame ${frames.length}: residual truncated`);
        const residual = stream.slice(p + 24, p + 24 + n);
        if (!isHex(residual, -1, false)) throw new Error(`frame ${frames.length}: malformed residual`);
        frames.push({ at: p, packet, lenField: len, residual, ...BC.unpackPacket(packet) });
        p += 24 + n;
    }
    return frames;
}
// [packet offset, residual offset, residual hex length] of each frame (spike S4's frameOffsets)
function frameOffsets(stream) {
    const out = [];
    let p = 0;
    while (p < stream.length) { const r = parseInt(stream.slice(p + 16, p + 24), 16) * 2; out.push([p, p + 24, r]); p += 24 + r; }
    return out;
}
const frameHex = (stream, i) => { const [p, rp, r] = frameOffsets(stream)[i]; return stream.slice(p, rp + r); };
// T7: frames i and i + 1 swapped (whole frames, so each stays well formed)
function swapFrames(stream, i) {
    const fo = frameOffsets(stream), a = fo[i], b = fo[i + 1];
    return stream.slice(0, a[0]) + stream.slice(b[0], b[1] + b[2]) + stream.slice(a[0], a[1] + a[2]) + stream.slice(b[1] + b[2]);
}
// a packet word with its parity bit set again (T2: crystal32 changed, parity re-fixed)
function refixParity(packetHex) {
    const { BC } = chainCores();
    let w = BigInt('0x' + packetHex) & ~(1n << 59n);
    w |= BC.popcountEven(w) << 59n;
    return word16(w);
}
// a 64-bit word as 16 upper-case hex digits, as Owl writes packets (without the platform's case mapping)
function word16(w) {
    let s = '';
    for (let k = 60n; k >= 0n; k -= 4n) s += '0123456789ABCDEF'.charAt(Number((w >> k) & 15n));
    return s;
}
// the crystal's four bytes hold 0x80 (Owl writes it raw; BioChain-AI's kernel would write 0x81)
const crystalHas80 = packetHex => [2, 4, 6, 8].some(k => packetHex.slice(k, k + 2) === '80');
// decodeChunk's loop (biochain_v1.js) with bit positions recorded (spike S4's decodeTraced): the bytes, the bits
// used, the bits in all and the escapes [start bit, end bit, candidates]
function decodeTraced(hexStr, len) {
    const d = [];
    for (let i = 0; i < hexStr.length; i += 2) d.push(parseInt(hexStr.slice(i, i + 2), 16));
    let p = 0;
    const r = n => { let v = 0; for (let i = 0; i < n; i++) { if (p >= d.length * 8) throw new Error('residual truncated'); v = (v << 1) | ((d[p >> 3] >> (7 - (p & 7))) & 1); p++; } return v; };
    const g = () => { let z = 0; while (r(1) === 0) z++; return z ? ((1 << z) | r(z)) : 1; };
    const t = new Map(), out = [], escapes = [];
    let c = [0, 0], ctx = '0,0';
    for (let k = 0; k < len; k++) {
        const m = t.get(ctx), cs = m ? [...m.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(e => e[0]) : [];
        const p0 = p, n = g();
        let b;
        if (n - 1 < cs.length) b = cs[n - 1]; else { escapes.push([p0, p, cs.length]); b = r(8); }
        out.push(b);
        let mm = t.get(ctx); if (!mm) { mm = new Map(); t.set(ctx, mm); } mm.set(b, (mm.get(b) || 0) + 1);
        c = [c[1], b]; ctx = c.join(',');
    }
    return { out, used: p, bits: d.length * 8, escapes };
}
// Every single-bit flip of a residual after which the chunk still decodes to the same bytes (spike S4's silentFlips;
// T9), in S4's order (hex digit i, then bit 0..3 of that digit): [{ i, bit, alt, kind }], kind 'padding' (after the
// last code), 'escape' (inside a raw-byte rank code) or 'other'; q is the bit's position from the residual's start.
function silentFlips(residual, chunk, limit = Infinity) {
    const { BC } = chainCores();
    const tr = decodeTraced(residual, chunk.length);
    if (tr.out.length !== chunk.length || tr.out.some((v, j) => v !== chunk[j])) throw new Error('the residual does not decode to the chunk');
    const same = [];
    for (let i = 0; i < residual.length; i++) for (let bit = 0; bit < 4; bit++) {
        const alt = residual.slice(0, i) + (parseInt(residual.charAt(i), 16) ^ (1 << bit)).toString(16) + residual.slice(i + 1);
        let ok = false;
        try { const x = BC.decodeChunk(alt, chunk.length); ok = x.length === chunk.length && x.every((v, j) => v === chunk[j]); } catch (e) { ok = false; }
        if (ok) {
            const q = 4 * i + (3 - bit);
            same.push({ i, bit, alt, kind: q >= tr.used ? 'padding' : tr.escapes.some(([a, b]) => q >= a && q < b) ? 'escape' : 'other', q });
            if (same.length >= limit) return same;
        }
    }
    return same;
}

// ---- L8's synthetic shards (Amendment 7 item 2)
const SYNTH_LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SYNTH_PUNCT = '0123456789.,;:\'!?-()"\n\t/&%#*+=';   // spike S4's PUNCT
// One draw: a target of 20,000 + below(40,001) UTF-8 bytes, then code points until the next would pass it (that draw is
// spent), each from a class chosen by below(100). READING: "an ASCII letter" is SYNTH_LETTERS[below(52)] and "ASCII
// punctuation (S4's set)" is S4's PUNCT[below(30)] (S4 drew both from the same 32-bit value as the class; the
// amendment gives each class its own below(), so letters and punctuation take one as well).
function synthDraw(rng) {
    const target = 20000 + rng.below(40001), cps = [];
    let n = 0, two = 0;
    for (;;) {
        const cls = rng.below(100);
        let cp;
        if (cls < 40) cp = SYNTH_LETTERS.charCodeAt(rng.below(SYNTH_LETTERS.length));
        else if (cls < 50) cp = 32;
        else if (cls < 55) cp = SYNTH_PUNCT.charCodeAt(rng.below(SYNTH_PUNCT.length));
        else if (cls < 85) cp = 0x80 + rng.below(0x780);
        else if (cls < 95) { cp = 0x800 + rng.below(0xF000); if (cp >= 0xD800) cp += 0x800; }
        else cp = 0x10000 + rng.below(0x100000);
        const len = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
        if (n + len > target) break;
        cps.push(cp); n += len;
        if (len === 2) two++;
    }
    return { target, cps, bytes: n, twoByte: two };
}
// shard i of seed base: drawn from one Rng(seed) until a chunk's crystal holds 0x80. Returns the text, its UTF-8,
// the number of draws, the code point and two-byte counts and the 0x80 chunks.
function synthShard(seed) {
    const { BC } = chainCores();
    const rng = new C.Rng(seed);
    for (let draws = 1; ; draws++) {
        const d = synthDraw(rng), data = utf8FromCps(d.cps);
        const has80 = chunksOf(data, BC.CHUNK).map((c, k) => (crystalHas80(BC.crystallizeBytes(c)) ? k : -1)).filter(k => k >= 0);
        if (has80.length) return { seed, text: fromCps(d.cps), data, draws, target: d.target, codePoints: d.cps.length, twoByte: d.twoByte, chunks80: has80 };
        if (draws > 1000) throw new Error('no 0x80 crystal in 1000 draws');
    }
}

// ---- gloss shards: C0 (nouns), and the dry runs' verb and adjective shards, cut as spike S4 cut them
// one line per synset in offset order: offset TAB lemmas ('_' read as a space) joined by ', ' TAB gloss
function glossLines(wn, pos) {
    const m = asMap(wn.synsets[pos]);
    return [...m.keys()].sort().map(off => { const s = m.get(off); return off + '\t' + s.lemmas.map(l => l.split('_').join(' ')).join(', ') + '\t' + s.gloss; });
}
// lines joined by LF and cut greedily at line boundaries into shards of at most max UTF-8 bytes (the LF at a cut
// belongs to neither shard), as wordnet.py c0_shards
function cutShards(lines, max = 60000) {
    const out = [];
    let cur = [], b = 0;
    for (const l of lines) {
        const n = strBytes(l).length;
        if (n > max) throw new Error('a line longer than a shard');
        if (cur.length && b + 1 + n > max) { out.push(cur.join('\n')); cur = []; b = 0; }
        b += (cur.length ? 1 : 0) + n; cur.push(l);
    }
    if (cur.length) out.push(cur.join('\n'));
    return out;
}
const glossShards = (wn, pos) => cutShards(glossLines(wn, pos));

// ---- RFC 6962 (Amendment 7 item 5): leaf SHA-256(0x00 || data), node SHA-256(0x01 || left || right), split at the
// largest power of two below n, no duplication; RFC 9162's inclusion and consistency proofs and their verification.
// Hashes are Uint8Array(32); entries are Uint8Arrays.
const B00 = Uint8Array.of(0), B01 = Uint8Array.of(1);
const rfcLeafHash = data => O.sha256(concatBytes([B00, data]));
const rfcNodeHash = (l, r) => O.sha256(concatBytes([B01, l, r]));
const RFC_EMPTY_ROOT = () => O.sha256(new Uint8Array(0));
const largestPow2Below = n => { let k = 1; while (k * 2 < n) k *= 2; return k; };
class RfcTree {
    constructor(entries) { this.D = entries; this.n = entries.length; this.memo = new Map(); }
    mth(lo = 0, hi = this.n) {                 // MTH(D[lo:hi])
        if (hi === lo) return RFC_EMPTY_ROOT();
        const key = lo * 4194304 + hi;
        let x = this.memo.get(key);
        if (x) return x;
        if (hi - lo === 1) x = rfcLeafHash(this.D[lo]);
        else { const k = largestPow2Below(hi - lo); x = rfcNodeHash(this.mth(lo, lo + k), this.mth(lo + k, hi)); }
        this.memo.set(key, x);
        return x;
    }
    root() { return this.mth(0, this.n); }
    leaf(m) { return this.mth(m, m + 1); }
    path(m, lo = 0, hi = this.n) {             // PATH(m, D[lo:hi]): the audit path of leaf m
        const n = hi - lo;
        if (n === 1) return [];
        const k = largestPow2Below(n);
        return m < k ? [...this.path(m, lo, lo + k), this.mth(lo + k, hi)] : [...this.path(m - k, lo + k, hi), this.mth(lo, lo + k)];
    }
    subproof(m, lo, hi, b) {
        const n = hi - lo;
        if (m === n) return b ? [] : [this.mth(lo, hi)];
        const k = largestPow2Below(n);
        return m <= k ? [...this.subproof(m, lo, lo + k, b), this.mth(lo + k, hi)] : [...this.subproof(m - k, lo + k, hi, false), this.mth(lo, lo + k)];
    }
    consistency(m, n = this.n) { return this.subproof(m, 0, n, true); }   // PROOF(m, D[0:n])
}
// RFC 9162 section 2.1.3.2
function rfcVerifyInclusion(index, size, leafHash, proof, root) {
    if (!(Number.isSafeInteger(index) && Number.isSafeInteger(size)) || index < 0 || index >= size) return false;
    let fn = index, sn = size - 1, r = leafHash;
    for (const p of proof) {
        if (sn === 0) return false;
        if ((fn & 1) || fn === sn) { r = rfcNodeHash(p, r); if (!(fn & 1)) while (!(fn & 1) && fn !== 0) { fn = Math.floor(fn / 2); sn = Math.floor(sn / 2); } }
        else r = rfcNodeHash(r, p);
        fn = Math.floor(fn / 2); sn = Math.floor(sn / 2);
    }
    return sn === 0 && bytesEq(r, root);
}
// RFC 9162 section 2.1.4.2; m = n with an empty proof and equal roots is accepted (spike S4's reading); m < 1 fails
function rfcVerifyConsistency(m, n, rootM, rootN, proof) {
    if (!(Number.isSafeInteger(m) && Number.isSafeInteger(n)) || m < 1 || m > n) return false;
    if (m === n) return proof.length === 0 && bytesEq(rootM, rootN);
    const c = (m & (m - 1)) === 0 ? [rootM, ...proof] : proof.slice();
    if (!c.length) return false;
    let fn = m - 1, sn = n - 1;
    while (fn & 1) { fn = Math.floor(fn / 2); sn = Math.floor(sn / 2); }
    let fr = c[0], sr = c[0];
    for (const x of c.slice(1)) {
        if (sn === 0) return false;
        if ((fn & 1) || fn === sn) { fr = rfcNodeHash(x, fr); sr = rfcNodeHash(x, sr); if (!(fn & 1)) while (!(fn & 1) && fn !== 0) { fn = Math.floor(fn / 2); sn = Math.floor(sn / 2); } }
        else sr = rfcNodeHash(sr, x);
        fn = Math.floor(fn / 2); sn = Math.floor(sn / 2);
    }
    return bytesEq(fr, rootM) && bytesEq(sr, rootN) && sn === 0;
}
const rfcRoot = entries => new RfcTree(entries).root();
// L9's synthetic leaf lists (Amendment 7 item 5): K leaves of 32 bytes, eight next_u32 each, big-endian
function rfcLeaves(seed, K) {
    const rng = new C.Rng(seed);
    return Array.from({ length: K }, () => {
        const b = new Uint8Array(32);
        for (let k = 0; k < 8; k++) { const x = rng.nextU32(); b[4 * k] = x >>> 24; b[4 * k + 1] = (x >>> 16) & 255; b[4 * k + 2] = (x >>> 8) & 255; b[4 * k + 3] = x & 255; }
        return b;
    });
}
// L9's control 2: an order-blind summary, the XOR of the 64-bit prefixes (16 hex digits)
function xorSummary(hexLeaves) {
    let x = 0n;
    for (const h of hexLeaves) x ^= BigInt('0x' + h.slice(0, 16));
    return x.toString(16).padStart(16, '0');
}

// ---- the exact norm-5 weave (Amendment 7 item 4)
const weaveValues = leafHashes => leafHashes.map(h => { if (!isHex(h, 64)) throw new Error('a leaf hash is 64 lower-case hex digits'); return BigInt('0x' + h.slice(0, 16)); });
const exactWeave = leafHashes => chainCores().EC.chainQuaternion(weaveValues(leafHashes));
const weaveText = q => q.map(String).join(',');           // the components in decimal joined by ','
const weave3Sha = q => sha256Str(weaveText(q));
// the segment sub-weaves: the products of packetQuaternions over segCuts, as spike S4 computed them
function segmentWeaves(leafHashes, segCuts) {
    const { EC } = chainCores();
    const pq = EC.packetQuaternions(weaveValues(leafHashes));
    return segCuts.slice(0, -1).map((lo, s) => EC.qprod(pq.slice(lo, segCuts[s + 1])));
}
// L9(b) on one record: norm 5^(28K), unfold to the prefixes in order, the ordered product of the segment sub-weaves
function weaveReport(leafHashes, segCuts) {
    const { EC } = chainCores();
    const vals = weaveValues(leafHashes), K = vals.length, q = EC.chainQuaternion(vals);
    const back = EC.unfold(q, K), segs = segmentWeaves(leafHashes, segCuts);
    return {
        q, K, text: weaveText(q), sha256: weave3Sha(q),
        normOk: EC.qnorm(q) === 5n ** (BigInt(EC.L) * BigInt(K)),
        unfoldOk: !!back && back.length === K && back.every((v, i) => v === vals[i]),
        segmentsOk: EC.qeq(EC.qprod(segs), q),
        bits: q.map(x => (x < 0n ? -x : x).toString(2).length), segments: segs,
    };
}

// ---- the records (Amendment 7 item 3): pipe-joined UTF-8 strings, '-' for an empty field, hashed as lowercase hex
// SHA-256 of their bytes
const recordOf = fields => { const text = fields.map(f => (f === '' || f === null || f === undefined ? '-' : String(f))).join('|'); return { text, sha256: sha256Hex(utf8(text)) }; };
const SPECIAL_LIST = vocab => SPECIALS.map(s => { if (!vocab.ids.has(s)) throw new Error('no ' + s); return `${s}=${vocab.ids.get(s)}`; }).join(',');
// normaliserSpecSha: the SHA-256 of reference/golden/nb_spec_v1.txt, the pinned value (CHAIN_PINS.nbSpecSha256).
// Where the file can be read (Node), it is refused unless its SHA-256 and size are the pin; a page uses the pin.
function nbSpecShaOf(bytes) { verifyPin(toBytes(bytes), { sha256: CHAIN_PINS.nbSpecSha256, bytes: CHAIN_PINS.nbSpecBytes }, 'nb_spec_v1.txt'); return CHAIN_PINS.nbSpecSha256; }
function nbSpecSha() {
    const x = dataSource(CHAIN_PINS.nbSpec, CHAIN_SOURCES.nb_spec_v1);
    return x !== undefined && x !== null ? nbSpecShaOf(x) : CHAIN_PINS.nbSpecSha256;
}
// LVOCAB/1|vocabSha256|normaliserSpecSha|unicodeTablesSha|wordpiece-greedy/1|lex0-bpe/1|trainSetSha|-|specials
function lvocab({ vocab = loadV0(), normaliserSpecSha = nbSpecSha(), unicodeTablesSha = PINS.unicode.sha256, trainSetSha = CHAIN_PINS.trainSetSha } = {}) {
    return recordOf(['LVOCAB/1', vocab.sha256, normaliserSpecSha, unicodeTablesSha, 'wordpiece-greedy/1', 'lex0-bpe/1', trainSetSha, '-', SPECIAL_LIST(vocab)]);
}
// The rows of map A in id order: id|token|word|len|h3PointSha|h2PointSha (word as digits; a point's hash is the
// SHA-256 of its canonical text). READING: a point's canonical text is its coordinates as the canonical point list
// (Amendment 1 item 6) writes them after "offset tree ": c0 c1 c2 [c3], each p/q in lowest terms, joined by single
// spaces (h3: this core's integer frames over 7^len, equal to decoder3d.js pointExact; h2: D3's tree).
function addrRows(entries, words) {
    if (entries.length !== words.length) throw new Error('one word per entry');
    const h3 = h3Points(words), h2 = H2_TREE.points(words);
    return words.map((w, id) => [id, entries[id], wordStr(w), w.length,
        sha256Str(coordsText(h3[id], h3Den(w.length))), sha256Str(coordsText(h2[id], H2_TREE.den(w.length)))].join('|'));
}
function laddrRows(vocab, wn) {
    const [words, report] = mapA(vocab.entries, wn, nounWords(wn), verbWords(wn));
    return { rows: addrRows(vocab.entries, words), words, report };
}
// addrTableRoot: the RFC 6962 root over the rows' UTF-8, lowercase hex
const addrTableRoot = rows => O.toHex(rfcRoot(rows.map(r => utf8(r))));
// LADDR/1|vocabSha256|wordnetZipSha256|L3/1|addrTableRoot|3/4|11/13|D3
const laddr = ({ vocab = loadV0(), root, wordnetZipSha256 = CHAIN_PINS.wordnetZipSha256 }) =>
    recordOf(['LADDR/1', vocab.sha256, wordnetZipSha256, 'L3/1', root, '3/4', '11/13', 'D3']);
function laddrOf(vocab, wn) { const { rows } = laddrRows(vocab, wn), root = addrTableRoot(rows); return { ...laddr({ vocab, root }), root, rows: rows.length }; }
// the V0 id stream of a whole shard as one instance (Amendment 1 item 2) and its SHA-256
const shardIdStream = (data, vocab = loadV0()) => idStream([encode(toBytes(data), vocab).ids]);
const shardIdStreamSha = (data, vocab = loadV0()) => sha256Hex(shardIdStream(data, vocab));
// sourceUrlSha: C0's is the SHA-256 of the archive's URL; synthetic shard i's of 'rng:<base>+<i>'. READING: the
// amendment's 'rng:1000+i' is written with i replaced by the shard's index and '1000+' kept ('rng:1000+3'); dry runs
// write their own base ('rng:4000+3').
const synthSource = (i, base = 1000) => `rng:${base}+${i}`;
const sourceUrlSha = src => sha256Str(src);
// Tier P (Amendment 7 item 3): saltedRoot = SHA-256('LPREP-SALT/1|' + salt hex + '|' + merkleRoot + '|' + chainId);
// the test salt of shard j is the SHA-256 of 'lexicon-test-salt/1|j' (its hex is the salt hex)
const testSalt = j => sha256Str(`lexicon-test-salt/1|${j}`);
const saltedRoot = (saltHex, merkleRoot, chainId) => sha256Str(`LPREP-SALT/1|${saltHex}|${merkleRoot}|${chainId}`);
// The LPREP/1 fields of a record, from the record and its text. tier 'S' (the default) or 'P' (salt required).
// LPREP/1|corpusId|shardIndex|chainId|merkleRoot|byteLen|rawSha256|spdx|sourceUrlSha|lvocabHash|idStreamSha256|
// laddrHash|weave3Sha|engramStreamSha|tier, and for Tier P chainId '-' and |saltedRoot appended.
// READING: Tier P writes 'P' in the tier field, keeps merkleRoot (only chainId is named as withheld), and the salted
// root takes the record's real chainId.
function lprepFields({ record, text, corpusId, shardIndex, spdx, sourceSha, lvocabHash, laddrHash, tier = 'S', salt = null, vocab = loadV0(), idSha = null, weaveSha = null }) {
    const data = typeof text === 'string' ? utf8(text) : toBytes(text);
    if (tier !== 'S' && tier !== 'P') throw new Error('tier is S or P');
    if (tier === 'P' && !isHex(salt)) throw new Error('Tier P needs a salt (lower-case hex)');
    const f = ['LPREP/1', corpusId, String(shardIndex), tier === 'P' ? '-' : record.chainId, record.merkleRoot, String(data.length), sha256Hex(data), spdx, sourceSha,
        lvocabHash, idSha || shardIdStreamSha(data, vocab), laddrHash, weaveSha || weave3Sha(exactWeave(record.leafHashes)),
        typeof record.engramStream === 'string' ? sha256Str(record.engramStream) : '-', tier];
    if (tier === 'P') f.push(saltedRoot(salt, record.merkleRoot, record.chainId));
    return f;
}
const lprep = opts => recordOf(lprepFields(opts));
// L10's T3 (and the like): field k of a pipe-joined record replaced
const LPREP_FIELDS = ['format', 'corpusId', 'shardIndex', 'chainId', 'merkleRoot', 'byteLen', 'rawSha256', 'spdx', 'sourceUrlSha', 'lvocabHash',
    'idStreamSha256', 'laddrHash', 'weave3Sha', 'engramStreamSha', 'tier', 'saltedRoot'];
const withField = (text, name, value) => { const f = text.split('|'), k = LPREP_FIELDS.indexOf(name); if (k < 0 || k >= f.length) throw new Error('no field ' + name); f[k] = value; return f.join('|'); };
// spdxSetSha. READING (the amendment names the field and not its rule): the SHA-256 of the corpus's distinct SPDX
// identifiers in code-point order, joined by ','.
const spdxSetSha = list => sha256Str([...new Set(list)].sort().join(','));
// A corpus manifest over LPREP/1 strings in shard order: its leaves are the 32-byte SHA-256 digests of the strings.
function corpusTree(lpreps) { return new RfcTree(lpreps.map(s => O.sha256(utf8(s)))); }
// LCORPUS/1|corpusId|N|root|spdxSetSha|-|-|-|-
const lcorpus = ({ corpusId, lpreps, spdxSha, tree = null }) => {
    const t = tree || corpusTree(lpreps);
    return { ...recordOf(['LCORPUS/1', corpusId, String(t.n), O.toHex(t.root()), spdxSha, '-', '-', '-', '-']), root: O.toHex(t.root()), tree: t };
};
// LGROW/1|corpusId|N_old|root_old|N_new|root_new|proofSha, proofSha the SHA-256 of the proof's hashes concatenated
const proofSha = proof => sha256Hex(concatBytes(proof));
const lgrow = ({ corpusId, nOld, rootOld, nNew, rootNew, proof }) =>
    recordOf(['LGROW/1', corpusId, String(nOld), rootOld, String(nNew), rootNew, proofSha(proof)]);
const hexList = hashes => hashes.map(h => O.toHex(h));
const bytesList = list => list.map(h => { if (!isHex(h, 64)) throw new Error('a proof hash is 64 lower-case hex digits'); return fromHex(h); });

// ---- ATTEST/1 (BioChain-AI src/identity: crypto-core.js attestationPayload, keyIdFromPublic; signing-key.js
// verifyAttestation's order: registry entry, status, key vector, signature). ECDSA P-256 over SHA-256 of the UTF-8
// payload in WebCrypto; signatures are IEEE P1363 r||s, 64 bytes, as hex.
const ECDSA_KEY = { name: 'ECDSA', namedCurve: 'P-256' }, ECDSA_SIGN = { name: 'ECDSA', hash: 'SHA-256' };
function subtle() {
    const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (!c || !c.subtle) throw new Error('WebCrypto (crypto.subtle) is not available');
    return c.subtle;
}
const attestPayload = ({ keyId, keyVector, contentHash, epochToken }) => ['ATTEST/1', keyId, keyVector, contentHash, epochToken].join('|');
const keyIdOf = jwk => 'K-' + sha256Str(`${jwk.x}|${jwk.y}`).slice(0, 24);
const publicJwkOf = jwk => ({ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y });
const importPublic = jwk => subtle().importKey('jwk', publicJwkOf(jwk), ECDSA_KEY, false, ['verify']);
async function newKeyPair() {                  // a P-256 pair in WebCrypto (per run, Amendment 7 item 6)
    const kp = await subtle().generateKey(ECDSA_KEY, true, ['sign', 'verify']);
    const publicJwk = publicJwkOf(await subtle().exportKey('jwk', kp.publicKey));
    return { privateKey: kp.privateKey, publicKey: kp.publicKey, publicJwk, keyId: keyIdOf(publicJwk) };
}
// an ATTEST/1 block over a commitment string: contentHash = SHA-256 of the commitment; sig over the payload
async function attestSign(privateKey, { keyId, keyVector, epochToken }, commitment) {
    const contentHash = sha256Str(commitment);
    const sig = new Uint8Array(await subtle().sign(ECDSA_SIGN, privateKey, strBytes(attestPayload({ keyId, keyVector, contentHash, epochToken }))));
    return { keyId, keyVector, contentHash, epochToken, sig: hex(sig) };
}
// ---- ECDSA P-256 in BigInt, with RFC 6979 deterministic nonces (HMAC-SHA-256 on orbital_core's SHA-256): for the
// trace and its fixed test keys only (the reference's attest.TRACE_KEYS, signed with cryptography's
// deterministic_signing), so a trace's signatures are the same on every run and in both languages. Registered runs
// sign with keys made in WebCrypto (newKeyPair, attestSign), and every verification is WebCrypto's.
const P256 = {
    p: 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFn,
    n: 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551n,
    b: 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604Bn,
    gx: 0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296n,
    gy: 0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5n,
};
const modP = (a, m) => { const r = a % m; return r < 0n ? r + m : r; };
function modInv(a, m) {                         // extended Euclid; a coprime to m
    let r0 = modP(a, m), r1 = m, s0 = 1n, s1 = 0n;
    while (r1) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; }
    return modP(s0, m);
}
// Jacobian coordinates [X, Y, Z] (null: the point at infinity); a = -3
function jDouble(P) {
    if (!P || P[1] === 0n) return null;
    const p = P256.p, [X, Y, Z] = P, d = Z * Z % p, g = Y * Y % p, be = X * g % p;
    const al = 3n * modP(X - d, p) * (X + d) % p;
    const X3 = modP(al * al - 8n * be, p), Z3 = modP((Y + Z) * (Y + Z) - g - d, p), Y3 = modP(al * (4n * be - X3) - 8n * g * g, p);
    return [X3, Y3, Z3];
}
function jAdd(P, Q) {
    if (!P) return Q;
    if (!Q) return P;
    const p = P256.p, [X1, Y1, Z1] = P, [X2, Y2, Z2] = Q;
    const z1 = Z1 * Z1 % p, z2 = Z2 * Z2 % p, u1 = X1 * z2 % p, u2 = X2 * z1 % p, s1 = Y1 * Z2 % p * z2 % p, s2 = Y2 * Z1 % p * z1 % p;
    if (u1 === u2) return s1 === s2 ? jDouble(P) : null;
    const h = modP(u2 - u1, p), i = 4n * h * h % p, j = h * i % p, r = 2n * modP(s2 - s1, p) % p, v = u1 * i % p;
    const X3 = modP(r * r - j - 2n * v, p), Y3 = modP(r * (v - X3) - 2n * s1 * j, p), Z3 = modP(((Z1 + Z2) * (Z1 + Z2) - z1 - z2) % p * h, p);
    return [X3, Y3, Z3];
}
let P256_G2 = null;                             // 2^i G, i = 0..255, for a fixed-base product
function p256Mul(k) {                           // k G, affine [x, y]
    if (!P256_G2) { P256_G2 = [[P256.gx, P256.gy, 1n]]; for (let i = 1; i < 256; i++) P256_G2.push(jDouble(P256_G2[i - 1])); }
    let R = null;
    for (let i = 0; k > 0n; i++, k >>= 1n) if (k & 1n) R = jAdd(R, P256_G2[i]);
    if (!R) throw new Error('k G is the point at infinity');
    const zi = modInv(R[2], P256.p), z2 = zi * zi % P256.p;
    return [R[0] * z2 % P256.p, R[1] * z2 % P256.p * zi % P256.p];
}
const bigBytes = (x, n) => { const out = new Uint8Array(n); for (let i = n - 1; i >= 0; i--) { out[i] = Number(x & 255n); x >>= 8n; } if (x) throw new RangeError('does not fit'); return out; };
const bytesBig = b => { let x = 0n; for (const v of b) x = (x << 8n) | BigInt(v); return x; };
function hmacSha256(key, msg) {
    const k = key.length > 64 ? O.sha256(key) : key, ip = new Uint8Array(64), op = new Uint8Array(64);
    for (let i = 0; i < 64; i++) { const v = i < k.length ? k[i] : 0; ip[i] = v ^ 0x36; op[i] = v ^ 0x5C; }
    return O.sha256(concatBytes([op, O.sha256(concatBytes([ip, msg]))]));
}
// RFC 6979 section 3.2 for P-256 and SHA-256 (qlen = hlen = 256): the nonces k in order (a generator)
function* rfc6979Nonces(d, h1) {
    const n = P256.n, x = bigBytes(d, 32), hb = bigBytes(modP(bytesBig(h1), n), 32);
    let V = new Uint8Array(32).fill(1), K = new Uint8Array(32);
    K = hmacSha256(K, concatBytes([V, Uint8Array.of(0), x, hb])); V = hmacSha256(K, V);
    K = hmacSha256(K, concatBytes([V, Uint8Array.of(1), x, hb])); V = hmacSha256(K, V);
    for (;;) {
        V = hmacSha256(K, V);
        const k = bytesBig(V);
        if (k >= 1n && k < n) yield k;
        K = hmacSha256(K, concatBytes([V, Uint8Array.of(0)])); V = hmacSha256(K, V);
    }
}
// deterministic ECDSA P-256 / SHA-256 over a message's bytes: { r, s } (s as computed, not normalised to low-S)
function ecdsaSignDet(d, msg) {
    const n = P256.n, h1 = O.sha256(msg), e = modP(bytesBig(h1), n);
    for (const k of rfc6979Nonces(d, h1)) {
        const r = modP(p256Mul(k)[0], n);
        if (r === 0n) continue;
        const s = modInv(k, n) * (e + r * d) % n;
        if (s !== 0n) return { r, s };
    }
    return null;
}
// the encodings: IEEE P1363 r || s (each 32 bytes), DER SEQUENCE { INTEGER r, INTEGER s }, and the unpadded P1363
// that L10's encoding control exposes (r and s in minimal length)
const p1363Of = ({ r, s }) => concatBytes([bigBytes(r, 32), bigBytes(s, 32)]);
const rsOfP1363 = sig => ({ r: bytesBig(sig.subarray(0, 32)), s: bytesBig(sig.subarray(32, 64)) });
function derInt(x) {
    let b = [];
    for (let y = x; y > 0n; y >>= 8n) b.unshift(Number(y & 255n));
    if (!b.length) b = [0];
    if (b[0] & 0x80) b.unshift(0);
    return [0x02, b.length, ...b];
}
function derOf({ r, s }) { const body = [...derInt(r), ...derInt(s)]; return Uint8Array.from([0x30, body.length, ...body]); }
const minBytes = x => { const b = []; for (let y = x; y > 0n; y >>= 8n) b.unshift(Number(y & 255n)); return Uint8Array.from(b); };
const p1363Unpadded = ({ r, s }) => concatBytes([minBytes(r), minBytes(s)]);
const highSTwin = sig => { const { r, s } = rsOfP1363(sig); return p1363Of({ r, s: P256.n - s }); };
// base64url without padding, and a test key's public JWK and keyId
const B64U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function b64u(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0), left = bytes.length - i;
        s += B64U.charAt(n >> 18) + B64U.charAt((n >> 12) & 63) + (left > 1 ? B64U.charAt((n >> 6) & 63) : '') + (left > 2 ? B64U.charAt(n & 63) : '');
    }
    return s;
}
function testJwk(d) { const [x, y] = p256Mul(d); return { kty: 'EC', crv: 'P-256', x: b64u(bigBytes(x, 32)), y: b64u(bigBytes(y, 32)) }; }
// an ATTEST/1 block signed deterministically with the test key d (the reference's attest.attest, deterministic)
function attestDet(d, keyVector, content, epochToken) {
    const keyId = keyIdOf(testJwk(d)), contentHash = sha256Str(content);
    const sig = p1363Of(ecdsaSignDet(d, strBytes(attestPayload({ keyId, keyVector, contentHash, epochToken }))));
    return { keyId, keyVector, contentHash, epochToken, sig: hex(sig) };
}
// The trace's fixed keys (the reference's attest.TRACE_KEYS; never a registered key): A is RFC 6979 A.2.5's published
// P-256 key, B and C are SHA-256 of a label mod (n - 1) + 1
const traceKey = label => bytesBig(O.sha256(strBytes(label))) % (P256.n - 1n) + 1n;
const TRACE_KEYS = () => ({ A: 0xC9AFA9D845BA75166B5C215767B1D6934E50C3DB36E89B127B8A622B120F6721n,
    B: traceKey('hyperbolic-lexicon trace key B'), C: traceKey('hyperbolic-lexicon trace key C') });

// ---- BioChain-AI's identity and key vector, ported (identity-registry.js computeIdentityId; crypto-core.js
// deriveKeyVector, canonicalParams, expandHolographic, shdccpCompress's 64-bit accumulator), as the reference's
// attest.identity_id and key_vector. READING: computeIdentityId trims the seed; the registered seed
// 'hyperbolic-lexicon/phase3' has no surrounding white space, so it is used as given (this core never trims).
const IDENTITY_SEED = 'hyperbolic-lexicon/phase3', IDENTITY_UID = 'lexicon';
const CANONICAL_PARAMS = '{"lattice":"E8","hilbertDim":64,"modulus":240,"manifold":"clifford","coherency":0.75,"torsion":0.5}';
const holographic = b32 => concatBytes([b32, b32.map(b => 0xFF ^ b)]);
function vector64(b64) {
    let acc = 0n;
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++)
        acc = (acc * 31n + BigInt(b64[x * 16 + y * 4 + z] * (x + 1) * (y + 1) * (z + 1))) & 0xFFFFFFFFFFFFFFFFn;
    return word16(acc);
}
function identityIdOf(seed = IDENTITY_SEED, uid = IDENTITY_UID) {
    if (!seed) throw new Error('Identity seed is empty');
    const geo = BigInt('0x' + vector64(holographic(O.sha256(utf8(seed))))), u8 = bytesBig(O.sha256(utf8(uid)).subarray(0, 8));
    return '0x' + word16(geo ^ u8);
}
const keyVectorOf = (identityId, epochToken) => vector64(holographic(O.sha256(utf8(`${identityId}|${CANONICAL_PARAMS}|${epochToken}`))));
// 'EPOCH-OFFLINE-<UTC date>' with the date as YYYY-MM-DD (the reference's attest.epoch_token)
const epochTokenOf = date => 'EPOCH-OFFLINE-' + date;
// The key-registry snapshot (Amendment 7 item 6: keyId, public JWK, keyVector, status), written with a run and
// pinned by the SHA-256 of its UTF-8. As the reference's attest.snapshot_text: a JSON array without spaces of
// {keyId, publicJwk: {kty, crv, x, y}, keyVector, status}, in that key order, entries sorted by keyId; keyId is
// keyIdFromPublic of the JWK, status one of active, revoked, retired.
const KEY_STATUSES = ['active', 'revoked', 'retired'];
function registryEntry(jwk, keyVector, status) {
    if (!KEY_STATUSES.includes(status)) throw new Error('unknown key status ' + status);
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') throw new Error('not a P-256 EC JWK');
    return { keyId: keyIdOf(jwk), publicJwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y }, keyVector, status };
}
function registrySnapshot(entries) {
    const rows = entries.map(e => registryEntry(e.publicJwk, e.keyVector, e.status)).sort((a, b) => (a.keyId < b.keyId ? -1 : a.keyId > b.keyId ? 1 : 0));
    if (new Set(rows.map(r => r.keyId)).size !== rows.length) throw new Error('two registry entries share a keyId');
    const text = JSON.stringify(rows);
    return { text, sha256: sha256Hex(utf8(text)) };
}
// { keyId: entry } from a snapshot text, refused unless its SHA-256 is the pin and every entry is exactly
// registryEntry(its JWK, keyVector, status) (so its keyId is its JWK's)
function loadSnapshot(text, pinnedSha) {
    if (typeof text !== 'string' || sha256Hex(utf8(text)) !== pinnedSha) throw new Error('the registry snapshot is not the pinned one');
    const out = new Map();
    for (const e of JSON.parse(text)) {
        if (JSON.stringify(registryEntry(e.publicJwk, e.keyVector, e.status)) !== JSON.stringify(e)) throw new Error('a malformed registry entry: ' + e.keyId);
        out.set(e.keyId, e);
    }
    return out;
}
// a signature's hex (either case, as the reference reads it) as bytes, or null
function sigBytes(s) {
    if (!isHex(s, 128, false)) return null;
    const out = new Uint8Array(64);
    for (let i = 0; i < 64; i++) out[i] = parseInt(s.slice(2 * i, 2 * i + 2), 16);
    return out;
}
// An ATTEST/1 block against a commitment string and the registry (BioChain's verifyAttestationAgainstContent with
// the snapshot for Firestore; the reference's attest.verify_attestation, reason for reason): [ok, reason, entry]. The
// signer is the registry's entry for block.keyId; the payload is rebuilt with the registry's keyVector; only an
// active key verifies. Public keys are imported once per keyId and JWK (never keyed by anything the package holds).
async function verifyAttestation(block, content, registry, keyCache = new Map()) {
    const names = ['keyId', 'keyVector', 'contentHash', 'epochToken', 'sig'];
    if (!block || typeof block !== 'object' || !names.every(k => typeof block[k] === 'string')) return [false, 'malformed attestation block', null];
    const entry = registry.get(block.keyId);
    if (!entry) return [false, 'unknown key', null];
    if (entry.status !== 'active') return [false, `key ${entry.status}`, entry];
    if (block.keyVector !== entry.keyVector) return [false, 'key-vector mismatch', entry];
    if (block.contentHash !== sha256Str(content)) return [false, 'content does not match attestation', entry];
    const sig = sigBytes(block.sig);
    if (!sig) return [false, 'signature is not 128 hex digits', entry];
    const ck = `${entry.keyId}|${entry.publicJwk.x}|${entry.publicJwk.y}`;
    if (!keyCache.has(ck)) keyCache.set(ck, await importPublic(entry.publicJwk));
    const payload = attestPayload({ keyId: block.keyId, keyVector: entry.keyVector, contentHash: block.contentHash, epochToken: block.epochToken });
    let ok = false;
    try { ok = await subtle().verify(ECDSA_SIGN, keyCache.get(ck), sig, strBytes(payload)); } catch (e) { ok = false; }
    return ok ? [true, 'verified', entry] : [false, 'signature invalid', entry];
}

// ---- the hardened verifier (L10, Amendment 7 items 6-7): the twin of the reference's lexicon/verify.py
// A package (keys in this order): record (Owl's fields), lprep (its LPREP/1 string), salt (Tier P only, 64
// lower-case hex digits), attestation {keyId, keyVector, contentHash, epochToken, sig (P1363, 128 hex digits)},
// lcorpus (the LCORPUS/1 string), inclusion (the audit path of SHA-256(lprep) at shardIndex, 64-hex-digit hashes),
// lgrow (an LGROW/1 string from N - 1 shards to N), consistency (its proof, 64-hex-digit hashes).
const PACKAGE_KEYS = ['record', 'lprep', 'salt', 'attestation', 'lcorpus', 'inclusion', 'lgrow', 'consistency'];
const CHECKS = ['parity', 'canonical', 'crystal', 'leaves', 'weaves', 'derived', 'commitment', 'attestation', 'inclusion', 'consistency'];
const SELF_CHECKS = CHECKS.slice(0, 7), AUTH_CHECKS = CHECKS.slice(7);
// A verification session: what a holder pins once (the reference's verify.Session). The vocabulary (V0); the LVOCAB/1
// string (or hash); the LADDR/1 string or hash, or WordNet (wn) to recompute it here once (Amendment 7 item 7, timed in
// session.timings.laddr); the registry snapshot text and its pinned SHA-256.
async function chainSession({ vocab = loadV0(), wn = null, lvocab: lvocabText = null, lvocabHash = null, laddr: laddrText = null, laddrHash = null,
    registry, registrySha256, clock = nowMs } = {}) {
    const timings = {};
    let t = clock();
    const lv = lvocabHash || (lvocabText ? sha256Hex(utf8(lvocabText)) : lvocab({ vocab }).sha256);
    timings.lvocab = clock() - t; t = clock();
    let la = laddrHash || (laddrText ? sha256Hex(utf8(laddrText)) : null), laddrInfo = null;
    if (wn) {
        laddrInfo = laddrOf(vocab, wn);
        if (la && la !== laddrInfo.sha256) throw new Error('the LADDR/1 recomputed from WordNet is not the one given');
        la = laddrInfo.sha256;
    }
    if (!la) throw new Error('a session needs the LADDR/1 string or hash, or WordNet to recompute it');
    timings.laddr = clock() - t; t = clock();
    const keys = loadSnapshot(registry, registrySha256);
    timings.registry = clock() - t;
    return { vocab, wn, lvocabHash: lv, laddrHash: la, laddr: laddrInfo, registry: keys, registrySha256, keyCache: new Map(), timings, clock };
}
const numEq = (a, b) => typeof a === 'number' && typeof b === 'number' && a === b;
const proofList = p => {
    if (!Array.isArray(p) || !p.every(h => isHex(h, 64))) throw new Error('a proof is a list of 64-hex-digit hashes');
    return p.map(h => fromHex(h));
};
// The pieces of an LPREP/1 string as the reference's records.parse_lprep reads them: [fields (15), saltedRoot or
// null]; an Error unless it has the registered shape (15 fields and tier S, or 16 with tier P, chainId '-' and a
// 64-hex-digit salted root; shardIndex a canonical decimal)
function parseLprep(s) {
    if (typeof s !== 'string') throw new Error('an LPREP/1 record is a string');
    const parts = s.split('|');
    if ((parts.length !== 15 && parts.length !== 16) || parts[0] !== 'LPREP/1') throw new Error('not an LPREP/1 record');
    const f = parts.slice(0, 15);
    if (parts.length === 16) {
        if (f[14] !== 'P' || f[3] !== '-' || !isHex(parts[15], 64)) throw new Error('a 16-field LPREP/1 record is Tier P with chainId "-" and a salted root');
    } else if (f[14] !== 'S') throw new Error('a 15-field LPREP/1 record is Tier S');
    if (!isDecimal(f[2])) throw new Error('not a canonical decimal: ' + f[2]);
    return [f, parts.length === 16 ? parts[15] : null];
}
function parseLcorpus(s) {
    const p = typeof s === 'string' ? s.split('|') : [];
    if (p.length !== 9 || p[0] !== 'LCORPUS/1' || !isHex(p[3], 64) || !p.slice(5).every(x => x === '-') || !isDecimal(p[2])) throw new Error('not an LCORPUS/1 record');
    return { corpusId: p[1], N: Number(p[2]), root: p[3], spdxSetSha: p[4] };
}
function parseLgrow(s) {
    const p = typeof s === 'string' ? s.split('|') : [];
    if (p.length !== 7 || p[0] !== 'LGROW/1' || ![3, 5, 6].every(k => isHex(p[k], 64)) || !isDecimal(p[2]) || !isDecimal(p[4])) throw new Error('not an LGROW/1 record');
    return { corpusId: p[1], N_old: Number(p[2]), root_old: p[3], N_new: Number(p[4]), root_new: p[5], proofSha: p[6] };
}
// verifyPackage(session, package, { skip, recomputeAddr }) -> { selfConsistent, authentic, failed, checks: [{ name, ok,
// detail, ms }], signer }. The checks, in the registered order (the reference's verify.py, check for check):
//   parity       the record is shdccp/2 (streamVersion), its stream parses strictly (framesStrict), at least one
//                frame, every packet's parity holds
//   canonical    the chunk lengths are the 720-byte cut (every frame 720 but the last, 1..720; at most 60,000 in
//                all); each residual decodes, and re-encoding the chunk gives the stored residual byte for byte; the
//                stream re-framed from its packets and residuals is the stored stream
//   crystal      crystallize(chunk) is the stored packet, for every frame
//   leaves       leafHashes and merkleRoot present, equal to the values recomputed with the JS rules
//   weaves       weaveChiral, weaveMirror, segCuts, segments and chainId equal the recomputed ones
//   derived      the engram layer (when the record has any of its three fields: engramStream, engramCount and
//                engramMeanJ recomputed from the text), origBytes, shippedBytes and value; the V0 id stream and the
//                exact weave recomputed (norm 5^(28K), unfold to the leaf prefixes, the segCuts sub-weaves multiply
//                to it)
//   commitment   the LPREP/1 string equals the one rebuilt from the recomputed fields, the session's LVOCAB/1 and
//                LADDR/1 hashes and the string's own corpusId, shardIndex, spdx and sourceUrlSha (Tier P: the
//                salted root recomputed with the package's salt)
//   attestation  the ATTEST/1 block against SHA-256(lprep) and the pinned registry (verifyAttestation)
//   inclusion    LCORPUS/1 parses, names the LPREP's corpus, and the audit path of SHA-256(lprep) at shardIndex
//                verifies against its root (RFC 9162)
//   consistency  LGROW/1 parses, names the same corpus, grows from N - 1 to N ending at the LCORPUS root, its proofSha
//                is the proof's, and the proof verifies (RFC 9162; from N_old = 0, an empty proof and SHA-256(''))
// Verdicts (Amendment 8 item 3, Explainer 4's definition): selfConsistent is "parity .. commitment, inclusion and
// consistency all pass" (steps 1-6 and 8) and authentic is "the attestation passes" (step 7). parity .. commitment
// stop at the first failure (the rest are reported not run, ok null); attestation, inclusion and consistency always run. failed: the first check that
// failed, in this order, or '-'; a package is accepted when failed is '-'. skip: names of checks not run (L11's
// control skips 'attestation'); a skipped check (ok null) does not count against either verdict. Fields of the record
// beyond Owl's are ignored. The engram text is the bytes read as Latin-1: its tokens (runs of [A-Za-z0-9']) are the
// same as those of the bytes decoded as UTF-8 with replacement, which the reference reads.
async function verifyPackage(session, pkgIn, opts = {}) {
    const { BC, EC } = chainCores();
    const clock = opts.clock || session.clock || nowMs, skip = new Set(opts.skip || []);
    const pkg = typeof pkgIn === 'string' ? JSON.parse(pkgIn) : pkgIn;
    const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
    const rec = isObj(pkg) && isObj(pkg.record) ? pkg.record : null, lp = isObj(pkg) ? pkg.lprep : undefined;
    const st = {}, checks = [];
    const run = async (name, fn) => {
        if (skip.has(name)) { checks.push({ name, ok: null, detail: 'skipped', ms: 0 }); return true; }
        const t = clock();
        let ok = false, detail = '';
        try { [ok, detail] = await fn(); } catch (e) { ok = false; detail = e && e.message ? e.message : String(e); }
        checks.push({ name, ok: !!ok, detail, ms: clock() - t });
        return !!ok;
    };
    const self = [
        ['parity', () => {
            if (!rec || rec.streamVersion !== BC.STREAM_VERSION) return [false, 'no shdccp/2 record'];
            const frames = framesStrict(rec.stream);
            if (!frames.length) return [false, 'no frames'];
            st.frames = frames;
            const bad = frames.findIndex(f => !f.parityOk);
            return bad < 0 ? [true, `${frames.length} frames`] : [false, `packet ${bad} parity failed`];
        }],
        ['canonical', () => {
            const frames = st.frames, lens = frames.map(f => f.chunkLen), K = lens.length;
            if (lens.slice(0, -1).some(n => n !== BC.CHUNK) || !(lens[K - 1] >= 1 && lens[K - 1] <= BC.CHUNK) || lens.reduce((a, b) => a + b, 0) > BC.MAX_GROW_BYTES)
                return [false, 'the chunk lengths are not the 720-byte cut'];
            const chunks = [];
            for (let i = 0; i < K; i++) {
                const d = BC.decodeChunk(frames[i].residual, frames[i].chunkLen);
                if (d.some(b => !(b >= 0 && b <= 255))) throw new Error(`frame ${i}: a rank code that decodes to no byte`);
                const c = Uint8Array.from(d);
                if (BC.encodeChunk(c) !== frames[i].residual) return [false, `frame ${i}: the residual is not the canonical encoding of its chunk`];
                chunks.push(c);
            }
            if (BC.frameStream(frames.map(f => f.packet), frames.map(f => f.residual)) !== rec.stream) return [false, 'the stream is not canonically framed'];
            st.chunks = chunks; st.data = concatBytes(chunks);
            return [true, `${K} chunks, ${st.data.length} B`];
        }],
        ['crystal', () => {
            const bad = st.chunks.findIndex((c, i) => BC.crystallizeBytes(c) !== st.frames[i].packet);
            return bad < 0 ? [true, 'every packet'] : [false, `packet ${bad} is not crystallize(chunk)`];
        }],
        ['leaves', () => {
            const lh = rec.leafHashes;
            if (!Array.isArray(lh) || !('merkleRoot' in rec)) return [false, 'leafHashes and merkleRoot are mandatory'];
            const leaves = st.chunks.map((c, i) => leafHash(i, c)), root = merkleShdccp2(leaves) || sha256Str('empty');
            st.leaves = leaves; st.root = root;
            if (lh.length !== leaves.length || leaves.some((h, i) => lh[i] !== h)) return [false, 'leafHashes differ from the recomputed leaves'];
            return rec.merkleRoot === root ? [true, 'merkleRoot'] : [false, 'merkleRoot mismatch'];
        }],
        ['weaves', () => {
            const [wf, wm] = weavesOf(st.chunks), chiral = BC.quatHex(wf), mirror = BC.quatHex(wm), cuts = segCutsOf(st.chunks.length, BC.SEGMENTS);
            const cid = 'BC-' + sha256Str(st.root + '|' + chiral).slice(0, 24);
            st.chainId = cid;
            const bad = [['weaveChiral', rec.weaveChiral === chiral], ['weaveMirror', rec.weaveMirror === mirror],
                ['segCuts', Array.isArray(rec.segCuts) && rec.segCuts.length === cuts.length && cuts.every((c, i) => numEq(rec.segCuts[i], c))],
                ['segments', numEq(rec.segments, BC.SEGMENTS)], ['chainId', rec.chainId === cid]].filter(([, ok]) => !ok).map(([n]) => n);
            return bad.length ? [false, bad.join(', ') + ' mismatch'] : [true, 'weaves and chainId'];
        }],
        ['derived', () => {
            const data = st.data, bad = [];
            let elen = 0;
            if ('engramStream' in rec || 'engramCount' in rec || 'engramMeanJ' in rec) {
                const eng = engramLayer(fromCharCodes(data));
                if (!(rec.engramStream === eng.stream && numEq(rec.engramCount, eng.count) && numEq(rec.engramMeanJ, eng.meanJ))) bad.push('engram layer');
                elen = eng.stream.length;
            }
            const ship = shipOf(rec.stream.length, elen, st.leaves.length);
            if (!numEq(rec.origBytes, data.length)) bad.push('origBytes');
            if (!numEq(rec.shippedBytes, Math.round(ship))) bad.push('shippedBytes');
            if (!numEq(rec.value, +(data.length / ship).toFixed(4))) bad.push('value');
            const w = weaveReport(st.leaves, segCutsOf(st.leaves.length, BC.SEGMENTS));
            if (!(w.normOk && w.unfoldOk && w.segmentsOk)) bad.push('exact weave');
            st.weave3 = w.sha256;
            st.idStreamSha256 = shardIdStreamSha(data, session.vocab);
            // Amendment 7 item 7's literal alternative (reported, decides nothing): the LADDR/1 recomputed inside this
            // verification from the session's WordNet (a fresh wn object, so no cached forest words are reused)
            if (opts.recomputeAddr) { if (!session.wn) throw new Error('recomputeAddr needs the session\'s WordNet'); st.laddrHash = laddrOf(session.vocab, { ...session.wn }).sha256; }
            return bad.length ? [false, bad.join(', ') + ' mismatch'] : [true, 'engram layer, sizes, id stream, exact weave'];
        }],
        ['commitment', () => {
            const [f] = parseLprep(lp);
            let tier = 'S', salt = null;
            if (f[14] === 'P') {
                salt = pkg.salt;
                if (!isHex(salt, 64)) return [false, 'a Tier-P record needs its salt'];
                tier = 'P';
            }
            const want = lprepFields({ record: { ...rec, chainId: st.chainId, merkleRoot: st.root }, text: st.data, corpusId: f[1], shardIndex: f[2], spdx: f[7],
                sourceSha: f[8], lvocabHash: session.lvocabHash, laddrHash: st.laddrHash || session.laddrHash, tier, salt, vocab: session.vocab,
                idSha: st.idStreamSha256, weaveSha: st.weave3 }).join('|');
            if (want === lp) return [true, 'LPREP/1 recomputed'];
            const w = want.split('|'), diff = LPREP_FIELDS.slice(0, 15).filter((n, k) => w[k] !== f[k]);
            return [false, 'LPREP/1 differs in ' + (diff.length ? diff.join(', ') : 'saltedRoot')];
        }],
    ];
    for (const [name, fn] of self) if (!(await run(name, fn))) break;
    for (const name of SELF_CHECKS.slice(checks.length)) checks.push({ name, ok: null, detail: 'not run', ms: 0 });
    let signer = null, lc = null;
    await run('attestation', async () => {
        const [ok, reason, entry] = await verifyAttestation(pkg.attestation, lp, session.registry, session.keyCache);
        if (ok) signer = entry.keyId;
        return [ok, reason];
    });
    await run('inclusion', () => {
        const [f] = parseLprep(lp), c = parseLcorpus(pkg.lcorpus);
        if (c.corpusId !== f[1]) return [false, 'LCORPUS names another corpus'];
        const idx = Number(f[2]), leaf = rfcLeafHash(O.sha256(utf8(lp)));
        const ok = rfcVerifyInclusion(idx, c.N, leaf, proofList(pkg.inclusion), fromHex(c.root));
        lc = c;
        return [ok, `shard ${idx} of ${c.N}`];
    });
    await run('consistency', () => {
        const c = lc || parseLcorpus(pkg.lcorpus), g = parseLgrow(pkg.lgrow), proof = proofList(pkg.consistency);
        if (g.corpusId !== c.corpusId || g.N_new !== c.N || g.root_new !== c.root) return [false, 'LGROW does not end at the LCORPUS root'];
        if (g.N_old !== c.N - 1) return [false, 'LGROW does not grow from N - 1'];
        if (g.proofSha !== proofSha(proof)) return [false, 'proofSha mismatch'];
        const ok = g.N_old === 0 ? proof.length === 0 && g.root_old === O.toHex(RFC_EMPTY_ROOT())
            : rfcVerifyConsistency(g.N_old, g.N_new, fromHex(g.root_old), fromHex(g.root_new), proof);
        return [ok, `${g.N_old} -> ${g.N_new}`];
    });
    const by = new Map(checks.map(c => [c.name, c.ok])), first = checks.find(c => c.ok === false);
    return {
        // verdicts, Amendment 8 item 3 (Explainer 4): self-consistent = steps 1-6 and 8, authentic = step 7
        selfConsistent: [...SELF_CHECKS, 'inclusion', 'consistency'].every(n => by.get(n) !== false), authentic: by.get('attestation') !== false,
        failed: first ? first.name : '-', checks, signer,
    };
}
// 'selfConsistent authentic failed', as the reference's verify.verdict_text writes a verdict
const verdictText = v => `${v.selfConsistent ? 'true' : 'false'} ${v.authentic ? 'true' : 'false'} ${v.failed}`;
// a JS string of the bytes as code units 0-255 (String.fromCharCode(...bytes), in pieces)
function fromCharCodes(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, Array.prototype.slice.call(bytes, i, i + 8192));
    return s;
}
// a package with its keys in PACKAGE_KEYS order (salt only for Tier P); proofs as lists of hex strings
function makePackage({ record, lprep: lprepText, salt = null, attestation, lcorpus: lcorpusText, inclusion, lgrow: lgrowText, consistency }) {
    const p = { record, lprep: lprepText };
    if (salt !== null) p.salt = salt;
    const hx = list => list.map(h => (typeof h === 'string' ? h : O.toHex(h)));
    Object.assign(p, { attestation, lcorpus: lcorpusText, inclusion: hx(inclusion), lgrow: lgrowText, consistency: hx(consistency) });
    return p;
}
// Packages for a corpus (the reference's verify.corpus_packages): shards [{ record, text }] in shard order; one LPREP/1
// each (Tier S, or Tier P with salts[j]), LCORPUS/1 over all, LGROW/1 from N - 1 (from 0: an empty proof), each LPREP
// attested by privateKey. Returns { packages, lpreps, lcorpus, lgrow }.
async function corpusPackages({ shards, corpusId, spdx, sourceShas, session, privateKey, keyId, keyVector, epochToken, tier = 'S', salts = null }) {
    const lpreps = shards.map((s, j) => lprep({ record: s.record, text: s.text, corpusId, shardIndex: j, spdx, sourceSha: sourceShas[j],
        lvocabHash: session.lvocabHash, laddrHash: session.laddrHash, tier, salt: tier === 'P' ? salts[j] : null, vocab: session.vocab }).text);
    const tree = corpusTree(lpreps), N = tree.n, lc = lcorpus({ corpusId, tree, spdxSha: spdxSetSha(lpreps.map(() => spdx)) });
    const proof = N > 1 ? tree.consistency(N - 1) : [];
    const lg = lgrow({ corpusId, nOld: N - 1, rootOld: O.toHex(tree.mth(0, N - 1)), nNew: N, rootNew: lc.root, proof });
    const packages = [];
    for (let j = 0; j < N; j++) {
        packages.push(makePackage({ record: shards[j].record, lprep: lpreps[j], salt: tier === 'P' ? salts[j] : null,
            attestation: await attestSign(privateKey, { keyId, keyVector, epochToken }, lpreps[j]), lcorpus: lc.text, inclusion: tree.path(j), lgrow: lg.text, consistency: proof }));
    }
    return { packages, lpreps, lcorpus: lc.text, lgrow: lg.text, tree };
}
// ---- the chain trace (reference/traces_chain.py writes traces/chain_v1.txt; Python is the authority). chainTraceLines
// regenerates every line, header included, from the trace's own seeds (8000 + i) and fixed inputs; wn (WordNet) gives
// the two verb shards (without it the lines from 'shard V0' on are not written and are reported skipped). Async: the
// verdicts come from verifyPackage (WebCrypto). The signatures are RFC 6979's, computed here (ecdsaSignDet).
const CHAIN_HEAD = [
    "# chain_v1: the chain track (lexicon.chain, records, manifest, attest, verify). Python is the authority; every line",
    "# below must be regenerated by lexicon_core.js. Hex is lowercase except packets (16 upper hex digits, as Owl writes",
    "# them). sha256(x) is of x's UTF-8. A list is written comma-joined, '-' when empty. Numbers are JS Number::toString.",
    "# codec <name> <bytes> <packet> <kernelPacket> <has80> <quatHex(crystalQuat)> <leaf_hash(0, bytes)> <residual hex",
    "#   length> <residual, or sha256:<hex> when longer than 128 digits>  (the cases: C0 'a', C1 'Hello, world!', C2",
    "#   [75,0,7], C3 bytes 0..255, C4 720 zero bytes, C5 720 bytes Rng(8050).below(256), C6 720 bytes 97 +",
    "#   Rng(8051).below(4), C7 'é' x 150 as UTF-8)",
    "# decode <name> <decode_chunk(residual, bytes) equals the bytes>",
    "# silent <name> <count of single-bit residual flips that decode the same> <first 8 as i:bit:kind>  (S4's order: hex",
    "#   digit i ascending, then bit 0..3 of that digit; kind padding / escape / other)",
    "# hypot <i> <a0> <a1> <a2> <a3> <Math.hypot(a0..a3)> <quatHex(qn(a))>: doubles as 16 hex digits of their IEEE-754",
    "#   bits; from one Rng(8060), each component is (2 random() - 1) * [1e-6, 1e-5, ..., 1e6][below(13)], then 0 when",
    "#   below(8) == 0, then -0 in place of a 0 when below(16) == 0",
    "# fixed <i> <x as 16 hex digits> <x.toFixed(12)> <x.toFixed(4)> <String(x)>: x from the same Rng after the hypot cases",
    "# synth <seed> <draws> <bytes> <code points> <two-byte code points> <chunks> <chunks with a 0x80 crystal byte>",
    "#   <sha256 of the UTF-8>  (Amendment 7 item 2's generator, Rng(seed))",
    "# shard <name> <bytes> <sha256 of the UTF-8>: S0-S2 the synthetic shards of seeds 8000-8002, V0 and V1 the first two",
    "#   verb gloss shards (spike S4's cut, lexicon.chain.gloss_shards)",
    "# rec <shard> <off|on> <field> <value>: every field of grow(text, engrams) in Owl's key order; stream and",
    "#   engramStream as <length> <sha256>, leafHashes as <count> <sha256(JSON.stringify(leafHashes))>, segCuts as JSON",
    "# recjson <shard> <off|on> <sha256(JSON.stringify(record))>",
    "# chunk <shard> <k> <packet> <kernelPacket> <residual hex length> <sha256(residual)> <leafHash>  (engrams off)",
    "# kernel <shard> <sha256(stream)> <stream differs from Owl's> <chainId equal> <merkleRoot equal>: L8 control 1's",
    "#   grower (BioChain-AI's normalisation, 0x80 -> 0x81)",
    "# binary <shard> <leaf 0> <merkleRoot> <chainId> <every leaf differs>: L8 control 2's grower (leaves over binary)",
    "# weave3 <shard> <K> <bit lengths of |q0|..|q3|> <weave3Sha> <norm = 5^(28K)> <unfold gives the prefixes> <the",
    "#   segment product equals it>",
    "# seg <shard> <s> <lo> <hi> <sha256 of the segment sub-weave's components in decimal, comma-joined>",
    "# weave3full <name> <q0> <q1> <q2> <q3>: the exact weave of codec case C1's one-chunk record",
    "# ids <shard> <number of V0 ids> <idStreamSha256> <first 12 ids>",
    "# lvocab <LVOCAB/1 string>, lvocabHash <hash>",
    "# addrrow <row>: 12 trace rows id|token|word|len|h3PointSha|h2PointSha (word r from Rng(8200 + r): 1 + below(12)",
    "#   letters, the root letter below(6), then children(word)[below(5)]); addrTableRoot <hex>; laddr <LADDR/1 string",
    "#   with V0's hash and the trace table's root>; laddrHash <hash>",
    "# lprep <shard> <off|on> <LPREP/1 Tier S>; lprepHash <shard> <off|on> <hash>; lprepP <shard> <off|on> <salt> <Tier P>",
    "#   (corpusId lexicon-trace-v1, shardIndex 0..4 in the order S0 S1 S2 V0 V1, spdx CC0-1.0 for S, the WordNet ref for",
    "#   V, sourceUrlSha of 'rng:8000+i' or the WordNet URL; the salt of shard j is the test salt of j)",
    "# ct <n> <root>: the Certificate Transparency reference vector's roots, n = 0..8",
    "# rfcpath <m> <names>, rfcproof <m> <names>: RFC 6962 2.1.3's audit paths of d0, d3, d4, d6 and PROOF(3), (4), (6)",
    "#   over its 7 leaves, the hashes named a..l as the RFC names them",
    "# rfc <j> <K> <root>: K leaves of 32 bytes from Rng(8100 + j), eight next_u32 big-endian each",
    "# incl <j> <i> <proof> <verifies> <rejected for leaf i+1 mod K> <rejected at position i+1 mod K> ('-' when K = 1)",
    "# cons <j> <m> <proof> <verifies> <rejected with the old root's first byte flipped>, m = 1..K",
    "# alter <j> <class> <i> <root changed>: replace (first byte of entry i flipped), delete i, insert 32 zero bytes",
    "#   before i, swap i and i+1, duplicate-last, truncate to the first i (i = 1..K-1)",
    "# shdccp2 <j> <K> <root of the hex leaves> <root with the last duplicated> <equal>",
    "# xor <j> <K> <XOR of the 64-bit prefixes, 16 hex digits>; swap <j> <i> <XOR unchanged> <exact weave changed>",
    "# identity <identityId> | epoch <token> | keyVector <hex> | key <A|B> <keyId> <x> <y> <status>",
    "# registry <sha256> <snapshot JSON>",
    "# attest <package> <payload> <signature P1363> <signature DER>  (RFC 6979 deterministic ECDSA, P-256, SHA-256; a",
    "#   port without RFC 6979 reads the signatures from these lines, and from short lines the DER, as input)",
    "# twin <package> <high-S twin P1363>",
    "# short <r|s> <n> <DER> <P1363, r and s left-padded> <P1363 unpadded>: the first n with r (or s) < 2^248 among",
    "#   key A's deterministic signatures of 'hyperbolic-lexicon trace short <n>'",
    "# lcorpus <corpus> <string> | lgrow <corpus> <string> | inclproof <corpus> <j> <proof> | consproof <corpus> <proof>",
    "#   corpora: lexicon-trace-v1 (engrams on, Tier S; packages PS0..PV1), lexicon-trace-off-v1 (engrams off; OS0..OV1),",
    "#   lexicon-trace-p-v1 (engrams on, Tier P with the test salts; QS0..QV1); every LPREP attested by key A",
    "# pkg <name> <sha256(JSON.stringify(package))>: keys record, lprep, salt (Tier P), attestation, lcorpus, inclusion,",
    "#   lgrow, consistency; proofs as lists of hex strings",
    "# tampers of PS0 and PV0 (<package>.<case>): T1 leafHashes and merkleRoot deleted; T2 packet 2's crystal32 bit 0",
    "#   (word bit 24) flipped, parity re-fixed; T3 the LPREP's lvocabHash with its last hex digit changed (S4's rule: '0'",
    "#   becomes '1', anything else '0'); T4 the LPREP attested by key B (revoked); T5 the next package's attestation; T6",
    "#   the Tier-P package Q of the same shard with the next shard's salt; T7 frames 0 and 1 swapped; T7last the last two",
    "#   frames swapped; T8 chainId's last hex digit changed; T9 frame 0's residual with the first silent flip (line flip);",
    "#   twin the high-S twin signature; unknown attested by key C (SHA-256('hyperbolic-lexicon trace key C') mod (n - 1)",
    "#   + 1, not in the registry); keyVector the block's keyVector with its last digit changed; sig the signature's last",
    "#   hex digit changed; engramCount + 1; value + 0.0001 (toFixed(4)); shardIndex + 1 in the LPREP; inclusion the first",
    "#   proof hash's last digit changed; consistency the last proof hash's; lcorpusRoot the LCORPUS root's",
    "# flip <package> <frame> <i:bit:kind>: the T9 flip used",
    "# verdict <name> <selfConsistent> <authentic> <failed>",
    "# checks <name> <one letter per check, in order: P pass, F fail, - not run>",
    "#   checks: parity canonical crystal leaves weaves derived commitment attestation inclusion consistency",
];
const tf = b => (b ? 'true' : 'false');
const lst = xs => (xs.length ? xs.map(String).join(',') : '-');
const lastDigit = s => s.slice(0, -1) + (s.endsWith('0') ? '1' : '0');   // S4's T8 rule
function dhex(x) { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, x); return hex(b); }
const bitLen = x => (x === 0n ? 0 : (x < 0n ? -x : x).toString(2).length);
const clone = o => JSON.parse(JSON.stringify(o));
function chainCodecCases() {
    const r5 = new C.Rng(8050), r6 = new C.Rng(8051);
    return [['C0', strBytes('a')], ['C1', strBytes('Hello, world!')], ['C2', Uint8Array.of(75, 0, 7)], ['C3', Uint8Array.from({ length: 256 }, (_, i) => i)],
        ['C4', new Uint8Array(720)], ['C5', Uint8Array.from({ length: 720 }, () => r5.below(256))], ['C6', Uint8Array.from({ length: 720 }, () => 97 + r6.below(4))],
        ['C7', utf8('é'.repeat(150))]];
}
const CHAIN_TRACE_TOKENS = ['[PAD]', '[UNK]', 'the', '##ing', 'cat', '##s', '|', 'é', '中', 'run', '42', '...'];
const chainTraceWords = () => Array.from({ length: 12 }, (_, r) => { const g = new C.Rng(8200 + r), n = 1 + g.below(12), w = [g.below(6)]; while (w.length < n) w.push(P.children(w)[g.below(5)]); return w; });
async function chainTraceLines(wn = null) {
    const { BC, EC } = chainCores();
    const out = CHAIN_HEAD.slice(), say = l => out.push(l), v0 = loadV0();
    // ---- the codec
    for (const [name, b] of chainCodecCases()) {
        const res = BC.encodeChunk(b), rtxt = res.length <= 128 ? res : 'sha256:' + sha256Str(res), pk = BC.crystallizeBytes(b);
        say(`codec ${name} ${b.length} ${pk} ${kernelCrystallize(b)} ${tf(crystalHas80(pk))} ${BC.quatHex(BC.crystalQuat(b))} ${leafHash(0, b)} ${res.length} ${rtxt}`);
        const dd = BC.decodeChunk(res, b.length);
        say(`decode ${name} ${tf(dd.length === b.length && dd.every((v, i) => v === b[i]))}`);
    }
    for (const [name, b] of chainCodecCases()) {
        if (name !== 'C1' && name !== 'C6') continue;
        const fl = silentFlips(BC.encodeChunk(b), b);
        say(`silent ${name} ${fl.length} ` + lst(fl.slice(0, 8).map(x => `${x.i}:${x.bit}:${x.kind}`)));
    }
    // ---- V8's Math.hypot and toFixed
    const g = new C.Rng(8060), SCALES = [1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1.0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6];
    const draw = () => { let x = (2 * g.random() - 1) * SCALES[g.below(13)]; if (g.below(8) === 0) x = 0; if (g.below(16) === 0) x = x === 0 ? -0 : x; return x; };
    for (let i = 0; i < 40; i++) { const a = [draw(), draw(), draw(), draw()]; say(`hypot ${i} ${a.map(dhex).join(' ')} ${dhex(Math.hypot(...a))} ${BC.quatHex(BC.qn(a))}`); }
    for (let i = 0; i < 40; i++) { const x = draw(); say(`fixed ${i} ${dhex(x)} ${x.toFixed(12)} ${x.toFixed(4)} ${String(x)}`); }
    // ---- the shards
    const shards = [];
    for (let i = 0; i < 3; i++) {
        const s = synthShard(8000 + i), K = Math.ceil(s.data.length / BC.CHUNK);
        say(`synth ${8000 + i} ${s.draws} ${s.data.length} ${s.codePoints} ${s.twoByte} ${K} ${s.chunks80.length} ${sha256Hex(s.data)}`);
        shards.push({ name: `S${i}`, text: s.text, data: s.data, spdx: CHAIN_PINS.synthSpdx, src: sourceUrlSha(synthSource(i, 8000)) });
    }
    if (!wn) return { lines: out, complete: false };
    glossShards(wn, 'verb').slice(0, 2).forEach((t, k) => shards.push({ name: `V${k}`, text: t, data: utf8(t), spdx: CHAIN_PINS.c0Spdx, src: sourceUrlSha(CHAIN_PINS.wordnetUrl) }));
    for (const s of shards) say(`shard ${s.name} ${s.data.length} ${sha256Hex(s.data)}`);
    const recs = new Map();
    for (const s of shards) for (const mode of ['off', 'on']) {
        const rec = growSync(s.text, { engrams: mode === 'on' });
        recs.set(s.name + mode, rec);
        for (const [k, v] of Object.entries(rec)) {
            const val = k === 'stream' || k === 'engramStream' ? `${v.length} ${sha256Str(v)}` : k === 'leafHashes' ? `${v.length} ${sha256Str(JSON.stringify(v))}`
                : k === 'segCuts' ? JSON.stringify(v) : String(v);
            say(`rec ${s.name} ${mode} ${k} ${val}`);
        }
        say(`recjson ${s.name} ${mode} ${sha256Str(JSON.stringify(rec))}`);
    }
    for (const s of shards) {
        const rec = recs.get(s.name + 'off');
        framesStrict(rec.stream).forEach((f, k) => {
            const ch = s.data.subarray(k * BC.CHUNK, (k + 1) * BC.CHUNK);
            say(`chunk ${s.name} ${k} ${f.packet} ${kernelCrystallize(ch)} ${f.residual.length} ${sha256Str(f.residual)} ${rec.leafHashes[k]}`);
        });
        const kr = growSync(s.text, { engrams: false, packets: 'kernel' });
        say(`kernel ${s.name} ${sha256Str(kr.stream)} ${tf(kr.stream !== rec.stream)} ${tf(kr.chainId === rec.chainId)} ${tf(kr.merkleRoot === rec.merkleRoot)}`);
        const br = growSync(s.text, { engrams: false, leaves: 'binary' });
        say(`binary ${s.name} ${br.leafHashes[0]} ${br.merkleRoot} ${br.chainId} ${tf(br.leafHashes.every((h, i) => h !== rec.leafHashes[i]))}`);
    }
    for (const s of shards) {
        const rec = recs.get(s.name + 'off'), w = weaveReport(rec.leafHashes, rec.segCuts);
        say(`weave3 ${s.name} ${rec.leafHashes.length} ${w.q.map(bitLen).join(' ')} ${w.sha256} ${tf(w.normOk)} ${tf(w.unfoldOk)} ${tf(w.segmentsOk)}`);
        w.segments.forEach((sw, k) => say(`seg ${s.name} ${k} ${rec.segCuts[k]} ${rec.segCuts[k + 1]} ${weave3Sha(sw)}`));
    }
    say('weave3full C1 ' + exactWeave(growSync(strBytes('Hello, world!'), { engrams: false }).leafHashes).map(String).join(' '));
    for (const s of shards) { const ids = encode(s.data, v0).ids; say(`ids ${s.name} ${ids.length} ${shardIdStreamSha(s.data, v0)} ${lst(ids.slice(0, 12))}`); }
    // ---- the records
    const lv = lvocab({ vocab: v0 });
    say(`lvocab ${lv.text}`); say(`lvocabHash ${lv.sha256}`);
    const rows = addrRows(CHAIN_TRACE_TOKENS, chainTraceWords());
    rows.forEach(r => say(`addrrow ${r}`));
    const root = addrTableRoot(rows), la = laddr({ vocab: v0, root });
    say(`addrTableRoot ${root}`); say(`laddr ${la.text}`); say(`laddrHash ${la.sha256}`);
    const CORPUS = 'lexicon-trace-v1';
    shards.forEach((s, j) => {
        for (const mode of ['off', 'on']) {
            const o = { record: recs.get(s.name + mode), text: s.data, corpusId: CORPUS, shardIndex: j, spdx: s.spdx, sourceSha: s.src, lvocabHash: lv.sha256, laddrHash: la.sha256, vocab: v0 };
            const S = lprep(o);
            say(`lprep ${s.name} ${mode} ${S.text}`); say(`lprepHash ${s.name} ${mode} ${S.sha256}`);
            const salt = testSalt(j);
            say(`lprepP ${s.name} ${mode} ${salt} ${lprep({ ...o, tier: 'P', salt }).text}`);
        }
    });
    // ---- RFC 6962
    const CT = ['', '00', '10', '2021', '3031', '40414243', '5051525354555657', '606162636465666768696a6b6c6d6e6f'].map(h => (h ? fromHex(h) : new Uint8Array(0)));
    const ctLog = new RfcTree(CT);
    for (let n = 0; n <= 8; n++) say(`ct ${n} ${O.toHex(ctLog.mth(0, n))}`);
    const L7 = new RfcTree(CT.slice(0, 7)), nm = { a: L7.mth(0, 1), b: L7.mth(1, 2), c: L7.mth(2, 3), d: L7.mth(3, 4), e: L7.mth(4, 5), f: L7.mth(5, 6), j: L7.mth(6, 7),
        g: L7.mth(0, 2), h: L7.mth(2, 4), i: L7.mth(4, 6), k: L7.mth(0, 4), l: L7.mth(4, 7) };
    const nameOf = new Map(Object.entries(nm).map(([k, v]) => [O.toHex(v), k])), names = hs => hs.map(h => nameOf.get(O.toHex(h)) || '?').join('');
    for (const m of [0, 3, 4, 6]) say(`rfcpath ${m} ${names(L7.path(m))}`);
    for (const m of [3, 4, 6]) say(`rfcproof ${m} ${names(L7.consistency(m))}`);
    [1, 2, 3, 4, 5, 7, 8, 13].forEach((K, j) => {
        const D = rfcLeaves(8100 + j, K), lg = new RfcTree(D), rt = lg.root(), hx = list => lst(list.map(h => O.toHex(h)));
        say(`rfc ${j} ${K} ${O.toHex(rt)}`);
        for (let i = 0; i < K; i++) {
            const p = lg.path(i), ok = rfcVerifyInclusion(i, K, rfcLeafHash(D[i]), p, rt);
            if (K >= 2) {
                const o = (i + 1) % K;
                say(`incl ${j} ${i} ${hx(p)} ${tf(ok)} ${tf(!rfcVerifyInclusion(i, K, rfcLeafHash(D[o]), p, rt))} ${tf(!rfcVerifyInclusion(o, K, rfcLeafHash(D[i]), p, rt))}`);
            } else say(`incl ${j} ${i} ${hx(p)} ${tf(ok)} - -`);
        }
        for (let m = 1; m <= K; m++) {
            const p = lg.consistency(m), rm = lg.mth(0, m), bad = Uint8Array.from(rm);
            bad[0] ^= 1;
            say(`cons ${j} ${m} ${hx(p)} ${tf(rfcVerifyConsistency(m, K, rm, rt, p))} ${tf(!rfcVerifyConsistency(m, K, bad, rt, p))}`);
        }
        const changed = list => tf(!bytesEq(rfcRoot(list), rt));
        for (let i = 0; i < K; i++) {
            const rep = Uint8Array.from(D[i]); rep[0] ^= 1;
            say(`alter ${j} replace ${i} ${changed(D.map((x, k) => (k === i ? rep : x)))}`);
            say(`alter ${j} delete ${i} ${changed(D.filter((_, k) => k !== i))}`);
            say(`alter ${j} insert ${i} ${changed([...D.slice(0, i), new Uint8Array(32), ...D.slice(i)])}`);
            if (i + 1 < K) say(`alter ${j} swap ${i} ${changed([...D.slice(0, i), D[i + 1], D[i], ...D.slice(i + 2)])}`);
            if (i >= 1) say(`alter ${j} truncate ${i} ${changed(D.slice(0, i))}`);
        }
        say(`alter ${j} duplicate-last ${K - 1} ${changed([...D, D[K - 1]])}`);
        const hxl = D.map(d => hex(d)), a = merkleShdccp2(hxl), b = merkleShdccp2([...hxl, hxl[K - 1]]);
        say(`shdccp2 ${j} ${K} ${a} ${b} ${tf(a === b)}`);
        say(`xor ${j} ${K} ${xorSummary(hxl)}`);
        const vals = D.map(d => bytesBig(d.subarray(0, 8))), q0 = EC.chainQuaternion(vals);
        for (let i = 0; i + 1 < K; i++) {
            const sw = vals.slice(); [sw[i], sw[i + 1]] = [sw[i + 1], sw[i]];
            const xs = sw.reduce((x, v) => x ^ v, 0n) === vals.reduce((x, v) => x ^ v, 0n);
            say(`swap ${j} ${i} ${tf(xs)} ${tf(!EC.qeq(EC.chainQuaternion(sw), q0))}`);
        }
    });
    // ---- the attestation
    const EPOCH = epochTokenOf('2000-01-01'), ident = identityIdOf(), kv = keyVectorOf(ident, EPOCH), K3 = TRACE_KEYS();
    say(`identity ${ident}`); say(`epoch ${EPOCH}`); say(`keyVector ${kv}`);
    const status = { A: 'active', B: 'revoked' }, entries = [];
    for (const k of ['A', 'B']) { const jwk = testJwk(K3[k]); say(`key ${k} ${keyIdOf(jwk)} ${jwk.x} ${jwk.y} ${status[k]}`); entries.push({ publicJwk: jwk, keyVector: kv, status: status[k] }); }
    const snap = registrySnapshot(entries);
    say(`registry ${snap.sha256} ${snap.text}`);
    const session = await chainSession({ vocab: v0, lvocab: lv.text, laddr: la.text, registry: snap.text, registrySha256: snap.sha256 });
    for (const which of ['r', 's']) {
        let n = 0, sg;
        for (;; n++) { sg = ecdsaSignDet(K3.A, strBytes(`hyperbolic-lexicon trace short ${n}`)); if ((which === 'r' ? sg.r : sg.s) < (1n << 248n)) break; }
        say(`short ${which} ${n} ${hex(derOf(sg))} ${hex(p1363Of(sg))} ${hex(p1363Unpadded(sg))}`);
    }
    const show = async (name, pkg) => {
        say(`pkg ${name} ${sha256Str(JSON.stringify(pkg))}`);
        const v = await verifyPackage(session, pkg);
        say(`verdict ${name} ${verdictText(v)}`);
        say(`checks ${name} ` + v.checks.map(c => (c.ok === true ? 'P' : c.ok === null ? '-' : 'F')).join(''));
    };
    const corpus = (cid, mode, tier = 'S') => {
        const lps = shards.map((s, j) => lprep({ record: recs.get(s.name + mode), text: s.data, corpusId: cid, shardIndex: j, spdx: s.spdx, sourceSha: s.src,
            lvocabHash: lv.sha256, laddrHash: la.sha256, vocab: v0, tier, salt: tier === 'P' ? testSalt(j) : null }).text);
        const tree = corpusTree(lps), N = tree.n, lc = lcorpus({ corpusId: cid, tree, spdxSha: spdxSetSha(shards.map(s => s.spdx)) });
        const cproof = N > 1 ? tree.consistency(N - 1) : [];
        const lg = lgrow({ corpusId: cid, nOld: N - 1, rootOld: O.toHex(tree.mth(0, N - 1)), nNew: N, rootNew: lc.root, proof: cproof });
        say(`lcorpus ${cid} ${lc.text}`); say(`lgrow ${cid} ${lg.text}`); say(`consproof ${cid} ${lst(hexList(cproof))}`);
        return shards.map((s, j) => {
            say(`inclproof ${cid} ${j} ${lst(hexList(tree.path(j)))}`);
            return makePackage({ record: recs.get(s.name + mode), lprep: lps[j], salt: tier === 'P' ? testSalt(j) : null, attestation: attestDet(K3.A, kv, lps[j], EPOCH),
                lcorpus: lc.text, inclusion: tree.path(j), lgrow: lg.text, consistency: cproof });
        });
    };
    const payloadOf = b => attestPayload(b);
    const derHex = sigHex => hex(derOf(rsOfP1363(fromHex(sigHex))));
    const pk = corpus(CORPUS, 'on');
    for (let j = 0; j < pk.length; j++) {
        const b = pk[j].attestation, nm2 = 'P' + shards[j].name;
        say(`attest ${nm2} ${payloadOf(b)} ${b.sig} ${derHex(b.sig)}`);
        say(`twin ${nm2} ${hex(highSTwin(fromHex(b.sig)))}`);
        await show(nm2, pk[j]);
    }
    const pkoff = corpus('lexicon-trace-off-v1', 'off');
    for (let j = 0; j < pkoff.length; j++) await show('O' + shards[j].name, pkoff[j]);
    const pkp = corpus('lexicon-trace-p-v1', 'on', 'P');
    for (let j = 0; j < pkp.length; j++) await show('Q' + shards[j].name, pkp[j]);
    // ---- tampers of PS0 and PV0 (traces_chain.py's cases, in its order)
    for (const j of [0, 3]) {
        const base = pk[j], nm2 = 'P' + shards[j].name, K = base.record.leafHashes.length;
        const f0 = framesStrict(base.record.stream)[0], fl = silentFlips(f0.residual, Uint8Array.from(BC.decodeChunk(f0.residual, f0.chunkLen)), 1);
        const withAtt = d => { const p = clone(base); p.attestation = attestDet(d, kv, p.lprep, EPOCH); return p; };
        const t4 = withAtt(K3.B), unknown = withAtt(K3.C);
        say(`attest ${nm2}.T4 ${payloadOf(t4.attestation)} ${t4.attestation.sig} ${derHex(t4.attestation.sig)}`);
        say(`attest ${nm2}.unknown ${payloadOf(unknown.attestation)} ${unknown.attestation.sig} ${derHex(unknown.attestation.sig)}`);
        const edit = f => { const p = clone(base); f(p); return p; };
        const fo = frameOffsets(base.record.stream);
        const cases = [
            ['T1', edit(p => { delete p.record.leafHashes; delete p.record.merkleRoot; })],
            ['T2', edit(p => { const s = p.record.stream, at = fo[2][0]; p.record.stream = s.slice(0, at) + refixParity(word16(BigInt('0x' + s.slice(at, at + 16)) ^ (1n << 24n))) + s.slice(at + 16); })],
            ['T3', edit(p => { p.lprep = withField(p.lprep, 'lvocabHash', lastDigit(p.lprep.split('|')[9])); })],
            ['T4', t4],
            ['T5', edit(p => { p.attestation = clone(pk[j + 1].attestation); })],
            ['T6', (() => { const p = clone(pkp[j]); p.salt = testSalt(j + 1); return p; })()],
            ['T7', edit(p => { p.record.stream = swapFrames(p.record.stream, 0); })],
            ['T7last', edit(p => { p.record.stream = swapFrames(p.record.stream, K - 2); })],
            ['T8', edit(p => { p.record.chainId = lastDigit(p.record.chainId); })],
            ['T9', edit(p => { const s = p.record.stream, [, r0, rl] = fo[0]; p.record.stream = s.slice(0, r0) + fl[0].alt + s.slice(r0 + rl); })],
            ['twin', edit(p => { p.attestation.sig = hex(highSTwin(fromHex(base.attestation.sig))); })],
            ['unknown', unknown],
            ['keyVector', edit(p => { p.attestation.keyVector = lastDigit(p.attestation.keyVector); })],
            ['sig', edit(p => { p.attestation.sig = lastDigit(p.attestation.sig); })],
            ['engramCount', edit(p => { p.record.engramCount += 1; })],
            ['value', edit(p => { p.record.value = +(p.record.value + 0.0001).toFixed(4); })],
            ['shardIndex', edit(p => { const f = p.lprep.split('|'); f[2] = String(Number(f[2]) + 1); p.lprep = f.join('|'); })],
            ['inclusion', edit(p => { p.inclusion[0] = lastDigit(p.inclusion[0]); })],
            ['consistency', edit(p => { p.consistency[p.consistency.length - 1] = lastDigit(p.consistency[p.consistency.length - 1]); })],
            ['lcorpusRoot', edit(p => { p.lcorpus = p.lcorpus.split('|').map((x, i) => (i === 3 ? lastDigit(x) : x)).join('|'); })],
        ];
        say(`flip ${nm2} 0 ${fl[0].i}:${fl[0].bit}:${fl[0].kind}`);
        for (const [cn, p] of cases) await show(`${nm2}.${cn}`, p);
    }
    return { lines: out, complete: true };
}
// ===== end of chain

// ================================================================== parity: all sections
// traces = { normalise, wordpiece, address, points, rank } (file texts); vocabs = { V0, V1 }; wn = a WordNet object
// (reference/golden/wordnet_v1.cjs's load(), Node only) or null: the geometry lines that need it are then skipped.
function paritySections(traces, vocabs, wn = null) { return [...textParitySections(traces, vocabs), ...geometryParitySections(traces, wn)]; }
function runParity(traces, vocabs, wn = null) {
    const t0 = Date.now(), lines = [];
    for (const s of paritySections(traces, vocabs, wn)) lines.push(...s.run());
    const skip = lines.filter(l => l.skip).length, fail = lines.filter(l => !l.ok && !l.skip).length;
    return { lines, pass: lines.length - fail - skip, fail, skip, ms: Date.now() - t0 };
}

return {
    version: 'lexicon-browser-1',
    PINS, SOURCES,
    // bytes and UTF-8
    hex, hexs, fromHex, sha256Hex, utf8, utf8FromCps, cpsOf, fromCps, InvalidUTF8, decodeUtf8, utf8FirstBad,
    // the pinned table
    CATEGORIES, CJK_RANGES, ASCII_PUNCT_RANGES, FLAGS: { DROP, SPACE, CJK, CN, MN, PUNCT, NFDX, LOW }, tablesFromText, tables,
    // N_B
    UNK, NB, nb, n1, finalSigma,
    // WordPiece, ids, records
    SPECIALS, MAX_CHARS, Vocab, wordpiece, encodeNb, encode, leb128, idStream, record, recordNb, recordSha256, listDigest, vocabFromText, loadV0, loadV1, v1Available,
    // L1 control 1
    platformNormalise, tableLowerNfdDropMn,
    // traces and parity
    normaliseLine, wordpieceLine, textParitySections, geometryParitySections, paritySections, runParity,
    // geometry: the forests (wordnet.py), the L3 rule and its controls, certifyWord, D6 (address.py)
    POS, ENTITY, MAMMAL, spanningParent, closureParents, spanningForest, closure, descendants,
    VARIANTS, NOUN_ROOT, VERB_ROOT, ID59_MAX_LEN, ID64_MAX_LEN, lettersFor, lettersForZero, childWord, forestWords, nounWords, verbWords, forestOf,
    wordStr, wordsSha256, certifyParts, certify, startOf, wordId, idWord, id59, id64, prefixCheck,
    // H^3 (h3tree.py; decoder3d.js), H^2 (h2exact.py), the flat trees (flat.py), bits and text
    walk, EMB3, STEP7, STEP7_INV, rotTo, h3Frames, h3Points, h3Point, h3Den, h3OnSheet, h3Fractions, h3PointExact, h3PointText, h3DecodeExact, h3DecodeInt, h3FloatOk,
    T_D3, H2_DIRS, H2Tree, H2_TREE, FlatTree, F3, F2, F3S, F2S, coordsLowest, coordsText, qText, coordBits, pointBits, gcdB, bitLength,
    // exact ranking (rank.py), L4(b) floats and control 2 (phase2.py)
    Arm, h3Arm, h2Arm, flatArm, exactSum, rankQuery, rankText, mapExact, meanRank, graphNeighbours, closureNeighbours, bitsPerNode, qOrDash,
    floatCols, floatKeys, exactOrder, adjacentFlags, floatQuery, exactTie, apOfOrder, acoshOrder, acoshAp, textBytes,
    // L3(f), map A, the geometry traces
    canonicalPointLines, canonicalPointList, l3fLine, isSpecial, nbPunct, mapA, wordOf, addressTraceLines, pointsTraceLines, pointsTraceWords, rankTraceLines,
    // L6 and L4(c) (Phase 4, Amendment 10 items 6 and 11): snapping, the snapped text, exact kappa and squared-distance
    // ranking of snapped tables, and the L6 trace (reference/traces/l6_v1.txt)
    SNAP_K, floorDivB, poincareRow, snapCoord, snapTable, snapText, parseSnapText, floatTableBytes, floatTableSha, kappaCmp, kappaClasses, SnapArm,
    candidateTies, evaluateSnapped, mapText, mapSha, L6_HEAD, L6_CASES, L6_SEED, L6_SCALES, l6CaseSpec, l6Dag, l6NeighbourSets, l6FloatTable, l6GridTable,
    l6Case, l6TraceLines, l6ParitySections,
    // chain (Phase 3): the grower, the stream, the synthetic and gloss shards (L8)
    chainCores, CHAIN_PINS, CHAIN_SOURCES, OWL_FIELDS, strBytes, sha256Str, latin1Utf8, concatBytes, bytesEq, isHex, leafHash, merkleShdccp2, weavesOf, segCutsOf,
    chunksOf, shardText, kernelCrystallize, leafHashBinary, engramLayer, growSync, recordDiff, framesStrict, frameOffsets, frameHex, swapFrames, refixParity, word16, crystalHas80,
    decodeTraced, silentFlips,
    SYNTH_LETTERS, SYNTH_PUNCT, synthDraw, synthShard, glossLines, cutShards, glossShards,
    // RFC 6962 and the controls of L9; the exact weave
    rfcLeafHash, rfcNodeHash, RFC_EMPTY_ROOT, largestPow2Below, RfcTree, rfcVerifyInclusion, rfcVerifyConsistency, rfcRoot, rfcLeaves, xorSummary,
    weaveValues, exactWeave, weaveText, weave3Sha, segmentWeaves, weaveReport,
    // the records
    recordOf, nbSpecShaOf, nbSpecSha, lvocab, addrRows, laddrRows, addrTableRoot, laddr, laddrOf, shardIdStream, shardIdStreamSha, synthSource, sourceUrlSha, testSalt, saltedRoot,
    lprepFields, lprep, LPREP_FIELDS, withField, spdxSetSha, corpusTree, lcorpus, proofSha, lgrow, hexList, bytesList,
    // ATTEST/1 and the hardened verifier (L10, L11)
    attestPayload, keyIdOf, publicJwkOf, importPublic, newKeyPair, attestSign, KEY_STATUSES, registryEntry, registrySnapshot, loadSnapshot, sigBytes, verifyAttestation,
    PACKAGE_KEYS, CHECKS, SELF_CHECKS, AUTH_CHECKS, parseLprep, parseLcorpus, parseLgrow, chainSession, verifyPackage, verdictText, fromCharCodes, makePackage, corpusPackages,
    // ECDSA P-256 with RFC 6979 nonces (trace keys only), the encodings, BioChain-AI's identity and key vector
    P256, p256Mul, hmacSha256, ecdsaSignDet, p1363Of, rsOfP1363, derOf, p1363Unpadded, highSTwin, b64u, testJwk, attestDet, TRACE_KEYS,
    IDENTITY_SEED, IDENTITY_UID, CANONICAL_PARAMS, identityIdOf, keyVectorOf, epochTokenOf,
    // the chain trace (reference/traces/chain_v1.txt)
    CHAIN_HEAD, chainTraceLines,
};
});
