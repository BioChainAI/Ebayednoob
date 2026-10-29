"""The preregistered benchmarks (../PREREGISTRATION.md): runners, tuning and the decision rule.

    python run_bench.py smoke                    # every benchmark and method once, tiny sizes: checks the code runs
    python run_bench.py tune B1 [--jobs 4]       # 24 tuning runs per method on seeds 9000-9023 -> settings.json
    python run_bench.py run B1 [--jobs 4]        # the measured runs -> results/B1.jsonl (resumable)
    python run_bench.py decide                   # every decision -> results/decisions.json

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


class Cosine:
    """Cosine annealing from `init` to `target` over `total` steps, then flat: polystep's CosineEpsilon formula."""

    def __init__(self, init, target, total):
        self.init, self.target, self.total = float(init), float(target), max(1, int(total))

    def at(self, t):
        return self.target + 0.5 * (self.init - self.target) * (1 + math.cos(math.pi * min(t, self.total) / self.total))


def scheduled(S, steps):
    """epsilon and step radius as the step reads them: constants, or cosine-annealed to a tenth of their starting
    value over the run's expected number of steps (Amendment 2)."""
    if S.get('schedule', 'constant') != 'cosine':
        return S['epsilon'], S['step_radius']
    return Cosine(S['epsilon'], 0.1 * S['epsilon'], steps), Cosine(S['step_radius'], 0.1 * S['step_radius'], steps)


class Counted:
    """The objective as the search sees it, counting evaluations and noting the first that certifies success
    (cost 0: no conflict, or the target address). Everything else passes through to the problem."""

    def __init__(self, prob, bench):
        self._prob, self._bench, self.count, self.first = prob, bench, 0, None

    def __call__(self, pts):
        c = np.asarray(self._prob(pts))
        if self.first is None and self._bench in ('B1', 'B3'):
            hit = np.flatnonzero(c.reshape(-1) == 0)
            if hit.size:
                self.first = self.count + int(hit[0]) + 1
        self.count += c.size
        return c

    def __getattr__(self, name):
        return getattr(self._prob, name)


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
def run_one(bench, cell, method, inst_seed, method_seed, tuned=True):
    t0 = time.time()
    hyper = method != 'flat3' and method != 'polystep'
    prob = make_problem(bench, cell, inst_seed, hyper or method == 'random')
    budget = budget_of(bench, cell)
    S = settings_for(bench, method) if tuned else dict(DEFAULTS[bench])
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
    counted = Counted(prob, bench)
    b = prob.m if S['block'] is None else min(S['block'], prob.m)
    steps = budget // (k * P * 2 * b * prob.d)                     # steps per channel the budget allows
    eps, radius = scheduled(S, steps)
    sols, sts = [], []
    for j in range(k):
        cfg = StepConfig(epsilon=eps, step_radius=radius, block=S['block'], geometry=geometry,
                         flat_factors=flat_factors, horizon=None if bench == 'B3' else 8.0)
        sol = PolyStepH(counted, prob.m, prob.d, cfg, Rng(1000 * seed + 10 + j), torch_seed=seed)
        sts.append(sol.init_state(init_points(bench, prob, Rng(1000 * seed + 20 + j), P)))
        sols.append(sol)
    tc = TriChannel(sols, sts, prob, clutch=clutch, mu=S['mu'])
    solved = []                                          # a run stops at the first zero point that certifies cost 0

    def on_zero(tc_, costs, best):
        if min(costs) == 0:
            solved.append(tc_.F)
    while tc.evaluations < budget and not solved:
        tc.run(frames=24, budget=budget, on_zero=on_zero)
    costs, best = tc.zero_point()
    out = {'certified': min(costs), 'success': success_of(bench, min(costs)), 'evals_to_success': counted.first,
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
    rad, mov = np.array(rad), np.array(mov)
    rank = lambda v: np.argsort(np.argsort(v))
    rho = float(np.corrcoef(rank(rad), rank(mov))[0, 1])
    edges = np.quantile(rad, np.linspace(0, 1, 11))           # a ten-bin profile, by deciles of the Klein radius
    which = np.clip(np.searchsorted(edges, rad, side='right') - 1, 0, 9)
    prof = [[float(rad[which == b].mean()), float(mov[which == b].mean())] for b in range(10) if np.any(which == b)]
    return {'n': int(len(rad)), 'spearman': rho, 'profile': prof}


def random_points(bench, prob, nprng, k):
    """k candidates for the random floor (Amendment 2): every hyperbolic factor's Poincaré point uniform in the disk
    or ball of radius 0.9, so B1's colours and B2's truth values are uniform; B4's encoder entries uniform on
    [-2, 2]. The problems here are the hyperbolic ones."""
    def ball(shape, d):
        g = nprng.standard_normal(shape + (d,))
        rad = 0.9 * nprng.random(shape + (1,)) ** (1 / d)
        return g / np.linalg.norm(g, axis=-1, keepdims=True) * rad
    pts = H.from_poincare(ball((k, prob.m), prob.d))
    if bench == 'B4':
        pts[:, prob.enc, 0] = 1.0
        pts[:, prob.enc, 1:] = nprng.uniform(-2.0, 2.0, (k, len(prob.enc), 2))
    return pts


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
    nprng = np.random.default_rng(rng.next_u32())
    while evals < budget:                               # scored 64 at a time; B4 draws one batch per chunk, as a step does
        k = min(64, budget - evals)
        pts = random_points(bench, prob, nprng, k)
        if hasattr(prob, 'resample'):
            prob.resample()
        c = np.asarray(prob(pts), dtype=float)
        i = int(np.argmin(c))
        if c[i] < best:
            best, best_pt = float(c[i]), pts[i]
        if first is None and bench == 'B1' and np.any(c == 0):
            first = evals + int(np.flatnonzero(c == 0)[0]) + 1
        evals += k
        if first is not None:
            break
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

    first = [None]

    def obj(Z):
        if hasattr(prob, 'resample'):
            prob.resample()
        c = prob(Z.numpy().reshape(-1, m, d))
        if first[0] is None and bench in ('B1', 'B3') and np.any(np.asarray(c) == 0):
            first[0] = count[0] + int(np.flatnonzero(np.asarray(c) == 0)[0]) + 1
        count[0] += Z.shape[0]
        return torch.as_tensor(c, dtype=torch.float64)
    P = 12
    X0 = torch.as_tensor(init_points(bench, prob, Rng(1000 * seed + 20), P).reshape(P, -1))
    eps = S['epsilon']
    if S.get('schedule', 'constant') == 'cosine':            # radii are multiples of epsilon in polystep, so they follow it
        from polystep.epsilon import CosineEpsilon
        eps = CosineEpsilon(target=0.1 * S['epsilon'], init=S['epsilon'], total_steps=10 ** 9)
    solver = PolyStep(objective_fn=obj, dim=m * d, epsilon=eps, step_radius=S['step_radius'] / S['epsilon'],
                      probe_radius=2 * S['step_radius'] / S['epsilon'], max_iterations=10 ** 9)
    st = solver.init_state(X0)
    solver.step(st)
    if not isinstance(eps, float):                       # the run's length in steps, known after the first step
        eps.total_steps = max(1, budget // max(1, count[0]))
    while count[0] < budget:
        solver.step(st)
    evals = count[0]
    costs = obj(st.X).numpy()
    best = st.X[int(np.argmin(costs))].numpy().reshape(m, d)
    cert = prob.helix_b(best) if bench != 'B3' else prob.helix_b(best, ())['distance']
    note = 'polystep scores its final particles; it keeps no incumbent. The scoring evaluations are not counted.'
    if bench == 'B3':
        note += ' On B3 it searches the root chart, so float64 limits it beyond distance about 18 (depth 6 at tau = 3).'
    out = {'certified': cert, 'success': success_of(bench, cert), 'evals_to_success': first[0], 'evaluations': evals,
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
    eps = S['epsilon']
    if S.get('schedule', 'constant') == 'cosine':
        from polystep.epsilon import CosineEpsilon
        eps = CosineEpsilon(target=0.1 * S['epsilon'], init=S['epsilon'], total_steps=10 ** 9)
    opt = PolyStepOptimizer(net, seed=seed, epsilon=eps, step_radius=S['step_radius'] / S['epsilon'],
                            probe_radius=2 * S['step_radius'] / S['epsilon'])

    count = [0]

    def closure(sp):
        prob.resample()
        pts = torch.cat([sp['W'], sp['P']], dim=-2).detach().numpy()
        count[0] += pts.shape[0]
        return torch.as_tensor(prob(pts), dtype=torch.float64)
    opt.step(closure)
    if not isinstance(eps, float):
        eps.total_steps = max(1, budget // max(1, count[0]))
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


def ci_mean(values, resamples=10_000, seed=7):
    """Mean and 95% percentile bootstrap interval, the preregistration's resampling (10,000 resamples, seed 7)."""
    v = np.asarray(values, dtype=float)
    rng = np.random.default_rng(seed)
    means = np.array([v[rng.integers(0, len(v), len(v))].mean() for _ in range(resamples)])
    lo, hi = np.percentile(means, [2.5, 97.5])
    return float(v.mean()), [float(lo), float(hi)]


# Which comparisons decide a claim, and in which cells (PREREGISTRATION.md; Amendment 2 fixes the reading).
C1_CELLS = {'B1': lambda c: True, 'B3': lambda c: c.get('objective') == 'graded', 'B4': lambda c: True}


def load(bench):
    path = os.path.join(HERE, 'results', f'{bench}.jsonl')
    return [json.loads(l) for l in open(path)] if os.path.exists(path) else []


def decide(bench):
    """Every decision and comparison for one benchmark, cell by cell."""
    rows = load(bench)
    out = []
    cells = sorted({json.dumps(r['cell'], sort_keys=True) for r in rows})
    for cell_s in cells:
        cell = json.loads(cell_s)
        sub = [r for r in rows if json.dumps(r['cell'], sort_keys=True) == cell_s]
        key = lambda r: (r['instance_seed'], r['method_seed'])
        by = {m: {key(r): metric(r) for r in sub if r['method'] == m} for m in METHODS}

        def paired(a, b):
            pairs = sorted(set(by[a]) & set(by[b]))
            return bootstrap_decision([by[a][k] - by[b][k] for k in pairs]) if pairs else None
        comps = [('C1', 'hyper3', 'flat3', bench in C1_CELLS and C1_CELLS[bench](cell))]
        if bench == 'B1':
            comps += [('C3', 'hyper3', 'hyper1', True), ('membrane', 'hyper3', 'hyper3_free', False)]
        comps += [('vs polystep', 'hyper3', 'polystep', False), ('vs random', 'hyper3', 'random', False)]
        for claim, a, b, decisive in comps:
            r = paired(a, b)
            if r:
                both0 = all(by[a][k] == 0 and by[b][k] == 0 for k in set(by[a]) & set(by[b])) if bench in ('B1', 'B3') else False
                out.append({'bench': bench, 'cell': cell, 'claim': claim, 'compare': f'{a} - {b}', 'decisive': decisive,
                            'floor': both0, **r})
        if bench in ('B1', 'B2'):                                  # C2 on the hyperbolic three-channel runs
            rhos = [r['c2']['spearman'] for r in sub if r['method'] == 'hyper3' and 'spearman' in r.get('c2', {})
                    and np.isfinite(r['c2']['spearman'])]
            if rhos:
                mean, (lo, hi) = ci_mean(rhos)
                verdict = 'supported' if mean < -0.3 and hi < 0 else 'refuted' if lo > -0.3 else 'inconclusive'
                out.append({'bench': bench, 'cell': cell, 'claim': 'C2', 'compare': 'Spearman(Klein radius, Klein step), hyper3',
                            'decisive': True, 'floor': False, 'mean': mean, 'ci95': [lo, hi], 'n': len(rhos), 'decision': verdict})
        if bench == 'B3' and cell.get('objective') == 'membership':   # the negative control (Prop 5.13)
            N = 6 * 5 ** (cell['L'] - 1)
            for m in METHODS:
                T = [min(r['evals_to_success'], N) if r.get('evals_to_success') else N for r in sub if r['method'] == m]
                if T:
                    mean, (lo, hi) = ci_mean(T)
                    out.append({'bench': bench, 'cell': cell, 'claim': 'control', 'compare': f'{m}: mean of min(T, N) vs (N + 1) / 2',
                                'decisive': True, 'floor': False, 'mean': mean, 'ci95': [lo, hi], 'n': len(T), 'bound': (N + 1) / 2,
                                'decision': 'BUG: beats the bound' if hi < (N + 1) / 2 else 'passes'})
    return out


def summarize(bench):
    """Per cell and method: runs, mean primary metric, success rate, mean certified cost, evaluations to success."""
    rows, out = load(bench), []
    for cell_s in sorted({json.dumps(r['cell'], sort_keys=True) for r in rows}):
        for m in METHODS:
            sub = [r for r in rows if json.dumps(r['cell'], sort_keys=True) == cell_s and r['method'] == m]
            if not sub:
                continue
            hits = [r['evals_to_success'] for r in sub if r.get('success') and r.get('evals_to_success')]
            out.append({'bench': bench, 'cell': json.loads(cell_s), 'method': m, 'runs': len(sub),
                        'metric': float(np.mean([metric(r) for r in sub])),
                        'success_rate': float(np.mean([bool(r['success']) for r in sub])) if sub[0]['success'] is not None else None,
                        'certified': float(np.mean([r['certified'] for r in sub])),
                        'evals_to_success': float(np.median(hits)) if hits else None,
                        'seconds': float(np.sum([r['seconds'] for r in sub]))})
    return out


def ledger(decisions):
    """A claim's final status over its decisive cells (Amendment 2): supported in a majority and refuted in none ->
    supported; refuted in a majority and supported in none -> refuted; otherwise mixed."""
    out = {}
    for claim in ('C1', 'C2', 'C3'):
        ds = [d for d in decisions if d['claim'] == claim and d['decisive']]
        if not ds:
            continue
        n = len(ds)
        k = {v: sum(d['decision'] == v for d in ds) for v in ('supported', 'refuted', 'inconclusive')}
        status = ('supported' if k['supported'] > n / 2 and not k['refuted'] else
                  'refuted' if k['refuted'] > n / 2 and not k['supported'] else 'mixed')
        out[claim] = {'status': status, 'cells': n, **k}
    return out


# ---------------------------------------------------------------- tuning
TUNE_CELL = {'B1': {'n': 120, 'c': 4.4}, 'B2': {'n': 500}, 'B3': {'L': 6, 'objective': 'graded'}, 'B4': {}}


def tune_candidates(runs=24):
    """The 24 candidate settings, the same for every method and benchmark: epsilon log-uniform on [0.01, 2], the step
    radius uniform on [0.05, 3], mu uniform on [0, 0.8], and constant or cosine schedules with equal chance."""
    rng = pyrandom.Random(9000)
    out = []
    for _ in range(runs):
        out.append({'epsilon': math.exp(rng.uniform(math.log(0.01), math.log(2.0))), 'step_radius': rng.uniform(0.05, 3.0),
                    'mu': rng.uniform(0.0, 0.8), 'schedule': 'cosine' if rng.random() < 0.5 else 'constant'})
    return out


def tune_one(bench, method, runs=24):
    """Trial i runs candidate i on tuning instance 9000 + i (method seed 0). The best trial by the primary metric,
    ties broken by the lower certified cost, sets the method's settings."""
    cell, trials = TUNE_CELL[bench], []
    for i, S in enumerate(tune_candidates(runs)):
        saved = DEFAULTS[bench].copy()
        DEFAULTS[bench].update(S)
        try:
            rec = run_one(bench, cell, method, 9000 + i, 0, tuned=False)
        finally:
            DEFAULTS[bench].clear(); DEFAULTS[bench].update(saved)
        trials.append({'settings': S, 'metric': metric(rec), 'certified': rec['certified'], 'seconds': rec['seconds']})
    best = max(trials, key=lambda t: (t['metric'], -t['certified']))
    return best['settings'], trials


def _task(args):
    torch.set_num_threads(1)
    return run_one(*args)


def _tune_task(args):
    torch.set_num_threads(1)
    bench, method = args
    return bench, method, tune_one(bench, method)


def pool_map(fn, tasks, jobs):
    if jobs <= 1:
        for t in tasks:
            yield fn(t)
        return
    import multiprocessing as mp
    with mp.get_context('fork').Pool(jobs) as pool:
        yield from pool.imap_unordered(fn, tasks)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('action', choices=['smoke', 'tune', 'run', 'decide'])
    ap.add_argument('bench', nargs='*', choices=list(CELLS))
    ap.add_argument('--seeds', type=int, nargs='+', default=[0, 1, 2])
    ap.add_argument('--methods', nargs='+', default=METHODS)
    ap.add_argument('--jobs', type=int, default=1)
    a = ap.parse_args()
    res_dir = os.path.join(HERE, 'results')
    os.makedirs(res_dir, exist_ok=True)
    if a.action == 'smoke':
        out = []
        for bench, cell in SMOKE.items():
            for method in METHODS:
                rec = run_one(bench, cell, method, 1000, 0)
                rec['smoke'] = True
                out.append(rec)
                print(f"{bench} {method:12s} certified {rec['certified']!s:>6} evals {rec['evaluations']:>6} "
                      f"{rec['seconds']:>6}s" + (f" acc {rec['test_accuracy']:.3f}" if 'test_accuracy' in rec else ''))
        with open(os.path.join(res_dir, 'smoke.json'), 'w') as fh:
            json.dump(out, fh, indent=1, default=str)
        return
    benches = a.bench or list(CELLS)
    if a.action == 'tune':                                  # 24 trials per method; the random floor is not tuned
        tasks = [(b, m) for b in benches for m in a.methods if m != 'random']
        path = os.path.join(HERE, 'settings.json')
        for bench, method, (best, trials) in pool_map(_tune_task, tasks, a.jobs):
            tuned = json.load(open(path)) if os.path.exists(path) else {}
            tuned.setdefault(bench, {})[method] = best
            json.dump(tuned, open(path, 'w'), indent=1, sort_keys=True)
            log = os.path.join(res_dir, f'tuning_{bench}.json')
            done = json.load(open(log)) if os.path.exists(log) else {}
            done[method] = {'cell': TUNE_CELL[bench], 'chosen': best, 'trials': trials}
            json.dump(done, open(log, 'w'), indent=1, sort_keys=True)
            print(bench, method, json.dumps(best), flush=True)
    elif a.action == 'run':                                 # resumable: runs already in the file are skipped
        for bench in benches:
            path = os.path.join(res_dir, f'{bench}.jsonl')
            have = {(json.dumps(r['cell'], sort_keys=True), r['method'], r['instance_seed'], r['method_seed']) for r in load(bench)}
            tasks = [(bench, cell, m, 1000 + i, sd) for cell in CELLS[bench] for i in range(INSTANCES[bench])
                     for sd in a.seeds for m in a.methods
                     if (json.dumps(cell, sort_keys=True), m, 1000 + i, sd) not in have]
            print(bench, len(tasks), 'runs to do', flush=True)
            with open(path, 'a') as fh:
                for k, rec in enumerate(pool_map(_task, tasks, a.jobs), 1):
                    fh.write(json.dumps(rec, default=str) + '\n')
                    fh.flush()
                    if k % 50 == 0:
                        print(bench, k, '/', len(tasks), flush=True)
    else:
        decisions, summary = [], []
        for bench in list(CELLS):
            decisions += decide(bench)
            summary += summarize(bench)
        out = {'decisions': decisions, 'summary': summary, 'ledger': ledger(decisions),
               'settings': json.load(open(os.path.join(HERE, 'settings.json'))) if os.path.exists(os.path.join(HERE, 'settings.json')) else None}
        with open(os.path.join(res_dir, 'decisions.json'), 'w') as fh:
            json.dump(out, fh, indent=1)
        for d in decisions:
            print(d['bench'], json.dumps(d['cell']), d['claim'], d['compare'], d['decision'],
                  f"mean {d['mean']:.4f} CI [{d['ci95'][0]:.4f}, {d['ci95'][1]:.4f}] n {d['n']}" + (' floor' if d.get('floor') else ''))
        print(json.dumps(out['ledger']))


if __name__ == '__main__':
    main()
