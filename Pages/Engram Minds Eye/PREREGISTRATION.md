# Engram Mind's Eye: preregistration

Registered 2026-11-04, in Phase 0, before any engram code exists. The claims, instances, controls, metrics
and decision rules below are fixed. A later change is recorded as a dated amendment at the end of this file,
with its reason. Results computed before an amendment are reported under the rules in force when they ran.

The four feasibility spikes in `spikes/` ran before this file was written. They shaped the design, and their
outputs are kept, but no claim below is decided by them. Every claim is decided by the Phase 2 reference on
the instances given here.

## Claims under test

| # | Claim | Kind | Tested by |
| --- | --- | --- | --- |
| E1 | engram/1 is bit-identical to Owl Academy on the golden corpus | exact | the golden file |
| E2 | The chain quaternion recovers every packet exactly and in order, for any chain length | exact | chains of 1 to 720 packets |
| E3 | The triple-quad memory locates and repairs any single altered cell, and its chain detects any alteration of two cells | exact | dialogue and random windows |
| E4 | Every register telescopes exactly through 720 → 72 → 10, and in the free-run + membrane setting every register closes | exact | registers of the synthetic dialogues |
| E5 | The coupler's binding B = q₂q₁ is unchanged at every zero point (K1), and carry is bit-identical to no coupler (K2) | exact | the golden session and the synthetic dialogues |
| E6 | The gauge recovers a packet's three distances exactly, and the landing triangle locks exactly when they are equal | exact | all distance triples, and the dialogues |
| E7 | The fence flags memories placed two levels too deep, and the exact address check settles every flag correctly | statistical and exact | memory trees in H³ |
| E8 | The ln 2 guard blames a single corrupted stored distance on its own pair | statistical and exact | distance matrices of memory trees |
| E9 | Hamming recall is exact for variants that keep every letter count's parity, and at chance for one-letter substitutions | exact and equivalence | the dialogue store |

## Fixed design inputs

These choices were made before registration (README, section 6) and are part of what is tested:

- **D1** The system lives in `Pages/Engram Minds Eye/` and loads shared cores by relative path.
- **D2** The orbital code (exact core, Einstein tiles, Merkle chain, tiers, TQF, gauge, repair, pump) is used
  from one shared `orbital_core.js` that `build.py` also inlines into the four orbital pages.
- **D3** On the wire an engram is two Einstein tiles with the structure field set to α = 0, β = 1, γ = 2,
  Y = 3. They use Form 5, an ID unused elsewhere in this repository (0–4, 6 and 12 are taken), defined here as
  *an engram/1 half*: tile h = 0 holds the high 32 bits of the packet body (cells 32–63), tile h = 1 the low 32
  bits (cells 0–31), and the slot field is 4h + structure. Form 3 is not used because it means a binary32 value.
- **D4** engram/1 is frozen: the TTMPT core of `Engram_Mind_Eye.html`, verbatim.
- **D5** The memory channels run in the Zero-Point Tri-Engine's free-run + membrane setting: every channel is
  engaged on every frame, so every register closes, and the membrane removes the differential at each zero
  point. (Its *hold* setting engages a channel only while its job runs.)
- **D6** STRIX replies by retrieval only in the core. BERT or an API is a plugin, and its turns are logged as attested.
- **D7** `hpstep/__init__.py` imports lazily, so the exact modules import without torch.

## Common rules

- **Authority.** Decisions come from the Python reference (Phase 2). The browser core (Phase 3) must
  reproduce the reference's traces before a claim decided in the reference is shown as holding in the browser.
- **Exact claims** (E1–E6, and the exact parts of E7–E9) are all-or-nothing. A claim is **supported** if
  every case passes and **refuted** by any single failure, which is recorded as a counterexample.
- **Controls.** Every exact test has a control: a deliberately broken variant that must fail on at least one
  case. If a control passes, the test is **void**, the claim stays open, and the test is repaired by amendment.
- **Randomness.** The PolyStep reference's generator (`reference/hpstep/prng.py`, xoshiro128** seeded by
  splitmix32), so the browser reproduces every instance. Instance seeds are 1000 + i; secondary draws for the
  same instance use 2000 + i.
- **Statistics.** Rates get a 95% percentile bootstrap interval over instances (10,000 resamples, seed 7),
  as in the Hyperbolic PolyStep preregistration.
- **Reporting.** Every case and every cell is reported. Nothing is dropped after a run.

## Shared instances

- **The golden corpus.** `reference/golden/engram_v1.json`, SHA-256
  `04bf45c873f8e26e136a39e353328545a06ef3929bc1d55f02a5938dd7a1cc7c`, written by `make_golden_v1.cjs` from
  Owl-Academy commit `9638040` (`Engram_Mind_Eye.html` and `scripts/biomesh.js`, whose file hashes it records).
  It holds 536 entries (26 letters, 15 concept names, the 3 window seeds, 477 dialogue tokens from the STRIX
  introduction and the concept library's responses, 15 edge cases), both tokenizers on 3 sentences, the engram
  stream of the introduction, and the 69-packet chain of a fresh session. The page and `biomesh.js` agree on
  every entry.
- **The dialogue store.** The 477 dialogue tokens of the golden corpus, in their order there.
- **Synthetic dialogues.** 20 dialogues, seeds 1000–1019. Each has 30 turns, alternating human and STRIX,
  starting with STRIX. A turn is 3 to 12 tokens, its length and tokens drawn uniformly from the dialogue store.
- **The clock.** Each turn's tokens are logged in order. Channel j (α, β, γ for j = 0, 1, 2) onloads one packet
  per 24-frame joint cycle at joint frame 18, 10 or 2, and offloads it twelve frames later. A packet belongs to
  the ten-frame block of its offload frame. A register is 720 frames, blocks are ten frames (72 per register),
  and the 72 blocks fall into 10 inner groups by m ↦ ⌊10m/72⌋, as on the Zero-Point Tri-Engine.
- **The address.** A packet's 64 bits become a 28-letter word in the generators 1 ± 2i, 1 ± 2j, 1 ± 2k, read in
  base 5 from the least significant digit. Each letter is one of the five children of the word so far; at the
  root, generators 0 to 4. A chain's word is its packets' words in order, so it stays reduced.

## E1 · Compatibility with Owl Academy

- **Test.** The reference and the browser core reproduce every field of the golden file: `hex_lsb`, `seed64`,
  `chiral_key`, `j_num` and `bits` for all 536 entries; both tokenizations of all 3 sentences; the engram
  stream; and for each of the 69 chain packets its header, body, footer and triangulation, plus the final parity.
- **Control.** A variant whose per-character seed uses 37 in place of 31 must differ on at least one entry.
- **Also reported.** `make_golden_v1.cjs --check` against the Owl-Academy checkout at test time, so a change
  on the Owl Academy side is seen. A difference there is reported, and it does not change E1's decision.
- **If refuted.** Chains, seeds and exports cannot move between the repositories until the difference is found.

## E2 · The chain quaternion

- **Instances.** Chain lengths K ∈ {1, 2, 10, 72} with 20 chains each, and K = 720 with 5 chains. Half the
  chains of each length are random 64-bit words (seeds 1000 + i); the other half are engram/1 packets of the
  dialogue store taken in order, wrapping round.
- **Test.** The chain quaternion has norm exactly 5^(28K), and right division recovers every packet's 64 bits,
  in order.
- **Controls.** (a) Appending one packet whose first letter is the inverse of the previous packet's last letter
  must break recovery. (b) Swapping two distinct packets must change the chain quaternion.
- **Also reported.** Bits per component and per packet, and the time per chain.
- **If refuted.** The chain quaternion is dropped as a lossless store, and the Merkle chain alone carries integrity.

## E3 · The triple-quad memory

- **Instances.** Every window of three consecutive packets in the golden chain and in the 20 synthetic
  dialogues, and 1,000 windows of three random 64-bit cells (seeds 1000 + i). Each window is written as a
  word (α, β, γ, Y = α ⊕ β ⊕ γ) with its tiles (D3) and the Lemma 15 Merkle chain over the four leaves.
- **Single alterations.** Every single-bit flip of every cell: 256 per word. Each must fail the parity, be
  located by the chain (the deepest layer that differs), be rebuilt by XOR of the other three cells, and leave
  the root equal to the recorded root.
- **Double alterations.** 200 per instance set (seeds 2000 + i): two cells altered by one bit each, 50 of them
  at the same bit position. The root must differ from the recorded root in every case, and the memory must
  refuse to repair (two unknowns, one equation).
- **Control.** Parity alone, without the chain, must miss at least one of the same-position double alterations.
- **If refuted.** The memory panel is not built on the triple quad until the failing case is understood.

## E4 · The register

- **Instances.** Every complete register of the 20 synthetic dialogues on the clock (D5). A partial last
  register is reported and not tested.
- **Telescoping.** The ordered product of a register's packet quaternions, the ordered product of its 72 block
  quaternions (a block with no packet is 1), and the ordered product of its 10 group quaternions are the same
  integer quaternion, and the compensator H = q̄, its conjugate, satisfies H·q = N(q)·1 exactly.
- **Closure.** In the free-run + membrane setting (D5), the engagement pump of every channel closes every
  register: P = 0, and H = Q₈·Q₁₀·P = P⁻¹ holds. The same registers in the hold setting, with a channel engaged
  only while a packet is in flight, are reported (expected: P = 360/720, compensator 360/720) and are not part
  of the decision.
- **Controls.** Swapping two distinct non-identity blocks, and replacing one packet by another, must each
  break the equality of the three products.
- **If refuted.** The 720 → 72 → 10 slots are not used for the export until the bookkeeping is fixed.

## E5 · The coupler

- **Instances.** The golden session and the 20 synthetic dialogues. Structure 1 is the human stream and
  structure 2 the STRIX stream. Each packet's address quaternion w is the twist its structure issues, and the
  coupler applies q₁ ← w q₁ and q₂ ← q₂ w̄ (the conjugate stands for w⁻¹ up to the norm). Quaternions are kept
  as coprime integers up to a positive scale, as in `twin3d.py`.
- **K1.** At every zero point, B = q₂q₁ reduced to coprime integers equals its starting value.
- **K2.** In carry mode, every memory word, Merkle root, gauge and register product is bit-identical to the
  same run with the coupler off.
- **Control.** The same-chirality variant (q₂ ← q₂ w, the control in `twin3d.py`) must change B at some zero point.
- **If refuted.** The twin view is not built until the binding is understood.

## E6 · The gauge and the lock

- **Instances.** Every triple (a, b, c) ∈ {0, …, 64}³ (274,625 triples) for the gauge; the footer triples of
  every packet of the golden chain and the synthetic dialogues, every equal triple (65), and 5,000 random
  triples (seeds 1000 + i) for the lock.
- **Gauge.** `gaugeExact` returns (s, X, Y) from which (a, b, c) is recovered exactly, and X = Y = 0 exactly
  when a = b = c.
- **Lock.** The convergence readout (κ = 1, no tension or torsion, and the equal turn the membrane leaves on all
  three nodes) places the three landing nodes; the triangle locks (3·A_R = S², exact) exactly when a = b = c.
- **Control.** A gauge variant with Y = b + c must fail to recover some triple.
- **If refuted.** The soliton view shows the gauge without the lock.

## E7 · The fence on misplaced memories

- **Instances.** Memory trees in H³ from the fence's own generator (`kind: 'tree'`, `out.mode: 'deep'`): depth
  L ∈ {2, 3}, k ∈ {5, 10} misplaced memories, d ∈ {1, 2} levels too deep. Eight cells, 50 instances each
  (seeds 1000 + i).
- **Flag.** A memory is flagged when the fence's verdict is 1 or 2.
- **Settlement (exact).** Every flagged memory is compared, in exact rationals, with the point of its recorded
  address: a memory in its proper place is recorded at its own word, and a misplaced memory at its depth-L
  ancestor. The check must clear every flagged memory that sits on its address and confirm every flagged
  misplaced memory. All-or-nothing.
- **Detection (statistical).** For the four cells with d = 2: **supported** if in every one the detection rate is
  at least 0.99 and the lower end of its interval is at least 0.95; **refuted** if any is below 0.90;
  otherwise **inconclusive**. Cells with d = 1 are reported.
- **False flags.** Reported by depth, with no decision. Prediction: none at L = 2, and the six straightest
  leaves (about 3% of memories) at L = 3, because the fence measures distance from the centre, not depth.
- **If refuted.** The watch layer keeps the exact address check and drops the fence as a screen.

## E8 · The guard

- **Instances.** 50 distance matrices (seeds 1000 + i), each of 24 memories drawn without replacement from the
  depth-2 tree, with one pair's distance increased by δ ∈ {0.5, 1.0, 1.5, 3.0} (pair drawn with seed 2000 + i).
- **Clean bound (exact).** No clean matrix has a four-point defect above ln 2 + 10⁻⁹ (CF9). One violation refutes.
- **Blame (statistical).** For δ ∈ {1.5, 3.0}: **supported** if the top-blamed pair is the corrupted pair in at
  least 99% of instances at each δ, with the lower end of the interval at least 0.95; **refuted** if below 90%
  at either; otherwise **inconclusive**. Smaller δ are reported.
- **If refuted.** The guard is shown as a check of the bound only, without naming a pair.

## E9 · What Hamming recall can and cannot do

The store holds the engram/1 key of each of the 477 dialogue tokens. A query is answered by the stored token
whose key is nearest in Hamming distance. When t stored tokens tie at the minimum, a hit counts 1/t.

- **E9a (exact).** For each stored token, five variants that keep every letter count's parity (lowercase; the
  letters reversed; a digit appended; a letter of the token inserted twice in a row; a hyphen inserted) return a
  key at distance 0 from the original. Recall@1 is then exactly 1/t for a token sharing its key with t − 1 others,
  and 1 otherwise. All-or-nothing.
- **E9b (equivalence).** For each stored token of three letters or more, five one-letter substitutions (position
  and new letter drawn with seeds 1000 + i). Recall@1 is compared with a control store whose keys are shuffled
  across tokens (seed 7). The effect is the paired difference, engram store minus control. **Supported** (recall is
  at chance) if its interval lies within [−0.05, 0.05]; **refuted** if it lies above 0.05; otherwise **inconclusive**.
- **Why the prediction.** Substituting one letter for another XORs both letters' grids into the key, which moves
  it by the weight of that XOR, about 32 of 64 bits: as far as an unrelated word.
- **If E9b is refuted.** Recall is better than predicted, and the claim and the Scope section are revised.

## Amendments

### Amendment 1 · 2026-11-04, Phase 2, before any decisive run

Written while the reference was being built and its unit tests run, and before `run_claims.py` ran on any of
the instances above. No result of a claim was known when it was written.

**1. E1's control was void and is replaced.** The registered control, a per-character seed multiplier of 37 in
place of 31, cannot fail: `crystallize` seeds each letter on its own, `seed = 0 · 31 + code`, so the multiplier
only ever multiplies zero and every grid is unchanged (the unit test shows 0 entries differ). Under the common
rules the test was therefore void. The replacement control changes the key's generator: **Mulberry32's increment
0x6D2B79F7 in place of 0x6D2B79F5**, which must differ on at least one entry. The void control is still run and
reported (expected: 0 entries differ), so the record shows why it was replaced.

**2. Definitions the preregistration left open, fixed in the reference** (marked [DEFINITION] in its code):

- *Slots.* Tokens fill the onload slots in time order: joint frames 2, 10, 18 of each cycle carry the next three
  tokens, on channels 2, 1, 0. The order of tokens is then the order of onloads and of offloads, so a register's
  product of address quaternions is a contiguous piece of the chain's word.
- *Zero-point words.* The word written at a zero point is the last three packets latched by then, oldest first
  (α, β, γ, as in Owl Academy's window), at address (count mod 30). Frames are numbered from 1; register r holds
  frames 720r + 1 … 720(r + 1); a register is complete when the run passes its last frame.
- *Addresses on the clock.* Every packet's address is encoded after the whole chain before it, in token order.
- *Tile headers and leaves.* A word's tiles carry the step (F mod 8, 0 read as 8) and node (F mod 30) of the frame
  it is written at, gate = address mod 64, and the mux index from step, node and slot, as `cellTile` does in
  Tri-Engine Convergence. A leaf is the two tile words followed by the cell's 16 hex digits. Outside the clock
  (E3's consecutive windows) window i is written as if at frame 24(i + 1), address i mod 30.
- *Memory links.* ENGRAM-MEM/1 | frame | address | Merkle root | previous link, SHA-256, 16 hex digits.
- *Membrane turn.* The common turn on the three landing nodes is s/3 of the turns the three latched packets carry
  from their offloads to the zero point in free-run: 13/675 of a turn.
- *E2 chains.* Of the n chains of a length, those with even index (0, 2, …) are random and the others are
  dialogue chains, so K = 720 has 3 random and 2 dialogue chains. A random chain's packets are drawn from
  Rng(1000 + i) for chain i, each as two 32-bit outputs, high first. Dialogue chain j of length K starts at store
  token (j·K) mod 477 and wraps round.
- *E3 draws.* A random window takes its three cells from Rng(1000 + i) the same way. Double alteration i of a set
  draws from Rng(2000 + i): the window, two distinct cells, a bit, and (for i ≥ 50) a second, different bit; the
  first 50 use the same bit in both cells.
- *E6 random triples.* Rng(1000 + i), three draws below 65.
- *E7 ancestors.* A misplaced memory's word is recovered with `decode_exact` and confirmed by exact equality with
  its point; its recorded address is that word's first L letters.
- *E9 variants.* Lowercase; the characters reversed; '7' appended; the token's first letter (its first character if
  it has none) inserted twice after its first character; '-' inserted after its first character. A substitution
  draws, from Rng(1000 + i) for store token i, a position among the token's letters, then a new letter among the 25
  others. The shuffled control store permutes the keys with Rng(7).
- *Hold setting (reported only).* A channel is engaged on the frames after an onload through its offload. In
  register 0 no flight is under way at frame 1, so its first channel shows 354 rather than 360.
