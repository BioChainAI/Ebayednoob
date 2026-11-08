"""A slow second implementation of Amendment 10 items 3-5 (a helper for tests/test_embed.py, not a test).

It is written from the amendment's text, not from lexicon/embed.py: plain Python floats for + - * / and math.sqrt,
one row, one term and one node at a time, every sum a left-to-right loop. numpy's exp, log1p, cosh and sinh are the
only numpy calls on the arithmetic path, and they get the arrays item 4 names: the batch's (B, 51) matrices, and the
touched nodes' tau in ascending node order (the elementary functions are numpy's by definition, item 4).

    train_ref(inst, geometry, d, lr, seed, epochs, burnin, batch=50, negs=50, stream_cls=PyStream, init_hook=None)
        -> (table as a list of row lists, or None if diverged; diverged epoch; guard hits; largest step; final state)
"""
import math

import numpy as np

from lexicon.pystream import PyStream


def _seq(terms):
    """Sigma_seq: left to right, starting from the first term."""
    acc = terms[0]
    for t in terms[1:]:
        acc = acc + t
    return acc


def _finite(rows):
    return all(math.isfinite(v) for r in rows for v in r)


def train_ref(inst, geometry, d, lr, seed, epochs, burnin, batch=50, negs=50, stream_cls=PyStream, init_hook=None):
    n = inst.n
    pos = [tuple(p) for p in inst.pos.tolist()]
    ptr = inst.nn_ptr.tolist()
    flat = inst.nn_flat.tolist()
    E = len(pos)
    st = stream_cls(seed)

    # item 3.1: node-major, coordinate-minor
    r = st.random_many(n * d).tolist()
    X = []
    for i in range(n):
        xs = [(2.0 * r[i * d + k] - 1.0) * 1e-3 for k in range(d)]
        if geometry == 'lorentz':
            X.append([math.sqrt(1.0 + _seq([x * x for x in xs]))] + xs)
        else:
            X.append(xs)
    if init_hook is not None:                       # tests: the same edit the trainer's patched init_table makes
        X = init_hook(X)
    D = len(X[0])
    guard = 0
    max_step = 0.0
    lrf = float(lr)
    for ep in range(epochs):
        eta = lrf / 10 if ep < burnin else lrf
        perm = list(range(E))                       # Rng.shuffle of a fresh list, written out
        for i in range(E - 1, 0, -1):
            j = st.below(i + 1)
            perm[i], perm[j] = perm[j], perm[i]
        anchors = [pos[p][0] for p in perm]
        negs_all = []                               # batch after batch, row after row: 50 x NN(u)[below(|NN(u)|)]
        for u in anchors:
            m = ptr[u + 1] - ptr[u]
            negs_all.append([flat[ptr[u] + st.below(m)] for _ in range(negs)])
        for b0 in range(0, E, batch):
            b1 = min(b0 + batch, E)
            B = b1 - b0
            rows = []
            for i in range(b0, b1):
                u = anchors[i]
                cands = [pos[perm[i]][1]] + negs_all[i]
                if ptr[u + 1] - ptr[u] < 1 or any(c == u for c in cands):
                    raise AssertionError('a candidate equals its anchor')
                rows.append((u, cands))
            # distances
            arg, ok_all, rr_all, dist = [], [], [], []
            for u, cands in rows:
                xu = X[u]
                a_row, ok_row, r_row, d_row = [], [], [], []
                for c in cands:
                    xc = X[c]
                    if geometry == 'lorentz':
                        z = xu[0] * xc[0] - _seq([xu[k] * xc[k] for k in range(1, D)])
                        if z > 1.0:
                            t = z - 1.0
                            rj = math.sqrt(t * (t + 2.0))
                            a_row.append(t + rj)
                            ok_row.append(True)
                            r_row.append(rj)
                        else:
                            a_row.append(0.0)
                            ok_row.append(False)
                            r_row.append(0.0)
                            guard += 1
                    else:
                        d_row.append(_seq([(xu[k] - xc[k]) * (xu[k] - xc[k]) for k in range(D)]))
                arg.append(a_row)
                ok_all.append(ok_row)
                rr_all.append(r_row)
                dist.append(d_row)
            if geometry == 'lorentz':
                dist = np.log1p(np.array(arg, dtype=np.float64)).tolist()
            # the softmax over -d with the positive inside
            mins = [min(row) for row in dist]
            ex = np.exp(np.array([[mins[i] - dj for dj in dist[i]] for i in range(B)], dtype=np.float64)).tolist()
            # the terms, in term order
            acc = {}
            for i, (u, cands) in enumerate(rows):
                S = _seq(ex[i])
                for j, c in enumerate(cands):
                    q = ex[i][j] / S
                    delta = (1.0 - q) / B if j == 0 else (-q) / B
                    if geometry == 'lorentz':
                        g = delta / rr_all[i][j] if ok_all[i][j] else 0.0
                        tu = [g * X[c][k] for k in range(D)]
                        tc = [g * X[u][k] for k in range(D)]
                    else:
                        g = 2.0 * delta
                        tu = [g * (X[u][k] - X[c][k]) for k in range(D)]
                        tc = [-v for v in tu]
                    for node, term in ((u, tu), (c, tc)):
                        A = acc.setdefault(node, [0.0] * D)
                        for k in range(D):
                            A[k] = A[k] + term[k]
            touched = sorted(acc)
            new = {}
            if geometry == 'lorentz':
                taus, ws = [], []
                for v in touched:
                    x, A = X[v], acc[v]
                    ip = _seq([x[k] * A[k] for k in range(1, D)]) - x[0] * A[0]
                    w = [eta * (A[k] + ip * x[k]) for k in range(D)]
                    nu = _seq([w[k] * w[k] for k in range(1, D)]) - w[0] * w[0]
                    taus.append(math.sqrt(max(nu, 0.0)))
                    ws.append(w)
                ch = np.cosh(np.array(taus, dtype=np.float64)).tolist()
                sh = np.sinh(np.array(taus, dtype=np.float64)).tolist()
                for v, tau, w, c_, s_ in zip(touched, taus, ws, ch, sh):
                    x = X[v]
                    if tau > 0.0:
                        xs = [c_ * x[k] + (s_ / tau) * w[k] for k in range(1, D)]
                    else:
                        xs = x[1:]
                    new[v] = [math.sqrt(1.0 + _seq([y * y for y in xs]))] + list(xs)
                    max_step = max(max_step, tau)
            else:
                for v in touched:
                    s = [eta * a for a in acc[v]]
                    new[v] = [X[v][k] - s[k] for k in range(D)]
                    max_step = max(max_step, math.sqrt(_seq([y * y for y in s])))
            for v, row in new.items():
                X[v] = row
        if not _finite(X):
            return None, ep, guard, max_step, st.state()
    return X, None, guard, max_step, st.state()
