# Hyperbolic Lexicon: preregistration

Registered 2026-11-05, in Phase 0, before any code that tests these claims exists. The claims, instances, controls,
metrics, decision rules and predictions below are fixed. A later change is recorded as a dated amendment at the end
of this file, with its reason. Results computed before an amendment are reported under the rules in force when they
ran.

The seven spikes in `spikes/` (S1–S7) ran before this file was written, on data disjoint from every instance below.
They fixed facts the design depends on, and three of their values are written into this file where marked
(S3 in L6(c), S4 in L8 and L10, S6 in L1). They decide no claim. Every claim is decided by the Phase 1–4 reference
and browser core on the instances given here.

## Claims under test

| # | Claim | Kind | Track |
| --- | --- | --- | --- |
| L1 | The pre-processing front end (normaliser, WordPiece, ids, offsets) is byte-identical in Python, Node and Chromium | exact | browser + CPU |
| L2 | The frozen engram/1 key cannot serve as a token id: at least 1% of WordNet's lemma types share their key | exact | CPU + Node |
| L3 | Every WordNet noun synset has an exact, invertible, certified address in the norm-5 tree and exact points in H³ and H² | exact | CPU + Node |
| L4 | Exact ranking is identical across engines; float64 ranking is not certifiable at WordNet depth; snapped learned tables rank within 0.001 MAP | exact and measured | CPU + Node |
| L5 | At dimensions 2 and 3, the exact hyperbolic tree reconstructs the noun hierarchy better than the same construction at curvature 0 | statistical | browser + CPU |
| L6 | Learned Lorentz beats learned Euclidean at d = 2, 3 on the mammal closure, not at d = 50; the exact tree against learned Lorentz | statistical | CPU |
| L7 | One tree, three readings: address, H³ point and X(5, q) vertex, for q = 13, 17, 29 (SHD-CCP RFC 03) | exact and numerical | CPU + Node |
| L8 | Language shards are Owl-valid biochains, field for field, in JS and Python | exact | Node + CPU |
| L9 | The RFC 6962 corpus manifest, its append-only growth, and the exact norm-5 weave | exact | Node + CPU |
| L10 | The hardened importer accepts every clean attested shard and rejects every registered tamper, identically in JS and Python | exact | Node + CPU |
| L11 | A full shard verifies, every hardened check included, in a median of at most 250 ms in Node | measured | Node |

## Fixed design inputs

These choices were made before registration (README, "Decisions"). They are part of what is tested.

- **D1** The system lives in `Pages/Hyperbolic Lexicon/` and loads the shared cores unchanged by relative path:
  `hyperbolic_core.js`, `decoder3d.js`, `twin3d.js` and `fence.js` (Hyperbolic Oracles), `orbital_core.js`, and
  Engram Mind's Eye's `ttmpt_core_v1.js`, `engram_core.js`, `biochain_v1.js`.
- **D2** Exact first. The tokenizer, ids, addresses, points, rankings and hashes are exact. Learning happens in float64,
  and learned tables are stored as dyadic snaps.
- **D3** The octahedral H³ tree (t = 3/4, τ = ln 7) is the primary exact store. The new exact H² tree uses root
  directions (1,0), (3/5, ±4/5), (−7/25, ±24/25), (−1,0); child k = 0..4 in the local frame takes (1,0), (3/5, 4/5),
  (3/5, −4/5), (−7/25, 24/25), (−7/25, −24/25), with back (−1,0); the step is R(u)·B(t) with t = 11/13
  (cosh 145/24, sinh 143/24, τ = ln 12). Spike S2 measured 500/500 exact decodes at every depth 2–28 for
  t = 11/13. m = 10 and 11 decode as well, but m = 12 keeps the widest angular margin (8.72° against 2.01° and 6.00°)
  and the fewest bits at depth 28 (225/152 against 247/185 and 235/167). The float tree `TreeEmbedding` (cos/sin) is used for drawing only.
- **D4** Token id, address and engram are separate. engram/1 is a compatibility checksum, never an input. V0
  "lex0" (8,192 entries) decides L1; V1 (bert-base-uncased, 30,522 entries) is a second cell only if pinned by the
  decision date.
- **D5** The normaliser N_B follows BERT's BasicTokenizer rules on Unicode 15.1 tables exported from Python's
  `unicodedata` and pinned by SHA-256. It fails closed on code points unassigned in 15.1. The JS never calls
  `String.prototype.normalize`, `toLowerCase` or `\p{}`. Fallback N1 (bytes as given, BOM stripped, CRLF to LF,
  ASCII lowercase) is registered only if L1 is refuted.
- **D6** The address rule of L3 and the bijective mixed-radix id: id(w) = (number of reduced words shorter than w)
  + (rank of w at its length, first letter base 6, later letters base 5). id59 covers length ≤ 25, id64 length ≤ 27.
  `engram_core.encode` is not used for ids.
- **D7** The Blackwell word only at the Owl/BioChain bridge; the namespace lives in record kinds (`LVOCAB/1`,
  `LADDR/1`, `LPREP/1`, `LCORPUS/1`, `LGROW/1`, `LBENCH/1`), never in a Form nibble.
- **D8** Shards are ≤ 60,000 UTF-8 bytes, unmodified `shdccp/2` with the JavaScript codec's hashing; corpora are
  tied by RFC 6962 manifests; two tiers (plaintext only for redistributable licences; salted commitments otherwise).
- **D9** Authorities: the Python reference for exact claims; Owl Academy's and BioChain-AI's own JavaScript for
  compatibility (L8); the numpy float64 trainer for static embeddings (geoopt a reported cross-check).
- **D10** The browser, CPU and GPU tracks share the tokenizer record, the corpus roots, the generator, the metric code,
  matched budgets and receipts.
- **D11** No model code before its claims are registered. PolyStep only for heads of at most a few hundred parameters.
- **D12** The other repositories are read only. Their Python runs only as `python3 -B -I` with an explicit `sys.path`.

## Common rules

- **Authority.** Exact claims are decided by the Python reference. The browser core must reproduce the reference's
  traces line for line before a claim decided in the reference is shown as holding in the browser.
- **Exact claims** are all-or-nothing. A claim is **supported** if every case passes and **refuted** by any single
  failure, which is recorded as a counterexample.
- **Controls.** Every test has at least one control: a deliberately broken variant that must show its weakness on at
  least one case. If a control passes, the test is **void**, the claim stays open, and the test is repaired by
  amendment.
- **Randomness.** The shared generator: `hyperbolic_core.js` `Rng` = `reference/hpstep/prng.py` (xoshiro128** seeded by
  splitmix32), so both languages draw the same instances. Instance seeds are 1000 + i; secondary draws 2000 + i;
  dry runs 4000 + i (and +3000 on every other seed); tuning 9000–9023; training seeds 0–4; spikes used 90000 + i
  and must never be reused.
- **Disjoint data.** No instance below was touched by a spike except to count it or hash it. The spikes used WordNet
  verbs and adjectives, Owl Academy's canon tree, synthetic words and repository Markdown.
- **Statistics.** Intervals are 95% percentile bootstrap intervals (10,000 resamples, seed 7).
- **Ties.** Average precision counts ties pessimistically: a neighbour tied exactly with a non-neighbour ranks after
  it. Tied candidates are listed by synset offset. Fractional-tie values are reported, never used to decide.
- **Literature numbers** are graded verified / likely / secondary as in the survey. No claim compares against a
  likely or secondary number.
- **Reporting.** Every case and cell is reported. Nothing is dropped after a run.

## Shared instances

- **WordNet 3.0.** nltk_data `wordnet.zip`, 10,775,600 bytes, SHA-256
  `cbda5ea6eef7f36a97a43d4a75f85e07fccbb4f23657d27b4ccbc93e2646ab59`
  (`reference/golden/make_wordnet_v1.cjs --check`); `data.noun` SHA-256
  `489f145e0f68877c0be5bd0eb4117adaaac52f38f6204eb8d85dbe2158b614cc`. Counts in `reference/golden/wordnet_v1.meta.json`:
  82,115 noun synsets, one spanning root (00001740 entity.n.01), 743,241 hypernym-closure edges.
- **Synset order.** Offset order (the 8-digit offsets sorted as strings, which is numeric order).
- **The mammal sets.** mammal.n.01 = 01861778. The closure set is mammal.n.01 and every noun with it among its
  hypernym ∪ instance-hypernym ancestors: 1,182 synsets, 6,542 closure edges inside the set (SHA-256 of the sorted
  offsets `c4748ce2…`). The spanning subtree is every node whose spanning-parent chain reaches mammal.n.01:
  1,176 synsets (`31c43a5b…`).
- **The noun query sample.** `Rng(1000).sample(82115, 1000)` over the nouns in offset order.
- **C0.** Noun synsets in offset order, one line each: `offset<TAB>lemmas ("_" as space) joined by ", "<TAB>gloss`,
  lines joined by `"\n"` and cut at line boundaries into shards of at most 60,000 UTF-8 bytes: 148 shards (147 of
  them ≥ 59,000 bytes), their SHA-256s listed in `wordnet_v1.meta.json`.
- **UD English EWT** at commit `4a4d77f599ea53cc405f85d0cec4b2f14f81d42b` (`reference/golden/make_ewt_v1.cjs --check`):
  12,544 / 2,001 / 2,077 `# text =` sentences.
- **The Unicode stress set.** `spikes/s6_stress_set_v1.json`, SHA-256 `bd1179ea80eb3dd44e05a4efa0484f034a637a66d8f09ffe10e428f040f6e94a` (360,160 bytes, 20,520 cases: the 9,990 code points on which Node, Python and Chromium disagree, each alone and in ASCII context, plus 540 explicit cases), written by spike S6.

---

## L1 · The front end is byte-identical across engines

**Claim.** On every instance, the Python reference (the authority), Node 22 and headless Chromium (Chrome for Testing
via Playwright) give identical normalised text bytes, token strings, token ids, byte offsets and id-stream SHA-256,
for each pinned vocabulary. The normaliser is N_B on the pinned Unicode 15.1 tables (D5).

**Instances.**
- (a) Every WordNet 3.0 synset's gloss field (definition and examples), all four parts of speech, one string each,
  in (part of speech, offset) order: 117,659 strings.
- (b) Every `# text =` sentence of UD English EWT train, dev and test at the pinned commit: 16,622 strings.
- (c) The Unicode stress set (above).
- (d) 2,000 synthetic strings: string i comes from `Rng(1000 + i)`, with length 1 + `below(64)` code points drawn
  uniformly from this pool: ASCII, Latin-1, Latin Extended-A, combining marks U+0300–036F, Greek (with final-sigma
  contexts), Cyrillic, Hangul syllables, CJK U+4E00–4FFF, emoji U+1F600–1F64F, C0 controls, U+200B, U+FEFF, and the
  code points of the stress set assigned after Unicode 15.1.

Vocabularies: V0 "lex0" (8,192 entries), trained by the reference on (a) with the Amendment 1 algorithm, then
frozen and hashed before the decisive run (the decisive cell); V1 bert-base-uncased, a second cell only if pinned by
the decision date. Dry runs use `Rng(4000 + i)` strings and repository Markdown.

**Metric.** The number of instances with any difference in normalised bytes, token strings, ids or offsets between
the reference and each runtime, and the equality of each id-stream SHA-256. Reported, not decisive: agreement with
Hugging Face `tokenizers` on the same vocabulary; fertility, continued-word rate, bytes per token, Rényi efficiency
at α = 2.5; the [UNK] rate and fail-closed count.

**Controls that must fail.**
1. A JS normaliser built on the platform's own functions, exactly as spike S6 implemented it (`toLowerCase()`, then
   `normalize('NFD')`, then removing `\p{Mn}`), must differ from the reference on at least one case of (c). (Spike S6 found it differs on 725 of the 20,520 cases, in Node and in Chromium alike.)
2. WordPiece with shortest-match-first must differ on at least one case of (a).
3. N_B with accent stripping off must differ on at least one case of (a) or (b).

**Decision.** Exact and all-or-nothing, per vocabulary cell and per runtime. Supported if no instance differs in
Node and in Chromium; refuted by any single difference (recorded as a counterexample); void if a control passes.

**Prediction.** Supported in both runtimes, and all three controls fail. Because the tables are data, the platform's
Unicode version (Node: Unicode 17.0, ICU 78.3; Python: 15.1.0) cannot leak in. The risk points are the Final_Sigma
context, multi-code-point lowercase (U+0130) and canonical ordering.

**Data.** WordNet (WordNet licence); UD EWT (CC BY-SA 4.0, text not committed); Unicode tables (Unicode licence).

## L2 · engram/1 cannot serve as a token id

**Claim.** On the WordNet 3.0 lemma vocabulary, at least 1% of distinct types share their engram/1 key with another
distinct type. Python (`reference/engram/ttmpt.py`) and Node (`ttmpt_core_v1.js`, unchanged) give identical key
tables.

**Instances.** Every distinct lemma string of `index.noun`, `index.verb`, `index.adj` and `index.adv`, with `_` read
as a space and N_B applied, deduplicated (147,306 types before N_B; the run counts them after). Every V0 entry is
reported, not decided. No randomness.

**Metric.** Collision share = |types in a key class of size ≥ 2| / |types|. Reported: the number of classes and the
largest; the share on the key `0000000000000000`; the all-digit types and their keys; the anagram classes. Python and
Node tables are compared by SHA-256.

**Controls that must fail.** A 64-bit SHA-256-prefix key on the same types must give 0 collisions; if it collides,
the test is void. A Node/Python table mismatch voids the test (a parity bug, not a result).

**Decision.** Supported if the share is ≥ 0.01 and the control gives 0 collisions; refuted if the share is < 0.01;
void otherwise.

**Prediction.** Supported, with a share between 2% and 10%: anagram classes (dog/god), words in which every letter
appears an even number of times and numerals (all on the zero key), and types that differ only in non-letters.

## L3 · Exact, invertible, certified addresses in H³ and H²

**Claim.** Under the rule below, for every WordNet 3.0 noun synset:
- (a) its reduced norm-5 word is distinct from every other synset's;
- (b) the word decodes back to the synset (inverse table lookup);
- (c) `certifyWord` holds: the integer quaternion has norm exactly 5^len, right division returns the word, and the
  word is reduced;
- (d) u is a spanning-tree ancestor of v exactly when word(u) is a proper prefix of word(v);
- (e) its exact point satisfies the sheet identity exactly and decodes exactly back to the word, in H³
  (`decoder3d.js` `TreeEmbedding3D`, t = 3/4, `pointExact` and `decodeExact`) and in H² (D3, t = 11/13);
- (f) Python and JS give the same words and the same exact points;
- (g) the bijective id code (D6) round-trips every word it covers: id59 for length ≤ 25, id64 for length ≤ 27.

**The rule.**
- The spanning parent is the first `@` or `@i` pointer of the data line.
- entity.n.01 sits at the word [0].
- Children are ordered by synset offset.
- Child k of a node with c children takes m = max(1, ⌈log₅ c⌉) letters: the m base-5 digits of k, most significant
  first, each choosing `P.children(current word)[digit]`.

**Instances.** All 82,115 noun synsets. Part (f) is checked on all nodes by the SHA-256 of the canonical point list,
and line by line on 2,000 nodes drawn by `Rng(1000 + i)`. Deterministic otherwise. Dry runs use the verb forest.

**Metric.** The number of failures of each of (a)–(g), per tree. Reported: the word-length distribution; the shares
of words with ≤ 25 and ≤ 27 letters; the maximum numerator and denominator bits per coordinate in each tree;
milliseconds per point in Python and JS; the number of nodes with more than 5 and more than 25 children (3,291 and
396 in the pin).

**Controls that must fail.**
1. Zero-letter variant: m = ⌈log₅ c⌉ without the max(1, ·), so a single child gets no letters. It must break
   injectivity (there are 6,162 nodes with one child).
2. Truncation variant: children beyond the fifth are folded into the fifth child. It must break injectivity.
3. Float placement with float decoding (`TreeEmbedding3D.point` and `decode`) must fail on at least one word longer
   than 12 letters.
4. The H² tree at t = 3/4 must fail exact decoding on at least one word.

**Decision.** Exact and all-or-nothing on (a)–(g) across both trees; any failure refutes, with a counterexample;
void if a control passes.

**Prediction.** Supported. Spike S3 found that 99.96% of verb words fit 25 letters (longest 26); nouns are deeper
(spanning depth 19, up to 659 children), so a larger minority may exceed 25 or 27 letters, and that share is
reported. At depth 28, spike S1 measured ≤ 139-bit numerators (157 on straight paths) over 79-bit denominators in
H³, and spike S2 measured H² at 1.28×–2.38× those bits. Control 3: S1 saw float decoding fail from depth 13.
Control 4: S2 saw t = 3/4 decode 226/500 random words at depth 12.

## L4 · Exact ranking is identical across engines; float ranking is not certifiable

**Claim.**
- (a) For every query, ranking all candidates by the exact Lorentz inner product of the L3 points gives identical rank
  lists in Python and JS. The resulting MAP and mean rank are equal as exact rationals (pessimistic ties). This holds
  in H³ and H².
- (b) Float64 ranking of the same exact points (rounded to float64, then the float Lorentz product) is not
  certifiable at WordNet depth: at least one of the 1,000 noun queries has a float inversion of an exactly strictly
  ordered adjacent pair.
- (c) Learned tables snapped to the 2^−32 grid (`fence.js` `dyadic` and `lift`) and ranked exactly have MAP within
  0.001 of float64 evaluation of the unsnapped tables. Decided in Phase 4 on L6's tables.

**Instances.** The mammal spanning subtree (every node a query and a candidate); the noun query sample, each query
ranked against all 82,115 candidates; (a) on nouns uses queries 0–199. (c) uses every L6 table at d ∈ {2, 3}
(Lorentz and Euclidean, seeds 0–4); Euclidean tables are ranked by exact squared distance of their dyadic points.
Dry runs use `Rng(4000)` and the verb forest.

**Metric.** (a) SHA-256 of each query's rank list; exact MAP and mean rank as rationals. (b) The number of queries
with at least one float inversion among exactly strictly ordered adjacent pairs; reported: the word length of the
deeper word in the first inversion. (c) |MAP(snapped, exact) − MAP(float64)| per table; reported: the largest snap
displacement as a hyperbolic distance.

**Controls that must fail.**
1. Float32 ranking of the mammal points must show at least one inversion; otherwise (b) is void.
2. A float evaluator that uses acosh distances and breaks ties by node index must give a different AP from the
   pessimistic exact evaluator on at least one mammal query with an exact tie. If no exact tie exists, this control
   is reported N/A and does not void the test.

**Decision.** (a) All-or-nothing. (b) Supported if at least one inversion occurs; refuted if none. (c) Supported if the
largest |ΔMAP| ≤ 0.001 over all tables; refuted if any table exceeds 0.01; inconclusive otherwise.

**Prediction.** (a) and (b) supported: spike S1 saw float64 first invert at depth 10 on straight paths and 12 on random
words, and float32 at depth 5. Control 2 is predicted to apply: S1 found exact neighbour/non-neighbour ties wherever
virtual letters occur. (c) supported.

## L5 · The exact hyperbolic tree beats the same construction at curvature 0

**Claim.** At dimensions 2 and 3, the training-free exact hyperbolic tree reconstructs WordNet's noun hierarchy
better than the same construction at curvature 0, and its score depends on the hierarchy.

**Instances.** The mammal spanning subtree (all nodes as queries) and the noun query sample.

Arms:
- **H3, H2**: the exact trees of L3.
- **F3, F2**: the same words, directions and step rule in R³ and R² with unit edges, exact integer or rational
  coordinates, ranked by exact squared distance.
- **F3\*, F2\***: a flat fractal tree with the same directions and edge length (1/4)^depth, exact dyadic coordinates.
- **S3**: H3 with words permuted among synsets of equal word length (20 permutations `Rng(2000 + i)` on mammals,
  5 on nouns).
- **K3**: content-hash words, `engram_core.encode` of the first 8 bytes of SHA-256 of the first lemma (28 letters).

**Metric.** Primary: graph-edge MAP (neighbours are the spanning parent and children), pessimistic ties. Reported:
closure MAP and mean rank (hypernym ∪ instance-hypernym closure), distortion mean |d_H/(τ·d_T) − 1|, bits per node.
Effect: the mean per-query paired AP difference, hyperbolic minus flat, with its bootstrap interval.

**Controls that must fail.** S3 and K3 must each score below H3, with the intervals of (H3 − S3) and (H3 − K3) above 0
on both sets. If either ties H3, the metric is insensitive to hierarchy and the claim is void.

**Decision.** Supported if the intervals of (H3 − F3), (H3 − F3\*), (H2 − F2) and (H2 − F2\*) all lie above 0 on both
instance sets; refuted if any lies entirely at or below 0; inconclusive otherwise.

**Prediction.** Supported. F collides on its lattice, and F\* ranks descendants ahead of the parent. The exact tree's
graph-edge MAP falls below 1 wherever virtual letters occur: spike S3 measured 0.6309 on the verb forest (0.9974 on
single-letter edges, 0.32–0.43 where an edge needs two to four letters). The nouns' value is reported against Sala et
al.'s combinatorial 0.989 (2-d, about 500 bits), which this rule is predicted to fall short of.

## L6 · Learned geometry at matched dimension, and the exact tree against it

**Claim.** On the WordNet mammal hierarchy:
- (a) learned Lorentz embeddings beat learned Euclidean embeddings on closure MAP at d = 2 and d = 3;
- (b) at d = 50 the advantage vanishes;
- (c) the training-free exact H³ tree has graph-edge MAP at least that of learned Lorentz d = 3;
- (d) learned Lorentz d = 3 has higher closure MAP than the exact H³ tree.

**Instances.** The mammal closure set (1,182 synsets, 6,542 closure edges). Training (Nickel & Kiela): softmax loss over
1 positive and 50 negatives drawn uniformly from non-neighbours with `Rng(seed)`; batch 50; 20 burn-in epochs at
lr/10, 1,000 epochs in all; float64. Lorentz: curvature −1, Riemannian SGD on the hyperboloid (Minkowski gradient,
tangent projection, exp map), spatial init uniform in [−1e−3, 1e−3]. Euclidean: SGD, same init. The numpy reference
trainer, single-threaded, deterministic. Lorentz and Euclidean at d ∈ {2, 3, 50} decide; d ∈ {5, 10} are reported.
Tuning: for each (geometry, d), lr ∈ {0.03, 0.1, 0.3, 1, 3, 10} × seeds 9000–9023 in blocks of four; the lr with the
best mean closure MAP is frozen in `reference/settings.json` by dated amendment before any measured run. Measured
runs: seeds 0–4. Exact arm: L3's H³ words restricted to the mammal set.

**Metric.** Graph-edge MAP and closure MAP computed exactly from points snapped to 2^−32 (L4(c)), with per-node paired
AP differences and a node bootstrap per seed. Reported: mean rank, distortion, bits per node, wall-clock time.

**Controls that must fail.**
1. Label shuffle: every trained table, evaluated against the closure with node labels permuted by `Rng(7)`, must
   give MAP ≤ 0.05; otherwise the evaluator leaks and the claim is void.
2. Edge-shuffled training (the same number of random pairs, `Rng(2000 + seed)`) must score below true training, with
   the interval above 0; otherwise void.
3. A random-embedding floor (`Rng(2000 + i)`) is reported.

**Decision.**
- (a) At each of d = 2 and d = 3: supported if the interval of (Lorentz − Euclidean) closure AP lies above 0 in all 5
  seeds; refuted if the mean is ≤ 0 in 3 or more seeds at either d; inconclusive otherwise.
- (b) Supported if at d = 50 the interval lies within [−0.02, +0.02], or entirely below 0, in all seeds; refuted if it
  lies entirely above +0.02 in 3 or more seeds; inconclusive otherwise.
- (c) Supported if the lower end of the (exact − learned) graph-edge interval is ≥ −0.01 in all seeds; refuted if the
  mean is below −0.05 in 3 or more seeds; inconclusive otherwise.
- (d) Supported if the (learned − exact) closure interval lies above 0 in all seeds; refuted if the mean is ≤ 0 in 3
  or more seeds; inconclusive otherwise.

**Prediction.**
- (a) Supported, with a closure-MAP gap of at least 0.2 at d = 2 and d = 3 (the direction of Nickel & Kiela).
- (b) Supported.
- (c) **Refuted.** Fixed by the rule registered with the design, applied to spike S3 on the disjoint verb forest:
  "supported if S3's exact-tree graph-edge MAP on verbs is ≥ 0.90, otherwise refuted". S3 measured **0.6309**
  (exactly a 205-digit rational, SHA-256 `2e428dd7…`, reproduced by an independent Python recomputation). The cause
  is the virtual letters: siblings that share a virtual prefix sit as close as the parent or closer. S3 read the
  verb forest's 559 roots as children of a virtual root at the word [1] (4 letters each); the noun tree has one real
  root, so the nouns need no such reading.
- (d) Supported: learning pulls ancestors toward the origin, which closure ranking rewards.

## L7 · One tree, three readings: address, H³ point and X(5, q) vertex

**Claim.** For q ∈ {13, 17, 29}:
- (a) The LPS map φ_q sends `P.GENS` (1 ± 2i, 1 ± 2j, 1 ± 2k) to 2×2 matrices mod q, using i ↦ ι with ι² = −1 mod q
  (ι = 5, 4, 12). The projective Cayley graph has q(q² − 1) vertices and is bipartite when (5|q) = −1 (q = 13, 17:
  2,184 and 4,896 vertices), and q(q² − 1)/2 vertices when (5|q) = 1 (q = 29: 12,180). In every case it is 6-regular,
  connected and inverse-closed.
- (b) Reducing any word's `P.wordQuaternion` mod q and projectivising equals the vertex reached by walking the word
  from the identity.
- (c) Distinct reduced words of length ≤ r = ⌊(g − 1)/2⌋ map to distinct vertices, where g is the girth computed
  exactly.
- (d) The graph is Ramanujan: every eigenvalue other than ±6 has |λ| ≤ 2√5.
- (e) `P.wordQuaternion` equals SHD-CCP's `HurwitzQuaternion` product in doubled coordinates, halved.

**Instances.** (b): 10,000 random reduced words of length 1–60 from `Rng(1000 + i)`, plus all L3 mammal addresses.
(c): every reduced word of length ≤ r, exhaustively. (e): 1,000 words from `Rng(2000 + i)` plus all mammal addresses.
SHD-CCP's `hurwitz.py` is imported with `python3 -B -I` and an explicit `sys.path`, read-only.

**Metric.** Failures of (a), (b), (c) and (e). For (d): the largest |λ| other than ±6 (float64 `eigvalsh` on the dense
adjacency) and its margin to 2√5 = 4.4721. Reported: g and r per q, and how the noun addresses spread over vertices.

**Controls that must fail.** φ with ι = 2 must break (b) on at least one word; a 4-generator subset must fail
6-regularity; the doubled-coordinate Hurwitz product of a word of length L, compared without dividing by 2^L, must
fail (e).

**Decision.** (a), (b), (c) and (e) are all-or-nothing. (d) is supported if the largest nontrivial |λ| ≤ 2√5 − 10⁻⁹
for every q, and refuted otherwise.

**Prediction.** Supported (this is the Lubotzky–Phillips–Sarnak theorem). Spike S5 measured, on synthetic words: girths
8, 8, 9 (so r = 3, 3, 4), largest nontrivial |λ| 4.2497, 4.3089, 4.4420 (margins 0.2224, 0.1632, 0.0301), and
`eigvalsh` at 12,180 vertices in about 161 s. The reduction is a shard key, never integrity: LPS Cayley hashes have
known collision attacks.

## L8 · Language shards are Owl-valid biochains

**Claim.**
- (a) Our synchronous JS grower (the `biochain_v1.js` codec plus `orbital_core` SHA-256) and our Python port each give,
  field for field, the record that Owl Academy's own `growBiochain` gives from the same text; BioChain-AI's gives the
  same.
- (b) Owl's and BioChain-AI's `verifyIntegrity` accept every record.
- (c) `EngramCore.importBiochain` accepts every record and recreates the text byte for byte.
- (d) The derived layers (the V0 id stream and its SHA-256, `addrTableRoot`) and the `LPREP/1` commitment strings are
  identical in Python and JS.

**Instances.** C0 (148 shards), plus 20 synthetic shards: shard i from `Rng(1000 + i)`, 20,000–60,000 bytes of valid
UTF-8 with at least 25% two-byte characters and some three- and four-byte characters, drawn deterministically until
at least one chunk whose crystal contains 0x80 has occurred. Each shard is grown with engrams on and off. Owl's
`scripts/biomesh.js` (7f45f35) and BioChain-AI's `src/biomesh/biomesh.js` (c975161) run unchanged in Node by name-grab.
The Python port reproduces V8's `Math.hypot` algorithm and `toFixed(12)` exactly. Dry runs use `Rng(4000 + i)`
synthetic shards and verb and adjective gloss shards.

**Metric.** Per shard and grower, the mismatching fields among chainId, stream, streamVersion, leafHashes, merkleRoot,
weaveChiral, weaveMirror, segCuts, segments, engramStream, engramCount, engramMeanJ, origBytes, shippedBytes, value;
both `verifyIntegrity` verdicts; `importBiochain`'s flag and text equality; Python/JS mismatches in (d). Reported: the
share of chunks whose crystal contains 0x80, value per shard, timings.

**Controls that must fail.**
1. A Python grower that packs with BioChain-AI's `shdccp_kernel.pack` normalisation (−128 to −127) must differ from
   Owl's record on at least one synthetic shard.
2. A grower that hashes leaves over binary bytes must differ on every non-empty shard and be rejected by Owl's
   `verifyIntegrity`.
3. Altering one byte of any shard's text must change its leaf and its root.

**Decision.** All-or-nothing, separately for the JS grower and the Python port. Owl's own JS is the authority for (a)
and (b); the Python reference for (d).

**Prediction.** Supported for JS and for Python. Spike S4 found the spike grower equal to Owl's on 126/126 records,
and a Python weave port with V8's `hypot` and exact `toFixed` equal to Owl's JS on 1,000/1,000 synthetic shards, while
Python's own `math.hypot` wrote a different weave string on 2 of 1,000 (it differs from V8's on 31% of calls). The
0x80 case occurred in 1.41% of gloss chunks (analytic 1.55%), and BioChain-AI's normalised packets changed the stream
of 43 of 63 shards but never chainId or merkleRoot.

## L9 · The corpus manifest, its growth, and the exact weave

**Claim.**
- (a) `LCORPUS/1` is an RFC 6962 tree (0x00 leaf prefix, 0x01 node prefix, split at the largest power of two below n,
  no duplication) over SHA-256(`LPREP/1`) in shard order. Every inclusion proof verifies for its own leaf and position
  and fails for any other; every consistency proof from a prefix size m < N verifies, so `LGROW/1` is append-only;
  every single alteration is detected; JS and Python give identical roots and proofs.
- (b) Each shard's exact norm-5 weave, `engram_core.chainQuaternion` over the first 8 bytes of each leaf hash in
  order, has norm exactly 5^(28K), unfolds in order to those prefixes (`engram_core.unfold`), equals the ordered
  product of its 7 segment sub-weaves (segCuts) exactly, and has identical components in JS and Python.

**Instances.** (a) The manifest over C0 (K = 148), and synthetic leaf lists with K ∈ {1, 2, 3, 7, 84, 200, 1000, 1001}
from `Rng(1000 + i)`. Tampers, every one of these classes for K ≤ 200: single replace, delete, insert, adjacent swap,
duplicate-last, truncation with the old root kept; 2,000 sampled from `Rng(2000 + i)` for larger K. Consistency
proofs: every m < N for K ≤ 200; 2,000 sampled otherwise. (b) Every C0 shard.

**Metric.** Counts of undetected alterations, proofs accepted for a wrong leaf or position, proofs rejected for the
right one, failed consistency proofs, JS/Python mismatches, and weave failures. Reported: proof sizes and times, weave
bits per component.

**Controls that must fail.**
1. The `shdccp/2` Merkle rule (pairwise SHA-256 over hex, odd node duplicated) must give equal roots for L and for L
   with its last element duplicated, at every odd K ≥ 3 among the synthetic K (the CVE-2012-2459 class).
2. An XOR summary of the same leaf prefixes must miss at least one adjacent swap that the weave detects.

**Decision.** Exact and all-or-nothing: supported with 0 failures, refuted by 1, void if a control fails to show its
weakness.

**Prediction.** Supported. Spike S4: inclusion proofs of at most 10 hashes at 1,000 leaves and 14 at 10,000; 9/9
Certificate Transparency reference roots and RFC 6962's 7/7 worked proofs reproduced; the `shdccp/2` rule collides at
every odd K ≥ 3 (not at K = 1); the exact weave at K = 84 has norm 5^2352 and components of about 2,730 bits.

## L10 · The hardened, attested import

**Claim.** Our lexicon importer, in JS (WebCrypto) and Python (`cryptography`), accepts every clean attested record and
rejects every record in the registered tamper set, naming the failing check. Its verdicts are reported separately as
**self-consistent** and **authentic**, and are identical in both languages. Owl's `verifyIntegrity` accepts the
classes only our checks catch.

The hardened checks: packet parity; decode, then re-encode each chunk and require the stored residual to be
byte-identical (canonical encoding); recompute `crystallize(chunk)` and require the stored packet; leafHashes and
merkleRoot mandatory and recomputed with the JS rule; weaves and chainId recomputed; the derived layers and the exact
weave recomputed; the `LPREP/1` commitment recomputed; the ATTEST/1 ECDSA P-256 signature verified (P1363 converted to
DER for Python, and DER back to P1363 with r and s left-padded to 32 bytes) against a pinned key-registry snapshot,
refusing revoked keys; LCORPUS inclusion and LGROW consistency. The importer takes the signer's identity from the
registry, never from fields outside the signed payload, and keys nothing by signature bytes (a signature's high-S twin
also verifies).

**Instances.** 50 C0 shards, indices from `Rng(1000 + i)`. Each `LPREP/1` commitment is attested in BioChain's exact
ATTEST/1 format (`ATTEST/1|keyId|keyVector|SHA256(commitment)|epochToken`) with an ECDSA P-256 test key generated per
run; the public JWKs, statuses and a key-registry snapshot are written with the run. Tamper classes, 50 records each,
drawn from `Rng(2000 + i)`:
- T1 leafHashes and merkleRoot removed;
- T2 one packet's crystal32 changed, parity re-fixed;
- T3 an `LPREP/1` field changed (the vocabulary hash);
- T4 signed by a key marked revoked;
- T5 a valid attestation of a different shard;
- T6 a Tier-P salted commitment checked with a wrong salt;
- T7 two frames swapped in the stream;
- T8 chainId altered;
- T9 one residual bit flipped such that the chunk still decodes to the same bytes (a non-canonical encoding).

In all, 450 tampered records and 50 clean ones.

**Metric.** False accepts and false rejects in each language, and the agreement of JS and Python verdicts (both
components). Exact.

**Controls that must fail.**
1. Owl's `verifyIntegrity`, run from the Owl checkout, must accept at least one T1, one T2, one T8 and one T9 record.
   If not, that class's gap claim is withdrawn and the class is void.
2. Python verification without the P1363-to-DER conversion must reject every valid signature.

**Decision.** Supported if there are 0 false accepts and 0 false rejects in both languages and the verdicts are
identical; refuted by any one; void as stated in the controls.

**Prediction.** Supported. Spike S4 found that Owl's `verifyIntegrity` accepts T1, T2, a flipped checksum, T8 and
residual flips that decode the same (3.55% of single-bit residual flips), and rejects T7; a re-encode check rejected
689/689 of those flips. Spike S7 found that Python verifies WebCrypto signatures only after the P1363-to-DER conversion (0 of 200 raw), that the reverse conversion must left-pad r and s to 32 bytes (a short r or s occurs in about 1 signature in 128), and that the high-S twin of a signature also verifies, so the importer never keys anything by signature bytes.

## L11 · Verification is cheap enough for corpora

**Claim.** A holder verifies a full C0 shard with every hardened check of L10 (and the V0 id stream and
`addrTableRoot` recomputed) in a median of at most 250 ms in Node, single-threaded, on this container. A 1,000-shard
corpus therefore verifies in under about 5 minutes.

**Instances.** Every C0 shard of at least 59,000 bytes (147), 3 timed repetitions each with `process.hrtime.bigint`,
the first discarded.

**Metric.** Median per-shard time with its bootstrap interval. Reported: the breakdown by step, and the Python time.

**Control that must fail.** A run with the attestation step skipped must be faster; otherwise the step is not being
timed and the test is void.

**Decision.** Supported if the upper end of the interval is ≤ 250 ms; refuted if the lower end exceeds 500 ms;
inconclusive otherwise.

**Prediction.** Supported, with a median of about 50–150 ms. Spike S4 measured the codec part (parse and parity,
decode, crystal re-check, leaves and root, weaves and chainId, exact weave) at a median 41 ms per verb shard; the
re-encode adds about 25 ms; spike S7 measured ECDSA verification at about 0.12–0.23 ms per shard.

---

## What none of this decides

- Whether hyperbolic geometry helps a language model. Stage-2 claims (lexical semantics), Stage-3 claims (small MLM
  pretraining on BabyLM) and Stage-4 claims (GLUE, MTEB) are registered by amendment before any code for them, and
  most need a wider network or a GPU.
- Whether the norm-5 address carries meaning beyond WordNet's spanning tree. One address per synset is one sense,
  without context; `##` pieces get orthographic addresses.
- Whether SHD-CCP's maintainers adopt any proposal in `proposals/`.

## Amendments

### Amendment 1 · 2026-11-05, Phase 1, before any code for the claims

Written at the start of Phase 1, after the network was widened and before any module of `reference/lexicon/`, any
vocabulary or any runner existed. No result of any claim was known when it was written. It fixes the definitions
that the registration left open (the V0 trainer, the token map A, the tie listing) and the readings that each
claim needs before code can be written. Nothing registered above is changed: where a reading below could be
read as a change, the reason is given.

**1. N_B, exactly.** The input is a UTF-8 byte string; invalid UTF-8 is rejected and its first bad byte offset
reported. The steps are BERT's `BasicTokenizer` (google-research/bert `tokenization.py`), on the pinned table:
1. Drop U+0000, U+FFFD and every code point whose 15.1 category starts with C (Cc, Cf, Co; Cs cannot occur in valid
   UTF-8), except tab, line feed and carriage return; Cn is kept for step 4. Tab, LF, CR and Zs become U+0020.
   (BERT drops every C category. Explainer 3 listed Cc and Cf only; BERT's rule, which also drops Co, is the one
   used. Cn is not dropped because D5 makes it fail closed.)
2. Put U+0020 before and after every code point in BERT's CJK ranges: 4E00–9FFF, 3400–4DBF, 20000–2A6DF,
   2A700–2B73F, 2B740–2B81F, 2B820–2CEAF, F900–FAFF, 2F800–2FA1F.
3. Split on whitespace as Python's `str.split()` does after step 1: U+0020, U+2028 and U+2029 (the only code points
   that `str.isspace` holds for and that survive step 1). Each piece is a *whitespace token*.
4. A whitespace token that contains a code point unassigned in 15.1 (category Cn) **fails closed**: it becomes one
   word written `[UNK]`, its byte span is logged, and steps 5–6 skip it.
5. Lowercase the token as CPython 3.13's `str.lower` does at 15.1 (full mappings; Final_Sigma decided inside the
   token, from the table's Case_Ignorable and cased-not-ignorable sets), then NFD (recursive canonical
   decomposition, algorithmic Hangul, stable canonical ordering by combining class), then drop every code point of
   category Mn.
6. Split off punctuation: each code point in BERT's ASCII ranges 21–2F, 3A–40, 5B–60, 7B–7E, or of a 15.1 category
   starting with P, becomes a word of its own; the runs between them are words. Empty words are dropped.

N_B returns the words in order, each with its byte span `[start, end)` in the input: the smallest start and largest
end of the input code points its code points came from (a code point made by lowercasing or decomposition comes
from the one it was made from). The *normalised text* is the words joined by single U+0020, as UTF-8. N1 (the
registered fallback) is unchanged.

**2. Tokenization and the id stream.** WordPiece is BERT's greedy longest-match-first on each N_B word, counting
characters as code points: a word of more than 100 code points, or one with no complete match, is one `[UNK]`; a
fail-closed word is one `[UNK]`. A piece's byte span is that of its code points, as in N_B. L1's control 2 is the
same loop taking the shortest matching piece first. An instance's ids are its pieces' ids, without [CLS] or [SEP].
The *id stream* of an instance set is, over its instances in order, LEB128(number of ids) followed by LEB128 of each
id; its SHA-256 is the one L1 compares. L1's instance strings: (a) the gloss field after ` | `, trimmed, as in
`golden/wordnet_v1.cjs`; (b) the rest of each `# text = ` line, without its line ending; (c) each case's string;
(d) as registered, code points drawn uniformly from the pool listed in L1 as one list in code-point order.

**3. The V0 "lex0" trainer** (the HF WordPiece trainer's family: byte-pair merges with `##` continuations):
1. Corpus: L1 instance (a) through N_B; the words, fail-closed words and words of more than 100 code points left
   out, counted by frequency.
2. Each word is a sequence of symbols: its first code point c, then `##` + each later code point.
3. Entries 0–4 are `[PAD]`, `[UNK]`, `[CLS]`, `[SEP]`, `[MASK]`. Then the alphabet: for every code point seen in
   the counted words, in code-point order, the entry c; then, in the same order, `##` + c (both forms for every code
   point, so a character seen only at a word's start still tokenizes inside a word).
4. Repeat: count every adjacent symbol pair, weighted by word frequency (a pair twice in a word counts twice); take
   the pair with the largest count, ties to the smallest (left, right) in code-point string order; replace it in
   every word, left to right without overlap, by the merged symbol (left + right without its `##`); append the
   merged symbol as a new entry unless it is already one.
5. Stop at 8,192 entries, or when the largest count is below 2 (then V0 is smaller, and that is reported).
The file is one entry per line, LF after each, id = line number; `golden/make_vocab_v0.py --check` retrains and
compares its SHA-256. V0 is frozen when that file is committed, before any decisive run. V1 is
`bert-base-uncased`'s `vocab.txt` at a pinned Hugging Face revision, SHA-256 in `golden/vocab_v1.meta.json`; it is
pinned now, so L1's second cell is in force.

**4. The token map A** (Stage D; used from Phase 3, fixed now). Each vocabulary entry gets one reduced word:
- Root 5: the specials (`[PAD]`, `[UNK]`, `[CLS]`, `[SEP]`, `[MASK]`, and V1's `[unused…]`) and every whole-word entry
  made only of digits 0–9 or only of N_B punctuation; the j-th such entry in id order gets [5] followed by j in
  max(1, ⌈log₅ n₅⌉) base-5 digits, most significant first, each choosing `P.children(word so far)[digit]`.
- Root 0 (nouns) and root 1 (verbs): a whole-word entry equal to a WordNet lemma (index files, single words) takes
  the part of speech with the largest `tagsense_cnt` among those whose index lists it (ties in the order noun, verb,
  adjective, adverb). For a noun, its address is the L3 word of the first synset that `index.noun` lists for it; for
  a verb, the verb-forest word (item 6) of the first synset in `index.verb`.
- Root 2: entries whose part of speech chosen that way is adjective or adverb; root 3: every `##` entry (the `##`
  removed); root 4: every other whole-word entry. Each gets [root] followed by its characters, each written as its
  index in the vocabulary's trie alphabet (the distinct code points of all entries outside root 5, `##` removed, in
  code-point order) in max(1, ⌈log₅ A⌉) base-5 digits, A the alphabet's size, chosen the same way.
- A is not injective: synonyms whose first senses coincide share an address. The number of shared addresses is
  reported.

**5. Ties and rank lists** (the tie listing the registration named). The ranking key is exact: for the hyperbolic
arms −⟨x, y⟩ in the Lorentz form (larger is farther), for the flat arms the squared Euclidean distance. A query's
*rank list* is its candidates sorted by key, then by synset offset, each written `offset g` (g the 0-based index of
its exact tie class), lines joined by LF; L4(a) hashes it. AP is computed on the order (key; non-neighbours before
neighbours inside a tie class; offset), which is the registered pessimistic rule. A neighbour's *rank* (for mean
rank) is 1 + the number of non-neighbours whose key is at most its own.

**6. L3 readings.**
- The Python twins of the named JS functions decide the Python side: `hpstep.decode3d.TreeEmbedding3D` (t = 3/4)
  `point_exact` and `decode_exact` for H³; `hpstep.problems` `word_quaternion`, `right_divide` and `is_reduced` for
  `certifyWord`'s three checks. The H² tree is D3's, as spike S2 built it: root letters 0–5 take the six root
  directions in the order D3 lists them; exact greedy decoding carries the point into each frame with J Mᵀ J and
  takes the allowed child direction with the largest exact dot product with the spatial part, ties to the lower
  index.
- (d) is checked on every node: walking its word through a trie of all words, the synsets met at proper prefixes
  must be exactly its spanning ancestors.
- (f): node i of the 2,000 is `Rng(1000 + i).below(82115)` in offset order. The canonical point list is one line
  per noun in offset order, `offset tree c0 c1 c2 [c3]`, H³ lines then H² lines, each coordinate in lowest terms as
  `p/q` (q ≥ 1, written even when 1).
- (g): a word longer than 25 (id59) or 27 (id64) letters is reported as not covered, not as a failure.
- Control 3 runs on every noun word longer than 12 letters; control 4 on every noun word.

**7. L5 readings.**
- *Flat arms.* F3 and F2 keep the trees' frames and directions without the boost: a node is an affine frame (R, p);
  its child along the direction u (the one the hyperbolic tree uses) gets R' = R·R(u) and p' = p + ℓ·R'·e₁, with
  R(u) the same rotation (`rot_to` in R³; the rotation taking (1, 0) to u in R²). F uses ℓ = 1 for every edge; F\*
  uses ℓ = (1/4)^k for the edge into a word of length k + 1 (the first letter's edge has length 1).
- *S3.* Permutation i draws from `Rng(2000 + i)`: for each word length in increasing order, the words of the
  instance set's synsets of that length, in offset order, are permuted by `shuffle`. A query's S3 AP is the mean of
  its APs over the permutations.
- *K3.* The word is `engram.address.encode(v)` (= `engram_core.encode`), v the first 8 bytes of SHA-256 of the
  first lemma of the synset's data line (as stored, UTF-8) read big-endian: 28 letters from the root.
- *Instance sets.* Mammals: the 1,176 spanning-subtree synsets, each a query against the other 1,175; graph-edge
  neighbours are its spanning parent (when inside the set) and children; closure neighbours are its closure ancestors
  and descendants inside the set. Nouns: queries `Rng(1000).sample(82115, 1000)` (indices in offset order) against
  the other 82,114; neighbours as above over all nouns.
- *Reported metrics.* Distortion is the mean of |d/(τ·d_T) − 1| over the mammal pairs, and over each noun query
  against the nouns whose offset-order index is a multiple of 82, with d the geodesic (H) or Euclidean (F) distance
  in float64, d_T the word tree distance (`P.treeDistance`), τ = ln 7 (H³), ln 12 (H²), 1 (F); not computed for F\*.
  Bits per node: the point over one common denominator, numerator bits plus denominator bits, mean and maximum.
- *Intervals.* The mean of the per-query paired AP differences (exact APs, differenced in float64), with the 95%
  percentile bootstrap of Hyperbolic Oracles' `ci_mean`: numpy `default_rng(7)`, 10,000 resamples of the queries,
  `percentile` 2.5 and 97.5.

**8. L2 readings.** A type is a lemma string with `_` read as a space, through N_B, its words joined by single
spaces; types are deduplicated after N_B (a lemma with a fail-closed word is left out and counted). The engram/1
key is `hex_lsb(crystallize(type))` in `engram.ttmpt`, and the same packing of `crystallize(type)` from
`ttmpt_core_v1.js` in Node. The control key is the first 8 bytes of SHA-256 of the type's UTF-8, big-endian. The key
table is the lines `type TAB key`, types sorted by code point, joined by LF, and is compared by SHA-256.

**9. L7 readings.** A random reduced word from a generator: length 1 + `below(60)`, root letter `below(6)`, then
`P.children(w)[below(5)]` each time. (b)'s mammal addresses and (e)'s are the L3 words of the 1,182 closure-set
synsets.

**10. Dry runs** (+3000 on every seed, per the common rules): L3 and L5 on the verb forest (verbs' first `@`
pointer; the 559 roots are the children of a virtual root at [1], with the L3 rule), L5's queries
`Rng(4000).sample(13767, 200)`, S3 from `Rng(5000 + i)`; L2 on the words of the repository Markdown spike S6 used;
L7 with `Rng(4000 + i)` and `Rng(5000 + i)` words and q = 13 only. Traces for the browser core use seeds 8000 + i,
which no claim uses.

### Amendment 2 · 2026-11-05, Phase 1, after the dry run and before any decisive run

Written after the reference was built, reviewed and dry-run (`reference/results/dry/`), and before `run_claims.py`
ran on any registered instance. No claim result was known when it was written. Nothing registered is changed.

**1. A disclosure.** While the geometry modules were being written, a builder's timing script ran L3's `certify`
and the prefix check of L3(d) over all 82,115 noun words to measure their cost. Its outcome was neither reported nor
looked at, and no code was changed after it. Both checks are exact, deterministic and all-or-nothing, with nothing
to tune; the decisive run recomputes them. It is recorded under the rule "Reporting".

**2. An erratum to Amendment 1, item 1.** Its parenthesis "BERT drops every C category" is wrong for
google-research/bert, whose `_is_control` drops only Cc and Cf; Hugging Face transformers' copy of the
`BasicTokenizer` is the one that drops every C category. The rule of step 1 is unchanged (Cc, Cf and Co dropped, Cn
kept to fail closed): it is the stated rule, and no L1 instance contains a Co code point. Explainer 3's "Cc, Cf"
described google's BERT; it will state the rule in force.

**3. Readings fixed in the reference** (each marked `READING` in its code):
- *N_B.* The offset reported for invalid UTF-8 is where the first ill-formed sequence starts (Unicode Table 3-7,
  Python's `UnicodeDecodeError.start`). L1's control 3 (accent stripping off) skips NFD and the Mn removal and keeps
  the lowercase, as BERT does when `strip_accents` is off. A fail-closed word is one `[UNK]` piece with the
  whitespace token's span.
- *L1 (d)'s pool.* Each named class is its whole block or range (Greek is U+0370–03FF, whose 9 code points
  unassigned in 15.1 fail closed). "The code points of the stress set assigned after Unicode 15.1" are the 64 of the
  stress set's `post151First64` list, which spike S6 wrote as L1(d)'s pool, not all 9,988 such code points. The union
  without repeats has 12,726 code points. Uniform draws from it practically never give a final-sigma context; L1's
  Final_Sigma risk point is carried by (c)'s 444 Final_Sigma cases. The four instance lists are pinned by count and
  an order-sensitive digest in `reference/golden/l1_instances_v1.meta.json`.
- *Reported tokenizer metrics.* Bytes per token is input bytes over ids; Rényi efficiency at α = 2.5 is H₂.₅ of
  the unigram token distribution over the log of the vocabulary's entry count (the variant over the distinct tokens
  seen is also reported). V0's alphabet is the 64 code points of instance (a), which is ASCII, so under V0 a word with
  a non-ASCII letter is `[UNK]`; this is reported and does not bear on L1's byte identity.
- *L2.* A lemma whose N_B text is empty would be left out and counted, as a fail-closed one is.
- *L3.* The truncation control gives every child one letter, the digit min(k, 4). The authority for H³ decoding is
  hpstep's `decode_exact` on every node; an integer decoder is a reported cross-check. The canonical point list's
  tree tokens are `H3` and `H2`. D6's codec counts the empty word (id 0), and the first letter is the most significant
  digit.
- *Map A.* Roots are decided in the order root 5, lemma, `##`, other, so an all-digit lemma is in root 5; `##` is
  removed once; N_B punctuation is read from the pinned table. Item 4's "verb-forest word (item 6)" means item 10.
- *Rank lists* have no final LF.
- *L5.* Mean rank pools every (query, neighbour) pair, as Nickel & Kiela do. Distortion is computed for H3, H2, F3
  and F2 and leaves out pairs at tree distance 0 (two synsets with one word). Bits per node are reported for the six
  construction arms. F\*'s (1/4)^k applies per letter, as item 7 says, so a virtual letter shortens the edges after it.
  A query without graph-edge neighbours has no AP and is left out of the paired differences, and counted (none among
  the nouns or mammals; isolated roots in the dry run's verb forest).
- *L7.* (a)'s bipartiteness is required where (5|q) = −1 and reported otherwise. The trivial eigenvalues are the
  top and, for a bipartite graph, the bottom of the sorted spectrum, and their multiplicities are reported. (e)'s
  registered control multiplies the doubled-coordinate generators as plain integer quaternions and compares without
  dividing by 2^L; SHD-CCP's product without its final halving is reported as a second control. The spread over
  vertices is reported for all noun addresses.

**4. The reviews.** Before this amendment, two adversarial reviews (four reviewers per track, two skeptics per
finding) checked the reference against the registration and Amendment 1 by independent reimplementation, on
unregistered data only. An independent naive trainer rebuilt V0 byte for byte; an independent N_B oracle agreed on
every L1 instance and on 6.7 million code-point contexts; independent Fraction trees, flat arms, rankings, the id
codec and L7 agreed without a mismatch. The findings they confirmed were gaps in tests and pins (a trace check that
skipped the normaliser trace when V1 was not cached, an incomplete guard against platform Unicode calls, a decoder
test that did not test off-tree points, a mislabelled control), all fixed in the reference before the decisive run.

### Amendment 3 · 2026-11-05, Phase 1 write-up: a correction to Amendment 2

Written after the decisive run of L2, L3 (the Python side), L5 and L7, while writing it up; it changes no rule and no
result. Amendment 2, item 4, says the reviews worked "on unregistered data only". That holds for the geometry
review, but not for the text track: the builder's tests and the text review compared the Python N_B and WordPiece
with Python oracles (built on Python's own Unicode functions and on BERT's WordPiece loop) over L1's instances (a),
(b) and (c), and the review retrained V0 on instance (a), which is how V0 is registered to be trained. None of this
is L1's metric, which compares the Python reference with Node and Chromium and has not been run, and none of it
decided anything: L1 is decided in Phase 2. It is recorded under the rule "Reporting". Also for the record: the
header of `reference/results/claims.json` reads "PREREGISTRATION.md with Amendment 1", the runner's fixed label; the
run used the code at 88e63f7, which includes Amendment 2.

### Amendment 4 · 2026-11-05, Phase 2, before any code for its claims

Written at the start of Phase 2, before `lexicon_core.js` or any Phase 2 runner existed. No result of L1, L3(f) or
L4 was known. It fixes how the engines are run and compared; nothing registered is changed.

**1. Engines.** Python is the Phase 1 reference (Python 3.13, the authority). Node is Node 22 running
`lexicon_core.js` (new, UMD, in this folder) on the shared cores loaded unchanged by relative path
(`hyperbolic_core.js`, `decoder3d.js`, `orbital_core.js`). Chromium is the Playwright Chromium installed on the
build machine, headless, loading `lexicon_core.js`, the cores and the pinned data from a page served over HTTP from
the repository root. Every result records the versions (Python, Node, Chromium, ICU and Unicode).

**2. L1, the comparison.** For an instance (its UTF-8 bytes) and a vocabulary, the *record* is the normalised text
as hex, a tab, then the pieces separated by single spaces, each `id,start,end,hex` (the piece's UTF-8 hex; `-` for
none), as in `traces/wordpiece_v1.txt`. An instance *differs* in a runtime when the SHA-256 of its record differs
from Python's (the records themselves are compared when a digest differs, and kept as counterexamples). The id-stream
SHA-256 is Amendment 1 item 2's, per instance set and vocabulary. Node loads the four instance lists itself, with
JavaScript loaders (the WordNet archive through `golden/wordnet_v1.cjs`, the EWT files, the stress set, and
`Rng(1000 + i)` with the pool of Amendment 2), and must match `golden/l1_instances_v1.meta.json` before it runs;
Chromium receives Node's bytes. The cells are V0 and V1, each in Node and in Chromium.

**3. L1's controls.** (1) As spike S6 implemented it: for each case of (c), the platform's
`s.toLowerCase().normalize('NFD')` with every `\p{Mn}` removed, against the reference's lowercase, NFD and Mn removal
of the same string (the pinned table's, as S6 compared them); run in Node and in Chromium. (2) Shortest-match-first
WordPiece and (3) N_B without accent stripping, in the reference, against the registered pipeline on (a) and on (a)
or (b). Reported, not decisive: agreement with Hugging Face `tokenizers` (`BertWordPieceTokenizer` on the same vocab,
lowercase, accents stripped, text cleaned, CJK handled; the version recorded), and the tokenizer metrics of
Amendment 2, per instance set and vocabulary, from the reference.

**4. L3(f).** Node builds the noun words with `lexicon_core.js`'s address rule from the archive read by
`golden/wordnet_v1.cjs`, the H³ points with `decoder3d.js` `pointExact` (t = 3/4) and the H² points with
`lexicon_core.js`'s exact H² tree (D3). Its canonical point list (Amendment 1 item 6) must have the SHA-256 that
`reference/results/claims.json` records, and its lines for the 2,000 sampled nodes must equal
`reference/results/l3f-python.txt` line for line (word, H³ line, H² line).

**5. L4(a).** Rank lists (Amendment 1 item 5) in Python and Node, in H³ and H², for every query of the mammal
spanning subtree (candidates: the other 1,175) and for queries 0–199 of the noun query sample (candidates: the other
82,114 nouns). Equal means every rank list's SHA-256 is equal and the graph-edge and closure MAP and mean rank
(pooled, Amendment 2) are equal as exact rationals. The mammal part is also run in Chromium and reported.

**6. L4(b) and its controls**, decided by the reference (Node's counts are reported). *Float64 ranking:* each
coordinate of an exact point is rounded to the nearest float64 (correct rounding of the rational), and the key is
x0·y0 − x1·y1 − x2·y2 (− x3·y3) evaluated left to right in IEEE-754 double, without fused multiply-add. For each of
the 1,000 noun queries, the candidates are taken in exact order (item 5 of Amendment 1); an *inversion* is an
adjacent pair whose exact keys are strictly increasing and whose float keys are strictly decreasing. A query counts
if it has at least one, in H³ or in H²; per-tree counts, float ties of strictly ordered pairs, and the word length of
the deeper word in each tree's first inversion are reported. *Control 1:* the mammal points rounded to float64, then
to float32, the key computed in float32 arithmetic (numpy), over every mammal query in H³; at least one inversion,
or (b) is void. *Control 2:* for each mammal query in H³ with an exact tie between a graph-edge neighbour and a
non-neighbour, a float evaluator that sorts by float64 `acosh(max(1, key))` and then by node index gives an AP; it
must differ from the pessimistic exact AP on at least one such query (N/A, not void, if there is none).

**7. Dry runs** (+3000): L1 on `Rng(4000 + i)` strings and on the repository Markdown spike S6 used (one instance per
file); L3(f) on the verb forest; L4 on the verb forest with queries `Rng(4000).sample(13767, 200)`.

**8. Order.** Before any decisive run, `tests/parity-lexicon.cjs` must reproduce every Phase 1 trace
(`reference/traces/*.txt`) line for line in Node (the common rule "Authority"), and the runners are committed after
their dry runs.

### Amendment 5 · 2026-11-05, Phase 2, after the dry run and before any decisive run

Written after `lexicon_core.js` and the runners were built, reviewed and dry-run (`reference/results/dry/`), and
before any decisive run of L1, L3(f) or L4. No result of these claims was known. Nothing registered is changed.

**1. Disclosures.** While building, the text builder timed N_B and WordPiece over instance (a) in Node (a time
only: nothing was compared or printed), and the geometry builder built all noun words and points in Node to time
them (times only, no claim metric). Both builders and the reviewers compared the JS against Python on the Phase 1
traces, the registered dry sets and strings from unregistered seeds (70000 + i), and hashed L1's instance lists
against their pins; none of that is a decisive comparison.

**2. Readings fixed in the code** (each marked `READING`):
- *L1's record.* An empty normalised text is written `-`, as in the traces, so an instance with no words has the
  record `-` TAB `-`. A list's digest is the SHA-256 of its per-instance hex digests, each followed by LF.
- *L1's cells.* V0 and V1, each in Node and in Chromium. The decisive run refuses to start without V1, or if any
  trace line is skipped. A cell that does not run leaves L1 inconclusive. A cell is void before it is refuted, as in
  Phase 1.
- *L1's control 1* runs on (c) and is decided, per runtime, against the reference's per-case SHA-256 of S6's
  R(s) (the pinned table's lowercase, NFD and Mn removal of the whole string). The JS table pipeline's own per-case
  list, which must equal the reference's, is reported. If control 1 passes in a runtime, that runtime's cells are
  void.
- *L1's Data line.* No UD EWT text enters a committed file: examples for (b) keep the instance, the offset of the
  first difference, and each field's SHA-256 and length; the text goes to the cache.
- *L3(f)* inherits Phase 1's L3 controls (all of which failed as required).
- *L4's control 2.* The registration says a passing control 2 voids "the test" without naming a part; it voids
  both L4(a) and L4(b).
- *L4(b).* Float keys follow IEEE-754: an infinite key takes part in comparisons; a NaN key is neither an inversion
  nor a tie; non-finite keys are counted and reported. A tree's first inversion is the first in exact order within
  the first query, in sample order, that has one; its deeper word is the longer of the pair. Control 1 rounds to
  float64, then to float32, and computes in numpy float32 (the JS reports the same with `Math.fround` after each
  operation). Control 2 uses graph-edge AP from the float order, Python's `math.acosh`, and node indices in offset
  order.
- *Dry stand-in for the mammals:* the spanning subtree of change.v.01 (00126264), 1,700 verbs.
- *Hugging Face agreement* compares token strings only (reported).
- *L3's control 3 in JS* (reported only): `decoder3d.js`'s float `point` multiplies its frames right to left, while
  hpstep's multiplies left to right, so the JS count is its own; the reference decides that control.

**3. Environment of the dry run** (the decisive run records its own): Python 3.13.18 (Unicode 15.1.0), Node
22.23.4 (ICU 78.3, Unicode 17.0), Chromium 153.0.8010.12 through Playwright 1.63.0, Hugging Face `tokenizers` 0.23.3.

**4. The review.** Before this amendment, an adversarial review (three reviewers, two skeptics per finding)
checked the core and the runners by independent probes on unregistered data and found no defect in N_B, WordPiece
or the geometry. It confirmed three gaps, all fixed before this amendment: the guard against platform Unicode calls
missed a call made through a computed name; L1 could be decided without its V1 cells; and UD EWT text could reach the
committed JSON.

