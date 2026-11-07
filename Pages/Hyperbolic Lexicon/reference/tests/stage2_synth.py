"""A synthetic Stage-2 world for run_claims_stage2.py --selftest and tests/test_stage2_runner.py (build spec sections 11
and 13): a small WordNet-like lexicon and every Stage-2 file in its pinned format, with invented words, its own pins
and the counts the generator planted. No line, word or rating of any Stage-2 file is used.

    lexicon(seed)                 {'synsets': {pos: {offset: Synset}}, 'index': {pos: {lemma: IndexEntry}}}
                                  nouns: one root at 00001740 (entity.n.01's offset, so that address.noun_words and
                                  wngraph.noun_graph accept it), '@' pointers with some second parents, a few
                                  instance-only synsets ('@i' only, outside U_@), polysemous lemmas, one multiword
                                  lemma; verbs: a forest with several roots and a few isolated verbs
    make_world(root, seed)        writes root/<pin name>/<file> for every pin of golden/stage2_pins_v1.json's names and
                                  returns a World: .wn, .pins, .store(verify), .expected (the planted counts, keyed as
                                  stage2data's and hit's count checks)

Seeds: Python's random.Random(seed) builds the lexicon and random.Random(seed - 9) the files; hit.hit_r draws HiT's
val and test rows with hpstep.prng.Rng(seed - 4 .. seed - 2). The default seed 95499 and those four lie in the
tests' range 95200 + i (A13.12); the self-test's own seeds are run_claims_stage2.SELFTEST_SEEDS.
"""
import hashlib
import io
import json
import os
import random
import zipfile

from lexicon import hit as HIT
from lexicon import senses as SE
from lexicon import stage2data as S2D
from lexicon import wordnet as W

SEED = 95499
ROOT = W.ENTITY                     # 00001740
SYLLABLES = ('ka', 'zo', 'ri', 'mu', 'te', 'pla', 'vor', 'qui', 'ne', 'sha', 'dro', 'fen', 'gu', 'lix', 'bo', 'tre',
             'wy', 'jan', 'pe', 'sul')
OOV = ('xyzzy', 'plughk', 'frobb')
HL_TYPES = S2D.HL_TYPES
GLOVE_DIMS = (300, 50)


def _words(rnd, k, taken):
    out = []
    while len(out) < k:
        w = ''.join(rnd.choice(SYLLABLES) for _ in range(rnd.choice((2, 2, 3))))
        if w not in taken and w not in OOV:
            taken.add(w)
            out.append(w)
    return out


def lexicon(seed=SEED, n_nouns=72, n_instance=5, n_verbs=44, n_vroots=5, n_visolated=3):
    """The synthetic WordNet (deterministic in seed). Offsets are 8-digit strings: nouns 00001740 (the root) and
    10000000 + 37 i, verbs 20000000 + 41 i."""
    rnd = random.Random(seed)
    taken = set()
    npool = _words(rnd, 46, taken)
    npool[5] = npool[5] + '_' + npool[6]          # one multiword lemma (a space in the data files, '_' in the index)
    vpool = _words(rnd, 24, taken) + npool[:6]     # some words are nouns and verbs
    noffs = [ROOT] + [f'{10000000 + 37 * i:08d}' for i in range(1, n_nouns)]
    nouns, nlem = {}, {}
    for i, o in enumerate(noffs):
        if i == 0:
            ptrs, lem = [], ['entity']
        elif i >= n_nouns - n_instance:                       # instance-only leaves: '@i' alone, outside U_@
            ptrs = [('@i', noffs[rnd.randrange(1, i)], 'n')]
            lem = [rnd.choice(npool)]
        else:
            p = rnd.randrange(max(0, i - 6), i) if rnd.random() < 0.75 else rnd.randrange(0, i)
            ps = [p]
            if i > 3 and rnd.random() < 0.15:
                q = rnd.randrange(0, i)
                if q != p:
                    ps.append(q)
            ptrs = [('@', noffs[x], 'n') for x in ps]
            lem = rnd.sample(npool, rnd.choice((1, 1, 2)))
        nouns[o] = W.Synset('noun', 'n', o, lem, ptrs, f'gloss {i}')
        for w in lem:
            nlem.setdefault(w, []).append(o)
    voffs = [f'{20000000 + 41 * i:08d}' for i in range(n_verbs)]
    verbs, vlem = {}, {}
    for i, o in enumerate(voffs):
        if i < n_vroots or i >= n_verbs - n_visolated:
            ptrs = []
        else:
            ptrs = [('@', voffs[rnd.randrange(max(0, i - 5), i)], 'v')]
        lem = rnd.sample(vpool, rnd.choice((1, 1, 2)))
        verbs[o] = W.Synset('verb', 'v', o, lem, ptrs, f'vgloss {i}')
        for w in lem:
            vlem.setdefault(w, []).append(o)
    index = {}
    for pos, lem in (('noun', nlem), ('verb', vlem)):
        idx = {}
        for w in sorted(lem):
            offs = list(lem[w])
            rnd.shuffle(offs)                                 # sense order
            idx[w] = W.IndexEntry(w, 0, offs)
        index[pos] = idx
    return {'synsets': {'noun': nouns, 'verb': verbs}, 'index': index}


# ================================================================ the files
def _sha(b):
    return hashlib.sha256(b).hexdigest()


def _zip(members):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for m, b in members.items():
            info = zipfile.ZipInfo(m, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, b)
    return buf.getvalue()


class World:
    def __init__(self, root, wn, pins, expected, words):
        self.root, self.wn, self.pins, self.expected, self.words = root, wn, pins, expected, words

    def store(self, verify=True):
        return S2D.Store(root=self.root, pins=self.pins, verify=verify)


def _ancestors(wn, pos):
    syn = wn['synsets'][pos]
    anc = {}

    def visit(o):
        if o in anc:
            return anc[o]
        s = set()
        anc[o] = s
        for sym, p, _ in syn[o].ptrs:
            if sym in ('@', '@i'):
                s.add(p)
                s |= visit(p)
        return s
    for o in syn:
        visit(o)
    return anc


def _relation(wn, pos, anc, x, y):
    """('hyp', k) when some sense of y is a strict ancestor of some sense of x (k the fewest '@'/'@i' steps, at most
    4); ('r-hyp', k) the other way; None otherwise."""
    idx = wn['index'][pos]
    syn = wn['synsets'][pos]

    def steps(s, t):
        frontier, k, seen = [s], 0, {s}
        while frontier:
            k += 1
            nxt = []
            for a in frontier:
                for sym, p, _ in syn[a].ptrs:
                    if sym in ('@', '@i') and p not in seen:
                        if p == t:
                            return k
                        seen.add(p)
                        nxt.append(p)
            frontier = nxt
        return None
    if x not in idx or y not in idx:
        return None
    for kind, a, b in (('hyp', x, y), ('r-hyp', y, x)):
        best = None
        for s in idx[a].offsets:
            for t in idx[b].offsets:
                if t in anc[s]:
                    k = steps(s, t)
                    best = k if best is None else min(best, k)
        if best is not None:
            return kind, min(best, 4)
    return None


def make_world(root, seed=SEED):
    """Writes every pinned file of the synthetic world under root/<pin name>/ and returns a World. Deterministic in
    seed: the same bytes on every call."""
    wn = lexicon(seed)
    rnd = random.Random(seed - 9)                  # 95490 by default: the world's block 95490-95499 (A13.12)
    nidx, vidx = wn['index']['noun'], wn['index']['verb']
    nlem = sorted(w for w in nidx if w != 'entity')
    vlem = sorted(vidx)
    nanc, vanc = _ancestors(wn, 'noun'), _ancestors(wn, 'verb')
    g = SE.at_graph(wn)
    gv = SE.at_graph(wn, 'verb')
    U_at, V_at = set(g.nodes), set(gv.nodes)
    exp = {}

    def data_word(w):
        return w.replace('_', ' ')

    def pick(lems, oov_rate=0.0):
        if rnd.random() < oov_rate:
            return rnd.choice(OOV)
        return rnd.choice(lems)

    def covered_in(w, idx, U=None):
        e = idx.get(SE.N_S(w))
        return e is not None and (U is None or any(o in U for o in e.offsets))

    # ---------------------------------------------------------------- HyperLex
    hl_rows, n_types, v_hyp = [], {t: 0 for t in HL_TYPES}, 0
    seen = set()
    while len(hl_rows) < 46:
        anchor = rnd.choice(nlem)
        e = nidx[anchor]
        anc_lem = sorted({lm for s in e.offsets for a in nanc[s] for lm in wn['synsets']['noun'][a].lemmas})
        if anc_lem and rnd.random() < 0.5:
            x, y = anchor, rnd.choice(anc_lem)
        else:
            x, y = anchor, rnd.choice(nlem)
        if rnd.random() < 0.25:
            x, y = y, x
        if x == y or (x, y) in seen or ' ' in data_word(x) or ' ' in data_word(y):
            continue
        seen.add((x, y))
        hl_rows.append(('N', x, y))
    hl_rows[3] = ('N', hl_rows[3][1], OOV[0])                 # an uncovered noun row
    hl_rows[7] = ('N', hl_rows[7][1].capitalize(), hl_rows[7][2])   # N_S lower-cases it
    vrows = []
    while len(vrows) < 18:
        x = rnd.choice(vlem)
        vanc_lem = sorted({lm for s in vidx[x].offsets for a in vanc[s] for lm in wn['synsets']['verb'][a].lemmas})
        y = rnd.choice(vanc_lem) if (vanc_lem and len(vrows) % 2 == 0) else rnd.choice(vlem)
        if x == y or '_' in x or '_' in y:
            continue
        vrows.append(('V', x, y))
    vrows[2] = ('V', OOV[1], vrows[2][2])
    rows = hl_rows + vrows
    rnd.shuffle(rows)
    lines = []
    for pos, x, y in rows:
        rel = _relation(wn, 'noun' if pos == 'N' else 'verb', nanc if pos == 'N' else vanc, SE.N_S(x), SE.N_S(y))
        if rel is not None:
            typ = f'{rel[0]}-{rel[1]}'
        else:
            typ = rnd.choice(('cohyp', 'mero', 'syn', 'ant', 'no-rel'))
        base = {'hyp': 4.6, 'r-hyp': 2.4}.get(typ.rsplit('-', 1)[0] if typ.startswith(('hyp', 'r-hyp')) else '', 0.8)
        avg = round(min(6.0, base + rnd.random() * 1.4), 2)
        scores = ' '.join(str(rnd.randrange(0, 7)) for _ in range(rnd.choice((5, 6))))
        lines.append(f'{x} {y} {pos} {typ} {avg:.2f} {avg * 10 / 6:.2f} {rnd.random():.2f} {scores}')
        if pos == 'N':
            n_types[typ] += 1
        elif typ.startswith('hyp-'):
            v_hyp += 1
    hl_head = S2D.HL_HEADER
    hl_all = (hl_head + '\n' + '\n'.join(lines) + '\n').encode()
    nouns_txt = (hl_head + '\n' + '\n'.join(ln for ln in lines if ln.split(' ')[2] == 'N') + '\n').encode()
    split_idx = sorted(rnd.sample(range(len(lines)), 20))
    split_lines = [lines[i] for i in split_idx]
    split_txt = (hl_head + '\n' + '\n'.join(split_lines) + '\n').encode()
    rnd_lines = ['\t'.join(S2D.HL_RND_HEADER)]
    for ln in split_lines:
        f = ln.split(' ')
        rnd_lines.append('\t'.join([f[0], f[1], f[2], f[3], f[4], 'test']))
    for i in range(5):
        f = lines[i].split(' ')
        rnd_lines.append('\t'.join([f[0], f[1], f[2], f[3], f[4], 'val']))
    hl_n = [r for r in rows if r[0] == 'N']
    exp.update({'hl.rows': len(rows), 'hl.N': len(hl_n),
                'hl.covered_full': sum(1 for _, x, y in hl_n if covered_in(x, nidx) and covered_in(y, nidx)),
                'hl.covered_at': sum(1 for _, x, y in hl_n if covered_in(x, nidx, U_at) and covered_in(y, nidx, U_at)),
                'hl.N_words_equal_nouns_file': True})
    exp_gold = {'hl.type': dict(n_types), 'hl.N_lines_equal_nouns_file': True}
    exp_dry = {'hl.V': len(vrows), 'hl.V_covered_index_verb': sum(1 for _, x, y in vrows
                                                                   if SE.N_S(x) in vidx and SE.N_S(y) in vidx)}
    exp_dry_gold = {'hl.V_hyp_rows': v_hyp}

    # ---------------------------------------------------------------- the suite
    def label(x, y):
        r = _relation(wn, 'noun', nanc, SE.N_S(x), SE.N_S(y))
        return r is not None and r[0] == 'hyp'
    concepts = []
    for w in nlem:
        if any(nanc[s] for s in nidx[w].offsets) and '_' not in w and len(concepts) < 6:
            concepts.append(w)
    bless = [('word1', 'word2', 'label', 'fold')]
    for c in concepts:
        ancs = sorted({lm for s in nidx[c].offsets for a in nanc[s] for lm in wn['synsets']['noun'][a].lemmas
                       if '_' not in lm})
        for k in range(9):
            y = rnd.choice(ancs) if (k % 3 == 0 and ancs) else pick([w for w in nlem if '_' not in w])
            bless.append((c, y, str(label(c, y)), 'test' if k < 7 else 'val'))
    bless.append((concepts[0], concepts[0], 'False', 'test'))          # a self-pair
    bless.append(bless[2])                                              # a repeated pair
    bless.append((concepts[1], OOV[2], 'False', 'test'))               # uncovered
    # A13.11's positives that are not WordNet closure pairs (L13's reported AP and direction on them): one True test
    # row whose pair is a closure pair in neither direction, chosen without a draw so that the rest of the world stays
    # as it was
    nc_bd = next(w for w in nlem if '_' not in w and w not in concepts and covered_in(w, nidx)
                 and not label(concepts[2], w) and not label(w, concepts[2]))
    bless.append((concepts[2], nc_bd, 'True', 'test'))
    bl = bless[1:]
    btest = [r for r in bl if r[3] == 'test']
    exp.update({'bd.rows': len(bl), 'bd.test': len(btest),
                'bd.test_covered': sum(1 for r in btest if covered_in(r[1], nidx) and covered_in(r[0], nidx))})
    exp_gold.update({'bd.test_true': sum(1 for r in btest if r[2] == 'True'),
                     'bd.test_covered_true': sum(1 for r in btest if r[2] == 'True' and covered_in(r[1], nidx))})
    wbless = [('word1', 'word2', 'label', 'relation', 'fold')]
    for k in range(26):
        c = concepts[k % len(concepts)]
        y = pick([w for w in nlem if '_' not in w and w not in concepts])
        if k % 2:
            x, y2 = c, y
        else:
            x, y2 = y, c
        lab = label(x, y2)
        rel = 'hyper' if lab else ('rhyper' if label(y2, x) else 'other')
        wbless.append((x, y2, str(lab), rel, 'test' if k < 20 else 'val'))
    nc_wb = next(w for w in nlem if '_' not in w and w not in concepts and w != nc_bd and covered_in(w, nidx)
                 and not label(concepts[3], w) and not label(w, concepts[3]))
    wbless.append((concepts[3], nc_wb, 'True', 'hyper', 'test'))        # a non-closure positive (as in BLESS)
    wl = wbless[1:]
    wt = [r for r in wl if r[4] == 'test']
    exp.update({'wb.rows': len(wl), 'wb.test': len(wt), 'wb.test_covered': len(wt)})
    exp_gold.update({'wb.test_true': sum(1 for r in wt if r[2] == 'True')})

    def simple(n, folds=('test', 'val')):
        out = []
        for k in range(n):
            x, y = pick([w for w in nlem if '_' not in w]), pick([w for w in nlem if '_' not in w], 0.05)
            out.append((x, y, str(label(x, y)), folds[0] if k % 4 else folds[1]))
        return out
    leds = [('word1', 'word2', 'label', 'fold')] + simple(16)
    shw = [('word1', 'word2', 'label', 'fold')] + simple(20)
    ev = [('word1', 'word2', 'label', 'relation', 'fold')]
    for x, y, lab, fold in simple(14):
        ev.append((x, y, lab, 'hypernym' if lab == 'True' else 'coordinate', fold))
    ev.append((ev[1][0], ev[1][1], 'False' if ev[1][2] == 'True' else 'True', 'antonym', ev[1][4]))  # both labels
    bib = [('word1', 'word2', 'relation', 'label')]
    for x, y, lab, _ in simple(16):
        r = _relation(wn, 'noun', nanc, SE.N_S(x), SE.N_S(y))
        val = 0 if r is None else (1 if r[0] == 'hyp' else -1)
        bib.append((x, y, {1: 'hyper', -1: 'rhyper', 0: 'other'}[val], str(val)))
    up = sorted({f'{x}-n\t{y}-n\t{lab}\t{rel}' for x, y, lab, rel, _ in ev[1:]})
    up_val, up_test = up[:len(up) // 3], up[len(up) // 3:]

    # ---------------------------------------------------------------- similarity sets
    simlex = ['\t'.join(S2D.SIMLEX_HEADER)]
    sl_n = sl_v = sl_cov = 0
    for k in range(30):
        if k % 5 == 4:
            pos, x, y = 'V', rnd.choice(vlem), rnd.choice(vlem)
            sl_v += 1
        elif k % 7 == 6:
            pos, x, y = 'A', 'glorpy', 'frinny'
        else:
            pos, x, y = 'N', pick([w for w in nlem if '_' not in w]), pick([w for w in nlem if '_' not in w])
            sl_n += 1
            sl_cov += 1
        simlex.append('\t'.join([data_word(x), data_word(y), pos, f'{rnd.random() * 10:.2f}', '4.00', '3.50', '2',
                                 '0.50', '0', '1.10']))
    men, men_nn, men_vv = [], 0, 0
    for k in range(34):
        if k % 6 == 5:
            x, tx, y, ty = rnd.choice([w for w in vlem if '_' not in w]), '-v', rnd.choice(
                [w for w in vlem if '_' not in w]), '-v'
            men_vv += 1
        elif k % 9 == 8:
            x, tx, y, ty = 'glorpy', '-j', rnd.choice(nlem), '-n'
        else:
            x, tx, y, ty = (rnd.choice([w for w in nlem if '_' not in w]), '-n',
                            rnd.choice([w for w in nlem if '_' not in w]), '-n')
            men_nn += 1
        men.append(f'{x}{tx} {y}{ty} {rnd.randrange(0, 51)}.000000')
    pairs = []
    while len(pairs) < 24:
        x, y = pick([w for w in nlem if '_' not in w]), pick([w for w in nlem if '_' not in w], 0.08)
        if (x, y) not in pairs and x != y:
            pairs.append((x, y))
    rel_p, sim_p = pairs[:16], pairs[10:]                         # 6 shared pairs
    score = {p: f'{rnd.random() * 10:.2f}' for p in pairs}
    wsr = ''.join(f'{x}\t{y}\t{score[(x, y)]}\n' for x, y in rel_p)
    wss = ''.join(f'{x}\t{y}\t{score[(x, y)]}\n' for x, y in sim_p)
    comb = ['\t'.join(S2D.WS353_COMBINED_HEADER)]
    for i, (x, y) in enumerate(pairs):
        comb.append(f'{x.capitalize() if i == 0 else x}\t{y}\t{score[(x, y)]}')
    exp.update({'sl.rows': len(simlex) - 1, 'sl.N': sl_n, 'sl.N_covered': sl_cov,
                'men.rows': len(men), 'men.nn': men_nn, 'men.nn_covered': men_nn,
                'wsr.rows': len(rel_p), 'wsr.covered': sum(1 for x, y in rel_p if covered_in(y, nidx)),
                'wss.rows': len(sim_p), 'ws.combined.rows': len(pairs), 'ws.combined.distinct': len(pairs),
                'ws.split_union_equals_combined': True, 'ws.split_shared': 6})
    exp_gold.update({'ws.split_scores_agree_with_combined': True, 'eval.equals_upstream': True,
                     'eval.pairs_with_both_labels': 1})
    exp_dry.update({'sl.V': sl_v, 'men.vv': men_vv})

    # ---------------------------------------------------------------- HiT
    off_name = {o: n for n, o in SE.hit_names(wn).items()}
    lex = {off_name[o]: {'name': off_name[o], 'definition': f'def {i}'} for i, o in enumerate(g.nodes)}
    split = HIT.hit_r(g, seed - 4, seed - 3, seed - 2, n_val=24)

    def hit_line(c, p, rn, hd):
        return json.dumps({'child': c, 'parent': p, 'random_negatives': rn, 'hard_negatives': hd})
    nodes = g.nodes
    filler = [off_name[o] for o in nodes[:20]]             # train rows need the keys; their negatives are not read
    train = [hit_line(off_name[c], off_name[p], filler[:10], filler[10:]) for c, p in g.edges]
    val = [hit_line(off_name[nodes[c]], off_name[nodes[a]], [off_name[nodes[x]] for x in rn],
                    [off_name[nodes[x]] for x in hd]) for c, a, rn, hd in split['val']]
    test = [hit_line(off_name[nodes[c]], off_name[nodes[a]], [off_name[nodes[x]] for x in rn],
                     [off_name[nodes[x]] for x in hd]) for c, a, rn, hd in split['test']]
    hit_exp = {'hit.names': len(g.nodes), 'hit.train_equals_E': True, 'hit.val.rows': len(val),
               'hit.test.rows': len(test), 'hit.val.ten_and_ten': True, 'hit.test.ten_and_ten': True,
               'hit.val.positives_in_closure': True, 'hit.test.positives_in_closure': True,
               'hit.val.negatives_in_closure': 0, 'hit.test.negatives_in_closure': 0,
               'hit.test.positives_direct_edges': 0}           # the split is drawn from T (hit_r), E's pairs excluded

    # ---------------------------------------------------------------- GloVe
    vocab = set()
    for _, x, y in [(None, r[1], r[2]) for r in rows] + [(None, r[0], r[1]) for r in bl + wl]:
        for w in (x, y):
            vocab.add(SE.N_S(w))
    for line in simlex[1:]:
        f = line.split('\t')
        vocab.update((SE.N_S(f[0]), SE.N_S(f[1])))
    for line in men:
        a, b, _ = line.split(' ')
        vocab.update((a[:-2], b[:-2]))
    for x, y in pairs:
        vocab.update((SE.N_S(x), SE.N_S(y)))
    vocab -= set(OOV)
    missing = sorted(w for w in vocab if '_' not in w)[::9][:3]       # a few words GloVe lacks
    vocab -= set(missing)
    multi = next(w for w in nidx if '_' in w)
    vocab |= {multi, 'the', ',', 'formula_1'}       # GloVe's underscore artefacts never match (A13.3)
    vocab = sorted(vocab)
    glove = {}
    for dim in GLOVE_DIMS:
        out = []
        for i, w in enumerate(vocab):
            vals = []
            for k in range(dim):
                v = rnd.random() * 2 - 1
                vals.append('1.2e-05' if (i == 1 and k == 0) else f'{v:.5f}')
            out.append(w + ' ' + ' '.join(vals))
        glove[dim] = ('\n'.join(out) + '\n').encode()

    # ---------------------------------------------------------------- write and pin
    def tsv(rows_, crlf=False):
        eol = '\r\n' if crlf else '\n'
        return (eol.join('\t'.join(r) for r in rows_) + eol).encode()
    files = {
        'hyperlex': ('hyperlex-data.zip', {'hyperlex-all.txt': hl_all, 'nouns-verbs/hyperlex-nouns.txt': nouns_txt,
                                           'splits/random/hyperlex_test_all_random.txt': split_txt}),
        'suite-bless': ('bless.tsv', tsv(bless)), 'suite-wbless': ('wbless.tsv', tsv(wbless)),
        'suite-leds': ('leds.tsv', tsv(leds)), 'suite-eval': ('eval.tsv', tsv(ev)),
        'suite-shwartz': ('shwartz.tsv', tsv(shw)), 'suite-bibless': ('bibless.tsv', tsv(bib)),
        'suite-hyperlex_rnd': ('hyperlex_rnd.tsv', ('\n'.join(rnd_lines) + '\n').encode()),
        'evalution-val': ('EVALution.val', ('\n'.join(up_val) + '\n').encode()),
        'evalution-test': ('EVALution.test', ('\n'.join(up_test) + '\n').encode()),
        'hit-multi': ('wordnet-multi.zip', {'wordnet-multi/train.jsonl': ('\n'.join(train) + '\n').encode(),
                                            'wordnet-multi/val.jsonl': ('\n'.join(val) + '\n').encode(),
                                            'wordnet-multi/test.jsonl': ('\n'.join(test) + '\n').encode(),
                                            'wordnet-multi/entity_lexicon.json': json.dumps(lex).encode()}),
        'simlex': ('SimLex-999.txt', ('\r\n'.join(simlex) + '\r\n').encode()),
        'ws353-combined': ('combined.tab', ('\r\n'.join(comb) + '\r\n').encode()),
        'ws353-rel': ('wordsim_relatedness_goldstandard.txt', wsr.encode()),
        'ws353-sim': ('wordsim_similarity_goldstandard.txt', wss.encode()),
        'men': ('MEN_dataset_lemma_form_full', ('\n'.join(men) + '\n').encode()),
        'men-licence': ('licence.txt', b'synthetic licence text\n'),
        'glove-6b': ('glove.6B.zip', {'glove.6B.300d.txt': glove[300], 'glove.6B.50d.txt': glove[50]}),
    }
    pins = {'version': 1, 'definition': 'synthetic Stage-2 world (tests/stage2_synth.py)', 'files': []}
    for name, (fn, content) in files.items():
        d = os.path.join(root, name)
        os.makedirs(d, exist_ok=True)
        data = _zip(content) if isinstance(content, dict) else content
        p = os.path.join(d, fn)
        if not (os.path.exists(p) and open(p, 'rb').read() == data):
            with open(p, 'wb') as fh:
                fh.write(data)
        pin = {'name': name, 'url': 'synthetic', 'file': fn, 'bytes': len(data), 'sha256': _sha(data)}
        if isinstance(content, dict):
            pin['members'] = [{'path': m, 'bytes': len(b), 'sha256': _sha(b)} for m, b in content.items()]
        pins['files'].append(pin)
    vc = {'nodes': len(gv.nodes), 'edges': len(gv.edges), 'indirect': gv.n_indirect, 'roots': len(gv.roots),
          'isolated': gv.isolated}
    exp_dry.update({'verb_at.nodes': vc['nodes'], 'verb_at.edges': vc['edges'], 'verb_at.indirect': vc['indirect'],
                    'verb_at.roots': vc['roots'], 'verb_at.isolated': vc['isolated']})
    expected = {'words': exp, 'gold': exp_gold, 'hit': hit_exp, 'dry_words': exp_dry, 'dry_gold': exp_dry_gold,
                'at': {'nodes': len(g.nodes), 'edges': len(g.edges), 'roots': len(g.roots)},
                'verb_at': vc, 'hit_rows': {'val': len(val), 'test': len(test)}}
    return World(root, wn, pins, expected, {'concepts': concepts})
