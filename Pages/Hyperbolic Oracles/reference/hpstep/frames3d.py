"""Version 2, phase B: frames in H^3, their exact transport, and the twist of a move.

Every particle's factor carries a frame, its orientation and spin, as a quaternion. A frame is expressed
against the canonical frame at the point, the boost L_x from the origin, so the frame of a particle that has never
moved is the identity.

When a point moves from x to y, its frame is carried by parallel transport along the geodesic, the transvection

    T_xy(v) = v + <v, x + y>/(1 + c) (x + y) - 2 <v, x> y,        c = -<x, y> = cosh d(x, y),

which is rational whenever x and y are. Against the canonical frames, transport turns the frame by the twist

    W = L_y^-1 T_xy L_x,

a rotation fixing the origin. It is the holonomy of the geodesic triangle (o, x, y), so its angle is the
triangle's area (Gauss-Bonnet, curvature -1), less than pi. Its quaternion (1 + tr W, W21 - W12, W02 - W20,
W10 - W01) is rational, with a positive first entry. So the whole frame layer is exact, with no square root:
exact frames are integer quaternions kept up to a positive scale. Composing quaternions rather than matrices keeps
the spin, the sign that tells a turn of 2 pi from one of 4 pi.

Properties, proved in explainers/coupler-3d.html and checked in tests/test_twin3d.py:
    F1  T_xy is a Lorentz matrix with T x = y, and W is an exact rational rotation (W^T W = I, det W = 1);
    F2  the angle of W is the area of the triangle (o, x, y): pi minus the sum of its angles.
"""
from fractions import Fraction as F
import math

import numpy as np

from . import exact as X
from . import hyperbolic as H


# ================================================================ quaternions (w, x, y, z)
def qmul(a, b):
    a0, a1, a2, a3 = a
    b0, b1, b2, b3 = b
    return (a0 * b0 - a1 * b1 - a2 * b2 - a3 * b3, a0 * b1 + a1 * b0 + a2 * b3 - a3 * b2,
            a0 * b2 - a1 * b3 + a2 * b0 + a3 * b1, a0 * b3 + a1 * b2 - a2 * b1 + a3 * b0)


def qconj(a):
    return (a[0], -a[1], -a[2], -a[3])


def qnorm_exact(q):
    """An exact quaternion up to positive scale, as coprime integers: the same rotation and the same spin."""
    q = [F(c) for c in q]
    den = 1
    for c in q:
        den = den * c.denominator // math.gcd(den, c.denominator)
    ints = [int(c * den) for c in q]
    g = 0
    for c in ints:
        g = math.gcd(g, abs(c))
    return tuple(c // g for c in ints) if g else (1, 0, 0, 0)


def qnorm_float(q):
    n = math.sqrt(sum(c * c for c in q))
    return tuple(c / n for c in q)


def qsame(a, b):
    """Equal up to a positive scale: the same frame and the same spin."""
    if any(isinstance(c, (int, F)) and not isinstance(c, bool) for c in a) and all(isinstance(c, (int, F)) for c in a + b):
        return qnorm_exact(a) == qnorm_exact(b)
    na, nb = qnorm_float(a), qnorm_float(b)
    return max(abs(x - y) for x, y in zip(na, nb)) < 1e-9


def rot_of_quat(q):
    """The rotation of a quaternion, q v q* / |q|^2: rational for a rational q."""
    w, x, y, z = q
    n = w * w + x * x + y * y + z * z
    R = [[w * w + x * x - y * y - z * z, 2 * (x * y - w * z), 2 * (x * z + w * y)],
         [2 * (x * y + w * z), w * w - x * x + y * y - z * z, 2 * (y * z - w * x)],
         [2 * (x * z - w * y), 2 * (y * z + w * x), w * w - x * x - y * y + z * z]]
    if isinstance(n, float):
        return [[v / n for v in row] for row in R]
    return [[F(v) / n for v in row] for row in R]


def quat_of_rot(R, exact=False):
    """The quaternion of a rotation with angle below pi, with a positive first entry: (1 + tr R, R21 - R12,
    R02 - R20, R10 - R01) up to scale."""
    q = (1 + R[0][0] + R[1][1] + R[2][2], R[2][1] - R[1][2], R[0][2] - R[2][0], R[1][0] - R[0][1])
    return qnorm_exact(q) if exact else qnorm_float(q)


def quat_angle(q):
    """The rotation angle of a quaternion, in [0, pi]."""
    if all(isinstance(c, (int, F)) for c in q):           # exact: the ratio first, so huge entries never overflow
        w = math.sqrt(float(F(q[0]) ** 2 / sum(F(c) ** 2 for c in q)))
    else:
        w = abs(float(q[0])) / math.sqrt(sum(float(c) ** 2 for c in q))
    return 2 * math.acos(min(1.0, w))


# ================================================================ transport
def _lor(a, b):
    return -a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]


def transvection(x, y):
    """The transvection carrying x to y along their geodesic, as a 4x4 matrix (exact for Fractions)."""
    s = [x[i] + y[i] for i in range(4)]
    c1 = 1 - _lor(x, y)                                   # 1 + cosh d
    Js = [-s[0], s[1], s[2], s[3]]                        # <., s> as a row
    Jx = [-x[0], x[1], x[2], x[3]]
    return [[(1 if i == j else 0) + s[i] * Js[j] / c1 - 2 * y[i] * Jx[j] for j in range(4)] for i in range(4)]


def twist(x, y, exact=False):
    """The rotation W = L_y^-1 T_xy L_x (3x3), by which transport from x to y turns a frame against the
    canonical frames. Exact for exact points; the identity when x = y."""
    if exact:
        if all(a == b for a, b in zip(x, y)):
            return [[F(int(i == j)) for j in range(3)] for i in range(3)]
        W = X.matmul(X.lorentz_inverse(X.boost(list(y))), X.matmul(transvection(list(x), list(y)), X.boost(list(x))))
    else:
        x, y = np.asarray(x, dtype=float), np.asarray(y, dtype=float)
        if np.array_equal(x, y):
            return [[float(i == j) for j in range(3)] for i in range(3)]
        W = H.lorentz_inverse(H.boost(y)) @ np.array(transvection(x, y)) @ H.boost(x)
        W = W.tolist()
    return [row[1:] for row in W[1:]]


def twist_quat(x, y, exact=False):
    if not exact and np.array_equal(np.asarray(x, dtype=float), np.asarray(y, dtype=float)):
        return (1.0, 0.0, 0.0, 0.0)
    return quat_of_rot(twist(x, y, exact), exact)


def triangle_area(x, y):
    """The area of the geodesic triangle (o, x, y): pi minus the sum of its angles (float)."""
    o = np.array([1.0, 0, 0, 0])
    P = [o, np.asarray(x, float), np.asarray(y, float)]

    def angle(a, b, c):                                    # the angle at a between the geodesics to b and c
        u = np.asarray(b) + _lor(a, b) * np.asarray(a)     # tangent at a toward b (unnormalised)
        v = np.asarray(c) + _lor(a, c) * np.asarray(a)
        return math.acos(max(-1.0, min(1.0, _lor(u, v) / math.sqrt(_lor(u, u) * _lor(v, v)))))
    return math.pi - angle(P[0], P[1], P[2]) - angle(P[1], P[2], P[0]) - angle(P[2], P[0], P[1])
