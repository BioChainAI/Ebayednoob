// Engram Mind's Eye: every Node check in one command, the system's and those of the cores it loads (Phase 8).
//
//   node "Pages/Engram Minds Eye/tests/all.cjs" [path to an Owl-Academy checkout]
//
// Runs, in order: the cores Engram loads unchanged (orbital_core.js; Hyperbolic Oracles' hyperbolic_core.js,
// decoder3d.js, twin3d.js and fence.js against their Python traces), Engram's own suites (browser-core parity,
// the 2D and 3D page engines, the bridges, the links), the site bar, and the four pins from Owl Academy, which
// regenerate every pinned file from Owl Academy's code and compare. The pins need an Owl-Academy checkout: by
// default the one beside this repository; without one they are reported as skipped, not passed.
// The Python reference is checked separately (see reference/README.md):
//   python -m pytest "Pages/Engram Minds Eye/reference/tests"
// Exits 1 if any check fails.
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const E = 'Pages/Engram Minds Eye/', HO = 'Pages/Hyperbolic Oracles/';
const owlArg = process.argv.slice(2).find(a => !a.startsWith('-'));
const OWL = path.resolve(owlArg || path.join(ROOT, '..', 'Owl-Academy'));
const haveOwl = fs.existsSync(path.join(OWL, 'Library/Experimental_Systems/Engram_Mind_Eye.html'));

const RUNS = [
    ['cores', 'orbital_core.js', ['scripts/geometric-build/tests/orbital-core.cjs']],
    ['cores', 'hyperbolic_core.js parity', [HO + 'tests/parity.cjs']],
    ['cores', 'decoder3d.js parity', [HO + 'tests/parity3d.cjs']],
    ['cores', 'twin3d.js parity', [HO + 'tests/parity-twin.cjs']],
    ['cores', 'fence.js parity', [HO + 'tests/parity-fence.cjs']],
    ['engram', 'browser core against the reference', [E + 'tests/parity-engram.cjs']],
    ['engram', 'the 2D page engine', [E + 'tests/page-engine.cjs']],
    ['engram', 'the 3D page engine', [E + 'tests/page3d-engine.cjs']],
    ['engram', 'the bridges', [E + 'tests/bridges.cjs']],
    ['engram', 'links and the ways in', [E + 'tests/links.cjs']],
    ['site', 'the site bar on every page', ['scripts/install-page-chrome.mjs', '--check']],
    ['pins', 'engram/1 golden corpus', [E + 'reference/golden/make_golden_v1.cjs', OWL, '--check'], true],
    ['pins', 'STRIX library and exports', [E + 'reference/golden/make_owl_v1.cjs', OWL, '--check'], true],
    ['pins', 'LATTICE-SEED/1', [E + 'reference/golden/make_lattice_v1.cjs', OWL, '--check'], true],
    ['pins', 'the bridges to Owl Academy', [E + 'reference/golden/make_bridges_v1.cjs', OWL, '--check'], true]
];

let failed = 0, skipped = 0;
for (const [group, label, args, needsOwl] of RUNS) {
    if (needsOwl && !haveOwl) { skipped += 1; console.log(`skip  ${group.padEnd(7)} ${label}  (no Owl-Academy checkout at ${OWL})`); continue; }
    const t0 = Date.now();
    const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').filter(Boolean);
    const ok = r.status === 0;
    if (!ok) failed += 1;
    console.log(`${ok ? 'pass' : 'FAIL'}  ${group.padEnd(7)} ${label.padEnd(36)} ${((Date.now() - t0) / 1000).toFixed(1).padStart(5)} s  ${out[out.length - 1] || ''}`);
    if (!ok) console.log(out.slice(-12).map(l => '        ' + l).join('\n'));
}
const ran = RUNS.length - skipped;
console.log(`\n${ran - failed}/${ran} checks pass${skipped ? `, ${skipped} skipped` : ''}`);
process.exit(failed ? 1 : 0);
