// Hyperbolic Lexicon: every check in one command, this system's and those of the cores it loads (Phase 1).
//
//   node "Pages/Hyperbolic Lexicon/tests/all.cjs"           the quick spike set
//   node "Pages/Hyperbolic Lexicon/tests/all.cjs" --all     every spike rerun (about ten minutes more)
//
// Runs, in order: the cores this system loads unchanged (orbital_core.js; Hyperbolic Oracles' hyperbolic_core.js,
// decoder3d.js, twin3d.js and fence.js against their Python traces; Engram Mind's Eye's browser core and bridges),
// this folder's links and spike reruns, the site bar, the WordNet and EWT pins, the Python reference (its fast pytest
// suite; the Unicode 15.1 table, V0 retrained, V1 and the L1 instance lists against their pins; the text and
// geometry traces rebuilt and compared byte for byte), and the 0xA kernel against SHD-CCP's own Ontology tooling.
// A check whose data or checkout is missing exits 2 and is reported as skipped, never as passed; pytest's own exit 2
// (interrupted, or an error while collecting) counts as a failure. Exits 1 if any check fails.
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const L = 'Pages/Hyperbolic Lexicon/', HO = 'Pages/Hyperbolic Oracles/', E = 'Pages/Engram Minds Eye/';
const PY = ['python3', '-B'];
// [group, label, command, options?]; options.skips: false when exit 2 is not "skipped" (pytest uses it for errors)
const RUNS = [
    ['cores', 'orbital_core.js', ['node', 'scripts/geometric-build/tests/orbital-core.cjs']],
    ['cores', 'hyperbolic_core.js parity', ['node', HO + 'tests/parity.cjs']],
    ['cores', 'decoder3d.js parity', ['node', HO + 'tests/parity3d.cjs']],
    ['cores', 'twin3d.js parity', ['node', HO + 'tests/parity-twin.cjs']],
    ['cores', 'fence.js parity', ['node', HO + 'tests/parity-fence.cjs']],
    ['cores', 'Engram browser core', ['node', E + 'tests/parity-engram.cjs']],
    ['cores', 'Engram bridges (biochain codec)', ['node', E + 'tests/bridges.cjs']],
    ['lexicon', 'browser core parity (traces)', ['node', L + 'tests/parity-lexicon.cjs', '--quiet']],
    ['lexicon', 'JS data wrappers', ['node', L + 'reference/golden/make_js_data_v1.cjs', '--check']],
    ['lexicon', 'links and the ways in', ['node', L + 'tests/links.cjs']],
    ['lexicon', 'spike reruns', ['node', L + 'tests/spikes.cjs', ...(process.argv.includes('--all') ? ['--all'] : [])]],
    ['site', 'the site bar on every page', ['node', 'scripts/install-page-chrome.mjs', '--check']],
    ['pins', 'WordNet 3.0', ['node', L + 'reference/golden/make_wordnet_v1.cjs', '--check']],
    ['pins', 'UD English EWT', ['node', L + 'reference/golden/make_ewt_v1.cjs', '--check']],
    ['reference', 'pytest (fast suite)', [...PY, '-m', 'pytest', '-q', '-p', 'no:cacheprovider',
        '--rootdir', L + 'reference', L + 'reference/tests'], { skips: false }],
    ['pins', 'Unicode 15.1 table', [...PY, L + 'reference/golden/make_unicode_v1.py', '--check']],
    ['pins', 'V0 lex0 (retrained)', [...PY, L + 'reference/golden/make_vocab_v0.py', '--check']],
    ['pins', 'V1 bert-base-uncased', [...PY, L + 'reference/golden/make_vocab_v1.py', '--check']],
    ['pins', 'L1 instance lists', [...PY, L + 'reference/golden/make_l1_instances_v1.py', '--check']],
    ['traces', 'text (normaliser, WordPiece)', [...PY, L + 'reference/traces_text.py', '--check']],
    ['traces', 'geometry (address, points, rank)', [...PY, L + 'reference/traces_geometry.py', '--check']],
    ['shdccp', 'kernel 0xA with SHD-CCP\'s tooling', ['python3', '-B', '-I', L + 'proposals/check_kernel.py']],
];

let failed = 0, skipped = 0;
for (const [group, label, cmd, opts = {}] of RUNS) {
    const t0 = Date.now();
    const r = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').filter(Boolean);
    const status = r.status === 0 ? 'pass' : r.status === 2 && opts.skips !== false ? 'skip' : 'FAIL';
    if (status === 'FAIL') failed += 1;
    if (status === 'skip') skipped += 1;
    console.log(`${status}  ${group.padEnd(9)} ${label.padEnd(36)} ${((Date.now() - t0) / 1000).toFixed(1).padStart(5)} s  ${out[out.length - 1] || ''}`);
    if (status === 'FAIL') console.log(out.slice(-12).map(l => '        ' + l).join('\n'));
}
const ran = RUNS.length - skipped;
console.log(`\n${ran - failed}/${ran} checks pass${skipped ? `, ${skipped} skipped` : ''}`);
process.exit(failed ? 1 : 0);
