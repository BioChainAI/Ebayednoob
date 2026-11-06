# Proposal to BioChain-AI: language pre-processing biochains

**Status:** proposal only; nothing in the BioChain-AI repository was changed. Written in Hyperbolic Lexicon's Phase 0
(Ebayednoob, `Pages/Hyperbolic Lexicon/`) from a read-only survey of BioChain-AI at c975161, and finalised after
Phase 3 with measured numbers.

**How to read the numbers.**
- **Measured** marks a result of the Lexicon's Phase 3 decisive run (claims L8–L11, registered in
  `PREREGISTRATION.md` with Amendments 7 and 8 before any decisive run). The run ran BioChain-AI's
  `src/biomesh/biomesh.js` (`growBiochain`, `verifyIntegrity`) and, from `src/identity/`, `crypto-core.js`
  (`deriveKeyVector`, `keyIdFromPublic`) and `identity-registry.js` (`computeIdentityId`) at c975161, and Owl
  Academy's `scripts/biomesh.js` at 7f45f35, unchanged, from their checkouts, by name-grab in Node. ATTEST/1 signing
  and verification were the Lexicon's own (WebCrypto, `cryptography`), not BioChain-AI's `signing-key.js`. Every number is in `reference/results/claims-phase3.json`
  (summary in `claims-phase3.md`), commit 865791f: one run, 50 min 44 s, on the code committed at 6da04be.
- **Spike S4** or **S7** marks a Phase 0 measurement (`spikes/s4_lexicon_shard_output.txt`,
  `spikes/s7_attestation_output.txt`) that no claim measured again. Both spikes also ran BioChain-AI's and Owl
  Academy's code unchanged.
- **Proposed** marks what we ask of BioChain-AI. None of it has been tried in BioChain-AI's code.

## The short answer

Yes, language pre-processing data can be grown as SHD-CCP biochains, but not by extending one chain.

`extendBiochain` regrows parent plus new text through `growBiochain`, which throws above `MAX_GROW_BYTES = 60000`
(`src/biomesh/biomesh.js`, lines 280–282 and 389–402). A whole lineage is therefore capped at 60 KB. (This is read
from the code; no claim tested the cap itself.) By our estimate, BabyLM's 10M-word track is about 55–60 MB of text,
about 1,000 chains, and the 100M-word track about 10,000.

What works:
- **Many independent shards** of at most 60,000 bytes, each an unmodified `shdccp/2` biochain that BioChain-AI's,
  Owl Academy's and Engram Mind's Eye's verifiers already accept;
- **tied together by a manifest**, a new record kind that is append-only and checkable.

**Measured (L8, supported for the Lexicon's JS grower and for its Python port).** WordNet 3.0's noun synsets, one
line each (offset, lemmas, gloss; corpus C0, 8,831,867 bytes), were cut at line boundaries into 148 shards of at most
60,000 bytes (147 of them at least 59,000), and 20 synthetic shards were added for the multi-byte cases (about 30%
two-byte characters, each with at least one chunk whose crystal holds 0x80). Each shard was grown with engrams off
and on: 336 records per grower.
- None of the 336 records from the Lexicon's synchronous JS grower, none from its Python port, and none from
  BioChain-AI's own `growBiochain` differs from Owl Academy's `growBiochain` in any of the fifteen record fields.
- BioChain-AI's and Owl Academy's `verifyIntegrity` accept every record.
- Engram Mind's Eye's `importBiochain` recreates every text byte for byte.

**Measured (L9, L11): the shards under one manifest.** The 148 C0 shards sit under one RFC 6962 manifest (below).
Verifying a full shard with every hardened check takes a median 155.4 ms in Node; with the session's one-off cost,
1,000 shards take about 156.7 s (L11, with Amendment 8's disclosure below).

## Records (typed commitments, as GROWN/1 is)

Each record is a pipe-joined string, hashed with SHA-256 and signed in BioChain-AI's exact ATTEST/1 format:
`ATTEST/1|keyId|keyVector|SHA256(commitment)|epochToken` (`src/identity/crypto-core.js`). They are named by **kind**,
never by a Form nibble, because every Form value is already claimed (see `SHD-CCP-RFC01-layout-census.md`).

| Kind | Commits | Status |
| --- | --- | --- |
| `LVOCAB/1` | the tokenizer: vocabulary SHA-256, normaliser-spec SHA-256, Unicode-table SHA-256, the tokenizer and vocabulary-builder names, the training-set SHA-256, the special tokens with their ids | built |
| `LADDR/1` | the address table: vocabulary hash, WordNet archive SHA-256, the address rule, `addrTableRoot` (an RFC 6962 root over the table rows), the exact H³ and H² trees' parameters | built |
| `LPREP/1` (one per shard) | corpus id, shard index, chainId, merkleRoot, byte length, SHA-256 of the raw slice, SPDX licence, source hash, `LVOCAB/1` hash, id-stream SHA-256, `LADDR/1` hash, exact-weave hash, engram-stream hash, tier | built |
| `LCORPUS/1` | the manifest: corpus id, N, an RFC 6962 root over SHA-256(`LPREP/1`) in shard order, the SHA-256 of the licence set; fields for evaluation-set hashes and a contamination receipt, left empty (`-`) until the Lexicon's Phase 6 | built |
| `LGROW/1` | growth: old size and root, new size and root, and the SHA-256 of a consistency proof that the new manifest extends the old. Nothing is regrown. | built |
| `LBENCH/1` | a benchmark receipt: claim, subject hash, evaluation-set hash (gated sets by hash only), scorer and version, seeds, per-item output hash, metrics, hardware and versions, class (reproducible or attested) | proposed; the Lexicon defines it when Phase 4 first uses it |

**Measured (L8(d), L10).** The five built kinds exist in JavaScript and Python with the exact strings Amendment 7
(item 3) fixed before any code. `LVOCAB/1`, `LADDR/1` (its `addrTableRoot` over 8,192 rows) and every shard's
`LPREP/1` string are identical in the two languages. Each `LPREP/1` was attested in ATTEST/1 with an ECDSA P-256 key
made in WebCrypto for the run. BioChain-AI's own `computeIdentityId` and `deriveKeyVector` gave the identity
`0xAE3502AC6FFBA237` and key vector `9BC2024804859196`, and the Lexicon's ports in JS and Python gave the same values.

Derived layers (token ids, addresses) are never stored per token. They follow the `engramStream` precedent: they are
pure functions of the recreated text and pinned tables, so verifiers recompute them and compare hashes.

## Why RFC 6962 for the manifest, not the current Merkle rule

The `shdccp/2` Merkle rule duplicates the last node on odd levels, so a list and the same list with its last element
repeated have the same root (the CVE-2012-2459 class). RFC 6962 trees (0x00 leaf prefix, 0x01 node prefix, split at
the largest power of two below n, no duplication) do not have this problem, and they give inclusion and consistency
proofs.

**Measured (L9, supported).**
- **The collision, as a control that had to show it:** under the `shdccp/2` rule, a list and the same list with its
  last leaf duplicated have one root at K = 3, 7 and 1,001, in JS and in Python.
- **The manifest:** the RFC 6962 tree over the SHA-256 of C0's 148 `LPREP/1` strings has the root
  `f567700daafc85f8163c6e290f8555472751335daf4728fa9a64d18ad23f19b3` in both languages.
- **Proofs and tampers:** on the manifest and on synthetic lists of K = 1, 2, 3, 7, 84, 200, 1,000 and 1,001 leaves:
  - every root, inclusion proof and consistency proof is equal in JS and Python;
  - every inclusion proof verifies for its own leaf and position and fails for the wrong ones;
  - every consistency proof verifies (every prefix size on the manifest and for K ≤ 200; 2,000 drawn for K = 1,000
    and 1,001), so `LGROW/1` is append-only;
  - no alteration goes undetected: replace, delete, insert, adjacent swap, duplicate-last and truncation with the old
    root kept (739 on the manifest; every one for K ≤ 200; 2,000 drawn for each larger K).
- **Proof sizes:** at most 8 hashes at K = 148 and 10 at K = 1,000 and 1,001. Spike S4 estimated 14 at 10,000 shards.

The Lexicon's chain trace (`reference/traces/chain_v1.txt`, which the JS reproduces line for line) also pins the 9
Certificate Transparency reference roots and RFC 6962's 7 worked audit and consistency proofs, which spike S4 first
reproduced.

## What `verifyIntegrity` misses, and a hardened verifier

**Measured (L10, control 1).** Owl Academy's `verifyIntegrity` (`scripts/biomesh.js` at 7f45f35, run unchanged from
its checkout) **accepted 50 of 50** records in each of four registered tamper classes:
- **T1:** `leafHashes` and `merkleRoot` deleted (both checks are skipped when the fields are absent);
- **T2:** one packet's `crystal32` changed, parity re-fixed (crystals are never compared with the recreated chunk);
- **T8:** `chainId` altered (it is never recomputed);
- **T9:** one residual bit flipped such that the chunk still decodes to the same bytes, a non-canonical encoding (49
  of the 50 flips fell inside a raw-byte escape code, 1 in the padding after the last code).

BioChain-AI's `verifyIntegrity` (`src/biomesh/biomesh.js`, lines 338–381) is the same code as Owl's, except for the
name of its SHA-256 module. It accepted all 336 clean records of L8, but it was not run on the tampers. Spike S4
found that Owl's also accepts a packet checksum changed with parity re-fixed, and that it rejects swapped frames and
broken parity.

**Measured (L10, supported): the hardened verifier.** The Lexicon's verifier, in JS (WebCrypto) and Python
(`cryptography`), runs ten checks in a fixed order:
1. packet parity;
2. **canonical:** decode, then **re-encode** each chunk and require the stored residual byte for byte;
3. **crystal:** recompute `crystallize(chunk)` and require the stored packet;
4. **leaves:** `leafHashes` and `merkleRoot` mandatory, recomputed with the JS rule;
5. **weaves:** both weaves, the segments and `chainId` recomputed;
6. **derived:** the engram layer (when present), the V0 id stream and the exact weave recomputed;
7. **commitment:** the `LPREP/1` string rebuilt from the recomputed fields;
8. **attestation:** the ATTEST/1 signature against a pinned key-registry snapshot, refusing revoked keys;
9. **inclusion:** the shard's inclusion proof in `LCORPUS/1`;
10. **consistency:** the `LGROW/1` consistency proof.

Over 50 clean packages and 450 tampered ones (T1–T9, 50 each), it accepted every clean package and rejected every
tampered one, in both languages, with identical verdicts and the same failing check named:

| Class | Tamper | Failing check (JS = Python) |
| --- | --- | --- |
| T1 | `leafHashes` and `merkleRoot` removed | leaves, 50 |
| T2 | one packet's `crystal32` changed, parity re-fixed | crystal, 50 |
| T3 | an `LPREP/1` field changed (the vocabulary hash) | commitment, 50 |
| T4 | signed by a key the registry marks revoked | attestation, 50 |
| T5 | a valid attestation of a different shard | attestation, 50 |
| T6 | a Tier-P salted commitment checked with a wrong salt | commitment, 50 |
| T7 | two adjacent frames swapped | leaves, 48; canonical, 2 |
| T8 | `chainId` altered | weaves, 50 |
| T9 | a residual bit flip that decodes the same | canonical, 50 |

So the re-encode (canonical) check is what closes the silent residual flips of T9. The verifier reports two verdicts,
as Explainer 4 defined them in Phase 0 and Amendment 8 (item 3) fixed them before the decisive run:
**self-consistent** (every check but the signature: the record, its derived layers and its place in the manifest)
and **authentic** (the signature). T4 and T5 are self-consistent and not authentic; T1, T2 and T6–T9 are authentic
and not self-consistent; T3 is neither.

**Measured (L11, supported): the cost.** The 147 full C0 shards (at least 59,000 bytes each), verified with every
check in Node, single-threaded, on one 4-CPU container, take a median **155.4 ms** per shard, 95% bootstrap interval
[154.2, 156.0], against the registered bar of 250 ms. By step, in median ms:

| canonical | derived | weaves | crystal | leaves | commitment | parity | attestation | inclusion | consistency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 78.9 | 46.4 | 13.3 | 7.2 | 4.6 | 1.8 | 1.1 | 0.7 | 0.2 | 0.1 |

A verification session (`LVOCAB/1`, `LADDR/1` recomputed from WordNet, the registry snapshot loaded) costs 1,303.1 ms
once. Python takes 195.9 ms [192.5, 199.1] per shard. Spike S4 had estimated 41 ms for the codec part plus about
25 ms for the re-encode, and the registration predicted 50–150 ms: the measured median is just above that band, and
the re-encode and the derived layers take most of it.

**Amendment 8 disclosure.** Amendment 8 was written after the dry runs and before the decisive run.
- **The timed packages were grown with engrams off,** the Lexicon's default for corpora. The registration had not
  said which. The runner first read it the other way, and those dry runs put the median on engrams-on packages at
  243.5–265.5 ms, near the bar. The reading was fixed after seeing that. In the decisive run, the same shards'
  engrams-on packages took 243.6 ms [240.2, 246.7] (reported; it decides nothing).
- **L11's registered control was replaced.** The control ("with the attestation step skipped it must be faster"),
  read as a comparison of medians, could not resolve a 0.7–0.8 ms step against 10–28 ms of noise in the dry runs.
  It was replaced by the verifier's own record of each step, which held: the attestation ran inside the timed
  window in 441 of 441 full verifications and was recorded skipped in 441 of 441 attestation-skipped ones. The
  comparison, reported: skipped 153.5 ms against 155.4 ms, paired difference 1.9 ms [0.4, 3.0].

**What these measurements do not show.**
- **Scope:** they hold for these shards, for BioChain-AI and Owl Academy at the pinned commits, and for one Node
  release and one Python build on one Linux container.
- **Tampers:** they are the nine registered classes, 50 records each, not an adversary's search.
- **Keys:** they were made for the run. No real key registry, revocation service or published corpus was involved,
  and nothing was sent to Firestore.

**Proposed for BioChain-AI.** Add four checks to `verifyIntegrity`, or to a strict variant beside it:
- decode, then re-encode each chunk and require the stored residual;
- recompute `crystallize(chunk)` and require the stored packet;
- make `leafHashes` and `merkleRoot` mandatory, and recompute both weaves and `chainId`;
- verify the ATTEST/1 signature against the key registry in the import path. Today nothing in Engram's import path
  calls `verifyGrown`.

The Lexicon's `lexicon_core.js` (chain section) and `reference/lexicon/verify.py` implement these checks and may be
read as a reference.

## Cross-language notes

- **Crystal bytes of 0x80.** The JavaScript `crystallize` keeps a raw 0x80 byte; `protocol/shdccp_kernel.py`'s `pack`
  writes 0x81.
  - **Measured (L8):** the crystal holds 0x80 in 189 of C0's 12,378 chunks (1.527%; spike S4: 1.41% of verb and
    adjective gloss chunks, analytic 1.55%), and in 32 of the synthetic shards' 1,175 chunks (2.723%).
  - **Measured (L8, control 1):** a Python grower that packs with the kernel's normalisation differs from Owl's
    record on 20 of 20 synthetic shards, in the stream field only. `chainId` and `merkleRoot` are unchanged, because
    leaves and weave are computed from chunk bytes. The Lexicon's Python port, which writes crystals raw, equals
    Owl's on 336 of 336.
  - **Proposed:** every deployed record was grown in JavaScript, so the JavaScript form should be normative for
    `shdccp/2`, with Python writing crystals raw.
- **Leaf and Merkle hashing.** JavaScript hashes hex strings, and the UTF-8 encoding of `String.fromCharCode` bytes
  (so every byte ≥ 0x80 counts twice). Python hashes binary. Neither side can verify the other's chains today.
  - **Measured (L8, control 2):** a grower that hashes leaves over binary bytes differs from Owl's record on 168 of
    168 shards, and Owl's `verifyIntegrity` rejects all 168 (leaf 0 mismatch). The Lexicon's Python port reproduces
    the JavaScript rule and equals Owl's on 336 of 336.
- **The float weave.** It agrees across languages only if Python reproduces V8's `Math.hypot` algorithm. Spike S4:
  Python's `math.hypot` wrote a different weave string on 2 of 1,000 shards.
  - **Measured (L8):** a Python port with V8's `hypot` and an exact `toFixed(12)` writes Owl's `weaveChiral` and
    `weaveMirror` on 336 of 336 records.
  - **Measured (L9(b)):** the exact integer weave, the norm-5 quaternion chain of Engram Mind's Eye over the first
    8 bytes of each leaf hash. On each of the 148 C0 shards it has norm exactly 5^(28K), unfolds in order to its leaf
    prefixes, and equals the product of its 7 segment sub-weaves, with identical components in JS and Python: 971 to
    2,731 bits per component, a median 45.9 ms (JS) and 51.3 ms (Python) per shard. As a control, on the synthetic
    lists an XOR summary of the same 8-byte prefixes misses every adjacent swap tested (199 of 199 at K = 200), each
    of which the weave detects.
  - **Proposed:** the exact weave for `shdccp/3`. Today it is the Lexicon's own record field (`weave3Sha` in
    `LPREP/1`); `shdccp/2` still carries the float weave, which the grower reproduces.
- **ATTEST/1 across languages.** WebCrypto signs in IEEE P1363 (r‖s, 64 bytes). Python's `cryptography` needs DER.
  - **Measured (L10, control 2):** Python without the P1363-to-DER conversion accepted 0 of the run's 126 valid
    signatures, all of which verify with it.
  - **Spike S7:** the conversion back to P1363 must left-pad r and s to 32 bytes; a short r or s occurs in about 1
    signature in 128. The chain trace pins one short-r and one short-s signature with their padded and unpadded forms,
    and the JS reproduces them.
  - **Spike S7:** the high-S twin of a signature also verifies, so nothing should be keyed by signature bytes. The
    trace pins five twins.
  - **Measured (L11):** the attestation step costs a median 0.7 ms per shard inside the Node verifier and 0.25 ms in
    Python. Spike S7 had timed a bare WebCrypto verify at about 0.12 ms.

## Privacy and licences: two tiers

Every signed-in user can read every biochain (`firestore.rules`), and streams decode to plaintext. So:
- **Tier S (stream):** plaintext travels in `shdccp/2` only for text whose licence allows redistribution (WordNet
  with its notice, UD EWT under CC BY-SA 4.0, BLiMP under CC BY, public-domain texts, your own).
- **Tier P (public commitments):** restricted corpora publish only hashes and roots. Each shard's public record
  carries a salted commitment, SHA-256(`LPREP-SALT/1`|salt|merkleRoot|chainId), with a 32-byte secret salt, so a
  known text cannot be confirmed by guessing. An auditor checks k shards chosen by hashing the manifest root, and the
  chance of missing a fraction f of bad shards is (1 − f)^k. This is attestation plus audit, not public
  recomputation.

**Measured (L10), and only this far.** Tier P was exercised only through T6. The 26 Tier-P packages T6 used, checked
with their own salts, were all accepted; the 50 T6 records, checked with the next shard's salt, were all rejected at
the commitment check. The audit by k sampled shards is still proposed and was not measured.

## Suggested changes, in order of value

All six are **proposed**. The evidence behind each is in brackets.

1. Keep `meta.kind` (`publishBiochain` drops it) and add a `kind` field to records. [From the survey.]
2. Make leaves and root mandatory in `verifyIntegrity`; compare crystals; recompute `chainId`; add the re-encode
   check; verify the attestation in the import path. [L10: Owl's `verifyIntegrity`, of which BioChain-AI's is a copy,
   accepted 50 of 50 in each of T1, T2, T8 and T9. The hardened checks rejected all 450 tampered packages in JS and
   Python and accepted all 50 clean ones.]
3. Settle the 0x80 and leaf-hashing divergences under a stream version `shdccp/3`, together with the exact weave.
   [L8's controls 1 and 2; L9(b).]
4. Add a manifest collection (`LCORPUS/1`, `LGROW/1`) and object storage keyed by root for corpora above 60 KB. [L9;
   L11.]
5. Validate record bodies in `firestore.rules`, not only identities. [From the survey.]
6. Cache `engramCharGrid`. In `engramGrid`, line 133 calls `engramCharGrid(ch)` inside the `map` over the 64 grid
   entries, so each letter of each token builds its 64-entry grid 64 times.
   - **Measured (L8, reported):** with engrams on, BioChain-AI's `growBiochain` took a median 9,291.4 ms per shard
     and Owl's 9,319 ms, against 69.6 ms and 70.5 ms with engrams off. Both ran in four contended worker threads,
     and this pool took 1,837.6 s of the 50 min 44 s run.
   - **Measured (L8, reported):** the Lexicon's grower writes the same engram layer (0 of 336 records differ),
     computing each distinct token's packet once with `engram_core.js`. Run alone, it took a median 119.1 ms per
     shard with engrams on (63.6 ms of it the engram layer) and 56 ms with engrams off.
   - The two timings are not like for like (contended threads against a lone process). Measured alone, in spike S4,
     the engram layer as these growers write it took 6,933.7 ms on one verb shard, and `engram_core.js`'s 131.5 ms.
