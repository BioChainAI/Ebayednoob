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

### Amendment 6 · 2026-11-05, an erratum to L6's protocol attribution

Written after Phase 2's decisive run, while re-checking literature numbers once arxiv.org and github.com could be
read. L6 has not run (Phase 4); nothing registered changes. L6's instances say "Training (Nickel & Kiela): softmax
loss over 1 positive and 50 negatives ...; batch 50; 20 burn-in epochs at lr/10, 1,000 epochs in all". The paper
(arXiv:1705.08039v2) samples 10 negatives per positive (Sec. 4.1) and uses a burn-in of 10 epochs at η/10 (Sec. 3.2),
and states no batch size or epoch count. The 50 negatives, batch 50 and 20 burn-in epochs are those of the authors'
released script (facebookresearch/poincare-embeddings@dff101b, `train-nouns.sh`), which also runs 1,500 epochs and
its burn-in at lr × 0.01. The registered protocol is therefore this project's own, after the paper and the script,
and it is kept exactly as registered: 1 positive and 50 negatives, batch 50, 20 burn-in epochs at lr/10, 1,000 epochs,
float64. No page describes the protocol yet; Phase 4's write-up will give it as this project's own.

### Amendment 7 · 2026-11-05, Phase 3, before any code for its claims

Written at the start of Phase 3, before any record, grower port, manifest, verifier or runner for L8–L11 existed. No
result of these claims was known. It fixes the definitions the registration left open; nothing registered is changed.

**1. Code and authorities.** The JS grower, records, manifest and hardened verifier are a new section of
`lexicon_core.js` (on `biochain_v1.js`, `engram_core.js` and `orbital_core.js`, unchanged); the Python port is
`reference/lexicon/chain.py`, `records.py`, `manifest.py` and `attest.py`. Owl Academy's `scripts/biomesh.js` at
7f45f35 and BioChain-AI's `src/biomesh/biomesh.js` at c975161 (and its `src/identity/*.js` for ATTEST/1) run unchanged
in Node by name-grab, as spikes S4 and S7 ran them. Owl's code is the authority for L8(a, b); the Python reference
for L8(d), L9 and L10's verdicts, which the JS must equal.

**2. L8's synthetic shards.** Shard i (i = 0..19) is drawn from one `Rng(1000 + i)`: a target length 20,000 +
`below(40,001)` UTF-8 bytes, then code points until the next would pass the target, each from a class chosen by
`below(100)`: < 40 an ASCII letter, < 50 a space, < 55 ASCII punctuation (S4's set), < 85 a two-byte code point
(U+0080 + `below(0x780)`), < 95 a three-byte one (U+0800 + `below(0xF000)`, skipping the surrogates as S4 does), else
a four-byte one (U+10000 + `below(0x100000)`). If no chunk of the grown shard has a crystal containing the byte 0x80,
the same generator draws the shard again, and the number of draws is reported. Every shard has at least 25% two-byte
characters by count, which the run checks. Each shard, and each C0 shard, is grown with engrams on and off.

**3. The records** (each a pipe-joined UTF-8 string, its hash the lowercase hex SHA-256 of those bytes; `-` for an
empty field):
- `LVOCAB/1|vocabSha256|normaliserSpecSha|unicodeTablesSha|wordpiece-greedy/1|lex0-bpe/1|trainSetSha|-|specials` with
  normaliserSpecSha the SHA-256 of `reference/golden/nb_spec_v1.txt` (Amendment 1 item 1 with Amendment 2's readings,
  written once and pinned), trainSetSha instance (a)'s digest in `l1_instances_v1.meta.json`, and specials the five
  special entries with their ids, `[PAD]=0,...`.
- `LADDR/1|vocabSha256|wordnetZipSha256|L3/1|addrTableRoot|3/4|11/13|D3` with addrTableRoot the RFC 6962 root (item 5)
  over the UTF-8 rows `id|token|word|len|h3PointSha|h2PointSha` of map A in id order (word as digits; a point's hash is
  the SHA-256 of its canonical text, Amendment 1 item 6).
- `LPREP/1|corpusId|shardIndex|chainId|merkleRoot|byteLen|rawSha256|spdx|sourceUrlSha|lvocabHash|idStreamSha256|laddrHash|weave3Sha|engramStreamSha|tier`
  with corpusId `wordnet30-c0` (C0) or `lexicon-synth-v1` (the synthetic shards), spdx `LicenseRef-WordNet-3.0` or
  `CC0-1.0`, sourceUrlSha the SHA-256 of the archive's URL (C0) or of `rng:1000+i`, idStreamSha256 the SHA-256 of the
  V0 id stream of the whole shard text as one instance (Amendment 1 item 2), weave3Sha the SHA-256 of the exact
  weave's components in decimal joined by `,`, engramStreamSha the SHA-256 of the record's engramStream (or `-` with
  engrams off), tier `S`. A Tier-P record writes chainId `-` and appends `|saltedRoot` with saltedRoot =
  SHA-256(`LPREP-SALT/1|` + salt hex + `|` + merkleRoot + `|` + chainId); the test salt of shard j is the SHA-256 of
  `lexicon-test-salt/1|j`.
- `LCORPUS/1|corpusId|N|root|spdxSetSha|-|-|-|-` (root as item 5; the evaluation-set, contamination and Croissant
  fields are empty until Phase 6). `LGROW/1|corpusId|N_old|root_old|N_new|root_new|proofSha` with proofSha the SHA-256
  of the consistency proof's hashes concatenated. LBENCH/1 is defined when Phase 4 first uses it.

**4. The exact weave.** For a record of K chunks: v_k = the first 8 bytes (16 hex digits) of leafHashes[k], read
big-endian; the weave is `engram_core.chainQuaternion(v_0..v_{K-1})`; its segment sub-weaves are the products of
`packetQuaternions` over the record's segCuts, as spike S4 computed them.

**5. RFC 6962.** Leaf hash SHA-256(0x00 ‖ data), node hash SHA-256(0x01 ‖ left ‖ right), split at the largest power of
two below n, RFC 9162's inclusion and consistency algorithms. LCORPUS leaves are the 32-byte SHA-256 digests of the
LPREP/1 strings. L9's synthetic lists: for the j-th K in (1, 2, 3, 7, 84, 200, 1000, 1001), K leaves of 32 bytes from
`Rng(1000 + j)` (eight `next_u32` each, big-endian). An alteration is detected when the root of the altered list (with
the old size kept for truncation) differs from the original root. For each leaf, its proof must verify for its own
leaf and position, and fail for leaf (i + 1) mod K at position i and for its own leaf at position (i + 1) mod K
(K ≥ 2). L9's controls use these lists (control 1 at K = 3, 7, 1001; control 2 by adjacent swaps).

**6. L10's packages and verdicts.** A package is a JSON object holding the biochain record (Owl's fields), its LPREP/1
string (and for Tier P its salt), an ATTEST/1 block (keyId, keyVector, contentHash, epochToken, sig as P1363 hex), the
LCORPUS/1 string, the inclusion proof, and an LGROW/1 string with its consistency proof from N − 1 shards. The
verifier runs the checks in the registered order and returns `{selfConsistent, authentic, failed}` (the name of the
first check that failed, or `-`). Clean packages are attested by an active key; T4's by a key the registry marks
revoked. Keys: P-256 pairs made per run in WebCrypto; identity and keyVector by BioChain's own `computeIdentityId` and
`deriveKeyVector` on the seed string `hyperbolic-lexicon/phase3` and uid `lexicon`; epochToken
`EPOCH-OFFLINE-<UTC date>`; the registry snapshot (keyId, public JWK, keyVector, status) is written with the run and
pinned by its SHA-256. The 50 clean shards are `Rng(1000 + i).below(148)` for i = 0, 1, … until 50 distinct indices.
Class k's (T1..T9 as k = 1..9) record j draws from `Rng(2000 + 50(k − 1) + j)`: the clean package it alters
(`below(50)`), and the place of the alteration; T5 copies the attestation of the next clean package, T6 checks a Tier-P
version with the salt of shard j + 1, T7 swaps two adjacent frames, T9 flips a residual bit chosen among those that
leave the chunk's decode unchanged (S4's search).

**7. L11.** Per shard, the time of the full hardened verification of its package in Node, single-threaded: the mean of
repetitions 2 and 3. The addrTableRoot depends on the vocabulary and WordNet only, not on the shard, and recomputing it
needs the WordNet archive: it is recomputed once per verification session, its time reported and counted once in the
corpus estimate, and each shard's verification checks its LADDR hash against that value. The literal alternative,
recomputing it inside each shard's timed verification, is also measured and reported (it decides nothing). The
interval is the 95% percentile bootstrap of the median (numpy `default_rng(7)`, 10,000 resamples of the shard times).
The control times the same verifications with the attestation step skipped.

**8. Dry runs** (+3000): L8 on `Rng(4000 + i)` synthetic shards and the verb and adjective gloss shards (spike S4's
cut); L9 on `Rng(4000 + j)` leaf lists and the verb shards' weaves, tampers from `Rng(5000 + i)`; L10 on verb shards
(`Rng(4000 + i)`), tampers from `Rng(5000 + ...)`; L11 on the verb shards of at least 59,000 bytes.

### Amendment 8 · 2026-11-06, Phase 3, after the dry runs and before any decisive run

Written after the Phase 3 code was built, reviewed and dry-run (`reference/results/dry/claims-phase3.*`), and before
any decisive run of L8–L11. No result on a registered instance was known. Items 1–3 change how two things are run
and read; the reasons, and what the dry runs showed first, are stated so a reader can judge them.

**1. The packages are grown with engrams off.** L10's packages, L11's timed packages and L9(a)'s manifest use each
shard's record grown with engrams off; L8 still grows every shard both ways. The registration does not say which.
The Lexicon registered engram/1 as a compatibility checksum, never an input (D4); its design, published in Phase 0
before any measurement, has the engram layer "off by default for corpora" (Explainer 3); and L11's prediction (about
50–150 ms) was built from spike S4's codec-only timing, which has no engram layer. Disclosure: the runner first read
it the other way (Owl's `growBiochain` defaults to engrams on), and in those dry runs L11's median on engrams-on
packages was 243.5–265.5 ms, near the 250 ms bar, against 157–182 ms with engrams off. This reading was fixed after
seeing that. The decisive run times the same shards' engrams-on packages too and reports them beside the decision.

**2. L11's control is replaced.** The registered control ("a run with the attestation step skipped must be faster;
otherwise the step is not being timed and the test is void") was read as a comparison of the two medians. In the dry
runs the attestation step cost 0.7–0.8 ms against a per-verification spread of 10–28 ms: with correct code the
comparison failed by chance (voiding L11), and with the skip deliberately ignored, so that both arms did the same
work, it passed. It cannot show whether the step is timed. As Engram Mind's Eye's Amendment 1 replaced a control that
could not fail, it is replaced by the verifier's own record: every timed full verification must record the
attestation check as run and passed inside the timed window with a time above 0, and every attestation-skipped one
must record it as skipped with every other check passed; otherwise L11 is void. The comparison of the medians and the
paired difference with its interval are reported.

**3. The two verdicts follow Explainer 4.** Explainer 4 (Phase 0) defined *self-consistent* as steps 1–6 and 8 (the
record, its derived layers and its place in the manifest) and *authentic* as step 7 (the signature). The code as
first built counted the inclusion and consistency checks as authenticity; both languages were changed identically
before this amendment (commit 8c51e08). The name of the first failing check, which L10's verdicts also compare, is
unchanged; eight verdict lines of `traces/chain_v1.txt` changed.

**4. Readings fixed in the code** (each marked `READING`): the checks run in the registered order (parity, canonical,
crystal, leaves, weaves, derived, commitment, attestation, inclusion, consistency), the first seven stopping at the
first failure and the last three always running; `failed` names the first failing check. A Tier-P record writes `P`
in its tier field and keeps merkleRoot, only chainId becoming `-`. A point's canonical text in LADDR rows is its
coordinates alone. spdxSetSha is the SHA-256 of the distinct SPDX identifiers, sorted and joined by `,`. A synthetic
shard's sourceUrlSha hashes `rng:<base>+<i>`. T6 checks a Tier-P package with the salt of the shard after its own; T7's
swap of the last two frames can fail at canonical (a short last frame) rather than leaves. A consistency proof from
N_old = 0 is accepted only when empty, with the old root the hash of the empty tree. In L11, a clean package that
fails a check while timed voids L11.

**5. Disclosures.** A container restart cut the first build off during its dry run; the work on disk was kept and
committed (b822237), and the dry run was redone. The builders timed verb shards (dry data) and hashed C0's shard texts
against their pins; no C0 shard was grown, verified or timed. An adversarial review (three reviewers, two skeptics
per finding) confirmed one finding, L11's control (item 2); the others were not confirmed.

**6. Environment of the dry run:** Node 22.23.4, Python 3.13.18 with `cryptography` 50.0.1, Owl Academy at 7f45f35,
BioChain-AI at c975161.

### Amendment 9 · 2026-11-06, Phase 3 write-up: errata to the decisive record

Written after the decisive run of L8–L11 (commit 865791f), while writing it up; it changes no rule and no result. As
Amendment 3 did for Phase 1, it records three things in the Phase 3 records that are out of date or easy to misread.

**1. The label.** The decisive and dry result files (`reference/results/claims-phase3.*` and
`reference/results/dry/claims-phase3.*`) read "PREREGISTRATION.md with Amendments 1-7", a label fixed in the runner
and not updated when Amendment 8 was added. The decisive run records HEAD 6da04be, which holds Amendment 8, and one
uncommitted path, its own console file. The runner now takes the label from PREREGISTRATION.md when it starts.

**2. Two readings describe the replaced control.** In the decisive record, READING runner-11 says "the control
compares the two medians", and READING runner-13 says "The registered comparison of the two medians still decides the
control" and that a comparison powered against the noise "needs an amendment". Both texts predate Amendment 8 item 2
and were not updated with it. The code decided L11's control as item 2 says: the record's rule, its `control.what`
and the decision read the step check alone (`step_check.holds`: 441 of 441 timed full verifications ran the
attestation step inside the timed window with a time above 0, and 441 of 441 attestation-skipped ones recorded it as
skipped with every other check passed). The comparison of the medians is reported and decided nothing
(`median_comparison_faster`: true, 153.527 ms skipped against 155.387 ms full). Had the old reading decided, the
outcome would be the same. The runner's texts now say what the code does.

**3. The dry run's HEAD.** The dry run committed in 25b48b3 (`reference/results/dry/`) started at 03:56:57 UTC. It
records HEAD b822237 and uncommitted changes to six files (`lexicon_core.js`, `reference/lexicon/verify.py`,
`reference/run_claims_phase3.cjs`, `reference/traces/chain_v1.txt`, `tests/all.cjs` and `tests/chain-lexicon.cjs`), as
well as its own outputs. These are the six files commit 8c51e08 holds, committed at 03:57:26 UTC, 29 s after the run
started. The record cannot show that they did not change in those 29 s. Dry runs decide nothing.

Two comments were out of date in the same way, and are corrected without any change to code. One is in
`lexicon_core.js`'s notes on the verifier, which still gave the old verdict split. The other is in the header of
`tests/chain-lexicon.cjs`, which said the control "reports authentic null"; it reports the attestation check skipped,
which does not count against authentic.

### Amendment 10 · 2026-11-06, Phase 4, before any code for its claims

Written at the start of Phase 4, before any trainer, evaluator or runner for L6 and L4(c) existed in the repository
(the throwaway prototypes in a scratch folder are listed in item 16). No result of these claims was known: nothing had
been trained, ranked or evaluated on the mammal sets, and the shared generator had drawn from no registered seed
(item 16 lists every probe, and the one call of the statistics constant `default_rng(7)`). It fixes the definitions
that L6 and L4(c) leave open; nothing registered is changed. Where the text allows two readings, the more literal is
taken and the reason is given.
Notation: S is the mammal closure set in offset order (n = 1,182; node i is its i-th offset); anc(u) and desc(u) are
u's closure ancestors and descendants inside S (`wordnet.closure`, `wordnet.descendants`); P17 is arXiv:1705.08039v2,
P18 is arXiv:1806.03417v2, and *the script* is facebookresearch/poincare-embeddings at dff101b
(`dff101b5089a635a751aa45e3a6cb21670a3588e`).

**1. Code and authorities.** `reference/lexicon/embed.py` builds the training data and is the numpy float64 trainer
of items 2–5, D9's authority for the learned tables. `reference/lexicon/stream.py` computes the training stream with
numba 0.68.1 (pinned in `requirements.txt`, `cache=False`): a line-for-line copy of `hpstep/prng.py`'s splitmix32 and
xoshiro128\*\* (`next_u32`, `random`, `below`, `shuffle`). "The numpy reference trainer" drawing "with `Rng(seed)`" is
read as: the trainer's arithmetic is numpy, and its stream is `Rng`'s by definition; numba only computes that stream
(in pure Python it would cost about 330 s a run) and is used for nothing else; `reference/lexicon/pystream.py` gives
the same calls on `hpstep.prng.Rng` for every draw outside training. Before any run, a test must find the copy equal to
prng.py output for output, including `below` on bounds that reject about half the time; and registered tuning and the
decisive run each replay one of their runs' draws with `hpstep.prng.Rng` itself, whose final state must equal the
run's, or that step writes no result (item 14). `reference/lexicon/learned.py` snaps and ranks (item 6, item 10's
float64 ranking); `reference/lexicon/l6.py` holds the controls, intervals, decisions, tuning choice and LBENCH/1
(items 7–12); `reference/run_claims_phase4.py` is the runner. MAPs are decided by the Python reference through
`rank._ap_and_ranks`, `map_exact`, `mean_rank`, `paired_diffs` and `ci_mean`, unchanged; no other evaluator decides.
The trainer calls no BLAS routine (no `@`, `dot`, `einsum` or `linalg`). The runner sets `OPENBLAS_NUM_THREADS`,
`MKL_NUM_THREADS`, `OMP_NUM_THREADS`, `NUMEXPR_NUM_THREADS` and `NUMBA_NUM_THREADS` to 1 before numpy is imported. Each
run is one single-threaded process; running four at once changes no bit.

**2. The instance and its neighbour sets.**
- *Positives.* The 6,542 pairs (u, v) with v ∈ anc(u), in order of (index of u, index of v). u is the anchor and v
  the positive; one direction only, the script's (`wordnet/transitive_closure.py` line 24; `train-nouns.sh` does not
  pass `-sym`).
- *Non-neighbours.* NN(u) = S \ ({u} ∪ anc(u) ∪ desc(u)), in index order: the complement of the registered closure
  neighbours (Amendment 1 item 7). mammal.n.01 (01861778) has none and is never an anchor; placental.n.01 (01886756)
  has 49; over the anchors |NN(u)| runs from 49 to 1,180. The runner asserts |NN(u)| ≥ 1 for every anchor; no
  fallback exists. The script rejects only u and its ancestors, and so draws descendants as negatives (16,439
  anchor–descendant incidences per epoch here); that is not followed, because the registered metric scores them as
  neighbours.
- *Evaluation.* Closure neighbours are `rank.closure_neighbours`; graph-edge neighbours are `rank.graph_neighbours`
  with the full noun `spanning_forest`. Closure MAP has all 1,182 queries, each against the other 1,181. mammal.n.01
  is one of them: its AP is 1 under every ranking, and it is counted as the one query without non-neighbours.
  Graph-edge MAP has 1,176 queries. 01322508, 01322604, 01322898, 01322983, 01323068 and 01862399 have their spanning
  parents outside S and no children in S, so they have no AP: they are left out of the MAP and of every graph-edge
  difference and counted (Amendment 2), and they stay candidates.
- *The exact arm.* `h3tree.arm` over the L3 noun words of S (`address.noun_words`), with its exact integer keys.

**3. The stream, the initialisation and the schedule.** A run is a function of the geometry, d, lr, seed, positives
and non-neighbour sets alone. d is the manifold dimension: a Lorentz row stores (x0, x1, …, xd), a Euclidean row
(x1, …, xd).
- One `Rng(seed)` per run is read in this order, and by nothing else:
  1. For node i = 0, …, n − 1, and k = 1, …, d within it: x_ik = (2·random() − 1)·1e−3. Lorentz then sets
     x_i0 = √(1 + Σ x_ik²) (item 4's arithmetic). Lorentz and Euclidean at the same (seed, d) thus start from the
     same spatial numbers ("same init").
  2. At the start of every epoch, perm = `shuffle(list(range(6542)))` of a fresh list.
  3. Then, for each batch in order and each row in batch order, 50 negatives NN(u)[below(|NN(u)|)]: independent,
     with replacement, repeats kept as separate terms. With replacement, because placental.n.01 has only 49
     non-neighbours.
- There are 1,000 epochs, numbered 0–999. Batch b of an epoch is perm[50b : 50b + 50], b = 0, …, 130; the last has 42
  rows and is kept, so a run takes 131,000 steps. Epochs 0–19 use the rate η = lr/10 (a float64 division, as written),
  and epochs 20–999 use η = lr; lr is the grid's decimal string read by `float()`. There is no momentum, weight decay,
  max-norm, step clip or other schedule.
- The table after epoch 999 is the run's table. Nothing else is kept or selected.

**4. The loss and the step.** All arithmetic is IEEE-754 binary64, rounded to nearest, without fused multiply-add.
Σ_seq is a left-to-right sum in index order whose terms are each rounded first. `exp`, `log1p`, `cosh` and `sinh` are
numpy's float64 ufuncs applied to C-contiguous arrays, and `sqrt` is correctly rounded. Bit identity is promised on
the build machine only; each run records the numpy, numba and libc versions and numpy's SIMD features.
- *Distances,* for a row with anchor u and candidates c_0 = v and c_1, …, c_50 (the negatives):
  - Lorentz: z_j = u0·c0 − Σ_seq(u_k·c_k, k = 1..d). If z_j > 1, then t = z_j − 1, r_j = √(t·(t + 2)) and
    d_j = log1p(t + r_j). Otherwise d_j = 0 and the term has no gradient (a *guard hit*, counted). This is
    arcosh(max(z, 1)) with its exact derivative 1/√(z² − 1). The script floors that denominator at 1e−5; that is not
    used, because no clamp is registered and this guard adds no constant.
  - Euclidean: d_j = Σ_seq((u_k − c_k)², k = 1..d), the squared distance, because the registration attributes
    training to Nickel & Kiela, whose Euclidean distance is ‖u − v‖² (P17 p. 5; the script's `euclidean.py` line 29).
- *Loss.* A softmax over −d of the 51 candidates, the positive included (the script's `F.cross_entropy` with target 0,
  `energy_function.py` line 48): ℓ = d_0 + log Σ_j e^(−d_j). The batch loss is the mean of ℓ over the batch's B rows
  (B = 50, or 42). With m = min_j d_j, e_j = exp(m − d_j), S = Σ_seq(e_j, j = 0..50) and q_j = e_j/S, its derivatives
  are δ_0 = (1 − q_0)/B and δ_j = (−q_j)/B for j ≥ 1.
- *Gradient terms,* taken in term order: rows in batch order, then j = 0, …, 50, then the anchor's term before the
  candidate's.
  - Lorentz: g = δ_j/r_j (0 at a guard hit). The anchor receives g·c_j and the candidate g·u, in all d + 1
    coordinates.
  - Euclidean: g = 2·δ_j and a = g·(u − c_j), coordinatewise. The anchor receives a and the candidate −a.

  A node's accumulator A is the Σ_seq of the terms it receives, per coordinate, starting from 0.
- *Step.* Every node met in the batch (anchors, positives, negatives) takes one step. All steps are computed from the
  table as it stood at the start of the batch.
  - Lorentz:
    - ip = Σ_seq(x_k·A_k, k = 1..d) − x0·A0;
    - w_k = η·(A_k + ip·x_k) for k = 0, …, d;
    - ν = Σ_seq(w_k·w_k, k = 1..d) − w0·w0 and τ = √max(ν, 0);
    - if τ > 0, x_k ← cosh(τ)·x_k + (sinh(τ)/τ)·w_k for k = 1, …, d;
    - then x0 ← √(1 + Σ_seq(x_k·x_k, k = 1..d)).

    This is −η times the tangent projection h + ⟨x, h⟩_L x of the Minkowski gradient h = −A (the ambient gradient
    with its time component negated), and the exact exp map (P18 eqs. 9–10, Algorithm 1), whose time coordinate is
    then recomputed from the spatial ones. Both are registered words: the exp map moves the row, and "on the
    hyperboloid" keeps it there, which in binary64 the exp map's own x0 does not (item 15 attributes the step). The
    exp map has no clip, although the script clips the step length at 1 (`lorentz.py` line 116): "exp map" is
    registered without one, and the Euclidean arm's SGD has none. At lr = 10 a hub node's step can exceed 1.
  - Euclidean: x_k ← x_k − η·A_k.

**5. Divergence and diagnostics.** After every epoch, a table with any non-finite entry stops the run. The run is
recorded as *diverged at epoch e*, and it has no table and no MAP. The check is on the table because the table is
what is evaluated. Floating-point exceptions within an epoch are not errors, and a finite table is evaluated as it
stands. Recorded per run, deciding nothing:
- the guard hits and the largest step (τ for Lorentz; the norm of η·A for Euclidean);
- the largest distance from the origin (arcosh of the largest x0; Euclidean: the largest norm);
- the mean of ℓ over each epoch's rows, computed as (d_0 − m) + log S for this record only;
- the generator's final state and the float table's SHA-256 (item 6);
- wall and process time.

**6. Snapping and exact ranking.**
- *The float table.* Its bytes are little-endian float64, row-major, rows in offset order, a Lorentz row with x0
  first. Their SHA-256 names the table.
- *Lorentz.* Take p_k = x_k/(1 + x0) in binary64 for k = 1, …, d, then `fence.dyadic(p, 32)`: n_k = ⌊2^32·p_k + 1/2⌋,
  stepped in by one unit coordinatewise while |n|² ≥ 4^32. The exact point is `fence.lift(p, 32)`. For a query u
  and a candidate v, −⟨lift_u, lift_v⟩_L = 1 + 2·4^32·κ_u(v)/(4^32 − |n_u|²), where
  κ_u(v) = |n_u − n_v|²/(4^32 − |n_v|²). So the key κ_u(v), an exact `Fraction`, orders and ties the candidates
  exactly as the Lorentz product does.
- *Euclidean.* n_k = ⌊2^32·x_k + 1/2⌋ of the float read exactly. This is `fence.dyadic`'s rounding without its rim
  rule, which belongs to the Poincaré ball and never ends on a vector of norm 1 or more. The key is the squared
  distance of the dyadic points, through a `rank.Arm` of kind `'euclid'` over the denominator 2^32.
- *Metrics.* AP and neighbour ranks come from `rank._ap_and_ranks` on these keys (Amendment 1 item 5: pessimistic
  ties, ties listed by offset); MAP from `rank.map_exact`; mean rank from `rank.mean_rank` (pooled, Amendment 2).
- *The snapped text.* Lines `offset n_1 … n_d` (the dyadic integers; for Lorentz, those of the Poincaré point),
  LF-joined, with no final LF. Its SHA-256 names the snapped table.

**7. Intervals and the decision of L6.** For a comparison X − Y at seed s:
- The values are `rank.paired_diffs(AP_X, AP_Y)` over the queries in offset order (closure n = 1,182, graph-edge
  n = 1,176).
- The interval is `rank.ci_mean` of them (numpy `default_rng(7)`, 10,000 resamples, percentiles 2.5 and 97.5),
  started afresh for each interval.
- The exact arm has no seed, so its APs enter every seed's comparison.
- In float64, with "the mean" being `ci_mean`'s mean:
  - "above 0" is lo > 0;
  - "within [−0.02, +0.02]" is lo ≥ −0.02 and hi ≤ 0.02;
  - "entirely below 0" is hi < 0;
  - "entirely above +0.02" is lo > 0.02.

*Seeds present.* At seed s, a part's comparison is present when the learned tables it compares exist (no diverged
run) and control 2 is established for each of their cells at s (item 9). A part is supported only if all five seeds
are present; its refutation counts the seeds present. A diverged Euclidean run is no Lorentz win. A cell without a
frozen lr (item 8) has no seed present.

The parts:
- **(a)** Closure, Lorentz(d, s) − Euclidean(d, s). At each d ∈ {2, 3}, it is supported if all five seeds are present
  with lo > 0, and refuted if the mean is ≤ 0 in three or more seeds. (a) is refuted if refuted at either d,
  supported if supported at both, and otherwise inconclusive.
- **(b)** Closure, Lorentz(50, s) − Euclidean(50, s). Supported if all five seeds are present and each is within the
  band or entirely below 0; refuted if lo > 0.02 in three or more seeds.
- **(c)** Graph-edge, exact − Lorentz(3, s). Supported if all five seeds are present with lo ≥ −0.01; refuted if the
  mean is < −0.05 in three or more seeds.
- **(d)** Closure, Lorentz(3, s) − exact. Supported if all five seeds are present with lo > 0; refuted if the mean is
  ≤ 0 in three or more seeds.
- Otherwise each part is inconclusive.

Precedence and edge cases:
- A failed control (item 9) voids all four parts, as Amendment 5 read a control that names no part; void comes before
  refuted.
- A part that meets both its support and its refutation condition is inconclusive. That needs an interval whose lo
  exceeds its mean (for (c), by more than 0.04), and (b) cannot meet both. Whether lo ≤ mean ≤ hi holds is reported
  for every interval and decides nothing else.
- No multiplicity correction is applied; none is registered.
- *Prediction (a)'s gap,* graded in the write-up and deciding nothing: at d ∈ {2, 3}, the mean over the seeds present
  of MAP(Lorentz(d, s)) − MAP(Euclidean(d, s)), exact snapped closure MAPs, also reported per seed. The prediction
  holds if (a) is supported and the gap is at least 1/5 at both d.

**8. Tuning.**
- *The grid.* There are ten cells, {Lorentz, Euclidean} × d ∈ {2, 3, 5, 10, 50}, the reported d included. The 24
  tuning seeds form six blocks of four, and the k-th rate of {0.03, 0.1, 0.3, 1, 3, 10} in ascending order
  (k = 0, …, 5) is trained on block k, seeds 9000 + 4k to 9003 + 4k: 24 runs per cell, 240 in all.
- *Why this reading.* "In blocks of four" must divide the seeds for a purpose, and six rates meet exactly six blocks
  of four. Read as a full product (every rate on all 24 seeds, 1,440 runs), the phrase would describe only the order
  of execution, which the registration fixes nowhere else. Phase 0's tracks explainer, written with the registration
  (9f36f95, `explainers/tracks.html`), counts "L6, all runs: about 290, tuning included": 240 tuning runs and 50
  measured ones (it leaves out control 2's runs). The product reading was weighed by this amendment's reviewers and is
  not taken; it would cost about 15.6 h of tuning on four processes, against about 2.6 h.
- *Scores.* A run's score is its exact snapped closure MAP (item 6). Tuning computes no other MAP, so that it previews
  neither (c) nor L4(c). A rate is eligible if none of its four runs diverged, and its score is the exact mean of the four.
- *The choice.* The frozen lr is the eligible rate with the largest mean; on a tie, the smaller rate. The grid is not
  extended when 0.03 or 10 wins; that is reported. A cell with no eligible rate has no frozen lr, and no measured or
  edge-shuffled runs.
- *The lr-freeze amendment* (Amendment 11, unless a definitions amendment comes first; item 14), dated and before any
  measured run, writes `reference/settings.json` (each cell's rate as its grid string, or null). It gives the file's
  SHA-256 and every tuning run from `reference/results/tuning.json`, and it changes nothing else.
- *Measured runs.* Each cell with a frozen lr is trained at it on seeds 0–4: 50 runs.
- *The tuning tables* are kept in the cache, snapped and as float tables, with both SHA-256s in `tuning.json`, for
  control 1. They are not committed (about 80 MB).

**9. L6's controls.**
- *Control 1, label shuffle.*
  - One permutation serves every table: P = `Rng(7).shuffle(list(range(1182)))`, from one fresh generator. The node
    with index P[i] takes the point of row i: the labels move and the points stay.
  - The closure MAP of each relabelled table is computed exactly, against the true closure neighbours, over all 1,182
    queries. It must be ≤ 1/20, compared exactly, for every trained table, or L6 is void. The trained tables are the
    240 tuning tables, the 50 measured tables and the 50 edge-shuffled tables, as many as exist.
  - A tuning table is read from the cache when its snapped text has its recorded SHA-256. Otherwise it is retrained;
    if the retrained float table's SHA-256 differs from the recorded one (another machine's arithmetic, item 4), the
    retrained table is evaluated and both hashes are reported, since a table trained by the same run tests the
    evaluator as well.
  - P is computed once, in the decisive run. Nobody computes it before; tests use unregistered seeds (80000 + i).
  - *A disclosed risk.* mammal.n.01 and placental.n.01 neighbour 1,181 and 1,132 nodes. If P hands either label to the
    point of a general node in a well-trained table, nearly every query gains a neighbour near the top. On toy tables
    (item 16) one permutation breached 0.05 this way with probability 0.4% (a synthetic tree) and 0.8% (a WordNet
    noun set). On the mammals, which have two such labels, it is perhaps 1–2%. Such a breach voids L6, as registered.
  - *Reported, deciding nothing,* so that a void can be read: which points the two labels take; the relabelled
    closure MAP of each measured table under 200 further permutations `Rng(2100 + j)`, j < 200 (secondary draws, as
    the Common rules number them; no other L6 draw uses 2100–2299), which shows whether P sits in the far tail
    (chance) or the whole distribution is high (a leak); and the relabelled graph-edge MAP.
- *Control 2, edge shuffle.*
  - *The pairs.* They come from one fresh `Rng(2000 + s)`: repeat a = below(1182), b = below(1182), rejecting a = b
    and any unordered pair already held, until there are 6,542 pairs. (a, b) is (anchor, positive), and the pairs
    are held in order of (a, b).
  - *Training* is items 3–5 at the cell's frozen lr, with these pairs as positives. NN′(a) is every node other than
    a that is paired with a in neither order: the pairs' own relation, with no closure taken, since the true closure
    would leak the hierarchy into the control. Its draws come from `Rng(s)`, the generator the registration gives
    training ("with `Rng(seed)`"). It therefore starts from the true run's initial table, and the two streams agree
    until the first draw that one run rejects and the other accepts (after about a dozen epochs, on average).
  - It runs in every cell with a frozen lr, for s = 0–4, because "true training" names no cell.
  - *The test.* For each cell and seed, the per-node differences true − shuffled, both evaluated against the true
    relations, must have lo > 0 for closure AP and for graph-edge AP, because L6's metric names both. Otherwise L6 is
    void. The Common rules' "at least one case" is the least a control must show; control 2 states its own condition
    for edge-shuffled training as such, naming no cell, seed or MAP, so every interval must hold, as Phase 1 required
    of every interval in L5's controls.
  - If either run of a pair diverged, the control is not established for that cell and seed, and item 7 counts that
    seed as not present for the parts that use the cell.
- *Control 3, the floor (reported).*
  - For each cell and i = 0–4, item 3's initial table is drawn from a fresh `Rng(2000 + i)`, left untrained, snapped
    and evaluated. It is reported with the intervals learned(s) − floor(i = s).
  - The same stream also starts control 2's pairs for s = i. Both uses are registered and kept, and no comparison
    involves both.
  - The expected MAP of a uniformly random ranking, from the neighbour counts alone, is 0.014957 (closure) and
    0.007320 (graph-edge). It is reported beside the controls.

**10. L4(c).**
- *What is compared.* Every learned L6 table at d ∈ {2, 3} with training seed 0–4: the 20 measured and the 20
  edge-shuffled tables, since the edge-shuffled ones are trained by items 3–5 from `Rng(s)` too and the registration
  names no narrower set. Floors (not learned) and tuning tables (seeds 9000–9023) are not. For each table,
  |MAP(snapped, exact) − MAP(float64)| is taken for closure and for graph-edge MAP, against the true relations,
  because L6's metric computes both MAPs from points snapped "(L4(c))"; the table's |ΔMAP| is the larger. The values
  are exact rationals, compared exactly with 1/1000 and 1/100.
- *The decision.* Supported if the largest is ≤ 1/1000; refuted if any exceeds 1/100; otherwise inconclusive. A
  missing table (a diverged run) prevents support, but a present table above 1/100 still refutes. L6's controls do
  not bear on L4(c).
- *MAP(float64)* ranks the unsnapped table as stored after epoch 999, by keys computed in binary64 without fused
  multiply-add. Equal keys are ties, counted pessimistically by `rank._ap_and_ranks`; there is no acosh.
  - Lorentz: x0·y0 − x1·y1 − … − xd·yd, from left to right. This is Amendment 4 item 6's float key, which L4 already
    uses.
  - Euclidean: Σ_seq((x_k − y_k)², k = 1..d).
- *Its controls* are L4's. Control 2 names "the test" and no part. Read as Amendment 5 read it, and as item 7 reads
  L6's controls, it covers (c) too. It showed its weakness in Phase 2 (487 of 488 queries) on `rank._ap_and_ranks`,
  the evaluator that (c) uses unchanged. No control is added.
- *Reported:*
  - the same 40 tables snapped to 2^−8 (`fence.dyadic(p, 8)`; Euclidean ⌊2^8·x + 1/2⌋), ranked exactly as in
    item 6 with 8 in place of 32, with their |ΔMAP|: whether a coarse snap moves the MAP;
  - the largest snap displacement per table. For Lorentz it is the hyperbolic distance arcosh(1 + 2R), with
    R = |p − q|²/((1 − |p|²)(1 − |q|²)) exact, evaluated by `rank.acosh_ratio` (2R rounded once, then `log1p` and
    `sqrt` in binary64); p is the float Poincaré point read exactly, q = n/2^32, and the distance is ∞ if
    1 − |p|² ≤ 0. For Euclidean it is the Euclidean distance |x − n/2^32|, the square root in binary64 of the exact
    squared difference, since a hyperbolic distance has no meaning there;
  - |ΔMAP| of the measured and edge-shuffled tables at d ∈ {5, 10, 50}, and of the floors;
  - the number of exact ties in each snapped table and of float ties in each unsnapped one.

**11. Reported, deciding nothing.**
- *Mean rank,* pooled, for closure and graph-edge.
- *Fractional-tie MAP* (Common rules, "Ties"), closure and graph-edge, for the exact arm and the measured and
  edge-shuffled tables: each query's AP averaged over all orders inside each exact tie class, computed exactly.
- *Distortion,* for the exact arm and the measured tables: the mean of |d/(τ·d_T) − 1| over all unordered pairs of S
  with d_T > 0.
  - d_T is the L3 word tree distance. d is the binary64 distance of the snapped points, from their exact coordinates
    as `rank.Arm.dist` computes it for the exact arm: Lorentz, `rank.acosh_ratio` of
    −⟨lift_u, lift_v⟩ = 1 + 2·4^32·|n_u − n_v|²/((4^32 − |n_u|²)(4^32 − |n_v|²)); Euclidean, √(|n_u − n_v|²)/2^32.
  - τ = ln 7 for the exact arm. For a learned table, which has no registered scale, τ is the median of d/d_T over the
    same pairs.
- *Bits per node* of the snapped points, mean and maximum (`h3tree.point_bits`; Lorentz: the lifted point over
  4^32 − |n|²; Euclidean: n over 2^32).
- *Wall-clock per run:* `time.perf_counter` and `time.process_time`, with the number of concurrent processes.
- *Further intervals:* Lorentz − Euclidean, closure at d = 5 and 10 and graph-edge at every d; exact − learned
  graph-edge and learned − exact closure in every cell.
- *The geoopt cross-check (D9).*
  - It compares geoopt's Lorentz Riemannian SGD step with item 4's, one step at a time, on synthetic batches with
    unregistered seeds (80000 + i, as the tests use). It is reported as the largest relative difference of the
    updated rows.
  - geoopt's own floors (1e−8 on ⟨v, v⟩_L, 1e−15 in arcosh) make it a tolerance, never a decision.
  - If no torch wheel installs on the build machine, it is reported as not run. On 2026-11-06 the proxy refused
    download.pytorch.org, and PyPI's Linux wheel pulls more than 1 GB of CUDA wheels.
  - The tests carry torch-free checks in its place: a 60-digit decimal recomputation of one step, and
    finite-difference gradients.
- *The Node re-evaluation.* After the decisive run, `lexicon_core.js` re-evaluates the 50 measured snapped tables,
  after traces on `Rng(8000 + i)` toy tables. It needs one new function: κ_u(v) by BigInt cross-multiplication, and
  |n_u − n_v|². It is reported, and it is needed before the browser shows L6 or L4(c) as holding (Common rules,
  "Authority").

**12. LBENCH/1,** with Amendment 7 item 3's conventions. There is one record per evaluated table:

`LBENCH/1|L6/1|instanceId|instanceSha|arm|geometry|d|seed|lr|protocolSha|settingsSha|budget|floatTableSha|32|snapSha|closureMapSha|graphMapSha|closureMap|graphMap|track|engine|wallMs`

| Field | Content |
| --- | --- |
| instanceId | `wordnet30-mammal-closure` |
| instanceSha | the SHA-256 of S's offsets, LF-joined, with no final LF (the registered `c4748ce2…`) |
| arm | `tuning`, `learned`, `edge-shuffled`, `floor` or `exact-h3` |
| geometry | `lorentz`, `euclid` or `h3` |
| seed | the training seed; for a floor, its i |
| lr | the grid string |
| protocolSha | the SHA-256 of `reference/golden/l6_protocol_v1.txt`: this amendment verbatim, from its heading, with LF line ends and a final LF, pinned by a test against this file. A later amendment that changes a definition here makes `l6_protocol_v2.txt` (this amendment, then that one), and records from then on carry its SHA-256 |
| settingsSha | the SHA-256 of `reference/settings.json` |
| budget | `epochs,burnin,negatives,batch,steps,negativeDraws` = `1000,20,50,50,131000,327100000` |
| floatTableSha, snapSha | as item 6. The exact arm's snapSha hashes the canonical H³ lines of Amendment 1 item 6 for S |
| closureMapSha, graphMapSha | the SHA-256 of the exact MAP written `p/q` in lowest terms (`-` for a tuning table's graph-edge MAP, which is not computed) |
| closureMap, graphMap | `format(float(MAP), '.6f')` |
| track | `cpu` |
| engine | for example `python-3.13.x/numpy-2.y.z/numba-0.68.1` |
| wallMs | the training wall-clock in whole milliseconds |

Fields that do not apply are `-`. A track that holds a snapped table must reproduce its two MAP hashes; a track that
trains its own table is compared at the same budget and protocolSha.

**13. Dry runs** (+3000 on every seed).
- *The data* is the closure set of solid.n.01 (15046900): 1,232 nouns and 5,696 closure edges (114 batches per epoch,
  the last of 46). Only its root lacks non-neighbours (the smallest other count is 110), and 11 nodes have no
  graph-edge neighbours. It is disjoint from S, and it has only been counted so far. In LBENCH/1 its instanceId is
  `wordnet30-solid-closure` and its budget `1000,20,50,50,114000,284800000`. Its sizes replace 1,182 and 6,542
  throughout.
- *How it was chosen,* by criteria fixed before choosing: a noun closure set, so that the exact arm runs the
  noun-word code (`address.noun_words`); disjoint from S; only its root without non-neighbours; at least one node
  without graph-edge neighbours; within 10% of 1,182 nodes; then the smallest |n/1,182 − 1| + |(E/n)/(6,542/1,182) − 1|,
  size and closure-edge density together. solid.n.01 scores 0.207, and the next, ill_health.n.01 (14052046), 0.218. By
  size alone five sets are closer: family (08107499), communicator (09610660), municipality (08626283), ill_health and
  urban_area (08675967).
- *L4's dry line* ("`Rng(4000)` and the verb forest") names the dry stand-ins of the instances of (a) and (b), and
  Phase 2 ran them so (Amendments 4 and 5). (c) is decided on L6's tables, so its dry run uses L6's dry tables.
- *Seeds:*
  - training 3000–3004;
  - tuning 12000–12023, in the same blocks;
  - the label shuffle `Rng(3007)`;
  - edge pairs and floors `Rng(5000 + i)`;
  - the reported permutations `Rng(5100 + j)`;
  - the bootstrap keeps `default_rng(7)`, the statistics rule's constant, as in Phases 1–3.
- *What runs* is the whole pipeline. Dry tuning is item 8's full grid on the dry set (240 runs, about 2.3 h) and
  writes `results/dry/tuning.json` and `results/dry/settings.json`; then come the measured runs at the dry rates, with
  every control, every interval, L4(c) and the receipts (`results/dry/claims-phase4.*`).
- The dry set has no anchor with fewer than 50 non-neighbours; a unit test covers that case.

**14. Order.**
1. This amendment, committed alone.
2. The code of item 1 with its tests, on synthetic graphs and unregistered seeds only, committed; then an
   adversarial review on synthetic and dry data.
3. The dry run on the committed code. A fix is committed and the affected dry part rerun. A fix that changes a
   definition here needs a dated amendment before step 4.
4. Registered tuning on a clean, committed tree; the runner refuses uncommitted changes. It replays the draws of its
   job (lorentz, 3, `0.03`, 9000) with `hpstep.prng.Rng` (item 1).
5. The lr-freeze amendment.
6. One decisive run at that amendment's commit. It records HEAD, and it refuses unless the only paths changed since
   the commit tuning ran on are `PREREGISTRATION.md`, `reference/settings.json`, `reference/results/tuning.json` and
   tuning's console file.
   - It retrains the tuning jobs (euclid, 2, `0.03`, 9000) and (lorentz, 2, `0.03`, 9000) and records whether their
     float SHA-256s equal `tuning.json`'s. A mismatch (another machine) is disclosed and does not stop the run: the
     registration fixes the protocol, not the bits.
   - It trains the measured and edge-shuffled runs, replays the draws of measured (lorentz, 3, seed 0) with
     `hpstep.prng.Rng`, computes P for the first time, and writes `reference/results/claims-phase4.json`, `.md` and
     the receipts. The snapped texts of the measured and edge-shuffled tables and the float tables of L4(c)'s 40 are
     committed with them.
   - If it is interrupted, it resumes at the same HEAD on a clean tree from its finished jobs. That is the same run,
     and the record lists every start.

All code and the dry run come before registered tuning, because tuning previews L6's outcome (Lorentz against
Euclidean closure MAP on the mammals). A defect found after step 4 is fixed only by an amendment that says it was
found after the tuning results were seen.

**15. Where each constant comes from,** under Amendment 6's rule.
- *From P17:* the initial range U(−0.001, 0.001) (§3.2; also P18 p. 4); the burn-in rate η/10 (§3.2); the squared
  Euclidean distance (p. 5).
- *From P18:* the Lorentz model, the Minkowski gradient, the tangent projection and the exp map (eqs. 6, 9 and 10;
  Algorithm 1); and the undirected closure (§4.1) that NN(u) follows.
- *From the script's `train-nouns.sh`:* 50 negatives, batch 50 and 20 burn-in epochs (Amendment 6).
- *From the script's code:*
  - the positive inside the softmax, with logits −d (`energy_function.py` line 48);
  - the batch-mean loss (`F.cross_entropy`'s default; `lr_type` constant);
  - gradients to the anchor, the positive and the negatives, with repeats summed and one step per node (`rsgd.py`
    lines 53–57);
  - a fresh permutation each epoch, with the short last batch kept (`graph_dataset.pyx` lines 120 and 133–149);
  - the (child, ancestor) orientation.
- *From geoopt and the script:* x0 recomputed from the spatial coordinates, as geoopt's Lorentz `expmap(…,
  project=True)` does after the exp map and the script's `normalize` (`lorentz.py` lines 57–75) does, with a max-norm,
  before each step.
- *This project's own:* 1,000 epochs (the script runs 1,500; neither paper gives a count); the lr grid and its tuning;
  uniform non-neighbour negatives with replacement in every epoch, burn-in included; no clip, max-norm or derivative
  floor; the final-epoch table; the divergence rule; the generator.
- *Not followed from the script:*
  - burn-in at lr × 0.01, with 5 negatives (`-neg_multiplier 0.1`) drawn by in-degree (`-dampening` is passed twice,
    and 1.0, the last, wins);
  - descendants as negatives;
  - negatives drawn without replacement and padded by repeats;
  - the exp-map step clipped at 1;
  - `max_norm` 1e6, which is always on because `-no-maxnorm` is parsed and never read;
  - the arcosh-derivative floor 1e−5;
  - initial ranges ±1e−5 (Lorentz) and ±1e−4 (Euclidean);
  - five Hogwild threads;
  - the checkpoint with the lowest loss.
- *For the record:*
  - P18 states no negative count, batch size, epoch count or burn-in. Its eq. 12 puts the positive inside the softmax,
    but for §3.3's similarity setting; for taxonomies (§4.1) it follows Nickel & Kiela.
  - `train-mammals.sh` (Poincaré, d = 5, lr 0.3, 300 epochs, batch 10) is a different protocol.
  - P17's eq. 6, as printed, has its sign inverted and leaves v out of N(u).
  - The only mammal number found is P17's Figure 2 (Poincaré, d = 5: MAP 0.927, mean rank 1.26). It is verified, and
    it is not comparable: its instance is unknown, its ranking is directed and its ties are not pessimistic. No claim
    compares against it.

**16. Disclosures** (Common rules, "Reporting"). Three design studies ran before this amendment, with throwaway
prototype trainers and evaluators in a scratch folder; none is in the repository.
- *Read:*
  - P17; P18 (v1 and v2); and arXiv 1804.01882v3, 1804.03329v2 and 1902.04335v3, searched for mammal results (none
    found);
  - the script's repository at dff101b, and at its earlier commits 35c2322, 9aecb86 and 624584c;
  - geoopt at v0.5.1-47-g56f56cc.

  All were downloaded into a scratch folder and read, never run.
- *Counted only.* On registered data: sizes, neighbour and non-neighbour counts, nodes without graph neighbours,
  depths, hashes, the expected AP of a random ranking from the neighbour counts, and the generator's expected
  rejection rate from the non-neighbour counts.
  - The counting went through `lexicon.wordnet` and `rank.*_neighbours`, with an emulation of the script's data
    filters. The script's released mammal file has 1,180 nodes and 6,540 edges: its `str.match` filter drops tusker
    and female_mammal.
  - Noun and verb closure sets of 300–2,000 nodes were counted to choose the dry set, and every one within 10% of
    1,182 nodes was counted again to check item 13.
- *Probes,* none on the mammal sets:
  - On a synthetic DAG of 1,182 nodes from `Rng(70001)`:
    - stream equality and timing (seeds 70010–70013, 70020–70023, 70030–70031, 70040 and 70600);
    - trainer timing and the equality of two implementations (70100–70180), and reproducibility (70140);
    - 14 toy 1,000-epoch runs (70202, 70203 and 70250; both geometries, d = 2, 3 and 50, lr 0.03–10);
    - the key identity of item 6 (70300);
    - a 60-digit decimal oracle (70400);
    - timing of the label shuffle (`Rng(70500)`) and of `rank.ci_mean` on synthetic values from numpy
      `default_rng(70501)`. That call resampled with `ci_mean`'s fixed `default_rng(7)`, the statistics rule's
      constant: the one use of a registered seed number, on synthetic values;
    - numpy `default_rng(70102)` and `default_rng(70103)` arrays in micro-benchmarks.
  - Label-shuffle tails of the 13 finite toy tables, under `Rng(70300 + i)`, i < 200, and `Rng(71000 + i)`,
    i < 5,000.
  - The random-ranking SD per neighbour count (numpy `default_rng(70100 + j)` and `default_rng(70200 + j)`, on counts
    only).
  - On written_communication.n.01 (06349220, a noun set disjoint from S): four toy tables trained with seeds
    70501–70504, and 5,000 permutations `Rng(72000 + i)`. This probe was started twice by mistake and the first copy
    stopped; it is deterministic.
  - Item 11's fractional-tie formula against brute force over every tie order, on 400 random synthetic key lists
    (Python's `random.Random(80900)`, not the shared generator).

  The prototypes used the Euclidean distance |u − v|, not item 4's squared one. Toy numbers predict nothing about the
  mammals. What the probes showed, and what this amendment takes from them:
  - the toy Lorentz run at d = 2, lr = 10 went non-finite at epoch 659 (item 5);
  - a batch sum would make every step 50 times the mean's (item 4);
  - one changed rounding moved a table by 8.8e−8 in three epochs (item 4's arithmetic);
  - snapping moved the toy tables' MAP by at most 1.3e−6;
  - the label-shuffle tail (item 9);
  - `Rng.below` costs about 1 µs in Python, about 330 s of a run (item 1).
- *Installed* into the system Python: numba 0.68.1 and llvmlite 0.50.0, and line_profiler for profiling. torch and
  geoopt were not installed.
- *Not done:* nothing was trained, ranked or evaluated on the mammal sets; the shared generator drew from no
  registered seed (0–4, 7, 1000 + i, 2000 + i, 4000 + i, 9000–9023, 90000 + i); P was not computed; no repository
  file was written.
- *Known before Phase 4.* Phase 1's exact H³ graph-edge MAP on the spanning subtree is public: 0.690653. Item 2's
  1,176 graph-edge queries are that subtree, with the same points and the same neighbours, and their candidates gain
  six non-neighbours, which cannot raise a pessimistic AP. So the exact arm's L6 graph-edge MAP is at most 0.690653,
  query by query. Phase 1's H³ closure MAP on the subtree (0.305932) is public too. Neither is an L6 number.

**17. An omission in Phases 1–3** (Common rules, "Ties" and "Reporting"). The Common rules say fractional-tie values
"are reported, never used to decide". Phases 1 and 2 ranked with exact ties (L5's arms and L4(a)) and reported only
the pessimistic values; Phase 3 ranked nothing. No decision changes, since those values decide nothing. Phase 4
computes them with item 11's formula for Phase 1's L5 arms and Phase 2's L4(a) rank lists, on the code and data those
runs used, and reports them in `reference/results/fractional-ties.json` and `.md`, deciding nothing.

### Amendment 11 · 2026-11-06, Phase 4, the learning rates frozen before any measured run

Written after registered tuning and before any measured run of L6 or L4(c). Tuning ran at a780bb5 on a clean tree,
and its results were committed in 7c1806c. This is the lr-freeze amendment of A10.8: it fixes the rates in
`reference/settings.json` and gives every tuning run. It changes no definition. Items 3 and 4 record what ran before
tuning and the readings fixed in the code. Tuning previews part of L6's outcome, as A10.14 says: Lorentz against
Euclidean closure MAP on the mammals, at the tuning seeds 9000–9023. Nothing else was computed on the mammal closure
set. The measured runs use seeds 0–4 and have not run.

**1. The frozen rates.** `reference/settings.json` has SHA-256
058e1900e778f0aedb0a4f0c683360d60343e5ca212ac56889774b419803631a. It was written by
`run_claims_phase4.py --write-settings` from `reference/results/tuning.json`, whose SHA-256 is
`9290c01e4161b814357d2a34fcac1032ff4fc877893848f74865c251c5aca4e9`.

| Geometry | d = 2 | d = 3 | d = 5 | d = 10 | d = 50 |
| --- | --- | --- | --- | --- | --- |
| Lorentz | 1 | 1 | 1 | 1 | 1 |
| Euclidean | 0.1 | 0.1 | 0.1 | 1 | 3 |

- Every cell has a rate, so no cell is left without measured or edge-shuffled runs.
- No cell chose an end of the grid (0.03 or 10).
- The closest choice is Lorentz d = 2: rate 1 had mean 0.884987 and rate 3 had 0.884130, a difference of 0.000857.

**2. Every tuning run.**
- *Values.* Each cell gives the exact snapped closure MAP of each run, to four decimals, in seed order.
- *Seeds.* Rate k of the grid ran on seeds 9000 + 4k to 9003 + 4k: 0.03 on 9000–9003, 0.1 on 9004–9007, 0.3 on
  9008–9011, 1 on 9012–9015, 3 on 9016–9019 and 10 on 9020–9023.
- *Means.* The bold figure is the mean of the four runs (A10.8), which chooses the rate. A dash marks an ineligible
  rate.
- *Diverged runs* ("div. e" gives the epoch). There are 24, all at rate 10: every Euclidean cell at epoch 23, and
  Lorentz d = 2 at epochs 375, 295, 327 and 505.
- *Where the exact values are.* Each run's exact MAP, float and snapped SHA-256, generator state and diagnostics
  are in `tuning.json`.
- *The replay.* `tuning-lorentz-d3-lr0.03-s9000` was replayed with `hpstep.prng.Rng` over 1,000 epochs. It ended in
  the run's state, [2383527128, 2429151609, 2242904360, 1163253655].
- *Time.* Tuning took 6,089 s on 4 workers.

| Cell | lr 0.03 | lr 0.1 | lr 0.3 | lr 1 | lr 3 | lr 10 | Frozen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| lorentz 2 | **0.227940**<br>0.2263, 0.2229, 0.2330, 0.2296 | **0.296830**<br>0.2963, 0.2963, 0.2971, 0.2975 | **0.573959**<br>0.5755, 0.5948, 0.5833, 0.5423 | **0.884987**<br>0.8922, 0.8867, 0.8851, 0.8760 | **0.884130**<br>0.8603, 0.8982, 0.8892, 0.8889 | —<br>div. 375, div. 295, div. 327, div. 505 | `1` |
| lorentz 3 | **0.252473**<br>0.2538, 0.2509, 0.2502, 0.2550 | **0.422143**<br>0.3983, 0.4271, 0.4349, 0.4283 | **0.916422**<br>0.9195, 0.9138, 0.9124, 0.9201 | **0.961827**<br>0.9553, 0.9657, 0.9591, 0.9672 | **0.927831**<br>0.9185, 0.9333, 0.9258, 0.9338 | **0.848202**<br>0.8428, 0.8348, 0.8531, 0.8621 | `1` |
| lorentz 5 | **0.275444**<br>0.2755, 0.2719, 0.2719, 0.2824 | **0.649637**<br>0.6297, 0.6688, 0.6290, 0.6710 | **0.941990**<br>0.9424, 0.9404, 0.9433, 0.9419 | **0.967564**<br>0.9690, 0.9706, 0.9633, 0.9674 | **0.931211**<br>0.9326, 0.9279, 0.9334, 0.9309 | **0.856591**<br>0.8579, 0.8407, 0.8630, 0.8647 | `1` |
| lorentz 10 | **0.314710**<br>0.3188, 0.3132, 0.3042, 0.3227 | **0.726946**<br>0.7145, 0.7308, 0.7314, 0.7311 | **0.948738**<br>0.9486, 0.9482, 0.9510, 0.9472 | **0.967804**<br>0.9688, 0.9698, 0.9665, 0.9661 | **0.933893**<br>0.9340, 0.9322, 0.9329, 0.9365 | **0.861726**<br>0.8569, 0.8645, 0.8640, 0.8614 | `1` |
| lorentz 50 | **0.374534**<br>0.3715, 0.3783, 0.3751, 0.3733 | **0.760018**<br>0.7595, 0.7624, 0.7582, 0.7600 | **0.947487**<br>0.9482, 0.9463, 0.9479, 0.9475 | **0.967860**<br>0.9672, 0.9678, 0.9671, 0.9693 | **0.937506**<br>0.9383, 0.9376, 0.9369, 0.9373 | **0.868199**<br>0.8627, 0.8708, 0.8678, 0.8715 | `1` |
| euclid 2 | **0.108615**<br>0.1143, 0.1029, 0.1156, 0.1016 | **0.166889**<br>0.1719, 0.1729, 0.1607, 0.1620 | **0.156837**<br>0.1551, 0.1534, 0.1618, 0.1572 | **0.156116**<br>0.1583, 0.1564, 0.1537, 0.1561 | **0.139754**<br>0.1442, 0.1363, 0.1340, 0.1445 | —<br>div. 23, div. 23, div. 23, div. 23 | `0.1` |
| euclid 3 | **0.168306**<br>0.1659, 0.1641, 0.1719, 0.1713 | **0.218726**<br>0.2200, 0.2146, 0.2229, 0.2174 | **0.206724**<br>0.2061, 0.2055, 0.2092, 0.2061 | **0.206521**<br>0.2074, 0.2056, 0.2055, 0.2075 | **0.193973**<br>0.1883, 0.1900, 0.1996, 0.1981 | —<br>div. 23, div. 23, div. 23, div. 23 | `0.1` |
| euclid 5 | **0.256342**<br>0.2610, 0.2589, 0.2565, 0.2489 | **0.294311**<br>0.2918, 0.2952, 0.2959, 0.2943 | **0.288973**<br>0.2917, 0.2873, 0.2909, 0.2859 | **0.289414**<br>0.2883, 0.2899, 0.2869, 0.2926 | **0.277995**<br>0.2778, 0.2751, 0.2793, 0.2798 | —<br>div. 23, div. 23, div. 23, div. 23 | `0.1` |
| euclid 10 | **0.374314**<br>0.3726, 0.3781, 0.3727, 0.3739 | **0.463161**<br>0.4630, 0.4627, 0.4620, 0.4649 | **0.492301**<br>0.4914, 0.4894, 0.4967, 0.4917 | **0.496754**<br>0.4982, 0.4959, 0.4967, 0.4963 | **0.417665**<br>0.4166, 0.4176, 0.4176, 0.4189 | —<br>div. 23, div. 23, div. 23, div. 23 | `1` |
| euclid 50 | **0.780164**<br>0.7809, 0.7816, 0.7768, 0.7813 | **0.999290**<br>0.9995, 0.9993, 0.9991, 0.9992 | **0.999694**<br>0.9996, 0.9994, 0.9999, 0.9999 | **0.999840**<br>0.9999, 0.9995, 0.9999, 0.9999 | **0.999973**<br>1.0000, 1.0000, 1.0000, 1.0000 | —<br>div. 23, div. 23, div. 23, div. 23 | `3` |

**3. What ran between Amendment 10 and registered tuning** (Common rules, "Reporting"; A10.14 steps 2–3).
- *The code* (272a50d), built on synthetic DAGs and unregistered seeds 80000 + i. Its tests include the generator
  equality of A10.1 (4 seeds × 10⁶ outputs; mixed calls with `below` bounds that reject about half the time), a second
  slow trainer equal to `embed.train` bit for bit, a 60-digit decimal oracle, finite-difference gradients, and
  bitwise reproducibility across four concurrent processes.
- *The A10.17 supplement* ran during the build, at 43265cf (and again at 272a50d after a fix to `learned.py`, every
  value unchanged), before registered tuning. As A10.17 asked, it rebuilt Phase 1's L5 arms and Phase 2's L4(a) rank
  lists with those runs' own code. That repeated their draws of the shared generator, `Rng(1000).sample(82115, 1000)`
  and `Rng(2000 + i).shuffle` (S3's permutations, i < 20 on the mammals, i < 5 on the nouns), and ranked L5's arms on
  the mammal spanning subtree (1,176 nodes) and the noun sample. A10.14 says nothing may be ranked on the mammal sets
  before registered tuning; A10.17 required this computation and set no time for it, so the two items conflicted and
  the supplement ran first. It trained nothing, evaluated no L6 table, did not rank the closure set S, and did not
  compute P. Its values were all published in Phases 1 and 2 except the fractional-tie ones, which decide nothing.
- *An adversarial review* (four reviewers, two skeptics per finding; synthetic data and the dry set with seeds
  85000 + i): an independent reimplementation of A10.3–5 matched `embed.train` bit for bit, including full
  1,000-epoch runs; an independent evaluator matched `learned.evaluate`; 200,000 crafted inputs matched A10.7's
  rules. Seven minor findings were confirmed and fixed (e0477fb): the Euclidean snap is now exactly ⌊2^32·x + 1/2⌋
  (a float shortcut was one unit off at one double per K); the environment is recorded per run and per start; the
  clean-tree check covers the Hyperbolic Oracles and Engram Mind's Eye reference folders, sees through renames and
  repeats before each pool and each write; a real test that tuning computes the closure MAP only; the L6 trace check
  in `tests/all.cjs`; the self-test refuses any output folder in the repository; the binary64 diagnostic MAPs are a
  recorded reading. A10.7's comparisons were also pinned by a test (`COMP_SPEC`).
- *The dry run* (A10.13) on the committed code: tuning at e0477fb (78c661d, 5,867 s) and the measure step at 78c661d
  (a780bb5, 2,833 s). Dry verdicts: L6 (a)–(d) supported, L4(c) supported; dry data, deciding nothing.
- *An independent check of the dry record* (two verifiers, their own ranking, intervals and A10.7 rules, about
  29,700 comparisons) found every exact MAP, interval, verdict, control, tuning choice, receipt and table hash equal
  to the record; two dry runs retrained from scratch matched bit for bit, and two replays with `hpstep.prng.Rng`
  reached the recorded states. The only differences were 77 summary values of the reported diagnostic permutations,
  off by at most 2 ulps, which the binary64 reading (runner-11) accounts for exactly.

**4. Readings fixed in the code** (each marked `READING`; the runner also records its own in the results):
- *Trainer.* At a guard hit the terms g·c and g·u are taken as signed zeros, so the nodes count as met and step by
  nothing; a NaN z (from an overflow) is a guard hit; "the largest distance from the origin" is over the initial
  table and every finite end-of-epoch table; the Euclidean "norm of η·A" is √Σ_seq((η·A_k)²); the epoch loss is the
  Σ_seq over the epoch's rows in permutation order, divided by E.
- *Evaluator.* The Lorentz key κ_u(v) is used as its exact order-isomorphic integer image; the Euclidean snap is the
  exact ⌊2^K·x + 1/2⌋ of the float read exactly; a NaN float key is refused; a tie count is candidates minus distinct
  keys, summed over queries; distortion's median is numpy's.
- *Decisions.* "Established" for control 2 is "both runs exist"; the both-conditions rule of A10.7 is applied to (a)
  as a whole; LBENCH/1's literal `32` is a field that the exact arm writes `-`; the lr-freeze amendment is found by
  the SHA-256 of `settings.json`, which must occur in exactly one amendment after Amendment 10.
- *Runner* (runner-1 to runner-12 in the results): the clean-tree scope and its repetitions; resumption only at the
  same HEAD and configuration with cached files unchanged; the pool size as the number of concurrent processes; the
  replay of the designated run over every epoch; the exact arm's and floors' LBENCH/1 fields; the pre-flight retrains
  (euclid, 2) and (lorentz, 2) at the grid's first rate and its block's first seed; the diagnostic labels (the root
  and the node with the most closure neighbours after it); the 200 diagnostic MAPs in binary64; the environment per
  run.

**5. Environment of tuning.**
- Software: Python 3.13.18, numpy 2.5.3, numba 0.68.1, llvmlite 0.50.0 and glibc 2.39.
- numpy's SIMD dispatch: X86_V3, X86_V4, AVX512_ICL and AVX512_SPR.
- Machine: Linux 6.18.44 on 4 CPUs.
- The dry run ran in the same environment (environment SHA prefix db8e470c21e5).

### Amendment 12 · 2026-11-06, Phase 4 write-up: an erratum to Amendment 11

Written after the decisive run of L6 and L4(c) (b6f3b9d), while checking it. It changes no rule and no result. Amendment
11 item 1 says "The closest choice is Lorentz d = 2: rate 1 had mean 0.884987 and rate 3 had 0.884130, a difference
of 0.000857." By that measure, the absolute difference of the two best means, the closest choice is Euclidean d = 50:
rate 3 had mean 0.999973 and rate 1 had 0.999840, a difference of 0.000133. Lorentz d = 2 comes next. The sentence
decides nothing: A10.8 chooses each cell's rate by the larger exact mean alone, and every printed value of Amendment
11's tables and the file hashes are right. An independent check of the decisive record found this, and found no
other difference among the record's decisions, intervals, controls, tuning choices, receipts and table hashes.

### Amendment 13 · 2026-11-07, Stage 2, the lexical claims registered before any code

Written on 2026-11-07, at the start of Stage 2 and before any Stage-2 module, loader, scorer, trainer or runner existed
in the repository. It registers four claims, L12–L15, the definitions they need and Stage 2's order of work, as "What
none of this decides" promised. Nothing registered above is changed: where a reading below could be read as a change,
the reason is given (Amendment 1's rule). No metric (score, correlation, average precision, accuracy, reciprocal rank
or F1) of any of this project's geometries, embeddings or baselines has been computed on any Stage-2 set. Before it,
three surveys, three designs, two judges, three reviews and the synthesis and revision that wrote this text downloaded
the candidate sets into a cache outside the repository, hashed them, read their scripts as text and counted: rows,
columns, labels, folds, duplicates, word reuse, WordNet 3.0 coverage and monosemy, HyperLex's TYPE values and gold
ties, and HiT's positives and repeated negatives. One count is a partial preview and is named here. For every
HyperLex noun row, by TYPE, it is whether some sense pairing is a WordNet closure pair in either direction; for the
type-of rows and the positives of BLESS, WBLESS and LEDS, whether it is a closure or a spanning-ancestor pair.
Closure membership is exactly the top tie class of the WN arm's score G_WN, and a spanning ancestor is a prefix in the
letter tree, where H3's G is near 0; with HyperLex's published per-TYPE means, these counts preview L12(d) and parts
of L12(a) and L13 (item 20). Timing probes trained a few epochs on WordNet noun sets with unregistered seeds and
evaluated no table, and synthetic probes drew unregistered seeds too (95000–95050, 95060, 95061, 95104–95113, 95901
and 95920). No registered seed was drawn. Item 19 lists every count, probe and download, and item 20 what they
already show about the claims.

*Notation.* U_full is the 82,115 noun synsets. U_@ is the 74,401 noun synsets incident to a noun `@` edge (the
hypernym graph without instance links, HiT's entity set), with its 75,850 direct edges E and 587,658 indirect pairs T.
*The suite* is facebookresearch/hypernymysuite at `6891e0eb14edc1abcaa613cadd44a41f5811fae4`. HL, BD, WB, SL, MEN,
WSR, HiT and GloVe name the instances and pins of item 2 and the claims. In a pair (x, y), x is the candidate hyponym
and y the candidate hypernym. τ = ln 7 (H3) and ln 12 (H2). P17 is as in Amendment 10. *The definitions amendment* is
the dated amendment of item 15 step 4 (Amendment 14 unless another comes first). *The lr-freeze amendment* is the one
amendment after this one that gives the SHA-256 of `reference/settings-stage2.json` (item 15 step 6), found by that
hash as A11.4 found Amendment 11. *Pass 1* and *pass 2* are the two blind scoring passes of item 8.

| # | Claim | Kind | Track |
| --- | --- | --- | --- |
| L12 | On HyperLex's nouns, the exact trees track graded type-of better than the same construction at curvature 0, through ancestry and direction, and H3 as well as WordNet's own graph | statistical | CPU |
| L13 | On BLESS and WBLESS, the exact trees detect hypernymy and its direction better than the same construction at curvature 0 | statistical (control 3 an exact check) | CPU |
| L14 | Trained on WordNet's direct noun edges, learned Lorentz beats learned Euclidean at d = 2 and 3 on HiT's multi-hop test and on HyperLex's nouns | statistical | CPU |
| L15 | At matched information, curvature 0 does as well as the exact trees on similarity and relatedness; GloVe beats H3 on relatedness, and H3 beats GloVe on HyperLex | statistical | CPU |

The Python reference decides all four (item 1); the browser core reproduces their scores after the decisive run and
decides nothing.

#### L12 · Graded type-of on HyperLex: the exact trees against curvature 0, and what their reading adds

**Claim.** On HyperLex's noun pairs, read by the is-a score G with the maximum over senses (items 3 and 5):
- (a) the training-free exact trees H3 and H2 track the human ratings better than the same construction at curvature
  0 (F3, F3\*, F2, F2\*);
- (b) in H3 and in H2, G tracks them better than the depth gap of the same senses (Dep°): the tree carries ancestry
  beyond generality;
- (c) in H3 and in H2, G tracks them better than the symmetric score: the tree carries direction beyond similarity;
- (d) H3 tracks them as well as WordNet's own graph read by the same form (G_WN), within ±0.02. This part was
  registered after a partial preview (item 20) and is flagged so in the record.

**Instances.** HL: the rows of `hyperlex-all.txt` whose POS is `N`, in file order: 2,163 pairs, all covered in U_full.
x is WORD1 and y is WORD2 ("x is a type of y"); the gold is AVG_SCORE (0–6), read as exact decimals. No randomness
but the controls' and the intervals'. Dry runs: item 13.

**Arms.** H3, H2, F3, F3\*, F2 and F2\* with G (a); H3 and H2 with G, Dep° and Sym (b, c); H3 with G and WN with G_WN
(d); the controls K3, S-full and W, on H3 with G (item 4).

**Metric.** Spearman ρ of each arm's pair scores against the gold; the paired difference of two arms' ρ with its
word-level ci_rho interval over the 2,163 rows (item 7).

**Controls that must fail.** If any of controls 1–4 does not fail as required, all four parts are void.
1. *Hierarchy removed.* The intervals of ρ(H3) − ρ(K3) and ρ(H3) − ρ(S-full\*) lie above 0, S-full\* the strongest of
   its 20 permutations (item 7).
2. *Senses scrambled at equal polysemy.* The interval of ρ(H3) − ρ(W\*) lies above 0, W\* the strongest of 20.
   Otherwise the maximum over senses rewards polysemy, not words.
3. *Roles reversed.* The interval of ρ(H3 read as Φ_G(x, y)) − ρ(H3 read as Φ_G(y, x)) lies above 0. Otherwise the
   loader has the roles wrong or the asymmetry carries nothing.
4. *Gold shuffled.* For each of H3, H2, F3, F3\*, F2, F2\* and WN, the mean ρ over 20 gold permutations satisfies
   |mean| ≤ 5/√(20·2,162) = 0.0240 (item 7).

**Checks that must pass.** The count checks (item 9). A mismatch stops the run with no result.

**Decision.**
- (a) Supported if the intervals of ρ(H3) − ρ(F3), ρ(H3) − ρ(F3\*), ρ(H2) − ρ(F2) and ρ(H2) − ρ(F2\*) all lie above 0;
  refuted if any lies entirely at or below 0; inconclusive otherwise (L5's rule).
- (b) Supported if ρ(G) − ρ(Dep°) lies above 0 in H3 and in H2; refuted if either lies entirely at or below 0.
- (c) The same rule for ρ(G) − ρ(Sym).
- (d) For the interval of ρ(H3) − ρ(WN): supported if it lies within [−0.02, +0.02]; refuted if it lies entirely outside
  it; inconclusive otherwise; the failing side is reported. The band is L6(b)'s, chosen without the survey counts, and
  it is narrower than the spread of the published WordNet readings of these pairs (0.214–0.240, HyperLex Table 13,
  verified).

**Prediction.** Ours and analytic unless graded; nothing was measured on HyperLex.
- (a) Supported. In H a spanning ancestor t of s loses G only to the bends of the path near t, which do not grow with
  depth; a non-ancestor loses about 2τ per letter of t below the common prefix. On synthetic random words (item 19),
  G of a spanning ancestor lay in [−1.85, 0] in H3 (median −0.64) and in [−2.11, 0] in H2 (median −0.30), while a word
  leaving s's word one letter below their common prefix scored at most −2.26 and −2.57 (medians −3.34 and −4.25), and
  each further letter cost about 2τ (3.89 in H3, 4.97 in H2). In F a bent path's deficit grows with its legs and the
  lattice collides, so unrelated words can share a point (G = 0); in F\* every deficit shrinks as 4^−depth. Either way
  ancestors at one depth interleave with non-ancestors at another. Expected, graded in the write-up and deciding
  nothing: ρ(H3) between 0.45 and 0.70, every F arm at least 0.10 below it.
- (b) Supported: Dep° ranks high every pair whose chosen senses lie far apart in depth, ancestry or not, while G sends
  non-ancestors down by about 2τ per letter. Against it, Dep° grades hyp-1 … hyp-4 by their depth gap as the human
  means rise (7.99 to 8.62; HyperLex Table 7, verified), which G, near 0 for every ancestor, cannot.
- (c) Supported: Sym gives (x, y) and (y, x) one score; 464 rows are the reverse of another row, and the hyp and
  r-hyp means differ by 3.8–6.1 points (Table 7, verified).
- (d) Refuted on the low side, with inconclusive the likeliest alternative. G is near 0 only for spanning ancestors.
  Of the 1,004 hyp pairs, 1,003 are closure pairs and 957 spanning-ancestor pairs for some sense pairing (the data
  survey's counts, item 20); the 46 others leave the top block, worth about 0.02–0.04 of ρ by a rank-displacement
  estimate. H3's spanning ancestors are themselves spread over about [−1.9, 0] by bend artefacts largely unrelated to
  the gold, against WN's single tied block at 0, which lowers ρ(H3) further. The word-level interval's half-width is
  estimated at 0.015–0.026 (0.015 for rows as independent, times at most √(2,163/731) = 1.72 for HL's word reuse), so
  support needs an estimate near 0.
- G's known limits against Table 7: synonyms (6.69) tie with the hyp pairs (G = 0 on a shared synset); meronyms (3.14)
  fall with no-rel (0.64); co-hyponyms (3.29) sit beside r-hyp-1 (4.17).
- For orientation only (verified; none comparable): Nickel & Kiela's Poincaré 0.512 and Euclidean 0.389 (P17 Table 3:
  learned, d = 5, no sense rule stated); WN-Basic 0.240, WN-WuP 0.214, WN-LCh 0.214 (WordNet 3.1); LEAR 0.705 (OOV
  pairs dropped; trained on WordNet's entailment pairs); gensim's 0.48 on 1,981 pairs; human IAA-1 0.854, an agreement,
  not a ceiling.

**Data.** HyperLex states no licence: hashes only (item 2). WordNet under its licence.

#### L13 · Detection and direction on BLESS and WBLESS

**Claim.** On the suite's BLESS and WBLESS test folds, read by G with the maximum over senses, the exact trees H3 and
H2 do better than the same construction at curvature 0 in (a) BLESS detection AP, (b) WBLESS detection AP and (c)
BLESS direction accuracy, the choice of which word of a hypernym pair is the more general.

**Instances.** Test folds only. The validation folds decide nothing; they are scored only for the reported suite
protocol (item 11).
- BD: the `bless.tsv` rows with fold `test` covered in U_full, in file order: 12,365 rows, 1,194 labelled True. Its 6
  repeated pairs and 3 self-pairs (all False) stay as rows. Clusters: word1, 200 concepts.
- WB: the `wbless.tsv` test rows covered in U_full: 1,493 rows, 764 True. Clusters: the BLESS concept each row holds,
  word1 if it is one of `bless.tsv`'s 200 word1 values and word2 otherwise. Every covered row holds one; there are
  192 clusters.
- BD-dir: BD's 1,194 True rows (word1 the hyponym). A row is correct when Φ_G(x, y) > Φ_G(y, x). Clusters as BD.
  Pass 1 scores both directions of every covered BD row, and pass 2 selects the True rows (item 8).

**Arms.** H3, H2, F3, F3\*, F2 and F2\* with G; the controls K3, S-full and W, on H3 with G; Sym on H3 and GloVe
cosine for control 3.

**Metric.** AP with pessimistic ties (a, b) and direction accuracy (c), per arm (item 7). The effects H3 − F3,
H3 − F3\*, H2 − F2 and H2 − F2\*, each with its ci_cluster interval.

**Controls that must fail.** If any of controls 1–3 does not fail as required, L13 is void.
1. *Hierarchy removed, senses scrambled.* On each of (a), (b) and (c), the intervals of H3 − K3, H3 − S-full\* and
   H3 − W\* lie above 0.
2. *Labels shuffled.* For each of the six arms and each of BD and WB, the mean AP over 20 label permutations is at most
   π + 1/50, compared exactly, π being the share of True rows (1,194/12,365 and 764/1,493). That bound is at least six
   null standard errors above a random ranking's expected AP (item 19).
3. *Symmetric score on direction.* Sym on H3, and GloVe on the BD-dir rows in its vocabulary, give a direction
   accuracy of exactly 0: every row ties, and a tie is wrong under the strict ">" (Roller et al.'s symmetric Cosine
   scores .00, verified). Any other value means the direction evaluator breaks ties.

**Checks that must pass.** The count checks (item 9). A mismatch stops the run with no result.

**Decision.** For each part: supported if its four intervals lie above 0; refuted if any lies entirely at or below 0;
inconclusive otherwise.

**Prediction.** (a), (b) and (c) supported, for L12(a)'s reasons. 1,099 of BLESS's 1,334 in-index positives and 680 of
WBLESS's 834 are spanning-ancestor pairs for some sense pairing (all folds; item 20), which G places near the top in
H, while F interleaves ancestors and non-ancestors across depths. In (c), with ancestry G(x, y) is near 0 and G(y, x)
about −2τ per letter between them; without ancestry G's order follows depth, and F3's radius is not monotone along a
word. F\* is the likeliest inconclusive cell of (c), because a prefix's radius is usually below its extension's. For
orientation only (verified; the paper's folds were never released): Roller et al.'s spmi .76 / .96 / .96 and HypeCones
.81 / .98 / .94 for BLESS AP, WBLESS AP and BLESS direction.

**Data.** The suite's repository is CC BY-NC 4.0. Of its upstream sets, EVALution's repository is Apache-2.0 (its
`LICENSE.txt`) and the others state no licence. Hashes only.

#### L14 · Learned Lorentz against learned Euclidean on WordNet's direct edges

**Claim.** Trained by Amendment 10's protocol on WordNet 3.0's 75,850 direct noun hypernym edges E alone (item 10),
at the same dimension, budget, rate grid and seeds, learned Lorentz embeddings beat learned Euclidean embeddings at
d = 2 and d = 3, both read by G at the origin o (item 10.8; neither loss anchors any synset at o, a dependence named
under Risks):
- (a) on HiT's multi-hop test, ranking each child's held-out indirect ancestor above its 10 random negatives, and above
  its 10 hard negatives;
- (b) on HyperLex's noun pairs.

**Instances.**
- (a) HiT: `wordnet-multi/test.jsonl`, 29,383 rows as given (repeats kept). The random setting pairs each row's
  `parent` with its 10 `random_negatives`; the hard setting with its 10 `hard_negatives`. Names resolve to offsets by
  item 3. Every test pair is in T, so none enters training as a positive. The rows hold 2,110 distinct positives:
  entity.n.01 is the positive of 12.8% of them and the 12 most frequent positives of about half. 3 rows hold the child
  itself among their random negatives, and 23 (random) and 14 (hard) rows repeat a negative (at least 9 distinct): all
  kept as given. G scores the child itself 0, the top, so those 3 rows have RR at most 1/2 in every table.
- (b) The HL rows covered in U_@ (2,153), with senses restricted to U_@ and the gold of L12. Disclosed: HyperLex drew
  its hyp-1 pairs as WordNet path-length-1 pairs, so most of them are edges of E for some sense pairing and were seen
  in training; (b) measures how training on E carries over to graded judgements, not held-out generalisation. The
  number of HL rows that are E edges for some sense pairing is reported.
- Training data, cells, tuning, runs and replays: item 10.

**Arms.** Learned Lorentz and learned Euclidean at d ∈ {2, 3}, seeds 0–4, at the frozen rates; their edge-shuffled
partners and floors.

**Metric.**
- (a) The pessimistic reciprocal rank RR of each row (item 7). For each d, setting and seed, the per-row differences
  RR(Lorentz) − RR(Euclidean), with `rank.ci_mean` over the rows (item 7 gives the reason for rows as the unit).
- (b) ρ; for each d and seed, ρ(Lorentz) − ρ(Euclidean) with the word-level ci_rho.

**Controls that must fail.** If control 1 or 2 does not fail as required, L14 is void; controls 3 and 4 void the part
they name.
1. *Within-row label shuffle (the evaluator).* One `Rng(2620)` draws j = below(11) for each test row in order, and
   candidate j of that row (0 its parent, then its 10 random negatives in file order) is declared the positive. For
   every trained table, as many as exist (the 48 tuning, 20 measured and 20 edge-shuffled tables), the mean RR in the
   random setting is at most H₁₁/11 + 1/50 (= 0.29453), compared exactly; a correct evaluator gives at most
   H₁₁/11 = 0.27453 in expectation whatever the table, with a standard deviation of about 0.0015.
2. *Point relabelling* (after A10.9's control 1). P = `Rng(7).shuffle(list(range(74401)))`, computed once, in the
   decisive run; the node with index P[i] takes row i's point. For every trained table, as many as exist, the
   relabelled RR in the random setting, averaged first over the rows of each positive synset and then over the 2,110
   positive synsets (the *macro mean*), is at most H₁₁/11 + 1/50, compared exactly.
   - *Why the macro mean.* Under relabelling, every row whose positive is a given synset shares the one point that
     synset's label receives, so the per-row mean moves with a few labels. Seven positives each hold more than 2.76% of
     the rows, enough alone to breach +1/50 if the label lands on a point of low radius: entity.n.01 12.8%,
     physical_entity.n.01 6.9%, abstraction.n.06 6.5%, whole.n.02 4.9%, object.n.01 4.7%, organism.n.01 2.8% and
     living_thing.n.01 2.8%, whose rows reaching RR = 1 would raise the per-row mean by 0.093, 0.050, 0.047, 0.036,
     0.034, 0.020 and 0.020. The shares' sum of squares is 0.0344 (about 29 effective labels). In a synthetic model
     where G ranks candidates by the radius of the point their label takes (item 19), one P breaches the band in the
     per-row mean with a chance of about 1 in 6 to 1 in 4 per table, and since P is shared the tables breach together.
     Weighting each positive synset once makes the standard deviation about √(0.0663/2,110) = 0.0056, 0.0663 being the
     variance of one row's RR when its 11 candidates are exchangeable, so the band lies about 3.5 standard deviations
     above the expectation.
   - *The expectation.* For any table and a uniform P, a row's 11 candidates take exchangeable points, so its expected
     RR is at most H₁₁/11 (ties count pessimistically). The 37 rows that repeat a negative can exceed it by at most
     0.006 each, which moves the macro mean's expectation by at most about 10^−4.
   - *Reported,* to tell a tail event from a leak: per trained table, the per-row relabelled mean RR under P; for each
     measured table, the radius rank of the points that P gives the seven labels above; and each measured table's
     per-row and macro relabelled means under 200 further permutations `Rng(2700 + j)`, computed in binary64.
3. *Edge-shuffled training, per metric.* For each d, each metric (RR random, RR hard, ρ) and each seed s present at d,
   the interval of true − shuffled (item 10.6) lies above 0 in at least one of the two cells at d (ci_mean over the
   test rows for RR, ci_rho over the 2,153 rows for ρ). If at some (d, s, metric) neither cell's interval lies above 0,
   the part that uses the metric is void: (a) for either RR, (b) for ρ. Every cell's interval is reported, and a cell
   whose interval does not lie above 0 is reported as "true ≈ shuffled". Why at least one cell: a losing arm that
   learns nothing measurable is a result, not an evaluator defect, and requiring the control of the predicted winner
   alone would void the part exactly when Lorentz learns nothing, which would shield the prediction from refutation.
   This narrows A10.9's reading (every cell and seed) for L14 only, registered now.
4. *Gold shuffled.* For each measured table, |mean ρ over 20 gold permutations| ≤ 5/√(20·2,152) = 0.0241. Otherwise
   (b) is void.

**Checks that must pass.**
- *The closure of the training edges* (a positive control). Scoring each test row by membership in the transitive
  closure of the 75,850 training edges gives RR = 1 on every row in both settings. Otherwise the names or rows are
  misread, and L14 is void.
- The count checks (item 9); a mismatch stops the run with no result. The floors (item 10.6) are reported.

**Decision** (A10.7's rules). At (d, s) a seed is *present* when both measured tables exist and converged (item 10.7)
and both cells' edge-shuffled runs at s exist. A cell without a frozen rate has no seed present.
- (a) For each d ∈ {2, 3} and each setting: supported if all five seeds are present with lo > 0; refuted if the mean is
  ≤ 0 in three or more seeds present. (a) is supported if all four (d, setting) cells are supported, refuted if any is
  refuted, and inconclusive otherwise.
- (b) For each d, the same rule on ρ. (b) is supported if supported at both d, and refuted if refuted at either.
- Item 7's precedence applies to each part as a whole. The claim is stated at the training budget in force at the
  decisive run: item 10.3's 1,000 epochs unless the definitions amendment changes it.

**Prediction.** (a) and (b) supported, with a larger gap in (a) than in (b), held with low confidence: inconclusive is
a likely alternative and refuted a possible one.
- L6(a) found Lorentz ahead by 0.72–0.75 in closure MAP at d = 2 and 3 on the mammals (Phase 4, public). A tree of
  74,401 nodes cannot sit in R² or R³ without crowding distinct subtrees together. In H a child placed beside its
  parent, which sits beside its own parent, lies near the geodesic toward the region of the general synsets, and G
  reads ancestry if that region is near o.
- *Risks.*
  - Training on direct edges is Ganea et al.'s "0% non-basic" setting. There 5-d Poincaré and Euclidean embeddings
    reached test F1 29.4 and 26.8 on transitive pairs, and 10-d ones 28.9 and 29.4 (verified, Table 1): the only
    published direct-edge comparison has a mixed sign. Absolute values may be low; the prediction concerns the
    difference.
  - A node gets about one positive row per epoch here, against 5.5 on the mammals, so Euclidean at low rates may not
    converge within 1,000 epochs, which removes seeds and leaves (a) inconclusive.
  - *The origin.* G reads ancestry from o. Neither loss anchors a synset there: the softmax depends only on distances,
    so it is invariant under each geometry's isometries. Both arms start every point within 10^−3 of o. The Euclidean
    step gives the anchor a and the candidate −a (A10.4), so it conserves the table's centroid up to rounding, and o
    stays the centroid of 74,401 mostly leaf points; nothing in the Lorentz step holds a point at o. Whether the
    general synsets end near o is an outcome of training, and the arms may differ in it; about half the test rows have
    one of 12 general synsets as their positive. The Euclidean arm is trained on the squared distance (A10.4) but read
    through the distance itself, because G ≤ 0 needs the triangle inequality. Reported for both arms (item 11): G with
    the base point at the table's own point of entity.n.01, the distance-only score, and whether their per-seed mean
    differences agree in sign with G's; a disagreement in three or more seeds of a (d, setting) cell is stated in the
    write-up.
- For orientation only: HiT's static PoincaréEmbed (200-d, Riemannian Adam, Nickel & Kiela's α = 10³ score, an integer
  threshold grid) scored F1 0.864 / 0.830 with random / hard negatives (verified, HiT Table 2).

**Data.** HiT's Zenodo record is CC BY 4.0: hashes and the name verifier are committed, not its 41 MB of files.
HyperLex as in L12. Tables stay in the cache, with their SHA-256s committed (item 14).

#### L15 · Where flat should win: similarity and relatedness

**Claim.**
- (a) *At matched information.* Read by distance with the maximum over senses (Sym), the curvature-0 constructions do
  as well as the exact hyperbolic trees on human similarity (SimLex-999 nouns) and relatedness (MEN noun–noun pairs):
  the hyperbolic gain in ρ is at most 0.02.
- (b) *Against a distributional space.* With H3 read by Sym, GloVe 6B 300-d cosine beats H3 on relatedness (MEN
  noun–noun pairs and WordSim-353's relatedness pairs), and H3 beats GloVe on HyperLex's nouns. Both scores are
  symmetric, so this part compares information sources, not curvature or direction. HyperLex's pairs and TYPE were
  built from WordNet, so its leg is near-circular by construction.

**Instances.**
- SL: the `SimLex-999.txt` rows with POS `N`: 666, all covered; the gold is the `SimLex999` column (0–10).
- MEN: the `MEN_dataset_lemma_form_full` rows whose two words are both tagged `-n`: 2,005, all covered, tags
  stripped; gold 0–50.
- WSR: `wordsim_relatedness_goldstandard.txt`: 252 rows, 245 covered in U_full.
- HL as in L12.
- In (b) each set is intersected with GloVe's vocabulary (item 3). Those counts are made when the code is built,
  written into the instance manifest (item 2) and frozen in the definitions amendment, before any score.

**Arms.** (a) H3, H2, F3, F3\*, F2 and F2\* with Sym (exact rational keys; no decimal step), and the controls K3,
S-full and W on H3 with Sym. (b) H3 with Sym, and GloVe; H3 with G against GloVe on HL is reported.

**Metric.** ρ; the paired differences with the word-level ci_rho.

**Controls that must fail.** If control 1 does not fail as required, (a) is void; control 2 voids the part that uses
the set; control 3 voids (b).
1. *(a): the hierarchy and the senses are visible.* On SL and on MEN, the intervals of ρ(H3) − ρ(K3),
   ρ(H3) − ρ(S-full\*) and ρ(H3) − ρ(W\*) lie above 0. "Flat does as well" on a set that does not see WordNet's
   structure would be empty.
2. *Gold shuffled.* For every arm and set, |mean ρ over 20 gold permutations| ≤ 5/√(20(n − 1)) with the set's n (SL
   0.0434, MEN 0.0250; WSR and HL within GloVe from their frozen counts).
3. *(b): GloVe vectors shuffled.* For each set of (b), its distinct covered words in code-point order are permuted by a
   fresh `Rng(2580 + i)`, i < 20; word k takes the vector of the word at position k of the permutation. |mean ρ| lies
   within control 2's band.

**Checks that must pass.** The count checks (item 9). A mismatch stops the run with no result.

**Decision.**
- (a) Supported if all eight intervals, ρ(H3) − ρ(F3), ρ(H3) − ρ(F3\*), ρ(H2) − ρ(F2) and ρ(H2) − ρ(F2\*) on SL and on
  MEN, have hi ≤ +0.02; refuted if any has lo > +0.02; inconclusive otherwise.
- (b) Supported if ρ(GloVe) − ρ(H3) lies above 0 on MEN and on WSR and ρ(H3) − ρ(GloVe) lies above 0 on HL; refuted
  if any of the three lies entirely at or below 0; inconclusive otherwise.

**Prediction.**
- (a) Refuted, at least on SimLex. Phase 0 expected a flat *distributional* space to win here. With the same
  information in both arms, curvature is what lets the tree keep WordNet's path distances (L5): F collides on its
  lattice and F\* compresses depth, and SimLex's nouns follow WordNet path distance closely (shortest path with
  max-similarity senses scores 0.513 on these 666 pairs; path2vec Table 2, verified). On MEN the gain is smaller and
  less certain, and MEN's word reuse (2,005 rows, about 410 effective words) widens its intervals. Read with L12(a):
  if both turn out as predicted, curvature makes the tree a more faithful copy of WordNet for every judgement that
  follows WordNet, not for type-of alone.
- (b) Supported on MEN and WSR: corpora carry association and WordNet carries taxonomy ("cup" and "coffee"). On
  HyperLex less certain: both readings give a pair and its reverse one score, so neither gains from direction, and
  H3's lead rests on WordNet's distinctions, which built HyperLex's TYPE (its no-rel pairs come from association norms
  and have no WordNet relation, so they sit near in a corpus and far in WordNet). For orientation (verified, other
  spaces and versions): the symmetric WordNet measures WN-WuP and WN-LCh score 0.214 on HyperLex (Table 13, WordNet
  3.1); Roller et al.'s distributional Cosine scores .14 on HyperLex's test nouns; on SimLex's nouns, reported here,
  path2vec gives GloVe Common Crawl 0.404 against WordNet's 0.513.

**Data.** SimLex-999 states no licence. MEN's `licence.txt` releases "the models" under CC BY 2.0 and does not say
whether that covers the pairs and ratings, so MEN is treated as CC BY 2.0 at most. Agirre's split states none
(WordSim-353 is CC BY 4.0 per Phase 0, not re-read). GloVe is PDDL. Hashes only.

**1. Code and authorities.**
- The Python reference decides every part of L12–L15 (Common rules, "Authority"; D9 for the trainer). New modules in
  `reference/lexicon/`: `stage2data.py` (pins and loaders, word-column readers kept apart from gold readers, item 8),
  `senses.py` (item 3), `wngraph.py` (WN and its reported variants), `scores2.py` (items 5–6), `stats2.py` (item 7),
  `hit.py` (rows, names, the verifier and HIT-R) and `glove.py`; `reference/golden/make_stage2_v1.py` (fetch, check
  and the instance manifest); the runner `reference/run_claims_stage2.py`.
- `embed.py`, `stream.py` and `pystream.py` gain new functions only (item 10.2), and every Phase 4 test passes bit for
  bit. `rank`, `h3tree`, `h2exact`, `flat`, `address`, `learned`, `wordnet` and `l6` are used unchanged. NLTK is not
  used anywhere.
- After the decisive run, `lexicon_core.js` reproduces the rational keys and the tie-class lists (BigInt fixed point at
  1,024 bits for the square roots), compared by SHA-256 on `Rng(8000 + i)` traces and on the decisive pass-1 code
  files. It decides nothing, and it is required before the browser shows any Stage-2 claim as holding.

**2. Data pins, licences, and what is committed.** `reference/golden/make_stage2_v1.py --check` fetches each file into
its own new folder under `~/.cache/hyperbolic-lexicon/stage2/<name>/`, checks its size and SHA-256, opens archives with
`zipfile` and checks their members the same way, and refuses on any difference. Nothing fetched is executed; parsing
runs under `python3 -B -I` with explicit paths. Paths inside a repository are given where known; the SHA-256 is the
pin.

| Set (use) | Source at revision | File: bytes, SHA-256 | Licence; committed |
| --- | --- | --- | --- |
| HyperLex (L12, L14(b), L15(b); split reported) | github.com/cambridgeltl/hyperlex @ `ccb416191a46e37f7104a530e7c23f260e066e8c`, `hyperlex-data.zip` 183,900 B `27ef061e2f711d8e8a53b9fe204eaf06c596ef53d95bbed81ae52c6eebe5713b` (ivulic/hyperlex has the same HEAD; the size equals the 183,900 B gensim recorded for the original host in 2019) | `hyperlex-all.txt` 157,526 B `582297878d7ab4d08b284291fdd828c686757dc2c8a9db062416c87bda73923c`; check: its N rows equal `nouns-verbs/hyperlex-nouns.txt` 130,654 B `b296c920fa4fe0367fe2f2a053d6db68afa4799bdf37f6092a5840fa7622703c`; reported: `splits/random/hyperlex_test_all_random.txt` 39,559 B `4c8115d25c6ea732507a70f619bb7fb63a5aab6a0f3bf4990e482dc121a6a0e3` | none stated; hashes |
| hypernymysuite (L13; the rest reported) | the suite, `data/` (checked in; `download_data.sh` is neither run nor adapted) | `bless.tsv` 364,389 B `bfe8f66540fb08b46e42ea690d49aa8c57c979fa9c9eb6900f1484cfc2b4fdb8`; `wbless.tsv` 51,267 B `24a3d202fb05883c93ec214982b697569325e372791819568c6f8ad125d1aa76`; reported: `leds.tsv` 73,597 B `aadbfd66301d6c50a8bd0408f874be27f3adc9675ab18a2ea7b2ac7a65fbbaa1`, `eval.tsv` 400,751 B `2ef2cbdbb7e6afee2c2c4604116f7ab33944cc8ced1f636f6ee50470810ad163`, `shwartz.tsv` 1,397,533 B `148e6a1fe206269763ff32a970bd33315a187cf21cbd7030782815301bf468a0`, `bibless.tsv` 37,667 B `ceb040e7fb59d401b0049980ffcb056935d7b910b5e354749e1613f8f258516e`, `hyperlex_rnd.tsv` 85,088 B `7ec7fcefe488c8d17bf31c6affe8643f0d3f02bc228b18c08e9768e24754c133` | repository CC BY-NC 4.0; upstream: EVALution's repository Apache-2.0 (its `LICENSE.txt`), the others unstated; hashes |
| EVALution upstream (reported check) | vered1986/UnsupervisedHypernymy @ `e3b22709365c7b3042126e5887c9baa03631354e` | `datasets/EVALution.val` 39,621 B `490e86f8c4c1c112a4cc82fc0123b31a790d14fdae8cfc485a89e7ae33dce0e5`; `datasets/EVALution.test` 354,725 B `392541eb07e4abbd45630a8ada7b95a69c5af4216f5ef92c31a70265be68a923` | repository Apache-2.0; hashes |
| HiT WordNet multi-hop (L14) | zenodo.org record 14036213 (concept DOI 10.5281/zenodo.10511042), `wordnet-multi.zip` 20,655,764 B `882033a7f05484a450703f1604b363a1af9d72569c5e83c18d1c98e723905d87` (API MD5 `39c18ae770a4d84c650badc5f648f6d8`) | `wordnet-multi/train.jsonl` 36,829,683 B `1eaf3c8fdd41991d7b397d092f4f40958e208ab942e7f76d239f889e2fc3afe3`; `val.jsonl` 14,281,583 B `708dc06c02bc5fc23d6aa7c84b946e1a080d0baae554b370fa408ca192d8841a`; `test.jsonl` 14,288,451 B `4c525a6de8ee315ef2999f27343d7c9401fc8895baf8c97c7870ced870da46e2`; `entity_lexicon.json` 11,480,490 B `0006c5bdfa0b363f20be083895c054bd1c5a1d20e54cf439017752a86abefaae` | CC BY 4.0 (the Hugging Face card says Apache-2.0); hashes and the verifier |
| SimLex-999 (L15) | commonsense/conceptnet5 @ `fda1b39607ea6f07e41ddce22d9d5f8360ded581`, `conceptnet5/support_data/simlex/SimLex-999.txt` (byte-identical in EloiZ/embedding_evaluation @ `6928da22b7dd53d18d5816236539062a01093ff2`) | 44,050 B `ca00ff8515a36cde32d13c2b83def23f5a167b67db93ebfcfb7dae039ba22c0b` | none stated; hashes |
| MEN (L15) | Thombrom/6.8611-project @ `0d05a99326da36bc1c672cd1fa32dd8de6abf9b1`, `datasets/MEN/` (byte-identical in akshithio/glove-fastText @ `27e4fca89513529b45663d26db849006f76502a4` and fanglanting/RA-retrofit @ `258c0351939b2cd90dd4ac213a728bac2b5a3de3`) | `MEN_dataset_lemma_form_full` 80,593 B `d13c9c666691944c29aa4bdee7128fa69eb5f9734603f8c6048d1bc2ca08465a`; `licence.txt` 809 B `d8d7416e8adbba39f5eeabf2876a98293c4ac2ce2f25f7446d6a435f8e7b67b6` | `licence.txt`: "The models are released under a Creative Commons Attribute licence (…/by/2.0/)"; whether this covers the pairs and ratings is not stated: CC BY 2.0 at most; hashes |
| WordSim-353 (L15; similarity and combined reported) | Agirre's split: deemakx2/PPDM2 @ `e2de627dc1c4ad916916858789612b92aa642a6a`, `DATA/wordsim353_sim_rel/` (byte-identical, same blob ids, in ToineSayan/MUtE @ `d81f01ea8558c8b4c696ba9c210132048bb895f0` under `data/GloVe/evaluation/ws353simrel/wordsim353_sim_rel/`; the relatedness file also in mfaruqui/eval-word-vectors @ `94b3dd9fdbac7ed08dbee7179cd5ee464acf0594`, `data/word-sim/EN-WS-353-REL.txt`). Combined: conceptnet5 @ `fda1b396…`, `conceptnet5/support_data/wordsim-353/combined.tab` | `wordsim_relatedness_goldstandard.txt` 5,134 B `66a7c88100624d0a391605ff61ce84e11d11ee620d51ec0298da49592838f8fa`; `wordsim_similarity_goldstandard.txt` 4,002 B `f1da938998863c94e53f72f984a5c6e215f0b46c323aae8f0f4930703a339107`; `combined.tab` 7,433 B `1edf400ed472e796b3be562cf7970b10d749a07874a96ddc77e75fd1006b446c` | the split states none; WS-353 CC BY 4.0 per Phase 0, not re-read; hashes |
| GloVe (L15(b)) | huggingface.co/stanfordnlp/glove @ `1db2080b2d94def6e5b0386a523102f9d8849e9d`, the download that the official README (stanfordnlp/GloVe@52f7dbc) links | `glove.6B.zip` 862,182,753 B `6471382cdd837544bf3ac72497a38715e845897d265b2b424b4761832009c837` (the Hugging Face API's LFS oid for that revision is the same); only its text members are read: `glove.6B.300d.txt` (decided) 1,037,965,801 B `a12599d41e3589c7160be27fffe5b0080eccd0f0c75f46666c59f90188093c40` and `glove.6B.50d.txt` (reported) 171,350,515 B `c99ba128d1efdaa3496b7542ba599ecdd1dd6679114d3b5ce19f0ec208b4aa5b`, each 400,001 lines with no repeated word | PDDL; hashes |
| WordNet 3.0 | as registered (`cbda5ea6…`) | — | WordNet licence |

- *Provenance of the pinned copies.* HyperLex's zip equals the original host's size, and its N rows and splits equal
  the paper's counts (Table 10). Agirre's split (WSR) has no primary count or checksum. It is judged equal to WS-353
  in pairs and scores: the similarity and relatedness files' 352 distinct ordered pairs are exactly combined.tab's,
  their 103 shared pairs are the overlap that Agirre et al.'s construction gives (similarity = similar ∪ unrelated,
  relatedness = related ∪ unrelated), all 455 scores equal combined.tab's, and three copies are byte-identical. Its
  provenance is likely, not proven, and is reported so.
- *Rejected copies*, recorded so that nobody uses them: Hugging Face `almogtavor/WordSim353` @ `9a943442…` and
  `enus5three/WordSim353` @ `bbe0190d…` (`wordsim353crowd.csv` 7,488 B `6ebe5d67…`), a crowd re-rating that differs
  from WS-353 on 351 of 352 pairs; LEAR's `evaluation/simlex-english.txt` (nmrksic/LEAR@67c2b02), which is not
  SimLex-999's scores; mfaruqui's `EN-MEN-TR-3k.txt` (53,593 B `888b1358…`), the lemma form with its tags stripped;
  the Hugging Face parquet copies of HiT and MEN, where the pinned text files exist.
- *Phase 0's licence table* (Explainer 7 §9) lists HyperLex, SimLex-999, MEN, HiT's Zenodo data and SemEval-2018
  Task 9 as "Report only; nothing redistributed", and hypernymysuite as "Protocol reference only … Not redistributed".
  It is read as a rule about redistribution. Claims may be decided on these sets because no word, rating, label, TYPE
  or line of any of them enters a committed file, shard or page: results key rows by number, and only pins, hashes,
  counts, metrics and per-row codes of this project's own scores are published. The suite's data files become pinned
  instances as well as a protocol reference, used for non-commercial research evaluation under CC BY-NC 4.0; its code
  is read, never run or copied. Two rows of that table change: MEN's `licence.txt` releases "the models" under CC BY
  2.0, which may or may not cover its data (CC BY 2.0 at most; nothing is redistributed), and HiT's Zenodo record is
  CC BY 4.0.
- *The instance manifest.* `reference/golden/stage2_instances_v1.meta.json` is written by `make_stage2_v1.py` from the
  pinned files and WordNet. For every instance of the claims and of item 11 it holds: the source SHA-256; the row
  count; the covered count in each universe used; the SHA-256 of the covered row numbers (0-based data rows after any
  header, decimal, LF-joined, no final LF); the SHA-256 of the N_S pairs `x<TAB>y` in row order; the clusters (count,
  and the SHA-256 of their keys in row order); the word types of each ρ set (count, and the SHA-256 of their N_S forms
  in code-point order, LF-joined); and, for L15(b) and L13's control 3, the GloVe-covered rows. The definitions
  amendment freezes it by its SHA-256, as Amendment 2 froze L1's lists, and the decisive run refuses another.

**3. Words, senses and pair sets.**
- *Normalisation N_S.* ASCII A–Z are lowercased and each space becomes `_`. Nothing else: N_B is not applied (these
  are word lists, not text) and there is no lemmatiser (the suite's NLTK lemmatiser gives different forms for 220 of
  its word types between NLTK ≤ 3.7 and ≥ 3.8). Non-ASCII words are kept and counted. MEN's tag (the last two
  characters, `-n`, `-v` or `-j`) is read and removed first.
- *Senses.* S_U(w) is the list of offsets of `index.noun[N_S(w)]` that lie in the universe U (U_full; U_@ for L14), in
  index order (sense 1 first); it is empty when the lemma is absent. A row is *covered* in U when S_U(x) and S_U(y)
  are both non-empty. For GloVe, both N_S words must also be in GloVe's vocabulary; a word whose N_S form contains `_`
  is treated as outside it (6B holds 460 such tokens, artefacts such as `formula_1` and `codice_1`).
- *Pair sets.* Every comparison runs on one pair set: the rows covered by every arm in it, in file order, repeats kept
  and counted. No decision imputes an uncovered row.
- *The sense rule.* For a sense score φ, Φ(x, y) is the largest φ(s, t) over (s, t) ∈ S(x) × S(y) in the order of
  item 6; only the value is kept. Φ(y, x) ranges over S(y) × S(x). This is HyperLex's guideline ("if any of their
  senses"), Resnik's rule, the SimLex authors' footnote and path2vec's choice. Reported only: first senses
  (S(x)[0], S(y)[0]); gensim's rule (the sense pair at the smallest distance, then scored); and noun morphy for words
  absent raw (`noun.exc` first, then the endings s→∅, ses→s, xes→x, zes→z, ches→ch, shes→sh, men→man, ies→y; the
  shortest candidate in `index.noun`).
- *HiT names.* An `entity_lexicon.json` name resolves by NLTK's rule: the first lemma of the synset's data line,
  lowercased, then `.n.`, then the two-digit 1-based position of the synset in that lemma's `index.noun` entry. HiT
  rows use synsets directly, with no senses.

**4. The arms.**
- *H3, H2.* L3's exact points of all U_full synsets (`h3tree`, t = 3/4; `h2exact`, t = 11/13). The base point o is
  the empty word's point, the hyperboloid's (1, 0, …). x0(s) = cosh r(s) and K(s, t) = −⟨P(s), P(t)⟩_L = cosh d(s, t)
  are exact rationals.
- *F3, F3\*, F2, F2\*.* L5's curvature-0 arms (`flat`, A1 item 7) on the same words; o = 0; |s|² and |s − t|² exact.
- *WN*, WordNet's own graph with no geometry. Parents are `@` ∪ `@i` (`wordnet.closure_parents`). A(x) = {x} ∪ x's
  closure ancestors; up(x, a) is the fewest upward edges from x to a ∈ A(x); D(x) = up(x, entity.n.01).
- *K3.* L5's content-hash words (`address.k3_words`) placed by `h3tree`.
- *S-full_i*, i < 20. P_i = `Rng(2400 + i).shuffle(list(range(82115)))`; the synset with offset-order index P_i[j]
  takes H3's point of synset j (`l6.move_points`'s convention); o stays.
- *W_i*, i < 20: the polysemy-matched lemma shuffle. `index.noun`'s 117,798 lemmas are grouped by their number of noun
  senses k = 1, …, 9 and k ≥ 10 pooled (101,863, 10,257, 2,989, 1,178, 620, 306, 212, 94, 96 and 183 lemmas). One
  `Rng(2420 + i)` takes the strata in increasing k: each stratum's lemmas, sorted by code point as L, are permuted by
  `shuffle` into Q, and lemma L[j] takes the sense list of Q[j]. The geometry (H3) stays in place, so the maximum over
  senses is inflated as for the real arm while the words become other words.
- *Learned.* L14's snapped tables over U_@ (item 10).
- *GloVe.* 6B, 300-d (50-d reported); word vectors read as exact decimals; word-level, no senses.
- *Reported only:* S3_i, L5's equal-length permutations (`address.s3_words(words, 2000 + i)`, i < 5: L5's public noun
  permutations), which keep every depth; WN-U, the undirected `@` ∪ `@i` graph's BFS metric d_U, read as
  −(d_U(s, t) + d_U(t, root) − d_U(s, root)); ST, L3's spanning tree with unit edges; the letter tree; WN-path; WN-LCh.

**5. The scores.** For an arm with base point o and metric d, r(s) = d(o, s). For an ordered sense pair (s, t):
- *G(s, t) = r(s) − r(t) − d(s, t)*, the is-a score. G ≤ 0 by the triangle inequality, and G = 0 exactly when t lies on
  a geodesic from o to s. G = −2(r(t) − (s|t)_o), the Gromov form at o. It is HiT's score with λ = 1: no free constant,
  no threshold.
- *Sym(s, t) = −d(s, t)*, the symmetric score; its maximum over senses is the minimum distance.
- *Dep°(x, y) = r(s\*) − r(t\*)*, where (s\*, t\*) is the first pair of S(x) × S(y), x's sense index the major key,
  among the pairs in the top tie class of G: the depth gap of the senses G chose.
- *WN*, exact integers: G_WN(s, t) = −2·min over a ∈ A(s) ∩ A(t) of up(t, a), which is 0 exactly when t ∈ A(s);
  Sym_WN(s, t) = −p(s, t) with p = min over a ∈ A(s) ∩ A(t) of up(s, a) + up(t, a) (WN-path); Dep_WN = D(s) − D(t).
- *GloVe:* cos(x, y) on the word vectors.
- *Reported only:* Dep under the maximum over senses and under first senses; Nickel & Kiela's eq. 8 with α = 10³ and
  Poincaré norms ‖u‖² = (x0 − 1)/(x0 + 1); the product (r(s) − r(t))·d(s, t); the letter form −2(|w(t)| − lcp(w(s),
  w(t))); WN-LCh = −log((p + 1)/(2·D_max)), D_max the longest root path plus one, computed by a separate
  bidirectional search; for learned tables, G_root, G with the base point p at the table's point of entity.n.01
  (r_p(s) = d(p, s); G_root ≤ 0 by the same triangle inequality), and the distance-only score −d(s, t).

**6. Exact and certified order; tie classes.**
- *Exact keys,* ordered as exact integers or `Fraction`s: the WN and letter-tree scores; Sym through K for H3 and H2,
  through the squared distance for F and learned Euclidean, and through
  K = 1 + 2·4^32·|n_s − n_t|²/((4^32 − |n_s|²)(4^32 − |n_t|²)) for learned Lorentz (A10.11), not κ, which orders one
  query's candidates only; GloVe through c·|c|/(|a|²|b|²) with c = a·b, an increasing function of the cosine.
- *Certified values:* G, G_root and Dep° of the H, F and learned arms.
  - H and learned Lorentz: e^G = E(x0_s)/(E(x0_t)·E(K)) and e^Dep = E(x0_s)/E(x0_t), with E(z) = z + √((z − 1)(z + 1)).
    The radicand is formed exactly before any rounding. For learned Lorentz x0 = (4^32 + |n|²)/(4^32 − |n|²). G_root
    replaces x0_s and x0_t by K(p, s) and K(p, t).
  - F and learned Euclidean: G = √|s|² − √|t|² − √|s − t|² and Dep = √|s|² − √|t|², from exact squared norms (for
    learned tables the common factor 2^−32 is dropped); G_root uses |s − p|² and |t − p|².
  - Two values whose exact input tuples are equal ((x0_s, x0_t, K), or (|s|², |t|², |s − t|²); for Dep the first two)
    are tied without computation.
  - Each value is computed with Python `decimal` at precision p = 120 (ROUND_HALF_EVEN), every exact rational entering
    through one division and `sqrt` correctly rounded. It carries the bound e_p = 10^(10 − p)·M, with M the value
    itself for the H forms and the sum of its square roots for the flat forms, about eight orders of magnitude above the
    accumulated rounding error. Two values are ordered by their 120-digit results when they differ by more than the sum
    of their bounds; otherwise both are recomputed at p = 240 and ordered the same way; values still within the sum of
    their 240-digit bounds are tied (a *numerical tie*). This rule, its thresholds included, is part of the metric.
- *Reading of "tied exactly".* The Common rules' tie sentence speaks of a neighbour "tied exactly" with a
  non-neighbour. A numerical tie between different input tuples is read as tied exactly for AP, RR and accuracy: G is
  irrational in general, and exact algebraic comparison of sums of square roots is not done. Every such tie is
  counted and reported with its inputs, so a reader can see whether any decision rests on one.
- *Tie classes.* An arm's values on a pair set (both directions together where a metric compares them) are sorted and
  numbered 0, 1, … by tie class. Every metric and bootstrap reads only these integers; no float64 value orders
  anything decided. The classes are ordinal: whether two values share a class, or which is above, does not depend on
  the other values in the list. A chain of numerical ties whose ends lie farther apart than their bounds, the one case
  where it would, stops the run, to be repaired by amendment. Every 240-digit recomputation and every numerical tie
  between different input tuples is counted and reported with its inputs. Φ's maximum over senses uses the same
  comparison.

**7. Statistics, intervals and decisions.**
- *ρ.* R_i is the average rank of row i's tie class among the n rows, and likewise for the gold (equal exact values
  tie). With the integers a_i = 2R_i − (n + 1) and b_i likewise, ρ = Σa_ib_i/√(Σa_i²·Σb_i²), its three sums exact,
  displayed correctly rounded to six decimals; a zero variance gives ρ = 0, flagged. A comparison with a rational
  bound is made exactly. Reported: the tie-pessimistic and tie-optimistic ρ, the arm's ties broken against and with
  the gold order.
- *Reading of the Common rules' tie sentence for ρ.* "Ties count pessimistically … Fractional-tie values are reported,
  never used to decide" governs AP, RR and accuracy, where a tie is broken against the positive. ρ is decided on
  average ranks, the standard tie-corrected Spearman, which scipy's `spearmanr` computes and which the suite's
  `evaluation.py` and gensim's evaluation call; it is not the mean of ρ over tie orders, which A10.11's fractional-tie
  value would be. A pessimistic reading has no neutral form for a paired difference of ρ: breaking each arm's ties
  against the gold penalises the arm with more ties, which is F against H in L12(a) and L15(a), both predicted to
  favour H, and WN against H3 in L12(d), so the tie-pessimistic ρ would decide parts by their arms' tie counts. The
  tie-pessimistic and tie-optimistic ρ are reported for every arm.
- *AP* of a pair set: one query whose candidates are the rows and whose neighbours are the True rows, by
  `rank._ap_and_ranks` (pessimistic ties: a False row tied with a True row ranks before it); an exact `Fraction`.
- *RR* of a HiT row: 1/(1 + the number of its negatives whose tie class is at least the positive's); exact.
- *Direction accuracy:* the share of rows with Φ(x, y) > Φ(y, x) strictly, tie classes taken over both directions
  together; exact.
- *Intervals:* 95% percentile bootstraps of 10,000 resamples, from a fresh numpy `default_rng(7)` for each interval.
  The resampling unit follows how each set was drawn.
  - `rank.ci_mean`, unchanged, for per-row values on HiT (the RR differences). HiT's val and test are a uniform random
    sample of T (its `construct.py`, `train_test_split`, read as text), so for fixed tables the rows are the design's
    unit; the randomness of training is what the five seeds carry. Rows sharing a positive synset are not
    independent in their effect, which the reported macro means show (item 11).
  - *ci_rho*, the word-level (pigeonhole) bootstrap, for every difference of ρ. HL, SL, MEN and WSR were built by
    choosing words and pairing them, and a word's sense placement moves every pair that holds it, in one arm and not in
    the other: HL's 2,163 rows hold 1,843 words (one in 65 rows; about 731 effective words, (Σn_w)²/Σn_w²), MEN's
    2,005 rows 645 words (about 410 effective) and SL's 666 rows about 488. A row bootstrap treats such rows as
    independent and is anti-conservative. Let the pair set's V words be the N_S forms of its x and y values, distinct,
    in code-point order. Resample b draws `rng.integers(0, V, V)`, and word k's multiplicity m_k is the number of
    draws equal to k; row i enters the resample m(x_i)·m(y_i) times, rows in file order. Both arms' ρ are recomputed
    in float64 with average ranks on the resample, and Δ_b = ρ_A − ρ_B; the interval is
    `np.percentile(Δ, [2.5, 97.5])`; the estimate is the exact full-sample difference, rounded to binary64. A
    resample with fewer than three rows, or in which a ρ is undefined, counts that ρ as 0, and is reported. This is
    Owen's pigeonhole bootstrap for one shared vocabulary, which is mildly conservative. Reported beside it: the row
    bootstrap (idx_b = `rng.integers(0, n, n)`, the calls `ci_mean` makes).
  - *ci_cluster* for BD, WB and BD-dir: the same with idx_b = `rng.integers(0, C, C)` over the C clusters, sorted by
    key in code-point order; a resample is the drawn clusters' rows in draw order, and both arms' AP or accuracy is
    recomputed on it in float64 with pessimistic ties.
- *Readings* (A10.7), in float64: "above 0" is lo > 0; "entirely at or below 0" is hi ≤ 0; "within [−m, +m]" is
  lo ≥ −m and hi ≤ m; "entirely outside" is lo > m or hi < −m; "the mean" is the estimate.
- *Precedence.* Void comes before refuted. A part that meets both its support and its refutation condition is
  inconclusive, judged on the part as a whole (A11.4). No multiplicity correction is applied: support is an
  intersection–union test over a part's cells, and the number of cells is reported with every refutation.
- *Controls.* A control *fails as required* when its stated condition holds: the broken variant shows its weakness. A
  check that must pass is a positive control, and its consequence is stated with it.
- *The strongest permutation* of a control is the one of its 20 with the largest point estimate, ties to the smaller i.
  The control fails as required only if the interval of (arm − that permutation) lies above 0.
- *Shuffle bands.* Gold shuffles: |mean of 20 ρ| ≤ 5/√(20(n − 1)), five null standard errors of the mean, in float64.
  Label shuffles: the mean of 20 exact APs ≤ π + 1/50, exactly. Within-row HiT: the mean RR ≤ H₁₁/11 + 1/50, exactly.
  Relabelled HiT: the macro mean RR (L14 control 2) ≤ H₁₁/11 + 1/50, exactly.

**8. Blind, two-pass scoring.**
- *Pass 1 (scores)* reads only the word columns, the POS column and MEN's tags (to select rows), the fold column (to
  select rows), HiT's names (a row's candidates in file order) and the tables. For every instance, arm, score form,
  sense rule and table it writes, keyed by row number, the tie-class codes, and it records the SHA-256 of the stream
  of its 120-digit values in row order. Values that took the 240-digit path or sit in a numerical tie are written, with
  their input tuples, to a side file. Where a set's rows are chosen by a label (BD-dir's True rows; the dry hyp rows
  of item 13), pass 1 writes forward and reverse codes for every covered row and pass 2 selects the rows: tie classes
  are ordinal (item 6), so whether a row's forward code exceeds its reverse code does not depend on the other rows in
  the list. Each file's SHA-256 goes into the run record.
- *Pass 2 (gold)* reads gold, labels and TYPE, runs the count checks that need them, and computes every metric from
  pass 1's files alone, refusing a file whose SHA-256 differs from the record. A test proves that pass 1 never parses a
  gold, label, relation or TYPE field: poisoning those fields leaves its files byte-identical.
- *Disk.* Full value files would take about 27–32 GB (135–160 M lines), more than the container's free 15.0 GB; they
  are not written. The code files take about 135 M lines, about 0.8 GB gzip-compressed (5.8 bytes per line, measured on
  a synthetic file), and the side files are small. Before steps 3, 5 and 7 of item 15 the runner projects the bytes it
  will write and refuses to start if they exceed the free space less 2 GB.

**9. Count checks** (positive controls). Before any metric the runner reproduces each count exactly; a mismatch stops
the run with no result and is repaired by amendment. Those that need a label or TYPE run at the start of pass 2.
- *WordNet:* U_@ has 74,401 nodes, offsets SHA-256 `9af5a81a2d8725ba431ebfc55fe17b6698a024b8d85f09c01106ae1218eeb117`
  (LF-joined); 75,850 edges, `74748ad85fcea82e8f282f5ab72cfdfacc292aa4073d58c078d7a311fa2d7dd2` (sorted `child parent`
  lines, LF-joined); 587,658 indirect pairs; 12 roots; 74,389 anchors; the smallest |NN(u)| is 73,996. `index.noun` has
  117,798 lemmas in item 4's strata.
- *HL:* `hyperlex-all.txt` has 2,616 rows, 2,163 of them N, equal to `hyperlex-nouns.txt`'s rows; 2,163 covered in
  U_full and 2,153 in U_@; 93 with both words monosemous; 1,843 word types; 464 rows whose reverse is a row. TYPE:
  hyp-1 to hyp-4 287, 241, 254, 222; r-hyp-1 to r-hyp-4 73, 53, 60, 40; cohyp 242, mero 241, syn 165, ant 68, no-rel
  217. For some sense pairing, closure: hyp-1 to hyp-4 286, 241, 254, 222, and r-hyp (reversed) 73, 53, 60, 40;
  spanning ancestor: hyp-1 to hyp-4 281, 229, 233, 214.
- *BD:* 14,542 rows; test 13,089 (1,197 True); covered test 12,365 (1,194 True), 200 concepts, 6 repeated pairs and 3
  self-pairs. All folds: 1,334 True rows covered, 1,149 closure and 1,099 spanning-ancestor pairs.
- *WB:* 1,668 rows; test 1,501 (764 True); covered 1,493 (764 True); 192 clusters; no covered row without a BLESS
  concept; 150 with two.
- *Reported sets:* LEDS test 2,495 (1,250 True), all covered, and 1,385 of 1,385 positives (all folds) first-sense
  closure pairs; EVAL 13,450 rows and 6,926 distinct pairs, 181 with both labels; Shwartz test 47,321 (11,780 True),
  17,073 covered.
- *L15:* SL 999 rows, 666 N, all covered; MEN 3,000 rows, 2,005 n–n, all covered; WSR 252 rows, 245 covered; WS-353
  similarity 203 (197 covered), combined 353 rows (344 covered) with 352 distinct ordered pairs, equal to the union of
  the two split files, which share 103 pairs and agree with it on every score.
- *Word reuse* (the word-level bootstrap's units): HL nouns 1,843 word types; SL nouns 751; MEN n–n 645.
- *HiT:* the 74,401 names map one-to-one onto U_@; the train rows equal E as a set; val and test hold 29,383 rows each,
  with 10 random and 10 hard negatives per row; every val and test positive is in the closure of E and no negative is.
  Test: 2,110 distinct positives; 3 rows hold the child among their random negatives; 23 rows repeat a random negative
  and 14 a hard negative, none with fewer than 9 distinct. Val's corresponding counts are made when the code is built
  and stated in the definitions amendment.

**10. L14's training protocol.**
- *10.1 The instance.* S = U_@ in offset order (n = 74,401; instanceSha as in item 9). The positives are E's 75,850
  pairs (child, parent), in order of (child index, parent index); the child is the anchor; 1,517 batches of 50, none
  short. NN(u) = S \ ({u} ∪ parents(u) ∪ children(u)), in index order: A10.2's construction applied to this training
  relation, with no closure taken, for A10.9's reason (the closure is what (a) tests). |NN(u)| ≥ 73,996. Disclosed:
  an anchor's indirect ancestors and indirect descendants can be drawn as negatives, about 406 and 356 of an epoch's
  3,792,500 draws in expectation (WordNet count, item 19); for the most general anchors indirect descendants are up to
  53% of their own draws. HiT filters its negatives by E ∪ T; that is not followed, because it would tell training the
  test relation.
- *10.2 The implicit non-neighbour map.* R(u) = sorted({u} ∪ parents(u) ∪ children(u)) is stored per anchor, with
  shift_i = R(u)_i − i; then NN(u)[j] = j + #{i : shift_i ≤ j}, by one binary search. The draws NN(u)[below(|NN(u)|)]
  are A10.3's, call for call. It replaces the explicit `nonneighbour_csr` table, which would need about 44 GB here.
  Before any run, tests show it equal to the explicit complement on every index for 320 anchors (300 from an
  unregistered seed and the 20 with the fewest non-neighbours) of synthetic DAGs and of the dry instance, and show
  `Stream.negatives`'s arrays and final state identical to the explicit table's over 3 epochs on a materialised instance
  of about 1,300 nodes. The edge-shuffled instances use the same map.
- *10.3 Unchanged from Amendment 10:* items 3–6, with n = 74,401 and E = 75,850 in place of 1,182 and 6,542:
  perm = `shuffle(list(range(75850)))` each epoch, batch b = perm[50b : 50b + 50] for b = 0, …, 1,516 (none short, so
  B = 50 always), 1,517,000 steps. The rest is verbatim: the stream order and initialisation; 50 negatives with
  replacement; 20 burn-in epochs at lr/10; 1,000 epochs; the loss, the step and the arithmetic, with
  `embed._accumulate_T` (no faster accumulator is adopted, so Phase 4's bits carry over); divergence; snapping at 2^−32
  and the snapped text. The budget field is `1000,20,50,50,1517000,3792500000`.
- *10.4 Cells:* {Lorentz, Euclidean} × d ∈ {2, 3}. Nothing else trains.
- *10.5 Tuning.* Rate k of {0.03, 0.1, 0.3, 1, 3, 10} (k = 0..5, ascending) trains on seeds 9000 + 2k and 9001 + 2k: 12
  runs per cell, 48 in all. A run's score is the exact mean of its mean val RR in the random setting and in the hard
  setting, under G on HiT multi-hop val (29,383 rows). A rate is eligible if neither of its runs diverged and both
  converged (10.7); its score is the exact mean of its two runs. The frozen rate is the eligible rate with the largest
  score, ties to the smaller rate; the grid is never extended; a cell with no eligible rate has no frozen rate. Tuning
  computes nothing else, and touches no other Stage-2 set. The lr-freeze amendment writes
  `reference/settings-stage2.json` and lists every tuning run from `reference/results/tuning-stage2.json`.
- *10.6 Runs.* *Measured:* seeds 0–4 at each cell's frozen rate. *Edge-shuffled:* A10.9's control 2 with n = 74,401 and
  E = 75,850; the pairs come from a fresh `Rng(2600 + s)` with A10.9's rejection rule; NN′ is the pairs' own relation;
  the draws come from `Rng(s)`. *Floors:* the initial table from a fresh `Rng(2600 + i)`, i < 5, untrained and snapped
  (the two registered uses of A10.9). Tuning tables are kept in the cache for controls 1–2.
- *10.7 Convergence.* With m(a, b) the mean of the recorded epoch losses (A10.5) over epochs a–b, a run has converged
  iff m(0, 9) − m(990, 999) > 0 and m(890, 899) − m(990, 999) ≤ (m(0, 9) − m(990, 999))/100, in float64. A
  comparison counts a seed only if both of its measured runs converged, so that the schedule cannot decide the
  geometry.
- *10.8 Scores.* G with o the origin (the dependence on o: L14's Risks): Lorentz from the lifted snapped points,
  Euclidean from n/2^32 (item 6). HiT rows use synsets directly; HL uses senses in U_@.
- *10.9 Replays and pre-flight.* Tuning replays (lorentz, 3, `0.03`, 9000) and the decisive run replays measured
  (lorentz, 3, seed 0), each with `hpstep.prng.Rng` over all 1,000 epochs (about 1.0 h of one core); the final state
  must equal the run's, or that step writes no result (A10.1). The decisive run retrains (euclid, 2, `0.03`, 9000) and
  (lorentz, 2, `0.03`, 9000) and records whether their float SHA-256s equal tuning's; a mismatch is disclosed and does
  not stop the run (A10.14).

**11. Reported, deciding nothing** (Common rules, "Reporting"), beyond what the claims list:
- *Every set and arm:* coverage and the vocabulary each arm misses; the numbers of tie classes, 240-digit
  recomputations and numerical ties; tie-pessimistic and tie-optimistic ρ; the row-bootstrap interval beside every
  word-level one; fractional-tie AP; AP in sklearn's `average_precision_score` convention (below).
- *L12:* every arm under every score of item 5 and every sense rule of item 3; the 93 monosemous pairs; ρ in each TYPE
  stratum of at least 100 pairs, on the 768 pairs with no type-of TYPE (cohyp, mero, ant, no-rel), and on the rows
  that are a WordNet closure pair in neither direction for any sense pairing (the closure bit computed from WordNet
  in pass 1); S3; the chain WN → WN-U → ST → letter tree → H3, which shows whether a gap to WordNet comes from
  multiple inheritance, virtual letters or the embedding; HyperLex's random-split test nouns (541; Roller et al.'s
  subset; the original split file and `hyperlex_rnd.tsv` must agree); whether AVG_SCORE_0_10 ranks the rows as
  AVG_SCORE does.
- *L13:* WN and GloVe; AP without the 3 self-pairs (G = 0 tops every arm on them); AP and direction on the positives
  that are not WordNet closure pairs, with all negatives, and the closure membership of every scored pair (from WordNet,
  in pass 1); the suite's own detection protocol (OOV rows at the lowest in-vocabulary validation score); LEDS test,
  a circularity probe; EVAL test as distinct ordered pairs, the pairs with both labels dropped and counted, after the
  check that the suite's file equals upstream EVALution after `sort | uniq` and removal of `-[jvn]`; Shwartz's
  covered test rows; WBLESS and BiBLESS accuracy as the suite's `evaluation.py` defines them (below); L14's tables on
  these rows.
- *The suite's 1,000 × 2% protocol,* written out: the in-vocabulary rows of the whole file; one
  `numpy.random.RandomState(42)` (the protocol's constant, not this project's seed) gives 1,000 successive masks
  `rand(n) < 0.02` as validation; the thresholds are the distinct validation scores at or above the lowest validation
  positive's; h ≥ t predicts positive; the threshold with the best validation accuracy, the first in increasing order,
  is applied to the other rows; a trial with no validation positive is skipped and counted. WBLESS: h = Φ_G(x, y).
  BiBLESS: h = max(Φ_G(x, y), Φ_G(y, x)), and a detected row is +1 if Φ_G(x, y) ≥ Φ_G(y, x), else −1, against labels
  {−1, 0, 1}. Scores are tie classes over all values compared. The threshold set re-implements the truncation at full
  recall of sklearn's `precision_recall_curve`, which the suite calls; sklearn is not installed and is not installed
  for this, and a test checks the rule on hand-computed synthetic cases. sklearn's `average_precision_score`
  convention (a tied block counted at once) is re-implemented the same way.
- *L14:*
  - for the measured tables: F1 under HiT's protocol (positive when G ≥ θ, θ the distinct val score with the best val
    F1, the smallest on ties; then test), both settings, which scores HiT val in step 7 and decides nothing; G_root and
    the distance-only score on test (both settings) and HL, with their Lorentz − Euclidean intervals and their sign
    agreement with G's; RR averaged first per positive synset (the macro mean), with a bootstrap over positive synsets;
    RR on the rows whose positive is not among the 12 most frequent;
  - HIT-R, a HiT-protocol split rebuilt from WordNet with instance seeds: T in (child index, ancestor index) order
    shuffled by `Rng(1500)`; val the first ⌊0.05·587,658⌋ = 29,382, test the next 29,382; 10 random negatives per row
    from `Rng(1501)` by below(74,401), rejecting the child, any x with (child, x) ∈ E ∪ T and repeats; 10 hard
    negatives, the children of the child's parents minus the child and its ancestors, in offset order, padded from
    `Rng(1502)`. Instance seeds are shared across claims (Common rules): L1(d), L3(f) and L7(b) also drew
    `Rng(1500)`–`Rng(1502)`; i = 500–502 only avoids `Rng(1000)`, the noun query sample's seed;
  - the exact trees on HiT test, flagged as reconstruction (they encode E, and 93.0% of closure edges by prefix);
    NK17 scores; floors; every edge-shuffle cell, with "true ≈ shuffled" where its interval does not lie above 0;
  - loss curves, the epoch at which each run reaches 95% of its loss drop, guard hits, the largest step and radius;
    the 200 relabelled tails (per row and macro); |ΔRR| between snapped-exact and float64 scoring; H3 against the
    learned tables on HL within U_@; wall clocks; Nickel & Kiela 2018's diagnostic, the Spearman ρ between r and
    sp/(sp + lp), for the tables and the exact trees.
- *L15:* SL, WS-353 similarity (197) and combined (344 rows) under Sym for the six exact arms, WN and GloVe; GloVe at
  50-d; H − F under Sym on every similarity set; H3 read by G against GloVe on HL; WN-path on SL with the maximum over
  senses against path2vec's 0.513, an implementation check whose gap above 0.005 is reported with its cause if found.
- *Diagnostics:* the number of noun synsets whose H3 and H2 Poincaré norms round to 1.0 in float64; WN-LCh's tie
  classes against WN-path's on every set.
- *Literature numbers,* each with its grade and why it is not comparable (subset, WordNet version, folds, OOV rule,
  trainer); human agreement (HyperLex IAA-1 0.854 and IAA-2 0.864 on nouns; SimLex 0.67) as agreement, never as a
  bound.

**12. Seeds.** As the Common rules number them: secondary draws 2000 + i, training 0–4, tuning 9000–9023 (9000–9011
used), the statistics constant 7, dry runs: 4000 + i for instance seeds and +3000 on every other seed; instance seeds
only for HIT-R.

| Use | Decisive | Dry |
| --- | --- | --- |
| S3 (reported) | `s3_words(words, 2000 + i)`, i < 5 | 5000 + i |
| S-full | `Rng(2400 + i)`, i < 20 | 5400 + i |
| W | `Rng(2420 + i)`, i < 20 | 5420 + i |
| L12 gold permutations | `Rng(2440 + i)`, i < 20, each `shuffle(list(range(n)))`; row k takes the gold of row π[k] | 5440 + i |
| L13 label permutations | BD `Rng(2460 + i)`, WB `Rng(2480 + i)`, i < 20 | 5460 + i, 5480 + i |
| L15 gold permutations | SL `Rng(2500 + i)`, MEN `Rng(2520 + i)`, WSR `Rng(2540 + i)`, HL in GloVe `Rng(2560 + i)` | +3000 |
| L15 GloVe vector permutations | `Rng(2580 + i)`, fresh per set | 5580 + i |
| L14 edge pairs and floors | `Rng(2600 + s)`, s < 5 | 5600 + s |
| L14 within-row label | `Rng(2620)` | 5620 |
| L14 gold permutations | `Rng(2640 + i)`, i < 20 | 5640 + i |
| L14 point relabelling P | `Rng(7)` (A10.9's) | `Rng(3007)` |
| L14 relabelling tail (reported) | `Rng(2700 + j)`, j < 200 | 5700 + j |
| L14 training; tuning | 0–4; 9000–9011 | 3000–3004; 12000–12011 |
| HIT-R (reported) | `Rng(1500)`, `Rng(1501)`, `Rng(1502)` | the dry split: `Rng(4500)`, `Rng(4501)`, `Rng(4502)` |
| Bootstrap (every interval) | numpy `default_rng(7)` | the same |
| Suite protocol (reported) | numpy `RandomState(42)`, the protocol's constant | the same |
| Tests; the timing projection (item 16); the review (unregistered) | 95200 + i, i < 300; 95500 + i, i < 8; 95600 + i, i < 300 | — |

No other draw is made. Nobody computes P, any registered permutation (dry ones included) or any training draw before
the step of item 15 that uses it. Tests give every function that takes a registered seed a seed parameter, draw it at
95200 + i, and pin the registered value only as a constant. The spikes drew 90000–91999, 92013, 92017, 92029, 97000
and 97001 (`spikes/`; S6's 2,000 synthetic strings take 90000–91999); no spike drew from 95000–95999, the range this
amendment's unregistered seeds use.

**13. Dry runs** (+3000) use WordNet's verbs, disjoint from every decided instance (all nouns), as Phase 1 used the
verb forest; the suite's validation folds are not dry data, since they share BLESS's concepts.
- *L12:* HyperLex's verb rows (453; 452 covered in `index.verb`) on the verb forest of A1 item 10 (559 roots under the
  virtual root [1]): H3, H2, F and F\* on the verb words; K3 by `address.k3_words(…, pos='verb')`; WN on the verb `@`
  graph with a virtual root joined to its roots; W over `index.verb`'s strata.
- *L13:* HyperLex's verb rows as a detection set (TYPE hyp-1 to hyp-4 positive, 201 rows; the others negative;
  clusters by word1) and as a direction set (the hyp rows, selected in pass 2).
- *L14:* the verb `@` graph (13,542 nodes, 13,239 direct edges, 21,840 indirect pairs, 334 roots; the 225 isolated
  verbs left out), with a HiT-protocol split built as HIT-R from `Rng(4500)`, `Rng(4501)` and `Rng(4502)` (val and test
  1,092 rows each); graded: HyperLex's verbs covered in that graph. The whole of item 10 runs, dry tuning's 48 runs
  included.
- *L15:* SimLex's 222 verb rows for (a); MEN's v–v rows (29) and HyperLex's verbs against GloVe for (b), a pipeline
  check.
- Every control, interval, report and receipt runs; the results are written to `reference/results/dry/` and decide
  nothing. Dry counts are stated in the definitions amendment.
- *Sealed values.* Unlike Phase 1–4's dry data, these verb sets carry human ratings and labels from the same files,
  raters and protocols as the decided nouns. Every dry metric value, interval and verdict on a human-rated or
  human-labelled set (HyperLex's verbs, as rated and as a detection and direction set; SimLex's verbs; MEN's v–v
  rows; L14's graded part) is written only to a sealed file in the cache, whose SHA-256 the dry record holds; it is
  opened after step 7 and reported then. The dry record and console show the rest: crashes, count checks, whether each
  control failed as required, convergence, timings, tie and recomputation counts, and L14's values on the verb graph
  and its split (WordNet data, as Phase 4's dry run showed its own).

**14. Receipts, and what is committed.**
- One LBENCH/1 record (A7.3's conventions) per evaluated arm, score, sense rule, instance and table:
  `LBENCH/1|<claim>/1|instanceId|instanceSha|pairSetSha|arm|geometry|d|seed|lr|scoreForm|senseRule|protocolSha|settingsSha|budget|floatTableSha|snapSha|itemScoresSha|metric|metricSha|metricValue|track|engine|wallMs`
  - LBENCH/1's fields after the second are defined by the claim field: `L6/1` by A10.12 (22 fields), and `L12/1` to
    `L15/1` and `stage2/1` (item 11's general reports) by this item (24 fields). A parser selects the layout by the
    claim field; Phase 4's parser, which accepts `L6/1` only, is unchanged. The snap exponent is 32 throughout (item
    10.3), so this layout has no field for it.
  - instanceId names set, pin and slice (for example `hyperlex-ccb4161-nouns`, `suite-6891e0e-bless-test`,
    `hit-zenodo14036213-multi-test-hard`); instanceSha is the file's SHA-256; pairSetSha that of the pair set's row
    numbers (item 2's convention).
  - protocolSha is the SHA-256 of `reference/golden/stage2_protocol_v1.txt`: Amendment 10, then this amendment,
    verbatim from their headings, with LF line ends and a final LF, pinned by a test against this file. An amendment
    that changes a definition here makes `stage2_protocol_v2.txt` (Amendment 10, this amendment, then that amendment),
    and records from then on carry its SHA-256 (A10.12's rule).
  - settingsSha hashes `reference/settings-stage2.json`; budget is item 10.3's for learned tables; itemScoresSha
    hashes pass 1's code file.
  - metricSha is the SHA-256 of the exact value's text (ρ as `Σab|Σa²|Σb²`; AP, accuracy and mean RR as `p/q` in
    lowest terms); metricValue is `format(float(value), '.6f')`; track `cpu`; engine as A10.12. Fields that do not
    apply are `-`.
- *Committed:* the code, tests and synthetic traces; `reference/results/claims-stage2.json` and `.md`; the receipts;
  the instance manifest; `settings-stage2.json` and `tuning-stage2.json`; every learned table's float and snapped
  SHA-256; a manifest of the SHA-256 of every pass-1 code file and side file. Two groups of files are committed only
  under a size rule, the size deciding, as reported: the pass-1 code files of every arm and table named in a decision
  of L12–L15 (the exact arms on HL, BD, WB, BD-dir, SL, MEN and WSR; the 20 measured tables on HiT test in both
  settings and on HL), gzip-compressed, holding no word, gold, label or TYPE, if together at most 50 MB (expected about
  40 MB); and the 20 measured snapped texts, gzip-compressed, if together at most 50 MB (expected about 26 MB), for the
  Node re-evaluation. Otherwise each group is committed by its hashes only. The repository is published whole as a
  Pages site, so nothing larger is committed.
- *Not committed:* any Stage-2 file or line, whatever its licence; GloVe; HiT's files; every other code and side file
  and table (cache, by hash in the manifest).

**15. Order of work.**
1. This amendment, committed alone.
2. The code of item 1 and its tests, on synthetic data, the dry data and unregistered seeds 95200 + i. The fetch
   script checks every pin, GloVe's members included, and writes the instance manifest; count checks may run, since
   they count. Then an adversarial review (four reviewers, two skeptics per finding; seeds 95600 + i), with
   independent implementations of the certified order, ρ and its bootstraps, the cluster keys and the implicit map.
3. The dry run (item 13) on the committed code, with its values on human-rated sets sealed. A fix is committed and the
   affected dry part rerun.
4. The definitions amendment: the readings fixed in the code (`READING` markers); the instance manifest's SHA-256 and
   the GloVe coverage counts; the dry run's diagnostics, convergence included. It may change a definition of this
   amendment only in response to a failure seen in steps 2–3 (a crash, a count mismatch, a control that did not fail
   as required, a run that did not converge, a chained tie, a projected time or disk overrun), never on a metric value,
   and it names the failure each change answers. Its date and reasons follow A10.14. It comes before any registered
   tuning and any decisive evaluation.
5. Registered tuning of L14 on a clean committed tree (the runner refuses uncommitted changes), evaluating HiT val
   only, with its replay.
6. The lr-freeze amendment: `settings-stage2.json` with its SHA-256 and every tuning run. It changes nothing else.
7. One decisive run at the lr-freeze amendment's commit. It records HEAD and refuses unless the only paths changed
   since tuning's commit are PREREGISTRATION.md, `settings-stage2.json`, `tuning-stage2.json` and tuning's console
   file. Pass 1 scores every instance and table (L12, L13 and L15's arms; L14's tuning, measured, edge-shuffled and
   floor tables, and the measured tables on HiT val for item 11's F1); pass 2 runs the label checks and decides
   L12–L15. The run computes P for the first time, replays the measured run and retrains the two pre-flight jobs. If
   interrupted, it resumes at the same HEAD from its finished jobs.
8. Write-up: an explainer, the claims ledger, the Node re-evaluation (item 1), an independent check of the decisive
   record, the dry run's sealed file, and errata as amendments.

Until step 7 nothing is scored on HL, BD, WB, SL, MEN, WSR, HiT test or any reported set. HiT val is scored only in
step 5 (tuning) and in step 7 (θ for item 11's reported F1, which decides nothing). L12, L13 and L15 depend on nothing
tuning computes; they run in step 7 so that there is one decisive record. A defect found after step 5 is fixed only by
an amendment that says it was found after tuning results were seen (A10.14).

**16. Compute plan** (this container: 4 CPUs, 16.9 GB of memory, 15.0 GB of free disk; times from the compute survey,
the review's re-timing and item 19's timing). The training figures are CPU time on U_@ itself, four processes at once,
with the existing arithmetic; wall time ran 19–41% higher while another workload shared the container, so no other
workload runs during steps 5 and 7, and the run record holds the load average.

| Step | Work | Wall, 4 processes |
| --- | --- | --- |
| Exact arms: L12, L13, L15, item 11 | about 16 M certified values at about 45 µs each (120 digits) and about 120 intervals (about 7 s each for ρ at n = 2,163, row and word level) | under 0.5 h |
| Timing projection | two epochs of each cell on U_@, seeds 95500 + i, no evaluation | under 0.1 h |
| L14 tuning | 48 runs of 1,000 epochs; per epoch: Lorentz d = 2 1.12 s, d = 3 1.32 s; Euclidean d = 2 0.76 s, d = 3 0.87 s | 3.3 h |
| L14 tuning evaluation | 48 tables × about 0.62 M val values | 0.1 h |
| L14 decisive training | 20 measured, 20 edge-shuffled and 2 pre-flight runs | 2.9 h |
| L14 decisive evaluation | about 145 M certified values: test in both settings, relabelling, HL, floors, the tuning tables' controls, G_root, HIT-R and val for the reported F1 | 0.6 h |
| Replays | 2 × 1.0 h of one core | 0.5 h |
| Dry run | all of the above on 13,239 verb edges (n = 13,542): about 0.1 of the training cost, since `_accumulate_T`'s bincount of length D·n makes the cost per positive grow with n (8–9 µs against 10–17 µs on U_@) | 1.0 h |
| **Total** | | **about 9 h of the 12 h available** |
| Disk | pass-1 code files about 0.8 GB; tables (110, float and snapped) about 0.5 GB; GloVe 0.86 GB and the survey and review caches 2 GB already held | about 1.3 GB new, against 15.0 GB free |

Before step 5 the runner projects the registered total from the timing projection's wall times (not from the dry run
scaled by edges, which would understate the training about 1.9 times); if it exceeds 11 h, or the projected bytes
exceed the free space less 2 GB, it stops and reports before tuning, and any cut is an amendment, not a runner option.
Peak memory is under 0.85 GB per training process; the implicit map stores n + 2E ≈ 2.3 × 10^5 entries. Not
affordable here, and not registered: the full noun closure (196 h at A10's shape, 58 h without tuning, and 53.9 GB for
its explicit non-neighbour table), d ≥ 5, per-benchmark training universes, and the relabelling control over many
permutations in exact arithmetic (about 1.8 h per 20 permutations of the 88 tables).

**17. Where each borrowed protocol comes from** (Amendment 6's rule).
- *HyperLex* (Vulić et al. 2017, J17-4004; paper): the 2,163 noun pairs and their TYPE strata; the guideline "if any
  of their senses" behind the maximum over senses (§4.3); the random split (Table 10). *From code:* the 0–6 AVG_SCORE
  column, which gensim's `LexicalEntailmentEvaluation` and the suite's `evaluation.py` read.
- *Nickel & Kiela, P17* (paper, §4.3): HyperLex's nouns as a test of WordNet-trained embeddings; eq. 8, reported only.
- *Roller et al. 2018* (arXiv:1806.03191v1, paper §3.1): detection AP on the five sets; direction by
  score(x, y) > score(y, x); 1,000 iterations with 2% validation for WBLESS and BiBLESS (also LEAR and Nguyen et al.
  2017, papers). *From the suite's code at 6891e0e:* the committed folds (the paper's were never released), the
  noun-only HyperLex rows, the strict `forward > reverse`, `RandomState(42)`, the threshold set and its ties, the OOV
  rules of the reported comparisons, and scipy's average-rank Spearman. *Not followed:* sklearn AP as the decisive AP,
  OOV imputation, NLTK lemmatisation, float32 scores, model selection on validation.
- *HiT* (He et al. 2024, arXiv:2401.11374v4, paper §4.2 and Table 1): the multi-hop protocol (train on E, test on held-
  out T), 10 random and 10 hard negatives per positive, the score −(d + λ(r(t) − r(s))). *From its Zenodo record:* the
  split files. *From its code* (`datasets/construct.py`, read as text): the hard negatives as the child's siblings minus
  its ancestors, which HIT-R follows, and the uniform sampling of val and test from T, which makes rows the bootstrap's
  unit. *Not followed:* F1 at a validation threshold as the decisive metric (reported), training negatives filtered by
  E ∪ T, the λ search (λ = 1 is fixed here).
- *Ganea et al. 2018* (paper §5, Table 1): the "0% non-basic" comparison in L14's risks, both dimensions.
- *SimLex-999* (Hill et al., arXiv:1408.3456, footnote) and *path2vec* (Kutuzov et al., arXiv:1808.05611v4, Table 2):
  the minimum distance over senses for similarity; the WordNet numbers of the replication check.
- *Owen 2007,* "The pigeonhole bootstrap", Annals of Applied Statistics (from memory, not re-read for this amendment):
  resampling both crossed factors, here the one shared vocabulary, for ci_rho.
- *Data files:* Agirre et al.'s relatedness and similarity split; MEN's lemma form and its `licence.txt`; GloVe 6B via
  the official README's download.
- *Amendment 10:* the whole trainer, with its own attributions (A10.15).
- *This project's own:* G at λ = 1 as the sole decisive is-a reading; Dep° at G's senses; the controls K3, S-full, W,
  reversed roles, within-row RR and the relabelled macro mean RR, and their bands; RR with pessimistic ties; the
  cluster bootstrap and the choice of resampling unit per set; the certified order; blind two-pass scoring and the
  sealed dry values; direct-edge training with the training relation's complement as negatives; the convergence rule;
  tuning on validation RR; the edge-shuffle control at one cell per (d, seed, metric) and its per-metric voiding;
  L15(a)'s band.

**18. Numbering, and corrections to Phase 0's pages.**
- Explainer 7, the tracks explainer, the README roadmap and the hub's roadmap (`index.html`, Phase 6's row) call four
  Phase 6 candidates "L12–L15". None was registered, so the names carry no weight and nothing registered changes. They
  take the next free numbers when they are registered: the address factor on BLiMP becomes L16 (Explainer 7's
  "equivalence test (L12)"), hierarchy heads on HiT-protocol F1 L17 (which meets L14's leakage rule), the Poincaré
  probe against the structural probe on UD EWT L18, and PolyStep against MeZO and ZO-SGD L19.
- *For the write-up* (pages, not registered text): the suite's data is checked in, so `download_data.sh` needs no
  adaptation (it exits before downloading); the suite's EVAL has 13,450 rows and 6,926 distinct pairs, against Roller
  et al.'s "7,378 pairs", whose source is unconfirmed; gensim's 0.48 and Poincaré GloVe's tables are verified; MEN's
  `licence.txt` releases "the models" under CC BY 2.0, which may or may not cover the data, and HiT's Zenodo record is
  CC BY 4.0; WS-353's CC BY 4.0 could not be re-read; the SimLex, HyperLex and MEN hosts are unreachable, and pinned
  copies replace them; HiT's pinned split replaces the planned rebuild, which becomes HIT-R; WBLESS's "seeded splits
  (seed 42)" are the protocol's `RandomState(42)` over 1,000 trials, not folds.

**19. Disclosures** (Common rules, "Reporting"). Every download went into its own new folder under
`~/.cache/hyperbolic-lexicon/stage2-survey/` (the reviews' re-downloads under `stage2-review/`); nothing downloaded was
executed; parsing ran under `python3 -B -I`; no repository file was written and nothing was committed.
- *The data survey* downloaded and hashed 104 files and read the suite's `download_data.sh` and Python, and SemEval's
  scorer, as text. It installed `bsdtar` (libarchive-tools 3.7.2) to list HypeNET's RAR, and pyarrow 26.0.1 in a scratch
  venv to read two Hugging Face parquet files. It counted rows, columns, labels, folds, duplicates, WordNet coverage and
  monosemy. It counted closure membership for every HyperLex noun row by TYPE, in both directions, and spanning-ancestor
  membership for the hyp rows; closure and spanning-ancestor membership for the positives of BLESS, WBLESS, LEDS,
  EVAL, Shwartz and SemEval; and, for HiT, that every positive and no negative is a closure pair. Its own notes say
  "for gold positive pairs only", which the HyperLex count by TYPE was not. It computed nothing on detection-set
  negatives or ratings, and drew no seed.
- *The methods survey* read 14 papers and 7 repositories at pinned commits (hypernymysuite 6891e0e, gensim 37f90ec,
  LEAR 67c2b02, hyperbolic_cones fbf1558, HierarchyTransformers 1b68f00, poincare_glove 6a5c80a, poincare-embeddings
  dff101b), never running them, and Hugging Face API listings. It counted the suite's rows, folds and labels and EVAL's
  duplicates and conflicts; HyperLex's noun gold ties (305 distinct values; 2,137 pairs share one), the only read of a
  rating column for a count, for ties alone; and LEAR's evaluation folder (line counts and two SimLex gold values, to
  identify a version). On WordNet it counted instance-only synsets, the root-removed closure and its reduction, HiT's
  graph sizes, NLTK names and the cones vocabulary. It timed `embed._batch_T` on synthetic indices from numpy
  `default_rng(95000 + i)`, i < 10.
- *The compute survey* used seeds 95000–95050 only. It built the full-noun instance and the implicit map and checked
  the map against the explicit lists (320 anchors) and `Stream.negatives` (906,450 draws). For timing only, it trained a
  few epochs on the full noun closure, the closures of whole.n.02 and event.n.01 (which contain the mammal set, whose
  L6 result is public) and the direct-edge instance; it kept no table and evaluated none. It scored synthetic lemma
  pairs against synthetic gold and ran five full-noun ranking queries of H3, H2 and a synthetic table, keeping no value.
  From the benchmark files it read only the two word columns, to count senses and up-closures. It read Phase 4's wall
  clocks and loss logs, and replaced `_accumulate_T` inside probe processes only.
- *The designs.* One counted fold sizes, labels, EVAL's repair counts and test-fold noun coverage; one read four header
  lines and the key names of HiT's first test row; one counted word, POS, TYPE, label and fold fields (rows, folds,
  coverage in U_full and U_@, monosemy, TYPE, reversed rows, concepts, repeated and self-pairs), the verb `@` graph and
  U_@'s hashes, and compared MEN's two lemma-form copies.
- *The judges* counted on WordNet (U_@'s hashes; that undirected BFS shortens the depth of 12,831 of the 82,115 nouns),
  timed decimal acosh and sqrt at 60–600 digits on synthetic values, read BLESS's word1, word2, label and fold columns
  (no duplicated positive; 4 self-pairs, all False, 3 in test) and HyperLex's noun TYPE column.
- *The synthesis* counted on WordNet the indirect draws of item 10.1 and T's 74,370 pairs through entity.n.01; read
  `wbless.tsv`'s word1, word2 and fold fields and `bless.tsv`'s word1 for WB's coverage and clusters; simulated AP
  under random untied rankings from BD's and WB's (n, positives) alone, with numpy `default_rng(95060)`, 20,000 draws
  each (expected AP 0.0972 and 0.5140, SD 0.0028 and 0.0129, so π + 1/50 lies 31 and 6.1 standard errors of a
  20-permutation mean above it); timed e^G in `decimal` on synthetic rationals from Python's `random.Random(95061)`
  (45 µs at 120 digits, 104 µs at 240); and requested one GitHub API listing of deemakx2/PPDM2, which was refused.
- *The reviews* (three, of the synthesis's draft):
  - one read the Common rules and Amendments 1–12 against the draft, searched `spikes/` for the seeds they drew, and
    counted on WordNet, in memory, the share of T held by each ancestor;
  - one counted on WordNet the share of T held by each ancestor; counted word reuse in the word columns of HL, SL and
    MEN; and ran a synthetic model of the relabelled mean RR from T's shares alone, with Python's
    `random.Random(95901)`;
  - one re-downloaded the pins into `stage2-review/` and re-hashed them; read their licence files and READMEs; listed
    PPDM2's tree at e2de627 and hashed MUtE's and mfaruqui's copies; compared the WS-353 split files' pairs and scores
    with combined.tab's (equality only); hashed GloVe's text members and counted their lines, words, repeats and
    underscore tokens; re-timed the trainer for two epochs per cell on the direct-edge instance and on a noun
    direct-edge subgraph of the dry instance's size (psychological_feature.n.01), seeds 95104–95111, keeping no table
    and evaluating none; and measured side-file and code-file sizes on synthetic files from Python's
    `random.Random(95112)` and `random.Random(95113)`.
- *This revision* counted, in HiT's test file, the distinct positives and their shares, the rows that repeat a
  negative and the rows that hold the child as a negative (names only); re-ran the WS-353 equality check; and
  computed G for prefix and non-prefix pairs of 400 synthetic random words in H3 and H2 (Python's
  `random.Random(95920)`; no WordNet word), the numbers in L12's prediction.
- *Not done by anyone:* no score, correlation, AP, accuracy, RR or F1 of any arm on any Stage-2 row; no registered seed
  drawn (0–4, 7, 1000 + i, 2000 + i, 4000 + i, 9000–9023, the spikes' 90000 + i).

**20. Known before Stage 2.**
- Phase 1–4's public results, among them L5's values for these exact arms on WordNet's own neighbours and L6's
  Lorentz − Euclidean gaps on the mammals. No arm here has been scored on a Stage-2 set.
- *A partial preview of L12 and L13, from counts.* For HyperLex's 2,163 noun rows by TYPE, whether some sense pairing
  is a closure pair: hyp-1 to hyp-4 286, 241, 254 and 222 forward; r-hyp-1 to r-hyp-4 73, 53, 60 and 40 reversed;
  cohyp 0 forward and 1 reversed; mero 2 and 2; syn 11 and 9; ant 0; no-rel 0. Spanning-ancestor pairs among hyp-1 to
  hyp-4: 281, 229, 233 and 214. BLESS's positives: 1,149 closure and 1,099 spanning of 1,334; WBLESS's 718 and 680 of
  834; LEDS's 1,385 of 1,385 first-sense closure pairs. G_WN = 0 exactly on closure pairs (its top class), and H3's G
  is near 0 on spanning ancestors. With the per-TYPE means of HyperLex's Table 7, these counts preview L12(d) in large
  part and L12(a)–(c) and L13 in part: they show where each arm's top block falls by TYPE, though not the order of the
  rest. The predictions of L12(d) and L13 used them. L12(d) stays decisive and is flagged in the record as registered
  after a partial preview, as A10.16 kept L6(c) decisive with its bound from Phase 1 disclosed.
- HyperLex's noun gold has 305 distinct values, and its per-TYPE means are published (Table 7).
- HiT: every val and test positive lies in E's closure and no negative does (the closure check of L14 confirms it);
  the test's positive shares of L14's control 2.

**21. What none of this decides.**
- *Discovery, or lexical knowledge beyond WordNet.* Every arm reads WordNet; HyperLex's TYPE, 86% of BLESS's positives,
  all of LEDS and all of HiT were built from it. L12–L14 decide what curvature and learning do with the same
  information, and L15(b) compares an information source with another, not geometries.
- Senses in context; verbs and adjectives (dry data only); words outside WordNet.
- *Learned geometry beyond this setting:* closure-trained or full-noun tables, d ≥ 5, the 7,714 instance-only synsets
  (absent from U_@, and with them most named entities), converged embeddings, other trainers (Riemannian Adam, cones,
  HiT's encoders), and readings of the learned tables from a base point other than o (reported only).
- Comparability with any published number: subsets, WordNet versions, folds, OOV rules and trainers differ, so every
  literature number is orientation.
- *The sets not decided:* SemEval-2018 Task 9 (corpus-based discovery without its corpora, licence unknown, gold
  through BabelNet, 1,083 of its 1,500 English test terms WordNet nouns); HiT mixed-hop (its val and test hold direct
  edges that L14 trains on); LEDS, EVAL, Shwartz and BiBLESS (reported only).
- Whether hyperbolic geometry helps a language model: Stages 3 and 4, by amendment.
- G's order is certified by square roots at 120 and 240 digits, not computed in rationals; ties at the 240-digit bound
  are a registered part of the metric, read as exact ties (item 6).

### Amendment 14 · 2026-11-07, Stage 2, the definitions after the dry run

Written on 2026-11-07, after the dry run of A13.13 and before the timing projection, registered tuning and any decisive
evaluation. It is the definitions amendment of A13.15 step 4. The code is 841b90c; dry tuning and the dry decisive step
ran on it, and their record was committed in 05d467d. ae6e6d3 then merged a tooling commit of the integration
overhaul (pin checks, test runners, CI workflows, path helpers): it changes no Stage-2 module, and `lexicon/lps.py`
changes only how it finds the SHD-CCP checkout (its SHA-256 pin of `hurwitz.py` is unchanged), so only the code hash
the runner records moves; item 6's dry rerun runs on it. It changes no definition of Amendment 13 (item 4). It states the
readings fixed in the code (item 1), freezes the instance manifest and states the counts A13 leaves to it (item 2),
gives the dry run's diagnostics (item 3), classifies what the builders and reviewers flagged (item 5), and states the
consequence for the protocol file and the one code commit that follows this amendment, which changes no definition
(item 6); item 7 lists what ran. Its date and reasons follow A10.14: it is dated, it comes before registered tuning,
and it says what was known.
- *Known.* The visible dry record (A13.13): crashes, count checks, whether each control failed as required,
  convergence, timings, tie counts, dry tuning's val scores, and L14's values on the verb graph and its split. There
  the dry L14(a) is void (controls 1–2), and each of its four (d, setting) cells had five present seeds with lo > 0.
  Beyond A13.13's list, the record names each control's gold-chosen strongest permutation on the sealed sets (item 3,
  *the seal*).
- *Not known.* The sealed file (SHA-256 `7ba50e016172955f4052d488711a9f561c47fb3d20540e7c0136f1648dd28936`) has not
  been opened: no metric value, interval or verdict on a human-rated or human-labelled set has been seen. Nothing has
  been scored on HL, BD, WB, SL, MEN, WSR, HiT val or test, or any reported set, and no registered seed has been drawn.

**1. Readings fixed in the code** (each marked `READING`). The runner records its own as `stage2-runner-1` to `-51`
(runner-N below) in its records' `readings`: the tuning record holds all 51, and the decisive record all but runner-7,
which only the tuning step records. Its inline markers restate them. None changes a definition. Runner-34 is stated
as item 6's commit makes it.
- *Data, pins and the manifest* (`stage2data`, `glove`, `hit`, `golden/make_stage2_v1.py`):
  - a rating or a GloVe component is an exact decimal (optional minus, digits, optional fraction and exponent), read
    exactly; NaN, a leading + or a space is refused;
  - a byte-order mark or a blank line is refused; trailing spaces are kept and refused by each format's field checks;
  - HyperLex's random-split file has `hyperlex-all.txt`'s header and its own fold, `test`; its POS column selects the
    541 nouns; in `hyperlex_rnd.tsv` label is TYPE and score AVG_SCORE, read by the gold reader only;
  - "464 rows whose reverse is a row": (y, x), as N_S forms, is the pair of some row;
  - BD's "6 repeated pairs and 3 self-pairs" compare the raw word fields (as N_S forms 17 pairs repeat; reported);
  - WS-353's distinct ordered pairs compare N_S forms (`combined.tab` capitalises some words);
  - WB's BLESS concept compares the words as given; BD's and WB's cluster keys are the raw fields of the rows covered in
    U_full;
  - A13.9's closure counts use strict `@` ∪ `@i` ancestors with U_full senses; a spanning ancestor is a strict ancestor
    on L3's spanning-parent chain; a shared synset is neither;
  - the protocol file is A10's section, then A13's, as `l6.amendment_section` gives them, with nothing between;
  - the manifest's row count and N_S-pair hash cover the rows the selection keeps, before coverage; each universe's
    covered rows follow with their own count and hash;
  - GloVe coverage uses the 300-d member's vocabulary (the 50-d member's is checked equal), recorded for every word set;
  - BD-dir has no manifest entry: pass 2 chooses its rows by label among BD's covered rows;
  - EVAL test "as distinct ordered pairs": each N_S pair is represented by its first row; pass 2 drops and counts the
    pairs with both labels;
  - HIT-R's two negative streams (random, hard) each run over the val rows, then the test rows, in split order.
- *Senses and graphs* (`senses`, `wngraph`):
  - noun morphy: exception candidates first, then the endings, each applied once; NLTK's early return on an exception
    entry is not followed;
  - Nickel & Kiela 2018's sp and lp are the distance to the nearest root (U_@ has 12 roots, the verb graph 334) and the
    height, both on E; H3 and H2 are read on the same nodes;
  - the dry graph's virtual root has one edge from each parentless verb, so D(x) = up(x, v-root) and a parentless verb
    has D = 1;
  - ST on the verb forest is the spanning forest under the virtual root, whose word (1,) counts as a node.
- *Scores and order* (`scores2`):
  - "differ by more than the sum of their bounds" compares the exact difference of the two decimals with the exact sum
    of the bounds, unrounded;
  - Dep°'s "pairs in the top tie class of G" are the pairs whose G ties under the certified comparison with the kept
    maximum;
  - in NK17, u is s (the sense of x) and v is t, with A13.5's Poincaré norms on hyperboloid tables;
  - "Poincaré norms round to 1.0 in float64": the exact norm rounded once to binary64 through 60 digits;
  - F1's θ is the smallest value of its val tie class; a test value is positive when it compares ≥ θ.
- *Statistics and decisions* (`stats2`):
  - an interval's estimate is the exact difference evaluated at 60 digits and rounded once to binary64;
  - a cluster resample with no True row counts that AP as 0 and is counted, as ci_rho counts an undefined ρ;
  - a resample of the macro-RR bootstrap is the mean over its C draws of each drawn group's mean RR, in binary64;
  - L13's label permutations follow A13.12's convention for the gold permutations (row k takes the value of row π[k]);
  - a shuffle band "in float64": each ρ rounded to binary64, their `math.fsum` divided by 20;
  - the suite protocol with no in-vocabulary validation row floors at the lowest in-vocabulary test code (flagged; the
    registered folds have validation rows);
  - L12(d)'s failing side: every end of [−0.02, +0.02] the interval passes is reported; "both" occurs only when (d) is
    inconclusive;
  - L15 control 2's "the part that uses the set": a set of (a) and its GloVe intersection in (b) are different pair
    sets, each voiding its own part.
- *Trainer and convergence* (`embed`; `stream` has none):
  - A11.4's five trainer readings carry over unchanged (signed zeros at a guard hit; a NaN z is a guard hit; the
    largest distance; the norm of η·A; the epoch loss);
  - the direct-edge instance is labelled `wordnet30-<pos>-at-direct` in the run record only, and is identified by its
    offsets' SHA-256;
  - A13.10.7's m(a, b) is numpy's float64 mean of the slice (pairwise sum, one division), equal to `np.mean` bit for
    bit;
  - a run with fewer than 1,000 recorded epochs (it diverged) has not converged; more than 1,000 is refused;
  - the 95% epoch is the first e with m(0, 9) − loss(e) ≥ 0.95·(m(0, 9) − m(990, 999)); there is none without a drop.
- *The runner:*
  - 1: the clean-tree check (this folder and the reference folders of Hyperbolic Oracles and Engram Mind's Eye) lists
    only the step's own outputs, before each pool and before writing; `--allow-dirty` is for the dry run only;
  - 2: a finished job is reused only at the same HEAD and configuration, with every file at its recorded SHA-256;
  - 3: the value stream is the 120-digit decimal's text (certified and uncertified forms) or the key's (exact keys);
    direction files stream forward then reverse, HiT files slot by slot;
  - 4: itemScoresSha hashes the uncompressed TSV; the gzip file's SHA-256 is checked before pass 2 reads it;
  - 5: scoreForm is G, Grev, DepG, Dep, Sym, Groot, dist, cos, LCh, NK17 or product; senseRule is max, first, gensim
    or `-`;
  - 6: at most four workers; the replays share the training pool;
  - 7: a tuning run's score is the exact mean of its mean val RR in the two settings, from one tie-class list of the 21
    slots;
  - 8: the time projection takes training and replays from two measured epochs per cell (lr 1, seeds 95500–95504) and
    A13.16's estimates for the rest; the disk projection is code lines × 6 B plus the tables;
  - 9: instanceIds add -at, -glove, -dir, -random/-hard and -relabelled to the manifest's names; dry sets keep their
    pins' names;
  - 10: a decided dry slot without its own dry set takes the nearest one, marked stand-in: WB takes HyperLex's verb
    detection set, L15(a)'s MEN takes MEN's v–v rows, WSR takes SimLex's verbs within GloVe; G_root is not read in the
    dry run (no entity.n.01 among the verbs);
  - 11: the dry split is HIT-R's construction on the verb graph with n_val = ⌊0.05·|T|⌋ = 1,092;
  - 12: F1 reads one code file of each measured table's HiT val and test values (one tie-class list); θ is the val code
    of best val F1, ties to the smallest;
  - 13: a restart that finds tuning finished leaves `tuning-stage2.json` and the settings unchanged;
  - 14: `settings-stage2.json` holds the two geometry keys (each d a grid string or null) and a `tuning` key (file,
    HEAD, SHA-256);
  - 15: a tuning table missing from the cache, or changed, stops the decisive run; A10.9's retraining is not carried
    over;
  - 16: an empty GloVe direction set would score 0, flagged; it cannot occur on the registered data;
  - 17: L14's seeds are indexed j = 0–4 in the decision;
  - 18: the morphy rule changes no HL row (every pair-set word is in the index raw); the count is recorded;
  - 19: the relabelled tails and |ΔRR| use numpy's binary64 arccosh and sqrt;
  - 20: a row's closure bit: some sense pairing with t a strict `@`/`@i` ancestor of s, senses in the instance's
    universe, in each direction;
  - 21: the strongest permutation has the largest exact point estimate of its own metric, ties to the smaller i;
  - 22: the load average is sampled at every start, at each phase's start and end, and every 10 minutes while a pool
    waits;
  - 23: BD's AP reads one tie-class list of the forward values, BD-dir one of forward and reverse; pass 2 selects the
    True rows;
  - 24: Nickel & Kiela 2018's diagnostic is the exact ρ between r and sp/(sp + lp) over U_@ (dry: the verb graph), for
    every learned table and H3, H2;
  - 25: NK17 on a table without x0 (learned Euclidean; F3, F3\*, F2, F2\*) uses its Euclidean norm and distance, as P17
    read its Euclidean embeddings;
  - 26: the measured tables are read by G on BD, WB and BD-dir covered in U_@, with exact Lorentz − Euclidean
    differences and no interval;
  - 27: the suite's detection protocol gives an uncovered test row its arm's lowest in-vocabulary validation code; it
    does not run on the dry sets;
  - 28: the vocabulary an arm misses is a count, a hash and the rows; no word is written;
  - 29: H3 against each measured table on HL-at, with the word-level and row intervals;
  - 30: L15 control 2 bands every arm of L15's Arms on each set it reads: on SL and MEN the six, K3 and each S-full_i
    and W_i, under Sym; on the GloVe sets H3 with Sym and GloVe 300-d;
  - 31: the definitions amendment is the earliest amendment after 13 that holds the manifest's SHA-256; A11.4's
    exactly-one rule binds the lr-freeze amendment only;
  - 32: `--time`, `--dry`, `--tune` and `--decisive` refuse an interpreter without `-B` and `-I`; the self-test and
    `--write-settings` read nothing fetched;
  - 33: the relabelled tails, |ΔRR|, Nickel & Kiela 2018's diagnostic and the seven labels' radius ranks are computed
    in pass 2 from tables whose SHA-256 is checked, reading no gold;
  - 34: A13.11's L12 grid is L12's 48 arms (the six, WN, K3, each S-full_i and each W_i) × 7 scores × 4 sense rules =
    1,344 cells, each scored, an alias or n/a; S3's 5 arms and the chain's 3 stay at G with the maximum (at 841b90c the
    grid had 8 arms and 224 cells, and S-full_i and W_i also stayed at G with the maximum; item 5);
  - 35: gensim's rule on WN takes the pair of largest Sym_WN (least WN-path), ties to the first in (i, j) order;
  - 36: L13 reports WN by G_WN, and GloVe's cosine AP on BD's and WB's GloVe-covered rows;
  - 37: the closure bits are pass-1 files per scored set, read by pass 2 after their SHA-256 check; the non-closure
    positives are the True rows with forward bit 0;
  - 38: L14(b)'s count of HL-at rows that are E edges for some sense pairing (x the child), the reverse and the counts
    by TYPE beside it;
  - 39: two differences agree in sign when both are > 0 or both ≤ 0; three or more disagreeing seeds are flagged
    "stated";
  - 40: WN-LCh is scored wherever WN-path is, and their tie-class lists are compared;
  - 41: DECISION_SPEC (69 comparisons) and CONTROL_SPEC (10 controls) must equal spec_from_a13's parse of A13 before
    scoring, and every decided value is recomputed from the files after pass 2; any difference stops the run;
  - 42: each run's full loss curve is a cached `.loss.json` held by SHA-256; the record keeps every 10th epoch and the
    last;
  - 43: the committed code-file group is the files a decided comparison reads (strongest permutations resolved) and
    the measured tables on HiT test and HL-at, not the band controls' permutation files;
  - 44: the HL split agreement is checked at pass 2's start; a difference withholds HL-split's values and the run goes
    on;
  - 45: the dry record shows L14's values on the verb graph and its split by a whitelist; HL-at's stay sealed;
  - 46: tuning reads WordNet and HiT's names, train and val only;
  - 47: the disk projection before tuning counts the decisive run's exact-arm code lines;
  - 48: spec_from_a13 parses A13 alone and refuses while a later protocol file exists (item 6);
  - 49: every edge-shuffle cell is reported, marked present or not;
  - 50: a failed wiring check in a sealed run names comparisons without values; the values go to a sealed side file;
  - 51: "AP without the 3 self-pairs" drops the rows whose raw word fields are equal (exactly 3, or the run stops); the
    N_S variant is reported beside it.

**2. The instance manifest, GloVe coverage, and the counts A13 leaves to this amendment.**
- *The manifest.* `reference/golden/stage2_instances_v1.meta.json`, committed in e91e02d and unchanged at 841b90c and
  05d467d, has SHA-256 `3f2db2f67435b684b152daa9204df4c2011f79f9eab28b12eee1093b4dc0ff16`. It is frozen here (A13.2);
  registered tuning and the decisive run find this amendment by that hash (runner-31) and refuse another manifest.
- *GloVe coverage* (`glove.6B.300d.txt`: 400,001 words, 460 holding `_`; the 50-d vocabulary equal): the rows covered
  in U_full with both N_S words in GloVe (A13.3), below. L15 control 2's bands from these frozen counts: WSR
  5/√(20·244) = 0.0716; HL within GloVe 5/√(20·2,161) = 0.0241; MEN within GloVe 0.0250, as registered.

| Set | Covered | In GloVe | Word types in GloVe |
| --- | --- | --- | --- |
| HL nouns (L15(b), HL within GloVe) | 2,163 | 2,162 | 1,842 of 1,843 |
| MEN n–n (L15(b)) | 2,005 | 2,005 | 645 |
| WSR (L15(b)) | 245 | 245 | 335 |
| BD test (L13 control 3 reads its True rows, chosen in pass 2) | 12,365 | 12,339 | — |
| SL nouns; WB test (reported) | 666; 1,493 | 666; 1,493 | 751; — |
| WS-353 similarity; combined; LEDS test; EVAL test; BiBLESS (reported) | 197; 344; 2,495; 10,362; 1,658 | all | — |
| Shwartz test; HyperLex random-split test (reported) | 17,073; 541 | 16,590; 541 | — |

- *HiT val* (A13.9; counted from its names for this amendment): 29,383 rows with 10 + 10 negatives each; 2,104 distinct
  positives; every positive in E's closure and none a direct edge of E; no negative in the closure; 3 rows hold the
  child among their random negatives and none among the hard; 22 rows repeat a random negative and 7 a hard one, none
  with fewer than 9 distinct. A13.9 makes each a check (item 5); from item 6's commit on, tuning reproduces them before
  its first metric, and the decisive run again.
- *Dry counts* (A13.13). HyperLex's verbs: 453 rows, 452 covered in `index.verb` and in the verb graph, 390 word
  types, 304 word1 clusters, 201 hyp rows (TYPE, pass 2). SimLex's verbs: 222, all covered, 170 word types. MEN's v–v
  rows: 29, all covered, 22 word types. All three lie wholly within GloVe. The verb `@` graph: 13,542 nodes, 13,239
  direct edges, 21,840 indirect pairs, 334 roots, 225 isolated verbs left out; budget
  `1000,20,50,50,265000,661950000`; the dry split 1,092 val and 1,092 test rows. P = `Rng(3007)` over 13,542 nodes has
  SHA-256 `feda2bd82e61f511aeaa3781fa863fdbf99cd7014dd6f57db5edf3a97de0195c`.

**3. The dry run's diagnostics** (A13.15 steps 3–4).
- *What ran and what held.* Dry tuning ran 13:39–14:06Z (1,623 s) and the decisive step 14:06–14:38Z (1,925 s), both
  at 841b90c; the decisive step ran with dry tuning's three outputs not yet committed. No crash; every count check
  equal; the wiring check matched 141 decided comparisons and 321 control values; both replays
  (tuning-lorentz-d3-lr0.03-s12000, measured-lorentz-d3-lr10-s3000) reached their runs' generator states; both
  pre-flight retrains equalled tuning's float SHA-256s; L14's closure check passed in both settings. Failed as required:
  L12's controls 1–4, L13's 1–3, L14's 3 and 4, L15's 2 and 3. Did not: L14's controls 1 and 2, and L15's control 1.
- *Not run dry.* A13.13 says that every report runs. These A13.11 reports have no dry set, and their code ran only in
  the runner's self-test on synthetic data, so it first meets real data in step 7: G_root (runner-10); HIT-R, whose
  construction ran only as the dry split; the suite's detection protocol (runner-27) and its 1,000 × 2% protocol
  (WBLESS and BiBLESS accuracy); LEDS, EVAL and Shwartz test; WS-353 similarity and combined; the HyperLex random split
  and its agreement check (runner-44). This deviates from A13.13's "every report runs"; none of them decides anything.
- *L14 control 1.* One of the 88 trained tables (48 tuning, 20 measured, 20 edge-shuffled) exceeded
  H₁₁/11 + 1/50 = 449047/1524600: tuning-euclid-d3-lr10-s12010, mean RR 1795247/6054048 = 0.296537, by 0.002002.
  - *Diagnosis: chance at the dry size; no evaluator defect.* An independent reader reproduced all 168 visible exact
    values it could compare (the measured tables' and floors' mean RR, the 88 relabelled per-row means).
  - No row of any table ties among slots 0–10, so the control's null is the same for every table: mean H₁₁/11, SD
    0.0077902 at 1,092 rows. The band is 2.57 SD above it: 0.5947% per table, and 25.5% that at least one of the 88
    tables, which share one slot vector, exceeds it. The 88 values fit that joint null (p ≈ 0.19).
  - Not recomputed: the values that depend on j, P and the split, which need the dry seeds 5620, 3007 and 4500–4502.
    The independent check of step 8 may draw them, with P's SHA-256 (item 2) as the receipt.
- *L14 control 2.* Nine of the 88 (5 tuning, 2 measured, 2 edge-shuffled) exceeded the same band, by
  0.000855–0.008768.
  - *Diagnosis: chance at the dry size.* The dry split has about 336 positives (expected from the verb graph's T), the
    largest about 6% of its rows. On the measured tables' visible 200-permutation tails the macro mean has SD 0.0125
    and pooled mean 0.27408 (H₁₁/11 = 0.27453). The band lies about 1.6 SD above it there: 223 of the 4,000 tail
    values exceed it (5.6% per table), so at least one of 88 tables exceeds it with probability 88%, and nine or more
    with 18%. Each measured table's value under P lies inside its own tail.
  - *An observation on the dry tails,* which changes no rule. Under a shared permutation the measured tables' macro
    means are weakly correlated: 0.17 on average, 0.38 within a geometry and about 0 across; their per-row means
    correlate 0.24. A13 argues control 2's band per table, and says "since P is shared the tables breach together" of
    the per-row mean on HiT test, whose seven largest positives hold 2.8–12.8% of its rows each; the dry split's
    largest hold about 6% at most, and nothing here is carried over to HiT test. For the macro mean, which decides, the
    dry tails show tables that do not breach together, so the chance of a void adds up over the tables (item 4).
- *L15 control 1.* The visible record holds one boolean; which of its six intervals did not lie above 0 is sealed
  until step 7.
  - *Diagnosis: size, almost surely.* MEN's slot ran on MEN's v–v rows (29 rows, 22 word types), which A13.13 names for
    (b) only and runner-10 made the stand-in. There a word-level interval of a difference of ρ has half-width 0.8–0.9,
    and the strongest of 20 permutations sits about 0.35 above their mean with no signal. In a synthetic model with
    the real word reuse (seeds 95600 + i) the control does not fail as required there with probability ≥ 0.99 for any
    ρ(H3) ≤ 0.8. On SimLex's 222 verb rows (170 types) the half-widths are 0.27–0.31, and it does not fail as required
    with probability ≥ 0.75 for ρ(H3) ≤ 0.4.
  - The visible evidence rules out the obvious defects. The Sym codes are oriented (the 15 SimLex verb rows whose words
    share a synset take the top code in every arm that keeps synsets' points), and L12's and L13's controls, which use
    the same strongest-of-20 rule, failed as required.
- *The word-level interval.* A13.7 calls it "mildly conservative". On these sparse pair sets it is more so: a row's
  resample weight m(x)·m(y) has variance about 3, against 1 for a row bootstrap, and in the synthetic model its
  intervals were 1.72–1.82 times the row bootstrap's and 1.57–1.82 times the true spread (1.64 on SimLex's nouns, 1.60
  on MEN's n–n rows). This bears on every ci_rho decision, most on the bands of L12(d) and L15(a). Disclosed; the unit
  is unchanged (item 4).
- *Convergence.* 24 of the 48 dry tuning runs failed A13.10.7. In each of the 12 ineligible (cell, rate) pairs of the
  table below both seeds failed, their ratios within 0.11 point (ratio = (m(890, 899) − m(990, 999))/(m(0, 9) −
  m(990, 999)); converged iff the drop is positive and the ratio ≤ 1%). No run diverged; guard hits occurred only in
  Lorentz d = 2 at rates ≥ 1, 0–3 per run.
  - *Cause: the budget, as L14's Risks foresaw.* A node gets about one positive row per epoch (E/n = 0.978; mammals
    5.53), so the slow rates are still descending at epoch 999. Euclidean stays on the ln 51 plateau until the rate
    summed over epochs reaches about 73–80 (rate 0.03 would need about 2,500 epochs); Lorentz at 0.03 descends almost
    linearly (a straight line gives 10.1%).
  - All 20 measured and 20 edge-shuffled runs at 10 converged (measured ratios 0.01–0.29%). The record's "40 of 42 runs
    converged" counts the two pre-flight retrains, which repeat tuning's (euclid, 2, 0.03, 12000) and (lorentz, 2,
    0.03, 12000) bit for bit and fail as those did; they decide nothing about convergence.
  - *A reading named here:* A13.10.7's "≤" passes a rising tail. 11 edge-shuffled runs and one tuning run ended with
    m(890, 899) < m(990, 999), at most −3.06% of their drop; an edge-shuffled run need only exist.
  - *U_@.* Per node and epoch it gives the verb graph's signal (E/n 1.019; 2.04 against 1.96 positive incidences; 51.0
    against 48.9 negative hits; largest hub 402 against 401), and the compute survey's U_@ burn-in losses (A13.19)
    match the dry curves within 3% for Lorentz. Synthetic graphs of either shape, trained by the registered trainer
    for 1,000 epochs (seeds 95600 + i), gave the dry verdicts in every cell tried, and runs at 10 converged
    (−0.13% to 0.13%). The likely outcome on U_@ is the same ineligible rates and 10 in every cell.
  - *The residual risk is divergence at 10.* On the mammals every Euclidean cell diverged at 10, at epoch 23, and
    Lorentz d = 2 at epochs 295–505 (A11.2). U_@ spreads a hub's rows thinner: its largest hub sits in about 0.27 rows
    of a batch, against 1.5 on the verb graph, where nothing diverged, and about nine (mammal.n.01) on the mammals.
    Lorentz d = 2 is the cell at risk: its U_@-shaped twin did not diverge at 10 but had 41 guard hits (the verbs 0–3).
  - *What a lost run costs.* Tuning screens a rate on two seeds, and the mammals' Lorentz divergences came late, so a
    measured run can still diverge, or fail to converge, at the frozen rate. It then removes its seed for both arms at
    that d (L14, Decision), and (a) and (b) cannot be supported at that d.

| Cell | Not converged (ratio, %) | Eligible | Chosen |
| --- | --- | --- | --- |
| Lorentz d = 2 | 0.03 (9.3), 0.1 (7.7), 0.3 (2.5) | 1, 3, 10 | 10 |
| Lorentz d = 3 | 0.03 (10.0), 0.1 (8.3) | 0.3, 1, 3, 10 | 10 |
| Euclidean d = 2 | 0.03 (31), 0.1 (71), 0.3 (3.8–3.9), 1 (1.3–1.4) | 3, 10 | 10 |
| Euclidean d = 3 | 0.03 (32), 0.1 (71), 0.3 (2.4) | 1, 3, 10 | 10 |

- *Tuning at the grid's end.* Dry tuning chose 10, the grid's top, in every cell, and the grid was not extended (A10.8,
  A13.10.5). The convergence gate excluded Euclidean's untrained 0.03 tables (loss still ln 51 at epoch 999), whose dry
  val means (0.5505 at d = 2, 0.6634 at d = 3) exceeded those of every eligible rate (0.5335 and 0.5920 at 10).
  Reported only; nothing here is changed on a value.
- *Ties.* No chained tie. Pass 1 wrote 915 code files (5,589,064 lines); 12,214 values took the 240-digit path, all
  in numerical ties between distinct input tuples, in 482 tie classes; Φ's maximum made 21,069 comparisons at 240
  digits and found 7,800 numerical ties.
- *Time.* The dry run took 3,548 s (0.99 h) against A13.16's 1.0 h, its pools packed at 98–99%. Its wall time was 1.21
  (tuning) and 1.30 (decisive training) times its CPU time, because another workload shared the container (load
  average up to 10.24 at 14:28:54Z).
  - The registered projection is 9.13 h with A13.16's per-epoch figures, and 9.8 h at 1.10 times them, as measured
    for one cell in a nearly quiet container (a U_@-sized synthetic Lorentz d = 3 run: 1.46 s of wall and 1.45 s of CPU
    per epoch, against A13.16's 1.32 s). Both include A13.16's 1.0 h row for the dry run, already spent. The runner
    refuses (above 11 h) once the measured per-epoch walls reach 1.29 times A13.16's figures (1.27 if the replays slow
    too), which the dry decisive step's contention exceeds.
  - Beyond the projection the run adds packing (0.2 h), the learned tables' pass 1 beyond A13.16's 0.6 h (about
    0.74 h, so 0.14 h) and pass 2 beyond its share of the exact-arms row (0.1–0.5 h). In a quiet container that is
    about 9.6–10.0 h in all at A13.16's figures, and about 10.2–10.7 h at 1.10, of the 12 h available. A load that
    starts after the two-epoch projection is not seen by it.
  - So A13.16's condition carries the margin: steps 5 and 7 run with no other session's work in the container, and
    their load-average samples show it.
- *Disk.* The dry projections (41.7 MB tuning, 88.6 MB decisive) were within 2% of the about 133 MB written. Snapped
  texts ran 10–13% over the projection (31.7–45.5 bytes per line against 30), code files 26% under (4.75 gzip bytes
  per line against 6), and the loss curves are not projected. Free space fell to 4.83 GB while another workload wrote
  about 10 GB; 13.7 GB is free as this is written. The registered run projects about 1.5 GB and needs about 3.5 GB free.
- *The seal* held for every metric value, interval and verdict on a human-rated or human-labelled set: the sealed file
  was not opened. Two things go beyond A13.13's list of what the dry record shows; both are disclosed, and neither
  decides anything.
  - (i) The code exposed the identity of each control's gold-chosen strongest permutation, in the wiring's provenance
    and in the committed code files' names: HL S-full-18 and W-7, BD (and WB, its stand-in) S-full-18 and W-0, BD-dir
    S-full-17 and W-7, SL S-full-8 and W-10, MEN S-full-12 and W-6. Each is the largest of 20 point estimates against
    the sealed gold (A13.7), so each carries up to log₂ 20 ≈ 4.3 bits about the sealed ratings or labels. They were seen
    in writing this amendment. They concern the dry permutations 5400 + i and 5420 + i, not the registered 2400 + i
    and 2420 + i.
  - (ii) The committed dry code files (A13.14's size rule) and the public rating files would together reproduce every
    sealed value; the seal binds this project's work. Neither was used.

**4. Definition changes: none.** A13.15 step 4 permits a change only in answer to a failure seen in steps 2–3. Each
failure, and why it changes nothing:
- *A crash, a count mismatch, a chained tie, a projected time or disk overrun:* none in the dry run (item 3). The
  findings of step 2's review were code fixes (item 7) that changed no definition.
- *L14 control 1 did not fail as required.* No change: the registered band is far from chance. At HiT test's 29,383
  rows the null SD is 0.0015018 and the band 13.3 SD above H₁₁/11; one table exceeds it by chance with probability at
  most 10^−36.7, one of 88 at most 10^−34.7. HiT test's repeated negatives and child rows can only lower this.
- *L14 control 2 did not fail as required.* No change, by a judgement stated here.
  - At HiT test's 2,110 positives the band lies 4.0–4.1 SD above the expectation under a model calibrated on the dry
    tails (SD 0.0049–0.0050; 100,000 synthetic tables per setting, seeds 95600 + i), 3.8 SD under A13's radius-only
    model and 3.57 SD at A13's own bound (SD 0.0056). With the macro's right skew that is about 4.5·10^−5 per table
    calibrated, 1.1·10^−4 radius-only and about 2.5·10^−4 at the bound.
  - The calibration rests on the 20 measured tables' tails, all trained at 10, and pins V_b (the covariance of the RR
    of two rows that share a positive) loosely: at the dry size a model with V_b = 0 gives a macro SD of 0.0122 against
    the 0.0125 observed (the per-row tail gives V_b = 0.027). 48 of the 88 tables are tuning tables, eight of them
    Euclidean at 0.03 and 0.1, untrained or barely trained (loss 3.65–3.93 at epoch 999, against ln 51 = 3.93), for
    which the radius-only model may fit better; one of them, tuning-euclid-d2-lr0.03-s12001, was among the three
    largest dry exceedances.
  - The tables are weakly correlated (item 3), so the risk adds up over them. The chance that at least one of up to 88
    null tables voids L14 is about 0.4% (0.2–0.7%) with every table calibrated (the two calibrated settings pooled;
    0.5%, 0.2–1.1%, at a = 1.0 alone), about 1% radius-only and about 2% at the bound. The realistic figure is about
    0.5–1%.
  - A13 missed this multiplicity: it argued the band per table. The risk is accepted rather than loosening the band to
    H₁₁/11 + 1/40 for control 2 alone (4.46 SD at A13's bound; under about 0.1% over 88 tables). That band would let a
    leak worth up to 0.025 of macro RR pass instead of 0.02, and it would be chosen after the dry outcome is known.
  - A void stands whatever the reported values show. They help a reader tell a tail event from a leak (A13): the
    per-row relabelled mean of every trained table under P, and, for the measured tables only, the seven labels'
    radius ranks and the 200-permutation tails. A tuning or edge-shuffled table that exceeds the band has no tail of
    its own.
  - Also not taken: 20 exact permutations (about 1.8 h per 20 permutations of the 88 tables, A13.16), and deciding on
    the binary64 tail (measured tables only, registered as a report).
- *L15 control 1 did not fail as required.* No change; the power A13 registered is accepted.
  - At the registered sizes the word-level half-width is 0.16–0.18 on SimLex's 666 nouns (751 types) and 0.10–0.12 on
    MEN's 2,005 n–n rows (645 types), and the strongest-of-20 lift is about 0.07 and 0.05. In the synthetic model of
    item 3, the probability that the control does not fail as required on a set, voiding all of L15(a), is in three
    scenarios (base: the controls carry no signal; polysemy: a polysemy channel shared by the gold and every control,
    true control ρ 0.10; heavy: larger word effects; 200 repetitions per SimLex cell, 150 per MEN cell, a dash where
    the scenario cannot reach that ρ):

| ρ(H3) | SL base | SL polysemy | SL heavy | MEN base | MEN polysemy | MEN heavy |
| --- | --- | --- | --- | --- | --- | --- |
| 0.2 | 0.960 | 1.000 | 0.925 | 0.107 | 1.000 | 0.347 |
| 0.3 | 0.290 | 0.920 | 0.320 | 0.000 | 0.067 | 0.000 |
| 0.4 | 0.000 | 0.110 | 0.005 | 0.000 | 0.000 | 0.000 |
| 0.5 | 0.000 | 0.000 | — | 0.000 | 0.000 | — |

  - ρ(H3) under Sym on SL and MEN has not been measured. 0.513 is WordNet-path's on SimLex's nouns (path2vec), not
    H3's; A13 itself expects H3 to fall below WordNet's own graph through bend artefacts (L12(d)), and expects a weak
    WordNet signal on MEN (L15(b) predicts that GloVe beats H3 there).
  - So the control voids (a) with substantial probability at ρ(H3) ≈ 0.2–0.3 on MEN and about 0.3 on SL, where the sets
    do see WordNet's structure. The cause is power, not a blind set: the word-level unit, about 1.6 times the true
    spread at these sizes (item 3), and the selection lift. The control does so at signals a less conservative test
    would accept. A void of all of L15(a) in the registered run is a live outcome.
  - That risk is accepted, as A13 registered the rule. Not taken: the mean of the 20 permutations, the row unit, a
    variance factor, or leaving MEN out or deciding per set. Each would weaken a control made strict on purpose and
    would be chosen while its sealed dry outcome exists, and the first two would part L15 from L12 and L13, which use
    the same rule. The selection-aware maximum (taken inside each resample) is stricter, so it cannot answer this
    failure. The dry failure itself is a size artefact of the stand-ins (item 3), which no change at the registered
    sizes would answer.
- *24 tuning runs did not converge.* No change. Every measured and edge-shuffled run converged, and the gate removed
  exactly the runs still descending. L14 stays stated at item 10.3's 1,000 epochs.
  - More epochs are unaffordable: Euclidean 0.03 needs about 2,500 to leave its plateau, about 17 h of training
    against A13.16's 11 h, and 1,250 epochs would put the projection at about 10.9 h.
  - Dropping 0.03 and 0.1 would change L14's "same … rate grid", to save about 1.1 h. It is left to a later amendment,
    and only if the registered projection exceeds 11 h (A13.16: "any cut is an amendment, not a runner option").
  - The grid is never extended (A13.10.5).
  - Changing A13.10.7's window or threshold would tune a gate after seeing what it passed. No dry ratio lay within 0.1
    point of 1%: the nearest were 0.87% and 1.32%.

**5. Clarifications flagged by the builders and reviewers.** Each is a reading and none changes a definition, except one
exclusion in the code that is not a reading, which item 6's commit undoes (the L12 grid's arms). The one change proposed
(the trace seeds) is refused, for want of a failure to name.
- *NK17 on flat tables* (runner-25): A13.5 defines NK17 by Poincaré norms, which flat tables lack; they are read with
  their Euclidean norm and distance, as P17 read its Euclidean embeddings. Reported only.
- *The L12 grid's arms* (runner-34). A13.11's "every arm under every score of item 5 and every sense rule of item 3"
  is read as L12's arms (A13 L12, Arms). S3 and the chain (WN-U, ST, the letter tree) are reported arms of A13.4, not
  L12's, and A13.11 lists them after it as reports of their own; their 8 arms stay at G with the maximum. S-full and W
  are among L12's arms ("the controls K3, S-full and W, on H3 with G"), each S-full_i and W_i places words on H3's
  points, so that every form can read it as it reads K3, and runner-30 reads each of them as an arm of L15. 841b90c
  left these 40 arms at G with the maximum to save cost: a narrowing of a reported item, which A13.15 step 4 permits
  only in answer to a named failure, and none applies. Item 6's commit scores them.
- *Tuning's count checks against A13.9* (runner-46): A13.10.5's "touches no other Stage-2 set" governs tuning, which
  makes WordNet's and HiT's counts (the names, train equal to E, and val's: from item 6's commit on, all of item 2's);
  the decisive run makes every count of A13.9 before its first metric.
- *HiT val's counts* (A13.9). A13.9's lead-in, "Before any metric the runner reproduces each count exactly; a mismatch
  stops the run", governs val's counts as well as test's; its val sentence says when they are made and where they are
  stated. 841b90c could not check them, since they were unknown when it was built: its COUNTS holds test's counts and
  val's rows, negatives and closure, and records the rest in `hit_detail` unchecked. Item 6's commit adds item 2's val
  counts to COUNTS, so tuning, the first step to compute a val metric, reproduces them. For test, A13 L14's "Every test
  pair is in T" makes 0 direct edges a check; for val, item 2's 0 is one.
- *The Node traces' seeds:* `Rng(8000 + i)`, as A13.1 says. A13.1 names that draw, so A13.12's "No other draw is made"
  is read together with it. 8000 + i is A1.10's trace family ("which no claim uses"), drawn by the earlier phases'
  traces, not a new family, and A13.12 needs no change. The tests' 95200 + i is not used for them: that would change
  A13.1's text with no failure to name. The traces are written in step 8 (A13.1).
- *The diagnoses' seeds* (item 7). A13.12 gives 95600 + i, i < 300, to "the review (unregistered)" and then says "No
  other draw is made". The review family is read as covering this amendment's diagnoses of the dry run as well as step
  2's review: both review the code and its outputs, on synthetic data, and decide nothing. Every seed the diagnoses
  drew has i < 300 (the largest is 95756), and a seed drawn twice decides nothing.
- *spec_from_a13 and a later protocol file* (runner-48): no definition changes here, so no `stage2_protocol_v2.txt`
  exists and the wiring check stands on v1 (item 6).
- *L12(d)'s "both" sides* (`stats2.l12_failing_side`): every end the interval passes is reported; "both" only when (d)
  is inconclusive, since a refuted interval lies wholly outside the band on one side.
- *L15 control 2's "every arm"* (runner-30): each S-full_i and W_i on SL and MEN is an arm. The band is five standard
  errors of a 20-permutation mean (a row permutation gives ρ variance exactly 1/(n − 1)), so a sound arm exceeds it by
  chance about 6·10^−7 of the time per (arm, set) by the normal tail, under 10^−4 over all 100 banded pairs.
- *Where pass 2's diagnostics are computed* (runner-33): A13.8's "pass 2 computes every metric from pass 1's files
  alone" governs the metrics; the reported values A13 defines outside those files are computed in pass 2 from tables
  whose SHA-256 is checked, reading no gold.
- *F1's joint list* (runner-12): A13.6 takes one tie-class list where a metric compares values, and F1 compares test
  values with a θ chosen on val.
- *The scope of -B -I* (runner-32): the four steps that parse fetched files are held to it; the self-test and
  `--write-settings` parse nothing fetched.
- *The definitions-amendment lookup* (runner-31): this amendment is found by the manifest's SHA-256 (item 2); a later
  amendment may restate it.

**6. The protocol file, and the code commit that follows.** No definition changes, so there is no
`stage2_protocol_v2.txt`. protocolSha stays `1c96a4b8d562634ef9e28a3be77221490b3bbce6a7821d7546521ea3c2a18d88`
(Amendment 10, then Amendment 13), and spec_from_a13, DECISION_SPEC and CONTROL_SPEC stand. This amendment is
committed alone. One commit follows it before registered tuning. It changes no definition and no decided comparison;
it brings the code to A13's text where 841b90c fell short of it:
- L12_GRID scores each S-full_i and W_i (item 5), and runner-34's text says so: 560 more scored cells on HL, about
  1.2 M code lines (about 7 MB) and an estimated 0.1–0.2 h of pass 1, which the exact arms' estimated 0.3–0.4 h keeps
  within about 0.1 h of A13.16's 0.5 h row;
- COUNTS holds HiT val's counts of item 2, promoted from `hit_detail` as test's are, so that tuning reproduces them
  before its first metric (A13.9; item 5);
- tests on synthetic data cover both, the runner's self-test included.

The dry run is then rerun on that commit, as A13.15 step 3 asks of a fix, with its values on human-rated sets sealed
as before; it is expected to reproduce 05d467d's trained tables (by SHA-256), counts and control outcomes and to add
only the new cells, and a difference is reported and resolved before tuning. Its record is committed before tuning,
and its sealed file, like 05d467d's, is opened after step 7. Registered tuning and the decisive run use that commit's
code.

If a later amendment changes a definition, that amendment is committed alone first. A separate commit then follows,
before the step it governs:
- it writes `stage2_protocol_v2.txt` (Amendment 10, Amendment 13 and that amendment, verbatim from their headings, LF
  line ends and a final LF);
- it pins that file's SHA-256 in `stage2data` and its test, and records carry it from then on (A13.14);
- it teaches spec_from_a13 the amending sentences, so that runner-48's refusal lifts for that text alone;
- it changes the affected constant (DECISION_SPEC, CONTROL_SPEC or the grid).

**7. What ran between Amendment 13 and this amendment** (Common rules, "Reporting").
- *The code* (613721d, e91e02d, 841b90c) was built on synthetic data, WordNet's verbs and unregistered seeds 95200 + i.
  - The fetch script checked every pin, GloVe's members included, and wrote the manifest; the count checks ran.
  - The adversarial review had four reviewers with independent implementations of the certified order, the statistics
    and bootstraps, the data and blind passes, and the implicit map and runner, and two skeptics per finding (seeds
    95600 + i). It found no defect in the decisions. Seven minor findings were fixed in e91e02d (item 5 names five of
    them, plus the dry 320-anchor check and the test seed family).
  - A completeness critic closed 18 of 19 gaps in 841b90c; the 19th, the Node traces, waits for step 8. Mutated
    runners (geometries or arms swapped, the row bootstrap in place of the word-level one) were all stopped by the
    wiring check.
- *The dry run* (item 3), committed in 05d467d.
- *Three diagnoses for this amendment,* drawing from the review family (item 5). None opened the sealed file or its
  folder, scored a registered instance, computed a GloVe score or a human-gold metric, drew a registered or dry seed,
  ran `--tune`, `--decisive`, `--time` or `--dry`, or wrote to the repository.
  - *L14 controls 1–2.* It read the dry split's G code files on the verb graph, WordNet's verb and noun T, and A13's
    HiT test profile, and simulated with seeds 95600 + i (i ≤ 15, 106 and 156).
  - *L15 control 1.* It counted SimLex's and MEN's word columns through the pass-1 readers (the manifest's counts),
    read the committed dry SL and MEN Sym code files and `index.verb` for the orientation check, and simulated with
    seeds 95600–95723.
  - *Tuning and convergence.* It read the 90 dry loss curves in the cache and the compute survey's U_@ probes (seed
    95040, A13.19), counted on WordNet, and trained synthetic graphs with seeds 95600–95633.
  - Some of these seeds served more than one diagnosis; none decides anything.
- *This draft* counted HiT val's names (item 2): no table, no score.

### Amendment 15 · 2026-11-08, Stage 2, the learning rates frozen before any measured run

Written on 2026-11-08, after registered tuning and before any measured run of L14 and any decisive evaluation. Tuning
ran at b2ba411 (the timing projection's commit) on a committed tree whose only changed path was tuning's own console
(item 5), and its record was committed in 60345b4. This is the lr-freeze amendment of A13.15 step 6: it fixes the rates
in `reference/settings-stage2.json` and lists every tuning run from `reference/results/tuning-stage2.json` (A13.10.5).
It changes no definition and nothing else. Item 1 gives the rates, item 2 every run, item 3 what tuning previews of L14,
item 4 what ran between Amendment 14 and this amendment, item 5 tuning's three starts and the container's suspension,
item 6 the load and the environment, and item 7 what is not known. This amendment and `settings-stage2.json` are
committed together, so the paths changed since b2ba411 are the four A13.15 step 7 allows.
- *Known.* Tuning scored HiT multi-hop val (29,383 rows) by G on its 48 tables and, beyond its count checks and its
  replay, computed nothing else (A13.10.5). That previews part of L14(a)'s outcome: Lorentz against Euclidean mean RR on
  HiT val, at the tuning seeds 9000–9011 (item 3).
- *Not known.* Nothing has been scored on HL, BD, WB, SL, MEN, WSR, HiT test or any reported set. Neither dry sealed
  file has been opened. The measured runs (seeds 0–4) have not run.

**1. The frozen rates.** `reference/settings-stage2.json` has SHA-256
f7823bdf55efbef7eb2dbf5951f46bc323bd44cd04c4e4176a4efd4c480c2dc4. It was written by
`python3 -B -I run_claims_stage2.py --write-settings` from `reference/results/tuning-stage2.json`, whose SHA-256 is
`9aa41e74442df22b35288517688c539cd2a57ecfed3fb1b773ed380779fcd829`, and it names that file, its SHA-256 and tuning's
HEAD (runner-14). It is committed with this amendment, which is the only amendment that holds its SHA-256 (A11.4's rule,
as the decisive run applies it).

| Geometry | d = 2 | d = 3 |
| --- | --- | --- |
| Lorentz | 10 | 10 |
| Euclidean | 10 | 10 |

- Every cell has a rate, so every cell has measured and edge-shuffled runs.
- *Tuning at the grid's end* (Amendment 14 item 3). Every cell chose 10, the grid's top, and the grid was not extended
  (A10.8; A13.10.5, "the grid is never extended"). In every cell the means of the eligible rates rise with the rate
  (table below), so tuning does not show where they would stop rising. No rate above 10 was tried.
- *The closest choice,* by the difference of the two largest eligible means: Euclidean d = 2, where 10 had mean 0.476949
  and 3 had 0.443919, a difference of 0.033031. The others: Euclidean d = 3 0.068579, Lorentz d = 3 0.112271 and Lorentz
  d = 2 0.167506, each 10 against 3. No tie arose: in every cell the eligible means are distinct, so A13.10.5's ties to
  the smaller rate did not apply.
- *The exact means of the frozen rates* (A13.10.5's score of a rate): Lorentz d = 2 711970591/814496760, d = 3
  344222471/407248380; Euclidean d = 2 155389513/325798704, d = 3 628579823/1085995680.
- *The convergence gate decided both Euclidean choices,* as in the dry run (Amendment 14 item 3). The four Euclidean
  runs at 0.03 stayed on the ln 51 plateau: m(0, 9) − m(990, 999) is 1.8·10^−5 at d = 2 and 2.7·10^−5 at d = 3 (both
  seeds), against 0.70–0.81 for Lorentz at 0.03, and their ratios are 32.0–32.1%. Yet their scores, 0.575679 and
  0.558037 at d = 2 and 0.712768 and 0.718746 at d = 3 (means 0.566858 and 0.715757), exceed the mean of every eligible
  Euclidean rate. Without the gate both Euclidean cells would have chosen 0.03. No ineligible Lorentz run scored above
  its cell's frozen mean. Reported only; nothing here is changed on a value.

Means of the eligible rates (A13.10.5); a dash marks an ineligible rate, and the frozen rate's mean is in bold:

| Cell | 0.03 | 0.1 | 0.3 | 1 | 3 | 10 | Frozen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Lorentz d = 2 | — | — | — | 0.587414 | 0.706617 | **0.874123** | `10` |
| Lorentz d = 3 | — | — | 0.589269 | 0.669900 | 0.732969 | **0.845240** | `10` |
| Euclidean d = 2 | — | — | — | — | 0.443919 | **0.476949** | `10` |
| Euclidean d = 3 | — | — | — | 0.506004 | 0.510226 | **0.578805** | `10` |

**2. Every tuning run.**
- *Values.* Each run's mean val RR in the random setting and in the hard setting (G on HiT multi-hop val, 29,383 rows,
  pessimistic ties), and its score, the exact mean of the two (A13.10.5; runner-7), to six decimals. Each run's exact
  fractions, float and snapped SHA-256, generator state, loss curve and diagnostics are in `tuning-stage2.json`.
- *Seeds.* Rate k of the grid ran on seeds 9000 + 2k and 9001 + 2k: 0.03 on 9000–9001, 0.1 on 9002–9003, 0.3 on
  9004–9005, 1 on 9006–9007, 3 on 9008–9009 and 10 on 9010–9011. In each row the first line is the first seed.
- *Ratio* is (m(890, 899) − m(990, 999))/(m(0, 9) − m(990, 999)) in percent, m as Amendment 14 item 1 reads it; a run
  converged iff m(0, 9) − m(990, 999) > 0 and the ratio is at most 1% (A13.10.7). The record keeps every 10th epoch's
  loss, so the ratios were computed from each run's full cached loss curve, whose SHA-256 the record holds (runner-42);
  each agrees with the record's `converged`.
- *Eligible:* neither run diverged and both converged (A13.10.5).
- *Convergence.* 24 of the 48 runs did not converge: both seeds of each of the 12 ineligible (cell, rate) pairs, their
  two ratios within 0.15 point of each other. The ineligible rates are the dry run's in every cell (Amendment 14
  item 3's table), as that item expected. The converged runs' ratios lie between 0.04% and 0.94%, all positive, so no
  converged run ended with a rising tail (the reading Amendment 14 item 3 names). Unlike the dry run, where no ratio lay
  within 0.1 point of 1% (Amendment 14 item 4), two did: Lorentz d = 3 at 0.3 (0.918% and 0.939%, eligible). The nearest
  failing ratios are Euclidean d = 2 at 1 (1.387% and 1.316%). Either rate counted the other way would leave every
  choice as it is.
- *Divergence and guard hits.* No run diverged: all 48 ran 1,000 epochs. Guard hits occurred only in Lorentz d = 2: 1 at
  0.3 (seed 9004; 9005 none); 11 and 11 at 1; 11 and 15 at 3; 19 and 23 at 10; every other run had none. Amendment 14
  item 3 named Lorentz d = 2 as the cell at risk of divergence at 10.
- *The replay.* `tuning-lorentz-d3-lr0.03-s9000` was replayed with `hpstep.prng.Rng` over all 1,000 epochs (A13.10.9).
  It ended in the run's state, [3319147630, 2441964160, 3544927668, 4041511136]: equal.
- *Time.* The 48 runs took 55,398 s of wall time in all, run four at a time (3.85 h shared over four processes, against
  the timing projection's 3.89 h for tuning). Per epoch: Lorentz d = 2 1.254–1.282 s, d = 3 1.466–1.509 s, Euclidean
  d = 2 0.821–0.862 s, d = 3 0.996–1.027 s, against the projection's 1.240, 1.561, 0.749 and 1.115 s. The replay took
  3,164.2 s (3.164 s per epoch, against 3.349 s) and HiT val's pass 1 241.5 s. Elapsed time: item 5.

| Cell | lr | Seeds | RR random | RR hard | Score | Ratio, % | Eligible |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Lorentz d = 2 | 0.03 | 9000<br>9001 | 0.659484<br>0.561685 | 0.276735<br>0.249089 | 0.468110<br>0.405387 | 9.232<br>9.242 | no |
| Lorentz d = 2 | 0.1 | 9002<br>9003 | 0.639791<br>0.640679 | 0.267807<br>0.266816 | 0.453799<br>0.453747 | 7.635<br>7.630 | no |
| Lorentz d = 2 | 0.3 | 9004<br>9005 | 0.703959<br>0.663151 | 0.280807<br>0.265625 | 0.492383<br>0.464388 | 2.399<br>2.415 | no |
| Lorentz d = 2 | 1 | 9006<br>9007 | 0.843564<br>0.845714 | 0.326395<br>0.333984 | 0.584979<br>0.589849 | 0.526<br>0.508 | yes |
| Lorentz d = 2 | 3 | 9008<br>9009 | 0.950559<br>0.961435 | 0.443942<br>0.470531 | 0.697250<br>0.715983 | 0.760<br>0.753 | yes |
| Lorentz d = 2 | 10 | 9010<br>9011 | 0.950888<br>0.956535 | 0.789022<br>0.800048 | 0.869955<br>0.878291 | 0.141<br>0.087 | yes |
| Lorentz d = 3 | 0.03 | 9000<br>9001 | 0.693528<br>0.710296 | 0.268590<br>0.269534 | 0.481059<br>0.489915 | 10.005<br>10.012 | no |
| Lorentz d = 3 | 0.1 | 9002<br>9003 | 0.731434<br>0.717262 | 0.272786<br>0.270167 | 0.502110<br>0.493715 | 8.156<br>8.177 | no |
| Lorentz d = 3 | 0.3 | 9004<br>9005 | 0.859469<br>0.884887 | 0.302456<br>0.310263 | 0.580962<br>0.597575 | 0.918<br>0.939 | yes |
| Lorentz d = 3 | 1 | 9006<br>9007 | 0.972528<br>0.970474 | 0.368493<br>0.368104 | 0.670511<br>0.669289 | 0.385<br>0.372 | yes |
| Lorentz d = 3 | 3 | 9008<br>9009 | 0.967429<br>0.959649 | 0.510818<br>0.493979 | 0.739124<br>0.726814 | 0.157<br>0.178 | yes |
| Lorentz d = 3 | 10 | 9010<br>9011 | 0.961821<br>0.955731 | 0.741838<br>0.721568 | 0.851830<br>0.838649 | 0.049<br>0.044 | yes |
| Euclidean d = 2 | 0.03 | 9000<br>9001 | 0.591623<br>0.573342 | 0.559736<br>0.542733 | 0.575679<br>0.558037 | 32.093<br>32.040 | no |
| Euclidean d = 2 | 0.1 | 9002<br>9003 | 0.540254<br>0.515101 | 0.370225<br>0.344459 | 0.455239<br>0.429780 | 69.695<br>69.742 | no |
| Euclidean d = 2 | 0.3 | 9004<br>9005 | 0.552941<br>0.530691 | 0.286675<br>0.270753 | 0.419808<br>0.400722 | 3.519<br>3.504 | no |
| Euclidean d = 2 | 1 | 9006<br>9007 | 0.596010<br>0.639479 | 0.283696<br>0.305649 | 0.439853<br>0.472564 | 1.387<br>1.316 | no |
| Euclidean d = 2 | 3 | 9008<br>9009 | 0.576383<br>0.620860 | 0.282127<br>0.296305 | 0.429255<br>0.458582 | 0.819<br>0.776 | yes |
| Euclidean d = 2 | 10 | 9010<br>9011 | 0.635352<br>0.628681 | 0.323298<br>0.320467 | 0.479325<br>0.474574 | 0.525<br>0.613 | yes |
| Euclidean d = 3 | 0.03 | 9000<br>9001 | 0.731274<br>0.735143 | 0.694262<br>0.702349 | 0.712768<br>0.718746 | 32.091<br>32.102 | no |
| Euclidean d = 3 | 0.1 | 9002<br>9003 | 0.556900<br>0.556989 | 0.332791<br>0.336668 | 0.444845<br>0.446828 | 69.657<br>69.509 | no |
| Euclidean d = 3 | 0.3 | 9004<br>9005 | 0.645806<br>0.706789 | 0.274818<br>0.306119 | 0.460312<br>0.506454 | 2.332<br>2.328 | no |
| Euclidean d = 3 | 1 | 9006<br>9007 | 0.735182<br>0.709112 | 0.302716<br>0.277006 | 0.518949<br>0.493059 | 0.706<br>0.714 | yes |
| Euclidean d = 3 | 3 | 9008<br>9009 | 0.730844<br>0.732016 | 0.290671<br>0.287375 | 0.510758<br>0.509695 | 0.349<br>0.377 | yes |
| Euclidean d = 3 | 10 | 9010<br>9011 | 0.781217<br>0.803921 | 0.350685<br>0.379397 | 0.565951<br>0.591659 | 0.160<br>0.154 | yes |

**3. What tuning previews of L14** (A13.15: HiT val is scored in step 5 and otherwise only in step 7, for A13.11's
reported F1). At the frozen rate, 10 in every cell, both geometries trained on seeds 9010 and 9011. Mean val RR at the
frozen rates, and Lorentz − Euclidean, the exact differences rounded:

| d | Setting | Lorentz | Euclidean | Lorentz − Euclidean | Difference, seed 9010 | Difference, seed 9011 |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | random | 0.953712 | 0.632016 | 0.321695 | 0.315536 | 0.327854 |
| 2 | hard | 0.794535 | 0.321883 | 0.472652 | 0.465724 | 0.479581 |
| 3 | random | 0.958776 | 0.792569 | 0.166207 | 0.180604 | 0.151810 |
| 3 | hard | 0.731703 | 0.365041 | 0.366662 | 0.391153 | 0.342171 |

- Lorentz is ahead in every d, setting and seed, by more in the hard setting than in the random one, and by more at
  d = 2 than at d = 3.
- Every eligible Lorentz rate's mean exceeds every eligible Euclidean rate's at the same d; at d = 3 narrowly (0.589269
  at Lorentz 0.3 against 0.578805 at Euclidean 10).
- The Euclidean tables at 0.03 that the gate excluded (item 1) come closer: at d = 3 their mean RR in the hard setting
  is 0.698306, against Lorentz's 0.731703 at 10.
- This decides nothing. L14(a) is decided on HiT test, which tuning did not read, at seeds 0–4 and the frozen rates, by
  A13's rule on each (d, setting)'s per-row intervals, after controls 1–4 and the closure check, and a seed counts only
  if it is present (L14, Decision). L14(b), on HyperLex, has no preview. As for L6 in Amendment 11, tuning shows part of
  the outcome before the decisive run, and the decisive run decides it.

**4. What ran between Amendment 14 and this amendment** (Common rules, "Reporting"). The commits after 513e079
(Amendment 14), in order; they are all the commits between 513e079 and 60345b4, and the work after tuning follows them.
ae6e6d3, the tooling merge, came before Amendment 14, which states it.
- *9550eea, the code commit of Amendment 14 item 6.* L12_GRID scores each S-full_i and W_i (runner-34); COUNTS holds HiT
  val's counts of Amendment 14 item 2 (runner-46), which every tuning start then reproduced; tests on synthetic data
  cover both. It touched `lexicon/hit.py`, `run_claims_stage2.py` and four test files, and no definition.
- *The dry rerun* (A13.15 step 3 after a fix, as Amendment 14 item 6 asks): `--dry --workers 4` at 9550eea, dry tuning
  from 17:51:23Z and the dry decisive step 18:16:10–18:46:25Z; its record was committed in 5acbbb7. It reproduced
  05d467d: every trained and snapped table, decision code file, count, visible value and control outcome is equal. The
  new L12 cells add 560 HL code files and 560 sealed records (1,180 against 620). The other differences are times,
  process ids, load samples, free disk, HEAD, the label (Amendments 1–14), the cache's list of starts (the first dry
  run's start and its own), the two edited readings (runner-34, runner-46), totals that grow with those cells, and the
  SHA-256s that follow from these (the dry tuning record's, the dry settings' and the sealed file's). Its values on
  human-rated sets went to a new sealed file, SHA-256
  `9c9eac2c8122f1f228b76be34cef189c4fd2429b93dd4e3b48046a37cda79d64`. The runner writes one fixed path, so the first dry
  run's sealed file (`7ba50e01…`, Amendment 14) was first moved aside, unopened, to
  `~/.cache/hyperbolic-lexicon/stage2/dry-sealed-05d467d/`. Neither has been opened; both are opened after step 7.
- *93a5a8e, a test-only fix.* `test_registered_steps_refuse_without_the_definitions_amendment` read the committed
  PREREGISTRATION.md and expected no definitions amendment in it; Amendment 14 holds the manifest's SHA-256, so the
  decisive step no longer refused there. The test now checks that the committed file's definitions amendment is 14 and
  tests the refusal on the file as it stood before it. The runner and the lexicon modules are unchanged. Amendment 14
  item 6 announced one commit before registered tuning; this is a second one, test-only. It was written in a separate
  worktree of the code and committed there at 17:52Z (c709992, a local branch), during the dry rerun, then cherry-picked
  after 5acbbb7. So the dry rerun ran on 9550eea's tree with only its own outputs changed, and tuning ran 9550eea's
  runner and modules (`git diff 9550eea b2ba411` changes one test file and results files only).
- *b2ba411, the timing projection* (A13.16; runner-8): `--time` at 93a5a8e, 18:47:58Z, 23 s; two epochs per cell on
  seeds 95500–95504 (A13.12). Per epoch (wall, four processes at once): Lorentz d = 2 1.240 s, d = 3 1.561 s, Euclidean
  d = 2 0.749 s, d = 3 1.115 s; the replay 3.349 s. The projected total was 9.93 h against 11 h (tuning 3.89 h, decisive
  training 3.38 h, replays 0.47 h, exact arms 0.50 h, tuning evaluation 0.10 h, decisive evaluation 0.60 h, and A13.16's
  1.0 h for the dry run, already spent), and the disk 1.50 GB (4,650,221 code lines of the exact arms) against 13.31 GB
  free: both within, so tuning ran.
- *Tuning* at b2ba411 (items 2 and 5); its record and console were committed in 60345b4. `--write-settings` then wrote
  `settings-stage2.json` from the committed record (item 1).
- *This amendment's sources.* Items 1–3 and tuning's own figures in items 5–7 come from `tuning-stage2.json`,
  `settings-stage2.json`, tuning's console and the 48 cached loss curves (each checked against the record's SHA-256).
  The rest of items 4–6 come from `results/stage2-time.json` and its console, the dry records and consoles in git, git's
  log and reflog, the cache's journal of finished jobs (`runs.jsonl`) and the kernel log. The drafting recomputed every
  value from those files: no table, no score, no draw. An adversarial check then read the same files and the dry records
  from git and recomputed every value independently. Both, and a final recheck, imported `run_claims_stage2` or
  `lexicon.l6` (under `python3 -B -I`) only to test the amendment lookups on a copy of PREREGISTRATION.md with this
  amendment appended: no table, no score, no draw, no sealed file.

**5. Tuning's three starts, and the container's suspension.** All three ran `--tune --workers 4` at b2ba411 in
environment b44f374b1412. The record lists them; the committed console holds all three, one after another.
- *Start 1, 18:48:40Z.* It passed the count checks and started the training pool, and was stopped deliberately by the
  agent running the step, within about 20 s, before any job finished: it had been launched under a 2-hour limit of the
  session's command tool, which would have killed it mid-run. Nothing it computed was kept; start 2 found no finished
  job.
- *Start 2, 18:49:01Z,* detached from the session. 20 of the 49 training jobs finished, the last at 20:54:53Z: the
  replay and 19 tuning runs (the 12 of Lorentz d = 3, and Euclidean d = 3 at 0.03, 0.1, 0.3 and at 1 on seed 9006). The
  container was then suspended for inactivity, because no task of the session was running to keep it awake. That came
  after 20:54:54Z, the last finished job's line in the cache's journal, and before about 20:58Z:
  `tuning-euclid-d3-lr1-s9007`, started at about 20:40:56Z, would have finished by 20:57:32–20:58:03Z at the twelve
  Euclidean d = 3 runs' wall times (996–1,027 s), and has no line. The container was restored from a snapshot at
  22:20:52Z (the kernel log reads "virtual machine fork"), and the restore ended start 2's processes. The four jobs then
  in flight were lost. The console does not name them, but the pool starts jobs in a fixed order (the longest estimate
  first, then by key), so they were `tuning-euclid-d3-lr1-s9007`, `-lr10-s9010`, `-lr10-s9011` and `-lr3-s9008`, the
  first four that start 3 ran.
- *Start 3, 22:22:12Z.* It reused the 20 finished jobs, as runner-2 allows (the same HEAD and configuration, every file
  at its recorded SHA-256), ran the other 29 runs from their first epoch and HiT val's pass 1, and wrote the record at
  00:43:28Z. The record marks the 19 reused runs `resumed`.
- *What the restarts change.* No value: a run's bits depend only on its seed and the code (the dry rerun reproduced
  every dry table bit for bit, item 4), every run records the same environment, the reused files were checked by
  SHA-256, and the replay of a start-2 run reached its state. The decisive run's two pre-flight retrains (A13.10.9),
  (euclid, 2, `0.03`, 9000) and (lorentz, 2, `0.03`, 9000), repeat runs trained in start 3.
- *The tree.* Start 1 found it clean. Starts 2 and 3 found one changed path, tuning's console, written by the earlier
  starts, which runner-1 allows as the step's own output; the checks before each pool and before writing found the same,
  and no start was marked.
- *Elapsed time.* Start 2 trained for 7,552.9 s up to its last finished job; start 3 took 8,476.6 s (training
  22:22:31–00:39:08Z, pass 1 00:39:08–00:43:10Z). The suspension cost the time from 20:54:53Z to 22:22:12Z and the
  in-flight jobs' work.

**6. Load and environment.** A13.16 asks that no other workload run during steps 5 and 7, and that the record hold the
load average.
- *Samples.* Every sample taken while four workers trained read a one-minute load of 4.00–4.13: 12 in start 2 and 12 in
  start 3. At the starts it read 0.80 (start 1), 0.65 (start 2) and 0.11 (start 3, after the restore); the 15-minute
  averages of starts 1 and 2 (3.56, 3.47) still held the dry rerun and the overhaul's last test run (below). As
  start 3's pool drained it fell to 1.0 (00:35:03Z) and 1.16; HiT val's pass 1, four processes for 241.5 s, ended at
  3.71. The record holds 18 of start 3's 19 samples; the last (3.11, at the end) was taken after the record was written.
  It and starts 1 and 2's samples are in the console.
- *Other work in the container.* The integration overhaul's agents worked in other repositories' worktrees here. Their
  last test run ended at 18:41Z. A flag raised at 18:47:52Z, before the timing projection, stopped their heavy commands
  for the rest of tuning; one sub-second offline unit test ran at 18:52Z, during start 2's training. So A13.16's
  condition, and Amendment 14 item 3's "no other session's work in the container", held for heavy work only, not to the
  letter: the flag stopped heavy commands, any light commands of those sessions were not recorded, and one test ran
  during step 5. The load samples (4.00–4.13 while four workers trained) are the evidence that nothing else added a
  sustained load.
- *Checks.* Every start reproduced tuning's count checks (WordNet and HiT val, with Amendment 14 item 2's val counts;
  runner-46): all equal. Disk pre-flight: 0.371 GB to write against 13.31 GB free (13.21 GB at start 3). The record
  holds the 51 readings runner-1 to runner-51 and no development mark.
- *Environment.* Python 3.13.18, numpy 2.5.3, numba 0.68.1, llvmlite 0.50.0 and glibc 2.39; numpy's SIMD dispatch
  X86_V3, X86_V4, AVX512_ICL and AVX512_SPR; Linux 6.18.44 on 4 CPUs. The environment SHA prefix is b44f374b1412 at
  every start and in every run, as in the dry run, the dry rerun and the timing projection.

**7. What is not known.**
- Whether a measured run at 10 diverges or fails to converge. Tuning screened 10 on two seeds per cell and none
  diverged, but Lorentz d = 2 had 19 and 23 guard hits there, and on the mammals Lorentz d = 2 diverged late at 10
  (A11.2). A lost run removes its seed for both arms at its d (L14, Decision; Amendment 14 item 3).
- Where the scores would peak: they still rise at 10 in every cell, and the grid is never extended.
- Whether item 3's preview holds on HiT test, at seeds 0–4, under L14's intervals and controls. Nothing is known of
  L14(b).
- Why G ranks HiT val's candidates so well on the Euclidean tables at 0.03, whose loss barely moved (item 1). It was not
  examined: tuning computes nothing else, and this amendment changes nothing. Those tables and the Euclidean ones at 0.1
  (loss 3.55–3.67 at epoch 999, against ln 51 = 3.9318) are among the 48 tuning tables that controls 1 and 2 read in
  step 7, where Amendment 14 item 4 weighs control 2's risk.
- The exact time of the suspension (item 5 bounds it).
- What added the small excess over 4.00 (at most 0.13) in 10 of the 24 load samples taken while four workers trained
  (item 6): not recorded.
