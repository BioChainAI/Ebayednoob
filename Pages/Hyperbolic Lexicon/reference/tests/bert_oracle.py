"""The test oracle for N_B: BERT's BasicTokenizer steps (google-research/bert tokenization.py), written with Python's
own Unicode functions (str.lower, unicodedata.normalize('NFD'), unicodedata.category, str.split) and nothing from
lexicon/. It carries the one rule Amendment 1 item 1 adds to BERT: Cn is kept by step 1 and a whitespace token
holding a Cn code point fails closed as one '[UNK]'. Under Python 3.13 (unicodedata 15.1.0) N_B must give the same
words on every string.
"""
import unicodedata

CJK = ((0x4E00, 0x9FFF), (0x3400, 0x4DBF), (0x20000, 0x2A6DF), (0x2A700, 0x2B73F), (0x2B740, 0x2B81F),
       (0x2B820, 0x2CEAF), (0xF900, 0xFAFF), (0x2F800, 0x2FA1F))


def _is_cjk(cp):
    return any(a <= cp <= b for a, b in CJK)


def _is_punctuation(ch):
    cp = ord(ch)
    if 33 <= cp <= 47 or 58 <= cp <= 64 or 91 <= cp <= 96 or 123 <= cp <= 126:
        return True
    return unicodedata.category(ch).startswith('P')


def _clean_text(text):
    out = []
    for ch in text:
        cp = ord(ch)
        cat = unicodedata.category(ch)
        if cp == 0 or cp == 0xFFFD:
            continue
        if ch in '\t\n\r':
            out.append(' ')
            continue
        if cat.startswith('C') and cat != 'Cn':   # BERT's _is_control, with Cn kept for failing closed
            continue
        out.append(' ' if cat == 'Zs' else ch)
    return ''.join(out)


def basic_tokenize(text, strip_accents=True):
    """(words, failed) for a str."""
    text = _clean_text(text)
    text = ''.join(' %s ' % ch if _is_cjk(ord(ch)) else ch for ch in text)
    words, failed = [], []
    for tok in text.strip().split():
        if any(unicodedata.category(ch) == 'Cn' for ch in tok):
            words.append('[UNK]')
            failed.append(True)
            continue
        tok = tok.lower()
        if strip_accents:
            tok = ''.join(ch for ch in unicodedata.normalize('NFD', tok) if unicodedata.category(ch) != 'Mn')
        cur = []
        for ch in tok:
            if _is_punctuation(ch):
                if cur:
                    words.append(''.join(cur))
                    failed.append(False)
                    cur = []
                words.append(ch)
                failed.append(False)
            else:
                cur.append(ch)
        if cur:
            words.append(''.join(cur))
            failed.append(False)
    return words, failed


def wordpiece(word, vocab_ids, unk='[UNK]', max_chars=100):
    """BERT's WordpieceTokenizer on one word, verbatim in structure (no length bound on the inner loop)."""
    chars = list(word)
    if len(chars) > max_chars:
        return [unk]
    start, out = 0, []
    while start < len(chars):
        end = len(chars)
        cur = None
        while start < end:
            sub = ''.join(chars[start:end])
            if start > 0:
                sub = '##' + sub
            if sub in vocab_ids:
                cur = sub
                break
            end -= 1
        if cur is None:
            return [unk]
        out.append(cur)
        start = end
    return out
