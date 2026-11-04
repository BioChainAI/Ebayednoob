"""The coupler (mechanics of claim E5) and the gauge and lock (claim E6), with their controls."""
from fractions import Fraction

from engram import dialogue as Dg
from engram import orbital as O
from engram.clock import membrane_turn
from engram.session import Session


def test_k1_binding_holds_at_every_zero_point():
    run = Session(Dg.golden_session(), coupler='carry')
    assert run.b_checks and all(run.b_checks)
    run = Session(Dg.synthetic(9002), coupler='carry')
    assert run.b_checks and all(run.b_checks)


def test_k2_carry_is_bit_identical_to_no_coupler():
    turns = Dg.synthetic(9003)
    assert Session(turns, coupler='carry').outputs() == Session(turns).outputs()


def test_control_same_chirality_changes_the_binding():
    run = Session(Dg.synthetic(9004), coupler='same')
    assert not all(run.b_checks)


def test_gauge_recovers_and_zero_iff_equal():
    for a in range(0, 65, 4):
        for b in range(0, 65, 4):
            for c in range(0, 65, 4):
                g = O.gauge_exact(Fraction(a), Fraction(b), Fraction(c))
                assert g['recovered']
                assert (g['X'] == 0 and g['Yc'] == 0) == (a == b == c)


def test_control_wrong_gauge_fails_to_recover():
    def wrong(a, b, c):
        s, X, Yc = a + b + c, a - (b + c) / 2, b + c
        a2 = (s + 2 * X) / 3
        b2 = (s - a2 + Yc) / 2
        return b2 == b
    assert not all(wrong(Fraction(a), Fraction(b), Fraction(c)) for a in range(5) for b in range(5) for c in range(5))


def test_lock_iff_equal():
    turns = [membrane_turn()] * 3
    for x in range(0, 65, 9):
        assert O.readout([Fraction(x)] * 3, turns)['T']['lock']
    for t in [(1, 2, 3), (30, 29, 0), (32, 32, 33), (0, 0, 64)]:
        assert not O.readout([Fraction(v) for v in t], turns)['T']['lock']
