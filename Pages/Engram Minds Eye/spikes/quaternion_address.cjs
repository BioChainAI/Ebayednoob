// Spike B: an engram as an exact address in Hyperbolic PolyStep's norm-5 quaternion tree.
//   node "Pages/Engram Minds Eye/spikes/quaternion_address.cjs"
// Output is captured in quaternion_address_output.txt. Deterministic (Mulberry32, fixed seed).
// Uses the PolyStep browser cores as they are: no copy, no change.
'use strict';
const path = require('path');
const HO = path.join(__dirname, '..', '..', 'Hyperbolic Oracles');
const C = require(path.join(HO, 'hyperbolic_core.js'));
const D = require(path.join(HO, 'decoder3d.js'));
const T = require(path.join(HO, 'twin3d.js'));
const E = require('../ttmpt_core_v1.js');
const { P, Q } = C;

let pass = 0, total = 0;
const check = (label, ok, detail = '') => { total++; if (ok) pass++; console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' · ' + detail : ''}`); };
const absB = a => (a < 0n ? -a : a);
const bitLen = a => absB(a).toString(2).length;

// 64 bits -> a reduced word of length L in the six generators 1 +/- 2i, 1 +/- 2j, 1 +/- 2k.
// Each letter is one of five choices: the children of the word so far (no backtracking), and at the root the
// first five generators. 5^28 > 2^64, so L = 28. The prefix is the chain so far, so a packet's letters never
// cancel against the previous packet's last letter.
const L = 28;
const choices = w => (w.length ? P.children(w) : [0, 1, 2, 3, 4]);
function encode(v, prefix = []) {
    const w = prefix.slice(); let x = v;
    for (let i = 0; i < L; i++) { w.push(choices(w)[Number(x % 5n)]); x /= 5n; }
    return w.slice(prefix.length);
}
function decode(word, prefix = []) {
    const w = prefix.slice(); let x = 0n, m = 1n;
    for (const g of word) { x += BigInt(choices(w).indexOf(g)) * m; m *= 5n; w.push(g); }
    return x;
}
const rng = E.mulberry32(20261104);
const rnd64 = () => { let v = 0n; for (let i = 0; i < 4; i++) v = (v << 16n) | BigInt(Math.floor(rng() * 65536)); return v; };
const engram64 = t => E.crystallize(t).reduce((v, b, i) => (b ? v | (1n << BigInt(i)) : v), 0n);

console.log('Spike B · engrams as exact quaternion addresses (norm-5 tree, Hyperbolic PolyStep core ' + C.version + ')');
console.log('');
console.log('1. One packet: 64 bits <-> one integer quaternion of norm 5^28');
let ok = 0, maxBits = 0; const N = 2000;
for (let n = 0; n < N; n++) {
    const v = rnd64(), q = P.wordQuaternion(encode(v)), back = P.rightDivide(q, L);
    if (back && decode(back) === v) ok++;
    maxBits = Math.max(maxBits, ...q.map(bitLen));
}
check(`${N} random 64-bit words round-trip through right division`, ok === N, `${ok}/${N}, largest component ${maxBits} bits`);
const g = engram64('GEODESIC'), gq = P.wordQuaternion(encode(g));
check('the GEODESIC engram round-trips', decode(P.rightDivide(gq, L)) === g, `q = (${gq.join(', ')})`);
const nrm = gq.reduce((s, c) => s + c * c, 0n);
check('its norm is exactly 5^28', nrm === 5n ** 28n);

console.log('');
console.log('2. A chain: K packets -> one quaternion, unfolded in order by right division');
const K = 40, vals = Array.from({ length: K }, rnd64);
let chain = []; for (const v of vals) chain = chain.concat(encode(v, chain));
const qc = P.wordQuaternion(chain), back = P.rightDivide(qc, L * K);
let rec = 0, pre = [];
for (let k = 0; k < K; k++) { const seg = back.slice(k * L, (k + 1) * L); if (decode(seg, pre) === vals[k]) rec++; pre = pre.concat(seg); }
const compBits = Math.max(...qc.map(bitLen));
check(`${K} packets recovered exactly from the one chain quaternion`, rec === K && P.isReduced(chain), `${rec}/${K}`);
console.log(`  size: 4 components of up to ${compBits} bits = ${4 * compBits} bits for ${64 * K} data bits (exact, not compression)`);
const A = encode(vals[0]), B = encode(vals[1]);
const qab = P.wordQuaternion(A.concat(encode(vals[1], A))), qba = P.wordQuaternion(B.concat(encode(vals[0], B)));
check('order matters: q(A then B) differs from q(B then A)', qab.some((c, i) => c !== qba[i]), 'the XOR crystal cannot tell them apart');

console.log('');
console.log('3. The same word is a node of the 3D decoder\'s octahedral tree in H^3');
const emb = new D.TreeEmbedding3D();
let placed = 0; const depth = 6, M = 50;
for (let n = 0; n < M; n++) { const w = encode(rnd64()).slice(0, depth); if (emb.decode(emb.point(w), depth).join() === w.join()) placed++; }
check(`depth-${depth} prefixes placed in H^3 and decoded back`, placed === M, `${placed}/${M}`);
console.log(`  float placement depth sweep (tau = ${emb.tau.toFixed(4)} per level, 50 random words each):`);
const sweep = [];
for (const d of [8, 10, 12, 14, 16, 18, 28]) {
    let okd = 0;
    for (let n = 0; n < 50; n++) {
        const w = encode(rnd64()).slice(0, d);
        try { if (emb.decode(emb.point(w), d).join() === w.join()) okd++; } catch (e) { /* overflow counts as a miss */ }
    }
    sweep.push(`${d}: ${okd}/50`);
}
console.log('    ' + sweep.join(' · '));
console.log('  so the full 28-letter address stays exact (the integer quaternion); only a shallow prefix is drawn as a float point');

console.log('');
console.log('4. Frames: the packet quaternion is an exact rotation, and the coupler law holds on it');
const R = T.rotOfQuat(P.wordQuaternion(encode(vals[3])));
const orth = [0, 1, 2].every(i => [0, 1, 2].every(j => {
    let s = new Q(0n); for (let k = 0; k < 3; k++) s = s.add(R[k][i].mul(R[k][j]));
    return s.eq(new Q(i === j ? 1n : 0n));
}));
check('R^T R = I in exact rationals', orth);
const q1 = P.wordQuaternion(encode(vals[4])), q2 = T.qconj(q1), w = P.wordQuaternion(encode(vals[5]));
const B0 = T.qnormExact(T.qmul(q2, q1)), B1 = T.qnormExact(T.qmul(T.qmul(q2, T.qconj(w)), T.qmul(w, q1)));
check('q1 <- w q1 and q2 <- q2 w^-1 keep B = q2 q1 (K1)', B0.every((c, i) => c === B1[i]));

console.log('');
console.log(`${pass}/${total} checks pass`);
process.exitCode = pass === total ? 0 : 1;
