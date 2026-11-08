"""lexicon.manifest: RFC 6962 trees, RFC 9162 verification, and L9's two controls, on the Certificate Transparency
reference vector, RFC 6962's worked examples (section 2.1.3) and unregistered leaf lists (Rng(70000 + j))."""
import hashlib

import pytest

from lexicon import chain as C
from lexicon import manifest as M

CT = [bytes.fromhex(h) for h in ('', '00', '10', '2021', '3031', '40414243', '5051525354555657',
                                 '606162636465666768696a6b6c6d6e6f')]
CT_ROOTS = ['e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            '6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d',
            'fac54203e7cc696cf0dfcb42c92a1d9dbaf70ad9e621f4bd8d98662f00e3c125',
            'aeb6bcfe274b70a14fb067a5e5578264db0fa9b51af5e0ba159158f329e06e77',
            'd37ee418976dd95753c1c73862b9398fa2a2cf9b4ff0fdfe8b30cd95209614b7',
            '4e3bbb1f7b478dcfe71fb631631519a3bca12c9aefca1612bfce4c13a86264d4',
            '76e67dadbcdf1e10e1b74ddc608abd2f98dfb16fbce75277b5232a127f2087ef',
            'ddb89be403809e325750d3d263cd78929c2942b7942a34b77e122c9594a74c8c',
            '5dc9da79a70659a9ad559cb701ded9a2ab9d823aad2f4960cfe370eff4604328']


def test_certificate_transparency_reference_roots():
    log = M.Log(CT)
    assert [log.root(n).hex() for n in range(9)] == CT_ROOTS
    assert [M.root(CT[:n]).hex() for n in range(9)] == CT_ROOTS


def test_rfc6962_worked_examples():
    L7 = M.Log(CT[:7])
    nm = {'a': L7.mth(0, 1), 'b': L7.mth(1, 2), 'c': L7.mth(2, 3), 'd': L7.mth(3, 4), 'f': L7.mth(5, 6),
          'j': L7.mth(6, 7), 'g': L7.mth(0, 2), 'h': L7.mth(2, 4), 'i': L7.mth(4, 6), 'k': L7.mth(0, 4),
          'l': L7.mth(4, 7)}
    names = lambda xs: [nm[c] for c in xs]  # noqa: E731
    assert L7.path(0) == names('bhl') and L7.path(3) == names('cgl')
    assert L7.path(4) == names('fjk') and L7.path(6) == names('ik')
    assert L7.consistency(3) == names('cdgl') and L7.consistency(4) == names('l') and L7.consistency(6) == names('ijk')


@pytest.mark.parametrize('K', [1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 16, 17, 31, 33, 64])
def test_every_proof_verifies_and_wrong_ones_fail(K):
    D = M.synthetic_leaves(70000 + K, K)
    assert all(len(d) == 32 for d in D)
    log = M.Log(D)
    rt = log.root()
    for i in range(K):
        p = log.path(i)
        assert M.verify_inclusion(i, K, M.leaf_hash(D[i]), p, rt)
        assert not M.verify_inclusion(K, K, M.leaf_hash(D[i]), p, rt)
        assert not M.verify_inclusion(i, K, M.leaf_hash(D[i]), p + [rt], rt)
        if K >= 2:
            o = (i + 1) % K
            assert not M.verify_inclusion(i, K, M.leaf_hash(D[o]), p, rt)
            assert not M.verify_inclusion(o, K, M.leaf_hash(D[i]), p, rt)
    for m in range(1, K + 1):
        p = log.consistency(m)
        assert M.verify_consistency(m, K, log.root(m), rt, p)
        bad = bytearray(log.root(m))
        bad[0] ^= 1
        assert not M.verify_consistency(m, K, bytes(bad), rt, p)
        if m < K:
            assert not M.verify_consistency(m, K, log.root(m), rt, p[:-1])
            assert not M.verify_consistency(m + 1, K, log.root(m), rt, p) or log.root(m) == log.root(m + 1)
    assert not M.verify_consistency(0, K, M.EMPTY, rt, [])


@pytest.mark.parametrize('K', [1, 2, 3, 7, 12])
def test_every_alteration_is_detected(K):
    D = M.synthetic_leaves(70100 + K, K)
    rt = M.root(D)
    alts = [M.tampered(D, 'duplicate-last')]
    for i in range(K):
        rep = bytearray(D[i])
        rep[0] ^= 1
        alts += [M.tampered(D, 'replace', i, bytes(rep)), M.tampered(D, 'delete', i),
                 M.tampered(D, 'insert', i, bytes(32))]
        if i + 1 < K:
            alts.append(M.tampered(D, 'swap', i))
        if i >= 1:
            alts.append(M.tampered(D, 'truncate', i))
    assert all(M.root(a) != rt for a in alts)


def test_controls_shdccp2_duplicate_last_and_xor_blind_to_swaps():
    for K in (1, 2, 3, 4, 5, 7, 9, 1001):
        hx = [d.hex() for d in M.synthetic_leaves(70200 + K, K)]
        same = M.merkle_shdccp2(hx) == M.merkle_shdccp2(hx + [hx[-1]])
        assert same == (K % 2 == 1 and K >= 3)
        assert M.root([bytes.fromhex(h) for h in hx]) != M.root([bytes.fromhex(h) for h in hx + [hx[-1]]])
    D = M.synthetic_leaves(70300, 7)
    vals = [int.from_bytes(d[:8], 'big') for d in D]
    sw = vals[:]
    sw[2], sw[3] = sw[3], sw[2]
    assert M.xor_summary(sw) == M.xor_summary(vals) and C.chain_quaternion(sw) != C.chain_quaternion(vals)


def test_hashes():
    assert M.leaf_hash(b'') == hashlib.sha256(b'\x00').digest()
    assert M.node_hash(b'a', b'b') == hashlib.sha256(b'\x01ab').digest()
    assert M.EMPTY.hex() == CT_ROOTS[0]
    assert [M.largest_pow2_below(n) for n in (2, 3, 4, 5, 8, 9)] == [1, 2, 2, 4, 4, 8]


@pytest.mark.slow
def test_large_lists_every_proof():
    for K in (1000, 1001):
        D = M.synthetic_leaves(70400 + K, K)
        log = M.Log(D)
        rt = log.root()
        assert max(len(log.path(i)) for i in range(K)) <= 10
        assert all(M.verify_inclusion(i, K, M.leaf_hash(D[i]), log.path(i), rt) for i in range(K))
        assert all(M.verify_consistency(m, K, log.root(m), rt, log.consistency(m)) for m in range(1, K))
