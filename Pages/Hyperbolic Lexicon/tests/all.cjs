// Hyperbolic Lexicon: every check in one command, this system's and those of the cores it loads (Phase 1).
//
//   node "Pages/Hyperbolic Lexicon/tests/all.cjs"           the quick spike set
//   node "Pages/Hyperbolic Lexicon/tests/all.cjs" --all     every spike rerun (about ten minutes more)
//   options: -j N (checks in parallel), --allow-partial (a partial check is not a failure: local runs without caches)
//
// Runs, in order: the cores this system loads unchanged (orbital_core.js; Hyperbolic Oracles' hyperbolic_core.js,
// decoder3d.js, twin3d.js and fence.js against their Python traces; Engram Mind's Eye's browser core and bridges),
// this folder's links and spike reruns, the site bar, the WordNet and EWT pins, the Python reference (its fast pytest
// suite; the Unicode 15.1 table, V0 retrained, V1 and the L1 instance lists against their pins, the Unicode table
// against the official UCD 15.1.0 files; the text, geometry and L6 traces rebuilt and compared byte for byte), and the
// 0xA kernel against SHD-CCP's own Ontology tooling. Phase 5 adds the pages' WordNet data (make_wordnet_view_v1.cjs
// --check), the page engine's Node checks (tests/pages-lexicon.cjs), its trace (traces_pages.py --check) and both pages
// in Chromium (tests/pages-chromium-2d.cjs and pages-chromium-3d.cjs, about two minutes; skipped without Playwright).
// The overhaul (E1) adds the chain trace (traces_chain.py --check) and moves the Owl and BioChain-AI pin onto content
// checks (make_biomesh_compat_v1.cjs --check: the v1 file reproduced from the pinned source content, and the current
// growers giving v1's records; the checkouts default to OWL_ACADEMY_DIR and BIOCHAIN_AI_DIR, else beside this
// repository: scripts/lib/siblings.cjs). The fast pytest suite leaves out test_lps.py::test_hurwitz_read_only, which
// reads SHD-CCP's hurwitz.py: it runs as its own check, tagged "siblings" like the kernel check.
// Stage 2's write-up (A13.15 step 8) adds the Node re-evaluation of Amendment 13 item 1 (lexicon_stage2.js, beside the
// unedited lexicon_core.js): its trace (traces_stage2.py --check, and tests/parity-stage2.cjs --trace, line for line)
// and the decisive pass-1 code files re-rendered and compared by SHA-256 (tests/parity-stage2.cjs --codes, about three
// minutes on four workers, tagged "slow"; skipped without the Stage-2 cache, which CI's cache does not hold, so it is
// optional: a skip stays a skip under --strict).
// A check whose data or checkout is missing exits 2 and is reported as skipped, never as passed; one that ran only in
// part (tests/parity-lexicon.cjs without a cache) exits 3 and is reported as partial; pytest's own exit 2 (interrupted,
// or an error while collecting) counts as a failure. The summary is "N pass, M partial, K skipped"
// (scripts/lib/runner.cjs). Exits 1 if any check fails, or is partial without --allow-partial.
'use strict';
const siblings = require('../../../scripts/lib/siblings.cjs');
const { runAll, parseArgs } = require('../../../scripts/lib/runner.cjs');

const L = 'Pages/Hyperbolic Lexicon/', HO = 'Pages/Hyperbolic Oracles/', E = 'Pages/Engram Minds Eye/';
const PY = ['python3', '-B'];
// [group, label, command, options?]; options.skips: false when exit 2 is not "skipped" (pytest uses it for errors)
const RUNS = [
    ['cores', 'orbital_core.js', ['node', 'scripts/geometric-build/tests/orbital-core.cjs']],
    ['cores', 'hyperbolic_core.js parity', ['node', HO + 'tests/parity.cjs']],
    ['cores', 'decoder3d.js parity', ['node', HO + 'tests/parity3d.cjs']],
    ['cores', 'twin3d.js parity', ['node', HO + 'tests/parity-twin.cjs'], { tags: ['slow'] }],
    ['cores', 'fence.js parity', ['node', HO + 'tests/parity-fence.cjs']],
    ['cores', 'Engram browser core', ['node', E + 'tests/parity-engram.cjs']],
    ['cores', 'Engram bridges (biochain codec)', ['node', E + 'tests/bridges.cjs']],
    ['lexicon', 'browser core parity (traces)', ['node', L + 'tests/parity-lexicon.cjs', '--quiet']],
    ['lexicon', 'Stage 2 re-evaluation: the trace (A13.1)', ['node', L + 'tests/parity-stage2.cjs', '--trace', '--quiet']],
    ['lexicon', 'Stage 2 re-evaluation: decisive code files', ['node', L + 'tests/parity-stage2.cjs', '--codes', '--quiet'], { tags: ['slow'], optional: true }],
    ['lexicon', 'JS data wrappers', ['node', L + 'reference/golden/make_js_data_v1.cjs', '--check']],
    ['lexicon', 'L6 view data (Explainer 12)', [...PY, L + 'reference/golden/make_l6_view_v1.py', '--check']],
    ['lexicon', 'WordNet data of the 2D and 3D pages', ['node', L + 'reference/golden/make_wordnet_view_v1.cjs', '--check']],
    ['lexicon', 'chain: records, tampers, signing', ['node', L + 'tests/chain-lexicon.cjs']],
    ['lexicon', 'Engram imports Lexicon shards', ['node', L + 'tests/bridges-lexicon.cjs']],
    ['lexicon', 'page engine (2D and 3D pages)', ['node', L + 'tests/pages-lexicon.cjs']],
    ['pages', 'the 2D page in Chromium', ['node', L + 'tests/pages-chromium-2d.cjs'], { tags: ['browser'] }],
    ['pages', 'the 3D page in Chromium', ['node', L + 'tests/pages-chromium-3d.cjs'], { tags: ['browser'] }],
    ['pins', 'Owl and BioChain-AI growers (compat)', ['node', L + 'reference/golden/make_biomesh_compat_v1.cjs', siblings.dir('Owl-Academy'), siblings.dir('BioChain-AI'), '--check'],
        { tags: ['siblings', 'slow'] }],
    ['lexicon', 'links and the ways in', ['node', L + 'tests/links.cjs']],
    ['lexicon', 'spike reruns', ['node', L + 'tests/spikes.cjs', ...(process.argv.includes('--all') ? ['--all'] : [])]],
    ['site', 'the site bar on every page', ['node', 'scripts/install-page-chrome.mjs', '--check']],
    ['pins', 'WordNet 3.0', ['node', L + 'reference/golden/make_wordnet_v1.cjs', '--check']],
    ['pins', 'UD English EWT', ['node', L + 'reference/golden/make_ewt_v1.cjs', '--check']],
    // test_hurwitz_read_only reads SHD-CCP's hurwitz.py, so it runs with the checks that need the sibling checkouts
    ['reference', 'pytest (fast suite)', [...PY, '-m', 'pytest', '-q', '-p', 'no:cacheprovider',
        '--rootdir', L + 'reference', L + 'reference/tests', '--deselect', 'tests/test_lps.py::test_hurwitz_read_only'],
        { skips: false, python: ['numpy', 'numba', 'pytest', 'cryptography'] }],
    ['shdccp', 'hurwitz.py read-only and pinned (lps.py)', [...PY, '-m', 'pytest', '-q', '-p', 'no:cacheprovider',
        '--rootdir', L + 'reference', L + 'reference/tests/test_lps.py::test_hurwitz_read_only'], { skips: false, python: ['numpy', 'pytest'], tags: ['siblings'] }],
    ['pins', 'Unicode 15.1 table', [...PY, L + 'reference/golden/make_unicode_v1.py', '--check']],
    ['pins', 'Unicode 15.1 table vs the UCD files', ['python3', '-B', '-I', L + 'reference/golden/check_ucd_v1.py',
        '--check']],
    ['pins', 'V0 lex0 (retrained)', [...PY, L + 'reference/golden/make_vocab_v0.py', '--check']],
    ['pins', 'V1 bert-base-uncased', [...PY, L + 'reference/golden/make_vocab_v1.py', '--check']],
    ['pins', 'L1 instance lists', [...PY, L + 'reference/golden/make_l1_instances_v1.py', '--check']],
    ['traces', 'text (normaliser, WordPiece)', [...PY, L + 'reference/traces_text.py', '--check']],
    ['traces', 'geometry (address, points, rank)', [...PY, L + 'reference/traces_geometry.py', '--check']],
    ['traces', 'L6 (snapped toy tables, exact ranks)', [...PY, L + 'reference/traces_l6.py', '--check']],
    ['traces', 'pages (the page engine\'s outputs)', [...PY, L + 'reference/traces_pages.py', '--check']],
    ['traces', 'chain (grower, records, RFC 6962, attestation)', [...PY, L + 'reference/traces_chain.py', '--check']],
    ['traces', 'Stage 2 (exact keys, certified order, tie classes)', [...PY, L + 'reference/traces_stage2.py', '--check'], { python: ['numpy'] }],
    ['shdccp', 'kernel 0xA with SHD-CCP\'s tooling', ['python3', '-B', '-I', L + 'proposals/check_kernel.py', siblings.dir('SHD-CCP')], { tags: ['siblings'] }],
];
module.exports = { RUNS };

if (require.main === module) runAll(RUNS, parseArgs()).then(code => process.exit(code));

