"""HiT's WordNet multi-hop split (Amendment 13, L14 and items 3, 9, 11 and 13): its rows and names, the name
verifier, the count checks, the closure check, HIT-R, the dry split and the within-row control's slots.

    lexicon_names(store)                   entity_lexicon.json's names, in file order (names only)
    read_rows(split, store)                [(row, child, [parent, 10 random, 10 hard])] as names (pass 1's reader)
    resolve(wn, store)                     the verifier: {name: offset}, one-to-one onto U_@, and the '@' graph
    rows(split, names_map, store)          [HitRow] with offsets
    counts(rows, g), count_checks(wn)      A13.9's HiT counts (train = E; 29,383 rows; 10 + 10; closure; test's and
                                           val's counts, val's stated in Amendment 14, item 2)
    closure_rr(rows, g), closure_check     L14's positive control: closure membership gives RR = 1 on every row
    hit_r(g, seed_split, seed_random, seed_hard, n_val)   HIT-R (reported) and, on the verb graph, the dry split
    within_row_slots(seed, n_rows)          L14 control 1's declared positive slots

Seeds are parameters: the registered values are the constants below, used only by the step that draws them
(A13.12); tests draw 95200 + i.
"""
import json
from fractions import Fraction

from hpstep.prng import Rng

from . import senses
from .stage2data import ParseError, _lines, default_store

SPLITS = ('train', 'val', 'test')
KEYS = {'train': 'hit-train', 'val': 'hit-val', 'test': 'hit-test'}
N_NEG = 10
# Registered seeds (A13.12), constants only: never drawn outside their step.
HITR_SEEDS = (1500, 1501, 1502)
DRY_SPLIT_SEEDS = (4500, 4501, 4502)
WITHIN_ROW_SEED = 2620
WITHIN_ROW_SEED_DRY = 5620
# A13.9's counts.
COUNTS = {
    'hit.names': 74401,
    'hit.train_equals_E': True,
    'hit.val.rows': 29383,
    'hit.test.rows': 29383,
    'hit.val.ten_and_ten': True,
    'hit.test.ten_and_ten': True,
    'hit.val.positives_in_closure': True,
    'hit.test.positives_in_closure': True,
    'hit.val.negatives_in_closure': 0,
    'hit.test.negatives_in_closure': 0,
    'hit.test.distinct_positives': 2110,
    'hit.test.child_in_random': 3,
    'hit.test.repeat_random': 23,
    'hit.test.repeat_hard': 14,
    'hit.test.min_distinct_ok': True,
    # A13 L14 Instances (a): "Every test pair is in T, so none enters training as a positive": no test positive is a
    # direct edge of E (A13.9's closure count admits E's own pairs; T excludes them)
    'hit.test.positives_direct_edges': 0,
    # A13.9, "Val's corresponding counts are made when the code is built and stated in the definitions amendment":
    # Amendment 14, item 2 (counted from HiT val's names); its lead-in, "Before any metric the runner reproduces each
    # count exactly; a mismatch stops the run", makes each a check, so tuning, the first step to compute a val metric,
    # reproduces them (READING stage2-runner-46), and the decisive run again. Val's 0 direct edges is item 2's count.
    'hit.val.distinct_positives': 2104,
    'hit.val.child_in_random': 3,
    'hit.val.child_in_hard': 0,
    'hit.val.repeat_random': 22,
    'hit.val.repeat_hard': 7,
    'hit.val.min_distinct_ok': True,
    'hit.val.positives_direct_edges': 0,
}
MIN_DISTINCT = 9
# L14 control 2's reported labels: the seven positives that each hold more than 2.76% of the test rows (A13 L14).
RELABEL_REPORT_NAMES = ('entity.n.01', 'physical_entity.n.01', 'abstraction.n.06', 'whole.n.02', 'object.n.01',
                        'organism.n.01', 'living_thing.n.01')


class HitRow:
    __slots__ = ('row', 'child', 'slots')

    def __init__(self, row, child, slots):
        self.row, self.child, self.slots = row, child, slots

    @property
    def parent(self):
        return self.slots[0]

    @property
    def random(self):
        return self.slots[1:1 + N_NEG]

    @property
    def hard(self):
        return self.slots[1 + N_NEG:1 + 2 * N_NEG]

    def __repr__(self):
        return f'HitRow({self.row}, {self.child!r}, {self.slots!r})'


def _no_repeat_keys(pairs):
    keys = [k for k, _ in pairs]
    if len(set(keys)) != len(keys):
        raise ParseError('a JSON object with a repeated key')
    return dict(pairs)


def lexicon_names(store=None):
    """entity_lexicon.json's names (its keys) in file order; definitions are not read. Repeated keys are refused."""
    store = store or default_store()
    obj = json.loads(store.bytes('hit-lexicon').decode('utf-8'), object_pairs_hook=_no_repeat_keys)
    if not isinstance(obj, dict):
        raise ParseError('entity_lexicon.json is not an object')
    return list(obj)


def read_rows(split, store=None):
    """[(row, child, [parent, 10 random negatives, 10 hard negatives])] as names, in file order: one JSON object per
    line with keys child, parent, random_negatives, hard_negatives (other keys are ignored). Slot 0 is the positive;
    the lists are kept as given (their lengths are checked by counts)."""
    store = store or default_store()
    key = KEYS[split]
    out = []
    for r, line in enumerate(_lines(store.bytes(key), key)):
        o = json.loads(line, object_pairs_hook=_no_repeat_keys)
        try:
            child, parent = o['child'], o['parent']
            rnd, hard = list(o['random_negatives']), list(o['hard_negatives'])
        except (KeyError, TypeError) as e:
            raise ParseError(f'{key}: row {r}: {e}')
        if not all(isinstance(x, str) for x in [child, parent] + rnd + hard):
            raise ParseError(f'{key}: row {r}: a name is not a string')
        out.append((r, child, [parent] + rnd + hard))
    return out


def resolve(wn, store=None, count=senses.U_AT_COUNT):
    """The name verifier (A13.9): the lexicon's names map by NLTK's rule one-to-one onto U_@ (74,401 synsets).
    Returns ({name: offset}, the noun '@' graph)."""
    g = senses.at_graph(wn)
    return senses.resolve_names(lexicon_names(store), wn, g.nodes, count), g


def rows(split, names_map, store=None):
    """The split's rows with names resolved to offsets; a name outside the lexicon is refused."""
    out = []
    for r, child, slots in read_rows(split, store):
        try:
            out.append(HitRow(r, names_map[child], [names_map[x] for x in slots]))
        except KeyError as e:
            raise ParseError(f'{split}: row {r}: name {e} is not in the lexicon')
    return out


def counts(split_rows, g):
    """Counts of one val or test split (A13.9): rows, 10 + 10 negatives per row, positives in the '@' closure of E,
    negatives in it, distinct positives, rows holding the child among their random negatives, rows repeating a
    random or a hard negative, and the fewest distinct negatives in a row."""
    anc = g.ancestors
    c = {'rows': len(split_rows)}
    c['ten_and_ten'] = all(len(r.slots) == 1 + 2 * N_NEG for r in split_rows)
    c['positives_in_closure'] = all(r.parent in anc.get(r.child, ()) for r in split_rows)
    c['positives_not_in_closure'] = sum(1 for r in split_rows if r.parent not in anc.get(r.child, ()))
    c['negatives_in_closure'] = sum(1 for r in split_rows for x in r.slots[1:] if x in anc.get(r.child, ()))
    c['distinct_positives'] = len({r.parent for r in split_rows})
    c['child_in_random'] = sum(1 for r in split_rows if r.child in r.random)
    c['child_in_hard'] = sum(1 for r in split_rows if r.child in r.hard)
    c['repeat_random'] = sum(1 for r in split_rows if len(set(r.random)) < len(r.random))
    c['repeat_hard'] = sum(1 for r in split_rows if len(set(r.hard)) < len(r.hard))
    c['min_distinct_random'] = min((len(set(r.random)) for r in split_rows), default=0)
    c['min_distinct_hard'] = min((len(set(r.hard)) for r in split_rows), default=0)
    c['positives_direct_edges'] = sum(1 for r in split_rows if (r.child, r.parent) in g.edge_set)
    return c


def count_checks(wn, store=None, count=senses.U_AT_COUNT, splits=('val', 'test')):
    """A13.9's HiT counts, keyed like COUNTS, with each split's full counts. Names only: no table, no score.
    splits=('val',) is tuning's subset (A13.10.5: HiT test is not read).
    Val's and test's counts are promoted alike: rows, 10 + 10, closure, positives that are direct edges of E,
    distinct positives, rows holding the child among their random or hard negatives, rows repeating a random or a
    hard negative, and whether every row keeps at least 9 distinct of each. COUNTS decides which are checks: test's of
    A13.9 (with A13 L14's "Every test pair is in T": 0 direct edges) and val's of Amendment 14, item 2 (the child among
    the hard negatives is a check for val only; A13.9 states no such count for test)."""
    names_map, g = resolve(wn, store, count)
    out = {'hit.names': len(names_map)}
    train = rows('train', names_map, store)
    out['hit.train_equals_E'] = {(r.child, r.parent) for r in train} == g.edge_set
    out['hit.train.rows'] = len(train)
    detail = {}
    for split in splits:
        c = counts(rows(split, names_map, store), g)
        detail[split] = c
        out[f'hit.{split}.rows'] = c['rows']
        out[f'hit.{split}.ten_and_ten'] = c['ten_and_ten']
        out[f'hit.{split}.positives_in_closure'] = c['positives_in_closure']
        out[f'hit.{split}.negatives_in_closure'] = c['negatives_in_closure']
        out[f'hit.{split}.positives_direct_edges'] = c['positives_direct_edges']
        out[f'hit.{split}.distinct_positives'] = c['distinct_positives']
        out[f'hit.{split}.child_in_random'] = c['child_in_random']
        out[f'hit.{split}.child_in_hard'] = c['child_in_hard']
        out[f'hit.{split}.repeat_random'] = c['repeat_random']
        out[f'hit.{split}.repeat_hard'] = c['repeat_hard']
        out[f'hit.{split}.min_distinct_ok'] = min(c['min_distinct_random'], c['min_distinct_hard']) >= MIN_DISTINCT
    return out, detail


# ================================================================ the closure check (L14, must pass)
def closure_rr(split_rows, ancestors, setting):
    """Each row's pessimistic RR when every candidate is scored 1 if it is in closure_E(child) (strict '@'
    ancestors) and 0 otherwise: RR = 1/(1 + #{negatives scoring at least the positive}) (A13.7), in the random or
    hard setting. A Fraction per row, in row order."""
    if setting not in ('random', 'hard'):
        raise ValueError(setting)
    out = []
    for r in split_rows:
        a = ancestors.get(r.child, frozenset())
        pos = 1 if r.parent in a else 0
        negs = r.random if setting == 'random' else r.hard
        out.append(Fraction(1, 1 + sum(1 for x in negs if (1 if x in a else 0) >= pos)))
    return out


def closure_check(split_rows, ancestors):
    """L14's check that must pass: RR = 1 on every row in both settings. Returns (passed, number of failing rows
    per setting)."""
    bad = {s: sum(1 for v in closure_rr(split_rows, ancestors, s) if v != 1) for s in ('random', 'hard')}
    return all(v == 0 for v in bad.values()), bad


# ================================================================ HIT-R and the dry split (A13.11, A13.13)
def indirect_pairs(g):
    """T: every (child index, ancestor index) pair of the '@' closure that is not an edge of E, in (child index,
    ancestor index) order."""
    idx = g.index
    out = []
    for c in g.nodes:
        ci = idx[c]
        out.extend((ci, ai) for ai in sorted(idx[a] for a in g.ancestors[c] if (c, a) not in g.edge_set))
    return out


def _draw_negatives(rng, n, child, ancestors, row, k):
    """Append draws rng.below(n) to row until it holds k, rejecting the child, any x with (child, x) in E u T (its
    ancestors) and repeats in the row."""
    while len(row) < k:
        x = rng.below(n)
        if x == child or x in ancestors or x in row:
            continue
        row.append(x)
    return row


def hit_r(g, seed_split, seed_random, seed_hard, n_val=None, k=N_NEG):
    """HIT-R (A13.11), a HiT-protocol split rebuilt from the '@' graph g; on the verb graph with the dry seeds it is
    the dry split (A13.13). Indices are g's (offset order).
    - T in (child index, ancestor index) order; Rng(seed_split).shuffle(a fresh list of T); val is the first n_val
      (default floor(0.05 |T|)), test the next n_val.
    - Random negatives, row by row, from one Rng(seed_random): below(len(g.nodes)), rejecting the child, any x with
      (child, x) in E u T and repeats in the row, until k.
    - Hard negatives: the children of the child's parents minus the child and its ancestors, in offset order, the
      first k; padded by draws from one Rng(seed_hard) with the same rejection (repeats include the siblings taken).
    READING (A13.11, "random negatives per row in order"): one stream for each kind runs over the val rows, then the
    test rows, in split order. Returns {'n_T', 'val', 'test'}: rows as (child, ancestor, [k random], [k hard])."""
    T = indirect_pairs(g)
    if n_val is None:
        n_val = len(T) * 5 // 100
    if 2 * n_val > len(T):
        raise ValueError(f'2 x {n_val} rows from |T| = {len(T)}')
    order = Rng(seed_split).shuffle(list(T))
    chosen = order[:2 * n_val]
    n = len(g.nodes)
    nodes, idx = g.nodes, g.index
    anc_idx = {}

    def ancestors_of(ci):
        if ci not in anc_idx:
            anc_idx[ci] = frozenset(idx[a] for a in g.ancestors[nodes[ci]])
        return anc_idx[ci]
    rr, rh = Rng(seed_random), Rng(seed_hard)
    out = []
    for ci, ai in chosen:
        a = ancestors_of(ci)
        rnd = _draw_negatives(rr, n, ci, a, [], k)
        sib = sorted({idx[s] for p in g.parents[nodes[ci]] for s in g.children[p]} - {ci} - a)
        hard = _draw_negatives(rh, n, ci, a, sib[:k], k)
        out.append((ci, ai, rnd, hard))
    return {'n_T': len(T), 'val': out[:n_val], 'test': out[n_val:]}


def hit_r_counts(split, g):
    """Checks of a HIT-R or dry split: k distinct valid negatives per row, none the child or an ancestor, positives
    indirect pairs."""
    anc = {g.index[o]: frozenset(g.index[a] for a in g.ancestors[o]) for o in g.nodes}
    rows_ = split['val'] + split['test']
    return {
        'rows': len(rows_),
        'distinct_rows': len({(c, a) for c, a, _, _ in rows_}),
        'positives_indirect': all(a in anc[c] and (g.nodes[c], g.nodes[a]) not in g.edge_set for c, a, _, _ in rows_),
        'negatives_valid': all(x != c and x not in anc[c] for c, _, rn, hd in rows_ for x in rn + hd),
        'negatives_distinct': all(len(set(rn)) == len(rn) and len(set(hd)) == len(hd) for _, _, rn, hd in rows_),
    }


def within_row_slots(seed, n_rows):
    """L14 control 1: one Rng(seed) draws j_r = below(11) for r = 0, 1, ... in order; slot j_r (0 the parent, 1-10
    the random negatives in file order) is declared row r's positive. The registered seed is WITHIN_ROW_SEED."""
    rng = Rng(seed)
    return [rng.below(1 + N_NEG) for _ in range(n_rows)]
