# Proposals to other repositories

These documents are **proposals only**. Hyperbolic Lexicon reads the SHD-CCP, BioChain-AI and Owl-Academy
repositories but never changes them. Each proposal cites the files and lines it rests on, from a read-only survey at
Ebayednoob 7b10514, Owl-Academy 7f45f35, BioChain-AI c975161 and SHD-CCP 97d90ac. Phase 3 ran Owl Academy's and
BioChain-AI's code at those same commits, unchanged; its runner checked both checkouts before it started.

They were written in Phase 0 and finalised after Phase 3. Where a registered claim has since measured something a
proposal had predicted or estimated from a spike, the proposal now gives the measurement, marked **measured**, with
its source:
- Phase 3 (L8–L11): `reference/results/claims-phase3.json` (every number) and `claims-phase3.md`, console in
  `phase3-console.txt`, commit 865791f. It was one run, 50 min 44 s long, on the code committed at 6da04be, which
  includes Amendment 8. (The results' header reads "PREREGISTRATION.md with Amendments 1-7"; that is the runner's
  fixed label, recorded with two other stale texts in Amendment 9, an erratum that changes no result.)
- Phase 1 (L2, L3's Python side, L5, L7): `reference/results/claims.json`, commit 6af2a83.
- Phase 2 (L1, L3(f), L4(a, b)): `reference/results/claims-phase2.json`, commit 648a6b6.

Numbers that no claim has measured again still cite their spike (`spikes/s*_output.txt`). Everything asked of the
maintainers is still **proposed**. The roadmap delivers these documents in Phase 8 (Integration).

| File | For | In short |
| --- | --- | --- |
| `SHD-CCP-RFC01-layout-census.md` | SHD-CCP | Eight incompatible 64-bit layouts; every Form value already claimed; please settle RFC 01 vs the Blackwell word and carry kinds above the word. Measured: the Lexicon's grower writes Owl's Blackwell records field for field (L8) |
| `SHD-CCP-RFC03-exact-Qh-and-LPS.md` | SHD-CCP | Name LPS p = 5 in RFC 03: our norm-5 tree is the tree X(5, q) is a quotient of; exact Q_h on the wire; vertex counts and girths, re-checked by L7; float ranking inverts exact order on 990 of 1,000 noun queries in H³ (L4(b)) |
| `SHD-CCP-Lemma15-note.md` | SHD-CCP | Two different structures are called "Merkle"; the biochain rule is malleable (measured: it collides at K = 3, 7 and 1,001); a proposed Lemma 15 for RFC 6962 trees; L9's roots and proofs as vectors for the pending `03_merkle_collision` suite |
| `SHD-CCP-kernel-hyperbolic-address.md`, `kernel_0xA_hyperbolic_address.json`, `check_kernel.py` | SHD-CCP | Kernel 0xA, the Hyperbolic Address Tile, at `[OPEN]`; passes the Ontology's own lint and suites; L3 and L7 now supported |
| `SHD-CCP-golden-vectors.md` | SHD-CCP | SHDGEV01 suites for the address codec, the Blackwell compatibility case, the LPS reduction, exact points and RFC 6962 roots. Not written yet: carried over from Phase 3's plan; they decide no claim |
| `BioChain-AI-language-chains.md` | BioChain-AI | Language pre-processing biochains: shards past the 60 KB lineage cap, typed records, a hardened verifier, two tiers for licences, and the `shdccp/3` decisions, with L8–L11's measurements |
| `Owl-Academy-notes.md` | Owl Academy | An always-true continuity check, a publish path that cannot succeed, HMAC certificates keyed by a public ID, `verifyIntegrity`'s gaps (measured), tokenizer and hex-convention mismatches, and an engram/2 key |

## What Phase 3 measured, in brief

| Point | Measured | Claim |
| --- | --- | --- |
| Language shards are ordinary biochains | 0 of 336 records (148 WordNet shards and 20 synthetic ones, engrams off and on) differ from Owl Academy's `growBiochain` in any of the fifteen fields, for the Lexicon's JS grower and its Python port; BioChain-AI's grower gives the same; Owl's and BioChain-AI's `verifyIntegrity` accept every record | L8, supported |
| The 60 KB lineage cap, worked around | The cap is read from the code (`MAX_GROW_BYTES`). The shard-and-manifest design was measured: 8,831,867 bytes of WordNet noun synsets in 148 shards of at most 60,000 bytes, under one RFC 6962 manifest | L8, L9 |
| RFC 6962 against the `shdccp/2` Merkle rule | The `shdccp/2` rule gives a list and the list with its last leaf duplicated one root at K = 3, 7 and 1,001. The RFC 6962 manifest (root `f567700d…`) and lists up to K = 1,001 detect every alteration; roots and proofs are equal in JS and Python; inclusion proofs need at most 10 hashes at K = 1,001 | L9, supported |
| `verifyIntegrity`'s gaps | Owl's accepts 50 of 50 in each of T1 (leaves and root removed), T2 (crystal changed), T8 (`chainId` changed) and T9 (a residual flip that decodes the same). The hardened verifier rejects all 450 tampered packages in JS and Python; its re-encode (canonical) check closes T9 | L10, supported |
| P1363 and DER | Python without the P1363-to-DER conversion accepts 0 of 126 valid WebCrypto signatures | L10, control 2 |
| Per-shard verification cost | Median 155.4 ms per full shard, 95% interval [154.2, 156.0], in Node, single-threaded, against a 250 ms bar; about 156.7 s for 1,000 shards. Under Amendment 8, the packages were grown with engrams off, a reading fixed after dry runs put the engrams-on median at 243.5–265.5 ms; in the decisive run the engrams-on packages took 243.6 ms (reported). L11's control was replaced by the verifier's own step record, which held: the attestation ran inside the timed window in 441 of 441 full verifications and was recorded skipped in 441 of 441 attestation-skipped ones; the registered comparison of medians, reported: skipped faster by 1.9 ms [0.4, 3.0] | L11, supported |
| 0x80 crystal bytes | 189 of 12,378 WordNet chunks (1.527%); BioChain-AI's Python kernel normalisation changes the stream of 20 of 20 synthetic shards | L8 |

Run the kernel check (it is skipped, not passed, without an SHD-CCP checkout beside this repository):

```
python3 -B -I "Pages/Hyperbolic Lexicon/proposals/check_kernel.py"
```
