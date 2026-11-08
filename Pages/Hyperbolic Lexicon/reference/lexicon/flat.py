"""The curvature-0 arms of L5 (Amendment 1, item 7): F3, F2 (unit edges) and F3*, F2* (edge length (1/4)^k into a
word of k + 1 letters), as exact integer vectors over one denominator per depth, and their lexicon.rank arms.

The trees' frames and directions without the boost: a node is an affine frame (R, p); its child along the direction
u that the hyperbolic tree uses gets R' = R R(u) and p' = p + l R' e1. In R^3, u is OCTA[slot_direction(word, g)]
and R(u) is hpstep's rot_to(u) (a signed permutation); in R^2, u is the H^2 tree's direction (lexicon.h2exact.DIRS:
the generator at the root, the child index below it) and R(u) = [[u1, -u2], [u2, u1]] takes (1, 0) to u. The root
(the empty word) is the origin with R = I.

Denominators per depth n (x = X / den(n)):
    F3   1                 (signed axes: integer points; F collides on its lattice)
    F3*  4^(n-1), n >= 1   (l = 4^-k into a word of k + 1 letters; the first letter's edge has length 1)
    F2   25^n              (R(u) is (u1 + i u2), a Gaussian rational over 1, 5 or 25)
    F2*  25^n 4^(n-1)

    FlatTree(dim, star)     .points(words) -> [X], .den(n), .tau (1), .kind ('euclid')
    F3, F2, F3S, F2S        the four trees
    arm(words, dim, star)   the arm for lexicon.rank (key |Y|^2 - 2 X.Y, ascending = nearer)
"""
from hpstep.decode3d import OCTA, rot_to, slot_direction

from .h2exact import DIRS, slot
from .h3tree import walk

_ROT3 = tuple(tuple(tuple(r) for r in rot_to(u)) for u in OCTA)
_U25 = tuple((int(25 * u1), int(25 * u2)) for u1, u2 in DIRS)          # 25 u as a Gaussian integer


class FlatTree:
    def __init__(self, dim, star=False):
        if dim not in (2, 3):
            raise ValueError('dim is 2 or 3')
        self.dim, self.star = dim, star
        self.kind, self.tau = 'euclid', 1.0
        self.name = f'F{dim}' + ('*' if star else '')

    def den(self, n):
        d = 25 ** n if self.dim == 2 else 1
        return d * 4 ** (n - 1) if self.star and n >= 1 else d

    def _grow(self, i):
        """den(i + 1) / den(i): the factor applied to p when the edge into a word of i + 1 letters is added."""
        f = 25 if self.dim == 2 else 1
        return f * 4 if self.star and i >= 1 else f

    def _step3(self, state, prev, g, i):
        R, P = state                                  # R integer 3x3 (rows), P integer over den(i)
        U = _ROT3[g if prev is None else slot_direction((prev,), g)]
        R2 = tuple(tuple(R[r][0] * U[0][c] + R[r][1] * U[1][c] + R[r][2] * U[2][c] for c in range(3)) for r in range(3))
        f = self._grow(i)
        return R2, (P[0] * f + R2[0][0], P[1] * f + R2[1][0], P[2] * f + R2[2][0])

    def _step2(self, state, prev, g, i):
        (za, zb), P = state                           # R = (za + i zb) / 25^i, P integer over den(i)
        ua, ub = _U25[slot(prev, g)]
        za, zb = za * ua - zb * ub, za * ub + zb * ua  # R' = R u, over 25^(i+1)
        f = self._grow(i)
        # l R' e1 over den(i + 1): R' e1 = (za, zb) / 25^(i+1); for F2*, den(i+1) = 25^(i+1) 4^i and l = 4^-i
        return (za, zb), (P[0] * f + za, P[1] * f + zb)

    def states(self, words):
        words = [tuple(w) for w in words]
        if self.dim == 3:
            I3 = ((1, 0, 0), (0, 1, 0), (0, 0, 1))
            return walk(words, (I3, (0, 0, 0)), self._step3)
        return walk(words, ((1, 0), (0, 0)), self._step2)

    def points(self, words):
        """Exact points X (integer tuples), x = X / den(len(word)), aligned with `words`."""
        return [P for _, P in self.states(words)]

    def point(self, word):
        return self.points([tuple(word)])[0]


F3, F2, F3S, F2S = FlatTree(3), FlatTree(2), FlatTree(3, True), FlatTree(2, True)


def tree(dim, star=False):
    return {(3, False): F3, (2, False): F2, (3, True): F3S, (2, True): F2S}[(dim, bool(star))]


def arm(words, dim, star=False, name=None):
    """The flat arm for lexicon.rank: points over the common denominator den(Lmax)."""
    from .rank import Arm
    T = tree(dim, star)
    pts = T.points(words)
    L = max(len(w) for w in words)
    D = T.den(L)
    return Arm.from_points(name or T.name, 'euclid', pts, [D // T.den(len(w)) for w in words], D, tau=T.tau)
