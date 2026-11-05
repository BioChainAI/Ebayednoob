"""WordNet 3.0 from nltk_data's wordnet.zip: the same reader as golden/wordnet_v1.cjs, in Python.

The archive is read from the cache (lexicon.CACHE, outside git) and refused unless its SHA-256 and size are the
pinned ones. Data and index files are read as Latin-1 (they are ASCII), exactly as the Node reader does.

    wn = load()                         {'synsets': {pos: {offset: Synset}}, 'index': {pos: {lemma: IndexEntry}}}
    spanning_forest(wn['synsets']['noun'])  parent, ordered children, roots
    closure(wn['synsets']['noun'])          every node's hypernym + instance-hypernym ancestors
    mammal_sets(wn)                      the 1,182-node closure set and the 1,176-node spanning subtree
    lemma_types(wn), c0_shards(wn), glosses(wn)
"""
import hashlib
import os
import zipfile

from . import CACHE

URL = 'https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip'
ZIP_SHA256 = 'cbda5ea6eef7f36a97a43d4a75f85e07fccbb4f23657d27b4ccbc93e2646ab59'
ZIP_BYTES = 10775600
ZIP_PATH = os.path.join(CACHE, 'wordnet.zip')
POS = ('noun', 'verb', 'adj', 'adv')
MAMMAL = '01861778'
ENTITY = '00001740'
SHARD_MAX = 60000


class Synset:
    __slots__ = ('pos', 'ss_type', 'offset', 'lemmas', 'ptrs', 'gloss')

    def __init__(self, pos, ss_type, offset, lemmas, ptrs, gloss):
        self.pos, self.ss_type, self.offset, self.lemmas, self.ptrs, self.gloss = pos, ss_type, offset, lemmas, ptrs, gloss


class IndexEntry:
    __slots__ = ('lemma', 'tagsense', 'offsets')

    def __init__(self, lemma, tagsense, offsets):
        self.lemma, self.tagsense, self.offsets = lemma, tagsense, offsets


def parse_data(text, pos):
    """data.<pos>: offset lex_filenum ss_type w_cnt (word lex_id)... p_cnt (sym offset pos src/tgt)... | gloss"""
    out = {}
    for line in text.split('\n'):
        if not line or line.startswith('  '):
            continue
        bar = line.find(' | ')
        head = (line if bar < 0 else line[:bar]).strip().split(' ')
        gloss = '' if bar < 0 else line[bar + 3:].strip()
        offset, ss_type, w_cnt = head[0], head[2], int(head[3], 16)
        i = 4
        lemmas = []
        for _ in range(w_cnt):
            lemmas.append(head[i])
            i += 2
        p_cnt = int(head[i], 10)
        i += 1
        ptrs = []
        for _ in range(p_cnt):
            ptrs.append((head[i], head[i + 1], head[i + 2]))
            i += 4
        out[offset] = Synset(pos, ss_type, offset, lemmas, ptrs, gloss)
    return out


def parse_index(text):
    """index.<pos>: lemma pos synset_cnt p_cnt [ptr]... sense_cnt tagsense_cnt synset_offset..."""
    out = {}
    for line in text.split('\n'):
        if not line or line.startswith('  '):
            continue
        f = line.strip().split(' ')
        syn_cnt, p_cnt = int(f[2], 10), int(f[3], 10)
        out[f[0]] = IndexEntry(f[0], int(f[5 + p_cnt], 10), f[len(f) - syn_cnt:])
    return out


def read_archive(path=ZIP_PATH):
    if not os.path.exists(path):
        raise FileNotFoundError(f'no WordNet archive at {path}: run golden/make_wordnet_v1.cjs first')
    buf = open(path, 'rb').read()
    digest = hashlib.sha256(buf).hexdigest()
    if digest != ZIP_SHA256 or len(buf) != ZIP_BYTES:
        raise ValueError(f'WordNet archive digest {digest} ({len(buf)} B) is not the pinned {ZIP_SHA256}')
    return zipfile.ZipFile(path)


_CACHE = {}


def load(path=ZIP_PATH):
    if path not in _CACHE:
        z = read_archive(path)
        txt = lambda n: z.read('wordnet/' + n).decode('latin-1')  # noqa: E731
        synsets = {pos: parse_data(txt('data.' + pos), pos) for pos in POS}
        index = {pos: parse_index(txt('index.' + pos)) for pos in POS}
        _CACHE[path] = {'synsets': synsets, 'index': index, 'license': txt('LICENSE')}
    return _CACHE[path]


def available(path=ZIP_PATH):
    return os.path.exists(path)


def spanning_parent(syn):
    """The L3 spanning parent: the first '@' (hypernym) or '@i' (instance hypernym) pointer of the data line."""
    for sym, off, _ in syn.ptrs:
        if sym in ('@', '@i'):
            return off
    return None


def closure_parents(syn):
    return [off for sym, off, _ in syn.ptrs if sym in ('@', '@i')]


def spanning_forest(m):
    """parent (offset -> offset or None), children (offset -> offsets sorted), roots (sorted)."""
    parent, children, roots = {}, {}, []
    for off, syn in m.items():
        p = spanning_parent(syn)
        parent[off] = p
        if p is None:
            roots.append(off)
        else:
            children.setdefault(p, []).append(off)
    for lst in children.values():
        lst.sort()
    roots.sort()
    return parent, children, roots


def closure(m):
    """Every node's ancestors in the hypernym + instance-hypernym closure (multiple inheritance kept)."""
    anc = {}

    def visit(off):
        if off in anc:
            return anc[off]
        s = set()
        anc[off] = s
        for p in closure_parents(m[off]):
            s.add(p)
            s |= visit(p)
        return s
    for off in m:
        visit(off)
    return anc


def descendants(anc):
    """The inverse of closure(): every node's closure descendants."""
    desc = {off: set() for off in anc}
    for off, a in anc.items():
        for x in a:
            desc[x].add(off)
    return desc


def mammal_sets(wn):
    """(closure set, spanning subtree), both sorted by offset."""
    nouns = wn['synsets']['noun']
    anc = closure(nouns)
    clos = sorted([MAMMAL] + [o for o, a in anc.items() if MAMMAL in a])
    parent, _, _ = spanning_forest(nouns)

    def reaches(o):
        while o is not None:
            if o == MAMMAL:
                return True
            o = parent[o]
        return False
    span = sorted(o for o in nouns if reaches(o))
    return clos, span


def lemma_types(wn):
    """Distinct lemma strings of the four index files, '_' read as a space (L2 applies N_B on top)."""
    return sorted({lemma.replace('_', ' ') for pos in POS for lemma in wn['index'][pos]})


def c0_lines(wn):
    nouns = wn['synsets']['noun']
    return [f"{s.offset}\t{', '.join(l.replace('_', ' ') for l in s.lemmas)}\t{s.gloss}"
            for s in sorted(nouns.values(), key=lambda s: s.offset)]


def c0_shards(wn):
    """C0 cut at line boundaries into shards of at most 60,000 UTF-8 bytes, lines joined by LF inside a shard."""
    shards, cur, cur_bytes = [], [], 0
    for line in c0_lines(wn):
        b = len(line.encode('utf-8'))
        if b > SHARD_MAX:
            raise ValueError('a C0 line is longer than a shard')
        if cur and cur_bytes + 1 + b > SHARD_MAX:
            shards.append('\n'.join(cur))
            cur, cur_bytes = [], 0
        cur_bytes += (1 if cur else 0) + b
        cur.append(line)
    if cur:
        shards.append('\n'.join(cur))
    return shards


def glosses(wn):
    """L1 instance (a): every synset's gloss field, in (part of speech, offset) order: 117,659 strings."""
    return [wn['synsets'][pos][off].gloss for pos in POS for off in sorted(wn['synsets'][pos])]


def nouns_in_order(wn):
    return sorted(wn['synsets']['noun'])
