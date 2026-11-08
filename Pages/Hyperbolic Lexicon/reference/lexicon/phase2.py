"""The reference's half of Phase 2's cross-engine comparisons (PREREGISTRATION.md, Amendment 4 items 2, 3, 5, 6 and
7): L1's per-instance records and their digests, L1's controls on the Python side, the table pipeline of control 1,
the Hugging Face agreement, and L4's float rankings and their controls. Exact ranking itself (rank lists, AP, MAP,
mean rank) is lexicon.rank's; this module adds only what Phase 2 compares across engines.

    python3 -B run_claims.py --phase2 [--dry]      runs everything below (results/phase2-python.json and .md)
    python3 -B -m pytest -q -p no:cacheprovider tests/test_phase2.py

L1 (Amendment 4 item 2):
    rec, ids, pieces = record_of(nb_result, vocab)   one instance's record: the normalised text as UTF-8 hex ('-' when
                                                     empty), TAB, the pieces separated by single spaces, each
                                                     'id,start,end,hex' (the piece's UTF-8 hex), '-' for no piece;
                                                     the pieces field is traces/wordpiece_v1.txt's, byte for byte
    record(data, vocab, shortest=False, strip_accents=True)   the same from UTF-8 bytes (controls 2 and 3 by flag)
    sha_hex(rec), list_digest(hexes)                 an instance's digest; the list digest (SHA-256 of the hex lines,
                                                     LF after each: the bytes of the cache file)
    IdStream                                         Amendment 1 item 2's id stream, hashed as it grows
    blob_digest(blobs)                               lexicon.l1.digest's framing over byte strings
    trace_check(vocabs)                              record() against the committed text traces
    table_r(s)                                       control 1's reference side: spike S6's R(s), that is
                                                     drop Mn(NFD(lower(s))) over the whole string, from the pinned
                                                     15.1 table only
    hf_tokenizer(path), hf_version()                 Hugging Face's BertWordPieceTokenizer (reported agreement)

L4 (Amendment 4 items 5 and 6):
    float_cols(arm, dtype)                           each coordinate rounded to the nearest float64 (int / int is
                                                     correctly rounded in CPython), then to float32 for control 1
    float_keys(cols, u)                              x0 y0 - x1 y1 - x2 y2 (- x3 y3), left to right, one IEEE operation
                                                     at a time (numpy ufuncs: no fused multiply-add)
    float_query(arm, u, cols) -> FloatResult         inversions and float ties among adjacent candidates in exact order
    float_queries(arm, queries, cols, workers=4)     the same over many queries, in a fork pool (results in order)
    exact_tie(keys, u, nbrs), acosh_ap(u, nbrs, fk)  control 2: an exact neighbour/non-neighbour tie; the AP of the
                                                     float evaluator that sorts by acosh(max(1, key)), then node index
    ap_of_order(order, nbrs)                         AP of a candidate order (exact Fraction)
"""
import gzip
import hashlib
import io
import math
import multiprocessing
import os
from collections import namedtuple
from fractions import Fraction

import numpy as np

from . import REFERENCE
from . import unicode_tables as U
from .normalise import MN, _final_sigma, _flags, nb
from .wordpiece import encode_nb, leb128

TRACES = os.path.join(REFERENCE, 'traces')


# ================================================================ L1: the record
def hexs(b):
    """Lower-case hex of bytes, '-' when empty: the convention of every field of the text traces."""
    return b.hex() if b else '-'


def record_of(r, vocab, shortest=False):
    """The record of one instance from its N_B result r (Amendment 4 item 2): (record, ids, pieces).

    READING: "the normalised text as hex" is written '-' when the text is empty, as normalise_v1.txt writes the same
    field (lexicon's hexs), so an instance with no words has the record '-' TAB '-'."""
    ids, pieces, spans = encode_nb(r, vocab, shortest)
    body = ' '.join('%d,%d,%d,%s' % (i, a, b, p.encode('utf-8').hex()) for i, p, (a, b) in zip(ids, pieces, spans))
    return hexs(r.text_bytes) + '\t' + (body or '-'), ids, pieces


def record(data, vocab, shortest=False, strip_accents=True):
    """N_B then WordPiece on UTF-8 bytes: (record, ids, pieces). shortest: L1's control 2; strip_accents=False:
    control 3 (lexicon.normalise's reading: lowercase kept, NFD and the Mn removal skipped)."""
    return record_of(nb(data, strip_accents=strip_accents), vocab, shortest)


def sha_hex(text):
    return hashlib.sha256(text.encode('utf-8') if isinstance(text, str) else text).hexdigest()


def list_digest(hexes):
    """The list digest: SHA-256 of the hex lines, each followed by LF (exactly the bytes of the cache file).

    READING: "SHA-256 of the concatenated hex lines" hashes the lines with their LF terminators, so the digest is
    the file's own SHA-256 (sha256sum of the cache file)."""
    h = hashlib.sha256()
    for x in hexes:
        h.update(x.encode('ascii') + b'\n')
    return h.hexdigest()


class IdStream:
    """Amendment 1 item 2's id stream, hashed as it grows: per instance, LEB128(number of ids) then LEB128 of each id
    (the same bytes as wordpiece.id_stream over the whole list, without holding them)."""

    def __init__(self):
        self.h, self.bytes, self.instances, self.ids = hashlib.sha256(), 0, 0, 0

    def add(self, ids):
        b = leb128([len(ids)]) + leb128(ids)
        self.h.update(b)
        self.bytes += len(b)
        self.instances += 1
        self.ids += len(ids)

    def summary(self):
        return {'instances': self.instances, 'ids': self.ids, 'bytes': self.bytes, 'sha256': self.h.hexdigest()}


def blob_digest(blobs):
    """lexicon.l1.digest over byte strings: per blob, its length as 8 bytes big-endian, then its bytes."""
    h = hashlib.sha256()
    for b in blobs:
        h.update(len(b).to_bytes(8, 'big'))
        h.update(b)
    return h.hexdigest()


class GzipLines:
    """Lines (LF after each) into a gzip file with mtime 0, so the same lines always give the same file."""

    def __init__(self, path):
        self.raw = open(path, 'wb')
        self.gz = gzip.GzipFile(filename='', mode='wb', fileobj=self.raw, mtime=0)
        self.w = io.TextIOWrapper(self.gz, encoding='utf-8', newline='\n')

    def write(self, line):
        self.w.write(line + '\n')

    def close(self):
        self.w.close()
        self.raw.close()


def _trace_rows(path):
    return [x.split('\t') for x in open(path, encoding='utf-8').read().split('\n') if x and not x.startswith('#')]


def trace_check(vocabs):
    """record() against the committed traces: for every valid case of normalise_v1.txt and every vocabulary that
    wordpiece_v1.txt holds (and that is given), the record must be that case's text field, TAB, its pieces field.
    vocabs: [(tag, Vocab)]. Returns {'cases', 'lines', 'equal', 'first_mismatch'}."""
    pieces = {(row[0], row[1]): row[2] for row in _trace_rows(os.path.join(TRACES, 'wordpiece_v1.txt'))
              if row[0] != 'idstream'}
    lines = equal = 0
    first = None
    cases = 0
    for row in _trace_rows(os.path.join(TRACES, 'normalise_v1.txt')):
        name, inp, result, text = row[0], row[1], row[2], row[3]
        if result != 'ok':
            continue
        cases += 1
        data = b'' if inp == '-' else bytes.fromhex(inp)
        for tag, v in vocabs:
            want = pieces.get((name, tag))
            if want is None:
                continue
            lines += 1
            got = record(data, v)[0]
            if got == text + '\t' + want:
                equal += 1
            elif first is None:
                first = {'case': name, 'vocab': tag, 'want': (text + '\t' + want)[:200], 'got': got[:200]}
    return {'cases': cases, 'lines': lines, 'equal': equal, 'first_mismatch': first}


# ================================================================ L1 control 1: S6's R(s) from the pinned table
def table_r(s):
    """Spike S6's reference normaliser R(s) = drop Mn (NFD (s.lower())), over the WHOLE string (S6 applied it to each
    stress-set case as one string), computed from the pinned Unicode 15.1 table and nothing else: CPython 3.13's
    str.lower (full mappings; Final_Sigma decided over the whole string, as handle_capital_sigma does), the
    recursive canonical decomposition with algorithmic Hangul, stable canonical ordering of each run of
    non-starters, then every code point of category Mn removed. Returns a str.

    READING: Amendment 4 item 3's "the reference's lowercase, NFD and Mn removal of the same string (the pinned
    table's, as S6 compared them)" is this function, not N_B: no whitespace split, no dropped controls, no CJK
    spacing, no punctuation split, and no failing closed (a Cn code point has no mapping and passes through)."""
    cps = [ord(c) for c in s]
    low, ign, cas = U.lower_map(), U.case_ignorable(), U.cased_not_ignorable()
    lowered = []
    for k, c in enumerate(cps):
        if c == 0x3A3:
            lowered.append(0x3C2 if _final_sigma(cps, k, ign, cas) else 0x3C3)
        else:
            m = low.get(c)
            if m is None:
                lowered.append(c)
            else:
                lowered.extend(m)
    full, ccc = U.full_decomp_map(), U.ccc_map()
    d = []
    for c in lowered:
        x = full.get(c)
        if x is None:
            d.append(c)
        else:
            d.extend(x)
    i, n = 0, len(d)
    while i < n:                     # canonical ordering: each maximal run of non-starters, stably by class
        if d[i] not in ccc:
            i += 1
            continue
        j = i + 1
        while j < n and d[j] in ccc:
            j += 1
        if j - i > 1:
            d[i:j] = sorted(d[i:j], key=ccc.__getitem__)
        i = j
    F = _flags()
    return ''.join(chr(c) for c in d if not F[c] & MN)


# ================================================================ L1: Hugging Face (reported, never decisive)
def hf_version():
    """tokenizers' version, or None with the reason when it cannot be imported."""
    try:
        import tokenizers
        return tokenizers.__version__, None
    except Exception as e:  # noqa: BLE001 (any import failure means "not run")
        return None, f'{type(e).__name__}: {e}'


def hf_tokenizer(vocab_path):
    """BertWordPieceTokenizer on the same vocabulary file, as Amendment 4 item 3 names it."""
    from tokenizers import BertWordPieceTokenizer
    return BertWordPieceTokenizer(vocab_path, lowercase=True, strip_accents=True, clean_text=True,
                                  handle_chinese_chars=True)


def first_difference(a, b):
    """The first index where two sequences (token lists, records) differ; the shorter's length when one is a prefix
    of the other."""
    for i, (x, y) in enumerate(zip(a, b)):
        if x != y:
            return i
    return min(len(a), len(b))


# ================================================================ L4(b): float rankings
FloatResult = namedtuple('FloatResult', 'query inversions ties nonfinite first')


def float_cols(arm, dtype=np.float64):
    """The arm's coordinates as float columns: each rational X / den rounded to the nearest float64 (CPython's
    int / int true division is correctly rounded, whatever the size of the integers), then, for dtype float32, that
    float64 rounded to float32 (numpy's cast rounds to nearest, ties to even), as Amendment 4 item 6 orders it."""
    D = arm.den
    cols = [np.array([x / D for x in c], dtype=np.float64) for c in arm.cols]
    if dtype != np.float64:
        cols = [c.astype(dtype) for c in cols]
    return cols


def float_keys(cols, u):
    """The float key of every node against node u: x0 y0 - x1 y1 - x2 y2 (- x3 y3), left to right in the columns'
    own precision. Each numpy ufunc rounds once (a product, then a difference), so no multiply-add is fused and the
    result is the IEEE-754 left-to-right value, element for element (tests/test_phase2.py checks it against Python
    floats). Overflow gives inf and inf - inf gives nan; both are counted by float_query, never hidden."""
    q = [c[u] for c in cols]
    with np.errstate(over='ignore', invalid='ignore'):
        k = q[0] * cols[0] - q[1] * cols[1]
        for i in range(2, len(cols)):
            k = k - q[i] * cols[i]
    return k


def exact_order(keys, u):
    """The candidates (every node but u) in exact order: key, then index (= synset offset order), and their keys."""
    order = sorted(range(len(keys)), key=keys.__getitem__)       # stable: ties stay in index order
    order.remove(u)
    return order, [keys[i] for i in order]


def adjacent_flags(S, fk):
    """For candidates in exact order with exact keys S (sorted) and float keys fk (aligned numpy array): the boolean
    arrays (inversion, float tie) over the adjacent pairs. A pair is strictly ordered when its exact keys differ (S
    is sorted, so they then increase); an inversion is a strictly ordered pair whose float keys strictly decrease, a
    float tie one whose float keys are equal. A nan key compares false both ways: neither."""
    strict = np.fromiter((a != b for a, b in zip(S, S[1:])), dtype=bool, count=max(0, len(S) - 1))
    with np.errstate(invalid='ignore'):
        dec = fk[:-1] > fk[1:]
        eq = fk[:-1] == fk[1:]
    return strict & dec, strict & eq


def float_query(arm, u, cols):
    """One query of L4(b): FloatResult(query, inversions, ties, nonfinite float keys among the candidates,
    first = None or (position in exact order, candidate a, candidate b, float key a, float key b))."""
    order, S = exact_order(arm.keys(u), u)
    fk = float_keys(cols, u)[np.asarray(order, dtype=np.int64)]
    inv, tie = adjacent_flags(S, fk)
    n_inv = int(inv.sum())
    first = None
    if n_inv:
        i = int(np.argmax(inv))
        first = (i, order[i], order[i + 1], float(fk[i]), float(fk[i + 1]))
    return FloatResult(u, n_inv, int(tie.sum()), int((~np.isfinite(fk)).sum()), first)


_JOB = None


def _work(chunk):
    arm, cols = _JOB
    return [float_query(arm, u, cols) for u in chunk]


def float_queries(arm, queries, cols, workers=4, chunks_per_worker=8):
    """float_query for every query, in a fork pool (contiguous chunks mapped in order, as lexicon.rank does), so the
    results come back in the order of `queries`. workers <= 1 runs here."""
    global _JOB
    queries = list(queries)
    if workers <= 1 or len(queries) < 2 * workers:
        return [float_query(arm, u, cols) for u in queries]
    n = max(1, min(len(queries), workers * chunks_per_worker))
    size = -(-len(queries) // n)
    chunks = [queries[i:i + size] for i in range(0, len(queries), size)]
    _JOB = (arm, cols)
    try:
        with multiprocessing.get_context('fork').Pool(workers) as pool:
            parts = pool.map(_work, chunks, chunksize=1)
    finally:
        _JOB = None
    return [r for part in parts for r in part]


# ================================================================ L4 control 2: the acosh evaluator with index ties
def exact_tie(keys, u, nbrs):
    """True when some neighbour of u has exactly the key of some non-neighbour (u itself excluded)."""
    nbs = set(nbrs)
    nk = {keys[v] for v in nbs}
    return any(keys[w] in nk for w in range(len(keys)) if w != u and w not in nbs)


def ap_of_order(order, nbrs):
    """Average precision of a candidate order (a list of node indices) for the neighbour set nbrs, exactly: the mean
    over the neighbours of (neighbours up to it) / (its 1-based position). None without neighbours."""
    nbs = set(nbrs)
    if not nbs:
        return None
    hits, terms = 0, []
    for pos, v in enumerate(order, 1):
        if v in nbs:
            hits += 1
            terms.append(Fraction(hits, pos))
    return sum(terms, Fraction(0)) / len(nbs)


def acosh_order(fk, u):
    """Control 2's float evaluator: candidates sorted by float64 acosh(max(1, key)), then by node index.

    READING: acosh is Python's math.acosh (the C library's, as Node's Math.acosh is V8's own port of fdlibm; the two
    may differ in the last bit, and the reference is the authority here); max(1, key) is taken in float64."""
    d = [math.acosh(max(1.0, float(x))) for x in fk]
    return sorted((v for v in range(len(d)) if v != u), key=lambda v: (d[v], v))


def acosh_ap(u, nbrs, fk):
    """The AP that control 2's evaluator gives query u (float keys fk of every node against u)."""
    return ap_of_order(acosh_order(fk, u), nbrs)
