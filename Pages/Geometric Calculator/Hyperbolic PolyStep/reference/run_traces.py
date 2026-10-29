"""Write the seeded traces the browser core (Phase 2) must reproduce: traces/*.json.

    python run_traces.py

Every traced path uses the shared generator (hpstep/prng.py), exact Cayley rotations and rational step lengths, so
corners, snapped states and Helix B's counts are exact rationals and must match exactly. Weights and float
centroids go through exp and sqrt and must match within the stated tolerance. Rationals are written as "p/q".
"""
import json
import os
from fractions import Fraction

import numpy as np

from hpstep import Rng, PolyStepH, StepConfig, TriChannel
from hpstep import hyperbolic as H
from hpstep import exact as X
from hpstep.problems import ThreeColouring

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'traces')
FLOAT_TOL = 1e-12


def q(v):
    v = Fraction(v)
    return f'{v.numerator}/{v.denominator}'


def qv(vs):
    return [q(v) for v in vs]


def prng_trace():
    r = Rng(state=(1, 2, 3, 4))
    s = Rng(42)
    t = Rng(7)
    return {
        'xoshiro128ss_state_1_2_3_4': [r.next_u32() for _ in range(20)],
        'seed_42_state': Rng(42).s,
        'seed_42_u32': [s.next_u32() for _ in range(10)],
        'seed_7_random': [t.random() for _ in range(10)],
        'seed_7_below_1000': [t.below(1000) for _ in range(10)],
        'seed_7_sample_50_10': t.sample(50, 10),
        'seed_7_rational_4': qv([t.rational(4) for _ in range(10)]),
        'seed_7_cayley_3': [qv(row) for row in X.random_rotation(t, 3)],
    }


def geometry_trace():
    rng = Rng(11)
    cases = []
    for _ in range(12):
        d = 2 + rng.below(3)
        p = np.array([0.8 * (2 * rng.random() - 1) / d for _ in range(d)])
        v = np.array([1.5 * (2 * rng.random() - 1) for _ in range(d)])
        x = H.from_poincare(p)
        y = H.exp_at(x, v)
        xq = X.ghost([Fraction(round(c * 2 ** 16), 2 ** 16) for c in p])
        cases.append({'p': p.tolist(), 'v': v.tolist(), 'ghost_float': x.tolist(), 'exp_at': y.tolist(),
                      'dist': float(H.dist(x, y)), 'klein': H.to_klein(y).tolist(),
                      'ghost_exact_of_p16': qv(xq), 'boost_exact': [qv(r) for r in X.boost(xq)]})
    return cases


def step_trace(steps=24):
    """One channel on a small 3-colouring, one vertex per step, exact corners."""
    prob = ThreeColouring(9, 4.4, Rng(1000))
    cfg = StepConfig(epsilon=0.5, step_radius=0.6, block=1, exact=True, rotation='cayley_exact')
    s = PolyStepH(prob, prob.m, 2, cfg, Rng(10))
    st = s.init_state(prob.init_points(Rng(20), 2))
    out = {'instance': {'n': 9, 'c': 4.4, 'seed': 1000, 'classes': prob.classes, 'edges': prob.edges},
           'config': {'epsilon': 0.5, 'step_radius': 0.6, 'block': 1, 'snap_bits': cfg.snap_bits, 'rotation': 'cayley_exact',
                      'K': cfg.cayley_K, 'rng_seed': 10, 'init_seed': 20, 'particles': 2, 'init_spread': 0.05},
           'initial_state': [[qv(y) for y in row] for row in st.Xq], 'steps': []}
    for _ in range(steps):
        info = s.step(st, record=True)
        out['steps'].append({
            'block': info['block'],
            'rotation': [[qv(r) for r in R] for R in info['Rq']],
            'corners': [[qv(c[info['block'][0]]) for c in row] for row in info['exact_corners']],
            'costs': info['C'].astype(int).tolist(),
            'weights': info['W'].tolist(),
            'snap_max': info['snap_max'],
            'state': [[qv(y) for y in row] for row in st.Xq],
            'helix_b': [prob.helix_b(row) for row in st.Xq],
        })
    return out


def channel_trace():
    """Three channels for two registers with the exact register: memory words, steps per channel, pump results."""
    prob = ThreeColouring(9, 4.4, Rng(1001))
    sols, sts = [], []
    for j in range(3):
        cfg = StepConfig(epsilon=0.5, step_radius=0.6, block=1, exact=True, rotation='cayley_exact')
        sol = PolyStepH(prob, prob.m, 2, cfg, Rng(30 + j))
        sts.append(sol.init_state(prob.init_points(Rng(40 + j), 1)))
        sols.append(sol)
    tc = TriChannel(sols, sts, prob, clutch='membrane', exact_register=True).run(frames=1440)
    return {'instance_seed': 1001, 'rng_seeds': [30, 31, 32], 'init_seeds': [40, 41, 42], 'clutch': 'membrane', 'mu': tc.mu,
            'memory': tc.memory, 'registers': tc.registers, 'steps': [st.iteration for st in tc.states],
            'evaluations': tc.evaluations, 'final_states': [[[qv(y) for y in row] for row in st.Xq] for st in tc.states]}


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {'float_tolerance': FLOAT_TOL, 'rationals': 'strings "p/q"',
            'note': 'Exact fields must match exactly; float fields within float_tolerance (relative).'}
    files = {'prng.json': prng_trace(), 'geometry.json': geometry_trace(), 'step_b1.json': step_trace(),
             'channels_b1.json': channel_trace()}
    for name, data in files.items():
        with open(os.path.join(OUT, name), 'w') as fh:
            json.dump({'meta': meta, 'data': data}, fh, indent=1)
        print('wrote', name, os.path.getsize(os.path.join(OUT, name)), 'bytes')


if __name__ == '__main__':
    main()
