"""Stage 2 statistics and decisions (Amendment 13, item 7 and the claims L12-L15; build spec section 7). Every metric
reads integer tie-class codes (lexicon.scores2) or exact gold values; no float64 value orders anything decided.
Floats appear only inside bootstrap resamples, in the reported binary64 tails and in diagnostics.

Metrics (exact):
    exact_codes(values)                  dense codes of exact values (gold: equal exact values tie)
    avg_rank_ints(codes)                 a_i = 2 R_i - (n + 1) = first + last - (n + 1), R_i the average rank (ints)
    Rho, rho(codes, gold)                Spearman's rho on average ranks with its three sums exact (A13.7's reading
                                         of the tie rule): exact comparisons, binary64 rounding, 6-decimal display
    rho_tie_bounds(codes, gold)          (tie-pessimistic, tie-optimistic) rho, reported
    ap_exact(codes, labels)              AP with pessimistic ties, rank._ap_and_ranks on keys maxcode - code
    ap_sklearn(codes, labels)            sklearn's average_precision_score convention (a tied block at once), reported
    ap_fractional(codes, labels)         fractional-tie AP (learned.fractional_ap), reported
    rr(pos_code, neg_codes), mean_exact, macro_rr(rrs, groups)       HiT's pessimistic RR, the per-row and macro means
    accuracy(codes_f, codes_r)           direction accuracy #{f > r}/n
    f1_select(val_codes, val_labels), f1_from_predictions(pred, labels)   F1 under HiT's protocol (reported)
    f1_threshold(val_codes, val_labels, test_codes, test_labels)          the same from one joint val + test list
    suite_threshold(h, y, ...)           the suite's 1,000 x 2% threshold protocol (WBLESS, BiBLESS; reported)
    suite_detection(codes, folds, ...)   the suite's own detection protocol: OOV test rows at the lowest in-vocabulary
                                         validation score, AP over the whole test fold (reported)
    nk18_rho(radius_keys, splp)          Nickel & Kiela 2018's diagnostic, rho between r and sp/(sp + lp) (reported)
Intervals (95% percentile bootstrap, 10,000 resamples, a fresh numpy default_rng(seed) per interval, seed 7):
    ci_mean                              rank.ci_mean, unchanged (per-row RR differences on HiT)
    ci_rho(A, B, gold, rows, words)      the word-level (pigeonhole) bootstrap of rho(A) - rho(B) (decided)
    ci_rho_rows(A, B, gold)              the row bootstrap (reported), the index stream of ci_mean
    ci_cluster(A, B, keys, metric)       the cluster bootstrap of AP or direction accuracy (BD, WB, BD-dir)
    ci_macro(rrA, rrB, groups)           the bootstrap over positive synsets of the macro mean RR (reported)
Bands, controls and decisions:
    gold_band, gold_band_holds, label_band_holds, H11, RR_BAND, rr_band_holds, permute_rows, strongest
    above0, at_or_below0, within, outside, mean_le0, hi_le, lo_gt       A13.7's readings as named predicates
    verdict, decide_l12, decide_l13, l14_presence, edge_shuffle_control, decide_l14, decide_l15

READINGs are marked where a definition admits two readings; each cites the A13 item it implements.
"""
import math
from collections import Counter, namedtuple
from decimal import ROUND_HALF_EVEN, Context, Decimal
from fractions import Fraction

import numpy as np
from hpstep import prng

from . import learned as LR
from . import rank as R

SEED = 7                      # the statistics constant (Common rules); every interval takes `seed`
RESAMPLES = 10_000
SUITE_SEED = 42               # the suite's RandomState(42): the protocol's constant (A13.11), not this project's
SUITE_TRIALS = 1000
SUITE_VAL_PROB = 0.02
H11 = sum((Fraction(1, k) for k in range(1, 12)), Fraction(0))
RR_BAND = H11 / 11 + Fraction(1, 50)
LABEL_MARGIN = Fraction(1, 50)
BAND = 0.02                   # L12(d), L15(a): +-0.02 in float64 (A13.7, A10.7)
REFUTE_SEEDS = 3              # L14: "three or more seeds present" (A10.7)
FLOAT_PREC = 60               # decimal digits behind every binary64 rounding of an irrational rho

# A13.12's permutation seeds, (decisive base, dry base) + i, i < 20; functions take the seed itself (permute_rows).
PERM_SEEDS = {'L12 gold': (2440, 5440), 'L13 BD labels': (2460, 5460), 'L13 WB labels': (2480, 5480),
              'L15 SL gold': (2500, 5500), 'L15 MEN gold': (2520, 5520), 'L15 WSR gold': (2540, 5540),
              'L15 HL-glove gold': (2560, 5560), 'L15 GloVe vectors': (2580, 5580), 'L14 gold': (2640, 5640)}

Interval = namedtuple('Interval', 'est lo hi')


# ================================================================ ranks and rho (A13.7)
def exact_codes(values):
    """Dense codes 0, 1, ... of exact values (ints, Fractions), increasing with the value; equal values tie."""
    distinct = sorted(set(values))
    rank = {v: i for i, v in enumerate(distinct)}
    return [rank[v] for v in values]


def avg_rank_ints(codes):
    """Average ranks from codes (A13.7): a code at sorted positions first..last (1-based) has 2R = first + last, and
    a_i = first + last - (n + 1), an int. This average-rank rho is the decided one: A13.7 reads the Common rules' tie
    sentence for rho as the standard tie-corrected Spearman (scipy's spearmanr), not a pessimistic or fractional
    value."""
    n = len(codes)
    cnt = Counter(codes)
    a_of, below = {}, 0
    for c in sorted(cnt):
        k = cnt[c]
        a_of[c] = (below + 1) + (below + k) - (n + 1)
        below += k
    return [a_of[c] for c in codes]


def _sign(x):
    return (x > 0) - (x < 0)


class Rho:
    """rho = sab / sqrt(saa sbb), the three sums exact Python ints (A13.7). A zero variance gives rho = 0, flagged
    (.zero). Comparisons with another Rho or with a rational are exact."""
    __slots__ = ('sab', 'saa', 'sbb', 'n')

    def __init__(self, sab, saa, sbb, n=None):
        self.sab, self.saa, self.sbb, self.n = int(sab), int(saa), int(sbb), n
        if self.saa < 0 or self.sbb < 0:
            raise ValueError('negative sum of squares')

    @property
    def zero(self):
        return self.saa == 0 or self.sbb == 0

    def _pq(self):
        return (0, 1) if self.zero else (self.sab, self.saa * self.sbb)

    def cmp(self, other):
        """-1, 0 or 1: the sign of self - other, exactly."""
        p1, q1 = self._pq()
        p2, q2 = other._pq()
        s1, s2 = _sign(p1), _sign(p2)
        if s1 != s2:
            return _sign(s1 - s2)
        if s1 == 0:
            return 0
        c = _sign(p1 * p1 * q2 - p2 * p2 * q1)
        return c if s1 > 0 else -c

    def cmp_rational(self, c):
        """-1, 0 or 1: the sign of rho - c for a rational c, exactly (sign, then sab^2 against c^2 saa sbb)."""
        c = Fraction(c)
        p, q = self._pq()
        sp, sc = _sign(p), _sign(c.numerator)
        if sp != sc:
            return _sign(sp - sc)
        if sp == 0:
            return 0
        u, v = c.numerator, c.denominator
        k = _sign(p * p * v * v - u * u * q)
        return k if sp > 0 else -k

    def __lt__(self, other):
        return self.cmp(other) < 0

    def __le__(self, other):
        return self.cmp(other) <= 0

    def __gt__(self, other):
        return self.cmp(other) > 0

    def __ge__(self, other):
        return self.cmp(other) >= 0

    def __eq__(self, other):
        return isinstance(other, Rho) and self.cmp(other) == 0

    __hash__ = None

    def decimal(self, prec=FLOAT_PREC):
        ctx = Context(prec=prec, rounding=ROUND_HALF_EVEN)
        if self.zero:
            return Decimal(0)
        return ctx.divide(Decimal(self.sab), ctx.sqrt(Decimal(self.saa * self.sbb)))

    def __float__(self):
        """rho rounded to binary64 from a 60-digit decimal value."""
        return float(self.decimal(FLOAT_PREC))

    def round6(self):
        """The integer m with rho correctly rounded to m / 10^6 (half to even), from exact comparisons."""
        if self.zero:
            return 0
        ctx = Context(prec=60, rounding=ROUND_HALF_EVEN)
        m = int(ctx.scaleb(self.decimal(50), 6).to_integral_value(rounding=ROUND_HALF_EVEN))
        S = 2 * 10 ** 6
        while self.cmp_rational(Fraction(2 * m + 1, S)) > 0:
            m += 1
        while self.cmp_rational(Fraction(2 * m - 1, S)) < 0:
            m -= 1
        if self.cmp_rational(Fraction(2 * m + 1, S)) == 0 and m % 2:
            m += 1
        elif self.cmp_rational(Fraction(2 * m - 1, S)) == 0 and m % 2:
            m -= 1
        return m

    def display(self):
        """rho correctly rounded to six decimals (A13.7), e.g. '0.512345', '-0.000001'."""
        m = self.round6()
        sign = '-' if (m < 0 or (m == 0 and self.sab < 0 and not self.zero)) else ''
        m = abs(m)
        return f'{sign}{m // 10 ** 6}.{m % 10 ** 6:06d}'

    def text(self):
        """A13.14's metric text for rho: 'sab|saa|sbb'."""
        return f'{self.sab}|{self.saa}|{self.sbb}'

    def __repr__(self):
        return f'Rho({self.sab}, {self.saa}, {self.sbb}{", zero" if self.zero else ""})'


def rho(codes, gold):
    """Spearman's rho of a system's codes against the gold (exact values or codes), on average ranks (A13.7)."""
    if len(codes) != len(gold):
        raise ValueError('codes and gold differ in length')
    a = avg_rank_ints(list(codes))
    b = avg_rank_ints(exact_codes(gold))
    return Rho(sum(x * y for x, y in zip(a, b)), sum(x * x for x in a), sum(y * y for y in b), len(a))


def rho_tie_bounds(codes, gold):
    """Reported (A13.7): inside each system tie class, the rows ordered against the gold (pessimistic: the higher
    gold first, so it takes the lower rank) or with it (optimistic), given distinct ranks, and rho recomputed; the
    gold keeps its average ranks. Returns (pessimistic, optimistic)."""
    n = len(codes)
    g = exact_codes(gold)
    b = avg_rank_ints(g)
    out = []
    for sgn in (-1, 1):
        order = sorted(range(n), key=lambda i: (codes[i], sgn * g[i]))
        a = [0] * n
        for pos, i in enumerate(order, 1):
            a[i] = 2 * pos - (n + 1)
        out.append(Rho(sum(x * y for x, y in zip(a, b)), sum(x * x for x in a), sum(y * y for y in b), n))
    return tuple(out)


def nk18_positions(splp):
    """(the nodes kept, the dense codes of their positions sp/(sp + lp)) for nk18_rho: a node with sp + lp = 0 (one
    without an edge) has no position and is left out."""
    keep = [i for i, (a, b) in enumerate(splp) if a + b > 0]
    return keep, exact_codes([Fraction(splp[i][0], splp[i][0] + splp[i][1]) for i in keep])


def nk18_rho(radius_keys, splp, positions=None):
    """Nickel & Kiela 2018's diagnostic (A13.11, reported for the learned tables and the exact trees): Spearman's rho,
    on average ranks (A13.7's rho, exact), between the radius r(s) = d(o, s) of each node and its position
    sp/(sp + lp) in the hierarchy (senses.sp_lp). radius_keys: per node, an exact key increasing with r (rho reads ranks
    only: scores2.radius_key or snapped_radius_keys); splp: per node, (sp, lp); positions: nk18_positions(splp), when
    many tables share the nodes. A node with sp + lp = 0 has no position and is left out; U_@ and the dry verb graph
    hold none. Returns a Rho (.n the nodes kept)."""
    if len(radius_keys) != len(splp):
        raise ValueError('radius keys and (sp, lp) differ in length')
    keep, gold = positions if positions is not None else nk18_positions(splp)
    return rho(exact_codes([radius_keys[i] for i in keep]), gold)


def rho_diff_float(ra, rb):
    """The exact difference rho_A - rho_B rounded to binary64 (via 60 decimal digits): an interval's estimate.
    READING (A13.7, "the exact full-sample difference, rounded to binary64"): the difference is evaluated at 60
    significant decimal digits and then rounded once to binary64."""
    if ra.cmp(rb) == 0:
        return 0.0
    ctx = Context(prec=FLOAT_PREC + 10, rounding=ROUND_HALF_EVEN)
    return float(ctx.subtract(ra.decimal(FLOAT_PREC + 10), rb.decimal(FLOAT_PREC + 10)))


# ================================================================ AP, RR, accuracy, F1 (A13.7, A13.11)
def ap_exact(codes, labels):
    """AP with pessimistic ties (A13.7): one query whose candidates are the rows and whose neighbours are the True
    rows; keys maxcode - code, so a higher code ranks nearer; rank._ap_and_ranks (a False row tied with a True row
    ranks before it). An exact Fraction; None without a True row."""
    codes = list(codes)
    m = max(codes)
    keys = [m - c for c in codes]
    nb = [i for i, lab in enumerate(labels) if lab]
    return R._ap_and_ranks(sorted(keys), keys, nb)[0]


def ap_fractional(codes, labels):
    """Fractional-tie AP (reported): each tie class's orders averaged exactly (learned.fractional_ap)."""
    codes = list(codes)
    m = max(codes)
    keys = [m - c for c in codes]
    nb = [i for i, lab in enumerate(labels) if lab]
    return LR.fractional_ap(sorted(keys), keys, nb)


def ap_sklearn(codes, labels):
    """sklearn's average_precision_score convention (reported, A13.11): the sum over distinct thresholds t, highest
    first, of (R_t - R_prev) P_t, a tied block entering at once. An exact Fraction; None without a True row."""
    P = sum(1 for lab in labels if lab)
    if P == 0:
        return None
    by = {}
    for c, lab in zip(codes, labels):
        t, f = by.get(c, (0, 0))
        by[c] = (t + 1, f) if lab else (t, f + 1)
    tp = fp = 0
    total = Fraction(0)
    for c in sorted(by, reverse=True):
        t, f = by[c]
        if t:
            total += Fraction(t, P) * Fraction(tp + t, tp + t + fp + f)
        tp += t
        fp += f
    return total


def rr(pos_code, neg_codes):
    """The pessimistic reciprocal rank of a HiT row (A13.7): 1/(1 + the number of negatives whose code is at least
    the positive's). An exact Fraction."""
    return Fraction(1, 1 + sum(1 for c in neg_codes if c >= pos_code))


def mean_exact(values):
    values = list(values)
    return R.exact_sum(values) / len(values)


def macro_rr(rrs, groups):
    """The macro mean RR (A13 L14 control 2; spec section 7): rows grouped by their positive (groups[i] its key),
    each group's mean RR as a Fraction, then the mean of the group means. Returns (macro, {key: mean}) with the keys
    in code-point order."""
    by = {}
    for r, g in zip(rrs, groups):
        by.setdefault(g, []).append(Fraction(r))
    means = {g: R.exact_sum(by[g]) / len(by[g]) for g in sorted(by)}
    return R.exact_sum(list(means.values())) / len(means), means


def accuracy(codes_f, codes_r):
    """Direction accuracy (A13.7): the share of rows with code_f > code_r strictly, codes from one joint list."""
    n = len(codes_f)
    return Fraction(sum(1 for f, r in zip(codes_f, codes_r) if f > r), n)


def f1_from_predictions(pred, labels):
    """F1 = 2TP/(2TP + FP + FN) (reported), an exact Fraction (0 when the denominator is 0), and the counts."""
    tp = sum(1 for p, y in zip(pred, labels) if p and y)
    fp = sum(1 for p, y in zip(pred, labels) if p and not y)
    fn = sum(1 for p, y in zip(pred, labels) if not p and y)
    tn = len(pred) - tp - fp - fn
    den = 2 * tp + fp + fn
    return (Fraction(2 * tp, den) if den else Fraction(0)), {'tp': tp, 'fp': fp, 'fn': fn, 'tn': tn}


def f1_threshold(val_codes, val_labels, test_codes, test_labels):
    """F1 under HiT's protocol (reported, A13.11) from codes of one tie-class list over the val and the test values
    (pass 1's joint file, so codes are shared): theta is the val code with the best val F1, ties to the smallest
    (f1_select); a test pair is predicted positive when its code is at least theta. Tie classes are ordinal (A13.6),
    so this equals theta chosen among the certified val values and each test value compared with it under cmp
    (scores2.f1_hit). Returns {'theta_code', 'f1_val', 'f1_test', 'test_counts'}."""
    if len(val_codes) != len(val_labels) or len(test_codes) != len(test_labels):
        raise ValueError('codes and labels differ in length')
    theta, f1v = f1_select(val_codes, val_labels)
    f1t, counts = f1_from_predictions([c >= theta for c in test_codes], test_labels)
    return {'theta_code': theta, 'f1_val': f1v, 'f1_test': f1t, 'test_counts': counts}


def f1_select(val_codes, val_labels):
    """HiT's threshold (reported, spec section 7): theta ranges over the distinct val codes, a pair is positive when
    its code is >= theta, theta maximises val F1 with ties to the smallest. Returns (theta, F1 at theta)."""
    by = {}
    for c, y in zip(val_codes, val_labels):
        t, f = by.get(c, (0, 0))
        by[c] = (t + 1, f) if y else (t, f + 1)
    P = sum(t for t, _ in by.values())
    tp = fp = 0
    rows = []
    for c in sorted(by, reverse=True):
        t, f = by[c]
        tp += t
        fp += f
        rows.append((c, Fraction(2 * tp, 2 * tp + fp + (P - tp)) if (2 * tp + fp + P - tp) else Fraction(0)))
    best = None
    for c, f1 in reversed(rows):                     # increasing theta: keep the first maximum (the smallest)
        if best is None or f1 > best[1]:
            best = (c, f1)
    return best


# ================================================================ the suite's threshold protocol (A13.11, reported)
def suite_pick(hv, yv):
    """One trial's choice: the thresholds are the distinct validation scores at or above the lowest validation
    positive's, in increasing order (sklearn's precision_recall_curve truncated at full recall); h >= t predicts
    positive; the first threshold with the best validation accuracy. Returns (thresholds, accuracies, best)."""
    hv = np.asarray(hv, dtype=np.int64)
    yv = np.asarray(yv, dtype=bool)
    t = np.unique(hv[hv >= hv[yv].min()])
    accs = np.mean((hv[:, None] >= t) == yv[:, None], axis=0)
    return t, accs, t[int(accs.argmax())]


def suite_threshold(h, y, direction=None, seed=SUITE_SEED, trials=SUITE_TRIALS, val_prob=SUITE_VAL_PROB, info=None):
    """The suite's 1,000 x 2% protocol, written out (A13.11): over the in-vocabulary rows of the whole file, one
    numpy RandomState(seed) gives `trials` successive masks rand(n) < val_prob as validation; the thresholds are the
    distinct validation scores at or above the lowest validation positive's; h >= t predicts positive; the threshold
    with the best validation accuracy, the first in increasing order, is applied to the other rows; a trial with no
    validation positive is skipped and counted (its mask is still drawn).

    WBLESS: h the codes of Phi_G(x, y), y booleans. BiBLESS: h the codes of max(Phi_G(x, y), Phi_G(y, x)), y in
    {-1, 0, 1}, direction[i] = +1 if Phi_G(x, y) >= Phi_G(y, x) else -1 (codes from one joint list); detection is
    y != 0 and a detected row predicts direction[i]. Returns the mean validation and test accuracies (float64, as the
    suite reports them), the trials run and the trials skipped."""
    h = np.asarray(h, dtype=np.int64)
    y = np.asarray(y)
    n = len(h)
    yd = (y != 0) if direction is not None else y.astype(bool)
    dirp = None if direction is None else np.asarray(direction, dtype=np.int64)
    rng = np.random.RandomState(seed)
    val_scores, test_scores, skipped = [], [], 0
    for _ in range(trials):
        m_val = rng.rand(n) < val_prob
        m_test = ~m_val
        hv, yv = h[m_val], yd[m_val]
        if not yv.any():
            skipped += 1
            continue
        _, _, best = suite_pick(hv, yv)
        if dirp is None:
            val_scores.append(np.mean((hv >= best) == yv))
            test_scores.append(np.mean((h[m_test] >= best) == yd[m_test]))
        else:
            fin = (h >= best).astype(np.int64) * dirp
            val_scores.append(np.mean(fin[m_val] == y[m_val]))
            test_scores.append(np.mean(fin[m_test] == y[m_test]))
    if info is not None:
        info.update({'trials': trials, 'skipped': skipped})
    return {'acc_val': float(np.mean(val_scores)) if val_scores else None,
            'acc_test': float(np.mean(test_scores)) if test_scores else None,
            'trials': trials, 'skipped': skipped}


def suite_detection(codes, folds, labels, oov_test_labels):
    """The suite's own detection protocol (A13.11, reported for L13's BLESS and WBLESS): the arm scores the
    in-vocabulary rows of the validation and test folds in one tie-class list (codes, folds and labels per row, file
    order); every out-of-vocabulary row of the test fold (oov_test_labels: their labels) takes the lowest
    in-vocabulary validation score (its code, so it ties with that class); AP is taken over the whole test fold, with
    pessimistic ties (ap_exact) and in sklearn's average_precision_score convention (ap_sklearn), which the suite calls.
    No randomness. Returns the two APs (exact Fractions; None without a True test row) and the counts.
    READING (A13.11, "OOV rows at the lowest in-vocabulary validation score"): an arm is out of vocabulary on a row it
    does not cover (A13.3); with no in-vocabulary validation row, the lowest in-vocabulary code of the test fold takes
    the floor's place (flagged; the registered folds hold validation rows)."""
    codes, folds, labels = list(codes), list(folds), [bool(x) for x in labels]
    if not (len(codes) == len(folds) == len(labels)):
        raise ValueError('codes, folds and labels differ in length')
    if set(folds) - {'val', 'test'}:
        raise ValueError('folds are val or test')
    val = [c for c, f in zip(codes, folds) if f == 'val']
    test = [c for c, f in zip(codes, folds) if f == 'test']
    from_test = not val
    if from_test and not test:
        raise ValueError('no in-vocabulary row')
    floor = min(val) if val else min(test)
    oov = [bool(x) for x in oov_test_labels]
    h = test + [floor] * len(oov)
    y = [lab for lab, f in zip(labels, folds) if f == 'test'] + oov
    has = any(y)
    return {'ap': ap_exact(h, y) if has else None, 'ap_sklearn': ap_sklearn(h, y) if has else None,
            'test_rows': len(h), 'oov_test_rows': len(oov), 'val_rows_in_vocabulary': len(val),
            'positives': sum(y), 'oov_positives': sum(oov), 'floor_code': floor, 'floor_from_test': from_test,
            'test_rows_in_floor_class': sum(1 for c in test if c == floor)}


# ================================================================ bootstraps (A13.7; spec section 7)
def _resample_a(codes, mult, C):
    """Per-code a values on a resample given by row multiplicities: a_c = 2 below_c + count_c - N, with N the
    resample's size (first + last - (N + 1) for first = below + 1, last = below + count)."""
    cnt = np.bincount(codes, weights=mult, minlength=C).astype(np.int64)
    below = np.cumsum(cnt) - cnt
    N = int(cnt.sum())
    return 2 * below + cnt - N, N


def _rho_float(sab, saa, sbb):
    """rho in binary64 from exact integer sums; None when a variance is zero."""
    if saa == 0 or sbb == 0:
        return None
    return int(sab) / math.sqrt(int(saa) * int(sbb))


class _RhoBoot:
    """rho(A) and rho(B) against the gold on resamples given by row multiplicities, with average ranks on the
    resample. All sums are exact int64 integers; only the final division is float64."""

    def __init__(self, A, B, gold):
        self.cA = np.asarray(exact_codes(list(A)), dtype=np.int64)
        self.cB = np.asarray(exact_codes(list(B)), dtype=np.int64)
        self.cG = np.asarray(exact_codes(list(gold)), dtype=np.int64)
        if not (len(self.cA) == len(self.cB) == len(self.cG)):
            raise ValueError('A, B and gold differ in length')
        self.CA, self.CB, self.CG = (int(c.max()) + 1 for c in (self.cA, self.cB, self.cG))
        self.undefined = [0, 0]

    def deltas(self, mult):
        aG, N = _resample_a(self.cG, mult, self.CG)
        out = []
        if N < 3:
            self.undefined[0] += 1
            self.undefined[1] += 1
            return 0.0
        b = aG[self.cG]
        sbb = int(np.dot(mult, b * b))
        for k, (c, C) in enumerate(((self.cA, self.CA), (self.cB, self.CB))):
            a_c, _ = _resample_a(c, mult, C)
            a = a_c[c]
            r = _rho_float(int(np.dot(mult, a * b)), int(np.dot(mult, a * a)), sbb)
            if r is None:
                self.undefined[k] += 1
                r = 0.0
            out.append(r)
        return out[0] - out[1]


def word_types(rows):
    """The pair set's word types: the distinct N_S forms of its x and y values, in code-point order (A13.7)."""
    return sorted({w for x, y in rows for w in (x, y)})


def ci_rho(A, B, gold, rows, words=None, seed=SEED, resamples=RESAMPLES, info=None):
    """The word-level (pigeonhole) bootstrap of rho(A) - rho(B) (A13.7; decided for every difference of rho).

    A, B: the two arms' codes on the pair set (rows in file order); gold: the exact gold values (or their codes);
    rows: each row's (x, y) N_S forms; words: the pair set's word types in code-point order (computed when None,
    checked when given). Resample b: draws = rng.integers(0, V, V), m = np.bincount(draws, minlength=V); row i enters
    m[x_i] m[y_i] times (np.repeat(rows, mult), rows in file order); both rhos are recomputed in float64 with average
    ranks on the resample; delta_b = rho_A - rho_B. A resample with fewer than three rows, or in which a rho is
    undefined (zero variance), counts that rho as 0 and is counted. Returns Interval(the exact full-sample difference
    rounded to binary64, percentile 2.5, percentile 97.5); `info` (a dict) receives n, V, the undefined counts and the
    mean resample size."""
    rows = [tuple(r) for r in rows]
    types = word_types(rows)
    if words is not None and list(words) != types:
        raise ValueError('words are not the pair set\'s word types in code-point order')
    V = len(types)
    k = {w: i for i, w in enumerate(types)}
    xi = np.array([k[x] for x, _ in rows], dtype=np.int64)
    yi = np.array([k[y] for _, y in rows], dtype=np.int64)
    est = rho_diff_float(rho(list(A), list(gold)), rho(list(B), list(gold)))
    boot = _RhoBoot(A, B, gold)
    rng = np.random.default_rng(seed)
    D = np.empty(resamples)
    sizes = 0
    for b in range(resamples):
        draws = rng.integers(0, V, V)
        m = np.bincount(draws, minlength=V)
        mult = m[xi] * m[yi]
        sizes += int(mult.sum())
        D[b] = boot.deltas(mult)
    lo, hi = np.percentile(D, [2.5, 97.5])
    if info is not None:
        info.update({'n': len(rows), 'V': V, 'resamples': resamples, 'undefined_a': boot.undefined[0],
                     'undefined_b': boot.undefined[1], 'mean_size': sizes / resamples, 'unit': 'word'})
    return Interval(est, float(lo), float(hi))


def ci_rho_rows(A, B, gold, n=None, seed=SEED, resamples=RESAMPLES, info=None):
    """The row bootstrap of rho(A) - rho(B) (reported beside every word-level interval): idx = rng.integers(0, n, n)
    per resample, the calls rank.ci_mean makes; otherwise as ci_rho."""
    n = len(A) if n is None else n
    if not (len(A) == len(B) == len(gold) == n):
        raise ValueError('A, B and gold must have n rows')
    est = rho_diff_float(rho(list(A), list(gold)), rho(list(B), list(gold)))
    boot = _RhoBoot(A, B, gold)
    rng = np.random.default_rng(seed)
    D = np.empty(resamples)
    for b in range(resamples):
        idx = rng.integers(0, n, n)
        D[b] = boot.deltas(np.bincount(idx, minlength=n))
    lo, hi = np.percentile(D, [2.5, 97.5])
    if info is not None:
        info.update({'n': n, 'resamples': resamples, 'undefined_a': boot.undefined[0],
                     'undefined_b': boot.undefined[1], 'unit': 'row'})
    return Interval(est, float(lo), float(hi))


class _APBoot:
    """Float AP with pessimistic ties on resamples given by row multiplicities (spec section 7): rows sorted by
    (-code, label), False before True inside a class; precision at each True row = cumulative True / position; the
    mean over the True rows. Repeating each row of the full sorted order in place is the sorted resample."""

    def __init__(self, codes, labels):
        codes = np.asarray(codes, dtype=np.int64)
        labels = np.asarray(labels, dtype=bool)
        self.order = np.lexsort((labels, -codes))
        self.ls = labels[self.order]

    def ap(self, mult):
        rep = np.repeat(self.ls, np.asarray(mult)[self.order])
        if not rep.any():
            return None
        pos = np.arange(1, len(rep) + 1)
        cum = np.cumsum(rep)
        return float(np.mean(cum[rep] / pos[rep]))


def ap_float(codes, labels, mult=None):
    """AP in float64 with pessimistic ties (the bootstrap's form); mult gives row multiplicities (default 1)."""
    m = np.ones(len(codes), dtype=np.int64) if mult is None else mult
    return _APBoot(codes, labels).ap(m)


def _clusters(keys):
    """Clusters sorted by key in code-point order. Returns (the sorted keys, each row's cluster index). A resample's
    rows are the drawn clusters' rows in draw order; every metric here is invariant under the order of the rows
    (AP sorts them, accuracy counts them), so a row's multiplicity, the number of draws of its cluster, is the
    resample (tests/test_stage2_stats.py checks this against the literal concatenation)."""
    ks = sorted(set(keys))
    ci = {k: i for i, k in enumerate(ks)}
    return ks, np.array([ci[k] for k in keys], dtype=np.int64)


def ci_cluster(A, B, keys, metric='ap', labels=None, seed=SEED, resamples=RESAMPLES, info=None):
    """The cluster bootstrap (A13.7) for BD, WB and BD-dir: clusters sorted by key in code-point order;
    idx = rng.integers(0, C, C); a resample is the drawn clusters' rows in draw order; both arms' AP (float64,
    pessimistic ties) or direction accuracy are recomputed on it; delta_b = A - B.

    metric 'ap': A, B the codes per row and labels the True/False rows. metric 'accuracy': A = (codes_f, codes_r) for
    arm A, B likewise (codes from one joint list per arm). keys: each row's cluster key. Returns Interval(the exact
    full-sample difference rounded to binary64, percentile 2.5, 97.5).
    READING (A13.7): a resample in which an AP is undefined (no True row drawn) counts that AP as 0 and is counted,
    as ci_rho counts an undefined rho."""
    keys = list(keys)
    n = len(keys)
    ks, of = _clusters(keys)
    C = len(ks)
    if metric == 'ap':
        labels = list(labels)
        ea, eb = ap_exact(A, labels), ap_exact(B, labels)
        est = float(ea - eb)
        ba, bb = _APBoot(A, labels), _APBoot(B, labels)

        def stat(mult):
            out = []
            for k, bt in enumerate((ba, bb)):
                v = bt.ap(mult)
                if v is None:
                    undefined[k] += 1
                    v = 0.0
                out.append(v)
            return out[0] - out[1]
    elif metric == 'accuracy':
        ca = np.array([f > r for f, r in zip(*A)], dtype=bool)
        cb = np.array([f > r for f, r in zip(*B)], dtype=bool)
        if len(ca) != n or len(cb) != n:
            raise ValueError('rows and keys differ in length')
        est = float(accuracy(*A) - accuracy(*B))

        def stat(mult):
            N = int(mult.sum())
            return int(np.dot(mult, ca)) / N - int(np.dot(mult, cb)) / N
    else:
        raise ValueError(f'unknown metric {metric!r}')
    undefined = [0, 0]
    rng = np.random.default_rng(seed)
    D = np.empty(resamples)
    for b in range(resamples):
        idx = rng.integers(0, C, C)
        cm = np.bincount(idx, minlength=C)
        D[b] = stat(cm[of])
    lo, hi = np.percentile(D, [2.5, 97.5])
    if info is not None:
        info.update({'n': n, 'clusters': C, 'resamples': resamples, 'undefined_a': undefined[0],
                     'undefined_b': undefined[1], 'unit': 'cluster'})
    return Interval(est, float(lo), float(hi))


def ci_macro(rr_a, rr_b, groups, seed=SEED, resamples=RESAMPLES, info=None):
    """The bootstrap over positive synsets of the macro mean RR (reported, spec section 7): groups sorted by key in
    code-point order (8-digit offsets: numeric order), ci_cluster's draw idx = rng.integers(0, C, C).
    READING (spec section 7): the macro mean of a resample is the mean, over its C draws, of each drawn group's
    mean RR (a group drawn twice counts twice); group means are the exact Fractions rounded to binary64."""
    ma, mean_a = macro_rr(rr_a, groups)
    mb, mean_b = macro_rr(rr_b, groups)
    ks = list(mean_a)
    fa = np.array([float(mean_a[k]) for k in ks])
    fb = np.array([float(mean_b[k]) for k in ks])
    C = len(ks)
    rng = np.random.default_rng(seed)
    D = np.empty(resamples)
    for b in range(resamples):
        idx = rng.integers(0, C, C)
        D[b] = float(np.mean(fa[idx])) - float(np.mean(fb[idx]))
    lo, hi = np.percentile(D, [2.5, 97.5])
    if info is not None:
        info.update({'groups': C, 'resamples': resamples, 'unit': 'positive synset'})
    return Interval(float(ma - mb), float(lo), float(hi))


ci_mean = R.ci_mean           # unchanged (it takes seed, default 7)


# ================================================================ permutations, bands, the strongest permutation
def permute_rows(values, seed):
    """pi = Rng(seed).shuffle(list(range(n))); row k takes the value of row pi[k] (A13.12's gold permutations; also
    the label permutations and GloVe's vector permutation, word k taking the vector of word pi[k]).
    READING (A13.12): L13's label permutations follow the convention A13.12 states for the gold permutations."""
    values = list(values)
    pi = prng.Rng(seed).shuffle(list(range(len(values))))
    return [values[p] for p in pi]


def gold_band(n):
    """5 / sqrt(20 (n - 1)) in float64 (A13.7)."""
    return 5 / math.sqrt(20 * (n - 1))


def gold_band_holds(rhos, n):
    """A gold (or GloVe-vector) shuffle fails as required when |mean of the 20 rho| <= 5 / sqrt(20 (n - 1)), in
    float64.
    READING (A13.7, "in float64"): each rho is the exact rho rounded to binary64 and the mean is math.fsum of them
    (one correctly rounded sum) divided by their number."""
    rhos = [float(r) for r in rhos]
    if len(rhos) != 20:
        raise ValueError('a shuffle band takes 20 values')
    return abs(math.fsum(rhos) / len(rhos)) <= gold_band(n)


def label_band_holds(aps, pi):
    """L13 control 2: the mean of 20 exact APs <= pi + 1/50, compared exactly."""
    aps = [_exact(a) for a in aps]
    if len(aps) != 20:
        raise ValueError('a label-shuffle band takes 20 APs')
    return sum(aps, Fraction(0)) / 20 <= Fraction(pi) + LABEL_MARGIN


def rr_band_holds(mean):
    """L14 controls 1 and 2: the (per-row or macro) mean RR <= H11/11 + 1/50, compared exactly."""
    return _exact(mean) <= RR_BAND


def _exact(x):
    if isinstance(x, float):
        raise TypeError('an exact band compares exact rationals, not floats')
    return Fraction(x)


def strongest(estimates):
    """A13.7: the permutation with the largest point estimate (exact: Rho or Fraction), ties to the smaller i."""
    best = 0
    for i in range(1, len(estimates)):
        if estimates[i] > estimates[best]:
            best = i
    return best


# ================================================================ readings (A13.7) and verdicts
def _parts(iv):
    if iv is None:
        raise ValueError('a missing interval')
    if isinstance(iv, dict):
        est = iv['est'] if 'est' in iv else iv['mean']
        return est, iv['lo'], iv['hi']
    return iv[0], iv[1], iv[2]


def above0(iv):
    """"Lies above 0": lo > 0."""
    return _parts(iv)[1] > 0.0


def at_or_below0(iv):
    """"Lies entirely at or below 0": hi <= 0."""
    return _parts(iv)[2] <= 0.0


def within(iv, m=BAND):
    """"Within [-m, +m]": lo >= -m and hi <= m."""
    _, lo, hi = _parts(iv)
    return lo >= -m and hi <= m


def outside(iv, m=BAND):
    """"Entirely outside [-m, +m]": lo > m or hi < -m."""
    _, lo, hi = _parts(iv)
    return lo > m or hi < -m


def mean_le0(iv):
    """"The mean is <= 0": the estimate."""
    return _parts(iv)[0] <= 0.0


def hi_le(iv, m=BAND):
    """L15(a)'s support: hi <= +m."""
    return _parts(iv)[2] <= m


def lo_gt(iv, m=BAND):
    """L15(a)'s refutation: lo > +m."""
    return _parts(iv)[1] > m


def verdict(support, refute):
    """A13.7 (A10.7, A11.4): both conditions met -> inconclusive, judged on the part as a whole."""
    if support and refute:
        return 'inconclusive'
    if support:
        return 'supported'
    if refute:
        return 'refuted'
    return 'inconclusive'


def _view(iv, **flags):
    if iv is None:
        return None
    est, lo, hi = _parts(iv)
    out = {'est': est, 'lo': lo, 'hi': hi, 'ordered': lo <= est <= hi}
    out.update(flags)
    return out


def _all_above0_part(cells, names):
    """The rule of L12(a)-(c), L13 and L15(b): supported if every interval lies above 0, refuted if any lies entirely
    at or below 0."""
    for k in names:
        if k not in cells:
            raise ValueError(f'missing cell {k!r}')
    views = {k: _view(cells[k], above_0=above0(cells[k]), at_or_below_0=at_or_below0(cells[k])) for k in names}
    support = all(v['above_0'] for v in views.values())
    n_ref = sum(1 for v in views.values() if v['at_or_below_0'])
    return support, n_ref > 0, views, n_ref


def _apply_void(part, void, why):
    part['verdict_before_controls'] = part['verdict']
    part['void'] = bool(void)
    if void:
        part['verdict'] = 'void'
        part['reasons'].append(why)
    return part


def _part_out(support, refute, cells, reasons, **extra):
    out = {'verdict': verdict(support, refute), 'support': support, 'refute': refute, 'cells': cells,
           'reasons': reasons}
    out.update(extra)
    return out


# ================================================================ L12
L12_A = ('H3-F3', 'H3-F3*', 'H2-F2', 'H2-F2*')
L12_BC = ('H3', 'H2')
L12_GOLD_ARMS = ('H3', 'H2', 'F3', 'F3*', 'F2', 'F2*', 'WN')
L12_N = 2163
L12_PREVIEW_FLAG = 'registered after a partial preview (A13.20)'


def l12_failing_side(iv, m=BAND):
    """L12(d)'s failing side (A13 L12 Decision (d), "the failing side is reported"): ('low', 'high', 'both' or None,
    {side: how far the interval passes that end of [-m, +m]}), in float64 as A13.7 reads the band.
    READING (A13 L12(d), "the failing side is reported"): a side fails when the interval passes that end of the band
    (low: lo < -0.02, the amount -0.02 - lo; high: hi > +0.02, the amount hi - 0.02); every failing side is reported,
    'both' when the interval passes both ends (possible only when the part is inconclusive), and a supported part has
    none. A refuted part fails on one side only (lo > +0.02, or hi < -0.02)."""
    _, lo, hi = _parts(iv)
    excess = {}
    if lo < -m:
        excess['low'] = -m - lo
    if hi > m:
        excess['high'] = hi - m
    side = 'both' if len(excess) == 2 else next(iter(excess), None)
    return side, excess


def decide_l12(a, b, c, d, control1, control2, control3, control4, n=L12_N):
    """L12 (A13). a: {L12_A cell: interval of rho(H) - rho(F)}; b: {'H3', 'H2': rho(G) - rho(Dep°)}; c: the same for
    rho(G) - rho(Sym); d: rho(H3) - rho(WN). control1: {'K3', 'S-full*': rho(H3) - rho(.)}; control2: {'W*': ...};
    control3: rho(H3 as Phi_G(x, y)) - rho(H3 as Phi_G(y, x)); control4: {arm: its 20 gold-shuffle rhos} for the
    seven arms of L12_GOLD_ARMS. If any of controls 1-4 does not fail as required, all four parts are void (before
    refutation)."""
    c1 = {k: _view(control1[k], above_0=above0(control1[k])) for k in ('K3', 'S-full*')}
    c2 = {'W*': _view(control2['W*'], above_0=above0(control2['W*']))}
    c3 = _view(control3, above_0=above0(control3))
    if set(control4) != set(L12_GOLD_ARMS):
        raise ValueError(f'control 4 needs the arms {L12_GOLD_ARMS}')
    c4 = {arm: {'mean': math.fsum(float(r) for r in control4[arm]) / 20, 'band': gold_band(n),
                'holds': gold_band_holds(control4[arm], n)} for arm in L12_GOLD_ARMS}
    holds = {'control1': all(v['above_0'] for v in c1.values()), 'control2': c2['W*']['above_0'],
             'control3': c3['above_0'], 'control4': all(v['holds'] for v in c4.values())}
    void = not all(holds.values())
    why = 'void: ' + ', '.join(k for k, v in holds.items() if not v) + ' did not fail as required (A13 L12)'
    parts = {}
    s, r, views, k = _all_above0_part(a, L12_A)
    parts['a'] = _part_out(s, r, views, [f'(a): {sum(v["above_0"] for v in views.values())} of 4 intervals above 0; '
                                         f'{k} of 4 entirely at or below 0'])
    for name, cells in (('b', b), ('c', c)):
        s, r, views, k = _all_above0_part(cells, L12_BC)
        parts[name] = _part_out(s, r, views, [f'({name}): H3 and H2 above 0: {s}; {k} of 2 entirely at or below 0'])
    sd, rd = within(d, BAND), outside(d, BAND)
    side, excess = l12_failing_side(d)
    parts['d'] = _part_out(sd, rd, {'H3-WN': _view(d, within_band=sd, outside_band=rd)},
                           [f'(d): within [-0.02, +0.02]: {sd}; entirely outside: {rd}; failing side: {side}'
                            + ''.join(f'; passes the {k} end by {v!r}' for k, v in excess.items())],
                           failing_side=side, failing_excess=excess, flag=L12_PREVIEW_FLAG)
    for p in parts.values():
        _apply_void(p, void, why)
    return {'claim': 'L12', 'void': void, 'parts': parts,
            'controls': {'control1': c1, 'control2': c2, 'control3': c3, 'control4': c4, 'fails_as_required': holds}}


# ================================================================ L13
L13_PARTS = ('a', 'b', 'c')
L13_CELLS = L12_A
L13_ARMS = ('H3', 'H2', 'F3', 'F3*', 'F2', 'F2*')
L13_SETS = ('BD', 'WB')
L13_PI = {'BD': Fraction(1194, 12365), 'WB': Fraction(764, 1493)}
L13_SYMMETRIC = ('Sym-H3', 'GloVe')


def decide_l13(parts, control1, control2, control3, pis=None):
    """L13 (A13). parts: {'a', 'b', 'c': {L13_CELLS cell: interval}} (AP on BD, AP on WB, direction accuracy on
    BD-dir). control1: {part: {'K3', 'S-full*', 'W*': interval of H3 - .}}; control2: {(arm, set): 20 exact APs} for
    the six arms and BD, WB; control3: {'Sym-H3', 'GloVe': exact direction accuracy}. pis: the shares of True rows
    (default A13's 1,194/12,365 and 764/1,493). If any of controls 1-3 does not fail as required, L13 is void."""
    pis = dict(L13_PI if pis is None else pis)
    c1 = {p: {k: _view(control1[p][k], above_0=above0(control1[p][k])) for k in ('K3', 'S-full*', 'W*')}
          for p in L13_PARTS}
    c2 = {}
    for arm in L13_ARMS:
        for st in L13_SETS:
            aps = control2[(arm, st)]
            c2[f'{arm}/{st}'] = {'mean': sum((_exact(x) for x in aps), Fraction(0)) / 20,
                                 'bound': Fraction(pis[st]) + LABEL_MARGIN, 'holds': label_band_holds(aps, pis[st])}
    c3 = {k: {'accuracy': _exact(control3[k]), 'holds': _exact(control3[k]) == 0} for k in L13_SYMMETRIC}
    holds = {'control1': all(v['above_0'] for p in c1.values() for v in p.values()),
             'control2': all(v['holds'] for v in c2.values()),
             'control3': all(v['holds'] for v in c3.values())}
    void = not all(holds.values())
    why = 'void: ' + ', '.join(k for k, v in holds.items() if not v) + ' did not fail as required (A13 L13)'
    out = {}
    for p in L13_PARTS:
        s, r, views, k = _all_above0_part(parts[p], L13_CELLS)
        out[p] = _apply_void(_part_out(s, r, views, [f'({p}): four intervals above 0: {s}; '
                                                     f'{k} of 4 entirely at or below 0']), void, why)
    for v in c2.values():
        v['mean'] = f'{v["mean"].numerator}/{v["mean"].denominator}'
        v['bound'] = f'{v["bound"].numerator}/{v["bound"].denominator}'
    for v in c3.values():
        v['accuracy'] = f'{v["accuracy"].numerator}/{v["accuracy"].denominator}'
    return {'claim': 'L13', 'void': void, 'parts': out,
            'controls': {'control1': c1, 'control2': c2, 'control3': c3, 'fails_as_required': holds}}


# ================================================================ L14
L14_DIMS = (2, 3)
L14_SEEDS = (0, 1, 2, 3, 4)
L14_SETTINGS = ('random', 'hard')
L14_METRICS = ('rr_random', 'rr_hard', 'rho')
L14_GEOMETRIES = ('lorentz', 'euclid')
L14_N_RHO = 2153


def l14_presence(measured, shuffled, frozen=None, dims=L14_DIMS, seeds=L14_SEEDS):
    """A13 L14: at (d, s) a seed is present when both measured tables exist and converged (A13.10.7) and both
    cells' edge-shuffled runs at s exist; a cell without a frozen rate has no seed present.
    measured: {(geometry, d, s): {'exists': bool, 'converged': bool}}; shuffled: {(geometry, d, s): bool};
    frozen: {(geometry, d): rate string or None} (None: every cell has one)."""
    out = {}
    for d in dims:
        for s in seeds:
            ok = True
            for g in L14_GEOMETRIES:
                if frozen is not None and frozen.get((g, d)) is None:
                    ok = False
                m = measured.get((g, d, s)) or {}
                if not (m.get('exists') and m.get('converged')):
                    ok = False
                if not shuffled.get((g, d, s)):
                    ok = False
            out[(d, s)] = ok
    return out


def _seed_rule(ivs, present, seeds=L14_SEEDS):
    """A10.7's rule: supported if all five seeds are present with lo > 0; refuted if the mean is <= 0 in three or
    more seeds present."""
    for s in seeds:
        if present[s] and ivs.get(s) is None:
            raise ValueError(f'seed {s} is present but has no interval')
    support = all(present[s] for s in seeds) and all(above0(ivs[s]) for s in seeds)
    n_ref = sum(1 for s in seeds if present[s] and mean_le0(ivs[s]))
    per_seed = {s: (_view(ivs[s], above_0=above0(ivs[s]), mean_at_or_below_0=mean_le0(ivs[s])) if present[s] else None)
                for s in seeds}
    return {'support': support, 'refute': n_ref >= REFUTE_SEEDS, 'verdict': verdict(support, n_ref >= REFUTE_SEEDS),
            'present': sum(1 for s in seeds if present[s]), 'refuting_seeds': n_ref, 'per_seed': per_seed}


def edge_shuffle_control(entries, presence, dims=L14_DIMS, seeds=L14_SEEDS, metrics=L14_METRICS):
    """L14 control 3 (A13; spec section 7): for each d, metric and seed s present at d, the interval of true -
    shuffled lies above 0 in at least one of the two cells at d. entries: {(d, s, metric): {'lorentz': interval or
    None, 'euclid': interval or None}}. Returns {'cells': ..., 'failed': [(d, s, metric)], 'void_parts': set}; every
    cell's interval is reported, and one that does not lie above 0 is labelled "true ≈ shuffled"."""
    cells, failed = {}, []
    for d in dims:
        for s in seeds:
            if not presence[(d, s)]:
                continue
            for m in metrics:
                e = entries.get((d, s, m))
                if e is None:
                    raise ValueError(f'control 3 has no entry for d = {d}, seed {s}, {m}')
                row = {}
                ok = False
                for g in L14_GEOMETRIES:
                    iv = e.get(g)
                    a = iv is not None and above0(iv)
                    ok = ok or a
                    row[g] = _view(iv, above_0=a, label='true > shuffled' if a else 'true ≈ shuffled') \
                        if iv is not None else {'label': 'true ≈ shuffled', 'above_0': False, 'missing': True}
                row['passes'] = ok
                cells[f'd{d}/s{s}/{m}'] = row
                if not ok:
                    failed.append((d, s, m))
    void_parts = set()
    for _, _, m in failed:
        void_parts.add('b' if m == 'rho' else 'a')
    return {'cells': cells, 'failed': failed, 'void_parts': sorted(void_parts)}


def decide_l14(a, b, presence, control1, control2, control3, control4, closure, n_rho=L14_N_RHO):
    """L14 (A13). a: {(d, setting, s): interval of RR(Lorentz) - RR(Euclidean) (ci_mean over the test rows)};
    b: {(d, s): interval of rho(Lorentz) - rho(Euclidean) (ci_rho)}; presence: l14_presence's {(d, s): bool};
    control1: {table: exact per-row mean RR, within-row label shuffle}; control2: {table: exact macro mean RR under
    the relabelling P}; control3: edge_shuffle_control's entries; control4: {measured table: its 20 gold-shuffle
    rhos}; closure: {'random': bool, 'hard': bool}, the closure check (RR = 1 on every row).

    Precedence: control 1, control 2 or the closure check failing voids L14; control 3 voids the part whose metric
    failed ((a) for either RR, (b) for rho); control 4 voids (b); void comes before refuted. (a): per (d, setting),
    A10.7's rule; supported if all four cells are, refuted if any is. (b): the same rule per d; supported at both d,
    refuted at either. Both conditions -> inconclusive, judged on the part as a whole (A11.4)."""
    c1 = {str(k): {'mean': _exact(v), 'holds': rr_band_holds(v)} for k, v in control1.items()}
    c2 = {str(k): {'macro': _exact(v), 'holds': rr_band_holds(v)} for k, v in control2.items()}
    c3 = edge_shuffle_control(control3, presence)
    c4 = {str(k): {'mean': math.fsum(float(r) for r in v) / 20, 'band': gold_band(n_rho),
                   'holds': gold_band_holds(v, n_rho)} for k, v in control4.items()}
    check = {k: bool(closure[k]) for k in L14_SETTINGS}
    holds = {'control1': all(v['holds'] for v in c1.values()), 'control2': all(v['holds'] for v in c2.values()),
             'closure_check': all(check.values())}
    whole_void = not all(holds.values())
    void_a = whole_void or 'a' in c3['void_parts']
    c4_holds = all(v['holds'] for v in c4.values())
    void_b = whole_void or 'b' in c3['void_parts'] or not c4_holds
    pres = {d: {s: presence[(d, s)] for s in L14_SEEDS} for d in L14_DIMS}
    cells_a = {}
    for d in L14_DIMS:
        for st in L14_SETTINGS:
            cells_a[f'd{d}/{st}'] = _seed_rule({s: a.get((d, st, s)) for s in L14_SEEDS}, pres[d])
    sa = all(v['support'] for v in cells_a.values())
    ra = any(v['refute'] for v in cells_a.values())
    reasons_a = [f'{k}: {v["present"]} of 5 seeds present; supported {v["support"]}; refuted {v["refute"]} '
                 f'({v["refuting_seeds"]} seeds with mean <= 0)' for k, v in cells_a.items()]
    cells_b = {f'd{d}': _seed_rule({s: b.get((d, s)) for s in L14_SEEDS}, pres[d]) for d in L14_DIMS}
    sb = all(v['support'] for v in cells_b.values())
    rb = any(v['refute'] for v in cells_b.values())
    reasons_b = [f'{k}: {v["present"]} of 5 seeds present; supported {v["support"]}; refuted {v["refute"]} '
                 f'({v["refuting_seeds"]} seeds with mean <= 0)' for k, v in cells_b.items()]
    pa = _part_out(sa, ra, cells_a, reasons_a, cells_refuted=sum(v['refute'] for v in cells_a.values()), n_cells=4)
    pb = _part_out(sb, rb, cells_b, reasons_b, cells_refuted=sum(v['refute'] for v in cells_b.values()), n_cells=2)
    failed = [k for k, v in holds.items() if not v]
    _apply_void(pa, void_a, 'void: ' + (', '.join(failed) if whole_void else 'control 3 (an RR metric)') +
                ' (A13 L14)')
    _apply_void(pb, void_b, 'void: ' + (', '.join(failed) if whole_void else
                                        'control 3 (rho)' if 'b' in c3['void_parts'] else 'control 4') + ' (A13 L14)')
    for v in c1.values():
        v['mean'] = f'{v["mean"].numerator}/{v["mean"].denominator}'
    for v in c2.values():
        v['macro'] = f'{v["macro"].numerator}/{v["macro"].denominator}'
    return {'claim': 'L14', 'void': whole_void, 'parts': {'a': pa, 'b': pb},
            'controls': {'control1': c1, 'control2': c2, 'control3': c3, 'control4': c4, 'closure_check': check,
                         'fails_as_required': dict(holds, control3=not c3['failed'], control4=c4_holds)},
            'presence': {f'd{d}/s{s}': presence[(d, s)] for d in L14_DIMS for s in L14_SEEDS},
            'budget_note': "stated at the training budget in force at the decisive run (A13.10.3's 1,000 epochs "
                           "unless the definitions amendment changes it)"}


# ================================================================ L15
L15_A_SETS = ('SL', 'MEN')
L15_B = ('MEN', 'WSR', 'HL')                       # MEN, WSR: GloVe - H3; HL: H3 - GloVe
# The pair sets of control 2 and the parts whose comparisons run on them.
# READING (A13 L15 control 2, "voids the part that uses the set"): a set of (a) and its GloVe intersection in (b)
# are different pair sets (A13.3); a failure voids the part whose comparisons run on the failing pair set.
L15_SET_PARTS = {'SL': ('a',), 'MEN': ('a',), 'MEN-glove': ('b',), 'WSR-glove': ('b',), 'HL-glove': ('b',)}
L15_B_SETS = ('MEN-glove', 'WSR-glove', 'HL-glove')


def decide_l15(a, b, control1, control2, control3, required=None):
    """L15 (A13). a: {'SL', 'MEN': {L12_A cell: interval of rho(H) - rho(F) under Sym}}; b: {'MEN', 'WSR': interval
    of rho(GloVe) - rho(H3), 'HL': rho(H3) - rho(GloVe)}, each on its set within GloVe; control1: {'SL', 'MEN':
    {'K3', 'S-full*', 'W*': rho(H3) - rho(.)}}; control2: a list of {'arm', 'set', 'rhos' (20), 'n'} with 'set' in
    L15_SET_PARTS; control3: {(b)'s set: (20 rhos under GloVe vector shuffles, n)}. required: the (arm, set) pairs
    control 2 must hold ("for every arm and set"); a missing or repeated pair raises.

    Control 1 failing voids (a); control 2 voids the part that uses the failing set; control 3 voids (b). (a):
    supported if all eight intervals have hi <= +0.02, refuted if any has lo > +0.02. (b): supported if all three lie
    above 0, refuted if any lies entirely at or below 0."""
    c1 = {st: {k: _view(control1[st][k], above_0=above0(control1[st][k])) for k in ('K3', 'S-full*', 'W*')}
          for st in L15_A_SETS}
    held = [(e['arm'], e['set']) for e in control2]
    if len(set(held)) != len(held):
        raise ValueError('control 2 holds an (arm, set) twice')
    if required is not None:
        missing = sorted(set(required) - set(held))
        if missing:
            raise ValueError(f'control 2 lacks {len(missing)} (arm, set) pairs, e.g. {missing[:3]}')
    c2, void2 = [], set()
    for e in control2:
        if e['set'] not in L15_SET_PARTS:
            raise ValueError(f'unknown control-2 set {e["set"]!r}')
        h = gold_band_holds(e['rhos'], e['n'])
        c2.append({'arm': e['arm'], 'set': e['set'], 'n': e['n'], 'band': gold_band(e['n']),
                   'mean': math.fsum(float(r) for r in e['rhos']) / 20, 'holds': h})
        if not h:
            void2.update(L15_SET_PARTS[e['set']])
    if set(control3) != set(L15_B_SETS):
        raise ValueError(f'control 3 needs the sets {L15_B_SETS}')
    c3 = {st: {'n': n, 'band': gold_band(n), 'mean': math.fsum(float(r) for r in rhos) / 20,
               'holds': gold_band_holds(rhos, n)} for st, (rhos, n) in control3.items()}
    c1_holds = all(v['above_0'] for st in c1.values() for v in st.values())
    c3_holds = all(v['holds'] for v in c3.values())
    void_a = (not c1_holds) or 'a' in void2
    void_b = (not c3_holds) or 'b' in void2
    views, sa, ra = {}, True, False
    for st in L15_A_SETS:
        for k in L12_A:
            iv = a[st][k]
            hl, lg = hi_le(iv), lo_gt(iv)
            views[f'{st}/{k}'] = _view(iv, hi_at_most_0_02=hl, lo_above_0_02=lg)
            sa = sa and hl
            ra = ra or lg
    n_ref_a = sum(1 for v in views.values() if v['lo_above_0_02'])
    pa = _part_out(sa, ra, views, [f'(a): {sum(v["hi_at_most_0_02"] for v in views.values())} of 8 intervals with hi '
                                   f'<= +0.02; {n_ref_a} of 8 with lo > +0.02'])
    s, r, vb, k = _all_above0_part(b, L15_B)
    pb = _part_out(s, r, vb, [f'(b): three intervals above 0: {s}; {k} of 3 entirely at or below 0'])
    why_a = 'void: ' + ', '.join(x for x, f in (('control 1', not c1_holds), ('control 2', 'a' in void2)) if f)
    why_b = 'void: ' + ', '.join(x for x, f in (('control 2', 'b' in void2), ('control 3', not c3_holds)) if f)
    _apply_void(pa, void_a, why_a + ' (A13 L15)')
    _apply_void(pb, void_b, why_b + ' (A13 L15)')
    return {'claim': 'L15', 'void': void_a and void_b, 'parts': {'a': pa, 'b': pb},
            'controls': {'control1': c1, 'control2': c2, 'control3': c3,
                         'fails_as_required': {'control1': c1_holds, 'control2': not void2, 'control3': c3_holds},
                         'control2_void_parts': sorted(void2)}}
