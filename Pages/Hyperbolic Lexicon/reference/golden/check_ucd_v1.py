#!/usr/bin/env python3
"""Hyperbolic Lexicon: checks the pinned Unicode 15.1 table against the official Unicode Character Database 15.1.0.

    python3 -B -I "Pages/Hyperbolic Lexicon/reference/golden/check_ucd_v1.py"           fetch (once) and write the meta
    python3 -B -I "Pages/Hyperbolic Lexicon/reference/golden/check_ucd_v1.py" --check   compare the table with the UCD

golden/unicode_15_1_v1.json was exported from CPython 3.13's unicodedata (make_unicode_v1.py), not read from the UCD
itself. This script reads the UCD's own files, as released in unicode-org's unicodetools repository
(unicodetools/data/ucd/15.1.0/), at one pinned commit:
    UnicodeData.txt            general categories, canonical decompositions, combining classes, simple lowercase,
                               bidi classes (for str.isspace's rule), the Hangul syllable range and jamo names
    SpecialCasing.txt          full lowercase mappings (unconditional entries only, as CPython's str.lower)
    DerivedCoreProperties.txt  Cased and Case_Ignorable
    DerivedAge.txt             only to show which version UnicodeData.txt is: UnicodeData.txt has no header, so
                               its code points must be exactly DerivedAge's assigned ones up to 15.1, noncharacters
                               aside (DerivedAge gives those an age; UnicodeData does not list them)
The three other files must say 15.1.0 on their first line.

Without --check: fetches the files with curl into the cache (CACHE/ucd-15.1.0/<file>, the same CACHE as
lexicon.CACHE, outside git) and writes golden/ucd_15_1_v1.meta.json with the commit, each file's URL, size,
SHA-256 and header line. The commit is unicodetools' main branch head when no meta exists yet (git ls-remote);
otherwise the meta's commit is kept, so a rerun never moves the pin, and a cached file that disagrees is refused.

--check: verifies the table's bytes against unicode_15_1_v1.meta.json, fetches any file not cached (at the pinned
commit) and refuses a file whose SHA-256 is not the pinned one, then rebuilds from the UCD every fact the table
holds and compares field by field:
    gc                 the category of every code point 0..10FFFF (UnicodeData's First/Last ranges expanded,
                       unlisted code points Cn), and the run list itself
    decomp             canonical single-step decompositions (decomposition fields without a <tag>), Hangul
                       syllables excluded as the table excludes them
    ccc                non-zero canonical combining classes, per code point and as runs
    lower              full lowercase mappings: UnicodeData's simple lowercase, overridden by SpecialCasing's
                       unconditional entries (conditional ones, Final_Sigma and the language-specific ones, are
                       excluded as CPython's str.lower excludes them); entries equal to the code point are omitted
    caseIgnorable      Case_Ignorable (DerivedCoreProperties)
    casedNotIgnorable  Cased minus Case_Ignorable (DerivedCoreProperties)
    whitespace         str.isspace's rule on the UCD (category Zs or bidi class WS, B or S), kept as N_B step 3
                       keeps it: not a C category, not Zs, plus U+0020
    hangul             the syllable range from UnicodeData's First/Last pair and the jamo bases by name
    unicode            '15.1.0', the version the headers state
Exit 0 when every field is equal, 1 when any differs (every difference class is printed with its count and
examples) or a file is not the pinned one, 2 "skipped" when a file is neither cached nor fetchable.
Nothing downloaded is executed: every file is read as UTF-8 text and parsed by the functions below.
The data is the Unicode Character Database's (Unicode License v3, LICENSE-UNICODE.txt). Runtime: about 1 s once cached.
"""
import collections
import hashlib
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TABLE = os.path.join(HERE, 'unicode_15_1_v1.json')
TABLE_META = os.path.join(HERE, 'unicode_15_1_v1.meta.json')
META = os.path.join(HERE, 'ucd_15_1_v1.meta.json')
VERSION = '15.1.0'
REPO = 'https://github.com/unicode-org/unicodetools'
RAW = 'https://raw.githubusercontent.com/unicode-org/unicodetools/{commit}/unicodetools/data/ucd/15.1.0/{file}'
# The same cache rule as lexicon.CACHE (this script imports nothing from the reference, so it runs under -I).
CACHE = os.environ.get('HL_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'hyperbolic-lexicon')
CACHE_DIR = os.path.join(CACHE, 'ucd-15.1.0')
FILES = ('UnicodeData.txt', 'SpecialCasing.txt', 'DerivedCoreProperties.txt', 'DerivedAge.txt')
HEADERS = {'UnicodeData.txt': None, 'SpecialCasing.txt': '# SpecialCasing-15.1.0.txt',
           'DerivedCoreProperties.txt': '# DerivedCoreProperties-15.1.0.txt',
           'DerivedAge.txt': '# DerivedAge-15.1.0.txt'}
N = 0x110000
HANGUL_COUNT = 11172
EXAMPLES = 5


class Skip(Exception):
    """A file is neither cached nor fetchable."""


class Refused(Exception):
    """A file is not the pinned one, or not what this script can read."""


# ---------------------------------------------------------------------------------------------------- the parsers

def fields(text):
    """The data lines of a UCD file: comments and blank lines dropped, split on ';' and stripped."""
    for line in text.splitlines():
        line = line.split('#', 1)[0].strip()
        if line:
            yield [f.strip() for f in line.split(';')]


def cp_range(s):
    """'0041' or '0041..005A' -> (first, last)."""
    a, _, b = s.partition('..')
    return int(a, 16), int(b or a, 16)


def parse_unicodedata(text):
    """UnicodeData.txt -> [(first, last, fields)], a First/Last pair as one row (fields of the First line)."""
    rows, pending = [], None
    for line in text.splitlines():
        if not line.strip():
            continue
        f = line.split(';')
        if len(f) != 15:
            raise Refused('UnicodeData.txt: %d fields in %r' % (len(f), line))
        cp = int(f[0], 16)
        if f[1].endswith(', First>'):
            if pending is not None:
                raise Refused('UnicodeData.txt: First without Last at %s' % pending[1][0])
            pending = (cp, f)
            continue
        if f[1].endswith(', Last>'):
            if pending is None or pending[1][1][:-len('First>')] != f[1][:-len('Last>')] or pending[1][2:] != f[2:]:
                raise Refused('UnicodeData.txt: unpaired or unequal range line %r' % line)
            rows.append((pending[0], cp, pending[1]))
            pending = None
            continue
        if pending is not None:
            raise Refused('UnicodeData.txt: First without Last at %s' % pending[1][0])
        rows.append((cp, cp, f))
    if pending is not None:
        raise Refused('UnicodeData.txt: First without Last at the end')
    for (a0, b0, _), (a1, _, _) in zip(rows, rows[1:]):
        if not a0 <= b0 < a1:
            raise Refused('UnicodeData.txt: rows out of order at U+%04X' % a1)
    return rows


def parse_special_lower(text):
    """SpecialCasing.txt -> ({cp: lower} of the unconditional entries, {cp: [conditions]} of the conditional ones)."""
    lower, conditional = {}, collections.defaultdict(list)
    for f in fields(text):
        # code; lower; title; upper; (condition_list;)
        if f[-1] == '':
            f = f[:-1]
        if len(f) not in (4, 5):
            raise Refused('SpecialCasing.txt: %d fields in %r' % (len(f), f))
        cp = int(f[0], 16)
        if len(f) == 5 and f[4]:
            conditional[cp].append(f[4])
            continue
        if cp in lower:
            raise Refused('SpecialCasing.txt: two unconditional entries for U+%04X' % cp)
        lower[cp] = [int(x, 16) for x in f[1].split()]
    return lower, dict(conditional)


def parse_properties(text, wanted):
    """A property file (code ; Property) -> {property: set of code points} for the properties in wanted."""
    out = {p: set() for p in wanted}
    for f in fields(text):
        if f[1] in out:
            a, b = cp_range(f[0])
            out[f[1]].update(range(a, b + 1))
    return out


def parse_age(text):
    """DerivedAge.txt -> {cp: age string} of every code point it lists."""
    age = {}
    for f in fields(text):
        a, b = cp_range(f[0])
        for cp in range(a, b + 1):
            if cp in age:
                raise Refused('DerivedAge.txt: U+%04X listed twice' % cp)
            age[cp] = f[1]
    return age


def noncharacter(cp):
    return 0xFDD0 <= cp <= 0xFDEF or (cp & 0xFFFE) == 0xFFFE


def runs(values, keep=lambda v: True):
    """Maximal runs [start, end, value] of equal values over 0..len-1, only the runs whose value keep() accepts."""
    out, start = [], 0
    for cp in range(1, len(values) + 1):
        if cp == len(values) or values[cp] != values[start]:
            if keep(values[start]):
                out.append([start, cp - 1, values[start]])
            start = cp
    return out


def set_runs(s):
    """A set of code points as maximal runs [start, end]."""
    out = []
    for cp in sorted(s):
        if out and out[-1][1] == cp - 1:
            out[-1][1] = cp
        else:
            out.append([cp, cp])
    return out


# ---------------------------------------------------------------------------------------------------- the UCD's facts

def ucd_facts(texts):
    """Every fact the table holds, rebuilt from the UCD's own files: a dict with the table's keys."""
    for name, want in HEADERS.items():
        first = texts[name].split('\n', 1)[0].strip()
        if want is not None and first != want:
            raise Refused('%s: header %r, expected %r' % (name, first, want))
    rows = parse_unicodedata(texts['UnicodeData.txt'])
    hangul = [r for r in rows if r[2][1] == '<Hangul Syllable, First>']
    if len(hangul) != 1:
        raise Refused('UnicodeData.txt: %d Hangul syllable ranges' % len(hangul))
    s_lo, s_hi = hangul[0][0], hangul[0][1]

    gc, ccc, bidi = ['Cn'] * N, [0] * N, [None] * N
    decomp, lower, listed = {}, {}, set()
    hangul_decomp_skipped = 0
    for a, b, f in rows:
        cat, cls, d, low = f[2], int(f[3]), f[5], f[13]
        for cp in range(a, b + 1):
            gc[cp], ccc[cp], bidi[cp] = cat, cls, f[4]
        listed.update(range(a, b + 1))
        if d and not d.startswith('<'):
            if a != b:
                raise Refused('UnicodeData.txt: a decomposition on the range at U+%04X' % a)
            if s_lo <= a <= s_hi:
                hangul_decomp_skipped += 1
            else:
                decomp[a] = [int(x, 16) for x in d.split()]
        if low:
            if a != b:
                raise Refused('UnicodeData.txt: a lowercase mapping on the range at U+%04X' % a)
            lower[a] = [int(low, 16)]
    special, conditional = parse_special_lower(texts['SpecialCasing.txt'])
    lower.update(special)
    lower = {cp: v for cp, v in lower.items() if v != [cp]}

    props = parse_properties(texts['DerivedCoreProperties.txt'], ('Cased', 'Case_Ignorable'))
    ign, cased = props['Case_Ignorable'], props['Cased']

    # str.isspace (CPython's documented rule on the UCD), then N_B step 3's survivors as make_unicode_v1.py takes them
    space = {cp for cp in range(N) if gc[cp] == 'Zs' or bidi[cp] in ('WS', 'B', 'S')}
    ws = sorted({0x20} | {cp for cp in space if not gc[cp].startswith('C') and gc[cp] != 'Zs'})

    names = {a: f[1] for a, b, f in rows if a == b}

    def jamo_base(first_name, last_name, count, offset=0):
        bases = [cp for cp, n in names.items() if n == first_name]
        if len(bases) != 1 or names.get(bases[0] + count - 1) != last_name:
            raise Refused('UnicodeData.txt: the jamo %s..%s are not %d consecutive code points'
                          % (first_name, last_name, count))
        return bases[0] - offset
    l_base = jamo_base('HANGUL CHOSEONG KIYEOK', 'HANGUL CHOSEONG HIEUH', 19)
    v_base = jamo_base('HANGUL JUNGSEONG A', 'HANGUL JUNGSEONG I', 21)
    t_base = jamo_base('HANGUL JONGSEONG KIYEOK', 'HANGUL JONGSEONG HIEUH', 27, offset=1)
    if s_hi - s_lo + 1 != 19 * 21 * 28 or s_hi - s_lo + 1 != HANGUL_COUNT:
        raise Refused('UnicodeData.txt: the Hangul syllable range has %d code points' % (s_hi - s_lo + 1))

    # UnicodeData.txt has no header: its code points must be DerivedAge 15.1's assigned ones, noncharacters aside
    age = parse_age(texts['DerivedAge.txt'])
    ages = sorted({tuple(int(x) for x in v.split('.')) for v in age.values()})
    assigned = {cp for cp in age if not noncharacter(cp)}
    nonchars = sorted(cp for cp in age if noncharacter(cp))
    if ages[-1] != (15, 1) or listed != assigned or len(nonchars) != 66:
        raise Refused('UnicodeData.txt is not the 15.1.0 repertoire: DerivedAge goes up to %s; %d code points only '
                      'in UnicodeData, %d only in DerivedAge (noncharacters aside); %d noncharacters' % (
                          '.'.join(map(str, ages[-1])), len(listed - assigned), len(assigned - listed), len(nonchars)))

    facts = {
        'unicode': VERSION,
        'gc': gc,
        'decomp': decomp,
        'ccc': ccc,
        'lower': lower,
        'caseIgnorable': ign,
        'casedNotIgnorable': cased - ign,
        'whitespace': ws,
        'hangul': {'sBase': s_lo, 'lBase': l_base, 'vBase': v_base, 'tBase': t_base,
                   'lCount': 19, 'vCount': 21, 'tCount': 28},
    }
    info = {
        'listed': len(listed),
        'cn': gc.count('Cn'),
        'decomp': len(decomp),
        'hangulDecompSkipped': hangul_decomp_skipped,
        'lower': len(lower),
        'specialUnconditional': len(special),
        'specialConditionalExcluded': sum(len(v) for v in conditional.values()),
        'cased': len(cased),
        'caseIgnorable': len(ign),
        'casedAndIgnorable': len(cased & ign),
        'derivedAgeAssigned': len(age),
        'noncharacters': len(nonchars),
    }
    return facts, info


# ---------------------------------------------------------------------------------------------------- the comparison

def expand(rs, default):
    out = [default] * N
    for a, b, v in rs:
        for cp in range(a, b + 1):
            out[cp] = v
    return out


def expand_set(rs):
    out = set()
    for a, b in rs:
        out.update(range(a, b + 1))
    return out


def u(cp):
    return 'U+%04X' % cp


def diff_per_cp(table, ucd, fmt=str):
    """Per-code-point differences of two arrays -> {class: (count, examples)}, a class being 'table X, UCD Y'."""
    classes = collections.OrderedDict()
    for cp in range(N):
        if table[cp] != ucd[cp]:
            key = 'table %s, UCD %s' % (fmt(table[cp]), fmt(ucd[cp]))
            n, ex = classes.get(key, (0, []))
            if len(ex) < EXAMPLES:
                ex.append(u(cp))
            classes[key] = (n + 1, ex)
    return classes


def diff_maps(table, ucd):
    """Differences of two {cp: [cp...]} maps -> {class: (count, examples)}."""
    classes = collections.OrderedDict()

    def add(key, example):
        n, ex = classes.get(key, (0, []))
        if len(ex) < EXAMPLES:
            ex.append(example)
        classes[key] = (n + 1, ex)

    def seq(v):
        return ' '.join('%04X' % x for x in v)
    for cp in sorted(set(table) | set(ucd)):
        if cp not in ucd:
            add('only in the table', '%s -> %s' % (u(cp), seq(table[cp])))
        elif cp not in table:
            add('only in the UCD', '%s -> %s' % (u(cp), seq(ucd[cp])))
        elif table[cp] != ucd[cp]:
            add('different mapping', '%s: table %s, UCD %s' % (u(cp), seq(table[cp]), seq(ucd[cp])))
    return classes


def diff_sets(table, ucd, gc):
    """Differences of two code point sets -> {class: (count, examples)}, split by general category (the UCD's)."""
    classes = collections.OrderedDict()
    for side, s in (('only in the table', table - ucd), ('only in the UCD', ucd - table)):
        for cp in sorted(s):
            key = '%s (gc %s)' % (side, gc[cp])
            n, ex = classes.get(key, (0, []))
            if len(ex) < EXAMPLES:
                ex.append(u(cp))
            classes[key] = (n + 1, ex)
    return classes


def compare(table, facts):
    """Field by field: {field: {class: (count, examples)}}, an empty dict for an equal field."""
    out = collections.OrderedDict()
    out['unicode'] = {} if table['unicode'] == facts['unicode'] else {
        'table %s, UCD %s' % (table['unicode'], facts['unicode']): (1, [])}

    gc_t = expand(table['gc'], None)
    d = diff_per_cp(gc_t, facts['gc'])
    if not d and table['gc'] != runs(facts['gc']):
        d['the run list is not the maximal runs of the UCD categories'] = (1, [])
    out['gc'] = d

    dec_t = {cp: v for cp, v in table['decomp']}
    d = diff_maps(dec_t, facts['decomp'])
    if len(dec_t) != len(table['decomp']) or [cp for cp, _ in table['decomp']] != sorted(dec_t):
        d['duplicate or unsorted entries in the table'] = (1, [])
    out['decomp'] = d

    ccc_t = expand(table['ccc'], 0)
    d = diff_per_cp(ccc_t, facts['ccc'])
    if not d and table['ccc'] != runs(facts['ccc'], keep=lambda v: v != 0):
        d['the run list is not the maximal non-zero runs of the UCD classes'] = (1, [])
    out['ccc'] = d

    low_t = {cp: v for cp, v in table['lower']}
    d = diff_maps(low_t, facts['lower'])
    if len(low_t) != len(table['lower']) or [cp for cp, _ in table['lower']] != sorted(low_t):
        d['duplicate or unsorted entries in the table'] = (1, [])
    out['lower'] = d

    for key in ('caseIgnorable', 'casedNotIgnorable'):
        d = diff_sets(expand_set(table[key]), facts[key], facts['gc'])
        if not d and table[key] != set_runs(facts[key]):
            d['the run list is not the maximal runs of the UCD set'] = (1, [])
        out[key] = d

    out['whitespace'] = {} if table['whitespace'] == facts['whitespace'] else {
        'table %s, UCD %s' % (table['whitespace'], facts['whitespace']): (1, [])}
    out['hangul'] = collections.OrderedDict(
        ('%s: table %s, UCD %s' % (k, table['hangul'].get(k), v), (1, []))
        for k, v in facts['hangul'].items() if table['hangul'].get(k) != v)
    if set(table['hangul']) != set(facts['hangul']):
        out['hangul']['other keys in the table'] = (1, sorted(set(table['hangul']) - set(facts['hangul'])))
    return out


# ---------------------------------------------------------------------------------------------------- files and pins

def sha256(blob):
    return hashlib.sha256(blob).hexdigest()


def load_table():
    """The committed table, refused unless its bytes are the ones unicode_15_1_v1.meta.json pins."""
    blob = open(TABLE, 'rb').read()
    meta = json.load(open(TABLE_META))
    if sha256(blob) != meta['sha256'] or len(blob) != meta['bytes']:
        raise Refused('%s: sha256 %s (%d B) is not the pinned %s (%d B)' % (
            os.path.basename(TABLE), sha256(blob), len(blob), meta['sha256'], meta['bytes']))
    return json.loads(blob.decode('ascii')), meta['sha256']


def head_commit():
    out = subprocess.run(['git', 'ls-remote', REPO, 'refs/heads/main'], capture_output=True, text=True, timeout=120)
    if out.returncode != 0 or not out.stdout.strip():
        raise Skip('cannot resolve %s main: %s' % (REPO, out.stderr.strip() or 'no answer'))
    commit = out.stdout.split()[0]
    if not (len(commit) == 40 and all(c in '0123456789abcdef' for c in commit)):
        raise Refused('unexpected commit %r' % commit)
    return commit


def fetch(name, commit, pinned=None):
    """The file's bytes from the cache, fetched with curl first when missing. Refused unless the SHA-256 is pinned."""
    path = os.path.join(CACHE_DIR, name)
    if not os.path.exists(path):
        os.makedirs(CACHE_DIR, exist_ok=True)
        tmp = path + '.part'
        out = subprocess.run(['curl', '-sS', '--fail', '-L', '--connect-timeout', '20', '--max-time', '300',
                              '-o', tmp, RAW.format(commit=commit, file=name)], capture_output=True, text=True)
        if out.returncode != 0:
            if os.path.exists(tmp):
                os.remove(tmp)
            raise Skip('%s is not cached at %s and cannot be fetched: %s' % (name, path, out.stderr.strip()))
        blob = open(tmp, 'rb').read()
        if pinned is not None and sha256(blob) != pinned:
            os.remove(tmp)
            raise Refused('%s fetched at %s has sha256 %s, not the pinned %s' % (name, commit, sha256(blob), pinned))
        os.replace(tmp, path)
    blob = open(path, 'rb').read()
    if pinned is not None and sha256(blob) != pinned:
        raise Refused('cached %s has sha256 %s, not the pinned %s (delete it to refetch)'
                      % (path, sha256(blob), pinned))
    return blob


def describe(blobs, commit, table_sha):
    files = collections.OrderedDict()
    for name in FILES:
        blob = blobs[name]
        files[name] = {
            'url': RAW.format(commit=commit, file=name),
            'bytes': len(blob),
            'sha256': sha256(blob),
            'header': blob.decode('utf-8').split('\n', 1)[0].strip() if HEADERS[name] else None,
        }
    return {
        'name': 'Unicode Character Database 15.1.0 (unicode-org/unicodetools)',
        'unicode': VERSION,
        'repository': REPO,
        'commit': commit,
        'path': 'unicodetools/data/ucd/15.1.0/',
        'cachePath': 'ucd-15.1.0/<file> (under lexicon.CACHE)',
        'files': files,
        'checks': {'table': 'unicode_15_1_v1.json', 'tableSha256': table_sha},
        'note': 'UnicodeData.txt has no header line; check_ucd_v1.py shows it is 15.1.0 from DerivedAge.txt',
        'licence': 'Unicode License v3 (LICENSE-UNICODE.txt)',
    }


def report(result):
    bad = 0
    for field, classes in result.items():
        if not classes:
            print('  %-18s equal' % field)
            continue
        total = sum(n for n, _ in classes.values())
        bad += total
        print('  %-18s DIFFERENT: %d in %d class%s' % (field, total, len(classes), '' if len(classes) == 1 else 'es'))
        for key, (n, ex) in classes.items():
            print('      %6d  %s%s' % (n, key, (': ' + ', '.join(ex) + (', ...' if n > len(ex) else '')) if ex else ''))
    return bad


def main(argv):
    check = '--check' in argv
    old = json.load(open(META)) if os.path.exists(META) else None
    try:
        table, table_sha = load_table()
        if check and old is None:
            raise Refused('no %s: run without --check to pin the files' % os.path.basename(META))
        commit = old['commit'] if old else head_commit()
        blobs = {name: fetch(name, commit, old['files'][name]['sha256'] if old else None) for name in FILES}
        meta = describe(blobs, commit, table_sha)
        texts = {name: blob.decode('utf-8') for name, blob in blobs.items()}
        facts, info = ucd_facts(texts)
    except Skip as e:
        print('skipped: %s' % e, file=sys.stderr)
        return 2
    except Refused as e:
        print('MISMATCH: %s' % e, file=sys.stderr)
        return 1
    if old is not None and old != meta:
        print('MISMATCH: the cached files or the table disagree with %s: %s' % (os.path.basename(META),
                                                                               json.dumps(meta)), file=sys.stderr)
        return 1
    if not check:
        with open(META, 'w', encoding='ascii', newline='\n') as f:
            f.write(json.dumps(meta, indent=1) + '\n')
        print('wrote %s: unicodetools@%s, %s' % (os.path.basename(META), commit, ', '.join(
            '%s %s' % (n, meta['files'][n]['sha256'][:12]) for n in FILES)))
    print('UCD 15.1.0 at unicodetools@%s: %s' % (commit[:12], json.dumps(info)))
    print('unicode_15_1_v1.json (sha256 %s) against the UCD, field by field:' % table_sha[:12])
    bad = report(compare(table, facts))
    if bad:
        print('MISMATCH: unicode_15_1_v1.json differs from the UCD 15.1.0 files in %d facts' % bad, file=sys.stderr)
        return 1
    print('unicode_15_1_v1.json equals the UCD 15.1.0 files (unicodetools@%s) in every field' % commit[:12])
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
