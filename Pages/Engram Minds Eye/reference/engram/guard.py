"""A sharper guard (claim E10, Amendment 2 of ../../PREREGISTRATION.md).

The guard of Hyperbolic PolyStep (hpstep.fence.guard_check) counts, for every quadruple whose four-point defect
exceeds ln 2, all six of its pairs, and ranks pairs by that count, ties by pair index. After one stored distance is
raised, every quadruple above ln 2 holds the corrupted pair in its largest matching sum (the proposition of E10),
so the *matching guard* counts only the two pairs of that largest matching. The control blames the two pairs of the
smallest matching instead.

All three are computed in one pass over every quadruple, with numpy. The defects are the same floating-point
operations as guard_check's (the three pair sums, sorted, the top two subtracted and halved), and the runner
checks the original guard against guard_check itself.
"""
from itertools import combinations

import numpy as np
from hpstep import fence as Fz

LN2, TOL = Fz.LN2, 1e-9
MATCHINGS = ((0, 1, 2, 3), (0, 2, 1, 3), (0, 3, 1, 2))        # (i,j)+(k,l), (i,k)+(j,l), (i,l)+(j,k)
SIX = ((0, 1), (0, 2), (0, 3), (1, 2), (1, 3), (2, 3))
_Q = {}


def quads(N):
    """Every quadruple i < j < k < l, in guard_check's order."""
    if N not in _Q:
        _Q[N] = np.array(list(combinations(range(N), 4)), dtype=np.int64)
    return _Q[N]


def scan(E, tol=TOL):
    """The three matching sums of every quadruple, its defect, and whether it exceeds ln 2 + tol."""
    E = np.asarray(E, dtype=float)
    Q = quads(len(E))
    S = np.stack([E[Q[:, a], Q[:, b]] + E[Q[:, c], Q[:, d]] for a, b, c, d in MATCHINGS], axis=1)
    Ss = np.sort(S, axis=1)
    dfx = (Ss[:, 2] - Ss[:, 1]) * 0.5
    return Q, S, dfx, dfx > LN2 + tol


def _top(counts, N, keep=6):
    nz = np.nonzero(counts)[0]
    order = sorted(nz, key=lambda p: (-int(counts[p]), int(p)))          # pair id a*N + b orders pairs as (a, b)
    return [((int(p) // N, int(p) % N), int(counts[p])) for p in order[:keep]]


def guards(E, tol=TOL):
    """The original, matching and smallest-matching guards on matrix E. Each is its top pairs [((a, b), count)]."""
    N = len(E)
    Q, S, dfx, above = scan(E, tol)
    A, Sa, bad = Q[above], S[above], int(above.sum())
    empty = np.zeros(N * N, dtype=np.int64)

    def count(ids):
        return np.bincount(np.concatenate(ids), minlength=N * N) if bad else empty

    orig = count([A[:, a] * N + A[:, b] for a, b in SIX])

    def matching(which):
        ids = []
        for m, (a, b, c, d) in enumerate(MATCHINGS):
            sel = which == m
            ids += [A[sel, a] * N + A[sel, b], A[sel, c] * N + A[sel, d]]
        return count(ids)

    mx, mn = np.argmax(Sa, axis=1), np.argmin(Sa, axis=1)
    return {'bad': bad, 'worst': float(dfx.max()), 'original': _top(orig, N), 'matching': _top(matching(mx), N),
            'smallest': _top(matching(mn), N), 'above': A, 'largest': mx, 'orig_counts': orig}


def first(top):
    return top[0][0] if top else None


def alone(top):
    """The top pair, if it is alone at the top count."""
    if not top:
        return None
    return top[0][0] if len(top) == 1 or top[0][1] > top[1][1] else None


def checks(E, pair, tol=TOL):
    """Everything E10 records of one corrupted matrix whose corrupted pair is `pair`."""
    g = guards(E, tol)
    a, b = pair
    A, mx = g['above'], g['largest']
    # E10a: the corrupted pair is in the largest matching of every quadruple above ln 2
    in_largest = True
    for m, (p, q, r, s) in enumerate(MATCHINGS):
        sel = A[mx == m]
        if len(sel):
            hit = ((sel[:, p] == a) & (sel[:, q] == b)) | ((sel[:, r] == a) & (sel[:, s] == b))
            in_largest = in_largest and bool(hit.all())
    N = len(E)
    top_count = g['original'][0][1] if g['original'] else 0
    orig_first = first(g['original'])
    tie_or_none = g['bad'] == 0 or int(g['orig_counts'][a * N + b]) == top_count
    return {
        'bad': g['bad'], 'worst': g['worst'],
        'e10a': in_largest,
        'e10c': orig_first == pair or tie_or_none,
        'e10d': g['bad'] < 2 or alone(g['matching']) == pair,
        'control_e10d': g['bad'] < 2 or alone(g['smallest']) == pair,
        'matching_named': alone(g['matching']) == pair,
        'original_first': orig_first == pair,
        'original_alone': alone(g['original']) == pair,
        'original_top': g['original'][:2], 'matching_top': g['matching'][:2],
    }
