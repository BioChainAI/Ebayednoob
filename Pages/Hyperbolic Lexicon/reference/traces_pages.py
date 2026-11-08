"""Write the trace the page engine (assets/hl-pages.js, Phase 5) must reproduce line for line:

    traces/pages_v1.txt   ten fixed sentences and three fixed BERT-style pairs, through the reference: N_B and
                          WordPiece on V0, map A, D6 ids and certification, exact H^3 and H^2 points, greedy decoding,
                          bits, the letters that survive float64 storage, consecutive tokens' synset LCA, exact cosh
                          and chart coordinates, X(5, q) vertices; the coupler on each pair's segments (the mirror law
                          and its control); engram/1 keys of seven words; the three X(5, q) graphs and 100 random words
                          Rng(8400 + i) on them

    python3 -B traces_pages.py            (from this folder or the repository root; needs the WordNet archive)
    python3 -B traces_pages.py --check    rebuild in memory and compare bytes with the committed file

--check exits 0 equal, 1 different, 2 "skipped" when the WordNet archive is not cached. Lines starting with '#' are
comments; every other line is space-separated fields, free text as JSON (UTF-8, not ASCII-escaped), coordinates and
cosh values 'p/q' in lowest terms. It uses the reference modules read only (lexicon.wordpiece, lexicon.address,
lexicon.h3tree, lexicon.h2exact, lexicon.lps; Engram Mind's Eye's engram.coupler and engram.ttmpt; hpstep's prng and
problems). Its own seeds are Rng(8400 + i). Nothing here decides a claim: Phase 5 decides none.
"""
import hashlib
import json
import os
import sys
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.set_int_max_str_digits(0)

import lexicon  # noqa: E402,F401
from engram import ttmpt  # noqa: E402
from engram.coupler import Coupler  # noqa: E402
from hpstep.prng import Rng  # noqa: E402
from hpstep.problems import word_quaternion  # noqa: E402
from lexicon import address as A  # noqa: E402
from lexicon import h2exact as H2  # noqa: E402
from lexicon import h3tree as H3  # noqa: E402
from lexicon import lps  # noqa: E402
from lexicon import wordnet as W  # noqa: E402
from lexicon import wordpiece as WP  # noqa: E402

OUT = os.path.join(HERE, 'traces', 'pages_v1.txt')
WS = A.word_str
QS = (13, 17, 29)

HEAD = [
    "# pages_v1: the page engine's outputs (Phase 5), written by reference/traces_pages.py; decides nothing",
    '# s <k> text|tok|id|h3|h2|dec|bits|f64|lps|pair|chart: sentence k through N_B, WordPiece (V0), map A, the D6 id,',
    '# exact points (coordinates p/q in lowest terms), greedy decoding, bits, float64 storage, X(5, q); pair and chart',
    "# lines join token i and i + 1 (their synset LCA, exact cosh; i + 1 in i's chart). p <k>: a BERT-style pair",
    '# [CLS] A [SEP] B [SEP] with segments 0/1 and the coupler (mirror, and the control same). e: engram/1 keys.',
    '# lps / lpsw: the X(5, q) graphs (L7) and 100 words from Rng(8400 + i), length 1 + below(60) (item 9).',
]
SENTENCES = [
    'The dog chased the cat up the tree.',
    'Oxygen and nitrogen are gases.',
    'She can run, jump and swim.',
    'Ünïcödé façade, naïve café — résumé!',
    'unbelievably, 12,345 apples!',
    'Entity, physical entity, abstraction.',
    'ΣΊΣΥΦΟΣ',
    '[CLS] literal brackets [SEP]',
    '',
    'pneumonoultramicroscopicsilicovolcanoconiosis',
]
PAIRS = [
    ('The dog chased the cat.', 'The cat climbed the tree.'),
    ('Is oxygen a gas?', 'Yes, and so is nitrogen.'),
    ('She can run.', ''),
]
ENGRAM_WORDS = ['THE', 'CAT', 'ACT', 'TAC', 'DOG', 'GOD', 'SAT']


def js(s):
    return json.dumps(s, ensure_ascii=False)


def frac(n, d):
    f = Fraction(n, d)
    return f'{f.numerator}/{f.denominator}'


def lorentz_key(a, b):
    return a[0] * b[0] - sum(x * y for x, y in zip(a[1:], b[1:]))


def chart(N, X, D):
    """X in the chart of the frame N (columns): R_i = J_i <N_i, X>_J over D, as p/q texts."""
    J = [-1] + [1] * (len(X) - 1)
    out = []
    for i, col in enumerate(N):
        s = -col[0] * X[0] + sum(c * x for c, x in zip(col[1:], X[1:]))
        out.append(frac(J[i] * s, D))
    return out


def kept(word, X, den, decode):
    """The letters of `word` that survive when its exact point X / den is stored in float64 (each coordinate
    correctly rounded, Python's float(Fraction)), read back exactly over one power of two, and decoded exactly."""
    n = len(word)
    fr = [Fraction(float(Fraction(x, den))) for x in X]
    D2 = max(f.denominator for f in fr)
    V = [int(f * D2) for f in fr]
    got = decode(V, n)
    k = 0
    while k < n and got[k] == word[k]:
        k += 1
    return k


def bits_text(X, d):
    return ','.join(f'{p}/{q}' for p, q in H3.coord_bits(X, d))


class World:
    def __init__(self, wn):
        self.v0 = WP.load_v0()
        nw, vw = A.noun_words(wn), A.verb_words(wn)
        self.words, _ = A.map_a(self.v0.entries, wn, nw, vw)
        self.synset = {}
        for o, w in nw.items():
            self.synset[tuple(w)] = 'n:' + o
        for o, w in vw.items():
            self.synset[tuple(w)] = 'v:' + o
        self.graphs = {q: lps.graph(q) for q in QS}

    def encode(self, text):
        ids, pieces, spans = WP.encode(text.encode('utf-8'), self.v0)
        return list(zip(ids, pieces, spans))

    def synset_lca(self, a, b):
        k = 0
        while k < len(a) and k < len(b) and a[k] == b[k]:
            k += 1
        for j in range(k, 0, -1):
            s = self.synset.get(tuple(a[:j]))
            if s:
                return k, s, len(a) + len(b) - 2 * j
        return k, '-', '-'

    def sentence(self, k, text):
        lines = [f's {k} text {js(text)}']
        toks = self.encode(text)
        words = [tuple(self.words[i]) for i, _, _ in toks]
        P3, P2 = H3.points(words), H2.TREE.points(words)
        for i, ((tid, piece, (b0, b1)), w) in enumerate(zip(toks, words)):
            n = len(w)
            d3, d2 = H3.den(n), H2.TREE.den(n)
            lines.append(f's {k} tok {i} {tid} {js(piece)} {b0} {b1} {WS(w)} {w[0]} {self.synset.get(w, "-")}')
            a, b = A.id59(w), A.id64(w)
            lines.append(f's {k} id {i} {A.word_id(w)} {"-" if a is None else a} {"-" if b is None else b} '
                         f'{1 if all(A.certify_parts(w)) else 0}')
            lines.append(f's {k} h3 {i} {H3.coords_text(P3[i], d3)}')
            lines.append(f's {k} h2 {i} {H3.coords_text(P2[i], d2)}')
            w2, ties = H2.TREE.decode(P2[i], n)
            lines.append(f's {k} dec {i} {WS(w2)} {ties} {WS(H3.decode_int(P3[i], n))} {WS(H3.decode_exact(P3[i], n))}')
            lines.append(f's {k} bits {i} {bits_text(P3[i], d3)} {H3.point_bits(P3[i], d3)} '
                         f'{bits_text(P2[i], d2)} {H3.point_bits(P2[i], d2)}')
            lines.append(f's {k} f64 {i} {kept(w, P2[i], d2, lambda V, L: H2.TREE.decode(V, L)[0])} '
                         f'{kept(w, P3[i], d3, H3.decode_int)}')
            for q in QS:
                G = self.graphs[q]
                v = G.reduction(w)
                lines.append(f's {k} lps {i} {q} {v} {",".join(map(str, G.verts[v]))} {int(G.dist[v])} {G.walk(w)}')
        for i in range(len(words) - 1):
            a, b = words[i], words[i + 1]
            lcp, syn, letters = self.synset_lca(a, b)
            c3 = frac(lorentz_key(P3[i], P3[i + 1]), H3.den(len(a)) * H3.den(len(b)))
            c2 = frac(lorentz_key(P2[i], P2[i + 1]), H2.TREE.den(len(a)) * H2.TREE.den(len(b)))
            lines.append(f's {k} pair {i} {i + 1} {lcp} {syn} {letters} {c3} {c2}')
            N2, N3 = H2.TREE.frames([a])[0], H3.frames([a])[0]
            r2 = chart(N2, P2[i + 1], H2.TREE.den(len(a)) * H2.TREE.den(len(b)))
            r3 = chart(N3, P3[i + 1], H3.den(len(a)) * H3.den(len(b)))
            lines.append(f's {k} chart {i} {i + 1} h2 {" ".join(r2)} h3 {" ".join(r3)}')
        return lines

    def pair(self, k, ta, tb):
        lines = [f'p {k} text {js(ta)} {js(tb)}']
        cls, sep = self.v0.ids['[CLS]'], self.v0.ids['[SEP]']
        A_, B_ = self.encode(ta), self.encode(tb)
        seq = [(cls, 0)] + [(i, 0) for i, _, _ in A_] + [(sep, 0)]
        if B_:
            seq += [(i, 1) for i, _, _ in B_] + [(sep, 1)]
        for i, (tid, seg) in enumerate(seq):
            lines.append(f'p {k} tok {i} {seg} {tid} {WS(self.words[tid])}')
        for law in ('mirror', 'same'):
            cp = Coupler(law)
            for i, (tid, seg) in enumerate(seq):
                cp.twist(word_quaternion(tuple(self.words[tid])), seg)
                ok = cp.check(i)
                lines.append(f'p {k} cpl {law} {i} {seg} {1 if ok else 0}')
            q1, q2 = cp.q
            lines.append(f'p {k} q {law} {",".join(map(str, q1))} {",".join(map(str, q2))} {cp.issued[0]} {cp.issued[1]}')
        return lines

    def trace(self):
        lines = list(HEAD)
        for k, s in enumerate(SENTENCES):
            lines.extend(self.sentence(k, s))
        for k, (a, b) in enumerate(PAIRS):
            lines.extend(self.pair(k, a, b))
        for t in ENGRAM_WORDS:
            lines.append(f'e {t} {ttmpt.hex_lsb(ttmpt.crystallize(t))}')
        for q in QS:
            G = self.graphs[q]
            g, r = lps.girth(G)
            lines.append(f'lps {q} n {G.n} iota {G.iota} diameter {int(G.dist.max())} girth {g} r {r}')
        for i in range(100):
            w = lps.random_word(Rng(8400 + i))
            lines.append(f'lpsw {i} {WS(w)} ' + ' '.join(str(self.graphs[q].reduction(w)) for q in QS))
        return lines


def text_of(lines):
    return '\n'.join(lines) + '\n'


def main():
    check = '--check' in sys.argv[1:]
    if not W.available():
        print(f'skipped: pages_v1.txt needs the WordNet archive, which is not cached at {W.ZIP_PATH} '
              f'(run golden/make_wordnet_v1.cjs)', file=sys.stderr)
        return 2
    lines = World(W.load()).trace()
    data = text_of(lines).encode('utf-8')
    digest = hashlib.sha256(data).hexdigest()
    if check:
        same = os.path.exists(OUT) and open(OUT, 'rb').read() == data
        if not same:
            print('MISMATCH: pages_v1.txt', file=sys.stderr)
            return 1
        print(f'trace matches: pages_v1.txt ({len(lines)} lines, sha256 {digest[:16]})')
        return 0
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'wb') as f:
        f.write(data)
    print(f'pages_v1.txt: {len(lines)} lines, {len(data)} bytes, sha256 {digest}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
