# Engram Mind's Eye · a standalone build on the PolyStep and orbital stack

**Status: plan, plus two feasibility spikes. Nothing below is built yet.**

This folder plans a standalone version of Owl Academy's engram memory and Mind's Eye: the STRIX familiar,
the engram codec and the 3D lattice. Today they run on the S.P.I.R.E. side of Owl Academy. The plan
rebuilds them in this repository on the systems made here over the past weeks:

- **2D:** the Zero-Point Tri-Engine and Tri-Engine Convergence (`Pages/Geometric Calculator/`), and
  Hyperbolic PolyStep version 1 in H² (`Pages/Hyperbolic Oracles/simulation.html`);
- **3D:** Hyperbolic PolyStep version 2 in H³: the 3D decoder, frames, the coupler and the twin system
  (`Pages/Hyperbolic Oracles/simulation-3d.html`).

This is not the Nested Harmonic Cocoon's *Mind's Eye Interface* (`Pages/Nested Harmonic Cocoon/Minds Eye Interface/`),
which is a different page about cymatics and the Enochian grid.

## The recommendation in brief

1. **Freeze the engram key and change nothing in it.** The TTMPT core (Mulberry32, the 8×8 grids, XOR
   crystallization, Hamming distance, chiral key, torsion J) is copied verbatim and pinned with golden vectors,
   so chains, seeds and exports still move between the two repositories. `spikes/ttmpt_core_v1.js` is that
   copy, and it reproduces Owl Academy's vectors.
2. **Replace the float quaternion layer with this repository's exact one.** Each 64-bit engram becomes an
   exact address in PolyStep's norm-5 quaternion tree: one integer quaternion, decoded back by right
   division. A whole chain becomes one quaternion that unfolds in order with no loss. Spike B measures this.
3. **Use the tri-engine memory for the context window.** The three-packet window α, β, γ becomes three
   channels on the zero-point clock, with Y = α ⊕ β ⊕ γ as the fourth cell: a triple-quad word over GF(2).
   It has the same Merkle chain and the same Lemma 15 locate-and-repair as Tri-Engine Convergence.
4. **Put the Mind's Eye in H³ as the twin system.** The human stream and the STRIX stream become the two
   structures. The coupler's binding B = q₂q₁ is checked exactly at every zero point. Each packet's
   quaternion becomes its frame.
5. **Build it the way Hyperbolic PolyStep was built:** Python reference, then the browser core with trace
   parity, then the pages, explainers, preregistered runs and the map. Firebase, seals, biochain publishing
   and BERT stay out of the core and become optional bridges.

## 1. What exists in Owl Academy

| Source (Owl-Academy repository) | What it does |
| --- | --- |
| `Library/Experimental_Systems/Engram_Mind_Eye.html` | STRIX. The TTMPT core, a three-packet window α/β/γ, a 128-bit packet per token (header: 32-bit codex parity · body: the 64-bit grid · footer: 32-bit triangulation), the text crystal, 72- and 720-section exports, BERT fill-mask replies, localStorage, and a Firebase-bound familiar manifold N/K/T |
| `Library/Experimental_Systems/Engram_Codec/engram_codec.py` | The memory-offload codec. Fixed-axis quaternion deltas, block telescoping, Smallest-Three FP8, equal-share SLERP. Block boundaries are exact to about 1e-15; detail inside a block is lossy |
| `Library/Experimental_Systems/Ontological_Codex/` | The 720 → 72 → 10 three-scale delta chain |
| `mage_tower/Biomesh_Mind_Eye_3D.html`, `scripts/biomesh.js` | The 3D Mind's Eye. A 64-bit SHD-CCP word `form·parity·spin·quat32·payload16·freq·amp`, `LATTICE-SEED/1`, the 64-cell fractal seed, a 720-frame breath pump, fold programs and `ENVIRONMENT/1`; publishing goes through Firestore biochains and seals |
| `Library/SPIRE/SPIRE_Manual.html`, `Library/Experimental_Systems/Spire_Mesh/` | The S.P.I.R.E. model: a validated Core, a sovereign Biostrata and the Hypersim substrate between them. Spire Mesh is the measured node design |

In code, the quaternion side of S.P.I.R.E. is spread over three places:

- the `quat32` field of the SHD-CCP word: a float quaternion folded from a hash into four signed bytes,
  lossy and not invertible;
- the Engram Codec's fixed-axis rotations, kept on one axis so they commute;
- the consensus layers.

None of the three is exact, and they share no module.

## 2. What this repository already provides

| Need | Already built here | Where |
| --- | --- | --- |
| Exact arithmetic | Rationals on BigInt, tracks A (float), B (exact), C (snap to 2⁻ᵏ) and R (residues) | `Hyperbolic Oracles/hyperbolic_core.js` |
| A clock | The 8-step zero-point cycle, the 24-frame joint cycle, onload at frames 18/10/2 and offload at 6/22/14, three channels | `hyperbolic_core.js` (`TriChannel`), `Zero Point Calculations/zero_point_tri_engine.html` |
| A register | 720 frames closing with the pump identity H = Q₈·Q₁₀·P = P⁻¹ (720 → 72 → 10) | `zero_point_tri_engine.html` (`pumpOf`, `closeRegister`); `X.pumpHolds` in the core |
| Memory | SHA-256 memory words chained at each zero point; triple-quad words (A, B, C, Y = A + B + C) at 30 addresses with a Merkle chain and Lemma 15 locate and repair | `memoryWord` in the core; `Galactic Lensing/tri_engine_convergence.html` |
| A wire format | 64-bit Einstein tiles (`packTile`/`decodeTile`). Form 3 carries a binary32 value; Form 1 carries a Hurwitz quaternion with an honest loss flag | `zero_point_tri_engine.html` |
| Exact quaternions | Cayley map; the norm-5 tree (`P.wordQuaternion`, `P.rightDivide`); frames transported with no square root; twist = triangle area; the coupler law with B = q₂q₁ invariant (K1) and carry bit-identical to no coupler (K2) | core, `decoder3d.js`, `twin3d.js` |
| Hyperbolic placement | Tree embeddings in H² and H³ (the octahedral norm-5 tree, τ = ln 7), decoded exactly | core (`TreeEmbedding`), `decoder3d.js` (`TreeEmbedding3D`) |
| Outlier detection | The 0.7 Claude fence in H² and H³ | `fence.js`, `claude-fence-3d.html` |
| A way of building | Python reference → browser core → trace parity → pages → explainers → preregistration → map and claims ledger | `Hyperbolic Oracles/README.md` |

Both repositories already use the same three scales. Owl Academy's Ontological Codex chain is
720 → 72 → 10, and so is this repository's register pump. The 72- and 720-section exports and the
720-frame breath pump therefore line up with the zero-point register without any rescaling.

## 3. Findings

### Measured (`spikes/`, outputs captured beside the scripts)

**Spike A, the engram key** (`node spikes/engram_core_audit.cjs`, 15/15 checks pass):

- The verbatim copy reproduces Owl Academy's golden vectors: `GEODESIC → 5c896a4801c9c24c` and
  `chiralKey(STRIX) = O1::S::48d835dfdfc5484e`. Compatibility is achievable.
- **An engram is the parity of each letter's count.** The 26 letter grids are independent over GF(2), so at
  most 2²⁶ of the 2⁶⁴ keys can occur. Two words share an engram exactly when their letter-count parities
  agree. `LISTEN` = `SILENT`, `EYE` = `Y`, `ABBA` = the empty word, and every numeric token (`720`, `2026`)
  is the zero engram.
- Distances between distinct words look random: mean 32.4 of 64 over 190 pairs. Owl Academy's own notes say
  the same: Hamming recall works for near-duplicates and fails for meaning.
- The window works as a triple quad over GF(2). Lose any one of α, β, γ, and it is rebuilt exactly from the
  other two and Y.

**Spike B, quaternion addresses** (`node spikes/quaternion_address.cjs`, 8/8 checks pass; it uses the
PolyStep cores as they are):

- 64 bits fit in a reduced word of 28 letters in the six generators 1 ± 2i, 1 ± 2j, 1 ± 2k, because
  5²⁸ > 2⁶⁴. That word is one integer quaternion of norm 5²⁸, with components of at most 33 bits.
  Right division recovers it: 2000/2000 random words round-trip.
- A chain of 40 packets becomes **one** quaternion and unfolds back in order, 40/40 exact. The order
  matters, which the XOR crystal cannot express. This is exact storage, not compression: 5,204 bits hold
  2,560 data bits. Compression only comes from the lossy Form 1 offload, and its loss flag says so.
- Every prefix of the word is a node of the 3D decoder's tree in H³. In floating point, placement decodes
  cleanly to depth 12 (50/50) and fails from depth 14 on (36/50 at 14, 9/50 at 16, 0/50 at 18). So the full
  address stays exact, and only a short prefix is drawn as a point.
- The packet quaternion is an exact rotation (RᵀR = I in rationals), and the coupler law holds on it.

### Read from the code

| Owl Academy piece | Finding | Consequence here |
| --- | --- | --- |
| `parityOk` in `logPacket` | It recomputes the same expression from the same inputs, so it is always true | Keep codex parity as a v1 field. Do integrity with SHA-256 memory words and the Merkle chain |
| Codex parity `fold32 ⊕ rotl32` | Linear and unkeyed, so anyone can recompute or forge it | Same as above |
| `EPOCH_LIMIT = 128`, `biochain` | Declared and persisted, but no epoch is ever grown on the page | Epochs become 720-frame registers |
| 72/720 export `quaternion_chain` | Each slot holds an XOR grid; it contains no quaternions | Each slot holds the exact chain quaternion of its packets |
| Engram Codec | Kept on one axis so rotations commute; block boundaries reach about 1e-15 | Integer quaternion products are exact (zero error) and need no fixed axis |
| `hpstep` package | `import hpstep.frames3d` pulls in torch and polystep through `__init__.py` | Make `hpstep/__init__.py` lazy (Phase 1 prerequisite) so the exact modules import on their own |
| Two 64-bit formats | Owl's SHD-CCP word and this repository's Einstein tile differ field for field, though both give 32 bits to a quaternion | Use one inside, translate at the bridge (decision 2) |

## 4. The design

The standalone system has five layers. Each row says what it replaces and what it reuses.

| Layer | Owl Academy piece | Standalone replacement | Reuses |
| --- | --- | --- | --- |
| L0 Key | TTMPT core | Unchanged: `engram/1`, pinned by golden vectors | `spikes/ttmpt_core_v1.js` |
| L1 Packet | 128-bit packet; `quat32` | The 128-bit packet kept for compatibility, plus an exact **address** (a 28-letter norm-5 word, one integer quaternion). On the wire: Einstein tiles, with Form 1 when only the compact, lossy direction is kept | `P.wordQuaternion`, `P.rightDivide`, `packTile`, `hurwitzEncode` |
| L2 Memory | α/β/γ window, codex parity | Three channels on the zero-point clock. Y = α ⊕ β ⊕ γ on the inner manifold makes a triple-quad word over GF(2). The Merkle chain locates one altered cell and the parity rebuilds it. A SHA-256 memory word is chained at every zero point | `TriChannel` schedule, `memoryWord`, convergence memory (`rebuild`, `locate`, `repairAll`) |
| L3 Register | Epochs, text crystal, 72/720 export, Engram Codec | The 720-frame register closing with the pump identity. Slots at 720 → 72 → 10 hold exact chain quaternions. The text crystal stays as a v1 field beside the ordered chain quaternion | `pumpOf`, `closeRegister`, `X.pumpHolds` |
| L4 Geometry | SVG string-art manifold; Three.js lattice; breath pump | **2D:** the five-tier toroidal engines. A packet onloads on T4 and latches on T0, with memory beads on the manifolds, and the memory's structure tree (register → section → packet) is laid out in H² by PolyStep's tree embedding. **3D:** the same tree in H³, a frame per packet from its quaternion, human and STRIX as the twin system bound by the coupler (a third memory chain), and the breath pump timed by the zero-point clock with coupling by exact quadrance | `tri_engine_convergence.html`, `TreeEmbedding`, `TreeEmbedding3D`, `twin3d.js`, `tqf` |
| Out of core | Firebase familiar binding, seals, biochain publishing, BERT | Optional bridges: import and export JSON; replies by retrieval in the core, with BERT or an API as an attested plugin | Page chrome sign-in only for the menus |

**Position and frame are kept apart on purpose.** A packet's *position* in H² or H³ is where it sits in
the memory: its register, section and slot. That is a short word, so it decodes in floating point, and
PolyStep's tree embedding is built for exactly this. Its *frame* is what it holds: the exact quaternion of
its 28-letter address. Engram bits behave like a hash, so placing packets by their content would scatter
them at random. Placing them by structure gives a map you can read.

**Where PolyStep does work here:** laying out the memory tree (B3, Helix A proposes and Helix B certifies
exactly), keeping time (the clock and the register), and binding the two streams (the coupler). The fence
does not get a role in version 1. It needs positions that carry content, and engram/1 cannot supply them.
It joins with engram/2, if that is built (see Scope).

## 5. Build order

Every phase ships the repository's five things: code, an explainer, a map node, a ledger row and tests.

| Phase | Delivers | Status |
| --- | --- | --- |
| 0 · Scaffold | This plan; the hub `index.html` with its system map and claims ledger; `PREREGISTRATION.md` with claims E1–E6 and their decision rules, fixed before any code | next |
| 1 · Python reference | `reference/engram/`: `ttmpt.py` (v1 port with golden vectors), `packet.py` (128-bit packet, SHA-256 memory words), `address.py` (norm-5 addresses, chain quaternion), `memory.py` (GF(2) triple quad, Merkle chain, Lemma 15), `register.py` (the schedule and 720 → 72 → 10). Tests and traces. Prerequisite: the lazy `hpstep/__init__.py`, with PolyStep's 80 tests still green | planned |
| 2 · Browser core | `engram_core.js` (UMD; loads `HPCore`, `HPDecode3D` and `HPTwin3D` from `../Hyperbolic Oracles/`), `tests/parity-engram.cjs`, and a live parity check in a page | planned |
| 3 · The 2D page | `mind-eye.html`: STRIX on the zero-point clock; the window as three channels; the memory panel (alter, locate, repair); register closure; exports (v1 byte-compatible, and v2) | planned |
| 4 · The 3D page | `mind-eye-3d.html`: the memory tree in H³, a frame per packet, the twin system and the coupler chain, the breath pump on the clock, and `LATTICE-SEED/1` import | planned |
| 5 · Bridges | Import Owl Academy exports (`engram_chain`, `engram_text_chain` at 72 and 720, a biochain's `engramStream`, `LATTICE-SEED/1`, `ENVIRONMENT/1`); export v1 so a chain grown here loads back in Owl Academy | planned |
| 6 · Preregistered runs | E1–E6 with controls | planned |
| 7 · Integration | Menus in `scripts/page-chrome-targets.json`; cross-links from the Hyperbolic Oracles hub and the Geometric Calculator menus | planned |

Claims for the preregistration:

- **E1:** engram/1 is bit-identical to Owl Academy on a golden corpus.
- **E2:** the chain quaternion recovers every packet exactly, for any chain length.
- **E3:** the triple-quad memory locates and repairs any single altered cell. Two altered cells are detected
  but cannot be repaired (two unknowns, one equation).
- **E4:** every 720-frame register closes with the pump identity.
- **E5:** the coupler binding is unchanged at every zero point (K1), and carry is bit-identical to running
  without the coupler (K2).
- **E6:** Hamming recall finds near-duplicates against a shuffled-key control. It is stated in advance to be
  weak on paraphrase.

## 6. Decisions before Phase 1

1. **Location.** Recommended: its own system here (`Pages/Engram Minds Eye/`, with its own menus), loading
   the oracles' cores by relative path so there is one copy of each. The other option is a module inside
   `Pages/Hyperbolic Oracles/`.
2. **Wire format.** Recommended: Einstein tiles inside this system, with Owl Academy's SHD-CCP word only at
   the bridge.
3. **Compatibility.** Recommended: freeze engram/1. An order-aware key that keeps digits would be engram/2,
   with its own preregistration, and never a silent change to v1.
4. **Replies.** Recommended: retrieval only in the core (reproducible). BERT or an API comes as a plugin
   whose turns are logged as attested, the way Owl Academy's Language Growing page does it.
5. **`hpstep` import.** Recommended: make `__init__.py` lazy (PEP 562 `__getattr__`) rather than copy
   `exact.py`, `frames3d.py` and the tree functions into a second package.

## Scope

Exact here means exact bookkeeping: addresses, chains, memory words, registers and frames. It does not make
recall semantic. Engram/1 is a key built from letter-count parities, and no geometry placed on top of it
adds meaning. Meaningful positions, and with them the fence as a novelty detector, need engram/2 or another
key, and that is a separate experiment with its own controls.

## Files

| Path | Holds |
| --- | --- |
| `README.md` | This plan |
| `spikes/ttmpt_core_v1.js` | The TTMPT core, verbatim from Owl Academy (`Engram_Mind_Eye.html`, lines 599–657, commit 9082520), as a UMD module |
| `spikes/engram_core_audit.cjs`, `spikes/engram_core_audit_output.txt` | Spike A: the engram key, measured |
| `spikes/quaternion_address.cjs`, `spikes/quaternion_address_output.txt` | Spike B: engrams as exact quaternion addresses, measured on the PolyStep cores |
