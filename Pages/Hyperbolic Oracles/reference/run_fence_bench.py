"""The preregistered runs of the 0.7 Claude fence (PREREGISTRATION.md, Part F).

    python run_fence_bench.py            all cells, 4 processes
    python run_fence_bench.py --quick    3 seeds per cell, for a smoke test

Each run is seeded on its own, so the order and the number of processes do not matter. Writes
results/fence.jsonl (one record per run) and results/fence_decisions.json (cell means and the three decisions).
"""
import json
import multiprocessing as mp
import os
import sys
import time

from hpstep import fence as Fz

HERE = os.path.dirname(os.path.abspath(__file__))
SEEDS = range(60)
BALLS = [(2, 1.0), (2, 4.0), (2, 8.0), (3, 1.0), (3, 3.0), (3, 5.0)]
BROAD = [(2, 4.0), (2, 8.0), (3, 3.0), (3, 5.0)]
FS = [1.75, 2.0, 3.0]
GAUSS = [(2, 0.5), (2, 1.0), (2, 2.0), (3, 0.5), (3, 1.0), (3, 2.0)]
N = 200


def jobs(seeds):
    for dim, R in BALLS:
        for s in seeds:
            yield {'set': 'ball', 'dim': dim, 'kind': 'ball', 'N': N, 'R': R, 'seed': s, 'out': {'k': 0}}
            for f in FS:
                yield {'set': 'planted', 'f': f, 'dim': dim, 'kind': 'ball', 'N': N, 'R': R, 'seed': s,
                       'out': {'k': 10, 'f': f, 'mode': 'shell'}}
    for dim, sg in GAUSS:
        for s in seeds:
            yield {'set': 'gauss', 'dim': dim, 'kind': 'gauss', 'N': N, 'sigma': sg, 'R': 3 * sg, 'seed': s, 'out': {'k': 0}}


def run(cfg):
    t = time.time()
    pts, lab = Fz.generate(cfg)
    r = Fz.fence(pts, cfg['dim'])
    inl = [i for i, l in enumerate(lab) if not l]
    out = [i for i, l in enumerate(lab) if l]
    fl = lambda v, idx: sum(1 for i in idx if v[i] > 0)
    vd = r['tukey_d']['verdict']
    return {
        'cfg': cfg, 'false': fl(r['verdict'], inl), 'caught': fl(r['verdict'], out), 'far_caught': sum(1 for i in out if r['verdict'][i] == 2),
        'dt_false': fl(vd, inl), 'dt_caught': fl(vd, out), 'inliers': len(inl), 'planted': len(out),
        'gap': r['gap'], 'ratio': r['ratio'], 'steps': r['steps'], 'certs': sorted(set(r['cert'])),
        'float_agrees': r['verdict'] == r['verdict_float'], 'seconds': round(time.time() - t, 3),
    }


def key(c):
    return (c['set'], c['dim'], c.get('R') if c['set'] != 'gauss' else c['sigma'], c.get('f'))


def main():
    quick = '--quick' in sys.argv
    todo = list(jobs(range(3) if quick else SEEDS))
    t0 = time.time()
    with mp.Pool(4) as pool:
        res = pool.map(run, todo, chunksize=4)
    os.makedirs(os.path.join(HERE, 'results'), exist_ok=True)
    name = 'fence_quick' if quick else 'fence'
    with open(os.path.join(HERE, 'results', name + '.jsonl'), 'w') as f:
        for r in res:
            f.write(json.dumps(r) + '\n')
    cells = {}
    for r in res:
        c = cells.setdefault(key(r['cfg']), {'runs': 0, 'false': 0, 'inliers': 0, 'caught': 0, 'planted': 0, 'dt_false': 0, 'dt_caught': 0,
                                            'gap': 0.0, 'float_disagree': 0, 'unresolved': 0, 'max_bits': 64})
        c['runs'] += 1
        for k in ('false', 'inliers', 'caught', 'planted', 'dt_false', 'dt_caught'):
            c[k] += r[k]
        c['gap'] += r['gap']
        c['float_disagree'] += not r['float_agrees']
        c['unresolved'] += 'unresolved' in r['certs']
        c['max_bits'] = max([c['max_bits']] + [int(x[5:]) for x in r['certs'] if x.startswith('bits:')])
    table = []
    for k, c in sorted(cells.items(), key=lambda kv: (kv[0][0], kv[0][1], kv[0][2], kv[0][3] or 0)):
        row = {'set': k[0], 'dim': k[1], ('sigma' if k[0] == 'gauss' else 'R'): k[2], 'f': k[3], 'runs': c['runs'],
               'false_rate': c['false'] / c['inliers'], 'dt_false_rate': c['dt_false'] / c['inliers'],
               'detect': c['caught'] / c['planted'] if c['planted'] else None, 'dt_detect': c['dt_caught'] / c['planted'] if c['planted'] else None,
               'gap': c['gap'] / c['runs'], 'float_disagree': c['float_disagree'], 'unresolved': c['unresolved'], 'max_bits': c['max_bits']}
        table.append(row)

    def cell(s, dim, x, f=None):
        return next(r for r in table if r['set'] == s and r['dim'] == dim and r.get('R', r.get('sigma')) == x and r['f'] == f)

    def decide(oks):
        if all(oks):
            return 'supported'
        if sum(not o for o in oks) > len(oks) / 2:
            return 'refuted'
        return 'mixed'

    A = [cell('ball', d, R)['false_rate'] <= 0.007 for d, R in BALLS]
    B = [cell('planted', d, R, 2.0)['detect'] >= 0.9 and cell('planted', d, R, 2.0)['dt_detect'] <= 0.1 for d, R in BROAD]
    Cc = [cell('gauss', d, s)['false_rate'] > 0.02 and cell('gauss', d, s)['false_rate'] > cell('gauss', d, s)['dt_false_rate'] for d, s in GAUSS]
    dec = {'CF-A': {'status': decide(A), 'cells': A}, 'CF-B': {'status': decide(B), 'cells': B}, 'CF-C': {'status': decide(Cc), 'cells': Cc}}
    with open(os.path.join(HERE, 'results', name + '_decisions.json'), 'w') as f:
        json.dump({'decisions': dec, 'table': table, 'runs': len(res), 'seconds': round(time.time() - t0, 1)}, f, indent=1)
    for r in table:
        print(r)
    print(json.dumps(dec))
    print(f'{len(res)} runs in {time.time() - t0:.0f} s')


if __name__ == '__main__':
    main()
