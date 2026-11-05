// Spike S2: the exact H^2 tree. Hyperbolic Lexicon, Phase 0. A measurement; it decides no claim.
//   node "Pages/Hyperbolic Lexicon/spikes/s2_h2_exact_tree.cjs" > "Pages/Hyperbolic Lexicon/spikes/s2_h2_exact_tree_output.txt"
// (run from the repository root; the requires are relative to this file, so any working directory works)
//
// WHAT IT MEASURES. The exact H^2 tree of the design (architecture section E) is built here, on HPCore's Q and its
// X matrix helpers alone; hyperbolic_core.js is not modified. Points lie on the hyperboloid x0^2 - x1^2 - x2^2 = 1 in
// R^{2,1}. The root's six children take the directions (1,0), (3/5,4/5), (3/5,-4/5), (-7/25,24/25), (-7/25,-24/25),
// (-1,0), assigned to generators 0..5 in that order (P.children([]) = [0..5]). Every later node's children
// P.children(w)[k], k = 0..4, take the local directions (1,0), (3/5,4/5), (3/5,-4/5), (-7/25,24/25), (-7/25,-24/25);
// back is (-1,0). A step is R(u)B(t): the rotation taking (1,0) to u, then the boost along x with
// cosh = (1+t^2)/(1-t^2), sinh = 2t/(1-t^2). With t = (m-1)/(m+1), cosh + sinh = m exactly, so tau = ln m.
// Frames compose by matrix product (X.matmul, left to right) and a point is the frame applied to (1,0,0).
// Exact greedy decoding moves the point into the current frame with the exact Lorentz inverse J M^T J and picks the
// allowed child direction with the largest exact dot product with the spatial part (ties to the lower index; ties
// are counted and reported). For m in {3, 5, 7, 12, 19, 20} it measures:
//   1. exact greedy decodability at depths 2, 4, 6, 8, 10, 12, 16, 20, 24, 28: 500 random reduced words per depth at
//      every depth (the cost allows the full count), the same words for every m;
//   2. the sheet identity x0^2 - x1^2 - x2^2 = 1 (and x0 > 0), checked exactly on every H^2 point computed;
//   3. bits: max numerator and denominator bits per coordinate (lowest terms) by depth for random words, and at
//      depth 28 for random, straight and all-106-degree words, with the H^3 tree (decoder3d.js TreeEmbedding3D,
//      t = 3/4, pointExact) side by side, plus the size of the whole point over one common denominator;
//   4. a float64 decode sweep: the same construction in floats (correctly rounded step entries, float frame
//      products, float J M^T J, float argmax), and the exact point rounded once to float64 then float-decoded;
//      decoder3d's own float point/decode for H^3 alongside;
//   5. "~"-marked ms per point.
//   2b. (supplementary, outside the spec's m set; decides nothing) m = 8..11 on the same words; every reduced word of
//      length 1..6 decoded exactly for m = 7..12; the exact half-width of a child's subtree seen from its parent
//      (max |x2|/x1 over all descendants 0..7 levels below, BigInt) against the decision boundary tan = 1/2.
// It also checks t = 11/13 -> cosh = 145/24, sinh = 143/24, tau = ln 12 (D3), and L3's control t = 3/4 (m = 7), and
// replays the planning measurement (Rng(90001): 100 words at depth 12, then 40 at depth 28 from the same stream).
//
// READINGS CHOSEN WHERE THE SPEC IS OPEN (the simplest faithful ones):
//   - random reduced word of length L: root letter Rng.below(6), then P.children(w)[Rng.below(5)] (uniform);
//   - "straight" word: children index 0 at every level, root included (root letter 0, direction (1,0));
//   - "all 106-degree" word, two variants: "106+" = index 3 at every level, root included (root letter 3, then local
//     (-7/25, 24/25) each time, a spiral), and "106+-" = index 3 or 4 at random at every level (500 words);
//   - the H^3 tree has no 106-degree direction; its most-bent analogue is the 90-degree children (index 1..4):
//     "90 fixed" = root letter 0 then index 1 at every level, "90 random" = root Rng.below(6) then 1 + Rng.below(4);
//   - bits: per coordinate in lowest terms (Q normalises), max over the words of a class; "pt" is the whole point as
//     integers over one common denominator (sum of numerator bits + denominator bits), max over the class;
//   - the bit cost ratio is H^2 at t = 11/13 over H^3 at t = 3/4, class against class, at depth 28;
//   - an H^3 exact-decodability row (decoder3d decodeExact on the same words) is added for reference.
// Every H^2 point is computed two ways and compared: the Q frame product, and an independent BigInt path (integer
// step matrices applied right to left to (1,0,0), one reduction at the end).
//
// DATA AND SEEDS. Synthetic reduced words only (no WordNet, no registered instance). Seeds: Rng(90000+depth) random
// words (depth in 2..28; Rng(90001) is the planning replay), Rng(90100+depth) the "106+-" words, Rng(90200+depth) the
// H^3 "90 random" words. Only HPCore.Rng; never Math.random.
// SETTLES (for the preregistration to cite): t = 11/13 for the H^2 tree (D3), L3's control t = 3/4, and the
// H^2/H^3 bit cost ratio. Lines starting with "~ " depend on the machine or runtime and are ignored on reruns.
// RUNTIME: about 70 s on one core (Node 22.23.4); no step needs more than a few seconds.
'use strict';
const C = require('../../Hyperbolic Oracles/hyperbolic_core.js');
const D3 = require('../../Hyperbolic Oracles/decoder3d.js');
const { Q, X, P, Rng } = C;

const T_START = process.hrtime.bigint();
const ms = (a, b) => Number(b - a) / 1e6;
let pass = 0, total = 0;
const check = (label, ok, detail = '') => { total++; if (ok) pass++; console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' · ' + detail : ''}`); };
const q = (n, d = 1) => new Q(BigInt(n), BigInt(d));
const absB = a => (a < 0n ? -a : a);
const bitLen = a => (a === 0n ? 0 : absB(a).toString(2).length);
const gcdB = (a, b) => { a = absB(a); b = absB(b); while (b) [a, b] = [b, a % b]; return a; };
const lcmB = (a, b) => a / gcdB(a, b) * b;
const pad = (s, n) => String(s).padStart(n);
const padR = (s, n) => String(s).padEnd(n);
const fq = x => (x.d === 1n ? `${x.n}` : `${x.n}/${x.d}`);
// a table row: a 17-character label, then right-aligned cells
const row = (label, cells, w) => '  ' + padR(label, 15) + cells.map(c => pad(c, w)).join('');

// ---------------------------------------------------------------- the exact H^2 tree (spike-local, Q only)
const DIRS = [[q(1), q(0)], [q(3, 5), q(4, 5)], [q(3, 5), q(-4, 5)], [q(-7, 25), q(24, 25)], [q(-7, 25), q(-24, 25)], [q(-1), q(0)]];
const DIRS_TXT = ['(1,0)', '(3/5,4/5)', '(3/5,-4/5)', '(-7/25,24/25)', '(-7/25,-24/25)', '(-1,0)'];
const Z = Q.ZERO, O1 = Q.ONE;
class TreeH2Exact {
    constructor(m) {
        this.m = m; this.t = q(m - 1, m + 1);
        const tt = this.t.mul(this.t);
        this.cosh = O1.add(tt).div(O1.sub(tt)); this.sinh = Q.TWO.mul(this.t).div(O1.sub(tt));
        const B = [[this.cosh, this.sinh, Z], [this.sinh, this.cosh, Z], [Z, Z, O1]];
        this.rot = DIRS.map(([u1, u2]) => [[O1, Z, Z], [Z, u1, u2.neg()], [Z, u2, u1]]);
        this.step = this.rot.map(R => X.matmul(R, B));                   // index = root generator, or local k = 0..4
        this.stepInv = this.step.map(X.lorentzInverse);                 // J M^T J
        // the independent integer path: step = S / D with S an integer matrix
        this.intStep = this.step.map(M => {
            const D = M.flat().reduce((a, x) => lcmB(a, x.d), 1n);
            return { D, S: M.map(r => r.map(x => x.n * (D / x.d))) };
        });
        this.stepF = this.step.map(M => M.map(r => r.map(x => x.toNumber())));
        this.stepInvF = this.stepInv.map(M => M.map(r => r.map(x => x.toNumber())));
    }
    static slot(prefix, g) { return prefix.length ? P.children(prefix).indexOf(g) : g; }
    slots(word) { return word.map((g, i) => TreeH2Exact.slot(word.slice(0, i), g)); }
    frame(word) { let M = X.eye(3); for (const s of this.slots(word)) M = X.matmul(M, this.step[s]); return M; }
    point(word) { return this.frame(word).map(r => r[0]); }
    pointInt(word) {                                                    // right to left, BigInt only, one reduction
        let v = [1n, 0n, 0n], D = 1n;
        const sl = this.slots(word);
        for (let i = sl.length - 1; i >= 0; i--) {
            const { S, D: d } = this.intStep[sl[i]];
            v = S.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]); D *= d;
        }
        return { v, D };
    }
    decode(y, L) {
        const word = []; let local = y, ties = 0;
        for (let level = 0; level < L; level++) {
            const allowed = P.children(word), x1 = local[1], x2 = local[2];
            let best = null, bk = -1, bs = -1;
            const scores = allowed.map((g, k) => { const s = word.length ? k : g, d = DIRS[s]; return d[0].mul(x1).add(d[1].mul(x2)); });
            scores.forEach((sc, k) => { if (best === null || sc.cmp(best) > 0) { best = sc; bk = k; } });
            if (scores.filter(sc => sc.cmp(best) === 0).length > 1) ties++;
            const g = allowed[bk]; bs = word.length ? bk : g;
            word.push(g);
            local = X.matvec(this.stepInv[bs], local);
        }
        return { word, ties, last: local };
    }
    pointF(word) {
        let M = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        for (const s of this.slots(word)) { const S = this.stepF[s]; M = M.map(r => [0, 1, 2].map(c => r[0] * S[0][c] + r[1] * S[1][c] + r[2] * S[2][c])); }
        return M.map(r => r[0]);
    }
    decodeF(y, L) {
        const word = []; let local = y;
        for (let level = 0; level < L; level++) {
            const allowed = P.children(word);
            let best = -Infinity, bk = 0;
            allowed.forEach((g, k) => { const d = DIRS_F[word.length ? k : g], sc = d[0] * local[1] + d[1] * local[2]; if (sc > best) { best = sc; bk = k; } });
            const g = allowed[bk], s = word.length ? bk : g, M = this.stepInvF[s];
            word.push(g);
            local = M.map(r => r[0] * local[0] + r[1] * local[1] + r[2] * local[2]);
        }
        return word;
    }
}
const DIRS_F = DIRS.map(d => d.map(x => x.toNumber()));

// ---------------------------------------------------------------- words
const wordFromIdx = idx => { const w = []; for (const k of idx) w.push(w.length ? P.children(w)[k] : k); return w; };
const randomWord = (rng, L) => { const w = [rng.below(6)]; while (w.length < L) w.push(P.children(w)[rng.below(5)]); return w; };
const randomWords = (seed, L, n) => { const rng = new Rng(seed); return Array.from({ length: n }, () => randomWord(rng, L)); };
const fixedWord = (L, root, k) => wordFromIdx(Array.from({ length: L }, (_, i) => (i ? k : root)));
const bent106pm = (seed, L, n) => { const rng = new Rng(seed); return Array.from({ length: n }, () => wordFromIdx(Array.from({ length: L }, () => 3 + rng.below(2)))); };
const bent90rand = (seed, L, n) => { const rng = new Rng(seed); return Array.from({ length: n }, () => wordFromIdx(Array.from({ length: L }, (_, i) => (i ? 1 + rng.below(4) : rng.below(6))))); };
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// ---------------------------------------------------------------- bits
const newBits = n => ({ num: Array(n).fill(0), den: Array(n).fill(0), pt: 0, count: 0 });
function addBits(acc, y) {
    y.forEach((x, i) => { acc.num[i] = Math.max(acc.num[i], bitLen(x.n)); acc.den[i] = Math.max(acc.den[i], bitLen(x.d)); });
    const D = y.reduce((a, x) => lcmB(a, x.d), 1n);
    acc.pt = Math.max(acc.pt, y.reduce((s, x) => s + bitLen(x.n * (D / x.d)), 0) + bitLen(D));
    acc.count++;
    return acc;
}
const maxNum = b => Math.max(...b.num), maxDen = b => Math.max(...b.den);
const nd = b => `${maxNum(b)}/${maxDen(b)}`;
const perCoord = b => b.num.map((n, i) => `x${i} ${n}/${b.den[i]}`).join('  ');

const MS = [3, 5, 7, 12, 19, 20];
const DEPTHS = [2, 4, 6, 8, 10, 12, 16, 20, 24, 28];
const NW = 500;
const trees = new Map(MS.map(m => [m, new TreeH2Exact(m)]));
const E3 = new D3.TreeEmbedding3D();                                  // t = 3/4, the octahedral H^3 tree, unchanged

console.log('S2 · s2_h2_exact_tree · the exact H^2 tree: decodability, sheet identity, bits, float failure');
console.log('settles: t = 11/13 for the H^2 tree (D3), L3\'s control t = 3/4, the H^2/H^3 bit cost ratio; decides no claim');
console.log(`cores, unchanged: hyperbolic_core.js ${C.version} (Q, X, P, Rng), decoder3d.js TreeEmbedding3D (t = ${E3.t})`);
console.log(`~ node ${process.version}`);
console.log('data: synthetic reduced words only; Rng(90000+depth) random words, Rng(90100+depth) 106+- words, Rng(90200+depth) H^3 90-random words, Rng(90001) planning replay');

// ================================================================ 1. construction
console.log('');
console.log('1. Construction, exact');
console.log(`  root directions, generators 0..5: ${DIRS_TXT.join(' ')}`);
console.log(`  local directions, P.children(w)[k], k = 0..4: ${DIRS_TXT.slice(0, 5).join(' ')}; back (-1,0)`);
check('all six directions are unit vectors exactly (3^2 + 4^2 = 5^2, 7^2 + 24^2 = 25^2)', DIRS.every(([a, b]) => a.mul(a).add(b.mul(b)).eq(O1)));
const cosAt = (i, j) => DIRS[i][0].mul(DIRS[j][0]).add(DIRS[i][1].mul(DIRS[j][1]));
const deg = c => (Math.acos(c.toNumber()) * 180 / Math.PI).toFixed(2);
console.log(`  cosines between directions: (1,0)~(3/5,4/5) ${cosAt(0, 1)}, (3/5,4/5)~(-7/25,24/25) ${cosAt(1, 3)}, (-7/25,24/25)~(-1,0) ${cosAt(3, 5)}, (-7/25,24/25)~(-7/25,-24/25) ${cosAt(3, 4)}`);
console.log(`  so the angles are 0, +-${deg(cosAt(0, 1))}, +-${deg(cosAt(0, 3))} (the "106-degree" pair), 180 degrees; the gap from 106 to back is ${deg(cosAt(3, 5))}`);
console.log('    m  t        cosh       sinh       cosh+sinh   tau = ln m');
for (const m of MS) {
    const T = trees.get(m);
    console.log(`  ${pad(m, 3)}  ${padR(fq(T.t), 7)}  ${padR(fq(T.cosh), 9)}  ${padR(fq(T.sinh), 9)}  ${padR(fq(T.cosh.add(T.sinh)), 10)}  ${Math.log(m).toFixed(4)}`);
}
check('for every m: cosh^2 - sinh^2 = 1 and cosh + sinh = m exactly (so e^tau = m, tau = ln m), and X.coshSinh(t) agrees',
    MS.every(m => { const T = trees.get(m), [c, s] = X.coshSinh(T.t); return T.cosh.mul(T.cosh).sub(T.sinh.mul(T.sinh)).eq(O1) && T.cosh.add(T.sinh).eq(q(m)) && c.eq(T.cosh) && s.eq(T.sinh); }));
check('for every m: cosh = (m^2+1)/(2m), sinh = (m^2-1)/(2m)', MS.every(m => { const T = trees.get(m); return T.cosh.eq(q(m * m + 1, 2 * m)) && T.sinh.eq(q(m * m - 1, 2 * m)); }));
check('every rotation R(u) is orthogonal and takes (1,0) to u; every step R(u)B(t) is Lorentz (M^T J M = J); J M^T J times M is I',
    MS.every(m => { const T = trees.get(m); return T.rot.every((R, i) => X.isOrthogonal(R) && R[1][1].eq(DIRS[i][0]) && R[2][1].eq(DIRS[i][1])) && T.step.every(X.isLorentz) && T.step.every((M, i) => X.isIdentity(X.matmul(T.stepInv[i], M)) && X.isIdentity(X.matmul(M, T.stepInv[i]))); }),
    `${MS.length * 6} step matrices`);
{
    const T = trees.get(12);
    check('D3: t = 11/13 gives cosh = 145/24, sinh = 143/24, cosh + sinh = 12, tau = ln 12 = 2.4849',
        T.t.eq(q(11, 13)) && T.cosh.eq(q(145, 24)) && T.sinh.eq(q(143, 24)) && T.cosh.add(T.sinh).eq(q(12)) && Math.log(12).toFixed(4) === '2.4849' && (2 * Math.atanh(11 / 13)).toFixed(4) === '2.4849');
    const T7 = trees.get(7);
    check('L3\'s control: t = 3/4 (m = 7) gives cosh = 25/7, sinh = 24/7, tau = ln 7 = 1.9459, the H^3 tree\'s own boost',
        T7.t.eq(q(3, 4)) && T7.cosh.eq(q(25, 7)) && T7.sinh.eq(q(24, 7)) && E3.cosh.eq(T7.cosh) && E3.sinh.eq(T7.sinh) && Math.log(7).toFixed(4) === '1.9459');
    const D12 = T.intStep.map(s => s.D).join(', ');
    console.log(`  integer form of the m = 12 steps (index 0..5): common denominators ${D12} (boost 24 times rotation 1, 5 or 25)`);
}

// ================================================================ 2. decodability, sheet, two-way agreement, floats
// one pass over the 500 words of every depth; everything per (m, depth) is recorded here and printed below
const res = {};                                                       // res[m][L] = {ok, ties, endsAtOrigin, fOk, efOk, firstWrong:[]}
const res3 = {};                                                      // H^3 on the same words
const bitsRand = {};                                                  // bitsRand[m][L]
const bitsRand3 = {};
let sheetChecked = 0, sheetOk = 0, twoWayOk = 0, twoWayChecked = 0, intSheetOk = 0, sheet3Ok = 0, sheet3Checked = 0;
const timing = { h2Point: {}, h2Decode: {}, h2PointF: {}, h3Point: 0, h3Decode: 0 };
const wordsAt = {};
for (const L of DEPTHS) wordsAt[L] = randomWords(90000 + L, L, NW);
for (const m of MS) { res[m] = {}; bitsRand[m] = {}; }
for (const L of DEPTHS) {
    const words = wordsAt[L];
    for (const m of MS) {
        const T = trees.get(m), r = { ok: 0, ties: 0, endsAtOrigin: 0, fOk: 0, efOk: 0, firstWrong: [] }, b = newBits(3);
        let tp = 0n, td = 0n, tf = 0n;
        for (const w of words) {
            const a0 = process.hrtime.bigint();
            const y = T.point(w);
            const a1 = process.hrtime.bigint();
            const dec = T.decode(y, L);
            const a2 = process.hrtime.bigint();
            const yf = T.pointF(w);
            const a3 = process.hrtime.bigint();
            tp += a1 - a0; td += a2 - a1; tf += a3 - a2;
            // sheet identity, exactly
            sheetChecked++;
            if (y[0].mul(y[0]).sub(y[1].mul(y[1])).sub(y[2].mul(y[2])).eq(O1) && y[0].sign() > 0) sheetOk++;
            // the second way: BigInt integers, right to left
            const { v, D } = T.pointInt(w);
            twoWayChecked++;
            if (v.every((n, i) => new Q(n, D).eq(y[i]))) twoWayOk++;
            if (v[0] * v[0] - v[1] * v[1] - v[2] * v[2] === D * D) intSheetOk++;
            addBits(b, y);
            r.ties += dec.ties;
            if (same(dec.word, w)) {
                r.ok++;
                if (dec.last[0].eq(O1) && dec.last[1].isZero() && dec.last[2].isZero()) r.endsAtOrigin++;
            } else {
                let k = 0; while (dec.word[k] === w[k]) k++;
                r.firstWrong.push(k);
            }
            if (same(T.decodeF(yf, L), w)) r.fOk++;
            if (same(T.decodeF(y.map(x => x.toNumber()), L), w)) r.efOk++;
        }
        res[m][L] = r; bitsRand[m][L] = b;
        if (L === 28) { timing.h2Point[m] = Number(tp) / 1e6 / NW; timing.h2Decode[m] = Number(td) / 1e6 / NW; timing.h2PointF[m] = Number(tf) / 1e6 / NW; }
    }
    // H^3 on the same words
    const r3 = { ok: 0, fOk: 0, efOk: 0 }, b3 = newBits(4);
    let tp = 0n, td = 0n;
    for (const w of words) {
        const a0 = process.hrtime.bigint();
        const y = E3.pointExact(w);
        const a1 = process.hrtime.bigint();
        const d = E3.decodeExact(y, L);
        const a2 = process.hrtime.bigint();
        tp += a1 - a0; td += a2 - a1;
        sheet3Checked++;
        if (X.onSheet(y)) sheet3Ok++;
        addBits(b3, y);
        if (same(d, w)) r3.ok++;
        if (same(E3.decode(E3.point(w), L), w)) r3.fOk++;
        if (same(E3.decode(y.map(x => x.toNumber()), L), w)) r3.efOk++;
    }
    res3[L] = r3; bitsRand3[L] = b3;
    if (L === 28) { timing.h3Point = Number(tp) / 1e6 / NW; timing.h3Decode = Number(td) / 1e6 / NW; }
}

console.log('');
console.log(`2. Exact greedy decodability: successes / ${NW} random reduced words per depth, Rng(90000+depth), the same words for every m`);
const mLabel = m => `m=${padR(m, 3)}t=${fq(trees.get(m).t)}`;
console.log(row('depth', DEPTHS, 5));
for (const m of MS) console.log(row(mLabel(m), DEPTHS.map(L => res[m][L].ok), 5));
console.log(row('H^3 t=3/4', DEPTHS.map(L => res3[L].ok), 5) + '   (decoder3d decodeExact, octahedral tree)');
const tiesTotal = MS.reduce((s, m) => s + DEPTHS.reduce((t, L) => t + res[m][L].ties, 0), 0);
const decisions = MS.length * NW * DEPTHS.reduce((s, L) => s + L, 0);
console.log(`  exact ties among the best-scoring children: ${tiesTotal} in ${decisions} greedy decisions` + (tiesTotal ? ' · per m: ' + MS.map(m => `${m}: ${DEPTHS.reduce((t, L) => t + res[m][L].ties, 0)}`).join(', ') : ' (none happened)'));
check(`sheet identity x0^2 - x1^2 - x2^2 = 1 with x0 > 0, exactly in Q, on every H^2 point`, sheetOk === sheetChecked, `${sheetOk}/${sheetChecked}`);
check('every H^2 point computed two ways agrees: Q frame product (X.matmul, left to right) and BigInt integer steps (right to left, one reduction)', twoWayOk === twoWayChecked, `${twoWayOk}/${twoWayChecked}`);
check('the integer form satisfies N0^2 - N1^2 - N2^2 = D^2 on every point', intSheetOk === twoWayChecked, `${intSheetOk}/${twoWayChecked}`);
const okAll = MS.reduce((s, m) => s + DEPTHS.reduce((t, L) => t + res[m][L].ok, 0), 0), endAll = MS.reduce((s, m) => s + DEPTHS.reduce((t, L) => t + res[m][L].endsAtOrigin, 0), 0);
check('every successful exact decode ends exactly at (1,0,0) in the leaf\'s frame', endAll === okAll, `${endAll}/${okAll}`);
check('sheet identity on every H^3 point (X.onSheet)', sheet3Ok === sheet3Checked, `${sheet3Ok}/${sheet3Checked}`);
console.log('  first wrong level (0 = root letter) among the failing words at depth 28:');
for (const m of MS) {
    const fw = res[m][28].firstWrong;
    if (!fw.length) { console.log(`    m=${m}: no failures`); continue; }
    const hist = {}; fw.forEach(k => { hist[k] = (hist[k] || 0) + 1; });
    console.log(`    m=${m}: ${fw.length} failures · ` + Object.keys(hist).map(Number).sort((a, b) => a - b).map(k => `${k}:${hist[k]}`).join(' '));
}
// the planning replay, same generator, same protocol
{
    const rep = {};
    for (const m of [7, 12]) {
        const T = trees.get(m), rng = new Rng(90001);
        let a = 0, b = 0;
        for (let i = 0; i < 100; i++) { const w = randomWord(rng, 12); if (same(T.decode(T.point(w), 12).word, w)) a++; }
        for (let i = 0; i < 40; i++) { const w = randomWord(rng, 28); if (same(T.decode(T.point(w), 28).word, w)) b++; }
        rep[m] = [a, b];
    }
    console.log(`  planning replay, Rng(90001): 100 words at depth 12 then 40 at depth 28 from the same stream: t = 11/13 ${rep[12][0]}/100 and ${rep[12][1]}/40; t = 3/4 ${rep[7][0]}/100 and ${rep[7][1]}/40`);
    check('the replay reproduces the planning figures (100/100 and 40/40 at t = 11/13, 48/100 at t = 3/4)', rep[12][0] === 100 && rep[12][1] === 40 && rep[7][0] === 48);
}
const r7 = res[7][12].ok, r12 = res[12][12].ok;
check(`L3's control: t = 3/4 decodes noticeably worse than t = 11/13 at depth 12`, r7 < r12 && r12 === NW, `${r7}/${NW} against ${r12}/${NW}`);
const allDepthsPerfect = m => DEPTHS.every(L => res[m][L].ok === NW);
console.log(`  m with ${NW}/${NW} at every depth 2..28: ${MS.filter(allDepthsPerfect).join(', ') || 'none'}; the smallest such m among {${MS.join(', ')}}: ${MS.find(allDepthsPerfect) ?? 'none'}`);
// ---------------------------------------------------------------- 2b. supplementary: where the threshold lies
// m outside the spec's set, the same words; an exhaustive check of every short word; and the exact half-width of a
// child's subtree as seen from its parent against the decision boundary. Every child's subtree is a rotated copy of
// the straight child's (every non-root frame has the same five local steps), neighbouring child directions are
// 53.13 degrees apart (73.74 at the root's back gap), and the greedy rule prefers (1,0) to (3/5,4/5) exactly when
// |x2|/x1 < 1/2 (tan 26.565 = 1/2), so decoding is safe while a subtree's half-width stays below the bisector.
console.log('');
console.log('  2b. Supplementary: where the decodability threshold lies (m outside the spec\'s set included; it decides nothing)');
const SUP_M = [8, 9, 10, 11], supTrees = new Map(SUP_M.map(m => [m, new TreeH2Exact(m)])), sup = {}, bitsSup = {};
let supSheet = 0, supN = 0;
const supLabel = m => `m=${padR(m, 3)}t=${fq(supTrees.get(m).t)}`;
for (const m of SUP_M) {
    const T = supTrees.get(m); sup[m] = {};
    for (const L of DEPTHS) {
        let ok = 0; const b = newBits(3);
        for (const w of wordsAt[L]) {
            const y = T.point(w); supN++;
            if (y[0].mul(y[0]).sub(y[1].mul(y[1])).sub(y[2].mul(y[2])).eq(O1) && y[0].sign() > 0) supSheet++;
            if (L === 28) addBits(b, y);
            if (same(T.decode(y, L).word, w)) ok++;
        }
        sup[m][L] = ok;
        if (L === 28) bitsSup[m] = b;
    }
}
console.log(`  the same ${NW} words per depth (section 2):`);
console.log(row('depth', DEPTHS, 5));
for (const m of SUP_M) console.log(row(supLabel(m), DEPTHS.map(L => sup[m][L]), 5));
check('sheet identity on every supplementary point', supSheet === supN, `${supSheet}/${supN}`);
// every reduced word of length 1..6, frames grown incrementally by X.matmul
const EXH = 6, EXH_M = [7, 8, 9, 10, 11, 12], exh = {};
for (const m of EXH_M) {
    const T = trees.get(m) || supTrees.get(m);
    let n = 0, ok = 0;
    const rec = (w, M) => {
        if (w.length) { n++; if (same(T.decode(M.map(r => r[0]), w.length).word, w)) ok++; }
        if (w.length === EXH) return;
        P.children(w).forEach((g, k) => rec([...w, g], X.matmul(M, T.step[w.length ? k : g])));
    };
    rec([], X.eye(3));
    exh[m] = [ok, n];
}
console.log(`  exhaustive, every reduced word of length 1..${EXH} (${exh[12][1]} words): ` + EXH_M.map(m => `m=${m} ${exh[m][0]}`).join(' · '));
// the exact half-width: max |x2|/x1 over every descendant down to HW levels below the straight child, seen from its
// parent, by BigInt integer frames (the positive common denominator cancels in the ratio)
const HW = 7, HW_M = [3, 5, 7, 8, 9, 10, 11, 12, 19, 20], hw = {};
for (const m of HW_M) {
    const T = trees.get(m) || supTrees.get(m), S = T.intStep.map(s => s.S);
    const mul = (A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
    const byLevel = Array.from({ length: HW + 1 }, () => ({ a: 0n, b: 1n, wrap: false }));
    let beyond = 0, onBisector = 0, nodes = 0;
    const visit = (M, lvl) => {
        nodes++;
        const x1 = M[1][0], x2 = absB(M[2][0]), best = byLevel[lvl];
        if (x1 <= 0n) best.wrap = true;
        else if (x2 * best.b > best.a * x1) { best.a = x2; best.b = x1; }
        if (x1 <= 0n || 2n * x2 > x1) beyond++; else if (2n * x2 === x1) onBisector++;
        if (lvl < HW) for (let k = 0; k < 5; k++) visit(mul(M, S[k]), lvl + 1);
    };
    visit(S[0], 0);
    // running maximum over levels 0..d
    const run = []; let a = 0n, b = 1n, wrap = false;
    for (const lv of byLevel) { wrap = wrap || lv.wrap; if (lv.a * b > a * lv.b) { a = lv.a; b = lv.b; } run.push({ a, b, wrap }); }
    hw[m] = { run, beyond, onBisector, nodes };
}
const degOf = r => (r.wrap ? '>=90' : (Math.atan(new Q(r.a, r.b).toNumber()) * 180 / Math.PI).toFixed(2));
console.log(`  half-width of a child's subtree seen from its parent, max over descendants 0..d levels below the child (degrees; the bisector is 26.57 = atan 1/2):`);
console.log(row('levels below', Array.from({ length: HW + 1 }, (_, d) => d), 7) + '   beyond the bisector (of the nodes)');
for (const m of HW_M) {
    const h = hw[m];
    console.log(row(`m=${padR(m, 3)}t=${fq(q(m - 1, m + 1))}`, h.run.map(degOf), 7) + `   ${h.beyond} of ${h.nodes}${h.onBisector ? `, ${h.onBisector} exactly on it` : ''}`);
}
const exactBelow = m => !hw[m].run[HW].wrap && 2n * hw[m].run[HW].a < hw[m].run[HW].b;
console.log(`  exactly below the bisector at ${HW} levels (2|x2| < x1 for every descendant): ${HW_M.filter(exactBelow).join(', ')}; beyond it (an exact witness of a failing word exists): ${HW_M.filter(m => !exactBelow(m)).join(', ')}`);
const margin = m => (26.565051177 - Math.atan(new Q(hw[m].run[HW].a, hw[m].run[HW].b).toNumber()) * 180 / Math.PI).toFixed(2);
console.log(`  margin to the bisector at ${HW} levels (a lower bound on the half-width, so an upper bound on the margin): ` + HW_M.filter(exactBelow).map(m => `m=${m} ${margin(m)}`).join(' · ') + ' degrees');
check('the half-width analysis agrees with sampling: every m whose subtree crosses the bisector fails some sampled or exhaustive word, and every m that stays below decodes all of them',
    HW_M.every(m => {
        const sampledAll = MS.includes(m) ? allDepthsPerfect(m) : SUP_M.includes(m) ? DEPTHS.every(L => sup[m][L] === NW) : null;
        const exhAll = exh[m] ? exh[m][0] === exh[m][1] : null;
        const allOk = (sampledAll === null || sampledAll) && (exhAll === null || exhAll);
        return exactBelow(m) === allOk;
    }));

// ================================================================ 3. bits
console.log('');
console.log('3. Bits: max numerator / max denominator bits over the coordinates, each coordinate in lowest terms');
console.log('  3a. random words by depth (the words of section 2)');
console.log(row('depth', DEPTHS, 9));
for (const m of MS) console.log(row(mLabel(m), DEPTHS.map(L => nd(bitsRand[m][L])), 9));
console.log(row('H^3 t=3/4', DEPTHS.map(L => nd(bitsRand3[L])), 9));
console.log('  supplementary m at depth 28, the same random words, per coordinate: ' + SUP_M.map(m => `m=${m} (t=${fq(supTrees.get(m).t)}) ${nd(bitsSup[m])}`).join(' · '));

// depth 28, every class, per coordinate
const L28 = 28;
const cls2 = (m) => {
    const T = trees.get(m);
    const out = { random: bitsRand[m][L28], straight: newBits(3), b106: newBits(3), b106pm: newBits(3) };
    let sheet = true;
    const add = (acc, w) => { const y = T.point(w); sheet = sheet && y[0].mul(y[0]).sub(y[1].mul(y[1])).sub(y[2].mul(y[2])).eq(O1); addBits(acc, y); };
    add(out.straight, fixedWord(L28, 0, 0));
    add(out.b106, fixedWord(L28, 3, 3));
    for (const w of bent106pm(90100 + L28, L28, NW)) add(out.b106pm, w);
    return { out, sheet };
};
const cls3 = () => {
    const out = { random: bitsRand3[L28], straight: newBits(4), b90: newBits(4), b90r: newBits(4) };
    let sheet = true;
    const add = (acc, w) => { const y = E3.pointExact(w); sheet = sheet && X.onSheet(y); addBits(acc, y); };
    add(out.straight, fixedWord(L28, 0, 0));
    add(out.b90, fixedWord(L28, 0, 1));
    for (const w of bent90rand(90200 + L28, L28, NW)) add(out.b90r, w);
    return { out, sheet };
};
console.log('  3b. depth 28, per coordinate (numerator/denominator bits), and pt = the whole point over one common denominator');
const B28 = {};
let sheet28 = true;
for (const m of MS) {
    const { out, sheet } = cls2(m); B28[m] = out; sheet28 = sheet28 && sheet;
    const rows = [['random (500)', out.random], ['straight (1)', out.straight], ['106+ (1)', out.b106], ['106+- (500)', out.b106pm]];
    rows.forEach(([name, b], i) => console.log(`  ${padR(i ? '' : `m=${m}`, 6)}${padR(name, 17)}${perCoord(b)}   pt ${b.pt}`));
}
const H3_28 = cls3();
[['random (500)', H3_28.out.random], ['straight (1)', H3_28.out.straight], ['90 fixed (1)', H3_28.out.b90], ['90 random (500)', H3_28.out.b90r]]
    .forEach(([name, b], i) => console.log(`  ${padR(i ? '' : 'H^3', 6)}${padR(name, 17)}${perCoord(b)}   pt ${b.pt}`));
check('sheet identity on every depth-28 class point (H^2 all m, and H^3)', sheet28 && H3_28.sheet);
{
    // the closed forms of the straight words: x0 = cosh(28 tau) = (m^56 + 1) / (2 m^28)
    const okStraight = MS.every(m => trees.get(m).point(fixedWord(L28, 0, 0))[0].eq(new Q(BigInt(m) ** 56n + 1n, 2n * BigInt(m) ** 28n)))
        && E3.pointExact(fixedWord(L28, 0, 0))[0].eq(new Q(7n ** 56n + 1n, 2n * 7n ** 28n));
    check('straight words recomputed in closed form: x0 = (m^56 + 1)/(2 m^28) for every m, and (7^56 + 1)/(2 7^28) in H^3', okStraight);
}
console.log('  3c. by depth for m = 12 and H^3: max numerator / max denominator bits per class');
console.log('  depth   ' + ['H2 random', 'H2 straight', 'H2 106+', 'H2 106+-', 'H3 random', 'H3 straight', 'H3 90 fixed', 'H3 90 rand'].map(s => pad(s, 12)).join(''));
const T12 = trees.get(12);
for (const L of DEPTHS) {
    const s2 = addBits(newBits(3), T12.point(fixedWord(L, 0, 0))), f2 = addBits(newBits(3), T12.point(fixedWord(L, 3, 3))), pm2 = newBits(3);
    for (const w of bent106pm(90100 + L, L, NW)) addBits(pm2, T12.point(w));
    const s3 = addBits(newBits(4), E3.pointExact(fixedWord(L, 0, 0))), f3 = addBits(newBits(4), E3.pointExact(fixedWord(L, 0, 1))), r3 = newBits(4);
    for (const w of bent90rand(90200 + L, L, NW)) addBits(r3, E3.pointExact(w));
    console.log(`  ${pad(L, 5)}   ` + [bitsRand[12][L], s2, f2, pm2, bitsRand3[L], s3, f3, r3].map(b => pad(nd(b), 12)).join(''));
}
console.log('  3d. the bit cost ratio at depth 28, H^2 over H^3 (t = 3/4), class against class: numerator, denominator, pt');
const pairs = [['random', 'random', 'random'], ['straight', 'straight', 'straight'], ['106+ / 90 fixed', 'b106', 'b90'], ['106+- / 90 random', 'b106pm', 'b90r']];
const ratio = (a, b) => (a / b).toFixed(2);
const ratios12 = [];
for (const m of [12, 7]) {
    console.log(`  H^2 m = ${m} (t = ${trees.get(m).t})${m === 7 ? ', the same boost as H^3: the cost of the rotation denominators alone' : ', the D3 choice'}:`);
    for (const [name, k2, k3] of pairs) {
        const a = B28[m][k2], b = H3_28.out[k3];
        const rn = maxNum(a) / maxNum(b), rd = maxDen(a) / maxDen(b), rp = a.pt / b.pt;
        if (m === 12) ratios12.push(rn, rd);
        console.log(`    ${padR(name, 19)} ${nd(a)} vs ${nd(b)}: ${ratio(maxNum(a), maxNum(b))}x, ${ratio(maxDen(a), maxDen(b))}x · pt ${a.pt} vs ${b.pt}: ${ratio(a.pt, b.pt)}x`);
    }
}
const rMin = Math.min(...ratios12).toFixed(2), rMax = Math.max(...ratios12).toFixed(2);
const w12n = Math.max(...Object.values(B28[12]).map(maxNum)), w12d = Math.max(...Object.values(B28[12]).map(maxDen));
const w3n = Math.max(...Object.values(H3_28.out).map(maxNum)), w3d = Math.max(...Object.values(H3_28.out).map(maxDen));
console.log(`  range of the per-coordinate ratios at t = 11/13 over the four classes: ${rMin}x .. ${rMax}x`);
console.log(`  worst over all classes at depth 28: H^2 t = 11/13 ${w12n}/${w12d} bits, H^3 ${w3n}/${w3d} bits (${ratio(w12n, w3n)}x, ${ratio(w12d, w3d)}x)`);

// ================================================================ 4. float64
console.log('');
console.log(`4. Float64 decoding: successes / ${NW}, the words of section 2`);
console.log('   float = the same construction in floats (correctly rounded step entries, float frame products, float J M^T J, float argmax)');
console.log('   exact>f = the exact point rounded once to float64, then the float decoder');
console.log(row('depth', DEPTHS, 5));
for (const m of MS) {
    console.log(row(`m=${padR(m, 3)}float`, DEPTHS.map(L => res[m][L].fOk), 5));
    console.log(row('     exact>f', DEPTHS.map(L => res[m][L].efOk), 5));
}
console.log(row('H^3  float', DEPTHS.map(L => res3[L].fOk), 5) + '   (decoder3d point/decode)');
console.log(row('     exact>f', DEPTHS.map(L => res3[L].efOk), 5));
const lastPerfect = arr => { let last = null; for (const L of DEPTHS) { if (arr(L) === NW) last = L; else break; } return last; };
const firstZero = arr => DEPTHS.find(L => arr(L) === 0) ?? 'none';
console.log(`  float (same construction): last depth of an unbroken ${NW}/${NW} run from depth 2, first depth at 0/${NW}, first depth where float falls below exact (on this depth grid):`);
for (const m of MS) {
    const lf = lastPerfect(L => res[m][L].fOk), fz = firstZero(L => res[m][L].fOk);
    const losses = DEPTHS.filter(L => res[m][L].fOk < res[m][L].ok);
    console.log(`    m=${padR(m, 3)} last 500/500 at ${lf ?? 'none'} · first 0/500 at ${fz} · float below exact from depth ${losses.length ? losses[0] : 'none'} (tau x depth there = ${losses.length ? (Math.log(m) * losses[0]).toFixed(1) : '-'})`);
}
{
    const lf = lastPerfect(L => res3[L].fOk), fz = firstZero(L => res3[L].fOk), losses = DEPTHS.filter(L => res3[L].fOk < res3[L].ok);
    console.log(`    H^3    last 500/500 at ${lf ?? 'none'} · first 0/500 at ${fz} · float below exact from depth ${losses.length ? losses[0] : 'none'} (tau x depth there = ${losses.length ? (Math.log(7) * losses[0]).toFixed(1) : '-'})`);
}
let floatNeverBeats = true;
for (const m of MS) for (const L of DEPTHS) if (res[m][L].fOk > res[m][L].ok) floatNeverBeats = false;
console.log(`  float decoding never succeeds on more words than exact decoding at any (m, depth): ${floatNeverBeats ? 'yes' : 'no (it can: a float error can repair a word the exact greedy rule loses)'}`);

// ================================================================ 5. timing
console.log('');
console.log('5. Time per point at depth 28 (machine-dependent)');
for (const m of MS) console.log(`~   m=${padR(m, 3)} exact point (Q frame product) ${timing.h2Point[m].toFixed(3)} ms · exact decode ${timing.h2Decode[m].toFixed(3)} ms · float point ${(timing.h2PointF[m] * 1000).toFixed(1)} us`);
console.log(`~   H^3    exact point (decoder3d pointExact) ${timing.h3Point.toFixed(3)} ms · exact decode (decodeExact) ${timing.h3Decode.toFixed(3)} ms`);

// ================================================================ settles
const d12 = res[12], d7 = res[7];
console.log('');
console.log(`${pass}/${total} checks pass`);
console.log('');
console.log('SETTLES:');
console.log(`  - D3: t = 11/13 gives cosh = 145/24, sinh = 143/24, tau = ln 12 exactly (cosh + sinh = 12); the exact H^2 tree at t = 11/13 decodes ${DEPTHS.map(L => d12[L].ok).join('/')} of ${NW} random words at depths ${DEPTHS.join('/')}, with ${tiesTotal} exact ties; the sheet identity holds exactly on all ${sheetOk} points.`);
console.log(`  - smallest m in {${MS.join(', ')}} with ${NW}/${NW} at every depth 2..28: ${MS.find(allDepthsPerfect) ?? 'none'}. Supplementary: m = ${SUP_M.filter(m => DEPTHS.every(L => sup[m][L] === NW)).join(', ')} also decode ${NW}/${NW} at every depth; the exact half-width of a subtree (${HW} levels) crosses the bisector tan = 1/2 for m = ${HW_M.filter(m => !exactBelow(m)).join(', ')} and stays below it for m = ${HW_M.filter(exactBelow).join(', ')}, so the threshold lies between m = 9 and m = 10; t = 11/13 keeps at most ${margin(12)} degrees of margin (m = 10: ${margin(10)}, m = 11: ${margin(11)}). On the same depth-28 random words m = 10, 11, 12 cost ${nd(bitsSup[10])}, ${nd(bitsSup[11])}, ${nd(bitsRand[12][28])} bits (max numerator/denominator).`);
console.log(`  - L3's control: t = 3/4 (m = 7) decodes ${d7[12].ok}/${NW} at depth 12 and ${d7[28].ok}/${NW} at depth 28 (planning replay: 48/100 at depth 12 reproduced); the same t in the octahedral H^3 tree decodes ${res3[12].ok}/${NW} and ${res3[28].ok}/${NW}.`);
console.log(`  - bits at depth 28, t = 11/13 (max numerator/denominator): random ${nd(B28[12].random)}, straight ${nd(B28[12].straight)}, 106+ ${nd(B28[12].b106)}, 106+- ${nd(B28[12].b106pm)}; H^3: random ${nd(H3_28.out.random)}, straight ${nd(H3_28.out.straight)}, 90 fixed ${nd(H3_28.out.b90)}, 90 random ${nd(H3_28.out.b90r)}.`);
console.log(`  - the H^2/H^3 per-coordinate bit cost ratio at depth 28 is ${rMin}x .. ${rMax}x over the four classes (whole point over a common denominator: ${pairs.map(([n, k2, k3]) => ratio(B28[12][k2].pt, H3_28.out[k3].pt) + 'x').join(', ')}).`);
console.log(`  - float64 (same construction) at t = 11/13 keeps ${NW}/${NW} up to depth ${lastPerfect(L => d12[L].fOk) ?? 'none'} and reaches 0/${NW} at depth ${firstZero(L => d12[L].fOk)}; exact rationals are required beyond that.`);
console.log(`~ total runtime ${(ms(T_START, process.hrtime.bigint()) / 1000).toFixed(1)} s`);
