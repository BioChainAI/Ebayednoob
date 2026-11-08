# Note for SHD-CCP: two different things are called "Merkle", and a statement for Lemma 15

**Status:** proposal only; nothing in the SHD-CCP repository was changed. From Hyperbolic Lexicon's Phase 0
(Ebayednoob, `Pages/Hyperbolic Lexicon/`), finalised after Phase 3 with measured numbers. **Measured** marks a result
of the Lexicon's claim L9. L9 was registered in `PREREGISTRATION.md` in Phase 0; Amendments 7 and 8 fixed its
definitions before any decisive run. It was decided in the Phase 3 decisive run:
`reference/results/claims-phase3.json`, commit 865791f, on the code committed at 6da04be. The lemma, the vectors'
SHDGEV01 form and everything asked of SHD-CCP are still **proposed**.

## Where Lemma 15 stands

- RFC 00 lists "recursive Merkle integrity" among the Layer IV lemmas
  (`geometric-engine-spec/rfcs/00_fifteen_lemmas.md`, line 21).
- The Lean module `Lemmas09To15_Arithmetic.lean` names it only in a comment.
- The Kernel Ontology's suite `03_merkle_collision` is pending (`Agent_Tooling/suites.py`, line 79). Its README asks
  for a "deterministic integer computation, not a tolerance on floating-point values". It blocks certification of
  every kernel at [PROVEN].

## Two structures share the name

| | Orbital calculators' "Lemma 15 Merkle chain" | Biochain Merkle root (`shdccp/2`) |
| --- | --- | --- |
| Where | Ebayednoob `scripts/geometric-build/orbital_core.js`, lines 456–462 | Owl `scripts/biomesh.js` (`growBiochain`, `verifyIntegrity` 341–384); BioChain-AI `src/biomesh/biomesh.js` |
| Shape | A **linear backward chain**: τ_N = H(G_N), τ_d = H(G_d ‖ τ_{d+1}) | A **binary tree**: pairwise SHA-256 over hex strings, the last node duplicated on odd levels |
| Proves | The whole sequence, and (by the deepest differing layer) which leaf changed | Membership of each chunk; the root commits the chunk list |
| Weakness | Proofs are linear in length | **Malleable:** a list and the same list with its last element repeated have the same root (the CVE-2012-2459 class) |

They are not interchangeable commitments. Hyperbolic Lexicon names them apart and never mixes them.

## The duplicate-last ambiguity

Under the biochain rule, an odd level copies its last node before pairing. So the leaf lists [a, b, c] and
[a, b, c, c] build the same tree and the same root. Spike S4 (`spikes/s4_lexicon_shard_output.txt`) first showed this
on real hashes.

**Measured (L9's control 1, which had to show the weakness).** Under the `shdccp/2` rule, a list and the same list
with its last leaf duplicated have one root at K = 3, 7 and 1,001 leaves, in JavaScript and in Python. The
Lexicon's chain trace (`reference/traces/chain_v1.txt`, written by the Python reference and reproduced line for line
by the JS) adds K = 5 and 13, which collide, and K = 1, 2, 4 and 8, which do not.

In a biochain the leaf count is implied by the stream, which limits the damage. But a root alone does not fix the list
it commits to, and that is what a lemma about integrity has to rule out. The Lexicon therefore keeps each shard's
`shdccp/2` root for compatibility and commits every list it publishes (shards in a corpus, address-table rows) with
RFC 6962.

## A proposed statement for Lemma 15

Use the RFC 6962 (Certificate Transparency) Merkle tree:

- leaf hash = SHA-256(0x00 ‖ leaf);
- node hash = SHA-256(0x01 ‖ left ‖ right);
- a list of n > 1 leaves splits at k, the largest power of two below n; nothing is duplicated.

**Lemma 15 (proposed).** For leaf lists L ≠ L′ (of any lengths), MTH(L) = MTH(L′) implies a SHA-256 collision,
found by walking down the two trees to the first differing node. Inclusion proofs (log₂ n hashes) and consistency
proofs between sizes m < n are sound under the same assumption.

The statement is checkable in integers, as the suite's README asks: the "found by walking down" step is a
deterministic procedure, and the vectors below exercise it.

## Vectors offered for `03_merkle_collision`

**Measured (L9, supported).** Hyperbolic Lexicon's claim L9 builds RFC 6962 trees in JS and Python: leaf hash
SHA-256(0x00 ‖ leaf), node hash SHA-256(0x01 ‖ left ‖ right), split at the largest power of two below n, and RFC
9162's inclusion and consistency algorithms. Its lists can be the suite's first cases. Each synthetic list j has K
leaves of 32 bytes from the Lexicon's `Rng(1000 + j)` (eight `next_u32` each, big-endian). The corpus manifest's
leaves are the SHA-256 digests of 148 `LPREP/1` records.

| K | Root (equal in JS and Python) | Inclusion proofs (most hashes) | Consistency proofs | Alterations (all detected) |
| --- | --- | --- | --- | --- |
| 1 | `2cf8247ae9bac207befea636a242f0fcfff2d9119914daf15faaecf4110d98e0` | 1 (0) | none (no m < 1) | 4 |
| 2 | `fe053b6cc39f81022ab641f7d7800bf66c96a3289877b2a9f85c8bc44f13b4a5` | 2 (1) | 1, every m | 9 |
| 3 | `b8cad7eb705b55382a4c63665b4acd0325c9b9be25631ccc9345ec460c5ea1bf` | 3 (2) | 2, every m | 14 |
| 7 | `dae8490fb9c474be4265572025a105d6853271c721e93c2812d5fed36b8c0353` | 7 (3) | 6, every m | 34 |
| 84 | `982fdccbe433cc9420f73c9289d162fd2399fb629be1315303f011c6eb4a0fc1` | 84 (7) | 83, every m | 419 |
| 200 | `945a4fc792cd011bd084140617bafbd251bb0f735bd203c41eab85d7ee717c98` | 200 (8) | 199, every m | 999 |
| 1,000 | `4ff617501dca0600d7a3522f1e7729f64330cc2f2a3a8fc53064978748de2d4c` | 1,000 (10) | 2,000 drawn | 2,000 drawn |
| 1,001 | `a13b2b4fa61335895496d25d78ddc0a4f870361bd70fca1e5cbb0c7a4dbdbccd` | 1,001 (10) | 2,000 drawn | 2,000 drawn |
| 148 (the corpus manifest) | `f567700daafc85f8163c6e290f8555472751335daf4728fa9a64d18ad23f19b3` | 148 (8) | 147, every m | 739 |

On every list:
- every inclusion proof verified for its own leaf and position, and failed (K ≥ 2) for the next leaf at that
  position and for its own leaf at the next position;
- every consistency proof verified;
- every alteration was detected: replace, delete, insert, adjacent swap, duplicate-last, and truncation with the old
  root kept;
- the Python and JS roots and proofs were identical.

The chain trace also pins the 9 Certificate Transparency reference roots and RFC 6962's 7 worked audit and
consistency proofs.

**Proposed.** The vectors would be published in SHDGEV01 form for the fixed-width part (`rfc6962_vectors`: n and
the 4 limbs of the root), with the leaves, proofs and the duplicate-last **failing** cases in the JSON, as
`SHD-CCP-golden-vectors.md` describes. Those files are not written yet. The Lexicon carried them over from its Phase 3
plan; they decide none of its claims.

## What this does not claim

SHA-256 collision resistance is an assumption, not something the lemma proves. The measurements above are finite
checks on these lists, not a proof of the lemma. The LPS p=5 Cayley-graph reduction
(see `SHD-CCP-RFC03-exact-Qh-and-LPS.md`) is **not** a substitute: Cayley hashes on LPS graphs have known collision
attacks (Tillich–Zémor 2008; Petit–Lauter–Quisquater 2008). It is a shard key, never integrity.
