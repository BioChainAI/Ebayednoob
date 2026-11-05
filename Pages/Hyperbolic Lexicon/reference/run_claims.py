#!/usr/bin/env python3
"""Runs the Phase 1 claims of ../PREREGISTRATION.md (with Amendment 1): L2, L3 (the Python side), L5 and L7.

    python3 -B run_claims.py                every Phase 1 claim; results/claims.json, results/claims.md
    python3 -B run_claims.py L3 L7          only these claims (results/claims-L3-L7.json and .md)
    python3 -B run_claims.py --dry          the registered dry run (Amendment 1, item 10): every seed moved up by
                                            3000, the verb forest in place of the nouns, the repository Markdown in
                                            place of the lemma types; results/dry/claims.json and .md

Needs the WordNet archive in the cache (golden/make_wordnet_v1.cjs), numpy, Node (L2's Node table) and the SHD-CCP
checkout at ../../../../SHD-CCP (L7(e), imported read-only). Every case is counted, the first KEEP failures of each
part are kept as counterexamples, and every control is run: an exact claim whose control passes is void.

Decisions follow the registration: exact claims are all-or-nothing; L5's comparisons use the 95% percentile
bootstrap of the per-query paired AP differences (Amendment 1, item 7). L3(f) (Python against JS) and L4 are
Phase 2; this runner writes the Python side of L3(f) (the canonical point list's SHA-256 and the 2,000 sampled
lines) to results/ for Phase 2 to compare against.
"""
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import time
from collections import defaultdict
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lexicon  # noqa: E402
from lexicon import wordnet as W  # noqa: E402
from hpstep.prng import Rng  # noqa: E402

KEEP = 20
DRY = '--dry' in sys.argv
OFF = 3000 if DRY else 0                          # Amendment 1, item 10: +3000 on every seed in a dry run
RESULTS = os.path.join(HERE, 'results', 'dry') if DRY else os.path.join(HERE, 'results')
SPIKE_MARKDOWN_COMMIT = '7b10514a4f2955c92cd0a06a3a658998080cb310'   # the corpus spike S6 used (L2's dry run)


def sha(text):
    return hashlib.sha256(text.encode('utf-8') if isinstance(text, str) else text).hexdigest()


def exact_decision(failures, control_failed=True):
    if not control_failed:
        return 'void'
    return 'supported' if failures == 0 else 'refuted'


def combine(*decisions):
    if 'refuted' in decisions:
        return 'refuted'
    if 'void' in decisions:
        return 'void'
    return 'supported' if all(d == 'supported' for d in decisions) else 'inconclusive'


def frac(x):
    """An exact rational for JSON: the string p/q and its float."""
    x = Fraction(x)
    return {'exact': f'{x.numerator}/{x.denominator}', 'float': float(x)}


def log(msg):
    print(msg, flush=True)


# ---------------------------------------------------------------- L2
def repository_markdown_words():
    """The dry run's types: the distinct N_B words of the repository Markdown spike S6 used (commit 7b10514)."""
    def git(*args):
        return subprocess.run(['git', '-C', lexicon.REPO] + list(args), capture_output=True, check=True).stdout
    raw = git('ls-tree', '-r', '-z', '--full-tree', SPIKE_MARKDOWN_COMMIT, '--', 'Pages')
    items = []
    for ent in raw.split(b'\0'):
        if not ent:
            continue
        meta, path = ent.split(b'\t', 1)
        _, typ, oid = meta.split(b' ')
        if typ == b'blob' and path.startswith(b'Pages/') and path.endswith(b'.md'):
            items.append((path, oid.decode('ascii')))
    items.sort(key=lambda t: t[0])
    text = b'\n'.join(git('cat-file', 'blob', oid) for _, oid in items)
    from lexicon.normalise import nb
    r = nb(text)
    return sorted({w for w, f in zip(r.words, r.failed) if not f})


def l2_types(wn):
    """Amendment 1, item 8: lemma strings ('_' as a space) through N_B, words joined by single spaces, deduplicated;
    a lemma with a fail-closed word is left out and counted."""
    from lexicon.normalise import nb
    raw = W.lemma_types(wn)
    types, failed, empty = set(), 0, 0
    for t in raw:
        r = nb(t.encode('utf-8'))
        if any(r.failed):
            failed += 1
            continue
        if not r.text:
            empty += 1
            continue
        types.add(r.text)
    return sorted(types), {'lemma_types_before_nb': len(raw), 'left_out_fail_closed': failed, 'empty_after_nb': empty}


def node_keys(types):
    """L2's Node table: ttmpt_core_v1.js, unchanged, through js_engram_keys.cjs."""
    if not shutil.which('node'):
        return None
    p = subprocess.run(['node', os.path.join(HERE, 'js_engram_keys.cjs')], input=('\n'.join(types) + '\n').encode('utf-8'),
                       capture_output=True, check=True)
    out = p.stdout.decode('utf-8')
    return out[:-1] if out.endswith('\n') else out


def collision_share(keys):
    """|types in a key class of size >= 2| / |types|, and the classes."""
    classes = defaultdict(list)
    for t, k in keys.items():
        classes[k].append(t)
    shared = [c for c in classes.values() if len(c) >= 2]
    n_shared = sum(len(c) for c in shared)
    return Fraction(n_shared, len(keys)) if keys else Fraction(0), classes, shared


def run_l2(wn):
    from engram import ttmpt as T
    if DRY:
        types, counts = repository_markdown_words(), {'dry': 'repository Markdown at commit 7b10514 (spike S6)'}
    else:
        types, counts = l2_types(wn)
    keys = {t: T.hex_lsb(T.crystallize(t)) for t in types}
    table = '\n'.join(f'{t}\t{keys[t]}' for t in types)
    js = node_keys(types)
    parity = js is not None and sha(js) == sha(table)
    share, classes, shared = collision_share(keys)
    # control: a 64-bit SHA-256-prefix key must give 0 collisions
    pkeys = {t: hashlib.sha256(t.encode('utf-8')).digest()[:8].hex() for t in types}
    pshare, _, pshared = collision_share(pkeys)
    control_ok = len(pshared) == 0              # registered: the SHA-256-prefix key must give 0 collisions, else void
    zero = classes.get('0' * 16, [])
    digits = [t for t in types if t.replace(' ', '').isdigit()]
    letters = lambda t: ''.join(sorted(ch for ch in t.upper() if 'A' <= ch <= 'Z'))  # noqa: E731
    by_letters = defaultdict(set)
    for t in types:
        by_letters[letters(t)].add(t)
    anagram_classes = [c for c in by_letters.values() if len(c) >= 2]
    largest = max(shared, key=len) if shared else []
    v0 = {}
    vocab_path = os.path.join(lexicon.GOLDEN, 'vocab_v0_lex0.txt')
    if os.path.exists(vocab_path) and not DRY:
        entries = [e for e in open(vocab_path, encoding='utf-8').read().split('\n')[:-1]]
        vk = {e: T.hex_lsb(T.crystallize(e)) for e in entries}
        vs, _, vshared = collision_share(vk)
        v0 = {'entries': len(entries), 'share': frac(vs), 'classes_of_size_2_or_more': len(vshared)}
    if not parity:
        decision = 'void'
    elif not control_ok:
        decision = 'void'
    else:
        decision = 'supported' if share >= Fraction(1, 100) else 'refuted'
    return {
        'decision': decision,
        'cases': len(types),
        'metric': {'collision_share': frac(share), 'types_in_shared_classes': sum(len(c) for c in shared)},
        'control': {'sha256_prefix_key_collisions': len(pshared), 'share': frac(pshare)},
        'parity': {'python_table_sha256': sha(table), 'node_table_sha256': sha(js) if js is not None else None,
                   'identical': parity},
        'reported': {
            **counts,
            'types_after_nb': len(types),
            'key_classes': len(classes),
            'classes_of_size_2_or_more': len(shared),
            'largest_class': {'size': len(largest), 'first': sorted(largest)[:12]},
            'zero_key': {'types': len(zero), 'share': frac(Fraction(len(zero), len(types))) if types else None,
                         'first': sorted(zero)[:12]},
            'all_digit_types': {'count': len(digits), 'keys': sorted({keys[t] for t in digits})[:5]},
            'anagram_classes': {'count': len(anagram_classes), 'types': sum(len(c) for c in anagram_classes),
                                'example': sorted(sorted(c) for c in anagram_classes if any(' ' not in t for t in c))[:3]},
            'v0_entries': v0,
        },
    }


# ---------------------------------------------------------------- L3
def forest(wn, pos):
    """(words {offset: word}, parent, children) of the instance forest: the nouns, or the verbs in a dry run."""
    from lexicon import address as A
    parent, children, _ = W.spanning_forest(wn['synsets'][pos])
    words = A.noun_words(wn) if pos == 'noun' else A.verb_words(wn)
    return words, parent, children


def duplicates(words):
    """The number of nodes whose word another node also has, and a few examples."""
    seen = defaultdict(list)
    for o, w in words.items():
        seen[w].append(o)
    clash = [sorted(v) for v in seen.values() if len(v) > 1]
    return sum(len(c) for c in clash), clash[:KEEP]


def run_l3(wn):
    from lexicon import address as A, h3tree as H3, h2exact as H2
    pos = 'verb' if DRY else 'noun'
    words, parent, children = forest(wn, pos)
    offsets = sorted(words)
    N = len(offsets)
    WL = [words[o] for o in offsets]
    fails = {k: [] for k in 'abcdeg'}
    # (a) distinct words; (b) the inverse table returns the synset
    n_dup, clash = duplicates(words)
    fails['a'] = clash if n_dup else []
    inv = {}
    for o in offsets:
        inv.setdefault(words[o], o)
    fails['b'] = [o for o in offsets if inv[words[o]] != o][:KEEP]
    n_b = sum(1 for o in offsets if inv[words[o]] != o)
    # (c) certifyWord's three checks
    bad_c = [o for o in offsets if not A.certify(words[o])]
    fails['c'] = bad_c[:KEEP]
    # (d) ancestors are exactly the proper prefixes
    bad_d = A.prefix_check(words, parent)
    fails['d'] = [{'offset': o, 'met': m[:5], 'ancestors': a[:5]} for o, m, a in bad_d[:KEEP]]
    # (e) exact points, the sheet identity, exact decoding: H3 (hpstep decode_exact, the authority, and the integer
    #     decoder as a cross-check) and H2 (D3, t = 11/13)
    t0 = time.time()
    P3 = H3.points(WL)
    t_h3 = time.time() - t0
    t0 = time.time()
    P2 = H2.TREE.points(WL)
    t_h2 = time.time() - t0
    bad_e = []
    t0 = time.time()
    for o, w, X in zip(offsets, WL, P3):
        n = len(w)
        if not H3.on_sheet(X, n):
            bad_e.append({'offset': o, 'tree': 'H3', 'what': 'sheet'})
        elif H3.decode_exact(X, n) != w:
            bad_e.append({'offset': o, 'tree': 'H3', 'what': 'decode'})
    t_dec3 = time.time() - t0
    int_agree = sum(1 for w, X in zip(WL, P3) if H3.decode_int(X, len(w)) == w)
    t0 = time.time()
    h2_ties = 0
    for o, w, X in zip(offsets, WL, P2):
        n = len(w)
        if not H2.TREE.on_sheet(X, n):
            bad_e.append({'offset': o, 'tree': 'H2', 'what': 'sheet'})
            continue
        dec = H2.TREE.decode(X, n)
        h2_ties += dec[1] if len(dec) > 1 and isinstance(dec[1], int) else 0
        if dec[0] != w:
            bad_e.append({'offset': o, 'tree': 'H2', 'what': 'decode'})
    t_dec2 = time.time() - t0
    fails['e'] = bad_e[:KEEP]
    n_e = len(bad_e)
    # (f), the Python side for Phase 2: the canonical point list and 2,000 sampled lines
    lines3 = [f'{o} H3 {H3.coords_text(X, H3.den(len(w)))}' for o, w, X in zip(offsets, WL, P3)]
    lines2 = [f'{o} H2 {H3.coords_text(X, H2.TREE.den(len(w)))}' for o, w, X in zip(offsets, WL, P2)]
    canon = '\n'.join(lines3 + lines2)
    sample = [Rng(1000 + OFF + i).below(N) for i in range(2000)]
    # the sampled nodes also cross-check h3tree's integer points against hpstep's point_exact (Fractions)
    from hpstep.decode3d import TreeEmbedding3D
    emb = TreeEmbedding3D()
    t0 = time.time()
    pe_bad = [offsets[i] for i in sample if H3.fractions(P3[i], len(WL[i])) != emb.point_exact(list(WL[i]))]
    ms_point_hpstep = (time.time() - t0) * 1000 / len(sample)
    f_lines = [f'{offsets[i]}\t{A.word_str(WL[i])}\t{lines3[i]}\t{lines2[i]}' for i in sample]
    os.makedirs(RESULTS, exist_ok=True)
    with open(os.path.join(RESULTS, 'l3f-python.txt'), 'w') as fh:
        fh.write('# L3(f), the Python side (Phase 1): node i = Rng(%d + i).below(%d) in offset order; offset TAB word '
                 'TAB H3 line TAB H2 line. Canonical point list SHA-256: %s\n' % (1000 + OFF, N, sha(canon)))
        fh.write('\n'.join(f_lines) + '\n')
    # (g) the bijective id codec
    bad_g, cov59, cov64 = [], 0, 0
    for o, w in zip(offsets, WL):
        if len(w) <= 27:
            cov64 += 1
            n = A.word_id(w)
            if A.id_word(n) != w or n >= 2 ** 64 or (len(w) <= 25 and n >= 2 ** 59):
                bad_g.append(o)
            cov59 += len(w) <= 25
    fails['g'] = bad_g[:KEEP]
    # controls
    zero = A.noun_words(wn, 'zero') if pos == 'noun' else A.verb_words(wn, 'zero')
    trunc = A.noun_words(wn, 'trunc') if pos == 'noun' else A.verb_words(wn, 'trunc')
    c1, _ = duplicates(zero)
    c2, _ = duplicates(trunc)
    long_words = [w for w in WL if len(w) > 12]
    c3 = sum(1 for w in long_words if not H3.float_ok(w))
    t34 = H2.H2Tree(Fraction(3, 4))
    c4 = sum(1 for w in WL if not t34.decodes(w))
    controls = {'1 zero-letter variant: nodes sharing a word (must be > 0)': c1,
                '2 truncation variant: nodes sharing a word (must be > 0)': c2,
                f'3 float placement and decoding: failures among the {len(long_words)} words longer than 12 letters (must be > 0)': c3,
                '4 H2 at t = 3/4: exact decoding failures (must be > 0)': c4}
    controls_failed = c1 > 0 and c2 > 0 and c3 > 0 and c4 > 0
    counts = {'a': n_dup, 'b': n_b, 'c': len(bad_c), 'd': len(bad_d), 'e': n_e, 'g': len(bad_g)}
    total = sum(counts.values())
    lengths = defaultdict(int)
    for w in WL:
        lengths[len(w)] += 1
    degrees = [len(c) for c in children.values()]
    bits3 = [H3.coord_bits(X, H3.den(len(w))) for w, X in zip(WL, P3)]
    bits2 = [H3.coord_bits(X, H2.TREE.den(len(w))) for w, X in zip(WL, P2)]
    return {
        'decision': exact_decision(total, controls_failed),
        'decision_scope': 'the Python side: parts (a)-(e) and (g); part (f), Python against JS, is decided in Phase 2',
        'cases': N,
        'failures': counts,
        'counterexamples': fails,
        'control': controls,
        'reported': {
            'forest': pos,
            'word_length': {'max': max(lengths), 'mean': frac(Fraction(sum(len(w) for w in WL), N)),
                            'distribution': dict(sorted(lengths.items())),
                            'share_le_25': frac(Fraction(cov59, N)), 'share_le_27': frac(Fraction(cov64, N))},
            'id_coverage': {'id59_words': cov59, 'id64_words': cov64},
            'max_bits_per_coordinate': {
                'H3': {'numerator': max(b[0] for bb in bits3 for b in bb), 'denominator': max(b[1] for bb in bits3 for b in bb)},
                'H2': {'numerator': max(b[0] for bb in bits2 for b in bb), 'denominator': max(b[1] for bb in bits2 for b in bb)}},
            'children': {'nodes_with_more_than_5': sum(d > 5 for d in degrees),
                         'nodes_with_more_than_25': sum(d > 25 for d in degrees), 'max': max(degrees)},
            'h3_integer_decoder_agrees_with_hpstep': f'{int_agree}/{N}',
            'h3tree_points_equal_hpstep_point_exact_on_the_sample': f'{len(sample) - len(pe_bad)}/{len(sample)}',
            'h2_decode_ties': h2_ties,
            'canonical_point_list_sha256': sha(canon),
            'f_sample_file': os.path.relpath(os.path.join(RESULTS, 'l3f-python.txt'), HERE),
            '~ms': {'h3_points_all': round(t_h3 * 1000), 'h2_points_all': round(t_h2 * 1000),
                    'h3_point_exact_hpstep_per_point': round(ms_point_hpstep, 3),
                    'h3_decode_exact_hpstep_all': round(t_dec3 * 1000), 'h2_decode_all': round(t_dec2 * 1000)},
        },
    }


# ---------------------------------------------------------------- L5
def l5_sets(wn):
    """The instance sets: (name, offsets, words, graph neighbours, closure neighbours, queries, S3 permutations)."""
    from lexicon import rank as R
    pos = 'verb' if DRY else 'noun'
    words, parent, children = forest(wn, pos)
    syn = wn['synsets'][pos]
    anc = W.closure(syn)
    desc = W.descendants(anc)
    out = []
    if DRY:
        offs = sorted(words)
        q = Rng(4000).sample(len(offs), 200)
        out.append(('verbs', offs, q, 5))
    else:
        _, span = W.mammal_sets(wn)
        out.append(('mammals', span, list(range(len(span))), 20))
        offs = sorted(words)
        out.append(('nouns', offs, Rng(1000).sample(len(offs), 1000), 5))
    sets = []
    for name, offs, queries, perms in out:
        sets.append({'name': name, 'offsets': offs, 'words': [words[o] for o in offs], 'queries': list(queries),
                     'perms': perms, 'nb': [R.graph_neighbours(offs, parent, children),
                                            R.closure_neighbours(offs, anc, desc)]})
    return sets


def l5_arms(wn, S):
    """The arms of one instance set, built lazily (name, builder, tau for distortion or None)."""
    from lexicon import address as A, flat as FL, h2exact as H2, h3tree as H3
    WL = S['words']
    arms = [('H3', lambda: H3.arm(WL)), ('H2', lambda: H2.arm(WL)),
            ('F3', lambda: FL.arm(WL, 3)), ('F2', lambda: FL.arm(WL, 2)),
            ('F3*', lambda: FL.arm(WL, 3, True)), ('F2*', lambda: FL.arm(WL, 2, True))]
    for i in range(S['perms']):
        arms.append((f'S3#{i}', (lambda i=i: H3.arm(A.s3_words(WL, 2000 + OFF + i), name=f'S3#{i}'))))
    arms.append(('K3', lambda: H3.arm(A.k3_words(wn, S['offsets'], 'verb' if DRY else 'noun'), name='K3')))
    return arms


def distortion_pairs(S):
    n = len(S['offsets'])
    if S['name'] == 'nouns' or DRY:
        stride = [j for j in range(n) if j % 82 == 0]
        return [(u, v) for u in S['queries'] for v in stride if v != u]
    return [(u, v) for u in range(n) for v in range(u + 1, n)]


def run_l5(wn):
    from lexicon import flat as FL, h2exact as H2, h3tree as H3, rank as R
    sys.set_int_max_str_digits(0)
    out = {'sets': {}}
    verdicts = {}
    for S in l5_sets(wn):
        log(f"  L5 {S['name']}: {len(S['offsets'])} nodes, {len(S['queries'])} queries")
        res, aps = {}, {}
        for name, build in l5_arms(wn, S):
            t0 = time.time()
            arm = build()
            rs = R.rank_queries(arm, S['queries'], S['nb'], workers=4)
            g_ap = [r.ap[0] for r in rs]
            c_ap = [r.ap[1] for r in rs]
            aps[name] = g_ap
            entry = {'graph_map': frac(R.map_exact(g_ap)), 'closure_map': frac(R.map_exact(c_ap)),
                     'graph_mean_rank': frac(R.mean_rank([r.ranks[0] for r in rs])),
                     'closure_mean_rank': frac(R.mean_rank([r.ranks[1] for r in rs]))}
            if name in ('H3', 'H2', 'F3', 'F2'):
                entry['distortion'] = R.distortion(arm, distortion_pairs(S), S['words'])
            if name in ('H3', 'H2', 'F3', 'F2', 'F3*', 'F2*'):
                WL = S['words']
                if name == 'H3':
                    pts, dens = H3.points(WL), [H3.den(len(w)) for w in WL]
                elif name == 'H2':
                    pts, dens = H2.TREE.points(WL), [H2.TREE.den(len(w)) for w in WL]
                else:
                    T = FL.tree(int(name[1]), name.endswith('*'))
                    pts, dens = T.points(WL), [T.den(len(w)) for w in WL]
                mean_bits, max_bits = R.bits_per_node(pts, dens)
                entry['bits_per_node'] = {'mean': float(mean_bits), 'max': max_bits}
            entry['seconds'] = round(time.time() - t0, 1)
            res[name] = entry
            log(f"    {name}: graph MAP {float(R.map_exact(g_ap)):.4f}, closure MAP {float(R.map_exact(c_ap)):.4f} ({entry['seconds']} s)")
        # a query without graph-edge neighbours (an isolated verb in the dry run's forest) has no AP in any arm: it
        # is left out of the S3 mean and of every paired difference, and counted
        keep = [i for i, a in enumerate(aps['H3']) if a is not None]
        perms = [[aps[k][i] for i in keep] for k in aps if k.startswith('S3#')]
        aps = {k: [v[i] for i in keep] for k, v in aps.items()}
        aps['S3'] = R.mean_over_permutations(perms)
        res['S3 (mean over permutations)'] = {'graph_map': frac(R.map_exact(aps['S3']))}
        effects = {}
        for a, b in (('H3', 'F3'), ('H3', 'F3*'), ('H2', 'F2'), ('H2', 'F2*'), ('H3', 'S3'), ('H3', 'K3')):
            d = R.paired_diffs(aps[a], aps[b])
            m, ci = R.ci_mean(d)
            effects[f'{a} - {b}'] = {'mean': m, 'ci95': ci, 'n': len(d)}
        out['sets'][S['name']] = {'nodes': len(S['offsets']), 'queries': len(S['queries']),
                                  'queries_without_graph_neighbours': len(S['queries']) - len(keep), 'arms': res,
                                  'effects_graph_edge_ap': effects}
        verdicts[S['name']] = effects
    above = lambda e: e['ci95'][0] > 0          # noqa: E731
    at_or_below = lambda e: e['ci95'][1] <= 0   # noqa: E731
    controls_ok = all(above(v['H3 - S3']) and above(v['H3 - K3']) for v in verdicts.values())
    main = [v[k] for v in verdicts.values() for k in ('H3 - F3', 'H3 - F3*', 'H2 - F2', 'H2 - F2*')]
    if not controls_ok:
        decision = 'void'
    elif all(above(e) for e in main):
        decision = 'supported'
    elif any(at_or_below(e) for e in main):
        decision = 'refuted'
    else:
        decision = 'inconclusive'
    out.update({'decision': decision, 'cases': sum(s['queries'] for s in out['sets'].values()),
                'control': {f'{k} H3 - S3 and H3 - K3 intervals above 0': above(v['H3 - S3']) and above(v['H3 - K3'])
                            for k, v in verdicts.items()}})
    return out


# ---------------------------------------------------------------- L7
def run_l7(wn):
    from lexicon import address as A, lps as LP
    from hpstep.problems import GENS, qmul, word_quaternion
    qs = (13,) if DRY else LP.QS
    words_b = [LP.random_word(Rng(1000 + OFF + i)) for i in range(10000)]
    words_e = [LP.random_word(Rng(2000 + OFF + i)) for i in range(1000)]
    if DRY:
        extra = [w for _, w in sorted(A.verb_words(wn).items())][:1182]
        extra_name = 'the first 1,182 verb-forest words (dry run)'
    else:
        clos, _ = W.mammal_sets(wn)
        nw = A.noun_words(wn)
        extra = [nw[o] for o in clos]
        extra_name = 'the L3 words of the 1,182 mammal closure-set synsets'
    words_b += extra
    words_e += extra
    per_q, fails, controls = {}, {'a': 0, 'b': 0, 'c': 0, 'd': 0}, {}
    for q in qs:
        t0 = time.time()
        G = LP.graph(q)
        st = LP.structure(G)
        g, r = LP.girth(G)
        bad_a = [k for k in ('count_ok', 'regular6', 'inverse_closed', 'connected') if not st[k]]
        if st['legendre'] == -1 and not st['bipartite']:
            bad_a.append('bipartite')
        bad_b = LP.walk_vs_reduction(G, words_b)
        n_words, n_vertices, bad_walk = LP.injectivity(G, r)
        bad_c = (n_words - n_vertices) + bad_walk
        spec = LP.spectrum(G, st['bipartite'])
        ctl_iota = len(LP.control_iota2(q, words_b))
        ctl_sub = LP.control_subset(q)
        nw = A.noun_words(wn) if not DRY else A.verb_words(wn)
        vertices, top = LP.spread(G, list(nw.values()))
        fails['a'] += len(bad_a)
        fails['b'] += len(bad_b)
        fails['c'] += bad_c
        fails['d'] += 0 if spec['ramanujan'] else 1
        controls[f'q={q}: iota = 2, words where walk != reduction (must be > 0)'] = ctl_iota
        controls[f'q={q}: 4-generator subset is 6-regular (must be false)'] = ctl_sub['regular6']
        per_q[q] = {'structure': st, 'girth': g, 'r': r, '(a) failures': bad_a, '(b) failures': len(bad_b),
                    '(b) counterexamples': [list(words_b[i]) for i in bad_b[:5]],
                    '(c) reduced words of length <= r': n_words, '(c) distinct vertices': n_vertices,
                    '(d)': spec, 'spread of the %s addresses' % ('verb' if DRY else 'noun'):
                        {'distinct_vertices': vertices, 'largest_load': top},
                    'seconds': round(time.time() - t0, 1)}
        log(f"  L7 q={q}: g={g}, r={r}, max|lambda|={spec['maxabs']:.6f} ({per_q[q]['seconds']} s)")
    # (e) SHD-CCP's Hurwitz product, doubled coordinates, halved
    bad_e = LP.hurwitz_check(words_e)
    _, hz_sha = LP.load_hurwitz()
    unhalved = len(LP.hurwitz_check(words_e, halve=False))
    # the registered control: products of doubled coordinates, compared without dividing by 2^L
    raw_bad = 0
    for w in words_e:
        t = (2, 0, 0, 0)
        for x in w:
            t = qmul(t, tuple(2 * c for c in GENS[x]))
        if tuple(c // 2 for c in t) != word_quaternion(w):
            raw_bad += 1
    controls['(e) registered: doubled-coordinate product not divided by 2^L, words that differ (must be > 0)'] = raw_bad
    controls['(e) also: the Hurwitz product without its final halving, words that differ (must be > 0)'] = unhalved
    ctl_ok = all((v > 0) if isinstance(v, int) and not isinstance(v, bool) else (v is False) for v in controls.values())
    exact_fails = fails['a'] + fails['b'] + fails['c'] + len(bad_e)
    d_ok = fails['d'] == 0
    if not ctl_ok:
        decision = 'void'
    elif exact_fails or not d_ok:
        decision = 'refuted'
    else:
        decision = 'supported'
    return {'decision': decision, 'cases': len(words_b) * len(qs) + len(words_e),
            'failures': {**fails, 'e': len(bad_e)}, 'control': controls,
            'reported': {'per_q': per_q, 'words_b': f'10,000 random words Rng({1000 + OFF} + i) and {extra_name}',
                         'words_e': f'1,000 random words Rng({2000 + OFF} + i) and {extra_name}',
                         'hurwitz_py_sha256': hz_sha, '(e) counterexamples': [list(words_e[i]) for i in bad_e[:5]]}}


# ---------------------------------------------------------------- main
CLAIMS = {'L2': run_l2, 'L3': run_l3, 'L5': run_l5, 'L7': run_l7}


def write(results, names):
    os.makedirs(RESULTS, exist_ok=True)
    stem = 'claims' if names == list(CLAIMS) else 'claims-' + '-'.join(names)
    with open(os.path.join(RESULTS, stem + '.json'), 'w') as f:
        json.dump(results, f, indent=1, ensure_ascii=False)
        f.write('\n')
    lines = [f"# Hyperbolic Lexicon, Phase 1 claims{' (dry run)' if DRY else ''}", '',
             f"Run {results['started']} with {results['preregistration']}.", '',
             '| Claim | Decision | Cases | Seconds |', '| --- | --- | --- | --- |']
    for k, v in results['claims'].items():
        lines.append(f"| {k} | {v['decision']} | {v.get('cases', '')} | {v.get('seconds', '')} |")
    lines.append('')
    for k, v in results['claims'].items():
        lines += [f'## {k}', '', '```json', json.dumps({x: y for x, y in v.items() if x != 'decision'}, indent=1,
                                                       ensure_ascii=False), '```', '']
    with open(os.path.join(RESULTS, stem + '.md'), 'w') as f:
        f.write('\n'.join(lines))
    return stem


def main(argv):
    names = [a for a in argv if not a.startswith('--')] or list(CLAIMS)
    for n in names:
        if n not in CLAIMS:
            sys.exit(f'unknown claim {n}; Phase 1 runs {", ".join(CLAIMS)}')
    import numpy
    results = {
        'preregistration': 'PREREGISTRATION.md with Amendment 1',
        'dry': DRY,
        'started': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()),
        'environment': {'python': platform.python_version(), 'platform': platform.platform(), 'numpy': numpy.__version__,
                        'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip()
                        if shutil.which('node') else None},
        'claims': {},
    }
    wn = W.load()
    for n in names:
        t0 = time.time()
        log(f'{n} ...')
        r = CLAIMS[n](wn)
        r['seconds'] = round(time.time() - t0, 1)
        results['claims'][n] = r
        log(f"{n}: {r['decision']} ({r['seconds']} s)")
    stem = write(results, names)
    log(f"wrote {os.path.relpath(os.path.join(RESULTS, stem + '.json'), HERE)} and .md")


if __name__ == '__main__':
    main(sys.argv[1:])
