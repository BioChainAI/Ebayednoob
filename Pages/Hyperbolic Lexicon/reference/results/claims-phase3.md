# Hyperbolic Lexicon, Phase 3: L8-L11

Run 2026-11-06 04:15:30 UTC with PREREGISTRATION.md with Amendments 1-7 by `reference/run_claims_phase3.cjs`. Node v22.23.4 (V8 12.4.254.21-node.57, 4 CPUs, 4 worker threads); Python 3.13.18 (cryptography 50.0.1, numpy 2.5.3); Owl Academy 7f45f35, BioChain-AI c975161; repository 6da04be (with 1 uncommitted path(s) in the system when the run started: ?? "Pages/Hyperbolic Lexicon/reference/results/phase3-console.txt"). Gate: 19991/19991 lines of tests/parity-lexicon.cjs pass, none skipped (ok    chain_v1.txt: 1323/1323; ok    chain: controls of the trace check: 1/1).

Instances: c0 148 shards (wordnet30-c0); synth 20 shards (lexicon-synth-v1, Rng(1000..1019)); the corpus of L9(a), L10 and L11 is c0, packaged with engrams off.

| Claim | Decision | What decided it |
| --- | --- | --- |
| L8 (JS grower) | supported | 0 failures over 336 records; controls 1/2/3 show their weakness: yes/yes/yes |
| L8 (Python port) | supported | 0 failures over 336 records |
| L9 | supported | 0 failures (manifest K = 148, 8 synthetic lists, 148 weaves); controls 1/2: yes/yes |
| L10 | supported | false accepts 0 (JS) / 0 (Python), false rejects 0 / 0, verdicts differ on 0; control 2: 0/126 raw signatures accepted |
| L11 | supported | median 155.387 ms, 95% interval [154.197, 155.966] over 147 shards; attestation skipped 153.527 ms |

## L8 · Language shards are Owl-valid biochains

Records: 168 shards x engrams off and on. Records differing from Owl's: growSync 0, Python 0, BioChain-AI 0. (d): LVOCAB/1 equal, LADDR/1 equal (addrTableRoot `30b17bc3992d5bab98e8955bc215c03c5706e5847b2ed4a7c7b22f39635349e1`, 8192 rows; 2014.6 ms in JS, 1646.5 ms in Python), shards with an id stream or LPREP/1 difference: 0.

| Control | Shows its weakness | Detail |
| --- | --- | --- |
| 1 (kernel normalisation) | yes | differs from Owl on 20/20 synthetic shards |
| 2 (leaves over binary) | yes | differs on 168/168, rejected by Owl on 168/168 (leaf 0 mismatch); Python's equals JS's on 168 |
| 3 (one byte altered) | yes | leaf and root changed on 168/168 |

Reported: share of chunks whose crystal holds 0x80: c0 189/12378 (1.527%), synth 32/1175 (2.723%); synthetic draws 1,1,1,2,2,2,5,4,3,2,2,1,1,2,1,1,1,1,2,1 (two-byte share 29.522-30.682%); median value 1.095 (engrams off), 0.466 (on); median ms per shard: growSync 56 / 119.1, Python 54.8 / 278.2, Owl 70.5 / 9319, BioChain-AI 69.6 / 9291.4 (off / on; Owl's and BioChain-AI's growers ran in 4 worker threads beside the Python half (contended); growSync and Python alone).

<details><summary>Per shard</summary>

| Shard | Bytes | Chunks | 0x80 | Value off / on | Differing fields (growSync, Python, BioChain-AI) | Owl / BioChain-AI verify, import | (d) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c0 000 | 59896 | 84 | 1 | 1.0911 / 0.4632 | -, -, - / -, -, - | ok / ok | equal |
| c0 001 | 59979 | 84 | 1 | 1.1116 / 0.4655 | -, -, - / -, -, - | ok / ok | equal |
| c0 002 | 59953 | 84 | 1 | 1.1126 / 0.4647 | -, -, - / -, -, - | ok / ok | equal |
| c0 003 | 59983 | 84 | 0 | 1.1318 / 0.4717 | -, -, - / -, -, - | ok / ok | equal |
| c0 004 | 59951 | 84 | 1 | 1.1178 / 0.4465 | -, -, - / -, -, - | ok / ok | equal |
| c0 005 | 59883 | 84 | 0 | 1.1661 / 0.4852 | -, -, - / -, -, - | ok / ok | equal |
| c0 006 | 59920 | 84 | 0 | 1.1086 / 0.4751 | -, -, - / -, -, - | ok / ok | equal |
| c0 007 | 59774 | 84 | 4 | 1.106 / 0.4728 | -, -, - / -, -, - | ok / ok | equal |
| c0 008 | 59945 | 84 | 1 | 1.1168 / 0.4793 | -, -, - / -, -, - | ok / ok | equal |
| c0 009 | 59911 | 84 | 0 | 1.1231 / 0.4811 | -, -, - / -, -, - | ok / ok | equal |
| c0 010 | 59970 | 84 | 2 | 1.1079 / 0.478 | -, -, - / -, -, - | ok / ok | equal |
| c0 011 | 59983 | 84 | 1 | 1.0812 / 0.4634 | -, -, - / -, -, - | ok / ok | equal |
| c0 012 | 59951 | 84 | 1 | 1.122 / 0.4805 | -, -, - / -, -, - | ok / ok | equal |
| c0 013 | 59983 | 84 | 0 | 1.1546 / 0.5074 | -, -, - / -, -, - | ok / ok | equal |
| c0 014 | 59944 | 84 | 2 | 1.1576 / 0.5036 | -, -, - / -, -, - | ok / ok | equal |
| c0 015 | 59932 | 84 | 2 | 1.1682 / 0.5135 | -, -, - / -, -, - | ok / ok | equal |
| c0 016 | 59978 | 84 | 1 | 1.1361 / 0.4957 | -, -, - / -, -, - | ok / ok | equal |
| c0 017 | 59971 | 84 | 0 | 1.1532 / 0.4998 | -, -, - / -, -, - | ok / ok | equal |
| c0 018 | 59950 | 84 | 1 | 1.1498 / 0.496 | -, -, - / -, -, - | ok / ok | equal |
| c0 019 | 59954 | 84 | 0 | 1.14 / 0.4815 | -, -, - / -, -, - | ok / ok | equal |
| c0 020 | 59997 | 84 | 0 | 1.1593 / 0.5021 | -, -, - / -, -, - | ok / ok | equal |
| c0 021 | 59980 | 84 | 1 | 1.1311 / 0.4863 | -, -, - / -, -, - | ok / ok | equal |
| c0 022 | 59920 | 84 | 0 | 1.137 / 0.4922 | -, -, - / -, -, - | ok / ok | equal |
| c0 023 | 59930 | 84 | 2 | 1.1408 / 0.5028 | -, -, - / -, -, - | ok / ok | equal |
| c0 024 | 59938 | 84 | 1 | 1.058 / 0.4624 | -, -, - / -, -, - | ok / ok | equal |
| c0 025 | 59991 | 84 | 1 | 1.0489 / 0.4412 | -, -, - / -, -, - | ok / ok | equal |
| c0 026 | 59967 | 84 | 0 | 1.0428 / 0.4392 | -, -, - / -, -, - | ok / ok | equal |
| c0 027 | 59931 | 84 | 2 | 1.0552 / 0.4476 | -, -, - / -, -, - | ok / ok | equal |
| c0 028 | 59955 | 84 | 0 | 1.0516 / 0.4472 | -, -, - / -, -, - | ok / ok | equal |
| c0 029 | 59990 | 84 | 0 | 1.0513 / 0.448 | -, -, - / -, -, - | ok / ok | equal |
| c0 030 | 59935 | 84 | 2 | 1.0633 / 0.4513 | -, -, - / -, -, - | ok / ok | equal |
| c0 031 | 59998 | 84 | 1 | 1.0461 / 0.4422 | -, -, - / -, -, - | ok / ok | equal |
| c0 032 | 59932 | 84 | 2 | 1.0491 / 0.4427 | -, -, - / -, -, - | ok / ok | equal |
| c0 033 | 59971 | 84 | 4 | 1.0236 / 0.4398 | -, -, - / -, -, - | ok / ok | equal |
| c0 034 | 59935 | 84 | 0 | 1.0402 / 0.452 | -, -, - / -, -, - | ok / ok | equal |
| c0 035 | 59989 | 84 | 1 | 1.0438 / 0.448 | -, -, - / -, -, - | ok / ok | equal |
| c0 036 | 59931 | 84 | 2 | 1.0571 / 0.4475 | -, -, - / -, -, - | ok / ok | equal |
| c0 037 | 59932 | 84 | 0 | 1.0476 / 0.4496 | -, -, - / -, -, - | ok / ok | equal |
| c0 038 | 59936 | 84 | 1 | 1.0539 / 0.4432 | -, -, - / -, -, - | ok / ok | equal |
| c0 039 | 59890 | 84 | 1 | 1.0547 / 0.4403 | -, -, - / -, -, - | ok / ok | equal |
| c0 040 | 59999 | 84 | 1 | 1.0564 / 0.444 | -, -, - / -, -, - | ok / ok | equal |
| c0 041 | 59893 | 84 | 1 | 1.06 / 0.4474 | -, -, - / -, -, - | ok / ok | equal |
| c0 042 | 59949 | 84 | 1 | 1.059 / 0.4482 | -, -, - / -, -, - | ok / ok | equal |
| c0 043 | 59945 | 84 | 1 | 1.0927 / 0.477 | -, -, - / -, -, - | ok / ok | equal |
| c0 044 | 59916 | 84 | 1 | 1.1748 / 0.511 | -, -, - / -, -, - | ok / ok | equal |
| c0 045 | 59971 | 84 | 3 | 1.1199 / 0.5024 | -, -, - / -, -, - | ok / ok | equal |
| c0 046 | 59957 | 84 | 1 | 1.1614 / 0.4872 | -, -, - / -, -, - | ok / ok | equal |
| c0 047 | 59869 | 84 | 0 | 1.1347 / 0.4774 | -, -, - / -, -, - | ok / ok | equal |
| c0 048 | 59962 | 84 | 1 | 1.1313 / 0.4667 | -, -, - / -, -, - | ok / ok | equal |
| c0 049 | 59919 | 84 | 2 | 1.2242 / 0.4823 | -, -, - / -, -, - | ok / ok | equal |
| c0 050 | 59945 | 84 | 0 | 1.177 / 0.4794 | -, -, - / -, -, - | ok / ok | equal |
| c0 051 | 59999 | 84 | 7 | 1.1713 / 0.4758 | -, -, - / -, -, - | ok / ok | equal |
| c0 052 | 59992 | 84 | 0 | 1.1127 / 0.4706 | -, -, - / -, -, - | ok / ok | equal |
| c0 053 | 59953 | 84 | 3 | 1.102 / 0.4803 | -, -, - / -, -, - | ok / ok | equal |
| c0 054 | 59927 | 84 | 1 | 1.1052 / 0.4738 | -, -, - / -, -, - | ok / ok | equal |
| c0 055 | 59884 | 84 | 0 | 1.0819 / 0.464 | -, -, - / -, -, - | ok / ok | equal |
| c0 056 | 59944 | 84 | 3 | 1.1867 / 0.4965 | -, -, - / -, -, - | ok / ok | equal |
| c0 057 | 59964 | 84 | 1 | 1.1775 / 0.5008 | -, -, - / -, -, - | ok / ok | equal |
| c0 058 | 59950 | 84 | 1 | 1.0961 / 0.4717 | -, -, - / -, -, - | ok / ok | equal |
| c0 059 | 59776 | 84 | 1 | 1.134 / 0.4638 | -, -, - / -, -, - | ok / ok | equal |
| c0 060 | 59956 | 84 | 2 | 1.1349 / 0.4655 | -, -, - / -, -, - | ok / ok | equal |
| c0 061 | 59945 | 84 | 1 | 1.1219 / 0.4668 | -, -, - / -, -, - | ok / ok | equal |
| c0 062 | 59980 | 84 | 1 | 1.0977 / 0.4699 | -, -, - / -, -, - | ok / ok | equal |
| c0 063 | 59966 | 84 | 0 | 1.0843 / 0.4664 | -, -, - / -, -, - | ok / ok | equal |
| c0 064 | 59933 | 84 | 0 | 1.2224 / 0.4799 | -, -, - / -, -, - | ok / ok | equal |
| c0 065 | 59977 | 84 | 0 | 1.287 / 0.4985 | -, -, - / -, -, - | ok / ok | equal |
| c0 066 | 59947 | 84 | 2 | 1.0985 / 0.4663 | -, -, - / -, -, - | ok / ok | equal |
| c0 067 | 59956 | 84 | 0 | 1.0722 / 0.4677 | -, -, - / -, -, - | ok / ok | equal |
| c0 068 | 59973 | 84 | 1 | 1.0742 / 0.4604 | -, -, - / -, -, - | ok / ok | equal |
| c0 069 | 59964 | 84 | 2 | 1.0843 / 0.4556 | -, -, - / -, -, - | ok / ok | equal |
| c0 070 | 59971 | 84 | 4 | 1.0943 / 0.4754 | -, -, - / -, -, - | ok / ok | equal |
| c0 071 | 59995 | 84 | 1 | 1.1416 / 0.4568 | -, -, - / -, -, - | ok / ok | equal |
| c0 072 | 59980 | 84 | 5 | 1.1109 / 0.4605 | -, -, - / -, -, - | ok / ok | equal |
| c0 073 | 59974 | 84 | 1 | 1.1291 / 0.4656 | -, -, - / -, -, - | ok / ok | equal |
| c0 074 | 59953 | 84 | 2 | 1.1108 / 0.4611 | -, -, - / -, -, - | ok / ok | equal |
| c0 075 | 59996 | 84 | 0 | 1.0758 / 0.4644 | -, -, - / -, -, - | ok / ok | equal |
| c0 076 | 59901 | 84 | 1 | 1.1633 / 0.4933 | -, -, - / -, -, - | ok / ok | equal |
| c0 077 | 59976 | 84 | 2 | 1.1275 / 0.4699 | -, -, - / -, -, - | ok / ok | equal |
| c0 078 | 59906 | 84 | 0 | 1.1187 / 0.4818 | -, -, - / -, -, - | ok / ok | equal |
| c0 079 | 59874 | 84 | 0 | 1.0793 / 0.4633 | -, -, - / -, -, - | ok / ok | equal |
| c0 080 | 59926 | 84 | 1 | 1.0982 / 0.457 | -, -, - / -, -, - | ok / ok | equal |
| c0 081 | 59946 | 84 | 1 | 1.1056 / 0.4531 | -, -, - / -, -, - | ok / ok | equal |
| c0 082 | 59867 | 84 | 0 | 1.1587 / 0.4684 | -, -, - / -, -, - | ok / ok | equal |
| c0 083 | 59955 | 84 | 0 | 1.1559 / 0.4663 | -, -, - / -, -, - | ok / ok | equal |
| c0 084 | 59933 | 84 | 3 | 1.1715 / 0.4699 | -, -, - / -, -, - | ok / ok | equal |
| c0 085 | 59925 | 84 | 2 | 1.1674 / 0.4689 | -, -, - / -, -, - | ok / ok | equal |
| c0 086 | 59962 | 84 | 4 | 1.0321 / 0.4392 | -, -, - / -, -, - | ok / ok | equal |
| c0 087 | 59977 | 84 | 2 | 1.0364 / 0.4396 | -, -, - / -, -, - | ok / ok | equal |
| c0 088 | 59936 | 84 | 0 | 1.0478 / 0.4418 | -, -, - / -, -, - | ok / ok | equal |
| c0 089 | 59939 | 84 | 4 | 1.0947 / 0.4572 | -, -, - / -, -, - | ok / ok | equal |
| c0 090 | 59947 | 84 | 1 | 1.256 / 0.4833 | -, -, - / -, -, - | ok / ok | equal |
| c0 091 | 59912 | 84 | 1 | 1.0836 / 0.4628 | -, -, - / -, -, - | ok / ok | equal |
| c0 092 | 59974 | 84 | 2 | 1.0713 / 0.4623 | -, -, - / -, -, - | ok / ok | equal |
| c0 093 | 59969 | 84 | 3 | 1.064 / 0.4622 | -, -, - / -, -, - | ok / ok | equal |
| c0 094 | 59993 | 84 | 2 | 1.0689 / 0.4596 | -, -, - / -, -, - | ok / ok | equal |
| c0 095 | 59954 | 84 | 2 | 1.0614 / 0.4581 | -, -, - / -, -, - | ok / ok | equal |
| c0 096 | 59952 | 84 | 1 | 1.0718 / 0.4616 | -, -, - / -, -, - | ok / ok | equal |
| c0 097 | 59891 | 84 | 0 | 1.0632 / 0.4621 | -, -, - / -, -, - | ok / ok | equal |
| c0 098 | 59973 | 84 | 2 | 1.0859 / 0.4633 | -, -, - / -, -, - | ok / ok | equal |
| c0 099 | 59981 | 84 | 3 | 1.0693 / 0.4603 | -, -, - / -, -, - | ok / ok | equal |
| c0 100 | 59899 | 84 | 2 | 1.0354 / 0.4618 | -, -, - / -, -, - | ok / ok | equal |
| c0 101 | 59937 | 84 | 0 | 1.025 / 0.4577 | -, -, - / -, -, - | ok / ok | equal |
| c0 102 | 59980 | 84 | 0 | 1.0445 / 0.4612 | -, -, - / -, -, - | ok / ok | equal |
| c0 103 | 59935 | 84 | 2 | 1.0376 / 0.4599 | -, -, - / -, -, - | ok / ok | equal |
| c0 104 | 59824 | 84 | 2 | 1.0439 / 0.4657 | -, -, - / -, -, - | ok / ok | equal |
| c0 105 | 59934 | 84 | 1 | 1.0269 / 0.4606 | -, -, - / -, -, - | ok / ok | equal |
| c0 106 | 59963 | 84 | 2 | 1.0461 / 0.4704 | -, -, - / -, -, - | ok / ok | equal |
| c0 107 | 59926 | 84 | 0 | 1.0636 / 0.4676 | -, -, - / -, -, - | ok / ok | equal |
| c0 108 | 59899 | 84 | 3 | 1.0952 / 0.4646 | -, -, - / -, -, - | ok / ok | equal |
| c0 109 | 59951 | 84 | 1 | 1.1263 / 0.4922 | -, -, - / -, -, - | ok / ok | equal |
| c0 110 | 59797 | 84 | 1 | 1.1267 / 0.4903 | -, -, - / -, -, - | ok / ok | equal |
| c0 111 | 59908 | 84 | 0 | 1.0922 / 0.4925 | -, -, - / -, -, - | ok / ok | equal |
| c0 112 | 59834 | 84 | 2 | 1.0919 / 0.4868 | -, -, - / -, -, - | ok / ok | equal |
| c0 113 | 59991 | 84 | 2 | 1.0996 / 0.4921 | -, -, - / -, -, - | ok / ok | equal |
| c0 114 | 59920 | 84 | 3 | 1.1196 / 0.4902 | -, -, - / -, -, - | ok / ok | equal |
| c0 115 | 59842 | 84 | 0 | 1.108 / 0.4856 | -, -, - / -, -, - | ok / ok | equal |
| c0 116 | 59940 | 84 | 3 | 1.1263 / 0.4916 | -, -, - / -, -, - | ok / ok | equal |
| c0 117 | 59802 | 84 | 0 | 1.1047 / 0.4874 | -, -, - / -, -, - | ok / ok | equal |
| c0 118 | 59988 | 84 | 3 | 1.1014 / 0.4892 | -, -, - / -, -, - | ok / ok | equal |
| c0 119 | 59903 | 84 | 0 | 1.0932 / 0.4773 | -, -, - / -, -, - | ok / ok | equal |
| c0 120 | 59871 | 84 | 1 | 1.1436 / 0.4989 | -, -, - / -, -, - | ok / ok | equal |
| c0 121 | 59889 | 84 | 1 | 1.1184 / 0.492 | -, -, - / -, -, - | ok / ok | equal |
| c0 122 | 59970 | 84 | 3 | 1.1064 / 0.4899 | -, -, - / -, -, - | ok / ok | equal |
| c0 123 | 59963 | 84 | 2 | 1.1153 / 0.4969 | -, -, - / -, -, - | ok / ok | equal |
| c0 124 | 59938 | 84 | 2 | 1.1399 / 0.481 | -, -, - / -, -, - | ok / ok | equal |
| c0 125 | 59959 | 84 | 0 | 1.1206 / 0.4782 | -, -, - / -, -, - | ok / ok | equal |
| c0 126 | 59934 | 84 | 1 | 1.1006 / 0.4756 | -, -, - / -, -, - | ok / ok | equal |
| c0 127 | 59949 | 84 | 1 | 1.1156 / 0.4571 | -, -, - / -, -, - | ok / ok | equal |
| c0 128 | 59916 | 84 | 1 | 1.0919 / 0.4692 | -, -, - / -, -, - | ok / ok | equal |
| c0 129 | 59988 | 84 | 2 | 1.082 / 0.4755 | -, -, - / -, -, - | ok / ok | equal |
| c0 130 | 59982 | 84 | 2 | 1.3437 / 0.4748 | -, -, - / -, -, - | ok / ok | equal |
| c0 131 | 59915 | 84 | 3 | 1.2625 / 0.4738 | -, -, - / -, -, - | ok / ok | equal |
| c0 132 | 59872 | 84 | 1 | 1.228 / 0.4825 | -, -, - / -, -, - | ok / ok | equal |
| c0 133 | 59984 | 84 | 0 | 1.0931 / 0.4656 | -, -, - / -, -, - | ok / ok | equal |
| c0 134 | 59854 | 84 | 0 | 1.0767 / 0.4767 | -, -, - / -, -, - | ok / ok | equal |
| c0 135 | 59915 | 84 | 0 | 1.1124 / 0.4881 | -, -, - / -, -, - | ok / ok | equal |
| c0 136 | 59883 | 84 | 0 | 1.1123 / 0.4834 | -, -, - / -, -, - | ok / ok | equal |
| c0 137 | 59960 | 84 | 0 | 1.1078 / 0.479 | -, -, - / -, -, - | ok / ok | equal |
| c0 138 | 59817 | 84 | 3 | 1.1026 / 0.4798 | -, -, - / -, -, - | ok / ok | equal |
| c0 139 | 59931 | 84 | 1 | 1.0924 / 0.4766 | -, -, - / -, -, - | ok / ok | equal |
| c0 140 | 59982 | 84 | 1 | 1.0955 / 0.4688 | -, -, - / -, -, - | ok / ok | equal |
| c0 141 | 59959 | 84 | 1 | 1.0905 / 0.4641 | -, -, - / -, -, - | ok / ok | equal |
| c0 142 | 59990 | 84 | 1 | 1.0573 / 0.4583 | -, -, - / -, -, - | ok / ok | equal |
| c0 143 | 59837 | 84 | 3 | 1.0551 / 0.4574 | -, -, - / -, -, - | ok / ok | equal |
| c0 144 | 59991 | 84 | 0 | 1.0636 / 0.4608 | -, -, - / -, -, - | ok / ok | equal |
| c0 145 | 59986 | 84 | 2 | 1.1204 / 0.4629 | -, -, - / -, -, - | ok / ok | equal |
| c0 146 | 59889 | 84 | 1 | 1.1667 / 0.461 | -, -, - / -, -, - | ok / ok | equal |
| c0 147 | 20962 | 30 | 1 | 1.0914 / 0.4488 | -, -, - / -, -, - | ok / ok | equal |
| synth 00 | 27836 | 39 | 1 | 0.8356 / 0.421 | -, -, - / -, -, - | ok / ok | equal |
| synth 01 | 58036 | 81 | 1 | 0.8358 / 0.4207 | -, -, - / -, -, - | ok / ok | equal |
| synth 02 | 42337 | 59 | 1 | 0.8357 / 0.4221 | -, -, - / -, -, - | ok / ok | equal |
| synth 03 | 52794 | 74 | 2 | 0.836 / 0.4211 | -, -, - / -, -, - | ok / ok | equal |
| synth 04 | 38676 | 54 | 3 | 0.8357 / 0.4232 | -, -, - / -, -, - | ok / ok | equal |
| synth 05 | 26100 | 37 | 2 | 0.8344 / 0.4227 | -, -, - / -, -, - | ok / ok | equal |
| synth 06 | 31466 | 44 | 2 | 0.8357 / 0.4193 | -, -, - / -, -, - | ok / ok | equal |
| synth 07 | 58509 | 82 | 1 | 0.8356 / 0.4191 | -, -, - / -, -, - | ok / ok | equal |
| synth 08 | 51281 | 72 | 1 | 0.8355 / 0.4187 | -, -, - / -, -, - | ok / ok | equal |
| synth 09 | 30672 | 43 | 3 | 0.8352 / 0.4176 | -, -, - / -, -, - | ok / ok | equal |
| synth 10 | 55346 | 77 | 1 | 0.8362 / 0.4231 | -, -, - / -, -, - | ok / ok | equal |
| synth 11 | 26117 | 37 | 1 | 0.8344 / 0.4213 | -, -, - / -, -, - | ok / ok | equal |
| synth 12 | 48167 | 67 | 1 | 0.8356 / 0.4215 | -, -, - / -, -, - | ok / ok | equal |
| synth 13 | 22605 | 32 | 1 | 0.8345 / 0.4251 | -, -, - / -, -, - | ok / ok | equal |
| synth 14 | 46887 | 66 | 2 | 0.8355 / 0.4203 | -, -, - / -, -, - | ok / ok | equal |
| synth 15 | 59903 | 84 | 1 | 0.8352 / 0.4201 | -, -, - / -, -, - | ok / ok | equal |
| synth 16 | 50146 | 70 | 3 | 0.8357 / 0.4201 | -, -, - / -, -, - | ok / ok | equal |
| synth 17 | 26173 | 37 | 1 | 0.8347 / 0.4199 | -, -, - / -, -, - | ok / ok | equal |
| synth 18 | 28950 | 41 | 3 | 0.8345 / 0.4196 | -, -, - / -, -, - | ok / ok | equal |
| synth 19 | 56839 | 79 | 1 | 0.8362 / 0.4217 | -, -, - / -, -, - | ok / ok | equal |

</details>

## L9 · The corpus manifest, its growth, and the exact weave

| List | K | Root (JS = Python) | Inclusion proofs (max hashes) | Wrong leaf / position accepted | Consistency proofs (failed) | Alterations (undetected) | JS/Python mismatches |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c0 manifest (engrams off) | 148 | `f567700daafc85f8…` = | 148 (8) | 0 / 0 | 147 every m (0) | 739 (0) | 0 |
| K=1 (Rng(1000)) | 1 | `2cf8247ae9bac207…` = | 1 (0) | 0 / 0 | 0 every m (0) | 4 (0) | 0 |
| K=2 (Rng(1001)) | 2 | `fe053b6cc39f8102…` = | 2 (1) | 0 / 0 | 1 every m (0) | 9 (0) | 0 |
| K=3 (Rng(1002)) | 3 | `b8cad7eb705b5538…` = | 3 (2) | 0 / 0 | 2 every m (0) | 14 (0) | 0 |
| K=7 (Rng(1003)) | 7 | `dae8490fb9c474be…` = | 7 (3) | 0 / 0 | 6 every m (0) | 34 (0) | 0 |
| K=84 (Rng(1004)) | 84 | `982fdccbe433cc94…` = | 84 (7) | 0 / 0 | 83 every m (0) | 419 (0) | 0 |
| K=200 (Rng(1005)) | 200 | `945a4fc792cd011b…` = | 200 (8) | 0 / 0 | 199 every m (0) | 999 (0) | 0 |
| K=1000 (Rng(1006)) | 1000 | `4ff617501dca0600…` = | 1000 (10) | 0 / 0 | 2000 sampled (0) | 2000 (0) | 0 |
| K=1001 (Rng(1007)) | 1001 | `a13b2b4fa6133589…` = | 1001 (10) | 0 / 0 | 2000 sampled (0) | 2000 (0) | 0 |

(b) exact weaves: 148/148 pass (norm 5^(28K), unfold, segment product, JS = Python); segment sub-weaves equal in both languages on 148/148; bits per component 971-2731; median ms JS 45.9, Python 51.3.
Control 1 (shdccp/2 duplicate-last collision): K=3 collides, K=7 collides, K=1001 collides. Control 2 (XOR blind to swaps the weave detects): K=1 0/0, K=2 1/1, K=3 2/2, K=7 6/6, K=84 83/83, K=200 199/199, K=1000 2/2, K=1001 2/2.

## L10 · The hardened, attested import

Identity 0xAE3502AC6FFBA237 and keyVector 9BC2024804859196 by BioChain-AI's computeIdentityId and deriveKeyVector (the core's port equal; Python's equal), epoch EPOCH-OFFLINE-2026-11-06; keys K-c097cdc661697dce0beb1d92 (active), K-7e0fcb2cbfd856240bed45bd (revoked), made in WebCrypto for this run; registry snapshot `phase3-registry.json` SHA-256 `36cbc21d7818564270fe83af98c9bf0da21f240f2f470e7c0de7f1454cca45a3`. Clean set: 50 shards (55 draws). Tier-P twins accepted: 26/26.

| Class | Records | Accepted (JS / Python) | Self-consistent / authentic (JS) | Failing check (JS) | Agree | Owl accepts (control 1) |
| --- | --- | --- | --- | --- | --- | --- |
| clean | 50 | 50 / 50 | 50 / 50 | - 50 | 50/50 |  |
| T1 | 50 | 0 / 0 | 0 / 50 | leaves 50 | 50/50 | 50/50 |
| T2 | 50 | 0 / 0 | 0 / 50 | crystal 50 | 50/50 | 50/50 |
| T3 | 50 | 0 / 0 | 0 / 0 | commitment 50 | 50/50 |  |
| T4 | 50 | 0 / 0 | 50 / 0 | attestation 50 | 50/50 |  |
| T5 | 50 | 0 / 0 | 50 / 0 | attestation 50 | 50/50 |  |
| T6 | 50 | 0 / 0 | 0 / 50 | commitment 50 | 50/50 |  |
| T7 | 50 | 0 / 0 | 0 / 50 | leaves 48, canonical 2 | 50/50 |  |
| T8 | 50 | 0 / 0 | 0 / 50 | weaves 50 | 50/50 | 50/50 |
| T9 | 50 | 0 / 0 | 0 / 50 | canonical 50 | 50/50 | 50/50 |

Control 2: Python without the P1363-to-DER conversion accepted 0 of 126 valid signatures (126 verify with it; InvalidSignature): shows its weakness. Median verification ms per package: JS 135.4, Python 131.5.

## L11 · Verification is cheap enough for corpora

147 shards of at least 59,000 bytes, 3 repetitions with process.hrtime.bigint, the first discarded: median **155.387 ms**, 95% bootstrap interval [154.197, 155.966] (numpy default_rng(7) in run_claims_phase3.py (rank.ci_mean's procedure, the median)). Session 1303.1 ms (LADDR/1 1277.8 ms), once; 1,000 shards ≈ 156.7 s.

By step (median ms): parity 1.066, canonical 78.86, crystal 7.24, leaves 4.615, weaves 13.308, derived 46.364, commitment 1.821, attestation 0.714, inclusion 0.185, consistency 0.11.

Control (attestation skipped): median 153.527 ms against 155.387 ms (difference 1.86 ms; the attestation step measures 0.714 ms; skipped faster on 89/147 shards; paired, full minus skipped, median 1.858 ms, 95% interval [0.354, 2.999]; a single verification's spread is about 5.466 ms): skipped faster (reported; decides nothing under Amendment 8 item 2). The control, the step check (Amendment 8 item 2; READING runner-13): 441/441 full verifications ran the attestation check inside the timed window, 441/441 attestation-skipped ones recorded it skipped: holds.

Reported: LADDR/1 recomputed in each verification 1350.198 ms (147 shards); engrams on packages 243.589 ms [240.247, 246.673]; Python 195.863 ms [192.518, 199.086] (by step: parity 0.368, canonical 72.881, crystal 9.027, leaves 0.43, weaves 9.201, derived 100.753, commitment 0.145, attestation 0.246, inclusion 0.04, consistency 0.025).

## READINGs of this runner

- **runner-1.** Amendment 8 item 1: the packages of L10 and L11 and the corpus manifest of L9(a) use the records grown with engrams off, the Lexicon's default for corpora (D4; Explainer 3: off by default for corpora and never an input). L11 on the same shards' engrams-on packages is reported and decides nothing.
- **runner-3.** L8 control 3: in every shard, bit 0 of the first ASCII byte is flipped (it stays ASCII, so the text stays valid UTF-8) and the text regrown with engrams off; the leaf of the chunk holding that byte and merkleRoot must both change.
- **runner-4.** L8 control 2: the grower with leaves over binary bytes (lexicon_core.js leaves: "binary", the reference's READING 10) runs with engrams off on every shard; its record is compared with Owl's engrams-off record and given to Owl's verifyIntegrity; the Python port's binary record must equal it (reported). Control 1 is the Python grower with BioChain-AI's normalisation (packets "kernel"), engrams off, against Owl's engrams-off record on the synthetic shards; the JS twin is reported.
- **runner-5.** L9(a) draws for K > 200 (the Python half's l9_draws): with replacement from Rng(2000 + j), first the 2,000 alterations, each uniform over the alterations the K <= 200 rule enumerates (the trace's order: for each i replace, delete, insert before i, swap i and i + 1, truncate to i entries; then duplicate-last), then the 2,000 consistency sizes m = 1 + below(K - 1) (K = 1000 has only 999 sizes m < N). A replacement entry is entry i with its first byte XOR 1, an insertion 32 zero bytes (the trace's). For K <= 200 every m in 1..N - 1 (RFC 9162 has no proof from m = 0).
- **runner-6.** L9 control 2 checks every adjacent swap of the synthetic lists for K <= 200 and the first and last (i = 0 and K - 2) for K = 1000 and 1001 (a weave of 1,001 prefixes takes 0.15 s in JS and 0.3 s in Python; the control needs one swap that the XOR misses and the weave detects).
- **runner-7.** L8(b) and (c) "every record": per shard and mode, the distinct records among growSync's, the Python port's, Owl's and BioChain-AI's (equal records are verified once). A rejection of growSync's, Owl's or BioChain-AI's record counts against the JS grower, of the Python port's, Owl's or BioChain-AI's against the Python port. BioChain-AI's record differing from Owl's counts against both (claim (a): "BioChain-AI's gives the same"). (d) is decided by the reference, so a (d) mismatch counts against the JS grower.
- **runner-9.** L10 tamper places, record j of class k from Rng(base + 50(k - 1) + j) after its clean package below(n): T2 frame below(K), then bit below(32) of its crystal32 (word bit 24 + bit), parity re-fixed; T7 frames below(K - 1) and the next; T9 frame below(K), drawn again from the same Rng until the frame has a single-bit residual flip that decodes the same (spike S4's search, in its order), then that flip below(count). T3 (lvocabHash) and T8 (chainId) change the last hex digit, S4's rule as in the trace. T4 is attested by the key the registry marks revoked. T5 takes the attestation of the next clean package in draw order ((c + 1) mod n). T6 is the Tier-P package of the same shard (a Tier-P twin of the corpus, each shard j salted with the test salt of j, its own LCORPUS/1 and LGROW/1, attested by the active key) checked with the salt of shard index + 1, the next shard's, as the trace reads "the salt of shard j + 1".
- **runner-11.** L11 protocol: repetition-major passes over the shards; in each pass a shard's full verification and its attestation-skipped verification run back to back, the order alternating, so drift affects both alike; a shard's time is the mean of its repetitions 2 and 3, the median is over shards, and the control compares the two medians. The package is passed as the parsed object (JSON parsing is not one of the hardened checks). The session (LVOCAB/1, LADDR/1 recomputed from WordNet, the registry snapshot loaded) is timed once and counted once in the 1,000-shard estimate.
- **runner-13.** L11's control, "otherwise the step is not being timed and the test is void", is also read from each timed verification's own record of its checks: every full verification must hold every check passed with the attestation check's time > 0 inside the timed window, and every attestation-skipped one the attestation check recorded as skipped (0 ms) with every other check passed; otherwise L11 is void (not registered: it can only void, never support). The registered comparison of the two medians still decides the control. In this run the attestation step measures 0.714 ms against a single verification's spread of about 5.466 ms, and the paired interval (full minus skipped) is [0.354, 2.999] ms. The registration fixes no power for the comparison; a comparison powered against the noise needs an amendment.

The core's and the reference's own READINGs are marked in lexicon_core.js (chain section) and reference/lexicon/{chain,records,manifest,attest,verify}.py; run_claims_phase3.py marks the L9 draws and control 2's swaps.

## Timings (seconds)

inputs 1.5, l8_js_grow 49.1, l8d_js 18.1, l9_js 95.5, python_l8l9 157.3, pool_l8 1837.6, l10_build 88.1, l10_js_verify 67.2, l10_python_verify 80.1, l10_total 81.1, l11_node 140, l11_literal 602, l11_other_mode 107.8, l11_child_total 852.7, l11_python 106.7, total 3044.2.

## Full results

`claims-phase3.json` (every shard, list, class and control; counterexamples, first 20 of each). Per-instance data (Python's records, the packages, the L11 times) are in `~/.cache/hyperbolic-lexicon/phase3/` (HL_CACHE overrides the root), outside git. The registry snapshot holds public JWKs only; no private key is written anywhere.
