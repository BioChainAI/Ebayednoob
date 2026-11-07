"""Phase 4 (Amendment 10, items 7-9 and 12): L6's seeds, tuning jobs and choice, controls, intervals, presence,
decisions, L4(c)'s decision, LBENCH/1, the protocol pin and the lr-freeze lookup. No numba here (the runner's main
process imports this module); the shared generator is hpstep.prng.Rng, looked up as prng.Rng at call time.

    Seeds, REGISTERED, DRY, SELFTEST          A10.8, A10.9, A10.13 (dry = registered + 3000, the bootstrap excepted)
    tuning_jobs(seeds, cells, grid)           A10.8: rate k (ascending) on seeds tuning[4k .. 4k + 3], every cell
    choose_lr(scores)                         A10.8: eligible = no diverged run in the block; exact mean of four;
                                              the largest mean; ties to the smaller rate; no eligible rate -> None
    label_permutation(seed, n), relabel(nb, P), move_points(X, P)          control 1 (A10.9)
    edge_pairs(rng, n, E), edge_nonneighbours(n, pairs)                    control 2's pairs and NN' (A10.9)
    floor_table(seed, n, d, geometry)                                      control 3's untrained table (A10.9)
    keep_mask(graph_nb), interval(ap_x, ap_y, keep)                        A10.7 (rank.paired_diffs, rank.ci_mean)
    present(comparison, seed, tables, control2), part_a/b/c/d, decide_l6   A10.7
    control1_holds(map), control2_entry(iv_closure, iv_graph)              A10.9
    decide_l4c(deltas), prediction_gap(...)                                A10.10, A10.7
    lbench(**fields), budget(E), map_sha(F), map_display(F)                A10.12 (Amendment 7 item 3's conventions)
    amendment_section(text, n), PROTOCOL_SHA, protocol_sha()               the protocol pin (A10.12)
    freeze_amendment(text, settings_sha), settings_path, settings_text, read_settings   A10.8's lr freeze

READINGs are marked in the code where a definition admits two readings; each cites the A10 item it implements.
"""
import hashlib
import json
import math
import os
import platform
import re
from dataclasses import dataclass
from fractions import Fraction

import numpy as np
from hpstep import prng

from . import GOLDEN, REFERENCE
from . import rank as R

# ================================================================ the grid (A10.3, A10.8)
GRID = ('0.03', '0.1', '0.3', '1', '3', '10')          # ascending; each read by float() as written
DIMS = (2, 3, 5, 10, 50)
GEOMETRIES = ('lorentz', 'euclid')
CELLS = tuple((g, d) for g in GEOMETRIES for d in DIMS)  # ten cells, the reported d included
BLOCK = 4                                               # seeds per rate in tuning
EPOCHS, BURNIN, BATCH, NEGS = 1000, 20, 50, 50
INIT_RANGE = 1e-3

assert [Fraction(x) for x in GRID] == sorted(Fraction(x) for x in GRID)


# ================================================================ seeds (A10.8, A10.9, A10.13)
@dataclass(frozen=True)
class Seeds:
    """training: the measured seeds s (index j = 0..4); tuning: 24 seeds in six blocks of four; label: control 1's
    one permutation; edge_base + j: control 2's pairs for training index j; floor_base + j: control 3's floor i = j
    (the same numbers as edge_base: A10.9 registers both uses of Rng(2000 + i)); diag_base + j, j < 200: the reported
    permutations; bootstrap: rank.ci_mean's default_rng seed (the statistics rule's constant, 7 in every mode)."""
    training: tuple
    tuning: tuple
    label: int
    edge_base: int
    floor_base: int
    diag_base: int
    bootstrap: int
    diag_count: int = 200

    def edge(self, j):
        self._check_j(j)
        return self.edge_base + j

    def floor(self, j):
        self._check_j(j)
        return self.floor_base + j

    def diag(self, j):
        if not 0 <= j < self.diag_count:
            raise ValueError(f'diagnostic permutation index {j} out of 0..{self.diag_count - 1}')
        return self.diag_base + j

    def block(self, k):
        """The four tuning seeds of block k (k = 0..5): tuning[4k .. 4k + 3] (A10.8)."""
        if not 0 <= k < len(self.tuning) // BLOCK:
            raise ValueError(f'no tuning block {k}')
        return tuple(self.tuning[BLOCK * k:BLOCK * k + BLOCK])

    def _check_j(self, j):
        if not 0 <= j < len(self.training):
            raise ValueError(f'training index {j} out of 0..{len(self.training) - 1}')


REGISTERED = Seeds(training=(0, 1, 2, 3, 4), tuning=tuple(range(9000, 9024)), label=7, edge_base=2000,
                   floor_base=2000, diag_base=2100, bootstrap=7)
DRY = Seeds(training=(3000, 3001, 3002, 3003, 3004), tuning=tuple(range(12000, 12024)), label=3007, edge_base=5000,
            floor_base=5000, diag_base=5100, bootstrap=7)
# the self-test (synthetic DAG, unregistered seeds 80600 and up; diagnostics 81000-81199)
SELFTEST = Seeds(training=(80600, 80601, 80602, 80603, 80604), tuning=tuple(range(80610, 80634)), label=80640,
                 edge_base=80650, floor_base=80650, diag_base=81000, bootstrap=7)
SEEDS = {'registered': REGISTERED, 'dry': DRY, 'selftest': SELFTEST}
ROOTS = {'registered': '01861778', 'dry': '15046900', 'selftest': None}
INSTANCE_IDS = {'registered': 'wordnet30-mammal-closure', 'dry': 'wordnet30-solid-closure',
                'selftest': 'synthetic-dag'}

# the learned cells each comparison of A10.7 uses
COMPARISON_CELLS = {'a2': (('lorentz', 2), ('euclid', 2)), 'a3': (('lorentz', 3), ('euclid', 3)),
                    'b': (('lorentz', 50), ('euclid', 50)), 'c': (('lorentz', 3),), 'd': (('lorentz', 3),)}
PARTS_CELLS = {'a': [('lorentz', 2), ('euclid', 2), ('lorentz', 3), ('euclid', 3)],
               'b': [('lorentz', 50), ('euclid', 50)], 'c': [('lorentz', 3)], 'd': [('lorentz', 3)]}
L4C_CELLS = [(g, d) for g in GEOMETRIES for d in (2, 3)]
REFUTE_SEEDS = 3                     # "three or more seeds"


# ================================================================ tuning (A10.8)
@dataclass(frozen=True)
class TuningJob:
    geometry: str
    d: int
    lr: str
    seed: int
    block: int


def _rate_index(lr):
    if lr not in GRID:
        raise ValueError(f'{lr!r} is not a grid rate: the grid is never extended (A10.8)')
    return GRID.index(lr)


def tuning_jobs(seeds, cells=CELLS, grid=GRID):
    """A10.8: for every cell, the k-th rate of the grid in ascending order on block k, seeds tuning[4k .. 4k + 3]:
    24 jobs per cell, 240 in all. READING: k is the rate's place in the registered grid, so a sub-grid (the
    self-test's) keeps each rate on its own registered block."""
    out = []
    for g, d in cells:
        for lr in grid:
            k = _rate_index(lr)
            for s in seeds.block(k):
                out.append(TuningJob(g, d, lr, s, k))
    return out


def choose_lr(scores, block=BLOCK):
    """A10.8's choice for one cell. scores: {rate: [the exact snapped closure MAP of each run of its block, None for
    a diverged run]}. A rate is eligible if none of its runs diverged; its score is the exact mean of its runs
    (Fractions). The frozen rate is the eligible one with the largest mean, a tie going to the smaller rate; no
    eligible rate gives None. Returns (rate or None, detail)."""
    detail = {}
    best = None
    for lr in sorted(scores, key=Fraction):
        _rate_index(lr)
        runs = list(scores[lr])
        if len(runs) != block:
            raise ValueError(f'rate {lr}: {len(runs)} runs, not a block of {block}')
        if any(x is not None and not isinstance(x, (Fraction, int)) for x in runs):
            raise TypeError('tuning scores must be exact (Fraction)')
        diverged = sum(1 for x in runs if x is None)
        eligible = diverged == 0
        mean = R.exact_sum(runs) / len(runs) if eligible else None
        detail[lr] = {'eligible': eligible, 'diverged': diverged, 'mean': mean, 'runs': len(runs)}
        if eligible and (best is None or mean > detail[best]['mean']):    # strict: an equal mean keeps the smaller
            best = lr
    detail_out = {'rates': detail, 'chosen': best,
                  'at_grid_end': best is not None and best in (GRID[0], GRID[-1])}
    return best, detail_out


# ================================================================ control 1: the label shuffle (A10.9)
def label_permutation(seed, n):
    """P = Rng(seed).shuffle(list(range(n))) from one fresh generator (hpstep.prng.Rng itself)."""
    return prng.Rng(seed).shuffle(list(range(n)))


def inverse(P):
    Q = [0] * len(P)
    for i, p in enumerate(P):
        Q[p] = i
    if sorted(P) != list(range(len(P))):
        raise ValueError('not a permutation')
    return Q


def relabel(nb, P):
    """A10.9: the node with index P[i] takes the point of row i (the labels move, the points stay). In the rows'
    index space, row r carries label P[r]; its neighbours are the rows Q[m] (Q = P^-1) of the true neighbours m of
    P[r]. Evaluating the unchanged table against these sets is evaluating the relabelled table against the true
    neighbours (pessimistic AP depends on no tie listing)."""
    Q = inverse(P)
    return [sorted(Q[m] for m in nb[P[r]]) for r in range(len(P))]


def move_points(X, P):
    """The other way to read the same relabelling (for tests): a table whose row P[i] is row i of X."""
    X = np.asarray(X)
    out = np.empty_like(X)
    out[np.asarray(P)] = X
    return out


def control1_holds(map_value):
    """Control 1 shows its weakness on a table when its relabelled closure MAP is at most 1/20, compared exactly."""
    if isinstance(map_value, bool):
        return map_value
    if isinstance(map_value, float):
        raise TypeError('control 1 compares the exact MAP (Fraction)')
    return Fraction(map_value) <= Fraction(1, 20)


# ================================================================ control 2: edge-shuffled training (A10.9)
def edge_pairs(rng, n, E):
    """A10.9: from one fresh generator, repeat a = below(n), b = below(n), rejecting a = b and any unordered pair
    already held, until E pairs; (a, b) is (anchor, positive); returned in order of (a, b)."""
    if E > n * (n - 1) // 2:
        raise ValueError('more pairs than unordered pairs')
    held, pairs = set(), []
    while len(pairs) < E:
        a = rng.below(n)
        b = rng.below(n)
        if a == b:
            continue
        key = (a, b) if a < b else (b, a)
        if key in held:
            continue
        held.add(key)
        pairs.append((a, b))
    return sorted(pairs)


def edge_pairs_seed(seed, n, E):
    return edge_pairs(prng.Rng(seed), n, E)


def edge_nonneighbours(n, pairs):
    """NN'(a) for every node: every node other than a that is paired with a in neither order (the pairs' own
    relation, no closure), ascending."""
    partners = [set() for _ in range(n)]
    for a, b in pairs:
        partners[a].add(b)
        partners[b].add(a)
    return [[v for v in range(n) if v != a and v not in partners[a]] for a in range(n)]


def control2_entry(iv_closure, iv_graph):
    """A10.9's test for one cell and seed: the per-node differences true - shuffled must have lo > 0 for closure AP
    and for graph-edge AP. None when either run of the pair diverged (no interval): not established."""
    if iv_closure is None or iv_graph is None:
        return None
    return iv_closure['lo'] > 0.0 and iv_graph['lo'] > 0.0


# ================================================================ control 3: the floor (A10.9)
def floor_table(seed, n, d, geometry):
    """Item 3's initial table from a fresh Rng(seed), left untrained: for node i = 0..n-1 and k = 1..d,
    x_ik = (2 random() - 1) 1e-3; Lorentz then x_i0 = sqrt(1 + sum_seq x_ik^2) (A10.4's arithmetic: a left-to-right
    sum of rounded squares, then 1 + the sum, then a correctly rounded sqrt). float64[n, d+1] (x0 first) or [n, d]."""
    if geometry not in GEOMETRIES:
        raise ValueError(f'unknown geometry {geometry!r}')
    rng = prng.Rng(seed)
    rows = []
    for _ in range(n):
        xs = [(2.0 * rng.random() - 1.0) * INIT_RANGE for _ in range(d)]
        if geometry == 'lorentz':
            s = xs[0] * xs[0]
            for x in xs[1:]:
                s = s + x * x
            rows.append([math.sqrt(1.0 + s)] + xs)
        else:
            rows.append(xs)
    return np.array(rows, dtype=np.float64)


def random_ranking_map(nb, n=None):
    """The expected MAP of a uniformly random ranking from the neighbour counts alone (A10.9, reported): for a query
    with k neighbours among N candidates, E[AP] = (1/N) sum_{j=1..N} (1 + (j-1)(k-1)/(N-1)) / j
    = (H_N + (k-1)(N - H_N)/(N-1)) / N (the fractional-tie AP of a ranking in which every candidate ties)."""
    n = len(nb) if n is None else n
    N = n - 1
    H = R.exact_sum(Fraction(1, j) for j in range(1, N + 1))
    vals = []
    for v in nb:
        k = len(v)
        if k == 0:
            continue
        vals.append((H + Fraction(k - 1, N - 1) * (N - H)) / N if N > 1 else Fraction(1))
    return R.exact_sum(vals) / len(vals)


# ================================================================ intervals (A10.7)
def keep_mask(graph_nb):
    """The queries that have graph-edge neighbours; one mask shared by every arm (the others have no AP)."""
    return [len(v) > 0 for v in graph_nb]


def frac_str(x):
    x = Fraction(x)
    return f'{x.numerator}/{x.denominator}'


def interval(ap_x, ap_y, keep=None):
    """One comparison X - Y at one seed (A10.7): rank.paired_diffs over the queries in offset order (only those with
    keep[i] true, for graph-edge), then rank.ci_mean of them, started afresh (default_rng(7), 10,000 resamples,
    percentiles 2.5 and 97.5). Also: n, whether lo <= mean <= hi (reported, decides nothing else), the SHA-256 of the
    values (repr(float) per value, LF-joined), and both exact MAPs over the same queries and their exact difference."""
    if len(ap_x) != len(ap_y):
        raise ValueError('the two AP lists differ in length')
    idx = range(len(ap_x)) if keep is None else [i for i, k in enumerate(keep) if k]
    X = [ap_x[i] for i in idx]
    Y = [ap_y[i] for i in idx]
    if any(a is None for a in X) or any(a is None for a in Y):
        raise ValueError('a kept query has no AP')
    values = R.paired_diffs(X, Y)
    mean, (lo, hi) = R.ci_mean(values)
    mx, my = R.map_exact(X), R.map_exact(Y)
    return {'mean': mean, 'lo': lo, 'hi': hi, 'n': len(values), 'ordered': lo <= mean <= hi,
            'values_sha': hashlib.sha256('\n'.join(repr(v) for v in values).encode()).hexdigest(),
            'map_x': frac_str(mx), 'map_y': frac_str(my), 'map_x_float': float(mx), 'map_y_float': float(my),
            'map_diff': frac_str(mx - my), 'map_diff_float': float(mx - my)}


# ================================================================ presence and the parts (A10.7)
def _exists(tables, key):
    if isinstance(tables, dict):
        return tables.get(key) is not None
    return key in tables


def present(comparison, seed, tables, control2):
    """A10.7: at seed s, a comparison is present when the learned tables it compares exist (no diverged run) and
    control 2 is established for each of their cells at s. tables: the existing measured tables, keyed
    (geometry, d, seed) (a set, or a dict whose value is None for a missing table). control2: (geometry, d, seed) ->
    True / False / None.
    READING (A10.9): "established" is "both runs of the pair exist" (A10.9 defines non-establishment by a diverged
    run alone), so an entry True or False is established and None (or absent) is not; a False voids L6 anyway
    (decide_l6). A cell without a frozen lr has no tables, hence no seed present."""
    for g, d in COMPARISON_CELLS[comparison]:
        key = (g, d, seed)
        if not _exists(tables, key):
            return False
        if control2.get(key) is None:
            return False
    return True


def _verdict(support, refute):
    """A10.7: a part that meets both its support and its refutation condition is inconclusive."""
    if support and refute:
        return 'inconclusive'
    if support:
        return 'supported'
    if refute:
        return 'refuted'
    return 'inconclusive'


def _all_present(ivs, required):
    return len(ivs) == required and all(iv is not None for iv in ivs)


def _seed_view(iv, **flags):
    if iv is None:
        return None
    out = {'mean': iv['mean'], 'lo': iv['lo'], 'hi': iv['hi'], 'ordered': iv['lo'] <= iv['mean'] <= iv['hi']}
    out.update(flags)
    return out


def _part(ivs, support_pred, refute_pred, required, names):
    ivs = list(ivs)
    per_seed = [_seed_view(iv, **{names[0]: support_pred(iv), names[1]: refute_pred(iv)}) if iv is not None else None
                for iv in ivs]
    n_present = sum(1 for iv in ivs if iv is not None)
    support = _all_present(ivs, required) and all(support_pred(iv) for iv in ivs)
    n_ref = sum(1 for iv in ivs if iv is not None and refute_pred(iv))
    refute = n_ref >= REFUTE_SEEDS
    return {'support': support, 'refute': refute, 'verdict': _verdict(support, refute), 'per_seed': per_seed,
            'present': n_present, 'refuting_seeds': n_ref}


def _above0(iv):
    return iv['lo'] > 0.0


def _mean_le0(iv):
    return iv['mean'] <= 0.0


def _within_band(iv):
    return iv['lo'] >= -0.02 and iv['hi'] <= 0.02


def _below0(iv):
    return iv['hi'] < 0.0


def _above_band(iv):
    return iv['lo'] > 0.02


def _c_support(iv):
    return iv['lo'] >= -0.01


def _c_refute(iv):
    return iv['mean'] < -0.05


def _reasons(name, p, rule_s, rule_r, required):
    r = [f'{name}: {p["present"]} of {required} seeds present']
    r.append(f'support ({rule_s} in all {required} seeds): {p["support"]}')
    r.append(f'refutation ({rule_r} in >= {REFUTE_SEEDS} seeds present): {p["refute"]} ({p["refuting_seeds"]} seeds)')
    if p['support'] and p['refute']:
        r.append('both conditions hold: inconclusive (A10.7)')
    return r


def part_a(ivs_by_d, required=5):
    """(a) Closure, Lorentz(d, s) - Euclidean(d, s). At each d in {2, 3}: supported if all five seeds are present
    with lo > 0, refuted if the mean is <= 0 in three or more seeds. (a) is refuted if refuted at either d,
    supported if supported at both, otherwise inconclusive.
    READING (A10.7): "a part that meets both its support and its refutation condition is inconclusive" is applied
    to the part, whose support condition is support at both d and whose refutation condition is the refutation
    condition at either d; the per-d verdicts (the same rule at each d) are reported."""
    per_d = {}
    for d in (2, 3):
        p = _part(ivs_by_d[d], _above0, _mean_le0, required, ('lo_above_0', 'mean_at_or_below_0'))
        p['reasons'] = _reasons(f'(a) d = {d}', p, 'lo > 0', 'mean <= 0', required)
        per_d[d] = p
    support = per_d[2]['support'] and per_d[3]['support']
    refute = per_d[2]['refute'] or per_d[3]['refute']
    reasons = per_d[2]['reasons'] + per_d[3]['reasons']
    if support and refute:
        reasons.append('(a): supported at both d and refuted at one: inconclusive (A10.7)')
    return {'verdict': _verdict(support, refute), 'support': support, 'refute': refute,
            'per_d': {d: {k: v for k, v in per_d[d].items() if k != 'per_seed'} for d in per_d},
            'per_seed': {d: per_d[d]['per_seed'] for d in per_d}, 'reasons': reasons}


def part_b(ivs, required=5):
    """(b) Closure, Lorentz(50, s) - Euclidean(50, s). Supported if all five seeds are present and each is within
    the band (lo >= -0.02 and hi <= 0.02) or entirely below 0 (hi < 0); refuted if lo > 0.02 in three or more."""
    p = _part(ivs, lambda iv: _within_band(iv) or _below0(iv), _above_band, required,
              ('within_band_or_below_0', 'above_band'))
    for v in p['per_seed']:
        if v is not None:
            v['within_band'] = v['lo'] >= -0.02 and v['hi'] <= 0.02
            v['below_0'] = v['hi'] < 0.0
    p['reasons'] = _reasons('(b)', p, '-0.02 <= lo and hi <= 0.02, or hi < 0', 'lo > 0.02', required)
    return p


def part_c(ivs, required=5):
    """(c) Graph-edge, exact - Lorentz(3, s). Supported if all five seeds are present with lo >= -0.01; refuted if
    the mean is < -0.05 in three or more seeds."""
    p = _part(ivs, _c_support, _c_refute, required, ('lo_at_or_above_-0.01', 'mean_below_-0.05'))
    p['reasons'] = _reasons('(c)', p, 'lo >= -0.01', 'mean < -0.05', required)
    return p


def part_d(ivs, required=5):
    """(d) Closure, Lorentz(3, s) - exact. Supported if all five seeds are present with lo > 0; refuted if the mean
    is <= 0 in three or more seeds."""
    p = _part(ivs, _above0, _mean_le0, required, ('lo_above_0', 'mean_at_or_below_0'))
    p['reasons'] = _reasons('(d)', p, 'lo > 0', 'mean <= 0', required)
    return p


def decide_l6(parts, control1, control2):
    """A10.7's precedence. parts: {'a': part_a(...), 'b': ..., 'c': ..., 'd': ...}; control1: {table: its exact
    relabelled closure MAP (or a bool: holds)}; control2: {(geometry, d, seed): True / False / None}.
    A failed control voids all four parts, before refutation: control 1 failing on any table (MAP > 1/20), or
    control 2 False in any cell and seed. A None in control 2 voids nothing (it makes seeds not present)."""
    c1_failed = sorted(str(k) for k, v in control1.items() if not control1_holds(v))
    c2_failed = sorted(k for k, v in control2.items() if v is False)
    c2_not_established = sorted(k for k, v in control2.items() if v is None)
    void = bool(c1_failed or c2_failed)
    reasons = []
    if c1_failed:
        reasons.append(f'control 1 failed on {len(c1_failed)} table(s): L6 is void (A10.9)')
    if c2_failed:
        reasons.append(f'control 2 failed in {len(c2_failed)} cell-seed(s): L6 is void (A10.9)')
    out = {}
    for name in ('a', 'b', 'c', 'd'):
        p = dict(parts[name])
        p['verdict_before_controls'] = p['verdict']
        if void:
            p['verdict'] = 'void'
        out[name] = p
    return {'parts': out, 'void': void, 'reasons': reasons,
            'control1': {'tables': len(control1), 'failed': c1_failed, 'holds': not c1_failed},
            'control2': {'entries': len(control2), 'failed': [list(k) for k in c2_failed],
                         'not_established': [list(k) for k in c2_not_established], 'holds': not c2_failed}}


# ================================================================ L4(c) (A10.10)
def _exact(x):
    if isinstance(x, float):
        raise TypeError('L4(c) compares exact rationals (Fraction), not floats')
    return Fraction(x)


def decide_l4c(deltas, expected=None):
    """A10.10: deltas is one entry per table, (|dMAP| closure, |dMAP| graph-edge) as exact Fractions, or None for a
    missing (diverged) table. A table's |dMAP| is the larger of its two. Supported if no table is missing and the
    largest is <= 1/1000; refuted if any present table exceeds 1/100; otherwise inconclusive."""
    deltas = list(deltas)
    if expected is not None and len(deltas) != expected:
        raise ValueError(f'{len(deltas)} tables, not {expected}')
    values = [None if t is None else max(_exact(t[0]), _exact(t[1])) for t in deltas]
    pres = [v for v in values if v is not None]
    missing = sum(1 for v in values if v is None)
    largest = max(pres) if pres else None
    support = missing == 0 and largest is not None and largest <= Fraction(1, 1000)
    refute = any(v > Fraction(1, 100) for v in pres)
    reasons = [f'{len(pres)} of {len(values)} tables present', f'largest |dMAP| {largest}']
    return {'verdict': _verdict(support, refute), 'support': support, 'refute': refute, 'values': values,
            'largest': largest, 'missing': missing,
            'above_1_1000': sum(1 for v in pres if v > Fraction(1, 1000)),
            'above_1_100': sum(1 for v in pres if v > Fraction(1, 100)), 'reasons': reasons}


# ================================================================ prediction (a)'s gap (A10.7)
def prediction_gap(maps_l, maps_e, present_flags=None, a_verdict=None):
    """At d in {2, 3}: the exact mean over the seeds present of MAP(Lorentz(d, s)) - MAP(Euclidean(d, s)), exact
    snapped closure MAPs, and per seed. maps_l[d][j], maps_e[d][j]: Fraction or None; present_flags[d][j] (default:
    both MAPs exist). The prediction holds if (a) is supported and the gap is at least 1/5 at both d."""
    out = {}
    for d in (2, 3):
        per_seed, diffs = [], []
        for j, (ml, me) in enumerate(zip(maps_l[d], maps_e[d])):
            pres = (ml is not None and me is not None) if present_flags is None else present_flags[d][j]
            if pres:
                diff = _exact(ml) - _exact(me)
                diffs.append(diff)
                per_seed.append(diff)
            else:
                per_seed.append(None)
        mean = R.exact_sum(diffs) / len(diffs) if diffs else None
        out[d] = {'mean': mean, 'per_seed': per_seed, 'seeds_present': len(diffs),
                  'at_least_1_5': mean is not None and mean >= Fraction(1, 5)}
    out['holds'] = a_verdict == 'supported' and out[2]['at_least_1_5'] and out[3]['at_least_1_5']
    return out


# ================================================================ LBENCH/1 (A10.12, Amendment 7 item 3)
LBENCH_FIELDS = ('instanceId', 'instanceSha', 'arm', 'geometry', 'd', 'seed', 'lr', 'protocolSha', 'settingsSha',
                 'budget', 'floatTableSha', 'snapBits', 'snapSha', 'closureMapSha', 'graphMapSha', 'closureMap',
                 'graphMap', 'track', 'engine', 'wallMs')
LBENCH_ARMS = ('tuning', 'learned', 'edge-shuffled', 'floor', 'exact-h3')
LBENCH_GEOMETRIES = ('lorentz', 'euclid', 'h3')


def lbench(**fields):
    """One LBENCH/1 record: 'LBENCH/1|L6/1|' + the 20 fields of A10.12 in order, 22 pipe-separated fields in all;
    None stands for a field that does not apply and is written '-'. snapBits defaults to '32' and track to 'cpu';
    every other field must be given (None for '-'). Returns (record, lowercase hex SHA-256 of its UTF-8 bytes).
    READING (A10.12): the template's literal '32' is a field ("Fields that do not apply are -"); the exact arm,
    which is not snapped, writes '-' there."""
    fields = dict(fields)
    fields.setdefault('snapBits', '32')
    fields.setdefault('track', 'cpu')
    unknown = set(fields) - set(LBENCH_FIELDS)
    missing = set(LBENCH_FIELDS) - set(fields)
    if unknown or missing:
        raise ValueError(f'LBENCH/1 fields: unknown {sorted(unknown)}, missing {sorted(missing)}')
    if fields['arm'] not in LBENCH_ARMS:
        raise ValueError(f"unknown arm {fields['arm']!r}")
    if fields['geometry'] not in LBENCH_GEOMETRIES:
        raise ValueError(f"unknown geometry {fields['geometry']!r}")
    vals = []
    for name in LBENCH_FIELDS:
        v = fields[name]
        v = '-' if v is None else str(v)
        if v == '' or '|' in v or '\n' in v or '\r' in v:
            raise ValueError(f'LBENCH/1 field {name} = {v!r}: empty, or holds a separator')
        vals.append(v)
    rec = '|'.join(['LBENCH/1', 'L6/1'] + vals)
    assert rec.count('|') == 21
    return rec, hashlib.sha256(rec.encode('utf-8')).hexdigest()


def parse_lbench(record):
    f = record.split('|')
    if len(f) != 22 or f[0] != 'LBENCH/1' or f[1] != 'L6/1':
        raise ValueError('not an LBENCH/1 L6/1 record of 22 fields')
    return dict(zip(LBENCH_FIELDS, f[2:]))


def budget(E, epochs=EPOCHS, burnin=BURNIN, negs=NEGS, batch=BATCH):
    """'epochs,burnin,negatives,batch,steps,negativeDraws': steps = epochs x ceil(E / batch) (the short last batch
    kept), negativeDraws = epochs x E x negatives. 6,542 pairs: 1000,20,50,50,131000,327100000."""
    steps = epochs * (-(-E // batch))
    return f'{epochs},{burnin},{negs},{batch},{steps},{epochs * E * negs}'


def map_sha(F):
    """The SHA-256 of an exact MAP written p/q in lowest terms."""
    return hashlib.sha256(frac_str(F).encode()).hexdigest()


def map_display(F):
    return format(float(F), '.6f')


def instance_sha(offsets):
    """The SHA-256 of the set's offsets, LF-joined, no final LF (the registered c4748ce2... for the mammals)."""
    return hashlib.sha256('\n'.join(offsets).encode()).hexdigest()


def exact_arm_snap_text(offsets, words):
    """The exact arm's snapSha text: the canonical H3 point lines of Amendment 1 item 6 for the set,
    'offset H3 c0 c1 c2 c3' (coordinates in lowest terms, p/q), LF-joined, no final LF."""
    from . import h3tree as H3
    pts = H3.points(words)
    return '\n'.join(f'{o} H3 {H3.coords_text(X, H3.den(len(w)))}' for o, w, X in zip(offsets, words, pts))


def engine_string():
    """For example python-3.13.18/numpy-2.5.3/numba-0.68.1 (numba's version read from its metadata, not imported)."""
    from importlib import metadata
    try:
        nb = metadata.version('numba')
    except metadata.PackageNotFoundError:
        nb = 'none'
    return f'python-{platform.python_version()}/numpy-{np.__version__}/numba-{nb}'


# ================================================================ the protocol pin (A10.12)
PROTOCOL_FILE = os.path.join(GOLDEN, 'l6_protocol_v1.txt')
PROTOCOL_SHA = '1267ebb2dde4f4c3942bce4c833b61ac150199dc0319bb2acdfa5300ab7e34db'
PREREGISTRATION = os.path.join(os.path.dirname(REFERENCE), 'PREREGISTRATION.md')
_HEADING = re.compile(r'#{1,3} ')
_AMENDMENT = re.compile(r'### Amendment (\d+) ·')


def _lines(text):
    return [line[:-1] if line.endswith('\r') else line for line in text.split('\n')]


def _sections(text):
    """[(n, [lines])] for every '### Amendment n ·' section: from its heading up to the next heading of level 1-3
    (or the end), trailing blank lines dropped."""
    lines = _lines(text)
    out = []
    for i, line in enumerate(lines):
        m = _AMENDMENT.match(line)
        if not m:
            continue
        j = i + 1
        while j < len(lines) and not _HEADING.match(lines[j]):
            j += 1
        sec = lines[i:j]
        while sec and sec[-1].strip() == '':
            sec.pop()
        out.append((int(m.group(1)), sec))
    return out


def amendment_section(prereg_text, n):
    """Amendment n of PREREGISTRATION.md verbatim from its heading: up to, not including, the next heading of level
    1-3 (the next amendment) or the end of the file, trailing blank lines dropped, LF line ends, one final LF.
    READING (A10.12): the section ends at the next Markdown heading of its level or above; for Amendment 10 that is
    the next '### Amendment' line or the end of the file, as the build spec says."""
    found = [sec for m, sec in _sections(prereg_text) if m == n]
    if len(found) != 1:
        raise ValueError(f'{len(found)} sections headed Amendment {n}')
    return '\n'.join(found[0]) + '\n'


def protocol_text(prereg_path=PREREGISTRATION):
    with open(prereg_path, encoding='utf-8') as fh:
        return amendment_section(fh.read(), 10)


def protocol_sha(path=PROTOCOL_FILE):
    """The SHA-256 of golden/l6_protocol_v1.txt, refused unless it is the pinned PROTOCOL_SHA."""
    with open(path, 'rb') as fh:
        h = hashlib.sha256(fh.read()).hexdigest()
    if h != PROTOCOL_SHA:
        raise ValueError(f'{path} has SHA-256 {h}, not the pinned {PROTOCOL_SHA}')
    return h


# ================================================================ the lr freeze (A10.8)
def freeze_amendment(prereg_text, settings_sha):
    """The number of the one amendment whose section holds settings.json's SHA-256 (64 lowercase hex digits, not
    part of a longer hex run). Raises unless exactly one section holds it, or if that amendment is not after
    Amendment 10.
    READING (A10.8, "Amendment 11, unless a definitions amendment comes first"): the lr freeze is found by its
    content, not its number, and must come after Amendment 10."""
    sha = settings_sha.lower()
    if not re.fullmatch(r'[0-9a-f]{64}', sha):
        raise ValueError('not a SHA-256')
    pat = re.compile(r'(?<![0-9a-fA-F])' + sha + r'(?![0-9a-fA-F])')
    hits = [n for n, sec in _sections(prereg_text) if pat.search('\n'.join(sec).lower())]
    if len(hits) != 1:
        raise ValueError(f'settings SHA-256 {sha} found in {len(hits)} amendment sections {hits}, not exactly one')
    if hits[0] <= 10:
        raise ValueError(f'the lr freeze must come after Amendment 10, found in Amendment {hits[0]}')
    return hits[0]


def settings_path(mode, out=None):
    """registered: reference/settings.json; dry: reference/results/dry/settings.json; selftest: <out>/settings.json."""
    if mode == 'registered':
        return os.path.join(REFERENCE, 'settings.json')
    if mode == 'dry':
        return os.path.join(REFERENCE, 'results', 'dry', 'settings.json')
    if mode == 'selftest':
        if out is None:
            raise ValueError('the self-test writes its settings under its output folder')
        return os.path.join(out, 'settings.json')
    raise ValueError(f'unknown mode {mode!r}')


def settings_text(rates, tuning, cells=CELLS):
    """settings.json: {"L6": {"lr": {geometry: {str(d): rate or null}}}, "tuning": {...}}, sorted keys, indent 1,
    LF, final LF. rates: {(geometry, d): grid string or None} for every cell."""
    lr = {}
    for g, d in cells:
        r = rates[(g, d)]
        if r is not None:
            _rate_index(r)
        lr.setdefault(g, {})[str(d)] = r
    return json.dumps({'L6': {'lr': lr}, 'tuning': tuning}, sort_keys=True, indent=1, ensure_ascii=False) + '\n'


def read_settings(text, cells=CELLS):
    """The frozen rate of every cell, {(geometry, d): grid string or None}, after a schema check: exactly the cells,
    each a grid string or null."""
    obj = json.loads(text)
    lr = obj['L6']['lr']
    want = {}
    for g, d in cells:
        want.setdefault(g, set()).add(str(d))
    if set(lr) != set(want) or any(set(lr[g]) != want[g] for g in want):
        raise ValueError('settings.json: the cells are not the expected ones')
    out = {}
    for g, d in cells:
        r = lr[g][str(d)]
        if r is not None:
            if not isinstance(r, str):
                raise ValueError(f'settings.json: cell ({g}, {d}) holds {r!r}, not a grid string')
            _rate_index(r)
        out[(g, d)] = r
    return out


def sha256_file(path):
    with open(path, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()
