"""Write traces/fence.json, the trace the browser's fence.js must reproduce bit for bit.

    python run_traces_fence.py

Rationals are written "p/q"; floats as Python's repr, which JavaScript reads back to the same double. The
centre's integer vector S and the exact values w_i = sinh^2 d_i run to thousands of digits, so they are written
as SHA-256 hashes of their canonical text.
"""
import hashlib
import json
import os
from fractions import Fraction as F

from hpstep import Rng
from hpstep import fence as Fz

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'traces', 'fence.json')

CASES = [
    {'name': 'plane ball', 'dim': 2, 'kind': 'ball', 'N': 40, 'R': 4.0, 'seed': 1, 'out': {'k': 3, 'f': 3.0, 'mode': 'shell'}},
    {'name': 'plane gauss', 'dim': 2, 'kind': 'gauss', 'N': 40, 'sigma': 1.0, 'R': 3.0, 'seed': 2, 'out': {'k': 2, 'f': 4.0, 'mode': 'shell'}},
    {'name': 'space ball', 'dim': 3, 'kind': 'ball', 'N': 40, 'R': 3.0, 'seed': 3, 'out': {'k': 3, 'f': 2.5, 'mode': 'shell'}},
    {'name': 'space gauss cluster', 'dim': 3, 'kind': 'gauss', 'N': 36, 'sigma': 0.8, 'R': 2.4, 'seed': 4, 'out': {'k': 4, 'f': 6.0, 'mode': 'cluster'}},
    {'name': 'norm-5 tree', 'dim': 3, 'kind': 'tree', 'L': 2, 'seed': 5, 'out': {'k': 3, 'mode': 'deep', 'depth': 1}},
    {'name': 'small plane ball', 'dim': 2, 'kind': 'ball', 'N': 30, 'R': 0.8, 'seed': 6, 'out': {'k': 0}},
    {'name': 'tight plane cloud', 'dim': 2, 'kind': 'gauss', 'N': 24, 'sigma': 0.02, 'R': 0.06, 'seed': 8, 'out': {'k': 2, 'f': 5.0, 'mode': 'shell'}},
    {'name': 'space ball, medoid centre', 'dim': 3, 'kind': 'ball', 'N': 40, 'R': 3.0, 'seed': 3, 'out': {'k': 3, 'f': 2.5, 'mode': 'shell'}, 'centre': 'medoid'},
]


def q(v):
    return Fz.qs(v)


def sha(items):
    return hashlib.sha256('|'.join(items).encode()).hexdigest()


def result_record(r):
    return {
        'medoid': r['medoid'], 'sums': [repr(v) for v in r['sums']], 'lam': [repr(v) for v in r['lam']], 'steps': r['steps'],
        'S_hash': sha([str(v) for v in r['S']]), 'w_hash': sha([q(v) for v in r['w']]),
        'order': r['order'], 'q': list(r['q']), 'verdict': r['verdict'], 'cert': r['cert'], 'verdict_float': r['verdict_float'],
        'mass': [repr(v) for v in r['mass']], 'dist': [repr(v) for v in r['dist']],
        'm': [repr(r[k]) for k in ('m1', 'm2', 'm3', 'mF', 'mG')], 'r': [repr(r[k]) for k in ('rF', 'rG', 'gap', 'gapG', 'ratio')],
        'tukey_d': {'F': repr(r['tukey_d']['F']), 'G': repr(r['tukey_d']['G']), 'verdict': r['tukey_d']['verdict']},
    }


def main():
    trace = {'about': __doc__.strip().splitlines()[0], 'data_bits': Fz.DATA_BITS}
    # ---- the portable kernels
    rng = Rng(2026)
    xs = [0.0, 1e-300, 1e-12, 0.3, 0.999, 1.0, 1.7, 3.0, 12.5, 40.0] + [40 * rng.random() - 5 for _ in range(30)]
    pos = [v for v in xs if v > 0]
    kern = {
        'pexp': [[repr(x), repr(Fz.pexp(x))] for x in xs + [-x for x in xs]],
        'pexpm1': [[repr(x), repr(Fz.pexpm1(x))] for x in xs + [-x for x in xs]],
        'plog': [[repr(x), repr(Fz.plog(x))] for x in pos + [1 / x for x in pos]],
        'plog1p': [[repr(x), repr(Fz.plog1p(x))] for x in xs if x > -1],
        'pacosh1': [[repr(x), repr(Fz.pacosh1(x))] for x in pos],
        'psinhmx': [[repr(x), repr(Fz.psinhmx(x))] for x in pos if x < 300],
        'pcoshm1': [[repr(x), repr(Fz.pcoshm1(x))] for x in pos if x < 300],
        'ptanh_half': [[repr(x), repr(Fz.ptanh_half(x))] for x in pos],
        'distance_of_mass2': [[repr(x), repr(Fz.distance_of_mass(x, 2))] for x in pos],
        'distance_of_mass3': [[repr(x), repr(Fz.distance_of_mass(x, 3))] for x in pos],
        'rho_of_mass2': [[repr(x), repr(Fz.rho_of_mass(x, 2))] for x in pos],
        'rho_of_mass3': [[repr(x), repr(Fz.rho_of_mass(x, 3))] for x in pos],
    }
    trace['kernels'] = kern
    # ---- the certified mass
    A2s = [F(1), F(25, 16), F(625, 49), F(10 ** 12 + 7, 10 ** 6), F(3 ** 40, 2 ** 60) + 1] + \
        [F(rng.randint(1, 10 ** 9), rng.randint(1, 10 ** 4)) + 1 for _ in range(8)]
    trace['mass_fixed'] = [{'A2': q(A), 'P': P, 'M': str(Fz.mass_fixed(A, P)[0]), 'err': str(Fz.mass_fixed(A, P)[1])}
                           for A in A2s for P in (64, 128)]
    trace['certify'] = []
    for _ in range(12):
        a1 = 1 + F(rng.randint(1, 400), 100)
        a3 = a1 + F(rng.randint(1, 400), 100)
        ai = a3 + F(rng.randint(1, 600), 100)
        coefs = [2, 3, -5] if rng.below(2) else [1, 3, -4]
        s, bits = Fz.certify_sign(coefs, [ai * ai, a1 * a1, a3 * a3])
        trace['certify'].append({'coefs': coefs, 'A2': [q(ai * ai), q(a1 * a1), q(a3 * a3)], 'sign': s, 'bits': bits})
    # ---- exact ties: a radius exactly on a fence is inside it (strict inequalities)
    trace['ties'] = []
    for _ in range(10):
        b1 = 1 + F(rng.randint(1, 900), rng.randint(1, 300))
        b3 = b1 + F(rng.randint(1, 900), rng.randint(1, 300))
        for b in ((5 * b3 - 3 * b1) / 2, 4 * b3 - 3 * b1):
            for e in (F(0), F(1, 2 ** 70), -F(1, 2 ** 70)):
                trace['ties'].append({'b': q(b + e), 'b1': q(b1), 'b3': q(b3), 'v': Fz.decide_h2(b + e, b1, b3)})
    # ---- the fence on datasets
    trace['cases'] = []
    for cfg in CASES:
        pts, lab = Fz.generate(cfg)
        r = Fz.fence(pts, cfg['dim'], centre=cfg.get('centre', 'median'))
        rec = {'cfg': {k: v for k, v in cfg.items() if k != 'name'}, 'name': cfg['name'],
               'points': [[q(v) for v in x] for x in pts], 'labels': lab}
        rec.update(result_record(r))
        trace['cases'].append(rec)
        print(f"{cfg['name']:28s} N={len(pts):3d} steps={r['steps']:3d} flagged={sum(v > 0 for v in r['verdict'])} certs={sorted(set(r['cert']))}")
    # ---- CF2 on the trace: the first case moved by a rational isometry
    cfg = CASES[0]
    pts, lab = Fz.generate(cfg)
    L = Fz.random_isometry(Rng(77), 2)
    moved = Fz.transform(L, pts)
    r = Fz.fence(moved, 2)
    rec = {'name': 'plane ball, moved by a rational isometry', 'cfg': None, 'L': [[q(v) for v in row] for row in L],
           'points': [[q(v) for v in x] for x in moved], 'labels': lab}
    rec.update(result_record(r))
    trace['isometry'] = rec
    # ---- the guard
    gpts, _ = Fz.generate({'dim': 2, 'kind': 'ball', 'N': 16, 'R': 3.0, 'seed': 12})
    D = Fz.distance_matrix(gpts)
    E, pairs = Fz.corrupt(D, 2, 2.5, seed=5)
    g0, g1 = Fz.guard_check(D), Fz.guard_check(E)
    sq = Fz.distance_matrix(Fz.ideal_square(20.0))
    trace['guard'] = {
        'points': [[q(v) for v in x] for x in gpts], 'D': [[repr(v) for v in row] for row in D], 'pairs': pairs,
        'clean': {'worst': repr(g0['worst']), 'quad': g0['quad'], 'bad': g0['bad'], 'top': g0['top']},
        'corrupt': {'worst': repr(g1['worst']), 'quad': g1['quad'], 'bad': g1['bad'], 'top': g1['top']},
        'square': repr(Fz.defect(sq, 0, 1, 2, 3)), 'sample': Fz.guard_check(E, sample=500, seed=9)['bad'],
    }
    print('guard: clean', g0['bad'], 'corrupted', g1['bad'], 'top', g1['top'][:2], 'pairs', pairs)
    with open(OUT, 'w') as f:
        json.dump(trace, f, separators=(',', ':'))
    print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')


if __name__ == '__main__':
    main()
