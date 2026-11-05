# Hyperbolic Lexicon, Phase 2: the JavaScript engines against the reference

Run 2026-11-05 19:39:05 UTC with PREREGISTRATION.md with Amendments 1-4 by `reference/run_claims_js.cjs`, against `results/phase2-python.json` (started 2026-11-05 19:29:58 UTC). Node v22.23.4 (ICU 78.3, Unicode 17.0); Chromium 153.0.8010.12 (Playwright 1.63.0; newest Unicode marker assigned in the page: 17.0); Python 3.13.18 (unicodedata 15.1.0). Parity first: 18667/18667 lines of tests/parity-lexicon.cjs pass.

| Claim | Cell | Decision | What decided it |
| --- | --- | --- | --- |
| L1 | V0 Node | supported | 0 of 156801 instances differ, 0 id streams differ; controls 1/2/3 show their weakness: true/true/true |
| L1 | V0 Chromium | supported | 0 of 156801 instances differ, 0 id streams differ; controls 1/2/3 show their weakness: true/true/true |
| L1 | V1 Node | supported | 0 of 156801 instances differ, 0 id streams differ; controls 1/2/3 show their weakness: true/true/true |
| L1 | V1 Chromium | supported | 0 of 156801 instances differ, 0 id streams differ; controls 1/2/3 show their weakness: true/true/true |
| L1 | all cells | supported | 4 of 4 cells run; V0 Node supported, V0 Chromium supported, V1 Node supported, V1 Chromium supported |
| L3(f) | noun forest | supported | canonical list equal (eb22bf00689ec86d…), 2000/2000 sampled lines equal |
| L4(a) | Python and Node | supported | 0 failures (rank lists and exact values) over mammals and nouns, H3 and H2; Python's control 2: shows its weakness |
| L4(b) | the reference | supported | decided by the reference: 997/1000 queries with an inversion in H3 or H2; Node (reported) 997 |

## L1

| Set | Vocab | Runtime | Instances | Differing | Record list | Id stream | Seconds (both vocabularies) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a | V0 | node | 117659 | 0 | `defa6cc33dc2e19e…` equal | `87493312e7b213ae…` equal | 15.8 |
| a | V0 | chromium | 117659 | 0 | `defa6cc33dc2e19e…` equal | `87493312e7b213ae…` equal | 12 |
| a | V1 | node | 117659 | 0 | `7aa8d14fac64ff74…` equal | `afa37940c1890a33…` equal | 15.8 |
| a | V1 | chromium | 117659 | 0 | `7aa8d14fac64ff74…` equal | `afa37940c1890a33…` equal | 12 |
| b | V0 | node | 16622 | 0 | `5b60a59e2a9a8b84…` equal | `88dd74b7af2ce96e…` equal | 2.1 |
| b | V0 | chromium | 16622 | 0 | `5b60a59e2a9a8b84…` equal | `88dd74b7af2ce96e…` equal | 1.9 |
| b | V1 | node | 16622 | 0 | `027e76a49a057bbb…` equal | `1ca97639b6250c9b…` equal | 2.1 |
| b | V1 | chromium | 16622 | 0 | `027e76a49a057bbb…` equal | `1ca97639b6250c9b…` equal | 1.9 |
| c | V0 | node | 20520 | 0 | `ec44644403ebfb72…` equal | `a97e775de8bb1864…` equal | 0.5 |
| c | V0 | chromium | 20520 | 0 | `ec44644403ebfb72…` equal | `a97e775de8bb1864…` equal | 0.4 |
| c | V1 | node | 20520 | 0 | `2849500c23be688b…` equal | `ebb579b2d8fe03cf…` equal | 0.5 |
| c | V1 | chromium | 20520 | 0 | `2849500c23be688b…` equal | `ebb579b2d8fe03cf…` equal | 0.4 |
| d | V0 | node | 2000 | 0 | `83916d1a4c64b7a0…` equal | `d59109f0fc292e1d…` equal | 0.3 |
| d | V0 | chromium | 2000 | 0 | `83916d1a4c64b7a0…` equal | `d59109f0fc292e1d…` equal | 0.3 |
| d | V1 | node | 2000 | 0 | `5fbea5ff13f2e25d…` equal | `ad34b5bfb37ea2be…` equal | 0.3 |
| d | V1 | chromium | 2000 | 0 | `5fbea5ff13f2e25d…` equal | `ad34b5bfb37ea2be…` equal | 0.3 |

Control 1 (platform normaliser against the reference's R(s); must differ on at least one case): node: c 725/20520 (table list equal); chromium: c 725/20520 (table list equal).
Control 2 (the reference): shows its weakness {"V0":true,"V1":true}.
Control 3 (the reference): shows its weakness {"V0":true,"V1":true}.

Reported (from the reference): a V0: fertility 1.2170, [UNK] rate 0.0000, fail-closed 0, HF differs 0/117659; a V1: fertility 1.1067, [UNK] rate 0.0000, fail-closed 0, HF differs 0/117659; b V0: fertility 1.2437, [UNK] rate 0.0017, fail-closed 0, HF differs 0/16622; b V1: fertility 1.0675, [UNK] rate 0.0000, fail-closed 0, HF differs 0/16622; c V0: fertility 1.0002, [UNK] rate 0.9957, fail-closed 20412, HF differs 0/20520; c V1: fertility 1.0047, [UNK] rate 0.9879, fail-closed 20412, HF differs 28/20520; d V0: fertility 1.0000, [UNK] rate 0.9844, fail-closed 369, HF differs 29/2000; d V1: fertility 1.0105, [UNK] rate 0.9437, fail-closed 369, HF differs 29/2000.

## L3(f)

Words by lexicon_core.js's address rule, H³ by decoder3d.js pointExact, H² by the core's exact tree: 82115 nodes; canonical point list `eb22bf00689ec86da05f0f4ba6338abc0ba0a1549ada844a134cbce154a3ebc6` (Python `eb22bf00689ec86da05f0f4ba6338abc0ba0a1549ada844a134cbce154a3ebc6`); sampled lines 2000/2000 equal; 0.933 ms per node for both points; comparison control caught: true.

## L4

| Set | Tree | Engine | Queries | Differing rank lists | Graph MAP | Closure MAP | Graph mean rank | Closure mean rank | Seconds |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mammals | H3 | node | 1176 | 0 | 0.690653 = | 0.305932 = | 2.909 = | 66.894 = | 1.7 |
| mammals | H2 | node | 1176 | 0 | 0.718723 = | 0.306331 = | 2.737 = | 68.490 = | 1.9 |
| nouns | H3 | node | 200 | 0 | 0.553253 = | 0.138801 = | 4.045 = | 1616.797 = | 28.3 |
| nouns | H2 | node | 200 | 0 | 0.572214 = | 0.138116 = | 4.080 = | 1559.290 = | 35.2 |
| mammals | H3 | chromium (reported) | 1176 | 0 | 0.690653 = | 0.305932 = | 2.909 = | 66.894 = | 1.4 |
| mammals | H2 | chromium (reported) | 1176 | 0 | 0.718723 = | 0.306331 = | 2.737 = | 68.490 = | 1.5 |

(b) on nouns, decided by the reference: H3 990/1000 queries with an inversion, H2 993/1000 queries with an inversion; 997 in H3 or H2: **supported**. Node (reported): H3 990/1000 (per-query counts differ from Python's on 0), H2 993/1000 (per-query counts differ from Python's on 0).
Control 1 (float32): Python 1137/1176, Node 1137/1176 queries with an inversion. Control 2: Python shows its weakness (487/488), Node shows its weakness (487/488).

## Timings (seconds)

parity_and_data 14, l1_instance_lists 1.1, l1_node 21.7, wordnet_and_l4_sets 2.2, chromium 27.7, l3f 76.7, l4_node 268.1, total 411.4.

## Full results

`claims-phase2.json` (counterexamples, controls, environments). The runner's per-instance lists are in `~/.cache/hyperbolic-lexicon/phase2/js/` (HL_CACHE overrides the root).
