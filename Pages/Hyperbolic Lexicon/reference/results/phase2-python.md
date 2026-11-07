# Hyperbolic Lexicon, Phase 2, the Python reference's half

Run 2026-11-05 19:29:58 UTC with PREREGISTRATION.md with Amendments 1-4. Per-instance lists: ~/.cache/hyperbolic-lexicon (lexicon.CACHE; HL_CACHE overrides)/phase2/.

| Claim | Decision | Cases | Seconds |
| --- | --- | --- | --- |
| L1 | decided by the Node and Chromium runners against these digests; controls 2 and 3 show their weakness in every cell | 156801 | 69.1 |
| L4 | (a) decided against Node; (b) supported | 2176 | 63.8 |

## L1

| Set | Vocab | Instances | Record list SHA-256 | Id stream SHA-256 | Fertility | [UNK] rate | Fail-closed | HF differs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a | V0 | 117659 | `defa6cc33dc2e19e…` | `87493312e7b213ae…` | 1.2170 | 0.0000 | 0 | 0 |
| a | V1 | 117659 | `7aa8d14fac64ff74…` | `afa37940c1890a33…` | 1.1067 | 0.0000 | 0 | 0 |
| b | V0 | 16622 | `5b60a59e2a9a8b84…` | `88dd74b7af2ce96e…` | 1.2437 | 0.0017 | 0 | 0 |
| b | V1 | 16622 | `027e76a49a057bbb…` | `1ca97639b6250c9b…` | 1.0675 | 0.0000 | 0 | 0 |
| c | V0 | 20520 | `ec44644403ebfb72…` | `a97e775de8bb1864…` | 1.0002 | 0.9957 | 20412 | 0 |
| c | V1 | 20520 | `2849500c23be688b…` | `ebb579b2d8fe03cf…` | 1.0047 | 0.9879 | 20412 | 28 |
| d | V0 | 2000 | `83916d1a4c64b7a0…` | `d59109f0fc292e1d…` | 1.0000 | 0.9844 | 369 | 29 |
| d | V1 | 2000 | `5fbea5ff13f2e25d…` | `ad34b5bfb37ea2be…` | 1.0105 | 0.9437 | 369 | 29 |

Control 2: V0 a 117659/117659; V1 a 117659/117659 differ (shows its weakness: {'V0': True, 'V1': True}).
Control 3: V0 a 0/117659, b 7/16622; V1 a 0/117659, b 7/16622 differ (shows its weakness: {'V0': True, 'V1': True}).
Control 1 (reference side): c 20520 cases, list `eca96dd8bd212de0…`.

## L4

| Set | Tree | Queries | Rank lists digest | Graph MAP | Closure MAP | Graph mean rank | Closure mean rank |
| --- | --- | --- | --- | --- | --- | --- | --- |
| mammals | H3 | 1176 | `6426f70fdeffb377…` | 0.690653 | 0.305932 | 2.909 | 66.894 |
| mammals | H2 | 1176 | `05872a2115071e54…` | 0.718723 | 0.306331 | 2.737 | 68.490 |
| nouns | H3 | 200 | `5d5d9cafb4b206fa…` | 0.553253 | 0.138801 | 4.045 | 1616.797 |
| nouns | H2 | 200 | `c2ca94116a6d8fde…` | 0.572214 | 0.138116 | 4.080 | 1559.290 |

(b) on nouns: H3 990/1000 queries with an inversion (4978009 inversions, 152072 float ties, first at deeper word length 25); H2 993/1000 queries with an inversion (8969341 inversions, 1715 float ties, first at deeper word length 25); 997 in H3 or H2: **supported**.
Control 1 (float32): 1137/1176 queries with an inversion. Control 2: shows its weakness (487/488).

## Full results

`phase2-python.json` (per-query lists included).
