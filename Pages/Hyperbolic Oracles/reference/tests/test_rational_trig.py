"""Section 12.1 of the operator specification, eqs. 85-88: each replacement exactly, the Cayley closed form against the
inverse, the drift sum's order and convention, and the calculator keypad's kernel against 80-digit references."""
from decimal import Decimal as D, getcontext
from fractions import Fraction as F
import math

from hpstep import Rng
from hpstep import exact as X
from hpstep import rational_trig as T


def rq(rng, K=60):
    return F(rng.randint(-K, K), rng.randint(1, K))


def test_eq85_half_angle_identities_are_exact():
    rng = Rng(85)
    for _ in range(300):
        u = [rq(rng) for _ in range(3)]
        c, s2, t2 = T.half_angle(T.dot(u, u))
        assert c * c + s2 == 1
        assert t2 is None or t2 == s2 / (c * c)
    c, s2, _ = T.half_angle(F(49, 100))                    # Q = 0.7^2 = tan^2(theta/2)
    th = 2 * math.atan(0.7)
    assert abs(float(c) - math.cos(th)) < 1e-15 and abs(float(s2) - math.sin(th) ** 2) < 1e-15
    assert T.half_angle(1)[2] is None                      # the pole of tan^2 at theta = pi/2


def test_eq86_rotation_is_exact_and_is_the_cayley_map():
    rng = Rng(86)
    for _ in range(120):
        u = [rq(rng) for _ in range(3)]
        M = T.rot_matrix(u)
        assert X.is_orthogonal(M) and T.rot(u, u) == [F(v) for v in u]
        det = (M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
               + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]))
        assert det == 1
        A = T.skew(u)
        assert X.cayley(A) == X.cayley_inverse(A) == T.rot_matrix([-v for v in u]) == T.cayley_closed(A)


def test_cayley_closed_form_equals_the_inverse_in_two_and_three_dimensions():
    rng = Rng(87)
    for d in (2, 3):
        for _ in range(200):
            A = X.random_skew(rng, d, 9)
            assert X.cayley(A) == X.cayley_inverse(A)
    A4 = X.random_skew(rng, 4, 4)                           # four dimensions keep the inverse
    assert X.cayley(A4) == X.cayley_inverse(A4) and X.is_orthogonal(X.cayley(A4))


def test_eq87_symmedian_and_apollonius_are_harmonic():
    rng = Rng(88)
    n = 0
    for _ in range(200):
        A, C0 = [rq(rng), rq(rng)], rq(rng)
        if A[1] == 0 or C0 == 0:
            continue
        xF, xE, Q2, Q3 = T.symmedian(A, C0)
        if xE is None:
            continue
        assert xF / (2 * C0 - xF) == Q3 / Q2
        assert T.cross_ratio(F(0), 2 * C0, xE, xF) == -1
        n += 1
    assert n > 150
    assert T.symmedian([F(3), F(4)], F(3))[1] is None        # isosceles: the Apollonius point is at infinity


def test_eq88_ghost_quadrance_is_sinh_squared():
    rng = Rng(89)
    for _ in range(200):
        p, r = [rq(rng, 400) / 8 for _ in range(3)], [rq(rng, 400) / 8 for _ in range(3)]
        if T.dot(p, p) >= 1 or T.dot(r, r) >= 1:
            continue
        a = -X.lorentz(X.ghost(p), X.ghost(r))
        assert T.ghost_quadrance(p, r) == a * a - 1
        assert abs(math.asinh(math.sqrt(float(T.ghost_quadrance(p, r)))) - math.acosh(float(a))) < 1e-9


def test_eq88_composition_is_exact_and_the_drift_sum_is_second_order_in_its_order():
    rng = Rng(90)
    for _ in range(150):
        a, b = [rq(rng, 9) for _ in range(3)], [rq(rng, 9) for _ in range(3)]
        g = T.compose(a, b)
        if g is None:
            continue
        assert X.matmul(T.rot_matrix(a), T.rot_matrix(b)) == T.rot_matrix(g)
    base = [[rq(rng, 5) for _ in range(3)] for _ in range(3)]
    errs = []
    for e in (F(1, 100), F(1, 1000)):                               # the same three drifts, scaled down tenfold
        es = [[e * v for v in b] for b in base]
        exact = T.compose(T.compose(es[0], es[1]), es[2])           # R(e1) R(e2) R(e3), e3 acting first
        ds = T.drift_sum(*es)
        rev = [es[0][i] + es[1][i] + es[2][i] + T.cross(es[1], es[0])[i] + T.cross(es[2], es[0])[i] + T.cross(es[2], es[1])[i] for i in range(3)]
        err = lambda v: max(abs(float(x - y)) for x, y in zip(v, exact))
        errs.append((err(ds), err(rev)))
    assert errs[0][0] / errs[1][0] > 500                             # third order: a tenfold step cuts it ~1000x
    assert 50 < errs[0][1] / errs[1][1] < 200                        # the other order is second order: ~100x


def _ref(kind, x):
    getcontext().prec = 90

    def arctan(n):
        y = D(1) / n
        s, t, k = y, y, 1
        while True:
            t *= -y * y
            k += 2
            if abs(t / k) < D(10) ** -88:
                return s
            s += t / k
    pi = 16 * arctan(5) - 4 * arctan(239)
    x = D(x.numerator) / D(x.denominator)
    x = x - 2 * pi * round(x / (2 * pi))
    if kind == 'cos':
        x = x + pi / 2
    s, t, k = x, x, 1
    while abs(t) > D(10) ** -88:
        t *= -x * x / ((k + 1) * (k + 2))
        k += 2
        s += t
    return s


def test_keypad_kernel_is_on_the_circle_and_correct_to_55_digits():
    for a in [F(1), F(10), F(100), F(-5, 2), F(7, 3), F(123456, 1000), F(0)]:
        s, c, t = T.keypad_trig(a)
        assert s * s + c * c == 1
        for kind, v in (('sin', s), ('cos', c)):
            ref = _ref(kind, a)
            getcontext().prec = 90
            assert abs(D(v.numerator) / D(v.denominator) - ref) < D(10) ** -55
    s, c, _ = T.keypad_trig(T.PI64)
    assert s == 0 and c == -1                                 # pi itself lands exactly on (-1, 0)
    # control: the old 3-term polynomial
    x = 1.0
    assert abs((x - x ** 3 / 6 + x ** 5 / 120) - math.sin(1)) > 1e-4
