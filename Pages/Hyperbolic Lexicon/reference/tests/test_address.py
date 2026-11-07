"""The L3 rule and its controls, the verb forest (the dry-run forest, Amendment 1 item 10, replaying spike S3's word
hash), certifyWord, the D6 id codec with its coverage bounds proved, the prefix check of L3(d), map A on a toy
vocabulary, and the S3 / K3 word sets. Nouns are only built here, never checked against L3 (that is the runner's)."""
import hashlib
from collections import Counter

import pytest

from engram.address import encode
from hpstep.prng import Rng
from hpstep.problems import children, is_reduced, word_quaternion
from lexicon import address as A
from lexicon import wordnet as W

S3_VERB_WORDS_SHA = 'ec39f99762d2814876ee1339664903308a7c36a0c47ba535e7279cec85e9c3d7'   # s3_wordnet_shape_output.txt


def random_word(rng, L):
    w = [rng.below(6)]
    while len(w) < L:
        w.append(children(w)[rng.below(5)])
    return tuple(w)


def all_reduced(L):
    out, layer = [()], [()]
    for _ in range(L):
        layer = [w + (g,) for w in layer for g in children(w)]
        out += layer
    return out


# ================================================================ the rule
def test_letters_for():
    table = {1: 1, 2: 1, 5: 1, 6: 2, 25: 2, 26: 3, 125: 3, 126: 4, 559: 4, 625: 4, 626: 5}
    assert {c: A.letters_for(c) for c in table} == table
    assert A.letters_for_zero(1) == 0 and A.letters_for_zero(2) == 1 and A.letters_for_zero(26) == 3


def test_child_word_digits_most_significant_first():
    # child 7 of 10: two letters, digits 1 then 2
    w = A.child_word((0,), 7, 10)
    assert w == (0, children((0,))[1], children((0, children((0,))[1]))[2])
    assert w == (0, 2, 2)
    for c in (1, 3, 5, 6, 24, 25, 26, 130, 659):
        kids = [A.child_word((3, 0), k, c) for k in range(c)]
        assert len(set(kids)) == c                                     # injective among siblings
        assert all(len(k) == 2 + A.letters_for(c) and k[:2] == (3, 0) and is_reduced(k) for k in kids)
        assert kids == sorted(kids, key=A.word_id)                     # offset order = id order among siblings


def test_controls_break_siblings_or_only_children():
    assert A.child_word((0,), 0, 1, 'zero') == (0,)                   # an only child shares its parent's word
    assert A.child_word((0,), 0, 2, 'zero') == A.child_word((0,), 0, 2)
    assert A.child_word((0,), 7, 10, 'trunc') == A.child_word((0,), 4, 10, 'trunc') == A.child_word((0,), 4, 5)
    assert A.child_word((0,), 3, 10, 'trunc') == (0, children((0,))[3])
    with pytest.raises(ValueError):
        A.child_word((0,), 5, 5)
    with pytest.raises(ValueError):
        A.child_word((0,), 0, 1, 'bogus')


def test_forest_words_toy():
    #        r
    #     a  b  c          (offsets sort as a < b < c)
    #    d       e f g h i j
    parent = {'r': None, 'a': 'r', 'b': 'r', 'c': 'r', 'd': 'a'}
    parent.update({x: 'c' for x in 'efghij'})
    kids = {'r': ['a', 'b', 'c'], 'a': ['d'], 'c': ['e', 'f', 'g', 'h', 'i', 'j']}
    w = A.forest_words(parent, kids, ['r'], (0,))
    assert w['r'] == (0,) and w['a'] == (0, 0) and w['b'] == (0, 2) and w['c'] == (0, 3)
    assert w['d'] == (0, 0, 0)
    assert [w[x] for x in 'efghij'] == [A.child_word((0, 3), k, 6) for k in range(6)]
    assert len(w['e']) == 4 and len(set(w.values())) == len(w)
    assert A.prefix_check(w, parent) == []
    v = A.forest_words(parent, kids, ['r'], (1,), virtual=True)       # one root under a virtual root
    assert v['r'] == (1, 1)                                             # children((1,)) = [1, 2, 3, 4, 5]
    z = A.forest_words(parent, kids, ['r'], (0,), 'zero')
    assert z['d'] == z['a'] and A.prefix_check(z, parent)               # control 1 breaks injectivity and (d)
    t = A.forest_words(parent, kids, ['r'], (0,), 'trunc')
    assert t['j'] == t['i'] != t['h']                                    # child 5 of c folded into child 4
    two = {'x': None, 'y': None}
    assert A.forest_words(two, {}, ['x', 'y'], (1,)) == {'x': (1, 1), 'y': (1, 2)}
    with pytest.raises(ValueError):
        A.forest_words(two, {}, ['x', 'y'], (1,), virtual=False)


# ================================================================ the verb forest (dry run) and the nouns (built only)
def test_verb_words_replay_s3(wn):
    vw = A.verb_words(wn)
    assert len(vw) == 13767
    assert A.words_sha256(vw) == S3_VERB_WORDS_SHA
    lengths = Counter(len(w) for w in vw.values())
    assert max(lengths) == 26 and sum(n for L, n in lengths.items() if L <= 25) == 13762
    _, _, roots = W.spanning_forest(wn['synsets']['verb'])
    assert all(len(vw[o]) == 5 and vw[o][0] == 1 for o in roots)       # 559 roots: 4 letters under [1]


def test_verb_forest_l3_dry_run(wn):
    """L3 (a), (c), (d), (g) on the verb forest, and both controls breaking injectivity there."""
    vw = A.verb_words(wn)
    parent, _, _ = W.spanning_forest(wn['synsets']['verb'])
    assert len(set(vw.values())) == len(vw)
    assert all(A.certify(w) for w in vw.values())
    assert A.prefix_check(vw, parent) == []
    assert all(A.id_word(A.id64(w)) == w for w in vw.values())
    for variant in ('zero', 'trunc'):
        assert len(set(A.verb_words(wn, variant).values())) < len(vw)


def test_noun_words_build(wn):
    nw = A.noun_words(wn)
    assert len(nw) == 82115 and nw[W.ENTITY] == (0,)
    _, kids, _ = W.spanning_forest(wn['synsets']['noun'])
    c = len(kids[W.ENTITY])
    assert [nw[o] for o in kids[W.ENTITY]] == [A.child_word((0,), k, c) for k in range(c)]
    assert A.noun_words(wn) is nw                                        # cached


# ================================================================ certifyWord
def test_certify():
    rng = Rng(8500)
    for _ in range(300):
        w = random_word(rng, 1 + rng.below(40))
        assert A.certify_parts(w) == (True, True, True)
    assert A.certify_parts((0, 1)) == (True, False, False)            # 1 + 2i then 1 - 2i: norm 25, not reduced
    assert not A.certify((2, 3, 4))


# ================================================================ D6: the id codec
def test_id_small_values():
    assert A.word_id(()) == 0 and A.id_word(0) == ()
    assert [A.word_id((g,)) for g in range(6)] == [1, 2, 3, 4, 5, 6]
    assert A.word_id((0, 0)) == 7 and A.word_id((0, 2)) == 8 and A.word_id((5, 5)) == 36
    assert [A.start_of(n) for n in range(5)] == [0, 1, 7, 37, 187]


def test_id_is_a_bijection_up_to_length_6():
    words = all_reduced(6)
    ids = [A.word_id(w) for w in words]
    assert sorted(ids) == list(range(len(words))) == list(range(A.start_of(7)))
    assert all(A.id_word(i) == w for i, w in zip(ids, words))
    # inside a length, ids follow the lexicographic order of (first letter, child indices)
    assert ids == sorted(ids)


def test_id_round_trip_random():
    rng = Rng(8501)
    for _ in range(2000):
        w = random_word(rng, 1 + rng.below(60))
        n = A.word_id(w)
        assert A.id_word(n) == w and A.start_of(len(w)) <= n < A.start_of(len(w) + 1)


def test_id_coverage_bounds():
    """id59 covers every word of <= 25 letters and not every word of 26; id64 every word of <= 27, not every of 28.
    The largest id of length L is start_of(L + 1) - 1 (the word 5, then child index 4 at every later letter)."""
    def largest(L):
        w = [5]
        while len(w) < L:
            w.append(children(w)[4])
        return tuple(w)
    for L in range(1, 30):
        assert A.word_id(largest(L)) == A.start_of(L + 1) - 1
    assert A.start_of(26) - 1 < 2 ** 59 <= A.start_of(27) - 1
    assert A.start_of(28) - 1 < 2 ** 64 <= A.start_of(29) - 1
    assert A.start_of(26) == 1 + 6 * (5 ** 25 - 1) // 4                  # 4.47e17, as architecture.html states
    w25, w26 = largest(25), largest(26)
    assert A.id59(w25) == A.word_id(w25) < 2 ** 59 and A.id59(w26) is None and A.word_id(w26) >= 2 ** 59
    w27, w28 = largest(27), largest(28)
    assert A.id64(w27) < 2 ** 64 and A.id64(w28) is None and A.word_id(w28) >= 2 ** 64


# ================================================================ L3(d)
def test_prefix_check_detects_extra_and_missing_ancestors():
    parent = {'a': None, 'b': 'a', 'c': 'b'}
    good = {'a': (0,), 'b': (0, 0), 'c': (0, 0, 2)}
    assert A.prefix_check(good, parent) == []
    unrelated = {'a': (0,), 'b': (0, 0), 'd': (0, 0, 0)}               # d is not below b in `parent`
    assert A.prefix_check(unrelated, {'a': None, 'b': 'a', 'd': 'a'}) == [('d', ['a', 'b'], ['a'])]
    missing = {'a': (0,), 'b': (1,), 'c': (1, 2)}
    assert A.prefix_check(missing, parent) == [('b', [], ['a']), ('c', ['b'], ['a', 'b'])]


# ================================================================ map A
TOY = ['[PAD]', '[UNK]', '[CLS]', '[SEP]', '[MASK]', '[unused0]', '1', '23', '.', '!?', 'dog', 'car', 'auto',
       'automobile', 'run', 'walk', 'good', 'quickly', '##s', '##ing', '##1', 'xyzzy', 'the', 'b5', 'été']


def test_map_a_toy(wn):
    nw, vw = A.noun_words(wn), A.verb_words(wn)
    words, rep = A.map_a(TOY, wn, nw, vw)
    assert len(words) == len(TOY) and all(is_reduced(w) for w in words)
    index = wn['index']

    def pos_of(e):
        listed = [p for p in W.POS if e in index[p]]
        return max(listed, key=lambda p: (index[p][e].tagsense, -W.POS.index(p))) if listed else None

    root5 = [i for i, e in enumerate(TOY) if e.startswith('[') or e in ('1', '23', '.', '!?')]
    assert root5 == list(range(10)) and rep['n5'] == 10 and rep['m5'] == 2
    for j, i in enumerate(root5):
        w = [5]
        for d in (j // 5, j % 5):
            w.append(children(w)[d])
        assert words[i] == tuple(w)
    alphabet = sorted({c for i, e in enumerate(TOY) if i not in root5 for c in (e[2:] if e.startswith('##') else e)})
    assert rep['alphabet'] == len(alphabet) and rep['m_alphabet'] == A.letters_for(len(alphabet))

    def spelled(root, text):
        w = [root]
        for c in text:
            j = alphabet.index(c)
            ds = []
            for _ in range(rep['m_alphabet']):
                ds.append(j % 5)
                j //= 5
            for d in reversed(ds):
                w.append(children(w)[d])
        return tuple(w)
    for i, e in enumerate(TOY):
        if i in root5:
            continue
        if e.startswith('##'):
            assert words[i] == spelled(3, e[2:])
            continue
        p = pos_of(e)
        if p == 'noun':
            assert words[i] == nw[index['noun'][e].offsets[0]] and words[i][0] == 0
        elif p == 'verb':
            assert words[i] == vw[index['verb'][e].offsets[0]] and words[i][0] == 1
        elif p in ('adj', 'adv'):
            assert words[i] == spelled(2, e)
        else:
            assert words[i] == spelled(4, e)
    assert pos_of('dog') == 'noun' and pos_of('quickly') == 'adv' and pos_of('xyzzy') is None
    # car, auto and automobile share their first noun sense: A is not injective, and the report says so
    i_car, i_auto, i_automobile = TOY.index('car'), TOY.index('auto'), TOY.index('automobile')
    assert words[i_car] == words[i_auto] == words[i_automobile]
    assert [i_car, i_auto, i_automobile] in rep['shared'] and rep['shared_addresses'] >= 1
    assert sum(rep['per_root'].values()) == len(TOY) and rep['per_root'][5] == 10 and rep['per_root'][3] == 3


def test_nb_punct():
    assert all(A.nb_punct(c) for c in '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~¿、—')
    assert not any(A.nb_punct(c) for c in 'a0 é一')
    assert A.is_special('[unused993]') and not A.is_special('[unused]') and not A.is_special('[unusedx]')


# ================================================================ S3 and K3
def test_s3_words_permute_within_lengths():
    rng = Rng(8502)
    words = [random_word(rng, 1 + rng.below(6)) for _ in range(500)]
    p = A.s3_words(words, 8503)
    assert p == A.s3_words(words, 8503) and p != words
    for L in range(1, 7):
        assert sorted(w for w in words if len(w) == L) == sorted(w for w in p if len(w) == L)
    assert all(len(a) == len(b) for a, b in zip(words, p))
    # the definition, written out: one Rng for all lengths, lengths in increasing order, offset order inside
    r = Rng(8503)
    expect = list(words)
    for L in sorted({len(w) for w in words}):
        idx = [i for i, w in enumerate(words) if len(w) == L]
        for i, w in zip(idx, r.shuffle([words[i] for i in idx])):
            expect[i] = w
    assert p == expect


def test_k3_words(wn):
    w = A.k3_word('dog')
    v = int.from_bytes(hashlib.sha256(b'dog').digest()[:8], 'big')
    assert w == tuple(encode(v)) and len(w) == 28 and w[0] in range(5) and is_reduced(w)
    assert sum(c * c for c in word_quaternion(w)) == 5 ** 28
    offs = W.nouns_in_order(wn)[:50]
    ks = A.k3_words(wn, offs)
    assert ks[0] == A.k3_word(wn['synsets']['noun'][offs[0]].lemmas[0]) and all(len(k) == 28 for k in ks)
