// Hyperbolic Lexicon: every Node check in one command, this system's and those of the cores it loads (Phase 0).
//
//   node "Pages/Hyperbolic Lexicon/tests/all.cjs"           the quick spike set
//   node "Pages/Hyperbolic Lexicon/tests/all.cjs" --all     every spike rerun (about ten minutes more)
//
// Runs, in order: the cores this system loads unchanged (orbital_core.js; Hyperbolic Oracles' hyperbolic_core.js,
// decoder3d.js, twin3d.js and fence.js against their Python traces; Engram Mind's Eye's browser core and bridges),
// this folder's links and spike reruns, the site bar, the WordNet and EWT pins, and the 0xA kernel against SHD-CCP's
// own Ontology tooling. A check whose data or checkout is missing exits 2 and is reported as skipped, never as passed.
// Exits 1 if any check fails.
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const L = 'Pages/Hyperbolic Lexicon/', HO = 'Pages/Hyperbolic Oracles/', E = 'Pages/Engram Minds Eye/';
const RUNS = [
    ['cores', 'orbital_core.js', ['node', 'scripts/geometric-build/tests/orbital-core.cjs']],
    ['cores', 'hyperbolic_core.js parity', ['node', HO + 'tests/parity.cjs']],
    ['cores', 'decoder3d.js parity', ['node', HO + 'tests/parity3d.cjs']],
    ['cores', 'twin3d.js parity', ['node', HO + 'tests/parity-twin.cjs']],
    ['cores', 'fence.js parity', ['node', HO + 'tests/parity-fence.cjs']],
    ['cores', 'Engram browser core', ['node', E + 'tests/parity-engram.cjs']],
    ['cores', 'Engram bridges (biochain codec)', ['node', E + 'tests/bridges.cjs']],
    ['lexicon', 'links and the ways in', ['node', L + 'tests/links.cjs']],
    ['lexicon', 'spike reruns', ['node', L + 'tests/spikes.cjs', ...(process.argv.includes('--all') ? ['--all'] : [])]],
    ['site', 'the site bar on every page', ['node', 'scripts/install-page-chrome.mjs', '--check']],
    ['pins', 'WordNet 3.0', ['node', L + 'reference/golden/make_wordnet_v1.cjs', '--check']],
    ['pins', 'UD English EWT', ['node', L + 'reference/golden/make_ewt_v1.cjs', '--check']],
    ['shdccp', 'kernel 0xA with SHD-CCP\'s tooling', ['python3', '-B', '-I', L + 'proposals/check_kernel.py']],
];

let failed = 0, skipped = 0;
for (const [group, label, cmd] of RUNS) {
    const t0 = Date.now();
    const r = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').filter(Boolean);
    const status = r.status === 0 ? 'pass' : r.status === 2 ? 'skip' : 'FAIL';
    if (status === 'FAIL') failed += 1;
    if (status === 'skip') skipped += 1;
    console.log(`${status}  ${group.padEnd(8)} ${label.padEnd(36)} ${((Date.now() - t0) / 1000).toFixed(1).padStart(5)} s  ${out[out.length - 1] || ''}`);
    if (status === 'FAIL') console.log(out.slice(-12).map(l => '        ' + l).join('\n'));
}
const ran = RUNS.length - skipped;
console.log(`\n${ran - failed}/${ran} checks pass${skipped ? `, ${skipped} skipped` : ''}`);
process.exit(failed ? 1 : 0);
