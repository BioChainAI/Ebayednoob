"""The sharper guard (claim E10): mechanics on unregistered instances (seeds 9000 and above)."""
from hpstep import fence as Fz
from hpstep.prng import Rng

from engram import guard as Gd
from engram import watch as W

PTS = W.depth2_points()


def matrix(i):
    idx = Rng(9000 + i).sample(len(PTS), 24)
    return Fz.distance_matrix([PTS[j] for j in idx])


def test_original_guard_is_guard_check():
    for i in range(3):
        for delta in (0.5, 1.5):
            E, pairs = Fz.corrupt(matrix(i), 1, delta, 9500 + i)
            g, ref = Gd.guards(E), Fz.guard_check(E)
            assert g['bad'] == ref['bad'] and abs(g['worst'] - ref['worst']) == 0
            assert [(tuple(p), c) for p, c in ref['top']] == g['original']


def test_proposition_and_its_consequences():
    for i in range(6):
        D = matrix(i)
        assert Gd.guards(D)['bad'] == 0                      # the premise: a clean matrix
        for delta in (0.5, 1.0, 1.5, 3.0):
            E, pairs = Fz.corrupt(D, 1, delta, 9600 + i)
            c = Gd.checks(E, tuple(pairs[0]))
            assert c['e10a'] and c['e10c'] and c['e10d']
            if c['bad'] >= 2:
                assert c['matching_named']


def test_the_full_37_point_matrix():
    D = Fz.distance_matrix(PTS)
    assert Gd.guards(D)['bad'] == 0
    E, pairs = Fz.corrupt(D, 1, 3.0, 9700)
    c = Gd.checks(E, tuple(pairs[0]))
    assert c['e10a'] and c['e10d'] and c['matching_named'] and c['bad'] >= 2


def test_control_smallest_matching_fails():
    fails = 0
    for i in range(6):
        E, pairs = Fz.corrupt(matrix(i), 1, 1.5, 9800 + i)
        fails += not Gd.checks(E, tuple(pairs[0]))['control_e10d']
    assert fails > 0
