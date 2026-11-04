// The orbital core as a module, checked in Node (no browser, no server, no CDN libraries).
//   node scripts/geometric-build/tests/orbital-core.cjs
// Exit code 0 when every check passes. The browser tests in this folder check the built pages; this one checks
// that the code the pages share also runs on its own, which is how other systems (Pages/Engram Minds Eye) use it.
'use strict';
const fs = require('fs');
const path = require('path');
const GB = path.join(__dirname, '..');
const O = require(path.join(GB, 'orbital_core.js'));
const { Fraction } = O;

let pass = 0, total = 0;
const check = (label, ok, detail = '') => { total++; if (ok) pass++; console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' · ' + detail : ''}`); };
const F = (n, d = 1n) => new Fraction(BigInt(n), BigInt(d));
let seed = 20261104;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const ri = n => Math.floor(rnd() * n);

console.log('The orbital core (' + O.version + '), ' + O.SEGMENTS.length + ' segments');

console.log('\n1. The module and the templates agree');
check('every export is defined', Object.entries(O).every(([, v]) => v !== undefined), `${Object.keys(O).length} names`);
const src = fs.readFileSync(path.join(GB, 'orbital_core.js'), 'utf8');
const begins = [...src.matchAll(/^\/\/ @orbital-begin (\w+)/gm)].map(m => m[1]), ends = [...src.matchAll(/^\/\/ @orbital-end (\w+)/gm)].map(m => m[1]);
check('each segment opens and closes once, in the order SEGMENTS lists', begins.join() === O.SEGMENTS.join() && ends.join() === O.SEGMENTS.join());
const templates = ['page.html', 'page2.html', 'page3.html', 'gen4.py'].map(f => fs.readFileSync(path.join(GB, f), 'utf8')).join('\n');
const used = new Set([...templates.matchAll(/\/\*__ORB:(\w+)__\*\//g)].map(m => m[1]));
if (templates.includes('/*__CORE__*/')) used.add('core');
check('every segment is used by a template, and every placeholder names a segment',
    O.SEGMENTS.every(s => used.has(s)) && [...used].every(s => O.SEGMENTS.includes(s)), [...used].length + ' used');

console.log('\n2. Part 1 verification, the port of verify_galactic_hierarchy.py');
const ref = fs.readFileSync(path.join(GB, 'ref_output.txt'), 'utf8').replace(/\n$/, '').split('\n');
const out = O.runVerification();
const same = out.filter((l, i) => l === ref[i]).length;
check('runVerification() reproduces ref_output.txt line for line', same === ref.length && out.length === ref.length, `${same}/${ref.length} lines`);

console.log('\n3. SHA-256 and the 64-bit Einstein tile');
check('sha256("abc") is the FIPS 180-4 vector', O.toHex(O.sha256(O.utf8('abc'))) === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
let tiles = 0;
for (let n = 0; n < 2000; n++) {
    const f = { step: 1 + ri(8), wheel: ri(8), struct: ri(4), gate: ri(256), mux: ri(16), form: ri(16), slot: ri(16), scale: ri(16), core: ri(2 ** 32) >>> 0 };
    const d = O.decodeTile(O.packTile(f));
    if (['step', 'wheel', 'struct', 'gate', 'mux', 'form', 'slot', 'scale', 'core'].every(k => d[k] === f[k])) tiles++;
}
check('2000 random tiles round-trip through packTile and decodeTile', tiles === 2000, `${tiles}/2000`);
check('wheel sectors follow the units of (Z/30Z)x', O.WHEEL.join() === '1,7,11,13,17,19,23,29' && O.wheelSector(0) === 7 && O.wheelSector(7) === 1 && O.wheelSector(29) === 7);

console.log('\n4. Form 1: Hurwitz quaternions in one 32-bit core');
const half = F(1, 2), h = [half, half.neg(), half, half];
const H = O.hurwitzEncode(h), Hd = O.hurwitzDecode(H.core);
check('the tier spinor (1 - i + j + k)/2 is exact: no loss flag, doubled coordinates (1, -1, 1, 1)', !H.loss && Hd.b.join() === '1,-1,1,1' && H.err < 1e-12);
const big = O.cayleyMap(F(1000, 7), F(-3, 11), F(5, 13)), Hb = O.hurwitzEncode(big);
check('a rotation that needs more than 8 bits sets the loss flag', Hb.loss && O.hurwitzDecode(Hb.core).loss, `${Hb.bitsNeeded} bits needed, angle error ${Hb.err.toExponential(2)} rad`);

console.log('\n5. Memory: a word of four, its Merkle chain, locate and rebuild (Tri-Engine Convergence)');
const word = (a, b, c, addr) => ({ cells: [a, b, c, a.add(b).add(c)], addr, step: 1 + (addr % 8), k: addr % 30 });
let words = 0, single = 0, double = 0;
for (let n = 0; n < 40; n++) {
    const w = word(F(ri(2000) - 1000, 1 + ri(97)), F(ri(2000) - 1000, 1 + ri(97)), F(ri(2000) - 1000, 1 + ri(97)), n % 30);
    w.tau0 = O.chainOf(w); words++;
    let ok = O.parityOk(w) && O.locate(w) === null;
    for (let j = 0; j < 4; j++) {
        const before = w.cells[j];
        w.cells[j] = before.add(F(1, 2n ** 24n));
        const caught = !O.parityOk(w), at = O.locate(w);
        w.cells[j] = O.rebuild(w, j);
        ok = ok && caught && at === j && w.cells[j].eq(before) && O.chainOf(w)[1] === w.tau0[1];
    }
    if (ok) single++;
    const keep = w.cells.slice();
    w.cells[0] = w.cells[0].add(F(1, 2n ** 24n)); w.cells[2] = w.cells[2].sub(F(1, 2n ** 24n));
    const j = O.locate(w); if (j !== null) w.cells[j] = O.rebuild(w, j);
    if (O.chainOf(w)[1] !== w.tau0[1]) double++;
    w.cells = keep;
}
check('every single altered cell fails the parity, is located by the chain, and is rebuilt with the root restored', single === words, `${single}/${words} words`);
check('two altered cells cannot be rebuilt by one parity: the root stays wrong', double === words, `${double}/${words} words`);

console.log('\n6. The Proposition 7.14 gauge and the landing triangle');
let rec = 0, zeroIff = 0, cases = 0;
for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) for (let c = -6; c <= 6; c++) {
    const G = O.gaugeExact(F(a), F(b), F(c)); cases++;
    if (G.recovered) rec++;
    if ((G.X.isZero() && G.Yc.isZero()) === (a === b && b === c)) zeroIff++;
}
check('the gauge recovers every integer triple in [-6, 6]^3 exactly', rec === cases, `${rec}/${cases}`);
check('X = Y = 0 exactly when the three values are equal', zeroIff === cases);
const eq = O.readout([F(7, 3), F(7, 3), F(7, 3)]), ne = O.readout([F(1), F(2), F(3)]);
check('equal values give an equilateral landing triangle: the lock (3 A = S^2, exact)', eq.T.lock && eq.T.same && Math.abs(eq.T.chi - 1 / Math.sqrt(3)) < 1e-12);
check('unequal values do not lock, and the TQF polynomial equals the Gram form', !ne.T.lock && ne.T.same && ne.T.nonneg);

console.log('\n7. The 720 -> 72 -> 10 pump (Zero-Point Tri-Engine)');
let ident = 0, closedOk = 0;
for (let n = 0; n < 200; n++) {
    const d = new Uint8Array(720), p = rnd();
    for (let i = 0; i < 720; i++) d[i] = rnd() < p ? 1 : 0;
    const r = O.pumpOf(d);
    if (r.identity) ident++;
    if (r.closed === (r.engaged % 720 === 0)) closedOk++;
}
const full = O.pumpOf(new Uint8Array(720).fill(1));
check('H = Q8 Q10 P = P^-1 holds on 200 random registers', ident === 200, `${ident}/200`);
check('a register closes exactly when its engaged frames are a whole turn; all 720 engaged closes', closedOk === 200 && full.closed && full.identity);

console.log('\n8. The tiers');
const T = O.TIERS_SPEC;
check('R = 5n^2 + 15n + 15, r = 2n + 4, W = 16 - 2n, f = 6W, and the windings sum to 60',
    T.every(t => t.R === 5 * t.n * t.n + 15 * t.n + 15 && t.r === 2 * t.n + 4 && t.W === 16 - 2 * t.n && t.freq === 6 * t.W) && T.reduce((s, t) => s + t.W, 0) === 60);

console.log(`\n${pass}/${total} checks pass`);
process.exitCode = pass === total ? 0 : 1;
