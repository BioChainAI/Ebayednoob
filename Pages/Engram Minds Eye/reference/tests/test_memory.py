"""The triple-quad word (mechanics of claim E3) and its control."""
from hpstep.prng import Rng

from engram import orbital as O
from engram.memory import Word, FORM, memory_link


def rand64(rng):
    return (rng.next_u32() << 32) | rng.next_u32()


def test_tiles_follow_d3():
    rng = Rng(1)
    w = Word(rand64(rng), rand64(rng), rand64(rng), addr=7, F=48)
    for j in range(4):
        t0, t1 = (O.decode_tile(t) for t in w.tiles(j))
        assert (t0['form'], t1['form']) == (FORM, FORM) == (5, 5)
        assert (t0['struct'], t1['struct']) == (j, j)
        assert (t0['slot'], t1['slot']) == (j, 4 + j)
        assert (t0['core'] << 32) | t1['core'] == w.cells[j]
        assert t0['gate'] == 7 and t0['step'] == 8


def test_every_single_flip_is_located_and_repaired():
    rng = Rng(2)
    for _ in range(4):
        w = Word(rand64(rng), rand64(rng), rand64(rng))
        for j in range(4):
            for bit in range(64):
                orig = w.cells[j]
                w.cells[j] ^= 1 << bit
                assert not w.parity_ok()
                assert w.locate() == j
                assert w.rebuild(j) == orig
                assert w.repair() == ('repaired', j)
                assert w.cells[j] == orig and w.root() == w.tau0[1]


def test_double_alterations_are_detected_and_refused():
    rng = Rng(3)
    for same in (False, True):
        for _ in range(40):
            w = Word(rand64(rng), rand64(rng), rand64(rng))
            a, b = rng.sample(4, 2)
            p = rng.below(64)
            q = p if same else (p + 1 + rng.below(63)) % 64
            w.cells[a] ^= 1 << p
            w.cells[b] ^= 1 << q
            assert w.root() != w.tau0[1]
            assert w.repair()[0] == 'refused'
            assert w.root() != w.tau0[1]


def test_control_parity_alone_misses_same_position_doubles():
    rng = Rng(4)
    w = Word(rand64(rng), rand64(rng), rand64(rng))
    w.cells[0] ^= 1 << 9
    w.cells[2] ^= 1 << 9
    assert w.parity_ok()                                   # parity is fooled
    assert w.root() != w.tau0[1]                           # the chain is not


def test_memory_links_chain():
    a = memory_link(24, 0, 'ab' * 32, '')
    b = memory_link(48, 1, 'cd' * 32, a)
    assert len(a) == len(b) == 16 and a != b
    assert memory_link(48, 1, 'cd' * 32, a) == b
