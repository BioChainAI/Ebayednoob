"""Amendment 10 item 1: lexicon.stream (numba) equals hpstep.prng.Rng output for output, below() on bounds that reject
about half the time included; lexicon.pystream equals Rng call for call; replay_states agrees across the two; the
numba pin; no numba cache files; no numba in a process that never trains. Seeds 80000 + i only (the seed guard)."""
import os
import subprocess
import sys

import numpy as np
import pytest

import l6_synth
from hpstep.prng import Rng
from lexicon import REFERENCE
from lexicon import embed as EM
from lexicon.pystream import PyStream, replay_states
from lexicon.stream import Stream, compile_kernels, seed_state


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    l6_synth.install_seed_guard(monkeypatch)


HEAVY = (2 ** 31 + 1, 3, 2 ** 32, 1, 6542, 2 ** 31 + 7, 1182)      # 2^31 + 1 rejects with probability ~1/2


def test_guard():
    for make in (lambda: Rng(7), lambda: Rng(), lambda: Rng(9000), lambda: Rng(95000), lambda: Stream(2100),
                 lambda: Stream(4000), lambda: PyStream(1000), lambda: PyStream(12000), lambda: Stream(3007)):
        with pytest.raises(RuntimeError):
            make()
    st = seed_state(80000)
    assert Rng(state=st).next_u32() == Rng(80000).next_u32()
    assert Stream.from_state(st).state() == st == PyStream.from_state(st).state()
    assert Stream(state=st).state() == st
    assert Rng(state=(1, 2, 3, 4)).s == [1, 2, 3, 4]


def test_seed_state_is_rng():
    for seed in (80000, 80001, 2 ** 32 - 1, 2 ** 32 + 80000):
        assert list(seed_state(seed)) == Rng(seed).s


def test_raw_outputs_equal():
    for seed in range(80000, 80004):
        r = Rng(seed)
        ref = np.array([r.next_u32() for _ in range(1_000_000)], dtype=np.uint64)
        st = Stream(seed)
        got = np.concatenate([st.next_u32_many(1), st.next_u32_many(999_999)])
        assert np.array_equal(ref, got), seed
        assert st.state() == tuple(r.s)


def _csr(lengths, n=1182, seed=80030):
    """A CSR whose lists have the given lengths (entries drawn from range(n), any values: below() only reads sizes)."""
    gen = np.random.default_rng(seed)
    ptr = np.zeros(len(lengths) + 1, dtype=np.int64)
    ptr[1:] = np.cumsum(lengths)
    flat = gen.integers(0, n, int(ptr[-1])).astype(np.int64)
    return ptr, flat


def test_mixed_sequences_equal():
    lengths = [1, 2, 3, 49, 50, 1180]
    ptr, flat = _csr(lengths)
    anchors = np.array([i % len(lengths) for i in range(600)], dtype=np.int64)
    rejected_any = False
    for seed in range(80010, 80014):
        r, st = Rng(seed), Stream(seed)
        # 1. random
        ref = [r.random() for _ in range(1000)]
        assert st.random_many(1000).tolist() == ref
        assert st.state() == tuple(r.s)
        # 2. shuffle of a fresh list
        assert st.shuffle_fresh(6542).tolist() == r.shuffle(list(range(6542)))
        assert st.state() == tuple(r.s)
        # 3. below with heavy rejection, one call at a time and in bulk, state checked after every call
        ns = [HEAVY[i % len(HEAVY)] for i in range(14000)]
        for i, n in enumerate(ns[:7000]):
            before = tuple(r.s)
            x = r.below(n)
            assert st.below(n) == x
            assert st.state() == tuple(r.s)
            # a rejection advanced the state by more than one output
            probe = Rng(state=before)
            probe.next_u32()
            rejected_any |= tuple(probe.s) != tuple(r.s)
        assert st.below_many(ns[7000:]).tolist() == [r.below(n) for n in ns[7000:]]
        assert st.state() == tuple(r.s)
        # 4. negatives on lists of 1, 2, 3, 49, 50 and 1180 entries, against nested Rng.below calls
        ref = [[int(flat[ptr[u] + r.below(int(ptr[u + 1] - ptr[u]))]) for _ in range(50)] for u in anchors.tolist()]
        assert st.negatives(anchors, 50, ptr, flat).tolist() == ref
        assert st.state() == tuple(r.s)
        # 5. another fresh shuffle
        assert st.shuffle_fresh(100).tolist() == r.shuffle(list(range(100)))
        assert st.state() == tuple(r.s)
    assert rejected_any, 'below() never rejected: the bounds do not exercise rejection'


def test_below_bounds():
    st = Stream(80020)
    for bad in (0, -1, 2 ** 32 + 1):
        with pytest.raises(ValueError):
            st.below(bad)
        with pytest.raises(ValueError):
            st.below_many([3, bad])
        with pytest.raises(ValueError):
            Rng(80020).below(bad)
    assert st.below(1) == 0
    ptr = np.array([0, 0, 2], dtype=np.int64)
    with pytest.raises(ValueError):
        st.negatives(np.array([0]), 3, ptr, np.array([5, 6]))
    with pytest.raises(ValueError):
        PyStream(80020).negatives(np.array([0]), 3, ptr, np.array([5, 6]))


def test_pystream_is_rng():
    ptr, flat = _csr([1, 3, 49, 1180])
    anchors = np.array([3, 0, 1, 2, 2, 1], dtype=np.int64)
    for seed in (80015, 80016):
        r, ps, st = Rng(seed), PyStream(seed), Stream(seed)
        calls = [('next_u32_many', (17,)), ('random_many', (33,)), ('below', (2 ** 31 + 1,)),
                 ('below_many', ([HEAVY[i % 7] for i in range(200)],)), ('shuffle_fresh', (500,)),
                 ('negatives', (anchors, 50, ptr, flat)), ('random_many', (5,))]
        for name, args in calls:
            a = getattr(ps, name)(*args)
            b = getattr(st, name)(*args)
            assert np.array_equal(np.asarray(a), np.asarray(b)), name
            assert ps.state() == st.state()
        assert ps.rng is not r and isinstance(ps.rng, Rng)
    # PyStream's draws are Rng's own calls
    ps, r = PyStream(80017), Rng(80017)
    assert ps.random_many(3).tolist() == [r.random() for _ in range(3)]
    assert ps.shuffle_fresh(10).tolist() == r.shuffle(list(range(10)))
    assert ps.below_many([5, 2 ** 31 + 1]).tolist() == [r.below(5), r.below(2 ** 31 + 1)]


def test_replay_states():
    cs = l6_synth.small(80002)
    inst = EM.training_instance(cs)
    for d in (2, 3):
        a = replay_states(PyStream(80020), inst.n, d, inst.pos[:, 0], inst.nn_sizes(), 4)
        b = replay_states(Stream(80020), inst.n, d, inst.pos[:, 0], inst.nn_sizes(), 4)
        assert a == b and len(a) == 5
        # and both equal a run's own stream (the trainer draws nothing else)
        run = EM.train(inst, 'lorentz', d, '1', 80020, epochs=4, burnin=1)
        assert run.final_state == a[-1]


def test_pin():
    import numba
    from lexicon import stream
    assert numba.__version__ == '0.68.1' == stream.NUMBA_VERSION
    req = open(os.path.join(REFERENCE, 'requirements.txt')).read().split('\n')
    assert any(line.split('#')[0].strip() == 'numba==0.68.1' for line in req)


def test_no_numba_cache_files():
    compile_kernels()
    Stream(80021).negatives(np.array([0]), 2, np.array([0, 2]), np.array([1, 2]))
    found = []
    for root, _, files in os.walk(REFERENCE):
        found += [os.path.join(root, f) for f in files if f.endswith(('.nbi', '.nbc'))]
    assert found == []


def test_pystream_has_no_numba():
    code = ('import sys; sys.path.insert(0, %r); import lexicon; import lexicon.pystream, lexicon.embed; '
            'import importlib.util as u; '
            '[__import__(m) for m in ("lexicon.l6", "lexicon.learned") if u.find_spec(m)]; '
            'print("numba" in sys.modules, "lexicon.stream" in sys.modules)' % REFERENCE)
    out = subprocess.run([sys.executable, '-B', '-c', code], capture_output=True, text=True, check=True,
                         cwd=REFERENCE).stdout.split()
    assert out == ['False', 'False']
