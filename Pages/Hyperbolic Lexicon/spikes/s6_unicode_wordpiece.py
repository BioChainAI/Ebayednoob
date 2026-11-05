#!/usr/bin/env python3
"""Hyperbolic Lexicon, Phase 0, spike S6, the Python half: Python 3.13's Unicode behaviour (unicodedata 15.1.0, the
authority the pinned tables will be exported from), a prototype of those tables with an exactness check, and the toy
WordPiece, written independently of every line of s6_unicode_wordpiece.cjs.

WHAT IT MEASURES (the Node script compares these values with Node's and Chromium's and prints them).
  1. The full sweep. For every code point 0..10FFFF except the surrogates D800..DFFF (1,112,064 code points), with
     Python's own functions only:
       gc     unicodedata.category(c);
       lower  chr(cp).lower() (full mappings; a lone U+03A3 lowercases to U+03C3);
       nfd    unicodedata.normalize('NFD', c);
       mn     category == 'Mn' (what a normaliser that drops Mn removes);
       sigma  the Final_Sigma context class, read from str.lower itself by two probes: lower('A' + c + U+03A3) and
              lower(c + U+03A3) each end in U+03C2 or U+03C3. Class C (cased and not case-ignorable) if both end in
              U+03C2, I (case-ignorable) if only the first does, N if neither, X if only the second (impossible under
              the Unicode rule; counted). These are the only two character sets Final_Sigma reads, and unicodedata
              does not expose them;
       ordp   canonical-ordering participation, read from NFD itself: NFD(c + U+0334) != NFD(c) + U+0334 or
              NFD(U+0301 + c) != U+0301 + NFD(c) (U+0334 has ccc 1, U+0301 ccc 230). Checked against
              unicodedata.combining(c) != 0 on every code point without a decomposition (the second way).
     Each property is written as a canonical text and hashed with SHA-256, in exactly the form the Node script uses:
       gc     maximal runs "SSSS..EEEE Cat" over consecutive code points (a run never crosses D7FF/E000);
       lower  "XXXX:YYYY ZZZZ" for every code point whose mapping is not itself; nfd the same;
       mn     runs "SSSS..EEEE" of members; sigma runs "SSSS..EEEE I" / "... C" (N omitted); ordp runs of members;
     hex is upper case with at least 4 digits, every line ends in LF, lines are in code point order.
  2. A prototype of the pinned 15.1 table (reference/golden/unicode_15_1_v1.json will be the real one; nothing is
     written here): categories as ranges over 0..10FFFF, single-step canonical decompositions (Hangul is algorithmic
     and not stored), non-zero combining classes as ranges, full lowercase mappings, and the two Final_Sigma sets as
     ranges; its entry counts and compact-JSON bytes ("the table size"). Exactness check (two ways): a table-driven
     lower (with Final_Sigma) + NFD (recursive decomposition, algorithmic Hangul, stable canonical ordering) + Mn
     removal, against Python's own str.lower + unicodedata.normalize('NFD') + category, on every code point alone
     and on 2,000 synthetic strings, string i from hpstep.prng.Rng(90000 + i), length 1 + below(48), drawn from a
     fixed pool of 15.1-assigned code points rich in Final_Sigma contexts, U+0130, marks, Hangul and singletons.
  3. The toy WordPiece on the repository Markdown pinned at commit 7b10514 (recipe in s6_unicode_wordpiece.cjs, and
     in wp_vocab below): the vocabulary SHA-256, the token-id stream SHA-256 (LEB128 varints) and counts; "~"
     throughput. The corpus is read with read-only git plumbing (ls-tree, cat-file); nothing in git is written.
  4. With --cases, the strings of the stress set read from stdin (the canonical JSON the Node script built): its
     SHA-256, a check that json.dumps(json.loads(text), indent=1) + LF reproduces it byte for byte, and for every case
     str.lower(s) and the reference normaliser R(s) = drop Mn (unicodedata.normalize('NFD', s.lower())).

HOW TO RUN. s6_unicode_wordpiece.cjs starts it twice: python3 -B -I s6_unicode_wordpiece.py --sweep (JSON on
stdout) and ... --cases (stress set on stdin, JSON on stdout). Alone, from anywhere:
  python3 -B -I "Pages/Hyperbolic Lexicon/spikes/s6_unicode_wordpiece.py"
prints a short report and, if s6_stress_set_v1.json exists beside it, checks its canonical form and SHA-256.
-B -I: no bytecode is written and nothing from the environment is imported; hpstep (for Rng only) is imported in place
from Pages/Hyperbolic Oracles/reference through an explicit sys.path entry. Lines that begin with "~ " depend on the
machine, a timing or a runtime version; the 15.1 values are printed without "~" only while unicodedata is 15.1.0.

WHAT IT SETTLES (with the Node script). The pinned-table design (D5) and the table size; it decides no claim.

DATA AND SEEDS. Full Unicode sweeps, synthetic strings from Rng(90000 + i), i = 0..1999, and the repository Markdown
at commit 7b10514; no WordNet, nothing registered.

RUNTIME. About 5 s (the sweep about 1 s, the table check about 3 s, the WordPiece about 1 s with its throughput
repeats) on the build machine, Python 3.13.18.
"""
import hashlib
import json
import os
import platform
import subprocess
import sys
import time
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'Pages', 'Hyperbolic Oracles', 'reference'))
from hpstep.prng import Rng  # noqa: E402  (lazy package: only prng is loaded)

PIN_COMMIT = '7b10514a4f2955c92cd0a06a3a658998080cb310'
AUTHORITY = '15.1.0'
SIGMA, SIGMA_FINAL, SIGMA_MID = 'Σ', 'ς', 'σ'
NONSUR = list(range(0, 0xD800)) + list(range(0xE000, 0x110000))


def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def hx(cp):
    return '%04X' % cp


def hxs(s):
    return ' '.join(hx(ord(ch)) for ch in s)


def runs(values, label):
    """Maximal runs of equal values over consecutive non-surrogate code points; label(v) is None to omit a run."""
    lines = []
    start = prev = cur = None
    for cp in NONSUR:
        v = values[cp]
        if start is not None and v == cur and cp == prev + 1:
            prev = cp
            continue
        if start is not None:
            lab = label(cur)
            if lab is not None:
                lines.append('%s..%s%s\n' % (hx(start), hx(prev), lab))
        start = prev = cp
        cur = v
    lab = label(cur)
    if lab is not None:
        lines.append('%s..%s%s\n' % (hx(start), hx(prev), lab))
    return ''.join(lines)


# ---------------------------------------------------------------------------------------------------------------------
# 1. The full sweep
# ---------------------------------------------------------------------------------------------------------------------
def sweep():
    t0 = time.perf_counter()
    cat = [None] * 0x110000
    mn = [False] * 0x110000
    sig = [None] * 0x110000
    ordp = [False] * 0x110000
    lower_lines, nfd_lines = [], []
    ordp_vs_combining = 0
    for cp in NONSUR:
        c = chr(cp)
        g = unicodedata.category(c)
        cat[cp] = g
        mn[cp] = g == 'Mn'
        lo = c.lower()
        if lo != c:
            lower_lines.append('%s:%s\n' % (hx(cp), hxs(lo)))
        d = unicodedata.normalize('NFD', c)
        if d != c:
            nfd_lines.append('%s:%s\n' % (hx(cp), hxs(d)))
        a = ('A' + c + SIGMA).lower()[-1] == SIGMA_FINAL
        b = (c + SIGMA).lower()[-1] == SIGMA_FINAL
        sig[cp] = ('C' if a else 'X') if b else ('I' if a else 'N')
        p = (unicodedata.normalize('NFD', c + '̴') != d + '̴'
             or unicodedata.normalize('NFD', '́' + c) != '́' + d)
        ordp[cp] = p
        if d == c and p != (unicodedata.combining(c) != 0):
            ordp_vs_combining += 1
    texts = {
        'gc': runs(cat, lambda v: ' ' + v),
        'lower': ''.join(lower_lines),
        'nfd': ''.join(nfd_lines),
        'mn': runs(mn, lambda v: '' if v else None),
        'sigma': runs(sig, lambda v: None if v == 'N' else ' ' + v),
        'ordp': runs(ordp, lambda v: '' if v else None),
    }
    counts = {
        'gcRuns': texts['gc'].count('\n'),
        'lower': len(lower_lines),
        'lowerMulti': sum(1 for ln in lower_lines if ' ' in ln),
        'nfd': len(nfd_lines),
        'mn': sum(1 for cp in NONSUR if mn[cp]),
        'sigmaI': sum(1 for cp in NONSUR if sig[cp] == 'I'),
        'sigmaC': sum(1 for cp in NONSUR if sig[cp] == 'C'),
        'sigmaX': sum(1 for cp in NONSUR if sig[cp] == 'X'),
        'ordp': sum(1 for cp in NONSUR if ordp[cp]),
        'graphicFormat': sum(1 for cp in NONSUR if cat[cp] not in ('Cn', 'Co', 'Cs', 'Cc')),
        'cn': sum(1 for cp in NONSUR if cat[cp] == 'Cn'),
        'ordpVsCombiningMismatch': ordp_vs_combining,
    }
    state = {'cat': cat, 'sig': sig}
    return texts, counts, state, (time.perf_counter() - t0) * 1000


# ---------------------------------------------------------------------------------------------------------------------
# 2. The prototype 15.1 table and its exactness check
# ---------------------------------------------------------------------------------------------------------------------
def all_ranges(get):
    """Runs of equal values over ALL code points 0..10FFFF (surrogates included), as [start, end, value]."""
    out = []
    start, cur = 0, get(0)
    for cp in range(1, 0x110000):
        v = get(cp)
        if v != cur:
            out.append([start, cp - 1, cur])
            start, cur = cp, v
    out.append([start, 0x10FFFF, cur])
    return out


def build_table(state):
    t0 = time.perf_counter()
    decomp, lower = {}, {}
    for cp in NONSUR:
        c = chr(cp)
        d = unicodedata.decomposition(c)
        if d and not d.startswith('<') and not 0xAC00 <= cp <= 0xD7A3:  # Hangul syllables are algorithmic
            decomp[cp] = [int(x, 16) for x in d.split()]
        lo = c.lower()
        if lo != c:
            lower[cp] = [ord(x) for x in lo]
    gc_r = all_ranges(lambda cp: unicodedata.category(chr(cp)))
    ccc_r = [r for r in all_ranges(lambda cp: unicodedata.combining(chr(cp))) if r[2] != 0]
    sig = state['sig']
    sig_r = all_ranges(lambda cp: sig[cp] if sig[cp] is not None else 'N')
    ign_r = [[a, b] for a, b, v in sig_r if v == 'I']
    cas_r = [[a, b] for a, b, v in sig_r if v == 'C']
    table = {
        'unicode': unicodedata.unidata_version,
        'gc': gc_r,
        'decomp': [[cp, decomp[cp]] for cp in sorted(decomp)],
        'ccc': ccc_r,
        'lower': [[cp, lower[cp]] for cp in sorted(lower)],
        'caseIgnorable': ign_r,
        'casedNotIgnorable': cas_r,
    }
    blob = json.dumps(table, separators=(',', ':'))
    info = {
        'gcRanges': len(gc_r), 'decomp': len(decomp), 'decompSingleton': sum(1 for v in decomp.values() if len(v) == 1),
        'cccRanges': len(ccc_r), 'cccCodePoints': sum(b - a + 1 for a, b, _ in ccc_r),
        'cccValues': len(set(v for _, _, v in ccc_r)),
        'lower': len(lower), 'lowerMulti': sum(1 for v in lower.values() if len(v) > 1),
        'ignRanges': len(ign_r), 'ignCodePoints': sum(b - a + 1 for a, b in ign_r),
        'casRanges': len(cas_r), 'casCodePoints': sum(b - a + 1 for a, b in cas_r),
        'bytes': len(blob.encode('utf-8')), 'sha256': sha(blob),
    }
    return table, info, (time.perf_counter() - t0) * 1000


class TableNormaliser:
    """lower (full mappings + Final_Sigma) -> NFD -> drop Mn, from the prototype table only."""
    SB, LB, VB, TB, NC, TC, SC = 0xAC00, 0x1100, 0x1161, 0x11A7, 588, 28, 11172

    def __init__(self, table):
        self.decomp = {cp: v for cp, v in table['decomp']}
        self.lowmap = {cp: v for cp, v in table['lower']}
        self.ccc = {}
        for a, b, v in table['ccc']:
            for cp in range(a, b + 1):
                self.ccc[cp] = v
        self.cls = {}
        for key, letter in (('caseIgnorable', 'I'), ('casedNotIgnorable', 'C')):
            for a, b in table[key]:
                for cp in range(a, b + 1):
                    self.cls[cp] = letter
        self.mn = set()
        for a, b, v in table['gc']:
            if v == 'Mn':
                self.mn.update(range(a, b + 1))

    def final_sigma(self, cps, i):
        j = i - 1
        while j >= 0 and self.cls.get(cps[j]) == 'I':
            j -= 1
        if j < 0 or self.cls.get(cps[j]) != 'C':
            return False
        j = i + 1
        while j < len(cps) and self.cls.get(cps[j]) == 'I':
            j += 1
        return j == len(cps) or self.cls.get(cps[j]) != 'C'

    def lower(self, cps):
        out = []
        for i, cp in enumerate(cps):
            if cp == 0x3A3:
                out.append(0x3C2 if self.final_sigma(cps, i) else 0x3C3)
            else:
                out.extend(self.lowmap.get(cp, [cp]))
        return out

    def nfd(self, cps):
        out = []

        def dec(cp):
            if self.SB <= cp < self.SB + self.SC:
                s = cp - self.SB
                out.append(self.LB + s // self.NC)
                out.append(self.VB + (s % self.NC) // self.TC)
                if s % self.TC:
                    out.append(self.TB + s % self.TC)
            elif cp in self.decomp:
                for x in self.decomp[cp]:
                    dec(x)
            else:
                out.append(cp)
        for cp in cps:
            dec(cp)
        i, n = 0, len(out)
        while i < n:
            if self.ccc.get(out[i], 0) == 0:
                i += 1
                continue
            j = i
            while j < n and self.ccc.get(out[j], 0) != 0:
                j += 1
            out[i:j] = sorted(out[i:j], key=lambda x: self.ccc[x])  # stable: equal classes keep their order
            i = j
        return out

    def normalise(self, s):
        return [cp for cp in self.nfd(self.lower([ord(ch) for ch in s])) if cp not in self.mn]


def reference(s):
    """R(s): Python's own functions, the authority."""
    return ''.join(ch for ch in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(ch) != 'Mn')


def synthetic_pool():
    pool = list(range(0x41, 0x5B)) + list(range(0x61, 0x7B)) + [0x30, 0x31, 0x20, 0x27, 0x2E, 0x3A, 0x2D, 0x5F]
    pool += [0x3A3] * 12 + [0x3C3, 0x3C2, 0x391, 0x392, 0x393, 0x394, 0x395, 0x39F, 0x3A9, 0x3AC, 0x3AD, 0x390, 0x1F48]
    pool += [0x130, 0x131, 0x49, 0x69, 0x307, 0x1E9E, 0xDF, 0x1C5, 0x1C4, 0x2126, 0x212A, 0x212B, 0x1E0A, 0x1E0C]
    pool += list(range(0x300, 0x370))
    pool += [0x345, 0xAD, 0x200C, 0x200D, 0x2019, 0xB7, 0x2B0, 0x1D2C, 0x2E2F, 0xFE00, 0x5B8, 0x5B9, 0x5B1, 0x591]
    pool += [0xF71, 0xF72, 0xF73, 0xF75, 0xF81, 0x958, 0x93C, 0x2ADC, 0x344, 0x340, 0x341, 0x343, 0x374, 0x37E]
    pool += [0xAC00, 0xAC01, 0xD7A3, 0xB098, 0xD55C, 0x1100, 0x1161, 0x11A8, 0x3131, 0xFB01, 0x1E9B, 0x1FB3, 0x1FBC]
    pool += [0x10400, 0x10428, 0x1E900, 0x1E922, 0x1D400, 0x24B6, 0x24D0, 0x2160, 0x2170, 0x10C80, 0x118A0, 0x16E40]
    return pool


def table_check(table, state):
    t0 = time.perf_counter()
    tn = TableNormaliser(table)
    cat = state['cat']
    bad_nfd = bad_lower = bad_norm = 0
    for cp in NONSUR:
        c = chr(cp)
        if tn.nfd([cp]) != [ord(x) for x in unicodedata.normalize('NFD', c)]:
            bad_nfd += 1
        if tn.lower([cp]) != [ord(x) for x in c.lower()]:
            bad_lower += 1
        if tn.normalise(c) != [ord(x) for x in reference(c)]:
            bad_norm += 1
    pool = synthetic_pool()
    assert all(cat[cp] != 'Cn' for cp in pool)
    n_syn, bad_syn, with_final, with_mid, digest = 2000, 0, 0, 0, hashlib.sha256()
    first_bad = None
    for i in range(n_syn):
        r = Rng(90000 + i)
        n = 1 + r.below(48)
        s = ''.join(chr(pool[r.below(len(pool))]) for _ in range(n))
        ref = reference(s)
        got = ''.join(chr(x) for x in tn.normalise(s))
        digest.update((hxs(s) + '\t' + hxs(ref) + '\n').encode('ascii'))
        if got != ref:
            bad_syn += 1
            first_bad = first_bad or hxs(s)
        lo = s.lower()
        with_final += SIGMA_FINAL in lo and SIGMA in s
        with_mid += SIGMA_MID in lo and SIGMA in s
    info = {'nfdAloneMismatch': bad_nfd, 'lowerAloneMismatch': bad_lower, 'normAloneMismatch': bad_norm,
            'codePoints': len(NONSUR), 'synthetic': n_syn, 'syntheticMismatch': bad_syn,
            'syntheticFirstMismatch': first_bad, 'syntheticWithFinalSigma': with_final,
            'syntheticWithMedialSigma': with_mid, 'syntheticDigest': digest.hexdigest(), 'poolSize': len(pool)}
    return info, (time.perf_counter() - t0) * 1000


# ---------------------------------------------------------------------------------------------------------------------
# 3. The toy WordPiece (independent of the JS)
# ---------------------------------------------------------------------------------------------------------------------
def git(*args):
    return subprocess.run(['git', '-C', REPO] + list(args), capture_output=True, check=True).stdout


def corpus():
    """Every *.md blob under Pages/ at PIN_COMMIT, sorted by path bytes; files joined with one LF."""
    raw = git('ls-tree', '-r', '-z', '--full-tree', PIN_COMMIT, '--', 'Pages')
    items = []
    for ent in raw.split(b'\0'):
        if not ent:
            continue
        meta, path = ent.split(b'\t', 1)
        mode, typ, oid = meta.split(b' ')
        if typ == b'blob' and path.startswith(b'Pages/') and path.endswith(b'.md'):
            items.append((path, oid.decode('ascii')))
    items.sort(key=lambda t: t[0])
    files = []
    for path, oid in items:
        data = git('cat-file', 'blob', oid)
        files.append((path.decode('utf-8'), data))
    text = '\n'.join(data.decode('utf-8') for _, data in files)  # strict UTF-8; a BOM would be kept as U+FEFF
    manifest = ''.join('%s %s\n' % (hashlib.sha256(d).hexdigest(), p) for p, d in files)
    return files, text, manifest


def wp_words(text):
    """ASCII-lowercase, split on ASCII whitespace (TAB LF VT FF CR SPACE); each ASCII punctuation character
    (BERT's ranges 21-2F, 3A-40, 5B-60, 7B-7E) is a word of its own; everything else stays inside words."""
    out, cur = [], []
    for ch in text:
        c = ord(ch)
        if 0x41 <= c <= 0x5A:
            ch = chr(c + 32)
            c += 32
        if c == 0x20 or 0x09 <= c <= 0x0D:
            if cur:
                out.append(''.join(cur))
                cur = []
        elif 0x21 <= c <= 0x2F or 0x3A <= c <= 0x40 or 0x5B <= c <= 0x60 or 0x7B <= c <= 0x7E:
            if cur:
                out.append(''.join(cur))
                cur = []
            out.append(ch)
        else:
            cur.append(ch)
    if cur:
        out.append(''.join(cur))
    return out


def wp_vocab(words):
    """500 entries: 5 specials; the 68 printable ASCII characters 21..7E other than A-Z; '##' + each of 0-9 a-z;
    the 196 most frequent words of 2..100 characters made only of [a-z0-9]; the 195 most frequent '##' + s, s a
    proper suffix of 2..4 characters of a [a-z0-9] word of >= 3 characters, counted per occurrence. Ties: string order."""
    v = ['[PAD]', '[UNK]', '[CLS]', '[SEP]', '[MASK]']
    v += [chr(c) for c in range(0x21, 0x7F) if not 0x41 <= c <= 0x5A]
    v += ['##' + ch for ch in '0123456789abcdefghijklmnopqrstuvwxyz']
    wc, sc = {}, {}
    alnum = set('0123456789abcdefghijklmnopqrstuvwxyz')
    for w in words:
        if not set(w) <= alnum:
            continue
        if 2 <= len(w) <= 100:
            wc[w] = wc.get(w, 0) + 1
        for k in range(2, min(4, len(w) - 1) + 1):
            s = w[-k:]
            sc[s] = sc.get(s, 0) + 1
    v += [w for w, _ in sorted(wc.items(), key=lambda t: (-t[1], t[0]))[:196]]
    v += ['##' + s for s, _ in sorted(sc.items(), key=lambda t: (-t[1], t[0]))[:195]]
    return v


def wp_tokenize(words, vocab):
    """BERT's greedy longest-match-first: a word of more than 100 characters, or with no full match, is one [UNK]."""
    ids, unk, long_words, multi = [], vocab['[UNK]'], 0, 0
    for w in words:
        if len(w) > 100:
            ids.append(unk)
            long_words += 1
            continue
        start, pieces = 0, []
        while start < len(w):
            end, hit = len(w), None
            while start < end:
                sub = w[start:end] if start == 0 else '##' + w[start:end]
                if sub in vocab:
                    hit = vocab[sub]
                    break
                end -= 1
            if hit is None:
                pieces = None
                break
            pieces.append(hit)
            start = end
        if pieces is None:
            ids.append(unk)
        else:
            ids.extend(pieces)
            multi += len(pieces) > 1
    return ids, long_words, multi


def leb128(ids):
    out = bytearray()
    for x in ids:
        while True:
            b = x & 0x7F
            x >>= 7
            if x:
                out.append(b | 0x80)
            else:
                out.append(b)
                break
    return bytes(out)


def wordpiece():
    files, text, manifest = corpus()
    nbytes = len(text.encode('utf-8'))
    words = wp_words(text)
    vlist = wp_vocab(words)
    vocab = {t: i for i, t in enumerate(vlist)}
    ids, long_words, multi = wp_tokenize(words, vocab)
    stream = leb128(ids)
    reps, best = 0, None
    t_all = time.perf_counter()
    while reps < 3 or (time.perf_counter() - t_all < 1.5 and reps < 20):
        t0 = time.perf_counter()
        ids2, _, _ = wp_tokenize(wp_words(text), vocab)
        dt = time.perf_counter() - t0
        best = dt if best is None else min(best, dt)
        reps += 1
        assert ids2 == ids
    return {
        'commit': PIN_COMMIT, 'files': len(files), 'bytes': nbytes, 'codePoints': len(text),
        'manifestSha256': sha(manifest), 'textSha256': hashlib.sha256(text.encode('utf-8')).hexdigest(),
        'nonAsciiCodePoints': sum(1 for ch in text if ord(ch) > 0x7F),
        'vocabSize': len(vlist), 'vocabSha256': sha('\n'.join(vlist) + '\n'), 'vocabDistinct': len(vocab),
        'words': len(words), 'tokens': len(ids), 'unk': sum(1 for x in ids if x == vocab['[UNK]']),
        'longWords': long_words, 'multiPieceWords': multi, 'streamBytes': len(stream),
        'streamSha256': hashlib.sha256(stream).hexdigest(),
        'tokPerSec': len(ids) / best, 'mbPerSec': nbytes / best / 1e6, 'reps': reps, 'bestMs': best * 1000,
    }


# ---------------------------------------------------------------------------------------------------------------------
# 4. The stress-set cases
# ---------------------------------------------------------------------------------------------------------------------
def from_hex(h):
    return ''.join(chr(int(x, 16)) for x in h.split(' ')) if h else ''


def cases(raw):
    text = raw.decode('utf-8')
    obj = json.loads(text)
    canon = json.dumps(obj, indent=1) + '\n'
    res = {'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw), 'canonical': canon == text, 'groups': {}}
    for g in obj['groups']:
        lows, refs = [], []
        for h in obj['cases'][g]:
            s = from_hex(h)
            lows.append(hxs(s.lower()))
            refs.append(hxs(reference(s)))
        res['groups'][g] = {'lower': lows, 'ref': refs}
    return res


def versions():
    return {'python': platform.python_version(), 'unidata': unicodedata.unidata_version,
            'machine': '%s-%s' % (sys.platform, platform.machine())}


def main():
    args = sys.argv[1:]
    if args == ['--cases']:
        sys.stdout.write(json.dumps(cases(sys.stdin.buffer.read()), separators=(',', ':')))
        return
    texts, counts, state, ms_sweep = sweep()
    table, tinfo, ms_table = build_table(state)
    tcheck, ms_check = table_check(table, state)
    t0 = time.perf_counter()
    wp = wordpiece()
    ms_wp = (time.perf_counter() - t0) * 1000
    res = {'versions': versions(), 'texts': texts, 'sha': {k: sha(v) for k, v in texts.items()}, 'counts': counts,
           'table': tinfo, 'tableCheck': tcheck, 'wordpiece': wp,
           'ms': {'sweep': ms_sweep, 'table': ms_table, 'check': ms_check, 'wordpiece': ms_wp}}
    if args == ['--sweep']:
        sys.stdout.write(json.dumps(res, separators=(',', ':')))
        return
    # Standalone report.
    pin = '  ' if unicodedata.unidata_version == AUTHORITY else '~ '
    v = res['versions']
    print('S6 s6_unicode_wordpiece.py (Python half of S6): Python\'s Unicode behaviour, the prototype 15.1 table, the toy WordPiece')
    print('~ python %s, unicodedata %s, %s' % (v['python'], v['unidata'], v['machine']))
    for k in ('gc', 'lower', 'nfd', 'mn', 'sigma', 'ordp'):
        print('%ssweep %s: %d lines, sha256 %s' % (pin, k, texts[k].count('\n'), res['sha'][k]))
    print('%scounts %s' % (pin, json.dumps(counts, sort_keys=True)))
    print('%stable %s' % (pin, json.dumps(tinfo, sort_keys=True)))
    print('%stable check %s' % (pin, json.dumps(tcheck, sort_keys=True)))
    wpd = {k: wp[k] for k in wp if k not in ('tokPerSec', 'mbPerSec', 'reps', 'bestMs')}
    print('  wordpiece %s' % json.dumps(wpd, sort_keys=True))
    print('~ wordpiece throughput %.0f tokens/s, %.3f MB/s (best of %d)' % (wp['tokPerSec'], wp['mbPerSec'], wp['reps']))
    path = os.path.join(HERE, 's6_stress_set_v1.json')
    if os.path.exists(path):
        with open(path, 'rb') as f:
            raw = f.read()
        c = cases(raw)
        dig = hashlib.sha256()
        for g in c['groups']:
            for x in c['groups'][g]['ref']:
                dig.update((x + '\n').encode('ascii'))
        print('  s6_stress_set_v1.json: %d B, sha256 %s, canonical %s' % (c['bytes'], c['sha256'], c['canonical']))
        print('%sreference normaliser outputs on its cases, sha256 %s' % (pin, dig.hexdigest()))
    print('~ ms %s' % json.dumps({k: round(x) for k, x in res['ms'].items()}, sort_keys=True))


if __name__ == '__main__':
    main()
