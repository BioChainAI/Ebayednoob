"""Version 2, phase A: the decoders of H^3 (hpstep/decode3d.py). D1-D5 for the anchor decoders, E1-E3 for the
octahedral tree, the four problems' Helix B, and a smoke run of version 1's step and channels on them."""
from fractions import Fraction as F
import math

import numpy as np
import pytest

from hpstep import Rng, PolyStepH, StepConfig, TriChannel
from hpstep import decode3d as D
from hpstep import exact as X
from hpstep import hyperbolic as H
from hpstep.problems import children, hierarchical_data

SETS = list(D.ANCHORS.items())


def rational_point(rng, K=2 ** 12, r=0.9):
    """An exact point of H^3: the ghost map of a rational point of the ball."""
    while True:
        p = [F(rng.randint(-K, K), K) for _ in range(3)]
        if sum(x * x for x in p) < r * r:
            return X.ghost(p)


def near_ties(rng, n):
    """Float 3-vectors on or beside the decision boundaries: equal coordinates, opposite ones, sums near zero,
    signed zeros, tiny and huge magnitudes."""
    out = []
    for _ in range(n):
        x = (2 * rng.random() - 1) * 10 ** rng.randint(-300, 300)
        kind = rng.below(6)
        eps = math.ulp(x) * rng.randint(-3, 3)
        if kind == 0:
            v = [x, x + eps, (2 * rng.random() - 1) * abs(x)]
        elif kind == 1:
            v = [x, -x + eps, x]
        elif kind == 2:
            v = [x, x, x]
        elif kind == 3:
            v = [0.0, -0.0, x]
        elif kind == 4:
            v = [x, (2 * rng.random() - 1) * 1e-300, -x - eps]
        else:
            v = [2 * rng.random() - 1 for _ in range(3)]
        perm = [0, 1, 2]
        rng.shuffle(perm)
        out.append([v[i] for i in perm])
    return out


@pytest.mark.parametrize('name,A', SETS)
def test_D1_same_answer_in_every_radial_chart(name, A):
    rng = Rng(101)
    for _ in range(300):
        y = rational_point(rng)
        poincare = [c / (1 + y[0]) for c in y[1:]]
        klein = [c / y[0] for c in y[1:]]
        k = D.decode_exact(y, A)
        assert D.decode_exact(poincare, A) == k and D.decode_exact(klein, A) == k


@pytest.mark.parametrize('name,A', SETS)
def test_D2_float_decoder_equals_exact_on_every_float(name, A):
    rng = Rng(202)
    V = near_ties(rng, 4000)
    got = D.decode_float(np.array(V), A)
    for v, k in zip(V, got):
        assert k == D.decode_exact([F(c) for c in v], A), (name, v)
    # and on points of the sheet (4 coordinates)
    Y = [X.to_float(rational_point(rng)) for _ in range(500)]
    assert list(D.decode_float(np.array(Y), A)) == [D.decode_exact([F(c) for c in y], A) for y in Y]


def test_D2_control_a_naive_dot_product_decoder_can_disagree():
    """The control: argmax of float dot products (three-term sums) is not exact; somewhere near a tie it differs."""
    rng = Rng(303)
    bad = 0
    for v in near_ties(rng, 4000):
        dots = [D._dot(a, v) for a in D.CUBE]
        if int(np.argmax(dots)) != D.decode_exact([F(c) for c in v], D.CUBE):
            bad += 1
    assert bad > 0


@pytest.mark.parametrize('name,A', SETS)
def test_D3_symmetry_permutes_the_answers(name, A):
    G = D.symmetry_group(A)
    assert len(G) == {'axes': 3, 'tetra': 12, 'octa': 24, 'cube': 24}[name]
    rng = Rng(404)
    for _ in range(200):
        y = rational_point(rng)
        k = D.decode_exact(y, A)
        dots = sorted(D._dot(a, y[1:]) for a in A)
        if dots[-1] == dots[-2]:
            continue                                     # a tie: the lowest-index rule is not equivariant there
        for R, sigma in G:
            assert D.decode_exact(D.rotate(R, y), A) == sigma[k]


@pytest.mark.parametrize('name,A', SETS)
def test_D4_every_answer_has_the_same_share(name, A):
    assert D.is_transitive(A)
    rng = np.random.default_rng(5)
    g = rng.standard_normal((200_000, 3))
    counts = np.bincount(D.decode_float(g, A), minlength=len(A))
    p = 1 / len(A)
    sd = math.sqrt(len(g) * p * (1 - p))
    assert np.all(np.abs(counts - len(g) * p) < 5 * sd), counts


def test_D5_global_axis_rotations_leave_b1_conflicts_unchanged():
    prob = D.ThreeColouring3D(60, 4.4, Rng(7))
    G = D.symmetry_group(D.AXES)
    rng = Rng(8)
    for _ in range(20):
        pts = prob.init_points(rng, 1, spread=0.9)[0]
        base = prob.helix_b(pts)
        for R, _ in G:
            rotated = np.array([D.rotate(R, list(y)) for y in pts])
            assert prob.helix_b(rotated) == base
    # control: a rotation outside the group (a quarter-turn about e3) does change some count
    Rq = ((0, -1, 0), (1, 0, 0), (0, 0, 1))
    changed = 0
    for _ in range(10):
        pts = prob.init_points(rng, 1, spread=0.9)[0]
        changed += prob.helix_b(np.array([D.rotate(Rq, list(y)) for y in pts])) != prob.helix_b(pts)
    assert changed > 0


# ---------------------------------------------------------------- the tree
def words(L):
    out = [[]]
    for _ in range(L):
        out = [w + [g] for w in out for g in children(w)]
    return out


def test_E1_every_frame_is_an_exact_lorentz_matrix():
    emb = D.TreeEmbedding3D()
    assert (emb.cosh, emb.sinh) == (F(25, 7), F(24, 7)) and math.isclose(emb.tau, math.log(7))
    for L in range(4):
        for w in words(L):
            M = emb.frame_exact(w)
            assert X.is_lorentz(M) and X.on_sheet([row[0] for row in M])


def test_E2_greedy_decoding_returns_every_node():
    emb = D.TreeEmbedding3D()
    for L in range(1, 5):                                 # all 936 nodes to depth 4, exactly
        for w in words(L):
            assert emb.decode_exact(emb.point_exact(w), L) == w
    rng = Rng(9)
    for _ in range(60):                                   # random nodes to depth 9, exactly
        L = 5 + rng.below(5)
        w = D.TreeAddress3D.random_target(rng, L)
        assert emb.decode_exact(emb.point_exact(w), L) == w


def test_E2_control_below_the_threshold_decoding_fails():
    """t = 2/3 < 1/sqrt(2): the theorem's condition fails, and so does decoding, for some nodes at depth 6."""
    emb = D.TreeEmbedding3D(F(2, 3))
    rng = Rng(10)
    bad = sum(emb.decode_exact(emb.point_exact(w), 6) != w for w in (D.TreeAddress3D.random_target(rng, 6) for _ in range(400)))
    assert bad > 0


def test_E2_float_decoding_with_anchors_matches():
    emb = D.TreeEmbedding3D()
    rng = Rng(11)
    for _ in range(200):
        L = 1 + rng.below(8)
        w = D.TreeAddress3D.random_target(rng, L)
        k = max(0, L - 2)
        local = np.eye(4)
        for i in range(k, L):
            local = local @ emb.step[D.slot_direction(w[:i], w[i])]
        assert emb.decode(local[:, 0], L, w[:k]) == w
        if L <= 6:
            assert emb.decode(emb.point(w), L) == w


def test_E3_helix_b_certifies_decoded_words():
    rng = Rng(12)
    for _ in range(40):
        L = 1 + rng.below(7)
        target = D.TreeAddress3D.random_target(rng, L)
        prob = D.TreeAddress3D(L, target)
        cert = prob.helix_b([np.array(prob.emb.point(target))])
        assert cert['certified'] and cert['word'] == target and cert['distance'] == 0


# ---------------------------------------------------------------- the problems
def test_b1_b2_helix_b_agrees_with_the_search_objective():
    rng = Rng(13)
    b1 = D.ThreeColouring3D(45, 4.4, Rng(14))
    b2 = D.MaxSat3D(40, seed=15)
    for _ in range(20):
        p1 = b1.init_points(rng, 1, spread=0.9)
        assert b1(p1)[0] == b1.helix_b(p1[0])
        p2 = b2.init_points(rng, 1, spread=0.9)
        assert round(b2(p2)[0] * len(b2.lits)) == b2.helix_b(p2[0])


def test_b4_nearest_prototype_exact_agrees_off_ties():
    rng = Rng(16)
    for _ in range(200):
        P = [rational_point(rng) for _ in range(8)]
        z = rational_point(rng)
        k = D.nearest_exact(z, P)
        Zf, Pf = np.array(X.to_float(z)), np.array([X.to_float(p) for p in P])
        dd = Zf[0] * Pf[:, 0] - Pf[:, 1:] @ Zf[1:]
        assert int(np.argmin(dd)) == k


def test_version_1_step_and_channels_run_on_the_3d_problems():
    """A smoke run, not a benchmark: three channels of version 1's step on B1, B2 and B3 in H^3."""
    for prob, horizon in ((D.ThreeColouring3D(30, 4.4, Rng(17)), 8.0), (D.MaxSat3D(30, seed=18), 8.0),
                          (D.TreeAddress3D(4, D.TreeAddress3D.random_target(Rng(19), 4)), None)):
        sols, sts = [], []
        for j in range(3):
            sol = PolyStepH(prob, prob.m, prob.d, StepConfig(epsilon=0.3, step_radius=0.8, block=4 if prob.m > 4 else None,
                                                             horizon=horizon), Rng(20 + j))
            X0 = (np.array([[H.from_poincare(np.zeros(3))] for _ in range(3)]) if isinstance(prob, D.TreeAddress3D)
                  else prob.init_points(Rng(30 + j), 3))
            sts.append(sol.init_state(X0))
            sols.append(sol)
        clutch = 'free' if isinstance(prob, D.TreeAddress3D) else 'membrane'
        tc = TriChannel(sols, sts, prob, clutch=clutch, mu=0.3).run(frames=24 * 12)
        X_ = np.stack([st.X for st in tc.states])
        assert np.isfinite(X_).all()
        assert len(tc.memory) == 12
        if isinstance(prob, D.TreeAddress3D):
            assert np.max(np.abs(H.lorentz(X_[..., 0, :], X_[..., 0, :]) + 1)) < 1e-6
