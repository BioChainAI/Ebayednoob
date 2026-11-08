// Hyperbolic Oracles: every check in one command (overhaul F45: the Oracles had no aggregator).
//
//   node "Pages/Hyperbolic Oracles/tests/all.cjs" [-j N] [--allow-partial]
//
// The four browser cores against their Python traces (hyperbolic_core.js, decoder3d.js, twin3d.js with its ~40 s
// exact trace, fence.js with its checks), then the Python reference's pytest suite (reference/tests: H1-H7, parity with
// polystep, problems, schedule, generator), which needs numpy, torch (CPU) and polystep 1.1.1 (reference/README.md);
// without them it is reported as skipped, never passed. Statuses and summary: scripts/lib/runner.cjs.
'use strict';
const { runAll, parseArgs } = require('../../../scripts/lib/runner.cjs');

const HO = 'Pages/Hyperbolic Oracles/';
const RUNS = [
    ['cores', 'hyperbolic_core.js parity', ['node', HO + 'tests/parity.cjs']],
    ['cores', 'decoder3d.js parity', ['node', HO + 'tests/parity3d.cjs']],
    ['cores', 'twin3d.js parity', ['node', HO + 'tests/parity-twin.cjs'], { tags: ['slow'] }],
    ['cores', 'fence.js parity', ['node', HO + 'tests/parity-fence.cjs']],
    ['reference', 'pytest (hpstep)', ['python3', '-B', '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--rootdir', HO + 'reference', HO + 'reference/tests'],
        { skips: false, python: ['numpy', 'pytest', 'torch', 'polystep'] }],
];
module.exports = { RUNS };

if (require.main === module) runAll(RUNS, parseArgs()).then(code => process.exit(code));
