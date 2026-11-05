# Hyperbolic Lexicon, Phase 2, the Python reference's half (dry run)

Run 2026-11-05 19:18:27 UTC with PREREGISTRATION.md with Amendments 1-4. Per-instance lists: ~/.cache/hyperbolic-lexicon (lexicon.CACHE; HL_CACHE overrides)/phase2-dry/.

| Claim | Decision | Cases | Seconds |
| --- | --- | --- | --- |
| L1 | decided by the Node and Chromium runners against these digests; controls 2 and 3 show their weakness in every cell | 2010 | 3.8 |
| L4 | (a) decided against Node; (b) supported | 1900 | 6.2 |

## L1

| Set | Vocab | Instances | Record list SHA-256 | Id stream SHA-256 | Fertility | [UNK] rate | Fail-closed | HF differs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dry_d | V0 | 2000 | `dc7de713a7667cf1…` | `b6c72f2ccac50220…` | 1.0000 | 0.9811 | 336 | 22 |
| dry_d | V1 | 2000 | `d2e75a500d71cb14…` | `eeaeb5c46e9902c6…` | 1.0147 | 0.9347 | 336 | 22 |
| markdown | V0 | 10 | `e08f0385104217dc…` | `4f47af61e27940d0…` | 1.2824 | 0.0406 | 0 | 0 |
| markdown | V1 | 10 | `704aa6454079a100…` | `988df3c65228a49e…` | 1.1192 | 0.0001 | 0 | 0 |

Control 2: V0 dry_d 0/2000, markdown 10/10; V1 dry_d 0/2000, markdown 10/10 differ (shows its weakness: {'V0': True, 'V1': True}).
Control 3: V0 dry_d 1916/2000, markdown 4/10; V1 dry_d 1916/2000, markdown 4/10 differ (shows its weakness: {'V0': True, 'V1': True}).
Control 1 (reference side): dry_d 2000 cases, list `651f0a62819f8789…`; markdown 10 cases, list `644eb9708ed43e19…`.

## L4

| Set | Tree | Queries | Rank lists digest | Graph MAP | Closure MAP | Graph mean rank | Closure mean rank |
| --- | --- | --- | --- | --- | --- | --- | --- |
| verbs-subtree | H3 | 1700 | `a01ebe2cb5320788…` | 0.565231 | 0.347716 | 5.471 | 20.355 |
| verbs-subtree | H2 | 1700 | `c9ab44101008991b…` | 0.582964 | 0.350902 | 5.542 | 21.976 |
| verbs | H3 | 200 | `2915a7f385ae969a…` | 0.603713 | 0.395426 | 18.670 | 629.444 |
| verbs | H2 | 200 | `1f0e4a37f65f3002…` | 0.633630 | 0.404867 | 14.210 | 712.028 |

(b) on verbs: H3 57/200 queries with an inversion (4411 inversions, 142 float ties, first at deeper word length 14); H2 145/200 queries with an inversion (10183 inversions, 3347 float ties, first at deeper word length 11); 145 in H3 or H2: **supported**.
Control 1 (float32): 1700/1700 queries with an inversion. Control 2: shows its weakness (558/755).

## Full results

`phase2-python.json` (per-query lists included).
