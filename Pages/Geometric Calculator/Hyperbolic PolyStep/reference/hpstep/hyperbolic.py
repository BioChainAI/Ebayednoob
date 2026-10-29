"""Hyperbolic space in the hyperboloid model, in floating point (track A).

A point of H^d is y = (y0, y1, ..., yd) with <y, y> = -1 and y0 > 0, where
<a, b> = -a0 b0 + a1 b1 + ... + ad bd is the Lorentz form. Arrays carry the d + 1 coordinates on their last
axis and may have any leading shape. The exact (Fraction) versions are in exact.py.

Charts: the Poincare ball p = ybar / (1 + y0) (angles true, used for pictures and the snap) and the Klein ball
k = ybar / y0 (geodesics straight, used for the centroid). The ghost map of the paper is from_poincare.
"""
import numpy as np


def lorentz(a, b):
    """<a, b> on the last axis."""
    return -a[..., 0] * b[..., 0] + np.sum(a[..., 1:] * b[..., 1:], axis=-1)


def origin(d, shape=()):
    o = np.zeros(shape + (d + 1,))
    o[..., 0] = 1.0
    return o


def dist(a, b):
    """Hyperbolic distance, cosh d = -<a, b>."""
    return np.arccosh(np.maximum(1.0, -lorentz(a, b)))


def from_poincare(p):
    """The ghost map G(p) = ((1 + |p|^2), 2p) / (1 - |p|^2) from the unit ball to the sheet."""
    p = np.asarray(p, dtype=float)
    q = np.sum(p * p, axis=-1, keepdims=True)
    return np.concatenate([(1 + q), 2 * p], axis=-1) / (1 - q)


def to_poincare(y):
    return y[..., 1:] / (1 + y[..., :1])


def to_klein(y):
    return y[..., 1:] / y[..., :1]


def from_klein(k):
    k = np.asarray(k, dtype=float)
    g = 1 / np.sqrt(1 - np.sum(k * k, axis=-1, keepdims=True))
    return np.concatenate([g, g * k], axis=-1)


def boost(x):
    """The boost L_x taking the origin to x: [[x0, xbar^T], [xbar, I + xbar xbar^T / (1 + x0)]]. Shape (..., d+1, d+1)."""
    x = np.asarray(x, dtype=float)
    d = x.shape[-1] - 1
    x0, xb = x[..., 0], x[..., 1:]
    L = np.zeros(x.shape[:-1] + (d + 1, d + 1))
    L[..., 0, 0] = x0
    L[..., 0, 1:] = xb
    L[..., 1:, 0] = xb
    L[..., 1:, 1:] = np.eye(d) + xb[..., :, None] * xb[..., None, :] / (1 + x0)[..., None, None]
    return L


def exp_origin(v):
    """The point at distance |v| from the origin in direction v: (cosh|v|, sinh|v| v/|v|). v has shape (..., d)."""
    v = np.asarray(v, dtype=float)
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    safe = np.where(n > 0, n, 1.0)
    return np.concatenate([np.cosh(n), np.sinh(n) * v / safe], axis=-1)


def log_origin(y):
    """Inverse of exp_origin: the tangent vector at the origin pointing to y, of length d(o, y)."""
    y = np.asarray(y, dtype=float)
    n = np.linalg.norm(y[..., 1:], axis=-1, keepdims=True)
    safe = np.where(n > 0, n, 1.0)
    return np.arccosh(np.maximum(1.0, y[..., :1])) * y[..., 1:] / safe


def exp_at(x, v):
    """Walk from x along the geodesic whose direction, carried back to the origin by L_x^-1, is v."""
    return np.einsum('...ij,...j->...i', boost(x), exp_origin(v))


def lorentz_centroid(V, w):
    """Weighted Lorentzian centroid of points V (..., K, d+1) with weights w (..., K): s / sqrt(-<s, s>).

    It is the unique minimiser of sum_k w_k (-2 - 2<y, V_k>) on the sheet (H3), and in the Klein chart it is the
    convex combination of the corners with weights w_k V_k0 / sum_j w_j V_j0 (H2).
    """
    s = np.einsum('...k,...ki->...i', w, V)
    return s / np.sqrt(-lorentz(s, s))[..., None]


def klein_weights(V, w):
    """The convex weights lambda_k = w_k V_k0 / sum_j w_j V_j0 of the centroid in the Klein chart."""
    lam = w * V[..., 0]
    return lam / lam.sum(axis=-1, keepdims=True)


def lift_spatial(y):
    """Back onto the sheet by keeping the spatial part and recomputing y0 = sqrt(1 + |ybar|^2): always valid, unlike
    dividing by sqrt(-<y, y>), which fails once rounding makes <y, y> positive (far out, near the horizon)."""
    y = np.asarray(y, dtype=float)
    return np.concatenate([np.sqrt(1 + np.sum(y[..., 1:] ** 2, axis=-1, keepdims=True)), y[..., 1:]], axis=-1)


def project_to_sheet(y):
    """Renormalise a timelike vector onto the upper sheet (used to clean float drift)."""
    return y / np.sqrt(-lorentz(y, y))[..., None] * np.sign(y[..., :1])


J_CACHE = {}


def J(d):
    if d not in J_CACHE:
        m = np.eye(d + 1)
        m[0, 0] = -1
        J_CACHE[d] = m
    return J_CACHE[d]


def lorentz_inverse(L):
    """For a Lorentz matrix, L^-1 = J L^T J."""
    d = L.shape[-1] - 1
    return J(d) @ np.swapaxes(L, -1, -2) @ J(d)
