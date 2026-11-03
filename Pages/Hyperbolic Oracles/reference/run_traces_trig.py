"""Write traces/rational_trig.json: the keypad kernel, rotations, compositions and ghost quadrances the browser's
rational_trig.js must reproduce exactly.    python run_traces_trig.py"""
import json
import os
from fractions import Fraction as F

from hpstep import Rng
from hpstep import rational_trig as T

q = lambda v: f'{F(v).numerator}/{F(v).denominator}'
rng = Rng(2026)
rq = lambda K=40: F(rng.randint(-K, K), rng.randint(1, K))
angles = [F(1), F(10), F(-5, 2), F(7, 3), F(100), F(0)] + [F(rng.randint(-50000, 50000), 1000) for _ in range(10)]
out = {'keypad': [{'a': q(a), 'sin': q(s), 'cos': q(c), 't': q(t)} for a in angles for s, c, t in [T.keypad_trig(a)]]}
us = [[rq() for _ in range(3)] for _ in range(8)]
out['rot'] = [{'u': [q(v) for v in u], 'M': [[q(v) for v in row] for row in T.rot_matrix(u)]} for u in us]
pairs = [([rq(9) for _ in range(3)], [rq(9) for _ in range(3)]) for _ in range(8)]
out['compose'] = [{'a': [q(v) for v in a], 'b': [q(v) for v in b], 'g': [q(v) for v in T.compose(a, b)]} for a, b in pairs]
gq = []
while len(gq) < 8:
    p, r = [rq(400) / 8 for _ in range(3)], [rq(400) / 8 for _ in range(3)]
    if T.dot(p, p) < 1 and T.dot(r, r) < 1:
        gq.append({'p': [q(v) for v in p], 'r': [q(v) for v in r], 'Qh': q(T.ghost_quadrance(p, r))})
out['ghost'] = gq
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'traces', 'rational_trig.json')
with open(path, 'w') as f:
    json.dump(out, f, separators=(',', ':'))
print('wrote', path, len(out['keypad']), 'angles')
