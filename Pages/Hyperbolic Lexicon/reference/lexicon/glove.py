"""GloVe 6B (Amendment 13 items 2-6, L15(b)): the pinned zip's text members read as exact decimals, the exact cosine
key, and vocabulary coverage counts. No float is formed.

    vocabulary(dim, store)          the member's words (a frozenset); refused on a repeated word or a bad line
    vectors(words, dim, store)      {word: Vec} for the words asked for (only those are kept)
    parse_line(line, dim)           (word, Vec) of one 'word v1 ... vd' line
    cos_key(a, b)                   c|c| / (|a|^2 |b|^2) with c = a.b, a Fraction, increasing in the cosine
    coverage(pairs, vocab)          GloVe coverage counts of [(x, y)] (A13.3's rule: both N_S words in the
                                    vocabulary, neither containing '_')

A member is streamed out of the zip and hashed as it is read; reaching its end with another size or SHA-256 than the
pin refuses the whole read (stage2data.Store.stream).
"""
import re
from fractions import Fraction

from .senses import in_vocab
from .stage2data import ParseError, default_store

MEMBERS = {300: 'glove-300', 50: 'glove-50'}
LINES = 400001
UNDERSCORE_TOKENS = 460
# READING (spec section 3, "exact decimals"): a component is an optional minus sign, digits, an optional fraction
# and an optional exponent; value = mantissa * 10^exponent exactly. Anything else is refused.
NUMBER = re.compile(r'(-?)([0-9]+)(?:\.([0-9]+))?(?:[eE]([-+]?[0-9]+))?')


class Vec:
    """An exact decimal vector: component i is ints[i] / 10^scale (scale >= 0, common to the vector)."""
    __slots__ = ('ints', 'scale')

    def __init__(self, ints, scale):
        self.ints, self.scale = tuple(ints), scale

    def values(self):
        return [Fraction(v, 10 ** self.scale) for v in self.ints]

    def __eq__(self, other):
        return isinstance(other, Vec) and self.values() == other.values()

    def __repr__(self):
        return f'Vec(dim={len(self.ints)}, scale={self.scale})'


def parse_number(text):
    """(mantissa, exponent) with value = mantissa * 10^exponent, exactly."""
    m = NUMBER.fullmatch(text)
    if not m:
        raise ParseError(f'{text!r} is not a decimal number')
    sign, whole, frac, exp = m.groups()
    frac = frac or ''
    mant = int(whole + frac)
    e = (int(exp) if exp else 0) - len(frac)
    return (-mant if sign else mant), e


def parse_vector(fields):
    parts = [parse_number(t) for t in fields]
    scale = max(0, max((-e for _, e in parts), default=0))
    return Vec([m * 10 ** (e + scale) for m, e in parts], scale)


def parse_line(line, dim):
    """One member line (without its LF): 'word v1 ... vd', single spaces, exactly dim numbers."""
    f = line.split(' ')
    if len(f) != dim + 1 or f[0] == '':
        raise ParseError(f'a GloVe line with {len(f)} fields, not {dim + 1}')
    return f[0], parse_vector(f[1:])


def _iter_lines(dim, store):
    store = store or default_store()
    key = MEMBERS[dim]
    with store.stream(key) as fh:
        for raw in fh:
            if not raw.endswith(b'\n'):
                raise ParseError(f'{key}: a line without its final LF')
            yield raw[:-1].decode('utf-8')


def _word_of(line, dim):
    sp = line.find(' ')
    if sp <= 0 or line.count(' ') != dim:
        raise ParseError(f'a GloVe line with {line.count(" ") + 1} fields, not {dim + 1}')
    return line[:sp]


def vocabulary(dim=300, store=None):
    """The member's words. Every line must hold dim numbers; a repeated word is refused (6B has 400,001 distinct
    words, A13.2)."""
    seen = set()
    for line in _iter_lines(dim, store):
        w = _word_of(line, dim)
        if w in seen:
            raise ParseError(f'GloVe {dim}d repeats a word')
        seen.add(w)
    return frozenset(seen)


def vectors(words, dim=300, store=None):
    """{word: Vec} for the GloVe words asked for (raw GloVe tokens, e.g. N_S forms), read in one pass; a repeated
    word anywhere in the member is refused, and every line is checked for dim fields."""
    want = set(words)
    out, seen = {}, set()
    for line in _iter_lines(dim, store):
        w = _word_of(line, dim)
        if w in seen:
            raise ParseError(f'GloVe {dim}d repeats a word')
        seen.add(w)
        if w in want:
            out[w] = parse_line(line, dim)[1]
    return out


def dot(a, b):
    return sum(x * y for x, y in zip(a.ints, b.ints))


def cos_key(a, b):
    """A13.6's exact GloVe key c|c| / (|a|^2 |b|^2), c = a.b: an increasing function of the cosine, as a Fraction.
    The vectors' scales cancel, so integer vectors are used as they are. A zero vector is refused (no cosine)."""
    if len(a.ints) != len(b.ints):
        raise ValueError('vectors of different dimension')
    na, nb = dot(a, a), dot(b, b)
    if na == 0 or nb == 0:
        raise ValueError('a zero GloVe vector has no cosine')
    c = dot(a, b)
    return Fraction(c * abs(c), na * nb)


def coverage(pairs, vocab):
    """Counts only: rows of [(x, y)] whose two N_S words are in vocab (neither containing '_'), and the words missed."""
    covered = sum(1 for x, y in pairs if in_vocab(x, vocab) and in_vocab(y, vocab))
    missed = sorted({w for x, y in pairs for w in (x, y) if not in_vocab(w, vocab)})
    return {'rows': len(pairs), 'covered': covered, 'missed_words': len(missed)}


def underscore_tokens(vocab):
    return sum(1 for w in vocab if '_' in w)
