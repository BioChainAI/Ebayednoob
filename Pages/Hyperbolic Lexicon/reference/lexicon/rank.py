"""Exact ranking (Amendment 1, item 5) and the metrics of L4, L5 and L6: pessimistic AP, MAP and mean rank as exact
rationals, rank lists and their SHA-256, distortion and bits per node (item 7), the S3 mean over permutations, and
Hyperbolic Oracles' bootstrap ci_mean, replicated exactly.

An arm is a candidate set as integer coordinate columns over ONE common denominator D (Arm). Its exact key against
a query X is a plain int, ascending = nearer:
    'lorentz'  X0 Y0 - X1 Y1 - X2 Y2 (- X3 Y3)  = -<x, y> D^2 = cosh d(x, y) D^2
    'euclid'   |Y|^2 - 2 X.Y                     = |x - y|^2 D^2 - |X|^2 (|X|^2 is the same for every candidate)
so both order the candidates exactly as -<x, y> and the squared distance do, ties included.

A query's candidates are all other nodes of the arm; node indices must be in synset-offset order (the shared
instances are), so a stable sort by key lists ties by offset. From one sort of the keys:
    AP          on the order (key; non-neighbours before neighbours inside a tie class; offset): the registered
                pessimistic rule. An exact Fraction; None for a query without neighbours.
    rank        of a neighbour (mean rank): 1 + the number of non-neighbours whose key is at most its own.
    rank list   the candidates by (key, offset), each 'offset g' (g the 0-based index of its exact tie class),
                lines joined by LF (no final LF); L4(a) hashes it with SHA-256.

    Arm.from_points(name, kind, points, scales, den, tau)      .keys(u), .key(u, v), .dist(u, v)
    rank_query(arm, u, nb_sets, offsets=None, rank_list=None)   -> QueryResult(query, ap, ranks, sha, text)
    rank_queries(arm, queries, nb_sets, offsets, rank_list, workers=4)   fork pool, results in query order
    exact_sum, map_exact(aps), mean_rank(rank_lists), mean_over_permutations(ap_lists)
    graph_neighbours(offsets, parent, children), closure_neighbours(offsets, anc, desc)
    distortion(arm, pairs, words, tau), bits_per_node(points, dens), paired_diffs(a, b), ci_mean(values)
"""
import bisect
import hashlib
import math
import multiprocessing
from collections import namedtuple
from fractions import Fraction

import numpy as np
from hpstep.problems import tree_distance

from .h3tree import point_bits

QueryResult = namedtuple('QueryResult', 'query ap ranks sha text')


class Arm:
    """Points as integer columns over one common denominator: node i is (cols[0][i], ..., cols[d-1][i]) / den."""

    def __init__(self, name, kind, cols, den, tau=None):
        if kind not in ('lorentz', 'euclid'):
            raise ValueError(f'unknown kind {kind!r}')
        self.name, self.kind, self.den, self.tau = name, kind, den, tau
        self.cols = [list(c) for c in cols]
        self.n, self.dim = len(self.cols[0]), len(self.cols)
        if any(len(c) != self.n for c in self.cols):
            raise ValueError('ragged columns')
        self.sq = [sum(x * x for x in v) for v in zip(*self.cols)] if kind == 'euclid' else None

    @classmethod
    def from_points(cls, name, kind, points, scales, den, tau=None):
        """points[i] * scales[i] / den is node i (scales bring each point to the common denominator)."""
        dim = len(points[0])
        cols = [[p[k] * s for p, s in zip(points, scales)] for k in range(dim)]
        return cls(name, kind, cols, den, tau)

    def vector(self, i):
        return tuple(c[i] for c in self.cols)

    def keys(self, u):
        """The exact key of every node (the query's own included) against node u; ascending = nearer."""
        c = self.cols
        if self.kind == 'lorentz':
            if self.dim == 4:
                a0, a1, a2, a3 = c[0][u], c[1][u], c[2][u], c[3][u]
                return [a0 * x0 - a1 * x1 - a2 * x2 - a3 * x3 for x0, x1, x2, x3 in zip(*c)]
            if self.dim == 3:
                a0, a1, a2 = c[0][u], c[1][u], c[2][u]
                return [a0 * x0 - a1 * x1 - a2 * x2 for x0, x1, x2 in zip(*c)]
            a = self.vector(u)
            return [a[0] * v[0] - sum(a[k] * v[k] for k in range(1, self.dim)) for v in zip(*c)]
        if self.dim == 3:
            b0, b1, b2 = 2 * c[0][u], 2 * c[1][u], 2 * c[2][u]
            return [s - b0 * x0 - b1 * x1 - b2 * x2 for s, x0, x1, x2 in zip(self.sq, *c)]
        if self.dim == 2:
            b0, b1 = 2 * c[0][u], 2 * c[1][u]
            return [s - b0 * x0 - b1 * x1 for s, x0, x1 in zip(self.sq, *c)]
        b = [2 * x for x in self.vector(u)]
        return [s - sum(bk * vk for bk, vk in zip(b, v)) for s, v in zip(self.sq, zip(*c))]

    def key(self, u, v):
        a, b = self.vector(u), self.vector(v)
        if self.kind == 'lorentz':
            return a[0] * b[0] - sum(x * y for x, y in zip(a[1:], b[1:]))
        return self.sq[v] - 2 * sum(x * y for x, y in zip(a, b))

    def dist(self, u, v):
        """The geodesic (lorentz) or Euclidean (euclid) distance in float64, from the exact integers."""
        a, b = self.vector(u), self.vector(v)
        D2 = self.den * self.den
        if self.kind == 'lorentz':
            return acosh_ratio(a[0] * b[0] - sum(x * y for x, y in zip(a[1:], b[1:])), D2)
        return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)) / D2)


def acosh_ratio(num, den):
    """acosh(num / den) in float64 for integers num >= den > 0, without overflow: log1p(t + sqrt(t (t + 2))) with
    t = (num - den) / den correctly rounded (int true division), and ln 2 + ln num - ln den (math.log takes big ints)
    when num / den is beyond float64's comfortable range."""
    diff = num - den
    if diff <= 0:
        return 0.0
    if num.bit_length() - den.bit_length() > 480:
        return math.log(2) + math.log(num) - math.log(den)
    t = diff / den
    return math.log1p(t + math.sqrt(t * (t + 2)))


# ================================================================ one query
def exact_sum(values):
    """The exact sum of Fractions/ints by balanced pairwise addition (fast for many terms with large denominators)."""
    xs = list(values)
    if not xs:
        return Fraction(0)
    while len(xs) > 1:
        xs = [xs[i] + xs[i + 1] if i + 1 < len(xs) else xs[i] for i in range(0, len(xs), 2)]
    return Fraction(xs[0])


def _ap_and_ranks(S, keys, nb):
    """AP (pessimistic ties) and neighbour ranks from the sorted candidate keys S. nb: neighbour indices."""
    if not nb:
        return None, []
    nk = sorted(keys[v] for v in nb)
    terms, rank_of = [], {}
    before, i, n = 0, 0, len(nk)
    while i < n:
        K = nk[i]
        j = i + 1
        while j < n and nk[j] == K:
            j += 1
        g = j - i
        lo, hi = bisect.bisect_left(S, K), bisect.bisect_right(S, K)
        e_non = hi - lo - g                      # non-neighbours tied with these g neighbours rank before them
        for t in range(1, g + 1):
            terms.append(Fraction(before + t, lo + e_non + t))
        before += g
        rank_of[K] = 1 + hi - before             # 1 + non-neighbours with key <= K
        i = j
    return exact_sum(terms) / n, [rank_of[keys[v]] for v in nb]


def _rank_text(order, keys, offsets):
    lines, g, last = [], -1, None
    for i in order:
        k = keys[i]
        if k != last:
            g += 1
            last = k
        lines.append(f'{offsets[i]} {g}')
    return '\n'.join(lines)


def rank_query(arm, u, nb_sets, offsets=None, rank_list=None):
    """Rank every other node of the arm against node u. nb_sets: a list of neighbour tables (nb[u] = the neighbour
    indices of u, never u itself), e.g. [graph-edge, closure]. rank_list: None, 'sha' or 'text' (needs offsets).
    Returns QueryResult(query, ap: [Fraction | None], ranks: [[int] in nb[u]'s order], sha, text)."""
    keys = arm.keys(u)
    sha = text = None
    if rank_list:
        order = sorted(range(len(keys)), key=keys.__getitem__)      # stable: ties stay in index (offset) order
        order.remove(u)
        S = [keys[i] for i in order]
        t = _rank_text(order, keys, offsets)
        sha = hashlib.sha256(t.encode()).hexdigest()
        if rank_list == 'text':
            text = t
    else:
        S = sorted(keys)
        del S[bisect.bisect_left(S, keys[u])]                        # the query itself (any equal key: same key)
    aps, ranks = [], []
    for nb in nb_sets:
        nbl = list(nb[u])
        if u in nbl:
            raise ValueError(f'node {u} is listed as its own neighbour')
        a, r = _ap_and_ranks(S, keys, nbl)
        aps.append(a)
        ranks.append(r)
    return QueryResult(u, aps, ranks, sha, text)


# ================================================================ many queries, in parallel
_JOB = None


def _work(chunk):
    arm, nb_sets, offsets, rank_list = _JOB
    return [rank_query(arm, u, nb_sets, offsets, rank_list) for u in chunk]


def rank_queries(arm, queries, nb_sets, offsets=None, rank_list=None, workers=4, chunks_per_worker=8):
    """rank_query for every query, in a fork pool of `workers` processes; results in the order of `queries`
    (deterministic: contiguous chunks, mapped in order). workers <= 1 runs in this process."""
    global _JOB
    queries = list(queries)
    if rank_list:
        if offsets is None or len(offsets) != arm.n:
            raise ValueError('a rank list needs the offsets of all nodes')
        if any(offsets[i] >= offsets[i + 1] for i in range(len(offsets) - 1)):
            raise ValueError('nodes must be in offset order')
    if workers <= 1 or len(queries) < 2 * workers:
        return [rank_query(arm, u, nb_sets, offsets, rank_list) for u in queries]
    n = max(1, min(len(queries), workers * chunks_per_worker))
    size = -(-len(queries) // n)
    chunks = [queries[i:i + size] for i in range(0, len(queries), size)]
    _JOB = (arm, nb_sets, offsets, rank_list)
    try:
        with multiprocessing.get_context('fork').Pool(workers) as pool:
            parts = pool.map(_work, chunks, chunksize=1)
    finally:
        _JOB = None
    return [r for part in parts for r in part]


# ================================================================ metrics
def map_exact(aps):
    """MAP: the exact mean of the APs (queries without neighbours, AP None, are left out)."""
    xs = [a for a in aps if a is not None]
    return exact_sum(xs) / len(xs)


def mean_rank(rank_lists):
    """Mean rank as an exact rational over all (query, neighbour) pairs pooled.

    READING: pooled over pairs, as Nickel & Kiela average the rank over all observed edges; the per-query lists are
    kept in QueryResult.ranks if a per-query mean is wanted."""
    total = count = 0
    for r in rank_lists:
        total += sum(r)
        count += len(r)
    return Fraction(total, count)


def mean_over_permutations(ap_lists):
    """S3 (Amendment 1, item 7): a query's AP is the mean of its APs over the permutations. ap_lists[p][q] is the
    AP of query q under permutation p; returns the exact per-query means."""
    P = len(ap_lists)
    return [exact_sum(col) / P for col in zip(*ap_lists)]


def paired_diffs(a, b):
    """Per-query paired AP differences: exact APs, differenced in float64 (float(a) - float(b))."""
    return [float(x) - float(y) for x, y in zip(a, b)]


def ci_mean(values, resamples=10_000, seed=7):
    """Mean and 95% percentile bootstrap interval: Hyperbolic Oracles' run_bench.ci_mean, replicated exactly
    (numpy default_rng(seed), resamples of the values with replacement, percentile 2.5 and 97.5)."""
    v = np.asarray(values, dtype=float)
    rng = np.random.default_rng(seed)
    means = np.array([v[rng.integers(0, len(v), len(v))].mean() for _ in range(resamples)])
    lo, hi = np.percentile(means, [2.5, 97.5])
    return float(v.mean()), [float(lo), float(hi)]


def graph_neighbours(offsets, parent, children):
    """Graph-edge neighbours inside the set `offsets` (sorted): the spanning parent when it is inside, and the
    children inside. Returns a list of index lists aligned with offsets."""
    index = {o: i for i, o in enumerate(offsets)}
    out = []
    for o in offsets:
        nb = [index[c] for c in children.get(o, ()) if c in index]
        p = parent.get(o)
        if p in index:
            nb.append(index[p])
        out.append(sorted(nb))
    return out


def closure_neighbours(offsets, anc, desc):
    """Closure neighbours inside the set: closure ancestors and descendants (lexicon.wordnet.closure/descendants)."""
    index = {o: i for i, o in enumerate(offsets)}
    return [sorted(index[x] for x in (anc[o] | desc[o]) if x in index and x != o) for o in offsets]


def distortion(arm, pairs, words, tau=None):
    """Amendment 1, item 7: the mean of |d / (tau d_T) - 1| over the pairs (u, v) of node indices, d the arm's
    float64 distance, d_T the word tree distance (hpstep.problems.tree_distance) of words[u], words[v]; tau defaults
    to the arm's (ln 7 for H3, ln 12 for H2, 1 for F). Pairs with d_T = 0 are left out (a node with itself)."""
    tau = arm.tau if tau is None else tau
    total, n = 0.0, 0
    for u, v in pairs:
        dt = tree_distance(words[u], words[v])
        if dt == 0:
            continue
        total += abs(arm.dist(u, v) / (tau * dt) - 1)
        n += 1
    return total / n


def bits_per_node(points, dens):
    """Amendment 1, item 7: bits of each point over one common denominator (h3tree.point_bits: numerator bits plus
    denominator bits, in lowest terms); returns (exact mean, maximum)."""
    b = [point_bits(X, d) for X, d in zip(points, dens)]
    return Fraction(sum(b), len(b)), max(b)
