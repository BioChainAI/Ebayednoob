"""The training stream of L6 (Amendment 10, items 1 and 3): hpstep.prng's xoshiro128** seeded by splitmix32,
computed with numba.

The registration says the trainer draws "with `Rng(seed)`". Amendment 10 item 1 reads that as: the stream is Rng's
by definition, and numba only computes it, because pure Python would spend about 330 s of a run in `Rng.below`. The
kernels below are a line-for-line copy of hpstep/prng.py's `next_u32`, `random`, `below` and `shuffle` on a state of
four words held in a uint64 array, each word masked to 32 bits after every operation. Nothing else uses numba.
tests/test_stream.py checks the copy against prng.py output for output, `below` on bounds that reject about half
the time included, before any run (item 1).

    Stream(seed) / Stream(state=(a, b, c, d)) / Stream.from_state(state)       .state() -> (a, b, c, d)
    .next_u32_many(k)  .random_many(k)  .below(n)  .below_many(ns)  .shuffle_fresh(n)
    .negatives(anchors, k, ptr, flat)   row r, t = 0..k-1: flat[ptr[u] + below(ptr[u + 1] - ptr[u])], u = anchors[r]

The trainer reads one Stream per run in item 3's order (lexicon.embed.train): `random_many(n * d)` for the initial
table, node-major; then, every epoch, `shuffle_fresh(E)` and one `negatives` call over the epoch's anchors in
permutation order (batch after batch, row after row: nothing draws between batches, so this is the same stream).
lexicon.pystream gives the same calls on hpstep.prng.Rng itself, without numba.

Kernels are compiled with cache=False: numba's cache writes .nbi/.nbc files under __pycache__ even with -B.
Importing this module imports numba; lexicon.embed imports it lazily, so a process that never trains never does.
"""
import numba
import numpy as np
from numba import njit

from hpstep.prng import splitmix32

NUMBA_VERSION = '0.68.1'
if numba.__version__ != NUMBA_VERSION:
    raise ImportError(f'lexicon.stream needs numba {NUMBA_VERSION} (requirements.txt pins it), '
                      f'found {numba.__version__}')
NAME = f'numba-{NUMBA_VERSION} xoshiro128** (hpstep.prng copy)'

MASK = np.uint64(0xFFFFFFFF)
_TWO32 = np.uint64(4294967296)
_U5 = np.uint64(5)
_U6 = np.uint64(6)
_U7 = np.uint64(7)
_U9 = np.uint64(9)
_U11 = np.uint64(11)
_U32 = np.uint64(32)


# ================================================================ kernels: hpstep/prng.py, line for line
@njit(cache=False)
def _rotl(x, k):
    # prng.py: ((x << k) | (x >> (32 - k))) & MASK
    return ((x << k) | (x >> (_U32 - k))) & MASK


@njit(cache=False)
def _next(s):
    """Rng.next_u32 on s = uint64[4] (each word < 2**32)."""
    result = (_rotl((s[1] * _U5) & MASK, _U7) * _U9) & MASK
    t = (s[1] << _U9) & MASK
    s[2] ^= s[0]
    s[3] ^= s[1]
    s[1] ^= s[2]
    s[0] ^= s[3]
    s[2] ^= t
    s[3] = _rotl(s[3], _U11)
    return result


@njit(cache=False)
def _random(s):
    """Rng.random: a = next >> 5, b = next >> 6, (a * 67108864 + b) / 9007199254740992 (exact below 2**53)."""
    a = _next(s) >> _U5
    b = _next(s) >> _U6
    return np.float64(a * np.uint64(67108864) + b) / 9007199254740992.0


@njit(cache=False)
def _below(s, n):
    """Rng.below for 1 <= n <= 2**32 (n as uint64): rejection on the 32-bit output."""
    if n == np.uint64(0) or n > _TWO32:
        raise ValueError('n must be in 1 .. 2^32')
    limit = _TWO32 - (_TWO32 % n)
    while True:
        x = _next(s)
        if x < limit:
            return x % n


@njit(cache=False)
def _next_many(s, k):
    out = np.empty(k, dtype=np.uint64)
    for i in range(k):
        out[i] = _next(s)
    return out


@njit(cache=False)
def _random_many(s, k):
    out = np.empty(k, dtype=np.float64)
    for i in range(k):
        out[i] = _random(s)
    return out


@njit(cache=False)
def _below_many(s, ns):
    out = np.empty(ns.shape[0], dtype=np.int64)
    for i in range(ns.shape[0]):
        out[i] = np.int64(_below(s, np.uint64(ns[i])))
    return out


@njit(cache=False)
def _shuffle_fresh(s, n):
    """Rng.shuffle(list(range(n))): for i = n - 1 .. 1, j = below(i + 1), swap items i and j."""
    items = np.arange(n)
    for i in range(n - 1, 0, -1):
        j = np.int64(_below(s, np.uint64(i + 1)))
        tmp = items[i]
        items[i] = items[j]
        items[j] = tmp
    return items


@njit(cache=False)
def _negatives(s, anchors, k, ptr, flat):
    """For each anchor u in order, k draws flat[ptr[u] + below(ptr[u + 1] - ptr[u])], independent, with replacement."""
    out = np.empty((anchors.shape[0], k), dtype=np.int64)
    for r in range(anchors.shape[0]):
        u = anchors[r]
        p = ptr[u]
        m = ptr[u + 1] - p
        if m < 1:
            raise ValueError('an anchor without non-neighbours')
        mu = np.uint64(m)
        for t in range(k):
            out[r, t] = flat[p + np.int64(_below(s, mu))]
    return out


# ================================================================ the stream
def seed_state(seed):
    """Rng(seed)'s state: the first four outputs of hpstep.prng.splitmix32(seed)."""
    sm = splitmix32(seed)
    return tuple(next(sm) for _ in range(4))


class Stream:
    """hpstep.prng.Rng's stream in numba. `Stream(seed)` fills the state from splitmix32(seed) as `Rng(seed)` does;
    `Stream(state=(a, b, c, d))` sets it (`Stream.from_state` is the same)."""
    name = NAME

    def __init__(self, seed=0, state=None):
        if state is None:
            state = seed_state(seed)
        st = [int(x) & 0xFFFFFFFF for x in state]
        if len(st) != 4:
            raise ValueError('a xoshiro128** state has four words')
        if not any(st):
            raise ValueError('xoshiro128** state must not be all zero')
        self.s = np.array(st, dtype=np.uint64)

    @classmethod
    def from_state(cls, state):
        return cls(state=tuple(state))

    def state(self):
        return tuple(int(x) for x in self.s)

    def next_u32_many(self, k):
        return _next_many(self.s, int(k))

    def random_many(self, k):
        return _random_many(self.s, int(k))

    def below(self, n):
        n = int(n)
        if not 0 < n <= 2 ** 32:
            raise ValueError('n must be in 1 .. 2^32')
        return int(_below(self.s, np.uint64(n)))

    def below_many(self, ns):
        ns = np.ascontiguousarray(ns, dtype=np.int64)
        if ns.size and (int(ns.min()) < 1 or int(ns.max()) > 2 ** 32):
            raise ValueError('n must be in 1 .. 2^32')
        return _below_many(self.s, ns)

    def shuffle_fresh(self, n):
        return _shuffle_fresh(self.s, int(n))

    def negatives(self, anchors, k, ptr, flat):
        return _negatives(self.s, np.ascontiguousarray(anchors, dtype=np.int64), int(k),
                          np.ascontiguousarray(ptr, dtype=np.int64), np.ascontiguousarray(flat, dtype=np.int64))


def compile_kernels():
    """Compile every kernel once (about 1.3 s per process) on a throwaway state, so a run's timing excludes it."""
    st = Stream(state=(1, 2, 3, 4))
    st.next_u32_many(2)
    st.random_many(2)
    st.below(3)
    st.below_many([3, 5])
    st.shuffle_fresh(5)
    st.negatives(np.array([0]), 2, np.array([0, 2]), np.array([1, 2]))
