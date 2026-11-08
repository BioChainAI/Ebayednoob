"""The pinned Unicode 15.1 table (golden/unicode_15_1_v1.json, exported from CPython's unicodedata) against the
official UCD 15.1.0 files that golden/check_ucd_v1.py pins (golden/ucd_15_1_v1.meta.json): its parsers on small
inputs, the pins, and, when the files are cached, every field of the table. Never fetches: without the cache the
comparison is skipped (golden/check_ucd_v1.py fetches them)."""
import copy
import importlib.util
import json
import os

import pytest

from lexicon import CACHE, GOLDEN
from lexicon import unicode_tables as U

_spec = importlib.util.spec_from_file_location('check_ucd_v1', os.path.join(GOLDEN, 'check_ucd_v1.py'))
C = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(C)
META = json.load(open(C.META))


def test_parsers_on_small_inputs():
    rows = C.parse_unicodedata('0041;LATIN CAPITAL LETTER A;Lu;0;L;;;;;N;;;;0061;\n'
                               '3400;<CJK Ideograph Extension A, First>;Lo;0;L;;;;;N;;;;;\n'
                               '4DBF;<CJK Ideograph Extension A, Last>;Lo;0;L;;;;;N;;;;;\n')
    assert [(a, b, f[2]) for a, b, f in rows] == [(0x41, 0x41, 'Lu'), (0x3400, 0x4DBF, 'Lo')]
    with pytest.raises(C.Refused):
        C.parse_unicodedata('3400;<CJK Ideograph Extension A, First>;Lo;0;L;;;;;N;;;;;\n'
                            '4DC0;YIJING HEXAGRAM SYMBOL FOR THE CREATIVE HEAVEN;So;0;ON;;;;;N;;;;;\n')
    lower, cond = C.parse_special_lower('# c\n0130; 0069 0307; 0130; 0130; # I WITH DOT ABOVE\n'
                                        '03A3; 03C2; 03A3; 03A3; Final_Sigma; # SIGMA\n'
                                        '0049; 0131; 0049; 0049; tr; # I\n')
    assert lower == {0x130: [0x69, 0x307]} and cond == {0x3A3: ['Final_Sigma'], 0x49: ['tr']}
    props = C.parse_properties('0027 ; Case_Ignorable # Po\n0041..0043 ; Cased # L&\n0041 ; Lowercase\n',
                               ('Cased', 'Case_Ignorable'))
    assert props == {'Cased': {0x41, 0x42, 0x43}, 'Case_Ignorable': {0x27}}
    assert C.runs([0, 0, 5, 5, 0, 7]) == [[0, 1, 0], [2, 3, 5], [4, 4, 0], [5, 5, 7]]
    assert C.runs([0, 5, 5, 0], keep=lambda v: v) == [[1, 2, 5]]
    assert C.set_runs({3, 1, 2, 7}) == [[1, 3], [7, 7]]
    assert sum(C.noncharacter(cp) for cp in range(C.N)) == 66


def test_pins():
    assert C.CACHE == CACHE and C.CACHE_DIR == os.path.join(CACHE, 'ucd-15.1.0')
    assert META['unicode'] == '15.1.0' and len(META['commit']) == 40 and int(META['commit'], 16) >= 0
    assert list(META['files']) == list(C.FILES)
    for name, f in META['files'].items():
        assert f['url'] == C.RAW.format(commit=META['commit'], file=name) and len(f['sha256']) == 64
        assert f['header'] == C.HEADERS[name]
    assert META['checks']['tableSha256'] == U.SHA256


@pytest.fixture(scope='module')
def ucd():
    paths = {n: os.path.join(C.CACHE_DIR, n) for n in C.FILES}
    if not all(os.path.exists(p) for p in paths.values()):
        pytest.skip('the UCD 15.1.0 files are not cached: run golden/check_ucd_v1.py')
    blobs = {n: open(p, 'rb').read() for n, p in paths.items()}
    for n, b in blobs.items():
        assert C.sha256(b) == META['files'][n]['sha256'], n
    return C.ucd_facts({n: b.decode('utf-8') for n, b in blobs.items()})


def test_table_equals_the_ucd(ucd):
    facts, info = ucd
    table, sha = C.load_table()
    assert sha == U.SHA256
    result = C.compare(table, facts)
    assert list(result) == ['unicode', 'gc', 'decomp', 'ccc', 'lower', 'caseIgnorable', 'casedNotIgnorable',
                            'whitespace', 'hangul']
    assert not any(result.values()), {k: v for k, v in result.items() if v}
    counts = json.load(open(C.TABLE_META))['counts']
    assert (info['cn'], info['decomp'], info['lower'], info['caseIgnorable']) == (
        counts['cn'], counts['decomp'], counts['lower'], counts['caseIgnorableCodePoints'])
    assert len(facts['casedNotIgnorable']) == counts['casedNotIgnorableCodePoints']
    assert facts['gc'][0x295] == 'Ll' and 0x295 in facts['casedNotIgnorable']   # Ll in 15.1 (Lo since 16.0)
    assert facts['gc'][0x897] == 'Cn' and facts['gc'][0x2EBF0] == 'Lo'          # 16.0 absent, 15.1's Ext. I there
    assert facts['lower'][0x130] == [0x69, 0x307] and facts['lower'][0x3A3] == [0x3C3]


def test_a_difference_is_reported(ucd):
    facts, _ = ucd
    table, _ = C.load_table()
    t = copy.deepcopy(table)
    t['gc'][1] = [32, 32, 'Zl']
    t['lower'] = [e for e in t['lower'] if e[0] != 0x130]
    t['caseIgnorable'] = t['caseIgnorable'][1:]
    result = C.compare(t, facts)
    assert result['gc'] == {'table Zl, UCD Zs': (1, ['U+0020'])}
    assert result['lower'] == {'only in the UCD': (1, ['U+0130 -> 0069 0307'])}
    assert result['caseIgnorable'] == {'only in the UCD (gc Po)': (1, ['U+0027'])}
    assert not result['decomp'] and not result['ccc'] and not result['hangul']
