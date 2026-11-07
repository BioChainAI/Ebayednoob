"""L14's training additions (Amendment 13, item 10; build spec sections 10 and 13, tests 12-14): the implicit
non-neighbour map against explicit tables, the implicit negatives kernel against a pure-Python replay on
hpstep.prng.Rng output for output (below's rejection paths included) and against Stream.negatives on materialised
instances, embed.train with ImplicitStream against embed.train with the explicit instance bit for bit, a short run's
reproducibility, replay_states with the map's sizes, the edge-shuffled instance against l6.edge_nonneighbours, the
floors, the convergence predicate on synthetic loss curves; then, on WordNet 3.0 (counting only, nothing trained or
scored), the direct-edge instance's counts (U_@, E), its map on 320 anchors, the dry verb instance's, and the map's
memory.

Synthetic DAGs follow tests/l6_synth.py's patterns. Seeds 95200 + i only (A13.12; build spec section 0):
hpstep.prng.Rng, lexicon.stream.Stream (and so ImplicitStream) and lexicon.pystream.PyStream refuse any other seed
while these tests run. The registered seeds appear only as constants, checked as values."""
import bisect
import hashlib
import json
import os
import subprocess
import sys

import numpy as np
import pytest

import hpstep.prng as P
import l6_synth
from lexicon import REFERENCE
from lexicon import embed as EM
from lexicon import l6
from lexicon import learned
from lexicon import pystream as PS
from lexicon import stream as S

ALLOWED = range(95200, 95500)                   # the tests' unregistered seeds (A13.12)
U_AT_SHA = '9af5a81a2d8725ba431ebfc55fe17b6698a024b8d85f09c01106ae1218eeb117'      # A13.9
E_SHA = '74748ad85fcea82e8f282f5ab72cfdfacc292aa4073d58c078d7a311fa2d7dd2'         # A13.9
HEAVY = 2 ** 31 + 1                              # below(2^31 + 1) rejects with probability about 1/2
THREAD_VARS = ('OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'OMP_NUM_THREADS', 'NUMEXPR_NUM_THREADS',
               'NUMBA_NUM_THREADS')


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    def wrap(init):
        def guarded(self, seed=0, state=None):
            if state is None and seed not in ALLOWED:
                raise RuntimeError(f'seed {seed}: Stage 2 tests draw 95200 + i only (A13.12)')
            return init(self, seed, state)
        return guarded
    for cls in (P.Rng, S.Stream, PS.PyStream):
        monkeypatch.setattr(cls, '__init__', wrap(cls.__init__))


def test_guard():
    """The seed guard refuses registered and dry seeds (A13.12), ImplicitStream included; state= is never refused."""
    m = EM.ImplicitMap.from_related(3, [set(), set(), set()])
    for make in (lambda: P.Rng(7), lambda: P.Rng(), lambda: S.Stream(0), lambda: PS.PyStream(2600),
                 lambda: S.ImplicitStream(9000, m), lambda: S.ImplicitStream(3004, m), lambda: P.Rng(95500),
                 lambda: P.Rng(95199), lambda: S.Stream(12011), lambda: PS.PyStream(5600)):
        with pytest.raises(RuntimeError):
            make()
    assert S.ImplicitStream(state=(5, 6, 7, 8), imap=m).state() == (5, 6, 7, 8)


@pytest.fixture(scope='module', autouse=True)
def compiled():
    S.compile_implicit_kernels()


# ================================================================ synthetic instances (l6_synth's patterns)
def direct_dag(seed, n=1300, extra=300):
    """A random DAG by l6_synth.dag_parents' rule (one root, shallow, `extra` second parents) read as direct edges:
    positives (child, parent) for every parent; related(u) = parents(u) | children(u), A13.10.1's relation."""
    parents = l6_synth.dag_parents(seed, n, extra=extra, top=2, target=0)
    pairs = [(i, p) for i in range(n) for p in parents[i]]
    related = [set(parents[i]) for i in range(n)]
    for i, p in pairs:
        related[p].add(i)
    return n, pairs, related


def explicit_pair(name, n, pairs, related):
    """The same instance twice: Phase 4's explicit CSR (embed._instance) and the implicit one."""
    return EM._instance(name, n, pairs, related), EM.implicit_instance(name, n, pairs, related)


def complement(n, rel):
    """NN(u) by brute force: every node not in rel (rel holds u), ascending."""
    keep = np.ones(n, dtype=bool)
    keep[np.asarray(sorted(rel), dtype=np.int64)] = False
    return np.flatnonzero(keep).astype(np.int64)


def check_anchors(imap, anchors, rel_of, seed=95200, k=300, few=20):
    """A13.10.2's check on 320 anchors: the `few` anchors with the fewest non-neighbours (ties by index) and `k` more,
    distinct, drawn with Rng(seed).sample (partial Fisher-Yates) from the other anchors in anchor order, so that
    exactly k + few anchors are checked (every anchor when there are fewer); every index j of NN(u) against the
    brute-force complement. Returns the anchors checked, ascending."""
    anchors = np.asarray(anchors, dtype=np.int64)
    sizes = imap.sizes()[anchors]
    thin = [int(u) for u in anchors[np.lexsort((anchors, sizes))[:few]]]
    rest = [int(u) for u in anchors if int(u) not in set(thin)]
    drawn = rest if len(rest) <= k else [rest[j] for j in P.Rng(seed).sample(len(rest), k)]
    chosen = sorted(set(thin) | set(drawn))
    assert len(chosen) == min(k + few, len(set(anchors.tolist())))
    for u in chosen:
        want = complement(imap.n, rel_of(u))
        assert imap.size(u) == len(want)
        assert np.array_equal(imap.explicit(u), want), u
        assert np.array_equal(imap.nn(u, np.arange(len(want))), want), u
    return chosen


def py_negatives_implicit(rng, anchors, k, n, r_ptr, shift, rejected=None):
    """A pure-Python replay of A13.10.2's draws on hpstep.prng.Rng itself: per anchor in order, m = n - |R(u)|, then
    k times j = Rng.below(m) and NN(u)[j] = j + #{i : shift_i <= j} by bisect. `rejected`, a list, gets True for a
    below() that consumed more than one output (a rejection)."""
    out = []
    r_ptr = [int(x) for x in r_ptr]
    shift = [int(x) for x in shift]
    for u in [int(a) for a in anchors]:
        seg = shift[r_ptr[u]:r_ptr[u + 1]]
        m = n - len(seg)
        if m < 1:
            raise ValueError('an anchor without non-neighbours')
        row = []
        for _ in range(k):
            before = tuple(rng.s)
            j = rng.below(m)
            if rejected is not None:
                probe = P.Rng(state=before)
                probe.next_u32()
                rejected.append(tuple(probe.s) != tuple(rng.s))
            row.append(j + bisect.bisect_right(seg, j))
        out.append(row)
    return np.array(out, dtype=np.int64).reshape(len(out), k)


# ================================================================ the kernel against hpstep.prng.Rng
def test_kernel_equals_python_replay_on_maps():
    """ImplicitStream.negatives equals the pure-Python replay output for output, state checked after every call, on
    a direct-edge DAG and on a closure set with an anchor of 3 non-neighbours (l6_synth.small's shape)."""
    n, pairs, related = direct_dag(95201, n=400, extra=60)
    _, (inst, imap) = explicit_pair('dag', n, pairs, related)
    cs = l6_synth.small(95202)
    rel = [cs.anc[u] | cs.desc[u] for u in range(cs.n)]
    pairs2 = [(u, v) for u in range(cs.n) for v in sorted(cs.anc[u])]
    inst2, imap2 = EM.implicit_instance('small', cs.n, pairs2, rel)
    assert min(imap2.size(u) for u in np.unique(inst2.pos[:, 0])) == 3
    for seed, (ins, im) in ((95203, (inst, imap)), (95204, (inst2, imap2))):
        r, st = P.Rng(seed), S.ImplicitStream(seed, im)
        anchors = ins.pos[:, 0]
        for k in (50, 1, 7):
            got = st.negatives(anchors, k, ins.nn_ptr, ins.nn_flat)
            want = py_negatives_implicit(r, anchors, k, im.n, im.r_ptr, im.shift)
            assert np.array_equal(got, want)
            assert st.state() == tuple(r.s)
            # every draw is a non-neighbour of its anchor, by the brute-force complement
            for a, row in zip(anchors[:40].tolist(), got[:40].tolist()):
                nn = set(complement(im.n, im.related(a)).tolist())
                assert all(x in nn for x in row)
        # the other calls are Stream's
        assert st.shuffle_fresh(ins.E).tolist() == r.shuffle(list(range(ins.E)))
        assert st.random_many(9).tolist() == [r.random() for _ in range(9)]
        assert st.state() == tuple(r.s)


def test_kernel_rejection_paths():
    """The kernel's below() on bounds that reject about half the time (|NN(u)| = 2^31 + 1 and nearby), at the
    largest bound (2^32, never rejects), at 1, and its refusals (|NN(u)| = 0 and |NN(u)| > 2^32), against the
    pure-Python replay output for output. The map is implicit, so n can be 2^31 + a few: the kernel reads r_ptr only
    at u and u + 1, and a short r_ptr serves the anchors used."""
    # R(0) = {0}; R(1) = {5, 2^31 - 3}; R(2) = {}; R(3) = {0, 1, 2}  ->  shift segments
    R = [[0], [5, 2 ** 31 - 3], [], [0, 1, 2]]
    r_ptr = np.zeros(len(R) + 1, dtype=np.int64)
    shift = []
    for u, r in enumerate(R):
        shift += [x - i for i, x in enumerate(r)]
        r_ptr[u + 1] = r_ptr[u] + len(r)
    shift = np.array(shift, dtype=np.int64)
    anchors = np.array([0, 1, 2, 3, 1, 0, 2], dtype=np.int64)
    rejected = []
    for seed, n in ((95205, HEAVY + 1), (95206, HEAVY + 2), (95207, 2 ** 31 + 3), (95208, 9)):
        r, st = P.Rng(seed), S.Stream(seed)
        for k in (50, 3):
            got = S._negatives_implicit(st.s, anchors, k, n, r_ptr, shift)
            want = py_negatives_implicit(r, anchors, k, n, r_ptr, shift, rejected)
            assert np.array_equal(got, want), (seed, n)
            assert st.state() == tuple(r.s)
            # the draws skip R(u): never in R(u), always below n
            for a, row in zip(anchors.tolist(), got.tolist()):
                assert all(0 <= x < n and x not in R[a] for x in row)
    assert sum(rejected) > 50, 'below() rarely rejected: the bounds do not exercise rejection'
    # |NN(u)| = 2^32 exactly (the largest bound below() takes) and |NN(u)| = 1
    r, st = P.Rng(95209), S.Stream(95209)
    for n, a in ((2 ** 32 + 1, 0), (2 ** 32 + 2, 1), (2, 0), (4, 3)):
        got = S._negatives_implicit(st.s, np.array([a]), 40, n, r_ptr, shift)
        assert np.array_equal(got, py_negatives_implicit(r, [a], 40, n, r_ptr, shift))
        assert st.state() == tuple(r.s)
    assert set(S._negatives_implicit(st.s, np.array([3]), 20, 4, r_ptr, shift).ravel().tolist()) == {3}
    # refusals: |NN(u)| = 0, and |NN(u)| = 2^32 + 1; nothing is drawn before the refusal
    for n, a in ((3, 3), (1, 0), (2 ** 32 + 2, 0)):
        st = S.Stream(95210)
        before = st.state()
        with pytest.raises(ValueError):
            S._negatives_implicit(st.s, np.array([a]), 5, n, r_ptr, shift)
        assert st.state() == before
    with pytest.raises(ValueError):
        py_negatives_implicit(P.Rng(95210), [3], 5, 3, r_ptr, shift)
    with pytest.raises(ValueError):
        P.Rng(95210).below(2 ** 32 + 1)
    # k = 0 draws nothing
    st = S.Stream(95211)
    before = st.state()
    assert S._negatives_implicit(st.s, anchors, 0, 9, r_ptr, shift).shape == (7, 0)
    assert st.state() == before


def test_kernel_draws_are_below_many():
    """The implicit kernel makes exactly the below() calls that _negatives makes on an explicit table: the same calls
    on the same bounds as Stream.below_many, whose j it maps to NN(u)[j] (here R(0) = {1, 8}, so j -> j + [j >= 1] +
    [j >= 7]), on a bound near 2^31 that rejects about half the time."""
    n = HEAVY + 3
    r_ptr = np.array([0, 2], dtype=np.int64)
    shift = np.array([1, 7], dtype=np.int64)                       # R(0) = {1, 8}
    a, b = S.Stream(95212), S.Stream(95212)
    got = S._negatives_implicit(a.s, np.zeros(300, dtype=np.int64), 3, n, r_ptr, shift)
    js = b.below_many(np.full(900, n - 2, dtype=np.int64)).reshape(300, 3)
    assert a.state() == b.state()
    assert np.array_equal(got, js + (js >= 1) + (js >= 7))


# ================================================================ against the explicit table (A13.10.2)
def test_map_equals_explicit_table_on_synthetic_dags():
    """Every node of a direct-edge DAG and of a closure set: the map's NN(u), entry by entry, equals Phase 4's
    explicit CSR (nonneighbour_csr); sizes equal; the 320-anchor protocol of A13.10.2 on the DAG."""
    n, pairs, related = direct_dag(95213)
    explicit, (inst, imap) = explicit_pair('dag', n, pairs, related)
    assert np.array_equal(inst.pos, explicit.pos)
    assert np.array_equal(imap.sizes(), explicit.nn_sizes())
    for u in range(n):
        row = explicit.nn_flat[explicit.nn_ptr[u]:explicit.nn_ptr[u + 1]]
        assert np.array_equal(imap.explicit(u), row)
        assert np.array_equal(imap.nn(u, np.arange(len(row))), row)
        assert np.array_equal(imap.related(u), np.array(sorted({u} | related[u]), dtype=np.int64))
    assert imap.shift.shape[0] == n + 2 * len(pairs)              # sum |R(u)| = n + 2E for a direct-edge relation
    chosen = check_anchors(imap, np.unique(inst.pos[:, 0]), lambda u: {u} | related[u])
    assert len(chosen) == 320
    cs = l6_synth.dag(95214)
    exp = EM.training_instance(cs)
    rel = [cs.anc[u] | cs.desc[u] for u in range(cs.n)]
    pairs2 = [(u, v) for u in range(cs.n) for v in sorted(cs.anc[u])]
    inst2, imap2 = EM.implicit_instance('closure', cs.n, pairs2, rel)
    assert np.array_equal(inst2.pos, exp.pos) and np.array_equal(imap2.sizes(), exp.nn_sizes())
    for u in range(cs.n):
        assert np.array_equal(imap2.explicit(u), exp.nn_flat[exp.nn_ptr[u]:exp.nn_ptr[u + 1]])


def test_stream_equals_explicit_over_three_epochs():
    """A13.10.2: on a materialised instance of about 1,300 nodes, ImplicitStream.negatives's arrays and state equal
    Stream.negatives's on the explicit table over 3 epochs (each epoch: shuffle_fresh(E), then one negatives call
    over the anchors in permutation order, as embed.train draws)."""
    n, pairs, related = direct_dag(95215, n=1300, extra=300)
    explicit, (inst, imap) = explicit_pair('dag', n, pairs, related)
    a, b = S.Stream(95216), S.ImplicitStream(95216, imap)
    assert np.array_equal(a.random_many(n * 2), b.random_many(n * 2))
    draws = 0
    for _ in range(3):
        pa, pb = a.shuffle_fresh(explicit.E), b.shuffle_fresh(inst.E)
        assert np.array_equal(pa, pb)
        na = a.negatives(explicit.pos[pa, 0], EM.NEGS, explicit.nn_ptr, explicit.nn_flat)
        nb = b.negatives(inst.pos[pb, 0], EM.NEGS, inst.nn_ptr, inst.nn_flat)
        assert np.array_equal(na, nb)
        assert a.state() == b.state()
        draws += na.size
    assert draws == 3 * EM.NEGS * len(pairs)


@pytest.mark.parametrize('geometry,d,lr', [('lorentz', 2, '1'), ('euclid', 3, '0.3'), ('lorentz', 3, '0.3')])
def test_train_bitwise_implicit_vs_explicit(geometry, d, lr):
    """embed.train with ImplicitStream equals embed.train with the explicit instance bit for bit at 20 epochs (table
    SHA-256, final state, epoch losses, guard hits, largest step and radius); train_implicit is the same call; the
    run's stream name says which map drew."""
    n, pairs, related = direct_dag(95217, n=300, extra=60)
    explicit, (inst, imap) = explicit_pair('dag', n, pairs, related)
    kw = dict(epochs=20, burnin=5)
    a = EM.train(explicit, geometry, d, lr, 95218, **kw)
    b = EM.train(inst, geometry, d, lr, 95218, stream_cls=lambda s: S.ImplicitStream(s, imap), **kw)
    c = EM.train_implicit(inst, imap, geometry, d, lr, 95218, **kw)
    for run in (b, c):
        assert run.diverged_epoch is None and run.table_sha is not None
        assert run.table_sha == a.table_sha
        assert run.final_state == a.final_state
        assert run.epoch_loss == a.epoch_loss
        assert (run.guard_hits, run.max_step, run.max_radius) == (a.guard_hits, a.max_step, a.max_radius)
        assert np.array_equal(run.table, a.table)
        assert run.stream == S.ImplicitStream.name != a.stream
    with pytest.raises(TypeError):
        EM.train_implicit(inst, imap, geometry, d, lr, 95218, stream_cls=S.Stream)


_JOB = r'''
import os, sys, json
sys.path.insert(0, %(ref)r); sys.path.insert(0, os.path.join(%(ref)r, 'tests'))
import lexicon, l6_synth
from lexicon import embed as EM
parents = l6_synth.dag_parents(95219, 300, extra=60, top=2, target=0)
pairs = [(i, p) for i in range(300) for p in parents[i]]
related = [set(parents[i]) for i in range(300)]
for i, p in pairs:
    related[p].add(i)
inst, imap = EM.implicit_instance('dag', 300, pairs, related)
out = {}
for g, d in (('lorentz', 2), ('euclid', 2)):
    run = EM.train_implicit(inst, imap, g, d, '1', 95220, epochs=6, burnin=2)
    out[g] = [run.table_sha, list(run.final_state)]
print(json.dumps(out))
'''


def test_short_run_reproducible():
    """A short implicit run gives the same table and state twice in this process and in a fresh process whose thread
    variables are 4 (A10.4: each run is one single-threaded process; threads change no bit)."""
    parents = l6_synth.dag_parents(95219, 300, extra=60, top=2, target=0)
    pairs = [(i, p) for i in range(300) for p in parents[i]]
    related = [set(parents[i]) for i in range(300)]
    for i, p in pairs:
        related[p].add(i)
    inst, imap = EM.implicit_instance('dag', 300, pairs, related)
    here = {}
    for g, d in (('lorentz', 2), ('euclid', 2)):
        r1 = EM.train_implicit(inst, imap, g, d, '1', 95220, epochs=6, burnin=2)
        r2 = EM.train_implicit(inst, imap, g, d, '1', 95220, epochs=6, burnin=2)
        assert (r1.table_sha, r1.final_state) == (r2.table_sha, r2.final_state)
        here[g] = [r1.table_sha, list(r1.final_state)]
    env = dict(os.environ)
    for v in THREAD_VARS:
        env[v] = '4'
    p = subprocess.run([sys.executable, '-B', '-c', _JOB % {'ref': REFERENCE}], env=env, cwd=REFERENCE,
                       capture_output=True, text=True, timeout=600)
    assert p.returncode == 0, p.stderr
    assert json.loads(p.stdout.strip().split('\n')[-1]) == here


def test_replay_states_with_implicit_sizes():
    """Build spec test 13: pystream.replay_states with the map's sizes reaches the trained run's final state, with
    hpstep.prng.Rng itself (PyStream) and with the numba stream; the placeholders' sizes refuse."""
    n, pairs, related = direct_dag(95221, n=200, extra=40)
    inst, imap = EM.implicit_instance('dag', n, pairs, related)
    for d in (2, 3):
        run = EM.train_implicit(inst, imap, 'lorentz', d, '1', 95222, epochs=4, burnin=1)
        a = PS.replay_states(PS.PyStream(95222), n, d, inst.pos[:, 0], imap.sizes(), 4)
        b = PS.replay_states(S.Stream(95222), n, d, inst.pos[:, 0], imap.sizes(), 4)
        assert a == b and len(a) == 5 and a[-1] == run.final_state
    with pytest.raises(ValueError):
        PS.replay_states(PS.PyStream(95222), n, 2, inst.pos[:, 0], inst.nn_sizes(), 1)


# ================================================================ the placeholders, the map's checks, the stream's API
def test_placeholders_refuse_explicit_draws():
    """The Instance from the implicit builders holds no table: an explicit draw through its placeholders raises
    before it draws (numba's _negatives, PyStream, and embed.train left with its default Stream)."""
    n, pairs, related = direct_dag(95223, n=120, extra=20)
    inst, imap = EM.implicit_instance('dag', n, pairs, related)
    assert inst.nn_ptr.shape == (n + 1,) and not inst.nn_ptr.any() and inst.nn_flat.shape == (0,)
    assert inst.E == len(pairs) and inst.n == n
    for st in (S.Stream(95223), PS.PyStream(95223)):
        before = st.state()
        with pytest.raises(ValueError):
            st.negatives(inst.pos[:3, 0], 5, inst.nn_ptr, inst.nn_flat)
        assert st.state() == before
    with pytest.raises(ValueError):
        EM.train(inst, 'euclid', 2, '1', 95223, epochs=1)


def test_map_validation():
    m = EM.ImplicitMap.from_related(4, [{1}, {0}, set(), {2}])
    assert m.r_ptr.tolist() == [0, 2, 4, 5, 7] and m.shift.tolist() == [0, 0, 0, 0, 2, 2, 2]
    assert m.sizes().tolist() == [2, 2, 3, 2] and [m.size(u) for u in range(4)] == [2, 2, 3, 2]
    assert [m.explicit(u).tolist() for u in range(4)] == [[2, 3], [2, 3], [0, 1, 3], [0, 1]]
    assert m.nn(2, 2) == 3 and m.nn(3, np.array([0, 1])).tolist() == [0, 1]
    assert m.entries == 12 and m.nbytes == 96
    for j in (-1, 2):
        with pytest.raises(IndexError):
            m.nn(0, j)
    bad = [(4, [0, 2, 4, 5], [0, 0, 0, 0, 2]),            # r_ptr of n entries
           (2, [1, 2, 3], [0, 0, 0]),                     # r_ptr[0] != 0
           (2, [0, 2, 1], [0, 0]),                        # decreasing r_ptr
           (2, [0, 1, 3], [0, 1]),                        # r_ptr[-1] != len(shift)
           (2, [0, 2, 3], [1, 0, 0]),                     # a decreasing segment (R(0) = {1, 1})
           (2, [0, 1, 2], [2, 0]),                        # R(0) = {2} outside 0..1
           (2, [0, 1, 2], [-1, 0])]                       # R(0) = {-1}
    for n, ptr, sh in bad:
        with pytest.raises(ValueError):
            EM.ImplicitMap(n, ptr, sh)
    with pytest.raises(ValueError):
        EM.ImplicitMap.from_related(3, [{3}, set(), set()])
    with pytest.raises(ValueError):
        EM.ImplicitMap.from_related(3, [set(), set()])
    # an anchor whose relation covers every node has no non-neighbour: refused, as embed._instance refuses
    with pytest.raises(ValueError):
        EM.implicit_instance('x', 3, [(0, 1)], [{1, 2}, {0}, {0}])
    with pytest.raises(ValueError):
        EM.implicit_instance('x', 3, [(0, 3)], [{1}, {0}, set()])
    # a node that is not an anchor may have none
    inst, imap = EM.implicit_instance('x', 3, [(1, 0)], [{1, 2}, {0}, {0}])
    assert imap.size(0) == 0 and imap.size(1) == 1


def test_implicit_stream_api():
    m = EM.ImplicitMap.from_related(5, [{1}, {0, 2}, {1}, set(), {0}])
    with pytest.raises(TypeError):
        S.ImplicitStream(95224)
    st = S.ImplicitStream(95224, m)
    ref = S.Stream(95224)
    assert st.state() == ref.state() and isinstance(st, S.Stream)
    assert S.ImplicitStream.from_state(st.state(), m).state() == st.state()
    assert S.ImplicitStream(state=(1, 2, 3, 4), imap=m).state() == (1, 2, 3, 4)
    with pytest.raises(ValueError):
        st.negatives(np.array([5]), 2)
    with pytest.raises(ValueError):
        st.negatives(np.array([-1]), 2)

    class Bad:
        n, r_ptr, shift = 5, np.zeros(5, dtype=np.int64), np.zeros(0, dtype=np.int64)
    with pytest.raises(ValueError):
        S.ImplicitStream(95224, Bad())
    # negatives ignores ptr and flat: any arguments give the same draws
    a, b = S.ImplicitStream(95225, m), S.ImplicitStream(95225, m)
    anchors = np.array([0, 1, 2, 3, 4, 1])
    assert np.array_equal(a.negatives(anchors, 9), b.negatives(anchors, 9, np.array([0, 1]), np.array([7])))
    assert a.state() == b.state()


# ================================================================ edge-shuffled instances and floors (A13.10.6)
def test_shuffled_implicit_instance_equals_edge_nonneighbours():
    """The edge-shuffled instance at n <= 2,000: its pairs are l6.edge_pairs_seed's (and embed.shuffled_pairs's, the
    same rule on the same generator), its NN'(a) equals l6.edge_nonneighbours entry by entry and Phase 4's explicit
    shuffled_instance, and ImplicitStream draws what Stream draws on the explicit instance."""
    n, E, seed = 1500, 1700, 95226
    inst, imap = EM.shuffled_implicit_instance(n, E, seed)
    pairs = l6.edge_pairs_seed(seed, n, E)
    assert inst.pos.tolist() == [list(p) for p in pairs] == [list(p) for p in EM.shuffled_pairs(n, E, seed)[0]]
    assert inst.name == f'edge-shuffled-{seed}'
    nn = l6.edge_nonneighbours(n, pairs)
    exp = EM.shuffled_instance(n, E, seed)
    assert np.array_equal(exp.pos, inst.pos) and np.array_equal(exp.nn_sizes(), imap.sizes())
    for u in range(n):
        row = np.array(nn[u], dtype=np.int64)
        assert np.array_equal(imap.explicit(u), row)
        assert np.array_equal(imap.nn(u, np.arange(len(row))), row)
        assert np.array_equal(exp.nn_flat[exp.nn_ptr[u]:exp.nn_ptr[u + 1]], row)
    a, b = S.Stream(95227), S.ImplicitStream(95227, imap)
    for _ in range(2):
        pa, pb = a.shuffle_fresh(E), b.shuffle_fresh(E)
        assert np.array_equal(a.negatives(exp.pos[pa, 0], EM.NEGS, exp.nn_ptr, exp.nn_flat),
                              b.negatives(inst.pos[pb, 0], EM.NEGS))
        assert a.state() == b.state()
    run_e = EM.train(exp, 'euclid', 2, '1', 95227, epochs=3, burnin=1)
    run_i = EM.train_implicit(inst, imap, 'euclid', 2, '1', 95227, epochs=3, burnin=1)
    assert (run_e.table_sha, run_e.final_state) == (run_i.table_sha, run_i.final_state)


def test_floor_table_snapped():
    """A13.10.6's floor from Rng(seed): l6.floor_table, which is item 3's initial table (the same numbers as the
    trainer's own init with the same seed, and an untrained run's table), and its snap at 2^-32."""
    for geometry, d in (('lorentz', 2), ('lorentz', 3), ('euclid', 2), ('euclid', 3)):
        X, N = EM.floor_table_snapped(95228, 400, d, geometry)
        assert X.shape == (400, d + (geometry == 'lorentz'))
        assert np.array_equal(X, l6.floor_table(95228, 400, d, geometry))
        assert np.array_equal(X, EM.init_table(PS.PyStream(95228), 400, d, geometry))
        assert N == learned.snap(X, geometry) and len(N) == 400 and all(len(row) == d for row in N)
        inst, imap = EM.implicit_instance('x', 400, [(1, 0)], [{1}, {0}] + [set()] * 398)
        assert EM.train_implicit(inst, imap, geometry, d, '1', 95228, epochs=0).table_sha == EM.table_sha(X)


def test_registered_seed_constants():
    """A13.12's L14 seeds, checked as values (nothing is drawn from them here)."""
    reg, dry = EM.L14_SEEDS['registered'], EM.L14_SEEDS['dry']
    assert reg == {'training': (0, 1, 2, 3, 4), 'tuning': tuple(range(9000, 9012)), 'edge_floor_base': 2600}
    assert dry['training'] == tuple(s + 3000 for s in reg['training'])
    assert dry['tuning'] == tuple(range(12000, 12012)) and dry['edge_floor_base'] == 5600
    assert (EM.STAGE2_N, EM.STAGE2_E) == (74401, 75850)
    assert not set(ALLOWED) & (set(reg['training']) | set(reg['tuning']) | set(dry['training']) | set(dry['tuning'])
                               | {reg['edge_floor_base'] + s for s in range(5)} | {5600 + s for s in range(5)})


# ================================================================ convergence (A13.10.7) and the 95% epoch
def curve(first, late, last, fill=None):
    """1,000 losses: epochs 0-9 at `first`, 890-899 at `late`, 990-999 at `last`, the others `fill` (default: first
    down to last, linearly)."""
    x = np.linspace(first, last, 1000) if fill is None else np.full(1000, float(fill))
    x[0:10], x[890:900], x[990:1000] = first, late, last
    return x.tolist()


def test_loss_mean_is_numpys_mean():
    """m(a, b) equals numpy's float64 mean of the slice bit for bit (the spec's reading), on random curves whose
    sums round differently in pairwise and sequential order."""
    r = P.Rng(95229)
    differs = 0
    for _ in range(150):
        x = [r.random() * 10 ** (r.below(9) - 4) for _ in range(1000)]
        for a, b in EM.CONVERGENCE_WINDOWS + ((0, 999), (3, 3), (17, 160)):
            got = EM.loss_mean(x, a, b)
            want = float(np.mean(np.asarray(x, dtype=np.float64)[a:b + 1]))
            assert got == want or (got != got and want != want)
            seq = 0.0
            for v in x[a:b + 1]:
                seq += v
            differs += seq / (b - a + 1) != got
    assert differs > 0, 'no curve told pairwise and sequential sums apart'
    for a, b in ((-1, 3), (5, 4), (0, 1000)):
        with pytest.raises(ValueError):
            EM.loss_mean([0.0] * 1000, a, b)


def test_convergence_predicate():
    # a clear drop that has flattened: converged
    x = (2.0 * np.exp(-np.arange(1000) / 60.0) + 0.5).tolist()
    assert EM.converged(x)
    # the boundary, exact in binary64: m(0,9) = 101, m(890,899) = 2, m(990,999) = 1 -> 1 <= 100 / 100
    assert EM.converged(curve(101.0, 2.0, 1.0))
    assert not EM.converged(curve(101.0, 2.0 + 2 ** -40, 1.0))         # just above the bound
    assert EM.converged(curve(101.0, 0.5, 1.0))                        # rising again late is allowed by the rule
    # no drop, or a rise: not converged
    assert not EM.converged(curve(1.0, 1.0, 1.0))
    assert not EM.converged(curve(1.0, 1.5, 2.0))
    # still falling at the end (a slow linear decline): not converged
    assert not EM.converged(np.linspace(3.0, 1.0, 1000).tolist())
    # a non-finite loss fails the comparisons
    y = curve(101.0, 2.0, 1.0)
    y[995] = float('nan')
    assert not EM.converged(y)
    # fewer than 1,000 epochs (a run stopped early) has not converged; more is not the protocol's run
    assert not EM.converged(x[:999]) and not EM.converged([])
    with pytest.raises(ValueError):
        EM.converged(x + [0.5])
    assert isinstance(EM.converged(x), bool)


def test_drop_epoch():
    # first 10 epochs at 101, then a step down to 1 at epoch 500: the drop of 100 is reached there
    x = [101.0] * 500 + [1.0] * 500
    assert EM.drop_epoch(x) == 500
    # a linear fall from 101 to 1 (epochs 0-9 at 101, 990-999 at 1): 95% of the drop of 100 is first reached at
    # epoch 950, where the line passes 6
    z = np.linspace(101.0, 1.0, 1000)
    z[:10], z[990:] = 101.0, 1.0
    e = EM.drop_epoch(z.tolist())
    assert e == 950 and 101.0 - z[e] >= 95.0 > 101.0 - z[e - 1]
    assert EM.drop_epoch(curve(1.0, 1.0, 1.0)) is None and EM.drop_epoch(x[:10]) is None


def test_stage2_functions_import_no_numba():
    """Building instances, floors and the convergence predicate never imports numba (A10.1: only training does)."""
    code = ('import sys; sys.path.insert(0, %r); import lexicon; from lexicon import embed as EM; '
            'inst, imap = EM.shuffled_implicit_instance(50, 40, 95230); '
            'EM.floor_table_snapped(95230, 20, 2, "lorentz"); EM.converged([1.0] * 1000); EM.drop_epoch([1.0] * 1000); '
            'print("numba" in sys.modules, "lexicon.stream" in sys.modules)' % REFERENCE)
    out = subprocess.run([sys.executable, '-B', '-c', code], capture_output=True, text=True, check=True,
                         cwd=REFERENCE).stdout.split()
    assert out == ['False', 'False']


# ================================================================ WordNet 3.0: counts only (nothing trained or scored)
def _independent_relation(wn, pos):
    """parents(u) | children(u) over the '@' graph, from the data lines by this test's own reading."""
    syn = wn['synsets'][pos]
    nb = {}
    for o, s in syn.items():
        for sym, p, _ in s.ptrs:
            if sym == '@':
                nb.setdefault(o, set()).add(p)
                nb.setdefault(p, set()).add(o)
    return nb


def test_direct_instance_counts(wn):
    """A13.9 and A13.10's counts of the direct-edge instance on U_@ (counting allowed): 74,401 nodes and their
    SHA-256, 75,850 edges and theirs, 12 roots, 74,389 anchors, the smallest |NN(u)| 73,996, 1,517 batches of 50 with
    none short, the budget string; the map on 320 anchors against an independent complement; its memory."""
    inst, imap, offsets = EM.direct_instance(wn)
    n, E = inst.n, inst.E
    assert (n, E) == (EM.STAGE2_N, EM.STAGE2_E) == (74401, 75850)
    assert list(offsets) == sorted(offsets) and EM.offsets_sha(offsets) == U_AT_SHA
    lines = '\n'.join(f'{offsets[c]} {offsets[p]}' for c, p in inst.pos.tolist())
    assert hashlib.sha256(lines.encode()).hexdigest() == E_SHA
    assert inst.pos.tolist() == sorted(inst.pos.tolist())
    assert inst.name == 'wordnet30-noun-at-direct'
    anchors = np.unique(inst.pos[:, 0])
    assert len(anchors) == 74389
    assert len(set(range(n)) - set(inst.pos[:, 0].tolist())) == 12          # the roots: no parent
    sizes = imap.sizes()
    assert int(sizes[anchors].min()) == 73996 and int(sizes.min()) == 73996
    spans = EM.batches(E)
    assert len(spans) == 1517 and all(b1 - b0 == 50 for b0, b1 in spans)
    assert l6.budget(E) == '1000,20,50,50,1517000,3792500000'
    # memory (A13.16): the map stores n + 2E shifts and n + 1 pointers, about 2.4 MB, against about 44 GB of int64
    # for the explicit table; the instance holds placeholders only
    assert imap.shift.shape[0] == n + 2 * E and imap.entries == 2 * n + 1 + 2 * E == 300503
    assert imap.nbytes == 8 * imap.entries < 2.5e6
    assert 8 * int(sizes.astype(np.int64).cumsum()[-1]) > 44e9
    assert inst.nn_ptr.nbytes == 8 * (n + 1) and inst.nn_flat.nbytes == 0
    # the map against the complement of this test's own reading of the '@' pointers
    nb = _independent_relation(wn, 'noun')
    index = {o: i for i, o in enumerate(offsets)}
    assert set(nb) == set(offsets)
    chosen = check_anchors(imap, anchors, lambda u: {u} | {index[x] for x in nb[offsets[u]]})
    assert len(chosen) == 320
    # the kernel on U_@ against the pure-Python replay, over 2,000 anchors of one epoch's permutation
    st, r = S.ImplicitStream(95231, imap), P.Rng(95231)
    perm = st.shuffle_fresh(E)
    assert perm.tolist() == r.shuffle(list(range(E)))
    some = inst.pos[perm[:2000], 0]
    assert np.array_equal(st.negatives(some, EM.NEGS), py_negatives_implicit(r, some, EM.NEGS, n, imap.r_ptr,
                                                                             imap.shift))
    assert st.state() == tuple(r.s)


def test_dry_verb_instance(wn):
    """A13.13's dry graph: the verb '@' graph's 13,542 nodes, 13,239 direct edges and 334 roots (the 225 isolated
    verbs left out); the map on 320 anchors against an independent complement."""
    inst, imap, offsets = EM.direct_instance(wn, pos='verb')
    assert (inst.n, inst.E) == (13542, 13239) and inst.name == 'wordnet30-verb-at-direct'
    assert len(wn['synsets']['verb']) - inst.n == 225
    assert len(set(range(inst.n)) - set(inst.pos[:, 0].tolist())) == 334
    assert imap.shift.shape[0] == inst.n + 2 * inst.E
    nb = _independent_relation(wn, 'verb')
    index = {o: i for i, o in enumerate(offsets)}
    chosen = check_anchors(imap, np.unique(inst.pos[:, 0]), lambda u: {u} | {index[x] for x in nb[offsets[u]]})
    assert len(chosen) == 320                                       # A13.10.2: 320 anchors of the dry instance


_MEM_JOB = r'''
import os, sys, json, resource
for v in %(vars)r:
    os.environ[v] = '1'
sys.path.insert(0, %(ref)r)
import lexicon
from lexicon import embed as EM, wordnet as W
inst, imap, _ = EM.direct_instance(W.load())
run = EM.train_implicit(inst, imap, 'lorentz', 3, '1', 95232, epochs=1)
# The process's own peak is VmHWM (its address space's high-water mark, new at exec). ru_maxrss is not used for the
# bound: Linux carries the parent's peak across fork/vfork + exec, so it would measure pytest's process instead.
try:
    hwm = [x.split() for x in open('/proc/self/status') if x.startswith('VmHWM:')][0]
    peak = int(hwm[1]) / 1024 if hwm[2] == 'kB' else None
except (OSError, IndexError, ValueError):
    peak = None
print(json.dumps({'peak_mb': peak, 'maxrss_mb': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024,
                  'finite': run.diverged_epoch is None, 'epochs': run.epochs_run}))
'''


@pytest.mark.slow
def test_training_memory_on_u_at(wn):
    """A13.16: a training process on U_@ peaks under 0.85 GB (WordNet's parse included). One epoch of Lorentz d = 3
    (the widest cell) with an unregistered seed in a fresh process; nothing is evaluated or kept."""
    code = _MEM_JOB % {'ref': REFERENCE, 'vars': THREAD_VARS}
    p = subprocess.run([sys.executable, '-B', '-c', code], cwd=REFERENCE, capture_output=True, text=True, timeout=900)
    assert p.returncode == 0, p.stderr
    rec = json.loads(p.stdout.strip().split('\n')[-1])
    assert rec['finite'] and rec['epochs'] == 1
    if rec['peak_mb'] is None:
        pytest.skip(f'no VmHWM in /proc/self/status: the process peak cannot be told from the parent\'s ({rec})')
    assert rec['peak_mb'] < 850, rec
