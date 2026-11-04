// Pins the engram/1 golden corpus (claim E1) from Owl Academy's own source files.
//
//   node "Pages/Engram Minds Eye/reference/golden/make_golden_v1.cjs" <path to an Owl-Academy checkout> [--check]
//
// It reads two files of the Owl-Academy repository, unchanged:
//   Library/Experimental_Systems/Engram_Mind_Eye.html   the reference page (the TTMPT core, the concept library,
//                                                       the tokenizer and the 128-bit packet chain)
//   scripts/biomesh.js                                  the second implementation (engramGrid, engramJ, its own
//                                                       tokenizer and the engram stream)
// and writes engram_v1.json beside this script. Every value comes from Owl Academy's code; nothing here
// recomputes an engram. The two implementations are cross-checked on every entry, and the run stops if they
// disagree. With --check it compares against the committed engram_v1.json instead of writing it.
//
// The corpus is fixed in PREREGISTRATION.md (E1). Changing it is an amendment.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ARGS = process.argv.slice(2), CHECK = ARGS.includes('--check');
const OWL = path.resolve(ARGS.find(x => !x.startsWith('--')) || path.join(__dirname, '..', '..', '..', '..', '..', 'Owl-Academy'));
const PAGE = path.join(OWL, 'Library/Experimental_Systems/Engram_Mind_Eye.html');
const BIOMESH = path.join(OWL, 'scripts/biomesh.js');
const OUT = path.join(__dirname, 'engram_v1.json');
for (const f of [PAGE, BIOMESH]) if (!fs.existsSync(f)) { console.error(`missing ${f}: pass the path of an Owl-Academy checkout`); process.exit(2); }

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
let commit = null;
try { commit = execFileSync('git', ['-C', OWL, 'log', '-1', '--format=%H', '--', 'Library/Experimental_Systems/Engram_Mind_Eye.html', 'scripts/biomesh.js']).toString().trim(); } catch (e) { /* not a git checkout */ }

// ---- the reference page: everything from the TTMPT core to the start of the rendering code
const pageSrc = fs.readFileSync(PAGE, 'utf8');
const a = pageSrc.indexOf('/* =====================================================================\n   TTMPT ENGRAM CORE');
const b = pageSrc.indexOf('/* =====================================================================\n   RENDERING');
if (a < 0 || b < 0 || b < a) throw new Error('markers not found in Engram_Mind_Eye.html');
const introM = /const STRIX_INTRO =\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+);/.exec(pageSrc);
if (!introM) throw new Error('STRIX_INTRO not found');
const P = new Function(pageSrc.slice(a, b) + `
    const STRIX_INTRO = ${introM[1]};
    return { crystallize, encodeToken, hamming, chiralKey, computeJ, CONCEPTS, CONCEPT_NAMES, packets, tokenize,
             logPacket, logTokens, packGrid64, hex64, hex32, CODEX_ROOT, packetChain, STRIX_INTRO,
             parity: () => codexParity };`)();

// ---- the second implementation, biomesh.js: its engram functions, taken by name (export keywords dropped)
const bioSrc = fs.readFileSync(BIOMESH, 'utf8');
function grab(src, name) {
    const m = new RegExp(`^(?:export )?(function ${name}\\(|const ${name} = )`, 'm').exec(src);
    if (!m) throw new Error(`${name} not found in biomesh.js`);
    let j = m.index, depth = 0, seen = false;
    for (; j < src.length; j++) {
        const ch = src[j];
        if (ch === '{') { depth++; seen = true; } else if (ch === '}') { depth--; if (seen && depth === 0) break; } else if (ch === '\n' && !seen) break;
    }
    const end = src.indexOf('\n', j);
    return src.slice(m.index, end).replace(/^export /, '');
}
const B = new Function(['mulberry32', 'engramCharGrid', 'engramGrid', 'engramGridHex', 'engramJ', 'tokenizeEngrams', 'engramStreamFromText']
    .map(n => grab(bioSrc, n)).join('\n') + '\nreturn { engramGrid, engramGridHex, engramJ, tokenizeEngrams, engramStreamFromText };')();

// ---- the corpus (PREREGISTRATION.md, E1)
const dedup = arr => [...new Set(arr)];
const responseText = Object.values(P.CONCEPTS).flatMap(c => c.responses).join(' ');
const SETS = {
    letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    concepts: P.CONCEPT_NAMES.slice(),
    window: ['MIND', 'EYE', 'STRIX'],
    dialogue: dedup(P.tokenize(P.STRIX_INTRO + ' ' + responseText)),
    edge: ['', '720', '2026', 'a1b2', 'geodesic', 'Geodesic', "don't", 'LISTEN', 'SILENT', 'EYE', 'Y', 'ABBA', 'MINDMM',
        'hyperbolic-geometry', 'ANTIDISESTABLISHMENTARIANISM'],
};

let disagreements = 0;
function entry(input) {
    const g = P.crystallize(input), gb = B.engramGrid(input);
    const lsb = P.chiralKey(input).split('::')[2];
    if (g.join('') !== gb.join('') || B.engramGridHex(gb).toLowerCase() !== lsb || B.engramJ(gb) !== P.computeJ(g)) disagreements++;
    let upper = 0, lower = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { if (c > r) upper += g[r * 8 + c]; else if (c < r) lower += g[r * 8 + c]; }
    return {
        input,
        hex_lsb: lsb,                                  // chiralKey and biomesh engramGridHex: byte i = bits 8i..8i+7, LSB first
        seed64: P.hex64(P.packGrid64(g)),              // the packet body: bit i of the 64-bit word = grid cell i, printed MSB first
        chiral_key: P.chiralKey(input),
        j_num: upper - lower,                          // J = j_num / 32
        j: P.computeJ(g),
        bits: g.reduce((s, x) => s + x, 0),
    };
}
const sets = Object.fromEntries(Object.entries(SETS).map(([k, list]) => [k, list.map(entry)]));

// ---- tokenizers: the page and biomesh.js split text differently
const SENTENCES = [P.STRIX_INTRO, "Don't the 720 frames fold into 72, then 10?", 'hyperbolic-geometry: GEODESIC, curvature & the Poincare disk.'];
const tokenizers = SENTENCES.map(s => ({ text: s, mind_eye: P.tokenize(s), biomesh: B.tokenizeEngrams(s) }));
const stream = B.engramStreamFromText(P.STRIX_INTRO);

// ---- the 128-bit packet chain of a fresh session: the page logs the intro as STRIX, then a human turn
const HUMAN = 'What does a geodesic feel like in curved space?';
const chainEntries = P.logTokens(P.STRIX_INTRO, 'strix').concat(P.logTokens(HUMAN, 'human'));
const chain = {
    window_start: ['MIND', 'EYE', 'STRIX'],
    codex_root: P.hex32(P.CODEX_ROOT),
    turns: [{ source: 'strix', text: P.STRIX_INTRO }, { source: 'human', text: HUMAN }],
    packets: chainEntries.map(e => ({ index: e.index, token: e.token, source: e.source, header: e.header, seed64: e.seed64, footer: e.footer,
        tri: { alpha: e.tri.a, beta: e.tri.b, gamma: e.tri.g, concept: e.tri.conceptIdx === 255 ? null : P.CONCEPT_NAMES[e.tri.conceptIdx] } })),
    final_parity: P.hex32(P.parity()),
};

if (disagreements) { console.error(`page and biomesh.js disagree on ${disagreements} entries: not writing`); process.exit(1); }
const out = {
    format: 'engram_v1_golden', version: 1,
    source: {
        repository: 'BioChainAI/Owl-Academy', commit,
        files: { 'Library/Experimental_Systems/Engram_Mind_Eye.html': sha256(pageSrc), 'scripts/biomesh.js': sha256(bioSrc) },
        cross_check: 'every entry computed by the page and by biomesh.js; they agree',
    },
    conventions: {
        grid: 'cell i of the 8x8 grid, row-major, i = 8r + c',
        hex_lsb: 'byte k = cells 8k..8k+7, cell 8k + b at bit b (LSB first); chiralKey prints it lowercase, biomesh.js uppercase',
        seed64: 'a 64-bit word with bit i = cell i, printed as 16 uppercase hex digits, most significant first',
        j: 'torsion flow J = j_num / 32, j_num = (cells above the diagonal) - (cells below)',
    },
    counts: Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.length])),
    sets, tokenizers,
    biomesh_stream: { text: P.STRIX_INTRO, stream: stream.stream, count: stream.count, meanJ: stream.meanJ },
    packet_chain: chain,
};
const json = JSON.stringify(out, null, 1) + '\n';
if (CHECK) {
    const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === json;
    console.log(same ? 'engram_v1.json matches Owl Academy' : 'engram_v1.json DIFFERS from what Owl Academy computes now');
    process.exit(same ? 0 : 1);
}
fs.writeFileSync(OUT, json);
const total = Object.values(out.counts).reduce((s, n) => s + n, 0);
console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${total} entries (${Object.entries(out.counts).map(([k, n]) => `${k} ${n}`).join(', ')}), ` +
    `${chain.packets.length} chain packets, page and biomesh.js agree on all; Owl-Academy ${commit ? commit.slice(0, 7) : '(no git)'}`);
