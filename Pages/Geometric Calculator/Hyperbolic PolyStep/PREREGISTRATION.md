# Hyperbolic PolyStep: preregistration

Registered 2026-10-29, before any solver code exists (Phase 0). The benchmarks, budgets, metrics and
decision rules below are fixed. A later change is recorded as a dated amendment at the end of this file,
with its reason. Results computed before an amendment are reported under the rules in force when they ran.

The form follows the open problems of *The Geometric Engine of Time* (§11): the evidence so far, a test,
a decision rule fixed in advance, and what depends on the answer.

## Claims under test

| # | Claim | Tested by |
| --- | --- | --- |
| C1 | On tree-structured problems the hyperbolic step beats the same step at curvature 0, at equal evaluation budget | B1, B3, B4 |
| C2 | Hyperbolic depth acts as built-in annealing: a fixed hyperbolic radius gives shorter Klein steps as a channel commits | B1, B2 |
| C3 | Three channels on the 24-frame schedule beat one channel with three times the particles, at equal budget | B1 ablation |

The properties H1 to H7 of the step are mathematical. They are proved and tested exactly, and are not part
of this preregistration.

## Common rules

- **Budget.** One evaluation is one candidate scored, as in polystep. Every method in a comparison gets the same budget.
- **Baselines.**
  - The primary comparison is the same code at curvature 0 (property H5 makes this exactly polystep's step). It isolates the effect of curvature.
  - polystep 1.1.1 itself (`PolyStep` or `PolyStepOptimizer`) on the flattened Euclidean problem is reported as a second baseline.
  - Random search at the same budget is reported as a floor.
- **Settings.**
  - Before any measured run, each method gets 24 tuning runs on separate tuning instances (seeds 9000 to 9023). The tuning covers ε, the radii and their cosine schedules.
  - The chosen settings are frozen and written to `reference/settings.json`.
- **Instances and seeds.**
  - Instance seeds are 1000 + i. Method seeds are 0, 1, 2.
  - Each instance is run once per method seed. Results are paired by instance and seed.
- **Statistics.**
  - Each effect is the mean paired difference (hyperbolic minus baseline), with a 95% percentile bootstrap interval over the pairs (10,000 resamples, seed 7).
  - The claim is **supported** if the interval lies above 0 and **refuted** if it lies at or below 0. Otherwise it is **inconclusive**.
  - Every cell is reported. No cell is dropped after the run.
- **Authority.** Decisions come from the Python reference. The browser page reruns small cells only to illustrate.

## B1 · Graph 3-colouring

- **Instances.**
  - Planted 3-colourable graphs (equipartition into three classes; edges only between classes, drawn uniformly) with average degree c ∈ {4.0, 4.4, 4.69}.
  - n ∈ {60, 120, 300}, with 20 instances per cell.
- **State.** One point of H² per vertex, so the state lies in the product (H²)ⁿ.
- **Step.** Each step moves a random block of 8 vertices. The corners are an orthoplex in the 16-dimensional tangent space of the block, applied factor by factor.
- **Decoder.** A vertex's colour is the branch (0°, 120°, 240°) nearest the angle of its Poincaré point. A point at the origin takes colour 0.
- **Cost.** The number of monochromatic edges, counted exactly by Helix B.
- **Budget.** 400 · n evaluations per run.
- **Method.** Three channels of 4 particles on the schedule, clutch "membrane" with strength μ from tuning.
- **Primary metric.** Success, meaning a proper colouring found within budget, scored 0 or 1.
- **Secondary metrics.** Final conflicts, and evaluations to success.
- **Ablations.**
  - C3: one channel of 12 particles at equal budget.
  - Membrane off (clutch "free").
- **C2 measure.** For every step of every run, the Klein length of the step and the mean Klein radius |κ| of the block before it. C2 is supported if the Spearman correlation is below −0.3 and its bootstrap interval excludes 0.

## B2 · MAX-3-SAT

- **Instances.**
  - Random 3-SAT at clause ratio 4.27 (polystep's generator).
  - n ∈ {100, 500, 2000}, with 20 instances per cell.
- **State.** Variables in blocks of 8, one H⁸ factor per block.
- **Decoder.** A variable is true when its Poincaré coordinate is positive.
- **Cost.** The fraction of unsatisfied clauses, counted exactly.
- **Budget.** 300 · n evaluations.
- **Primary metric.** Fraction of clauses satisfied at the end of the budget.
- **C2 measure.** As in B1.
- **External reference.** polystep's published MAX-SAT rows are quoted for orientation only. They used other budgets and are not part of any decision.

## B3 · Tree address search (with a negative control)

- **Tree.** The norm-5 tree of the paper, with 6 · 5^(L−1) addresses at depth L, for L ∈ {4, 6, 8}.
- **Embedding.** The tree is embedded in H² by Sarkar's construction, with fixed scale τ = 3.
- **Decoder.** A point decodes to the nearest node at depth L, by greedy descent from the root.
- **Graded objective.** The tree distance between the decoded node and the target. 30 random targets per depth.
- **Membership objective (the control).** Cost 0 at the target and 1 elsewhere.
- **Budget.** 6 · 5^(L−1) evaluations, the size of the depth-L level.
- **Primary metrics.**
  - Graded objective: the fraction of targets found.
  - Membership objective: the mean number of evaluations to the target.
- **Rules.**
  - **C1 on graded.** C1 is supported if the hyperbolic success rate exceeds curvature 0 by the common rule.
  - **Control.** Under membership, every method's mean evaluations to the target must be consistent with (N + 1)/2 for a uniformly placed target (Prop 5.13 of the paper). "Consistent" means that a two-sided 95% interval contains (N + 1)/2, or that the method fails within budget at the expected rate.
  - **Control failure.** If any method beats this bound significantly, the run is treated as a bug (information leaking from the target into the search) and investigated, not reported as a result.

## B4 · Hard-threshold network

- **Data.**
  - Eight classes at the leaves of a depth-3 binary tree. Inputs in R¹⁶ are drawn from hierarchical Gaussian means: each level adds a mean offset of halving size, plus noise σ = 0.5.
  - 2,000 training points and 1,000 test points per seed.
- **Model.**
  - An encoder W: R¹⁶ → R² sends x to exp₀(Wx) in H².
  - There are 8 class prototypes in H².
  - The prediction is the nearest prototype, a hard argmin with no useful gradient.
- **Parameters.** W lies in R³²; the prototypes lie in (H²)⁸.
- **Curvature-0 counterpart.** The same model with prototypes in R² and exp₀ the identity.
- **Budget.** 2 · 10⁵ evaluations per seed, with 10 seeds.
- **Primary metric.** Test accuracy.
- **Secondary metric.** Accuracy at the coarse level of the tree (pairs of leaves), to see where the errors fall.
- **Additional baseline.** polystep's `PolyStepOptimizer` on the Euclidean model.

## What none of this decides

- **P versus NP.** Its status is unchanged: it stays open.
- **SAT encodings.** A solver of this kind would give an integrable encoding of SAT only with a proof, not a benchmark (Theorem 5.11).
- **Black-box search.** No method can beat the volume of the space against a membership-only objective (Prop 5.13). B3's control checks the implementation against that bound; it does not test the bound.

## Amendments

### Amendment 1 · 2026-10-29 · implementation details fixed in Phase 1, before any tuning or measured run

None of these changes a preregistered setting (sizes, budgets, seeds, metrics, decision rules). They record choices
the reference had to make, so that the measured runs are judged against the method as built.

1. **Horizon.** Every factor of a state stays in the closed ball of radius 8 about the origin.
   - In hyperbolic geometry this is hyperbolic distance; at curvature 0 it is Euclidean distance.
   - A point that leaves the ball, after a step or after the membrane, is moved radially back onto it: the nearest point of the ball.
   - It is needed because in B1 and B2 only a point's direction is decoded, so particles can drift outward without limit. Beyond hyperbolic distance about 17 the exact snap's 2^-24 grid, and float64 hyperboloid coordinates, can no longer hold a point.
   - The projection never lengthens a step (H2 still holds) and never changes a decoded answer.
2. **B3 charts.** In B3 each particle is held in the frame of a tree node near it, and re-anchored after every step (a tiling-based coordinate model).
   - It is needed because at depth 8 (distance about 24) float64 coordinates measured from the root lose the sheet constraint.
   - The step is unchanged (H4), and B3's curvature-0 counterpart uses the same anchoring, with straight-line steps in the anchor's tangent plane.
   - The membrane is not used on B3, since it would mix points of different charts; B3 runs with the clutch on "free".
3. **polystep on B3.** The library's `PolyStep` has no re-anchoring hook. On B3 it searches the root chart and is limited by float64 beyond distance about 18 (depth 6). It is the secondary baseline; C1 is decided against curvature 0, which is anchored.
4. **Counting.** polystep's evaluations are counted by wrapping its objective, since its default polytopes differ from the orthoplex. The final scoring of its particles is not counted. It keeps no incumbent; its best final particle is certified.
5. **The snap rounds halves up** (`floor(x + 1/2)`), as the browser's `Math.round` does, so the two implementations agree on every grid point.
