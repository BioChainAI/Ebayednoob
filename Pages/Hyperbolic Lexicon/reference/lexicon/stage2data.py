"""Stage 2's pinned data and its readers (Amendment 13 items 2, 3, 8, 9 and 14).

    store = Store()                    the pinned files, ~/.cache/hyperbolic-lexicon/stage2/<name>/<file> (pins in
                                       golden/stage2_pins_v1.json); Store(root, pins, verify) for synthetic copies
    store.bytes(key)                   a file or zip member, refused unless its size and SHA-256 are the pinned ones
    store.stream(key)                  the same as a binary stream that refuses at its end (GloVe's 1 GB member)
    check_pins(pins, root)             every pin, archive members and the HiT API MD5 included (make_stage2_v1.py)

Word readers (pass 1, A13.8): only row numbers, words, POS, MEN tags and folds. Rows are numbered 0, 1, ... over the
data rows after any header line, in file order; bytes are decoded as strict UTF-8 and a line's final CR is removed.
    hyperlex_words(key)          (row, WORD1, WORD2, POS)              key: hyperlex-all, hyperlex-nouns
    hyperlex_split_words()       (row, WORD1, WORD2, POS, 'test')      the random split's test file
    hyperlex_rnd_words()         (row, word1, word2, pos, fold)        the suite's hyperlex_rnd.tsv
    suite_words(name)            (row, word1, word2, fold or None)     bless wbless leds eval shwartz bibless
    simlex_words()               (row, word1, word2, POS)
    men_words()                  (row, word1, tag1, word2, tag2)       tag = the last two characters
    ws353_words(key)             (row, w1, w2)                         ws353-rel, ws353-sim, ws353-combined
    (HiT's names are read by hit.py and GloVe's words and vectors by glove.py.)
Gold readers (pass 2): ratings, labels, relations and TYPE. They refuse until open_gold() is called (pass 2's start);
pass-1 code imports none of the names in GOLD_READERS.
    hyperlex_gold(key)           (row, TYPE, AVG_SCORE, AVG_SCORE_0_10) as exact Fractions of the decimal text
    hyperlex_split_gold()        the same for the random split's test file
    hyperlex_rnd_gold()          (row, label, score)
    suite_gold(name)             (row, label): True/False, or 1/0/-1 for bibless
    suite_relations(name)        (row, relation): wbless, eval, bibless
    simlex_gold(), men_gold(), ws353_gold(key)     (row, score)
    raw_lines(key)               the data lines as text (full-line equality checks)
Count checks (A13.9, positive controls): count_checks_words(wn) before pass 1, count_checks_gold(wn) at pass 2's start;
COUNTS_WORDS and COUNTS_GOLD hold the registered values, check_counts compares (CountMismatch stops the run).
The protocol pin (A13.14): protocol_text() is Amendment 10 then Amendment 13 of PREREGISTRATION.md, protocol_sha()
refuses golden/stage2_protocol_v1.txt unless it has the pinned PROTOCOL_SHA.
"""
import contextlib
import hashlib
import io
import json
import os
import re
import zipfile
from collections import Counter
from fractions import Fraction

from . import CACHE, GOLDEN, SYSTEM

STAGE2 = os.path.join(CACHE, 'stage2')
PINS_FILE = os.path.join(GOLDEN, 'stage2_pins_v1.json')
PREREGISTRATION = os.path.join(SYSTEM, 'PREREGISTRATION.md')
PROTOCOL_FILE = os.path.join(GOLDEN, 'stage2_protocol_v1.txt')
PROTOCOL_SHA = '1c96a4b8d562634ef9e28a3be77221490b3bbce6a7821d7546521ea3c2a18d88'

# key -> (pin name, archive member or None)
SOURCES = {
    'hyperlex-all': ('hyperlex', 'hyperlex-all.txt'),
    'hyperlex-nouns': ('hyperlex', 'nouns-verbs/hyperlex-nouns.txt'),
    'hyperlex-test-random': ('hyperlex', 'splits/random/hyperlex_test_all_random.txt'),
    'bless': ('suite-bless', None),
    'wbless': ('suite-wbless', None),
    'leds': ('suite-leds', None),
    'eval': ('suite-eval', None),
    'shwartz': ('suite-shwartz', None),
    'bibless': ('suite-bibless', None),
    'hyperlex_rnd': ('suite-hyperlex_rnd', None),
    'evalution-val': ('evalution-val', None),
    'evalution-test': ('evalution-test', None),
    'hit-train': ('hit-multi', 'wordnet-multi/train.jsonl'),
    'hit-val': ('hit-multi', 'wordnet-multi/val.jsonl'),
    'hit-test': ('hit-multi', 'wordnet-multi/test.jsonl'),
    'hit-lexicon': ('hit-multi', 'wordnet-multi/entity_lexicon.json'),
    'simlex': ('simlex', None),
    'ws353-combined': ('ws353-combined', None),
    'ws353-rel': ('ws353-rel', None),
    'ws353-sim': ('ws353-sim', None),
    'men': ('men', None),
    'men-licence': ('men-licence', None),
    'glove-300': ('glove-6b', 'glove.6B.300d.txt'),
    'glove-50': ('glove-6b', 'glove.6B.50d.txt'),
}

HL_HEADER = 'WORD1 WORD2 POS TYPE AVG_SCORE AVG_SCORE_0_10 STD SCORES..'
HL_RND_HEADER = ('word1', 'word2', 'pos', 'label', 'score', 'fold')
SUITE_HEADERS = {
    'bless': ('word1', 'word2', 'label', 'fold'),
    'wbless': ('word1', 'word2', 'label', 'relation', 'fold'),
    'leds': ('word1', 'word2', 'label', 'fold'),
    'eval': ('word1', 'word2', 'label', 'relation', 'fold'),
    'shwartz': ('word1', 'word2', 'label', 'fold'),
    'bibless': ('word1', 'word2', 'relation', 'label'),
}
SIMLEX_HEADER = ('word1', 'word2', 'POS', 'SimLex999', 'conc(w1)', 'conc(w2)', 'concQ', 'Assoc(USF)', 'SimAssoc333',
                 'SD(SimLex)')
WS353_COMBINED_HEADER = ('Word 1', 'Word 2', 'Human (mean)')
MEN_TAGS = ('-n', '-v', '-j')
FOLDS = ('val', 'test')
# READING (A13.3, spec section 3): a rating is "an exact decimal": an optional minus sign, digits, an optional
# fraction and an optional exponent, read by Fraction(text); anything else (NaN, a leading +, spaces) is refused.
DECIMAL = re.compile(r'-?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?')

WORD_READERS = ('hyperlex_words', 'hyperlex_split_words', 'hyperlex_rnd_words', 'suite_words', 'simlex_words',
                'men_words', 'ws353_words', 'count_checks_words')
GOLD_READERS = ('hyperlex_gold', 'hyperlex_split_gold', 'hyperlex_rnd_gold', 'suite_gold', 'suite_relations',
                'simlex_gold', 'men_gold', 'ws353_gold', 'raw_lines', 'count_checks_gold', 'eval_equals_upstream',
                'dry_counts_gold', 'random_split_agrees', 'open_gold')


class PinError(ValueError):
    """A pinned file or member is missing, or its size or digest differs from the pin."""


class ParseError(ValueError):
    """A pinned file does not have the registered format."""


class GoldSealed(RuntimeError):
    """A gold reader was called before pass 2 (A13.8)."""


class CountMismatch(ValueError):
    """A count check of A13.9 failed: the run stops with no result."""


# ================================================================ pins
def load_pins(path=PINS_FILE):
    with open(path, encoding='utf-8') as fh:
        pins = json.load(fh)
    names = [p['name'] for p in pins['files']]
    if len(set(names)) != len(names):
        raise PinError('repeated pin names')
    return pins


def sha256_file(path, chunk=1 << 20):
    h, n = hashlib.sha256(), 0
    with open(path, 'rb') as fh:
        for block in iter(lambda: fh.read(chunk), b''):
            h.update(block)
            n += len(block)
    return h.hexdigest(), n


def _member_digest(z, path, chunk=1 << 20):
    h, n = hashlib.sha256(), 0
    with z.open(path) as fh:
        for block in iter(lambda: fh.read(chunk), b''):
            h.update(block)
            n += len(block)
    return h.hexdigest(), n


def check_pin(pin, root):
    """Problems with one pinned file under root/<name>/<file> (an empty list when it is the pinned file): size,
    SHA-256, MD5 when pinned, and each member's presence, size and SHA-256, streamed out of the zip."""
    path = os.path.join(root, pin['name'], pin['file'])
    if not os.path.isfile(path):
        return [f'{pin["name"]}: missing {path}']
    out = []
    size = os.path.getsize(path)
    if size != pin['bytes']:
        out.append(f'{pin["name"]}: {size} B, pinned {pin["bytes"]} B')
    digest, _ = sha256_file(path)
    if digest != pin['sha256']:
        out.append(f'{pin["name"]}: SHA-256 {digest}, pinned {pin["sha256"]}')
    if 'md5' in pin:
        h = hashlib.md5()
        with open(path, 'rb') as fh:
            for block in iter(lambda: fh.read(1 << 20), b''):
                h.update(block)
        if h.hexdigest() != pin['md5']:
            out.append(f'{pin["name"]}: MD5 {h.hexdigest()}, pinned {pin["md5"]}')
    if pin.get('members'):
        try:
            z = zipfile.ZipFile(path)
        except zipfile.BadZipFile as e:
            return out + [f'{pin["name"]}: not a zip archive ({e})']
        with z:
            names = set(z.namelist())
            for m in pin['members']:
                if m['path'] not in names:
                    out.append(f'{pin["name"]}: no member {m["path"]}')
                    continue
                info = z.getinfo(m['path'])
                if info.file_size != m['bytes']:
                    out.append(f'{pin["name"]}:{m["path"]}: {info.file_size} B, pinned {m["bytes"]} B')
                    continue
                try:
                    d, n = _member_digest(z, m['path'])
                except (zipfile.BadZipFile, OSError, EOFError) as e:
                    out.append(f'{pin["name"]}:{m["path"]}: unreadable ({e})')
                    continue
                if n != m['bytes'] or d != m['sha256']:
                    out.append(f'{pin["name"]}:{m["path"]}: {n} B SHA-256 {d}, pinned {m["bytes"]} B {m["sha256"]}')
    return out


def check_pins(pins=None, root=None, names=None):
    """Every pin's problems, [] when all pass (make_stage2_v1.py --check refuses otherwise)."""
    pins = pins or load_pins()
    root = root or STAGE2
    out = []
    for pin in pins['files']:
        if names is None or pin['name'] in names:
            out += check_pin(pin, root)
    return out


class _HashingStream(io.RawIOBase):
    """Reads a stream through, hashing it; at its end refuses unless size and SHA-256 are the pinned ones."""

    def __init__(self, raw, nbytes, sha, label):
        self._raw, self._n, self._sha, self._label = raw, nbytes, sha, label
        self._h, self._seen, self._done = hashlib.sha256(), 0, False

    def readable(self):
        return True

    def readinto(self, b):
        data = self._raw.read(len(b))
        if not data:
            if not self._done:
                self._done = True
                if self._seen != self._n or self._h.hexdigest() != self._sha:
                    raise PinError(f'{self._label}: {self._seen} B SHA-256 {self._h.hexdigest()}, pinned '
                                   f'{self._n} B {self._sha}')
            return 0
        self._h.update(data)
        self._seen += len(data)
        b[:len(data)] = data
        return len(data)

    def close(self):
        self._raw.close()
        super().close()


class Store:
    """The pinned files under root (default ~/.cache/hyperbolic-lexicon/stage2). With verify=False (tests on
    poisoned copies only) sizes and digests are not checked."""

    def __init__(self, root=None, pins=None, verify=True):
        self.root = root or STAGE2
        self.pins = pins or load_pins()
        self.verify = verify
        self._by_name = {p['name']: p for p in self.pins['files']}

    def pin(self, key):
        name, member = SOURCES[key]
        filepin = self._by_name[name]
        if member is None:
            return filepin, None
        found = [m for m in filepin.get('members', []) if m['path'] == member]
        if len(found) != 1:
            raise PinError(f'{key}: member {member} is not pinned')
        return filepin, found[0]

    def sha256(self, key):
        """The pinned SHA-256 of the file or member (LBENCH/1's instanceSha)."""
        filepin, m = self.pin(key)
        return (m or filepin)['sha256']

    def path(self, key):
        filepin, _ = self.pin(key)
        return os.path.join(self.root, filepin['name'], filepin['file'])

    def bytes(self, key):
        filepin, m = self.pin(key)
        path = self.path(key)
        if not os.path.isfile(path):
            raise PinError(f'{key}: missing {path} (run golden/make_stage2_v1.py)')
        if m is None:
            with open(path, 'rb') as fh:
                data = fh.read()
            want = filepin
        else:
            with zipfile.ZipFile(path) as z:
                if m['path'] not in z.namelist():
                    raise PinError(f'{key}: no member {m["path"]} in {path}')
                if self.verify and z.getinfo(m['path']).file_size != m['bytes']:
                    raise PinError(f'{key}: member size differs from the pin')
                data = z.read(m['path'])
            want = m
        if self.verify and (len(data) != want['bytes'] or hashlib.sha256(data).hexdigest() != want['sha256']):
            raise PinError(f'{key}: {len(data)} B SHA-256 {hashlib.sha256(data).hexdigest()}, pinned '
                           f'{want["bytes"]} B {want["sha256"]}')
        return data

    @contextlib.contextmanager
    def stream(self, key):
        """A binary stream over the file or member; with verify, reading it to its end checks size and digest."""
        filepin, m = self.pin(key)
        path = self.path(key)
        if not os.path.isfile(path):
            raise PinError(f'{key}: missing {path} (run golden/make_stage2_v1.py)')
        want = m or filepin
        if m is None:
            raw = open(path, 'rb')
            z = None
        else:
            z = zipfile.ZipFile(path)
            raw = z.open(m['path'])
        try:
            if self.verify:
                yield io.BufferedReader(_HashingStream(raw, want['bytes'], want['sha256'], key), 1 << 20)
            else:
                yield raw
        finally:
            raw.close()
            if z is not None:
                z.close()


_STORE = {}


def default_store():
    if 'store' not in _STORE:
        _STORE['store'] = Store()
    return _STORE['store']


def available(store=None):
    """True when every pinned file is present (sizes only; check_pins verifies the digests)."""
    store = store or default_store()
    return all(os.path.isfile(os.path.join(store.root, p['name'], p['file']))
               and os.path.getsize(os.path.join(store.root, p['name'], p['file'])) == p['bytes']
               for p in store.pins['files'])


# ================================================================ lines
def _lines(data, key):
    """Strict UTF-8; split on LF; the empty string after a final LF dropped; one final CR per line removed.
    READING (spec section 18, parsing corners): a byte-order mark and a blank line are refused (the pinned files
    have neither); trailing spaces are kept and refused by the field checks of each format."""
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError as e:
        raise ParseError(f'{key}: not UTF-8 ({e})')
    if text.startswith('﻿'):
        raise ParseError(f'{key}: byte-order mark')
    parts = text.split('\n')
    if parts and parts[-1] == '':
        parts.pop()
    out = []
    for i, line in enumerate(parts):
        if line.endswith('\r'):
            line = line[:-1]
        if line == '':
            raise ParseError(f'{key}: blank line {i}')
        out.append(line)
    return out


def _data_lines(store, key, header=None):
    """The data lines of a file; with header (a string, or a tuple of TSV field names), the first line must be it."""
    lines = _lines((store or default_store()).bytes(key), key)
    if header is None:
        return lines
    want = header if isinstance(header, str) else '\t'.join(header)
    if not lines or lines[0] != want:
        raise ParseError(f'{key}: header {lines[0]!r} is not {want!r}' if lines else f'{key}: empty')
    return lines[1:]


def _tsv(lines, n, key):
    out = []
    for r, line in enumerate(lines):
        f = line.split('\t')
        if len(f) != n:
            raise ParseError(f'{key}: row {r} has {len(f)} fields, not {n}')
        out.append(f)
    return out


def _word(w, key, r):
    if w == '' or w != w.strip():
        raise ParseError(f'{key}: row {r}: empty word or surrounding whitespace')
    return w


def _decimal(text, key, r):
    if not DECIMAL.fullmatch(text):
        raise ParseError(f'{key}: row {r}: {text!r} is not a decimal')
    return Fraction(text)


# ================================================================ the gold seal (A13.8)
_GOLD = {'open': False}


def open_gold():
    """Pass 2 starts: the gold readers may run from here on, in this process."""
    _GOLD['open'] = True


def close_gold():
    _GOLD['open'] = False


def gold_is_open():
    return _GOLD['open']


def _require_gold(name):
    if not _GOLD['open']:
        raise GoldSealed(f'{name} reads gold, labels, relations or TYPE: only pass 2 may call it (A13.8)')


# ================================================================ word readers (pass 1)
_HL_KEYS = ('hyperlex-all', 'hyperlex-nouns', 'hyperlex-test-random')


def _hl_fields(store, key):
    if key not in _HL_KEYS:
        raise KeyError(key)
    out = []
    for r, line in enumerate(_data_lines(store, key, HL_HEADER)):
        f = line.split(' ')
        if len(f) < 3:
            raise ParseError(f'{key}: row {r} has {len(f)} fields')
        out.append((r, f))
    return out


def hyperlex_words(key='hyperlex-all', store=None):
    """(row, WORD1, WORD2, POS) of hyperlex-all.txt or hyperlex-nouns.txt (split on single spaces, A13 spec 3)."""
    return [(r, _word(f[0], key, r), _word(f[1], key, r), _word(f[2], key, r)) for r, f in _hl_fields(store, key)]


def hyperlex_split_words(store=None):
    """(row, WORD1, WORD2, POS, 'test') of splits/random/hyperlex_test_all_random.txt.
    READING (spec section 3, column names): the split file has hyperlex-all.txt's header; its fold is the file's
    own, 'test'; its POS column selects the 541 nouns of the reported random-split test (A13.11)."""
    key = 'hyperlex-test-random'
    return [(r, _word(f[0], key, r), _word(f[1], key, r), _word(f[2], key, r), 'test')
            for r, f in _hl_fields(store, key)]


def hyperlex_rnd_words(store=None):
    """(row, word1, word2, pos, fold) of the suite's hyperlex_rnd.tsv.
    READING (spec section 3, column names): the header is word1 word2 pos label score fold; label is HyperLex's
    TYPE and score its AVG_SCORE (gold, read only by hyperlex_rnd_gold)."""
    key = 'hyperlex_rnd'
    rows = _tsv(_data_lines(store, key, HL_RND_HEADER), len(HL_RND_HEADER), key)
    return [(r, _word(f[0], key, r), _word(f[1], key, r), f[2], f[5]) for r, f in enumerate(rows)]


def suite_words(name, store=None):
    """(row, word1, word2, fold) of the suite's bless, wbless, leds, eval or shwartz.tsv; fold None for bibless."""
    head = SUITE_HEADERS[name]
    rows = _tsv(_data_lines(store, name, head), len(head), name)
    fi = head.index('fold') if 'fold' in head else None
    out = []
    for r, f in enumerate(rows):
        fold = f[fi] if fi is not None else None
        if fold is not None and fold not in FOLDS:
            raise ParseError(f'{name}: row {r}: fold {fold!r}')
        out.append((r, _word(f[0], name, r), _word(f[1], name, r), fold))
    return out


def simlex_words(store=None):
    """(row, word1, word2, POS) of SimLex-999.txt (TSV, CRLF)."""
    key = 'simlex'
    rows = _tsv(_data_lines(store, key, SIMLEX_HEADER), len(SIMLEX_HEADER), key)
    return [(r, _word(f[0], key, r), _word(f[1], key, r), f[2]) for r, f in enumerate(rows)]


def men_words(store=None):
    """(row, word1, tag1, word2, tag2) of MEN_dataset_lemma_form_full: 'w1-t w2-t score', no header; a tag is the
    last two characters (-n, -v or -j), read and removed first (A13.3)."""
    key = 'men'
    out = []
    for r, line in enumerate(_data_lines(store, key)):
        f = line.split(' ')
        if len(f) != 3:
            raise ParseError(f'{key}: row {r} has {len(f)} fields')
        a, b = f[0], f[1]
        if len(a) < 3 or len(b) < 3 or a[-2:] not in MEN_TAGS or b[-2:] not in MEN_TAGS:
            raise ParseError(f'{key}: row {r}: no tag')
        out.append((r, _word(a[:-2], key, r), a[-2:], _word(b[:-2], key, r), b[-2:]))
    return out


def ws353_words(key='ws353-rel', store=None):
    """(row, w1, w2) of Agirre's relatedness or similarity file (TSV, no header) or combined.tab (TSV, header)."""
    if key not in ('ws353-rel', 'ws353-sim', 'ws353-combined'):
        raise KeyError(key)
    header = WS353_COMBINED_HEADER if key == 'ws353-combined' else None
    rows = _tsv(_data_lines(store, key, header), 3, key)
    return [(r, _word(f[0], key, r), _word(f[1], key, r)) for r, f in enumerate(rows)]


# ================================================================ gold readers (pass 2)
def hyperlex_gold(key='hyperlex-all', store=None):
    """(row, TYPE, AVG_SCORE, AVG_SCORE_0_10), the scores exact Fractions of their decimal text."""
    _require_gold('hyperlex_gold')
    out = []
    for r, f in _hl_fields(store, key):
        if len(f) < 7 or any(x == '' for x in f[:7]):
            raise ParseError(f'{key}: row {r}: fewer than 7 fields')
        out.append((r, f[3], _decimal(f[4], key, r), _decimal(f[5], key, r)))
    return out


def hyperlex_split_gold(store=None):
    _require_gold('hyperlex_split_gold')
    return hyperlex_gold('hyperlex-test-random', store)


def hyperlex_rnd_gold(store=None):
    """(row, label, score) of hyperlex_rnd.tsv."""
    _require_gold('hyperlex_rnd_gold')
    key = 'hyperlex_rnd'
    rows = _tsv(_data_lines(store, key, HL_RND_HEADER), len(HL_RND_HEADER), key)
    return [(r, f[3], _decimal(f[4], key, r)) for r, f in enumerate(rows)]


def suite_gold(name, store=None):
    """(row, label): True or False; for bibless 1, 0 or -1."""
    _require_gold('suite_gold')
    head = SUITE_HEADERS[name]
    rows = _tsv(_data_lines(store, name, head), len(head), name)
    li = head.index('label')
    out = []
    for r, f in enumerate(rows):
        v = f[li]
        if name == 'bibless':
            if v not in ('1', '0', '-1'):
                raise ParseError(f'{name}: row {r}: label {v!r}')
            out.append((r, int(v)))
        else:
            if v not in ('True', 'False'):
                raise ParseError(f'{name}: row {r}: label {v!r}')
            out.append((r, v == 'True'))
    return out


def suite_relations(name, store=None):
    """(row, relation) of wbless, eval or bibless."""
    _require_gold('suite_relations')
    head = SUITE_HEADERS[name]
    if 'relation' not in head:
        raise KeyError(f'{name} has no relation column')
    rows = _tsv(_data_lines(store, name, head), len(head), name)
    ri = head.index('relation')
    return [(r, f[ri]) for r, f in enumerate(rows)]


def simlex_gold(store=None):
    _require_gold('simlex_gold')
    key = 'simlex'
    rows = _tsv(_data_lines(store, key, SIMLEX_HEADER), len(SIMLEX_HEADER), key)
    return [(r, _decimal(f[3], key, r)) for r, f in enumerate(rows)]


def men_gold(store=None):
    _require_gold('men_gold')
    key = 'men'
    out = []
    for r, line in enumerate(_data_lines(store, key)):
        f = line.split(' ')
        if len(f) != 3:
            raise ParseError(f'{key}: row {r} has {len(f)} fields')
        out.append((r, _decimal(f[2], key, r)))
    return out


def ws353_gold(key='ws353-rel', store=None):
    _require_gold('ws353_gold')
    if key not in ('ws353-rel', 'ws353-sim', 'ws353-combined'):
        raise KeyError(key)
    header = WS353_COMBINED_HEADER if key == 'ws353-combined' else None
    rows = _tsv(_data_lines(store, key, header), 3, key)
    return [(r, _decimal(f[2], key, r)) for r, f in enumerate(rows)]


def raw_lines(key, store=None):
    """Every line of a text file (header included), for pass 2's full-line equality checks."""
    _require_gold('raw_lines')
    return _lines((store or default_store()).bytes(key), key)


# ================================================================ count checks (A13.9)
# Registered values, word-level (run before pass 1) and gold-level (labels, TYPE or ratings: run at pass 2's start).
# WordNet's U_@, E, T, roots, anchors and |NN| are checked by senses.check_at_graph, HiT's by hit.count_checks.
HL_TYPES = ('hyp-1', 'hyp-2', 'hyp-3', 'hyp-4', 'r-hyp-1', 'r-hyp-2', 'r-hyp-3', 'r-hyp-4', 'cohyp', 'mero', 'syn',
            'ant', 'no-rel')
COUNTS_WORDS = {
    'wn.index_noun.lemmas': 117798,
    'wn.index_noun.strata': (101863, 10257, 2989, 1178, 620, 306, 212, 94, 96, 183),
    'hl.rows': 2616,
    'hl.N': 2163,
    'hl.N_words_equal_nouns_file': True,
    'hl.covered_full': 2163,
    'hl.covered_at': 2153,
    'hl.both_monosemous': 93,
    'hl.word_types': 1843,
    'hl.reverse_rows': 464,
    'bd.rows': 14542,
    'bd.test': 13089,
    'bd.test_covered': 12365,
    'bd.concepts': 200,
    'bd.repeated_pairs': 6,
    'bd.self_pairs': 3,
    'wb.rows': 1668,
    'wb.test': 1501,
    'wb.test_covered': 1493,
    'wb.clusters': 192,
    'wb.no_concept': 0,
    'wb.two_concepts': 150,
    'leds.test': 2495,
    'leds.test_covered': 2495,
    'eval.rows': 13450,
    'eval.distinct_pairs': 6926,
    'shwartz.test': 47321,
    'shwartz.test_covered': 17073,
    'sl.rows': 999,
    'sl.N': 666,
    'sl.N_covered': 666,
    'sl.word_types': 751,
    'men.rows': 3000,
    'men.nn': 2005,
    'men.nn_covered': 2005,
    'men.word_types': 645,
    'wsr.rows': 252,
    'wsr.covered': 245,
    'wss.rows': 203,
    'wss.covered': 197,
    'ws.combined.rows': 353,
    'ws.combined.covered': 344,
    'ws.combined.distinct': 352,
    'ws.split_union_equals_combined': True,
    'ws.split_shared': 103,
}
COUNTS_GOLD = {
    'hl.N_lines_equal_nouns_file': True,
    'hl.type': {'hyp-1': 287, 'hyp-2': 241, 'hyp-3': 254, 'hyp-4': 222, 'r-hyp-1': 73, 'r-hyp-2': 53,
                'r-hyp-3': 60, 'r-hyp-4': 40, 'cohyp': 242, 'mero': 241, 'syn': 165, 'ant': 68, 'no-rel': 217},
    'hl.closure_forward': {'hyp-1': 286, 'hyp-2': 241, 'hyp-3': 254, 'hyp-4': 222},
    'hl.closure_reversed': {'r-hyp-1': 73, 'r-hyp-2': 53, 'r-hyp-3': 60, 'r-hyp-4': 40},
    'hl.spanning_forward': {'hyp-1': 281, 'hyp-2': 229, 'hyp-3': 233, 'hyp-4': 214},
    'bd.test_true': 1197,
    'bd.test_covered_true': 1194,
    'bd.true_covered_all_folds': 1334,
    'bd.true_closure': 1149,
    'bd.true_spanning': 1099,
    'wb.test_true': 764,
    'wb.test_covered_true': 764,
    'leds.test_true': 1250,
    'leds.true_all_folds': 1385,
    'leds.true_first_sense_closure': 1385,
    'eval.pairs_with_both_labels': 181,
    'eval.equals_upstream': True,
    'shwartz.test_true': 11780,
    'ws.split_scores_agree_with_combined': True,
}


def compare_counts(computed, expected):
    """[(name, expected, computed)] for every registered count that differs (or is missing)."""
    return [(k, v, computed.get(k)) for k, v in expected.items() if computed.get(k) != v]


def check_counts(computed, expected):
    bad = compare_counts(computed, expected)
    if bad:
        raise CountMismatch('count check failed: ' + '; '.join(f'{k}: registered {v}, found {g}' for k, v, g in bad))
    return computed


def _ns_pairs(rows):
    from .senses import N_S
    return [(N_S(x), N_S(y)) for x, y in rows]


def count_checks_words(wn, store=None):
    """The word-level counts of A13.9 (no gold, label, relation or TYPE field is read), as a dict keyed like
    COUNTS_WORDS. Coverage is item 3's: N_S, index.noun, U_full or U_@."""
    from . import senses
    store = store or default_store()
    c = {}
    idx = wn['index']['noun']
    strata = Counter(min(len(e.offsets), 10) for e in idx.values())
    c['wn.index_noun.lemmas'] = len(idx)
    c['wn.index_noun.strata'] = tuple(strata[k] for k in range(1, 11))
    U_full = senses.universe_full(wn)
    U_at = frozenset(senses.at_graph(wn).nodes)

    hl = hyperlex_words('hyperlex-all', store)
    hn = [r for r in hl if r[3] == 'N']
    c['hl.rows'], c['hl.N'] = len(hl), len(hn)
    nf = hyperlex_words('hyperlex-nouns', store)
    c['hl.N_words_equal_nouns_file'] = [r[1:] for r in hn] == [r[1:] for r in nf]
    pairs = [(r, x, y) for r, x, y, _ in hn]
    cov = senses.covered_rows(pairs, U_full, wn)
    c['hl.covered_full'] = len(cov)
    c['hl.covered_at'] = len(senses.covered_rows(pairs, U_at, wn))
    c['hl.both_monosemous'] = sum(1 for _, x, y in pairs
                                  if len(senses.senses(x, U_full, wn)) == 1 and len(senses.senses(y, U_full, wn)) == 1)
    covset = set(cov)
    c['hl.word_types'] = len(senses.word_types([(x, y) for r, x, y in pairs if r in covset]))
    ns = _ns_pairs([(x, y) for _, x, y in pairs])
    nsset = set(ns)
    # READING (A13.9, "464 rows whose reverse is a row"): a row (x, y) counts when (y, x), as N_S forms, is the pair
    # of some row of the set (a self-pair would count itself; HyperLex's nouns have none).
    c['hl.reverse_rows'] = sum(1 for x, y in ns if (y, x) in nsset)

    bless = suite_words('bless', store)
    c['bd.rows'] = len(bless)
    bt = [r for r in bless if r[3] == 'test']
    c['bd.test'] = len(bt)
    btc = set(senses.covered_rows([(r, x, y) for r, x, y, _ in bt], U_full, wn))
    btc_rows = [r for r in bt if r[0] in btc]
    c['bd.test_covered'] = len(btc_rows)
    c['bd.concepts'] = len({x for _, x, _, _ in btc_rows})
    # READING (A13.9, BD's "6 repeated pairs and 3 self-pairs"): pairs are compared as the raw word fields. As N_S
    # forms 17 pairs repeat (bless.tsv writes some words in two cases, which N_S merges); reported, not decided.
    pc = Counter((x, y) for _, x, y, _ in btc_rows)
    c['bd.repeated_pairs'] = sum(1 for v in pc.values() if v > 1)
    c['bd.self_pairs'] = sum(1 for _, x, y, _ in btc_rows if x == y)

    concepts = bless_concepts(store)
    wb = suite_words('wbless', store)
    c['wb.rows'] = len(wb)
    wt = [r for r in wb if r[3] == 'test']
    c['wb.test'] = len(wt)
    wtc = set(senses.covered_rows([(r, x, y) for r, x, y, _ in wt], U_full, wn))
    wtc_rows = [r for r in wt if r[0] in wtc]
    c['wb.test_covered'] = len(wtc_rows)
    keys = [wbless_cluster(x, y, concepts) for _, x, y, _ in wtc_rows]
    c['wb.clusters'] = len({k for k in keys if k is not None})
    c['wb.no_concept'] = sum(1 for k in keys if k is None)
    c['wb.two_concepts'] = sum(1 for _, x, y, _ in wtc_rows if x in concepts and y in concepts)

    leds = [r for r in suite_words('leds', store) if r[3] == 'test']
    c['leds.test'] = len(leds)
    c['leds.test_covered'] = len(senses.covered_rows([(r, x, y) for r, x, y, _ in leds], U_full, wn))
    ev = suite_words('eval', store)
    c['eval.rows'] = len(ev)
    c['eval.distinct_pairs'] = len(set(_ns_pairs([(x, y) for _, x, y, _ in ev])))
    sh = [r for r in suite_words('shwartz', store) if r[3] == 'test']
    c['shwartz.test'] = len(sh)
    c['shwartz.test_covered'] = len(senses.covered_rows([(r, x, y) for r, x, y, _ in sh], U_full, wn))

    sl = simlex_words(store)
    sn = [(r, x, y) for r, x, y, p in sl if p == 'N']
    c['sl.rows'], c['sl.N'] = len(sl), len(sn)
    slc = set(senses.covered_rows(sn, U_full, wn))
    c['sl.N_covered'] = len(slc)
    c['sl.word_types'] = len(senses.word_types([(x, y) for r, x, y in sn if r in slc]))
    men = men_words(store)
    mn = [(r, x, y) for r, x, tx, y, ty in men if tx == '-n' and ty == '-n']
    c['men.rows'], c['men.nn'] = len(men), len(mn)
    mnc = set(senses.covered_rows(mn, U_full, wn))
    c['men.nn_covered'] = len(mnc)
    c['men.word_types'] = len(senses.word_types([(x, y) for r, x, y in mn if r in mnc]))
    wsr, wss, wsc = (ws353_words(k, store) for k in ('ws353-rel', 'ws353-sim', 'ws353-combined'))
    c['wsr.rows'], c['wsr.covered'] = len(wsr), len(senses.covered_rows(wsr, U_full, wn))
    c['wss.rows'], c['wss.covered'] = len(wss), len(senses.covered_rows(wss, U_full, wn))
    c['ws.combined.rows'] = len(wsc)
    c['ws.combined.covered'] = len(senses.covered_rows(wsc, U_full, wn))
    # READING (A13.9, WS-353's "distinct ordered pairs"): pairs compared as N_S forms (combined.tab capitalises
    # some words that the split files write in lower case).
    pr, ps, pcmb = (set(_ns_pairs([(x, y) for _, x, y in rows])) for rows in (wsr, wss, wsc))
    c['ws.combined.distinct'] = len(pcmb)
    c['ws.split_union_equals_combined'] = (pr | ps) == pcmb
    c['ws.split_shared'] = len(pr & ps)
    return c


def bless_concepts(store=None):
    """bless.tsv's distinct word1 values (all folds): the BLESS concepts that key BD's and WB's clusters."""
    return frozenset(x for _, x, _, _ in suite_words('bless', store))


def wbless_cluster(x, y, concepts):
    """A13 L13: a WB row's cluster is the BLESS concept it holds, word1 if it is one of bless.tsv's word1 values and
    word2 otherwise; None if it holds none. READING: words are compared as given in the files (both are the
    suite's lower-case lemmas), not through N_S."""
    if x in concepts:
        return x
    if y in concepts:
        return y
    return None


def count_checks_gold(wn, store=None):
    """The counts of A13.9 that need a label, TYPE, relation or rating (pass 2 only), keyed like COUNTS_GOLD."""
    _require_gold('count_checks_gold')
    from . import senses, wordnet
    store = store or default_store()
    c = {}
    nouns = wn['synsets']['noun']
    U_full = senses.universe_full(wn)
    anc = wordnet.closure(nouns)
    parent, _, _ = wordnet.spanning_forest(nouns)

    def span(s):
        out, p = set(), parent[s]
        while p is not None:
            out.add(p)
            p = parent[p]
        return out
    span_cache = {}

    def some(x, y, rel):
        """Some sense pairing (s, t) of S(x) x S(y) with t in rel(s): closure or spanning ancestors (strict).
        READING (A13.9, "for some sense pairing, closure ... spanning ancestor"): closure is wordnet.closure ('@' and
        '@i', strict ancestors, U_full senses); a spanning ancestor is a strict ancestor on the L3 spanning-parent
        chain; a shared synset (s = t) is neither. These give A13.9's counts exactly."""
        sy = set(senses.senses(y, U_full, wn))
        for s in senses.senses(x, U_full, wn):
            if rel == 'closure':
                a = anc[s]
            else:
                if s not in span_cache:
                    span_cache[s] = span(s)
                a = span_cache[s]
            if sy & a:
                return True
        return False

    hl = hyperlex_words('hyperlex-all', store)
    gold = {r: t for r, t, _, _ in hyperlex_gold('hyperlex-all', store)}
    lines = raw_lines('hyperlex-all', store)[1:]
    nlines = raw_lines('hyperlex-nouns', store)[1:]
    c['hl.N_lines_equal_nouns_file'] = [lines[r] for r, _, _, p in hl if p == 'N'] == nlines
    hn = [(r, x, y, gold[r]) for r, x, y, p in hl if p == 'N']
    c['hl.type'] = {t: sum(1 for *_, g in hn if g == t) for t in HL_TYPES}
    if sum(c['hl.type'].values()) != len(hn):
        c['hl.type']['other'] = len(hn) - sum(c['hl.type'].values())
    c['hl.closure_forward'] = {t: sum(1 for _, x, y, g in hn if g == t and some(x, y, 'closure'))
                               for t in HL_TYPES[:4]}
    c['hl.closure_reversed'] = {t: sum(1 for _, x, y, g in hn if g == t and some(y, x, 'closure'))
                                for t in HL_TYPES[4:8]}
    c['hl.spanning_forward'] = {t: sum(1 for _, x, y, g in hn if g == t and some(x, y, 'spanning'))
                                for t in HL_TYPES[:4]}

    bless = suite_words('bless', store)
    lab = dict(suite_gold('bless', store))
    cov = set(senses.covered_rows([(r, x, y) for r, x, y, _ in bless], U_full, wn))
    c['bd.test_true'] = sum(1 for r, _, _, f in bless if f == 'test' and lab[r])
    c['bd.test_covered_true'] = sum(1 for r, _, _, f in bless if f == 'test' and lab[r] and r in cov)
    pos = [(x, y) for r, x, y, _ in bless if lab[r] and r in cov]
    c['bd.true_covered_all_folds'] = len(pos)
    c['bd.true_closure'] = sum(1 for x, y in pos if some(x, y, 'closure'))
    c['bd.true_spanning'] = sum(1 for x, y in pos if some(x, y, 'spanning'))

    wb = suite_words('wbless', store)
    lab = dict(suite_gold('wbless', store))
    cov = set(senses.covered_rows([(r, x, y) for r, x, y, f in wb if f == 'test'], U_full, wn))
    c['wb.test_true'] = sum(1 for r, _, _, f in wb if f == 'test' and lab[r])
    c['wb.test_covered_true'] = sum(1 for r, _, _, f in wb if f == 'test' and lab[r] and r in cov)

    leds = suite_words('leds', store)
    lab = dict(suite_gold('leds', store))
    c['leds.test_true'] = sum(1 for r, _, _, f in leds if f == 'test' and lab[r])
    pos = [(x, y) for r, x, y, _ in leds if lab[r]]
    c['leds.true_all_folds'] = len(pos)
    n_first = 0
    for x, y in pos:
        sx, sy = senses.senses(x, U_full, wn), senses.senses(y, U_full, wn)
        n_first += bool(sx and sy and sy[0] in anc[sx[0]])
    c['leds.true_first_sense_closure'] = n_first

    ev = suite_words('eval', store)
    lab = dict(suite_gold('eval', store))
    by_pair = {}
    for (r, x, y, _), p in zip(ev, _ns_pairs([(x, y) for _, x, y, _ in ev])):
        by_pair.setdefault(p, set()).add(lab[r])
    c['eval.pairs_with_both_labels'] = sum(1 for v in by_pair.values() if len(v) == 2)
    c['eval.equals_upstream'] = eval_equals_upstream(store)

    sh = suite_words('shwartz', store)
    lab = dict(suite_gold('shwartz', store))
    c['shwartz.test_true'] = sum(1 for r, _, _, f in sh if f == 'test' and lab[r])

    comb = {}
    for (r, x, y), (_, g) in zip(ws353_words('ws353-combined', store), ws353_gold('ws353-combined', store)):
        comb.setdefault(_ns_pairs([(x, y)])[0], set()).add(g)
    agree = True
    for key in ('ws353-rel', 'ws353-sim'):
        for (r, x, y), (_, g) in zip(ws353_words(key, store), ws353_gold(key, store)):
            agree &= g in comb.get(_ns_pairs([(x, y)])[0], set())
    c['ws.split_scores_agree_with_combined'] = agree
    return c


def eval_equals_upstream(store=None):
    """A13.11's check: the suite's eval.tsv, folds removed, equals as a multiset the upstream EVALution.val and
    .test lines after `sort | uniq` and `sed 's/-[jvn]\\t/\\t/g'` (the suite's download_data.sh, read as text)."""
    _require_gold('eval_equals_upstream')
    up = set(raw_lines('evalution-val', store)) | set(raw_lines('evalution-test', store))
    up = Counter(re.sub('-[jvn]\t', '\t', line) for line in up)
    suite = raw_lines('eval', store)
    if suite[0] != '\t'.join(SUITE_HEADERS['eval']):
        return False
    ours = Counter(line.rsplit('\t', 1)[0] for line in suite[1:])
    return ours == up


def random_split_agrees(store=None):
    """A13.11's check for the reported random-split test: the noun rows of splits/random/hyperlex_test_all_random.txt
    and the suite's hyperlex_rnd.tsv rows with fold 'test' and pos N agree, in order, on the words, on TYPE (the
    suite's label) and on AVG_SCORE (the suite's score). Returns {'rows', 'words', 'type', 'score'}."""
    _require_gold('random_split_agrees')
    sp = hyperlex_split_words(store)
    spg = {r: (t, s) for r, t, s, _ in hyperlex_split_gold(store)}
    a = [(x, y, spg[r]) for r, x, y, p, _ in sp if p == 'N']
    rg = {r: (t, s) for r, t, s in hyperlex_rnd_gold(store)}
    b = [(x, y, rg[r]) for r, x, y, p, f in hyperlex_rnd_words(store) if p == 'N' and f == 'test']
    same = len(a) == len(b)
    return {'rows': (len(a), len(b)),
            'words': same and all(u[:2] == v[:2] for u, v in zip(a, b)),
            'type': same and all(u[2][0] == v[2][0] for u, v in zip(a, b)),
            'score': same and all(u[2][1] == v[2][1] for u, v in zip(a, b))}

# ================================================================ dry data (A13.13): counts only
def dry_counts(wn, store=None):
    """The dry run's word-level counts (verbs, A13.13), for the definitions amendment: HyperLex's verb rows and
    their coverage in index.verb, SimLex's verb rows, MEN's v-v rows, the verb '@' graph. No rating is read."""
    from . import senses
    store = store or default_store()
    vidx = wn['index']['verb']
    hl = [(r, x, y) for r, x, y, p in hyperlex_words('hyperlex-all', store) if p == 'V']
    covered = [r for r, x, y in hl if senses.N_S(x) in vidx and senses.N_S(y) in vidx]
    sl = [(r, x, y) for r, x, y, p in simlex_words(store) if p == 'V']
    men = [(r, x, y) for r, x, tx, y, ty in men_words(store) if tx == '-v' and ty == '-v']
    g = senses.at_graph(wn, 'verb')
    V_at = frozenset(g.nodes)
    return {'hl.V': len(hl), 'hl.V_covered_index_verb': len(covered),
            'hl.V_covered_verb_at': len(senses.covered_rows(hl, V_at, wn, pos='verb')),
            'sl.V': len(sl), 'sl.V_covered_index_verb': sum(1 for _, x, y in sl
                                                            if senses.N_S(x) in vidx and senses.N_S(y) in vidx),
            'men.vv': len(men), 'men.vv_covered_index_verb': sum(1 for _, x, y in men
                                                                 if senses.N_S(x) in vidx and senses.N_S(y) in vidx),
            'verb_at.nodes': len(g.nodes), 'verb_at.edges': len(g.edges), 'verb_at.indirect': g.n_indirect,
            'verb_at.roots': len(g.roots), 'verb_at.isolated': g.isolated,
            'verb_at.dry_split_rows': g.n_indirect * 5 // 100}


DRY_COUNTS_A13 = {'hl.V': 453, 'hl.V_covered_index_verb': 452, 'sl.V': 222, 'men.vv': 29, 'verb_at.nodes': 13542,
                  'verb_at.edges': 13239, 'verb_at.indirect': 21840, 'verb_at.roots': 334, 'verb_at.isolated': 225,
                  'verb_at.dry_split_rows': 1092}
DRY_COUNTS_GOLD_A13 = {'hl.V_hyp_rows': 201}


def dry_counts_gold(wn, store=None):
    """Pass 2's dry count (A13.13): HyperLex's verb rows of TYPE hyp-1 to hyp-4, the dry detection set's positives.
    A count of the TYPE column; no rating is read."""
    _require_gold('dry_counts_gold')
    gold = {r: t for r, t, _, _ in hyperlex_gold('hyperlex-all', store)}
    return {'hl.V_hyp_rows': sum(1 for r, _, _, p in hyperlex_words('hyperlex-all', store)
                                 if p == 'V' and gold[r] in HL_TYPES[:4])}


# ================================================================ the protocol pin (A13.14)
def protocol_text(prereg_path=PREREGISTRATION):
    """Amendment 10, then Amendment 13, each verbatim from its heading (Phase 4's l6.amendment_section: up to the
    next heading of level 1-3, trailing blank lines dropped), LF line ends, one final LF each.
    READING (A13.14, "Amendment 10, then this amendment, verbatim from their headings"): the two sections are
    concatenated as l6.amendment_section gives them, with nothing between them; A13's own '####' claim headings are
    inside it."""
    from .l6 import amendment_section
    with open(prereg_path, encoding='utf-8') as fh:
        text = fh.read()
    return amendment_section(text, 10) + amendment_section(text, 13)


def protocol_sha(path=PROTOCOL_FILE):
    """The SHA-256 of golden/stage2_protocol_v1.txt, refused unless it is the pinned PROTOCOL_SHA."""
    with open(path, 'rb') as fh:
        h = hashlib.sha256(fh.read()).hexdigest()
    if h != PROTOCOL_SHA:
        raise ValueError(f'{path} has SHA-256 {h}, not the pinned {PROTOCOL_SHA}')
    return h
