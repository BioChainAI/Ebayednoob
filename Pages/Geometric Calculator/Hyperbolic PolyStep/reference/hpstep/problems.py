"""The four preregistered problems (PREREGISTRATION.md): instances, decoders, objectives and Helix B.

Every decoder has a float version (used by the search) and an exact version (used by Helix B) that apply the
same comparisons, so they agree wherever the float value is exact. Helix B's counts are integer arithmetic.
"""
import hashlib
import math
import random
from fractions import Fraction as F

import numpy as np

from . import hyperbolic as H


def _xy(Y, hyper):
    """The two spatial coordinates of H^2 points (..., 3) or R^2 points (..., 2). They give the same direction in
    every chart (hyperboloid, Poincare, Klein), so the angle decoders read them directly."""
    return (Y[..., 1], Y[..., 2]) if hyper else (Y[..., 0], Y[..., 1])


# ================================================================ B1: graph 3-colouring
def planted_3col(n, c, rng):
    """A planted 3-colourable graph: vertices split into three equal classes (a random equipartition), then
    round(c n / 2) (halves up) distinct edges drawn uniformly among pairs in different classes. Returns (classes, edges)."""
    classes = rng.shuffle([i % 3 for i in range(n)])
    m = math.floor(c * n / 2 + 0.5)                   # half up, as in the browser
    sizes = [classes.count(k) for k in range(3)]
    cross = sizes[0] * sizes[1] + sizes[0] * sizes[2] + sizes[1] * sizes[2]
    if m > cross:
        raise ValueError(f'{m} edges asked for, but only {cross} pairs lie between classes')
    edges, seen = [], set()
    while len(edges) < m:
        u, v = rng.below(n), rng.below(n)
        if u == v or classes[u] == classes[v]:
            continue
        e = (min(u, v), max(u, v))
        if e not in seen:
            seen.add(e)
            edges.append(e)
    return classes, edges


def colour_of(x, y):
    """Branch j of the direction (x, y): j = 0 on angles [-60, 60), 1 on [60, 180), 2 on [180, 300); origin -> 0.

    Written with comparisons only (y^2 against 3x^2 for the 60-degree lines), so the same function decides exactly
    on Fractions and agrees with itself on floats.
    """
    if x == 0 and y == 0:
        return 0
    if x > 0 and (y < 0 or y * y < 3 * x * x) and (y >= 0 or y * y <= 3 * x * x):
        return 0
    if y > 0 and (x <= 0 or y * y >= 3 * x * x):
        return 1
    return 2


def colours_float(Y, hyper=True):
    """Vectorised colour_of over the last-but-one axis."""
    x, y = _xy(Y, hyper)
    s0 = (x > 0) & ((y < 0) | (y * y < 3 * x * x)) & ((y >= 0) | (y * y <= 3 * x * x))
    s1 = (y > 0) & ((x <= 0) | (y * y >= 3 * x * x))
    col = np.where(s0, 0, np.where(s1, 1, 2))
    return np.where((x == 0) & (y == 0), 0, col)


def conflicts(cols, edges):
    e = np.asarray(edges)
    return np.sum(cols[..., e[:, 0]] == cols[..., e[:, 1]], axis=-1)


class ThreeColouring:
    """B1. State: one point of H^2 (or R^2) per vertex, m = n factors of dimension 2."""

    def __init__(self, n, c, rng, hyper=True):
        self.n, self.c, self.hyper = n, c, hyper
        self.classes, self.edges = planted_3col(n, c, rng)
        self.m, self.d = n, 2

    def __call__(self, pts):
        return conflicts(colours_float(pts, self.hyper), self.edges).astype(float)

    def helix_b(self, point_exact_or_float):
        """Exact conflict count of one state: a list of n points (Fractions or floats)."""
        cols = [colour_of(*((p[1], p[2]) if self.hyper else (p[0], p[1]))) for p in point_exact_or_float]
        return sum(1 for u, v in self.edges if cols[u] == cols[v])

    def init_points(self, rng, P, spread=0.05):
        """P particles near the origin: undecided colours."""
        out = np.zeros((P, self.n, 3 if self.hyper else 2))
        for p in range(P):
            for i in range(self.n):
                z = [spread * (2 * rng.random() - 1), spread * (2 * rng.random() - 1)]
                out[p, i] = H.from_poincare(np.array(z)) if self.hyper else z
        return out


# ================================================================ B2: MAX-3-SAT
def maxsat_instance(n, ratio=4.27, seed=42, source='polystep'):
    """Random 3-SAT at clause ratio `ratio`. source='polystep' reproduces the generator of polystep's
    examples/04_maxsat_10k.py (Python's random.Random), as preregistered; source='xoshiro' uses the shared rng so
    the browser can rebuild the same instance. Literal v reads 'variable v false', n + v reads 'v true'."""
    m = int(n * ratio)
    lits = []
    if source == 'polystep':
        r = random.Random(seed)
        for _ in range(m):
            lits.append([v + n * (r.random() < 0.5) for v in r.sample(range(n), 3)])
    else:
        from .prng import Rng
        r = Rng(seed)
        for _ in range(m):
            lits.append([v + n * (r.random() < 0.5) for v in r.sample(n, 3)])
    return np.array(lits, dtype=np.int64)


class MaxSat:
    """B2. Variables in blocks of 8, one H^8 (or R^8) factor per block; variable v is true where its spatial
    coordinate is positive (the same sign in every chart)."""

    def __init__(self, n, ratio=4.27, seed=42, hyper=True, source='polystep', block=8):
        self.n, self.hyper, self.block = n, hyper, block
        self.lits = maxsat_instance(n, ratio, seed, source)
        self.m, self.d = math.ceil(n / block), block

    def truth(self, pts):
        z = pts[..., 1:] if self.hyper else pts
        return z.reshape(z.shape[:-2] + (-1,))[..., :self.n] > 0

    def __call__(self, pts):
        t = self.truth(pts)
        table = np.concatenate([~t, t], axis=-1)
        sat = table[..., self.lits[:, 0]] | table[..., self.lits[:, 1]] | table[..., self.lits[:, 2]]
        return 1.0 - sat.mean(axis=-1)

    def helix_b(self, point):
        """Exact count of unsatisfied clauses of one state (Fractions or floats)."""
        vals = [v for p in point for v in (p[1:] if self.hyper else p)][:self.n]
        tv = [x > 0 for x in vals]
        return sum(1 for c in self.lits.tolist() if not any((tv[l - self.n] if l >= self.n else not tv[l]) for l in c))

    def init_points(self, rng, P, spread=0.05):
        out = np.zeros((P, self.m, self.d + (1 if self.hyper else 0)))
        for p in range(P):
            for i in range(self.m):
                z = np.array([spread * (2 * rng.random() - 1) for _ in range(self.d)])
                out[p, i] = H.from_poincare(z) if self.hyper else z
        return out


# ================================================================ B3: the norm-5 tree
GENS = [(1, 2, 0, 0), (1, -2, 0, 0), (1, 0, 2, 0), (1, 0, -2, 0), (1, 0, 0, 2), (1, 0, 0, -2)]   # 1 +- 2i, 1 +- 2j, 1 +- 2k
INV = [1, 0, 3, 2, 5, 4]   # 1 - 2u is the conjugate of 1 + 2u: the inverse up to the norm 5


def qmul(a, b):
    a0, a1, a2, a3 = a
    b0, b1, b2, b3 = b
    return (a0 * b0 - a1 * b1 - a2 * b2 - a3 * b3, a0 * b1 + a1 * b0 + a2 * b3 - a3 * b2,
            a0 * b2 - a1 * b3 + a2 * b0 + a3 * b1, a0 * b3 + a1 * b2 - a2 * b1 + a3 * b0)


def qconj(a):
    return (a[0], -a[1], -a[2], -a[3])


def word_quaternion(word):
    q = (1, 0, 0, 0)
    for g in word:
        q = qmul(q, GENS[g])
    return q


def right_divide(q, L):
    """Recover the reduced word of a norm-5^L quaternion by L right-divisions (paper, Prop 5.12): the last letter
    is the unique generator g with q * conj(g) divisible by 5. Returns the word, or None if q is not such a product."""
    word = []
    for _ in range(L):
        hits = [g for g in range(6) if all(c % 5 == 0 for c in qmul(q, qconj(GENS[g])))]
        if len(hits) != 1:
            return None
        g = hits[0]
        q = tuple(c // 5 for c in qmul(q, qconj(GENS[g])))
        word.append(g)
    return word[::-1] if q in [(1, 0, 0, 0), (-1, 0, 0, 0)] else None


def is_reduced(word):
    return all(word[i + 1] != INV[word[i]] for i in range(len(word) - 1))


def children(word):
    return [g for g in range(6) if not word or g != INV[word[-1]]]


def _rot(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def _boost_x(t):
    return np.array([[math.cosh(t), math.sinh(t), 0], [math.sinh(t), math.cosh(t), 0], [0, 0, 1]])


class TreeEmbedding:
    """The norm-5 tree in H^2 by Sarkar's construction: each node sees its parent at local angle 0 and its
    children at local angles 2 pi k / 6 (k = 1..5, root: k = 0..5), at distance tau. A child's frame is
    M_parent . Rot(angle) . Boost_x(tau) . Rot(pi)."""

    def __init__(self, tau=3.0):
        self.tau = tau
        self.step = [_rot(2 * math.pi * k / 6) @ _boost_x(tau) @ _rot(math.pi) for k in range(6)]
        self.step_inv = [H.lorentz_inverse(S) for S in self.step]

    def slot(self, word, g):
        kids = children(word)
        return kids.index(g) + (0 if not word else 1)

    def frame(self, word):
        M = np.eye(3)
        for i, g in enumerate(word):
            M = M @ self.step[self.slot(word[:i], g)]
        return M

    def point(self, word):
        return self.frame(word)[:, 0].copy()

    def decode(self, y, L, anchor=()):
        """Greedy descent from the root: at each level take the child nearest the query.

        The query is given in the frame of the node `anchor` (the root by default). Its coordinates in each
        ancestor's frame are built upward from the anchor with the step matrices, which keeps relative accuracy;
        below the anchor the query is carried down into each node's frame. Float coordinates measured from the
        root alone cannot hold points this deep: at distance 24 the sheet constraint is below float64's
        resolution, so a point is always kept in the frame of a node near it (see TreeAddress.rechart).
        """
        anchor = list(anchor)
        up = [np.array(y, dtype=float)]
        for i in range(len(anchor) - 1, -1, -1):
            up.append(self.step[self.slot(anchor[:i], anchor[i])] @ up[-1])
        up = up[::-1]                                   # up[i]: the query in the frame of anchor[:i]
        word, local, on_path = [], up[0], True
        for level in range(L):
            best, bg, bs = None, None, None
            for g in children(word):
                sl = self.slot(word, g)
                c = self.step[sl][:, 0]
                dd = local[0] * c[0] - local[1] * c[1] - local[2] * c[2]       # cosh of the distance
                if best is None or dd < best:
                    best, bg, bs = dd, g, sl
            word.append(bg)
            if on_path and level < len(anchor) and bg == anchor[level]:
                local = up[level + 1]
                continue
            on_path = False
            local = self.step_inv[bs] @ local
        return word

    def reanchor(self, anchor, y, L):
        """Move a point held in the frame of `anchor` into the frame of the node on its decoded path nearest to it.
        Returns (new anchor, coordinates there)."""
        anchor = list(anchor)
        path = self.decode(y, L, anchor)
        up = [np.array(y, dtype=float)]                 # the point in the frames of anchor, its parent, ...
        for i in range(len(anchor) - 1, -1, -1):
            up.append(self.step[self.slot(anchor[:i], anchor[i])] @ up[-1])
        k = 0
        while k < min(len(anchor), len(path)) and anchor[k] == path[k]:
            k += 1
        local = up[len(anchor) - k]                     # in the frame of the common prefix
        best_word, best_local, best_d = path[:k], local, local[0]
        for i in range(k, len(path)):
            local = self.step_inv[self.slot(path[:i], path[i])] @ local
            if local[0] < best_d:
                best_word, best_local, best_d = path[:i + 1], local, local[0]
            elif local[0] > best_d * 50:
                break
        return best_word, H.project_to_sheet(best_local)


def tree_distance(a, b):
    k = 0
    while k < min(len(a), len(b)) and a[k] == b[k]:
        k += 1
    return (len(a) - k) + (len(b) - k)


class TreeAddress:
    """B3. One point of H^2; decoded to the nearest depth-L node. objective='graded' (tree distance to the
    target) or 'membership' (0 at the target, 1 elsewhere: the negative control)."""

    def __init__(self, L, target, tau=3.0, objective='graded', hyper=True):
        # hyper=False is the curvature-0 counterpart: the particle is a point z of R^2, the tangent plane at its
        # anchor node, and it is read as exp(z) in that node's frame. Its steps are straight lines in that plane.
        self.L, self.target, self.objective, self.hyper = L, list(target), objective, hyper
        self.emb = TreeEmbedding(tau)
        self.m, self.d = 1, 2
        self.size = 6 * 5 ** (L - 1)

    # The step evaluates one particle at a time; focus() tells the objective which chart its candidates are in,
    # and rechart() moves every particle into the frame of the node nearest it after the step.
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
        for y in (pts.reshape(-1, 3) if self.hyper else H.exp_origin(pts.reshape(-1, 2))):
            w = self.emb.decode(y, self.L, self._anchor)
            out.append(tree_distance(w, self.target) if self.objective == 'graded' else float(w != self.target))
        return np.array(out, dtype=float)

    def helix_b(self, point, chart=()):
        """Decode, then certify the address exactly: its quaternion has norm 5^L and right-division returns it."""
        y = np.array([float(v) for v in point[0]])
        w = self.emb.decode(y if self.hyper else H.exp_origin(y), self.L, chart or ())
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


# ================================================================ B4: a hard-threshold network
def gaussian(rng):
    """Box-Muller from the shared rng (Python only: not on a traced path)."""
    u1, u2 = rng.random(), rng.random()
    return math.sqrt(-2 * math.log(1 - u1)) * math.cos(2 * math.pi * u2)


def hierarchical_data(rng, n_train=2000, n_test=1000, dim=16, noise=0.5):
    """Eight classes at the leaves of a depth-3 binary tree. Each tree node gets a random unit vector; a class mean
    is the sum over its path of 2^-(level-1) times the node's vector; inputs add Gaussian noise."""
    def unit():
        v = np.array([gaussian(rng) for _ in range(dim)])
        return v / np.linalg.norm(v)
    node = {(l, k): unit() for l in range(1, 4) for k in range(2 ** l)}
    means = np.array([sum(2.0 ** -(l - 1) * node[(l, c >> (3 - l))] for l in range(1, 4)) for c in range(8)])

    def draw(N):
        y = np.array([rng.below(8) for _ in range(N)])
        x = means[y] + noise * np.array([[gaussian(rng) for _ in range(dim)] for _ in range(N)])
        return x, y
    return draw(n_train), draw(n_test), means


class HardThresholdNet:
    """B4. Encoder W: R^16 -> R^2 (16 Euclidean factors of R^2 holding W's columns as pairs), x -> exp_o(W x) in
    H^2, and 8 prototypes in H^2; the class is the nearest prototype, a hard argmin. Flat counterpart: z = W x and
    prototypes in R^2. Cost: the 0-1 error on the current batch (resample() before each step)."""

    def __init__(self, data, rng, hyper=True, batch=256, dim=16):
        (self.xtr, self.ytr), (self.xte, self.yte), _ = data
        self.rng, self.hyper, self.batch, self.dim = rng, hyper, batch, dim
        if dim != 16:
            raise ValueError('B4 is preregistered with 16 inputs')
        self.d = 2
        self.layout()
        self.resample()

    def layout(self):
        # W is 2 x 16 = 32 numbers = 16 factors of R^2; then 8 prototype factors: m = 24
        self.enc = list(range(16))
        self.protos = list(range(16, 24))
        self.m = 24
        self.flat_factors = tuple(self.enc) if self.hyper else ()

    def resample(self):
        self.bi = np.array([self.rng.below(len(self.ytr)) for _ in range(self.batch)])

    def predict(self, pts, x):
        Wz = pts[..., self.enc, 1:] if self.hyper else pts[..., self.enc, :]      # (..., 16, 2): column j of W
        z = np.einsum('...jk,nj->...nk', Wz, x)                                  # (..., N, 2)
        protos = pts[..., self.protos, :]                                         # (..., 8, 3) or (..., 8, 2)
        if self.hyper:
            Z = H.exp_origin(z)                                                   # (..., N, 3)
            dd = -(-Z[..., :, None, 0] * protos[..., None, :, 0] + np.einsum('...ni,...ki->...nk', Z[..., 1:], protos[..., 1:]))
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
        """Exact error count on the whole training set (integer)."""
        return int(np.sum(self.predict(np.asarray(point)[None], self.xtr)[0] != self.ytr))

    def init_points(self, rng, P, scale=0.3):
        out = np.zeros((P, self.m, 3 if self.hyper else 2))
        for p in range(P):
            for i in range(self.m):
                z = np.array([scale * (2 * rng.random() - 1), scale * (2 * rng.random() - 1)])
                if self.hyper:
                    out[p, i] = [1.0, *z] if i in self.flat_factors else H.from_poincare(z * 0.5)
                else:
                    out[p, i] = z
        return out


# ================================================================ memory words
def memory_word(F_, costs, best, extra=''):
    """A memory word at a zero point: the three channel records, their sum Y (so one erased record is rebuilt from
    the other three, Prop 3.10) and a SHA-256 chain link."""
    Y = sum(costs)
    body = f'{F_}|{costs}|{Y}|{best}|{extra}'
    return {'F': F_, 'costs': list(costs), 'Y': Y, 'best': best, 'hash': hashlib.sha256(body.encode()).hexdigest()[:16]}
