# Proposal to SHD-CCP: golden-vector suites for the hyperbolic address and its bridges

**Status:** proposal only. These suites are not generated yet: Hyperbolic Lexicon writes them in its Phase 3,
once claims L3, L7, L8 and L9 have code and pass. Nothing was added to the SHD-CCP repository.

## The format we follow

SHD-CCP's golden vectors (`geometric-engine-spec/test_vectors/`) have two parts:
- a JSON envelope that validates against `schema.json`: suite, spec_version, rfc, status, description, generator,
  binary, cases;
- a little-endian binary mirror: magic `SHDGEV01`, u32 fields per record F, u32 record count N, then N × F u64
  records.

Values above 2⁵³ are strings in JSON, and signed values are two's complement in the binary.

Two constraints shape what we can offer:
- **Every non-pending suite needs a binary object** (`schema.json`: when status is not `pending`, `cases` needs at
  least one item and `binary` must be an object). So only fixed-width records fit SHDGEV01.
- **Variable-length data can't go in the binary mirror.** Tokenizer outputs, address words of varying length, whole
  shards, and exact points with hundreds of bits fit only through digests. They stay in Hyperbolic Lexicon's own
  golden JSON, as Engram Mind's Eye keeps its E1 corpus, and enter SHDGEV01 as 4 × 64-bit limbs of a SHA-256.

The generator is Hyperbolic Lexicon's own (`reference/golden/make_shdgev_v1.py --check`, Phase 3), not SHD-CCP's
`export_golden_vectors.py`. A test validates every envelope against SHD-CCP's `schema.json`, read-only.

## Proposed suites (all status `draft`, spec_version 0.1.0)

| Suite | RFC | Binary fields | What it pins |
| --- | --- | --- | --- |
| `lexicon_address_codec` | 03 | `len, id, q0, q1, q2, q3` | A reduced norm-5 word: its 59-bit id (64-bit for lengths 26–27) and its integer quaternion. Each component is at most 5^(len/2) in size, signed, so for the lengths the ids cover (≤ 27) every component fits a signed 64-bit field. |
| `blackwell_crystallize_compat` | 01 | `chunk_sha_0..3, js_word, py_word` | The `crystallize` word of a chunk as the JavaScript codec writes it (raw −128 kept) and as BioChain-AI's Python `pack` writes it (−128 normalised to −127). Includes ≥ 64 chunks whose crystal contains 0x80, the case where the two differ. |
| `lps_x5q_reduction` | 03 | `q, id, a, b, c, d` | A word's quaternion reduced to a 2×2 matrix mod q (projective, normalised so the first nonzero entry is 1), for q ∈ {13, 17, 29}. |
| `lexicon_h3_point_digest` | 03 | `id, depth, sha_0..3` | SHA-256 of the canonical exact H³ point (decimal numerators over 7^depth). The full point is in the JSON case. |
| `lexicon_h2_point_digest` | 03 | `id, depth, sha_0..3` | The same for the exact H² tree (t = 11/13). |
| `rfc6962_vectors` | 03 | `n, root_0..3` | RFC 6962 Merkle roots of n synthetic leaves, for n ∈ {1, 2, 3, 7, 84, 200, 1000, 1001}. The JSON adds inclusion and consistency proofs and the duplicate-last failing cases (see `SHD-CCP-Lemma15-note.md`). |

## Why this helps SHD-CCP

- **The compatibility suite fixes the 0x80 divergence.** `blackwell_crystallize_compat` documents a real
  divergence between the deployed JavaScript codec and the Python kernel (about 1.6–1.8% of random 720-byte chunks;
  Hyperbolic Lexicon's spike S4 measures the rate on real text) in a form every binding can test against. It does
  not choose a winner; that is the RFC 01 / `shdccp/3` decision.
- **The other suites tie the overlay to concrete numbers.** The address, LPS and point suites give RFC 03's X(5, q)
  overlay exact integers to check against, from a tree that already exists in running code.
