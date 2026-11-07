"""Stage 2's data (Amendment 13 items 2, 3, 8, 9, 14): the pins against A13's table, the pin check and the fetch
script on synthetic files (a flipped byte, a truncated file, a wrong or missing member, GloVe's members in a small
synthetic zip, the HiT MD5), every word and gold reader on synthetic files in each format (headers, CRLF, MEN tags,
blank lines, BOM), the gold seal, poisoned gold fields, GloVe's exact decimals and cosine key, the count-check
constants against A13.9, the protocol pin, and, when the pinned files are in the cache, A13.9's counts on the real
files (counting only: nothing is scored) and the instance manifest (slow).
Seeds: none are drawn here; hpstep.prng.Rng refuses every seed outside 95200-95499 while these tests run."""
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys
import zipfile
from fractions import Fraction as F

import pytest

import hpstep.prng as P
from lexicon import glove, senses, stage2data as D, wordnet

HERE = os.path.dirname(os.path.abspath(__file__))
REFERENCE = os.path.dirname(HERE)
SCRIPT = os.path.join(REFERENCE, 'golden', 'make_stage2_v1.py')
PREREG = os.path.join(os.path.dirname(REFERENCE), 'PREREGISTRATION.md')


# ================================================================ fixtures and helpers
@pytest.fixture(autouse=True)
def seed_guard(monkeypatch):
    init = P.Rng.__init__

    def guarded(self, seed=0, state=None):
        if state is None and not 95200 <= seed < 95500:
            raise RuntimeError(f'seed {seed}: Stage 2 tests draw 95200 + i only (A13.12)')
        return init(self, seed, state)
    monkeypatch.setattr(P.Rng, '__init__', guarded)


@pytest.fixture(autouse=True)
def gold_sealed():
    D.close_gold()
    yield
    D.close_gold()


def sha(b):
    return hashlib.sha256(b).hexdigest()


def build(root, files):
    """files: {pin name: (file name, bytes, or {member: bytes} for a zip)}; writes root/<name>/<file> and returns
    the pins of exactly these files."""
    pins = {'version': 1, 'files': []}
    for name, (fn, content) in files.items():
        d = os.path.join(root, name)
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, fn)
        members = None
        if isinstance(content, dict):
            with zipfile.ZipFile(p, 'w', zipfile.ZIP_DEFLATED) as z:
                for m, b in content.items():
                    z.writestr(m, b)
            members = [{'path': m, 'bytes': len(b), 'sha256': sha(b)} for m, b in content.items()]
        else:
            with open(p, 'wb') as fh:
                fh.write(content)
        data = open(p, 'rb').read()
        pin = {'name': name, 'url': 'file://' + p, 'file': fn, 'bytes': len(data), 'sha256': sha(data)}
        if members:
            pin['members'] = members
        pins['files'].append(pin)
    return pins


HL_HEAD = 'WORD1 WORD2 POS TYPE AVG_SCORE AVG_SCORE_0_10 STD SCORES..\n'
HL_ROWS = ['alpha beta N hyp-1 5.85 9.75 0.5 6 6 5\n', 'gamma delta V syn 1.20 2.00 0.1 1 2\n',
           'Zorp Blick N no-rel 0.25 0.42 0.0 0 1\n']


def hl_text(rows=HL_ROWS):
    return (HL_HEAD + ''.join(rows)).encode()


SUITE = {
    'bless': 'word1\tword2\tlabel\tfold\nwug\tblicket\tTrue\ttest\nwug\tzorp\tFalse\tval\n',
    'wbless': ('word1\tword2\tlabel\trelation\tfold\ndax\tblicket\tTrue\thyper\ttest\n'
               'blicket\tdax\tFalse\trhyper\tval\n'),
    'leds': 'word1\tword2\tlabel\tfold\nfep\ttoma\tTrue\ttest\n',
    'eval': 'word1\tword2\tlabel\trelation\tfold\nkiki\tbouba\tTrue\thyper\ttest\nmip\tnop\tFalse\tantonym\tval\n',
    'shwartz': 'word1\tword2\tlabel\tfold\nquib\tzorp\tTrue\ttest\n',
    'bibless': 'word1\tword2\trelation\tlabel\ndax\tblicket\thyper\t1\nblicket\tdax\trhyper\t-1\ndax\tzorp\tother\t0\n',
}
SIMLEX = ('word1\tword2\tPOS\tSimLex999\tconc(w1)\tconc(w2)\tconcQ\tAssoc(USF)\tSimAssoc333\tSD(SimLex)\r\n'
          'glorp\tfrin\tA\t1.11\t2.22\t3.33\t4\t5.55\t0\t0.66\r\n'
          'wug\tdax\tN\t3.07\t4.01\t4.02\t3\t2.09\t1\t1.13\r\n')
MEN = 'wug-n blicket-n 47.000000\nzib-v zab-v 13.000000\nfrin-j dax-n 29.000000\n'
WSR = 'wug\tdax\t7.13\nfep\ttoma\t2.71\n'
WSS = 'zorp\tkiki\t8.04\nfep\ttoma\t2.71\n'
WSC = 'Word 1\tWord 2\tHuman (mean)\r\nZorp\tkiki\t8.04\r\nwug\tdax\t7.13\r\nfep\ttoma\t2.71\r\n'
RND = ('word1\tword2\tpos\tlabel\tscore\tfold\nalpha\tbeta\tN\thyp-1\t5.85\ttest\n'
       'gamma\tdelta\tV\tsyn\t1.20\ttrain\n')


def full_files(hl=None, suite=None, simlex=SIMLEX, men=MEN):
    suite = dict(SUITE, **(suite or {}))
    hl = hl or hl_text()
    f = {
        'hyperlex': ('hyperlex-data.zip', {'hyperlex-all.txt': hl, 'nouns-verbs/hyperlex-nouns.txt': hl,
                                           'splits/random/hyperlex_test_all_random.txt': hl}),
        'suite-hyperlex_rnd': ('hyperlex_rnd.tsv', RND.encode()),
        'simlex': ('SimLex-999.txt', simlex.encode()),
        'men': ('MEN_dataset_lemma_form_full', men.encode()),
        'ws353-rel': ('wordsim_relatedness_goldstandard.txt', WSR.encode()),
        'ws353-sim': ('wordsim_similarity_goldstandard.txt', WSS.encode()),
        'ws353-combined': ('combined.tab', WSC.encode()),
    }
    for name, text in suite.items():
        f['suite-' + name] = (name + '.tsv', text.encode())
    return f


def store_of(tmp_path, files, verify=True):
    pins = build(str(tmp_path), files)
    return D.Store(root=str(tmp_path), pins=pins, verify=verify)


def glove_line(word, dim, k):
    return word + ''.join(f' {((i * 7 + k) % 13 - 6) / 10:.5f}' for i in range(dim)) + '\n'


# ================================================================ pins against A13.2
def a13_text():
    return open(PREREG, encoding='utf-8').read().split('### Amendment 13 ·', 1)[1]


def test_pins_are_amendment_13s_table():
    text = a13_text()
    table = text.split('**2. Data pins', 1)[1].split('*Provenance of the pinned copies.*', 1)[0]
    pins = D.load_pins()
    names = [p['name'] for p in pins['files']]
    assert names == ['hyperlex', 'suite-bless', 'suite-wbless', 'suite-leds', 'suite-eval', 'suite-shwartz',
                     'suite-bibless', 'suite-hyperlex_rnd', 'evalution-val', 'evalution-test', 'hit-multi', 'simlex',
                     'ws353-combined', 'ws353-rel', 'ws353-sim', 'men', 'men-licence', 'glove-6b']
    for p in pins['files']:
        for item in [p] + p.get('members', []):
            # every SHA-256 is in A13.2's table, with its size written beside it (thousands separated by commas)
            assert item['sha256'] in table, item
            row = [line for line in table.split('\n') if item['sha256'] in line][0]
            assert f'{item["bytes"]:,} B `{item["sha256"]}`' in row, item
    md5 = '39c18ae770a4d84c650badc5f648f6d8'
    assert pins['files'][10]['md5'] == md5 and md5 in table
    for p in pins['files']:
        assert p['url'].startswith('https://') and p['url'].rstrip('/').split('/')[-1] in (p['file'], 'content')
    # the revisions of A13.2 are the ones in the URLs
    revs = {'hyperlex': 'ccb416191a46e37f7104a530e7c23f260e066e8c',
            'suite-bless': '6891e0eb14edc1abcaa613cadd44a41f5811fae4',
            'evalution-val': 'e3b22709365c7b3042126e5887c9baa03631354e', 'hit-multi': 'records/14036213',
            'simlex': 'fda1b39607ea6f07e41ddce22d9d5f8360ded581',
            'ws353-rel': 'e2de627dc1c4ad916916858789612b92aa642a6a',
            'men': '0d05a99326da36bc1c672cd1fa32dd8de6abf9b1', 'glove-6b': '1db2080b2d94def6e5b0386a523102f9d8849e9d'}
    by = {p['name']: p for p in pins['files']}
    for name, rev in revs.items():
        assert rev in by[name]['url']
        assert rev.split('/')[-1] in text


def test_sources_name_pinned_members():
    s = D.Store(pins=D.load_pins(), root='/nonexistent')
    for key in D.SOURCES:
        filepin, m = s.pin(key)
        assert (m is None) == (D.SOURCES[key][1] is None)


# ================================================================ the pin check (spec 13.1)
def zip_files():
    return {
        'suite-bless': ('bless.tsv', SUITE['bless'].encode()),
        'hit-multi': ('wordnet-multi.zip', {'wordnet-multi/test.jsonl': b'{"a": 1}\n',
                                            'wordnet-multi/val.jsonl': b'x\n'}),
        'glove-6b': ('glove.6B.zip', {'glove.6B.300d.txt': glove_line('the', 300, 1).encode(),
                                      'glove.6B.50d.txt': glove_line('the', 50, 1).encode(),
                                      'glove.6B.100d.txt': b'unpinned member\n'}),
    }


def test_check_passes_on_correct_files(tmp_path):
    pins = build(str(tmp_path), zip_files())
    # the 100d member is in the zip but not pinned: only the pinned members are checked
    for p in pins['files']:
        if p['name'] == 'glove-6b':
            p['members'] = [m for m in p['members'] if '100d' not in m['path']]
    assert D.check_pins(pins, str(tmp_path)) == []


def test_check_refuses_flipped_byte_and_truncation(tmp_path):
    pins = build(str(tmp_path), zip_files())
    p = os.path.join(str(tmp_path), 'suite-bless', 'bless.tsv')
    b = bytearray(open(p, 'rb').read())
    b[5] ^= 1
    open(p, 'wb').write(bytes(b))
    probs = D.check_pins(pins, str(tmp_path))
    assert len(probs) == 1 and 'suite-bless' in probs[0] and 'SHA-256' in probs[0]
    open(p, 'wb').write(bytes(b[:-3]))
    probs = D.check_pins(pins, str(tmp_path))
    assert any('B, pinned' in x for x in probs) and any('SHA-256' in x for x in probs)
    os.remove(p)
    assert any('missing' in x for x in D.check_pins(pins, str(tmp_path)))


def test_check_refuses_a_wrong_member_glove_included(tmp_path):
    files = zip_files()
    pins = build(str(tmp_path), files)
    # rebuild the GloVe zip with the 300d member changed, and re-pin the zip itself: only the member differs
    good = files['glove-6b'][1]
    bad = dict(good, **{'glove.6B.300d.txt': glove_line('the', 300, 2).encode()})
    zp = os.path.join(str(tmp_path), 'glove-6b', 'glove.6B.zip')
    with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
        for m, b in bad.items():
            z.writestr(m, b)
    data = open(zp, 'rb').read()
    gp = [p for p in pins['files'] if p['name'] == 'glove-6b'][0]
    gp['bytes'], gp['sha256'] = len(data), sha(data)
    probs = D.check_pins(pins, str(tmp_path))
    assert len(probs) == 1 and 'glove.6B.300d.txt' in probs[0]
    # a member of another size, and a missing member
    gp['members'][1]['bytes'] += 1
    probs = D.check_pins(pins, str(tmp_path))
    assert any('glove.6B.50d.txt' in x and 'pinned' in x for x in probs)
    gp['members'].append({'path': 'glove.6B.42d.txt', 'bytes': 1, 'sha256': '0' * 64})
    assert any('no member glove.6B.42d.txt' in x for x in D.check_pins(pins, str(tmp_path)))


def test_check_refuses_md5(tmp_path):
    pins = build(str(tmp_path), zip_files())
    hp = [p for p in pins['files'] if p['name'] == 'hit-multi'][0]
    data = open(os.path.join(str(tmp_path), 'hit-multi', 'wordnet-multi.zip'), 'rb').read()
    hp['md5'] = hashlib.md5(data).hexdigest()
    assert D.check_pins(pins, str(tmp_path)) == []
    hp['md5'] = '0' * 32
    assert any('MD5' in x for x in D.check_pins(pins, str(tmp_path)))


def run_script(*args):
    return subprocess.run([sys.executable, '-B', '-I', SCRIPT, *args], capture_output=True, text=True, timeout=300)


def test_script_check_exit_codes(tmp_path):
    root = tmp_path / 'cache'
    pins = build(str(root), zip_files())
    for p in pins['files']:
        if p['name'] == 'glove-6b':
            p['members'] = [m for m in p['members'] if '100d' not in m['path']]
    pf = tmp_path / 'pins.json'
    pf.write_text(json.dumps(pins))
    r = run_script('--check', '--root', str(root), '--pins', str(pf))
    assert r.returncode == 0, r.stdout + r.stderr
    p = root / 'suite-bless' / 'bless.tsv'
    p.write_bytes(p.read_bytes()[:-1])
    r = run_script('--check', '--root', str(root), '--pins', str(pf))
    assert r.returncode == 1 and 'DIFFERENT' in r.stdout


def test_script_check_fetches_missing_files(tmp_path):
    """A13.2: "`make_stage2_v1.py --check` fetches each file into its own new folder ..., checks its size and SHA-256
    ... and refuses on any difference": --check fetches a missing pinned file (here copied from --source: no network)
    and then verifies; --check --no-fetch only verifies, so a missing file is a difference and nothing is created."""
    src = tmp_path / 'src'
    pins = build(str(src), zip_files())
    for p in pins['files']:
        p['url'] = 'file:///nonexistent/' + p['file']
        if p['name'] == 'glove-6b':
            p['members'] = [m for m in p['members'] if '100d' not in m['path']]
    pf = tmp_path / 'pins.json'
    pf.write_text(json.dumps(pins))
    empty = tmp_path / 'empty'
    r = run_script('--check', '--no-fetch', '--root', str(empty), '--pins', str(pf))
    assert r.returncode == 1 and 'missing' in r.stdout
    assert not empty.exists() or not any(empty.iterdir())
    out = tmp_path / 'out'
    r = run_script('--check', '--root', str(out), '--pins', str(pf), '--source', str(src))
    assert r.returncode == 0, r.stdout + r.stderr
    assert 'fetched' in r.stdout and 'equal their pins' in r.stdout
    assert sorted(os.listdir(out)) == sorted(p['name'] for p in pins['files'])
    r = run_script('--check', '--root', str(out), '--pins', str(pf))            # everything in place: nothing fetched
    assert r.returncode == 0 and 'fetched' not in r.stdout


def load_script():
    spec = importlib.util.spec_from_file_location('make_stage2_v1_under_test', SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_fetch_from_source_and_url(tmp_path):
    M = load_script()
    src = tmp_path / 'src'
    pins = build(str(src), zip_files())
    for p in pins['files']:
        p['url'] = 'file:///nonexistent/' + p['file']
    out = tmp_path / 'out'
    log = []
    assert M.fetch(pins, str(out), [str(src)], log.append) == []
    assert D.check_pins(pins, str(out)) == []
    assert all(x.startswith('fetched') and 'copied from' in x for x in log)
    # a second run finds every file in place
    log = []
    assert M.fetch(pins, str(out), [str(src)], log.append) == [] and all(x.startswith('ok') for x in log)
    # a folder that holds a wrong file is refused and left as it is
    p = out / 'suite-bless' / 'bless.tsv'
    p.write_bytes(b'tampered')
    log = []
    assert M.fetch(pins, str(out), [str(src)], log.append) == ['suite-bless']
    assert p.read_bytes() == b'tampered'
    # no source and an unreachable URL: the new folder is removed
    out2 = tmp_path / 'out2'
    log = []
    assert sorted(M.fetch(pins, str(out2), [], log.append)) == sorted(x['name'] for x in pins['files'])
    assert sorted(os.listdir(out2)) == []
    # a download whose bytes are not the pin's is refused; a correct one is kept
    pins2 = json.loads(json.dumps(pins))
    for p in pins2['files']:
        p['url'] = 'file://' + str(src / p['name'] / p['file'])
    pins2['files'][0]['sha256'] = '0' * 64
    out3 = tmp_path / 'out3'
    failed = M.fetch(pins2, str(out3), [], lambda s: None)
    assert failed == ['suite-bless'] and not (out3 / 'suite-bless').exists()
    assert D.check_pins({'files': pins2['files'][1:]}, str(out3)) == []


def test_store_verifies_reads(tmp_path):
    s = store_of(tmp_path, full_files())
    assert s.bytes('bless') == SUITE['bless'].encode()
    p = os.path.join(str(tmp_path), 'suite-bless', 'bless.tsv')
    open(p, 'ab').write(b'x\ty\tTrue\ttest\n')
    with pytest.raises(D.PinError):
        s.bytes('bless')
    s2 = D.Store(root=s.root, pins=s.pins, verify=False)
    assert len(D.suite_words('bless', s2)) == 3
    with pytest.raises(D.PinError):
        D.Store(root=str(tmp_path / 'none'), pins=s.pins).bytes('bless')


def test_stream_refuses_at_its_end(tmp_path):
    files = {'glove-6b': ('glove.6B.zip', {'glove.6B.300d.txt': glove_line('the', 300, 1).encode(),
                                           'glove.6B.50d.txt': glove_line('the', 50, 1).encode()})}
    s = store_of(tmp_path, files)
    with s.stream('glove-50') as fh:
        assert fh.read() == glove_line('the', 50, 1).encode()
    s.pins['files'][0]['members'][1]['sha256'] = '0' * 64
    with pytest.raises(D.PinError):
        with s.stream('glove-50') as fh:
            fh.read()


# ================================================================ readers (spec 13.2)
def test_hyperlex_readers(tmp_path):
    s = store_of(tmp_path, full_files())
    assert D.hyperlex_words('hyperlex-all', s) == [(0, 'alpha', 'beta', 'N'), (1, 'gamma', 'delta', 'V'),
                                                   (2, 'Zorp', 'Blick', 'N')]
    assert D.hyperlex_split_words(s)[0] == (0, 'alpha', 'beta', 'N', 'test')
    with pytest.raises(D.GoldSealed):
        D.hyperlex_gold('hyperlex-all', s)
    D.open_gold()
    g = D.hyperlex_gold('hyperlex-all', s)
    assert g[0] == (0, 'hyp-1', F(117, 20), F(39, 4)) and isinstance(g[0][2], F)
    assert g[2][1:] == ('no-rel', F(1, 4), F(21, 50))
    assert D.hyperlex_split_gold(s) == g


def test_hyperlex_rnd_readers(tmp_path):
    s = store_of(tmp_path, full_files())
    assert D.hyperlex_rnd_words(s) == [(0, 'alpha', 'beta', 'N', 'test'), (1, 'gamma', 'delta', 'V', 'train')]
    with pytest.raises(D.GoldSealed):
        D.hyperlex_rnd_gold(s)
    D.open_gold()
    assert D.hyperlex_rnd_gold(s) == [(0, 'hyp-1', F(117, 20)), (1, 'syn', F(6, 5))]
    assert D.random_split_agrees(s)['rows'] == (2, 1)


@pytest.mark.parametrize('bad', [
    HL_HEAD.replace('WORD1', 'word1'),                       # another header
])
def test_hyperlex_header_refused(tmp_path, bad):
    s = store_of(tmp_path, full_files(hl=(bad + ''.join(HL_ROWS)).encode()))
    with pytest.raises(D.ParseError):
        D.hyperlex_words('hyperlex-all', s)


@pytest.mark.parametrize('content', [
    hl_text() + b'\n',                                       # a blank line
    b'\xef\xbb\xbf' + hl_text(),                             # a byte-order mark
    hl_text() + b'caf\xe9 x N syn 1 1 1\n',                  # not UTF-8
    hl_text(HL_ROWS + ['onlytwo fields\n']),                 # fewer than 3 fields
])
def test_hyperlex_corners_refused(tmp_path, content):
    s = store_of(tmp_path, full_files(hl=content))
    with pytest.raises(D.ParseError):
        D.hyperlex_words('hyperlex-all', s)


def test_crlf_removed_and_final_lf_optional(tmp_path):
    crlf = hl_text().replace(b'\n', b'\r\n')
    s = store_of(tmp_path, full_files(hl=crlf))
    assert D.hyperlex_words('hyperlex-all', s)[2] == (2, 'Zorp', 'Blick', 'N')
    nolf = hl_text()[:-1]
    s = store_of(tmp_path / 'b', full_files(hl=nolf))
    assert len(D.hyperlex_words('hyperlex-all', s)) == 3


def test_suite_readers(tmp_path):
    s = store_of(tmp_path, full_files())
    assert D.suite_words('bless', s) == [(0, 'wug', 'blicket', 'test'), (1, 'wug', 'zorp', 'val')]
    assert D.suite_words('wbless', s)[1] == (1, 'blicket', 'dax', 'val')
    assert D.suite_words('eval', s)[0] == (0, 'kiki', 'bouba', 'test')
    assert D.suite_words('bibless', s) == [(0, 'dax', 'blicket', None), (1, 'blicket', 'dax', None),
                                           (2, 'dax', 'zorp', None)]
    for name in D.SUITE_HEADERS:
        with pytest.raises(D.GoldSealed):
            D.suite_gold(name, s)
    D.open_gold()
    assert D.suite_gold('bless', s) == [(0, True), (1, False)]
    assert D.suite_gold('bibless', s) == [(0, 1), (1, -1), (2, 0)]
    assert D.suite_relations('wbless', s) == [(0, 'hyper'), (1, 'rhyper')]
    with pytest.raises(KeyError):
        D.suite_relations('bless', s)


@pytest.mark.parametrize('name,text', [
    ('bless', 'word1\tword2\tlabel\tfold\nx\ty\tTrue\ttrain\n'),          # a fold outside val/test
    ('bless', 'word1\tword2\tlabel\tfold\nx\ty\tTrue\n'),                  # a missing field
    ('bless', 'word1\tword2\tfold\tlabel\nx\ty\ttest\tTrue\n'),            # another header
    ('leds', 'word1\tword2\tlabel\tfold\n\ty\tTrue\ttest\n'),              # an empty word
    ('leds', 'word1\tword2\tlabel\tfold\nx \ty\tTrue\ttest\n'),            # a trailing space
])
def test_suite_format_refused(tmp_path, name, text):
    s = store_of(tmp_path, full_files(suite={name: text}))
    with pytest.raises(D.ParseError):
        D.suite_words(name, s)


def test_suite_label_refused(tmp_path):
    s = store_of(tmp_path, full_files(suite={'bless': 'word1\tword2\tlabel\tfold\nx\ty\tyes\ttest\n',
                                             'bibless': 'word1\tword2\trelation\tlabel\nx\ty\thyper\t2\n'}))
    D.open_gold()
    for name in ('bless', 'bibless'):
        with pytest.raises(D.ParseError):
            D.suite_gold(name, s)


def test_simlex_men_ws353_readers(tmp_path):
    s = store_of(tmp_path, full_files())
    assert D.simlex_words(s) == [(0, 'glorp', 'frin', 'A'), (1, 'wug', 'dax', 'N')]
    assert D.men_words(s) == [(0, 'wug', '-n', 'blicket', '-n'), (1, 'zib', '-v', 'zab', '-v'),
                              (2, 'frin', '-j', 'dax', '-n')]
    assert D.ws353_words('ws353-rel', s) == [(0, 'wug', 'dax'), (1, 'fep', 'toma')]
    assert D.ws353_words('ws353-combined', s)[0] == (0, 'Zorp', 'kiki')
    for f, args in ((D.simlex_gold, ()), (D.men_gold, ()), (D.ws353_gold, ('ws353-sim',)), (D.raw_lines, ('men',))):
        with pytest.raises(D.GoldSealed):
            f(*args, store=s)
    D.open_gold()
    assert D.simlex_gold(s) == [(0, F(111, 100)), (1, F(307, 100))]
    assert D.men_gold(s) == [(0, F(47)), (1, F(13)), (2, F(29))]
    assert D.ws353_gold('ws353-combined', s) == [(0, F(804, 100)), (1, F(713, 100)), (2, F(271, 100))]
    assert D.raw_lines('ws353-combined', s)[0] == 'Word 1\tWord 2\tHuman (mean)'


@pytest.mark.parametrize('men', ['wug-n blicket 50\n', 'wug-x dax-n 3\n', 'wug-n dax-n\n', '-n dax-n 3\n'])
def test_men_tags_refused(tmp_path, men):
    s = store_of(tmp_path, full_files(men=men))
    with pytest.raises(D.ParseError):
        D.men_words(s)


def test_gold_decimal_refused(tmp_path):
    s = store_of(tmp_path, full_files(simlex=SIMLEX.replace('3.07', 'NaN')))
    D.open_gold()
    with pytest.raises(D.ParseError):
        D.simlex_gold(s)


def poison_hl(text, salt):
    out = []
    for i, line in enumerate(text.decode().split('\n')):
        f = line.split(' ')
        if i and len(f) >= 7:
            f[3:] = [f'G{salt}{j}' for j in range(len(f) - 3)]
        out.append(' '.join(f))
    return '\n'.join(out).encode()


def poison_tsv(text, cols, salt, header=True):
    out = []
    for i, line in enumerate(text.split('\n')):
        f = line.split('\t')
        if (i or not header) and len(f) > 1:
            for c in cols:
                f[c] = f'G{salt}{i}'
        out.append('\t'.join(f))
    return '\n'.join(out)


def test_word_readers_blind_to_gold_fields(tmp_path):
    """Poisoning every gold, label, relation and TYPE field leaves every word reader's output unchanged (A13.8)."""
    def all_words(s):
        return [D.hyperlex_words('hyperlex-all', s), D.hyperlex_split_words(s), D.hyperlex_rnd_words(s),
                [D.suite_words(n, s) for n in D.SUITE_HEADERS], D.simlex_words(s), D.men_words(s),
                [D.ws353_words(k, s) for k in ('ws353-rel', 'ws353-sim', 'ws353-combined')]]
    base = all_words(store_of(tmp_path / 'a', full_files()))
    for salt in ('x', 'y'):
        f = full_files(
            hl=poison_hl(hl_text(), salt),
            suite={'bless': poison_tsv(SUITE['bless'], [2], salt), 'wbless': poison_tsv(SUITE['wbless'], [2, 3], salt),
                   'leds': poison_tsv(SUITE['leds'], [2], salt), 'eval': poison_tsv(SUITE['eval'], [2, 3], salt),
                   'shwartz': poison_tsv(SUITE['shwartz'], [2], salt),
                   'bibless': poison_tsv(SUITE['bibless'], [2, 3], salt)},
            simlex=poison_tsv(SIMLEX.replace('\r', ''), list(range(3, 10)), salt).replace('\n', '\r\n'),
            men='\n'.join(' '.join(line.split(' ')[:2] + [f'G{salt}']) for line in MEN.strip().split('\n')) + '\n')
        f['suite-hyperlex_rnd'] = ('hyperlex_rnd.tsv', poison_tsv(RND, [3, 4], salt).encode())
        f['ws353-rel'] = ('wordsim_relatedness_goldstandard.txt', poison_tsv(WSR, [2], salt, header=False).encode())
        f['ws353-sim'] = ('wordsim_similarity_goldstandard.txt', poison_tsv(WSS, [2], salt, header=False).encode())
        f['ws353-combined'] = ('combined.tab', poison_tsv(WSC.replace('\r', ''), [2], salt).replace('\n', '\r\n')
                               .encode())
        assert all_words(store_of(tmp_path / salt, f)) == base


def test_eval_upstream_check(tmp_path):
    up_val = 'kiki-n\tbouba-n\tTrue\thyper\nmip-j\tnop-j\tFalse\tantonym\n'
    up_test = 'kiki-n\tbouba-n\tTrue\thyper\nkiki-v\tbouba-v\tTrue\thyper\n'
    suite = ('word1\tword2\tlabel\trelation\tfold\nmip\tnop\tFalse\tantonym\tval\n'
             'kiki\tbouba\tTrue\thyper\ttest\nkiki\tbouba\tTrue\thyper\ttest\n')
    f = full_files(suite={'eval': suite})
    f['evalution-val'] = ('EVALution.val', up_val.encode())
    f['evalution-test'] = ('EVALution.test', up_test.encode())
    D.open_gold()
    assert D.eval_equals_upstream(store_of(tmp_path / 'a', f)) is True
    f['suite-eval'] = ('eval.tsv', suite.replace('True\thyper\ttest\n', 'False\thyper\ttest\n', 1).encode())
    assert D.eval_equals_upstream(store_of(tmp_path / 'b', f)) is False


# ================================================================ GloVe (spec section 3 and 6)
def test_glove_exact_decimals():
    assert glove.parse_number('-0.38497') == (-38497, -5)
    assert glove.parse_number('1.2e-05') == (12, -6)
    assert glove.parse_number('3') == (3, 0)
    assert glove.parse_number('-4.5E+2') == (-45, 1)
    for bad in ('nan', '+1', ' 1', '1.', '.5', '1e', 'inf', '0x1'):
        with pytest.raises(D.ParseError):
            glove.parse_number(bad)
    v = glove.parse_vector(['0.5', '-1.25', '1.2e-05', '3e2'])
    assert v.scale == 6 and v.values() == [F(1, 2), F(-5, 4), F(12, 10 ** 6), F(300)]
    w, v = glove.parse_line('cat 0.1 -0.2 3', 3)
    assert w == 'cat' and v.values() == [F(1, 10), F(-1, 5), F(3)]
    for bad in ('cat 0.1 0.2', 'cat 0.1 0.2 0.3 0.4', 'cat  0.1 0.2', ' 0.1 0.2 0.3'):
        with pytest.raises(D.ParseError):
            glove.parse_line(bad, 3)


def test_glove_cos_key():
    a = glove.parse_vector(['0.5', '-1.25', '2'])
    b = glove.parse_vector(['1e-1', '3', '-0.75'])
    va, vb = a.values(), b.values()
    c = sum(x * y for x, y in zip(va, vb))
    want = c * abs(c) / (sum(x * x for x in va) * sum(y * y for y in vb))
    assert glove.cos_key(a, b) == want == glove.cos_key(b, a)
    assert glove.cos_key(a, a) == 1
    neg = glove.Vec([-x for x in a.ints], a.scale)
    assert glove.cos_key(a, neg) == -1
    scaled = glove.Vec([7 * x for x in b.ints], b.scale + 3)            # another positive scale, the same direction
    assert glove.cos_key(a, scaled) == glove.cos_key(a, b)
    with pytest.raises(ValueError):
        glove.cos_key(a, glove.Vec([0, 0, 0], 0))
    with pytest.raises(ValueError):
        glove.cos_key(a, glove.Vec([1, 2], 0))


def glove_store(tmp_path, lines300, lines50=None):
    lines50 = lines50 if lines50 is not None else [glove_line('the', 50, 1)]
    return store_of(tmp_path, {'glove-6b': ('glove.6B.zip', {
        'glove.6B.300d.txt': ''.join(lines300).encode(), 'glove.6B.50d.txt': ''.join(lines50).encode()})})


def test_glove_vocabulary_and_vectors(tmp_path):
    lines = [glove_line(w, 300, k) for k, w in enumerate(['the', 'cat', 'formula_1', 'café'])]
    s = glove_store(tmp_path, lines)
    v = glove.vocabulary(300, s)
    assert v == {'the', 'cat', 'formula_1', 'café'} and glove.underscore_tokens(v) == 1
    vec = glove.vectors(['cat', 'dog'], 300, s)
    assert list(vec) == ['cat'] and vec['cat'] == glove.parse_line(lines[1].rstrip('\n'), 300)[1]
    # A13.3's underscore rule: 'formula 1' becomes formula_1, which is never in the vocabulary
    assert senses.in_vocab('Cat', v) and not senses.in_vocab('formula 1', v) and not senses.in_vocab('formula_1', v)
    assert glove.coverage([('cat', 'the'), ('cat', 'formula 1'), ('dog', 'cat')], v) == \
        {'rows': 3, 'covered': 1, 'missed_words': 2}


@pytest.mark.parametrize('lines', [
    [glove_line('the', 300, 1), glove_line('the', 300, 2)],             # a repeated word
    [glove_line('the', 300, 1), glove_line('cat', 299, 2)],             # a short line
    [glove_line('the', 300, 1), glove_line('cat', 300, 2).rstrip('\n')],  # no final LF
])
def test_glove_refusals(tmp_path, lines):
    s = glove_store(tmp_path, lines)
    with pytest.raises(D.ParseError):
        glove.vocabulary(300, s)
    with pytest.raises(D.ParseError):
        glove.vectors(['the'], 300, s)


def test_glove_tampered_member_refused(tmp_path):
    s = glove_store(tmp_path, [glove_line('the', 300, 1)])
    s.pins['files'][0]['members'][0]['sha256'] = '0' * 64
    with pytest.raises(D.PinError):
        glove.vocabulary(300, s)


# ================================================================ count checks, constants (spec 13.17)
def test_count_constants_are_a13_9():
    """The registered counts, read from the constants (not the data): A13.9 and A13.13."""
    C, G = D.COUNTS_WORDS, D.COUNTS_GOLD
    assert C['wn.index_noun.lemmas'] == 117798 and sum(C['wn.index_noun.strata']) == 117798
    assert C['wn.index_noun.strata'] == (101863, 10257, 2989, 1178, 620, 306, 212, 94, 96, 183)
    assert (C['hl.rows'], C['hl.N'], C['hl.covered_full'], C['hl.covered_at'], C['hl.both_monosemous'],
            C['hl.word_types'], C['hl.reverse_rows']) == (2616, 2163, 2163, 2153, 93, 1843, 464)
    assert G['hl.type'] == {'hyp-1': 287, 'hyp-2': 241, 'hyp-3': 254, 'hyp-4': 222, 'r-hyp-1': 73, 'r-hyp-2': 53,
                            'r-hyp-3': 60, 'r-hyp-4': 40, 'cohyp': 242, 'mero': 241, 'syn': 165, 'ant': 68,
                            'no-rel': 217}
    assert sum(G['hl.type'].values()) == 2163
    assert list(G['hl.closure_forward'].values()) == [286, 241, 254, 222]
    assert list(G['hl.closure_reversed'].values()) == [73, 53, 60, 40]
    assert list(G['hl.spanning_forward'].values()) == [281, 229, 233, 214]
    assert (C['bd.rows'], C['bd.test'], G['bd.test_true'], C['bd.test_covered'], G['bd.test_covered_true'],
            C['bd.concepts'], C['bd.repeated_pairs'], C['bd.self_pairs']) == \
        (14542, 13089, 1197, 12365, 1194, 200, 6, 3)
    assert (G['bd.true_covered_all_folds'], G['bd.true_closure'], G['bd.true_spanning']) == (1334, 1149, 1099)
    assert (C['wb.rows'], C['wb.test'], G['wb.test_true'], C['wb.test_covered'], G['wb.test_covered_true'],
            C['wb.clusters'], C['wb.no_concept'], C['wb.two_concepts']) == (1668, 1501, 764, 1493, 764, 192, 0, 150)
    assert (C['leds.test'], G['leds.test_true'], C['leds.test_covered'], G['leds.true_first_sense_closure'],
            G['leds.true_all_folds']) == (2495, 1250, 2495, 1385, 1385)
    assert (C['eval.rows'], C['eval.distinct_pairs'], G['eval.pairs_with_both_labels']) == (13450, 6926, 181)
    assert (C['shwartz.test'], G['shwartz.test_true'], C['shwartz.test_covered']) == (47321, 11780, 17073)
    assert (C['sl.rows'], C['sl.N'], C['sl.N_covered'], C['men.rows'], C['men.nn'], C['men.nn_covered'],
            C['wsr.rows'], C['wsr.covered'], C['wss.rows'], C['wss.covered'], C['ws.combined.rows'],
            C['ws.combined.covered'], C['ws.combined.distinct'], C['ws.split_shared']) == \
        (999, 666, 666, 3000, 2005, 2005, 252, 245, 203, 197, 353, 344, 352, 103)
    assert (C['hl.word_types'], C['sl.word_types'], C['men.word_types']) == (1843, 751, 645)
    assert D.DRY_COUNTS_A13['hl.V'] == 453 and D.DRY_COUNTS_A13['verb_at.dry_split_rows'] == 21840 * 5 // 100 == 1092
    assert D.DRY_COUNTS_GOLD_A13 == {'hl.V_hyp_rows': 201}


def test_count_check_comparison():
    assert D.compare_counts({'a': 1, 'b': (1, 2)}, {'a': 1, 'b': (1, 2)}) == []
    assert D.compare_counts({'a': 2}, {'a': 1, 'b': 3}) == [('a', 1, 2), ('b', 3, None)]
    with pytest.raises(D.CountMismatch):
        D.check_counts({'a': 2}, {'a': 1})


def test_wbless_cluster_rule():
    concepts = frozenset({'dog', 'cat'})
    assert D.wbless_cluster('dog', 'animal', concepts) == 'dog'
    assert D.wbless_cluster('animal', 'cat', concepts) == 'cat'
    assert D.wbless_cluster('dog', 'cat', concepts) == 'dog'          # two concepts: word1's
    assert D.wbless_cluster('animal', 'thing', concepts) is None


# ================================================================ the protocol pin (A13.14, spec 13.16)
def test_protocol_file_is_a10_then_a13():
    text = D.protocol_text()
    with open(D.PROTOCOL_FILE, 'rb') as fh:
        data = fh.read()
    assert data == text.encode('utf-8')
    assert D.protocol_sha() == D.PROTOCOL_SHA == sha(data)
    assert text.startswith('### Amendment 10 · ') and text.endswith('\n') and not text.endswith('\n\n')
    assert '\r' not in text
    heads = [line for line in text.split('\n') if re.match(r'#{1,3} ', line)]
    assert len(heads) == 2 and heads[1].startswith('### Amendment 13 · ')
    assert '#### L12 · Graded type-of on HyperLex' in text and '#### L15 · ' in text
    assert text.rstrip('\n').endswith('read as exact ties (item 6).')
    # the Amendment 10 part is Phase 4's pinned l6_protocol_v1.txt, byte for byte
    with open(os.path.join(REFERENCE, 'golden', 'l6_protocol_v1.txt'), 'rb') as fh:
        a10 = fh.read()
    assert data.startswith(a10) and data[len(a10):].startswith('### Amendment 13 · '.encode())


def test_protocol_sha_refuses_another_file(tmp_path):
    p = tmp_path / 'p.txt'
    p.write_bytes(D.protocol_text().encode() + b'\n')
    with pytest.raises(ValueError):
        D.protocol_sha(str(p))


# ================================================================ the real files (counting only)
need_data = pytest.mark.skipif(not (wordnet.available() and D.available()),
                               reason='no WordNet or Stage-2 cache: run golden/make_stage2_v1.py')


@need_data
def test_counts_words_on_the_pinned_files(wn):
    assert D.compare_counts(D.count_checks_words(wn), D.COUNTS_WORDS) == []


@need_data
def test_counts_gold_on_the_pinned_files(wn):
    with pytest.raises(D.GoldSealed):
        D.count_checks_gold(wn)
    D.open_gold()
    assert D.compare_counts(D.count_checks_gold(wn), D.COUNTS_GOLD) == []


@need_data
def test_dry_counts_on_the_pinned_files(wn):
    assert D.compare_counts(D.dry_counts(wn), D.DRY_COUNTS_A13) == []
    D.open_gold()
    assert D.compare_counts(D.dry_counts_gold(wn), D.DRY_COUNTS_GOLD_A13) == []
    assert D.random_split_agrees() == {'rows': (541, 541), 'words': True, 'type': True, 'score': True}


@need_data
@pytest.mark.slow
def test_pins_check_on_the_cache():
    assert D.check_pins() == []


@need_data
@pytest.mark.slow
def test_glove_vocabulary_on_the_pinned_member():
    v = glove.vocabulary(300)
    assert len(v) == glove.LINES and glove.underscore_tokens(v) == glove.UNDERSCORE_TOKENS
    assert glove.vocabulary(50) == v


@need_data
@pytest.mark.slow
def test_instance_manifest_rebuilds():
    r = run_script('--check-manifest')
    assert r.returncode == 0, r.stdout + r.stderr
