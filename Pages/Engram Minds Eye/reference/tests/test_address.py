"""The address and the chain quaternion (mechanics of claim E2) with both controls."""
from hpstep.prng import Rng
from hpstep.problems import INV, is_reduced, word_quaternion

from engram import address as A


def rand64(rng):
    return (rng.next_u32() << 32) | rng.next_u32()


def test_single_packet_round_trip_and_norm():
    rng = Rng(1)
    for _ in range(300):
        v = rand64(rng)
        w = A.encode(v)
        assert len(w) == A.L and is_reduced(w)
        q = word_quaternion(w)
        assert A.norm(q) == 5 ** A.L
        assert A.unfold(q, 1) == [v]
    for v in (0, 1, 2 ** 64 - 1):
        assert A.unfold(A.chain_quaternion([v]), 1) == [v]


def test_chain_unfolds_in_order():
    rng = Rng(2)
    for K in (2, 10, 40):
        vals = [rand64(rng) for _ in range(K)]
        q = A.chain_quaternion(vals)
        assert A.norm(q) == 5 ** (A.L * K)
        assert is_reduced(A.chain_word(vals))
        assert A.unfold(q, K) == vals


def test_packet_quaternions_multiply_to_the_chain():
    rng = Rng(3)
    vals = [rand64(rng) for _ in range(12)]
    assert A.qprod(A.packet_quaternions(vals)) == A.chain_quaternion(vals)


def test_control_a_backtracking_packet_breaks_recovery():
    rng = Rng(4)
    vals = [rand64(rng) for _ in range(5)]
    w = A.chain_word(vals)
    bad = [INV[w[-1]]] + A.encode(rand64(rng), [INV[w[-1]]])[:A.L - 1]      # first letter undoes the last one
    q = word_quaternion(w + bad)
    assert A.unfold(q, 6) is None


def test_control_b_swapping_two_packets_changes_the_quaternion():
    rng = Rng(5)
    vals = [rand64(rng) for _ in range(6)]
    swapped = vals[:]
    swapped[1], swapped[4] = swapped[4], swapped[1]
    assert A.chain_quaternion(vals) != A.chain_quaternion(swapped)
