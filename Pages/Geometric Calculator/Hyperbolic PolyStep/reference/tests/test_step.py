"""The properties H1-H7 of the hyperbolic step (Explainer 1, section 7), and parity with polystep itself."""
from fractions import Fraction as F
import math

import numpy as np
import pytest
import torch

from hpstep import Rng, PolyStepH, StepConfig
from hpstep import hyperbolic as H
from hpstep import exact as X


def random_sheet_point(rng, d, rad=0.7):
    z = np.array([rad * (2 * rng.random() - 1) for _ in range(d)]) / math.sqrt(d)
    return H.from_poincare(z)


def bowl(target):
    """A smooth objective on H^d: the squared distance to a target (used where weights must vary smoothly)."""
    def f(pts):
        return H.dist(pts[..., 0, :], target) ** 2
    return f


def staircase(target):
    def f(pts):
        return np.floor(4 * H.dist(pts[..., 0, :], target)) / 4
    return f


# ---------------------------------------------------------------- H1
@pytest.mark.parametrize('d', [2, 3])
def test_H1_single_factor_exact(d):
    """One factor, exact Cayley rotation, rational t: every corner, probe and snapped state lies exactly on the sheet."""
    rng = Rng(100 + d)
    for trial in range(600 if d == 2 else 400):
        target = random_sheet_point(rng, d)
        cfg = StepConfig(epsilon=0.3, step_radius=0.2 + rng.random(), rotation='cayley_exact', exact=True, num_probe=2)
        s = PolyStepH(staircase(target), 1, d, cfg, rng)
        st = s.init_state(random_sheet_point(rng, d)[None, None, :].repeat(2, axis=0))
        for _ in range(2):
            info = s.step(st, record=True)
            for row in info['exact_corners']:
                for corner in row:
                    assert X.on_sheet(corner[0])
            for row in st.Xq:
                assert X.on_sheet(row[0])
            assert info['snap_max'] < 1e-5


def test_H1_product_snapped():
    """In a product step each moved factor is snapped, so corners and states are still exact sheet points."""
    rng = Rng(7)
    target = random_sheet_point(rng, 2)
    f = lambda pts: H.dist(pts[..., 0, :], target) + H.dist(pts[..., 1, :], target)
    cfg = StepConfig(epsilon=0.3, step_radius=0.5, exact=True)
    s = PolyStepH(f, 3, 2, cfg, rng)
    X0 = np.array([[random_sheet_point(rng, 2) for _ in range(3)] for _ in range(2)])
    st = s.init_state(X0)
    for _ in range(3):
        info = s.step(st, record=True)
        assert all(X.on_sheet(y) for row in info['exact_corners'] for c in row for y in c)
        assert all(X.on_sheet(y) for row in st.Xq for y in row)


# ---------------------------------------------------------------- H2
def test_H2_single_factor_moves_at_most_r():
    rng = Rng(2)
    worst = 0.0
    for trial in range(1000):
        d = 2 + trial % 4
        target = random_sheet_point(rng, d, 0.95)
        r = 0.05 + 2.5 * rng.random()
        eps = 10 ** (-3 + 4 * rng.random())
        cfg = StepConfig(epsilon=eps, step_radius=r, solver='softmax' if trial % 2 else 'sinkhorn')
        s = PolyStepH(staircase(target), 1, d, cfg, rng)
        st = s.init_state(np.array([[random_sheet_point(rng, d, 0.95)] for _ in range(3)]))
        info = s.step(st)
        worst = max(worst, float(np.max(info['product_move'] / r)))
        assert np.all(info['product_move'] <= r * (1 + 1e-9) + 1e-12)
    assert worst <= 1 + 1e-9


def test_H2_products_each_factor_moves_at_most_r():
    """In a product each factor moves at most r (its corners are within r of it, and its centroid is a Klein
    convex combination of them)."""
    rng = Rng(3)
    for trial in range(300):
        m, d = 2 + trial % 3, 2
        tg = [random_sheet_point(rng, d) for _ in range(m)]
        f = lambda pts: sum(np.floor(3 * H.dist(pts[..., i, :], tg[i])) for i in range(m))
        r = 0.1 + 2 * rng.random()
        s = PolyStepH(f, m, d, StepConfig(epsilon=10 ** (-2 + 3 * rng.random()), step_radius=r), rng)
        st = s.init_state(np.array([[random_sheet_point(rng, d) for _ in range(m)] for _ in range(2)]))
        X0 = st.X.copy()
        s.step(st)
        assert np.all(H.dist(X0, st.X) <= r * (1 + 1e-9) + 1e-12)


def test_horizon_projection_keeps_H2_and_the_direction():
    """A centroid beyond the horizon is pulled radially back onto it: still on the sheet, never farther from the
    step's start than before, and in the same direction from the origin (so angle and sign decoders agree)."""
    rng = Rng(12)
    for trial in range(300):
        d = 2 + trial % 3
        x = H.exp_origin(np.array([2 * rng.random() - 1 for _ in range(d)]) * 7.9 / math.sqrt(d) * 1.0)
        far = H.exp_at(x, np.array([2 * rng.random() - 1 for _ in range(d)]) * 3)
        s = PolyStepH(lambda p: 0, 1, d, StepConfig(horizon=8.0), rng)
        Xs = far[None, None, :].copy()
        s.clamp(Xs, [0])
        y = Xs[0, 0]
        assert abs(H.lorentz(y, y) + 1) < 1e-8 and np.arccosh(y[0]) <= 8.0 + 1e-9
        assert np.allclose(y[1:] / np.linalg.norm(y[1:]), far[1:] / np.linalg.norm(far[1:]))
        if np.arccosh(x[0]) <= 8.0:
            assert H.dist(x, y) <= H.dist(x, far) + 1e-9


# ---------------------------------------------------------------- H3
def test_H3_centroid_minimises_weighted_lorentzian_distance():
    rng = Rng(4)
    for trial in range(1000):
        d = 2 + trial % 3
        V = np.array([random_sheet_point(rng, d, 0.9) for _ in range(5)])
        w = np.array([rng.random() + 1e-3 for _ in range(5)])
        w /= w.sum()
        c = H.lorentz_centroid(V, w)
        obj = lambda y: float(np.sum(w * (-2 - 2 * H.lorentz(y[None, :], V))))
        base = obj(c)
        for _ in range(20):
            u = np.array([2 * rng.random() - 1 for _ in range(d)])
            y = H.exp_at(c, 1e-3 * u)
            assert obj(y) >= base - 1e-12


# ---------------------------------------------------------------- H4
def rational_lorentz(rng, d):
    """A rational Lorentz map: a boost to a rational point of the sheet, times a Cayley rotation."""
    p = [F(rng.randint(-40, 40), 100) / d for _ in range(d)]
    B = X.boost(X.ghost(p))
    Rq = X.random_rotation(rng, d)
    Rot = [[F(1)] + [F(0)] * d] + [[F(0)] + row for row in Rq]
    return X.matmul(B, Rot)


def test_H4_equivariance():
    """With the frame carried along (Q = L_gx^-1 g L_x), the corners at gx are exactly g times the corners at x,
    and the step at gx is g times the step at x."""
    rng = Rng(5)
    for trial in range(1000):
        d = 2 + trial % 2
        g = rational_lorentz(rng, d)
        assert X.is_lorentz(g)
        xq = X.ghost([F(rng.randint(-30, 30), 100) / d for _ in range(d)])
        gx = X.matvec(g, xq)
        Q = X.matmul(X.matmul(X.lorentz_inverse(X.boost(gx)), g), X.boost(xq))
        assert Q[0][0] == 1 and all(Q[0][i] == 0 and Q[i][0] == 0 for i in range(1, d + 1))
        Qr = [row[1:] for row in Q[1:]]
        assert X.is_orthogonal(Qr)
        Rq = X.random_rotation(rng, d)
        QRq = X.matmul(Qr, Rq)
        t = F(1, 3)
        for u, v in zip(X.orthoplex_directions(Rq), X.orthoplex_directions(QRq)):
            assert X.matvec(g, X.point_at(xq, t, u)) == X.point_at(gx, t, v)      # exact
        gf = np.array([[float(v) for v in row] for row in g])
        target = random_sheet_point(rng, d)
        f = bowl(target)
        gtarget = gf @ target
        fg = bowl(gtarget)                                                          # f o g^-1
        cfg = StepConfig(epsilon=0.4, step_radius=0.7)
        s1, s2 = PolyStepH(f, 1, d, cfg, rng), PolyStepH(fg, 1, d, cfg, rng)
        R1 = np.array([[[float(v) for v in row] for row in Rq]])
        R2 = np.array([[[float(v) for v in row] for row in QRq]])
        s1.fixed_R, s2.fixed_R = (R1, None), (R2, None)
        x = np.array([float(v) for v in xq])
        st1, st2 = s1.init_state(x[None, None]), s2.init_state((gf @ x)[None, None])
        s1.step(st1)
        s2.step(st2)
        assert np.allclose(gf @ st1.X[0, 0], st2.X[0, 0], atol=1e-9)


# ---------------------------------------------------------------- H5
def test_H5_flat_limit_is_polystep_step():
    """At curvature -c, in the Klein chart scaled by 1/sqrt(c), the step tends to the flat step as c -> 0."""
    rng = Rng(6)
    d, r, eps = 3, 0.4, 0.5
    z0 = np.array([0.3, -0.2, 0.1])
    zt = np.array([1.0, 0.5, -0.4])
    fz = lambda z: np.sum((z - zt) ** 2, axis=-1)
    R = X.random_rotation(rng, d)
    Rf = np.array([[[float(v) for v in row] for row in R]])
    flat = PolyStepH(lambda pts: fz(pts[..., 0, :]), 1, d, StepConfig(epsilon=eps, step_radius=r, geometry='flat'), rng)
    flat.fixed_R = (Rf, None)
    stf = flat.init_state(z0[None, None])
    flat.step(stf)
    errs = []
    for c in [1e-2, 1e-3, 1e-4, 1e-5]:
        sc = math.sqrt(c)
        f = lambda pts, sc=sc: fz(H.to_klein(pts[..., 0, :]) / sc)
        hs = PolyStepH(f, 1, d, StepConfig(epsilon=eps, step_radius=sc * r), rng)
        hs.fixed_R = (Rf, None)
        sth = hs.init_state(H.from_klein(sc * z0)[None, None])
        hs.step(sth)
        errs.append(float(np.linalg.norm(H.to_klein(sth.X[0, 0]) / sc - stf.X[0, 0])))
    assert errs[-1] < 1e-4
    assert all(errs[i + 1] < errs[i] / 5 for i in range(len(errs) - 1)), errs


# ---------------------------------------------------------------- H6
@pytest.mark.filterwarnings("ignore:SoftmaxSolver epsilon")
def test_H6_small_epsilon_picks_best_corner_and_incumbent_never_rises():
    rng = Rng(8)
    for trial in range(1000):
        d = 2 + trial % 3
        target = random_sheet_point(rng, d, 0.9)
        s = PolyStepH(bowl(target), 1, d, StepConfig(epsilon=1e-9, step_radius=0.5), rng)
        st = s.init_state(random_sheet_point(rng, d)[None, None])
        info = s.step(st, record=True)
        k = int(np.argmin(info['C'][0]))
        assert np.allclose(st.X[0, 0], info['corners'][0, k, 0], atol=1e-9)
    s = PolyStepH(staircase(random_sheet_point(rng, 3)), 1, 3, StepConfig(epsilon=0.8, step_radius=0.6), rng)
    st = s.init_state(np.array([[random_sheet_point(rng, 3)] for _ in range(4)]))
    prev = None
    for _ in range(40):
        s.step(st)
        if prev is not None:
            assert np.all(st.best_cost <= prev)
        prev = st.best_cost.copy()


# ---------------------------------------------------------------- H7 (the pump in the Lorentz group)
@pytest.mark.parametrize('chain', range(50))
def test_H7_pump_on_rational_lorentz_increments(chain):
    """50 random registers, each with 30 rational Lorentz steps at a channel's offload frames (d = 2 and 3)."""
    rng = Rng(900 + chain)
    d = 2 + chain % 2
    one = X.eye(d + 1)
    xs = [X.ghost([F(rng.randint(-50, 50), 97 * d) for _ in range(d)]) for _ in range(31)]
    dq = [None] * 720
    for k in range(30):                                   # 30 steps in a register, as a channel takes
        dq[24 * k + 6] = X.displacement(xs[k], xs[k + 1])
    dq = [x if x is not None else one for x in dq]
    r = X.pump(dq, X.matmul, X.lorentz_inverse, one)
    assert r['Q10'] == r['Pinv'] and r['Q8'] == r['Pinv'] and r['H'] == r['Pinv']
    assert X.matvec(r['P'], xs[0]) == xs[30]               # the open product carries the start to the end
    assert all(X.is_lorentz(x) for x in dq[6::24])
    assert X.inner_block_sizes() == [8, 7, 7, 7, 7, 8, 7, 7, 7, 7]


# ---------------------------------------------------------------- parity with polystep
def test_weights_are_polystep_softmax():
    rng = Rng(10)
    C = np.array([[rng.random() for _ in range(8)] for _ in range(3)])
    s = PolyStepH(lambda p: 0, 1, 4, StepConfig(), rng)
    W = s.weights(C, 0.3)
    E = np.exp(-(C - C.min(axis=1, keepdims=True)) / 0.3)
    assert np.allclose(W, E / E.sum(axis=1, keepdims=True), atol=1e-14)


@pytest.mark.parametrize('solver', ['softmax', 'sinkhorn'])
def test_flat_step_equals_polystep_step(solver, monkeypatch):
    """The curvature-0 step, given polystep's own rotation, lands where polystep's PolyStep.step lands."""
    import polystep.solver as ps
    from polystep.solver import PolyStep
    from polystep.solvers import SoftmaxSolver
    d, P = 5, 3
    rng = Rng(11)
    R = torch.tensor(np.array([[[float(v) for v in row] for row in X.random_rotation(rng, d)] for _ in range(P)]))
    monkeypatch.setattr(ps, 'get_random_rotation_matrices', lambda *a, **k: R.clone())
    zt = torch.tensor([0.5, -1.0, 2.0, 0.0, 1.0], dtype=torch.float64)
    obj = lambda Z: ((Z - zt) ** 2).sum(-1).floor()
    X0 = torch.tensor([[2 * rng.random() - 1 for _ in range(d)] for _ in range(P)], dtype=torch.float64)
    eps = 0.3
    poly = PolyStep(objective_fn=obj, dim=d, epsilon=eps, step_radius=1.0, probe_radius=2.0, num_probe=1)
    if solver == 'softmax':
        poly.sinkhorn_solver = SoftmaxSolver(epsilon=eps)
    st = poly.init_state(X0)
    poly.step(st)
    ours = PolyStepH(lambda pts: obj(torch.as_tensor(pts[..., 0, :])).numpy(), 1, d,
                     StepConfig(epsilon=eps, step_radius=1.0 * eps, probe_radius=2.0 * eps, geometry='flat', solver=solver), rng)
    ours.fixed_R = (R.numpy(), None)
    so = ours.init_state(X0.numpy()[:, None, :])
    ours.step(so)
    assert np.allclose(so.X[:, 0, :], st.X.numpy(), atol=1e-9)
