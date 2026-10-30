"""Version 2, phases B-D: frames and their transport (F1, F2), the coupler and the twin system (K1-K3)."""
from fractions import Fraction as F
import math

import numpy as np

from hpstep import Rng, PolyStepH, StepConfig, TriChannel
from hpstep import decode3d as D
from hpstep import exact as X
from hpstep import frames3d as Fr
from hpstep import twin3d as T


def rational_point(rng, K=1024, r=0.9):
    while True:
        p = [F(rng.randint(-K + 1, K - 1), K) for _ in range(3)]
        if sum(c * c for c in p) < r * r:
            return X.ghost(p)


def structure(seed, exact, n=9, P=1, block=1, problem='b1'):
    prob = D.ThreeColouring3D(n, 4.4, Rng(seed)) if problem == 'b1' else D.MaxSat3D(n, seed=seed, source='xoshiro')
    sols, sts = [], []
    for j in range(3):
        cfg = StepConfig(epsilon=0.5, step_radius=0.6, block=block, exact=exact, rotation='cayley_exact' if exact else 'cayley')
        sol = PolyStepH(prob, prob.m, prob.d, cfg, Rng(seed * 10 + j))
        sts.append(sol.init_state(prob.init_points(Rng(seed * 10 + 5 + j), P)))
        sols.append(sol)
    return TriChannel(sols, sts, prob, clutch='membrane', mu=0.3, exact_register=exact)


# ---------------------------------------------------------------- frames
def test_F1_transport_is_exact_and_the_twist_is_a_rational_rotation():
    rng = Rng(1)
    for _ in range(60):
        x, y = rational_point(rng), rational_point(rng)
        Tm = Fr.transvection(x, y)
        assert X.is_lorentz(Tm) and X.matvec(Tm, x) == y
        W = Fr.twist(x, y, exact=True)
        assert X.is_identity(X.matmul(X.transpose(W), W))
        det = (W[0][0] * (W[1][1] * W[2][2] - W[1][2] * W[2][1]) - W[0][1] * (W[1][0] * W[2][2] - W[1][2] * W[2][0])
               + W[0][2] * (W[1][0] * W[2][1] - W[1][1] * W[2][0]))
        assert det == 1
        q = Fr.quat_of_rot(W, exact=True)
        assert q[0] > 0 and Fr.rot_of_quat(q) == W
        Wf = Fr.twist(X.to_float(x), X.to_float(y))
        assert max(abs(a - float(b)) for ra, rb in zip(Wf, W) for a, b in zip(ra, rb)) < 1e-11


def test_F2_the_twist_angle_is_the_triangle_area():
    rng = Rng(2)
    for _ in range(200):
        x, y = rational_point(rng), rational_point(rng)
        ang = Fr.quat_angle(Fr.twist_quat(x, y, exact=True))
        assert abs(ang - Fr.triangle_area(X.to_float(x), X.to_float(y))) < 1e-9
    # control: the area of a different triangle does not match
    x, y, z = rational_point(rng), rational_point(rng), rational_point(rng)
    assert abs(Fr.quat_angle(Fr.twist_quat(x, y, exact=True)) - Fr.triangle_area(X.to_float(x), X.to_float(z))) > 1e-6


def test_quaternions_keep_the_spin_that_matrices_lose():
    """A long chain of exact twists: the composed quaternion's rotation is the product of the twist matrices,
    exactly, and its sign records the spin."""
    rng = Rng(3)
    q, M = (1, 0, 0, 0), [[F(int(i == j)) for j in range(3)] for i in range(3)]
    x = rational_point(rng)
    for _ in range(40):
        y = rational_point(rng)
        W = Fr.twist(x, y, exact=True)
        q = Fr.qnorm_exact(Fr.qmul(Fr.quat_of_rot(W, exact=True), q))
        M = X.matmul(W, M)
        x = y
    assert Fr.rot_of_quat(q) == M
    assert Fr.rot_of_quat(tuple(-c for c in q)) == M      # q and -q: the same rotation, opposite spin


# ---------------------------------------------------------------- the coupler
def test_K1_the_binding_is_conserved_exactly_in_carry_and_steer():
    for mode in ('carry', 'steer'):
        tw = T.TwinSystem(structure(11, True), structure(12, True), mode=mode, exact=True).run(24 * 10)
        assert tw.coupler.issued[0] > 0 and tw.coupler.issued[1] > 0
        assert all(w['bound'] == w['pairs'] for w in tw.coupler.memory)


def test_K1_control_without_the_mirror_the_binding_breaks():
    tw = T.TwinSystem(structure(11, True), structure(12, True), mode='carry', exact=True)
    tw.coupler.chirality = 'same'
    tw.run(24 * 4)
    assert any(w['bound'] < w['pairs'] for w in tw.coupler.memory)


def test_K1_float_binding_holds_to_rounding():
    tw = T.TwinSystem(structure(21, False, n=30, P=4, block=8), structure(22, False, n=30, P=4, block=8), mode='steer').run(24 * 15)
    last = tw.coupler.memory[-1]
    assert last['bound'] == last['pairs'] and last['worst'] < 1e-12


def test_K2_carry_is_bit_identical_to_no_coupler():
    off = T.TwinSystem(structure(21, False, n=30, P=4, block=8), structure(22, False, n=30, P=4, block=8), 'off').run(24 * 12)
    car = T.TwinSystem(structure(21, False, n=30, P=4, block=8), structure(22, False, n=30, P=4, block=8), 'carry').run(24 * 12)
    for s in range(2):
        for a, b in zip(off.tcs[s].states, car.tcs[s].states):
            assert np.array_equal(a.X, b.X) and np.array_equal(a.best_X, b.best_X)
        assert [w['hash'] for w in off.tcs[s].memory] == [w['hash'] for w in car.tcs[s].memory]
    # control: steer does change the six calculations
    ste = T.TwinSystem(structure(21, False, n=30, P=4, block=8), structure(22, False, n=30, P=4, block=8), 'steer').run(24 * 12)
    assert any(not np.array_equal(a.X, b.X) for s in range(2) for a, b in zip(off.tcs[s].states, ste.tcs[s].states))


def test_K2_carry_is_bit_identical_on_the_exact_track_too():
    off = T.TwinSystem(structure(11, True), structure(12, True), 'off', exact=True).run(24 * 6)
    car = T.TwinSystem(structure(11, True), structure(12, True), 'carry', exact=True).run(24 * 6)
    for s in range(2):
        assert [st.Xq for st in off.tcs[s].states] == [st.Xq for st in car.tcs[s].states]


def test_K3_in_steer_mode_every_register_still_closes():
    tw = T.TwinSystem(structure(11, True), structure(12, True), mode='steer', exact=True).run(720)
    regs = [r for tc in tw.tcs for r in tc.registers]
    assert len(regs) == 2 and all(r['pump_identity'] for r in regs)
    for tc in tw.tcs:                                     # every state still an exact point of the sheet
        assert all(X.on_sheet(y) for st in tc.states for row in st.Xq for y in row)


def test_steer_frames_are_exact_rotations_of_the_polytope():
    tw = T.TwinSystem(structure(11, True), structure(12, True), mode='steer', exact=True).run(24 * 3)
    hook = tw.coupler.orient(0, 0)
    Rq = [X.random_rotation(Rng(5), 3)]
    R = np.array([[[float(v) for v in row] for row in Rq[0]]])
    Rn, Rqn = hook([0], R, Rq)
    assert X.is_orthogonal(Rqn[0])


def test_the_twin_runs_maxsat_in_h3():
    tw = T.TwinSystem(structure(31, False, n=30, P=3, block=4, problem='b2'), structure(32, False, n=30, P=3, block=4, problem='b2'), 'steer').run(24 * 6)
    assert len(tw.coupler.memory) == 6 and tw.coupler.memory[-1]['bound'] == tw.coupler.memory[-1]['pairs']
