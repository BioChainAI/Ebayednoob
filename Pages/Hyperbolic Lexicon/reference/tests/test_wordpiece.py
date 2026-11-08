"""WordPiece, the id stream and the V0 trainer (Amendment 1 items 2 and 3): hand-checked trainer runs, the
incremental trainer against a naive one, the V0 and V1 pins, WordPiece against BERT's loop (bert_oracle.py),
spans, LEB128 vectors, controls 2 and 3, and the reported metrics."""
import hashlib
import json
import math
import os

import pytest

from hpstep.prng import Rng
from lexicon import GOLDEN, l1
from lexicon import wordpiece as W
from lexicon.normalise import nb

import bert_oracle

SP = list(W.SPECIALS)


def naive_train(word_counts, size, specials=W.SPECIALS):
    """Item 3 written as plainly as possible: recount every pair from scratch before each merge."""
    alphabet = sorted({ord(c) for w in word_counts for c in w})
    entries = list(specials) + [chr(c) for c in alphabet] + ['##' + chr(c) for c in alphabet]
    words = [([w[0]] + ['##' + c for c in w[1:]], f) for w, f in word_counts.items()]
    while len(entries) < size:
        counts = {}
        for syms, f in words:
            for p in zip(syms, syms[1:]):
                counts[p] = counts.get(p, 0) + f
        if not counts or max(counts.values()) < 2:
            break
        best = max(counts.values())
        a, b = min(p for p, c in counts.items() if c == best)
        m = a + b[2:]
        new_words = []
        for syms, f in words:
            out, i = [], 0
            while i < len(syms):
                if i + 1 < len(syms) and syms[i] == a and syms[i + 1] == b:
                    out.append(m)
                    i += 2
                else:
                    out.append(syms[i])
                    i += 1
            new_words.append((out, f))
        words = new_words
        if m not in entries:
            entries.append(m)
    return entries


# ---- the trainer ------------------------------------------------------------------------------------------------

def test_trainer_hand_checked():
    # ab x3, abc x2, bc x1: (a,##b) 5 -> 'ab'; then (ab,##c) 2 -> 'abc'; then (b,##c) 1 < 2 stops.
    e, info = W.train_v0({'ab': 3, 'abc': 2, 'bc': 1})
    assert e == SP + ['a', 'b', 'c', '##a', '##b', '##c', 'ab', 'abc']
    assert info['merges'] == 2 and info['stop'] == 'largest count below 2' and info['alphabetCodePoints'] == 3
    # a tie of 2 and 2: the smaller (left, right) first, then the other, then no pair is left
    e, info = W.train_v0({'ab': 2, 'ba': 2})
    assert e[-2:] == ['ab', 'ba'] and info['stop'] == 'no adjacent pair left'
    # a pair twice in a word counts twice, and merges left to right without overlap: a ##a ##a ##a ->
    # (##a,##a) 2 beats (a,##a) 1 -> a ##aa ##a; then every pair has 1
    e, info = W.train_v0({'aaaa': 1})
    assert e == SP + ['a', '##a', '##aa'] and info['merges'] == 1
    # (##a,##a) and (a,##a) tie at 2: '##a' < 'a' in code-point order ('#' is U+0023)
    e, _ = W.train_v0({'aaa': 2})
    assert e == SP + ['a', '##a', '##aa', 'aaa']
    # code-point order, not UTF-16 order: U+FF71 < U+1F600 although its UTF-16 unit is larger than U+D83D
    e, _ = W.train_v0({'xｱ': 2, 'x\U0001F600': 2})
    assert e[len(SP):len(SP) + 3] == ['x', 'ｱ', '\U0001F600'] and e[-2:] == ['xｱ', 'x\U0001F600']
    # a merged symbol that is already an entry is not appended again (forced here through the specials)
    e, info = W.train_v0({'ab': 2}, specials=('[UNK]', 'ab'))
    assert e == ['[UNK]', 'ab', 'a', 'b', '##a', '##b'] and info['mergesNotAdded'] == 1
    # the size cap: stop as soon as the vocabulary has `size` entries; three pairs tie at 5 and '##b' < 'a'
    e, info = W.train_v0({'abcd': 5}, size=len(SP) + 8 + 1)
    assert e[-1] == '##bc' and info['merges'] == 1 and info['stop'] == f'reached {len(SP) + 9} entries'


def test_trainer_matches_naive():
    for i in range(300):
        r = Rng(8000 + i)
        letters = 'abc' if i % 2 else 'abcdeéσ'
        counts = {}
        for _ in range(1 + r.below(30)):
            w = ''.join(letters[r.below(len(letters))] for _ in range(1 + r.below(9)))
            counts[w] = counts.get(w, 0) + 1 + r.below(5)
        size = len(SP) + 2 * len({c for w in counts for c in w}) + r.below(40)
        got, _ = W.train_v0(counts, size=size)
        assert got == naive_train(counts, size), counts


# ---- the pins ---------------------------------------------------------------------------------------------------

def test_v0_pin():
    meta = json.load(open(os.path.join(GOLDEN, 'vocab_v0.meta.json')))
    blob = open(W.V0_PATH, 'rb').read()
    assert hashlib.sha256(blob).hexdigest() == meta['sha256'] and len(blob) == meta['bytes']
    v = W.load_v0()
    assert len(v) == meta['entries'] == 8192 and meta['stop'] == 'reached 8192 entries'
    assert v.entries[:5] == SP and v.unk == 1 and v.sha256 == meta['sha256']
    n = meta['alphabetCodePoints']
    alpha = v.entries[5:5 + n]
    assert alpha == sorted(alpha) and v.entries[5 + n:5 + 2 * n] == ['##' + c for c in alpha]
    assert all(len(e.removeprefix('##')) >= 2 for e in v.entries[5 + 2 * n:])
    assert meta['merges'] == 8192 - 5 - 2 * n + meta['mergesNotAdded']


def test_v1_pin():
    if not W.v1_available():
        pytest.skip('V1 not cached: run golden/make_vocab_v1.py')
    meta = json.load(open(W.V1_META))
    v = W.load_v1()
    assert len(v) == meta['entries'] == 30522 and meta['licence'] == 'Apache-2.0'
    assert {e: v.ids[e] for e in SP} == meta['specials'] == {'[PAD]': 0, '[UNK]': 100, '[CLS]': 101, '[SEP]': 102,
                                                               '[MASK]': 103}
    assert len(meta['revision']) == 40 and meta['revision'] in meta['url']


# ---- WordPiece ----------------------------------------------------------------------------------------------------

def vocabs():
    out = [W.load_v0()]
    if W.v1_available():
        out.append(W.load_v1())
    return out


def test_wordpiece_matches_bert_loop():
    strings = [l1.trace_string(i) for i in range(1000)] + l1.instance_c()[::10]
    strings += ['unaffable', 'hyperbolic lexicon', 'café', 'x' * 100, 'x' * 101, 'qqqqzzz']
    if l1.ewt_available():
        strings += l1.instance_b()[::4]
    for v in vocabs():
        for s in strings:
            r = nb(s.encode('utf-8'))
            for w, bad in zip(r.words, r.failed):
                if bad:
                    continue
                assert [p[1] for p in v.word(w)] == bert_oracle.wordpiece(w, v.ids), (v.name, w)


def test_encode_spans_and_unk():
    v = W.Vocab(['[PAD]', '[UNK]', 'un', '##aff', '##able', 'a', '##b'])
    ids, pieces, spans = W.encode('Ünaffable a ab zz x͸'.encode('utf-8'), v)
    assert pieces == ['un', '##aff', '##able', 'a', 'a', '##b', '[UNK]', '[UNK]']
    assert ids == [2, 3, 4, 5, 5, 6, 1, 1]
    assert spans == [(0, 3), (3, 6), (6, 10), (11, 12), (13, 14), (14, 15), (16, 18), (19, 22)]
    v0 = W.load_v0()
    assert W.encode(b'a' * 101, v0)[1] == ['[UNK]'] and W.encode(b'a' * 101, v0)[2] == [(0, 101)]
    assert '[UNK]' not in W.encode(b'a' * 100, v0)[1]
    assert W.encode(b'', v0) == ([], [], [])


def test_piece_spans_partition_words():
    for v in vocabs():
        for i in range(300):
            data = l1.trace_string(i).encode('utf-8')
            r = nb(data)
            ids, pieces, spans = W.encode_nb(r, v)
            k = 0
            for w, bad, sp in zip(r.words, r.failed, r.spans):
                ps = v.word(w) if not bad else ((v.unk, '[UNK]', 0, 0),)
                got = pieces[k:k + len(ps)]
                if got != ['[UNK]']:
                    assert ''.join(p.removeprefix('##') for p in got) == w
                assert all(sp[0] <= a < b <= sp[1] for a, b in spans[k:k + len(ps)])
                assert spans[k][0] == sp[0] and spans[k + len(ps) - 1][1] == sp[1]
                k += len(ps)
            assert k == len(ids)


def test_control_2_shortest_match_differs():
    """L1 control 2 has something to find: shortest-match-first differs from the reference on instance (a)."""
    v = W.load_v0()
    s = 'that which is perceived or known or inferred to have its own distinct existence (living or nonliving)'
    longest, shortest = W.encode(s.encode(), v), W.encode(s.encode(), v, shortest=True)
    assert longest[0] != shortest[0] and len(shortest[0]) > len(longest[0])
    assert shortest[1][:2] == ['t', '##h']


def test_control_3_accents_differ():
    """L1 control 3: N_B without accent stripping differs on accented text (instance (a) is all ASCII; (b) is not)."""
    v = W.load_v0()
    s = 'to avoid giving al-Qaeda an entrée.'.encode('utf-8')
    assert nb(s).words != nb(s, strip_accents=False).words
    assert W.encode(s, v)[0] != W.encode(s, v, strip_accents=False)[0]


def test_leb128_and_id_stream():
    vectors = {0: '00', 1: '01', 127: '7f', 128: '8001', 300: 'ac02', 1907: 'f30e', 8191: 'ff3f', 16383: 'ff7f',
               16384: '808001', 30521: 'b9ee01', 2 ** 32 - 1: 'ffffffff0f'}
    for x, h in vectors.items():
        assert W.leb128([x]).hex() == h
    assert W.leb128([1, 300, 0]).hex() == '01ac0200'
    assert W.id_stream([[1, 2], [], [300]]).hex() == '020102' + '00' + '01ac02'
    assert W.id_stream([]) == b''
    with pytest.raises(ValueError):
        W.leb128([-1])


def test_metrics_hand_checked():
    v = W.Vocab(['[PAD]', '[UNK]', 'un', '##aff', '##able', 'a', '##b'])
    m = W.metrics(['unaffable a', 'zz'], v)
    assert (m['words'], m['tokens'], m['bytes'], m['unk'], m['failClosed']) == (3, 5, 13, 1, 0)
    assert m['fertility'] == 5 / 3 and m['continuedWordRate'] == 1 / 3 and m['bytesPerToken'] == 13 / 5
    assert m['unkRate'] == 0.2
    assert math.isclose(m['renyiEfficiency'], math.log(5) / math.log(7))     # uniform over 5 tokens, |V| = 7
    assert math.isclose(m['renyiEfficiencyObserved'], 1.0)
    h = math.log(0.75 ** 2.5 + 0.25 ** 2.5) / (1 - 2.5)
    assert math.isclose(W.renyi_efficiency({'x': 3, 'y': 1}, 10), h / math.log(10))
    m = W.metrics(['x͸ y'], v)
    assert m['failClosed'] == 1 and m['unk'] == 2


# ---- slow: full-corpus checks ----------------------------------------------------------------------------------

@pytest.mark.slow
def test_v0_retrains_to_the_pin(wn):
    counts, _ = W.corpus_counts(l1.instance_a(wn))
    entries, info = W.train_v0(counts)
    assert W.Vocab(entries).sha256 == json.load(open(W.V0_META))['sha256']
    # the first 100 merges again, with the naive trainer
    size = 5 + info['alphabetEntries'] + 100
    assert naive_train(counts, size) == entries[:size]


@pytest.mark.slow
def test_instance_a_wordpiece_matches_bert_loop(wn):
    v = W.load_v0()
    seen = set()
    for s in l1.instance_a(wn):
        for w in nb(s.encode('utf-8')).words:
            if w not in seen:
                seen.add(w)
                assert [p[1] for p in v.word(w)] == bert_oracle.wordpiece(w, v.ids), w
