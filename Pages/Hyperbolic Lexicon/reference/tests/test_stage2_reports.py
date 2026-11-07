"""A13.11's reported items that the review found missing from the runner and added (deciding nothing): Nickel & Kiela
2018's diagnostic (the Spearman rho between r and sp/(sp + lp)), NK17's score on the learned tables, L14's tables on
the L13 rows, the suite's own detection protocol (OOV rows at the lowest in-vocabulary validation score), the
vocabulary each arm misses, and H3 against the learned tables on HL within U_@ as intervals.

Synthetic data only, and the tests' unregistered seeds 95200 + i, i < 300 (A13.12's row "Tests"; here 95475-95487,
which no other test file and no self-test seed uses): a guard refuses every other seed of hpstep.prng.Rng, numpy's
default_rng and RandomState while these tests run, as in the other Stage-2 test files. Nothing is scored on a Stage-2
instance; the runner's plans are built from invented instances."""
import itertools
import math
import random
from decimal import Context, Decimal
from fractions import Fraction as F

import numpy as np
import pytest

import hpstep.prng as hpstep_prng
from hpstep.problems import children
from lexicon import scores2 as SC
from lexicon import senses as SE
from lexicon import stats2 as ST
from lexicon import wordnet as W

import run_claims_stage2 as RS  # noqa: E402

ALLOWED = range(95200, 95500)                   # the tests' unregistered seeds (A13.12)


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    init = hpstep_prng.Rng.__init__

    def rng_init(self, seed=0, state=None):
        if state is None and seed not in ALLOWED:
            raise RuntimeError(f'seed {seed}: Stage 2 tests draw 95200 + i only (A13.12)')
        return init(self, seed, state)
    monkeypatch.setattr(hpstep_prng.Rng, '__init__', rng_init)
    real_default, real_rs = np.random.default_rng, np.random.RandomState

    def default_rng(seed=None):
        if seed not in ALLOWED:
            raise RuntimeError(f'numpy seed {seed}: Stage 2 tests draw 95200 + i only (A13.12)')
        return real_default(seed)

    class GuardedRandomState(real_rs):
        def __init__(self, seed=None):
            if seed not in ALLOWED:
                raise RuntimeError(f'RandomState seed {seed}: Stage 2 tests draw 95200 + i only (A13.12)')
            super().__init__(seed)
    monkeypatch.setattr(np.random, 'default_rng', default_rng)
    monkeypatch.setattr(np.random, 'RandomState', GuardedRandomState)


def test_guard():
    """The guard refuses registered and dry seeds and the review's 95600 + i; it lets the tests' 95200 + i through."""
    for seed in (7, 2400, 5440, 95199, 95500, 95600, 95899):
        for make in (hpstep_prng.Rng, np.random.default_rng, np.random.RandomState):
            with pytest.raises(RuntimeError):
                make(seed)
    hpstep_prng.Rng(95475)
    np.random.default_rng(95476)
    np.random.RandomState(95477)


def rwords(r, n, lo=0, hi=12):
    """n random reduced words of the tree (hpstep.problems.children), lengths lo..hi."""
    out = []
    for _ in range(n):
        w = []
        for _ in range(r.randint(lo, hi)):
            w.append(r.randrange(6) if not w else r.choice(children(w)))
        out.append(tuple(w))
    return out


def syn(off, lemmas, ptrs):
    return W.Synset('noun', 'n', off, lemmas, ptrs, '')


def lexicon_of(edges, extra=()):
    """A synthetic noun lexicon whose '@' pointers are the given (child, parent) edges."""
    nodes = sorted({x for e in edges for x in e} | set(extra))
    ptrs = {o: [] for o in nodes}
    for c, p in edges:
        ptrs[c].append(('@', p, 'n'))
    return {'synsets': {'noun': {o: syn(o, [f'w{o}'], ptrs[o]) for o in nodes}},
            'index': {'noun': {f'w{o}': W.IndexEntry(f'w{o}', 0, [o]) for o in nodes}}}


# ================================================================ Nickel & Kiela 2018's diagnostic
def test_sp_lp_by_hand():
    # R1 and R2 are roots; A under R1, B under A, C under B and R2, D under C; E isolated (no '@' pointer: not in U_@)
    R1, R2, A, B, C, D, E = (f'1000000{i}' for i in range(7))
    g = SE.at_graph(lexicon_of([(A, R1), (B, A), (C, B), (C, R2), (D, C)], extra=[E]))
    assert E not in g.nodes and sorted(g.roots) == [R1, R2]
    got = SE.sp_lp(g)
    assert got == {R1: (0, 4), R2: (0, 2), A: (1, 3), B: (2, 2), C: (1, 1), D: (2, 0)}


def brute_sp_lp(nodes, parents, children):
    def sp(o):
        return 0 if not parents[o] else 1 + min(sp(p) for p in parents[o])

    def lp(o):
        return 0 if not children[o] else 1 + max(lp(c) for c in children[o])
    return {o: (sp(o), lp(o)) for o in nodes}


@pytest.mark.parametrize('i', range(4))
def test_sp_lp_against_brute_force(i):
    r = random.Random(95475 + i)
    offs = [f'{20000000 + k:08d}' for k in range(60)]
    edges = set()
    for k in range(3, 60):                      # nodes 0-2 are roots; every other node has one to three parents
        for _ in range(r.choice((1, 1, 2, 3))):
            edges.add((offs[k], offs[r.randrange(0, k)]))
    g = SE.at_graph(lexicon_of(sorted(edges)))
    assert SE.sp_lp(g) == brute_sp_lp(g.nodes, g.parents, g.children)


def float_spearman(x, y):
    """Spearman's rho on average ranks in float64 (the oracle)."""
    def ranks(v):
        order = sorted(range(len(v)), key=lambda i: v[i])
        out = [0.0] * len(v)
        k = 0
        while k < len(order):
            j = k
            while j + 1 < len(order) and v[order[j + 1]] == v[order[k]]:
                j += 1
            for m in range(k, j + 1):
                out[order[m]] = (k + j) / 2 + 1
            k = j + 1
        return out
    a, b = ranks(x), ranks(y)
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    sab = sum((p - ma) * (q - mb) for p, q in zip(a, b))
    return sab / math.sqrt(sum((p - ma) ** 2 for p in a) * sum((q - mb) ** 2 for q in b))


@pytest.mark.parametrize('i', range(4))
def test_nk18_rho_against_a_float_oracle(i):
    r = random.Random(95479 + i)
    n = 300
    keys = [F(r.randrange(1, 40), r.choice((1, 2, 3))) for _ in range(n)]         # radius keys with ties
    splp = [(r.randrange(0, 6), r.randrange(1, 6)) for _ in range(n)]
    splp[0] = (0, 0)                                                              # an isolated node: left out
    got = ST.nk18_rho(keys, splp)
    keep = [k for k in range(n) if sum(splp[k])]
    want = float_spearman([float(keys[k]) for k in keep], [splp[k][0] / sum(splp[k]) for k in keep])
    assert got.n == len(keep) == n - 1
    assert float(got) == pytest.approx(want, abs=1e-12)
    # only the order of the radius keys matters: an increasing map of them gives the same exact rho
    assert ST.nk18_rho([k * k * 3 + 1 for k in keys], splp) == got
    assert ST.nk18_rho(keys, splp, ST.nk18_positions(splp)) == got     # the shared positions give the same rho


def test_radius_keys_follow_r():
    r = random.Random(95483)
    words = dict(enumerate(rwords(r, 40, 0, 7)))
    words[40] = words[3]                                                          # equal points tie
    h = SC.h3_table(words)
    keys = [SC.radius_key(h, k) for k in range(41)]
    rr = [math.acosh(float(h.x0(k))) for k in range(41)]
    for a, b in itertools.combinations(range(41), 2):
        if abs(rr[a] - rr[b]) > 1e-9:
            assert (keys[a] < keys[b]) == (rr[a] < rr[b])
    assert keys[40] == keys[3]
    f = SC.flat_table(words, 3)
    assert [SC.radius_key(f, k) for k in range(41)] == [f.sq(k) for k in range(41)]
    # snapped tables: |n|^2 orders r in both geometries
    N = [tuple(r.randint(-2 ** 31, 2 ** 31) for _ in range(3)) for _ in range(50)]
    sq = SC.snapped_radius_keys(N)
    lt = SC.lorentz_table([f'{k:08d}' for k in range(50)], N)
    et = SC.euclid_table([f'{k:08d}' for k in range(50)], N)
    assert sq == [lt.sqn(f'{k:08d}') for k in range(50)] == [et.sq(f'{k:08d}') for k in range(50)]
    rl = [math.acosh(float(lt.x0(f'{k:08d}'))) for k in range(50)]
    for a, b in itertools.combinations(range(50), 2):
        if abs(rl[a] - rl[b]) > 1e-9:
            assert (sq[a] < sq[b]) == (rl[a] < rl[b])


# ================================================================ NK17 on the learned tables
def test_nk17_on_learned_tables():
    r = random.Random(95484)
    offs = [f'{k:08d}' for k in range(12)]
    N = [tuple(r.randint(-2 ** 31, 2 ** 31) for _ in range(2)) for _ in offs]
    lt = SC.lorentz_table(offs, N)
    et = SC.euclid_table(offs, N)
    S32 = 2.0 ** 32
    for s, t in itertools.product(offs[:6], offs[6:]):
        ns, nt = (math.sqrt(sum(x * x for x in N[offs.index(k)])) / S32 for k in (s, t))
        # Lorentz: the Poincare norms |n|/2^32 (= sqrt((x0 - 1)/(x0 + 1))) and the hyperbolic distance
        want_l = -(1 + 1000 * (nt - ns)) * math.acosh(float(lt.K(s, t)))
        assert float(SC.nk17_value(lt, s, t)) == pytest.approx(want_l, rel=1e-9, abs=1e-9)
        # Euclidean (READING): the Euclidean norm and distance of n/2^32
        d = math.sqrt(sum((a - b) ** 2 for a, b in zip(N[offs.index(s)], N[offs.index(t)]))) / S32
        want_e = -(1 + 1000 * (nt - ns)) * d
        assert float(SC.nk17_value(et, s, t)) == pytest.approx(want_e, rel=1e-12, abs=1e-15)
    ctx = Context(prec=120)
    assert SC.nk17_value(et, offs[0], offs[0]) == 0 and isinstance(SC.nk17_value(et, offs[0], offs[1]), Decimal)
    assert ctx.prec == 120
    words = {k: (k,) for k in range(4)}
    with pytest.raises(ValueError):                    # the exact flat arms have no NK17 (unchanged)
        SC.nk17_value(SC.flat_table(words, 3), 0, 1)


# ================================================================ the suite's own detection protocol
def test_suite_detection_by_hand():
    codes = [3, 5, 1, 2, 0]
    folds = ['val', 'test', 'val', 'test', 'test']
    labels = [True, True, False, False, True]
    res = ST.suite_detection(codes, folds, labels, [True, False])
    # test rows: codes 5 (T), 2 (F), 0 (T) and two OOV rows at the lowest in-vocabulary validation code, 1 (T, F)
    assert res['floor_code'] == 1 and res['test_rows'] == 5 and res['oov_test_rows'] == 2
    assert res['val_rows_in_vocabulary'] == 2 and res['positives'] == 3 and not res['floor_from_test']
    # pessimistic ties: 5T, 2F, 1F, 1T, 0T -> (1 + 2/4 + 3/5)/3 = 7/10
    assert res['ap'] == F(7, 10)
    assert res['ap'] == ST.ap_exact([5, 2, 0, 1, 1], [True, False, True, True, False])
    assert res['ap_sklearn'] == ST.ap_sklearn([5, 2, 0, 1, 1], [True, False, True, True, False])
    # the OOV rows sit at the lowest validation code, which can lie above test rows
    res2 = ST.suite_detection([4, 0, 2], ['val', 'test', 'test'], [False, True, True], [True, True])
    assert res2['floor_code'] == 4 and res2['ap'] == ST.ap_exact([0, 2, 4, 4], [True, True, True, True]) == 1


def test_suite_detection_without_a_validation_row():
    # READING: no in-vocabulary validation row: the lowest in-vocabulary code of the test fold takes its place
    res = ST.suite_detection([2, 7], ['test', 'test'], [True, False], [True])
    assert res['floor_from_test'] and res['floor_code'] == 2
    assert res['ap'] == ST.ap_exact([2, 7, 2], [True, False, True])
    assert ST.suite_detection([1], ['test'], [False], [False])['ap'] is None


@pytest.mark.parametrize('i', range(3))
def test_suite_detection_against_a_literal_reimplementation(i):
    """The protocol written out literally (h[oov] = min of the in-vocabulary validation scores; AP over the test
    fold, file order) on random synthetic rows."""
    r = random.Random(95485 + i)
    n = 200
    folds = [r.choice(('val', 'test', 'test')) for _ in range(n)]
    oov = [r.random() < 0.1 for _ in range(n)]
    lab = [r.random() < 0.3 for _ in range(n)]
    score = [r.randrange(0, 15) for _ in range(n)]
    cov = [k for k in range(n) if not oov[k]]
    codes_cov = ST.exact_codes([score[k] for k in cov])
    res = ST.suite_detection(codes_cov, [folds[k] for k in cov], [lab[k] for k in cov],
                             [lab[k] for k in range(n) if oov[k] and folds[k] == 'test'])
    h = {k: c for k, c in zip(cov, codes_cov)}
    floor = min(h[k] for k in cov if folds[k] == 'val')
    test = [k for k in range(n) if folds[k] == 'test']
    hh = [h.get(k, floor) for k in test]
    yy = [lab[k] for k in test]
    assert res['ap'] == ST.ap_exact(hh, yy) and res['ap_sklearn'] == ST.ap_sklearn(hh, yy)


# ================================================================ the vocabulary each arm misses
def test_missed_words():
    rows = [(0, 'Dog', 'cat'), (1, 'ice cream', 'xyzzy'), (2, 'cat', 'Dog'), (3, 'frobb', 'xyzzy')]
    known = {'dog', 'cat', 'ice_cream'}
    types, lost = SE.missed_words(rows, lambda w: SE.N_S(w) in known)
    assert types == ['frobb', 'xyzzy'] and lost == 2
    assert SE.missed_words(rows, lambda w: True) == ([], 0)
    rep = SE.missed_report(types, lost)
    assert rep == {'missed_types': 2, 'missed_sha256': SE.word_types_sha(['frobb', 'xyzzy']),
                   'rows_with_a_missed_word': 2}


def test_vocabulary_of_arms():
    assert RS.arm_vocabulary('W-3', 'full') == 'index' and RS.arm_vocabulary('GloVe-300', 'full') == 'glove'
    assert RS.arm_vocabulary('GloVe-vec-7', 'full') == 'glove' and RS.arm_vocabulary('H3', 'at') == 'U_at'
    assert RS.arm_vocabulary('learned', 'at') == 'U_at' and RS.arm_vocabulary('S-full-0', 'full') == 'U_full'


# ================================================================ the runner's plans (invented instances, no scores)
def inst(name, rows, kind='pair', universe='full', metric='ap', **kw):
    return RS.Inst(name, name.lower(), 'k', 'sha', 'stage2/1', metric, kind, universe, rows, **kw)


def test_plans_carry_the_new_reports(tmp_path):
    cfg = RS.make_cfg('selftest', 1, out=str(tmp_path / 'st'))
    rows = [(0, 'a', 'b'), (1, 'b', 'c')]
    insts = {'BD-suite': inst('BD-suite', rows, folds={'val': [0], 'oov_test': []}),
             'WB-suite': inst('WB-suite', rows, folds={'val': [1], 'oov_test': [5]}),
             'BD-at': inst('BD-at', rows, universe='at'), 'WB-at': inst('WB-at', rows, universe='at'),
             'BD-dir-at': inst('BD-dir-at', rows, kind='dir', universe='at', metric='acc'),
             'HL-at': inst('HL-at', rows, universe='at', metric='rho'),
             'HIT-test': inst('HIT-test', [], kind='hit', universe='at', metric='rr')}
    insts['HIT-test'].rows = [type('R', (), {'row': 0})()]
    jobs = RS.exact_plan(cfg, insts)
    got = {(j['arm'], j['inst']) for j in jobs}
    for st in ('BD-suite', 'WB-suite'):
        assert {(a, st) for a in list(RS.SIX) + ['WN']} <= got
    trained = {'m': {'kind': 'measured', 'snap_sha': 'x', 'geometry': 'lorentz', 'd': 2},
               's': {'kind': 'shuffled', 'snap_sha': 'y', 'geometry': 'euclid', 'd': 2}}
    lj = {j['table']: j for j in RS.learned_plan(cfg, type('Wd', (), {'pos': 'verb'})(), insts, {'runs': []}, trained, {})}
    outs = {(o['inst'], o['form']) for o in lj['m']['outputs']}
    assert {('HIT-test', 'NK17'), ('HL-at', 'NK17'), ('BD-at', 'G'), ('WB-at', 'G'), ('BD-dir-at', 'G')} <= outs
    souts = {(o['inst'], o['form']) for o in lj['s']['outputs']}
    assert not souts & {('HIT-test', 'NK17'), ('BD-at', 'G')}
    cfg.reported = False
    lj = {j['table']: j for j in RS.learned_plan(cfg, type('Wd', (), {'pos': 'verb'})(), insts, {'runs': []}, trained, {})}
    assert not {(o['inst'], o['form']) for o in lj['m']['outputs']} & {('HIT-test', 'NK17'), ('BD-at', 'G')}
