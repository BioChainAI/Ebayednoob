#!/usr/bin/env python3
"""Hyperbolic Lexicon, Phase 0, spike S3, the Python half: an independent recomputation of the verb forest's and the
canon tree's L3 words, exact H^3 points and exact-tree graph-edge and closure MAP, with exact integers and Fractions.

WHAT IT MEASURES. Nothing that s3_wordnet_shape.cjs does not; it recomputes, from the raw inputs and without any of
the JS code, the values that the Node script compares (section 5 of its output):
  - the WordNet 3.0 verb forest: data.verb read from the SHA-256-pinned nltk_data archive with zipfile; the spanning
    parent is the first '@' or '@i' pointer of the data line; children ordered by synset offset; a virtual root at
    the word [1] whose children are the 559 verb roots in offset order;
  - Owl Academy's canon tree from canon/canon.manifest.json: canon root (word [0]) > dept > artifact > tome, children
    by globalIndex (a dept or artifact by the smallest globalIndex of its tomes);
  - words by the L3 rule: child k of a node with c children gets m = max(1, ceil(log5 c)) letters, the m base-5
    digits of k, most significant first, each choosing hpstep.problems.children(current word)[digit];
  - exact points as integer frame products: hpstep.decode3d.TreeEmbedding3D's exact step matrices (t = 3/4) times 7
    are integer matrices, so a word of length n has an integer frame over 7^n, built from its parent's frame. The
    points are checked against hpstep's own point_exact (Fractions) on 64 nodes drawn by Rng(90003).sample(N, 64)
    plus the deepest nodes;
  - ranking: every point is scaled to 7^Lmax (Lmax = the maximum word length); the key of candidate v for query u
    is x0 y0 - x1 y1 - x2 y2 - x3 y3 = cosh d(u,v) * 7^(2 Lmax), an integer; smaller = nearer. The keys of one query
    are sorted (the query's own key, cosh 0, is the unique minimum and is not a candidate) and each neighbour key is
    located by bisection;
  - AP with pessimistic ties (inside a group of equal keys every non-neighbour ranks before every neighbour), as a
    Fraction; MAP = the exact mean. Queries: every real node with a graph-edge neighbour (spanning parent unless it
    is the virtual root, plus children); candidates: every other real node. Closure neighbours: all ancestors and
    descendants through every '@' / '@i' pointer (for the canon tree, its own ancestors and descendants).
  - the MAP of the query samples Rng(90000).sample(nQ, 2000) and Rng(90001).sample(nQ, 1000).
It prints "key = value" lines (SHA-256 of canonical strings, exact-rational digests, truncated decimals) that the
Node script parses and compares with its own; the canonical strings are "offset word\\n", "offset x0,x1,x2,x3\\n"
(integers over 7^n), "offset n/d\\n" per query AP, and "n/d" for a MAP, the same in both scripts.

HOW TO RUN. s3_wordnet_shape.cjs starts it as  python3 -B -I s3_wordnet_shape.py <Owl-Academy path>  and embeds its
output. It also runs alone, from anywhere:
  python3 -B -I "Pages/Hyperbolic Lexicon/spikes/s3_wordnet_shape.py" [path of an Owl-Academy checkout]
-B -I: no bytecode is written and nothing from the environment is imported; hpstep is imported in place from
Pages/Hyperbolic Oracles/reference through an explicit sys.path entry (it needs numpy). The WordNet archive is read
from $HL_CACHE or ~/.cache/hyperbolic-lexicon/wordnet.zip and its SHA-256 is checked against wordnet_v1.meta.json.
Lines that begin with "~ " depend on the machine or the runtime and are ignored on reruns.

WHAT IT SETTLES. That the verb graph-edge MAP behind L6(c)'s prediction rule, and the other S3 MAP values, are
reproduced exactly (equal reduced rationals) by an independent implementation. It decides no claim.

DATA AND SEEDS. WordNet 3.0 verbs and the Owl canon tree only; nouns are not read. hpstep.prng.Rng only:
Rng(90003) for the point_exact check sample, Rng(90000) and Rng(90001) for the query samples.

RUNTIME. About 70 s on the build machine (Python 3.13.18), almost all of it the ranking of 13,542 verb queries
against 13,766 candidates (about 5 ms per query).
"""
import bisect
import hashlib
import json
import os
import sys
import time
import zipfile
from collections import Counter
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HERE, '..', '..', 'Hyperbolic Oracles', 'reference')))
from hpstep.prng import Rng                                          # noqa: E402
from hpstep.problems import children, is_reduced                     # noqa: E402
from hpstep.decode3d import TreeEmbedding3D, slot_direction          # noqa: E402

sys.set_int_max_str_digits(0)          # the exact MAP rationals have thousands of digits
T0 = time.perf_counter()
OWL = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', '..', '..', 'Owl-Academy'))
META = json.load(open(os.path.join(HERE, '..', 'reference', 'golden', 'wordnet_v1.meta.json'), encoding='utf-8'))
CACHE = os.environ.get('HL_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'hyperbolic-lexicon')


def out(s=''):
    print(s, flush=True)


def sha(s):
    return hashlib.sha256(s.encode() if isinstance(s, str) else s).hexdigest()


def letters_for(c):
    """max(1, ceil(log5 c)) in integers: the least m with 5^m >= c, at least 1."""
    m, p = 0, 1
    while p < c:
        p *= 5
        m += 1
    return max(1, m)


def child_word(parent_word, k, c):
    m = letters_for(c)
    digits = []
    x = k
    for _ in range(m):
        digits.append(x % 5)
        x //= 5
    assert x == 0
    w = list(parent_word)
    for d in reversed(digits):
        w.append(children(w)[d])
    return w


def trunc16(q):
    s = 10 ** 16
    x = q.numerator * s // q.denominator
    return f'{x // s}.{x % s:016d}'


def qsha(q):
    return sha(f'{q.numerator}/{q.denominator}')


def mean(values):
    c = Counter(values)
    return sum((v * n for v, n in c.items()), Fraction(0)) / len(values)


# ---------------------------------------------------------------- exact points as integer frames
EMB = TreeEmbedding3D()                                   # t = 3/4
STEP7 = []
for M in EMB.step_q:
    rows = []
    for row in M:
        r = []
        for x in row:
            y = Fraction(x) * 7
            assert y.denominator == 1
            r.append(int(y))
        rows.append(r)
    STEP7.append(rows)


def imul(A, B):
    return [[A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j] + A[i][3] * B[3][j] for j in range(4)] for i in range(4)]


def extend_frame(F, from_word, word):
    for i in range(len(from_word), len(word)):
        F = imul(F, STEP7[slot_direction(word[:i], word[i])])
    return F


I4 = [[int(i == j) for j in range(4)] for i in range(4)]


class Tree:
    """nodes in a fixed order: ids, words, parent index (-1 at the top), children indices, depth."""

    def __init__(self):
        self.ids, self.words, self.parent, self.kids, self.depth = [], [], [], [], []

    def add(self, nid, word, parent, depth):
        self.ids.append(nid)
        self.words.append(word)
        self.parent.append(parent)
        self.kids.append([])
        self.depth.append(depth)
        if parent >= 0:
            self.kids[parent].append(len(self.ids) - 1)
        return len(self.ids) - 1


def points(tree, base_word):
    """integer frames, each extending its parent's (memoised: a parent may come after its child in the node order)"""
    base = extend_frame(I4, [], base_word)
    frames = [None] * len(tree.words)

    def frame(i):
        if frames[i] is None:
            p, w = tree.parent[i], tree.words[i]
            frames[i] = extend_frame(frame(p), tree.words[p], w) if p >= 0 else extend_frame(base, base_word, w)
        return frames[i]

    return [[frame(i)[r][0] for r in range(4)] for i in range(len(tree.words))]


def check_points(tree, ints, idx):
    for i in idx:
        n = len(tree.words[i])
        pe = EMB.point_exact(tree.words[i])
        assert [Fraction(x) for x in pe] == [Fraction(v, 7 ** n) for v in ints[i]], tree.ids[i]


def rank_all(tree, ints, queries, nbr_sets):
    """per neighbour set, the AP (Fraction) of every query, ties pessimistic"""
    L = max(len(w) for w in tree.words)
    Z = [tuple(v * 7 ** (L - len(tree.words[i])) for v in ints[i]) for i in range(len(ints))]
    res = [[] for _ in nbr_sets]
    for u in queries:
        a0, a1, a2, a3 = Z[u]
        keys = [a0 * x0 - a1 * x1 - a2 * x2 - a3 * x3 for (x0, x1, x2, x3) in Z]
        S = sorted(keys)
        ku = keys[u]
        assert S[0] == ku and S[1] > ku          # the query itself: cosh 0, the unique minimum
        for si, nb in enumerate(nbr_sets):
            cnt = Counter(keys[v] for v in nb[u])
            total, before = Fraction(0), 0
            for K in sorted(cnt):
                g = cnt[K]
                lo, hi = bisect.bisect_left(S, K), bisect.bisect_right(S, K)
                less, e_non = lo - 1, (hi - lo) - g     # lo - 1: the query's own key is below K
                for i in range(1, g + 1):
                    total += Fraction(before + i, less + e_non + i)
                before += g
            res[si].append(total / len(nb[u]))
    return res


def ap_sha(ids, aps):
    return sha(''.join(f'{i} {q.numerator}/{q.denominator}\n' for i, q in zip(ids, aps)))


def words_sha(ids, words):
    return sha(''.join(f'{i} ' + ''.join(map(str, w)) + '\n' for i, w in zip(ids, words)))


def points_sha(ids, ints):
    return sha(''.join(f'{i} ' + ','.join(map(str, v)) + '\n' for i, v in zip(ids, ints)))


def main():
    out('S3 python: independent recomputation of the verb forest and the canon tree (hpstep exact frames, int keys, Fractions)')
    out(f'~ python {sys.version.split()[0]}, numpy {sys.modules["numpy"].__version__ if "numpy" in sys.modules else "-"}')
    # ---------------------------------------------------------------- WordNet verbs
    zpath = os.path.join(CACHE, 'wordnet.zip')
    raw = open(zpath, 'rb').read()
    assert sha(raw) == META['source']['sha256'] and len(raw) == META['source']['bytes'], 'pinned WordNet archive'
    with zipfile.ZipFile(zpath) as z:
        data = z.read('wordnet/data.verb')
    out(f'wordnet.zip sha256 {sha(raw)} (pinned: yes); data.verb sha256 {sha(data)}')
    syn = {}
    for line in data.decode('latin-1').split('\n'):
        if not line or line.startswith('  '):
            continue
        bar = line.find(' | ')
        head = (line if bar < 0 else line[:bar]).strip().split(' ')
        off, w_cnt = head[0], int(head[3], 16)
        i = 4 + 2 * w_cnt
        p_cnt = int(head[i])
        i += 1
        ptrs = [(head[i + 4 * k], head[i + 4 * k + 1]) for k in range(p_cnt)]
        syn[off] = ptrs
    offs = sorted(syn)
    parent_off = {}
    for o in offs:
        first = next((t for s, t in syn[o] if s in ('@', '@i')), None)
        parent_off[o] = first
    kids_off = {o: [] for o in offs}
    roots = []
    for o in offs:
        if parent_off[o] is None:
            roots.append(o)
        else:
            kids_off[parent_off[o]].append(o)          # offs is sorted, so each list is in offset order
    # words, depth-first from the virtual root [1]
    word_of, depth_of = {}, {}
    stack = [(o, child_word([1], k, len(roots)), 0) for k, o in enumerate(roots)][::-1]
    while stack:
        o, w, d = stack.pop()
        word_of[o], depth_of[o] = w, d
        ks = kids_off[o]
        for k in range(len(ks) - 1, -1, -1):
            stack.append((ks[k], child_word(w, k, len(ks)), d + 1))
    assert len(word_of) == len(offs)
    tree = Tree()
    index = {o: i for i, o in enumerate(offs)}
    for o in offs:
        tree.ids.append(o)
        tree.words.append(word_of[o])
        tree.parent.append(index[parent_off[o]] if parent_off[o] is not None else -1)
        tree.kids.append([index[c] for c in kids_off[o]])
        tree.depth.append(depth_of[o])
    N = len(offs)
    assert len({tuple(w) for w in tree.words}) == N and all(is_reduced(w) for w in tree.words)
    lmax = max(len(w) for w in tree.words)
    out(f'verb forest: {N} synsets, {len(roots)} roots, {sum(1 for k in tree.kids if k)} internal; virtual root [1], {letters_for(len(roots))} letters per root; max word length {lmax}')
    out(f'verb.synsets = {N}')
    out(f'verb.roots = {len(roots)}')
    out(f'verb.maxlen = {lmax}')
    out(f'verb.words.sha256 = {words_sha(offs, tree.words)}')
    t = time.perf_counter()
    ints = points(tree, [1])
    t_pts = time.perf_counter() - t
    deepest = [i for i, w in enumerate(tree.words) if len(w) == lmax]
    sample = sorted(set(Rng(90003).sample(N, 64)) | set(deepest))
    t = time.perf_counter()
    check_points(tree, ints, sample)
    t_chk = time.perf_counter() - t
    out(f'points: integer frame products on all {N} nodes; equal to hpstep point_exact on {len(sample)} nodes (Rng(90003).sample({N}, 64) and the {len(deepest)} deepest)')
    out(f'verb.points.sha256 = {points_sha(offs, ints)}')
    out(f'~ points: {t_pts * 1000:.0f} ms for {N} integer frames; point_exact check {t_chk * 1000:.0f} ms for {len(sample)} nodes')
    # neighbours and queries
    g_nb = [([tree.parent[v]] if tree.parent[v] >= 0 else []) + tree.kids[v] for v in range(N)]
    anc_memo = {}

    def ancestors(o):
        if o not in anc_memo:
            s = set()
            for sym, tgt in syn[o]:
                if sym in ('@', '@i'):
                    s.add(tgt)
                    s |= ancestors(tgt)
            anc_memo[o] = s
        return anc_memo[o]

    anc = [sorted(index[a] for a in ancestors(o)) for o in offs]
    desc = [[] for _ in range(N)]
    for v in range(N):
        for a in anc[v]:
            desc[a].append(v)
    c_nb = [sorted(anc[v] + desc[v]) for v in range(N)]
    queries = [v for v in range(N) if g_nb[v]]
    out(f'queries: {len(queries)} (every verb with a graph-edge neighbour), {N - 1} candidates each; closure pairs {sum(len(a) for a in anc)}')
    out(f'verb.queries = {len(queries)}')
    t = time.perf_counter()
    ap_g, ap_c = rank_all(tree, ints, queries, [g_nb, c_nb])
    t_rank = time.perf_counter() - t
    map_g, map_c = mean(ap_g), mean(ap_c)
    qids = [offs[u] for u in queries]
    out(f'verb graph-edge MAP = {trunc16(map_g)} (truncated; exactly a {len(str(map_g.numerator))}-digit / {len(str(map_g.denominator))}-digit rational)')
    out(f'verb.graph.ap.sha256 = {ap_sha(qids, ap_g)}')
    out(f'verb.graph.map.sha256 = {qsha(map_g)}')
    out(f'verb.graph.map.trunc16 = {trunc16(map_g)}')
    out(f'verb closure MAP = {trunc16(map_c)} (truncated; exactly a {len(str(map_c.numerator))}-digit / {len(str(map_c.denominator))}-digit rational)')
    out(f'verb.closure.ap.sha256 = {ap_sha(qids, ap_c)}')
    out(f'verb.closure.map.sha256 = {qsha(map_c)}')
    out(f'verb.closure.map.trunc16 = {trunc16(map_c)}')
    nq = len(queries)
    m2000 = mean([ap_g[i] for i in Rng(90000).sample(nq, 2000)])
    m1000 = mean([ap_g[i] for i in Rng(90001).sample(nq, 1000)])
    out(f'query samples, graph-edge MAP: Rng(90000) 2000 queries {trunc16(m2000)}, Rng(90001) 1000 queries {trunc16(m1000)}')
    out(f'verb.graph.sample2000.sha256 = {qsha(m2000)}')
    out(f'verb.graph.sample1000.sha256 = {qsha(m1000)}')
    out(f'~ ranking: {t_rank:.1f} s for {nq} queries x {N - 1} candidates ({t_rank / nq * 1000:.2f} ms per query, both MAPs)')

    # ---------------------------------------------------------------- the canon tree
    canon_path = os.path.join(OWL, 'canon', 'canon.manifest.json')
    craw = open(canon_path, 'rb').read()
    canon = json.loads(craw.decode('utf-8'))
    out(f'canon.manifest.json sha256 {sha(craw)}; {len(canon["tomes"])} tomes')
    tomes = sorted(canon['tomes'], key=lambda t: t['globalIndex'])
    first = {}
    for t in tomes:
        first.setdefault(('d', t['dept']), t['globalIndex'])
        first.setdefault(('a', t['artifact']), t['globalIndex'])
    depts = sorted({t['dept'] for t in tomes}, key=lambda d: first[('d', d)])
    ct = Tree()
    root = ct.add('canon', [0], -1, 0)

    # preorder: build recursively so that the node order is root, dept I, its artifacts and tomes, dept II, ...
    def build(parent, nid):
        if nid == 'canon':
            kids = ['dept-' + d for d in depts]
        elif nid.startswith('dept-') and '/' not in nid:
            d = nid[5:]
            kids = sorted({t['artifact'] for t in tomes if t['dept'] == d}, key=lambda a: first[('a', a)])
        elif nid.startswith('artifact-'):
            kids = [t['canonId'] for t in tomes if t['artifact'] == nid]
        else:
            kids = []
        for k, kid in enumerate(kids):
            j = ct.add(kid, child_word(ct.words[parent], k, len(kids)), parent, ct.depth[parent] + 1)
            build(j, kid)

    build(root, 'canon')
    CN = len(ct.ids)
    out(f'canon tree: {CN} nodes (root [0] > {len(depts)} depts > artifacts > tomes), max word length {max(len(w) for w in ct.words)}')
    out(f'canon.nodes = {CN}')
    out(f'canon.words.sha256 = {words_sha(ct.ids, ct.words)}')
    cints = points(ct, [])
    check_points(ct, cints, range(CN))
    out(f'canon.points.sha256 = {points_sha(ct.ids, cints)}')
    cg = [([ct.parent[v]] if ct.parent[v] >= 0 else []) + ct.kids[v] for v in range(CN)]
    canc = []
    for v in range(CN):
        a, p = [], ct.parent[v]
        while p >= 0:
            a.append(p)
            p = ct.parent[p]
        canc.append(a)
    cdesc = [[] for _ in range(CN)]
    for v in range(CN):
        for a in canc[v]:
            cdesc[a].append(v)
    ccl = [sorted(canc[v] + cdesc[v]) for v in range(CN)]
    cq = [v for v in range(CN) if cg[v]]
    cap_g, cap_c = rank_all(ct, cints, cq, [cg, ccl])
    cmg, cmc = mean(cap_g), mean(cap_c)
    cids = [ct.ids[v] for v in cq]
    out(f'canon graph-edge MAP = {trunc16(cmg)}, closure MAP = {trunc16(cmc)} (truncated), over {len(cq)} queries')
    out(f'canon.graph.ap.sha256 = {ap_sha(cids, cap_g)}')
    out(f'canon.graph.map.sha256 = {qsha(cmg)}')
    out(f'canon.closure.ap.sha256 = {ap_sha(cids, cap_c)}')
    out(f'canon.closure.map.sha256 = {qsha(cmc)}')
    out(f'~ python total {time.perf_counter() - T0:.1f} s')


if __name__ == '__main__':
    main()
