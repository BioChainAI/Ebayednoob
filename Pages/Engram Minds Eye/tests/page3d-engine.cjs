// The 3D page's engine (Phase 5): the memory tree in H^3, the watch layer on it, frames and the twin system, the
// breath, and the LATTICE-SEED/1 import against Owl Academy's own code.
//
//   node "Pages/Engram Minds Eye/tests/page3d-engine.cjs"
//
// Targets: reference/golden/lattice_seed_v1.json (made by make_lattice_v1.cjs from Owl Academy's Biomesh Mind's Eye
// 3D: its hash and parity verdicts on three seeds), the Live session, and the exact definitions. Instances use seeds
// 9100 and above, outside the registered ones. Exit code 1 if any check fails.
'use strict';
const fs = require('fs');
const path = require('path');
const EC = require(path.join(__dirname, '..', 'engram_core.js'));
const LS = require(path.join(__dirname, '..', 'lattice_seed_v1.js'));
const T3 = require(path.join(__dirname, '..', '..', 'Hyperbolic Oracles', 'twin3d.js'));
const C = require(path.join(__dirname, '..', '..', 'Hyperbolic Oracles', 'hyperbolic_core.js'));
const golden = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reference', 'golden', 'engram_v1.json'), 'utf8'));
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reference', 'golden', 'lattice_seed_v1.json'), 'utf8'));
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); };
const j = x => JSON.stringify(x, (k, v) => (typeof v === 'bigint' ? String(v) : v));

const L9000 = new EC.Live();
for (const [s, t] of EC.synthetic(golden, 9000)) L9000.addTokens(s, t);
const G = new EC.Live();
for (const t of golden.packet_chain.turns) G.addTurn(t.source, t.text);

// ---------------------------------------------------------------- the memory tree in H^3
{
    const onSheet = EC.LAYOUT.every(n => { const y = EC.point3Exact(n.word); return y[0].mul(y[0]).sub(y[1].mul(y[1])).sub(y[2].mul(y[2])).sub(y[3].mul(y[3])).eq(new C.Q(1n)) && y[0].sign() > 0; });
    const keys = new Set(EC.LAYOUT.map(n => EC.point3Exact(n.word).map(String).join('|')));
    check('the layout\'s 127 nodes are exact points of H^3 (on the sheet), all distinct', onSheet && keys.size === 127 && EC.LAYOUT.every(n => C.P.isReduced(n.word)));
    const nodes = EC.memoryNodes(L9000, 1), cells = nodes.filter(n => n.depth === 3);
    check('a full register: 1 + 6 + 30 structural memories and its 90 cells, each the packet whose position it is', nodes.length === 127 && cells.every(n => EC.positionOf(L9000.sched[n.t].off).word.join() === n.word.join()), `${cells.length} cells`);
    const D = n => { const y = EC.point3(n.word); return Math.acosh(y[0]); };
    check('depth grows outward: every cell is farther from the register than every section', Math.min(...cells.map(D)) > Math.max(...nodes.filter(n => n.depth === 1).map(D)));
}

// ---------------------------------------------------------------- the watch layer
{
    const r0 = EC.watchMemory(EC.memoryNodes(L9000, 0)), r1 = EC.watchMemory(EC.memoryNodes(L9000, 1)), r2 = EC.watchMemory(EC.memoryNodes(L9000, 2));
    check('the fence on a full register flags only the straightest leaves, and the exact check clears every flag', r1.settleFail === 0 && r1.flags.length === 6 && r1.flags.every(f => f.cleared && f.depth === 3 && f.key.endsWith(',0,0')),
        `register 1: ${r1.flags.map(f => f.key).join(' ')}`);
    check('registers 0 (89 cells) and 2 (partial): every flag settled exactly', r0.settleFail === 0 && r2.settleFail === 0 && r0.flags.every(f => f.cleared) && r2.flags.every(f => f.cleared), `${r0.flags.length} and ${r2.flags.length} flags`);
    const nodes = EC.memoryNodes(L9000, 1), cells = nodes.filter(n => n.depth === 3);
    let found = 0, total = 0, settled = true, under = true;
    for (let seed = 9100; seed < 9120; seed++) {
        const moved = new Map();
        for (let k = 0; k < 3; k++) { const n = cells[(seed * 7 + k * 31) % cells.length]; moved.set(n.key, EC.misplace(n.word, 2, seed * 10 + k)); }
        const w = EC.watchMemory(nodes, moved);
        total += moved.size; found += moved.size - w.missed.length;
        settled = settled && w.settleFail === 0 && w.flags.filter(f => f.misplaced).every(f => !f.cleared);
        under = under && w.flags.filter(f => f.misplaced).every(f => f.found.under);
    }
    check('memories moved two levels deep: every one flagged and confirmed misplaced, and its own word read back under its record', found === total && settled && under, `${found}/${total} over 20 instances`);
    const g = EC.guardMemory(nodes);
    check('the guard: the clean stored distances stay under ln 2', g.clean.bad === 0 && g.clean.worst < Math.LN2, `worst defect ${g.clean.worst.toFixed(6)}`);
    let hit3 = 0, hit15 = 0;
    for (let seed = 9100; seed < 9120; seed++) { hit3 += EC.guardMemory(nodes, { delta: 3.0, seed }).hit; hit15 += EC.guardMemory(nodes, { delta: 1.5, seed }).hit; }
    check('the guard names the corrupted pair at +3.0 every time (E8 found 1.00 there)', hit3 === 20, `+3.0: ${hit3}/20; +1.5: ${hit15}/20 (reported)`);
}

// ---------------------------------------------------------------- frames and the twin system
{
    const I = new C.Q(1n), Z = new C.Q(0n);
    const ortho = G.quats.slice(0, 20).every(q => { const R = T3.rotOfQuat(q); return [0, 1, 2].every(a => [0, 1, 2].every(b => R.reduce((s, row) => s.add(row[a].mul(row[b])), Z).eq(a === b ? I : Z))); });
    check('every packet\'s frame is an exact rotation: R(q)ᵀR(q) = I in rationals', ortho, '20 packets of the golden session');
    const conj = q => [q[0], -q[1], -q[2], -q[3]];
    check('the mirror law: structure 2\'s frame is the inverse of structure 1\'s, exactly (q2 ∝ conj q1)', [G, L9000].every(L => j(EC.qnormPow5(L.couplerQ[1])) === j(EC.qnormPow5(conj(L.couplerQ[0])))));
    const tf = EC.twinFrames(G), last = tf[tf.length - 1], ex = EC.floatQ(G.couplerQ[0]);
    const close = Math.min(Math.hypot(...last[0].map((x, i) => x - ex[i])), Math.hypot(...last[0].map((x, i) => x + ex[i])));
    check('the drawn (float) frames follow the exact coupler', close < 1e-9, `|Δ| = ${close.toExponential(2)} after ${tf.length} twists`);
    const S = new EC.Live({ coupler: 'same' });
    for (const t of G.turns) S.addTokens(t.source, t.tokens);
    check('the control, same chirality, moves the binding', S.couplerLog.some(e => !e.ok) && G.couplerLog.every(e => e.ok), `${S.couplerLog.filter(e => !e.ok).length}/${S.couplerLog.length} zero points broken`);
}

// ---------------------------------------------------------------- the breath
check('the breath: 1 at the register\'s first frame, 1.5 at its middle, never below 1', EC.breathOf(1) === 1 && Math.abs(EC.breathOf(361) - 1.5) < 1e-12 && [...Array(1440).keys()].every(F => EC.breathOf(F + 1) >= 1 && EC.breathOf(F + 1) <= 1.5));

// ---------------------------------------------------------------- LATTICE-SEED/1
for (const sd of fixture.seeds) {
    const imp = EC.importLatticeSeed(LS, sd.text);
    const same = imp.recomputed === sd.owl.recomputed && imp.hashOk === sd.owl.hash_ok && j(imp.nodes.map(n => n.parityOk)) === j(sd.owl.parity_ok) &&
        j(imp.nodes.map(n => [n.form, n.spin, n.quat32, n.payload16, n.freq, n.amp])) === j(sd.owl.fields);
    const chains = imp.chains.every(c => c.unfolds && c.missing === 0) && imp.nodes.every(n => EC.decode(n.address) === n.value && EC.qnorm(n.quat) === 5n ** 28n);
    check(`seed "${sd.name}": hash ${sd.owl.hash_ok ? 'verified' : 'mismatch found'}, parity of every node as Owl Academy says; every chain one exact quaternion that unfolds`, same && chains,
        `${imp.nodes.length} nodes, ${imp.parityBad} broken, ${imp.chains.length} chain(s) of ${imp.chains.map(c => c.length).join(', ')}`);
}
{
    let ok = true;
    const rng = new C.Rng(9100);
    for (let k = 0; k < 200; k++) {
        const f = [rng.below(16), rng.below(8), [0, 1, 2, 3].map(() => rng.below(256)), rng.below(65536), rng.below(32), rng.below(8)];
        const u = LS.unpackWord(LS.packWord(f[0], f[1], f[2], f[3], f[4], f[5]));
        ok = ok && u.parityOk && u.form === f[0] && u.spin === f[1] && u.quat32 === ((f[2][0] << 24 | f[2][1] << 16 | f[2][2] << 8 | f[2][3]) >>> 0) && u.payload16 === f[3] && u.freq === f[4] && u.amp === f[5];
    }
    check('the SHD-CCP codec round-trips 200 words with valid parity', ok);
    let bad = 0;
    try { EC.importLatticeSeed(LS, '{"kind":"ENVIRONMENT/1"}'); } catch (e) { bad++; }
    try { EC.importLatticeSeed(LS, '{"v":2}'); } catch (e) { bad++; }
    check('an ENVIRONMENT/1 object and a non-seed are refused with a reason', bad === 2);
    const imp = EC.importLatticeSeed(LS, fixture.seeds[0].text), pos = imp.nodes.map(n => EC.seedPosition(n.k));
    check('a seed\'s nodes take the cells of the tree in order, 90 to a page', new Set(pos.map(p => p.page + ':' + p.key)).size === imp.nodes.length && EC.seedNodes(imp, 0).filter(n => n.depth === 3).length === imp.nodes.length);
}

console.log(`\n${pass}/${pass + fail} checks pass${fail ? `, ${fail} fail` : ''}  (${EC.version})`);
process.exit(fail ? 1 : 0);
