"""A mutated runner is caught (READING stage2-runner-41): the self-test (noun shape) runs once, then its decisive step
is rerun in the same folder with one mutation at a time; every job resumes from runs.jsonl, so only pass 2 runs
again, and each mutation must stop the run with no result: the decision spec check at the start of the decisive step
(check_spec) or the wiring check after pass 2's decisions (Pass2.verify_wiring), which re-derives every comparison
from Amendment 13's text, looks its files up itself and recomputes every interval and control value with stats2's
functions. An unmutated rerun then passes and writes the same decisions.

The mutations: Lorentz and Euclidean swapped in L14 (in the code, and in the spec); H3 and F3 swapped in L12(a) (in the
spec, in the spec with the start check bypassed, and in the code); the row bootstrap in place of the word-level one;
and L14 control 3's edge-shuffled side evaluated against its own shuffled graph (each HiT test row's positive replaced
by the child's partner in the table's shuffled training pairs) while its provenance still names the true graph's file.
In the dry run's shape, a planted interval on a sealed set must stop the run with no value on the console (A13.13).

Synthetic data only (tests/stage2_synth.py), the self-test's seeds 95200 + i (A13.12): a guard refuses any other seed.
Marked slow, as the other self-test runs are."""
import hashlib
import json
import os
import re

import numpy as np
import pytest

import hpstep.prng as hpstep_prng
from lexicon import l6
from lexicon import scores2 as SC
from lexicon import stage2data as S2D
from lexicon import stats2 as ST

import run_claims_stage2 as RS  # noqa: E402

ALLOWED = range(95200, 95500)


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    init = hpstep_prng.Rng.__init__

    def rng_init(self, seed=0, state=None):
        if state is None and seed not in ALLOWED:
            raise RuntimeError(f'seed {seed}: Stage 2 tests draw 95200 + i only (A13.12)')
        return init(self, seed, state)
    monkeypatch.setattr(hpstep_prng.Rng, '__init__', rng_init)
    real_default = np.random.default_rng

    def default_rng(seed=None):
        if seed not in ALLOWED:
            raise RuntimeError(f'numpy seed {seed}: Stage 2 tests draw 95200 + i only (A13.12)')
        return real_default(seed)
    monkeypatch.setattr(np.random, 'default_rng', default_rng)


@pytest.fixture(autouse=True)
def gold_closed():
    S2D.close_gold()
    yield
    S2D.close_gold()


@pytest.fixture(scope='module')
def run(tmp_path_factory):
    out = str(tmp_path_factory.mktemp('wiring') / 'st')
    assert RS.main(['--selftest', '--out', out, '--workers', '2']) == 0
    res = os.path.join(out, 'results')
    first = open(os.path.join(res, 'claims-stage2.json'), encoding='utf-8').read()
    return {'out': out, 'res': res, 'first': first}


@pytest.fixture(scope='module')
def dry_run(tmp_path_factory):
    """The self-test in the dry run's shape (verbs; every value on a human-rated set sealed, A13.13)."""
    out = str(tmp_path_factory.mktemp('wiring-dry') / 'st')
    assert RS.main(['--selftest', '--dry', '--out', out, '--workers', '2']) == 0
    res = os.path.join(out, 'results', 'dry')
    first = open(os.path.join(res, 'claims-stage2.json'), encoding='utf-8').read()
    return {'out': out, 'res': res, 'first': first, 'dry': True}


def rerun(run):
    """The decisive step again in the same folder (every job resumes): (exit code, the console of this start)."""
    rc = RS.main(['--selftest', '--out', run['out'], '--workers', '2'] + (['--dry'] if run.get('dry') else []))
    con = open(os.path.join(run['res'], 'stage2-console.txt'), encoding='utf-8').read().split('=' * 100)[-1]
    return rc, con


def assert_caught(run, rc, con, *keys):
    """The run stopped with no result, naming the comparisons; the record on disk is the first run's."""
    assert rc == 1, con[-2000:]
    m = re.search(r'STOPPED: (.*)', con)
    assert m, con[-2000:]
    for k in keys:
        assert k in m.group(1), (k, m.group(1)[:1500])
    assert 'decisive finished' not in con and 'wrote ' not in con
    assert open(os.path.join(run['res'], 'claims-stage2.json'), encoding='utf-8').read() == run['first']
    resumed = re.search(r'pass 1: exact arms: (\d+) jobs, (\d+) done before', con)
    assert resumed is None or resumed.group(1) == resumed.group(2)


def swapped(comp):
    return comp._replace(x=comp.y, y=comp.x)


@pytest.mark.slow
def test_selftest_passes_the_wiring_check(run):
    rec = json.loads(run['first'])
    w = rec['wiring']
    assert w['spec_equals_a13'] and w['comparisons'] == len(w['provenance']) and w['control_values'] > 0
    assert w['provenance']['L12/a/H3-F3'] == {'x': 'HL/H3/G/max/-', 'y': 'HL/F3/G/max/-', 'inst': 'HL',
                                              'metric': 'rho', 'interval': 'ci_rho'}
    l14 = [k for k in w['provenance'] if k.startswith('L14/a/d2/random/')]
    assert l14 and all('measured-lorentz-d2' in w['provenance'][k]['x'] and 'measured-euclid-d2' in
                       w['provenance'][k]['y'] for k in l14)
    c3 = [v for k, v in w['provenance'].items() if k.startswith('L14/control3/') and '/rr_' in k]
    assert c3 and all(v['x'].startswith('HIT-test-s21/learned/') and v['y'].startswith('HIT-test-s21/edge-shuffled/')
                      for v in c3)


@pytest.mark.slow
def test_l14_lorentz_euclidean_swapped_in_the_code(run, monkeypatch):
    real = RS.Pass2.learned_key

    def swapped_key(self, table, geometry, d, j):
        return real(self, table, {'lorentz': 'euclid', 'euclid': 'lorentz'}[geometry], d, j)
    monkeypatch.setattr(RS.Pass2, 'learned_key', swapped_key)
    rc, con = rerun(run)
    assert_caught(run, rc, con, 'the wiring check failed', 'L14/a/d2/random/j',
                  ': read HIT-test-s21/learned/G/-/measured-euclid-d2-')


@pytest.mark.slow
def test_l14_lorentz_euclidean_swapped_in_the_spec(run, monkeypatch):
    sp = {k: dict(v) for k, v in RS.DECISION_SPEC.items()}
    sp['L14/a'] = {k: swapped(v) for k, v in sp['L14/a'].items()}
    monkeypatch.setattr(RS, 'DECISION_SPEC', sp)
    rc, con = rerun(run)
    assert_caught(run, rc, con, 'the decision spec differs from Amendment 13', "DECISION_SPEC['L14/a']")
    assert 'pass 1: exact arms' not in con                       # refused before anything is scored


@pytest.mark.slow
def test_l12a_h3_f3_swapped_in_the_spec(run, monkeypatch):
    sp = {k: dict(v) for k, v in RS.DECISION_SPEC.items()}
    sp['L12/a']['H3-F3'] = swapped(sp['L12/a']['H3-F3'])
    monkeypatch.setattr(RS, 'DECISION_SPEC', sp)
    rc, con = rerun(run)
    assert_caught(run, rc, con, "DECISION_SPEC['L12/a']")


@pytest.mark.slow
def test_l12a_h3_f3_swapped_in_the_spec_past_the_start_check(run, monkeypatch):
    """With check_spec bypassed, the assembly reads the mutated constant; verify_wiring derives the comparison from
    A13's text instead and catches it."""
    sp = {k: dict(v) for k, v in RS.DECISION_SPEC.items()}
    sp['L12/a']['H3-F3'] = swapped(sp['L12/a']['H3-F3'])
    monkeypatch.setattr(RS, 'DECISION_SPEC', sp)
    monkeypatch.setattr(RS, 'check_spec', lambda text=None: [])
    rc, con = rerun(run)
    assert_caught(run, rc, con, 'the wiring check failed',
                  'L12/a/H3-F3: read HL/F3/G/max/- - HL/H3/G/max/-; A13 states HL/H3/G/max/- - HL/F3/G/max/-')


@pytest.mark.slow
def test_l12a_h3_f3_swapped_in_the_code(run, monkeypatch):
    real = RS.Pass2.side_fkey

    def swapped_fkey(self, inst, side, d=None, j=None, picks=None):
        if inst == 'HL' and side.form == 'G' and side.arm in ('H3', 'F3'):
            side = side._replace(arm={'H3': 'F3', 'F3': 'H3'}[side.arm])
        return real(self, inst, side, d, j, picks)
    monkeypatch.setattr(RS.Pass2, 'side_fkey', swapped_fkey)
    rc, con = rerun(run)
    assert_caught(run, rc, con, 'the wiring check failed', 'L12/a/H3-F3: read HL/F3/G/max/- - HL/H3/G/max/-')


@pytest.mark.slow
def test_row_bootstrap_in_place_of_the_word_level_one(run, monkeypatch):
    """The main interval of every rho difference taken from the row bootstrap while its labels still say 'word': the
    files and the order are right, so only the recomputation with ST.ci_rho catches it."""
    real = RS.Pass2.rho_iv

    def row_iv(self, inst, A, B, what):
        iv = real(self, inst, A, B, what)
        rb = iv['row_bootstrap']
        return dict(iv, lo=rb['lo'], hi=rb['hi'])
    monkeypatch.setattr(RS.Pass2, 'rho_iv', row_iv)
    rc, con = rerun(run)
    assert_caught(run, rc, con, 'the wiring check failed', 'L12/a/H3-F3: the interval', 'is not its recomputation')


def shuffled_graph_codes(p2, key):
    """The edge-shuffled table read against its own shuffled training graph: each HiT test row's positive replaced by
    the child's partner in the table's shuffled pairs (when it has one), the negatives kept; certified G codes in one
    tie-class list, as pass 1 writes them."""
    r = p2.trained[key]
    world = p2.world
    offsets = world.at.nodes
    N = RS.load_snapped(p2.cfg, key, r['snap_sha'], r['geometry'], offsets)
    ac = RS.learned_ctx(r['geometry'], offsets, N, key)
    partner = {}
    for a, b in l6.edge_pairs_seed(r['pairs']['seed'], len(offsets), r['pairs']['count']):
        partner.setdefault(offsets[a], offsets[b])
    rows = p2.insts['HIT-test'].rows
    vals = []
    for row in rows:
        vals.extend(ac.scorer.slot_vals(row.child, [partner.get(row.child, row.slots[0])] + list(row.slots[1:21])))
    codes, _, _, _ = RS.code_values('cert', vals, SC.Certifier())
    return [codes[21 * i:21 * i + 21] for i in range(len(rows))]


@pytest.mark.slow
def test_l14_control3_against_the_shuffled_graph(run, monkeypatch):
    """Control 3's edge-shuffled side evaluated against the shuffled graph while its provenance names the true graph's
    file: caught by the recomputation from that file."""
    real = RS.Pass2.side_codes
    hit = []

    def against_shuffled(self, inst, side, d=None, j=None, picks=None):
        codes, fk = real(self, inst, side, d, j, picks)
        if side.table == 'edge-shuffled' and self.insts[inst].kind == 'hit':
            hit.append(fk)
            return shuffled_graph_codes(self, self.learned_key(side.table, side.arm, d, j)), fk
        return codes, fk
    monkeypatch.setattr(RS.Pass2, 'side_codes', against_shuffled)
    rc, con = rerun(run)
    assert hit
    assert_caught(run, rc, con, 'the wiring check failed', 'L14/control3/d2/rr_random/', 'is not its recomputation')


@pytest.mark.slow
def test_an_unmutated_rerun_passes(run):
    rc, con = rerun(run)
    assert rc == 0 and 'wiring check: ' in con and 'STOPPED' not in con
    now = json.load(open(os.path.join(run['res'], 'claims-stage2.json'), encoding='utf-8'))
    first = json.loads(run['first'])
    assert {k: {p: v['verdict'] for p, v in c['parts'].items()} for k, c in now['claims'].items()} == \
        {k: {p: v['verdict'] for p, v in c['parts'].items()} for k, c in first['claims'].items()}
    assert now['wiring'] == first['wiring']
    assert ST.L12_PREVIEW_FLAG == now['flags']['L12(d)']


@pytest.mark.slow
def test_a_sealed_wiring_failure_prints_no_value(dry_run, monkeypatch, capfd):
    """A13.13 (READING stage2-runner-50): in the dry run's shape a wiring mismatch on a sealed set stops the run naming
    the comparison, its files, instance, metric and interval, with no value on the console or in the error (planted
    interval ends and their recomputation alike); the problems with their values go to the sealed side file, whose
    SHA-256 the console gives."""
    planted = (0.123456789012345, 0.987654321098765)
    real = RS.Pass2.rho_iv

    def planted_iv(self, inst, A, B, what):
        return dict(real(self, inst, A, B, what), lo=planted[0], hi=planted[1])
    monkeypatch.setattr(RS.Pass2, 'rho_iv', planted_iv)
    rc, con = rerun(dry_run)
    out = capfd.readouterr()
    assert_caught(dry_run, rc, con, 'the wiring check failed', 'L12/a/H3-F3: the ci_rho interval of rho on HL',
                  'is not its recomputation', 'the values are in the sealed side file')
    visible = con + out.out + out.err
    for v in planted:
        assert repr(v) not in visible and repr(v)[:8] not in visible
    stopped = re.search(r'STOPPED: (.*)', con).group(1)
    assert not re.search(r'\d\.\d{4,}', stopped), stopped[:500]             # no value of any interval
    side = os.path.join(dry_run['out'], 'cache', 'dry-sealed', 'wiring-problems.json')
    raw = open(side, 'rb').read()
    assert repr(planted[0]).encode() in raw and b'L12/a/H3-F3: the interval' in raw
    assert hashlib.sha256(raw).hexdigest() in stopped
