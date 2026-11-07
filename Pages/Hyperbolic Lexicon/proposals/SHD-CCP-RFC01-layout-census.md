# Proposal to SHD-CCP: a census of 64-bit tile layouts, and a request to settle RFC 01

**Status:** proposal only. Nothing in the SHD-CCP repository was changed. Written by the Hyperbolic Lexicon project
(Ebayednoob, `Pages/Hyperbolic Lexicon/`) in its Phase 0, from a read-only survey of four repositories at
Ebayednoob 7b10514, Owl-Academy 7f45f35, BioChain-AI c975161 and SHD-CCP 97d90ac. The census is a reading of code
and documents, not a measurement. It was finalised after the Lexicon's Phase 3, which adds the **measured** results
in the last section (`reference/results/claims-phase3.json`, commit 865791f, on the code committed at 6da04be). What
we ask is still **proposed**.

## The problem

There are at least eight different bit layouts for the 64-bit SHD-CCP "Einstein tile". They are not compatible.
The SHD-CCP Kernel Ontology already records one of the clashes as an open decision
(`SHD-CCP_Kernel_Ontology/README.md`, lines 79–81).

The check word `9841D88D8B003CEA` is the word `crystallize` gives for the bytes 0..59. Owl Academy, BioChain-AI and
Ebayednoob all pin it. Under the eight readers it decodes to four different forms:

| # | Layout | Where it lives | Form field | Form of `9841D88D8B003CEA` |
| --- | --- | --- | --- | --- |
| 1 | RFC 01 draft tile: South Halo 63..56, Form 39..36, 52 opaque payload bits | `geometric-engine-spec/rfcs/01_einstein_tile_64bit.md`; all six language bindings | 39..36 | 8 |
| 2 | Kernel Ontology header | `00_Ontology_Core/base_64bit_tile.json` | 63..60 | 9 |
| 3 | Blackwell block: form 63..60, even parity 59, spin 58..56, quat32 55..24, payload16 23..8, freq 7..3, amp 2..0 | Owl `scripts/biomesh.js`; BioChain-AI `src/biomesh/biomesh.js` and `protocol/shdccp_kernel.py`; Ebayednoob `biochain_v1.js` and `lattice_seed_v1.js` (verbatim pins) | 63..60 | 9 |
| 4 | genesis.js `BLACKWELL_SCHEMA`: the same field widths as 3 in another order (ST, PT, PL 58..48, CO 47..16, PL 15..11, FR 10..6, SP 5..3, AM 2..0) | `genesis/assets/genesis.js`, lines 4–15 | 63..60 | 9 |
| 5 | Explainer "Z-slabs": four 16-bit slabs; in the toroidal mode Form sits at 47..44 | `assets/explainer.js`, lines 17–55 | 47..44 | 13 |
| 6 | Geometric Calculator V2: Halo 63..56, Gate 55..48, Ctrl 47..32, Core 31..0 | `Geometric Calculation/Geometric_calculator (V2).html` | none (gate byte 55..48 = 65) | — |
| 7 | Ebayednoob orbital `packTile`: step 63..61, wheel 60..58, struct 57..56, gate 55..48, mux 47..44, form 43..40, slot 39..36, scale 35..32, core 31..0 | `scripts/geometric-build/orbital_core.js`, lines 380–388 | 43..40 | 8 |
| 8 | Owl `text_to_codex`: FP16 scaler 63..48, freq 47..43, spin 42..40, form 39..36, amp 35..33, parity 32 (over the quaternion bytes only), W X Y Z FP8 31..0 | Owl `Library/Experimental_Systems/Ontological_Codex/text_to_codex.py`, lines 127–160 | 39..36 | 8 |

In the Blackwell reading, the word's fields are: parity bit 1 (the total parity of all 64 bits is even), spin 0,
quat32 `41D88D8B`, payload16 60 (the chunk length), freq 29, amp 2.

## Form IDs are exhausted

Every one of the 16 Form values already means something to at least one consumer:

- **Owl Academy** (`BIOMESH_SYSTEM.md`, lines 295–302):
  - geometry: 0 point, 1–5 the Platonic solids, 6 hypercube, 7 E8;
  - gates: 8 HALT, 9 SEED, 10 ROT, 11 XFOLD, 12 MIRROR, 13 SPLIT, 14 MERGE, 15 LINK;
  - form 9 is also the data crystal of `crystallize()`, told apart from the SEED gate only by a flag;
  - the codex opcodes reuse 0–2 (HALT, GEAR, PRIME).
- **BioChain-AI's Nested Harmonic Cocoon** (`protocols/docs/biochain_kernel_mapping.md`): 12 ENTRAIN, 13 SYNC, 14 BIOFRAME.
- **SHD-CCP:**
  - RFC 01 and the tutorial give Form 5 a meaning (geometric pointer / codex amplification);
  - genesis.js names all 16;
  - the Ontology splits them into four domains (Telemetry 0–3, Geometric Pointers 4–7, Codex Semantics 8–11, Memory Offload 12–15).

So a new kind of data, such as a language kernel, cannot be told apart by its Form nibble. It needs a namespace above the
word.

## What we ask

1. **Decide whether RFC 01 adopts the Blackwell layout,** or record why not, and name who owns the decision. Every
   working codec in the three repositories uses Blackwell (layout 3). It agrees with the Ontology's header at 60–63.
   RFC 01's Form at 36–39 is used only by the draft bindings and their golden vectors.
2. **Give the stream, not the word, a kind field.** A `kind` (or `streamVersion`) in the stream or record header
   tells readers what the words mean. BioChain-AI's `publishBiochain` currently drops `meta.kind`.
3. **Record in the Ontology which consumers claim each form,** so that collisions are visible before a kernel is
   proposed.

## What Hyperbolic Lexicon does meanwhile

- **At the boundary with Owl Academy and BioChain-AI,** it writes the Blackwell word exactly as the pinned codec
  writes it, in unmodified `shdccp/2` streams, and never emits a new form inside them. **Measured (L8, supported for
  its JS grower and its Python port):** on 148 shards of WordNet's noun synsets and 20 synthetic shards, each grown
  with engrams off and on, none of its 336 records differs from Owl Academy's own `growBiochain` in any of the fifteen
  record fields. BioChain-AI's grower gives the same records. That includes every chunk whose crystal holds a 0x80
  byte (189 in the WordNet shards, 32 in the synthetic ones), where BioChain-AI's Python kernel writes a different
  word (L8's control 1: the stream differs on 20 of 20 synthetic shards).
- **For its own records,** it names data by record kind, never by a Form nibble. `LVOCAB/1`, `LADDR/1`, `LPREP/1`,
  `LCORPUS/1` and `LGROW/1` are now built in JavaScript and Python. The `LVOCAB/1`, `LADDR/1` and `LPREP/1` strings
  are identical in the two languages (L8(d)), and so are the manifest's roots and proofs (L9). `LBENCH/1` is defined
  when the Lexicon's Phase 4 first uses it. These kinds live above the word, as item 2 above asks of SHD-CCP.
- **It never calls Engram Mind's Eye's internal Form 5 tiles SHD-CCP-conformant.** They use layout 7.
