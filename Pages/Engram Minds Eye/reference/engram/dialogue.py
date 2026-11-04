"""The dialogue store, the golden session and the synthetic dialogues of the preregistration.

The store is the 477 dialogue tokens of the golden corpus, in their order there. A synthetic dialogue (seeds
1000-1019) has 30 turns, alternating human and STRIX, starting with STRIX; a turn is 3 to 12 tokens, its length
and tokens drawn uniformly from the store [DEFINITION of the draw order: the length first, 3 + below(10), then
each token, below(477), all from one hpstep Rng(seed)].
"""
import json

from hpstep.prng import Rng

from . import GOLDEN
from .ttmpt import tokenize

_golden = None


def golden():
    global _golden
    if _golden is None:
        with open(GOLDEN, encoding='utf-8') as f:
            _golden = json.load(f)
    return _golden


def store():
    return [e['input'] for e in golden()['sets']['dialogue']]


def golden_session():
    """The fresh session of the golden chain: the STRIX introduction, then one human question."""
    return [(t['source'], tokenize(t['text'])) for t in golden()['packet_chain']['turns']]


def synthetic(seed, turns=30):
    rng, S = Rng(seed), store()
    out = []
    for k in range(turns):
        n = 3 + rng.below(10)
        out.append(('strix' if k % 2 == 0 else 'human', [S[rng.below(len(S))] for _ in range(n)]))
    return out


SYNTHETIC_SEEDS = list(range(1000, 1020))
