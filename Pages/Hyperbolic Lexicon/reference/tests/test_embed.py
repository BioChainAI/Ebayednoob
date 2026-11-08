"""Amendment 10 items 2-5: the training instance, the initial table, the stream order, the float64 trainer against a
second implementation bit for bit and against a 60-digit Decimal oracle, finite differences, reproducibility across
processes, guard hits, divergence, the short last batch, the burn-in rate and the schedule. Synthetic DAGs and seeds
80000 + i only (the seed guard); the registered sets are only counted (test_registered_counts)."""
import ast
import hashlib
import json
import math
import os
import struct
import subprocess
import sys
from decimal import Decimal, localcontext

import numpy as np
import pytest

import embed_ref
import l6_oracle
import l6_synth
from hpstep.prng import Rng
from lexicon import REFERENCE
from lexicon import embed as EM
from lexicon import rank as R
from lexicon.pystream import PyStream, replay_states
from lexicon.stream import Stream


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    l6_synth.install_seed_guard(monkeypatch)


@pytest.fixture(scope='module')
def big():
    cs = l6_synth.dag(80001)
    return cs, EM.training_instance(cs)


@pytest.fixture(scope='module')
def small():
    cs = l6_synth.small(80002)
    return cs, EM.training_instance(cs)


# ================================================================ item 2: the instance
def test_instance_rules(big):
    cs, inst = big
    n = cs.n
    assert n == 1182 and 6542 <= inst.E <= 6607
    pairs = [(u, v) for u in range(n) for v in cs.anc[u]]
    assert inst.pos.tolist() == sorted([list(p) for p in pairs])                 # one per closure pair, sorted
    assert len({tuple(p) for p in inst.pos.tolist()}) == inst.E
    sizes = inst.nn_sizes()
    for u in range(n):
        nn = inst.nn_flat[inst.nn_ptr[u]:inst.nn_ptr[u + 1]].tolist()
        assert nn == sorted(set(range(n)) - {u} - cs.anc[u] - cs.desc[u])       # the complement, ascending
        assert set(nn).isdisjoint(cs.closure_nb[u]) and len(nn) + len(cs.closure_nb[u]) == n - 1
    anchors = set(inst.pos[:, 0].tolist())
    assert 0 not in anchors and cs.anc[0] == frozenset()                          # the root never anchors
    assert all(sizes[u] >= 1 for u in anchors)
    assert sizes[0] == 0
    assert all(v in cs.anc[u] for u, v in inst.pos.tolist())                      # (descendant, ancestor)
    assert cs.instance_sha == hashlib.sha256('\n'.join(cs.offsets).encode()).hexdigest()
    assert cs.closure_nb == R.closure_neighbours(list(cs.offsets), *_maps(cs))
    assert all(len(w) >= 1 for w in cs.words)


def _maps(cs):
    anc = {cs.offsets[u]: {cs.offsets[v] for v in cs.anc[u]} for u in range(cs.n)}
    desc = {cs.offsets[u]: {cs.offsets[v] for v in cs.desc[u]} for u in range(cs.n)}
    return anc, desc


def test_instance_refuses_anchor_without_nonneighbours():
    # node 1 is an ancestor of every other node but the root: it anchors (under 0) and has no non-neighbour
    parents = [[]] + [[0]] + [[1] for _ in range(4)]
    cs = l6_synth._closure_set(parents, words=False)
    with pytest.raises(ValueError):
        EM.training_instance(cs)


def test_shuffled_instance():
    n, E = 1182, 6542
    inst = EM.shuffled_instance(n, E, 80300)
    pairs = [tuple(p) for p in inst.pos.tolist()]
    assert len(pairs) == E and pairs == sorted(pairs)
    assert all(a != b for a, b in pairs)
    assert len({(min(a, b), max(a, b)) for a, b in pairs}) == E
    partners = [set() for _ in range(n)]
    for a, b in pairs:
        partners[a].add(b)
        partners[b].add(a)
    for u in range(n):
        nn = inst.nn_flat[inst.nn_ptr[u]:inst.nn_ptr[u + 1]].tolist()
        assert nn == sorted(set(range(n)) - {u} - partners[u])
    assert all(inst.nn_sizes()[a] >= 1 for a, _ in pairs)
    # a direct Rng(80300) replay of item 9's rule
    r, held, ref = Rng(80300), set(), []
    while len(ref) < E:
        a, b = r.below(n), r.below(n)
        if a != b and frozenset((a, b)) not in held:
            held.add(frozenset((a, b)))
            ref.append((a, b))
    assert pairs == sorted(ref)


# ================================================================ item 3: init, stream order, schedule
def test_init_shared():
    n, d = 40, 5
    L = EM.init_table(PyStream(80100), n, d, 'lorentz')
    E_ = EM.init_table(PyStream(80100), n, d, 'euclid')
    S_ = EM.init_table(Stream(80100), n, d, 'euclid')
    assert L.shape == (n, d + 1) and E_.shape == (n, d)
    assert L[:, 1:].tobytes() == E_.tobytes() == S_.tobytes()
    assert L[:, 0].tobytes() == np.sqrt(1.0 + EM.sdot(E_, E_)).tobytes()
    r = Rng(80100)
    direct = [[(2 * r.random() - 1) * 1e-3 for _ in range(d)] for _ in range(n)]      # node-major
    assert E_.tolist() == direct
    for i in range(n):
        acc = direct[i][0] * direct[i][0]
        for k in range(1, d):
            acc = acc + direct[i][k] * direct[i][k]
        assert L[i, 0] == math.sqrt(1.0 + acc)
    assert np.abs(E_).max() <= 1e-3


def test_stream_order(small):
    _, inst = small
    for g in EM.GEOMETRIES:
        run = EM.train(inst, g, 3, '1', 80101, epochs=2, burnin=1)
        states = replay_states(PyStream(80101), inst.n, 3, inst.pos[:, 0], inst.nn_sizes(), 2)
        assert run.final_state == states[-1]                  # nothing else draws from the run's stream


def test_nn_below_50(small):
    cs, inst = small
    u = 1
    assert inst.nn_sizes()[u] == 3
    nn = inst.nn_flat[inst.nn_ptr[u]:inst.nn_ptr[u + 1]].tolist()
    assert nn == [57, 58, 59]
    st, r = Stream(80102), Rng(80102)
    draws = st.negatives(np.array([u]), 50, inst.nn_ptr, inst.nn_flat)[0].tolist()
    assert len(draws) == 50 and set(draws) <= set(nn)
    assert len(set(draws)) < len(draws)                       # with replacement: repeats kept
    assert draws == [nn[r.below(3)] for _ in range(50)]       # exactly 50 below(3)
    assert st.state() == tuple(r.s)
    # inside a run: every row anchored at u gets 50 candidates from NN(u), repeats included
    seen = []
    orig = EM._TERMS['euclid']

    def spy(XT, U, C, diag, loss=None):
        for i in np.flatnonzero(U == u):
            seen.append(C[i, 1:].tolist())
        return orig(XT, U, C, diag, loss)
    EM._TERMS['euclid'] = spy
    try:
        EM.train(inst, 'euclid', 2, '1', 80103, epochs=1)
    finally:
        EM._TERMS['euclid'] = orig
    assert len(seen) == len(cs.anc[u]) == 1
    assert all(len(s) == 50 and set(s) <= set(nn) for s in seen)


def test_schedule():
    # a float64 division, as written: lr / 10 differs from lr * 0.1 in the last bit at '0.1' and '3' (not at '0.3')
    assert EM.rate('0.1', 0) == 0.1 / 10 and EM.rate('0.1', 0) != 0.1 * 0.1
    assert EM.rate('3', 0) == 3.0 / 10 and EM.rate('3', 0) != 3.0 * 0.1
    assert [EM.rate(g, 0) == float(g) / 10 for g in EM.GRID] == [True] * 6
    assert EM.rate('0.3', 0) == 0.3 / 10
    assert EM.rate('0.3', 19) == 0.3 / 10
    assert EM.rate('0.3', 20) == 0.3 == EM.rate('0.3', 999)
    assert EM.rate('10', 5) == 1.0 and EM.rate('0.03', 0) == 0.03 / 10
    with pytest.raises(TypeError):
        EM.rate(0.3, 0)
    b = EM.batches(6542)
    assert len(b) == 131 and b[0] == (0, 50) and b[-1] == (6500, 6542) and b[-1][1] - b[-1][0] == 42
    b = EM.batches(5696)
    assert len(b) == 114 and b[-1][1] - b[-1][0] == 46
    assert sum(y - x for x, y in EM.batches(6542)) == 6542
    assert (EM.EPOCHS, EM.BURNIN, EM.BATCH, EM.NEGS) == (1000, 20, 50, 50)
    assert 131 * EM.EPOCHS == 131000 and 6542 * 50 * EM.EPOCHS == 327100000      # A10.12's budget


def test_short_last_batch_and_burnin(small):
    """Every batch of every epoch, in order: sizes 50, ..., 50, E % 50, and eta = lr / 10 before the burn-in's end."""
    _, inst = small
    E = inst.E
    assert E % 50 != 0
    calls = []
    orig = EM._STEPS['lorentz']

    def spy(XT, AT, touched, eta, diag):
        calls.append(eta)
        return orig(XT, AT, touched, eta, diag)
    sizes = []
    orig_t = EM._TERMS['lorentz']

    def spy_t(XT, U, C, diag, loss=None):
        sizes.append(len(U))
        assert C.shape == (len(U), 51)
        return orig_t(XT, U, C, diag, loss)
    EM._STEPS['lorentz'], EM._TERMS['lorentz'] = spy, spy_t
    try:
        run = EM.train(inst, 'lorentz', 2, '0.3', 80104, epochs=22)
    finally:
        EM._STEPS['lorentz'], EM._TERMS['lorentz'] = orig, orig_t
    per = len(EM.batches(E))
    assert sizes == ([50] * (E // 50) + [E % 50]) * 22
    assert calls == [0.3 / 10] * (20 * per) + [0.3] * (2 * per)
    assert run.batch_sizes == [50] * (E // 50) + [E % 50] and run.epochs_run == 22 and len(run.epoch_loss) == 22


# ================================================================ item 4: two implementations, bit for bit
@pytest.mark.parametrize('geometry', EM.GEOMETRIES)
@pytest.mark.parametrize('d', (2, 3, 13))
def test_two_implementations_bitwise(small, geometry, d):
    _, inst = small
    for lr in ('1', '10'):
        run = EM.train(inst, geometry, d, lr, 80110 + d, epochs=3, burnin=1)
        X, dv, guard, max_step, state = embed_ref.train_ref(inst, geometry, d, lr, 80110 + d, 3, 1)
        assert dv is None and run.diverged_epoch is None
        assert np.array(X, dtype=np.float64).tobytes() == run.table.tobytes()
        assert EM.table_sha(np.array(X)) == run.table_sha
        assert (guard, max_step, state) == (run.guard_hits, run.max_step, run.final_state)


def test_two_implementations_with_guard_hits(small, monkeypatch):
    """Every even node starts at the origin (1, 0, 0): terms between two of them have z = 1 exactly, guard hits in
    both implementations, mixed with ordinary terms; the tables still agree byte for byte."""
    _, inst = small

    def hook(X):
        return [[1.0, 0.0, 0.0] if i % 2 == 0 else list(r) for i, r in enumerate(X)]
    orig = EM.init_table

    def patched(stream, n, d, geometry):
        X = orig(stream, n, d, geometry)
        X[::2] = [1.0, 0.0, 0.0]
        return X
    monkeypatch.setattr(EM, 'init_table', patched)
    run = EM.train(inst, 'lorentz', 2, '0.3', 80120, epochs=2, burnin=1)
    X, dv, guard, max_step, state = embed_ref.train_ref(inst, 'lorentz', 2, '0.3', 80120, 2, 1, init_hook=hook)
    assert run.guard_hits >= 50 and guard == run.guard_hits
    assert np.array(X).tobytes() == run.table.tobytes() and max_step == run.max_step and state == run.final_state


def test_guard_hit():
    """An anchor and its positive coincide at (1, 0, 0): z = 1, so d = 0, the term has no gradient, one guard hit, no
    NaN; the positive (met only through that term) keeps its row."""
    X = np.zeros((5, 3))
    X[:, 0] = 1.0
    X[2:, 1:] = [[0.01, 0.0], [0.0, -0.02], [0.03, 0.01]]
    X[2:, 0] = np.sqrt(1.0 + EM.sdot(X[2:, 1:], X[2:, 1:]))
    U = np.array([0])
    C = np.array([[1] + [2, 3, 4] * 16 + [2, 3]])
    A, touched = EM.accumulators(X, U, C, 'lorentz')
    assert touched.tolist() == [0, 1, 2, 3, 4]
    assert A[1].tolist() == [0.0, 0.0, 0.0]
    diag = EM.Diag()
    loss = np.empty(1)
    Y = X.copy()
    with np.errstate(all='ignore'):
        EM.lorentz_batch(Y, U, C, 0.5, diag, loss)
    assert diag.guard_hits == 1
    assert np.isfinite(Y).all() and np.isfinite(loss).all()
    assert Y[1].tolist() == [1.0, 0.0, 0.0]
    assert not np.array_equal(Y[0], X[0])
    # d_0 = 0, so the loss is log(sum_j exp(-d_j)) with m = 0
    dz = [X[0, 0] * X[c, 0] - X[0, 1] * X[c, 1] - X[0, 2] * X[c, 2] for c in C[0]]
    ds = [0.0] + [math.acosh(z) for z in dz[1:]]
    assert abs(loss[0] - math.log(sum(math.exp(-t) for t in ds))) < 1e-12


def test_divergence(small):
    _, inst = small
    for g in EM.GEOMETRIES:
        run = EM.train(inst, g, 2, '1000000', 80130, epochs=40)
        assert isinstance(run.diverged_epoch, int) and run.table is None and run.table_sha is None
        assert run.epochs_run == run.diverged_epoch + 1 < 40
        assert len(run.final_state) == 4
    run = EM.train(inst, 'lorentz', 2, '1', 80130, epochs=2)
    assert run.diverged_epoch is None and run.table is not None


def test_sheet_identity(big):
    _, inst = big
    run = EM.train(inst, 'lorentz', 3, '1', 80131, epochs=5)
    X = run.table
    xs = X[:, 1:]
    assert X[:, 0].tobytes() == np.sqrt(1.0 + EM.sdot(xs, xs)).tobytes()
    mink = -X[:, 0] * X[:, 0] + EM.sdot(xs, xs)
    assert np.all(np.abs(mink + 1.0) <= 1e-12 * X[:, 0] ** 2)
    assert run.max_radius >= float(np.arccosh(X[:, 0].max()))
    assert run.guard_hits == 0 and len(run.epoch_loss) == 5 and run.epoch_loss[-1] < run.epoch_loss[0]


def test_same_job_twice(big):
    _, inst = big
    for g in EM.GEOMETRIES:
        a = EM.train(inst, g, 3, '3', 80132, epochs=2)
        b = EM.train(inst, g, 3, '3', 80132, epochs=2)
        assert a.table_sha == b.table_sha and a.final_state == b.final_state and a.epoch_loss == b.epoch_loss
        assert a.table_sha == hashlib.sha256(a.table.astype('<f8').tobytes()).hexdigest()


def test_table_bytes():
    X = np.array([[1.5, -2.0], [3.0, 0.25]])
    assert EM.table_bytes(X) == struct.pack('<4d', 1.5, -2.0, 3.0, 0.25)
    assert EM.table_bytes(np.asfortranarray(X)) == EM.table_bytes(X)
    assert EM.table_sha(X) == hashlib.sha256(struct.pack('<4d', 1.5, -2.0, 3.0, 0.25)).hexdigest()


# ================================================================ item 4: the Decimal oracle, finite differences
def _trained_batch(inst, geometry, epochs, lr, seed, d=3):
    """Train `epochs` epochs, then the first batch of the next epoch from the run's own stream: (X, U, C, eta)."""
    run = EM.train(inst, geometry, d, lr, seed, epochs=epochs)
    st = Stream.from_state(run.final_state)
    perm = st.shuffle_fresh(inst.E)
    anchors = inst.pos[perm, 0]
    negs = st.negatives(anchors[:50], 50, inst.nn_ptr, inst.nn_flat)
    U = anchors[:50]
    C = np.concatenate([inst.pos[perm[:50], 1][:, None], negs], axis=1)
    return run.table, U, C, EM.rate(lr, epochs)


@pytest.mark.parametrize('geometry,tol', [('lorentz', 1e-10), ('euclid', 1e-13)])
def test_decimal_oracle(big, geometry, tol):
    _, inst = big
    X, U, C, eta = _trained_batch(inst, geometry, 30, '1', 80140)
    Y = X.copy()
    with np.errstate(all='ignore'):
        (EM.lorentz_batch if geometry == 'lorentz' else EM.euclid_batch)(Y, U, C, eta, EM.Diag())
    out = l6_oracle.step(X, U, C, eta, geometry)
    assert sorted(out) == sorted(set(U.tolist()) | set(C.ravel().tolist()))
    assert set(np.flatnonzero((Y != X).any(axis=1)).tolist()) <= set(out)
    err = l6_oracle.max_row_error(Y, out)
    assert err <= tol, err
    # the rows of nodes not met are untouched
    met = sorted(out)
    rest = np.setdiff1d(np.arange(inst.n), met)
    assert Y[rest].tobytes() == X[rest].tobytes()


@pytest.mark.parametrize('geometry', EM.GEOMETRIES)
def test_finite_differences(big, geometry):
    """Central differences (h = 1e-25) of the 60-digit batch loss against the analytic ambient gradient, to a relative
    1e-20; and the float trainer's accumulators against the same gradient (Lorentz: e = (A0, -A1, ..., -Ad))."""
    _, inst = big
    X, U, C, _ = _trained_batch(inst, geometry, 5, '1', 80141)
    U, C = U[:6], C[:6]
    rows = l6_oracle.rows_of(U, C)
    nodes = sorted({u for u, _ in rows} | {c for _, cs in rows for c in cs})
    P = l6_oracle.points(X, nodes)
    e = l6_oracle.ambient_gradient(P, rows, geometry)
    h = Decimal('1e-25')
    checked = 0
    for v in (rows[0][0], rows[0][1][0], rows[0][1][1], rows[1][0]):
        for k in range(X.shape[1]):
            with localcontext() as ctx:
                ctx.prec = 80
                Pp = {a: list(b) for a, b in P.items()}
                Pm = {a: list(b) for a, b in P.items()}
                Pp[v][k] += h
                Pm[v][k] -= h
                num = (l6_oracle.batch_loss(Pp, rows, geometry) - l6_oracle.batch_loss(Pm, rows, geometry)) / (2 * h)
                assert abs(num - e[v][k]) <= Decimal('1e-20') * max(abs(e[v][k]), Decimal('1e-30')), (v, k)
            checked += 1
    assert checked >= 4 * 3
    A, touched = EM.accumulators(X, U, C, geometry)
    assert touched.tolist() == nodes
    for v in nodes:
        amb = [A[v, 0]] + [-a for a in A[v, 1:]] if geometry == 'lorentz' else A[v].tolist()
        scale = max(abs(t) for t in e[v])
        assert max(abs(Decimal(float(a)) - b) for a, b in zip(amb, e[v])) <= Decimal('1e-9') * scale


# ================================================================ items 1 and 4: reproducibility across processes
_JOB = r'''
import json, os, sys
sys.path.insert(0, %(ref)r)
sys.path.insert(0, os.path.join(%(ref)r, 'tests'))
import lexicon, l6_synth
from lexicon import embed as EM
inst = EM.training_instance(l6_synth.dag(80001))
out = {}
for g in EM.GEOMETRIES:
    for d in (3, 50):
        out['%%s-%%d' %% (g, d)] = EM.train(inst, g, d, '1', 80150, epochs=3).table_sha
print(json.dumps(out, sort_keys=True))
'''

THREAD_VARS = ('OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'OMP_NUM_THREADS', 'NUMEXPR_NUM_THREADS',
               'NUMBA_NUM_THREADS')


@pytest.mark.slow
def test_bitwise_reproducible(big):
    """Item 4's same-machine promise: four concurrent processes (two with every thread variable at 1, two with
    OPENBLAS_NUM_THREADS = OMP_NUM_THREADS = 4) and this process give the same table SHA-256s."""
    code = _JOB % {'ref': REFERENCE}
    procs = []
    for i in range(4):
        env = dict(os.environ)
        for v in THREAD_VARS:
            env[v] = '1'
        if i >= 2:
            env['OPENBLAS_NUM_THREADS'] = env['OMP_NUM_THREADS'] = '4'
        procs.append(subprocess.Popen([sys.executable, '-B', '-c', code], env=env, cwd=REFERENCE,
                                      stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True))
    outs = []
    for p in procs:
        o, err = p.communicate(timeout=900)
        assert p.returncode == 0, err
        outs.append(json.loads(o.strip().split('\n')[-1]))
    _, inst = big
    here = {f'{g}-{d}': EM.train(inst, g, d, '1', 80150, epochs=3).table_sha for g in EM.GEOMETRIES for d in (3, 50)}
    assert all(o == here for o in outs), outs


def test_runner_sets_threads():
    """Item 1: the runner sets the five thread variables to 1 before numpy is imported (skipped until the runner
    exists)."""
    path = os.path.join(REFERENCE, 'run_claims_phase4.py')
    if not os.path.exists(path):
        pytest.skip('run_claims_phase4.py is not written yet')
    tree = ast.parse(open(path).read())
    seen, first_numpy = set(), None
    for i, node in enumerate(tree.body):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = [a.name for a in node.names] + ([node.module] if isinstance(node, ast.ImportFrom) else [])
            if any(n and n.split('.')[0] not in ('os', 'sys', '__future__') for n in names):
                first_numpy = i
                break
        for sub in ast.walk(node):
            if isinstance(sub, ast.Constant) and sub.value in THREAD_VARS:
                seen.add(sub.value)
    assert first_numpy is not None and seen == set(THREAD_VARS)
    env = {k: v for k, v in os.environ.items() if k not in THREAD_VARS}
    code = ('import os, sys; sys.path.insert(0, %r); import run_claims_phase4; '
            'print(*[os.environ.get(v) for v in %r])' % (REFERENCE, THREAD_VARS))
    out = subprocess.run([sys.executable, '-B', '-c', code], env=env, cwd=REFERENCE, capture_output=True, text=True,
                         check=True).stdout.split()
    assert out == ['1'] * 5


# ================================================================ item 1: no BLAS in the trainer
def test_no_blas_in_trainer():
    """An AST scan of embed.py (code only, docstrings and comments aside): no @, and no dot, vdot, inner, outer,
    einsum, matmul, tensordot, linalg, .sum or .mean, as attributes, names or imports."""
    src = open(os.path.join(REFERENCE, 'lexicon', 'embed.py')).read()
    banned = {'dot', 'vdot', 'inner', 'outer', 'einsum', 'matmul', 'tensordot', 'linalg', 'mean'}
    for node in ast.walk(ast.parse(src)):
        if isinstance(node, (ast.BinOp, ast.AugAssign)):
            assert not isinstance(node.op, ast.MatMult)
        if isinstance(node, ast.Attribute):
            assert node.attr not in banned | {'sum'}, node.attr
        if isinstance(node, ast.Name):
            assert node.id not in banned, node.id
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            assert not any(a.name.split('.')[-1] in banned | {'sum'} for a in node.names)
            assert not (isinstance(node, ast.ImportFrom) and node.module and 'linalg' in node.module)


# ================================================================ counting only, on the registered and dry sets
def test_registered_counts(wn):
    """A10.2 and A10.13, counted (no training, ranking or evaluation): sizes, positives, non-neighbour counts, the
    graph-less queries and the instance SHA-256."""
    meta = json.load(open(os.path.join(REFERENCE, 'golden', 'wordnet_v1.meta.json')))
    from lexicon import wordnet as W
    cs = EM.closure_set(wn, '01861778')
    assert list(cs.offsets) == W.mammal_sets(wn)[0]
    assert cs.n == 1182 and cs.instance_sha == meta['mammal']['closureSha256']
    inst = EM.training_instance(cs)
    assert inst.E == 6542 == meta['mammal']['closureEdges']
    sizes = inst.nn_sizes()
    idx = {o: i for i, o in enumerate(cs.offsets)}
    anchors = sorted(set(inst.pos[:, 0].tolist()))
    assert idx['01861778'] not in anchors and sizes[idx['01861778']] == 0
    assert sizes[idx['01886756']] == 49
    assert min(sizes[u] for u in anchors) == 49 and max(sizes[u] for u in anchors) == 1180
    assert len(anchors) == 1181
    graphless = [cs.offsets[i] for i, nb in enumerate(cs.graph_nb) if not nb]
    assert graphless == ['01322508', '01322604', '01322898', '01322983', '01323068', '01862399']
    assert all(nb for nb in cs.closure_nb)
    assert len(cs.words) == 1182
    dry = EM.closure_set(wn, '15046900')
    di = EM.training_instance(dry)
    ds = di.nn_sizes()
    da = sorted(set(di.pos[:, 0].tolist()))
    assert (dry.n, di.E) == (1232, 5696)
    assert sum(1 for nb in dry.graph_nb if not nb) == 11
    assert min(ds[u] for u in da) == 110 and len(da) == 1231
    assert sum(1 for s in ds if s == 0) == 1
