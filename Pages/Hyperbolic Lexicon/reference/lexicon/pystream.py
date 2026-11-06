"""lexicon.stream's calls on hpstep.prng.Rng itself, without numba (Amendment 10, item 1).

    PyStream(seed) / PyStream(state=(a, b, c, d)) / PyStream.from_state(state)   the same API as lexicon.stream.Stream
    replay_states(stream, n, d, pos_anchor, nn_sizes, epochs, negs=50)           a run's draws without its arithmetic

PyStream makes every draw outside training: control 2's pairs and the floors' initial tables (lexicon.embed), and the
registered replay checks. Item 1: registered tuning and the decisive run each replay one of their runs' draws with
hpstep.prng.Rng, and the replay's final state must equal the run's, or that step writes no result. A replay costs
about 330 s, almost all of it in `Rng.below`.
"""
import numpy as np

from hpstep.prng import Rng

NAME = 'python hpstep.prng.Rng'


class PyStream:
    """The Stream API, call for call, on one hpstep.prng.Rng (`self.rng`)."""
    name = NAME

    def __init__(self, seed=0, state=None):
        self.rng = Rng(seed) if state is None else Rng(state=tuple(state))

    @classmethod
    def from_state(cls, state):
        return cls(state=tuple(state))

    def state(self):
        return tuple(self.rng.s)

    def next_u32_many(self, k):
        f = self.rng.next_u32
        return np.array([f() for _ in range(int(k))], dtype=np.uint64)

    def random_many(self, k):
        f = self.rng.random
        return np.array([f() for _ in range(int(k))], dtype=np.float64)

    def below(self, n):
        return self.rng.below(int(n))

    def below_many(self, ns):
        f = self.rng.below
        return np.array([f(int(m)) for m in np.asarray(ns).tolist()], dtype=np.int64)

    def shuffle_fresh(self, n):
        return np.array(self.rng.shuffle(list(range(int(n)))), dtype=np.int64)

    def negatives(self, anchors, k, ptr, flat):
        f = self.rng.below
        ptr = np.asarray(ptr).tolist()
        flat = np.asarray(flat).tolist()
        anchors = np.asarray(anchors).tolist()
        out = np.empty((len(anchors), int(k)), dtype=np.int64)
        for r, u in enumerate(anchors):
            p, m = ptr[u], ptr[u + 1] - ptr[u]
            if m < 1:
                raise ValueError(f'anchor {u} has no non-neighbours')
            out[r] = [flat[p + f(m)] for _ in range(int(k))]
        return out


def replay_states(stream, n, d, pos_anchor, nn_sizes, epochs, negs=50):
    """The draws of a run (item 3) without its arithmetic: n * d random(); then, per epoch, shuffle(E) of a fresh
    list and, in permutation order (batch after batch, row after row), `negs` below(|NN(u)|) per row.

    pos_anchor: the anchor of each positive pair (Instance.pos[:, 0]); nn_sizes[u] = |NN(u)|. Returns the stream's
    state after the initialisation and after every epoch: epochs + 1 tuples. With a PyStream every draw is
    hpstep.prng.Rng's own `random`, `shuffle` and `below`."""
    pos_anchor = np.asarray(pos_anchor, dtype=np.int64)
    sizes = np.asarray(nn_sizes, dtype=np.int64)
    E = len(pos_anchor)
    states = []
    stream.random_many(n * d)
    states.append(stream.state())
    rng = getattr(stream, 'rng', None)
    for _ in range(epochs):
        perm = stream.shuffle_fresh(E)
        ms = sizes[pos_anchor[perm]]
        if int(ms.min()) < 1:
            raise ValueError('an anchor without non-neighbours')
        if isinstance(rng, Rng):
            below = rng.below
            for m in ms.tolist():
                for _ in range(negs):
                    below(m)
        else:
            stream.below_many(np.repeat(ms, negs))
        states.append(stream.state())
    return states
