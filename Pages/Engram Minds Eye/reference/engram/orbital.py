"""The orbital pages' exact code that the engram reference needs, ported line by line from
scripts/geometric-build/orbital_core.js (Phase 1) and checked against it by tests/test_orbital_parity.py.

Every function keeps the name and the order of operations of its JavaScript original (in snake_case), so a float
computed here is computed by the same IEEE operations as in the page. Exact values are fractions.Fraction, whose
reduced form and string ("n/d", or "n" when d = 1) are those of the module's Fraction. The only floats are where
the pages use them: the tier geometry before the rationalization at 2^-24, and tanh in the readout.

Segments ported: tiers, krat, layerb (RAT, frac_le), d2r, lemma (tiles, SHA-256 Merkle chain), exact (frames,
nodes, TQF), tonum, fracpart, gauge, readout, pump. The constants SPIN, TAUF, ON and OFF are the Zero-Point
Tri-Engine's (gen4.py), where the clock that carries the engram window runs.
"""
from fractions import Fraction
import hashlib
import math

# ------------------------------------------------------------------ tiers (engine v10)
TIERS_SPEC = [
    {'n': 0, 'W': 16, 'R': 15, 'r': 4, 'freq': 96, 'rotAxis': 'Z'},
    {'n': 1, 'W': 14, 'R': 35, 'r': 6, 'freq': 84, 'rotAxis': 'X'},
    {'n': 2, 'W': 12, 'R': 65, 'r': 8, 'freq': 72, 'rotAxis': 'Z'},
    {'n': 3, 'W': 10, 'R': 105, 'r': 10, 'freq': 60, 'rotAxis': 'X'},
    {'n': 4, 'W': 8, 'R': 155, 'r': 12, 'freq': 48, 'rotAxis': 'Z'},
]
TOTAL_NODES, TOTAL_CALC_PULSES = 30, 150
K_RAT = 24                      # declared rationalization precision 2^-24
D2R = math.pi / 180

# The pages' live controls. The module (and this reference) runs with no tension or torsion and coupling kappa = 1.
# Floats, as in JavaScript, so that -torsion is -0.0 and the signs of zero match the page's arithmetic.
state = {'tension': 0.0, 'torsion': 0.0, 'kappa': 1.0}


def js_round(v):
    """Math.round: the nearest integer, ties toward +infinity (exact for |v| < 2^52)."""
    r = math.floor(v)
    return r + 1 if v - r >= 0.5 else r


def from_float(x, k):
    """Fraction.fromFloat(x, k): round(x * 2^k) / 2^k."""
    s = 2 ** k
    return Fraction(js_round(x * s), 1 << k)


def RAT(x):
    return from_float(x, K_RAT)


def frac_le(a, b):
    return a.numerator * b.denominator <= b.numerator * a.denominator


def to_number(f):
    """Fraction.toNumber: Number(n) / Number(d), each rounded to the nearest double."""
    return float(f.numerator) / float(f.denominator)


# ------------------------------------------------------------------ tonum, fracpart (Tri-Engine Convergence)
def flen(f):
    return max(abs(f.numerator).bit_length(), f.denominator.bit_length())


def to_num(f):
    """A Fraction as a double, also when its numerator or denominator is beyond 2^1024."""
    sh = max(0, flen(f) - 1000)
    return float(f.numerator >> sh) / float(f.denominator >> sh) if sh else float(f.numerator) / float(f.denominator)


def frac_part(f):
    """A turn count modulo one turn, exactly."""
    return Fraction(f.numerator % f.denominator, f.denominator)


# ------------------------------------------------------------------ lemma: SHA-256, the Einstein tile, the Merkle chain
WHEEL = [1, 7, 11, 13, 17, 19, 23, 29]


def wheel_sector(k):
    u = 7
    for i, w in enumerate(WHEEL):
        if w <= k:
            u = i
    return u


def mux_index(step, k, slot):
    return k % 9 if step <= 2 else k % 16 if step == 3 else 0 if step == 6 else slot % 12


def pack_tile(f):
    return ((f['step'] - 1) << 61) | (f['wheel'] << 58) | (f['struct'] << 56) | (f['gate'] << 48) | \
           (f['mux'] << 44) | (f['form'] << 40) | (f['slot'] << 36) | (f['scale'] << 32) | (f['core'] & 0xFFFFFFFF)


def decode_tile(w):
    def g(hi, lo):
        return (w >> lo) & ((1 << (hi - lo + 1)) - 1)
    return {'step': g(63, 61) + 1, 'wheel': g(60, 58), 'struct': g(57, 56), 'halo': g(63, 56), 'gate': g(55, 48),
            'comp': g(55, 54), 'slice': g(53, 48), 'mux': g(47, 44), 'form': g(43, 40), 'slot': g(39, 36),
            'scale': g(35, 32), 'core': g(31, 0)}


def hex_word(w):
    return '0x' + format(w, '016X')


def word_bytes(w):
    return w.to_bytes(8, 'big')


def sha256(msg):
    return hashlib.sha256(msg).digest()


def utf8(s):
    return s.encode('utf-8')


def to_hex(b):
    return b.hex()


def merkle_chain(leaves):
    """Lemma 15 Part 3: tau_N = H(G_N), tau_d = H(G_d || tau_(d+1)). Index 0 is unused, as in the module."""
    N = len(leaves)
    tau = [None] * (N + 1)
    tau[N] = sha256(leaves[N - 1])
    for d in range(N - 1, 0, -1):
        tau[d] = sha256(leaves[d - 1] + tau[d + 1])
    return tau


# ------------------------------------------------------------------ exact: frames, nodes, the Triple-Quad Formula
def ROT_X(v, neg):
    return [v[0], neg(v[2]), v[1]]


def ROT_Y(v, neg):
    return [v[2], v[1], neg(v[0])]


def C3(v):
    return [v[2], v[0], v[1]]


def c3pow(v, s):
    for _ in range(s):
        v = C3(v)
    return v


def NEG_F(f):
    return -f


def frame_of(n, v, neg):
    return ROT_X(v, neg) if n % 2 == 0 else ROT_Y(v, neg)


def mod_rot(p, n):
    a = state['tension'] * D2R if n >= 3 else -state['torsion'] * D2R
    c, s = math.cos(a), math.sin(a)
    if n >= 3:
        return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]]
    return [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]]


def vsub(a, b):
    return [x - y for x, y in zip(a, b)]


def vadd(a, b):
    return [x + y for x, y in zip(a, b)]


def vdot(a, b):
    acc = Fraction(0)
    for x, y in zip(a, b):
        acc = acc + x * y
    return acc


F3, F4 = Fraction(3), Fraction(4)


def fbits(f):
    return max(abs(f.numerator).bit_length() or 1, f.denominator.bit_length())


def tqf(P):
    u, v, w = vsub(P[1], P[0]), vsub(P[2], P[0]), vsub(P[2], P[1])
    Q1, Q2, Q3 = vdot(u, u), vdot(w, w), vdot(v, v)
    S = Q1 + Q2 + Q3
    S2 = S * S
    poly = S2 - 2 * (Q1 * Q1 + Q2 * Q2 + Q3 * Q3)
    uv = vdot(u, v)
    gram = F4 * (Q1 * Q3 - uv * uv)
    lock = S != 0 and F3 * poly == S2
    chi = 0 if S == 0 else math.sqrt(max(0, to_number(poly))) / to_number(S)
    return {'Q': [Q1, Q2, Q3], 'S': S, 'poly': poly, 'gram': gram, 'same': poly == gram, 'nonneg': poly >= 0,
            'weitz': frac_le(F3 * poly, S2), 'lock': lock, 'chi': chi, 'P4star': vsub(vadd(P[1], P[2]), P[0]),
            'bits': max(fbits(x) for x in (Q1, Q2, Q3, poly))}


# ------------------------------------------------------------------ gauge (Proposition 7.14)
def gauge_exact(a, b, c):
    s = a + b + c
    X = a - (b + c) / 2
    Yc = b - c
    a2 = (s + 2 * X) / F3
    b2 = (s - a2 + Yc) / 2
    c2 = (s - a2 - Yc) / 2
    return {'s': s, 'X': X, 'Yc': Yc, 'recovered': a2 == a and b2 == b and c2 == c}


# ------------------------------------------------------------------ readout: the landing nodes and their TQF
def exact_node_spin(s, k, S, dphi, turns):
    n = 4 - S
    T = TIERS_SPEC[n]
    th = 2 * math.pi * k / 30
    chi = 1 if k % 2 == 0 else -1
    ph = T['W'] * th * chi + dphi
    a = th + 2 * math.pi * to_num(frac_part(turns))
    P = [RAT(x) for x in mod_rot([(T['R'] + T['r'] * math.cos(ph)) * math.cos(a),
                                  (T['R'] + T['r'] * math.cos(ph)) * math.sin(a),
                                  T['r'] * math.sin(ph)], n)]
    return c3pow(frame_of(n, P, NEG_F), s)


ZERO3 = [Fraction(0), Fraction(0), Fraction(0)]


def readout(vals, turns=ZERO3):
    Y = vals[0] + vals[1] + vals[2]
    m = Y / F3
    den = abs(to_num(m)) + 1
    dphi = [state['kappa'] * (math.pi / 6) * math.tanh(to_num(x - m) / den) for x in vals]
    nodes = [exact_node_spin(s, 29, 4, dphi[s], turns[s]) for s in range(3)]
    T = tqf(nodes)
    return {'dphi': dphi, 'nodes': nodes, 'T': T, 'Q4': vdot(T['P4star'], T['P4star'])}


# ------------------------------------------------------------------ pump (Zero-Point Tri-Engine)
def pump_of(d):
    engaged = sum(d)
    P = engaged % 720

    def total(a):
        t = 0
        for x in a:
            t = (t + x) % 720
        return t
    dQ = [sum(d[10 * m:10 * m + 10]) for m in range(72)]
    delta = [(720 - x) % 720 for x in dQ]
    Q10 = total(delta)
    Q8 = total([total([delta[m] for m in range(72) if (10 * m) // 72 == l]) for l in range(10)])
    H = (Q8 + Q10 + P) % 720
    inv = (720 - P) % 720
    return {'engaged': engaged, 'P': P, 'Q10': Q10, 'Q8': Q8, 'H': H, 'closed': P == 0,
            'identity': Q10 == inv and Q8 == inv and H == inv}


# ------------------------------------------------------------------ the zero-point clock (gen4.py)
ON = [18, 10, 2]                # joint frame of each branch's onload (k = 2)
OFF = [6, 22, 14]               # and its offload, twelve frames later (k = 6)
SPIN = [1, -1, 1]               # counter-rotating nested engines: I and III forward, II backward
TAUF = Fraction(1, 450)         # turns per engaged frame carried by a latched result


def carried_turns(s, frames):
    return TAUF * (SPIN[s] * frames)
