"""The hyperbolic PolyStep step, and the same step at curvature 0 (polystep's step).

State: P particles, each a point of a product of m factors. A hyperbolic state has shape (P, m, d+1), every
factor a point of the sheet H^d. A flat state has shape (P, m, d), every factor a point of R^d.

One step for one particle, moving a block of b factors (all m by default):
  1. Corners. The 2D directions of the orthoplex in the tangent space R^D of the block (D = b d), turned by a
     rotation R. A direction v is cut into b chunks v_i of R^d. Hyperbolic: factor i moves to exp_{x_i}(r v_i),
     so the corner lies at product distance r. Flat: x_i + r v_i.
  2. Probes and costs. Probe points at fractions s_j of the probe radius rho along each direction, the
     fractions of polystep, linspace(0, 1, K + 2)[1:K+1]. A corner's cost is the mean of the objective there.
     With polystep's defaults (K = 1, rho = 2r) the probe is the corner.
  3. Weights. polystep's own SoftmaxSolver or SinkhornSolver on the (P, 2D) cost matrix.
  4. Move. Hyperbolic: the Lorentzian centroid of each factor's corners. Flat: the weighted barycentre.
With exact=True the new state is snapped to an exact rational point (exact.snap) and kept as Fractions too.

Radii are physical lengths (hyperbolic lengths on the sheet). polystep reads a bare float radius as a multiple of
epsilon; here a float is the radius itself, and a schedule object with .at(t) is read at the iteration.
"""
from dataclasses import dataclass, field
from typing import Callable, Optional
import math

import numpy as np
import torch
from polystep.solvers import SoftmaxSolver, SinkhornSolver
from polystep.geometry import get_random_rotation_matrices

from . import hyperbolic as H
from . import exact as X


def _at(v, t):
    return float(v.at(t)) if hasattr(v, 'at') else float(v)


@dataclass
class StepConfig:
    epsilon: object = 0.1            # temperature, float or schedule with .at(t)
    step_radius: object = 0.5        # physical step length r
    probe_radius: object = None      # None: 2 r, polystep's default ratio
    num_probe: int = 1
    probe_jitter: float = 0.0        # theory mode: probe radius times (1 + j (2u - 1)), u uniform from the rng
    solver: str = 'softmax'          # 'softmax' or 'sinkhorn' (polystep's solvers)
    geometry: str = 'hyperbolic'     # 'hyperbolic' or 'flat' (curvature 0, polystep's step)
    rotation: str = 'cayley'         # 'cayley' (float Cayley from the shared rng), 'cayley_exact', 'haar' (polystep)
    cayley_K: int = 4
    block: Optional[int] = None      # factors moved per step; None moves all m
    exact: bool = False              # snap the new state to exact rationals (hyperbolic only)
    snap_bits: int = 24
    elitist: bool = True
    flat_factors: tuple = ()         # hyperbolic geometry only: factors that are Euclidean R^d, stored as (1, z)
    horizon: Optional[float] = 8.0   # each factor stays in the closed ball of this radius about the origin
                                     # (hyperbolic or Euclidean distance); None for charted objectives (B3)


@dataclass
class StepState:
    X: np.ndarray                    # (P, m, d+1) hyperbolic or (P, m, d) flat
    Xq: Optional[list] = None        # exact state, X[p][i] a list of Fractions (exact mode)
    best_cost: Optional[np.ndarray] = None
    best_X: Optional[np.ndarray] = None
    iteration: int = 0
    evaluations: int = 0
    history: list = field(default_factory=list)
    chart: Optional[list] = None     # per particle, an opaque chart label set by the objective (B3: a tree node)
    best_chart: Optional[list] = None


class PolyStepH:
    """Hyperbolic (or flat) PolyStep on a product space. objective(points) takes an array of candidate states,
    shape (N, m, d+1) or (N, m, d), and returns N costs."""

    def __init__(self, objective: Callable, m: int, d: int, config: StepConfig, rng, torch_seed: int = 0):
        self.f, self.m, self.d, self.cfg, self.rng = objective, m, d, config, rng
        self.hyper = config.geometry == 'hyperbolic'
        if config.exact and not self.hyper:
            raise ValueError('exact mode is for the hyperbolic geometry')
        self.gen = torch.Generator().manual_seed(torch_seed)
        self.fixed_R = None              # tests: (R float (P, D, D), Rq exact list or None) used instead of drawing
        self.orient = None               # version 2 steer mode: orient(idx, R, Rq) -> (R, Rq) turns each polytope by the frames

    # ---------------------------------------------------------------- state
    def init_state(self, X0):
        X0 = np.array(X0, dtype=float)
        st = StepState(X=X0)
        if self.cfg.exact:
            st.Xq, moved = [], 0.0
            for p in range(X0.shape[0]):
                row = []
                for i in range(self.m):
                    y, mv = X.snap(X0[p, i], self.cfg.snap_bits)
                    row.append(y)
                st.Xq.append(row)
            st.X = np.array([[X.to_float(y) for y in row] for row in st.Xq])
        if hasattr(self.f, 'rechart'):
            self.f.rechart(st)                                   # charted objectives (B3) anchor from the start
        return st

    # ---------------------------------------------------------------- pieces
    def rotations(self, P, D):
        if self.fixed_R is not None:
            return self.fixed_R
        kind = self.cfg.rotation
        if kind == 'haar':
            return get_random_rotation_matrices(P, D, dtype=torch.float64, generator=self.gen).numpy(), None
        if kind == 'cayley_exact':
            Rq = [X.random_rotation(self.rng, D, self.cfg.cayley_K) for _ in range(P)]
            return np.array([[[float(v) for v in row] for row in R] for R in Rq]), Rq
        Rs = []
        for _ in range(P):
            A = np.array([[float(v) for v in row] for row in X.random_skew(self.rng, D, self.cfg.cayley_K)])
            I = np.eye(D)
            Rs.append((I - A) @ np.linalg.inv(I + A))
        return np.array(Rs), None

    def block_of(self):
        b = self.cfg.block
        if b is None or b >= self.m:
            return list(range(self.m))
        return sorted(self.rng.sample(self.m, b))

    def candidates(self, st, p, idx, v, length, Rq=None):
        """The 2D candidates of particle p at the given length, as floats, and (exact mode) as exact points.

        Exact mode: with one factor moved and an exact Cayley rotation, each candidate is built exactly from a
        rational t = tanh(length/2) (rounded to the grid 2^-k, so the length is 2 artanh t to within 2^-k) and
        a rational column of R. Otherwise each moved factor is snapped. Either way every evaluated point is an
        exact rational point of the sheet (H1), and the floats are their exact values rounded.
        """
        fl = self.move(st.X[p], idx, length * v)
        if not self.cfg.exact:
            return fl, None
        k = self.cfg.snap_bits
        exact_pts = []
        if len(idx) == 1 and Rq is not None:
            from fractions import Fraction
            t = Fraction(math.floor(math.tanh(length / 2) * 2 ** k + 0.5), 2 ** k)   # half up, as in the browser
            for u in X.orthoplex_directions(Rq):
                row = list(st.Xq[p])
                row[idx[0]] = X.point_at(st.Xq[p][idx[0]], t, u)
                exact_pts.append(row)
        else:
            for c in range(fl.shape[0]):
                row = list(st.Xq[p])
                for i in idx:
                    row[i], _ = X.snap(fl[c, i], k)
                exact_pts.append(row)
        return np.array([[X.to_float(y) for y in row] for row in exact_pts]), exact_pts

    def clamp(self, Xs, idx):
        """Pull every moved factor beyond the horizon radially back onto it: the nearest point of the closed ball
        about the origin. The ball is convex and the origin is in it, so a step that starts inside never gets longer
        (H2 holds), and directions are unchanged, so the angle and sign decoders read the same answer."""
        R = self.cfg.horizon
        if R is None:
            return 0
        count = 0
        hyp = [i for i in idx if self.hyper and i not in self.cfg.flat_factors]
        if hyp:                                                   # all hyperbolic factors at once (elementwise maths)
            sub = Xs[:, hyp, :]
            out = np.arccosh(np.maximum(1.0, sub[..., 0])) > R
            if np.any(out):
                v = H.log_origin(sub[out])
                sub[out] = H.exp_origin(v * (R / np.linalg.norm(v, axis=-1, keepdims=True)))
                Xs[:, hyp, :] = sub
                count += int(out.sum())
        for i in idx:
            if self.hyper and i not in self.cfg.flat_factors:
                continue
            else:
                z = Xs[:, i, 1:] if self.hyper else Xs[:, i, :]
                n = np.linalg.norm(z, axis=-1)
                out = n > R
                if np.any(out):
                    z[out] *= (R / n[out])[:, None]
                    count += int(out.sum())
        return count

    def move(self, x, idx, v):
        """Candidate states: x (m, ...) with factors idx moved by tangent vectors v (..., b, d)."""
        out = np.broadcast_to(x, v.shape[:-2] + x.shape).copy()
        if self.hyper:
            flat = self.cfg.flat_factors
            out[..., idx, :] = H.exp_at(x[idx], v)
            for a, i in enumerate(idx):
                if i in flat:                                    # a Euclidean factor inside a hyperbolic product
                    out[..., i, 0] = 1.0
                    out[..., i, 1:] = x[i, 1:] + v[..., a, :]
        else:
            out[..., idx, :] = x[idx] + v
        return out

    def weights(self, C, eps):
        C_t = torch.as_tensor(C, dtype=torch.float64)
        if self.cfg.solver == 'sinkhorn' and C.shape[0] > 1:
            res = SinkhornSolver(epsilon=eps).solve(C_t, scale_cost=1.0)
        else:
            res = SoftmaxSolver(epsilon=eps).solve(C_t, scale_cost=1.0)
        W = res.matrix.numpy()
        return W / W.sum(axis=1, keepdims=True)

    # ---------------------------------------------------------------- one step
    def step(self, st: StepState, record=False):
        cfg, t = self.cfg, st.iteration
        eps, r = _at(cfg.epsilon, t), _at(cfg.step_radius, t)
        rho = 2 * r if cfg.probe_radius is None else _at(cfg.probe_radius, t)
        if cfg.probe_jitter:
            rho *= 1 + cfg.probe_jitter * (2 * self.rng.random() - 1)
        P = st.X.shape[0]
        idx = self.block_of()
        b, d = len(idx), self.d
        D = b * d
        R, Rq = self.rotations(P, D)
        if self.orient is not None:
            R, Rq = self.orient(idx, R, Rq)
        U = np.concatenate([np.eye(D), -np.eye(D)])                         # (2D, D), polystep's order
        dirs = np.einsum('pij,kj->pki', R, U)                               # (P, 2D, D) unit directions
        fr = np.linspace(0, 1, cfg.num_probe + 2)[1:cfg.num_probe + 1]
        C = np.zeros((P, 2 * D))
        corners = np.zeros((P, 2 * D) + st.X.shape[1:])
        exact_corners = [] if cfg.exact else None
        probes_best = []
        for p in range(P):
            if hasattr(self.f, 'focus'):
                self.f.focus(st.chart[p] if st.chart is not None else None)
            v = dirs[p].reshape(2 * D, b, d)
            corners[p], cq = self.candidates(st, p, idx, v, r, Rq[p] if Rq else None)
            if cfg.exact:
                exact_corners.append(cq)
            costs, pts_all = [], []
            for s in fr:
                if abs(s * rho - r) < 1e-15:
                    pts = corners[p]
                else:
                    pts, _ = self.candidates(st, p, idx, v, s * rho, Rq[p] if Rq else None)
                pts_all.append(pts)
                costs.append(np.asarray(self.f(pts), dtype=float))
            C[p] = np.mean(costs, axis=0)
            st.evaluations += 2 * D * len(fr)
            allc = np.array(costs)
            s_best, j = np.unravel_index(int(np.argmin(allc)), allc.shape)
            probes_best.append((float(allc[s_best, j]), pts_all[s_best][j]))
        W = self.weights(C, eps)
        newX = st.X.copy()
        lam = None
        if self.hyper:
            Vb = corners[:, :, idx, :]                                       # (P, 2D, b, d+1)
            with np.errstate(invalid='ignore', divide='ignore'):          # Euclidean factors are replaced below
                cen = H.lorentz_centroid(np.moveaxis(Vb, 1, 2), W[:, None, :])  # (P, b, d+1)
            newX[:, idx, :] = cen
            for a, i in enumerate(idx):
                if i in cfg.flat_factors:
                    newX[:, i, :] = np.einsum('pk,pkd->pd', W, corners[:, :, i, :])
            lam = H.klein_weights(np.moveaxis(Vb, 1, 2), W[:, None, :])
        else:
            newX[:, idx, :] = np.einsum('pk,pkid->pid', W, corners[:, :, idx, :])
        clamped = self.clamp(newX, idx)
        info = {'iteration': t, 'epsilon': eps, 'radius': r, 'probe_radius': rho, 'block': idx, 'clamped': clamped,
                'cost_mean': float(C.mean()), 'cost_min': float(C.min())}
        if self.hyper:
            hyp = [a for a, i in enumerate(idx) if i not in cfg.flat_factors]
            if hyp:                                                          # for conjecture C2
                kb, ka = H.to_klein(st.X[:, idx, :][:, hyp]), H.to_klein(newX[:, idx, :][:, hyp])
                info['klein_move'] = np.linalg.norm(ka - kb, axis=-1).mean(axis=-1)
                info['klein_radius'] = np.linalg.norm(kb, axis=-1).mean(axis=-1)
            moved = H.dist(st.X[:, idx, :], newX[:, idx, :])                 # per factor
            for a, i in enumerate(idx):
                if i in cfg.flat_factors:
                    moved[:, a] = np.linalg.norm(newX[:, i, 1:] - st.X[:, i, 1:], axis=-1)
            info['product_move'] = np.sqrt(np.sum(moved ** 2, axis=-1))      # product distance per particle
        else:
            info['product_move'] = np.linalg.norm((newX - st.X).reshape(P, -1), axis=-1)
        if cfg.exact:
            snaps = []
            newXq = [list(row) for row in st.Xq]
            for p in range(P):
                for i in idx:
                    y, mv = X.snap(newX[p, i], cfg.snap_bits)
                    newXq[p][i] = y
                    snaps.append(mv)
            info['snap_max'] = max(snaps)
            st.Xq = newXq
            newX = np.array([[X.to_float(y) for y in row] for row in newXq])
        if record:
            info.update({'C': C, 'W': W, 'corners': corners, 'exact_corners': exact_corners, 'klein': lam, 'R': R, 'Rq': Rq,
                         'X_before': st.X.copy(), 'Xq_before': [list(row) for row in st.Xq] if st.Xq else None})
        if cfg.elitist:
            if st.best_cost is None:
                st.best_cost = np.full(P, np.inf)
                st.best_X = st.X.copy()
                if st.chart is not None:
                    st.best_chart = list(st.chart)
            for p, (c, pt) in enumerate(probes_best):
                if c < st.best_cost[p]:
                    st.best_cost[p], st.best_X[p] = c, pt
                    if st.chart is not None:
                        st.best_chart[p] = st.chart[p]
        st.X = newX
        if hasattr(self.f, 'rechart'):
            self.f.rechart(st)
        st.iteration += 1
        h = {k: v for k, v in info.items() if k in ('iteration', 'epsilon', 'radius', 'cost_mean', 'cost_min', 'snap_max')}
        if 'klein_move' in info:
            h['klein_move'], h['klein_radius'] = info['klein_move'].tolist(), info['klein_radius'].tolist()
        st.history.append(h)
        return info

    def run(self, st, steps, budget=None):
        for _ in range(steps):
            if budget is not None and st.evaluations >= budget:
                break
            self.step(st)
        return st
