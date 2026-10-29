"""The exact track (track B) and the snap (track C), in Python Fractions.

Every corner, probe and stored state of the hyperbolic step can be an exact rational point of the sheet:
  * a step length is given by t = tanh(r/2) in Q, so cosh r = (1 + t^2)/(1 - t^2) and sinh r = 2t/(1 - t^2);
  * rotations come from the Cayley map R = (I - A)(I + A)^-1 of a rational skew matrix A, exactly orthogonal;
  * the boost L_x of a rational point x of the sheet is rational;
  * a centroid is returned to an exact point by the snap: its Poincare point is rounded to the grid 2^-k and
    lifted by the ghost map G(p) = ((1 + |p|^2), 2p)/(1 - |p|^2). The distance moved is logged on track C.
Matrices are lists of lists of Fractions; points are lists of Fractions.
"""
from fractions import Fraction as F
import math

ONE, ZERO = F(1), F(0)


# ---------------------------------------------------------------- linear algebra over Q
def eye(n):
    return [[ONE if i == j else ZERO for j in range(n)] for i in range(n)]


def matmul(A, B):
    Bt = list(zip(*B))
    return [[sum((a * b for a, b in zip(row, col)), ZERO) for col in Bt] for row in A]


def matvec(A, v):
    return [sum((a * b for a, b in zip(row, v)), ZERO) for row in A]


def transpose(A):
    return [list(r) for r in zip(*A)]


def inverse(A):
    """Gauss-Jordan inverse over Q."""
    n = len(A)
    M = [list(A[i]) + [ONE if i == j else ZERO for j in range(n)] for i in range(n)]
    for c in range(n):
        p = next(r for r in range(c, n) if M[r][c] != 0)
        M[c], M[p] = M[p], M[c]
        piv = M[c][c]
        M[c] = [x / piv for x in M[c]]
        for r in range(n):
            if r != c and M[r][c] != 0:
                f = M[r][c]
                M[r] = [x - f * y for x, y in zip(M[r], M[c])]
    return [row[n:] for row in M]


def is_identity(A):
    return all(A[i][j] == (ONE if i == j else ZERO) for i in range(len(A)) for j in range(len(A)))


# ---------------------------------------------------------------- rotations
def random_skew(rng, d, K=4):
    """A rational skew-symmetric matrix with entries a/K, a uniform in [-K, K], drawn row by row above the diagonal."""
    A = [[ZERO] * d for _ in range(d)]
    for i in range(d):
        for j in range(i + 1, d):
            a = rng.rational(K)
            A[i][j], A[j][i] = a, -a
    return A


def cayley(A):
    """R = (I - A)(I + A)^-1: exactly orthogonal with det +1 for any rational skew A."""
    n = len(A)
    I = eye(n)
    minus = [[I[i][j] - A[i][j] for j in range(n)] for i in range(n)]
    plus = [[I[i][j] + A[i][j] for j in range(n)] for i in range(n)]
    return matmul(minus, inverse(plus))


def random_rotation(rng, d, K=4):
    return cayley(random_skew(rng, d, K))


def is_orthogonal(R):
    return is_identity(matmul(transpose(R), R))


# ---------------------------------------------------------------- the sheet
def lorentz(a, b):
    return -a[0] * b[0] + sum((x * y for x, y in zip(a[1:], b[1:])), ZERO)


def on_sheet(y):
    return lorentz(y, y) == -1 and y[0] > 0


def ghost(p):
    """G(p) = ((1 + |p|^2), 2p) / (1 - |p|^2) for a rational p with |p| < 1."""
    q = sum((x * x for x in p), ZERO)
    if q >= 1:
        raise ValueError("ghost map needs |p| < 1")
    return [(1 + q) / (1 - q)] + [2 * x / (1 - q) for x in p]


def boost(x):
    d = len(x) - 1
    x0, xb = x[0], x[1:]
    L = [[x0] + list(xb)]
    for i in range(d):
        L.append([xb[i]] + [(ONE if i == j else ZERO) + xb[i] * xb[j] / (1 + x0) for j in range(d)])
    return L


def Jmat(d):
    M = eye(d + 1)
    M[0][0] = -ONE
    return M


def lorentz_inverse(L):
    d = len(L) - 1
    return matmul(matmul(Jmat(d), transpose(L)), Jmat(d))


def is_lorentz(L):
    d = len(L) - 1
    return matmul(matmul(transpose(L), Jmat(d)), L) == Jmat(d)


def cosh_sinh(t):
    """(cosh r, sinh r) for r = 2 artanh t, exactly."""
    t = F(t)
    return (1 + t * t) / (1 - t * t), 2 * t / (1 - t * t)


def point_at(x, t, u):
    """The exact point at distance 2 artanh(t) from x in direction u (a rational unit vector at the origin)."""
    c, s = cosh_sinh(t)
    return matvec(boost(x), [c] + [s * ui for ui in u])


def orthoplex_directions(R):
    """The 2d unit directions R(+e_i), R(-e_i): the columns of R and their negatives, in polystep's order."""
    d = len(R)
    cols = [[R[r][c] for r in range(d)] for c in range(d)]
    return cols + [[-v for v in col] for col in cols]


# ---------------------------------------------------------------- the snap (track C)
def snap(y_float, k=24):
    """Round the Poincare point of a float sheet point to the grid 2^-k and lift it exactly.

    Returns (exact point, distance moved). A point that rounds onto or past the rim is pulled in radially by one
    grid step until it is strictly inside.
    """
    y0 = float(y_float[0])
    p = [float(v) / (1 + y0) for v in y_float[1:]]
    scale = 2 ** k
    half_up = lambda v: math.floor(v + 0.5)          # half rounds up, as the browser's Math.round does
    q = [F(half_up(v * scale), scale) for v in p]
    while sum((x * x for x in q), ZERO) >= 1:
        q = [F(half_up(float(x) * scale * (1 - 2.0 ** -k)), scale) for x in q]
    y = ghost(q)
    moved = math.acosh(max(1.0, -float(lorentz(y, [F(v) for v in y_float]))))
    return y, moved


def to_float(y):
    return [float(v) for v in y]


def displacement(x_prev, x_new):
    """The rational Lorentz map L_{x_new} L_{x_prev}^-1 carrying x_prev to x_new (identity if they are equal)."""
    if x_prev == x_new:
        return eye(len(x_new))
    return matmul(boost(x_new), lorentz_inverse(boost(x_prev)))


# ---------------------------------------------------------------- the pump (Prop 3.9), in any group
def pump(dq, mul, inv, one):
    """Evaluate the 720 -> 72 -> 10 pump on 720 increments dq[0..719] of one register.

    Returns P (the open product dq[719] ... dq[0]), Q10, Q8 and H = Q8 Q10 P. Proposition 3.9 says
    Q10 = Q8 = P^-1 and H = P^-1 in any group, commutative or not.
    """
    assert len(dq) == 720
    P = one
    for x in dq:
        P = mul(x, P)
    dQ = []
    for m in range(72):
        B = one
        for i in range(10):
            B = mul(dq[10 * m + i], B)
        dQ.append(B)
    delta = [inv(B) for B in dQ]
    Q10 = one
    for x in delta:
        Q10 = mul(Q10, x)
    Q8 = one
    for l in range(10):
        A = one
        for m in range(72):
            if (10 * m) // 72 == l:
                A = mul(A, delta[m])
        Q8 = mul(Q8, A)
    H = mul(mul(Q8, Q10), P)
    return {'P': P, 'Q10': Q10, 'Q8': Q8, 'H': H, 'Pinv': inv(P)}


def inner_block_sizes():
    return [sum(1 for m in range(72) if (10 * m) // 72 == l) for l in range(10)]
