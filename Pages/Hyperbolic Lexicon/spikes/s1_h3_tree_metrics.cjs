// Hyperbolic Lexicon, Phase 0, spike S1: metrics of the octahedral norm-5 tree in H^3.
//
// WHAT IT MEASURES. Everything is measured on HPDecode3D.TreeEmbedding3D at its default t = 3/4, so cosh tau = 25/7,
// sinh tau = 24/7 and tau = ln 7. The cores are used as they are: pointExact (exact Q), point (float64), decodeExact,
// decode, P.children, P.isReduced and P.treeDistance. P.children(w)[0] is the straight local direction (decoder3d
// LOCAL[0]); children 1-4 leave at 90 degrees.
//   1. Exact distances, as acosh of the exact Lorentz product: parent-child, siblings at 90 and 180 degrees, straight
//      and bent grandchildren, the bend loss, its limit for long edges, and the loss per step on long bent paths.
//   2. How often hyperbolic distance reverses tree-distance order, on the 937-node ball of radius 4 around the root.
//   3. Graph-edge MAP with pessimistic ties on a perfect 5-ary subtree and on subtrees with virtual letters.
//   4. Float64 and float32 rank inversions against the exact order, and float decode() failures, by depth 1..40.
//   5. Exact point cost by depth 1..60: numerator and denominator bits, and milliseconds per point.
//   6. Whether distinct candidates tie exactly in the sets of items 2-4, and what a float evaluator does with the ties.
//
// HOW TO RUN, from the repository root:
//   node "Pages/Hyperbolic Lexicon/spikes/s1_h3_tree_metrics.cjs" > "Pages/Hyperbolic Lexicon/spikes/s1_h3_tree_metrics_output.txt"
// Lines that begin with "~ " depend on the machine or the runtime (versions, timings); tests/spikes.cjs ignores them.
// Every other line must be identical on a rerun.
//
// WHAT IT SETTLES. Why ranking must be exact; the bit budget of exact points; the float-inversion controls of L4;
// the virtual-letter tie effect behind the doubt in L6(c). It decides no claim. It runs before PREREGISTRATION.md is
// written, and no number here is a finding of any registered test.
//
// DATA AND SEEDS. Synthetic words only. No WordNet data is read. The only randomness is HPCore.Rng:
//   Rng(90000)      item 2: the 10 source words, Rng(90000).sample(937, 10) over the ball in BFS order;
//   Rng(90000 + n)  n = 1..60: random reduced words of length n (first letter below(6), then a uniform child of the
//                   five). For n <= 40, 50 words are drawn (all 50 are decoded in item 4); the first 20 are ranked in
//                   item 4 and measured in item 5. For n > 40 only those first 20 are drawn.
// Items 1 and 3 are deterministic and use no seed.
//
// READINGS CHOSEN WHERE THE SPEC IS OPEN (the simplest faithful one in each case):
//   - Item 2. The set is the ball of radius 4 around the empty word: 1 + 6 + 30 + 150 + 750 = 937 words. For each
//     source a, a comparison is an ordered pair (b, c) of distinct words of the ball, both != a, with
//     d_T(a,b) < d_T(a,c). It is reversed if d_H(a,b) > d_H(a,c) exactly, and tied if d_H(a,b) = d_H(a,c) exactly.
//     Bins are the hop pair (d_T(a,b), d_T(a,c)).
//   - Item 3. The subtree root is the word [0] (where L3 puts entity.n.01). Each tree is given by its child counts per
//     level. (a) [5,5,5]: the perfect 5-ary subtree of depth 3, one letter per child, 156 nodes. (b) [25,5,5] and
//     [125,5,5]: the same tree, but the subtree root has 25 or 125 children addressed by virtual letters, m = 2 or 3
//     base-5 digits of k, most significant first, each choosing P.children(current word)[digit] (the L3 rule
//     m = max(1, ceil(log5 c))); 776 and 3,876 nodes. (b') [25,25]: every internal node has 25 children (m = 2), 651
//     nodes. Every node is a query; its neighbours are its parent and children inside the subtree; the candidates are
//     all other nodes of the subtree; the score is the exact Lorentz product with the query (larger = nearer). AP is
//     computed with ties pessimistic (inside a tie, every non-neighbour ranks first). The optimistic MAP is printed
//     only for contrast.
//   - Item 4. Candidates of a word w of length n: its parent, grandparent, siblings, uncles (the parent's siblings),
//     its 5 children, the 5 children of its straight child, and the 5 children of its first sibling (21 candidates at
//     n = 1; 26 at n = 2, where the root gives 5 uncles; 25 after). The exact order groups candidates into levels of
//     equal Lorentz product. Between consecutive levels k (nearer) and k+1, a float order INVERTS ("inv") if some
//     candidate of level k has a strictly smaller float product than some candidate of level k+1; it TIES ("tie") if
//     it does not invert but the two levels meet in a float equality. "inv" is the order-free form of "an exactly
//     strictly ordered adjacent pair inverts", and it is equivalent to "some exactly strictly ordered pair inverts",
//     which the script checks on every ranking. A word "fails" in a float mode on inv, tie or a non-finite product
//     ("nf"). The first depths of inversion and of failure are reported per mode. Float modes: f64 point() is the float placement
//     TreeEmbedding3D.point with the core's float H.lorentz; f64 exact is Q.toNumber of the exact point (correctly
//     rounded) with H.lorentz, as in L4(b); f32 is Math.fround(Q.toNumber(x)) on every coordinate, with Math.fround on
//     every product and every partial sum (IEEE single arithmetic, summed in H.lorentz's order). A float32 product
//     overflows to Infinity once coordinates pass about 1.8e19 (depth >= 23), which is reported as non-finite.
//     Straight-path words are [0, 0, ..., 0]: always P.children(w)[0], a geodesic.
//   - Item 4 decode: decode(point(w), n) with the float placement, and decode of the correctly rounded exact point.
//   - Item 5. Bits are taken from the reduced Q of each coordinate; the maximum is over the 4 coordinates and the 20
//     random words (or the straight word). Milliseconds per point are timed on fresh pointExact calls ("~" lines).
//   - Item 6. Besides counting exact ties, it runs on item 3's trees the float evaluator of L4's control (2): acosh of
//     the float64 Lorentz product of the rounded exact points, ties broken by node index, and counts the queries whose
//     AP differs from the pessimistic exact AP.
//
// CHECKS (two ways). Item 1 compares every exact cosh with the hyperbolic law of cosines in Q. Item 2 recounts the first
// source's comparisons with direct Q comparisons. Item 3 recomputes AP with Q Lorentz products and an explicit sort for
// a subset of queries. Item 4 checks the adjacent-level inversion test against the all-pairs test, and decodeExact on
// every ranked word. Every Lorentz product of points at depths n_a and n_b is checked to be an integer over
// 7^(n_a + n_b). The script throws if any check fails.
//
// RUNTIME. About 45 s on one core of the build machine (Node 22.23.4): item 4 (exact points to depth 42) about 31 s,
// item 3 (all-pairs exact ranking, mostly the 3,876-node tree) about 7 s, item 5 about 4 s.
'use strict';
const C = require('../../Hyperbolic Oracles/hyperbolic_core.js');
const D = require('../../Hyperbolic Oracles/decoder3d.js');
const { Q, P, X, H, Rng } = C;

const T0 = process.hrtime.bigint();
const msSince = t => Number(process.hrtime.bigint() - t) / 1e6;
const out = s => console.log(s);
const assert = (ok, what) => { if (!ok) throw new Error('S1 check failed: ' + what); };
const absB = a => (a < 0n ? -a : a);
const bitLen = a => (a === 0n ? 0 : absB(a).toString(2).length);
const f4 = x => x.toFixed(4);
const pct = (a, b) => (b ? (100 * a / b).toFixed(2) + '%' : '-');
const wstr = w => (w.length ? '[' + w.join(',') + ']' : '[]');
const key = w => w.join('');
const ext = (w, g) => w.concat([g]);

const emb = new D.TreeEmbedding3D();             // t = 3/4
const TAU = emb.tau;                             // 2 atanh(3/4) = ln 7
const SEVEN = 7n;
const pow7 = k => SEVEN ** BigInt(k);
const isPow7Divisor = d => { let x = d; while (x % SEVEN === 0n) x /= SEVEN; return x === 1n; };

// exact points, cached by word
const cache = new Map();
const PE = w => { const k = key(w); let p = cache.get(k); if (!p) { p = emb.pointExact(w); cache.set(k, p); } return p; };
// exact Lorentz product, with the check that it is an integer over 7^(n_a + n_b)
let lorentzChecked = 0;
function lor(a, b) {
    const s = X.lorentz(PE(a), PE(b));
    assert((pow7(a.length + b.length) % s.d) === 0n, `Lorentz product of ${wstr(a)}, ${wstr(b)} is not over 7^(n_a+n_b)`);
    lorentzChecked++;
    return s;
}
const distQ = s => Math.acosh(s.neg().toNumber());   // d_H from an exact Lorentz product (display only)
const randomWord = (rng, n) => { const w = [rng.below(6)]; while (w.length < n) { const k = P.children(w); w.push(k[rng.below(k.length)]); } return w; };
const straightWord = n => { const w = []; while (w.length < n) w.push(P.children(w)[0]); return w; };

out('S1 s1_h3_tree_metrics: distances, order reversals, MAP with virtual letters, float inversions and exact cost in the octahedral H^3 tree (TreeEmbedding3D, t = 3/4, tau = ln 7)');
out('Settles: why ranking must be exact; the bit budget; L4\'s float-inversion controls; the virtual-letter tie effect behind L6(c)\'s doubt. Decides no claim. Synthetic words only.');
out(`~ node ${process.version}, HPCore ${C.version}, HPDecode3D ${D.version}, ${process.platform}-${process.arch}`);
out('');

// =====================================================================================================================
// 1. Distances
// =====================================================================================================================
const item1 = {};
{
    const t1 = process.hrtime.bigint();
    out('1. Distances in the octahedral tree (exact cosh d = -<x,y>_L; d = acosh, 4 decimals)');
    out(`  t = ${emb.t}, cosh tau = ${emb.cosh}, sinh tau = ${emb.sinh}, tau = 2 atanh(3/4) = ln 7 = ${f4(TAU)} (|tau - ln 7| < 1e-15: ${Math.abs(TAU - Math.log(7)) < 1e-15})`);
    out(`  P.children([0]) = [${P.children([0])}]: child 0 is straight (local +x), children 1-4 are local +y, -y, +z, -z`);
    const c = emb.cosh, s = emb.sinh;
    const lawOfCosines = cosTheta => c.mul(c).sub(s.mul(s).mul(cosTheta));   // cosh of the side opposite the angle
    const rows = [
        ['parent-child', [0], [0, 0], null],
        ['siblings at 90 deg (straight vs bent)', [0, 0], [0, 2], new Q(0n)],
        ['siblings at 90 deg (bent +y vs bent +z)', [0, 2], [0, 4], new Q(0n)],
        ['siblings at 180 deg (bent +y vs bent -y)', [0, 2], [0, 3], new Q(-1n)],
        ['root children at 90 deg', [0], [2], new Q(0n)],
        ['root children at 180 deg', [0], [1], new Q(-1n)],
        ['straight grandchild (no bend)', [0], [0, 0, 0], new Q(-1n)],
        ['bent grandchild (one 90 deg bend)', [0], [0, 0, 2], new Q(0n)],
        ['bend then straight', [0], ext([0, 2], P.children([0, 2])[0]), new Q(-1n)],
    ];
    const vals = {};
    for (const [name, a, b, cosT] of rows) {
        const ch = lor(a, b).neg();
        const want = cosT === null ? c : lawOfCosines(cosT);
        assert(ch.eq(want), `law of cosines for ${name}`);
        vals[name] = ch;
        out(`  ${name.padEnd(42)} ${wstr(a)} ${wstr(b)}: cosh d = ${ch}, d = ${f4(distQ(ch.neg()))}` +
            `${cosT === null ? '' : ` (law of cosines with cos theta = ${cosT.toNumber()}: equal)`}`);
    }
    // every edge of the radius-4 ball
    const ball = [[]];
    for (let i = 0; i < ball.length; i++) if (ball[i].length < 4) for (const g of P.children(ball[i])) ball.push(ext(ball[i], g));
    let edges = 0, okEdges = 0;
    for (const w of ball) if (w.length) { edges++; if (lor(w.slice(0, -1), w).neg().eq(c)) okEdges++; }
    assert(edges === okEdges, 'every edge has cosh d = 25/7');
    out(`  all ${edges} edges of the radius-4 ball: cosh d = 25/7 exactly on ${okEdges}/${edges}`);
    const straight2 = 2 * TAU, bent2 = distQ(vals['bent grandchild (one 90 deg bend)'].neg());
    out(`  bend loss of one 90 deg bend between two edges: 2 tau - acosh(625/49) = ${f4(straight2)} - ${f4(bent2)} = ${f4(straight2 - bent2)}`);
    item1.d90 = bent2; item1.d180 = straight2; item1.loss = straight2 - bent2;
    out('  the loss grows to ln 2 = ' + f4(Math.LN2) + ' for long edges (asymptotically 2 tau - d -> -2 ln sin(90 deg / 2) = ln 2):');
    // (i) one bend between straight runs of k edges, in this tree
    const parts = [];
    for (const k of [1, 2, 3, 4, 8, 16]) {
        let w = [0];
        for (let i = 0; i < k; i++) w = ext(w, P.children(w)[0]);
        w = ext(w, P.children(w)[1]);
        for (let i = 0; i < k - 1; i++) w = ext(w, P.children(w)[0]);
        const d = distQ(lor([0], w));
        parts.push(`k = ${k}: ${f4(2 * k * TAU - d)}`);
    }
    out('    in this tree, one bend between straight runs of k edges, loss 2k tau - d: ' + parts.join(', '));
    // (ii) one bend between single edges of length tau = ln m, t = (m-1)/(m+1), in TreeEmbedding3D(t)
    const parts2 = [];
    for (const e of [1, 2, 4, 8]) {
        const m = 7n ** BigInt(e), em = new D.TreeEmbedding3D(new Q(m - 1n, m + 1n));
        const ch = X.lorentz(em.pointExact([0]), em.pointExact([0, 0, 2])).neg();
        assert(ch.eq(em.cosh.mul(em.cosh)), 'bent grandchild cosh = cosh^2 tau at t = (m-1)/(m+1)');
        parts2.push(`tau = ${e} ln 7: ${f4(2 * em.tau - Math.acosh(ch.toNumber()))}`);
    }
    out('    one bend between single edges of length tau, t = (m-1)/(m+1) with m = 7^e: ' + parts2.join(', '));
    // (iii) loss per step on long paths that bend at every step, and on random words
    const n = 40, always1 = [0]; while (always1.length < n) always1.push(P.children(always1)[1]);
    const dA = distQ(lor([], always1));
    out(`    a word that bends at every step (always P.children(w)[1]), length ${n}: n tau - d = ${f4(n * TAU - dA)}, ${f4((n * TAU - dA) / (n - 1))} per bend`);
    const rng = new Rng(90000 + n);
    let lossSum = 0, bendSum = 0;
    for (let i = 0; i < 20; i++) {
        const w = randomWord(rng, n), bends = w.slice(1).filter((g, j) => P.children(w.slice(0, j + 1))[0] !== g).length;
        lossSum += n * TAU - distQ(lor([], w)); bendSum += bends;
    }
    out(`    the 20 random words of length ${n} (Rng(${90000 + n})): ${bendSum} bends, total loss ${f4(lossSum)}, ${f4(lossSum / bendSum)} per bend`);
    item1.perBendAlways = (n * TAU - dA) / (n - 1); item1.perBendRandom = lossSum / bendSum;
    out(`~ item 1: ${msSince(t1).toFixed(0)} ms`);
    out('');
}

// =====================================================================================================================
// 2. Order reversals on the radius-4 ball
// =====================================================================================================================
const item2 = {};
{
    const t2 = process.hrtime.bigint();
    const ball = [[]];
    for (let i = 0; i < ball.length; i++) if (ball[i].length < 4) for (const g of P.children(ball[i])) ball.push(ext(ball[i], g));
    assert(ball.length === 937, 'ball of radius 4 has 937 words');
    const srcIdx = new Rng(90000).sample(ball.length, 10);
    out(`2. Order reversals: hyperbolic against tree distance, ${ball.length}-word ball of radius 4 around the root`);
    out(`  sources (Rng(90000).sample(937, 10)): ${srcIdx.map(i => wstr(ball[i])).join(' ')}`);
    const H_MAX = 8, bins = {}, gap = {};
    let totalCmp = 0, totalRev = 0, totalTie = 0, geodesic = 0;
    for (let si = 0; si < srcIdx.length; si++) {
        const a = ball[srcIdx[si]];
        const tg = ball.filter((_, i) => i !== srcIdx[si]).map(b => ({ b, h: P.treeDistance(a, b), L: lor(a, b) }));
        tg.forEach(t => {
            // exactly geodesic iff cosh d_H = cosh(h tau) = (7^2h + 1) / (2 * 7^h); then the gap is exactly 0
            const geo = t.L.neg().eq(new Q(pow7(2 * t.h) + 1n, 2n * pow7(t.h)));
            const g = geo ? 0 : t.h * TAU - distQ(t.L);
            if (geo) geodesic++;
            if (!gap[t.h]) gap[t.h] = [Infinity, -Infinity];
            gap[t.h][0] = Math.min(gap[t.h][0], g); gap[t.h][1] = Math.max(gap[t.h][1], g);
        });
        // dense rank by exact distance: 0 = nearest (largest Lorentz product)
        const order = tg.map((_, i) => i).sort((i, j) => tg[j].L.cmp(tg[i].L));
        let r = -1;
        order.forEach((i, pos) => { if (pos === 0 || tg[order[pos - 1]].L.cmp(tg[i].L) !== 0) r++; tg[i].r = r; });
        const N = tg.length, hs = tg.map(t => t.h), rs = tg.map(t => t.r);
        let cmpS = 0, revS = 0, tieS = 0;
        const cnt = new Array(3 * 81).fill(0);           // [h1 * 9 + h2] * 3 + (comparisons, reversed, tied)
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
            if (hs[i] >= hs[j]) continue;
            const k = 3 * (hs[i] * 9 + hs[j]);
            cnt[k]++; cmpS++;
            if (rs[i] > rs[j]) { cnt[k + 1]++; revS++; } else if (rs[i] === rs[j]) { cnt[k + 2]++; tieS++; }
        }
        for (let h1 = 0; h1 <= H_MAX; h1++) for (let h2 = h1 + 1; h2 <= H_MAX; h2++) {
            const k = 3 * (h1 * 9 + h2);
            if (!cnt[k]) continue;
            const key2 = h1 + ',' + h2;
            if (!bins[key2]) bins[key2] = [0, 0, 0];
            for (let q = 0; q < 3; q++) bins[key2][q] += cnt[k + q];
        }
        if (si === 0) {                                  // second way: direct Q comparisons
            let c2 = 0, r2 = 0, e2 = 0;
            for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
                if (hs[i] >= hs[j]) continue;
                c2++; const cmp = tg[i].L.cmp(tg[j].L);   // d_H(a,b_i) > d_H(a,b_j) iff L_i < L_j
                if (cmp < 0) r2++; else if (cmp === 0) e2++;
            }
            assert(c2 === cmpS && r2 === revS && e2 === tieS, 'item 2 recount with direct Q comparisons');
        }
        totalCmp += cmpS; totalRev += revS; totalTie += tieS;
    }
    out('  comparisons (b, c) with d_T(a,b) < d_T(a,c), binned by hops (d_T(a,b), d_T(a,c)); reversed: d_H(a,b) > d_H(a,c); tied: d_H equal');
    for (let h1 = 1; h1 <= H_MAX; h1++) for (let h2 = h1 + 1; h2 <= H_MAX; h2++) {
        const b = bins[h1 + ',' + h2];
        if (!b) continue;
        out(`    hops ${h1} < ${h2}: ${String(b[0]).padStart(8)} comparisons, ${String(b[1]).padStart(7)} reversed (${pct(b[1], b[0])}), ${String(b[2]).padStart(6)} tied`);
    }
    const byDelta = {};
    for (const [k, b] of Object.entries(bins)) { const [h1, h2] = k.split(',').map(Number), dlt = h2 - h1; if (!byDelta[dlt]) byDelta[dlt] = [0, 0, 0]; for (let i = 0; i < 3; i++) byDelta[dlt][i] += b[i]; }
    out('  by hop difference d_T(a,c) - d_T(a,b):');
    for (const dlt of Object.keys(byDelta).map(Number).sort((x, y) => x - y)) {
        const b = byDelta[dlt];
        out(`    +${dlt}: ${String(b[0]).padStart(8)} comparisons, ${String(b[1]).padStart(7)} reversed (${pct(b[1], b[0])}), ${String(b[2]).padStart(6)} tied`);
    }
    out(`  total: ${totalCmp} comparisons, ${totalRev} reversed (${pct(totalRev, totalCmp)}), ${totalTie} tied (${pct(totalTie, totalCmp)}); first source recounted with direct Q comparisons: equal`);
    out('  tau * d_T - d_H over the 10 x 936 (source, word) pairs, by hops (min .. max):');
    let gmin = Infinity, gmax = -Infinity;
    for (let h = 1; h <= H_MAX; h++) if (gap[h]) { gmin = Math.min(gmin, gap[h][0]); gmax = Math.max(gmax, gap[h][1]); out(`    ${h} hops: ${f4(gap[h][0])} .. ${f4(gap[h][1])}`); }
    out(`    all: ${f4(gmin)} .. ${f4(gmax)}; exactly 0 (cosh d_H = cosh(d_T tau), a geodesic tree path) on ${geodesic} of ${10 * 936} pairs`);
    assert(gmin >= 0, 'tau d_T - d_H >= 0');
    item2.rev = totalRev; item2.cmp = totalCmp; item2.tie = totalTie; item2.gmax = gmax; item2.byDelta = byDelta;
    out(`~ item 2: ${msSince(t2).toFixed(0)} ms`);
    out('');
}

// =====================================================================================================================
// 3. Graph-edge MAP on perfect and virtual-letter subtrees
// =====================================================================================================================
const lettersFor = c => { let m = 1, p = 5; while (p < c) { p *= 5; m++; } return m; };      // max(1, ceil(log5 c))
function childWord(w, k, c) {
    const m = lettersFor(c), digits = [];
    let x = k;
    for (let i = 0; i < m; i++) { digits.unshift(x % 5); x = Math.floor(x / 5); }
    let v = w.slice();
    for (const d of digits) v = ext(v, P.children(v)[d]);
    return v;
}
function buildTree(rootWord, shape) {
    const nodes = [{ w: rootWord, parent: -1, level: 0 }];
    let frontier = [0];
    for (const c of shape) {
        const next = [];
        for (const i of frontier) for (let k = 0; k < c; k++) { nodes.push({ w: childWord(nodes[i].w, k, c), parent: i, level: nodes[i].level + 1 }); next.push(nodes.length - 1); }
        frontier = next;
    }
    nodes.forEach(nd => { nd.nbrs = []; });
    nodes.forEach((nd, i) => { if (nd.parent >= 0) { nd.nbrs.push(nd.parent); nodes[nd.parent].nbrs.push(i); } });
    assert(new Set(nodes.map(nd => key(nd.w))).size === nodes.length, 'tree words are distinct');
    assert(nodes.every(nd => P.isReduced(nd.w)), 'tree words are reduced');
    return nodes;
}
const qFrac = (a, b) => new Q(BigInt(a), BigInt(b));
function mapOf(nodes, verifyEvery) {
    const Dmax = Math.max(...nodes.map(nd => nd.w.length)), S = pow7(Dmax);
    const Xs = nodes.map(nd => PE(nd.w).map(x => { assert(S % x.d === 0n, 'coordinate over 7^n'); return x.n * (S / x.d); }));
    const Fs = nodes.map(nd => PE(nd.w).map(x => x.toNumber()));
    const N = nodes.length;
    const apPess = new Map(), apOpt = new Map();                  // AP string -> count
    let qBelow1 = 0, qTieRel = 0, tiePairs = 0, qAnyTie = 0, qFloatDiff = 0, qFloatDiffTie = 0, verified = 0;
    let farNbr = null, nearNon = null, qNonNotBehind = 0;      // extreme scores: farthest neighbour, nearest non-neighbour
    const scores = new Array(N), isRel = new Uint8Array(N);
    for (let u = 0; u < N; u++) {
        const Xu = Xs[u];
        for (let v = 0; v < N; v++) {
            if (v === u) { scores[v] = null; continue; }
            const Xv = Xs[v];
            scores[v] = Xu[1] * Xv[1] + Xu[2] * Xv[2] + Xu[3] * Xv[3] - Xu[0] * Xv[0];
        }
        const R = nodes[u].nbrs, Rset = new Set(R);
        for (const r of R) isRel[r] = 1;
        let relMin = null, irrMax = null;
        for (let v = 0; v < N; v++) {
            if (v === u) continue;
            const sv = scores[v];
            if (isRel[v]) { if (relMin === null || sv < relMin) relMin = sv; } else if (irrMax === null || sv > irrMax) irrMax = sv;
        }
        for (const r of R) isRel[r] = 0;
        if (farNbr === null || relMin < farNbr) farNbr = relMin;
        if (irrMax !== null && (nearNon === null || irrMax > nearNon)) nearNon = irrMax;
        if (irrMax !== null && irrMax >= relMin) qNonNotBehind++;
        const levels = [...new Set(R.map(r => scores[r]))].sort((x, y) => (x > y ? -1 : x < y ? 1 : 0));
        const above = levels.map(() => 0), equal = levels.map(() => 0);
        for (let v = 0; v < N; v++) {
            if (v === u) continue;
            const sv = scores[v];
            for (let l = 0; l < levels.length; l++) { if (sv > levels[l]) above[l]++; else if (sv === levels[l]) equal[l]++; }
        }
        let pess = Q.ZERO, opt = Q.ZERO, relAbove = 0, tieRel = false;
        levels.forEach((s, l) => {
            const r = R.filter(x => scores[x] === s).length;
            if (equal[l] > r) { tieRel = true; tiePairs += r * (equal[l] - r); }
            for (let j = 1; j <= r; j++) {
                pess = pess.add(qFrac(relAbove + j, above[l] + equal[l] - r + j));
                opt = opt.add(qFrac(relAbove + j, above[l] + j));
            }
            relAbove += r;
        });
        pess = pess.div(qFrac(R.length, 1)); opt = opt.div(qFrac(R.length, 1));
        apPess.set(pess.toString(), (apPess.get(pess.toString()) || 0) + 1);
        apOpt.set(opt.toString(), (apOpt.get(opt.toString()) || 0) + 1);
        if (pess.cmp(Q.ONE) < 0) qBelow1++;
        if (tieRel) qTieRel++;
        const distinct = new Set(scores.filter((x, v) => v !== u)).size;
        if (distinct < N - 1) qAnyTie++;
        // a float evaluator (L4 control 2): acosh of the float64 product of the rounded exact points, ties by node index
        const Fu = Fs[u], dF = Fs.map((Fv, v) => (v === u ? Infinity : Math.acosh(Math.max(1, -H.lorentz(Fu, Fv)))));
        let fl = Q.ZERO;
        for (const r of R) {
            let pos = 1, hits = 1;
            for (let v = 0; v < N; v++) {
                if (v === u || v === r) continue;
                if (dF[v] < dF[r] || (dF[v] === dF[r] && v < r)) { pos++; if (Rset.has(v)) hits++; }
            }
            fl = fl.add(qFrac(hits, pos));
        }
        fl = fl.div(qFrac(R.length, 1));
        if (!fl.eq(pess)) { qFloatDiff++; if (tieRel) qFloatDiffTie++; }
        // second way: Q Lorentz products, explicit sort with non-neighbours first inside ties
        if (u === 0 || u % verifyEvery === 0) {
            const pu = PE(nodes[u].w);
            const cand = [];
            for (let v = 0; v < N; v++) if (v !== u) cand.push({ s: X.lorentz(pu, PE(nodes[v].w)), r: Rset.has(v) });
            cand.sort((a, b) => b.s.cmp(a.s) || (a.r - b.r));
            let hits = 0, sum = Q.ZERO;
            cand.forEach((cnd, pos) => { if (cnd.r) { hits++; sum = sum.add(qFrac(hits, pos + 1)); } });
            assert(sum.div(qFrac(R.length, 1)).eq(pess), 'item 3 AP recomputed with Q and a sort');
            verified++;
        }
    }
    const sumMap = m => { let s = Q.ZERO; for (const [k, cnt] of m) s = s.add(Q.parse(k).mul(qFrac(cnt, 1))); return s.div(qFrac(N, 1)); };
    const dOf = sc => Math.acosh(new Q(-sc, S * S).toNumber());
    return { N, Dmax, map: sumMap(apPess), mapOpt: sumMap(apOpt), qBelow1, qTieRel, tiePairs, qAnyTie, qFloatDiff, qFloatDiffTie, verified, distinctAP: apPess.size,
        farNbr: dOf(farNbr), farNbrCosh: new Q(-farNbr, S * S), nearNon: dOf(nearNon), nearNonCosh: new Q(-nearNon, S * S), qNonNotBehind };
}
const qShow = q => (q.n.toString().length + q.d.toString().length <= 48 ? `${q}` : `(${q.n.toString().length}-digit / ${q.d.toString().length}-digit rational)`);
const item3 = {};
{
    const t3 = process.hrtime.bigint();
    out('3. Graph-edge MAP, exact Lorentz ranking, ties pessimistic (subtree root [0]; neighbours = parent and children; candidates = all other nodes)');
    const trees = [
        ['(a)  perfect 5-ary, depth 3', [5, 5, 5], 1],
        ['(b)  root with 25 children, m = 2, then 5, 5', [25, 5, 5], 7],
        ['(b)  root with 125 children, m = 3, then 5, 5', [125, 5, 5], 31],
        ["(b') 25-ary at every level, m = 2, depth 2", [25, 25], 5],
    ];
    for (const [name, shape, every] of trees) {
        const tt = process.hrtime.bigint();
        const nodes = buildTree([0], shape), r = mapOf(nodes, every);
        item3[shape.join(',')] = r;
        out(`  ${name}: ${r.N} nodes, words of up to ${r.Dmax} letters, letters per level [${shape.map(lettersFor).join(',')}]`);
        out(`    MAP (pessimistic ties) = ${r.map.toNumber().toFixed(6)} = ${qShow(r.map)}; queries with AP < 1: ${r.qBelow1}/${r.N}`);
        out(`    MAP (optimistic ties, contrast only) = ${r.mapOpt.toNumber().toFixed(6)}`);
        out(`    farthest neighbour of any query: d = ${f4(r.farNbr)} (cosh ${r.farNbrCosh}); nearest non-neighbour of any query: d = ${f4(r.nearNon)} (cosh ${r.nearNonCosh});` +
            ` queries whose nearest non-neighbour is as near as or nearer than their farthest neighbour: ${r.qNonNotBehind}/${r.N}`);
        out(`    exact ties between a neighbour and a non-neighbour: ${r.qTieRel}/${r.N} queries, ${r.tiePairs} (neighbour, non-neighbour) pairs; queries with any exact tie among candidates: ${r.qAnyTie}/${r.N}`);
        out(`    AP recomputed with Q Lorentz products and an explicit sort on ${r.verified} queries: equal`);
        out(`~   ${msSince(tt).toFixed(0)} ms`);
    }
    out('  why (item 1 distances): with one letter per child every neighbour is 1.9459 away and the nearest non-neighbour 3.2375. With m = 2,');
    out('  a child is 3.2375 from its parent if its last letter bends and 3.8918 if it is straight: the same distances as its own grandchildren');
    out('  (bent or straight last step) and its siblings under the same virtual prefix (90 or 180 deg), which therefore tie with the parent or');
    out('  come before it. With m = 3 the parent can be 3 tau = 5.8377 away.');
    out(`~ item 3: ${msSince(t3).toFixed(0)} ms`);
    out('');
}

// =====================================================================================================================
// 4. Float against exact: rank inversions and decoding by depth
// =====================================================================================================================
function candidates(w) {
    const n = w.length, outw = [], seen = new Set([key(w)]);
    const add = v => { const k = key(v); if (!seen.has(k)) { seen.add(k); outw.push(v); } };
    const p = w.slice(0, -1), gp = w.slice(0, -2);
    add(p);
    if (n >= 2) add(gp);
    for (const g of P.children(p)) if (g !== w[n - 1]) add(ext(p, g));
    if (n >= 2) for (const g of P.children(gp)) if (g !== w[n - 2]) add(ext(gp, g));
    for (const g of P.children(w)) add(ext(w, g));
    const c0 = ext(w, P.children(w)[0]);
    for (const g of P.children(c0)) add(ext(c0, g));
    const s1 = ext(p, P.children(p).find(g => g !== w[n - 1]));
    for (const g of P.children(s1)) add(ext(s1, g));
    return outw;
}
const fr = Math.fround;
function lorentz32(a, b) { let s = 0; for (let i = 1; i < 4; i++) s = fr(s + fr(a[i] * b[i])); return fr(fr(-fr(a[0] * b[0])) + s); }
function orderFlags(groups, f, ex) {
    let inv = false, col = false;
    const nonfin = f.some(x => !Number.isFinite(x));
    for (let k = 0; k + 1 < groups.length; k++) {
        let lo = Infinity, hi = -Infinity;
        for (const i of groups[k]) lo = Math.min(lo, f[i]);
        for (const i of groups[k + 1]) hi = Math.max(hi, f[i]);
        if (lo < hi) inv = true; else if (lo === hi) col = true;
    }
    // second way: some exactly strictly ordered pair inverts
    let invAll = false;
    for (let i = 0; i < f.length; i++) for (let j = 0; j < f.length; j++) if (ex[i].cmp(ex[j]) > 0 && f[i] < f[j]) invAll = true;
    if (!nonfin) assert(inv === invAll, 'adjacent-level inversion test equals the all-pairs test');
    return { inv, col, nonfin };
}
function rankWord(w) {
    const cs = candidates(w), pw = PE(w);
    const ex = cs.map(v => lor(w, v));
    const idx = cs.map((_, i) => i).sort((i, j) => ex[j].cmp(ex[i]));
    const groups = [];
    idx.forEach((i, pos) => { if (pos === 0 || ex[idx[pos - 1]].cmp(ex[i]) !== 0) groups.push([]); groups[groups.length - 1].push(i); });
    const fwP = emb.point(w), f64p = cs.map(v => H.lorentz(fwP, emb.point(v)));
    const fwE = pw.map(x => x.toNumber()), f64e = cs.map(v => H.lorentz(fwE, PE(v).map(x => x.toNumber())));
    const fw32 = fwE.map(fr), f32 = cs.map(v => lorentz32(fw32, PE(v).map(x => fr(x.toNumber()))));
    // the nearest exact level is exactly the parent and the 5 children, at cosh d = 25/7
    const top = groups[0].map(i => key(cs[i])).sort().join(' ');
    const want = [w.slice(0, -1), ...P.children(w).map(g => ext(w, g))].map(key).sort().join(' ');
    // candidates on the word's own geodesic line (all letters 0), for the straight word
    const onLine = cs.map((v, i) => i).filter(i => cs[i].every(g => g === 0));
    return {
        nCand: cs.length, nLevels: groups.length, tieGroups: groups.filter(g => g.length > 1).length,
        lineZeroE: onLine.length === 4 && onLine.every(i => f64e[i] === 0), lineZeroP: onLine.length === 4 && onLine.every(i => f64p[i] === 0),
        p: orderFlags(groups, f64p, ex), e: orderFlags(groups, f64e, ex), s: orderFlags(groups, f32, ex),
    };
}
const status = fl => (fl.inv ? 'inv' : fl.nonfin ? 'nf' : fl.col ? 'tie' : 'ok');
const failed = fl => fl.inv || fl.nonfin || fl.col;
const N_RANK = 20, N_DEC = 50, MAX4 = 40, MAX5 = 60;
const MODES = [['p', 'f64 point()'], ['e', 'f64 exact'], ['s', 'f32']];
const wordsAt = {};                                   // depth -> the first N_RANK random words
const item4 = { first: {}, firstDec: {}, rankings: 0, withTies: 0, tieGroups: 0, levels: 0, cands: 0, topOk: 0, nonfinFirst: null, exactDecodes: 0,
    allFail: { p: [], e: [], s: [] }, lineZeroE: [], lineZeroP: [] };
{
    const t4 = process.hrtime.bigint();
    out(`4. Float against exact, by depth n = 1..${MAX4}: ${N_RANK} random words from Rng(90000+n) and the straight word [0,...,0]`);
    out('  ranking: 21-26 candidates per word (parent, grandparent, siblings, uncles, children, children of the straight child, children of the first sibling),');
    out('  ordered by the Lorentz product with the word: exact (Q), f64 point() (float placement), f64 exact (Q.toNumber), f32 (Math.fround throughout)');
    out('  a float order: inv = some pair of consecutive exact levels inverts; tie = no inversion, but two exact levels meet in a float tie;');
    out('  nf = a non-finite float32 product (and no inversion); fail = any of the three');
    out('  decoding: decode(point(w), n) and decode of the rounded exact point, on all 50 words of Rng(90000+n); decodeExact(pointExact(w), n) on every ranked word');
    const mark = (k, n) => { if (item4.first[k] === undefined) item4.first[k] = n; };
    const markD = (k, n) => { if (item4.firstDec[k] === undefined) item4.firstDec[k] = n; };
    const rows = [];
    for (let n = 1; n <= MAX4; n++) {
        const rng = new Rng(90000 + n), words = [];
        for (let i = 0; i < N_DEC; i++) words.push(randomWord(rng, n));
        wordsAt[n] = words.slice(0, N_RANK);
        const sw = straightWord(n);
        const inv = { p: 0, e: 0, s: 0 }, fail = { p: 0, e: 0, s: 0 };
        const tally = r => {
            item4.rankings++; item4.cands += r.nCand; item4.levels += r.nLevels; item4.tieGroups += r.tieGroups;
            if (r.tieGroups) item4.withTies++; if (r.topOk) item4.topOk++;
            if (r.s.nonfin && item4.nonfinFirst === null) item4.nonfinFirst = n;
        };
        for (const w of wordsAt[n]) {
            assert(P.isReduced(w), 'random word is reduced');
            const r = rankWord(w);
            tally(r);
            for (const [m] of MODES) { if (r[m].inv) inv[m]++; if (failed(r[m])) fail[m]++; }
            assert(emb.decodeExact(PE(w), n).join() === w.join(), 'decodeExact returns the word'); item4.exactDecodes++;
        }
        const rs = rankWord(sw);
        tally(rs);
        assert(emb.decodeExact(PE(sw), n).join() === sw.join(), 'decodeExact returns the straight word'); item4.exactDecodes++;
        item4.lineZeroE[n] = rs.lineZeroE; item4.lineZeroP[n] = rs.lineZeroP;
        for (const [m] of MODES) {
            item4.allFail[m][n] = fail[m] === N_RANK;
            if (inv[m]) mark('rnd inv ' + m, n); if (fail[m]) mark('rnd fail ' + m, n);
            if (rs[m].inv) mark('str inv ' + m, n); if (failed(rs[m])) mark('str fail ' + m, n);
        }
        const pe = PE(sw).map(x => x.toNumber()), pp = emb.point(sw);
        // decoding
        let dp = 0, de = 0;
        for (const w of words) {
            if (emb.decode(emb.point(w), n).join() === w.join()) dp++;
            if (emb.decode(PE(w).map(x => x.toNumber()), n).join() === w.join()) de++;
        }
        const sp = emb.decode(emb.point(sw), n).join() === sw.join(), se = emb.decode(pe, n).join() === sw.join();
        if (dp < N_DEC) markD('rnd point()', n); if (de < N_DEC) markD('rnd exact', n);
        if (!sp) markD('str point()', n); if (!se) markD('str exact', n);
        const two = m => `${String(inv[m]).padStart(2)}/${String(fail[m]).padStart(2)}`;
        rows.push(`    n=${String(n).padStart(2)}  random ${two('p')} | ${two('e')} | ${two('s')}` +
            `   straight ${status(rs.p).padEnd(3)} | ${status(rs.e).padEnd(3)} | ${status(rs.s).padEnd(3)}` +
            `   decode random ${String(dp).padStart(2)}/50 | ${String(de).padStart(2)}/50, straight ${sp ? 'ok' : 'FAIL'} | ${se ? 'ok' : 'FAIL'}`);
    }
    out('  per depth: random = inv/fail counts of the 20 words, f64 point() | f64 exact | f32; straight = status, same order; decode = point() | rounded exact');
    rows.forEach(out);
    const fi = k => (item4.first[k] === undefined ? `none to ${MAX4}` : String(item4.first[k]));
    const fd = k => (item4.firstDec[k] === undefined ? `none to ${MAX4}` : String(item4.firstDec[k]));
    const line = (label, pre) => out(`  ${label}: ${MODES.map(([m, name]) => `${name} ${fi(pre + m)}`).join(', ')}`);
    line('first depth with an inversion, random words', 'rnd inv ');
    line('first depth with an inversion, straight word', 'str inv ');
    line('first depth at which the float order fails (inv, tie or nf), random words', 'rnd fail ');
    line('first depth at which the float order fails (inv, tie or nf), straight word', 'str fail ');
    const fromOn = arr => { let d = null; for (let n = MAX4; n >= 1 && arr[n]; n--) d = n; return d; };
    for (const [m] of MODES) { const d = fromOn(item4.allFail[m]); if (d !== null) item4.first['rnd all ' + m] = d; }
    line(`all 20 random words fail at every depth from`, 'rnd all ');
    out(`  first depth with a non-finite float32 product: ${item4.nonfinFirst === null ? 'none' : item4.nonfinFirst}`);
    // the straight word [0]^n sits at (cosh n tau, sinh n tau, 0, 0); once both coordinates are the same double, the float
    // product of two such points is -x0 y0 + x1 y1 = 0 exactly
    const diffE = [], diffP = [];
    for (let n = 1; n <= MAX4 + 2; n++) { const w = straightWord(n), e = PE(w).map(x => x.toNumber()), q = emb.point(w); if (e[0] !== e[1]) diffE.push(n); if (q[0] !== q[1]) diffP.push(n); }
    const runs = a => { const r = []; a.forEach(n => { const l = r[r.length - 1]; if (l && l[1] === n - 1) l[1] = n; else r.push([n, n]); }); return r.map(([x, y]) => (x === y ? `${x}` : `${x}-${y}`)).join(', '); };
    const midpoint = n => { const v = pow7(n); return v % 2n === 1n && v / 2n >= 2n ** 52n && v / 2n < 2n ** 53n; };   // 7^n / 2 halfway between two doubles
    const lateE = diffE.filter(n => n >= 10);
    out(`  why the straight word mostly ties instead of inverting: [0]^n sits at (cosh n tau, sinh n tau, 0, 0), and the two coordinates are different`);
    out(`  doubles only at depths ${runs(diffE)} (rounded exact) and ${runs(diffP)} (point()), for n = 1..${MAX4 + 2}${lateE.length ? `;${lateE.map(n => ` at depth ${n}, 7^${n} / 2 lies exactly halfway between two doubles (${midpoint(n) ? 'checked' : 'NOT the case'}), so cosh rounds up and sinh down`).join(';')}` : ''}.`);
    const fromOnArr = arr => { let d = null; for (let n = MAX4; n >= 1 && arr[n]; n--) d = n; return d; };
    out(`  Where both points have equal coordinates the float product is exactly 0: the products with all 4 candidates on the word's own line (exactly -25/7 or -1201/49)`);
    out(`  are 0 at every depth from ${fromOnArr(item4.lineZeroP)} with point() and from ${fromOnArr(item4.lineZeroE)} with the rounded exact points, so those exact levels meet in float ties.`);
    out(`  first depth at which float decode fails, random words: point() ${fd('rnd point()')}, rounded exact ${fd('rnd exact')}`);
    out(`  first depth at which float decode fails, straight word: point() ${fd('str point()')}, rounded exact ${fd('str exact')}`);
    out(`  decodeExact(pointExact(w), n) returned the word on ${item4.exactDecodes}/${item4.rankings} ranked words; the adjacent-level and all-pairs inversion tests agreed on every ranking`);
    out(`~ item 4: ${msSince(t4).toFixed(0)} ms`);
    out('');
}

// =====================================================================================================================
// 5. Exact point cost by depth
// =====================================================================================================================
{
    const t5 = process.hrtime.bigint();
    out(`5. Exact point cost by depth n = 1..${MAX5} (pointExact; max over the 4 coordinates and the ${N_RANK} random words, or the straight word)`);
    out('  every coordinate is an integer over 7^k, k <= n; columns: max numerator bits / max denominator bits');
    const stats = {};
    let allPow7 = true, denExact = 0, denTotal = 0;
    for (let n = 1; n <= MAX5; n++) {
        if (!wordsAt[n]) { const rng = new Rng(90000 + n); wordsAt[n] = []; for (let i = 0; i < N_RANK; i++) wordsAt[n].push(randomWord(rng, n)); }
        const measure = ws => {
            let nb = 0, db = 0;
            for (const w of ws) for (const x of PE(w)) {
                nb = Math.max(nb, bitLen(x.n)); db = Math.max(db, bitLen(x.d));
                if (!isPow7Divisor(x.d) || pow7(n) % x.d !== 0n) allPow7 = false;
                if (x.n !== 0n) { denTotal++; if (x.d === pow7(n)) denExact++; }
            }
            return [nb, db];
        };
        stats[n] = { rnd: measure(wordsAt[n]), str: measure([straightWord(n)]) };
    }
    assert(allPow7, 'every denominator divides 7^n');
    const show = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 27, 28, 30, 32, 36, 40, 44, 48, 52, 56, 60];
    for (const n of show) out(`    n=${String(n).padStart(2)}  random ${String(stats[n].rnd[0]).padStart(3)}/${String(stats[n].rnd[1]).padStart(3)}   straight ${String(stats[n].str[0]).padStart(3)}/${String(stats[n].str[1]).padStart(3)}   log2 7^n = ${(n * Math.log2(7)).toFixed(1)}`);
    const slope = (k, a, b) => ((stats[b][k][0] - stats[a][k][0]) / (b - a)).toFixed(2);
    out(`  numerator growth, depth 20 -> 60: random ${slope('rnd', 20, 60)} bits per letter, straight ${slope('str', 20, 60)} (2 log2 7 = ${(2 * Math.log2(7)).toFixed(2)}); denominators ${((stats[60].rnd[1] - stats[20].rnd[1]) / 40).toFixed(2)} (log2 7 = ${Math.log2(7).toFixed(2)})`);
    out(`  nonzero coordinates whose reduced denominator is exactly 7^n: ${denExact}/${denTotal}; every denominator divides 7^n: ${allPow7}`);
    out(`  every Lorentz product checked in items 1-4 is an integer over 7^(n_a + n_b): ${lorentzChecked} products`);
    for (const n of [10, 20, 28, 40, 60]) {
        const reps = 3, ws = wordsAt[n], sw = straightWord(n);
        let t = process.hrtime.bigint();
        for (let r = 0; r < reps; r++) for (const w of ws) emb.pointExact(w);
        const msR = msSince(t) / (reps * ws.length);
        t = process.hrtime.bigint();
        for (let r = 0; r < reps; r++) emb.pointExact(sw);
        const msS = msSince(t) / reps;
        out(`~   n=${n}: ${msR.toFixed(2)} ms per exact point (random), ${msS.toFixed(2)} ms (straight); float point(): ${(() => { const t2 = process.hrtime.bigint(); for (let r = 0; r < 200; r++) emb.point(ws[r % ws.length]); return (msSince(t2) / 200 * 1000).toFixed(1); })()} us`);
    }
    item4.stats = stats;
    out(`~ item 5: ${msSince(t5).toFixed(0)} ms`);
    out('');
}

// =====================================================================================================================
// 6. Exact ties
// =====================================================================================================================
{
    out('6. Exact ties');
    out(`  item 2: comparisons with d_T(a,b) < d_T(a,c) and d_H(a,b) = d_H(a,c) exactly: ${item2.tie} of ${item2.cmp}`);
    out(`  item 4: rankings with an exact tie among distinct candidates: ${item4.withTies}/${item4.rankings} (${item4.tieGroups} tie groups; ${item4.cands} candidates in ${item4.levels} exact levels);`);
    out(`    rankings whose nearest exact level is exactly the parent and the 5 children, all at cosh d = 25/7: ${item4.topOk}/${item4.rankings}`);
    for (const [k, r] of Object.entries(item3)) {
        out(`  item 3 [${k}]: queries with an exact tie among candidates ${r.qAnyTie}/${r.N}; with a neighbour/non-neighbour tie ${r.qTieRel}/${r.N};`);
        out(`    a float evaluator (acosh of the float64 product of the rounded exact points, ties broken by node index) gives a different AP`);
        out(`    from the pessimistic exact evaluator on ${r.qFloatDiff}/${r.N} queries (${r.qFloatDiffTie} of them have a neighbour/non-neighbour tie)`);
    }
    out('');
}

// =====================================================================================================================
// SETTLES
// =====================================================================================================================
{
    const a = item3['5,5,5'], b2 = item3['25,5,5'], b3 = item3['125,5,5'], bb = item3['25,25'], st = item4.stats;
    const fi = k => (item4.first[k] === undefined ? `none to ${MAX4}` : String(item4.first[k]));
    const fd = k => (item4.firstDec[k] === undefined ? `none to ${MAX4}` : String(item4.firstDec[k]));
    const revDeltas = Object.keys(item2.byDelta).map(Number).filter(d => item2.byDelta[d][1] > 0).sort((x, y) => x - y);
    out('SETTLES:');
    out(`- Distances at t = 3/4: parent-child tau = ln 7 = ${f4(TAU)} (cosh 25/7); siblings at 90 deg ${f4(item1.d90)} (cosh 625/49); siblings at 180 deg`);
    out(`  and the straight grandchild 2 tau = ${f4(item1.d180)} (cosh 1201/49). One 90 deg bend between two edges loses ${f4(item1.loss)}; the loss tends to`);
    out(`  ln 2 = ${f4(Math.LN2)} for long edges; on long paths it is ${f4(item1.perBendAlways)} per bend when every step bends and ${f4(item1.perBendRandom)} on random words.`);
    out(`- Hyperbolic distance reverses tree-distance order in ${item2.rev} of ${item2.cmp} comparisons (${pct(item2.rev, item2.cmp)}) on the radius-4 ball, only at hop`);
    out(`  differences ${revDeltas.map(d => '+' + d).join(' and ')}; tau * d_T - d_H ranges from 0 to ${f4(item2.gmax)}.`);
    out(`- Ranking must be exact. Float64 Lorentz ranking of the rounded exact points (L4(b)) first inverts an exactly strict order at depth ${fi('str inv e')}`);
    out(`  on the straight word and ${fi('rnd inv e')} on random words, and fails (inversion or float tie) on all 20 random words at every depth from ${fi('rnd all e')}; with the`);
    out(`  float placement point() the depths are ${fi('str inv p')}, ${fi('rnd inv p')} and ${fi('rnd all p')}. Float32 first inverts at depth ${fi('str inv s')} (straight) and ${fi('rnd inv s')} (random);`);
    out(`  its products overflow from depth ${item4.nonfinFirst}. Float decode(point(w)) first fails at depth ${fd('rnd point()')} on random words (${fd('str point()')} on the straight`);
    out(`  word); decodeExact never failed (${item4.exactDecodes}/${item4.rankings}).`);
    out(`- Bit budget: at depth 28, <= ${st[28].rnd[0]}-bit numerators (random), ${st[28].str[0]} (straight) and ${st[28].rnd[1]}-bit denominators (7^28); at depth 60,`);
    out(`  ${st[60].rnd[0]} / ${st[60].str[0]} / ${st[60].rnd[1]}. Every coordinate at depth n is an integer over 7^n and every Lorentz product an integer over 7^(n_a + n_b),`);
    out('  so ranking by an integer key is exact.');
    out(`- Graph-edge MAP with pessimistic ties: perfect 5-ary subtree of depth 3 = ${qShow(a.map)} (${a.qTieRel} neighbour/non-neighbour ties);`);
    out(`  root with 25 children (m = 2) = ${b2.map.toNumber().toFixed(6)}; root with 125 children (m = 3) = ${b3.map.toNumber().toFixed(6)}; 25-ary at every level (m = 2) = ${bb.map.toNumber().toFixed(6)}`);
    out(`  (optimistic ${bb.mapOpt.toNumber().toFixed(6)}). Neighbour/non-neighbour exact ties appear only with virtual letters (${b2.qTieRel}, ${b3.qTieRel} and ${bb.qTieRel} queries):`);
    out('  the virtual-letter tie effect behind the doubt in L6(c).');
    out(`- L4 controls: float32 already inverts at depth ${fi('rnd inv s')}; exact neighbour/non-neighbour ties exist in virtual-letter trees, and there a float evaluator`);
    out(`  with index tie-breaking differs from the pessimistic exact AP on ${b2.qFloatDiff + b3.qFloatDiff + bb.qFloatDiff} queries (${a.qFloatDiff} in the perfect 5-ary tree).`);
    out(`~ total runtime ${(msSince(T0) / 1000).toFixed(1)} s`);
}
