// Pins the bridges to Owl Academy (Phase 6) from Owl Academy's own code.
//
//   node "Pages/Engram Minds Eye/reference/golden/make_bridges_v1.cjs" <path to an Owl-Academy checkout> [--check]
//
// It reads three files of the Owl-Academy repository, unchanged:
//   scripts/biomesh.js                                  the biochain: its SHD-CCP stream codec, lossless text coder,
//                                                       chiral weave, token engram layer, grow and verify, and the
//                                                       codex parser
//   Library/Experimental_Systems/Engram_Mind_Eye.html   the session the page saves (saveEngram), restores
//                                                       (restoreEngram) and the greeting it types on a reload
//   mage_tower/Biomesh_Mind_Eye_3D.html                 ENVIRONMENT/1: its codex builder and its hash
// and writes:
//   ../../biochain_v1.js     biomesh.js's synchronous codec functions, verbatim, as a UMD module (BiochainV1)
//   bridges_v1.json          what Owl Academy's code gives on fixed inputs:
//       session      a short conversation as the Engram Mind Eye saves it (the exact JSON), and the five-exchange
//                    conversation's saved JSON by length and SHA-256
//       continue     that short session restored by restoreEngram, the reload greeting typed, and one more exchange:
//                    every new packet, the reply and the final codex parity
//       biochains    records grown by growBiochain from three texts, two altered copies, and verifyIntegrity's verdict
//                    on each (with SHA-256 over UTF-8, as seal-crypto.js computes it, from Node's crypto)
//       environments two ENVIRONMENT/1 objects built with the page's codex builder and hash, one altered after
//                    hashing, and parseCodexStream's verdict on a good and a broken codex
// With --check it compares both files with what Owl Academy's code gives now instead of writing them.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ARGS = process.argv.slice(2), CHECK = ARGS.includes('--check');
const OWL = path.resolve(ARGS.find(x => !x.startsWith('--')) || path.join(__dirname, '..', '..', '..', '..', '..', 'Owl-Academy'));
const F_BIO = 'scripts/biomesh.js', F_EYE = 'Library/Experimental_Systems/Engram_Mind_Eye.html', F_3D = 'mage_tower/Biomesh_Mind_Eye_3D.html';
for (const f of [F_BIO, F_EYE, F_3D]) if (!fs.existsSync(path.join(OWL, f))) { console.error(`missing ${f}: pass the path of an Owl-Academy checkout`); process.exit(2); }
const SYSTEM = path.join(__dirname, '..', '..');
const OUT_JS = path.join(SYSTEM, 'biochain_v1.js'), OUT_JSON = path.join(__dirname, 'bridges_v1.json');
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const read = f => fs.readFileSync(path.join(OWL, f), 'utf8');
const BIO = read(F_BIO), EYE = read(F_EYE), D3 = read(F_3D);
let commit = null;
try { commit = execFileSync('git', ['-C', OWL, 'log', '-1', '--format=%H', '--', F_BIO, F_EYE, F_3D]).toString().trim(); } catch (e) { /* not a git checkout */ }
const source = { repository: 'BioChainAI/Owl-Academy', commit, files: { [F_BIO]: sha256(BIO), [F_EYE]: sha256(EYE), [F_3D]: sha256(D3) } };

// ---- taking code by name: a function or class to its closing brace, a const statement to its semicolon
function grab(src, name) {
    const m = new RegExp(`^[ \\t]*(?:export )?((?:async )?function ${name}\\(|class ${name} |const ${name} = )`, 'm').exec(src);
    if (!m) throw new Error(`${name} not found`);
    const start = m.index + m[0].length - m[1].length;
    let i = start, depth = 0;
    if (m[1].startsWith('const')) {
        for (; i < src.length; i++) { const c = src[i]; if ('([{'.includes(c)) depth++; else if (')]}'.includes(c)) depth--; else if (c === ';' && depth === 0) break; }
        return src.slice(start, i + 1);
    }
    if (m[1].includes('function')) {                // skip the parameter list (it may hold `opts = {}`)
        i = src.indexOf('(', start);
        for (depth = 0; i < src.length; i++) { if (src[i] === '(') depth++; else if (src[i] === ')' && --depth === 0) break; }
    }
    i = src.indexOf('{', i);
    for (depth = 0; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}' && --depth === 0) break; }
    return src.slice(start, i + 1);
}
const line = (src, start) => { const i = src.indexOf(start); if (i < 0) throw new Error(`${start} not found`); return src.slice(i, src.indexOf('\n', i)).trim(); };

// ---- biochain_v1.js: biomesh.js's synchronous pieces, verbatim
const SYNC = ['M64', 'fold64', 'qmul', 'qconj', 'qn', 'crystalQuat', 'quatHex', 'PAR_MASK', 'popcountEven', 'crystallize', 'unpackPacket', 'packWord',
    'mulberry32', 'engramCharGrid', 'engramGrid', 'engramGridHex', 'engramJ', 'tokenizeEngrams', 'engramStreamFromText',
    'frameStream', 'parseBiochainStream', 'BW', 'BR', 'cands', 'upd', 'encodeChunk', 'decodeChunk', 'chainFrames', 'recreateChunks', 'recreateText', 'parseCodexStream'];
const consts = [line(BIO, 'export const MAX_GROW_BYTES'), line(BIO, 'export const STREAM_VERSION'), line(BIO, 'const CHUNK = ')].map(l => l.replace(/^export /, ''));
const body = consts.concat(SYNC.map(n => grab(BIO, n).replace(/^export /, ''))).join('\n');
const EXPORTS = 'MAX_GROW_BYTES, STREAM_VERSION, CHUNK, SEGMENTS, fold64, qmul, qn, crystalQuat, quatHex, popcountEven, crystallizeBytes: crystallize, unpackPacket, packWord, ' +
    'engramGrid, engramGridHex, engramJ, tokenizeEngrams, engramStreamFromText, frameStream, parseBiochainStream, encodeChunk, decodeChunk, recreateChunks, recreateText, parseCodexStream';
const js = `// The biochain, version 1: generated by reference/golden/make_bridges_v1.cjs from Owl-Academy ${F_BIO}${commit ? ` (commit ${commit.slice(0, 7)})` : ''}.
// Do not edit: run the script again, and --check to compare. biomesh.js's synchronous functions, verbatim: the SHD-CCP
// stream codec, the order-2 rank coder that recreates a biochain's text losslessly, the chiral weave, the token
// engram layer and the codex parser. growBiochain and verifyIntegrity are async (they hash with Web Crypto);
// EngramCore.verifyBiochain repeats verifyIntegrity's steps with a synchronous SHA-256, and the tests check its
// verdicts against Owl Academy's own on the records in reference/golden/bridges_v1.json.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.BiochainV1 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
${body}
return { source: ${JSON.stringify({ repository: source.repository, commit, file: F_BIO, sha256: source.files[F_BIO] })},
         ${EXPORTS} };
});
`;
const BC = new Function(body + `\nreturn { ${EXPORTS} };`)();

// ---- biochains: growBiochain and verifyIntegrity, run as written, with seal-crypto's sha256Hex (SHA-256 over UTF-8)
const SC = { sha256Hex: async str => sha256(Buffer.from(String(str), 'utf8')) };
const asyncPart = new Function('SC', body + '\n' + grab(BIO, 'growBiochain').replace(/^export /, '') + '\n' + grab(BIO, 'verifyIntegrity').replace(/^export /, '') +
    '\nreturn { growBiochain, verifyIntegrity };')(SC);

// ---- the Engram Mind Eye: its session, saved and restored
const a = EYE.indexOf('/* =====================================================================\n   TTMPT ENGRAM CORE');
const b = EYE.indexOf('/* =====================================================================\n   RENDERING');
const introM = /const STRIX_INTRO =\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+);/.exec(EYE);
const saveBody = grab(EYE, 'saveEngram'), stateStmt = saveBody.slice(saveBody.indexOf('const state = '), saveBody.indexOf('localStorage.setItem'));
const greetStmt = (() => { const i = EYE.indexOf('const resumeGreeting = '); return EYE.slice(i, EYE.indexOf(';', EYE.indexOf('We continue.', i)) + 1); })();
function owl() {
    return new Function(`
        const window = { MANIFOLD_TOKEN: 'D8K3T2' };
        let manifoldN = 8, manifoldK = 3, manifoldT = 2;
        const setEngramManifold = (n, k, t) => { manifoldN = n; manifoldK = k; manifoldT = t; window.MANIFOLD_TOKEN = 'D' + n + 'K' + k + 'T' + t; };
        const addMessage = () => ({}), escapeHtml = s => s;
        ${EYE.slice(a, b)}
        const STRIX_INTRO = ${introM[1]};
        function stateJson() { ${stateStmt} return JSON.stringify(state); }
        ${grab(EYE, 'restoreEngram')}
        function greeting(saved) {
            const epochCount = (saved.biochain || []).length, packetCount = (saved.packets || []).length;
            const lastNode = (saved.biochain || []).slice(-1)[0], lastTheme = lastNode ? lastNode.theme : null;
            ${greetStmt}
            return resumeGreeting;
        }
        function say(text) {                          // transmit() without the page: the human turn, then STRIX's reply
            conversationLog.push({ role: 'human', text }); logTokens(text, 'human');
            const r = selectResponse(text); conversationLog.push({ role: 'strix', text: r.response }); logTokens(r.response, 'strix');
            return r;
        }
        function intro() { logTokens(STRIX_INTRO, 'strix'); conversationLog.push({ role: 'strix', text: STRIX_INTRO }); }
        return { intro, say, stateJson, restoreEngram, greeting, logTokens, packetChain, parity: () => codexParity, hex32, conversation: () => conversationLog };`)();
}
const HUMANS = ['What does a geodesic feel like in curved space?', "Don't the 720 frames fold into 72, then 10?",
    'Show me the boundary of the Poincare disk.', 'Is light parallel to the manifold, or does it bend?', 'I keep thinking about saddles and triangles.'];
const short = owl(); short.intro(); short.say(HUMANS[0]);
const shortJson = short.stateJson();
const long = owl(); long.intro(); HUMANS.forEach(h => long.say(h));
const longJson = long.stateJson();
// a reload: restoreEngram on the saved JSON, the greeting typed and logged, then one more exchange
const back = owl(), saved = JSON.parse(shortJson);
back.restoreEngram(saved);
const greet = back.greeting(saved), n0 = back.packetChain.length;
back.logTokens(greet, 'strix'); back.conversation().push({ role: 'strix', text: greet });
const r = back.say(HUMANS[1]);
const cont = { greeting: greet, human: HUMANS[1], reply: r.response, concept: r.bestConcept,
    packets: back.packetChain.slice(n0).map(p => [p.token, p.source, p.header, p.seed64, p.footer]), final_parity: back.hex32(back.parity()), state_after: { bytes: Buffer.byteLength(back.stateJson()), sha256: sha256(back.stateJson()) } };

// ---- biochains
const intro = new Function(`return ${introM[1]};`)();
const texts = {
    intro,
    longer: [intro, ...HUMANS, "STRIX's library, in its own words: geodesics, curvature, Poincaré's disk — 180° is too many for a hyperbolic triangle."].join('\n\n').repeat(4),
    short: 'MIND EYE STRIX',
};

async function biochains() {
    const out = [];
    for (const [name, text] of Object.entries(texts)) {
        const rec = await asyncPart.growBiochain(text);
        out.push({ name, record: rec, owl: await asyncPart.verifyIntegrity(rec), text_sha256: sha256(text), bytes: Buffer.byteLength(text) });
    }
    const base = out[1].record;
    const eng = JSON.parse(JSON.stringify(base)); eng.engramStream = eng.engramStream.slice(0, 40) + (eng.engramStream[40] === 'A' ? 'B' : 'A') + eng.engramStream.slice(41);
    const res = JSON.parse(JSON.stringify(base)), fr = BC.parseBiochainStream(res.stream), k = 16 + 8 + 10;       // a residual byte of frame 0
    res.stream = res.stream.slice(0, k) + (res.stream[k] === '0' ? '1' : '0') + res.stream.slice(k + 1);
    for (const [name, rec] of [['engram stream altered', eng], ['residual altered', res]]) out.push({ name, record: rec, owl: await asyncPart.verifyIntegrity(rec) });
    return { frames_in_longer: fr.length, list: out };
}

// ---- environments: the page's codex builder and hash
const pageBits = [grab(D3, 'popcountEven'), grab(D3, 'packWord'), grab(D3, 'fold32'), line(D3, 'const M64 = '), line(D3, 'const PAR_MASK = '), grab(D3, 'buildCodexFromText')];
const hashLine = line(D3, "env.hash = '0x' + fold32(");
const ENV = new Function(pageBits.slice(3, 5).join('\n') + '\n' + pageBits.slice(0, 3).join('\n') + '\n' + pageBits[5] +
    `\nfunction hashEnv(env) { const boundary = env.boundary; ${hashLine} return env.hash; }\nreturn { buildCodexFromText, hashEnv, fold32 };`)();
const LAT = JSON.parse(fs.readFileSync(path.join(__dirname, 'lattice_seed_v1.json'), 'utf8'));
function environments() {
    const boundary = JSON.parse(LAT.seeds[0].text), codex = ENV.buildCodexFromText(intro);
    const E1 = { kind: 'ENVIRONMENT/1', v: 1, boundary, codex, pump: { frames: 720, breath: 0.5, torsion: 3, reach: 12, backprop: true, expansion: [1, 3, 7, 6, 12, 64].join('-') }, frontier: [1, 5, 9, 41] };
    ENV.hashEnv(E1);
    const E2 = { kind: 'ENVIRONMENT/1', v: 1, boundary, codex: null, pump: { frames: 1440, breath: 0.8, torsion: 1.5, reach: 12, backprop: false, expansion: '1-3-7-6-12-64' }, frontier: [] };
    ENV.hashEnv(E2);
    const E3 = JSON.parse(JSON.stringify(E1)); E3.pump.torsion = 2;              // changed after hashing
    const verdict = env => { const c = JSON.parse(JSON.stringify(env)), stored = c.hash, re = ENV.hashEnv(c); return { recomputed: re, hash_ok: re === stored }; };
    const codexVerdict = s => { try { const p = BC.parseCodexStream(s); return { ok: true, order: p.order, chunk: p.chunk, entries: p.entries.length }; } catch (e) { return { ok: false, error: e.message }; } };
    const broken = codex.slice(0, 20) + (parseInt(codex[20], 16) ^ 1).toString(16).toUpperCase() + codex.slice(21);   // one bit of the first PRIME
    return { list: [['with a codex', E1], ['no codex', E2], ['changed after hashing', E3]].map(([name, env]) => ({ name, text: JSON.stringify(env), owl: verdict(env) })),
        codex: { good: codexVerdict(codex), broken: { stream: broken, ...codexVerdict(broken) } } };
}

(async () => {
    const out = {
        format: 'bridges_v1_golden', version: 1, source,
        note: 'What Owl Academy\'s own code gives on fixed inputs: the session the Engram Mind Eye saves and how it continues after a reload; biochains grown and verified by biomesh.js; ENVIRONMENT/1 objects built and hashed by the Biomesh Mind\'s Eye 3D.',
        session: { humans: HUMANS, short: { exchanges: 1, json: shortJson }, long: { exchanges: 5, bytes: Buffer.byteLength(longJson), sha256: sha256(longJson) } },
        continue: cont,
        biochains: await biochains(),
        environments: environments(),
    };
    const json = JSON.stringify(out, null, 1) + '\n';
    if (CHECK) {
        const x = fs.existsSync(OUT_JS) && fs.readFileSync(OUT_JS, 'utf8') === js, y = fs.existsSync(OUT_JSON) && fs.readFileSync(OUT_JSON, 'utf8') === json;
        console.log(`biochain_v1.js ${x ? 'matches' : 'DIFFERS from'} Owl Academy; bridges_v1.json ${y ? 'matches' : 'DIFFERS from'} Owl Academy`);
        process.exit(x && y ? 0 : 1);
    }
    fs.writeFileSync(OUT_JS, js);
    fs.writeFileSync(OUT_JSON, json);
    const bcs = out.biochains.list.map(b => `${b.name}: ${b.owl.ok ? 'ok' : b.owl.reasons[0]}`).join('; ');
    console.log(`wrote biochain_v1.js and bridges_v1.json: session ${Buffer.byteLength(shortJson)} B; continuation ${cont.packets.length} packets; biochains ${bcs}; environments ${out.environments.list.map(e => `${e.name} ${e.owl.hash_ok ? 'ok' : 'mismatch'}`).join(', ')}; Owl-Academy ${commit ? commit.slice(0, 7) : '(no git)'}`);
})();
