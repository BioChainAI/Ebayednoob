// Engram Mind's Eye: every Node check in one command, the system's and those of the cores it loads (Phase 8), and its
// downstream consumer's checks of it (the Hyperbolic Lexicon).
//
//   node "Pages/Engram Minds Eye/tests/all.cjs" [path to an Owl-Academy checkout] [-j N] [--allow-partial]
//
// Runs, in order: the cores Engram loads unchanged (orbital_core.js; Hyperbolic Oracles' hyperbolic_core.js,
// decoder3d.js, twin3d.js and fence.js against their Python traces), Engram's own suites (browser-core parity,
// the 2D and 3D page engines, the bridges, the links, the Oracles names its pages use), the Lexicon's checks of
// Engram (its chain on biochain_v1.js and engram_core.js, and Engram importing Lexicon shards: see README "Used by"),
// the site bar, the extractor the pins share, the Python reference, the four v1 pins from Owl Academy and the v2 pin
// (biochain_v2.js, from Owl Academy's Firebase-free core). Each pin
// checks content, not commits: the v1 files rebuilt from the pinned source content (found by SHA-256) must match byte
// for byte, and the checkout's current code must give v1's results (owl_extract.cjs). A pin whose checkout or pinned
// content is missing is reported as skipped, never passed. The checkout defaults to OWL_ACADEMY_DIR, else the one
// beside this repository (scripts/lib/siblings.cjs); a path given on the command line is used only when this file is
// run itself, not when tests/run-all.cjs loads its checks.
// Statuses and the summary are scripts/lib/runner.cjs's: pass, partial, skip, FAIL; exits 1 if any check fails.
'use strict';
const path = require('path');
const siblings = require('../../../scripts/lib/siblings.cjs');
const { runAll, parseArgs } = require('../../../scripts/lib/runner.cjs');

const E = 'Pages/Engram Minds Eye/', HO = 'Pages/Hyperbolic Oracles/', L = 'Pages/Hyperbolic Lexicon/';
const main = require.main === module, args = main ? parseArgs() : null;
const OWL = path.resolve((main && args.positional[0]) || siblings.dir('Owl-Academy'));

const RUNS = [
    ['cores', 'orbital_core.js', ['node', 'scripts/geometric-build/tests/orbital-core.cjs']],
    ['cores', 'hyperbolic_core.js parity', ['node', HO + 'tests/parity.cjs']],
    ['cores', 'decoder3d.js parity', ['node', HO + 'tests/parity3d.cjs']],
    ['cores', 'twin3d.js parity', ['node', HO + 'tests/parity-twin.cjs'], { tags: ['slow'] }],
    ['cores', 'fence.js parity', ['node', HO + 'tests/parity-fence.cjs']],
    ['engram', 'browser core against the reference', ['node', E + 'tests/parity-engram.cjs']],
    ['engram', 'the 2D page engine', ['node', E + 'tests/page-engine.cjs']],
    ['engram', 'the 3D page engine', ['node', E + 'tests/page3d-engine.cjs']],
    ['engram', 'the bridges', ['node', E + 'tests/bridges.cjs']],
    ['engram', 'the strict verdict and the checked import (v2)', ['node', E + 'tests/bridges-v2.cjs']],
    ['engram', 'links and the ways in', ['node', E + 'tests/links.cjs']],
    ['engram', 'Oracles names the pages use', ['node', E + 'tests/core-names.cjs']],
    ['used-by', 'Lexicon chain on biochain_v1/engram_core', ['node', L + 'tests/chain-lexicon.cjs']],
    ['used-by', 'Lexicon shards imported by Engram', ['node', L + 'tests/bridges-lexicon.cjs']],
    ['site', 'the site bar on every page', ['node', 'scripts/install-page-chrome.mjs', '--check']],
    ['pins', 'the extractor (owl_extract.cjs)', ['node', E + 'tests/owl-extract.cjs']],
    ['reference', 'pytest (Engram reference)', ['python3', '-B', '-m', 'pytest', '-q', '-p', 'no:cacheprovider', E + 'reference/tests'],
        { skips: false, python: ['numpy', 'pytest'] }],
    ['pins', 'engram/1 golden corpus', ['node', E + 'reference/golden/make_golden_v1.cjs', OWL, '--check'], { tags: ['siblings'] }],
    ['pins', 'STRIX library and exports', ['node', E + 'reference/golden/make_owl_v1.cjs', OWL, '--check'], { tags: ['siblings'] }],
    ['pins', 'LATTICE-SEED/1', ['node', E + 'reference/golden/make_lattice_v1.cjs', OWL, '--check'], { tags: ['siblings'] }],
    ['pins', 'the bridges to Owl Academy', ['node', E + 'reference/golden/make_bridges_v1.cjs', OWL, '--check'], { tags: ['siblings'] }],
    ['pins', 'biochain_v2.js from Owl Academy\'s core', ['node', E + 'reference/golden/make_bridges_v2.cjs', '--check', '--owl', OWL], { tags: ['siblings'] }],
];
module.exports = { RUNS };

if (main) runAll(RUNS, args).then(code => process.exit(code));
