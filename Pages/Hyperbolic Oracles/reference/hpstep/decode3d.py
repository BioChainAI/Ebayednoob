"""Version 2, phase A: the decoders of H^3, which turn points of three-dimensional hyperbolic space into answers.

Version 2 runs two memory structures of three engines each, bound by a coupler that moves only the frames of
the particles (their orientation and spin), never their positions. The decoders are the interface that makes
the coupler invisible: an answer depends on a point's position alone, so no frame change can alter it.

Everything here is built from one primitive, the anchor decoder:

    decode_A(y) = the index k maximising <ybar, a_k> over a fixed set A of rational anchor directions,
                  ties to the lowest index (the origin decodes to 0).

The anchor sets are the rational regular polytopes of R^3 (all anchors of a set have the same length):
    AXES   the three coordinate axes          3 answers  (3-colouring, B1)
    TETRA  a regular tetrahedron              4 answers  (4-colouring)
    OCTA   the six signed axes                6 answers  (the six neighbours of a norm-5 tree node, B3)
    CUBE   the eight signed corners           8 answers  (three truth values, B2)

Properties, proved in explainers/decoder-3d.html and checked in tests/test_decode3d.py:
    D1  the answer is the same in every radial chart (hyperboloid, Poincare, Klein), whose spatial parts are
        positive multiples of each other;
    D2  the float decoder equals the exact one on every finite float input: it only ever compares a coordinate,
        or the sum or difference of two coordinates, with zero, and IEEE rounding never changes such a sign;
    D3  each rotation g of the symmetry group G_A permutes the answers: decode(g y) = sigma_g(decode(y)) off ties;
    D4  G_A is transitive on A, so every answer has the same share of directions (1/|A|);
    D5  in B1 a global rotation of G_AXES applied to every vertex leaves the conflict count unchanged.

The tree: the norm-5 tree is embedded in H^3 with every node's neighbours along its local signed axes, the
parent at -e1, at hyperbolic distance tau = 2 artanh(t). With t = 3/4, tau = ln 7, cosh tau = 25/7 and
sinh tau = 24/7, so every node frame is an exact rational Lorentz matrix (E1). Greedy decoding is the OCTA
decoder applied in successive local frames, and it returns every node's own word at every depth whenever
t > 1/sqrt(2) (E2). Helix B then certifies the word through its quaternion of norm 5^L (E3).
"""
from fractions import Fraction as F
import itertools
import math

import numpy as np

from . import hyperbolic as H
from .problems import (children, INV, word_quaternion, right_divide, is_reduced, tree_distance, planted_3col,
                       maxsat_instance, hierarchical_data)

# ================================================================ anchor sets
AXES = ((1, 0, 0), (0, 1, 0), (0, 0, 1))
TETRA = ((1, 1, 1), (1, -1, -1), (-1, 1, -1), (-1, -1, 1))
OCTA = ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1))
# Index 4 b1 + 2 b2 + b3 with b_i = [y_i > 0]: the decoded bits are the truth values, and a zero coordinate
# (a tie) goes to the lower index, b_i = 0, "false", as in version 1's B2 decoder.
CUBE = tuple((2 * b1 - 1, 2 * b2 - 1, 2 * b3 - 1) for b1 in (0, 1) for b2 in (0, 1) for b3 in (0, 1))
ANCHORS = {'axes': AXES, 'tetra': TETRA, 'octa': OCTA, 'cube': CUBE}


def spatial(y):
    """The spatial part of a point of the sheet (4 coordinates); a 3-vector (Poincare, Klein, flat) as it is."""
    return tuple(y[1:]) if len(y) == 4 else tuple(y)


def _dot(a, v):
    return a[0] * v[0] + a[1] * v[1] + a[2] * v[2]


def decode_exact(y, A):
    """The anchor decoder in exact arithmetic (Fractions or integers): argmax of <ybar, a_k>, ties to the lowest
    index. The zero vector ties everywhere and decodes to 0."""
    v = spatial(y)
    best, bk = None, 0
    for k, a in enumerate(A):
        s = _dot(a, v)
        if best is None or s > best:
            best, bk = s, k
    return bk


def _beats(A):
    """For each pair k < j, the difference a_k - a_j as (coordinate, sign) terms. Every anchor set except CUBE has
    at most two terms per difference, which is what makes the float decoder exact (D2)."""
    out = {}
    for k in range(len(A)):
        for j in range(len(A)):
            if k != j:
                d = [A[k][i] - A[j][i] for i in range(3)]
                # all nonzero entries of a difference have the same size, so only their signs matter
                out[(k, j)] = [(i, 1 if d[i] > 0 else -1) for i in range(3) if d[i] != 0]
    return out


_BEATS = {name: _beats(A) for name, A in ANCHORS.items() if name != 'cube'}


def _sign_of_terms(V, terms):
    """The sign of sum s_i v_i over at most two terms, as an array. fl(a + b) has the sign of a + b exactly
    (round-to-nearest never crosses zero, and with subnormals a nonzero sum never rounds to zero)."""
    (i, si), rest = terms[0], terms[1:]
    x = si * V[..., i]
    if rest:
        (j, sj), = rest
        x = x + sj * V[..., j]
    return np.sign(x)


def decode_float(Y, A):
    """The anchor decoder on float arrays (..., 4) or (..., 3), equal to decode_exact on every finite input (D2).
    Answer k wins when it beats every lower index strictly and every higher index weakly."""
    V = np.asarray(Y, dtype=float)
    V = V[..., 1:] if V.shape[-1] == 4 else V
    if A is CUBE or A == CUBE:
        return (4 * (V[..., 0] > 0) + 2 * (V[..., 1] > 0) + (V[..., 2] > 0)).astype(int)
    name = next(n for n, B in ANCHORS.items() if B == A)
    beats, n = _BEATS[name], len(A)
    out = np.zeros(V.shape[:-1], dtype=int)
    won = np.zeros(V.shape[:-1], dtype=bool)
    for k in range(n):
        ok = np.ones(V.shape[:-1], dtype=bool)
        for j in range(n):
            if j != k:
                s = _sign_of_terms(V, beats[(k, j)])
                ok &= (s > 0) if j < k else (s >= 0)
        out = np.where(ok & ~won, k, out)
        won |= ok
    return out


def decode_float_one(y, A):
    return int(decode_float(np.asarray([y], dtype=float), A)[0])


# ================================================================ symmetry (D3, D4)
def _signed_perms():
    for perm in itertools.permutations(range(3)):
        for signs in itertools.product((1, -1), repeat=3):
            M = [[0] * 3 for _ in range(3)]
            for col, row in enumerate(perm):
                M[row][col] = signs[col]
            if round(np.linalg.det(np.array(M))) == 1:
                yield tuple(tuple(r) for r in M)


def symmetry_group(A):
    """The rotations among the 24 signed-permutation rotations that map the anchor set to itself, each with the
    permutation sigma of anchor indices it induces: [(R, sigma)]. Sizes: AXES 3, TETRA 12, OCTA 24, CUBE 24."""
    index = {a: k for k, a in enumerate(A)}
    out = []
    for R in _signed_perms():
        img = [tuple(sum(R[r][c] * a[c] for c in range(3)) for r in range(3)) for a in A]
        if all(v in index for v in img):
            out.append((R, tuple(index[v] for v in img)))
    return out


def is_transitive(A):
    G = symmetry_group(A)
    return {sigma[0] for _, sigma in G} == set(range(len(A)))


def rotate(R, y):
    """Apply a spatial rotation R (3x3) to a point of the sheet (4 coordinates) or a 3-vector."""
    v = spatial(y)
    w = tuple(sum(R[r][c] * v[c] for c in range(3)) for r in range(3))
    return (y[0],) + w if len(y) == 4 else w


# ================================================================ the octahedral tree in H^3
T_TREE = F(3, 4)                 # tanh(tau/2): tau = ln 7, cosh tau = 25/7, sinh tau = 24/7
LOCAL = (0, 2, 3, 4, 5)          # a non-root node's child directions, OCTA indices: all but -e1, the parent


def rot_to(u):
    """The signed-permutation rotation (det +1) taking e1 to the signed axis u."""
    i = next(k for k in range(3) if u[k] != 0)
    perm = (i, (i + 1) % 3, (i + 2) % 3)              # a cyclic permutation of the axes: det +1
    M = [[0] * 3 for _ in range(3)]
    for col, row in enumerate(perm):
        M[row][col] = 1
    if u[i] < 0:                                       # a half-turn about the third column: det stays +1
        for r in range(3):
            M[r][0], M[r][1] = -M[r][0], -M[r][1]
    return M


def slot_direction(word, g):
    """The local direction (an OCTA index) in which the node `word` sees its child `word + [g]`. At the root the
    letter g of 1 +- 2i, 1 +- 2j, 1 +- 2k goes along OCTA[g]; below it, the five allowed letters in increasing
    order take the local directions +e1, +e2, -e2, +e3, -e3."""
    return g if not word else LOCAL[children(word).index(g)]


class TreeEmbedding3D:
    """The norm-5 tree in H^3. A child's frame is M_parent . R_u . B_tau, with R_u the rotation taking e1 to the
    child's direction u and B_tau the boost by tau along e1, so the child sees its parent at -e1. Exact frames
    with Fractions; float frames for the search."""

    def __init__(self, t=T_TREE):
        self.t = F(t)
        c, s = (1 + self.t ** 2) / (1 - self.t ** 2), 2 * self.t / (1 - self.t ** 2)
        self.cosh, self.sinh = c, s
        self.tau = 2 * math.atanh(float(self.t))
        self.step_q, self.step_inv_q = [], []
        for u in OCTA:
            R = rot_to(u)
            R4 = [[F(1), 0, 0, 0]] + [[0] + [F(x) for x in R[r]] for r in range(3)]
            B = [[c, s, 0, 0], [s, c, 0, 0], [0, 0, F(1), 0], [0, 0, 0, F(1)]]
            M = [[sum((R4[i][k] * B[k][j] for k in range(4)), F(0)) for j in range(4)] for i in range(4)]
            Jd = (-1, 1, 1, 1)                          # M^-1 = J M^T J for a Lorentz matrix
            self.step_q.append(M)
            self.step_inv_q.append([[Jd[i] * M[j][i] * Jd[j] for j in range(4)] for i in range(4)])
        self.step = [np.array([[float(x) for x in row] for row in M]) for M in self.step_q]
        self.step_inv = [np.array([[float(x) for x in row] for row in M]) for M in self.step_inv_q]

    # ---- exact
    def frame_exact(self, word):
        M = [[F(int(i == j)) for j in range(4)] for i in range(4)]
        for i, g in enumerate(word):
            S = self.step_q[slot_direction(word[:i], g)]
            M = [[sum((M[a][k] * S[k][b] for k in range(4)), F(0)) for b in range(4)] for a in range(4)]
        return M

    def point_exact(self, word):
        return [row[0] for row in self.frame_exact(word)]

    def decode_exact(self, y, L, anchor=()):
        """Greedy descent in exact arithmetic. y is given in the frame of the node `anchor` (the root by default).
        At each level the next letter is the OCTA decoder restricted to the allowed children, applied to the query
        in the current node's frame; the query is then carried into the chosen child's frame."""
        return self._decode(list(y), L, anchor, exact=True)

    # ---- float
    def frame(self, word):
        M = np.eye(4)
        for i, g in enumerate(word):
            M = M @ self.step[slot_direction(word[:i], g)]
        return M

    def point(self, word):
        return self.frame(word)[:, 0].copy()

    def decode(self, y, L, anchor=()):
        return self._decode(np.asarray(y, dtype=float), L, anchor, exact=False)

    def _decode(self, y, L, anchor, exact):
        mv = (lambda M, v: [sum((M[i][k] * v[k] for k in range(4)), F(0)) for i in range(4)]) if exact else (lambda M, v: M @ v)
        steps, inv = (self.step_q, self.step_inv_q) if exact else (self.step, self.step_inv)
        anchor = list(anchor)
        up = [y]                                       # the query in the frames of anchor, its parent, ..., the root
        for i in range(len(anchor) - 1, -1, -1):
            up.append(mv(steps[slot_direction(anchor[:i], anchor[i])], up[-1]))
        up = up[::-1]
        word, local, on_path = [], up[0], True
        for level in range(L):
            allowed = children(word)
            dirs = [OCTA[slot_direction(word, g)] for g in allowed]
            v = (local[1], local[2], local[3])
            if exact:
                k = decode_exact(v, dirs)
            else:
                k = _decode_subset_float(v, dirs)
            g = allowed[k]
            word.append(g)
            if on_path and level < len(anchor) and g == anchor[level]:
                local = up[level + 1]
                continue
            on_path = False
            local = mv(inv[slot_direction(word[:-1], g)], local)
        return word

    def reanchor(self, anchor, y, L):
        """Move a point held in the frame of `anchor` into the frame of the node on its decoded path nearest to it,
        as version 1 does for B3: float coordinates measured from the root cannot hold points deep in the tree."""
        anchor = list(anchor)
        path = self.decode(y, L, anchor)
        up = [np.asarray(y, dtype=float)]
        for i in range(len(anchor) - 1, -1, -1):
            up.append(self.step[slot_direction(anchor[:i], anchor[i])] @ up[-1])
        k = 0
        while k < min(len(anchor), len(path)) and anchor[k] == path[k]:
            k += 1
        local = up[len(anchor) - k]
        best_word, best_local, best_d = path[:k], local, local[0]
        for i in range(k, len(path)):
            local = self.step_inv[slot_direction(path[:i], path[i])] @ local
            if local[0] < best_d:
                best_word, best_local, best_d = path[:i + 1], local, local[0]
            elif local[0] > best_d * 50:
                break
        return best_word, H.lift_spatial(best_local)


def _decode_subset_float(v, dirs):
    """The anchor decoder over a subset of OCTA on floats, as a running argmax that keeps the earlier index on ties.
    Each comparison is the sign of one coordinate, or of a sum or difference of two, so it is exact (as in D2)."""
    best = 0
    for k in range(1, len(dirs)):
        a, b = dirs[k], dirs[best]
        x = 0.0
        for i in range(3):
            if a[i] != b[i]:
                x = x + (1.0 if a[i] > b[i] else -1.0) * v[i]
        if x > 0:
            best = k
    return best


# ================================================================ the four problems in H^3
class ThreeColouring3D:
    """B1 in H^3: one point of H^3 (or R^3) per vertex; a vertex's colour is the AXES decoder of its point."""

    def __init__(self, n, c, rng, hyper=True):
        self.n, self.c, self.hyper = n, c, hyper
        self.classes, self.edges = planted_3col(n, c, rng)
        self.m, self.d = n, 3
        self._e = np.asarray(self.edges)

    def colours(self, pts):
        return decode_float(pts, AXES)

    def __call__(self, pts):
        col = self.colours(pts)
        return np.sum(col[..., self._e[:, 0]] == col[..., self._e[:, 1]], axis=-1).astype(float)

    def helix_b(self, point):
        cols = [decode_exact([F(x) for x in p], AXES) for p in point]
        return sum(1 for u, v in self.edges if cols[u] == cols[v])

    def init_points(self, rng, P, spread=0.05):
        out = np.zeros((P, self.n, 4 if self.hyper else 3))
        for p in range(P):
            for i in range(self.n):
                z = np.array([spread * (2 * rng.random() - 1) for _ in range(3)])
                out[p, i] = H.from_poincare(z) if self.hyper else z
        return out


class MaxSat3D:
    """B2 in H^3: variables in blocks of three, one factor of H^3 (or R^3) per block. The CUBE decoder of a factor
    is the three truth values: b_i = [y_i > 0]."""

    def __init__(self, n, ratio=4.27, seed=42, hyper=True, source='polystep'):
        self.n, self.hyper = n, hyper
        self.lits = maxsat_instance(n, ratio, seed, source)
        self.m, self.d = math.ceil(n / 3), 3

    def truth(self, pts):
        k = decode_float(pts, CUBE)                                      # (..., m)
        bits = np.stack([(k >> 2) & 1, (k >> 1) & 1, k & 1], axis=-1).astype(bool)
        return bits.reshape(bits.shape[:-2] + (-1,))[..., :self.n]

    def __call__(self, pts):
        t = self.truth(pts)
        table = np.concatenate([~t, t], axis=-1)
        sat = table[..., self.lits[:, 0]] | table[..., self.lits[:, 1]] | table[..., self.lits[:, 2]]
        return 1.0 - sat.mean(axis=-1)

    def helix_b(self, point):
        tv = []
        for p in point:
            k = decode_exact([F(x) for x in p], CUBE)
            tv += [bool((k >> 2) & 1), bool((k >> 1) & 1), bool(k & 1)]
        tv = tv[:self.n]
        return sum(1 for c in self.lits.tolist() if not any((tv[l - self.n] if l >= self.n else not tv[l]) for l in c))

    def init_points(self, rng, P, spread=0.05):
        out = np.zeros((P, self.m, 4 if self.hyper else 3))
        for p in range(P):
            for i in range(self.m):
                z = np.array([spread * (2 * rng.random() - 1) for _ in range(3)])
                out[p, i] = H.from_poincare(z) if self.hyper else z
        return out


class TreeAddress3D:
    """B3 in H^3: one point of H^3, decoded to the nearest depth-L node of the octahedral tree. objective 'graded'
    (tree distance to the target) or 'membership' (the control). Anchored charts as in version 1: each particle is
    held in the frame of a node near it. hyper=False is the curvature-0 counterpart: a point z of R^3, the tangent
    space at its anchor node, read as exp(z) in that node's frame."""

    def __init__(self, L, target, objective='graded', hyper=True, t=T_TREE):
        self.L, self.target, self.objective, self.hyper = L, list(target), objective, hyper
        self.emb = TreeEmbedding3D(t)
        self.m, self.d = 1, 3
        self.size = 6 * 5 ** (L - 1)

    _anchor = ()

    def focus(self, chart):
        self._anchor = tuple(chart) if chart is not None else ()

    def rechart(self, st):
        if st.chart is None:
            st.chart = [()] * st.X.shape[0]
        for p in range(st.X.shape[0]):
            y = st.X[p, 0] if self.hyper else H.exp_origin(st.X[p, 0])
            a, y = self.emb.reanchor(st.chart[p], y, self.L)
            st.chart[p] = tuple(a)
            st.X[p, 0] = y if self.hyper else H.log_origin(y)

    def __call__(self, pts):
        out = []
        for y in (pts.reshape(-1, 4) if self.hyper else H.exp_origin(pts.reshape(-1, 3))):
            w = self.emb.decode(y, self.L, self._anchor)
            out.append(tree_distance(w, self.target) if self.objective == 'graded' else float(w != self.target))
        return np.array(out, dtype=float)

    def helix_b(self, point, chart=()):
        """Decode exactly (the float point read as the Fractions it equals), then certify the word: its quaternion
        has norm 5^L, right-division returns it, and it is reduced."""
        p0 = np.asarray([float(v) for v in point[0]])
        y = [F(float(v)) for v in (p0 if self.hyper else H.exp_origin(p0))]
        w = self.emb.decode_exact(y, self.L, chart or ())
        q = word_quaternion(w)
        ok = sum(c * c for c in q) == 5 ** self.L and right_divide(q, self.L) == w and is_reduced(w)
        return {'word': w, 'certified': ok, 'distance': tree_distance(w, self.target)}

    @staticmethod
    def random_target(rng, L):
        w = [rng.below(6)]
        while len(w) < L:
            kids = children(w)
            w.append(kids[rng.below(len(kids))])
        return w


def nearest_exact(z, protos):
    """The nearest prototype in H^3, exactly: the smallest cosh distance -<z, p>, ties to the lowest index."""
    best, bk = None, 0
    for k, p in enumerate(protos):
        s = z[0] * p[0] - z[1] * p[1] - z[2] * p[2] - z[3] * p[3]
        if best is None or s < best:
            best, bk = s, k
    return bk


class HardThresholdNet3D:
    """B4 in H^3: an encoder W: R^16 -> R^3 (16 Euclidean factors of R^3, the columns of W) sends x to exp_o(W x),
    and the class is the nearest of 8 prototypes in H^3, a hard argmin. Unlike the anchor decoders, the nearest
    prototype compares four-term sums, so its float and exact answers can differ at near-ties; Helix B is exact."""

    def __init__(self, data, rng, hyper=True, batch=256):
        (self.xtr, self.ytr), (self.xte, self.yte), _ = data
        self.rng, self.hyper, self.batch = rng, hyper, batch
        self.d = 3
        self.enc, self.protos, self.m = list(range(16)), list(range(16, 24)), 24
        self.flat_factors = tuple(self.enc) if hyper else ()
        self.resample()

    def resample(self):
        self.bi = np.array([self.rng.below(len(self.ytr)) for _ in range(self.batch)])

    def predict(self, pts, x):
        Wz = pts[..., self.enc, 1:] if self.hyper else pts[..., self.enc, :]
        z = np.einsum('...jk,nj->...nk', Wz, x)
        protos = pts[..., self.protos, :]
        if self.hyper:
            Z = H.exp_origin(z)
            dd = Z[..., :, None, 0] * protos[..., None, :, 0] - np.einsum('...ni,...ki->...nk', Z[..., 1:], protos[..., 1:])
        else:
            dd = np.sum((z[..., :, None, :] - protos[..., None, :, :]) ** 2, axis=-1)
        return np.argmin(dd, axis=-1)

    def __call__(self, pts):
        pred = self.predict(pts, self.xtr[self.bi])
        return np.mean(pred != self.ytr[self.bi], axis=-1)

    def accuracy(self, point, test=True):
        x, y = (self.xte, self.yte) if test else (self.xtr, self.ytr)
        pred = self.predict(np.asarray(point)[None], x)[0]
        return float(np.mean(pred == y)), float(np.mean((pred >> 1) == (y >> 1)))

    def helix_b(self, point):
        return int(np.sum(self.predict(np.asarray(point)[None], self.xtr)[0] != self.ytr))

    def init_points(self, rng, P, scale=0.3):
        out = np.zeros((P, self.m, 4 if self.hyper else 3))
        for p in range(P):
            for i in range(self.m):
                z = np.array([scale * (2 * rng.random() - 1) for _ in range(3)])
                if self.hyper:
                    out[p, i] = [1.0, *z] if i in self.flat_factors else H.from_poincare(z * 0.5)
                else:
                    out[p, i] = z
        return out
