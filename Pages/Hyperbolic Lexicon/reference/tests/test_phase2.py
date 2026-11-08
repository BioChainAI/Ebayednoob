"""The reference's half of Phase 2 (lexicon/phase2.py and run_claims.py --phase2; PREREGISTRATION.md Amendment 4
items 2, 3, 5, 6 and 7): the L1 record against the committed traces, the list digest, the streaming id stream, S6's
R(s) from the pinned table against Python's own functions, the float rounding and the left-to-right float key against
Python floats, the inversion and tie counts against a brute-force Fraction implementation of item 6 as written,
control 2's evaluator and tie test on hand-built cases, the fork pool's determinism, and the runner's refusal without
V1 and its withholding of set (b)'s text (L1 Data). Unregistered data only: trace strings (Rng(8000 + i)),
Rng(70000 + i) strings and words, the committed traces, hand-built strings and hand-built arms.

    python3 -B -m pytest -q -p no:cacheprovider tests/test_phase2.py              the fast tests
    python3 -B -m pytest -q -p no:cacheprovider -m slow tests/test_phase2.py      the end-to-end dry run (~20 s)
"""
import ast
import gzip
import hashlib
import json
import math
import os
import subprocess
import sys
import unicodedata
from fractions import Fraction as F

import numpy as np
import pytest

from hpstep.prng import Rng
from hpstep.problems import children
from lexicon import REFERENCE, l1, wordpiece
from lexicon import h2exact as H2
from lexicon import h3tree as H3
from lexicon import phase2 as P
from lexicon import rank as R
from lexicon.rank import Arm

sys.set_int_max_str_digits(0)


@pytest.fixture(scope='module')
def v0():
    return wordpiece.load_v0()


def vocabs():
    out = [('V0', wordpiece.load_v0())]
    if wordpiece.v1_available():
        out.append(('V1', wordpiece.load_v1()))
    return out


def random_word(rng, L):
    w = [rng.below(6)]
    while len(w) < L:
        w.append(children(w)[rng.below(5)])
    return tuple(w)


# ================================================================ L1: the record
def test_record_reproduces_the_traces():
    """Amendment 4 item 2: the record's fields are normalise_v1.txt's text field and wordpiece_v1.txt's pieces field,
    on every valid trace case and every vocabulary the trace holds (V1 when cached)."""
    vs = vocabs()
    t = P.trace_check(vs)
    assert t['cases'] == 381 and t['lines'] == 381 * len(vs) and t['equal'] == t['lines'], t['first_mismatch']


def test_record_format(v0):
    assert P.record(b'', v0)[0] == '-\t-'
    assert P.record(b' \t\n', v0)[0] == '-\t-'
    rec, ids, pieces = P.record(b'Hello, World!', v0)
    assert rec == ('68656c6c6f202c20776f726c642021\t'
                   '7064,0,4,68656c6c 118,4,5,23236f 15,5,6,2c 734,7,12,776f726c64 5,12,13,21')
    assert ids == [7064, 118, 15, 734, 5] and pieces == ['hell', '##o', ',', 'world', '!']
    assert rec.isascii() and '\n' not in rec
    # the controls change the record: shortest match splits 'hello'; no accent stripping keeps the accent
    assert P.record(b'Hello', v0, shortest=True)[0] != P.record(b'Hello', v0)[0]
    a, b = P.record('café'.encode(), v0), P.record('café'.encode(), v0, strip_accents=False)
    assert a[0].split('\t')[0] == b'cafe'.hex() and b[0].split('\t')[0] == 'café'.encode().hex()


def test_list_digest_is_the_file_sha256(tmp_path):
    hexes = [hashlib.sha256(bytes([i])).hexdigest() for i in range(5)]
    path = tmp_path / 'list.txt'
    path.write_bytes(''.join(h + '\n' for h in hexes).encode('ascii'))
    assert P.list_digest(hexes) == hashlib.sha256(path.read_bytes()).hexdigest()
    assert P.list_digest([]) == hashlib.sha256(b'').hexdigest()
    assert P.list_digest(['ab', 'c']) != P.list_digest(['a', 'bc'])


def test_id_stream_streams_the_registered_bytes():
    rng = Rng(70000)
    lists = [[rng.below(40000) for _ in range(rng.below(12))] for _ in range(300)]
    s = P.IdStream()
    for x in lists:
        s.add(x)
    whole = wordpiece.id_stream(lists)
    assert s.summary() == {'instances': 300, 'ids': sum(map(len, lists)), 'bytes': len(whole),
                           'sha256': hashlib.sha256(whole).hexdigest()}


def test_blob_digest_is_l1_digest():
    strings = [l1.synthetic(70000 + i) for i in range(50)] + ['', 'a']
    assert P.blob_digest([s.encode('utf-8') for s in strings]) == l1.digest(strings)


def test_gzip_lines_are_deterministic(tmp_path):
    lines = ['-\t-', '61\t40,0,1,61', 'x' * 5000]
    for name in ('a.gz', 'b.gz'):
        w = P.GzipLines(str(tmp_path / name))
        for x in lines:
            w.write(x)
        w.close()
    a, b = (tmp_path / 'a.gz').read_bytes(), (tmp_path / 'b.gz').read_bytes()
    assert a == b and gzip.decompress(a).decode('utf-8') == ''.join(x + '\n' for x in lines)


# ================================================================ L1 control 1: R(s) from the table
def own_r(s):
    """Spike S6's reference(): Python's own functions (unicodedata 15.1.0 under Python 3.13)."""
    return ''.join(ch for ch in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(ch) != 'Mn')


def test_table_r_is_s6_r_on_python_15_1():
    if unicodedata.unidata_version != '15.1.0':
        pytest.skip('Python\'s own functions are the oracle only at Unicode 15.1')
    sys.path.insert(0, REFERENCE)
    import traces_text
    strings = [l1.trace_string(i) for i in range(300)] + [l1.synthetic(70000 + i) for i in range(3000)]
    for b in traces_text.EDGE:
        try:
            strings.append(b.decode('utf-8'))
        except UnicodeDecodeError:
            pass
    # whole-string Final_Sigma contexts (S6's R lowercases the whole case, not a whitespace token)
    strings += ['ΑΣ Β', 'ΑΣ​Β', 'Α Σ', 'Σ', 'AΣ.', 'áΣ',
                'İΣİ', 'xΣ­', 'ΑΣ́', '각̧́̀']
    bad = [s for s in strings if P.table_r(s) != own_r(s)]
    assert bad == []


def test_phase2_reads_no_platform_unicode():
    """D5 for the reference side of control 1 and the records: lexicon.phase2 imports neither unicodedata nor re and
    calls no Unicode-dependent str method (the same guard as tests/test_normalise.py)."""
    tree = ast.parse(open(P.__file__, encoding='utf-8').read())
    names = {a.name for node in ast.walk(tree) if isinstance(node, (ast.Import, ast.ImportFrom))
             for a in node.names} | {node.module for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)}
    assert not names & {'unicodedata', 're', 'regex', 'importlib'}
    unicode_methods = {'lower', 'upper', 'casefold', 'swapcase', 'title', 'capitalize', 'normalize', 'category',
                       'isalpha', 'isalnum', 'isdecimal', 'isdigit', 'isnumeric', 'isidentifier', 'islower',
                       'isupper', 'istitle', 'isspace', 'isprintable', 'rsplit', 'lstrip', 'rstrip', 'splitlines'}
    bad = [(n.attr, n.lineno) for n in ast.walk(tree) if isinstance(n, ast.Attribute) and n.attr in unicode_methods]
    assert bad == []
    for n in ast.walk(tree):     # split and strip only with an explicit separator
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr in ('split', 'strip'):
            assert n.args and isinstance(n.args[0], ast.Constant), n.lineno


def test_hugging_face_wrapper():
    version, reason = P.hf_version()
    if version is None:
        pytest.skip(f'tokenizers not installed: {reason}')
    if not wordpiece.v1_available():
        pytest.skip('V1 not cached')
    tok = P.hf_tokenizer(wordpiece.v1_path())
    v1 = wordpiece.load_v1()
    for s in ('Hello, World!', "Don't stop.", 'café naïve résumé', '中文abc字'):
        assert tok.encode(s, add_special_tokens=False).tokens == P.record(s.encode(), v1)[2]
    assert P.first_difference(['a', 'b'], ['a', 'c']) == 1 and P.first_difference(['a'], ['a', 'b']) == 1


# ================================================================ L4(b): float rounding, keys, inversions
def toy_arms(n=150, L=(8, 26), seed=70000):
    rng = Rng(seed)
    words = sorted({random_word(rng, L[0] + rng.below(L[1] - L[0] + 1)) for _ in range(n)})
    return words, H3.arm(words), H2.arm(words)


def test_float_cols_round_each_rational_correctly():
    words, a3, a2 = toy_arms(40)
    for arm, pts, den in ((a3, H3.points(words), H3.den), (a2, H2.TREE.points(words), H2.TREE.den)):
        cols = P.float_cols(arm)
        for i, (w, X) in enumerate(zip(words, pts)):
            for k in range(arm.dim):
                assert cols[k][i] == float(F(X[k], den(len(w))))
        c32 = P.float_cols(arm, np.float32)
        assert all(c.dtype == np.float32 for c in c32)
        assert all((c32[k] == cols[k].astype(np.float32)).all() for k in range(arm.dim))


def py_key(x, y):
    """Item 6 in Python floats, literally left to right."""
    k = x[0] * y[0] - x[1] * y[1]
    for i in range(2, len(x)):
        k = k - x[i] * y[i]
    return k


def test_float_keys_are_python_floats_left_to_right():
    words, a3, a2 = toy_arms(80)
    for arm in (a3, a2):
        cols = P.float_cols(arm)
        pts = [[float(c[i]) for c in cols] for i in range(arm.n)]
        for u in range(0, arm.n, 7):
            fk = P.float_keys(cols, u)
            assert [float(x) for x in fk] == [py_key(pts[u], y) for y in pts]
        # float32: the same left-to-right order in single precision
        c32 = P.float_cols(arm, np.float32)
        u = 3
        q = [c[u] for c in c32]
        want = []
        for i in range(arm.n):
            y = [c[i] for c in c32]
            with np.errstate(over='ignore', invalid='ignore'):
                k = np.float32(q[0] * y[0]) - np.float32(q[1] * y[1])
                for j in range(2, arm.dim):
                    k = np.float32(k - np.float32(q[j] * y[j]))
            want.append(k)
        got = P.float_keys(c32, u)
        assert got.dtype == np.float32
        assert all((a == b) or (a != a and b != b) for a, b in zip(got, want))


def brute_float_query(arm, u, cols):
    """Item 6 as written: candidates in exact order (exact Fraction key, then index), adjacent pairs, Python floats."""
    D = arm.den
    pts = [[F(c[i], D) for c in arm.cols] for i in range(arm.n)]
    fpts = [[float(x) for x in p] for p in pts]

    def exact(x, y):
        return x[0] * y[0] - sum(a * b for a, b in zip(x[1:], y[1:]))
    cands = sorted((v for v in range(arm.n) if v != u), key=lambda v: (exact(pts[u], pts[v]), v))
    ek = [exact(pts[u], pts[v]) for v in cands]
    fk = [py_key(fpts[u], fpts[v]) for v in cands]
    inv = [i for i in range(len(cands) - 1) if ek[i] < ek[i + 1] and fk[i] > fk[i + 1]]
    ties = sum(1 for i in range(len(cands) - 1) if ek[i] < ek[i + 1] and fk[i] == fk[i + 1])
    first = (inv[0], cands[inv[0]], cands[inv[0] + 1], fk[inv[0]], fk[inv[0] + 1]) if inv else None
    return P.FloatResult(u, len(inv), ties, sum(1 for x in fk if not math.isfinite(x)), first)


def deep_family(depth, seed=70001):
    """A word of `depth` letters and its descendants three letters down (156 words): siblings and cousins deep in
    the tree, whose exact keys are close, as in WordNet's subtrees."""
    w = random_word(Rng(seed), depth)
    out, layer = [w], [w]
    for _ in range(3):
        layer = [x + (g,) for x in layer for g in children(x)]
        out += layer
    words = sorted(out)
    return words, H3.arm(words), H2.arm(words)


def test_float_query_matches_brute_force():
    words, a3, a2 = deep_family(14)
    seen_inv = 0
    for arm in (a3, a2):
        cols = P.float_cols(arm)
        for u in range(0, arm.n, 9):
            got, want = P.float_query(arm, u, cols), brute_float_query(arm, u, cols)
            assert got == want
            seen_inv += got.inversions
    assert seen_inv > 0          # 14-17 letters invert in float64 (spike S1: from depth 10-12)
    words, a3, _ = toy_arms(60, (3, 12))   # sparse random words: few or no inversions, the same counts either way
    cols = P.float_cols(a3)
    assert all(P.float_query(a3, u, cols) == brute_float_query(a3, u, cols) for u in range(0, a3.n, 5))


def test_adjacent_flags_by_hand():
    inv, tie = P.adjacent_flags([1, 1, 2, 3, 3, 4], np.array([5., 4., 4., 6., 1., 1.]))
    assert inv.tolist() == [False, False, False, False, False] and tie.tolist() == [False, True, False, False, True]
    inv, tie = P.adjacent_flags([1, 2, 3], np.array([2., 1., np.nan]))
    assert inv.tolist() == [True, False] and tie.tolist() == [False, False]
    inv, tie = P.adjacent_flags([7], np.array([1.]))
    assert inv.size == 0 and tie.size == 0


def test_float_queries_pool_is_deterministic():
    _, a3, _ = toy_arms(60)
    cols = P.float_cols(a3)
    qs = list(range(a3.n))[::-1]
    assert P.float_queries(a3, qs, cols, workers=3) == P.float_queries(a3, qs, cols, workers=1)


# ================================================================ L4 control 2
def key_arm(x0s):
    """A Lorentz arm whose node 0 is (1, 0, 0): node 0's key against node i is x0s[i] exactly."""
    return Arm('toy', 'lorentz', [x0s, [0] * len(x0s), [0] * len(x0s)], 1)


def test_control2_by_hand():
    # node 0 queries; nodes 1 (neighbour) and 2 (non-neighbour) tie exactly at key 3; node 3 is farther
    arm = key_arm([1, 3, 3, 5])
    keys = arm.keys(0)
    assert keys == [1, 3, 3, 5]
    assert P.exact_tie(keys, 0, [1]) and not P.exact_tie(keys, 0, [3]) and not P.exact_tie(keys, 0, [1, 2])
    pessimistic = R.rank_query(arm, 0, [[[1], [], [], []]]).ap[0]
    assert pessimistic == F(1, 2)                        # the tied non-neighbour ranks first
    fk = P.float_keys(P.float_cols(arm), 0)
    assert P.acosh_order(fk, 0) == [1, 2, 3] and P.acosh_ap(0, [1], fk) == 1   # index ties: the neighbour first
    # a neighbour with the larger index: the float evaluator agrees with the pessimistic AP
    assert P.acosh_ap(0, [2], fk) == F(1, 2) == R.rank_query(arm, 0, [[[2], [], [], []]]).ap[0]


def test_ap_of_order():
    assert P.ap_of_order([5, 6, 7, 8], [6, 8]) == (F(1, 2) + F(2, 4)) / 2
    assert P.ap_of_order([5, 6], []) is None


# ================================================================ the runner's pieces
def test_runner_helpers():
    sys.path.insert(0, REFERENCE)
    import run_claims as RC
    assert RC.json_safe({'a': [1.0, float('nan')], 'b': float('inf'), 'c': 'x'}) == {'a': [1.0, None], 'b': None,
                                                                                      'c': 'x'}
    assert RC.cache_name(os.path.join(RC.lexicon.CACHE, 'phase2', 'l1', 'a.V0.sha256.txt')) == \
        os.path.join('phase2', 'l1', 'a.V0.sha256.txt')


def test_v1_is_in_force(monkeypatch):
    """Amendment 1 item 3 and Amendment 4 item 2: V1 is pinned, so its cells are in force. Without it the decisive
    run refuses; a dry run goes on and says the V1 cells are not run."""
    sys.path.insert(0, REFERENCE)
    import run_claims as RC
    monkeypatch.setattr(wordpiece, 'v1_available', lambda: False)
    monkeypatch.setattr(RC, 'DRY', False)
    with pytest.raises(SystemExit) as e:
        RC.p2_vocabs()
    assert 'refuses' in str(e.value)
    monkeypatch.setattr(RC, 'DRY', True)
    vocabs, info = RC.p2_vocabs()
    assert [t for t, _, _ in vocabs] == ['V0'] and 'skipped' in info['V1']


def test_ewt_text_is_withheld(monkeypatch, tmp_path, v0):
    """L1's Data ("UD EWT ..., text not committed"): for set (b) the JSON's control and Hugging Face examples keep
    the instance, the offset and SHA-256s and lengths, never a record window or a token list; the examples go to the
    cache. The same strings as set (a) keep their windows (the control of the test). Hand-built strings only: no EWT
    sentence is read."""
    sys.path.insert(0, REFERENCE)
    import run_claims as RC
    from lexicon import CACHE
    from lexicon.normalise import nb
    monkeypatch.setattr(RC, 'P2_CACHE', str(tmp_path))
    monkeypatch.setattr(RC, 'P2_C2_SETS', ('a', 'b'))
    monkeypatch.setattr(RC, 'P2_C3_SETS', ('a', 'b'))
    os.makedirs(tmp_path / 'l1')
    texts = ['Caf\u00e9 cr\u00e8me br\u00fbl\u00e9e in Z\u00fcrich, unaffordably.', 'na\u00efve fa\u00e7ade r\u00e9sum\u00e9s',
             'plain ascii only']
    blobs = [t.encode('utf-8') for t in texts]
    hf_ok = P.hf_version()[0] is not None
    vocab = [('V0', v0, wordpiece.V0_PATH)]
    out = {}
    for name in ('a', 'b'):
        S = {'name': name, 'blobs': blobs, 'sha256': '-', 'pinned': None, 'source': 'hand-built'}
        out[name] = RC.p2_l1_set(S, vocab, hf_ok)
    (res_a, ctl_a), (res_b, ctl_b) = out['a'], out['b']
    assert ctl_b['3']['V0']['differ'] == 2 and ctl_b['2']['V0']['differ'] > 0

    def examples(res, ctl):
        hf = res['cells']['V0'].get('hf_agreement', {}).get('examples', [])
        return ctl['2']['V0']['examples'] + ctl['3']['V0']['examples'] + hf
    ex_b, ex_a = examples(res_b, ctl_b), examples(res_a, ctl_a)
    assert ex_b and all(not set(RC.P2_TEXT_FIELDS) & set(e) and 'text' in e for e in ex_b)
    assert any('registered' in e for e in ex_a) and 'examples_file' not in res_a
    committed = json.dumps([res_b, ctl_b], ensure_ascii=False)
    for t in texts[:2]:
        normalised = P.record_of(nb(t.encode('utf-8')), v0)[0].split('\t')[0]
        assert normalised[:24] not in committed
    for word in ('creme', 'zurich', 'facade', 'resume'):
        assert word not in committed and word.encode().hex() not in committed
    # a Hugging Face example's token lists (these strings give none): hashed as JSON, their lengths kept
    w = RC.withhold_text([{'instance': 5, 'first_difference_at': 2, 'ours': ['caf', '##e'], 'hf': ['cafe'],
                           'tokens': [2, 1]}], 'x')[0]
    assert set(w) == {'instance', 'first_difference_at', 'tokens', 'ours_sha256', 'ours_length', 'hf_sha256',
                      'hf_length', 'text'}
    assert w['ours_length'] == 2 and w['hf_sha256'] == RC.sha('["cafe"]')
    full = json.load(open(os.path.join(CACHE, res_b['examples_file']), encoding='utf-8'))
    for e, w in zip(full['c3']['V0'], ctl_b['3']['V0']['examples']):
        assert e['instance'] == w['instance'] and RC.sha(e['registered']) == w['registered_sha256']
        assert len(e['control']) == w['control_length']


def test_spike_markdown_files():
    sys.path.insert(0, REFERENCE)
    import run_claims as RC
    try:
        md = RC.spike_markdown_files()
    except subprocess.CalledProcessError:
        pytest.skip('commit 7b10514 is not in this checkout')
    paths = [p for p, _ in md]
    assert len(md) == 10 and paths == sorted(paths) and all(p.startswith('Pages/') and p.endswith('.md') for p in paths)
    for _, b in md:
        b.decode('utf-8')       # every file is valid UTF-8, so every dry instance has a record


@pytest.mark.slow
def test_dry_run_end_to_end():
    """run_claims.py --phase2 --dry writes results/dry/phase2-python.json with the documented keys and consistent
    digests (the cache files hash to their list digests)."""
    out = subprocess.run([sys.executable, '-B', os.path.join(REFERENCE, 'run_claims.py'), '--phase2', '--dry'],
                         capture_output=True, text=True, timeout=600)
    assert out.returncode == 0, out.stderr[-2000:]
    r = json.load(open(os.path.join(REFERENCE, 'results', 'dry', 'phase2-python.json')))
    assert r['phase'] == 2 and r['dry'] is True and set(r['claims']) == {'L1', 'L4'}
    L1, L4 = r['claims']['L1'], r['claims']['L4']
    assert set(L1['sets']) == {'dry_d', 'markdown'} and L1['trace_check']['equal'] == L1['trace_check']['lines']
    from lexicon import CACHE
    for s in L1['sets'].values():
        for c in s['cells'].values():
            path = os.path.join(CACHE, c['records_sha256_file'])
            assert hashlib.sha256(open(path, 'rb').read()).hexdigest() == c['records_list_sha256']
    assert set(L4['a']) == {'verbs-subtree', 'verbs'} and L4['b']['decision'] in ('supported', 'refuted', 'void')
    for trees in L4['a'].values():
        for x in trees.values():
            assert P.list_digest(x['rank_list_sha256']) == x['rank_lists_digest']
    assert L4['a']['verbs']['H3']['phase1_l5_cross_check']['equal'] is True
