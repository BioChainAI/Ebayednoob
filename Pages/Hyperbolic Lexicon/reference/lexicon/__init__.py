"""Hyperbolic Lexicon: the Python reference (Phase 1). It decides the exact claims in ../../PREREGISTRATION.md
(with Amendments 1 and 2); the browser core must reproduce its traces line for line.

Modules (Phase 1):
    wordnet         the reader of golden/wordnet_v1.cjs in Python: synsets, the spanning forest, the closure,
                    the mammal sets, the lemma types, C0 and the gloss strings (L1 instance (a))
    unicode_tables  the pinned Unicode 15.1 table (golden/unicode_15_1_v1.json, from golden/make_unicode_v1.py)
    normalise       N_B (Amendment 1, item 1) with byte spans, failing closed; N1, the registered fallback
    wordpiece       greedy longest-match-first WordPiece, the id stream, the V0 "lex0" trainer (item 3)
    l1              L1's instance loaders (a)-(d), the dry-run and trace strings, and (d)'s pool (item 2;
                    loaders only, pinned by golden/l1_instances_v1.meta.json)
    address         the L3 rule and its controls, the verb forest, the bijective 59/64-bit id codec, map A (item 4)
    h3tree          exact H^3 points of a whole forest, frame by frame, as integer vectors over 7^n
    h2exact         the exact H^2 tree of D3 (t = 11/13): points, frames and exact greedy decoding
    flat            the curvature-0 arms F and F* in R^2 and R^3 (item 7)
    rank            exact ranking keys, pessimistic AP, MAP, mean rank, rank lists, distortion, the bootstrap
    lps             the LPS overlay X(5, q) of SHD-CCP RFC 03 (L7)
    phase2          Phase 2 (Amendment 4): L1's records and digests, S6's R(s) from the table (L1 control 1), the
                    Hugging Face wrapper; L4(b)'s float keys, inversions and control 2 (run_claims.py --phase2)

Modules (Phase 3, Amendment 7):
    chain           Owl Academy's shdccp/2 biochain grown synchronously (L8): the codec, packets (and BioChain-AI's
                    0x80 normalisation), leaves, the shdccp/2 root, the float weaves with V8's Math.hypot and exact
                    toFixed, the exact norm-5 weave, residual aliases, the synthetic generator, the dry-run shards
    records         LVOCAB/1 (golden/nb_spec_v1.txt pinned), LADDR/1 with addrTableRoot over map A, LPREP/1 (Tier S
                    and P), LCORPUS/1, LGROW/1
    manifest        RFC 6962 trees, inclusion and consistency proofs with RFC 9162 verification (L9)
    attest          ATTEST/1 with `cryptography`: P1363 <-> DER, the registry snapshot, BioChain's identity port (L10)
    verify          packages, the hardened verifier and the T1-T9 tamper helpers (L10, L11)

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
