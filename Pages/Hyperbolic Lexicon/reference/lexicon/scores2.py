"""Stage 2 scores (Amendment 13, items 4-6; build spec sections 5-6): the exact points of every geometric arm, the
exact input tuples of each score form, certified values in Python `decimal`, the certified comparison, tie classes,
the maximum over senses (Phi), Dep at G's senses (Dep°), G_root, the reported forms, the exact keys, and the arms
built by permutation (S-full, W, S3) or by hashing (K3).

Points (A13.4; spec section 5). Every table holds the base point o under the key O ('o'): the empty word's point.
    H3, H2      h3tree.points / h2exact.TREE.points over 7^n / TREE.den(n); x0 = X[0]/den and
                K(s, t) = (X_s[0] X_t[0] - sum_{k>=1} X_s[k] X_t[k]) / (den_s den_t) = cosh d(s, t), Fractions
    F3, F3*, F2, F2*   flat.tree(dim, star).points over .den(n); |s|^2 and |s - t|^2 as Fractions; o = 0
    K3          address.k3_words, then h3tree.points
    S-full_i    l6.move_points's convention on H3: row P[j] holds synset j's point (P = l6.label_permutation(seed,
                82115), seed 2400 + i decisive, 5400 + i dry); o stays
    W_i         the polysemy-matched lemma shuffle over index.noun's strata (w_map; Rng(2420 + i), dry 5420 + i)
    S3_i        address.s3_words(words, 2000 + i) then h3tree.points (reported)
    learned     from learned.snap's integer tuples n. Lorentz: x0 = (4^32 + |n|^2)/(4^32 - |n|^2),
                K = 1 + 2 4^32 |n_s - n_t|^2 / ((4^32 - |n_s|^2)(4^32 - |n_t|^2)). Euclidean: |n|^2, |n_s - n_t|^2
                (the common factor 2^-32 dropped).

Input tuples (exact): H forms G -> (x0_s, x0_t, K), Dep -> (x0_s, x0_t); flat forms G -> (|s|^2, |t|^2, |s - t|^2),
Dep -> (|s|^2, |t|^2); G_root -> (K(p, s), K(p, t), K(s, t)) or (|s - p|^2, |t - p|^2, |s - t|^2). Forms 'hG' and
'hDep' are certified as e^G = E(x0_s)/(E(x0_t) E(K)) and e^Dep = E(x0_s)/E(x0_t), E(z) = z + sqrt((z - 1)(z + 1)),
bound factor M = the value; forms 'fG' and 'fDep' as sqrt(a) - sqrt(b) - sqrt(c) and sqrt(a) - sqrt(b), M the sum of
the square roots. Each value is computed in decimal.Context(prec=p, ROUND_HALF_EVEN), every exact rational entering by
one ctx.divide of its numerator and denominator, with the bound e_p = 10^(10 - p) M (A13.6).

Exact keys, ordered as ints or Fractions with no decimal step (A13.6): Sym through -K or -|s - t|^2; the WN and letter
tree integers (lexicon.wngraph); GloVe through c|c| / (|a|^2 |b|^2), c = a.b (cos_key); a learned table's distance-only
score through -K or -|s - t|^2. Larger key = higher score.

    O, HTable, FTable, LTable, ETable; h3_table, h2_table, flat_table, k3_table, sfull_table, s3_table,
    lorentz_table, euclid_table, learned_table; w_strata, w_map, W_STRATA_NOUN
    Val(form, tup), Certifier: .value(val, p), .cmp(a, b), .tie_classes(vals), .phi(vals), .dep_circ_index(...)
    ChainedTieError, TieClasses, codes_from_keys(keys), joint_codes(cert, lists), value_stream_sha(values)
    Scorer(table, cert): .g_vals, .phi_g, .dep_circ, .phi_sym, .phi_dep, .first_*, .gensim_pair, .groot_vals, ...
    WNScorer(graph): the same interface on lexicon.wngraph's exact integers
    nk17_value, product_value, codes_plain, phi_plain (reported forms, 120 digits, not certified); cos_key; f1_hit;
    norm_rounds_to_one (A13.11's diagnostic)

READINGs are marked where a definition admits two readings; each cites the A13 item it implements.
"""
import hashlib
from collections import namedtuple
from decimal import MAX_EMAX, MAX_PREC, MIN_EMIN, ROUND_HALF_EVEN, Context, Decimal
from fractions import Fraction

import numpy as np
from hpstep import prng

from . import address, flat, h2exact, h3tree, l6
from . import learned as LR

P1, P2 = 120, 240                                    # A13.6's two precisions
PRECISIONS = (P1, P2)
CTX = {p: Context(prec=p, rounding=ROUND_HALF_EVEN) for p in PRECISIONS}
BOUND = {p: Decimal(1).scaleb(10 - p) for p in PRECISIONS}   # e_p = 10^(10 - p) M
# Unrounded arithmetic for the differences and bound sums of the comparison (add and subtract are exact here).
EXACT = Context(prec=MAX_PREC, Emax=MAX_EMAX, Emin=MIN_EMIN, rounding=ROUND_HALF_EVEN)
FOUR32 = 4 ** 32
O = 'o'                                              # the base point's key in every table
# A13.12's seeds for the arms built by permutation, (decisive base, dry base) + i; functions take the seed itself.
ARM_SEEDS = {'S-full': (2400, 5400), 'W': (2420, 5420), 'S3': (2000, 5000)}
H_FORMS = ('hG', 'hDep')
F_FORMS = ('fG', 'fDep')
FORMS = H_FORMS + F_FORMS


# ================================================================ point tables (A13.4; spec section 5)
class HTable:
    """Exact points on the hyperboloid, {key: (X, den)} with x = X / den (H3, H2, K3, S-full, S3)."""
    kind, g_form, dep_form = 'h', 'hG', 'hDep'

    def __init__(self, points, name=''):
        self.pts = dict(points)
        self.name = name
        self._x0 = {}

    def __contains__(self, k):
        return k in self.pts

    def x0(self, k):
        v = self._x0.get(k)
        if v is None:
            X, d = self.pts[k]
            v = self._x0[k] = Fraction(X[0], d)
        return v

    def K(self, a, b):
        """K(a, b) = -<P(a), P(b)>_L = cosh d(a, b), an exact Fraction."""
        Xa, da = self.pts[a]
        Xb, db = self.pts[b]
        num = Xa[0] * Xb[0]
        for i in range(1, len(Xa)):
            num -= Xa[i] * Xb[i]
        return Fraction(num, da * db)

    def g_tuple(self, s, t):
        return (self.x0(s), self.x0(t), self.K(s, t))

    def dep_tuple(self, s, t):
        return (self.x0(s), self.x0(t))

    def sym_key(self, s, t):
        """The exact Sym key: -K (larger K = farther)."""
        return -self.K(s, t)

    def groot_tuple(self, p, s, t):
        return (self.K(p, s), self.K(p, t), self.K(s, t))


class LTable(HTable):
    """A learned Lorentz table from snapped integers n (learned.snap): x0 and K by A13.4's formulas."""

    def __init__(self, N, name=''):
        self.n = dict(N)
        self.name = name
        self._sq = {}
        self._x0 = {}

    def __contains__(self, k):
        return k in self.n

    def sqn(self, k):
        v = self._sq.get(k)
        if v is None:
            v = self._sq[k] = sum(x * x for x in self.n[k])
            if v >= FOUR32:
                raise ValueError(f'{k!r}: |n|^2 >= 4^32 is outside the ball')
        return v

    def x0(self, k):
        v = self._x0.get(k)
        if v is None:
            s = self.sqn(k)
            v = self._x0[k] = Fraction(FOUR32 + s, FOUR32 - s)
        return v

    def K(self, a, b):
        d2 = sum((x - y) ** 2 for x, y in zip(self.n[a], self.n[b]))
        return 1 + Fraction(2 * FOUR32 * d2, (FOUR32 - self.sqn(a)) * (FOUR32 - self.sqn(b)))


class FTable:
    """Exact flat points {key: (X, den)} (F3, F3*, F2, F2*): |s|^2 and |s - t|^2 as Fractions."""
    kind, g_form, dep_form = 'f', 'fG', 'fDep'

    def __init__(self, points, name=''):
        self.pts = dict(points)
        self.name = name
        self._sq = {}

    def __contains__(self, k):
        return k in self.pts

    def sq(self, k):
        v = self._sq.get(k)
        if v is None:
            X, d = self.pts[k]
            v = self._sq[k] = Fraction(sum(x * x for x in X), d * d)
        return v

    def d2(self, a, b):
        Xa, da = self.pts[a]
        Xb, db = self.pts[b]
        return Fraction(sum((x * db - y * da) ** 2 for x, y in zip(Xa, Xb)), (da * db) ** 2)

    def g_tuple(self, s, t):
        return (self.sq(s), self.sq(t), self.d2(s, t))

    def dep_tuple(self, s, t):
        return (self.sq(s), self.sq(t))

    def sym_key(self, s, t):
        """The exact Sym key: -|s - t|^2."""
        return -self.d2(s, t)

    def groot_tuple(self, p, s, t):
        return (self.d2(s, p), self.d2(t, p), self.d2(s, t))


class ETable(FTable):
    """A learned Euclidean table from snapped integers n: |n|^2 and |n_s - n_t|^2 as ints (factor 2^-32 dropped)."""

    def __init__(self, N, name=''):
        self.n = dict(N)
        self.name = name
        self._sq = {}

    def __contains__(self, k):
        return k in self.n

    def sq(self, k):
        v = self._sq.get(k)
        if v is None:
            v = self._sq[k] = sum(x * x for x in self.n[k])
        return v

    def d2(self, a, b):
        return sum((x - y) ** 2 for x, y in zip(self.n[a], self.n[b]))


def _with_origin(words):
    words = {k: tuple(w) for k, w in words.items()}
    if O in words and words[O] != ():
        raise ValueError(f'the key {O!r} is reserved for the base point (the empty word)')
    words[O] = ()
    return words


def h3_table(words, name='H3'):
    """H3's exact points of {key: word}, plus o (the empty word: (1, 0, 0, 0) over 1)."""
    words = _with_origin(words)
    keys = list(words)
    pts = h3tree.points([words[k] for k in keys])
    return HTable({k: (X, h3tree.den(len(words[k]))) for k, X in zip(keys, pts)}, name)


def h2_table(words, name='H2'):
    """H2's exact points (D3's tree, t = 11/13) of {key: word}, plus o."""
    words = _with_origin(words)
    keys = list(words)
    T = h2exact.TREE
    pts = T.points([words[k] for k in keys])
    return HTable({k: (X, T.den(len(words[k]))) for k, X in zip(keys, pts)}, name)


def flat_table(words, dim, star=False, name=None):
    """F3, F3*, F2 or F2* (lexicon.flat) of {key: word}, plus o = 0."""
    words = _with_origin(words)
    keys = list(words)
    T = flat.tree(dim, star)
    pts = T.points([words[k] for k in keys])
    return FTable({k: (X, T.den(len(words[k]))) for k, X in zip(keys, pts)}, name or T.name)


def k3_table(wn, offsets, pos='noun', name='K3'):
    """K3: the content-hash words of the synsets (address.k3_words) placed by h3tree, plus o."""
    offsets = list(offsets)
    return h3_table(dict(zip(offsets, address.k3_words(wn, offsets, pos))), name)


def sfull_table(table, offsets, P, name='S-full'):
    """S-full (A13.4): the synset with offset-order index P[j] takes the point of synset j, by l6.move_points's
    convention (row P[j] of the moved table is row j), applied to the row indices so that each point keeps its own
    denominator. offsets: the universe in offset order (index j is offsets[j]); P a permutation of range(len). The
    base point o stays."""
    offsets = list(offsets)
    n = len(offsets)
    if sorted(P) != list(range(n)):
        raise ValueError('P is not a permutation of the offsets')
    src = [int(i) for i in l6.move_points(np.arange(n, dtype=np.int64), P).tolist()]   # src[P[j]] = j
    pts = {offsets[r]: table.pts[offsets[src[r]]] for r in range(n)}
    if O in table.pts:
        pts[O] = table.pts[O]
    return HTable(pts, name)


def sfull_permutation(seed, n=82115):
    """P_i = Rng(seed).shuffle(list(range(n))) (l6.label_permutation): seed 2400 + i decisive, 5400 + i dry."""
    return l6.label_permutation(seed, n)


def s3_table(words, offsets, seed, name='S3'):
    """S3 (reported): address.s3_words over the words in offset order (seed 2000 + i, i < 5), then H3."""
    offsets = list(offsets)
    ws = address.s3_words([tuple(words[o]) for o in offsets], seed)
    return h3_table(dict(zip(offsets, ws)), name)


def lorentz_table(offsets, N, name='lorentz'):
    """A learned Lorentz table: {offset: n} from learned.snap's rows (Poincare integers), plus o (n = 0)."""
    d = {o: tuple(int(x) for x in row) for o, row in zip(offsets, N)}
    d[O] = (0,) * len(next(iter(d.values())))
    return LTable(d, name)


def euclid_table(offsets, N, name='euclid'):
    """A learned Euclidean table: {offset: n}, plus o (n = 0)."""
    d = {o: tuple(int(x) for x in row) for o, row in zip(offsets, N)}
    d[O] = (0,) * len(next(iter(d.values())))
    return ETable(d, name)


def learned_table(offsets, X, geometry, name=None):
    """learned.snap(X, geometry), then lorentz_table or euclid_table."""
    N = LR.snap(X, geometry)
    return (lorentz_table if geometry == 'lorentz' else euclid_table)(offsets, N, name or geometry)


# ================================================================ W: the polysemy-matched lemma shuffle (A13.4)
W_STRATA_NOUN = (101863, 10257, 2989, 1178, 620, 306, 212, 94, 96, 183)     # k = 1..9 and k >= 10 (A13.4)
W_POOL = 10


def w_strata(index):
    """index: {lemma: IndexEntry} (wn['index']['noun']). {k: lemmas with k senses, sorted by code point}, k = 1..9,
    and k = 10 for every lemma with ten or more senses (pooled)."""
    strata = {}
    for lemma, entry in index.items():
        k = min(len(entry.offsets), W_POOL)
        if k < 1:
            raise ValueError(f'{lemma!r} has no senses')
        strata.setdefault(k, []).append(lemma)
    for v in strata.values():
        v.sort()
    return strata


def w_check(strata, sizes=W_STRATA_NOUN):
    """The stratum sizes of A13.4 (a count check)."""
    got = tuple(len(strata.get(k, ())) for k in range(1, W_POOL + 1))
    if got != tuple(sizes):
        raise ValueError(f'W strata {got} are not {tuple(sizes)}')
    return got


def w_map(index, seed):
    """W_i (A13.4): one Rng(seed) (2420 + i decisive, 5420 + i dry) takes the strata in increasing k; each stratum's
    lemmas, sorted by code point as L, are permuted by shuffle into Q (a fresh list), and lemma L[j] takes the sense
    list of Q[j]. Returns {lemma: the lemma whose senses it takes}; senses_W(w) = S_U(map[w])."""
    rng = prng.Rng(seed)
    strata = w_strata(index)
    out = {}
    for k in sorted(strata):
        L = strata[k]
        Q = rng.shuffle(list(L))
        for a, b in zip(L, Q):
            out[a] = b
    return out


# ================================================================ certified values (A13.6; spec section 6)
class Val:
    """One certified value: its form and exact input tuple; v1/e1 (120 digits) and v2/e2 (240) once computed."""
    __slots__ = ('form', 'tup', 'v1', 'e1', 'v2', 'e2')

    def __init__(self, form, tup):
        if form not in FORMS:
            raise ValueError(f'unknown certified form {form!r}')
        self.form, self.tup = form, tuple(tup)
        self.v1 = self.e1 = self.v2 = self.e2 = None

    def __repr__(self):
        return f'Val({self.form!r}, {tuple(str(x) for x in self.tup)})'


class ChainedTieError(ValueError):
    """A tie class whose ends lie farther apart than the sum of their 240-digit bounds (A13.6): the run stops, to be
    repaired by amendment."""

    def __init__(self, msg, info):
        super().__init__(msg)
        self.info = info


TieClasses = namedtuple('TieClasses', 'codes values n_classes n_distinct recomputed tie_classes tie_tuples side')


def _dec(x, ctx):
    """An exact rational (int or Fraction) entering decimal by one division (A13.6)."""
    return ctx.divide(Decimal(x.numerator), Decimal(x.denominator))


def _tkey(tup):
    """A hashable int image of an exact tuple (Fraction hashing is slow; (numerator, denominator) is exact)."""
    return tuple(v for x in tup for v in (x.numerator, x.denominator))


class Certifier:
    """Certified values, the comparison and tie classes. Caches E(z) for the first two tuple entries (x0 and K(p, .)
    repeat across sense pairs); counts 240-digit recomputations and numerical ties.

        recomputed     values computed at 240 digits (each Val once)
        ties           the numerical ties met by cmp between different tuples: (a, b, a.v2, b.v2)"""

    def __init__(self, log_limit=10000):
        self._E = {p: {} for p in PRECISIONS}
        self.recomputed = 0
        self.ties = []
        self.n_ties = 0
        self.log_limit = log_limit

    # ------------------------------------------------------------ values
    def _E_of(self, z, ctx, p, cache):
        n, d = z.numerator, z.denominator
        if cache:
            key = (n, d)
            v = self._E[p].get(key)
            if v is not None:
                return v
        # the radicand (z - 1)(z + 1) = (n - d)(n + d)/d^2, already in lowest terms when n/d is (gcd(n +- d, d) = 1)
        rad = ctx.divide(Decimal((n - d) * (n + d)), Decimal(d * d))
        v = ctx.add(ctx.divide(Decimal(n), Decimal(d)), ctx.sqrt(rad))
        if cache:
            self._E[p][key] = v
        return v

    def compute(self, form, tup, p):
        """(value, bound) of one tuple at precision p (120 and 240 are A13.6's; any other p serves tests)."""
        ctx = CTX.get(p) or Context(prec=p, rounding=ROUND_HALF_EVEN)
        cache = p in CTX
        if form == 'hG':
            a, b, k = tup
            if k < 1 or a < 1 or b < 1:
                raise ValueError('an H tuple needs x0 >= 1 and K >= 1')
            Ea, Eb, Ek = self._E_of(a, ctx, p, cache), self._E_of(b, ctx, p, cache), self._E_of(k, ctx, p, False)
            v = ctx.divide(Ea, ctx.multiply(Eb, Ek))
            M = v
        elif form == 'hDep':
            a, b = tup
            if a < 1 or b < 1:
                raise ValueError('an H tuple needs x0 >= 1')
            v = ctx.divide(self._E_of(a, ctx, p, cache), self._E_of(b, ctx, p, cache))
            M = v
        elif form == 'fG':
            ra, rb, rc = (ctx.sqrt(_dec(x, ctx)) for x in tup)
            v = ctx.subtract(ctx.subtract(ra, rb), rc)
            M = ctx.add(ctx.add(ra, rb), rc)
        else:
            ra, rb = (ctx.sqrt(_dec(x, ctx)) for x in tup)
            v = ctx.subtract(ra, rb)
            M = ctx.add(ra, rb)
        return v, ctx.multiply(M, BOUND.get(p) or Decimal(1).scaleb(10 - p))

    def ensure(self, val, p=P1):
        if p == P1:
            if val.v1 is None:
                val.v1, val.e1 = self.compute(val.form, val.tup, P1)
        elif val.v2 is None:
            val.v2, val.e2 = self.compute(val.form, val.tup, P2)
            self.recomputed += 1
        return val

    def value(self, val, p=P1):
        self.ensure(val, p)
        return (val.v1, val.e1) if p == P1 else (val.v2, val.e2)

    # ------------------------------------------------------------ the comparison
    def cmp(self, a, b):
        """A13.6: equal forms and tuples tie with no computation; otherwise the 120-digit values decide when they
        differ by more than the sum of their bounds, then the 240-digit values; otherwise a numerical tie (0),
        logged with its inputs.
        READING (A13.6): "differ by more than the sum of their bounds" compares the exact difference of the two
        decimal results with the exact sum of their bounds (unrounded decimal arithmetic: EXACT's add and subtract,
        and copy_abs, never abs(), which rounds to the thread's context), not a difference rounded to p digits."""
        if a.form != b.form:
            raise ValueError(f'cannot compare the forms {a.form!r} and {b.form!r}')
        if a.tup == b.tup:
            return 0
        self.ensure(a, P1)
        self.ensure(b, P1)
        d = EXACT.subtract(a.v1, b.v1)
        if d.copy_abs() > EXACT.add(a.e1, b.e1):
            return 1 if d > 0 else -1
        self.ensure(a, P2)
        self.ensure(b, P2)
        d = EXACT.subtract(a.v2, b.v2)
        if d.copy_abs() > EXACT.add(a.e2, b.e2):
            return 1 if d > 0 else -1
        self.n_ties += 1
        if len(self.ties) < self.log_limit:
            self.ties.append((a, b, a.v2, b.v2))
        return 0

    # ------------------------------------------------------------ tie classes
    def tie_classes(self, vals):
        """Codes 0, 1, ... (increasing value) of a list of Vals of one form (A13.6; spec section 6).

        Equal tuples share one value and are tied without computation. The distinct tuples are sorted by their
        120-digit values; runs whose consecutive values lie within the sum of their 120-digit bounds are recomputed
        at 240 digits and re-sorted; a run splits into classes where consecutive 240-digit values differ by more than
        the sum of their bounds; a class whose ends lie farther apart than the sum of their two bounds raises
        ChainedTieError. Returns TieClasses(codes per item, 120-digit value per item, number of classes, number of
        distinct tuples, the distinct tuples that took the 240-digit path in this list (whether or not an earlier cmp
        had computed them), classes and tuples in numerical ties between distinct tuples, side), side listing every
        distinct tuple that took the 240-digit path (its first item, multiplicity, tuple, both values, code and
        whether it sits in a numerical tie): the side file's content (A13.8)."""
        vals = list(vals)
        if not vals:
            return TieClasses([], [], 0, 0, 0, 0, 0, [])
        form = vals[0].form
        if any(v.form != form for v in vals):
            raise ValueError('a tie-class list holds one form')
        index, reps, first, count, rep_of = {}, [], [], [], []
        for i, v in enumerate(vals):
            k = _tkey(v.tup)
            j = index.get(k)
            if j is None:
                j = index[k] = len(reps)
                reps.append(v)
                first.append(i)
                count.append(0)
            count[j] += 1
            rep_of.append(j)
        for r in reps:
            self.ensure(r, P1)
        order = sorted(range(len(reps)), key=lambda j: reps[j].v1)
        runs, cur = [], [order[0]]
        for j in order[1:]:
            a, b = reps[cur[-1]], reps[j]
            if EXACT.subtract(b.v1, a.v1).copy_abs() <= EXACT.add(a.e1, b.e1):
                cur.append(j)
            else:
                runs.append(cur)
                cur = [j]
        runs.append(cur)
        code_of = [0] * len(reps)
        code = recomputed = n_tc = n_tt = 0
        side = []
        for run in runs:
            if len(run) == 1:
                code_of[run[0]] = code
                code += 1
                continue
            recomputed += len(run)                  # every distinct tuple of the run takes the 240-digit path
            for j in run:
                self.ensure(reps[j], P2)
            rr = sorted(run, key=lambda j: reps[j].v2)
            classes = [[rr[0]]]
            for j in rr[1:]:
                a, b = reps[classes[-1][-1]], reps[j]
                if EXACT.subtract(b.v2, a.v2).copy_abs() > EXACT.add(a.e2, b.e2):
                    classes.append([j])
                else:
                    classes[-1].append(j)
            for cl in classes:
                lo, hi = reps[cl[0]], reps[cl[-1]]
                if len(cl) > 1 and EXACT.subtract(hi.v2, lo.v2) > EXACT.add(lo.e2, hi.e2):
                    info = [{'tuple': [str(x) for x in reps[j].tup], 'v240': str(reps[j].v2), 'e240': str(reps[j].e2)}
                            for j in cl]
                    raise ChainedTieError(f'a chained tie of {len(cl)} values (form {form})', info)
                for j in cl:
                    code_of[j] = code
                    side.append({'item': first[j], 'count': count[j], 'tuple': [str(x) for x in reps[j].tup],
                                 'v120': str(reps[j].v1), 'v240': str(reps[j].v2), 'code': code, 'tied': len(cl) > 1})
                if len(cl) > 1:
                    n_tc += 1
                    n_tt += len(cl)
                code += 1
        side.sort(key=lambda e: e['item'])
        return TieClasses([code_of[j] for j in rep_of], [reps[j].v1 for j in rep_of], code, len(reps), recomputed,
                          n_tc, n_tt, side)

    # ------------------------------------------------------------ the maximum over senses
    def phi(self, vals):
        """The index of the maximum under cmp, over Vals in (i, j) order (x's sense index major): a running maximum,
        replaced only by a later value that compares greater under cmp (A13.3, A13.6: "any of the maxima"; only its
        value and tuple are kept)."""
        if not vals:
            raise ValueError('no sense pair')
        best = 0
        for i in range(1, len(vals)):
            if self.cmp(vals[i], vals[best]) > 0:
                best = i
        return best

    def dep_circ_index(self, g_vals, best=None):
        """Dep° (A13.5; spec section 6): among the pairs whose G compares equal (cmp == 0) to the row's maximum, the
        first in (i, j) order.
        READING (A13.5, "the pairs in the top tie class of G"): the spec's reading, the pairs whose G ties with the
        kept maximum under cmp; without a chained tie it is the row's top tie class."""
        if best is None:
            best = self.phi(g_vals)
        for i, v in enumerate(g_vals):
            if i == best or self.cmp(v, g_vals[best]) == 0:
                return i
        raise AssertionError('unreachable')


def codes_from_keys(keys):
    """Tie-class codes of exact keys (ints or Fractions; larger = higher score): equal keys share a code, codes
    0, 1, ... increase with the key."""
    distinct = sorted(set(keys))
    rank = {k: i for i, k in enumerate(distinct)}
    return [rank[k] for k in keys]


def joint_codes(cert, lists):
    """Code several lists of Vals in one tie-class list (direction: forward and reverse; HiT: a file's 21 slots),
    and split the codes back. Returns (codes per list, TieClasses of the joint list)."""
    flat_vals = [v for lst in lists for v in lst]
    tc = cert.tie_classes(flat_vals)
    out, i = [], 0
    for lst in lists:
        out.append(tc.codes[i:i + len(lst)])
        i += len(lst)
    return out, tc


def joint_key_codes(lists):
    """joint_codes for exact keys."""
    flat_keys = [k for lst in lists for k in lst]
    codes = codes_from_keys(flat_keys)
    out, i = [], 0
    for lst in lists:
        out.append(codes[i:i + len(lst)])
        i += len(lst)
    return out


def value_stream_sha(values):
    """The SHA-256 of a stream of 120-digit values in row order, each value's str() plus LF (A13.8), streamed."""
    h = hashlib.sha256()
    for v in values:
        h.update((str(v) + '\n').encode())
    return h.hexdigest()


# ================================================================ scorers: one arm, sense lists in, Vals or keys out
class Scorer:
    """The score forms of one geometric arm (a table) on sense lists S1 = S(x), S2 = S(y) (A13.3, A13.5).

        g_vals(S1, S2)       G's Vals of every pair, in (i, j) order
        phi_g(S1, S2)        Phi_G(x, y): the kept maximum (a Val); Phi_G(y, x) is phi_g(S2, S1)
        dep_circ(S1, S2)     Dep°'s Val: Dep of the first pair in G's top tie class
        phi_sym(S1, S2)      Phi_Sym: the largest exact Sym key
        phi_dep(S1, S2)      Dep with the maximum over senses (reported)
        first_g / first_dep / first_sym     the first senses (reported)
        gensim_pair(S1, S2)  the pair with the smallest distance (the largest Sym key), ties to the first in (i, j)
        gensim_g / gensim_dep              that pair, then scored (reported)
        groot_vals(p, ...), phi_groot(p, ...)   G_root with base point p (learned tables, reported)"""

    def __init__(self, table, cert=None):
        self.t = table
        self.cert = cert if cert is not None else Certifier()

    def g_vals(self, S1, S2):
        t, f = self.t, self.t.g_form
        return [Val(f, t.g_tuple(s, u)) for s in S1 for u in S2]

    def dep_vals(self, S1, S2):
        t, f = self.t, self.t.dep_form
        return [Val(f, t.dep_tuple(s, u)) for s in S1 for u in S2]

    def phi_g(self, S1, S2):
        vals = self.g_vals(S1, S2)
        return vals[self.cert.phi(vals)]

    def dep_circ(self, S1, S2):
        g = self.g_vals(S1, S2)
        i = self.cert.dep_circ_index(g)
        s, u = S1[i // len(S2)], S2[i % len(S2)]
        return Val(self.t.dep_form, self.t.dep_tuple(s, u))

    def phi_sym(self, S1, S2):
        return max(self.t.sym_key(s, u) for s in S1 for u in S2)

    def phi_dep(self, S1, S2):
        vals = self.dep_vals(S1, S2)
        return vals[self.cert.phi(vals)]

    def first_g(self, S1, S2):
        return Val(self.t.g_form, self.t.g_tuple(S1[0], S2[0]))

    def first_dep(self, S1, S2):
        return Val(self.t.dep_form, self.t.dep_tuple(S1[0], S2[0]))

    def first_sym(self, S1, S2):
        return self.t.sym_key(S1[0], S2[0])

    def gensim_pair(self, S1, S2):
        """gensim's rule (reported, A13.3): the pair at the smallest distance, i.e. the largest exact Sym key, ties
        to the first in (i, j) order."""
        best, bk = None, None
        for s in S1:
            for u in S2:
                k = self.t.sym_key(s, u)
                if bk is None or k > bk:
                    best, bk = (s, u), k
        return best

    def gensim_g(self, S1, S2):
        s, u = self.gensim_pair(S1, S2)
        return Val(self.t.g_form, self.t.g_tuple(s, u))

    def gensim_dep(self, S1, S2):
        s, u = self.gensim_pair(S1, S2)
        return Val(self.t.dep_form, self.t.dep_tuple(s, u))

    def groot_vals(self, p, S1, S2):
        t, f = self.t, self.t.g_form
        return [Val(f, t.groot_tuple(p, s, u)) for s in S1 for u in S2]

    def phi_groot(self, p, S1, S2):
        vals = self.groot_vals(p, S1, S2)
        return vals[self.cert.phi(vals)]

    def slot_vals(self, child, candidates):
        """HiT: G(child, c) for the row's candidates in slot order (synsets directly, no senses)."""
        t, f = self.t, self.t.g_form
        return [Val(f, t.g_tuple(child, c)) for c in candidates]


class WNScorer:
    """The same interface on WordNet's exact integers (lexicon.wngraph.WNGraph): G_WN, Sym_WN, Dep_WN."""

    def __init__(self, graph):
        self.g = graph

    def phi_g(self, S1, S2):
        return max(self.g.g(s, u) for s in S1 for u in S2)

    def dep_circ(self, S1, S2):
        """Dep_WN of the first pair (x's sense index major) whose G_WN equals the maximum."""
        pairs = [(s, u) for s in S1 for u in S2]
        gs = [self.g.g(s, u) for s, u in pairs]
        m = max(gs)
        s, u = pairs[gs.index(m)]
        return self.g.dep(s, u)

    def phi_sym(self, S1, S2):
        return max(self.g.sym(s, u) for s in S1 for u in S2)

    def phi_dep(self, S1, S2):
        return max(self.g.dep(s, u) for s in S1 for u in S2)

    def first_g(self, S1, S2):
        return self.g.g(S1[0], S2[0])

    def first_sym(self, S1, S2):
        return self.g.sym(S1[0], S2[0])

    def first_dep(self, S1, S2):
        return self.g.dep(S1[0], S2[0])


# ================================================================ reported forms (not certified; 120 digits)
def _ln_E(z, ctx):
    """arcosh(z) = ln(z + sqrt((z - 1)(z + 1))) in decimal."""
    n, d = z.numerator, z.denominator
    E = ctx.add(ctx.divide(Decimal(n), Decimal(d)), ctx.sqrt(ctx.divide(Decimal((n - d) * (n + d)), Decimal(d * d))))
    return ctx.ln(E)


def nk17_value(table, s, t, alpha=1000, prec=P1):
    """Nickel & Kiela's eq. 8 (reported, A13.5): -(1 + alpha (||t|| - ||s||)) arcosh(K(s, t)) with the Poincare norms
    ||u|| = sqrt((x0 - 1)/(x0 + 1)), alpha = 10^3, in decimal at `prec` digits.
    READING (A13.5; P17 eq. 8 scores is-a(u, v) as -(1 + alpha (||v|| - ||u||)) d(u, v)): u is s, the sense of the
    candidate hyponym x, and v is t, the sense of y. Defined on hyperboloid tables (H3, H2, K3, S-full, learned
    Lorentz) only; the flat arms have no Poincare norm."""
    if table.kind != 'h':
        raise ValueError('NK17 is read on hyperboloid tables only')
    ctx = Context(prec=prec, rounding=ROUND_HALF_EVEN)

    def norm(z):
        return ctx.sqrt(_dec(Fraction(z - 1) / (z + 1), ctx))
    d = _ln_E(table.K(s, t), ctx)
    factor = ctx.add(Decimal(1), ctx.multiply(Decimal(alpha), ctx.subtract(norm(table.x0(t)), norm(table.x0(s)))))
    return ctx.minus(ctx.multiply(factor, d))


def product_value(table, s, t, prec=P1):
    """The product (r(s) - r(t)) d(s, t) (reported, A13.5): arcosh for H tables, square roots for flat ones."""
    ctx = Context(prec=prec, rounding=ROUND_HALF_EVEN)
    if table.kind == 'h':
        r = ctx.subtract(_ln_E(table.x0(s), ctx), _ln_E(table.x0(t), ctx))
        return ctx.multiply(r, _ln_E(table.K(s, t), ctx))
    r = ctx.subtract(ctx.sqrt(_dec(table.sq(s), ctx)), ctx.sqrt(_dec(table.sq(t), ctx)))
    return ctx.multiply(r, ctx.sqrt(_dec(table.d2(s, t), ctx)))


def norm_rounds_to_one(x0, prec=60):
    """A13.11's diagnostic: whether the Poincare norm sqrt((x0 - 1)/(x0 + 1)) of a hyperboloid point with exact x0,
    rounded to binary64, is 1.0.
    READING (A13.11, "Poincare norms round to 1.0 in float64"): the exact norm rounded once to binary64, through a
    60-digit decimal value, not a float64 evaluation of the formula."""
    ctx = Context(prec=prec, rounding=ROUND_HALF_EVEN)
    x0 = Fraction(x0)
    return float(ctx.sqrt(_dec((x0 - 1) / (x0 + 1), ctx))) == 1.0


def codes_plain(values):
    """Codes of reported (uncertified) decimal values: equal decimals tie, codes increase with the value."""
    return codes_from_keys(values)


def phi_plain(values):
    """The index of the first maximum of reported decimal values (max over senses, not certified)."""
    best = 0
    for i in range(1, len(values)):
        if values[i] > values[best]:
            best = i
    return best


# ================================================================ GloVe's exact key (A13.6)
def cos_key(a, b):
    """c |c| / (|a|^2 |b|^2) with c = a.b, an exact Fraction and an increasing function of the cosine. a and b are
    exact vectors (ints over one common scale, or Fractions); a common scale cancels."""
    c = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a)
    nb = sum(y * y for y in b)
    if not na or not nb:
        raise ValueError('a zero vector has no cosine')
    return Fraction(c * abs(c)) / (na * nb)


# ================================================================ F1 under HiT's protocol (reported, spec section 7)
def f1_hit(cert, val_vals, val_labels, test_vals, test_labels):
    """F1 (reported; measured tables only, in the decisive run): theta ranges over the distinct certified val values
    (val's tie classes), a pair is positive when its value compares >= theta under cmp, theta maximises val F1 with
    ties to the smallest, then test is scored at that theta.
    READING (spec section 7): theta is the smallest value of its val tie class (the class's first member by its
    certified order), and a test value v is positive when cmp(v, theta) >= 0. Returns a dict with theta's code and
    tuple, the val and test F1 (exact Fractions) and the counts."""
    from . import stats2
    tc = cert.tie_classes(val_vals)
    code, f1_val = stats2.f1_select(tc.codes, val_labels)
    rep = {}
    for i, c in enumerate(tc.codes):
        if c == code:
            rep.setdefault(_tkey(val_vals[i].tup), i)
    reps = sorted(rep.values())
    if len(reps) == 1:
        theta = reps[0]
    else:                               # a numerical tie: the class came from the 240-digit path, ordered by v240
        theta = min(reps, key=lambda i: cert.ensure(val_vals[i], P2).v2)
    th = val_vals[theta]
    pred = [cert.cmp(v, th) >= 0 for v in test_vals]
    f1_test, counts = stats2.f1_from_predictions(pred, test_labels)
    return {'theta_code': code, 'theta_tuple': [str(x) for x in th.tup], 'f1_val': f1_val, 'f1_test': f1_test,
            'test_counts': counts}
