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
