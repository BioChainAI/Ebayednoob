"""Write the version 2 traces the browser must reproduce: traces/decode3d.json for the 3D decoder (decoder3d.js)
and traces/twin3d.json for the frames, the coupler and the twin system (twin3d.js).

    python run_traces3d.py

Version 1's traces (run_traces.py) are not touched. Every field here is exact: decoded answers are integers,
rationals are written "p/q", and floats are written as Python's repr, which JavaScript reads back to the same
double.
"""
import json
import os
from fractions import Fraction as F

import numpy as np

from hpstep import Rng
from hpstep import decode3d as D
from hpstep import exact as X

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'traces', 'decode3d.json')


def q(v):
    v = F(v)
    return f'{v.numerator}/{v.denominator}'


def rational_point(rng, K=2 ** 12, r=0.9):
    while True:
        p = [F(rng.randint(-K, K), K) for _ in range(3)]
        if sum(x * x for x in p) < r * r:
            return X.ghost(p)


def near_ties(rng, n):
    """The same family of boundary cases as the tests, from the shared generator."""
    import math
    out = []
    for _ in range(n):
        x = (2 * rng.random() - 1) * 10 ** rng.randint(-300, 300)
        kind = rng.below(6)
        eps = math.ulp(x) * rng.randint(-3, 3)
        v = ([x, x + eps, (2 * rng.random() - 1) * abs(x)] if kind == 0 else [x, -x + eps, x] if kind == 1 else
             [x, x, x] if kind == 2 else [0.0, -0.0, x] if kind == 3 else
             [x, (2 * rng.random() - 1) * 1e-300, -x - eps] if kind == 4 else [2 * rng.random() - 1 for _ in range(3)])
        perm = [0, 1, 2]
        rng.shuffle(perm)
        out.append([v[i] for i in perm])
    return out


def main():
    rng = Rng(3003)
    anchors = {}
    for name, A in D.ANCHORS.items():
        V = near_ties(rng, 120)
        pts = [rational_point(rng) for _ in range(40)]
        anchors[name] = {
            'anchors': [list(a) for a in A],
            'float_cases': [{'v': [repr(c) for c in v], 'k': D.decode_exact([F(c) for c in v], A)} for v in V],
            'exact_cases': [{'y': [q(c) for c in y], 'k': D.decode_exact(y, A)} for y in pts],
            'group': [{'R': [list(r) for r in R], 'sigma': list(s)} for R, s in D.symmetry_group(A)],
        }
    emb = D.TreeEmbedding3D()
    tree = {'t': q(emb.t), 'cosh': q(emb.cosh), 'sinh': q(emb.sinh), 'frames': [], 'decodes': [], 'anchored': []}
    for w in [[], [0], [5], [2, 4], [1, 3, 0], [4, 2, 5, 1]]:
        tree['frames'].append({'word': w, 'frame': [[q(c) for c in row] for row in emb.frame_exact(w)]})
    for _ in range(40):
        L = 1 + rng.below(9)
        w = D.TreeAddress3D.random_target(rng, L)
        y = emb.point_exact(w)
        tree['decodes'].append({'word': w, 'L': L, 'point': [q(c) for c in y], 'decoded': emb.decode_exact(y, L)})
    for _ in range(30):
        L = 1 + rng.below(8)
        w = D.TreeAddress3D.random_target(rng, L)
        k = max(0, L - 2)
        local = np.eye(4)
        for i in range(k, L):
            local = local @ emb.step[D.slot_direction(w[:i], w[i])]
        y = local[:, 0]
        tree['anchored'].append({'word': w, 'L': L, 'anchor': w[:k], 'local': [repr(float(c)) for c in y],
                                 'decoded': emb.decode(y, L, w[:k])})
    b1 = D.ThreeColouring3D(30, 4.4, Rng(31))
    b2 = D.MaxSat3D(30, seed=32, source='xoshiro')
    states = []
    for _ in range(6):
        p1 = b1.init_points(rng, 1, spread=0.9)[0]
        p2 = b2.init_points(rng, 1, spread=0.9)[0]
        states.append({'b1': [[repr(float(c)) for c in y] for y in p1], 'b1_conflicts': b1.helix_b(p1),
                       'b2': [[repr(float(c)) for c in y] for y in p2], 'b2_unsat': b2.helix_b(p2)})
    problems = {'b1': {'n': 30, 'c': 4.4, 'seed': 31, 'edges': [list(e) for e in b1.edges]},
                'b2': {'n': 30, 'seed': 32, 'source': 'xoshiro', 'lits': b2.lits.tolist()}, 'states': states}
    meta = {'note': 'Version 2 phase A: every field is exact. Floats are Python repr strings; rationals are "p/q".'}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as fh:
        json.dump({'meta': meta, 'data': {'anchors': anchors, 'tree': tree, 'problems': problems}}, fh, indent=1)
    print('wrote', OUT, os.path.getsize(OUT), 'bytes')


def twin_trace():
    """Exact transport on rational point pairs, then the twin system on the exact track, in carry and steer mode,
    for one full register: both structures' memory words and pumps, the coupler's words, every frame and state."""
    from hpstep import PolyStepH, StepConfig, TriChannel
    from hpstep import frames3d as Fr
    from hpstep import twin3d as T
    rng = Rng(4004)
    pairs = []
    for _ in range(30):
        x, y = rational_point(rng, K=1024), rational_point(rng, K=1024)
        pairs.append({'x': [q(c) for c in x], 'y': [q(c) for c in y], 'twist': [[q(c) for c in row] for row in Fr.twist(x, y, True)],
                      'quat': [str(c) for c in Fr.twist_quat(x, y, True)]})

    def structure(seed):
        prob = D.ThreeColouring3D(9, 4.4, Rng(seed))
        sols, sts = [], []
        for j in range(3):
            cfg = StepConfig(epsilon=0.5, step_radius=0.6, block=1, exact=True, rotation='cayley_exact')
            sol = PolyStepH(prob, prob.m, prob.d, cfg, Rng(seed * 10 + j))
            sts.append(sol.init_state(prob.init_points(Rng(seed * 10 + 5 + j), 1)))
            sols.append(sol)
        return TriChannel(sols, sts, prob, clutch='membrane', mu=0.3, exact_register=True)
    runs = {}
    for mode in ('carry', 'steer'):
        tw = T.TwinSystem(structure(11), structure(12), mode=mode, exact=True).run(720)
        runs[mode] = {
            'structures': [{'memory': tc.memory, 'registers': tc.registers, 'evaluations': tc.evaluations,
                            'states': [[[q(c) for c in y] for y in row] for st in tc.states for row in st.Xq]} for tc in tw.tcs],
            'coupler': {'memory': [{k: v for k, v in w.items() if k != 'worst'} for w in tw.coupler.memory],
                        'issued': tw.coupler.issued, 'angle': tw.coupler.angle,
                        'frames': [[[[str(c) for c in f] for f in row] for ch in side for row in ch] for side in tw.coupler.q]}}
    return {'pairs': pairs, 'config': {'n': 9, 'c': 4.4, 'seeds': [11, 12], 'frames': 720, 'P': 1, 'block': 1,
                                       'epsilon': 0.5, 'step_radius': 0.6, 'mu': 0.3, 'clutch': 'membrane'}, 'runs': runs}


if __name__ == '__main__':
    main()
    out = os.path.join(os.path.dirname(OUT), 'twin3d.json')
    with open(out, 'w') as fh:
        json.dump({'meta': {'note': 'Version 2 phases B-D: exact. Rationals are "p/q"; quaternions are coprime integers, written as strings (they exceed 2^53).'},
                   'data': twin_trace()}, fh, indent=1)
    print('wrote', out, os.path.getsize(out), 'bytes')
