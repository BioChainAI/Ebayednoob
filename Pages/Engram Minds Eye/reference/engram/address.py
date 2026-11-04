"""The address: a packet's 64 bits as a 28-letter reduced word in the six generators 1 +- 2i, 1 +- 2j, 1 +- 2k of
Hyperbolic PolyStep's norm-5 tree, and a chain of packets as one integer quaternion (claim E2).

From the preregistration: the 64 bits are read in base 5 from the least significant digit; each letter is one of
the five children of the word so far, and at the root one of the generators 0 to 4. A chain's word is its
packets' words in order, so it stays reduced, and right division of its quaternion gives the word back.

The tree itself (GENS, INV, children, word_quaternion, right_divide) is hpstep.problems, used in place.
"""
from hpstep.problems import GENS, INV, children, word_quaternion, right_divide, is_reduced, qmul, qconj

L = 28                          # 5^28 > 2^64
assert 5 ** L > 2 ** 64 > 5 ** (L - 1)


def choices(word):
    """The five letters allowed after `word`: its children, or generators 0 to 4 at the root."""
    return children(word) if word else [0, 1, 2, 3, 4]


def encode(v, prefix=()):
    """64 bits -> 28 letters, each chosen among the five allowed after the chain so far (prefix)."""
    if not 0 <= v < 2 ** 64:
        raise ValueError('a packet is 64 bits')
    w = list(prefix)
    x = v
    for _ in range(L):
        w.append(choices(w)[x % 5])
        x //= 5
    return w[len(prefix):]


def decode(word, prefix=()):
    """28 letters (after the chain `prefix`) -> the 64 bits."""
    w = list(prefix)
    x, m = 0, 1
    for g in word:
        x += choices(w).index(g) * m
        m *= 5
        w.append(g)
    return x


def chain_word(values):
    """The reduced word of a chain of packets: each packet encoded after the ones before it."""
    w = []
    for v in values:
        w += encode(v, w)
    return w


def chain_quaternion(values):
    return word_quaternion(chain_word(values))


def norm(q):
    return sum(c * c for c in q)


def unfold(q, K):
    """Right-divide a chain quaternion of K packets back into its 64-bit values, in order (None if it is not one)."""
    word = right_divide(q, L * K)
    if word is None or len(word) != L * K:
        return None
    out, pre = [], []
    for k in range(K):
        seg = word[k * L:(k + 1) * L]
        try:
            out.append(decode(seg, pre))
        except ValueError:                      # a letter that is not a child: the word was not built by encode
            return None
        pre += seg
    return out


def packet_quaternions(values):
    """The address quaternion of each packet of a chain (each encoded after the ones before it)."""
    w, out = [], []
    for v in values:
        seg = encode(v, w)
        out.append(word_quaternion(seg))
        w += seg
    return out


def qprod(qs):
    q = (1, 0, 0, 0)
    for x in qs:
        q = qmul(q, x)
    return q
