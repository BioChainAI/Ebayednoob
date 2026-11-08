"""RFC 6962 Merkle trees for corpus manifests (Phase 3; L9(a); Amendment 7 items 3 and 5), with RFC 9162's proof
verification, and L9's two controls: the shdccp/2 Merkle rule and an XOR summary.

RFC 6962 section 2.1: MTH({}) = SHA-256(''), the hash of a leaf d is SHA-256(0x00 || d), and for n > 1 entries,
with k the largest power of two smaller than n, MTH(D[n]) = SHA-256(0x01 || MTH(D[0:k]) || MTH(D[k:n])). No node is
duplicated. Audit paths (2.1.1) and consistency proofs (2.1.2) are RFC 6962's PATH and PROOF; they are verified
with RFC 9162's algorithms (2.1.3.2 and 2.1.4.2), as spike S4 ported them.

    Log(entries)                    .root(), .mth(lo, hi), .path(m), .consistency(m, n=None)
    root(entries)                   MTH of a list of byte strings
    leaf_hash(d), node_hash(l, r)   the two hashes
    verify_inclusion(index, size, leaf_hash, proof, root)            RFC 9162 2.1.3.2
    verify_consistency(m, n, root_m, root_n, proof)                    RFC 9162 2.1.4.2
    merkle_shdccp2(hex_leaves)      L9 control 1: pairwise SHA-256 over hex, an odd last node duplicated
    xor_summary(values)             L9 control 2: the XOR of 64-bit leaf prefixes
    synthetic_leaves(seed, K)       Amendment 7 item 5: K entries of 32 bytes from Rng(seed), eight next_u32 each,
                                    big-endian
    tampered(entries, kind, i)      L9's alteration classes (replace, delete, insert, swap, duplicate-last, truncate)

Hashes are bytes; proofs are lists of 32-byte hashes. The JS twin is lexicon_core.js's chain section.
"""
import hashlib

from hpstep.prng import Rng

from .chain import merkle_shdccp2  # noqa: F401  (re-exported: L9's control 1)

B0, B1 = b'\x00', b'\x01'
EMPTY = hashlib.sha256(b'').digest()


def leaf_hash(d):
    return hashlib.sha256(B0 + bytes(d)).digest()


def node_hash(left, right):
    return hashlib.sha256(B1 + left + right).digest()


def largest_pow2_below(n):
    """The largest power of two smaller than n (n >= 2)."""
    k = 1
    while k * 2 < n:
        k *= 2
    return k


class Log:
    """An RFC 6962 log over `entries` (byte strings), with subtree hashes memoised."""

    def __init__(self, entries):
        self.D = [bytes(e) for e in entries]
        self.memo = {}

    def __len__(self):
        return len(self.D)

    def mth(self, lo, hi):
        if hi == lo:
            return EMPTY
        key = (lo, hi)
        x = self.memo.get(key)
        if x is None:
            if hi - lo == 1:
                x = leaf_hash(self.D[lo])
            else:
                k = largest_pow2_below(hi - lo)
                x = node_hash(self.mth(lo, lo + k), self.mth(lo + k, hi))
            self.memo[key] = x
        return x

    def root(self, n=None):
        return self.mth(0, len(self.D) if n is None else n)

    def _path(self, m, lo, hi):
        n = hi - lo
        if n == 1:
            return []
        k = largest_pow2_below(n)
        if m < k:
            return self._path(m, lo, lo + k) + [self.mth(lo + k, hi)]
        return self._path(m - k, lo + k, hi) + [self.mth(lo, lo + k)]

    def path(self, m, n=None):
        """PATH(m, D[n]): the audit path of leaf m in the tree of the first n entries (all by default)."""
        n = len(self.D) if n is None else n
        if not 0 <= m < n:
            raise ValueError(f'leaf {m} is not in a tree of {n}')
        return self._path(m, 0, n)

    def _subproof(self, m, lo, hi, b):
        n = hi - lo
        if m == n:
            return [] if b else [self.mth(lo, hi)]
        k = largest_pow2_below(n)
        if m <= k:
            return self._subproof(m, lo, lo + k, b) + [self.mth(lo + k, hi)]
        return self._subproof(m - k, lo + k, hi, False) + [self.mth(lo, lo + k)]

    def consistency(self, m, n=None):
        """PROOF(m, D[n]) for 0 < m <= n."""
        n = len(self.D) if n is None else n
        if not 0 < m <= n:
            raise ValueError(f'no consistency proof from {m} to {n}')
        return self._subproof(m, 0, n, True)


def root(entries):
    return Log(entries).root()


def verify_inclusion(index, size, leaf, proof, root_hash):
    """RFC 9162 2.1.3.2: does `proof` show that the leaf hash `leaf` is entry `index` of the tree of `size`?"""
    if not 0 <= index < size:
        return False
    fn, sn, r = index, size - 1, leaf
    for p in proof:
        if sn == 0:
            return False
        if fn & 1 or fn == sn:
            r = node_hash(p, r)
            if not fn & 1:
                while not fn & 1 and fn != 0:
                    fn >>= 1
                    sn >>= 1
        else:
            r = node_hash(r, p)
        fn >>= 1
        sn >>= 1
    return sn == 0 and r == root_hash


def verify_consistency(m, n, root_m, root_n, proof):
    """RFC 9162 2.1.4.2 (with S4's guards: 1 <= m <= n; m == n needs an empty proof and equal roots)."""
    if m < 1 or m > n:
        return False
    if m == n:
        return len(proof) == 0 and root_m == root_n
    c = [root_m] + list(proof) if m & (m - 1) == 0 else list(proof)
    if not c:
        return False
    fn, sn = m - 1, n - 1
    while fn & 1:
        fn >>= 1
        sn >>= 1
    fr = sr = c[0]
    for x in c[1:]:
        if sn == 0:
            return False
        if fn & 1 or fn == sn:
            fr = node_hash(x, fr)
            sr = node_hash(x, sr)
            if not fn & 1:
                while not fn & 1 and fn != 0:
                    fn >>= 1
                    sn >>= 1
        else:
            sr = node_hash(sr, x)
        fn >>= 1
        sn >>= 1
    return fr == root_m and sr == root_n and sn == 0


def xor_summary(values):
    """L9's control 2: the XOR of the 64-bit leaf prefixes (blind to order)."""
    x = 0
    for v in values:
        x ^= v
    return x


def synthetic_leaves(seed, K):
    """Amendment 7 item 5: K entries of 32 bytes from Rng(seed), each eight next_u32 written big-endian."""
    r = Rng(seed)
    return [b''.join(r.next_u32().to_bytes(4, 'big') for _ in range(8)) for _ in range(K)]


TAMPERS = ('replace', 'delete', 'insert', 'swap', 'duplicate-last', 'truncate')


def tampered(entries, kind, i=0, new=None):
    """One alteration of L9(a): ('replace', i, new), ('delete', i), ('insert', i, new) before entry i, ('swap', i)
    entries i and i + 1, ('duplicate-last',) the last entry appended again, ('truncate', i) the first i entries
    (presented with the old root kept). Amendment 7 item 5: an alteration is detected when the altered list's root
    differs from the original root."""
    e = list(entries)
    if kind == 'replace':
        e[i] = new
    elif kind == 'delete':
        del e[i]
    elif kind == 'insert':
        e.insert(i, new)
    elif kind == 'swap':
        e[i], e[i + 1] = e[i + 1], e[i]
    elif kind == 'duplicate-last':
        e.append(e[-1])
    elif kind == 'truncate':
        e = e[:i]
    else:
        raise ValueError(f'unknown alteration {kind!r}')
    return e
