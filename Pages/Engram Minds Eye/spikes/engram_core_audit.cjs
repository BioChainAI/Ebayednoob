// Spike A: what the engram/1 key is, measured. Run from the repository root or anywhere:
//   node "Pages/Engram Minds Eye/spikes/engram_core_audit.cjs"
// Output is captured in engram_core_audit_output.txt. Deterministic: no random input.
'use strict';
const E = require('../ttmpt_core_v1.js');

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const hex = g => { let s = ''; for (let i = 0; i < 8; i++) { let b = 0; for (let k = 0; k < 8; k++) b |= (g[i * 8 + k] << k); s += b.toString(16).padStart(2, '0'); } return s; };
const bits = g => g.reduce((a, b) => a + b, 0);
const asBig = g => g.reduce((v, b, i) => (b ? v | (1n << BigInt(i)) : v), 0n);
let pass = 0, total = 0;
const check = (label, ok, detail = '') => { total++; if (ok) pass++; console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' · ' + detail : ''}`); };

console.log('Spike A · the engram/1 key (TTMPT core, verbatim from Owl-Academy)');
console.log('');
console.log('1. Compatibility: golden vectors shared with Owl-Academy');
check('crystallize("GEODESIC") = 5c896a4801c9c24c (BIOMESH_SYSTEM.md)', hex(E.crystallize('GEODESIC')) === '5c896a4801c9c24c', hex(E.crystallize('GEODESIC')));
check('chiralKey("STRIX") = O1::S::48d835dfdfc5484e', E.chiralKey('STRIX') === 'O1::S::48d835dfdfc5484e', E.chiralKey('STRIX'));

console.log('');
console.log('2. Structure: an engram is the parity of each letter count');
function rankGF2(vs) {
    const piv = new Map(); let r = 0;
    for (let v of vs) for (let bit = 63; bit >= 0; bit--) {
        if (!((v >> BigInt(bit)) & 1n)) continue;
        if (piv.has(bit)) v ^= piv.get(bit); else { piv.set(bit, v); r++; break; }
    }
    return r;
}
const rank = rankGF2(LETTERS.map(c => asBig(E.encodeToken(c))));
check('the 26 letter grids are independent over GF(2)', rank === 26, `rank ${rank}, so at most 2^26 of the 2^64 keys can occur`);
const parityKey = w => LETTERS.map(c => (w.toUpperCase().split(c).length - 1) % 2).join('');
const WORDS = ['GEODESIC', 'CURVATURE', 'POINCARE', 'HYPERBOLIC', 'TORUS', 'QUATERNION', 'ENGRAM', 'MEMORY', 'ORBIT', 'POLYSTEP',
    'SPIRE', 'MIND', 'EYE', 'STRIX', 'FRAME', 'TWIST', 'LATTICE', 'SEED', 'CHAIN', 'PUMP', 'LISTEN', 'SILENT', 'Y'];
let agree = true;
for (const a of WORDS) for (const b of WORDS) {
    const same = parityKey(a) === parityKey(b), eq = E.hamming(E.crystallize(a), E.crystallize(b)) === 0;
    if (same !== eq) agree = false;
}
check('two words share an engram exactly when their letter-count parities agree', agree, `${WORDS.length} words, all pairs`);
for (const [a, b] of [['LISTEN', 'SILENT'], ['GEODESIC', 'DIESCOGE'], ['EYE', 'Y'], ['MIND', 'MINDMM'], ['ABBA', '']])
    check(`"${a}" and "${b}" collide (order-blind, pairs cancel)`, E.hamming(E.crystallize(a), E.crystallize(b)) === 0);
for (const t of ['720', '2026', '3'])
    check(`numeric token "${t}" crystallizes to the zero engram (letters only)`, bits(E.crystallize(t)) === 0);

console.log('');
console.log('3. Spread: distances between distinct words look like random 64-bit words');
const D = WORDS.slice(0, 20), ds = [];
for (let i = 0; i < D.length; i++) for (let j = i + 1; j < D.length; j++) ds.push(E.hamming(E.crystallize(D[i]), E.crystallize(D[j])));
ds.sort((a, b) => a - b);
const mean = ds.reduce((a, b) => a + b, 0) / ds.length;
console.log(`  ${ds.length} pairs: min ${ds[0]}, median ${ds[ds.length >> 1]}, mean ${mean.toFixed(1)}, max ${ds[ds.length - 1]} (independent random words: 32 ± 4)`);
const Js = D.map(w => E.computeJ(E.crystallize(w)));
console.log(`  torsion J over the same words: ${Math.min(...Js).toFixed(3)} to ${Math.max(...Js).toFixed(3)}`);

console.log('');
console.log('4. The window as a triple quad over GF(2): Y = alpha xor beta xor gamma rebuilds any one lost cell');
const W = ['MIND', 'EYE', 'STRIX'].map(E.crystallize), Y = W[0].map((x, i) => x ^ W[1][i] ^ W[2][i]);
for (let lost = 0; lost < 3; lost++) {
    const others = [0, 1, 2].filter(k => k !== lost), rebuilt = Y.map((y, i) => y ^ W[others[0]][i] ^ W[others[1]][i]);
    check(`lose ${['alpha', 'beta', 'gamma'][lost]}, rebuild it from the other two and Y`, E.hamming(rebuilt, W[lost]) === 0);
}

console.log('');
console.log(`${pass}/${total} checks pass`);
process.exitCode = pass === total ? 0 : 1;
