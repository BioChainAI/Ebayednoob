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
    ['--selftest', '--out', os.path.join(REFERENCE, 'selftest-out')],   # nor anywhere else inside the repository
    ['--selftest', '--out', os.path.dirname(os.path.dirname(os.path.dirname(REFERENCE)))],   # the repository itself
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
    # importable code the check would not see: a sys.path entry inside the repository outside GIT_SCOPE
    path = dict(clean, sys_path_outside_scope=['Pages/Other/reference'])
    with pytest.raises(RC.Refused, match='sys.path'):
        RC.check_tree('registered', 'tune', path, False)
    assert RC.check_tree('dry', 'tune', path, True) == 'development run: not a registered run'


def test_git_scope_and_label():
    assert RC.REL_SYS == 'Pages/Hyperbolic Lexicon'
    assert RC.REL_HPSTEP == 'Pages/Hyperbolic Oracles/reference/hpstep'
    # the system folder and both reference folders lexicon puts on sys.path (hpstep's and engram's homes), whole
    assert RC.GIT_SCOPE == ('Pages/Hyperbolic Lexicon', 'Pages/Hyperbolic Oracles/reference',
                            'Pages/Engram Minds Eye/reference')
    import lexicon
    assert lexicon.HPSTEP_REFERENCE in sys.path and lexicon.ENGRAM_REFERENCE in sys.path
    text = open(l6.PREREGISTRATION, encoding='utf-8').read()
    n = max(int(x) for x in re.findall(r'^### Amendment (\d+) ', text, flags=re.M))
    assert RC.prereg_label() == f'PREREGISTRATION.md with Amendments 1-{n}'


def test_sys_path_outside_scope(monkeypatch, tmp_path):
    """Every sys.path entry inside the repository, and the working directory (a spawn worker's first entry while it
    starts), must lie in GIT_SCOPE."""
    import lexicon
    ok = [lexicon.HPSTEP_REFERENCE, lexicon.ENGRAM_REFERENCE, REFERENCE, HERE, str(tmp_path)]
    monkeypatch.chdir(REFERENCE)
    monkeypatch.setattr(sys, 'path', ok)
    assert RC.sys_path_outside_scope() == []
    other = os.path.join(RC.REPO, 'Pages', 'Hyperbolic Oracles')            # hpstep's parent's parent: not in scope
    monkeypatch.setattr(sys, 'path', ok + [other, ''])
    assert RC.sys_path_outside_scope() == ['Pages/Hyperbolic Oracles']
    monkeypatch.setattr(sys, 'path', ok)
    monkeypatch.chdir(RC.REPO)                                                 # the repository root: refused
    assert RC.sys_path_outside_scope() == ['.']
    monkeypatch.chdir(tmp_path)                                                # outside the repository: fine
    assert RC.sys_path_outside_scope() == []


def test_porcelain_paths():
    """A rename or copy entry of git status --porcelain -z lists its source path too."""
    out = ('R  ref/results/tuning.json\0ref/tests/test_x.py\0 M ref/lexicon/l6.py\0?? ref/new file.txt\0'
           ' R ref/a.py\0ref/b.py\0C  ref/c.py\0ref/d.py\0D  ref/gone.py\0')
    assert RC.porcelain_paths(out) == sorted(['ref/results/tuning.json', 'ref/tests/test_x.py', 'ref/lexicon/l6.py',
                                              'ref/new file.txt', 'ref/a.py', 'ref/b.py', 'ref/c.py', 'ref/d.py',
                                              'ref/gone.py'])
    assert RC.porcelain_paths('') == []


def _git(repo, *args):
    subprocess.run(['git', '-C', str(repo), *args], check=True, capture_output=True)


def test_git_checks_in_a_scratch_repository(monkeypatch, tmp_path):
    """git_state and changed_between on a scratch repository laid out like this one: uncommitted changes in Engram
    Mind's Eye's and Hyperbolic Oracles' reference folders are refused; a rename onto an allowed output counts its
    source path, in git status and in git diff, whatever diff.renames and status.renames say."""
    repo = tmp_path / 'repo'
    lex, ho, em = (repo / 'Pages' / 'Hyperbolic Lexicon' / 'reference', repo / 'Pages' / 'Hyperbolic Oracles' /
                   'reference', repo / 'Pages' / 'Engram Minds Eye' / 'reference')
    files = {lex / 'tests' / 'test_x.py': 'def test(): pass\n' * 20, lex / 'lexicon' / 'l6.py': 'X = 1\n',
             ho / 'hpstep' / 'prng.py': 'Y = 2\n', em / 'engram' / 'address.py': 'Z = 3\n',
             repo / 'Pages' / 'Other' / 'page.html': '<p>\n'}
    for f, t in files.items():
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(t)
    _git(repo, 'init', '-q')
    for k, v in (('user.email', 't@example.com'), ('user.name', 't'), ('commit.gpgsign', 'false'),
                 ('diff.renames', 'copies'), ('status.renames', 'copies')):
        _git(repo, 'config', k, v)
    _git(repo, 'add', '-A')
    _git(repo, 'commit', '-q', '-m', 'T0')
    monkeypatch.setattr(RC, 'REPO', str(repo))
    gs = RC.git_state()
    assert gs['clean'] and gs['changed'] == [] and gs['sys_path_outside_scope'] == []
    assert RC.check_tree('registered', 'tune', gs, False) is None
    rel = RC.REL_REF + '/results/'
    for f, t in ((em / 'engram' / 'address.py', 'Z = 4\n'), (em / 'numba.py', ''), (ho / 'numba.py', ''),
                 (ho / 'hpstep' / 'prng.py', 'Y = 3\n')):
        old = f.read_text() if f.exists() else None
        f.write_text(t)
        gs = RC.git_state()
        assert gs['changed'] == [str(f.relative_to(repo))]
        with pytest.raises(RC.Refused):
            RC.check_tree('registered', 'tune', gs, False)
        if old is None:
            f.unlink()
        else:
            f.write_text(old)
    (repo / 'Pages' / 'Other' / 'page.html').write_text('<p>changed\n')        # outside the scope: not looked at
    assert RC.git_state()['changed'] == []
    _git(repo, 'checkout', '--', 'Pages/Other/page.html')
    # a staged rename of a tracked file onto tuning's console: both paths, and refused
    (lex / 'results').mkdir()
    _git(repo, 'mv', str(lex / 'tests' / 'test_x.py'), str(lex / 'results' / 'phase4-tuning-console.txt'))
    gs = RC.git_state()
    assert gs['changed'] == [rel + 'phase4-tuning-console.txt', RC.REL_REF + '/tests/test_x.py']
    with pytest.raises(RC.Refused, match='test_x.py'):
        RC.check_tree('registered', 'tune', gs, False)
    _git(repo, 'commit', '-q', '-m', 'H')
    t0 = subprocess.run(['git', '-C', str(repo), 'rev-parse', 'HEAD~1'], capture_output=True, text=True).stdout.strip()
    code, changed = RC.changed_between(t0, 'HEAD')
    assert code == 0 and changed == [rel + 'phase4-tuning-console.txt', RC.REL_REF + '/tests/test_x.py']
    plain = subprocess.run(['git', '-C', str(repo), 'diff', '--name-only', t0, 'HEAD'], capture_output=True,
                           text=True).stdout.split('\n')
    assert [x for x in plain if x] == [rel + 'phase4-tuning-console.txt']    # the control: git's rename detection


def test_recheck_tree(monkeypatch):
    """The clean-tree check is repeated before each pool and before writing: HEAD must not move and the tree must
    stay clean (a dry --allow-dirty run is marked instead); every check is listed."""
    state = {'head': 'abc', 'status_ok': True, 'changed': [], 'sys_path_outside_scope': []}
    monkeypatch.setattr(RC, 'git_state', lambda: dict(state))
    logged = []
    ctx = {'git': {'head': 'abc'}, 'step': 'tune', 'mark': None, 'git_checks': [], 'log': logged.append}
    reg = RC.make_cfg('registered', 4, False)
    RC.recheck_tree(reg, ctx, 'before the tuning pool')
    assert [x['where'] for x in ctx['git_checks']] == ['before the tuning pool'] and ctx['mark'] is None
    state['head'] = 'def'
    with pytest.raises(RC.Refused, match='HEAD moved'):
        RC.recheck_tree(reg, ctx, 'before writing tuning.json')
    state.update(head='abc', changed=[RC.REL_ENGRAM_REF + '/engram/address.py'])
    with pytest.raises(RC.Refused, match='uncommitted'):
        RC.recheck_tree(reg, ctx, 'before writing tuning.json')
    dry = RC.make_cfg('dry', 4, True)
    RC.recheck_tree(dry, ctx, 'before writing tuning.json')
    assert ctx['mark'] == 'development run: not a registered run' and logged
    st = RC.make_cfg('selftest', 4, False, '/tmp/st')
    n = len(ctx['git_checks'])
    RC.recheck_tree(st, ctx, 'x')                      # the self-test is never a registered run: no check
    assert len(ctx['git_checks']) == n


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


# what job_tuning returns for a finite table (A10.8: the exact snapped closure MAP, and nothing else computed)
TUNING_RECORD = {'geometry', 'd', 'lr', 'seed', 'instance', 'diverged_epoch', 'epochs_run', 'guard_hits', 'max_step',
                 'max_radius', 'loss', 'final_state', 'float_sha', 'wall_s', 'cpu_s', 'wall_ms', 'stream',
                 'concurrent_processes', 'cached_table', 'snap_sha', 'closure_map', 'aps_sha', 'eval_s', 'lbench',
                 'lbench_sha'}
# and what _run_job adds to every record in the worker
JOB_FIELDS = {'key', 'kind', 'job_wall_s', 'job_cpu_s', 'pid', 'environment_sha', 'environment'}


@pytest.mark.parametrize('geometry', ['lorentz', 'euclid'])
def test_job_tuning_computes_the_closure_map_only(geometry, monkeypatch, tmp_path):
    """A10.8: "Tuning computes no other MAP, so that it previews neither (c) nor L4(c)." job_tuning itself, in this
    process, on a synthetic table (the training replaced by an untrained table from PyStream(80980)): one call of
    learned.evaluate, on the snapped arm, with the closure neighbours alone; one rank._ap_and_ranks per query, on its
    closure neighbours; no float arm, rank structure or |dMAP|; a record and an APs file with nothing else."""
    from lexicon import embed as EM
    from lexicon import learned as LN
    from lexicon import pystream as PS
    from lexicon import rank as RK
    cs = l6_synth.small(80031)
    inst = EM.training_instance(cs)
    cfg = RC.make_cfg('selftest', 1, False, str(tmp_path))
    info = {'instance_id': 'synthetic-dag', 'instance_sha': cs.instance_sha, 'budget': l6.budget(inst.E, 3, 1)}
    monkeypatch.setattr(RC, '_W', {'cfg': dict(RC.worker_cfg(cfg, info), pool_size=1), 'cs': cs, 'inst': inst,
                                   'dT': None})
    X = EM.init_table(PS.PyStream(80980), cs.n, 2, geometry)

    def fake_train(job, inst):
        return EM.Run(geometry, 2, job['lr'], job['seed'], inst.name, X.copy(), None, 0, 0.0, 0.0, [1.0, 0.5],
                      (1, 2, 3, 4), EM.table_sha(X), 0.0, 0.0, 'fake', 2)
    monkeypatch.setattr(RC, '_train', fake_train)
    evals, ap_calls = [], []
    real_eval, real_ap = LN.evaluate, RK._ap_and_ranks

    def spy_eval(arm, nb, *a, **k):
        evals.append((type(arm).__name__, sorted(nb), nb.get('closure') is cs.closure_nb, a, k))
        return real_eval(arm, nb, *a, **k)

    def spy_ap(S, keys, nb):
        ap_calls.append(tuple(nb))
        return real_ap(S, keys, nb)

    def forbidden(*a, **k):
        raise AssertionError('tuning computed something other than the snapped closure MAP')
    monkeypatch.setattr(LN, 'evaluate', spy_eval)
    monkeypatch.setattr(RK, '_ap_and_ranks', spy_ap)
    for name in ('FloatArm', 'rank_structure', 'ap_float_structure', 'map_float_structure', 'delta_map',
                 'fractional_ap'):
        monkeypatch.setattr(LN, name, forbidden)
    job = {'kind': 'tuning', 'key': RC.tuning_key(geometry, 2, '0.3', 80600), 'geometry': geometry, 'd': 2,
           'lr': '0.3', 'seed': 80600, 'block': 2}
    rec = RC.job_tuning(job)
    arm_type = 'DyadicLorentzArm' if geometry == 'lorentz' else 'Arm'
    assert evals == [(arm_type, ['closure'], True, (), {})]
    assert sorted(ap_calls) == sorted(tuple(x) for x in cs.closure_nb)
    assert set(rec) == TUNING_RECORD
    aps = json.load(open(RC.table_path(cfg.cache, job['key'], '.aps.json'), encoding='utf-8'))
    assert list(aps) == ['closure'] and len(aps['closure']) == cs.n
    f = l6.parse_lbench(rec['lbench'])
    assert f['arm'] == 'tuning' and f['graphMapSha'] == f['graphMap'] == f['settingsSha'] == '-'
    want = real_eval(LN.snapped_arm(LN.snap(X, geometry), geometry), {'closure': cs.closure_nb}).map['closure']
    assert F(rec['closure_map']) == want and rec['concurrent_processes'] == 1



def test_comparisons_are_amendment_10_item_7():
    """A10.7 term by term: (a) closure, Lorentz(d) - Euclidean(d) at d = 2, 3; (b) closure, Lorentz(50) -
    Euclidean(50); (c) graph-edge, exact - Lorentz(3); (d) closure, Lorentz(3) - exact. The self-test trains only
    d = 2, so this pin is what guards the wiring of a3, b, c and d."""
    assert RC.COMP_SPEC == {
        'a2': ('closure', ('lorentz', 2), ('euclid', 2)),
        'a3': ('closure', ('lorentz', 3), ('euclid', 3)),
        'b': ('closure', ('lorentz', 50), ('euclid', 50)),
        'c': ('graph', 'exact', ('lorentz', 3)),
        'd': ('closure', ('lorentz', 3), 'exact'),
    }
    for comp, (_, x, y) in RC.COMP_SPEC.items():
        assert tuple(c for c in (x, y) if c != 'exact') == l6.COMPARISON_CELLS[comp]


def test_run_fields_and_pool_size():
    """A10.11's "number of concurrent processes" is the pool's size, min(--workers, the jobs it runs)."""
    cfg = RC.make_cfg('selftest', 4, False, '/tmp/st')
    assert RC.pool_size(cfg, [1, 2]) == 2 and RC.pool_size(cfg, list(range(9))) == 4 and RC.pool_size(cfg, []) == 1


def test_environments_of():
    e1, e2 = {'libc': ['glibc', '2.39']}, {'libc': ['glibc', '9.99']}
    s1, s2 = RC.env_sha(e1), RC.env_sha(e2)
    recs = [{'environment_sha': s1, 'environment': e1}, {'environment_sha': s2, 'environment': e2},
            {'environment_sha': s1, 'environment': e1}, {}]
    envs, summ = RC.environments_of(recs, s1)
    assert envs == {s1: e1, s2: e2} and summ['records_by_environment'] == {s1: 2, s2: 1, 'not recorded': 1}
    assert not summ['all_this_start'] and RC.environments_of(recs[:1], s1)[1]['all_this_start']
    env = RC.run_environment()
    for k in ('python', 'numpy', 'numba', 'llvmlite', 'libc', 'numpy_cpu_features', 'numpy_cpu_dispatch', 'cpu'):
        assert k in env, k


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
    # ... and what tuning computed and kept in the cache (A10.8; test_job_tuning_computes_the_closure_map_only checks
    # the computation itself): every cached tuning record holds exactly job_tuning's fields, its APs only closure's
    cached = [json.loads(x) for x in open(os.path.join(out, 'cache', 'runs.jsonl'), encoding='utf-8') if x.strip()]
    tun = [x['record'] for x in cached if x['key'].startswith('tuning-')]
    assert len(tun) == 16
    for r in tun:
        assert set(r) == TUNING_RECORD | JOB_FIELDS, set(r) ^ (TUNING_RECORD | JOB_FIELDS)
        aps = json.load(open(RC.table_path(os.path.join(out, 'cache'), r['key'], '.aps.json'), encoding='utf-8'))
        assert list(aps) == ['closure']
    assert not [f for f in os.listdir(os.path.join(out, 'cache', 'tables')) if f.startswith('tuning-')
                and not f.endswith(('.npy', '.snap.txt', '.loss.json', '.aps.json'))]
    # A10.4: every run records its environment (from its worker); every start its own; A10.11: the pool's size
    envs = t['run_environments']
    for r in t['runs'] + [x for x in c['runs'] if 'wall_s' in x]:
        e = envs.get(r['environment_sha']) or c['run_environments'][r['environment_sha']]
        for k in ('numpy', 'numba', 'libc', 'numpy_cpu_features', 'numpy_cpu_dispatch', 'cpu'):
            assert k in e, k
    assert t['environments_summary']['all_this_start'] and c['environments_summary']['all_this_start']
    assert all(s['environment_sha'] == RC.env_sha(s['environment']) for s in c['starts'] + t['starts'])
    assert all(r['concurrent_processes'] == 4 for r in t['runs'])
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
    # every start carries its environment, and the jobs rerun now ran in a pool no larger than their number
    assert all('environment' in s for s in c['starts'])
    rerun = [r for r in c['runs'] if not r.get('resumed') and 'concurrent_processes' in r]
    assert rerun and all(1 <= r['concurrent_processes'] <= 4 for r in rerun)


@pytest.mark.slow
def test_selftest_deterministic(selftest_run, tmp_path):
    """A fresh self-test on two workers gives the same outputs as on four (scheduling cannot change a bit)."""
    out, _, _ = selftest_run
    other = tmp_path / 'two'
    p = run_selftest(other, workers=2)
    assert p.returncode == 0, p.stdout[-3000:] + p.stderr[-3000:]
    assert fingerprint(other) == fingerprint(out)


@pytest.mark.slow
def test_selftest_resumed_under_another_environment(selftest_run, tmp_path):
    """A10.4 and A10.14 step 6: a run resumed under another numpy SIMD dispatch reuses its finished jobs (the same
    run), and the record says so: each run keeps the environment its worker trained it under, the new start lists
    its own, and the mixture is counted (environments_summary) and logged."""
    out, _, _ = selftest_run
    c0 = load(out, 'claims-phase4.json')
    feats = [f for f in c0['environment']['numpy_cpu_dispatch'] if f in c0['environment']['numpy_cpu_features']]
    if not feats:
        pytest.skip('numpy dispatches no optional SIMD target on this machine')
    copy = tmp_path / 'other-env'
    shutil.copytree(out, copy)
    p = subprocess.run([sys.executable, '-B', RUNNER, '--selftest', '--out', str(copy), '--workers', '4'],
                       cwd=REFERENCE, capture_output=True, text=True, timeout=1800,
                       env=dict(os.environ, NPY_DISABLE_CPU_FEATURES=feats[-1]))
    assert p.returncode == 0, p.stdout[-3000:] + p.stderr[-3000:]
    c = load(copy, 'claims-phase4.json')
    assert feats[-1] not in c['environment']['numpy_cpu_features']
    old, new = c['starts'][0]['environment_sha'], c['starts'][-1]['environment_sha']
    assert len(c['starts']) == 2 and old != new and old == c0['starts'][0]['environment_sha']
    es = c['environments_summary']
    assert es['this_start'] == new and not es['all_this_start'] and set(es['records_by_environment']) == {old}
    assert all(r.get('resumed') and r['environment_sha'] == old for r in c['runs'])
    assert set(c['run_environments']) == {old} and feats[-1] in c['run_environments'][old]['numpy_cpu_features']
    assert 'environment other than this start' in p.stdout
    assert {k: v['verdict'] for k, v in c['decisions']['L6'].items() if isinstance(v, dict) and 'verdict' in v} == \
        {k: v['verdict'] for k, v in c0['decisions']['L6'].items() if isinstance(v, dict) and 'verdict' in v}
