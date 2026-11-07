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

Modules (Phase 4, Amendment 10):
    stream          the training stream: hpstep.prng's xoshiro128** and splitmix32 copied line for line into numba
                    kernels (next_u32, random, below, shuffle; init draws, epoch shuffles, negatives), numba pinned
    pystream        the same calls on hpstep.prng.Rng itself (no numba), and replay_states (item 1's replay check)
    embed           L6's closure sets and training instances (items 2 and 9), the initial table, the schedule and the
                    float64 trainer of items 3-5 (no BLAS, sequential sums, the Lorentz guard and step)
    learned         snapping to 2^-32 (item 6), exact ranking of snapped tables through rank._ap_and_ranks, float64
                    ranking (item 10), fractional-tie AP, the rank structure, displacement, bits, distortion (item 11)
    l6              seeds, tuning jobs and the lr choice, controls 1-3, intervals, presence, the decisions of L6 and
                    L4(c), LBENCH/1, the protocol pin and the lr-freeze lookup (items 7-9, 12)
    (../run_claims_phase4.py is the runner: --tune, --write-settings, --measure, --dry, --selftest; numba is
    imported only in its worker processes)

Modules (Stage 2, Amendment 13; in progress, nothing scored yet):
    stage2data      the pins of A13.2 and their store; word readers (pass 1) and gold readers (pass 2) kept apart;
                    the count checks of A13.9; the protocol pin (golden/stage2_protocol_v1.txt)
    senses          N_S, U_full and U_@ (the '@' graph), S_U(w), coverage, pair sets, word types, HiT's names
    wngraph         WordNet's own graph read with no geometry (G_WN, Sym_WN, Dep_WN) and its reported variants
    scores2         points per arm, exact input tuples, certified values, the comparison, tie classes, Phi, Dep°
    stats2          rho on average ranks, the word-level, row and cluster bootstraps, AP, RR, accuracy, F1, bands,
                    the decisions of L12-L15
    hit             HiT's rows and names, the verifier, the closure check, HIT-R and the dry split
    glove           GloVe 6B's text members as exact decimals and the exact cosine key
    embed, stream   (functions added) L14's implicit non-neighbour map, its stream, floors and convergence
    (../run_claims_stage2.py is the runner: --time, --dry, --tune, --write-settings, --decisive and --selftest, with
    blind two-pass scoring; tests/stage2_synth.py is the self-test's synthetic world)

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
