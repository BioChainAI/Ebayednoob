"""N_B, the normaliser of L1 (D5; Amendment 1 item 1), with byte spans and failing closed; N1, the fallback.

N_B is BERT's BasicTokenizer (google-research/bert tokenization.py) on the pinned Unicode 15.1 table
(unicode_tables.py) and on nothing else: no str.lower, no unicodedata, no regular-expression Unicode class.

    r = nb(b'Caf\\xc3\\xa9 au lait.')    r.words   ['cafe', 'au', 'lait', '.']
                                       r.failed  [False, False, False, False]
                                       r.spans   [(0, 5), (6, 8), (9, 13), (13, 14)]    byte spans [start, end)
                                       r.cp_spans[0]  [(0, 1), (1, 2), (2, 3), (3, 5)]  one per code point of 'cafe'
                                       r.text    'cafe au lait .'   r.text_bytes  its UTF-8
    nb(data, strip_accents=False)      L1's control 3: lowercase kept, NFD and the Mn removal skipped
    n1(data)                           the registered fallback N1 (bytes)

The steps (Amendment 1 item 1), on the input decoded strictly as UTF-8 (InvalidUTF8(offset) otherwise):
  1. drop U+0000, U+FFFD and every code point of a C category except Cn, tab, LF and CR; tab, LF, CR and Zs
     become U+0020;
  2. U+0020 before and after every code point in BERT's CJK ranges;
  3. split on U+0020, U+2028 and U+2029 (the table's 'whitespace'): the whitespace tokens;
  4. a token holding a Cn code point fails closed: one word '[UNK]' with the token's span, failed = True;
  5. lowercase as CPython 3.13's str.lower (full mappings, Final_Sigma decided inside the token), then NFD
     (recursive canonical decomposition, algorithmic Hangul, stable canonical ordering), then drop Mn;
  6. every code point in BERT's ASCII punctuation ranges or of a P category is a word of its own; empty words go.
A word's span is the smallest start and largest end of the input code points its code points came from; a code
point made by lowercasing or decomposition comes from the one it was made from. For a fail-closed word, cp_spans
holds no entries (the word '[UNK]' is not made of input code points); its span is in spans.

# READING: "its first bad byte offset" is the offset of the first byte at which no well-formed UTF-8 sequence
# (Unicode Table 3-7) starts: for a truncated or interrupted multi-byte sequence, the offset of its lead byte. This
# is CPython's UnicodeDecodeError.start, and tests/test_normalise.py checks it against an explicit Table 3-7 scanner.
# READING: strip_accents=False (control 3) skips BERT's _run_strip_accents as a whole, that is NFD and the Mn
# removal together, and keeps the lowercase (as BERT and Hugging Face do with do_lower_case and no accent stripping).
"""
from . import unicode_tables as U

UNK = '[UNK]'
# BERT's CJK ranges (_is_chinese_char), step 2.
CJK_RANGES = ((0x4E00, 0x9FFF), (0x3400, 0x4DBF), (0x20000, 0x2A6DF), (0x2A700, 0x2B73F), (0x2B740, 0x2B81F),
              (0x2B820, 0x2CEAF), (0xF900, 0xFAFF), (0x2F800, 0x2FA1F))
# BERT's ASCII punctuation ranges (_is_punctuation), step 6, besides every P category.
ASCII_PUNCT_RANGES = ((0x21, 0x2F), (0x3A, 0x40), (0x5B, 0x60), (0x7B, 0x7E))

# One flag byte per code point, built from the table once (_flags()).
DROP = 1      # step 1: dropped
SPACE = 2     # steps 1 and 3: a separator (tab, LF, CR, Zs, U+2028, U+2029)
CJK = 4       # step 2: a token of its own
CN = 8        # step 4: unassigned in 15.1
MN = 16       # step 5: dropped after NFD
PUNCT = 32    # step 6: a word of its own
NFDX = 64     # step 5: has a canonical decomposition or a non-zero combining class (NFD can change it)
LOW = 128     # step 5: has a lowercase mapping other than itself (U+03A3 included)


class InvalidUTF8(ValueError):
    """The input is not well-formed UTF-8; .offset is the first bad byte's offset."""

    def __init__(self, offset):
        super().__init__(f'invalid UTF-8 at byte offset {offset}')
        self.offset = offset


class NB:
    """The result of N_B on one input: words, fail-closed flags, byte spans, and per-code-point source spans."""
    __slots__ = ('words', 'failed', 'spans', 'src', 'starts')

    def __init__(self, words, failed, spans, src, starts):
        self.words, self.failed, self.spans, self.src, self.starts = words, failed, spans, src, starts

    def cp_span(self, i):
        """The byte span of the input code point with index i (into the decoded input)."""
        st = self.starts
        return (i, i + 1) if st is None else (st[i], st[i + 1])

    @property
    def cp_spans(self):
        return [[self.cp_span(i) for i in s] for s in self.src]

    @property
    def text(self):
        return ' '.join(self.words)

    @property
    def text_bytes(self):
        return self.text.encode('utf-8')

    def __repr__(self):
        return f'NB(words={self.words!r}, failed={self.failed!r}, spans={self.spans!r})'


_memo = {}


def _flags():
    """The flag byte of every code point 0..10FFFF, from the pinned table alone."""
    if 'flags' in _memo:
        return _memo['flags']
    codes = U.category_codes()
    cats = U.CATEGORIES
    per_cat = bytearray(len(cats))
    for k, c in enumerate(cats):
        f = 0
        if c[0] == 'C' and c != 'Cn':
            f |= DROP
        if c == 'Zs':
            f |= SPACE
        if c == 'Cn':
            f |= CN
        if c == 'Mn':
            f |= MN
        if c[0] == 'P':
            f |= PUNCT
        per_cat[k] = f
    arr = bytearray(codes.translate(bytes(per_cat) + bytes(256 - len(per_cat))))
    for cp in (0x00, 0xFFFD):
        arr[cp] |= DROP
    for cp in (0x09, 0x0A, 0x0D):
        arr[cp] = (arr[cp] & ~DROP) | SPACE
    for cp in U.whitespace():
        arr[cp] |= SPACE
    for a, b in CJK_RANGES:
        for cp in range(a, b + 1):
            arr[cp] |= CJK
    for a, b in ASCII_PUNCT_RANGES:
        for cp in range(a, b + 1):
            arr[cp] |= PUNCT
    for cp in U.full_decomp_map():
        arr[cp] |= NFDX
    for cp in U.ccc_map():
        arr[cp] |= NFDX
    for cp in U.lower_map():
        arr[cp] |= LOW
    _memo['flags'] = bytes(arr)
    return _memo['flags']


def _final_sigma(cps, k, ign, cas):
    """CPython's handle_capital_sigma inside one token: a cased code point before (case-ignorable ones skipped) and
    none after (the same skip). cas is 'cased and not case-ignorable', so a code point in both sets is skipped."""
    j = k - 1
    while j >= 0 and cps[j] in ign:
        j -= 1
    if j < 0 or cps[j] not in cas:
        return False
    j = k + 1
    n = len(cps)
    while j < n and cps[j] in ign:
        j += 1
    return j == n or cps[j] not in cas


def _starts(s, nbytes):
    """Byte offset of every code point of s, plus the total (None when s is ASCII: the offset is the index)."""
    if nbytes == len(s):
        return None
    out = [0] * (len(s) + 1)
    o = 0
    for i, ch in enumerate(s):
        out[i] = o
        c = ord(ch)
        o += 1 if c < 0x80 else 2 if c < 0x800 else 3 if c < 0x10000 else 4
    out[len(s)] = o
    return out


def decode(data):
    """Strict UTF-8 (no BOM handling: U+FEFF is Cf and step 1 drops it)."""
    try:
        return bytes(data).decode('utf-8')
    except UnicodeDecodeError as e:
        raise InvalidUTF8(e.start) from None


def nb(data, strip_accents=True):
    """N_B on a UTF-8 byte string (see the module docstring)."""
    data = bytes(data)
    s = decode(data)
    F = _flags()
    starts = _starts(s, len(data))

    # Steps 1-3: whitespace tokens as code points with their source indices, and the OR of their flags.
    tokens = []
    cps, src, tf = [], [], 0
    for i, ch in enumerate(s):
        c = ord(ch)
        f = F[c]
        if not f & (DROP | SPACE | CJK):
            cps.append(c)
            src.append(i)
            tf |= f
            continue
        if f & DROP:
            continue
        if cps:
            tokens.append((cps, src, tf))
            cps, src, tf = [], [], 0
        if f & CJK:
            tokens.append(([c], [i], f))
    if cps:
        tokens.append((cps, src, tf))

    words, failed, spans, wsrc = [], [], [], []
    span = (lambda i, j: (i, j + 1)) if starts is None else (lambda i, j: (starts[i], starts[j + 1]))
    full = ign = cas = low = ccc = None
    for cps, src, tf in tokens:
        if tf & CN:
            # Step 4: fail closed. src is increasing, so its ends give the smallest start and the largest end.
            words.append(UNK)
            failed.append(True)
            spans.append(span(src[0], src[-1]))
            wsrc.append([])
            continue
        if tf & LOW:
            if low is None:
                low, ign, cas = U.lower_map(), U.case_ignorable(), U.cased_not_ignorable()
            lc, ls = [], []
            for k, c in enumerate(cps):
                if c == 0x3A3:
                    lc.append(0x3C2 if _final_sigma(cps, k, ign, cas) else 0x3C3)
                    ls.append(src[k])
                    continue
                m = low.get(c)
                if m is None:
                    lc.append(c)
                    ls.append(src[k])
                else:
                    lc.extend(m)
                    ls.extend([src[k]] * len(m))
            cps, src = lc, ls
            tf = 0
            for c in cps:
                tf |= F[c]
        if strip_accents and tf & NFDX:
            if full is None:
                full, ccc = U.full_decomp_map(), U.ccc_map()
            pairs = []
            for c, o in zip(cps, src):
                d = full.get(c)
                if d is None:
                    pairs.append((c, o))
                else:
                    pairs.extend((x, o) for x in d)
            # Canonical ordering: each maximal run of non-starters sorted stably by combining class.
            i, n = 0, len(pairs)
            while i < n:
                if pairs[i][0] not in ccc:
                    i += 1
                    continue
                j = i + 1
                while j < n and pairs[j][0] in ccc:
                    j += 1
                if j - i > 1:
                    pairs[i:j] = sorted(pairs[i:j], key=lambda p: ccc[p[0]])
                i = j
            cps = [p[0] for p in pairs]
            src = [p[1] for p in pairs]
            tf = 0
            for c in cps:
                tf |= F[c]
        if strip_accents and tf & MN:
            keep = [k for k, c in enumerate(cps) if not F[c] & MN]
            cps = [cps[k] for k in keep]
            src = [src[k] for k in keep]
        # Step 6: punctuation is a word of its own; the runs between are words; empty words are dropped.
        if not tf & PUNCT:
            pieces = [(cps, src)] if cps else []
        else:
            pieces, a = [], 0
            for k, c in enumerate(cps):
                if F[c] & PUNCT:
                    if k > a:
                        pieces.append((cps[a:k], src[a:k]))
                    pieces.append((cps[k:k + 1], src[k:k + 1]))
                    a = k + 1
            if a < len(cps):
                pieces.append((cps[a:], src[a:]))
        for pc, ps in pieces:
            words.append(''.join(map(chr, pc)))
            failed.append(False)
            spans.append(span(min(ps), max(ps)))
            wsrc.append(ps)
    return NB(words, failed, spans, wsrc, starts)


def n1(data):
    """N1, the registered fallback (D5): the bytes as given, a leading BOM stripped, CRLF to LF, ASCII lowercase."""
    data = bytes(data)
    if data.startswith(b'\xef\xbb\xbf'):
        data = data[3:]
    return data.replace(b'\r\n', b'\n').lower()  # bytes.lower changes A-Z only
