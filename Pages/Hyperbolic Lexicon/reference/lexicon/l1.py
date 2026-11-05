"""L1's instance loaders (PREREGISTRATION.md L1; Amendment 1 item 2). Loaders only: nothing here runs or decides L1.

    instance_a(wn)      (a) every WordNet 3.0 gloss field, (part of speech, offset) order: 117,659 strings
    instance_b()        (b) every '# text = ' sentence of UD English EWT train, dev, test: 12,544 + 2,001 + 2,077
    instance_c()        (c) the Unicode stress set's cases, groups in order: 20,520 strings
    instance_d()        (d) 2,000 synthetic strings, string i from Rng(1000 + i)
    dry(i)              a dry-run string from Rng(4000 + i), the same generator
    trace_string(i)     a trace string from Rng(8000 + i) (traces for the browser core only; no claim uses 8000 + i)
    pool()              (d)'s pool, one list in code-point order (12,726 code points)
Every loader returns Python strings; encode them as UTF-8 for nb() and encode().

(a) is lexicon.wordnet.glosses: the gloss field after ' | ', trimmed, as golden/wordnet_v1.cjs reads it.
(b) is read from the cache golden/make_ewt_v1.cjs fills (lexicon.CACHE/ewt/en_ewt-ud-{train,dev,test}.conllu): the
rest of each line that starts with '# text = ', without its line ending; each file is refused unless its SHA-256 is
the one in golden/ewt_v1.meta.json.
(c) is spikes/s6_stress_set_v1.json, refused unless its SHA-256 is the registered bd1179ea...; a case is upper-case
hex code points joined by single spaces.
(d): length 1 + below(64) code points, each pool()[below(len(pool()))], drawn in that order from one Rng.
"""
import hashlib
import json
import os

from hpstep.prng import Rng

from . import CACHE, GOLDEN, SYSTEM
from . import wordnet

EWT_DIR = os.path.join(CACHE, 'ewt')
EWT_FILES = ('en_ewt-ud-train.conllu', 'en_ewt-ud-dev.conllu', 'en_ewt-ud-test.conllu')
EWT_META = os.path.join(GOLDEN, 'ewt_v1.meta.json')
STRESS_PATH = os.path.join(SYSTEM, 'spikes', 's6_stress_set_v1.json')
STRESS_SHA256 = 'bd1179ea80eb3dd44e05a4efa0484f034a637a66d8f09ffe10e428f040f6e94a'
SEED_D, SEED_DRY, SEED_TRACE = 1000, 4000, 8000
N_D = 2000


def instance_a(wn):
    return wordnet.glosses(wn)


def ewt_available():
    return all(os.path.exists(os.path.join(EWT_DIR, f)) for f in EWT_FILES)


def instance_b(split=None):
    """The '# text = ' sentences, train then dev then test (or one split: 'train', 'dev' or 'test')."""
    meta = json.load(open(EWT_META))['files']
    out = []
    for f in EWT_FILES:
        if split is not None and f != f'en_ewt-ud-{split}.conllu':
            continue
        path = os.path.join(EWT_DIR, f)
        if not os.path.exists(path):
            raise FileNotFoundError(f'no UD EWT file at {path}: run golden/make_ewt_v1.cjs first')
        blob = open(path, 'rb').read()
        if hashlib.sha256(blob).hexdigest() != meta[f]['sha256']:
            raise ValueError(f'{path} is not the pinned file')
        for line in blob.decode('utf-8').split('\n'):
            if line.startswith('# text = '):
                # the line ending: LF (split above), or CRLF (the pinned files hold no CR)
                out.append(line[9:-1] if line.endswith('\r') else line[9:])
    return out


def stress_set():
    """The parsed stress set (spike S6), refused unless its SHA-256 is the registered one."""
    blob = open(STRESS_PATH, 'rb').read()
    digest = hashlib.sha256(blob).hexdigest()
    if digest != STRESS_SHA256:
        raise ValueError(f'{STRESS_PATH}: sha256 {digest} is not the registered {STRESS_SHA256}')
    return json.loads(blob.decode('ascii'))


def from_hex(h):
    return ''.join(chr(int(x, 16)) for x in h.split(' ')) if h else ''


def instance_c():
    s = stress_set()
    return [from_hex(h) for g in s['groups'] for h in s['cases'][g]]


# (d)'s pool, as registered in L1 (d) plus Amendment 1 item 2(d): one list in code-point order.
# READING: each named class is a whole Unicode block or the range given: ASCII U+0000-007F, Latin-1 Supplement
# U+0080-00FF, Latin Extended-A U+0100-017F, combining marks U+0300-036F, Greek as the Greek and Coptic block
# U+0370-03FF (its 9 code points unassigned in 15.1 included, so they fail closed like the post-15.1 ones; U+03A3
# and the Greek letters give the final-sigma contexts), Cyrillic U+0400-04FF, Hangul syllables U+AC00-D7A3, CJK
# U+4E00-4FFF, emoji U+1F600-1F64F, C0 controls U+0000-001F, U+200B and U+FEFF. "One list" is their union without
# repeats (C0 lies inside ASCII), so the draw is uniform over distinct code points.
# READING: "the code points of the stress set assigned after Unicode 15.1" are the 64 of the stress set's
# post151First64 list: spike S6 wrote them as "the first 64 code points assigned in Node but unassigned in Python
# 15.1.0" and labels them "L1(d)'s pool" in s6_unicode_wordpiece.cjs and its output. (The stress set holds 9,988
# such code points in all, in divergentAlone; taking all of them would make them 9,988 of a 22,650-code-point pool.)
POOL_RANGES = ((0x0000, 0x007F), (0x0080, 0x00FF), (0x0100, 0x017F), (0x0300, 0x036F), (0x0370, 0x03FF),
               (0x0400, 0x04FF), (0xAC00, 0xD7A3), (0x4E00, 0x4FFF), (0x1F600, 0x1F64F), (0x0000, 0x001F),
               (0x200B, 0x200B), (0xFEFF, 0xFEFF))


def post151():
    """The stress set's code points assigned after 15.1 that (d)'s pool takes (its post151First64 list)."""
    return [int(h, 16) for h in stress_set()['post151First64']]


def _pool():
    s = set()
    for a, b in POOL_RANGES:
        s.update(range(a, b + 1))
    s.update(post151())
    return sorted(s)


_memo = {}


def pool():
    if 'pool' not in _memo:
        _memo['pool'] = _pool()
    return _memo['pool']


def synthetic(seed):
    """One synthetic string: Rng(seed), length 1 + below(64), each code point pool()[below(len(pool()))]."""
    p = pool()
    r = Rng(seed)
    n = 1 + r.below(64)
    return ''.join(chr(p[r.below(len(p))]) for _ in range(n))


def instance_d():
    return [synthetic(SEED_D + i) for i in range(N_D)]


def dry(i):
    return synthetic(SEED_DRY + i)


def trace_string(i):
    return synthetic(SEED_TRACE + i)


def instances(wn):
    """All four instances by name, each a list of strings ((b) only when the EWT cache exists)."""
    out = {'a': instance_a(wn)}
    if ewt_available():
        out['b'] = instance_b()
    out['c'] = instance_c()
    out['d'] = instance_d()
    return out
