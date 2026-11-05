#!/usr/bin/env python3
"""Hyperbolic Lexicon: the text-track traces the browser core must reproduce line for line (Phase 1 writes them,
Phase 2 reproduces them; common rule "Authority"; L1, Amendment 1 items 1 and 2).

    python3 -B "Pages/Hyperbolic Lexicon/reference/traces_text.py"           write traces/normalise_v1.txt and
                                                                            traces/wordpiece_v1.txt
    python3 -B "Pages/Hyperbolic Lexicon/reference/traces_text.py" --check   rebuild in memory and compare

Cases: a fixed list of hand-picked edge cases (Final_Sigma contexts, U+0130, Hangul, canonical ordering, CJK,
controls, Co, Cn failing closed, invalid UTF-8, long words, the empty string, ...) then 300 synthetic strings,
string i from Rng(8000 + i) with L1 (d)'s pool (lexicon.l1.trace_string). Seeds 8000 + i are reserved for traces;
no claim uses them. Each file documents its own format in its '#' header. The output depends only on the pinned
table, the pinned vocabularies and this file: V1 lines are written when V1 is cached (golden/make_vocab_v1.py), and
the header says which vocabularies a file holds. --check exits 0 equal, 1 different, 2 "skipped" when the
committed wordpiece trace holds V1 and V1 is not cached.
"""
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lexicon import l1, unicode_tables, wordpiece  # noqa: E402
from lexicon.normalise import InvalidUTF8, nb  # noqa: E402

TRACES = os.path.join(HERE, 'traces')
NORMALISE = os.path.join(TRACES, 'normalise_v1.txt')
WORDPIECE = os.path.join(TRACES, 'wordpiece_v1.txt')
N_SYNTHETIC = 300
SEED = l1.SEED_TRACE

U8 = lambda s: s.encode('utf-8')  # noqa: E731
EDGE = [
    # empty, whitespace only, plain ASCII, punctuation, the literal [UNK]
    b'', b' ', b'\t\n\r \x0b\x0c', b'a', b'Hello, World!', b"Don't stop.", b'U.S.A. (1999) $5 + 3 = 8 ~ #tag @x',
    b'[UNK] [CLS] ##ab', b'that which is perceived or known or inferred to have its own distinct existence',
    # Final_Sigma: final, medial, alone, before and after case-ignorables, across separators and dropped controls
    U8('ΟΔΟΣ'), U8('ΟΔΟΣ ΟΔΟΣ.'), U8('ΑΣ.'), U8('ΑΣΒ'), U8('ΑΣ́'), U8('Σ'), U8('ΣΣ'), U8("ΑΣ'Β"),
    U8('ΆΣ'), U8('ΑΣ​Β'), U8('ΑΣ­'), U8('ʕΣ'), U8('ΑΣ Β'), U8('ὈΔΥΣΣΕΎΣ'),
    U8('1Σ'), U8('AΣ'),
    # U+0130 and other multi-code-point or context-free case mappings
    U8('İ'), U8('aİb'), U8('İSTANBUL'), U8('İ'), U8('ẞ'), U8('ǅ ǈ ǋ'),
    U8('KΩÅ'), U8('ﬁ ﬀ'), U8('\U00010400\U00010428'), U8('ⅠⅫ Ⓐ'),
    # Hangul: syllables (LV and LVT), conjoining jamo, compatibility jamo
    U8('한국어'), U8('가힣'), U8('각'), U8('ㄱㅏ'),
    # canonical decomposition and ordering
    U8('ạ́'), U8('ạ́'), U8('ḍ̇'), U8('̈́'), U8('q̣̇'), U8('क़'),
    U8('café naïve résumé'), U8('́abc'), U8('ᾳᾼ'), U8(';·x'),
    U8('ཱཱཱིྀུ'), U8('\U0001D15E'),
    # CJK: BERT's ranges become words of their own; Cn inside a CJK range fails closed alone
    U8('中文abc字'), U8('日本語のテキスト'), U8('\U00020000x'), U8('x\U0002B81Ey'), U8('豈﩮'),
    # controls, format characters, separators, U+FFFD, private use
    b'a\x00b', b'a\x7fb', U8('a\x85b'), U8('﻿abc'), U8('a​b'), U8('a­b'), U8('a b c'),
    U8('a b　c d'), U8('x�y'), U8('abc'), U8('x\U000F0000 y'), b'a\r\nb',
    # Cn: unassigned in 15.1 (including code points assigned since): the whitespace token fails closed
    U8('a͸b c'), U8('ࢗ'), U8('x\U000E0080y z'), U8('ok Ᲊ ok'), U8('\U0001FAE9!'),
    # invalid UTF-8
    b'\xff', b'a\xc3', b'\xed\xa0\x80', b'ab\xe2\x82\x28', b'\xc0\xaf', b'\xf4\x90\x80\x80', b'ok \xe2\x82',
    # long words: 100 and 101 code points, ASCII and two-byte
    b'a' * 100, b'a' * 101, U8('é' * 101), U8('b' * 99 + '́'),
    # emoji and mixed scripts
    U8('\U0001F600 smile\U0001F64F'), U8('Привет, мир!'), U8('¿Qué tal? «bien» — sí'), U8('Ünaffable'),
]


def hexs(b):
    return b.hex() if b else '-'


def cases():
    out = [('E%d' % k, b) for k, b in enumerate(EDGE)]
    out += [('S%d' % i, l1.trace_string(i).encode('utf-8')) for i in range(N_SYNTHETIC)]
    return out


def available_vocabs():
    out = [('V0', wordpiece.load_v0())]
    if wordpiece.v1_available():
        out.append(('V1', wordpiece.load_v1()))
    return out


def normalise_trace():
    lines = [
        '# normalise_v1.txt: N_B traces for the browser core (Hyperbolic Lexicon; written by reference/traces_text.py)',
        '# N_B = PREREGISTRATION.md Amendment 1 item 1, on golden/unicode_15_1_v1.json (sha256 %s)'
        % unicode_tables.SHA256,
        '# cases: E<k> the hand-picked edge cases, then S<i> the string of lexicon.l1.trace_string(i) = Rng(%d + i)'
        % SEED,
        '# one line per case, fields separated by TAB:',
        '#   case   E<k> or S<i>',
        "#   input  the input bytes as lower-case hex ('-' when empty)",
        "#   result 'ok', or 'invalid@<offset>' (rejected; the offset of the first bad byte; then text and words are '-')",
        "#   text   the normalised text (the words joined by U+0020) as UTF-8 hex ('-' when empty)",
        '#   words  the words separated by single spaces, each <start>,<end>,<UTF-8 hex>, or <start>,<end>,! when it',
        "#          failed closed (written [UNK]); [start, end) is its byte span in the input ('-' when no word)",
    ]
    for name, data in cases():
        try:
            r = nb(data)
        except InvalidUTF8 as e:
            lines.append('\t'.join((name, hexs(data), 'invalid@%d' % e.offset, '-', '-')))
            continue
        words = ' '.join('%d,%d,%s' % (a, b, '!' if bad else w.encode('utf-8').hex())
                         for w, bad, (a, b) in zip(r.words, r.failed, r.spans)) or '-'
        lines.append('\t'.join((name, hexs(data), 'ok', hexs(r.text_bytes), words)))
    return ''.join(x + '\n' for x in lines)


def wordpiece_trace(vocabs):
    lines = [
        '# wordpiece_v1.txt: WordPiece traces for the browser core (Hyperbolic Lexicon; written by reference/traces_text.py)',
        '# WordPiece and the id stream = PREREGISTRATION.md Amendment 1 item 2, on N_B (normalise_v1.txt, same cases)',
    ]
    for tag, v in vocabs:
        lines.append('# vocab %s: %d entries, sha256 %s' % (tag, len(v), v.sha256))
    lines += [
        '# one line per valid case and vocabulary (invalid UTF-8 cases are left out), fields separated by TAB:',
        '#   case   as in normalise_v1.txt',
        '#   vocab  ' + ' or '.join(t for t, _ in vocabs),
        '#   pieces the pieces separated by single spaces, each <id>,<start>,<end>,<UTF-8 hex of the piece>',
        "#          ([UNK] is 5b554e4b5d); [start, end) is the piece's byte span in the input ('-' when none)",
        '# then one line per vocabulary: idstream TAB vocab TAB <instances> TAB <id-stream bytes> TAB <sha256>, the',
        '# id stream (LEB128(number of ids), then LEB128 of each id, per case in order) over the valid cases',
    ]
    streams = {t: [] for t, _ in vocabs}
    for name, data in cases():
        try:
            r = nb(data)
        except InvalidUTF8:
            continue
        for tag, v in vocabs:
            ids, pieces, spans = wordpiece.encode_nb(r, v)
            streams[tag].append(ids)
            body = ' '.join('%d,%d,%d,%s' % (i, a, b, p.encode('utf-8').hex())
                            for i, p, (a, b) in zip(ids, pieces, spans)) or '-'
            lines.append('\t'.join((name, tag, body)))
    for tag, _ in vocabs:
        s = wordpiece.id_stream(streams[tag])
        lines.append('\t'.join(('idstream', tag, str(len(streams[tag])), str(len(s)), hashlib.sha256(s).hexdigest())))
    return ''.join(x + '\n' for x in lines)


def main():
    check = '--check' in sys.argv[1:]
    vocabs = available_vocabs()
    texts = {NORMALISE: normalise_trace(), WORDPIECE: wordpiece_trace(vocabs)}
    if check:
        if os.path.exists(WORDPIECE) and len(vocabs) == 1 and '# vocab V1:' in open(WORDPIECE, encoding='utf-8').read():
            print('skipped: wordpiece_v1.txt holds V1, which is not cached (run golden/make_vocab_v1.py)',
                  file=sys.stderr)
            return 2
        bad = [os.path.basename(p) for p, t in texts.items()
               if not os.path.exists(p) or open(p, 'rb').read() != t.encode('utf-8')]
        if bad:
            print('MISMATCH: ' + ', '.join(bad), file=sys.stderr)
            return 1
        print('traces match: ' + ', '.join('%s (%d lines, sha256 %s)' % (
            os.path.basename(p), t.count('\n'), hashlib.sha256(t.encode('utf-8')).hexdigest()[:16])
            for p, t in texts.items()))
        return 0
    os.makedirs(TRACES, exist_ok=True)
    for p, t in texts.items():
        with open(p, 'wb') as f:
            f.write(t.encode('utf-8'))
        print('wrote %s: %d lines, sha256 %s' % (os.path.relpath(p, HERE), t.count('\n'),
                                                  hashlib.sha256(t.encode('utf-8')).hexdigest()))
    return 0


if __name__ == '__main__':
    sys.exit(main())
