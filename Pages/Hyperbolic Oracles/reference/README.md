# Python reference (Phases 1 and 4)

The reference implementation, built in Phase 1. It is the authority for every benchmark decision, and the browser core is checked against its traces. The full guide is [`../explainers/reference-guide.html`](../explainers/reference-guide.html).

```bash
python -m pytest -q tests                 # 137 tests (37 of them version 2's; 18 the 0.7 Claude fence's)
python run_traces.py                      # traces/*.json for the browser core
python run_bench.py smoke                 # every benchmark and method once, tiny sizes (never evidence)
python run_bench.py tune --jobs 4         # Phase 4: the preregistered tuning -> settings.json, results/tuning_*.json
python run_bench.py run B1 --jobs 4       # Phase 4: the measured runs -> results/B1.jsonl (resumes where it stopped)
python run_bench.py decide                # every decision, summary and the ledger -> results/decisions.json
python run_traces3d.py                    # version 2: traces/decode3d.json and traces/twin3d.json for the browser
python run_traces_fence.py                # the 0.7 Claude fence: traces/fence.json for fence.js
python run_fence_bench.py                 # Part F of the preregistration: 1,800 runs -> results/fence.jsonl, fence_decisions.json
```

The Phase 4 runs follow `../PREREGISTRATION.md` with its Amendments 1 and 2. `settings.json` and `results/` are
committed: they are the evidence the proofs-and-results page shows.

## Install

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install --index-url https://download.pytorch.org/whl/cpu torch   # CPU build, much smaller than the default
pip install -r requirements.txt
```

Only the step needs torch and polystep. `hpstep/__init__.py` loads `step.py` the first time `PolyStepH`,
`StepConfig` or `StepState` is used, so the exact modules (`prng`, `exact`, `hyperbolic`, `problems`, `channels`,
`decode3d`, `frames3d`, `twin3d`, `fence`) import with numpy alone: `test_prng.py`, `test_problems.py`,
`test_fence.py` and `run_traces_fence.py` run without torch, and other systems import these modules in place
(`Pages/Engram Minds Eye`).

polystep 1.1.1 needs Python 3.11 or later and PyTorch 2.8 or later. The reference imports polystep for:

- its orthoplex and rotations;
- its `SoftmaxSolver` and `SinkhornSolver`;
- the Euclidean baseline.

It does not copy polystep's code. See `NOTICE`.

## Modules

| File | Holds |
| --- | --- |
| `hyperbolic.py` | Lorentz form, boosts, ghost map, Klein and Poincaré charts (float and `Fraction`) |
| `step.py` | The hyperbolic step on polystep's solvers; the curvature-0 switch |
| `exact.py` | Cayley rotations, rational corners, the snap; H1–H7 as exact checks |
| `channels.py` | The 24-frame schedule, pairing, clutch, membrane, pump |
| `problems.py` | Generators, decoders and Helix B counts for B1–B4 |
| `prng.py` | The shared xoshiro128** generator, also implemented in the browser core |
| `fence.py` | The 0.7 Claude fence: portable floats, datasets, the Fréchet-median centre, exact radii, mass, fences, certified mass in H³, the four-point guard |
| `run_traces.py`, `run_bench.py` | Traces for the browser core; the preregistered benchmarks (smoke, tune, run, decide) |
| `tests/` | pytest suite: H1–H7, parity with polystep, problems, schedule, generator |

The module files live in `hpstep/`; `prng.py`, `hyperbolic.py`, `exact.py`, `step.py`, `problems.py` and `channels.py` are as listed above.

If the PyTorch CPU index is unreachable, `pip install torch` from PyPI works on the CPU too (larger download).
