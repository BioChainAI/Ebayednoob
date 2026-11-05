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

None yet.
