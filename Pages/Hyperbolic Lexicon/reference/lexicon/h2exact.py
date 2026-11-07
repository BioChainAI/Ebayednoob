"""The exact H^2 tree of D3 (Amendment 1, item 6), as spike S2 built it: exact points as integer frames over one
denominator per depth, the sheet identity, exact greedy decoding with tie counts, bits, and the H2 arm of L4/L5.

Points lie on x0^2 - x1^2 - x2^2 = 1. Root letters 0..5 take the directions (1,0), (3/5,4/5), (3/5,-4/5),
(-7/25,24/25), (-7/25,-24/25), (-1,0) in that order; below the root, P.children(w)[k], k = 0..4, takes the first
five in the local frame (back is (-1,0)). A step is R(u) B(t): R(u) = [[1,0,0],[0,u1,-u2],[0,u2,u1]] takes (1,0) to
u, B(t) is the boost along x1 with cosh = (1+t^2)/(1-t^2), sinh = 2t/(1-t^2). D3 fixes t = 11/13 (cosh 145/24,
sinh 143/24, tau = ln 12); t = 3/4 is L3's control 4. Frames compose left to right; a point is the frame's first
column. Exact greedy decoding carries the point into each frame with J M^T J and takes the allowed child direction
with the largest exact dot product with the spatial part, ties to the lower index (ties are counted).

Integer scaling. With m = cosh + sinh = (1+t)/(1-t) an integer (t = (m-1)/(m+1)): 50m S is an integer matrix for
every step S (25 R(u) is integral, and 2m B is), and the frame F_n of every word of n letters satisfies

    N_n = h (25m)^n F_n is an integer matrix, with h = 2 for even m and h = 1 for odd m.

Odd m (t = 3/4: m = 7, den 175^n): 25m S is integral, so N_{n+1} = N_n (25m S). Even m (t = 11/13: m = 12,
den 2 * 300^n): N_{n+1} = N_n (50m S) / 2, and the division is exact. Proof, by induction on H(n): N_n is integral
and N_n v = 0 mod 2, v = (1,1,0). H(0): N_0 = 2I. Mod 2, 25 R(u) = I (u1 is 1, 3/5 or -7/25: odd over odd; u2 is
0, 4/5 or 24/25: even over odd) and 2mB = [[m^2+1, m^2-1, 0], [m^2-1, m^2+1, 0], [0, 0, 2m]] = v v^T (m^2 +- 1 odd),
so 50m S = v v^T mod 2 and N_n (50m S) = (N_n v) v^T = 0 mod 2: N_{n+1} is integral. And B v = m v (v is a light-cone
vector), so N_{n+1} v = N_n (25m R(u) B) v = 25m^2 N_n R(u) v, even since m is: H(n+1). These are the smallest
denominators: their lcm over all words of n letters is exactly h (25m)^n for n = 1..6 (tests/test_h2exact.py).
For any other t the scaling is d^n with d the lcm of the step entries' denominators. The code checks every division.

    H2Tree(t=11/13)            .points(words) -> [X] (x = X / den(len)), .point(word), .den(n), .on_sheet(X, n)
                               .decode(X, L) -> (word, ties) on integers; .decode_fraction(y, L) the literal port
                               .step_q, .step_inv_q (Fractions), .tau, .t, .m; bits and text of a point X of n
                               letters: h3tree.coord_bits / point_bits / coords_text (X, T.den(n))
    TREE                       H2Tree(11/13), D3's tree
    arm(words, name, t)        the H2 arm for lexicon.rank (one common denominator den(Lmax))

hpstep.problems.children is imported in place, unchanged.
"""
import math
from fractions import Fraction as F

from hpstep.problems import children

from .h3tree import walk

T_D3 = F(11, 13)
DIRS = ((F(1), F(0)), (F(3, 5), F(4, 5)), (F(3, 5), F(-4, 5)), (F(-7, 25), F(24, 25)), (F(-7, 25), F(-24, 25)),
        (F(-1), F(0)))
J = (-1, 1, 1)


def slot(prev, g):
    """The direction index of the child g: the generator itself at the root (prev None), else its index among
    P.children of the parent (which depends on the parent's last letter only)."""
    return g if prev is None else children((prev,)).index(g)


def _matmul(A, B):
    n = len(A)
    return tuple(tuple(sum((A[i][k] * B[k][j] for k in range(n)), F(0)) for j in range(n)) for i in range(n))


def _lcm(a, b):
    return a * b // math.gcd(a, b)


class H2Tree:
    def __init__(self, t=T_D3):
        self.t = F(t)
        tt = self.t * self.t
        self.cosh, self.sinh = (1 + tt) / (1 - tt), 2 * self.t / (1 - tt)
        self.m = self.cosh + self.sinh                       # e^tau
        self.tau = 2 * math.atanh(float(self.t))
        B = ((self.cosh, self.sinh, F(0)), (self.sinh, self.cosh, F(0)), (F(0), F(0), F(1)))
        self.rot = tuple(((F(1), F(0), F(0)), (F(0), u1, -u2), (F(0), u2, u1)) for u1, u2 in DIRS)
        self.step_q = tuple(_matmul(R, B) for R in self.rot)
        self.step_inv_q = tuple(tuple(tuple(J[i] * M[j][i] * J[j] for j in range(3)) for i in range(3))
                                for M in self.step_q)
        # the integer scheme: K = d S integral, N_{n+1} = N_n K / g, den(n) = h (d / g)^n
        if self.m.denominator == 1:
            m = self.m.numerator
            self.g, self.h = (2, 2) if m % 2 == 0 else (1, 1)
            d = 25 * m * self.g
        else:
            d = 1
            for M in self.step_q:
                for row in M:
                    for x in row:
                        d = _lcm(d, x.denominator)
            self.g, self.h = 1, 1
        self.d, self.c = d, d // self.g
        self.K = tuple(self._integral(M, d) for M in self.step_q)
        self.K_inv = tuple(self._integral(M, d) for M in self.step_inv_q)
        # transposed sparse form of K for the column steps: _cols[s][j] = ((k, K[k][j]), ...)
        self._cols = tuple(tuple(tuple((k, K[k][j]) for k in range(3) if K[k][j]) for j in range(3)) for K in self.K)
        self.dirs25 = tuple((int(25 * u1), int(25 * u2)) for u1, u2 in DIRS)

    @staticmethod
    def _integral(M, d):
        out = []
        for row in M:
            r = []
            for x in row:
                y = x * d
                if y.denominator != 1:
                    raise ValueError(f'{d} times a step is not integral')
                r.append(int(y))
            out.append(tuple(r))
        return tuple(out)

    def den(self, n):
        """The denominator of every point (and frame) of a word of n letters: h (d/g)^n."""
        return self.h * self.c ** n

    # ---- exact points
    def _step(self, N, prev, g, i):
        cols, gg = [], self.g
        for terms in self._cols[slot(prev, g)]:
            col = [0, 0, 0]
            for k, c in terms:
                a = N[k]
                col[0] += c * a[0]
                col[1] += c * a[1]
                col[2] += c * a[2]
            if gg != 1:
                if col[0] % gg or col[1] % gg or col[2] % gg:
                    raise ArithmeticError('the integer frame is not divisible: the scaling proof does not apply')
                col = [x // gg for x in col]
            cols.append(tuple(col))
        return tuple(cols)

    def frames(self, words):
        """Integer frames N (tuples of 3 columns) with F = N / den(len), aligned with `words`."""
        h = self.h
        return walk([tuple(w) for w in words], ((h, 0, 0), (0, h, 0), (0, 0, h)), self._step)

    def points(self, words):
        """Exact points X (integer 3-tuples), x = X / den(len(word)), aligned with `words`."""
        return [N[0] for N in self.frames(words)]

    def point(self, word):
        return self.points([tuple(word)])[0]

    def point_q(self, word):
        """The point by the Fraction frame product, left to right (spike S2's Q path; slow, for tests)."""
        M = tuple(tuple(F(int(i == j)) for j in range(3)) for i in range(3))
        for i, g in enumerate(word):
            M = _matmul(M, self.step_q[slot(word[i - 1] if i else None, g)])
        return [M[r][0] for r in range(3)]

    def on_sheet(self, X, n):
        """X0^2 - X1^2 - X2^2 = den(n)^2 and X0 > 0: the exact sheet identity of x = X / den(n)."""
        D = self.den(n)
        return X[0] > 0 and X[0] * X[0] - X[1] * X[1] - X[2] * X[2] == D * D

    def fractions(self, X, n):
        D = self.den(n)
        return [F(x, D) for x in X]

    # ---- exact greedy decoding
    def decode(self, X, L):
        """Exact greedy decoding to depth L on integers: returns (word, ties). X may carry any positive scale.

        The same computation as decode_fraction: the query is held as c y with c > 0 and carried by K_inv = d J S^T J
        (c grows by d per level), and each score is 25 (u1 y1 + u2 y2) scaled by c; positive scalings keep every
        comparison and every tie."""
        word, v, ties = [], tuple(X), 0
        for _ in range(L):
            allowed = children(word)
            root = not word
            best, bk, nbest = None, 0, 0
            for k, g in enumerate(allowed):
                a, b = self.dirs25[g if root else k]
                sc = a * v[1] + b * v[2]
                if best is None or sc > best:
                    best, bk, nbest = sc, k, 1
                elif sc == best:
                    nbest += 1
            if nbest > 1:
                ties += 1
            g = allowed[bk]
            S = self.K_inv[g if root else bk]
            word.append(g)
            v = (S[0][0] * v[0] + S[0][1] * v[1] + S[0][2] * v[2],
                 S[1][0] * v[0] + S[1][1] * v[1] + S[1][2] * v[2],
                 S[2][0] * v[0] + S[2][1] * v[1] + S[2][2] * v[2])
        return tuple(word), ties

    def decode_fraction(self, y, L):
        """Spike S2's TreeH2Exact.decode, line for line, on Fractions: returns (word, ties, last local point)."""
        word, local, ties = [], list(y), 0
        for _ in range(L):
            allowed = children(word)
            scores = [DIRS[g if not word else k][0] * local[1] + DIRS[g if not word else k][1] * local[2]
                      for k, g in enumerate(allowed)]
            best, bk = None, -1
            for k, sc in enumerate(scores):
                if best is None or sc > best:
                    best, bk = sc, k
            if sum(1 for sc in scores if sc == best) > 1:
                ties += 1
            g = allowed[bk]
            bs = bk if word else g
            word.append(g)
            M = self.step_inv_q[bs]
            local = [sum((M[i][k] * local[k] for k in range(3)), F(0)) for i in range(3)]
        return tuple(word), ties, local

    def decodes(self, word):
        """The word's exact point decodes back to it (L3(e) in H^2)."""
        X = self.point(word)
        return self.decode(X, len(word))[0] == tuple(word)


TREE = H2Tree()


def arm(words, name='H2', t=T_D3):
    """The H2 arm for lexicon.rank: the points over the common denominator den(Lmax)."""
    from .rank import Arm
    T = TREE if F(t) == T_D3 else H2Tree(t)
    pts = T.points(words)
    L = max(len(w) for w in words)
    return Arm.from_points(name, 'lorentz', pts, [T.c ** (L - len(w)) for w in words], T.den(L), tau=T.tau)
