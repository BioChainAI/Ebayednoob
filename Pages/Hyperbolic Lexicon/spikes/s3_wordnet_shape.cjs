// Hyperbolic Lexicon, Phase 0, spike S3: the shape of the WordNet 3.0 verb forest and of Owl Academy's canon tree
// under the L3 address rule, their exact H^3 points, and exact-tree graph-edge and closure MAP with pessimistic ties.
//
// WHAT IT MEASURES.
//   0. Metadata only: noun and verb synset counts, the noun closure edge count and the mammal set size. The noun
//      numbers are echoed from reference/golden/wordnet_v1.meta.json (only the synset counts are recounted, as map
//      sizes). No noun word, point, rank, MAP or engram key is computed anywhere in this spike.
//   1. On the VERB forest and on the canon tree: depth and branching distributions, the single-child share, letters
//      per node under the L3 rule, the word-length distribution, the maximum word length, and the shares of words
//      with <= 25 letters (the id59 / kernel 0xA tile limit) and <= 27 letters (id64).
//   2. The exact H^3 point of every node, by HPDecode3D.TreeEmbedding3D.pointExact (t = 3/4): the sheet identity,
//      numerator and denominator bits per coordinate (lowest terms) by word length, and "~" milliseconds per point.
//      Second way: every point is recomputed as an integer frame product (the step matrices times 7, BigInt) and
//      compared with pointExact.
//   3. Exact-tree GRAPH-EDGE MAP on the verb forest, with pessimistic ties, and CLOSURE MAP on the same queries;
//      the registered line "VERB GRAPH-EDGE MAP (exact H^3, L3 rule) = ..." is printed on its own. Also: breakdowns,
//      the optimistic-tie MAP for contrast, and what query sampling would have given.
//   4. The same graph-edge and closure MAP on the canon tree (all nodes).
//   5. s3_wordnet_shape.py (python3 -B -I, started by this script and run concurrently) recomputes the verb forest,
//      the words, the points (hpstep integer frames, checked against hpstep point_exact), the rankings and the
//      graph-edge and closure MAP with exact integers and Fractions, independently of every line of this file. Its
//      values are compared here: the exact MAP rationals by SHA-256 of "n/d", the per-query AP lists by SHA-256, and
//      16 truncated decimals.
//
// THE L3 RULE AS APPLIED HERE (from the spec; the readings chosen where it is open are marked "reading").
//   - Spanning parent: the first '@' or '@i' pointer of the data line (wordnet_v1.cjs spanningParent; verbs have only
//     '@'). Children are ordered by synset offset.
//   - Verbs have 559 roots, so a VIRTUAL verb root sits at the word [1] and the verb roots are its children, in offset
//     order. The virtual root is never a query or a candidate.
//   - Child k of a node with c children gets m = max(1, ceil(log5 c)) letters: the m base-5 digits of k, most
//     significant first, each choosing P.children(current word)[digit] (HPCore.P). ceil(log5 c) is the least m with
//     5^m >= c, computed in integers.
//   - Canon tree (reading): canon.manifest.json describes 145 tomes, each naming its dept and its artifact. The tree is
//     canon root > dept > artifact > tome: one root node standing for the manifest (owl-canon/1), the 10 distinct depts,
//     the 13 distinct artifacts (each inside the dept its tomes name) and the 145 tomes; 169 nodes. The root sits at
//     the word [0]. Children are ordered by the manifest's own order key, globalIndex (its center-to-rim seat): a
//     tome by its globalIndex, a dept or artifact by the smallest globalIndex of its tomes. The script checks that
//     this equals the dept enum order I..X, the artifact number order and the clusterIndex order (0..c-1).
//     The canon root is a real node (it is the canon itself), so "all nodes" means all 169 as queries and
//     candidates; the variant with the root treated as virtual (168 nodes) is printed for contrast only.
//   - Neighbours (graph-edge): the spanning parent, unless it is the virtual root, plus the children. Queries: every
//     real node with at least one neighbour (for verbs: all but the 225 isolated roots, which stay candidates).
//     Candidates: every other real node. Closure neighbours: all ancestors and descendants in the '@' closure
//     (wordnet_v1.cjs closure(), multiple inheritance kept), on the same queries; for the canon tree, its own
//     ancestors and descendants.
//   - Ranking: by the exact Lorentz product with the query's exact point. A point at word length n is an integer
//     vector over 7^n; every point is scaled to the common denominator 7^Lmax (Lmax = the maximum word length), and the
//     integer key of candidate v for query u is -<X_u, X_v>_L * 7^(2 Lmax) = cosh d(u,v) * 7^(2 Lmax) (smaller =
//     nearer). AP: precision at each neighbour, ties pessimistic: inside a group of equal keys every non-neighbour
//     ranks before every neighbour. MAP = mean AP over the queries, an exact rational.
//   - Query sampling (reading): every query is run (13,542 for verbs), so nothing is sampled. To settle what sampling
//     would do, the script also reports the MAP of the queries drawn by Rng(90000).sample(nQ, 2000) and
//     Rng(90001).sample(nQ, 1000) (indices into the query list in offset order), and the spread of 20 replicate
//     1,000-query samples Rng(90010+i), i = 0..19.
//
// CHECKS (two ways). Points: pointExact against the BigInt frame product on every node, and the exact sheet identity.
// Ranking: the fast integer path against a second path that ranks with Q Lorentz products (X.lorentz on the pointExact
// points) and an explicit sort (non-neighbours first inside ties), on the verb queries Rng(90002).sample(nQ, 10) plus
// the query with the most graph-edge neighbours and the one with the most closure neighbours (both are 00126264
// change.v, so 11 queries), and on every canon query.
// MAP: the exact rational against a float64 sum of the per-query APs (|difference| < 1e-12). Python: section 5.
// The script throws if any check fails.
//
// HOW TO RUN, from the repository root:
//   node "Pages/Hyperbolic Lexicon/spikes/s3_wordnet_shape.cjs" > "Pages/Hyperbolic Lexicon/spikes/s3_wordnet_shape_output.txt"
// An optional argument gives the path of an Owl-Academy checkout (default: ../../../../Owl-Academy from this file).
// The WordNet archive must be in the cache (reference/golden/make_wordnet_v1.cjs). python3 with numpy is needed for
// section 5 (hpstep is imported in place from Pages/Hyperbolic Oracles/reference; nothing is written there).
// Lines that begin with "~ " depend on the machine or the runtime (versions, timings); tests/spikes.cjs ignores them.
// Every other line must be identical on a rerun.
//
// WHAT IT SETTLES (decides no claim; runs before PREREGISTRATION.md is written; no number here is a finding of any
// registered test): the value behind L6(c)'s prediction rule ("supported if S3's exact-tree graph-edge MAP on verbs
// is >= 0.90, otherwise refuted"); the bit and time budgets of exact points and exact ranking; whether query sampling
// is needed; how many words exceed the kernel's 25-letter tile limit.
//
// DATA AND SEEDS. WordNet 3.0 VERBS (data.verb of the SHA-256-pinned nltk_data archive, via wordnet_v1.cjs) and Owl
// Academy's canon/canon.manifest.json (read only; its SHA-256 is printed). Nouns: counts only. Randomness only from
// HPCore.Rng: Rng(90000) the 2,000-query sample, Rng(90001) the 1,000-query sample, Rng(90002) the verification
// queries, Rng(90010..90029) the replicate samples; the Python script uses Rng(90003) for its point_exact sample.
//
// RUNTIME. About 70 s wall on the build machine (Node 22.23.4, Python 3.13.18, 4 cores): the JS ranking of all
// 13,542 verb queries against 13,766 candidates takes about 40 s (about 2.9 ms per query), pointExact on every node
// about 4 s, the Q-path verification about 4 s; the Python recomputation (about 70 s, 5 ms per query) runs at the
// same time in its own process, so the script's wall time is about Python's.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const C = require('../../Hyperbolic Oracles/hyperbolic_core.js');
const D = require('../../Hyperbolic Oracles/decoder3d.js');
const W = require('../reference/golden/wordnet_v1.cjs');
const { Q, P, X, Rng } = C;

const T0 = process.hrtime.bigint();
const msSince = t => Number(process.hrtime.bigint() - t) / 1e6;
const out = s => console.log(s);
const assert = (ok, what) => { if (!ok) throw new Error('S3 check failed: ' + what); };
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const absB = a => (a < 0n ? -a : a);
const bitLen = a => (a === 0n ? 0 : absB(a).toString(2).length);
const pct = (a, b) => (b ? (100 * a / b).toFixed(2) + '%' : '-');
const f4 = x => x.toFixed(4);
const pow7 = k => 7n ** BigInt(k);
const qi = (a, b = 1) => new Q(BigInt(a), BigInt(b));
const wstr = w => '[' + w.join(',') + ']';
const wkey = w => w.join('');

const ARGS = process.argv.slice(2);
const OWL = path.resolve(ARGS[0] || path.join(__dirname, '..', '..', '..', '..', 'Owl-Academy'));
const CANON_PATH = path.join(OWL, 'canon', 'canon.manifest.json');
const META = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reference', 'golden', 'wordnet_v1.meta.json'), 'utf8'));
const PY_SCRIPT = path.join(__dirname, 's3_wordnet_shape.py');

// ---- start the Python recomputation now; it runs on another core while the JS works, and is collected in section 5
const pyRun = new Promise(resolve => {
    const t = process.hrtime.bigint();
    let so = '', se = '';
    let child;
    try { child = spawn('python3', ['-B', '-I', PY_SCRIPT, OWL], { stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { resolve({ code: -1, so, se: String(e), ms: 0 }); return; }
    child.stdout.on('data', d => { so += d; });
    child.stderr.on('data', d => { se += d; });
    child.on('error', e => resolve({ code: -1, so, se: se + String(e), ms: msSince(t) }));
    child.on('close', code => resolve({ code, so, se, ms: msSince(t) }));
});

// ---- the L3 rule
const lettersFor = c => { let m = 0, p = 1; while (p < c) { p *= 5; m++; } return Math.max(1, m); };   // max(1, ceil(log5 c))
function childWord(parentWord, k, c) {
    const m = lettersFor(c), digits = [];
    let x = k;
    for (let i = 0; i < m; i++) { digits.unshift(x % 5); x = Math.floor(x / 5); }
    assert(x === 0, 'k < 5^m');
    const w = parentWord.slice();
    for (const d of digits) w.push(P.children(w)[d]);
    return w;
}
// a tree: nodes with parent index (-1 for a child of the root word), ordered children, word, depth, incoming letters
// rootWord is the word of the root; realRoot says whether the root is a node of its own (canon) or virtual (verbs)
function buildTree(childrenOf, topLevel, rootWord, realRoot) {
    const nodes = [], index = new Map();
    const add = (id, word, parent, depth, mIn) => { index.set(id, nodes.length); nodes.push({ id, word, parent, depth, mIn, children: [] }); return nodes.length - 1; };
    const walk = (id, word, parent, depth, mIn) => {
        const i = add(id, word, parent, depth, mIn), ch = childrenOf(id);
        ch.forEach((cid, k) => { const j = walk(cid, childWord(word, k, ch.length), i, depth + 1, lettersFor(ch.length)); nodes[i].children.push(j); });
        return i;
    };
    let rootIndex = -1;
    if (realRoot) rootIndex = walk(topLevel.root, rootWord, -1, 0, 0);
    else topLevel.list.forEach((id, k) => walk(id, childWord(rootWord, k, topLevel.list.length), -1, 0, lettersFor(topLevel.list.length)));
    return { nodes, index, rootIndex };
}

// ---- exact points: pointExact, the integer frame product, bits
const emb = new D.TreeEmbedding3D();   // t = 3/4
const STEP7 = emb.stepQ.map(M => M.map(row => row.map(x => { const y = x.mul(qi(7)); assert(y.d === 1n, 'step x 7 is an integer'); return y.n; })));
const LOCAL = [0, 2, 3, 4, 5];
const slotDir = (word, g) => (word.length ? LOCAL[P.children(word).indexOf(g)] : g);
const imm = (A, B) => A.map(row => [0, 1, 2, 3].map(c => row[0] * B[0][c] + row[1] * B[1][c] + row[2] * B[2][c] + row[3] * B[3][c]));
const I4 = [[1n, 0n, 0n, 0n], [0n, 1n, 0n, 0n], [0n, 0n, 1n, 0n], [0n, 0n, 0n, 1n]];
// integer frame of a word, extending a known frame of one of its prefixes
const extendFrame = (F, fromWord, word) => { let M = F; for (let i = fromWord.length; i < word.length; i++) M = imm(M, STEP7[slotDir(word.slice(0, i), word[i])]); return M; };

function pointsOf(tree, label, rootWordForVirtual) {
    const { nodes } = tree;
    const t = process.hrtime.bigint();
    const pts = nodes.map(nd => emb.pointExact(nd.word));
    const tPE = msSince(t);
    // second way: integer frames, each from its parent's frame (or from the root word's frame)
    const frames = new Array(nodes.length);
    const baseWord = rootWordForVirtual || [], baseFrame = extendFrame(I4, [], baseWord);
    const frameOf = i => {        // memoised: a parent may come after its child in the node order (verbs are in offset order)
        if (!frames[i]) { const nd = nodes[i]; frames[i] = nd.parent >= 0 ? extendFrame(frameOf(nd.parent), nodes[nd.parent].word, nd.word) : extendFrame(baseFrame, baseWord, nd.word); }
        return frames[i];
    };
    nodes.forEach((nd, i) => frameOf(i));
    let agree = 0, sheet = 0, maxNum = 0, maxDen = 0;
    const byLen = new Map();
    const ints = [];
    nodes.forEach((nd, i) => {
        const n = nd.word.length, S = pow7(n), p = pts[i];
        const iv = p.map(x => { assert(S % x.d === 0n, `${label}: a coordinate of ${wstr(nd.word)} is over 7^n`); return x.n * (S / x.d); });
        if (iv.every((v, k) => v === frames[i][k][0])) agree++;
        if (X.onSheet(p)) sheet++;
        ints.push(iv);
        const nb = Math.max(...p.map(x => bitLen(x.n))), db = Math.max(...p.map(x => bitLen(x.d)));
        maxNum = Math.max(maxNum, nb); maxDen = Math.max(maxDen, db);
        const b = byLen.get(n) || { count: 0, num: 0, den: 0 };
        b.count++; b.num = Math.max(b.num, nb); b.den = Math.max(b.den, db); byLen.set(n, b);
    });
    assert(agree === nodes.length, `${label}: pointExact equals the integer frame product on every node`);
    assert(sheet === nodes.length, `${label}: every point satisfies the sheet identity exactly`);
    return { pts, ints, tPE, agree, sheet, maxNum, maxDen, byLen };
}

// ---- exact ranking and AP with pessimistic ties
// keyed ranking of one query u against every other node; nbrSets = [{ list, flag }]; returns per set the AP (Q),
// the optimistic AP (Q) and whether a neighbour ties with a non-neighbour
function rankQuery(u, A, keys, nbrSets, N) {
    const [A0, A1, A2, A3] = A, a0 = A0[u], a1 = A1[u], a2 = A2[u], a3 = A3[u];
    for (let v = 0; v < N; v++) keys[v] = a0 * A0[v] - a1 * A1[v] - a2 * A2[v] - a3 * A3[v];
    const tset = new Set();
    for (const s of nbrSets) for (const v of s.list) { tset.add(keys[v]); s.flag[v] = 1; }
    const T = [...tset].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)), nT = T.length;
    const lessStart = new Int32Array(nT + 1), eqAll = new Int32Array(nT), eqIn = nbrSets.map(() => new Int32Array(nT));
    let kmax = 0n;
    for (let v = 0; v < N; v++) {
        if (v === u) continue;
        const k = keys[v];
        if (k > kmax) kmax = k;
        let lo = 0, hi = nT;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (T[mid] < k) lo = mid + 1; else hi = mid; }
        if (lo < nT && T[lo] === k) {
            eqAll[lo]++; lessStart[lo + 1]++;
            for (let s = 0; s < nbrSets.length; s++) if (nbrSets[s].flag[v]) eqIn[s][lo]++;
        } else lessStart[lo]++;
    }
    const maxNbrKeyBits = bitLen(T[nT - 1]), maxKeyBits = bitLen(kmax);
    const less = new Int32Array(nT);
    let acc = 0;
    for (let t = 0; t < nT; t++) { acc += lessStart[t]; less[t] = acc; }   // candidates with key < T[t]
    const res = nbrSets.map((s, si) => {
        const eqR = eqIn[si];
        let before = 0, pess = Q.ZERO, opt = Q.ZERO, tie = false;
        for (let t = 0; t < nT; t++) {
            const g = eqR[t];
            if (!g) continue;
            const eNon = eqAll[t] - g;
            if (eNon > 0) tie = true;
            for (let i = 1; i <= g; i++) {
                pess = pess.add(qi(before + i, less[t] + eNon + i));
                opt = opt.add(qi(before + i, less[t] + i));
            }
            before += g;
        }
        assert(before === s.list.length, 'every neighbour is counted once');
        for (const v of s.list) s.flag[v] = 0;
        return { ap: pess.div(qi(s.list.length)), opt: opt.div(qi(s.list.length)), tie };
    });
    return { res, maxKeyBits, maxNbrKeyBits };
}
// second way: Q Lorentz products of the pointExact points and an explicit sort, non-neighbours first inside ties
function apSlow(u, pts, nbrList, N) {
    const R = new Set(nbrList), pu = pts[u], cand = [];
    for (let v = 0; v < N; v++) if (v !== u) cand.push({ s: X.lorentz(pu, pts[v]), r: R.has(v) ? 1 : 0 });
    cand.sort((a, b) => b.s.cmp(a.s) || (a.r - b.r));            // larger Lorentz product = nearer
    let hits = 0, sum = Q.ZERO;
    cand.forEach((c, pos) => { if (c.r) { hits++; sum = sum.add(qi(hits, pos + 1)); } });
    return sum.div(qi(R.size));
}
// exact sum of many rationals: group equal values, then a balanced (binary-splitting) sum
function qSum(values) {
    const groups = new Map();
    for (const q of values) { const k = q.toString(); const g = groups.get(k); if (g) g.c++; else groups.set(k, { q, c: 1 }); }
    let list = [...groups.values()].map(g => g.q.mul(qi(g.c)));
    if (!list.length) return Q.ZERO;
    while (list.length > 1) { const nx = []; for (let i = 0; i < list.length; i += 2) nx.push(i + 1 < list.length ? list[i].add(list[i + 1]) : list[i]); list = nx; }
    return list[0];
}
const qMean = values => qSum(values).div(qi(values.length));
// decimals of a nonnegative rational: truncated to k digits, and rounded half up to k digits
function qTrunc(q, k) { const s = 10n ** BigInt(k), x = q.n * s / q.d; return `${x / s}.${(x % s).toString().padStart(k, '0')}`; }
function qRound(q, k) { const s = 10n ** BigInt(k), x = (2n * q.n * s + q.d) / (2n * q.d); return `${x / s}.${(x % s).toString().padStart(k, '0')}`; }
const qDigits = q => `${q.n.toString().length}-digit / ${q.d.toString().length}-digit rational`;
const qShow = q => (q.n.toString().length + q.d.toString().length <= 40 ? `${q}` : `a ${qDigits(q)}`);
const qSha = q => sha256(`${q.n}/${q.d}`);
const apSha = (ids, aps) => sha256(ids.map((id, i) => `${id} ${aps[i].n}/${aps[i].d}\n`).join(''));

// histogram helper: "k:count" pairs
const histLine = m => [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, c]) => `${k}:${c}`).join(' ');
const wrap = (prefix, s, width = 112) => { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { if (cur && (prefix.length + cur.length + 1 + w.length) > width) { lines.push(prefix + cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) lines.push(prefix + cur); return lines; };

// shape report for a tree
function shapeReport(tree, label, virtualRoot) {
    const { nodes } = tree, N = nodes.length;
    const depthH = new Map(), branchH = new Map(), mH = new Map(), lenH = new Map(), lenByDepth = new Map();
    let internal = 0, single = 0, onlyChildren = 0, gt5 = 0, gt25 = 0, maxLen = 0, virtualLetters = 0, letters = 0;
    for (const nd of nodes) {
        depthH.set(nd.depth, (depthH.get(nd.depth) || 0) + 1);
        const c = nd.children.length;
        if (c) { internal++; branchH.set(c, (branchH.get(c) || 0) + 1); if (c === 1) single++; if (c > 5) gt5++; if (c > 25) gt25++; }
        if (nd.mIn) { mH.set(nd.mIn, (mH.get(nd.mIn) || 0) + 1); letters += nd.mIn; virtualLetters += nd.mIn - 1; }
        const L = nd.word.length;
        lenH.set(L, (lenH.get(L) || 0) + 1); maxLen = Math.max(maxLen, L);
        const b = lenByDepth.get(nd.depth) || { min: Infinity, max: 0, sum: 0, n: 0 };
        b.min = Math.min(b.min, L); b.max = Math.max(b.max, L); b.sum += L; b.n++; lenByDepth.set(nd.depth, b);
        if (nd.parent >= 0 && nodes[nd.parent].children.length === 1) onlyChildren++;
    }
    const le = k => nodes.filter(nd => nd.word.length <= k).length;
    return { N, depthH, branchH, mH, lenH, lenByDepth, internal, single, onlyChildren, gt5, gt25, maxLen, virtualLetters, letters, le25: le(25), le27: le(27), virtualRoot };
}
function printShape(sh, label, extra) {
    out(`  depth (top-level nodes = 0) histogram, with word length min..max (mean) at each depth:`);
    for (const [d, c] of [...sh.depthH.entries()].sort((a, b) => a[0] - b[0])) {
        const b = sh.lenByDepth.get(d);
        out(`    depth ${String(d).padStart(2)}: ${String(c).padStart(6)} nodes, word length ${b.min}..${b.max} (mean ${(b.sum / b.n).toFixed(2)})`);
    }
    out(`  internal nodes (>= 1 child): ${sh.internal}; children per internal node, c:count:`);
    for (const l of wrap('    ', histLine(sh.branchH))) out(l);
    const byM = [0, 0, 0, 0, 0];
    for (const [c, n] of sh.branchH) byM[lettersFor(c)] += n;
    out(`  internal nodes by letters per child m = max(1, ceil(log5 c)): m=1 (c <= 5): ${byM[1]}, m=2 (6..25): ${byM[2]}, m=3 (26..125): ${byM[3]}, m=4 (126..625): ${byM[4]}`);
    out(`  nodes with more than 5 children: ${sh.gt5}; more than 25: ${sh.gt25}${extra || ''}`);
    out(`  single-child share: ${sh.single}/${sh.internal} internal nodes have exactly one child (${pct(sh.single, sh.internal)}); ${sh.onlyChildren}/${sh.N} nodes are only children (${pct(sh.onlyChildren, sh.N)})`);
    out(`  letters per node (on the edge from its parent${sh.virtualRoot ? ', the virtual root included' : ''}): ${[1, 2, 3, 4].filter(m => sh.mH.get(m)).map(m => `m=${m}: ${sh.mH.get(m)}`).join(', ')}; mean ${(sh.letters / [...sh.mH.values()].reduce((a, b) => a + b, 0)).toFixed(4)} letters per edge; ${sh.virtualLetters} virtual letters (letters beyond the first on an edge)`);
    out(`  word length histogram, length:count:`);
    for (const l of wrap('    ', histLine(sh.lenH))) out(l);
    out(`  maximum word length ${sh.maxLen}; words with <= 25 letters: ${sh.le25}/${sh.N} (${pct(sh.le25, sh.N)}); <= 27 letters: ${sh.le27}/${sh.N} (${pct(sh.le27, sh.N)})`);
}

function printPoints(P3, label, tree) {
    out(`  ${label}: pointExact on all ${tree.nodes.length} nodes; sheet identity exact on ${P3.sheet}/${tree.nodes.length}; every coordinate is an integer over 7^n (n = word length);`);
    out(`    equal to the BigInt frame product (step matrices x 7, second way) on ${P3.agree}/${tree.nodes.length}`);
    out(`    max bits per coordinate (lowest terms): numerator ${P3.maxNum}, denominator ${P3.maxDen}; by word length n, max numerator/denominator bits:`);
    const parts = [...P3.byLen.entries()].sort((a, b) => a[0] - b[0]).map(([n, b]) => `${n}:${b.num}/${b.den}`);
    for (const l of wrap('      ', parts.join(' '))) out(l);
}

async function main() {
    out('S3 s3_wordnet_shape: the WordNet 3.0 verb forest and Owl Academy\'s canon tree under the L3 address rule: shape, exact H^3 points (TreeEmbedding3D, t = 3/4), exact-tree graph-edge and closure MAP with pessimistic ties');
    out('Settles: the value behind L6(c)\'s prediction rule; the bit and time budgets; query sampling; the kernel\'s 25-letter tile limit. Decides no claim. Verbs and the canon tree only; nouns are counted, never addressed or ranked.');
    out(`~ node ${process.version}, HPCore ${C.version}, HPDecode3D ${D.version}, ${process.platform}-${process.arch}`);
    out('');

    // =================================================================================================================
    // 0. Data and metadata
    // =================================================================================================================
    const t0 = process.hrtime.bigint();
    const { buf } = W.readArchive();
    const wn = W.load();
    const V = wn.synsets.verb;
    const canonBytes = fs.readFileSync(CANON_PATH), canon = JSON.parse(canonBytes.toString('utf8'));
    out('0. Data and metadata (counts only for nouns)');
    out(`  wordnet.zip (nltk_data, WordNet 3.0): ${buf.length} B, sha256 ${sha256(buf)} (pinned ${W.ZIP_SHA256 === sha256(buf) ? 'yes' : 'NO'}); data.verb sha256 ${sha256(wn.files.get('wordnet/data.verb'))}`);
    out(`  canon/canon.manifest.json (Owl-Academy, read only): ${canonBytes.length} B, sha256 ${sha256(canonBytes)}; format ${canon.format}, ${canon.tomes.length} tome records`);
    const counts = Object.fromEntries(W.POS.map(p => [p, wn.synsets[p].size]));
    for (const p of W.POS) assert(counts[p] === META.synsets[p], `${p} synset count equals the meta`);
    out(`  synsets (recounted as map sizes, equal to wordnet_v1.meta.json): noun ${counts.noun}, verb ${counts.verb}, adj ${counts.adj} (${META.synsets.adjSatellites} satellites), adv ${counts.adv}`);
    out(`  echoed from wordnet_v1.meta.json, not recomputed: noun closure edges (hypernym + instance hypernym) ${META.nouns.closureEdges}; mammal.n.01 (${META.mammal.synset}) closure ${META.mammal.closureNodes} nodes, ${META.mammal.closureEdges} edges, spanning subtree ${META.mammal.spanningNodes} nodes`);
    out(`~ load ${msSince(t0).toFixed(0)} ms`);
    out('');

    // =================================================================================================================
    // 1. Shape under the L3 rule
    // =================================================================================================================
    const t1 = process.hrtime.bigint();
    const F = W.spanningForest(V);
    const offs = [...V.keys()].sort();
    let pointersAt = 0, pointersAtI = 0, multi = 0;
    for (const s of V.values()) { const h = s.ptrs.filter(p => p.sym === '@'); pointersAt += h.length; pointersAtI += s.ptrs.filter(p => p.sym === '@i').length; if (h.length > 1) multi++; }
    const verbTree = buildTree(o => F.children.get(o) || [], { list: F.roots }, [1], false);
    const VN = verbTree.nodes;
    assert(VN.length === V.size, 'every verb synset is in the forest');
    // node order: renumber so that index = offset order
    const order = offs.map(o => VN[verbTree.index.get(o)]);
    const remap = new Map(offs.map((o, i) => [verbTree.index.get(o), i]));
    const vnodes = order.map(nd => ({ ...nd, parent: nd.parent >= 0 ? remap.get(nd.parent) : -1, children: nd.children.map(j => remap.get(j)) }));
    const vt = { nodes: vnodes, index: new Map(offs.map((o, i) => [o, i])) };
    assert(new Set(vnodes.map(nd => wkey(nd.word))).size === vnodes.length, 'verb words are distinct');
    assert(vnodes.every(nd => P.isReduced(nd.word) && wkey(nd.word).startsWith('1')), 'verb words are reduced and start with the virtual root letter 1');
    assert(vnodes.every(nd => nd.parent < 0 || wkey(nd.word).startsWith(wkey(vnodes[nd.parent].word))), 'a parent word is a prefix of its child word');
    assert(F.roots.length === META.verbs.spanningRoots && F.children.size === META.verbs.internalNodes, 'verb roots and internal nodes equal the meta');
    const isolated = vnodes.filter(nd => nd.parent < 0 && !nd.children.length).length;
    const shV = shapeReport(vt, 'verbs', true);
    out('1. Shape under the L3 rule');
    out(`  (a) VERB forest: ${vnodes.length} synsets, ${F.roots.length} roots (no '@' pointer; ${isolated} of them isolated: no children), ${pointersAt} '@' pointers, ${pointersAtI} '@i';`);
    out(`      ${multi} synsets have more than one '@' (the spanning parent is the first; the closure keeps all)`);
    out(`      virtual root [1] with ${F.roots.length} children, m = ${lettersFor(F.roots.length)} letters each, so every verb root has a ${1 + lettersFor(F.roots.length)}-letter word; P.children([1]) = [${P.children([1])}]`);
    printShape(shV, 'verbs', ` (plus the virtual root, ${F.roots.length})`);
    const longest = vnodes.filter(nd => nd.word.length === shV.maxLen);
    out(`  the ${longest.length} longest words (${shV.maxLen} letters), offset lemma depth word:`);
    for (const nd of longest) out(`    ${nd.id} ${V.get(nd.id).lemmas[0]} depth ${nd.depth} ${wkey(nd.word)}`);
    const big = vnodes.filter(nd => nd.children.length > 25).sort((a, b) => b.children.length - a.children.length || (a.id < b.id ? -1 : 1)).slice(0, 6);
    out(`  largest families: ${big.map(nd => `${nd.id} ${V.get(nd.id).lemmas[0]} (c = ${nd.children.length}, m = ${lettersFor(nd.children.length)})`).join('; ')}`);

    // canon tree
    const tomes = canon.tomes.slice().sort((a, b) => a.globalIndex - b.globalIndex);
    assert(tomes.length === 145 && new Set(tomes.map(t => t.globalIndex)).size === 145, 'canon: 145 tomes with distinct globalIndex');
    const minGI = new Map();
    for (const t of tomes) { for (const k of ['dept:' + t.dept, 'art:' + t.artifact]) if (!minGI.has(k)) minGI.set(k, t.globalIndex); }
    const depts = [...new Set(tomes.map(t => t.dept))].sort((a, b) => minGI.get('dept:' + a) - minGI.get('dept:' + b));
    const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    assert(depts.join() === ROMAN.join(), 'canon: dept order by globalIndex equals I..X');
    const artsOf = new Map(depts.map(d => [d, [...new Set(tomes.filter(t => t.dept === d).map(t => t.artifact))].sort((a, b) => minGI.get('art:' + a) - minGI.get('art:' + b))]));
    for (const [d, arts] of artsOf) { assert(arts.every((a, i) => a === `artifact-${d}-${i + 1}`), 'canon: artifact order by globalIndex equals artifact number order'); }
    const tomesOf = new Map();
    for (const t of tomes) { if (!tomesOf.has(t.artifact)) tomesOf.set(t.artifact, []); tomesOf.get(t.artifact).push(t.canonId); }
    for (const [a, list] of tomesOf) {
        const ci = list.map(id => tomes.find(t => t.canonId === id).clusterIndex);
        assert(ci.every((c, i) => c === i), `canon: clusterIndex of ${a} is 0..c-1 in globalIndex order`);
        assert(tomes.filter(t => t.artifact === a).every(t => t.dept === a.split('-')[1]), `canon: ${a} lies in one dept`);
    }
    const ROOT = 'canon';
    const canonChildren = id => (id === ROOT ? depts.map(d => 'dept-' + d) : id.startsWith('dept-') && !id.includes('/') ? artsOf.get(id.slice(5)) : id.startsWith('artifact-') ? tomesOf.get(id) : []);
    const ctBuilt = buildTree(canonChildren, { root: ROOT }, [0], true);
    const ct = { nodes: ctBuilt.nodes, index: ctBuilt.index };
    assert(ct.nodes.length === 169, 'canon: 169 nodes');
    assert(new Set(ct.nodes.map(nd => wkey(nd.word))).size === ct.nodes.length && ct.nodes.every(nd => P.isReduced(nd.word)), 'canon words are distinct and reduced');
    const shC = shapeReport(ct, 'canon', false);
    out(`  (b) CANON tree (canon root > dept > artifact > tome; root at [0]; children by globalIndex, checked equal to I..X, artifact number and clusterIndex order):`);
    out(`      ${ct.nodes.length} nodes = 1 root + ${depts.length} depts + ${[...artsOf.values()].reduce((s, a) => s + a.length, 0)} artifacts + ${tomes.length} tomes; P.children([0]) = [${P.children([0])}]`);
    printShape(shC, 'canon', '');
    const exampleIds = [ROOT, 'dept-I', 'artifact-I-1', tomes[0].canonId, 'dept-X', 'artifact-X-4', tomes[tomes.length - 1].canonId];
    out(`  example words: ${exampleIds.map(id => `${id} ${wkey(ct.nodes[ct.index.get(id)].word)}`).join('; ')}`);
    out(`~ section 1: ${msSince(t1).toFixed(0)} ms`);
    out('');

    // =================================================================================================================
    // 2. Exact points
    // =================================================================================================================
    const t2 = process.hrtime.bigint();
    out('2. Exact H^3 points (HPDecode3D.TreeEmbedding3D.pointExact, t = 3/4, cosh tau = 25/7, sinh tau = 24/7)');
    const PV = pointsOf(vt, 'verbs', [1]);
    const virt = emb.pointExact([1]);
    assert(X.onSheet(virt), 'virtual root point on the sheet');
    printPoints(PV, 'verbs', vt);
    out(`    the virtual root [1] (not a node): (${virt.join(', ')})`);
    const PC = pointsOf(ct, 'canon', null);
    printPoints(PC, 'canon', ct);
    const lmaxV = shV.maxLen, deepest = vnodes.filter(nd => nd.word.length === lmaxV);
    const td = process.hrtime.bigint();
    for (let r = 0; r < 4; r++) for (const nd of deepest) emb.pointExact(nd.word);
    const msDeep = msSince(td) / (4 * deepest.length);
    out(`~ pointExact: verbs ${PV.tPE.toFixed(0)} ms for ${vnodes.length} points (${(PV.tPE / vnodes.length).toFixed(3)} ms per point), ${msDeep.toFixed(3)} ms per point at n = ${lmaxV}; canon ${PC.tPE.toFixed(0)} ms for ${ct.nodes.length}`);
    out(`~ section 2: ${msSince(t2).toFixed(0)} ms`);
    out('');

    // sha of words and points (compared with Python in section 5)
    const verbWordsSha = sha256(vnodes.map(nd => `${nd.id} ${wkey(nd.word)}\n`).join(''));
    const verbPointsSha = sha256(vnodes.map((nd, i) => `${nd.id} ${PV.ints[i].join(',')}\n`).join(''));
    const canonWordsSha = sha256(ct.nodes.map(nd => `${nd.id} ${wkey(nd.word)}\n`).join(''));
    const canonPointsSha = sha256(ct.nodes.map((nd, i) => `${nd.id} ${PC.ints[i].join(',')}\n`).join(''));

    // =================================================================================================================
    // 3. Verb MAP
    // =================================================================================================================
    const t3 = process.hrtime.bigint();
    const N = vnodes.length;
    const gN = vnodes.map(nd => (nd.parent >= 0 ? [nd.parent] : []).concat(nd.children));
    const anc = W.closure(V);
    const ancIdx = offs.map(o => [...anc.get(o)].map(a => vt.index.get(a)));
    const desc = offs.map(() => []);
    ancIdx.forEach((list, v) => { for (const a of list) desc[a].push(v); });
    const clN = offs.map((o, v) => ancIdx[v].concat(desc[v]).sort((a, b) => a - b));
    let closurePairs = 0;
    for (const l of ancIdx) closurePairs += l.length;
    const queries = [];
    for (let v = 0; v < N; v++) if (gN[v].length) queries.push(v);
    const nQ = queries.length;
    assert(queries.every(u => clN[u].length > 0), 'every graph-edge query has closure neighbours');
    assert(queries.every(u => gN[u].every(v => clN[u].includes(v))), 'graph-edge neighbours are closure neighbours');
    const onlyClosure = vnodes.filter((nd, v) => !gN[v].length && clN[v].length).length;
    const maxG = queries.reduce((b, u) => (gN[u].length > gN[b].length ? u : b), queries[0]);
    const maxC = queries.reduce((b, u) => (clN[u].length > clN[b].length ? u : b), queries[0]);
    const sumG = queries.reduce((s, u) => s + gN[u].length, 0), sumC = queries.reduce((s, u) => s + clN[u].length, 0);

    const SCALE = lmaxV;
    const A = [0, 1, 2, 3].map(k => PV.ints.map((iv, i) => iv[k] * pow7(SCALE - vnodes[i].word.length)));
    let maxScaledBits = 0;
    for (const col of A) for (const x of col) maxScaledBits = Math.max(maxScaledBits, bitLen(x));
    const keys = new Array(N);
    const flagG = new Uint8Array(N), flagC = new Uint8Array(N);
    const apG = [], apC = [], optG = [], optC = [];
    let tieG = 0, tieC = 0, maxKeyBits = 0, maxNbrKeyBits = 0;
    const tr = process.hrtime.bigint();
    for (const u of queries) {
        const r = rankQuery(u, A, keys, [{ list: gN[u], flag: flagG }, { list: clN[u], flag: flagC }], N);
        apG.push(r.res[0].ap); optG.push(r.res[0].opt); if (r.res[0].tie) tieG++;
        apC.push(r.res[1].ap); optC.push(r.res[1].opt); if (r.res[1].tie) tieC++;
        maxKeyBits = Math.max(maxKeyBits, r.maxKeyBits); maxNbrKeyBits = Math.max(maxNbrKeyBits, r.maxNbrKeyBits);
    }
    const msRank = msSince(tr);
    const tm = process.hrtime.bigint();
    const mapG = qMean(apG), mapC = qMean(apC), mapGopt = qMean(optG), mapCopt = qMean(optC);
    const msSum = msSince(tm);
    const fG = apG.reduce((s, q) => s + q.toNumber(), 0) / nQ, fC = apC.reduce((s, q) => s + q.toNumber(), 0) / nQ;
    assert(Math.abs(fG - mapG.toNumber()) < 1e-12 && Math.abs(fC - mapC.toNumber()) < 1e-12, 'exact MAP equals the float64 sum of the APs to 1e-12');
    assert(qRound(mapG, 4) === mapG.toNumber().toFixed(4), '4-decimal rounding agrees');
    // second way on 12 queries
    const tv = process.hrtime.bigint();
    const vq = new Rng(90002).sample(nQ, 10).map(i => queries[i]);
    for (const u of [maxG, maxC]) if (!vq.includes(u)) vq.push(u);
    const PTS = PV.pts;
    for (const u of vq) {
        const qiu = queries.indexOf(u);
        assert(apSlow(u, PTS, gN[u], N).eq(apG[qiu]), `verb graph-edge AP of ${vnodes[u].id} recomputed with Q and a sort`);
        assert(apSlow(u, PTS, clN[u], N).eq(apC[qiu]), `verb closure AP of ${vnodes[u].id} recomputed with Q and a sort`);
    }
    const msVerify = msSince(tv);
    const below1G = apG.filter(q => q.cmp(Q.ONE) < 0).length, below1C = apC.filter(q => q.cmp(Q.ONE) < 0).length;
    const lemma = v => V.get(vnodes[v].id).lemmas[0];

    out('3. Exact-tree MAP on the VERB forest (H^3, L3 rule, exact integer keys, ties pessimistic)');
    out(`  queries: ${nQ} (every real verb with a graph-edge neighbour; the ${isolated} isolated roots are candidates only); ${N - 1} candidates per query; the virtual root is neither`);
    out(`  graph-edge neighbours: ${sumG} in all (mean ${(sumG / nQ).toFixed(4)}), max ${gN[maxG].length} (${vnodes[maxG].id} ${lemma(maxG)})`);
    out(`  closure neighbours (ancestors and descendants in the '@' closure): ${closurePairs} ancestor-descendant pairs; per query ${sumC} in all (mean ${(sumC / nQ).toFixed(4)}), max ${clN[maxC].length} (${vnodes[maxC].id} ${lemma(maxC)}); ${onlyClosure} non-queries have closure neighbours (an extra '@' parent)`);
    out(`  integer keys: points scaled to 7^${SCALE} (<= ${maxScaledBits}-bit coordinates); key = cosh d * 7^${2 * SCALE}; largest key of any (query, candidate) pair ${maxKeyBits} bits, of any neighbour ${maxNbrKeyBits} bits`);
    out('');
    out(`VERB GRAPH-EDGE MAP (exact H^3, L3 rule) = ${qRound(mapG, 4)} over ${nQ} queries`);
    out('');
    out(`  graph-edge MAP exactly: ${qDigits(mapG)}, sha256("n/d") ${qSha(mapG)}; truncated ${qTrunc(mapG, 16)}`);
    out(`    queries with AP < 1: ${below1G}/${nQ}; with a neighbour tied exactly with a non-neighbour: ${tieG}/${nQ}; optimistic-tie MAP (contrast only) ${qRound(mapGopt, 4)}`);
    out(`  closure MAP = ${qRound(mapC, 4)} (${qDigits(mapC)}, sha256 ${qSha(mapC)}; truncated ${qTrunc(mapC, 16)})`);
    out(`    queries with AP < 1: ${below1C}/${nQ}; with a neighbour/non-neighbour exact tie: ${tieC}/${nQ}; optimistic-tie MAP (contrast only) ${qRound(mapCopt, 4)}`);
    // breakdowns
    const groupMean = (keyOf, aps) => {
        const g = new Map();
        queries.forEach((u, i) => { const k = keyOf(u); if (!g.has(k)) g.set(k, []); g.get(k).push(aps[i]); });
        return [...g.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, l]) => `${k.padEnd(8)} ${String(l.length).padStart(6)} queries, MAP ${qRound(qMean(l), 4)}`);
    };
    const famKey = u => { const c = vnodes[u].children.length; return c ? `m_out=${lettersFor(c)}` : 'leaf'; };
    const inKey = u => `m_in=${vnodes[u].mIn}`;
    const nodes4 = nd => vnodes[nd.parent].children.length > 125;
    out(`  graph-edge MAP by the letters of the query's own children (leaf = no children):`);
    for (const l of groupMean(famKey, apG)) out('    ' + l);
    out(`  graph-edge MAP by the letters on the query's edge from its parent (m_in = 4: the ${F.roots.length - isolated} verb roots with children, and the`);
    out(`  ${vnodes.filter(nd => nd.parent >= 0 && nodes4(nd)).length} children of the ${vnodes.filter(nd => nd.children.length > 125).length} families with more than 125 children):`);
    for (const l of groupMean(inKey, apG)) out('    ' + l);
    // sampling
    const sampleMap = (idx, aps) => qMean(idx.map(i => aps[i]));
    const s2000 = new Rng(90000).sample(nQ, 2000), s1000 = new Rng(90001).sample(nQ, 1000);
    const mG2000 = sampleMap(s2000, apG), mG1000 = sampleMap(s1000, apG), mC2000 = sampleMap(s2000, apC), mC1000 = sampleMap(s1000, apC);
    const reps = [];
    for (let i = 0; i < 20; i++) { const s = new Rng(90010 + i).sample(nQ, 1000); reps.push([sampleMap(s, apG).toNumber(), sampleMap(s, apC).toNumber()]); }
    const spread = k => { const xs = reps.map(r => r[k]), m = xs.reduce((a, b) => a + b, 0) / xs.length; return { min: Math.min(...xs), max: Math.max(...xs), sd: Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / xs.length) }; };
    const spG = spread(0), spC = spread(1);
    out(`  query sampling (all ${nQ} queries were run, so nothing above is sampled; for comparison):`);
    out(`    Rng(90000).sample(${nQ}, 2000): graph-edge ${qRound(mG2000, 4)}, closure ${qRound(mC2000, 4)}; Rng(90001).sample(${nQ}, 1000): graph-edge ${qRound(mG1000, 4)}, closure ${qRound(mC1000, 4)}`);
    out(`    20 replicate 1,000-query samples Rng(90010..90029): graph-edge ${f4(spG.min)}..${f4(spG.max)} (sd ${f4(spG.sd)}), closure ${f4(spC.min)}..${f4(spC.max)} (sd ${f4(spC.sd)})`);
    out(`  second way: AP recomputed with Q Lorentz products and an explicit sort on ${vq.length} queries (Rng(90002).sample(${nQ}, 10), the most graph-edge and the most closure neighbours), graph-edge and closure: equal`);
    out(`  exact MAP against the float64 mean of the APs: |difference| < 1e-12 (graph-edge and closure)`);
    const perPair = msRank / (nQ * (N - 1));
    out(`~ exact ranking: ${(msRank / 1000).toFixed(1)} s for ${nQ} queries x ${N - 1} candidates (${(msRank / nQ).toFixed(2)} ms per query, ${(perPair * 1e6).toFixed(0)} ns per pair, both MAPs in one pass); exact MAP sums ${msSum.toFixed(0)} ms; Q-path verification ${(msVerify / 1000).toFixed(1)} s (${(msVerify / vq.length / 2).toFixed(0)} ms per AP)`);
    out(`~ extrapolation at this cost per pair (noun words are longer, so a lower bound): 1,000 queries x 82,115 noun candidates ~ ${(perPair * 1000 * 82114 / 1000).toFixed(0)} s; 200 queries ~ ${(perPair * 200 * 82114 / 1000).toFixed(0)} s`);
    out(`~ section 3: ${msSince(t3).toFixed(0)} ms`);
    out('');

    // =================================================================================================================
    // 4. Canon MAP
    // =================================================================================================================
    const t4 = process.hrtime.bigint();
    const CN = ct.nodes.length;
    const canonRun = excludeRoot => {
        const real = ct.nodes.map((nd, i) => i).filter(i => !(excludeRoot && i === ctBuilt.rootIndex));
        const pos = new Map(real.map((i, k) => [i, k])), n = real.length;
        const parentOf = i => ct.nodes[i].parent, isReal = i => i >= 0 && pos.has(i);
        const g = real.map(i => (isReal(parentOf(i)) ? [pos.get(parentOf(i))] : []).concat(ct.nodes[i].children.map(j => pos.get(j))));
        const ancOf = i => { const l = []; let p = parentOf(i); while (p >= 0) { if (isReal(p)) l.push(pos.get(p)); p = parentOf(p); } return l; };
        const ancL = real.map(ancOf), descL = real.map(() => []);
        ancL.forEach((l, k) => { for (const a of l) descL[a].push(k); });
        const cl = real.map((i, k) => ancL[k].concat(descL[k]).sort((a, b) => a - b));
        const lmax = Math.max(...real.map(i => ct.nodes[i].word.length));
        const Ac = [0, 1, 2, 3].map(c => real.map(i => PC.ints[i][c] * pow7(lmax - ct.nodes[i].word.length)));
        const kk = new Array(n), fg = new Uint8Array(n), fc = new Uint8Array(n), qs = [], aG = [], aC = [], oG = [], pts = real.map(i => PC.pts[i]);
        let tg = 0;
        for (let k = 0; k < n; k++) {
            if (!g[k].length) continue;
            qs.push(k);
            const r = rankQuery(k, Ac, kk, [{ list: g[k], flag: fg }, { list: cl[k], flag: fc }], n);
            aG.push(r.res[0].ap); oG.push(r.res[0].opt); aC.push(r.res[1].ap); if (r.res[0].tie) tg++;
            assert(apSlow(k, pts, g[k], n).eq(r.res[0].ap) && apSlow(k, pts, cl[k], n).eq(r.res[1].ap), 'canon AP recomputed with Q and a sort');
        }
        return { n, qs, aG, aC, oG, tg, ids: qs.map(k => ct.nodes[real[k]].id), mG: qMean(aG), mC: qMean(aC), mGo: qMean(oG), byLevel: qs.map(k => ct.nodes[real[k]].depth) };
    };
    const cA = canonRun(false), cB = canonRun(true);
    out('4. Exact-tree MAP on the CANON tree (all nodes are queries and candidates; ties pessimistic)');
    out(`  canon graph-edge MAP = ${qRound(cA.mG, 4)} over ${cA.qs.length} queries (exactly ${qShow(cA.mG)}; truncated ${qTrunc(cA.mG, 16)}); AP < 1 on ${cA.aG.filter(q => q.cmp(Q.ONE) < 0).length}; neighbour/non-neighbour ties on ${cA.tg}; optimistic ${qRound(cA.mGo, 4)}`);
    out(`  canon closure MAP = ${qRound(cA.mC, 4)} (exactly ${qShow(cA.mC)}; truncated ${qTrunc(cA.mC, 16)}); AP < 1 on ${cA.aC.filter(q => q.cmp(Q.ONE) < 0).length}`);
    const lvl = (run, aps) => { const g = new Map(); run.qs.forEach((k, i) => { const d = run.byLevel[i]; if (!g.has(d)) g.set(d, []); g.get(d).push(aps[i]); }); return [...g.entries()].sort((a, b) => a[0] - b[0]).map(([d, l]) => `${['root', 'dept', 'artifact', 'tome'][d]} ${qRound(qMean(l), 4)} (${l.length})`).join(', '); };
    out(`  graph-edge AP by level: ${lvl(cA, cA.aG)}; closure AP by level: ${lvl(cA, cA.aC)}`);
    out(`  contrast only, the canon root treated as virtual (as the verb root is): ${cB.qs.length} queries, graph-edge MAP ${qRound(cB.mG, 4)}, closure MAP ${qRound(cB.mC, 4)}`);
    out(`  second way: every canon AP (both variants, graph-edge and closure) recomputed with Q Lorentz products and an explicit sort: equal`);
    out(`~ section 4: ${msSince(t4).toFixed(0)} ms`);
    out('');

    // =================================================================================================================
    // 5. Python
    // =================================================================================================================
    const t5 = process.hrtime.bigint();
    const py = await pyRun;
    out('5. Python recomputation (s3_wordnet_shape.py, python3 -B -I, hpstep imported in place; exact ints and Fractions; independent of this file)');
    if (py.code !== 0) { out(`  python failed with code ${py.code}`); for (const l of py.se.split('\n')) out('  ! ' + l); throw new Error('S3: the Python recomputation failed'); }
    const pyLines = py.so.replace(/\n$/, '').split('\n');
    for (const l of pyLines) out(l.startsWith('~ ') ? '~ py| ' + l.slice(2) : '  py| ' + l);
    const pyVals = new Map();
    for (const l of pyLines) { const m = /^([a-z0-9.]+) = (\S+)$/.exec(l); if (m) pyVals.set(m[1], m[2]); }
    const mine = new Map([
        ['verb.synsets', String(N)], ['verb.roots', String(F.roots.length)], ['verb.maxlen', String(lmaxV)],
        ['verb.words.sha256', verbWordsSha], ['verb.points.sha256', verbPointsSha], ['verb.queries', String(nQ)],
        ['verb.graph.ap.sha256', apSha(queries.map(u => vnodes[u].id), apG)], ['verb.graph.map.sha256', qSha(mapG)], ['verb.graph.map.trunc16', qTrunc(mapG, 16)],
        ['verb.closure.ap.sha256', apSha(queries.map(u => vnodes[u].id), apC)], ['verb.closure.map.sha256', qSha(mapC)], ['verb.closure.map.trunc16', qTrunc(mapC, 16)],
        ['verb.graph.sample2000.sha256', qSha(mG2000)], ['verb.graph.sample1000.sha256', qSha(mG1000)],
        ['canon.nodes', String(CN)], ['canon.words.sha256', canonWordsSha], ['canon.points.sha256', canonPointsSha],
        ['canon.graph.ap.sha256', apSha(cA.ids, cA.aG)], ['canon.graph.map.sha256', qSha(cA.mG)], ['canon.closure.ap.sha256', apSha(cA.ids, cA.aC)], ['canon.closure.map.sha256', qSha(cA.mC)],
    ]);
    let agreeN = 0;
    const disagree = [];
    for (const [k, v] of mine) { if (pyVals.get(k) === v) agreeN++; else disagree.push(`${k}: node ${v}, python ${pyVals.get(k)}`); }
    out(`  comparison with this script: ${agreeN}/${mine.size} values identical (${[...mine.keys()].join(', ')})`);
    for (const d of disagree) out('  DIFFERS ' + d);
    assert(disagree.length === 0, 'Python and Node agree on every compared value');
    const pyMapG = pyVals.get('verb.graph.map.trunc16');
    out(`  verb graph-edge MAP: node ${qTrunc(mapG, 16)}, python ${pyMapG} (truncated to 16 decimals); the exact rationals are equal (same reduced n/d, by SHA-256), so |difference| = 0`);
    out(`~ python wall time ${(py.ms / 1000).toFixed(1)} s (concurrent with sections 1-4); section 5 waited ${msSince(t5).toFixed(0)} ms`);
    out('');

    // =================================================================================================================
    // SETTLES
    // =================================================================================================================
    out('SETTLES:');
    out(`- L6(c)'s rule: VERB GRAPH-EDGE MAP (exact H^3, L3 rule) = ${qRound(mapG, 4)} over all ${nQ} verb queries (exact rational, sha256 ${qSha(mapG).slice(0, 16)}...,`);
    out(`  ${qTrunc(mapG, 16)} truncated), reproduced exactly by the Python reference. Against the rule's threshold 0.90,`);
    out(`  L6(c)'s registered prediction would read "${mapG.cmp(qi(9, 10)) >= 0 ? 'supported' : 'refuted'}" (a prediction fixed by the rule, not a decision of L6(c)).`);
    out(`  Verb closure MAP on the same queries ${qRound(mapC, 4)}. Canon tree (all ${cA.qs.length} nodes): graph-edge ${qRound(cA.mG, 4)}, closure ${qRound(cA.mC, 4)}.`);
    out(`  Ties pessimistic: ${tieG} of ${nQ} verb queries have a neighbour tied exactly with a non-neighbour; the optimistic MAP would be ${qRound(mapGopt, 4)}.`);
    out(`- Shape: verbs ${N} synsets under a virtual root [1] with ${F.roots.length} children (4 letters each); depth <= ${Math.max(...shV.depthH.keys())} below the verb roots;`);
    out(`  ${shV.single}/${shV.internal} internal nodes (${pct(shV.single, shV.internal)}) have one child; ${shV.gt5} have more than 5 children and ${shV.gt25} more than 25; ${shV.virtualLetters} virtual letters.`);
    out(`  Canon: ${CN} nodes, words of 1, 3, 4 and 6 letters (depts 2 letters, artifacts 1, tomes 2).`);
    out(`- Tile limit: the longest verb word has ${shV.maxLen} letters; ${shV.le25}/${N} verb words (${pct(shV.le25, N)}) fit the kernel's 25-letter id59 tile and ${shV.le27}/${N} (${pct(shV.le27, N)})`);
    out(`  fit id64 (<= 27); ${N - shV.le25} verb words need a continuation tile. Every canon word fits (max ${shC.maxLen}).`);
    out(`- Bit budget: verb points have <= ${PV.maxNum}-bit numerators and <= ${PV.maxDen}-bit denominators per coordinate (lowest terms); over the common 7^${SCALE}`);
    out(`  they are <= ${maxScaledBits}-bit integers; the ranking keys (cosh d * 7^${2 * SCALE}) have <= ${maxKeyBits} bits.`);
    const devMax = Math.max(Math.abs(spG.max - mapG.toNumber()), Math.abs(spG.min - mapG.toNumber()));
    out(`- Query sampling: not needed for verbs; all ${nQ} queries were ranked against all ${N - 1} candidates. A 1,000-query sample would have moved the`);
    out(`  verb graph-edge MAP by up to ${f4(devMax)} (20 replicates, sd ${f4(spG.sd)}); the Rng(90000) 2,000-query sample gives ${qRound(mG2000, 4)}.`);
    const pyRank = (/^~ ranking: ([0-9.]+) s/m.exec(py.so) || [])[1];
    out(`~ - Time budget (this machine): pointExact ${(PV.tPE / vnodes.length).toFixed(3)} ms per verb point on average, ${msDeep.toFixed(3)} ms at n = ${lmaxV}; exact ranking`);
    out(`~   ${(msRank / nQ).toFixed(2)} ms per verb query (${(perPair * 1e6).toFixed(0)} ns per pair) in Node, ${(msRank / 1000).toFixed(1)} s for all; Python ${pyRank} s for all; 1,000 noun queries x 82,115 candidates ~ ${(perPair * 1000 * 82114 / 1000).toFixed(0)} s or more in Node.`);
    out(`~ total runtime ${(msSince(T0) / 1000).toFixed(1)} s`);
}

main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
