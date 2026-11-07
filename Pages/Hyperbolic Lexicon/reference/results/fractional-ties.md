# Hyperbolic Lexicon: fractional-tie values for Phases 1 and 2 (Amendment 10 item 17)

**This decides nothing.** Common rules, "Ties": fractional-tie values are reported, never used to decide. L5 and L4(a) stay decided as Phases 1 and 2 recorded them, on pessimistic ties.

Run 2026-11-06 14:42:18 UTC (318.2 s, 4 workers) at 272a50debd12, with `reference/fractional_ties.py` (uncommitted then: lexicon/learned.py; their SHA-256s are in the JSON).

**Formula.** Amendment 10 item 11: each query's AP averaged over all orders inside each exact tie class, computed exactly. Walking the tie classes in key order, with lo candidates before a class and h neighbours already passed, a class of m candidates holding k >= 1 neighbours adds sum_{j=1..m} (k/m) (h + 1 + (j - 1)(k - 1)/(m - 1)) / (lo + j) ((h + 1)/(lo + 1) when m = 1); the AP is the total over the number of neighbours.

**Implementation.** lexicon.learned.fractional_ap, the shared function, called through lexicon.learned.evaluate(fractional=True). The pessimistic APs come from the same pass through rank.rank_query (rank._ap_and_ranks, unchanged), and MAPs from rank.map_exact. Instances and arms: run_claims.l5_sets, l5_arms, p2_l4_sets, p2_arm and p2_l4a, unchanged.

**Checks.** pessimistic values equal the published ones: every pessimistic value recomputed here equals the published exact rational. L5: the graph-edge and closure MAPs and mean ranks of all 39 arms (2 sets), and the S3 mean's graph-edge MAP in each set (its closure mean was never published). L4(a): 2 sets x 2 trees, both MAPs and mean ranks, with the rank-list and AP-list digests. pessimistic <= fractional: for every query of every arm and neighbour set. L4(a) equals L5: fractional and pessimistic APs equal query by query on the shared queries. learned.evaluate equals p2_l4a: pessimistic APs equal query by query. formula self-check: fractional_ap equals the brute-force mean over every tie order in every case; pessimistic <= fractional in every case.

**Draws.** Building these instances repeats Phase 1's and Phase 2's own calls of the shared generator: Rng(1000).sample(82115, 1000), the noun query sample, and Rng(2000 + i).shuffle in address.s3_words (i < 20 on the mammals, i < 5 on the nouns). A10.17 requires the data those runs used. Nothing of L6 is trained, ranked or evaluated here, and L6's instance, the mammal closure set of 1,182 nodes, is not ranked.

Values are rounded to ten decimal places; the exact rationals are in `fractional-ties.json`. "Queries that differ" counts the queries whose AP depends on the order inside a tie class.

## L5 (Phase 1, `results/claims.json`)

| Set | Arm | Graph MAP, pessimistic | Graph MAP, fractional | Difference | Queries that differ | Closure MAP, pessimistic | Closure MAP, fractional | Difference | Queries that differ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mammals (1176 queries) | H3 | 0.6906532603 | 0.7700814337 | 7.943e-02 | 488 | 0.3059315017 | 0.3311449478 | 2.521e-02 | 1051 |
| mammals (1176 queries) | H2 | 0.7187233131 | 0.7189153307 | 1.920e-04 | 28 | 0.3063311523 | 0.3063315101 | 3.578e-07 | 3 |
| mammals (1176 queries) | F3 | 0.1099206072 | 0.1820273388 | 7.211e-02 | 1152 | 0.0599519825 | 0.0838384191 | 2.389e-02 | 1175 |
| mammals (1176 queries) | F2 | 0.0421959917 | 0.0449610353 | 2.765e-03 | 875 | 0.0345781160 | 0.0353769686 | 7.989e-04 | 1109 |
| mammals (1176 queries) | F3* | 0.6419569934 | 0.6419569934 | 0.000e+00 | 0 | 0.2583362252 | 0.2583362797 | 5.458e-08 | 8 |
| mammals (1176 queries) | F2* | 0.4080578258 | 0.4080578258 | 0.000e+00 | 0 | 0.1984453593 | 0.1984453593 | 0.000e+00 | 0 |
| mammals (1176 queries) | S3#0 | 0.0172157498 | 0.0191803017 | 1.965e-03 | 199 | 0.0272591423 | 0.0283096313 | 1.050e-03 | 441 |
| mammals (1176 queries) | S3#1 | 0.0185895071 | 0.0208413857 | 2.252e-03 | 193 | 0.0298101351 | 0.0307152458 | 9.051e-04 | 413 |
| mammals (1176 queries) | S3#2 | 0.0176200002 | 0.0187243685 | 1.104e-03 | 184 | 0.0248108206 | 0.0255030938 | 6.923e-04 | 389 |
| mammals (1176 queries) | S3#3 | 0.0201538187 | 0.0224975964 | 2.344e-03 | 213 | 0.0279004735 | 0.0287975061 | 8.970e-04 | 446 |
| mammals (1176 queries) | S3#4 | 0.0147888829 | 0.0161641571 | 1.375e-03 | 190 | 0.0251966235 | 0.0260328084 | 8.362e-04 | 424 |
| mammals (1176 queries) | S3#5 | 0.0184384822 | 0.0194682304 | 1.030e-03 | 173 | 0.0296666898 | 0.0301803346 | 5.136e-04 | 447 |
| mammals (1176 queries) | S3#6 | 0.0181503991 | 0.0200635548 | 1.913e-03 | 168 | 0.0260580927 | 0.0269987243 | 9.406e-04 | 396 |
| mammals (1176 queries) | S3#7 | 0.0208895752 | 0.0232510864 | 2.362e-03 | 231 | 0.0268111294 | 0.0277329537 | 9.218e-04 | 467 |
| mammals (1176 queries) | S3#8 | 0.0175859580 | 0.0190686446 | 1.483e-03 | 208 | 0.0272104908 | 0.0279266662 | 7.162e-04 | 445 |
| mammals (1176 queries) | S3#9 | 0.0222416850 | 0.0242255664 | 1.984e-03 | 207 | 0.0294980785 | 0.0304004588 | 9.024e-04 | 412 |
| mammals (1176 queries) | S3#10 | 0.0162850822 | 0.0182242130 | 1.939e-03 | 182 | 0.0266881631 | 0.0273750759 | 6.869e-04 | 428 |
| mammals (1176 queries) | S3#11 | 0.0220012366 | 0.0228397934 | 8.386e-04 | 185 | 0.0277223420 | 0.0282827940 | 5.605e-04 | 414 |
| mammals (1176 queries) | S3#12 | 0.0152878205 | 0.0164153670 | 1.128e-03 | 200 | 0.0254626472 | 0.0259903097 | 5.277e-04 | 427 |
| mammals (1176 queries) | S3#13 | 0.0239494554 | 0.0264469900 | 2.498e-03 | 209 | 0.0293901456 | 0.0305008393 | 1.111e-03 | 435 |
| mammals (1176 queries) | S3#14 | 0.0158642273 | 0.0170399530 | 1.176e-03 | 204 | 0.0245736753 | 0.0252590706 | 6.854e-04 | 415 |
| mammals (1176 queries) | S3#15 | 0.0158203998 | 0.0171921193 | 1.372e-03 | 188 | 0.0251865990 | 0.0260949030 | 9.083e-04 | 382 |
| mammals (1176 queries) | S3#16 | 0.0188534723 | 0.0207865129 | 1.933e-03 | 191 | 0.0287763562 | 0.0297132113 | 9.369e-04 | 436 |
| mammals (1176 queries) | S3#17 | 0.0208287433 | 0.0219554915 | 1.127e-03 | 201 | 0.0278957321 | 0.0285178066 | 6.221e-04 | 426 |
| mammals (1176 queries) | S3#18 | 0.0169774797 | 0.0188969522 | 1.919e-03 | 193 | 0.0252070525 | 0.0260252340 | 8.182e-04 | 419 |
| mammals (1176 queries) | S3#19 | 0.0200735654 | 0.0218378697 | 1.764e-03 | 196 | 0.0266708847 | 0.0276248206 | 9.539e-04 | 409 |
| mammals (1176 queries) | K3 | 0.0067861056 | 0.0067864858 | 3.802e-07 | 40 | 0.0142403471 | 0.0142406317 | 2.845e-07 | 55 |
| mammals (1176 queries) | S3 (mean over permutations) | 0.0185807770 | 0.0202560077 | 1.675e-03 |  | 0.0270897637 | 0.0278990744 | 8.093e-04 |  |
| nouns (1000 queries) | H3 | 0.5679133662 | 0.6376635334 | 6.975e-02 | 400 | 0.1576909927 | 0.1712246361 | 1.353e-02 | 838 |
| nouns (1000 queries) | H2 | 0.5901354229 | 0.5903208514 | 1.854e-04 | 16 | 0.1567446092 | 0.1567454360 | 8.268e-07 | 3 |
| nouns (1000 queries) | F3 | 0.0068926815 | 0.0118049968 | 4.912e-03 | 998 | 0.0023230126 | 0.0035512071 | 1.228e-03 | 1000 |
| nouns (1000 queries) | F2 | 0.0018642045 | 0.0019229308 | 5.873e-05 | 870 | 0.0009942212 | 0.0010116543 | 1.743e-05 | 1000 |
| nouns (1000 queries) | F3* | 0.5000528710 | 0.5000528710 | 0.000e+00 | 0 | 0.1347615518 | 0.1347634208 | 1.869e-06 | 20 |
| nouns (1000 queries) | F2* | 0.3188792984 | 0.3188792984 | 0.000e+00 | 0 | 0.1074307466 | 0.1074313224 | 5.759e-07 | 1 |
| nouns (1000 queries) | S3#0 | 0.0003511278 | 0.0003541359 | 3.008e-06 | 17 | 0.0012593003 | 0.0012600498 | 7.495e-07 | 78 |
| nouns (1000 queries) | S3#1 | 0.0006040973 | 0.0008754628 | 2.714e-04 | 15 | 0.0014916662 | 0.0015606956 | 6.903e-05 | 82 |
| nouns (1000 queries) | S3#2 | 0.0003879146 | 0.0004561168 | 6.820e-05 | 13 | 0.0015016357 | 0.0015091109 | 7.475e-06 | 75 |
| nouns (1000 queries) | S3#3 | 0.0004921579 | 0.0005003438 | 8.186e-06 | 11 | 0.0013385925 | 0.0013397185 | 1.126e-06 | 65 |
| nouns (1000 queries) | S3#4 | 0.0005538859 | 0.0005564406 | 2.555e-06 | 11 | 0.0014157528 | 0.0014173451 | 1.592e-06 | 75 |
| nouns (1000 queries) | K3 | 0.0001116105 | 0.0001116914 | 8.093e-08 | 514 | 0.0003354991 | 0.0003513655 | 1.587e-05 | 1000 |
| nouns (1000 queries) | S3 (mean over permutations) | 0.0004778367 | 0.0005485000 | 7.066e-05 |  | 0.0014013895 | 0.0014173840 | 1.599e-05 |  |

The S3 row is the per-query mean over the permutations (`rank.mean_over_permutations`), as Phase 1 computed it. Phase 1 published it for the graph edge only, so its closure values have no published counterpart to check against.

## L4(a) (Phase 2, `results/claims-phase2.json`)

| Set | Arm | Graph MAP, pessimistic | Graph MAP, fractional | Difference | Queries that differ | Closure MAP, pessimistic | Closure MAP, fractional | Difference | Queries that differ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mammals (1176 queries) | H3 | 0.6906532603 | 0.7700814337 | 7.943e-02 | 488 | 0.3059315017 | 0.3311449478 | 2.521e-02 | 1051 |
| mammals (1176 queries) | H2 | 0.7187233131 | 0.7189153307 | 1.920e-04 | 28 | 0.3063311523 | 0.3063315101 | 3.578e-07 | 3 |
| nouns (200 queries) | H3 | 0.5532530358 | 0.6189175778 | 6.566e-02 | 79 | 0.1388009221 | 0.1508875184 | 1.209e-02 | 169 |
| nouns (200 queries) | H2 | 0.5722136167 | 0.5723961563 | 1.825e-04 | 2 | 0.1381163965 | 0.1381163965 | 0.000e+00 | 0 |

L4(a)'s mammal rows are the same queries, arms and neighbour sets as L5's mammal H3 and H2 rows. Its noun rows are L5's first 200 noun queries. The values are equal query by query, and this run checks that.
