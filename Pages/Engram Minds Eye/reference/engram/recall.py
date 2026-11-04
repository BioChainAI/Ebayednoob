"""What Hamming recall can and cannot do (claim E9).

The store holds the engram/1 key of each dialogue token. A query is answered by the stored token whose key is
nearest in Hamming distance; when t stored tokens tie at the minimum, a hit counts 1/t.

E9a's five parity-keeping variants of a token [DEFINITION of the details the preregistration leaves open]:
lowercase; the characters reversed; '7' appended; the token's first letter (its first character if it has no
letter) inserted twice after its first character; '-' inserted after its first character.
E9b's one-letter substitutions: a position among the token's letters and a new letter among the 25 others, drawn
from hpstep Rng(1000 + i) for store token i, five per token, position first.
"""
from hpstep.prng import Rng

from .ttmpt import crystallize, pack_grid64

LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'


def key(text):
    return pack_grid64(crystallize(text))


def distance(a, b):
    return bin(a ^ b).count('1')


def nearest(qkey, keys):
    ds = [distance(qkey, k) for k in keys]
    m = min(ds)
    return [i for i, d in enumerate(ds) if d == m], m


def hit(qkey, keys, target):
    tied, _ = nearest(qkey, keys)
    return 1 / len(tied) if target in tied else 0.0


def parity_variants(token):
    if not token:
        raise ValueError('a stored token is never empty (the tokenizer drops empty pieces)')
    letters = [c for c in token if c.upper() in LETTERS]
    first = letters[0] if letters else token[0]
    return [token.lower(), token[::-1], token + '7', token[0] + first + first + token[1:], token[0] + '-' + token[1:]]


def letter_count(token):
    return sum(1 for c in token.upper() if c in LETTERS)


def substitutions(token, seed, n=5):
    rng = Rng(seed)
    pos = [i for i, c in enumerate(token) if c.upper() in LETTERS]
    out = []
    for _ in range(n):
        p = pos[rng.below(len(pos))]
        others = [c for c in LETTERS if c != token[p].upper()]
        out.append(token[:p] + others[rng.below(25)] + token[p + 1:])
    return out


def shuffled(keys, seed=7):
    perm = Rng(seed).shuffle(list(range(len(keys))))
    return [keys[j] for j in perm]
