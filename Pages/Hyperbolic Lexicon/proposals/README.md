# Proposals to other repositories

These documents are **proposals only**. Hyperbolic Lexicon reads the SHD-CCP, BioChain-AI and Owl-Academy
repositories but never changes them. Each proposal cites the files and lines it rests on, from a read-only survey at
Ebayednoob 7b10514, Owl-Academy 7f45f35, BioChain-AI c975161 and SHD-CCP 97d90ac. They are meant to be sent to those
repositories' maintainers after Phase 3, when they can carry measured numbers instead of estimates.

| File | For | In short |
| --- | --- | --- |
| `SHD-CCP-RFC01-layout-census.md` | SHD-CCP | Eight incompatible 64-bit layouts; every Form value already claimed; please settle RFC 01 vs the Blackwell word and carry kinds above the word |
| `SHD-CCP-RFC03-exact-Qh-and-LPS.md` | SHD-CCP | Name LPS p = 5 in RFC 03: our norm-5 tree is the tree X(5, q) is a quotient of; exact Q_h on the wire; worked vertex counts and girths |
| `SHD-CCP-Lemma15-note.md` | SHD-CCP | Two different structures are called "Merkle"; the biochain rule is malleable; a proposed Lemma 15 for RFC 6962 trees and vectors for the pending `03_merkle_collision` suite |
| `SHD-CCP-kernel-hyperbolic-address.md`, `kernel_0xA_hyperbolic_address.json`, `check_kernel.py` | SHD-CCP | Kernel 0xA, the Hyperbolic Address Tile, at `[OPEN]`; passes the Ontology's own lint and suites |
| `SHD-CCP-golden-vectors.md` | SHD-CCP | SHDGEV01 suites for the address codec, the Blackwell compatibility case, the LPS reduction, exact points and RFC 6962 roots |
| `BioChain-AI-language-chains.md` | BioChain-AI | Language pre-processing biochains: shards past the 60 KB lineage cap, typed records, a hardened verifier, two tiers for licences, and the `shdccp/3` decisions |
| `Owl-Academy-notes.md` | Owl Academy | An always-true continuity check, a publish path that cannot succeed, HMAC certificates keyed by a public ID, `verifyIntegrity`'s gaps, tokenizer and hex-convention mismatches, and an engram/2 key |

Run the kernel check (it is skipped, not passed, without an SHD-CCP checkout beside this repository):

```
python3 -B -I "Pages/Hyperbolic Lexicon/proposals/check_kernel.py"
```
