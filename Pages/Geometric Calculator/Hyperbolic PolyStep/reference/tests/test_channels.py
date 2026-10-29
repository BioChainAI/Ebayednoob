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
