"""The clock and the register (mechanics of claim E4) with both controls."""
# Unit tests use seeds outside the registered instances (9000 and up), so they never touch what run_claims.py decides.
from engram import dialogue as Dg
from engram import orbital as O
from engram.clock import schedule, place, zero_points, registers, telescopes, engagement, membrane_turn
from engram.session import Session


def test_schedule_follows_the_zero_point_clock():
    s = schedule(30)
    for e in s:
        assert e['on'] % 24 == O.ON[e['channel']] and e['off'] % 24 == O.OFF[e['channel']]
        assert e['off'] - e['on'] == 12
    assert [e['on'] for e in s] == sorted(e['on'] for e in s)          # first in, first out
    assert [e['off'] for e in s] == sorted(e['off'] for e in s)


def test_place_and_groups():
    assert place(1) == (0, 0, 0) and place(720) == (0, 71, 9) and place(721) == (1, 0, 0)
    sizes = [sum(1 for m in range(72) if (10 * m) // 72 == l) for l in range(10)]
    assert sizes == [8, 7, 7, 7, 7, 8, 7, 7, 7, 7]


def test_words_are_the_last_three_latched_in_order():
    s = schedule(20)
    for z in zero_points(s):
        latched = [e['token'] for e in s if e['off'] <= z['F']]
        assert z['tokens'] == latched[-3:] and z['F'] % 24 == 0


def test_registers_telescope_and_the_controls_break_it():
    run = Session(Dg.synthetic(9000))
    complete = [R for R in run.registers if R['complete']]
    assert complete and all(telescopes(R) for R in complete)
    R = complete[0]
    nz = [m for m, b in enumerate(R['block_q']) if b != (1, 0, 0, 0)]
    swapped = R['block_q'][:]
    swapped[nz[0]], swapped[nz[5]] = swapped[nz[5]], swapped[nz[0]]
    assert not telescopes(R, blocks=swapped)
    replaced = R['block_q'][:]
    other = run.quats[-1]
    replaced[nz[3]] = other
    assert not telescopes(R, blocks=replaced)


def test_free_run_closes_every_register_and_hold_leaves_half_a_turn():
    run = Session(Dg.synthetic(9001))
    for R in [R for R in run.registers if R['complete']]:
        free = engagement(run.sched, R['r'], 'free')
        assert all(p['closed'] and p['identity'] for p in free)
        hold = engagement(run.sched, R['r'], 'hold')
        assert all(p['identity'] for p in hold)
        if R['r'] > 0:                                     # in register 0 no flight is under way at frame 1
            assert all(p['P'] == 360 and p['H'] == 360 for p in hold)


def test_membrane_turn():
    from fractions import Fraction
    assert membrane_turn() == Fraction(13, 675)
