"""L7 (Amendment 1, item 9) on unregistered and spike words: phi_q, the Cayley graphs for q = 13, 17, 29, the exact
girth, (b) walk = reduction, (c) injectivity up to r, (d) the Ramanujan spectrum (q = 13, 17 fast; 29 slow), (e)
SHD-CCP's Hurwitz product read-only, and every control. Spike S5's published values are replayed on its own words
Rng(90000 + i)."""
import os

import pytest

from hpstep.prng import Rng
from hpstep.problems import GENS, INV, word_quaternion
from lexicon import lps

S5 = {13: dict(iota=5, n=2184, bip=True, g=8, r=3, ident=480, diam=7, upto_r1=737, maxabs=4.249720849060803),
      17: dict(iota=4, n=4896, bip=True, g=8, r=3, ident=144, diam=9, upto_r1=865, maxabs=4.308918669345169),
      29: dict(iota=12, n=12180, bip=False, g=9, r=4, ident=216, diam=8, upto_r1=3963, maxabs=4.44201644259386)}


def s5_words():
    return [lps.random_word(Rng(90000 + i)) for i in range(1000)]


def our_words(n=2000):
    rng = Rng(8550)                                       # one unregistered stream (8550 + i would reach 9000)
    return [lps.random_word(rng) for _ in range(n)]


def test_random_word_is_item_9_and_s5s_generator():
    w = s5_words()
    assert sum(map(len, w)) == 30229 and min(map(len, w)) == 1 and max(map(len, w)) == 60
    assert [sum(1 for x in w if x[0] == g) for g in range(6)] == [179, 176, 182, 157, 152, 154]
    assert ''.join(map(str, w[0])) == '1204204433535150050500242514221'
    assert word_quaternion(w[0]) == (48450380097, -15098106454, -30745689390, -33703461350)


@pytest.mark.parametrize('q', lps.QS)
def test_phi_and_structure(q):
    e = S5[q]
    iota = lps.sqrt_minus_one(q)
    assert iota == e['iota'] and (iota * iota + 1) % q == 0
    mats = [lps.phi(g, iota, q) for g in GENS]
    assert all(lps.det(m, q) == 5 % q for m in mats)
    for x, a in enumerate(GENS):
        for y, b in enumerate(GENS):
            assert lps.canon(lps.mmul(lps.phi(a, iota, q), lps.phi(b, iota, q), q), q) == \
                lps.canon(lps.phi(word_quaternion([x, y]), iota, q), q)
    G = lps.graph(q)
    s = lps.structure(G)
    assert s['vertices'] == s['expected'] == e['n'] and s['count_ok']
    assert s['regular6'] and s['inverse_closed'] and s['connected'] and s['diameter'] == e['diam']
    assert s['bipartite'] == s['bipartite_expected'] == e['bip']
    g, r = lps.girth(G)
    assert (g, r) == (e['g'], e['r'])
    counts = lps.identity_word_counts(G, g + 1)
    assert next(L for L in range(1, len(counts)) if counts[L]) == g and counts[g] == e['ident']


@pytest.mark.parametrize('q', lps.QS)
def test_walk_equals_reduction(q):
    G = lps.graph(q)
    assert lps.walk_vs_reduction(G, our_words()) == []
    assert lps.walk_vs_reduction(G, s5_words()) == []
    assert G.reduction([0]) == G.walk([0]) == 1 and G.walk([]) == 0
    assert all(G.walk([g, INV[g]]) == 0 for g in range(6))


@pytest.mark.parametrize('q', lps.QS)
def test_injectivity_up_to_r(q):
    G = lps.graph(q)
    _, r = lps.girth(G)
    n, distinct, bad = lps.injectivity(G, r)
    assert n == distinct == 1 + 6 * (5 ** r - 1) // 4 and bad == 0
    n1, d1, _ = lps.injectivity(G, r + 1)
    assert d1 == S5[q]['upto_r1'] < n1                    # sharp: words of length r + 1 collide


@pytest.mark.parametrize('q', lps.QS)
def test_controls(q):
    w = s5_words()
    assert len(lps.control_iota2(q, w)) == 968            # S5: iota = 2 breaks the walk identity on 968/1000
    assert len(lps.control_iota2(q, our_words(200))) >= 1
    s = lps.control_subset(q)
    assert not s['regular6'] and s['degrees'] == [4]


@pytest.mark.parametrize('q', (13, 17))
def test_spectrum(q):
    sp = lps.spectrum(lps.graph(q))
    assert sp['n_plus6'] == 1 and sp['n_minus6'] == 1 and sp['ramanujan']
    assert abs(sp['maxabs'] - S5[q]['maxabs']) < 1e-9
    assert abs(sp['margin'] - {13: 0.222415, 17: 0.163217}[q]) < 1e-6


@pytest.mark.slow
def test_spectrum_q29():
    """q = 29: 12,180 vertices, eigvalsh about 50-160 s and about 2.3 GB."""
    sp = lps.spectrum(lps.graph(29))
    assert sp['n_plus6'] == 1 and sp['n_minus6'] == 0 and sp['ramanujan']
    assert abs(sp['maxabs'] - S5[29]['maxabs']) < 1e-9 and abs(sp['margin'] - 0.030120) < 1e-6


def test_hurwitz_read_only():
    hz, digest = lps.load_hurwitz()
    assert digest == lps.HURWITZ_SHA256
    assert os.path.realpath(hz.__file__) == os.path.realpath(lps.HURWITZ_FILE)
    assert not os.path.exists(os.path.join(os.path.dirname(lps.HURWITZ_FILE), '__pycache__'))
    words = our_words(500) + s5_words()
    assert lps.hurwitz_check(words) == []
    assert lps.hurwitz_word(()) == (1, 0, 0, 0)
    # the registered control: products of doubled coordinates, compared without dividing by 2^L
    assert len(lps.control_raw_doubled(words)) == sum(1 for w in words if w)
    assert all(lps.raw_doubled_product(w) == tuple(2 ** len(w) * c for c in word_quaternion(w)) for w in words[:50])
    assert lps.raw_doubled_product(()) == (1, 0, 0, 0)
    bad = lps.hurwitz_check(words, halve=False)            # the reported variant: no final halving
    assert len(bad) == len(words)
    assert all(lps.hurwitz_word(w, halve=False) == tuple(2 * c for c in word_quaternion(w)) for w in words[:50])


def test_spread():
    G = lps.graph(13)
    hit, top = lps.spread(G, our_words(500))
    assert 1 <= hit <= 500 and top >= 1
