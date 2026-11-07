# Stage 2 claims (dry run (A13.13))

PREREGISTRATION.md with Amendments 1-13; HEAD `841b90cca9894d2b544c4a0635fba1a9507fdd1e`

## Sealed (A13.13)

Every value, interval and verdict on a human-rated set is in the sealed file (SHA-256 `7ba50e016172955f4052d488711a9f561c47fb3d20540e7c0136f1648dd28936`).

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

915 code files, 5589064 lines; 12214 240-digit recomputations; 12214 values in numerical ties between distinct tuples.

