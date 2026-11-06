# Hyperbolic Lexicon, Phase 3: L8-L11 (dry run)

Run 2026-11-06 03:56:57 UTC with PREREGISTRATION.md with Amendments 1-7 by `reference/run_claims_phase3.cjs --dry`. Node v22.23.4 (V8 12.4.254.21-node.57, 4 CPUs, 4 worker threads); Python 3.13.18 (cryptography 50.0.1, numpy 2.5.3); Owl Academy 7f45f35, BioChain-AI c975161; repository b822237 (with 9 uncommitted path(s) in the system when the run started:  M "Pages/Hyperbolic Lexicon/lexicon_core.js";  M "Pages/Hyperbolic Lexicon/reference/lexicon/verify.py";  M "Pages/Hyperbolic Lexicon/reference/run_claims_phase3.cjs";  M "Pages/Hyperbolic Lexicon/reference/traces/chain_v1.txt";  M "Pages/Hyperbolic Lexicon/tests/all.cjs";  M "Pages/Hyperbolic Lexicon/tests/chain-lexicon.cjs"; ?? "Pages/Hyperbolic Lexicon/reference/results/dry/claims-phase3.json"; ?? "Pages/Hyperbolic Lexicon/reference/results/dry/claims-phase3.md"; ?? "Pages/Hyperbolic Lexicon/reference/results/dry/phase3-registry.json"). Gate: 19991/19991 lines of tests/parity-lexicon.cjs pass, none skipped (ok    chain_v1.txt: 1323/1323; ok    chain: controls of the trace check: 1/1).

Instances: synth 20 shards (lexicon-synth-v1, Rng(4000..4019)); verb 22 shards (wordnet30-verb); adj 33 shards (wordnet30-adj); the corpus of L9(a), L10 and L11 is verb, packaged with engrams off.

| Claim | Decision | What decided it |
| --- | --- | --- |
| L8 (JS grower) | supported | 0 failures over 150 records; controls 1/2/3 show their weakness: yes/yes/yes |
| L8 (Python port) | supported | 0 failures over 150 records |
| L9 | supported | 0 failures (manifest K = 22, 8 synthetic lists, 22 weaves); controls 1/2: yes/yes |
| L10 | supported | false accepts 0 (JS) / 0 (Python), false rejects 0 / 0, verdicts differ on 0; control 2: 0/93 raw signatures accepted |
| L11 | supported | median 156.249 ms, 95% interval [150.106, 162.027] over 21 shards; attestation skipped 157.858 ms |

## L8 · Language shards are Owl-valid biochains

Records: 75 shards x engrams off and on. Records differing from Owl's: growSync 0, Python 0, BioChain-AI 0. (d): LVOCAB/1 equal, LADDR/1 equal (addrTableRoot `30b17bc3992d5bab98e8955bc215c03c5706e5847b2ed4a7c7b22f39635349e1`, 8192 rows; 2310 ms in JS, 1049.7 ms in Python), shards with an id stream or LPREP/1 difference: 0.

| Control | Shows its weakness | Detail |
| --- | --- | --- |
| 1 (kernel normalisation) | yes | differs from Owl on 20/20 synthetic shards |
| 2 (leaves over binary) | yes | differs on 75/75, rejected by Owl on 75/75 (leaf 0 mismatch); Python's equals JS's on 75 |
| 3 (one byte altered) | yes | leaf and root changed on 75/75 |

Reported: share of chunks whose crystal holds 0x80: synth 29/1200 (2.417%), verb 22/1831 (1.202%), adj 42/2698 (1.557%); synthetic draws 2,2,3,2,1,1,2,3,7,2,1,1,2,2,1,1,2,2,1,2 (two-byte share 29.232-30.738%); median value 1.081 (engrams off), 0.457 (on); median ms per shard: growSync 58 / 132.2, Python 55.9 / 235.1, Owl 69.6 / 8765.7, BioChain-AI 69.1 / 8835.5 (off / on; Owl's and BioChain-AI's growers ran in 4 worker threads beside the Python half (contended); growSync and Python alone).

<details><summary>Per shard</summary>

| Shard | Bytes | Chunks | 0x80 | Value off / on | Differing fields (growSync, Python, BioChain-AI) | Owl / BioChain-AI verify, import | (d) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| synth 00 | 37972 | 53 | 1 | 0.8359 / 0.4206 | -, -, - / -, -, - | ok / ok | equal |
| synth 01 | 55222 | 77 | 2 | 0.8359 / 0.4231 | -, -, - / -, -, - | ok / ok | equal |
| synth 02 | 36292 | 51 | 1 | 0.8351 / 0.422 | -, -, - / -, -, - | ok / ok | equal |
| synth 03 | 43071 | 60 | 1 | 0.8356 / 0.4192 | -, -, - / -, -, - | ok / ok | equal |
| synth 04 | 54372 | 76 | 1 | 0.8352 / 0.4191 | -, -, - / -, -, - | ok / ok | equal |
| synth 05 | 53570 | 75 | 1 | 0.8356 / 0.4234 | -, -, - / -, -, - | ok / ok | equal |
| synth 06 | 53215 | 74 | 1 | 0.8361 / 0.4204 | -, -, - / -, -, - | ok / ok | equal |
| synth 07 | 55498 | 78 | 1 | 0.8355 / 0.4228 | -, -, - / -, -, - | ok / ok | equal |
| synth 08 | 54136 | 76 | 2 | 0.8358 / 0.4209 | -, -, - / -, -, - | ok / ok | equal |
| synth 09 | 29736 | 42 | 1 | 0.8352 / 0.4184 | -, -, - / -, -, - | ok / ok | equal |
| synth 10 | 59134 | 83 | 2 | 0.8354 / 0.4227 | -, -, - / -, -, - | ok / ok | equal |
| synth 11 | 21218 | 30 | 1 | 0.8346 / 0.4173 | -, -, - / -, -, - | ok / ok | equal |
| synth 12 | 47536 | 67 | 2 | 0.8352 / 0.4214 | -, -, - / -, -, - | ok / ok | equal |
| synth 13 | 44166 | 62 | 1 | 0.8355 / 0.4209 | -, -, - / -, -, - | ok / ok | equal |
| synth 14 | 23349 | 33 | 1 | 0.8345 / 0.417 | -, -, - / -, -, - | ok / ok | equal |
| synth 15 | 50183 | 70 | 3 | 0.836 / 0.4219 | -, -, - / -, -, - | ok / ok | equal |
| synth 16 | 38415 | 54 | 1 | 0.8355 / 0.42 | -, -, - / -, -, - | ok / ok | equal |
| synth 17 | 41460 | 58 | 2 | 0.8356 / 0.4208 | -, -, - / -, -, - | ok / ok | equal |
| synth 18 | 26115 | 37 | 2 | 0.8351 / 0.4212 | -, -, - / -, -, - | ok / ok | equal |
| synth 19 | 31292 | 44 | 2 | 0.8354 / 0.4208 | -, -, - / -, -, - | ok / ok | equal |
| verb 00 | 59984 | 84 | 1 | 1.059 / 0.4527 | -, -, - / -, -, - | ok / ok | equal |
| verb 01 | 59981 | 84 | 0 | 1.0764 / 0.4626 | -, -, - / -, -, - | ok / ok | equal |
| verb 02 | 59963 | 84 | 0 | 1.0885 / 0.462 | -, -, - / -, -, - | ok / ok | equal |
| verb 03 | 59912 | 84 | 0 | 1.1016 / 0.4711 | -, -, - / -, -, - | ok / ok | equal |
| verb 04 | 59790 | 84 | 2 | 1.0686 / 0.4626 | -, -, - / -, -, - | ok / ok | equal |
| verb 05 | 59914 | 84 | 0 | 1.0541 / 0.4568 | -, -, - / -, -, - | ok / ok | equal |
| verb 06 | 59940 | 84 | 0 | 1.0425 / 0.4571 | -, -, - / -, -, - | ok / ok | equal |
| verb 07 | 59940 | 84 | 1 | 1.0527 / 0.4569 | -, -, - / -, -, - | ok / ok | equal |
| verb 08 | 59991 | 84 | 1 | 1.0531 / 0.4482 | -, -, - / -, -, - | ok / ok | equal |
| verb 09 | 59934 | 84 | 1 | 1.0688 / 0.4455 | -, -, - / -, -, - | ok / ok | equal |
| verb 10 | 59999 | 84 | 1 | 1.1157 / 0.449 | -, -, - / -, -, - | ok / ok | equal |
| verb 11 | 59930 | 84 | 1 | 1.0851 / 0.4472 | -, -, - / -, -, - | ok / ok | equal |
| verb 12 | 59960 | 84 | 0 | 1.073 / 0.4493 | -, -, - / -, -, - | ok / ok | equal |
| verb 13 | 59937 | 84 | 1 | 1.0594 / 0.4553 | -, -, - / -, -, - | ok / ok | equal |
| verb 14 | 59950 | 84 | 3 | 1.0662 / 0.4439 | -, -, - / -, -, - | ok / ok | equal |
| verb 15 | 59976 | 84 | 2 | 1.0805 / 0.4438 | -, -, - / -, -, - | ok / ok | equal |
| verb 16 | 59968 | 84 | 0 | 1.0607 / 0.4455 | -, -, - / -, -, - | ok / ok | equal |
| verb 17 | 59949 | 84 | 2 | 1.0442 / 0.4426 | -, -, - / -, -, - | ok / ok | equal |
| verb 18 | 59960 | 84 | 2 | 1.0481 / 0.4498 | -, -, - / -, -, - | ok / ok | equal |
| verb 19 | 59957 | 84 | 1 | 1.0476 / 0.4514 | -, -, - / -, -, - | ok / ok | equal |
| verb 20 | 59943 | 84 | 2 | 1.0334 / 0.4438 | -, -, - / -, -, - | ok / ok | equal |
| verb 21 | 47926 | 67 | 1 | 1.0412 / 0.4448 | -, -, - / -, -, - | ok / ok | equal |
| adj 00 | 59877 | 84 | 1 | 1.0965 / 0.4861 | -, -, - / -, -, - | ok / ok | equal |
| adj 01 | 59919 | 84 | 2 | 1.1128 / 0.4891 | -, -, - / -, -, - | ok / ok | equal |
| adj 02 | 59858 | 84 | 1 | 1.1271 / 0.4846 | -, -, - / -, -, - | ok / ok | equal |
| adj 03 | 59987 | 84 | 0 | 1.1808 / 0.4932 | -, -, - / -, -, - | ok / ok | equal |
| adj 04 | 59718 | 83 | 2 | 1.1342 / 0.4913 | -, -, - / -, -, - | ok / ok | equal |
| adj 05 | 59898 | 84 | 1 | 1.1169 / 0.493 | -, -, - / -, -, - | ok / ok | equal |
| adj 06 | 59954 | 84 | 0 | 1.1148 / 0.4947 | -, -, - / -, -, - | ok / ok | equal |
| adj 07 | 59798 | 84 | 4 | 1.0972 / 0.4868 | -, -, - / -, -, - | ok / ok | equal |
| adj 08 | 59998 | 84 | 1 | 1.104 / 0.4888 | -, -, - / -, -, - | ok / ok | equal |
| adj 09 | 59928 | 84 | 0 | 1.1103 / 0.4922 | -, -, - / -, -, - | ok / ok | equal |
| adj 10 | 59955 | 84 | 1 | 1.099 / 0.4768 | -, -, - / -, -, - | ok / ok | equal |
| adj 11 | 59923 | 84 | 3 | 1.0966 / 0.4823 | -, -, - / -, -, - | ok / ok | equal |
| adj 12 | 59955 | 84 | 0 | 1.1129 / 0.4875 | -, -, - / -, -, - | ok / ok | equal |
| adj 13 | 59786 | 84 | 1 | 1.0876 / 0.4928 | -, -, - / -, -, - | ok / ok | equal |
| adj 14 | 59955 | 84 | 0 | 1.1169 / 0.4837 | -, -, - / -, -, - | ok / ok | equal |
| adj 15 | 59975 | 84 | 3 | 1.1311 / 0.4919 | -, -, - / -, -, - | ok / ok | equal |
| adj 16 | 59940 | 84 | 0 | 1.1151 / 0.4903 | -, -, - / -, -, - | ok / ok | equal |
| adj 17 | 59956 | 84 | 3 | 1.1252 / 0.488 | -, -, - / -, -, - | ok / ok | equal |
| adj 18 | 59879 | 84 | 0 | 1.1173 / 0.4967 | -, -, - / -, -, - | ok / ok | equal |
| adj 19 | 59871 | 84 | 0 | 1.0897 / 0.4902 | -, -, - / -, -, - | ok / ok | equal |
| adj 20 | 59942 | 84 | 2 | 1.1109 / 0.4967 | -, -, - / -, -, - | ok / ok | equal |
| adj 21 | 59991 | 84 | 3 | 1.1012 / 0.4852 | -, -, - / -, -, - | ok / ok | equal |
| adj 22 | 59840 | 84 | 2 | 1.2663 / 0.4954 | -, -, - / -, -, - | ok / ok | equal |
| adj 23 | 59998 | 84 | 2 | 1.1214 / 0.4883 | -, -, - / -, -, - | ok / ok | equal |
| adj 24 | 59944 | 84 | 2 | 1.1178 / 0.4918 | -, -, - / -, -, - | ok / ok | equal |
| adj 25 | 59909 | 84 | 1 | 1.1188 / 0.486 | -, -, - / -, -, - | ok / ok | equal |
| adj 26 | 59982 | 84 | 1 | 1.1511 / 0.49 | -, -, - / -, -, - | ok / ok | equal |
| adj 27 | 59978 | 84 | 1 | 1.2531 / 0.5094 | -, -, - / -, -, - | ok / ok | equal |
| adj 28 | 59972 | 84 | 0 | 1.2187 / 0.5043 | -, -, - / -, -, - | ok / ok | equal |
| adj 29 | 59899 | 84 | 1 | 1.2623 / 0.5194 | -, -, - / -, -, - | ok / ok | equal |
| adj 30 | 59921 | 84 | 1 | 1.307 / 0.5156 | -, -, - / -, -, - | ok / ok | equal |
| adj 31 | 59953 | 84 | 2 | 1.266 / 0.5124 | -, -, - / -, -, - | ok / ok | equal |
| adj 32 | 7913 | 11 | 1 | 1.1086 / 0.4714 | -, -, - / -, -, - | ok / ok | equal |

</details>

## L9 · The corpus manifest, its growth, and the exact weave

| List | K | Root (JS = Python) | Inclusion proofs (max hashes) | Wrong leaf / position accepted | Consistency proofs (failed) | Alterations (undetected) | JS/Python mismatches |
| --- | --- | --- | --- | --- | --- | --- | --- |
| verb manifest (engrams off) | 22 | `a27f445f35d4df3c…` = | 22 (5) | 0 / 0 | 21 every m (0) | 109 (0) | 0 |
| K=1 (Rng(4000)) | 1 | `03d071b28eeb6c28…` = | 1 (0) | 0 / 0 | 0 every m (0) | 4 (0) | 0 |
| K=2 (Rng(4001)) | 2 | `91bee517db528f5e…` = | 2 (1) | 0 / 0 | 1 every m (0) | 9 (0) | 0 |
| K=3 (Rng(4002)) | 3 | `f550289473f729eb…` = | 3 (2) | 0 / 0 | 2 every m (0) | 14 (0) | 0 |
| K=7 (Rng(4003)) | 7 | `a3be1e3227987365…` = | 7 (3) | 0 / 0 | 6 every m (0) | 34 (0) | 0 |
| K=84 (Rng(4004)) | 84 | `cf1b50e130124c6e…` = | 84 (7) | 0 / 0 | 83 every m (0) | 419 (0) | 0 |
| K=200 (Rng(4005)) | 200 | `d57c9eef2d3f6fcb…` = | 200 (8) | 0 / 0 | 199 every m (0) | 999 (0) | 0 |
| K=1000 (Rng(4006)) | 1000 | `021e91e170280d96…` = | 1000 (10) | 0 / 0 | 2000 sampled (0) | 2000 (0) | 0 |
| K=1001 (Rng(4007)) | 1001 | `39f67f56600cc737…` = | 1001 (10) | 0 / 0 | 2000 sampled (0) | 2000 (0) | 0 |

(b) exact weaves: 22/22 pass (norm 5^(28K), unfold, segment product, JS = Python); segment sub-weaves equal in both languages on 22/22; bits per component 2176-2731; median ms JS 47.9, Python 50.2.
Control 1 (shdccp/2 duplicate-last collision): K=3 collides, K=7 collides, K=1001 collides. Control 2 (XOR blind to swaps the weave detects): K=1 0/0, K=2 1/1, K=3 2/2, K=7 6/6, K=84 83/83, K=200 199/199, K=1000 2/2, K=1001 2/2.

## L10 · The hardened, attested import

Identity 0xAE3502AC6FFBA237 and keyVector 9BC2024804859196 by BioChain-AI's computeIdentityId and deriveKeyVector (the core's port equal; Python's equal), epoch EPOCH-OFFLINE-2026-11-06; keys K-e42186c01ee61d2ef471a51a (active), K-8d67b79b1c7e058bfebe12db (revoked), made in WebCrypto for this run; registry snapshot `phase3-registry.json` SHA-256 `77a21c3df6a49a966187c9ab3225ab95a9bfa4ee5fd22d7a70205e8276b6dff6`. Clean set: 22 shards (105 draws). Tier-P twins accepted: 21/21.

| Class | Records | Accepted (JS / Python) | Self-consistent / authentic (JS) | Failing check (JS) | Agree | Owl accepts (control 1) |
| --- | --- | --- | --- | --- | --- | --- |
| clean | 22 | 22 / 22 | 22 / 22 | - 22 | 22/22 |  |
| T1 | 50 | 0 / 0 | 0 / 50 | leaves 50 | 50/50 | 50/50 |
| T2 | 50 | 0 / 0 | 0 / 50 | crystal 50 | 50/50 | 50/50 |
| T3 | 50 | 0 / 0 | 0 / 0 | commitment 50 | 50/50 |  |
| T4 | 50 | 0 / 0 | 50 / 0 | attestation 50 | 50/50 |  |
| T5 | 50 | 0 / 0 | 50 / 0 | attestation 50 | 50/50 |  |
| T6 | 50 | 0 / 0 | 0 / 50 | commitment 50 | 50/50 |  |
| T7 | 50 | 0 / 0 | 0 / 50 | leaves 49, canonical 1 | 50/50 |  |
| T8 | 50 | 0 / 0 | 0 / 50 | weaves 50 | 50/50 | 50/50 |
| T9 | 50 | 0 / 0 | 0 / 50 | canonical 50 | 50/50 | 50/50 |

Control 2: Python without the P1363-to-DER conversion accepted 0 of 93 valid signatures (93 verify with it; InvalidSignature): shows its weakness. Median verification ms per package: JS 112.2, Python 94.7.

## L11 · Verification is cheap enough for corpora

21 shards of at least 59,000 bytes, 3 repetitions with process.hrtime.bigint, the first discarded: median **156.249 ms**, 95% bootstrap interval [150.106, 162.027] (numpy default_rng(7) in run_claims_phase3.py (rank.ci_mean's procedure, the median)). Session 1170.2 ms (LADDR/1 1146.3 ms), once; 1,000 shards ≈ 157.4 s.

By step (median ms): parity 1.069, canonical 75.373, crystal 6.695, leaves 4.531, weaves 12.305, derived 49.81, commitment 1.776, attestation 2.995, inclusion 0.156, consistency 0.089.

Control (attestation skipped): median 157.858 ms against 156.249 ms (difference -1.61 ms; the attestation step measures 2.995 ms; skipped faster on 9/21 shards; paired, full minus skipped, median -0.719 ms, 95% interval [-4.583, 2.124], which includes 0: the comparison is within the noise; a single verification's spread is about 20.95 ms): skipped not faster (reported; decides nothing under Amendment 8 item 2). The control, the step check (Amendment 8 item 2; READING runner-13): 63/63 full verifications ran the attestation check inside the timed window, 63/63 attestation-skipped ones recorded it skipped: holds.

Reported: LADDR/1 recomputed in each verification 1234.121 ms (21 shards); engrams on packages 229.35 ms [226.811, 238.932]; Python 189.196 ms [183.655, 195.615] (by step: parity 0.348, canonical 72.991, crystal 9.025, leaves 0.414, weaves 9.137, derived 95.272, commitment 0.141, attestation 0.229, inclusion 0.036, consistency 0.022).

## READINGs of this runner

- **runner-1.** Amendment 8 item 1: the packages of L10 and L11 and the corpus manifest of L9(a) use the records grown with engrams off, the Lexicon's default for corpora (D4; Explainer 3: off by default for corpora and never an input). L11 on the same shards' engrams-on packages is reported and decides nothing.
- **runner-2.** Dry-run corpora: the verb shards are corpus "wordnet30-verb" and the adjective shards "wordnet30-adj" (spdx LicenseRef-WordNet-3.0 and sourceUrlSha of the archive URL, as C0); the Rng(4000 + i) synthetic shards keep "lexicon-synth-v1" with sourceUrlSha of "rng:4000+i". The verb shards stand in for C0 in L9(a), L9(b), L10 and L11.
- **runner-3.** L8 control 3: in every shard, bit 0 of the first ASCII byte is flipped (it stays ASCII, so the text stays valid UTF-8) and the text regrown with engrams off; the leaf of the chunk holding that byte and merkleRoot must both change.
- **runner-4.** L8 control 2: the grower with leaves over binary bytes (lexicon_core.js leaves: "binary", the reference's READING 10) runs with engrams off on every shard; its record is compared with Owl's engrams-off record and given to Owl's verifyIntegrity; the Python port's binary record must equal it (reported). Control 1 is the Python grower with BioChain-AI's normalisation (packets "kernel"), engrams off, against Owl's engrams-off record on the synthetic shards; the JS twin is reported.
- **runner-5.** L9(a) draws for K > 200 (the Python half's l9_draws): with replacement from Rng(2000 + j), first the 2,000 alterations, each uniform over the alterations the K <= 200 rule enumerates (the trace's order: for each i replace, delete, insert before i, swap i and i + 1, truncate to i entries; then duplicate-last), then the 2,000 consistency sizes m = 1 + below(K - 1) (K = 1000 has only 999 sizes m < N). A replacement entry is entry i with its first byte XOR 1, an insertion 32 zero bytes (the trace's). For K <= 200 every m in 1..N - 1 (RFC 9162 has no proof from m = 0).
- **runner-6.** L9 control 2 checks every adjacent swap of the synthetic lists for K <= 200 and the first and last (i = 0 and K - 2) for K = 1000 and 1001 (a weave of 1,001 prefixes takes 0.15 s in JS and 0.3 s in Python; the control needs one swap that the XOR misses and the weave detects).
- **runner-7.** L8(b) and (c) "every record": per shard and mode, the distinct records among growSync's, the Python port's, Owl's and BioChain-AI's (equal records are verified once). A rejection of growSync's, Owl's or BioChain-AI's record counts against the JS grower, of the Python port's, Owl's or BioChain-AI's against the Python port. BioChain-AI's record differing from Owl's counts against both (claim (a): "BioChain-AI's gives the same"). (d) is decided by the reference, so a (d) mismatch counts against the JS grower.
- **runner-8.** Dry-run L10 clean set: 22 verb shards cannot give 50 distinct indices, so Rng(4000 + i).below(22) is drawn until all 22 are; each tamper record draws its clean package with below(22).
- **runner-9.** L10 tamper places, record j of class k from Rng(base + 50(k - 1) + j) after its clean package below(n): T2 frame below(K), then bit below(32) of its crystal32 (word bit 24 + bit), parity re-fixed; T7 frames below(K - 1) and the next; T9 frame below(K), drawn again from the same Rng until the frame has a single-bit residual flip that decodes the same (spike S4's search, in its order), then that flip below(count). T3 (lvocabHash) and T8 (chainId) change the last hex digit, S4's rule as in the trace. T4 is attested by the key the registry marks revoked. T5 takes the attestation of the next clean package in draw order ((c + 1) mod n). T6 is the Tier-P package of the same shard (a Tier-P twin of the corpus, each shard j salted with the test salt of j, its own LCORPUS/1 and LGROW/1, attested by the active key) checked with the salt of shard index + 1, the next shard's, as the trace reads "the salt of shard j + 1".
- **runner-11.** L11 protocol: repetition-major passes over the shards; in each pass a shard's full verification and its attestation-skipped verification run back to back, the order alternating, so drift affects both alike; a shard's time is the mean of its repetitions 2 and 3, the median is over shards, and the control compares the two medians. The package is passed as the parsed object (JSON parsing is not one of the hardened checks). The session (LVOCAB/1, LADDR/1 recomputed from WordNet, the registry snapshot loaded) is timed once and counted once in the 1,000-shard estimate.
- **runner-13.** L11's control, "otherwise the step is not being timed and the test is void", is also read from each timed verification's own record of its checks: every full verification must hold every check passed with the attestation check's time > 0 inside the timed window, and every attestation-skipped one the attestation check recorded as skipped (0 ms) with every other check passed; otherwise L11 is void (not registered: it can only void, never support). The registered comparison of the two medians still decides the control. In this run the attestation step measures 2.995 ms against a single verification's spread of about 20.95 ms, and the paired interval (full minus skipped) is [-4.583, 2.124] ms, which includes 0: the comparison of the medians is within the noise, so it can fail by chance with the step timed (L11 void) and pass by chance with the step not run (which the step check catches). The registration fixes no power for the comparison; a comparison powered against the noise needs an amendment.

The core's and the reference's own READINGs are marked in lexicon_core.js (chain section) and reference/lexicon/{chain,records,manifest,attest,verify}.py; run_claims_phase3.py marks the L9 draws and control 2's swaps.

## Timings (seconds)

inputs 1.3, l8_js_grow 21.9, l8d_js 9.8, l9_js 97, python_l8l9 77.6, pool_l8 721.3, l10_build 85.6, l10_js_verify 57.5, l10_python_verify 73.8, l10_total 74.8, l11_node 19.5, l11_literal 78.6, l11_other_mode 14.7, l11_child_total 115, l11_python 18.7, total 1065.4.

## Full results

`claims-phase3.json` (every shard, list, class and control; counterexamples, first 20 of each). Per-instance data (Python's records, the packages, the L11 times) are in `~/.cache/hyperbolic-lexicon/phase3-dry/` (HL_CACHE overrides the root), outside git. The registry snapshot holds public JWKs only; no private key is written anywhere.
