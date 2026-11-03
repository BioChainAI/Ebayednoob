"""The 0.7 Claude fence: the portable kernels, the certified mass, and the lemmas CF1-CF9, each with a control
that the check must fail (so a check that cannot fail is caught)."""
from fractions import Fraction as F
import math

from hpstep import Rng
from hpstep import exact as X
from hpstep import fence as Fz

LN2, LN3 = math.log(2.0), math.log(3.0)


def small(dim, kind='ball', N=60, seed=1, **kw):
    cfg = {'dim': dim, 'kind': kind, 'N': N, 'R': kw.get('R', 3.0), 'sigma': kw.get('sigma', 1.0), 'L': kw.get('L', 2),
           'seed': seed, 'out': kw.get('out', {'k': 4, 'f': 3.0, 'mode': 'shell'})}
    return Fz.generate(cfg)


# ---------------------------------------------------------------- kernels
def test_portable_kernels_match_libm():
    rng = Rng(11)
    for _ in range(3000):
        x = 60 * rng.random() - 30
        assert abs(Fz.pexp(x) / math.exp(x) - 1) < 4e-16
        y = math.exp(100 * rng.random() - 50)
        assert abs(Fz.plog(y) - math.log(y)) <= 4e-16 * max(1.0, abs(math.log(y)))
        z = 8 * rng.random()
        assert abs(Fz.pexpm1(z - 4) - math.expm1(z - 4)) <= 4e-16 * max(1e-300, abs(math.expm1(z - 4)))
        assert abs(Fz.ptanh_half(z) - math.tanh(z / 2)) <= 4e-16 * math.tanh(z / 2) + 1e-300
        u = z ** 3
        ref = math.log1p(u + math.sqrt(u * (u + 2)))           # arcosh(1 + u) without rounding 1 + u
        assert abs(Fz.pacosh1(u) - ref) <= 1e-15 * ref
        if z > 1:
            assert abs(Fz.psinhmx(z) / (math.sinh(z) - z) - 1) < 1e-14


def test_mass_inverse_round_trips():
    for dim in (2, 3):
        for m in (1e-6, 0.01, 0.7, 5.0, 300.0, 1e7):
            d = Fz.distance_of_mass(m, dim)
            assert abs(Fz.mass_of_distance(d, dim) / m - 1) < 1e-12


def test_certified_mass_bounds_hold_and_are_needed():
    rng = Rng(12)
    for _ in range(40):
        a = F(rng.randint(1, 10 ** 6), rng.randint(1, 1000)) + 1
        A2 = a * a
        ref, eref = Fz.mass_fixed(A2, 1024)
        for P in (64, 128, 256):
            M, e = Fz.mass_fixed(A2, P)
            # |M 2^-P - m| <= e 2^-P, with m known to within eref 2^-1024 from the 1024-bit value
            assert abs(M * 2 ** (1024 - P) - ref) <= e * 2 ** (1024 - P) + eref
        d = math.acosh(float(a))
        assert abs(ref / 2 ** 1024 - (math.sinh(2 * d) - 2 * d)) <= 1e-12 * (math.sinh(2 * d))
    # control: with the bound ignored, the 64-bit value misjudges a near tie that the certificate settles
    a1, a3 = F(3), F(9, 2)
    target = (5 * Fz.mass_fixed(a3 * a3, 512)[0] - 3 * Fz.mass_fixed(a1 * a1, 512)[0])   # 2 m_F at 2^512
    lo, hi = F(a3 * a3), F(4000)
    for _ in range(200):                                    # A2 with 2 m(A2) within 2^-150 of 2 m_F
        mid = (lo + hi) / 2
        mid = F(round(mid * 2 ** 200), 2 ** 200)
        if 2 * Fz.mass_fixed(mid, 512)[0] < target:
            lo = mid
        else:
            hi = mid
    s, bits = Fz.certify_sign([2, 3, -5], [hi, a1 * a1, a3 * a3])
    assert s == 1 and bits > 64
    s_lo, bits_lo = Fz.certify_sign([2, 3, -5], [lo, a1 * a1, a3 * a3])
    assert s_lo == -1 and bits_lo > 64
    naive = [2 * Fz.mass_fixed(A, 64)[0] + 3 * Fz.mass_fixed(a1 * a1, 64)[0] - 5 * Fz.mass_fixed(a3 * a3, 64)[0] for A in (lo, hi)]
    assert not (naive[0] < 0 < naive[1])                    # 64 bits alone cannot tell the two apart


# ---------------------------------------------------------------- CF1 order statistics
def test_CF1_quartiles_are_the_same_points_in_every_monotone_coordinate():
    for dim in (2, 3):
        pts, _ = small(dim, N=57, seed=3)
        r = Fz.fence(pts, dim)
        for coord in (r['dist'], r['mass'], [float(v) for v in r['w']]):
            order = sorted(range(r['N']), key=lambda i: (coord[i], i))
            assert [order[i] for i in r['idx']] == list(r['q'])
    # control: an interpolating quantile (type 7) does not commute with cosh
    a = [1.0, 2.0, 7.0, 40.0]
    q7 = lambda v, p: v[int(p * (len(v) - 1))] + (p * (len(v) - 1) % 1) * (v[int(p * (len(v) - 1)) + 1] - v[int(p * (len(v) - 1))])
    assert abs(math.acosh(q7(a, 0.75)) - q7([math.acosh(t) for t in a], 0.75)) > 0.1


# ---------------------------------------------------------------- CF2 invariance
def test_CF2_verdicts_are_invariant_under_rational_isometries_bit_for_bit():
    rng = Rng(21)
    for dim, kind in ((2, 'ball'), (3, 'ball'), (3, 'gauss')):
        pts, _ = small(dim, kind, N=40, seed=rng.below(1000))
        r0 = Fz.fence(pts, dim)
        L = Fz.random_isometry(rng, dim)
        assert X.is_lorentz(L)
        r1 = Fz.fence(Fz.transform(L, pts), dim)
        for key in ('verdict', 'cert', 'order', 'medoid', 'lam', 'mass', 'dist', 'w'):     # b and sigma carry S's free scale
            assert r0[key] == r1[key], key
        LS = X.matvec(L, [F(v) for v in r0['S']])              # the centre moves with the data: L S0 is a multiple of S1
        assert all(u * r1['S'][0] == v * LS[0] for u, v in zip(LS, r1['S']))


def test_CF2_control_a_chart_scaling_is_not_an_isometry():
    changed = 0
    for seed in range(6):
        pts, _ = small(2, N=40, seed=seed)
        r0 = Fz.fence(pts, 2)
        squeezed = []
        for x in pts:
            p = [v / (1 + x[0]) for v in x[1:]]
            squeezed.append(X.ghost([F(9, 10) * v for v in p]))
        r1 = Fz.fence(squeezed, 2)
        changed += r0['mass'] != r1['mass']
    assert changed == 6


# ---------------------------------------------------------------- CF3 the doubling sphere
def test_CF3_a_uniform_ball_puts_the_fence_on_the_doubling_sphere():
    for dim, R in ((2, 1.0), (2, 6.0), (3, 0.5), (3, 4.0)):
        g, mR = Fz.Gen(5), Fz.ball_mass(R, dim)
        m = sorted(g.rng.random() * mR for _ in range(20000))
        m1, m3 = m[(20000 + 3) // 4 - 1], m[(3 * 20000 + 3) // 4 - 1]
        assert abs((m3 + 1.5 * (m3 - m1)) / m3 - 2.0) < 0.03
    # control: a wrapped normal is not uniform in mass, and its fence is not the doubling sphere
    g = Fz.Gen(6)
    for dim, s in ((2, 2.0), (3, 1.0)):
        v = [[s * g.normal() for _ in range(dim)] for _ in range(20000)]
        m = sorted(Fz.mass_of_distance(math.sqrt(sum(t * t for t in w)), dim) for w in v)
        m1, m3 = m[4999], m[14999]
        assert (m3 + 1.5 * (m3 - m1)) / m3 > 2.15


# ---------------------------------------------------------------- CF4 exactness
def test_CF4_the_plane_needs_only_rational_comparisons():
    for seed in range(4):
        pts, _ = small(2, N=50, seed=seed)
        r = Fz.fence(pts, 2)
        assert set(r['cert']) <= {'exact', 'order'}
        assert r['verdict'] == r['verdict_float']
    # control: on radii a hair from the fence the float rule fails where the exact one cannot
    a1, a3 = F(5, 4), F(11, 3)
    aF = (5 * a3 - 3 * a1) / 2
    wrong = 0
    for k in range(1, 40):
        for s in (1, -1):
            a = aF + s * F(1, 2 ** (50 + k))
            exact = Fz.decide_h2(a, a1, a3)
            assert exact == (1 if s > 0 else 0)
            wrong += Fz.decide_h2_float(a, a1, a3) != exact
    assert wrong > 0


def test_CF4_space_three_is_certified_and_agrees_with_floats_off_ties():
    for seed in range(3):
        pts, _ = small(3, N=50, seed=seed)
        r = Fz.fence(pts, 3)
        assert all(c == 'order' or c.startswith('bits:') for c in r['cert'])
        assert r['verdict'] == r['verdict_float']


# ---------------------------------------------------------------- CF5 the 0.7
def test_CF5_the_doubling_gap_is_below_ln_f_and_tends_to_it():
    for dim in (2, 3):
        for f in (1.5, 2.0, 2.5, 3.0):
            bound = math.log(f) / (dim - 1)
            prev = 0.0
            for Q in [0.01 * 1.25 ** k for k in range(36)]:
                g = Fz.doubling_gap(Q, dim, f)
                assert g < bound + 1e-12 and g >= prev - 1e-12
                prev = g
            assert abs(Fz.doubling_gap(30.0, dim, f) - bound) < 1e-6
    assert abs(Fz.doubling_gap(30.0, 2) - 0.6931471805599453) < 1e-9          # the 0.7: ln 2
    # control: in flat space the doubling gap of a ball of radius Q is (2^(1/n) - 1) Q, unbounded
    for n in (2, 3):
        assert (2 ** (1 / n) - 1) * 30.0 > 3.0


# ---------------------------------------------------------------- CF6 flat limit
def test_CF6_the_flat_limit_is_the_euclidean_volume_fence():
    rng = Rng(61)
    differ = 0
    for seed in range(6):
        g = Fz.Gen(100 + seed)
        dim = 2 + seed % 2
        V = [[g.normal() for _ in range(dim)] for _ in range(36)] + [[4.0 * t for t in g.direction(dim)] for _ in range(3)]
        flat = Fz.euclid_volume_fence(V, dim)
        tiny = Fz.fence([Fz.exp_origin(v, 1e-5, K=60) for v in V], dim)
        assert tiny['verdict'] == flat
        big = Fz.fence([Fz.exp_origin(v, 2.5, K=60) for v in V], dim)
        differ += big['verdict'] != flat
    assert differ > 0                                         # control: curvature changes verdicts


# ---------------------------------------------------------------- CF7 saturation
def test_CF7_distance_tukey_saturates_and_sits_far_past_the_edge():
    for dim, R in ((2, 24.0), (3, 12.0)):
        q1, _, q3 = Fz.population_radii(R, dim)
        lam = dim - 1
        assert abs((q3 - q1) - LN3 / lam) < 1e-6
        margin_dt = q3 + 1.5 * (q3 - q1) - R
        assert abs(margin_dt - (1.5 * LN3 - math.log(4 / 3)) / lam) < 1e-6
        mR = Fz.ball_mass(R, dim)
        m1, m3 = Fz.mass_of_distance(q1, dim), Fz.mass_of_distance(q3, dim)
        rF = Fz.distance_of_mass(m3 + 1.5 * (m3 - m1), dim)
        assert abs(rF - R - math.log(1.5) / lam) < 1e-6
    # control: in a flat ball the IQR of the radius grows with the ball
    for n in (2, 3):
        iqr = lambda R: (0.75 ** (1 / n) - 0.25 ** (1 / n)) * R
        assert iqr(24.0) > 10 * iqr(2.0) - 1e-9


# ---------------------------------------------------------------- CF8 the centre
def test_CF8_the_median_is_a_critical_point_and_the_medoid_is_off_centre():
    for dim in (2, 3):
        pts, _ = small(dim, N=80, seed=8, R=5.0 if dim == 2 else 3.5, out={'k': 0})
        r = Fz.fence(pts, dim)
        assert Fz.median_residual(pts, r) < 1e-8
        c = Fz.centre_point(r)
        dm = math.acosh(float(pts[r['medoid']][0]))
        dc = math.acosh(max(1.0, c[0]))
        assert dm > dc                                        # no data point lies as near the centre as the median
    # in a broad H^3 ball the medoid-centred fence flags inliers that the median-centred fence keeps
    pts, lab = small(3, N=200, seed=9, R=4.0, out={'k': 0})
    med = Fz.fence(pts, 3)
    mdd = Fz.fence(pts, 3, centre='medoid')
    assert sum(v > 0 for v in mdd['verdict']) > sum(v > 0 for v in med['verdict'])


def test_CF8_breakdown_a_far_cluster_below_half_cannot_carry_the_centre():
    for k, moved in ((20, False), (34, True)):
        pts, lab = small(2, N=60 - k, seed=10, R=3.0, out={'k': k, 'f': 400.0, 'mode': 'cluster'})
        r = Fz.fence(pts, 2)
        c = Fz.centre_point(r)
        d_origin = math.acosh(max(1.0, c[0]))
        assert (d_origin > 3.0) == moved, (k, d_origin)
    # the plain Lorentz centroid (equal weights) is carried away by a few far points
    pts, _ = small(2, N=58, seed=10, R=3.0, out={'k': 2, 'f': 400.0, 'mode': 'cluster'})
    ip = [Fz._intrep(x) for x in pts]
    S = Fz._combine(ip, [1.0] * len(pts))
    sig = Fz._lneg(S, S)
    cin = Fz.centre_point(Fz.fence(pts[:56], 2))                # the median of the inliers alone
    shift = lambda c: math.acosh(max(1.0, -(-cin[0] * c[0] + sum(p * q for p, q in zip(cin[1:], c[1:])))))
    assert shift(Fz.centre_point({'S': S, 'sigma': sig})) > 1.0
    assert shift(Fz.centre_point(Fz.fence(pts, 2))) < 0.25


# ---------------------------------------------------------------- CF9 the four-point guard
def test_CF9_no_four_points_of_hyperbolic_space_beat_ln_2():
    rng = Rng(91)
    worst, ratio = 0.0, 0.0
    for dim in (2, 3):
        for scale in (0.3, 2.0, 8.0):
            g = Fz.Gen(rng.below(10 ** 6))
            for _ in range(400):
                q = [Fz.exp_origin([scale * g.normal() for _ in range(dim)], 1.0, K=48) for _ in range(4)]
                D = Fz.distance_matrix(q)
                worst = max(worst, Fz.defect(D, 0, 1, 2, 3))
                x, y, z, w = range(4)
                gp = lambda a, b: (D[a][w] + D[b][w] - D[a][b]) / 2
                ratio = max(ratio, math.exp(-gp(x, z)) / (math.exp(-gp(x, y)) + math.exp(-gp(y, z))))
    assert worst <= LN2 + 1e-12 and ratio <= 1 + 1e-12
    sq = Fz.distance_matrix(Fz.ideal_square(20.0))
    assert abs(Fz.defect(sq, 0, 1, 2, 3) - LN2) < 1e-9          # sharp
    # control: four corners of a flat square of side 4 have defect (2 sqrt 2 - 2) 4 / 2 > ln 2
    s = 4.0
    E = [[0, s, s * 2 ** 0.5, s], [s, 0, s, s * 2 ** 0.5], [s * 2 ** 0.5, s, 0, s], [s, s * 2 ** 0.5, s, 0]]
    assert Fz.defect(E, 0, 1, 2, 3) > LN2


def test_CF9_the_guard_points_at_a_corrupted_distance():
    pts, _ = small(2, N=18, seed=12, R=3.0, out={'k': 0})
    D = Fz.distance_matrix(pts)
    assert Fz.guard_check(D)['bad'] == 0
    E, pairs = Fz.corrupt(D, 1, 3.0, seed=5)
    gch = Fz.guard_check(E)
    assert gch['bad'] > 0 and gch['top'][0][0] == pairs[0]


# ---------------------------------------------------------------- the algorithm end to end
def test_planted_outliers_at_twice_the_mass_are_caught_where_distance_tukey_misses_them():
    for dim, R in ((2, 6.0), (3, 4.0)):
        pts, lab = small(dim, N=200, seed=13, R=R, out={'k': 8, 'f': 2.0, 'mode': 'shell'})
        r = Fz.fence(pts, dim)
        caught = sum(1 for v, l in zip(r['verdict'], lab) if l and v)
        false = sum(1 for v, l in zip(r['verdict'], lab) if not l and v)
        dt = sum(1 for v, l in zip(r['tukey_d']['verdict'], lab) if l and v)
        assert caught == 8 and false <= 2 and dt == 0
        assert abs(r['gap'] - LN2 / (dim - 1)) < 0.08           # the fence sits about ln 2 / (n - 1) past Q3


def test_tree_deep_nodes():
    pts, lab = Fz.generate({'dim': 3, 'kind': 'tree', 'L': 2, 'seed': 3, 'out': {'k': 3, 'mode': 'deep', 'depth': 2}})
    r = Fz.fence(pts, 3)
    assert all(v == 2 for v, l in zip(r['verdict'], lab) if l)
