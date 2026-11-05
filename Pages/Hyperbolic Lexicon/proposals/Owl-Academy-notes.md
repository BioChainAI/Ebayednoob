# Notes for Owl Academy

**Status:** notes only; nothing in the Owl-Academy repository was changed. These were found during Hyperbolic
Lexicon's Phase 0, in a read-only survey of Owl-Academy at 7f45f35. Every item gives the file and line so it can be
checked. Items 1–4 affect correctness; 5–8 matter if Owl Academy's language data is to be grown as biochains.

## 1. The packet continuity check in Engram Mind Eye always passes

`Library/Experimental_Systems/Engram_Mind_Eye.html`:
- line 872 computes `newParity = (fold32(seed64) ^ rotl32(prevParity, 1)) >>> 0`;
- lines 889–890 then "check" it by recomputing the same expression from the same inputs and comparing.

The check cannot fail, so it detects nothing. A real continuity check would recompute the header from the *stored*
previous packet and compare it with the *stored* current header. Engram Mind's Eye (Ebayednoob) does not rely on
this check; its integrity comes from SHA-256 and the Merkle chain.

## 2. Publishing from Biomesh Mind's Eye 3D cannot succeed

`mage_tower/Biomesh_Mind_Eye_3D.html`:
- lines 998 and 1488 import `../scripts/biomesh.js` as `BM`;
- lines 1004 and 1493 call `BM.listMinorTomes?.(uid)`.

`listMinorTomes` is exported by `scripts/minor-tome.js` (line 58), not by `biomesh.js`. The optional call returns
`undefined`, so `sealId` is always `null`, and `publishBiochain` → `signWithMinorTome(uid, null, …)`
(`minor-tome.js`, lines 77–79) throws "Minor tome not found." The page catches the error and says that publishing
is unavailable. The fix is to import `listMinorTomes` from `minor-tome.js`.

## 3. Genesis validation certificates are keyed by a public identifier

`scripts/genesis-registrar.js`, lines 10–11 and 94/127: the certificate is an HMAC-SHA-256 keyed by the issuer's
Cosmological ID. Anyone who knows that ID can mint a certificate that `hmacVerify` accepts. Only the Firestore rules
stand in the way, and they do not apply off Firestore. A signature from a private key (ECDSA, as the minor-tome seals
already use) would make the certificate checkable anywhere. This matters before any dataset curation rests on tiers.

## 4. `verifyIntegrity` proves self-consistency, not authenticity

`scripts/biomesh.js`, lines 341–384:
- leaf and Merkle-root checks are skipped when the fields are absent, so a record with both deleted passes;
- a packet's `crystal32` and checksum are never compared with the recreated chunk; only parity is checked, and
  `payload16` is used as the decode length;
- `chainId` and `weaveMirror` are not recomputed.

A record can therefore be altered and still verify. Authenticity needs the GROWN/1 seal checked as well
(`verifyGrown`).

Hyperbolic Lexicon's claim L10 registers a stricter verifier and a tamper set that measures each gap. Its control
expects Owl's `verifyIntegrity` to accept records with leaves and root removed, or with a crystal changed.

## 5. The engram tokenizers disagree

The two engram tokenizers split "don't 3.14 e-mail" differently:

| Tokenizer | Rule | Result |
| --- | --- | --- |
| Engram Mind Eye (lines 853–859) | splits on `/[^A-Za-z0-9]+/` and upper-cases | `[DON, T, 3, 14, E, MAIL]` |
| `biomesh.js` `tokenizeEngrams` (line 153) | matches `/[A-Za-z0-9']+/` and keeps case | `[don't, 3, 14, e, mail]` |

So token and packet counts differ for the same text. Three more ad-hoc tokenizers exist (`text_to_codex.py`,
`TTMPT_Bulk_Trainer`, `converter.html`).

## 6. Two hex conventions for the same engram

Chiral keys and engram streams write a key's bytes least significant first: GEODESIC → `5C896A4801C9C24C`.
The Mind Eye packet body writes `seed64` with bit i at BigInt bit i, which gives the byte-reversed
`4CC2C901486A895C`. Segmented crystal exports use the second convention. Both are fine once documented; mixing them
silently breaks lookups.

## 7. engram/1 cannot serve as a token id

engram/1 keeps only the parity of each letter's count. The 26 letter grids have GF(2) rank 26, so:
- anagrams collide (LISTEN = SILENT);
- every word in which each letter appears an even number of times, and every number, map to the zero key;
- distances between words look random (mean about 32/64 bits).

`BIOMESH_SYSTEM.md` (lines 141–145) says so too. Hyperbolic Lexicon keeps engram/1 only as a compatibility checksum.
Its claim L2 measures the collision share on WordNet's lemmas.

**Proposal: an engram/2 key** made of a subword id from a pinned vocabulary plus an exact address in the LPS p=5
quaternion tree, the same tree Engram Mind Eye's addresses already use. Hyperbolic Lexicon is building and testing
this address; engram/2 would be registered separately once the address claims are decided.

## 8. Language biochains

A whole biochain lineage is capped at 60,000 bytes: `extendBiochain` regrows parent plus new text through
`growBiochain`, which throws above `MAX_GROW_BYTES`. Corpus-scale language data therefore needs many independent
shards tied together by a manifest. See `BioChain-AI-language-chains.md` in this folder; the same design applies to
Owl Academy's `biomesh.js`, which shares the codec byte for byte.
