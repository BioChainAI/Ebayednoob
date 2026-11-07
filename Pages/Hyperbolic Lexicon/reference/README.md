# Hyperbolic Lexicon · Python reference

Phase 1 built the reference, after `../PREREGISTRATION.md` was committed and after Amendment 1 fixed the open
definitions, before any code. As in Engram Mind's Eye, the runner was committed after its dry run on unregistered
seeds and before any decisive run; Amendment 2 followed two adversarial reviews; then `run_claims.py` ran once on the
code at commit `88e63f7`. It decided L2, L3 (the Python side), L5 and L7, all supported, every control failing as
required. Explainer 9, [`../explainers/reference.html`](../explainers/reference.html), tells that story.

In Phase 2, the reference is the authority for the browser core (`../lexicon_core.js`). Amendment 4 fixed the
comparisons before any code. `run_claims.py --phase2` (with `lexicon/phase2.py`) and `run_claims_js.cjs` were
committed after their dry run and a review; Amendment 5 followed. Then each ran once on the code at `a1fe9a8`: first
the reference's half of L1 and L4, then Node and Chromium against it. L1, L3(f) and L4(a, b) are supported, every
control failing as required. Explainer 10, [`../explainers/browser-core.html`](../explainers/browser-core.html),
tells Phase 2's story.

In Phase 3, the reference gained the chain modules: the Python port of the shard grower, the records, the RFC 6962
manifest, ATTEST/1 and the hardened verifier, twins of `lexicon_core.js`'s chain section. Amendment 7 fixed their
definitions before any code. It was built and reviewed, saved after a container restart (`b822237`), changed for
Amendment 8 (`8c51e08`) and dry-run (`25b48b3`); Amendment 8 followed (`6da04be`). Then `run_claims_phase3.cjs`, with its
Python half `run_claims_phase3.py`, ran once on that code (`865791f`, 50 min 44 s). L8 (for the JS grower and the
Python port), L9, L10 and L11 are supported, every control showing its weakness as required; L11 on packages grown
with engrams off, a reading Amendment 8 fixed after dry runs had put the engrams-on median near the bar.
Explainer 11, [`../explainers/chains.html`](../explainers/chains.html), tells Phase 3's story.

In Phase 4, the reference gained the numpy float64 trainer and the modules of L6 and L4(c) (below). Amendment 10
fixed their definitions before any code (`43265cf`). They were built on synthetic graphs and unregistered seeds
(`272a50d`), fixed after an adversarial review (`e0477fb`), and dry-run on the solid.n.01 closure set (`78c661d`,
`a780bb5`); registered tuning followed (`7c1806c`), then Amendment 11, which froze the rates in `settings.json`
(`515a4a1`). Then `run_claims_phase4.py --measure` ran once at that commit (`b6f3b9d`, 3,051 s on 4 workers). L6 is
supported in all four parts, (c) against its registered prediction of refuted, and L4(c) is supported, which
completes L4; every control showed its weakness, and L6 is not void. Amendment 12 (`5c846c5`) is an erratum to
Amendment 11 that changes no result, and `run_l6_node.cjs` (`09a8afa`) re-ranked the measured tables in Node with
every value equal. With Phase 4 all eleven registered claims are supported. Explainer 12,
[`../explainers/learned.html`](../explainers/learned.html), tells Phase 4's story.

Phase 5 built the 2D and 3D pages and decides no claim. The reference gained one trace for them, `traces_pages.py`,
whose 1,326 lines the page engine (`../assets/hl-pages.js`) regenerates in Node (`../tests/pages-lexicon.cjs`), and
the pins gained `golden/make_wordnet_view_v1.cjs`, the pages' WordNet data as script files. Explainers 13 and 14,
[`../explainers/page-2d.html`](../explainers/page-2d.html) and [`../explainers/page-3d.html`](../explainers/page-3d.html),
are the pages' manuals.

## The authority rule

- **Exact stages:** the Python reference decides the claims for the exact stages (normaliser, tokenizer, ids, addresses,
  exact points, exact ranking and metrics, the LPS overlay, records and manifests). The browser core
  (`lexicon_core.js`, Phases 2 to 4) must reproduce its traces line for line, and does: `../tests/parity-lexicon.cjs`
  passes 22,586 of 22,586 lines in Node, 18,578 of them from the five Phase 1 traces, 1,323 from the chain trace
  (Phase 3) and 2,585 from the L6 trace of snapped toy tables (Phase 4, `traces/l6_v1.txt`). In Phase 3 the reference
  decided L8(d), L9 and L10's verdicts, and the JS equalled it on every record, root, proof and verdict. In Phase 4
  the reference decided L6 and L4(c), and Node, with `lexicon_core.js` unchanged, re-ranked the 50 measured snapped
  tables and the exact arm with every exact MAP, LBENCH/1 hash, mean rank and tie count equal (`run_l6_node.cjs`,
  reported). In Phase 5 the page engine, on `lexicon_core.js` unchanged, regenerates the pages trace
  (`traces/pages_v1.txt`) line for line, 1,326 of 1,326 (`../tests/pages-lexicon.cjs`); it decides nothing.
- **Compatibility with Owl Academy and BioChain-AI:** their own JavaScript is the authority (claim L8(a, b)), run
  unchanged from their checkouts by name-grab (Owl Academy at `7f45f35`, BioChain-AI at `c975161`).
- **Learned embeddings (Phase 4):** the numpy float64 trainer (`lexicon/embed.py`) is the authority for the learned
  tables (D9), and the reference's exact ranking of their snaps decides. geoopt, the reported cross-check, was not
  run: torch could not be installed through the proxy (download.pytorch.org refused; PyPI's wheel pulls more than
  1 GB of CUDA wheels), and the tests carry a 60-digit decimal recomputation of one step and finite-difference
  gradients in its place.

## Pins

| File | Pins |
| --- | --- |
| `golden/wordnet_v1.cjs` | Reader for nltk_data's `wordnet.zip` (WordNet 3.0) with Node alone; the archive's SHA-256 (`cbda5ea6…`) and size |
| `golden/make_wordnet_v1.cjs`, `golden/wordnet_v1.meta.json`, `golden/LICENSE-WORDNET.txt` | Fetches the archive once into `~/.cache/hyperbolic-lexicon` (outside git) and records every file's hash plus the counts the claims use. `--check` recomputes. (Phase 0) |
| `golden/make_ewt_v1.cjs`, `golden/ewt_v1.meta.json` | UD English EWT at commit 4a4d77f (CC BY-SA 4.0): file hashes and sentence counts, no text. `--check` recomputes. (Phase 0) |
| `golden/make_unicode_v1.py`, `golden/unicode_15_1_v1.json`, `golden/unicode_15_1_v1.meta.json`, `golden/LICENSE-UNICODE.txt` | The Unicode 15.1 table N_B reads, exported from CPython 3.13's `unicodedata` and `str.lower`: 142,624 bytes, SHA-256 `30bed6fb…`, committed. `--check` rebuilds it and compares. (Phase 1) |
| `golden/make_vocab_v0.py`, `golden/vocab_v0_lex0.txt`, `golden/vocab_v0.meta.json` | V0 "lex0", L1's decisive vocabulary: 8,192 entries after 8,059 merges on L1 instance (a), by Amendment 1's algorithm; SHA-256 `df227056…`, committed and frozen. Its alphabet is 64 ASCII code points, so a word with a non-ASCII letter is `[UNK]` under V0. `--check` retrains (about 5 s) and compares. (Phase 1) |
| `golden/make_vocab_v1.py`, `golden/vocab_v1.meta.json` | V1, bert-base-uncased's `vocab.txt` at Hugging Face revision 86b5e09: 30,522 entries, SHA-256 `07eced37…`, Apache-2.0. Only the hash is committed; the file lives in the cache. Being pinned, it puts L1's second cell in force. `--check` verifies the cached file. (Phase 1) |
| `golden/make_l1_instances_v1.py`, `golden/l1_instances_v1.meta.json` | The content and order of L1's four instance lists, by count and an order-sensitive digest: (a) 117,659, (b) 16,622, (c) 20,520, (d) 2,000 strings. `--check` recomputes. (Phase 1) |
| `golden/l1_instances_v1.cjs` | The same four lists loaded in Node, each string as its UTF-8 bytes, the twin of `lexicon/l1.py` (loaders only; the dry-run and trace strings too). `loadAll()` throws unless every count and digest is the meta's; `--check` compares them, exit 2 when the WordNet or UD EWT cache is missing. `run_claims_js.cjs` reads its instances through it. (Phase 2) |
| `golden/make_js_data_v1.cjs` | Writes `../data/unicode_15_1_v1.js` and `../data/vocab_v0_lex0.js`, the pinned table and V0 as ASCII script files that register each file's exact text, so a page reaches them without fetch; each source is checked against its pin first, and `lexicon_core.js` checks the SHA-256 again. `--check` rebuilds in memory and compares bytes. (Phase 2) |
| `golden/nb_spec_v1.txt` | N_B's specification as Amendment 1 item 1 wrote it, with Amendment 2's readings, verbatim: the file whose SHA-256 is `LVOCAB/1`'s normaliserSpecSha (Amendment 7 item 3). `lexicon/records.py` and `lexicon_core.js` refuse it unless its hash is the pinned one. (Phase 3) |
| `golden/make_biomesh_compat_v1.cjs`, `golden/biomesh_compat_v1.json` | `lexicon_core.js`'s `growSync` against Owl Academy's and BioChain-AI's own `growBiochain` (run unchanged by name-grab from their checkouts), engrams off and on, on 13 unregistered texts: `Rng(8000 + i)` synthetic shards, seven edge texts and the first two verb gloss shards. All 26 records equal both growers' in all fifteen fields, and both `verifyIntegrity`s accept them. `node golden/make_biomesh_compat_v1.cjs <Owl-Academy> <BioChain-AI> --check` recomputes (about 2 minutes) and exits 2 when a checkout is missing. (Phase 3) |
| `golden/check_ucd_v1.py`, `golden/ucd_15_1_v1.meta.json` | The pinned table checked field by field against the official UCD 15.1.0 files (UnicodeData, SpecialCasing, DerivedCoreProperties, DerivedAge), pinned at unicode-org/unicodetools `b9144701` and fetched from GitHub, since unicode.org is blocked here: equal in every field (categories, decompositions, combining classes, lowercase, both Final_Sigma sets, whitespace, Hangul). Without `--check` it fetches once into the cache and writes the meta; `--check` compares. Run as `python3 -B -I`. (After Phase 2's run, `5e1681c`) |
| `golden/make_wordnet_view_v1.cjs` | Writes `../data/wordnet_nouns_v1.js` (every noun synset in offset order with its first lemma and L3 spanning parent; 2,549,905 bytes) and `../data/wordnet_map_a_v1.js` (the verb forest and the WordNet index rows of V0's entries, what map A reads; 567,400 bytes), the 2D and 3D pages' WordNet data as script files, each beginning with the WordNet licence verbatim. It parses its own output back with the page engine's parsers and refuses to write unless the noun words give the canonical point list (`eb22bf00…`), the verb words their trace line, map A on that data equals map A on the full archive for all 8,192 V0 entries, and the address table's root is `LADDR/1`'s (`30b17bc3…`). `--check` rebuilds in memory and compares bytes (about 6 s; exit 2 without the archive). (Phase 5) |
| `golden/l6_protocol_v1.txt` | Amendment 10 verbatim, from its heading, with LF line ends and a final LF (A10.12): the file whose SHA-256, `1267ebb2…`, every `LBENCH/1` record carries as its protocolSha. `tests/test_l6.py` pins it against `../PREREGISTRATION.md`. (Phase 4) |

Every check exits 0 on a match, 1 on a mismatch and 2 "skipped" when its data is not cached. Fetch the data once:

```
node "Pages/Hyperbolic Lexicon/reference/golden/make_wordnet_v1.cjs"
node "Pages/Hyperbolic Lexicon/reference/golden/make_ewt_v1.cjs"
python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_vocab_v1.py"
```

## Modules

Built in Phase 1, in `lexicon/` (with `phase2.py` in Phase 2, and the chain modules in Phase 3):

| Module | Holds |
| --- | --- |
| `lexicon/__init__.py` | Paths (the cache, `golden/`) and the import paths of Hyperbolic Oracles' and Engram Mind's Eye's references |
| `lexicon/wordnet.py` | The same reader as `golden/wordnet_v1.cjs`, in Python: synsets, the spanning forest, the closure, the mammal sets, the lemma types, C0, the gloss strings |
| `lexicon/unicode_tables.py` | The pinned Unicode 15.1 table, refused unless its SHA-256 is the pinned one; the only source of Unicode facts for N_B |
| `lexicon/normalise.py` | N_B (Amendment 1, item 1) with byte spans, failing closed on code points unassigned in 15.1; N1, the registered fallback |
| `lexicon/wordpiece.py` | Greedy longest-match-first WordPiece, the id stream, the V0 "lex0" trainer (item 3), the reported tokenizer metrics |
| `lexicon/l1.py` | L1's instance loaders (a)–(d), the dry-run and trace strings, and the pool of (d); loaders only |
| `lexicon/address.py` | The L3 rule and its controls, the verb forest, certifyWord, the bijective 59/64-bit id codec (D6), the prefix check of L3(d), map A (item 4), the S3 and K3 words |
| `lexicon/h3tree.py` | Exact H³ points of a whole forest (hpstep's octahedral tree, t = 3/4) as integer vectors over 7^n |
| `lexicon/h2exact.py` | The exact H² tree of D3 (t = 11/13): points, frames, exact greedy decoding |
| `lexicon/flat.py` | The curvature-0 arms F3, F2, F3\*, F2\* (item 7) |
| `lexicon/rank.py` | Exact ranking keys, rank lists, pessimistic AP, MAP and mean rank as exact rationals, distortion, bits, the bootstrap |
| `lexicon/lps.py` | X(5, q) for q ∈ {13, 17, 29}: L7's checks (a)–(e) and controls |
| `lexicon/phase2.py` | Phase 2 (Amendment 4): L1's per-instance record and digests, S6's R(s) from the pinned table (L1 control 1's reference side), the Hugging Face wrapper; L4(b)'s float64 rounding, left-to-right float key, inversions and float ties, and control 2's acosh evaluator |
| `lexicon/chain.py` | Phase 3 (L8; Amendment 7 items 1, 2 and 4): Owl Academy's `growBiochain` step for step, synchronously, with the JavaScript's quirks kept (leaves hashed over the chunk's bytes read as code units, the `shdccp/2` Merkle rule, V8's `Math.hypot` and `toFixed(12)` exactly); the rank coder, packets and BioChain-AI's kernel normalisation (L8's control 1); the exact weave and its segment sub-weaves; S4's search for residual flips that decode the same (T9); Amendment 7 item 2's synthetic shards and the gloss cut; JavaScript's number and JSON text |
| `lexicon/records.py` | Phase 3 (Amendment 7 item 3): `LVOCAB/1`, `LADDR/1` with `addrTableRoot` over map A's rows, `LPREP/1` (Tier S, and Tier P with a salted root), `LCORPUS/1` and `LGROW/1`, and the derived layers (the V0 id stream of a whole shard) |
| `lexicon/manifest.py` | Phase 3 (L9(a); Amendment 7 item 5): RFC 6962 trees, audit paths and consistency proofs, verified with RFC 9162's algorithms; the synthetic leaf lists and the alteration classes; L9's controls, the `shdccp/2` Merkle rule and an XOR summary |
| `lexicon/attest.py` | Phase 3 (L10; Amendment 7 item 6): ATTEST/1 with `cryptography`: BioChain-AI's identity, key vector and key id, ported; P1363 to DER and back with r and s left-padded; the high-S twin; the key-registry snapshot pinned by its SHA-256; L10's control 2 (the conversion skipped) |
| `lexicon/verify.py` | Phase 3 (L10, L11): packages; the hardened verifier, its checks in the registered order (parity, canonical, crystal, leaves, weaves, derived, commitment, attestation, inclusion, consistency) and its two verdicts, self-consistent and authentic (Amendment 8 item 3); the session (V0, `LVOCAB/1`, `LADDR/1` recomputed once, the registry); the tamper helpers of T1-T9 |

Built in Phase 4 (L6 and L4(c); Amendment 10, cited A10.n):

| Module | Holds |
| --- | --- |
| `lexicon/stream.py` | The training stream: `hpstep.prng`'s xoshiro128\*\* and splitmix32 copied line for line into numba kernels (numba 0.68.1 pinned, `cache=False`); used by the trainer only (A10.1) |
| `lexicon/pystream.py` | The same calls on `hpstep.prng.Rng` itself, without numba; `replay_states`, the replay check of A10.1 |
| `lexicon/embed.py` | The closure sets and training instances (A10.2, control 2's pairs), the initial table, the schedule and the float64 trainer of A10.3–5: no BLAS, sequential sums, the Lorentz guard and step |
| `lexicon/learned.py` | Snapping to 2^−32 (A10.6), exact ranking of snapped tables through `rank._ap_and_ranks`, float64 ranking (A10.10), fractional-tie AP, the rank structure, displacement, bits and the distances for distortion (A10.11) |
| `lexicon/l6.py` | Seeds, tuning jobs and the lr choice, control 1's relabelling, control 2's pairs, the floors, intervals, presence, the decisions of L6 and L4(c), `LBENCH/1` (A10.12), the protocol pin (`golden/l6_protocol_v1.txt`) and the lr-freeze lookup |

Built in Stage 2 (L12–L15; Amendment 13, cited A13.n; in progress, nothing scored yet):

| Module | Holds |
| --- | --- |
| `lexicon/stage2data.py` | The pins of A13.2 and their store; word readers (pass 1) and gold readers (pass 2, refused until `open_gold()`) in separate functions; the count checks of A13.9; the protocol pin (`golden/stage2_protocol_v1.txt`) |
| `lexicon/senses.py` | N_S, the universes U_full and U_@ (the `@` graph), S_U(w), coverage, pair sets, word types, HiT's names, the reported sense rules |
| `lexicon/wngraph.py` | WN with no geometry (A(x), up, D, G_WN, Sym_WN, Dep_WN) and the reported WN-U, ST, letter tree and WN-LCh |
| `lexicon/scores2.py` | Points per arm (H3, H2, F, K3, S-full, W, S3, learned), exact input tuples, certified values at 120 and 240 digits, the comparison, tie classes, Φ, Dep°, G_root, the reported forms |
| `lexicon/stats2.py` | ρ on average ranks, the word-level, row and cluster bootstraps, AP, RR, macro RR, accuracy, F1, the suite's threshold protocol, the bands and the decisions of L12–L15 |
| `lexicon/hit.py` | HiT's rows and names, the verifier, the closure check, HIT-R and the dry split, the within-row control's slots |
| `lexicon/glove.py` | GloVe 6B's text members as exact decimals, the exact cosine key, coverage counts |
| `lexicon/embed.py`, `lexicon/stream.py` (added functions only) | L14's implicit non-neighbour map and its stream, the direct-edge and edge-shuffled instances, floors, convergence (A13.10) |

Beside them, `traces_l6.py` writes `traces/l6_v1.txt`, the L6 trace the browser core must reproduce before it
re-evaluates the measured snapped tables (A10.11), and `fractional_ties.py` writes `results/fractional-ties.json` and
`.md`, A10.17's fractional-tie values for Phases 1 and 2 (both under "How to run" below).

The exact modules of Hyperbolic Oracles (`hpstep.prng`, `hpstep.problems`, `hpstep.decode3d`) and of Engram Mind's
Eye (`engram.ttmpt`, `engram.address`) are imported in place, unchanged, from their reference folders.
`js_engram_keys.cjs` is L2's Node half: the engram/1 key of each type from `ttmpt_core_v1.js`, loaded unchanged.

`run_claims_js.cjs` (Phase 2) is the JavaScript half of L1, L3(f) and L4, and it makes their decisions
(Amendment 4). It runs the following steps in order, each refusing to go on when its inputs are not the registered
ones:
1. Parity: `../tests/parity-lexicon.cjs` must pass with no line skipped (in a dry run, V1's lines may be skipped
   when V1 is not cached), and `data/*.js` must equal the pins.
2. L1 in Node: the instance lists through `golden/l1_instances_v1.cjs`, checked against the digests of the inputs
   Python ran; per set and vocabulary, each record's SHA-256, the list digest and the id-stream SHA-256 against
   Python's, and control 1 per case.
3. L1 in Chromium: the repository root is served on a free local port and headless Chromium (Playwright) is driven
   through `../tests/l1-harness.html`, a minimal page with no site bar that is never opened by hand. The page also
   runs L4(a) on the mammals (reported) and reports its versions and Unicode behaviour.
4. L3(f): the noun words, H³ and H² points, the canonical point list's SHA-256 and the 2,000 sampled lines.
5. L4: L4(a)'s rank lists and exact values, and L4(b)'s float counts and both controls (reported; the reference
   decides (b)).
6. The decisions, written to `results/claims-phase2.json` and `.md`.

Its own per-instance lists go to `~/.cache/hyperbolic-lexicon/phase2/js/`.

`run_claims_phase3.cjs` (Phase 3) decides L8, L9, L10 and L11, with its Python half `run_claims_phase3.py`, which it
starts with one JSON request at a time (`l8l9`, `verify`, `time`) and which decides nothing itself. In order, each step
refusing to go on when its inputs are not the registered ones:
1. The gate: `../tests/parity-lexicon.cjs` must pass with no line skipped, the chain trace included; the Owl Academy
   and BioChain-AI checkouts must be at `7f45f35` and `c975161`, their files unchanged.
2. The inputs: C0's 148 shard texts (checked against `golden/wordnet_v1.meta.json`) and Amendment 7 item 2's 20
   synthetic shards; Python regenerates every text, and its SHA-256 must be the runner's.
3. L8: every shard grown with engrams off and on by `growSync`, by Owl's and BioChain-AI's growers (in worker
   threads) and by the Python port; the fields that differ; both `verifyIntegrity`s and Engram's `importBiochain` on
   every distinct record; (d) in Python against JS; the three controls.
4. L9: the corpus manifest and the synthetic lists in JS and in Python, with every proof and alteration; the exact
   weaves; the two controls.
5. L10: keys made in WebCrypto, identity and key vector by BioChain-AI's own code, the registry snapshot; the clean
   and tampered packages verified in JS and in Python; the two controls.
6. L11, in a fresh Node process with nothing else running: the session, then three timed repetitions of every full C0
   shard with the attestation-skipped control interleaved; the engrams-on packages, the literal `LADDR/1` reading and
   Python's times, reported; the bootstrap intervals from the Python half.
7. The decisions, written to `results/claims-phase3.json` and `.md`, and the registry snapshot to
   `results/phase3-registry.json`.

Its per-instance data (Python's records, the packages, the L11 times) go to `~/.cache/hyperbolic-lexicon/phase3/`.

## How to run

From this folder (`Pages/Hyperbolic Lexicon/reference/`), with the data cached:

```
python3 -B -m pytest -q -p no:cacheprovider            # the fast suite (309 tests, about two minutes)
python3 -B -m pytest -q -p no:cacheprovider -m slow    # only the 13 slow checks (full corpora; the Phase 2 dry run;
                                                       # Phase 3's large lists, LADDR/1 over map A, the chain trace;
                                                       # Phase 4's bitwise reproducibility and the runner's self-test,
                                                       # resumed and under another numpy SIMD dispatch)
python3 -B run_claims.py --dry                         # the registered dry run (Amendment 1, item 10) into results/dry/
python3 -B run_claims.py                               # the Phase 1 claims L2, L3, L5, L7 into results/ (about 5 minutes)
python3 -B run_claims.py L3 L7                         # only these claims (results/claims-L3-L7.json and .md)
python3 -B run_claims.py --phase2 --dry                # Phase 2's dry run (Amendment 4 item 7) into results/dry/phase2-python.json
python3 -B run_claims.py --phase2                      # the reference's half of L1 and L4 into results/phase2-python.json;
                                                       # per-instance lists in ~/.cache/hyperbolic-lexicon/phase2/ (outside git)
node run_claims_js.cjs --dry                           # Phase 2's dry run in Node and Chromium, against results/dry/phase2-python.json
node run_claims_js.cjs                                 # parity, then L1 in Node and Chromium, L3(f), L4; the decisions into
                                                       # results/claims-phase2.json (about 7 minutes; after --phase2)
node run_claims_phase3.cjs --dry                       # Phase 3's dry run (Amendment 7 item 8) into results/dry/ (about 18 minutes)
node run_claims_phase3.cjs                             # L8-L11: gate, Python half, decisions into results/claims-phase3.json
                                                       # (about 51 minutes); per-instance data in ~/.cache/hyperbolic-lexicon/phase3/
node golden/make_biomesh_compat_v1.cjs <owl> <biochain> --check   # growSync against Owl's and BioChain-AI's growers
python3 -B -I golden/check_ucd_v1.py --check           # the pinned Unicode table against the official UCD 15.1.0 files
python3 -B traces_text.py --check                      # rebuild the normaliser and WordPiece traces and compare
python3 -B traces_geometry.py --check                  # rebuild the address, point and rank traces and compare
python3 -B traces_geometry.py                          # rewrite the address, point and rank traces
python3 -B traces_chain.py --check                     # rebuild the chain trace and compare (about 20 s)
python3 -B traces_chain.py                             # rewrite the chain trace
python3 -B traces_l6.py --check                        # rebuild the L6 trace (snapped toy tables, ranked exactly) and compare
python3 -B traces_l6.py                                # rewrite the L6 trace
python3 -B traces_pages.py --check                     # rebuild the pages trace (the page engine's outputs) and compare
python3 -B traces_pages.py                             # rewrite the pages trace
node golden/make_wordnet_view_v1.cjs --check           # rebuild the pages' WordNet data files and compare
python3 -B fractional_ties.py                          # A10.17: Phase 1's and 2's fractional-tie MAPs into
                                                       # results/fractional-ties.json and .md (about 5 minutes; decides nothing)
```

- **Tests.** `pytest.ini` deselects the slow tests unless `-m` selects them (`-m "slow or not slow"` runs both).
  Tests that need the WordNet archive skip without it.
- **The runner** needs the WordNet archive in the cache, numpy, Node (L2's Node table) and an SHD-CCP checkout beside
  this repository (L7(e), imported read-only). It counts every case, keeps the first failures of each part as
  counterexamples, and runs every control; an exact claim whose control passes is void. A dry run moves every seed
  up by 3000 and uses the verb forest and the repository Markdown in place of the registered instances.
- **Phase 2** (`--phase2`, then `node run_claims_js.cjs`): V1 is pinned, so L1's V1 cells are in force and the
  decisive run refuses unless both runners have V1 (a dry run goes on without it, and its L1 is then not supported).
  The JavaScript runner also needs Node 22, the WordNet archive and the UD EWT files in the cache, and
  `require('playwright')` with its Chromium; Hugging Face `tokenizers` is optional (reported only).
  UD EWT text is not committed (L1 Data): for set (b) the JSON keeps only indices, offsets, lengths and SHA-256s of
  its examples and counterexamples; the text goes to the cache beside the per-instance records.
- **Phase 3** (`node run_claims_phase3.cjs`): it needs Node 22 (WebCrypto, worker threads), python3 with
  `cryptography` and numpy, the WordNet archive in the cache, and the Owl Academy and BioChain-AI checkouts at their
  pinned commits, only read (beside this repository by default, or `--owl` and `--biochain`). `<owl>` and `<biochain>`
  above are those checkouts (`../../../../Owl-Academy` and `../../../../BioChain-AI` from this folder when they sit
  beside the repository). The keys are made per run and never written; the registry snapshot holds public JWKs only.
  `--dry --smoke --out <dir>` is a development run that decides nothing.
- **Traces** use seeds 8000 + i, which no claim uses. `traces_text.py` writes `traces/normalise_v1.txt` and
  `traces/wordpiece_v1.txt` (with V1 lines when V1 is cached); `traces_geometry.py` writes
  `traces/address_v1.txt`, `traces/points_v1.txt` and `traces/rank_v1.txt`; `traces_chain.py` (Phase 3) writes
  `traces/chain_v1.txt`: the codec, V8's float functions, synthetic and verb shards grown both ways, the records,
  RFC 6962 vectors and lists, ATTEST/1 under two fixed test keys with deterministic signatures, and the verifier's
  verdicts on clean and tampered packages. `traces_l6.py` (Phase 4) writes `traces/l6_v1.txt`: 18 toy DAGs and
  tables, case i from `Rng(8000 + i)`, float tables snapped at 2^−32 and at A10.10's coarse 2^−8 and integer tables
  with planted exact ties and binary64 near-ties, ranked exactly by `lexicon/learned.py` (APs, ranks, rank-list
  SHA-256s, MAPs, mean ranks, ties); `../tests/parity-lexicon.cjs` regenerates it in `lexicon_core.js` line for line,
  and `test_learned.py` and `../tests/all.cjs` run its `--check`. `traces_pages.py` (Phase 5) writes
  `traces/pages_v1.txt`, 1,326 lines: ten fixed sentences and three fixed BERT-style pairs through the reference (N_B
  and WordPiece on V0, map A, D6 ids and certification, exact H³ and H² points, decoding, bits, the letters that
  survive float64 storage, consecutive tokens' synset LCA, exact cosh and chart coordinates, X(5, q) vertices), the
  coupler on each pair's segments with its control, seven words' engram/1 keys, and 100 random words `Rng(8400 + i)`
  on the three X(5, q) graphs; `../tests/pages-lexicon.cjs` regenerates it with the page engine line for line, and
  `../tests/all.cjs` runs its `--check`. Each `--check` rebuilds in memory and compares bytes:
  exit 0 equal, 1 different, 2 skipped when the data it needs is not cached (the L6 trace needs none). Each file
  documents its format in its `#` header. Nothing in them decides a claim.
- **Fractional ties** (A10.17). `fractional_ties.py` computes the fractional-tie MAPs (A10.11's formula) that Phase 1
  (L5's arms on the mammal spanning subtree and the noun sample) and Phase 2 (L4(a)'s rank lists) left out, on the
  code and data those runs used, and writes them beside the published pessimistic values. It stops, writing nothing,
  unless every recomputed pessimistic MAP and mean rank equals the published exact rational (and, for L4(a), the
  rank-list and AP-list digests match). It repeats Phase 1's and 2's own draws (`Rng(1000)`, `Rng(2000 + i)`), ranks
  nothing of L6, records the commit and the SHA-256 of each code file it used, and decides nothing.

## Phase 4: L6 and L4(c)

`run_claims_phase4.py` runs the order of A10.14, and ran in it (the commits are listed in `../README.md`): the
self-test while building; the registered dry run on the solid.n.01 closure set, tuning at `e0477fb` (5,867 s) and
the measure step at `78c661d` (2,833 s), every dry verdict supported; registered tuning on the mammal closure set at
`a780bb5` (240 runs, 6,089 s); `--write-settings`, whose output Amendment 11 froze; and the decisive `--measure` at
`515a4a1` (3,051 s), which supported L6, all four parts, and L4(c). The decisions are under "Results" below.

```
python3 -B run_claims_phase4.py --selftest --out <dir>   # the whole pipeline on a synthetic DAG, unregistered seeds 80600+,
                                                         # 2 cells, 2 rates, 3 epochs (about 1 minute; decides nothing;
                                                         # writes only under <dir>, never under results/)
python3 -B run_claims_phase4.py --tune --dry             # dry tuning (A10.13, solid.n.01): results/dry/tuning.json, settings.json
                                                         # (5,867 s)
python3 -B run_claims_phase4.py --measure --dry          # the dry measured run: results/dry/claims-phase4.* (2,833 s)
python3 -B run_claims_phase4.py --tune                   # registered tuning: results/tuning.json, phase4-tuning-console.txt
                                                         # (6,089 s)
python3 -B run_claims_phase4.py --write-settings         # settings.json from tuning.json; prints its SHA-256 for the lr freeze
python3 -B run_claims_phase4.py --measure                # the decisive run of L6 and L4(c) (3,051 s)
node run_l6_node.cjs                                     # the Node re-evaluation of the 50 measured tables (about 2 minutes;
                                                         # reported, deciding nothing)
```

- **Rules.** `--workers W` (default 4): one single-threaded spawn process per job (the five thread variables are set
  to 1 before numpy is imported; the main process never imports numba). Registered `--tune` and `--measure` refuse
  uncommitted changes (their own outputs aside; a rename counts both its paths) in this system folder and in the
  reference folders of Hyperbolic Oracles and Engram Mind's Eye, whose `hpstep` and `engram` are imported in place,
  and a `sys.path` entry or working directory inside the repository outside those folders (run them from this
  folder); they check again, with HEAD, before each worker pool and before writing. `--allow-dirty` is refused
  outside a dry run. `--measure` also refuses unless the only paths changed since tuning's commit are
  `PREREGISTRATION.md`, `settings.json`, `results/tuning.json` and tuning's console, and the lr-freeze amendment holds
  `settings.json`'s SHA-256. Each step replays one run's draws with `hpstep.prng.Rng` and writes nothing if the
  states differ. P (`Rng(7)`, control 1) is computed only in registered `--measure`. `--selftest --out <dir>` refuses
  a `<dir>` inside the repository.
- **Resume.** Each finished job is a line of `runs.jsonl` in `~/.cache/hyperbolic-lexicon/phase4/<mode>/` (`HL_CACHE`
  overrides the root), with its float table, snapped text and per-query APs. A restart at the same HEAD reuses them;
  the record lists every start, and the console file is appended to.
- **Environments** (A10.4). Every job record holds the environment of the worker that ran it (Python, numpy, numba,
  llvmlite, libc, platform, numpy's SIMD features and dispatch targets, the CPU), and every start its own; the JSON
  gives each run an `environment_sha` and lists the environments once (`run_environments`). A job finished under
  another environment is still reused on a restart (the same run, A10.14), and the reuse is logged and counted
  (`environments_summary`).
- **Files.** `results/tuning.json` and `phase4-tuning-console.txt`; `settings.json`; `results/claims-phase4.json` and
  `.md`, `phase4-console.txt`, `lbench-phase4.txt` (every `LBENCH/1` record) and `l6-tables/` (gzipped snapped texts
  of the 100 measured and edge-shuffled tables, the float bytes of L4(c)'s 40, the exact arm's lines); the same names
  under `results/dry/`. The tuning tables (about 80 MB) stay in the cache.
- **Cost** on 4 workers here, as measured. One run is single-threaded: in the decisive run 45–350 s Lorentz and
  30–273 s Euclidean (d = 2 to 50; in tuning up to 358 s and 275 s). Registered tuning took 6,089 s (240 runs), dry
  tuning 5,867 s, the dry measure step 2,833 s, and the decisive measure step 3,051 s: 2,893 s in the pool of 153
  jobs (the 100 measured and edge-shuffled tables and the 50 floors, each built and evaluated in its worker, the
  replay and the two pre-flight retrains), 137 s for control 1 on 316 tables, 12 s for the 360 intervals.
- **The Node re-evaluation** (A10.11; reported, deciding nothing): `node run_l6_node.cjs` (about 2 minutes; 117 s in
  its run) checks the L6 trace, rebuilds S in Node and ranks the 50 committed measured snapped texts and the exact
  arm's lines with `lexicon_core.js` (`SnapArm`, `evaluateSnapped`, unchanged), comparing every exact MAP (p/q),
  LBENCH/1 MAP hash, mean rank, tie count and per-query AP with `results/claims-phase4.json`, into
  `results/l6-node.json` and `.md`. Every value was equal: 50 of 50 tables and the exact arm, 0 of 118,200 per-query
  APs different. Its runner was uncommitted when it ran, as the record says, and was committed with its results
  (`09a8afa`).
- **Registered steps repeat only from their commits.** `--measure` refuses unless the only paths changed since
  tuning's commit are the four A10.14 names, so a repeat of the decisive run starts from `515a4a1`.

## Stage 2: L12–L15 (in progress)

`run_claims_stage2.py` runs Amendment 13's order of work (A13.15). Amendment 13 is committed alone (`b3a5003`); the
code and its tests are being built (step 2); nothing has been scored on any Stage-2 set, and no registered seed has been
drawn.

```
python3 -B -I run_claims_stage2.py --selftest --out <dir> [--dry]   # the whole pipeline (time, tune, settings,
                                                         # decisive) on tests/stage2_synth.py's synthetic world, seeds
                                                         # 95200 + i, a 400-resample bootstrap (about 25 s on 2 workers;
                                                         # --dry: the dry run's shape, verbs and sealing); decides
                                                         # nothing, writes only under <dir>
python3 -B -I run_claims_stage2.py --dry                 # step 3, the dry run (A13.13): verbs, every seed + 3000; dry
                                                         # tuning, its settings, the dry decisive run: results/dry/, and
                                                         # every value on a human-rated set in the sealed cache file
python3 -B -I run_claims_stage2.py --time                # before step 5: two epochs per L14 cell on U_@ (seeds 95500 + i);
                                                         # projects the registered total and refuses above 11 h or the disk
python3 -B -I run_claims_stage2.py --tune                # step 5, registered tuning: HiT val only; results/tuning-stage2.json
python3 -B -I run_claims_stage2.py --write-settings      # settings-stage2.json; prints its SHA-256 for the lr freeze (step 6)
python3 -B -I run_claims_stage2.py --decisive            # step 7, the one decisive run of L12-L15
```

- **The order of work** (A13.15): this code and its tests on synthetic data, the dry data and seeds 95200 + i, then
  an adversarial review (seeds 95600 + i); the dry run on the committed code; the definitions amendment (the READINGs,
  the instance manifest's SHA-256, the GloVe counts, the dry diagnostics); `--time`; registered tuning on a clean tree;
  the lr-freeze amendment; the decisive run at its commit; the write-up.
- **Blind two-pass scoring** (A13.8). Pass 1 (the functions marked `@pass1`) reads only word, POS, MEN-tag and fold
  columns and HiT's names, and writes per (instance, arm, form, sense rule, table) a gzip TSV of tie-class codes
  keyed by row number, the SHA-256 of its 120-digit value stream and a side file of the values that took the 240-digit
  path or sit in a numerical tie. Pass 2 opens the gold, runs the label and TYPE count checks, selects BD-dir's True
  rows, reads each code file only after checking its SHA-256 and computes every metric, control and decision. F1
  (reported) reads one code file of HiT val and test together per measured table; the binary64 relabelling tails,
  |ΔRR|, Nickel & Kiela 2018's diagnostic and the labels' radius ranks, which A13 defines outside these files, are
  computed in pass 2 from the SHA-checked tables (READING stage2-runner-33, named for the definitions amendment).
- **Rules.** `--workers W` (1–4, default 4); training in a spawn pool (numba in the workers only), pass-1 scoring in a
  fork pool. Registered `--tune` and `--decisive` refuse an unclean tree (Phase 4's check, scope and repetitions), and
  refuse until an amendment after 13 holds the instance manifest's SHA-256; `--tune` also needs a `--time` record
  within 11 h and the disk; `--decisive` refuses unless only `PREREGISTRATION.md`, `settings-stage2.json`,
  `results/tuning-stage2.json` and tuning's console changed since tuning's commit and the lr-freeze amendment holds
  the settings' SHA-256, and it rebuilds the instance manifest from the pinned files and refuses another. The
  definitions amendment is the earliest amendment after 13 that holds the manifest's SHA-256; a later amendment may
  restate it. `--time`, `--dry`, `--tune` and `--decisive` parse fetched data and refuse unless Python runs with
  `-B -I` (A13.2); every start records the interpreter's flags. Before `--dry`, `--tune` and `--decisive` the disk
  pre-flight refuses a projection above the free space less 2 GB. The load average is recorded at every start and
  every 10 minutes. `--allow-dirty` is the dry run's only.
- **Resume.** Each finished job (a training run, or a pass-1 job with its code and side files) is a line of
  `runs.jsonl` in `~/.cache/hyperbolic-lexicon/stage2-run/<mode>/`; a restart at the same HEAD and code reuses the
  lines whose files still have their SHA-256s, and lists every start.
- **Files.** `results/stage2-time.json`; `results/tuning-stage2.json` and `stage2-tuning-console.txt`;
  `settings-stage2.json`; `results/claims-stage2.json` and `.md`, `stage2-console.txt`, `lbench-stage2.txt` (one
  `LBENCH/1` record per evaluated instance, arm, form, rule and table, in A13.14's 24-field layout with claim field
  `L12/1`–`L15/1` or `stage2/1`; `run_claims_stage2.parse_lbench` selects the layout by the claim field, and
  `l6.parse_lbench` still accepts `L6/1` only), `stage2-manifest.json` (the SHA-256 of every pass-1 code file, value
  stream and side file), `stage2-codes/` and `stage2-tables/` (each committed only if together at most 50 MB); the
  same under `results/dry/` without the sealed values, which go to `~/.cache/hyperbolic-lexicon/stage2/dry-sealed/
  values.json`. Every other code file, side file and table stays in the cache.
- **Tests:** `tests/test_stage2_runner.py` (the rules, LBENCH/1, the disk pre-flight and budget refusals, blindness by
  import inspection, a gold-reader spy and poisoned gold fields, the dry seal; slow: the self-test end to end in both
  shapes, its resume and its determinism, and the word-level counts and pair sets on the pinned files against the
  instance manifest).

## Results

| File | Holds |
| --- | --- |
| `results/claims.json` | The decisive run (2026-11-05, on the code at `88e63f7`, committed as `6af2a83`): every decision, case count, failure count, counterexample list, control and reported value, with exact rationals beside their floats |
| `results/claims.md` | The same, readable |
| `results/claims-console.txt` | The run's console output and timing |
| `results/l3f-python.txt` | The Python side of L3(f): the canonical point list's SHA-256 (`eb22bf00…`) and the 2,000 sampled nodes' words and exact H³ and H² points, for Phase 2 to compare against the browser core |
| `results/phase2-python.json`, `.md` | Phase 2, the reference's half (2026-11-05, on the code at `a1fe9a8`, committed as `648a6b6`): L1's record-list and id-stream digests per set and vocabulary, controls 2 and 3, control 1's reference side, the reported metrics and Hugging Face agreement; L4(a)'s rank-list digests and exact MAPs and mean ranks; L4(b)'s inversions, float ties and both controls, with per-query lists. No UD EWT text |
| `results/claims-phase2.json`, `.md` | Phase 2's comparisons and decisions from `run_claims_js.cjs`: parity, the environments (Node, Chromium, Python, their Unicode), L1 per cell, L3(f), L4(a) and L4(b), with counterexamples (none), controls and timings |
| `results/phase2-console.txt` | Both Phase 2 runs' console output and timing (Python 2 min 15 s, then Node and Chromium 6 min 52 s) |
| `results/claims-phase3.json`, `.md` | Phase 3's decisive run (2026-11-06, on the code at `6da04be`, committed as `865791f`): L8 per shard, mode and grower, L8(d), L9 per list with every proof and alteration counted and the exact weaves, L10 per class with the tamper places, L11 per shard and by step, every control, the readings of the runner, and the timings; counterexamples (none) |
| `results/phase3-console.txt` | The run's console output and timing (50 min 44 s) |
| `results/phase3-registry.json` | The key-registry snapshot L10 and L11 verified against (SHA-256 `36cbc21d…`): key ids, public JWKs, key vector and status. No private key |
| `results/tuning.json`, `results/phase4-tuning-console.txt` | Phase 4's registered tuning (2026-11-06, on the code at `a780bb5`, committed as `7c1806c`): 240 runs on the mammal closure set, each with its exact snapped closure MAP, float and snapped SHA-256s, generator state and diagnostics; the 24 diverged runs (all at rate 10); each cell's choice; the replay check; the console output (6,089 s). The tuning tables stay in the cache |
| `settings.json` (beside the runner) | The frozen rates of Amendment 11 (SHA-256 `058e1900…`), written by `--write-settings` from `results/tuning.json`: Lorentz 1 at every d; Euclidean 0.1 at d = 2, 3, 5, 1 at d = 10, 3 at d = 50 |
| `results/claims-phase4.json`, `.md` | Phase 4's decisive run (2026-11-06, on the code at `515a4a1`, committed as `b6f3b9d`): every measured, edge-shuffled and floor table with its exact MAPs (p/q) and diagnostics, the exact arm, the 360 intervals, controls 1–3 with control 1's diagnostics, L4(c) per table (the coarse snap, displacement, ties), the decisions with their reasons, prediction (a)'s gap, the reported values, the environment, the pre-flight and replay checks, the readings of the runner and the timings |
| `results/phase4-console.txt` | The decisive run's console output and timing (3,051 s) |
| `results/lbench-phase4.txt` | All 367 `LBENCH/1` records of the run, 216 of them tuning's (SHA-256 `2505bfd6…`) |
| `results/l6-tables/` | 141 files: the gzipped snapped texts of the 50 measured and 50 edge-shuffled tables, the float64 bytes of L4(c)'s 40, and the exact arm's lines |
| `results/l6-node.json`, `.md` | The Node re-evaluation (A10.11; 2026-11-06, `lexicon_core.js` as committed at `b6f3b9d`, committed as `09a8afa`; reported, deciding nothing): the L6 trace first, then every measured table's and the exact arm's exact MAPs, LBENCH/1 hashes, mean ranks, ties and per-query APs against the record; no difference |
| `results/fractional-ties.json`, `.md` | A10.17 (Phase 4, deciding nothing): the fractional-tie MAPs of Phase 1's L5 arms and Phase 2's L4(a) rank lists, beside the pessimistic MAPs those phases published, which every recomputed value equals; from `fractional_ties.py`, with the commit and code SHA-256s it ran on |
| `results/dry/` | The registered dry runs: Phase 1's on unregistered seeds and the verb forest, as rerun after the review fixes (commit `20c3320`), before Amendment 2; Phase 2's (`phase2-python.*`, `claims-phase2.*`, Amendment 4 item 7), every cell run, before Amendment 5; and Phase 3's last (`claims-phase3.*`, `phase3-console.txt`, `phase3-registry.json`, Amendment 7 item 8, committed as `25b48b3`), before Amendment 8; and Phase 4's on the solid.n.01 closure set (A10.13: `tuning.json`, `settings.json`, `phase4-tuning-console.txt`, committed as `78c661d`; `claims-phase4.*`, `phase4-console.txt`, `lbench-phase4.txt`, `l6-tables/`, committed as `a780bb5`), before registered tuning |

| Claim | Decision | Key numbers |
| --- | --- | --- |
| L2 | supported | 52.6% (77,520 of 147,305) of WordNet's lemma types share their engram/1 key; SHA-256-prefix control 0 collisions; Python and Node tables identical. The predicted 2–10% band was wrong |
| L3 | supported, Python side: (a)–(e) and (g) | 0 failures on all 82,115 noun synsets; all four controls fail; (f) was decided in Phase 2 (below) |
| L5 | supported | Noun graph-edge MAP H3 0.568, H2 0.590, F3 0.007, F3\* 0.500; every interval above 0 on mammals and nouns |
| L7 | supported | q = 13, 17, 29: walk = reduction, injectivity to r, Ramanujan (margins 0.2224, 0.1632, 0.0301), Hurwitz product halved = word quaternion |

Phase 2 (`results/claims-phase2.json`, `results/phase2-python.json`):

| Claim | Decision | Key numbers |
| --- | --- | --- |
| L1 | supported in all four cells (V0 and V1, in Node and Chromium) | 0 of 156,801 instances differ; every id-stream SHA-256 equal; control 1 (the platform's functions) differs on 725 of 20,520 stress cases in both runtimes; controls 2 and 3 fail. Reported: Hugging Face agrees on every gloss and EWT sentence, differs on 28 stress cases (V1) and 29 synthetic strings |
| L3(f) | supported, so L3 is supported in full | Node's canonical point list equals Python's (`eb22bf00…`); 2,000/2,000 sampled lines equal `results/l3f-python.txt` |
| L4(a) | supported | Every rank list and exact MAP and mean rank equal in Python and Node: 1,176 mammal queries and noun queries 0–199, H³ and H²; the mammals also in Chromium (reported) |
| L4(b) | supported (decided here) | 997 of 1,000 noun queries invert an exactly ordered adjacent pair in float64 (H³ 990, H² 993); Node reproduces the counts. Control 1 (float32): 1,137/1,176 mammal queries invert; control 2: 487 of 488 tied queries give a different AP |

Phase 3 (`results/claims-phase3.json`):

| Claim | Decision | Key numbers |
| --- | --- | --- |
| L8 | supported, for the JS grower and the Python port | 0 of 336 records (148 C0 and 20 synthetic shards, engrams off and on) differ from Owl Academy's own `growBiochain` in any of the fifteen fields; BioChain-AI's grower the same; both `verifyIntegrity`s accept every record, and `importBiochain` recreates every text; (d) identical in Python and JS (`addrTableRoot` `30b17bc3…`). Controls 1-3 show their weakness |
| L9 | supported | The manifest over the 148 `LPREP/1` hashes (root `f567700d…`) and lists of K = 1 to 1,001: every root and proof equal in JS and Python, every alteration detected, every wrong proof rejected; 148/148 exact weaves exact. Controls: the `shdccp/2` rule collides at K = 3, 7, 1,001; XOR misses swaps |
| L10 | supported | 50 clean and 450 tampered packages: 0 false accepts, 0 false rejects in JS and in Python, verdicts identical; Owl's `verifyIntegrity` accepts 50/50 of each of T1, T2, T8, T9; without the P1363-to-DER conversion Python accepts 0 of 126 signatures |
| L11 | supported, on packages grown with engrams off (Amendment 8) | Median 155.4 ms per full C0 shard, interval [154.2, 156.0], bar 250 ms; the step check holds 441/441. Amendment 8 fixed engrams off after dry runs had put the engrams-on median at 243.5-265.5 ms (decisive run, reported: 243.6 ms). Python 195.9 ms (reported) |

Phase 4 (`results/claims-phase4.json`):

| Claim | Decision | Key numbers |
| --- | --- | --- |
| L6(a) | supported | Lorentz − Euclidean closure AP: every interval above 0 in all five seeds at d = 2 (means +0.716 to +0.752) and d = 3 (+0.728 to +0.752). Closure MAP 0.88–0.91 against 0.16–0.17 (d = 2) and 0.95–0.97 against 0.22–0.23 (d = 3); the predicted gap of at least 0.2 holds (0.7256 and 0.7424) |
| L6(b) | supported | At d = 50 every interval lies entirely below 0 (about −0.032), which the rule counts as support: Euclidean is ahead, 0.99997 against Lorentz's 0.968 |
| L6(c) | supported, against its registered prediction (refuted) | Exact H³ graph-edge MAP 0.690653 against learned Lorentz d = 3's 0.458–0.477; every (exact − learned) interval's lower end at least 0.19. The prediction came from spike S3's rule, which assumed learned embeddings keep graph edges; trained on the closure, the Lorentz tables rank ancestors and descendants alike |
| L6(d) | supported | Learned Lorentz d = 3 closure MAP 0.950–0.971 against the exact tree's 0.305408; lower ends at least 0.63 |
| L4(c) | supported, so L4 is supported in full | Largest \|ΔMAP\| over the 40 tables 9.37 × 10^−6 (bar 0.001); largest snap displacement 1.565 × 10^−3. Reported: a coarse 2^−8 snap moves the Lorentz tables' closure MAP by 0.40–0.60 |

L6's controls: control 1 (label shuffle, P = `Rng(7)`, computed first in the decisive run) gives a largest
relabelled closure MAP of 0.018803 over 316 tables (the bar is 1/20); control 2 (edge-shuffled training) holds in all
50 cells and seeds, for closure and graph-edge; control 3's floors are reported, beside a random ranking's 0.014957
(closure) and 0.007320 (graph-edge). L6 is not void. Reported, deciding nothing: the exact arm's fractional-tie MAP
(graph-edge 0.7701 against the pessimistic 0.6907, closure 0.3305 against 0.3054); geoopt not run (above).

`../README.md` has the full tables, the commits in order, and what went against prediction or was disclosed.
