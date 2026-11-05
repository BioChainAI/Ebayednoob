"""The flat arms F3, F2, F3*, F2* (Amendment 1, item 7) against a plain Fraction implementation of the rule, their
denominators, edge lengths, and the lattice collisions of F3."""
from fractions import Fraction as F

from hpstep.decode3d import OCTA, rot_to, slot_direction
from hpstep.prng import Rng
from hpstep.problems import children
from lexicon import flat
from lexicon import h2exact as H2
from lexicon import rank as R


def random_word(rng, L):
    w = [rng.below(6)]
    while len(w) < L:
        w.append(children(w)[rng.below(5)])
    return tuple(w)


def plain_point(word, dim, star):
    """Item 7 as written: R' = R R(u), p' = p + l R' e1, l = 1 (F) or (1/4)^k into a word of length k + 1 (F*)."""
    if dim == 3:
        Rm = [[F(int(i == j)) for j in range(3)] for i in range(3)]
        p = [F(0)] * 3
    else:
        Rm = [[F(1), F(0)], [F(0), F(1)]]
        p = [F(0)] * 2
    for i, g in enumerate(word):
        if dim == 3:
            U = rot_to(OCTA[slot_direction(word[:i], g)])
        else:
            u1, u2 = H2.DIRS[g if i == 0 else children(word[:i]).index(g)]
            U = [[u1, -u2], [u2, u1]]
        Rm = [[sum((Rm[r][k] * U[k][c] for k in range(dim)), F(0)) for c in range(dim)] for r in range(dim)]
        ell = F(1, 4 ** i) if star else F(1)
        p = [p[r] + ell * Rm[r][0] for r in range(dim)]
    return p


def test_flat_points_equal_the_plain_rule():
    rng = Rng(8530)
    words = [random_word(rng, 1 + rng.below(25)) for _ in range(300)]
    for dim in (3, 2):
        for star in (False, True):
            T = flat.tree(dim, star)
            for w, X in zip(words, T.points(words)):
                assert [F(x, T.den(len(w))) for x in X] == plain_point(w, dim, star), (T.name, w)


def test_denominators_and_edges():
    assert [flat.F3.den(n) for n in (0, 1, 5)] == [1, 1, 1]
    assert [flat.F3S.den(n) for n in (0, 1, 2, 5)] == [1, 1, 4, 4 ** 4]
    assert [flat.F2.den(n) for n in (0, 1, 3)] == [1, 25, 25 ** 3]
    assert [flat.F2S.den(n) for n in (0, 1, 3)] == [1, 25, 25 ** 3 * 16]
    rng = Rng(8531)
    for _ in range(100):
        w = random_word(rng, 2 + rng.below(15))
        for T in (flat.F3, flat.F2, flat.F3S, flat.F2S):
            a = [F(x, T.den(len(w) - 1)) for x in T.point(w[:-1])]
            b = [F(x, T.den(len(w))) for x in T.point(w)]
            sq = sum((x - y) ** 2 for x, y in zip(a, b))
            assert sq == (F(1, 16 ** (len(w) - 1)) if T.star else 1)
    assert flat.F3.point((0,)) == (1, 0, 0) and flat.F2.point((3,)) == (-7, 24)


def test_f3_collides_on_its_lattice():
    words = [w for L in range(1, 5) for w in _all(L)]
    pts = flat.F3.points(words)                                     # den 1: integer points
    assert len(set(pts)) < len(words)
    assert pts[words.index((0, 2))] == pts[words.index((2, 4))] == (1, 1, 0)       # +e1 then +e2, +e2 then +e1


def _all(L):
    layer = [()]
    for _ in range(L):
        layer = [w + (g,) for w in layer for g in children(w)]
    return layer


def test_flat_arm_keys_order_by_squared_distance():
    rng = Rng(8532)
    words = sorted({random_word(rng, 1 + rng.below(8)) for _ in range(120)})
    for dim in (3, 2):
        for star in (False, True):
            T = flat.tree(dim, star)
            arm = flat.arm(words, dim, star)
            pts = [[F(x, T.den(len(w))) for x in X] for w, X in zip(words, T.points(words))]
            for u in (0, 17, 60):
                keys = arm.keys(u)
                sq = [sum((a - b) ** 2 for a, b in zip(pts[u], p)) for p in pts]
                base = F(keys[u], arm.den ** 2)
                assert [F(k, arm.den ** 2) - base for k in keys] == sq
                assert isinstance(arm, R.Arm) and arm.kind == 'euclid'
