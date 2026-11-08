"""Words, senses and pair sets (Amendment 13 item 3), the '@' graph and its universe U_@ (items 9 and 10), and HiT's
synset names (item 3).

    N_S(w)                              ASCII A-Z lower-cased, ' ' to '_'; nothing else
    universe_full(wn)                   U_full: the 82,115 noun offsets, a frozenset
    at_graph(wn, pos)                   the '@' graph (no '@i'): U_@ in offset order, E, parents, children, roots,
                                        strict ancestors, |T|, anchors, the smallest |NN(u)|; check_at_graph(g)
    senses(w, U, wn, pos)               S_U(w): index.<pos>[N_S(w)]'s offsets in index order, filtered to U
    covered(x, y, U, wn, vocab)         both sense lists non-empty (and, with a GloVe vocabulary, both N_S words in it)
    covered_rows(rows, U, wn, vocab)    the covered row numbers of [(row, x, y)], in file order
    pair_set(*row_lists)                the intersection over arms, in file order; rows_sha(rows)
    ns_pairs_sha(pairs), word_types(pairs), word_types_sha(types)
    hit_names(wn), resolve_names(names, wn, nodes)    NLTK's synset names and HiT's name verifier
    first_pair, gensim_pair, noun_exceptions, morphy  the reported sense rules
    missed_words(rows, has), missed_report(...)       the vocabulary an arm misses (A13.11, reported)
    sp_lp(g)                            Nickel & Kiela 2018's sp and lp of every node of an '@' graph (A13.11, reported)
"""
import hashlib
from collections import Counter, deque

from . import wordnet

ENTITY = wordnet.ENTITY
# A13.9: U_@ and E as registered (LF-joined offsets; sorted 'child parent' lines, LF-joined).
U_AT_COUNT = 74401
U_AT_SHA = '9af5a81a2d8725ba431ebfc55fe17b6698a024b8d85f09c01106ae1218eeb117'
E_COUNT = 75850
E_SHA = '74748ad85fcea82e8f282f5ab72cfdfacc292aa4073d58c078d7a311fa2d7dd2'
T_COUNT = 587658
ROOTS = 12
ANCHORS = 74389
MIN_NN = 73996
U_FULL_COUNT = 82115
# A13.13: the dry verb '@' graph.
VERB_AT = {'nodes': 13542, 'edges': 13239, 'indirect': 21840, 'roots': 334, 'isolated': 225}


def sha256_text(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def N_S(w):
    """A13.3's normalisation: ASCII A-Z lower-cased and each space made '_'. No other change: non-ASCII letters
    keep their case, N_B is not applied and nothing is lemmatised."""
    return ''.join('_' if c == ' ' else (chr(ord(c) + 32) if 'A' <= c <= 'Z' else c) for c in w)


def universe_full(wn, pos='noun'):
    return frozenset(wn['synsets'][pos])


class AtGraph:
    """The '@' graph of one part of speech: nodes are the synsets incident to an '@' pointer (both ends), in offset
    order; edges (child, parent) sorted; ancestors are strict '@'-only closure ancestors."""

    def __init__(self, pos, nodes, edges, parents, children, ancestors, n_total):
        self.pos = pos
        self.nodes = nodes
        self.index = {o: i for i, o in enumerate(nodes)}
        self.edges = edges
        self.edge_set = frozenset(edges)
        self.parents = parents
        self.children = children
        self.ancestors = ancestors
        self.roots = [o for o in nodes if not parents[o]]
        self.n_closure = sum(len(a) for a in ancestors.values())
        self.n_indirect = self.n_closure - len(edges)
        self.anchors = len({c for c, _ in edges})
        n = len(nodes)
        self.min_nn = min(n - 1 - len(parents[o]) - len(children[o]) for o in nodes)
        self.isolated = n_total - n

    def nodes_sha(self):
        return sha256_text('\n'.join(self.nodes))

    def edges_sha(self):
        return sha256_text('\n'.join(f'{c} {p}' for c, p in self.edges))


def at_graph(wn, pos='noun'):
    """The '@' graph (hypernym pointers only, no '@i'), HiT's entity set for nouns (A13 notation) and the dry
    graph for verbs (A13.13). parents and children are sorted offset lists; ancestors are frozensets."""
    syn = wn['synsets'][pos]
    edges = set()
    for o, s in syn.items():
        for sym, p, _ in s.ptrs:
            if sym == '@':
                if p not in syn:
                    raise ValueError(f'{pos} {o}: an @ pointer to {p}, outside {pos}')
                edges.add((o, p))
    edges = sorted(edges)
    nodes = sorted({x for e in edges for x in e})
    parents = {o: [] for o in nodes}
    children = {o: [] for o in nodes}
    for c, p in edges:
        parents[c].append(p)
        children[p].append(c)
    for o in nodes:
        parents[o].sort()
        children[o].sort()
    anc = {}
    # iterative depth-first closure (the graph is acyclic; a cycle is refused)
    for start in nodes:
        if start in anc:
            continue
        stack = [(start, 0)]
        onpath = {start}
        while stack:
            o, k = stack[-1]
            ps = parents[o]
            if k < len(ps):
                stack[-1] = (o, k + 1)
                p = ps[k]
                if p in anc:
                    continue
                if p in onpath:
                    raise ValueError(f'{pos}: a cycle through {p}')
                onpath.add(p)
                stack.append((p, 0))
            else:
                s = set()
                for p in ps:
                    s.add(p)
                    s |= anc[p]
                anc[o] = frozenset(s)
                onpath.discard(o)
                stack.pop()
    return AtGraph(pos, nodes, edges, parents, children, anc, len(syn))


def check_at_graph(g):
    """A13.9's WordNet counts for U_@ (nouns), or A13.13's for the dry verb graph; raises on any difference."""
    if g.pos == 'noun':
        got = {'nodes': len(g.nodes), 'nodes_sha': g.nodes_sha(), 'edges': len(g.edges), 'edges_sha': g.edges_sha(),
               'indirect': g.n_indirect, 'roots': len(g.roots), 'anchors': g.anchors, 'min_nn': g.min_nn}
        want = {'nodes': U_AT_COUNT, 'nodes_sha': U_AT_SHA, 'edges': E_COUNT, 'edges_sha': E_SHA,
                'indirect': T_COUNT, 'roots': ROOTS, 'anchors': ANCHORS, 'min_nn': MIN_NN}
    else:
        got = {'nodes': len(g.nodes), 'edges': len(g.edges), 'indirect': g.n_indirect, 'roots': len(g.roots),
               'isolated': g.isolated}
        want = VERB_AT
    bad = {k: (want[k], got[k]) for k in want if got[k] != want[k]}
    if bad:
        raise ValueError(f'{g.pos} @ graph differs from the registered counts: {bad}')
    return got


# ================================================================ senses and coverage
def senses(w, U, wn, pos='noun'):
    """S_U(w): the offsets of index.<pos>[N_S(w)] that lie in U (any container; None for no filter), in index order
    (sense 1 first); [] when the lemma is absent."""
    e = wn['index'][pos].get(N_S(w))
    if e is None:
        return []
    return [o for o in e.offsets if U is None or o in U]


def in_vocab(w, vocab):
    """A13.3: N_S(w) is in GloVe's vocabulary and holds no '_' (6B's 460 underscore tokens are artefacts)."""
    v = N_S(w)
    return '_' not in v and v in vocab


def covered(x, y, U, wn, vocab=None, pos='noun'):
    """A row (x, y) is covered in U when S_U(x) and S_U(y) are both non-empty; with vocab (GloVe's words), both N_S
    words must also be in it, neither containing '_'."""
    if not senses(x, U, wn, pos) or not senses(y, U, wn, pos):
        return False
    return vocab is None or (in_vocab(x, vocab) and in_vocab(y, vocab))


def covered_rows(rows, U, wn, vocab=None, pos='noun'):
    """The row numbers of [(row, x, y)] covered in U (and in vocab), in the order given (file order)."""
    return [r for r, x, y in rows if covered(x, y, U, wn, vocab, pos)]


def pair_set(*row_lists):
    """A13.3: the rows covered by every arm, in file order (ascending row numbers), repeats of a pair kept (they
    are different rows). Each argument is one arm's covered rows."""
    if not row_lists:
        return []
    common = set(row_lists[0])
    for rows in row_lists[1:]:
        common &= set(rows)
    return sorted(common)


def rows_text(rows):
    """Decimal row numbers, LF-joined, no final LF (A13.2)."""
    return '\n'.join(str(int(r)) for r in rows)


def rows_sha(rows):
    return sha256_text(rows_text(rows))


def ns_pairs_sha(pairs):
    """The SHA-256 of the N_S pairs 'x<TAB>y' in row order, LF-joined, no final LF (A13.2)."""
    return sha256_text('\n'.join(f'{N_S(x)}\t{N_S(y)}' for x, y in pairs))


def word_types(pairs):
    """A ρ pair set's word types: the distinct N_S forms of its x and y values, in code-point order (the word-level
    bootstrap's units, A13.7)."""
    return sorted({N_S(w) for p in pairs for w in p})


def word_types_sha(types):
    return sha256_text('\n'.join(types))


def keys_sha(keys):
    """The SHA-256 of cluster keys in row order, LF-joined, no final LF (A13.2)."""
    return sha256_text('\n'.join(keys))


# ================================================================ HiT's names (A13.3)
def hit_names(wn):
    """NLTK's name of every noun synset: the data line's first lemma, lower-cased, '.n.', then the synset's 1-based
    position in that lemma's index.noun entry as two digits ('%02d'). Returns {name: offset}; the map is one-to-one
    (refused otherwise)."""
    nouns = wn['synsets']['noun']
    idx = wn['index']['noun']
    out = {}
    for o in sorted(nouns):
        lemma = nouns[o].lemmas[0].lower()
        e = idx.get(lemma)
        if e is None or o not in e.offsets:
            raise ValueError(f'{o}: its first lemma {lemma!r} does not list it in index.noun')
        name = '%s.n.%02d' % (lemma, e.offsets.index(o) + 1)
        if name in out:
            raise ValueError(f'two synsets named {name}')
        out[name] = o
    return out


def resolve_names(names, wn, nodes, count=U_AT_COUNT):
    """HiT's name verifier: every name resolves by hit_names, the names are distinct, and they map one-to-one onto
    nodes (U_@), count of them; returns {name: offset}. Raises otherwise (A13.9: 'else stop')."""
    table = hit_names(wn)
    names = list(names)
    if len(set(names)) != len(names):
        raise ValueError('repeated HiT names')
    unresolved = [n for n in names if n not in table]
    if unresolved:
        raise ValueError(f'{len(unresolved)} HiT names do not resolve, e.g. {unresolved[:3]}')
    out = {n: table[n] for n in names}
    if len(names) != count or set(out.values()) != set(nodes) or len(set(out.values())) != len(names):
        raise ValueError(f'HiT names: {len(names)} names onto {len(set(out.values()))} synsets, not one-to-one onto '
                         f'the {len(nodes)} nodes of U_@ ({count} registered)')
    return out


# ================================================================ reported sense rules (A13.3)
def first_pair(sx, sy):
    """First senses: (S(x)[0], S(y)[0])."""
    return sx[0], sy[0]


def gensim_pair(sx, sy, key):
    """gensim's rule: the sense pair (s, t) of S(x) x S(y) with the smallest key(s, t), an exact distance key (K, a
    squared distance or an integer path length; smaller = closer), ties to the first in (i, j) order (x's sense
    index major). The caller then scores that pair by the score in question."""
    best = None
    for s in sx:
        for t in sy:
            k = key(s, t)
            if best is None or k < best[0]:
                best = (k, s, t)
    return best[1], best[2]


def noun_exceptions(path=wordnet.ZIP_PATH):
    """noun.exc of the pinned WordNet 3.0 archive: {inflected form: [base forms, in file order]}."""
    with wordnet.read_archive(path) as z:
        text = z.read('wordnet/noun.exc').decode('latin-1')
    out = {}
    for line in text.split('\n'):
        f = line.split()
        if len(f) >= 2:
            out.setdefault(f[0], []).extend(f[1:])
    return out


MORPHY_RULES = (('s', ''), ('ses', 's'), ('xes', 'x'), ('zes', 'z'), ('ches', 'ch'), ('shes', 'sh'), ('men', 'man'),
                ('ies', 'y'))


def morphy_candidates(w, exc):
    """noun.exc's base forms first, then the endings in A13.3's order, each applied once to N_S(w).
    READING (A13.3, "noun.exc first, then the endings ...; the shortest candidate in index.noun"): both sources give
    candidates, exceptions listed before endings (the tie order); rules are applied once, not iterated; and NLTK's
    early return on an exception entry is not followed."""
    v = N_S(w)
    out = list(exc.get(v, []))
    for end, rep in MORPHY_RULES:
        if v.endswith(end) and v[:len(v) - len(end)] + rep:
            out.append(v[:len(v) - len(end)] + rep)
    return out


def morphy(w, wn, exc, pos='noun'):
    """The reported morphy rule, only for a word absent raw: the shortest candidate that is a key of index.noun,
    ties to the first found; None when the word is present raw or no candidate is."""
    idx = wn['index'][pos]
    if N_S(w) in idx:
        return None
    best = None
    for c in morphy_candidates(w, exc):
        if c in idx and (best is None or len(c) < len(best)):
            best = c
    return best


def strata(wn, pos='noun'):
    """index.<pos>'s lemmas grouped by their number of senses k = 1..9 and k >= 10 pooled (A13.4's W strata), each
    sorted by code point: [(k, [lemmas])]."""
    by = {}
    for lemma, e in wn['index'][pos].items():
        by.setdefault(min(len(e.offsets), 10), []).append(lemma)
    return [(k, sorted(by[k])) for k in sorted(by)]


def strata_counts(wn, pos='noun'):
    c = Counter(min(len(e.offsets), 10) for e in wn['index'][pos].values())
    return tuple(c[k] for k in range(1, 11))


# ================================================================ reported (A13.11): missed vocabulary, NK18's ranks
def missed_words(rows, has):
    """The vocabulary an arm misses (A13.11, "every set and arm: coverage and the vocabulary each arm misses";
    reported): over [(row, x, y)], the distinct N_S forms of the x and y values for which has(w) is false, in
    code-point order, and the number of rows holding at least one of them. has(w) is the arm's own vocabulary test: a
    non-empty S_U(w) for the arms that read senses in U, N_S(w) a lemma of index.<pos> for W (whose lemma takes another
    lemma's sense list), in_vocab(w, vocab) for GloVe."""
    miss, lost = set(), 0
    for _, x, y in rows:
        bad = [N_S(w) for w in (x, y) if not has(w)]
        if bad:
            lost += 1
            miss.update(bad)
    return sorted(miss), lost


def missed_report(types, rows_lost):
    """A missed vocabulary as committed (A13.2: no word of a Stage-2 file enters a committed file): the number of word
    types, the SHA-256 of their N_S forms in code-point order (LF-joined, no final LF) and the rows holding one."""
    return {'missed_types': len(types), 'missed_sha256': word_types_sha(types), 'rows_with_a_missed_word': rows_lost}


def sp_lp(g):
    """Nickel & Kiela 2018's ground-truth position of every node of the '@' graph g (an AtGraph; A13.11, reported):
    sp, the fewest edges between the node and a root (a node without a parent), and lp, the most edges from the node
    down to a leaf (a node without a child). Returns {offset: (sp, lp)}; the diagnostic ranks the nodes by
    sp/(sp + lp).
    READING (A13.11, "the Spearman rho between r and sp/(sp + lp)"; P18 reads sp as the shortest path from the root
    and lp as the longest path to a descendant leaf): U_@'s graph E has 12 roots (the dry verb graph 334), so sp is the
    distance to the nearest root; lp is the node's height; both are taken on E, the relation the tables are trained
    on, and the exact trees are read on the same nodes and ranks."""
    sp = {r: 0 for r in g.roots}
    q = deque(sorted(g.roots))
    while q:
        u = q.popleft()
        for c in g.children[u]:
            if c not in sp:
                sp[c] = sp[u] + 1
                q.append(c)
    lp = {}
    for start in g.nodes:
        if start in lp:
            continue
        stack = [(start, 0)]
        while stack:
            u, k = stack[-1]
            ch = g.children[u]
            if k < len(ch):
                stack[-1] = (u, k + 1)
                if ch[k] not in lp:
                    stack.append((ch[k], 0))
            else:
                lp[u] = 1 + max(lp[c] for c in ch) if ch else 0
                stack.pop()
    return {o: (sp[o], lp[o]) for o in g.nodes}
