# Python reference (Phase 1)

The reference implementation, built in Phase 1. It is the authority for every benchmark decision, and the browser core is checked against its traces. The full guide is [`../explainers/reference-guide.html`](../explainers/reference-guide.html).

```bash
python -m pytest -q tests     # 80 tests
python run_traces.py          # traces/*.json for the browser core
python run_bench.py smoke     # every benchmark and method once, tiny sizes (never evidence)
```

## Install

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install --index-url https://download.pytorch.org/whl/cpu torch   # CPU build, much smaller than the default
pip install -r requirements.txt
```

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
| `run_traces.py`, `run_bench.py` | Traces for the browser core; the preregistered benchmarks (smoke, tune, run, decide) |
| `tests/` | pytest suite: H1–H7, parity with polystep, problems, schedule, generator |

The module files live in `hpstep/`; `prng.py`, `hyperbolic.py`, `exact.py`, `step.py`, `problems.py` and `channels.py` are as listed above.

If the PyTorch CPU index is unreachable, `pip install torch` from PyPI works on the CPU too (larger download).
