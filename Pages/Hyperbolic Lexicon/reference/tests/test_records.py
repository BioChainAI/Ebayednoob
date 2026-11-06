"""lexicon.records: LVOCAB/1, LADDR/1, LPREP/1, LCORPUS/1, LGROW/1 (Amendment 7 item 3) and the pinned normaliser
spec. Unregistered data only (seeds 70000 + i); the full addrTableRoot over V0's map A is a slow test."""
import hashlib
import os
import time

import pytest

import lexicon
from lexicon import chain as C
from lexicon import h2exact, h3tree, manifest, records as R, unicode_tables, wordpiece
from lexicon.address import word_str

PREREG = os.path.join(lexicon.SYSTEM, 'PREREGISTRATION.md')


def test_nb_spec_is_pinned_and_verbatim():
    assert R.nb_spec_sha() == R.NB_SPEC_SHA256
    spec = open(R.NB_SPEC_PATH, encoding='utf-8').read()
    src = open(PREREG, encoding='utf-8').read().split('\n')
    a = next(i for i, l in enumerate(src) if l.startswith('**1. N_B, exactly.**'))
    b = next(i for i in range(a, len(src)) if src[i] == 'registered fallback) is unchanged.')
    c = next(i for i, l in enumerate(src) if l.startswith('**3. Readings fixed in the reference**'))
    d = next(i for i in range(c, len(src)) if src[i].startswith('- *N_B.*'))
    e = next(i for i in range(d + 1, len(src)) if src[i].startswith('- '))
    assert spec == '\n'.join(src[a:b + 1]) + '\n\n' + '\n'.join([src[c]] + src[d:e]) + '\n'


def test_lvocab():
    v0 = wordpiece.load_v0()
    s = R.lvocab(v0)
    f = s.split('|')
    assert f == ['LVOCAB/1', v0.sha256, R.NB_SPEC_SHA256, unicode_tables.SHA256, 'wordpiece-greedy/1', 'lex0-bpe/1',
                 'bc86a44d55ee251c718eeb28ecd729396f82e4bca0d530097595cee9794e287f', '-',
                 '[PAD]=0,[UNK]=1,[CLS]=2,[SEP]=3,[MASK]=4']
    assert R.record_hash(s) == hashlib.sha256(s.encode()).hexdigest()


def test_addr_rows_and_root():
    words = [(0,), (5, 2, 4), (1, 1, 2, 2), (3,) * 10, (0,)]
    rows = R.addr_rows(['[PAD]', 'a|b', '##x', 'é', 'dup'], words)
    for i, (r, w) in enumerate(zip(rows, words)):
        parts = r.split('|')
        assert parts[0] == str(i) and parts[-4] == word_str(w) and parts[-3] == str(len(w))
        X3, X2 = h3tree.point(w), h2exact.TREE.point(w)
        assert parts[-2] == hashlib.sha256(h3tree.coords_text(X3, h3tree.den(len(w))).encode()).hexdigest()
        assert parts[-1] == hashlib.sha256(h3tree.coords_text(X2, h2exact.TREE.den(len(w))).encode()).hexdigest()
    assert rows[1].startswith('1|a|b|') and rows[0].split('|')[-2:] == rows[4].split('|')[-2:]
    assert R.addr_table_root(rows) == manifest.root([r.encode() for r in rows]).hex()
    la = R.laddr('ab' * 32, R.addr_table_root(rows))
    assert la.split('|') == ['LADDR/1', 'ab' * 32, 'cbda5ea6eef7f36a97a43d4a75f85e07fccbb4f23657d27b4ccbc93e2646ab59', 'L3/1',
                             R.addr_table_root(rows), '3/4', '11/13', 'D3']


def test_lprep_tier_s_and_p():
    text = C.synth_shard(70010)[0]
    data = text.encode()
    v0 = wordpiece.load_v0()
    for eng in (False, True):
        rec = C.grow(text, engrams=eng)
        f = R.lprep_fields(rec, data, v0, R.SYNTH_CORPUS, 3, R.SPDX_CC0, R.source_url_sha_synth(1000, 3),
                           'aa' * 32, 'bb' * 32)
        s = R.lprep(f)
        parts = s.split('|')
        assert len(parts) == 15 and parts[0] == 'LPREP/1' and parts[-1] == 'S'
        assert parts[3] == rec['chainId'] and parts[4] == rec['merkleRoot'] and parts[5] == str(len(data))
        assert parts[6] == hashlib.sha256(data).hexdigest()
        assert parts[8] == hashlib.sha256(b'rng:1000+3').hexdigest()
        ids = wordpiece.encode(data, v0)[0]
        assert parts[10] == hashlib.sha256(wordpiece.id_stream([ids])).hexdigest()
        assert parts[12] == hashlib.sha256(C.weave3_text(C.exact_weave(rec['leafHashes'])).encode()).hexdigest()
        assert parts[13] == (hashlib.sha256(rec['engramStream'].encode()).hexdigest() if eng else '-')
        assert R.parse_lprep(s) == (dict(zip(R.LPREP_FIELDS, parts)), None)
        salt = R.test_salt(3)
        assert salt == hashlib.sha256(b'lexicon-test-salt/1|3').hexdigest()
        p = R.lprep(f, R.TIER_P, salt)
        pp = p.split('|')
        assert len(pp) == 16 and pp[3] == '-' and pp[14] == 'P' and pp[4] == rec['merkleRoot']
        assert pp[15] == hashlib.sha256(f'LPREP-SALT/1|{salt}|{rec["merkleRoot"]}|{rec["chainId"]}'.encode()).hexdigest()
        assert R.parse_lprep(p)[1] == pp[15]
    for bad in ('LPREP/1|x', s + '|' + 'ab' * 32, s.replace('|S', '|P'), s.replace('|3|', '|03|', 1), None):
        with pytest.raises(ValueError):
            R.parse_lprep(bad)


def test_lcorpus_and_lgrow():
    lps = [f'LPREP/1|c|{j}|x' for j in range(7)]
    log = R.corpus_log(lps)
    assert log.D == [hashlib.sha256(s.encode()).digest() for s in lps]
    lc = R.lcorpus('c', lps, ['CC0-1.0', 'LicenseRef-WordNet-3.0', 'CC0-1.0'])
    assert lc == '|'.join(['LCORPUS/1', 'c', '7', log.root().hex(),
                           hashlib.sha256(b'CC0-1.0,LicenseRef-WordNet-3.0').hexdigest(), '-', '-', '-', '-'])
    assert R.parse_lcorpus(lc)['N'] == 7
    g, proof = R.grow_record(lps, 'c')
    pg = R.parse_lgrow(g)
    assert (pg['N_old'], pg['N_new'], pg['root_new']) == (6, 7, log.root().hex())
    assert pg['proofSha'] == hashlib.sha256(b''.join(proof)).hexdigest()
    assert manifest.verify_consistency(6, 7, log.root(6), log.root(), proof)
    g1, p1 = R.grow_record(lps[:1], 'c')
    assert p1 == [] and R.parse_lgrow(g1)['root_old'] == manifest.EMPTY.hex()
    for bad in (lc + '|-', lc.replace('LCORPUS', 'LCORPUZ')):
        with pytest.raises(ValueError):
            R.parse_lcorpus(bad)


def test_source_urls():
    assert R.source_url_sha_c0() == hashlib.sha256(
        b'https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip').hexdigest()


@pytest.mark.slow
def test_laddr_over_v0_map_a(wn):
    """The real addrTableRoot (needs WordNet; recomputed once per verification session, Amendment 7 item 7)."""
    t = time.time()
    s, root, rows, report = R.laddr_v0(wn)
    ms = (time.time() - t) * 1000
    assert len(rows) == 8192 and report['entries'] == 8192
    assert rows[1].startswith('1|[UNK]|5')
    assert s.split('|')[4] == root and R.addr_table_root(rows) == root
    print(f'\naddrTableRoot {root} in {ms:.0f} ms; LADDR/1 hash {R.record_hash(s)}')
