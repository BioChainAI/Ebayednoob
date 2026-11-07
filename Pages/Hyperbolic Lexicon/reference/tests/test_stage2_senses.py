"""lexicon.senses (Amendment 13 items 3, 4, 9, 10): N_S, the universes and the '@' graph, S_U(w), coverage and the
underscore rule, pair sets and their hashes, word types, HiT's names and their verifier, and the reported sense rules
(first, gensim, morphy) on a synthetic lexicon; then, on WordNet 3.0 itself, the full-lexicon count checks of U_@,
E, T, its roots, anchors and |NN|, the verb graph of the dry run, index.noun's strata and the one-to-one names
(counting only). No Stage-2 file is read here; hpstep.prng.Rng refuses every seed outside 95200-95499."""
import hashlib

import pytest

import hpstep.prng as P
from lexicon import senses as S
from lexicon import wordnet as W


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    init = P.Rng.__init__

    def guarded(self, seed=0, state=None):
        if state is None and not 95200 <= seed < 95500:
            raise RuntimeError(f'seed {seed}: Stage 2 tests draw 95200 + i only (A13.12)')
        return init(self, seed, state)
    monkeypatch.setattr(P.Rng, '__init__', guarded)


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


# A synthetic lexicon: A is the root; B, C under A; D under B and C; E under D; F an instance of A ('@i' only);
# G has no pointer at all. 'dog' lists X then B (so B is dog.n.02); 'cat' lists C; 'ice_cream' lists E.
def syn(off, lemmas, ptrs, pos='n'):
    return W.Synset('noun' if pos == 'n' else 'verb', pos, off, lemmas, ptrs, '')


A, B, C, D, E, F, G, X = (f'0000000{i}' for i in range(1, 9))
NOUNS = {
    A: syn(A, ['Entity'], []),
    B: syn(B, ['dog', 'domestic_dog'], [('@', A, 'n')]),
    C: syn(C, ['cat'], [('@', A, 'n')]),
    D: syn(D, ['hybrid'], [('@', B, 'n'), ('@', C, 'n')]),
    E: syn(E, ['ice_cream'], [('@', D, 'n')]),
    F: syn(F, ['Paris'], [('@i', A, 'n')]),
    G: syn(G, ['lonely'], []),
    X: syn(X, ['Dog'], []),
}
INDEX = {
    'entity': W.IndexEntry('entity', 0, [A]),
    'dog': W.IndexEntry('dog', 0, [X, B]),
    'domestic_dog': W.IndexEntry('domestic_dog', 0, [B]),
    'cat': W.IndexEntry('cat', 0, [C, G]),
    'hybrid': W.IndexEntry('hybrid', 0, [D]),
    'ice_cream': W.IndexEntry('ice_cream', 0, [E]),
    'paris': W.IndexEntry('paris', 0, [F]),
    'lonely': W.IndexEntry('lonely', 0, [G]),
}
WN = {'synsets': {'noun': NOUNS}, 'index': {'noun': INDEX}}


# ================================================================ N_S
def test_n_s():
    assert S.N_S('Ice Cream') == 'ice_cream'
    assert S.N_S('New  York') == 'new__york'
    assert S.N_S('ÉCOLE Été') == 'École_Été'          # non-ASCII letters keep their case
    assert S.N_S('T-shirt\'s') == 't-shirt\'s'         # nothing but A-Z and ' ' changes
    assert S.N_S('a\tb') == 'a\tb'
    for w in ('Dog', 'ice cream', 'ÄÖ x'):
        assert S.N_S(S.N_S(w)) == S.N_S(w)


# ================================================================ the '@' graph
def test_at_graph_synthetic():
    g = S.at_graph(WN)
    assert g.nodes == [A, B, C, D, E]
    assert g.edges == [(B, A), (C, A), (D, B), (D, C), (E, D)]
    assert g.ancestors[E] == {A, B, C, D} and g.ancestors[D] == {A, B, C} and g.ancestors[A] == set()
    assert g.roots == [A] and g.n_closure == 9 and g.n_indirect == 4 and g.anchors == 4
    assert g.min_nn == 1 and g.isolated == 3                          # D: 5 - 1 - 3; F, G, X are outside
    assert g.nodes_sha() == sha('\n'.join([A, B, C, D, E]))
    assert g.edges_sha() == sha('\n'.join(f'{c} {p}' for c, p in g.edges))
    assert g.parents[D] == [B, C] and g.children[A] == [B, C]
    with pytest.raises(ValueError):
        S.check_at_graph(g)


def test_at_graph_refuses_a_cycle():
    nouns = dict(NOUNS)
    nouns[A] = syn(A, ['Entity'], [('@', E, 'n')])
    with pytest.raises(ValueError):
        S.at_graph({'synsets': {'noun': nouns}, 'index': {'noun': INDEX}})


# ================================================================ senses and coverage
def test_senses_in_index_order_and_universe():
    U_full = S.universe_full(WN)
    U_at = frozenset(S.at_graph(WN).nodes)
    assert S.senses('dog', U_full, WN) == [X, B]                   # index order, sense 1 first
    assert S.senses('Dog', U_at, WN) == [B]                         # X is not in U_@
    assert S.senses('dogs', U_full, WN) == []                       # absent raw: no lemmatiser
    assert S.senses('Ice Cream', U_full, WN) == [E]
    assert S.senses('cat', None, WN) == [C, G]
    assert S.senses('paris', U_at, WN) == []


def test_covered_and_the_underscore_rule():
    U_full = S.universe_full(WN)
    U_at = frozenset(S.at_graph(WN).nodes)
    assert S.covered('dog', 'cat', U_full, WN)
    assert not S.covered('dog', 'unicorn', U_full, WN)
    assert S.covered('Paris', 'entity', U_full, WN) and not S.covered('Paris', 'entity', U_at, WN)
    vocab = {'dog', 'cat', 'ice_cream', 'entity'}
    assert S.covered('Dog', 'cat', U_full, WN, vocab)
    assert not S.covered('ice cream', 'cat', U_full, WN, vocab)    # an N_S form with '_' is never in GloVe
    assert not S.covered('hybrid', 'cat', U_full, WN, vocab)       # not in the vocabulary
    rows = [(0, 'dog', 'cat'), (1, 'ice cream', 'dog'), (2, 'unicorn', 'cat'), (3, 'paris', 'dog')]
    assert S.covered_rows(rows, U_full, WN) == [0, 1, 3]
    assert S.covered_rows(rows, U_at, WN) == [0, 1]
    assert S.covered_rows(rows, U_full, WN, vocab) == [0]


def test_pair_sets_hashes_and_word_types():
    assert S.pair_set([0, 2, 3, 5], [5, 3, 0, 9], [0, 3, 5]) == [0, 3, 5]
    assert S.pair_set([4, 1]) == [1, 4] and S.pair_set() == []
    assert S.rows_text([0, 3, 12]) == '0\n3\n12'
    assert S.rows_sha([0, 3, 12]) == sha('0\n3\n12') and S.rows_sha([]) == sha('')
    assert S.ns_pairs_sha([('Ice Cream', 'Dog'), ('a', 'b')]) == sha('ice_cream\tdog\na\tb')
    t = S.word_types([('dog', 'Cat'), ('cat', 'Zebra'), ('apple', 'dog'), ('Ébène', 'zebra')])
    assert t == ['apple', 'cat', 'dog', 'zebra', 'Ébène']           # code-point order, N_S forms, distinct
    assert S.word_types_sha(t) == sha('apple\ncat\ndog\nzebra\nÉbène')
    assert S.keys_sha(['b', 'a', 'b']) == sha('b\na\nb')


# ================================================================ HiT's names
def test_hit_names_synthetic():
    names = S.hit_names(WN)
    assert names['entity.n.01'] == A and names['dog.n.02'] == B and names['dog.n.01'] == X
    assert names['cat.n.01'] == C and names['lonely.n.01'] == G and names['ice_cream.n.01'] == E
    assert len(names) == len(NOUNS) and len(set(names.values())) == len(NOUNS)
    nodes = S.at_graph(WN).nodes
    good = ['entity.n.01', 'dog.n.02', 'cat.n.01', 'hybrid.n.01', 'ice_cream.n.01']
    assert S.resolve_names(good, WN, nodes, count=5) == dict(zip(good, nodes))
    for bad in (good[:4], good + ['dog.n.01'], good[:4] + ['entity.n.01'], good[:4] + ['ice_cream.n.02']):
        with pytest.raises(ValueError):
            S.resolve_names(bad, WN, nodes, count=5)
    with pytest.raises(ValueError):
        S.resolve_names(good, WN, nodes)                              # the registered count is 74,401


def test_hit_names_refuse_an_unlisted_first_lemma():
    index = dict(INDEX)
    index['hybrid'] = W.IndexEntry('hybrid', 0, [A])
    with pytest.raises(ValueError):
        S.hit_names({'synsets': {'noun': NOUNS}, 'index': {'noun': index}})


def test_names_use_two_digits_and_more():
    offs = [f'1{i:07d}' for i in range(101)]
    nouns = {o: syn(o, ['bank'], []) for o in offs}
    names = S.hit_names({'synsets': {'noun': nouns}, 'index': {'noun': {'bank': W.IndexEntry('bank', 0, offs)}}})
    assert names['bank.n.01'] == offs[0] and names['bank.n.09'] == offs[8] and names['bank.n.101'] == offs[100]


# ================================================================ reported sense rules
def test_first_and_gensim_pairs():
    assert S.first_pair([X, B], [C, G]) == (X, C)
    dist = {(X, C): 3, (X, G): 2, (B, C): 2, (B, G): 5}
    assert S.gensim_pair([X, B], [C, G], lambda s, t: dist[(s, t)]) == (X, G)      # tie: first in (i, j) order
    assert S.gensim_pair([B, X], [C, G], lambda s, t: dist[(s, t)]) == (B, C)


def test_morphy_synthetic():
    exc = {'mice': ['mouse'], 'oxen': ['ox', 'oxe']}
    idx = {k: W.IndexEntry(k, 0, ['1']) for k in ('mouse', 'ox', 'oxe', 'bus', 'church', 'box', 'man', 'fly', 'buse',
                                                   'glass', 'wish', 'quiz')}
    wn = {'index': {'noun': idx}}
    assert S.morphy('mice', wn, exc) == 'mouse'
    assert S.morphy('oxen', wn, exc) == 'ox'                          # the shortest candidate
    assert S.morphy('buses', wn, exc) == 'bus'                        # 'buse' (s) and 'bus' (ses): the shorter
    assert S.morphy('churches', wn, exc) == 'church'
    assert S.morphy('boxes', wn, exc) == 'box'
    assert S.morphy('wishes', wn, exc) == 'wish'
    assert S.morphy('quizzes', wn, exc) is None                       # zes -> 'quizz', not in the index
    assert S.morphy('Men', wn, exc) == 'man'
    assert S.morphy('flies', wn, exc) == 'fly'
    assert S.morphy('ox', wn, exc) is None                            # present raw: morphy does not apply
    assert S.morphy('s', wn, exc) is None
    assert S.morphy_candidates('Oxen', exc) == ['ox', 'oxe']          # exceptions first, then the endings in order
    assert S.morphy_candidates('Buses', exc) == ['buse', 'bus']
    assert S.morphy_candidates('s', exc) == []                        # an empty stem is no candidate


def test_strata_synthetic():
    st = S.strata(WN)
    assert st == [(1, ['domestic_dog', 'entity', 'hybrid', 'ice_cream', 'lonely', 'paris']), (2, ['cat', 'dog'])]
    assert S.strata_counts(WN) == (6, 2, 0, 0, 0, 0, 0, 0, 0, 0)


# ================================================================ WordNet 3.0 (counting only)
def test_at_graph_counts_wordnet(wn):
    g = S.at_graph(wn)
    got = S.check_at_graph(g)
    assert got == {'nodes': 74401, 'nodes_sha': S.U_AT_SHA, 'edges': 75850, 'edges_sha': S.E_SHA,
                   'indirect': 587658, 'roots': 12, 'anchors': 74389, 'min_nn': 73996}
    assert S.U_AT_SHA == '9af5a81a2d8725ba431ebfc55fe17b6698a024b8d85f09c01106ae1218eeb117'
    assert S.E_SHA == '74748ad85fcea82e8f282f5ab72cfdfacc292aa4073d58c078d7a311fa2d7dd2'
    assert W.ENTITY in g.roots and g.isolated == 82115 - 74401
    assert len(S.universe_full(wn)) == S.U_FULL_COUNT == 82115


def test_verb_graph_counts_wordnet(wn):
    g = S.at_graph(wn, 'verb')
    assert S.check_at_graph(g) == {'nodes': 13542, 'edges': 13239, 'indirect': 21840, 'roots': 334, 'isolated': 225}


def test_index_strata_wordnet(wn):
    assert S.strata_counts(wn) == (101863, 10257, 2989, 1178, 620, 306, 212, 94, 96, 183)
    st = S.strata(wn)
    assert [len(x) for _, x in st] == list(S.strata_counts(wn))
    assert all(x == sorted(x) for _, x in st)


def test_hit_names_wordnet(wn):
    names = S.hit_names(wn)
    assert len(names) == 82115 and len(set(names.values())) == 82115
    assert names['entity.n.01'] == W.ENTITY == '00001740'
    assert names['physical_entity.n.01'] == '00001930' and names['abstraction.n.06'] == '00002137'
    assert names['dog.n.01'] == '02084071'
    g = S.at_graph(wn)
    nodes = frozenset(g.nodes)
    at_names = [n for n, o in names.items() if o in nodes]
    assert len(S.resolve_names(at_names, wn, g.nodes)) == 74401


def test_morphy_wordnet(wn):
    exc = S.noun_exceptions()
    assert exc['geese'] == ['goose'] and exc['aardwolves'] == ['aardwolf']
    assert S.morphy('geese', wn, exc) == 'goose'
    assert S.morphy('Churches', wn, exc) == 'church'
    assert S.morphy('aardwolves', wn, exc) == 'aardwolf'
    assert S.morphy('dog', wn, exc) is None and S.morphy('flies', wn, exc) is None
    assert S.senses('Dog', S.universe_full(wn), wn)[0] == '02084071'
