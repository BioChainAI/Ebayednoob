# Hyperbolic Lexicon, Phase 2: the JavaScript engines against the reference (dry run)

Run 2026-11-05 19:19:34 UTC with PREREGISTRATION.md with Amendments 1-4 by `reference/run_claims_js.cjs --dry`, against `results/dry/phase2-python.json` (started 2026-11-05 19:18:27 UTC). Node v22.23.4 (ICU 78.3, Unicode 17.0); Chromium 153.0.8010.12 (Playwright 1.63.0; newest Unicode marker assigned in the page: 17.0); Python 3.13.18 (unicodedata 15.1.0). Parity first: 18667/18667 lines of tests/parity-lexicon.cjs pass.

| Claim | Cell | Decision | What decided it |
| --- | --- | --- | --- |
| L1 | V0 Node | supported | 0 of 2010 instances differ, 0 id streams differ; controls 1/2/3 show their weakness: true/true/true |
| L1 | V0 Chromium | supported | 0 of 2010 instances differ, 0 id streams differ; controls 1/2/3 show their weakness: true/true/true |
| L1 | V1 Node | supported | 0 of 2010 instances differ, 0 id streams differ; controls 1/2/3 show their weakness: true/true/true |
| L1 | V1 Chromium | supported | 0 of 2010 instances differ, 0 id streams differ; controls 1/2/3 show their weakness: true/true/true |
| L1 | all cells | supported | 4 of 4 cells run; V0 Node supported, V0 Chromium supported, V1 Node supported, V1 Chromium supported |
| L3(f) | verb forest | supported | canonical list equal (890033598260f7fa…), 2000/2000 sampled lines equal |
| L4(a) | Python and Node | supported | 0 failures (rank lists and exact values) over verbs-subtree and verbs, H3 and H2; Python's control 2: shows its weakness |
| L4(b) | the reference | supported | decided by the reference: 145/200 queries with an inversion in H3 or H2; Node (reported) 145 |

## L1

| Set | Vocab | Runtime | Instances | Differing | Record list | Id stream | Seconds (both vocabularies) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dry_d | V0 | node | 2000 | 0 | `dc7de713a7667cf1…` equal | `b6c72f2ccac50220…` equal | 0.3 |
| dry_d | V0 | chromium | 2000 | 0 | `dc7de713a7667cf1…` equal | `b6c72f2ccac50220…` equal | 0.3 |
| dry_d | V1 | node | 2000 | 0 | `d2e75a500d71cb14…` equal | `eeaeb5c46e9902c6…` equal | 0.3 |
| dry_d | V1 | chromium | 2000 | 0 | `d2e75a500d71cb14…` equal | `eeaeb5c46e9902c6…` equal | 0.3 |
| markdown | V0 | node | 10 | 0 | `e08f0385104217dc…` equal | `4f47af61e27940d0…` equal | 0.2 |
| markdown | V0 | chromium | 10 | 0 | `e08f0385104217dc…` equal | `4f47af61e27940d0…` equal | 0.2 |
| markdown | V1 | node | 10 | 0 | `704aa6454079a100…` equal | `988df3c65228a49e…` equal | 0.2 |
| markdown | V1 | chromium | 10 | 0 | `704aa6454079a100…` equal | `988df3c65228a49e…` equal | 0.2 |

Control 1 (platform normaliser against the reference's R(s); must differ on at least one case): node: dry_d 171/2000 (table list equal), markdown 0/10 (table list equal); chromium: dry_d 171/2000 (table list equal), markdown 0/10 (table list equal).
Control 2 (the reference): shows its weakness {"V0":true,"V1":true}.
Control 3 (the reference): shows its weakness {"V0":true,"V1":true}.

Reported (from the reference): dry_d V0: fertility 1.0000, [UNK] rate 0.9811, fail-closed 336, HF differs 22/2000; dry_d V1: fertility 1.0147, [UNK] rate 0.9347, fail-closed 336, HF differs 22/2000; markdown V0: fertility 1.2824, [UNK] rate 0.0406, fail-closed 0, HF differs 0/10; markdown V1: fertility 1.1192, [UNK] rate 0.0001, fail-closed 0, HF differs 0/10.

## L3(f)

Words by lexicon_core.js's address rule, H³ by decoder3d.js pointExact, H² by the core's exact tree: 13767 nodes; canonical point list `890033598260f7faadd17f377c62e6242a9832a39ac70b1976c839d2efbb4472` (Python `890033598260f7faadd17f377c62e6242a9832a39ac70b1976c839d2efbb4472`); sampled lines 2000/2000 equal; 0.362 ms per node for both points; comparison control caught: true.

## L4

| Set | Tree | Engine | Queries | Differing rank lists | Graph MAP | Closure MAP | Graph mean rank | Closure mean rank | Seconds |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| verbs-subtree | H3 | node | 1700 | 0 | 0.565231 = | 0.347716 = | 5.471 = | 20.355 = | 3.3 |
| verbs-subtree | H2 | node | 1700 | 0 | 0.582964 = | 0.350902 = | 5.542 = | 21.976 = | 3.3 |
| verbs | H3 | node | 200 | 0 | 0.603713 = | 0.395426 = | 18.670 = | 629.444 = | 3.7 |
| verbs | H2 | node | 200 | 0 | 0.633630 = | 0.404867 = | 14.210 = | 712.028 = | 4.1 |
| verbs-subtree | H3 | chromium (reported) | 1700 | 0 | 0.565231 = | 0.347716 = | 5.471 = | 20.355 = | 2.5 |
| verbs-subtree | H2 | chromium (reported) | 1700 | 0 | 0.582964 = | 0.350902 = | 5.542 = | 21.976 = | 2.5 |

(b) on verbs, decided by the reference: H3 57/200 queries with an inversion, H2 145/200 queries with an inversion; 145 in H3 or H2: **supported**. Node (reported): H3 57/200 (per-query counts differ from Python's on 0), H2 145/200 (per-query counts differ from Python's on 0).
Control 1 (float32): Python 1700/1700, Node 1700/1700 queries with an inversion. Control 2: Python shows its weakness (558/755), Node shows its weakness (558/755).

## Timings (seconds)

parity_and_data 14.8, l1_instance_lists 0.2, l1_node 0.7, wordnet_and_l4_sets 0.8, chromium 6.9, l3f 5, l4_node 21.7, total 50.2.

## Full results

`claims-phase2.json` (counterexamples, controls, environments). The runner's per-instance lists are in `~/.cache/hyperbolic-lexicon/phase2-dry/js/` (HL_CACHE overrides the root).
