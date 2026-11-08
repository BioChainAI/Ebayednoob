"""L6's training data and its float64 trainer (Amendment 10, items 2-5): D9's authority for the learned tables.

    closure_set(wn, root)                  a noun closure set (mammal.n.01, the dry run's solid.n.01, ...): offsets,
                                           closure ancestors and descendants inside the set, the registered closure
                                           and graph-edge neighbours, the L3 words, the instance SHA-256
    build_closure_set(root, offsets, anc, desc, parent, children, words)    the same from plain maps (synthetic DAGs)
    training_instance(cs)                  item 2: positives (u, v), v in anc(u), in (u, v) order; NN(u) as a CSR
    shuffled_pairs(n, E, seed), shuffled_instance(n, E, seed)    item 9, control 2: E random pairs from
                                           PyStream(seed); NN'(a) from the pairs' own relation
    nonneighbour_csr(n, related)           NN(u) = every node but u and related[u], ascending
    init_table(stream, n, d, geometry)     item 3.1: x_ik = (2 random() - 1) 1e-3, node-major; Lorentz x0 = sqrt(1 + .)
    rate(lr, epoch), batches(E)            item 3's schedule: lr / 10 for epochs 0-19; batches of 50, the last kept
    train(inst, geometry, d, lr, seed)     items 3-5: one run -> Run (table or divergence, diagnostics, SHA-256)
    lorentz_batch(X, U, C, eta, diag), euclid_batch(...)     item 4: one batch on a row-major table, in place
    accumulators(X, U, C, geometry)        one batch's per-node accumulators, without stepping (tests)
    seqsum(A), sdot(A, B), sdot0(A, B), table_bytes(X), table_sha(X), environment(), engine_string()

The arithmetic is item 4's, exactly (binary64, round to nearest, no fused multiply-add: every +, -, * and / is its
own numpy ufunc call or Python operation, so nothing can be fused):
- every sum is Sigma_seq: left to right in index order, each term rounded first. The trainer keeps its table
  coordinate-major (X.T, shape (d + 1, n) or (d, n), C-contiguous), so a sum over coordinates is a run of explicit
  adds of contiguous vectors (sdot0). seqsum and sdot sum over the last axis: explicit adds up to 12 entries and the
  last partial sum of np.add.accumulate beyond (each partial sum is an output, so the order is forced). numpy's
  pairwise .sum() is not used. The layout changes no value: each operation has the same operands either way;
- exp, log1p, cosh and sinh are numpy's float64 ufuncs on C-contiguous arrays (the batch's (B, 51) matrices; the
  touched nodes' tau in ascending node order); sqrt is correctly rounded;
- a node's accumulator is the Sigma_seq of its terms in term order (rows in batch order, then j = 0..50, then the
  anchor's term before the candidate's) starting from 0: np.bincount over (coordinate, node) bins adds its weights
  one by one in input order, and the weights of one coordinate are in term order;
- no BLAS: no @, dot, einsum, tensordot, matmul or linalg in the code (tests/test_embed.py scans its syntax tree).
tests/embed_ref.py, a slow second implementation in plain Python floats, agrees with train() byte for byte, and
tests/l6_oracle.py recomputes a step in 60 digits.

The stream is lexicon.stream.Stream (numba), imported lazily so that a process that never trains never imports
numba; any object with the same calls (lexicon.pystream.PyStream) can stand in. Bit identity is promised on the build
machine only (item 4): environment() records numpy's, numba's and libc's versions and numpy's SIMD features.
"""
import hashlib
import platform
import time
from dataclasses import dataclass, field

import numpy as np

from . import rank as R

EPOCHS, BURNIN, BATCH, NEGS = 1000, 20, 50, 50
GRID = ('0.03', '0.1', '0.3', '1', '3', '10')
DIMS = (2, 3, 5, 10, 50)
GEOMETRIES = ('lorentz', 'euclid')
INIT_RANGE = 1e-3
SHORT_AXIS = 12                    # seqsum / sdot: explicit adds up to this many terms, add.accumulate beyond


# ================================================================ the closure set (evaluation side, item 2)
@dataclass(frozen=True)
class ClosureSet:
    root: str
    offsets: tuple                 # offset order; node index = position
    anc: list                      # frozenset of indices: closure ancestors inside the set
    desc: list                     # frozenset of indices: closure descendants inside the set
    closure_nb: list               # rank.closure_neighbours
    graph_nb: list                 # rank.graph_neighbours over the full spanning forest
    words: list                    # L3 words (tuples) for the exact arm, or None
    instance_sha: str              # SHA-256 of the offsets, LF-joined, no final LF

    @property
    def n(self):
        return len(self.offsets)


def offsets_sha(offsets):
    return hashlib.sha256('\n'.join(offsets).encode()).hexdigest()


def build_closure_set(root, offsets, anc, desc, parent, children, words=None):
    """A ClosureSet from maps over offsets: anc[o] and desc[o] (closure ancestors and descendants, any superset of
    the set's own), parent[o] and children[o] (the spanning forest, as lexicon.wordnet.spanning_forest gives it),
    words[o] (the L3 word) or None."""
    offsets = tuple(offsets)
    if list(offsets) != sorted(set(offsets)):
        raise ValueError('the offsets must be distinct and in offset order')
    if root not in offsets:
        raise ValueError(f'the root {root} is not in the set')
    index = {o: i for i, o in enumerate(offsets)}
    anc_i = [frozenset(index[x] for x in anc[o] if x in index) for o in offsets]
    desc_i = [frozenset(index[x] for x in desc.get(o, ()) if x in index) for o in offsets]
    for u, a in enumerate(anc_i):
        if u in a or any(u not in desc_i[v] for v in a):
            raise ValueError(f'ancestors and descendants of {offsets[u]} disagree')
    if sum(len(a) for a in anc_i) != sum(len(x) for x in desc_i):
        raise ValueError('ancestors and descendants disagree')
    closure_nb = R.closure_neighbours(list(offsets), anc, desc)
    if any(nb != sorted(a | x) for nb, a, x in zip(closure_nb, anc_i, desc_i)):
        raise ValueError('rank.closure_neighbours disagrees with the closure')
    graph_nb = R.graph_neighbours(list(offsets), parent, children)
    w = None if words is None else [tuple(words[o]) for o in offsets]
    return ClosureSet(root, offsets, anc_i, desc_i, closure_nb, graph_nb, w, offsets_sha(offsets))


def closure_set(wn, root):
    """The closure set of a noun synset: the root and every noun with the root among its hypernym + instance-hypernym
    ancestors (lexicon.wordnet.closure), in offset order. Graph-edge neighbours use the full noun spanning forest;
    the words are address.noun_words over the full noun forest, restricted to the set (item 2)."""
    from . import address as A
    from . import wordnet as W
    nouns = wn['synsets']['noun']
    if root not in nouns:
        raise KeyError(f'{root} is not a noun synset')
    anc = W.closure(nouns)
    desc = W.descendants(anc)
    offs = sorted([root] + [o for o, a in anc.items() if root in a])
    parent, children, _ = W.spanning_forest(nouns)
    return build_closure_set(root, offs, anc, desc, parent, children, A.noun_words(wn))


# ================================================================ the training instance (item 2)
@dataclass(frozen=True)
class Instance:
    name: str
    n: int
    pos: np.ndarray                # int64[E, 2]: (anchor, positive), sorted by (anchor, positive)
    nn_ptr: np.ndarray             # int64[n + 1]: NN(u) = nn_flat[nn_ptr[u]:nn_ptr[u + 1]], ascending
    nn_flat: np.ndarray

    @property
    def E(self):
        return len(self.pos)

    def nn_sizes(self):
        return self.nn_ptr[1:] - self.nn_ptr[:-1]


def nonneighbour_csr(n, related):
    """NN(u) = every node other than u and those in related[u], in index order, as (ptr, flat) int64 arrays."""
    ptr = np.zeros(n + 1, dtype=np.int64)
    parts = []
    for u in range(n):
        keep = np.ones(n, dtype=bool)
        keep[u] = False
        rel = list(related[u])
        if rel:
            keep[np.asarray(rel, dtype=np.int64)] = False
        nz = np.flatnonzero(keep).astype(np.int64)
        parts.append(nz)
        ptr[u + 1] = ptr[u] + len(nz)
    flat = np.concatenate(parts) if parts else np.zeros(0, dtype=np.int64)
    return ptr, flat


def _instance(name, n, pairs, related):
    pos = np.array(sorted(pairs), dtype=np.int64).reshape(-1, 2)
    ptr, flat = nonneighbour_csr(n, related)
    sizes = ptr[1:] - ptr[:-1]
    anchors = np.unique(pos[:, 0])
    if len(anchors) and int(sizes[anchors].min()) < 1:
        bad = [int(u) for u in anchors if sizes[u] < 1]
        raise ValueError(f'anchors without non-neighbours: {bad[:5]} (item 2: no fallback exists)')
    return Instance(name, n, pos, ptr, flat)


def training_instance(cs, name=None):
    """Item 2: the pairs (u, v) with v in anc(u), in order of (u, v); u the anchor and v the positive, one direction
    only. NN(u) = S minus ({u} | anc(u) | desc(u)), the complement of the registered closure neighbours."""
    n = cs.n
    pairs = [(u, v) for u in range(n) for v in sorted(cs.anc[u])]
    related = [cs.anc[u] | cs.desc[u] for u in range(n)]
    return _instance(name or f'closure-{cs.root}', n, pairs, related)


def shuffled_pairs(n, E, seed, stream=None):
    """Item 9, control 2: one fresh Rng(seed); repeat a = below(n), b = below(n), rejecting a = b and any unordered
    pair already held, until there are E pairs; (a, b) is (anchor, positive), held in order of (a, b)."""
    if E > n * (n - 1) // 2:
        raise ValueError('more pairs than unordered pairs')
    if stream is None:
        from .pystream import PyStream
        stream = PyStream(seed)
    below = stream.rng.below if hasattr(stream, 'rng') else stream.below
    held, pairs = set(), []
    while len(pairs) < E:
        a = below(n)
        b = below(n)
        if a == b:
            continue
        key = (a, b) if a < b else (b, a)
        if key in held:
            continue
        held.add(key)
        pairs.append((a, b))
    return sorted(pairs), stream


def shuffled_instance(n, E, seed, name=None):
    """Item 9, control 2's training instance: the pairs of shuffled_pairs as positives; NN'(a) is every node other
    than a that is paired with a in neither order (the pairs' own relation, with no closure taken)."""
    pairs, _ = shuffled_pairs(n, E, seed)
    related = [set() for _ in range(n)]
    for a, b in pairs:
        related[a].add(b)
        related[b].add(a)
    return _instance(name or f'edge-shuffled-{seed}', n, pairs, related)


# ================================================================ sums and the table
def seqsum(A):
    """Sigma_seq over the last axis: left to right, each term already rounded (explicit adds, or add.accumulate)."""
    k = A.shape[-1]
    if k <= SHORT_AXIS:
        acc = A[..., 0].copy()
        for i in range(1, k):
            acc += A[..., i]
        return acc
    return np.add.accumulate(A, axis=-1)[..., -1]


def sdot(A, B):
    """Sigma_seq of the products A_k * B_k over the last axis (each product rounded, then added left to right)."""
    k = A.shape[-1]
    if k <= SHORT_AXIS:
        acc = A[..., 0] * B[..., 0]
        for i in range(1, k):
            acc += A[..., i] * B[..., i]
        return acc
    return np.add.accumulate(A * B, axis=-1)[..., -1]


def table_bytes(X):
    """Item 6: little-endian float64, row-major, rows in offset order (a Lorentz row with x0 first)."""
    return np.ascontiguousarray(X, dtype='<f8').tobytes()


def table_sha(X):
    return hashlib.sha256(table_bytes(X)).hexdigest()


def init_table(stream, n, d, geometry):
    """Item 3.1: for node i = 0..n-1 and k = 1..d within it, x_ik = (2 random() - 1) 1e-3 (2 random() - 1 is exact,
    so one rounding). Lorentz rows are (x0, x1, ..., xd) with x0 = sqrt(1 + Sigma_seq x_k x_k); Euclidean rows are
    (x1, ..., xd): the same spatial numbers at the same (seed, d)."""
    if geometry not in GEOMETRIES:
        raise ValueError(f'unknown geometry {geometry!r}')
    r = np.asarray(stream.random_many(n * d), dtype=np.float64)
    sp = ((2.0 * r - 1.0) * INIT_RANGE).reshape(n, d)
    if geometry == 'euclid':
        return np.ascontiguousarray(sp)
    X = np.empty((n, d + 1), dtype=np.float64)
    X[:, 1:] = sp
    X[:, 0] = np.sqrt(1.0 + sdot(sp, sp))
    return X


def rate(lr, epoch, burnin=BURNIN):
    """Item 3: eta = lr / 10 (a float64 division) for epochs 0..burnin-1, then lr; lr is the grid string."""
    if not isinstance(lr, str):
        raise TypeError('lr is the grid string, read by float()')
    return float(lr) / 10 if epoch < burnin else float(lr)


def batches(E, batch=BATCH):
    """Item 3: batch b is perm[50 b : 50 b + 50]; the last, shorter batch is kept."""
    return [(b0, min(b0 + batch, E)) for b0 in range(0, E, batch)]


# ================================================================ one batch (item 4)
# The trainer keeps the table coordinate-major, XT = X.T (shape (D, n), C-contiguous), so that every Sigma_seq over
# coordinates is a run of explicit adds of contiguous vectors (sdot0). The layout changes no value: every operation
# is the same IEEE operation on the same operands, coordinate by coordinate and node by node.
@dataclass
class Diag:
    guard_hits: int = 0
    max_step: float = 0.0


def sdot0(A, B):
    """Sigma_seq over axis 0 of the products A[k] * B[k] (each product rounded, then added for k = 0, 1, ...)."""
    acc = A[0] * B[0]
    for k in range(1, A.shape[0]):
        acc += A[k] * B[k]
    return acc


def _softmax_delta(dist, B, loss):
    """dist (B, 51). m = min_j d_j, e_j = exp(m - d_j), S = Sigma_seq e_j, q_j = e_j / S; delta_0 = (1 - q_0) / B
    and delta_j = (-q_j) / B. loss (a view of B floats, or None) receives (d_0 - m) + log S, for the record only."""
    m = dist.min(axis=1)
    e = np.exp(np.ascontiguousarray(m[:, None] - dist))
    S = seqsum(e)
    q = e / S[:, None]
    delta = -q
    delta[:, 0] = 1.0 - q[:, 0]
    delta = delta / float(B)
    if loss is not None:
        loss[:] = (dist[:, 0] - m) + np.log(S)
    return delta


def _accumulate_T(n, U, C, rows):
    """Per-node accumulators. rows (D, B, 51, 2): coordinate k of the anchor's term [..., 0] and of the candidate's
    term [..., 1] of every (row, j). Each (node, coordinate) bin sums its terms from 0 in term order (row, then
    j = 0..50, then the anchor's before the candidate's): np.bincount adds its weights one by one in input order, and
    within one coordinate the weights are in exactly that order. Returns (AT (D, n), the touched nodes ascending)."""
    D, B, K1, _ = rows.shape
    idx = np.empty((B, K1, 2), dtype=np.int64)
    idx[:, :, 0] = U[:, None]
    idx[:, :, 1] = C
    idx = idx.reshape(-1)
    if D <= 4:
        AT = np.empty((D, n), dtype=np.float64)
        for k in range(D):
            AT[k] = np.bincount(idx, weights=rows[k].reshape(-1), minlength=n)
    else:
        bins = (np.arange(D, dtype=np.int64)[:, None] * n + idx[None, :]).reshape(-1)
        AT = np.bincount(bins, weights=rows.reshape(-1), minlength=D * n).reshape(D, n)
    mask = np.zeros(n, dtype=bool)
    mask[idx] = True
    return AT, np.flatnonzero(mask)


def _lorentz_terms_T(XT, U, C, diag, loss=None):
    """Item 4, Lorentz, up to the accumulators: z_j = u0 c0 - Sigma_seq(u_k c_k, k = 1..d); if z > 1, t = z - 1,
    r = sqrt(t (t + 2)), d = log1p(t + r); otherwise d = 0, g = 0 and a guard hit. g = delta_j / r_j; the anchor
    receives g c_j and the candidate g u, in all d + 1 coordinates."""
    D, n = XT.shape
    B, K1 = C.shape
    xu = XT[:, U]                                   # (D, B)
    xc = XT[:, C]                                   # (D, B, 51)
    z = xu[0][:, None] * xc[0] - sdot0(xu[1:, :, None], xc[1:])
    ok = z > 1.0
    t = np.where(ok, z - 1.0, 0.0)
    r = np.sqrt(t * (t + 2.0))
    dist = np.log1p(np.ascontiguousarray(t + r))
    delta = _softmax_delta(dist, B, loss)
    if ok.all():
        g = delta / r
    else:
        diag.guard_hits += int(np.count_nonzero(~ok))
        # READING (item 4, "the term has no gradient"): g = 0 at a guard hit; its terms g c_j and g u are still taken
        # (signed zeros) in term order, so the term's nodes count as met and take their (null) step.
        g = np.where(ok, delta / np.where(ok, r, 1.0), 0.0)
    rows = np.empty((D, B, K1, 2), dtype=np.float64)
    np.multiply(g[None], xc, out=rows[..., 0])
    np.multiply(g[None], xu[:, :, None], out=rows[..., 1])
    return _accumulate_T(n, U, C, rows)


def _lorentz_step_T(XT, AT, touched, eta, diag):
    """Item 4's Lorentz step for every touched node, from the batch-start table: ip = Sigma_seq(x_k A_k) - x0 A0;
    w = eta (A + ip x); nu = Sigma_seq(w_k w_k) - w0 w0, tau = sqrt(max(nu, 0)); if tau > 0,
    x_k <- cosh(tau) x_k + (sinh(tau) / tau) w_k for k >= 1; then x0 <- sqrt(1 + Sigma_seq x_k x_k)."""
    x = XT[:, touched]
    a = AT[:, touched]
    ip = sdot0(x[1:], a[1:]) - x[0] * a[0]
    w = eta * (a + ip * x)
    nu = sdot0(w[1:], w[1:]) - w[0] * w[0]
    tau = np.sqrt(np.maximum(nu, 0.0))
    ch = np.cosh(tau)
    sh = np.sinh(tau)
    xs = ch * x[1:] + (sh / tau) * w[1:]
    pos = tau > 0.0
    if not pos.all():
        xs = np.where(pos, xs, x[1:])
    XT[1:, touched] = xs
    XT[0, touched] = np.sqrt(1.0 + sdot0(xs, xs))
    if len(tau):
        diag.max_step = max(diag.max_step, float(tau.max()))


def _euclid_terms_T(XT, U, C, diag, loss=None):
    """Item 4, Euclidean, up to the accumulators: d_j = Sigma_seq((u_k - c_k)^2), the squared distance;
    g = 2 delta_j and a = g (u - c_j) coordinatewise; the anchor receives a and the candidate -a."""
    D, n = XT.shape
    B, K1 = C.shape
    diff = XT[:, U][:, :, None] - XT[:, C]          # (D, B, 51)
    dist = sdot0(diff, diff)
    delta = _softmax_delta(dist, B, loss)
    g = 2.0 * delta
    rows = np.empty((D, B, K1, 2), dtype=np.float64)
    np.multiply(g[None], diff, out=rows[..., 0])
    np.negative(rows[..., 0], out=rows[..., 1])
    return _accumulate_T(n, U, C, rows)


def _euclid_step_T(XT, AT, touched, eta, diag):
    """Item 4's Euclidean step: x_k <- x_k - eta A_k for every touched node."""
    s = eta * AT[:, touched]
    XT[:, touched] = XT[:, touched] - s
    # READING (item 5, "the norm of eta A"): sqrt(Sigma_seq((eta A_k)^2)), the largest over the run; recorded only
    if s.shape[1]:
        diag.max_step = max(diag.max_step, float(np.sqrt(sdot0(s, s)).max()))


_TERMS = {'lorentz': _lorentz_terms_T, 'euclid': _euclid_terms_T}
_STEPS = {'lorentz': _lorentz_step_T, 'euclid': _euclid_step_T}


def _batch_T(geometry, XT, U, C, eta, diag, loss=None):
    AT, touched = _TERMS[geometry](XT, U, C, diag, loss)
    _STEPS[geometry](XT, AT, touched, eta, diag)


def lorentz_batch(X, U, C, eta, diag, loss=None):
    """One Lorentz batch on a row-major table X (n, d + 1), in place: U the B anchors, C (B, 51) each row's positive
    and 50 negatives. The trainer runs the same code on its coordinate-major table."""
    XT = np.ascontiguousarray(X.T)
    _batch_T('lorentz', XT, np.asarray(U, dtype=np.int64), np.asarray(C, dtype=np.int64), eta, diag, loss)
    X[...] = XT.T


def euclid_batch(X, U, C, eta, diag, loss=None):
    """One Euclidean batch on a row-major table X (n, d), in place."""
    XT = np.ascontiguousarray(X.T)
    _batch_T('euclid', XT, np.asarray(U, dtype=np.int64), np.asarray(C, dtype=np.int64), eta, diag, loss)
    X[...] = XT.T


def accumulators(X, U, C, geometry):
    """(A (n, D) row-major, touched) of one batch on a row-major table, without stepping (tests: the gradient
    against the Decimal oracle)."""
    XT = np.ascontiguousarray(X.T)
    AT, touched = _TERMS[geometry](XT, np.asarray(U, dtype=np.int64), np.asarray(C, dtype=np.int64), Diag())
    return np.ascontiguousarray(AT.T), touched


# ================================================================ one run (items 3-5)
@dataclass
class Run:
    geometry: str
    d: int
    lr: str
    seed: int
    instance: str
    table: object                  # float64[n, d + 1] (Lorentz) or [n, d]; None if diverged
    diverged_epoch: object         # int or None
    guard_hits: int
    max_step: float
    max_radius: float
    epoch_loss: list
    final_state: tuple
    table_sha: object              # str or None
    wall_s: float
    cpu_s: float
    stream: str
    epochs_run: int = 0
    batch_sizes: list = field(default_factory=list)

    def record(self):
        """The run without its table and epoch losses, as JSON-ready values."""
        return {'geometry': self.geometry, 'd': self.d, 'lr': self.lr, 'seed': self.seed, 'instance': self.instance,
                'diverged_epoch': self.diverged_epoch, 'guard_hits': self.guard_hits, 'max_step': self.max_step,
                'max_radius': self.max_radius, 'final_state': list(self.final_state), 'table_sha': self.table_sha,
                'wall_s': self.wall_s, 'cpu_s': self.cpu_s, 'stream': self.stream, 'epochs_run': self.epochs_run}


def _radius_T(XT, geometry):
    """READING (item 5, "the largest distance from the origin"): arcosh of the largest x0 (Euclidean: the largest
    norm) of a table; train() records the largest over the initial table and every finite end-of-epoch table."""
    if geometry == 'lorentz':
        return float(np.arccosh(XT[0].max()))
    return float(np.sqrt(sdot0(XT, XT)).max())


def train(inst, geometry, d, lr, seed, *, epochs=EPOCHS, burnin=BURNIN, batch=BATCH, negs=NEGS, stream_cls=None,
          callback=None):
    """One run: a function of (geometry, d, lr, seed, positives, non-neighbour sets) alone (item 3).

    One stream per run, read in item 3's order and by nothing else: n * d random() for the initial table; then,
    every epoch, shuffle(list(range(E))) of a fresh list and, for each batch in order and each row in batch order, 50
    negatives NN(u)[below(|NN(u)|)] (drawn for the whole epoch in one call after its shuffle: nothing draws between
    batches, so it is the same stream). After every epoch a table with a non-finite entry stops the run (item 5):
    diverged_epoch is set and there is no table. callback(epoch, X), if given, sees a row-major copy of each finished
    finite epoch's table."""
    if geometry not in GEOMETRIES:
        raise ValueError(f'unknown geometry {geometry!r}')
    if stream_cls is None:
        from . import stream as S
        S.compile_kernels()
        stream_cls = S.Stream
    w0, c0 = time.perf_counter(), time.process_time()
    st = stream_cls(seed)
    XT = np.ascontiguousarray(init_table(st, inst.n, d, geometry).T)
    E = inst.E
    anchors_all = np.ascontiguousarray(inst.pos[:, 0])
    positives_all = np.ascontiguousarray(inst.pos[:, 1])
    spans = batches(E, batch)
    terms, step = _TERMS[geometry], _STEPS[geometry]
    diag = Diag()
    losses = np.empty(E, dtype=np.float64)
    epoch_loss = []
    diverged = None
    max_radius = _radius_T(XT, geometry)
    done = 0
    for ep in range(epochs):
        eta = rate(lr, ep, burnin)
        perm = st.shuffle_fresh(E)
        anchors = anchors_all[perm]
        negatives = st.negatives(anchors, negs, inst.nn_ptr, inst.nn_flat)
        cands = np.empty((E, negs + 1), dtype=np.int64)
        cands[:, 0] = positives_all[perm]
        cands[:, 1:] = negatives
        with np.errstate(all='ignore'):
            for b0, b1 in spans:
                AT, touched = terms(XT, anchors[b0:b1], cands[b0:b1], diag, losses[b0:b1])
                step(XT, AT, touched, eta, diag)
            # READING (item 5, "the mean of l over each epoch's rows"): Sigma_seq over the E rows in permutation
            # order of (d_0 - m) + log S, divided by E; recorded only, never fed to the update
            epoch_loss.append(float(seqsum(losses) / E))
        done = ep + 1
        # item 5: the check is on the table after the epoch. READING (item 4, "otherwise"): a NaN z (from a
        # non-finite row, or from inf - inf when the products overflow at a radius near 355) fails z > 1 and is a
        # guard hit like z <= 1; the table is then evaluated as it stands if it is finite
        if not np.isfinite(XT).all():
            diverged = ep
            break
        max_radius = max(max_radius, _radius_T(XT, geometry))
        if callback is not None:
            callback(ep, np.ascontiguousarray(XT.T))
    wall, cpu = time.perf_counter() - w0, time.process_time() - c0
    table = None if diverged is not None else np.ascontiguousarray(XT.T)
    return Run(geometry, d, lr, seed, inst.name, table, diverged, diag.guard_hits, diag.max_step, max_radius,
               epoch_loss, st.state(), None if table is None else table_sha(table), wall, cpu,
               getattr(st, 'name', type(st).__name__), done, [b1 - b0 for b0, b1 in spans])


# ================================================================ the build machine (item 4: recorded per run)
def environment():
    """numpy, numba and libc versions and numpy's SIMD features (numba read from its metadata, not imported)."""
    from importlib import metadata
    try:
        from numpy._core._multiarray_umath import __cpu_dispatch__, __cpu_features__
        feats = sorted(k for k, v in __cpu_features__.items() if v)
        dispatch = list(__cpu_dispatch__)
    except ImportError:                                            # pragma: no cover
        feats, dispatch = None, None
    versions = {}
    for pkg in ('numba', 'llvmlite'):
        try:
            versions[pkg] = metadata.version(pkg)
        except metadata.PackageNotFoundError:                     # pragma: no cover
            versions[pkg] = None
    return {'python': platform.python_version(), 'numpy': np.__version__, **versions,
            'libc': list(platform.libc_ver()), 'platform': platform.platform(),
            'numpy_cpu_features': feats, 'numpy_cpu_dispatch': dispatch}


def engine_string():
    env = environment()
    return f"python-{env['python']}/numpy-{env['numpy']}/numba-{env['numba']}"


# ================================================================ Stage 2: L14's training additions (A13.10)
# Added for Stage 2; nothing above is changed and train() is used as it stands. A13.10 trains A10's protocol on
# WordNet's direct noun '@' edges: U_@ in offset order (n = 74,401) and its E = 75,850 (child, parent) pairs. The
# explicit non-neighbour table of nonneighbour_csr would hold about 44 GB there, so NN(u) is read through an implicit
# map (A13.10.2) and drawn by lexicon.stream.ImplicitStream, whose draws are A10.3's, call for call:
#
#     ImplicitMap(n, r_ptr, shift), ImplicitMap.from_related(n, related)
#             R(u) = sorted({u} | related[u]); shift_i = R(u)_i - i; NN(u)[j] = j + #{i : shift_i <= j}
#     implicit_instance(name, n, pairs, related) -> (Instance, ImplicitMap)    _instance's implicit counterpart
#     direct_graph(wn, pos), direct_instance(wn, pos='noun') -> (Instance, ImplicitMap, offsets)
#             A13.10.1 (U_@ and E); pos='verb' gives A13.13's dry graph
#     shuffled_implicit_instance(n, E, seed) -> (Instance, ImplicitMap)         A13.10.6's edge-shuffled instance
#     train_implicit(inst, imap, geometry, d, lr, seed, ...)                     train() with ImplicitStream(seed, imap)
#     floor_table_snapped(seed, n, d, geometry) -> (X, N)                        A13.10.6's floors, snapped
#     loss_mean(epoch_loss, a, b), converged(epoch_loss)                         A13.10.7
#     drop_epoch(epoch_loss)                                                     A13.11's reported 95% epoch
#
# Seeds are parameters everywhere: the registered values (training 0-4, tuning 9000-9011, edge pairs and floors
# 2600 + s, and the dry run's +3000) are passed only by the step that draws them (A13.12); tests pass 95200 + i.
# An Instance returned here carries placeholders, not a table: nn_ptr = zeros(n + 1) and nn_flat = zeros(0), so every
# anchor has |NN(u)| = 0 through them and any explicit draw (Stream.negatives, PyStream.negatives, replay_states with
# inst.nn_sizes()) raises before it draws, instead of reading out of bounds. Sizes come from the map: imap.sizes().
# (The build spec, section 10, says "zero-length" placeholders; numba's _negatives does not check bounds, so a
# zero-length nn_ptr would let a run started without ImplicitStream read memory it does not own.)
STAGE2_N, STAGE2_E = 74401, 75850                  # A13 notation and item 9: U_@ and its direct edges E
# A13.12's L14 seeds, as constants only: a function takes the seed as a parameter, and only the step that uses a
# registered value passes it (tests check these values and draw 95200 + i)
L14_SEEDS = {
    'registered': {'training': (0, 1, 2, 3, 4), 'tuning': tuple(range(9000, 9012)), 'edge_floor_base': 2600},
    'dry': {'training': (3000, 3001, 3002, 3003, 3004), 'tuning': tuple(range(12000, 12012)), 'edge_floor_base': 5600},
}
CONVERGENCE_WINDOWS = ((0, 9), (890, 899), (990, 999))     # A13.10.7: m(0, 9), m(890, 899), m(990, 999)
DROP_SHARE = 0.95                                  # A13.11: the epoch at which a run reaches 95% of its loss drop


class ImplicitMap:
    """A13.10.2's implicit non-neighbour map over the nodes 0..n-1.

    r_ptr  int64[n + 1], r_ptr[0] = 0: node u's segment is shift[r_ptr[u]:r_ptr[u + 1]], one entry per element of R(u)
    shift  int64[sum |R(u)|]: shift_i = R(u)_i - i for R(u) strictly increasing, so each segment is non-decreasing

    NN(u) is range(n) minus R(u), ascending: size(u) = n - |R(u)|, and NN(u)[j] = j + #{i : shift_i <= j} (one binary
    search), for 0 <= j < size(u). from_related puts u into R(u), so NN(u) never holds u. explicit(u) materialises
    NN(u) for tests; nothing in training does."""

    def __init__(self, n, r_ptr, shift):
        n = int(n)
        r_ptr = np.ascontiguousarray(r_ptr, dtype=np.int64)
        shift = np.ascontiguousarray(shift, dtype=np.int64)
        if n < 1 or r_ptr.shape != (n + 1,) or shift.ndim != 1:
            raise ValueError('an implicit map needs n >= 1, r_ptr of n + 1 entries and a flat shift array')
        lengths = np.diff(r_ptr)
        if int(r_ptr[0]) != 0 or int(r_ptr[-1]) != shift.shape[0] or (lengths < 0).any():
            raise ValueError('r_ptr must run from 0 to len(shift) without decreasing')
        rel = self._related_flat(r_ptr, shift, lengths)
        if rel.size and (int(rel.min()) < 0 or int(rel.max()) >= n):
            raise ValueError('R(u) must lie in 0..n-1')
        seg = np.repeat(np.arange(n, dtype=np.int64), lengths)
        same = seg[1:] == seg[:-1]
        if (rel[1:][same] <= rel[:-1][same]).any():
            raise ValueError('each R(u) must be strictly increasing (each shift segment non-decreasing)')
        self.n, self.r_ptr, self.shift = n, r_ptr, shift

    @staticmethod
    def _related_flat(r_ptr, shift, lengths):
        """R(u)_i = shift_i + i, segment by segment, as one flat array."""
        start = np.repeat(r_ptr[:-1], lengths)
        return shift + (np.arange(shift.shape[0], dtype=np.int64) - start)

    @classmethod
    def from_related(cls, n, related):
        """R(u) = sorted({u} | related[u]) for u = 0..n-1 (related[u]: any iterable of node indices)."""
        n = int(n)
        if len(related) != n:
            raise ValueError('related needs one entry per node')
        r_ptr = np.zeros(n + 1, dtype=np.int64)
        flat = []
        for u in range(n):
            r = sorted({u}.union(int(x) for x in related[u]))
            if r[0] < 0 or r[-1] >= n:
                raise ValueError(f'R({u}) leaves 0..{n - 1}')
            flat.extend(x - i for i, x in enumerate(r))
            r_ptr[u + 1] = r_ptr[u] + len(r)
        return cls(n, r_ptr, np.array(flat, dtype=np.int64))

    @property
    def entries(self):
        """The stored entries: n + 1 pointers and sum |R(u)| shifts (A13.16: n + 2E shifts for a direct-edge map)."""
        return self.r_ptr.shape[0] + self.shift.shape[0]

    @property
    def nbytes(self):
        return self.r_ptr.nbytes + self.shift.nbytes

    def segment(self, u):
        return self.shift[self.r_ptr[u]:self.r_ptr[u + 1]]

    def related(self, u):
        """R(u), ascending."""
        seg = self.segment(u)
        return seg + np.arange(seg.shape[0], dtype=np.int64)

    def size(self, u):
        """|NN(u)| = n - |R(u)|."""
        return self.n - int(self.r_ptr[u + 1] - self.r_ptr[u])

    def sizes(self):
        """|NN(u)| for every node, int64[n]: the nn_sizes of pystream.replay_states."""
        return self.n - np.diff(self.r_ptr)

    def nn(self, u, j):
        """NN(u)[j] = j + #{i : shift_i <= j} (j an int or an int array, each 0 <= j < size(u))."""
        jj = np.asarray(j, dtype=np.int64)
        if jj.size and (int(jj.min()) < 0 or int(jj.max()) >= self.size(u)):
            raise IndexError(f'NN({u}) has {self.size(u)} entries')
        out = jj + np.searchsorted(self.segment(u), jj, side='right')
        return int(out) if out.ndim == 0 else out

    def explicit(self, u):
        """NN(u) materialised (tests): every node not in R(u), ascending, int64."""
        keep = np.ones(self.n, dtype=bool)
        keep[self.related(u)] = False
        return np.flatnonzero(keep).astype(np.int64)


def implicit_instance(name, n, pairs, related):
    """_instance's implicit counterpart: positives = pairs sorted by (anchor, positive), as int64[E, 2]; NN(u) = every
    node but those in {u} | related[u], through an ImplicitMap; every anchor must have |NN(u)| >= 1 (A10.2: no
    fallback exists). Returns (Instance with the placeholders described above, ImplicitMap)."""
    n = int(n)
    pos = np.array(sorted((int(a), int(b)) for a, b in pairs), dtype=np.int64).reshape(-1, 2)
    if pos.size and (int(pos.min()) < 0 or int(pos.max()) >= n):
        raise ValueError(f'a pair leaves 0..{n - 1}')
    imap = ImplicitMap.from_related(n, related)
    anchors = np.unique(pos[:, 0])
    sizes = imap.sizes()
    if len(anchors) and int(sizes[anchors].min()) < 1:
        bad = [int(u) for u in anchors if sizes[u] < 1]
        raise ValueError(f'anchors without non-neighbours: {bad[:5]} (item 2: no fallback exists)')
    inst = Instance(name, n, pos, np.zeros(n + 1, dtype=np.int64), np.zeros(0, dtype=np.int64))
    return inst, imap


def direct_graph(wn, pos='noun'):
    """The '@' graph of one part of speech: (offsets, edges). offsets are the synsets incident to an '@' pointer (both
    ends), sorted (offset order); edges are the distinct (child, parent) offset pairs of every '@' pointer, sorted.
    '@i' (instance hypernym) is not '@' (A13 notation: the hypernym graph without instance links). An '@' pointer
    whose target is not a synset of the same part of speech is refused."""
    syn = wn['synsets'][pos]
    edges = set()
    for o, s in syn.items():
        for sym, p, _ in s.ptrs:
            if sym == '@':
                if p not in syn:
                    raise ValueError(f'{pos} {o}: an @ pointer to {p}, outside {pos}')
                edges.add((o, p))
    edges = sorted(edges)
    offsets = sorted({x for e in edges for x in e})
    return offsets, edges


def direct_instance(wn, pos='noun', name=None):
    """A13.10.1: S = U_@ in offset order (n = 74,401 for nouns); the positives are E's (child index, parent index)
    pairs in that order (75,850; the child is the anchor); NN(u) = S minus ({u} | parents(u) | children(u)), the
    training relation's complement with no closure taken, through ImplicitMap. pos='verb' gives A13.13's dry graph
    (13,542 nodes, 13,239 edges; the isolated verbs are not in it). Returns (Instance, ImplicitMap, offsets)."""
    offsets, edges = direct_graph(wn, pos)
    index = {o: i for i, o in enumerate(offsets)}
    n = len(offsets)
    pairs = [(index[c], index[p]) for c, p in edges]
    related = [set() for _ in range(n)]
    for c, p in pairs:
        related[c].add(p)
        related[p].add(c)
    # READING (A13.10.1 names no training-instance label): 'wordnet30-<pos>-at-direct', recorded as Run.instance only;
    # the instance itself is named by the SHA-256 of its offsets (offsets_sha), U_@'s 9af5a81a... for nouns (A13.9)
    inst, imap = implicit_instance(name or f'wordnet30-{pos}-at-direct', n, pairs, related)
    return inst, imap, tuple(offsets)


def shuffled_implicit_instance(n, E, seed, name=None):
    """A13.10.6's edge-shuffled instance: the pairs of l6.edge_pairs_seed(seed, n, E) (A10.9's rule from one fresh
    Rng(seed): a = below(n), b = below(n), rejecting a = b and any unordered pair already held, until E pairs; held in
    order of (a, b)) as positives, and NN'(a) = every node other than a paired with a in neither order (R(a) = {a} |
    partners(a)), through ImplicitMap. The registered seed is 2600 + s (dry 5600 + s); the training draws then come
    from ImplicitStream(s, imap). Returns (Instance, ImplicitMap)."""
    from . import l6
    pairs = l6.edge_pairs_seed(seed, n, E)
    partners = [set() for _ in range(int(n))]
    for a, b in pairs:
        partners[a].add(b)
        partners[b].add(a)
    return implicit_instance(name or f'edge-shuffled-{seed}', n, pairs, partners)


def train_implicit(inst, imap, geometry, d, lr, seed, **kwargs):
    """train(inst, geometry, d, lr, seed, stream_cls=lambda s: ImplicitStream(s, imap), ...), unchanged: the run reads
    one ImplicitStream(seed, imap) in item 3's order. The kernels are compiled first, so the run's clocks exclude it."""
    if 'stream_cls' in kwargs:
        raise TypeError('train_implicit sets stream_cls itself')
    if imap.n != inst.n:
        raise ValueError(f'the map has {imap.n} nodes, the instance {inst.n}')
    from . import stream as S
    S.compile_implicit_kernels()
    return train(inst, geometry, d, lr, seed, stream_cls=lambda s: S.ImplicitStream(s, imap), **kwargs)


def floor_table_snapped(seed, n, d, geometry):
    """A13.10.6's floor: the initial table of item 3 from a fresh Rng(seed) (l6.floor_table: Rng's own random(),
    node-major, Lorentz x0 = sqrt(1 + Sigma_seq x_k^2)), left untrained, and its dyadic integers (learned.snap at
    2^-32). The registered seed is 2600 + i (dry 5600 + i). Returns (X, N)."""
    from . import l6
    from . import learned
    X = l6.floor_table(seed, n, d, geometry)
    return X, learned.snap(X, geometry)


def loss_mean(epoch_loss, a, b):
    """A13.10.7's m(a, b): the mean of the recorded epoch losses (A10.5) of epochs a..b, both included, in float64.
    READING (A13.10.7, "the mean ... in float64"; the build spec fixes "numpy float64 mean of the slice"): numpy's
    float64 mean, which for a float64 vector is np.add.reduce (numpy's pairwise sum) and one division by the count;
    it is written so here because this module's code names no .mean (tests/test_embed.py's scan), and
    tests/test_stage2_train.py checks it equal to np.mean bit for bit. This is a decision on the record, not the
    trainer's arithmetic, which keeps its sequential sums."""
    x = np.asarray(epoch_loss, dtype=np.float64)
    if x.ndim != 1 or not 0 <= a <= b or b >= x.shape[0]:
        raise ValueError(f'epochs {a}..{b} of {x.shape[0]} recorded')
    w = np.ascontiguousarray(x[a:b + 1])
    return float(np.add.reduce(w) / w.shape[0])


def converged(epoch_loss):
    """A13.10.7: a run has converged iff m(0, 9) - m(990, 999) > 0 and
    m(890, 899) - m(990, 999) <= (m(0, 9) - m(990, 999)) / 100, in float64 (m: loss_mean).
    It reads the losses only; whether the run diverged (no table) is decided apart (A10.5), and both conditions are
    needed where A13 asks for both. READING (A13.10.7, the windows name epochs 0-999): a run that recorded fewer than
    1,000 epochs (a diverged run stops early) has no m(990, 999) and has not converged; more than 1,000 is not this
    protocol's run and is refused."""
    x = np.asarray(epoch_loss, dtype=np.float64)
    if x.ndim != 1 or x.shape[0] > EPOCHS:
        raise ValueError(f'{x.shape[0]} epoch losses: the protocol records {EPOCHS}')
    if x.shape[0] < EPOCHS:
        return False
    (a0, b0), (a1, b1), (a2, b2) = CONVERGENCE_WINDOWS
    first, late, last = loss_mean(x, a0, b0), loss_mean(x, a1, b1), loss_mean(x, a2, b2)
    drop = first - last
    return bool(drop > 0.0 and late - last <= drop / 100)


def drop_epoch(epoch_loss, share=DROP_SHARE):
    """A13.11's reported diagnostic: the first epoch e at which the run has reached `share` (95%) of its loss drop.
    READING (A13.11, "the epoch at which each run reaches 95% of its loss drop"; A13.10.7 names the drop): with
    drop = m(0, 9) - m(990, 999), the first e with m(0, 9) - loss[e] >= share * drop, in float64; None when the run
    recorded fewer than 1,000 epochs or drop <= 0 (no drop to reach). Reported only; it decides nothing."""
    x = np.asarray(epoch_loss, dtype=np.float64)
    if x.ndim != 1 or x.shape[0] > EPOCHS:
        raise ValueError(f'{x.shape[0]} epoch losses: the protocol records {EPOCHS}')
    if x.shape[0] < EPOCHS:
        return None
    (a0, b0), _, (a2, b2) = CONVERGENCE_WINDOWS
    first = loss_mean(x, a0, b0)
    drop = first - loss_mean(x, a2, b2)
    if not drop > 0.0:
        return None
    target = share * drop
    hit = np.flatnonzero(first - x >= target)
    return int(hit[0]) if hit.size else None
