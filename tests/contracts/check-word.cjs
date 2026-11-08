// The census check word, pinned in code (overhaul F103).
//
//   node tests/contracts/check-word.cjs
//
// Pages/Hyperbolic Lexicon/proposals/SHD-CCP-RFC01-layout-census.md says: crystallize(bytes 0..59) is the word
// 9841D88D8B003CEA, and the eight 64-bit layouts it lists read its Form field as 8, 9, 9, 9, 13, (none), 8 and 8. This
// pins both in code:
//   - the word, from every copy of Owl's crystallize in this repository: biochain_v1.js, lattice_seed_v1.js and
//     lexicon_core.js's chain cores (the verbatim v1 pins)
//   - each layout's reading of it: the bit ranges of the census table, read here, and, where this repository has the
//     reader (layout 3: biochain_v1.js unpackPacket and lattice_seed_v1.js unpackWord; layout 7: orbital_core.js
//     decodeTile), the reader's own fields too
// The other repositories' readers (RFC 01's bindings, the Ontology, genesis.js, the explainer, Calculator V2, Owl's
// text_to_codex.py) are not run here: their rows pin the census's bit ranges, not their code. Exits 1 on any difference.
'use strict';
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BC = require(path.join(ROOT, 'Pages', 'Engram Minds Eye', 'biochain_v1.js'));
const LS = require(path.join(ROOT, 'Pages', 'Engram Minds Eye', 'lattice_seed_v1.js'));
const LC = require(path.join(ROOT, 'Pages', 'Hyperbolic Lexicon', 'lexicon_core.js'));
const O = require(path.join(ROOT, 'scripts', 'geometric-build', 'orbital_core.js'));

const WORD = '9841D88D8B003CEA', W = BigInt('0x' + WORD);
const bits = (hi, lo) => Number((W >> BigInt(lo)) & ((1n << BigInt(hi - lo + 1)) - 1n));
let failed = 0;
const line = (ok, label, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`); };

// ---- the word
const bytes = Array.from({ length: 60 }, (_, i) => i);
const copies = { 'biochain_v1.js crystallizeBytes': BC.crystallizeBytes(bytes), 'lattice_seed_v1.js crystallizeBytes': LS.crystallizeBytes(bytes),
    'lexicon_core.js chainCores().BC crystallizeBytes': LC.chainCores().BC.crystallizeBytes(bytes) };
for (const [k, v] of Object.entries(copies)) line(v === WORD, `crystallize(0..59) = ${WORD}: ${k}`, v);

// ---- the eight layouts of the census table: [row, layout, where, form field (or null), the census's reading]
const LAYOUTS = [
    [1, 'RFC 01 draft tile', 'geometric-engine-spec/rfcs/01_einstein_tile_64bit.md; the six bindings', [39, 36], 8],
    [2, 'Kernel Ontology header', '00_Ontology_Core/base_64bit_tile.json', [63, 60], 9],
    [3, 'Blackwell block', 'Owl scripts/biomesh.js; BioChain-AI biomesh.js, shdccp_kernel.py; biochain_v1.js, lattice_seed_v1.js', [63, 60], 9],
    [4, 'genesis.js BLACKWELL_SCHEMA', 'genesis/assets/genesis.js 4-15', [63, 60], 9],
    [5, 'Explainer "Z-slabs", toroidal mode', 'assets/explainer.js 17-55', [47, 44], 13],
    [6, 'Geometric Calculator V2', 'Geometric_calculator (V2).html (no Form field; gate byte 55..48)', null, null],
    [7, 'Ebayednoob orbital packTile', 'scripts/geometric-build/orbital_core.js 380-388', [43, 40], 8],
    [8, 'Owl text_to_codex', 'Library/Experimental_Systems/Ontological_Codex/text_to_codex.py 127-160', [39, 36], 8],
];
for (const [row, name, where, field, form] of LAYOUTS) {
    if (!field) { line(bits(55, 48) === 65, `layout ${row} (${name}): no Form field; gate byte 55..48 = 65`, where); continue; }
    line(bits(field[0], field[1]) === form, `layout ${row} (${name}): Form ${field[0]}..${field[1]} = ${form}`, where);
}
const forms = new Set(LAYOUTS.filter(l => l[3]).map(l => bits(l[3][0], l[3][1])));
line(forms.size === 3 && [8, 9, 13].every(f => forms.has(f)), 'the seven layouts with a Form field give three different Forms (8, 9, 13); layout 6 has none');

// ---- the readers this repository has
const blackwell = { form: bits(63, 60), parityBit: bits(59, 59), spin: bits(58, 56), quat32: bits(55, 24), payload16: bits(23, 8), freq: bits(7, 3), amp: bits(2, 0) };
line(blackwell.parityBit === 1 && blackwell.spin === 0 && blackwell.quat32 === 0x41D88D8B && blackwell.payload16 === 60 && blackwell.freq === 29 && blackwell.amp === 2,
    'layout 3 fields: parity bit 1, spin 0, quat32 41D88D8B, payload16 60 (the chunk length), freq 29, amp 2');
for (const [name, u] of [['biochain_v1.js unpackPacket', BC.unpackPacket(WORD)], ['lattice_seed_v1.js unpackWord', LS.unpackWord(WORD)]]) {
    line(u.form === 9 && u.spin === 0 && u.quat32 === 0x41D88D8B && u.payload16 === 60 && u.freq === 29 && u.amp === 2 && u.parityOk === true, `layout 3 by its reader: ${name}`, `form ${u.form}, parityOk ${u.parityOk}`);
}
let pop = 0;
for (let k = 0; k < 64; k++) pop += bits(k, k);
line(pop % 2 === 0, 'layout 3: the parity bit makes the popcount of all 64 bits even', `popcount ${pop}`);
const t = O.decodeTile(W);
line(t.form === 8 && t.gate === 65 && t.mux === 13 && t.slot === 8, 'layout 7 by its reader: orbital_core.js decodeTile', `form ${t.form}, gate ${t.gate}, mux ${t.mux}, slot ${t.slot}`);

console.log(`\n${failed ? `${failed} FAIL` : 'the check word and its eight readings are as the census states'}`);
process.exit(failed ? 1 : 0);
