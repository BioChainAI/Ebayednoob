// The bridges (Phase 6): Owl Academy in and out, against Owl Academy's own code.
//
//   node "Pages/Engram Minds Eye/tests/bridges.cjs"
//
// Targets: reference/golden/bridges_v1.json (make_bridges_v1.cjs: what Owl Academy's Engram Mind Eye saves and how it
// continues after a reload, biochains grown and verified by biomesh.js, ENVIRONMENT/1 objects built and hashed by the
// Biomesh Mind's Eye 3D) and exports_v1.json (the v1 files, byte for byte). Exit code 1 if any check fails.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EC = require(path.join(__dirname, '..', 'engram_core.js'));
const LIB = require(path.join(__dirname, '..', 'strix_library_v1.js'));
const LS = require(path.join(__dirname, '..', 'lattice_seed_v1.js'));
const BC = require(path.join(__dirname, '..', 'biochain_v1.js'));
const G = path.join(__dirname, '..', 'reference', 'golden');
const fx = JSON.parse(fs.readFileSync(path.join(G, 'bridges_v1.json'), 'utf8'));
const golden = JSON.parse(fs.readFileSync(path.join(G, 'engram_v1.json'), 'utf8'));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const j = x => JSON.stringify(x, (k, v) => (typeof v === 'bigint' ? String(v) : v));
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); };
const conversation = n => { const L = new EC.Live(); L.addTurn('strix', LIB.intro); fx.session.humans.slice(0, n).forEach(h => L.respond(LIB, h)); return L; };
const sameMemory = (a, b) => j(a.outputs()) === j(b.outputs()) && j(a.couplerLog.map(e => [e.F, e.ok])) === j(b.couplerLog.map(e => [e.F, e.ok]));

// ---------------------------------------------------------------- out: the session as Owl Academy saves it
{
    const s1 = EC.exportOwlSession(conversation(1)).text, s5 = EC.exportOwlSession(conversation(5)).text;
    check('a one-exchange session exports byte for byte as Owl Academy\'s Engram Mind Eye saves it', s1 === fx.session.short.json, `${Buffer.byteLength(s1)} bytes`);
    check('a five-exchange session too', Buffer.byteLength(s5) === fx.session.long.bytes && sha(s5) === fx.session.long.sha256, `${fx.session.long.bytes} bytes, SHA-256 equal`);
}
// ---------------------------------------------------------------- in: Owl Academy's saved session, and how it goes on
{
    const imp = EC.importAny(fx.session.short.json);
    check('Owl Academy\'s saved session imports: its conversation rebuilds every packet and the final parity', imp.kind === 'owl_session' && imp.verified && imp.checks[0].ok, imp.checks.map(c => c.detail).filter(Boolean).join('; '));
    const L = EC.liveOf(imp.turns);
    check('the imported session is the same memory as the one grown here', sameMemory(L, conversation(1)));
    const greet = EC.owlGreeting(L.chain.packets.length);
    check('the greeting Owl Academy types on a reload', greet === fx.continue.greeting, greet);
    L.addTurn('strix', greet);
    const n0 = L.chain.packets.length, r = L.respond(LIB, fx.continue.human).reply;
    const mine = L.chain.packets.slice(n0 - EC.tokenize(greet).length).map(p => [p.token, p.source, p.header, EC.hex64(p.seed64), p.footer]);
    check('restored and continued: every packet, the reply and the final parity are what Owl Academy computes after its reload', j(mine) === j(fx.continue.packets) && r.response === fx.continue.reply && EC.hex32(L.chain.parity) === fx.continue.final_parity,
        `${mine.length} packets, reply on ${r.concept}`);
    const after = EC.exportOwlSession(L).text;
    check('and the session saved after that is byte for byte Owl Academy\'s', Buffer.byteLength(after) === fx.continue.state_after.bytes && sha(after) === fx.continue.state_after.sha256);
    const bad = JSON.parse(fx.session.short.json); bad.packets[40].header = '00000000';
    const bi = EC.importAny(JSON.stringify(bad));
    check('an altered saved session is caught at the packet that changed', !bi.verified && /packet 40/.test(bi.checks.map(c => c.detail).join(' ')));
}
// ---------------------------------------------------------------- in: v1 chain and text-crystal exports
{
    const L = conversation(5), chainText = EC.exportV1Chain(L.chain.packets, L.chain.parity).text;
    const a = EC.importAny(chainText);
    check('a v1 chain export imports: every packet rebuilt from its token, and exported again byte for byte', a.kind === 'engram_chain' && a.verified && a.checks.every(c => c.ok), `${a.turns.length} turns`);
    check('the same memory', sameMemory(EC.liveOf(a.turns), L));
    const gL = new EC.Live(); for (const t of golden.packet_chain.turns) gL.addTurn(t.source, t.text);
    const c720 = EC.exportV1Crystal(gL.chain.packets, 720, { generatedAt: '2026-11-04T00:00:00.000Z' }).text, b = EC.importAny(c720);
    check('a 720-section crystal of the golden session imports with every speaker known, byte for byte', b.verified && b.checks.every(c => c.ok === true) && sameMemory(EC.liveOf(b.turns), gL));
    const c72 = EC.exportV1Crystal(L.chain.packets, 72, { manifold: { n: 12, k: 5, t: 3 }, generatedAt: 'x' }).text, c = EC.importAny(c72), Lc = EC.liveOf(c.turns);
    const unknown = c.turns.filter(t => t.source === 'unknown').reduce((s, t) => s + t.tokens.length, 0);
    check('a 72-section crystal imports: every slot, the master crystal and its anchor rebuilt byte for byte; speakers shared by a slot marked unknown', c.verified && c.checks[1].ok && unknown > 0,
        `${unknown} of ${Lc.chain.packets.length} tokens unknown`);
    check('their packets, words, registers and binding are the same all the same', j(Lc.outputs().words) === j(L.outputs().words) && j(Lc.outputs().registers) === j(L.outputs().registers) && j(Lc.chain.packets.map(p => p.header)) === j(L.chain.packets.map(p => p.header)));
    const t = JSON.parse(c72); t.quaternion_chain[10].seed_state[3] ^= 1;
    check('an altered crystal slot is caught', !EC.importAny(JSON.stringify(t, null, 2)).verified);
}
// ---------------------------------------------------------------- in: biochains
for (const b of fx.biochains.list) {
    const v = EC.verifyBiochain(BC, b.record);
    check(`biochain "${b.name}": the verdict is Owl Academy's verifyIntegrity's, word for word`, v.ok === b.owl.ok && j(v.reasons) === j(b.owl.reasons), v.reasons[0]);
    if (b.owl.ok) {
        const imp = EC.importAny(JSON.stringify(b.record), { BC });
        const L = EC.liveOf(imp.turns), stream = L.chain.packets.map(p => EC.hexLsb(p.grid).toUpperCase()).join('');
        check(`  imported: the text recreated exactly, its words logged as packets equal to the record's engram stream`, imp.verified && sha(imp.text) === b.text_sha256 && stream === b.record.engramStream, `${L.chain.packets.length} packets`);
    }
}
// ---------------------------------------------------------------- in: an engram stream on its own
{
    const rec = fx.biochains.list[1].record, store = EC.store(golden);
    const imp = EC.importAny(JSON.stringify({ engramStream: rec.engramStream, engramCount: rec.engramCount, engramMeanJ: rec.engramMeanJ }), { store });
    const L = EC.liveOf(imp.turns), fromText = EC.liveOf([{ source: 'stream', tokens: BC.tokenizeEngrams(EC.importAny(JSON.stringify(rec), { BC }).text) }]);
    check('an engram stream alone imports by its grids: count and mean J checked, and the same chain as the tokens it came from', imp.verified && j(L.chain.packets.map(p => [p.header, p.footer])) === j(fromText.chain.packets.map(p => [p.header, p.footer])) && sameMemory(L, fromText),
        imp.checks[imp.checks.length - 1].detail);
    const bad = EC.importAny(JSON.stringify({ engramStream: rec.engramStream, engramCount: rec.engramCount, engramMeanJ: rec.engramMeanJ + 0.01 }));
    check('a wrong mean J is caught', !bad.verified);
    const raw = EC.importAny(rec.engramStream.slice(0, 160));
    check('a bare hex stream imports too', raw.kind === 'engram_stream' && raw.turns[0].grids.length === 10);
}
// ---------------------------------------------------------------- in: ENVIRONMENT/1
for (const e of fx.environments.list) {
    const imp = EC.importAny(e.text, { LS, BC });
    check(`environment "${e.name}": the hash and its verdict are Owl Academy's`, imp.recomputed === e.owl.recomputed && imp.hashOk === e.owl.hash_ok, imp.recomputed);
}
{
    const imp = EC.importAny(fx.environments.list[0].text, { LS, BC }), cg = fx.environments.codex.good;
    check('its codex passes Owl Academy\'s ABI gate as Owl Academy says, and its boundary seed verifies', imp.codex.ok && imp.codex.entries === cg.entries && imp.codex.order === cg.order && imp.seed.hashOk && imp.verified);
    const env = JSON.parse(fx.environments.list[0].text); env.codex = fx.environments.codex.broken.stream;
    const bad = EC.importEnvironment(LS, BC, env);
    check('a broken codex fails the gate with Owl Academy\'s own message', !bad.codex.ok && bad.codex.error === fx.environments.codex.broken.error, bad.codex.error);
}
// ---------------------------------------------------------------- the pages' session store
{
    const L = conversation(5), r = EC.replayTurns(LIB, EC.turnsOf(L)), imp = EC.importAny(fx.session.short.json), r2 = EC.replayTurns(LIB, imp.turns);
    check('a stored session replays to the same memory, each STRIX reply recognised as the library\'s with its concept', sameMemory(r.live, L) && r.replies.filter(Boolean).length === 5 && r2.replies.filter(Boolean).length === 1,
        r.replies.filter(Boolean).map(x => x.concept.toLowerCase()).join(', '));
}
// ---------------------------------------------------------------- in: this system's v2, and the detector
{
    const L = conversation(3), v2 = EC.exportV2(L, { generatedAt: 'x' }).text, imp = EC.importAny(v2);
    check('a v2 export imports: packets, addresses, words and the chain quaternion rebuilt', imp.verified && imp.checks.every(c => c.ok) && sameMemory(EC.liveOf(imp.turns), L));
    const kinds = [fx.session.short.json, EC.exportV1Chain(L.chain.packets, L.chain.parity).text, EC.exportV1Crystal(L.chain.packets, 72, {}).text, v2, JSON.stringify(fx.biochains.list[0].record), fx.environments.list[0].text,
        JSON.parse(fs.readFileSync(path.join(G, 'lattice_seed_v1.json'), 'utf8')).seeds[0].text, fx.biochains.list[0].record.engramStream].map(t => EC.detectImport(t).kind);
    check('the detector names every format', j(kinds) === j(['owl_session', 'engram_chain', 'engram_text_chain', 'engram_mind_eye_v2', 'biochain', 'environment', 'lattice_seed', 'engram_stream']), kinds.join(', '));
    let refused = 0;
    for (const t of ['', '{"a":1}', 'not json', '[1,2]']) { try { EC.detectImport(t); } catch (e) { refused++; } }
    check('anything else is refused with a reason', refused === 4);
}

console.log(`\n${pass}/${pass + fail} checks pass${fail ? `, ${fail} fail` : ''}  (${EC.version})`);
process.exit(fail ? 1 : 0);
