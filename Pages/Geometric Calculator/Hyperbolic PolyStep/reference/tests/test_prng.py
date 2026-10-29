"""The shared generator: the published xoshiro128** vector, seeding, and the derived draws."""
from hpstep.prng import Rng, splitmix32


def test_published_vector():
    # Blackman and Vigna's reference xoshiro128** from state (1, 2, 3, 4)
    r = Rng(state=(1, 2, 3, 4))
    assert [r.next_u32() for _ in range(10)] == [11520, 0, 5927040, 70819200, 2031721883, 1637235492, 1287239034,
                                                 3734860849, 3729100597, 4258142804]


def test_seeding_is_deterministic_and_documented():
    a, b = Rng(42), Rng(42)
    assert [a.next_u32() for _ in range(5)] == [b.next_u32() for _ in range(5)]
    sm = splitmix32(42)
    assert Rng(42).s != [0, 0, 0, 0] and Rng(42).s == [next(sm) for _ in range(4)]


def test_draws():
    r = Rng(1)
    xs = [r.random() for _ in range(2000)]
    assert all(0 <= x < 1 for x in xs) and 0.45 < sum(xs) / len(xs) < 0.55
    assert sorted(set(r.below(7) for _ in range(500))) == list(range(7))
    s = r.sample(50, 20)
    assert len(set(s)) == 20 and all(0 <= v < 50 for v in s)
    q = r.rational(4)
    assert q.denominator in (1, 2, 4) and -1 <= q <= 1
