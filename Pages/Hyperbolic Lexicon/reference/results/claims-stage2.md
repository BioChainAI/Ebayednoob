# Stage 2 claims (registered)

PREREGISTRATION.md with Amendments 1-15; HEAD `6b6ec0996342ae4befdab93b3f2179fea0cc9f8c`

## L12

| Part | Verdict | Cells (estimate [2.5%, 97.5%]) |
| --- | --- | --- |
| (a) | supported | H3-F3: +0.451756 [+0.366321, +0.537456]; H3-F3*: +0.408004 [+0.317121, +0.502786]; H2-F2: +0.565876 [+0.468303, +0.652605]; H2-F2*: +0.409588 [+0.313005, +0.506924] |
| (b) | supported | H3: +0.174322 [+0.061545, +0.292732]; H2: +0.167824 [+0.054986, +0.287257] |
| (c) | supported | H3: +0.399389 [+0.308581, +0.487686]; H2: +0.410397 [+0.320309, +0.497834] |
| (d) | refuted | H3-WN: -0.160603 [-0.220516, -0.112235] |

Controls fail as required: `{"control1": true, "control2": true, "control3": true, "control4": true}`

## L13

| Part | Verdict | Cells (estimate [2.5%, 97.5%]) |
| --- | --- | --- |
| (a) | supported | H3-F3: +0.683738 [+0.654393, +0.713618]; H3-F3*: +0.652656 [+0.624829, +0.681090]; H2-F2: +0.709405 [+0.681430, +0.737730]; H2-F2*: +0.679478 [+0.652498, +0.706789] |
| (b) | supported | H3-F3: +0.400682 [+0.362911, +0.432217]; H3-F3*: +0.412666 [+0.385307, +0.439142]; H2-F2: +0.454806 [+0.426190, +0.480855]; H2-F2*: +0.433739 [+0.408648, +0.457732] |
| (c) | supported | H3-F3: +0.351759 [+0.304385, +0.399163]; H3-F3*: +0.376884 [+0.343593, +0.410442]; H2-F2: +0.464824 [+0.414858, +0.514643]; H2-F2*: +0.545226 [+0.513709, +0.576344] |

Controls fail as required: `{"control1": true, "control2": true, "control3": true}`

## L14

| Part | Verdict | Cells (estimate [2.5%, 97.5%]) |
| --- | --- | --- |
| (a) | supported | d2/random: supported; d2/hard: supported; d3/random: supported; d3/hard: supported |
| (b) | supported | d2: supported; d3: supported |

Controls fail as required: `{"control1": true, "control2": true, "closure_check": true, "control3": true, "control4": true}`

## L15

| Part | Verdict | Cells (estimate [2.5%, 97.5%]) |
| --- | --- | --- |
| (a) | refuted | SL/H3-F3: +0.251843 [+0.146815, +0.356256]; SL/H3-F3*: +0.225700 [+0.119025, +0.333397]; SL/H2-F2: +0.391403 [+0.261742, +0.519386]; SL/H2-F2*: +0.221983 [+0.114264, +0.329887]; MEN/H3-F3: +0.238462 [+0.168336, +0.309502]; MEN/H3-F3*: +0.093279 [+0.034313, +0.155472]; MEN/H2-F2: +0.278245 [+0.192758, +0.362548]; MEN/H2-F2*: +0.105665 [+0.043908, +0.170315] |
| (b) | supported | MEN: +0.365718 [+0.276143, +0.455861]; WSR: +0.584524 [+0.284892, +0.858283]; HL: +0.109535 [+0.023564, +0.193084] |

Controls fail as required: `{"control1": true, "control2": true, "control3": true}`

L12(d) is flagged: registered after a partial preview (A13.20).

## Wiring

141 decided comparisons and 321 control values equal Amendment 13's text (check_spec) and their recomputation from the code files (verify_wiring).

## Convergence

40 of 42 runs converged.

## Pass 1

1635 code files, 172892141 lines; 131003 240-digit recomputations; 131003 values in numerical ties between distinct tuples.

