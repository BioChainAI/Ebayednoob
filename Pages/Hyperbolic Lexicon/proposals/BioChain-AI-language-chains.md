# Proposal to BioChain-AI: language pre-processing biochains

**Status:** proposal only; nothing in the BioChain-AI repository was changed. From Hyperbolic Lexicon's Phase 0
(Ebayednoob, `Pages/Hyperbolic Lexicon/`), read-only survey of BioChain-AI at c975161. Numbers marked "S4" or "S7"
come from Hyperbolic Lexicon's spikes (`spikes/s4_lexicon_shard_output.txt`, `spikes/s7_attestation_output.txt`),
which ran BioChain-AI's and Owl Academy's own code unchanged.

## The short answer

Yes, language pre-processing data can be grown as SHD-CCP biochains, but not by extending one chain.

`extendBiochain` regrows parent plus new text through `growBiochain`, which throws above `MAX_GROW_BYTES = 60000`
(`src/biomesh/biomesh.js`, lines 279–281 and 388–400). A whole lineage is therefore capped at 60 KB. BabyLM's
10M-word track is about 55–60 MB of text, about 1,000 chains, and the 100M-word track about 10,000.

What works:
- **Many independent shards** of at most 60,000 bytes, each an unmodified `shdccp/2` biochain that BioChain-AI's,
  Owl Academy's and Engram Mind's Eye's verifiers already accept;
- **tied together by a manifest**, a new record kind that is append-only and checkable.

Spike S4 grew WordNet gloss shards with a synchronous grower built on the same codec. They equalled Owl Academy's
`growBiochain` field for field on 126 of 126 records, and Engram's `importBiochain` accepted every one.

## Records (typed commitments, as GROWN/1 is)

Each record is a pipe-joined string, hashed with SHA-256 and signed in BioChain-AI's exact ATTEST/1 format:
`ATTEST/1|keyId|keyVector|SHA256(commitment)|epochToken` (`src/identity/crypto-core.js`). They are named by **kind**,
never by a Form nibble, because every Form value is already claimed (see `SHD-CCP-RFC01-layout-census.md`).

| Kind | Commits |
| --- | --- |
| `LVOCAB/1` | the tokenizer: vocabulary SHA-256, normaliser spec, Unicode table hash, algorithm and commit, seed, special tokens |
| `LADDR/1` | the address table: vocabulary hash, WordNet archive hash, address rule, an RFC 6962 root over the table rows |
| `LPREP/1` (one per shard) | corpus id, shard index, chainId, merkleRoot, byte length, SHA-256 of the raw slice, SPDX licence, source hash, vocabulary hash, id-stream SHA-256, address-table hash, exact-weave hash, tier |
| `LCORPUS/1` | the manifest: an RFC 6962 root over SHA-256(`LPREP/1`) in shard order, the licence set, evaluation-set hashes, a contamination receipt |
| `LGROW/1` | growth: old size and root, new size and root, and a consistency proof that the new manifest extends the old. Nothing is regrown. |
| `LBENCH/1` | a benchmark receipt: claim, subject hash, evaluation-set hash (gated sets by hash only), scorer and version, seeds, per-item output hash, metrics, hardware and versions, class (reproducible or attested) |

Derived layers (token ids, addresses) are never stored per token. They follow the `engramStream` precedent: they are
pure functions of the recreated text and pinned tables, so verifiers recompute them and compare hashes.

## Why RFC 6962 for the manifest, not the current Merkle rule

The `shdccp/2` Merkle rule duplicates the last node on odd levels. Spike S4 showed that a list and the same list with
its last element repeated then have the same root, at every odd length ≥ 3 (the CVE-2012-2459 class). RFC 6962 trees
(0x00 leaf prefix, 0x01 node prefix, split at the largest power of two, no duplication) do not have this problem, and
they give inclusion and consistency proofs. S4 measured proofs of at most 10 hashes at 1,000 shards and 14 at
10,000. It also reproduced 9/9 Certificate Transparency reference roots and RFC 6962's 7/7 worked proofs.

## What `verifyIntegrity` misses, and a hardened verifier

Spike S4 found that `verifyIntegrity`, run unchanged, **accepts** records with:
- `leafHashes` and `merkleRoot` deleted (both checks are skipped when the fields are absent);
- one packet's `crystal32` changed, or its checksum changed, with parity re-fixed (crystals are never compared with
  the recreated chunk);
- `chainId` altered (it is never recomputed);
- one residual bit flipped such that the chunk still decodes to the same bytes (3.55% of single-bit residual flips).

It rejects swapped frames and broken parity.

A hardened verifier adds four checks:
- decode, then **re-encode** each chunk and require the stored residual (S4: rejects 689 of 689 aliasing flips);
- recompute `crystallize(chunk)` and require the stored packet;
- make `leafHashes` and `merkleRoot` mandatory, and recompute `chainId`;
- verify the ATTEST/1 signature against the key registry in the import path. Today nothing in Engram's import path
  calls `verifyGrown`.

It reports two verdicts: **self-consistent** (the checks above) and **authentic** (the signature). S4 measured the codec
part at a median of 41 ms per 60 KB shard; the re-encode adds about 25 ms.

## Cross-language notes (S4, S7)

- **Crystal bytes of 0x80.** The JavaScript `crystallize` keeps a raw 0x80 byte; `protocol/shdccp_kernel.py`'s `pack`
  writes 0x81. This affects 1.41% of chunks of real text (analytic 1.55%). It changes the stream bytes but never
  `chainId` or `merkleRoot`, because leaves and weave are computed from chunk bytes. Every deployed record was grown
  in JavaScript, so the JavaScript form should be normative for `shdccp/2`, with Python writing crystals raw.
- **Leaf and Merkle hashing.** JavaScript hashes hex strings, and the UTF-8 encoding of `String.fromCharCode` bytes
  (so every byte ≥ 0x80 counts twice). Python hashes binary. Neither side can verify the other's chains today.
- **The float weave.** It agrees across languages only if Python reproduces V8's `Math.hypot` algorithm: Python's
  `math.hypot` wrote a different weave string on 2 of 1,000 shards. An exact integer weave (the norm-5 quaternion
  chain of Engram Mind's Eye) removes the problem (S4: K = 84 leaves, norm 5^2352, unfolds in order).
- **ATTEST/1 across languages (S7).** WebCrypto signs in IEEE P1363 (r‖s, 64 bytes). Python's `cryptography` needs
  DER. The conversion back to P1363 must left-pad r and s to 32 bytes; a short r or s occurs in about 1 signature
  in 128. The high-S twin of a signature also verifies, so nothing should be keyed by signature bytes. Verification
  costs about 0.12–0.23 ms per shard.

## Privacy and licences: two tiers

Every signed-in user can read every biochain (`firestore.rules`), and streams decode to plaintext. So:
- **Tier S (stream):** plaintext travels in `shdccp/2` only for text whose licence allows redistribution (WordNet
  with its notice, UD EWT under CC BY-SA 4.0, BLiMP under CC BY, public-domain texts, your own).
- **Tier P (public commitments):** restricted corpora publish only hashes and roots. Each shard's public record
  carries a salted commitment, SHA-256(`LPREP-SALT/1`|salt|merkleRoot|chainId), with a 32-byte secret salt, so a
  known text cannot be confirmed by guessing. An auditor checks k shards chosen by hashing the manifest root, and the
  chance of missing a fraction f of bad shards is (1 − f)^k. This is attestation plus audit, not public
  recomputation.

## Suggested changes, in order of value

1. Keep `meta.kind` (`publishBiochain` drops it) and add a `kind` field to records.
2. Make leaves and root mandatory in `verifyIntegrity`; compare crystals; recompute `chainId`; add the re-encode check;
   verify the attestation in the import path.
3. Settle the 0x80 and leaf-hashing divergences under a stream version `shdccp/3`, together with the exact weave.
4. Add a manifest collection (`LCORPUS/1`, `LGROW/1`) and object storage keyed by root for corpora above 60 KB.
5. Validate record bodies in `firestore.rules`, not only identities.
6. Cache `engramCharGrid`: the engram layer recomputes each letter's grid for every letter of every token. S4 measured
   Owl's `growBiochain` with engrams on at about 7–10 s per 60 KB shard, against about 0.05 s with engrams off. The
   spike's engram layer with the 26 grids cached took about 0.13 s.
