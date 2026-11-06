"""lexicon.l6 (Amendment 10, items 7-9, 12): the decision rules on crafted per-seed intervals (every branch and
boundary), presence, precedence, the tuning choice, L4(c), LBENCH/1, the protocol pin, the lr-freeze lookup, seeds,
settings, control 1's relabelling convention, control 2's pairs, the floors, and the instance counts (counting only).
Synthetic data and unregistered seeds (80000 + i) only; nothing is ranked or trained on the mammal sets."""
import hashlib
import json
import math
import os
from fractions import Fraction as F

import numpy as np
import pytest

import hpstep.prng as hpstep_prng
import l6_synth
from hpstep.prng import Rng
from lexicon import l6
from lexicon import learned as L
from lexicon import rank as R


RNG_INIT = hpstep_prng.Rng.__init__              # the unguarded constructor, before any fixture runs


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    l6_synth.install_seed_guard(monkeypatch)


def iv(mean, lo, hi):
    return {'mean': mean, 'lo': lo, 'hi': hi}


GOOD = iv(0.30, 0.25, 0.35)        # clearly above 0
BAD = iv(-0.10, -0.15, -0.05)      # clearly below 0
MID = iv(0.01, -0.01, 0.03)        # straddles 0


# ================================================================ (a)
def test_part_a_boundaries():
    assert l6.part_a({2: [GOOD] * 5, 3: [GOOD] * 5})['verdict'] == 'supported'
    # lo = 0 is not above 0
    p = l6.part_a({2: [GOOD] * 4 + [iv(0.1, 0.0, 0.2)], 3: [GOOD] * 5})
    assert p['verdict'] == 'inconclusive' and not p['support'] and not p['refute']
    # the mean = 0 counts towards refutation; three seeds suffice
    p = l6.part_a({2: [iv(0.0, -0.1, 0.1)] * 3 + [GOOD] * 2, 3: [GOOD] * 5})
    assert p['verdict'] == 'refuted' and p['per_d'][2]['refuting_seeds'] == 3
    assert l6.part_a({2: [iv(0.0, -0.1, 0.1)] * 2 + [GOOD] * 3, 3: [GOOD] * 5})['verdict'] == 'inconclusive'
    # refutation at d = 2 alone refutes (a), even when d = 3 is supported
    p = l6.part_a({2: [BAD] * 5, 3: [GOOD] * 5})
    assert p['verdict'] == 'refuted' and p['per_d'][3]['verdict'] == 'supported'
    assert l6.part_a({2: [GOOD] * 5, 3: [BAD] * 3 + [MID] * 2})['verdict'] == 'refuted'
    # support needs both d
    p = l6.part_a({2: [GOOD] * 5, 3: [MID] * 5})
    assert p['verdict'] == 'inconclusive' and p['per_d'][2]['verdict'] == 'supported'
    assert set(p['per_seed']) == {2, 3} and len(p['reasons']) >= 6


def test_part_d_boundaries():
    assert l6.part_d([GOOD] * 5)['verdict'] == 'supported'
    assert l6.part_d([GOOD] * 4 + [iv(0.2, 0.0, 0.3)])['verdict'] == 'inconclusive'
    assert l6.part_d([iv(0.0, -0.01, 0.01)] * 3 + [GOOD] * 2)['verdict'] == 'refuted'
    assert l6.part_d([iv(1e-12, -0.01, 0.01)] * 3 + [GOOD] * 2)['verdict'] == 'inconclusive'
    assert l6.part_d([BAD] * 5)['verdict'] == 'refuted'


# ================================================================ (b)
def test_part_b_boundaries():
    band = iv(0.0, -0.02, 0.02)                         # the closed band
    assert l6.part_b([band] * 5)['verdict'] == 'supported'
    assert l6.part_b([iv(-0.5, -0.6, -0.4)] * 5)['verdict'] == 'supported'           # entirely below 0
    assert l6.part_b([iv(-0.01, -0.03, -1e-9)] * 5)['verdict'] == 'supported'        # below 0, not in the band
    # hi = 0 is not entirely below 0, and lo < -0.02 leaves the band
    p = l6.part_b([band] * 4 + [iv(-0.01, -0.03, 0.0)])
    assert p['verdict'] == 'inconclusive' and not p['support']
    assert l6.part_b([band] * 4 + [iv(0.0, -0.02, 0.0200001)])['verdict'] == 'inconclusive'
    # lo = 0.02 is not entirely above +0.02
    p = l6.part_b([iv(0.05, 0.02, 0.08)] * 5)
    assert p['verdict'] == 'inconclusive' and not p['refute'] and not p['support']
    p = l6.part_b([iv(0.05, 0.0200001, 0.08)] * 3 + [band] * 2)
    assert p['verdict'] == 'refuted' and p['refuting_seeds'] == 3
    assert l6.part_b([iv(0.05, 0.03, 0.08)] * 2 + [band] * 3)['verdict'] == 'inconclusive'
    # support and refutation never both hold (lo <= hi): exhaustive over a grid of ordered intervals
    vals = [-0.05, -0.02, -0.01, 0.0, 0.01, 0.02, 0.03, 0.05]
    ivs = [iv((lo + hi) / 2, lo, hi) for lo in vals for hi in vals if lo <= hi]
    for a in ivs:
        p = l6.part_b([a] * 5)
        assert not (p['support'] and p['refute'])


# ================================================================ (c)
def test_part_c_boundaries():
    assert l6.part_c([iv(0.0, -0.01, 0.01)] * 5)['verdict'] == 'supported'           # lo = -0.01 supports
    assert l6.part_c([iv(0.0, -0.0100001, 0.01)] + [GOOD] * 4)['verdict'] == 'inconclusive'
    p = l6.part_c([iv(-0.05, -0.08, -0.02)] * 5)                                       # the mean = -0.05: no
    assert p['verdict'] == 'inconclusive' and p['refuting_seeds'] == 0
    assert l6.part_c([iv(-0.0500001, -0.08, -0.02)] * 3 + [GOOD] * 2)['verdict'] == 'refuted'
    assert l6.part_c([iv(-0.2, -0.3, -0.1)] * 2 + [GOOD] * 3)['verdict'] == 'inconclusive'


# ================================================================ both conditions, presence, precedence
def test_both_conditions_inconclusive():
    weird = iv(-0.06, -0.005, 0.01)                     # lo > mean by more than 0.04: meets both (c) conditions
    p = l6.part_c([weird] * 5)
    assert p['support'] and p['refute'] and p['verdict'] == 'inconclusive'
    assert all(s['ordered'] is False for s in p['per_seed'])
    one = l6.part_c([weird] + [GOOD] * 4)               # lo > mean, only the support condition
    assert one['verdict'] == 'supported' and one['per_seed'][0]['ordered'] is False
    weird_d = iv(-0.01, 0.001, 0.02)                    # lo > 0 and mean <= 0
    assert l6.part_d([weird_d] * 5)['verdict'] == 'inconclusive'
    p = l6.part_a({2: [weird_d] * 5, 3: [GOOD] * 5})
    assert p['support'] and p['refute'] and p['verdict'] == 'inconclusive'
    assert p['per_d'][2]['verdict'] == 'inconclusive' and p['per_d'][3]['verdict'] == 'supported'


def tables_and_control2(missing=(), c2=None):
    seeds = range(5)
    tables = {(g, d, s): 'aps' for g, d in l6.CELLS for s in seeds}
    for key in missing:
        tables[key] = None
    control2 = {(g, d, s): True for g, d in l6.CELLS for s in seeds}
    control2.update(c2 or {})
    return tables, control2


def test_presence():
    tables, c2 = tables_and_control2()
    assert all(l6.present(c, s, tables, c2) for c in l6.COMPARISON_CELLS for s in range(5))
    # a diverged measured run (Euclidean d = 2, seed 1) removes seed 1 from (a) at d = 2 only
    tables, c2 = tables_and_control2(missing=[('euclid', 2, 1)])
    assert not l6.present('a2', 1, tables, c2)
    assert l6.present('a3', 1, tables, c2) and l6.present('c', 1, tables, c2)
    # a control-2 None (either run of the pair diverged) does the same for every comparison using the cell
    tables, c2 = tables_and_control2(c2={('lorentz', 3, 4): None})
    assert not l6.present('a3', 4, tables, c2) and not l6.present('c', 4, tables, c2)
    assert not l6.present('d', 4, tables, c2) and l6.present('a2', 4, tables, c2)
    assert l6.present('b', 4, tables, c2)
    # a False is established (present); it voids instead (decide_l6)
    tables, c2 = tables_and_control2(c2={('lorentz', 50, 0): False})
    assert l6.present('b', 0, tables, c2)
    # a set of existing tables works too; a cell without a frozen lr has no tables at all
    assert not l6.present('b', 0, {('lorentz', 50, 0)}, c2)
    # three present seeds that meet the refutation rule refute while the other two are absent
    ivs = [BAD, BAD, BAD, None, None]
    assert l6.part_d(ivs)['verdict'] == 'refuted' and l6.part_d(ivs)['present'] == 3
    assert l6.part_d([GOOD] * 4 + [None])['verdict'] == 'inconclusive'          # support needs all five
    assert l6.part_b([iv(0.05, 0.03, 0.08)] * 3 + [None] * 2)['verdict'] == 'refuted'
    assert l6.part_a({2: [BAD] * 3 + [None] * 2, 3: [GOOD] * 5})['verdict'] == 'refuted'
    assert l6.part_a({2: [GOOD] * 4 + [None], 3: [GOOD] * 5})['verdict'] == 'inconclusive'


def parts_refuted():
    return {'a': l6.part_a({2: [BAD] * 5, 3: [BAD] * 5}), 'b': l6.part_b([iv(0.1, 0.05, 0.2)] * 5),
            'c': l6.part_c([iv(-0.3, -0.4, -0.2)] * 5), 'd': l6.part_d([BAD] * 5)}


def test_precedence_void():
    parts = parts_refuted()
    assert all(p['verdict'] == 'refuted' for p in parts.values())
    ok1 = {f't{i}': F(1, 50) for i in range(340)}
    _, c2 = tables_and_control2()
    d = l6.decide_l6(parts, ok1, c2)
    assert not d['void'] and all(d['parts'][k]['verdict'] == 'refuted' for k in 'abcd')
    # control 1 failing on one table voids all four parts over a refutation
    bad1 = dict(ok1, t17=F(1, 20) + F(1, 10 ** 30))
    d = l6.decide_l6(parts, bad1, c2)
    assert d['void'] and all(d['parts'][k]['verdict'] == 'void' for k in 'abcd')
    assert all(d['parts'][k]['verdict_before_controls'] == 'refuted' for k in 'abcd')
    assert d['control1']['failed'] == ['t17']
    # exactly 1/20 holds; floats are refused (the comparison is exact)
    assert l6.control1_holds(F(1, 20)) and not l6.control1_holds(F(1, 20) + F(1, 10 ** 40))
    with pytest.raises(TypeError):
        l6.control1_holds(0.05)
    # control 2 False in a d = 5 cell voids all four parts
    _, c2 = tables_and_control2(c2={('euclid', 5, 3): False})
    d = l6.decide_l6(parts, ok1, c2)
    assert d['void'] and d['control2']['failed'] == [['euclid', 5, 3]]
    # a control-2 None voids nothing
    _, c2 = tables_and_control2(c2={('lorentz', 3, 2): None})
    d = l6.decide_l6(parts, ok1, c2)
    assert not d['void'] and d['control2']['not_established'] == [['lorentz', 3, 2]]


def test_control2_entry():
    pos, neg = iv(0.2, 0.1, 0.3), iv(0.1, 0.0, 0.2)
    assert l6.control2_entry(pos, pos) is True
    assert l6.control2_entry(pos, neg) is False             # lo = 0 for graph-edge: not above 0
    assert l6.control2_entry(neg, pos) is False
    assert l6.control2_entry(None, pos) is None and l6.control2_entry(pos, None) is None


# ================================================================ intervals
def test_interval_and_keep_mask():
    rnd = np.random.default_rng(80500)
    a = [F(int(x), 1000) for x in rnd.integers(0, 1000, 60)]
    b = [F(int(x), 997) for x in rnd.integers(0, 997, 60)]
    out = l6.interval(a, b)
    vals = R.paired_diffs(a, b)
    m, (lo, hi) = R.ci_mean(vals)
    assert (out['mean'], out['lo'], out['hi'], out['n']) == (m, lo, hi, 60)
    assert out['ordered'] == (lo <= m <= hi)
    assert out['values_sha'] == hashlib.sha256('\n'.join(repr(v) for v in vals).encode()).hexdigest()
    assert out['map_x'] == l6.frac_str(R.map_exact(a))
    assert out['map_diff'] == l6.frac_str(R.map_exact(a) - R.map_exact(b))
    graph = [[1]] * 60
    graph[7] = []
    graph[30] = []
    keep = l6.keep_mask(graph)
    assert sum(keep) == 58
    a2, b2 = list(a), list(b)
    a2[7] = b2[7] = a2[30] = b2[30] = None
    out2 = l6.interval(a2, b2, keep)
    assert out2['n'] == 58
    assert out2['values_sha'] == hashlib.sha256('\n'.join(
        repr(v) for i, v in enumerate(vals) if keep[i]).encode()).hexdigest()
    with pytest.raises(ValueError):
        l6.interval(a2, b2)                                    # a kept query without an AP


# ================================================================ prediction (a)'s gap
def test_prediction_gap():
    ml = {2: [F(9, 10)] * 5, 3: [F(8, 10), F(7, 10), None, F(7, 10), F(7, 10)]}
    me = {2: [F(7, 10)] * 5, 3: [F(5, 10)] * 5}
    g = l6.prediction_gap(ml, me, a_verdict='supported')
    assert g[2]['mean'] == F(1, 5) and g[2]['at_least_1_5']                      # exactly 1/5 holds
    assert g[3]['mean'] == F(9, 40)                                              # (0.3 + 3 x 0.2) / 4
    assert g[3]['seeds_present'] == 4 and g[3]['per_seed'][2] is None
    assert g['holds']
    assert not l6.prediction_gap(ml, me, a_verdict='inconclusive')['holds']
    flags = {2: [True] * 5, 3: [True, False, False, True, True]}
    g2 = l6.prediction_gap(ml, me, present_flags=flags, a_verdict='supported')
    assert g2[3]['mean'] == (F(3, 10) + 2 * F(2, 10)) / 3
    me2 = {2: [F(7, 10) + F(1, 10 ** 20)] * 5, 3: me[3]}
    assert not l6.prediction_gap(ml, me2, a_verdict='supported')['holds']


# ================================================================ tuning (A10.8)
def test_tuning_choice():
    eq = {lr: [F(1, 2), F(1, 3), F(2, 3), F(1, 2)] for lr in l6.GRID}
    lr, det = l6.choose_lr(eq)
    assert lr == '0.03' and det['at_grid_end']                                # equal means: the smaller rate
    sc = {lr: [F(1, 10)] * 4 for lr in l6.GRID}
    sc['1'] = [F(9, 10), F(9, 10), F(9, 10), F(1, 10)]                        # mean 7/10
    sc['3'] = [F(7, 10), F(7, 10), F(7, 10), F(7, 10)]                        # mean 7/10: tie, 1 < 3
    sc['10'] = [F(99, 100)] * 3 + [None]                                      # one diverged run: ineligible
    lr, det = l6.choose_lr(sc)
    assert lr == '1' and not det['at_grid_end']
    assert det['rates']['1']['mean'] == F(7, 10) and isinstance(det['rates']['1']['mean'], F)
    assert det['rates']['10'] == {'eligible': False, 'diverged': 1, 'mean': None, 'runs': 4}
    sc['3'][0] = F(7, 10) + F(1, 10 ** 50)                                    # exactness: 3 now wins
    assert l6.choose_lr(sc)[0] == '3'
    lr, det = l6.choose_lr({k: [None, F(1), F(1), F(1)] for k in l6.GRID})
    assert lr is None and det['chosen'] is None and not det['at_grid_end']
    assert l6.choose_lr({'10': [F(1, 2)] * 4, '3': [F(1, 3)] * 4})[1]['at_grid_end']
    with pytest.raises(ValueError):
        l6.choose_lr({'30': [F(1)] * 4})                                     # the grid is never extended
    with pytest.raises(ValueError):
        l6.choose_lr({'1': [F(1)] * 24})                                     # a block holds four runs
    with pytest.raises(TypeError):
        l6.choose_lr({'1': [0.5] * 4})


def test_seeds_and_jobs():
    reg, dry = l6.REGISTERED, l6.DRY
    for f in ('training', 'tuning'):
        assert tuple(x + 3000 for x in getattr(reg, f)) == getattr(dry, f)
    for f in ('label', 'edge_base', 'floor_base', 'diag_base'):
        assert getattr(reg, f) + 3000 == getattr(dry, f)
    assert reg.bootstrap == dry.bootstrap == 7
    for seeds, base in ((reg, 9000), (dry, 12000)):
        jobs = l6.tuning_jobs(seeds)
        assert len(jobs) == 240
        for g, d in l6.CELLS:
            cell = [j for j in jobs if (j.geometry, j.d) == (g, d)]
            assert len(cell) == 24
            for k, lr in enumerate(l6.GRID):
                assert sorted(j.seed for j in cell if j.lr == lr) == list(range(base + 4 * k, base + 4 * k + 4))
                assert all(j.block == k for j in cell if j.lr == lr)
            assert sorted(j.seed for j in cell) == list(range(base, base + 24))     # each seed once per cell
            assert len({(j.lr, j.seed) for j in cell}) == 24
    sub = l6.tuning_jobs(l6.SELFTEST, cells=[('lorentz', 2)], grid=('0.3', '3'))
    assert [j.seed for j in sub] == list(l6.SELFTEST.block(2)) + list(l6.SELFTEST.block(4))
    # the diagnostic permutations meet no other L6 seed
    for seeds in (reg, dry, l6.SELFTEST):
        diag = {seeds.diag(j) for j in range(200)}
        other = set(seeds.training) | set(seeds.tuning) | {seeds.label} | \
            {seeds.edge(j) for j in range(5)} | {seeds.floor(j) for j in range(5)}
        assert len(diag) == 200 and not diag & other
    assert {reg.diag(0), reg.diag(199)} == {2100, 2299} and {dry.diag(0), dry.diag(199)} == {5100, 5299}
    assert reg.edge(0) == reg.floor(0) == 2000 and reg.edge(4) == 2004
    with pytest.raises(ValueError):
        reg.diag(200)
    with pytest.raises(ValueError):
        reg.edge(5)
    st = l6.SELFTEST
    own = set(st.training) | set(st.tuning) | {st.label} | {st.edge(j) for j in range(5)} | \
        {st.diag(j) for j in range(200)}
    assert all(not l6_synth.guarded(s) for s in own)
    try:
        from lexicon import embed
    except ImportError:
        return
    assert (embed.GRID, embed.DIMS, embed.GEOMETRIES) == (l6.GRID, l6.DIMS, l6.GEOMETRIES)


# ================================================================ L4(c) (A10.10)
def test_decide_l4c():
    small = (F(1, 10 ** 6), F(1, 10 ** 7))
    assert l6.decide_l4c([small] * 40, expected=40)['verdict'] == 'supported'
    d = l6.decide_l4c([small] * 39 + [(F(1, 2000), F(1, 1000))], expected=40)        # the larger of the two
    assert d['verdict'] == 'supported' and d['largest'] == F(1, 1000)                   # exactly 1/1000
    d = l6.decide_l4c([small] * 39 + [(F(1, 1000) + F(1, 10 ** 30), F(0))])
    assert d['verdict'] == 'inconclusive' and d['above_1_1000'] == 1
    assert l6.decide_l4c([small] * 39 + [(F(0), F(1, 100))])['verdict'] == 'inconclusive'          # 1/100: not over
    d = l6.decide_l4c([small] * 39 + [(F(0), F(1, 100) + F(1, 10 ** 30))])
    assert d['verdict'] == 'refuted' and d['above_1_100'] == 1
    d = l6.decide_l4c([small] * 39 + [None])
    assert d['verdict'] == 'inconclusive' and d['missing'] == 1                          # missing blocks support
    d = l6.decide_l4c([small] * 38 + [None, (F(1, 50), F(0))])
    assert d['verdict'] == 'refuted'                                                     # but not refutation
    with pytest.raises(ValueError):
        l6.decide_l4c([small] * 39, expected=40)
    with pytest.raises(TypeError):
        l6.decide_l4c([(0.0001, F(0))])
    assert L.delta_map(F(1, 3), F(1, 4)) == F(1, 12) == L.delta_map(F(1, 4), F(1, 3))


# ================================================================ LBENCH/1 (A10.12)
def lbench_fields(**over):
    f = dict(instanceId='wordnet30-mammal-closure', instanceSha='c' * 64, arm='learned', geometry='lorentz', d=3,
             seed=0, lr='0.3', protocolSha=l6.PROTOCOL_SHA, settingsSha='a' * 64, budget=l6.budget(6542),
             floatTableSha='b' * 64, snapSha='d' * 64, closureMapSha=l6.map_sha(F(2, 3)),
             graphMapSha=l6.map_sha(F(1, 3)), closureMap=l6.map_display(F(2, 3)), graphMap=l6.map_display(F(1, 3)),
             engine='python-3.13.18/numpy-2.5.3/numba-0.68.1', wallMs=61234)
    f.update(over)
    return f


def test_lbench():
    rec, h = l6.lbench(**lbench_fields())
    f = rec.split('|')
    assert len(f) == 22 and f[:2] == ['LBENCH/1', 'L6/1'] and f[13] == '32' and f[19] == 'cpu'
    assert f[17] == '0.666667' and f[18] == '0.333333'
    assert h == hashlib.sha256(rec.encode('utf-8')).hexdigest()
    assert l6.parse_lbench(rec)['lr'] == '0.3'
    assert l6.budget(6542) == '1000,20,50,50,131000,327100000'
    assert l6.budget(5696) == '1000,20,50,50,114000,284800000'
    assert l6.map_sha(F(2, 4)) == hashlib.sha256(b'1/2').hexdigest()
    # a tuning table: no settings, no graph-edge MAP
    rec, _ = l6.lbench(**lbench_fields(arm='tuning', settingsSha=None, graphMapSha=None, graphMap=None))
    f = rec.split('|')
    assert f[10] == '-' and f[16] == '-' and f[18] == '-' and len(f) == 22
    # the exact arm: no seed, lr, float table, snap bits or training time
    rec, _ = l6.lbench(**lbench_fields(arm='exact-h3', geometry='h3', seed=None, lr=None, floatTableSha=None,
                                       snapBits=None, wallMs=None))
    f = rec.split('|')
    assert [f[i] for i in (7, 8, 12, 13, 21)] == ['-'] * 5 and len(f) == 22
    for bad in (dict(arm='trained'), dict(geometry='poincare'), dict(engine='a|b'), dict(lr=''),
                dict(extra='x')):
        with pytest.raises(ValueError):
            l6.lbench(**lbench_fields(**bad))
    g = lbench_fields()
    del g['engine']
    with pytest.raises(ValueError):
        l6.lbench(**g)


def test_protocol_pin():
    with open(l6.PROTOCOL_FILE, 'rb') as fh:
        raw = fh.read()
    assert hashlib.sha256(raw).hexdigest() == l6.PROTOCOL_SHA == l6.protocol_sha()
    with open(l6.PREREGISTRATION, encoding='utf-8') as fh:
        prereg = fh.read()
    sec = l6.amendment_section(prereg, 10)
    assert raw.decode('utf-8') == sec
    assert sec.startswith('### Amendment 10 · 2026-11-06, Phase 4, before any code for its claims\n')
    assert sec.endswith('deciding nothing.\n') and not sec.endswith('\n\n') and '\r' not in sec
    assert '**16. Disclosures**' in sec and '**17. An omission in Phases 1–3**' in sec
    assert l6.amendment_section(prereg, 9).startswith('### Amendment 9 ·')
    assert '### Amendment 10' not in l6.amendment_section(prereg, 9)
    with pytest.raises(ValueError):
        l6.amendment_section(prereg, 99)


def test_amendment_section_crafted():
    text = ('# T\n\n## Amendments\n\n### Amendment 1 · a\n\nx\n\n### Amendment 10 · b\n\nline one\n'
            'line two  \n\n\n### Amendment 11 · c\n\ny\n')
    assert l6.amendment_section(text, 10) == '### Amendment 10 · b\n\nline one\nline two  \n'
    assert l6.amendment_section(text, 1) == '### Amendment 1 · a\n\nx\n'
    assert l6.amendment_section(text, 11) == '### Amendment 11 · c\n\ny\n'
    assert l6.amendment_section(text.replace('\n', '\r\n'), 10) == l6.amendment_section(text, 10)


def test_freeze_amendment():
    sha = hashlib.sha256(b'settings').hexdigest()
    base = '# P\n\n### Amendment 9 · x\n\nold\n\n### Amendment 10 · y\n\ndefs\n'
    assert l6.freeze_amendment(base + f'\n### Amendment 11 · z\n\nsettings.json `{sha}`\n', sha) == 11
    assert l6.freeze_amendment(base + '\n### Amendment 11 · defs\n\nno hash\n'
                               f'\n### Amendment 12 · freeze\n\nSHA-256 {sha.upper()}.\n', sha) == 12
    with pytest.raises(ValueError):
        l6.freeze_amendment(base, sha)                                                       # none
    with pytest.raises(ValueError):
        l6.freeze_amendment(base + f'\n### Amendment 11 · a\n\n{sha}\n\n### Amendment 12 · b\n\n{sha}\n', sha)
    with pytest.raises(ValueError):
        l6.freeze_amendment(base.replace('defs', sha), sha)                                  # not after A10
    with pytest.raises(ValueError):
        l6.freeze_amendment(base + f'\n### Amendment 11 · z\n\nab{sha}\n', sha)          # inside a longer run
    with pytest.raises(ValueError):
        l6.freeze_amendment(base, 'xyz')


def test_settings():
    assert l6.settings_path('registered') == os.path.join(l6.REFERENCE, 'settings.json')
    assert l6.settings_path('dry') == os.path.join(l6.REFERENCE, 'results', 'dry', 'settings.json')
    assert l6.settings_path('selftest', '/tmp/x') == '/tmp/x/settings.json'
    with pytest.raises(ValueError):
        l6.settings_path('selftest')
    rates = {c: l6.GRID[i % 6] for i, c in enumerate(l6.CELLS)}
    rates[('euclid', 50)] = None
    tuning = {'file': 'reference/results/tuning.json', 'head': '0' * 40, 'sha256': 'e' * 64}
    text = l6.settings_text(rates, tuning)
    assert text.endswith('}\n') and not text.endswith('\n\n') and '\r' not in text
    obj = json.loads(text)
    assert list(obj['L6']['lr']['euclid']) == ['10', '2', '3', '5', '50'] and obj['L6']['lr']['euclid']['50'] is None
    assert text == json.dumps(obj, sort_keys=True, indent=1) + '\n'
    assert l6.read_settings(text) == rates
    for mutate in (lambda o: o['L6']['lr']['lorentz'].pop('5'),
                   lambda o: o['L6']['lr']['lorentz'].__setitem__('5', '0.5'),
                   lambda o: o['L6']['lr']['lorentz'].__setitem__('5', 0.3),
                   lambda o: o['L6']['lr'].__setitem__('poincare', {})):
        o = json.loads(text)
        mutate(o)
        with pytest.raises(ValueError):
            l6.read_settings(json.dumps(o))


# ================================================================ control 1's relabelling (A10.9)
def six_node():
    nb = [[1, 2, 3, 4, 5], [0, 3, 4], [0, 5], [0, 1], [0, 1], [0, 2]]     # 0 > {1 > {3, 4}, 2 > 5}
    N = [(0, 0), (4, 0), (-4, 0), (8, 1), (8, -1), (-9, 0)]
    return nb, N


def test_relabel_convention():
    nb, N = six_node()
    arm = L.dyadic_euclid_arm(N, 8)
    P = [0, 2, 3, 1, 4, 5]                  # node P[i] takes the point of row i
    Q = l6.inverse(P)
    assert Q != P
    m_p = L.evaluate(arm, {'c': l6.relabel(nb, P)}).map['c']
    m_q = L.evaluate(arm, {'c': l6.relabel(nb, Q)}).map['c']
    assert (m_p, m_q) == (F(104, 135), F(673, 1080))         # P and its inverse differ: the convention is pinned
    moved = l6.move_points(np.array(N), P)
    assert [tuple(moved[P[i]]) for i in range(6)] == N
    m_moved = L.evaluate(L.dyadic_euclid_arm([tuple(int(t) for t in r) for r in moved], 8), {'c': nb}).map['c']
    assert m_moved == m_p


def test_relabel_matches_moved_points_on_a_dag():
    cs = l6_synth.dag(80007, n=300, target=0, words=False)
    rnd = np.random.default_rng(80510)
    X = rnd.normal(size=(300, 3))
    N = L.snap(X, 'euclid', 8)                                   # coarse: ties, which must not matter
    P = l6.label_permutation(80520, 300)
    assert sorted(P) == list(range(300)) and P == Rng(80520).shuffle(list(range(300)))
    ev = L.evaluate(L.dyadic_euclid_arm(N, 8), {'c': l6.relabel(cs.closure_nb, P)})
    moved = l6.move_points(np.array(N, dtype=object), P)
    evm = L.evaluate(L.dyadic_euclid_arm([tuple(r) for r in moved], 8), {'c': cs.closure_nb})
    assert ev.map['c'] == evm.map['c']
    assert all(ev.aps['c'][r] == evm.aps['c'][P[r]] for r in range(300))    # row r carries label P[r]
    with pytest.raises(ValueError):
        l6.inverse([0, 0, 1])


def test_label_permutation_is_guarded():
    # the guard is installed (the constructor is wrapped), so none of the calls below can reach a draw; the sizes
    # are tiny regardless, and P itself (n = 1,182) is never asked for
    assert hpstep_prng.Rng.__init__ is not RNG_INIT
    with pytest.raises(RuntimeError):
        l6.label_permutation(l6.REGISTERED.label, 3)
    with pytest.raises(RuntimeError):
        l6.label_permutation(l6.DRY.label, 3)
    with pytest.raises(RuntimeError):
        l6.edge_pairs_seed(l6.REGISTERED.edge(0), 4, 2)
    with pytest.raises(RuntimeError):
        l6.floor_table(l6.REGISTERED.floor(0), 1, 2, 'euclid')
    assert Rng(state=(1, 2, 3, 4)).next_u32() == Rng(state=(1, 2, 3, 4)).next_u32()


# ================================================================ control 2's pairs and control 3's floors (A10.9)
def test_edge_pairs():
    n, E = 1182, 6542
    pairs = l6.edge_pairs_seed(80300, n, E)
    assert len(pairs) == E and pairs == sorted(pairs)
    assert all(a != b for a, b in pairs)
    assert len({(min(a, b), max(a, b)) for a, b in pairs}) == E
    # an independent replay of A10.9's rule on Rng(80300)
    rng = Rng(80300)
    held, ref = set(), []
    while len(ref) < E:
        a, b = rng.below(n), rng.below(n)
        if a != b and frozenset((a, b)) not in held:
            held.add(frozenset((a, b)))
            ref.append((a, b))
    assert pairs == sorted(ref)
    nn = l6.edge_nonneighbours(n, pairs)
    partners = {}
    for a, b in pairs:
        partners.setdefault(a, set()).add(b)
        partners.setdefault(b, set()).add(a)
    for a in range(n):
        assert nn[a] == [v for v in range(n) if v != a and v not in partners.get(a, set())]
    assert min(len(nn[a]) for a, _ in pairs) >= 1
    try:
        from lexicon import embed
    except ImportError:
        return
    assert embed.shuffled_pairs(n, E, 80300)[0] == pairs                 # the trainer's copy agrees


@pytest.mark.parametrize('d', [2, 3, 13, 50])
def test_floor_table(d):
    Xl = l6.floor_table(80310 + d, 40, d, 'lorentz')
    Xe = l6.floor_table(80310 + d, 40, d, 'euclid')
    rng = Rng(80310 + d)
    ref = np.array([[(2 * rng.random() - 1) * 1e-3 for _ in range(d)] for _ in range(40)])
    assert Xe.tobytes() == ref.tobytes() and Xl[:, 1:].tobytes() == ref.tobytes()
    for row in Xl.tolist():
        s = 0.0
        for x in row[1:]:
            s += x * x
        assert row[0] == math.sqrt(1.0 + s)
    try:
        from lexicon import embed
        from lexicon.pystream import PyStream
    except ImportError:
        return
    for g, X in (('lorentz', Xl), ('euclid', Xe)):
        assert embed.init_table(PyStream(80310 + d), 40, d, g).tobytes() == X.tobytes()


def test_random_ranking_map():
    nb = [[1, 2], [0], [0], []]
    # query 0: k = 2 of N = 3; queries 1, 2: k = 1 of 3; query 3 has no neighbours
    e1 = F(1, 3) * (1 + F(1, 2) + F(1, 3))
    e2 = F(1, 3) * (1 + (1 + F(1, 2)) / 2 + (1 + F(2, 2)) / 3)
    assert l6.random_ranking_map(nb) == (e2 + 2 * e1) / 3


# ================================================================ instance counts (counting only, A10.2, A10.13)
def test_instance_counts(wn):
    from lexicon import embed
    from lexicon import wordnet as W
    meta = json.load(open(os.path.join(l6.GOLDEN, 'wordnet_v1.meta.json')))
    cs = embed.closure_set(wn, l6.ROOTS['registered'])
    assert list(cs.offsets) == W.mammal_sets(wn)[0]
    assert cs.n == 1182 and sum(len(a) for a in cs.anc) == 6542
    assert cs.instance_sha == l6.instance_sha(cs.offsets) == meta['mammal']['closureSha256']
    nn = [cs.n - 1 - len(cs.anc[u] | cs.desc[u]) for u in range(cs.n)]
    idx = {o: i for i, o in enumerate(cs.offsets)}
    assert nn[idx['01861778']] == 0 and nn[idx['01886756']] == 49
    assert min(nn[u] for u in range(cs.n) if cs.anc[u]) == 49
    keep = l6.keep_mask(cs.graph_nb)
    assert [o for o, k in zip(cs.offsets, keep) if not k] == ['01322508', '01322604', '01322898', '01322983',
                                                              '01323068', '01862399']
    assert all(cs.closure_nb)
    assert l6.budget(sum(len(a) for a in cs.anc)) == '1000,20,50,50,131000,327100000'
    dry = embed.closure_set(wn, l6.ROOTS['dry'])
    assert dry.n == 1232 and sum(len(a) for a in dry.anc) == 5696
    assert sum(1 for v in dry.graph_nb if not v) == 11
    assert min(dry.n - 1 - len(dry.anc[u] | dry.desc[u]) for u in range(dry.n) if dry.anc[u]) == 110
    assert l6.budget(5696) == '1000,20,50,50,114000,284800000'
    # A10.9's random-ranking baselines, from the neighbour counts alone
    assert format(float(l6.random_ranking_map(cs.closure_nb)), '.6f') == '0.014957'
    assert format(float(l6.random_ranking_map(cs.graph_nb)), '.6f') == '0.007320'
