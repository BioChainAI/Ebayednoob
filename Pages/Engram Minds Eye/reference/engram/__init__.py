"""Engram Mind's Eye: the Python reference (Phase 2). It decides the claims in ../../PREREGISTRATION.md.

Modules:
    ttmpt     engram/1, the TTMPT core of Owl Academy's Engram_Mind_Eye.html (E1)
    orbital   the orbital pages' exact code, ported line by line from scripts/geometric-build/orbital_core.js
    address   the 28-letter norm-5 address and the chain quaternion (E2)
    memory    the GF(2) triple-quad word, its Form 5 tiles, the Lemma 15 Merkle chain, locate and repair (E3)
    clock     the zero-point clock, registers, blocks and groups, the engagement pump (E4)
    coupler   the mirror-law coupler between the human and STRIX streams (E5)
    session   a dialogue run end to end: packets, addresses, clock, memory words, gauges, registers, coupler
    dialogue  the dialogue store and the synthetic dialogues of the preregistration
    stats     the bootstrap of the Hyperbolic PolyStep preregistration

Hyperbolic PolyStep's exact modules (hpstep: prng, problems, decode3d, frames3d, fence) are imported in place from
../../Hyperbolic Oracles/reference, which works without torch since its __init__ became lazy (decision D7).
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REFERENCE = os.path.dirname(HERE)                                   # Pages/Engram Minds Eye/reference
SYSTEM = os.path.dirname(REFERENCE)                                 # Pages/Engram Minds Eye
REPO = os.path.dirname(os.path.dirname(SYSTEM))                     # repository root
HPSTEP_REFERENCE = os.path.join(os.path.dirname(SYSTEM), 'Hyperbolic Oracles', 'reference')
ORBITAL_CORE = os.path.join(REPO, 'scripts', 'geometric-build', 'orbital_core.js')
GOLDEN = os.path.join(REFERENCE, 'golden', 'engram_v1.json')

if HPSTEP_REFERENCE not in sys.path:
    sys.path.insert(0, HPSTEP_REFERENCE)
