"""The preregistered benchmarks (../PREREGISTRATION.md): runners, tuning and the decision rule.

    python run_bench.py smoke                    # every benchmark and method once, tiny sizes: checks the code runs
    python run_bench.py tune B1                  # 24 tuning runs per method on seeds 9000-9023 -> settings.json
    python run_bench.py run B1 [--seeds 0 1 2]   # the measured runs -> results/B1.jsonl
    python run_bench.py decide B1                # the paired bootstrap decision for each claim and cell

Phase 1 delivers this code and its smoke run. The tuning and measured runs, and the decisions they lead to, are
Phase 4. A smoke result is labelled as such and is never evidence for or against a claim.

Methods:
  hyper3        three channels of 4 particles on the zero-point clock, hyperbolic step
  flat3         the same at curvature 0 (the primary baseline: it differs only in curvature)
  hyper1        one channel of 12 particles (the C3 ablation)
  hyper3_free   three channels with the membrane off (the membrane ablation)
  polystep      polystep 1.1.1 itself on the flattened Euclidean problem (PolyStep; PolyStepOptimizer for B4)
  random        random search at the same budget
"""
import argparse
import json
import math
import os
import random as pyrandom
import sys
import time

import numpy as np
import torch

torch.set_num_threads(1)   # polystep advises one thread for many small forwards

from hpstep import Rng, PolyStepH, StepConfig, TriChannel
from hpstep import hyperbolic as H
from hpstep import problems as PB

HERE = os.path.dirname(os.path.abspath(__file__))
METHODS = ['hyper3', 'flat3', 'hyper1', 'hyper3_free', 'polystep', 'random']

# Provisional settings, used until `tune` writes settings.json. They are not tuned.
DEFAULTS = {
    'B1': {'epsilon': 0.5, 'step_radius': 0.6, 'block': 8, 'mu': 0.3},
    'B2': {'epsilon': 0.05, 'step_radius': 0.5, 'block': 4, 'mu': 0.3},
    'B3': {'epsilon': 0.5, 'step_radius': 2.0, 'block': None, 'mu': 0.3},
    'B4': {'epsilon': 0.05, 'step_radius': 0.3, 'block': 6, 'mu': 0.3},
}
SEARCH = {'epsilon': (0.01, 2.0), 'step_radius': (0.05, 3.0), 'mu': (0.0, 0.8)}


def settings_for(bench, method):
    path = os.path.join(HERE, 'settings.json')
    if os.path.exists(path):
        with open(path) as fh:
            tuned = json.load(fh)
        if bench in tuned and method in tuned[bench]:
            return dict(DEFAULTS[bench], **tuned[bench][method])
    return dict(DEFAULTS[bench])


# ---------------------------------------------------------------- instances
def make_problem(bench, cell, inst_seed, hyper):
    if bench == 'B1':
        return PB.ThreeColouring(cell['n'], cell['c'], Rng(inst_seed), hyper=hyper)
    if bench == 'B2':
        return PB.MaxSat(cell['n'], seed=inst_seed, hyper=hyper)
    if bench == 'B3':
        target = PB.TreeAddress.random_target(Rng(inst_seed), cell['L'])
        return PB.TreeAddress(cell['L'], target, objective=cell.get('objective', 'graded'), hyper=hyper)
    if bench == 'B4':
        data = PB.hierarchical_data(Rng(inst_seed), n_train=cell.get('n_train', 2000), n_test=cell.get('n_test', 1000))
        return PB.HardThresholdNet(data, Rng(inst_seed + 1), hyper=hyper)
    raise ValueError(bench)


def budget_of(bench, cell):
    return {'B1': lambda: 400 * cell['n'], 'B2': lambda: 300 * cell['n'],
            'B3': lambda: 6 * 5 ** (cell['L'] - 1), 'B4': lambda: 200_000}[bench]() if 'budget' not in cell else cell['budget']


def init_points(bench, prob, rng, P):
    if bench == 'B3':
        return np.array([[H.from_poincare(np.zeros(2)) if prob.hyper else np.zeros(2)] for _ in range(P)])
    return prob.init_points(rng, P)


def success_of(bench, cert):
    if bench == 'B1':
        return cert == 0
    if bench == 'B3':
        return cert == 0
    return None


# ---------------------------------------------------------------- one run
def run_one(bench, cell, method, inst_seed, method_seed):
    t0 = time.time()
    hyper = method != 'flat3' and method != 'polystep'
    prob = make_problem(bench, cell, inst_seed, hyper or method == 'random')
    budget = budget_of(bench, cell)
    S = settings_for(bench, method)
    rec = {'bench': bench, 'cell': cell, 'method': method, 'instance_seed': inst_seed, 'method_seed': method_seed,
           'budget': budget, 'settings': S}
    if method == 'random':
        rec.update(random_search(bench, prob, budget, Rng(50_000 + method_seed)))
    elif method == 'polystep':
        rec.update(polystep_baseline(bench, cell, inst_seed, method_seed, budget, S))
    else:
        rec.update(channel_run(bench, prob, method, budget, S, method_seed))
    rec['seconds'] = round(time.time() - t0, 2)
    return rec


def channel_run(bench, prob, method, budget, S, seed):
    geometry = 'flat' if method == 'flat3' else 'hyperbolic'
    k, P = (1, 12) if method == 'hyper1' else (3, 4)
    clutch = 'free' if method == 'hyper3_free' or bench == 'B3' else 'membrane'
    flat_factors = getattr(prob, 'flat_factors', ()) if geometry == 'hyperbolic' else ()
    sols, sts = [], []
    for j in range(k):
        cfg = StepConfig(epsilon=S['epsilon'], step_radius=S['step_radius'], block=S['block'], geometry=geometry,
                         flat_factors=flat_factors, horizon=None if bench == 'B3' else 8.0)
        sol = PolyStepH(prob, prob.m, prob.d, cfg, Rng(1000 * seed + 10 + j), torch_seed=seed)
        sts.append(sol.init_state(init_points(bench, prob, Rng(1000 * seed + 20 + j), P)))
        sols.append(sol)
    first_success = {}

    def on_zero(tc, costs, best):
        if 'evals' not in first_success and success_of(bench, min(costs)):
            first_success['evals'] = tc.evaluations
    tc = TriChannel(sols, sts, prob, clutch=clutch, mu=S['mu'])
    tc.run(budget=budget, on_zero=on_zero)
    costs, best = tc.zero_point()
    out = {'certified': min(costs), 'success': success_of(bench, min(costs)), 'evals_to_success': first_success.get('evals'),
           'evaluations': tc.evaluations}
    if bench == 'B2':
        out['satisfied'] = 1 - min(costs) / len(prob.lits)
    if bench == 'B4':
        st = tc.states[best]
        p = int(np.argmin(st.best_cost))
        out['test_accuracy'], out['coarse_accuracy'] = prob.accuracy(st.best_X[p])
    if geometry == 'hyperbolic' and bench in ('B1', 'B2'):
        out['c2'] = c2_samples(tc)
    return out


def c2_samples(tc):
    """Every particle step's (mean Klein radius of the block before it, Klein length of the step), as the
    preregistration's C2 measure asks, with their Spearman correlation for this run."""
    rad, mov = [], []
    for st in tc.states:
        for h in st.history:
            if 'klein_move' in h:
                rad += h['klein_radius']
                mov += h['klein_move']
    if len(rad) < 3:
        return {'n': len(rad)}
    rank = lambda v: np.argsort(np.argsort(v))
    rho = float(np.corrcoef(rank(np.array(rad)), rank(np.array(mov)))[0, 1])
    return {'n': len(rad), 'spearman': rho, 'radius': [round(x, 6) for x in rad], 'move': [round(x, 6) for x in mov]}


def random_search(bench, prob, budget, rng):
    if bench == 'B3':                                   # addresses in a random order, without replacement
        N = prob.size
        order = list(range(N))
        rng.shuffle(order)
        words = [[]]
        for _ in range(prob.L):
            words = [w + [g] for w in words for g in PB.children(w)]
        index = {tuple(w): i for i, w in enumerate(words)}
        t = index[tuple(prob.target)]
        hit = order.index(t) + 1
        found = hit <= budget
        return {'certified': 0 if found else 1, 'success': found, 'evals_to_success': hit if found else None,
                'evaluations': min(hit, budget)}
    best, evals, first = math.inf, 0, None
    while evals < budget:
        pts = prob.init_points(rng, 1, **({'spread': 0.9} if bench != 'B4' else {'scale': 2.0}))
        if hasattr(prob, 'resample'):
            prob.resample()
        c = float(prob(pts)[0])
        evals += 1
        if c < best:
            best, best_pt = c, pts[0]
        if first is None and success_of(bench, c):
            first = evals
    cert = prob.helix_b(best_pt)
    out = {'certified': cert, 'success': success_of(bench, cert), 'evals_to_success': first, 'evaluations': evals}
    if bench == 'B2':
        out['satisfied'] = 1 - cert / len(prob.lits)
    if bench == 'B4':
        out['test_accuracy'], out['coarse_accuracy'] = prob.accuracy(best_pt)
    return out


def polystep_baseline(bench, cell, inst_seed, seed, budget, S):
    """polystep 1.1.1 itself on the flattened Euclidean problem."""
    from polystep.solver import PolyStep
    prob = make_problem(bench, cell, inst_seed, hyper=False)
    torch.manual_seed(seed)
    if bench == 'B4':
        return polystep_optimizer_b4(prob, budget, S, seed)
    m, d = prob.m, prob.d
    count = [0]
    if bench == 'B3':
        prob.focus(())                                  # the root chart: polystep has no re-anchoring hook

    def obj(Z):
        count[0] += Z.shape[0]
        if hasattr(prob, 'resample'):
            prob.resample()
        return torch.as_tensor(prob(Z.numpy().reshape(-1, m, d)), dtype=torch.float64)
    P = 12
    X0 = torch.as_tensor(init_points(bench, prob, Rng(1000 * seed + 20), P).reshape(P, -1))
    solver = PolyStep(objective_fn=obj, dim=m * d, epsilon=S['epsilon'], step_radius=S['step_radius'] / S['epsilon'],
                      probe_radius=2 * S['step_radius'] / S['epsilon'], max_iterations=10 ** 9)
    st = solver.init_state(X0)
    while count[0] < budget:
        solver.step(st)
    evals = count[0]
    costs = obj(st.X).numpy()
    best = st.X[int(np.argmin(costs))].numpy().reshape(m, d)
    cert = prob.helix_b(best) if bench != 'B3' else prob.helix_b(best, ())['distance']
    note = 'polystep scores its final particles; it keeps no incumbent. The scoring evaluations are not counted.'
    if bench == 'B3':
        note += ' On B3 it searches the root chart, so float64 limits it beyond distance about 18 (depth 6 at tau = 3).'
    out = {'certified': cert, 'success': success_of(bench, cert), 'evals_to_success': None, 'evaluations': evals,
           'note': note}
    if bench == 'B2':
        out['satisfied'] = 1 - cert / len(prob.lits)
    return out


def polystep_optimizer_b4(prob, budget, S, seed):
    from polystep import PolyStepOptimizer

    class Net(torch.nn.Module):
        def __init__(self, x0):
            super().__init__()
            self.W = torch.nn.Parameter(torch.as_tensor(x0[prob.enc]).clone())
            self.P = torch.nn.Parameter(torch.as_tensor(x0[prob.protos]).clone())
    x0 = prob.init_points(Rng(1000 * seed + 20), 1)[0]
    net = Net(x0).double()
    opt = PolyStepOptimizer(net, seed=seed, epsilon=S['epsilon'], step_radius=S['step_radius'] / S['epsilon'],
                            probe_radius=2 * S['step_radius'] / S['epsilon'])

    count = [0]

    def closure(sp):
        prob.resample()
        pts = torch.cat([sp['W'], sp['P']], dim=-2).detach().numpy()
        count[0] += pts.shape[0]
        return torch.as_tensor(prob(pts), dtype=torch.float64)
    while count[0] < budget:
        opt.step(closure)
    evals = count[0]
    point = torch.cat([net.W, net.P], dim=0).detach().numpy()
    acc, coarse = prob.accuracy(point)
    return {'certified': prob.helix_b(point), 'success': None, 'evals_to_success': None, 'evaluations': evals,
            'test_accuracy': acc, 'coarse_accuracy': coarse}


# ---------------------------------------------------------------- the grid of cells
CELLS = {
    'B1': [{'n': n, 'c': c} for c in (4.0, 4.4, 4.69) for n in (60, 120, 300)],
    'B2': [{'n': n} for n in (100, 500, 2000)],
    'B3': [{'L': L, 'objective': o} for o in ('graded', 'membership') for L in (4, 6, 8)],
    'B4': [{}],
}
INSTANCES = {'B1': 20, 'B2': 20, 'B3': 30, 'B4': 10}
SMOKE = {
    'B1': {'n': 24, 'c': 4.4, 'budget': 3000},
    'B2': {'n': 40, 'budget': 3000},
    'B3': {'L': 4, 'objective': 'graded', 'budget': 3000},
    'B4': {'n_train': 200, 'n_test': 100, 'budget': 3000},
}


# ---------------------------------------------------------------- decisions
def bootstrap_decision(diffs, resamples=10_000, seed=7):
    """The preregistered rule: mean paired difference, 95% percentile bootstrap; supported if the interval lies
    above 0, refuted if at or below 0, inconclusive otherwise."""
    diffs = np.asarray(diffs, dtype=float)
    rng = np.random.default_rng(seed)
    means = np.array([diffs[rng.integers(0, len(diffs), len(diffs))].mean() for _ in range(resamples)])
    lo, hi = np.percentile(means, [2.5, 97.5])
    verdict = 'supported' if lo > 0 else 'refuted' if hi <= 0 else 'inconclusive'
    return {'mean': float(diffs.mean()), 'ci95': [float(lo), float(hi)], 'n': len(diffs), 'decision': verdict}


def metric(rec):
    b = rec['bench']
    if b in ('B1', 'B3'):
        return 1.0 if rec['success'] else 0.0
    if b == 'B2':
        return rec['satisfied']
    return rec['test_accuracy']


def decide(bench):
    path = os.path.join(HERE, 'results', f'{bench}.jsonl')
    rows = [json.loads(l) for l in open(path)]
    out = []
    cells = sorted({json.dumps(r['cell'], sort_keys=True) for r in rows})
    for cell in cells:
        sub = [r for r in rows if json.dumps(r['cell'], sort_keys=True) == cell]
        key = lambda r: (r['instance_seed'], r['method_seed'])
        by = {m: {key(r): metric(r) for r in sub if r['method'] == m} for m in METHODS}
        for claim, a, b in (('C1', 'hyper3', 'flat3'), ('C3', 'hyper3', 'hyper1')):
            pairs = sorted(set(by[a]) & set(by[b]))
            if pairs:
                out.append({'cell': json.loads(cell), 'claim': claim, 'compare': f'{a} - {b}',
                            **bootstrap_decision([by[a][k] - by[b][k] for k in pairs])})
    return out


# ---------------------------------------------------------------- tuning
def tune(bench, runs=24):
    rng = pyrandom.Random(9000)
    cell = CELLS[bench][0]
    best = {}
    for method in [m for m in METHODS if m != 'random']:
        trials = []
        for i in range(runs):
            S = {k: rng.uniform(*v) for k, v in SEARCH.items()}
            DEFAULTS_SAVE = DEFAULTS[bench].copy()
            DEFAULTS[bench].update(S)
            rec = run_one(bench, cell, method, 9000 + i, 0)
            DEFAULTS[bench].clear(); DEFAULTS[bench].update(DEFAULTS_SAVE)
            trials.append((metric(rec), S))
        best[method] = max(trials, key=lambda t: t[0])[1]
    path = os.path.join(HERE, 'settings.json')
    tuned = json.load(open(path)) if os.path.exists(path) else {}
    tuned[bench] = best
    json.dump(tuned, open(path, 'w'), indent=1)
    return best


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('action', choices=['smoke', 'tune', 'run', 'decide'])
    ap.add_argument('bench', nargs='?', choices=list(CELLS))
    ap.add_argument('--seeds', type=int, nargs='+', default=[0, 1, 2])
    ap.add_argument('--methods', nargs='+', default=METHODS)
    a = ap.parse_args()
    if a.action == 'smoke':
        out = []
        for bench, cell in SMOKE.items():
            for method in METHODS:
                rec = run_one(bench, cell, method, 1000, 0)
                rec['smoke'] = True
                out.append(rec)
                print(f"{bench} {method:12s} certified {rec['certified']!s:>6} evals {rec['evaluations']:>6} "
                      f"{rec['seconds']:>6}s" + (f" acc {rec['test_accuracy']:.3f}" if 'test_accuracy' in rec else ''))
        os.makedirs(os.path.join(HERE, 'results'), exist_ok=True)
        with open(os.path.join(HERE, 'results', 'smoke.json'), 'w') as fh:
            json.dump(out, fh, indent=1, default=str)
        return
    if not a.bench:
        ap.error('name a benchmark')
    if a.action == 'tune':
        print(json.dumps(tune(a.bench), indent=1))
    elif a.action == 'run':
        os.makedirs(os.path.join(HERE, 'results'), exist_ok=True)
        with open(os.path.join(HERE, 'results', f'{a.bench}.jsonl'), 'a') as fh:
            for cell in CELLS[a.bench]:
                for i in range(INSTANCES[a.bench]):
                    for s in a.seeds:
                        for m in a.methods:
                            fh.write(json.dumps(run_one(a.bench, cell, m, 1000 + i, s), default=str) + '\n')
                            fh.flush()
    else:
        for row in decide(a.bench):
            print(json.dumps(row))


if __name__ == '__main__':
    main()
