# Hyperbolic Lexicon · SHD-CCP integration and a staged hyperbolic BERT front end

**Status: Phase 3 done (records and biochains); Phase 4 (learned embeddings) is next.** Of the eleven claims
registered in `PREREGISTRATION.md`, Phase 1's one decisive run supported L2, L5 and L7, and L3 on its Python side
(parts (a)–(e) and (g)). Phase 2's one decisive run supported L1, L3(f), which completes L3, and L4(a) and (b).
Phase 3's one decisive run supported L8 (for the JS grower and for the Python port), L9, L10 and L11. L11 was decided
on packages grown with engrams off, a reading Amendment 8 fixed before the run but after dry runs had put the
engrams-on median near the 250 ms bar (below). So ten claims are supported: nine in full, and L4 in its decided parts
(a) and (b). L4(c) and L6 are still open, to be decided in Phase 4. No learned model or encoder exists yet.

Open [`index.html`](index.html) for the hub: the system map, the explainer library, the roadmap, the claims ledger
with the results of Phases 1, 2 and 3, and the decisions. [`summary.html`](summary.html) is the whole analysis on one page.

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
   attested importer that closes what `verifyIntegrity` misses. See `explainers/biochains.html`. Phase 3 built it,
   and its one decisive run supported L8–L11; the Phase 3 section below has the numbers and Amendment 8's
   disclosure, and `explainers/chains.html` (Explainer 11) the whole story.
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
| L3 (Python side) | supported for (a)–(e) and (g); (f) was decided in Phase 2 (supported, below) | All 82,115 noun synsets, 0 failures. Words up to 36 letters, mean 18.37; 90.88% fit id59, 95.66% id64. At most 184/102 bits (numerator/denominator) per coordinate in H³, 252/142 in H². Controls: the zero-letter rule makes 11,978 nodes share a word, truncation 74,220; float placement and decoding fail on 67,989 of the 71,454 words longer than 12 letters; H² at t = 3/4 fails exact decoding on 19,796. The canonical point list (SHA-256 `eb22bf00…`) and 2,000 sampled lines were kept in `reference/results/` for Phase 2, which found Node's equal. |
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
python3 -B -m pytest -q -p no:cacheprovider            # the fast suite (189 tests, about a minute)
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

## Phase 2: the browser core and its decisive runs

Phase 2 built `lexicon_core.js`, the browser core, and decided the claims registered for it, each by its registered
rule. [`explainers/browser-core.html`](explainers/browser-core.html) (Explainer 10) tells the whole story; every
number below is in [`reference/results/claims-phase2.json`](reference/results/claims-phase2.json) (the comparisons
and decisions) and [`reference/results/phase2-python.json`](reference/results/phase2-python.json) (the reference's
side).

### What was built

- **The browser core.** `lexicon_core.js` (UMD, `lexicon-browser-1`), on `orbital_core.js`, `hyperbolic_core.js` and
  `decoder3d.js` loaded unchanged by relative path.
  - *Text half,* a line-by-line twin of `normalise.py` and `wordpiece.py`: a strict UTF-8 decoder, N_B on the pinned
    Unicode 15.1 table alone, WordPiece, LEB128, the id stream and L1's record. A guard forbids the platform's
    Unicode calls; the one exception is `platformNormalise`, L1's control 1.
  - *Geometry half,* the twin of `address.py`, `h3tree.py`, `h2exact.py`, `flat.py` and `rank.py`: the L3 rule and
    its controls, `certifyWord`, the D6 id codec, map A, exact H³ points (`decoder3d.js` `pointExact`, and integer
    frames over 7^n), the exact H² tree with exact decoding, the canonical point list, rank lists with pessimistic
    AP, MAP and mean rank as exact rationals, and L4(b)'s float64 keys and inversions.
  - A table or vocabulary is refused unless its SHA-256 and size are the pinned ones.
- **Data for the pages.** `data/unicode_15_1_v1.js` and `data/vocab_v0_lex0.js`: the pinned table and V0 as script
  files, so a page reaches them without fetch (written and `--check`ed by `reference/golden/make_js_data_v1.cjs`).
- **Parity.** `tests/parity-lexicon.cjs` (also run by `tests/all.cjs`) checks 18,667 lines:
  - 18,578 lines regenerate the five Phase 1 traces (the normaliser, WordPiece with V0 and V1, the addresses, the
    points and the rank lists);
  - 89 more check the pins, the data files, the strict decoder against a Table 3-7 scanner, the reference tests'
    hand-checked cases, the guard (13 planted lines, each caught by its rule, at least one per rule) and the
    geometry tests.
- **The runners.**
  - *The reference's half:* `run_claims.py --phase2`, with `reference/lexicon/phase2.py`. It writes L1's
    per-instance records and digests, the reference side of control 1, controls 2 and 3, the Hugging Face agreement,
    L4(a)'s rank lists, and L4(b)'s float rankings with both controls.
  - *The JavaScript half:* `reference/run_claims_js.cjs`. It runs parity first and loads L1's instance lists with
    `reference/golden/l1_instances_v1.cjs`, checked against their pins. It then runs Node, and Chromium through
    `tests/l1-harness.html` (a minimal page served from the repository root, never opened by hand), and makes the
    decisions of Amendment 4.

### How it was checked

- **Before any code.** Amendment 4 fixed how the three engines are run and compared.
- **The dry run.** The runners were committed after it (Amendment 4 item 7, `reference/results/dry/`), on unregistered
  seeds, the repository Markdown and the verb forest.
- **The review.** Three reviewers, with two skeptics per finding, probed the core and the runners independently on
  unregistered data. They found no defect in N_B, WordPiece or the geometry. They confirmed three gaps, all fixed
  before Amendment 5:
  - the guard missed a call made through a computed name;
  - L1 could be decided without its V1 cells;
  - UD EWT text could reach the committed JSON.
- **Amendment 5,** before any decisive run, recorded the disclosures, the readings fixed in code, the dry run's
  environment and the review.

### The commits, in order

| Commit | What |
| --- | --- |
| `cda6d9a` | Amendment 4: the engines and how they are compared, before any code (L1's record and controls, L3(f)'s words and points, L4(a)'s rank lists, L4(b)'s float64 ranking and its controls, the dry runs, parity first) |
| `09e282d` | The browser core, the data files, the parity test (18,667/18,667 lines in Node; the commit reports the same in Chromium), the two runners and their dry run, with the review's fixes |
| `a1fe9a8` | Amendment 5: the disclosures, the readings fixed in code, the environment and the review, before any decisive run |
| `648a6b6` | The decisive results: one run on the code at `a1fe9a8`, `run_claims.py --phase2` (2 min 15 s), then `run_claims_js.cjs` in Node and Chromium (6 min 52 s) |
| `5e1681c` | The gaps blocked hosts had left, closed: the Unicode 15.1 table equals the official UCD 15.1.0 files in every field (`check_ucd_v1.py`); 34 literature numbers re-read in their primary sources (28 confirmed, 5 corrected, 1 not found in its cited paper) |
| `2f89ac1`, `445a2e1` | Amendment 6: L6's protocol is this project's own, after Nickel and Kiela's paper and their released script (it matches neither, and its 1,000 epochs are in neither); unchanged, and L6 has not run |

### The decisions

The engines were Python 3.13.18 (unicodedata 15.1.0), Node 22.23.4 (ICU 78.3, Unicode 17.0) and Chromium
153.0.8010.12, through Playwright 1.63.0. All four parts are supported, and every control failed, as required.

| Claim | Decision | Key numbers |
| --- | --- | --- |
| L1 | supported in all four cells (V0 and V1, each in Node and in Chromium) | 156,801 instances per cell: (a) 117,659 glosses, (b) 16,622 UD EWT sentences, (c) 20,520 stress cases, (d) 2,000 synthetic strings. None differs in normalised bytes, pieces, ids or offsets, and every id-stream SHA-256 is equal. Controls: the platform's `toLowerCase`, NFD and `\p{Mn}` removal (spike S6's normaliser) differs from the reference on 725 of the 20,520 stress cases in Node and in Chromium alike; shortest-match-first WordPiece differs on 117,659 of 117,659 glosses; N_B without accent stripping on 0 glosses and 7 of 16,622 EWT sentences. Reported: Hugging Face `tokenizers` 0.23.3 agrees on every gloss and EWT sentence for V0 and V1, and differs on 28 stress cases (V1) and 29 synthetic strings (V0 and V1); fertility on (a) is 1.217 for V0, 1.107 for V1. |
| L3(f) | supported, so L3 is supported in full | Node's canonical point list of the 82,115 nouns has Python's SHA-256, `eb22bf00…`: words by `lexicon_core.js`'s rule, H³ points by `decoder3d.js` `pointExact`, H² points by the core's exact tree. All 2,000 sampled lines equal `results/l3f-python.txt`. Phase 1's four L3 controls all failed. |
| L4(a) | supported | Python and Node give 0 differing rank lists and equal exact MAP and mean rank, for the mammals (1,176 queries) and noun queries 0–199, in H³ and H². Graph-edge MAP: mammals 0.690653 (H³) and 0.718723 (H²); nouns 0–199 0.553253 and 0.572214. Chromium gives the same on the mammals (reported). Control 2: the acosh evaluator with node-index ties gives a different AP on 487 of the 488 tied mammal queries. |
| L4(b) | supported (decided by the reference) | 997 of 1,000 noun queries have a float64 inversion of an exactly ordered adjacent pair: H³ 990 (4,978,009 inversions, 152,072 float ties), H² 993 (8,969,341 and 1,715). In both trees the first is in query 0's first pair, and its deeper word has 25 letters. Node reproduces every count, query by query. Control 1: float32 on the mammals in H³ inverts in 1,137 of 1,176 queries (902,886 keys not finite). Control 2: as for (a). L4(c) is Phase 4. |

What was reported, disclosed and recorded:
- **Hugging Face's agreement** is reported, never decisive. In the examples kept, two rules of N_B show:
  - the reference writes a word-final sigma as ς, where Hugging Face writes σ;
  - the reference keeps one `[UNK]` for a word holding a code point unassigned in Unicode 15.1 (N_B fails it
    closed), where Hugging Face splits out a `;` or `>`.
- **Amendment 5's disclosures.** While building, the text builder timed N_B and WordPiece over instance (a) in Node.
  The geometry builder built every noun word and point in Node. Both were for times only, and nothing was compared.
  The comparisons made while building and reviewing used the Phase 1 traces, the registered dry sets and seeds
  70000 + i.
- **The results' label.** Both JSON files read "PREREGISTRATION.md with Amendments 1-4", the runners' fixed label.
  Both record HEAD `a1fe9a8`, which includes Amendment 5, and flag uncommitted changes in the folder
  ([Explainer 10](explainers/browser-core.html#order), chapter 2, says what that can and cannot mean). Amendment 3
  noted the same kind of label for Phase 1.

### How to run Phase 2

From `Pages/Hyperbolic Lexicon/`, with the WordNet archive, the UD EWT files and V1 cached (below), and Playwright's
Chromium installed for `require('playwright')`:

```
node tests/parity-lexicon.cjs                          # the browser core against every trace line (about 15 s)
node reference/golden/make_js_data_v1.cjs --check      # data/*.js rebuilt in memory and compared
node reference/golden/l1_instances_v1.cjs --check      # L1's instance lists in JS against their pins
python3 -B reference/run_claims.py --phase2 --dry      # the dry run, the reference's half, into results/dry/
node reference/run_claims_js.cjs --dry                 # the dry run, Node and Chromium, into results/dry/
python3 -B reference/run_claims.py --phase2            # the reference's half of L1 and L4 (about 2 minutes)
node reference/run_claims_js.cjs                       # parity, Node, Chromium and the decisions (about 7 minutes)
```

- **Order.** Run the Python half first: the JavaScript runner reads `results/phase2-python.json` and the per-instance
  lists in `~/.cache/hyperbolic-lexicon/phase2/` (`HL_CACHE` overrides the cache root).
- **Refusals.** The JavaScript runner refuses to go on if any parity line fails or is skipped. A decisive run also
  refuses without V1.
- **The harness page.** It serves the repository root on a free local port and drives `tests/l1-harness.html` in
  headless Chromium; that page has no site bar and is not for readers.
- **Hugging Face.** `tokenizers` is optional: without it the agreement is reported as not run.

`reference/README.md` lists every module, pin and results file.

## Phase 3: records and biochains, and their decisive run

Phase 3 built the language shards as unmodified SHD-CCP (`shdccp/2`) biochains, their records, the corpus manifest,
the exact weave and the hardened, attested verifier, in JS and in Python, and decided the four claims registered for
them, each by its registered rule. [`explainers/chains.html`](explainers/chains.html) (Explainer 11) tells the whole
story. Every number from the decisive run below is in
[`reference/results/claims-phase3.json`](reference/results/claims-phase3.json), and the run's console output is in
[`reference/results/phase3-console.txt`](reference/results/phase3-console.txt); the dry run's numbers are in
[`reference/results/dry/claims-phase3.json`](reference/results/dry/claims-phase3.json), Amendment 8's in
[`PREREGISTRATION.md`](PREREGISTRATION.md), and the test counts come from the suites themselves.

### What was built

- **The chain section of the browser core.** `lexicon_core.js` gained a section on Engram Mind's Eye's
  `biochain_v1.js` (Owl's codec, verbatim) and `engram_core.js`, and the orbital core's SHA-256, all loaded
  unchanged:
  - `growSync`, Owl Academy's `growBiochain` made synchronous, field for field; Amendment 7's synthetic-shard
    generator and the gloss cut;
  - the records `LVOCAB/1`, `LADDR/1` (with `addrTableRoot`), `LPREP/1` (Tier S, and Tier P with a salted root),
    `LCORPUS/1` and `LGROW/1`;
  - RFC 6962 roots, inclusion and consistency proofs, verified with RFC 9162's algorithms; the `shdccp/2` Merkle rule
    and an XOR summary, L9's two controls;
  - the exact weave and its segment sub-weaves;
  - ATTEST/1 in WebCrypto and the hardened verifier (`verifyPackage`). It runs the registered checks in order and
    returns `selfConsistent`, `authentic` and the first failing check.
- **The Python port.** `reference/lexicon/chain.py` (with V8's `Math.hypot` and `toFixed(12)` reproduced exactly),
  `records.py`, `manifest.py`, `attest.py` (`cryptography`, across the P1363/DER boundary) and `verify.py`; the
  reference is the authority for L8(d), L9 and L10's verdicts. [`reference/README.md`](reference/README.md) lists them.
- **Pins.**
  - `reference/golden/nb_spec_v1.txt`: N_B's specification, whose SHA-256 `LVOCAB/1` carries.
  - `reference/golden/biomesh_compat_v1.json`, written by `make_biomesh_compat_v1.cjs`: `growSync` against Owl Academy's and
    BioChain-AI's own growers, run unchanged by name-grab, on 13 unregistered texts, engrams off and on. All 26 records
    are equal to both, and both `verifyIntegrity`s accept them.
- **The trace and the tests.**
  - `reference/traces/chain_v1.txt` (`traces_chain.py`, seeds 8000 + i), which the core reproduces line for line:
    `tests/parity-lexicon.cjs` now passes 19,991 of 19,991 lines, 1,323 of them for the chain trace.
  - `tests/chain-lexicon.cjs` (30 checks): the pins, the shard cut, keys made in WebCrypto, and the verifier on
    unregistered packages.
  - `tests/bridges-lexicon.cjs` (40 checks): Engram Mind's Eye's `importBiochain` takes `growSync`'s records.
  - In the reference, 62 fast and 3 slow tests for the chain modules; the fast suite is now 189 tests.
- **The runner.** `reference/run_claims_phase3.cjs`, with its Python half `run_claims_phase3.py`, in order:
  - the gate: parity, with no line skipped, and the Owl Academy and BioChain-AI checkouts at their pinned commits,
    unchanged;
  - the inputs;
  - L8, with Owl's and BioChain-AI's growers in worker threads;
  - L9 and L10 in JS and in Python;
  - L11 in a fresh Node process with nothing else running;
  - the decisions.

### How it was checked

- **Before any code.** Amendment 7 fixed the definitions: the code and its authorities, L8's synthetic shards, the
  exact record strings and Tier-P salted roots, the exact weave, the RFC 6962 conventions and L9's lists, L10's
  packages, keys, registry, draws and verdicts, L11's timing, and the dry runs.
- **The dry runs** (Amendment 7 item 8): `Rng(4000 + i)` synthetic shards and the verb and adjective gloss shards, the
  verb shards standing in for C0. A container restart cut the first build off during its dry run. The work on disk was
  committed as it stood (`b822237`) and the dry run redone. The last dry run, on the code at `8c51e08`, supported all
  four claims (`25b48b3`).
- **The review.** Three reviewers, with two skeptics per finding, probed the code. They confirmed one finding: L11's
  control could not show whether the attestation step was timed. Amendment 8 records it.
- **Amendment 8,** after the dry runs and before any decisive run, changed three things and fixed the readings in the
  code (below).

### The commits, in order

| Commit | What |
| --- | --- |
| `1ad40d0` | Amendment 7: the definitions, before any record, grower port, manifest, verifier or runner existed |
| `b822237` | The build in progress, saved after a container restart cut the first build off during its dry run: the JS chain section, the Python port, the pins, the chain trace, the tests and the runner |
| `8c51e08` | The runner and verdict changes for Amendment 8, before any decisive run |
| `25b48b3` | The registered dry run on the final code (17 min 46 s): L8, L9, L10 and L11 supported; L11 156.2 ms with engrams off, 229.4 ms with engrams on (reported) |
| `6da04be` | Amendment 8: the packages grown with engrams off (disclosed as fixed after the dry runs), L11's control replaced by the verifier's own step record, the verdicts as Explainer 4 defined them, the readings in the code, the restart, the review and the environment |
| `865791f` | The decisive results: one run of `run_claims_phase3.cjs` on the code at `6da04be`, 50 min 44 s |
| `5222cdf` | Amendment 9, an erratum written with the write-up: the results' stale label, two READING texts that predate Amendment 8 item 2, and the dry run's HEAD; it changes no rule and no result |

### The decisions

The engines were Node 22.23.4 and Python 3.13.18, with `cryptography` 50.0.1 and numpy 2.5.3. Owl Academy was at
`7f45f35` and BioChain-AI at `c975161`. Parity passed 19,991 of 19,991 lines first. All four claims are supported, and
every control showed its weakness, as required.

| Claim | Decision | Key numbers |
| --- | --- | --- |
| L8 | supported, for the JS grower and for the Python port | 148 C0 shards and 20 synthetic shards (`Rng(1000 + i)`, about 30% two-byte characters, each with a chunk whose crystal holds 0x80), each grown with engrams off and on: 0 of 336 records differ from Owl Academy's own `growBiochain` (`scripts/biomesh.js` at `7f45f35`) in any of the fifteen fields, for `growSync` and for the Python port; BioChain-AI's grower (`src/biomesh/biomesh.js` at `c975161`) gives the same. Owl's and BioChain-AI's `verifyIntegrity` accept every record; Engram's `importBiochain` recreates every text byte for byte. (d): the V0 id streams, `LVOCAB/1`, `LADDR/1` (`addrTableRoot` `30b17bc3…`, 8,192 rows) and every `LPREP/1` string are identical in Python and JS. Controls: BioChain-AI's packet normalisation differs from Owl's record on 20 of 20 synthetic shards; leaves over binary bytes differ on 168 of 168 and Owl rejects all 168; one byte altered changes the leaf and the root on 168 of 168. Reported: the crystal holds 0x80 in 1.527% of C0's chunks (189 of 12,378); median value 1.095 (engrams off), 0.466 (on); median `growSync` 56 ms (off) and 119.1 ms (on) per shard. Owl's grower with its own engram layer (a median 9.3 s a shard with engrams on, in four contended worker threads) made the worker pool take 1,837.6 s. |
| L9 | supported | (a) The corpus manifest over the SHA-256 of C0's 148 `LPREP/1` strings (root `f567700d…`) and synthetic lists of K = 1, 2, 3, 7, 84, 200, 1,000 and 1,001: every root and proof equal in JS and Python, every alteration detected (739 on the manifest; every one for K ≤ 200, 2,000 drawn above), every inclusion proof rejected for a wrong leaf or position, every consistency proof verified; at most 10 hashes per inclusion proof. (b) All 148 exact weaves exact: norm 5^(28K), unfolding in order, the product of 7 segment sub-weaves, components identical in JS and Python (971–2,731 bits). Controls: the `shdccp/2` rule collides at K = 3, 7 and 1,001 (a duplicated last leaf keeps the root); an XOR summary misses every adjacent swap tested that the weave detects. |
| L10 | supported | 50 clean and 450 tampered attested packages (T1–T9, 50 each): 0 false accepts and 0 false rejects in JS and in Python, every verdict (self-consistent, authentic, failing check) identical. Every tampered package is rejected at a named check: T1 leaves, T2 crystal, T3 and T6 commitment, T4 and T5 attestation, T7 leaves or canonical, T8 weaves, T9 canonical. Controls: Owl's `verifyIntegrity` accepts 50 of 50 of each of T1, T2, T8 and T9, the gaps only the hardened checks close; Python without the P1363-to-DER conversion accepts 0 of 126 valid signatures. Keys were made per run in WebCrypto; the registry snapshot, `results/phase3-registry.json`, holds public JWKs only. |
| L11 | supported, on packages grown with engrams off (Amendment 8) | The hardened verification of the 147 full C0 shards takes a median 155.4 ms per shard in Node, 95% interval [154.2, 156.0], against a bar of 250 ms; 1,000 shards take about 156.7 s with the 1.3 s session. The step check (Amendment 8's control) holds 441/441. Reported: the same shards' engrams-on packages 243.6 ms [240.2, 246.7]; `LADDR/1` recomputed inside each verification (the literal reading) 1,350.2 ms; the session (`LADDR/1` once) 1,303.1 ms; Python 195.9 ms. The registered comparison with the attestation skipped, reported: skipped faster, 153.5 ms; paired difference 1.9 ms [0.4, 3.0]. |

What went against prediction, and what was disclosed:
- **L11's median is just above its predicted band.** The registration predicted about 50–150 ms; the median is
  155.4 ms. The canonical-encoding check (78.9 ms) and the derived layers (46.4 ms) take most of it. The decision needs
  the interval's upper end at or below 250 ms, so the miss does not change it.
- **Amendment 8, item 1: the packages are grown with engrams off.** The registration did not say which records L10's
  and L11's packages and L9(a)'s manifest use. Amendment 8 chose engrams off, the Lexicon's default for corpora (D4;
  Explainer 3). Disclosed plainly: the runner had first read it the other way (Owl's `growBiochain` defaults to
  engrams on). Those dry runs put L11's engrams-on median at 243.5–265.5 ms, near the bar, against 157–182 ms with
  engrams off, and the reading was fixed after seeing that. The decisive run reports the engrams-on packages beside
  the decision: 243.6 ms, interval [240.2, 246.7], under the bar by 3.3 ms at the interval's upper end, where the
  engrams-off packages leave 94 ms.
- **Amendment 8, item 2: L11's control is replaced.** The registered control ("a run with the attestation step
  skipped must be faster") was read as a comparison of the two medians. In the dry runs it could not resolve a
  0.7–0.8 ms step against 10–28 ms of noise: it failed by chance with correct code, and passed with the skip ignored.
  It is replaced by the verifier's own record of its steps (the attestation check run inside the timed window, or
  recorded as skipped). The comparison is still reported.
- **Amendment 8, item 3: the two verdicts follow Explainer 4.** Self-consistent is steps 1–6 and 8, authentic is
  step 7 (the signature), as Phase 0 defined them. The code as first built counted the inclusion and consistency
  checks as authenticity; both languages were changed identically in `8c51e08`.
- **Amendment 8's disclosures.** The builders timed verb shards (dry data) and hashed C0's shard texts against their
  pins; no C0 shard was grown, verified or timed before the decisive run.
- **Amendment 9: errata to the decisive record.** Written with this write-up; it changes no rule and no result. The
  results read "PREREGISTRATION.md with Amendments 1-7", the runner's fixed label; they record HEAD `6da04be`, which
  includes Amendment 8, and one uncommitted path, the run's own console file. READING runner-11 and runner-13 in the
  record predate Amendment 8 item 2 (the decision read the step check, 441/441 and 441/441; the comparison of the
  medians, reported, would have agreed). The dry run in `25b48b3` recorded HEAD `b822237` with the six files `8c51e08`
  commits, because it started 29 s before that commit. The runner now takes its label from `PREREGISTRATION.md`.

### How to run Phase 3

From `Pages/Hyperbolic Lexicon/`, with the WordNet archive cached (below), Node 22, and python3 with `cryptography`
and numpy:

```
node tests/parity-lexicon.cjs                          # the browser core against every trace line, the chain trace included (about 26 s)
node tests/chain-lexicon.cjs                           # the chain section: pins, the shard cut, WebCrypto keys, the verifier (30 checks)
node tests/bridges-lexicon.cjs                         # Engram Mind's Eye imports growSync's records (40 checks)
node reference/golden/make_biomesh_compat_v1.cjs <owl> <biochain> --check   # growSync against Owl's and BioChain-AI's growers (about 2 minutes)
python3 -B reference/traces_chain.py --check           # the chain trace rebuilt and compared (about 20 s)
node reference/run_claims_phase3.cjs --dry             # the registered dry run into results/dry/ (about 18 minutes)
node reference/run_claims_phase3.cjs                   # L8-L11 into results/ (about 51 minutes)
```

- **The checkouts.** `<owl>` and `<biochain>` are the Owl Academy and BioChain-AI checkouts, only read
  (`../../../Owl-Academy` and `../../../BioChain-AI` from this folder when they sit beside this repository). The
  runner finds them there by default, or takes `--owl` and `--biochain`. It refuses unless they are at `7f45f35` and
  `c975161` with the files it runs unchanged.
- **Refusals.** The runner refuses to go on if any parity line fails or is skipped, or if an input is not the
  registered one.
- **Output.** Per-instance data (Python's records, the packages, the L11 times) goes to
  `~/.cache/hyperbolic-lexicon/phase3/` (`phase3-dry/` for the dry run; `HL_CACHE` overrides the root), never into git.
  No private key is written anywhere.
- **Options.** `--workers <n>` sets the worker threads (default min(4, cores)). `--dry --smoke --out <dir>` is a
  development run on a few shards that decides nothing.

`reference/README.md` lists every module, pin and results file.

### What is next

- **Phase 4, learned embeddings:** the numpy trainer, the tuning amendment, and L6 and L4(c), the two claims still
  open; Stage-2 lexical claims by amendment.
- **Carried over from Phase 3's plan:** the SHDGEV01 golden-vector suites of
  [`proposals/SHD-CCP-golden-vectors.md`](proposals/SHD-CCP-golden-vectors.md) (`make_shdgev_v1.py`). They decide no
  claim and were not written. The proposals are to be sent with Phase 3's measured numbers
  ([`proposals/README.md`](proposals/README.md)).

## Roadmap

| Phase | Delivers | Where |
| --- | --- | --- |
| 0 · Analysis | This folder: pins, spikes S1–S7, `PREREGISTRATION.md` (L1–L11, D1–D12), eight explainers, proposals, hub and summary | here · **done** |
| 1 · Python reference | N_B, WordPiece with V0 and V1, WordNet, addresses, the H² tree, exact ranking, flat arms, LPS, traces; Amendments 1 and 2; two reviews; a dry run, then one decisive run: L2, L3 (Python side), L5, L7 supported | here · **done** |
| 2 · Browser core | `lexicon_core.js` at line-for-line trace parity; the data files; the Python and Node/Chromium runners; Amendments 4 and 5; a review; a dry run, then one decisive run: L1, L3(f), L4(a, b) supported | here · **done** |
| 3 · Records and biochains | The grower in JS and Python, the records, the RFC 6962 manifest, the exact weave, the hardened, attested verifier, the chain trace; Amendments 7 and 8; a review; dry runs, then one decisive run: L8, L9, L10, L11 supported. The SHDGEV01 golden-vector suites were not written and are carried over | here · **done** |
| 4 · Learned embeddings | The numpy trainer; tuning amendment; L6 and L4(c); Stage-2 lexical claims by amendment | here · next; Stage 2 on the network widened in Phase 1 |
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
  X(5, q) vertex are one tree read three ways (L7). It shows nothing about other engines (Phase 2), about
  learned embeddings, or about a language model.
- **What Phase 2 shows.** On the registered instances, the browser core gives the reference's bytes exactly for both
  vocabularies in Node 22 and Chromium 153, both at Unicode 17.0 against the reference's 15.1, because the pinned
  table decides and the platform does not (L1); it gives Python's words and exact points for every noun (L3(f)) and
  Python's exact rankings (L4(a)); and float64 ranking of those exact points is not certifiable at WordNet depth
  (L4(b)). It covers one Node release and one Chromium build on one Linux machine, not other browsers or platforms;
  L3(f) and the noun part of L4(a) ran in Node only, as registered. It shows nothing about learned embeddings
  (L4(c), L6) or about a language model.
- **What Phase 3 shows.** On the registered shards (WordNet 3.0's noun glosses, and 20 synthetic shards for the
  multi-byte cases), the Lexicon's grower, in JS and in Python, writes Owl Academy's own biochains field for field,
  which both projects' verifiers and Engram's importer accept (L8). The shards tie under an RFC 6962 manifest with
  identical roots and proofs in both languages, and each shard's exact weave is exact (L9). The hardened, attested
  verifier rejects every registered tamper, identically in both languages, including four classes Owl's
  `verifyIntegrity` accepts (L10). It verifies a full shard, grown with engrams off, in a median 155.4 ms in Node
  (L11; engrams off is Amendment 8's reading, fixed after the dry runs). It covers Owl Academy and BioChain-AI at the
  pinned commits, one Node release and one Python build on one Linux container, nine registered tamper classes (not
  an adversary's search) and keys made for the run. It shows nothing about learned embeddings or about a language
  model.
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
| `explainers/` | 1 analysis · 2 shdccp · 3 architecture · 4 biochains · 5 alternatives · 6 tracks · 7 benchmarks · 8 evidence · 9 reference · 10 browser-core · 11 chains |
| `lexicon_core.js` | The browser core (Phase 2) and its chain section (Phase 3), on the shared cores unchanged |
| `data/` | The pinned Unicode 15.1 table and V0 as script files, for the pages (`reference/golden/make_js_data_v1.cjs`) |
| `assets/hl.css`, `assets/hl-map.js` | Shared style; the system map (Hyperbolic Oracles' renderer, renamed) |
| `reference/` | The Python reference (Phase 1; the chain modules, Phase 3): pins (`golden/`), modules (`lexicon/`), tests, traces, `run_claims.py`, the Phase 2 runner `run_claims_js.cjs`, the Phase 3 runner `run_claims_phase3.cjs` (with `run_claims_phase3.py`), and their results; see `reference/README.md` |
| `spikes/` | S1–S7 with captured outputs, and the L1 stress set |
| `proposals/` | Documents for SHD-CCP, BioChain-AI and Owl Academy, never applied; the kernel check |
| `tests/` | `parity-lexicon.cjs` (the browser core against the traces), `chain-lexicon.cjs` (the chain section's checks beyond the trace), `bridges-lexicon.cjs` (Engram Mind's Eye imports the Lexicon's shards), `links.cjs`, `spikes.cjs`, `all.cjs`; `l1-harness.html`, the page the Phase 2 runner opens in Chromium |

## How to check

```
node "Pages/Hyperbolic Lexicon/tests/all.cjs"
```

It runs:
- the shared cores' checks and Engram's parity and bridges;
- the browser core's parity (`tests/parity-lexicon.cjs`, the chain trace included) and the data files' check;
- the chain section's checks (`tests/chain-lexicon.cjs`), Engram's import of the Lexicon's shards
  (`tests/bridges-lexicon.cjs`), and the Owl Academy and BioChain-AI compatibility pin
  (`make_biomesh_compat_v1.cjs --check`, skipped without those checkouts beside this repository);
- this folder's links and spike reruns;
- the site bar;
- the WordNet and EWT pins;
- the Python reference: its fast pytest suite, the five pin checks (Unicode 15.1, the table against the official
  UCD 15.1.0 files, V0 retrained, V1, the L1 instance lists) and both trace checks;
- the kernel check. Checks are reported as skipped, never passed, without the data cache or an SHD-CCP checkout.

It does not run `run_claims.py`, `run_claims_js.cjs`, `run_claims_phase3.cjs` or the slow tests; see "How to run
the reference", "How to run Phase 2" and "How to run Phase 3" above, and `reference/README.md`.

Fetch the data once:

```
node "Pages/Hyperbolic Lexicon/reference/golden/make_wordnet_v1.cjs"
node "Pages/Hyperbolic Lexicon/reference/golden/make_ewt_v1.cjs"
python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_vocab_v1.py"
```

The third fetches V1 at its pinned revision into the same cache.
