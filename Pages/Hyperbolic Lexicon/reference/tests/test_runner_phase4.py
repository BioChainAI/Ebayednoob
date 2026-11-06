"""run_claims_phase4.py (Amendment 10 item 14; build spec 2.5, 3.5, 4): the fast checks of its rules (refusals, the
clean-tree rule, the label, JSON and gzip determinism, the resume check, the seeds it may use), and, marked slow, the self-test end to end: the whole pipeline on the synthetic DAG
l6_synth.dag(80001) with unregistered seeds 80600+, its resume after an interruption, and the determinism of its
outputs under another worker count. Nothing here touches the mammal or dry sets, and no registered seed is drawn.
"""
import ast
import gzip
import json
import os
import re
import shutil
import subprocess
import sys
from fractions import Fraction as F

import numpy as np
import pytest

import l6_synth
from lexicon import l6

HERE = os.path.dirname(os.path.abspath(__file__))
REFERENCE = os.path.dirname(HERE)
RUNNER = os.path.join(REFERENCE, 'run_claims_phase4.py')
RESULTS = os.path.join(REFERENCE, 'results')

import run_claims_phase4 as RC  # noqa: E402


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    l6_synth.install_seed_guard(monkeypatch)


# ================================================================ fast: the rules
@pytest.mark.parametrize('argv', [
    ['--tune', '--allow-dirty'],                       # registered: refused (A10.14)
    ['--measure', '--allow-dirty'],
    ['--selftest', '--dry', '--out', '/tmp/x'],
    ['--write-settings', '--dry'],
    ['--tune', '--out', '/tmp/x'],
    ['--selftest'],                                    # needs --out
    ['--selftest', '--out', os.path.join(RESULTS, 'selftest')],   # never under results/
    ['--tune', '--workers', '0'],
])
def test_refusals(argv, capsys):
    assert RC.main(argv) == 1
    assert 'REFUSED' in capsys.readouterr().err


def test_check_tree():
    rel = RC.REL_REF + '/results/'
    clean = {'head': 'abc', 'status_ok': True, 'changed': []}
    assert RC.check_tree('registered', 'tune', clean, False) is None
    own = dict(clean, changed=[rel + 'tuning.json', rel + 'phase4-tuning-console.txt'])
    assert RC.check_tree('registered', 'tune', own, False) is None
    other = dict(clean, changed=[RC.REL_REF + '/lexicon/embed.py'])
    with pytest.raises(RC.Refused):
        RC.check_tree('registered', 'tune', other, False)
    with pytest.raises(RC.Refused):                    # tuning's outputs are not the measure step's
        RC.check_tree('registered', 'measure', own, False)
    meas = dict(clean, changed=[rel + 'claims-phase4.json', rel + 'l6-tables/learned-lorentz-d2-s0.snap.txt.gz'])
    assert RC.check_tree('registered', 'measure', meas, False) is None
    dry = dict(clean, changed=[rel + 'dry/tuning.json', rel + 'dry/settings.json', rel + 'dry/claims-phase4.md'])
    assert RC.check_tree('dry', 'measure', dry, False) is None
    assert RC.check_tree('dry', 'tune', other, True) == 'development run: not a registered run'
    assert RC.check_tree('selftest', 'measure', other, False).startswith('selftest')
    ws = dict(clean, changed=[RC.REL_REF + '/settings.json', RC.REL_SYS + '/PREREGISTRATION.md'])
    assert RC.check_tree('registered', 'write-settings', ws, False) is None


def test_git_scope_and_label():
    assert RC.REL_SYS == 'Pages/Hyperbolic Lexicon'
    assert RC.REL_HPSTEP == 'Pages/Hyperbolic Oracles/reference/hpstep'
    text = open(l6.PREREGISTRATION, encoding='utf-8').read()
    n = max(int(x) for x in re.findall(r'^### Amendment (\d+) ', text, flags=re.M))
    assert RC.prereg_label() == f'PREREGISTRATION.md with Amendments 1-{n}'


def test_cfg():
    reg = RC.make_cfg('registered', 4, False)
    assert reg.seeds is l6.REGISTERED and reg.cells == l6.CELLS and reg.grid == l6.GRID
    assert (reg.epochs, reg.burnin) == (1000, 20) and reg.results == RESULTS
    dry = RC.make_cfg('dry', 4, False)
    assert dry.seeds is l6.DRY and dry.results == os.path.join(RESULTS, 'dry')
    st = RC.make_cfg('selftest', 2, False, '/tmp/st')
    assert st.seeds is l6.SELFTEST and st.cache == '/tmp/st/cache' and st.grid == ('0.3', '3')
    assert (st.epochs, st.burnin) == (3, 1)
    # the self-test's seeds are unregistered
    s = l6.SELFTEST
    used = list(s.training) + list(s.tuning) + [s.label] + [s.edge(j) for j in range(5)] + \
        [s.diag(j) for j in range(RC.DIAG_COUNT)]
    assert not any(l6_synth.guarded(x) for x in used) and min(used) >= 80000
    assert l6.budget(6542) == '1000,20,50,50,131000,327100000'


def test_jsafe_and_gzip():
    x = RC.jsafe({('lorentz', 2, 0): F(1, 3), 'a': [float('inf'), np.int64(3), np.float64(0.5), None, True]})
    assert x == {'lorentz/2/0': {'exact': '1/3', 'float': 1 / 3}, 'a': ['inf', 3, 0.5, None, True]}
    c = RC.compact(F(2, 6))
    assert c == {'float': 1 / 3, 'sha256': RC.sha256('1/3'), 'chars': 3}
    a, b = RC.gz_bytes(b'abc' * 100), RC.gz_bytes(b'abc' * 100)
    assert a == b and a[4:8] == b'\0\0\0\0' and gzip.decompress(a) == b'abc' * 100


def test_cached_ok(tmp_path):
    cache = str(tmp_path)
    X = np.arange(12, dtype=float).reshape(4, 3)
    RC.save_npy(RC.table_path(cache, 'k', '.npy'), X)
    RC.write_atomic(RC.table_path(cache, 'k', '.snap.txt'), 'text')
    rec = {'key': 'k', 'float_sha': RC.EM.table_sha(X), 'cached_table': True, 'snap_sha': RC.sha256('text'),
           'cached_snap': True}
    assert RC.cached_ok(cache, rec)
    assert not RC.cached_ok(cache, dict(rec, float_sha='0' * 64))
    os.remove(RC.table_path(cache, 'k', '.snap.txt'))
    assert not RC.cached_ok(cache, rec)
    assert RC.cached_ok(cache, dict(rec, cached_snap=False))     # tuning: the float table alone (control 1 retrains)
    assert RC.cached_ok(cache, {'key': 'replay', 'states': []})


def test_runs_jsonl_last_line_wins(tmp_path):
    cache = str(tmp_path)
    RC.append_run(cache, {'key': 'a', 'record': {'x': 1}})
    RC.append_run(cache, {'key': 'a', 'record': {'x': 2}})
    with open(os.path.join(cache, 'runs.jsonl'), 'a') as fh:
        fh.write('{"key": "b", "rec')                   # a line cut by a crash
    RC.append_run(cache, {'key': 'c', 'record': {'x': 3}})
    out = RC.load_runs(cache)
    assert out['a']['record'] == {'x': 2} and 'b' not in out and out['c']['record'] == {'x': 3}


def test_no_registered_literal_seed_in_runner():
    """The runner computes P only from Seeds (registered --measure: Rng(7)); no call passes a registered literal seed
    to Rng, PyStream, Stream, label_permutation, floor_table or edge_pairs_seed."""
    tree = ast.parse(open(RUNNER, encoding='utf-8').read())
    calls = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not node.args:
            continue
        name = getattr(node.func, 'id', None) or getattr(node.func, 'attr', None)
        if name in ('Rng', 'PyStream', 'Stream', 'label_permutation', 'floor_table', 'edge_pairs_seed'):
            calls.append((name, node.lineno, node.args[0]))
    bad = [(n, ln) for n, ln, a in calls if isinstance(a, ast.Constant) and isinstance(a.value, int)
           and l6_synth.guarded(a.value)]
    assert bad == []
    perms = [(ast.unparse(a), ln) for n, ln, a in calls if n == 'label_permutation']
    assert sorted(p for p, _ in perms) == ['s', 'seeds.label']


def test_main_process_imports_no_numba():
    code = ('import sys; sys.path.insert(0, %r); import run_claims_phase4; print("numba" in sys.modules)'
            % REFERENCE)
    out = subprocess.run([sys.executable, '-B', '-c', code], cwd=REFERENCE, capture_output=True, text=True,
                         check=True).stdout.strip()
    assert out == 'False'


# ================================================================ slow: the self-test end to end
def run_selftest(out, workers=4):
    p = subprocess.run([sys.executable, '-B', RUNNER, '--selftest', '--out', str(out), '--workers', str(workers)],
                       cwd=REFERENCE, capture_output=True, text=True, timeout=1800)
    return p


def results_listing():
    out = {}
    for root, _, files in os.walk(RESULTS):
        for f in files:
            p = os.path.join(root, f)
            out[p] = os.stat(p).st_mtime_ns
    return out


@pytest.fixture(scope='module')
def selftest_run(tmp_path_factory):
    out = tmp_path_factory.mktemp('selftest') / 'out'
    before = results_listing()
    p = run_selftest(out)
    assert p.returncode == 0, p.stdout[-3000:] + p.stderr[-3000:]
    return out, p, before


def load(out, name):
    with open(os.path.join(out, name), encoding='utf-8') as fh:
        return json.load(fh)


def _mask_lbench(rec):
    f = rec.split('|')
    assert l6.LBENCH_FIELDS[10 - 2] == 'settingsSha' and l6.LBENCH_FIELDS[21 - 2] == 'wallMs'
    f[10] = 'settingsSha'          # depends on tuning.json's bytes, which hold the timing
    f[21] = 'wallMs'
    return '|'.join(f)


def fingerprint(out):
    """Everything a run decides or reports that is a function of its jobs alone (timing, starts, paths and the
    SHA-256s that hash timing excepted)."""
    t = load(out, 'tuning.json')
    c = load(out, 'claims-phase4.json')
    with open(os.path.join(out, 'lbench-phase4.txt'), encoding='utf-8') as fh:
        lb = [_mask_lbench(x) for x in fh.read().split('\n') if x]
    runs_t = [{k: r[k] for k in ('cell', 'lr', 'seed', 'float_sha', 'snap_sha', 'closure_map', 'final_state',
                                  'diverged_epoch', 'guard_hits', 'max_step', 'max_radius', 'loss')}
              for r in t['runs']]
    keep = ('key', 'float_sha', 'snap_sha', 'maps', 'float_maps', 'delta', 'frac_map', 'mean_rank', 'ties',
            'displacement', 'bits', 'distortion', 'final_state', 'guard_hits', 'max_step', 'max_radius', 'loss',
            'coarse', 'aps_sha', 'pairs')
    runs_c = [{k: r.get(k) for k in keep} for r in c['runs']]
    c1 = c['controls']['1']
    return {'tuning_runs': runs_t, 'cells': t['cells'], 'replay_t': t['replay_check'], 'runs': runs_c,
            'exact': {k: c['exact_arm'][k] for k in ('maps', 'frac_map', 'mean_rank', 'snap_sha', 'distortion',
                                                     'bits', 'ties', 'aps_sha')},
            'intervals': c['intervals'], 'decisions': c['decisions'], 'gap': c['prediction_gap'],
            'c1': [{k: x[k] for k in ('table', 'source', 'closure_map', 'graph_map', 'holds')} for x in c1['tables']],
            'c1_diag': c1['diagnostics'], 'c1_labels': c1['labels'], 'c2': c['controls']['2'],
            'l4c': c['l4c'], 'tables': c['tables']['sha256'], 'lbench': lb, 'replay': c['replay_check'],
            'preflight': [{k: x[k] for k in ('job', 'float_sha_now', 'equal')}
                          for x in c['preflight']['reproducibility']]}


@pytest.mark.slow
def test_selftest_end_to_end(selftest_run):
    out, p, before = selftest_run
    # never under results/
    assert results_listing() == before
    t = load(out, 'tuning.json')
    c = load(out, 'claims-phase4.json')
    assert t['mode'] == c['mode'] == 'selftest' and 'SELFTEST' in c['selftest']['banner']
    assert t['development_run'].startswith('selftest') and c['label'].startswith('PREREGISTRATION.md with')
    # the schema (build spec 4.4)
    for k in ('label', 'mode', 'head', 'git', 'starts', 'environment', 'readings', 'instance', 'settings', 'tuning',
              'preflight', 'replay_check', 'exact_arm', 'runs', 'intervals', 'decisions', 'prediction_gap',
              'controls', 'l4c', 'reported', 'lbench', 'timing', 'tables'):
        assert k in c, k
    verdicts = {'supported', 'refuted', 'inconclusive', 'void'}
    for part in 'abcd':
        d = c['decisions']['L6'][part]
        assert d['verdict'] in verdicts and 'reasons' in d and 'support' in d and 'refute' in d
    assert set(c['decisions']['L6']['a']['per_d']) == {'2', '3'}
    assert c['decisions']['L4c']['verdict'] in verdicts
    assert c['decisions']['L4c']['missing'] == 20          # the d = 3 cells are not in the self-test
    for k in ('numpy', 'numba', 'llvmlite', 'libc', 'numpy_cpu_features', 'numpy_cpu_dispatch', 'numpy_show_runtime',
              'cpu', 'workers'):
        assert k in c['environment'], k
    assert all(v == '1' for v in c['environment']['thread_variables'].values())
    assert c['readings'] and all(r['id'].startswith('runner-') for r in c['readings'])
    # tuning.json -> settings.json -> measure: the chosen rates carried through
    s = json.load(open(os.path.join(out, 'settings.json')))
    chosen = {k: v['chosen'] for k, v in t['cells'].items()}
    assert chosen == {f'{g}-{d}': s['L6']['lr'][g][str(d)] for g, d in RC.SELFTEST_CELLS}
    assert c['settings']['rates'] == chosen == c['tuning']['chosen']
    assert s['tuning']['sha256'] == RC.sha256_file(os.path.join(out, 'tuning.json'))
    assert c['settings']['sha256'] == RC.sha256_file(os.path.join(out, 'settings.json'))
    for r in c['runs']:
        if r['kind'] in ('learned', 'edge-shuffled'):
            assert r['lr'] == chosen[f'{r["geometry"]}-{r["d"]}']
    # tuning: 16 runs, rate k on its own registered block; no graph-edge or float64 MAP in its records
    assert len(t['runs']) == 16
    for r in t['runs']:
        assert r['seed'] in l6.SELFTEST.block(l6.GRID.index(r['lr']))
        assert not any(('graph' in k) or ('float_map' in k) or ('delta' in k) for k in r), r.keys()
        f = l6.parse_lbench(r['lbench'])
        assert f['arm'] == 'tuning' and f['graphMapSha'] == '-' and f['graphMap'] == '-' and f['settingsSha'] == '-'
    assert t['replay_check']['equal'] and c['replay_check']['equal']
    assert all(x['equal'] for x in c['preflight']['reproducibility'])
    # LBENCH/1: every line parses, the counts and the file's SHA-256 match
    text = open(os.path.join(out, 'lbench-phase4.txt'), encoding='utf-8').read()
    lines = text.split('\n')
    assert lines[-1] == '' and len(lines) - 1 == c['lbench']['records'] == 16 + 1 + 10 + 10 + 10
    assert RC.sha256(text) == c['lbench']['sha256']
    arms = [l6.parse_lbench(x)['arm'] for x in lines[:-1]]
    assert arms.count('tuning') == 16 and arms.count('exact-h3') == 1 and arms.count('floor') == 10
    for x in lines[:-1]:
        f = l6.parse_lbench(x)
        assert f['protocolSha'] == l6.PROTOCOL_SHA and f['instanceId'] == 'synthetic-dag'
    # control 1 reads tuning tables from the cache and retrains the one whose cached text the self-test deleted
    c1 = c['controls']['1']
    src = {x['table']: x['source'] for x in c1['tables']}
    deleted = c['selftest']['deleted_snap']
    assert src[deleted] == 'retrained, float SHA equal'
    assert sum(1 for v in src.values() if v == 'cache') == len(src) - 1 == 16 + 10 + 10 - 1
    assert c1['evaluated'] == 36 and len(c1['diagnostics']) == 10
    assert all(d['count'] == 200 for d in c1['diagnostics'].values())
    # control 2 is established in every self-test cell and seed; the floors are reported
    assert len(c['controls']['2']) == 10
    assert len(c['controls']['3']['floors']) == 10
    # the tables: gzip with mtime 0, snapped texts that hash to the runs' snap SHA-256s
    tdir = os.path.join(out, 'l6-tables')
    files = sorted(os.listdir(tdir))
    assert len(files) == 20 + 20 + 1 and 'exact-h3.snap.txt.gz' in files
    for r in c['runs']:
        if r['kind'] in ('learned', 'edge-shuffled'):
            name = f'{r["kind"]}-{r["geometry"]}-d{r["d"]}-s{r["seed"]}'
            with open(os.path.join(tdir, name + '.snap.txt.gz'), 'rb') as fh:
                raw = fh.read()
            assert raw[4:8] == b'\0\0\0\0'
            assert RC.sha256(gzip.decompress(raw)) == r['snap_sha']
            with gzip.open(os.path.join(tdir, name + '.f64.gz')) as fh:
                assert RC.sha256(fh.read()) == r['float_sha']
    # the console files hold the run and the banner; the main process never imported numba
    con = open(os.path.join(out, 'phase4-console.txt'), encoding='utf-8').read()
    assert 'SELFTEST' in con and 'numba was imported' not in con
    assert 'REFUSED' not in p.stdout + p.stderr


@pytest.mark.slow
def test_selftest_resume(selftest_run, tmp_path):
    """An interrupted self-test resumes from runs.jsonl: the same outputs, every start listed, the console
    appended."""
    out, _, _ = selftest_run
    copy = tmp_path / 'resume'
    shutil.copytree(out, copy)
    runs = os.path.join(copy, 'cache', 'runs.jsonl')
    lines = open(runs, encoding='utf-8').read().split('\n')
    lines = [x for x in lines if x]
    measure = [i for i, x in enumerate(lines) if not json.loads(x)['key'].startswith(('tuning-', 'replay-tuning'))]
    drop = set(measure[1::2])                                 # every other measure job never finished
    with open(runs, 'w', encoding='utf-8') as fh:
        fh.write(''.join(x + '\n' for i, x in enumerate(lines) if i not in drop) + '{"key": "cut')
    for name in ('claims-phase4.json', 'claims-phase4.md', 'lbench-phase4.txt'):
        os.remove(os.path.join(copy, name))
    shutil.rmtree(os.path.join(copy, 'l6-tables'))
    con_before = open(os.path.join(copy, 'phase4-console.txt'), encoding='utf-8').read()
    p = run_selftest(copy)
    assert p.returncode == 0, p.stdout[-3000:] + p.stderr[-3000:]
    assert fingerprint(copy) == fingerprint(out)
    c = load(copy, 'claims-phase4.json')
    assert len(c['starts']) == 2
    assert sum(1 for r in c['runs'] if r.get('resumed')) > 0
    assert sum(1 for r in c['runs'] if not r.get('resumed')) > 0
    con = open(os.path.join(copy, 'phase4-console.txt'), encoding='utf-8').read()
    assert con.startswith(con_before) and con.count('Phase 4, measure') == 2
    assert 'left unchanged' in p.stdout                       # tuning.json was current


@pytest.mark.slow
def test_selftest_deterministic(selftest_run, tmp_path):
    """A fresh self-test on two workers gives the same outputs as on four (scheduling cannot change a bit)."""
    out, _, _ = selftest_run
    other = tmp_path / 'two'
    p = run_selftest(other, workers=2)
    assert p.returncode == 0, p.stdout[-3000:] + p.stderr[-3000:]
    assert fingerprint(other) == fingerprint(out)
