#!/usr/bin/env python3
"""Amendment 10 item 17: the fractional-tie values that Phases 1 and 2 left out. It reports and decides nothing.

    python3 -B fractional_ties.py [--workers 4]      writes results/fractional-ties.json and results/fractional-ties.md

The Common rules ("Ties") say that fractional-tie values "are reported, never used to decide". Phase 1 (L5's arms)
and Phase 2 (L4(a)'s rank lists) ranked with exact ties but reported only the pessimistic values. This script
computes the missing values with Amendment 10 item 11's formula: each query's AP averaged over every order inside
each exact tie class, computed exactly. It uses the code and data those runs used.

    L5     run_claims.l5_sets and run_claims.l5_arms, unchanged. The arms are H3, H2, F3, F2, F3*, F2*, S3#0..19 on
           the mammals (S3#0..4 on the nouns) and K3. The sets are the mammal spanning subtree (1,176 nodes, every
           node a query) and the noun query sample (Rng(1000).sample(82115, 1000) against all 82,115 nouns). Each set
           is ranked for graph edges and for the closure.
    L4(a)  run_claims.p2_l4_sets, p2_arm and p2_l4a, unchanged: H3 and H2 on the mammal spanning subtree (every
           node) and on the noun sample's queries 0-199. p2_l4a recomputes the rank lists, and their SHA-256 list
           digest is compared with Phase 2's.

Each query is ranked by lexicon.learned.evaluate(arm, nb_sets, fractional=True, queries=...). That function sends
the query through rank.rank_query (rank._ap_and_ranks, unchanged), which gives the pessimistic AP. From the same
keys, lexicon.learned.fractional_ap gives the fractional-tie AP (A10.11). MAPs come from rank.map_exact and mean
ranks from rank.mean_rank. The S3 row "mean over permutations" is rank.mean_over_permutations of the per-query APs,
as Phase 1 computed it.

Checks (the run stops, writing nothing, when any fails):
    - every recomputed pessimistic MAP and mean rank equals, as an exact rational, the published value in
      results/claims.json (L5) and in results/claims-phase2.json and results/phase2-python.json (L4(a)); for L4(a)
      the rank-list digest and the AP-list digests must match as well. A mismatch means the wrong thing was
      rebuilt;
    - learned.evaluate's pessimistic APs equal p2_l4a's (rank.rank_queries) query by query;
    - for every query, pessimistic AP <= fractional-tie AP;
    - L4(a)'s fractional-tie APs equal L5's for the same arm, set and query;
    - a brute-force self-check: on 300 synthetic key lists (Python's random.Random(80960), not the shared
      generator), fractional_ap equals the mean over every order of every tie class.

Draws (disclosed): building these instances repeats Phase 1's and Phase 2's own generator calls, because A10.17
requires their data. These are Rng(1000).sample(82115, 1000), the noun query sample, and Rng(2000 + i).shuffle
inside address.s3_words (S3: i < 20 on the mammals, i < 5 on the nouns). Nothing of L6 is trained, ranked or
evaluated here. L6's instance, the mammal closure set of 1,182 nodes, is not ranked. W.mammal_sets lists the closure
set's offsets only to find the spanning subtree, as Phase 1 and Phase 2 did.

Per-query fractional-tie APs ('p/q', or '-' when a query has no neighbours) go to lexicon.CACHE/fractional-ties/,
outside git. The JSON keeps their list digests (phase2.list_digest).

READING (A10.17, "Phase 2's L4(a) rank lists"): the values are computed for the queries and arms whose rank lists
L4(a) hashed, on the same exact keys. A rank list orders ties by offset, and that order does not affect the
fractional-tie AP, which averages over every order inside a tie class. The rank lists themselves are rebuilt by
p2_l4a only to check that the run rebuilt Phase 2's lists, and their digest is compared.
READING (A10.17, "Phase 1's L5 arms"): every arm L5 ranked, each S3 permutation included, for both neighbour sets
L5 ranked (graph edge, the primary metric, and the closure, which L5 reported). Each set also gets S3's per-query
mean over the permutations, the way Phase 1 formed it from the APs (rank.mean_over_permutations). For fractional
APs this is the fractional-tie value of that mean. Phase 1 published the S3 mean for the graph edge only, so the
closure S3 mean, pessimistic and fractional, is new and has nothing published to check against. L5's paired
intervals are not recomputed with fractional APs: A10.11 and A10.17 name fractional-tie MAPs, not intervals.
"""
import hashlib
import itertools
import json
import os
import platform
import random
import subprocess
import sys
import time
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
if '--dry' in sys.argv:
    sys.exit('fractional_ties.py has no dry run: it reports on the decided Phase 1 and Phase 2 instances')
import run_claims as RC  # noqa: E402  (Phase 1 and Phase 2's runner: their sets, arms and L4(a) function)
import lexicon  # noqa: E402
from lexicon import learned as LE  # noqa: E402
from lexicon import phase2 as P  # noqa: E402
from lexicon import rank as R  # noqa: E402
from lexicon import wordnet as W  # noqa: E402

RESULTS = os.path.join(HERE, 'results')
CACHE = os.path.join(lexicon.CACHE, 'fractional-ties')
OUT_STEM = 'fractional-ties'
SELFCHECK_SEED = 80960          # Python's random.Random, not the shared generator (tests' 80000 + i range)
SELFCHECK_CASES = 300
NB_NAMES = ('graph', 'closure')
WHY = ('Common rules, "Ties": fractional-tie values are reported, never used to decide. L5 and L4(a) stay decided '
       'as Phases 1 and 2 recorded them, on pessimistic ties.')
DECIDES = 'Nothing. ' + WHY
FORMULA = ('Amendment 10 item 11: each query\'s AP averaged over all orders inside each exact tie class, computed '
           'exactly. Walking the tie classes in key order, with lo candidates before a class and h neighbours already '
           'passed, a class of m candidates holding k >= 1 neighbours adds sum_{j=1..m} (k/m) (h + 1 + (j - 1)(k - 1)/'
           '(m - 1)) / (lo + j) ((h + 1)/(lo + 1) when m = 1); the AP is the total over the number of neighbours.')


def log(msg):
    print(msg, flush=True)


class CheckFailed(Exception):
    pass


def check(cond, what):
    if not cond:
        raise CheckFailed(what)


def value(x):
    """An exact rational for JSON: run_claims.frac's {'exact': 'p/q', 'float'} plus a correctly rounded decimal."""
    out = RC.frac(x)
    out['decimal'] = decimal(Fraction(x))
    return out


def gap_value(x):
    """A difference of two MAPs for JSON: decimal and float only (the exact value is the difference of the two exact
    MAPs beside it)."""
    x = Fraction(x)
    return {'decimal': decimal(x), 'float': float(x)}


def decimal(x, places=12):
    """x rounded to `places` decimals, half to even, exactly (no float)."""
    sign = '-' if x < 0 else ''
    q = abs(x) * 10 ** places
    n, r = divmod(q.numerator, q.denominator)
    if 2 * r > q.denominator or (2 * r == q.denominator and n % 2):
        n += 1
    return f'{sign}{n // 10 ** places}.{n % 10 ** places:0{places}d}'


def ap_text(a):
    return '-' if a is None else f'{a.numerator}/{a.denominator}'


def sha_file(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def git(*args):
    r = subprocess.run(['git', '-C', HERE] + list(args), capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else None


# ================================================================ self-check of the formula (synthetic only)
def _brute_ap(keys, u, nb):
    """The mean AP over every order inside every tie class of the candidates (all nodes but u), by enumeration."""
    cand = sorted((keys[v], v) for v in range(len(keys)) if v != u)
    classes, i = [], 0
    while i < len(cand):
        j = i
        while j < len(cand) and cand[j][0] == cand[i][0]:
            j += 1
        classes.append([v for _, v in cand[i:j]])
        i = j
    nbs = set(nb)
    total, count = Fraction(0), 0
    for perm in itertools.product(*(itertools.permutations(c) for c in classes)):
        hits, ap = 0, Fraction(0)
        for pos, v in enumerate((v for c in perm for v in c), 1):
            if v in nbs:
                hits += 1
                ap += Fraction(hits, pos)
        total += ap / len(nbs)
        count += 1
    return total / count


def selfcheck():
    """fractional_ap against brute force, and pessimistic <= fractional, on synthetic key lists with many ties
    (some tying the query's own key)."""
    rnd = random.Random(SELFCHECK_SEED)
    differ = 0
    for _ in range(SELFCHECK_CASES):
        n = rnd.randint(2, 8)
        keys = [rnd.randint(0, rnd.randint(1, 4)) for _ in range(n)]
        u = rnd.randrange(n)
        others = [v for v in range(n) if v != u]
        nb = sorted(rnd.sample(others, rnd.randint(1, len(others))))
        S = LE.query_sorted(keys, u)
        f = LE.fractional_ap(S, keys, nb)
        b = _brute_ap(keys, u, nb)
        pess = R._ap_and_ranks(S, keys, nb)[0]
        check(f == b, f'self-check: fractional_ap {f} != brute force {b} on keys {keys}, query {u}, nb {nb}')
        check(pess <= f, f'self-check: pessimistic AP {pess} > fractional {f} on keys {keys}, query {u}, nb {nb}')
        differ += pess != f
    check(LE.fractional_ap([], [0], []) is None, 'self-check: a query without neighbours must give None')
    return {'cases': SELFCHECK_CASES, 'generator': f'Python random.Random({SELFCHECK_SEED}) (not the shared Rng)',
            'candidates_per_case': '1-7', 'cases_where_fractional_differs_from_pessimistic': differ,
            'result': 'fractional_ap equals the brute-force mean over every tie order in every case; pessimistic <= '
                      'fractional in every case'}


# ================================================================ one arm
def evaluate_arm(arm, S, queries, workers):
    """learned.evaluate with fractional-tie APs, for both neighbour sets of S (graph edge, closure)."""
    ev = LE.evaluate(arm, dict(zip(NB_NAMES, S['nb'])), workers=workers, fractional=True, queries=queries)
    for k in NB_NAMES:
        for q, (a, f) in enumerate(zip(ev.aps[k], ev.frac_aps[k])):
            check((a is None) == (f is None), f'{arm.name} {k} query {q}: AP present in one count only')
            if a is not None:
                check(a <= f, f'{arm.name} {k} query {q}: pessimistic AP {a} > fractional {f}')
    return ev


def summarize(ev, cache_stem):
    """The values of one arm: per neighbour set, the pessimistic and fractional-tie MAPs, their difference, the
    number of queries whose AP depends on the order inside a tie class, and the per-query lists' digests (the
    lists themselves go to the cache)."""
    os.makedirs(CACHE, exist_ok=True)
    out = {}
    for k in NB_NAMES:
        pess, fr = ev.map[k], ev.frac_map[k]
        lines = [ap_text(a) for a in ev.frac_aps[k]]
        path = os.path.join(CACHE, f'{cache_stem}-{k}.txt')
        with open(path, 'w') as f:
            f.write(''.join(x + '\n' for x in lines))
        out[k] = {'pessimistic_map': value(pess), 'fractional_map': value(fr),
                  'fractional_minus_pessimistic': gap_value(fr - pess),
                  'queries_whose_ap_differs': sum(1 for a, b in zip(ev.aps[k], ev.frac_aps[k]) if a != b),
                  'queries_with_neighbours': sum(a is not None for a in ev.aps[k]),
                  'pessimistic_mean_rank': value(ev.mean_rank[k]),
                  'fractional_ap_list_digest': P.list_digest(lines),
                  'pessimistic_ap_list_digest': P.list_digest(ap_text(a) for a in ev.aps[k]),
                  'cache': RC.cache_name(path)}
    out['candidate_ties'] = {'ties': ev.ties, 'queries_with_a_tie': ev.tied_queries,
                             'what': 'over the queries, candidates minus distinct candidate keys (learned.Eval.ties)'}
    return out


# ================================================================ L5 (Phase 1)
def run_l5(wn, workers, published):
    out, per_query = {}, {}
    for S in RC.l5_sets(wn):
        name = S['name']
        pub = published['sets'][name]
        check(len(S['offsets']) == pub['nodes'] and len(S['queries']) == pub['queries'],
              f'L5 {name}: {len(S["offsets"])} nodes / {len(S["queries"])} queries, published {pub["nodes"]} / '
              f'{pub["queries"]}')
        log(f"L5 {name}: {len(S['offsets'])} nodes, {len(S['queries'])} queries")
        arms, aps, faps = {}, {}, {}
        for arm_name, build in RC.l5_arms(wn, S):
            t0 = time.time()
            arm = build()
            ev = evaluate_arm(arm, S, S['queries'], workers)
            p = pub['arms'][arm_name]
            for k in NB_NAMES:
                check(RC.frac(ev.map[k])['exact'] == p[f'{k}_map']['exact'],
                      f'L5 {name} {arm_name}: pessimistic {k} MAP differs from results/claims.json')
                check(RC.frac(ev.mean_rank[k])['exact'] == p[f'{k}_mean_rank']['exact'],
                      f'L5 {name} {arm_name}: {k} mean rank differs from results/claims.json')
            entry = summarize(ev, f'l5-{name}-{arm_name.replace("*", "star").replace("#", "-")}')
            entry['published_pessimistic_equal'] = True
            entry['seconds'] = round(time.time() - t0, 1)
            arms[arm_name] = entry
            aps[arm_name], faps[arm_name] = ev.aps, ev.frac_aps
            log(f"  {arm_name}: graph {float(ev.map['graph']):.6f} -> {float(ev.frac_map['graph']):.6f}, closure "
                f"{float(ev.map['closure']):.6f} -> {float(ev.frac_map['closure']):.6f}; differing queries "
                f"{entry['graph']['queries_whose_ap_differs']}/{entry['closure']['queries_whose_ap_differs']} "
                f"({entry['seconds']} s)")
        # S3 as Phase 1 computed it: queries with an H3 graph-edge AP kept, the per-query mean over permutations
        keep = [i for i, a in enumerate(aps['H3']['graph']) if a is not None]
        perms = [k for k in aps if k.startswith('S3#')]
        s3 = {}
        for k in NB_NAMES:
            pm = R.mean_over_permutations([[aps[a][k][i] for i in keep] for a in perms])
            fm = R.mean_over_permutations([[faps[a][k][i] for i in keep] for a in perms])
            s3[k] = {'pessimistic_map': value(R.map_exact(pm)), 'fractional_map': value(R.map_exact(fm)),
                     'fractional_minus_pessimistic': gap_value(R.map_exact(fm) - R.map_exact(pm))}
        pub_s3 = pub['arms']['S3 (mean over permutations)']
        check(s3['graph']['pessimistic_map']['exact'] == pub_s3['graph_map']['exact'],
              f'L5 {name}: the S3 mean graph MAP differs from results/claims.json')
        s3['graph']['published_pessimistic_equal'] = True
        s3['closure']['published_pessimistic_equal'] = None
        s3['closure']['note'] = 'Phase 1 published the S3 mean for the graph edge only; the closure mean is new here'
        s3['permutations'] = len(perms)
        s3['queries_kept'] = len(keep)
        arms['S3 (mean over permutations)'] = s3
        out[name] = {'nodes': len(S['offsets']), 'queries': len(S['queries']),
                     'queries_without_graph_neighbours': len(S['queries']) - len(keep), 'arms': arms}
        per_query[name] = {a: faps[a] for a in ('H3', 'H2')}
        per_query[name]['_pess'] = {a: aps[a] for a in ('H3', 'H2')}
    return out, per_query


# ================================================================ L4(a) (Phase 2)
def run_l4a(wn, workers, published_python, published_claims, l5_frac):
    out = {}
    small, big = RC.p2_l4_sets(wn)
    for S, queries in ((small, small['queries']), (big, big['queries'][:RC.L4A_NOUN_QUERIES])):
        name = S['name']
        out[name] = {}
        for tree in ('H3', 'H2'):
            t0 = time.time()
            arm = RC.p2_arm(tree, S)
            rs, summary = RC.p2_l4a(S, arm, queries)          # Phase 2's own function: rank lists, MAPs, digests
            pp = published_python['claims']['L4']['a'][name][tree]
            pc = published_claims['claims']['L4a']['node'][name][tree]
            for key in ('rank_lists_digest', 'graph_ap_list_digest', 'closure_ap_list_digest'):
                check(summary[key] == pp[key], f'L4(a) {name} {tree}: {key} differs from results/phase2-python.json')
            for key in ('graph_map', 'closure_map', 'graph_mean_rank', 'closure_mean_rank'):
                check(summary[key]['exact'] == pp[key]['exact'],
                      f'L4(a) {name} {tree}: {key} differs from results/phase2-python.json')
                check(summary[key]['exact'] == pc['exact'][key]['python'],
                      f'L4(a) {name} {tree}: {key} differs from results/claims-phase2.json')
            check(summary['queries'] == pc['queries'], f'L4(a) {name} {tree}: query count differs')
            ev = evaluate_arm(arm, S, queries, workers)
            for i, k in enumerate(NB_NAMES):
                check(ev.aps[k] == [r.ap[i] for r in rs],
                      f'L4(a) {name} {tree}: learned.evaluate and p2_l4a give different pessimistic {k} APs')
                ref = l5_frac[name][tree][k][:len(queries)]
                check(ev.frac_aps[k] == ref, f'L4(a) {name} {tree}: fractional {k} APs differ from L5\'s')
                check(ev.aps[k] == l5_frac[name]['_pess'][tree][k][:len(queries)],
                      f'L4(a) {name} {tree}: pessimistic {k} APs differ from L5\'s')
            entry = summarize(ev, f'l4a-{name}-{tree}')
            entry.update({'queries': len(queries), 'rank_lists_digest': summary['rank_lists_digest'],
                          'published_pessimistic_equal': True, 'seconds': round(time.time() - t0, 1)})
            out[name][tree] = entry
            log(f"L4(a) {name} {tree}: graph {float(ev.map['graph']):.6f} -> {float(ev.frac_map['graph']):.6f}, "
                f"closure {float(ev.map['closure']):.6f} -> {float(ev.frac_map['closure']):.6f}; rank lists "
                f"{summary['rank_lists_digest'][:16]}... equal Phase 2's ({entry['seconds']} s)")
    return out


# ================================================================ output
def md_row(label, arm, e):
    g, c = e['graph'], e['closure']
    d10 = lambda x: decimal(Fraction(x['exact']), 10)                   # noqa: E731
    gap = lambda x: f"{x['fractional_minus_pessimistic']['float']:.3e}"   # noqa: E731
    diff = lambda x: x.get('queries_whose_ap_differs', '')               # noqa: E731
    return (f"| {label} | {arm} | {d10(g['pessimistic_map'])} | {d10(g['fractional_map'])} | {gap(g)} | {diff(g)} | "
            f"{d10(c['pessimistic_map'])} | {d10(c['fractional_map'])} | {gap(c)} | {diff(c)} |")


def write(results):
    os.makedirs(RESULTS, exist_ok=True)
    with open(os.path.join(RESULTS, OUT_STEM + '.json'), 'w') as f:
        json.dump(results, f, indent=1, ensure_ascii=False)
        f.write('\n')
    head = ('| Set | Arm | Graph MAP, pessimistic | Graph MAP, fractional | Difference | Queries that differ | '
            'Closure MAP, pessimistic | Closure MAP, fractional | Difference | Queries that differ |')
    rule = '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
    L = ['# Hyperbolic Lexicon: fractional-tie values for Phases 1 and 2 (Amendment 10 item 17)', '',
         f"**This decides nothing.** {WHY}", '',
         f"Run {results['started']} ({results['seconds']} s, {results['workers']} workers) at "
         f"{results['code']['head'][:12]}, with `reference/fractional_ties.py`"
         + (f" (uncommitted then: {', '.join(results['code']['uncommitted'])}; their SHA-256s are in the JSON)"
            if results['code']['uncommitted'] else '') + '.', '',
         f"**Formula.** {FORMULA}", '',
         f"**Implementation.** {results['implementation']}", '',
         '**Checks.** ' + ' '.join(f'{k}: {v}.' for k, v in results['checks'].items()), '',
         f"**Draws.** {results['draws']}", '',
         'Values are rounded to ten decimal places; the exact rationals are in `fractional-ties.json`. "Queries '
         'that differ" counts the queries whose AP depends on the order inside a tie class.', '',
         '## L5 (Phase 1, `results/claims.json`)', '', head, rule]
    for name, s in results['L5'].items():
        for arm, e in s['arms'].items():
            L.append(md_row(f"{name} ({s['queries']} queries)", arm, e))
    L += ['', 'The S3 row is the per-query mean over the permutations (`rank.mean_over_permutations`), as Phase 1 '
              'computed it. Phase 1 published it for the graph edge only, so its closure values have no published '
              'counterpart to check against.', '',
          '## L4(a) (Phase 2, `results/claims-phase2.json`)', '', head, rule]
    for name, s in results['L4a'].items():
        for tree, e in s.items():
            L.append(md_row(f"{name} ({e['queries']} queries)", tree, e))
    L += ['', 'L4(a)\'s mammal rows are the same queries, arms and neighbour sets as L5\'s mammal H3 and H2 rows. '
              'Its noun rows are L5\'s first 200 noun queries. The values are equal query by query, and this run '
              'checks that.', '']
    with open(os.path.join(RESULTS, OUT_STEM + '.md'), 'w') as f:
        f.write('\n'.join(L))


def main(argv):
    workers = 4
    if '--workers' in argv:
        workers = int(argv[argv.index('--workers') + 1])
    sys.set_int_max_str_digits(0)
    t_start = time.time()
    import numpy
    started = time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
    code_files = ['fractional_ties.py', 'run_claims.py', 'lexicon/learned.py', 'lexicon/rank.py',
                  'lexicon/phase2.py', 'lexicon/h3tree.py', 'lexicon/h2exact.py', 'lexicon/flat.py',
                  'lexicon/address.py', 'lexicon/wordnet.py']
    code = {'head': git('rev-parse', 'HEAD'),
            'files_sha256': {f: sha_file(os.path.join(HERE, f)) for f in code_files},
            'uncommitted': [f for f in code_files
                            if git('status', '--porcelain', '--', os.path.join(HERE, f))]}
    log('self-check of learned.fractional_ap against brute force (synthetic) ...')
    sc = selfcheck()
    published_l5 = json.load(open(os.path.join(RESULTS, 'claims.json')))['claims']['L5']
    published_p2py = json.load(open(os.path.join(RESULTS, 'phase2-python.json')))
    published_p2 = json.load(open(os.path.join(RESULTS, 'claims-phase2.json')))
    wn = W.load()
    l5, l5_frac = run_l5(wn, workers, published_l5)
    l4a = run_l4a(wn, workers, published_p2py, published_p2, l5_frac)
    results = {
        'what': 'Amendment 10 item 17: fractional-tie MAPs for Phase 1\'s L5 arms and Phase 2\'s L4(a) rank lists, '
                'beside the pessimistic MAPs those phases published',
        'decides': DECIDES,
        'preregistration': 'PREREGISTRATION.md with Amendment 10 (items 11 and 17)',
        'started': started,
        'workers': workers,
        'environment': {'python': platform.python_version(), 'platform': platform.platform(),
                        'numpy': numpy.__version__},
        'code': code,
        'formula': FORMULA,
        'implementation': ('lexicon.learned.fractional_ap, the shared function, called through '
                           'lexicon.learned.evaluate(fractional=True). The pessimistic APs come from the same pass '
                           'through rank.rank_query (rank._ap_and_ranks, unchanged), and MAPs from rank.map_exact. '
                           'Instances and arms: run_claims.l5_sets, l5_arms, p2_l4_sets, p2_arm and p2_l4a, '
                           'unchanged.'),
        'draws': ('Building these instances repeats Phase 1\'s and Phase 2\'s own calls of the shared generator: '
                  'Rng(1000).sample(82115, 1000), the noun query sample, and Rng(2000 + i).shuffle in '
                  'address.s3_words (i < 20 on the mammals, i < 5 on the nouns). A10.17 requires the data those runs '
                  'used. Nothing of L6 is trained, ranked or evaluated here, and L6\'s instance, the mammal closure '
                  'set of 1,182 nodes, is not ranked.'),
        'sources': {'L5': 'results/claims.json (Phase 1, run 2026-11-05 12:39 UTC)',
                    'L4a': 'results/claims-phase2.json and results/phase2-python.json (Phase 2)'},
        'checks': {
            'pessimistic values equal the published ones': (
                'every pessimistic value recomputed here equals the published exact rational. L5: the graph-edge '
                f"and closure MAPs and mean ranks of all {sum(len(s['arms']) - 1 for s in l5.values())} arms "
                '(2 sets), and the S3 mean\'s graph-edge MAP in each set (its closure mean was never published). '
                'L4(a): 2 sets x 2 trees, both MAPs and mean ranks, with the rank-list and AP-list digests'),
            'pessimistic <= fractional': 'for every query of every arm and neighbour set',
            'L4(a) equals L5': 'fractional and pessimistic APs equal query by query on the shared queries',
            'learned.evaluate equals p2_l4a': 'pessimistic APs equal query by query',
            'formula self-check': sc['result'],
        },
        'selfcheck': sc,
        'L5': l5,
        'L4a': l4a,
    }
    results['seconds'] = round(time.time() - t_start, 1)
    write(results)
    log(f"wrote results/{OUT_STEM}.json and .md ({results['seconds']} s)")


if __name__ == '__main__':
    try:
        main(sys.argv[1:])
    except CheckFailed as e:
        sys.exit(f'CHECK FAILED, nothing written: {e}')
