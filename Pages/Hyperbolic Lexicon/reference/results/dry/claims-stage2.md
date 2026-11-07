# Stage 2 claims (dry run (A13.13))

PREREGISTRATION.md with Amendments 1-14; HEAD `9550eeaeb0543280519b03e13ba060238a8638e1`

## Sealed (A13.13)

Every value, interval and verdict on a human-rated set is in the sealed file (SHA-256 `9c9eac2c8122f1f228b76be34cef189c4fd2429b93dd4e3b48046a37cda79d64`).

## Controls fail as required

- L12: `{"control1": true, "control2": true, "control3": true, "control4": true}`
- L13: `{"control1": true, "control2": true, "control3": true}`
- L15: `{"control1": false, "control2": true, "control3": true}`

## L14(a) on the verb graph and its split (WordNet data)

Verdict: void

## Wiring

141 decided comparisons and 321 control values equal Amendment 13's text (check_spec) and their recomputation from the code files (verify_wiring).

## Convergence

40 of 42 runs converged.

## Pass 1

1475 code files, 5842184 lines; 15801 240-digit recomputations; 15801 values in numerical ties between distinct tuples.

