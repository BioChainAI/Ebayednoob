// Hyperbolic Lexicon: the browser core (Phase 2).
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
// Load order in a page: orbital_core.js, hyperbolic_core.js, decoder3d.js, data/unicode_15_1_v1.js,
// data/vocab_v0_lex0.js, lexicon_core.js (the data files may also come after the core: they are read on first use).
// In Node: require('./lexicon_core.js').
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        const fs = require('fs'), path = require('path'), os = require('os');
        // Node reads the pinned files themselves (as bytes, so nothing is decoded before the hash check)
        const cache = process.env.HL_CACHE || path.join(os.homedir(), '.cache', 'hyperbolic-lexicon');
        const nodeData = (name, src) => {
            const p = src.golden ? path.join(__dirname, 'reference', 'golden', src.golden) : path.join(cache, src.cache);
            return fs.existsSync(p) ? fs.readFileSync(p) : null;
        };
        module.exports = factory(require('../../scripts/geometric-build/orbital_core.js'), require('../Hyperbolic Oracles/hyperbolic_core.js'),
            require('../Hyperbolic Oracles/decoder3d.js'), nodeData);
    } else root.LexiconCore = factory(root.OrbitalCore, root.HPCore, root.HPDecode3D, name => (root.LexiconData || {})[name]);
})(typeof self !== 'undefined' ? self : this, function (O, C, D3, dataSource) {
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
// ===== end of geometry

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
};
});
