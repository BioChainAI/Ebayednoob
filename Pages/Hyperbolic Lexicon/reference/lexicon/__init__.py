"""Hyperbolic Lexicon: the Python reference (Phase 1). It decides the exact claims in ../../PREREGISTRATION.md
(with Amendment 1); the browser core must reproduce its traces line for line.

Modules (Phase 1):
    wordnet         the reader of golden/wordnet_v1.cjs in Python: synsets, the spanning forest, the closure,
                    the mammal sets, the lemma types, C0 and the gloss strings (L1 instance (a))
    unicode_tables  the pinned Unicode 15.1 table (golden/unicode_15_1_v1.json, from golden/make_unicode_v1.py)
    normalise       N_B (Amendment 1, item 1) with byte spans, failing closed; N1, the registered fallback
    wordpiece       greedy longest-match-first WordPiece, the id stream, the V0 "lex0" trainer (item 3)
    address         the L3 rule and its controls, the verb forest, the bijective 59/64-bit id codec, map A (item 4)
    h3tree          exact H^3 points of a whole forest, frame by frame, as integer vectors over 7^n
    h2exact         the exact H^2 tree of D3 (t = 11/13): points, frames and exact greedy decoding
    flat            the curvature-0 arms F and F* in R^2 and R^3 (item 7)
    rank            exact ranking keys, pessimistic AP, MAP, mean rank, rank lists, distortion, the bootstrap
    lps             the LPS overlay X(5, q) of SHD-CCP RFC 03 (L7)

Hyperbolic Oracles' exact modules (hpstep: prng, problems, decode3d) and Engram Mind's Eye's (engram: ttmpt,
address) are imported in place, unchanged, from their reference folders.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REFERENCE = os.path.dirname(HERE)                                   # Pages/Hyperbolic Lexicon/reference
SYSTEM = os.path.dirname(REFERENCE)                                 # Pages/Hyperbolic Lexicon
PAGES = os.path.dirname(SYSTEM)
REPO = os.path.dirname(PAGES)
GOLDEN = os.path.join(REFERENCE, 'golden')
HPSTEP_REFERENCE = os.path.join(PAGES, 'Hyperbolic Oracles', 'reference')
ENGRAM_REFERENCE = os.path.join(PAGES, 'Engram Minds Eye', 'reference')
CACHE = os.environ.get('HL_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'hyperbolic-lexicon')

for _p in (ENGRAM_REFERENCE, HPSTEP_REFERENCE):
    if _p not in sys.path:
        sys.path.insert(0, _p)
