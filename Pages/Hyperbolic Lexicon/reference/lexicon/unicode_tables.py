"""The pinned Unicode 15.1 table (golden/unicode_15_1_v1.json), the only source of Unicode facts for N_B (D5).

The file is written by golden/make_unicode_v1.py from CPython 3.13's unicodedata and refused here unless its
SHA-256 is the pinned one below. Nothing in this module, or in normalise.py, calls str.lower, unicodedata or a
regular-expression Unicode class: every lookup reads the table. Lookups are built on first use and cached.

    t = tables()                 the parsed JSON (verified)
    category(cp)                 'Lu', 'Mn', 'Cn', ... for any cp in 0..10FFFF
    lower(cp)                    the full lowercase mapping of cp alone, a tuple (U+03A3 -> (U+03C3,))
    decomposition(cp)            the single-step canonical decomposition, a tuple, or None (Hangul: hangul_nfd)
    ccc(cp)                      the canonical combining class (0 when not listed)
    case_ignorable(), cased_not_ignorable()   the two Final_Sigma sets, frozensets of code points
    category_codes()             (bytes of length 0x110000 with a category index per code point, CATEGORIES)
"""
import bisect
import hashlib
import json
import os

from . import GOLDEN

PATH = os.path.join(GOLDEN, 'unicode_15_1_v1.json')
SHA256 = '30bed6fbc1fec1f4382d212d7792de48d99f10713f728d28329f8d7506712229'
BYTES = 142624
VERSION = '15.1.0'
# The 30 general categories in a fixed order; category_codes() stores an index into this tuple.
CATEGORIES = ('Lu', 'Ll', 'Lt', 'Lm', 'Lo', 'Mn', 'Mc', 'Me', 'Nd', 'Nl', 'No', 'Pc', 'Pd', 'Ps', 'Pe', 'Pi', 'Pf',
              'Po', 'Sm', 'Sc', 'Sk', 'So', 'Zs', 'Zl', 'Zp', 'Cc', 'Cf', 'Cs', 'Co', 'Cn')

_memo = {}


def _cached(fn):
    def wrapper():
        if fn.__name__ not in _memo:
            _memo[fn.__name__] = fn()
        return _memo[fn.__name__]
    wrapper.__name__ = fn.__name__
    wrapper.__doc__ = fn.__doc__
    return wrapper


@_cached
def raw():
    """The committed bytes, refused unless their SHA-256 and size are the pinned ones."""
    blob = open(PATH, 'rb').read()
    digest = hashlib.sha256(blob).hexdigest()
    if digest != SHA256 or len(blob) != BYTES:
        raise ValueError(f'{PATH}: sha256 {digest} ({len(blob)} B) is not the pinned {SHA256} ({BYTES} B)')
    return blob


@_cached
def tables():
    t = json.loads(raw().decode('ascii'))
    if t['unicode'] != VERSION:
        raise ValueError(f'table is Unicode {t["unicode"]}, not {VERSION}')
    return t


@_cached
def _gc_starts():
    gc = tables()['gc']
    return [a for a, _, _ in gc], [v for _, _, v in gc]


@_cached
def category_codes():
    """One byte per code point 0..10FFFF: the index of its category in CATEGORIES (filled run by run)."""
    arr = bytearray(0x110000)
    index = {c: i for i, c in enumerate(CATEGORIES)}
    for a, b, v in tables()['gc']:
        arr[a:b + 1] = bytes([index[v]]) * (b - a + 1)
    return bytes(arr)


def category(cp):
    starts, values = _gc_starts()
    return values[bisect.bisect_right(starts, cp) - 1]


@_cached
def lower_map():
    return {cp: tuple(v) for cp, v in tables()['lower']}


def lower(cp):
    return lower_map().get(cp, (cp,))


@_cached
def decomp_map():
    return {cp: tuple(v) for cp, v in tables()['decomp']}


def decomposition(cp):
    return decomp_map().get(cp)


@_cached
def ccc_map():
    out = {}
    for a, b, v in tables()['ccc']:
        for cp in range(a, b + 1):
            out[cp] = v
    return out


def ccc(cp):
    return ccc_map().get(cp, 0)


def _expand(key):
    s = set()
    for a, b in tables()[key]:
        s.update(range(a, b + 1))
    return frozenset(s)


@_cached
def case_ignorable():
    return _expand('caseIgnorable')


@_cached
def cased_not_ignorable():
    return _expand('casedNotIgnorable')


@_cached
def whitespace():
    """Step 3's split set (U+0020, U+2028, U+2029), as stored and asserted by make_unicode_v1.py."""
    return frozenset(tables()['whitespace'])


@_cached
def _hangul():
    h = tables()['hangul']
    return h['sBase'], h['lBase'], h['vBase'], h['tBase'], h['lCount'] * h['vCount'] * h['tCount'], \
        h['vCount'] * h['tCount'], h['tCount']


def hangul_nfd(cp):
    """The algorithmic decomposition of a precomposed Hangul syllable (2 or 3 jamo), or None."""
    sb, lb, vb, tb, sc, nc, tc = _hangul()
    s = cp - sb
    if not 0 <= s < sc:
        return None
    if s % tc:
        return (lb + s // nc, vb + (s % nc) // tc, tb + s % tc)
    return (lb + s // nc, vb + (s % nc) // tc)


@_cached
def full_decomp_map():
    """The full canonical decomposition (recursive, Hangul included) of every code point that has one, before
    canonical ordering: a dict cp -> tuple. Ordering is applied to the whole run of marks by the caller."""
    out = {}
    dm = decomp_map()

    def rec(cp):
        h = hangul_nfd(cp)
        if h is not None:
            return h
        d = dm.get(cp)
        if d is None:
            return (cp,)
        r = ()
        for x in d:
            r += rec(x)
        return r
    for cp in dm:
        out[cp] = rec(cp)
    sb, _, _, _, sc, _, _ = _hangul()
    for cp in range(sb, sb + sc):
        out[cp] = hangul_nfd(cp)
    return out
