#!/usr/bin/env python3
"""Hyperbolic Lexicon: pins the Unicode 15.1 table that N_B reads (Phase 1; D5, Amendment 1 item 1).

    python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_unicode_v1.py"           write the table and its meta
    python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_unicode_v1.py" --check   rebuild in memory and compare

The table is exported from Python's own unicodedata and str.lower, and refused unless unicodedata.unidata_version is
'15.1.0' (CPython 3.13). It holds every Unicode fact N_B uses, so neither the Python reference nor the browser core
ever asks its platform:
    gc                 general categories as maximal runs [start, end, cat] over ALL of 0..10FFFF (Cs and Cn included)
    decomp             single-step canonical decompositions [cp, [cp...]] (Hangul syllables are algorithmic, not stored)
    ccc                non-zero canonical combining classes as runs [start, end, ccc]
    lower              full lowercase mappings [cp, [cp...]] of str.lower on the code point alone (U+03A3 -> U+03C3;
                       Final_Sigma is decided by N_B from the next two sets)
    caseIgnorable      runs [start, end] of Case_Ignorable code points
    casedNotIgnorable  runs [start, end] of Cased code points that are not Case_Ignorable
    whitespace         the code points str.split() splits on after N_B step 1 (derived and asserted: 32, 8232, 8233)
    hangul             the constants of the algorithmic Hangul decomposition
unicodedata does not expose Cased or Case_Ignorable. They are read from str.lower itself, as spike S6 did: for each
code point c, lower('A' + c + U+03A3) and lower(c + U+03A3) each end in U+03C2 (final) or U+03C3. CPython's
Final_Sigma skips case-ignorable code points backwards and then needs a cased one, so c is case-ignorable when only
the first ends in U+03C2, cased and not case-ignorable when both do, and neither otherwise (only the second is
impossible and is asserted absent). These are the only two sets the rule reads.

The JSON is compact (separators ',' and ':'), ASCII, keys in a fixed order, LF at the end: unicode_15_1_v1.json. Its
SHA-256, size and entry counts go to unicode_15_1_v1.meta.json, and the SHA-256 is pinned again in
lexicon/unicode_tables.py. Before writing, the script checks that the table alone reproduces str.lower and
unicodedata.normalize('NFD') on every code point (the exactness check S6 ran on its prototype).

--check exits 0 when the rebuilt bytes and SHA-256 equal the committed file's (and the meta agrees), 1 otherwise.
The data is the Unicode Character Database's (Unicode License v3, LICENSE-UNICODE.txt). Runtime: about 10 s.
"""
import hashlib
import json
import os
import platform
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
TABLE = os.path.join(HERE, 'unicode_15_1_v1.json')
META = os.path.join(HERE, 'unicode_15_1_v1.meta.json')
VERSION = '15.1.0'
SIGMA, FINAL = 'Σ', 'ς'
NONSUR = [cp for cp in range(0x110000) if not 0xD800 <= cp <= 0xDFFF]
HANGUL = {'sBase': 0xAC00, 'lBase': 0x1100, 'vBase': 0x1161, 'tBase': 0x11A7, 'lCount': 19, 'vCount': 21, 'tCount': 28}
SOURCE = ('Exported by golden/make_unicode_v1.py from CPython %s unicodedata (Unicode Character Database 15.1.0): '
          'unicodedata.category, unicodedata.decomposition (canonical only), unicodedata.combining, str.lower; '
          'Case_Ignorable and Cased read from str.lower by the Final_Sigma probes. Derived from the Unicode '
          'Character Database, (c) Unicode, Inc., Unicode License v3, https://www.unicode.org/license.txt')


def runs(get, lo=0, hi=0x10FFFF):
    """Maximal runs of equal values over consecutive code points lo..hi, as [start, end, value]."""
    out = []
    start, cur = lo, get(lo)
    for cp in range(lo + 1, hi + 1):
        v = get(cp)
        if v != cur:
            out.append([start, cp - 1, cur])
            start, cur = cp, v
    out.append([start, hi, cur])
    return out


def sigma_class(cp):
    """'I' case-ignorable, 'C' cased and not case-ignorable, 'N' neither (S6's probes of CPython's Final_Sigma)."""
    if 0xD800 <= cp <= 0xDFFF:
        return 'N'
    c = chr(cp)
    a = ('A' + c + SIGMA).lower()[-1] == FINAL
    b = (c + SIGMA).lower()[-1] == FINAL
    if b and not a:
        raise AssertionError('U+%04X: final after itself but not after A + itself (impossible)' % cp)
    return ('C' if b else 'I') if a else 'N'


def build():
    """The table (a dict in its fixed key order) and the counts the meta records."""
    if unicodedata.unidata_version != VERSION:
        raise SystemExit('refused: unicodedata is %s, the pin needs %s (CPython 3.13)' % (unicodedata.unidata_version,
                                                                                         VERSION))
    decomp, lower = [], []
    for cp in NONSUR:
        c = chr(cp)
        d = unicodedata.decomposition(c)
        if d and not d.startswith('<') and not HANGUL['sBase'] <= cp < HANGUL['sBase'] + 11172:
            decomp.append([cp, [int(x, 16) for x in d.split()]])
        lo = c.lower()
        if lo != c:
            lower.append([cp, [ord(x) for x in lo]])
    gc = runs(lambda cp: unicodedata.category(chr(cp)))
    ccc = [r for r in runs(lambda cp: unicodedata.combining(chr(cp))) if r[2] != 0]
    sig = runs(sigma_class)
    ign = [[a, b] for a, b, v in sig if v == 'I']
    cas = [[a, b] for a, b, v in sig if v == 'C']
    # Step 3's whitespace: what str.isspace holds for, among the code points that survive step 1 unchanged (step 1
    # drops every C category except Cn and turns tab, LF, CR and Zs into U+0020).
    ws = sorted({0x20} | {cp for cp in NONSUR if chr(cp).isspace() and not unicodedata.category(chr(cp)).startswith('C')
                          and unicodedata.category(chr(cp)) != 'Zs'})
    assert ws == [0x20, 0x2028, 0x2029], ws
    table = {
        'format': 'hyperbolic-lexicon/unicode-table/1',
        'unicode': unicodedata.unidata_version,
        'source': SOURCE % platform.python_version().rsplit('.', 1)[0],
        'gc': gc,
        'decomp': decomp,
        'ccc': ccc,
        'lower': lower,
        'caseIgnorable': ign,
        'casedNotIgnorable': cas,
        'whitespace': ws,
        'hangul': HANGUL,
    }
    counts = {
        'gcRanges': len(gc),
        'cn': sum(b - a + 1 for a, b, v in gc if v == 'Cn'),
        'decomp': len(decomp),
        'decompSingleton': sum(1 for _, v in decomp if len(v) == 1),
        'cccRanges': len(ccc),
        'cccCodePoints': sum(b - a + 1 for a, b, _ in ccc),
        'lower': len(lower),
        'lowerMulti': sum(1 for _, v in lower if len(v) > 1),
        'caseIgnorableRanges': len(ign),
        'caseIgnorableCodePoints': sum(b - a + 1 for a, b in ign),
        'casedNotIgnorableRanges': len(cas),
        'casedNotIgnorableCodePoints': sum(b - a + 1 for a, b in cas),
        'whitespace': len(ws),
    }
    return table, counts


def exactness(table):
    """The table alone must give str.lower and NFD on every code point (as S6's prototype did): 0 mismatches."""
    dec = {cp: v for cp, v in table['decomp']}
    low = {cp: v for cp, v in table['lower']}
    ccc = {}
    for a, b, v in table['ccc']:
        for cp in range(a, b + 1):
            ccc[cp] = v
    h = table['hangul']
    n_count = h['vCount'] * h['tCount']

    def nfd(cp, out):
        s = cp - h['sBase']
        if 0 <= s < h['lCount'] * n_count:
            out.append(h['lBase'] + s // n_count)
            out.append(h['vBase'] + (s % n_count) // h['tCount'])
            if s % h['tCount']:
                out.append(h['tBase'] + s % h['tCount'])
        elif cp in dec:
            for x in dec[cp]:
                nfd(x, out)
        else:
            out.append(cp)
    bad = 0
    for cp in NONSUR:
        c = chr(cp)
        out = []
        nfd(cp, out)
        # one code point's full decomposition: reorder its marks stably by class (only marks can need it)
        i = 0
        while i < len(out):
            if ccc.get(out[i], 0) == 0:
                i += 1
                continue
            j = i
            while j < len(out) and ccc.get(out[j], 0) != 0:
                j += 1
            out[i:j] = sorted(out[i:j], key=lambda x: ccc[x])
            i = j
        if out != [ord(x) for x in unicodedata.normalize('NFD', c)]:
            bad += 1
        if (c.lower() if cp != 0x3A3 else 'σ') != ''.join(chr(x) for x in low.get(cp, [cp])):
            bad += 1
    return bad


def serialise(table):
    return (json.dumps(table, separators=(',', ':'), ensure_ascii=True) + '\n').encode('ascii')


def meta_for(blob, counts):
    return {
        'file': 'unicode_15_1_v1.json',
        'unicode': VERSION,
        'bytes': len(blob),
        'sha256': hashlib.sha256(blob).hexdigest(),
        'counts': counts,
        'licence': 'Unicode License v3 (LICENSE-UNICODE.txt)',
        'generatedWith': 'CPython %s (unicodedata %s)' % (platform.python_version(), unicodedata.unidata_version),
    }


def main():
    check = '--check' in sys.argv[1:]
    table, counts = build()
    blob = serialise(table)
    digest = hashlib.sha256(blob).hexdigest()
    if check:
        if not os.path.exists(TABLE):
            print('MISMATCH: no committed %s' % os.path.basename(TABLE), file=sys.stderr)
            return 1
        committed = open(TABLE, 'rb').read()
        meta = json.load(open(META)) if os.path.exists(META) else {}
        ok = (committed == blob and hashlib.sha256(committed).hexdigest() == digest
              and meta.get('sha256') == digest and meta.get('bytes') == len(blob) and meta.get('counts') == counts)
        if ok:
            print('unicode_15_1_v1.json matches unicodedata %s: %d B, sha256 %s' % (VERSION, len(blob), digest))
            return 0
        print('MISMATCH: rebuilt %d B sha256 %s; committed %d B sha256 %s; meta %s' % (
            len(blob), digest, len(committed), hashlib.sha256(committed).hexdigest(), meta.get('sha256')),
            file=sys.stderr)
        return 1
    bad = exactness(table)
    if bad:
        raise SystemExit('refused: the table reproduces str.lower / NFD with %d mismatches' % bad)
    with open(TABLE, 'wb') as f:
        f.write(blob)
    with open(META, 'w', encoding='ascii', newline='\n') as f:
        f.write(json.dumps(meta_for(blob, counts), indent=1) + '\n')
    print('wrote unicode_15_1_v1.json: %d B, sha256 %s; %s' % (len(blob), digest, json.dumps(counts)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
