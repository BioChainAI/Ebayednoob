"""The shared random generator: xoshiro128** seeded by splitmix32.

The browser core implements the same two functions bit for bit, so a seed gives the same rotations, instances
and traces in both languages. Neither torch's generator nor Python's `random` is used on a traced path.

xoshiro128** is Blackman and Vigna's 32-bit generator. With state (1, 2, 3, 4) its first outputs are the
published test vector checked in tests/test_prng.py.
"""
from fractions import Fraction

MASK = 0xFFFFFFFF


def _rotl(x, k):
    return ((x << k) | (x >> (32 - k))) & MASK


def splitmix32(seed):
    """Yield the splitmix32 sequence from a 32-bit seed (state advances by the golden-ratio constant)."""
    state = seed & MASK
    while True:
        state = (state + 0x9E3779B9) & MASK
        z = state
        z = ((z ^ (z >> 16)) * 0x85EBCA6B) & MASK
        z = ((z ^ (z >> 13)) * 0xC2B2AE35) & MASK
        yield z ^ (z >> 16)


class Rng:
    """xoshiro128**. `Rng(seed)` fills the state from splitmix32(seed); `Rng(state=(a, b, c, d))` sets it."""

    def __init__(self, seed=0, state=None):
        if state is None:
            sm = splitmix32(seed)
            state = [next(sm) for _ in range(4)]
        self.s = [x & MASK for x in state]
        if not any(self.s):
            raise ValueError("xoshiro128** state must not be all zero")

    def next_u32(self):
        s = self.s
        result = (_rotl((s[1] * 5) & MASK, 7) * 9) & MASK
        t = (s[1] << 9) & MASK
        s[2] ^= s[0]
        s[3] ^= s[1]
        s[1] ^= s[2]
        s[0] ^= s[3]
        s[2] ^= t
        s[3] = _rotl(s[3], 11)
        return result

    def random(self):
        """A float in [0, 1) with 53 random bits (two outputs: 27 + 26 bits)."""
        a = self.next_u32() >> 5
        b = self.next_u32() >> 6
        return (a * 67108864 + b) / 9007199254740992

    def below(self, n):
        """An integer in [0, n), unbiased (rejection on the 32-bit output)."""
        if not 0 < n <= 2 ** 32:
            raise ValueError("n must be in 1 .. 2^32")
        limit = (2 ** 32) - (2 ** 32) % n
        while True:
            x = self.next_u32()
            if x < limit:
                return x % n

    def randint(self, lo, hi):
        """An integer in [lo, hi], both ends included."""
        return lo + self.below(hi - lo + 1)

    def sample(self, n, k):
        """k distinct integers from range(n), in draw order (partial Fisher-Yates)."""
        pool = list(range(n))
        for i in range(k):
            j = i + self.below(n - i)
            pool[i], pool[j] = pool[j], pool[i]
        return pool[:k]

    def shuffle(self, items):
        for i in range(len(items) - 1, 0, -1):
            j = self.below(i + 1)
            items[i], items[j] = items[j], items[i]
        return items

    def rational(self, K):
        """A rational a/K with a uniform in [-K, K]."""
        return Fraction(self.randint(-K, K), K)
