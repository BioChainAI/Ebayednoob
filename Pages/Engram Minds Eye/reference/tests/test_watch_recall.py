"""The watch layer (claims E7, E8) and Hamming recall (claim E9): mechanics on small instances."""
import math

from engram import dialogue as Dg
from engram import recall as R
from engram import watch as W


def test_e7_settlement_on_both_depths():
    for L, k, d, seed in [(2, 5, 2, 9000), (3, 5, 1, 9001)]:
        r = W.e7_instance(L, k, d, seed)
        assert r['settle_fail'] == 0
        assert all(f['cleared'] != f['misplaced'] for f in r['flags'])


def test_e7_tree_words_match_the_generator():
    from hpstep import fence as Fz
    pts, _ = Fz.generate({'dim': 3, 'kind': 'tree', 'L': 2, 'seed': 0})
    words = W.tree_words(2)
    assert [W.emb().point_exact(w) for w in words] == pts


def test_e8_clean_bound_and_blame():
    r = W.e8_instance(8000)              # seeds 9000 and 10000: outside the registered instances
    assert r['clean_bad'] == 0 and r['clean_worst'] <= math.log(2) + 1e-9
    assert r['blame'][3.0]['hit']


def test_e9a_variants_keep_the_key():
    S = Dg.store()
    for t in S[:60]:
        k = R.key(t)
        for v in R.parity_variants(t):
            assert R.key(v) == k


def test_e9b_substitution_moves_the_key():
    S = Dg.store()
    for i, t in enumerate(S[:60]):
        if R.letter_count(t) >= 3:
            for v in R.substitutions(t, 1000 + i):
                assert v != t and len(v) == len(t) and R.key(v) != R.key(t)


def test_hits_and_ties():
    keys = [0b1010, 0b1010, 0b0110]
    assert R.hit(0b1010, keys, 0) == 0.5 and R.hit(0b1010, keys, 2) == 0.0 and R.hit(0b0110, keys, 2) == 1.0
    sh = R.shuffled(list(range(10)))
    assert sorted(sh) == list(range(10)) and sh != list(range(10))
