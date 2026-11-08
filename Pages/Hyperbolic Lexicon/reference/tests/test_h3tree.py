"""Exact H^3 points as integer frames over 7^n against hpstep's TreeEmbedding3D.point_exact (Fractions), the sheet
identity, the integer decoder against hpstep's decode_exact, the float control (L3 control 3), bits and text, and two
spike replays: S3's verb point hash and S2's H^3 bits at depth 28."""
import hashlib
import random
from fractions import Fraction

from hpstep.decode3d import TreeEmbedding3D
from hpstep.prng import Rng
from hpstep.problems import children
from lexicon import address as A
from lexicon import h3tree as H3

S3_VERB_POINTS_SHA = 'c230e715293fa61a4f96b8ea214f0b288508a82e7f86415d38a05881096b53b9'   # s3_wordnet_shape_output.txt


def random_word(rng, L):
    w = [rng.below(6)]
    while len(w) < L:
        w.append(children(w)[rng.below(5)])
    return tuple(w)


def random_words(seed, n, lo=1, hi=40):
    rng = Rng(seed)
    return [random_word(rng, lo + rng.below(hi - lo + 1)) for _ in range(n)]


def test_integer_steps():
    E = TreeEmbedding3D()
    for S, S7, Q, Q7 in zip(E.step_q, H3.STEP7, E.step_inv_q, H3.STEP7_INV):
        assert [[Fraction(x) * 7 for x in r] for r in S] == [list(r) for r in S7]
        assert [[Fraction(x) * 7 for x in r] for r in Q] == [list(r) for r in Q7]
    assert H3.STEP7[0][0] == (25, 24, 0, 0)


def test_points_equal_hpstep_point_exact():
    """A few thousand words: the integer frame product equals point_exact exactly, as Fractions."""
    words = random_words(8510, 2500)
    pts = H3.points(words)
    E = TreeEmbedding3D()
    for w, X in zip(words, pts):
        assert H3.fractions(X, len(w)) == E.point_exact(list(w))
        assert H3.on_sheet(X, len(w))
    assert H3.point(words[0]) == pts[0]


def test_walk_handles_prefixes_duplicates_and_order():
    words = random_words(8511, 300, 1, 12)
    words += [w[:k] for w in words[:40] for k in range(1, len(w))] + words[:30]
    random.Random(1).shuffle(words)
    pts = H3.points(words)
    assert pts == [H3.points([w])[0] for w in words]


def test_decode_int_is_hpstep_decode_exact():
    words = random_words(8512, 1500)
    for w, X in zip(words, H3.points(words)):
        n = len(w)
        a = H3.decode_exact(X, n)
        assert a == w and H3.decode_int(X, n) == a
        assert H3.decode_int(tuple(3 * x for x in X), n) == w                  # any positive scale
    # decoded to other depths than the word's own: the same both ways
    rng = Rng(8513)
    for _ in range(300):
        w, L = random_word(rng, 1 + rng.below(20)), 1 + rng.below(25)
        X = H3.point(w)
        assert H3.decode_int(X, L) == H3.decode_exact(X, len(w), L)
    # off the tree: random integer points, and points with forced ties (equal spatial coordinates), decode the
    # same both ways (decode_exact reads X as X / 7^n; decode_int takes any positive scale)
    rng = Rng(8516)
    for k in range(600):
        a = [rng.below(2001) - 1000 for _ in range(3)]
        if k % 3 == 1:
            a[1] = a[0]
        elif k % 3 == 2:
            a[2] = a[1] = a[0]
        X = (sum(abs(x) for x in a) + 1 + rng.below(50),) + tuple(a)
        L = 1 + rng.below(12)
        assert H3.decode_int(X, L) == H3.decode_exact(X, 0, L)


def test_float_control_fails_beyond_12_letters():
    short = random_words(8514, 200, 1, 8)
    assert all(H3.float_ok(w) for w in short)
    long_ = random_words(8515, 200, 13, 40)
    assert sum(not H3.float_ok(w) for w in long_) >= 1


def test_text_and_bits():
    X = H3.point((0,))
    assert X == (25, 24, 0, 0) and H3.coords_text(X, 7) == '25/7 24/7 0/1 0/1'
    assert H3.coord_bits(X, 7) == [(5, 3), (5, 3), (0, 1), (0, 1)]
    assert H3.point_bits(X, 7) == 5 + 5 + 0 + 0 + 3
    assert H3.coords_lowest((49, -14, 0, 7), 49) == [(1, 1), (-2, 7), (0, 1), (1, 7)]


def test_replay_s2_h3_bits_depth_28():
    """Spike S2, section 3b: the 500 random words Rng(90028) at depth 28 in H^3: max 142/79 bits, pt 637."""
    rng = Rng(90028)
    words = [random_word(rng, 28) for _ in range(500)]
    pts = H3.points(words)
    d = 7 ** 28
    assert max(b[0] for X in pts for b in H3.coord_bits(X, d)) == 142
    assert max(b[1] for X in pts for b in H3.coord_bits(X, d)) == 79
    assert max(H3.point_bits(X, d) for X in pts) == 637
    straight = tuple([0] * 28)
    assert Fraction(H3.point(straight)[0], d) == Fraction(7 ** 56 + 1, 2 * 7 ** 28)


def test_verb_points_replay_s3(wn):
    """Spike S3: the verb forest's integer points over 7^n hash to its verb.points.sha256; all lie on the sheet and
    decode back (L3(e) in H^3 on the dry-run forest)."""
    vw = A.verb_words(wn)
    offs = sorted(vw)
    words = [vw[o] for o in offs]
    pts = H3.points(words)
    text = ''.join(f'{o} ' + ','.join(map(str, X)) + '\n' for o, X in zip(offs, pts))
    assert hashlib.sha256(text.encode()).hexdigest() == S3_VERB_POINTS_SHA
    assert all(H3.on_sheet(X, len(w)) for X, w in zip(pts, words))
    assert all(H3.decode_int(X, len(w)) == w for X, w in zip(pts, words))
