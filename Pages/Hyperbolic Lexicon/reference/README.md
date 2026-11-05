# Hyperbolic Lexicon · Python reference

Phase 0 holds only the pins. The reference itself is written in Phase 1, after `../PREREGISTRATION.md` was committed,
as Engram Mind's Eye's was: runners are committed after dry runs on unregistered seeds and before any decisive run.

## The authority rule

- **Exact stages:** the Python reference decides the claims for the exact stages (normaliser, tokenizer, ids, addresses,
  exact points, exact ranking and metrics, the LPS overlay, records and manifests). The browser core
  (`lexicon_core.js`, Phase 2) must reproduce its traces line for line.
- **Compatibility with Owl Academy and BioChain-AI:** their own JavaScript is the authority (claim L8), run
  unchanged from their checkouts.
- **Learned embeddings (Phase 4):** a numpy float64 trainer is the authority. geoopt is a reported cross-check if
  torch is installed.

## Pins (Phase 0)

| File | Pins |
| --- | --- |
| `golden/wordnet_v1.cjs` | Reader for nltk_data's `wordnet.zip` (WordNet 3.0) with Node alone; the archive's SHA-256 (`cbda5ea6…`) and size |
| `golden/make_wordnet_v1.cjs`, `golden/wordnet_v1.meta.json`, `golden/LICENSE-WORDNET.txt` | Fetches the archive once into `~/.cache/hyperbolic-lexicon` (outside git) and records every file's hash plus the counts the claims use. `--check` recomputes. |
| `golden/make_ewt_v1.cjs`, `golden/ewt_v1.meta.json` | UD English EWT at commit 4a4d77f (CC BY-SA 4.0): file hashes and sentence counts, no text. `--check` recomputes. |

```
node "Pages/Hyperbolic Lexicon/reference/golden/make_wordnet_v1.cjs" --check
node "Pages/Hyperbolic Lexicon/reference/golden/make_ewt_v1.cjs" --check
```

Without the cache, both checks report "skipped" and exit 2. Run them once without `--check` to fetch the data.

## Planned modules (Phase 1 onward)

| Module | Phase | Holds |
| --- | --- | --- |
| `lexicon/unicode_tables.py` | 1 | Unicode 15.1 tables exported from `unicodedata` and pinned by SHA-256 (`make_unicode_v1.py --check`) |
| `lexicon/normalise.py` | 1 | N_B: BERT BasicTokenizer rules on the pinned tables, failing closed on unassigned code points; N1 as the fallback |
| `lexicon/wordpiece.py` | 1 | Greedy longest-match-first WordPiece; the V0 "lex0" trainer (8,192 entries; algorithm fixed in Amendment 1) |
| `lexicon/wordnet.py` | 1 | The same reader as `golden/wordnet_v1.cjs`: synsets, the spanning forest, the closure, the mammal sets, C0 |
| `lexicon/address.py` | 1 | The L3 rule, map A for tokens, and the bijective 59/64-bit id codec |
| `lexicon/h2exact.py` | 1 | The exact H² tree (t = 11/13) |
| `lexicon/rank.py` | 1 | Exact Lorentz ranking, MAP and mean rank with pessimistic ties, bootstrap |
| `lexicon/flat.py` | 1 | The curvature-0 arms F and F* |
| `lexicon/lps.py` | 1 | X(5, q) for q ∈ {13, 17, 29} |
| `lexicon/chain.py`, `manifest.py`, `records.py`, `attest.py` | 3 | The synchronous shard grower (with the JavaScript codec's quirks), RFC 6962 manifests, LVOCAB/LADDR/LPREP/LCORPUS/LGROW/LBENCH, ATTEST/1 |
| `lexicon/embed.py` | 4 | Lorentz and Euclidean static embeddings in numpy float64 |

The exact modules of Hyperbolic Oracles (`hpstep.exact`, `hpstep.decode3d`, `hpstep.prng`, `hpstep.fence`) and of
Engram Mind's Eye (`engram.ttmpt`, `engram.address`) are imported in place, unchanged.
