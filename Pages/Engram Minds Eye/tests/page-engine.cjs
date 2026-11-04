// The page engine (Phase 4): Live against Session, STRIX's replies and the v1 exports against Owl Academy's own code,
// the v2 export, the H^2 positions, and the time a long conversation takes.
//
//   node "Pages/Engram Minds Eye/tests/page-engine.cjs"
//
// Targets: reference/golden/exports_v1.json (made by make_owl_v1.cjs from Owl Academy's page: the replies of its
// selectResponse and the length and SHA-256 of every v1 export it downloads) and the Session class, which the parity
// runner checks against the Python reference. Exit code 1 if any check fails.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EC = require(path.join(__dirname, '..', 'engram_core.js'));
const LIB = require(path.join(__dirname, '..', 'strix_library_v1.js'));
const T3 = require(path.join(__dirname, '..', '..', 'Hyperbolic Oracles', 'twin3d.js'));
const C = require(path.join(__dirname, '..', '..', 'Hyperbolic Oracles', 'hyperbolic_core.js'));

const REF = path.join(__dirname, '..', 'reference', 'golden');
const golden = JSON.parse(fs.readFileSync(path.join(REF, 'engram_v1.json'), 'utf8'));
const fixture = JSON.parse(fs.readFileSync(path.join(REF, 'exports_v1.json'), 'utf8'));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const same = (a, b) => JSON.stringify(a, (k, v) => (typeof v === 'bigint' ? v.toString() : v)) === JSON.stringify(b, (k, v) => (typeof v === 'bigint' ? v.toString() : v));
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); };

// ---------------------------------------------------------------- STRIX's library and replies
check('the library holds the page\'s fifteen concepts in CONCEPT_NAMES order', same(LIB.concepts.map(c => c.name), EC.CONCEPT_NAMES) && LIB.concepts.every(c => c.responses.length === 3));
check('the library\'s introduction is the golden session\'s first turn', LIB.intro === golden.packet_chain.turns[0].text);
const conv = new EC.Live();
conv.addTurn('strix', LIB.intro);
const got = fixture.humans.map(h => conv.respond(LIB, h).reply);
fixture.replies.forEach((r, i) => check(`reply ${i + 1}: ${r.concept}, J ${r.J}`, got[i].concept === r.concept && got[i].J === r.J && got[i].response === r.response, got[i].response.slice(0, 48) + '…'));

// ---------------------------------------------------------------- v1 exports, byte for byte
const sessions = {};
{ const L = new EC.Live(); for (const t of golden.packet_chain.turns) L.addTurn(t.source, t.text); sessions.golden = L; }
{ const L = new EC.Live(); for (const [s, toks] of EC.synthetic(golden, 9000)) L.addTokens(s, toks); sessions['dialogue 9000'] = L; }
sessions.conversation = conv;
for (const c of fixture.cases) {
    const L = sessions[c.session];
    const e = c.kind === 'chain' ? EC.exportV1Chain(L.chain.packets, L.chain.parity) : EC.exportV1Crystal(L.chain.packets, c.sections, { manifold: c.manifold, generatedAt: fixture.generated_at });
    check(`v1 ${c.kind}${c.sections ? ' S' + c.sections : ''} of the ${c.session}: same bytes as Owl Academy`, e.name === c.file && Buffer.byteLength(e.text) === c.bytes && sha(e.text) === c.sha256, `${e.name}, ${c.bytes} bytes`);
}

// ---------------------------------------------------------------- Live equals Session, turn by turn
function compare(label, turns, at, coupler = 'carry') {
    const L = new EC.Live({ coupler });
    let ok = true, n = 0;
    turns.forEach(([s, toks], i) => {
        L.addTokens(s, toks);
        if (!at.includes(i + 1)) return;
        const S = new EC.Session(turns.slice(0, i + 1), coupler);
        n++;
        ok = ok && same(L.outputs(), S.outputs()) && same(L.couplerLog.map(e => [e.F, e.B, e.ok]), S.coupler.log.map(e => [e.F, e.B, e.ok])) && same(L.couplerQ, S.coupler.q);
    });
    check(label, ok, `${n} checkpoints, ${L.chain.packets.length} packets, ${L.words.length} words, ${L.registers().length} registers`);
}
const gTurns = golden.packet_chain.turns.map(t => [t.source, EC.tokenize(t.text)]);
compare('golden session: Live = Session after each turn (packets, words, gauges, registers, coupler)', gTurns, [1, 2]);
compare('dialogue 9000: Live = Session at turns 1, 2, 3, 4, 9, 17, 30', EC.synthetic(golden, 9000), [1, 2, 3, 4, 9, 17, 30]);
compare('dialogue 9001: Live = Session at turns 1, 5, 12, 30', EC.synthetic(golden, 9001), [1, 5, 12, 30]);
compare('dialogue 9004, same-chirality control: Live = Session at turns 6 and 30', EC.synthetic(golden, 9004), [6, 30], 'same');
{   // one token at a time, through the first register's close
    const toks = EC.synthetic(golden, 9002).flatMap(([s, t]) => t.map(x => [s, [x]])).slice(0, 100);
    compare('dialogue 9002 one token a turn: Live = Session at 1, 2, 3, 4, 5, 89, 90, 91, 100 tokens', toks, [1, 2, 3, 4, 5, 89, 90, 91, 100]);
}
{   // qnormPow5 is qnormExact on every quaternion the coupler holds
    const L = sessions['dialogue 9000'];
    let q = [[1n, 0n, 0n, 0n], [1n, 0n, 0n, 0n]], ok = true;
    for (const w of L.quats) {
        const a = T3.qmul(w, q[0]), b = T3.qmul(q[1], T3.qconj(w));
        ok = ok && same(EC.qnormPow5(a), T3.qnormExact(a)) && same(EC.qnormPow5(b), T3.qnormExact(b));
        q = [T3.qnormExact(a), T3.qnormExact(b)];
    }
    check('qnormPow5 = qnormExact on every twist of dialogue 9000', ok, `${L.quats.length} twists`);
}
check('complete registers telescope, unfold and close in free-run', Object.values(sessions).every(L => L.registers().filter(R => R.complete).every(R => R.telescopes && R.unfolds && R.pumpFree.every(p => p.closed && p.identity))),
    `${Object.values(sessions).reduce((s, L) => s + L.registers().filter(R => R.complete).length, 0)} complete`);

// ---------------------------------------------------------------- positions in the memory tree
{   // a word holds the three packets latched in the 24 frames before its zero point; only the trailing words written
    // after the last offload (provisional: the next turn replaces them) repeat cells of earlier words
    let ok = true, n = 0, repeats = 0;
    for (const L of Object.values(sessions)) L.words.forEach(w => w.tokens.forEach((t, j) => {
        const pos = EC.positionOf(L.sched[t].off);
        if (L.isProvisional(w)) { ok = ok && pos.zeroPoint <= w.F; if (pos.zeroPoint < w.F) repeats++; return; }
        ok = ok && pos.zeroPoint === w.F && pos.j === j && L.wordOf(t) === w && C.P.isReduced(pos.word) && pos.r === EC.place(w.F)[0]; n++;
    }));
    check('every word\'s cells sit under its zero point in the memory tree as its alpha, beta and gamma (trailing provisional words aside)', ok, `${n} cells; ${repeats} repeated in trailing words`);
}

// ---------------------------------------------------------------- v2
{
    const L = sessions.conversation, a = EC.exportV2(L, { generatedAt: fixture.generated_at, manifold: { n: 12, k: 5, t: 3 } });
    const b = EC.exportV2(L, { generatedAt: fixture.generated_at, manifold: { n: 12, k: 5, t: 3 } }), d = JSON.parse(a.text);
    const S = new EC.Session(L.turns.map(t => [t.source, t.tokens]), 'carry');
    const ok = a.text === b.text && d.format === 'engram_mind_eye' && d.version === 2 && d.packets.length === S.chain.packets.length &&
        d.final_parity === EC.hex32(S.chain.parity) && same(d.words.map(w => [w.F, w.addr, w.root, w.link]), S.words.map(w => [w.F, w.addr, w.root, w.link])) &&
        d.words.every(w => w.intact) && d.coupler.held === d.coupler.zero_points && same(d.chain.quaternion, EC.chainQuaternion(S.values).map(String)) &&
        d.packets.every((p, t) => p.address === EC.encode(S.values[t], t ? EC.chainWord(S.values.slice(0, t)).slice(-1) : []).join('')) &&
        d.turns.length === 11 && d.turns.every(t => typeof t.text === 'string');
    check('v2 export: deterministic, and every field equals the reference Session', ok, `${a.name}, ${Buffer.byteLength(a.text)} bytes`);
}

// ---------------------------------------------------------------- a long conversation
{
    const L = new EC.Live(), t0 = Date.now();
    L.addTurn('strix', LIB.intro);
    let worst = 0;
    for (let i = 0; i < 40; i++) { const t = Date.now(); L.respond(LIB, fixture.humans[i % fixture.humans.length] + ' ' + EC.store(golden)[i * 7 % 477]); L.registers(); worst = Math.max(worst, Date.now() - t); }
    const secs = (Date.now() - t0) / 1000;
    check('a conversation of 40 exchanges runs turn by turn in under 20 s, no turn over 1.5 s', secs < 20 && worst < 1500 && L.bChecks.every(Boolean),
        `${L.chain.packets.length} packets, ${L.words.length} words, ${L.registers().filter(R => R.complete).length} complete registers, ${secs.toFixed(1)} s, slowest turn ${worst} ms`);
}

console.log(`\n${pass}/${pass + fail} checks pass${fail ? `, ${fail} fail` : ''}  (${EC.version})`);
process.exit(fail ? 1 : 0);
