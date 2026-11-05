# Hyperbolic Lexicon · SHD-CCP integration and a staged hyperbolic BERT front end

**Status: Phase 1 done (the Python reference); Phase 2 (the browser core) is next.** Of the eleven claims registered in
`PREREGISTRATION.md`, four were decided by Phase 1's one decisive run: L2, L5 and L7 are supported, and L3 is
supported on its Python side (parts (a)–(e) and (g)). L3(f), L1 and L4(a, b) are decided in Phase 2, L8–L11 in
Phase 3, L6 and L4(c) in Phase 4. No learned model or encoder exists yet.

Open [`index.html`](index.html) for the hub: the system map, the explainer library, the roadmap, the claims ledger
with Phase 1's results, and the decisions. [`summary.html`](summary.html) is the whole analysis on one page.

## The question

What have we built, and what would SHD-CCP integration look like? How would a hyperbolic version of BERT-style
language pre-processing work for our 2D (H²) and 3D (H³) systems, and what are the alternatives? Could we grow
biochains of language pre-processing data as SHD-CCP chains, as BioChain-AI grows biochains? And which benchmarks would
help such a system develop?

## The answers in brief

1. **What we built is strong on exact geometry and integrity, and has nothing yet for language learning.**
   - *Have:* exact norm-5 quaternion addresses; an exact H³ tree to depth 28; hyperboloid tools; Merkle chains;
     the fence and guard; a Python-to-browser parity method.
   - *Missing (before this system):* no subword tokenizer, vocabulary, learned embeddings, encoder, gradients or
     language benchmarks existed in any of the four repositories.
   - *engram/1 is no token id:* it is letter-count parity (anagrams collide, numbers map to zero). Phase 1 measured
     it (L2): 52.6% of WordNet's lemma types share their key with another.
   - *PolyStep trains no encoder:* it is zeroth-order (48 parameters at most), and its "hyperbolic beats flat" claim
     C1 was refuted.
   - See `explainers/analysis.html`.
2. **SHD-CCP exists in three layers that disagree.** At least eight incompatible 64-bit layouts exist and every Form
   value is claimed, so integration means:
   - the Blackwell word only where we hand data to Owl Academy and BioChain-AI;
   - record kinds above the word;
   - golden vectors, and proposals instead of edits.
   The strongest link is mathematical: our tree's generators are the Lubotzky–Phillips–Sarnak p = 5 set, so SHD-CCP's
   planned X(5, q) overlay is a quotient of the tree our addresses already live on. See `explainers/shdccp.html`.
3. **A hyperbolic BERT is built in two stages.**
   - *Stage 1 is exact:* pinned Unicode normalisation; WordPiece; a training-free address for every WordNet synset;
     exact points in H³ and in a new exact H² tree; exact ranking.
   - *Stage 2 is the best-supported route in the literature:* a Euclidean encoder with the address as a hierarchy
     factor and a hyperbolic hierarchy head.
   - *Role of H² and H³:* they are far below language-model width, so they serve as factors, heads and views, not as
     the main embedding.
   - See `explainers/architecture.html`.
4. **Every alternative has a role:** main route, baseline, control, later, or rejected.
   - *Fully hyperbolic encoders:* need a GPU.
   - *Hyperbolic tokenization:* an open gap.
   - *Gradient-free training:* for heads only.
   - *engram/1 as an id:* rejected.
   - See `explainers/alternatives.html`.
5. **Language biochains: yes, as many 60 KB shards under an RFC 6962 manifest.** A single growing chain cannot work,
   because a whole lineage is capped at 60 KB. The design adds typed records, two privacy tiers, and a hardened,
   attested importer that closes what `verifyIntegrity` misses. See `explainers/biochains.html`.
6. **Benchmarks form a ladder.** Every hyperbolic claim gets a matched Euclidean control.

   | Stage | Benchmarks | Where it runs |
   | --- | --- | --- |
   | 0 | Determinism and the tokenizer | here |
   | 1 | WordNet hierarchy reconstruction | here |
   | 2 | Lexical semantics | here, on the network widened at the start of Phase 1 (the SimLex host is still blocked) |
   | 3 | BabyLM pretraining with BLiMP | here (BabyLM from Hugging Face; osf.io's file downloads are blocked), or a GPU |
   | 4 | GLUE and MTEB | needs a GPU |

   Three compute tracks (browser, CPU, GPU) share one tokenizer record, the data roots, the seeds and the metric code,
   so their results compare. See `explainers/benchmarks.html` and `explainers/tracks.html`.

## What Phase 0 measured (spikes S1–S7)

| Spike | Found |
| --- | --- |
| S1 | Float64 ranking of exact H³ tree points first inverts an exactly strict order at depth 10 (straight paths) and 12 (random words); exact decoding never failed. |
| S2 | A new exact H² tree with t = 11/13 (τ = ln 12) decodes every random word at every depth to 28, at 1.28–2.38× the bits of H³. |
| S3 | On WordNet's verb forest the exact tree's graph-edge MAP is 0.6309: the fixed branching of 5 forces "virtual letters" that put siblings as close as parents. This fixes L6(c)'s prediction as refuted. |
| S4 | Lexicon shards equal Owl Academy's own biochains field for field (126/126). Owl's `verifyIntegrity` accepts records with leaves and root deleted, a crystal changed, or chainId altered; RFC 6962 proofs stay at 10–14 hashes. |
| S5 | X(5, q) for q = 13, 17, 29: 2,184, 4,896 and 12,180 vertices, girths 8, 8, 9, Ramanujan; SHD-CCP's Hurwitz product, halved, equals our tree's quaternions. |
| S6 | Node and Chromium are at Unicode 17.0, Python at 15.1; a pinned 15.1 table reproduces Python on every code point; a 20,520-case stress set. |
| S7 | BioChain-AI's ATTEST/1 signatures cross between WebCrypto and Python only through a padded P1363 ↔ DER conversion; verification costs about 0.2 ms. |

## Phase 1: the Python reference and its decisive runs

Phase 1 built the exact reference in [`reference/`](reference/README.md) and decided the four claims registered for
it, each by its registered rule. [`explainers/reference.html`](explainers/reference.html) (Explainer 9) tells the
whole story; every number below is in [`reference/results/claims.json`](reference/results/claims.json).

### What was built

- **Text track.** N_B, the normaliser, on a pinned Unicode 15.1 table (`lexicon/unicode_tables.py`,
  `lexicon/normalise.py`); WordPiece, the id stream and the V0 "lex0" trainer (`lexicon/wordpiece.py`); L1's
  instance loaders (`lexicon/l1.py`); the WordNet reader (`lexicon/wordnet.py`).
- **Geometry track.** The L3 address rule and the 59/64-bit id codec (`address.py`); exact points in H³ (`h3tree.py`)
  and in the new exact H² tree (`h2exact.py`); the flat arms (`flat.py`); exact ranking and the metrics (`rank.py`);
  X(5, q) (`lps.py`).
- **Pins.** The Unicode 15.1 table (`golden/unicode_15_1_v1.json`, 142,624 bytes, SHA-256 `30bed6fb…`); V0 "lex0"
  (`golden/vocab_v0_lex0.txt`, 8,192 entries after 8,059 merges, SHA-256 `df227056…`, frozen); V1, bert-base-uncased
  at revision 86b5e09 (`vocab.txt` SHA-256 `07eced37…`, 30,522 entries, the file in the cache only), so L1's second
  cell is in force; the content and order of L1's four instance lists (117,659, 16,622, 20,520 and 2,000 strings).
  V0's alphabet is 64 ASCII code points, so a word with a non-ASCII letter is `[UNK]` under V0.
- **Traces** for the browser core (`reference/traces/`), on seeds 8000 + i, which no claim uses; the claims runner
  `run_claims.py`, with its dry run on the verb forest (`reference/results/dry/`).

### How it was checked

Two adversarial reviews ran before the decisive run, one per track: four reviewers each, two skeptics per finding,
reimplementing independently on unregistered data. An independent naive trainer rebuilt V0 byte for byte; an
independent N_B oracle agreed on every L1 instance and on 6.7 million code-point contexts; independent Fraction
trees, flat arms, rankings, id codec and L7 agreed without a mismatch. The findings they confirmed were gaps in tests
and pins (a trace check that skipped the normaliser trace when V1 was not cached, an incomplete guard against
platform Unicode calls, a decoder test that did not test off-tree points, a mislabelled L7(e) control), all fixed
before Amendment 2.

### The commits, in order

| Commit | What |
| --- | --- |
| `29efe8a` | Amendment 1: the open definitions fixed before any code (N_B's steps, the V0 trainer, map A, ties and rank lists, the readings of L2, L3, L5 and L7, the dry-run and trace seeds) |
| `d50a43f` | The text track, with its pins; V0 frozen, V1 pinned |
| `e51a866` | The geometry track and `run_claims.py`, after its dry run |
| `8d845c7` | Fixes from the geometry review |
| `20c3320` | Fixes from the text review, and a fresh dry run |
| `88e63f7` | Amendment 2: a disclosure, an erratum, the readings fixed in code, the two reviews |
| `6af2a83` | The decisive results: one run of `run_claims.py` on the code at `88e63f7`, 5 minutes |

### The decisions

All four are supported, and every control failed, as required (a control that passes voids its claim).

| Claim | Decision | Key numbers |
| --- | --- | --- |
| L2 | supported | 77,520 of the 147,305 lemma types after N_B (147,306 before), 52.6%, share their engram/1 key with another (the rule needs ≥ 1%). 92,978 key classes, 23,193 of size ≥ 2; the largest, 371 types, is the zero key, which holds all 131 all-digit types; 6,666 anagram classes. Control: a SHA-256-prefix key gives 0 collisions. Python and Node key tables are identical. Reported: 52.2% of V0's entries share a key. |
| L3 (Python side) | supported for (a)–(e) and (g); (f) is Phase 2 | All 82,115 noun synsets, 0 failures. Words up to 36 letters, mean 18.37; 90.88% fit id59, 95.66% id64. At most 184/102 bits (numerator/denominator) per coordinate in H³, 252/142 in H². Controls: the zero-letter rule makes 11,978 nodes share a word, truncation 74,220; float placement and decoding fail on 67,989 of the 71,454 words longer than 12 letters; H² at t = 3/4 fails exact decoding on 19,796. The canonical point list (SHA-256 `eb22bf00…`) and 2,000 sampled lines wait in `reference/results/` for Phase 2. |
| L5 | supported | Graph-edge MAP, mammals (1,176 nodes) / nouns (1,000 queries against 82,115): H3 0.691 / 0.568, H2 0.719 / 0.590, F3 0.110 / 0.007, F2 0.042 / 0.002, F3\* 0.642 / 0.500, F2\* 0.408 / 0.319. All four intervals lie above 0 on both sets; the smallest is H3 − F3\* on mammals, 0.049 [0.042, 0.055] (nouns 0.068 [0.062, 0.074]). Controls: S3 (shuffled words) 0.019 / 0.0005, K3 (content hash) 0.007 / 0.0001. |
| L7 | supported | q = 13, 17, 29: 2,184 / 4,896 / 12,180 vertices, girths 8, 8, 9 (r = 3, 3, 4); walk = reduction on 10,000 random words and the 1,182 mammal addresses; 187, 187, 937 short words on distinct vertices; largest nontrivial \|λ\| 4.2497, 4.3089, 4.4420 (margins to 2√5: 0.2224, 0.1632, 0.0301); SHD-CCP's Hurwitz product, halved, equals the word quaternion. Controls: ι = 2 breaks the walk on 10,867–10,879 words per q; a 4-generator subset is not 6-regular; the doubled product not divided by 2^L differs on every word tested. |

What went against prediction, and what was disclosed:
- **L2's predicted band was wrong.** The registration predicted a share of 2–10%, from anagrams, words in which every
  letter appears an even number of times, and numerals. Keeping only the parity of each letter's count merges far
  more: 52.6%. The decision needs ≥ 1%, so the miss does not change it.
- **L5 in context.** The exact tree's noun graph-edge MAP (0.590 in H², 0.568 in H³) falls short of Sala et al.'s 2-d
  combinatorial 0.989, as registered; the expected cause, virtual letters that put siblings as close as parents, was
  measured on verbs (spike S3), not on the nouns. Closure MAP is much lower (nouns: H³ 0.158, H² 0.157). The margin
  over F3\* is small, but its interval lies clearly above 0. H² scores slightly above H³ on graph-edge MAP on both sets.
- **Amendment 2's disclosure.** While the geometry modules were being written, a builder's timing script ran L3's
  certify and prefix checks over all the noun words. Its outcome was not looked at, nothing was changed after it,
  and the decisive run recomputed both.
- **Amendment 2's erratum.** google-research/bert drops only the Cc and Cf categories; Hugging Face's copy drops
  every C category. The rule in force is unchanged: Cc, Cf and Co are dropped, and Cn fails closed.

### How to run the reference

From `Pages/Hyperbolic Lexicon/reference/`, with the data fetched once (below):

```
python3 -B -m pytest -q -p no:cacheprovider            # the fast suite (103 tests, under a minute)
python3 -B -m pytest -q -p no:cacheprovider -m slow    # the slow full-corpus checks
python3 -B golden/make_unicode_v1.py --check           # each pin rebuilt or re-read and compared
python3 -B golden/make_vocab_v0.py --check
python3 -B golden/make_vocab_v1.py --check
python3 -B golden/make_l1_instances_v1.py --check
python3 -B run_claims.py --dry                         # the registered dry run, into results/dry/
python3 -B run_claims.py                               # L2, L3, L5, L7 into results/ (about 5 minutes)
python3 -B traces_text.py --check                      # the normaliser and WordPiece traces
python3 -B traces_geometry.py --check                  # the address, point and rank traces
python3 -B traces_geometry.py                          # rewrites the address, point and rank traces
```

`run_claims.py` needs the WordNet archive in the cache, numpy, Node (L2's Node table) and an SHD-CCP checkout beside
this repository (L7(e), imported read-only). [`reference/README.md`](reference/README.md) lists every module, pin
and results file.

### What is next

Phase 2: `lexicon_core.js`, the browser core, on the shared cores unchanged, reproducing the traces line for line;
then L1 (byte identity in Python, Node and Chromium, for V0 and V1), L3(f) (Python against JS, by the canonical
point list's SHA-256 and the 2,000 sampled lines) and L4(a, b). L8–L11 follow in Phase 3, L6 and L4(c) in Phase 4.

## Roadmap

| Phase | Delivers | Where |
| --- | --- | --- |
| 0 · Analysis | This folder: pins, spikes S1–S7, `PREREGISTRATION.md` (L1–L11, D1–D12), eight explainers, proposals, hub and summary | here · **done** |
| 1 · Python reference | N_B, WordPiece with V0 and V1, WordNet, addresses, the H² tree, exact ranking, flat arms, LPS, traces; Amendments 1 and 2; two reviews; a dry run, then one decisive run: L2, L3 (Python side), L5, L7 supported | here · **done** |
| 2 · Browser core | `lexicon_core.js` at line-for-line trace parity; L1, L3(f), L4(a, b) in Node and Chromium | here · next |
| 3 · Records and biochains | Shards, records, RFC 6962 manifests, the exact weave, the hardened importer, golden vectors; L8–L11 | here |
| 4 · Learned embeddings | The numpy trainer; tuning amendment; L6 and L4(c); Stage-2 lexical claims by amendment | here; Stage 2 on the network widened in Phase 1 |
| 5 · The 2D and 3D pages | `lexicon-2d.html`, `lexicon-3d.html`, shard panel, Engram import; then the Stage-1 gate, reviewed before any encoder code | here |
| 6 · CPU encoder | 1–10M parameters; claims L12–L15 by amendment; BabyLM strict-small | here (BabyLM from Hugging Face; osf.io's file downloads are blocked), or your machine |
| 7 · GPU track | BERT-mini/small, BabyLM 100M, GLUE, HiT | your hardware |
| 8 · Integration | engram/2 in Engram Mind's Eye; proposals delivered | here |

## Decisions

| # | Decision |
| --- | --- |
| D1 | A new folder that loads the shared cores unchanged by relative path |
| D2 | Exact first; learning in float64; learned tables stored as dyadic snaps |
| D3 | The octahedral H³ tree is the primary exact store; a new exact H² tree (t = 11/13) serves the 2D system; the float H² tree only draws |
| D4 | Token id, address and engram are separate; engram/1 is a compatibility checksum; V0 decides L1, and V1 (pinned in Phase 1) is its second cell |
| D5 | Normalisation on pinned Unicode 15.1 tables, failing closed; N1 is the fallback |
| D6 | The L3 address rule and the bijective 59/64-bit id |
| D7 | The Blackwell word only at the bridge; record kinds above the word |
| D8 | Shards of at most 60,000 bytes in unmodified `shdccp/2`; RFC 6962 manifests; two tiers |
| D9 | Authorities: the Python reference (exact claims); Owl's and BioChain's JavaScript (compatibility); the numpy trainer (embeddings) |
| D10 | The three tracks share the tokenizer record, data roots, generator, metric code, budgets and receipts |
| D11 | No model code before its claims are registered; PolyStep only for small heads |
| D12 | The other repositories are read only; their Python runs as `python3 -B -I` |

Open choices with defaults:
- **Network access:** widened at the start of Phase 1. huggingface.co (with its large-file store), the osf.io API,
  zenodo.org, arxiv.org and aclanthology.org are reachable, which let V1 be pinned. osf.io's file downloads still
  redirect to a blocked object store; BabyLM is also on Hugging Face.
- **GPU track:** on your own hardware or a rented GPU, from Phase 7.
- **Kernel Form ID:** 0xA.
- **Publishing:** no shards to Firestore this round.
- **Proposals:** sent after Phase 3.

## Scope

- **What Phase 0 shows.** It analyses, measures and registers. It shows nothing about whether hyperbolic geometry
  helps a language model.
- **What Phase 1 shows.** In Python, on WordNet 3.0: engram/1 cannot be a token id (L2); every noun synset has an
  exact, invertible, certified address and exact points in H³ and H² (L3, Python side); the exact tree reconstructs
  the noun hierarchy better than the same construction at curvature 0 (L5); and the address, the H³ point and the
  X(5, q) vertex are one tree read three ways (L7). It shows nothing yet about other engines (Phase 2), about
  learned embeddings, or about a language model.
- **What Hyperbolic Oracles already found.** Its C1 ("hyperbolic beats flat" for PolyStep optimisation) was refuted.
  The literature finds clear gains only on explicit hierarchies, and modest or none on general NLP.
- **What this system bets on.** Representation of hierarchies in low dimensions, and certification: exactness,
  invertibility, and results identical across engines. Encoder-level gains are predicted small or null at this scale.
- **What one address means.** One address per synset is one sense, without context. Most `##` pieces have no synset
  and get orthographic addresses.
- **What exactness costs.** Exactness moves the precision cost of deep trees into BigInt (S1: ~139 bits per
  coordinate at depth 28); it does not remove it.

## Files

| Path | Holds |
| --- | --- |
| `index.html` | The hub |
| `summary.html` | The analysis on one page (also the shareable page) |
| `PREREGISTRATION.md` | L1–L11, D1–D12, common rules, shared instances |
| `explainers/` | 1 analysis · 2 shdccp · 3 architecture · 4 biochains · 5 alternatives · 6 tracks · 7 benchmarks · 8 evidence · 9 reference |
| `assets/hl.css`, `assets/hl-map.js` | Shared style; the system map (Hyperbolic Oracles' renderer, renamed) |
| `reference/` | The Python reference (Phase 1): pins (`golden/`), modules (`lexicon/`), tests, traces, `run_claims.py` and its results; see `reference/README.md` |
| `spikes/` | S1–S7 with captured outputs, and the L1 stress set |
| `proposals/` | Documents for SHD-CCP, BioChain-AI and Owl Academy, never applied; the kernel check |
| `tests/` | `links.cjs`, `spikes.cjs`, `all.cjs` |

## How to check

```
node "Pages/Hyperbolic Lexicon/tests/all.cjs"
```

It runs:
- the shared cores' checks and Engram's parity and bridges;
- this folder's links and spike reruns;
- the site bar;
- the WordNet and EWT pins;
- the Python reference: its fast pytest suite, the four pin checks (Unicode 15.1, V0 retrained, V1, the L1
  instance lists) and both trace checks;
- the kernel check. Checks are reported as skipped, never passed, without the data cache or an SHD-CCP checkout.

It does not run `run_claims.py` or the slow tests; see "How to run the reference" above and `reference/README.md`.

Fetch the data once:

```
node "Pages/Hyperbolic Lexicon/reference/golden/make_wordnet_v1.cjs"
node "Pages/Hyperbolic Lexicon/reference/golden/make_ewt_v1.cjs"
python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_vocab_v1.py"
```

The third fetches V1 at its pinned revision into the same cache.
