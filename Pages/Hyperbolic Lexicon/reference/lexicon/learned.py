"""Phase 4 (Amendment 10, items 6, 10 and 11): snapping learned tables to the dyadic grid, ranking them exactly and
in float64, and the reported quantities that come from the snapped points.

A learned table is a float64 array, one row per node in offset order: a Lorentz row is (x0, x1, ..., xd), a
Euclidean row (x1, ..., xd) (A10.3).

Snapping (A10.6).
    Lorentz    p = x_s / (1 + x0) in binary64 (1 + x0 rounded first), then hpstep.fence.dyadic(p, K): n = floor(2^K p
               + 1/2) coordinatewise, stepped in by one unit while |n|^2 >= 4^K. The exact point is fence.lift(p, K).
    Euclidean  n = floor(2^K x + 1/2) of the float read exactly, without dyadic's rim rule (which belongs to the
               Poincare ball and never ends on a vector of norm 1 or more).
    The snapped text is 'offset n_1 ... n_d' per node, LF-joined, no final LF; its SHA-256 names the snapped table.

The exact Lorentz key (A10.6). For a query u and a candidate v,
    -<lift_u, lift_v>_L = 1 + 2 4^K kappa_u(v) / (4^K - |n_u|^2),   kappa_u(v) = |n_u - n_v|^2 / (4^K - |n_v|^2),
an increasing affine function of kappa_u(v) for a fixed u, so kappa orders and ties the candidates exactly as the
Lorentz product does. DyadicLorentzArm.kappa(u) gives kappa as exact Fractions. DyadicLorentzArm.keys(u), the key
rank.rank_query sees, is by default the integer
    k_u(v) = floor(a_v 2^(4K) / b_v),   a_v = |n_u - n_v|^2,  b_v = 4^K - |n_v|^2  (1 <= b_v <= 4^K),
which orders and ties exactly as kappa: two distinct kappas a/b < c/e differ by at least 1/(b e) >= 2^-4K, so their
images under floor(2^4K .) differ by at least 1, and equal kappas have equal images. rank._ap_and_ranks uses only
the order and the ties of the keys (sorted, bisect, ==), so both keys give identical APs, ranks and MAPs; the tests
check it, and check both against brute-force -<lift_u, lift_v>_L from fence.lift and hpstep.exact.lorentz.
READING: A10.6 calls the key "an exact Fraction"; the integer k_u is its exact order-isomorphic image (an exact
integer function, no rounding), taken because it is about ten times cheaper to sort. key='fraction' gives the
Fraction keys themselves.

The Euclidean key is rank.Arm('dyadic', 'euclid', columns of n, 2^K) unchanged: |n_u - n_v|^2 - |n_u|^2.

Float64 ranking of the unsnapped table (A10.10, L4(c)), FloatArm: Lorentz x0 y0 - x1 y1 - ... - xd yd from left to
right (Amendment 4 item 6's float key), Euclidean sum_seq (x_k - y_k)^2; equal keys are ties, counted
pessimistically by rank._ap_and_ranks; no acosh.

    poincare(X), snap(X, geometry, K), snap_text(offsets, N), parse_snap_text(text), float_table_sha(X)
    DyadicLorentzArm(N, K, key), dyadic_euclid_arm(N, K), snapped_arm(N, geometry, K), FloatArm(X, geometry)
    evaluate(arm, nb_sets, workers, fractional) -> Eval      APs, ranks, MAPs, mean ranks, ties (one pass per table)
    fractional_ap(S, keys, nb)                               A10.11: AP averaged over every order inside each tie
    rank_structure(arm), ap_float_structure(lt, le, nb), map_float_structure(lt, le, nb)
    displacement(X, N, geometry, K), bits(N, geometry, K)
    all_pairs(n), snapped_distances(N, geometry, pairs, K), tree_distances(words, pairs), distortion(dist, dT, tau)

Every MAP that decides goes through rank.rank_query (hence rank._ap_and_ranks), rank.map_exact and rank.mean_rank,
unchanged.
"""
import bisect
import hashlib
import math
import multiprocessing
from dataclasses import dataclass
from fractions import Fraction

import numpy as np
from hpstep import fence

from . import rank as R

K = 32
GEOMETRIES = ('lorentz', 'euclid')


# ================================================================ the float table and snapping
def float_table_bytes(X):
    """A10.6: little-endian float64, row-major, rows in offset order (a Lorentz row with x0 first)."""
    return np.ascontiguousarray(X, dtype='<f8').tobytes()


def float_table_sha(X):
    return hashlib.sha256(float_table_bytes(X)).hexdigest()


def poincare(X):
    """The Poincare point of each Lorentz row: x_k / (1 + x0) in binary64, with 1 + x0 rounded first."""
    X = np.ascontiguousarray(X, dtype=np.float64)
    return X[:, 1:] / (1.0 + X[:, 0])[:, None]


def _check_geometry(geometry):
    if geometry not in GEOMETRIES:
        raise ValueError(f'unknown geometry {geometry!r}')


def _check_finite(X):
    if not np.isfinite(X).all():
        raise ValueError('a table with a non-finite entry has no snap (A10.5: the run diverged)')


def snap(X, geometry, K=K):
    """The dyadic integers n (2^K times the snapped coordinates) of every row: a list of int tuples.

    lorentz: exactly [int(f * 2^K) for f in fence.dyadic(p, K)] for p = poincare(X) row by row. The float formula
             floor(p 2^K + 0.5) is exact when |p| 2^K < 2^52 (scaling by 2^K is exact, and so is adding 1/2 below
             2^52), so it is used there, and the rim loop is fence.dyadic's own, on Python ints; any other row goes
             through fence.dyadic itself.
    euclid:  floor(2^K x + 1/2) of each float read exactly: the float formula when |x| < 2^(52 - K), else
             floor(Fraction(x) 2^K + 1/2). No rim rule."""
    _check_geometry(geometry)
    X = np.ascontiguousarray(X, dtype=np.float64)
    _check_finite(X)
    s = float(2 ** K)
    lim = 2.0 ** (52 - K)
    if geometry == 'lorentz':
        P = poincare(X)
        four = 4 ** K
        out = []
        fast = np.abs(P).max(axis=1) < lim
        Nf = np.floor(P * s + 0.5)
        for i, row in enumerate(Nf.tolist()):
            if not fast[i]:
                out.append(tuple(int(f * 2 ** K) for f in fence.dyadic(P[i].tolist(), K)))
                continue
            n = [int(t) for t in row]
            while sum(t * t for t in n) >= four:        # fence.dyadic's rim rule, verbatim
                n = [t - 1 if t > 0 else t + 1 if t < 0 else 0 for t in n]
            out.append(tuple(n))
        return out
    with np.errstate(over='ignore', invalid='ignore'):
        Nf = np.floor(X * s + 0.5)
    small = np.abs(X) < lim
    if small.all():
        return [tuple(int(t) for t in row) for row in Nf.tolist()]
    half, scale = Fraction(1, 2), 2 ** K
    out = []
    for xr, nr, sr in zip(X.tolist(), Nf.tolist(), small.tolist()):
        out.append(tuple(int(t) if ok else math.floor(Fraction(x) * scale + half) for x, t, ok in zip(xr, nr, sr)))
    return out


def snap_text(offsets, N):
    """A10.6: 'offset n_1 ... n_d' per node, LF-joined, no final LF (for Lorentz, the Poincare point's integers)."""
    if len(offsets) != len(N):
        raise ValueError('offsets and rows differ in number')
    return '\n'.join(o + ' ' + ' '.join(str(t) for t in row) for o, row in zip(offsets, N))


def snap_sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def parse_snap_text(text):
    """The inverse of snap_text: (offsets, N)."""
    offsets, N = [], []
    for line in text.split('\n'):
        f = line.split(' ')
        offsets.append(f[0])
        N.append(tuple(int(t) for t in f[1:]))
    return offsets, N


# ================================================================ exact squared distances of integer points
def _split_ok(A):
    """Whether |n_u - n_v|^2 of the rows of the int64 array A can be summed exactly in int64 by the 16-bit split of
    _sq_from (|D| < 2^B with 2B - 32 + log2(d) <= 61, so every partial sum stays below 2^62)."""
    if A.size == 0:
        return True
    m = int(np.abs(A).max())
    B = (2 * m).bit_length()
    d = A.shape[1]
    return B <= 46 and 2 * B - 32 + (d - 1).bit_length() <= 61


def _sq_from(A, u, idx=None):
    """[|n_u - n_v|^2 as Python ints] for v in idx (default every row), exactly: D = n_v - n_u in int64, split as
    D = H 2^16 + L (H = D >> 16 arithmetic, 0 <= L < 2^16), so D^2 = H^2 2^32 + 2 H L 2^16 + L^2; the three sums
    over the coordinates are exact in int64 under _split_ok, and are joined in Python ints."""
    B = A if idx is None else A[idx]
    D = B - A[u]
    H = D >> 16
    L = D & 0xFFFF
    h2 = (H * H).sum(axis=1)
    hl = (H * L).sum(axis=1)
    l2 = (L * L).sum(axis=1)
    return [(a << 32) + (b << 17) + c for a, b, c in zip(h2.tolist(), hl.tolist(), l2.tolist())]


def _sq_python(N, u, idx):
    nu = N[u]
    return [sum((x - y) * (x - y) for x, y in zip(nu, N[v])) for v in idx]


class _Points:
    """Integer points with an exact |n_u - n_v|^2 (numpy split when safe, Python ints otherwise)."""

    def __init__(self, N):
        self.N = [tuple(int(t) for t in row) for row in N]
        self.n = len(self.N)
        self.d = len(self.N[0]) if self.N else 0
        mx = max((abs(t) for row in self.N for t in row), default=0)
        self.A = np.array(self.N, dtype=np.int64) if mx < 2 ** 62 else None
        self.fast = self.A is not None and _split_ok(self.A)

    def sq(self, u, idx=None):
        if self.fast:
            return _sq_from(self.A, u, idx)
        return _sq_python(self.N, u, range(self.n) if idx is None else idx)


# ================================================================ arms
class DyadicLorentzArm:
    """The snapped Lorentz table as an arm for rank.rank_query / rank_queries (duck-typed: .n and .keys(u)).

    N: the dyadic integers of snap(X, 'lorentz', K), every |n|^2 < 4^K. key='int' (default): keys(u) gives
    floor(a_v 2^(4K) / b_v), the exact order-isomorphic image of kappa_u(v) (module docstring); key='fraction':
    keys(u) gives kappa_u(v) itself. The query's own key is 0 either way."""

    kind = 'dyadic-lorentz'

    def __init__(self, N, K=K, key='int'):
        if key not in ('int', 'fraction'):
            raise ValueError(f'unknown key {key!r}')
        self.K, self.key = K, key
        self.P = _Points(N)
        self.N, self.n, self.dim = self.P.N, self.P.n, self.P.d
        four = 4 ** K
        self.b = [four - sum(t * t for t in row) for row in self.N]
        if any(b <= 0 for b in self.b):
            raise ValueError('a dyadic Lorentz point on or past the rim (|n|^2 >= 4^K): not a fence.dyadic snap')
        self.shift = 4 * K

    def a(self, u):
        """|n_u - n_v|^2 for every v, exact ints."""
        return self.P.sq(u)

    def kappa(self, u):
        """kappa_u(v) = |n_u - n_v|^2 / (4^K - |n_v|^2) for every v (exact Fractions; kappa_u(u) = 0)."""
        return [Fraction(a, b) for a, b in zip(self.a(u), self.b)]

    def keys(self, u):
        if self.key == 'fraction':
            return self.kappa(u)
        s = self.shift
        return [(a << s) // b for a, b in zip(self.a(u), self.b)]

    def lorentz_neg(self, u, v):
        """-<lift_u, lift_v>_L exactly, = 1 + 2 4^K |n_u - n_v|^2 / (b_u b_v) (for tests and reports)."""
        four = 4 ** self.K
        a = self.P.sq(u, [v])[0]
        return 1 + Fraction(2 * four * a, self.b[u] * self.b[v])


def dyadic_euclid_arm(N, K=K, name='dyadic'):
    """A10.6: the Euclidean snapped table as rank.Arm of kind 'euclid' over the denominator 2^K, unchanged."""
    d = len(N[0])
    return R.Arm(name, 'euclid', [[int(row[k]) for row in N] for k in range(d)], 2 ** K)


def snapped_arm(N, geometry, K=K, key='int'):
    _check_geometry(geometry)
    return DyadicLorentzArm(N, K, key) if geometry == 'lorentz' else dyadic_euclid_arm(N, K)


class FloatArm:
    """A10.10: float64 ranking of the unsnapped table, keys in binary64 without fused multiply-add (separate numpy
    ufunc calls, each correctly rounded):
        lorentz  acc = x_u0 * x_v0, then acc = acc - x_uk * x_vk for k = 1..d   (-<x_u, x_v>_L, Amendment 4 item 6)
        euclid   acc = (x_u1 - x_v1)^2, then acc = acc + (x_uk - x_vk)^2         (sum_seq of A10.10)
    Ascending is nearer in both. Equal keys are ties. A NaN key (inf - inf in a table near overflow) has no order,
    and the arm refuses it (READING: A10.10 defines no order for it)."""

    kind = 'float64'

    def __init__(self, X, geometry):
        _check_geometry(geometry)
        X = np.ascontiguousarray(X, dtype=np.float64)
        _check_finite(X)
        self.geometry, self.X = geometry, X
        self.n = X.shape[0]
        self.cols = [np.ascontiguousarray(X[:, k]) for k in range(X.shape[1])]

    def keys(self, u):
        x = self.X[u]
        c = self.cols
        with np.errstate(over='ignore', invalid='ignore'):
            if self.geometry == 'lorentz':
                acc = c[0] * x[0]
                for k in range(1, len(c)):
                    acc = acc - c[k] * x[k]
            else:
                t = x[0] - c[0]
                acc = t * t
                for k in range(1, len(c)):
                    t = x[k] - c[k]
                    acc = acc + t * t
        if np.isnan(acc).any():
            raise ValueError(f'query {u}: a float64 key is NaN')
        return acc.tolist()


# ================================================================ fractional-tie AP (A10.11)
def fractional_ap(S, keys, nb):
    """The AP of one query averaged exactly over every order inside each exact tie class (Common rules, "Ties";
    A10.11), with the interface of rank._ap_and_ranks: S the sorted candidate keys (the query removed), keys every
    node's key, nb the neighbour indices. None if nb is empty.

    Walking the tie classes in key order, with `lo` candidates before a class and `h` neighbours already passed, a
    class of m candidates holding k >= 1 neighbours puts a neighbour at its j-th place with probability k/m, and
    then holds on average (j - 1)(k - 1)/(m - 1) of its other neighbours before it; so it adds
        sum_{j=1..m} (k/m) (h + 1 + (j - 1)(k - 1)/(m - 1)) / (lo + j)      ((h + 1)/(lo + 1) when m = 1),
    and the AP is the total over |nb|. Classes without neighbours add nothing."""
    if not nb:
        return None
    nk = sorted(keys[v] for v in nb)
    terms = []
    h, i, n = 0, 0, len(nk)
    while i < n:
        Kv = nk[i]
        j = i + 1
        while j < n and nk[j] == Kv:
            j += 1
        k = j - i
        lo, hi = bisect.bisect_left(S, Kv), bisect.bisect_right(S, Kv)
        m = hi - lo
        if m < k:
            raise ValueError('a neighbour key is missing from the candidate keys')
        if m == 1:
            terms.append(Fraction(h + 1, lo + 1))
        else:
            # (k/m) (h + 1 + (j-1)(k-1)/(m-1)) / (lo + j) = k ((h+1)(m-1) + (j-1)(k-1)) / (m (m-1) (lo + j))
            c = m * (m - 1)
            for t in range(1, m + 1):
                terms.append(Fraction(k * ((h + 1) * (m - 1) + (t - 1) * (k - 1)), c * (lo + t)))
        h += k
        i = j
    return R.exact_sum(terms) / n


def query_sorted(keys, u):
    """The sorted candidate keys of query u, as rank.rank_query builds them (one occurrence of keys[u] removed)."""
    S = sorted(keys)
    del S[bisect.bisect_left(S, keys[u])]
    return S


# ================================================================ one evaluation per table
@dataclass
class Eval:
    """The result of evaluate(): per neighbour set (by name), the per-query APs (Fraction, None for a query without
    neighbours) and neighbour ranks in query order, the exact MAP and pooled mean rank, and the fractional-tie APs
    and MAP when asked for. ties: over the queries, the number of candidates minus the number of distinct keys
    among them (0 when no two candidates of any query tie).
    READING (A10.10, "the number of exact ties in each snapped table and of float ties in each unsnapped one"): a
    tie is counted per query, as candidates beyond the first in each class of equal keys."""
    aps: dict
    ranks: dict
    map: dict
    mean_rank: dict
    ties: int
    frac_aps: dict = None
    frac_map: dict = None
    queries: int = 0
    tied_queries: int = 0
    query_ids: list = None


class _Memo:
    """Hands rank.rank_query the arm's keys and keeps the last list, so that the same keys also give the ties and
    the fractional-tie APs, in the same pass."""

    def __init__(self, arm):
        self.arm, self.n, self.last = arm, arm.n, None

    def keys(self, u):
        self.last = self.arm.keys(u)
        return self.last


def _distinct_candidates(keys, u):
    distinct = len(set(keys))
    ku = keys[u]
    return distinct if sum(1 for k in keys if k == ku) > 1 else distinct - 1


def _query(arm, u, tables, fractional):
    memo = _Memo(arm)
    r = R.rank_query(memo, u, tables)
    keys = memo.last
    ties = (len(keys) - 1) - _distinct_candidates(keys, u)
    frac = None
    if fractional:
        S = query_sorted(keys, u)
        frac = [fractional_ap(S, keys, list(t[u])) for t in tables]
    return r.ap, r.ranks, ties, frac


_JOB = None


def _work(chunk):
    arm, tables, fractional = _JOB
    return [_query(arm, u, tables, fractional) for u in chunk]


def _map_or_none(aps):
    return R.map_exact(aps) if any(a is not None for a in aps) else None


def _mean_rank_or_none(ranks):
    return R.mean_rank(ranks) if any(ranks) else None


def evaluate(arm, nb_sets, workers=1, fractional=False, queries=None, chunks_per_worker=8):
    """Rank every node of the arm (or only `queries`, e.g. a query sample, in the order given) against all the
    others, once, for every neighbour set of nb_sets (a dict, e.g. {'graph': graph_nb, 'closure': closure_nb};
    nb[u] the neighbour indices of u). Each query goes through rank.rank_query unchanged (rank._ap_and_ranks:
    pessimistic ties); MAPs by rank.map_exact (queries without neighbours left out) and mean ranks by
    rank.mean_rank (pooled). fractional: also the fractional-tie APs and MAPs from the same keys (A10.11).
    workers > 1: a fork pool over contiguous chunks of queries, results in query order (deterministic);
    workers <= 1 runs in this process (inside pool workers)."""
    global _JOB
    names = list(nb_sets)
    tables = [nb_sets[k] for k in names]
    for k, t in zip(names, tables):
        if len(t) != arm.n:
            raise ValueError(f'neighbour set {k!r} has {len(t)} entries for {arm.n} nodes')
    queries = list(range(arm.n)) if queries is None else list(queries)
    if workers <= 1 or len(queries) < 2 * workers:
        res = [_query(arm, u, tables, fractional) for u in queries]
    else:
        nch = max(1, min(len(queries), workers * chunks_per_worker))
        size = -(-len(queries) // nch)
        chunks = [queries[i:i + size] for i in range(0, len(queries), size)]
        _JOB = (arm, tables, fractional)
        try:
            with multiprocessing.get_context('fork').Pool(workers) as pool:
                parts = pool.map(_work, chunks, chunksize=1)
        finally:
            _JOB = None
        res = [r for part in parts for r in part]
    aps = {k: [r[0][i] for r in res] for i, k in enumerate(names)}
    ranks = {k: [r[1][i] for r in res] for i, k in enumerate(names)}
    ev = Eval(aps=aps, ranks=ranks, map={k: _map_or_none(v) for k, v in aps.items()},
              mean_rank={k: _mean_rank_or_none(v) for k, v in ranks.items()},
              ties=sum(r[2] for r in res), queries=len(res), tied_queries=sum(1 for r in res if r[2]),
              query_ids=queries)
    if fractional:
        ev.frac_aps = {k: [r[3][i] for r in res] for i, k in enumerate(names)}
        ev.frac_map = {k: _map_or_none(v) for k, v in ev.frac_aps.items()}
    return ev


def delta_map(map_snapped, map_float):
    """L4(c)'s |MAP(snapped, exact) - MAP(float64)|, an exact rational (both MAPs are exact: the float ranking's
    APs are exact rationals of integer positions)."""
    return abs(Fraction(map_snapped) - Fraction(map_float))


# ================================================================ the rank structure (reported diagnostics)
def _class_ids(keys):
    """Dense ranks of the keys (equal keys, equal ids; ascending)."""
    order = sorted(range(len(keys)), key=keys.__getitem__)
    ids = [0] * len(keys)
    g, prev = -1, None
    for i in order:
        k = keys[i]
        if g < 0 or k != prev:
            g += 1
            prev = k
        ids[i] = g
    return ids, g + 1


def rank_structure(arm):
    """lt[u, v] and le[u, v] (int32): the number of candidates w != u of query u whose key is <, and <=, that of v.
    From these alone the pessimistic AP of query u under any neighbour set follows (ap_float_structure), which is
    how the reported label-shuffle diagnostics are computed for many permutations from one ranking."""
    n = arm.n
    lt = np.zeros((n, n), dtype=np.int32)
    le = np.zeros((n, n), dtype=np.int32)
    for u in range(n):
        ids, G = _class_ids(arm.keys(u))
        a = np.array(ids, dtype=np.int64)
        counts = np.bincount(a, minlength=G)
        counts[ids[u]] -= 1                                   # the query is not its own candidate
        cum = np.cumsum(counts)
        le[u] = cum[a]
        lt[u] = cum[a] - counts[a]
    return lt, le


def ap_float_structure(lt, le, nb):
    """The pessimistic AP of every query in float64 from the rank structure, for neighbour sets nb (indices of the
    structure's rows; nan for a query without neighbours). For neighbours tied at one key, g of them, with lo = lt
    and hi = le: the t-th (t = 1..g) sits at hi - g + t with before + t neighbours at or before it, as in
    rank._ap_and_ranks."""
    n = lt.shape[0]
    out = np.full(n, np.nan)
    for u in range(n):
        v = list(nb[u])
        if not v:
            continue
        lo_row, hi_row = lt[u, v].tolist(), le[u, v].tolist()
        pairs = sorted(zip(lo_row, hi_row))
        s, before, i, m = 0.0, 0, 0, len(pairs)
        while i < m:
            lo, hi = pairs[i]
            j = i + 1
            while j < m and pairs[j][0] == lo:
                j += 1
            g = j - i
            for t in range(1, g + 1):
                s += (before + t) / (hi - g + t)
            before += g
            i = j
        out[u] = s / m
    return out


def map_float_structure(lt, le, nb):
    """The MAP (float64, math.fsum over the queries with neighbours) from the rank structure."""
    ap = ap_float_structure(lt, le, nb)
    vals = [x for x in ap.tolist() if not math.isnan(x)]
    return math.fsum(vals) / len(vals)


# ================================================================ reported: displacement, bits, distances, distortion
def displacement(X, N, geometry, K=K):
    """A10.10: the largest snap displacement of the table.
    lorentz  arcosh(1 + 2R), R = |p - q|^2 / ((1 - |p|^2)(1 - |q|^2)) exact, p the binary64 Poincare point read
             exactly, q = n / 2^K; evaluated by rank.acosh_ratio (2R rounded once, then log1p and sqrt); infinity
             if 1 - |p|^2 <= 0.
    euclid   |x - n / 2^K|: the binary64 square root of the exact squared difference."""
    _check_geometry(geometry)
    X = np.ascontiguousarray(X, dtype=np.float64)
    scale = 2 ** K
    best = 0.0
    if geometry == 'lorentz':
        for prow, nrow in zip(poincare(X).tolist(), N):
            p = [Fraction(v) for v in prow]
            q = [Fraction(t, scale) for t in nrow]
            one_p = 1 - sum(v * v for v in p)
            if one_p <= 0:
                return math.inf
            one_q = 1 - sum(v * v for v in q)
            Rr = sum((a - b) ** 2 for a, b in zip(p, q)) / (one_p * one_q)
            z = 1 + 2 * Rr
            best = max(best, R.acosh_ratio(z.numerator, z.denominator))
        return best
    for xrow, nrow in zip(X.tolist(), N):
        sq = sum((Fraction(x) - Fraction(t, scale)) ** 2 for x, t in zip(xrow, nrow))
        best = max(best, math.sqrt(float(sq)))
    return best


def snapped_points(N, geometry, K=K):
    """The snapped points over one denominator each, for bits: Lorentz the lifted point (4^K + |n|^2, 2^(K+1) n)
    over 4^K - |n|^2; Euclidean n over 2^K."""
    _check_geometry(geometry)
    if geometry == 'lorentz':
        four = 4 ** K
        pts, dens = [], []
        for row in N:
            s = sum(t * t for t in row)
            pts.append([four + s] + [2 ** (K + 1) * t for t in row])
            dens.append(four - s)
        return pts, dens
    return [list(row) for row in N], [2 ** K] * len(N)


def bits(N, geometry, K=K):
    """A10.11: bits per node of the snapped points (h3tree.point_bits via rank.bits_per_node): (exact mean, max)."""
    pts, dens = snapped_points(N, geometry, K)
    return R.bits_per_node(pts, dens)


def all_pairs(n):
    """Every unordered pair (u, v), u < v, in lexicographic order."""
    return [(u, v) for u in range(n) for v in range(u + 1, n)]


def snapped_distances(N, geometry, pairs=None, K=K):
    """A10.11: the binary64 distance of the snapped points from their exact coordinates, for each pair (default:
    all_pairs), as rank.Arm.dist computes it for the exact arm:
        lorentz  rank.acosh_ratio(b_u b_v + 2 4^K |n_u - n_v|^2, b_u b_v),  b = 4^K - |n|^2
        euclid   sqrt(|n_u - n_v|^2 / 4^K)                                  (= sqrt(|n_u - n_v|^2) / 2^K exactly)"""
    _check_geometry(geometry)
    P = _Points(N)
    n = P.n
    if pairs is None:
        pairs = all_pairs(n)
    four = 4 ** K
    b = [four - sum(t * t for t in row) for row in P.N]
    out = np.empty(len(pairs))
    by_u = {}
    for i, (u, v) in enumerate(pairs):
        by_u.setdefault(u, []).append((i, v))
    for u, lst in by_u.items():
        idx = [v for _, v in lst]
        sq = P.sq(u, idx)
        if geometry == 'lorentz':
            bu = b[u]
            for (i, v), a in zip(lst, sq):
                bb = bu * b[v]
                out[i] = R.acosh_ratio(bb + 2 * four * a, bb)
        else:
            for (i, _), a in zip(lst, sq):
                out[i] = math.sqrt(a / four)
    return out


def tree_distances(words, pairs=None):
    """d_T of each pair: hpstep.problems.tree_distance of the L3 words (A10.11)."""
    from hpstep.problems import tree_distance
    if pairs is None:
        pairs = all_pairs(len(words))
    return np.array([tree_distance(words[u], words[v]) for u, v in pairs], dtype=np.float64)


def distortion(dist, dT, tau=None):
    """A10.11: the mean of |d / (tau d_T) - 1| over the pairs with d_T > 0 (math.fsum, then one division), and tau:
    given (ln 7 for the exact arm), or the median of d / d_T over the same pairs for a learned table.
    READING (A10.11): the median is numpy's (the mean of the two middle values for an even count).
    Returns (distortion, tau)."""
    dist = np.asarray(dist, dtype=np.float64)
    dT = np.asarray(dT, dtype=np.float64)
    keep = dT > 0
    d, t = dist[keep], dT[keep]
    if tau is None:
        tau = float(np.median(d / t))
    vals = np.abs(d / (tau * t) - 1)
    return math.fsum(vals.tolist()) / len(vals), tau
