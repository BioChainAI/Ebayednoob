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
