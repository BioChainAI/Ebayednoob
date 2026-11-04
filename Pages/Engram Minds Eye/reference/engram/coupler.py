"""The coupler between the two streams (claim E5): Hyperbolic PolyStep's mirror law on the engram window.

Structure 1 is the human stream, structure 2 the STRIX stream. Each packet's address quaternion w is the twist its
structure issues when the packet latches, and whichever structure issues it the coupler applies

    q1 <- w q1      and      q2 <- q2 conj(w)

(conj(w) stands for w^-1 up to the norm), so the binding B = q2 q1 never changes. Quaternions are coprime integers
kept up to a positive scale, with hpstep.frames3d's qnorm_exact, as in twin3d.py. The control 'same' applies w on
both sides (q2 <- q2 w), the control of twin3d.py, and must change B.

In carry mode the coupler only watches: nothing it computes is fed back, so every other output of a run is the
same with the coupler on or off (K2).
"""
from hpstep.frames3d import qmul, qconj, qnorm_exact

ONE = (1, 0, 0, 0)


class Coupler:
    def __init__(self, chirality='mirror'):
        if chirality not in ('mirror', 'same'):
            raise ValueError('chirality is mirror (the law) or same (the control)')
        self.chirality = chirality
        self.q = [ONE, ONE]
        self.B0 = self.binding()
        self.issued = [0, 0]
        self.log = []

    def binding(self):
        return qnorm_exact(qmul(self.q[1], self.q[0]))

    def twist(self, w, structure):
        q1, q2 = self.q
        q1 = qnorm_exact(qmul(w, q1))
        q2 = qnorm_exact(qmul(q2, qconj(w) if self.chirality == 'mirror' else w))
        self.q = [q1, q2]
        self.issued[structure] += 1

    def check(self, F):
        B = self.binding()
        ok = B == self.B0
        self.log.append({'F': F, 'B': B, 'ok': ok})
        return ok
