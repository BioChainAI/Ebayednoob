"""Write the Stage-2 trace the browser core must reproduce line for line (PREREGISTRATION.md Amendment 13 item 1: "After
the decisive run, lexicon_core.js reproduces the rational keys and the tie-class lists (BigInt fixed point at 1,024 bits
for the square roots), compared by SHA-256 on Rng(8000 + i) traces and on the decisive pass-1 code files"):

    traces/stage2_v1.txt   18 cases, case i from Rng(8000 + i), i = 0..17, scored by lexicon.scores2 exactly as pass 1
                           scores (run_claims_stage2.pair_value, code_values and write_code_file's text and side file);
                           lexicon_stage2.js's stage2TraceLines() regenerates every line, header included
                           (tests/parity-stage2.cjs --trace)

    python3 -B traces_stage2.py            (from this folder)
    python3 -B traces_stage2.py --check    rebuild in memory and compare bytes with the committed file (exit 0 equal,
                                           1 different)

The cases:
    i = 0..7    tree      12 + below(13) words drawn in the letter tree (prefixes and extensions of earlier words among
                          them, so that G = 0 and G's numerical ties occur), placed by H3, H2, F3, F3*, F2 and F2*
                          (scores2.h3_table, h2_table, flat_table); 10 + below(11) rows, each two sense lists of 1 +
                          below(3) distinct words (rng.sample); every arm scores the lists G max, Grev max, DepG max, Dep
                          max, G first, G gensim, Dep first, Dep gensim, G max in both directions (a 'dir' file) and Sym
                          max and first
    i = 8..11   learned   16 + below(17) integer rows of dimension 2 + i mod 2 (duplicates, signed coordinate
                          permutations, the origin, rows within 2^35 of the rim |n|^2 = 4^32, and uniform rows), read as a
                          learned Lorentz and a learned Euclidean table (scores2.lorentz_table, euclid_table); HiT-like
                          slot lists (a child and 21 slots per row, repeats allowed) and sense rows (G max, DepG max, G max
                          in both directions, Sym max)
    i = 12..15  planted   one list per certified form (hG, hDep, fG, fDep) with planted numerical ties (swapped
                          entries, e^G = 1 and e^Dep = 1 and Dep = 0 on different tuples, integer square roots with equal
                          sums), an equal tuple, and near-ties at 10^-e for e drawn from NEAR (decided at 120 digits, at
                          240 digits, or tied there); the running maximum (phi), its ties, then the tie classes; and a
                          chained tie for hDep and fDep (scores2.ChainedTieError must be raised)
    i = 16..17  inputs    K3's words of drawn lemmas (address.k3_word), N_S of drawn strings, S-full's convention
                          (scores2.sfull_table) under a permutation drawn from the case's Rng, W's lemma shuffle
                          (scores2.w_map on a drawn index, seed 8000 + i), WordNet's integers on a drawn DAG
                          (wngraph.WNGraph: G, Sym, Dep) and GloVe's exact cosine key of drawn decimal vectors
                          (glove.parse_vector, cos_key)

The draws, all from one Rng(8000 + i), in the order the code below makes them (lexicon_stage2.js repeats them; Python
evaluates call arguments left to right as JavaScript does). Lines: '#' comments, then space-separated fields; exact
values are Python's str of a Fraction ('p/q', or 'p' when q = 1); tuples are comma-joined; '<tsv>' is the SHA-256 of
the code file's text as pass 1 writes it (rows numbered 0, 1, ...), '<side>' the SHA-256 of the side file's content
without its decimal strings: json.dumps([entries, phi_ties], separators=(',', ':')) with entries [item, count, tuple,
code, tied, row, slot] and phi_ties [tuple a, tuple b].

READING (A13.1, "Rng(8000 + i) traces"): case i draws everything from Rng(8000 + i), i = 0..17, the literal seeds of
the traces (Amendment 1 item 10; Amendment 10 item 11's L6 trace draws from the same family): no claim uses them, no
registered seed is drawn and no Stage-2 data (WordNet's nouns, a pinned set, a table) is read. W's lemma shuffle takes
a seed (scores2.w_map(index, seed)); case i passes 8000 + i, a second generator of the same family.
Nothing here decides a claim.
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
from hpstep.prng import Rng  # noqa: E402
from hpstep.problems import children  # noqa: E402
from lexicon import address as AD  # noqa: E402
from lexicon import glove as GL  # noqa: E402
from lexicon import scores2 as SC  # noqa: E402
from lexicon import senses as SE  # noqa: E402
from lexicon import wngraph as WG  # noqa: E402

OUT = os.path.join(HERE, 'traces')
NAME = 'stage2_v1.txt'
SEED = 8000
TREE, LEARNED, PLANTED, INPUTS = range(0, 8), range(8, 12), range(12, 16), range(16, 18)
ARMS = ('H3', 'H2', 'F3', 'F3*', 'F2', 'F2*')
LISTS = (('G', 'max', 'pair'), ('Grev', 'max', 'pair'), ('DepG', 'max', 'pair'), ('Dep', 'max', 'pair'),
         ('G', 'first', 'pair'), ('G', 'gensim', 'pair'), ('Dep', 'first', 'pair'), ('Dep', 'gensim', 'pair'),
         ('G', 'max', 'dir'), ('Sym', 'max', 'pair'), ('Sym', 'first', 'pair'))
LEARNED_LISTS = (('G', 'max', 'pair'), ('DepG', 'max', 'pair'), ('G', 'max', 'dir'), ('Sym', 'max', 'pair'))
NEAR = (40, 100, 104, 108, 112, 116, 150, 200, 224, 228, 232, 236, 260, 300)
ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-.0123456789 '
HEAD = [
    '# stage2_v1: Stage 2\'s exact keys, certified values, comparison and tie classes (A13.1, A13.4-A13.6, A13.8),',
    '# scored by lexicon.scores2 as pass 1 scores. Case i from Rng(8000 + i): i < 8 tree (H3, H2, F3, F3*, F2, F2*),',
    '# i < 12 learned (Lorentz, Euclidean), i < 16 planted lists per certified form, i < 18 the inputs (K3, N_S,',
    '# S-full, W, WordNet\'s integers, GloVe\'s key). "<i> node <arm> <key> <x0 or |s|^2>"; "<i> row <arm> <r> <G max',
    '# tuple> <DepG tuple> <Sym max key>"; "<i> codes <arm> <form> <rule> <kind> <classes> <distinct> <recomputed>',
    '# <tie classes> <tie tuples> <phi recomputed> <phi ties> <tsv sha256> <side sha256>"; "<i> tuple <form> <j>',
    '# <tuple>"; "<i> phi <form> <index> <ties> <recomputed>"; "<i> list <form> <codes> <classes> <distinct>',
    '# <recomputed> <tie classes> <tie tuples> <recomputed> <side sha256>"; "<i> chained <form> <n> raised";',
    '# "<i> k3 <lemma> <word>"; "<i> ns <hex of s> <N_S(s)>"; "<i> sfull <key> <x0>"; "<i> wmap <lemma> <lemma>";',
    '# "<i> wn <s> <t> <G> <Sym> <Dep>"; "<i> glove <x> <y> <key>" (vectors as comma-joined decimals).',
]


def q(x):
    return str(Fraction(x))


def tq(tup):
    return ','.join(q(x) for x in tup)


def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def word_of(rng, L):
    w = [rng.below(6)]
    while len(w) < L:
        w.append(children(w)[rng.below(5)])
    return tuple(w)


def tree_words(rng, n):
    words = []
    for j in range(n):
        t = rng.below(4)
        if j and t == 0:                         # a prefix of an earlier word: an ancestor in the letter tree
            src = words[rng.below(j)]
            words.append(src[:1 + rng.below(len(src))])
        elif j and t == 1:                       # an extension of an earlier word: a descendant
            w = list(words[rng.below(j)])
            for _ in range(1 + rng.below(3)):
                w.append(children(w)[rng.below(5)])
            words.append(tuple(w))
        else:
            words.append(word_of(rng, 1 + rng.below(8)))
    return {f's{j:02d}': w for j, w in enumerate(words)}


def sense_rows(rng, keys):
    rows = []
    for _ in range(10 + rng.below(11)):
        a = [keys[k] for k in rng.sample(len(keys), 1 + rng.below(3))]
        b = [keys[k] for k in rng.sample(len(keys), 1 + rng.below(3))]
        rows.append((a, b))
    return rows


# ================================================================ pass 1's lists (run_claims_stage2.pair_value, ...)
def pair_value(sc, form, rule, sx, sy):
    if form in ('G', 'Grev'):
        return {'max': sc.phi_g, 'first': sc.first_g, 'gensim': sc.gensim_g}[rule](sx, sy)
    if form == 'DepG':
        return sc.dep_circ(sx, sy)
    if form == 'Dep':
        return {'max': sc.phi_dep, 'first': sc.first_dep, 'gensim': sc.gensim_dep}[rule](sx, sy)
    return {'max': sc.phi_sym, 'first': sc.first_sym}[rule](sx, sy)


def code_text(kind, n, codes, slots=21):
    if kind == 'pair':
        return ''.join(f'{r}\t{codes[r]}\n' for r in range(n))
    if kind == 'dir':
        return ''.join(f'{r}\t{codes[r]}\t{codes[n + r]}\n' for r in range(n))
    return ''.join(f'{r}\t{s}\t{codes[r * slots + s]}\n' for r in range(n) for s in range(slots))


def item_of(kind, n, slots=21):
    if kind == 'pair':
        return [(r, None) for r in range(n)]
    if kind == 'dir':
        return [(r, 'f') for r in range(n)] + [(r, 'r') for r in range(n)]
    return [(r, s) for r in range(n) for s in range(slots)]


def side_sha(entries, cert, items):
    ent = [[e['item'], e['count'], e['tuple'], e['code'], e['tied'], items[e['item']][0], items[e['item']][1]]
           for e in entries]
    ties = [[[str(x) for x in a.tup], [str(x) for x in b.tup]] for a, b, _, _ in cert.ties]
    return sha(json.dumps([ent, ties], separators=(',', ':')))


def codes_line(i, arm, form, rule, kind, n, flat, cert, cert_form):
    """One code file's line: its counts, its text's SHA-256 and its side file's (decimal strings dropped)."""
    if cert_form:
        tc = cert.tie_classes(flat)
        codes, info = tc.codes, (tc.n_classes, tc.n_distinct, tc.recomputed, tc.tie_classes, tc.tie_tuples)
        side = tc.side
    else:
        codes = SC.codes_from_keys(flat)
        info = ((max(codes) + 1) if codes else 0, len(set(codes)), 0, 0, 0)
        side = []
    return (f'{i} codes {arm} {form} {rule} {kind} ' + ' '.join(str(x) for x in info)
            + f' {cert.recomputed} {cert.n_ties} {sha(code_text(kind, n, codes))} {side_sha(side, cert, item_of(kind, n))}')


def score_lists(i, arm, table, rows, lists, out):
    for form, rule, kind in lists:
        cert = SC.Certifier()
        sc = SC.Scorer(table, cert)
        if form == 'Grev':
            fw = [pair_value(sc, 'G', rule, b, a) for a, b in rows]
        else:
            fw = [pair_value(sc, form, rule, a, b) for a, b in rows]
        flat = fw + ([pair_value(sc, form, rule, b, a) for a, b in rows] if kind == 'dir' else [])
        out.append(codes_line(i, arm, form, rule, kind, len(rows), flat, cert, form != 'Sym'))


def row_lines(i, arm, table, rows, out):
    sc = SC.Scorer(table, SC.Certifier())
    for r, (a, b) in enumerate(rows):
        out.append(f'{i} row {arm} {r} {tq(sc.phi_g(a, b).tup)} {tq(sc.dep_circ(a, b).tup)} {q(sc.phi_sym(a, b))}')


# ================================================================ the cases
def tree_case(i, rng, out):
    words = tree_words(rng, 12 + rng.below(13))
    keys = list(words)
    rows = sense_rows(rng, keys)
    out.append(f'{i} case tree {len(keys)} {len(rows)}')
    for k in keys:
        out.append(f'{i} word {k} ' + ''.join(str(g) for g in words[k]))
    tables = {'H3': SC.h3_table(words), 'H2': SC.h2_table(words), 'F3': SC.flat_table(words, 3),
              'F3*': SC.flat_table(words, 3, star=True), 'F2': SC.flat_table(words, 2),
              'F2*': SC.flat_table(words, 2, star=True)}
    for arm in ARMS:
        t = tables[arm]
        for k in keys:
            out.append(f'{i} node {arm} {k} {q(t.x0(k) if t.kind == "h" else t.sq(k))}')
        row_lines(i, arm, t, rows, out)
        score_lists(i, arm, t, rows, LISTS, out)


def learned_case(i, rng, out):
    d = 2 + i % 2
    n = 16 + rng.below(17)
    N = []
    for j in range(n):
        t = rng.below(8)
        if j and t == 0:
            N.append(N[rng.below(j)])
        elif j and t == 1:
            src = N[rng.below(j)]
            perm = rng.shuffle(list(range(d)))
            row = []
            for k in range(d):
                row.append(-src[perm[k]] if rng.below(2) else src[perm[k]])
            N.append(tuple(row))
        elif t == 2:
            N.append((0,) * d)
        elif t == 3:
            m = 2 ** 32 - 1 - rng.below(8)
            N.append((m, rng.below(4)) + (0,) * (d - 2))
        else:
            N.append(tuple(rng.below(2 ** 31 + 1) - 2 ** 30 for _ in range(d)))
    keys = [f'n{j:02d}' for j in range(n)]
    hit = []
    for _ in range(6 + rng.below(7)):
        child = keys[rng.below(n)]
        hit.append((child, [keys[rng.below(n)] for _ in range(21)]))
    rows = sense_rows(rng, keys)
    out.append(f'{i} case learned {d} {n} {len(hit)} {len(rows)}')
    for k, row in zip(keys, N):
        out.append(f'{i} snap {k} ' + ' '.join(str(x) for x in row))
    for arm, t in (('lorentz', SC.lorentz_table(keys, N)), ('euclid', SC.euclid_table(keys, N))):
        for k in keys:
            out.append(f'{i} node {arm} {k} {q(t.x0(k) if t.kind == "h" else t.sq(k))}')
        cert = SC.Certifier()
        sc = SC.Scorer(t, cert)
        flat = [v for child, slots in hit for v in sc.slot_vals(child, slots)]
        out.append(codes_line(i, arm, 'G', '-', 'hit', len(hit), flat, cert, True))
        row_lines(i, arm, t, rows, out)
        score_lists(i, arm, t, rows, LEARNED_LISTS, out)


def ge1(rng):
    d = 1 + rng.below(1000)
    return Fraction(d + rng.below(10 ** 6), d)


def ge0(rng):
    return Fraction(rng.below(10 ** 6), 1 + rng.below(1000))


def planted_tuples(rng, form):
    if form == 'hG':
        tups = [(ge1(rng), ge1(rng), ge1(rng)) for _ in range(4 + rng.below(4))]
        a, b, k = tups[0]
        tups.append((a, k, b))                                   # E(b) E(k) commutes: the same value
        z1, z2 = ge1(rng), ge1(rng)
        tups += [(z1, z1, Fraction(1)), (z2, z2, Fraction(1))]   # e^G = 1 exactly, on different tuples
    elif form == 'hDep':
        tups = [(ge1(rng), ge1(rng)) for _ in range(4 + rng.below(4))]
        z1, z2 = ge1(rng), ge1(rng)
        tups += [(z1, z1), (z2, z2)]                             # e^Dep = 1 exactly
    elif form == 'fG':
        tups = [(ge0(rng), ge0(rng), ge0(rng)) for _ in range(4 + rng.below(4))]
        a, b, c = tups[0]
        tups.append((a, c, b))                                   # sqrt(b) + sqrt(c) commutes
        p, r_, s_ = rng.below(50), rng.below(50), rng.below(50)
        t = 1 + rng.below(5)
        tups += [(Fraction(p * p), Fraction(r_ * r_), Fraction(s_ * s_)),
                 (Fraction((p + t) ** 2), Fraction((r_ + t) ** 2), Fraction(s_ * s_))]   # equal integer sums
    else:
        tups = [(ge0(rng), ge0(rng)) for _ in range(4 + rng.below(4))]
        p, r_ = rng.below(50), rng.below(50)
        t = 1 + rng.below(5)
        a1, a2 = ge0(rng), ge0(rng)
        tups += [(Fraction(p * p), Fraction(r_ * r_)), (Fraction((p + t) ** 2), Fraction((r_ + t) ** 2)),
                 (a1, a1), (a2, a2)]                             # equal integer differences; Dep = 0 twice
    tups.append(tups[1])                                         # an equal tuple: tied with no computation
    for _ in range(3):
        e = NEAR[rng.below(len(NEAR))]
        base = tups[rng.below(len(tups))]
        tups.append((base[0] + Fraction(1, 10 ** e),) + tuple(base[1:]))
    return tups


def chained_tuples(form):
    """Three values, consecutive ones within the sum of their 240-digit bounds, the ends not: a chained tie."""
    if form == 'hDep':
        eps = Fraction(1125, 10 ** 233)                          # e^Dep = E(5/4 + k eps), relative steps 1.5e-230
        return [(Fraction(5, 4) + k * eps, Fraction(1)) for k in range(3)]
    delta = Fraction(15, 10 ** 231)                              # sqrt((1 + k delta)^2) - 0, steps 1.5e-230
    return [((1 + k * delta) ** 2, Fraction(0)) for k in range(3)]


def planted_case(i, rng, out):
    out.append(f'{i} case planted')
    for form in SC.FORMS:
        tups = planted_tuples(rng, form)
        vals = [SC.Val(form, t) for t in tups]
        for j, t in enumerate(tups):
            out.append(f'{i} tuple {form} {j} {tq(t)}')
        cert = SC.Certifier()
        best = cert.phi(vals)
        out.append(f'{i} phi {form} {best} {cert.n_ties} {cert.recomputed}')
        tc = cert.tie_classes(vals)
        items = [(j, None) for j in range(len(vals))]
        out.append(f'{i} list {form} ' + ','.join(str(c) for c in tc.codes)
                   + f' {tc.n_classes} {tc.n_distinct} {tc.recomputed} {tc.tie_classes} {tc.tie_tuples} {cert.recomputed}'
                   + f' {side_sha(tc.side, cert, items)}')
    for form in ('hDep', 'fDep'):
        vals = [SC.Val(form, t) for t in chained_tuples(form)]
        try:
            SC.Certifier().tie_classes(vals)
            out.append(f'{i} chained {form} {len(vals)} not-raised')
        except SC.ChainedTieError:
            out.append(f'{i} chained {form} {len(vals)} raised')


class _Entry:
    def __init__(self, offsets):
        self.offsets = offsets


def draw_text(rng, n):
    return ''.join(ALPHA[rng.below(len(ALPHA))] for _ in range(n))


def inputs_case(i, rng, out):
    out.append(f'{i} case inputs')
    for _ in range(8):                                           # K3's words
        lemma = draw_text(rng, 1 + rng.below(12)).replace(' ', '_')
        out.append(f'{i} k3 {lemma} ' + ''.join(str(g) for g in AD.k3_word(lemma)))
    for _ in range(6):                                           # N_S
        s = draw_text(rng, 1 + rng.below(16))
        out.append(f'{i} ns {s.encode("utf-8").hex()} {SE.N_S(s)}')
    words = tree_words(rng, 8 + rng.below(5))                    # S-full's convention on a small H3 table
    t = SC.h3_table(words)
    offsets = sorted(words)
    P = rng.shuffle(list(range(len(offsets))))
    moved = SC.sfull_table(t, offsets, P)
    out.append(f'{i} perm ' + ','.join(str(p) for p in P))
    for k in offsets:
        out.append(f'{i} sfull {k} {q(moved.x0(k))}')
    index = {}                                                   # W's lemma shuffle on a drawn index
    for _ in range(30 + rng.below(30)):
        lemma = draw_text(rng, 1 + rng.below(6)).replace(' ', '_').lower()
        index[lemma] = _Entry([f'{j:08d}' for j in range(1 + rng.below(12))])
    wm = SC.w_map(index, SEED + i)
    for lemma in sorted(index):
        out.append(f'{i} wmap {lemma} {wm[lemma]}')
    n = 12 + rng.below(10)                                       # WordNet's integers on a drawn DAG
    parents = {'v00': ()}
    for j in range(1, n):
        p1 = rng.below(j)
        ps = [f'v{p1:02d}']
        if rng.below(3) == 0:
            p2 = rng.below(j)
            if p2 != p1:
                ps.append(f'v{p2:02d}')
        parents[f'v{j:02d}'] = tuple(ps)
    g = WG.WNGraph(parents, 'v00')
    for _ in range(10):
        s, u = f'v{rng.below(n):02d}', f'v{rng.below(n):02d}'
        out.append(f'{i} wn {s} {u} {g.g(s, u)} {g.sym(s, u)} {g.dep(s, u)}')
    for _ in range(6):                                           # GloVe's exact key
        dim = 3 + rng.below(4)
        vx, vy = [], []
        for vec in (vx, vy):
            for _ in range(dim):
                t = ('-' if rng.below(2) else '') + str(1 + rng.below(99))
                nd = rng.below(8)
                if nd:
                    t += '.' + ''.join(str(rng.below(10)) for _ in range(nd))
                if rng.below(3) == 0:
                    t += 'e' + str(rng.below(7) - 3)
                vec.append(t)
        key = GL.cos_key(GL.parse_vector(vx), GL.parse_vector(vy))
        out.append(f'{i} glove {",".join(vx)} {",".join(vy)} {q(key)}')


def trace():
    lines = list(HEAD)
    for i in range(18):
        rng = Rng(SEED + i)
        if i in TREE:
            tree_case(i, rng, lines)
        elif i in LEARNED:
            learned_case(i, rng, lines)
        elif i in PLANTED:
            planted_case(i, rng, lines)
        else:
            inputs_case(i, rng, lines)
    return lines


def text_of(lines):
    return '\n'.join(lines) + '\n'


def main():
    lines = trace()
    text = text_of(lines)
    path = os.path.join(OUT, NAME)
    if '--check' in sys.argv[1:]:
        if not os.path.exists(path) or open(path, 'rb').read() != text.encode('utf-8'):
            print(f'MISMATCH: {NAME}', file=sys.stderr)
            return 1
        print(f'trace matches: {NAME} ({len(lines)} lines, sha256 {sha(text)[:16]})')
        return 0
    os.makedirs(OUT, exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print(f'{NAME}: {len(lines)} lines, {len(text.encode())} bytes, sha256 {sha(text)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
