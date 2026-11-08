// Pins the bridges to Owl Academy (Phase 6) from Owl Academy's own code.
//
//   node "Pages/Engram Minds Eye/reference/golden/make_bridges_v1.cjs" [<path to an Owl-Academy checkout>] [--check]
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
//                    on each (with SHA-256 over UTF-8, as seal-crypto.js computes it)
//       environments two ENVIRONMENT/1 objects built with the page's codex builder and hash, one altered after
//                    hashing, and parseCodexStream's verdict on a good and a broken codex
// Both are v1 pins and frozen: without --check the script writes them only when they are absent.
//
// --check (owl_extract.cjs's checkPin) compares content, not commits:
//   reproduction   both files rebuilt from the pinned content of the three files (found by SHA-256 in the checkout or
//                  its git history; ../../biochain_v1.provenance.json names the commits) must match byte for byte;
//                  if that content cannot be found the check is skipped (exit 2), never passed
//   live contract  the checkout's current code (the grower from scripts/biomesh-core.js when it exists, else
//                  biomesh.js) on the same inputs must give bridges_v1.json's records and verdicts; and on the
//                  differential set (owl_extract.cjs: the "longer" record with one field altered at a time, legacy
//                  records, the grow cap) verifyIntegrity and growBiochain must give the pinned code's verdicts. A
//                  changed function body with the same results prints a NOTE, and so does a changed file or commit
// Exits 0 when both hold, 1 when either fails, 2 when the checkout or the pinned content is missing.
// The checkout defaults to OWL_ACADEMY_DIR, else ../Owl-Academy beside this repository (scripts/lib/siblings.cjs).
// Owl's code runs in a vm context without process or require (owl_extract.cjs's sandbox).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const X = require('./owl_extract.cjs');
const siblings = require('../../../../scripts/lib/siblings.cjs');

const ARGS = process.argv.slice(2), CHECK = ARGS.includes('--check');
const OWL = path.resolve(ARGS.find(x => !x.startsWith('--')) || siblings.dir('Owl-Academy'));
const F_BIO = 'scripts/biomesh.js', F_EYE = 'Library/Experimental_Systems/Engram_Mind_Eye.html', F_3D = 'mage_tower/Biomesh_Mind_Eye_3D.html';
const SYSTEM = path.join(__dirname, '..', '..');
const OUT_JS = path.join(SYSTEM, 'biochain_v1.js'), OUT_JSON = path.join(__dirname, 'bridges_v1.json');
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const { grab, line } = X;
const SYNC = X.SYNC;
const EXPORTS = 'MAX_GROW_BYTES, STREAM_VERSION, CHUNK, SEGMENTS, fold64, qmul, qn, crystalQuat, quatHex, popcountEven, crystallizeBytes: crystallize, unpackPacket, packWord, ' +
    'engramGrid, engramGridHex, engramJ, tokenizeEngrams, engramStreamFromText, frameStream, parseBiochainStream, encodeChunk, decodeChunk, recreateChunks, recreateText, parseCodexStream';
const HUMANS = ['What does a geodesic feel like in curved space?', "Don't the 720 frames fold into 72, then 10?",
    'Show me the boundary of the Poincare disk.', 'Is light parallel to the manifold, or does it bend?', 'I keep thinking about saddles and triangles.'];
const LAT = JSON.parse(fs.readFileSync(path.join(__dirname, 'lattice_seed_v1.json'), 'utf8'));

// Both files from the three sources S (file -> text) and the provenance `source` written into them.
async function build(S, source) {
    const BIO = S[F_BIO], EYE = S[F_EYE], D3 = S[F_3D];
    const sb = X.sandbox();
    // ---- biochain_v1.js: biomesh.js's synchronous pieces, verbatim
    const body = X.syncBody(BIO);
    const js = `// The biochain, version 1: generated by reference/golden/make_bridges_v1.cjs from Owl-Academy ${F_BIO}${source.commit ? ` (commit ${source.commit.slice(0, 7)})` : ''}.
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
return { source: ${JSON.stringify({ repository: source.repository, commit: source.commit, file: F_BIO, sha256: source.files[F_BIO] })},
         ${EXPORTS} };
});
`;
    const BC = sb.compile([], body + `\nreturn { ${EXPORTS} };`)();

    // ---- biochains: growBiochain and verifyIntegrity, run as written, SHA-256 over UTF-8 as seal-crypto.js computes it
    const asyncPart = X.growerFromSource(BIO, sb);

    // ---- the Engram Mind Eye: its session, saved and restored (owl_eye.cjs's recipe)
    const eye = X.loadOwlEye(EYE, sb), owl = eye.owl;
    const short = owl(); short.intro(); short.say(HUMANS[0]);
    const shortJson = short.stateJson();
    const long = owl(); long.intro(); HUMANS.forEach(h => long.say(h));
    const longJson = long.stateJson();
    // a reload: restoreEngram on the saved JSON, the greeting typed and logged, then one more exchange
    const back = owl(), saved = JSON.parse(shortJson);
    back.restoreEngram(saved);
    const greet = back.greeting(saved), n0 = back.packetChain.length;
    back.logTokens(greet, 'strix'); back.conversation().push(sb.adopt({ role: 'strix', text: greet }));
    const r = back.say(HUMANS[1]);
    const cont = { greeting: greet, human: HUMANS[1], reply: r.response, concept: r.bestConcept,
        packets: back.packetChain.slice(n0).map(p => [p.token, p.source, p.header, p.seed64, p.footer]), final_parity: back.hex32(back.parity()), state_after: { bytes: Buffer.byteLength(back.stateJson()), sha256: sha256(back.stateJson()) } };

    // ---- biochains
    const intro = eye.intro;
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
    const ENV = sb.compile([], pageBits.slice(3, 5).join('\n') + '\n' + pageBits.slice(0, 3).join('\n') + '\n' + pageBits[5] +
        `\nfunction hashEnv(env) { const boundary = env.boundary; ${hashLine} return env.hash; }\nreturn { buildCodexFromText, hashEnv, fold32 };`)();
    function environments() {
        // hashEnv sets env.hash inside the sandbox on a copy; the hash is set here from what it returns (the same key, last)
        const boundary = JSON.parse(LAT.seeds[0].text), codex = ENV.buildCodexFromText(intro);
        const E1 = { kind: 'ENVIRONMENT/1', v: 1, boundary, codex, pump: { frames: 720, breath: 0.5, torsion: 3, reach: 12, backprop: true, expansion: [1, 3, 7, 6, 12, 64].join('-') }, frontier: [1, 5, 9, 41] };
        E1.hash = ENV.hashEnv(E1);
        const E2 = { kind: 'ENVIRONMENT/1', v: 1, boundary, codex: null, pump: { frames: 1440, breath: 0.8, torsion: 1.5, reach: 12, backprop: false, expansion: '1-3-7-6-12-64' }, frontier: [] };
        E2.hash = ENV.hashEnv(E2);
        const E3 = JSON.parse(JSON.stringify(E1)); E3.pump.torsion = 2;              // changed after hashing
        const verdict = env => { const c = JSON.parse(JSON.stringify(env)), stored = c.hash, re = ENV.hashEnv(c); return { recomputed: re, hash_ok: re === stored }; };
        const codexVerdict = s => { try { const p = BC.parseCodexStream(s); return { ok: true, order: p.order, chunk: p.chunk, entries: p.entries.length }; } catch (e) { return { ok: false, error: e.message }; } };
        const broken = codex.slice(0, 20) + (parseInt(codex[20], 16) ^ 1).toString(16).toUpperCase() + codex.slice(21);   // one bit of the first PRIME
        return { list: [['with a codex', E1], ['no codex', E2], ['changed after hashing', E3]].map(([name, env]) => ({ name, text: JSON.stringify(env), owl: verdict(env) })),
            codex: { good: codexVerdict(codex), broken: { stream: broken, ...codexVerdict(broken) } } };
    }

    const out = {
        format: 'bridges_v1_golden', version: 1, source,
        note: 'What Owl Academy\'s own code gives on fixed inputs: the session the Engram Mind Eye saves and how it continues after a reload; biochains grown and verified by biomesh.js; ENVIRONMENT/1 objects built and hashed by the Biomesh Mind\'s Eye 3D.',
        session: { humans: HUMANS, short: { exchanges: 1, json: shortJson }, long: { exchanges: 5, bytes: Buffer.byteLength(longJson), sha256: sha256(longJson) } },
        continue: cont,
        biochains: await biochains(),
        environments: environments(),
    };
    return { js, json: JSON.stringify(out, null, 1) + '\n', out };
}

const recorded = fs.existsSync(OUT_JSON) ? JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')).source : null;
if (CHECK) {
    if (!recorded) { console.log('FAIL  bridges_v1.json is missing: run without --check'); process.exit(1); }
    const live = { repository: recorded.repository, commit: null, files: {} };
    X.checkPin({
        name: 'make_bridges_v1 (biochain_v1.js, bridges_v1.json)',
        repo: { name: 'Owl-Academy', root: OWL },
        sources: [
            { file: F_BIO, sha256: recorded.files[F_BIO], candidates: X.OWL_GROWER, names: X.GROWER_NAMES },
            { file: F_EYE, sha256: recorded.files[F_EYE], names: ['saveEngram', 'restoreEngram'] },
            { file: F_3D, sha256: recorded.files[F_3D], names: ['popcountEven', 'packWord', 'fold32', 'buildCodexFromText'] },
        ],
        outputs: [{ label: 'biochain_v1.js', path: OUT_JS }, { label: 'bridges_v1.json', path: OUT_JSON }],
        build: async (S, mode) => { const b = await build(S, mode === 'reproduction' ? recorded : live); return [b.js, b.json]; },
        // the live contract: everything in bridges_v1.json but its provenance (biochain_v1.js is code: its bodies are compared below)
        behaviour: texts => X.stripKeys(JSON.parse(texts[1]), ['source']),
        // the verifier's reject paths, which v1's two altered records barely reach: the pinned code is the oracle
        differential: async (P, L) => X.differential(X.growerFromSource(P[F_BIO]), X.growerFromSource(L[F_BIO]), JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')).biochains.list[1].record),
        bodies: [{ file: F_BIO, names: [...X.CONST_NAMES, ...SYNC], pinned: () => fs.readFileSync(OUT_JS, 'utf8') }],
        commitNotes: () => { const c = X.lastCommit(OWL, [F_BIO, F_EYE, F_3D]); return c && recorded.commit && c !== recorded.commit ? [`the last commit to touch the three files is ${c.slice(0, 7)}; v1 recorded ${recorded.commit.slice(0, 7)} (per-file commits: biochain_v1.provenance.json)`] : []; },
    }).catch(e => { console.error(e); process.exit(1); });
} else {
    (async () => {
        for (const f of [F_BIO, F_EYE, F_3D]) if (!fs.existsSync(path.join(OWL, f))) { console.error(`missing ${f}: pass the path of an Owl-Academy checkout`); process.exit(2); }
        const S = Object.fromEntries([F_BIO, F_EYE, F_3D].map(f => [f, fs.readFileSync(path.join(OWL, f), 'utf8')]));
        const commit = X.lastCommit(OWL, [F_BIO, F_EYE, F_3D]);
        const source = { repository: 'BioChainAI/Owl-Academy', commit, files: { [F_BIO]: sha256(S[F_BIO]), [F_EYE]: sha256(S[F_EYE]), [F_3D]: sha256(S[F_3D]) } };
        const b = await build(S, source);
        const w1 = X.writeFrozen(OUT_JS, b.js), w2 = X.writeFrozen(OUT_JSON, b.json);
        const bcs = b.out.biochains.list.map(x => `${x.name}: ${x.owl.ok ? 'ok' : x.owl.reasons[0]}`).join('; ');
        console.log(`biochain_v1.js ${w1}, bridges_v1.json ${w2}: session ${Buffer.byteLength(b.out.session.short.json)} B; continuation ${b.out.continue.packets.length} packets; biochains ${bcs}; environments ${b.out.environments.list.map(e => `${e.name} ${e.owl.hash_ok ? 'ok' : 'mismatch'}`).join(', ')}; Owl-Academy ${commit ? commit.slice(0, 7) : '(no git)'}`);
    })().catch(e => { console.error(e); process.exit(1); });
}
