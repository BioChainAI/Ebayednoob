// Hyperbolic Lexicon: the Stage-2 re-evaluation in the browser core (Amendment 13 item 1).
//
// "After the decisive run, lexicon_core.js reproduces the rational keys and the tie-class lists (BigInt fixed point at
// 1,024 bits for the square roots), compared by SHA-256 on Rng(8000 + i) traces and on the decisive pass-1 code files.
// It decides nothing, and it is required before the browser shows any Stage-2 claim as holding." (A13.1)
//
// PLACEMENT (for the erratum): A13.1 names lexicon_core.js; the overhaul's decision D4 keeps lexicon_core.js unedited,
// so this file sits beside it and adds nothing to it. It loads lexicon_core.js (and hyperbolic_core.js, which
// lexicon_core.js already needs) and uses only their exported functions: the exact points (h3Points, h3Den, H2_TREE,
// F3, F3S, F2, F2S), the forest helpers (closureParents, ENTITY, wordOf), gcdB, bitLength, sha256Hex, hex, utf8 and
// utf8FirstBad, and hyperbolic_core.js's Rng and P.children. tests/parity-stage2.cjs adds lexicon_core.js's nounWords
// (the L3 words) and parseSnapText (the snapped tables). Nothing here decides a claim.
//
// What it is, item by item, against the Python reference (reference/lexicon/scores2.py, wngraph.py, senses.py,
// stage2data.py's word readers, glove.py's exact key, hit.py's rows; reference/run_claims_stage2.py's pass-1 writer):
//   rationals      exact, BigInt numerator and denominator in lowest terms; str() as Python's Fraction (A13.4-A13.6)
//   tables         H3, H2 (hyperboloid, x0 and K = cosh d exact), F3, F3*, F2, F2* (|s|^2, |s - t|^2 exact), K3 (the
//                  content-hash words placed in H3), S-full_i (P_i = Rng(2400 + i).shuffle), W_i (Rng(2420 + i) over
//                  index.noun's strata), learned Lorentz (x0 and K from the snapped integers) and learned Euclidean
//   score forms    G, Grev, Dep° (DepG), Dep, Sym under the sense rules max (Phi), first and gensim; HiT's slot lists;
//                  WordNet's own integers (G_WN, Sym_WN, Dep_WN); GloVe's exact cosine key c|c| / (|a|^2 |b|^2)
//   certified      A13.6's values e^G = E(x0_s) / (E(x0_t) E(K)), e^Dep = E(x0_s) / E(x0_t) with E(z) = z +
//   values         sqrt((z - 1)(z + 1)), and sqrt(a) - sqrt(b) - sqrt(c), sqrt(a) - sqrt(b), with every square root
//                  taken in BigInt fixed point at 1,024 fractional bits (floor(sqrt(x) 2^1024), exactly, by an
//                  integer square root of the radicand formed exactly before any rounding). The registered order and
//                  tie rule are then applied to these values: two values of different exact input tuples are tied
//                  (a numerical tie) when they differ by at most the sum of their 240-digit bounds 10^-230 M (M the
//                  value for the H forms, the sum of its square roots for the flat forms), which is where Python's
//                  240-digit pass leaves them; equal tuples tie with no computation; a chain of ties whose ends lie
//                  farther apart than their bounds stops (ChainedTieError). The 120-digit pass is followed the same
//                  way (bounds 10^-110 M) for what it counts: which values took the 240-digit path (the side file's
//                  entries, phi_recomputed) and the numerical ties met inside the maximum over senses.
//   the guard      Each comparison against a bound carries this file's own error bound (relative 2^-1020 for the H
//                  forms, 3 units of 2^-1024 for the flat forms); a comparison whose outcome that error could change
//                  throws a PrecisionError instead of guessing. None is met on the decisive files. withPrecision(bits,
//                  fn, { guard }) runs fn with coarser roots, for the controls only: at 64 bits the trace's planted
//                  near-ties change codes with the guard off and stop the run with it on; and decisive flat-arm files
//                  (HL and BD, F3, G) change even at 128 bits, where exactly equal sums of roots split apart beyond the
//                  10^-230 bound (the H forms' files tried did not: e^G = 1 is exact at any precision).
//   code files     the pass-1 TSV text byte for byte ('row TAB code', 'row TAB codeF TAB codeR' or 'row TAB slot TAB
//                  code', LF after every line), and the side file's content without its decimal strings (every value
//                  that took the 240-digit path, with its exact tuple, multiplicity, code and tie flag; every numerical
//                  tie met inside the maximum over senses, with both tuples)
//   readers        the word columns of the pinned files (stage2data.py's word readers, never a gold field), N_S, S_U(w),
//                  coverage, HiT's rows and NLTK's synset names, GloVe 6B's lines as exact decimals
//   the trace      stage2TraceLines(): reference/traces/stage2_v1.txt regenerated from Rng(8000 + i) (traces_stage2.py)
//
// What it does not reproduce: the 120-digit decimal strings themselves (pass 1's value-stream SHA-256 and the side
// file's v120/v240 fields), which are Python decimal's output and not A13.1's comparison; the reported uncertified
// forms NK17 and product (ordered by 120-digit decimals of ln, not by a certified comparison) and WN-LCh.
//
// Load order in a page: orbital_core.js, hyperbolic_core.js, decoder3d.js, the data files, lexicon_core.js, then this
// file (window.LexiconStage2). In Node: require('./lexicon_stage2.js').
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./lexicon_core.js'), require('../Hyperbolic Oracles/hyperbolic_core.js'));
    } else root.LexiconStage2 = factory(root.LexiconCore, root.HPCore);
})(typeof self !== 'undefined' ? self : this, function (LC, C) {
'use strict';
if (!LC || !C) throw new Error('lexicon_stage2.js needs lexicon_core.js and hyperbolic_core.js first');

// ================================================================== exact rationals (Python's Fraction)
const gcd = LC.gcdB;
const absB = a => (a < 0n ? -a : a);
// a rational in lowest terms with a positive denominator: { n, d } (BigInt)
function rat(n, d = 1n) {
    n = BigInt(n); d = BigInt(d);
    if (d === 0n) throw new RangeError('a zero denominator');
    if (d < 0n) { n = -n; d = -d; }
    if (d === 1n) return { n, d };
    const g = gcd(n, d);
    return g === 1n ? { n, d } : { n: n / g, d: d / g };
}
const ratStr = r => (r.d === 1n ? r.n.toString() : r.n.toString() + '/' + r.d.toString());   // str(Fraction)
const ratCmp = (a, b) => { const l = a.n * b.d, r = b.n * a.d; return l < r ? -1 : l > r ? 1 : 0; };
const ratNeg = a => ({ n: -a.n, d: a.d });
const tupKey = tup => tup.map(ratStr).join(' ');

// ================================================================== integer square root, fixed point
// floor(sqrt(n)) for a BigInt n >= 0: one Newton step from the root of the top half (exact, then corrected down)
const bitLength = LC.bitLength;
function isqrt(n) {
    if (n < 0n) throw new RangeError('isqrt of a negative number');
    if (n < 4503599627370496n) {
        let x = BigInt(Math.floor(Math.sqrt(Number(n))));
        while (x * x > n) x--;
        while ((x + 1n) * (x + 1n) <= n) x++;
        return x;
    }
    const s = BigInt(bitLength(n) >> 2);
    let x = (isqrt(n >> (2n * s)) + 1n) << s;              // at least sqrt(n), relative error about 2^-(bits/4)
    x = (x + n / x) >> 1n;                                  // one Newton step: still >= floor(sqrt(n))
    while (x * x > n) x--;
    return x;
}
// A13.1: "BigInt fixed point at 1,024 bits for the square roots". FP, W_H and GUARD change only inside withPrecision
// (the controls of tests/parity-stage2.cjs: coarser roots must change the trace, or trip the guard).
let FP = 1024n;
let W_H = FP + 512n;                 // the H forms' values are held as floor(v 2^W_H); v >= 2^-512 is checked
let GUARD = true;
function withPrecision(bits, fn, { guard = true } = {}) {
    const saved = [FP, W_H, GUARD];
    FP = BigInt(bits); W_H = FP + 512n; GUARD = guard;
    try { return fn(); } finally { [FP, W_H, GUARD] = saved; }
}
const T120 = 10n ** 110n, T240 = 10n ** 230n;   // e_p = 10^(10 - p) M: |a - b| <= e_a + e_b iff |a - b| 10^(p - 10) <= M_a + M_b
// floor(sqrt(r) 2^FP) of a rational r >= 0, exactly (floor(sqrt(floor(x))) = floor(sqrt(x)))
const sqrtFp = r => isqrt((r.n << (2n * FP)) / r.d);
// E(z) = z + sqrt((z - 1)(z + 1)) of a rational z = n/d >= 1 (any n/d, lowest terms or not), as floor-ish E 2^FP:
// the radicand (n - d)(n + d) is formed exactly before its root; the result lies in (E 2^FP - 2, E 2^FP]
function eFp(n, d) {
    if (n < d) throw new RangeError('E(z) needs z >= 1');
    return ((n << FP) + isqrt(((n - d) * (n + d)) << (2n * FP))) / d;
}

// ================================================================== certified values (A13.6)
const H_FORMS = ['hG', 'hDep'], F_FORMS = ['fG', 'fDep'], FORMS = [...H_FORMS, ...F_FORMS];
class ChainedTieError extends Error { constructor(msg, info) { super(msg); this.info = info; } }
class PrecisionError extends Error {}
let VAL_ID = 0;
// One certified value: its form, the equality key of its exact input tuple (key), the tuple itself (tup(), lazily),
// the fixed-point value v and bound base m once computed, and whether it took the 240-digit path (r2).
class Val {
    constructor(form, key, tupFn, compute) {
        this.form = form; this.key = key; this._tup = tupFn; this._compute = compute;
        this.v = null; this.m = null; this.r2 = false; this.id = VAL_ID++;
    }
    tup() { if (typeof this._tup === 'function') this._tup = this._tup(); return this._tup; }
    tupStrs() { return this.tup().map(ratStr); }
    ensure() {
        if (this.v === null) {
            const [v, m] = this._compute();
            this.v = v; this.m = m;
        }
        return this;
    }
}
// computations from exact rationals (the tuple's own entries); the tables pass cached pieces instead
function hGParts(Ea, Eb, Ek) {
    const v = (Ea << (W_H + FP)) / (Eb * Ek);
    if (GUARD && v < (1n << FP)) throw new PrecisionError('e^G below 2^-512: outside the fixed point this file holds');
    return [v, v];
}
function hDepParts(Ea, Eb) {
    const v = (Ea << W_H) / Eb;
    if (GUARD && v < (1n << FP)) throw new PrecisionError('e^Dep below 2^-512');
    return [v, v];
}
function fGParts(ra, rb, rc) { return [ra - rb - rc, ra + rb + rc]; }
function fDepParts(ra, rb) { return [ra - rb, ra + rb]; }
const eOfRat = r => eFp(r.n, r.d);
// a Val from an exact tuple (rationals), as scores2.Val(form, tup)
function valOf(form, tup) {
    tup = tup.map(x => (typeof x === 'object' && x !== null && 'n' in x ? x : rat(x)));
    if (!FORMS.includes(form)) throw new Error(`unknown certified form ${form}`);
    if (form.startsWith('h') && tup.some(x => x.n < x.d)) throw new RangeError('an H tuple needs x0 >= 1 and K >= 1');
    if (form.startsWith('f') && tup.some(x => x.n < 0n)) throw new RangeError('a flat tuple needs squares >= 0');
    const compute = form === 'hG' ? () => hGParts(eOfRat(tup[0]), eOfRat(tup[1]), eOfRat(tup[2]))
        : form === 'hDep' ? () => hDepParts(eOfRat(tup[0]), eOfRat(tup[1]))
            : form === 'fG' ? () => fGParts(sqrtFp(tup[0]), sqrtFp(tup[1]), sqrtFp(tup[2]))
                : () => fDepParts(sqrtFp(tup[0]), sqrtFp(tup[1]));
    return new Val(form, tupKey(tup), tup, compute);
}
// |a - b| T <= M_a + M_b (both values computed), with this file's error bound: a comparison the error could flip throws
function within(a, b, T) {
    const d = a.v > b.v ? a.v - b.v : b.v - a.v, S = a.m + b.m, diff = d * T - S;
    let e;
    if (a.form[0] === 'h') { const ea = (a.v >> (FP - 4n)) + 2n, eb = (b.v >> (FP - 4n)) + 2n; e = (ea + eb) * (T + 1n); }
    else e = 6n * T + 6n;
    if (GUARD && (diff < 0n ? -diff : diff) <= e) throw new PrecisionError(`a comparison within this file's error bound (form ${a.form})`);
    return diff < 0n;
}
const sgn = (a, b) => (a.v > b.v ? 1 : a.v < b.v ? -1 : 0);

// The comparison, tie classes, Phi and Dep° (scores2.Certifier): counts what Python's counts (recomputed: values that
// took the 240-digit path, each value object once; ties: the numerical ties met by cmp between different tuples).
class Certifier {
    constructor() { this.recomputed = 0; this.ties = []; this.nTies = 0; }
    ensure2(v) { if (!v.r2) { v.r2 = true; this.recomputed++; } }
    cmp(a, b) {
        if (a.form !== b.form) throw new Error(`cannot compare the forms ${a.form} and ${b.form}`);
        if (a.key === b.key) return 0;
        a.ensure(); b.ensure();
        if (!within(a, b, T120)) return sgn(a, b);
        this.ensure2(a); this.ensure2(b);
        if (!within(a, b, T240)) return sgn(a, b);
        this.nTies++;
        this.ties.push([a, b]);
        return 0;
    }
    // the index of the kept maximum: a running maximum replaced only by a later value comparing greater
    phi(vals) {
        if (!vals.length) throw new Error('no sense pair');
        let best = 0;
        for (let i = 1; i < vals.length; i++) if (this.cmp(vals[i], vals[best]) > 0) best = i;
        return best;
    }
    // Dep°: the first pair in (i, j) order whose G compares equal to the kept maximum (Python computes phi again here)
    depCircIndex(gVals, best = null) {
        if (best === null) best = this.phi(gVals);
        for (let i = 0; i < gVals.length; i++) if (i === best || this.cmp(gVals[i], gVals[best]) === 0) return i;
        throw new Error('unreachable');
    }
    // codes 0, 1, ... by tie class (scores2.Certifier.tie_classes)
    tieClasses(vals) {
        const n = vals.length;
        if (!n) return { codes: [], nClasses: 0, nDistinct: 0, recomputed: 0, tieClasses: 0, tieTuples: 0, side: [] };
        const form = vals[0].form;
        const index = new Map(), reps = [], first = [], count = [], repOf = new Array(n);
        for (let i = 0; i < n; i++) {
            const v = vals[i];
            if (v.form !== form) throw new Error('a tie-class list holds one form');
            let j = index.get(v.key);
            if (j === undefined) { j = reps.length; index.set(v.key, j); reps.push(v); first.push(i); count.push(0); }
            count[j]++;
            repOf[i] = j;
        }
        for (const r of reps) r.ensure();
        const order = reps.map((_, j) => j).sort((x, y) => (reps[x].v < reps[y].v ? -1 : reps[x].v > reps[y].v ? 1 : x - y));
        const runs = [];
        let cur = [order[0]];
        for (let k = 1; k < order.length; k++) {
            const j = order[k];
            if (within(reps[cur[cur.length - 1]], reps[j], T120)) cur.push(j);
            else { runs.push(cur); cur = [j]; }
        }
        runs.push(cur);
        const codeOf = new Array(reps.length);
        let code = 0, recomputed = 0, nTc = 0, nTt = 0;
        const side = [];
        for (const run of runs) {
            if (run.length === 1) { codeOf[run[0]] = code++; continue; }
            recomputed += run.length;
            for (const j of run) this.ensure2(reps[j]);
            const classes = [[run[0]]];
            for (let k = 1; k < run.length; k++) {
                const last = classes[classes.length - 1], j = run[k];
                if (within(reps[last[last.length - 1]], reps[j], T240)) last.push(j); else classes.push([j]);
            }
            for (const cl of classes) {
                if (cl.length > 1 && !within(reps[cl[0]], reps[cl[cl.length - 1]], T240)) {
                    throw new ChainedTieError(`a chained tie of ${cl.length} values (form ${form})`, cl.map(j => reps[j].tupStrs()));
                }
                for (const j of cl) {
                    codeOf[j] = code;
                    side.push({ item: first[j], count: count[j], tuple: reps[j].tupStrs(), code, tied: cl.length > 1 });
                }
                if (cl.length > 1) { nTc++; nTt += cl.length; }
                code++;
            }
        }
        side.sort((a, b) => a.item - b.item);
        return { codes: repOf.map(j => codeOf[j]), nClasses: code, nDistinct: reps.length, recomputed, tieClasses: nTc, tieTuples: nTt, side };
    }
}

// codes of exact keys (scores2.codes_from_keys): equal keys share a code, codes increase with the key. Keys are JS
// integers (WordNet's), or rationals { n, d } in lowest terms.
function codesFromKeys(keys) {
    if (!keys.length) return [];
    if (typeof keys[0] === 'number' || typeof keys[0] === 'bigint') {
        const distinct = [...new Set(keys)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)), rank = new Map(distinct.map((k, i) => [k, i]));
        return keys.map(k => rank.get(k));
    }
    const byStr = new Map();
    for (const k of keys) { const s = ratStr(k); if (!byStr.has(s)) byStr.set(s, k); }
    const distinct = [...byStr.entries()].sort((a, b) => ratCmp(a[1], b[1])), rank = new Map(distinct.map(([s], i) => [s, i]));
    return keys.map(k => rank.get(ratStr(k)));
}
const ratMax = list => list.reduce((m, k) => (m === null || ratCmp(k, m) > 0 ? k : m), null);

// ================================================================== point tables (A13.4)
const O = 'o';                                   // the base point's key in every table (the empty word)
const FOUR32 = 1n << 64n;
// Hyperboloid points { key: [X, den] } with x = X / den (H3, H2, K3, S-full): x0 and K = cosh d exact
class HTable {
    constructor(pts, name = '') { this.pts = pts instanceof Map ? pts : new Map(Object.entries(pts)); this.name = name; this.kind = 'h'; this.gForm = 'hG'; this.depForm = 'hDep'; this._node = new Map(); }
    has(k) { return this.pts.has(k); }
    node(k) {
        let nd = this._node.get(k);
        if (!nd) {
            const p = this.pts.get(k);
            if (!p) throw new Error(`${this.name}: no point ${k}`);
            const x0 = rat(p[0][0], p[1]);
            nd = { x0, s: ratStr(x0), E: null };
            this._node.set(k, nd);
        }
        return nd;
    }
    E(nd) { if (nd.E === null) nd.E = eOfRat(nd.x0); return nd.E; }
    x0(k) { return this.node(k).x0; }
    Kraw(a, b) {
        const [Xa, da] = this.pts.get(a), [Xb, db] = this.pts.get(b);
        let num = Xa[0] * Xb[0];
        for (let i = 1; i < Xa.length; i++) num -= Xa[i] * Xb[i];
        return [num, da * db];
    }
    K(a, b) { const [n, d] = this.Kraw(a, b); return rat(n, d); }
    gVal(s, t) {
        const a = this.node(s), b = this.node(t), K = this.K(s, t), self = this;
        return new Val('hG', a.s + ' ' + b.s + ' ' + ratStr(K), () => [a.x0, b.x0, K], () => hGParts(self.E(a), self.E(b), eOfRat(K)));
    }
    depVal(s, t) {
        const a = this.node(s), b = this.node(t), self = this;
        return new Val('hDep', a.s + ' ' + b.s, () => [a.x0, b.x0], () => hDepParts(self.E(a), self.E(b)));
    }
    grootVal(p, s, t) {
        const A = this.K(p, s), B = this.K(p, t), K = this.K(s, t);
        return valOf('hG', [A, B, K]);
    }
    symKey(s, t) { return ratNeg(this.K(s, t)); }
}
// A learned Lorentz table from snapped integers n: x0 = (4^32 + |n|^2) / (4^32 - |n|^2), K = 1 + 2 4^32 |n_s - n_t|^2 /
// ((4^32 - |n_s|^2)(4^32 - |n_t|^2)). Equal tuples are exactly equal (|n_s|^2, |n_t|^2, |n_s - n_t|^2): x0 is an
// increasing function of |n|^2, and K, given both, of |n_s - n_t|^2; that triple is the equality key.
class LTable extends HTable {
    constructor(N, name = '') { super(new Map(), name); this.n = N instanceof Map ? N : new Map(Object.entries(N)); }
    has(k) { return this.n.has(k); }
    sqn(k) { const r = this.n.get(k); let s = 0n; for (const x of r) s += x * x; if (s >= FOUR32) throw new RangeError(`${k}: |n|^2 >= 4^32 is outside the ball`); return s; }
    node(k) {
        let nd = this._node.get(k);
        if (!nd) {
            const q = this.sqn(k), x0 = rat(FOUR32 + q, FOUR32 - q);
            nd = { x0, s: ratStr(x0), q, E: null, row: this.n.get(k) };
            this._node.set(k, nd);
        }
        return nd;
    }
    d2(a, b) { let s = 0n; for (let i = 0; i < a.row.length; i++) { const t = a.row[i] - b.row[i]; s += t * t; } return s; }
    Kraw(s, t) { const a = this.node(s), b = this.node(t), den = (FOUR32 - a.q) * (FOUR32 - b.q); return [den + 2n * FOUR32 * this.d2(a, b), den]; }
    gVal(s, t) {
        const a = this.node(s), b = this.node(t), self = this, den = (FOUR32 - a.q) * (FOUR32 - b.q), d2 = this.d2(a, b), kn = den + 2n * FOUR32 * d2;
        return new Val('hG', a.q + ':' + b.q + ':' + d2, () => [a.x0, b.x0, rat(kn, den)], () => hGParts(self.E(a), self.E(b), eFp(kn, den)));
    }
    depVal(s, t) {
        const a = this.node(s), b = this.node(t), self = this;
        return new Val('hDep', a.q + ':' + b.q, () => [a.x0, b.x0], () => hDepParts(self.E(a), self.E(b)));
    }
}
// Flat points { key: [X, den] } (F3, F3*, F2, F2*): |s|^2 and |s - t|^2 exact
class FTable {
    constructor(pts, name = '') { this.pts = pts instanceof Map ? pts : new Map(Object.entries(pts)); this.name = name; this.kind = 'f'; this.gForm = 'fG'; this.depForm = 'fDep'; this._node = new Map(); }
    has(k) { return this.pts.has(k); }
    node(k) {
        let nd = this._node.get(k);
        if (!nd) {
            const p = this.pts.get(k);
            if (!p) throw new Error(`${this.name}: no point ${k}`);
            let s = 0n;
            for (const x of p[0]) s += x * x;
            const sq = rat(s, p[1] * p[1]);
            nd = { sq, s: ratStr(sq), R: null, X: p[0], den: p[1] };
            this._node.set(k, nd);
        }
        return nd;
    }
    R(nd) { if (nd.R === null) nd.R = sqrtFp(nd.sq); return nd.R; }
    sq(k) { return this.node(k).sq; }
    d2(s, t) {
        const a = this.node(s), b = this.node(t);
        let n = 0n;
        for (let i = 0; i < a.X.length; i++) { const u = a.X[i] * b.den - b.X[i] * a.den; n += u * u; }
        const dd = a.den * b.den;
        return rat(n, dd * dd);
    }
    gVal(s, t) {
        const a = this.node(s), b = this.node(t), c = this.d2(s, t), self = this;
        return new Val('fG', a.s + ' ' + b.s + ' ' + ratStr(c), () => [a.sq, b.sq, c], () => fGParts(self.R(a), self.R(b), sqrtFp(c)));
    }
    depVal(s, t) {
        const a = this.node(s), b = this.node(t), self = this;
        return new Val('fDep', a.s + ' ' + b.s, () => [a.sq, b.sq], () => fDepParts(self.R(a), self.R(b)));
    }
    grootVal(p, s, t) { return valOf('fG', [this.d2(s, p), this.d2(t, p), this.d2(s, t)]); }
    symKey(s, t) { return ratNeg(this.d2(s, t)); }
}
// A learned Euclidean table from snapped integers n: |n|^2 and |n_s - n_t|^2 as integers (the factor 2^-32 dropped)
class ETable extends FTable {
    constructor(N, name = '') { super(new Map(), name); this.n = N instanceof Map ? N : new Map(Object.entries(N)); }
    has(k) { return this.n.has(k); }
    node(k) {
        let nd = this._node.get(k);
        if (!nd) {
            const row = this.n.get(k);
            if (!row) throw new Error(`${this.name}: no point ${k}`);
            let s = 0n;
            for (const x of row) s += x * x;
            nd = { sq: { n: s, d: 1n }, s: s.toString(), R: null, row };
            this._node.set(k, nd);
        }
        return nd;
    }
    d2(s, t) {
        const a = this.node(s).row, b = this.node(t).row;
        let n = 0n;
        for (let i = 0; i < a.length; i++) { const u = a[i] - b[i]; n += u * u; }
        return { n, d: 1n };
    }
}
// table builders (scores2.h3_table, h2_table, flat_table, k3_table, sfull_table, lorentz_table, euclid_table)
function withOrigin(words) {
    const m = new Map(words instanceof Map ? words : Object.entries(words));
    if (m.has(O) && m.get(O).length) throw new Error(`the key ${O} is reserved for the base point (the empty word)`);
    m.set(O, []);
    return m;
}
function h3Table(words, name = 'H3') {
    const m = withOrigin(words), keys = [...m.keys()], pts = LC.h3Points(keys.map(k => m.get(k))), out = new Map();
    keys.forEach((k, i) => out.set(k, [pts[i], LC.h3Den(m.get(k).length)]));
    return new HTable(out, name);
}
function h2Table(words, name = 'H2') {
    const m = withOrigin(words), keys = [...m.keys()], T = LC.H2_TREE, pts = T.points(keys.map(k => m.get(k))), out = new Map();
    keys.forEach((k, i) => out.set(k, [pts[i], T.den(m.get(k).length)]));
    return new HTable(out, name);
}
const FLATS = { F3: () => LC.F3, 'F3*': () => LC.F3S, F2: () => LC.F2, 'F2*': () => LC.F2S };
function flatTable(words, name) {
    const m = withOrigin(words), keys = [...m.keys()], T = FLATS[name](), pts = T.points(keys.map(k => m.get(k))), out = new Map();
    keys.forEach((k, i) => out.set(k, [pts[i], T.den(m.get(k).length)]));
    return new FTable(out, name);
}
// K3 (address.k3_word): engram.address.encode(v), v the first 8 bytes of SHA-256 of the lemma's UTF-8, big-endian;
// 28 letters, each chosen among the five allowed after the word so far (generators 0-4 at the root)
function k3Word(lemma) {
    const h = LC.sha256Hex(LC.utf8(lemma));
    let x = BigInt('0x' + h.slice(0, 16));
    const w = [];
    for (let s = 0; s < 28; s++) {
        const ch = w.length ? C.P.children([w[w.length - 1]]) : [0, 1, 2, 3, 4];
        w.push(ch[Number(x % 5n)]);
        x /= 5n;
    }
    return w;
}
function k3Table(wn, offsets, name = 'K3') {
    const syn = wn.synsets.noun, m = new Map();
    for (const o of offsets) m.set(o, k3Word(syn.get(o).lemmas[0]));
    return h3Table(m, name);
}
// S-full (A13.4; l6.move_points's convention): the synset with offset-order index P[j] takes the point of synset j;
// P = Rng(seed).shuffle(list(range(n))) (l6.label_permutation); o stays
const labelPermutation = (seed, n) => new C.Rng(seed).shuffle(Array.from({ length: n }, (_, i) => i));
function sfullTable(table, offsets, P, name = 'S-full') {
    const n = offsets.length;
    if (P.length !== n) throw new Error('P is not a permutation of the offsets');
    const seen = new Uint8Array(n);
    for (const p of P) { if (seen[p]) throw new Error('P is not a permutation'); seen[p] = 1; }
    const pts = new Map();
    for (let j = 0; j < n; j++) pts.set(offsets[P[j]], table.pts.get(offsets[j]));
    const sorted = new Map(offsets.map(o => [o, pts.get(o)]));
    if (table.pts.has(O)) sorted.set(O, table.pts.get(O));
    return new HTable(sorted, name);
}
function lorentzTable(offsets, N, name = 'lorentz') {
    const m = new Map();
    offsets.forEach((o, i) => m.set(o, N[i]));
    m.set(O, N[0].map(() => 0n));
    return new LTable(m, name);
}
function euclidTable(offsets, N, name = 'euclid') {
    const m = new Map();
    offsets.forEach((o, i) => m.set(o, N[i]));
    m.set(O, N[0].map(() => 0n));
    return new ETable(m, name);
}
// W_i (A13.4): index.noun's lemmas grouped by their number of senses k = 1..9 and k >= 10 pooled; one Rng(seed)
// takes the strata in increasing k, each stratum sorted by code point as L and permuted by shuffle into Q; lemma L[j]
// takes the sense list of Q[j]. Returns Map lemma -> the lemma whose senses it takes.
const W_STRATA_NOUN = [101863, 10257, 2989, 1178, 620, 306, 212, 94, 96, 183];
const cpCmp = (a, b) => {                           // Python's str order (code points)
    const A = Array.from(a), B = Array.from(b), n = Math.min(A.length, B.length);
    for (let i = 0; i < n; i++) { const x = A[i].codePointAt(0), y = B[i].codePointAt(0); if (x !== y) return x - y; }
    return A.length - B.length;
};
const asciiCmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const isAscii = s => /^[\x00-\x7f]*$/.test(s);
function wStrata(index) {
    const strata = new Map();
    for (const [lemma, e] of index) {
        const k = Math.min(e.offsets.length, 10);
        if (k < 1) throw new Error(`${lemma} has no senses`);
        if (!strata.has(k)) strata.set(k, []);
        strata.get(k).push(lemma);
    }
    for (const v of strata.values()) v.sort(v.every(isAscii) ? asciiCmp : cpCmp);
    return strata;
}
function wMap(index, seed, check = W_STRATA_NOUN) {
    const rng = new C.Rng(seed), strata = wStrata(index), out = new Map();
    if (check) {
        const got = Array.from({ length: 10 }, (_, i) => (strata.get(i + 1) || []).length);
        if (got.join() !== check.join()) throw new Error(`W strata ${got} are not ${check}`);
    }
    for (const k of [...strata.keys()].sort((a, b) => a - b)) {
        const L = strata.get(k), Q = rng.shuffle(L.slice());
        L.forEach((a, j) => out.set(a, Q[j]));
    }
    return out;
}

// ================================================================== WordNet's own graph (wngraph.py)
// parents: Map node -> [parents] (closure parents: '@' and '@i'); root reached by every node
class WNGraph {
    constructor(parents, root) {
        this.parents = parents; this.root = root; this._anc = new Map();
        if (!parents.has(root)) throw new Error(`the root ${root} is not a node`);
        if (parents.get(root).length) throw new Error(`the root ${root} has parents`);
    }
    anc(x) {                                    // Map a -> up(x, a) over A(x): breadth-first upward, cached
        let d = this._anc.get(x);
        if (d) return d;
        d = new Map([[x, 0]]);
        let frontier = [x], k = 0;
        while (frontier.length) {
            k++;
            const nxt = [];
            for (const y of frontier) for (const p of this.parents.get(y)) if (!d.has(p)) { d.set(p, k); nxt.push(p); }
            frontier = nxt;
        }
        if (!d.has(this.root)) throw new Error(`${x} does not reach the root ${this.root}`);
        this._anc.set(x, d);
        return d;
    }
    depth(x) { return this.anc(x).get(this.root); }
    _common(s, t) {
        const As = this.anc(s), At = this.anc(t), out = [];
        if (As.size <= At.size) { for (const [a, us] of As) if (At.has(a)) out.push([us, At.get(a)]); }
        else for (const [a, ut] of At) if (As.has(a)) out.push([As.get(a), ut]);
        return out;
    }
    g(s, t) { let m = Infinity; for (const [, ut] of this._common(s, t)) if (ut < m) m = ut; return -2 * m; }
    path(s, t) { let m = Infinity; for (const [us, ut] of this._common(s, t)) if (us + ut < m) m = us + ut; return m; }
    sym(s, t) { return -this.path(s, t); }
    dep(s, t) { return this.depth(s) - this.depth(t); }
}
function nounGraph(wn) {
    const parents = new Map();
    for (const [o, s] of wn.synsets.noun) parents.set(o, LC.closureParents(s));
    const roots = [...parents].filter(([, ps]) => !ps.length).map(([o]) => o).sort();
    if (roots.length !== 1 || roots[0] !== LC.ENTITY) throw new Error(`the noun graph has roots ${roots.slice(0, 5)}, not entity.n.01 alone`);
    return new WNGraph(parents, LC.ENTITY);
}

// ================================================================== scorers (scores2.Scorer, WNScorer)
class Scorer {
    constructor(table, cert = null) { this.t = table; this.cert = cert || new Certifier(); }
    gVals(S1, S2) { const out = []; for (const s of S1) for (const u of S2) out.push(this.t.gVal(s, u)); return out; }
    depVals(S1, S2) { const out = []; for (const s of S1) for (const u of S2) out.push(this.t.depVal(s, u)); return out; }
    phiG(S1, S2) { const v = this.gVals(S1, S2); return v[this.cert.phi(v)]; }
    depCirc(S1, S2) { const g = this.gVals(S1, S2), i = this.cert.depCircIndex(g); return this.t.depVal(S1[Math.floor(i / S2.length)], S2[i % S2.length]); }
    phiSym(S1, S2) { const ks = []; for (const s of S1) for (const u of S2) ks.push(this.t.symKey(s, u)); return ratMax(ks); }
    phiDep(S1, S2) { const v = this.depVals(S1, S2); return v[this.cert.phi(v)]; }
    firstG(S1, S2) { return this.t.gVal(S1[0], S2[0]); }
    firstDep(S1, S2) { return this.t.depVal(S1[0], S2[0]); }
    firstSym(S1, S2) { return this.t.symKey(S1[0], S2[0]); }
    gensimPair(S1, S2) {
        let best = null, bk = null;
        for (const s of S1) for (const u of S2) { const k = this.t.symKey(s, u); if (bk === null || ratCmp(k, bk) > 0) { best = [s, u]; bk = k; } }
        return best;
    }
    gensimG(S1, S2) { const [s, u] = this.gensimPair(S1, S2); return this.t.gVal(s, u); }
    gensimDep(S1, S2) { const [s, u] = this.gensimPair(S1, S2); return this.t.depVal(s, u); }
    slotVals(child, cands) { return cands.map(c => this.t.gVal(child, c)); }
}
class WNScorer {
    constructor(graph) { this.g = graph; }
    _all(S1, S2, f) { const out = []; for (const s of S1) for (const u of S2) out.push(f(s, u)); return out; }
    phiG(S1, S2) { return Math.max(...this._all(S1, S2, (s, u) => this.g.g(s, u))); }
    depCirc(S1, S2) {
        const pairs = this._all(S1, S2, (s, u) => [s, u]), gs = pairs.map(([s, u]) => this.g.g(s, u)), m = Math.max(...gs);
        const [s, u] = pairs[gs.indexOf(m)];
        return this.g.dep(s, u);
    }
    phiSym(S1, S2) { return Math.max(...this._all(S1, S2, (s, u) => this.g.sym(s, u))); }
    phiDep(S1, S2) { return Math.max(...this._all(S1, S2, (s, u) => this.g.dep(s, u))); }
    firstG(S1, S2) { return this.g.g(S1[0], S2[0]); }
    firstSym(S1, S2) { return this.g.sym(S1[0], S2[0]); }
    firstDep(S1, S2) { return this.g.dep(S1[0], S2[0]); }
    gensimPair(S1, S2) { let best = null, bk = null; for (const s of S1) for (const u of S2) { const k = this.g.sym(s, u); if (bk === null || k > bk) { best = [s, u]; bk = k; } } return best; }
    gensimG(S1, S2) { return this.g.g(...this.gensimPair(S1, S2)); }
    gensimDep(S1, S2) { return this.g.dep(...this.gensimPair(S1, S2)); }
}
// one ordered row's value (run_claims_stage2.pair_value): a Val, an exact rational key or a WordNet integer
const RULES = {
    geo: {
        G: { max: 'phiG', first: 'firstG', gensim: 'gensimG' }, DepG: { max: 'depCirc' },
        Dep: { max: 'phiDep', first: 'firstDep', gensim: 'gensimDep' }, Sym: { max: 'phiSym', first: 'firstSym' },
        dist: { max: 'phiSym', first: 'firstSym' },
    },
    wn: {
        G: { max: 'phiG', first: 'firstG', gensim: 'gensimG' }, DepG: { max: 'depCirc' },
        Dep: { max: 'phiDep', first: 'firstDep', gensim: 'gensimDep' }, Sym: { max: 'phiSym', first: 'firstSym' },
    },
};
function pairValue(sc, kind, form, rule, sx, sy) {
    const f = form === 'Grev' ? 'G' : form;
    const m = (RULES[kind][f] || {})[rule];
    if (!m) throw new Error(`no form ${form} under the sense rule ${rule}`);
    return sc[m](sx, sy);
}
const vtypeOf = (kind, form) => (kind === 'wn' ? 'key' : ['G', 'Grev', 'DepG', 'Dep', 'Groot'].includes(form) ? 'cert' : 'key');

// ================================================================== code files (run_claims_stage2.write_code_file)
// The values of one (instance, arm, form, rule) and their codes. rows: [[row, x senses, y senses]] for 'pair' and
// 'dir'; for 'hit', [[row, child, slots]]. Returns { text, lines, codes, info, side } where side is the side file's
// content without its decimal strings (entries: item, count, tuple, code, tied, row, slot; phiTies: [a, b] tuples).
function scoreList(kind, rows, valueOf) {
    const cert = new Certifier();
    let flat;
    if (kind === 'hit') flat = rows.flatMap(r => valueOf.slot(cert, r));
    else {
        const fw = rows.map(r => valueOf.pair(cert, r[1], r[2]));
        flat = kind === 'dir' ? fw.concat(rows.map(r => valueOf.pair(cert, r[2], r[1]))) : fw;
    }
    return { cert, flat };
}
function codeFile(kind, rowNums, flat, vtype, cert, slots = 21) {
    let codes, info, sideEntries = [];
    if (vtype === 'cert') {
        const tc = cert.tieClasses(flat);
        codes = tc.codes;
        sideEntries = tc.side;
        info = { classes: tc.nClasses, distinct: tc.nDistinct, recomputed: tc.recomputed, tie_classes: tc.tieClasses, tie_tuples: tc.tieTuples };
    } else {
        codes = codesFromKeys(flat);
        const mx = codes.reduce((m, c) => Math.max(m, c), -1);
        info = { classes: mx + 1, distinct: new Set(codes).size, recomputed: 0, tie_classes: 0, tie_tuples: 0 };
    }
    const n = rowNums.length, parts = [];
    let itemOf;
    if (kind === 'pair') { for (let i = 0; i < n; i++) parts.push(`${rowNums[i]}\t${codes[i]}\n`); itemOf = i => [rowNums[i], null]; }
    else if (kind === 'dir') { for (let i = 0; i < n; i++) parts.push(`${rowNums[i]}\t${codes[i]}\t${codes[n + i]}\n`); itemOf = i => (i < n ? [rowNums[i], 'f'] : [rowNums[i - n], 'r']); }
    else { for (let i = 0; i < n; i++) for (let s = 0; s < slots; s++) parts.push(`${rowNums[i]}\t${s}\t${codes[i * slots + s]}\n`); itemOf = i => [rowNums[Math.floor(i / slots)], i % slots]; }
    const side = {
        entries: sideEntries.map(e => { const [row, slot] = itemOf(e.item); return [e.item, e.count, e.tuple, e.code, e.tied, row, slot]; }),
        phiTies: cert ? cert.ties.map(([a, b]) => [a.tupStrs(), b.tupStrs()]) : [],
    };
    info.phi_recomputed = cert ? cert.recomputed : 0;
    info.phi_ties = cert ? cert.nTies : 0;
    return { text: parts.join(''), lines: parts.length, codes, info, side };
}
// the same projection of a Python side file (its JSON object), for comparison: the decimal strings dropped
function sideProjection(sd) {
    return {
        entries: sd.entries.map(e => [e.item, e.count, e.tuple, e.code, e.tied, e.row, e.slot]),
        phiTies: sd.phi_ties.map(t => [t.a, t.b]),
    };
}

// ================================================================== words, senses and readers (senses.py, stage2data.py)
const N_S = w => w.replace(/[A-Z ]/g, c => (c === ' ' ? '_' : String.fromCharCode(c.charCodeAt(0) + 32)));
// S_U(w): index.noun[N_S(w)]'s offsets in index order, filtered to U (a Set, or null for none)
function senses(w, U, wn) {
    const e = wn.index.noun.get(N_S(w));
    if (!e) return [];
    return U ? e.offsets.filter(o => U.has(o)) : e.offsets.slice();
}
const inVocab = (w, vocab) => { const v = N_S(w); return !v.includes('_') && vocab.has(v); };
function selectRows(rows, U, wn, vocab = null) {
    return rows.filter(([, x, y]) => senses(x, U, wn).length && senses(y, U, wn).length && (!vocab || (inVocab(x, vocab) && inVocab(y, vocab))));
}
const rowsSha = rows => LC.sha256Hex(LC.utf8(rows.map(r => String(r)).join('\n')));
const textSha = s => LC.sha256Hex(LC.utf8(s));
// stage2data._lines: strict UTF-8, no byte-order mark, LF lines, the empty string after a final LF dropped, one final
// CR per line removed, no blank line
function dataLines(bytes, key, header = null) {
    const bad = LC.utf8FirstBad(bytes);
    if (bad >= 0) throw new Error(`${key}: not UTF-8 (byte ${bad})`);
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
    if (text.startsWith('﻿')) throw new Error(`${key}: byte-order mark`);
    const parts = text.split('\n');
    if (parts.length && parts[parts.length - 1] === '') parts.pop();
    const out = parts.map((l, i) => {
        if (l.endsWith('\r')) l = l.slice(0, -1);
        if (l === '') throw new Error(`${key}: blank line ${i}`);
        return l;
    });
    if (header === null) return out;
    const want = typeof header === 'string' ? header : header.join('\t');
    if (!out.length || out[0] !== want) throw new Error(`${key}: header ${JSON.stringify(out[0])} is not ${JSON.stringify(want)}`);
    return out.slice(1);
}
const pyStrip = w => w.replace(/^[\s\x1c-\x1f\x85]+|[\s\x1c-\x1f\x85]+$/g, '');
function word(w, key, r) { if (w === '' || w !== pyStrip(w)) throw new Error(`${key}: row ${r}: empty word or surrounding whitespace`); return w; }
function tsv(lines, n, key) { return lines.map((l, r) => { const f = l.split('\t'); if (f.length !== n) throw new Error(`${key}: row ${r} has ${f.length} fields, not ${n}`); return f; }); }
const HL_HEADER = 'WORD1 WORD2 POS TYPE AVG_SCORE AVG_SCORE_0_10 STD SCORES..';
const SUITE_HEADERS = {
    bless: ['word1', 'word2', 'label', 'fold'], wbless: ['word1', 'word2', 'label', 'relation', 'fold'],
    leds: ['word1', 'word2', 'label', 'fold'], eval: ['word1', 'word2', 'label', 'relation', 'fold'],
    shwartz: ['word1', 'word2', 'label', 'fold'], bibless: ['word1', 'word2', 'relation', 'label'],
};
const SIMLEX_HEADER = ['word1', 'word2', 'POS', 'SimLex999', 'conc(w1)', 'conc(w2)', 'concQ', 'Assoc(USF)', 'SimAssoc333', 'SD(SimLex)'];
const WS353_COMBINED_HEADER = ['Word 1', 'Word 2', 'Human (mean)'];
const MEN_TAGS = ['-n', '-v', '-j'];
// the word readers: only row numbers, words, POS, MEN's tags and folds are read (A13.8's pass 1)
const READERS = {
    hyperlexWords(bytes, key = 'hyperlex-all') {                       // [row, WORD1, WORD2, POS]
        return dataLines(bytes, key, HL_HEADER).map((l, r) => {
            const f = l.split(' ');
            if (f.length < 3) throw new Error(`${key}: row ${r} has ${f.length} fields`);
            return [r, word(f[0], key, r), word(f[1], key, r), word(f[2], key, r)];
        });
    },
    suiteWords(bytes, name) {                                          // [row, word1, word2, fold or null]
        const head = SUITE_HEADERS[name], fi = head.indexOf('fold');
        return tsv(dataLines(bytes, name, head), head.length, name).map((f, r) => {
            const fold = fi >= 0 ? f[fi] : null;
            if (fold !== null && fold !== 'val' && fold !== 'test') throw new Error(`${name}: row ${r}: fold ${fold}`);
            return [r, word(f[0], name, r), word(f[1], name, r), fold];
        });
    },
    simlexWords(bytes) { return tsv(dataLines(bytes, 'simlex', SIMLEX_HEADER), SIMLEX_HEADER.length, 'simlex').map((f, r) => [r, word(f[0], 'simlex', r), word(f[1], 'simlex', r), f[2]]); },
    menWords(bytes) {                                                  // [row, word1, tag1, word2, tag2]
        return dataLines(bytes, 'men').map((l, r) => {
            const f = l.split(' ');
            if (f.length !== 3) throw new Error(`men: row ${r} has ${f.length} fields`);
            const [a, b] = f;
            if (a.length < 3 || b.length < 3 || !MEN_TAGS.includes(a.slice(-2)) || !MEN_TAGS.includes(b.slice(-2))) throw new Error(`men: row ${r}: no tag`);
            return [r, word(a.slice(0, -2), 'men', r), a.slice(-2), word(b.slice(0, -2), 'men', r), b.slice(-2)];
        });
    },
    ws353Words(bytes, key = 'ws353-rel') {                             // [row, w1, w2]
        const header = key === 'ws353-combined' ? WS353_COMBINED_HEADER : null;
        return tsv(dataLines(bytes, key, header), 3, key).map((f, r) => [r, word(f[0], key, r), word(f[1], key, r)]);
    },
    // HiT (hit.read_rows): [row, child, [parent, 10 random, 10 hard]] as names
    hitRows(bytes, key = 'hit-test') {
        return dataLines(bytes, key).map((l, r) => {
            const o = JSON.parse(l), slots = [o.parent, ...o.random_negatives, ...o.hard_negatives];
            if (![o.child, ...slots].every(x => typeof x === 'string')) throw new Error(`${key}: row ${r}: a name is not a string`);
            return [r, o.child, slots];
        });
    },
    hitLexiconNames(bytes) { return Object.keys(JSON.parse(new TextDecoder('utf-8').decode(bytes))); },
};
// NLTK's synset names (senses.hit_names): the data line's first lemma, lower-cased, '.n.', the 1-based position of the
// synset in that lemma's index.noun entry as two digits. Map name -> offset (one-to-one, refused otherwise).
function hitNames(wn) {
    const nouns = wn.synsets.noun, idx = wn.index.noun, out = new Map();
    for (const o of [...nouns.keys()].sort()) {
        const first = nouns.get(o).lemmas[0];
        if (!isAscii(first)) throw new Error(`${o}: a non-ASCII lemma (Python's str.lower is not re-implemented here)`);
        const lemma = asciiLower(first), e = idx.get(lemma);
        if (!e || !e.offsets.includes(o)) throw new Error(`${o}: its first lemma ${lemma} does not list it in index.noun`);
        const name = `${lemma}.n.${String(e.offsets.indexOf(o) + 1).padStart(2, '0')}`;
        if (out.has(name)) throw new Error(`two synsets named ${name}`);
        out.set(name, o);
    }
    return out;
}
// the '@' graph's nodes (senses.at_graph): synsets incident to a noun '@' pointer, in offset order
function atNodes(wn) {
    const syn = wn.synsets.noun, nodes = new Set();
    for (const [o, s] of syn) for (const p of s.ptrs) if (p.sym === '@') {
        if (!syn.has(p.offset)) throw new Error(`noun ${o}: an @ pointer to ${p.offset}, outside the nouns`);
        nodes.add(o); nodes.add(p.offset);
    }
    return [...nodes].sort();
}
// GloVe (glove.py): a line 'word v1 ... vd' as exact decimals; the vector as integers over one common power of ten
const NUMBER = /^(-?)([0-9]+)(?:\.([0-9]+))?(?:[eE]([-+]?[0-9]+))?$/;
function gloveVector(fields) {
    const parts = fields.map(t => {
        const m = NUMBER.exec(t);
        if (!m) throw new Error(`${JSON.stringify(t)} is not a decimal number`);
        const frac = m[3] || '', mant = BigInt(m[2] + frac), e = (m[4] ? parseInt(m[4], 10) : 0) - frac.length;
        return [m[1] ? -mant : mant, e];
    });
    const scale = Math.max(0, ...parts.map(([, e]) => -e));
    return parts.map(([m, e]) => m * 10n ** BigInt(e + scale));
}
function gloveLine(line, dim) {
    const f = line.split(' ');
    if (f.length !== dim + 1 || f[0] === '') throw new Error(`a GloVe line with ${f.length} fields, not ${dim + 1}`);
    return [f[0], gloveVector(f.slice(1))];
}
// A13.6's GloVe key c|c| / (|a|^2 |b|^2), c = a.b: an increasing function of the cosine, a rational
function cosKey(a, b) {
    if (a.length !== b.length) throw new Error('vectors of different dimension');
    let c = 0n, na = 0n, nb = 0n;
    for (let i = 0; i < a.length; i++) { c += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    if (!na || !nb) throw new Error('a zero GloVe vector has no cosine');
    return rat(c * absB(c), na * nb);
}

// ================================================================== the trace (reference/traces/stage2_v1.txt)
// The twin of reference/traces_stage2.py: case i from Rng(8000 + i), the same draws in the same order, every line
// (header included). See that file's docstring for the cases and the line formats.
const TRACE_SEED = 8000;
const TRACE_ARMS = ['H3', 'H2', 'F3', 'F3*', 'F2', 'F2*'];
const TRACE_LISTS = [['G', 'max', 'pair'], ['Grev', 'max', 'pair'], ['DepG', 'max', 'pair'], ['Dep', 'max', 'pair'],
    ['G', 'first', 'pair'], ['G', 'gensim', 'pair'], ['Dep', 'first', 'pair'], ['Dep', 'gensim', 'pair'],
    ['G', 'max', 'dir'], ['Sym', 'max', 'pair'], ['Sym', 'first', 'pair']];
const TRACE_LEARNED_LISTS = [['G', 'max', 'pair'], ['DepG', 'max', 'pair'], ['G', 'max', 'dir'], ['Sym', 'max', 'pair']];
const NEAR = [40, 100, 104, 108, 112, 116, 150, 200, 224, 228, 232, 236, 260, 300];
const ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-.0123456789 ';
const TRACE_HEAD = [
    '# stage2_v1: Stage 2\'s exact keys, certified values, comparison and tie classes (A13.1, A13.4-A13.6, A13.8),',
    '# scored by lexicon.scores2 as pass 1 scores. Case i from Rng(8000 + i): i < 8 tree (H3, H2, F3, F3*, F2, F2*),',
    '# i < 12 learned (Lorentz, Euclidean), i < 16 planted lists per certified form, i < 18 the inputs (K3, N_S,',
    '# S-full, W, WordNet\'s integers, GloVe\'s key). "<i> node <arm> <key> <x0 or |s|^2>"; "<i> row <arm> <r> <G max',
    '# tuple> <DepG tuple> <Sym max key>"; "<i> codes <arm> <form> <rule> <kind> <classes> <distinct> <recomputed>',
    '# <tie classes> <tie tuples> <phi recomputed> <phi ties> <tsv sha256> <side sha256>"; "<i> tuple <form> <j>',
    '# <tuple>"; "<i> phi <form> <index> <ties> <recomputed>"; "<i> list <form> <codes> <classes> <distinct>',
    '# <recomputed> <tie classes> <tie tuples> <recomputed> <side sha256>"; "<i> chained <form> <n> raised";',
    '# "<i> k3 <lemma> <word>"; "<i> ns <hex of s> <N_S(s)>"; "<i> sfull <key> <x0>"; "<i> wmap <lemma> <lemma>";',
    '# "<i> wn <s> <t> <G> <Sym> <Dep>"; "<i> glove <x> <y> <key>" (vectors as comma-joined decimals).',
];
const pad2 = j => String(j).padStart(2, '0');
const tq = tup => tup.map(ratStr).join(',');
const asciiLower = s => s.replace(/[A-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 32));
function traceTreeWords(rng, n) {
    const words = [];
    for (let j = 0; j < n; j++) {
        const t = rng.below(4);
        if (j && t === 0) { const src = words[rng.below(j)]; words.push(src.slice(0, 1 + rng.below(src.length))); }
        else if (j && t === 1) {
            const w = words[rng.below(j)].slice();
            for (let k = 1 + rng.below(3); k > 0; k--) w.push(C.P.children(w)[rng.below(5)]);
            words.push(w);
        } else words.push(LC.wordOf(rng, 1 + rng.below(8)));
    }
    return new Map(words.map((w, j) => ['s' + pad2(j), w]));
}
function traceSenseRows(rng, keys) {
    const rows = [];
    for (let m = 10 + rng.below(11); m > 0; m--) {
        const a = rng.sample(keys.length, 1 + rng.below(3)).map(k => keys[k]);
        const b = rng.sample(keys.length, 1 + rng.below(3)).map(k => keys[k]);
        rows.push([a, b]);
    }
    return rows;
}
const sideSha = side => textSha(JSON.stringify([side.entries, side.phiTies]));
function traceCodesLine(i, arm, form, rule, kind, n, flat, cert, certForm) {
    const r = codeFile(kind, Array.from({ length: n }, (_, k) => k), flat, certForm ? 'cert' : 'key', cert, 21), f = r.info;
    return `${i} codes ${arm} ${form} ${rule} ${kind} ${f.classes} ${f.distinct} ${f.recomputed} ${f.tie_classes} ${f.tie_tuples} ` +
        `${cert.recomputed} ${cert.nTies} ${textSha(r.text)} ${sideSha(r.side)}`;
}
function traceScoreLists(i, arm, table, rows, lists, out) {
    for (const [form, rule, kind] of lists) {
        const cert = new Certifier(), sc = new Scorer(table, cert);
        const fw = rows.map(([a, b]) => (form === 'Grev' ? pairValue(sc, 'geo', 'G', rule, b, a) : pairValue(sc, 'geo', form, rule, a, b)));
        const flat = kind === 'dir' ? fw.concat(rows.map(([a, b]) => pairValue(sc, 'geo', form, rule, b, a))) : fw;
        out.push(traceCodesLine(i, arm, form, rule, kind, rows.length, flat, cert, form !== 'Sym'));
    }
}
function traceRowLines(i, arm, table, rows, out) {
    const sc = new Scorer(table, new Certifier());
    rows.forEach(([a, b], r) => out.push(`${i} row ${arm} ${r} ${tq(sc.phiG(a, b).tup())} ${tq(sc.depCirc(a, b).tup())} ${ratStr(sc.phiSym(a, b))}`));
}
const nodeValue = (t, k) => ratStr(t.kind === 'h' ? t.x0(k) : t.sq(k));
function traceTreeCase(i, rng, out) {
    const words = traceTreeWords(rng, 12 + rng.below(13)), keys = [...words.keys()], rows = traceSenseRows(rng, keys);
    out.push(`${i} case tree ${keys.length} ${rows.length}`);
    for (const k of keys) out.push(`${i} word ${k} ${words.get(k).join('')}`);
    const tables = { H3: h3Table(words), H2: h2Table(words), F3: flatTable(words, 'F3'), 'F3*': flatTable(words, 'F3*'), F2: flatTable(words, 'F2'), 'F2*': flatTable(words, 'F2*') };
    for (const arm of TRACE_ARMS) {
        const t = tables[arm];
        for (const k of keys) out.push(`${i} node ${arm} ${k} ${nodeValue(t, k)}`);
        traceRowLines(i, arm, t, rows, out);
        traceScoreLists(i, arm, t, rows, TRACE_LISTS, out);
    }
}
function traceLearnedCase(i, rng, out) {
    const d = 2 + (i % 2), n = 16 + rng.below(17), N = [];
    for (let j = 0; j < n; j++) {
        const t = rng.below(8);
        if (j && t === 0) N.push(N[rng.below(j)]);
        else if (j && t === 1) {
            const src = N[rng.below(j)], perm = rng.shuffle(Array.from({ length: d }, (_, k) => k)), row = [];
            for (let k = 0; k < d; k++) row.push(rng.below(2) ? -src[perm[k]] : src[perm[k]]);
            N.push(row);
        } else if (t === 2) N.push(Array(d).fill(0n));
        else if (t === 3) { const m = BigInt(4294967295 - rng.below(8)); N.push([m, BigInt(rng.below(4)), ...Array(d - 2).fill(0n)]); }
        else { const row = []; for (let k = 0; k < d; k++) row.push(BigInt(rng.below(2147483649) - 1073741824)); N.push(row); }
    }
    const keys = Array.from({ length: n }, (_, j) => 'n' + pad2(j)), hit = [];
    for (let h = 6 + rng.below(7); h > 0; h--) {
        const child = keys[rng.below(n)], slots = [];
        for (let s = 0; s < 21; s++) slots.push(keys[rng.below(n)]);
        hit.push([child, slots]);
    }
    const rows = traceSenseRows(rng, keys);
    out.push(`${i} case learned ${d} ${n} ${hit.length} ${rows.length}`);
    keys.forEach((k, j) => out.push(`${i} snap ${k} ${N[j].join(' ')}`));
    for (const [arm, t] of [['lorentz', lorentzTable(keys, N)], ['euclid', euclidTable(keys, N)]]) {
        for (const k of keys) out.push(`${i} node ${arm} ${k} ${nodeValue(t, k)}`);
        const cert = new Certifier(), sc = new Scorer(t, cert);
        const flat = hit.flatMap(([child, slots]) => sc.slotVals(child, slots));
        out.push(traceCodesLine(i, arm, 'G', '-', 'hit', hit.length, flat, cert, true));
        traceRowLines(i, arm, t, rows, out);
        traceScoreLists(i, arm, t, rows, TRACE_LEARNED_LISTS, out);
    }
}
const ge1 = rng => { const d = BigInt(1 + rng.below(1000)); return rat(d + BigInt(rng.below(1000000)), d); };
const ge0 = rng => rat(BigInt(rng.below(1000000)), BigInt(1 + rng.below(1000)));
const ratAdd = (a, b) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
const R1 = rat(1n), R0 = rat(0n), sqr = x => rat(BigInt(x) * BigInt(x));
function plantedTuples(rng, form) {
    let tups = [];
    if (form === 'hG') {
        for (let k = 4 + rng.below(4); k > 0; k--) tups.push([ge1(rng), ge1(rng), ge1(rng)]);
        const [a, b, k] = tups[0];
        tups.push([a, k, b]);
        const z1 = ge1(rng), z2 = ge1(rng);
        tups.push([z1, z1, R1], [z2, z2, R1]);
    } else if (form === 'hDep') {
        for (let k = 4 + rng.below(4); k > 0; k--) tups.push([ge1(rng), ge1(rng)]);
        const z1 = ge1(rng), z2 = ge1(rng);
        tups.push([z1, z1], [z2, z2]);
    } else if (form === 'fG') {
        for (let k = 4 + rng.below(4); k > 0; k--) tups.push([ge0(rng), ge0(rng), ge0(rng)]);
        const [a, b, c] = tups[0];
        tups.push([a, c, b]);
        const p = rng.below(50), r = rng.below(50), s = rng.below(50), t = 1 + rng.below(5);
        tups.push([sqr(p), sqr(r), sqr(s)], [sqr(p + t), sqr(r + t), sqr(s)]);
    } else {
        for (let k = 4 + rng.below(4); k > 0; k--) tups.push([ge0(rng), ge0(rng)]);
        const p = rng.below(50), r = rng.below(50), t = 1 + rng.below(5), a1 = ge0(rng), a2 = ge0(rng);
        tups.push([sqr(p), sqr(r)], [sqr(p + t), sqr(r + t)], [a1, a1], [a2, a2]);
    }
    tups.push(tups[1]);
    for (let k = 0; k < 3; k++) {
        const e = NEAR[rng.below(NEAR.length)], base = tups[rng.below(tups.length)];
        tups.push([ratAdd(base[0], rat(1n, 10n ** BigInt(e))), ...base.slice(1)]);
    }
    return tups;
}
function chainedTuples(form) {
    if (form === 'hDep') { const eps = rat(1125n, 10n ** 233n); return [0n, 1n, 2n].map(k => [ratAdd(rat(5n, 4n), rat(k * eps.n, eps.d)), R1]); }
    const delta = rat(15n, 10n ** 231n);
    return [0n, 1n, 2n].map(k => { const x = ratAdd(R1, rat(k * delta.n, delta.d)); return [rat(x.n * x.n, x.d * x.d), R0]; });
}
function tracePlantedCase(i, rng, out) {
    out.push(`${i} case planted`);
    for (const form of FORMS) {
        const tups = plantedTuples(rng, form), vals = tups.map(t => valOf(form, t));
        tups.forEach((t, j) => out.push(`${i} tuple ${form} ${j} ${tq(t)}`));
        const cert = new Certifier(), best = cert.phi(vals);
        out.push(`${i} phi ${form} ${best} ${cert.nTies} ${cert.recomputed}`);
        const r = codeFile('pair', vals.map((_, j) => j), vals, 'cert', cert), f = r.info;
        out.push(`${i} list ${form} ${r.codes.join(',')} ${f.classes} ${f.distinct} ${f.recomputed} ${f.tie_classes} ${f.tie_tuples} ${cert.recomputed} ${sideSha(r.side)}`);
    }
    for (const form of ['hDep', 'fDep']) {
        const vals = chainedTuples(form).map(t => valOf(form, t));
        let raised = false;
        try { new Certifier().tieClasses(vals); } catch (e) { if (e instanceof ChainedTieError) raised = true; else throw e; }
        out.push(`${i} chained ${form} ${vals.length} ${raised ? 'raised' : 'not-raised'}`);
    }
}
function drawText(rng, n) { let s = ''; for (let k = 0; k < n; k++) s += ALPHA[rng.below(ALPHA.length)]; return s; }
function traceInputsCase(i, rng, out) {
    out.push(`${i} case inputs`);
    for (let k = 0; k < 8; k++) { const lemma = drawText(rng, 1 + rng.below(12)).split(' ').join('_'); out.push(`${i} k3 ${lemma} ${k3Word(lemma).join('')}`); }
    for (let k = 0; k < 6; k++) { const s = drawText(rng, 1 + rng.below(16)); out.push(`${i} ns ${LC.hex(LC.utf8(s))} ${N_S(s)}`); }
    const words = traceTreeWords(rng, 8 + rng.below(5)), t = h3Table(words), offsets = [...words.keys()].sort();
    const P = rng.shuffle(offsets.map((_, j) => j)), moved = sfullTable(t, offsets, P);
    out.push(`${i} perm ${P.join(',')}`);
    for (const k of offsets) out.push(`${i} sfull ${k} ${ratStr(moved.x0(k))}`);
    const index = new Map();
    for (let k = 30 + rng.below(30); k > 0; k--) {
        const lemma = asciiLower(drawText(rng, 1 + rng.below(6)).split(' ').join('_'));
        index.set(lemma, { offsets: Array.from({ length: 1 + rng.below(12) }, (_, j) => String(j).padStart(8, '0')) });
    }
    const wm = wMap(index, TRACE_SEED + i, null);
    for (const lemma of [...index.keys()].sort()) out.push(`${i} wmap ${lemma} ${wm.get(lemma)}`);
    const n = 12 + rng.below(10), parents = new Map([['v00', []]]);
    for (let j = 1; j < n; j++) {
        const p1 = rng.below(j), ps = ['v' + pad2(p1)];
        if (rng.below(3) === 0) { const p2 = rng.below(j); if (p2 !== p1) ps.push('v' + pad2(p2)); }
        parents.set('v' + pad2(j), ps);
    }
    const g = new WNGraph(parents, 'v00');
    for (let k = 0; k < 10; k++) { const s = 'v' + pad2(rng.below(n)), u = 'v' + pad2(rng.below(n)); out.push(`${i} wn ${s} ${u} ${g.g(s, u)} ${g.sym(s, u)} ${g.dep(s, u)}`); }
    for (let k = 0; k < 6; k++) {
        const dim = 3 + rng.below(4), vx = [], vy = [];
        for (const vec of [vx, vy]) for (let c = 0; c < dim; c++) {
            let s = (rng.below(2) ? '-' : '') + String(1 + rng.below(99));
            const nd = rng.below(8);
            if (nd) { s += '.'; for (let q = 0; q < nd; q++) s += String(rng.below(10)); }
            if (rng.below(3) === 0) s += 'e' + String(rng.below(7) - 3);
            vec.push(s);
        }
        out.push(`${i} glove ${vx.join(',')} ${vy.join(',')} ${ratStr(cosKey(gloveVector(vx), gloveVector(vy)))}`);
    }
}
// every line of stage2_v1.txt; with cases, the header and those cases' lines only
function stage2TraceLines(cases = null) {
    const out = TRACE_HEAD.slice();
    for (let i = 0; i < 18; i++) {
        if (cases && !cases.includes(i)) continue;
        const rng = new C.Rng(TRACE_SEED + i);
        if (i < 8) traceTreeCase(i, rng, out);
        else if (i < 12) traceLearnedCase(i, rng, out);
        else if (i < 16) tracePlantedCase(i, rng, out);
        else traceInputsCase(i, rng, out);
    }
    return out;
}

return {
    version: 'lexicon-stage2-1',
    // exact arithmetic
    rat, ratStr, ratCmp, ratNeg, tupKey, isqrt, T120, T240, sqrtFp, eFp, withPrecision, precision: () => ({ FP, W_H, GUARD }),
    // certified values, the comparison, tie classes (A13.6)
    FORMS, Val, valOf, within, Certifier, ChainedTieError, PrecisionError, codesFromKeys, ratMax,
    // tables and arms (A13.4)
    O, FOUR32, HTable, LTable, FTable, ETable, h3Table, h2Table, flatTable, k3Word, k3Table, labelPermutation, sfullTable,
    lorentzTable, euclidTable, W_STRATA_NOUN, wStrata, wMap, cpCmp, WNGraph, nounGraph,
    // scores (A13.5) and code files (A13.8)
    Scorer, WNScorer, pairValue, vtypeOf, scoreList, codeFile, sideProjection,
    // words, senses, readers (A13.2, A13.3)
    N_S, senses, inVocab, selectRows, rowsSha, textSha, dataLines, READERS, hitNames, atNodes, gloveVector, gloveLine, cosKey,
    // the trace (reference/traces/stage2_v1.txt, Rng(8000 + i))
    TRACE_HEAD, stage2TraceLines,
};
});
