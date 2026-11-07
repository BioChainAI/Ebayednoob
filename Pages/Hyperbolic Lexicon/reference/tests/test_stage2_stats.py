"""lexicon.stats2 (Amendment 13, item 7 and the decisions of L12-L15; build spec section 7, tests 8-10 of section
13): rho exact against a slow Fraction implementation, its display and exact comparisons, the tie bounds; the
word-level bootstrap, the row bootstrap, the cluster bootstrap and the macro bootstrap against slow
implementations; the index stream of rank.ci_mean; AP (pessimistic, fractional, sklearn's convention) against brute
force and hand-computed cases; the suite's 1,000 x 2% rule; RR, the macro mean, accuracy, F1; the bands; and every
branch of every decision rule of L12-L15 on crafted intervals.

Synthetic data and seeds 95200 + i only (A13.12): the registered constants (7, 42) are checked as values."""
import inspect
import itertools
import math
import random
from decimal import ROUND_HALF_EVEN, Context, Decimal
from fractions import Fraction as F

import numpy as np
import pytest

import hpstep.prng as hpstep_prng
from lexicon import rank as R
from lexicon import scores2 as S
from lexicon import stats2 as T

ALLOWED = range(95200, 95500)


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    """hpstep.prng.Rng, numpy's default_rng and RandomState refuse every seed but 95200 + i (i < 300)."""
    init = hpstep_prng.Rng.__init__

    def rng_init(self, seed=0, state=None):
        if state is None and seed not in ALLOWED:
            raise RuntimeError(f'seed {seed} is not a test seed (95200 + i)')
        return init(self, seed, state)
    monkeypatch.setattr(hpstep_prng.Rng, '__init__', rng_init)
    real_default, real_rs = np.random.default_rng, np.random.RandomState

    def default_rng(seed=None):
        if seed not in ALLOWED:
            raise RuntimeError(f'numpy seed {seed} is not a test seed')
        return real_default(seed)

    class GuardedRandomState(real_rs):            # a subclass: numpy's own isinstance checks keep working
        def __init__(self, seed=None):
            if seed not in ALLOWED:
                raise RuntimeError(f'RandomState seed {seed} is not a test seed')
            super().__init__(seed)
    monkeypatch.setattr(np.random, 'default_rng', default_rng)
    monkeypatch.setattr(np.random, 'RandomState', GuardedRandomState)


# ================================================================ rho (test 8)
def slow_ranks(values):
    """Average ranks as Fractions by sorting (1-based positions, ties averaged)."""
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [None] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        for k in range(i, j + 1):
            ranks[order[k]] = F(i + 1 + j + 1, 2)
        i = j + 1
    return ranks


def slow_rho2(x, y):
    """(sign, rho^2) of Pearson's r on average ranks, in Fractions; (0, 0) for a zero variance."""
    a, b = slow_ranks(x), slow_ranks(y)
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    cov = sum((p - ma) * (q - mb) for p, q in zip(a, b))
    va = sum((p - ma) ** 2 for p in a)
    vb = sum((q - mb) ** 2 for q in b)
    if va == 0 or vb == 0:
        return 0, F(0)
    return (cov > 0) - (cov < 0), cov * cov / (va * vb)


@pytest.mark.parametrize('i', range(6))
def test_rho_against_slow_fractions(i):
    r = random.Random(95300 + i)
    n = r.randint(3, 60)
    codes = [r.randint(0, r.choice([1, 3, 8, 40])) for _ in range(n)]
    gold = [F(r.randint(0, 12), r.choice([1, 2, 4])) for _ in range(n)]
    rh = T.rho(codes, gold)
    sg, r2 = slow_rho2(codes, gold)
    if rh.zero:
        assert sg == 0 and r2 == 0
    else:
        assert F(rh.sab * rh.sab, rh.saa * rh.sbb) == r2 and (rh.sab > 0) - (rh.sab < 0) == sg
    a = T.avg_rank_ints(codes)
    assert a == [int(2 * x - (n + 1)) for x in slow_ranks(codes)]


def test_rho_extremes_and_zero_variance():
    codes = [0, 1, 1, 2, 5]
    gold = [F(1), F(2), F(2), F(7, 2), F(9)]
    assert T.rho(codes, gold).cmp_rational(1) == 0 and float(T.rho(codes, gold)) == 1.0
    assert T.rho([-c for c in codes], gold).cmp_rational(-1) == 0
    z = T.rho([3, 3, 3], [F(1), F(2), F(3)])
    assert z.zero and float(z) == 0.0 and z.display() == '0.000000' and z.cmp_rational(0) == 0
    assert T.rho([1, 2, 3], [F(5)] * 3).zero


def test_rho_exact_comparisons_and_display():
    r = random.Random(95306)
    ctx = Context(prec=100, rounding=ROUND_HALF_EVEN)
    for _ in range(300):
        rh = T.Rho(r.randint(-10 ** 6, 10 ** 6), r.randint(1, 10 ** 7), r.randint(1, 10 ** 7))
        if rh.sab ** 2 > rh.saa * rh.sbb:
            continue
        exact = ctx.divide(Decimal(rh.sab), ctx.sqrt(Decimal(rh.saa * rh.sbb)))
        c = F(r.randint(-1000, 1000), r.randint(1, 1000))
        diff = F(exact) - c                      # exact against the rational (|rho - c| >> 10^-99 here)
        want = (diff > 0) - (diff < 0)
        assert rh.cmp_rational(c) == want
        assert rh.display() == str(exact.quantize(Decimal('0.000001'), rounding=ROUND_HALF_EVEN))
        assert float(rh) == float(exact)
    # exact halves round to even (rho rational when saa = sbb)
    assert T.Rho(1000001, 2 * 10 ** 6, 2 * 10 ** 6).display() == '0.500000'
    assert T.Rho(1000003, 2 * 10 ** 6, 2 * 10 ** 6).display() == '0.500002'
    assert T.Rho(-1000003, 2 * 10 ** 6, 2 * 10 ** 6).display() == '-0.500002'
    a, b = T.Rho(3, 4, 4), T.Rho(6, 16, 9)               # 3/4 and 6/12 = 1/2
    assert a > b and b < a and not (a == b) and T.Rho(1, 2, 2) == T.Rho(5, 10, 10)
    assert T.Rho(1, 2, 2).text() == '1|2|2'


def test_rho_tie_bounds_against_brute_force():
    r = random.Random(95307)
    for _ in range(40):
        n = r.randint(3, 7)
        codes = [r.randint(0, 2) for _ in range(n)]
        gold = [F(r.randint(0, 3)) for _ in range(n)]
        pess, opt = T.rho_tie_bounds(codes, gold)
        b = T.avg_rank_ints(T.exact_codes(gold))
        vals = []
        for perm in itertools.permutations(range(n)):
            if any(codes[perm[k]] > codes[perm[k + 1]] for k in range(n - 1)):
                continue                                  # orders consistent with the system's codes
            a = [0] * n
            for pos, i in enumerate(perm, 1):
                a[i] = 2 * pos - (n + 1)
            vals.append(T.Rho(sum(x * y for x, y in zip(a, b)), sum(x * x for x in a), sum(y * y for y in b)))
        lo, hi = min(vals), max(vals)
        assert pess.cmp(lo) == 0 and opt.cmp(hi) == 0
        # (the average-rank rho need not lie between them: breaking ties changes the system's variance too)


def test_rho_diff_float():
    ra, rb = T.Rho(5, 7, 11), T.Rho(-2, 3, 13)
    ctx = Context(prec=120)
    want = float(ctx.subtract(ctx.divide(Decimal(5), ctx.sqrt(Decimal(77))),
                              ctx.divide(Decimal(-2), ctx.sqrt(Decimal(39)))))
    assert T.rho_diff_float(ra, rb) == want and T.rho_diff_float(ra, ra) == 0.0


# ================================================================ bootstraps (test 9)
def _avg_a(codes):
    """a = first + last - (N + 1) for each element of a list, by sorting (the slow path)."""
    N = len(codes)
    srt = sorted(codes)
    first, last = {}, {}
    for pos, c in enumerate(srt, 1):
        first.setdefault(c, pos)
        last[c] = pos
    return [first[c] + last[c] - (N + 1) for c in codes]


def _slow_rho_float(ca, cg):
    if len(ca) < 3:
        return None
    a, b = _avg_a(ca), _avg_a(cg)
    saa, sbb = sum(x * x for x in a), sum(y * y for y in b)
    if saa == 0 or sbb == 0:
        return None
    return sum(x * y for x, y in zip(a, b)) / math.sqrt(saa * sbb)


def _slow_delta(A, B, gold, idx_rows):
    ca = [A[i] for i in idx_rows]
    cb = [B[i] for i in idx_rows]
    cg = [gold[i] for i in idx_rows]
    ra, rb = _slow_rho_float(ca, cg), _slow_rho_float(cb, cg)
    return (0.0 if ra is None else ra) - (0.0 if rb is None else rb)


def slow_ci_rho(A, B, gold, rows, seed, resamples):
    types = sorted({w for x, y in rows for w in (x, y)})
    k = {w: i for i, w in enumerate(types)}
    V = len(types)
    rng = np.random.default_rng(seed)
    D, sizes = [], 0
    for _ in range(resamples):
        draws = rng.integers(0, V, V)
        m = np.bincount(draws, minlength=V)
        mult = [int(m[k[x]]) * int(m[k[y]]) for x, y in rows]
        idx = list(np.repeat(np.arange(len(rows)), mult))       # rows in file order, each repeated by hand
        sizes += len(idx)
        D.append(_slow_delta(A, B, gold, idx))
    lo, hi = np.percentile(np.array(D), [2.5, 97.5])
    return float(lo), float(hi), sizes / resamples


def synthetic_pairs(r, n, nwords):
    words = [''.join(r.choice('abcxyz') for _ in range(r.randint(1, 4))) + str(j) for j in range(nwords)]
    rows = [(r.choice(words), r.choice(words)) for _ in range(n)]
    rows[0] = (rows[0][0], rows[0][0])                        # a self-pair: multiplicity m_x^2
    A = [r.randint(0, 6) for _ in range(n)]
    B = [r.randint(0, 3) for _ in range(n)]
    gold = [F(r.randint(0, 20), 4) for _ in range(n)]
    return rows, A, B, gold


@pytest.mark.parametrize('i', range(3))
def test_ci_rho_against_slow(i):
    r = random.Random(95310 + i)
    rows, A, B, gold = synthetic_pairs(r, 45, 14)
    info = {}
    iv = T.ci_rho(A, B, gold, rows, seed=95310 + i, resamples=400, info=info)
    lo, hi, size = slow_ci_rho(A, B, gold, rows, 95310 + i, 400)
    assert (iv.lo, iv.hi) == (lo, hi) and info['mean_size'] == size
    assert iv.est == T.rho_diff_float(T.rho(A, gold), T.rho(B, gold))
    assert info['V'] == len(T.word_types(rows)) and info['n'] == 45
    with pytest.raises(ValueError):
        T.ci_rho(A, B, gold, rows, words=list(reversed(T.word_types(rows))), seed=95310 + i, resamples=5)


def test_ci_rho_expected_resample_size():
    r = random.Random(95313)
    rows, A, B, gold = synthetic_pairs(r, 60, 20)
    V = len(T.word_types(rows))
    expected = sum((2 - 1 / V) if x == y else (1 - 1 / V) for x, y in rows)
    info = {}
    T.ci_rho(A, B, gold, rows, seed=95313, resamples=4000, info=info)
    assert abs(info['mean_size'] - expected) <= 0.03 * expected


def test_ci_rho_counts_undefined_resamples():
    r = random.Random(95314)
    rows, _, B, gold = synthetic_pairs(r, 30, 10)
    A = [4] * 30                                              # zero variance: rho_A is 0 on every resample
    info = {}
    iv = T.ci_rho(A, B, gold, rows, seed=95314, resamples=200, info=info)
    assert info['undefined_a'] == 200 and info['undefined_b'] < 200
    assert iv.est == -float(T.rho(B, gold)) or iv.est == T.rho_diff_float(T.Rho(0, 0, 1), T.rho(B, gold))


class _Recorder:
    def __init__(self, g, log):
        self.g, self.log = g, log

    def integers(self, *a, **k):
        x = self.g.integers(*a, **k)
        self.log.append((a, tuple(sorted(k.items())), x.copy()))
        return x


def test_ci_rho_rows_draws_the_index_stream_of_ci_mean(monkeypatch):
    r = random.Random(95315)
    n = 37
    A = [r.randint(0, 5) for _ in range(n)]
    B = [r.randint(0, 5) for _ in range(n)]
    gold = [F(r.randint(0, 9)) for _ in range(n)]
    guarded = np.random.default_rng
    logs = []

    def recording(seed=None):
        logs.append([])
        return _Recorder(guarded(seed), logs[-1])
    monkeypatch.setattr(np.random, 'default_rng', recording)
    T.ci_rho_rows(A, B, gold, seed=95315, resamples=60)
    R.ci_mean([float(x) for x in A], resamples=60, seed=95315)
    assert len(logs) == 2 and len(logs[0]) == 60
    for (a1, k1, x1), (a2, k2, x2) in zip(*logs):
        assert a1 == a2 and k1 == k2 and np.array_equal(x1, x2)


def test_ci_rho_rows_against_slow():
    r = random.Random(95316)
    n = 40
    A = [r.randint(0, 5) for _ in range(n)]
    B = [r.randint(0, 2) for _ in range(n)]
    gold = [F(r.randint(0, 9)) for _ in range(n)]
    iv = T.ci_rho_rows(A, B, gold, seed=95316, resamples=300)
    rng = np.random.default_rng(95316)
    D = []
    for _ in range(300):
        idx = rng.integers(0, n, n)
        D.append(_slow_delta(A, B, gold, [int(i) for i in sorted(idx)]))
    lo, hi = np.percentile(np.array(D), [2.5, 97.5])
    assert (iv.lo, iv.hi) == (float(lo), float(hi))


def slow_ap_float(codes, labels):
    rows = sorted(range(len(codes)), key=lambda i: (-codes[i], labels[i]))
    prec, tp = [], 0
    for pos, i in enumerate(rows, 1):
        if labels[i]:
            tp += 1
            prec.append(tp / pos)
    return float(np.mean(np.array(prec))) if prec else None


def slow_ci_cluster(A, B, keys, metric, labels, seed, resamples):
    ks = sorted(set(keys))
    members = {k: [i for i, x in enumerate(keys) if x == k] for k in ks}
    rng = np.random.default_rng(seed)
    D = []
    for _ in range(resamples):
        idx = rng.integers(0, len(ks), len(ks))
        rows = [i for c in idx for i in members[ks[int(c)]]]   # the drawn clusters' rows, in draw order
        if metric == 'ap':
            va = slow_ap_float([A[i] for i in rows], [labels[i] for i in rows])
            vb = slow_ap_float([B[i] for i in rows], [labels[i] for i in rows])
            D.append((0.0 if va is None else va) - (0.0 if vb is None else vb))
        else:
            ca = np.array([A[0][i] > A[1][i] for i in rows])
            cb = np.array([B[0][i] > B[1][i] for i in rows])
            D.append(float(np.mean(ca)) - float(np.mean(cb)))
    lo, hi = np.percentile(np.array(D), [2.5, 97.5])
    return float(lo), float(hi)


@pytest.mark.parametrize('i', range(3))
def test_ci_cluster_against_slow(i):
    r = random.Random(95320 + i)
    n = 120
    keys = [r.choice(['cat', 'dog', 'émeu', 'ant', 'bee', 'cow', 'yak', 'Zebra']) for _ in range(n)]
    labels = [r.random() < 0.3 for _ in range(n)]
    A = [r.randint(0, 9) for _ in range(n)]
    B = [r.randint(0, 3) for _ in range(n)]
    iv = T.ci_cluster(A, B, keys, 'ap', labels, seed=95320 + i, resamples=300)
    assert (iv.lo, iv.hi) == slow_ci_cluster(A, B, keys, 'ap', labels, 95320 + i, 300)
    assert iv.est == float(T.ap_exact(A, labels) - T.ap_exact(B, labels))
    Af = ([r.randint(0, 9) for _ in range(n)], [r.randint(0, 9) for _ in range(n)])
    Bf = ([r.randint(0, 9) for _ in range(n)], [r.randint(0, 9) for _ in range(n)])
    iv = T.ci_cluster(Af, Bf, keys, 'accuracy', seed=95320 + i, resamples=300)
    assert (iv.lo, iv.hi) == slow_ci_cluster(Af, Bf, keys, 'accuracy', None, 95320 + i, 300)
    assert iv.est == float(T.accuracy(*Af) - T.accuracy(*Bf))


def test_ci_macro_against_slow():
    r = random.Random(95323)
    n = 200
    groups = [f'{r.randrange(30):08d}' for _ in range(n)]
    ra = [F(1, r.randint(1, 11)) for _ in range(n)]
    rb = [F(1, r.randint(1, 11)) for _ in range(n)]
    iv = T.ci_macro(ra, rb, groups, seed=95323, resamples=300)
    ma, means_a = T.macro_rr(ra, groups)
    mb, means_b = T.macro_rr(rb, groups)
    ks = sorted(set(groups))
    rng = np.random.default_rng(95323)
    D = []
    for _ in range(300):
        idx = rng.integers(0, len(ks), len(ks))
        D.append(float(np.mean([float(means_a[ks[int(c)]]) for c in idx])) -
                 float(np.mean([float(means_b[ks[int(c)]]) for c in idx])))
    lo, hi = np.percentile(np.array(D), [2.5, 97.5])
    assert (iv.lo, iv.hi) == (float(lo), float(hi)) and iv.est == float(ma - mb)


def test_default_seeds_are_the_registered_constants():
    """Checked as values; nothing is drawn with them."""
    for f in (T.ci_rho, T.ci_rho_rows, T.ci_cluster, T.ci_macro, R.ci_mean):
        assert inspect.signature(f).parameters['seed'].default == 7
        assert inspect.signature(f).parameters['resamples'].default == 10_000
    assert T.SEED == 7 and T.RESAMPLES == 10_000 and T.ci_mean is R.ci_mean
    assert inspect.signature(T.suite_threshold).parameters['seed'].default == 42 == T.SUITE_SEED
    assert T.SUITE_TRIALS == 1000 and T.SUITE_VAL_PROB == 0.02


def test_registered_seed_constants_match_a13_12():
    """A13.12's seed table, read from PREREGISTRATION.md (the constants only; nothing is drawn)."""
    import os
    from lexicon import l6
    from lexicon import SYSTEM
    text = open(os.path.join(SYSTEM, 'PREREGISTRATION.md'), encoding='utf-8').read()
    a13 = l6.amendment_section(text, 13)
    rows = {line.split('|')[1].strip(): line for line in a13.split('\n') if line.startswith('| ') and '|' in line[2:]}
    want = {'L12 gold': ('L12 gold permutations', '`Rng(2440 + i)`', '5440 + i'),
            'L14 gold': ('L14 gold permutations', '`Rng(2640 + i)`', '5640 + i'),
            'L13 BD labels': ('L13 label permutations', 'BD `Rng(2460 + i)`', '5460 + i'),
            'L13 WB labels': ('L13 label permutations', 'WB `Rng(2480 + i)`', '5480 + i'),
            'L15 SL gold': ('L15 gold permutations', 'SL `Rng(2500 + i)`', '+3000'),
            'L15 MEN gold': ('L15 gold permutations', 'MEN `Rng(2520 + i)`', '+3000'),
            'L15 WSR gold': ('L15 gold permutations', 'WSR `Rng(2540 + i)`', '+3000'),
            'L15 HL-glove gold': ('L15 gold permutations', 'HL in GloVe `Rng(2560 + i)`', '+3000'),
            'L15 GloVe vectors': ('L15 GloVe vector permutations', '`Rng(2580 + i)`', '5580 + i')}
    for k, (row, dec, dry) in want.items():
        assert dec in rows[row] and dry in rows[row]
        assert T.PERM_SEEDS[k][1] == T.PERM_SEEDS[k][0] + 3000
    assert set(T.PERM_SEEDS) == set(want)
    for k, row, dec, dry in (('S-full', 'S-full', '`Rng(2400 + i)`', '5400 + i'),
                             ('W', 'W', '`Rng(2420 + i)`', '5420 + i'),
                             ('S3', 'S3 (reported)', '`s3_words(words, 2000 + i)`', '5000 + i')):
        assert dec in rows[row] and dry in rows[row] and S.ARM_SEEDS[k][1] - S.ARM_SEEDS[k][0] == 3000


# ================================================================ AP, RR, accuracy, F1
def all_orders_ap(codes, labels):
    """APs of every order of the rows consistent with the codes (higher code first)."""
    n = len(codes)
    out = []
    for perm in itertools.permutations(range(n)):
        if any(codes[perm[k]] < codes[perm[k + 1]] for k in range(n - 1)):
            continue
        tp, terms = 0, []
        for pos, i in enumerate(perm, 1):
            if labels[i]:
                tp += 1
                terms.append(F(tp, pos))
        out.append(sum(terms) / len(terms))
    return out


def test_ap_against_brute_force():
    r = random.Random(95330)
    for _ in range(60):
        n = r.randint(2, 7)
        codes = [r.randint(0, 3) for _ in range(n)]
        labels = [r.random() < 0.5 for _ in range(n)]
        if not any(labels):
            assert T.ap_exact(codes, labels) is None and T.ap_sklearn(codes, labels) is None
            continue
        aps = all_orders_ap(codes, labels)
        assert T.ap_exact(codes, labels) == min(aps)
        assert T.ap_fractional(codes, labels) == sum(aps) / len(aps)
        assert T.ap_float(codes, labels) == pytest.approx(float(min(aps)), rel=1e-14)
        assert T.ap_float(codes, labels) == slow_ap_float(codes, labels)
        if len(set(codes)) == n:
            assert T.ap_sklearn(codes, labels) == T.ap_exact(codes, labels)
    keys = [5, 3, 3, 1]
    labels = [False, True, False, True]
    m = max(keys)
    assert T.ap_exact(keys, labels) == R._ap_and_ranks(sorted(m - k for k in keys), [m - k for k in keys], [1, 3])[0]


def test_ap_sklearn_hand_computed():
    # thresholds 3, 2, 1, 0: (R, P) = (1/3, 1), (2/3, 2/3), (2/3, 1/2), (1, 3/5): AP = 1/3 + 2/9 + 1/5 = 34/45
    assert T.ap_sklearn([3, 2, 2, 1, 0], [True, False, True, False, True]) == F(34, 45)
    # one tied block of everything: AP = the share of positives
    assert T.ap_sklearn([1, 1, 1, 1], [True, False, False, True]) == F(1, 2)
    assert T.ap_exact([1, 1, 1, 1], [True, False, False, True]) == F(1, 2) * (F(1, 3) + F(2, 4))


def test_ap_float_with_multiplicities():
    r = random.Random(95331)
    codes = [r.randint(0, 4) for _ in range(30)]
    labels = [r.random() < 0.4 for _ in range(30)]
    mult = [r.randint(0, 3) for _ in range(30)]
    ex_codes = [c for c, m in zip(codes, mult) for _ in range(m)]
    ex_labels = [lab for lab, m in zip(labels, mult) for _ in range(m)]
    assert T.ap_float(codes, labels, np.array(mult)) == slow_ap_float(ex_codes, ex_labels)


def test_rr_macro_accuracy():
    assert T.rr(5, [5, 3, 6]) == F(1, 3) and T.rr(7, [1, 2, 3]) == 1 and T.rr(0, [0] * 10) == F(1, 11)
    rrs = [F(1), F(1, 2), F(1, 3), F(1)]
    macro, means = T.macro_rr(rrs, ['00000002', '00000001', '00000002', '00000003'])
    assert means == {'00000001': F(1, 2), '00000002': F(2, 3), '00000003': F(1)}
    assert list(means) == ['00000001', '00000002', '00000003'] and macro == (F(1, 2) + F(2, 3) + 1) / 3
    assert T.mean_exact(rrs) == F(17, 24)
    assert T.accuracy([3, 2, 5], [1, 2, 7]) == F(1, 3)
    # Sym is symmetric: forward and reverse keys are equal, so the joint codes are equal and accuracy is exactly 0
    keys_f = [F(-3), F(-1, 2), F(-7)]
    cf, cr = S.joint_key_codes([keys_f, list(keys_f)])
    assert T.accuracy(cf, cr) == 0


def test_f1():
    f1, c = T.f1_from_predictions([True, True, False, False], [True, False, True, False])
    assert f1 == F(1, 2) and c == {'tp': 1, 'fp': 1, 'fn': 1, 'tn': 1}
    assert T.f1_from_predictions([False], [False])[0] == 0
    # codes 0..4 with labels F T F T T: theta 1 -> 6/7 (the best), theta 3 -> 4/5
    assert T.f1_select([0, 1, 2, 3, 4], [False, True, False, True, True]) == (1, F(6, 7))
    # ties go to the smallest theta: codes 0, 1 with labels T, T then F at 2... F1 equal at theta 0 and theta 1
    assert T.f1_select([0, 1, 1], [False, True, True]) == (1, F(1)) and T.f1_select([0, 0], [True, True]) == (0, 1)
    assert T.f1_select([0, 1, 2, 3], [True, False, True, False])[0] == 0


# ================================================================ the suite's threshold rule (reported)
def _pr_thresholds(y, h):
    """sklearn's precision_recall_curve thresholds, re-implemented independently: distinct scores, descending, cut
    where recall first reaches 1, returned increasing."""
    order = np.argsort(h, kind='mergesort')[::-1]
    hs, ys = h[order], y[order]
    idx = np.r_[np.where(np.diff(hs))[0], len(hs) - 1]
    tps = np.cumsum(ys)[idx]
    last = tps.searchsorted(tps[-1])
    return hs[idx][last::-1]


def slow_suite(h, y, direction, seed, trials, val_prob):
    h, y = np.asarray(h), np.asarray(y)
    yh = (y != 0) if direction is not None else y.astype(bool)
    rng = np.random.RandomState(seed)
    vs, ts, skipped = [], [], 0
    for _ in range(trials):
        m_val = rng.rand(len(y)) < val_prob
        m_test = ~m_val
        if not yh[m_val].any():
            skipped += 1
            continue
        t = _pr_thresholds(yh[m_val], h[m_val])
        accs = np.mean((h[m_val, np.newaxis] >= t) == yh[m_val, np.newaxis], axis=0)
        best = t[accs.argmax()]
        if direction is None:
            vs.append(np.mean((h[m_val] >= best) == y[m_val]))
            ts.append(np.mean((h[m_test] >= best) == y[m_test]))
        else:
            d = np.asarray(direction)
            vs.append(np.mean((h[m_val] >= best) * d[m_val] == y[m_val]))
            ts.append(np.mean((h[m_test] >= best) * d[m_test] == y[m_test]))
    return float(np.mean(vs)), float(np.mean(ts)), skipped


def test_suite_pick_hand_computed():
    t, accs, best = T.suite_pick([5, 3, 3, 1, 0], [False, True, False, True, False])
    assert list(t) == [1, 3, 5] and list(accs) == [0.6, 0.4, 0.4] and best == 1
    t, accs, best = T.suite_pick([4, 2, 2], [True, False, True])        # lowest positive's score 2: t = [2, 4]
    assert list(t) == [2, 4] and list(accs) == [pytest.approx(2 / 3)] * 2 and best == 2


@pytest.mark.parametrize('i', range(3))
def test_suite_threshold_against_slow(i):
    r = random.Random(95340 + i)
    n = 300
    h = [r.randint(0, 25) for _ in range(n)]
    y = [r.random() < 0.4 for _ in range(n)]
    out = T.suite_threshold(h, y, seed=95340 + i, trials=150, val_prob=0.03)
    va, ta, sk = slow_suite(h, y, None, 95340 + i, 150, 0.03)
    assert (out['acc_val'], out['acc_test'], out['skipped']) == (va, ta, sk) and sk > 0
    yb = [r.choice([-1, 0, 0, 1]) for _ in range(n)]
    d = [r.choice([-1, 1]) for _ in range(n)]
    out = T.suite_threshold(h, yb, direction=d, seed=95340 + i, trials=150, val_prob=0.05)
    assert (out['acc_val'], out['acc_test'], out['skipped']) == slow_suite(h, yb, d, 95340 + i, 150, 0.05)


# ================================================================ bands, permutations, the strongest permutation
def test_bands():
    assert round(T.gold_band(2163), 4) == 0.0240 and round(T.gold_band(666), 4) == 0.0434
    assert round(T.gold_band(2005), 4) == 0.0250 and round(T.gold_band(2153), 4) == 0.0241
    b = T.gold_band(2163)
    assert T.gold_band_holds([b * (1 - 1e-12)] * 20, 2163) and T.gold_band_holds([-b * (1 - 1e-12)] * 20, 2163)
    assert not T.gold_band_holds([b * (1 + 1e-9)] * 20, 2163)
    assert not T.gold_band_holds([-b * (1 + 1e-9)] * 20, 2163)
    assert T.gold_band_holds([1.0, -1.0] * 10, 2163)
    with pytest.raises(ValueError):
        T.gold_band_holds([0.0] * 19, 2163)
    pi = F(1194, 12365)
    edge = [pi + F(1, 50)] * 20
    assert T.label_band_holds(edge, pi)
    assert not T.label_band_holds(edge[:-1] + [pi + F(1, 50) + F(1, 10 ** 12)], pi)
    with pytest.raises(TypeError):
        T.label_band_holds([0.1] * 20, pi)
    assert T.H11 == sum(F(1, k) for k in range(1, 12)) and round(float(T.H11 / 11), 5) == 0.27453
    assert round(float(T.RR_BAND), 5) == 0.29453
    assert T.rr_band_holds(T.RR_BAND) and not T.rr_band_holds(T.RR_BAND + F(1, 10 ** 15))
    with pytest.raises(TypeError):
        T.rr_band_holds(0.2)


def test_permute_rows_convention():
    vals = list('abcdefghij')
    out = T.permute_rows(vals, 95350)
    rng = hpstep_prng.Rng(95350)
    pi = list(range(10))
    for k in range(9, 0, -1):
        j = rng.below(k + 1)
        pi[k], pi[j] = pi[j], pi[k]
    assert out == [vals[pi[k]] for k in range(10)] and sorted(out) == vals


def test_strongest():
    assert T.strongest([T.Rho(1, 4, 4), T.Rho(3, 4, 4), T.Rho(6, 8, 8), T.Rho(-1, 4, 4)]) == 1   # ties: smaller i
    assert T.strongest([F(1, 3), F(1, 2), F(1, 2)]) == 1 and T.strongest([F(0)]) == 0


# ================================================================ readings and decisions (test 10)
Iv = T.Interval
GOOD = Iv(0.30, 0.25, 0.35)
BAD = Iv(-0.10, -0.15, -0.05)
MID = Iv(0.01, -0.01, 0.03)
LO0 = Iv(0.01, 0.0, 0.03)                    # lo = 0: not above 0
HI0 = Iv(-0.01, -0.03, 0.0)                  # hi = 0: entirely at or below 0


def test_readings_boundaries():
    assert T.above0(GOOD) and not T.above0(LO0) and not T.above0(MID)
    assert T.at_or_below0(HI0) and T.at_or_below0(BAD) and not T.at_or_below0(MID)
    assert T.within(Iv(0, -0.02, 0.02))
    assert not T.within(Iv(0, -0.0200001, 0.02)) and not T.within(Iv(0, -0.02, 0.0200001))
    assert not T.outside(Iv(0.03, 0.02, 0.04)) and T.outside(Iv(0.03, 0.0200001, 0.04))
    assert not T.outside(Iv(-0.03, -0.04, -0.02)) and T.outside(Iv(-0.03, -0.04, -0.0200001))
    assert T.mean_le0(Iv(0.0, -1, 1)) and not T.mean_le0(Iv(1e-300, -1, 1))
    assert T.hi_le(Iv(0, 0, 0.02)) and not T.hi_le(Iv(0, 0, 0.0200001))
    assert T.lo_gt(Iv(0.03, 0.0200001, 0.04)) and not T.lo_gt(Iv(0.03, 0.02, 0.04))
    assert T.above0({'mean': 0.1, 'lo': 0.05, 'hi': 0.2}) and T.above0({'est': 0.1, 'lo': 0.05, 'hi': 0.2})
    assert [T.verdict(s, r) for s, r in ((1, 0), (0, 1), (1, 1), (0, 0))] == \
        ['supported', 'refuted', 'inconclusive', 'inconclusive']


def l12_inputs(**over):
    x = {'a': {k: GOOD for k in T.L12_A}, 'b': {'H3': GOOD, 'H2': GOOD}, 'c': {'H3': GOOD, 'H2': GOOD},
         'd': Iv(0.0, -0.015, 0.015), 'control1': {'K3': GOOD, 'S-full*': GOOD}, 'control2': {'W*': GOOD},
         'control3': GOOD, 'control4': {arm: [0.001, -0.002] * 10 for arm in T.L12_GOLD_ARMS}}
    x.update(over)
    return x


def test_l12_every_branch():
    d = T.decide_l12(**l12_inputs())
    assert not d['void'] and {p: d['parts'][p]['verdict'] for p in 'abcd'} == dict.fromkeys('abcd', 'supported')
    assert d['parts']['d']['flag'] == T.L12_PREVIEW_FLAG
    for cell in T.L12_A:
        for iv, want in ((MID, 'inconclusive'), (LO0, 'inconclusive'), (BAD, 'refuted'), (HI0, 'refuted')):
            a = {k: GOOD for k in T.L12_A}
            a[cell] = iv
            assert T.decide_l12(**l12_inputs(a=a))['parts']['a']['verdict'] == want
    for part in 'bc':
        for arm in ('H3', 'H2'):
            for iv, want in ((MID, 'inconclusive'), (HI0, 'refuted'), (LO0, 'inconclusive')):
                x = {'H3': GOOD, 'H2': GOOD}
                x[arm] = iv
                assert T.decide_l12(**l12_inputs(**{part: x}))['parts'][part]['verdict'] == want
    cases = ((Iv(0, -0.02, 0.02), 'supported', None), (Iv(0.05, 0.03, 0.07), 'refuted', 'high'),
             (Iv(-0.05, -0.07, -0.03), 'refuted', 'low'), (Iv(0.02, 0.01, 0.03), 'inconclusive', 'high'),
             (Iv(-0.02, -0.03, 0.01), 'inconclusive', 'low'), (Iv(0.03, 0.02, 0.04), 'inconclusive', 'high'))
    for iv, want, side in cases:
        p = T.decide_l12(**l12_inputs(d=iv))['parts']['d']
        assert p['verdict'] == want and p['failing_side'] == side


def test_l12_controls_void_before_refuted():
    bad_a = {k: BAD for k in T.L12_A}
    fails = [{'control1': {'K3': MID, 'S-full*': GOOD}}, {'control1': {'K3': GOOD, 'S-full*': LO0}},
             {'control2': {'W*': MID}}, {'control3': HI0},
             {'control4': dict({arm: [0.0] * 20 for arm in T.L12_GOLD_ARMS}, WN=[0.025] * 20)}]
    for f in fails:
        d = T.decide_l12(**l12_inputs(a=bad_a, **f))
        assert d['void'] and all(d['parts'][p]['verdict'] == 'void' for p in 'abcd')
        assert d['parts']['a']['verdict_before_controls'] == 'refuted'
    with pytest.raises(ValueError):
        T.decide_l12(**l12_inputs(control4={'H3': [0.0] * 20}))
    near = T.gold_band(2163) * (1 - 1e-9)
    assert not T.decide_l12(**l12_inputs(control4={arm: [near] * 20 for arm in T.L12_GOLD_ARMS}))['void']


def l13_inputs(**over):
    x = {'parts': {p: {k: GOOD for k in T.L13_CELLS} for p in 'abc'},
         'control1': {p: {'K3': GOOD, 'S-full*': GOOD, 'W*': GOOD} for p in 'abc'},
         'control2': {(arm, st): [T.L13_PI[st]] * 20 for arm in T.L13_ARMS for st in T.L13_SETS},
         'control3': {'Sym-H3': F(0), 'GloVe': F(0)}}
    x.update(over)
    return x


def test_l13_every_branch():
    d = T.decide_l13(**l13_inputs())
    assert not d['void'] and all(d['parts'][p]['verdict'] == 'supported' for p in 'abc')
    for p in 'abc':
        for iv, want in ((MID, 'inconclusive'), (LO0, 'inconclusive'), (BAD, 'refuted'), (HI0, 'refuted')):
            parts = {q: {k: GOOD for k in T.L13_CELLS} for q in 'abc'}
            parts[p]['H2-F2*'] = iv
            out = T.decide_l13(**l13_inputs(parts=parts))
            assert out['parts'][p]['verdict'] == want
            assert all(out['parts'][q]['verdict'] == 'supported' for q in 'abc' if q != p)
    parts = {q: {k: BAD for k in T.L13_CELLS} for q in 'abc'}
    for p in 'abc':                            # control 1 failing on any part voids all of L13
        for k in ('K3', 'S-full*', 'W*'):
            c1 = {q: {kk: GOOD for kk in ('K3', 'S-full*', 'W*')} for q in 'abc'}
            c1[p][k] = LO0
            out = T.decide_l13(**l13_inputs(parts=parts, control1=c1))
            assert out['void'] and all(out['parts'][q]['verdict'] == 'void' for q in 'abc')
            assert out['parts']['a']['verdict_before_controls'] == 'refuted'
    c2 = {(arm, st): [T.L13_PI[st] + F(1, 50)] * 20 for arm in T.L13_ARMS for st in T.L13_SETS}
    assert not T.decide_l13(**l13_inputs(control2=c2))['void']          # = pi + 1/50: holds
    c2[('F2*', 'WB')] = [T.L13_PI['WB'] + F(1, 50) + F(1, 10 ** 9)] * 20
    assert T.decide_l13(**l13_inputs(control2=c2))['void']
    for k in T.L13_SYMMETRIC:
        c3 = {'Sym-H3': F(0), 'GloVe': F(0)}
        c3[k] = F(1, 1194)
        assert T.decide_l13(**l13_inputs(control3=c3))['void']
    with pytest.raises(TypeError):
        T.decide_l13(**l13_inputs(control3={'Sym-H3': 0.0, 'GloVe': F(0)}))


def l14_presence_all(**missing):
    measured = {(g, d, s): {'exists': True, 'converged': True} for g in T.L14_GEOMETRIES for d in T.L14_DIMS
                for s in T.L14_SEEDS}
    shuffled = {(g, d, s): True for g in T.L14_GEOMETRIES for d in T.L14_DIMS for s in T.L14_SEEDS}
    return measured, shuffled


def l14_inputs(presence=None, **over):
    if presence is None:
        presence = T.l14_presence(*l14_presence_all())
    x = {'a': {(d, st, s): GOOD for d in T.L14_DIMS for st in T.L14_SETTINGS for s in T.L14_SEEDS},
         'b': {(d, s): GOOD for d in T.L14_DIMS for s in T.L14_SEEDS},
         'presence': presence,
         'control1': {('lorentz', 2, 0): F(27, 100), ('euclid', 3, 9000): F(1, 4)},
         'control2': {('lorentz', 2, 0): F(28, 100)},
         'control3': {(d, s, m): {'lorentz': GOOD, 'euclid': MID} for d in T.L14_DIMS for s in T.L14_SEEDS
                      for m in T.L14_METRICS},
         'control4': {('lorentz', 2, 0): [0.001] * 20, ('euclid', 2, 0): [-0.001] * 20},
         'closure': {'random': True, 'hard': True}}
    x.update(over)
    return x


def test_l14_presence():
    measured, shuffled = l14_presence_all()
    p = T.l14_presence(measured, shuffled)
    assert all(p.values()) and len(p) == 10
    m2 = dict(measured)
    m2[('euclid', 3, 4)] = {'exists': True, 'converged': False}
    assert T.l14_presence(m2, shuffled)[(3, 4)] is False and T.l14_presence(m2, shuffled)[(2, 4)] is True
    m2[('lorentz', 2, 1)] = {'exists': False}
    assert T.l14_presence(m2, shuffled)[(2, 1)] is False
    s2 = dict(shuffled)
    del s2[('lorentz', 3, 0)]
    assert T.l14_presence(measured, s2)[(3, 0)] is False
    frozen = {('lorentz', 2): '0.1', ('euclid', 2): None, ('lorentz', 3): '1', ('euclid', 3): '3'}
    p = T.l14_presence(measured, shuffled, frozen)
    assert not any(p[(2, s)] for s in T.L14_SEEDS) and all(p[(3, s)] for s in T.L14_SEEDS)


def test_l14_every_branch():
    d = T.decide_l14(**l14_inputs())
    assert not d['void'] and d['parts']['a']['verdict'] == 'supported' and d['parts']['b']['verdict'] == 'supported'
    assert d['controls']['control3']['cells']['d2/s0/rho']['euclid']['label'] == 'true ≈ shuffled'
    # (a): one seed of one cell not above 0 -> inconclusive; mean <= 0 in 3 seeds of one cell -> refuted
    a = l14_inputs()['a']
    a[(3, 'hard', 2)] = MID
    assert T.decide_l14(**l14_inputs(a=a))['parts']['a']['verdict'] == 'inconclusive'
    a = l14_inputs()['a']
    for s in (0, 1):
        a[(2, 'random', s)] = BAD
    assert T.decide_l14(**l14_inputs(a=a))['parts']['a']['verdict'] == 'inconclusive'     # two seeds: not refuted
    a[(2, 'random', 2)] = Iv(0.0, -0.01, 0.01)                                            # mean = 0 counts
    out = T.decide_l14(**l14_inputs(a=a))['parts']['a']
    assert out['verdict'] == 'refuted' and out['cells']['d2/random']['refuting_seeds'] == 3
    # both conditions in one part: every seed lo > 0 but the mean <= 0 in three -> inconclusive (A11.4)
    a = l14_inputs()['a']
    for s in (0, 1, 2):
        a[(3, 'random', s)] = Iv(-0.01, 0.01, 0.05)
    out = T.decide_l14(**l14_inputs(a=a))['parts']['a']
    assert out['support'] and out['refute'] and out['verdict'] == 'inconclusive'
    # a seed not present: no support; refutation counts present seeds only
    measured, shuffled = l14_presence_all()
    measured[('euclid', 2, 4)] = {'exists': False}
    pres = T.l14_presence(measured, shuffled)
    a = l14_inputs()['a']
    for st in T.L14_SETTINGS:
        a[(2, st, 4)] = None
    b = l14_inputs()['b']
    b[(2, 4)] = None
    out = T.decide_l14(**l14_inputs(presence=pres, a=a, b=b))
    assert out['parts']['a']['verdict'] == 'inconclusive' and out['parts']['b']['verdict'] == 'inconclusive'
    assert out['parts']['a']['cells']['d2/random']['present'] == 4
    for s in (0, 1, 2):
        b[(2, s)] = BAD
    assert T.decide_l14(**l14_inputs(presence=pres, a=a, b=b))['parts']['b']['verdict'] == 'refuted'
    with pytest.raises(ValueError):                    # a present seed must have an interval
        T.decide_l14(**l14_inputs(b={k: (None if k == (3, 0) else v) for k, v in l14_inputs()['b'].items()}))
    # (b) at both d; refuted at either
    b = l14_inputs()['b']
    b[(3, 1)] = LO0
    assert T.decide_l14(**l14_inputs(b=b))['parts']['b']['verdict'] == 'inconclusive'


def test_l14_controls():
    bad_a = {k: BAD for k in l14_inputs()['a']}
    for over in ({'control1': {'t': T.RR_BAND + F(1, 10 ** 9)}}, {'control2': {'t': T.RR_BAND + F(1, 10 ** 9)}},
                 {'closure': {'random': True, 'hard': False}}):
        d = T.decide_l14(**l14_inputs(a=bad_a, **over))
        assert d['void'] and d['parts']['a']['verdict'] == 'void' and d['parts']['b']['verdict'] == 'void'
        assert d['parts']['a']['verdict_before_controls'] == 'refuted'
    assert not T.decide_l14(**l14_inputs(control1={'t': T.RR_BAND}, control2={'t': T.RR_BAND}))['void']
    # control 3: one cell above 0 suffices; neither -> void the part of that metric only
    c3 = l14_inputs()['control3']
    c3[(2, 3, 'rr_hard')] = {'lorentz': LO0, 'euclid': MID}
    d = T.decide_l14(**l14_inputs(control3=c3))
    assert d['parts']['a']['verdict'] == 'void' and d['parts']['b']['verdict'] == 'supported' and not d['void']
    assert d['controls']['control3']['failed'] == [(2, 3, 'rr_hard')]
    c3 = l14_inputs()['control3']
    c3[(3, 0, 'rho')] = {'lorentz': None, 'euclid': HI0}
    d = T.decide_l14(**l14_inputs(control3=c3))
    assert d['parts']['b']['verdict'] == 'void' and d['parts']['a']['verdict'] == 'supported'
    c3 = l14_inputs()['control3']
    c3[(2, 1, 'rr_random')] = {'lorentz': MID, 'euclid': GOOD}
    assert T.decide_l14(**l14_inputs(control3=c3))['parts']['a']['verdict'] == 'supported'
    # a seed not present at d needs no control-3 entry
    measured, shuffled = l14_presence_all()
    measured[('lorentz', 3, 2)] = {'exists': True, 'converged': False}
    pres = T.l14_presence(measured, shuffled)
    c3 = {k: v for k, v in l14_inputs()['control3'].items() if k[:2] != (3, 2)}
    out = T.edge_shuffle_control(c3, pres)
    assert not out['failed'] and 'd3/s2/rho' not in out['cells']
    with pytest.raises(ValueError):
        T.edge_shuffle_control({k: v for k, v in c3.items() if k != (2, 0, 'rho')}, pres)
    # control 4 voids (b) only
    d = T.decide_l14(**l14_inputs(control4={'t': [0.03] * 20}))
    assert d['parts']['b']['verdict'] == 'void' and d['parts']['a']['verdict'] == 'supported'


def l15_inputs(**over):
    ok = Iv(0.0, -0.01, 0.015)
    x = {'a': {st: {k: ok for k in T.L12_A} for st in T.L15_A_SETS},
         'b': {'MEN': GOOD, 'WSR': GOOD, 'HL': GOOD},
         'control1': {st: {'K3': GOOD, 'S-full*': GOOD, 'W*': GOOD} for st in T.L15_A_SETS},
         'control2': [{'arm': arm, 'set': st, 'rhos': [0.001] * 20, 'n': 666}
                      for arm in ('H3', 'F2*', 'GloVe') for st in T.L15_SET_PARTS],
         'control3': {st: ([0.002] * 20, 245) for st in T.L15_B_SETS}}
    x.update(over)
    return x


def test_l15_every_branch():
    d = T.decide_l15(**l15_inputs())
    assert d['parts']['a']['verdict'] == 'supported' and d['parts']['b']['verdict'] == 'supported'
    for st in T.L15_A_SETS:
        for cell in T.L12_A:
            for iv, want in ((Iv(0.01, 0.0, 0.02), 'supported'), (Iv(0.02, 0.0, 0.0200001), 'inconclusive'),
                             (Iv(0.03, 0.0200001, 0.04), 'refuted'), (Iv(0.03, 0.02, 0.04), 'inconclusive')):
                a = {s: {k: Iv(0.0, -0.01, 0.015) for k in T.L12_A} for s in T.L15_A_SETS}
                a[st][cell] = iv
                assert T.decide_l15(**l15_inputs(a=a))['parts']['a']['verdict'] == want
    for k in T.L15_B:
        for iv, want in ((MID, 'inconclusive'), (LO0, 'inconclusive'), (HI0, 'refuted'), (BAD, 'refuted')):
            b = {'MEN': GOOD, 'WSR': GOOD, 'HL': GOOD}
            b[k] = iv
            assert T.decide_l15(**l15_inputs(b=b))['parts']['b']['verdict'] == want


def test_l15_controls():
    bad = {st: {k: Iv(0.05, 0.03, 0.07) for k in T.L12_A} for st in T.L15_A_SETS}
    c1 = {st: {'K3': GOOD, 'S-full*': GOOD, 'W*': GOOD} for st in T.L15_A_SETS}
    c1['MEN']['W*'] = LO0
    d = T.decide_l15(**l15_inputs(a=bad, control1=c1))
    assert d['parts']['a']['verdict'] == 'void' and d['parts']['a']['verdict_before_controls'] == 'refuted'
    assert d['parts']['b']['verdict'] == 'supported'
    for st, parts in T.L15_SET_PARTS.items():
        c2 = l15_inputs()['control2'] + [{'arm': 'H3', 'set': st, 'rhos': [0.2] * 20, 'n': 666}]
        d = T.decide_l15(**l15_inputs(control2=c2))
        assert {p for p in 'ab' if d['parts'][p]['verdict'] == 'void'} == set(parts)
    with pytest.raises(ValueError):
        T.decide_l15(**l15_inputs(control2=[{'arm': 'H3', 'set': 'MEN∩GloVe', 'rhos': [0.0] * 20, 'n': 9}]))
    c3 = {st: ([0.002] * 20, 245) for st in T.L15_B_SETS}
    c3['HL-glove'] = ([0.5] * 20, 2000)
    d = T.decide_l15(**l15_inputs(control3=c3))
    assert d['parts']['b']['verdict'] == 'void' and d['parts']['a']['verdict'] == 'supported'
    edge = T.gold_band(245) * (1 - 1e-12)
    c3 = {st: ([edge] * 20, 245) for st in T.L15_B_SETS}
    assert T.decide_l15(**l15_inputs(control3=c3))['parts']['b']['verdict'] == 'supported'
