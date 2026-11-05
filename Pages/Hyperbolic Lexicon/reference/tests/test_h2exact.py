"""The exact H^2 tree of D3 (t = 11/13) and L3's control 4 (t = 3/4): the construction, the integer scaling (its
denominators are exactly the lcm over all words, n = 1..5), points against the Fraction frame product, the sheet
identity, the integer decoder against the literal Fraction port of spike S2, and S2's published numbers replayed on
its own seeds (90000 + depth, 90001, 90100 + depth)."""
import math
from fractions import Fraction as F

from hpstep.prng import Rng
from hpstep.problems import children
from lexicon import address as A
from lexicon import h2exact as H2
from lexicon import h3tree as H3

T12, T7 = H2.TREE, H2.H2Tree(F(3, 4))


def random_word(rng, L):
    w = [rng.below(6)]
    while len(w) < L:
        w.append(children(w)[rng.below(5)])
    return tuple(w)


def word_from_idx(idx):
    w = []
    for k in idx:
        w.append(children(w)[k] if w else k)
    return tuple(w)


def all_reduced(L):
    out, layer = [], [()]
    for _ in range(L):
        layer = [w + (g,) for w in layer for g in children(w)]
        out += layer
    return out


def test_construction():
    assert (T12.t, T12.cosh, T12.sinh, T12.m) == (F(11, 13), F(145, 24), F(143, 24), 12)
    assert abs(T12.tau - math.log(12)) < 1e-15 and abs(T7.tau - math.log(7)) < 1e-15
    assert (T12.den(0), T12.den(1), T12.den(3)) == (2, 600, 2 * 300 ** 3)
    assert (T7.den(0), T7.den(2)) == (1, 175 ** 2)
    for T in (T12, T7):
        assert all(u1 * u1 + u2 * u2 == 1 for u1, u2 in H2.DIRS)
        for S, Si in zip(T.step_q, T.step_inv_q):
            Jd = (-1, 1, 1)
            StJS = [[sum(S[k][i] * Jd[k] * S[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
            assert StJS == [[Jd[i] * (i == j) for j in range(3)] for i in range(3)]          # Lorentz
            assert H2._matmul(Si, S) == tuple(tuple(F(int(i == j)) for j in range(3)) for i in range(3))
    assert T12.dirs25 == ((25, 0), (15, 20), (15, -20), (-7, 24), (-7, -24), (-25, 0))
    # other t: m = 2 (even: 2 * 50^n), m = 3 (odd: 75^n), m = 7/3 (not an integer: d^n, d the steps' lcm)
    rng = Rng(8523)
    words = [random_word(rng, 1 + rng.below(12)) for _ in range(60)]
    for t, d1 in ((F(1, 3), 100), (F(1, 2), 75), (F(2, 5), None)):
        T = H2.H2Tree(t)
        assert d1 is None or T.den(1) == d1
        assert all(T.fractions(X, len(w)) == T.point_q(w) for X, w in zip(T.points(words), words))


def test_denominators_are_the_lcm():
    """The scaling of the module docstring is the smallest one: for every n = 1..5 the lcm of the lowest-terms
    denominators of all points of n letters is den(n) (2 * 300^n at t = 11/13, 175^n at t = 3/4)."""
    for T in (T12, T7):
        for n in range(1, 6):
            words = [w for w in all_reduced(n) if len(w) == n]
            lcm = 1
            for X in T.points(words):
                for p, q in H3.coords_lowest(X, T.den(n)):
                    lcm = lcm * q // math.gcd(lcm, q)
            assert lcm == T.den(n), (T.t, n)


def test_points_equal_fraction_frames():
    rng = Rng(8520)
    words = [random_word(rng, 1 + rng.below(30)) for _ in range(300)]
    for T in (T12, T7):
        for w, X in zip(words, T.points(words)):
            assert T.fractions(X, len(w)) == T.point_q(w)
            assert T.on_sheet(X, len(w))


def test_decode_integer_equals_fraction_port():
    rng = Rng(8521)
    for _ in range(300):
        w = random_word(rng, 1 + rng.below(30))
        for T in (T12, T7):
            for L in (len(w), 1 + rng.below(30)):
                X = T.point(w)
                a = T.decode(X, L)
                b = T.decode_fraction(T.fractions(X, len(w)), L)
                assert a == b[:2]


def test_successful_decode_ends_at_origin():
    rng = Rng(8522)
    for _ in range(100):
        w = random_word(rng, 1 + rng.below(25))
        word, ties, last = T12.decode_fraction(T12.fractions(T12.point(w), len(w)), len(w))
        assert word == w and ties == 0 and last == [1, 0, 0]


def test_replay_s2_planning():
    """S2: Rng(90001), 100 words at depth 12 then 40 at depth 28 from the same stream: t = 11/13 100/100 and 40/40;
    t = 3/4 48/100 and 1/40."""
    for T, expect in ((T12, (100, 40)), (T7, (48, 1))):
        rng = Rng(90001)
        a = sum(T.decodes(random_word(rng, 12)) for _ in range(100))
        b = sum(T.decodes(random_word(rng, 28)) for _ in range(40))
        assert (a, b) == expect


def test_replay_s2_decodability_and_bits():
    """S2 sections 2 and 3: 500 words Rng(90000 + depth); t = 11/13 decodes 500/500 with no ties, t = 3/4 decodes
    500, 226, 55 at depths 2, 12, 28; bits at depth 28 for t = 11/13: random 225/152 (pt 823), straight 201/102
    (pt 504, x0 = (12^56 + 1) / (2 12^28)), 106+ 229/188 (pt 877), 106+- 251/188 (pt 943, Rng(90128))."""
    for L, ok7 in ((2, 500), (12, 226), (28, 55)):
        rng = Rng(90000 + L)
        words = [random_word(rng, L) for _ in range(500)]
        pts = T12.points(words)
        dec = [T12.decode(X, L) for X in pts]
        assert all(d == (w, 0) for d, w in zip(dec, words))
        assert all(T12.on_sheet(X, L) for X in pts)
        assert sum(T7.decodes(w) for w in words) == ok7
    d28 = T12.den(28)

    def nd_pt(pts):
        b = [bb for X in pts for bb in H3.coord_bits(X, d28)]
        return max(x[0] for x in b), max(x[1] for x in b), max(H3.point_bits(X, d28) for X in pts)
    assert nd_pt(pts) == (225, 152, 823)
    straight = T12.point(word_from_idx([0] * 28))
    assert nd_pt([straight]) == (201, 102, 504)
    assert F(straight[0], d28) == F(12 ** 56 + 1, 2 * 12 ** 28)
    assert nd_pt([T12.point(word_from_idx([3] * 28))]) == (229, 188, 877)
    rng = Rng(90128)
    pm = [word_from_idx([3 + rng.below(2) for _ in range(28)]) for _ in range(500)]
    assert nd_pt(T12.points(pm)) == (251, 188, 943)


def test_replay_s2_exhaustive_short_words():
    """S2 2b: every reduced word of length 1..6 (23,436): t = 3/4 decodes 17,528, t = 11/13 all."""
    words = all_reduced(6)
    assert len(words) == 23436
    for T, expect in ((T7, 17528), (T12, 23436)):
        assert sum(T.decode(X, len(w))[0] == w for X, w in zip(T.points(words), words)) == expect


def test_verb_forest_dry_run(wn):
    """L3(e) in H^2 on the dry-run verb forest: every point is on the sheet and decodes back; the control t = 3/4
    fails on at least one verb word."""
    vw = A.verb_words(wn)
    words = [vw[o] for o in sorted(vw)]
    pts = T12.points(words)
    assert all(T12.on_sheet(X, len(w)) and T12.decode(X, len(w)) == (w, 0) for X, w in zip(pts, words))
    assert sum(T7.decode(X, len(w))[0] != w for X, w in zip(T7.points(words), words)) >= 1
