"""The rational replacements for sin, cos, tan and 3D rotation (operator specification, section 12.1, eqs. 85-88).

Every function here takes and returns exact rationals (Fractions). Nothing calls a transcendental function.

    eq. 85   half_angle(Q)            cos, sin^2, tan^2 of theta from the quadrance Q = tan^2(theta/2)
    eq. 86   rot(u, x), rot_matrix(u) the rotation by the tangent half-angle vector u, without square roots
             cayley_closed(A)         the Cayley map (I - A)(I + A)^-1 of a skew A in 2D or 3D, in closed form
    eq. 87   symmedian(A, C0)         the internal symmedian foot and the external Apollonius point on BC
    eq. 88   ghost_quadrance(p, r)    Q_h = sinh^2 of the hyperbolic distance between two Poincare-ball points
             compose(a, b)            the exact rational composition R(a) R(b) = R(compose(a, b))
             drift_sum(e1, e2, e3)    the second-order sum of eq. 88, exact for nothing but correct to O(eps^3)
             keypad_trig(a)           sin, cos, tan of a rational angle as a rational point on the unit circle,
                                      within 10^-58, the kernel of the Geometric Calculator's keypad

Findings, checked in tests/test_rational_trig.py:
  * 85, 86, 87 and the Q_h half of 88 hold exactly.
  * The Cayley map of [u]x is Rot(-u), so the project's Cayley rotations were this replacement already.
  * The drift sum of 88 is second order only, and only for tangent half-angle (Gibbs) vectors composed as
    R(e1) R(e2) R(e3), e3 acting first; compose() is the exact replacement.
"""
from fractions import Fraction as F

ONE, ZERO = F(1), F(0)


def dot(a, b):
    return sum((x * y for x, y in zip(a, b)), ZERO)


def cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


# ---------------------------------------------------------------- eq. 85
def half_angle(Q):
    """(cos theta, sin^2 theta, tan^2 theta) for Q = tan^2(theta/2) >= 0. tan^2 is None at its pole Q = 1."""
    Q = F(Q)
    return (1 - Q) / (1 + Q), 4 * Q / (1 + Q) ** 2, (4 * Q / (1 - Q) ** 2 if Q != 1 else None)


def unit_point(t):
    """The rational point (cos theta, sin theta) = ((1 - t^2), 2t)/(1 + t^2) for t = tan(theta/2)."""
    t = F(t)
    return (1 - t * t) / (1 + t * t), 2 * t / (1 + t * t)


# ---------------------------------------------------------------- eq. 86
def rot(u, x):
    """Rot(u) x = x + 2/(1 + Q) (u x x + u x (u x x)), Q = |u|^2."""
    u, x = [F(v) for v in u], [F(v) for v in x]
    ux = cross(u, x)
    uux = cross(u, ux)
    k = 2 / (1 + dot(u, u))
    return [xi + k * (a + b) for xi, a, b in zip(x, ux, uux)]


def rot_matrix(u):
    cols = [rot(u, e) for e in ([1, 0, 0], [0, 1, 0], [0, 0, 1])]
    return [[cols[j][i] for j in range(3)] for i in range(3)]


def skew(u):
    """[u]x, the matrix with [u]x v = u x v."""
    return [[ZERO, -F(u[2]), F(u[1])], [F(u[2]), ZERO, -F(u[0])], [-F(u[1]), F(u[0]), ZERO]]


def cayley_closed(A):
    """(I - A)(I + A)^-1 for a skew A of size 2 or 3: I + 2 (A^2 - A)/(1 + Q), Q the sum of squares above the diagonal."""
    n = len(A)
    Q = sum((F(A[i][j]) ** 2 for i in range(n) for j in range(i + 1, n)), ZERO)
    A2 = [[sum((F(A[i][k]) * F(A[k][j]) for k in range(n)), ZERO) for j in range(n)] for i in range(n)]
    k = 2 / (1 + Q)
    return [[(ONE if i == j else ZERO) + k * (A2[i][j] - F(A[i][j])) for j in range(n)] for i in range(n)]


# ---------------------------------------------------------------- eq. 87
def symmedian(A, C0):
    """With B = 0 and C = 2 C0 on a line and the vertex A in the plane: (x_F, x_E, Q2, Q3).

    x_F = Q3/(Q2 + Q3) 2 C0 is the foot of the internal symmedian, x_E = Q3/(Q3 - Q2) 2 C0 the external
    Apollonius point (None when Q2 = Q3), with Q3 = |A - B|^2 and Q2 = |A - C|^2."""
    A, C0 = [F(v) for v in A], F(C0)
    Q3 = A[0] ** 2 + A[1] ** 2
    Q2 = (A[0] - 2 * C0) ** 2 + A[1] ** 2
    xF = Q3 / (Q2 + Q3) * 2 * C0
    xE = Q3 / (Q3 - Q2) * 2 * C0 if Q3 != Q2 else None
    return xF, xE, Q2, Q3


def cross_ratio(a, b, c, d):
    """(a, b; c, d) = ((c - a)/(c - b)) / ((d - a)/(d - b))."""
    return ((c - a) / (c - b)) / ((d - a) / (d - b))


# ---------------------------------------------------------------- eq. 88
def ghost_quadrance(p, r):
    """Q_h(p, r) = (((1 + |p|^2)(1 + |r|^2) - 4 p.r) / ((1 - |p|^2)(1 - |r|^2)))^2 - 1 = sinh^2 d(p, r)."""
    p, r = [F(v) for v in p], [F(v) for v in r]
    pp, rr = dot(p, p), dot(r, r)
    c = ((1 + pp) * (1 + rr) - 4 * dot(p, r)) / ((1 - pp) * (1 - rr))
    return c * c - 1


def compose(a, b):
    """The Gibbs vector of R(a) R(b): (a + b + a x b)/(1 - a.b). None when a.b = 1 (a half-turn)."""
    a, b = [F(v) for v in a], [F(v) for v in b]
    d = 1 - dot(a, b)
    if d == 0:
        return None
    return [(x + y + z) / d for x, y, z in zip(a, b, cross(a, b))]


def drift_sum(e1, e2, e3):
    """eq. 88's eps_net = e1 + e2 + e3 + e1 x e2 + e1 x e3 + e2 x e3, the second-order Gibbs vector of R(e1) R(e2) R(e3)."""
    e1, e2, e3 = ([F(v) for v in e] for e in (e1, e2, e3))
    c12, c13, c23 = cross(e1, e2), cross(e1, e3), cross(e2, e3)
    return [e1[i] + e2[i] + e3[i] + c12[i] + c13[i] + c23[i] for i in range(3)]


# ---------------------------------------------------------------- the calculator keypad
PI64 = F(3141592653589793238462643383279502884197169399375105820974944592, 10 ** 63)


def keypad_trig(a, digits=60):
    """(sin a, cos a, t) for a rational a, as in the Geometric Calculator's keypad: reduce a modulo 2 pi (pi to 64
    digits), find t = tan(r/4) in fixed point at 10^70 and keep it as the rational T/10^digits, then
    cos(r/2) = (1 - t^2)/(1 + t^2), sin(r/2) = 2t/(1 + t^2) (eq. 85) and the double angle. The point lies exactly
    on the unit circle and within about 10^-58 of (sin a, cos a)."""
    a = F(a)
    S = 10 ** 70
    turns = a / (2 * PI64)
    k = (2 * turns.numerator + turns.denominator) // (2 * turns.denominator)       # nearest whole number of turns
    r = a - 2 * k * PI64
    x = (r.numerator * S) // (4 * r.denominator) if r >= 0 else -((-r.numerator * S) // (4 * r.denominator))
    sn = cs = 0
    term, j = S, 0
    while term != 0:
        if j % 2 == 0:
            cs += term if (j // 2) % 2 == 0 else -term
        else:
            sn += term if ((j - 1) // 2) % 2 == 0 else -term
        j += 1
        term = int(F(term * x, S * j)) if term * x >= 0 else -int(F(-term * x, S * j))   # truncate toward zero, as BigInt
    T = int(F(sn * S, cs)) if sn * S >= 0 else -int(F(-sn * S, cs))
    half = 5 * 10 ** (69 - digits)
    t = F((T + half) // 10 ** (70 - digits), 10 ** digits)
    c2, s2 = unit_point(t)
    return 2 * s2 * c2, c2 * c2 - s2 * s2, t
