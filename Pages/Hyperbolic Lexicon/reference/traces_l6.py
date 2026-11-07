"""Write the L6 trace the browser core must reproduce line for line before it re-evaluates the measured snapped tables
(PREREGISTRATION.md Amendment 10 item 11, "the Node re-evaluation"; the Common rules, "Authority"):

    traces/l6_v1.txt   18 toy cases, case i from Rng(8000 + i), i = 0..17: a small synthetic DAG (its closure and
                       graph-edge neighbour sets), a table, its snapped text (A10.6), and the table ranked exactly by
                       lexicon.learned's evaluator: per query the pessimistic closure and graph-edge APs (p/q), the
                       neighbour ranks and the rank-list SHA-256; per case both MAPs (p/q, with the SHA-256 that
                       LBENCH/1 records), the pooled mean ranks and the number of exact ties

    python3 -B traces_l6.py            (from this folder)
    python3 -B traces_l6.py --check    rebuild in memory and compare bytes with the committed file (exit 0 equal,
                                       1 different)

The cases (i mod 6 gives the cell, i div 6 the kind):
    geometry  lorentz for even i, euclid for odd i;  d = (2, 3, 5)[(i mod 6) div 2]
    i = 0..5    float, K = 32   a float64 table drawn from the generator, snapped by learned.snap at 2^-32
    i = 6..11   float, K = 8    the same draws snapped at 2^-8 (A10.10's coarse snap): many exact ties
    i = 12..17  grid,  K = 32   integer rows drawn directly, with planted exact ties (duplicates, signed coordinate
                                permutations, the origin) and near-ties: rows (m, c, 0, ...) with c < 4 and
                                m ~ 3.04e9, so |n|^2 ~ 2^63, where a binary64 kappa cannot tell m^2 from m^2 + 1

The draws, all from one Rng(8000 + i), in this order and by nothing else (lexicon_core.js's l6TraceLines repeats them):
    n = 20 + below(25); offset j = 10000000 + 1000 j + below(1000), as 8 digits (strictly increasing)
    node j = 1..n-1: p1 = below(j), p2 = below(j), o = below(10), s = below(4), q = below(j), always all five.
        Its first parent is p = min(p1, p2); a second parent q when s = 0 and q != p. When j >= 2 and o = 0 its
        spanning parent lies outside the set ("x"; it stays in the set through p, as six mammal nodes do), else it
        is p. The root is node 0. Closure neighbours are the closure ancestors and descendants inside the set
        (rank.closure_neighbours), graph-edge neighbours the spanning parent and children inside
        (rank.graph_neighbours), so a node with an outside spanning parent and no children has no graph-edge AP.
    float rows j = 0..n-1: t = below(6), src = below(j + 1); if t = 0 and src < j the row repeats row src exactly;
        else scale = SCALES[geometry][below(7)] and x_k = (2 random() - 1) scale for k = 1..d. A Lorentz row is
        (x0, x1, ..., xd) with x0 = sqrt(1 + sum_seq x_k^2), the sum from left to right.
    grid: first m = 3037000000 + below(400); then rows j = 0..n-1: t = below(10), src = below(j + 1);
        t = 0, src < j: row src repeated;  t = 1, src < j: row src under perm = shuffle([0..d-1]) and signs
        below(2) per coordinate (coordinate k = +-row_src[perm[k]], minus when the sign draw is 1);  t = 2: the
        origin;  t = 3 or 4: (m, below(4), 0, ..., 0);  otherwise n_k = below(2^31 + 1) - 2^30 for k = 1..d.
        Every grid row has |n|^2 < 4^32, so it is a Lorentz snap as it stands.

READING (A10.11, "traces on Rng(8000 + i) toy tables"): case i draws everything from Rng(8000 + i), i = 0..17, the
literal seeds (other traces draw from 8000 + i too, as Amendment 1 item 10 allows: no claim uses them). "Toy tables" is
read as tables of the kinds the re-evaluation will meet, small: float tables snapped at 2^-32 (with rim step-ins and
learned.snap's Fraction path), the same at A10.10's coarse 2^-8 (many exact ties), and integer tables drawn directly
with planted exact ties and binary64 near-ties, so that the exact tie handling, and the control in
tests/parity-lexicon.cjs (a binary64 key in place of the exact one), are exercised by the trace itself. The ties count
is learned.evaluate's (its READING: per query, candidates minus distinct keys).

Seeds 8000 + i are the traces' own (Amendment 1 item 10): no claim uses them. No mammal (or other registered) data is
read, and no registered seed is drawn. Lines starting with '#' are comments; every other line is space-separated.
Nothing here decides a claim.
"""
import hashlib
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.set_int_max_str_digits(0)

import lexicon  # noqa: E402,F401
import numpy as np  # noqa: E402
from hpstep.prng import Rng  # noqa: E402
from lexicon import learned as LN  # noqa: E402
from lexicon import rank as R  # noqa: E402

OUT = os.path.join(HERE, 'traces')
NAME = 'l6_v1.txt'
SEED = 8000
CASES = 18
GEOMETRIES = ('lorentz', 'euclid')
DIMS = (2, 3, 5)
SCALES = {'lorentz': (1e-3, 0.1, 1.0, 4.0, 30.0, 1e4, 1e11),     # 1e11: Poincare points within 1e-11 of the rim
          'euclid': (1e-3, 0.1, 1.0, 4.0, 30.0, 1e4, 1e7)}        # 1e7 > 2^20: learned.snap's exact Fraction path
HEAD = [
    '# l6_v1: snapped toy tables ranked exactly (Amendment 10 items 6 and 11). Case i from Rng(8000 + i), i = 0..17:',
    '# float (i < 6: K = 32; i < 12: K = 8) or grid (K = 32), lorentz for even i, d = 2, 3, 5 by (i mod 6) div 2.',
    '# "<i> case <kind> <geometry> <d> <K> <n>"; "<i> node <offset> <spanning parent: index, x outside, - root>',
    '# <parents> <closure neighbours> <graph neighbours>" (indices; "-" if none); "<i> floatsha <sha256>" (float',
    '# cases: the table\'s little-endian bytes); "<i> snap <offset> <n_1 ... n_d>" (the snapped text) and',
    '# "<i> snapsha <sha256>"; "<i> ap <offset> <closure AP> <graph AP> <rank-list sha256>" and "<i> ranks <offset>',
    '# <closure ranks> <graph ranks>" (pessimistic ties); "<i> map closure|graph <p/q> <sha256 of p/q>";',
    '# "<i> meanrank <closure> <graph>" (pooled); "<i> ties <candidates minus distinct keys, summed over queries>"',
]


def q(x):
    return f'{x.numerator}/{x.denominator}' if x is not None else '-'


def ints(xs):
    return ','.join(str(x) for x in xs) or '-'


def case_spec(i):
    kind = 'float' if i < 12 else 'grid'
    K = 8 if 6 <= i < 12 else 32
    return kind, GEOMETRIES[i % 2], DIMS[(i % 6) // 2], K


def draw_dag(rng):
    """n, offsets, spanning parent (index, 'x' or None), inside parents (sorted indices)."""
    n = 20 + rng.below(25)
    offsets = ['%08d' % (10000000 + 1000 * j + rng.below(1000)) for j in range(n)]
    span, parents = [None], [[]]
    for j in range(1, n):
        p1, p2, o, s, qq = rng.below(j), rng.below(j), rng.below(10), rng.below(4), rng.below(j)
        p = min(p1, p2)
        ps = [p] + ([qq] if s == 0 and qq != p else [])
        parents.append(sorted(ps))
        span.append('x' if j >= 2 and o == 0 else p)
    return n, offsets, span, parents


def neighbour_sets(offsets, span, parents):
    n = len(offsets)
    anc = [set() for _ in range(n)]
    for j in range(n):                                   # parents have smaller indices: one forward pass
        for p in parents[j]:
            anc[j].add(p)
            anc[j] |= anc[p]
    anc_m = {offsets[j]: {offsets[a] for a in anc[j]} for j in range(n)}
    desc_m = {o: set() for o in offsets}
    for o, a in anc_m.items():
        for x in a:
            desc_m[x].add(o)
    parent = {offsets[j]: (None if span[j] is None else 'outside' if span[j] == 'x' else offsets[span[j]])
              for j in range(n)}
    children = {}
    for o, p in parent.items():
        if p is not None and p != 'outside':
            children.setdefault(p, []).append(o)
    return R.closure_neighbours(offsets, anc_m, desc_m), R.graph_neighbours(offsets, parent, children)


def draw_float_table(rng, n, geometry, d):
    rows = []
    for j in range(n):
        t, src = rng.below(6), rng.below(j + 1)
        if t == 0 and src < j:
            rows.append(list(rows[src]))
            continue
        scale = SCALES[geometry][rng.below(7)]
        xs = [(2 * rng.random() - 1) * scale for _ in range(d)]
        if geometry == 'lorentz':
            acc = 0.0
            for x in xs:
                acc = acc + x * x
            xs = [math.sqrt(1 + acc)] + xs
        rows.append(xs)
    return np.array(rows, dtype=np.float64)


def draw_grid(rng, n, d):
    m = 3037000000 + rng.below(400)
    rows = []
    for j in range(n):
        t, src = rng.below(10), rng.below(j + 1)
        if t == 0 and src < j:
            rows.append(tuple(rows[src]))
        elif t == 1 and src < j:
            perm = rng.shuffle(list(range(d)))
            signs = [rng.below(2) for _ in range(d)]
            rows.append(tuple(-rows[src][perm[k]] if signs[k] else rows[src][perm[k]] for k in range(d)))
        elif t == 2:
            rows.append((0,) * d)
        elif t in (3, 4):
            rows.append((m, rng.below(4)) + (0,) * (d - 2))
        else:
            rows.append(tuple(rng.below(2 ** 31 + 1) - 2 ** 30 for _ in range(d)))
    return rows


def case_lines(i):
    kind, geometry, d, K = case_spec(i)
    rng = Rng(SEED + i)
    n, offsets, span, parents = draw_dag(rng)
    c_nb, g_nb = neighbour_sets(offsets, span, parents)
    lines = [f'{i} case {kind} {geometry} {d} {K} {n}']
    for j in range(n):
        sp = '-' if span[j] is None else str(span[j])
        lines.append(f'{i} node {offsets[j]} {sp} {ints(parents[j])} {ints(c_nb[j])} {ints(g_nb[j])}')
    if kind == 'float':
        X = draw_float_table(rng, n, geometry, d)
        lines.append(f'{i} floatsha {LN.float_table_sha(X)}')
        N = LN.snap(X, geometry, K)
    else:
        N = draw_grid(rng, n, d)
    text = LN.snap_text(offsets, N)
    offs2, N2 = LN.parse_snap_text(text)
    assert offs2 == offsets and N2 == [tuple(r) for r in N]
    lines.extend(f'{i} snap {t}' for t in text.split('\n'))
    lines.append(f'{i} snapsha {LN.snap_sha(text)}')
    arm = LN.snapped_arm(N2, geometry, K)
    ev = LN.evaluate(arm, {'closure': c_nb, 'graph': g_nb})
    if geometry == 'lorentz':                   # the Fraction keys themselves give the same answers (A10.6)
        ef = LN.evaluate(LN.DyadicLorentzArm(N2, K, key='fraction'), {'closure': c_nb, 'graph': g_nb})
        assert ef.aps == ev.aps and ef.ranks == ev.ranks and ef.ties == ev.ties
    for u in range(n):
        sha = R.rank_query(arm, u, [], offsets, 'sha').sha
        lines.append(f'{i} ap {offsets[u]} {q(ev.aps["closure"][u])} {q(ev.aps["graph"][u])} {sha}')
        lines.append(f'{i} ranks {offsets[u]} {ints(ev.ranks["closure"][u])} {ints(ev.ranks["graph"][u])}')
    for name in ('closure', 'graph'):
        s = q(ev.map[name])
        lines.append(f'{i} map {name} {s} {hashlib.sha256(s.encode()).hexdigest()}')
    lines.append(f'{i} meanrank {q(ev.mean_rank["closure"])} {q(ev.mean_rank["graph"])}')
    lines.append(f'{i} ties {ev.ties}')
    return lines


def trace():
    lines = list(HEAD)
    for i in range(CASES):
        lines.extend(case_lines(i))
    return lines


def text_of(lines):
    return '\n'.join(lines) + '\n'


def main():
    lines = trace()
    text = text_of(lines)
    path = os.path.join(OUT, NAME)
    if '--check' in sys.argv[1:]:
        if not os.path.exists(path) or open(path, 'rb').read() != text.encode('utf-8'):
            print(f'MISMATCH: {NAME}', file=sys.stderr)
            return 1
        print(f'trace matches: {NAME} ({len(lines)} lines, sha256 {hashlib.sha256(text.encode()).hexdigest()[:16]})')
        return 0
    os.makedirs(OUT, exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print(f'{NAME}: {len(lines)} lines, sha256 {hashlib.sha256(text.encode()).hexdigest()}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
