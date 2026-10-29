"""Decoders, instances and Helix B for B1-B4."""
from fractions import Fraction as F
import random

import numpy as np

from hpstep import Rng
from hpstep import hyperbolic as H
from hpstep import exact as X
from hpstep import problems as PB


def test_colour_decoder_float_equals_exact():
    rng = Rng(1)
    for _ in range(3000):
        x, y = F(rng.randint(-60, 60), 61), F(rng.randint(-60, 60), 61)
        exact = PB.colour_of(x, y)
        fl = int(PB.colours_float(np.array([[1.0, float(x), float(y)]]))[0])
        assert exact == fl
    # the branch directions themselves and the boundary lines (y^2 = 3x^2)
    assert [PB.colour_of(*p) for p in [(1, 0), (-1, 1), (-1, -1), (0, 0)]] == [0, 1, 2, 0]
    assert PB.colour_of(F(1), F(0)) == 0 and PB.colour_of(F(-1), F(0)) == 2


def test_planted_graph_is_properly_coloured_by_its_classes():
    cls, edges = PB.planted_3col(60, 4.69, Rng(1000))
    assert len(edges) == round(4.69 * 60 / 2) and len(set(edges)) == len(edges)
    assert all(cls[u] != cls[v] for u, v in edges)
    assert sorted(cls.count(k) for k in range(3)) == [20, 20, 20]


def test_three_colouring_helix_b_matches_search_cost():
    prob = PB.ThreeColouring(30, 4.4, Rng(1001))
    pts = prob.init_points(Rng(5), 4, spread=0.6)
    costs = prob(pts)
    for p in range(4):
        exact_pts = [X.ghost([F(round(v * 2 ** 20), 2 ** 20) for v in H.to_poincare(y)]) for y in pts[p]]
        assert prob.helix_b(exact_pts) == prob.helix_b(pts[p]) == int(costs[p])
    # the planted colouring placed on the branch directions has no conflicts
    planted = np.array([H.from_poincare(0.5 * np.array([np.cos(2 * np.pi * c / 3), np.sin(2 * np.pi * c / 3)])) for c in prob.classes])
    assert prob(planted[None])[0] == 0


def test_maxsat_generator_matches_polystep_example():
    # polystep's examples/04_maxsat_10k.py, generate_maxsat_instance, reproduced line for line
    rng = random.Random(42)
    n, k, ratio = 50, 3, 4.27
    ref = [[v + n * (rng.random() < 0.5) for v in rng.sample(range(n), k)] for _ in range(int(n * ratio))]
    assert PB.maxsat_instance(50, 4.27, 42).tolist() == ref


def test_maxsat_cost_and_helix_b():
    prob = PB.MaxSat(40, seed=3)
    pts = prob.init_points(Rng(2), 3, spread=0.3)
    c = prob(pts)
    for p in range(3):
        assert prob.helix_b(pts[p]) == round(c[p] * len(prob.lits))


def test_tree_quaternions_and_right_division():
    for L in range(1, 5):
        words = [[]]
        for _ in range(L):
            words = [w + [g] for w in words for g in PB.children(w)]
        assert len(words) == 6 * 5 ** (L - 1)
        qs = {PB.word_quaternion(w) for w in words}
        assert len(qs) == len(words)                                  # distinct: a free group
        assert all(sum(c * c for c in PB.word_quaternion(w)) == 5 ** L for w in words[:200])
    rng = Rng(4)
    for _ in range(200):
        w = PB.TreeAddress.random_target(rng, 8)
        assert PB.is_reduced(w) and PB.right_divide(PB.word_quaternion(w), 8) == w


def node_in_frame(emb, w, k):
    """The point of node w in the frame of its ancestor w[:k], built from moderate step matrices."""
    M = np.eye(3)
    for i in range(k, len(w)):
        M = M @ emb.step[emb.slot(w[:i], w[i])]
    return M[:, 0].copy()


def test_tree_embedding_decodes_its_own_nodes():
    emb = PB.TreeEmbedding(3.0)
    rng = Rng(5)
    for _ in range(300):
        L = 1 + rng.below(8)
        w = PB.TreeAddress.random_target(rng, L)
        for k in range(max(0, L - 2), L + 1):          # anchored at an ancestor near the node
            assert emb.decode(node_in_frame(emb, w, k), L, w[:k]) == w
        if L <= 5:                                      # within float64's horizon the root frame works too
            assert emb.decode(emb.point(w), L) == w
    # re-anchoring a point never changes what it decodes to
    for _ in range(100):
        w = PB.TreeAddress.random_target(rng, 8)
        y = node_in_frame(emb, w, 5)
        a, z = emb.reanchor(w[:5], y, 8)
        assert emb.decode(z, 8, a) == w and z[0] < 20
    prob = PB.TreeAddress(6, PB.TreeAddress.random_target(rng, 6))
    prob.focus(prob.target[:4])
    y = node_in_frame(prob.emb, prob.target, 4)[None, None, :]
    assert prob(y)[0] == 0
    cert = prob.helix_b(y[0], tuple(prob.target[:4]))
    assert cert['certified'] and cert['distance'] == 0


def test_float_hyperboloid_horizon():
    """Why B3 anchors its points: measured from the root, a depth-8 node (distance about 24) is beyond what float64
    hyperboloid coordinates can hold: the sheet constraint is lost."""
    emb = PB.TreeEmbedding(3.0)
    deep = emb.point([3, 0, 2, 2, 2, 1, 1, 4])
    assert abs(H.lorentz(deep, deep) + 1) > 1
    shallow = emb.point([3, 0, 2])
    assert abs(H.lorentz(shallow, shallow) + 1) < 1e-6


def test_hard_threshold_net_shapes_and_counts():
    rng = Rng(6)
    data = PB.hierarchical_data(rng, n_train=200, n_test=100)
    for hyper in (True, False):
        net = PB.HardThresholdNet(data, Rng(7), hyper=hyper, batch=64)
        pts = net.init_points(Rng(8), 3)
        c = net(pts)
        assert c.shape == (3,) and np.all((0 <= c) & (c <= 1))
        acc, coarse = net.accuracy(pts[0])
        assert 0 <= acc <= coarse <= 1
        assert 0 <= net.helix_b(pts[0]) <= 200
