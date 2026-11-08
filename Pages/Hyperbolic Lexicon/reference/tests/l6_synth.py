"""Synthetic DAGs for the Phase 4 tests (a helper, not a test), and the seed guard every Phase 4 test module installs.

    dag(seed, n=1182)      a random DAG shaped like the mammal closure set: one root, 1,182 nodes, 6,542 to 6,607
                           closure pairs, nodes with a second parent; a lexicon.embed.ClosureSet with offsets
                           '00000000', '00000001', ... and L3 words for its spanning tree
    small(seed)            60 nodes: an anchor with exactly 3 non-neighbours, E % 50 != 0
    install_seed_guard(monkeypatch)      Stream, PyStream and hpstep.prng.Rng refuse registered and dry seeds

Tests and self-tests use unregistered seeds 80000 + i only (Amendment 10 items 9 and 16; build spec section 0).
"""
from hpstep.prng import Rng

from lexicon import address as A
from lexicon import embed as EM

# the registered seeds (Common rules; Amendment 10 items 8, 9, 14) and the dry run's (item 13), all refused in tests
REGISTERED_RANGES = ((0, 4), (7, 7), (1000, 2999), (4000, 4999), (9000, 9023), (90000, 99999))
DRY_RANGES = ((3000, 3999), (5000, 5999), (12000, 12023))


def guarded(seed):
    return any(lo <= seed <= hi for lo, hi in REGISTERED_RANGES + DRY_RANGES)


def _guard(init):
    def wrapped(self, seed=0, state=None):
        if state is None and guarded(seed):
            raise RuntimeError(f'seed {seed} is registered or belongs to the dry run: tests use 80000 + i')
        return init(self, seed, state)
    return wrapped


def install_seed_guard(monkeypatch):
    """Wrap the constructors of hpstep.prng.Rng, lexicon.stream.Stream and lexicon.pystream.PyStream: no state given
    and a guarded seed raises. A constructor given state= is never refused (Rng's default seed is 0)."""
    import hpstep.prng as P
    from lexicon import pystream
    from lexicon import stream
    for cls in (P.Rng, stream.Stream, pystream.PyStream):
        monkeypatch.setattr(cls, '__init__', _guard(cls.__init__))


def _closure(parents):
    n = len(parents)
    anc = [set() for _ in range(n)]
    for i in range(n):                       # parents have smaller indices: one forward pass
        for p in parents[i]:
            anc[i].add(p)
            anc[i] |= anc[p]
    return anc


def _closure_set(parents, words=True):
    n = len(parents)
    offs = [f'{i:08d}' for i in range(n)]
    anc = _closure(parents)
    anc_m = {offs[i]: {offs[a] for a in anc[i]} for i in range(n)}
    desc_m = {o: set() for o in offs}
    for o, a in anc_m.items():
        for x in a:
            desc_m[x].add(o)
    parent = {offs[i]: (offs[p[0]] if p else None) for i, p in enumerate(parents)}
    children = {}
    for o, p in parent.items():
        if p is not None:
            children.setdefault(p, []).append(o)
    for lst in children.values():
        lst.sort()
    w = None
    if words:
        roots = sorted(o for o, p in parent.items() if p is None)
        w = A.forest_words(parent, children, roots, A.NOUN_ROOT, virtual=False)
    return EM.build_closure_set(offs[0], offs, anc_m, desc_m, parent, children, w)


def pairs_count(parents):
    return sum(len(a) for a in _closure(parents))


def dag_parents(seed, n=1182, extra=6, top=2, target=6542):
    """The prototypes' rule (Amendment 10 item 16's synthetic DAG), from Rng(seed): nodes 1..top are children of the
    root; node i > top takes the parent below(i) with probability 1/4, else min(below(i), below(i)) (shallow, as the
    mammals are: depths up to about 12). Then nodes get a second parent among earlier nodes (multiple inheritance),
    at least `extra` times and until the closure has at least `target` pairs (the mammals have 6,542), skipping
    any that would take it more than 1% past the target."""
    rng = Rng(seed)
    parents = [[] for _ in range(n)]
    for i in range(1, n):
        if i <= top:
            parents[i].append(0)
            continue
        parents[i].append(rng.below(i) if rng.below(4) == 0 else min(rng.below(i), rng.below(i)))
    k = 0
    while k < extra or (target and pairs_count(parents) < target):
        i = 1 + rng.below(n - 1)
        p = rng.below(i)
        if p not in parents[i]:
            parents[i].append(p)
            if target and pairs_count(parents) > target + target // 100:
                parents[i].pop()                 # keep the count within 1% above the target
        k += 1
        if k > 10 * n:
            raise ValueError('cannot reach the target pair count')
    return parents


def dag(seed=80001, n=1182, extra=6, top=2, target=6542, words=True):
    return _closure_set(dag_parents(seed, n, extra, top, target), words)


def small(seed=80002):
    """60 nodes. Node 1 (under the root 0) has descendants 2..56 and so exactly 3 non-neighbours (57, 58, 59, children
    of the root). Second parents inside node 1's subtree are added until E % 50 != 0."""
    rng = Rng(seed)
    parents = [[] for _ in range(60)]
    parents[1] = [0]
    for i in range(2, 57):
        parents[i] = [1 + rng.below(i - 1)]
    for i in (57, 58, 59):
        parents[i] = [0]
    i = 56
    while sum(len(a) for a in _closure(parents)) % 50 == 0:
        p = 2 + rng.below(i - 2)
        if p not in parents[i] and p != i:
            parents[i].append(p)
        i -= 1
    return _closure_set(parents)
