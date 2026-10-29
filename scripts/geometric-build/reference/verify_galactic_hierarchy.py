"""Checks for 'The Galactic Lensing Hierarchy' (Sgr A* centroid, three systems + emergent fourth, seven pulsars).
Run: python3 verify_galactic_hierarchy.py      (standard library only)

Sections
  A  Constants and their sources
  B  Sgr A* scales: Schwarzschild radius, Einstein radii, Shapiro scale, sphere of influence
  C  The seven pulsars within 100 pc (SKAO chapter, Table 1): offsets, Keplerian periods about Sgr A* alone
  D  Magnetar timing budget: Doppler, acceleration and Shapiro-rate terms
  E  Lensing of the seven pulsars by Sgr A*: astrometric shift, Shapiro delay, alignment probability
  F  Galaxy-scale Shapiro delay and the Gaia acceleration (System III)
  G  Frame closure with real numbers: Sgr A* proper motion vs R0 (Reid & Brunthaler 2020)
  H  Engine checks in exact arithmetic: additive residual parity, frame closure (open vs cyclic), slot map,
     log-radial tier map, conjugation (four-structure) invariance, 7 vs 6
"""
import math, random, itertools
from fractions import Fraction as F
random.seed(20261026)
out = []
def log(tag, *a): out.append(f"[{tag}] " + " ".join(str(x) for x in a))
def check(tag, cond, msg):
    log(tag, msg, "->", "PASS" if cond else "FAIL")
    if not cond: raise SystemExit(f"FAILED: {tag} {msg}")

# ---------------------------------------------------------------- A. constants
G = 6.67430e-11            # CODATA 2018
c = 299_792_458.0          # exact
Msun = 1.98841e30          # IAU nominal GM_sun / G
GMsun = 1.3271244e20       # IAU 2015 B3
pc = 3.0856775814913673e16
AU = 149_597_870_700.0
yr = 365.25 * 86400
mas = math.pi / 180 / 3600 / 1000
M_BH = 4.297e6             # GRAVITY Collaboration 2023, A&A 677, L10
R0_pc = 8275.0             # GRAVITY Collaboration 2021 (MPE): 8275 +- 9 (stat) +- 33 (sys) pc
GM = M_BH * GMsun
R0 = R0_pc * pc
log("A", f"M_BH = {M_BH:.4g} Msun, R0 = {R0_pc:.0f} pc, GM = {GM:.4e} m^3/s^2")

# ---------------------------------------------------------------- B. scales
rs = 2 * GM / c**2
thE_inf = math.sqrt(2 * rs / R0)                         # theta_E for D_s -> infinity
tS = 2 * GM / c**3
log("B", f"Schwarzschild radius r_s = {rs:.4e} m = {rs/AU:.4f} AU; angular size at R0 = {rs/R0/mas*1e3:.2f} uas")
log("B", f"Einstein radius, source at infinity: {thE_inf/mas/1e3:.3f} arcsec")
for dls in [0.01, 0.1, 1.0, 30.0]:
    Dls = dls * pc; Ds = R0 + Dls
    th = math.sqrt(2 * rs * Dls / (R0 * Ds)); RE = math.sqrt(2 * rs * Dls * R0 / Ds)
    log("B", f"source {dls:>5} pc behind Sgr A*: theta_E = {th/mas:8.3f} mas, R_E (at lens) = {RE/AU:7.1f} AU")
log("B", f"Shapiro scale 2GM/c^3 = {tS:.2f} s")
sigma = 100e3                                             # typical NSC dispersion ~100 km/s  [HEURISTIC scale]
r_infl = GM / sigma**2 / pc
log("B", f"sphere of influence GM/sigma^2 (sigma = 100 km/s) = {r_infl:.2f} pc")
M_NSC = 2.5e7                                             # Schoedel et al. 2014, A&A 566, A47 (half-light radius 4.2 pc)
log("B", f"nuclear star cluster mass / M_BH = {M_NSC/M_BH:.1f} (NSC 2.5e7 Msun within ~4.2 pc half-light radius)")
for r_pc in [0.097, 1.0, 30.0]:
    eps = GM / (c**2 * r_pc * pc)
    log("B", f"weak-field parameter GM/(c^2 r) at {r_pc} pc = {eps:.2e} (second-order terms ~ eps^2 = {eps**2:.1e}, a fraction ~eps of the first-order terms)")
check("B", GM / (c**2 * 0.097 * pc) < 1e-5, "Sgr A* field is weak (GM/c^2 r < 1e-5) at every known pulsar: superposition holds")
r_isco_like = 3 * rs
log("B", f"strong-field region: a few r_s ~ {r_isco_like/AU:.2f} AU, where superposition fails (System I inner tiers only)")

# ---------------------------------------------------------------- C. seven pulsars (SKAO chapter Table 1, v. 2025-12-19)
psr = [  # name, P (s), DM, offset (arcmin), tau_sc (ms, at freq), remark
    ("J1746-2849", 1.48, 1360, 12.3, "266 @1.5 GHz", ""),
    ("J1746-2850", 1.08, 941, 11.3, "-", "magnetar-like"),
    ("J1746-2856", 0.95, 1155, 15.6, "450 @1 GHz", ""),
    ("J1745-2900", 3.76, 1778, 0.04, "1300 @1 GHz", "magnetar"),
    ("J1745-2912", 0.19, 1106, 14.5, "750 @1 GHz", ""),
    ("J1745-2910", 0.98, 1088, 12.9, "-", "position poorly known"),
    ("J1746-2829", 1.89, 1309, 31.8, "67 @1 GHz", "magnetar-like"),
]
for name, P, DM, off, tau, rem in psr:
    rproj = R0 * off * 60 * 1000 * mas / pc
    Pk = 2 * math.pi * math.sqrt((rproj * pc) ** 3 / GM) / yr
    log("C", f"{name}: P={P:5.2f} s DM={DM:5d} offset {off:5.2f}' -> projected {rproj:6.2f} pc; "
             f"Keplerian period about Sgr A* alone at that radius {Pk:.3g} yr {rem}")
check("C", len(psr) == 7, "seven known pulsars within 100 pc projected")
check("C", all(R0 * p[3] * 60e3 * mas / pc < 100 for p in psr), "all seven within 100 pc projected at R0 = 8275 pc")
outside = [p[0] for p in psr if R0 * p[3] * 60e3 * mas / pc > r_infl]
log("C", f"pulsars outside Sgr A*'s sphere of influence (~{r_infl:.1f} pc): {len(outside)} of 7 -> {outside}")

# ---------------------------------------------------------------- D. magnetar timing budget
v_perp = 236e3                                            # Bower et al. 2015, 236 +- 11 km/s
r_mag = 0.097 * pc                                        # projected; true r >= projected
a_max = GM / r_mag**2
log("D", f"magnetar transverse velocity: v/c = {v_perp/c:.3e} (Doppler scale on P)")
log("D", f"max line-of-sight acceleration a/c at r >= 0.097 pc: {a_max/c:.3e} s^-1 (upper bound: true r >= projected)")
P_orb = 2 * math.pi * math.sqrt(r_mag**3 / GM)
shapiro_rate = tS * 2 * math.pi / P_orb                   # order-of-magnitude bound on d(Delta_S)/dt
log("D", f"Keplerian period at 0.097 pc: {P_orb/yr:.0f} yr; Shapiro-delay rate bound ~ {shapiro_rate:.2e} (s/s)")
log("D", f"ratio Doppler / Shapiro-rate = {(v_perp/c)/shapiro_rate:.1e}")
check("D", (v_perp / c) / shapiro_rate > 1e4, "Shapiro-rate term is >1e4 below the Doppler term for the magnetar")

# ---------------------------------------------------------------- E. lensing of the seven pulsars by Sgr A*
log("E", "astrometric shift theta_E^2/theta if each pulsar sat behind Sgr A* at a depth equal to its projected offset:")
for name, P, DM, off, tau, rem in psr:
    theta = off * 60 * 1000 * mas
    dls = R0 * theta
    th2 = 2 * rs * dls / (R0 * (R0 + dls))
    shift_uas = th2 / theta / mas * 1e3
    log("E", f"  {name}: depth {dls/pc:6.2f} pc, shift {shift_uas:9.3f} uas")
RE01 = math.sqrt(2 * rs * 0.1 * pc)
p_align = (RE01 / (0.1 * pc)) ** 2
cross_t = RE01 / v_perp / yr
shift_scale = 2 * rs / R0 / mas * 1e3
log("E", f"  all shifts are close to 2 r_s / R0 = {shift_scale:.2f} uas: with depth = R0*theta, theta_E^2/theta = 2 r_s/(R0 + depth)")
check("E", abs(20.43 - shift_scale) < 0.2, "the astrometric shift is ~2 r_s/R0 ~ 20 uas, independent of offset when depth equals the projected offset")
log("E", f"magnetar-depth source (0.1 pc): R_E = {RE01/AU:.1f} AU, instantaneous alignment probability ~ (R_E/r)^2 = {p_align:.1e},"
         f" Einstein-crossing time at 236 km/s = {cross_t:.2f} yr")
check("E", p_align < 1e-4, "strong lensing of a 0.1 pc pulsar by Sgr A* is rare (< 1e-4 at any instant)")

# ---------------------------------------------------------------- F. System III: galaxy-scale Shapiro delay, Gaia acceleration
for Mg in [1e10, 1e11]:
    log("F", f"2GM/c^3 for {Mg:.0e} Msun = {2*Mg*GMsun/c**3/86400:.2f} days (a constant offset, absorbed by the timing fit)")
acc = 2.32e-10                                            # Gaia EDR3: (2.32 +- 0.16) e-10 m/s^2
log("F", f"Gaia EDR3 solar-system acceleration {acc:.2e} m/s^2 -> aberration drift {acc/c*yr/mas*1e3:.2f} uas/yr "
         f"(published 5.05 +- 0.35 uas/yr)")
check("F", abs(acc / c * yr / mas * 1e3 - 5.05) < 0.1, "acceleration reproduces the published 5.05 uas/yr drift")
a_c = acc / c
log("F", f"same acceleration as a pulsar period-derivative term a/c = {a_c:.2e} s^-1")

# ---------------------------------------------------------------- G. frame closure with real numbers
k = 4.740470463                                           # km/s per (mas/yr * kpc)
mu_l, mu_b = 6.411, 0.219                                 # |mu| of Sgr A*, Reid & Brunthaler 2020
V_tot = k * mu_l * R0_pc / 1000
W_tot = k * mu_b * R0_pc / 1000
log("G", f"Sgr A* apparent motion -> (Theta0 + V_sun) = {V_tot:.1f} km/s, W_sun = {W_tot:.2f} km/s at R0 = {R0_pc:.0f} pc")
log("G", f"with V_sun = 12.24 km/s (Schoenrich et al. 2010): Theta0 = {V_tot-12.24:.1f} km/s")
log("G", "Reid & Brunthaler 2020 report the residual (intrinsic Sgr A* motion): -0.58 +- 2.23 km/s (rotation), "
         "-0.85 +- 0.75 km/s (toward NGP): closure consistent with zero")
dV_dR0 = k * mu_l * 0.033                                 # systematic R0 error -> velocity
log("G", f"R0 systematic (33 pc) alone moves (Theta0+V_sun) by {dV_dR0:.2f} km/s")

# ---------------------------------------------------------------- H. engine checks, exact arithmetic
def qmul(a, b):
    w1, x1, y1, z1 = a; w2, x2, y2, z2 = b
    return (w1*w2-x1*x2-y1*y2-z1*z2, w1*x2+x1*w2+y1*z2-z1*y2, w1*y2-x1*z2+y1*w2+z1*x2, w1*z2+x1*y2-y1*x2+z1*w2)
def conj(a): return (a[0], -a[1], -a[2], -a[3])
def qinv(a): n = sum(x*x for x in a); return tuple(x / n for x in conj(a))
ONE = (F(1), F(0), F(0), F(0))
def prod(*qs):
    p = ONE
    for q in qs: p = qmul(p, q)
    return p
def rq(scale=9):
    u = [F(random.randint(-scale, scale), random.randint(1, scale)) for _ in range(3)]; n2 = sum(x*x for x in u)
    return ((1 - n2) / (1 + n2),) + tuple(2 * x / (1 + n2) for x in u)

# H1 additive residual parity: total = I + II + III + R (weak-field superposition)
ok = True
for _ in range(2000):
    I, II, III, R = (F(random.randint(-10**6, 10**6), random.randint(1, 10**3)) for _ in range(4))
    T = I + II + III + R
    ok &= (T - II - III - R == I) and (T - I - III - R == II) and (T - I - II - R == III) and (T - I - II - III == R)
check("H1", ok, "2000 exact cases: any one of {I, II, III, residual} is recovered from the measured total and the other three")
T = F(7); I = F(2)
pairs = {(x, T - I - F(1) - x) for x in (F(n) for n in range(50))}
check("H1", len(pairs) == 50, "two unknown components with one total: 50 distinct consistent pairs (not recoverable)")

# H2 frame closure, open vs cyclic convention (Lemma 12)
ok_open, ok_detect, ok_cyc = True, True, True
for _ in range(500):
    H1, H2, H3 = rq(), rq(), rq()
    H4_meas = qinv(prod(H1, H2, H3))                      # consistent independent measurement of the fourth leg
    ok_open &= prod(H1, H2, H3, H4_meas) == ONE
    eps = rq(50)                                          # an error in one independently measured leg
    if eps != ONE:
        ok_detect &= prod(H1, qmul(eps, H2), H3, H4_meas) != ONE
    H4_cyc = qinv(prod(H1, qmul(eps, H2), H3))            # fourth computed from the (wrong) other three
    ok_cyc &= prod(H1, qmul(eps, H2), H3, H4_cyc) == ONE  # closes regardless: tests nothing
check("H2", ok_open, "500 exact cases: four independently measured frame legs close, H1H2H3H4 = 1")
check("H2", ok_detect, "500 exact cases: an error in any one measured leg breaks closure (open convention detects it)")
check("H2", ok_cyc, "500 exact cases: if the fourth leg is computed from the other three, closure holds even with the error (vacuous)")

# H3 six slots per system = C3 x C2: (observable class, model/data); residual = data - model
classes = ["astrometry", "timing", "velocity"]; sides = ["model", "data"]
slots = {k: (classes[k % 3], sides[k % 2]) for k in range(6)}
check("H3", len(set(slots.values())) == 6, f"k -> (k mod 3, k mod 2) is a bijection Z/6 -> C3 x C2: {slots}")

# H4 log-radial tier map: engine radii R_n -> physical shells, order-preserving and exact at the ends
Rn = [5*n*n + 15*n + 15 for n in range(5)]
systems = {"I": (rs / pc, 2.0), "II": (2.0, 200.0), "III": (200.0, 1.0e5)}
for name, (r_in, r_out) in systems.items():
    shells = [r_in * (r_out / r_in) ** F(Rn[n] - Rn[0], Rn[4] - Rn[0]) for n in range(5)]
    mono = all(shells[i] < shells[i+1] for i in range(4))
    ends = math.isclose(shells[0], r_in) and math.isclose(shells[-1], r_out)
    check("H4", mono and ends, f"System {name}: tiers at r = " + ", ".join(f"{s:.3g}" for s in shells) + " pc (monotone, exact ends)")
log("H4", "fractions (R_n - R_0)/(R_4 - R_0) =", [str(F(Rn[n] - Rn[0], Rn[4] - Rn[0])) for n in range(5)])

# H5 four-structure conjugation (monograph Thm 7.18): E = A I^-1 A^-1 keeps the rotation angle
ok = True
for _ in range(500):
    A, Iq = rq(), rq()
    E = prod(A, qinv(Iq), qinv(A))
    ok &= E[0] == Iq[0] and prod(A, Iq, qinv(A), E) == ONE
check("H5", ok, "500 exact cases: frame change E = A I^-1 A^-1 closes A I A^-1 E = 1 and keeps Re(E) = Re(I)")

# H6 seven pulsars vs six slots / 30 nodes / 60-register
check("H6", math.gcd(7, 6) == 1 and math.gcd(7, 30) == 1 and math.gcd(7, 60) == 1,
      "7 is coprime to 6, 30 and 60: no equal partition of the seven pulsars over the engine's channels")
check("H6", sum(1 for p in psr if R0*p[3]*60e3*mas/pc <= 2.0) == 1 and len(psr) - 1 == 6,
      "placement by radius: 1 pulsar in System I (< 2 pc), 6 in System II (2-200 pc), 0 in System III")

print("\n".join(out))
print("\nAll checks passed.")
