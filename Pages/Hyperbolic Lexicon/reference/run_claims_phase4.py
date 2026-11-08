#!/usr/bin/env python3
"""Runs Phase 4 of ../PREREGISTRATION.md (Amendment 10, cited A10.n): L6 and L4(c). (A10.17's fractional-tie values
of Phases 1 and 2 are fractional_ties.py's.)

    python3 -B run_claims_phase4.py --tune [--dry] [--workers 4]       the tuning grid (A10.8): every cell, rate k
                                                                       (ascending) on tuning block k; the replay
                                                                       check; results/tuning.json and
                                                                       results/phase4-tuning-console.txt (dry:
                                                                       results/dry/, with results/dry/settings.json)
    python3 -B run_claims_phase4.py --write-settings                   registered only: reference/settings.json from
                                                                       results/tuning.json; prints its SHA-256 for
                                                                       the lr-freeze amendment
    python3 -B run_claims_phase4.py --measure [--dry] [--workers 4]    the decisive run (A10.14 step 6): pre-flight,
                                                                       the exact arm, measured, edge-shuffled and
                                                                       floor tables, the replay check, control 1
                                                                       (P computed here, once), every interval, the
                                                                       decisions of L6 and L4(c), the receipts:
                                                                       results/claims-phase4.json and .md,
                                                                       results/phase4-console.txt,
                                                                       results/lbench-phase4.txt, results/l6-tables/
    python3 -B run_claims_phase4.py --selftest --out DIR [--workers 4] the whole pipeline (tune, settings, measure) on
                                                                       a synthetic DAG with unregistered seeds 80600+
                                                                       and a reduced budget (2 cells, 2 rates, 3
                                                                       epochs, burn-in 1). Written under DIR only,
                                                                       which must lie outside the repository; it
                                                                       decides nothing

Options: --dry (the registered dry run of A10.13: solid.n.01, every seed + 3000, the bootstrap's 7 kept);
--workers W (default 4: one single-threaded process per job); --allow-dirty (dry only: run on a tree with other
changes, the record marked "development run: not a registered run"; refused in registered mode).

How it runs (build spec sections 2.5, 4, 5; A10.1, A10.14):
- The five thread variables are set to 1 below, before anything imports numpy. The main process never imports
  numba: training runs in a spawn pool of W worker processes, each single-threaded, one job at a time, longest
  first. Every result is a function of its job alone and outputs are sorted by job, never by completion.
- Each finished job appends one line to runs.jsonl in the cache (lexicon.CACHE/phase4/<mode>/; the self-test's is
  DIR/cache), with its tables beside it. A run restarted at the same HEAD reuses the lines whose cached table still
  has its SHA-256; every start is listed with its environment, and the console file is appended to, never
  overwritten. Every job record holds the environment its worker ran under (A10.4).
- Registered tuning and the decisive run refuse a tree with uncommitted changes (their own outputs aside, so that
  an interrupted run resumes) in the system folder and in the reference folders of Hyperbolic Oracles and Engram
  Mind's Eye, which lexicon imports in place; they check again, HEAD included, before each worker pool and before
  writing. The decisive run also refuses unless the only paths changed since the commit tuning ran on (renames
  counted as both paths) are PREREGISTRATION.md, reference/settings.json, reference/results/tuning.json and
  tuning's console file, and unless the lr-freeze amendment holds settings.json's SHA-256.
- Each step replays one run's draws with hpstep.prng.Rng itself (lexicon.pystream.replay_states): the replay's
  state must equal the run's final state, or the step writes no result (A10.1).
- P = Rng(7).shuffle(list(range(1182))) is computed only in registered --measure, once, in the main process, after
  every table is trained (A10.9).

READINGs of this runner are recorded in the JSON (readings[]) and marked "READING" here; each cites the A10 item it
implements. The modules' own READINGs are marked in lexicon/{stream,pystream,embed,learned,l6}.py.
"""
import os

THREAD_VARS = ('OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'OMP_NUM_THREADS', 'NUMEXPR_NUM_THREADS',
               'NUMBA_NUM_THREADS')
for _v in THREAD_VARS:                      # A10.1: before numpy is imported, here and in every worker
    os.environ[_v] = '1'
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'
import sys  # noqa: E402

sys.set_int_max_str_digits(0)               # the exact MAPs, as p/q, have about 1,000 digits

import argparse  # noqa: E402
import contextlib  # noqa: E402
import gzip  # noqa: E402
import hashlib  # noqa: E402
import io  # noqa: E402
import json  # noqa: E402
import math  # noqa: E402
import multiprocessing  # noqa: E402
import platform  # noqa: E402
import re  # noqa: E402
import subprocess  # noqa: E402
import time  # noqa: E402
import traceback  # noqa: E402
from concurrent.futures import ProcessPoolExecutor, as_completed  # noqa: E402
from dataclasses import dataclass  # noqa: E402
from fractions import Fraction  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lexicon  # noqa: E402  (puts hpstep on sys.path)
import numpy as np  # noqa: E402
from lexicon import embed as EM  # noqa: E402
from lexicon import h3tree as H3  # noqa: E402
from lexicon import l6  # noqa: E402
from lexicon import learned as L  # noqa: E402
from lexicon import pystream as PS  # noqa: E402
from lexicon import rank as R  # noqa: E402

REPO = lexicon.REPO
SYSTEM = lexicon.SYSTEM
TESTS = os.path.join(HERE, 'tests')
REL_SYS = os.path.relpath(SYSTEM, REPO).replace(os.sep, '/')          # Pages/Hyperbolic Lexicon
REL_REF = REL_SYS + '/reference'
REL_HPSTEP = os.path.relpath(os.path.join(lexicon.HPSTEP_REFERENCE, 'hpstep'), REPO).replace(os.sep, '/')
# the clean-tree check (A10.14 steps 4 and 6): the system folder, and the two reference folders lexicon puts on sys.path
# ahead of the standard library and imports in place (Hyperbolic Oracles': hpstep; Engram Mind's Eye's: engram), whole,
# since any file at their top level is importable by the run (a numba.py there would shadow numba)
REL_HO_REF = os.path.relpath(lexicon.HPSTEP_REFERENCE, REPO).replace(os.sep, '/')
REL_ENGRAM_REF = os.path.relpath(lexicon.ENGRAM_REFERENCE, REPO).replace(os.sep, '/')
GIT_SCOPE = (REL_SYS, REL_HO_REF, REL_ENGRAM_REF)

# A10.2: the six graph-edge queries without an AP, and the registered counts
GRAPHLESS = ('01322508', '01322604', '01322898', '01322983', '01323068', '01862399')
PLACENTAL = '01886756'
EXPECT = {
    'registered': {'n': 1182, 'E': 6542, 'graphless': 6, 'graphless_offsets': GRAPHLESS, 'min_nn': 49,
                   'max_nn': 1180, 'sha': 'c4748ce2fc8d4137846c76186c5fa02d9060597b59b8975f8fdc4ae6e476b4ca'},
    'dry': {'n': 1232, 'E': 5696, 'graphless': 11, 'min_nn': 110},
}
# the self-test (build spec 3.5): the 1,182-node synthetic DAG l6_synth.dag(80001), two cells, two rates, 3 epochs
SELFTEST_DAG_SEED = 80001
SELFTEST_CELLS = (('lorentz', 2), ('euclid', 2))
SELFTEST_GRID = ('0.3', '3')
SELFTEST_EPOCHS, SELFTEST_BURNIN = 3, 1
SELFTEST_BANNER = ('SELFTEST: a synthetic DAG (l6_synth.dag(80001)), unregistered seeds 80600+, a reduced budget '
                   '(2 cells, 2 rates, 3 epochs, burn-in 1): a check of the pipeline that decides nothing')
LOSS_EPOCHS = (0, 19, 99, 499, 999)       # build spec 4.2: the mean losses kept in tuning.json (all in the cache)
DIAG_COUNT = 200                          # A10.9: the reported permutations Rng(2100 + j), j < 200
# per-run training seconds by d on this machine (the trainer's timing: Euclidean; Lorentz about 1.4x), for scheduling
TRAIN_SECONDS = {2: 32, 3: 36, 5: 46, 10: 71, 50: 276}


def sha256(x):
    return hashlib.sha256(x.encode('utf-8') if isinstance(x, str) else bytes(x)).hexdigest()


def sha256_file(path):
    with open(path, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def fstr(x):
    x = Fraction(x)
    return f'{x.numerator}/{x.denominator}'


def fparse(s):
    return None if s is None else Fraction(s)


def compact(x):
    """A reported exact rational, compactly: its float, the SHA-256 of 'p/q' and the length of 'p/q' (the exact
    value stays in the cache). Deciding values are written whole."""
    if x is None:
        return None
    t = fstr(x)
    return {'float': float(Fraction(x)), 'sha256': sha256(t), 'chars': len(t)}


def utc_now():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


# ================================================================ JSON
def _kstr(k):
    return '/'.join(str(x) for x in k) if isinstance(k, tuple) else str(k)


def jsafe(x):
    """JSON-ready values: a Fraction as {exact: 'p/q', float}, a non-finite float as its repr, tuples as lists,
    tuple keys joined by '/'."""
    if x is None or isinstance(x, (bool, str)):
        return x
    if isinstance(x, Fraction):
        return {'exact': fstr(x), 'float': float(x)}
    if isinstance(x, (np.bool_,)):
        return bool(x)
    if isinstance(x, (int, np.integer)):
        return int(x)
    if isinstance(x, (float, np.floating)):
        x = float(x)
        return x if math.isfinite(x) else repr(x)
    if isinstance(x, dict):
        return {_kstr(k): jsafe(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [jsafe(v) for v in x]
    if isinstance(x, np.ndarray):
        return jsafe(x.tolist())
    raise TypeError(f'not JSON-ready: {type(x).__name__}')


def jdump(obj):
    return json.dumps(jsafe(obj), indent=1, ensure_ascii=False) + '\n'


def write_atomic(path, data):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    tmp = f'{path}.tmp{os.getpid()}'
    with open(tmp, 'wb') as fh:
        fh.write(data.encode('utf-8') if isinstance(data, str) else data)
    os.replace(tmp, path)


def gz_bytes(data):
    """gzip, level 9, mtime 0 and no file name: the same bytes on every run."""
    buf = io.BytesIO()
    with gzip.GzipFile(filename='', mode='wb', fileobj=buf, compresslevel=9, mtime=0) as gz:
        gz.write(data)
    return buf.getvalue()


# ================================================================ the console
class Console:
    """Prints and appends every line to the step's console file (never overwritten: a resumed run appends)."""

    def __init__(self, path):
        self.path = path
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.fh = open(path, 'a', encoding='utf-8')
        self.t0 = time.perf_counter()

    def __call__(self, msg=''):
        line = f'[{time.perf_counter() - self.t0:8.1f} s] {msg}'
        print(line, flush=True)
        self.fh.write(line + '\n')
        self.fh.flush()

    def close(self):
        self.fh.close()


class Refused(Exception):
    pass


# ================================================================ the label, git, the environment
def prereg_label():
    """'PREREGISTRATION.md with Amendments 1-N', N read from the file as the run starts (the lesson of Amendment 9)."""
    with open(l6.PREREGISTRATION, encoding='utf-8') as fh:
        nums = [int(m) for m in re.findall(r'^### Amendment (\d+) ', fh.read(), flags=re.M)]
    return f'PREREGISTRATION.md with Amendments 1-{max(nums)}' if nums else 'PREREGISTRATION.md'


def git(*args):
    r = subprocess.run(['git', '-C', REPO, *args], capture_output=True)
    return r.returncode, r.stdout.decode('utf-8', 'surrogateescape')


def porcelain_paths(out):
    """Every path of `git status --porcelain -z` output. A rename or copy entry (R or C in either column) is followed
    by its source path, which is listed too: a tracked file moved onto an allowed output is still a changed path.
    (git_state passes --no-renames, so git lists a rename as a deletion and an addition; this is the second guard.)"""
    entries = out.split('\0')
    paths, i = [], 0
    while i < len(entries):
        e = entries[i]
        i += 1
        if not e:
            continue
        paths.append(e[3:])
        if 'R' in e[:2] or 'C' in e[:2]:          # -z: the source path follows as an entry of its own
            if i < len(entries) and entries[i]:
                paths.append(entries[i])
            i += 1
    return sorted(set(paths))


def _inside(path, folder):
    return path == folder or path.startswith(folder.rstrip(os.sep) + os.sep)


def sys_path_outside_scope():
    """sys.path entries inside the repository but outside GIT_SCOPE: code the run could import that the clean-tree
    check would not see. The working directory counts as an entry ('') always: a spawn worker starts as `python -c`,
    with it first on sys.path, and imports multiprocessing from there before it takes this process's sys.path."""
    repo = os.path.realpath(REPO)
    scope = [os.path.realpath(os.path.join(REPO, *s.split('/'))) for s in GIT_SCOPE]
    out = []
    for p in list(sys.path) + ['']:
        rp = os.path.realpath(p or os.getcwd())
        if _inside(rp, repo) and not any(_inside(rp, s) for s in scope):
            out.append(os.path.relpath(rp, repo).replace(os.sep, '/'))
    return sorted(set(out))


def git_state():
    """HEAD and the changed paths (git status --porcelain --no-renames, untracked files listed one by one) of
    GIT_SCOPE: the system folder and the reference folders of Hyperbolic Oracles and Engram Mind's Eye, which the
    reference imports in place from sys.path; and the sys.path entries inside the repository outside that scope."""
    code, head = git('rev-parse', 'HEAD')
    code2, out = git('status', '--porcelain', '-z', '--untracked-files=all', '--no-renames', '--', *GIT_SCOPE)
    paths = porcelain_paths(out) if code2 == 0 else []
    return {'head': head.strip() if code == 0 else None, 'status_ok': code2 == 0, 'scope': list(GIT_SCOPE),
            'changed': paths, 'clean': code2 == 0 and not paths,
            'sys_path_outside_scope': sys_path_outside_scope()}


def changed_between(a, b):
    """(exit code, sorted paths) of `git diff --name-only --no-renames -z a b`: with renames off, a moved file lists
    its old path as well as its new one, whatever diff.renames says."""
    code, out = git('diff', '--name-only', '--no-renames', '-z', a, b)
    return code, sorted(x for x in out.split('\0') if x)


def results_rel(mode):
    return REL_REF + '/results/' + ('dry/' if mode == 'dry' else '')


def own_outputs(mode, step):
    """The repository paths a step writes itself (allowed to be uncommitted, so that an interrupted run resumes);
    a name ending in '/' is a folder."""
    r = results_rel(mode)
    if step == 'tune':
        names = ['tuning.json', 'phase4-tuning-console.txt'] + (['settings.json'] if mode == 'dry' else [])
        return [r + x for x in names]
    if step == 'measure':
        names = ['claims-phase4.json', 'claims-phase4.md', 'phase4-console.txt', 'lbench-phase4.txt', 'l6-tables/']
        if mode == 'dry':     # build spec 4.1: dry tuning's outputs may still be uncommitted
            names += ['tuning.json', 'settings.json', 'phase4-tuning-console.txt']
        return [r + x for x in names]
    if step == 'write-settings':
        return [REL_REF + '/settings.json', REL_SYS + '/PREREGISTRATION.md']
    raise ValueError(step)


def _allowed(path, allowed):
    return any(path == a or (a.endswith('/') and path.startswith(a)) for a in allowed)


def check_tree(mode, step, gs, allow_dirty):
    """None for a clean tree (own outputs aside); a development mark under --allow-dirty (dry only); otherwise
    Refused. The self-test is never a registered run."""
    if mode == 'selftest':
        return 'selftest: not a registered run'
    if not gs['status_ok'] or gs['head'] is None:
        raise Refused('git status failed: the runner needs a git checkout')
    bad = [p for p in gs['changed'] if not _allowed(p, own_outputs(mode, step))]
    outside = gs.get('sys_path_outside_scope') or []
    if not bad and not outside:
        return None
    if allow_dirty:
        return 'development run: not a registered run'
    if bad:
        raise Refused(f'{len(bad)} uncommitted path(s) (A10.14: a clean, committed tree): ' + '; '.join(bad[:10]))
    raise Refused('sys.path holds folder(s) inside the repository that the clean-tree check does not cover: '
                  + '; '.join(outside))


def recheck_tree(cfg, ctx, where):
    """The clean-tree check again (A10.14 steps 4 and 6), before each worker pool starts (spawn workers import the code
    from disk afresh) and before the step writes its record: HEAD must be the start's and check_tree must pass. A
    dry --allow-dirty run that turns dirty is marked instead. Each check is listed in the record (ctx['git_checks'])."""
    if cfg.mode == 'selftest':
        return
    gs = git_state()
    ctx['git_checks'].append({'where': where, 'time': utc_now(), 'head': gs['head'], 'changed': gs['changed'],
                              'sys_path_outside_scope': gs['sys_path_outside_scope']})
    if gs['head'] != ctx['git']['head']:
        raise Refused(f'HEAD moved during the run ({where}): {ctx["git"]["head"]} at the start, {gs["head"]} now')
    mark = check_tree(cfg.mode, ctx['step'], gs, cfg.allow_dirty)
    if mark and not ctx['mark']:
        ctx['mark'] = mark
        ctx['log'](f'{where}: the tree changed during the run; the record is marked "{mark}"')


def cpu_model():
    try:
        with open('/proc/cpuinfo', encoding='utf-8') as fh:
            for line in fh:
                if line.startswith('model name'):
                    return line.split(':', 1)[1].strip()
    except OSError:
        pass
    return platform.processor() or None


def run_environment():
    """What A10.4 has each run record (numpy, numba and libc versions, numpy's SIMD features and dispatch), with
    Python, llvmlite, the platform and the CPU model: computed in every worker for the jobs it runs, and in the main
    process for every start."""
    env = EM.environment()
    env.update(cpu=cpu_model(), implementation=platform.python_implementation())
    return env


def env_sha(env):
    return sha256(json.dumps(env, sort_keys=True, separators=(',', ':')))


def environment(workers):
    env = run_environment()
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
        try:
            np.show_runtime()
        except Exception as e:                          # pragma: no cover
            print(f'np.show_runtime failed: {e}')
    env.update({'cpu_count': os.cpu_count(), 'workers': workers,
                'thread_variables': {v: os.environ.get(v) for v in THREAD_VARS},
                'numpy_show_runtime': buf.getvalue(), 'engine': l6.engine_string()})
    return env


# ================================================================ configuration and data
@dataclass
class Cfg:
    mode: str                 # registered | dry | selftest
    workers: int
    allow_dirty: bool
    results: str              # the results folder of the mode (the self-test's --out)
    cache: str
    seeds: object
    cells: tuple
    grid: tuple
    epochs: int
    burnin: int

    @property
    def label_mode(self):
        return {'registered': 'registered', 'dry': 'dry run (A10.13)', 'selftest': 'SELFTEST'}[self.mode]


def make_cfg(mode, workers, allow_dirty, out=None):
    if mode == 'selftest':
        res = os.path.abspath(out)
        return Cfg(mode, workers, allow_dirty, res, os.path.join(res, 'cache'), l6.SELFTEST, SELFTEST_CELLS,
                   SELFTEST_GRID, SELFTEST_EPOCHS, SELFTEST_BURNIN)
    res = os.path.join(HERE, 'results', 'dry') if mode == 'dry' else os.path.join(HERE, 'results')
    seeds = l6.DRY if mode == 'dry' else l6.REGISTERED
    return Cfg(mode, workers, allow_dirty, res, os.path.join(lexicon.CACHE, 'phase4', mode), seeds, l6.CELLS,
               l6.GRID, EM.EPOCHS, EM.BURNIN)


def load_data(cfg, log):
    """The closure set and its counts (A10.2; dry A10.13), asserted; the self-test's synthetic DAG."""
    t0 = time.perf_counter()
    if cfg.mode == 'selftest':
        if TESTS not in sys.path:
            sys.path.insert(0, TESTS)
        import l6_synth
        cs = l6_synth.dag(SELFTEST_DAG_SEED)
        source = f'tests/l6_synth.dag({SELFTEST_DAG_SEED})'
    else:
        from lexicon import wordnet as W
        wn = W.load()
        cs = EM.closure_set(wn, l6.ROOTS[cfg.mode])
        source = f'WordNet 3.0 nouns: the closure set of {l6.ROOTS[cfg.mode]}'
    inst = EM.training_instance(cs)
    n, E = cs.n, inst.E
    nn = inst.nn_sizes()
    anchors = sorted(set(int(a) for a in inst.pos[:, 0]))
    graphless = [cs.offsets[i] for i, g in enumerate(cs.graph_nb) if not g]
    no_closure = [cs.offsets[i] for i, c in enumerate(cs.closure_nb) if not c]
    no_nn = [cs.offsets[i] for i in range(n) if nn[i] == 0]
    counts = sorted(((len(c), -i) for i, c in enumerate(cs.closure_nb)), reverse=True)
    second = -counts[1][1] if n > 1 else None          # the node with the most closure neighbours after the top
    info = {'source': source, 'root': cs.root, 'n': n, 'E': E, 'instance_sha': cs.instance_sha,
            'instance_id': l6.INSTANCE_IDS[cfg.mode], 'anchors': len(anchors),
            'nn_min_over_anchors': int(nn[anchors].min()), 'nn_max_over_anchors': int(nn[anchors].max()),
            'nn_of_root': int(nn[cs.offsets.index(cs.root)]),
            'queries_without_graph_neighbours': len(graphless), 'graphless_offsets': graphless,
            'queries_without_closure_neighbours': len(no_closure), 'queries_without_nonneighbours': len(no_nn),
            'nodes_without_nonneighbours': no_nn,
            'second_label': {'offset': cs.offsets[second], 'index': second,
                             'closure_neighbours': len(cs.closure_nb[second]), 'nn': int(nn[second])},
            'budget': l6.budget(E, epochs=cfg.epochs, burnin=cfg.burnin),
            'random_ranking_map': {'closure': l6.random_ranking_map(cs.closure_nb),
                                   'graph': l6.random_ranking_map(cs.graph_nb)}}
    ex = EXPECT.get(cfg.mode)
    problems = []
    if ex:
        for k in ('n', 'E'):
            if info[k] != ex[k]:
                problems.append(f'{k} = {info[k]}, registered {ex[k]}')
        if len(graphless) != ex['graphless']:
            problems.append(f'{len(graphless)} nodes without graph-edge neighbours, registered {ex["graphless"]}')
        if 'graphless_offsets' in ex and tuple(graphless) != ex['graphless_offsets']:
            problems.append(f'the graph-less nodes are {graphless}')
        if info['nn_min_over_anchors'] != ex['min_nn']:
            problems.append(f'the smallest |NN| over the anchors is {info["nn_min_over_anchors"]}, not {ex["min_nn"]}')
        if 'max_nn' in ex and info['nn_max_over_anchors'] != ex['max_nn']:
            problems.append(f'the largest |NN| over the anchors is {info["nn_max_over_anchors"]}')
        if 'sha' in ex and cs.instance_sha != ex['sha']:
            problems.append(f'the instance SHA-256 is {cs.instance_sha}, not the registered pin')
        if no_nn != [cs.root]:
            problems.append(f'nodes without non-neighbours: {no_nn}, not the root alone')
        if no_closure:
            problems.append(f'nodes without closure neighbours: {no_closure}')
        if cfg.mode == 'registered' and info['second_label']['offset'] != PLACENTAL:
            problems.append(f'the node with the most closure neighbours after the root is '
                            f'{info["second_label"]["offset"]}, not placental.n.01')
        if cfg.mode == 'registered' and int(nn[cs.offsets.index(PLACENTAL)]) != 49:
            problems.append('placental.n.01 has not 49 non-neighbours')
    if int(nn[anchors].min()) < 1:
        problems.append('an anchor without non-neighbours (A10.2: no fallback exists)')
    if problems:
        raise Refused('the instance is not the registered one: ' + '; '.join(problems))
    log(f'instance {info["instance_id"]}: {n} nodes, {E} positives, SHA-256 {cs.instance_sha[:12]}..., '
        f'{len(graphless)} graph-less, |NN| over the anchors {info["nn_min_over_anchors"]}..'
        f'{info["nn_max_over_anchors"]} ({time.perf_counter() - t0:.1f} s)')
    return cs, info


# ================================================================ the cache
def table_path(cache, key, ext):
    return os.path.join(cache, 'tables', key + ext)


def save_npy(path, X):
    buf = io.BytesIO()
    np.save(buf, np.ascontiguousarray(X, dtype='<f8'))
    write_atomic(path, buf.getvalue())


def aps_text(d):
    return json.dumps({k: [None if a is None else fstr(a) for a in v] for k, v in d.items()}, separators=(',', ':'))


def load_aps(cache, key, want_sha=None):
    path = table_path(cache, key, '.aps.json')
    with open(path, 'rb') as fh:
        data = fh.read()
    if want_sha is not None and hashlib.sha256(data).hexdigest() != want_sha:
        raise ValueError(f'{path}: SHA-256 differs from the run record')
    return {k: [fparse(a) for a in v] for k, v in json.loads(data).items()}


def cfg_sig(cfg, info):
    """What a cached job line must share with this run to be reused (besides HEAD and the job key)."""
    return sha256(json.dumps({'mode': cfg.mode, 'instance': info['instance_sha'], 'epochs': cfg.epochs,
                              'burnin': cfg.burnin, 'budget': info['budget']}, sort_keys=True))[:16]


def load_runs(cache):
    out = {}
    path = os.path.join(cache, 'runs.jsonl')
    if not os.path.exists(path):
        return out
    with open(path, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                x = json.loads(line)
            except json.JSONDecodeError:
                continue                        # a line cut by a crash
            out[x['key']] = x                   # the last line of a key wins
    return out


def append_run(cache, line):
    os.makedirs(cache, exist_ok=True)
    path = os.path.join(cache, 'runs.jsonl')
    lead = ''
    if os.path.exists(path) and os.path.getsize(path):
        with open(path, 'rb') as fh:
            fh.seek(-1, os.SEEK_END)
            if fh.read(1) != b'\n':
                lead = '\n'                     # a line cut by a crash stays a line of its own (and is skipped)
    with open(path, 'a', encoding='utf-8') as fh:
        fh.write(lead + json.dumps(line, separators=(',', ':')) + '\n')
        fh.flush()
        os.fsync(fh.fileno())


def record_start(cfg, step, head, mark, env):
    """Every start of a step is listed in the cache and in the record, with the environment it ran under (A10.14: an
    interrupted run resumes, and the record lists every start; A10.4: what each run records)."""
    path = os.path.join(cfg.cache, f'starts-{step}.jsonl')
    os.makedirs(cfg.cache, exist_ok=True)
    entry = {'time': utc_now(), 'head': head, 'argv': sys.argv[1:], 'workers': cfg.workers, 'mark': mark,
             'pid': os.getpid(), 'environment_sha': env_sha(env), 'environment': env}
    with open(path, 'a', encoding='utf-8') as fh:
        fh.write(json.dumps(entry) + '\n')
    with open(path, encoding='utf-8') as fh:
        return [json.loads(x) for x in fh if x.strip()]


def cached_ok(cache, rec):
    """A cached job is reused when its table (and its snapped text and APs, where it has them) still have the
    recorded SHA-256s."""
    if rec.get('float_sha') and rec.get('cached_table'):
        p = table_path(cache, rec['key'], '.npy')
        if not os.path.exists(p) or EM.table_sha(np.load(p)) != rec['float_sha']:
            return False
    if rec.get('snap_sha') and rec.get('cached_snap'):
        p = table_path(cache, rec['key'], '.snap.txt')
        if not os.path.exists(p) or sha256_file(p) != rec['snap_sha']:
            return False
    if rec.get('aps_sha'):
        p = table_path(cache, rec['key'], '.aps.json')
        if not os.path.exists(p) or sha256_file(p) != rec['aps_sha']:
            return False
    return True


# ================================================================ worker side
_W = {}


def _init_worker(wcfg, cs):
    for v in THREAD_VARS:
        os.environ[v] = '1'
    from lexicon import stream as S          # numba: in the workers only
    S.compile_kernels()
    _W.clear()
    env = run_environment()                  # A10.4: each run records the environment that trained it
    _W.update(cfg=wcfg, cs=cs, inst=EM.training_instance(cs), dT=None, env=env, env_sha=env_sha(env))


def _run_job(job):
    try:
        t0, c0 = time.perf_counter(), time.process_time()
        rec = JOBS[job['kind']](job)
        rec.update(key=job['key'], kind=job['kind'], job_wall_s=time.perf_counter() - t0,
                   job_cpu_s=time.process_time() - c0, pid=os.getpid(), environment_sha=_W['env_sha'],
                   environment=_W['env'])
        return job['key'], rec, None
    except Exception:
        return job['key'], None, traceback.format_exc()


def _path(key, ext):
    return table_path(_W['cfg']['cache'], key, ext)


def _train(job, inst):
    c = _W['cfg']
    return EM.train(inst, job['geometry'], job['d'], job['lr'], job['seed'], epochs=c['epochs'], burnin=c['burnin'],
                    batch=EM.BATCH, negs=EM.NEGS)


def _run_fields(run):
    loss = run.epoch_loss
    return {'geometry': run.geometry, 'd': run.d, 'lr': run.lr, 'seed': run.seed, 'instance': run.instance,
            'diverged_epoch': run.diverged_epoch, 'epochs_run': run.epochs_run, 'guard_hits': run.guard_hits,
            'max_step': run.max_step, 'max_radius': run.max_radius,
            'loss': {str(e): loss[e] for e in LOSS_EPOCHS if e < len(loss)},
            'final_state': list(run.final_state), 'float_sha': run.table_sha, 'wall_s': run.wall_s,
            'cpu_s': run.cpu_s, 'wall_ms': int(round(run.wall_s * 1000)), 'stream': run.stream,
            'concurrent_processes': _W['cfg']['pool_size']}


def _lbench(arm, geometry, d, seed, lr, *, settings_sha, budget, float_sha, snap_bits, snap_sha, cmap, gmap,
            wall_ms):
    c = _W['cfg'] if _W else None
    return lbench_record(c, arm, geometry, d, seed, lr, settings_sha=settings_sha, budget=budget, float_sha=float_sha,
                         snap_bits=snap_bits, snap_sha=snap_sha, cmap=cmap, gmap=gmap, wall_ms=wall_ms)


def lbench_record(c, arm, geometry, d, seed, lr, *, settings_sha, budget, float_sha, snap_bits, snap_sha, cmap, gmap,
                  wall_ms):
    """A10.12's record; None is '-' (a field that does not apply)."""
    return l6.lbench(instanceId=c['instance_id'], instanceSha=c['instance_sha'], arm=arm, geometry=geometry, d=d,
                     seed=seed, lr=lr, protocolSha=c['protocol_sha'], settingsSha=settings_sha, budget=budget,
                     floatTableSha=float_sha, snapBits=snap_bits, snapSha=snap_sha,
                     closureMapSha=None if cmap is None else l6.map_sha(cmap),
                     graphMapSha=None if gmap is None else l6.map_sha(gmap),
                     closureMap=None if cmap is None else l6.map_display(cmap),
                     graphMap=None if gmap is None else l6.map_display(gmap), track='cpu', engine=c['engine'],
                     wallMs=wall_ms)


def _save_table_files(key, X, text, epoch_loss=None):
    save_npy(_path(key, '.npy'), X)
    write_atomic(_path(key, '.snap.txt'), text)
    if epoch_loss is not None:
        write_atomic(_path(key, '.loss.json'), json.dumps(epoch_loss))


def _save_aps(key, d):
    t = aps_text(d)
    write_atomic(_path(key, '.aps.json'), t)
    return sha256(t)


def job_tuning(job):
    """A10.8: train; if finite, snap (K = 32) and the exact snapped closure MAP alone (no graph-edge MAP, no float64
    ranking: tuning previews neither (c) nor L4(c))."""
    cs, c = _W['cs'], _W['cfg']
    run = _train(job, _W['inst'])
    rec = _run_fields(run)
    if run.table is None:
        write_atomic(_path(job['key'], '.loss.json'), json.dumps(run.epoch_loss))
        return rec
    g = job['geometry']
    t0 = time.perf_counter()
    N = L.snap(run.table, g)
    text = L.snap_text(cs.offsets, N)
    _save_table_files(job['key'], run.table, text, run.epoch_loss)
    ev = L.evaluate(L.snapped_arm(N, g), {'closure': cs.closure_nb})
    cmap = ev.map['closure']
    rec.update(cached_table=True, snap_sha=L.snap_sha(text), closure_map=fstr(cmap),
               aps_sha=_save_aps(job['key'], {'closure': ev.aps['closure']}), eval_s=time.perf_counter() - t0)
    rec['lbench'], rec['lbench_sha'] = _lbench('tuning', g, job['d'], job['seed'], job['lr'], settings_sha=None,
                                               budget=c['budget'], float_sha=run.table_sha, snap_bits='32',
                                               snap_sha=rec['snap_sha'], cmap=cmap, gmap=None,
                                               wall_ms=rec['wall_ms'])
    return rec


def _maps(ev):
    return {k: (None if v is None else fstr(v)) for k, v in ev.map.items()}


def _evaluate_table(X, g, d, nb, *, fractional):
    """Snap, rank exactly (and fractional-tie APs), rank the float table in float64, the coarse 2^-8 snap at
    d in {2, 3}, ties, displacement and bits (A10.6, A10.10, A10.11)."""
    cs = _W['cs']
    N = L.snap(X, g)
    text = L.snap_text(cs.offsets, N)
    arm = L.snapped_arm(N, g)
    ev = L.evaluate(arm, nb, fractional=fractional)
    evf = L.evaluate(L.FloatArm(X, g), nb)
    out = {'snap_sha': L.snap_sha(text), 'maps': _maps(ev), 'float_maps': _maps(evf),
           'delta': {k: fstr(L.delta_map(ev.map[k], evf.map[k])) for k in nb},
           'mean_rank': {k: (None if v is None else fstr(v)) for k, v in ev.mean_rank.items()},
           'float_mean_rank': {k: (None if v is None else fstr(v)) for k, v in evf.mean_rank.items()},
           'ties': {'exact': ev.ties, 'exact_queries': ev.tied_queries, 'float': evf.ties,
                    'float_queries': evf.tied_queries},
           'displacement': L.displacement(X, N, g)}
    bm, bx = L.bits(N, g)
    out['bits'] = {'mean': fstr(bm), 'mean_float': float(bm), 'max': bx}
    if fractional:
        out['frac_map'] = {k: (None if v is None else fstr(v)) for k, v in ev.frac_map.items()}
    if d in (2, 3):
        N8 = L.snap(X, g, K=8)
        ev8 = L.evaluate(L.snapped_arm(N8, g, K=8), nb)
        out['coarse'] = {'snap_sha': L.snap_sha(L.snap_text(cs.offsets, N8)), 'maps': _maps(ev8),
                         'delta': {k: fstr(L.delta_map(ev8.map[k], evf.map[k])) for k in nb},
                         'ties': ev8.ties}
    aps = {'closure': ev.aps['closure'], 'graph': ev.aps['graph']}
    if fractional:
        aps.update(frac_closure=ev.frac_aps['closure'], frac_graph=ev.frac_aps['graph'])
    return out, N, arm, text, aps


def _dT():
    if _W.get('dT') is None:
        _W['dT'] = np.load(_W['cfg']['dT_path'])
    return _W['dT']


def _diag_maps(arm, nb):
    """A10.9's reported diagnostics: the relabelled closure MAP under each permutation Rng(diag_base + j), j < 200,
    in float64 from the table's rank structure (learned.rank_structure, map_float_structure).
    READING (runner-11; A10.9 "reported, deciding nothing"): binary64, not exact rationals; the order and ties are the
    snapped table's exact ones, and only the AP sums and the mean are floats. P's own relabelled MAP (control 1) is
    exact (job_relabel)."""
    lt, le = L.rank_structure(arm)
    n = len(nb)
    return [L.map_float_structure(lt, le, l6.relabel(nb, l6.label_permutation(s, n))) for s in _W['cfg']['diag_seeds']]


def job_learned(job):
    """A measured or edge-shuffled run (A10.8, A10.9): train at the cell's frozen lr; then everything A10.6, A10.10 and
    A10.11 report of the table, against the true relations."""
    cs, c = _W['cs'], _W['cfg']
    shuffled = job['kind'] == 'edge-shuffled'
    if shuffled:
        inst = EM.shuffled_instance(cs.n, _W['inst'].E, job['pairs_seed'])
    else:
        inst = _W['inst']
    run = _train(job, inst)
    rec = _run_fields(run)
    if shuffled:
        anchors = np.unique(inst.pos[:, 0])
        rec['pairs'] = {'seed': job['pairs_seed'], 'count': int(inst.E),
                        'sha256': hashlib.sha256(np.ascontiguousarray(inst.pos, dtype='<i8').tobytes()).hexdigest(),
                        'nn_min_over_anchors': int(inst.nn_sizes()[anchors].min())}
    if run.table is None:
        write_atomic(_path(job['key'], '.loss.json'), json.dumps(run.epoch_loss))
        return rec
    g, d = job['geometry'], job['d']
    t0 = time.perf_counter()
    nb = {'closure': cs.closure_nb, 'graph': cs.graph_nb}
    out, N, arm, text, aps = _evaluate_table(run.table, g, d, nb, fractional=True)
    _save_table_files(job['key'], run.table, text, run.epoch_loss)
    rec.update(out)
    rec.update(cached_table=True, cached_snap=True, aps_sha=_save_aps(job['key'], aps))
    if not shuffled:
        rec['diag'] = _diag_maps(arm, cs.closure_nb)
        dist = L.snapped_distances(N, g)
        val, tau = L.distortion(dist, _dT())
        rec['distortion'] = {'value': val, 'tau': tau}
    rec['eval_s'] = time.perf_counter() - t0
    rec['lbench'], rec['lbench_sha'] = _lbench(
        job['kind'], g, d, job['seed'], job['lr'], settings_sha=c['settings_sha'], budget=c['budget'],
        float_sha=run.table_sha, snap_bits='32', snap_sha=out['snap_sha'], cmap=fparse(out['maps']['closure']),
        gmap=fparse(out['maps']['graph']), wall_ms=rec['wall_ms'])
    return rec


def job_floor(job):
    """Control 3 (A10.9): item 3's initial table from a fresh Rng(floor_base + i), untrained; snapped and ranked
    exactly, ranked in float64 (its |dMAP| is reported, A10.10), bits."""
    cs, c = _W['cs'], _W['cfg']
    g, d = job['geometry'], job['d']
    X = EM.init_table(PS.PyStream(job['floor_seed']), cs.n, d, g)
    nb = {'closure': cs.closure_nb, 'graph': cs.graph_nb}
    out, N, arm, text, aps = _evaluate_table(X, g, d, nb, fractional=False)
    fsha = EM.table_sha(X)
    _save_table_files(job['key'], X, text)
    rec = {'geometry': g, 'd': d, 'i': job['i'], 'floor_seed': job['floor_seed'], 'float_sha': fsha,
           'cached_table': True, 'cached_snap': True, **out, 'aps_sha': _save_aps(job['key'], aps)}
    rec['lbench'], rec['lbench_sha'] = _lbench('floor', g, d, job['i'], None, settings_sha=c['settings_sha'],
                                               budget=None, float_sha=fsha, snap_bits='32',
                                               snap_sha=out['snap_sha'], cmap=fparse(out['maps']['closure']),
                                               gmap=fparse(out['maps']['graph']), wall_ms=None)
    return rec


def job_replay(job):
    """A10.1: a run's draws replayed with hpstep.prng.Rng itself (no arithmetic): the state after every epoch."""
    inst, c = _W['inst'], _W['cfg']
    st = PS.PyStream(job['seed'])
    states = PS.replay_states(st, inst.n, job['d'], inst.pos[:, 0], inst.nn_sizes(), c['epochs'], negs=EM.NEGS)
    return {'target': job['target'], 'seed': job['seed'], 'd': job['d'], 'stream': st.name,
            'states': [list(s) for s in states]}


def job_preflight(job):
    """A10.14 step 6: a tuning job retrained; its float table's SHA-256 is compared with tuning.json's."""
    run = _train(job, _W['inst'])
    return {'target': job['target'], 'geometry': run.geometry, 'd': run.d, 'lr': run.lr, 'seed': run.seed,
            'float_sha': run.table_sha, 'diverged_epoch': run.diverged_epoch, 'final_state': list(run.final_state),
            'wall_s': run.wall_s}


def job_relabel(job):
    """Control 1 (A10.9) on one trained table: its snapped table ranked exactly against the relabelled relations
    (learned.evaluate on l6.relabel(nb, P): the node with index P[i] takes the point of row i). A tuning table is
    read from the cache when its snapped text has its recorded SHA-256; otherwise it is retrained (and not written
    back), and the record says whether the retrained float table's SHA-256 equals the recorded one."""
    cs, c = _W['cs'], _W['cfg']
    g = job['geometry']
    p = _path(job['table'], '.snap.txt')
    text = None
    if os.path.exists(p):
        with open(p, encoding='utf-8') as fh:
            text = fh.read()
    rec = {'table': job['table'], 'table_kind': job['table_kind'], 'geometry': g, 'd': job['d'], 'lr': job['lr'],
           'seed': job['seed'], 'snap_sha_recorded': job['snap_sha'], 'float_sha_recorded': job['float_sha']}
    if text is not None and L.snap_sha(text) == job['snap_sha']:
        offs, N = L.parse_snap_text(text)
        if tuple(offs) != tuple(cs.offsets):
            raise ValueError(f'{p}: the offsets are not the instance\'s')
        rec['source'] = 'cache'
    elif job['table_kind'] == 'tuning':
        run = _train(job, _W['inst'])
        rec['float_sha_retrained'] = run.table_sha
        if run.table is None:
            # READING (A10.9, "as many as exist"): a tuning table that diverges on retraining has no table to relabel;
            # it is reported and left out of control 1 (it cannot happen on the machine that ran tuning)
            rec.update(source='retrained, diverged', diverged_epoch=run.diverged_epoch)
            return rec
        N = L.snap(run.table, g)
        rec['snap_sha_retrained'] = L.snap_sha(L.snap_text(cs.offsets, N))
        rec['source'] = ('retrained, float SHA equal' if run.table_sha == job['float_sha']
                         else 'retrained, float SHA differs')
    else:
        raise ValueError(f'the snapped text of {job["table"]}, trained in this run, is missing or changed')
    ev = L.evaluate(L.snapped_arm(N, g), c['relabelled'])
    rec.update(closure_map=fstr(ev.map['closure']), graph_map=fstr(ev.map['graph']),
               holds=bool(l6.control1_holds(ev.map['closure'])))
    return rec


def job_geoopt(job):
    """A10.11's reported cross-check, run only when torch and geoopt import: one geoopt Lorentz(k=1)
    RiemannianSGD step against lexicon.embed.lorentz_batch, on synthetic batches (seeds 80700 + i) of the synthetic
    DAG trained 30 epochs at lr '1', d = 3; the largest relative difference of the updated rows. Reported only: an
    error is recorded, never raised (torch is not installed on the build machine, so this path has not run)."""
    try:
        return _geoopt()
    except Exception as e:
        return {'status': 'error', 'reason': f'{type(e).__name__}: {e}'}


def _geoopt():
    import torch
    import geoopt
    if TESTS not in sys.path:
        sys.path.insert(0, TESTS)
    import l6_synth
    from lexicon import stream as S
    cs = l6_synth.dag(SELFTEST_DAG_SEED)
    inst = EM.training_instance(cs)
    run = EM.train(inst, 'lorentz', 3, '1', 80700, epochs=30)
    if run.table is None:
        return {'status': 'not run', 'reason': 'the synthetic run diverged'}
    worst = 0.0
    eta = float('1')
    man = geoopt.Lorentz(k=1.0)
    for i in range(20):
        st = S.Stream(80700 + i)
        rows = st.below_many(np.full(EM.BATCH, inst.E, dtype=np.int64))
        U = inst.pos[rows, 0]
        C = np.empty((EM.BATCH, EM.NEGS + 1), dtype=np.int64)
        C[:, 0] = inst.pos[rows, 1]
        C[:, 1:] = st.negatives(U, EM.NEGS, inst.nn_ptr, inst.nn_flat)
        X = run.table.copy()
        EM.lorentz_batch(X, U, C, eta, EM.Diag())
        T = geoopt.ManifoldParameter(torch.tensor(run.table, dtype=torch.float64), manifold=man)
        opt = geoopt.optim.RiemannianSGD([T], lr=eta)
        u = T[torch.as_tensor(U)]
        cc = T[torch.as_tensor(C)]
        z = -(u[:, None, 1:] * cc[..., 1:]).sum(-1) + u[:, None, 0] * cc[..., 0]
        dist = torch.arccosh(torch.clamp(z, min=1.0))
        loss = (dist[:, 0] + torch.logsumexp(-dist, dim=1)).mean()
        opt.zero_grad()
        loss.backward()
        opt.step()
        Y = T.detach().numpy()
        touched = np.unique(np.concatenate([U, C.reshape(-1)]))
        a, b = X[touched], Y[touched]
        rel = np.abs(a - b).max(axis=1) / np.maximum(np.abs(a).max(axis=1), 1e-300)
        worst = max(worst, float(rel.max()))
    return {'status': 'run', 'batches': 20, 'largest_relative_difference': worst,
            'torch': torch.__version__, 'geoopt': getattr(geoopt, '__version__', None)}


JOBS = {'tuning': job_tuning, 'learned': job_learned, 'edge-shuffled': job_learned, 'floor': job_floor,
        'replay': job_replay, 'preflight': job_preflight, 'relabel': job_relabel, 'geoopt': job_geoopt}


# ================================================================ the pool
def est_seconds(job, cfg):
    """Scheduling only (longest first, build spec section 5): rough seconds per job on this machine."""
    k, d = job['kind'], job.get('d', 2)
    scale = cfg.epochs / 1000
    train = TRAIN_SECONDS.get(d, 60) * (1.4 if job.get('geometry') == 'lorentz' else 1.0) * scale
    ev = 1.5 + (6 if d >= 50 and job.get('geometry') == 'euclid' else 0)
    if k == 'replay':
        return 300 * scale + 1
    if k in ('tuning', 'preflight'):
        return train + ev
    if k in ('learned', 'edge-shuffled'):
        return train + 3 * ev + (8 if k == 'learned' else 0)
    if k == 'relabel':
        return ev + (train if job['table_kind'] == 'tuning' and job.get('retrain_likely') else 0)
    if k == 'geoopt':
        return 60
    return ev


def pool_size(cfg, todo):
    """The pool's size: the most worker processes that run at once (A10.11's "number of concurrent processes")."""
    return min(cfg.workers, max(1, len(todo)))


def run_pool(cfg, jobs, wcfg, cs, log, head, sig, phase, env_now=None):
    """Runs the jobs not already done (a runs.jsonl line at this HEAD and configuration whose cached files still
    have their SHA-256s), longest first, one single-threaded spawn process per job; returns {key: record}. A reused
    line trained under an environment other than this start's (env_now, its SHA-256) is reused all the same (A10.14:
    the run resumes from its finished jobs) and counted in the log; every record carries its own environment."""
    done = load_runs(cfg.cache)
    results, todo, stale, other_env = {}, [], 0, 0
    for job in jobs:
        line = done.get(job['key'])
        if line and line.get('head') == head and line.get('sig') == sig and cached_ok(cfg.cache, line['record']):
            results[job['key']] = dict(line['record'], resumed=True)
            other_env += env_now is not None and line['record'].get('environment_sha') != env_now
        else:
            stale += 1 if line else 0
            todo.append(job)
    todo.sort(key=lambda j: (-est_seconds(j, cfg), j['key']))
    size = pool_size(cfg, todo)
    log(f'{phase}: {len(jobs)} jobs, {len(jobs) - len(todo)} done before (runs.jsonl), {len(todo)} to run'
        + (f' ({stale} cached line(s) at another HEAD or configuration, or with a changed file, rerun)' if stale else '')
        + f', {size} worker process(es)')
    if other_env:
        log(f'NOTE: {other_env} reused job(s) of {phase} ran under an environment other than this start\'s '
            f'(numpy, numba, libc, SIMD or CPU); each record keeps its own (A10.4)')
    if not todo:
        return results
    t0 = time.perf_counter()
    ctx = multiprocessing.get_context('spawn')
    with ProcessPoolExecutor(max_workers=size, mp_context=ctx, initializer=_init_worker,
                             initargs=(dict(wcfg, pool_size=size), cs)) as ex:
        futs = {ex.submit(_run_job, j): j for j in todo}
        k = 0
        for f in as_completed(futs):
            key, rec, err = f.result()
            if err:
                for g in futs:
                    g.cancel()
                log(f'FAILED {key}:\n{err}')
                raise RuntimeError(f'job {key} failed')
            append_run(cfg.cache, {'key': key, 'head': head, 'sig': sig, 'time': utc_now(), 'record': rec})
            results[key] = rec
            k += 1
            log(f'  [{k}/{len(todo)}] {key}: {job_summary(rec)} ({rec["job_wall_s"]:.1f} s; '
                f'{time.perf_counter() - t0:.0f} s in)')
    return results


def environments_of(records, env_now):
    """The environments the step's job records ran under (A10.4), once each by SHA-256, and how many records each
    holds, beside this start's (env_now, its SHA-256)."""
    envs, counts = {}, {}
    for r in records:
        s = r.get('environment_sha') or 'not recorded'
        counts[s] = counts.get(s, 0) + 1
        if s != 'not recorded' and s not in envs:
            envs[s] = r.get('environment')
    return envs, {'this_start': env_now, 'records_by_environment': dict(sorted(counts.items())),
                  'all_this_start': set(counts) <= {env_now}}


def job_summary(rec):
    k = rec['kind']
    if k in ('tuning', 'learned', 'edge-shuffled'):
        if rec.get('diverged_epoch') is not None:
            return f'diverged at epoch {rec["diverged_epoch"]}'
        if k == 'tuning':
            return f'closure MAP {float(Fraction(rec["closure_map"])):.6f}'
        return (f'closure MAP {float(Fraction(rec["maps"]["closure"])):.6f}, graph-edge '
                f'{float(Fraction(rec["maps"]["graph"])):.6f}')
    if k == 'floor':
        return f'floor closure MAP {float(Fraction(rec["maps"]["closure"])):.6f}'
    if k == 'relabel':
        if 'closure_map' not in rec:
            return rec['source']
        return f'relabelled closure MAP {float(Fraction(rec["closure_map"])):.6f} ({rec["source"]})'
    if k == 'replay':
        return f'{len(rec["states"]) - 1} epochs replayed with hpstep.prng.Rng'
    if k == 'preflight':
        return f'float SHA-256 {str(rec["float_sha"])[:12]}...'
    return rec.get('status', '')


# ================================================================ readings
class Readings:
    def __init__(self):
        self.items = []

    def __call__(self, rid, text):
        if all(x['id'] != rid for x in self.items):
            self.items.append({'id': rid, 'text': text})


def common_readings(rd):
    rd('runner-1', 'A10.14 step 4 and 6, "refuses uncommitted changes": git status --porcelain --no-renames '
       '(untracked files listed one by one; a rename or copy counts both its paths) over the system folder and the '
       'reference folders of Hyperbolic Oracles and Engram Mind\'s Eye, whole (lexicon puts both on sys.path ahead of '
       'the standard library and imports hpstep and engram from them in place), must be empty, except the step\'s own '
       'outputs (so that an interrupted run resumes at the same HEAD); a sys.path entry inside the repository outside '
       'these folders is refused too. The check, with HEAD unchanged, is repeated before each worker pool starts '
       '(spawn workers import the code from disk afresh) and before the step writes its record; each check is listed '
       '(git_checks). "The only paths changed since the commit tuning ran on" (step 6) is git diff --name-only '
       '--no-renames, so a moved file names its old path too. --allow-dirty is refused in registered mode; in a dry '
       'run it marks the record "development run: not a registered run".')
    rd('runner-2', 'A10.14 "it resumes ... from its finished jobs": a runs.jsonl line is reused only at the same '
       'HEAD and configuration (mode, instance, epochs, burn-in, budget), and only while its cached float table, '
       'snapped text and per-query APs still have their recorded SHA-256s; anything else is rerun. A line trained '
       'under another environment is reused all the same ("that is the same run"): A10.4 has each run record its '
       'environment, so every job record carries the one its worker ran under (environment_sha, with the '
       'environments in run_environments), every start carries its own, and a reuse across environments is logged '
       'and counted (environments_summary).')
    rd('runner-3', 'A10.11 "wall-clock per run ... with the number of concurrent processes": time.perf_counter and '
       'time.process_time of the training, with the size of the pool that ran it (min(--workers, the jobs it ran): '
       'the most worker processes that run at once).')
    rd('runner-12', 'A10.4 "each run records the numpy, numba and libc versions and numpy\'s SIMD features": each job '
       'record holds the environment of the worker that ran it (Python, numpy, numba, llvmlite, libc, platform, '
       'numpy\'s CPU features and dispatch targets, the CPU model), computed inside the worker; the outputs give each '
       'run its environment_sha and list the environments once (run_environments).')
    rd('runner-4', 'A10.1 and A10.14, the replay check: the designated run\'s draws (tuning: (lorentz, 3, 0.03, '
       'first tuning seed); measure: measured (lorentz, 3, first training seed)) are replayed for every epoch of the '
       'budget with hpstep.prng.Rng, and the state after the run\'s last epoch (the epoch it diverged at, if it did) '
       'must equal its final state. If the designated cell is not run (no frozen lr, or the self-test\'s cells), the '
       'first run of the step in job order is replayed instead.')


# ================================================================ step: tune
def tuning_key(g, d, lr, seed):
    return f'tuning-{g}-d{d}-lr{lr}-s{seed}'


def trained_key(kind, g, d, lr, seed):
    return f'{kind}-{g}-d{d}-lr{lr}-s{seed}'


def worker_cfg(cfg, info, extra=None):
    w = {'mode': cfg.mode, 'cache': cfg.cache, 'epochs': cfg.epochs, 'burnin': cfg.burnin, 'workers': cfg.workers,
         'instance_id': info['instance_id'], 'instance_sha': info['instance_sha'], 'budget': info['budget'],
         'protocol_sha': l6.protocol_sha(), 'engine': l6.engine_string(), 'settings_sha': None,
         'diag_seeds': [cfg.seeds.diag(j) for j in range(DIAG_COUNT)], 'dT_path': None, 'relabelled': None}
    w.update(extra or {})
    return w


def tuning_paths(cfg):
    con = os.path.join(cfg.results, 'phase4-tuning-console.txt')
    return os.path.join(cfg.results, 'tuning.json'), con


def step_tune(cfg, ctx):
    log, rd = ctx['log'], ctx['readings']
    cs, info, head, sig = ctx['cs'], ctx['info'], ctx['git']['head'], ctx['sig']
    rd('runner-5', 'A10.8: tuning computes the exact snapped closure MAP of each finite table and nothing else (no '
       'graph-edge MAP, no float64 ranking); its per-query closure APs, float table, snapped text and epoch losses '
       'stay in the cache. tuning.json keeps the mean losses of epochs 0, 19, 99, 499 and 999.')
    tjobs = l6.tuning_jobs(cfg.seeds, cfg.cells, cfg.grid)
    jobs = [{'kind': 'tuning', 'key': tuning_key(j.geometry, j.d, j.lr, j.seed), 'geometry': j.geometry, 'd': j.d,
             'lr': j.lr, 'seed': j.seed, 'block': j.block} for j in tjobs]
    want = tuning_key('lorentz', 3, l6.GRID[0], cfg.seeds.tuning[0])
    target = next((j for j in jobs if j['key'] == want), jobs[0])
    rjob = {'kind': 'replay', 'key': f'replay-{target["key"]}', 'target': target['key'], 'seed': target['seed'],
            'd': target['d'], 'geometry': target['geometry']}
    log(f'tuning: {len(jobs)} runs ({len(cfg.cells)} cells x {len(cfg.grid)} rates x 4 seeds of the rate\'s block, '
        f'A10.8), and the replay of {target["key"]} with hpstep.prng.Rng')
    t0 = time.perf_counter()
    recheck_tree(cfg, ctx, 'before the tuning pool')
    res = run_pool(cfg, jobs + [rjob], worker_cfg(cfg, info), cs, log, head, sig, 'tuning', env_now=ctx['env_sha'])
    pool_s = time.perf_counter() - t0
    # the replay check (A10.1)
    tr, rp = res[target['key']], res[rjob['key']]
    ep = tr['epochs_run']
    replay = {'job': target['key'], 'designated': want, 'epoch_compared': ep, 'run_state': tr['final_state'],
              'replay_state': rp['states'][ep], 'stream': rp['stream'], 'equal': rp['states'][ep] == tr['final_state']}
    log(f'replay check: {target["key"]} after epoch {ep}: run {tr["final_state"]} vs hpstep.prng.Rng '
        f'{rp["states"][ep]}: {"EQUAL" if replay["equal"] else "DIFFERENT"}')
    if not replay['equal']:
        log('REFUSED: the replay\'s state differs from the run\'s; no tuning.json is written (A10.1)')
        return 1
    # the choice (A10.8)
    runs, cells = [], {}
    for g, d in cfg.cells:
        scores, rates = {}, {}
        for lr in cfg.grid:
            seeds = cfg.seeds.block(l6.GRID.index(lr))
            vals = []
            for s in seeds:
                r = res[tuning_key(g, d, lr, s)]
                vals.append(None if r.get('diverged_epoch') is not None else Fraction(r['closure_map']))
            scores[lr] = vals
            rates[lr] = {'seeds': list(seeds)}
        chosen, det = l6.choose_lr(scores)
        for lr, x in det['rates'].items():
            fin = [v for v in scores[lr] if v is not None]
            rates[lr].update(eligible=x['eligible'], diverged=x['diverged'], mean=x['mean'],
                             mean_float=None if x['mean'] is None else float(x['mean']),
                             closure_maps_float=[None if v is None else float(v) for v in scores[lr]],
                             finite=len(fin))
        cells[f'{g}-{d}'] = {'geometry': g, 'd': d, 'rates': rates, 'chosen': chosen,
                             'at_grid_end': det['at_grid_end']}
        log(f'  {g} d={d}: ' + ', '.join(
            f'{lr} ' + ('diverged' if not rates[lr]['eligible'] else f'{rates[lr]["mean_float"]:.6f}')
            for lr in cfg.grid) + f' -> {chosen}' + (' (at the grid\'s end: reported)' if det['at_grid_end'] else ''))
    order = {g: i for i, g in enumerate(l6.GEOMETRIES)}
    for j in sorted(jobs, key=lambda j: (order[j['geometry']], j['d'], l6.GRID.index(j['lr']), j['seed'])):
        r = res[j['key']]
        e = {'cell': f'{j["geometry"]}-{j["d"]}', 'geometry': j['geometry'], 'd': j['d'], 'lr': j['lr'],
             'seed': j['seed'], 'block': j['block'], 'diverged_epoch': r['diverged_epoch'],
             'epochs_run': r['epochs_run'], 'float_sha': r['float_sha'], 'snap_sha': r.get('snap_sha'),
             'closure_map': None if r.get('closure_map') is None else Fraction(r['closure_map']),
             'guard_hits': r['guard_hits'], 'max_step': r['max_step'], 'max_radius': r['max_radius'],
             'loss': r['loss'], 'final_state': r['final_state'], 'wall_s': r['wall_s'], 'cpu_s': r['cpu_s'],
             'concurrent_processes': r['concurrent_processes'], 'environment_sha': r.get('environment_sha'),
             'resumed': bool(r.get('resumed')), 'lbench': r.get('lbench'), 'lbench_sha': r.get('lbench_sha')}
        runs.append(e)
    recheck_tree(cfg, ctx, 'before writing tuning.json')
    envs, env_summary = environments_of(list(res.values()), ctx['env_sha'])
    if not env_summary['all_this_start']:
        log(f'NOTE: the tuning jobs ran under {len(env_summary["records_by_environment"])} environment(s), not all '
            f'this start\'s: {env_summary["records_by_environment"]}')
    tuning = {'label': ctx['label'], 'mode': cfg.mode, 'step': 'tune', 'head': head, 'git': ctx['git'],
              'git_checks': ctx['git_checks'], 'development_run': ctx['mark'], 'starts': ctx['starts'],
              'environment': ctx['env'], 'run_environments': envs, 'environments_summary': env_summary,
              'instance': info, 'readings': rd.items, 'grid': list(cfg.grid), 'cells_run': [list(c) for c in cfg.cells],
              'seeds': {'tuning': list(cfg.seeds.tuning),
                        'blocks': {lr: list(cfg.seeds.block(l6.GRID.index(lr))) for lr in cfg.grid}},
              'budget': info['budget'], 'protocol_sha': l6.protocol_sha(), 'runs': runs, 'replay_check': replay,
              'cells': cells, 'diverged_runs': [r['cell'] + f' lr {r["lr"]} seed {r["seed"]}' for r in runs
                                                if r['diverged_epoch'] is not None],
              'timing': {'pool_s': pool_s, 'total_s': time.perf_counter() - ctx['t0']}}
    if cfg.mode == 'selftest':
        tuning['selftest'] = SELFTEST_BANNER
    tpath, _ = tuning_paths(cfg)
    if all(res[j['key']].get('resumed') for j in jobs) and same_tuning(tpath, tuning):
        # READING (A10.14, "the same run"): a restart that finds every job finished and tuning.json already holding
        # exactly these runs and this choice leaves it (and its settings) unchanged, so that settings.json's SHA-256
        # does not move under a measure step that is resuming; the start is listed in the cache
        log(f'{display_path(tpath)} already holds these {len(runs)} runs and this choice: left unchanged')
        if cfg.mode in ('dry', 'selftest') and not os.path.exists(settings_file(cfg)):
            write_settings_file(cfg, log)
        return 0
    text = jdump(tuning)
    write_atomic(tpath, text)
    log(f'wrote {display_path(tpath)} (SHA-256 {sha256(text)})')
    if cfg.mode in ('dry', 'selftest'):     # dry needs no amendment: its settings are written here (build spec 4.2)
        write_settings_file(cfg, log)
    return 0


def same_tuning(path, tuning):
    """Whether tuning.json at path already holds these runs (resumed flags aside), cells, replay check and HEAD."""
    if not os.path.exists(path):
        return False
    with open(path, encoding='utf-8') as fh:
        old = json.load(fh)
    new = json.loads(jdump(tuning))

    def strip(runs):
        return [{k: v for k, v in r.items() if k != 'resumed'} for r in runs]
    return (old.get('head') == new['head'] and strip(old.get('runs', [])) == strip(new['runs'])
            and old.get('cells') == new['cells'] and old.get('replay_check') == new['replay_check']
            and old.get('instance', {}).get('instance_sha') == new['instance']['instance_sha'])


def display_path(p):
    try:
        rel = os.path.relpath(p, HERE)
        return p if rel.startswith('..') else rel
    except ValueError:
        return p


# ================================================================ step: write-settings
def settings_file(cfg):
    return l6.settings_path(cfg.mode, cfg.results if cfg.mode == 'selftest' else None)


def tuning_file_label(cfg):
    if cfg.mode == 'selftest':
        return 'tuning.json'
    return os.path.relpath(tuning_paths(cfg)[0], SYSTEM).replace(os.sep, '/')


def write_settings_file(cfg, log):
    """settings.json from tuning.json's choice (build spec 4.3): each cell's rate as its grid string, or null."""
    tpath, _ = tuning_paths(cfg)
    with open(tpath, 'rb') as fh:
        raw = fh.read()
    tuning = json.loads(raw)
    rates = {}
    for g, d in [tuple(c) for c in tuning['cells_run']]:
        rates[(g, d)] = tuning['cells'][f'{g}-{d}']['chosen']
    cells = tuple((g, d) for g, d in [tuple(c) for c in tuning['cells_run']])
    text = l6.settings_text(rates, {'file': tuning_file_label(cfg), 'head': tuning['head'],
                                    'sha256': hashlib.sha256(raw).hexdigest()}, cells=cells)
    path = settings_file(cfg)
    write_atomic(path, text)
    s = sha256(text)
    log(f'wrote {display_path(path)}: SHA-256 {s}')
    return s


def step_write_settings(cfg, log):
    gs = git_state()
    check_tree(cfg.mode, 'write-settings', gs, False)
    tpath, _ = tuning_paths(cfg)
    rel = REL_REF + '/results/tuning.json'
    if not os.path.exists(tpath):
        raise Refused('no results/tuning.json: run --tune first')
    if rel in gs['changed']:
        raise Refused('results/tuning.json is not committed (A10.8: the lr-freeze amendment gives the committed file)')
    s = write_settings_file(cfg, log)
    print(f'settings.json SHA-256 (for the lr-freeze amendment): {s}')
    return 0


# ================================================================ step: measure
def measure_paths(cfg):
    r = cfg.results
    return {'json': os.path.join(r, 'claims-phase4.json'), 'md': os.path.join(r, 'claims-phase4.md'),
            'console': os.path.join(r, 'phase4-console.txt'), 'lbench': os.path.join(r, 'lbench-phase4.txt'),
            'tables': os.path.join(r, 'l6-tables')}


def preflight_settings(cfg, ctx):
    """Build spec 4.4 step 1: tuning.json, settings.json, the lr-freeze amendment, the paths changed since tuning."""
    log, rd = ctx['log'], ctx['readings']
    tpath, tcon = tuning_paths(cfg)
    spath = settings_file(cfg)
    for p in (tpath, spath):
        if not os.path.exists(p):
            raise Refused(f'{display_path(p)} is missing: run --tune{" --dry" if cfg.mode == "dry" else ""}'
                          + ('' if cfg.mode != 'registered' else ' and --write-settings'))
    with open(tpath, 'rb') as fh:
        traw = fh.read()
    tuning = json.loads(traw)
    tsha = hashlib.sha256(traw).hexdigest()
    with open(spath, 'rb') as fh:
        sraw = fh.read()
    ssha = hashlib.sha256(sraw).hexdigest()
    sobj = json.loads(sraw)
    try:
        rates = l6.read_settings(sraw.decode('utf-8'), cells=cfg.cells)
    except (ValueError, KeyError) as e:
        raise Refused(f'settings.json: {e}')
    chosen = {(g, d): tuning['cells'][f'{g}-{d}']['chosen'] for g, d in cfg.cells}
    if rates != chosen:
        raise Refused(f'settings.json\'s rates {rates} are not tuning.json\'s choice {chosen}')
    if sobj['tuning']['sha256'] != tsha or sobj['tuning']['head'] != tuning['head']:
        raise Refused('settings.json does not name this tuning.json (SHA-256 and HEAD)')
    if tuning['instance']['instance_sha'] != ctx['info']['instance_sha']:
        raise Refused('tuning.json was run on another instance')
    if tuning['mode'] != cfg.mode:
        raise Refused(f'tuning.json is a {tuning["mode"]} run')
    if not tuning['replay_check']['equal']:
        raise Refused('tuning.json\'s replay check failed')
    if cfg.mode == 'registered' and tuning.get('development_run'):
        raise Refused(f'tuning.json is marked "{tuning["development_run"]}"')
    out = {'tuning_path': display_path(tpath), 'tuning_sha256': tsha, 'tuning_head': tuning['head'],
           'settings_path': display_path(spath), 'settings_sha256': ssha,
           'rates': {f'{g}-{d}': r for (g, d), r in rates.items()}, 'freeze_amendment': None,
           'changed_since_tuning': None}
    head = ctx['git']['head']
    if cfg.mode in ('registered', 'dry'):
        code, _ = git('merge-base', '--is-ancestor', tuning['head'], head)
        code2, changed = changed_between(tuning['head'], head)      # renames off: a moved file names both paths
        out['changed_since_tuning'] = changed
        out['tuning_head_is_ancestor'] = code == 0
        if cfg.mode == 'registered':
            allowed = {REL_SYS + '/PREREGISTRATION.md', REL_REF + '/settings.json',
                       REL_REF + '/results/tuning.json', REL_REF + '/results/phase4-tuning-console.txt'}
            if code != 0 or code2 != 0:
                raise Refused(f'the commit tuning ran on ({tuning["head"]}) is not an ancestor of HEAD')
            bad = [p for p in changed if p not in allowed]
            if bad:
                raise Refused('paths changed since the commit tuning ran on, other than PREREGISTRATION.md, '
                              'settings.json, tuning.json and tuning\'s console (A10.14 step 6): ' + '; '.join(bad))
            with open(l6.PREREGISTRATION, encoding='utf-8') as fh:
                try:
                    out['freeze_amendment'] = l6.freeze_amendment(fh.read(), ssha)
                except ValueError as e:
                    raise Refused(f'the lr-freeze amendment (A10.8): {e}')
            log(f'pre-flight: tuning at {tuning["head"][:12]}, changed since: {", ".join(changed) or "nothing"}; '
                f'the lr freeze is Amendment {out["freeze_amendment"]}')
        else:
            rd('runner-6', 'Dry measure: the paths changed since dry tuning\'s commit are recorded, not refused (a dry '
               'fix is committed and the affected dry part rerun, A10.14 step 3); no lr-freeze amendment is looked '
               'for (dry needs none, build spec 4.4).')
            log(f'pre-flight (dry): tuning at {tuning["head"][:12]}; {len(changed)} path(s) changed since')
    return tuning, tsha, rates, ssha, out


def exact_arm(cfg, ctx, settings_sha):
    """The exact arm (A10.2): h3tree.arm over the L3 words of the set, ranked in the main process (fork pool):
    APs, MAPs, fractional-tie MAPs, mean ranks, ties, bits per node, distortion with tau = ln 7 (rank.distortion),
    the canonical H3 lines' SHA-256 and its LBENCH/1 record."""
    log, cs, info = ctx['log'], ctx['cs'], ctx['info']
    t0 = time.perf_counter()
    arm = H3.arm(cs.words)
    nb = {'closure': cs.closure_nb, 'graph': cs.graph_nb}
    ev = L.evaluate(arm, nb, workers=cfg.workers, fractional=True)
    pts = H3.points(cs.words)
    bm, bx = R.bits_per_node(pts, [H3.den(len(w)) for w in cs.words])
    dist = R.distortion(arm, L.all_pairs(cs.n), cs.words)
    text = l6.exact_arm_snap_text(cs.offsets, cs.words)
    wcfg = ctx['wcfg']
    rec = {'arm': 'exact-h3', 'maps': _maps(ev), 'frac_map': {k: fstr(v) for k, v in ev.frac_map.items()},
           'mean_rank': {k: fstr(v) for k, v in ev.mean_rank.items()},
           'ties': {'exact': ev.ties, 'exact_queries': ev.tied_queries},
           'bits': {'mean': fstr(bm), 'mean_float': float(bm), 'max': bx},
           'distortion': {'value': dist, 'tau': H3.TAU, 'how': 'rank.distortion over every unordered pair'},
           'snap_sha': sha256(text), 'snap_text': text, 'words_max_length': max(len(w) for w in cs.words),
           'aps': {'closure': ev.aps['closure'], 'graph': ev.aps['graph']}, 'seconds': time.perf_counter() - t0}
    rec['lbench'], rec['lbench_sha'] = lbench_record(
        wcfg, 'exact-h3', 'h3', 3, None, None, settings_sha=settings_sha, budget=None, float_sha=None, snap_bits=None,
        snap_sha=rec['snap_sha'], cmap=ev.map['closure'], gmap=ev.map['graph'], wall_ms=None)
    ctx['readings']('runner-7', 'A10.12 for the exact arm: d is 3 (H3); seed, lr, budget, floatTableSha, snapBits '
                    'and wallMs do not apply (-); settingsSha is the decisive run\'s. A floor\'s record has its i as '
                    'the seed, and lr, budget and wallMs -. A tuning record has settingsSha, graphMapSha and graphMap '
                    '- (build spec 4.2).')
    log(f'exact arm: closure MAP {float(ev.map["closure"]):.6f}, graph-edge {float(ev.map["graph"]):.6f}, '
        f'{ev.ties} exact ties, bits {float(bm):.1f}/{bx}, distortion {dist:.4f} ({rec["seconds"]:.1f} s)')
    return rec


def tree_distances_cached(cfg, cs, log):
    path = os.path.join(cfg.cache, f'dT-{cs.instance_sha[:12]}.npy')
    if os.path.exists(path):
        dT = np.load(path)
        if dT.shape == (cs.n * (cs.n - 1) // 2,):
            return path
    t0 = time.perf_counter()
    save_npy(path, L.tree_distances(cs.words))
    log(f'd_T of every unordered pair: {display_path(path)} ({time.perf_counter() - t0:.1f} s)')
    return path


_IV = {}


def _iv_task(t):
    name, xk, yk, metric, keep = t
    ax, ay = _IV['aps'][xk][metric], _IV['aps'][yk][metric]
    return name, l6.interval(ax, ay, _IV['keep'] if keep else None)


def compute_intervals(tasks, aps, keep, workers):
    """Every interval at once, each with rank.ci_mean started afresh (default_rng(7)): a fork pool, results in task
    order (each interval is a function of its values alone)."""
    _IV.update(aps=aps, keep=keep)
    try:
        if workers <= 1 or len(tasks) < 4:
            out = [_iv_task(t) for t in tasks]
        else:
            with multiprocessing.get_context('fork').Pool(workers) as pool:
                out = pool.map(_iv_task, tasks, chunksize=1)
    finally:
        _IV.clear()
    return dict(out)


def iv_json(iv, present=None):
    if iv is None:
        return None
    out = {'mean': iv['mean'], 'lo': iv['lo'], 'hi': iv['hi'], 'n': iv['n'], 'ordered': iv['ordered'],
           'values_sha': iv['values_sha'], 'map_x': iv['map_x_float'], 'map_y': iv['map_y_float'],
           'map_x_sha': sha256(iv['map_x']), 'map_y_sha': sha256(iv['map_y']), 'map_diff': iv['map_diff_float']}
    if present is not None:
        out['present'] = present
    return out


def diag_summary(vals, p_map):
    v = np.asarray(vals, dtype=float)
    p = float(p_map)
    return {'count': len(vals), 'min': float(v.min()), 'median': float(np.median(v)),
            'p99': float(np.percentile(v, 99)), 'max': float(v.max()),
            'share_above_0.05': float(np.count_nonzero(v > 0.05)) / len(v),
            'P_map': p, 'P_rank_from_top': 1 + int(np.count_nonzero(v > p)),
            'at_or_above_P': int(np.count_nonzero(v >= p))}



# A10.7's comparisons, X - Y per seed: (metric, X, Y); 'exact' is the exact H3 arm. Pinned by
# tests/test_runner_phase4.py::test_comparisons_are_amendment_10_item_7, so a rewiring cannot pass unnoticed.
COMP_SPEC = {'a2': ('closure', ('lorentz', 2), ('euclid', 2)), 'a3': ('closure', ('lorentz', 3), ('euclid', 3)),
             'b': ('closure', ('lorentz', 50), ('euclid', 50)), 'c': ('graph', 'exact', ('lorentz', 3)),
             'd': ('closure', ('lorentz', 3), 'exact')}

def step_measure(cfg, ctx):
    log, rd = ctx['log'], ctx['readings']
    cs, info, head, sig = ctx['cs'], ctx['info'], ctx['git']['head'], ctx['sig']
    paths = measure_paths(cfg)
    seeds = cfg.seeds
    T = {'start': time.perf_counter()}
    # 1. pre-flight
    tuning, tsha, rates, ssha, pre = preflight_settings(cfg, ctx)
    wcfg = worker_cfg(cfg, info, {'settings_sha': ssha})
    ctx['wcfg'] = wcfg
    cells_lr = [(g, d) for g, d in cfg.cells if rates[(g, d)] is not None]
    log(f'settings {display_path(settings_file(cfg))} ({ssha[:12]}...): '
        + ', '.join(f'{g} {d}: {rates[(g, d)]}' for g, d in cfg.cells))
    # 2. the exact arm and d_T (main process, before any pool)
    ex = exact_arm(cfg, ctx, ssha)
    wcfg['dT_path'] = tree_distances_cached(cfg, cs, log)
    T['exact_s'] = time.perf_counter() - T['start']
    # 3. pool jobs: measured, edge-shuffled, floors, replay, pre-flight retraining (geoopt if it imports)
    jobs = []
    for g, d in cells_lr:
        lr = rates[(g, d)]
        for j, s in enumerate(seeds.training):
            jobs.append({'kind': 'learned', 'key': trained_key('learned', g, d, lr, s), 'geometry': g, 'd': d,
                         'lr': lr, 'seed': s, 'j': j})
            jobs.append({'kind': 'edge-shuffled', 'key': trained_key('edge-shuffled', g, d, lr, s), 'geometry': g,
                         'd': d, 'lr': lr, 'seed': s, 'j': j, 'pairs_seed': seeds.edge(j)})
    for g, d in cfg.cells:
        for j in range(len(seeds.training)):
            jobs.append({'kind': 'floor', 'key': f'floor-{g}-d{d}-i{j}', 'geometry': g, 'd': d, 'i': j,
                         'floor_seed': seeds.floor(j)})
    learned_jobs = [j for j in jobs if j['kind'] == 'learned']
    want = trained_key('learned', 'lorentz', 3, rates.get(('lorentz', 3)), seeds.training[0])
    target = next((j for j in learned_jobs if j['key'] == want), learned_jobs[0] if learned_jobs else None)
    if target is not None:
        jobs.append({'kind': 'replay', 'key': f'replay-{target["key"]}', 'target': target['key'],
                     'seed': target['seed'], 'd': target['d'], 'geometry': target['geometry']})
    # A10.14 step 6: the tuning jobs (euclid, 2, 0.03, first seed) and (lorentz, 2, 0.03, first seed) retrained
    lr0 = cfg.grid[0]
    s0 = seeds.block(l6.GRID.index(lr0))[0]
    pre_jobs = []
    for g in ('euclid', 'lorentz'):
        if (g, 2) in cfg.cells:
            tk = tuning_key(g, 2, lr0, s0)
            pre_jobs.append({'kind': 'preflight', 'key': f'preflight-{tk}', 'target': tk, 'geometry': g, 'd': 2,
                             'lr': lr0, 'seed': s0})
    jobs += pre_jobs
    rd('runner-8', 'A10.14 step 6, the reproducibility check: the tuning jobs (euclid, 2, the grid\'s first rate, '
       'the first seed of its block) and (lorentz, 2, the same) are retrained in workers and their float SHA-256s '
       'compared with tuning.json\'s; a mismatch is recorded and disclosed and does not stop the run.')
    import importlib.util
    geo_ok = cfg.mode != 'selftest' and importlib.util.find_spec('torch') and importlib.util.find_spec('geoopt')
    if geo_ok:
        jobs.append({'kind': 'geoopt', 'key': 'geoopt'})
    if not learned_jobs:
        log('no cell has a frozen lr: no measured or edge-shuffled run')
    sig = sig + '-S' + ssha[:12]          # measured jobs carry settingsSha: reused only under the same settings
    recheck_tree(cfg, ctx, 'before the training pool')
    res = run_pool(cfg, jobs, wcfg, cs, log, head, sig, 'measure (training, floors, replay, pre-flight)',
                   env_now=ctx['env_sha'])
    T['pool_a_s'] = time.perf_counter() - T['start'] - T['exact_s']
    # 4. the replay check
    replay = None
    if target is not None:
        tr, rp = res[target['key']], res[f'replay-{target["key"]}']
        ep = tr['epochs_run']
        replay = {'job': target['key'], 'designated': want, 'epoch_compared': ep, 'run_state': tr['final_state'],
                  'replay_state': rp['states'][ep], 'stream': rp['stream'],
                  'equal': rp['states'][ep] == tr['final_state']}
        log(f'replay check: {target["key"]} after epoch {ep}: {"EQUAL" if replay["equal"] else "DIFFERENT"}')
        if not replay['equal']:
            log('REFUSED: the replay\'s state differs from the run\'s; no decision is written (A10.1)')
            return 1
    preflight = dict(pre)
    preflight['reproducibility'] = []
    truns = {tuning_key(r['geometry'], r['d'], r['lr'], r['seed']): r for r in tuning['runs']}
    for pj in pre_jobs:
        r, t = res[pj['key']], truns.get(pj['target'])
        eq = t is not None and r['float_sha'] == t['float_sha'] and r['diverged_epoch'] == t['diverged_epoch']
        preflight['reproducibility'].append({'job': pj['target'], 'float_sha_tuning': None if t is None else
                                             t['float_sha'], 'float_sha_now': r['float_sha'], 'equal': eq,
                                             'wall_s': r['wall_s'], 'environment_sha_tuning': None if t is None else
                                             t.get('environment_sha'),
                                             'environment_sha_now': r.get('environment_sha')})
        log(f'pre-flight retraining {pj["target"]}: float SHA-256 {"equal" if eq else "DIFFERS (disclosed)"}')
    # 5. control 1: P, once, in the main process (registered: Rng(7), its first and only computation)
    t1 = time.perf_counter()
    n = cs.n
    P = l6.label_permutation(seeds.label, n)
    log(f'control 1: P = Rng({seeds.label}).shuffle(list(range({n}))) computed (its first computation in this '
        f'{cfg.mode} run); SHA-256 of P {sha256(",".join(map(str, P)))[:16]}...')
    Q = l6.inverse(P)
    relabelled = {'graph': l6.relabel(cs.graph_nb, P), 'closure': l6.relabel(cs.closure_nb, P)}
    rjobs = []
    for t in tuning['runs']:
        if t['diverged_epoch'] is not None:
            continue
        key = tuning_key(t['geometry'], t['d'], t['lr'], t['seed'])
        rjobs.append({'kind': 'relabel', 'key': f'relabel-{key}', 'table': key, 'table_kind': 'tuning',
                      'geometry': t['geometry'], 'd': t['d'], 'lr': t['lr'], 'seed': t['seed'],
                      'snap_sha': t['snap_sha'], 'float_sha': t['float_sha'],
                      'retrain_likely': not os.path.exists(table_path(cfg.cache, key, '.snap.txt'))})
    for j in jobs:
        if j['kind'] in ('learned', 'edge-shuffled'):
            r = res[j['key']]
            if r.get('diverged_epoch') is None:
                rjobs.append({'kind': 'relabel', 'key': f'relabel-{j["key"]}', 'table': j['key'],
                              'table_kind': j['kind'], 'geometry': j['geometry'], 'd': j['d'], 'lr': j['lr'],
                              'seed': j['seed'], 'snap_sha': r['snap_sha'], 'float_sha': r['float_sha']})
    wcfg_b = dict(wcfg, relabelled=relabelled)
    psig = sig + '-P' + sha256(','.join(map(str, P)))[:12]
    recheck_tree(cfg, ctx, 'before the control-1 pool')
    res_b = run_pool(cfg, rjobs, wcfg_b, cs, log, head, psig, 'control 1 (the label shuffle)', env_now=ctx['env_sha'])
    T['control1_s'] = time.perf_counter() - t1
    # 6. assemble the runs
    t2 = time.perf_counter()
    order_g = {g: i for i, g in enumerate(l6.GEOMETRIES)}

    def sort_key(j):
        return (j['kind'], order_g.get(j.get('geometry'), 9), j.get('d', 0), j.get('lr') or '', j.get('seed', 0),
                j.get('i', 0))
    learned, shuffled, floors = {}, {}, {}
    aps = {'exact': {'closure': ex['aps']['closure'], 'graph': ex['aps']['graph']}}
    for j in sorted(jobs, key=sort_key):
        r = res[j['key']]
        if j['kind'] == 'learned':
            learned[(j['geometry'], j['d'], j['seed'])] = r
        elif j['kind'] == 'edge-shuffled':
            shuffled[(j['geometry'], j['d'], j['seed'])] = r
        elif j['kind'] == 'floor':
            floors[(j['geometry'], j['d'], j['i'])] = r
        else:
            continue
        if r.get('aps_sha'):
            ak = j['key']
            aps[ak] = load_aps(cfg.cache, ak, r['aps_sha'])

    def ok(r):
        return r is not None and r.get('diverged_epoch') is None and r.get('maps') is not None
    keep = l6.keep_mask(cs.graph_nb)
    # 7. intervals
    tasks, seen = [], set()

    def task(name, xk, yk, metric):
        if name not in seen:
            seen.add(name)
            tasks.append((name, xk, yk, metric, metric == 'graph'))
        return name
    lkey = {(g, d, s): trained_key('learned', g, d, rates[(g, d)], s) for g, d in cells_lr for s in seeds.training}
    skey = {(g, d, s): trained_key('edge-shuffled', g, d, rates[(g, d)], s) for g, d in cells_lr
            for s in seeds.training}
    have = {k for k, r in learned.items() if ok(r)}
    have_s = {k for k, r in shuffled.items() if ok(r)}
    c2_names = {}
    for g, d in cells_lr:
        for s in seeds.training:
            if (g, d, s) in have and (g, d, s) in have_s:
                c2_names[(g, d, s)] = (task(f'c2|{g}|{d}|{s}|closure', lkey[(g, d, s)], skey[(g, d, s)], 'closure'),
                                       task(f'c2|{g}|{d}|{s}|graph', lkey[(g, d, s)], skey[(g, d, s)], 'graph'))
    comp_spec = COMP_SPEC

    def side(x, s):
        return 'exact' if x == 'exact' else lkey.get((x[0], x[1], s))

    def exists(x, s):
        return x == 'exact' or (x[0], x[1], s) in have
    dec_names = {}
    for comp, (metric, x, y) in comp_spec.items():
        for s in seeds.training:
            if exists(x, s) and exists(y, s):
                dec_names[(comp, s)] = task(f'{comp}|{s}', side(x, s), side(y, s), metric)
    rep_names = {'learned_minus_floor': {}, 'lorentz_minus_euclid': {}, 'exact_minus_learned_graph': {},
                 'learned_minus_exact_closure': {}}
    for g, d in cells_lr:
        for j, s in enumerate(seeds.training):
            if (g, d, s) not in have:
                continue
            fk = f'floor-{g}-d{d}-i{j}'
            for metric in ('closure', 'graph'):
                rep_names['learned_minus_floor'][(g, d, s, metric)] = task(
                    f'lf|{g}|{d}|{s}|{metric}', lkey[(g, d, s)], fk, metric)
            rep_names['exact_minus_learned_graph'][(g, d, s)] = task(f'el|{g}|{d}|{s}', 'exact', lkey[(g, d, s)],
                                                                     'graph')
            rep_names['learned_minus_exact_closure'][(g, d, s)] = task(f'le|{g}|{d}|{s}', lkey[(g, d, s)], 'exact',
                                                                       'closure')
    for d in sorted({d for _, d in cfg.cells}):
        for s in seeds.training:
            if ('lorentz', d, s) in have and ('euclid', d, s) in have:
                for metric in ('closure', 'graph'):
                    if metric == 'closure' and d in (2, 3, 50):
                        continue                  # deciding at d = 2, 3, 50
                    rep_names['lorentz_minus_euclid'][(d, s, metric)] = task(
                        f'lme|{d}|{s}|{metric}', lkey[('lorentz', d, s)], lkey[('euclid', d, s)], metric)
    log(f'intervals: {len(tasks)} (rank.ci_mean, default_rng({seeds.bootstrap}) afresh for each)')
    ivs = compute_intervals(tasks, aps, keep, cfg.workers)
    T['intervals_s'] = time.perf_counter() - t2
    # 8. control 2 and presence
    control2, c2_out = {}, {}
    for g, d in cells_lr:
        for s in seeds.training:
            names = c2_names.get((g, d, s))
            if names is None:
                control2[(g, d, s)] = None
                c2_out[(g, d, s)] = {'closure': None, 'graph': None, 'holds': None,
                                     'reason': 'not established: a run of the pair diverged'}
            else:
                ivc, ivg = ivs[names[0]], ivs[names[1]]
                control2[(g, d, s)] = l6.control2_entry(ivc, ivg)
                c2_out[(g, d, s)] = {'closure': iv_json(ivc), 'graph': iv_json(ivg), 'holds': control2[(g, d, s)]}
    rd('runner-9', 'A10.9, control 2 "established": an entry is True or False when both runs of the pair exist '
       '(l6.present\'s READING), None when either diverged; a cell without a frozen lr has no entry and no seed '
       'present.')
    deciding = {}

    def dec_iv(comp, s):
        name = dec_names.get((comp, s))
        pres = l6.present(comp, s, have, control2)
        iv = ivs.get(name) if name else None
        deciding.setdefault(comp, {})[s] = iv_json(iv, present=pres) if iv else {'present': False,
                                                                                 'interval': None}
        return iv if pres else None
    parts = {'a': l6.part_a({2: [dec_iv('a2', s) for s in seeds.training],
                             3: [dec_iv('a3', s) for s in seeds.training]}),
             'b': l6.part_b([dec_iv('b', s) for s in seeds.training]),
             'c': l6.part_c([dec_iv('c', s) for s in seeds.training]),
             'd': l6.part_d([dec_iv('d', s) for s in seeds.training])}
    # control 1
    control1, c1_tables = {}, []
    for j in sorted(rjobs, key=lambda j: j['key']):
        r = res_b[j['key']]
        entry = {'table': j['table'], 'kind': j['table_kind'], 'source': r['source'],
                 'closure_map': fparse(r.get('closure_map')), 'graph_map': compact(fparse(r.get('graph_map'))),
                 'holds': r.get('holds'), 'snap_sha': j['snap_sha'], 'float_sha_recorded': j['float_sha'],
                 'float_sha_retrained': r.get('float_sha_retrained')}
        c1_tables.append(entry)
        if r.get('closure_map') is not None:
            control1[j['table']] = Fraction(r['closure_map'])
    decision = l6.decide_l6(parts, control1, control2)
    # control 1 diagnostics
    root_i = cs.offsets.index(cs.root)
    sec = info['second_label']['index']
    labels = []
    for lab in (root_i, sec):
        row = Q[lab]
        labels.append({'label': cs.offsets[lab], 'label_index': lab, 'label_closure_neighbours':
                       len(cs.closure_nb[lab]), 'takes_point_of_row': row, 'row_offset': cs.offsets[row],
                       'row_closure_neighbours': len(cs.closure_nb[row])})
    rd('runner-10', 'A10.9\'s diagnostics: the labels are the root and the node with the most closure neighbours '
       'after it (mammals: mammal.n.01 and placental.n.01; dry: solid.n.01 and that node); "the label L takes the '
       'point of row Q[L]" (Q = P^-1). Per measured table, the 200 diagnostic MAPs (float64, from the rank '
       'structure) give min, median, 99th percentile (numpy, linear), max and the share above 0.05; P\'s rank is 1 + '
       'the number of diagnostic MAPs strictly above P\'s exact relabelled closure MAP.')
    rd('runner-11', 'A10.9\'s reported "relabelled closure MAP of each measured table under 200 further permutations '
       'Rng(2100 + j)": computed in binary64, not as exact rationals. The order and the ties are the snapped table\'s '
       'exact ones (learned.rank_structure from the exact keys, the ranking control 1 evaluates); only each AP\'s sum '
       '(rank._ap_and_ranks\'s pessimistic ranks, added in binary64) and the mean (math.fsum) are floats '
       '(learned.map_float_structure). A10.9 says "computed exactly" of P\'s relabelled MAP, which decides control 1 '
       'and is exact here; the 200 decide nothing, and A10.9 reads them only for where P sits among them (their '
       'summary, and P\'s rank, compare floats).')
    diag = {}
    for (g, d, s), r in learned.items():
        if ok(r) and r.get('diag') is not None and lkey[(g, d, s)] in control1:
            diag[(g, d, s)] = diag_summary(r['diag'], control1[lkey[(g, d, s)]])
    # L4(c)
    order40, deltas, l4c_tables = [], [], []
    for kind, store in (('learned', learned), ('edge-shuffled', shuffled)):
        for g, d in l6.L4C_CELLS:
            for s in seeds.training:
                r = store.get((g, d, s))
                order40.append((kind, g, d, s))
                if ok(r):
                    dc, dg = Fraction(r['delta']['closure']), Fraction(r['delta']['graph'])
                    deltas.append((dc, dg))
                    l4c_tables.append({'table': f'{kind}-{g}-d{d}-s{s}', 'delta_closure': compact(dc),
                                       'delta_graph': compact(dg), 'delta': compact(max(dc, dg)),
                                       'displacement': r['displacement'],
                                       'coarse_delta_closure': compact(Fraction(r['coarse']['delta']['closure'])),
                                       'coarse_delta_graph': compact(Fraction(r['coarse']['delta']['graph'])),
                                       'ties_exact': r['ties']['exact'], 'ties_float': r['ties']['float'],
                                       'ties_coarse': r['coarse']['ties']})
                else:
                    deltas.append(None)
                    why = ('no frozen lr' if (g, d) not in cells_lr else
                           f'diverged at epoch {r["diverged_epoch"]}' if r is not None else 'missing')
                    l4c_tables.append({'table': f'{kind}-{g}-d{d}-s{s}', 'missing': why})
    l4c = l6.decide_l4c(deltas, expected=len(order40))
    others = []
    for kind, store in (('learned', learned), ('edge-shuffled', shuffled)):
        for (g, d, s), r in sorted(store.items(), key=lambda kv: (order_g[kv[0][0]], kv[0][1], kv[0][2])):
            if d in (2, 3) or not ok(r):
                continue
            others.append({'table': f'{kind}-{g}-d{d}-s{s}', 'delta_closure': compact(Fraction(r['delta']['closure'])),
                           'delta_graph': compact(Fraction(r['delta']['graph'])), 'displacement': r['displacement'],
                           'ties_exact': r['ties']['exact'], 'ties_float': r['ties']['float']})
    for (g, d, i), r in sorted(floors.items(), key=lambda kv: (order_g[kv[0][0]], kv[0][1], kv[0][2])):
        others.append({'table': f'floor-{g}-d{d}-i{i}', 'delta_closure': compact(Fraction(r['delta']['closure'])),
                       'delta_graph': compact(Fraction(r['delta']['graph'])), 'displacement': r['displacement'],
                       'ties_exact': r['ties']['exact'], 'ties_float': r['ties']['float']})
    disp40 = [t['displacement'] for t in l4c_tables if 'displacement' in t]
    disp_all = disp40 + [t['displacement'] for t in others]
    # prediction (a)'s gap
    maps_l, maps_e, pflags = {}, {}, {}
    for d in (2, 3):
        maps_l[d] = [fparse(learned[('lorentz', d, s)]['maps']['closure']) if ('lorentz', d, s) in have else None
                     for s in seeds.training]
        maps_e[d] = [fparse(learned[('euclid', d, s)]['maps']['closure']) if ('euclid', d, s) in have else None
                     for s in seeds.training]
        pflags[d] = [l6.present(f'a{d}', s, have, control2) for s in seeds.training]
    gap = l6.prediction_gap(maps_l, maps_e, pflags, decision['parts']['a']['verdict'])
    T['decide_s'] = time.perf_counter() - t2 - T['intervals_s']
    # 9. outputs
    recheck_tree(cfg, ctx, 'before writing claims-phase4.json')
    envs, env_summary = environments_of(list(res.values()) + list(res_b.values()), ctx['env_sha'])
    if not env_summary['all_this_start']:
        log(f'NOTE: the jobs of this step ran under {len(env_summary["records_by_environment"])} environment(s), not '
            f'all this start\'s: {env_summary["records_by_environment"]}')
    record = assemble_measure(cfg, ctx, locals())
    write_measure(cfg, ctx, record, paths, ex, learned, shuffled, tuning)
    return 0


def run_entry(kind, key, r, have_aps=True):
    """One measured, edge-shuffled or floor run for the JSON (its per-query APs stay in the cache, by SHA-256)."""
    e = {'kind': kind, 'key': key}
    for k in ('geometry', 'd', 'lr', 'seed', 'i', 'floor_seed', 'instance', 'pairs', 'diverged_epoch', 'epochs_run',
              'guard_hits', 'max_step', 'max_radius', 'loss', 'final_state', 'float_sha', 'snap_sha', 'wall_s',
              'cpu_s', 'concurrent_processes', 'environment_sha', 'ties', 'displacement', 'bits', 'distortion',
              'aps_sha', 'lbench', 'lbench_sha', 'eval_s', 'resumed'):
        if k in r:
            e[k] = r[k]
    # written whole: the snapped MAPs, the mean ranks (small), and L4(c)'s float64 MAPs and |dMAP| (its 40 tables);
    # every other rational compactly (float, SHA-256 of p/q; the exact value is in the cache's runs.jsonl)
    l4c = kind in ('learned', 'edge-shuffled') and r.get('d') in (2, 3)
    for k in ('maps', 'mean_rank', 'float_mean_rank', 'float_maps', 'delta', 'frac_map'):
        if r.get(k) is not None:
            whole = k in ('maps', 'mean_rank', 'float_mean_rank') or (l4c and k in ('float_maps', 'delta'))
            e[k] = {m: (fparse(v) if whole else compact(fparse(v))) for m, v in r[k].items()}
    if r.get('coarse'):
        c = r['coarse']
        e['coarse'] = {'snap_sha': c['snap_sha'], 'ties': c['ties'],
                       'maps': {m: compact(fparse(v)) for m, v in c['maps'].items()},
                       'delta': {m: compact(fparse(v)) for m, v in c['delta'].items()}}
    return e


def assemble_measure(cfg, ctx, v):
    """claims-phase4.json (build spec 4.4)."""
    seeds, info = cfg.seeds, ctx['info']
    ex, res, jobs = v['ex'], v['res'], v['jobs']
    runs = []
    for j in sorted(jobs, key=v['sort_key']):
        if j['kind'] in ('learned', 'edge-shuffled', 'floor'):
            runs.append(run_entry(j['kind'], j['key'], res[j['key']]))
    tun = v['tuning']
    exact = {k: x for k, x in ex.items() if k not in ('aps', 'snap_text')}
    exact['maps'] = {m: fparse(x) for m, x in ex['maps'].items()}
    exact['frac_map'] = {m: fparse(x) for m, x in ex['frac_map'].items()}
    exact['mean_rank'] = {m: fparse(x) for m, x in ex['mean_rank'].items()}
    exact['aps_sha'] = {m: sha256('\n'.join('-' if a is None else fstr(a) for a in ex['aps'][m]))
                        for m in ('closure', 'graph')}
    geo = next((res[j['key']] for j in jobs if j['kind'] == 'geoopt'), None)
    if geo is None:
        import importlib.util
        missing = [m for m in ('torch', 'geoopt') if importlib.util.find_spec(m) is None]
        geo = {'status': 'not run', 'reason': (f'{", ".join(missing)} not installed' if missing else
                                               'the self-test does not run it') +
               '. A10.11: on 2026-11-06 the proxy refused download.pytorch.org, and PyPI\'s Linux wheel pulls more '
               'than 1 GB of CUDA wheels; the tests carry torch-free checks in its place (a 60-digit decimal '
               'recomputation of one step and finite-difference gradients)'}
    reported_iv = {name: {k: iv_json(v['ivs'][n]) for k, n in d.items()} for name, d in v['rep_names'].items()}

    def floats(dct):
        return {m: (None if x is None else float(x['float'] if isinstance(x, dict) else x)) for m, x in dct.items()}
    mean_ranks = {r['key']: floats(r['mean_rank']) for r in runs if r.get('mean_rank')}
    frac = {r['key']: floats(r['frac_map']) for r in runs if r.get('frac_map')}
    dist = {r['key']: r.get('distortion') for r in runs if r.get('distortion')}
    bits = {r['key']: {'mean': r['bits']['mean_float'], 'max': r['bits']['max']} for r in runs if r.get('bits')}
    wall = {r['key']: {'wall_s': r.get('wall_s'), 'cpu_s': r.get('cpu_s'),
                       'concurrent_processes': r.get('concurrent_processes')} for r in runs if 'wall_s' in r}
    out = {
        'label': ctx['label'], 'mode': cfg.mode, 'step': 'measure', 'head': ctx['git']['head'], 'git': ctx['git'],
        'git_checks': ctx['git_checks'], 'development_run': ctx['mark'], 'starts': ctx['starts'],
        'environment': ctx['env'], 'run_environments': v['envs'], 'environments_summary': v['env_summary'],
        'readings': ctx['readings'].items,
        'instance': info,
        'settings': {'path': v['pre']['settings_path'], 'sha256': v['ssha'], 'rates': v['pre']['rates'],
                     'freeze_amendment': v['pre']['freeze_amendment']},
        'tuning': {'path': v['pre']['tuning_path'], 'sha256': v['tsha'], 'head': tun['head'],
                   'chosen': {c: x['chosen'] for c, x in tun['cells'].items()},
                   'diverged_runs': tun['diverged_runs']},
        'preflight': v['preflight'], 'replay_check': v['replay'],
        'protocol_sha': l6.protocol_sha(), 'budget': info['budget'],
        'seeds': {'training': list(seeds.training), 'label': seeds.label, 'edge': [seeds.edge(j) for j in
                  range(len(seeds.training))], 'floor': [seeds.floor(j) for j in range(len(seeds.training))],
                  'diag': [seeds.diag(0), seeds.diag(DIAG_COUNT - 1)], 'bootstrap': seeds.bootstrap},
        'exact_arm': exact, 'runs': runs,
        'intervals': {'deciding': v['deciding'], 'control2': v['c2_out'], 'reported': reported_iv},
        'decisions': {'L6': {'a': v['decision']['parts']['a'], 'b': v['decision']['parts']['b'],
                             'c': v['decision']['parts']['c'], 'd': v['decision']['parts']['d'],
                             'void': v['decision']['void'], 'reasons': v['decision']['reasons'],
                             'control1': v['decision']['control1'], 'control2': v['decision']['control2']},
                      'L4c': v['l4c']},
        'prediction_gap': v['gap'],
        'controls': {
            '1': {'P_seed': seeds.label, 'P_sha256': sha256(','.join(map(str, v['P']))), 'tables': v['c1_tables'],
                  'evaluated': len(v['control1']), 'holds': not v['decision']['control1']['failed'],
                  'max_closure_map': max(v['control1'].values()) if v['control1'] else None,
                  'labels': v['labels'], 'diagnostics': v['diag']},
            '2': v['c2_out'],
            '3': {'floors': {r['key']: {'maps': {m: compact(x) for m, x in r['maps'].items()},
                                        'bits': r.get('bits')} for r in runs if r['kind'] == 'floor'},
                  'random_ranking_map': info['random_ranking_map']}},
        'l4c': {'tables': v['l4c_tables'], 'order': [list(x) for x in v['order40']],
                'largest_displacement_40': max(v['disp40']) if v['disp40'] else None,
                'largest_displacement_all': max(v['disp_all']) if v['disp_all'] else None,
                'other_tables': v['others']},
        'reported': {'note': 'floats for reading; the exact values are in runs[] and exact_arm',
                     'mean_rank': mean_ranks, 'fractional_tie_map': frac, 'distortion': dist, 'bits': bits,
                     'exact_arm': {'mean_rank': floats(exact['mean_rank']), 'fractional_tie_map':
                                   floats(exact['frac_map']), 'distortion': exact['distortion'],
                                   'bits': {'mean': exact['bits']['mean_float'], 'max': exact['bits']['max']}},
                     'wall_clock': wall, 'intervals': 'see intervals.reported',
                     'random_ranking_map': info['random_ranking_map'],
                     'random_ranking_map_registered_display': {'closure': '0.014957', 'graph': '0.007320'},
                     'geoopt': geo},
        'timing': {k: v['T'][k] for k in v['T'] if k != 'start'},
    }
    if cfg.mode == 'selftest':
        out['selftest'] = {'banner': SELFTEST_BANNER, 'deleted_snap': ctx.get('selftest_deleted')}
    return out


def write_measure(cfg, ctx, record, paths, ex, learned, shuffled, tuning):
    log = ctx['log']
    t0 = time.perf_counter()
    # the tables (build spec section 1): snapped texts of the measured and edge-shuffled tables, float bytes of
    # L4(c)'s 40, the exact arm's canonical lines; gzip level 9, mtime 0
    tdir = paths['tables']
    os.makedirs(tdir, exist_ok=True)
    written = []
    for kind, store in (('learned', learned), ('edge-shuffled', shuffled)):
        for (g, d, s), r in sorted(store.items()):
            if r.get('diverged_epoch') is not None:
                continue
            with open(table_path(cfg.cache, r['key'], '.snap.txt'), 'rb') as fh:
                data = fh.read()
            if hashlib.sha256(data).hexdigest() != r['snap_sha']:
                raise ValueError(f'{r["key"]}: the cached snapped text changed')
            name = f'{kind}-{g}-d{d}-s{s}.snap.txt.gz'
            write_atomic(os.path.join(tdir, name), gz_bytes(data))
            written.append(name)
            if d in (2, 3):
                X = np.load(table_path(cfg.cache, r['key'], '.npy'))
                b = EM.table_bytes(X)
                if hashlib.sha256(b).hexdigest() != r['float_sha']:
                    raise ValueError(f'{r["key"]}: the cached float table changed')
                name = f'{kind}-{g}-d{d}-s{s}.f64.gz'
                write_atomic(os.path.join(tdir, name), gz_bytes(b))
                written.append(name)
    write_atomic(os.path.join(tdir, 'exact-h3.snap.txt.gz'), gz_bytes(ex['snap_text'].encode()))
    written.append('exact-h3.snap.txt.gz')
    # the receipts: tuning's records, then this run's (exact arm, measured, edge-shuffled, floors), sorted by job
    recs = [r['lbench'] for r in tuning['runs'] if r.get('lbench')]
    recs.append(ex['lbench'])
    recs += [r['lbench'] for r in record['runs'] if r.get('lbench')]
    for rec in recs:
        l6.parse_lbench(rec)
    lb_text = ''.join(r + '\n' for r in recs)
    write_atomic(paths['lbench'], lb_text)
    record['lbench'] = {'file': display_path(paths['lbench']), 'sha256': sha256(lb_text), 'records': len(recs),
                        'tuning_records': len([r for r in tuning['runs'] if r.get('lbench')])}
    record['tables'] = {'folder': display_path(tdir), 'files': written,
                        'sha256': {nm: sha256_file(os.path.join(tdir, nm)) for nm in written}}
    record['timing']['write_s'] = time.perf_counter() - t0
    record['timing']['total_s'] = time.perf_counter() - ctx['t0']
    text = jdump(record)
    write_atomic(paths['json'], text)
    write_atomic(paths['md'], measure_md(cfg, record))
    log(f'wrote {display_path(paths["json"])} ({len(text) // 1024} KB), {display_path(paths["md"])}, '
        f'{display_path(paths["lbench"])} ({len(recs)} records), {len(written)} files in {display_path(tdir)}')
    dl = record['decisions']['L6']
    log('L6: ' + ', '.join(f'({p}) {dl[p]["verdict"]}' for p in 'abcd') + f'; L4(c): '
        f'{record["decisions"]["L4c"]["verdict"]}')


# ================================================================ the readable record
def f6(x):
    if x is None:
        return '-'
    if isinstance(x, dict) and 'float' in x:
        x = x['float']
    return f'{float(x):.6f}'


def fe(x):
    if x is None:
        return '-'
    if isinstance(x, dict) and 'float' in x:
        x = x['float']
    return f'{float(x):.3e}'


def ivs_text(iv):
    if iv is None:
        return '-'
    if iv.get('interval', 1) is None:
        return 'not present'
    s = f'{iv["mean"]:+.4f} [{iv["lo"]:+.4f}, {iv["hi"]:+.4f}]'
    if not iv['ordered']:
        s += ' (lo <= mean <= hi fails)'
    if iv.get('present') is False:
        s += ' (not present)'
    return s


def measure_md(cfg, rec):
    j = jsafe(rec)
    dl, l4 = j['decisions']['L6'], j['decisions']['L4c']
    seeds = j['seeds']['training']
    md = [f'# Phase 4: L6 and L4(c){" (dry run)" if cfg.mode == "dry" else ""}', '']
    if cfg.mode == 'selftest':
        md += [f'**{SELFTEST_BANNER}**', '']
    if j['development_run'] and cfg.mode != 'selftest':
        md += [f'**{j["development_run"]}**', '']
    md += [f'{j["label"]}. Instance `{j["instance"]["instance_id"]}` ({j["instance"]["n"]} nodes, '
           f'{j["instance"]["E"]} positives, SHA-256 `{j["instance"]["instance_sha"]}`); HEAD `{j["head"]}`; '
           f'protocol `{j["protocol_sha"]}`; settings `{j["settings"]["sha256"]}`'
           + (f' (Amendment {j["settings"]["freeze_amendment"]})' if j['settings']['freeze_amendment'] else '')
           + f'; budget `{j["budget"]}`.', '']
    md += ['## 1. Verdicts', '', '| Claim | Verdict | Seeds present | Reasons |', '| --- | --- | --- | --- |']
    for p in 'abcd':
        x = dl[p]
        pres = (f'd=2: {x["per_d"]["2"]["present"]}, d=3: {x["per_d"]["3"]["present"]}' if p == 'a'
                else str(x.get('present')))
        md.append(f'| L6({p}) | **{x["verdict"]}** | {pres} | {"; ".join(x["reasons"])} |')
    md.append(f'| L4(c) | **{l4["verdict"]}** | {40 - l4["missing"]} of 40 tables | {"; ".join(l4["reasons"])}; '
              f'{l4["above_1_1000"]} above 1/1000, {l4["above_1_100"]} above 1/100 |')
    md += ['', 'L6 void: ' + ('**yes** (' + '; '.join(dl['reasons']) + ')' if dl['void'] else 'no') + '.', '']
    c = j['controls']
    md += ['## 2. Controls', '',
           f'- **Control 1 (label shuffle, P = Rng({c["1"]["P_seed"]}))**: {c["1"]["evaluated"]} tables evaluated, '
           f'largest relabelled closure MAP {f6(c["1"]["max_closure_map"])} (must be <= 1/20 each): '
           f'**{"holds" if c["1"]["holds"] else "FAILS: L6 is void"}**. Sources: '
           + ', '.join(f'{s} {n}' for s, n in sorted(count_by(c['1']['tables'], 'source').items())) + '.',
           f'- **Control 2 (edge-shuffled training)**: ' + ', '.join(
               f'{k}: {"holds" if v["holds"] else "not established" if v["holds"] is None else "FAILS"}'
               for k, v in c['2'].items()) + '.',
           f'- **Control 3 (floors)**: random-ranking expectation closure {f6(c["3"]["random_ranking_map"]["closure"])}'
           f', graph-edge {f6(c["3"]["random_ranking_map"]["graph"])}; floor MAPs in section 7.', '']
    md += ['## 3. Tuning', '', f'tuning.json `{j["tuning"]["sha256"]}` (HEAD `{j["tuning"]["head"]}`).', '',
           '| Cell | Rate |', '| --- | --- |']
    md += [f'| {k} | {v} |' for k, v in j['tuning']['chosen'].items()]
    md += ['', f'Diverged tuning runs: {", ".join(j["tuning"]["diverged_runs"]) or "none"}.', '']
    md += ['## 4. Measured MAPs (exact, snapped to 2^-32)', '',
           '| Cell | ' + ' | '.join(f'seed {s} closure / graph-edge' for s in seeds) + ' |',
           '| --- |' + ' --- |' * len(seeds)]
    by = {(r['kind'], r['geometry'], r['d'], r.get('seed')): r for r in j['runs']}
    for g, d in cfg.cells:
        cells = []
        for s in seeds:
            r = by.get(('learned', g, d, s))
            if r is None:
                cells.append('no lr')
            elif r.get('diverged_epoch') is not None:
                cells.append(f'diverged at {r["diverged_epoch"]}')
            else:
                cells.append(f'{f6(r["maps"]["closure"])} / {f6(r["maps"]["graph"])}')
        md.append(f'| {g} {d} | ' + ' | '.join(cells) + ' |')
    md += ['', f'Exact arm (H3): closure {f6(j["exact_arm"]["maps"]["closure"])}, graph-edge '
           f'{f6(j["exact_arm"]["maps"]["graph"])}.', '']
    md += ['## 5. Deciding intervals (mean [lo, hi], per seed)', '', '| Comparison | ' +
           ' | '.join(f'seed {s}' for s in seeds) + ' |', '| --- |' + ' --- |' * len(seeds)]
    names = {'a2': '(a) closure, Lorentz 2 - Euclidean 2', 'a3': '(a) closure, Lorentz 3 - Euclidean 3',
             'b': '(b) closure, Lorentz 50 - Euclidean 50', 'c': '(c) graph-edge, exact - Lorentz 3',
             'd': '(d) closure, Lorentz 3 - exact'}
    for comp, title in names.items():
        row = j['intervals']['deciding'].get(comp, {})
        md.append(f'| {title} | ' + ' | '.join(ivs_text(row.get(str(s))) for s in seeds) + ' |')
    md += ['']
    md += ['## 6. L4(c)', '', f'Largest |dMAP| over the 40 tables: {fe(l4["largest"])}; largest displacement '
           f'{fe(j["l4c"]["largest_displacement_40"])} (all tables: {fe(j["l4c"]["largest_displacement_all"])}).', '',
           '| Table | closure |dMAP| | graph-edge |dMAP| | coarse 2^-8 closure / graph-edge | displacement | '
           'exact / float ties |', '| --- | --- | --- | --- | --- | --- |']
    for t in j['l4c']['tables']:
        if 'missing' in t:
            md.append(f'| {t["table"]} | {t["missing"]} | | | | |')
        else:
            md.append(f'| {t["table"]} | {fe(t["delta_closure"])} | {fe(t["delta_graph"])} | '
                      f'{fe(t["coarse_delta_closure"])} / {fe(t["coarse_delta_graph"])} | {fe(t["displacement"])} | '
                      f'{t["ties_exact"]} / {t["ties_float"]} |')
    md += ['', 'Other tables (reported): ' + '; '.join(
        f'{t["table"]} {fe(t["delta_closure"])}/{fe(t["delta_graph"])}' for t in j['l4c']['other_tables']) + '.', '']
    pg = j['prediction_gap']
    md += ['## 7. Reported', '',
           f'- Prediction (a)\'s gap (mean over seeds present): d=2 {f6(pg["2"]["mean"])}, d=3 '
           f'{f6(pg["3"]["mean"])}; holds: {pg["holds"]}.',
           f'- Exact arm: fractional-tie MAP closure {f6(j["exact_arm"]["frac_map"]["closure"])}, graph-edge '
           f'{f6(j["exact_arm"]["frac_map"]["graph"])}; mean rank closure {f6(j["exact_arm"]["mean_rank"]["closure"])}'
           f', graph-edge {f6(j["exact_arm"]["mean_rank"]["graph"])}; bits {f6(j["exact_arm"]["bits"]["mean_float"])}'
           f' mean, {j["exact_arm"]["bits"]["max"]} max; distortion {f6(j["exact_arm"]["distortion"]["value"])}.',
           f'- geoopt: {j["reported"]["geoopt"]["status"]}'
           + (f' ({j["reported"]["geoopt"].get("reason")})' if j['reported']['geoopt'].get('reason') else '') + '.',
           '', '| Run | closure | graph-edge | fractional closure / graph-edge | mean rank closure / graph-edge | '
           'distortion | bits mean / max | train s |', '| --- | --- | --- | --- | --- | --- | --- | --- |']
    for r in j['runs']:
        if r.get('maps') is None:
            md.append(f'| {r["key"]} | diverged at {r.get("diverged_epoch")} | | | | | | |')
            continue
        fm = r.get('frac_map') or {}
        mr = r.get('mean_rank') or {}
        md.append(f'| {r["key"]} | {f6(r["maps"]["closure"])} | {f6(r["maps"]["graph"])} | '
                  f'{f6(fm.get("closure"))} / {f6(fm.get("graph"))} | {f6(mr.get("closure"))} / {f6(mr.get("graph"))}'
                  f' | {f6((r.get("distortion") or {}).get("value"))} | {f6(r["bits"]["mean_float"])} / '
                  f'{r["bits"]["max"]} | {"-" if "wall_s" not in r else format(r["wall_s"], ".1f")} |')
    md += ['', '## 8. Diagnostics (control 1, reported)', '']
    for lab in c['1']['labels']:
        md.append(f'- Label {lab["label"]} ({lab["label_closure_neighbours"]} closure neighbours) takes the point of '
                  f'row {lab["takes_point_of_row"]} ({lab["row_offset"]}, {lab["row_closure_neighbours"]}).')
    for k, dg in c['1']['diagnostics'].items():
        md.append(f'- {k}: 200 permutations min {dg["min"]:.4f}, median {dg["median"]:.4f}, p99 {dg["p99"]:.4f}, '
                  f'max {dg["max"]:.4f}, share > 0.05 {dg["share_above_0.05"]:.3f}; P {dg["P_map"]:.4f}, rank '
                  f'{dg["P_rank_from_top"]} from the top.')
    md += ['', '## 9. Environment, pre-flight, replay, starts, readings', '']
    env = j['environment']
    md += [f'- {env.get("platform")}; {env.get("cpu")}; Python {env.get("python")}, numpy {env.get("numpy")}, numba '
           f'{env.get("numba")}, llvmlite {env.get("llvmlite")}, libc {" ".join(env.get("libc") or [])}; '
           f'{env.get("workers")} workers; numpy SIMD {", ".join(env.get("numpy_cpu_features") or [])}.']
    es = j['environments_summary']
    md.append('- Run environments (A10.4; each job record holds the one its worker ran under): '
              + '; '.join(f'`{k[:12]}` {n} record(s)' for k, n in es['records_by_environment'].items())
              + ('; all this start\'s.' if es['all_this_start']
                 else f'; this start\'s is `{str(es["this_start"])[:12]}`.'))
    pf = j['preflight']
    md.append('- Pre-flight reproducibility: ' + '; '.join(
        f'{x["job"]} {"equal" if x["equal"] else "DIFFERS (disclosed: " + str(x["float_sha_tuning"]) + " vs " + str(x["float_sha_now"]) + ")"}'
        for x in pf['reproducibility']) + '.')
    if pf.get('changed_since_tuning') is not None:
        md.append(f'- Paths changed since tuning: {", ".join(pf["changed_since_tuning"]) or "none"}.')
    rc = j['replay_check']
    if rc:
        md.append(f'- Replay check ({rc["job"]}, after epoch {rc["epoch_compared"]}): '
                  f'{"equal" if rc["equal"] else "DIFFERENT"}.')
    md.append('- Starts: ' + '; '.join(f'{s["time"]} at {str(s["head"])[:12]} (environment '
                                       f'`{str(s.get("environment_sha"))[:12]}`)' for s in j['starts']) + '.')
    if j.get('git_checks'):
        md.append(f'- Clean-tree checks during the run: {len(j["git_checks"])} ('
                  + ', '.join(x['where'] for x in j['git_checks']) + '), HEAD unchanged.')
    md += ['', '### READINGs of this runner', '']
    md += [f'- **{x["id"]}.** {x["text"]}' for x in j['readings']]
    md += ['', 'The modules\' own READINGs are marked in reference/lexicon/{stream,pystream,embed,learned,l6}.py.', '']
    lb = j.get('lbench') or {}
    md += ['## 10. Receipts', '', f'`{lb.get("file")}`: {lb.get("records")} LBENCH/1 records '
           f'({lb.get("tuning_records")} from tuning), SHA-256 `{lb.get("sha256")}`. Tables in `{j["tables"]["folder"]}`'
           f' ({len(j["tables"]["files"])} files).', '']
    return '\n'.join(md)


def count_by(items, key):
    out = {}
    for x in items:
        out[x[key]] = out.get(x[key], 0) + 1
    return out


# ================================================================ the self-test's deliberate cache loss
def selftest_drop_one_snap(cfg, log):
    """SELFTEST only: delete the cached snapped text of the first finite tuning table, so that control 1 must
    retrain it (build spec 3.5). Done on every self-test start, so a resumed self-test gives the same record."""
    tpath, _ = tuning_paths(cfg)
    with open(tpath, encoding='utf-8') as fh:
        t = json.load(fh)
    for r in t['runs']:
        if r['diverged_epoch'] is None:
            key = tuning_key(r['geometry'], r['d'], r['lr'], r['seed'])
            p = table_path(cfg.cache, key, '.snap.txt')
            if os.path.exists(p):
                os.remove(p)
            log(f'SELFTEST: the cached snapped text of {key} is deleted, so that control 1 retrains it')
            return key
    return None


# ================================================================ main
def start(cfg, step, console_path):
    """The label, the git state and the tree check (before any file is written: a refused start leaves nothing in
    results/), then the console, the start record and the environment."""
    label = prereg_label()
    gs = git_state()
    try:
        mark = check_tree(cfg.mode, step, gs, cfg.allow_dirty)
        l6.protocol_sha()                       # golden/l6_protocol_v1.txt must be the pinned text (A10.12)
    except ValueError as e:
        raise Refused(str(e)) from None
    log = Console(console_path)
    rd = Readings()
    common_readings(rd)
    log('=' * 100)
    log(f'Phase 4, {step} ({cfg.label_mode}), started {utc_now()}; {label}; argv {" ".join(sys.argv[1:])}')
    if cfg.mode == 'selftest':
        log(SELFTEST_BANNER)
    log(f'HEAD {gs["head"]}; ' + ('the tree is clean' if not gs['changed'] else
                                  f'{len(gs["changed"])} changed path(s): {"; ".join(gs["changed"][:6])}')
        + (f'; {mark}' if mark else ''))
    renv = run_environment()
    esha = env_sha(renv)
    starts = record_start(cfg, step, gs['head'], mark, renv)
    log(f'environment {esha[:12]}: Python {renv["python"]}, numpy {renv["numpy"]}, numba {renv["numba"]}, libc '
        f'{" ".join(renv["libc"] or [])}, numpy SIMD dispatch {", ".join(renv["numpy_cpu_dispatch"] or [])}')
    if len(starts) > 1:
        log(f'start {len(starts)} of this step in this cache (earlier: '
            + '; '.join(f'{s["time"]} at {str(s["head"])[:12]}, environment {str(s.get("environment_sha"))[:12]}'
                        for s in starts[:-1]) + ')')
    env = environment(cfg.workers)
    return {'log': log, 'readings': rd, 'label': label, 'git': gs, 'mark': mark, 'starts': starts, 'env': env,
            'env_sha': esha, 'step': step, 'git_checks': [], 't0': time.perf_counter()}


def run_step(cfg, step, console_path, data=None):
    try:
        ctx = start(cfg, step, console_path)
    except Refused as e:
        print(f'REFUSED: {e}', file=sys.stderr)
        return 1, data
    log = ctx['log']
    try:
        if data is None:
            data = load_data(cfg, log)
        ctx['cs'], ctx['info'] = data
        ctx['sig'] = cfg_sig(cfg, ctx['info'])
        if step == 'tune':
            rc = step_tune(cfg, ctx)
        elif step == 'measure':
            if cfg.mode == 'selftest':
                ctx['selftest_deleted'] = selftest_drop_one_snap(cfg, log)
            rc = step_measure(cfg, ctx)
        else:
            raise ValueError(step)
        if 'numba' in sys.modules:
            log('NOTE: numba was imported in the main process')
        log(f'{step} finished with exit code {rc} ({time.perf_counter() - ctx["t0"]:.0f} s)')
        return rc, data
    except Refused as e:
        log(f'REFUSED: {e}')
        return 1, data
    finally:
        log.close()


def main(argv=None):
    ap = argparse.ArgumentParser(description='Phase 4 of the Hyperbolic Lexicon preregistration: L6 and L4(c).')
    m = ap.add_mutually_exclusive_group(required=True)
    m.add_argument('--tune', action='store_true', help='the tuning grid (A10.8)')
    m.add_argument('--write-settings', action='store_true', help='registered: settings.json from tuning.json')
    m.add_argument('--measure', action='store_true', help='the decisive run (A10.14 step 6)')
    m.add_argument('--selftest', action='store_true', help='the whole pipeline on a synthetic DAG (decides nothing)')
    ap.add_argument('--dry', action='store_true', help='the registered dry run (A10.13)')
    ap.add_argument('--workers', type=int, default=4, help='worker processes (default 4)')
    ap.add_argument('--allow-dirty', action='store_true', help='dry only: run on a tree with other changes')
    ap.add_argument('--out', help='--selftest: the output folder (outside the repository)')
    a = ap.parse_args(argv)

    def refuse(msg):
        print(f'REFUSED: {msg}', file=sys.stderr)
        return 1
    if a.workers < 1:
        return refuse('--workers must be at least 1')
    if a.dry and (a.selftest or a.write_settings):
        return refuse('--dry goes with --tune or --measure (dry tuning writes its own settings)')
    if a.allow_dirty and not a.dry:
        return refuse('--allow-dirty is refused in registered mode (A10.14) and has no meaning in the self-test')
    if a.out and not a.selftest:
        return refuse('--out goes with --selftest only')
    if a.selftest:
        if not a.out:
            return refuse('--selftest needs --out DIR')
        out = os.path.realpath(a.out)
        if _inside(out, os.path.realpath(REPO)):
            return refuse('the self-test never writes inside the repository (reference/results included): give '
                          '--out a folder outside it')
        cfg = make_cfg('selftest', a.workers, False, out)
        rc, data = run_step(cfg, 'tune', os.path.join(out, 'phase4-tuning-console.txt'))
        if rc:
            return rc
        rc, _ = run_step(cfg, 'measure', os.path.join(out, 'phase4-console.txt'), data)
        return rc
    mode = 'dry' if a.dry else 'registered'
    cfg = make_cfg(mode, a.workers, a.allow_dirty)
    if a.write_settings:
        try:
            return step_write_settings(cfg, print)
        except Refused as e:
            return refuse(str(e))
    step = 'tune' if a.tune else 'measure'
    con = tuning_paths(cfg)[1] if step == 'tune' else measure_paths(cfg)['console']
    rc, _ = run_step(cfg, step, con)
    return rc


if __name__ == '__main__':
    sys.exit(main())
