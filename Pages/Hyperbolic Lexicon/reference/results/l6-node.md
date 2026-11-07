# Hyperbolic Lexicon, Phase 4: the Node re-evaluation of L6 (A10.11)

**Reported, deciding nothing; A10.11.** L6 and L4(c) were decided by the Python reference in the decisive run (`results/claims-phase4.json`, run at 515a4a1). This run ranks the committed snapped texts again in Node with `lexicon_core.js`, unchanged, and compares every exact value with that record. It is the check the Common rules ("Authority") ask for before the browser shows L6 or L4(c) as holding.

Run 2026-11-06 21:23:09 UTC with PREREGISTRATION.md with Amendments 1-11 by `reference/run_l6_node.cjs`: Node v22.23.4 (V8 12.4.254.21-node.57, Linux 6.18.44-fc-v242 x64); `lexicon_core.js` lexicon-browser-1, SHA-256 `b6b948cb32b0aea22b1d0339257bdbe1541acdad57461e8ef67407d62e0ef261` (as committed at b6f3b9d); record SHA-256 `fda2ed646a76a5b8…`; 116.96 s in all. Uncommitted when it ran (git status of this runner and its inputs): `?? "Pages/Hyperbolic Lexicon/reference/run_l6_node.cjs"`.

## Summary

| What | Equal to the record |
| --- | --- |
| The L6 trace (`traces/l6_v1.txt`, `Rng(8000 + i)` toy tables), first | 2585/2585 lines |
| The instance S in Node (n, closure edges, SHA-256 `c4748ce2…`, the six queries without graph-edge neighbours) | yes |
| The exact arm: closure and graph-edge MAP (p/q), LBENCH/1 MAP hashes, mean ranks, ties, both AP lists, its text | yes |
| Snapped text SHA-256 (record and LBENCH/1) | 50/50 |
| Exact closure MAP (p/q) | 50/50 |
| Exact graph-edge MAP (p/q) | 50/50 |
| LBENCH/1 closureMapSha and graphMapSha (A10.12) | 50/50 |
| LBENCH/1 six-decimal MAPs | 50/50 |
| Pooled mean ranks, closure and graph-edge | 50/50 |
| Exact tie counts | 50/50 |
| Per-query APs (closure and graph-edge, query by query) | 50/50 tables compared (of 50); 0 of 118200 query APs differ |
| The run's aps_sha rebuilt from Node's APs | 50/50 |
| **Tables equal in every field** | **50/50**, and the exact arm too |

**Differences: none.**

## How

1. **The traces first.** `lexicon_core.js` `l6ParitySections` regenerated `reference/traces/l6_v1.txt` (SHA-256 `689b4b83c1751f2b…`) from its seeds: 2585/2585 lines equal, in 0.08 s. A failing line would have refused the run.
2. **The instance.** S built in Node from the WordNet archive (the core's `closure`, `descendants`): 1182 synsets, 6542 closure edges, SHA-256 `c4748ce2fc8d4137846c76186c5fa02d9060597b59b8975f8fdc4ae6e476b4ca`, equal to the record and to `golden/wordnet_v1.meta.json`. Closure neighbours: 13084 (query, neighbour) pairs; graph-edge neighbours over the full noun spanning forest: 2350; no graph-edge neighbours: 01322508, 01322604, 01322898, 01322983, 01323068, 01862399 (left out of the graph-edge MAP, A10.2).
3. **Ranking.** Every table is parsed by `parseSnapText` (offsets S's, in order; d the run's) and ranked by `SnapArm` (Lorentz: κ_u(v) = |n_u − n_v|²/(4^32 − |n_v|²) by BigInt cross-multiplication; Euclidean: |n_u − n_v|²) and `evaluateSnapped`, every one of the 1,182 queries against the other 1,181, ties pessimistic. The exact arm is ranked from its committed lines as an `Arm` (READING node-1).
4. **Comparison.** MAPs as p/q texts; the LBENCH/1 fields a track holding a snapped table must reproduce (A10.12); mean ranks; ties; per-query APs against the run's own AP file, read only when its SHA-256 is the committed `aps_sha` (READING node-2).

## The exact arm

`results/l6-tables/exact-h3.snap.txt.gz`: 1182 lines, SHA-256 `534d6137834ae8f3…` (record equal); equal to this core's own `pointExact` lines: yes; common denominator a power of 7: true (102 bits).

| Metric | MAP (Node) | p/q equal | LBENCH/1 hash | Mean rank (Node) | Mean rank equal | AP list SHA-256 equal |
| --- | --- | --- | --- | --- | --- | --- |
| closure | 0.305408 | yes | yes | 891379/13084 | yes | yes |
| graph-edge | 0.690653 | yes | yes | 6837/2350 | yes | yes |

Exact ties: 47375 (record 47375). 3.34 s.

## The 50 measured tables

| Table | lr | Snap SHA-256 | Closure MAP | Graph-edge MAP | MAPs p/q equal | LBENCH/1 hashes | Mean ranks | Ties (Node / record) | Query APs differing (closure, graph) | aps_sha rebuilt | Seconds |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| learned-lorentz-d2-s0 | 1 | `c8353474…` = | 0.889203 | 0.435848 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.71 |
| learned-lorentz-d2-s1 | 1 | `493fe2d2…` = | 0.909782 | 0.450571 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.72 |
| learned-lorentz-d2-s2 | 1 | `94fb3070…` = | 0.876359 | 0.432120 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.65 |
| learned-lorentz-d2-s3 | 1 | `159e1420…` = | 0.883042 | 0.434068 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.66 |
| learned-lorentz-d2-s4 | 1 | `c2612436…` = | 0.897142 | 0.448395 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.64 |
| learned-lorentz-d3-s0 | 1 | `981cf812…` = | 0.964599 | 0.476903 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.77 |
| learned-lorentz-d3-s1 | 1 | `c189fcd9…` = | 0.949911 | 0.458278 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.75 |
| learned-lorentz-d3-s2 | 1 | `c55f6db5…` = | 0.965984 | 0.471298 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.75 |
| learned-lorentz-d3-s3 | 1 | `a0ada7c0…` = | 0.968414 | 0.467310 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.76 |
| learned-lorentz-d3-s4 | 1 | `6adfc609…` = | 0.970952 | 0.458420 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.83 |
| learned-lorentz-d5-s0 | 1 | `ea990d48…` = | 0.967929 | 0.462000 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.98 |
| learned-lorentz-d5-s1 | 1 | `ba008c75…` = | 0.969022 | 0.451724 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.95 |
| learned-lorentz-d5-s2 | 1 | `5ffe3d95…` = | 0.970575 | 0.450984 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 2.05 |
| learned-lorentz-d5-s3 | 1 | `037508dd…` = | 0.966848 | 0.457642 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 2.03 |
| learned-lorentz-d5-s4 | 1 | `3a3246d0…` = | 0.969538 | 0.452347 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 2.06 |
| learned-lorentz-d10-s0 | 1 | `d4ae3019…` = | 0.969244 | 0.444941 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 2.35 |
| learned-lorentz-d10-s1 | 1 | `ac291024…` = | 0.968758 | 0.447645 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 2.41 |
| learned-lorentz-d10-s2 | 1 | `ed3f054e…` = | 0.969979 | 0.456548 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 2.31 |
| learned-lorentz-d10-s3 | 1 | `13eb215a…` = | 0.967838 | 0.454509 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 2.56 |
| learned-lorentz-d10-s4 | 1 | `30d4b2a7…` = | 0.969053 | 0.454316 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 2.39 |
| learned-lorentz-d50-s0 | 1 | `12bac75e…` = | 0.968313 | 0.449858 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 5.74 |
| learned-lorentz-d50-s1 | 1 | `fdc9bb2f…` = | 0.967344 | 0.447834 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 5.7 |
| learned-lorentz-d50-s2 | 1 | `ca2772e0…` = | 0.967176 | 0.459265 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 5.87 |
| learned-lorentz-d50-s3 | 1 | `7832a379…` = | 0.968667 | 0.452467 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 5.77 |
| learned-lorentz-d50-s4 | 1 | `ab9a7deb…` = | 0.967982 | 0.445952 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 5.82 |
| learned-euclid-d2-s0 | 0.1 | `09c5a216…` = | 0.171146 | 0.223374 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.55 |
| learned-euclid-d2-s1 | 0.1 | `669df03e…` = | 0.157408 | 0.196009 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.56 |
| learned-euclid-d2-s2 | 0.1 | `ee2fb586…` = | 0.159110 | 0.201609 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.56 |
| learned-euclid-d2-s3 | 0.1 | `c87629d0…` = | 0.167149 | 0.220003 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.56 |
| learned-euclid-d2-s4 | 0.1 | `951fe4a0…` = | 0.172927 | 0.253720 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.61 |
| learned-euclid-d3-s0 | 0.1 | `bcd74821…` = | 0.220680 | 0.349004 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.64 |
| learned-euclid-d3-s1 | 0.1 | `06d68740…` = | 0.221554 | 0.347448 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.64 |
| learned-euclid-d3-s2 | 0.1 | `780e30f2…` = | 0.220769 | 0.352691 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.64 |
| learned-euclid-d3-s3 | 0.1 | `ba6f3927…` = | 0.225976 | 0.368912 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.64 |
| learned-euclid-d3-s4 | 0.1 | `dffd5b76…` = | 0.218669 | 0.335260 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.66 |
| learned-euclid-d5-s0 | 0.1 | `7f7734aa…` = | 0.291163 | 0.543375 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.97 |
| learned-euclid-d5-s1 | 0.1 | `93664fc4…` = | 0.291355 | 0.550406 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.89 |
| learned-euclid-d5-s2 | 0.1 | `979d9f91…` = | 0.290672 | 0.540049 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.94 |
| learned-euclid-d5-s3 | 0.1 | `0c6d2328…` = | 0.292539 | 0.545717 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.89 |
| learned-euclid-d5-s4 | 0.1 | `a557feb6…` = | 0.292858 | 0.543713 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 0.89 |
| learned-euclid-d10-s0 | 1 | `fbf4106e…` = | 0.497401 | 0.670047 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.44 |
| learned-euclid-d10-s1 | 1 | `8fa5a6bd…` = | 0.494134 | 0.666836 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.42 |
| learned-euclid-d10-s2 | 1 | `306a5420…` = | 0.497055 | 0.667948 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.31 |
| learned-euclid-d10-s3 | 1 | `940cd223…` = | 0.499476 | 0.680384 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.42 |
| learned-euclid-d10-s4 | 1 | `18e25e3e…` = | 0.494946 | 0.654565 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 1.36 |
| learned-euclid-d50-s0 | 3 | `72219acd…` = | 0.999977 | 0.850050 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 5.15 |
| learned-euclid-d50-s1 | 3 | `a8db9e69…` = | 0.999975 | 0.851543 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 5.26 |
| learned-euclid-d50-s2 | 3 | `8ec9b707…` = | 0.999971 | 0.850407 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 5.51 |
| learned-euclid-d50-s3 | 3 | `f6fceb92…` = | 0.999974 | 0.853607 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 5.21 |
| learned-euclid-d50-s4 | 3 | `586cc577…` = | 0.999975 | 0.851156 | yes | yes | yes | 0 / 0 | 0 of 1182, 0 of 1176 | yes | 5.15 |

The graph-edge AP column counts the queries with an AP (1,176); the six without one are null in both lists and are compared as null.

## Readings

- **node-1.** The exact arm is ranked from its committed text (the canonical H^3 lines of Amendment 1 item 6 for S): each line's four rationals are brought to one common denominator, the least common multiple of their denominators, and ranked as a lexicon_core.js Arm of kind lorentz. Its keys are positive multiples of rank.py's over 7^Lmax, so the order and the ties are the same; the text is also checked against this core's own pointExact lines.
- **node-2.** A measured run's aps_sha hashes its .aps.json in the cache, which also holds the fractional-tie APs (A10.11), a quantity lexicon_core.js does not compute. That file is read only when its SHA-256 is the committed aps_sha; Node's closure and graph-edge APs are compared with it query by query, and the file is rebuilt from Node's two lists and its own two fractional lists, which must give aps_sha again. Without the file, the table's per-query APs are counted as not compared, never as equal.
- **node-3.** The exact MAPs are compared as their p/q texts in lowest terms. The JSON keeps each text's SHA-256 (as LBENCH/1's closureMapSha and graphMapSha), its length and its binary64 value, and the texts themselves only where Node and the record differ.
- **node-4.** The Lorentz keys are lexicon_core.js's exact kappa classes (SnapArm.keys); the reference ranked by the integer floor(a 2^(4K) / b), another image of the same order (tests/parity-lexicon.cjs checks that both give the same classes). The tie count is candidates minus distinct keys, summed over queries, in both.

Runtime: 116.96 s (the instance 1.34 s; the exact arm 3.34 s; the 50 tables 112.1 s).
