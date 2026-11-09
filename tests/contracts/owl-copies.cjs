// BioChain-AI's copies of Owl Academy's code, compared with Owl's own, as notes (overhaul F81; nightly, never a failure).
//
//   node tests/contracts/owl-copies.cjs [--owl <Owl-Academy checkout>] [--biochain <BioChain-AI checkout>] [--markdown]
//
// The copies are not pinned: BioChain-AI took them from Owl Academy's pages and biomesh.js and has kept them since.
// For each function or constant, by name (owl_extract.cjs grab, the least-indented declaration):
//   console/Lattice_Forge.html     against Owl's mage_tower/Biomesh_Mind_Eye_3D.html (the lattice codec and environment)
//   console/Language_Studio.html   against Owl's mage_tower/Biomesh_Language_Growing.html (the session ledger)
//   src/biomesh/biomesh-core.js, else src/biomesh/biomesh.js, against Owl's scripts/biomesh-core.js, else
//                                  scripts/biomesh.js (the biochain: owl_extract.cjs SYNC, its constants, and the strict
//                                  verifier where Owl's core has it)
// each name reads identical, the same but for white space, different (with the first 12 hex digits of each text's
// SHA-256), or missing on one side. Every line is a NOTE; --markdown prints a table for the job summary instead.
// The checkouts default to OWL_ACADEMY_DIR and BIOCHAIN_AI_DIR, else the siblings of this repository. Exits 0, or 2
// when a checkout is missing. The code is only read, never run.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const siblings = require(path.join(ROOT, 'scripts', 'lib', 'siblings.cjs'));
const X = require(path.join(ROOT, 'Pages', 'Engram Minds Eye', 'reference', 'golden', 'owl_extract.cjs'));
const ARGS = process.argv.slice(2), opt = (k, d) => { const i = ARGS.indexOf(k); return i >= 0 ? ARGS[i + 1] : d; }, MD = ARGS.includes('--markdown');
const OWL = path.resolve(opt('--owl', siblings.dir('Owl-Academy'))), BIO = path.resolve(opt('--biochain', siblings.dir('BioChain-AI')));
for (const [n, d] of [['Owl-Academy', OWL], ['BioChain-AI', BIO]]) if (!fs.existsSync(d)) { console.log(`skipped: no ${n} checkout at ${d}`); process.exit(2); }

const STRICT = ['parseBiochainStreamStrict', 'sha256HexSync', 'leafHashSync', 'merkleRootSync', 'chainWeaves', 'verifyIntegrityStrict', 'strictLabel', 'KINDS', 'validateKind'];
const owlCore = X.locate(OWL, X.OWL_GROWER, []), bioCore = X.locate(BIO, X.BIOCHAIN_GROWER, []);
const PAIRS = [
    { bio: 'console/Lattice_Forge.html', owl: 'mage_tower/Biomesh_Mind_Eye_3D.html',
        names: ['fold64', 'popcountEven', 'crystallize', 'packWord', 'unpackWord', 'fold32', 'mulberry32', 'canonicalSeed', 'collectHashOf', 'buildCodexFromText', 'collectEnvironment'] },
    { bio: 'console/Language_Studio.html', owl: 'mage_tower/Biomesh_Language_Growing.html', names: ['rotl32', 'sha256hex', 'fold32Hex', 'logTurn', 'engHex'] },
    { bio: bioCore ? bioCore.file : X.BIOCHAIN_GROWER[1], owl: owlCore ? owlCore.file : X.OWL_GROWER[1],
        names: [...X.CONST_NAMES, ...X.SYNC, ...(owlCore && X.has(owlCore.src, 'verifyIntegrityStrict') ? STRICT : [])] },
];
const read = (root, f) => { const p = path.join(root, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };
const piece = (src, n) => { try { return X.piece(src, n); } catch (e) { return null; } };
const squash = s => s.replace(/\s+/g, ' ').trim();
const rows = [];
for (const p of PAIRS) {
    const b = read(BIO, p.bio), o = read(OWL, p.owl), counts = { identical: 0, 'white space only': 0, different: 0, missing: 0 };
    for (const n of p.names) {
        const x = b === null ? null : piece(b, n), y = o === null ? null : piece(o, n);
        const state = x === null || y === null ? 'missing' : x === y ? 'identical' : squash(x) === squash(y) ? 'white space only' : 'different';
        counts[state]++;
        if (state !== 'identical') rows.push({ pair: p, name: n, state, detail: state === 'missing' ? `${x === null ? 'not in BioChain-AI' : ''}${x === null && y === null ? ', ' : ''}${y === null ? 'not in Owl Academy' : ''}`
            : state === 'different' ? `BioChain-AI ${X.sha256(x).slice(0, 12)}…, Owl ${X.sha256(y).slice(0, 12)}…` : '' });
    }
    p.counts = counts;
}
const head = `BioChain-AI ${(X.headCommit(BIO) || '?').slice(0, 7)} against Owl-Academy ${(X.headCommit(OWL) || '?').slice(0, 7)}`;
if (MD) {
    console.log(`### Copies of Owl Academy's code in BioChain-AI (F81, notes)\n\n${head}\n\n| BioChain-AI | Owl Academy | identical | white space only | different | missing |\n|---|---|---|---|---|---|`);
    for (const p of PAIRS) console.log(`| \`${p.bio}\` | \`${p.owl}\` | ${p.counts.identical} | ${p.counts['white space only']} | ${p.counts.different} | ${p.counts.missing} |`);
    if (rows.length) { console.log('\n| name | in | state | detail |\n|---|---|---|---|'); for (const r of rows) console.log(`| \`${r.name}\` | \`${r.pair.bio}\` | ${r.state} | ${r.detail} |`); }
} else {
    console.log(head);
    for (const p of PAIRS) console.log(`NOTE  ${p.bio} against ${p.owl}: ${Object.entries(p.counts).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ')}`);
    for (const r of rows) console.log(`NOTE    ${r.name} (${r.pair.bio}): ${r.state}${r.detail ? ` (${r.detail})` : ''}`);
    console.log('notes only: these copies are not pinned (F81); nothing here fails');
}
process.exit(0);
