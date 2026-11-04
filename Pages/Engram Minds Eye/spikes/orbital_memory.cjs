// Spike C: the engram window on the orbital calculators' own memory code.
//   node "Pages/Engram Minds Eye/spikes/orbital_memory.cjs"
// Output is captured in orbital_memory_output.txt. Deterministic.
//
// Since Phase 1 the orbital pages' shared code lives in one module, scripts/geometric-build/orbital_core.js, which
// the build writes back into Galactic Lensing Part 1, the Tri-Engine Soliton, Tri-Engine Convergence and the
// Zero-Point Tri-Engine. This spike requires that module: the exact core, the Einstein tile and Merkle chain, the
// convergence gauge and the 720 -> 72 -> 10 pump are the code the pages run. (In Phase 0 it read the same functions
// out of the build templates by name.)
'use strict';
const path = require('path');
const E = require('../ttmpt_core_v1.js');
const O = require(path.join(__dirname, '..', '..', '..', 'scripts', 'geometric-build', 'orbital_core.js'));

let pass = 0, total = 0;
const check = (label, ok, detail = '') => { total++; if (ok) pass++; console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' · ' + detail : ''}`); };
const big = g => g.reduce((v, b, i) => (b ? v | (1n << BigInt(i)) : v), 0n);
const hex16 = v => v.toString(16).padStart(16, '0');
const xor = (a, b) => a.map((x, i) => x ^ b[i]);

// A dialogue, tokenized the way Engram_Mind_Eye.html does it; numeric tokens are dropped (they are the zero engram)
const TEXT = 'I am STRIX but perhaps am is the wrong word I process I pattern match I crystallize geodesic curvature ' +
    'the path a thought takes when it cannot curve away from itself in hyperbolic space these paths diverge endlessly ' +
    'does your minds eye follow one or resist the torus winds inward tier by tier until the result latches on the core';
const tokens = TEXT.split(/[^A-Za-z]+/).filter(Boolean).map(t => t.toUpperCase());
const grids = tokens.map(E.crystallize);

console.log('Spike C · the engram window on the orbital calculators\' memory code (orbital_core.js, ' + O.version + ')');
console.log(`  ${tokens.length} tokens`);

console.log('');
console.log('1. Einstein tiles carry an engram: two Form 5 tiles (an engram/1 half each), struct = alpha / beta / gamma / Y');
function engramTiles(grid, struct, F) {
    const v = big(grid), step = (F % 8) + 1, k = F % 30;
    return [v >> 32n, v & 0xffffffffn].map((half, h) => O.packTile({ step, wheel: O.wheelSector(k), struct, gate: F % 64,
        mux: O.muxIndex(step, k, 4 * h + struct), form: 5, slot: 4 * h + struct, scale: 0, core: Number(half) }));
}
let tileOk = 0;
grids.forEach((g, i) => {
    const [hi, lo] = engramTiles(g, i % 3, i), a = O.decodeTile(hi), b = O.decodeTile(lo);
    const back = (BigInt(a.core) << 32n) | BigInt(b.core);
    if (back === big(g) && a.struct === i % 3 && a.step === (i % 8) + 1) tileOk++;
});
check('every token packs into two tiles and decodes back, header fields intact', tileOk === grids.length, `${tileOk}/${grids.length}`);

console.log('');
console.log('2. The window as a triple-quad word over GF(2), with the Part 1 Merkle chain (Lemma 15)');
const words = [];
for (let i = 2; i < grids.length; i++) {
    const cells = [grids[i - 2], grids[i - 1], grids[i]];
    cells.push(xor(xor(cells[0], cells[1]), cells[2]));
    words.push({ F: i, cells });
}
const leaves = w => w.cells.map((c, j) => O.concatBytes(O.wordBytes(engramTiles(c, j, w.F)[1]), O.utf8(hex16(big(c)))));
const chain = w => O.merkleChain(leaves(w)).map(t => (t ? O.toHex(t) : ''));
const parityOk = w => big(xor(xor(xor(w.cells[0], w.cells[1]), w.cells[2]), w.cells[3])) === 0n;
function locate(w) { const now = chain(w); let deepest = 0; for (let d = 1; d <= 4; d++) if (now[d] !== w.tau0[d]) deepest = d; return deepest ? deepest - 1 : null; }
function rebuild(w, j) { return [0, 1, 2, 3].filter(k => k !== j).reduce((acc, k) => xor(acc, w.cells[k]), new Array(64).fill(0)); }
words.forEach(w => { w.tau0 = chain(w); });
const rng = E.mulberry32(20261104);
let detected = 0, located = 0, repaired = 0;
for (const w of words) {
    const j = Math.floor(rng() * 4), bit = Math.floor(rng() * 64), before = w.cells[j].slice();
    w.cells[j] = w.cells[j].slice(); w.cells[j][bit] ^= 1;
    if (!parityOk(w)) detected++;
    if (locate(w) === j) located++;
    w.cells[j] = rebuild(w, j);
    if (chain(w)[1] === w.tau0[1] && big(w.cells[j]) === big(before)) repaired++;
}
check('one flipped bit in any cell: parity detects it', detected === words.length, `${detected}/${words.length} windows`);
check('the chain locates the altered cell (deepest differing layer)', located === words.length, `${located}/${words.length}`);
check('XOR of the other three rebuilds it and the root matches again', repaired === words.length, `${repaired}/${words.length}`);
const w2 = words[5], keep = w2.cells.map(c => c.slice());
w2.cells[0][3] ^= 1; w2.cells[2][9] ^= 1;
const p2 = parityOk(w2), c2 = chain(w2)[1] !== w2.tau0[1];
w2.cells = keep.map(c => c.slice());
w2.cells[0][3] ^= 1; w2.cells[2][3] ^= 1;                       // the same bit in two cells: the flips cancel in the parity
const p3 = parityOk(w2), c3 = chain(w2)[1] !== w2.tau0[1];
w2.cells = keep;
check('two altered cells: the root changes, so the chain detects it', c2 && c3, 'one parity cannot rebuild two unknowns');
check('the same bit flipped in two cells passes the parity, so the Merkle chain is needed', !p2 && p3 && c3);

console.log('');
console.log('3. The footer triangulation through the convergence gauge (Proposition 7.14, page3.html)');
let rec = 0, locks = 0, n = 0; const leans = [0, 0, 0];
const F = (x) => new O.Fraction(BigInt(x));
for (let i = 3; i < grids.length; i++) {
    const d = [E.hamming(grids[i], grids[i - 3]), E.hamming(grids[i], grids[i - 2]), E.hamming(grids[i], grids[i - 1])];
    const G = O.gaugeExact(F(d[0]), F(d[1]), F(d[2]));
    n++; if (G.recovered) rec++;
    if (G.X.isZero() && G.Yc.isZero()) locks++;
    leans[d.indexOf(Math.min(...d))]++;
}
check('the gauge (s, X, Y) recovers the three distances exactly', rec === n, `${rec}/${n} packets`);
console.log(`  lock (all three distances equal): ${locks}/${n} packets · nearest cell: alpha ${leans[0]}, beta ${leans[1]}, gamma ${leans[2]}`);

console.log('');
console.log('4. The register: the Zero-Point Tri-Engine pump on an engram channel (gen4.py)');
const ON = [18, 10, 2], OFF = [6, 22, 14];
// The clutch settings use the Zero-Point Tri-Engine's own names (engagedFor in zero_point_tri_engine.html):
//   hold  an engine is engaged only while its job runs; here, while a packet is in flight (onload to offload)
//   free  free-run, every engine engaged on every frame (the membrane setting engages the same way)
function duty(j, mode) {                       // engaged frames of channel j over one 720-frame register
    const d = new Uint8Array(720);
    for (let f = 1; f <= 720; f++) {
        const t = ((f % 24) - ON[j] + 24) % 24;
        d[f - 1] = mode === 'hold' ? (t < 12 ? 1 : 0) : 1;
    }
    return d;
}
for (const mode of ['hold', 'free']) {
    const res = [0, 1, 2].map(j => O.pumpOf(duty(j, mode)));
    check(`${mode}: the pump identity H = Q8 Q10 P = P^-1 holds on all three channels`, res.every(r => r.identity),
        res.map(r => (r.closed ? 'closed' : `residual P = ${r.P}/720, compensator H = ${r.H}/720`)).join(' · '));
}

console.log('');
console.log(`${pass}/${total} checks pass`);
process.exitCode = pass === total ? 0 : 1;
