"""The pinned Unicode 15.1 table (golden/unicode_15_1_v1.json) against Python's own unicodedata and str.lower, on
every code point: the SHA-256 pin, categories, lowercase, combining classes, NFD, the two Final_Sigma sets and the
whitespace set."""
import hashlib
import json
import os
import unicodedata

import pytest

from lexicon import GOLDEN
from lexicon import unicode_tables as U

NONSUR = [cp for cp in range(0x110000) if not 0xD800 <= cp <= 0xDFFF]
needs_151 = pytest.mark.skipif(unicodedata.unidata_version != '15.1.0', reason='the oracle is unicodedata 15.1.0')


def test_pin_and_meta():
    blob = open(U.PATH, 'rb').read()
    assert hashlib.sha256(blob).hexdigest() == U.SHA256 and len(blob) == U.BYTES
    assert blob.endswith(b'\n') and blob.count(b'\n') == 1 and blob.isascii()
    t = json.loads(blob)
    assert blob == (json.dumps(t, separators=(',', ':')) + '\n').encode('ascii')   # canonical compact JSON
    meta = json.load(open(os.path.join(GOLDEN, 'unicode_15_1_v1.meta.json')))
    assert meta['sha256'] == U.SHA256 and meta['bytes'] == U.BYTES and meta['unicode'] == '15.1.0'
    assert meta['counts']['gcRanges'] == len(t['gc']) and meta['counts']['lower'] == len(t['lower'])
    assert t['unicode'] == '15.1.0' and t['whitespace'] == [0x20, 0x2028, 0x2029]
    assert os.path.exists(os.path.join(GOLDEN, 'LICENSE-UNICODE.txt'))


def test_tampered_table_is_refused(tmp_path, monkeypatch):
    blob = bytearray(open(U.PATH, 'rb').read())
    blob[blob.index(b'"Lu"') + 2] = ord('l')       # one category 'Lu' -> 'Ll': same size, other SHA-256
    p = tmp_path / 'unicode.json'
    p.write_bytes(bytes(blob))
    monkeypatch.setattr(U, 'PATH', str(p))
    monkeypatch.setattr(U, '_memo', {})
    with pytest.raises(ValueError):
        U.tables()


def test_gc_ranges_cover_everything():
    gc = U.tables()['gc']
    assert gc[0][0] == 0 and gc[-1][1] == 0x10FFFF
    assert all(gc[i][1] + 1 == gc[i + 1][0] and gc[i][2] != gc[i + 1][2] for i in range(len(gc) - 1))
    assert {v for _, _, v in gc} <= set(U.CATEGORIES)


@needs_151
def test_category_every_code_point():
    codes = U.category_codes()
    for cp in range(0x110000):
        want = unicodedata.category(chr(cp))
        assert U.CATEGORIES[codes[cp]] == want, hex(cp)
    for cp in (0, 0x41, 0x378, 0xD800, 0xE000, 0x10FFFF, 0x0897, 0x1F600):
        assert U.category(cp) == unicodedata.category(chr(cp))


@needs_151
def test_lower_ccc_nfd_every_code_point():
    full, ccc = U.full_decomp_map(), U.ccc_map()
    for cp in NONSUR:
        c = chr(cp)
        assert ''.join(map(chr, U.lower(cp))) == c.lower(), hex(cp)
        assert U.ccc(cp) == unicodedata.combining(c), hex(cp)
        d = list(full.get(cp, (cp,)))
        # canonical ordering of the one code point's decomposition (stable by class)
        i = 0
        while i < len(d):
            if d[i] not in ccc:
                i += 1
                continue
            j = i
            while j < len(d) and d[j] in ccc:
                j += 1
            d[i:j] = sorted(d[i:j], key=lambda x: ccc[x])
            i = j
        assert ''.join(map(chr, d)) == unicodedata.normalize('NFD', c), hex(cp)
    assert U.lower(0x130) == (0x69, 0x307) and U.lower(0x3A3) == (0x3C3,)
    assert U.hangul_nfd(0xD55C) == (0x1112, 0x1161, 0x11AB) and U.hangul_nfd(0xAC00) == (0x1100, 0x1161)
    assert U.decomposition(0xAC00) is None and U.decomposition(0xE9) == (0x65, 0x301)


@needs_151
def test_final_sigma_sets_by_probe():
    """S6's probes read the two sets back from str.lower: the table must hold exactly them."""
    ign, cas = U.case_ignorable(), U.cased_not_ignorable()
    assert not ign & cas
    for cp in NONSUR:
        c = chr(cp)
        a = ('A' + c + 'Σ').lower()[-1] == 'ς'
        b = (c + 'Σ').lower()[-1] == 'ς'
        assert (cp in cas) == (a and b) and (cp in ign) == (a and not b), hex(cp)
    assert 0x27 in ign and 0x2E in ign and 0x301 in ign and 0x41 in cas and 0x3A3 in cas
    assert 0x295 in cas      # U+0295 is Ll in 15.1 (Lo since): the S6 divergence the pin freezes


@needs_151
def test_whitespace_set():
    survivors = {cp for cp in NONSUR if chr(cp).isspace() and not unicodedata.category(chr(cp)).startswith('C')
                 and unicodedata.category(chr(cp)) != 'Zs'} | {0x20}
    assert U.whitespace() == frozenset(survivors) == {0x20, 0x2028, 0x2029}
