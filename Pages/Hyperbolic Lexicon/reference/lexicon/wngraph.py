"""Stage 2 (Amendment 13, items 4 and 5; build spec section 5): WordNet's own graph read with no geometry, the WN arm
of L12(d), and its reported variants (WN-U, ST, the letter tree, WN-LCh).

WN. Parents are `@` and `@i` (lexicon.wordnet.closure_parents). A(x) = {x} and x's closure ancestors; up(x, a) is the
fewest upward edges from x to a in A(x), found by one breadth-first search upward per sense, cached per sense;
D(x) = up(x, root) with root entity.n.01 (00001740) for the nouns. For an ordered sense pair (s, t), all exact
integers:
    G_WN(s, t)   = -2 min_{a in A(s) & A(t)} up(t, a)                 0 exactly when t is in A(s)
    Sym_WN(s, t) = -min_{a in A(s) & A(t)} (up(s, a) + up(t, a))     -p(s, t), WN-path
    Dep_WN(s, t) = D(s) - D(t)
The dry run (A13.13) reads the verb `@` graph with a virtual root VROOT joined to every verb without a parent
(verb_graph), so that A(s) & A(t) is never empty there either.

Reported variants (A13.4 and A13.11's chain WN -> WN-U -> ST -> letter tree -> H3; each an exact integer):
    WN-U    the undirected graph on the same edges, d_U by breadth-first search: -(d_U(s, t) + d_U(t, root) - d_U(s,
            root)), i.e. G with r = d_U(root, .) and d = d_U
    ST      L3's spanning tree with unit edges, through the words' prefix tree: -2 (depth(t) - depth(lca(s, t)))
    letter  the letter tree: -2 (|w(t)| - lcp(w(s), w(t)))
    WN-LCh  -ln((p + 1) / (2 D_max)) with p = WN-path found by a bidirectional upward search that does not reuse the
            ancestor tables, and D_max = the longest upward path to the root plus one (NLTK's lch_similarity with its
            simulated root). Its order is p's: lch_p gives the integer, lch the 120-digit value.

    WNGraph(parents, root)                  .anc(x), .up(x, a), .depth(x), .g(s, t), .sym(s, t), .path(s, t),
                                            .dep(s, t), .in_closure(s, t), .du(s, t), .du_root(x), .g_u(s, t),
                                            .dmax(), .lch_p(s, t), .lch(s, t, prec)
    noun_graph(wn), verb_graph(wn)          the two graphs of A13 (nouns: one root, entity.n.01; verbs: VROOT)
    WordTree(words, root_word)              .g_st(s, t) (ST) and .g_letter(s, t) for a {key: word} map
    lcp(u, v), letter_g(ws, wt), st_g(ws, wt, node_words)

READINGs are marked where a definition admits two readings; each cites the A13 item it implements.
"""
from collections import deque
from decimal import Context, Decimal, ROUND_HALF_EVEN

from . import wordnet as W

VROOT = 'v-root'                     # the dry run's virtual verb root (A13.13): not an offset, sorts after digits


class WNGraph:
    """A hypernym DAG: parents[x] = the parents of x (an ordered sequence), root = the node every x reaches."""

    def __init__(self, parents, root):
        self.parents = {x: tuple(ps) for x, ps in parents.items()}
        self.root = root
        if root not in self.parents:
            raise ValueError(f'the root {root!r} is not a node')
        if self.parents[root]:
            raise ValueError(f'the root {root!r} has parents')
        self._anc = {}
        self._children = None
        self._du_root = None
        self._dmax = None

    # ------------------------------------------------------------ A(x) and up(x, a)
    def anc(self, x):
        """{a: up(x, a)} for every a in A(x) = {x} and x's closure ancestors: one breadth-first search upward over
        the parents, cached per node (A13.4). Do not mutate the returned dict."""
        d = self._anc.get(x)
        if d is not None:
            return d
        d = {x: 0}
        frontier = [x]
        k = 0
        P = self.parents
        while frontier:
            k += 1
            nxt = []
            for y in frontier:
                for p in P[y]:
                    if p not in d:
                        d[p] = k
                        nxt.append(p)
            frontier = nxt
        if self.root not in d:
            raise ValueError(f'{x!r} does not reach the root {self.root!r}')
        self._anc[x] = d
        return d

    def up(self, x, a):
        """The fewest upward edges from x to a (a must be in A(x))."""
        return self.anc(x)[a]

    def depth(self, x):
        """D(x) = up(x, root)."""
        return self.anc(x)[self.root]

    def _common(self, s, t):
        As, At = self.anc(s), self.anc(t)
        if len(As) <= len(At):
            return [(As[a], At[a]) for a in As if a in At]
        return [(As[a], At[a]) for a in At if a in As]

    def g(self, s, t):
        """G_WN(s, t) = -2 min over a in A(s) & A(t) of up(t, a): 0 exactly when t is in A(s)."""
        return -2 * min(ut for _, ut in self._common(s, t))

    def path(self, s, t):
        """p(s, t) = min over a in A(s) & A(t) of up(s, a) + up(t, a) (WN-path)."""
        return min(us + ut for us, ut in self._common(s, t))

    def sym(self, s, t):
        """Sym_WN(s, t) = -p(s, t)."""
        return -self.path(s, t)

    def dep(self, s, t):
        """Dep_WN(s, t) = D(s) - D(t)."""
        return self.depth(s) - self.depth(t)

    def in_closure(self, s, t):
        """Whether t is in A(s): t is s or one of its closure ancestors."""
        return t in self.anc(s)

    # ------------------------------------------------------------ WN-U (reported)
    def children(self):
        if self._children is None:
            ch = {x: [] for x in self.parents}
            for x, ps in self.parents.items():
                for p in ps:
                    ch[p].append(x)
            self._children = {x: tuple(c) for x, c in ch.items()}
        return self._children

    def _neighbours(self, x):
        return self.parents[x] + self.children()[x]

    def du(self, s, t):
        """d_U(s, t): the undirected breadth-first distance on the same edges, by a bidirectional search that expands
        the smaller frontier one whole level at a time and stops at the first level where the two searches meet (the
        least d_s + d_t over the meeting nodes is then the distance)."""
        if s == t:
            return 0
        return _bidirectional(s, t, self._neighbours, self._neighbours)

    def du_root(self, x):
        """d_U(root, x), from one breadth-first search from the root (cached)."""
        if self._du_root is None:
            d = {self.root: 0}
            q = deque([self.root])
            while q:
                y = q.popleft()
                for z in self._neighbours(y):
                    if z not in d:
                        d[z] = d[y] + 1
                        q.append(z)
            self._du_root = d
        return self._du_root[x]

    def g_u(self, s, t):
        """WN-U's G: -(d_U(s, t) + d_U(t, root) - d_U(s, root)) (A13.4)."""
        return -(self.du(s, t) + self.du_root(t) - self.du_root(s))

    # ------------------------------------------------------------ WN-LCh (reported)
    def dmax(self):
        """D_max = the longest upward path to the root, in edges, over every node, plus one (A13.5; NLTK's max_depth
        with its simulated root). The graph is acyclic; the longest path is found by memoised recursion done
        iteratively."""
        if self._dmax is None:
            longest = {}
            for x0 in self.parents:
                if x0 in longest:
                    continue
                stack = [(x0, False)]
                while stack:
                    x, done = stack.pop()
                    if x in longest:
                        continue
                    ps = self.parents[x]
                    if done:
                        longest[x] = 1 + max(longest[p] for p in ps) if ps else 0
                        continue
                    stack.append((x, True))
                    for p in ps:
                        if p not in longest:
                            stack.append((p, False))
            self._dmax = max(longest.values()) + 1
        return self._dmax

    def lch_p(self, s, t):
        """WN-path p(s, t) by a bidirectional search upward from s and upward from t (the path s -> a <- t, see
        _apex_search), which does not use the ancestor tables of anc() (A13.5: "computed by a separate bidirectional
        search")."""
        if s == t:
            return 0
        return _apex_search(s, t, self.parents.__getitem__)

    def lch(self, s, t, prec=120):
        """WN-LCh = -ln((p + 1) / (2 D_max)) in decimal at `prec` digits (reported; its order is p's)."""
        ctx = Context(prec=prec, rounding=ROUND_HALF_EVEN)
        p = self.lch_p(s, t)
        return ctx.minus(ctx.ln(ctx.divide(Decimal(p + 1), Decimal(2 * self.dmax()))))


def _bidirectional(s, t, nb_s, nb_t):
    """The least d_s(x) + d_t(x) over nodes x reachable from s by nb_s and from t by nb_t (breadth-first distances).

    Each side expands one whole level at a time, the side with the smaller frontier first. Once the two visited sets
    meet after a level is complete, the least sum over the meeting nodes is the answer: a shortest path of length L,
    with the s side complete to level ks and the t side to level kt, has a node at position min(ks, L) from s with
    d_s <= ks and d_t <= kt, and both sides hold exact breadth-first distances. Raises if they never meet."""
    ds, dt = {s: 0}, {t: 0}
    fs, ft = [s], [t]
    ks = kt = 0
    while fs or ft:
        side_s = bool(fs) and (not ft or len(fs) <= len(ft))
        if side_s:
            ks += 1
            nxt = []
            for x in fs:
                for y in nb_s(x):
                    if y not in ds:
                        ds[y] = ks
                        nxt.append(y)
            fs = nxt
            meet = [y for y in nxt if y in dt]
        else:
            kt += 1
            nxt = []
            for x in ft:
                for y in nb_t(x):
                    if y not in dt:
                        dt[y] = kt
                        nxt.append(y)
            ft = nxt
            meet = [y for y in nxt if y in ds]
        if meet:                          # s and t are in their own sides' sets, so reaching either one meets here
            return min(ds[y] + dt[y] for y in meet)
    raise ValueError(f'{s!r} and {t!r} are not connected')


def _apex_search(s, t, up):
    """The least up(s, a) + up(t, a) over common ancestors a, by two breadth-first searches upward, one from s and one
    from t, each expanded a whole level at a time (the smaller frontier first). Unlike an undirected path, the path
    s -> a <- t only climbs from each end, so the first meeting need not be the best: the search stops once the best
    sum found is at most the least sum an undiscovered apex could have, min(k + 1) over the sides whose frontier is
    not exhausted (an apex missing from a side lies beyond its last complete level; an exhausted side has found every
    ancestor). Raises if s and t have no common ancestor."""
    ds, dt = {s: 0}, {t: 0}
    fs, ft = [s], [t]
    ks = kt = 0
    best = None
    while True:
        bounds = ([ks + 1] if fs else []) + ([kt + 1] if ft else [])
        if best is not None and (not bounds or best <= min(bounds)):
            return best
        if not bounds:
            raise ValueError(f'{s!r} and {t!r} have no common ancestor')
        if fs and (not ft or len(fs) <= len(ft)):
            ks += 1
            mine, other, frontier, k = ds, dt, fs, ks
        else:
            kt += 1
            mine, other, frontier, k = dt, ds, ft, kt
        nxt = []
        for x in frontier:
            for y in up(x):
                if y not in mine:
                    mine[y] = k
                    nxt.append(y)
                    if y in other and (best is None or k + other[y] < best):
                        best = k + other[y]
        if mine is ds:
            fs = nxt
        else:
            ft = nxt


# ================================================================ the two graphs of A13
def noun_graph(wn):
    """WN over the 82,115 noun synsets: parents = `@` and `@i` (closure_parents), root entity.n.01; the forest must
    have that root alone (A13.4)."""
    nouns = wn['synsets']['noun']
    parents = {o: tuple(W.closure_parents(s)) for o, s in nouns.items()}
    roots = sorted(o for o, ps in parents.items() if not ps)
    if roots != [W.ENTITY]:
        raise ValueError(f'the noun graph has roots {roots[:5]}..., not entity.n.01 alone')
    return WNGraph(parents, W.ENTITY)


def verb_graph(wn):
    """The dry run's WN (A13.13): the verb `@` graph with a virtual root VROOT joined to every verb that has no
    parent (the isolated verbs included), so that every pair of verbs has a common ancestor.
    READING (A13.13): "a virtual root joined to its roots" is one edge from each parentless verb to VROOT, so
    D(x) = up(x, VROOT) is the depth below the virtual root (a parentless verb has D = 1)."""
    verbs = wn['synsets']['verb']
    parents = {o: tuple(W.closure_parents(s)) for o, s in verbs.items()}
    for o, ps in list(parents.items()):
        if not ps:
            parents[o] = (VROOT,)
    parents[VROOT] = ()
    return WNGraph(parents, VROOT)


# ================================================================ ST and the letter tree (reported)
def lcp(u, v):
    """The length of the longest common prefix of two words."""
    n = min(len(u), len(v))
    k = 0
    while k < n and u[k] == v[k]:
        k += 1
    return k


def letter_g(ws, wt):
    """The letter tree's G: -2 (|w(t)| - lcp(w(s), w(t))) (A13.5)."""
    return -2 * (len(wt) - lcp(ws, wt))


def st_g(ws, wt, node_words):
    """ST's G through the words' prefix tree: -2 (depth(t) - depth(lca(s, t))) with unit spanning edges.

    The spanning ancestors of a node are exactly the nodes whose words are proper prefixes of its word (L3(d)), so
    depth(t) - depth(lca) counts the node words among the prefixes of w(t) longer than lcp(w(s), w(t)): the lca is the
    deepest node word of length at most the lcp."""
    k = lcp(ws, wt)
    return -2 * sum(1 for j in range(k + 1, len(wt) + 1) if wt[:j] in node_words)


class WordTree:
    """ST and the letter tree over {key: word} (L3's words: address.noun_words, or address.verb_words).

    root_word is the forest's root word: the nouns' entity.n.01 at (0,), which is already a node word, or the verbs'
    virtual root at (1,), which is added so that two verb trees meet there.
    READING (A13.4, A13.13): on the verb forest, ST's tree is the spanning forest under its virtual root, whose word
    (1,) counts as a node."""

    def __init__(self, words, root_word):
        self.words = {k: tuple(w) for k, w in words.items()}
        self.node_words = frozenset(self.words.values()) | {tuple(root_word)}
        self.root_word = tuple(root_word)

    def g_st(self, s, t):
        return st_g(self.words[s], self.words[t], self.node_words)

    def g_letter(self, s, t):
        return letter_g(self.words[s], self.words[t])

    def st_depth(self, s):
        """depth(s) below the root word (the root word itself has depth 0)."""
        w = self.words[s]
        r = len(self.root_word)
        return sum(1 for j in range(r + 1, len(w) + 1) if w[:j] in self.node_words)
