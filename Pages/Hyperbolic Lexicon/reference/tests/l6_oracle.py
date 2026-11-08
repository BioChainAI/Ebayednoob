"""A 60-digit Decimal oracle for one batch of Amendment 10 item 4 (a helper for tests/test_embed.py, not a test).

From the definitions, not from the trainer's formulas: the batch loss is the mean over rows of
d_0 + ln sum_j exp(-d_j), with d = arcosh(z), z = -<u, c>_L (Lorentz) or d = |u - c|^2 (Euclidean). Its ambient
gradient e (the derivative in every stored coordinate, x0 included) is taken analytically; the Lorentz step is minus
eta times the tangent projection of the Minkowski gradient h = J e (J = diag(-1, 1, ..., 1)), then the exact exp map
and x0 recomputed from the spatial coordinates; the Euclidean step is x - eta e. The float inputs (table, eta) are read
exactly. Used torch-free in place of the geoopt cross-check (item 11).

    batch_loss(P, rows, geometry)            P: {node: [Decimal]}, rows: [(u, [c_0, ..., c_50])]
    ambient_gradient(P, rows, geometry)      {node: [Decimal]} = d(batch loss)/d(coordinate)
    step(X, U, C, eta, geometry)             {node: [Decimal]}: the stepped rows of every node met
"""
from decimal import Decimal, localcontext

PREC = 60


def _acosh(z):
    return (z + (z * z - 1).sqrt()).ln()


def _cosh_sinh(t):
    a, b = t.exp(), (-t).exp()
    return (a + b) / 2, (a - b) / 2


def _z(a, b):
    return a[0] * b[0] - sum((x * y for x, y in zip(a[1:], b[1:])), Decimal(0))


def _dist(a, b, geometry):
    if geometry == 'lorentz':
        return _acosh(_z(a, b))
    return sum(((x - y) ** 2 for x, y in zip(a, b)), Decimal(0))


def points(X, nodes):
    return {int(v): [Decimal(float(t)) for t in X[v]] for v in nodes}


def rows_of(U, C):
    return [(int(u), [int(c) for c in cs]) for u, cs in zip(U, C)]


def batch_loss(P, rows, geometry):
    with localcontext() as ctx:
        ctx.prec = PREC
        tot = Decimal(0)
        for u, cands in rows:
            ds = [_dist(P[u], P[c], geometry) for c in cands]
            tot += ds[0] + sum(((-d).exp() for d in ds), Decimal(0)).ln()
        return tot / len(rows)


def ambient_gradient(P, rows, geometry):
    """d(batch loss)/dx for every coordinate of every node met: for each row, dl/dd_j = [j = 0] - softmax_j(-d),
    divided by B; dd/dz = 1/sqrt(z^2 - 1) and dz/du = (c0, -c1, ..., -cd) (Lorentz); dd/du = 2 (u - c) (Euclidean)."""
    with localcontext() as ctx:
        ctx.prec = PREC
        B = len(rows)
        e = {v: [Decimal(0)] * len(x) for v, x in P.items()}
        for u, cands in rows:
            ds = [_dist(P[u], P[c], geometry) for c in cands]
            ex = [(-d).exp() for d in ds]
            S = sum(ex, Decimal(0))
            for j, c in enumerate(cands):
                dl = ((1 if j == 0 else 0) - ex[j] / S) / B
                if geometry == 'lorentz':
                    z = _z(P[u], P[c])
                    g = dl / (z * z - 1).sqrt()
                    du = [P[c][0]] + [-t for t in P[c][1:]]
                    dc = [P[u][0]] + [-t for t in P[u][1:]]
                else:
                    du = [2 * (x - y) for x, y in zip(P[u], P[c])]
                    dc = [-t for t in du]
                    g = dl
                e[u] = [a + g * b for a, b in zip(e[u], du)]
                e[c] = [a + g * b for a, b in zip(e[c], dc)]
        return e


def step(X, U, C, eta, geometry):
    """The stepped rows of every node met in the batch, in 60 digits. X row-major float64; eta the float rate."""
    rows = rows_of(U, C)
    nodes = sorted({u for u, _ in rows} | {c for _, cs in rows for c in cs})
    P = points(X, nodes)
    e = ambient_gradient(P, rows, geometry)
    with localcontext() as ctx:
        ctx.prec = PREC
        lr = Decimal(float(eta))
        out = {}
        for v in nodes:
            x, g = P[v], e[v]
            if geometry == 'euclid':
                out[v] = [a - lr * b for a, b in zip(x, g)]
                continue
            h = [-g[0]] + g[1:]                                   # the Minkowski gradient J e
            ip = -x[0] * h[0] + sum((a * b for a, b in zip(x[1:], h[1:])), Decimal(0))     # <x, h>_L
            w = [-lr * (a + ip * b) for a, b in zip(h, x)]          # -eta (h + <x, h>_L x)
            nu = -w[0] * w[0] + sum((t * t for t in w[1:]), Decimal(0))
            if nu <= 0:
                xs = x[1:]
            else:
                t = nu.sqrt()
                ch, sh = _cosh_sinh(t)
                xs = [ch * a + sh / t * b for a, b in zip(x[1:], w[1:])]
            out[v] = [(1 + sum((s * s for s in xs), Decimal(0))).sqrt()] + list(xs)
        return out


def max_row_error(X_new, out):
    """READING (spec 3.2, "the relative error of the updated rows"): the largest, over the rows of `out`, of
    max_k |float - decimal| / max_k |decimal|, the error relative to the row."""
    worst = Decimal(0)
    for v, row in out.items():
        scale = max(abs(t) for t in row)
        err = max(abs(Decimal(float(a)) - b) for a, b in zip(X_new[v], row))
        worst = max(worst, err / scale)
    return float(worst)
