# Proposal to SHD-CCP: RFC 03, exact Q_h on the wire and X(5, q) from the LPS p = 5 tree

**Status:** proposal only; nothing in the SHD-CCP repository was changed. This answers three of RFC 03's four TODOs
(`geometric-engine-spec/rfcs/03_nonlocal_engine_and_ghost.md`): an exact representation of Q_h on the wire, the
construction and neighbour enumeration of X(5, q), and a vector suite. Its numbers come from Hyperbolic Lexicon's
spike S5 (`spikes/s5_lps_overlay_output.txt`). Claim L7, registered before any code, then re-checked them on its own
instances and was supported in the Lexicon's Phase 1 (`reference/results/claims.json`, commit 6af2a83). Finalised
after Phase 3, this note marks such results **measured**. What we ask of RFC 03 is still **proposed**.

## 1. Name the generators: the overlay and our addresses share one tree

RFC 03 plans "Ramanujan X(5, q) meeting graphs, used as the P2P overlay". These graphs are the Lubotzky–Phillips–Sarnak
graphs for p = 5. They are Cayley graphs of PSL(2, F_q) or PGL(2, F_q), built from the six quaternions of norm 5 with
odd real part and even imaginary parts:

1 + 2i, 1 − 2i, 1 + 2j, 1 − 2j, 1 + 2k, 1 − 2k.

Those are exactly the generators of the norm-5 tree in Ebayednoob's `Pages/Hyperbolic Oracles/hyperbolic_core.js`
(`P.GENS`, lines 589–605). That tree already gives Engram Mind's Eye its 28-letter addresses and Hyperbolic Lexicon its
WordNet addresses, and `decoder3d.js` places it exactly in H³. So the overlay, the addresses and the exact H³ points are
three readings of one 6-regular tree: X(5, q) is its quotient mod q.

We suggest RFC 03 names LPS p = 5 and these generators explicitly. SHD-CCP's `HurwitzQuaternion` already multiplies
them exactly in doubled coordinates, (2, ±4, 0, 0), (2, 0, ±4, 0), (2, 0, 0, ±4). Spike S5 checked on 1,000 words that
the Hurwitz product, halved, equals the tree's quaternion; without the halving it never matches. **Measured (L7(e)):**
with SHD-CCP's `hurwitz.py` imported read-only, the halved product equals the tree's quaternion on all 2,182 words
tested (1,000 random words and the addresses of the 1,182 mammal synsets); without the halving, all 2,182 differ.

## 2. Construction and neighbour enumeration

For a prime q ≡ 1 (mod 4), let ι be a square root of −1 mod q. Map a quaternion a + bi + cj + dk to the 2×2 matrix

```
[  a + bι    c + dι ]
[ −c + dι    a − bι ]   (mod q)
```

Vertices are these matrices up to nonzero scalar multiples (projective). The graph is:

- **PSL(2, F_q)**, with q(q² − 1)/2 vertices, not bipartite, when the Legendre symbol (5 | q) = +1;
- **PGL(2, F_q)**, with q(q² − 1) vertices, bipartite, when (5 | q) = −1.

A vertex's six neighbours are its products with the six generator matrices. A word's vertex is its quaternion
reduced mod q and projectivised, which equals walking the word from the identity.

Measured by spike S5, and **measured** again by claim L7 (supported), with the same value in every column:

| q | ι | (5 \| q) | Group | Vertices | Bipartite | Diameter | Girth g | r = ⌊(g − 1)/2⌋ | Largest nontrivial \|λ\| | Margin to 2√5 = 4.4721 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 13 | 5 | −1 | PGL | 2,184 | yes | 7 | 8 | 3 | 4.2497 | 0.2224 |
| 17 | 4 | −1 | PGL | 4,896 | yes | 9 | 8 | 3 | 4.3089 | 0.1632 |
| 29 | 12 | +1 | PSL | 12,180 | no | 8 | 9 | 4 | 4.4420 | 0.0301 |

Every graph is 6-regular, connected and inverse-closed, and Ramanujan: every eigenvalue other than ±6 has
|λ| ≤ 2√5. Distinct reduced words of length ≤ r land on distinct vertices; collisions start at length r + 1.
- **Spike S5:** reducing the quaternion mod q equals the walk on 1,000 of 1,000 words at each q. A dense float64
  eigendecomposition at 12,180 vertices took about 161 s on a 4-core container.
- **Measured (L7):** the reduction equals the walk on all 11,182 words at each q (10,000 random words and the 1,182
  mammal addresses). The collision-free set was checked exhaustively: 187, 187 and 937 reduced words of length ≤ r,
  on as many distinct vertices. The eigendecomposition at 12,180 vertices took 43.9 s in that run.

The controls fail as they should. ι = 2 (not a square root of −1) breaks the walk identity at every q: in L7, on
10,867, 10,877 and 10,879 of the 11,182 words. A 4-generator subset is not 6-regular.

## 3. Exact Q_h on the wire

RFC 03 defines Q_h = sinh² d_ℍ. For points a, b on the hyperboloid, Q_h = ⟨a, b⟩_L² − 1, where ⟨·,·⟩_L is the Lorentz
inner product. For rational points, Q_h is rational and can be carried exactly.

For the octahedral tree points, a word of length n is an integer vector divided by 7^n (boost t = 3/4: cosh = 25/7,
sinh = 24/7, τ = ln 7). So ⟨a, b⟩_L is an integer N₀ over 7^(n_a + n_b), and
Q_h = (N₀² − 7^(2(n_a + n_b))) / 7^(2(n_a + n_b)).

We propose carrying Q_h as the pair (N, e) with N = N₀² − 7^(2e) and e = n_a + n_b, in LEB128 or decimal. Both
parties then compare or rank Q_h exactly. Spike S1 shows why floats are not enough: float64 ranking of these points
first inverts an exactly strict order at depth 10 on straight paths and 12 on random words. **Measured (L4(b),
supported in Phase 2; `reference/results/claims-phase2.json`, commit 648a6b6):** ranked against all 82,115 WordNet
nouns, float64 ranking of the exact points inverts an exactly strictly ordered adjacent pair in 990 of 1,000 noun
queries in H³ (993 in H²). Exact ranking (L4(a)) gives identical rank lists in Python and JavaScript.

## 4. A warning about integrity

An address reduced mod q is a good **shard key**: deterministic, uniform on the group, and collision-free for short
prefixes. It is **not** an integrity primitive. Cayley hashes on LPS graphs have known collision and preimage attacks
(Tillich–Zémor 2008; Petit–Lauter–Quisquater 2008). SHA-256 should remain the integrity layer (see
`SHD-CCP-Lemma15-note.md`).

## 5. Vectors

`lps_x5q_reduction` in `SHD-CCP-golden-vectors.md`: q, a word's id, and the normalised projective matrix entries. Its
JSON cases include the exhaustive collision-free set up to length r for each q (187, 187 and 937 words, as L7
measured). The suite is proposed and not written yet; the Lexicon carried it over from its Phase 3 plan.
