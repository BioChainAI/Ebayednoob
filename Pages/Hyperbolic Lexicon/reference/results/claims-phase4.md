# Phase 4: L6 and L4(c)

PREREGISTRATION.md with Amendments 1-11. Instance `wordnet30-mammal-closure` (1182 nodes, 6542 positives, SHA-256 `c4748ce2fc8d4137846c76186c5fa02d9060597b59b8975f8fdc4ae6e476b4ca`); HEAD `515a4a1f0a76f38de93260a00716a032145a92c4`; protocol `1267ebb2dde4f4c3942bce4c833b61ac150199dc0319bb2acdfa5300ab7e34db`; settings `058e1900e778f0aedb0a4f0c683360d60343e5ca212ac56889774b419803631a` (Amendment 11); budget `1000,20,50,50,131000,327100000`.

## 1. Verdicts

| Claim | Verdict | Seeds present | Reasons |
| --- | --- | --- | --- |
| L6(a) | **supported** | d=2: 5, d=3: 5 | (a) d = 2: 5 of 5 seeds present; support (lo > 0 in all 5 seeds): True; refutation (mean <= 0 in >= 3 seeds present): False (0 seeds); (a) d = 3: 5 of 5 seeds present; support (lo > 0 in all 5 seeds): True; refutation (mean <= 0 in >= 3 seeds present): False (0 seeds) |
| L6(b) | **supported** | 5 | (b): 5 of 5 seeds present; support (-0.02 <= lo and hi <= 0.02, or hi < 0 in all 5 seeds): True; refutation (lo > 0.02 in >= 3 seeds present): False (0 seeds) |
| L6(c) | **supported** | 5 | (c): 5 of 5 seeds present; support (lo >= -0.01 in all 5 seeds): True; refutation (mean < -0.05 in >= 3 seeds present): False (0 seeds) |
| L6(d) | **supported** | 5 | (d): 5 of 5 seeds present; support (lo > 0 in all 5 seeds): True; refutation (mean <= 0 in >= 3 seeds present): False (0 seeds) |
| L4(c) | **supported** | 40 of 40 tables | 40 of 40 tables present; largest |dMAP| 1127577918540017103013994810911306833157/120337776589645743916712574720566482455268800; 0 above 1/1000, 0 above 1/100 |

L6 void: no.

## 2. Controls

- **Control 1 (label shuffle, P = Rng(7))**: 316 tables evaluated, largest relabelled closure MAP 0.018803 (must be <= 1/20 each): **holds**. Sources: cache 316.
- **Control 2 (edge-shuffled training)**: lorentz/2/0: holds, lorentz/2/1: holds, lorentz/2/2: holds, lorentz/2/3: holds, lorentz/2/4: holds, lorentz/3/0: holds, lorentz/3/1: holds, lorentz/3/2: holds, lorentz/3/3: holds, lorentz/3/4: holds, lorentz/5/0: holds, lorentz/5/1: holds, lorentz/5/2: holds, lorentz/5/3: holds, lorentz/5/4: holds, lorentz/10/0: holds, lorentz/10/1: holds, lorentz/10/2: holds, lorentz/10/3: holds, lorentz/10/4: holds, lorentz/50/0: holds, lorentz/50/1: holds, lorentz/50/2: holds, lorentz/50/3: holds, lorentz/50/4: holds, euclid/2/0: holds, euclid/2/1: holds, euclid/2/2: holds, euclid/2/3: holds, euclid/2/4: holds, euclid/3/0: holds, euclid/3/1: holds, euclid/3/2: holds, euclid/3/3: holds, euclid/3/4: holds, euclid/5/0: holds, euclid/5/1: holds, euclid/5/2: holds, euclid/5/3: holds, euclid/5/4: holds, euclid/10/0: holds, euclid/10/1: holds, euclid/10/2: holds, euclid/10/3: holds, euclid/10/4: holds, euclid/50/0: holds, euclid/50/1: holds, euclid/50/2: holds, euclid/50/3: holds, euclid/50/4: holds.
- **Control 3 (floors)**: random-ranking expectation closure 0.014957, graph-edge 0.007320; floor MAPs in section 7.

## 3. Tuning

tuning.json `9290c01e4161b814357d2a34fcac1032ff4fc877893848f74865c251c5aca4e9` (HEAD `a780bb59ad405cf8d9a0694fc0b139f9c83ace13`).

| Cell | Rate |
| --- | --- |
| lorentz-2 | 1 |
| lorentz-3 | 1 |
| lorentz-5 | 1 |
| lorentz-10 | 1 |
| lorentz-50 | 1 |
| euclid-2 | 0.1 |
| euclid-3 | 0.1 |
| euclid-5 | 0.1 |
| euclid-10 | 1 |
| euclid-50 | 3 |

Diverged tuning runs: lorentz-2 lr 10 seed 9020, lorentz-2 lr 10 seed 9021, lorentz-2 lr 10 seed 9022, lorentz-2 lr 10 seed 9023, euclid-2 lr 10 seed 9020, euclid-2 lr 10 seed 9021, euclid-2 lr 10 seed 9022, euclid-2 lr 10 seed 9023, euclid-3 lr 10 seed 9020, euclid-3 lr 10 seed 9021, euclid-3 lr 10 seed 9022, euclid-3 lr 10 seed 9023, euclid-5 lr 10 seed 9020, euclid-5 lr 10 seed 9021, euclid-5 lr 10 seed 9022, euclid-5 lr 10 seed 9023, euclid-10 lr 10 seed 9020, euclid-10 lr 10 seed 9021, euclid-10 lr 10 seed 9022, euclid-10 lr 10 seed 9023, euclid-50 lr 10 seed 9020, euclid-50 lr 10 seed 9021, euclid-50 lr 10 seed 9022, euclid-50 lr 10 seed 9023.

## 4. Measured MAPs (exact, snapped to 2^-32)

| Cell | seed 0 closure / graph-edge | seed 1 closure / graph-edge | seed 2 closure / graph-edge | seed 3 closure / graph-edge | seed 4 closure / graph-edge |
| --- | --- | --- | --- | --- | --- |
| lorentz 2 | 0.889203 / 0.435848 | 0.909782 / 0.450571 | 0.876359 / 0.432120 | 0.883042 / 0.434068 | 0.897142 / 0.448395 |
| lorentz 3 | 0.964599 / 0.476903 | 0.949911 / 0.458278 | 0.965984 / 0.471298 | 0.968414 / 0.467310 | 0.970952 / 0.458420 |
| lorentz 5 | 0.967929 / 0.462000 | 0.969022 / 0.451724 | 0.970575 / 0.450984 | 0.966848 / 0.457642 | 0.969538 / 0.452347 |
| lorentz 10 | 0.969244 / 0.444941 | 0.968758 / 0.447645 | 0.969979 / 0.456548 | 0.967838 / 0.454509 | 0.969053 / 0.454316 |
| lorentz 50 | 0.968313 / 0.449858 | 0.967344 / 0.447834 | 0.967176 / 0.459265 | 0.968667 / 0.452467 | 0.967982 / 0.445952 |
| euclid 2 | 0.171146 / 0.223374 | 0.157408 / 0.196009 | 0.159110 / 0.201609 | 0.167149 / 0.220003 | 0.172927 / 0.253720 |
| euclid 3 | 0.220680 / 0.349004 | 0.221554 / 0.347448 | 0.220769 / 0.352691 | 0.225976 / 0.368912 | 0.218669 / 0.335260 |
| euclid 5 | 0.291163 / 0.543375 | 0.291355 / 0.550406 | 0.290672 / 0.540049 | 0.292539 / 0.545717 | 0.292858 / 0.543713 |
| euclid 10 | 0.497401 / 0.670047 | 0.494134 / 0.666836 | 0.497055 / 0.667948 | 0.499476 / 0.680384 | 0.494946 / 0.654565 |
| euclid 50 | 0.999977 / 0.850050 | 0.999975 / 0.851543 | 0.999971 / 0.850407 | 0.999974 / 0.853607 | 0.999975 / 0.851156 |

Exact arm (H3): closure 0.305408, graph-edge 0.690653.

## 5. Deciding intervals (mean [lo, hi], per seed)

| Comparison | seed 0 | seed 1 | seed 2 | seed 3 | seed 4 |
| --- | --- | --- | --- | --- | --- |
| (a) closure, Lorentz 2 - Euclidean 2 | +0.7181 [+0.7013, +0.7347] | +0.7524 [+0.7363, +0.7682] | +0.7172 [+0.7010, +0.7335] | +0.7159 [+0.6990, +0.7325] | +0.7242 [+0.7080, +0.7401] |
| (a) closure, Lorentz 3 - Euclidean 3 | +0.7439 [+0.7270, +0.7601] | +0.7284 [+0.7112, +0.7448] | +0.7452 [+0.7284, +0.7617] | +0.7424 [+0.7259, +0.7587] | +0.7523 [+0.7354, +0.7684] |
| (b) closure, Lorentz 50 - Euclidean 50 | -0.0317 [-0.0365, -0.0270] | -0.0326 [-0.0375, -0.0280] | -0.0328 [-0.0377, -0.0281] | -0.0313 [-0.0361, -0.0268] | -0.0320 [-0.0369, -0.0273] |
| (c) graph-edge, exact - Lorentz 3 | +0.2138 [+0.1916, +0.2359] | +0.2324 [+0.2110, +0.2541] | +0.2194 [+0.1972, +0.2415] | +0.2233 [+0.2022, +0.2450] | +0.2322 [+0.2110, +0.2529] |
| (d) closure, Lorentz 3 - exact | +0.6592 [+0.6451, +0.6727] | +0.6445 [+0.6301, +0.6584] | +0.6606 [+0.6462, +0.6743] | +0.6630 [+0.6490, +0.6763] | +0.6655 [+0.6515, +0.6790] |

## 6. L4(c)

Largest |dMAP| over the 40 tables: 9.370e-06; largest displacement 1.565e-03 (all tables: 1.565e-03).

| Table | closure |dMAP| | graph-edge |dMAP| | coarse 2^-8 closure / graph-edge | displacement | exact / float ties |
| --- | --- | --- | --- | --- | --- |
| learned-lorentz-d2-s0 | 4.008e-06 | 3.730e-06 | 5.936e-01 / 7.433e-02 | 1.234e-03 | 0 / 0 |
| learned-lorentz-d2-s1 | 9.370e-06 | 5.548e-06 | 6.004e-01 / 7.759e-02 | 1.565e-03 | 0 / 0 |
| learned-lorentz-d2-s2 | 6.267e-08 | 3.256e-08 | 5.802e-01 / 8.464e-02 | 8.558e-04 | 0 / 0 |
| learned-lorentz-d2-s3 | 7.211e-09 | 6.161e-09 | 5.830e-01 / 7.393e-02 | 5.567e-04 | 0 / 0 |
| learned-lorentz-d2-s4 | 8.601e-08 | 1.569e-08 | 5.892e-01 / 8.150e-02 | 6.097e-04 | 0 / 0 |
| learned-lorentz-d3-s0 | 0.000e+00 | 0.000e+00 | 3.978e-01 / 3.898e-02 | 3.394e-05 | 0 / 0 |
| learned-lorentz-d3-s1 | 7.639e-10 | 0.000e+00 | 4.026e-01 / 2.727e-02 | 3.303e-05 | 0 / 0 |
| learned-lorentz-d3-s2 | 0.000e+00 | 0.000e+00 | 4.076e-01 / 3.033e-02 | 8.865e-05 | 0 / 0 |
| learned-lorentz-d3-s3 | 0.000e+00 | 1.734e-07 | 4.026e-01 / 2.579e-02 | 3.906e-05 | 0 / 0 |
| learned-lorentz-d3-s4 | 1.982e-09 | 0.000e+00 | 4.168e-01 / 3.822e-02 | 3.371e-05 | 0 / 0 |
| learned-euclid-d2-s0 | 0.000e+00 | 0.000e+00 | 1.316e-03 / 4.115e-03 | 1.623e-10 | 0 / 0 |
| learned-euclid-d2-s1 | 0.000e+00 | 0.000e+00 | 2.629e-03 / 6.813e-03 | 1.598e-10 | 0 / 0 |
| learned-euclid-d2-s2 | 0.000e+00 | 0.000e+00 | 2.415e-03 / 6.428e-03 | 1.615e-10 | 0 / 0 |
| learned-euclid-d2-s3 | 0.000e+00 | 0.000e+00 | 1.509e-03 / 4.511e-03 | 1.617e-10 | 0 / 0 |
| learned-euclid-d2-s4 | 0.000e+00 | 0.000e+00 | 1.788e-03 / 5.928e-03 | 1.639e-10 | 0 / 0 |
| learned-euclid-d3-s0 | 0.000e+00 | 0.000e+00 | 1.688e-04 / 1.283e-03 | 1.913e-10 | 0 / 0 |
| learned-euclid-d3-s1 | 0.000e+00 | 0.000e+00 | 2.277e-05 / 2.674e-04 | 1.965e-10 | 0 / 0 |
| learned-euclid-d3-s2 | 0.000e+00 | 0.000e+00 | 4.200e-04 / 2.185e-03 | 1.927e-10 | 0 / 0 |
| learned-euclid-d3-s3 | 0.000e+00 | 0.000e+00 | 1.222e-03 / 3.965e-03 | 1.961e-10 | 0 / 0 |
| learned-euclid-d3-s4 | 0.000e+00 | 0.000e+00 | 3.369e-04 / 1.386e-03 | 1.963e-10 | 0 / 0 |
| edge-shuffled-lorentz-d2-s0 | 0.000e+00 | 0.000e+00 | 8.971e-05 / 1.748e-05 | 5.846e-08 | 0 / 0 |
| edge-shuffled-lorentz-d2-s1 | 0.000e+00 | 0.000e+00 | 1.316e-04 / 6.280e-05 | 7.389e-08 | 0 / 0 |
| edge-shuffled-lorentz-d2-s2 | 0.000e+00 | 0.000e+00 | 3.461e-04 / 7.952e-05 | 4.853e-08 | 0 / 0 |
| edge-shuffled-lorentz-d2-s3 | 0.000e+00 | 0.000e+00 | 5.498e-05 / 2.915e-06 | 5.121e-08 | 0 / 0 |
| edge-shuffled-lorentz-d2-s4 | 0.000e+00 | 0.000e+00 | 2.771e-05 / 4.182e-04 | 7.490e-08 | 0 / 0 |
| edge-shuffled-lorentz-d3-s0 | 0.000e+00 | 0.000e+00 | 1.064e-04 / 1.251e-05 | 1.635e-07 | 0 / 0 |
| edge-shuffled-lorentz-d3-s1 | 0.000e+00 | 0.000e+00 | 3.140e-05 / 9.623e-06 | 1.707e-07 | 0 / 0 |
| edge-shuffled-lorentz-d3-s2 | 0.000e+00 | 0.000e+00 | 2.478e-05 / 1.595e-05 | 1.028e-07 | 0 / 0 |
| edge-shuffled-lorentz-d3-s3 | 0.000e+00 | 0.000e+00 | 1.334e-04 / 6.098e-05 | 1.856e-07 | 0 / 0 |
| edge-shuffled-lorentz-d3-s4 | 0.000e+00 | 0.000e+00 | 1.133e-04 / 4.069e-05 | 1.776e-07 | 0 / 0 |
| edge-shuffled-euclid-d2-s0 | 0.000e+00 | 0.000e+00 | 1.421e-05 / 5.469e-05 | 1.607e-10 | 0 / 0 |
| edge-shuffled-euclid-d2-s1 | 0.000e+00 | 0.000e+00 | 1.179e-04 / 4.706e-04 | 1.625e-10 | 0 / 0 |
| edge-shuffled-euclid-d2-s2 | 0.000e+00 | 0.000e+00 | 4.570e-05 / 6.921e-05 | 1.630e-10 | 0 / 0 |
| edge-shuffled-euclid-d2-s3 | 0.000e+00 | 0.000e+00 | 5.893e-05 / 9.852e-06 | 1.618e-10 | 0 / 0 |
| edge-shuffled-euclid-d2-s4 | 0.000e+00 | 0.000e+00 | 8.252e-05 / 1.279e-05 | 1.603e-10 | 0 / 0 |
| edge-shuffled-euclid-d3-s0 | 0.000e+00 | 0.000e+00 | 2.128e-06 / 3.295e-06 | 1.929e-10 | 0 / 0 |
| edge-shuffled-euclid-d3-s1 | 0.000e+00 | 0.000e+00 | 3.038e-06 / 2.441e-06 | 1.908e-10 | 0 / 0 |
| edge-shuffled-euclid-d3-s2 | 0.000e+00 | 0.000e+00 | 5.303e-06 / 2.853e-06 | 1.963e-10 | 0 / 0 |
| edge-shuffled-euclid-d3-s3 | 0.000e+00 | 0.000e+00 | 5.339e-05 / 1.041e-05 | 1.994e-10 | 0 / 0 |
| edge-shuffled-euclid-d3-s4 | 0.000e+00 | 0.000e+00 | 8.422e-05 / 1.212e-05 | 1.914e-10 | 0 / 0 |

Other tables (reported): learned-lorentz-d5-s0 0.000e+00/0.000e+00; learned-lorentz-d5-s1 7.819e-09/0.000e+00; learned-lorentz-d5-s2 1.770e-08/0.000e+00; learned-lorentz-d5-s3 0.000e+00/0.000e+00; learned-lorentz-d5-s4 2.379e-08/0.000e+00; learned-lorentz-d10-s0 1.425e-08/0.000e+00; learned-lorentz-d10-s1 0.000e+00/0.000e+00; learned-lorentz-d10-s2 0.000e+00/0.000e+00; learned-lorentz-d10-s3 0.000e+00/0.000e+00; learned-lorentz-d10-s4 1.109e-09/0.000e+00; learned-lorentz-d50-s0 0.000e+00/0.000e+00; learned-lorentz-d50-s1 0.000e+00/0.000e+00; learned-lorentz-d50-s2 0.000e+00/0.000e+00; learned-lorentz-d50-s3 1.451e-08/0.000e+00; learned-lorentz-d50-s4 3.848e-09/0.000e+00; learned-euclid-d5-s0 0.000e+00/0.000e+00; learned-euclid-d5-s1 0.000e+00/0.000e+00; learned-euclid-d5-s2 0.000e+00/0.000e+00; learned-euclid-d5-s3 0.000e+00/0.000e+00; learned-euclid-d5-s4 0.000e+00/0.000e+00; learned-euclid-d10-s0 0.000e+00/0.000e+00; learned-euclid-d10-s1 0.000e+00/0.000e+00; learned-euclid-d10-s2 0.000e+00/0.000e+00; learned-euclid-d10-s3 0.000e+00/0.000e+00; learned-euclid-d10-s4 0.000e+00/0.000e+00; learned-euclid-d50-s0 0.000e+00/0.000e+00; learned-euclid-d50-s1 0.000e+00/0.000e+00; learned-euclid-d50-s2 0.000e+00/0.000e+00; learned-euclid-d50-s3 0.000e+00/0.000e+00; learned-euclid-d50-s4 0.000e+00/0.000e+00; edge-shuffled-lorentz-d5-s0 0.000e+00/0.000e+00; edge-shuffled-lorentz-d5-s1 0.000e+00/0.000e+00; edge-shuffled-lorentz-d5-s2 0.000e+00/0.000e+00; edge-shuffled-lorentz-d5-s3 0.000e+00/0.000e+00; edge-shuffled-lorentz-d5-s4 0.000e+00/0.000e+00; edge-shuffled-lorentz-d10-s0 0.000e+00/0.000e+00; edge-shuffled-lorentz-d10-s1 0.000e+00/0.000e+00; edge-shuffled-lorentz-d10-s2 0.000e+00/0.000e+00; edge-shuffled-lorentz-d10-s3 0.000e+00/0.000e+00; edge-shuffled-lorentz-d10-s4 0.000e+00/0.000e+00; edge-shuffled-lorentz-d50-s0 0.000e+00/0.000e+00; edge-shuffled-lorentz-d50-s1 0.000e+00/0.000e+00; edge-shuffled-lorentz-d50-s2 0.000e+00/0.000e+00; edge-shuffled-lorentz-d50-s3 0.000e+00/0.000e+00; edge-shuffled-lorentz-d50-s4 0.000e+00/0.000e+00; edge-shuffled-euclid-d5-s0 0.000e+00/0.000e+00; edge-shuffled-euclid-d5-s1 0.000e+00/0.000e+00; edge-shuffled-euclid-d5-s2 0.000e+00/0.000e+00; edge-shuffled-euclid-d5-s3 0.000e+00/0.000e+00; edge-shuffled-euclid-d5-s4 0.000e+00/0.000e+00; edge-shuffled-euclid-d10-s0 0.000e+00/0.000e+00; edge-shuffled-euclid-d10-s1 0.000e+00/0.000e+00; edge-shuffled-euclid-d10-s2 0.000e+00/0.000e+00; edge-shuffled-euclid-d10-s3 0.000e+00/0.000e+00; edge-shuffled-euclid-d10-s4 0.000e+00/0.000e+00; edge-shuffled-euclid-d50-s0 0.000e+00/0.000e+00; edge-shuffled-euclid-d50-s1 0.000e+00/0.000e+00; edge-shuffled-euclid-d50-s2 0.000e+00/0.000e+00; edge-shuffled-euclid-d50-s3 0.000e+00/0.000e+00; edge-shuffled-euclid-d50-s4 0.000e+00/0.000e+00; floor-lorentz-d2-i0 0.000e+00/0.000e+00; floor-lorentz-d2-i1 7.681e-10/0.000e+00; floor-lorentz-d2-i2 1.684e-10/0.000e+00; floor-lorentz-d2-i3 0.000e+00/0.000e+00; floor-lorentz-d2-i4 1.287e-09/6.834e-10; floor-lorentz-d3-i0 2.512e-09/4.209e-09; floor-lorentz-d3-i1 1.522e-09/0.000e+00; floor-lorentz-d3-i2 2.300e-09/0.000e+00; floor-lorentz-d3-i3 1.109e-09/1.518e-09; floor-lorentz-d3-i4 0.000e+00/0.000e+00; floor-lorentz-d5-i0 1.763e-09/0.000e+00; floor-lorentz-d5-i1 6.381e-09/0.000e+00; floor-lorentz-d5-i2 7.916e-10/2.686e-09; floor-lorentz-d5-i3 0.000e+00/0.000e+00; floor-lorentz-d5-i4 0.000e+00/0.000e+00; floor-lorentz-d10-i0 3.352e-09/0.000e+00; floor-lorentz-d10-i1 1.565e-10/2.648e-10; floor-lorentz-d10-i2 8.352e-10/0.000e+00; floor-lorentz-d10-i3 0.000e+00/0.000e+00; floor-lorentz-d10-i4 1.450e-09/7.476e-10; floor-lorentz-d50-i0 0.000e+00/0.000e+00; floor-lorentz-d50-i1 0.000e+00/0.000e+00; floor-lorentz-d50-i2 2.418e-09/1.836e-09; floor-lorentz-d50-i3 2.934e-09/6.104e-09; floor-lorentz-d50-i4 0.000e+00/0.000e+00; floor-euclid-d2-i0 0.000e+00/0.000e+00; floor-euclid-d2-i1 0.000e+00/0.000e+00; floor-euclid-d2-i2 9.690e-10/0.000e+00; floor-euclid-d2-i3 0.000e+00/0.000e+00; floor-euclid-d2-i4 6.799e-10/6.834e-10; floor-euclid-d3-i0 1.139e-09/0.000e+00; floor-euclid-d3-i1 0.000e+00/0.000e+00; floor-euclid-d3-i2 1.537e-09/1.932e-09; floor-euclid-d3-i3 1.378e-09/0.000e+00; floor-euclid-d3-i4 0.000e+00/0.000e+00; floor-euclid-d5-i0 1.501e-09/0.000e+00; floor-euclid-d5-i1 0.000e+00/0.000e+00; floor-euclid-d5-i2 2.895e-09/3.637e-09; floor-euclid-d5-i3 0.000e+00/0.000e+00; floor-euclid-d5-i4 1.238e-09/0.000e+00; floor-euclid-d10-i0 3.352e-09/0.000e+00; floor-euclid-d10-i1 0.000e+00/0.000e+00; floor-euclid-d10-i2 1.171e-09/0.000e+00; floor-euclid-d10-i3 6.270e-10/3.151e-09; floor-euclid-d10-i4 0.000e+00/0.000e+00; floor-euclid-d50-i0 1.874e-08/0.000e+00; floor-euclid-d50-i1 8.072e-10/0.000e+00; floor-euclid-d50-i2 0.000e+00/0.000e+00; floor-euclid-d50-i3 4.031e-09/0.000e+00; floor-euclid-d50-i4 0.000e+00/0.000e+00.

## 7. Reported

- Prediction (a)'s gap (mean over seeds present): d=2 0.725557, d=3 0.742442; holds: True.
- Exact arm: fractional-tie MAP closure 0.330472, graph-edge 0.770081; mean rank closure 68.127408, graph-edge 2.909362; bits 643.285110 mean, 811 max; distortion 0.182644.
- geoopt: not run (torch, geoopt not installed. A10.11: on 2026-11-06 the proxy refused download.pytorch.org, and PyPI's Linux wheel pulls more than 1 GB of CUDA wheels; the tests carry torch-free checks in its place (a 60-digit decimal recomputation of one step and finite-difference gradients)).

| Run | closure | graph-edge | fractional closure / graph-edge | mean rank closure / graph-edge | distortion | bits mean / max | train s |
| --- | --- | --- | --- | --- | --- | --- | --- |
| edge-shuffled-lorentz-d2-lr1-s0 | 0.013197 | 0.006828 | 0.013197 / 0.006828 | 523.792036 / 593.636596 | - | 252.008460 / 258 | 45.7 |
| edge-shuffled-lorentz-d2-lr1-s1 | 0.013969 | 0.007630 | 0.013969 / 0.007630 | 490.543794 / 591.846809 | - | 251.626904 / 258 | 45.0 |
| edge-shuffled-lorentz-d2-lr1-s2 | 0.014969 | 0.009100 | 0.014969 / 0.009100 | 503.102568 / 598.426809 | - | 251.699662 / 258 | 44.9 |
| edge-shuffled-lorentz-d2-lr1-s3 | 0.013617 | 0.006674 | 0.013617 / 0.006674 | 511.262611 / 596.745106 | - | 251.971235 / 258 | 44.6 |
| edge-shuffled-lorentz-d2-lr1-s4 | 0.014713 | 0.008027 | 0.014713 / 0.008027 | 486.138948 / 586.962979 | - | 251.844332 / 258 | 45.4 |
| edge-shuffled-lorentz-d3-lr1-s0 | 0.013826 | 0.009047 | 0.013826 / 0.009047 | 508.533017 / 584.675319 | - | 314.752961 / 322 | 49.9 |
| edge-shuffled-lorentz-d3-lr1-s1 | 0.015448 | 0.006408 | 0.015448 / 0.006408 | 452.231504 / 601.713191 | - | 314.822335 / 322 | 50.5 |
| edge-shuffled-lorentz-d3-lr1-s2 | 0.013687 | 0.007583 | 0.013687 / 0.007583 | 501.461098 / 592.161277 | - | 314.905245 / 322 | 51.4 |
| edge-shuffled-lorentz-d3-lr1-s3 | 0.014513 | 0.006377 | 0.014513 / 0.006377 | 476.801284 / 594.254043 | - | 314.506768 / 322 | 51.3 |
| edge-shuffled-lorentz-d3-lr1-s4 | 0.014623 | 0.008155 | 0.014623 / 0.008155 | 467.915316 / 568.032340 | - | 314.604907 / 322 | 49.7 |
| edge-shuffled-lorentz-d5-lr1-s0 | 0.013890 | 0.007970 | 0.013890 / 0.007970 | 508.425634 / 583.495319 | - | 436.646362 / 448 | 63.4 |
| edge-shuffled-lorentz-d5-lr1-s1 | 0.014839 | 0.006976 | 0.014839 / 0.006976 | 456.350199 / 597.036596 | - | 436.041455 / 447 | 65.3 |
| edge-shuffled-lorentz-d5-lr1-s2 | 0.013549 | 0.008648 | 0.013549 / 0.008648 | 501.948945 / 598.414468 | - | 436.576142 / 448 | 65.5 |
| edge-shuffled-lorentz-d5-lr1-s3 | 0.014487 | 0.005821 | 0.014487 / 0.005821 | 480.962320 / 590.120851 | - | 436.645516 / 447 | 63.8 |
| edge-shuffled-lorentz-d5-lr1-s4 | 0.015027 | 0.007873 | 0.015027 / 0.007873 | 468.381000 / 578.588936 | - | 436.637902 / 447 | 64.3 |
| edge-shuffled-lorentz-d10-lr1-s0 | 0.013707 | 0.008857 | 0.013707 / 0.008857 | 504.616402 / 580.617021 | - | 742.354484 / 763 | 96.1 |
| edge-shuffled-lorentz-d10-lr1-s1 | 0.015778 | 0.007638 | 0.015778 / 0.007638 | 445.012458 / 591.873617 | - | 743.065144 / 763 | 97.2 |
| edge-shuffled-lorentz-d10-lr1-s2 | 0.012930 | 0.004925 | 0.012930 / 0.004925 | 508.956435 / 608.402553 | - | 742.826565 / 762 | 98.2 |
| edge-shuffled-lorentz-d10-lr1-s3 | 0.016057 | 0.006182 | 0.016057 / 0.006182 | 479.482651 / 599.654468 | - | 742.384941 / 762 | 97.4 |
| edge-shuffled-lorentz-d10-lr1-s4 | 0.015318 | 0.008368 | 0.015318 / 0.008368 | 454.833537 / 571.714468 | - | 742.606599 / 763 | 95.4 |
| edge-shuffled-lorentz-d50-lr1-s0 | 0.013381 | 0.009160 | 0.013381 / 0.009160 | 511.824060 / 577.745532 | - | 3160.010152 / 3236 | 347.9 |
| edge-shuffled-lorentz-d50-lr1-s1 | 0.015363 | 0.007927 | 0.015363 / 0.007927 | 445.618083 / 597.849362 | - | 3165.061760 / 3236 | 344.2 |
| edge-shuffled-lorentz-d50-lr1-s2 | 0.012997 | 0.007303 | 0.012997 / 0.007303 | 503.628630 / 604.237872 | - | 3157.266497 / 3234 | 347.0 |
| edge-shuffled-lorentz-d50-lr1-s3 | 0.015448 | 0.006698 | 0.015448 / 0.006698 | 480.340721 / 588.029787 | - | 3163.765651 / 3235 | 348.8 |
| edge-shuffled-lorentz-d50-lr1-s4 | 0.014502 | 0.009263 | 0.014502 / 0.009263 | 450.106313 / 570.026383 | - | 3160.742809 / 3239 | 349.8 |
| edge-shuffled-euclid-d2-lr0.1-s0 | 0.015860 | 0.009462 | 0.015860 / 0.009462 | 444.825436 / 578.348936 | - | 94.010998 / 99 | 30.2 |
| edge-shuffled-euclid-d2-lr0.1-s1 | 0.014804 | 0.007877 | 0.014804 / 0.007877 | 457.341868 / 601.568936 | - | 93.995770 / 101 | 30.1 |
| edge-shuffled-euclid-d2-lr0.1-s2 | 0.015446 | 0.008007 | 0.015446 / 0.008007 | 468.210639 / 586.992340 | - | 94.021997 / 100 | 30.6 |
| edge-shuffled-euclid-d2-lr0.1-s3 | 0.015691 | 0.009760 | 0.015691 / 0.009760 | 471.680220 / 595.049362 | - | 94.169205 / 99 | 30.1 |
| edge-shuffled-euclid-d2-lr0.1-s4 | 0.015008 | 0.006834 | 0.015008 / 0.006834 | 468.583919 / 593.606383 | - | 93.945854 / 100 | 30.2 |
| edge-shuffled-euclid-d3-lr0.1-s0 | 0.014370 | 0.008560 | 0.014370 / 0.008560 | 507.101498 / 585.583830 | - | 125.547377 / 132 | 34.0 |
| edge-shuffled-euclid-d3-lr0.1-s1 | 0.014602 | 0.005808 | 0.014602 / 0.005808 | 443.778432 / 586.440000 | - | 125.456007 / 133 | 34.9 |
| edge-shuffled-euclid-d3-lr0.1-s2 | 0.013669 | 0.005922 | 0.013669 / 0.005922 | 493.322531 / 583.047660 | - | 125.378173 / 132 | 35.2 |
| edge-shuffled-euclid-d3-lr0.1-s3 | 0.015274 | 0.007012 | 0.015274 / 0.007012 | 475.871064 / 581.194043 | - | 125.539763 / 132 | 34.4 |
| edge-shuffled-euclid-d3-lr0.1-s4 | 0.015434 | 0.007189 | 0.015434 / 0.007189 | 466.156451 / 588.866383 | - | 125.400169 / 133 | 34.2 |
| edge-shuffled-euclid-d5-lr0.1-s0 | 0.014284 | 0.007653 | 0.014284 / 0.007653 | 489.467441 / 589.601277 | - | 187.755499 / 196 | 45.5 |
| edge-shuffled-euclid-d5-lr0.1-s1 | 0.015132 | 0.007085 | 0.015132 / 0.007085 | 462.277515 / 601.115319 | - | 187.797800 / 197 | 45.2 |
| edge-shuffled-euclid-d5-lr0.1-s2 | 0.013825 | 0.006365 | 0.013825 / 0.006365 | 487.669826 / 599.308936 | - | 187.846024 / 197 | 44.6 |
| edge-shuffled-euclid-d5-lr0.1-s3 | 0.014476 | 0.008606 | 0.014476 / 0.008606 | 476.512305 / 586.107234 | - | 187.835025 / 197 | 44.9 |
| edge-shuffled-euclid-d5-lr0.1-s4 | 0.014540 | 0.007109 | 0.014540 / 0.007109 | 462.989453 / 584.654468 | - | 187.926396 / 196 | 44.9 |
| edge-shuffled-euclid-d10-lr1-s0 | 0.014622 | 0.008745 | 0.014622 / 0.008745 | 487.665087 / 580.581702 | - | 343.649746 / 357 | 68.3 |
| edge-shuffled-euclid-d10-lr1-s1 | 0.015746 | 0.007510 | 0.015746 / 0.007510 | 460.455595 / 606.168511 | - | 343.651438 / 365 | 70.0 |
| edge-shuffled-euclid-d10-lr1-s2 | 0.014786 | 0.007559 | 0.014786 / 0.007559 | 481.711480 / 596.669787 | - | 343.670051 / 366 | 69.2 |
| edge-shuffled-euclid-d10-lr1-s3 | 0.015648 | 0.006478 | 0.015648 / 0.006478 | 465.039896 / 585.530213 | - | 343.156514 / 359 | 70.2 |
| edge-shuffled-euclid-d10-lr1-s4 | 0.014260 | 0.006214 | 0.014260 / 0.006214 | 467.279196 / 592.482128 | - | 343.489848 / 368 | 67.4 |
| edge-shuffled-euclid-d50-lr3-s0 | 0.014487 | 0.007308 | 0.014487 / 0.007308 | 471.549144 / 577.616170 | - | 1583.563452 / 1611 | 267.7 |
| edge-shuffled-euclid-d50-lr3-s1 | 0.015094 | 0.006067 | 0.015094 / 0.006067 | 458.689697 / 593.337021 | - | 1583.852792 / 1612 | 267.2 |
| edge-shuffled-euclid-d50-lr3-s2 | 0.014021 | 0.007034 | 0.014021 / 0.007034 | 484.262382 / 594.594894 | - | 1584.086294 / 1609 | 270.9 |
| edge-shuffled-euclid-d50-lr3-s3 | 0.014630 | 0.006078 | 0.014630 / 0.006078 | 467.628860 / 592.620000 | - | 1583.774112 / 1612 | 272.5 |
| edge-shuffled-euclid-d50-lr3-s4 | 0.015737 | 0.008295 | 0.015737 / 0.008295 | 470.814048 / 591.722979 | - | 1584.079526 / 1607 | 268.1 |
| floor-lorentz-d2-i0 | 0.014806 | 0.006336 | - / - | 444.134898 / 577.064255 | - | 230.952623 / 238 | - |
| floor-lorentz-d2-i1 | 0.014533 | 0.007115 | - / - | 475.579104 / 585.615745 | - | 231.405245 / 238 | - |
| floor-lorentz-d2-i2 | 0.014682 | 0.006135 | - / - | 488.687022 / 598.036596 | - | 230.912014 / 238 | - |
| floor-lorentz-d2-i3 | 0.015257 | 0.008578 | - / - | 456.980205 / 578.817872 | - | 230.958545 / 238 | - |
| floor-lorentz-d2-i4 | 0.015201 | 0.008730 | - / - | 462.392770 / 575.737872 | - | 231.480541 / 238 | - |
| floor-lorentz-d3-i0 | 0.015247 | 0.007667 | - / - | 454.953302 / 581.685957 | - | 284.310491 / 292 | - |
| floor-lorentz-d3-i1 | 0.015013 | 0.007260 | - / - | 453.518419 / 573.629787 | - | 284.724196 / 292 | - |
| floor-lorentz-d3-i2 | 0.015438 | 0.007637 | - / - | 445.407673 / 575.541277 | - | 284.497462 / 293 | - |
| floor-lorentz-d3-i3 | 0.015089 | 0.007728 | - / - | 475.868236 / 598.227660 | - | 284.319797 / 292 | - |
| floor-lorentz-d3-i4 | 0.015288 | 0.007850 | - / - | 465.467670 / 604.411064 | - | 284.825719 / 292 | - |
| floor-lorentz-d5-i0 | 0.014513 | 0.005310 | - / - | 462.747401 / 579.195745 | - | 388.131980 / 400 | - |
| floor-lorentz-d5-i1 | 0.014783 | 0.008403 | - / - | 476.318939 / 602.284681 | - | 388.034687 / 400 | - |
| floor-lorentz-d5-i2 | 0.015859 | 0.006755 | - / - | 427.030266 / 593.454043 | - | 388.060068 / 400 | - |
| floor-lorentz-d5-i3 | 0.014634 | 0.008197 | - / - | 471.439468 / 585.174468 | - | 387.743655 / 400 | - |
| floor-lorentz-d5-i4 | 0.014879 | 0.006643 | - / - | 480.129395 / 586.866809 | - | 388.150592 / 400 | - |
| floor-lorentz-d10-i0 | 0.015344 | 0.008814 | - / - | 455.553195 / 574.454468 | - | 647.417936 / 670 | - |
| floor-lorentz-d10-i1 | 0.015068 | 0.008025 | - / - | 452.860058 / 587.520000 | - | 648.366328 / 670 | - |
| floor-lorentz-d10-i2 | 0.015898 | 0.006106 | - / - | 453.773846 / 582.596170 | - | 648.425550 / 671 | - |
| floor-lorentz-d10-i3 | 0.013238 | 0.007045 | - / - | 488.914399 / 590.233617 | - | 646.856176 / 669 | - |
| floor-lorentz-d10-i4 | 0.014462 | 0.008109 | - / - | 483.770330 / 601.076596 | - | 648.258037 / 670 | - |
| floor-lorentz-d50-i0 | 0.015664 | 0.008112 | - / - | 457.046240 / 576.337021 | - | 2728.574450 / 2808 | - |
| floor-lorentz-d50-i1 | 0.014392 | 0.008037 | - / - | 466.917456 / 577.317872 | - | 2726.923012 / 2809 | - |
| floor-lorentz-d50-i2 | 0.016236 | 0.008937 | - / - | 448.188092 / 578.821702 | - | 2729.331641 / 2807 | - |
| floor-lorentz-d50-i3 | 0.013645 | 0.006582 | - / - | 486.673876 / 590.157872 | - | 2727.774112 / 2806 | - |
| floor-lorentz-d50-i4 | 0.016474 | 0.009362 | - / - | 448.748854 / 571.321277 | - | 2730.053299 / 2806 | - |
| floor-euclid-d2-i0 | 0.014806 | 0.006336 | - / - | 444.134898 / 577.064255 | - | 73.952623 / 78 | - |
| floor-euclid-d2-i1 | 0.014533 | 0.007115 | - / - | 475.579028 / 585.615745 | - | 74.002538 / 78 | - |
| floor-euclid-d2-i2 | 0.014682 | 0.006135 | - / - | 488.686946 / 598.036596 | - | 74.183587 / 78 | - |
| floor-euclid-d2-i3 | 0.015257 | 0.008578 | - / - | 456.980205 / 578.817872 | - | 73.981387 / 78 | - |
| floor-euclid-d2-i4 | 0.015201 | 0.008730 | - / - | 462.392770 / 575.737872 | - | 74.117597 / 78 | - |
| floor-euclid-d3-i0 | 0.015247 | 0.007667 | - / - | 454.953302 / 581.685532 | - | 95.393401 / 100 | - |
| floor-euclid-d3-i1 | 0.015013 | 0.007260 | - / - | 453.518343 / 573.629787 | - | 95.477157 / 101 | - |
| floor-euclid-d3-i2 | 0.015438 | 0.007637 | - / - | 445.407597 / 575.540851 | - | 95.593063 / 101 | - |
| floor-euclid-d3-i3 | 0.015089 | 0.007728 | - / - | 475.868389 / 598.228085 | - | 95.429780 / 101 | - |
| floor-euclid-d3-i4 | 0.015288 | 0.007850 | - / - | 465.467670 / 604.411064 | - | 95.463621 / 100 | - |
| floor-euclid-d5-i0 | 0.014513 | 0.005310 | - / - | 462.747325 / 579.195745 | - | 137.971235 / 144 | - |
| floor-euclid-d5-i1 | 0.014783 | 0.008403 | - / - | 476.318786 / 602.284681 | - | 137.940778 / 145 | - |
| floor-euclid-d5-i2 | 0.015859 | 0.006755 | - / - | 427.030113 / 593.453617 | - | 138.077834 / 145 | - |
| floor-euclid-d5-i3 | 0.014634 | 0.008197 | - / - | 471.439468 / 585.174468 | - | 137.916244 / 145 | - |
| floor-euclid-d5-i4 | 0.014879 | 0.006643 | - / - | 480.129471 / 586.866809 | - | 137.978849 / 144 | - |
| floor-euclid-d10-i0 | 0.015344 | 0.008814 | - / - | 455.553118 / 574.454894 | - | 243.379019 / 254 | - |
| floor-euclid-d10-i1 | 0.015068 | 0.008025 | - / - | 452.859982 / 587.519574 | - | 243.547377 / 254 | - |
| floor-euclid-d10-i2 | 0.015898 | 0.006106 | - / - | 453.773769 / 582.595745 | - | 243.452623 / 255 | - |
| floor-euclid-d10-i3 | 0.013238 | 0.007045 | - / - | 488.914552 / 590.234043 | - | 243.426396 / 256 | - |
| floor-euclid-d10-i4 | 0.014462 | 0.008109 | - / - | 483.770254 / 601.076170 | - | 243.375635 / 254 | - |
| floor-euclid-d50-i0 | 0.015664 | 0.008112 | - / - | 457.046393 / 576.337021 | - | 1085.410321 / 1112 | - |
| floor-euclid-d50-i1 | 0.014392 | 0.008037 | - / - | 466.917456 / 577.317872 | - | 1085.211506 / 1114 | - |
| floor-euclid-d50-i2 | 0.016236 | 0.008937 | - / - | 448.188169 / 578.822128 | - | 1085.331641 / 1114 | - |
| floor-euclid-d50-i3 | 0.013645 | 0.006582 | - / - | 486.673800 / 590.158298 | - | 1085.093909 / 1114 | - |
| floor-euclid-d50-i4 | 0.016474 | 0.009362 | - / - | 448.748854 / 571.321277 | - | 1085.175127 / 1111 | - |
| learned-lorentz-d2-lr1-s0 | 0.889203 | 0.435848 | 0.889203 / 0.435848 | 22.639560 / 27.275319 | 0.279977 | 236.980541 / 256 | 46.0 |
| learned-lorentz-d2-lr1-s1 | 0.909782 | 0.450571 | 0.909782 / 0.450571 | 20.014751 / 24.718298 | 0.277145 | 237.489848 / 256 | 45.4 |
| learned-lorentz-d2-lr1-s2 | 0.876359 | 0.432120 | 0.876359 / 0.432120 | 23.425864 / 27.897872 | 0.283992 | 236.906937 / 257 | 45.7 |
| learned-lorentz-d2-lr1-s3 | 0.883042 | 0.434068 | 0.883042 / 0.434068 | 22.537909 / 25.617447 | 0.283986 | 237.231810 / 255 | 45.1 |
| learned-lorentz-d2-lr1-s4 | 0.897142 | 0.448395 | 0.897142 / 0.448395 | 23.379013 / 23.816596 | 0.281997 | 237.346870 / 255 | 45.0 |
| learned-lorentz-d3-lr1-s0 | 0.964599 | 0.476903 | 0.964599 / 0.476903 | 18.580327 / 16.503404 | 0.280019 | 303.616751 / 319 | 51.0 |
| learned-lorentz-d3-lr1-s1 | 0.949911 | 0.458278 | 0.949911 / 0.458278 | 22.352109 / 19.037872 | 0.289588 | 303.988156 / 318 | 52.1 |
| learned-lorentz-d3-lr1-s2 | 0.965984 | 0.471298 | 0.965984 / 0.471298 | 17.385433 / 15.063404 | 0.280548 | 304.005922 / 320 | 51.5 |
| learned-lorentz-d3-lr1-s3 | 0.968414 | 0.467310 | 0.968414 / 0.467310 | 15.065194 / 15.404255 | 0.276493 | 303.703892 / 317 | 50.3 |
| learned-lorentz-d3-lr1-s4 | 0.970952 | 0.458420 | 0.970952 / 0.458420 | 16.309156 / 15.082553 | 0.275170 | 304.326565 / 321 | 51.3 |
| learned-lorentz-d5-lr1-s0 | 0.967929 | 0.462000 | 0.967929 / 0.462000 | 16.921966 / 15.170638 | 0.282465 | 427.965313 / 445 | 65.2 |
| learned-lorentz-d5-lr1-s1 | 0.969022 | 0.451724 | 0.969022 / 0.451724 | 16.306405 / 14.913617 | 0.280217 | 428.434856 / 447 | 64.4 |
| learned-lorentz-d5-lr1-s2 | 0.970575 | 0.450984 | 0.970575 / 0.450984 | 16.542648 / 14.712340 | 0.282670 | 427.506768 / 446 | 64.5 |
| learned-lorentz-d5-lr1-s3 | 0.966848 | 0.457642 | 0.966848 / 0.457642 | 18.231122 / 14.927234 | 0.283745 | 429.070220 / 447 | 64.9 |
| learned-lorentz-d5-lr1-s4 | 0.969538 | 0.452347 | 0.969538 / 0.452347 | 17.030877 / 15.385957 | 0.281737 | 429.119289 / 446 | 66.1 |
| learned-lorentz-d10-lr1-s0 | 0.969244 | 0.444941 | 0.969244 / 0.444941 | 16.927622 / 15.065957 | 0.283732 | 734.149746 / 757 | 97.3 |
| learned-lorentz-d10-lr1-s1 | 0.968758 | 0.447645 | 0.968758 / 0.447645 | 17.780495 / 15.083404 | 0.284478 | 733.998308 / 761 | 95.3 |
| learned-lorentz-d10-lr1-s2 | 0.969979 | 0.456548 | 0.969979 / 0.456548 | 17.268190 / 14.861702 | 0.284765 | 736.096447 / 761 | 97.5 |
| learned-lorentz-d10-lr1-s3 | 0.967838 | 0.454509 | 0.967838 / 0.454509 | 17.859600 / 15.369362 | 0.284560 | 734.017766 / 761 | 98.2 |
| learned-lorentz-d10-lr1-s4 | 0.969053 | 0.454316 | 0.969053 / 0.454316 | 16.940614 / 14.869787 | 0.284782 | 734.830795 / 758 | 96.4 |
| learned-lorentz-d50-lr1-s0 | 0.968313 | 0.449858 | 0.968313 / 0.449858 | 18.041195 / 15.345106 | 0.285818 | 3157.636210 / 3234 | 347.5 |
| learned-lorentz-d50-lr1-s1 | 0.967344 | 0.447834 | 0.967344 / 0.447834 | 18.429609 / 15.316596 | 0.285808 | 3155.007614 / 3228 | 350.1 |
| learned-lorentz-d50-lr1-s2 | 0.967176 | 0.459265 | 0.967176 / 0.459265 | 18.038138 / 15.510638 | 0.285873 | 3155.486464 / 3229 | 345.7 |
| learned-lorentz-d50-lr1-s3 | 0.968667 | 0.452467 | 0.968667 / 0.452467 | 18.274916 / 15.230213 | 0.286196 | 3149.532149 / 3231 | 350.0 |
| learned-lorentz-d50-lr1-s4 | 0.967982 | 0.445952 | 0.967982 / 0.445952 | 17.813131 / 15.520851 | 0.285410 | 3156.971235 / 3232 | 344.7 |
| learned-euclid-d2-lr0.1-s0 | 0.171146 | 0.223374 | 0.171146 / 0.223374 | 75.754662 / 26.429362 | 0.391025 | 95.330795 / 100 | 30.5 |
| learned-euclid-d2-lr0.1-s1 | 0.157408 | 0.196009 | 0.157408 / 0.196009 | 84.413941 / 29.411915 | 0.415323 | 95.262267 / 100 | 29.8 |
| learned-euclid-d2-lr0.1-s2 | 0.159110 | 0.201609 | 0.159110 / 0.201609 | 75.624580 / 28.260851 | 0.433395 | 95.308799 / 100 | 30.4 |
| learned-euclid-d2-lr0.1-s3 | 0.167149 | 0.220003 | 0.167149 / 0.220003 | 72.740523 / 25.216170 | 0.377524 | 95.535533 / 100 | 30.7 |
| learned-euclid-d2-lr0.1-s4 | 0.172927 | 0.253720 | 0.172927 / 0.253720 | 76.005350 / 26.277021 | 0.403769 | 95.164975 / 100 | 30.4 |
| learned-euclid-d3-lr0.1-s0 | 0.220680 | 0.349004 | 0.220680 / 0.349004 | 57.794940 / 18.556170 | 0.317546 | 126.921320 / 133 | 33.9 |
| learned-euclid-d3-lr0.1-s1 | 0.221554 | 0.347448 | 0.221554 / 0.347448 | 59.356848 / 21.158298 | 0.379004 | 127.374788 / 132 | 34.1 |
| learned-euclid-d3-lr0.1-s2 | 0.220769 | 0.352691 | 0.220769 / 0.352691 | 58.661342 / 19.451915 | 0.345475 | 126.903553 / 132 | 34.5 |
| learned-euclid-d3-lr0.1-s3 | 0.225976 | 0.368912 | 0.225976 / 0.368912 | 57.862810 / 18.677447 | 0.328527 | 127.229272 / 133 | 34.6 |
| learned-euclid-d3-lr0.1-s4 | 0.218669 | 0.335260 | 0.218669 / 0.335260 | 58.184882 / 19.357447 | 0.324490 | 127.275804 / 132 | 34.4 |
| learned-euclid-d5-lr0.1-s0 | 0.291163 | 0.543375 | 0.291163 / 0.543375 | 39.404387 / 16.649787 | 0.285980 | 189.895939 / 196 | 45.1 |
| learned-euclid-d5-lr0.1-s1 | 0.291355 | 0.550406 | 0.291355 / 0.550406 | 39.800520 / 16.100000 | 0.283865 | 189.769036 / 196 | 44.5 |
| learned-euclid-d5-lr0.1-s2 | 0.290672 | 0.540049 | 0.290672 / 0.540049 | 40.101727 / 16.773191 | 0.287680 | 189.972927 / 197 | 44.2 |
| learned-euclid-d5-lr0.1-s3 | 0.292539 | 0.545717 | 0.292539 / 0.545717 | 39.746714 / 16.718723 | 0.284066 | 189.907783 / 197 | 46.0 |
| learned-euclid-d5-lr0.1-s4 | 0.292858 | 0.543713 | 0.292858 / 0.543713 | 39.613803 / 16.361277 | 0.288897 | 190.036379 / 197 | 45.6 |
| learned-euclid-d10-lr1-s0 | 0.497401 | 0.670047 | 0.497401 / 0.670047 | 15.925252 / 15.239149 | 0.301231 | 347.559222 / 358 | 69.7 |
| learned-euclid-d10-lr1-s1 | 0.494134 | 0.666836 | 0.494134 / 0.666836 | 16.214308 / 16.574468 | 0.303414 | 347.302030 / 359 | 69.2 |
| learned-euclid-d10-lr1-s2 | 0.497055 | 0.667948 | 0.497055 / 0.667948 | 15.527209 / 16.783830 | 0.303320 | 347.639594 / 358 | 69.7 |
| learned-euclid-d10-lr1-s3 | 0.499476 | 0.680384 | 0.499476 / 0.680384 | 16.072226 / 15.455745 | 0.302105 | 347.587140 / 356 | 70.2 |
| learned-euclid-d10-lr1-s4 | 0.494946 | 0.654565 | 0.494946 / 0.654565 | 17.706053 / 17.720000 | 0.305681 | 347.423858 / 357 | 69.9 |
| learned-euclid-d50-lr3-s0 | 0.999977 | 0.850050 | 0.999977 / 0.850050 | 1.252981 / 9.680851 | 0.318900 | 1583.855330 / 1612 | 270.4 |
| learned-euclid-d50-lr3-s1 | 0.999975 | 0.851543 | 0.999975 / 0.851543 | 1.280877 / 9.271915 | 0.319469 | 1584.417936 / 1609 | 269.8 |
| learned-euclid-d50-lr3-s2 | 0.999971 | 0.850407 | 0.999971 / 0.850407 | 1.289743 / 9.756170 | 0.320114 | 1583.659052 / 1614 | 267.6 |
| learned-euclid-d50-lr3-s3 | 0.999974 | 0.853607 | 0.999974 / 0.853607 | 1.278814 / 9.149362 | 0.319769 | 1584.252115 / 1609 | 267.9 |
| learned-euclid-d50-lr3-s4 | 0.999975 | 0.851156 | 0.999975 / 0.851156 | 1.277132 / 9.859149 | 0.319568 | 1584.021151 / 1607 | 268.6 |

## 8. Diagnostics (control 1, reported)

- Label 01861778 (1181 closure neighbours) takes the point of row 321 (02111889, 6).
- Label 01886756 (1132 closure neighbours) takes the point of row 116 (02074367, 4).
- lorentz/2/0: 200 permutations min 0.0111, median 0.0138, p99 0.0297, max 0.0415, share > 0.05 0.000; P 0.0121, rank 184 from the top.
- lorentz/2/1: 200 permutations min 0.0111, median 0.0137, p99 0.0307, max 0.0407, share > 0.05 0.000; P 0.0127, rank 151 from the top.
- lorentz/2/2: 200 permutations min 0.0110, median 0.0138, p99 0.0320, max 0.0414, share > 0.05 0.000; P 0.0126, rank 150 from the top.
- lorentz/2/3: 200 permutations min 0.0107, median 0.0136, p99 0.0329, max 0.0416, share > 0.05 0.000; P 0.0120, rank 188 from the top.
- lorentz/2/4: 200 permutations min 0.0110, median 0.0138, p99 0.0325, max 0.0405, share > 0.05 0.000; P 0.0122, rank 180 from the top.
- lorentz/3/0: 200 permutations min 0.0113, median 0.0137, p99 0.0313, max 0.0427, share > 0.05 0.000; P 0.0122, rank 168 from the top.
- lorentz/3/1: 200 permutations min 0.0111, median 0.0137, p99 0.0322, max 0.0417, share > 0.05 0.000; P 0.0122, rank 171 from the top.
- lorentz/3/2: 200 permutations min 0.0110, median 0.0138, p99 0.0310, max 0.0433, share > 0.05 0.000; P 0.0121, rank 175 from the top.
- lorentz/3/3: 200 permutations min 0.0110, median 0.0137, p99 0.0323, max 0.0424, share > 0.05 0.000; P 0.0122, rank 172 from the top.
- lorentz/3/4: 200 permutations min 0.0111, median 0.0136, p99 0.0317, max 0.0417, share > 0.05 0.000; P 0.0126, rank 154 from the top.
- lorentz/5/0: 200 permutations min 0.0110, median 0.0136, p99 0.0329, max 0.0428, share > 0.05 0.000; P 0.0120, rank 168 from the top.
- lorentz/5/1: 200 permutations min 0.0106, median 0.0137, p99 0.0328, max 0.0416, share > 0.05 0.000; P 0.0118, rank 185 from the top.
- lorentz/5/2: 200 permutations min 0.0107, median 0.0136, p99 0.0321, max 0.0443, share > 0.05 0.000; P 0.0121, rank 167 from the top.
- lorentz/5/3: 200 permutations min 0.0110, median 0.0137, p99 0.0340, max 0.0433, share > 0.05 0.000; P 0.0123, rank 158 from the top.
- lorentz/5/4: 200 permutations min 0.0109, median 0.0136, p99 0.0324, max 0.0418, share > 0.05 0.000; P 0.0119, rank 174 from the top.
- lorentz/10/0: 200 permutations min 0.0109, median 0.0137, p99 0.0318, max 0.0429, share > 0.05 0.000; P 0.0127, rank 136 from the top.
- lorentz/10/1: 200 permutations min 0.0108, median 0.0137, p99 0.0320, max 0.0429, share > 0.05 0.000; P 0.0121, rank 160 from the top.
- lorentz/10/2: 200 permutations min 0.0106, median 0.0137, p99 0.0324, max 0.0424, share > 0.05 0.000; P 0.0120, rank 171 from the top.
- lorentz/10/3: 200 permutations min 0.0109, median 0.0136, p99 0.0335, max 0.0412, share > 0.05 0.000; P 0.0124, rank 153 from the top.
- lorentz/10/4: 200 permutations min 0.0110, median 0.0136, p99 0.0330, max 0.0430, share > 0.05 0.000; P 0.0124, rank 149 from the top.
- lorentz/50/0: 200 permutations min 0.0108, median 0.0136, p99 0.0323, max 0.0422, share > 0.05 0.000; P 0.0120, rank 171 from the top.
- lorentz/50/1: 200 permutations min 0.0107, median 0.0137, p99 0.0320, max 0.0424, share > 0.05 0.000; P 0.0120, rank 167 from the top.
- lorentz/50/2: 200 permutations min 0.0106, median 0.0136, p99 0.0322, max 0.0415, share > 0.05 0.000; P 0.0121, rank 165 from the top.
- lorentz/50/3: 200 permutations min 0.0107, median 0.0137, p99 0.0326, max 0.0427, share > 0.05 0.000; P 0.0122, rank 157 from the top.
- lorentz/50/4: 200 permutations min 0.0108, median 0.0137, p99 0.0325, max 0.0428, share > 0.05 0.000; P 0.0125, rank 149 from the top.
- euclid/2/0: 200 permutations min 0.0129, median 0.0150, p99 0.0165, max 0.0167, share > 0.05 0.000; P 0.0157, rank 30 from the top.
- euclid/2/1: 200 permutations min 0.0127, median 0.0149, p99 0.0171, max 0.0172, share > 0.05 0.000; P 0.0149, rank 108 from the top.
- euclid/2/2: 200 permutations min 0.0130, median 0.0149, p99 0.0169, max 0.0171, share > 0.05 0.000; P 0.0154, rank 52 from the top.
- euclid/2/3: 200 permutations min 0.0130, median 0.0149, p99 0.0165, max 0.0167, share > 0.05 0.000; P 0.0153, rank 70 from the top.
- euclid/2/4: 200 permutations min 0.0133, median 0.0150, p99 0.0166, max 0.0169, share > 0.05 0.000; P 0.0164, rank 6 from the top.
- euclid/3/0: 200 permutations min 0.0133, median 0.0149, p99 0.0171, max 0.0172, share > 0.05 0.000; P 0.0160, rank 28 from the top.
- euclid/3/1: 200 permutations min 0.0129, median 0.0150, p99 0.0170, max 0.0177, share > 0.05 0.000; P 0.0152, rank 87 from the top.
- euclid/3/2: 200 permutations min 0.0133, median 0.0150, p99 0.0170, max 0.0174, share > 0.05 0.000; P 0.0158, rank 37 from the top.
- euclid/3/3: 200 permutations min 0.0131, median 0.0149, p99 0.0170, max 0.0172, share > 0.05 0.000; P 0.0151, rank 91 from the top.
- euclid/3/4: 200 permutations min 0.0129, median 0.0149, p99 0.0167, max 0.0172, share > 0.05 0.000; P 0.0157, rank 36 from the top.
- euclid/5/0: 200 permutations min 0.0133, median 0.0151, p99 0.0167, max 0.0180, share > 0.05 0.000; P 0.0160, rank 24 from the top.
- euclid/5/1: 200 permutations min 0.0131, median 0.0149, p99 0.0170, max 0.0175, share > 0.05 0.000; P 0.0148, rank 115 from the top.
- euclid/5/2: 200 permutations min 0.0131, median 0.0148, p99 0.0173, max 0.0175, share > 0.05 0.000; P 0.0145, rank 155 from the top.
- euclid/5/3: 200 permutations min 0.0128, median 0.0149, p99 0.0174, max 0.0182, share > 0.05 0.000; P 0.0144, rank 158 from the top.
- euclid/5/4: 200 permutations min 0.0132, median 0.0150, p99 0.0169, max 0.0174, share > 0.05 0.000; P 0.0160, rank 28 from the top.
- euclid/10/0: 200 permutations min 0.0134, median 0.0147, p99 0.0195, max 0.0204, share > 0.05 0.000; P 0.0144, rank 151 from the top.
- euclid/10/1: 200 permutations min 0.0131, median 0.0148, p99 0.0192, max 0.0197, share > 0.05 0.000; P 0.0152, rank 60 from the top.
- euclid/10/2: 200 permutations min 0.0128, median 0.0148, p99 0.0194, max 0.0202, share > 0.05 0.000; P 0.0162, rank 17 from the top.
- euclid/10/3: 200 permutations min 0.0133, median 0.0148, p99 0.0195, max 0.0204, share > 0.05 0.000; P 0.0146, rank 125 from the top.
- euclid/10/4: 200 permutations min 0.0131, median 0.0148, p99 0.0192, max 0.0200, share > 0.05 0.000; P 0.0150, rank 82 from the top.
- euclid/50/0: 200 permutations min 0.0125, median 0.0141, p99 0.0258, max 0.0339, share > 0.05 0.000; P 0.0136, rank 152 from the top.
- euclid/50/1: 200 permutations min 0.0127, median 0.0141, p99 0.0254, max 0.0338, share > 0.05 0.000; P 0.0136, rank 149 from the top.
- euclid/50/2: 200 permutations min 0.0126, median 0.0141, p99 0.0256, max 0.0331, share > 0.05 0.000; P 0.0139, rank 115 from the top.
- euclid/50/3: 200 permutations min 0.0125, median 0.0141, p99 0.0254, max 0.0341, share > 0.05 0.000; P 0.0137, rank 145 from the top.
- euclid/50/4: 200 permutations min 0.0127, median 0.0141, p99 0.0256, max 0.0346, share > 0.05 0.000; P 0.0137, rank 136 from the top.

## 9. Environment, pre-flight, replay, starts, readings

- Linux-6.18.44-fc-v242-x86_64-with-glibc2.39; Intel(R) Xeon(R) Processor @ 2.10GHz; Python 3.13.18, numpy 2.5.3, numba 0.68.1, llvmlite 0.50.0, libc glibc 2.39; 4 workers; numpy SIMD AVX, AVX2, AVX512BF16, AVX512BITALG, AVX512BW, AVX512CD, AVX512DQ, AVX512F, AVX512FP16, AVX512IFMA, AVX512VBMI, AVX512VBMI2, AVX512VL, AVX512VNNI, AVX512VPOPCNTDQ, AVX512_CLX, AVX512_CNL, AVX512_ICL, AVX512_SKX, AVX512_SPR, BMI, BMI2, CX16, F16C, FMA3, GFNI, LAHF, LZCNT, MMX, MOVBE, POPCNT, SSE, SSE2, SSE3, SSE41, SSE42, SSSE3, VAES, VPCLMULQDQ, X86_V2, X86_V3, X86_V4.
- Run environments (A10.4; each job record holds the one its worker ran under): `db8e470c21e5` 469 record(s); all this start's.
- Pre-flight reproducibility: tuning-euclid-d2-lr0.03-s9000 equal; tuning-lorentz-d2-lr0.03-s9000 equal.
- Paths changed since tuning: Pages/Hyperbolic Lexicon/PREREGISTRATION.md, Pages/Hyperbolic Lexicon/reference/results/phase4-tuning-console.txt, Pages/Hyperbolic Lexicon/reference/results/tuning.json, Pages/Hyperbolic Lexicon/reference/settings.json.
- Replay check (learned-lorentz-d3-lr1-s0, after epoch 1000): equal.
- Starts: 2026-11-06T19:58:57Z at 515a4a1f0a76 (environment `db8e470c21e5`).
- Clean-tree checks during the run: 3 (before the training pool, before the control-1 pool, before writing claims-phase4.json), HEAD unchanged.

### READINGs of this runner

- **runner-1.** A10.14 step 4 and 6, "refuses uncommitted changes": git status --porcelain --no-renames (untracked files listed one by one; a rename or copy counts both its paths) over the system folder and the reference folders of Hyperbolic Oracles and Engram Mind's Eye, whole (lexicon puts both on sys.path ahead of the standard library and imports hpstep and engram from them in place), must be empty, except the step's own outputs (so that an interrupted run resumes at the same HEAD); a sys.path entry inside the repository outside these folders is refused too. The check, with HEAD unchanged, is repeated before each worker pool starts (spawn workers import the code from disk afresh) and before the step writes its record; each check is listed (git_checks). "The only paths changed since the commit tuning ran on" (step 6) is git diff --name-only --no-renames, so a moved file names its old path too. --allow-dirty is refused in registered mode; in a dry run it marks the record "development run: not a registered run".
- **runner-2.** A10.14 "it resumes ... from its finished jobs": a runs.jsonl line is reused only at the same HEAD and configuration (mode, instance, epochs, burn-in, budget), and only while its cached float table, snapped text and per-query APs still have their recorded SHA-256s; anything else is rerun. A line trained under another environment is reused all the same ("that is the same run"): A10.4 has each run record its environment, so every job record carries the one its worker ran under (environment_sha, with the environments in run_environments), every start carries its own, and a reuse across environments is logged and counted (environments_summary).
- **runner-3.** A10.11 "wall-clock per run ... with the number of concurrent processes": time.perf_counter and time.process_time of the training, with the size of the pool that ran it (min(--workers, the jobs it ran): the most worker processes that run at once).
- **runner-12.** A10.4 "each run records the numpy, numba and libc versions and numpy's SIMD features": each job record holds the environment of the worker that ran it (Python, numpy, numba, llvmlite, libc, platform, numpy's CPU features and dispatch targets, the CPU model), computed inside the worker; the outputs give each run its environment_sha and list the environments once (run_environments).
- **runner-4.** A10.1 and A10.14, the replay check: the designated run's draws (tuning: (lorentz, 3, 0.03, first tuning seed); measure: measured (lorentz, 3, first training seed)) are replayed for every epoch of the budget with hpstep.prng.Rng, and the state after the run's last epoch (the epoch it diverged at, if it did) must equal its final state. If the designated cell is not run (no frozen lr, or the self-test's cells), the first run of the step in job order is replayed instead.
- **runner-7.** A10.12 for the exact arm: d is 3 (H3); seed, lr, budget, floatTableSha, snapBits and wallMs do not apply (-); settingsSha is the decisive run's. A floor's record has its i as the seed, and lr, budget and wallMs -. A tuning record has settingsSha, graphMapSha and graphMap - (build spec 4.2).
- **runner-8.** A10.14 step 6, the reproducibility check: the tuning jobs (euclid, 2, the grid's first rate, the first seed of its block) and (lorentz, 2, the same) are retrained in workers and their float SHA-256s compared with tuning.json's; a mismatch is recorded and disclosed and does not stop the run.
- **runner-9.** A10.9, control 2 "established": an entry is True or False when both runs of the pair exist (l6.present's READING), None when either diverged; a cell without a frozen lr has no entry and no seed present.
- **runner-10.** A10.9's diagnostics: the labels are the root and the node with the most closure neighbours after it (mammals: mammal.n.01 and placental.n.01; dry: solid.n.01 and that node); "the label L takes the point of row Q[L]" (Q = P^-1). Per measured table, the 200 diagnostic MAPs (float64, from the rank structure) give min, median, 99th percentile (numpy, linear), max and the share above 0.05; P's rank is 1 + the number of diagnostic MAPs strictly above P's exact relabelled closure MAP.
- **runner-11.** A10.9's reported "relabelled closure MAP of each measured table under 200 further permutations Rng(2100 + j)": computed in binary64, not as exact rationals. The order and the ties are the snapped table's exact ones (learned.rank_structure from the exact keys, the ranking control 1 evaluates); only each AP's sum (rank._ap_and_ranks's pessimistic ranks, added in binary64) and the mean (math.fsum) are floats (learned.map_float_structure). A10.9 says "computed exactly" of P's relabelled MAP, which decides control 1 and is exact here; the 200 decide nothing, and A10.9 reads them only for where P sits among them (their summary, and P's rank, compare floats).

The modules' own READINGs are marked in reference/lexicon/{stream,pystream,embed,learned,l6}.py.

## 10. Receipts

`results/lbench-phase4.txt`: 367 LBENCH/1 records (216 from tuning), SHA-256 `2505bfd6ccc21509305fae017eb1d34e4d19eab27559f82ec95a761f965c376e`. Tables in `results/l6-tables` (141 files).
