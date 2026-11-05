#!/usr/bin/env python3
# Hyperbolic Lexicon, Phase 0, spike S5: the LPS overlay X(5,q) of the norm-5 tree, for q = 13, 17, 29.
#
# WHAT IT MEASURES. The norm-5 tree's generators (HPCore.P.GENS = hpstep.problems.GENS: 1+2i, 1-2i, 1+2j, 1-2j,
# 1+2k, 1-2k, with P.INV = [1,0,3,2,5,4]) are the Lubotzky-Phillips-Sarnak set for p = 5. For each q in {13, 17, 29}
# (all = 1 mod 4) it takes iota = the smallest positive root of iota^2 = -1 mod q (5, 4, 12) and the map
#     phi_q(a + b i + c j + d k) = [[a + b iota, c + d iota], [-c + d iota, a - b iota]]  (mod q),
# a ring homomorphism (i -> diag(iota, -iota), j -> [[0,1],[-1,0]], k -> [[0,iota],[iota,0]]) with det = a^2+b^2+c^2+d^2.
# Vertices are 2x2 matrices mod q up to a nonzero scalar; the canonical representative scales the first nonzero
# entry (row-major order m00, m01, m10, m11) to 1. Edges: v -- v.phi_q(g) for the 6 generators (right multiplication,
# so walking the word g1..gL from the identity reaches phi_q(g1)...phi_q(gL), the order P.wordQuaternion multiplies in).
# The graph is built by BFS from the identity: the Cayley graph of the group the 6 images generate.
# Measured, in the L7 lettering of the planned preregistration (the S5 task lettering is given in brackets):
#   L7(a)  vertex count against q(q^2-1) (PGL(2,F_q)) and q(q^2-1)/2 (PSL(2,F_q)), the Legendre symbol (5|q), the
#          determinant square class of every vertex, 6-regularity (6 distinct neighbours, no loop), connectivity,
#          inverse closure (projective, and as nbr[nbr[v,g], INV[g]] = v), bipartiteness (BFS 2-colouring, compared with
#          the determinant class), sphere sizes and diameter.
#   girth  EXACT, three ways that must agree: (1) BFS from the identity, minimum of d(u)+d(v)+1 over non-tree edges.
#          A Cayley graph is vertex-transitive (v -> h.v is an automorphism), so every vertex lies on a shortest
#          cycle and one BFS from the identity gives the girth exactly; BFS from 8 more roots is printed as a check.
#          (2) the shortest nontrivial reduced word that evaluates to the identity, counted exhaustively by the
#          non-backtracking (Hashimoto) recursion over (vertex, last letter); (3) the first length k at which the
#          closed walks at the identity, W_k (exact integers), exceed those of the 6-regular tree, T_k.
#          r = floor((g-1)/2). The LPS lower bounds (2 log_5 q if (5|q) = 1, 4 log_5 q - log_5 4 if -1) are printed.
#   L7(b) [S5 (a)]  reduce P.wordQuaternion(w) mod q and projectivise, against the vertex reached by walking w from
#          the identity, on 1,000 synthetic reduced words of length 1-60.
#   L7(c) [S5 (b)]  every reduced word of length <= r (enumerated explicitly) maps to a distinct vertex; and, by the
#          exact counting recursion, how many collisions appear at lengths r+1 and r+2 (sharpness).
#   L7(d)  the dense adjacency (float64, N x N) and numpy.linalg.eigvalsh: the trivial eigenvalues +6 (and -6 when
#          bipartite) and their multiplicity, the largest |lambda| over the rest and its margin to 2 sqrt 5 = 4.4721.
#          Checked two ways: the power sums sum(lambda^k), k = 0..12, against the exact N * W_k (trace(A^k), by
#          vertex-transitivity), and a Lanczos run (full reorthogonalisation, trivial eigenvectors projected out) on
#          the sparse operator. Each q runs in a child process (this script with --eig q), so the "~" lines give the
#          eigvalsh wall time and that process's own peak RSS. At 12,180 vertices eigvalsh took about 45 s on an idle
#          4-core machine here and about 2 minutes while other jobs shared the cores (OpenBLAS threads), well under
#          10 minutes, so it is measured directly at all three sizes, with no extrapolation.
#   L7(e) [S5 (c)]  P.wordQuaternion(w) against SHD-CCP's HurwitzQuaternion product in doubled coordinates
#          (generators (2, +-4, 0, 0), ...; its __mul__ halves once per product), halved at the end, on the same
#          1,000 words. hurwitz.py is read first (its SHA-256 is printed) and imported with python3 -B -I.
#   controls [S5 (d)], each must FAIL: (1) iota = 2 (2^2 = 4, not -1 mod q): the walk by phi_2 matrices against
#          phi_2(P.wordQuaternion(w)) must disagree on at least one word; (2) the 4-generator subset {1+-2i, 1+-2j}
#          (indices 0-3, inverse-closed) must not be 6-regular; (3) a Hurwitz product without the halving step must
#          disagree: primary reading, the final halving omitted (doubled coordinates compared directly); a second
#          variant, the per-product halving omitted (raw products of doubled coordinates, halved once at the end).
#   P.wordQuaternion is imported from the reference (hpstep.problems.word_quaternion) and checked on all 1,000 words
#   against HPCore.P.wordQuaternion run in Node (node -e on hyperbolic_core.js, read-only), which also regenerates
#   the words with HPCore.Rng(90000+i) to check that the two generators agree bit for bit.
#
# HOW TO RUN, from the repository root:
#   python3 -B -I "Pages/Hyperbolic Lexicon/spikes/s5_lps_overlay.py" [--shdccp <SHD-CCP checkout>] \
#       > "Pages/Hyperbolic Lexicon/spikes/s5_lps_overlay_output.txt"
# -B -I are required: no __pycache__ is written and no environment or script directory is on sys.path. The imports
# come from explicit sys.path entries appended at the end: Pages/Hyperbolic Oracles/reference (hpstep: prng,
# problems; numpy only) and <SHD-CCP>/Geometric_Engine/ecosystem/SHD-CCP/geometric-engine/src (geometric_engine.
# hurwitz), which defaults to ../../../../SHD-CCP from this folder. Node must be on PATH. Nothing is written to any
# tree. Lines that begin with "~ " depend on the machine, the runtime or float rounding in LAPACK; every other line
# must be identical on a rerun.
#
# WHAT IT SETTLES. The facts the RFC 03 proposal cites (vertex counts, group, bipartiteness, girth and r, the
# Ramanujan margin, the Hurwitz identity) and L7's feasibility (the dense eigvalsh cost at 12,180 vertices). It
# decides no claim; it runs before PREREGISTRATION.md.
#
# DATA AND SEEDS. Synthetic words only, no WordNet data. Word i (i = 0..999) from hpstep.prng.Rng(90000+i):
# L = randint(1, 60), then each letter = children(w)[below(len(children(w)))] (6 choices first, 5 after), so every
# word is reduced. The same 1,000 words serve L7(b), L7(e) and controls (1) and (3). Extra girth roots: Rng(91000+q),
# 8 x below(N). Lanczos start vector: Rng(92000+q), random() - 1/2 per vertex.
#
# RUNTIME. About 1-1.5 minutes on an idle 4-core machine, about 3 minutes when other jobs share the cores: the
# dense eigvalsh at 12,180 vertices (45-120 s, about 2.3 GB peak RSS in its child) dominates, then the two smaller
# eigvalsh runs and the Lanczos checks; everything else takes under a second. The load average is printed ("~").
import hashlib
import json
import math
import os
import subprocess
import sys
import time

if not (sys.flags.dont_write_bytecode and sys.flags.isolated):
    sys.exit('run as python3 -B -I (no __pycache__, isolated sys.path)')

T_START = time.perf_counter()
HERE = os.path.dirname(os.path.abspath(__file__))


def _opt(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


SHDCCP = os.path.abspath(_opt('--shdccp', os.path.join(HERE, '..', '..', '..', '..', 'SHD-CCP')))
HO = os.path.abspath(os.path.join(HERE, '..', '..', 'Hyperbolic Oracles'))
HO_REF = os.path.join(HO, 'reference')
HO_CORE = os.path.join(HO, 'hyperbolic_core.js')
HURWITZ_SRC = os.path.join(SHDCCP, 'Geometric_Engine', 'ecosystem', 'SHD-CCP', 'geometric-engine', 'src')
HURWITZ_FILE = os.path.join(HURWITZ_SRC, 'geometric_engine', 'hurwitz.py')

sys.path.append(HO_REF)
import numpy as np  # noqa: E402
import hpstep  # noqa: E402
from hpstep.prng import Rng  # noqa: E402
from hpstep.problems import GENS, INV, word_quaternion, is_reduced, children  # noqa: E402

assert os.path.realpath(hpstep.__file__).startswith(os.path.realpath(HO_REF) + os.sep), hpstep.__file__

QS = [13, 17, 29]
DEG = 6
TWO_SQRT5 = 2 * math.sqrt(5)
SEED_WORDS, SEED_ROOTS, SEED_LANCZOS = 90000, 91000, 92000
N_WORDS, MAX_LEN = 1000, 60
MAX_K = 12           # power sums and closed walks up to this length
LANCZOS_M = 300      # Lanczos steps


# ================================================================ the LPS map and projective matrices mod q
def legendre(a, q):
    e = pow(a % q, (q - 1) // 2, q)
    return 1 if e == 1 else (-1 if e == q - 1 else 0)


def sqrt_minus_one(q):
    return next(x for x in range(1, q) if (x * x + 1) % q == 0)


def phi(quat, iota, q):
    a, b, c, d = quat
    return ((a + b * iota) % q, (c + d * iota) % q, (-c + d * iota) % q, (a - b * iota) % q)


def mmul(x, y, q):
    return ((x[0] * y[0] + x[1] * y[2]) % q, (x[0] * y[1] + x[1] * y[3]) % q,
            (x[2] * y[0] + x[3] * y[2]) % q, (x[2] * y[1] + x[3] * y[3]) % q)


def canon(m, q):
    """The projective class's representative: the first nonzero entry (row-major) scaled to 1."""
    for e in m:
        if e % q:
            inv = pow(e, -1, q)
            return tuple(x * inv % q for x in m)
    raise ValueError('zero matrix has no projective class')


def enc(m, q):
    return ((m[0] * q + m[1]) * q + m[2]) * q + m[3]


def det(m, q):
    return (m[0] * m[3] - m[1] * m[2]) % q


IDENT = (1, 0, 0, 1)


class Cayley:
    """The Cayley graph, from the identity, of the group generated by phi_q(GENS[g]) for g in gens (right
    multiplication). Vertices are numbered in BFS (discovery) order, so vertex 0 is the identity; dist and parent are
    the BFS distances and tree parents from it."""

    def __init__(self, q, iota, gens=tuple(range(6))):
        self.q, self.iota, self.gens = q, iota, tuple(gens)
        self.mats = [phi(GENS[g], iota, q) for g in self.gens]
        verts, index, nbr, dist, parent = [IDENT], {enc(IDENT, q): 0}, [], [0], [-1]
        i = 0
        while i < len(verts):
            m, row = verts[i], []
            for M in self.mats:
                c = canon(mmul(m, M, q), q)
                k = enc(c, q)
                j = index.get(k)
                if j is None:
                    j = len(verts)
                    index[k] = j
                    verts.append(c)
                    dist.append(dist[i] + 1)
                    parent.append(i)
                row.append(j)
            nbr.append(row)
            i += 1
        self.verts, self.index, self.n = verts, index, len(verts)
        self.nbr = np.array(nbr, dtype=np.int64)
        self.nbrl = nbr
        self.dist = np.array(dist, dtype=np.int64)
        self.parent = np.array(parent, dtype=np.int64)

    def vertex_of(self, m):
        return self.index.get(enc(canon(m, self.q), self.q))

    def walk(self, word):
        v = 0
        for g in word:
            v = self.nbrl[v][self.gens.index(g)]
        return v


def bfs_girth(nbrl, root):
    """Pure BFS from root: the minimum of d(u)+d(v)+1 over non-tree edges (the shortest cycle through root when root
    lies on a shortest cycle), and root's eccentricity."""
    n = len(nbrl)
    dist, par = [-1] * n, [-1] * n
    dist[root] = 0
    frontier, best = [root], None
    while frontier:
        nxt = []
        for u in frontier:
            for v in nbrl[u]:
                if dist[v] < 0:
                    dist[v], par[v] = dist[u] + 1, u
                    nxt.append(v)
                elif v != par[u] and par[v] != u:
                    c = dist[u] + dist[v] + 1
                    if best is None or c < best:
                        best = c
        frontier = nxt
    return best, max(dist)


def adjacency_dense(G):
    A = np.zeros((G.n, G.n))
    rows = np.arange(G.n)
    for g in range(len(G.gens)):
        A[rows, G.nbr[:, g]] = 1.0
    return A


def vm_kb(field):
    try:
        with open('/proc/self/status') as f:
            for line in f:
                if line.startswith(field + ':'):
                    return int(line.split()[1])
    except OSError:
        pass
    return -1


# ================================================================ child mode: one dense eigvalsh, measured alone
def eig_child(q):
    G = Cayley(q, sqrt_minus_one(q))
    bip = legendre(5, q) == -1
    t0 = time.perf_counter()
    A = adjacency_dense(G)
    t_build = time.perf_counter() - t0
    rss_before, hwm_before = vm_kb('VmRSS'), vm_kb('VmHWM')
    t0 = time.perf_counter()
    lam = np.linalg.eigvalsh(A)
    t_eig = time.perf_counter() - t0
    hwm_after = vm_kb('VmHWM')
    nbytes = A.nbytes
    del A
    lam = np.sort(lam)
    nontriv = lam[1:-1] if bip else lam[:-1]
    absnt = np.abs(nontriv)
    maxabs = float(absnt.max())
    # clusters of equal eigenvalues (representation multiplicities), tolerance 1e-7
    gaps = np.diff(lam)
    cut = gaps > 1e-7
    within = gaps[~cut]
    out = {
        'n': G.n, 'nbytes': int(nbytes), 'bip': bip,
        'top': float(lam[-1]), 'bottom': float(lam[0]),
        'n_plus6': int(np.sum(np.abs(lam - 6) < 1e-9)), 'n_minus6': int(np.sum(np.abs(lam + 6) < 1e-9)),
        'lam2': float(nontriv[-1]), 'lam_min_nt': float(nontriv[0]), 'maxabs': maxabs,
        'mult_maxabs': int(np.sum(np.abs(absnt - maxabs) < 1e-8)),
        'next_below': float(np.max(absnt[absnt < maxabs - 1e-8])),
        'distinct': int(np.sum(cut)) + 1,
        'max_within': float(within.max()) if within.size else 0.0,
        'min_between': float(gaps[cut].min()),
        'S': [float(np.sum(lam ** k)) for k in range(MAX_K + 1)],
        'Sabs': [float(np.sum(np.abs(lam) ** k)) for k in range(MAX_K + 1)],
        't_build': t_build, 't_eig': t_eig, 'rss_before_kb': rss_before, 'hwm_before_kb': hwm_before,
        'hwm_after_kb': hwm_after,
    }
    sys.stdout.write(json.dumps(out))


if '--eig' in sys.argv:
    eig_child(int(_opt('--eig', '0')))
    sys.exit(0)

# ================================================================ main
sys.path.append(HURWITZ_SRC)
from geometric_engine.hurwitz import HurwitzQuaternion  # noqa: E402
import geometric_engine.hurwitz as _hz  # noqa: E402

assert os.path.realpath(_hz.__file__) == os.path.realpath(HURWITZ_FILE), _hz.__file__

OUT = []
CHECKS = []


def out(s=''):
    OUT.append(s)
    print(s, flush=True)


def check(ok, text):
    CHECKS.append(bool(ok))
    out(f"  [{'PASS' if ok else 'FAIL'}] {text}")


def sha256_file(p):
    with open(p, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def wstr(w):
    return ''.join(str(g) for g in w)


def synth_word(i):
    r = Rng(SEED_WORDS + i)
    L = r.randint(1, MAX_LEN)
    w = []
    for _ in range(L):
        kids = children(w)
        w.append(kids[r.below(len(kids))])
    return w


def reduced_words_upto(L):
    words, layer = [[]], [[]]
    for _ in range(L):
        layer = [w + [g] for w in layer for g in children(w)]
        words.extend(layer)
    return words


def fmt_int(n):
    return f'{n:,}'


out('S5 · s5_lps_overlay · the LPS overlay X(5,q), q = 13, 17, 29: structure, exact girth, word reduction, '
    'Ramanujan margin, Hurwitz identity')
out("settles: the RFC 03 proposal's facts and L7's feasibility (vertex counts, girth and r, Ramanujan margin, "
    'eigvalsh cost); decides no claim')
out('reference, unchanged: hpstep.problems (GENS, INV, word_quaternion, children, is_reduced), hpstep.prng.Rng; '
    'HPCore 2.0.0 hyperbolic_core.js in Node for the cross-check')
out(f'SHD-CCP geometric_engine/hurwitz.py sha256 {sha256_file(HURWITZ_FILE)} (read, imported with python3 -B -I)')
out(f'~ python {sys.version.split()[0]}, numpy {np.__version__}, {os.cpu_count()} cpus, load average at start '
    f'{" ".join(f"{x:.2f}" for x in os.getloadavg())}')
out('data: synthetic reduced words only; word i (i = 0..999) from Rng(90000+i), length randint(1,60); '
    'girth roots Rng(91000+q); Lanczos start Rng(92000+q)')
out()

# ---------------------------------------------------------------- 0. the words and P.wordQuaternion, Python vs Node
out('0. The 1,000 synthetic words and P.wordQuaternion (Python reference against Node HPCore)')
t0 = time.perf_counter()
WORDS = [synth_word(i) for i in range(N_WORDS)]
WQ = [word_quaternion(w) for w in WORDS]
lens = [len(w) for w in WORDS]
out(f'  lengths: min {min(lens)}, max {max(lens)}, mean {sum(lens) / len(lens):.3f}, total letters {sum(lens)}; '
    f'first letters 0..5: {[sum(1 for w in WORDS if w[0] == g) for g in range(6)]}')
check(all(is_reduced(w) for w in WORDS), 'every word is reduced (no letter followed by its P.INV)')
check(all(sum(c * c for c in qq) == 5 ** len(w) for w, qq in zip(WORDS, WQ)),
      'norm of P.wordQuaternion(w) = 5^len(w) on all 1,000 words')
for i in range(3):
    out(f'  word {i}: len {len(WORDS[i])} {wstr(WORDS[i])}')
    out(f'          quaternion {WQ[i]}')
out(f'  generators as quaternions, P.GENS: {GENS}; P.INV {INV}')
JS = r"""
const HP = require(process.argv[1]);
const rows = [];
for (let i = 0; i < 1000; i++) {
  const r = new HP.Rng(90000 + i);
  const L = r.randint(1, 60);
  const w = [];
  for (let s = 0; s < L; s++) { const k = HP.P.children(w); w.push(k[r.below(k.length)]); }
  rows.push([w.join(''), HP.P.wordQuaternion(w).map(String)]);
}
const fixed = [[], [0], [1, 2], [0, 2, 4], [5, 5, 5, 5]].map(w => HP.P.wordQuaternion(w).map(String));
process.stdout.write(JSON.stringify({ version: HP.version, node: process.version, gens: HP.P.GENS.map(g => g.map(String)),
  inv: HP.P.INV, rows, fixed }));
"""
res = subprocess.run(['node', '-e', JS, HO_CORE], capture_output=True, text=True, check=True)
js = json.loads(res.stdout)
out(f"~ node {js['node']}")
out(f"  HPCore version {js['version']}")
check([tuple(int(c) for c in g) for g in js['gens']] == [tuple(g) for g in GENS] and js['inv'] == INV,
      'HPCore P.GENS and P.INV equal hpstep GENS and INV')
words_same = sum(1 for (ws, _), w in zip(js['rows'], WORDS) if ws == wstr(w))
quat_same = sum(1 for (_, qs), qq in zip(js['rows'], WQ) if tuple(int(c) for c in qs) == qq)
check(words_same == N_WORDS, f'HPCore.Rng(90000+i) regenerates the same words in Node: {words_same}/{N_WORDS}')
check(quat_same == N_WORDS, f'HPCore.P.wordQuaternion = hpstep word_quaternion: {quat_same}/{N_WORDS}')
fixed_words = [[], [0], [1, 2], [0, 2, 4], [5, 5, 5, 5]]
fixed_py = [word_quaternion(w) for w in fixed_words]
check([tuple(int(c) for c in f) for f in js['fixed']] == fixed_py,
      'fixed values agree: ' + ', '.join(f'[{wstr(w)}] {qq}' for w, qq in zip(fixed_words, fixed_py)))
out(f'~ words, quaternions and the Node run: {time.perf_counter() - t0:.2f} s')
out()

# ---------------------------------------------------------------- 1. the map phi_q
out('1. The LPS map phi_q, i -> iota with iota^2 = -1 mod q')
t0 = time.perf_counter()
GRAPHS = {}
for q in QS:
    iota = sqrt_minus_one(q)
    leg = legendre(5, q)
    mats = [phi(g, iota, q) for g in GENS]
    out(f'  q={q}: q mod 4 = {q % 4}, iota = {iota} ({iota}^2 = {iota * iota} = {(iota * iota) % q - q} mod {q}), '
        f'(5|{q}) = {leg:+d}, so {"PSL(2,F_q), not bipartite" if leg == 1 else "PGL(2,F_q), bipartite"} expected')
    out(f'        phi(GENS) = ' + ' '.join('[[{},{}],[{},{}]]'.format(*m) for m in mats))
    ok_hom = all(canon(mmul(phi(a, iota, q), phi(b, iota, q), q), q) == canon(phi(word_quaternion([x, y]), iota, q), q)
                 for x, a in enumerate(GENS) for y, b in enumerate(GENS))
    check(all(det(m, q) == 5 % q for m in mats) and ok_hom,
          f'q={q}: det phi(g) = 5 for all six; phi(g)phi(h) = phi(gh) for all 36 pairs')
    check(len({canon(m, q) for m in mats}) == 6 and all(canon(m, q) != IDENT for m in mats)
          and all(canon(mmul(m, m, q), q) != IDENT for m in mats)
          and all(canon(mmul(mats[g], mats[INV[g]], q), q) == IDENT for g in range(6)),
          f'q={q}: the six images are distinct, none is the identity or an involution, '
          f'and phi(g) phi(P.INV[g]) = 5 I (projectively the identity): inverse-closed')
    GRAPHS[q] = Cayley(q, iota)
out(f'~ BFS builds of the three graphs: {time.perf_counter() - t0:.2f} s')
out()

# ---------------------------------------------------------------- 2. L7(a) structure
out('2. L7(a): structure of the Cayley graph (BFS from the identity)')
STRUCT = {}
for q in QS:
    G = GRAPHS[q]
    leg = legendre(5, q)
    order_pgl, order_psl = q * (q * q - 1), q * (q * q - 1) // 2
    expect = order_psl if leg == 1 else order_pgl
    squares = {(x * x) % q for x in range(1, q)}
    dsq = [det(m, q) in squares for m in G.verts]
    n_sq = sum(dsq)
    check(G.n == expect, f'q={q}: {fmt_int(G.n)} vertices = q(q^2-1){"/2" if leg == 1 else ""} = {fmt_int(expect)} '
          f'(|PGL(2,F_{q})| = {fmt_int(order_pgl)}, |PSL(2,F_{q})| = {fmt_int(order_psl)})')
    if leg == 1:
        check(n_sq == G.n, f'q={q}: every vertex has square determinant, so the group is PSL(2,F_{q}) (in PGL, '
              f'of index 2)')
    else:
        check(n_sq == G.n // 2, f'q={q}: {fmt_int(n_sq)} vertices have square determinant and {fmt_int(G.n - n_sq)} '
              f'do not: the group is all of PGL(2,F_{q})')
    srt = np.sort(G.nbr, axis=1)
    reg6 = bool(np.all(np.diff(srt, axis=1) > 0) and np.all(G.nbr != np.arange(G.n)[:, None])) and G.nbr.shape[1] == 6
    check(reg6, f'q={q}: 6-regular (every vertex has 6 distinct neighbours, no loop)')
    inv_ok = all(np.array_equal(G.nbr[G.nbr[:, g], INV[g]], np.arange(G.n)) for g in range(6))
    check(inv_ok, f'q={q}: inverse-closed as a graph: nbr[nbr[v,g], P.INV[g]] = v for all v, g (adjacency symmetric)')
    out(f'    q={q}: connected by construction (the BFS from the identity enumerates the generated group, here the '
        f'whole group above); section 6 confirms that the eigenvalue 6 is simple')
    U = np.repeat(np.arange(G.n), 6)
    V = G.nbr.ravel()
    bip = bool(np.all((G.dist[U] - G.dist[V]) % 2 != 0))
    par_vs_det = bool(np.all((G.dist % 2 == 0) == np.array(dsq))) if leg == -1 else None
    if leg == -1:
        check(bip and par_vs_det, f'q={q}: bipartite (every edge joins even and odd BFS depth); the sides are exactly '
              f'the square / non-square determinant classes')
    else:
        odd_edges = int(np.sum((G.dist[U] - G.dist[V]) % 2 == 0)) // 2
        check(not bip, f'q={q}: not bipartite ({fmt_int(odd_edges)} edges join vertices of equal BFS depth parity)')
    spheres = np.bincount(G.dist).tolist()
    out(f'    sphere sizes from the identity, d = 0..{len(spheres) - 1}: {spheres}; diameter {len(spheres) - 1} '
        f'(vertex-transitive, so the eccentricity of the identity is the diameter)')
    STRUCT[q] = {'bip': bip, 'diam': len(spheres) - 1, 'spheres': spheres}
out()

# ---------------------------------------------------------------- 3. exact girth
out('3. Exact girth, three ways, and r = floor((g-1)/2)')
out('   One BFS from the identity suffices: a Cayley graph is vertex-transitive (v -> h.v is an automorphism),')
out('   so every vertex lies on a shortest cycle and the BFS from any vertex returns the girth exactly.')
GIRTH = {}
t0 = time.perf_counter()


def tree_closed_walks(kmax, deg=6):
    T, vec = [], [1] + [0] * (kmax + 1)
    for _ in range(kmax + 1):
        T.append(vec[0])
        nv = [0] * len(vec)
        for d, c in enumerate(vec):
            if not c:
                continue
            if d == 0:
                nv[1] += deg * c
            else:
                nv[d - 1] += c
                if d + 1 < len(nv):
                    nv[d + 1] += (deg - 1) * c
        vec = nv
    return T


def closed_walks(G, kmax):
    c = np.zeros(G.n, dtype=np.int64)
    c[0] = 1
    W = []
    for _ in range(kmax + 1):
        W.append(int(c[0]))
        c = sum(c[G.nbr[:, g]] for g in range(G.nbr.shape[1]))
    return W


def nonbacktracking_counts(G, Lmax):
    """cnt[L][v] = number of reduced words of length L that walk from the identity to v (exact, all words)."""
    N = G.n
    c = np.zeros((N, 6), dtype=np.int64)
    for g in range(6):
        c[G.nbr[0, g], g] += 1
    e0 = np.zeros(N, dtype=np.int64)
    e0[0] = 1
    per = [e0, c.sum(axis=1)]
    for _ in range(2, Lmax + 1):
        nc = np.zeros_like(c)
        tot = c.sum(axis=1)
        for g in range(6):
            nc[G.nbr[:, g], g] = tot - c[:, INV[g]]
        c = nc
        per.append(c.sum(axis=1))
    return per


TREE = tree_closed_walks(40)
for q in QS:
    G = GRAPHS[q]
    leg = legendre(5, q)
    # (1) BFS from the identity, vectorised; and the pure BFS from the identity and 8 more roots
    U = np.repeat(np.arange(G.n), 6)
    V = G.nbr.ravel()
    tree_edge = (G.parent[V] == U) | (G.parent[U] == V)
    g1 = int(np.min(G.dist[U][~tree_edge] + G.dist[V][~tree_edge] + 1))
    gid, _ = bfs_girth(G.nbrl, 0)
    rr = Rng(SEED_ROOTS + q)
    roots = [rr.below(G.n) for _ in range(8)]
    others = [bfs_girth(G.nbrl, r0) for r0 in roots]
    # (2) shortest reduced word equal to the identity, exhaustive counting
    per = nonbacktracking_counts(G, 16)
    ret = [int(p[0]) for p in per]
    g2 = next(L for L in range(1, len(ret)) if ret[L] > 0)
    # (3) closed walks against the tree
    W = closed_walks(G, max(MAX_K, g2 + 2))
    g3 = next(k for k in range(len(W)) if W[k] != TREE[k])
    g = g1
    r = (g - 1) // 2
    bound = (2 * math.log(q, 5)) if leg == 1 else (4 * math.log(q, 5) - math.log(4, 5))
    GIRTH[q] = {'g': g, 'r': r, 'W': W, 'per': per, 'ret': ret}
    check(g1 == gid == g2 == g3 and all(o[0] == g1 for o in others),
          f'q={q}: girth g = {g} by (1) BFS from the identity (vectorised and plain), (2) the shortest nontrivial '
          f'reduced word equal to the identity, (3) the first k with W_k != T_k; BFS from 8 more roots '
          f'(Rng({SEED_ROOTS + q}).below(N): {roots}) gives {sorted({o[0] for o in others})}')
    out(f'    r = floor((g-1)/2) = {r}; {"odd" if g % 2 else "even"} girth; LPS lower bound '
        f'{"2 log_5 q" if leg == 1 else "4 log_5 q - log_5 4"} = {bound:.4f} <= {g}: {"yes" if bound <= g else "NO"}')
    cyc_id = ret[g] // 2
    out(f'    reduced words of length g equal to the identity: {ret[g]} = W_g - T_g = {W[g]} - {TREE[g]} = '
        f'{W[g] - TREE[g]}; so {cyc_id} g-cycles pass through each vertex and the graph has '
        f'{fmt_int(G.n * cyc_id // g)} g-cycles ({fmt_int(G.n)} x {cyc_id} / {g})')
    check(ret[g] == W[g] - TREE[g] and (G.n * cyc_id) % g == 0,
          f'q={q}: the two exact counts of length-g identity words agree, and N x (cycles through a vertex) is '
          f'divisible by g')
    out(f'    closed walks at the identity W_k, k = 0..{MAX_K}: {W[:MAX_K + 1]}')
    out(f'    6-regular tree T_k,                   k = 0..{MAX_K}: {TREE[:MAX_K + 1]}')
out(f'~ girth (three methods, 9 extra BFS roots per q): {time.perf_counter() - t0:.2f} s')
out()

# ---------------------------------------------------------------- 4. L7(b) word reduction = walk
out('4. L7(b) [S5 task (a)]: phi_q(P.wordQuaternion(w)) projectivised = the vertex reached by walking w from the identity')
t0 = time.perf_counter()
for q in QS:
    G = GRAPHS[q]
    ok_tab = ok_mat = 0
    for w, qq in zip(WORDS, WQ):
        v_red = G.vertex_of(phi(qq, G.iota, q))
        v_walk = G.walk(w)
        m = IDENT
        for x in w:
            m = canon(mmul(m, G.mats[x], q), q)
        ok_tab += v_red is not None and v_red == v_walk
        ok_mat += m == canon(phi(qq, G.iota, q), q)
    check(ok_tab == N_WORDS and ok_mat == N_WORDS,
          f'q={q}: reduction = walk on {ok_tab}/{N_WORDS} words (neighbour table), {ok_mat}/{N_WORDS} '
          f'(step-by-step matrix product)')
out('  worked examples (canonical projective matrix (m00,m01,m10,m11) mod q, vertex number in BFS order):')
for w in ([0], [0, 2], [0, 2, 4], WORDS[0][:5]):
    row = []
    for q in QS:
        G = GRAPHS[q]
        m = canon(phi(word_quaternion(w), G.iota, q), q)
        row.append(f'q={q} {m} #{G.vertex_of(m)}')
    out(f'    [{wstr(w)}] {word_quaternion(w)}: ' + '; '.join(row))
out(f'~ reduction against walk, 3 x 1,000 words: {time.perf_counter() - t0:.2f} s')
out()

# ---------------------------------------------------------------- 5. L7(c) injectivity up to r
out('5. L7(c) [S5 task (b)]: distinct reduced words of length <= r map to distinct vertices (exhaustive)')
t0 = time.perf_counter()
for q in QS:
    G = GRAPHS[q]
    r = GIRTH[q]['r']
    words = reduced_words_upto(r + 1)
    by_len = {}
    for w in words:
        by_len.setdefault(len(w), []).append(w)
    vr = [G.vertex_of(phi(word_quaternion(w), G.iota, q)) for w in words]
    vw = [G.walk(w) for w in words]
    n_le_r = sum(len(by_len[L]) for L in range(r + 1))
    distinct_r = len(set(vr[:n_le_r]))
    distinct_r1 = len(set(vr))
    check(vr == vw and distinct_r == n_le_r,
          f'q={q}, r={r}: all {fmt_int(n_le_r)} reduced words of length <= {r} map to {fmt_int(distinct_r)} distinct '
          f'vertices (by reduction; the walk agrees on every word)')
    out(f'    sharpness: the {fmt_int(len(words))} words of length <= {r + 1} reach {fmt_int(distinct_r1)} vertices '
        f'({fmt_int(len(words) - distinct_r1)} collisions)')
    per = GIRTH[q]['per']
    cum = np.zeros(G.n, dtype=np.int64)
    rows = []
    for L in range(0, r + 3):
        cum += per[L]
        nwords = int(cum.sum())
        reached = int(np.count_nonzero(cum))
        ball = int(sum(STRUCT[q]['spheres'][:L + 1]))
        assert nwords == (1 + 6 * (5 ** L - 1) // 4) and reached == ball
        rows.append(f'L<={L}: {fmt_int(nwords)} words, {fmt_int(reached)} vertices, {fmt_int(nwords - reached)} '
                    f'collisions')
    check(int(sum(per[L].sum() for L in range(r + 1))) - int(sum(STRUCT[q]['spheres'][:r + 1])) == 0
          and len(words) - distinct_r1 > 0,
          f'q={q}: exact counting agrees (no collision up to r = {r}, collisions from r+1 = {r + 1}); '
          f'vertices reached = ball size at every L')
    out('    ' + ' · '.join(rows))
out(f'~ injectivity, exhaustive: {time.perf_counter() - t0:.2f} s')
out()

# ---------------------------------------------------------------- 6. L7(d) Ramanujan, dense eigvalsh
out('6. L7(d): spectrum of the dense adjacency, numpy.linalg.eigvalsh (float64), one child process per q')
out(f'   Ramanujan bound 2 sqrt 5 = {TWO_SQRT5:.10f}; trivial eigenvalues excluded: +6, and -6 when bipartite')
EIG = {}
for q in QS:
    G = GRAPHS[q]
    res = subprocess.run([sys.executable, '-B', '-I', os.path.abspath(__file__), '--eig', str(q)],
                         capture_output=True, text=True, check=True)
    e = json.loads(res.stdout)
    EIG[q] = e
    N = G.n
    bip = STRUCT[q]['bip']
    out(f'  q={q}: N = {fmt_int(N)}, dense float64 matrix {fmt_int(e["nbytes"])} bytes ({e["nbytes"] / 2 ** 20:.1f} MiB)')
    check(e['n'] == N and e['n_plus6'] == 1 and e['n_minus6'] == (1 if bip else 0),
          f'q={q}: eigenvalue +6 has multiplicity 1 (connected) and -6 has multiplicity {e["n_minus6"]} '
          f'({"bipartite" if bip else "not bipartite"}), tolerance 1e-9')
    out(f'    largest nontrivial lambda_2 = {e["lam2"]:.6f}; smallest nontrivial = {e["lam_min_nt"]:.6f}')
    out(f'    largest nontrivial |lambda| = {e["maxabs"]:.6f} (multiplicity {e["mult_maxabs"]}, tolerance 1e-8; '
        f'next value below it {e["next_below"]:.6f})')
    margin = TWO_SQRT5 - e['maxabs']
    check(e['maxabs'] <= TWO_SQRT5 - 1e-9,
          f'q={q}: Ramanujan, max nontrivial |lambda| <= 2 sqrt 5 - 1e-9; margin 2 sqrt 5 - max = {margin:.6f}')
    out(f'    distinct eigenvalues (clusters, gap > 1e-7): {e["distinct"]}')
    out(f'~   q={q}: cluster robustness: largest gap inside a cluster {e["max_within"]:.3e}, smallest gap between '
        f'clusters {e["min_between"]:.3e}')
    # power sums against exact traces
    W = GIRTH[q]['W']
    errs = [abs(e['S'][k] - N * W[k]) / e['Sabs'][k] for k in range(MAX_K + 1)]
    check(max(errs) < 1e-9, f'q={q}: power sums sum(lambda^k), k = 0..{MAX_K}, equal the exact trace(A^k) = N W_k '
          f'(relative error < 1e-9); e.g. trace(A^2) = {fmt_int(N * W[2])}, trace(A^{GIRTH[q]["g"]}) = '
          f'{fmt_int(N * W[GIRTH[q]["g"]])}')
    out(f'~   q={q}: max relative power-sum error {max(errs):.3e}; exact repr: lambda_2 {e["lam2"]!r}, '
        f'max |lambda| {e["maxabs"]!r}, top {e["top"]!r}, bottom {e["bottom"]!r}')
    # Lanczos cross-check on the sparse operator
    t0 = time.perf_counter()
    rng = Rng(SEED_LANCZOS + q)
    v = np.array([rng.random() - 0.5 for _ in range(N)])
    triv = [np.ones(N) / math.sqrt(N)]
    if bip:
        triv.append(np.where(G.dist % 2 == 0, 1.0, -1.0) / math.sqrt(N))
    Tm = np.stack(triv)
    m_steps = min(LANCZOS_M, N - len(triv))
    Vb = np.zeros((m_steps, N))
    alpha, beta = np.zeros(m_steps), np.zeros(m_steps)
    v = v - Tm.T @ (Tm @ v)
    v /= np.linalg.norm(v)
    steps = m_steps
    for j in range(m_steps):
        Vb[j] = v
        w = sum(v[G.nbr[:, g]] for g in range(6))
        alpha[j] = w @ v
        w = w - alpha[j] * v - (beta[j - 1] * Vb[j - 1] if j else 0)
        for _ in range(2):
            w = w - Tm.T @ (Tm @ w)
            w = w - Vb[:j + 1].T @ (Vb[:j + 1] @ w)
        b = np.linalg.norm(w)
        if b < 1e-10:
            steps = j + 1
            break
        beta[j] = b
        v = w / b
    Tri = np.diag(alpha[:steps]) + np.diag(beta[:steps - 1], 1) + np.diag(beta[:steps - 1], -1)
    ritz = np.linalg.eigvalsh(Tri)
    lz_max = max(abs(ritz[0]), abs(ritz[-1]))
    dl = abs(lz_max - e['maxabs'])
    check(dl < 1e-6, f'q={q}: Lanczos ({steps} steps, trivial eigenvectors projected out) gives max nontrivial '
          f'|lambda| {lz_max:.6f}, agreeing with eigvalsh within 1e-6')
    out(f'~   q={q}: Lanczos |difference| {dl:.3e}, {time.perf_counter() - t0:.2f} s')
    out(f'~   q={q}: eigvalsh {e["t_eig"]:.2f} s (dense build {e["t_build"]:.2f} s); child RSS before eigvalsh '
        f'{e["rss_before_kb"] / 1024:.0f} MiB, peak RSS after {e["hwm_after_kb"] / 1024:.0f} MiB '
        f'(peak before {e["hwm_before_kb"] / 1024:.0f} MiB)')
t13, t17, t29 = (EIG[q]['t_eig'] for q in QS)
out(f'~ eigvalsh scaling: t(4,896)/t(2,184) = {t17 / t13:.2f} (n^3 predicts {(4896 / 2184) ** 3:.2f}), '
    f't(12,180)/t(4,896) = {t29 / t17:.2f} (n^3 predicts {(12180 / 4896) ** 3:.2f}); measured directly, '
    f'no extrapolation needed')
out()

# ---------------------------------------------------------------- 7. L7(e) Hurwitz
out('7. L7(e) [S5 task (c)]: P.wordQuaternion = SHD-CCP HurwitzQuaternion product in doubled coordinates, halved')
t0 = time.perf_counter()
HG = [HurwitzQuaternion(*(2 * c for c in g)) for g in GENS]
out('  generators in doubled coordinates: ' + ' '.join(f'({h.a},{h.b},{h.c},{h.d})' for h in HG)
    + f'; norm() of each = {[h.norm() for h in HG]}')
H_ONE = HurwitzQuaternion(2, 0, 0, 0)


def hurwitz_product(w):
    h = H_ONE
    for g in w:
        h = h * HG[g]
    return h


def halve(t):
    assert all(c % 2 == 0 for c in t)
    return tuple(c // 2 for c in t)


ok_h = ok_norm = 0
for w, qq in zip(WORDS, WQ):
    h = hurwitz_product(w)
    ok_h += halve((h.a, h.b, h.c, h.d)) == qq
    ok_norm += h.norm() == 5 ** len(w)
h_empty = hurwitz_product([])
check(ok_h == N_WORDS and halve((h_empty.a, h_empty.b, h_empty.c, h_empty.d)) == (1, 0, 0, 0),
      f'HurwitzQuaternion product (left to right, h = h * g), halved, equals P.wordQuaternion on '
      f'{ok_h}/{N_WORDS} words, and on the empty word')
check(ok_norm == N_WORDS, f'HurwitzQuaternion.norm() of the product = 5^len(w) on {ok_norm}/{N_WORDS} words')
out(f'~ Hurwitz products: {time.perf_counter() - t0:.2f} s')
out()

# ---------------------------------------------------------------- 8. controls
out('8. Controls (each must FAIL)')
t0 = time.perf_counter()
for q in QS:
    iota2 = 2
    mats2 = [phi(g, iota2, q) for g in GENS]
    bad, fail_lens = 0, []
    for w, qq in zip(WORDS, WQ):
        m = IDENT
        for x in w:
            m = canon(mmul(m, mats2[x], q), q)
        if m != canon(phi(qq, iota2, q), q):
            bad += 1
            fail_lens.append(len(w))
    check(bad >= 1, f'control (1), q={q}: iota = 2 (2^2 = 4, not -1 = {q - 1} mod {q}; dets of phi_2(GENS) '
          f'{[det(m, q) for m in mats2]}): walk != reduction on {bad}/{N_WORDS} words (failing lengths '
          f'{min(fail_lens) if fail_lens else "-"}..{max(fail_lens) if fail_lens else "-"}); the control fails as '
          f'required')
for q in QS:
    G4 = Cayley(q, sqrt_minus_one(q), gens=(0, 1, 2, 3))
    degs = sorted({len(set(row)) for row in G4.nbrl})
    reg6 = degs == [6]
    check(not reg6, f'control (2), q={q}: the subset {{1+2i, 1-2i, 1+2j, 1-2j}} generates {fmt_int(G4.n)} vertices, '
          f'every vertex has degree {degs}: not 6-regular, the control fails as required')


def raw_mul(x, y):
    a = x[0] * y[0] - x[1] * y[1] - x[2] * y[2] - x[3] * y[3]
    b = x[0] * y[1] + x[1] * y[0] + x[2] * y[3] - x[3] * y[2]
    c = x[0] * y[2] - x[1] * y[3] + x[2] * y[0] + x[3] * y[1]
    d = x[0] * y[3] + x[1] * y[2] - x[2] * y[1] + x[3] * y[0]
    return (a, b, c, d)


bad_final = bad_inner = twice = scaled = 0
for w, qq in zip(WORDS, WQ):
    h = hurwitz_product(w)
    bad_final += (h.a, h.b, h.c, h.d) != qq
    twice += (h.a, h.b, h.c, h.d) == tuple(2 * c for c in qq)
    t = (2, 0, 0, 0)
    for g in w:
        t = raw_mul(t, (HG[g].a, HG[g].b, HG[g].c, HG[g].d))
    bad_inner += halve(t) != qq
    scaled += halve(t) == tuple(2 ** len(w) * c for c in qq)
check(bad_final >= 1 and twice == N_WORDS,
      f'control (3), primary: the doubled coordinates without the final halving differ from P.wordQuaternion on '
      f'{bad_final}/{N_WORDS} words (they are exactly 2 P.wordQuaternion(w) on {twice}/{N_WORDS}); the control '
      f'fails as required')
check(bad_inner >= 1 and scaled == N_WORDS,
      f'control (3), variant: products of doubled coordinates without the per-product halving (halved once at the '
      f'end) differ on {bad_inner}/{N_WORDS} words (they are exactly 2^len(w) P.wordQuaternion(w) on '
      f'{scaled}/{N_WORDS}); the control fails as required')
out(f'~ controls: {time.perf_counter() - t0:.2f} s')
out()

n_pass = sum(CHECKS)
out(f'{n_pass}/{len(CHECKS)} checks pass')
out()
out('SETTLES:')
for q in QS:
    G, e, gi = GRAPHS[q], EIG[q], GIRTH[q]
    leg = legendre(5, q)
    out(f'  - q = {q}: iota = {G.iota}, (5|{q}) = {leg:+d}; {fmt_int(G.n)} vertices = '
        f'{"|PSL(2,F_q)| = q(q^2-1)/2" if leg == 1 else "|PGL(2,F_q)| = q(q^2-1)"}, '
        f'{"not bipartite" if leg == 1 else "bipartite"}, 6-regular, connected, inverse-closed, diameter '
        f'{STRUCT[q]["diam"]}; exact girth g = {gi["g"]}, so r = {gi["r"]}; largest nontrivial |lambda| = '
        f'{e["maxabs"]:.6f}, Ramanujan margin {TWO_SQRT5 - e["maxabs"]:.6f} to 2 sqrt 5 = {TWO_SQRT5:.4f}.')
rs = [GIRTH[q]['r'] for q in QS]
out(f'  - mod-q shard keys separate every pair of distinct reduced words of length <= r = {rs[0]}, {rs[1]}, {rs[2]} '
    f'(q = 13, 17, 29) and collide from length r+1 on; the reduction mod q of P.wordQuaternion is exactly the walk '
    f'from the identity (1,000/1,000 synthetic words at each q).')
out(f'  - L7(e): P.wordQuaternion = HurwitzQuaternion product of (2, +-4, 0, 0), (2, 0, +-4, 0), (2, 0, 0, +-4), '
    f'halved (1,000/1,000 words); without halving it never matches.')
out(f'  - L7 controls fail as required: iota = 2 breaks the walk identity at every q; the 4-generator subset is '
    f'4-regular; the unhalved Hurwitz product disagrees.')
out(f'  - L7 feasibility: dense float64 eigvalsh is tractable at all three q; the 12,180-vertex matrix is '
    f'{EIG[29]["nbytes"] / 2 ** 20:.1f} MiB (the "~" lines give the measured time and peak RSS on this machine).')
out(f'~   - eigvalsh measured on this machine: {fmt_int(GRAPHS[13].n)} vertices {EIG[13]["t_eig"]:.1f} s, '
    f'{fmt_int(GRAPHS[17].n)} {EIG[17]["t_eig"]:.1f} s, {fmt_int(GRAPHS[29].n)} {EIG[29]["t_eig"]:.1f} s '
    f'(peak RSS of that child {EIG[29]["hwm_after_kb"] / 1024:.0f} MiB), {os.cpu_count()} cpus')
out(f'~ load average at end {" ".join(f"{x:.2f}" for x in os.getloadavg())}')
out(f'~ total runtime {time.perf_counter() - T_START:.1f} s')
