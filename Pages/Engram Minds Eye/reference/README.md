# Engram Mind's Eye · Python reference

The reference decides every claim in `../PREREGISTRATION.md`. It is built in Phase 2; in Phase 0 this folder
holds only the golden corpus and this skeleton.

## Layout (planned)

| Path | Holds | Phase |
| --- | --- | --- |
| `golden/make_golden_v1.cjs`, `golden/engram_v1.json` | The E1 target, computed from Owl Academy's files | 0 · done |
| `engram/ttmpt.py` | The engram/1 key: Mulberry32, the letter grids, XOR crystallization, Hamming distance, chiral key, J, both tokenizers | 2 |
| `engram/packet.py` | Owl Academy's 128-bit packet chain (kept for compatibility), the Form 5 tiles, SHA-256 memory words | 2 |
| `engram/address.py` | The 28-letter norm-5 address, the chain quaternion and its unfolding | 2 |
| `engram/memory.py` | The window on the clock, the GF(2) triple-quad word, the Lemma 15 Merkle chain, locate and repair | 2 |
| `engram/gauge.py` | The Proposition 7.14 gauge and the lock | 2 |
| `engram/register.py` | The register: blocks, groups, products, the compensator, the engagement pump | 2 |
| `tests/` | One test file per module, each claim with its control | 2 |
| `traces/`, `run_traces.py` | Seeded traces the browser core must reproduce (Phase 3) | 2 |
| `run_claims.py` | The runs that decide E1–E9, written to `results/` | 2 |

## Dependencies

- Python 3.11 or later, `numpy` and `pytest` (`requirements.txt`).
- The exact modules of Hyperbolic PolyStep's reference (`../../Hyperbolic Oracles/reference/hpstep`): `prng`,
  `exact`, `frames3d`, `decode3d`, `twin3d` and `fence`. They are imported in place, never copied, which needs
  decision D7 first: `hpstep/__init__.py` must import lazily, because today it imports `step.py`, which needs
  torch and polystep.
- The orbital code (exact core, tiles, Merkle chain, gauge, pump) is ported line by line from
  `scripts/geometric-build/orbital_core.js`, extracted in Phase 1 (decision D2), and checked against it.
