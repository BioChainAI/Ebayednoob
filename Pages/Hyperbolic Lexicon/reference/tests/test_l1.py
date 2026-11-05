"""L1's instance loaders (Amendment 1 item 2) and the committed text traces (traces_text.py): counts, pins,
the pool of instance (d), determinism of the generators. Nothing of L1 is run or decided here."""
import hashlib
import json
import os
import subprocess
import sys
import unicodedata

import pytest

from hpstep.prng import Rng
from lexicon import REFERENCE, l1, wordpiece


def test_instance_a(wn):
    a = l1.instance_a(wn)
    assert len(a) == 117659 and all(s == s.strip() for s in a[:1000])


def test_instance_b():
    if not l1.ewt_available():
        pytest.skip('UD EWT not cached: run golden/make_ewt_v1.cjs')
    meta = json.load(open(l1.EWT_META))['files']
    sizes = []
    for split in ('train', 'dev', 'test'):
        texts = l1.instance_b(split)
        f = meta[f'en_ewt-ud-{split}.conllu']
        assert len(texts) == f['sentences']
        assert hashlib.sha256('\n'.join(texts).encode('utf-8')).hexdigest() == f['textSha256']
        sizes.append(len(texts))
    assert sizes == [12544, 2001, 2077] and len(l1.instance_b()) == 16622


def test_instance_c():
    c = l1.instance_c()
    assert len(c) == 20520 == l1.stress_set()['caseCount']
    assert c[0] == 'ʕ' and c[9990] == 'aʕb'


def test_pool_and_instance_d():
    p = l1.pool()
    assert p == sorted(set(p)) and len(p) == 12726
    post = l1.post151()
    assert len(post) == 64 and post[0] == 0x088F and post[-1] == 0xFBCC
    assert all(unicodedata.category(chr(cp)) == 'Cn' for cp in post)
    for cp in (0x00, 0x1F, 0x7F, 0xFF, 0x17F, 0x300, 0x36F, 0x3A3, 0x3C2, 0x4FF, 0xAC00, 0xD7A3, 0x4E00, 0x4FFF,
               0x1F600, 0x1F64F, 0x200B, 0xFEFF):
        assert cp in p
    for cp in (0x180, 0x2FF, 0x500, 0x5000, 0x1F650, 0xD7A4):
        assert cp not in p
    d = l1.instance_d()
    assert len(d) == 2000 and d == l1.instance_d()
    r = Rng(1000)
    n = 1 + r.below(64)
    assert d[0] == ''.join(chr(p[r.below(len(p))]) for _ in range(n))
    assert all(1 <= len(s) <= 64 for s in d)
    assert l1.dry(0) == l1.synthetic(4000) != d[0] and l1.trace_string(0) == l1.synthetic(8000)


def test_traces_are_current():
    with open(os.path.join(REFERENCE, 'traces', 'wordpiece_v1.txt'), encoding='utf-8') as f:
        if '# vocab V1:' in f.read() and not wordpiece.v1_available():
            pytest.skip('the committed wordpiece trace holds V1, which is not cached')
    out = subprocess.run([sys.executable, '-B', os.path.join(REFERENCE, 'traces_text.py'), '--check'],
                         capture_output=True, text=True)
    assert out.returncode == 0, out.stderr
