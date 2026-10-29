"""Three solver channels on the zero-point clock (Explainer 2).

Frames F = 1, 2, ...; joint frame n = F mod 24 (Proposition 3.7 of the paper). Channel j onloads at n = ON[j] and
offloads twelve frames later, at OFF[j]. A channel's step is carried by that packet and written at the offload, so
each channel takes exactly one step per joint cycle: 30 per 720-frame register.

At every zero point (n = 0) the channels pair: Helix B certifies each channel's incumbent exactly, the best
certified answer wins and a memory word is written. Then the clutch acts:
  hold      a channel whose incumbent has not improved for `patience` zero points rests: its packets still run on
            schedule but spend no evaluations, until another channel's incumbent improves;
  free      every channel steps every joint cycle;
  membrane  as free, and each channel's particles are moved by one isometry that carries the channel's incumbent a
            fraction mu of the way to the common incumbent (the Klein centroid of the three, weighted by
            softmax(-certified cost)); the differential removed is logged.
A register is frames 720(r-1)+1 .. 720r. With exact states, every change of a particle's factor is a rational
Lorentz map, and at the register's end the pump checks Q10 = Q8 = P^-1 and H = P^-1 exactly (H7).
"""
import math

import numpy as np

from . import hyperbolic as H
from . import exact as X
from .problems import memory_word

ON = (18, 10, 2)
OFF = (6, 22, 14)
NAMES = ('A', 'B', 'C')


def schedule_facts():
    """The facts of Proposition 3.7 that the channels rely on, recomputed."""
    ons = sorted(ON)
    return {
        'onload_k': [n % 8 for n in ON], 'offload_k': [n % 8 for n in OFF],
        'onload_branch': [n % 3 for n in ON], 'offload_branch': [n % 3 for n in OFF],
        'delay': [(OFF[j] - ON[j]) % 24 for j in range(3)],
        'disjoint': not set(ON) & set(OFF),
        'max_in_flight': max(sum(1 for j in range(3) if (n - ON[j]) % 24 <= 12) for n in range(24)),
        'onloads': ons,
    }


def _transvection(a, b, frac):
    """The isometry moving a toward b by `frac` of their distance along the geodesic: L_c L_a^-1 with c on the
    geodesic. Rotation-free in the sense that it is the composite of the two canonical boosts."""
    dd = H.dist(a, b)
    if dd < 1e-15:
        return np.eye(len(a))
    v_origin = H.lorentz_inverse(H.boost(a)) @ b                 # b seen from a, at the origin
    nrm = np.linalg.norm(v_origin[1:])
    if not nrm > 0:                                              # a and b equal to rounding
        return np.eye(len(a))
    u = v_origin[1:] / nrm
    c = H.exp_at(a, frac * dd * u)
    return H.boost(c) @ H.lorentz_inverse(H.boost(a))


class TriChannel:
    """Run three PolyStepH channels (solvers[j], states[j]) on the schedule. `problem.helix_b(point)` certifies a
    state exactly and returns an integer (or a dict with 'distance')."""

    def __init__(self, solvers, states, problem, clutch='membrane', mu=0.5, patience=3, exact_register=False):
        self.solvers, self.states, self.problem = solvers, states, problem
        self.k = len(solvers)
        self.clutch, self.mu, self.patience = clutch, mu, patience
        self.exact_register = exact_register
        self.F = 0
        self.resting = [False] * self.k
        self.stale = [0] * self.k
        self.best_cert = [math.inf] * self.k
        self.memory, self.log, self.registers = [], [], []
        self.membrane_log = []
        self.batched_membrane = True     # float runs move all factors at once; False keeps the factor loop
        self.reg_dq = None
        if exact_register:
            self._reset_register()

    # ---------------------------------------------------------------- bookkeeping
    @property
    def evaluations(self):
        return sum(s.evaluations for s in self.states)

    def _reset_register(self):
        # per channel, particle, factor: a list of 720 increments (None = identity)
        self.reg_dq = [[[[None] * 720 for _ in range(st.X.shape[1])] for _ in range(st.X.shape[0])] for st in self.states]
        self.reg_start = [[list(row) for row in st.Xq] for st in self.states]

    def _record(self, j, before):
        if not self.exact_register:
            return
        idx = (self.F - 1) % 720
        st = self.states[j]
        for p in range(len(st.Xq)):
            for i in range(len(st.Xq[p])):
                if st.Xq[p][i] != before[p][i]:
                    self.reg_dq[j][p][i][idx] = X.displacement(before[p][i], st.Xq[p][i])

    def _close_register(self):
        one = X.eye(self.states[0].X.shape[-1])
        mul, inv = X.matmul, X.lorentz_inverse
        ok_all, worst = True, None
        for j, st in enumerate(self.states):
            for p in range(len(st.Xq)):
                for i in range(len(st.Xq[p])):
                    dq = [x if x is not None else one for x in self.reg_dq[j][p][i]]
                    r = X.pump(dq, mul, inv, one)
                    tele = X.matvec(r['P'], self.reg_start[j][p][i]) == st.Xq[p][i]
                    ok = r['Q10'] == r['Pinv'] and r['Q8'] == r['Pinv'] and r['H'] == r['Pinv'] and tele
                    ok_all = ok_all and ok
        self.registers.append({'F': self.F, 'pump_identity': ok_all})
        self._reset_register()

    # ---------------------------------------------------------------- the clock
    def certify(self, j):
        st = self.states[j]
        p = int(np.argmin(st.best_cost)) if st.best_cost is not None else 0
        point = st.best_X[p] if st.best_X is not None else st.X[p]
        if st.chart is not None:
            chart = st.best_chart[p] if st.best_chart is not None else st.chart[p]
            c = self.problem.helix_b(point, chart)
        else:
            c = self.problem.helix_b(point)
        return (c['distance'] if isinstance(c, dict) else c), point

    def zero_point(self):
        certs = [self.certify(j) for j in range(self.k)]
        costs = [c for c, _ in certs]
        best = int(np.argmin(costs))
        improved_any = False
        for j in range(self.k):
            if costs[j] < self.best_cert[j]:
                self.best_cert[j], self.stale[j] = costs[j], 0
                improved_any = True
            else:
                self.stale[j] += 1
        self.memory.append(memory_word(self.F, costs, best, self.memory[-1]['hash'] if self.memory else ''))
        if self.clutch == 'hold':
            # rest a stalled channel (never the last one running); an improvement anywhere wakes the rested ones
            for j in range(self.k):
                if self.resting[j] and improved_any and self.stale[j] > 0:
                    self.resting[j], self.stale[j] = False, 0
            for j in range(self.k):
                if not self.resting[j] and self.stale[j] >= self.patience and sum(not r for r in self.resting) > 1:
                    self.resting[j] = True
        elif self.clutch == 'membrane' and self.k > 1:
            self.membrane(certs)
        return costs, best

    def membrane(self, certs):
        if any(st.chart is not None for st in self.states):
            raise ValueError('the membrane combines points of one chart; use clutch free or hold for charted problems (B3)')
        costs = np.array([c for c, _ in certs], dtype=float)
        w = np.exp(-(costs - costs.min()))
        w /= w.sum()
        pts = [np.asarray(pt) for _, pt in certs]
        moved = []
        if not self.solvers[0].hyper:                               # curvature 0: translate toward the weighted mean
            for i in range(pts[0].shape[0]):
                V = np.array([p[i] for p in pts])
                common = np.einsum('k,kd->d', w, V)
                for j, st in enumerate(self.states):
                    shift = self.mu * (common - V[j])
                    st.X[:, i, :] += shift
                    self.solvers[j].clamp(st.X, [i])
                    moved.append(float(np.linalg.norm(shift)))
            self.membrane_log.append({'F': self.F, 'differential_removed': max(moved) if moved else 0.0})
            return
        if self.batched_membrane and all(st.Xq is None for st in self.states):   # float runs: all factors at once
            self._membrane_batched(pts, w, moved)
            self.membrane_log.append({'F': self.F, 'differential_removed': max(moved) if moved else 0.0})
            return
        for i in range(pts[0].shape[0]):                            # factor by factor
            V = np.array([p[i] for p in pts])
            if i in self.solvers[0].cfg.flat_factors:
                common = np.einsum('k,kd->d', w, V)
            else:
                common = H.lorentz_centroid(V, w)
            for j, st in enumerate(self.states):
                before = [list(row) for row in st.Xq] if st.Xq is not None else None
                if i in self.solvers[0].cfg.flat_factors:
                    shift = self.mu * (common - V[j])
                    st.X[:, i, 1:] += shift[1:]
                    moved.append(float(np.linalg.norm(shift[1:])))
                else:
                    T = _transvection(V[j], common, self.mu)
                    st.X[:, i, :] = st.X[:, i, :] @ T.T
                    if st.Xq is None:                       # float states back onto the sheet (exact ones are snapped)
                        st.X[:, i, :] = H.lift_spatial(st.X[:, i, :])
                    moved.append(float(self.mu * H.dist(V[j], common)))
                self.solvers[j].clamp(st.X, [i])                    # the membrane respects the horizon too
                if st.Xq is not None:
                    for p in range(len(st.Xq)):
                        st.Xq[p][i], _ = X.snap(st.X[p, i], self.solvers[j].cfg.snap_bits)
                        st.X[p, i] = X.to_float(st.Xq[p][i])
                    self._record(j, before)
        self.membrane_log.append({'F': self.F, 'differential_removed': max(moved) if moved else 0.0})

    def _membrane_batched(self, pts, w, moved):
        """The membrane of the factor-by-factor loop below, for all factors at once. The factors are independent, so
        this is the same map; only the order of float operations differs (agreement to about 1e-15, checked by the
        tests). Exact runs keep the loop, whose snapped states the browser core's traces follow."""
        V = np.stack([np.asarray(p, dtype=float) for p in pts])      # (k, m, d+1)
        m = V.shape[1]
        flat = [i for i in range(m) if i in self.solvers[0].cfg.flat_factors]
        hyp = [i for i in range(m) if i not in self.solvers[0].cfg.flat_factors]
        if hyp:
            Vh = V[:, hyp, :]
            common = H.lorentz_centroid(np.swapaxes(Vh, 0, 1), np.broadcast_to(w, (len(hyp), len(w))))   # (h, d+1)
        if flat:
            common_flat = np.einsum('k,kmd->md', w, V[:, flat, :])
        for j, st in enumerate(self.states):
            if hyp:
                a = Vh[j]
                dd = H.dist(a, common)
                Linv = H.lorentz_inverse(H.boost(a))
                vo = np.einsum('mij,mj->mi', Linv, common)[:, 1:]
                nrm = np.linalg.norm(vo, axis=-1, keepdims=True)
                u = vo / np.where(nrm > 0, nrm, 1.0)
                c = H.exp_at(a, (self.mu * dd)[:, None] * u)
                T = H.boost(c) @ Linv
                T[dd < 1e-15] = np.eye(a.shape[-1])
                # back onto the sheet: without this, rounding near the horizon compounds from one membrane to the next
                # (Amendment 3)
                st.X[:, hyp, :] = H.lift_spatial(np.einsum('pmi,mji->pmj', st.X[:, hyp, :], T))
                moved.extend((self.mu * dd).tolist())
            if flat:
                shift = self.mu * (common_flat - V[j, flat, :])
                st.X[:, flat, 1:] += shift[None, :, 1:]
                moved.extend(np.linalg.norm(shift[:, 1:], axis=-1).tolist())
            self.solvers[j].clamp(st.X, list(range(m)))

    def run(self, frames=None, budget=None, on_zero=None):
        """Advance the clock. Stops after `frames` frames or once the evaluations reach `budget`."""
        while True:
            if frames is not None and frames <= 0:
                break
            if budget is not None and self.evaluations >= budget:
                break
            self.F += 1
            n = self.F % 24
            for j in range(self.k):
                if n == OFF[j % 3] and not self.resting[j]:
                    st = self.states[j]
                    before = [list(row) for row in st.Xq] if st.Xq is not None else None
                    if hasattr(self.problem, 'resample'):
                        self.problem.resample()
                    self.solvers[j].step(st)
                    self._record(j, before)
            if n == 0:
                costs, best = self.zero_point()
                if on_zero:
                    on_zero(self, costs, best)
            if self.exact_register and self.F % 720 == 0:
                self._close_register()
            if frames is not None:
                frames -= 1
        return self
