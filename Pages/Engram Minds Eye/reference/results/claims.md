# Engram Mind's Eye: preregistered claims

Run 2026-11-04 17:14:31 UTC, Python 3.13.18.

| Claim | Decision | Cases | Failures | Controls |
| --- | --- | --- | --- | --- |
| E1 | supported | 613 | 0 | amended: Mulberry32 increment 0x6D2B79F7, entries that differ: 527; registered (void): multiplier 37, entries that differ: 0 |
| E2 | supported | 85 | 0 | a: backtracking packet appended, recovery broken: 80/80; b: two distinct packets swapped, quaternion changed: 65/65 |
| E3 | supported | 1444184 | 0 | parity alone fooled by same-position doubles: 150/150 |
| E4 | supported | 40 | 0 | two distinct non-identity blocks swapped, equality broken: 40/40; one packet replaced by another, equality broken: 40/40 |
| E5 | supported | 21 | 0 | same chirality changed B in runs: 21/21 |
| E6 | supported | 284371 | 0 | gauge with Y = b + c, triples it fails to recover: 270400/274625 |
| E7 | supported (settlement (exact): supported, detection at d = 2 (statistical): supported) | 3958 | 0 | — |
| E8 | inconclusive (clean bound (exact): supported, blame at 1.5 and 3.0 (statistical): inconclusive) | 50 | 0 | — |
| E9 | supported (E9a parity-keeping variants (exact): supported, E9b one-letter substitutions (equivalence): supported) | 4595 | 0 | — |
