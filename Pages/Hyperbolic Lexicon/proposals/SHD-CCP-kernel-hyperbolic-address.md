# Proposal to SHD-CCP: kernel 0xA, the Hyperbolic Address Tile

**Status:** proposal only. The kernel file `kernel_0xA_hyperbolic_address.json` sits in this folder. It is aimed at
the Kernel Ontology's `01_Incubator_Experimental/proposed_codex/` at status `[OPEN]`, and nothing was added to the
SHD-CCP repository.

## What it carries

The kernel holds one word of the **norm-5 quaternion tree**:
- the tree's generators are 1+2i, 1−2i, 1+2j, 1−2j, 1+2k, 1−2k;
- a word is reduced when no generator is followed by its own conjugate;
- the root has 6 children and every other node 5;
- a word of length L is the integer quaternion obtained by multiplying its generators, with norm exactly 5^L;
- right division by the generators recovers the word, so the map is invertible.

These six quaternions are the **Lubotzky–Phillips–Sarnak generators for p = 5**. The tree is therefore the same
6-regular tree whose finite quotients X(5, q) are the Ramanujan graphs that RFC 03 plans as an overlay (see
`SHD-CCP-RFC03-exact-Qh-and-LPS.md`).

Each word is also an exact point of hyperbolic 3-space. Ebayednoob's `decoder3d.js` (`TreeEmbedding3D`) steps along
the six octahedral directions with the rational boost t = 3/4 (cosh = 25/7, sinh = 24/7, τ = ln 7). A word of
length n becomes an integer vector over 7^n, and `decodeExact` returns the word from the point.

Hyperbolic Lexicon uses these words as exact, training-free addresses for WordNet synsets and vocabulary tokens.
Its claims L3 and L7 test that the addresses are distinct, invertible and certified, and that address, point and
X(5, q) vertex agree.

## Bit allocation

| Bits | Field | Type | Meaning |
| --- | --- | --- | --- |
| 60–63 | `Form_ID_Header` | multiplexer | 0xA |
| 59 | `Even_Parity` | bool | even parity over the other 63 bits, as in the Blackwell word |
| 0–58 | `Norm5_Address` | residual_array (59 bits) | the bijective mixed-radix id of a reduced word of length ≤ 25 |

The id: id(w) = (number of reduced words shorter than w) + (rank of w among words of its length, with the first
letter in base 6 and later letters in base 5). Words of length ≤ 25 number 1 + 6·(5²⁵ − 1)/4 ≈ 4.47·10¹⁷ < 2⁵⁹, so
they fit in 59 bits. Longer words need continuation tiles; that is left for a version 0.2, once Hyperbolic
Lexicon's L3 has reported how long WordNet's addresses actually are.

## Checked with SHD-CCP's own tooling

`check_kernel.py` runs the Ontology's `lint_kernel` and the two implemented suites on a copy of the kernel, read-only
(`python3 -B -I`):

```
lint_kernel: pass
layout_integrity: pass (3 fields tile bits 0..63 exactly once)
glass_box_round_trip: pass (1000 random round trips and 3 isolation checks)
pending suites (block [PROVEN]): 01_tqf_parity_checks, 02_toda_kogame_stress, 03_merkle_collision
Form IDs already used in the registry: 0x0, 0x1, 0x3, 0x4, 0x6, 0x8, 0xc; 0xA is FREE
```

It can reach `[COMPUTED]` through `validation_bot.py` once moved into the registry. It cannot reach `[PROVEN]` until
the three pending suites are defined and Lemma 5 has a Lean proof.

## Known conflicts

- **Form 10 elsewhere.** Inside Owl Academy's and BioChain-AI's `shdccp/2` streams, Form 10 is the ROT gate
  (`BIOMESH_SYSTEM.md`, line 297). This kernel is never written into those streams; it belongs to the Ontology's
  Codex_Semantics domain (8–11). See `SHD-CCP-RFC01-layout-census.md` for why every Form value is already claimed
  by someone. The alternative 0xB collides with Owl's XFOLD gate in the same way.
- **The header position is open.** The kernel follows the Ontology's header at 60–63. If RFC 01's Form position
  (36–39) wins instead, the kernel must be re-encoded.
- **Dependencies.** `Lemma_5` (Layer II: 4D Hurwitz completeness and the Ghost map) is a suggestion; the
  maintainers should set the list.
- **Hurwitz arithmetic already exists.** SHD-CCP's `HurwitzQuaternion` multiplies these generators exactly in doubled
  coordinates, (2, ±4, 0, 0) and so on. Hyperbolic Lexicon's claim L7(e) tests that its products, halved, equal the
  tree's quaternions.
