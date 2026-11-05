# Note for SHD-CCP: two different things are called "Merkle", and a statement for Lemma 15

**Status:** proposal only; nothing in the SHD-CCP repository was changed. From Hyperbolic Lexicon's Phase 0
(Ebayednoob, `Pages/Hyperbolic Lexicon/`).

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
[a, b, c, c] build the same tree and the same root. Spike S4 (`spikes/s4_lexicon_shard_output.txt`) shows this on
real hashes. In a biochain the leaf count is implied by the stream, which limits the damage. But a root alone does
not fix the list it commits to, and that is what a lemma about integrity has to rule out.

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

Hyperbolic Lexicon's claim L9 builds RFC 6962 trees in JS and Python with identical roots and proofs. Its test
vectors can be the suite's first cases:
- roots for n ∈ {1, 2, 3, 7, 84, 200, 1000, 1001};
- every inclusion proof and every consistency proof for n ≤ 200;
- every single alteration (replace, delete, insert, swap, duplicate-last, truncation) detected;
- as a **failing** case, the biochain rule's duplicate-last pairs, which collide by construction.

They will be published in SHDGEV01 form for the fixed-width part (`rfc6962_vectors`: n and the 4 limbs of the
root), as `SHD-CCP-golden-vectors.md` describes.

## What this does not claim

SHA-256 collision resistance is an assumption, not something the lemma proves. The LPS p=5 Cayley-graph reduction
(see `SHD-CCP-RFC03-exact-Qh-and-LPS.md`) is **not** a substitute: Cayley hashes on LPS graphs have known collision
attacks (Tillich–Zémor 2008; Petit–Lauter–Quisquater 2008). It is a shard key, never integrity.
