# Hyperbolic PolyStep

Gradient-free training, and a multi-channel combinatorics solver, in hyperbolic space. The project has three parts:

- [polystep](https://github.com/anindex/polystep)'s optimal-transport step (An T. Le, TMLR 2026, Apache-2.0);
- the exact hyperbolic geometry of *The Geometric Engine of Time: The Zero-Point Cycle*;
- the three engines of the Zero-Point Tri-Engine, used as three solver channels.

Open [`index.html`](index.html) for the hub. It holds the system map, the explainer library, the roadmap and the claims ledger.

## Status

| Phase | Delivers | Status |
| --- | --- | --- |
| 0 · Scaffold | Hub, system map, four explainers, preregistration, reference skeleton; the calculator's build sources moved to `scripts/geometric-build/` | done |
| 1 · Python reference | `reference/hpstep`: the hyperbolic step on polystep's own solvers, B1–B4 with exact Helix B, three channels on the clock; 80 passing tests (H1–H7, parity with polystep); `traces/`; the benchmark runner; Amendment 1 to the preregistration | done |
| 2 · JavaScript core | `hyperbolic_core.js` (no dependencies) and `parity.js`: 169/169 trace lines match, in Node (`node tests/parity.cjs`) and live in the browser | done |
| 3 · Simulation page | `simulation.html`: three channels live on the zero-point clock for B1–B4, written on the browser core (not the Zero-Point template); exact register pump, Helix B, memory chain, on-load self-test (105/105; 169/169 in full); settings by address; the simulation manual | done |
| 4 · Proofs and results | `explainers/proofs-and-results.html`: full proofs of Lemma S and H1–H7, checked live (`proofs.js`); T1 reduced, still open. The preregistered benchmarks were run under Amendments 2 and 3 (7,740 runs, results in `reference/results/`). C1 refuted, C2 supported, C3 refuted; the B3 control passes | done |
| 5 · Integration | Site bar, cross-links, documentation | next |

## Version 2 · three dimensions, two structures bound by a coupler

Version 2 moves the search into H³. Two structures of three engines each (six calculations) are bound by a coupler
that turns the particles' frames, never their positions, with a steer/carry switch. See
`explainers/decoder-3d.html#v2`.

| Phase | Delivers | Status |
| --- | --- | --- |
| A · 3D decoder | `reference/hpstep/decode3d.py`, `decoder3d.js`: anchor decoders exact on floats (D1–D5), the octahedral norm-5 tree in H³ with exact frames, τ = ln 7 (E1–E3), the four problems in H³; 26 tests; trace `reference/traces/decode3d.json` (`run_traces3d.py`), parity 28/28 (`node tests/parity3d.cjs`) | done |
| B · Frame layer | `reference/hpstep/frames3d.py`: quaternion frames carried exactly by transvections, with no square root; a twist is a triangle's area (F1, F2, S) | done |
| C · Coupler | `reference/hpstep/twin3d.py`: the mirror law q₁ ← w q₁, q₂ ← q₂ w⁻¹ keeps B = q₂q₁ fixed (K1); the steer/carry/off switch; carry bit-identical to no coupler (K2) | done |
| D · Two structures | The twin system, two tri-channels in H³ on one clock with three memory chains; `twin3d.js` matches the exact twin trace 21/21 (`node tests/parity-twin.cjs`); `simulation-3d.html` | done |
| E · Preregistered runs | A new preregistration with controls (off, carry, no mirror) | next |

## Files

| Path | Holds |
| --- | --- |
| `index.html` | The hub |
| `explainers/hyperbolic-step.html` | Explainer 1: the step, a live Poincaré and Klein diagram, the correspondence with polystep, H1–H7 |
| `explainers/channels.html` | Explainer 2: three channels on the zero-point clock, packets, schedule, pairing, clutch, membrane, pump |
| `explainers/benchmarks.html` | Explainer 3: decoders, the preregistered benchmarks, the boundary chart |
| `explainers/build-and-verify.html` | Explainer 4: pipeline, four arithmetic tracks, trace parity, test plan |
| `explainers/reference-guide.html` | Explainer 5: the Python reference, its module map, tests, findings, traces and runner |
| `explainers/core-reference.html` | Explainer 6: the browser core, with a live parity check and three channels running in the page |
| `explainers/simulation-manual.html` | Explainer 7: the simulation page's wiring, every control and panel, the exact track, experiments |
| `explainers/proofs-and-results.html`, `proofs.js` | Explainer 8: proofs of H1–H7 with live checks, T1, the benchmark results and decisions |
| `explainers/decoder-3d.html`, `decoder3d.js`, `tests/parity3d.cjs` | Explainer 9 and version 2 phase A: the 3D decoder, its browser port and parity |
| `explainers/coupler-3d.html`, `twin3d.js`, `tests/parity-twin.cjs` | Explainer 10 and version 2 phases B–D: frames, the coupler, the twin system, and the 3D simulation's manual |
| `simulation-3d.html` | The 3D simulation: two structures of three engines bound by the coupler (e.g. `simulation-3d.html?mode=carry&wrong=1`) |
| `simulation.html` | The simulation: three channels on the zero-point clock, live (e.g. `simulation.html?prob=B1&size=30&exact=1`) |
| `hyperbolic_core.js`, `parity.js`, `tests/parity.cjs` | The browser core, the trace replay, and its Node runner |
| `assets/hp.css` | Shared style |
| `assets/hp-map.js` | The system map data (nodes and edges) and its chart renderer |
| `PREREGISTRATION.md` | Benchmarks, budgets and decision rules, fixed before any code runs |
| `reference/` | The Python reference: `hpstep/`, `tests/`, `traces/`, `run_traces.py`, `run_bench.py` |

## Adding a module

Every module ships with five things, so the explainers and charts stay complete:

1. **The code.**
2. **A full explainer** in `explainers/`, built on `assets/hp.css`. It opens with its focused chart, `<div data-hp-map="focus" data-node="…">`.
3. **A node in `assets/hp-map.js`**, with its edges and explainer link. Every chart in the folder is drawn from that list.
4. **A row in the hub's claims ledger** for anything it claims, with a status tag.
5. **Tests**, plus a line in this README.

To change a node's status when it is built, edit its `status` in `assets/hp-map.js`. The status is one of `design`, `next`, `planned` or `done`.

## Scope

Nothing here bears on P versus NP. The step is a heuristic proposer (the paper's Helix A), checked by an exact certifier (Helix B). The paper's Theorem 5.11 and Propositions 5.9 and 5.13 mark the boundary, which `explainers/benchmarks.html#boundary` charts.
