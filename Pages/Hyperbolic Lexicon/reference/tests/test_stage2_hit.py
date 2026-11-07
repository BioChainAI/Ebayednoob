"""lexicon.hit (Amendment 13, L14 and items 3, 9, 11, 13): HiT's readers and name verifier on a synthetic zip, the
split counts, the closure check, HIT-R and the dry split against an independent implementation on synthetic DAGs,
and the within-row control's slots, all with seeds 95200 + i (A13.12); then, on WordNet 3.0 and the pinned HiT files,
A13.9's HiT counts (names only, no score) and the shapes of HIT-R and the dry split drawn with unregistered seeds.
hpstep.prng.Rng refuses every seed outside 95200-95499 while these tests run: no registered seed is drawn."""
import hashlib
import json
import zipfile
from fractions import Fraction as F

import pytest

import hpstep.prng as P
from lexicon import hit, senses as S, stage2data as D, wordnet as W


@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    init = P.Rng.__init__

    def guarded(self, seed=0, state=None):
        if state is None and not 95200 <= seed < 95500:
            raise RuntimeError(f'seed {seed}: Stage 2 tests draw 95200 + i only (A13.12)')
        return init(self, seed, state)
    monkeypatch.setattr(P.Rng, '__init__', guarded)


# ================================================================ synthetic DAGs
def random_dag(seed, n=300, extra=0.25, isolated=5):
    """n synsets in a random DAG (one root, a second parent with probability extra), plus isolated synsets and one
    instance-only synset; lemma w<i> lists synset i alone, so its name is w<i>.n.01."""
    rng = P.Rng(seed)
    offs = [f'{i + 1:08d}' for i in range(n + isolated + 1)]
    nouns = {}
    for i, o in enumerate(offs):
        ptrs = []
        if 0 < i < n:
            ps = {rng.below(i)}
            if i > 2 and rng.below(1000) < extra * 1000:
                ps.add(rng.below(i))
            ptrs = [('@', offs[p], 'n') for p in sorted(ps)]
        elif i == n + isolated:
            ptrs = [('@i', offs[0], 'n')]
        nouns[o] = W.Synset('noun', 'n', o, [f'w{i}'], ptrs, '')
    index = {f'w{i}': W.IndexEntry(f'w{i}', 0, [o]) for i, o in enumerate(offs)}
    return {'synsets': {'noun': nouns}, 'index': {'noun': index}}


def slow_ancestors(parents, o):
    seen, stack = set(), list(parents[o])
    while stack:
        p = stack.pop()
        if p not in seen:
            seen.add(p)
            stack.extend(parents[p])
    return seen


def slow_hit_r(wn, seed_split, seed_random, seed_hard, n_val, k=10):
    """An independent HIT-R: its own graph, closure, T order, Fisher-Yates shuffle and rejection loops."""
    nouns = wn['synsets']['noun']
    edges = {(o, p) for o, s in nouns.items() for sym, p, _ in s.ptrs if sym == '@'}
    nodes = sorted({x for e in edges for x in e})
    idx = {o: i for i, o in enumerate(nodes)}
    parents = {o: sorted(p for c, p in edges if c == o) for o in nodes}
    children = {o: sorted(c for c, p in edges if p == o) for o in nodes}
    anc = {o: slow_ancestors(parents, o) for o in nodes}
    T = sorted((idx[c], idx[a]) for c in nodes for a in anc[c] if (c, a) not in edges)
    order = list(T)
    r = P.Rng(seed_split)
    for i in range(len(order) - 1, 0, -1):
        j = r.below(i + 1)
        order[i], order[j] = order[j], order[i]
    rr, rh = P.Rng(seed_random), P.Rng(seed_hard)
    out = []
    for ci, ai in order[:2 * n_val]:
        c = nodes[ci]
        bad = {idx[a] for a in anc[c]} | {ci}
        rnd = []
        while len(rnd) < k:
            x = rr.below(len(nodes))
            if x not in bad and x not in rnd:
                rnd.append(x)
        sib = sorted({idx[s] for p in parents[c] for s in children[p]} - bad)[:k]
        hard = list(sib)
        while len(hard) < k:
            x = rh.below(len(nodes))
            if x not in bad and x not in hard:
                hard.append(x)
        out.append((ci, ai, rnd, hard))
    return len(T), out[:n_val], out[n_val:]


# ================================================================ HIT-R and the dry split (spec 13.15)
@pytest.mark.parametrize('i', [0, 1, 2])
def test_hit_r_equals_an_independent_implementation(i):
    wn = random_dag(95200 + i)
    g = S.at_graph(wn)
    seeds = (95210 + 3 * i, 95211 + 3 * i, 95212 + 3 * i)
    split = hit.hit_r(g, *seeds)
    n_val = split['n_T'] * 5 // 100
    nT, val, test = slow_hit_r(wn, *seeds, n_val)
    assert split['n_T'] == nT == len(hit.indirect_pairs(g))
    assert split['val'] == val and split['test'] == test
    assert len(val) == len(test) == n_val > 0


@pytest.mark.parametrize('i', [0, 1, 2, 3])
def test_hit_r_rows_are_valid(i):
    wn = random_dag(95220 + i, n=400)
    g = S.at_graph(wn)
    split = hit.hit_r(g, 95230 + i, 95240 + i, 95250 + i, n_val=60)
    c = hit.hit_r_counts(split, g)
    assert c == {'rows': 120, 'distinct_rows': 120, 'positives_indirect': True, 'negatives_valid': True,
                 'negatives_distinct': True}
    # the same seeds give the same split; another split seed another order
    assert hit.hit_r(g, 95230 + i, 95240 + i, 95250 + i, n_val=60) == split
    assert hit.hit_r(g, 95260 + i, 95240 + i, 95250 + i, n_val=60)['val'] != split['val']


def test_indirect_pairs_order():
    wn = random_dag(95204, n=120)
    g = S.at_graph(wn)
    T = hit.indirect_pairs(g)
    assert T == sorted(T) and len(T) == g.n_indirect == len(set(T))
    for ci, ai in T:
        c, a = g.nodes[ci], g.nodes[ai]
        assert a in g.ancestors[c] and (c, a) not in g.edge_set


def test_hard_negatives_take_siblings_in_offset_order():
    # root R; parent P under R; child C and twelve siblings under P; C's own child K (a descendant, not an ancestor)
    offs = [f'{i:08d}' for i in range(1, 17)]
    R, Pn, C = offs[0], offs[1], offs[2]
    sibs = offs[3:15]
    K = offs[15]
    nouns = {R: W.Synset('noun', 'n', R, ['r'], [], ''), Pn: W.Synset('noun', 'n', Pn, ['p'], [('@', R, 'n')], ''),
             C: W.Synset('noun', 'n', C, ['c'], [('@', Pn, 'n')], ''),
             K: W.Synset('noun', 'n', K, ['k'], [('@', C, 'n')], '')}
    for s in sibs:
        nouns[s] = W.Synset('noun', 'n', s, ['s' + s], [('@', Pn, 'n')], '')
    g = S.at_graph({'synsets': {'noun': nouns}, 'index': {'noun': {}}})
    # T = (C, R), (K, P), (K, R) and every sibling's (s, R)
    split = hit.hit_r(g, 95270, 95271, 95272, n_val=7)
    for ci, ai, rnd, hard in split['val'] + split['test']:
        c = g.nodes[ci]
        if c == C:
            assert hard[:10] == [g.index[s] for s in sibs[:10]]
        if c in sibs:
            expect = [g.index[x] for x in [C] + sibs if x != c][:10]
            assert hard == expect
    with pytest.raises(ValueError):
        hit.hit_r(g, 95270, 95271, 95272, n_val=8)                      # 2 x 8 rows from |T| = 15


def test_within_row_slots():
    slots = hit.within_row_slots(95280, 500)
    r = P.Rng(95280)
    assert slots == [r.below(11) for _ in range(500)]
    assert set(slots) == set(range(11))
    # the registered seeds are constants only: their values are checked, nothing is drawn from them here
    assert hit.WITHIN_ROW_SEED == 2620 and hit.WITHIN_ROW_SEED_DRY == 5620
    assert hit.HITR_SEEDS == (1500, 1501, 1502) and hit.DRY_SPLIT_SEEDS == (4500, 4501, 4502)


# ================================================================ rows, counts and the closure check
def rows_of(spec):
    return [hit.HitRow(i, c, s) for i, (c, s) in enumerate(spec)]


def test_closure_check_and_counts_on_synthetic_rows():
    wn = random_dag(95205, n=200)
    g = S.at_graph(wn)
    rng = P.Rng(95290)
    good = []
    for c in g.nodes:
        anc = g.ancestors[c]
        indirect = sorted(a for a in anc if (c, a) not in g.edge_set)
        if not indirect:
            continue
        non = [x for x in g.nodes if x not in anc and x != c]
        negs = [non[rng.below(len(non))] for _ in range(20)]
        good.append((c, [indirect[0]] + negs))
    rows = rows_of(good)
    ok, bad = hit.closure_check(rows, g.ancestors)
    assert ok and bad == {'random': 0, 'hard': 0}
    assert all(v == 1 for v in hit.closure_rr(rows, g.ancestors, 'hard'))
    # a negative that is an ancestor ties the positive: RR 1/2 in that setting only
    c, slots = good[0]
    a = sorted(g.ancestors[c])
    broken = rows_of([(c, [slots[0], a[-1]] + slots[2:])] + good[1:])
    assert hit.closure_rr(broken, g.ancestors, 'random')[0] == F(1, 2)
    assert hit.closure_rr(broken, g.ancestors, 'hard')[0] == 1
    assert hit.closure_check(broken, g.ancestors) == (False, {'random': 1, 'hard': 0})
    # a positive outside the closure ties every negative: RR 1/11
    lost = rows_of([(c, [slots[1]] + slots[1:])])
    assert hit.closure_rr(lost, g.ancestors, 'random') == [F(1, 11)]
    with pytest.raises(ValueError):
        hit.closure_rr(rows, g.ancestors, 'both')
    cnt = hit.counts(rows, g)
    assert cnt['rows'] == len(rows) and cnt['ten_and_ten'] and cnt['positives_in_closure']
    assert cnt['negatives_in_closure'] == 0 and cnt['positives_direct_edges'] == 0


def test_counts_of_repeats_and_child_negatives():
    g = S.at_graph(random_dag(95206, n=60))
    c = g.nodes[10]
    p = sorted(g.ancestors[c])[0]
    others = [x for x in g.nodes if x not in g.ancestors[c] and x != c]
    r0 = (c, [p] + others[:10] + others[10:20])
    r1 = (c, [p] + [c] + others[:9] + others[10:19] + [others[10]])           # child among random; hard repeats
    r2 = (c, [p] + others[:9] + [others[0]] + others[10:20])                  # random repeats
    cnt = hit.counts(rows_of([r0, r1, r2]), g)
    assert (cnt['child_in_random'], cnt['repeat_random'], cnt['repeat_hard']) == (1, 1, 1)
    assert (cnt['min_distinct_random'], cnt['min_distinct_hard'], cnt['distinct_positives']) == (9, 9, 1)
    assert cnt['negatives_in_closure'] == 0
    short = hit.counts(rows_of([(c, [p] + others[:10])]), g)
    assert short['ten_and_ten'] is False


# ================================================================ readers and the verifier on a synthetic zip
def hit_store(tmp_path, wn, rows_by_split, lexicon=None, raw=None):
    names = S.hit_names(wn)
    g = S.at_graph(wn)
    nodes = set(g.nodes)
    lex = lexicon if lexicon is not None else {n: {'name': n.split('.')[0], 'definition': 'x'}
                                               for n, o in names.items() if o in nodes}
    members = {'wordnet-multi/entity_lexicon.json': json.dumps(lex).encode()}
    for split in ('train', 'val', 'test'):
        text = raw.get(split) if raw and split in raw else ''.join(json.dumps(r) + '\n'
                                                                  for r in rows_by_split.get(split, []))
        members[f'wordnet-multi/{split}.jsonl'] = text.encode()
    p = tmp_path / 'hit-multi'
    p.mkdir(parents=True, exist_ok=True)
    zp = p / 'wordnet-multi.zip'
    with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
        for m, b in members.items():
            z.writestr(m, b)
    data = zp.read_bytes()
    pins = {'version': 1, 'files': [{'name': 'hit-multi', 'url': 'file://' + str(zp), 'file': 'wordnet-multi.zip',
                                     'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                                     'members': [{'path': m, 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
                                                 for m, b in members.items()]}]}
    return D.Store(root=str(tmp_path), pins=pins), g


def synthetic_split(wn, g, n_rows):
    off_name = {o: n for n, o in S.hit_names(wn).items()}
    train = [{'child': off_name[c], 'parent': off_name[p], 'random_negatives': [], 'hard_negatives': []}
             for c, p in g.edges]
    split = hit.hit_r(g, 95300, 95301, 95302, n_val=n_rows)

    def js(rows_):
        return [{'child': off_name[g.nodes[c]], 'parent': off_name[g.nodes[a]],
                 'random_negatives': [off_name[g.nodes[x]] for x in rn],
                 'hard_negatives': [off_name[g.nodes[x]] for x in hd]} for c, a, rn, hd in rows_]
    return {'train': train, 'val': js(split['val']), 'test': js(split['test'])}


def test_readers_verifier_and_counts_on_a_synthetic_zip(tmp_path):
    wn = random_dag(95207, n=250)
    g = S.at_graph(wn)
    store, _ = hit_store(tmp_path, wn, synthetic_split(wn, g, 40))
    names = hit.lexicon_names(store)
    assert len(names) == len(g.nodes)
    rows = hit.read_rows('test', store)
    assert len(rows) == 40 and all(len(s) == 21 for _, _, s in rows) and rows[0][0] == 0
    names_map, g2 = hit.resolve(wn, store, count=len(g.nodes))
    assert set(names_map.values()) == set(g.nodes) and g2.nodes == g.nodes
    with pytest.raises(ValueError):
        hit.resolve(wn, store)                                               # 74,401 names registered
    out, detail = hit.count_checks(wn, store, count=len(g.nodes))
    assert out['hit.train_equals_E'] and out['hit.test.rows'] == 40 and out['hit.val.rows'] == 40
    assert out['hit.test.positives_in_closure'] and out['hit.test.negatives_in_closure'] == 0
    assert out['hit.test.child_in_random'] == 0 and out['hit.test.min_distinct_ok']
    assert detail['val']['repeat_random'] == 0 and detail['test']['ten_and_ten']
    resolved = hit.rows('test', names_map, store)
    ok, _ = hit.closure_check(resolved, g.ancestors)
    assert ok


def test_test_positives_that_are_direct_edges_are_checked(tmp_path):
    """A13 L14 Instances (a), "Every test pair is in T, so none enters training as a positive": a test row whose
    positive is a direct edge of E is counted (hit.test.positives_direct_edges) and differs from COUNTS' 0; val's count
    is made for the definitions amendment; splits=('val',), tuning's subset (A13.10.5), reads no test row."""
    wn = random_dag(95209, n=250)
    g = S.at_graph(wn)
    split = synthetic_split(wn, g, 30)
    store, _ = hit_store(tmp_path / 'a', wn, split)
    out, detail = hit.count_checks(wn, store, count=len(g.nodes))
    assert out['hit.test.positives_direct_edges'] == 0 == detail['val']['positives_direct_edges']
    assert out['hit.val.positives_direct_edges'] == 0
    assert not [k for k, _, _ in D.compare_counts(out, hit.COUNTS) if 'direct' in k]
    off_name = {o: n for n, o in S.hit_names(wn).items()}
    child, parent = g.edges[0]
    leaked = dict(split, test=[dict(split['test'][0], child=off_name[child], parent=off_name[parent])]
                  + split['test'][1:])
    store2, _ = hit_store(tmp_path / 'b', wn, leaked)
    out2, _ = hit.count_checks(wn, store2, count=len(g.nodes))
    assert out2['hit.test.positives_direct_edges'] == 1
    assert ('hit.test.positives_direct_edges', 0, 1) in D.compare_counts(out2, hit.COUNTS)
    out3, detail3 = hit.count_checks(wn, store2, count=len(g.nodes), splits=('val',))
    assert set(detail3) == {'val'} and not any('.test.' in k for k in out3)


@pytest.mark.parametrize('line', [
    '{"child": "w1.n.01", "child": "w2.n.01", "parent": "w0.n.01", "random_negatives": [], "hard_negatives": []}',
    '{"parent": "w0.n.01", "random_negatives": [], "hard_negatives": []}',
    '{"child": "w1.n.01", "parent": 3, "random_negatives": [], "hard_negatives": []}',
    '{"child": "w1.n.01", "parent": "w0.n.01", "random_negatives": 5, "hard_negatives": []}',
])
def test_malformed_rows_refused(tmp_path, line):
    wn = random_dag(95208, n=30)
    store, _ = hit_store(tmp_path, wn, {}, raw={'test': line + '\n'})
    with pytest.raises((D.ParseError, TypeError)):
        hit.read_rows('test', store)


def test_unknown_name_and_bad_lexicon_refused(tmp_path):
    wn = random_dag(95209, n=30)
    g = S.at_graph(wn)
    store, _ = hit_store(tmp_path / 'a', wn, {}, raw={'test': json.dumps(
        {'child': 'w1.n.01', 'parent': 'nowhere.n.01', 'random_negatives': [], 'hard_negatives': []}) + '\n'})
    names_map, _ = hit.resolve(wn, store, count=len(g.nodes))
    with pytest.raises(D.ParseError):
        hit.rows('test', names_map, store)
    lex = {n: {} for n, o in S.hit_names(wn).items() if o in set(g.nodes)}
    lex['ghost.n.01'] = {}
    store, _ = hit_store(tmp_path / 'b', wn, {}, lexicon=lex)
    with pytest.raises(ValueError):
        hit.resolve(wn, store, count=len(g.nodes) + 1)


# ================================================================ WordNet 3.0 and the pinned HiT files
need_data = pytest.mark.skipif(not (W.available() and D.available()),
                               reason='no WordNet or Stage-2 cache: run golden/make_stage2_v1.py')


@need_data
def test_hit_counts_on_the_pinned_files(wn):
    out, detail = hit.count_checks(wn)
    assert D.compare_counts(out, hit.COUNTS) == []
    assert out['hit.train.rows'] == 75850
    # val's counts, made when the code was built (A13.9: stated in the definitions amendment)
    v = detail['val']
    assert (v['rows'], v['distinct_positives'], v['child_in_random'], v['child_in_hard'], v['repeat_random'],
            v['repeat_hard'], v['min_distinct_random'], v['min_distinct_hard'], v['positives_direct_edges']) == \
        (29383, 2104, 3, 0, 22, 7, 9, 9, 0)
    t = detail['test']
    assert (t['child_in_hard'], t['min_distinct_random'], t['min_distinct_hard'], t['positives_direct_edges']) == \
        (0, 9, 9, 0)
    # L14 control 2's seven reported labels are positives of the test rows, in U_@
    names_map, g = hit.resolve(wn)
    positives = {r.parent for r in hit.rows('test', names_map)}
    assert all(names_map[n] in positives for n in hit.RELABEL_REPORT_NAMES)


@need_data
def test_dry_split_shape_with_test_seeds(wn):
    """The dry split's code on the verb '@' graph, drawn with unregistered seeds (the dry run draws 4500-4502)."""
    g = S.at_graph(wn, 'verb')
    split = hit.hit_r(g, 95310, 95311, 95312)
    assert split['n_T'] == 21840 and len(split['val']) == len(split['test']) == 1092
    assert hit.hit_r_counts(split, g) == {'rows': 2184, 'distinct_rows': 2184, 'positives_indirect': True,
                                          'negatives_valid': True, 'negatives_distinct': True}


@need_data
@pytest.mark.slow
def test_hit_r_shape_with_test_seeds(wn):
    """HIT-R's code on U_@, drawn with unregistered seeds (the decisive run draws 1500-1502)."""
    g = S.at_graph(wn)
    split = hit.hit_r(g, 95320, 95321, 95322)
    assert split['n_T'] == 587658 and len(split['val']) == len(split['test']) == 29382
    c = hit.hit_r_counts(split, g)
    assert c['rows'] == 58764 and c['distinct_rows'] == 58764
    assert c['positives_indirect'] and c['negatives_valid'] and c['negatives_distinct']
