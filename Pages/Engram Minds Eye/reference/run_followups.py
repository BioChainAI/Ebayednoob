#!/usr/bin/env python3
"""Runs the follow-up claim E10 (../PREREGISTRATION.md, Amendment 2) and writes its decision.

    python3 run_followups.py          E10 on its registered instances; results/followups.json and results/followups.md
    python3 run_followups.py --dry    a dry run: every seed moved up by 3000 and every set made small (nothing written)

E11 is decided against Owl Academy's own code by run_e11.cjs (Node), which writes results/e11.json.

E10, a sharper guard. Set A: 200 matrices of 24 memories drawn from the depth-2 tree (Rng(5000 + i).sample), one
pair raised by delta with fence.corrupt(D, 1, delta, 6000 + i). Set B: the matrix of all 37 points of the depth-2
tree, 200 corruptions with seeds 7000 + i. Delta in {0.5, 1.0, 1.5, 3.0}. Exact parts E10a, E10c, E10d over every
corrupted matrix, with the smallest-matching control; statistical part E10b at delta 1.5 and 3.0 in both sets.
The original guard computed here is checked against hpstep.fence.guard_check itself on the first instances.
"""
import json
import os
import platform
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import engram  # noqa: E402,F401
from engram import guard as Gd, watch as W  # noqa: E402
from engram.stats import ci_mean  # noqa: E402
from hpstep import fence as Fz  # noqa: E402
from hpstep.prng import Rng  # noqa: E402

KEEP = 20
DRY = '--dry' in sys.argv
OFF = 3000 if DRY else 0
N_INST = 4 if DRY else 200
DELTAS = (0.5, 1.0, 1.5, 3.0)


def exact_decision(failures, control_failed=True):
    if not control_failed:
        return 'void'
    return 'supported' if failures == 0 else 'refuted'


def combine(*decisions):
    if 'refuted' in decisions:
        return 'refuted'
    if 'void' in decisions:
        return 'void'
    return 'supported' if all(d == 'supported' for d in decisions) else 'inconclusive'


def rate(xs):
    mean, ci = ci_mean([1.0 if x else 0.0 for x in xs])
    return {'rate': round(mean, 4), 'ci95': [round(c, 4) for c in ci]}


def run_e10():
    pts = W.depth2_points()
    sets = {}
    clean = Fz.distance_matrix(pts)
    sets['A'] = [(i, lambda i=i: Fz.distance_matrix([pts[j] for j in Rng(5000 + i + OFF).sample(len(pts), 24)]), 6000 + i + OFF) for i in range(N_INST)]
    sets['B'] = [(i, lambda: clean, 7000 + i + OFF) for i in range(N_INST)]
    fails, cases, ctrl_fail, ctrl_cases, premise_fail = [], 0, 0, 0, []
    cross = {'compared': 0, 'equal': 0}
    cells = {}
    for name, inst in sets.items():
        recs = {d: [] for d in DELTAS}
        for i, make, seed in inst:
            D = make()
            g0 = Gd.guards(D)
            if g0['bad'] > 0:
                premise_fail.append({'set': name, 'instance': i, 'clean_bad': g0['bad']})
            for delta in DELTAS:
                E, pairs = Fz.corrupt(D, 1, delta, seed)
                pair = tuple(pairs[0])
                c = Gd.checks(E, pair)
                cases += 1
                for part in ('e10a', 'e10c', 'e10d'):
                    if not c[part]:
                        fails.append({'set': name, 'instance': i, 'delta': delta, 'part': part, 'pair': pair, 'bad': c['bad'],
                                      'original_top': c['original_top'], 'matching_top': c['matching_top']})
                if c['bad'] >= 2:
                    ctrl_cases += 1
                    ctrl_fail += not c['control_e10d']
                if i < 5:                                             # the original guard is guard_check itself
                    ref = Fz.guard_check(E)
                    cross['compared'] += 1
                    cross['equal'] += int(ref['bad'] == c['bad'] and [(tuple(p), n) for p, n in ref['top'][:2]] == c['original_top'])
                recs[delta].append(c)
        for delta in DELTAS:
            rs = recs[delta]
            bads = sorted(r['bad'] for r in rs)
            cells[f'{name} {delta}'] = {
                'set': name, 'delta': delta, 'n': len(rs),
                'matching_named': rate([r['matching_named'] for r in rs]),
                'original_first_ranked': rate([r['original_first'] for r in rs]),
                'original_alone': rate([r['original_alone'] for r in rs]),
                'two_or_more_quads_above': round(sum(1 for b in bads if b >= 2) / len(bads), 4),
                'quads_above_median': bads[len(bads) // 2],
                'original_misses': [{'instance': i, 'pair': r['original_top'][1][0] if len(r['original_top']) > 1 else None, 'tie': len(r['original_top']) > 1 and r['original_top'][0][1] == r['original_top'][1][1], 'bad': r['bad']}
                                    for i, r in enumerate(rs) if not r['original_first']][:KEEP],
            }
    exact = exact_decision(len(fails) + len(premise_fail), ctrl_fail > 0)
    dec = [cells[f'{s} {d}']['matching_named'] for s in ('A', 'B') for d in (1.5, 3.0)]
    if any(x['rate'] < 0.90 for x in dec):
        stat = 'refuted'
    elif all(x['rate'] >= 0.99 and x['ci95'][0] >= 0.95 for x in dec):
        stat = 'supported'
    else:
        stat = 'inconclusive'
    return {'decision': combine(exact, stat),
            'parts': {'E10a, E10c, E10d (exact)': exact, 'E10b: the matching guard names the pair at 1.5 and 3.0 (statistical)': stat},
            'cases': cases, 'failures': len(fails) + len(premise_fail), 'counterexamples': (premise_fail + fails)[:KEEP],
            'control': {'smallest-matching guard, instances failing E10d': f'{ctrl_fail}/{ctrl_cases}'},
            'reported': {'cells': cells, 'original guard = guard_check (first instances)': f'{cross["equal"]}/{cross["compared"]}',
                         'clean matrices above ln 2': len(premise_fail)}}


def main():
    out = {'preregistration': 'PREREGISTRATION.md, Amendment 2', 'started': time.strftime('%Y-%m-%d %H:%M:%S %Z'),
           'environment': {'python': platform.python_version(), 'platform': platform.platform()}, 'claims': {}}
    try:
        import numpy
        out['environment']['numpy'] = numpy.__version__
    except ImportError:
        pass
    t0 = time.time()
    r = run_e10()
    r['seconds'] = round(time.time() - t0, 1)
    out['claims']['E10'] = r
    print(f'E10: {r["decision"].upper()}  ({r["cases"]} cases, {r["failures"]} failures, {r["seconds"]} s)')
    for k, v in r['parts'].items():
        print(f'      {k}: {v}')
    print(f'      control: {r["control"]}')
    for k, c in r['reported']['cells'].items():
        print(f'      set {c["set"]} +{c["delta"]}: matching guard {c["matching_named"]["rate"]} {c["matching_named"]["ci95"]}, guard first-ranked {c["original_first_ranked"]["rate"]}, '
              f'alone {c["original_alone"]["rate"]}; two or more quads above ln 2 in {c["two_or_more_quads_above"]}, median {c["quads_above_median"]}')
    print(f'      original guard = guard_check: {r["reported"]["original guard = guard_check (first instances)"]}')
    if DRY:
        print('dry run: nothing written')
        return
    os.makedirs(os.path.join(HERE, 'results'), exist_ok=True)
    with open(os.path.join(HERE, 'results', 'followups.json'), 'w') as f:
        json.dump(out, f, indent=1, default=str)
    lines = ['# Engram Mind\'s Eye: follow-up claims (Amendment 2)', '', f'Run {out["started"]}, Python {out["environment"]["python"]}.', '',
             '| Claim | Decision | Cases | Failures | Control |', '| --- | --- | --- | --- | --- |',
             f'| E10 | {r["decision"]} ({", ".join(f"{k}: {v}" for k, v in r["parts"].items())}) | {r["cases"]} | {r["failures"]} | {"; ".join(f"{k}: {v}" for k, v in r["control"].items())} |',
             '', '| Set | δ | Matching guard names | Guard, first-ranked (E8\'s count) | Guard, alone | ≥ 2 quads above ln 2 | Median quads above |',
             '| --- | --- | --- | --- | --- | --- | --- |']
    for c in r['reported']['cells'].values():
        lines.append(f'| {c["set"]} | {c["delta"]} | {c["matching_named"]["rate"]} {c["matching_named"]["ci95"]} | {c["original_first_ranked"]["rate"]} | {c["original_alone"]["rate"]} | {c["two_or_more_quads_above"]} | {c["quads_above_median"]} |')
    lines.append('\nE11 is decided by run_e11.cjs: see e11.json.')
    with open(os.path.join(HERE, 'results', 'followups.md'), 'w') as f:
        f.write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
