"""Three channels on the zero-point clock: the schedule, the budget, the clutch modes and the exact register."""
import numpy as np

from hpstep import Rng, PolyStepH, StepConfig, TriChannel
from hpstep.channels import schedule_facts
from hpstep.problems import ThreeColouring


def make(n=12, clutch='membrane', exact=False, P=2, block=None, seed=0):
    prob = ThreeColouring(n, 4.4, Rng(1000 + seed))
    sols, sts = [], []
    for j in range(3):
        cfg = StepConfig(epsilon=0.5, step_radius=0.6, block=block, exact=exact,
                         rotation='cayley_exact' if exact and block == 1 else 'cayley')
        s = PolyStepH(prob, prob.m, 2, cfg, Rng(10 + j + seed))
        sts.append(s.init_state(prob.init_points(Rng(20 + j + seed), P)))
        sols.append(s)
    return TriChannel(sols, sts, prob, clutch=clutch, exact_register=exact), prob


def test_schedule_is_proposition_3_7():
    f = schedule_facts()
    assert f['onload_k'] == [2, 2, 2] and f['offload_k'] == [6, 6, 6]
    assert f['onload_branch'] == [0, 1, 2] and f['delay'] == [12, 12, 12]
    assert f['disjoint'] and f['max_in_flight'] == 2 and f['onloads'] == [2, 10, 18]


def test_thirty_steps_per_channel_per_register_and_the_budget():
    tc, prob = make(clutch='free')
    tc.run(frames=720)
    assert [st.iteration for st in tc.states] == [30, 30, 30]
    D = 2 * prob.m
    assert tc.evaluations == 3 * 30 * 2 * (2 * D)          # channels x steps x particles x corners
    assert len(tc.memory) == 30 and all(len(w['costs']) == 3 for w in tc.memory)
    assert all(w['Y'] == sum(w['costs']) for w in tc.memory)


def test_hold_rests_a_stalled_channel_and_never_all_three():
    tc, _ = make(clutch='hold')
    tc.patience = 1
    seen = []
    tc.run(frames=24 * 40, on_zero=lambda t, c, b: seen.append(tuple(t.resting)))
    assert any(any(r) for r in seen)
    assert not any(all(r) for r in seen)


def test_membrane_logs_the_differential():
    tc, _ = make(clutch='membrane')
    tc.run(frames=24 * 10)
    assert len(tc.membrane_log) == 10 and all(m['differential_removed'] >= 0 for m in tc.membrane_log)


def test_H7_exact_register_closes_with_the_pump_identity():
    """Exact states, one factor per step: every change is a rational Lorentz map and each register's pump gives
    Q10 = Q8 = H = P^-1 exactly, with P carrying the register's first state to its last."""
    tc, _ = make(n=9, clutch='membrane', exact=True, P=1, block=1)
    tc.run(frames=1440)
    assert [r['pump_identity'] for r in tc.registers] == [True, True]


def test_batched_membrane_is_the_factor_loop():
    """Float runs move all factors at once; one membrane must give the factor-by-factor loop's result, to rounding.
    (Over a whole run the two drift apart, as any two orders of float operations do in a chaotic search.) Checked on
    B1 states that reach the horizon, on B2's factors of H^8, and on B4's mixed product with Euclidean factors."""
    import copy
    from hpstep import problems as PB
    for prob, P, init in ((ThreeColouring(30, 4.4, Rng(5)), 4, {'spread': 0.69}),
                          (PB.MaxSat(100, seed=1000), 4, {}),
                          (PB.HardThresholdNet(PB.hierarchical_data(Rng(6), n_train=50, n_test=20), Rng(7)), 3, {})):
        flat = getattr(prob, 'flat_factors', ())
        sols, sts = [], []
        for j in range(3):
            cfg = StepConfig(epsilon=0.3, step_radius=1.5, block=None, flat_factors=flat)
            sol = PolyStepH(prob, prob.m, prob.d, cfg, Rng(70 + j))
            sts.append(sol.init_state(prob.init_points(Rng(80 + j), P, **init)))
            sols.append(sol)
        tc = TriChannel(sols, sts, prob, clutch='free', mu=0.6)
        tc.run(frames=24 * 5)                                     # rich states, some on the horizon
        certs = [tc.certify(j) for j in range(3)]
        results = []
        for batched in (True, False):
            t2 = copy.deepcopy(tc)
            t2.clutch, t2.batched_membrane = 'membrane', batched
            t2.membrane(certs)
            results.append((np.stack([st.X for st in t2.states]), t2.membrane_log[-1]['differential_removed']))
        a, b = results
        assert np.isfinite(a[0]).all() and np.isfinite(b[0]).all()
        assert np.max(np.abs(a[0] - b[0]) / np.maximum(1, np.abs(b[0]))) < 1e-10
        assert abs(a[1] - b[1]) <= 1e-12 * max(1.0, b[1])


def test_membrane_keeps_float_states_on_the_sheet():
    """Amendment 3: near the horizon, rounding in the membrane's rigid motions used to compound until states left the
    sheet and turned to NaN (found in B1 at n = 300). Every float state must stay on the sheet over a long run."""
    from hpstep import hyperbolic as H
    prob = ThreeColouring(60, 4.4, Rng(3))
    sols, sts = [], []
    for j in range(3):
        sol = PolyStepH(prob, prob.m, prob.d, StepConfig(epsilon=0.03, step_radius=1.0, block=8), Rng(90 + j))
        sts.append(sol.init_state(prob.init_points(Rng(95 + j), 4, spread=0.69)))
        sols.append(sol)
    tc = TriChannel(sols, sts, prob, clutch='membrane', mu=0.6).run(frames=24 * 150)
    X = np.concatenate([st.X.reshape(-1, 3) for st in tc.states])
    assert np.isfinite(X).all()
    assert np.max(np.abs(H.lorentz(X, X) + 1)) < 1e-6
