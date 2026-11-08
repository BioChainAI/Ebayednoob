"""lexicon.scores2 and lexicon.wngraph (Amendment 13, items 4-6; build spec sections 5-6, tests 5-7 and 11 of
section 13): the certified order against a Fraction-interval oracle (integer square roots to 900 bits), equal tuples,
constructed exact equalities, the 240-digit path, chained ties, ordinal codes, e^G against arcosh sums, the score
properties on synthetic trees and on the dry verbs, Phi and Dep°, the learned tables' formulas, GloVe's key, the
reported forms, W and S-full against independent implementations, and WordNet's graph against brute force.

Synthetic data, the dry data (WordNet's verbs, no rating read) and seeds 95200 + i only (A13.12): nothing is scored
on any Stage-2 instance."""
import itertools
import math
import random
from collections import deque
from decimal import ROUND_HALF_EVEN, Context, Decimal
from fractions import Fraction as F

import numpy as np
import pytest

import hpstep.prng as hpstep_prng
from hpstep.problems import children
from lexicon import address as A
from lexicon import h2exact, h3tree, l6
from lexicon import scores2 as S
from lexicon import wngraph as G
from lexicon import wordnet as W

ALLOWED = range(95200, 95500)                   # tests' unregistered seeds (A13.12; spec section 0)


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    """hpstep.prng.Rng, numpy's default_rng and RandomState refuse every seed but 95200 + i (i < 300)."""
    init = hpstep_prng.Rng.__init__

    def rng_init(self, seed=0, state=None):
        if state is None and seed not in ALLOWED:
            raise RuntimeError(f'seed {seed} is not a test seed (95200 + i)')
        return init(self, seed, state)
    monkeypatch.setattr(hpstep_prng.Rng, '__init__', rng_init)
    real_default = np.random.default_rng

    def default_rng(seed=None):
        if seed not in ALLOWED:
            raise RuntimeError(f'numpy seed {seed} is not a test seed')
        return real_default(seed)
    monkeypatch.setattr(np.random, 'default_rng', default_rng)


def rwords(r, n, lo=0, hi=12):
    """n random reduced words (hpstep.problems.children), lengths lo..hi."""
    out = []
    for _ in range(n):
        L = r.randint(lo, hi)
        w = []
        for _ in range(L):
            w.append(r.randrange(6) if not w else r.choice(children(w)))
        out.append(tuple(w))
    return out


def tables(words):
    return {'H3': S.h3_table(words), 'H2': S.h2_table(words), 'F3': S.flat_table(words, 3),
            'F3*': S.flat_table(words, 3, True), 'F2': S.flat_table(words, 2), 'F2*': S.flat_table(words, 2, True)}


# ================================================================ the oracle: exact integer square roots
# The spec's oracle takes square roots to 400 bits (about 120 digits), enough to check every 120-digit decision; at
# 900 bits (about 271 digits) it also resolves every 240-digit decision and confirms that a numerical tie holds values
# closer than the 240-digit bounds. math.isqrt gives the floor of the root exactly (what bisection converges to).
BITS = 900


def sqrt_iv(q):
    """[lo, hi] Fractions around sqrt(q), q >= 0 rational: floor(sqrt(n d 4^B)) / (d 2^B) and the next unit."""
    q = F(q)
    n, d = q.numerator, q.denominator
    s = math.isqrt(n * d * 4 ** BITS)
    lo = F(s, d * 2 ** BITS)
    return lo, (lo if s * s == n * d * 4 ** BITS else F(s + 1, d * 2 ** BITS))


def E_iv(z):
    lo, hi = sqrt_iv((F(z) - 1) * (F(z) + 1))
    return F(z) + lo, F(z) + hi


def oracle(form, tup):
    if form == 'hG':
        (a0, a1), (b0, b1), (k0, k1) = E_iv(tup[0]), E_iv(tup[1]), E_iv(tup[2])
        return a0 / (b1 * k1), a1 / (b0 * k0)
    if form == 'hDep':
        (a0, a1), (b0, b1) = E_iv(tup[0]), E_iv(tup[1])
        return a0 / b1, a1 / b0
    r = [sqrt_iv(x) for x in tup]
    if form == 'fG':
        return r[0][0] - r[1][1] - r[2][1], r[0][1] - r[1][0] - r[2][0]
    return r[0][0] - r[1][1], r[0][1] - r[1][0]


def random_tuples(r, form, n):
    """Tuples from synthetic trees (pairs of random words in the six arms) and random rationals."""
    out = []
    ws = rwords(r, 60, 0, 14)
    words = {f'{i:08d}': w for i, w in enumerate(ws)}
    tbs = tables(words)
    keys = list(words) + [S.O]
    hs = [tbs['H3'], tbs['H2']]
    fs = [tbs['F3'], tbs['F3*'], tbs['F2'], tbs['F2*']]
    while len(out) < n:
        s, t = r.choice(keys), r.choice(keys)
        if form in ('hG', 'hDep'):
            if r.random() < 0.7:
                tb = r.choice(hs)
                out.append(tb.g_tuple(s, t) if form == 'hG' else tb.dep_tuple(s, t))
            else:
                k = 3 if form == 'hG' else 2
                out.append(tuple(1 + F(r.randrange(0, 10 ** r.randint(1, 30)), r.randrange(1, 10 ** r.randint(1, 30)))
                                 for _ in range(k)))
        else:
            if r.random() < 0.7:
                tb = r.choice(fs)
                out.append(tb.g_tuple(s, t) if form == 'fG' else tb.dep_tuple(s, t))
            else:
                k = 3 if form == 'fG' else 2
                out.append(tuple(F(r.randrange(0, 10 ** r.randint(1, 30)), r.randrange(1, 10 ** r.randint(1, 30)))
                                 for _ in range(k)))
    return out


@pytest.mark.parametrize('form', S.FORMS)
def test_certified_order_against_oracle(form):
    """Test 5: 2,500 tuples per form (10,000 in all): each 120-digit value lies within a millionth of its bound of
    the true value; tie classes order every adjacent pair of classes as the oracle does; cmp agrees with the oracle
    on 2,500 random pairs and on every pair adjacent in the certified order."""
    r = random.Random(95200 + S.FORMS.index(form))
    tups = random_tuples(r, form, 2500)
    cert = S.Certifier()
    vals = [S.Val(form, t) for t in tups]
    tc = cert.tie_classes(vals)
    iv = [oracle(form, t) for t in tups]
    for v, (lo, hi) in zip(vals, iv):
        cert.ensure(v)
        x = F(v.v1)
        tol = F(v.e1) / 10 ** 6
        assert lo - tol <= x <= hi + tol
    order = sorted(range(len(tups)), key=lambda i: tc.codes[i])
    by_code = {}
    for i in order:
        by_code.setdefault(tc.codes[i], []).append(i)
    codes = sorted(by_code)
    assert codes == list(range(tc.n_classes))
    for c0, c1 in zip(codes, codes[1:]):
        top = max(iv[i][1] for i in by_code[c0])
        bottom = min(iv[i][0] for i in by_code[c1])
        assert top < bottom, (c0, c1)
    for c in codes:                              # a class of distinct tuples holds equal (or numerically tied) values
        members = by_code[c]
        if len({S._tkey(tups[i]) for i in members}) > 1:
            span = max(iv[i][1] for i in members) - min(iv[i][0] for i in members)
            assert span <= 2 * max(F(cert.ensure(vals[i], S.P2).e2) for i in members)
    pairs = [(r.randrange(len(tups)), r.randrange(len(tups))) for _ in range(2500)] + list(zip(order, order[1:]))
    for i, j in pairs:
        c = cert.cmp(S.Val(form, tups[i]), S.Val(form, tups[j]))
        if iv[i][0] > iv[j][1]:
            assert c == 1
        elif iv[i][1] < iv[j][0]:
            assert c == -1
        else:
            assert c == 0
        assert c == (tc.codes[i] > tc.codes[j]) - (tc.codes[i] < tc.codes[j])


def test_equal_tuples_tie_without_computation():
    r = random.Random(95210)
    words = dict(enumerate(rwords(r, 5, 3, 8)))
    h = S.h3_table(words)
    a = S.Val('hG', h.g_tuple(0, 1))
    b = S.Val('hG', tuple(F(x.numerator, x.denominator) for x in h.g_tuple(0, 1)))
    cert = S.Certifier()
    assert cert.cmp(a, b) == 0
    assert a.v1 is None and b.v1 is None and cert.recomputed == 0 and cert.n_ties == 0
    vals = [S.Val('hG', h.g_tuple(0, 1)) for _ in range(5)] + [S.Val('hG', h.g_tuple(1, 2))]
    tc = cert.tie_classes(vals)
    assert tc.codes[:5] == [tc.codes[0]] * 5 and tc.n_distinct == 2 and tc.recomputed == 0 and tc.tie_tuples == 0
    with pytest.raises(ValueError):
        cert.cmp(S.Val('hG', h.g_tuple(0, 1)), S.Val('hDep', h.dep_tuple(0, 1)))


def test_constructed_exact_equalities_tie():
    """G = 0 when t = o and when s = t (H), and collinear flat points (irrational square roots included) form one
    numerical tie class at the top, recomputed at 240 digits and counted."""
    r = random.Random(95211)
    ws = rwords(r, 6, 2, 9)
    words = dict(enumerate(ws))
    h = S.h3_table(words)
    vals = [S.Val('hG', h.g_tuple(k, S.O)) for k in words] + [S.Val('hG', h.g_tuple(k, k)) for k in words]
    vals.append(S.Val('hG', h.g_tuple(0, 1)))
    cert = S.Certifier()
    tc = cert.tie_classes(vals)
    top = max(tc.codes)
    assert all(c == top for c in tc.codes[:-1]) and tc.codes[-1] < top
    assert all(v == Decimal(1) for v in tc.values[:-1])
    assert tc.tie_classes == 1 and tc.tie_tuples == tc.n_distinct - 1 and tc.recomputed == tc.n_distinct - 1
    pts = {'s': ((2, 2, 0), 1), 't': ((1, 1, 0), 1), 'u': ((3, 0, 0), 1), 'v': ((1, 0, 0), 1), 'w': ((0, 7, 5), 3),
           'x': ((0, 14, 10), 9), 'y': ((1, 2, 3), 1), S.O: ((0, 0, 0), 1)}
    f = S.FTable(pts)
    zeros = [S.Val('fG', f.g_tuple(a, b)) for a, b in (('s', 't'), ('u', 'v'), ('w', 'x'), ('s', S.O), ('y', 'y'))]
    assert all(cert.cmp(zeros[0], z) == 0 for z in zeros[1:])
    tc = cert.tie_classes(zeros + [S.Val('fG', f.g_tuple('t', 's'))])
    assert len(set(tc.codes[:5])) == 1 and tc.codes[5] < tc.codes[0]
    assert tc.tie_classes == 1 and tc.tie_tuples == 5
    assert any(e['tied'] for e in tc.side) and all(e['v240'] for e in tc.side)
    assert cert.n_ties >= 4 and all(t[0].tup != t[1].tup for t in cert.ties)


def _e_of_w(w):
    """z with E(z) = w exactly (w > 1 rational): z = (w + 1/w)/2."""
    return (w + 1 / w) / 2


def test_near_equal_pairs_take_the_240_path():
    cert = S.Certifier()
    d = F(1, 10 ** 200)
    a, b = S.Val('fDep', (F(4), F(0))), S.Val('fDep', (F(4) * (1 + d) ** 2, F(0)))
    assert cert.cmp(a, b) == -1 and a.v2 is not None and b.v2 is not None and cert.recomputed == 2
    x, y = S.Val('hDep', (_e_of_w(F(2)), F(1))), S.Val('hDep', (_e_of_w(2 * (1 + d)), F(1)))
    assert cert.cmp(y, x) == 1 and x.v2 is not None
    a2, b2 = S.Val('fDep', (F(4), F(0))), S.Val('fDep', (F(4) * (1 + d) ** 2, F(0)))
    tc = S.Certifier().tie_classes([b2, a2, S.Val('fDep', (F(9), F(0)))])
    assert tc.codes == [1, 0, 2] and tc.recomputed == 2 and tc.tie_classes == 0
    assert [e['item'] for e in tc.side] == [0, 1] and not any(e['tied'] for e in tc.side)
    tiny = F(1, 10 ** 300)                       # below the 240-digit bounds: a numerical tie
    c = S.Val('fDep', (F(4) * (1 + tiny) ** 2, F(0)))
    cert2 = S.Certifier()
    assert cert2.cmp(S.Val('fDep', (F(4), F(0))), c) == 0 and cert2.n_ties == 1


def test_cmp_is_exact_beyond_the_default_context():
    """The difference and the bound sum are compared exactly: here they differ only at the 30th digit, where a
    difference rounded to the default 28-digit context (abs() does that) would call the pair within its bounds."""
    a, b = S.Val('fDep', (F(1), F(0))), S.Val('fDep', (F(1), F(1, 10 ** 9)))
    a.v1, a.e1 = Decimal(1), Decimal('1E-110')
    b.v1, b.e1 = Decimal('1.' + '0' * 109 + '2' + '0' * 28 + '1'), Decimal('1.00000000000000000000000000000005E-110')
    cert = S.Certifier()
    assert cert.cmp(b, a) == 1 and a.v2 is None and b.v2 is None
    assert cert.tie_classes([b, a]).codes == [1, 0]
    b.e1 = Decimal('1.' + '0' * 28 + '2E-110')                   # 1e-110 + 2e-139: now the difference is within
    b.v2 = a.v2 = None
    cert.cmp(b, a)
    assert b.v2 is not None


def test_chained_tie_raises():
    d = F(15, 10 ** 231)                         # consecutive gaps 1.5e-230 <= 2e-230 < the ends' gap 3e-230
    vals = [S.Val('fDep', ((1 + k * d) ** 2, F(0))) for k in range(3)]
    with pytest.raises(S.ChainedTieError) as e:
        S.Certifier().tie_classes(vals)
    assert len(e.value.info) == 3
    tc = S.Certifier().tie_classes(vals[:2])     # without the middle value's partner: an ordinary numerical tie
    assert tc.codes == [0, 0] and tc.tie_classes == 1


def test_codes_are_ordinal():
    """Adding values to a list does not change the code relation of two others (no chained tie)."""
    r = random.Random(95212)
    ws = rwords(r, 30, 0, 10)
    words = dict(enumerate(ws))
    for name, tb in tables(words).items():
        keys = list(words) + [S.O]
        base = [tb.g_tuple(r.choice(keys), r.choice(keys)) for _ in range(120)]
        base += [tb.g_tuple(k, k) for k in keys[:5]] + [tb.g_tuple(k, S.O) for k in keys[:5]]
        form = tb.g_form
        c0 = S.Certifier().tie_classes([S.Val(form, t) for t in base]).codes
        extra = [tb.g_tuple(r.choice(keys), r.choice(keys)) for _ in range(150)]
        mixed = base + extra
        r.shuffle(mixed)
        c1 = S.Certifier().tie_classes([S.Val(form, t) for t in mixed]).codes
        pos = {}
        for i, t in enumerate(mixed):
            pos.setdefault(S._tkey(t), i)
        for i in range(len(base)):
            for j in range(len(base)):
                a, b = c0[i] - c0[j], c1[pos[S._tkey(base[i])]] - c1[pos[S._tkey(base[j])]]
                assert (a > 0) - (a < 0) == (b > 0) - (b < 0), name


def _acosh(z, ctx):
    z = F(z)
    return ctx.ln(ctx.add(ctx.divide(Decimal(z.numerator), Decimal(z.denominator)),
                          ctx.sqrt(ctx.divide(Decimal((z * z - 1).numerator), Decimal((z * z - 1).denominator)))))


def test_eg_consistency_with_arcosh():
    """Test 6: ln(e^G) at 200 digits equals arcosh(x0_s) - arcosh(x0_t) - arcosh(K) to 10^-150 (and e^Dep); the same
    for G_root on a learned Lorentz table and on H3 with a synset as base point."""
    r = random.Random(95213)
    ctx = Context(prec=200, rounding=ROUND_HALF_EVEN)
    words = dict(enumerate(rwords(r, 25, 0, 12)))
    tb = {'H3': S.h3_table(words), 'H2': S.h2_table(words)}
    rs = np.random.default_rng(95213)
    N = [tuple(int(x) for x in rs.integers(-2 ** 31, 2 ** 31, 3)) for _ in range(25)]
    tb['L'] = S.lorentz_table(list(range(25)), N)
    cert = S.Certifier()
    tol = Decimal(10) ** -150
    for name, t in tb.items():
        keys = list(range(25)) + [S.O]
        for _ in range(40):
            s, u, p = r.choice(keys), r.choice(keys), r.choice(keys)
            for tup in (t.g_tuple(s, u), t.groot_tuple(p, s, u)):
                v, _ = cert.compute('hG', tup, 200)
                want = ctx.subtract(ctx.subtract(_acosh(tup[0], ctx), _acosh(tup[1], ctx)), _acosh(tup[2], ctx))
                assert abs(ctx.subtract(ctx.ln(v), want)) <= tol
            v, _ = cert.compute('hDep', t.dep_tuple(s, u), 200)
            want = ctx.subtract(_acosh(t.x0(s), ctx), _acosh(t.x0(u), ctx))
            assert abs(ctx.subtract(ctx.ln(v), want)) <= tol


# ================================================================ score properties (test 7)
def _check_properties(tb, keys, r, cert, n=150):
    form = tb.g_form
    one = Decimal(1) if form == 'hG' else Decimal(0)
    for _ in range(n):
        s, t = r.choice(keys), r.choice(keys)
        v = S.Val(form, tb.g_tuple(s, t))
        cert.ensure(v)
        assert v.v1 <= one + v.e1                                  # G <= 0 within its bound
        assert tb.sym_key(s, t) == tb.sym_key(t, s)                # Sym symmetric
    for s in keys[:30]:
        assert cert.ensure(S.Val(form, tb.g_tuple(s, s))).v1 == one       # G(s, s) = 0
        assert cert.ensure(S.Val(form, tb.g_tuple(s, S.O))).v1 == one     # G(s, o) = 0


def test_score_properties_synthetic():
    r = random.Random(95214)
    words = dict(enumerate(rwords(r, 60, 0, 14)))
    cert = S.Certifier()
    for tb in tables(words).values():
        _check_properties(tb, list(words) + [S.O], r, cert)


def test_score_properties_dry_verbs(wn):
    """The dry data (WordNet's verbs): the same properties on the verb forest's words, and G_WN = 0 exactly when t is
    in A(s) on the verb graph with its virtual root."""
    r = random.Random(95215)
    vw = A.verb_words(wn)
    offs = sorted(vw)
    sample = r.sample(offs, 300)
    words = {o: vw[o] for o in sample}
    cert = S.Certifier()
    for tb in tables(words).values():
        _check_properties(tb, sample + [S.O], r, cert, 100)
    g = G.verb_graph(wn)
    assert g.root == G.VROOT and g.parents[G.VROOT] == ()
    for s in sample[:120]:
        anc = g.anc(s)
        for t in list(anc)[:6] + r.sample(offs, 6):
            assert (g.g(s, t) == 0) == (t in anc) == g.in_closure(s, t)
            assert g.g(s, t) <= 0 and g.sym(s, t) == g.sym(t, s) and g.dep(s, t) == -g.dep(t, s)
    nb = lambda x: g.parents[x] + g.children()[x]          # noqa: E731
    for s in sample[:40]:
        dist = {s: 0}
        q = deque([s])
        while q:
            x = q.popleft()
            for y in nb(x):
                if y not in dist:
                    dist[y] = dist[x] + 1
                    q.append(y)
        for t in r.sample(offs, 15):
            assert g.lch_p(s, t) == g.path(s, t) and g.du(s, t) == dist[t]
            assert g.g_u(s, t) == -(dist[t] + g.du_root(t) - g.du_root(s))


def test_phi_and_dep_circ():
    """Phi keeps the first maximum under cmp; Dep° takes the first pair (x's index major) of G's top class."""
    pts = {'a': ((3, 0, 0), 1), 'b': ((1, 0, 0), 1), 'c': ((0, 2, 0), 1), 'd': ((0, 1, 0), 1),
           'e': ((5, 5, 5), 1), S.O: ((0, 0, 0), 1)}
    f = S.FTable(pts)
    sc = S.Scorer(f)
    S1, S2 = ['e', 'a', 'c'], ['d', 'b']
    vals = sc.g_vals(S1, S2)
    gz = [i for i, v in enumerate(vals) if sc.cert.cmp(v, S.Val('fG', f.g_tuple('a', 'b'))) == 0]
    assert gz == [3, 4]                          # (a, b) and (c, d): both exactly 0 (collinear), the top class
    best = sc.cert.phi(vals)
    assert best == 3
    dc = sc.dep_circ(S1, S2)
    assert dc.tup == f.dep_tuple('a', 'b')       # (a, b) comes first in (i, j) order
    assert sc.dep_circ(['c', 'a'], S2).tup == f.dep_tuple('c', 'd')
    assert sc.phi_g(S1, S2).tup == f.g_tuple('a', 'b')
    assert sc.phi_sym(S1, S2) == max(f.sym_key(s, t) for s in S1 for t in S2)
    assert sc.first_g(S1, S2).tup == f.g_tuple('e', 'd')
    assert sc.gensim_pair(S1, S2) == ('c', 'd')  # |c - d| = 1 is the smallest distance
    assert sc.gensim_pair(['e', 'a'], S2) == ('a', 'b')
    assert sc.gensim_g(['e', 'a'], S2).tup == f.g_tuple('a', 'b')


def test_gensim_ties_to_the_first_pair():
    pts = {'a': ((1, 0, 0), 1), 'b': ((0, 1, 0), 1), 'c': ((2, 0, 0), 1), 'd': ((0, 2, 0), 1), S.O: ((0, 0, 0), 1)}
    sc = S.Scorer(S.FTable(pts))
    assert sc.gensim_pair(['a', 'b'], ['c', 'd']) == ('a', 'c')     # |a - c| = |b - d| = 1: the first pair


def test_wn_scorer_dep_circ():
    parents = {'r': (), 'p': ('r',), 'q': ('r',), 's1': ('p',), 's2': ('q',), 't': ('r',)}
    g = G.WNGraph(parents, 'r')
    sc = S.WNScorer(g)
    assert sc.phi_g(['s1', 's2'], ['q', 'p']) == 0
    assert sc.dep_circ(['s1', 's2'], ['q', 'p']) == g.dep('s1', 'p')   # (s1, p) is the first pair with G_WN = 0
    assert sc.phi_sym(['s1'], ['s2']) == -4 and sc.first_g(['s1'], ['t']) == -2


# ================================================================ learned tables, GloVe, reported forms
def test_learned_lorentz_formulas():
    """x0 and K from snapped integers equal the lifted Poincare points' Lorentz product, exactly."""
    rs = np.random.default_rng(95216)
    four = 4 ** 32
    N = []
    while len(N) < 30:
        n = tuple(int(x) for x in rs.integers(-2 ** 31, 2 ** 31, 3))
        if sum(x * x for x in n) < four:
            N.append(n)
    t = S.lorentz_table(list(range(30)), N)

    def lift(n):
        p = [F(x, 2 ** 32) for x in n]
        q = sum(x * x for x in p)
        return [(1 + q) / (1 - q)] + [2 * x / (1 - q) for x in p]
    for i in range(30):
        assert t.x0(i) == lift(N[i])[0]
        for j in range(30):
            a, b = lift(N[i]), lift(N[j])
            assert t.K(i, j) == a[0] * b[0] - sum(x * y for x, y in zip(a[1:], b[1:]))
    assert t.x0(S.O) == 1 and t.K(S.O, 3) == t.x0(3)
    e = S.euclid_table(list(range(30)), N)
    assert e.sq(2) == sum(x * x for x in N[2]) and e.d2(2, 5) == sum((x - y) ** 2 for x, y in zip(N[2], N[5]))
    X = rs.normal(size=(30, 4)) * 0.01
    X[:, 0] = np.sqrt(1 + (X[:, 1:] ** 2).sum(axis=1))
    lt = S.learned_table(list(range(30)), X, 'lorentz')
    assert isinstance(lt, S.LTable) and lt.x0(0) > 1


def test_cos_key_orders_as_the_cosine():
    r = random.Random(95217)
    ctx = Context(prec=80)
    vs = [tuple(r.randint(-50, 50) for _ in range(4)) for _ in range(40)]
    vs = [v for v in vs if any(v)]
    pairs = [(r.choice(vs), r.choice(vs)) for _ in range(300)]

    def cos(a, b):
        c = sum(x * y for x, y in zip(a, b))
        return ctx.divide(Decimal(c), ctx.sqrt(Decimal(sum(x * x for x in a) * sum(y * y for y in b))))
    for (a, b), (c, d) in zip(pairs, pairs[1:]):
        k1, k2 = S.cos_key(a, b), S.cos_key(c, d)
        c1, c2 = cos(a, b), cos(c, d)
        assert (k1 > k2) == (c1 > c2 and abs(c1 - c2) > Decimal(10) ** -70)
    assert S.cos_key((2, 0), (4, 0)) == 1 and S.cos_key((1, 0), (0, 3)) == 0 and S.cos_key((1, 0), (-1, 0)) == -1
    assert S.cos_key((3, 4), (6, 8)) == S.cos_key((30, 40), (6, 8))
    with pytest.raises(ValueError):
        S.cos_key((0, 0), (1, 0))


def test_reported_forms():
    r = random.Random(95218)
    words = dict(enumerate(rwords(r, 12, 1, 9)))
    h = S.h3_table(words)
    ctx = Context(prec=120)
    for s, t in itertools.product(range(4), range(4)):
        pv = S.product_value(h, s, t)
        want = ctx.multiply(ctx.subtract(_acosh(h.x0(s), ctx), _acosh(h.x0(t), ctx)), _acosh(h.K(s, t), ctx))
        assert abs(pv - want) <= Decimal(10) ** -100
        nk = S.nk17_value(h, s, t)
        nu = math.sqrt((float(h.x0(s)) - 1) / (float(h.x0(s)) + 1))
        nv = math.sqrt((float(h.x0(t)) - 1) / (float(h.x0(t)) + 1))
        assert float(nk) == pytest.approx(-(1 + 1000 * (nv - nu)) * math.acosh(float(h.K(s, t))), rel=1e-6, abs=1e-9)
    f = S.flat_table(words, 3)
    assert S.product_value(f, 0, 0) == 0
    # NK17 on an exact flat arm (READING stage2-runner-25): its exact Euclidean norms and distance
    for s, t in itertools.product(range(4), range(4)):
        nu, nv, dd = (math.sqrt(float(x)) for x in (f.sq(s), f.sq(t), f.d2(s, t)))
        assert float(S.nk17_value(f, s, t)) == pytest.approx(-(1 + 1000 * (nv - nu)) * dd, rel=1e-9, abs=1e-12)
    with pytest.raises(ValueError):
        S.nk17_value(type('Graph', (), {'kind': 'wn'})(), 0, 1)     # neither a hyperboloid nor a flat table
    assert S.codes_plain([Decimal('0.5'), Decimal('0.25'), Decimal('0.5')]) == [1, 0, 1]
    assert not S.norm_rounds_to_one(F(7)) and S.norm_rounds_to_one(F(10 ** 40))
    big = F(2 ** 56)                             # 1 - norm ~ 1/x0 = 2^-56 < 2^-54: rounds to 1.0
    small = F(2 ** 50)                           # 1 - norm ~ 2^-50: stays below 1.0
    assert S.norm_rounds_to_one(big) and not S.norm_rounds_to_one(small)
    assert S.phi_plain([Decimal(1), Decimal(3), Decimal(3)]) == 1


def test_joint_codes_and_stream_sha():
    r = random.Random(95219)
    words = dict(enumerate(rwords(r, 10, 1, 8)))
    h = S.h3_table(words)
    sc = S.Scorer(h)
    fw = [sc.phi_g([i], [j]) for i, j in ((0, 1), (2, 3), (4, 4))]
    rv = [sc.phi_g([j], [i]) for i, j in ((0, 1), (2, 3), (4, 4))]
    (cf, cr), tc = S.joint_codes(sc.cert, [fw, rv])
    assert len(cf) == 3 and len(cr) == 3 and cf[2] == cr[2] and tc.n_distinct <= 6
    whole = sc.cert.tie_classes(fw + rv).codes
    assert cf + cr == whole
    import hashlib
    assert S.value_stream_sha(tc.values) == hashlib.sha256(''.join(f'{v}\n' for v in tc.values).encode()).hexdigest()
    assert S.joint_key_codes([[3, 1], [1, F(5, 2)]]) == [[2, 0], [0, 1]]


def test_f1_hit_threshold():
    cert = S.Certifier()
    v = lambda x: S.Val('fDep', (F(x), F(0)))             # noqa: E731  value sqrt(x), increasing in x
    val = [v(1), v(4), v(9), v(16), v(25)]
    out = S.f1_hit(cert, val, [False, True, False, True, True], [v(2), v(9), v(30)], [False, True, True])
    # theta = sqrt(4): val predicted positive 4 of 5 -> TP 3, FP 1, FN 0 -> F1 = 6/7; theta = 16: 4/4 -> F1 = 4/5 ...
    assert out['theta_tuple'] == ['4', '0'] and out['f1_val'] == F(6, 7)
    assert out['f1_test'] == F(4, 4) and out['test_counts'] == {'tp': 2, 'fp': 0, 'fn': 0, 'tn': 1}


@pytest.mark.parametrize('i', range(3))
def test_f1_from_the_joint_list_equals_f1_hit(i):
    """F1 as pass 2 computes it (stats2.f1_threshold on one tie-class list of val and test values, the joint file of
    run_claims_stage2's READING) equals scores2.f1_hit on the certified values (theta among the val values, test values
    compared under cmp), on H3 G values of random words with many ties and the label layout of HiT's settings."""
    from lexicon import stats2 as T
    r = random.Random(95488 + i)
    words = dict(enumerate(rwords(r, 30, 0, 3)))
    words.update({k: words[k - 25] for k in range(25, 30)})            # repeated points: tied values
    sc = S.Scorer(S.h3_table(words))

    def rows(n):                       # HiT rows: G(child, c) of six candidates in slot order (Scorer.slot_vals)
        return [sc.slot_vals(r.randrange(30), [r.randrange(30) for _ in range(6)]) for _ in range(n)]
    vv, tv = rows(40), rows(35)
    flat = [x for row in vv for x in row] + [x for row in tv for x in row]
    codes = sc.cert.tie_classes(flat).codes
    nv = 6 * len(vv)
    for slots in ((0, 1, 2, 3), (0, 4, 5)):
        def lab(part):
            return [s == 0 for _ in part for s in slots]

        def pick(part, off):
            return [codes[off + 6 * k + s] for k in range(len(part)) for s in slots]

        def vals(part):
            return [row[s] for row in part for s in slots]
        got = T.f1_threshold(pick(vv, 0), lab(vv), pick(tv, nv), lab(tv))
        want = S.f1_hit(S.Certifier(), vals(vv), lab(vv), vals(tv), lab(tv))
        assert (got['f1_val'], got['f1_test'], got['test_counts']) == (want['f1_val'], want['f1_test'],
                                                                       want['test_counts'])
        assert 0 < len(set(pick(vv, 0) + pick(tv, nv))) < len(lab(vv)) + len(lab(tv))       # ties occur


# ================================================================ W, S-full, S3, K3 (test 11)
class _Entry:
    def __init__(self, offsets):
        self.offsets = offsets


def _independent_w(index, seed):
    groups = {}
    for lemma in sorted(index):
        k = len(index[lemma].offsets)
        groups.setdefault(10 if k >= 10 else k, []).append(lemma)
    rng = hpstep_prng.Rng(seed)
    out = {}
    for k in range(1, 11):
        L = groups.get(k, [])
        Q = list(L)
        i = len(Q) - 1
        while i > 0:                              # Fisher-Yates with Rng.below, written out
            j = rng.below(i + 1)
            Q[i], Q[j] = Q[j], Q[i]
            i -= 1
        out.update(zip(L, Q))
    return out


@pytest.mark.parametrize('i', range(3))
def test_w_map_against_an_independent_shuffle(i):
    r = random.Random(95220 + i)
    index = {}
    for _ in range(400):
        lemma = ''.join(r.choice('abcdeé_') for _ in range(r.randint(1, 6)))
        k = r.choice([1] * 8 + [2, 2, 3, 4, 9, 10, 11, 14])
        index[lemma] = _Entry([f'{r.randrange(10 ** 8):08d}' for _ in range(k)])
    m = S.w_map(index, 95220 + i)
    assert m == _independent_w(index, 95220 + i)
    for a, b in m.items():
        assert min(len(index[a].offsets), 10) == min(len(index[b].offsets), 10)
    assert sorted(m.values()) == sorted(index)


def test_w_strata_counts(wn):
    """A13.4's stratum sizes on index.noun (a count check), and the verbs' strata for the dry run (counted)."""
    assert S.w_check(S.w_strata(wn['index']['noun'])) == S.W_STRATA_NOUN
    assert sum(len(v) for v in S.w_strata(wn['index']['verb']).values()) == len(wn['index']['verb'])


@pytest.mark.parametrize('i', range(3))
def test_sfull_against_an_independent_move(i):
    r = random.Random(95230 + i)
    n = 50
    offsets = sorted(f'{r.randrange(10 ** 8):08d}' for _ in range(n))
    words = dict(zip(offsets, rwords(r, n, 1, 9)))
    h = S.h3_table(words)
    P = S.sfull_permutation(95230 + i, n)
    rng = hpstep_prng.Rng(95230 + i)
    Q = list(range(n))
    for k in range(n - 1, 0, -1):
        j = rng.below(k + 1)
        Q[k], Q[j] = Q[j], Q[k]
    assert P == Q
    t = S.sfull_table(h, offsets, P)
    for j in range(n):
        assert t.pts[offsets[P[j]]] == h.pts[offsets[j]]
    assert t.pts[S.O] == h.pts[S.O]
    moved = l6.move_points(np.arange(n), P)
    assert [t.pts[offsets[k]] for k in range(n)] == [h.pts[offsets[int(moved[k])]] for k in range(n)]


def test_s3_and_k3_tables(wn):
    r = random.Random(95233)
    offs = sorted(r.sample(sorted(wn['synsets']['verb']), 40))
    vw = A.verb_words(wn)
    words = {o: vw[o] for o in offs}
    t = S.s3_table(words, offs, 95233)
    ws = A.s3_words([words[o] for o in offs], 95233)
    assert all(t.pts[o][0] == h3tree.point(w) for o, w in zip(offs, ws))
    assert sorted(len(w) for w in ws) == sorted(len(words[o]) for o in offs)
    k = S.k3_table(wn, offs, pos='verb')
    kw = A.k3_words(wn, offs, pos='verb')
    assert all(k.pts[o] == (h3tree.point(w), 7 ** len(w)) for o, w in zip(offs, kw))
    h2 = S.h2_table(words)
    assert all(h2.pts[o] == (h2exact.TREE.point(words[o]), h2exact.TREE.den(len(words[o]))) for o in offs)


# ================================================================ WordNet's graph (wngraph) against brute force
def random_dag(r, n=60):
    parents = {0: ()}
    for i in range(1, n):
        k = 1 if r.random() < 0.7 else r.randint(2, 3)
        parents[i] = tuple(sorted(set(r.randrange(i) for _ in range(k))))
    return parents


def all_up_paths(parents, x):
    """{a: shortest number of upward edges}, by enumerating every upward path (brute force)."""
    best = {}
    stack = [(x, 0)]
    while stack:
        y, k = stack.pop()
        if y not in best or k < best[y]:
            best[y] = k
        for p in parents[y]:
            stack.append((p, k + 1))
    return best


@pytest.mark.parametrize('i', range(3))
def test_wngraph_against_brute_force(i):
    r = random.Random(95240 + i)
    parents = random_dag(r)
    g = G.WNGraph(parents, 0)
    nodes = list(parents)
    up = {x: all_up_paths(parents, x) for x in nodes}
    INF = 10 ** 9
    D = {(a, b): (0 if a == b else INF) for a in nodes for b in nodes}
    for x, ps in parents.items():
        for p in ps:
            D[(x, p)] = D[(p, x)] = 1
    for k in nodes:
        for a in nodes:
            for b in nodes:
                if D[(a, k)] + D[(k, b)] < D[(a, b)]:
                    D[(a, b)] = D[(a, k)] + D[(k, b)]

    def longest(x):
        return 0 if not parents[x] else 1 + max(longest(p) for p in parents[x])
    assert g.dmax() == max(longest(x) for x in nodes) + 1
    for s in nodes:
        assert g.anc(s) == up[s] and g.depth(s) == up[s][0]
        for t in nodes:
            common = [a for a in up[s] if a in up[t]]
            assert g.g(s, t) == -2 * min(up[t][a] for a in common)
            p = min(up[s][a] + up[t][a] for a in common)
            assert g.path(s, t) == p == g.lch_p(s, t) and g.sym(s, t) == -p
            assert g.dep(s, t) == up[s][0] - up[t][0]
            assert g.du(s, t) == D[(s, t)]
            assert g.g_u(s, t) == -(D[(s, t)] + D[(t, 0)] - D[(s, 0)])
            assert (g.g(s, t) == 0) == (t in up[s])
    ctx = Context(prec=120)
    assert g.lch(3, 7) == ctx.minus(ctx.ln(ctx.divide(Decimal(g.path(3, 7) + 1), Decimal(2 * g.dmax()))))


def test_st_and_letter_tree_against_the_parent_chain():
    r = random.Random(95243)
    n = 200
    parent = {'00000000': None}
    offs = ['00000000']
    for i in range(1, n):
        o = f'{i:08d}'
        parent[o] = offs[r.randrange(len(offs))] if r.random() < 0.6 else offs[max(0, len(offs) - r.randint(1, 3))]
        offs.append(o)
    kids = {}
    for o, p in parent.items():
        if p is not None:
            kids.setdefault(p, []).append(o)
    for v in kids.values():
        v.sort()
    for _ in range(3):                           # a few wide nodes, so some children take two letters
        hub = r.choice(offs[:20])
        for j in range(7):
            o = f'{len(offs):08d}'
            parent[o] = hub
            kids.setdefault(hub, []).append(o)
            offs.append(o)
        kids[hub].sort()
    words = A.forest_words(parent, kids, ['00000000'], A.NOUN_ROOT, virtual=False)
    wt = G.WordTree(words, A.NOUN_ROOT)

    def chain(o):
        c = []
        while o is not None:
            c.append(o)
            o = parent[o]
        return c
    for _ in range(600):
        s, t = r.choice(offs), r.choice(offs)
        cs, ct = chain(s), chain(t)
        lca = next(x for x in cs if x in ct)
        depth = lambda x: len(chain(x)) - 1     # noqa: E731
        assert wt.g_st(s, t) == -2 * (depth(t) - depth(lca))
        assert wt.st_depth(s) == depth(s)
        ws, wt_ = words[s], words[t]
        k = 0
        while k < min(len(ws), len(wt_)) and ws[k] == wt_[k]:
            k += 1
        assert wt.g_letter(s, t) == -2 * (len(wt_) - k) == G.letter_g(ws, wt_)


def test_verb_forest_word_tree(wn):
    """The dry verb forest: ST through the words (virtual root (1,)) equals the spanning parent chain."""
    r = random.Random(95244)
    parent, _, roots = W.spanning_forest(wn['synsets']['verb'])
    vw = A.verb_words(wn)
    wt = G.WordTree(vw, A.VERB_ROOT)

    def chain(o):
        c = []
        while o is not None:
            c.append(o)
            o = parent[o]
        return c + ['v']
    offs = sorted(vw)
    for _ in range(500):
        s, t = r.choice(offs), r.choice(offs)
        cs, ct = chain(s), chain(t)
        lca = next(x for x in cs if x in ct)
        assert wt.g_st(s, t) == -2 * (ct.index(lca))


def test_noun_graph_root_and_dmax(wn):
    """WordNet's noun graph (counting only): one root, entity.n.01, and D_max = 20 (NLTK's noun max_depth 19, plus
    one); the noun `@` ∪ `@i` parents are wordnet.closure_parents."""
    g = G.noun_graph(wn)
    assert g.root == W.ENTITY and g.dmax() == 20
    assert g.depth(W.ENTITY) == 0
    nouns = wn['synsets']['noun']
    o = sorted(nouns)[1000]
    assert g.parents[o] == tuple(W.closure_parents(nouns[o]))
