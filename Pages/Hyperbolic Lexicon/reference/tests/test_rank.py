"""Exact ranking (Amendment 1, item 5) against a brute-force Fraction implementation of the item as written, spike S3's
verb-forest MAPs reproduced exactly (the key cross-check of the address rule, the H^3 points and pessimistic AP), the
fork pool's determinism, Hyperbolic Oracles' ci_mean (extracted from run_bench.py itself), distortion and bits."""
import ast
import hashlib
import math
import os
import sys
from fractions import Fraction as F

import numpy as np
import pytest

from hpstep.prng import Rng
from hpstep.problems import children
from lexicon import HPSTEP_REFERENCE
from lexicon import address as A
from lexicon import flat
from lexicon import h2exact as H2
from lexicon import h3tree as H3
from lexicon import rank as R
from lexicon import wordnet as W

sys.set_int_max_str_digits(0)
S3 = {   # s3_wordnet_shape_output.txt, section 5 (Python) = section 3 (Node)
    'graph_map': '2e428dd7f198b81b0ee0e824404aefaf40ed3542a292c761eb7664968ad0efb2',
    'graph_ap': '65b4d27e237d90c65fe5bbbec41cff9ae2124bc91c96e2c733a3f741bd629b49',
    'closure_map': 'f274ad0b43f3ea8fb489efda272cf8799ec68ccf1a856e2a264b3b50afd49e85',
    'closure_ap': '6f9f6dbbe6d647257b2c24945914df8b6c4392d171ed9faa284249ed037b20fc',
    'sample2000': 'e23654ac205da3bce4f22d74d1af8fa900dee66e7b464692fb1eaa070eb36297',
    'sample1000': '3b565d87fd8778b33f9d0329a2d92d7db19a78337a17685534cf1500a1441b05',
}


def qsha(q):
    return hashlib.sha256(f'{q.numerator}/{q.denominator}'.encode()).hexdigest()


def random_word(rng, L):
    w = [rng.below(6)]
    while len(w) < L:
        w.append(children(w)[rng.below(5)])
    return tuple(w)


# ================================================================ brute force, item 5 as written
def naive(points, kind, u, nb, offsets):
    """points: exact Fraction vectors. Returns (rank list text, AP, neighbour ranks in nb's order)."""
    def key(x, y):
        if kind == 'lorentz':
            return x[0] * y[0] - sum(a * b for a, b in zip(x[1:], y[1:]))         # -<x, y>
        return sum((a - b) ** 2 for a, b in zip(x, y))
    cands = [v for v in range(len(points)) if v != u]
    k = {v: key(points[u], points[v]) for v in cands}
    by_key = sorted(cands, key=lambda v: (k[v], offsets[v]))
    classes = sorted(set(k.values()))
    text = '\n'.join(f'{offsets[v]} {classes.index(k[v])}' for v in by_key)
    nbs = set(nb)
    ap_order = sorted(cands, key=lambda v: (k[v], v in nbs, offsets[v]))
    hits, total = 0, F(0)
    for pos, v in enumerate(ap_order, 1):
        if v in nbs:
            hits += 1
            total += F(hits, pos)
    ap = total / len(nbs) if nbs else None
    ranks = [1 + sum(1 for v in cands if v not in nbs and k[v] <= k[x]) for x in nb]
    return text, ap, ranks


def small_arms():
    rng = Rng(8540)
    words = sorted({random_word(rng, 1 + rng.below(7)) for _ in range(160)})
    offsets = [f'{1000 + 7 * i:08d}' for i in range(len(words))]
    out = []
    for name, arm in (('H3', H3.arm(words)), ('H2', H2.arm(words)), ('F3', flat.arm(words, 3)),
                      ('F3*', flat.arm(words, 3, True)), ('F2', flat.arm(words, 2))):
        pts = [[F(x, arm.den) for x in arm.vector(i)] for i in range(arm.n)]
        out.append((name, arm, pts))
    return words, offsets, out


def test_rank_query_equals_brute_force():
    words, offsets, arms = small_arms()
    rng = Rng(8541)
    n = len(words)
    tables = []
    for _ in range(3):
        tab = []
        for u in range(n):
            k = rng.below(6)
            tab.append(sorted({v for v in (rng.below(n) for _ in range(k)) if v != u}))
        tables.append(tab)
    ties_seen = 0
    for name, arm, pts in arms:
        for u in Rng(8542).sample(n, 25):
            res = R.rank_query(arm, u, tables, offsets, 'text')
            for t, tab in enumerate(tables):
                text, ap, ranks = naive(pts, arm.kind, u, tab[u], offsets)
                assert res.text == text and res.sha == hashlib.sha256(text.encode()).hexdigest()
                assert res.ap[t] == ap and res.ranks[t] == ranks, (name, u, t)
            ties_seen += len({line.split()[1] for line in res.text.split('\n')}) < arm.n - 1
            res2 = R.rank_query(arm, u, tables)                     # the bisect path (no rank list)
            assert res2.ap == res.ap and res2.ranks == res.ranks
    assert ties_seen                                                # F3 collides: exact ties were exercised


def test_pessimistic_ties_by_hand():
    # four candidates around a query at 0 in R^1 (as a degenerate 'euclid' arm): keys 1, 1, 4, 4
    arm = R.Arm('toy', 'euclid', [[0, 1, -1, 2, -2]], 1)
    res = R.rank_query(arm, 0, [[[2, 3]]], ['a', 'b', 'c', 'd', 'e'], 'text')
    # order (key; non-neighbours first; offset): b(1) c(1,nb) e(4) d(4,nb) -> AP = (1/2 + 2/4) / 2
    assert res.ap == [F(1, 2)] and res.ranks == [[2, 3]]
    assert res.text == 'b 0\nc 0\nd 1\ne 1'


def test_pool_is_deterministic():
    words, offsets, arms = small_arms()
    _, arm, _ = arms[0]
    tab = [[v for v in (u - 1, u + 1) if 0 <= v < arm.n] for u in range(arm.n)]
    qs = list(range(arm.n))
    a = R.rank_queries(arm, qs, [tab], offsets, 'sha', workers=1)
    b = R.rank_queries(arm, qs, [tab], offsets, 'sha', workers=4)
    assert a == b and [r.query for r in b] == qs
    with pytest.raises(ValueError):
        R.rank_queries(arm, qs, [tab], offsets[::-1], 'sha', workers=4)


def test_reproduces_s3_verb_forest_maps(wn):
    """Spike S3: verb-forest graph-edge MAP 0.6309 (exact rational, sha256 2e428dd7...), closure MAP 0.4206, the
    per-query AP hashes and the two sample MAPs, with the address rule, H^3 points and pessimistic AP of lexicon."""
    vw = A.verb_words(wn)
    offs = sorted(vw)
    words = [vw[o] for o in offs]
    parent, kids, _ = W.spanning_forest(wn['synsets']['verb'])
    g_nb = R.graph_neighbours(offs, parent, kids)
    anc = W.closure(wn['synsets']['verb'])
    c_nb = R.closure_neighbours(offs, anc, W.descendants(anc))
    queries = [i for i in range(len(offs)) if g_nb[i]]
    assert len(queries) == 13542
    res = R.rank_queries(H3.arm(words), queries, [g_nb, c_nb], workers=4)
    ap_g, ap_c = [r.ap[0] for r in res], [r.ap[1] for r in res]
    mg, mc = R.map_exact(ap_g), R.map_exact(ap_c)
    assert qsha(mg) == S3['graph_map'] and str(float(mg))[:6] == '0.6308'
    assert qsha(mc) == S3['closure_map']
    for key, aps in (('graph_ap', ap_g), ('closure_ap', ap_c)):
        text = ''.join(f'{offs[r.query]} {a.numerator}/{a.denominator}\n' for r, a in zip(res, aps))
        assert hashlib.sha256(text.encode()).hexdigest() == S3[key]
    assert qsha(R.map_exact([ap_g[i] for i in Rng(90000).sample(13542, 2000)])) == S3['sample2000']
    assert qsha(R.map_exact([ap_g[i] for i in Rng(90001).sample(13542, 1000)])) == S3['sample1000']


# ================================================================ metrics
def test_ci_mean_is_run_bench_ci_mean():
    path = os.path.join(HPSTEP_REFERENCE, 'run_bench.py')
    tree = ast.parse(open(path, encoding='utf-8').read())
    fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'ci_mean')
    ns = {'np': np}
    exec(compile(ast.Module(body=[fn], type_ignores=[]), path, 'exec'), ns)
    rng = Rng(8543)
    for n in (5, 200, 1000):
        v = [rng.random() - 0.4 for _ in range(n)]
        assert R.ci_mean(v) == ns['ci_mean'](v)
    fr = [F(1, 3), F(2, 7), F(-1, 9)]
    assert R.ci_mean(R.paired_diffs(fr, [F(0)] * 3)) == ns['ci_mean']([float(x) for x in fr])


def test_exact_means():
    xs = [F(1, k) for k in range(1, 400)]
    assert R.exact_sum(xs) == sum(xs) and R.exact_sum([]) == 0
    assert R.map_exact([F(1), None, F(1, 2)]) == F(3, 4)
    assert R.mean_rank([[1, 2], [], [6]]) == 3
    assert R.mean_over_permutations([[F(1), F(0)], [F(1, 2), F(1)]]) == [F(3, 4), F(1, 2)]
    assert R.paired_diffs([F(1, 3)], [F(1, 4)]) == [1 / 3 - 1 / 4]


def test_neighbour_tables():
    offsets = ['a', 'b', 'c', 'd']
    parent = {'a': None, 'b': 'a', 'c': 'a', 'd': 'c', 'x': 'd'}
    kids = {'a': ['b', 'c'], 'c': ['d'], 'd': ['x']}
    assert R.graph_neighbours(offsets, parent, kids) == [[1, 2], [0], [0, 3], [2]]
    anc = {'a': set(), 'b': {'a'}, 'c': {'a'}, 'd': {'a', 'c'}}
    assert R.closure_neighbours(offsets, anc, W.descendants(anc)) == [[1, 2, 3], [0], [0, 3], [0, 2]]
    assert R.graph_neighbours(offsets[2:], parent, kids) == [[1], [0]]


def test_distortion_and_distances():
    straight = [tuple([0] * L) for L in range(1, 9)]             # a geodesic in H^3 and H^2, a line in F
    for arm, tau in ((H3.arm(straight), math.log(7)), (H2.arm(straight), math.log(12)), (flat.arm(straight, 3), 1)):
        assert abs(arm.tau - tau) < 1e-15
        assert R.distortion(arm, [(0, 7), (2, 5), (1, 1)], straight) < 1e-12
    arm = H3.arm(straight)
    assert abs(arm.dist(0, 7) - 7 * math.log(7)) < 1e-12
    assert R.acosh_ratio(5, 5) == 0.0
    assert abs(R.acosh_ratio(10 ** 400, 1) - math.acosh(1e300) - 100 * math.log(10)) < 1e-9
    for n, d in ((3, 2), (10 ** 30 + 7, 10 ** 20), (25, 7)):
        assert abs(R.acosh_ratio(n, d) - math.acosh(n / d)) < 1e-12 * max(1, math.acosh(n / d))


def test_bits_per_node():
    words = [(0,), (0, 0)]
    pts = H3.points(words)
    mean, mx = R.bits_per_node(pts, [7, 49])
    assert mx == H3.point_bits(pts[1], 49) and mean == F(H3.point_bits(pts[0], 7) + mx, 2)
