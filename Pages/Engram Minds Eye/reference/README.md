# Engram Mind's Eye · Python reference

The reference decides every claim in `../PREREGISTRATION.md` (with Amendments 1 and 2). Built in Phase 2; E10 added in
Phase 7. E11 is decided against Owl Academy's own code by `run_e11.cjs` (Node), as Amendment 2 sets out.

## Run

```bash
pip install -r requirements.txt                 # numpy and pytest; torch is not needed
python3 -m pytest -q tests                      # 45 tests, a few seconds (Node is used for the parity tests)
python3 run_traces.py                           # traces/engram.json, which the browser core reproduces (Phase 3)
python3 run_claims.py --dry                     # exercise the runner on unregistered seeds; writes nothing
python3 run_claims.py                           # decide E1-E9: results/claims.json and results/claims.md
python3 run_followups.py --dry                  # E10 on unregistered seeds (moved up by 3000); writes nothing
python3 run_followups.py                        # decide E10: results/followups.json and results/followups.md
node run_e11.cjs <Owl-Academy checkout> --dry   # E11 on unregistered seeds; writes nothing
node run_e11.cjs <Owl-Academy checkout>         # decide E11 against Owl Academy's code: results/e11.json
```

The unit tests and the traces use seeds of 9000 and above, outside the registered instances, so neither touches
what `run_claims.py` decides. `--dry` moves every seed up by 8000, shrinks every set, and swaps the dialogue store
and the golden session for unregistered stand-ins.

## Layout

| Path | Holds |
| --- | --- |
| `golden/make_golden_v1.cjs`, `golden/engram_v1.json` | The E1 target, computed from Owl Academy's files (Phase 0) |
| `golden/make_owl_v1.cjs`, `golden/exports_v1.json` | STRIX's library (written to `../strix_library_v1.js`) and the byte form of Owl Academy's v1 exports, from its own code (Phase 4) |
| `golden/make_bridges_v1.cjs`, `golden/bridges_v1.json` | The bridges (Phase 6): the Engram Mind Eye's saved session and its continuation, biochains and their verdicts, environments and their hashes, from Owl Academy's code; also writes `../biochain_v1.js` |
| `golden/make_lattice_v1.cjs`, `golden/lattice_seed_v1.json` | LATTICE-SEED/1's codec and hash (written to `../lattice_seed_v1.js`) and their verdicts on three seeds, from Owl Academy's Biomesh page (Phase 5) |
| `engram/ttmpt.py` | engram/1: Mulberry32, the letter grids, XOR crystallization, Hamming distance, chiral key, J, both tokenizers, biomesh.js's engram stream, the 128-bit packet chain |
| `engram/orbital.py` | The orbital pages' code, ported line by line from `scripts/geometric-build/orbital_core.js`: tiers, the 2⁻²⁴ rationalization, tiles, the Merkle chain, frames, TQF, the gauge, the readout, the pump, the clock's constants |
| `engram/address.py` | The 28-letter norm-5 address, the chain word and quaternion, unfolding by right division (hpstep.problems in place) |
| `engram/memory.py` | The GF(2) triple-quad word, its Form 5 tiles, leaves, Merkle chain, parity, locate, rebuild, repair; memory links |
| `engram/clock.py` | The zero-point clock (slots first in, first out), zero-point words, registers with their 72 blocks and 10 groups, the compensator, the engagement pump, the membrane turn |
| `engram/coupler.py` | The mirror-law coupler between the human and STRIX streams (hpstep.frames3d in place) |
| `engram/session.py` | A dialogue run end to end; `outputs()` for the K2 comparison |
| `engram/dialogue.py` | The dialogue store, the golden session, the synthetic dialogues |
| `engram/recall.py` | Hamming recall, the parity-keeping variants and the one-letter substitutions of E9 |
| `engram/watch.py` | The fence screen with the exact address check (E7) and the ln 2 guard (E8) (hpstep.fence and decode3d in place) |
| `engram/guard.py` | The sharper guard of E10: every quadruple scanned at once; the original guard (checked against `hpstep.fence.guard_check`), the matching guard and the smallest-matching control |
| `engram/stats.py` | The bootstrap of the Hyperbolic PolyStep preregistration |
| `tests/` | One test file per module, each claim's mechanics with its control; `test_orbital_parity.py` checks `orbital.py` against `orbital_core.js` through Node (`js_orbital.cjs`) |
| `run_traces.py`, `traces/engram.json` | Exact values the browser core reproduces line for line (`../tests/parity-engram.cjs`, Phase 3): addresses, the schedule, memory words, gauges and readouts, a complete register, the coupler, the watch layer, recall |
| `run_claims.py`, `results/` | The decisive runs and their record |
| `run_followups.py`, `run_e11.cjs`, `golden/owl_eye.cjs` | The follow-up claims of Amendment 2: E10 in Python; E11 in Node against Owl Academy's Engram Mind Eye, run as written by `owl_eye.cjs` (shared with `make_bridges_v1.cjs`) |

## Dependencies

- Python 3.11 or later, `numpy` and `pytest`; Node for the parity tests and for E1's check against the Owl-Academy
  checkout (both reported, neither needed for a decision).
- Hyperbolic PolyStep's exact modules, imported in place from `../../Hyperbolic Oracles/reference` (decision D7):
  `prng`, `problems`, `decode3d`, `frames3d` and `fence`.
- The orbital code is ported from `scripts/geometric-build/orbital_core.js` (decision D2) and checked against it.
