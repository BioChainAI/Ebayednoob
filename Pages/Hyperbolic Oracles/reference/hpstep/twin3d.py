"""Version 2, phases C and D: the coupler and the twin system, two memory structures bound through frames.

Two structures, each a tri-channel of engines A, B and C (version 1's TriChannel, in H^3), run on one clock:
six calculations in all. Their particles are paired: channel j, particle p, factor i of structure 1 with the same
of structure 2. Every move of a factor turns its frame by a twist w (frames3d.twist_quat). The coupler binds the
pairs through those twists:

    whichever structure issues w:   q1 <- w q1      and      q2 <- q2 w^-1

Structure 1 keeps its frames as they are; structure 2 keeps them mirrored (q2 is the inverse of its frame). So
the coupler takes the twist of one structure and applies its inverse to the other, both ways, and the binding

    B = q2 q1

never changes: q2 w^-1 w q1 = q2 q1 (K1). The coupler checks B exactly at every zero point and writes its own
memory word, a third chain beside the two structures' chains.

The switch:
    carry   frames are transported and checked, never fed back. Decoders read positions only, so the six
            calculations are bit for bit those of a run without the coupler (K2).
    steer   each particle's polytope is turned by its frame before the step: R <- blockdiag(rot f_i) R. Paths change;
            the binding is conserved all the same (K1), and every register's pump still closes (K3).
    off     no coupler.
"""
import hashlib

import numpy as np

from . import frames3d as Fr
from . import exact as X


class Coupler:
    def __init__(self, k, P, m, mode='carry', exact=False):
        if mode not in ('carry', 'steer'):
            raise ValueError('the coupler runs in carry or steer mode')
        self.k, self.P, self.m, self.mode, self.exact = k, P, m, mode, exact
        one = (1, 0, 0, 0) if exact else (1.0, 0.0, 0.0, 0.0)
        self.q = [[[[one] * m for _ in range(P)] for _ in range(k)] for _ in range(2)]   # q[s][j][p][i]
        self.issued = [0, 0]
        self.angle = [0.0, 0.0]                           # total twist each structure has issued, in radians
        self.memory = []
        self.chirality = 'mirror'                         # tests: 'same' applies w to both sides (the control)

    def _norm(self, q):
        return Fr.qnorm_exact(q) if self.exact else Fr.qnorm_float(q)

    def frame(self, s, j, p, i):
        """The geometric frame of a factor: structure 1's q, structure 2's mirrored q inverted."""
        q = self.q[s][j][p][i]
        return q if s == 0 else Fr.qconj(q)

    def apply(self, s, j, p, i, w):
        """A twist w issued by structure s at the paired factor: w on the left of q1, w^-1 on the right of q2."""
        q1, q2 = self.q[0][j][p][i], self.q[1][j][p][i]
        self.q[0][j][p][i] = self._norm(Fr.qmul(w, q1))
        inv = w if self.chirality == 'same' else Fr.qconj(w)
        self.q[1][j][p][i] = self._norm(Fr.qmul(q2, inv))
        self.issued[s] += 1
        self.angle[s] += Fr.quat_angle(w)

    def transport(self, s, j, before, after):
        """Every factor that moved between two snapshots of one channel's state issues its twist."""
        for p in range(self.P):
            for i in range(self.m):
                a, b = before[p][i], after[p][i]
                moved = (list(a) != list(b)) if self.exact else not np.array_equal(a, b)
                if moved:
                    self.apply(s, j, p, i, Fr.twist_quat(a, b, self.exact))

    def binding(self):
        """(pairs whose binding B = q2 q1 is the identity, all pairs, largest deviation). Exact frames compare
        exactly; float frames to rounding."""
        ok, worst, n = 0, 0.0, 0
        for j in range(self.k):
            for p in range(self.P):
                for i in range(self.m):
                    B = Fr.qmul(self.q[1][j][p][i], self.q[0][j][p][i])
                    n += 1
                    if self.exact:
                        good = Fr.qnorm_exact(B) == (1, 0, 0, 0)
                        dev = 0.0 if good else Fr.quat_angle(B)
                    else:
                        Bn = Fr.qnorm_float(B)
                        dev = max(abs(Bn[0] - 1), abs(Bn[1]), abs(Bn[2]), abs(Bn[3]))
                        good = dev < 1e-9
                    ok += good
                    worst = max(worst, dev)
        return ok, n, worst

    def zero_point(self, F):
        ok, n, worst = self.binding()
        prev = self.memory[-1]['hash'] if self.memory else ''
        body = f'{F}|{self.issued[0]}|{self.issued[1]}|{ok}|{n}|{prev}'
        word = {'F': F, 'issued': list(self.issued), 'bound': ok, 'pairs': n, 'worst': worst,
                'hash': hashlib.sha256(body.encode()).hexdigest()[:16]}
        self.memory.append(word)
        return word

    def orient(self, s, j):
        """Steer mode's hook for structure s, channel j: turn each particle's rotation by its factors' frames."""
        def hook(idx, R, Rq):
            Rn = np.array(R, dtype=float).copy()
            Rqn = None if Rq is None else []
            for p in range(len(R)):
                blocks = [Fr.rot_of_quat(self.frame(s, j, p, i)) for i in idx]
                D = 3 * len(idx)
                if self.exact:
                    M = [[X.ZERO] * D for _ in range(D)]
                    for a, Bk in enumerate(blocks):
                        for r in range(3):
                            for c in range(3):
                                M[3 * a + r][3 * a + c] = Bk[r][c]
                    if Rq is not None:
                        Rqn.append(X.matmul(M, Rq[p]))
                    Mf = np.array([[float(v) for v in row] for row in M])
                else:
                    Mf = np.zeros((D, D))
                    for a, Bk in enumerate(blocks):
                        Mf[3 * a:3 * a + 3, 3 * a:3 * a + 3] = np.array(Bk, dtype=float)
                Rn[p] = Mf @ np.asarray(R[p], dtype=float)
            if Rqn is not None:
                Rn = np.array([[[float(v) for v in row] for row in Rp] for Rp in Rqn])
            return Rn, Rqn
        return hook


def _snapshot(st, exact):
    if exact:
        return [list(row) for row in st.Xq]
    return st.X.copy()


class TwinSystem:
    """Two TriChannels on one clock, bound by a coupler ('carry' or 'steer'), or free ('off')."""

    def __init__(self, tc1, tc2, mode='carry', exact=False):
        if mode not in ('off', 'carry', 'steer'):
            raise ValueError(mode)
        self.tcs, self.mode, self.exact, self.F = [tc1, tc2], mode, exact, 0
        k, P = len(tc1.states), tc1.states[0].X.shape[0]
        m = tc1.states[0].X.shape[1]
        if len(tc2.states) != k or tc2.states[0].X.shape[:2] != (P, m):
            raise ValueError('the two structures must have the same channels, particles and factors to be paired')
        self.coupler = None if mode == 'off' else Coupler(k, P, m, mode, exact)
        if mode == 'steer':
            for s, tc in enumerate(self.tcs):
                for j, sol in enumerate(tc.solvers):
                    sol.orient = self.coupler.orient(s, j)

    def run(self, frames):
        for _ in range(frames):
            for s, tc in enumerate(self.tcs):
                before = [_snapshot(st, self.exact) for st in tc.states] if self.coupler else None
                tc.run(frames=1)
                if self.coupler:
                    for j, st in enumerate(tc.states):
                        self.coupler.transport(s, j, before[j], _snapshot(st, self.exact))
            self.F += 1
            if self.coupler and self.F % 24 == 0:
                self.coupler.zero_point(self.F)
        return self
