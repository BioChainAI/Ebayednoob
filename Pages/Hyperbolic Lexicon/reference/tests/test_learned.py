"""lexicon.learned (Amendment 10, items 6, 10, 11): snapping against hpstep.fence, the exact key against brute-force
-<lift_u, lift_v>_L, the evaluators against brute force, the float64 keys bit for bit, fractional-tie AP against every
order, the rank structure, displacement, distances and bits. Synthetic tables and unregistered seeds (80000 + i)
only."""
import itertools
import math
import random
from decimal import Decimal, getcontext
from fractions import Fraction as F

import numpy as np
import pytest

import l6_synth
from hpstep import exact as EX
from hpstep import fence
from hpstep.prng import Rng
from lexicon import l6
from lexicon import learned as L
from lexicon import rank as R

FOUR32 = 4 ** 32


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    l6_synth.install_seed_guard(monkeypatch)


# ---------------------------------------------------------------- synthetic tables (numpy default_rng(80000 + i))
def lorentz_table(seed, n, d, rmax=8.0):
    g = np.random.default_rng(seed)
    v = g.normal(size=(n, d))
    v /= np.sqrt((v * v).sum(axis=1))[:, None]
    r = g.uniform(0.0, rmax, size=n)
    x = v * np.sinh(r)[:, None]
    return np.column_stack([np.sqrt(1.0 + (x * x).sum(axis=1)), x])


def euclid_table(seed, n, d, scale=2.0):
    return np.random.default_rng(seed).normal(size=(n, d)) * scale


def lorentz_row(x):
    x = np.asarray(x, dtype=np.float64)
    return np.concatenate([[math.sqrt(1.0 + float((x * x).sum()))], x])


def rim_rows():
    """Rows whose Poincare points sit on or near the rim: p rounds to 2^32 (|n|^2 >= 4^32, so fence.dyadic steps
    in), diagonal directions, and x0 so large that p is exactly 1.0."""
    rows = []
    for r in (20.0, 22.5, 23.0, 25.0, 30.0, 40.0):
        for direction in ((1.0, 0.0), (1.0, 1.0), (-1.0, 1.0), (0.6, -0.8), (1e-9, 1.0)):
            u = np.array(direction) / math.hypot(*direction)
            rows.append(lorentz_row(u * math.sinh(r)))
    rows.append(np.array([1e17, 1e17, 0.0]))           # p = (1.0, 0.0) in binary64
    rows.append(np.array([1e30, 0.0, -1e30]))
    rows.append(np.array([1.0, 0.0, 0.0]))             # the origin
    return np.array(rows)


def dyadic_ints(p, K):
    return tuple(int(f * 2 ** K) for f in fence.dyadic(list(p), K))


# ================================================================ snapping
@pytest.mark.parametrize('K', [32, 8])
def test_lorentz_snap_is_fence(K):
    tables = [lorentz_table(80010 + d, 300, d, rmax=r) for d in (2, 3, 5) for r in (3.0, 15.0, 26.0)]
    tables.append(rim_rows())
    tables.append(lorentz_table(80015, 200, 50, rmax=20.0))
    stepped = 0
    for X in tables:
        N = L.snap(X, 'lorentz', K)
        P = L.poincare(X)
        for row, p, x in zip(N, P.tolist(), X.tolist()):
            assert row == dyadic_ints(p, K)
            assert p == [xk / (1.0 + x[0]) for xk in x[1:]]           # 1 + x0 rounded first, then the division
            raw = [math.floor(v * 2.0 ** K + 0.5) for v in p]
            stepped += raw != list(row)
        assert all(sum(t * t for t in row) < 4 ** K for row in N)
    assert stepped > 0                                                  # the rim rule did step some rows in


def test_euclid_rounding():
    s = 2 ** 32
    ks = [0, 1, 2, 7, 12345, 2 ** 31 - 1, 2 ** 40 + 3]
    halves = [(k + 0.5) / s for k in ks] + [-(k + 0.5) / s for k in ks]
    X = np.array(halves + [0.0] * (len(halves) % 2)).reshape(-1, 2)
    N = L.snap(X, 'euclid')
    for x, n in zip(X.ravel().tolist(), [t for row in N for t in row]):
        assert F(x) * s + F(1, 2) == n                                # exactly halfway: rounds up
        assert n == math.floor(F(x) * s + F(1, 2))
    big = np.array([[2.0 ** 20 + 3 * 2.0 ** -32, -(2.0 ** 25 + 2.0 ** -27)], [3e15, -7.25e9], [2.0 ** 52, 1.5]])
    Nb = L.snap(big, 'euclid')
    for x, n in zip(big.ravel().tolist(), [t for row in Nb for t in row]):
        assert n == math.floor(F(x) * s + F(1, 2))
    assert Nb[0][0] == 2 ** 52 + 3
    g = np.random.default_rng(80020)
    Xs = g.normal(size=(2000, 3)) * np.exp(g.uniform(-30, 13, size=(2000, 1)))
    assert np.abs(Xs).max() < 2.0 ** 20
    for x, n in zip(Xs.ravel().tolist(), [t for row in L.snap(Xs, 'euclid') for t in row]):
        assert n == math.floor(F(x) * s + F(1, 2))
    # K = 8: the coarse snap, float formula below 2^44 and exact above
    for x, n in zip(Xs.ravel().tolist(), [t for row in L.snap(Xs, 'euclid', 8) for t in row]):
        assert n == math.floor(F(x) * 256 + F(1, 2))
    with pytest.raises(ValueError):
        L.snap(np.array([[np.inf, 0.0]]), 'euclid')


@pytest.mark.parametrize('K', [32, 8])
def test_euclid_rounding_near_halves(K):
    """The exact floor(2^K x + 1/2) at every double within 4 ulps of (k + 1/2) / 2^K, both signs, for many k. At
    x = 2^-(K+1) - 2^-(K+54) the binary64 sum 2^K x + 0.5 rounds up to 1 (fence.dyadic's arithmetic); the exact
    value, and the snap, is 0 (learned's READING of A10.6)."""
    edge = float(np.nextafter(2.0 ** -(K + 1), 0.0))
    assert edge == 2.0 ** -(K + 1) - 2.0 ** -(K + 54)
    assert math.floor(edge * 2.0 ** K + 0.5) == 1 and math.floor(F(edge) * 2 ** K + F(1, 2)) == 0
    assert L.snap(np.array([[edge, -edge]]), 'euclid', K) == [(0, 0)]
    vals = []
    for k in list(range(40)) + [2 ** m + j for m in range(5, 51) for j in (-1, 0, 1)]:
        v = (k + 0.5) / 2.0 ** K
        for _ in range(4):
            v = float(np.nextafter(v, -np.inf))
        for _ in range(9):
            vals += [v, -v]
            v = float(np.nextafter(v, np.inf))
    X = np.array(vals).reshape(-1, 2)
    got = [t for row in L.snap(X, 'euclid', K) for t in row]
    assert got == [math.floor(F(x) * 2 ** K + F(1, 2)) for x in vals]


def test_snap_text_roundtrip_and_shas():
    X = lorentz_table(80021, 7, 3)
    N = L.snap(X, 'lorentz')
    offs = [f'{i:08d}' for i in range(7)]
    t = L.snap_text(offs, N)
    assert not t.endswith('\n') and t.count('\n') == 6
    assert t.split('\n')[0] == offs[0] + ' ' + ' '.join(str(v) for v in N[0])
    assert L.parse_snap_text(t) == (offs, N)
    assert L.snap_sha(t) == __import__('hashlib').sha256(t.encode()).hexdigest()
    assert L.float_table_bytes(X) == X.astype('<f8').tobytes()
    try:
        from lexicon import embed
    except ImportError:
        return
    assert L.float_table_sha(X) == embed.table_sha(X)


# ================================================================ the exact key (A10.6)
def random_ball_point(rng, d):
    r = 0.999999 * rng.random() ** 0.25
    while True:
        v = [2 * rng.random() - 1 for _ in range(d)]
        s = math.sqrt(sum(x * x for x in v))
        if s > 1e-3:
            return [r * x / s for x in v]


@pytest.mark.parametrize('K', [32, 8])
def test_key_identity(K):
    rng = Rng(80030 + K)
    four = 4 ** K
    ties = 0
    for t in range(1000):
        d = (2, 3, 5)[t % 3]
        pts = [random_ball_point(rng, d) for _ in range(3)]
        if t % 7 == 0:                                   # an exact tie: n_u = 0, n_w a permutation of n_v
            pts[0] = [0.0] * d
            pts[2] = pts[1][1:] + pts[1][:1]
        N = [dyadic_ints(p, K) for p in pts]
        lifts = [fence.lift(p, K) for p in pts]
        arm = L.DyadicLorentzArm(N, K)
        kap = arm.kappa(0)
        ints = arm.keys(0)
        z = [-EX.lorentz(lifts[0], lifts[v]) for v in range(3)]
        for v in (1, 2):
            assert z[v] == 1 + 2 * four * kap[v] / (four - sum(x * x for x in N[0]))
            assert z[v] == arm.lorentz_neg(0, v)
        sign = lambda x: (x > 0) - (x < 0)                                     # noqa: E731
        assert sign(kap[1] - kap[2]) == sign(z[1] - z[2]) == sign(ints[1] - ints[2])
        ties += kap[1] == kap[2]
        assert kap[0] == 0 and ints[0] == 0
    assert ties >= 1000 // 7


def test_int_key_separates_float_ties():
    """kappas that differ in the 60th bit (equal in binary64) stay distinct and in order; equal kappas tie."""
    N = [(0, 0), (2 ** 30, 0), (2 ** 30, 1), (1, 2 ** 30), (0, 2 ** 30), (-(2 ** 30), 0), (2 ** 30 - 1, 2 ** 15)]
    arm = L.DyadicLorentzArm(N)
    kap, ints = arm.kappa(0), arm.keys(0)
    assert float(kap[1]) == float(kap[2]) and kap[1] < kap[2]
    order_k = sorted(range(len(N)), key=lambda v: (kap[v], v))
    order_i = sorted(range(len(N)), key=lambda v: (ints[v], v))
    assert order_k == order_i
    for v in range(len(N)):
        for w in range(len(N)):
            assert (kap[v] == kap[w]) == (ints[v] == ints[w])
            assert (kap[v] < kap[w]) == (ints[v] < ints[w])


class BruteLift:
    """-<lift_u, lift_v>_L with Fractions from fence.lift and hpstep.exact.lorentz: the key as A10.6 defines it."""

    def __init__(self, P, K):
        self.lifts = [fence.lift(p, K) for p in P]
        self.n = len(P)

    def keys(self, u):
        a = self.lifts[u]
        return [-EX.lorentz(a, b) for b in self.lifts]


class BruteEuclid:
    def __init__(self, N):
        self.N, self.n = N, len(N)

    def keys(self, u):
        return [sum((x - y) ** 2 for x, y in zip(self.N[u], b)) for b in self.N]


def toy_with_ties(seed, n, d, geometry):
    """A table with exact ties: a node at the origin, duplicated rows, and rows that are coordinate permutations and
    sign flips of one another (equidistant from the origin)."""
    X = lorentz_table(seed, n, d, rmax=6.0) if geometry == 'lorentz' else euclid_table(seed, n, d)
    if geometry == 'lorentz':
        X[0] = 0.0
        X[0, 0] = 1.0
        for i in range(1, 25, 3):
            X[i + 1] = X[i]
            X[i + 2, 0] = X[i, 0]
            X[i + 2, 1:] = -X[i, 1:][::-1]
    else:
        X[0] = 0.0
        for i in range(1, 25, 3):
            X[i + 1] = X[i]
            X[i + 2] = -X[i][::-1]
    return X


@pytest.mark.parametrize('K', [32, 8])
@pytest.mark.parametrize('d', [2, 3])
def test_exact_eval_bruteforce(K, d):
    cs = l6_synth.dag(80003, n=120, target=0, words=False)
    nb = [cs.graph_nb, cs.closure_nb]
    X = toy_with_ties(80040 + d, 120, d, 'lorentz')
    N = L.snap(X, 'lorentz', K)
    P = [list(map(float, row)) for row in L.poincare(X).tolist()]
    brute = R.rank_queries(BruteLift(P, K), range(120), nb, workers=1)
    for key in ('int', 'fraction'):
        rs = R.rank_queries(L.DyadicLorentzArm(N, K, key), range(120), nb, workers=1)
        assert [r.ap for r in rs] == [r.ap for r in brute]
        assert [r.ranks for r in rs] == [r.ranks for r in brute]
    ev = L.evaluate(L.DyadicLorentzArm(N, K), {'graph': cs.graph_nb, 'closure': cs.closure_nb})
    assert ev.aps['graph'] == [r.ap[0] for r in brute] and ev.aps['closure'] == [r.ap[1] for r in brute]
    assert ev.map['closure'] == R.map_exact([r.ap[1] for r in brute])
    assert ev.mean_rank['graph'] == R.mean_rank([r.ranks[0] for r in brute])
    assert ev.ties > 0
    # Euclidean: rank.Arm('euclid') over 2^K against |n_u - n_v|^2
    Xe = toy_with_ties(80050 + d, 120, d, 'euclid')
    Ne = L.snap(Xe, 'euclid', K)
    ref = R.rank_queries(BruteEuclid(Ne), range(120), nb, workers=1)
    arm = L.dyadic_euclid_arm(Ne, K)
    assert isinstance(arm, R.Arm) and arm.kind == 'euclid' and arm.den == 2 ** K
    rs = R.rank_queries(arm, range(120), nb, workers=1)
    assert [r.ap for r in rs] == [r.ap for r in ref] and [r.ranks for r in rs] == [r.ranks for r in ref]
    eve = L.evaluate(arm, {'graph': cs.graph_nb, 'closure': cs.closure_nb})
    assert eve.aps['closure'] == [r.ap[1] for r in ref]
    assert eve.ties > 0


def test_evaluate_pool_matches_serial_and_none_aps():
    cs = l6_synth.dag(80004, n=200, target=0, words=False)
    graph = [list(v) for v in cs.graph_nb]
    graph[5] = []                                          # a query without graph-edge neighbours
    for u in range(200):
        if 5 in graph[u]:
            graph[u] = [v for v in graph[u] if v != 5]
    X = lorentz_table(80060, 200, 3)
    arm = L.snapped_arm(L.snap(X, 'lorentz'), 'lorentz')
    a = L.evaluate(arm, {'graph': graph, 'closure': cs.closure_nb}, workers=1, fractional=True)
    b = L.evaluate(arm, {'graph': graph, 'closure': cs.closure_nb}, workers=3, fractional=True)
    assert a.aps == b.aps and a.ranks == b.ranks and a.map == b.map and a.ties == b.ties
    assert a.frac_aps == b.frac_aps and a.mean_rank == b.mean_rank
    assert a.aps['graph'][5] is None and a.ranks['graph'][5] == [] and a.frac_aps['graph'][5] is None
    assert a.map['graph'] == R.map_exact([x for x in a.aps['graph'] if x is not None])
    with pytest.raises(ValueError):
        L.evaluate(arm, {'closure': cs.closure_nb[:-1]})
    sample = [150, 3, 77, 5]                               # a query sample, in the order given
    c = L.evaluate(arm, {'graph': graph, 'closure': cs.closure_nb}, workers=1, fractional=True, queries=sample)
    assert c.query_ids == sample and c.queries == 4
    assert c.aps['closure'] == [a.aps['closure'][u] for u in sample]
    assert c.frac_aps['graph'] == [a.frac_aps['graph'][u] for u in sample]
    assert c.map['closure'] == R.map_exact([a.aps['closure'][u] for u in sample])


# ================================================================ float64 evaluation (A10.10)
def py_lorentz_key(x, y):
    acc = x[0] * y[0]
    for k in range(1, len(x)):
        acc = acc - x[k] * y[k]
    return acc


def py_euclid_key(x, y):
    t = x[0] - y[0]
    acc = t * t
    for k in range(1, len(x)):
        t = x[k] - y[k]
        acc = acc + t * t
    return acc


@pytest.mark.parametrize('d', [2, 3, 13, 50])
def test_float_eval_order(d):
    for geometry, X, f in (('lorentz', lorentz_table(80070 + d, 150, d, rmax=12.0), py_lorentz_key),
                           ('euclid', euclid_table(80080 + d, 150, d), py_euclid_key)):
        arm = L.FloatArm(X, geometry)
        rows = X.tolist()
        for u in (0, 1, 77, 149):
            keys = arm.keys(u)
            ref = [f(rows[u], y) for y in rows]
            assert [k.hex() for k in keys] == [k.hex() for k in ref]


def test_float_ties_pessimistic():
    """Equal float keys tie, and a neighbour tied with a non-neighbour ranks after it."""
    X = np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [-1.0, 0.0], [3.0, 0.0]])
    nb = [[1], [0], [0], [0], [0]]
    ev = L.evaluate(L.FloatArm(X, 'euclid'), {'c': nb})
    # query 0: candidates 1, 2, 3 tie at 1.0, then 4; the neighbour 1 ranks after the two tied non-neighbours
    assert ev.aps['c'][0] == F(1, 3)
    assert ev.ranks['c'][0] == [3]
    assert ev.ties == 2 + 1 + 1                          # query 0: 1, 2, 3 tie; query 1: 3, 4; query 2: 1, 3
    Xl = np.array([lorentz_row([0.0, 0.0]), lorentz_row([0.5, 0.0]), lorentz_row([0.0, 0.5]),
                   lorentz_row([0.0, -0.5]), lorentz_row([2.0, 0.0])])
    evl = L.evaluate(L.FloatArm(Xl, 'lorentz'), {'c': [[3], [0], [0], [0], [0]]})
    assert evl.aps['c'][0] == F(1, 3) and evl.ranks['c'][0] == [3]
    with pytest.raises(ValueError):
        L.FloatArm(np.array([[1e300, 1e300, 0.0], [1e300, -1e300, 0.0]]), 'lorentz').keys(0)   # inf - inf


# ================================================================ fractional-tie AP (A10.11)
def brute_fractional(keys, u, nb):
    """The mean, over every order of every tie class holding a neighbour, of the AP with ties broken in that order
    (classes without neighbours, or of neighbours only, cannot move a neighbour's precision)."""
    cand = [v for v in range(len(keys)) if v != u]
    classes = {}
    for v in cand:
        classes.setdefault(keys[v], []).append(v)
    ordered = [classes[k] for k in sorted(classes)]
    nbs = set(nb)
    perms = [list(itertools.permutations(c)) if (nbs & set(c)) and not set(c) <= nbs else [tuple(c)]
             for c in ordered]
    total, count = F(0), 0
    for choice in itertools.product(*perms):
        order = [v for c in choice for v in c]
        hits, s = 0, F(0)
        for pos, v in enumerate(order, 1):
            if v in nbs:
                hits += 1
                s += F(hits, pos)
        total += s / len(nb)
        count += 1
    return total / count


def test_fractional_ap():
    rnd = random.Random(80900)
    checked = 0
    while checked < 300:
        n = rnd.randint(4, 16)
        sizes = []
        while sum(sizes) < n:
            sizes.append(rnd.randint(1, 5))
        keys, val = [], 0
        for m in sizes:
            val += rnd.randint(1, 3)
            keys.extend([val] * m)
        keys = keys[:n]
        rnd.shuffle(keys)
        u = rnd.randrange(n)
        others = [v for v in range(n) if v != u]
        nb = sorted(rnd.sample(others, rnd.randint(1, len(others))))
        S = L.query_sorted(keys, u)
        cand_classes = {}
        for v in others:
            cand_classes.setdefault(keys[v], set()).add(v)
        work = 1
        for c in cand_classes.values():
            if c & set(nb) and not c <= set(nb):
                work *= math.factorial(len(c))
        if work > 20000:
            continue
        got = L.fractional_ap(S, keys, nb)
        assert got == brute_fractional(keys, u, nb)
        pess, _ = R._ap_and_ranks(S, keys, nb)
        assert pess <= got
        checked += 1
    # no ties: the pessimistic AP itself
    keys = list(range(30))
    rnd.shuffle(keys)
    S = L.query_sorted(keys, 3)
    nb = [1, 4, 9, 20, 29]
    assert L.fractional_ap(S, keys, nb) == R._ap_and_ranks(S, keys, nb)[0]
    assert L.fractional_ap(S, keys, []) is None


def test_fractional_in_evaluate_and_random_baseline():
    cs = l6_synth.dag(80005, n=90, target=0, words=False)
    X = lorentz_table(80090, 90, 2, rmax=4.0)
    arm = L.snapped_arm(L.snap(X, 'lorentz', 8), 'lorentz', 8)            # coarse: many exact ties
    ev = L.evaluate(arm, {'closure': cs.closure_nb}, fractional=True)
    assert ev.ties > 0
    for u in range(90):
        keys = arm.keys(u)
        assert ev.frac_aps['closure'][u] == L.fractional_ap(L.query_sorted(keys, u), keys, cs.closure_nb[u])
        assert ev.frac_aps['closure'][u] >= ev.aps['closure'][u]
    assert ev.frac_map['closure'] >= ev.map['closure']
    # a ranking in which every candidate ties: the fractional MAP is the random-ranking expectation of A10.9
    class AllTie:
        n = 90

        def keys(self, u):
            return [0] * 90
    evt = L.evaluate(AllTie(), {'closure': cs.closure_nb}, fractional=True)
    assert evt.frac_map['closure'] == l6.random_ranking_map(cs.closure_nb)


# ================================================================ the rank structure (reported diagnostics)
def test_structure_ap():
    cs = l6_synth.dag(80006, n=150, target=0, words=False)
    for X, geometry, K in ((lorentz_table(80100, 150, 3), 'lorentz', 32), (lorentz_table(80101, 150, 2, 3.0),
                                                                           'lorentz', 8),
                           (euclid_table(80102, 150, 2, 0.05), 'euclid', 8)):
        arm = L.snapped_arm(L.snap(X, geometry, K), geometry, K)
        lt, le = L.rank_structure(arm)
        assert lt.dtype == np.int32 and (lt <= le).all()
        for j in range(3):
            P = l6.label_permutation(80400 + j, 150)
            nbr = l6.relabel(cs.closure_nb, P)
            ev = L.evaluate(arm, {'c': nbr})
            ap = L.ap_float_structure(lt, le, nbr)
            for u in range(150):
                assert abs(ap[u] - float(ev.aps['c'][u])) <= 1e-12
            assert abs(L.map_float_structure(lt, le, nbr) - float(ev.map['c'])) <= 1e-12


# ================================================================ displacement, distances, bits (A10.10, A10.11)
def dec(q, prec=60):
    getcontext().prec = prec
    return Decimal(q.numerator) / Decimal(q.denominator)


def dec_acosh(z):
    getcontext().prec = 60
    return (z + (z * z - 1).sqrt()).ln()


def dec_acosh1p(w):
    """arcosh(1 + w) for w >= 0, without cancellation: ln(1 + w + sqrt(w (w + 2)))."""
    getcontext().prec = 80
    return (1 + w + (w * (w + 2)).sqrt()).ln()


def test_displacement():
    X = np.vstack([lorentz_table(80110, 60, 2, rmax=24.0), rim_rows()[:-3]])
    X = X[[sum(F(v) ** 2 for v in p) < 1 for p in L.poincare(X).tolist()]]    # rows strictly inside the ball
    N = L.snap(X, 'lorentz')
    got = L.displacement(X, N, 'lorentz')
    best = Decimal(0)
    for prow, n in zip(L.poincare(X).tolist(), N):
        p = [F(v) for v in prow]
        q = [F(t, 2 ** 32) for t in n]
        Rr = sum((a - b) ** 2 for a, b in zip(p, q)) / ((1 - sum(a * a for a in p)) * (1 - sum(b * b for b in q)))
        best = max(best, dec_acosh1p(dec(2 * Rr, 80)))
    assert best > 0
    assert abs(Decimal(got) - best) <= best * Decimal('1e-12')
    on_rim = np.array([[1e17, 1e17, 0.0], [1.0, 0.0, 0.0]])        # p = (1.0, 0): 1 - |p|^2 = 0
    assert L.displacement(on_rim, L.snap(on_rim, 'lorentz'), 'lorentz') == math.inf
    Xe = np.array([[0.1, -0.3], [1.0 / 3.0, 2.0 ** -40], [12345.678, -0.5]])
    Ne = L.snap(Xe, 'euclid')
    ref = 0.0
    for xr, nr in zip(Xe.tolist(), Ne):
        ref = max(ref, math.sqrt(float(sum((F(x) - F(t, 2 ** 32)) ** 2 for x, t in zip(xr, nr)))))
    assert L.displacement(Xe, Ne, 'euclid') == ref
    assert 0 < ref <= math.sqrt(2) * 2.0 ** -33


def test_snapped_distances():
    X = np.vstack([lorentz_table(80120, 40, 3, rmax=21.0), [lorentz_row([0.0, 0.0, 0.0])]])
    X[5] = X[4]
    N = L.snap(X, 'lorentz')
    pairs = L.all_pairs(len(N))
    got = L.snapped_distances(N, 'lorentz', None)
    P = L.poincare(X).tolist()
    lifts = [fence.lift(p, 32) for p in P]
    for (u, v), g in zip(pairs, got):
        z = -EX.lorentz(lifts[u], lifts[v])
        if z == 1:
            assert g == 0.0
            continue
        ref = dec_acosh1p(dec(z - 1, 80))
        assert abs(Decimal(g) - ref) <= ref * Decimal('1e-12')
    sub = [(3, 9), (0, 40), (39, 1)]
    assert L.snapped_distances(N, 'lorentz', sub).tolist() == [got[pairs.index((min(a, b), max(a, b)))]
                                                              for a, b in sub]
    Xe = euclid_table(80121, 30, 4, scale=50.0)
    Ne = L.snap(Xe, 'euclid')
    arm = L.dyadic_euclid_arm(Ne)
    de = L.snapped_distances(Ne, 'euclid')
    for (u, v), g in zip(L.all_pairs(30), de):
        assert g == arm.dist(u, v)
        ref = dec(F(sum((a - b) ** 2 for a, b in zip(Ne[u], Ne[v])), 4 ** 32)).sqrt()
        assert abs(Decimal(g) - ref) <= ref * Decimal('1e-15')
    # big Euclidean integers take the exact Python path
    Nb = [(2 ** 50, -(2 ** 49)), (-(2 ** 50), 3), (0, 0)]
    db = L.snapped_distances(Nb, 'euclid')
    armb = L.dyadic_euclid_arm(Nb)
    assert db.tolist() == [armb.dist(u, v) for u, v in L.all_pairs(3)]


def test_distortion():
    dist = np.array([1.0, 2.0, 3.0, 4.0, 9.0])
    dT = np.array([1.0, 1.0, 2.0, 0.0, 3.0])
    value, tau = L.distortion(dist, dT)
    assert tau == float(np.median([1.0, 2.0, 1.5, 3.0]))
    assert value == math.fsum([abs(1 / tau - 1), abs(2 / tau - 1), abs(3 / (2 * tau) - 1), abs(9 / (3 * tau) - 1)]) / 4
    v7, t7 = L.distortion(dist, dT, math.log(7))
    assert t7 == math.log(7)
    words = [(0,), (0, 1), (0, 1, 2), (3,)]
    from hpstep.problems import tree_distance
    assert L.tree_distances(words).tolist() == [tree_distance(words[u], words[v]) for u, v in L.all_pairs(4)]


def bits_ref(coords):
    """Numerator bits plus denominator bits over the point's own common denominator, from Fractions."""
    D = 1
    for c in coords:
        D = D * c.denominator // math.gcd(D, c.denominator)
    return sum(abs(c.numerator * (D // c.denominator)).bit_length() for c in coords) + D.bit_length()


def test_bits_and_ties():
    N = [(0, 0), (1, 0), (2 ** 31, -(2 ** 31) + 1), (-5, 12)]
    mean, mx = L.bits(N, 'lorentz')
    ref = []
    for n in N:
        s = sum(t * t for t in n)
        ref.append(bits_ref([F(FOUR32 + s, FOUR32 - s)] + [F(2 ** 33 * t, FOUR32 - s) for t in n]))
    assert ref[0] == 2
    assert mean == F(sum(ref), len(ref)) and mx == max(ref)
    lift = fence.lift([F(t, 2 ** 32) for t in N[3]], 32)
    assert ref[3] == bits_ref(lift)
    mean_e, mx_e = L.bits(N, 'euclid')
    ref_e = [bits_ref([F(t, 2 ** 32) for t in n]) for n in N]
    assert ref_e[0] == 1 and mean_e == F(sum(ref_e), 4) and mx_e == max(ref_e)
    # exact ties: rows 1 and 2 coincide; query 0 sees 1 and 2 tie, so does query 3
    Nt = [(0, 0), (7, 3), (7, 3), (100, -50)]
    ev = L.evaluate(L.DyadicLorentzArm(Nt), {'c': [[1], [0], [0], [0]]})
    assert ev.ties == 2 and ev.tied_queries == 2
    evf = L.evaluate(L.FloatArm(np.array([[0.0, 0.0], [7.0, 3.0], [7.0, 3.0], [100.0, -50.0]]), 'euclid'),
                     {'c': [[1], [0], [0], [0]]})
    assert evf.ties == 2


def test_no_registered_seed_calls():
    """No call in these modules or tests passes a registered literal seed to Rng or label_permutation (P is computed
    only by the runner's registered --measure path)."""
    import ast
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    files = [os.path.join(here, '..', 'lexicon', 'learned.py'), os.path.join(here, '..', 'lexicon', 'l6.py'),
             os.path.join(here, 'test_learned.py'), os.path.join(here, 'test_l6.py')]
    bad = []
    for path in files:
        tree = ast.parse(open(path, encoding='utf-8').read())
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not node.args:
                continue
            name = getattr(node.func, 'id', None) or getattr(node.func, 'attr', None)
            a = node.args[0]
            if name in ('Rng', 'label_permutation', 'edge_pairs_seed', 'floor_table') and \
                    isinstance(a, ast.Constant) and isinstance(a.value, int) and l6_synth.guarded(a.value):
                bad.append((os.path.basename(path), node.lineno, a.value))
    assert bad == []


def test_l6_trace_is_current():
    """traces/l6_v1.txt, which tests/parity-lexicon.cjs makes the browser core reproduce line for line, equals a
    rebuild from the current reference (traces_l6.py --check), so a change to learned.py cannot leave the browser's
    parity line passing against a stale trace."""
    import os
    import subprocess
    import sys
    ref = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = subprocess.run([sys.executable, '-B', os.path.join(ref, 'traces_l6.py'), '--check'], capture_output=True,
                         text=True)
    assert out.returncode == 0, out.stdout + out.stderr
