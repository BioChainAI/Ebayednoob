#!/usr/bin/env python3
"""Writes traces/engram.json: exact values the browser core (Phase 3) must reproduce line for line.

    python3 run_traces.py

Quaternions and fractions are strings (they exceed 2^53); 64-bit words are 16 hex digits. The trace uses the
golden session and synthetic dialogue 9000 (outside the registered instances), and the watch layer's E7 and E8
instances on seeds 9100-9104, so a parity run never touches what run_claims.py decides.
"""
import json
import os
import sys
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import engram  # noqa: E402,F401
from engram import address as A, clock as C, dialogue as Dg, orbital as O, recall as RC, ttmpt as T, watch as W  # noqa: E402
from engram.session import Session  # noqa: E402

qs = lambda q: [str(c) for c in q]          # noqa: E731
h64 = lambda v: format(v, '016X')           # noqa: E731


def main():
    g = Session(Dg.golden_session(), coupler='carry')
    d = Session(Dg.synthetic(9000), coupler='carry')
    trace = {'meta': {'note': 'Engram reference traces for the browser core. Golden session and synthetic dialogue 9000.',
                      'membrane_turn': str(C.membrane_turn()), 'L': A.L}}

    word = A.chain_word(g.values[:12])
    trace['addresses'] = {'values': [h64(v) for v in g.values[:12]], 'word': word,
                          'packet_q': [qs(q) for q in g.quats[:12]], 'chain_q': qs(A.chain_quaternion(g.values[:12])),
                          'unfolds': A.unfold(A.chain_quaternion(g.values[:12]), 12) == g.values[:12]}
    trace['schedule'] = g.sched[:9]
    trace['words'] = [{'F': w['F'], 'addr': w['addr'], 'tokens': w['tokens'], 'cells': [h64(c) for c in w['cells']],
                       'tiles': [[O.hex_word(t) for t in tt] for tt in w['tiles']], 'root': w['root'], 'link': w['link']}
                      for w in g.words]
    trace['gauges'] = []
    turns = [C.membrane_turn()] * 3
    for p, gg in list(zip(g.chain.packets, g.gauges))[:30]:
        r = O.readout([Fraction(x) for x in p['tri']], turns)
        trace['gauges'].append({'tri': list(p['tri']), 's': str(gg['s']), 'X': str(gg['X']), 'Y': str(gg['Yc']),
                                'nodes': [qs(n) for n in r['nodes']], 'lock': r['T']['lock'], 'S': str(r['T']['S']),
                                'poly': str(r['T']['poly'])})
    R = next(R for R in d.registers if R['complete'])
    trace['register'] = {'dialogue': 9000, 'r': R['r'], 'tokens': [t for t, _ in R['packets']],
                         'packet_q': qs(R['packet_q']), 'group_q': [qs(q) for q in R['group_q']],
                         'blocks': {str(m): qs(q) for m, q in enumerate(R['block_q']) if q != (1, 0, 0, 0)},
                         'telescopes': C.telescopes(R),
                         'pump_free': C.engagement(d.sched, R['r'], 'free'), 'pump_hold': C.engagement(d.sched, R['r'], 'hold')}
    trace['coupler'] = {'golden': [{'F': e['F'], 'B': qs(e['B']), 'ok': e['ok']} for e in g.coupler.log],
                        'golden_final_q': [qs(q) for q in g.coupler.q],
                        'dialogue_9000_first': [{'F': e['F'], 'ok': e['ok']} for e in d.coupler.log[:10]]}
    S = Dg.store()
    keys = [RC.key(t) for t in S]
    rec = []
    for i in (2, 5, 40, 120, 300):
        for v in RC.parity_variants(S[i]) + (RC.substitutions(S[i], 9000 + i) if RC.letter_count(S[i]) >= 3 else []):
            near, dmin = RC.nearest(RC.key(v), keys)
            rec.append({'store_index': i, 'query': v, 'key': h64(RC.key(v)), 'nearest': near, 'distance': dmin, 'hit': RC.hit(RC.key(v), keys, i)})
    trace['recall'] = rec
    # The watch layer on unregistered seeds (E7's registered seeds are 1000-1049, its dry runs 9000-9049; E8's
    # instances are i = 0-49, so Rng(1000 + i) and corrupt seed 2000 + i stay clear of i = 9100-9104).
    pts2 = W.depth2_points()
    e8 = []
    for i in range(9100, 9105):
        r = W.e8_instance(i, pts=pts2)
        e8.append({'i': i, 'clean_worst': r['clean_worst'], 'clean_bad': r['clean_bad'],
                   'blame': [{'delta': dl, 'pair': list(b['pair']), 'top': list(b['top']) if b['top'] else None, 'bad': b['bad'], 'hit': b['hit']}
                             for dl, b in r['blame'].items()]})
    trace['watch'] = {'e7': [W.e7_instance(L, k, d, s) for L, k, d, s in ((2, 5, 1, 9100), (2, 10, 2, 9101), (3, 5, 1, 9102), (3, 10, 2, 9103))],
                      'e8': e8}
    os.makedirs(os.path.join(HERE, 'traces'), exist_ok=True)
    path = os.path.join(HERE, 'traces', 'engram.json')
    with open(path, 'w') as f:
        json.dump(trace, f, indent=1, sort_keys=True)
    print('wrote', path, os.path.getsize(path), 'bytes')


if __name__ == '__main__':
    main()
