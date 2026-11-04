// Pins what the 2D page (Phase 4) takes from Owl Academy beyond the key: STRIX's library and reply rule, and the
// exact bytes of the two v1 exports.
//
//   node "Pages/Engram Minds Eye/reference/golden/make_owl_v1.cjs" <path to an Owl-Academy checkout> [--check]
//
// It runs Owl Academy's own code from Library/Experimental_Systems/Engram_Mind_Eye.html, unchanged: the TTMPT core,
// the concept library, selectResponse, tokenize and logPacket, then computeTextCrystal, crystalChiralKey and the
// bodies of exportChain and exportSegmented (only the lines that build the data; the page's download code is not
// run). It writes two files:
//   ../../strix_library_v1.js   STRIX's introduction and the fifteen concepts with their three replies, as a UMD
//                               module (StrixLibraryV1), verbatim
//   exports_v1.json             for three sessions, the replies Owl's selectResponse gives, and the length and
//                               SHA-256 of every v1 export the page would download: engram_chain_N…_P….json and
//                               engram_crystal_S72/S720_N….json, with generated_at fixed and the manifold stated
// With --check it compares both with what Owl Academy's code gives now instead of writing them.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ARGS = process.argv.slice(2), CHECK = ARGS.includes('--check');
const OWL = path.resolve(ARGS.find(x => !x.startsWith('--')) || path.join(__dirname, '..', '..', '..', '..', '..', 'Owl-Academy'));
const PAGE_REL = 'Library/Experimental_Systems/Engram_Mind_Eye.html', PAGE = path.join(OWL, PAGE_REL);
if (!fs.existsSync(PAGE)) { console.error(`missing ${PAGE}: pass the path of an Owl-Academy checkout`); process.exit(2); }
const SYSTEM = path.join(__dirname, '..', '..');
const OUT_LIB = path.join(SYSTEM, 'strix_library_v1.js'), OUT_EXP = path.join(__dirname, 'exports_v1.json');
const EC = require(path.join(SYSTEM, 'engram_core.js'));
const GOLDEN = JSON.parse(fs.readFileSync(path.join(__dirname, 'engram_v1.json'), 'utf8'));

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
let commit = null;
try { commit = execFileSync('git', ['-C', OWL, 'log', '-1', '--format=%H', '--', PAGE_REL]).toString().trim(); } catch (e) { /* not a git checkout */ }
const src = fs.readFileSync(PAGE, 'utf8');

// ---- Owl's code, taken by markers and by name
const a = src.indexOf('/* =====================================================================\n   TTMPT ENGRAM CORE');
const b = src.indexOf('/* =====================================================================\n   RENDERING');
if (a < 0 || b < 0 || b < a) throw new Error('markers not found in Engram_Mind_Eye.html');
const introM = /const STRIX_INTRO =\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+);/.exec(src);
if (!introM) throw new Error('STRIX_INTRO not found');
function grabFn(name) {                         // `function name(...) { ... }` by brace matching
    const i = src.indexOf(`function ${name}(`);
    if (i < 0) throw new Error(`${name} not found`);
    let j = src.indexOf('{', i), depth = 0;
    for (; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}' && --depth === 0) break; }
    return src.slice(i, j + 1);
}
function between(text, from, to) {               // the lines of `text` from the marker `from` up to the marker `to`
    const i = text.indexOf(from), j = text.indexOf(to, i);
    if (i < 0 || j < 0) throw new Error(`marker not found: ${from} / ${to}`);
    return text.slice(i, j);
}
const chainData = between(grabFn('exportChain'), 'const data =', 'const blob');
const segData = between(grabFn('exportSegmented'), '// distribute packet i', 'const blob');
const FIXED = '2026-11-04T00:00:00.000Z';

// One fresh Owl session per call: its own packet chain, window and codex parity, as the page has after a reload.
function owl(manifold) {
    const body = `
        const window = { MANIFOLD_TOKEN: 'D' + ${manifold.n} + 'K' + ${manifold.k} + 'T' + ${manifold.t} };
        let manifoldN = ${manifold.n}, manifoldK = ${manifold.k}, manifoldT = ${manifold.t};
        const Date = function () { return { toISOString: () => '${FIXED}' }; };
        ${src.slice(a, b)}
        const STRIX_INTRO = ${introM[1]};
        ${grabFn('computeTextCrystal')}
        ${grabFn('crystalChiralKey')}
        function exportChainData() { ${chainData} return data; }
        function exportSegmentedData(sections) { const N = packetChain.length; ${segData} return data; }
        return { CONCEPTS, CONCEPT_NAMES, STRIX_INTRO, tokenize, logPacket, logTokens, selectResponse, hex32, packetChain,
                 parity: () => codexParity, exportChainData, exportSegmentedData };`;
    return new Function(body)();
}

// ---- STRIX's library
const P0 = owl({ n: 8, k: 3, t: 2 });
const library = {
    source: { repository: 'BioChainAI/Owl-Academy', commit, file: PAGE_REL, sha256: sha256(src) },
    intro: P0.STRIX_INTRO,
    reply_rule: 'nearest concept to crystallize(the human text) by Hamming distance, first on ties; reply 0 if J(gamma) > 0.1, 2 if J(gamma) < -0.1, else 1, with gamma the window after the human tokens are logged',
    concepts: P0.CONCEPT_NAMES.map(name => ({ name, responses: P0.CONCEPTS[name].responses.slice() })),
};
const libJs = `// STRIX's library, version 1: generated by reference/golden/make_owl_v1.cjs from Owl-Academy
// ${PAGE_REL}${commit ? ` (commit ${commit.slice(0, 7)})` : ''}. Do not edit: run the script again, and --check to compare.
// The introduction and the fifteen concepts with their three replies are verbatim; the order of the concepts is the
// page's CONCEPT_NAMES, which the packet footer indexes. EngramCore.strixReply applies the page's reply rule.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.StrixLibraryV1 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
return ${JSON.stringify(library, null, 1)};
});
`;

// ---- three sessions, their replies and their v1 exports
const HUMANS = ['What does a geodesic feel like in curved space?', "Don't the 720 frames fold into 72, then 10?",
    'Show me the boundary of the Poincare disk.', 'Is light parallel to the manifold, or does it bend?', 'I keep thinking about saddles and triangles.'];
const sessions = [];
{   // the golden session: the introduction, one human question
    const P = owl({ n: 8, k: 3, t: 2 });
    P.logTokens(P.STRIX_INTRO, 'strix'); P.logTokens(HUMANS[0], 'human');
    sessions.push({ name: 'golden', manifold: { n: 8, k: 3, t: 2 }, P, sections: [72, 720] });
}
{   // synthetic dialogue 9000 (the trace's), token by token
    const P = owl({ n: 8, k: 3, t: 2 });
    for (const [source, tokens] of EC.synthetic(GOLDEN, 9000)) for (const t of tokens) P.logPacket(t, source);
    sessions.push({ name: 'dialogue 9000', manifold: { n: 8, k: 3, t: 2 }, P, sections: [72, 720] });
}
const replies = [];
{   // a conversation with STRIX: each human turn, then the reply Owl's selectResponse gives (BERT not loaded)
    const P = owl({ n: 12, k: 5, t: 3 });
    P.logTokens(P.STRIX_INTRO, 'strix');
    for (const h of HUMANS) {
        P.logTokens(h, 'human');
        const r = P.selectResponse(h);
        replies.push({ human: h, concept: r.bestConcept, J: r.J, response: r.response });
        P.logTokens(r.response, 'strix');
    }
    sessions.push({ name: 'conversation', manifold: { n: 12, k: 5, t: 3 }, P, sections: [72, 720] });
}
const cases = [];
for (const s of sessions) {
    const N = s.P.packetChain.length;
    const add = (kind, sections, text, file) => cases.push({ session: s.name, kind, sections, manifold: s.manifold, packets: N, file, bytes: Buffer.byteLength(text), sha256: sha256(text) });
    add('chain', null, JSON.stringify(s.P.exportChainData(), null, 2), `engram_chain_N${N}_P${s.P.hex32(s.P.parity())}.json`);
    for (const S of s.sections) add('crystal', S, JSON.stringify(s.P.exportSegmentedData(S), null, 2), `engram_crystal_S${S}_N${N}.json`);
}
const exportsJson = JSON.stringify({
    format: 'engram_v1_exports_golden', version: 1,
    source: library.source,
    generated_at: FIXED,
    note: 'Length and SHA-256 of the bytes Owl Academy\'s exportChain and exportSegmented would download (JSON.stringify(data, null, 2)), with generated_at fixed. Sessions: the golden session; synthetic dialogue 9000 token by token; a conversation of five human turns with Owl\'s replies.',
    humans: HUMANS, replies, cases,
}, null, 1) + '\n';

if (CHECK) {
    const okLib = fs.existsSync(OUT_LIB) && fs.readFileSync(OUT_LIB, 'utf8') === libJs;
    const okExp = fs.existsSync(OUT_EXP) && fs.readFileSync(OUT_EXP, 'utf8') === exportsJson;
    console.log(`strix_library_v1.js ${okLib ? 'matches' : 'DIFFERS from'} Owl Academy; exports_v1.json ${okExp ? 'matches' : 'DIFFERS from'} Owl Academy`);
    process.exit(okLib && okExp ? 0 : 1);
}
fs.writeFileSync(OUT_LIB, libJs);
fs.writeFileSync(OUT_EXP, exportsJson);
console.log(`wrote strix_library_v1.js (${library.concepts.length} concepts) and exports_v1.json (${cases.length} exports, ${replies.length} replies); Owl-Academy ${commit ? commit.slice(0, 7) : '(no git)'}`);
