"""run_claims_stage2.py (Amendment 13 items 8, 13-16; build spec sections 9, 11, 12, 14, 16 and tests 3, 16, 18 and
19 of section 13): the runner's rules (refusals, the clean tree, seeds, the disk pre-flight, the budget projection,
settings, LBENCH/1's Stage-2 layout and the claim-field-selected parser), blind two-pass scoring (pass 1 never calls a
gold reader: an import inspection, a monkeypatched spy, and poisoned gold fields giving byte-identical pass-1 files),
the dry sealing, and, marked slow, the self-test end to end in both shapes, its resume and its determinism.

Everything runs on tests/stage2_synth.py's synthetic world (invented words) with seeds 95200 + i only (A13.12): a
guard refuses every other seed of hpstep.prng.Rng, lexicon.stream.Stream, lexicon.pystream.PyStream and numpy's
default_rng and RandomState while these tests run. The one test on WordNet 3.0 and the pinned Stage-2 files (slow)
counts: word-level count checks, pair sets and the instance manifest; it scores nothing.
"""
import gzip
import hashlib
import json
import os
import re
import shutil
import sys
from fractions import Fraction as F

import numpy as np
import pytest

import hpstep.prng as hpstep_prng
import stage2_synth as SY
from lexicon import embed as EM
from lexicon import l6
from lexicon import pystream
from lexicon import senses as SE
from lexicon import stage2data as S2D
from lexicon import stats2 as ST

HERE = os.path.dirname(os.path.abspath(__file__))
REFERENCE = os.path.dirname(HERE)
RESULTS = os.path.join(REFERENCE, 'results')
ALLOWED = range(95200, 95500)

import run_claims_stage2 as RS  # noqa: E402


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    """Every generator refuses a seed outside 95200 + i, i < 300 (a given state is never refused)."""
    from lexicon import stream
    for cls in (hpstep_prng.Rng, stream.Stream, pystream.PyStream):
        init = cls.__init__

        def guarded(self, seed=0, *a, _init=init, **k):
            if k.get('state') is None and not (a and a[0] is not None) and seed not in ALLOWED:
                raise RuntimeError(f'seed {seed}: Stage 2 tests draw 95200 + i only (A13.12)')
            return _init(self, seed, *a, **k)
        monkeypatch.setattr(cls, '__init__', guarded)
    real_default, real_rs = np.random.default_rng, np.random.RandomState

    def default_rng(seed=None):
        if seed not in ALLOWED:
            raise RuntimeError(f'numpy seed {seed} is not a test seed')
        return real_default(seed)

    class GuardedRandomState(real_rs):
        def __init__(self, seed=None):
            if seed not in ALLOWED:
                raise RuntimeError(f'RandomState seed {seed} is not a test seed')
            super().__init__(seed)
    monkeypatch.setattr(np.random, 'default_rng', default_rng)
    monkeypatch.setattr(np.random, 'RandomState', GuardedRandomState)


@pytest.fixture(autouse=True)
def gold_closed():
    S2D.close_gold()
    yield
    S2D.close_gold()


def install_gold_spy(monkeypatch, calls):
    """Every gold reader of stage2data records its call and raises unless pass 2 has opened the gold (A13.8)."""
    for name in S2D.GOLD_READERS:
        if name == 'open_gold':
            continue
        real = getattr(S2D, name)

        def spy(*a, _real=real, _name=name, **k):
            if not S2D.gold_is_open():
                calls.append(_name)
                raise AssertionError(f'pass 1 called the gold reader {_name}')
            return _real(*a, **k)
        monkeypatch.setattr(S2D, name, spy)


# ================================================================ fast: the command line and the rules
@pytest.mark.parametrize('argv', [
    [],                                                  # no step
    ['--tune', '--workers', '0'],
    ['--decisive', '--workers', '5'],                    # four worker processes at most (spec section 0)
    ['--dry', '--tune'],                                 # --dry is the whole dry run, alone
    ['--dry', '--decisive'],
    ['--tune', '--allow-dirty'],                         # registered: refused (A13.15)
    ['--selftest', '--allow-dirty', '--out', '/tmp/x'],
    ['--time', '--out', '/tmp/x'],
    ['--selftest'],                                      # needs --out
    ['--selftest', '--out', os.path.join(RESULTS, 'selftest')],         # never under results/
    ['--selftest', '--out', os.path.join(REFERENCE, 'selftest-out')],   # nor anywhere in the repository
])
def test_refusals(argv, capsys):
    assert RS.main(argv) == 1
    assert 'REFUSED' in capsys.readouterr().err


def test_parsing_steps_need_b_and_i(monkeypatch, capsys):
    """A13.2 ("parsing runs under python3 -B -I with explicit paths"): --time, --dry, --tune and --decisive refuse
    an interpreter without -B and -I before anything runs or is written; under both flags they go on. The self-test,
    which reads only its synthetic world, and --write-settings are not held to it. run_step is replaced, so nothing
    runs here."""
    real = RS.under_b_i
    assert real() == (bool(sys.flags.isolated) and bool(sys.flags.dont_write_bytecode))
    calls = []

    def fake_run_step(cfg, step, world=None):
        calls.append((cfg.mode, step))
        return 0, None
    monkeypatch.setattr(RS, 'run_step', fake_run_step)
    monkeypatch.setattr(RS, 'under_b_i', lambda: False)
    for argv in (['--time'], ['--dry'], ['--dry', '--allow-dirty'], ['--tune'], ['--decisive', '--workers', '2']):
        assert RS.main(argv) == 1
        err = capsys.readouterr().err
        assert 'REFUSED' in err and 'python3 -B -I' in err and ' '.join(argv) in err
    assert calls == []
    monkeypatch.setattr(RS, 'under_b_i', lambda: True)
    assert RS.main(['--tune']) == 0 and RS.main(['--dry']) == 0 and RS.main(['--time']) == 0
    assert calls == [('registered', 'tune'), ('dry', 'tune'), ('dry', 'decisive'), ('registered', 'time')]
    flags = RS.interpreter_flags()
    assert set(flags) >= {'isolated', 'dont_write_bytecode', 'sys_path_0'}
    assert flags['isolated'] == bool(sys.flags.isolated)
    assert flags['dont_write_bytecode'] == bool(sys.flags.dont_write_bytecode)


def test_check_tree_and_outputs():
    rel = RS.REL_REF + '/results/'
    clean = {'head': 'abc', 'status_ok': True, 'changed': []}
    assert RS.check_tree('registered', 'tune', clean, False) is None
    tun = dict(clean, changed=[rel + 'tuning-stage2.json', rel + 'stage2-tuning-console.txt'])
    assert RS.check_tree('registered', 'tune', tun, False) is None
    with pytest.raises(RS.Refused):                      # tuning's outputs are not the decisive run's
        RS.check_tree('registered', 'decisive', tun, False)
    dec = dict(clean, changed=[rel + 'claims-stage2.json', rel + 'stage2-codes/HL__H3__G__max__-.tsv.gz',
                               rel + 'stage2-tables/measured-lorentz-d2-lr1-s0.snap.txt.gz'])
    assert RS.check_tree('registered', 'decisive', dec, False) is None
    other = dict(clean, changed=[RS.REL_REF + '/lexicon/stats2.py'])
    for step in ('time', 'tune', 'decisive'):
        with pytest.raises(RS.Refused):
            RS.check_tree('registered', step, other, False)
    dry = dict(clean, changed=[rel + 'dry/claims-stage2.json', rel + 'dry/settings-stage2.json'])
    assert RS.check_tree('dry', 'decisive', dry, False) is None
    assert RS.check_tree('dry', 'tune', other, True) == 'development run: not a registered run'
    with pytest.raises(RS.Refused):
        RS.check_tree('registered', 'tune', other, True)     # --allow-dirty is the dry run's only
    assert RS.check_tree('selftest', 'decisive', other, False).startswith('selftest')
    ws = dict(clean, changed=[RS.REL_REF + '/settings-stage2.json', RS.REL_SYS + '/PREREGISTRATION.md'])
    assert RS.check_tree('registered', 'write-settings', ws, False) is None
    path = dict(clean, sys_path_outside_scope=['Pages/Other/reference'])
    with pytest.raises(RS.Refused, match='sys.path'):
        RS.check_tree('registered', 'decisive', path, False)
    assert RS.GIT_SCOPE == ('Pages/Hyperbolic Lexicon', 'Pages/Hyperbolic Oracles/reference',
                            'Pages/Engram Minds Eye/reference')


def test_registered_steps_refuse_without_the_definitions_amendment(monkeypatch, tmp_path, capsys):
    """Registered tuning and the decisive run refuse until an amendment after 13 holds the instance manifest's SHA-256
    (A13.2, A13.15 step 4); tuning also needs a timing projection within 11 h (A13.16)."""
    monkeypatch.setattr(RS.P4, 'git_state', lambda: {'head': 'abc', 'status_ok': True, 'changed': [],
                                                      'clean': True, 'sys_path_outside_scope': []})
    cfg = RS.make_cfg('registered', 2)
    cfg.results = str(tmp_path / 'results')
    with pytest.raises(RS.Refused, match='definitions amendment'):
        RS.start(cfg, 'decisive', str(tmp_path / 'console.txt'))
    text = open(S2D.PREREGISTRATION, encoding='utf-8').read()
    sha = hashlib.sha256(open(RS.MANIFEST_FILE, 'rb').read()).hexdigest()
    fake = text + f'\n### Amendment 14 · 2026-11-08, Stage 2, the definitions amendment\n\nManifest `{sha}`.\n'
    assert RS.frozen_in_amendment(fake, sha, 13) == 14
    assert RS.definitions_amendment(fake, sha, 13) == 14
    with pytest.raises(ValueError):
        RS.frozen_in_amendment(text, sha, 13)
    with pytest.raises(ValueError, match='no amendment after Amendment 13'):
        RS.definitions_amendment(text, sha, 13)
    # A later amendment (the lr-freeze amendment, an erratum) may restate the manifest's SHA-256: the definitions
    # amendment is still the earliest that holds it (A13's notation), while the settings keep A11.4's exactly-one rule
    ssha = 'ab' * 32
    later = fake + (f'\n### Amendment 15 · 2026-11-09, Stage 2, the learning rates frozen\n\nSettings `{ssha}`; '
                    f'the manifest stays `{sha}`.\n')
    assert RS.definitions_amendment(later, sha, 13) == 14 and RS.frozen_in_amendment(later, ssha, 13) == 15
    with pytest.raises(ValueError):
        RS.frozen_in_amendment(later, sha, 13)                    # exactly one: the rule kept for the settings only
    assert RS.definitions_amendment(later.replace(f'Manifest `{sha}`', 'Manifest pending'), sha, 13) == 15
    with pytest.raises(ValueError):
        RS.definitions_amendment(fake, sha[:-1] + 'g', 13)           # not a SHA-256
    with pytest.raises(ValueError):                                 # inside a longer hex run: not this SHA-256
        RS.definitions_amendment(fake.replace(f'`{sha}`', f'`{sha}0`'), sha, 13)
    p = tmp_path / 'prereg.md'
    p.write_text(fake, encoding='utf-8')
    monkeypatch.setattr(S2D, 'PREREGISTRATION', str(p))
    with pytest.raises(RS.Refused, match='stage2-time.json'):
        RS.start(cfg, 'tune', str(tmp_path / 'console.txt'))
    assert not os.path.exists(tmp_path / 'console.txt')          # a refused start writes nothing


def test_seeds_are_a13_12s():
    """The registered and dry seeds are A13.12's table, held as constants only (nothing is drawn here)."""
    R, D = RS.REGISTERED, RS.DRY
    assert R.training == (0, 1, 2, 3, 4) and D.training == (3000, 3001, 3002, 3003, 3004)
    assert [s for k in range(6) for s in R.tuning(k)] == list(range(9000, 9012))
    assert [s for k in range(6) for s in D.tuning(k)] == list(range(12000, 12012))
    assert (R.sfull, R.w, R.s3, R.l12_gold, R.l13_bd, R.l13_wb) == (2400, 2420, 2000, 2440, 2460, 2480)
    assert (D.sfull, D.w, D.s3, D.l12_gold, D.l13_bd, D.l13_wb) == (5400, 5420, 5000, 5440, 5460, 5480)
    assert (R.l15_sl, R.l15_men, R.l15_wsr, R.l15_hl, R.l15_vec) == (2500, 2520, 2540, 2560, 2580)
    assert (D.l15_sl, D.l15_men, D.l15_wsr, D.l15_hl, D.l15_vec) == (5500, 5520, 5540, 5560, 5580)
    assert (R.edge_floor, R.within_row, R.l14_gold, R.relabel, R.tail, R.tail_count) == (2600, 2620, 2640, 7, 2700, 200)
    assert (D.edge_floor, D.within_row, D.l14_gold, D.relabel, D.tail) == (5600, 5620, 5640, 3007, 5700)
    assert R.hitr == (1500, 1501, 1502) and D.hitr == (4500, 4501, 4502)
    assert R.bootstrap == D.bootstrap == 7 and R.suite == D.suite == 42
    assert R.time == D.time == tuple(range(95500, 95508))
    assert all(s in ALLOWED for s in RS.SELFTEST_SEEDS.all_drawn(RS.SELFTEST_GRID))
    assert RS.SELFTEST_WORLD_SEED in ALLOWED and SY.SEED in ALLOWED
    # the self-test's blocks do not overlap
    S = RS.SELFTEST_SEEDS
    blocks = [range(b, b + 20) for b in (S.l14_gold, S.sfull, S.w, S.l12_gold, S.l13_bd, S.l13_wb, S.l15_sl,
                                         S.l15_men, S.l15_wsr, S.l15_hl, S.l15_vec)]
    flat = [x for b in blocks for x in b]
    assert len(flat) == len(set(flat))


def test_disk_preflight_refuses(monkeypatch, tmp_path):
    """Spec test 18: the pre-flight refuses when the projection exceeds the free space less 2 GB (mocked)."""
    import collections
    Usage = collections.namedtuple('Usage', 'total used free')
    cfg = RS.make_cfg('selftest', 1, out=str(tmp_path))
    logs = []
    ctx = {'log': logs.append}
    monkeypatch.setattr(RS.shutil, 'disk_usage', lambda p: Usage(10 ** 13, 0, 3 * 10 ** 9))
    assert RS.disk_preflight(cfg, ctx, 10 ** 9, 'tuning')['ok']
    assert RS.disk_preflight(cfg, ctx, 10 ** 9 - 0, 'tuning')['free_bytes'] == 3 * 10 ** 9
    with pytest.raises(RS.Refused, match='free space less 2 GB'):
        RS.disk_preflight(cfg, ctx, 10 ** 9 + 1, 'tuning')
    monkeypatch.setattr(RS.shutil, 'disk_usage', lambda p: Usage(10 ** 13, 0, 1 * 10 ** 9))
    with pytest.raises(RS.Refused):
        RS.disk_preflight(cfg, ctx, 0, 'the decisive run')


def test_budget_projection_and_refusal(tmp_path):
    """A13.16: training rows from the per-epoch wall times, the replays from the replay's, A13.16's estimates for the
    rest; registered tuning refuses without a projection within 11 h and the disk."""
    per = {('lorentz', 2): 1.12, ('lorentz', 3): 1.32, ('euclid', 2): 0.76, ('euclid', 3): 0.87}
    hours, total = RS.projection(per, 3.6, 360.0)
    assert hours['tuning'] == pytest.approx((1.12 + 1.32 + 0.76 + 0.87) * 1000 * 12 / 4 / 3600)
    assert hours['decisive_training'] == pytest.approx(((1.12 + 1.32 + 0.76 + 0.87) * 1000 * 10
                                                        + (0.76 + 1.12) * 1000) / 4 / 3600)
    assert hours['replays'] == pytest.approx(2 * 3.6 * 1000 / 4 / 3600)
    assert hours['timing_projection'] == pytest.approx(0.1)
    assert total == pytest.approx(sum(hours.values()))
    assert 8 < total < 11                                  # A13.16's own figures fit
    _, slow = RS.projection({k: 3 * v for k, v in per.items()}, 3.6, 360.0)
    assert slow > RS.BUDGET_HOURS
    cfg = RS.make_cfg('registered', 1)
    cfg.results = str(tmp_path)
    with pytest.raises(RS.Refused, match='run --time'):
        RS.time_record_ok(cfg)
    rec = {'mode': 'registered', 'within_budget': False, 'disk': {'ok': True}, 'total_hours': slow}
    (tmp_path / 'stage2-time.json').write_text(json.dumps(rec))
    with pytest.raises(RS.Refused, match='11 h'):
        RS.time_record_ok(cfg)
    rec.update(within_budget=True, disk={'ok': False})
    (tmp_path / 'stage2-time.json').write_text(json.dumps(rec))
    with pytest.raises(RS.Refused):
        RS.time_record_ok(cfg)
    rec.update(disk={'ok': True})
    (tmp_path / 'stage2-time.json').write_text(json.dumps(rec))
    assert RS.time_record_ok(cfg)['total_hours'] == slow


def test_settings_round_trip():
    rates = {('lorentz', 2): '1', ('lorentz', 3): '0.3', ('euclid', 2): None, ('euclid', 3): '10'}
    ref = {'file': 'results/tuning-stage2.json', 'head': 'abc', 'sha256': '0' * 64}
    text = RS.settings_text(rates, ref)
    obj = json.loads(text)
    assert obj['lorentz'] == {'2': '1', '3': '0.3'} and obj['euclid'] == {'2': None, '3': '10'}
    assert text.endswith('}\n') and RS.read_settings(text) == (rates, ref)
    with pytest.raises(ValueError):
        RS.settings_text({**rates, ('euclid', 2): '0.5'}, ref)            # the grid is never extended
    bad = json.loads(text)
    bad['euclid']['2'] = '0.5'
    with pytest.raises(ValueError):
        RS.read_settings(json.dumps(bad))


# ================================================================ fast: LBENCH/1 (spec test 16)
def lb_fields(**over):
    f = dict(instanceId='hyperlex-ccb4161-nouns', instanceSha='a' * 64, pairSetSha='b' * 64, arm='H3',
             geometry='h3', d=None, seed=None, lr=None, scoreForm='G', senseRule='max', protocolSha='c' * 64,
             settingsSha=None, budget=None, floatTableSha=None, snapSha=None, itemScoresSha='d' * 64, metric='rho',
             metricSha='e' * 64, metricValue='0.512345', engine='python-3.13.18/numpy-2.5.3/numba-0.68.1',
             wallMs=None)
    f.update(over)
    return f


@pytest.mark.parametrize('claim', RS.LBENCH2_CLAIMS)
def test_lbench_stage2_layout(claim):
    rec, h = RS.lbench2(claim, **lb_fields())
    f = rec.split('|')
    assert len(f) == 24 and f[:2] == ['LBENCH/1', claim] and f[21] == 'cpu'
    assert h == hashlib.sha256(rec.encode()).hexdigest()
    p = RS.parse_lbench(rec)
    assert p['claim'] == claim and p['instanceId'] == 'hyperlex-ccb4161-nouns' and p['d'] == '-'
    assert list(p)[:-1] == list(RS.LBENCH2_FIELDS)
    with pytest.raises(ValueError):                      # Phase 4's parser accepts L6/1 only, unchanged
        l6.parse_lbench(rec)


def test_lbench_parser_selects_by_claim_field():
    rec6, _ = l6.lbench(instanceId='wordnet30-mammal-closure', instanceSha='a' * 64, arm='learned',
                        geometry='lorentz', d=2, seed=0, lr='1', protocolSha='b' * 64, settingsSha='c' * 64,
                        budget='1000,20,50,50,131000,327100000', floatTableSha='d' * 64, snapSha='e' * 64,
                        closureMapSha='f' * 64, graphMapSha='0' * 64, closureMap='0.9', graphMap='0.8',
                        engine='x', wallMs=1)
    assert RS.parse_lbench(rec6)['claim'] == 'L6/1' and RS.parse_lbench(rec6)['closureMap'] == '0.9'
    rec, _ = RS.lbench2('L14/1', **lb_fields())
    with pytest.raises(ValueError):
        RS.parse_lbench(rec + '|extra')
    with pytest.raises(ValueError):
        RS.parse_lbench(rec.replace('L14/1', 'L16/1'))
    with pytest.raises(ValueError):
        RS.lbench2('L6/1', **lb_fields())
    with pytest.raises(ValueError):
        RS.lbench2('L12/1', **lb_fields(arm='a|b'))
    with pytest.raises(ValueError):
        RS.lbench2('L12/1', **{k: v for k, v in lb_fields().items() if k != 'wallMs'})
    with pytest.raises(ValueError):
        RS.lbench2('L12/1', **lb_fields(extra='x'))


def test_metric_text():
    r = ST.Rho(3, 4, 9, 5)
    assert RS.metric_text(r) == '3|4|9' and RS.metric_value(r) == format(0.5, '.6f')
    assert RS.metric_text(F(6, 8)) == '3/4' and RS.metric_value(F(1, 3)) == '0.333333'
    assert RS.metric_text(F(0)) == '0/1'


# ================================================================ fast: pass-1 files and pass 2's SHA check
def test_code_file_formats_and_sha_check(tmp_path):
    cfg = RS.make_cfg('selftest', 1, out=str(tmp_path))
    inst = RS.Inst('X', 'x', 'k', 's' * 64, 'L12/1', 'rho', 'pair', 'full', [(3, 'a', 'b'), (7, 'c', 'd')])
    rec = RS.write_code_file(cfg, 'X/H3/G/max/-', 'pair', inst, [1, 0], ['2.5', '1'], {'classes': 2, 'distinct': 2,
                             'recomputed': 0, 'tie_classes': 0, 'tie_tuples': 0}, [], None)
    raw = open(RS.code_path(cfg.cache, 'X/H3/G/max/-'), 'rb').read()
    assert gzip.decompress(raw) == b'3\t1\n7\t0\n' and rec['sha'] == hashlib.sha256(raw).hexdigest()
    assert rec['values_sha'] == hashlib.sha256(b'2.5\n1\n').hexdigest()
    assert rec['tsv_sha'] == hashlib.sha256(b'3\t1\n7\t0\n').hexdigest()
    assert RS.read_codes(cfg, rec) == [1, 0]
    d = RS.write_code_file(cfg, 'X/H3/G/max/dir', 'dir', inst, [0, 1, 2, 3], ['a', 'b', 'c', 'd'],
                           {'classes': 4, 'distinct': 4, 'recomputed': 0, 'tie_classes': 0, 'tie_tuples': 0}, [], None)
    assert RS.read_codes(cfg, d) == ([0, 1], [2, 3])
    assert d['values_sha'] == hashlib.sha256(b'a\nc\nb\nd\n').hexdigest()     # each row's forward, then reverse
    hi = RS.Inst('H', 'h', 'k', 's', 'L14/1', 'rr', 'hit', 'at', [S2D_row(0), S2D_row(1)], slots=2)
    h = RS.write_code_file(cfg, 'H/x/G/-/t', 'hit', hi, [5, 4, 3, 2], ['1', '2', '3', '4'],
                           {'classes': 4, 'distinct': 4, 'recomputed': 0, 'tie_classes': 0, 'tie_tuples': 0}, [], None)
    assert RS.read_codes(cfg, h) == [[5, 4], [3, 2]]
    with open(RS.code_path(cfg.cache, 'X/H3/G/max/-'), 'wb') as fh:
        fh.write(gzip.compress(b'3\t0\n7\t1\n'))
    with pytest.raises(RS.Refused, match='SHA-256'):            # pass 2 refuses a changed file (A13.8)
        RS.read_codes(cfg, rec)


def S2D_row(i):
    from lexicon import hit
    return hit.HitRow(i, 'c', ['p', 'n'])


def test_hit_rr_and_pessimistic_ties():
    rows = [[5, 1, 5, 2] + [0] * 17, [3] * 21]
    assert RS.hit_rr(rows, (1, 2, 3)) == [F(1, 2), F(1, 4)]
    assert RS.hit_rr(rows, RS.HARD_SLOTS)[1] == F(1, 11)


def test_within_row_control_reads_the_declared_slot():
    """L14 control 1: slot j_r of 0..10 is declared the positive, its pessimistic RR against the other ten; the hard
    slots are never read. Checked against a direct count on crafted rows, and the declared slots are Rng(seed)'s
    below(11) draws (seed 95200 + i here)."""
    from lexicon import hit
    rows = [[9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0] + [99] * 10, [0] * 11 + [7] * 10, [5, 4, 3, 2, 1, 0, 6, 7, 8, 9, 10] + [0] * 10]
    js = [9, 4, 0]
    got = RS.within_row_rr(rows, js)
    assert got == [F(1, 2), F(1, 11), F(1, 6)]           # ties with the declared slot count against it
    slots = hit.within_row_slots(95201, 50)
    r = hpstep_prng.Rng(95201)
    assert slots == [r.below(11) for _ in range(50)] and all(0 <= j <= 10 for j in slots)


# ================================================================ fast: blind two-pass scoring (spec test 3)
def test_pass1_names_no_gold_reader():
    """Import inspection: no @pass1 function names a gold, label, relation or TYPE reader (A13.8)."""
    assert RS.pass1_gold_references() == {}
    for name in ('build_instances', 'job_score', 'job_score_learned', 'score_instance', 'count_checks_words',
                 'closure_bits', 'write_code_file', '_noun_instances', '_verb_instances'):
        assert name in RS.PASS1


def poison_world(src, dst, pins, salt):
    """A copy of the synthetic store with every gold, label, relation and TYPE field replaced by garbage (and
    EVALution's labels): the word, POS, MEN-tag and fold fields stay. Returns the copy's pins."""
    def rows(text, crlf=False):
        lines = text.decode().split('\r\n' if crlf else '\n')
        return lines

    def join(lines, crlf=False):
        return ('\r\n' if crlf else '\n').join(lines).encode()

    def hl(b):
        out = []
        for i, line in enumerate(rows(b)):
            f = line.split(' ')
            if i and len(f) >= 7:
                f[3:] = [f'G{salt}{i}{j}' for j in range(len(f) - 3)]
            out.append(' '.join(f))
        return join(out)

    def tsv(b, cols, header=True, crlf=False):
        out = []
        for i, line in enumerate(rows(b, crlf)):
            f = line.split('\t')
            if (i or not header) and len(f) > 1:
                for c in cols:
                    f[c] = f'G{salt}{i}'
            out.append('\t'.join(f))
        return join(out, crlf)
    poison = {
        'suite-bless': lambda b: tsv(b, [2]), 'suite-wbless': lambda b: tsv(b, [2, 3]),
        'suite-leds': lambda b: tsv(b, [2]), 'suite-eval': lambda b: tsv(b, [2, 3]),
        'suite-shwartz': lambda b: tsv(b, [2]), 'suite-bibless': lambda b: tsv(b, [2, 3]),
        'suite-hyperlex_rnd': lambda b: tsv(b, [3, 4]), 'simlex': lambda b: tsv(b, list(range(3, 10)), crlf=True),
        'ws353-rel': lambda b: tsv(b, [2], header=False), 'ws353-sim': lambda b: tsv(b, [2], header=False),
        'ws353-combined': lambda b: tsv(b, [2], crlf=True),
        'evalution-val': lambda b: tsv(b, [2, 3], header=False), 'evalution-test': lambda b: tsv(b, [2, 3], header=False),
        'men': lambda b: join([' '.join(ln.split(' ')[:2] + [f'G{salt}{i}']) if ln else ln
                               for i, ln in enumerate(rows(b))]),
    }
    import zipfile
    new = {'version': 1, 'files': []}
    for pin in pins['files']:
        os.makedirs(os.path.join(dst, pin['name']), exist_ok=True)
        p = os.path.join(src, pin['name'], pin['file'])
        q = os.path.join(dst, pin['name'], pin['file'])
        data = open(p, 'rb').read()
        members = None
        if pin['name'] == 'hyperlex':
            with zipfile.ZipFile(p) as z:
                members = {m['path']: hl(z.read(m['path'])) for m in pin['members']}
            data = SY._zip(members)
        elif pin['name'] in poison:
            data = poison[pin['name']](data)
        open(q, 'wb').write(data)
        e = {'name': pin['name'], 'url': 'poisoned', 'file': pin['file'], 'bytes': len(data),
             'sha256': hashlib.sha256(data).hexdigest()}
        if members is not None:
            e['members'] = [{'path': m, 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
                            for m, b in members.items()]
        elif pin.get('members'):
            e['members'] = pin['members']
        new['files'].append(e)
    with open(os.path.join(dst, 'pins.json'), 'w') as fh:
        json.dump(new, fh)
    return new


def pass1_in_process(cfg, world, n_jobs=None, arms=None):
    """Builds the instances and runs the exact arms' pass-1 jobs (and one floor table's) in this process: {fkey: sha}."""
    insts = RS.build_instances(cfg, world, lambda m: None)
    RS._G.update(cfg=cfg, world=world, insts=insts, P=None)
    RS._A.clear()
    out = {}
    for job in RS.exact_plan(cfg, insts):
        if arms and job['arm'] not in arms:
            continue
        for fk, f in RS.job_score(job)['files'].items():
            out[fk] = f['sha']
    n = len(world.at.nodes)
    X, N = EM.floor_table_snapped(95233, n, 2, 'lorentz')
    from lexicon import learned as LR
    text = LR.snap_text(world.at.nodes, N)
    os.makedirs(os.path.join(cfg.cache, 'tables'), exist_ok=True)
    open(RS.table_path(cfg.cache, 'floor-x', '.snap.txt'), 'w').write(text)
    rec = {'geometry': 'lorentz', 'd': 2, 'snap_sha': LR.snap_sha(text)}
    job = RS.learned_hit_job('floor-x', rec, [{'inst': 'HIT-test', 'form': 'G', 'rule': '-', 'slots': 21},
                                              {'inst': 'HL-at', 'form': 'G', 'rule': 'max'}], 'floor')
    for fk, f in RS.job_score_learned(job)['files'].items():
        out[fk] = f['sha']
    return out, insts


ARMS = ('H3', 'F3*', 'WN', 'K3', 'S-full-1', 'W-2', 'GloVe-300', 'GloVe-vec-3', 'letter')


@pytest.mark.parametrize('shape', ['noun', 'verb'])
def test_pass1_is_blind_to_gold(tmp_path, monkeypatch, shape):
    """Spec test 3: pass 1 never calls a gold reader (a spy refuses every call while the gold is closed), and
    poisoning every gold, label, relation and TYPE field leaves its code files byte-identical; the MEN tags, POS and
    folds select rows in pass 1, and BD-dir's pass-1 file holds every covered row (pass 2 selects the True rows)."""
    calls = []
    install_gold_spy(monkeypatch, calls)
    cfg = RS.make_cfg('selftest', 1, out=str(tmp_path / 'a'), shape=shape)
    world = RS.World(cfg)
    base, insts = pass1_in_process(cfg, world, arms=ARMS)
    assert calls == [] and base
    cfg2 = RS.make_cfg('selftest', 1, out=str(tmp_path / 'b'), shape=shape)
    poison_world(cfg.world_root, cfg2.world_root, world.pins, 'x')
    w2 = RS.World(cfg2, build=False)
    assert w2.store.sha256('bless') != world.store.sha256('bless')
    poisoned, insts2 = pass1_in_process(cfg2, w2, arms=ARMS)
    assert calls == []
    assert poisoned == base                               # byte-identical code files
    assert {k: v.pair_set_sha for k, v in insts.items()} == {k: v.pair_set_sha for k, v in insts2.items()}
    bd = insts['BD-dir']
    fk = next(k for k in base if k.startswith('BD-dir/H3/G/'))
    lines = gzip.decompress(open(RS.code_path(cfg.cache, fk), 'rb').read()).decode().splitlines()
    assert len(lines) == len(bd.rows) and all(len(x.split('\t')) == 3 for x in lines)
    if shape == 'noun':
        men = S2D.men_words(world.store)
        assert len(insts['MEN'].rows) == sum(1 for r in men if r[2] == '-n' and r[4] == '-n')
        assert insts['BD'].selected_rows == sum(1 for r in S2D.suite_words('bless', world.store) if r[3] == 'test')


# ================================================================ fast: the dry seal (spec test 19)
PLANTED = ('0.123457', '0.876543', '0.314159', '987654/1234567', '42|4242|424242', '0.271828')


def planted_record():
    iv = {'est': 0.1234567, 'lo': 0.8765432, 'hi': 0.3141592, 'what': 'x', 'row_bootstrap': {'est': 0.2718281}}
    rho = ST.Rho(42, 4242, 424242, 9)
    part = {'verdict': 'supported', 'cells': {'H3-F3': iv}, 'reasons': ['0.123457']}
    claims = {k: {'parts': {'a': dict(part), 'b': dict(part)}, 'void': False,
                  'controls': {'fails_as_required': {'control1': True}, 'control1': {'K3': iv}}}
              for k in ('L12', 'L13', 'L15')}
    claims['L12']['rho'] = {'H3': rho}
    claims['L14'] = {'parts': {'a': {'verdict': 'inconclusive', 'cells': {}}, 'b': dict(part)}, 'presence': {},
                     'void': False,
                     'controls': {'control1': {}, 'control2': {}, 'closure_check': {'random': True},
                                  'control3': {'cells': {'d2/s0/rho': {'lorentz': iv}, 'd2/s0/rr_random': {}}},
                                  'control4': {'t': {'mean': 0.1234567}},
                                  'fails_as_required': {'control1': True}},
                     'measured': {'t': {'rho_hl_at': rho, 'mean_rr': {'random': '1/2'}}},
                     'intervals': {'a': {}, 'b': {(2, 0): iv}, 'control3': {(2, 0, 'rho'): {'lorentz': iv},
                                                                         (2, 0, 'rr_random'): {}}},
                     'relabelled_per_row_mean_rr': {}}
    files = [{'fkey': 'HL/H3/G/max/-', 'rows': 3, 'classes': 3, 'recomputed': 0, 'tie_classes': 0, 'tie_tuples': 0,
              'phi_recomputed': 0, 'phi_ties': 0, 'sealed': True, 'metrics': [('rho', None, rho)],
              'tie_bounds': {'pessimistic': rho}, 'ap_sklearn': F(987654, 1234567)},
             {'fkey': 'HIT-test-s21/learned/G/-/t', 'rows': 3, 'classes': 3, 'recomputed': 0, 'tie_classes': 0,
              'tie_tuples': 0, 'phi_recomputed': 0, 'phi_ties': 0, 'sealed': False,
              'metrics': [('mean-rr', 'random', F(1, 2))]}]
    return {'label': 'x', 'mode': 'dry', 'shape': 'verb', 'step': 'decisive', 'head': 'h', 'claims': claims,
            'reported': {'L12': {'monosemous': {'H3': rho}}, 'L13': {'x': iv}, 'L15': {'x': iv}},
            'files_metrics': files, 'instances': {'HL': {'rows': 3}}, 'counts': {'dry': {'hl.V': 453}},
            'convergence': {'r': {'converged': True}}, 'pass1': {'files': 2}}


def test_visible_record_holds_no_sealed_value():
    """Spec test 19 (unit): the dry record's visible part, built by whitelisting, holds none of the planted values on
    sealed sets, but keeps the counts, the controls' booleans and L14's values on the verb graph."""
    rec = planted_record()
    vis = RS.visible_record(rec)
    text = RS.P4.jdump(RS.clean(vis))
    for v in PLANTED:
        assert v not in text, v
    assert '"hl.V": 453' in text and '"control1": true' in text and '1/2' in text
    cfg = RS.make_cfg('dry', 1)
    vis['sealed'] = {'sha256': 'f' * 64}
    md = RS.claims_md(cfg, RS.clean(vis))
    for v in PLANTED:
        assert v not in md
    full = RS.P4.jdump(RS.clean(rec))                     # the planted values are there before the seal
    assert all(v in full for v in ('987654/1234567', '42|4242|424242'))


def test_dry_console_seals_values():
    logs = []
    p2 = RS.Pass2.__new__(RS.Pass2)
    p2.cfg, p2.log = RS.make_cfg('dry', 1), logs.append
    p2.say(True, 'L12(a)', 'supported 0.123457')
    p2.say(False, 'L14(a)', 'inconclusive')
    assert logs == ['L12(a): [sealed]', 'L14(a): inconclusive']


# ================================================================ slow: the self-test end to end
def strip_lbench(text, settings=False):
    """LBENCH lines without wallMs (the training wall-clock differs between runs) and, with settings, without
    settingsSha (another folder's tuning record has other start times, so its settings file another SHA-256)."""
    out = []
    for x in text.splitlines():
        f = x.split('|')[:23]
        if settings:
            f[13] = '-'
        out.append('|'.join(f))
    return sorted(out)


def decisions(rec):
    return {k: {p: v['verdict'] for p, v in c['parts'].items()} for k, c in rec['claims'].items()}


@pytest.fixture(scope='module')
def selftest_runs(tmp_path_factory):
    """The noun-shape self-test with 2 workers, run twice in one folder (the second resumes every job), and once
    more in a fresh folder with 1 worker."""
    a = str(tmp_path_factory.mktemp('selftest-a'))
    b = str(tmp_path_factory.mktemp('selftest-b'))
    mp = pytest.MonkeyPatch()
    calls = []
    try:
        install_gold_spy(mp, calls)
        rc1 = RS.main(['--selftest', '--out', a, '--workers', '2'])
        first = {n: open(os.path.join(a, 'results', n), encoding='utf-8').read()
                 for n in ('claims-stage2.json', 'lbench-stage2.txt', 'stage2-manifest.json')}
        rc2 = RS.main(['--selftest', '--out', a, '--workers', '2'])
        rc3 = RS.main(['--selftest', '--out', b, '--workers', '1'])
    finally:
        mp.undo()
    return {'a': a, 'b': b, 'rc': (rc1, rc2, rc3), 'first': first, 'calls': calls}


@pytest.mark.slow
def test_selftest_end_to_end(selftest_runs):
    r = selftest_runs
    assert r['rc'] == (0, 0, 0) and r['calls'] == []
    res = os.path.join(r['a'], 'results')
    rec = json.load(open(os.path.join(res, 'claims-stage2.json'), encoding='utf-8'))
    assert set(rec['claims']) == {'L12', 'L13', 'L14', 'L15'}
    assert rec['flags']['L12(d)'] == ST.L12_PREVIEW_FLAG and rec['claims']['L12']['flag_d'] == ST.L12_PREVIEW_FLAG
    for c in rec['claims'].values():
        for p in c['parts'].values():
            assert p['verdict'] in ('supported', 'refuted', 'inconclusive', 'void')
    l12a = rec['claims']['L12']['parts']['a']['cells']['H3-F3']
    assert set(l12a) >= {'est', 'lo', 'hi'}
    k3 = rec['claims']['L12']['intervals']['control1']['K3']
    assert k3['unit'] == 'word' and k3['row_bootstrap']['unit'] == 'row' and k3['pairSetSha'] and k3['n'] > 0
    assert rec['claims']['L12']['controls']['control1']['K3']['est'] == k3['est']
    assert rec['claims']['L13']['intervals']['parts']['a']['H3-F3']['unit'] == 'cluster'
    assert rec['claims']['L14']['controls']['closure_check'] == {'random': True, 'hard': True}
    assert rec['replay_check']['equal'] and all(v['equal'] for v in rec['preflight_runs'].values())
    assert rec['load_averages'] and rec['starts'] and rec['environment']
    assert rec['P']['seed'] == RS.SELFTEST_SEEDS.relabel
    # receipts: every LBENCH/1 line has 24 fields and parses by its claim field
    lines = open(os.path.join(res, 'lbench-stage2.txt'), encoding='utf-8').read().splitlines()
    claims = set()
    for x in lines:
        p = RS.parse_lbench(x)
        claims.add(p['claim'])
        assert p['protocolSha'] == S2D.PROTOCOL_SHA
    assert claims == set(RS.LBENCH2_CLAIMS)
    # the manifest names every pass-1 file with the SHA-256 of the file in the cache
    man = json.load(open(os.path.join(res, 'stage2-manifest.json'), encoding='utf-8'))
    cache = os.path.join(r['a'], 'cache', 'noun')
    for fk, f in list(man['files'].items())[:200]:
        assert hashlib.sha256(open(os.path.join(cache, f['cache_path']), 'rb').read()).hexdigest() == f['sha256']
    assert man['decision_files']['committed'] and os.listdir(os.path.join(res, 'stage2-codes'))
    assert len(os.listdir(os.path.join(res, 'stage2-tables'))) == 20
    tuning = json.load(open(os.path.join(res, 'tuning-stage2.json'), encoding='utf-8'))
    assert len(tuning['runs']) == 16 and tuning['replay_check']['equal']
    settings = json.load(open(os.path.join(res, 'settings-stage2.json'), encoding='utf-8'))
    assert settings['tuning']['sha256'] == hashlib.sha256(
        open(os.path.join(res, 'tuning-stage2.json'), 'rb').read()).hexdigest()
    t = json.load(open(os.path.join(res, 'stage2-time.json'), encoding='utf-8'))
    assert set(t['per_epoch_wall_s']) == {'lorentz-2', 'lorentz-3', 'euclid-2', 'euclid-3'}
    assert not any(os.path.exists(os.path.join(RESULTS, n)) for n in ('claims-stage2.json', 'tuning-stage2.json'))
    # A13.11's reports added by the review: NK18's diagnostic, NK17 on the learned tables, L14's tables on the L13
    # rows, the suite's own detection protocol, the vocabulary each arm misses, H3 against the learned tables on HL-at
    rep = rec['reported']
    nk18 = rep['L14']['nk18_r_against_sp_lp']
    assert set(nk18['exact_trees']) == {'H3', 'H2'} and len(nk18['tables']) == 16 + 20 + 20 + 20
    assert all(e['rho']['n'] == nk18['nodes'] for e in list(nk18['tables'].values()) + [
        {'rho': x} for x in nk18['exact_trees'].values()])
    hl = rep['L14']['h3_against_learned_on_hl_at']
    assert len(hl) == 21 and 'rho_H3' in hl
    assert all(v['unit'] == 'word' and v['row_bootstrap']['unit'] == 'row' and v['n'] == rec['instances']['HL-at']['rows']
               for k, v in hl.items() if k != 'rho_H3')
    assert len(rep['L14']['tables']) == 20
    assert all(set(e['NK17']) == {'random', 'hard', 'rho_hl_at'} for e in rep['L14']['tables'].values())
    sp = rep['L13']['suite_detection_protocol']
    assert set(sp) == {'BD-suite', 'WB-suite'} and set(sp['BD-suite']['arms']) == set(RS.SIX) | {'WN'}
    assert sp['BD-suite']['oov_test_rows'] >= 1 and sp['BD-suite']['val_rows_in_vocabulary'] >= 1
    for st, base in (('BD-suite', 'BD'), ('WB-suite', 'WB')):
        for e in sp[st]['arms'].values():         # every test row of the file, the OOV ones at the validation floor
            assert e['test_rows'] == rec['instances'][base]['selected'] and not e['floor_from_test']
            assert e['test_rows'] - e['oov_test_rows'] == rec['instances'][base]['rows']
    l13 = rep['L13']['l14_tables_on_these_rows']
    assert set(l13['pair_sets']) == {'BD-at', 'WB-at', 'BD-dir-at'} and len(l13['tables']) == 20
    assert len(l13['lorentz_minus_euclid']) == 10
    cov = rep['coverage']
    assert cov['HL']['missed']['U_full']['missed_types'] >= 1 and 'glove' in cov['HL-glove']['missed']
    assert set(cov['HL-at']['arms_by_vocabulary']) == {'U_at'} and 'index' in cov['HL']['arms_by_vocabulary']
    raw = open(os.path.join(res, 'claims-stage2.json'), encoding='utf-8').read()
    assert all(w not in raw for w in SY.OOV)                      # the missed words are hashed, never written
    # F1 (A13.11) from pass 1's joint val + test code file, computed in pass 2 (A13.8): one file per measured table,
    # named in the manifest with its SHA-256, and F1 in both settings for each of the 20 measured tables
    assert sum(1 for fk in man['files'] if fk.startswith('HIT-valtest-s21/learned/G/-/measured-')) == 20
    for e in rep['L14']['tables'].values():
        assert set(e['f1']) == {'random', 'hard'}
        for v in e['f1'].values():
            assert 0 <= v['f1_test_float'] <= 1 and set(v['test_counts']) == {'tp', 'fp', 'fn', 'tn'}
            assert sum(v['test_counts'].values()) == rec['instances']['HIT-test']['rows'] * 11
    # L15 control 2 (READING stage2-runner-30): every arm on SL and MEN, the controls K3, S-full_i and W_i included
    c2 = rec['claims']['L15']['control2_rho']
    held = {(e['arm'], e['set']) for e in c2}
    perms = RS.SELFTEST_SEEDS.perms
    assert len(c2) == len(held) == 2 * (7 + 2 * perms) + 3 * 2
    assert {('K3', 'SL'), ('S-full-0', 'MEN'), (f'W-{perms - 1}', 'SL'), ('GloVe-300', 'HL-glove')} <= held
    # L12(d)'s failing side, every side reported (READING in stats2.l12_failing_side)
    d = rec['claims']['L12']['parts']['d']
    assert d['failing_side'] in (None, 'low', 'high', 'both') and set(d['failing_excess']) <= {'low', 'high'}
    # every start records the interpreter's flags (A13.2)
    assert all('interpreter_flags' in s for s in rec['starts'][-1:])


def skip_if_head_moved(cache):
    """Resume is by design only at one HEAD: a commit made by someone else between two runs makes every line stale."""
    heads = [json.loads(x)['head'] for x in open(os.path.join(cache, 'starts-decisive.jsonl'), encoding='utf-8')]
    if len(set(heads[-2:])) > 1:
        pytest.skip(f'HEAD moved between the two runs ({heads[-2][:12]} -> {heads[-1][:12]}): nothing to resume')


@pytest.mark.slow
def test_selftest_resumes(selftest_runs):
    """A restart at the same HEAD and code reuses every finished job and writes the same decisions, receipts and
    manifest (A13.15 step 7)."""
    r = selftest_runs
    skip_if_head_moved(os.path.join(r['a'], 'cache', 'noun'))
    con = open(os.path.join(r['a'], 'results', 'stage2-console.txt'), encoding='utf-8').read()
    second = con.split('=' * 100)[-1]
    assert 'start 2 of this step' in second
    for phase in ('pass 1: exact arms', 'training: measured', 'pass 1: learned tables'):
        m = re.search(re.escape(phase) + r'[^:]*: (\d+) jobs, (\d+) done before', second)
        assert m and m.group(1) == m.group(2), phase
    now = {n: open(os.path.join(r['a'], 'results', n), encoding='utf-8').read()
           for n in ('claims-stage2.json', 'lbench-stage2.txt', 'stage2-manifest.json')}
    assert now['stage2-manifest.json'] == r['first']['stage2-manifest.json']
    assert strip_lbench(now['lbench-stage2.txt']) == strip_lbench(r['first']['lbench-stage2.txt'])
    assert decisions(json.loads(now['claims-stage2.json'])) == decisions(json.loads(r['first']['claims-stage2.json']))


@pytest.mark.slow
def test_selftest_deterministic_across_worker_counts(selftest_runs):
    r = selftest_runs
    a, b = (os.path.join(x, 'results') for x in (r['a'], r['b']))
    ma = json.load(open(os.path.join(a, 'stage2-manifest.json')))
    mb = json.load(open(os.path.join(b, 'stage2-manifest.json')))
    assert ma == mb
    la = strip_lbench(open(os.path.join(a, 'lbench-stage2.txt')).read(), settings=True)
    lb = strip_lbench(open(os.path.join(b, 'lbench-stage2.txt')).read(), settings=True)
    assert la == lb
    ca, cb = (json.load(open(os.path.join(x, 'claims-stage2.json'))) for x in (a, b))
    assert decisions(ca) == decisions(cb)
    assert ca['claims']['L13']['controls'] == cb['claims']['L13']['controls']
    assert ca['reported']['L14']['relabel_tail'] == cb['reported']['L14']['relabel_tail']
    ta, tb = (json.load(open(os.path.join(x, 'tuning-stage2.json'))) for x in (a, b))
    assert ta['cells'] == tb['cells'] and [x['float_sha'] for x in ta['runs']] == [x['float_sha'] for x in tb['runs']]
    assert ta['pass1_files'] == tb['pass1_files']


@pytest.mark.slow
def test_selftest_resume_reruns_a_changed_file(selftest_runs, tmp_path):
    """A cached code file whose SHA-256 changed is not reused: its job reruns and the record is the same."""
    src = selftest_runs['a']
    dst = str(tmp_path / 'copy')
    shutil.copytree(src, dst)
    runs = os.path.join(dst, 'cache', 'noun', 'runs.jsonl')
    text = open(runs, encoding='utf-8').read().replace(src, dst)
    open(runs, 'w', encoding='utf-8').write(text)
    # the first exact-arm file (table '-'; a learned table's files end with its key and rerun another pool)
    victim = [f for f in sorted(os.listdir(os.path.join(dst, 'cache', 'noun', 'codes'))) if f.endswith('__-.tsv.gz')][0]
    p = os.path.join(dst, 'cache', 'noun', 'codes', victim)
    open(p, 'wb').write(gzip.compress(b'0\t0\n'))
    assert RS.main(['--selftest', '--out', dst, '--workers', '2']) == 0
    skip_if_head_moved(os.path.join(dst, 'cache', 'noun'))
    con = open(os.path.join(dst, 'results', 'stage2-console.txt'), encoding='utf-8').read().split('=' * 100)[-1]
    assert re.search(r'pass 1: exact arms: \d+ jobs, \d+ done before \(runs.jsonl\), 1 to run', con)
    assert (json.load(open(os.path.join(dst, 'results', 'stage2-manifest.json')))
            == json.load(open(os.path.join(src, 'results', 'stage2-manifest.json'))))


@pytest.mark.slow
def test_selftest_dry_shape_seals(tmp_path, capfd):
    """Spec test 19 end to end: the dry run's shape (verbs) with planted synthetic ratings; nothing of a sealed set
    reaches results/dry/ or the console, and the sealed file's SHA-256 is recorded."""
    out = str(tmp_path / 'dry')
    assert RS.main(['--selftest', '--dry', '--out', out, '--workers', '2']) == 0
    console = capfd.readouterr().out
    res = os.path.join(out, 'results', 'dry')
    sealed_path = os.path.join(out, 'cache', 'dry-sealed', 'values.json')
    raw = open(sealed_path, 'rb').read()
    sealed = json.loads(raw)
    vis = json.load(open(os.path.join(res, 'claims-stage2.json'), encoding='utf-8'))
    assert vis['sealed']['sha256'] == hashlib.sha256(raw).hexdigest()
    assert 'claims' not in vis and 'reported' not in vis
    assert set(vis['controls_fail_as_required']) == {'L12', 'L13', 'L15'}
    sealed_ids = {i['iid'] for i in vis['instances'].values() if i['sealed']}
    lb = open(os.path.join(res, 'lbench-stage2.txt'), encoding='utf-8').read().splitlines()
    assert lb and not any(RS.parse_lbench(x)['instanceId'].split('-random')[0].split('-hard')[0] in sealed_ids
                          for x in lb)
    assert all(RS.parse_lbench(x)['instanceId'].startswith(('wordnet30-verb-at-split', )) for x in lb)
    assert sealed['lbench_sealed'] and all(
        RS.parse_lbench(x)['instanceId'].split('-relabelled')[0] in sealed_ids for x in sealed['lbench_sealed'])
    # every interval of a sealed set (distinctive floats) and every sealed metric hash stays out of the visible files
    planted = set()

    def walk(x):
        if isinstance(x, dict):
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
        elif isinstance(x, float) and len(repr(x)) >= 12:
            planted.add(repr(x))
    rec = sealed['record']
    for k in ('L12', 'L13', 'L15'):
        walk(rec['claims'][k]['parts'])
    walk(rec['claims']['L14']['parts']['b'])
    assert planted
    visible = console + ''.join(open(os.path.join(res, n), encoding='utf-8').read() for n in os.listdir(res)
                                if os.path.isfile(os.path.join(res, n)))
    assert not [v for v in planted if v in visible]
    assert 'L12(a): [sealed]' in console and 'L14(b): [sealed]' in console
    # the review's additions: the suite protocol does not apply to the dry sets (no validation fold); L14's tables on
    # the dry detection rows and the reports stay in the sealed file
    assert rec['reported']['L13']['suite_detection_protocol']['applies'] is False
    assert set(rec['reported']['L13']['l14_tables_on_these_rows']['pair_sets']) == {'BD-at', 'WB-at', 'BD-dir-at'}
    assert all(vis['instances'][k]['sealed'] for k in ('BD-at', 'WB-at', 'BD-dir-at'))


# ================================================================ slow: WordNet 3.0 and the pinned files (counting only)
@pytest.mark.slow
def test_registered_word_level_checks_and_pair_sets(wn):
    """The registered world's word-level count checks, the frozen GloVe counts and the pair sets against the
    committed instance manifest (rebuilt from the pinned files): counting and hashing only, no score, no seed."""
    if not S2D.available():
        pytest.skip('the pinned Stage-2 files are not in the cache')
    cfg = RS.make_cfg('registered', 1)
    world = RS.World(cfg)
    logs = []
    counts = RS.count_checks_words(cfg, world, logs.append)
    assert counts['problems'] == [] and counts['budget'] == RS.BUDGET_STRING
    insts = RS.build_instances(cfg, world, logs.append)
    RS.check_instance_counts(cfg, insts, counts, logs.append)
    assert len(insts['HL'].rows) == 2163 and len(insts['HL-at'].rows) == 2153 and len(insts['BD'].rows) == 12365
    assert len(insts['WB'].rows) == 1493 and len(set(insts['WB'].clusters)) == 192
    assert len(insts['HIT-test'].rows) == 29383 and len(insts['SL'].rows) == 666 and len(insts['MEN'].rows) == 2005
    assert RS.manifest_check(cfg, world, insts, logs.append)['rebuilt_equal']
    jobs = RS.exact_plan(cfg, insts)
    assert RS.plan_lines(insts, jobs) * RS.CODE_LINE_BYTES < 2 * 10 ** 9
