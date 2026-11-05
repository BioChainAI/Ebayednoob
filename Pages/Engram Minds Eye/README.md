# Engram Mind's Eye · a standalone build on the orbital calculators, PolyStep and the fence

**Status: Phases 0 to 8 done.** Check everything with `node "Pages/Engram Minds Eye/tests/all.cjs"`.

- **Phase 0 (scaffold):** the hub, the preregistration of E1–E9, the golden corpus pinned from Owl Academy, and four
  feasibility spikes (36/36 checks pass).
- **Phase 1 (shared cores):** the orbital pages' exact code moved into one module,
  `scripts/geometric-build/orbital_core.js`, which the build writes back so the four pages stay byte-identical;
  Hyperbolic PolyStep's exact modules import without torch.
- **Phase 2 (Python reference):** `reference/engram/`, 41 tests with exact parity against `orbital_core.js`, traces
  for the browser core, Amendment 1, and the runner, committed before it ran. **Decisions: E1–E7 and E9 supported;
  E8 inconclusive** (the guard's ln 2 bound exact; naming the corrupted pair right 96 times in 100 at +1.5, where the
  rule asked for 99). See Explainer 4 and `reference/results/`.
- **Phase 3 (browser core):** `engram_core.js`, the whole engram system in one module on `orbital_core.js` and
  PolyStep's browser modules. It reproduces the golden corpus and the reference's traces line for line (829/829)
  and passes the Python tests' 27 behaviour checks, in Node (`tests/parity-engram.cjs`) and live in Explainer 5.
- **Phase 4 (the 2D page):** [`mind-eye.html`](mind-eye.html), STRIX on the clock. Its engine, `Live`, equals the
  reference `Session` turn by turn; STRIX's replies and the v1 exports match Owl Academy's own code (5/5 replies,
  9/9 files byte-identical; `tests/page-engine.cjs`, 26/26). Explainer 6 is its manual.
- **Phase 5 (the 3D page):** [`mind-eye-3d.html`](mind-eye-3d.html), the same dialogue's memory as a tree in H³ with a
  frame per word, the twin system, the crystal, the fence with its exact check on every closing register, the guard,
  the breath, and LATTICE-SEED/1 import pinned from Owl Academy's code (`tests/page3d-engine.cjs`, 19/19). Explainer 7.
- **Phase 6 (bridges):** a session grown here exports as Owl Academy's Engram Mind Eye saves it, and that page
  restores and continues it exactly; Owl Academy's sessions, chains, crystals, biochains, engram streams and
  environments come in, each verified against Owl Academy's own code (`tests/bridges.cjs`, 34/34). Explainer 8.
- **Phase 7 (follow-ups):** Amendment 2 registered E10 and E11 before any code for them. **E10, a sharper guard:
  inconclusive**, its exact parts supported; the matching guard names the corrupted pair exactly when two or more
  quadruples exceed ln 2 (0.965 at +1.5 in E8's setting), so E8's shortfall is a shortage of witnesses. **E11, the
  way back to Owl Academy: supported**, 50/50. Explainer 9.
- **Phase 8 (integration):** the system reached from the rest of the site: a card in `pages.html`, the hub in the
  Hyperbolic Oracles (*Elsewhere*) and Geometric Calculator (*Simulations*) menus, a note and a map node on the
  Hyperbolic Oracles hub, and the names Engram uses from each core recorded in that folder's README. `tests/links.cjs`
  checks every link and way in (31/31, with three controls); `tests/all.cjs` runs every Node check of this system and
  of the cores it loads, then the site bar and the pins (15/15). Explainer 10.

Open [`index.html`](index.html) for the hub: system map, explainer library, roadmap, claims ledger and decisions.

This folder plans a standalone version of Owl Academy's engram memory and Mind's Eye: the STRIX familiar,
the engram codec and the 3D lattice. Today they run on the S.P.I.R.E. side of Owl Academy. The plan
rebuilds them on five systems in this repository:

| System | Where | Role in the Mind's Eye |
| --- | --- | --- |
| **Geometric Harmonics Calculator** (engine v10, one engine, five tiers) | `Pages/Geometric Calculator/index.html` | The per-token pipeline: every token is one calculation from T4 to T0. Its 64-bit Einstein tile is the wire format |
| **Zero-Point Tri-Engine** (three engines on the zero-point clock) | `Pages/Geometric Calculator/Zero Point Calculations/` | The clock for the window α, β, γ: three channels, pairing at the zero point, and a 720-frame register with the 720 → 72 → 10 pump |
| **Tri-Engine Soliton and Tri-Engine Convergence** | `Pages/Geometric Calculator/Galactic Lensing/` | Memory and resonance: the triple-quad word with Merkle locate and repair, the exact gauge of each packet's three distances, and the soliton crystal as the memory's health |
| **Hyperbolic PolyStep** (v1 in H², v2 in H³) | `Pages/Hyperbolic Oracles/` | Exact quaternion addresses, the memory tree laid out in H² and H³, frames, and the twin system binding the human and STRIX streams |
| **The 0.7 Claude fence** (H², H³) and its ln 2 guard | `Pages/Hyperbolic Oracles/fence.js` | A screen for misplaced memories in the H³ layout, settled by an exact address check, and a guard that names a corrupted stored distance |

This is not the Nested Harmonic Cocoon's *Mind's Eye Interface* (`Pages/Nested Harmonic Cocoon/Minds Eye Interface/`),
which is a different page about cymatics and the Enochian grid.

## The recommendation in brief

1. **Freeze the engram key.** The TTMPT core (Mulberry32, the 8×8 grids, XOR crystallization, Hamming
   distance, chiral key, torsion J) is copied verbatim and pinned with golden vectors, so chains, seeds and
   exports still move between the two repositories. `ttmpt_core_v1.js` reproduces Owl Academy's vectors.
2. **Run each token through the five tiers.** On the one-engine calculator a calculation passes ingestion,
   alignment, superposition, pruning and latch. A token does the same: it is crystallized, triangulated
   against the window, folded into the window parity and the chain quaternion, reduced, and written.
3. **Run the window on the three-engine clock.** α, β, γ are Engines I–III. At each zero point the three
   cells pair into a triple-quad word with Y = α ⊕ β ⊕ γ. The Merkle chain and Lemma 15 come from Tri-Engine
   Convergence. Each 720-frame register closes with the pump.
4. **Read every packet through the soliton gauge.** The three Hamming distances from a new token to α, β, γ
   go through the convergence gauge, which is exact and invertible. The soliton crystal sits at the centre
   while parity holds and the chains match, and moves or shears when they do not.
5. **Replace the float quaternion layer with PolyStep's exact one.** Each engram is an exact address in
   the norm-5 quaternion tree, and a chain is one quaternion that unfolds in order. The memory's structure
   is laid out in H² and H³, each packet carries its quaternion as its frame, and the human and STRIX
   streams become the twin system.
6. **Let the fence screen and the address check decide.** The fence flags memories that sit too far out
   in the H³ layout, and an exact comparison with the recorded address settles each flag. The guard names
   any stored distance that has been corrupted.
7. **Build it the way PolyStep was built:** Python reference, then browser core with trace parity, then
   pages, explainers, preregistered runs and the map. Firebase, seals, biochain publishing and BERT stay out
   of the core and become optional bridges.

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
| Exact arithmetic | Rationals on BigInt (`Fraction`, `Q`); tracks A (float), B (exact), C (snap to 2⁻ᵏ), R (residues) | `scripts/geometric-build/orbital_core.js` (was `core.js`), `Hyperbolic Oracles/hyperbolic_core.js` |
| A per-calculation pipeline | Five tiers T4 → T0 (R = 5n² + 15n + 15, r = 2n + 4, W = 16 − 2n), the 30-node clock, 150 pulses per calculation, TQF between the manifolds | engine v10; `TIERS_SPEC` in the build templates |
| A wire format | The 64-bit Einstein tile: halo (step, wheel, structure), gate, ctrl (mux, Form, slot, Fibonacci scale), 32-bit core. Form 1 carries a Hurwitz quaternion with an honest loss flag; Form 4 reads the 64 bits as a 4 × 4 × 4 voxel cube | engine v10 ENGRAM tab; `packTile`/`decodeTile`, `hurwitzEncode` in `page.html` |
| A clock | The 8-step zero-point cycle, the 24-frame joint cycle, onload at frames 18/10/2 and offload at 6/22/14, three branches | `gen4.py`, `TriChannel` |
| A register | 720 frames closing with H = Q₈·Q₁₀·P = P⁻¹ (720 → 72 → 10); clutch modes hold, free-run and membrane | `pumpOf`, `closeRegister` (`gen4.py`); `X.pumpHolds` |
| Memory | Triple-quad words (A, B, C, Y = A + B + C) at 30 addresses, the Lemma 15 Merkle chain, locate and repair; SHA-256 memory words chained at each zero point | `merkleChain` (`page.html`), `rebuild`/`locate` (`page3.html`), `memoryWord` |
| A resonance reading | The Proposition 7.14 gauge (s, X, Y), exact and invertible; the cross-engine TQF with lock at χ = 1/√3; the soliton crystal that stays at the centre while the books balance | `gaugeExact`, `readout` (`page3.html`); `tqf` (`page2.html`) |
| Exact quaternions | Cayley map; the norm-5 tree (`P.wordQuaternion`, `P.rightDivide`); frames transported with no square root; twist = triangle area; the coupler law with B = q₂q₁ invariant (K1), carry bit-identical to no coupler (K2) | core.js, `hyperbolic_core.js`, `decoder3d.js`, `twin3d.js` |
| Hyperbolic placement | Tree embeddings in H² and H³ (the octahedral norm-5 tree, τ = ln 7), with exact points | `TreeEmbedding`, `TreeEmbedding3D` |
| Outliers and corruption | The 0.7 Claude fence (exact in H², certified in H³); the four-point guard at ln 2 that blames pairs | `fence.js`, `claude-fence-3d.html` |
| A way of building | Python reference → browser core → trace parity → pages → explainers → preregistration → map and claims ledger | `Hyperbolic Oracles/README.md` |

Both repositories already use the same three scales. Owl Academy's Ontological Codex chain is
720 → 72 → 10, and so is this repository's register pump. The 72- and 720-section exports and the
720-frame breath pump therefore line up with the zero-point register without any rescaling.

**One infrastructure fact shaped the plan.** The orbital machinery had no module of its own. The tiles and
Merkle chain lived in the Part 1 template (`page.html`), the tiers and TQF in Part 2 (`page2.html`), the gauge
and repair in the Convergence template (`page3.html`) and the pump in `gen4.py`, and `build.py` inlined them
into the four pages. Hyperbolic PolyStep, by contrast, has UMD cores (`hyperbolic_core.js`, `decoder3d.js`,
`twin3d.js`, `fence.js`). Phase 1 gave the orbital code the same shape: `scripts/geometric-build/orbital_core.js`
(see Explainer 3). Engine v10 (`index.html`) is an uploaded export and stays untouched.

## 3. Findings

### Measured (`spikes/`, outputs captured beside the scripts)

**Spike A, the engram key** (`engram_core_audit.cjs`, 15/15 checks pass):

- The verbatim copy reproduces Owl Academy's golden vectors: `GEODESIC → 5c896a4801c9c24c` and
  `chiralKey(STRIX) = O1::S::48d835dfdfc5484e`.
- **An engram is the parity of each letter's count.** The 26 letter grids are independent over GF(2), so at
  most 2²⁶ of the 2⁶⁴ keys can occur. `LISTEN` = `SILENT`, `EYE` = `Y`, `ABBA` = the empty word, and every
  numeric token is the zero engram.
- Distances between distinct words look random: mean 32.4 of 64 over 190 pairs (min 20, max 44).
- The window works as a triple quad over GF(2): any one of α, β, γ is rebuilt from the other two and Y.

**Spike B, quaternion addresses** (`quaternion_address.cjs`, 8/8; uses the PolyStep cores as they are):

- 64 bits fit in a reduced 28-letter word in 1 ± 2i, 1 ± 2j, 1 ± 2k, because 5²⁸ > 2⁶⁴. The word is one
  integer quaternion of norm 5²⁸ (components of at most 33 bits). 2000/2000 round-trip by right division.
- A chain of 40 packets is **one** quaternion and unfolds in order, 40/40 exact. Order matters, which the
  XOR crystal cannot express. It is exact storage, not compression: 5,204 bits hold 2,560 data bits.
- Every prefix of the word is a node of the H³ tree. Float placement decodes cleanly to depth 12 (50/50) and
  fails from depth 14 (36/50 at 14, 9/50 at 16, 0/50 at 18), so the full address stays exact.
- The packet quaternion is an exact rotation (RᵀR = I), and the coupler law holds on it.

**Spike C, the orbital calculators' memory code** (`orbital_memory.cjs`, 9/9; reads the build templates by
name and changes nothing):

- An engram travels as two Einstein tiles, with the structure field set to α, β, γ or Y. All 60 tokens of a
  sample dialogue round-trip with their header fields intact.
- On 58 windows, one flipped bit in any cell is detected by the parity, located by the Part 1 Merkle chain
  and rebuilt by XOR, with the root matching again (58/58 each). Two altered cells are caught by the chain.
  The same bit flipped in two cells passes the parity, which is why the chain is needed.
- The convergence gauge recovers the three footer distances exactly (57/57). Lock, meaning all three
  distances are equal, happened on 1 of 57 packets.
- The Zero-Point pump identity holds on every engram channel. In the Zero-Point Tri-Engine's hold setting,
  where a channel turns only while a packet is in flight, each register leaves a half turn (P = 360/720,
  compensator H = 360/720). In free-run, where every channel turns on every frame, every register closes.

**Spike D, the fence on a memory tree in H³** (`fence_memory.cjs`, 4/4; uses `fence.js` as it is):

- Memories placed two levels too deep are always flagged (5/5 in every run); one level too deep, 4/5 and 5/5.
- At depth 2 nothing at its proper place is flagged (0/37). At depth 3 the fence also flags the six
  straightest leaves (6/187), one per branch: it measures distance from the centre, not depth, and straight
  paths reach farther than bent ones.
- Every flag is settled by comparing the memory's exact point with the exact point of its recorded address:
  the six are cleared and every misplaced memory is confirmed. The fence screens; the exact check decides.
- The guard passes clean distances (worst defect 0.6923 < ln 2) and, after one stored distance is moved by
  1.5, blames exactly that pair first (104 quads above ln 2).

### Read from the code

| Owl Academy piece | Finding | Consequence here |
| --- | --- | --- |
| `parityOk` in `logPacket` | It recomputes the same expression from the same inputs, so it is always true | Keep codex parity as a v1 field. Do integrity with the Merkle chain and SHA-256 memory words |
| Codex parity `fold32 ⊕ rotl32` | Linear and unkeyed, so anyone can recompute or forge it | Same as above |
| `EPOCH_LIMIT = 128`, `biochain` | Declared and persisted, but no epoch is ever grown on the page | Epochs become 720-frame registers |
| 72/720 export `quaternion_chain` | Each slot holds an XOR grid; it contains no quaternions | Each slot holds the exact chain quaternion of its packets |
| Engram Codec | Kept on one axis so rotations commute; block boundaries reach about 1e-15 | Integer quaternion products are exact (zero error) and need no fixed axis |
| `hpstep` package | `import hpstep.frames3d` pulls in torch and polystep through `__init__.py` | Make `hpstep/__init__.py` lazy so the exact modules import on their own |
| Three 64-bit formats | Owl's TTMPT engram, Owl's SHD-CCP word, and engine v10's tile fingerprint (an FNV-1a hash of the text) are three different objects | Keep all three and name them apart: the engram is data, the tile is the envelope, the fingerprint is the engine's own |

## 4. The design

| Layer | Owl Academy piece | Standalone replacement | Reuses |
| --- | --- | --- | --- |
| L0 Key | TTMPT core | Unchanged: `engram/1`, pinned by golden vectors | `ttmpt_core_v1.js` |
| L1 Pipeline | `logPacket` | One calculation per token on the five tiers: **T4** ingest (crystallize) · **T3** align (triangulate against α, β, γ) · **T2** superpose (fold into Y and into the chain quaternion) · **T1** prune (keep the chain word reduced and the quaternion coprime) · **T0** latch (tiles, Merkle leaf, memory word) | engine v10's tier laws and 30-node clock (`TIERS_SPEC`) |
| L2 Packet | 128-bit packet, `quat32` | The 128-bit packet kept for compatibility, plus an exact address (a 28-letter norm-5 word). On the wire, two Einstein tiles of Form 5, defined here as an engram/1 half (structure = α, β, γ or Y); Form 1 when only the compact, lossy direction is kept | `packTile`, `hurwitzEncode`, `P.wordQuaternion`, `P.rightDivide` |
| L3 Window and memory | α/β/γ window, codex parity | Three channels on the zero-point clock. At the zero point they pair into a triple-quad word over GF(2) at one of 30 addresses. The Merkle chain locates one altered cell and the parity rebuilds it. A SHA-256 memory word is chained at every zero point | `gen4.py` schedule, `merkleChain`, `rebuild`, `locate`, `memoryWord` |
| L4 Resonance | concept chips, J meter, SVG pulse | The convergence gauge of the three footer distances: s is the total, X and Y the lean. Lock when all three are equal. The soliton crystal at the core: centred while parity holds and the chains match, displaced by the gauge, sheared when the coupler's binding breaks | `gaugeExact`, `readout`, `tqf`; the Part 2 crystal |
| L5 Register | epochs, text crystal, 72/720 export, Engram Codec | The 720-frame register with the pump identity; slots at 720 → 72 → 10 hold exact chain quaternions. The free-run + membrane setting, so every register closes; in the hold setting the compensator is recorded | `pumpOf`, `closeRegister`, `X.pumpHolds` |
| L6 Geometry | SVG string-art manifold; Three.js lattice; breath pump | **2D:** the five-tier engines with memory beads on the manifolds, and the memory tree (register → section → packet) laid out in H². **3D:** the same tree in H³, a frame per packet from its quaternion, human and STRIX as the twin system bound by the coupler (a third memory chain), the breath pump timed by the clock | `TreeEmbedding`, `TreeEmbedding3D`, `twin3d.js` |
| L7 Watch | none | The fence screens the H³ layout at each register close and the exact address check settles every flag. The guard runs on the float distances the page draws from and names a corrupted pair. The fence shells give the 3D view its depth onion | `fence.js`, `claude-fence-3d.html` |
| Out of core | Firebase familiar binding, seals, biochain publishing, BERT | Optional bridges: import and export JSON; replies by retrieval in the core, with BERT or an API as an attested plugin | page chrome sign-in only for the menus |

**Position and frame are kept apart on purpose.** A packet's position is where it sits in the memory (its
register, section and slot), a short word that decodes in floats and that the tree embedding is built for.
Its frame is what it holds: the exact quaternion of its 28-letter address. Engram bits behave like a hash, so
placing by content would scatter packets at random; placing by structure gives a map you can read, and gives
the fence a hierarchy-shaped cloud, the regime where it is preregistered to work (CF-A, CF-B).

## 5. Build order

Every phase ships the repository's five things: code, an explainer, a map node, a ledger row and tests.

| Phase | Delivers | Status |
| --- | --- | --- |
| 0 · Scaffold | This plan; the hub `index.html` with its system map, claims ledger and decisions; explainers 1 (the architecture, with a live lab) and 2 (the evidence and the claims); `PREREGISTRATION.md` with claims E1–E9 and their decision rules, fixed before any code; the golden corpus `reference/golden/engram_v1.json`; the reference skeleton; the site bar | done |
| 1 · Shared cores | `scripts/geometric-build/orbital_core.js`: 15 segments (the exact core, tiers, the Fifteen-Lemma layer with tiles and the Merkle chain, tier frames and the TQF, the gauge, readout, memory repair, the pump), written back into the four orbital pages by `build.py`, which stay byte-identical (`tests/rebuild-identical.sh`); its Node test passes 18/18 (`tests/orbital-core.cjs`, Part 1's verification included) and the browser tests pass; a lazy `hpstep/__init__.py`: PolyStep's suite passes 137/137 before and after, its traces regenerate byte-identical, and its exact modules import without torch (30 tests run with numpy alone). Explainer 3 (`explainers/shared-cores.html`) | done |
| 2 · Python reference | `reference/engram/`: `ttmpt`, `orbital`, `address`, `memory`, `clock`, `coupler`, `session`, `dialogue`, `recall`, `watch`, `stats`; 41 tests including exact parity with `orbital_core.js` through Node; `traces/engram.json`; Amendment 1; `run_claims.py`, committed before it ran, and its results (E1–E7, E9 supported; E8 inconclusive). Explainer 4 (`explainers/reference-results.html`) | done |
| 3 · Browser core | `engram_core.js` (UMD; loads `OrbitalCore`, `HPCore`, `HPDecode3D`, `HPTwin3D`, `HPFence` and `TTMPTv1`): packets, addresses, memory words, the clock and registers, the coupler, sessions, recall and the watch layer. `tests/parity-engram.cjs`: 829/829 lines match the golden corpus and the traces (which gained a watch section on seeds 9100–9104), 27/27 behaviour checks hold, six planted errors all caught. `ttmpt_core_v1.js` moved to this folder. Explainer 5 (`explainers/browser-core.html`) runs the check live | done |
| 4 · The 2D page | `mind-eye.html`: STRIX on the three-engine clock, each token on the five tiers, the memory panel (alter, locate, repair), the gauge, lock and soliton crystal, register closure, the memory tree in H² [DEFINITION: register → section → zero point → cell], exports (v1 byte-compatible, and v2). `engram_core.js` gained `Live` (a Session grown turn by turn, equal to it at every checkpoint), STRIX's reply rule, positions, and the exports; `strix_library_v1.js` and `reference/golden/exports_v1.json` are pinned from Owl Academy by `make_owl_v1.cjs`. `tests/page-engine.cjs` 26/26; Chromium at 1440, 1024 and 390 px. Explainer 6 (`explainers/page-2d.html`) | done |
| 5 · The 3D page | `mind-eye-3d.html`: the memory tree in H³ (the 2D page's position words on PolyStep's octahedral tree), a frame per packet from its exact quaternion, the twin system with the binding as a third chain and its control, the soliton crystal at the core, the fence on every closing register with each flag settled exactly, misplacement and the guard on demand, the breath pump timed by the register, `LATTICE-SEED/1` import (`lattice_seed_v1.js` and `reference/golden/lattice_seed_v1.json` pinned from Owl Academy's Biomesh page by `make_lattice_v1.cjs`). `engram_core.js` gained the 3D engine. `tests/page3d-engine.cjs` 19/19; Chromium at 1440, 1024 and 390 px. Explainer 7 (`explainers/page-3d.html`) | done |
| 6 · Bridges | Out: `exportOwlSession`, byte for byte what the Engram Mind Eye's `saveEngram` writes, with a console loader, so that page restores and continues the session exactly (its continuation and next save checked). In: the saved session, `engram_chain`, `engram_text_chain` at 72 and 720 (speakers marked unknown where the file does not have them), biochain records (verified as `verifyIntegrity` does, text recreated by Owl Academy's decoder), engram streams by their grids, `ENVIRONMENT/1` (3D page: hash, boundary seed, codex gate, pump driving the breath, frontier), and v2. `biochain_v1.js` and `reference/golden/bridges_v1.json` pinned by `make_bridges_v1.cjs`. The pages' session store keeps every turn (v2). `tests/bridges.cjs` 34/34; Chromium at 1440 and 390 px. Explainer 8 (`explainers/bridges.html`) | done |
| 7 · Follow-ups | Amendment 2 (commit `57d6d57`) registered E10 and E11 before any code; the runners (`engram/guard.py`, `run_followups.py`, `run_e11.cjs`, `golden/owl_eye.cjs`) were committed (`f193a29`) after dry runs only; then decided. E10 inconclusive (exact parts supported; naming 0.965 [0.94, 0.99] at +1.5 in E8's setting, equal to the share with two or more witnesses); E11 supported (50/50, control 50/50). The matching guard is in `engram_core.js` with 20 trace lines (849/849) and on the 3D page. Explainer 9 (`explainers/follow-ups.html`) | done |
| 8 · Integration | Menus in `scripts/page-chrome-targets.json`; cross-links from the Hyperbolic Oracles hub and the Geometric Calculator menus; a card in `pages.html`; `tests/links.cjs` and `tests/all.cjs`. Explainer 10 (`explainers/integration.html`) | done |

Claims, registered in [`PREREGISTRATION.md`](PREREGISTRATION.md) on 2026-11-04 with their instances, controls
and decision rules, amended once before any decisive run (Amendment 1), and decided by the Phase 2 reference
(`reference/results/claims.json`):

- **E1** (supported): engram/1 is bit-identical to Owl Academy on the golden corpus.
- **E2** (supported): the chain quaternion recovers every packet exactly and in order, for any chain length.
- **E3** (supported): the triple-quad memory locates and repairs any single altered cell, and its chain detects any
  alteration of two cells.
- **E4** (supported): every register telescopes exactly through 720 → 72 → 10, and in the free-run + membrane setting every
  register closes.
- **E5** (supported): the coupler's binding is unchanged at every zero point (K1), and carry is bit-identical to running
  without the coupler (K2).
- **E6** (supported): the gauge recovers a packet's three distances exactly, and the landing triangle locks exactly when
  they are equal.
- **E7** (supported): the fence flags memories placed two levels too deep, and the exact address check settles every flag.
- **E8** (inconclusive): the ln 2 guard blames a single corrupted stored distance on its own pair.
- **E9** (supported): Hamming recall is exact for variants that keep every letter count's parity, and at chance for
  one-letter substitutions (an equivalence test within ±0.05, predicted in advance).

Two follow-ups, registered in Amendment 2 before any code for them and decided in Phase 7
(`reference/results/followups.json`, `reference/results/e11.json`):

- **E10** (inconclusive; its exact parts supported): a sharper guard. Every quadruple above ln 2 holds the corrupted
  pair in its largest matching, so the matching guard names it whenever two or more quadruples exceed ln 2; it names
  it 0.965 of the time at +1.5 in E8's setting, short of 0.99, exactly the share with two or more witnesses.
- **E11** (supported): a session exported here is byte for byte what Owl Academy saves, and Owl Academy restores and
  continues it exactly, on 50 drawn conversations.

## 6. Decisions (adopted 2026-11-04)

Fixed design inputs of the preregistration: changing one is an amendment.

- **D1 · Location.** Its own system, `Pages/Engram Minds Eye/`, with its own menus, loading shared cores by
  relative path. Not taken: a module inside `Pages/Hyperbolic Oracles/`.
- **D2 · Orbital core.** `orbital_core.js` is extracted from the build templates and `build.py` inlines it into
  the four orbital pages. Not taken: reading functions from the templates by name, as Spike C did in Phase 0.
- **D3 · Wire format.** An engram travels as two Einstein tiles of **Form 5**, an ID unused elsewhere in the
  repository (0–4, 6 and 12 are taken), defined here as an engram/1 half: tile h = 0 holds cells 32–63, tile
  h = 1 cells 0–31, slot = 4h + structure, structure α = 0, β = 1, γ = 2, Y = 3. Form 3 is not used because it
  means a binary32 value. Owl Academy's SHD-CCP word appears only at the bridge.
- **D4 · Compatibility.** engram/1 is frozen. An order-aware key that keeps digits would be engram/2, with its
  own preregistration.
- **D5 · Clutch.** The memory channels run in the Zero-Point Tri-Engine's free-run + membrane setting: every
  channel turns on every frame, so every register closes, and the membrane removes the differential at each
  zero point. Not taken: the hold setting, which leaves half a turn per register.
- **D6 · Replies.** Retrieval only in the core, which is reproducible. BERT or an API comes as a plugin whose
  turns are logged as attested, the way Owl Academy's Language Growing page does it.
- **D7 · `hpstep` import.** `__init__.py` becomes lazy (PEP 562 `__getattr__`) so the exact modules import
  without torch. Not taken: copying the exact modules into a second package.

## Scope

Exact here means exact bookkeeping: addresses, chains, memory words, registers, frames and gauges. It does not
make recall semantic. Engram/1 is a key built from letter-count parities, and no geometry placed on top of it
adds meaning. The fence finds misplaced memories, not new ideas. Meaningful positions, and with them the fence
as a novelty detector, need engram/2 or another key, and that is a separate experiment with its own controls.

[Hyperbolic Lexicon](../Hyperbolic%20Lexicon/README.md) (`Pages/Hyperbolic Lexicon/`) builds the pieces such a key
needs: a pinned subword tokenizer and an exact, training-free address in the same norm-5 tree. It keeps engram/1
only as a compatibility checksum, and grows its language data as `shdccp/2` shards that import here through
`importBiochain`. An engram/2 key would be registered in this folder by amendment, once the Lexicon's address
claims are decided.

## Files

| Path | Holds |
| --- | --- |
| `README.md` | This plan |
| `index.html` | The hub: system map, explainer library, roadmap, claims ledger, decisions |
| `explainers/architecture.html` | Explainer 1: the five systems, the eight layers, one word followed through them, and a live lab |
| `explainers/evidence.html` | Explainer 2: the spikes with their outputs, the golden corpus, the nine claims and their decision rules |
| `explainers/shared-cores.html` | Explainer 3: Phase 1, the orbital core moved into one module, how the byte-identity was proved, the module live, PolyStep without torch |
| `assets/em.css`, `assets/em-map.js` | Shared style; the system map data and its chart renderer (Hyperbolic Oracles' renderer, renamed) |
| `PREREGISTRATION.md` | Claims E1–E9, fixed design inputs D1–D7, instances, controls and decision rules; Amendment 1; Amendment 2 with E10 and E11 |
| `explainers/reference-results.html` | Explainer 4: Phase 2, the reference, how it was checked, Amendment 1, and the decisions |
| `reference/engram/`, `reference/tests/` | The Python reference (12 modules) and its 41 tests |
| `reference/run_traces.py`, `reference/traces/engram.json` | Exact values the browser core reproduces line for line (Phase 3), the watch layer included |
| `engram_core.js` | The browser core (Phase 3): the engram layer as one UMD module, `EngramCore`, on `orbital_core.js`, PolyStep's `hyperbolic_core.js`, `decoder3d.js`, `twin3d.js` and `fence.js`, and `ttmpt_core_v1.js`; `runParity` and the behaviour checks |
| `tests/parity-engram.cjs` | Its Node runner: 849 parity lines (829 at Phase 3, 20 more for E10's guards in Phase 7) against the golden corpus and the traces, then 27 behaviour checks |
| `explainers/browser-core.html` | Explainer 5: Phase 3, the module, how it is checked, the parity check live, a session on your own words |
| `mind-eye.html`, `assets/mind-eye.js`, `assets/mind-eye.css` | The 2D page (Phase 4): STRIX on the clock |
| `strix_library_v1.js` | STRIX's introduction and the fifteen concepts with their three replies, verbatim from Owl Academy (generated by `reference/golden/make_owl_v1.cjs`) |
| `reference/golden/make_owl_v1.cjs`, `exports_v1.json` | Runs Owl Academy's own reply and export code on three sessions: its replies and the length and SHA-256 of the nine v1 files it downloads; `--check` recomputes |
| `tests/page-engine.cjs` | The page engine: `Live` = `Session`, replies and v1 exports against Owl Academy, v2, positions, speed (26 checks) |
| `explainers/page-2d.html` | Explainer 6: the manual of the 2D page |
| `mind-eye-3d.html`, `assets/mind-eye-3d.js`, `assets/mind-eye-3d.css` | The 3D page (Phase 5): the memory in H³ |
| `lattice_seed_v1.js` | Owl Academy's SHD-CCP word codec and lattice-seed hash, verbatim (generated by `reference/golden/make_lattice_v1.cjs`) |
| `reference/golden/make_lattice_v1.cjs`, `lattice_seed_v1.json` | Copies the codec from Owl Academy's Biomesh Mind's Eye 3D and records its verdicts on three seeds; `--check` recomputes |
| `tests/page3d-engine.cjs` | The 3D engine: layout, the watch layer, frames and the twin system, the breath, LATTICE-SEED/1 against Owl Academy (19 checks) |
| `explainers/page-3d.html` | Explainer 7: the manual of the 3D page |
| `biochain_v1.js` | `biomesh.js`'s synchronous biochain code, verbatim: the SHD-CCP stream codec, the lossless rank coder, the chiral weave, the token engram layer, the codex parser (generated by `reference/golden/make_bridges_v1.cjs`) |
| `reference/golden/make_bridges_v1.cjs`, `bridges_v1.json` | Runs Owl Academy's session save, restore and greeting, `growBiochain` and `verifyIntegrity`, and the environment builder and hash on fixed inputs; `--check` recomputes |
| `tests/bridges.cjs` | The bridges against Owl Academy's code (34 checks) |
| `explainers/bridges.html` | Explainer 8: the bridges, in and out |
| `reference/run_followups.py`, `reference/run_e11.cjs`, `reference/results/followups.*`, `e11.json` | The follow-up claims of Amendment 2 and their record |
| `explainers/follow-ups.html` | Explainer 9: E10 and E11, how they were registered and decided |
| `tests/links.cjs` | Every relative link and anchor in the folder's pages and on the map, every site-bar menu file, and the ways in from the rest of the site (31 checks, three of them controls) |
| `tests/all.cjs` | Every Node check in one command: the five cores Engram loads, its own suites, the site bar, and the four pins (skipped, not passed, without an Owl-Academy checkout) |
| `explainers/integration.html` | Explainer 10: the ways in, what the system stands on, one command, and what to do when something upstream changes |
| `reference/run_claims.py`, `reference/results/` | The decisive runs: `claims.json`, `claims.md`, `claims-console.txt` |
| `reference/README.md`, `reference/requirements.txt` | How to run the reference; numpy and pytest |
| `reference/golden/make_golden_v1.cjs`, `engram_v1.json` | The golden corpus for E1, computed from Owl Academy's `Engram_Mind_Eye.html` and `biomesh.js`, which agree on every entry; `--check` recomputes it |
| `ttmpt_core_v1.js` | The TTMPT core, verbatim from Owl Academy (`Engram_Mind_Eye.html`, lines 599–657, commit 9082520), as a UMD module; moved here from `spikes/` in Phase 3 |
| `spikes/engram_core_audit.cjs`, `…_output.txt` | Spike A: the engram key, measured |
| `spikes/quaternion_address.cjs`, `…_output.txt` | Spike B: engrams as exact quaternion addresses, on the PolyStep cores |
| `spikes/orbital_memory.cjs`, `…_output.txt` | Spike C: the window on the orbital calculators' tiles, Merkle chain, gauge and pump |
| `spikes/fence_memory.cjs`, `…_output.txt` | Spike D: the 0.7 Claude fence and the ln 2 guard on a memory tree in H³ |

Run any spike with `node "Pages/Engram Minds Eye/spikes/<name>.cjs"`, the browser core's parity with
`node "Pages/Engram Minds Eye/tests/parity-engram.cjs" --quiet`, and every check with
`node "Pages/Engram Minds Eye/tests/all.cjs"`. They need Node 18 or later and nothing else.
