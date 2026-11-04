#!/usr/bin/env node
// Runs the follow-up claim E11, the way back to Owl Academy (../PREREGISTRATION.md, Amendment 2), and writes its
// decision to results/e11.json.
//
//   node "Pages/Engram Minds Eye/reference/run_e11.cjs" [<path to an Owl-Academy checkout>] [--dry]
//
// Authority: Owl Academy's own code in Engram_Mind_Eye.html (golden/owl_eye.cjs runs it as written: tokenize,
// logPacket, selectResponse, the state saveEngram writes, restoreEngram, the reload greeting) against the browser
// core (engram_core.js). The Python reference has no bridge, so this claim alone is decided between those two.
//
// Instances: 50 conversations from hpstep Rng(5500 + i): STRIX's introduction, then h = 1 + below(5) human turns,
// each n = 3 + below(10) tokens of the dialogue store (each below(477)) joined by single spaces; STRIX answers by
// retrieval. The continuation is one more human turn drawn the same way from Rng(6500 + i).
// Test, exact, every conversation: (a) exportOwlSession is byte for byte what Owl Academy saves; (b) after Owl
// Academy restores the exported bytes, greets and takes the continuation, its new packets, reply and parity equal
// this system's continuation of its own import of the same bytes; (c) Owl Academy's next save is byte for byte this
// system's export after the continuation. Control: the export with codexParity set to the parity before the last
// packet must make Owl Academy's continuation differ in at least one conversation, or the test is void.
// --dry moves every seed up by 3000, runs 5 conversations and writes nothing.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const SYSTEM = path.join(__dirname, '..');
const EC = require(path.join(SYSTEM, 'engram_core.js'));
const LIB = require(path.join(SYSTEM, 'strix_library_v1.js'));
const C = require(path.join(SYSTEM, '..', 'Hyperbolic Oracles', 'hyperbolic_core.js'));
const { loadOwlEye } = require(path.join(__dirname, 'golden', 'owl_eye.cjs'));

const ARGS = process.argv.slice(2), DRY = ARGS.includes('--dry');
const OWL = path.resolve(ARGS.find(x => !x.startsWith('--')) || path.join(SYSTEM, '..', '..', '..', 'Owl-Academy'));
const OFF = DRY ? 3000 : 0, N = DRY ? 5 : 50, KEEP = 20;
const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden', 'engram_v1.json'), 'utf8'));
const STORE = EC.store(golden);
const eye = loadOwlEye(OWL);
const t0 = Date.now();

const turnText = rng => { const n = 3 + rng.below(10), toks = []; for (let k = 0; k < n; k++) toks.push(STORE[rng.below(STORE.length)]); return toks.join(' '); };
const rows = p => [p.token, p.source, p.header, typeof p.seed64 === 'bigint' ? EC.hex64(p.seed64) : p.seed64, p.footer];
function owlContinue(json, cont) {                  // Owl Academy restores the bytes, greets, and takes one more turn
    const o = eye.owl(), saved = JSON.parse(json);
    o.restoreEngram(saved);
    const greet = o.greeting(saved), n0 = o.packetChain.length;
    o.logTokens(greet, 'strix'); o.conversation().push({ role: 'strix', text: greet });
    const r = o.say(cont);
    return { greet, packets: o.packetChain.slice(n0).map(rows), reply: r.response, parity: o.hex32(o.parity()), next: o.stateJson() };
}

const fails = [], cases = [];
let controlDiffers = 0, packetsTotal = 0, turnsTotal = 0;
for (let i = 0; i < N; i++) {
    const rng = new C.Rng(5500 + i + OFF), h = 1 + rng.below(5), humans = Array.from({ length: h }, () => turnText(rng));
    const cont = turnText(new C.Rng(6500 + i + OFF));
    // this system: the conversation and its export
    const L = new EC.Live();
    L.addTurn('strix', LIB.intro);
    humans.forEach(x => L.respond(LIB, x));
    const ours = EC.exportOwlSession(L).text;
    // Owl Academy: the same conversation, saved as its page saves it
    const P = eye.owl();
    P.intro(); humans.forEach(x => P.say(x));
    const a = ours === P.stateJson();
    // (b) Owl Academy continues our bytes; this system continues its own import of them
    const owl = owlContinue(ours, cont);
    const imp = EC.importAny(ours), M = EC.liveOf(imp.turns), n0 = M.chain.packets.length, greet = EC.owlGreeting(n0);
    M.addTurn('strix', greet);
    const reply = M.respond(LIB, cont).reply.response;
    const mine = { greet, packets: M.chain.packets.slice(n0).map(rows), reply, parity: EC.hex32(M.chain.parity), next: EC.exportOwlSession(M).text };
    const b = imp.verified && owl.greet === mine.greet && JSON.stringify(owl.packets) === JSON.stringify(mine.packets) && owl.reply === mine.reply && owl.parity === mine.parity;
    const c = owl.next === mine.next;
    // the control: the parity before the last packet in place of the last
    const ctl = JSON.parse(ours); ctl.codexParity = parseInt(L.chain.packets[L.chain.packets.length - 2].header, 16);
    const oc = owlContinue(JSON.stringify(ctl), cont);
    if (JSON.stringify(oc.packets) !== JSON.stringify(mine.packets) || oc.parity !== mine.parity) controlDiffers++;
    packetsTotal += L.chain.packets.length; turnsTotal += L.turns.length;
    cases.push({ i, humans: h, packets: L.chain.packets.length, continuation_packets: mine.packets.length, bytes: Buffer.byteLength(ours), a, b, c });
    if (!(a && b && c)) fails.push({ conversation: i, a, b, c, first_difference: !b ? (owl.greet !== mine.greet ? 'greeting' : owl.reply !== mine.reply ? 'reply' : owl.parity !== mine.parity ? 'parity' : 'packets') : null });
}
const decision = controlDiffers === 0 ? 'void' : fails.length ? 'refuted' : 'supported';
const out = {
    preregistration: 'PREREGISTRATION.md, Amendment 2', started: new Date().toISOString(),
    environment: { node: process.version, platform: `${os.type()} ${os.release()}` }, owl: eye.source,
    claims: { E11: {
        decision, cases: cases.length, failures: fails.length, counterexamples: fails.slice(0, KEEP),
        control: { 'codexParity one packet back: Owl Academy\'s continuation differs': `${controlDiffers}/${cases.length}` },
        reported: { conversations: cases.length, turns: turnsTotal, packets: packetsTotal, continuation_packets: cases.reduce((s, x) => s + x.continuation_packets, 0),
            session_bytes: { min: Math.min(...cases.map(x => x.bytes)), max: Math.max(...cases.map(x => x.bytes)) }, per_conversation: cases },
        seconds: +((Date.now() - t0) / 1000).toFixed(1) } },
};
const r = out.claims.E11;
console.log(`E11: ${decision.toUpperCase()}  (${r.cases} conversations, ${r.failures} failures, ${r.seconds} s)`);
console.log(`      (a) export = Owl's save: ${cases.filter(x => x.a).length}/${cases.length}; (b) Owl's continuation = ours: ${cases.filter(x => x.b).length}/${cases.length}; (c) next save: ${cases.filter(x => x.c).length}/${cases.length}`);
console.log(`      control: ${controlDiffers}/${cases.length} conversations where Owl Academy's continuation of the altered export differs`);
console.log(`      ${turnsTotal} turns, ${packetsTotal} packets, ${r.reported.continuation_packets} continuation packets; sessions ${r.reported.session_bytes.min}–${r.reported.session_bytes.max} bytes; Owl-Academy ${eye.source.commit ? eye.source.commit.slice(0, 7) : '(no git)'}`);
if (DRY) { console.log('dry run: nothing written'); process.exit(0); }
fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'results', 'e11.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote results/e11.json');
