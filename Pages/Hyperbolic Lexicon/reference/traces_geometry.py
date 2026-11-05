"""Write the geometry traces the browser core must reproduce line for line (README, the authority rule):

    traces/address_v1.txt   letters_for, child_word (the rule and both controls) on Rng(8300 + i) cases, and the
                            verb forest's words (the dry-run forest, Amendment 1 item 10), with their SHA-256
    traces/points_v1.txt    300 words of random length 1-40, word i from Rng(8000 + i): the word, its D6 id, and
                            its exact points in H^3 (t = 3/4), H^2 (t = 11/13), H^2 at t = 3/4 (L3 control 4, with
                            its greedy decode), F3, F3*, F2, F2*; coordinates in lowest terms 'p/q'
    traces/rank_v1.txt      20 verb-forest queries, query i = Rng(8100 + i).below(13767) in offset order: the
                            rank-list SHA-256 (Amendment 1 item 5) and the exact graph-edge and closure APs and
                            neighbour ranks, in H^3 and H^2; the first 100 rank-list lines of query 0

    python3 -B traces_geometry.py            (from this folder; needs the WordNet archive in the cache)

Seeds 8000 + i are the traces' own (Amendment 1, item 10): no claim uses them. A word from a generator is item 9's
draw with the length given: root letter below(6), then children(w)[below(5)]. Lines starting with '#' are comments;
every other line is 'key field field ...', space-separated. Nothing here decides a claim.
"""
import hashlib
import os
import sys
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.set_int_max_str_digits(0)

import lexicon  # noqa: E402,F401
from hpstep.prng import Rng  # noqa: E402
from hpstep.problems import children  # noqa: E402
from lexicon import address as A  # noqa: E402
from lexicon import flat, rank as R, wordnet as W  # noqa: E402
from lexicon import h2exact as H2  # noqa: E402
from lexicon import h3tree as H3  # noqa: E402

OUT = os.path.join(HERE, 'traces')
WS = A.word_str


def q(x):
    return f'{x.numerator}/{x.denominator}' if x is not None else '-'


def word_of(rng, L):
    w = [rng.below(6)]
    while len(w) < L:
        w.append(children(w)[rng.below(5)])
    return tuple(w)


def write(name, lines):
    os.makedirs(OUT, exist_ok=True)
    text = '\n'.join(lines) + '\n'
    with open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print(f'{name}: {len(lines)} lines, sha256 {hashlib.sha256(text.encode()).hexdigest()}')


def address_trace(wn):
    lines = ['# address_v1: the L3 rule (lexicon.address). letters <c> <max(1, ceil log5 c)> <ceil log5 c>',
             '# child <i> <parent> <k> <c> <rule word> <zero word> <trunc word>: case i from Rng(8300 + i): parent',
             '# of length 1 + below(12), cap = (5, 25, 125, 700)[below(4)], c = 1 + below(cap), k = below(c)',
             '# verb <offset> <word>: the verb forest, roots under the virtual root [1] (Amendment 1, item 10)']
    for c in list(range(1, 32)) + [124, 125, 126, 127, 559, 624, 625, 626, 3125, 3126]:
        lines.append(f'letters {c} {A.letters_for(c)} {A.letters_for_zero(c)}')
    for i in range(200):
        rng = Rng(8300 + i)
        parent = word_of(rng, 1 + rng.below(12))
        cap = (5, 25, 125, 700)[rng.below(4)]
        c = 1 + rng.below(cap)
        k = rng.below(c)
        kids = ' '.join(WS(A.child_word(parent, k, c, v)) for v in A.VARIANTS)
        lines.append(f'child {i} {WS(parent)} {k} {c} {kids}')
    vw = A.verb_words(wn)
    lines.append(f'verb_words_sha256 {A.words_sha256(vw)}')
    lines.extend(f'verb {o} {WS(vw[o])}' for o in sorted(vw))
    return lines


def points_trace():
    lines = ['# points_v1: word i from Rng(8000 + i), length 1 + below(40). Lines "<i> <tree> c0 c1 c2 [c3]" with',
             '# each coordinate in lowest terms p/q (Amendment 1, item 6 (f)); "<i> id <id> <id59|-> <id64|->";',
             '# "<i> H2t34dec <word> <ties>": the greedy decode of the t = 3/4 H^2 point (L3 control 4)']
    words = []
    for i in range(300):
        rng = Rng(8000 + i)
        words.append(word_of(rng, 1 + rng.below(40)))
    T34 = H2.H2Tree(Fraction(3, 4))
    trees = [('H3', H3.points(words), H3.den), ('H2', H2.TREE.points(words), H2.TREE.den),
             ('H2t34', T34.points(words), T34.den)]
    trees += [(T.name, T.points(words), T.den) for T in (flat.F3, flat.F3S, flat.F2, flat.F2S)]
    for i, w in enumerate(words):
        n = A.word_id(w)
        lines.append(f'{i} word {len(w)} {WS(w)}')
        lines.append(f'{i} id {n} {A.id59(w) if A.id59(w) is not None else "-"} '
                     f'{A.id64(w) if A.id64(w) is not None else "-"}')
        for name, pts, den in trees:
            lines.append(f'{i} {name} {H3.coords_text(pts[i], den(len(w)))}')
        dec, ties = T34.decode(trees[2][1][i], len(w))
        lines.append(f'{i} H2t34dec {WS(dec)} {ties}')
    return lines


def rank_trace(wn):
    lines = ['# rank_v1: verb-forest queries, query i = Rng(8100 + i).below(13767) in offset order, against the',
             '# other 13,766 verbs. "<offset> <tree> sha <rank-list sha256>", "... ap_graph|ap_closure <n/d>",',
             '# "... ranks_graph|ranks_closure <r,r,...>" (neighbours in index order; "-" if none); then',
             '# "list <tree> <line>" for the first 100 rank-list lines of query 0']
    vw = A.verb_words(wn)
    offs = sorted(vw)
    words = [vw[o] for o in offs]
    parent, kids, _ = W.spanning_forest(wn['synsets']['verb'])
    g_nb = R.graph_neighbours(offs, parent, kids)
    anc = W.closure(wn['synsets']['verb'])
    c_nb = R.closure_neighbours(offs, anc, W.descendants(anc))
    queries = [Rng(8100 + i).below(len(offs)) for i in range(20)]
    heads = []
    for name, arm in (('H3', H3.arm(words)), ('H2', H2.arm(words))):
        for j, u in enumerate(queries):
            r = R.rank_query(arm, u, [g_nb, c_nb], offs, 'text' if j == 0 else 'sha')
            lines.append(f'{offs[u]} {name} sha {r.sha}')
            for label, ap, rk in zip(('graph', 'closure'), r.ap, r.ranks):
                lines.append(f'{offs[u]} {name} ap_{label} {q(ap)}')
                lines.append(f'{offs[u]} {name} ranks_{label} {",".join(map(str, rk)) or "-"}')
            if j == 0:
                heads.extend(f'list {name} {line}' for line in r.text.split('\n')[:100])
    return lines + heads


def main():
    wn = W.load()
    write('address_v1.txt', address_trace(wn))
    write('points_v1.txt', points_trace())
    write('rank_v1.txt', rank_trace(wn))


if __name__ == '__main__':
    main()
