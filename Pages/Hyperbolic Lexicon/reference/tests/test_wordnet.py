"""The Python reader against the Node pin: every count and hash in golden/wordnet_v1.meta.json."""
import hashlib
import json
import os

from lexicon import GOLDEN, wordnet as W

META = json.load(open(os.path.join(GOLDEN, 'wordnet_v1.meta.json')))
sha = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()  # noqa: E731


def test_synset_counts(wn):
    got = {pos: len(wn['synsets'][pos]) for pos in W.POS}
    assert got == {k: META['synsets'][k] for k in W.POS}
    assert sum(1 for s in wn['synsets']['adj'].values() if s.ss_type == 's') == META['synsets']['adjSatellites']


def test_noun_forest_and_closure(wn):
    nouns = wn['synsets']['noun']
    parent, children, roots = W.spanning_forest(nouns)
    m = META['nouns']
    assert roots == m['spanningRoots'] == [W.ENTITY]
    degrees = [len(c) for c in children.values()]
    assert len(degrees) == m['internalNodes']
    assert max(degrees) == m['maxChildren']
    assert sum(d == 1 for d in degrees) == m['nodesWithOneChild']
    assert sum(d > 5 for d in degrees) == m['nodesWithMoreThan5Children']
    assert sum(d > 25 for d in degrees) == m['nodesWithMoreThan25Children']
    anc = W.closure(nouns)
    assert sum(len(a) for a in anc.values()) == m['closureEdges']
    assert sum(len(W.closure_parents(s)) > 1 for s in nouns.values()) == m['nodesWithSeveralParents']

    def depth(o):
        d = 0
        while parent[o] is not None:
            o, d = parent[o], d + 1
        return d
    assert max(depth(o) for o in nouns) == m['maxDepth']


def test_mammal_sets(wn):
    clos, span = W.mammal_sets(wn)
    mm = META['mammal']
    assert len(clos) == mm['closureNodes'] and sha('\n'.join(clos)) == mm['closureSha256']
    assert len(span) == mm['spanningNodes'] and sha('\n'.join(span)) == mm['spanningSha256']
    anc = W.closure(wn['synsets']['noun'])
    cs = set(clos)
    assert sum(len(anc[o] & cs) for o in clos) == mm['closureEdges']


def test_verbs(wn):
    _, children, roots = W.spanning_forest(wn['synsets']['verb'])
    assert len(roots) == META['verbs']['spanningRoots'] and len(children) == META['verbs']['internalNodes']


def test_lemma_types_and_c0(wn):
    types = W.lemma_types(wn)
    assert len(types) == META['lemmaTypes']['count']
    assert sha('\n'.join(types)) == META['lemmaTypes']['sha256']
    shards = W.c0_shards(wn)
    assert [sha(s) for s in shards] == META['c0']['shardSha256']
    assert len(W.glosses(wn)) == 117659
