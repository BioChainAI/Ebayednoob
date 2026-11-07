"""The wiring of L12-L15 (run_claims_stage2's DECISION_SPEC and CONTROL_SPEC, READING stage2-runner-41) and the
A13.11 reports completed with it: the L12 grid (READING stage2-runner-34), gensim's rule on WN, the per-row WordNet
bits of pass 1 (closure membership, L14(b)'s E edges) and the plan's new report cells.

- The spec is pinned term by term against Amendment 13: each constant is written out here as A13's Decision, Metric
  and Controls lines state it (as Phase 4's COMP_SPEC is pinned against A10.7), and spec_from_a13, which parses the
  terms, their X - Y order, the arm lists and the intervals out of A13's own sentences, must give the same constants
  and find every sentence it quotes. Mutated constants and mutated text are caught by check_spec.
- The selftest-level check that a mutated runner is caught (verify_wiring) is in tests/test_stage2_wiring.py (slow).

Synthetic data only (tests/stage2_synth.py's world): nothing is scored on a Stage-2 instance. The only seeds drawn are
the self-test's (S-full_i's and W_i's permutations in the grid test, 95260 + i and 95280 + i); hpstep.prng.Rng refuses
every seed outside 95200-95499 while these tests run.
"""
import dataclasses
import re
from decimal import Decimal
from fractions import Fraction as F

import pytest

from lexicon import scores2 as SC
from lexicon import senses as SE
from lexicon import stage2data as S2D
from lexicon import wngraph as WG

import run_claims_stage2 as RS  # noqa: E402

S, C, B = RS.Side, RS.Comp, RS.Band


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    """A13.12: tests draw 95200 + i only (the grid test builds S-full_i and W_i from the self-test's seeds)."""
    import hpstep.prng as P
    init = P.Rng.__init__

    def guarded(self, seed=0, *a, **k):
        if k.get('state') is None and not (a and a[0] is not None) and not 95200 <= seed < 95500:
            raise RuntimeError(f'seed {seed}: Stage 2 tests draw 95200 + i only (A13.12)')
        return init(self, seed, *a, **k)
    monkeypatch.setattr(P.Rng, '__init__', guarded)


def g(arm):
    return S(arm, 'G', 'max', '-')


def sym(arm):
    return S(arm, 'Sym', 'max', '-')


GLOVE = S('GloVe-300', 'cos', '-', '-')
LG = S('lorentz', 'G', '-', 'measured')
EG = S('euclid', 'G', '-', 'measured')
LGm = S('lorentz', 'G', 'max', 'measured')
EGm = S('euclid', 'G', 'max', 'measured')


# ================================================================ the spec, term by term
def test_decision_spec_is_amendment_13_term_by_term():
    """A13, term by term (X - Y in that order; read by the claim's own form and sense rule):
    L12 (HL, G with the maximum over senses; "the paired difference of two arms' ρ with its word-level ci_rho
    interval"): (a) ρ(H3) − ρ(F3), ρ(H3) − ρ(F3*), ρ(H2) − ρ(F2), ρ(H2) − ρ(F2*); (b) ρ(G) − ρ(Dep°) in H3 and in H2;
    (c) ρ(G) − ρ(Sym) in H3 and in H2; (d) ρ(H3) − ρ(WN) (WN with G_WN); control 1 ρ(H3) − ρ(K3), ρ(H3) − ρ(S-full*);
    control 2 ρ(H3) − ρ(W*); control 3 ρ(H3 read as Φ_G(x, y)) − ρ(H3 read as Φ_G(y, x)).
    L13 (G with the maximum; "each with its ci_cluster interval"): H3 − F3, H3 − F3*, H2 − F2, H2 − F2* on (a) BLESS
    detection AP (BD), (b) WBLESS detection AP (WB), (c) BLESS direction accuracy (BD-dir); control 1 H3 − K3,
    H3 − S-full*, H3 − W* on each of (a), (b), (c).
    L14 (the measured tables read by G at o, d = 2 and 3): (a) RR(Lorentz) − RR(Euclidean) on HiT test, random and
    hard negatives, with rank.ci_mean over the rows; (b) ρ(Lorentz) − ρ(Euclidean) on HL-at with the word-level
    ci_rho; control 3 true − shuffled in each cell (Lorentz, Euclidean) per metric: RR random and RR hard (ci_mean over
    the test rows), ρ (ci_rho over the 2,153 rows).
    L15 (ρ; the word-level ci_rho): (a) Sym with the maximum, ρ(H3) − ρ(F3), ρ(H3) − ρ(F3*), ρ(H2) − ρ(F2),
    ρ(H2) − ρ(F2*) on SL and on MEN; (b) ρ(GloVe) − ρ(H3) on MEN and on WSR, ρ(H3) − ρ(GloVe) on HL, each within GloVe
    (H3 read by Sym, GloVe 6B 300-d cosine); control 1 ρ(H3) − ρ(K3), ρ(H3) − ρ(S-full*), ρ(H3) − ρ(W*) on SL and on
    MEN."""
    want = {
        'L12/a': {'H3-F3': C(g('H3'), g('F3'), 'HL', 'rho', 'ci_rho'),
                  'H3-F3*': C(g('H3'), g('F3*'), 'HL', 'rho', 'ci_rho'),
                  'H2-F2': C(g('H2'), g('F2'), 'HL', 'rho', 'ci_rho'),
                  'H2-F2*': C(g('H2'), g('F2*'), 'HL', 'rho', 'ci_rho')},
        'L12/b': {'H3': C(g('H3'), S('H3', 'DepG', 'max', '-'), 'HL', 'rho', 'ci_rho'),
                  'H2': C(g('H2'), S('H2', 'DepG', 'max', '-'), 'HL', 'rho', 'ci_rho')},
        'L12/c': {'H3': C(g('H3'), sym('H3'), 'HL', 'rho', 'ci_rho'),
                  'H2': C(g('H2'), sym('H2'), 'HL', 'rho', 'ci_rho')},
        'L12/d': {'H3-WN': C(g('H3'), g('WN'), 'HL', 'rho', 'ci_rho')},
        'L12/control1': {'K3': C(g('H3'), g('K3'), 'HL', 'rho', 'ci_rho'),
                         'S-full*': C(g('H3'), g('S-full*'), 'HL', 'rho', 'ci_rho')},
        'L12/control2': {'W*': C(g('H3'), g('W*'), 'HL', 'rho', 'ci_rho')},
        'L12/control3': {'H3-reversed': C(g('H3'), S('H3', 'Grev', 'max', '-'), 'HL', 'rho', 'ci_rho')},
    }
    for p, inst, metric in (('a', 'BD', 'ap'), ('b', 'WB', 'ap'), ('c', 'BD-dir', 'accuracy')):
        want[f'L13/{p}'] = {'H3-F3': C(g('H3'), g('F3'), inst, metric, 'ci_cluster'),
                            'H3-F3*': C(g('H3'), g('F3*'), inst, metric, 'ci_cluster'),
                            'H2-F2': C(g('H2'), g('F2'), inst, metric, 'ci_cluster'),
                            'H2-F2*': C(g('H2'), g('F2*'), inst, metric, 'ci_cluster')}
        want[f'L13/control1/{p}'] = {'K3': C(g('H3'), g('K3'), inst, metric, 'ci_cluster'),
                                     'S-full*': C(g('H3'), g('S-full*'), inst, metric, 'ci_cluster'),
                                     'W*': C(g('H3'), g('W*'), inst, metric, 'ci_cluster')}
    want['L14/a'] = {'d2/random': C(LG, EG, 'HIT-test', 'rr-random', 'ci_mean'),
                     'd2/hard': C(LG, EG, 'HIT-test', 'rr-hard', 'ci_mean'),
                     'd3/random': C(LG, EG, 'HIT-test', 'rr-random', 'ci_mean'),
                     'd3/hard': C(LG, EG, 'HIT-test', 'rr-hard', 'ci_mean')}
    want['L14/b'] = {'d2': C(LGm, EGm, 'HL-at', 'rho', 'ci_rho'), 'd3': C(LGm, EGm, 'HL-at', 'rho', 'ci_rho')}
    c3 = {}
    for d in (2, 3):
        for geo in ('lorentz', 'euclid'):
            true_rr, shuf_rr = S(geo, 'G', '-', 'measured'), S(geo, 'G', '-', 'edge-shuffled')
            true_r, shuf_r = S(geo, 'G', 'max', 'measured'), S(geo, 'G', 'max', 'edge-shuffled')
            c3[f'd{d}/rr_random/{geo}'] = C(true_rr, shuf_rr, 'HIT-test', 'rr-random', 'ci_mean')
            c3[f'd{d}/rr_hard/{geo}'] = C(true_rr, shuf_rr, 'HIT-test', 'rr-hard', 'ci_mean')
            c3[f'd{d}/rho/{geo}'] = C(true_r, shuf_r, 'HL-at', 'rho', 'ci_rho')
    want['L14/control3'] = c3
    want['L15/a'] = {}
    want['L15/control1'] = {}
    for st in ('SL', 'MEN'):
        want['L15/a'].update({f'{st}/H3-F3': C(sym('H3'), sym('F3'), st, 'rho', 'ci_rho'),
                              f'{st}/H3-F3*': C(sym('H3'), sym('F3*'), st, 'rho', 'ci_rho'),
                              f'{st}/H2-F2': C(sym('H2'), sym('F2'), st, 'rho', 'ci_rho'),
                              f'{st}/H2-F2*': C(sym('H2'), sym('F2*'), st, 'rho', 'ci_rho')})
        want['L15/control1'].update({f'{st}/K3': C(sym('H3'), sym('K3'), st, 'rho', 'ci_rho'),
                                     f'{st}/S-full*': C(sym('H3'), sym('S-full*'), st, 'rho', 'ci_rho'),
                                     f'{st}/W*': C(sym('H3'), sym('W*'), st, 'rho', 'ci_rho')})
    want['L15/b'] = {'MEN': C(GLOVE, sym('H3'), 'MEN-glove', 'rho', 'ci_rho'),
                     'WSR': C(GLOVE, sym('H3'), 'WSR-glove', 'rho', 'ci_rho'),
                     'HL': C(sym('H3'), GLOVE, 'HL-glove', 'rho', 'ci_rho')}
    assert RS.DECISION_SPEC == want
    assert sum(len(v) for v in RS.DECISION_SPEC.values()) == 69


def test_control_spec_is_amendment_13_term_by_term():
    """A13's controls: L12 control 4, the 20 gold permutations of H3, H2, F3, F3*, F2, F2* and WN on HL; L13 control 2,
    the six arms' AP over 20 label permutations on BD and WB (π + 1/50), control 3 Sym on H3 (BD-dir) and GloVe
    (BD-dir within its vocabulary), accuracy exactly 0; L14 control 1 the within-row label on every trained table
    (tuning, measured, edge-shuffled), control 2 the relabelled macro mean on the same tables (H₁₁/11 + 1/50), control 4
    each measured table's 20 gold permutations on HL-at, the closure check RR = 1 in both settings; L15 control 2 every
    arm and set (SL and MEN: the six arms, K3, S-full and W with Sym; (b)'s sets: H3 with Sym and GloVe), control 3
    GloVe's vectors permuted on each set of (b)."""
    tables = (S('*', 'G', '-', 'tuning'), S('*', 'G', '-', 'measured'), S('*', 'G', '-', 'edge-shuffled'))
    glove_sets = ('MEN-glove', 'WSR-glove', 'HL-glove')
    want = {
        'L12/control4': B((g('H3'), g('H2'), g('F3'), g('F3*'), g('F2'), g('F2*'), g('WN')), ('HL',), 'rho', 'gold',
                          'gold'),
        'L13/control2': B((g('H3'), g('H2'), g('F3'), g('F3*'), g('F2'), g('F2*')), ('BD', 'WB'), 'ap', 'labels',
                          'label'),
        'L13/control3': B((sym('H3'), GLOVE), ('BD-dir', 'BD-dir-glove'), 'accuracy', '-', 'zero'),
        'L14/control1': B(tables, ('HIT-test',), 'rr-random', 'within-row label', 'rr'),
        'L14/control2': B(tables, ('HIT-test',), 'macro-rr-random', 'point labels', 'rr'),
        'L14/control4': B((S('*', 'G', 'max', 'measured'),), ('HL-at',), 'rho', 'gold', 'gold'),
        'L14/closure': B((S('closure of E', '-', '-', '-'),), ('HIT-test',), 'rr-random rr-hard', '-', 'one'),
        'L15/control2/a': B((sym('H3'), sym('H2'), sym('F3'), sym('F3*'), sym('F2'), sym('F2*'), sym('K3'),
                             sym('S-full_i'), sym('W_i')), ('SL', 'MEN'), 'rho', 'gold', 'gold'),
        'L15/control2/b': B((sym('H3'), GLOVE), glove_sets, 'rho', 'gold', 'gold'),
        'L15/control3': B((S('GloVe-vec_i', 'cos', '-', '-'),), glove_sets, 'rho', 'vectors', 'gold'),
    }
    assert RS.CONTROL_SPEC == want
    # the permutation seeds of the bands are A13.12's (registered values pinned as constants only)
    assert {k: getattr(RS.REGISTERED, v) for k, v in RS.BAND_SEEDS.items()} == {
        ('L12/control4', 'HL'): 2440, ('L13/control2', 'BD'): 2460, ('L13/control2', 'WB'): 2480,
        ('L14/control4', 'HL-at'): 2640, ('L15/control2/a', 'SL'): 2500, ('L15/control2/a', 'MEN'): 2520,
        ('L15/control2/b', 'MEN-glove'): 2520, ('L15/control2/b', 'WSR-glove'): 2540,
        ('L15/control2/b', 'HL-glove'): 2560}


def test_spec_is_rebuilt_from_amendment_13s_text():
    """spec_from_a13 finds every sentence it quotes in A13 (the pinned protocol file) and parses from them exactly the
    constants: check_spec is empty, and the parse does not lean on the constants."""
    d, c, problems = RS.spec_from_a13()
    assert problems == []
    assert d == RS.DECISION_SPEC and c == RS.CONTROL_SPEC
    assert RS.check_spec() == []
    a13 = RS.a13_text()
    assert a13.startswith('### Amendment 13 ') and '#### L15 ·' in a13
    assert S2D.protocol_text().endswith(a13)                    # the pinned file holds A13 as PREREGISTRATION.md does


@pytest.mark.parametrize('old, new, group', [
    ('ρ(H3) − ρ(F3), ρ(H3) − ρ(F3\\*), ρ(H2) − ρ(F2) and ρ(H2) − ρ(F2\\*) all lie above 0',
     'ρ(F3) − ρ(H3), ρ(H3) − ρ(F3\\*), ρ(H2) − ρ(F2) and ρ(H2) − ρ(F2\\*) all lie above 0', 'L12/a'),
    ('RR(Lorentz) − RR(Euclidean), with `rank.ci_mean`', 'RR(Euclidean) − RR(Lorentz), with `rank.ci_mean`', 'L14/a'),
    ('ρ(Lorentz) − ρ(Euclidean) with the word-level ci_rho', 'ρ(Lorentz) − ρ(Euclidean) with the row-level ci_rho',
     'L14/b'),
    ('the interval of true − shuffled (item 10.6)', 'the interval of shuffled − true (item 10.6)', 'L14/control3'),
    ('each with its ci_cluster interval', 'each with its word-level ci_rho interval', 'L13/a'),
    ('ρ(GloVe) − ρ(H3) lies above 0 on MEN and on WSR', 'ρ(H3) − ρ(GloVe) lies above 0 on MEN and on WSR', 'L15/b'),
])
def test_check_spec_catches_a_changed_text(old, new, group):
    """A text that states another term, order or interval gives another spec (or misses a quoted sentence), and
    check_spec names the group."""
    text = RS.a13_text()
    assert text.count(old) == 1
    problems = RS.check_spec(text.replace(old, new))
    assert problems and any(group in p or 'not in A13' in p for p in problems)


@pytest.mark.parametrize('old, new', [
    ('Sym on H3, and GloVe on the BD-dir rows', 'Sym on H2, and GloVe on the BD-dir rows'),
    ('For each measured table, |mean ρ', 'For each tuning table, |mean ρ'),
    ('row in both settings.', 'row in the random setting.'),
    ('(b) H3 with Sym, and GloVe', '(b) H2 with Sym, and GloVe'),
    ('MEN 0.0250; WSR and HL within GloVe', 'MEN 0.0250; WSR and SL within GloVe'),
    ('For each set of (b), its distinct', 'For each set of (a), its distinct'),
])
def test_a_changed_control_sentence_is_caught(old, new):
    """Each control sentence the parse reads must occur in A13 as quoted: a text that states it otherwise is refused."""
    text = RS.a13_text()
    assert text.count(old) == 1
    assert any('not in A13' in p for p in RS.check_spec(text.replace(old, new)))


def test_controls_are_parsed_from_their_sentences():
    """The control groups the first spec held as constants are parsed from A13's sentences (the gap list's
    "hard-coded groups"), so that the text's terms, not a second copy of the constants, give them: L13 control 3's arm,
    form and set, L14 control 4's tables and the part it voids, the closure check's settings, L15 control 2's arms and
    sets (its parenthesis checked against (a)'s and (b)'s decisions) and L15 control 3's sets."""
    cs = RS.CONTROL_SPEC
    sym = 'Sym on H3, and GloVe on the BD-dir rows in its vocabulary, give a direction accuracy of exactly 0'
    assert RS.parse_symmetric_control(sym, 'BD-dir', 'max') == cs['L13/control3']
    assert RS.parse_symmetric_control(sym.replace('H3', 'H2'), 'BD-dir', 'max').sides[0] == RS.Side('H2', 'Sym', 'max',
                                                                                                    '-')
    assert RS.parse_symmetric_control(sym.replace('Sym on', 'G on'), 'BD-dir', 'max').sides[0].form == 'G'
    assert RS.parse_symmetric_control(sym.replace('BD-dir', 'BD'), 'BD-dir', 'max') is None
    b = RS.DECISION_SPEC['L14/b']['d2']
    g4 = ('4. *Gold shuffled.* For each measured table, |mean ρ over 20 gold permutations| ≤ 5/√(20·2,152) = 0.0241. '
          'Otherwise (b) is void.')
    assert RS.parse_table_gold_control(g4, b) == cs['L14/control4']
    assert RS.parse_table_gold_control(g4.replace('measured', 'tuning'), b).sides[0].table == 'tuning'
    assert RS.parse_table_gold_control(g4.replace('(b) is void', '(a) is void'), b) is None
    a = RS.DECISION_SPEC['L14/a']['d2/random']
    cl = 'gives RR = 1 on every row in both settings.'
    assert RS.parse_closure_check(cl, a, ['random', 'hard']) == cs['L14/closure']
    assert RS.parse_closure_check(cl.replace('both settings', 'the random setting'), a, ['random', 'hard']).metric is None
    arms = ('(a) H3, H2, F3, F3\\*, F2 and F2\\* with Sym (exact rational keys; no decimal step), and the controls K3, '
            'S-full and W on H3 with Sym. (b) H3 with Sym, and GloVe')
    band = ("For every arm and set, |mean ρ over 20 gold permutations| ≤ 5/√(20(n − 1)) with the set's n (SL 0.0434, "
            "MEN 0.0250; WSR and HL within GloVe from their frozen counts).")
    ba, bb, problems = RS.parse_gold_controls_l15(RS._ws(arms), band, 'Sym', 'max', ['SL', 'MEN'], ['MEN', 'WSR', 'HL'])
    assert (ba, bb, problems) == (cs['L15/control2/a'], cs['L15/control2/b'], [])
    ba, bb, _ = RS.parse_gold_controls_l15(RS._ws(arms).replace('controls K3, S-full and W', 'controls K3 and W'), band,
                                           'Sym', 'max', ['SL', 'MEN'], ['MEN', 'WSR', 'HL'])
    assert RS.Side('S-full_i', 'Sym', 'max', '-') not in ba.sides
    _, bb, _ = RS.parse_gold_controls_l15(RS._ws(arms).replace('(b) H3 with', '(b) H2 with'), band, 'Sym', 'max',
                                          ['SL', 'MEN'], ['MEN', 'WSR', 'HL'])
    assert bb.sides[0] == RS.Side('H2', 'Sym', 'max', '-')
    _, _, problems = RS.parse_gold_controls_l15(RS._ws(arms), band.replace('WSR and HL within', 'WSR and SL within'),
                                                'Sym', 'max', ['SL', 'MEN'], ['MEN', 'WSR', 'HL'])
    assert any('L15 control 2 names' in p and "'SL'" in p for p in problems)
    _, _, problems = RS.parse_gold_controls_l15(RS._ws(arms), band.replace('MEN 0.0250;', 'WSR 0.0250;'), 'Sym', 'max',
                                                ['SL', 'MEN'], ['MEN', 'WSR', 'HL'])
    assert any("names the sets ['SL', 'WSR'] of (a)" in p for p in problems)
    vec = 'For each set of (b), its distinct covered words in code-point order are permuted'
    assert RS.parse_vector_control(vec, cs['L15/control2/b'].insts) == cs['L15/control3']
    assert RS.parse_vector_control(vec.replace('(b)', '(a)'), cs['L15/control2/b'].insts) is None


def _swapped(comp):
    return comp._replace(x=comp.y, y=comp.x)


@pytest.mark.parametrize('mutate, group', [
    (lambda sp: sp['L14/a'].update({k: _swapped(v) for k, v in sp['L14/a'].items()}), 'L14/a'),     # Lorentz/Euclid
    (lambda sp: sp['L12/a'].update({'H3-F3': _swapped(sp['L12/a']['H3-F3'])}), 'L12/a'),            # H3/F3
    (lambda sp: sp['L12/d'].update({'H3-WN': sp['L12/d']['H3-WN']._replace(interval='ci_rho_rows')}), 'L12/d'),
    (lambda sp: sp['L14/control3'].update({k: v._replace(y=v.x) for k, v in sp['L14/control3'].items()}),
     'L14/control3'),
    (lambda sp: sp['L13/c'].update({k: v._replace(inst='BD') for k, v in sp['L13/c'].items()}), 'L13/c'),
    (lambda sp: sp['L15/b'].update({'HL': _swapped(sp['L15/b']['HL'])}), 'L15/b'),
])
def test_check_spec_catches_changed_constants(monkeypatch, mutate, group):
    """A runner whose constants differ from A13's text in a term, an order, an interval, a table kind or an instance
    is refused before anything is scored (step_decisive calls check_spec)."""
    sp = {k: dict(v) for k, v in RS.DECISION_SPEC.items()}
    mutate(sp)
    monkeypatch.setattr(RS, 'DECISION_SPEC', sp)
    problems = RS.check_spec()
    assert problems == [f"DECISION_SPEC['{group}'] differs from A13's text"]


def test_check_spec_catches_a_changed_control(monkeypatch):
    cs = dict(RS.CONTROL_SPEC)
    cs['L12/control4'] = cs['L12/control4']._replace(sides=cs['L12/control4'].sides[:-1])     # WN dropped
    monkeypatch.setattr(RS, 'CONTROL_SPEC', cs)
    assert RS.check_spec() == ["CONTROL_SPEC['L12/control4'] differs from A13's text"]


def test_parse_diffs_and_arm_lists():
    assert RS.parse_diffs('the intervals of ρ(H3) − ρ(K3) and ρ(H3) − ρ(S-full\\*) lie above 0') == [
        ('H3', 'K3'), ('H3', 'S-full*')]
    assert RS.parse_diffs('The interval of ρ(H3 read as Φ_G(x, y)) − ρ(H3 read as Φ_G(y, x)) lies') == [
        ('H3 read as Φ_G(x, y)', 'H3 read as Φ_G(y, x)')]
    assert RS.parse_diffs('the intervals of H3 − K3, H3 − S-full\\* and H3 − W\\* lie above 0.') == [
        ('H3', 'K3'), ('H3', 'S-full*'), ('H3', 'W*')]
    assert RS.parse_diffs('differences RR(Lorentz) − RR(Euclidean), with') == [('Lorentz', 'Euclidean')]
    assert RS.parse_diffs('the interval of true −\n shuffled (item 10.6)') == [('true', 'shuffled')]
    assert RS.parse_diffs('if ρ(G) − ρ(Dep°) lies above 0') == [('G', 'Dep°')]
    assert RS.parse_diffs('no difference here (n − 1)') == [('n', '1')]
    assert RS.parse_arm_list('H3, H2, F3, F3\\*, F2, F2\\* and WN') == ['H3', 'H2', 'F3', 'F3*', 'F2', 'F2*', 'WN']
    assert RS.interval_of('with its word-level ci_rho interval') == 'ci_rho'
    assert RS.interval_of('with `rank.ci_mean` over the rows') == 'ci_mean'
    with pytest.raises(ValueError):
        RS.interval_of('with an interval')


def test_decided_cells_are_the_specs():
    """exact_plan's decided code files (claims L12/1, L13/1, L15/1) are exactly decided_exact_cells's, which reads them
    from the two constants; the S-full*, W* sides and the families take every permutation."""
    cells = RS.decided_exact_cells(range(20))
    assert len(cells) == len(set(cells)) == 356
    got = {(a, i, f, r) for a, i, f, r, _ in cells}
    assert {(f'S-full-{i}', 'HL', 'G', 'max') for i in range(20)} <= got
    assert {(f'W-{i}', 'BD-dir', 'G', 'max') for i in range(20)} <= got
    assert {(f'GloVe-vec-{i}', 'HL-glove', 'cos', '-') for i in range(20)} <= got
    assert ('H3', 'BD-dir', 'Sym', 'max') in got and ('GloVe-300', 'BD-dir-glove', 'cos', '-') in got
    assert ('H3', 'HL', 'Grev', 'max') in got and ('WN', 'HL', 'G', 'max') in got
    assert not any(a.startswith(('lorentz', 'euclid', '*', 'closure')) for a, _, _, _ in got)
    claims = {(a, i): c for a, i, _, _, c in cells}
    assert claims[('K3', 'SL')] == 'L15/1' and claims[('K3', 'WB')] == 'L13/1' and claims[('K3', 'HL')] == 'L12/1'


# ================================================================ the L12 grid (A13.11)
def test_l12_grid_cells():
    """1,344 cells: L12's 48 arms (the six exact trees, K3, WN, and each S-full_i and W_i, i < 20) x 7 scores x 4 sense
    rules; each scored, an alias of a scored cell, or n/a (READING stage2-runner-34, Amendment 14 items 5 and 6); NK17
    on every geometric arm (Poincaré norms on H3, H2, K3, S-full_i and W_i, Euclidean norms on the exact flat arms:
    READING stage2-runner-25). 716 scored: the 116 of the eight arms before Amendment 14 and 15 per new arm."""
    grid = RS.L12_GRID
    perm_arms = tuple(f'S-full-{i}' for i in range(20)) + tuple(f'W-{i}' for i in range(20))
    assert RS.L12_GRID_PERMS == RS.REGISTERED.perms == RS.DRY.perms == RS.SELFTEST_SEEDS.perms == 20
    assert RS.L12_GRID_PERM_ARMS == perm_arms
    assert RS.L12_GRID_ARMS == RS.SIX + ('K3', 'WN') + perm_arms
    assert set(perm_arms) <= set(RS.l15_control2_arms(range(20)))     # the names L15 control 2 and the wiring use
    assert len(grid) == 48 * 7 * 4 == 1344
    status = {k: v[0] for k, v in grid.items()}
    assert sum(1 for v in status.values() if v == 'scored') == 716 == 116 + 15 * 40
    assert sum(1 for v in status.values() if v == 'alias') == 432 == 72 + 9 * 40
    assert sum(1 for v in status.values() if v == 'n/a') == 196 == 36 + 4 * 40
    old = RS.SIX + ('K3', 'WN')
    assert sum(1 for (a, _, _), v in status.items() if a in old and v == 'scored') == 116
    # each S-full_i and W_i places words on H3's points: every form reads it as it reads K3
    for arm in perm_arms:
        assert {(f, r): grid[(arm, f, r)] for f in RS.L12_GRID_FORMS for r in RS.L12_GRID_RULES} == \
            {(f, r): grid[('K3', f, r)] for f in RS.L12_GRID_FORMS for r in RS.L12_GRID_RULES}
        assert sum(1 for f in RS.L12_GRID_FORMS for r in RS.L12_GRID_RULES if status[(arm, f, r)] == 'scored') == 15
    for (arm, form, rule), (st, detail) in grid.items():
        if st == 'alias':
            assert grid[(arm,) + tuple(detail)][0] == 'scored', (arm, form, rule)
    for arm in RS.L12_GRID_ARMS:
        for form in RS.L12_GRID_FORMS:
            if status[(arm, form, 'max')] != 'n/a':
                assert grid[(arm, form, 'morphy')] == ('alias', (form, 'max'))
    # the cells the task names: Dep and Sym under first senses (F arms, WN); gensim's rule for Dep, NK17, product
    for arm in ('F3', 'F3*', 'F2', 'F2*', 'WN'):
        assert status[(arm, 'Dep', 'first')] == status[(arm, 'Sym', 'first')] == 'scored'
    for arm in RS.SIX + ('WN',):
        assert status[(arm, 'Dep', 'gensim')] == status[(arm, 'G', 'gensim')] == 'scored'
    for arm in RS.SIX + ('K3',):
        assert {status[(arm, f, r)] for f in ('NK17', 'product') for r in ('max', 'first', 'gensim')} == {'scored'}
        assert {status[(arm, f, r)] for f in ('G', 'Sym', 'DepG', 'Dep') for r in ('max',)} == {'scored'}
        assert status[(arm, 'LCh', 'max')] == 'n/a'
    assert status[('WN', 'product', 'max')] == status[('WN', 'NK17', 'first')] == status[('H3', 'LCh', 'max')] == 'n/a'
    assert grid[('WN', 'LCh', 'gensim')] == ('alias', ('LCh', 'max'))
    assert grid[('H2', 'Sym', 'gensim')] == ('alias', ('Sym', 'max'))
    assert grid[('F3', 'DepG', 'first')] == ('alias', ('Dep', 'first'))
    assert grid[('WN', 'DepG', 'gensim')] == ('alias', ('Dep', 'gensim'))
    assert status[('WN', 'LCh', 'first')] == status[('WN', 'DepG', 'max')] == status[('F2*', 'DepG', 'max')] == 'scored'
    for arm in ('S3-0', 'S3-4', 'WN-U', 'ST', 'letter'):    # S3's 5 and the chain's 3 stay at G with the maximum
        with pytest.raises(ValueError):
            RS.l12_grid_cell(arm, 'G', 'max')
    for arm in ('S-full-20', 'W-20', 'S-full', 'W', 'GloVe-300', 'GloVe-vec-0'):    # i < 20 only; no other arm
        with pytest.raises(ValueError):
            RS.l12_grid_cell(arm, 'G', 'max')
    assert RS.l12_grid_cell('S-full-0', 'NK17', 'gensim') == RS.l12_grid_cell('W-19', 'product', 'first') == \
        ('scored', None)
    assert RS.l12_grid_cell('W-0', 'LCh', 'max')[0] == 'n/a'


@pytest.fixture(scope='module')
def synth(tmp_path_factory):
    cfg = RS.make_cfg('selftest', 1, out=str(tmp_path_factory.mktemp('spec') / 'st'))
    world = RS.World(cfg)
    insts = RS.build_instances(cfg, world, lambda m: None)
    return cfg, world, insts


def test_l12_grid_scores_and_its_aliases_hold(synth):
    """On the synthetic world's HL rows: every scored cell of the grid has a pair_value; the aliases are equal by
    definition (Sym and WN-LCh under gensim's rule = the maximum; Dep° under first senses and gensim's rule = Dep under
    that rule; morphy = the maximum: every pair-set word is in the index raw); gensim's rule is never first senses in
    disguise (NK17 and product follow the gensim pair); a rule an arm does not define is refused."""
    cfg, world, insts = synth
    hl = insts['HL']
    U = world.U_full
    assert all(SE.N_S(w) in world.index for _, x, y in hl.rows for w in (x, y))           # morphy changes no row
    cert = SC.Certifier()
    for arm in RS.L12_GRID_ARMS:
        ac = RS.arm_ctx(cfg, world, arm)
        for _, x, y in hl.rows:
            sx, sy = ac.senses(x, U, world), ac.senses(y, U, world)
            vals = {}
            for (a, form, rule), (st, _) in RS.L12_GRID.items():
                if a == arm and st == 'scored':
                    vals[(form, rule)] = RS.pair_value(ac, form, rule, sx, sy, cert)
            if ac.kind == 'geo':
                sc = ac.scorer
                gp = sc.gensim_pair(sx, sy)
                assert sc.t.sym_key(*gp) == vals[('Sym', 'max')]                               # Sym gensim = max
                fd, gd = vals[('Dep', 'first')], vals[('Dep', 'gensim')]
                assert fd.tup == sc.t.dep_tuple(sx[0], sy[0]) and gd.tup == sc.t.dep_tuple(*gp)
                assert vals[('G', 'first')].tup == sc.t.g_tuple(sx[0], sy[0])                  # first G's pair
                assert vals[('G', 'gensim')].tup == sc.t.g_tuple(*gp)                          # gensim G's pair
                assert vals[('product', 'gensim')] == SC.product_value(ac.table, *gp)
                assert vals[('product', 'first')] == SC.product_value(ac.table, sx[0], sy[0])
                assert vals[('NK17', 'gensim')] == SC.nk17_value(ac.table, *gp)
                assert vals[('NK17', 'first')] == SC.nk17_value(ac.table, sx[0], sy[0])
            else:
                wsc = SC.WNScorer(ac.graph)
                gp = wsc.gensim_pair(sx, sy)
                assert -ac.graph.lch_p(*gp) == vals[('LCh', 'max')]                            # LCh gensim = max
                assert vals[('Dep', 'gensim')] == ac.graph.dep(*gp) and vals[('G', 'gensim')] == ac.graph.g(*gp)
                assert vals[('LCh', 'first')] == -ac.graph.lch_p(sx[0], sy[0])
                assert vals[('Sym', 'first')] == ac.graph.sym(sx[0], sy[0])
    h3, f3, wn = (RS.arm_ctx(cfg, world, a) for a in ('H3', 'F3', 'WN'))
    _, x, y = hl.rows[0]
    sx, sy = h3.senses(x, U, world), h3.senses(y, U, world)
    for ac, form, rule in ((h3, 'Sym', 'gensim'), (h3, 'DepG', 'first'), (h3, 'NK17', 'morphy'), (wn, 'LCh', 'gensim'),
                           (wn, 'Sym', 'gensim'), (RS.arm_ctx(cfg, world, 'letter'), 'G', 'first'),
                           (RS.arm_ctx(cfg, world, 'WN-U'), 'G', 'gensim')):
        with pytest.raises(ValueError):
            RS.pair_value(ac, form, rule, sx, sy, cert)
    with pytest.raises(ValueError):
        RS.pair_value(wn, 'NK17', 'max', sx, sy, cert)                  # WN has no geometry
    assert isinstance(RS.pair_value(f3, 'NK17', 'max', sx, sy, cert), Decimal)   # Euclidean norms (READING 25)


def test_wn_gensim_pair_takes_the_least_path_first():
    """gensim's rule on WN (READING stage2-runner-35): the pair of the least WN-path p, ties to the first in (i, j)
    order; G_WN and Dep_WN of that pair."""
    # r <- a <- a1 ; r <- b <- b1 ; a <- c (c's parents: a); t1 under b
    parents = {'r': (), 'a': ('r',), 'b': ('r',), 'a1': ('a',), 'b1': ('b',), 'c': ('a',), 't1': ('b',)}
    G = WG.WNGraph(parents, 'r')
    sc = SC.WNScorer(G)
    assert G.path('a1', 'c') == 2 and G.path('a1', 'b1') == 4 and G.path('a1', 't1') == 4
    assert sc.gensim_pair(['a1'], ['b1', 'c']) == ('a1', 'c')
    assert sc.gensim_pair(['a1'], ['b1', 't1']) == ('a1', 'b1')                     # a tie: the first pair
    assert sc.gensim_pair(['b1', 'a1'], ['t1', 'c']) == ('b1', 't1')               # p 2 at (0, 0) beats (1, 1)
    assert sc.gensim_g(['a1'], ['b1', 'c']) == G.g('a1', 'c') and sc.gensim_dep(['a1'], ['c']) == G.dep('a1', 'c')


# ================================================================ pass 1's WordNet bits (closure, E edges)
def test_bits_files_hold_wordnets_closure_and_edges(synth):
    """closure_bits (every scored word-pair instance, senses in its universe: A13.11's "the closure membership of every
    scored pair") and edge_bits (HL-at) against a brute force over WordNet, written by write_bits_files as pass-1 'dir'
    code files and read back by read_codes after their SHA-256 check; the files carry no metric."""
    cfg, world, insts = synth
    g, at = world.wn_graph, world.at
    closure = RS.closure_bits(cfg, world, insts)
    edges = RS.edge_bits(cfg, world, insts)
    word_pair = {n for n, i in insts.items() if i.kind != 'hit' and i.rows}
    assert set(closure) == word_pair and {'HL', 'BD', 'WB', 'LEDS-test', 'HL-at', 'SL', 'MEN-glove'} <= word_pair
    assert set(edges) == {'HL-at'}
    for name, (fw, rv) in closure.items():
        rows = insts[name].rows
        U = world.universe(insts[name].universe)
        assert len(fw) == len(rv) == len(rows)
        for (_, x, y), a, b in zip(rows, fw, rv):
            sx, sy = (SE.senses(w, U, world.wn, world.pos) for w in (x, y))
            assert a == any(t != s and g.in_closure(s, t) for s in sx for t in sy)
            assert b == any(t != s and g.in_closure(s, t) for s in sy for t in sx)
    fw, rv = edges['HL-at']
    for (_, x, y), a, b in zip(insts['HL-at'].rows, fw, rv):
        sx, sy = (SE.senses(w, world.U_at, world.wn, world.pos) for w in (x, y))
        assert a == any(t in at.parents[s] for s in sx for t in sy)
        assert b == any(s in at.parents[t] for s in sx for t in sy)
    assert any(fw) and any(any(f) for f, _ in closure.values())
    files = RS.write_bits_files(cfg, insts, closure, edges)
    assert set(files) == {RS.bits_fkey(n, 'closure') for n in closure} | {RS.bits_fkey('HL-at', 'edge')}
    assert RS.bits_fkey('HL', 'closure') == 'HL/WN/closure/any/-'
    for fk, f in files.items():
        assert f['bits'] in ('closure', 'edge') and f['kind'] == 'dir' and f['vtype'] == 'bits'
        cf, cr = RS.read_codes(cfg, f)
        src = closure.get(f['inst']) if f['bits'] == 'closure' else edges['HL-at']
        assert cf == [int(v) for v in src[0]] and cr == [int(v) for v in src[1]]
    assert 'edge_bits' in RS.PASS1 and 'write_bits_files' in RS.PASS1 and RS.pass1_gold_references() == {}


def test_plan_holds_the_new_report_cells(synth):
    """exact_plan (reported): every scored cell of the L12 grid on HL; GloVe 300-d on BD-glove and WB-glove; WN-LCh
    with WN-path on SL, WSS, WSC and WSR; the decided cells unchanged."""
    cfg, world, insts = synth
    jobs = RS.exact_plan(cfg, insts)
    outs = {(j['arm'], j['inst'], f, r): j['claims'][f'{f}/{r}'] for j in jobs for f, r in j['outputs']}
    for (arm, form, rule), (st, _) in RS.L12_GRID.items():
        assert ((arm, 'HL', form, rule) in outs) == (st == 'scored'), (arm, form, rule)
    # Amendment 14 item 6: 600 scored cells of S-full_i and W_i on HL, 560 of them new code files (each arm's G with the
    # maximum is a decided cell, planted once under its decision's claim)
    new = {(a, 'HL', f, r) for (a, f, r), (st, _) in RS.L12_GRID.items()
           if st == 'scored' and a in RS.L12_GRID_PERM_ARMS}
    hl_decided = {(a, i, f, r) for a, i, f, r, _ in RS.decided_exact_cells(range(cfg.seeds.perms)) if i == 'HL'}
    assert len(new) == 600 and new <= set(outs) and len(new - hl_decided) == 560
    assert new & hl_decided == {(a, 'HL', 'G', 'max') for a in RS.L12_GRID_PERM_ARMS}
    assert all(outs[k] == 'stage2/1' for k in new - hl_decided) and all(outs[k] != 'stage2/1' for k in new & hl_decided)
    assert {j['arm'] for j in jobs if j['inst'] == 'HL'} >= set(RS.L12_GRID_ARMS)
    for st in ('BD-glove', 'WB-glove'):
        assert outs[('GloVe-300', st, 'cos', '-')] == 'stage2/1'
        assert insts[st].glove and insts[st].rows and len(insts[st].clusters) == len(insts[st].rows)
    assert insts['BD-glove'].pair_rows == insts['BD-dir-glove'].pair_rows
    for st in ('SL', 'WSS', 'WSC', 'WSR'):
        assert ('WN', st, 'LCh', 'max') in outs and ('WN', st, 'Sym', 'max') in outs
    decided = {(a, i, f, r): c for a, i, f, r, c in RS.decided_exact_cells(range(cfg.seeds.perms))}
    for k, c in decided.items():
        if k[1] in insts and insts[k[1]].rows:
            assert outs[k] == c, k
    assert outs[('H3', 'HL', 'G', 'max')] == 'L12/1' and outs[('H3', 'HL', 'NK17', 'gensim')] == 'stage2/1'


def test_disk_projection_counts_the_new_grid_cells(synth, monkeypatch):
    """READING stage2-runner-47 (the disk projection counts the decisive run's exact-arm code lines, plan_lines of
    exact_plan, in the timing step and the decisive pre-flight): the 560 new code files of S-full_i and W_i on HL add
    560 x |HL| lines against the grid of 841b90c (8 arms), and nothing else of the plan moves; a configuration with
    another number of permutations than the grid's 20 is refused rather than planned short."""
    cfg, world, insts = synth
    jobs = RS.exact_plan(cfg, insts)
    old_grid = {k: v for k, v in RS.L12_GRID.items() if k[0] not in RS.L12_GRID_PERM_ARMS}
    assert len(old_grid) == 224
    monkeypatch.setattr(RS, 'L12_GRID', old_grid)
    old_jobs = RS.exact_plan(cfg, insts)
    files = {(j['arm'], j['inst'], f, r) for j in jobs for f, r in j['outputs']}
    old_files = {(j['arm'], j['inst'], f, r) for j in old_jobs for f, r in j['outputs']}
    assert old_files <= files and len(files - old_files) == 560
    assert {(a, i) for a, i, _, _ in files - old_files} == {(a, 'HL') for a in RS.L12_GRID_PERM_ARMS}
    n_hl = len(insts['HL'].rows)
    assert n_hl > 0 and RS.plan_lines(insts, jobs) - RS.plan_lines(insts, old_jobs) == 560 * n_hl
    monkeypatch.setattr(cfg, 'seeds', dataclasses.replace(cfg.seeds, perms=19))
    with pytest.raises(ValueError, match='i < 20'):
        RS.exact_plan(cfg, insts)
