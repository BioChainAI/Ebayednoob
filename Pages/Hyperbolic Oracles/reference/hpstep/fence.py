"""The 0.7 Claude fence: Tukey's fence for hyperbolic space.

Tukey's fence flags a value beyond Q3 + 1.5 IQR ("outside") or beyond Q3 + 3 IQR ("far out"). It is a rule on
one coordinate. It gives the same verdicts under any positive affine change of that coordinate, and different
verdicts under a nonlinear one. So moving the fence into H^n means choosing the coordinate, and the lemmas
(explainers/fence-tracer.html, CF1-CF9) choose it. The algorithm they lead to:

    1  centre    c = the Frechet median, by a Weiszfeld iteration on the Gram matrix; exactly a positive
                 rational combination of the data, so exact and exactly equivariant (CF2, CF8)
    2  radii     a_i = -<c, x_i> = cosh d(c, x_i) = b_i / sqrt(sigma), with b_i = -<S, x_i> and sigma = -<S, S>
                 exact rationals for the exact combination S (CF1)
    3  quartiles a_(ceil(N/4)) and a_(ceil(3N/4)), order statistics, the same points in every monotone coordinate (CF1)
    4  mass      m_i = the volume of the ball about c through x_i:
                     H^2:  m = cosh d - 1 = a - 1          (area / 2 pi, exact, CF4)
                     H^3:  m = sinh 2d - 2d               (volume / pi, certified, CF4)
    5  fences    Tukey's own fences on m: outside past m3 + 1.5 (m3 - m1), far out past m3 + 3 (m3 - m1) (CF3)
    6  verdicts  exact in H^2 (two rational comparisons: 2b > 5 b3 - 3 b1 and b > 4 b3 - 3 b1); in H^3 decided
                 by the order of the radii where possible and otherwise by fixed-point arithmetic with a proved
                 error bound, doubling the precision until the sign is certain
    7  guard     for data given as distances: no four points of H^n have a four-point defect above ln 2, so a
                 quadruple above it proves that one of its six distances is wrong (CF9)

Why "0.7". For a cloud spread evenly through a ball (the shape of a hierarchy, whose number of nodes grows with
depth as hyperbolic volume does) Tukey's fence on mass lands exactly on the doubling sphere of the upper quartile:
the ball reaching the fence holds twice the mass of the ball holding three quarters of the data (CF3). In the
hyperbolic plane a doubling sphere lies less than ln 2 = 0.693... beyond its ball, and tends to exactly ln 2 as
the ball grows (CF5). ln 2 is also the sharp four-point constant of H^n (CF9). The fence keeps Tukey's 1.5 and
3; the 0.7 is what they become in hyperbolic space.

Points are exact: lists of Fractions on the sheet -x0^2 + |x|^2 = -1. Floats on the reference paths use only
the portable functions below (+, -, *, /, sqrt and fixed loops), so the browser port reproduces every float bit
for bit.
"""
from fractions import Fraction as F
import math

from . import exact as X
from .prng import Rng

LN2 = 0.6931471805599453
LN2_HI = 6.93147180369123816490e-01
LN2_LO = 1.90821492927058770002e-10
INV_LN2 = 1.4426950408889634
SQRT2 = 1.4142135623730951
DATA_BITS = 32                     # data points are lifted from the Poincare grid 2^-32

# ================================================================ portable floats
_POW2 = {0: 1.0}
_v = 1.0
for _k in range(1, 1100):
    _v *= 2.0
    _POW2[_k] = _v if _v != math.inf else math.inf
_v = 1.0
for _k in range(1, 1100):
    _v *= 0.5
    _POW2[-_k] = _v


def pow2(k):
    return _POW2[k]


def pexp(x):
    """e^x with Cody-Waite reduction and a fixed Horner loop of 20 terms."""
    k = math.floor(x * INV_LN2 + 0.5)
    r = (x - k * LN2_HI) - k * LN2_LO
    p = 1.0
    for j in range(20, 0, -1):
        p = 1.0 + r * p / j
    return p * pow2(k)


def pexpm1(x):
    """e^x - 1, by series below 1 in size (no cancellation), else pexp(x) - 1."""
    if abs(x) < 1.0:
        p = 1.0
        for j in range(18, 1, -1):
            p = 1.0 + x * p / j
        return x * p
    return pexp(x) - 1.0


def _atanh_series(u, terms):
    u2 = u * u
    t = u
    s = u
    for k in range(1, terms + 1):
        t = t * u2
        s = s + t / (2 * k + 1)
    return s


def plog(x):
    """ln x for a positive finite x: x = m 2^e with m in (1/sqrt 2, sqrt 2], ln m = 2 atanh((m-1)/(m+1))."""
    e = math.floor(math.log2(x))
    m = x * pow2(-e)
    while m >= 2.0:
        m = m * 0.5
        e += 1
    while m < 1.0:
        m = m * 2.0
        e -= 1
    if m > SQRT2:
        m = m * 0.5
        e += 1
    u = (m - 1.0) / (m + 1.0)
    return e * LN2 + 2.0 * _atanh_series(u, 14)


def plog1p(x):
    """ln(1 + x) for x > -1."""
    if abs(x) < 0.25:
        return 2.0 * _atanh_series(x / (2.0 + x), 12)
    return plog(1.0 + x)


def pacosh1(am1):
    """arcosh(1 + am1) for am1 >= 0, from a - 1 directly (no cancellation near the centre)."""
    if am1 <= 0.0:
        return 0.0
    return plog1p(am1 + math.sqrt(am1 * (am1 + 2.0)))


def psinhmx(x):
    """sinh x - x for x >= 0: series below 1, else (e - 1/e)/2 - x."""
    if x < 1.0:
        x2 = x * x
        p = 1.0
        for k in range(12, 0, -1):                       # x^3/3! (1 + x^2/(4 5) (1 + x^2/(6 7) (...)))
            p = 1.0 + x2 * p / ((2 * k + 2) * (2 * k + 3))
        return x * x2 / 6.0 * p
    e = pexp(x)
    return (e - 1.0 / e) * 0.5 - x


def pcoshm1(x):
    """cosh x - 1 = (e^x - 1)^2 / (2 e^x)."""
    em = pexpm1(x)
    return em * em / (2.0 * (em + 1.0))


def ptanh_half(r):
    """tanh(r/2), the Poincare radius of a point at distance r from the origin."""
    em = pexpm1(r)
    return em / (em + 2.0)


# ================================================================ mass
def mass_of_distance(d, dim):
    """The mass coordinate of a point at distance d: area/2pi in H^2, volume/pi in H^3."""
    return pcoshm1(d) if dim == 2 else psinhmx(2.0 * d)


def mass_of_am1(am1, dim):
    """The same from a - 1 = cosh d - 1 (exact in H^2)."""
    return am1 if dim == 2 else psinhmx(2.0 * pacosh1(am1))


def distance_of_mass(m, dim):
    """The inverse: the radius of the ball of mass m (bisection in H^3, 90 halvings, a fixed loop)."""
    if m <= 0.0:
        return 0.0
    if dim == 2:
        return pacosh1(m)
    lo, hi = 0.0, 1.0
    while psinhmx(2.0 * hi) < m:
        hi = hi * 2.0
    for _ in range(90):
        mid = (lo + hi) * 0.5
        if psinhmx(2.0 * mid) < m:
            lo = mid
        else:
            hi = mid
    return (lo + hi) * 0.5


def rho_of_mass(m, dim):
    """The Poincare radius of the sphere of mass m about the origin."""
    if dim == 2:
        return math.sqrt(m / (m + 2.0))                 # tanh^2(d/2) = (cosh d - 1)/(cosh d + 1)
    return ptanh_half(distance_of_mass(m, dim))


# ================================================================ exact points
def dyadic(p, K=DATA_BITS):
    """Round a float Poincare point to the grid 2^-K (half up); a point on or past the rim steps in by one unit."""
    s = float(2 ** K)
    n = [math.floor(v * s + 0.5) for v in p]
    while sum(t * t for t in n) >= 4 ** K:            # on or past the rim: one grid step in, coordinatewise
        n = [t - 1 if t > 0 else t + 1 if t < 0 else 0 for t in n]
    return [F(t, 2 ** K) for t in n]


def lift(p, K=DATA_BITS):
    """The exact sheet point over a float Poincare point."""
    return X.ghost(dyadic(p, K))


def lorentz(x, y):
    return X.lorentz(x, y)


def qs(v):
    v = F(v)
    return f'{v.numerator}/{v.denominator}'


def _intrep(x):
    """A sheet point as (integer vector, positive denominator), with no common factor."""
    den = 1
    for v in x:
        den = den * v.denominator // math.gcd(den, v.denominator)
    return [int(v * den) for v in x], den


def _lneg(X1, X2):
    """-<X1, X2> on integer vectors."""
    return X1[0] * X2[0] - sum(a * b for a, b in zip(X1[1:], X2[1:]))


# ================================================================ data
class Gen:
    """The datasets, from the shared generator. Directions by rejection from the cube, normals by Marsaglia's
    polar method with a spare, radii from uniform mass (ball) or wrapped normals (gauss)."""

    def __init__(self, seed):
        self.rng = Rng(seed)
        self.spare = None

    def direction(self, n):
        while True:
            v = [2.0 * self.rng.random() - 1.0 for _ in range(n)]
            s = sum(t * t for t in v)
            if 1e-6 < s <= 1.0:
                r = math.sqrt(s)
                return [t / r for t in v]

    def normal(self):
        if self.spare is not None:
            z, self.spare = self.spare, None
            return z
        while True:
            x = 2.0 * self.rng.random() - 1.0
            y = 2.0 * self.rng.random() - 1.0
            s = x * x + y * y
            if 0.0 < s < 1.0:
                f = math.sqrt(-2.0 * plog(s) / s)
                self.spare = y * f
                return x * f


def ball_mass(R, dim):
    return mass_of_distance(R, dim)


def generate(cfg):
    """Build a dataset. cfg: dim (2|3), kind ('ball'|'gauss'|'tree'), N, R, sigma, L, seed, and outliers
    out = {'k': count, 'f': mass factor over the ball of radius R, 'mode': 'shell'|'cluster'|'deep', 'depth': extra
    tree levels}. Returns (points, labels) with label 1 on planted outliers, which come last."""
    dim, kind = cfg['dim'], cfg['kind']
    g = Gen(cfg.get('seed', 0))
    pts = []
    if kind == 'ball':
        mR = ball_mass(cfg['R'], dim)
        for _ in range(cfg['N']):
            m = g.rng.random() * mR
            u = g.direction(dim)
            rho = rho_of_mass(m, dim)
            pts.append(lift([rho * t for t in u]))
    elif kind == 'gauss':
        s = cfg['sigma']
        for _ in range(cfg['N']):
            v = [s * g.normal() for _ in range(dim)]
            r = math.sqrt(sum(t * t for t in v))
            if r == 0.0:
                pts.append(lift([0.0] * dim))
                continue
            rho = ptanh_half(r)
            pts.append(lift([rho * t / r for t in v]))
    elif kind == 'tree':
        if dim != 3:
            raise ValueError('the tree dataset is the norm-5 tree of H^3')
        from .decode3d import TreeEmbedding3D
        from .problems import children
        emb = TreeEmbedding3D()
        words = [()]
        for L in range(cfg['L']):
            for w in [w for w in words if len(w) == L]:
                words += [w + (c,) for c in children(w)]
        pts = [emb.point_exact(w) for w in words]
    else:
        raise ValueError(f'unknown dataset {kind!r}')
    labels = [0] * len(pts)
    out = cfg.get('out') or {}
    k = out.get('k', 0)
    if k:
        mode = out.get('mode', 'shell')
        if mode == 'deep':
            from .decode3d import TreeEmbedding3D
            from .problems import children
            emb = TreeEmbedding3D()
            for _ in range(k):
                w = (g.rng.below(6),)
                while len(w) < cfg['L'] + out.get('depth', 1):
                    ch = children(w)
                    w = w + (ch[g.rng.below(len(ch))],)
                pts.append(emb.point_exact(w))
        else:
            mR = ball_mass(cfg['R'], dim)
            m = out['f'] * mR
            rho = rho_of_mass(m, dim)
            if mode == 'shell':
                for _ in range(k):
                    u = g.direction(dim)
                    pts.append(lift([rho * t for t in u]))
            elif mode == 'cluster':
                X0 = lift([rho * t for t in g.direction(dim)])
                L0 = X.boost(X0)
                for _ in range(k):
                    j = 0.02 * g.rng.random()
                    z = lift([j * t for t in g.direction(dim)])
                    pts.append(X.matvec(L0, z))
            else:
                raise ValueError(f'unknown outlier mode {mode!r}')
        labels += [1] * k
    return pts, labels


def random_isometry(rng, dim, K=64):
    """A rational Lorentz matrix: the boost of a random rational point after a Cayley rotation."""
    p = [F(rng.randint(-K, K), 2 * K) for _ in range(dim)]
    R = X.random_rotation(rng, dim)
    R4 = [[F(1)] + [F(0)] * dim] + [[F(0)] + [F(v) for v in row] for row in R]
    return X.matmul(X.boost(X.ghost(p)), R4)


def transform(L, pts):
    return [X.matvec(L, x) for x in pts]


# ================================================================ certified mass in H^3
def isqrt(n):
    return math.isqrt(n)


def _atanh_fixed(U, P):
    """sum U^(2k+1)/(2k+1) at scale 2^P, for 0 <= U <= 2^P / 3. Returns (S, terms)."""
    U2 = (U * U) >> P
    S, T, k = 0, U, 0
    while T:
        S += T // (2 * k + 1)
        T = (T * U2) >> P
        k += 1
    return S, k


def ln2_fixed(P):
    S, n = _atanh_fixed((1 << P) // 3, P)
    return 2 * S, 2 * (3 * n + 4)


def ln_fixed(Y, P, err_in):
    """ln(Y / 2^P) at scale 2^P for Y >= 2^P, with |error| <= the returned bound (in units of 2^-P).

    y = 2^e z with z in [1, 2); ln z = 2 atanh(u), u = (z - 1)/(z + 1) <= 1/3. Each truncation costs at most
    one unit; the series' terms shrink by u^2 <= 1/9, so an error in u or u^2 never grows from term to term.
    The bound is deliberately generous: it only has to be true."""
    e = Y.bit_length() - 1 - P
    Z = Y >> e
    one = 1 << P
    U = ((Z - one) << P) // (Z + one)
    S, n = _atanh_fixed(U, P)
    L2, e2 = ln2_fixed(P)
    val = 2 * S + e * L2
    err = 2 * (3 * n + 4) + e * e2 + 2 + err_in
    return val, err


def mass_fixed(A2, P):
    """m = sinh 2d - 2d = 2 a s - 2 ln(a + s), s = sqrt(a^2 - 1), from the exact rational A2 = a^2 >= 1, at
    scale 2^P, with an error bound. Integers only, all non-negative, so floor division means the same in every
    language. Each isqrt of a floored quotient is within one unit of the true root."""
    A2 = F(A2)
    u, v = A2.numerator, A2.denominator
    if u < v:
        raise ValueError('a radius below 1')
    if u == v:
        return 0, 0
    four = 1 << (2 * P)
    A = isqrt(u * four // v)                            # a 2^P, error < 1
    S = isqrt((u - v) * four // v)                      # s 2^P, error < 1
    T = isqrt(4 * u * (u - v) * four // (v * v))        # 2 a s 2^P, error < 1
    Lv, Le = ln_fixed(A + S, P, 2)
    return T - 2 * Lv, 1 + 2 * Le


def certify_sign(coefs, A2s, P0=64, Pmax=8192):
    """The sign of sum c_k m(a_k) in H^3, certified. Returns (sign, bits); sign 0 means unresolved at Pmax."""
    P = P0
    while P <= Pmax:
        C, E = 0, 0
        for c, A2 in zip(coefs, A2s):
            M, e = mass_fixed(A2, P)
            C += c * M
            E += abs(c) * e
        if C > E:
            return 1, P
        if C < -E:
            return -1, P
        P *= 2
    return 0, Pmax


# ================================================================ the centre
def quartile_indices(N):
    """Order-statistic quartiles (type 1): the ceil(pN)-th smallest, 0-based."""
    return (N + 3) // 4 - 1, (N + 1) // 2 - 1, (3 * N + 3) // 4 - 1


def medoid(ip):
    """The Lorentz medoid of integer-represented points: least float sum of portable distances, the sum taken
    over i in order, ties to the lowest index. The float inputs are the exact values a_ij - 1, correctly
    rounded, so any isometry of the data gives the same sums bit for bit."""
    N = len(ip)
    S = [0.0] * N
    for j in range(N):
        Xj, Dj = ip[j]
        s = 0.0
        for i in range(N):
            Xi, Di = ip[i]
            num = _lneg(Xi, Xj) - Di * Dj
            s += pacosh1(num / (Di * Dj)) if num > 0 else 0.0
        S[j] = s
    best = 0
    for j in range(1, N):
        if S[j] < S[best]:
            best = j
    return best, S


def gram(ip):
    """G_ij = -<x_i, x_j> = cosh d_ij as floats (correctly rounded from the exact values) and the exact
    numerators of G_ij - 1, so distances near 0 lose nothing."""
    N = len(ip)
    G = [[1.0] * N for _ in range(N)]
    for i in range(N):
        Xi, Di = ip[i]
        for j in range(i + 1, N):
            Xj, Dj = ip[j]
            v = _lneg(Xi, Xj) / (Di * Dj)
            G[i][j] = G[j][i] = v
    return G


def frechet_median(G, tol=1e-13, max_iter=2000):
    """The Frechet (geometric) median, minimiser of sum_i d(c, x_i), by the hyperbolic Weiszfeld iteration

        c  <-  normalise( sum_i x_i / sinh d(c, x_i) ),

    whose fixed points are exactly the critical points of the sum of distances (CF8). The centre is carried as
    weights on the data, c = sum lam_i x_i / s, so every quantity comes from the Gram matrix alone: -<c, x_j> =
    (G lam)_j / s with s^2 = lam^T G lam. An isometry leaves G unchanged, so it leaves every float of the
    iteration unchanged, bit for bit. Starts from equal weights; a point on the centre gets weight 0 that step.
    Returns (lam, iterations)."""
    N = len(G)
    lam = [1.0 / N] * N
    it = 0
    for it in range(1, max_iter + 1):
        v = [0.0] * N
        for i in range(N):
            li, Gi = lam[i], G[i]
            if li != 0.0:
                for j in range(N):
                    v[j] += li * Gi[j]
        s2 = 0.0
        for j in range(N):
            s2 += lam[j] * v[j]
        s = math.sqrt(s2)
        w = [0.0] * N
        tot = 0.0
        for j in range(N):
            a = v[j] / s
            am1 = a - 1.0
            if am1 > 1e-30:
                w[j] = 1.0 / math.sqrt(am1 * (a + 1.0))
            tot += w[j]
        delta = 0.0
        for j in range(N):
            w[j] = w[j] / tot
            delta = max(delta, abs(w[j] - lam[j]))
        lam = w
        if delta < tol:
            break
    return lam, it


def _radial(S, ip):
    """b_i = -<S, x_i> as exact Fractions, for an integer vector S."""
    return [F(_lneg(S, Xi), Di) for Xi, Di in ip]


def _combine(ip, lam):
    """An integer vector proportional to sum lam_i x_i, with each lam_i read as its exact binary value."""
    fr = [(F(l), i) for i, l in enumerate(lam) if l != 0.0]
    L = 1
    for q, i in fr:
        d = q.denominator * ip[i][1]
        L = L * d // math.gcd(L, d)
    S = [0] * len(ip[0][0])
    for q, i in fr:
        Xi, Di = ip[i]
        k = L // (q.denominator * Di) * q.numerator
        S = [s + k * x for s, x in zip(S, Xi)]
    g = 0
    for t in S:
        g = math.gcd(g, t)
    return [t // g for t in S] if g > 1 else S


# ================================================================ the fence
def fence(points, dim, guard=False, centre='median'):
    """Run the 0.7 Claude fence. Returns a dict with every intermediate the tracer shows.

    centre: 'median' (the Frechet median, the default) or 'medoid' (the best data point, for comparison: in a
    broad hyperbolic cloud no data point lies near the centre, CF8)."""
    N = len(points)
    ip = [_intrep(x) for x in points]
    c0, sums = medoid(ip)
    if centre == 'medoid':
        lam, steps = [1.0 if i == c0 else 0.0 for i in range(N)], 0
    else:
        lam, steps = frechet_median(gram(ip))
    S = _combine(ip, lam)
    sigma = _lneg(S, S)                                 # -<S, S> > 0; the centre is S / sqrt(sigma)
    b = _radial(S, ip)
    w = [(bi * bi - sigma) / sigma for bi in b]         # sinh^2 d_i, exact
    order = sorted(range(N), key=lambda i: (b[i], i))
    i1, i2, i3 = quartile_indices(N)
    j1, j2, j3 = order[i1], order[i2], order[i3]
    b1, b3 = b[j1], b[j3]
    A2 = [bi * bi / sigma for bi in b]                  # a_i^2, exact
    verdict, cert = [0] * N, [''] * N
    for i in range(N):
        if b[i] <= b3:
            verdict[i], cert[i] = 0, 'order'
        elif b1 == b3:
            verdict[i], cert[i] = 2, 'order'            # both fences sit on m3 when the IQR is 0
        elif dim == 2:
            # m = a - 1 and a = b / sqrt(sigma): Tukey's fence is unchanged by the shift and the positive scale
            verdict[i], cert[i] = decide_h2(b[i], b1, b3), 'exact'
        else:
            s1, p1 = certify_sign([2, 3, -5], [A2[i], A2[j1], A2[j3]])
            if s1 <= 0:
                verdict[i], cert[i] = 0, (f'bits:{p1}' if s1 else 'unresolved')
                continue
            s2, p2 = certify_sign([1, 3, -4], [A2[i], A2[j1], A2[j3]])
            verdict[i] = 2 if s2 > 0 else 1
            cert[i] = f'bits:{max(p1, p2)}' if s2 else 'unresolved'
    wf = [float(v) for v in w]
    am1f = [v / (math.sqrt(1.0 + v) + 1.0) for v in wf]      # a - 1 = w / (a + 1)
    mf = [mass_of_am1(v, dim) for v in am1f]
    m1f, m2f, m3f = mf[j1], mf[j2], mf[j3]
    mFf, mGf = m3f + 1.5 * (m3f - m1f), m3f + 3.0 * (m3f - m1f)
    vfloat = [2 if m > mGf else 1 if m > mFf else 0 for m in mf]
    d = [pacosh1(v) for v in am1f]
    d1, d2, d3 = d[j1], d[j2], d[j3]
    dF, dG = d3 + 1.5 * (d3 - d1), d3 + 3.0 * (d3 - d1)
    vdt = [2 if x > dG else 1 if x > dF else 0 for x in d]
    rF, rG = distance_of_mass(mFf, dim), distance_of_mass(mGf, dim)
    res = {
        'N': N, 'dim': dim, 'medoid': c0, 'sums': sums, 'lam': lam, 'S': S, 'sigma': sigma, 'steps': steps,
        'b': b, 'w': w, 'order': order, 'idx': (i1, i2, i3), 'q': (j1, j2, j3),
        'm1': m1f, 'm2': m2f, 'm3': m3f, 'mF': mFf, 'mG': mGf,
        'verdict': verdict, 'cert': cert, 'verdict_float': vfloat, 'mass': mf, 'dist': d,
        'd1': d1, 'd2': d2, 'd3': d3, 'rF': rF, 'rG': rG, 'gap': rF - d3, 'gapG': rG - d3,
        'ratio': mFf / m3f if m3f > 0 else math.inf, 'tukey_d': {'F': dF, 'G': dG, 'verdict': vdt},
    }
    if guard:
        res['guard'] = guard_check(distance_matrix(points))
    return res


def centre_point(res):
    """The centre as floats on the sheet: S / sqrt(sigma), scaled safely for large integers."""
    S, sigma = res['S'], res['sigma']
    sh = max(0, max(abs(s) for s in S).bit_length() - 500)
    Sf = [float(F(s, 1 << sh)) for s in S]
    sf = math.sqrt(max(Sf[0] * Sf[0] - sum(t * t for t in Sf[1:]), 0.0))
    return [t / sf for t in Sf]


# ================================================================ the guard (four-point, ln 2)
def distance_matrix(points):
    ip = [_intrep(x) for x in points]
    N = len(ip)
    D = [[0.0] * N for _ in range(N)]
    for i in range(N):
        for j in range(i + 1, N):
            num = _lneg(ip[i][0], ip[j][0]) - ip[i][1] * ip[j][1]
            D[i][j] = D[j][i] = pacosh1(num / (ip[i][1] * ip[j][1])) if num > 0 else 0.0
    return D


def defect(D, i, j, k, l):
    """The four-point defect: (largest - second largest of the three pair sums) / 2."""
    s = sorted((D[i][j] + D[k][l], D[i][k] + D[j][l], D[i][l] + D[j][k]))
    return (s[2] - s[1]) * 0.5


def corrupt(D, k, delta, seed):
    """Add delta to k distinct distances (both entries), chosen by the shared generator. Returns (D', pairs)."""
    N = len(D)
    pairs = [(i, j) for i in range(N) for j in range(i + 1, N)]
    rng = Rng(seed)
    pick = sorted(rng.sample(len(pairs), k))
    E = [row[:] for row in D]
    out = []
    for t in pick:
        i, j = pairs[t]
        E[i][j] += delta
        E[j][i] += delta
        out.append((i, j))
    return E, out


def guard_check(D, tol=1e-9, sample=None, seed=0):
    """Every quadruple (or `sample` random ones) against ln 2. Returns the largest defect, its quadruple, the
    number above ln 2 + tol, and how often each pair appears in a quadruple above it."""
    N = len(D)
    worst, wq, bad = -1.0, None, 0
    blame = {}

    def visit(q):
        nonlocal worst, wq, bad
        v = defect(D, *q)
        if v > worst:
            worst, wq = v, q
        if v > LN2 + tol:
            bad += 1
            i, j, k, l = q
            for p in ((i, j), (i, k), (i, l), (j, k), (j, l), (k, l)):
                blame[p] = blame.get(p, 0) + 1

    if sample is None:
        for i in range(N):
            for j in range(i + 1, N):
                for k in range(j + 1, N):
                    for l in range(k + 1, N):
                        visit((i, j, k, l))
    else:
        rng = Rng(seed)
        for _ in range(sample):
            visit(tuple(sorted(rng.sample(N, 4))))
    top = sorted(blame.items(), key=lambda kv: (-kv[1], kv[0]))[:6]
    return {'worst': worst, 'quad': wq, 'bad': bad, 'top': top}


def ideal_square(R, dim=2):
    """Four points at distance R from the origin on the corners of a square: as R grows the defect tends to ln 2."""
    rho = ptanh_half(R)
    dirs = [(1.0, 0.0), (0.0, 1.0), (-1.0, 0.0), (0.0, -1.0)]
    return [lift([rho * u for u in v] + [0.0] * (dim - 2), K=60) for v in dirs]


# ================================================================ comparisons
def euclid_median(V, tol=1e-15, max_iter=5000):
    """The Euclidean geometric median by Weiszfeld's iteration, from the mean (the flat limit of the centre)."""
    n = len(V[0])
    c = [sum(v[k] for v in V) / len(V) for k in range(n)]
    for _ in range(max_iter):
        num, tot = [0.0] * n, 0.0
        for v in V:
            r = math.sqrt(sum((v[k] - c[k]) ** 2 for k in range(n)))
            if r > 1e-300:
                w = 1.0 / r
                tot += w
                for k in range(n):
                    num[k] += w * v[k]
        c2 = [t / tot for t in num]
        step = math.sqrt(sum((c2[k] - c[k]) ** 2 for k in range(n)))
        c = c2
        if step < tol * (1.0 + math.sqrt(sum(t * t for t in c))):
            break
    return c


def euclid_volume_fence(V, n):
    """Tukey's fence on |v - median|^n for flat vectors: the flat limit of the Claude fence (CF6)."""
    c = euclid_median(V)
    m = [sum((v[k] - c[k]) ** 2 for k in range(n)) ** (n / 2.0) for v in V]
    N = len(m)
    order = sorted(range(N), key=lambda i: (m[i], i))
    i1, _, i3 = quartile_indices(N)
    m1, m3 = m[order[i1]], m[order[i3]]
    mF, mG = m3 + 1.5 * (m3 - m1), m3 + 3.0 * (m3 - m1)
    return [2 if x > mG else 1 if x > mF else 0 for x in m]


def exp_origin(v, eps=1.0, K=DATA_BITS):
    """The exact point over exp_o(eps v): Poincare radius tanh(eps |v| / 2) along v."""
    r = math.sqrt(sum(t * t for t in v))
    if r == 0.0:
        return lift([0.0] * len(v), K)
    rho = ptanh_half(eps * r)
    return lift([rho * t / r for t in v], K)


def median_residual(points, res):
    """|sum_i (x_i + <c, x_i> c) / sinh d_i| over sum_i |...|: zero at a critical point of sum d (CF8)."""
    c = centre_point(res)
    tot, acc = 0.0, [0.0] * len(c)
    for x in points:
        xf = [float(t) for t in x]
        a = -(-c[0] * xf[0] + sum(p * q for p, q in zip(c[1:], xf[1:])))
        sh = math.sqrt(max(a * a - 1.0, 0.0))
        if sh < 1e-12:
            continue
        g = [(xf[k] - a * c[k]) / sh for k in range(len(c))]
        acc = [p + q for p, q in zip(acc, g)]
        tot += math.sqrt(abs(-g[0] * g[0] + sum(t * t for t in g[1:])))
    return math.sqrt(abs(-acc[0] * acc[0] + sum(t * t for t in acc[1:]))) / tot


def decide_h2(b, b1, b3):
    """The exact H^2 verdict from the radii b (any positive multiple of cosh d): 0 in, 1 outside, 2 far out."""
    return 2 if b > 4 * b3 - 3 * b1 else 1 if 2 * b > 5 * b3 - 3 * b1 else 0


def decide_h2_float(b, b1, b3):
    b, b1, b3 = float(b), float(b1), float(b3)
    m1, m3, m = b1 - 1.0, b3 - 1.0, b - 1.0
    return 2 if m > m3 + 3.0 * (m3 - m1) else 1 if m > m3 + 1.5 * (m3 - m1) else 0


def doubling_gap(Q, dim, f=2.0):
    """How far beyond radius Q the ball of f times its mass reaches (CF5)."""
    return distance_of_mass(f * mass_of_distance(Q, dim), dim) - Q


def population_radii(R, dim):
    """The quartile radii of the uniform ball of radius R, from its mass (CF3, CF7): (Q1, median, Q3)."""
    mR = mass_of_distance(R, dim)
    return tuple(distance_of_mass(p * mR, dim) for p in (0.25, 0.5, 0.75))
