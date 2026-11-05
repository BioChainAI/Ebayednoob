# Hyperbolic Lexicon · Python reference

Phase 1 built the reference, after `../PREREGISTRATION.md` was committed and after Amendment 1 fixed the open
definitions, before any code. As in Engram Mind's Eye, the runner was committed after its dry run on unregistered
seeds and before any decisive run; Amendment 2 followed two adversarial reviews; then `run_claims.py` ran once on the
code at commit `88e63f7`. It decided L2, L3 (the Python side), L5 and L7, all supported, every control failing as
required. The browser core (`lexicon_core.js`, Phase 2) comes next. Explainer 9,
[`../explainers/reference.html`](../explainers/reference.html), tells the whole story.

## The authority rule

- **Exact stages:** the Python reference decides the claims for the exact stages (normaliser, tokenizer, ids, addresses,
  exact points, exact ranking and metrics, the LPS overlay, records and manifests). The browser core
  (`lexicon_core.js`, Phase 2) must reproduce its traces line for line.
- **Compatibility with Owl Academy and BioChain-AI:** their own JavaScript is the authority (claim L8), run
  unchanged from their checkouts.
- **Learned embeddings (Phase 4):** a numpy float64 trainer is the authority. geoopt is a reported cross-check if
  torch is installed.

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

Every check exits 0 on a match, 1 on a mismatch and 2 "skipped" when its data is not cached. Fetch the data once:

```
node "Pages/Hyperbolic Lexicon/reference/golden/make_wordnet_v1.cjs"
node "Pages/Hyperbolic Lexicon/reference/golden/make_ewt_v1.cjs"
python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_vocab_v1.py"
```

## Modules

Built in Phase 1, in `lexicon/`:

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

Still planned:

| Module | Phase | Holds |
| --- | --- | --- |
| `lexicon/chain.py`, `manifest.py`, `records.py`, `attest.py` | 3 | The synchronous shard grower (with the JavaScript codec's quirks), RFC 6962 manifests, LVOCAB/LADDR/LPREP/LCORPUS/LGROW/LBENCH, ATTEST/1 |
| `lexicon/embed.py` | 4 | Lorentz and Euclidean static embeddings in numpy float64 |

The exact modules of Hyperbolic Oracles (`hpstep.prng`, `hpstep.problems`, `hpstep.decode3d`) and of Engram Mind's
Eye (`engram.ttmpt`, `engram.address`) are imported in place, unchanged, from their reference folders.
`js_engram_keys.cjs` is L2's Node half: the engram/1 key of each type from `ttmpt_core_v1.js`, loaded unchanged.

## How to run

From this folder (`Pages/Hyperbolic Lexicon/reference/`), with the data cached:

```
python3 -B -m pytest -q -p no:cacheprovider            # the fast suite (123 tests, about a minute)
python3 -B -m pytest -q -p no:cacheprovider -m slow    # only the 5 slow checks (full corpora; the Phase 2 dry run)
python3 -B run_claims.py --dry                         # the registered dry run (Amendment 1, item 10) into results/dry/
python3 -B run_claims.py                               # the Phase 1 claims L2, L3, L5, L7 into results/ (about 5 minutes)
python3 -B run_claims.py L3 L7                         # only these claims (results/claims-L3-L7.json and .md)
python3 -B run_claims.py --phase2 --dry                # Phase 2's dry run (Amendment 4 item 7) into results/dry/phase2-python.json
python3 -B run_claims.py --phase2                      # the reference's half of L1 and L4 into results/phase2-python.json;
                                                       # per-instance lists in ~/.cache/hyperbolic-lexicon/phase2/ (outside git)
python3 -B traces_text.py --check                      # rebuild the normaliser and WordPiece traces and compare
python3 -B traces_geometry.py --check                  # rebuild the address, point and rank traces and compare
python3 -B traces_geometry.py                          # rewrite the address, point and rank traces
```

- **Tests.** `pytest.ini` deselects the slow tests unless `-m` selects them (`-m "slow or not slow"` runs both).
  Tests that need the WordNet archive skip without it.
- **The runner** needs the WordNet archive in the cache, numpy, Node (L2's Node table) and an SHD-CCP checkout beside
  this repository (L7(e), imported read-only). It counts every case, keeps the first failures of each part as
  counterexamples, and runs every control; an exact claim whose control passes is void. A dry run moves every seed
  up by 3000 and uses the verb forest and the repository Markdown in place of the registered instances.
- **Phase 2** (`--phase2`, then `node run_claims_js.cjs`): V1 is pinned, so L1's V1 cells are in force and the
  decisive run refuses unless both runners have V1 (a dry run goes on without it, and its L1 is then not supported).
  UD EWT text is not committed (L1 Data): for set (b) the JSON keeps only indices, offsets, lengths and SHA-256s of
  its examples and counterexamples; the text goes to the cache beside the per-instance records.
- **Traces** use seeds 8000 + i, which no claim uses. `traces_text.py` writes `traces/normalise_v1.txt` and
  `traces/wordpiece_v1.txt` (with V1 lines when V1 is cached); `traces_geometry.py` writes
  `traces/address_v1.txt`, `traces/points_v1.txt` and `traces/rank_v1.txt`. Both `--check`s rebuild in memory and
  compare bytes: exit 0 equal, 1 different, 2 skipped when the data they need is not cached. Each file
  documents its format in its `#` header. Nothing in them decides a claim.

## Results

| File | Holds |
| --- | --- |
| `results/claims.json` | The decisive run (2026-11-05, on the code at `88e63f7`, committed as `6af2a83`): every decision, case count, failure count, counterexample list, control and reported value, with exact rationals beside their floats |
| `results/claims.md` | The same, readable |
| `results/claims-console.txt` | The run's console output and timing |
| `results/l3f-python.txt` | The Python side of L3(f): the canonical point list's SHA-256 (`eb22bf00…`) and the 2,000 sampled nodes' words and exact H³ and H² points, for Phase 2 to compare against the browser core |
| `results/dry/` | The registered dry run on unregistered seeds and the verb forest, as rerun after the review fixes (commit `20c3320`), before Amendment 2 |

| Claim | Decision | Key numbers |
| --- | --- | --- |
| L2 | supported | 52.6% (77,520 of 147,305) of WordNet's lemma types share their engram/1 key; SHA-256-prefix control 0 collisions; Python and Node tables identical. The predicted 2–10% band was wrong |
| L3 | supported, Python side: (a)–(e) and (g) | 0 failures on all 82,115 noun synsets; all four controls fail; (f) is Phase 2 |
| L5 | supported | Noun graph-edge MAP H3 0.568, H2 0.590, F3 0.007, F3\* 0.500; every interval above 0 on mammals and nouns |
| L7 | supported | q = 13, 17, 29: walk = reduction, injectivity to r, Ramanujan (margins 0.2224, 0.1632, 0.0301), Hurwitz product halved = word quaternion |

`../README.md` has the full table, the commits in order and what went against prediction.
