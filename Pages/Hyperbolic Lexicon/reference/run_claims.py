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

Phase 2 (Amendment 4): the reference's half of L1 and L4. It never writes the Phase 1 files above.

    python3 -B run_claims.py --phase2             L1 and L4: results/phase2-python.json and .md; per-instance lists in
                                                  lexicon.CACHE/phase2/ (outside git)
    python3 -B run_claims.py --phase2 L1          one of them (results/phase2-python-L1.json and .md)
    python3 -B run_claims.py --phase2 --dry       the registered dry run (Amendment 4 item 7): L1 on Rng(4000 + i)
                                                  strings and the repository Markdown spike S6 used (one instance per
                                                  file), L4 on the verb forest with queries Rng(4000).sample(13767,
                                                  200); results/dry/phase2-python.json, lexicon.CACHE/phase2-dry/

L1 (items 2 and 3): per instance set and vocabulary, each instance's record and its SHA-256 (the list in the cache,
its digest in the JSON), the id-stream SHA-256, controls 2 and 3, the reference side of control 1 (S6's R(s) from the
pinned table, per case), the reported tokenizer metrics and the reported agreement with Hugging Face tokenizers.
For (b), the UD EWT sentences (L1 Data: text not committed), the JSON holds no instance text: its control and Hugging
Face examples keep the instance, the offset and each text field's SHA-256 and length; the examples go to the cache.
The decisive run refuses without V1 (pinned, so its cells are in force); a dry run goes on without it and says so.
L1 itself is decided by the Node and Chromium runners against these digests. L4 (items 5 and 6): (a) per-query
rank-list SHA-256s and the exact MAPs and mean ranks, in H3 and H2, for Node to equal; (b) the float64 inversions,
decided here, with control 1 (float32) and control 2 (the acosh evaluator with index ties).
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
    raw_bad = len(LP.control_raw_doubled(words_e))
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


# ================================================================ Phase 2 (Amendment 4): the reference's half
P2_CACHE = os.path.join(lexicon.CACHE, 'phase2-dry' if DRY else 'phase2')
P2_WORKERS = 4
P2_BATCH = 2000                 # instances per Hugging Face batch (memory only; changes no result)
P2_EXAMPLES = 3                 # examples kept per control cell and per Hugging Face cell
P2_CLIP = 240                   # characters of a record kept in an example
L4A_NOUN_QUERIES = 200          # Amendment 4 item 5: queries 0-199 of the noun query sample
# The sets each L1 control runs on (Amendment 4 item 3).
# READING: in a dry run every L1 control runs on both dry sets (the Rng(4000 + i) strings and the Markdown), the
# dry stand-ins for (a), (b) and (c); the decisive run uses the registered sets: control 1 on (c), control 2 on (a),
# control 3 on (a) and (b).
P2_C1_SETS = ('dry_d', 'markdown') if DRY else ('c',)
P2_C2_SETS = ('dry_d', 'markdown') if DRY else ('a',)
P2_C3_SETS = ('dry_d', 'markdown') if DRY else ('a', 'b')
# L1's Data: "UD EWT (CC BY-SA 4.0, text not committed)". For these sets the committed JSON keeps, per control and
# Hugging Face example, the instance, the offset of the first difference, and each text field's SHA-256 and length;
# the text itself (record windows, token lists) goes to the cache next to the full records (outside git).
P2_TEXT_NOT_COMMITTED = ('b',)
P2_TEXT_FIELDS = ('registered', 'control', 'ours', 'hf')   # the example fields that carry instance text
os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')   # tokenizers' threads and L4's fork pool do not mix


def cache_name(path):
    """A cache path as the JSON writes it: relative to lexicon.CACHE, so no home directory is committed."""
    return os.path.relpath(path, lexicon.CACHE)


def json_safe(x):
    """nan and inf (which JSON cannot hold) as None, in nested containers."""
    if isinstance(x, float) and (x != x or x in (float('inf'), float('-inf'))):
        return None
    if isinstance(x, dict):
        return {k: json_safe(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [json_safe(v) for v in x]
    return x


def spike_markdown_files():
    """L1's dry Markdown (Amendment 4 item 7): the files spike S6 used, as repository_markdown_words reads them
    (every blob under Pages/ whose path ends in '.md' at commit 7b10514, sorted by path bytes, read with git
    plumbing), one instance per file: [(path, raw bytes)]. S6 joined them with LF into one corpus; here each file's
    bytes, exactly as stored (S6 kept a BOM), is one instance."""
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
    return [(p.decode('utf-8'), git('cat-file', 'blob', oid)) for p, oid in items]


def p2_l1_sets(wn):
    """L1's instance sets: dicts with name, source, blobs (UTF-8 bytes), sha256 (lexicon.l1.digest's framing) and
    whether a golden pin was checked. (a)-(d) are refused unless they match golden/l1_instances_v1.meta.json, as
    Amendment 4 item 2 asks of Node; a dry run's Rng(4000 + i) strings are checked against the meta's dry_d pin."""
    from lexicon import l1, phase2 as P
    meta = json.load(open(os.path.join(lexicon.GOLDEN, 'l1_instances_v1.meta.json')))
    if DRY:
        m = meta['dry_d']
        d = [l1.dry(i) for i in range(m['count'])]
        if len(d) != m['count'] or l1.digest(d) != m['sha256']:
            sys.exit('the dry strings do not match the dry_d pin of golden/l1_instances_v1.meta.json')
        md = spike_markdown_files()
        blobs = [b for _, b in md]
        return [
            {'name': 'dry_d', 'source': f"{m['count']} strings, string i from Rng(4000 + i) with L1 (d)'s pool "
                                        '(lexicon.l1.dry)', 'blobs': [s.encode('utf-8') for s in d],
             'sha256': m['sha256'], 'pinned': 'golden/l1_instances_v1.meta.json dry_d'},
            {'name': 'markdown', 'source': f'the repository Markdown spike S6 used: the {len(md)} files Pages/**/*.md '
                                           f'at commit {SPIKE_MARKDOWN_COMMIT[:7]}, sorted by path, one instance per '
                                           'file (raw bytes)', 'blobs': blobs, 'sha256': P.blob_digest(blobs),
             'pinned': None, 'files': [p for p, _ in md]}]
    loaders = (('a', 'every WordNet 3.0 gloss field, (part of speech, offset) order', lambda: l1.instance_a(wn)),
               ('b', "every '# text = ' sentence of UD English EWT train, dev, test (4a4d77f)", l1.instance_b),
               ('c', 'the Unicode stress set (spike S6, bd1179ea...)', l1.instance_c),
               ('d', '2,000 synthetic strings, string i from Rng(1000 + i)', l1.instance_d))
    out = []
    for name, source, load in loaders:
        strings = load()
        m = meta['instances'][name]
        dg = l1.digest(strings)
        if len(strings) != m['count'] or dg != m['sha256']:
            sys.exit(f'L1 instance ({name}) does not match golden/l1_instances_v1.meta.json: refusing to run')
        out.append({'name': name, 'source': source, 'blobs': [s.encode('utf-8') for s in strings], 'sha256': dg,
                    'pinned': 'golden/l1_instances_v1.meta.json'})
    return out


def p2_vocabs():
    """[(tag, Vocab, file path)] and their description. V1 is pinned, so L1's V1 cells are in force (Amendment 1 item
    3; Amendment 4 item 2: "The cells are V0 and V1"): the decisive run refuses without it. A dry run goes on without
    it and says so; the JavaScript runner then counts its V1 cells as not run, so L1 cannot come out supported."""
    from lexicon import wordpiece as WP
    vocabs = [('V0', WP.load_v0(), WP.V0_PATH)]
    if WP.v1_available():
        vocabs.append(('V1', WP.load_v1(), WP.v1_path()))
    elif not DRY:
        sys.exit('V1 is not cached (run golden/make_vocab_v1.py): L1\'s V1 cells are in force (Amendment 1 item 3, '
                 'Amendment 4 item 2), so the decisive run refuses without it')
    info = {t: {'entries': len(v), 'sha256': v.sha256} for t, v, _ in vocabs}
    if 'V1' not in info:
        info['V1'] = {'skipped': 'V1 is not cached (run golden/make_vocab_v1.py); its cells are not run (a dry run '
                                 'only: the decisive run refuses)'}
    return vocabs, info


def withhold_text(examples, where):
    """Examples without their instance text: each text field (a record window, a token list) becomes its SHA-256
    (of the window's UTF-8; of a token list's JSON) and its length; the rest is kept. where names the cache file
    that holds the full examples."""
    out = []
    for e in examples:
        x = {k: v for k, v in e.items() if k not in P2_TEXT_FIELDS}
        for k in P2_TEXT_FIELDS:
            if k in e:
                v = e[k]
                x[k + '_sha256'] = sha(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
                x[k + '_length'] = len(v)
        x['text'] = f'not committed (L1 Data: UD EWT text is not committed); the example is in {where}'
        out.append(x)
    return out


def _differs(ctl, i, rec, other):
    """Count one instance of an L1 control and keep the first examples where the control's record differs (a window
    of both records from a little before the first differing character)."""
    ctl['instances'] += 1
    if other != rec:
        ctl['differ'] += 1
        if len(ctl['examples']) < P2_EXAMPLES:
            from lexicon.phase2 import first_difference
            k = first_difference(rec, other)
            a = max(0, k - 40)
            ctl['examples'].append({'instance': i, 'first_difference_at': k, 'registered': rec[a:a + P2_CLIP],
                                    'control': other[a:a + P2_CLIP]})


def p2_l1_set(S, vocabs, hf_ok):
    """One instance set through N_B and WordPiece once per vocabulary: per-instance records (gzip) and their SHA-256
    list in the cache, the id stream, controls 2 and 3 where this set carries them, and Hugging Face's tokens."""
    from lexicon import phase2 as P, wordpiece as WP
    from lexicon.normalise import nb
    name, blobs = S['name'], S['blobs']
    out_dir = os.path.join(P2_CACHE, 'l1')
    c2_on, c3_on = name in P2_C2_SETS, name in P2_C3_SETS
    cells = {}
    for tag, v, path in vocabs:
        sha_path = os.path.join(out_dir, f'{name}.{tag}.sha256.txt')
        rec_path = os.path.join(out_dir, f'{name}.{tag}.records.txt.gz')
        cells[tag] = {'sha_path': sha_path, 'rec_path': rec_path, 'hexes': [], 'stream': P.IdStream(),
                      'sha_file': open(sha_path, 'w', encoding='ascii', newline='\n'),
                      'records': P.GzipLines(rec_path),
                      'c2': {'instances': 0, 'differ': 0, 'examples': []},
                      'c3': {'instances': 0, 'differ': 0, 'examples': []},
                      'hf': {'instances': 0, 'differ': 0, 'examples': []},
                      'tok': P.hf_tokenizer(path) if hf_ok else None}
    t0 = time.time()
    for start in range(0, len(blobs), P2_BATCH):
        batch = blobs[start:start + P2_BATCH]
        hf = {}
        if hf_ok:
            texts = [b.decode('utf-8') for b in batch]
            hf = {tag: cells[tag]['tok'].encode_batch(texts, add_special_tokens=False) for tag, _, _ in vocabs}
        for j, data in enumerate(batch):
            i = start + j
            r = nb(data)
            r3 = nb(data, strip_accents=False) if c3_on else None
            for tag, v, _ in vocabs:
                c = cells[tag]
                rec, ids, pieces = P.record_of(r, v)
                h = P.sha_hex(rec)
                c['hexes'].append(h)
                c['sha_file'].write(h + '\n')
                c['records'].write(rec)
                c['stream'].add(ids)
                if c2_on:
                    _differs(c['c2'], i, rec, P.record_of(r, v, shortest=True)[0])
                if c3_on:
                    _differs(c['c3'], i, rec, P.record_of(r3, v)[0])
                if hf_ok:
                    toks = hf[tag][j].tokens
                    c['hf']['instances'] += 1
                    if toks != pieces:
                        c['hf']['differ'] += 1
                        if len(c['hf']['examples']) < P2_EXAMPLES:
                            k = P.first_difference(pieces, toks)
                            c['hf']['examples'].append({'instance': i, 'first_difference_at': k,
                                                        'ours': pieces[max(0, k - 3):k + 5],
                                                        'hf': toks[max(0, k - 3):k + 5],
                                                        'tokens': [len(pieces), len(toks)]})
    seconds = round(time.time() - t0, 1)
    res = {'instances': len(blobs), 'instances_sha256': S['sha256'], 'pinned': S['pinned'], 'source': S['source'],
           'cells': {}, 'seconds_records_controls_hf': seconds}
    if 'files' in S:
        res['files'] = S['files']
    if name in P2_TEXT_NOT_COMMITTED:
        # the full examples to the cache; the JSON (committed) gets them without their text
        ex_path = os.path.join(out_dir, f'{name}.examples.json')
        full = {kind: {tag: cells[tag][kind]['examples'] for tag, _, _ in vocabs} for kind in ('c2', 'c3', 'hf')}
        with open(ex_path, 'w', encoding='utf-8') as f:
            json.dump(full, f, indent=1, ensure_ascii=False)
            f.write('\n')
        for tag, _, _ in vocabs:
            for kind in ('c2', 'c3', 'hf'):
                cells[tag][kind]['examples'] = withhold_text(cells[tag][kind]['examples'], cache_name(ex_path))
        res['examples_file'] = cache_name(ex_path)
    for tag, v, _ in vocabs:
        c = cells[tag]
        c['sha_file'].close()
        c['records'].close()
        digest = P.list_digest(c['hexes'])
        if sha(open(c['sha_path'], 'rb').read()) != digest:
            raise AssertionError(f"{c['sha_path']}: the file is not its list digest")
        t1 = time.time()
        metrics = json_safe(WP.metrics(blobs, v))
        cell = {'records_list_sha256': digest, 'records_sha256_file': cache_name(c['sha_path']),
                'records_file': cache_name(c['rec_path']), 'id_stream': c['stream'].summary(),
                'metrics': metrics, 'seconds_metrics': round(time.time() - t1, 1)}
        if hf_ok:
            cell['hf_agreement'] = {'instances_whose_tokens_differ': c['hf']['differ'],
                                    'instances': c['hf']['instances'], 'examples': c['hf']['examples']}
        res['cells'][tag] = cell
    controls = {}
    for n, on in (('2', c2_on), ('3', c3_on)):
        if on:
            controls[n] = {tag: {k: cells[tag]['c' + n][k] for k in ('instances', 'differ', 'examples')}
                           for tag, _, _ in vocabs}
    return res, controls


def p2_control1(S):
    """L1 control 1, the reference's side (Amendment 4 item 3): per case, SHA-256 of the UTF-8 of S6's R(s) computed
    from the pinned table (lexicon.phase2.table_r), the list in the cache and its digest. Node and Chromium check
    their own table pipeline against this list and compare it with the platform's toLowerCase/normalize/\\p{Mn}.
    Reported only: how many cases Python's own unicodedata (15.1.0 here) gives the same string for."""
    import unicodedata
    from lexicon import phase2 as P
    path = os.path.join(P2_CACHE, 'l1', f"control1.{S['name']}.sha256.txt")
    hexes, agree, changed = [], 0, 0
    with open(path, 'w', encoding='ascii', newline='\n') as f:
        for b in S['blobs']:
            s = b.decode('utf-8')
            t = P.table_r(s)
            h = P.sha_hex(t)
            hexes.append(h)
            f.write(h + '\n')
            changed += t != s
            own = ''.join(ch for ch in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(ch) != 'Mn')
            agree += own == t
    return {'cases': len(hexes), 'list_sha256': P.list_digest(hexes), 'file': cache_name(path),
            'cases_changed_by_R': changed,
            'python_unicodedata_gives_the_same_string': f'{agree}/{len(hexes)} (unicodedata '
                                                         f'{unicodedata.unidata_version}; reported, never decisive)'}


def run_p2_l1(wn):
    from lexicon import phase2 as P
    os.makedirs(os.path.join(P2_CACHE, 'l1'), exist_ok=True)
    vocabs, vinfo = p2_vocabs()
    hf_version, hf_reason = P.hf_version()
    hf_ok = hf_version is not None
    trace = P.trace_check([(t, v) for t, v, _ in vocabs])
    if trace['equal'] != trace['lines']:
        sys.exit(f'the record does not reproduce traces/wordpiece_v1.txt: {trace["first_mismatch"]}')
    trace['vocabularies'] = [t for t, _, _ in vocabs]
    if 'skipped' in vinfo['V1']:
        trace['not_checked'] = "V1's lines (V1 is not cached; a dry run only)"
    log(f"  L1 records reproduce the traces: {trace['equal']}/{trace['lines']} lines ({', '.join(trace['vocabularies'])}"
        + (f"; not checked: {trace['not_checked']}" if 'not_checked' in trace else '') + ')')
    out = {'scope': 'the reference side (Amendment 4 items 2 and 3); L1 is decided by comparing Node and Chromium '
                    'with these digests',
           'record': "normalised text as UTF-8 hex ('-' when empty) TAB pieces 'id,start,end,hex' separated by "
                     "single spaces ('-' when none), as traces/wordpiece_v1.txt; per-instance SHA-256 over the "
                     "record's UTF-8; list digest = SHA-256 of the hex lines, LF after each (the cache file)",
           'id_stream': 'Amendment 1 item 2: per instance LEB128(number of ids) then LEB128 of each id, instances in '
                        'order',
           'vocabularies': vinfo, 'trace_check': trace,
           'hugging_face': {'tokenizers': hf_version, 'not_run': hf_reason,
                            'settings': 'BertWordPieceTokenizer(vocab file, lowercase=True, strip_accents=True, '
                                        'clean_text=True, handle_chinese_chars=True), '
                                        'encode(add_special_tokens=False); an instance differs when its token '
                                        'strings differ from ours'},
           'sets': {}, 'controls': {}}
    c2, c3, c1 = {}, {}, {}
    for S in p2_l1_sets(wn):
        log(f"  L1 ({S['name']}): {len(S['blobs'])} instances")
        res, ctl = p2_l1_set(S, vocabs, hf_ok)
        if S['name'] in P2_C1_SETS:
            t0 = time.time()
            c1[S['name']] = p2_control1(S)
            c1[S['name']]['seconds'] = round(time.time() - t0, 1)
        for tag, x in ctl.get('2', {}).items():
            c2.setdefault(tag, {})[S['name']] = x
        for tag, x in ctl.get('3', {}).items():
            c3.setdefault(tag, {})[S['name']] = x
        out['sets'][S['name']] = res
        for tag, cell in res['cells'].items():
            log(f"    {tag}: list {cell['records_list_sha256'][:16]}..., "
                f"id stream {cell['id_stream']['sha256'][:16]}..."
                + (f", HF differs on {cell['hf_agreement']['instances_whose_tokens_differ']}" if hf_ok else ''))
        S['blobs'] = None
    weak2 = {tag: any(x['differ'] > 0 for x in sets.values()) for tag, sets in c2.items()}
    weak3 = {tag: any(x['differ'] > 0 for x in sets.values()) for tag, sets in c3.items()}
    out['controls'] = {
        '1': {'what': "S6's R(s) = drop Mn(NFD(lower(s))) from the pinned table, per case (lexicon.phase2.table_r): "
                      "the reference side Node and Chromium compare the platform's toLowerCase().normalize('NFD') "
                      'minus \\p{Mn} against; decided there (must differ on >= 1 case)',
              'sets': c1},
        '2': {'what': 'WordPiece shortest-match-first against the registered longest-match-first; an instance differs '
                      'when its record differs (must differ on >= 1 instance of ' + ' or '.join(P2_C2_SETS) + ')',
              'cells': c2, 'shows_its_weakness': weak2},
        '3': {'what': 'N_B without accent stripping (lowercase kept, NFD and Mn removal skipped) against the '
                      'registered pipeline; an instance differs when its record differs (must differ on >= 1 '
                      'instance of ' + ' or '.join(P2_C3_SETS) + ')',
              'cells': c3, 'shows_its_weakness': weak3},
    }
    void = [tag for tag in weak2 if not (weak2[tag] and weak3.get(tag))]
    out['decision'] = ('decided by the Node and Chromium runners against these digests; controls 2 and 3 show their '
                       'weakness in every cell' if not void else
                       f'void in the cells {void}: a control passed (controls 2 or 3 did not differ)')
    out['cases'] = sum(s['instances'] for s in out['sets'].values())
    return out


def p2_l4_sets(wn):
    """L4's two instance sets (Amendment 4 items 5 and 6): the small one (every node a query; the mammal spanning
    subtree, or a dry stand-in) and the large one (the noun query sample, or the verb forest's)."""
    from lexicon import rank as R
    pos = 'verb' if DRY else 'noun'
    words, parent, children = forest(wn, pos)
    anc = W.closure(wn['synsets'][pos])
    desc = W.descendants(anc)
    offs = sorted(words)
    if DRY:
        # READING: the dry stand-in for the mammal spanning subtree is the spanning subtree of the verb root with the
        # most descendants (ties to the smallest offset): 00126264 change.v.01, 1,700 synsets. Like the mammals it
        # is a whole spanning subtree hanging from one real synset, ranked against itself.
        roots = sorted(o for o in offs if parent[o] is None)

        def subtree(r):
            out, stack = [], [r]
            while stack:
                o = stack.pop()
                out.append(o)
                stack.extend(children.get(o, ()))
            return out
        size = {r: len(subtree(r)) for r in roots}
        root = min(roots, key=lambda r: (-size[r], r))
        small_offs = sorted(subtree(root))
        small_name = 'verbs-subtree'
        small_source = (f"dry stand-in for the mammal spanning subtree: the spanning subtree of {root} "
                        f"({', '.join(wn['synsets'][pos][root].lemmas)}), the verb root with the most descendants; "
                        'every node a query against the others')
        big_name, big_source = 'verbs', f'the verb forest, queries Rng({1000 + OFF}).sample({len(offs)}, 200)'
        big_q = Rng(1000 + OFF).sample(len(offs), 200)
    else:
        _, small_offs = W.mammal_sets(wn)
        small_name, small_source = 'mammals', 'the mammal spanning subtree; every node a query against the other 1,175'
        big_name = 'nouns'
        big_source = f'the noun query sample Rng(1000).sample({len(offs)}, 1000), against the other {len(offs) - 1:,}'
        big_q = Rng(1000).sample(len(offs), 1000)
    sets = []
    for name, so, source, queries in ((small_name, small_offs, small_source, list(range(len(small_offs)))),
                                      (big_name, offs, big_source, list(big_q))):
        sets.append({'name': name, 'source': source, 'offsets': so, 'words': [words[o] for o in so],
                     'queries': queries, 'nb': [R.graph_neighbours(so, parent, children),
                                                R.closure_neighbours(so, anc, desc)]})
    return sets


def p2_arm(tree, S):
    from lexicon import h2exact as H2, h3tree as H3
    return H3.arm(S['words']) if tree == 'H3' else H2.arm(S['words'])


def p2_l4a(S, arm, queries):
    """L4(a)'s reference side for one set and tree: per-query rank-list SHA-256s, the exact MAPs and pooled mean
    ranks (Amendment 2), and digests of the per-query AP lists (to find a differing query fast). Returns (results,
    summary)."""
    from lexicon import phase2 as P, rank as R
    t0 = time.time()
    rs = R.rank_queries(arm, queries, S['nb'], S['offsets'], rank_list='sha', workers=P2_WORKERS)
    shas = [r.sha for r in rs]
    g, c = [r.ap[0] for r in rs], [r.ap[1] for r in rs]

    def ap_digest(aps):
        return P.list_digest('-' if a is None else f'{a.numerator}/{a.denominator}' for a in aps)
    return rs, {
        'queries': len(rs), 'candidates_per_query': arm.n - 1, 'rank_lists_digest': P.list_digest(shas),
        'graph_map': frac(R.map_exact(g)), 'closure_map': frac(R.map_exact(c)),
        'graph_mean_rank': frac(R.mean_rank([r.ranks[0] for r in rs])),
        'closure_mean_rank': frac(R.mean_rank([r.ranks[1] for r in rs])),
        'graph_ap_list_digest': ap_digest(g), 'closure_ap_list_digest': ap_digest(c),
        'queries_without_graph_neighbours': sum(a is None for a in g),
        'queries_without_closure_neighbours': sum(a is None for a in c),
        'seconds': round(time.time() - t0, 1), 'rank_list_sha256': shas}


def p2_float(S, arm, queries, cols):
    """L4(b)'s counts for one set and tree (float64 columns) or control 1's (float32): (results, summary).

    READING: a tree's "first inversion" is the first inversion, in exact order, of the first query in sample order
    that has one; its "deeper word" is the longer of the pair's two candidate words (the query's own word is reported
    beside it). Float keys compare as IEEE-754 does: an overflowed key (inf, possible in float32 at mammal depth) is
    larger than every finite key, and a nan key (inf - inf) is neither an inversion nor a tie; the number of
    non-finite keys is reported, never dropped."""
    from lexicon import phase2 as P
    t0 = time.time()
    fr = P.float_queries(arm, queries, cols, workers=P2_WORKERS)
    WL, offs = S['words'], S['offsets']
    k = next((k for k, r in enumerate(fr) if r.first), None)
    first = None
    if k is not None:
        r = fr[k]
        pos, a, b, fa, fb = r.first
        first = {'query_index': k, 'query': offs[r.query], 'query_word_length': len(WL[r.query]),
                 'position_in_exact_order': pos, 'pair': [offs[a], offs[b]], 'word_lengths': [len(WL[a]), len(WL[b])],
                 'deeper_word_length': max(len(WL[a]), len(WL[b])), 'float_keys': [repr(fa), repr(fb)]}
    deeper = [max(len(WL[r.first[1]]), len(WL[r.first[2]])) for r in fr if r.first]
    hist = defaultdict(int)
    for x in deeper:
        hist[x] += 1
    return fr, {
        'queries': len(fr), 'queries_with_inversion': sum(r.inversions > 0 for r in fr),
        'inversions': sum(r.inversions for r in fr), 'float_ties_of_strictly_ordered_pairs': sum(r.ties for r in fr),
        'queries_with_float_ties': sum(r.ties > 0 for r in fr), 'nonfinite_float_keys': sum(r.nonfinite for r in fr),
        'first_inversion': first,
        'deeper_word_length_at_each_querys_first_inversion': {
            'queries': len(deeper), 'min': min(deeper) if deeper else None, 'max': max(deeper) if deeper else None,
            'histogram': dict(sorted(hist.items()))},
        'seconds': round(time.time() - t0, 1),
        'per_query_inversions': [r.inversions for r in fr], 'per_query_float_ties': [r.ties for r in fr]}


def p2_control2(S, arm, graph_ap):
    """L4 control 2 on every query of the small set in H3: where a graph-edge neighbour ties exactly with a
    non-neighbour, the AP of the float evaluator (acosh of the float64 key, then node index) against the pessimistic
    exact AP. graph_ap[u]: the exact graph-edge AP of node u (from L4(a))."""
    from lexicon import phase2 as P
    t0 = time.time()
    cols = P.float_cols(arm)
    gnb = S['nb'][0]
    tied, differ, examples = 0, 0, []
    for u in S['queries']:
        if not P.exact_tie(arm.keys(u), u, gnb[u]):
            continue
        tied += 1
        fap = P.acosh_ap(u, gnb[u], P.float_keys(cols, u))
        if fap != graph_ap[u]:
            differ += 1
            if len(examples) < P2_EXAMPLES:
                examples.append({'query': S['offsets'][u], 'exact_pessimistic_ap': frac(graph_ap[u]),
                                 'acosh_index_ap': frac(fap)})
    status = ('N/A: no exact neighbour/non-neighbour tie' if tied == 0 else
              'shows its weakness' if differ else 'passed: the test it controls is void')
    return {'queries': len(S['queries']), 'queries_with_an_exact_tie': tied, 'queries_whose_ap_differs': differ,
            'examples': examples, 'status': status, 'seconds': round(time.time() - t0, 1)}


def p2_phase1_cross_check(name, tree, summary):
    """Reported: L4(a)'s MAPs and mean ranks against Phase 1's L5 values for the same arm, set and queries (the
    mammals in a decisive run; the verb sample in a dry run), read from results/claims.json (or results/dry/)."""
    path = os.path.join(RESULTS, 'claims.json')
    if not os.path.exists(path):
        return None
    sets = json.load(open(path))['claims'].get('L5', {}).get('sets', {})
    if name not in sets or sets[name]['queries'] != summary['queries']:
        return None
    arm = sets[name]['arms'][tree]
    keys = ('graph_map', 'closure_map', 'graph_mean_rank', 'closure_mean_rank')
    return {'source': os.path.relpath(path, HERE), 'equal': all(arm[k]['exact'] == summary[k]['exact'] for k in keys)}


def run_p2_l4(wn):
    import numpy as np
    from lexicon import phase2 as P
    sys.set_int_max_str_digits(0)
    small, big = p2_l4_sets(wn)
    out = {'scope': '(a) the reference side, decided by comparing Node with it (Amendment 4 item 5); (b) decided here '
                    '(item 6)',
           'sets': {S['name']: {'nodes': len(S['offsets']), 'queries': len(S['queries']), 'source': S['source']}
                    for S in (small, big)},
           'a': {}, 'b': {}, 'controls': {}}
    a_big_q = big['queries'][:L4A_NOUN_QUERIES]
    out['sets'][big['name']]['queries_in_a'] = len(a_big_q)
    arms, graph_ap_small = {}, {}
    for S, queries in ((small, small['queries']), (big, a_big_q)):
        out['a'][S['name']] = {}
        for tree in ('H3', 'H2'):
            t0 = time.time()
            arm = arms[(S['name'], tree)] = p2_arm(tree, S)
            build = round(time.time() - t0, 1)
            rs, summary = p2_l4a(S, arm, queries)
            summary['seconds_arm'] = build
            cross = p2_phase1_cross_check(S['name'], tree, summary)
            if cross is not None:
                summary['phase1_l5_cross_check'] = cross
            out['a'][S['name']][tree] = summary
            if S is small and tree == 'H3':
                graph_ap_small = {r.query: r.ap[0] for r in rs}
            log(f"  L4(a) {S['name']} {tree}: graph MAP {summary['graph_map']['float']:.6f}, closure MAP "
                f"{summary['closure_map']['float']:.6f}, rank lists {summary['rank_lists_digest'][:16]}... "
                f"({summary['seconds']} s)")
    # (b): float64 inversions on the large set's whole query sample, in H3 and in H2
    with_inv = set()
    out['b'] = {'set': big['name'], 'queries': len(big['queries']), 'trees': {}}
    for tree in ('H3', 'H2'):
        arm = arms[(big['name'], tree)]
        fr, summary = p2_float(big, arm, big['queries'], P.float_cols(arm))
        with_inv |= {k for k, r in enumerate(fr) if r.inversions}
        out['b']['trees'][tree] = summary
        log(f"  L4(b) {big['name']} {tree}: {summary['queries_with_inversion']}/{summary['queries']} queries with an "
            f"inversion, {summary['inversions']} inversions, {summary['float_ties_of_strictly_ordered_pairs']} float "
            f"ties ({summary['seconds']} s)")
    out['b']['queries_with_an_inversion_in_H3_or_H2'] = len(with_inv)
    # control 1: float32 on every query of the small set in H3
    arm = arms[(small['name'], 'H3')]
    _, c1 = p2_float(small, arm, small['queries'], P.float_cols(arm, np.float32))
    c1['what'] = ('float64 coordinates rounded to float32, the key in float32 arithmetic (numpy), every query of '
                  f"{small['name']} in H3: must show >= 1 inversion, or (b) is void")
    out['controls']['1'] = c1
    log(f"  L4 control 1 (float32, {small['name']} H3): {c1['queries_with_inversion']}/{c1['queries']} queries with an "
        f"inversion; {c1['nonfinite_float_keys']} non-finite keys")
    c2 = p2_control2(small, arm, graph_ap_small)
    c2['what'] = ('the float evaluator sorting by float64 acosh(max(1, key)) then node index, against the pessimistic '
                  f"exact graph-edge AP, on every query of {small['name']} in H3 with an exact neighbour/non-neighbour "
                  'tie: must differ on >= 1 (N/A, not void, without ties)')
    out['controls']['2'] = c2
    log(f"  L4 control 2 (acosh with index ties): {c2['status']}, {c2['queries_whose_ap_differs']}/"
        f"{c2['queries_with_an_exact_tie']} tied queries differ")
    # READING: control 2 is registered for L4 without naming a part; a passing control 2 (ties present, no AP
    # differs) is read as voiding (b) here (and (a), which the cross-engine runner decides), by the common rule.
    if c1['queries_with_inversion'] == 0 or c2['status'].startswith('passed'):
        out['b']['decision'] = 'void'
    else:
        out['b']['decision'] = 'supported' if with_inv else 'refuted'
    out['decision'] = f"(a) decided against Node; (b) {out['b']['decision']}"
    out['cases'] = sum(len(S['queries']) for S in (small, big))
    return out


P2_CLAIMS = {'L1': run_p2_l1, 'L4': run_p2_l4}


def p2_environment():
    import unicodedata
    import numpy
    from lexicon import phase2 as P, unicode_tables as U

    def run(*cmd):
        try:
            return subprocess.run(list(cmd), capture_output=True, text=True, check=True).stdout.strip()
        except Exception:  # noqa: BLE001 (a missing tool is recorded as None)
            return None
    hf, _ = P.hf_version()
    return {'python': platform.python_version(), 'python_unicodedata': unicodedata.unidata_version,
            'unicode_table': {'version': U.VERSION, 'sha256': U.SHA256, 'note': 'N_B and table_r read only this'},
            'platform': platform.platform(), 'numpy': numpy.__version__, 'tokenizers': hf,
            'node': run('node', '--version') if shutil.which('node') else None,
            'git_head': run('git', '-C', lexicon.REPO, 'rev-parse', 'HEAD'),
            'reference_uncommitted_changes': bool(run('git', '-C', lexicon.REPO, 'status', '--porcelain', '--', HERE))}


def write_p2(results, names):
    os.makedirs(RESULTS, exist_ok=True)
    stem = 'phase2-python' if names == list(P2_CLAIMS) else 'phase2-python-' + '-'.join(names)
    with open(os.path.join(RESULTS, stem + '.json'), 'w') as f:
        json.dump(json_safe(results), f, indent=1, ensure_ascii=False)
        f.write('\n')
    L = [f"# Hyperbolic Lexicon, Phase 2, the Python reference's half{' (dry run)' if DRY else ''}", '',
         f"Run {results['started']} with {results['preregistration']}. Per-instance lists: "
         f"{results['cache']['root']}/{results['cache']['dir']}/.", '',
         '| Claim | Decision | Cases | Seconds |', '| --- | --- | --- | --- |']
    for k, v in results['claims'].items():
        L.append(f"| {k} | {v['decision']} | {v.get('cases', '')} | {v.get('seconds', '')} |")
    L.append('')
    l1r = results['claims'].get('L1')
    if l1r:
        L += ['## L1', '', '| Set | Vocab | Instances | Record list SHA-256 | Id stream SHA-256 | Fertility '
              '| [UNK] rate | Fail-closed | HF differs |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |']
        for s, sv in l1r['sets'].items():
            for tag, c in sv['cells'].items():
                m = c['metrics']
                hfd = c.get('hf_agreement', {}).get('instances_whose_tokens_differ', 'not run')
                L.append(f"| {s} | {tag} | {sv['instances']} | `{c['records_list_sha256'][:16]}…` | "
                         f"`{c['id_stream']['sha256'][:16]}…` | {m['fertility']:.4f} | {m['unkRate']:.4f} | "
                         f"{m['failClosed']} | {hfd} |")
        L.append('')
        for n in ('2', '3'):
            ctl = l1r['controls'][n]
            L.append(f"Control {n}: " + '; '.join(f"{tag} " + ', '.join(f"{s} {x['differ']}/{x['instances']}"
                                                                       for s, x in sets.items())
                                                 for tag, sets in ctl['cells'].items())
                     + f" differ (shows its weakness: {ctl['shows_its_weakness']}).")
        L.append('Control 1 (reference side): ' + '; '.join(f"{s} {x['cases']} cases, list `{x['list_sha256'][:16]}…`"
                                                           for s, x in l1r['controls']['1']['sets'].items()) + '.')
        L.append('')
    l4r = results['claims'].get('L4')
    if l4r:
        L += ['## L4', '', '| Set | Tree | Queries | Rank lists digest | Graph MAP | Closure MAP | Graph mean rank '
              '| Closure mean rank |', '| --- | --- | --- | --- | --- | --- | --- | --- |']
        for s, trees in l4r['a'].items():
            for tree, x in trees.items():
                L.append(f"| {s} | {tree} | {x['queries']} | `{x['rank_lists_digest'][:16]}…` | "
                         f"{x['graph_map']['float']:.6f} | {x['closure_map']['float']:.6f} | "
                         f"{x['graph_mean_rank']['float']:.3f} | {x['closure_mean_rank']['float']:.3f} |")
        b, c1, c2 = l4r['b'], l4r['controls']['1'], l4r['controls']['2']
        L += ['', f"(b) on {b['set']}: " + '; '.join(
            f"{t} {x['queries_with_inversion']}/{x['queries']} queries with an inversion ({x['inversions']} "
            f"inversions, {x['float_ties_of_strictly_ordered_pairs']} float ties, first at deeper word length "
            f"{(x['first_inversion'] or {}).get('deeper_word_length')})" for t, x in b['trees'].items())
            + f"; {b['queries_with_an_inversion_in_H3_or_H2']} in H3 or H2: **{b['decision']}**.",
            f"Control 1 (float32): {c1['queries_with_inversion']}/{c1['queries']} queries with an inversion. "
            f"Control 2: {c2['status']} ({c2['queries_whose_ap_differs']}/{c2['queries_with_an_exact_tie']}).", '']
    L += ['## Full results', '', f'`{stem}.json` (per-query lists included).', '']
    with open(os.path.join(RESULTS, stem + '.md'), 'w') as f:
        f.write('\n'.join(L))
    return stem


def main_phase2(argv):
    names = [a for a in argv if not a.startswith('--')] or list(P2_CLAIMS)
    for n in names:
        if n not in P2_CLAIMS:
            sys.exit(f'unknown claim {n}; Phase 2 runs {", ".join(P2_CLAIMS)} here')
    os.makedirs(P2_CACHE, exist_ok=True)
    results = {'preregistration': 'PREREGISTRATION.md with Amendments 1-4', 'phase': 2,
               'engine': 'python (the reference, the authority)', 'dry': DRY,
               'started': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()), 'environment': p2_environment(),
               'cache': {'root': '~/.cache/hyperbolic-lexicon (lexicon.CACHE; HL_CACHE overrides)',
                         'dir': os.path.basename(P2_CACHE)},
               'claims': {}}
    wn = W.load()
    for n in names:
        t0 = time.time()
        log(f'{n} (Phase 2) ...')
        r = P2_CLAIMS[n](wn)
        r['seconds'] = round(time.time() - t0, 1)
        results['claims'][n] = r
        log(f"{n}: {r['decision']} ({r['seconds']} s)")
    stem = write_p2(results, names)
    log(f"wrote {os.path.relpath(os.path.join(RESULTS, stem + '.json'), HERE)} and .md")


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
    if '--phase2' in argv:
        return main_phase2(argv)
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
