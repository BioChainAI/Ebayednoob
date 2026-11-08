// Every check in the repository, with one set of statuses (overhaul F45).
//
//   node tests/run-all.cjs [--profile full|ci|cross-repo|quick] [-j N] [--allow-partial] [--strict] [--skip-tag TAG]... [--list]
//
// It gathers the checks of Pages/Hyperbolic Oracles/tests/all.cjs, Pages/Engram Minds Eye/tests/all.cjs and
// Pages/Hyperbolic Lexicon/tests/all.cjs (a check two systems share runs once), the site checks (the site bar, page
// policies, sinks, storage keys, the GitHub store, the rebuilt calculator pages), the core manifest
// (scripts/check-cores.mjs) and the contracts (tests/contracts: the duplicated primitives, the census check word, the
// calculator's tiers).
// Profiles:
//   full         everything (the default)
//   ci           everything that needs no sibling checkout (the pull-request workflow, .github/workflows/check.yml)
//   cross-repo   only the checks against Owl-Academy, BioChain-AI and SHD-CCP (the nightly workflow, cross-repo.yml);
//                always strict, since a skip there means a checkout is missing
//   quick        ci without the slow and browser checks
// --skip-tag TAG leaves out the checks with that tag (site-bar, browser, slow, siblings). --list prints the checks.
// --strict counts a skip as a failure (and, for the cross-repo pytest entry, a test pytest skipped): check.yml uses it
// when the downloads are present.
// Statuses: pass, partial, skip, FAIL (scripts/lib/runner.cjs); exits 1 if any check fails, or is partial without
// --allow-partial.
'use strict';
const path = require('path');
const { runAll, parseArgs } = require('../scripts/lib/runner.cjs');

const argv = process.argv.slice(2), args = parseArgs(argv);
const profile = args.profile || 'full', skipTags = args.skipTags;
if (profile === 'cross-repo') args.strict = true;
const suite = f => require(path.join(__dirname, '..', 'Pages', f, 'tests', 'all.cjs')).RUNS;
const PY = ['python3', '-B'];
const L = 'Pages/Hyperbolic Lexicon/';

const SITE = [
    ['site', 'the site bar on every page', ['node', 'scripts/install-page-chrome.mjs', '--check'], { tags: ['site-bar'] }],
    ['site', 'values inserted into HTML are escaped', ['node', 'scripts/checks/sinks.cjs']],
    ['site', 'storage keys are prefixed, nothing cleared', ['node', 'scripts/checks/storage-policy.cjs']],
    ['site', 'external tags allowed by page policies', ['node', 'scripts/checks/sri.cjs']],
    ['site', 'the GitHub store keeps no token', ['node', '--test', 'tests/site/github-store.test.cjs']],
    ['site', 'pages under their policies in Chromium', ['node', 'tests/site/csp-smoke.cjs'], { tags: ['browser'] }],
    ['site', 'calculator pages rebuild byte for byte', ['bash', 'scripts/geometric-build/tests/rebuild-identical.sh'], { exclusive: true }],
    ['cores', 'the core manifest (scripts/cores.json)', ['node', 'scripts/check-cores.mjs']],
    ['contracts', 'duplicated primitives (JavaScript)', ['node', 'tests/contracts/primitives.cjs']],
    ['contracts', 'duplicated primitives (Python)', [...PY, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', 'tests/contracts'], { skips: false, python: ['pytest'] }],
    ['contracts', 'the census check word', ['node', 'tests/contracts/check-word.cjs']],
    ['contracts', 'the calculator\'s tiers and orbital_core.js', ['node', 'tests/contracts/tiers-spec.cjs']],
    ['pins', 'ATTEST/1 and the grower against the checkouts', [...PY, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--rootdir', L + 'reference',
        L + 'reference/tests/test_attest.py', L + 'reference/tests/test_chain.py'], { skips: false, python: ['numpy', 'pytest', 'cryptography'], tags: ['siblings'], innerSkips: true }],
];

// every check once, in this order, by its command line
const seen = new Set(), ALL = [];
for (const run of [...suite('Hyperbolic Oracles'), ...SITE, ...suite('Engram Minds Eye'), ...suite('Hyperbolic Lexicon')]) {
    const key = run[2].join('\0');
    if (seen.has(key)) continue;
    seen.add(key); ALL.push(run);
}
const tags = run => (run[3] && run[3].tags) || [];
const PROFILES = {
    full: () => true,
    ci: r => !tags(r).includes('siblings'),
    'cross-repo': r => tags(r).includes('siblings'),
    quick: r => !tags(r).some(t => ['siblings', 'slow', 'browser'].includes(t)),
};
if (!PROFILES[profile]) { console.error(`unknown profile ${profile}: one of ${Object.keys(PROFILES).join(', ')}`); process.exit(2); }
const RUNS = ALL.filter(PROFILES[profile]).filter(r => !tags(r).some(t => skipTags.includes(t)));
if (argv.includes('--list')) {
    for (const r of RUNS) console.log(`${r[0].padEnd(10)} ${r[1].padEnd(48)} ${r[2].join(' ')}${tags(r).length ? `  [${tags(r).join(', ')}]` : ''}`);
    process.exit(0);
}
console.log(`profile ${profile}: ${RUNS.length} checks, ${args.jobs} at a time${skipTags.length ? `, without ${skipTags.join(', ')}` : ''}${args.strict ? ', strict' : ''}\n`);
runAll(RUNS, args).then(code => process.exit(code));
