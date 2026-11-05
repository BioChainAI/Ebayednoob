"""N_B (Amendment 1 item 1) against the BERT oracle built from Python's own functions (bert_oracle.py), its byte
spans, failing closed, invalid UTF-8, and N1.

Strings: hand-picked edge cases; spike S6's stress set (L1 instance (c)); UD EWT sentences (instance (b), when
cached); synthetic strings from Rng(8000 + i) drawn from L1 (d)'s pool and from a pool rich in Final_Sigma
contexts; and, marked slow, every string of instance (a).
"""
import pytest

from hpstep.prng import Rng
from lexicon import l1
from lexicon.normalise import InvalidUTF8, n1, nb

import bert_oracle

# A pool rich in the risk points (S6's synthetic pool, plus separators, punctuation, CJK, controls and Cn).
SIGMA_POOL = (list(range(0x41, 0x5B)) + list(range(0x61, 0x7B)) + [0x30, 0x31, 0x20, 0x27, 0x2E, 0x3A, 0x2D, 0x5F]
              + [0x3A3] * 12 + [0x3C3, 0x3C2, 0x391, 0x392, 0x393, 0x394, 0x395, 0x39F, 0x3A9, 0x3AC, 0x3AD, 0x390,
                                0x1F48]
              + [0x130, 0x131, 0x49, 0x69, 0x307, 0x1E9E, 0xDF, 0x1C5, 0x1C4, 0x2126, 0x212A, 0x212B, 0x1E0A, 0x1E0C]
              + list(range(0x300, 0x370))
              + [0x345, 0xAD, 0x200C, 0x200D, 0x2019, 0xB7, 0x2B0, 0x1D2C, 0x2E2F, 0xFE00, 0x5B8, 0x5B9, 0x5B1, 0x591]
              + [0xF71, 0xF72, 0xF73, 0xF75, 0xF81, 0x958, 0x93C, 0x2ADC, 0x344, 0x340, 0x341, 0x343, 0x374, 0x37E]
              + [0xAC00, 0xAC01, 0xD7A3, 0xB098, 0xD55C, 0x1100, 0x1161, 0x11A8, 0x3131, 0xFB01, 0x1E9B, 0x1FB3, 0x1FBC]
              + [0x10400, 0x10428, 0x1E900, 0x1E922, 0x1D400, 0x24B6, 0x24D0, 0x2160, 0x2170, 0x10C80, 0x118A0]
              + [0x09, 0x0A, 0x0D, 0x00, 0x7F, 0x85, 0xA0, 0x2028, 0x2029, 0x3000, 0xFEFF, 0xFFFD, 0xE000, 0x378,
                 0x0897, 0x4E2D, 0x6587, 0x20000, 0x2B81E, 0xF900, 0x21, 0x2C, 0x3F, 0xA1, 0xBF, 0x2010, 0x300C])

EDGE = [
    '', ' ', '\t\n\r ', 'a', 'Hello, World!', "Don't stop.", 'U.S.A.', '[UNK] [CLS]',
    'ΟΔΟΣ', 'ΟΔΟΣ ΟΔΟΣ', 'ΑΣ.', 'ΑΣΒ', 'ΑΣ́', 'Σ', 'ΣΣ', 'ΑΣ\'Β', 'ΆΣ', 'ΑΣ​Β', 'ΑΣ­x',
    'İ', 'aİb', 'İSTANBUL', 'İ', 'ẞ', 'ǅ', 'KΩÅ', 'ﬁ',
    '한국어', '가힣', '각', 'ạ́', 'ạ́', 'ḍ̇', '̈́',
    'q̣̇', 'क़', '中文abc字', '日本語', '\U00020000x', 'x⮁ey', '豈',
    'a\x00b', 'a\x7fb', 'a\x85b', '﻿abc', 'a​b', 'a­b', 'a b c', 'a b　c',
    'abc', 'x\U000F0000', 'a͸b c', 'ࢗ', 'x\U000E0080y z', 'café naïve résumé',
    ';·', '¿Qué?', '«»‐—', '\U0001F600\U0001F64F', 'a' * 101,
    '́abc', 'ⅠⅫ', '\U00010400\U00010428', 'ﬀ', '�', 'x�y',
]


def check_same(s, strip_accents=True):
    r = nb(s.encode('utf-8'), strip_accents=strip_accents)
    words, failed = bert_oracle.basic_tokenize(s, strip_accents=strip_accents)
    assert r.words == words, (s, r.words, words)
    assert r.failed == failed, s
    return r


def sigma_string(seed):
    r = Rng(seed)
    n = 1 + r.below(48)
    return ''.join(chr(SIGMA_POOL[r.below(len(SIGMA_POOL))]) for _ in range(n))


@pytest.mark.parametrize('strip', [True, False])
def test_edge_cases_match_oracle(strip):
    for s in EDGE:
        check_same(s, strip)


def test_stress_set_matches_oracle():
    cases = l1.instance_c()
    assert len(cases) == 20520
    fails = 0
    for s in cases:
        r = check_same(s)
        fails += sum(r.failed)
        check_same(s, strip_accents=False)
    assert fails > 0   # the post-15.1 code points fail closed


def test_synthetic_matches_oracle():
    for i in range(2000):
        check_same(l1.trace_string(i))
        check_same(sigma_string(8000 + i))
        check_same(sigma_string(8000 + i), strip_accents=False)


def test_ewt_matches_oracle():
    if not l1.ewt_available():
        pytest.skip('UD EWT not cached: run golden/make_ewt_v1.cjs')
    differ = 0
    for s in l1.instance_b():
        a = check_same(s)
        b = check_same(s, strip_accents=False)
        differ += a.words != b.words
    assert differ > 0   # L1 control 3 has something to find on (b)


def test_hand_checked_spans():
    r = nb('Café au lait.'.encode('utf-8'))
    assert r.words == ['cafe', 'au', 'lait', '.']
    assert r.spans == [(0, 5), (6, 8), (9, 13), (13, 14)]
    assert r.cp_spans[0] == [(0, 1), (1, 2), (2, 3), (3, 5)]
    assert r.text == 'cafe au lait .' and r.text_bytes == b'cafe au lait .'
    r = nb('İx'.encode('utf-8'))           # U+0130 -> i + U+0307 (dropped as Mn); both from bytes 0-2
    assert r.words == ['ix'] and r.cp_spans[0] == [(0, 2), (2, 3)]
    r = nb('ab​c d'.encode('utf-8'))       # U+200B (Cf) is dropped inside the word, the span runs over it
    assert r.words == ['abc', 'd'] and r.spans == [(0, 6), (7, 8)]
    r = nb('x͸y z'.encode('utf-8'))
    assert r.words == ['[UNK]', 'z'] and r.failed == [True, False] and r.spans == [(0, 4), (5, 6)]
    assert r.cp_spans[0] == []
    r = nb('中文'.encode('utf-8'))
    assert r.words == ['中', '文'] and r.spans == [(0, 3), (3, 6)]
    r = nb('한'.encode('utf-8'))                 # algorithmic Hangul: three jamo from one syllable
    assert [ord(c) for c in r.words[0]] == [0x1112, 0x1161, 0x11AB] and r.cp_spans[0] == [(0, 3)] * 3
    r = nb('ΟΔΟΣ'.encode('utf-8'))
    assert r.words == ['οδος'.replace('ς', 'ς')] and r.words[0][-1] == 'ς'
    assert nb(b'').words == [] and nb(b'').text_bytes == b''


def test_span_properties():
    """Spans lie in the input, word starts never decrease, a word's span is the hull of its code points' spans,
    and (without U+03A3, whose Final_Sigma reads context outside the word) N_B of a word's own span gives it back."""
    strings = EDGE + [l1.trace_string(i) for i in range(500)] + [sigma_string(8000 + i) for i in range(500)]
    for s in strings:
        data = s.encode('utf-8')
        r = nb(data)
        prev = 0
        for w, bad, (a, b), cps in zip(r.words, r.failed, r.spans, r.cp_spans):
            assert 0 <= a < b <= len(data) and a >= prev
            prev = a
            if bad:
                continue
            assert len(cps) == len(w)
            assert a == min(x for x, _ in cps) and b == max(y for _, y in cps)
            if 'Σ' not in s:
                sub = nb(data[a:b])
                assert sub.words == [w], (s, w, sub.words)


def table_3_7_first_bad(b):
    """The first offset at which no well-formed UTF-8 sequence starts (Unicode Table 3-7), or None."""
    i, n = 0, len(b)
    while i < n:
        c = b[i]
        if c < 0x80:
            i += 1
            continue
        if 0xC2 <= c <= 0xDF:
            need = [(0x80, 0xBF)]
        elif c == 0xE0:
            need = [(0xA0, 0xBF), (0x80, 0xBF)]
        elif 0xE1 <= c <= 0xEC or 0xEE <= c <= 0xEF:
            need = [(0x80, 0xBF)] * 2
        elif c == 0xED:
            need = [(0x80, 0x9F), (0x80, 0xBF)]
        elif c == 0xF0:
            need = [(0x90, 0xBF), (0x80, 0xBF), (0x80, 0xBF)]
        elif 0xF1 <= c <= 0xF3:
            need = [(0x80, 0xBF)] * 3
        elif c == 0xF4:
            need = [(0x80, 0x8F), (0x80, 0xBF), (0x80, 0xBF)]
        else:
            return i
        for k, (lo, hi) in enumerate(need):
            if i + 1 + k >= n or not lo <= b[i + 1 + k] <= hi:
                return i
        i += 1 + len(need)
    return None


def test_invalid_utf8_offsets():
    fixed = [(b'\xff', 0), (b'a\xc3', 1), (b'\xed\xa0\x80', 0), (b'ab\xe2\x82\x28', 2), (b'\xc0\xaf', 0),
             (b'\xf4\x90\x80\x80', 0), (b'ok \xe2\x82', 3), (b'\x80', 0), (b'caf\xc3\xa9\xe9', 5)]
    for data, off in fixed:
        assert table_3_7_first_bad(data) == off
        with pytest.raises(InvalidUTF8) as e:
            nb(data)
        assert e.value.offset == off
    pieces = [b'a', b' ', b'\xc3\xa9', b'\xe4\xb8\xad', b'\xf0\x9f\x98\x80', b'\x80', b'\xc3', b'\xe4\xb8', b'\xed\xa0',
              b'\xf0\x9f', b'\xff', b'\xc0', b'\xf5', b'\xe0\x80', b'\xf4\x90']
    bad = 0
    for i in range(3000):
        r = Rng(8000 + i)
        data = b''.join(pieces[r.below(len(pieces))] for _ in range(1 + r.below(12)))
        want = table_3_7_first_bad(data)
        if want is None:
            nb(data)
            continue
        bad += 1
        with pytest.raises(InvalidUTF8) as e:
            nb(data)
        assert e.value.offset == want, data
    assert bad > 1000


def test_n1():
    assert n1(b'\xef\xbb\xbfHello\r\nW\xc3\x89RLD\r') == b'hello\nw\xc3\x89rld\r'
    assert n1(b'A\xef\xbb\xbfB') == b'a\xef\xbb\xbfb'      # only a leading BOM is stripped
    assert n1(b'\xff\xfe') == b'\xff\xfe'                  # bytes as given: no UTF-8 check


@pytest.mark.slow
def test_instance_a_matches_oracle(wn):
    strings = l1.instance_a(wn)
    assert len(strings) == 117659
    for s in strings:
        check_same(s)


def test_nb_reads_no_platform_unicode():
    """D5: N_B and the table module import neither unicodedata nor re, and never call str.lower or similar."""
    import ast
    import lexicon.normalise
    import lexicon.unicode_tables
    for mod in (lexicon.normalise, lexicon.unicode_tables):
        tree = ast.parse(open(mod.__file__, encoding='utf-8').read())
        names = {a.name for node in ast.walk(tree) if isinstance(node, (ast.Import, ast.ImportFrom))
                 for a in node.names} | {node.module for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)}
        assert not names & {'unicodedata', 're', 'regex'}, mod.__name__
        calls = {node.func.attr for node in ast.walk(tree)
                 if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)}
        assert not calls & {'casefold', 'upper', 'isspace', 'normalize', 'category', 'isalpha', 'split', 'strip'}, \
            mod.__name__
        if mod is lexicon.normalise:
            # the only .lower() is N1's bytes.lower (ASCII A-Z), inside n1
            lowers = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)
                      for c in ast.walk(node) if isinstance(c, ast.Call) and isinstance(c.func, ast.Attribute)
                      and c.func.attr == 'lower' and node.name != 'n1']
            assert lowers == []
