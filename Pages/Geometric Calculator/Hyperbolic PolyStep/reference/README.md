# Python reference (Phase 1)

This folder will hold the reference implementation. It is the authority for every benchmark decision, and the browser core is checked against its traces. Phase 1 builds it. The planned layout and the checks it must pass are in [`../explainers/build-and-verify.html`](../explainers/build-and-verify.html#reference).

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

## Planned modules

| File | Holds |
| --- | --- |
| `hyperbolic.py` | Lorentz form, boosts, ghost map, Klein and Poincaré charts (float and `Fraction`) |
| `step.py` | The hyperbolic step on polystep's solvers; the curvature-0 switch |
| `exact.py` | Cayley rotations, rational corners, the snap; H1–H7 as exact checks |
| `channels.py` | The 24-frame schedule, pairing, clutch, membrane, pump |
| `problems.py` | Generators, decoders and Helix B counts for B1–B4 |
| `prng.py` | The shared xoshiro128** generator, also implemented in the browser core |
| `run_traces.py`, `run_bench.py` | Traces for the browser core; the preregistered benchmarks |
| `tests/` | pytest suite |
