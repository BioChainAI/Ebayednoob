"""WordPiece on N_B words, the id stream, the V0 "lex0" trainer and the reported tokenizer metrics (L1; D4;
Amendment 1 items 2 and 3).

    v = Vocab.load(path)                      one entry per line (LF after each), id = line number; v.unk = id of [UNK]
    ids, pieces, spans = encode(data, v)      data: UTF-8 bytes; spans are byte spans [start, end) into data
    encode(data, v, shortest=True)            L1's control 2 (shortest matching piece first)
    leb128(ids), id_stream([ids, ...])        LEB128(count) then LEB128 of each id, per instance, in order
    entries, info = train_v0(word_counts)     the V0 trainer (item 3); corpus_counts(strings) builds its corpus
    metrics(strings, v)                       fertility, continued-word rate, bytes per token, Renyi efficiency, ...
    load_v0(), load_v1(), v1_available()      the pinned vocabularies, refused unless their SHA-256 is the meta's

WordPiece is BERT's WordpieceTokenizer, counting characters as code points: greedy longest-match-first from the
left, continuation pieces written '##' + piece; a word of more than 100 code points, or one with no complete match,
is one [UNK]; a fail-closed word is one [UNK]. A piece's byte span is the smallest start and largest end of its code
points' source spans (as in N_B); an [UNK] word's span is the word's span. An instance's ids carry no [CLS] or
[SEP].

The V0 trainer (item 3), in brief: the corpus is N_B's words of L1 instance (a) without fail-closed words and words
of more than 100 code points, counted by frequency; a word is its first code point c, then '##' + each later code
point; entries 0-4 are the specials, then c for every code point seen (code-point order), then '##' + c for each;
then repeatedly the adjacent pair with the largest frequency-weighted count (ties to the smallest (left, right) in
code-point string order) is merged in every word, left to right without overlap, and the merged symbol (left + right
without its '##') appended unless already an entry; stop at 8,192 entries or when the largest count is below 2.
Pair counts are kept incrementally (only the words holding the merged pair are recounted) with a lazy max-heap.
"""
import hashlib
import heapq
import json
import math
import os

from . import CACHE, GOLDEN
from .normalise import UNK, nb

SPECIALS = ('[PAD]', '[UNK]', '[CLS]', '[SEP]', '[MASK]')
MAX_CHARS = 100        # BERT's max_input_chars_per_word
V0_SIZE = 8192
RENYI_ALPHA = 2.5
V0_PATH = os.path.join(GOLDEN, 'vocab_v0_lex0.txt')
V0_META = os.path.join(GOLDEN, 'vocab_v0.meta.json')
V1_META = os.path.join(GOLDEN, 'vocab_v1.meta.json')


class Vocab:
    """A vocabulary: entries in id order and the map from entry to id (each entry must be distinct)."""

    def __init__(self, entries, name=None):
        self.entries = list(entries)
        self.ids = {}
        for i, e in enumerate(self.entries):
            if e in self.ids:
                raise ValueError(f'duplicate vocabulary entry {e!r} at ids {self.ids[e]} and {i}')
            if e == '' or '\n' in e:
                raise ValueError(f'bad vocabulary entry {e!r} at id {i}')
            self.ids[e] = i
        if UNK not in self.ids:
            raise ValueError('the vocabulary has no [UNK]')
        self.unk = self.ids[UNK]
        self.name = name
        self.max_len = max(len(e) for e in self.entries)   # bounds the match loop; changes no result
        self._memo = {}

    @classmethod
    def load(cls, path, name=None):
        return cls.from_bytes(open(path, 'rb').read(), name=name)

    @classmethod
    def from_bytes(cls, blob, name=None):
        text = blob.decode('utf-8')
        if not text.endswith('\n'):
            raise ValueError('a vocabulary file ends with LF')
        return cls(text[:-1].split('\n'), name=name)

    def to_bytes(self):
        return ''.join(e + '\n' for e in self.entries).encode('utf-8')

    @property
    def sha256(self):
        return hashlib.sha256(self.to_bytes()).hexdigest()

    def __len__(self):
        return len(self.entries)

    def word(self, w, shortest=False):
        """The pieces of one N_B word as (id, piece, cp_start, cp_end) tuples (memoised per word)."""
        key = (w, shortest)
        hit = self._memo.get(key)
        if hit is None:
            hit = self._memo[key] = tuple(_wordpiece(w, self.ids, self.unk, self.max_len, shortest))
        return hit


def _pinned(path, meta_path, name):
    meta = json.load(open(meta_path))
    blob = open(path, 'rb').read()
    digest = hashlib.sha256(blob).hexdigest()
    if digest != meta['sha256'] or len(blob) != meta['bytes']:
        raise ValueError(f'{path}: sha256 {digest} is not the pinned {meta["sha256"]}')
    return Vocab.from_bytes(blob, name=name)


def load_v0():
    """V0 "lex0" (golden/vocab_v0_lex0.txt), checked against golden/vocab_v0.meta.json."""
    return _pinned(V0_PATH, V0_META, 'V0')


def v1_url(revision):
    return f'https://huggingface.co/google-bert/bert-base-uncased/resolve/{revision}/vocab.txt'


def v1_path(revision=None):
    """The cached V1 file (outside git) for a revision (default: the pinned one)."""
    if revision is None:
        revision = json.load(open(V1_META))['revision']
    return os.path.join(CACHE, 'bert-base-uncased', revision, 'vocab.txt')


def v1_available():
    return os.path.exists(V1_META) and os.path.exists(v1_path())


def load_v1():
    """V1 bert-base-uncased vocab.txt from the cache, checked against golden/vocab_v1.meta.json."""
    if not v1_available():
        raise FileNotFoundError('V1 is not cached: run golden/make_vocab_v1.py')
    return _pinned(v1_path(), V1_META, 'V1')


def _wordpiece(w, ids, unk, max_len, shortest):
    n = len(w)
    if n > MAX_CHARS:
        return [(unk, UNK, 0, n)]
    out, start = [], 0
    while start < n:
        hit = None
        if shortest:
            for end in range(start + 1, min(n, start + max_len) + 1):
                sub = w[start:end] if start == 0 else '##' + w[start:end]
                i = ids.get(sub)
                if i is not None:
                    hit = (i, sub, start, end)
                    break
        else:
            for end in range(min(n, start + max_len), start, -1):
                sub = w[start:end] if start == 0 else '##' + w[start:end]
                i = ids.get(sub)
                if i is not None:
                    hit = (i, sub, start, end)
                    break
        if hit is None:
            return [(unk, UNK, 0, n)]
        out.append(hit)
        start = hit[3]
    return out


def encode_nb(r, vocab, shortest=False):
    """WordPiece over an N_B result: (ids, pieces, byte spans)."""
    ids, pieces, spans = [], [], []
    for w, bad, sp, src in zip(r.words, r.failed, r.spans, r.src):
        if bad:
            ids.append(vocab.unk)
            pieces.append(UNK)
            spans.append(sp)
            continue
        for i, piece, a, b in vocab.word(w, shortest):
            ids.append(i)
            pieces.append(piece)
            if a == 0 and b == len(w):
                spans.append(sp)
            else:
                part = src[a:b]
                spans.append((r.cp_span(min(part))[0], r.cp_span(max(part))[1]))
    return ids, pieces, spans


def encode(data, vocab, shortest=False, strip_accents=True):
    """N_B, then WordPiece: (ids, pieces, byte spans) of one UTF-8 instance."""
    return encode_nb(nb(data, strip_accents=strip_accents), vocab, shortest)


def leb128(ids):
    """Unsigned LEB128 of each id: seven bits per byte, low bits first, top bit set on all but the last byte."""
    out = bytearray()
    for x in ids:
        if x < 0:
            raise ValueError('LEB128 here is unsigned')
        while True:
            b = x & 0x7F
            x >>= 7
            if x:
                out.append(b | 0x80)
            else:
                out.append(b)
                break
    return bytes(out)


def id_stream(id_lists):
    """Amendment 1 item 2: over the instances in order, LEB128(number of ids) then LEB128 of each id."""
    out = bytearray()
    for ids in id_lists:
        out += leb128([len(ids)])
        out += leb128(ids)
    return bytes(out)


# ---------------------------------------------------------------------------------------------------------------------
# The V0 "lex0" trainer (Amendment 1 item 3)
# ---------------------------------------------------------------------------------------------------------------------
def corpus_counts(strings, strip_accents=True):
    """Item 3.1: N_B words of the strings (bytes or str), fail-closed words and words of more than 100 code points
    left out, counted by frequency. Returns (counts, info)."""
    counts, failed, long_words, total = {}, 0, 0, 0
    for s in strings:
        r = nb(s.encode('utf-8') if isinstance(s, str) else s, strip_accents=strip_accents)
        for w, bad in zip(r.words, r.failed):
            if bad:
                failed += 1
            elif len(w) > MAX_CHARS:
                long_words += 1
            else:
                counts[w] = counts.get(w, 0) + 1
                total += 1
    return counts, {'words': total, 'distinctWords': len(counts), 'failClosedLeftOut': failed,
                    'longLeftOut': long_words}


def train_v0(word_counts, size=V0_SIZE, specials=SPECIALS):
    """Item 3.2-3.5. word_counts maps a word to its frequency. Returns (entries, info)."""
    alphabet = sorted({ord(c) for w in word_counts for c in w})
    entries = list(specials) + [chr(c) for c in alphabet] + ['##' + chr(c) for c in alphabet]
    known = set(entries)
    if len(known) != len(entries):
        raise ValueError('a special entry collides with the alphabet')
    words = []   # [symbols, frequency], in sorted word order (the order changes no count)
    for w in sorted(word_counts):
        words.append([[w[0]] + ['##' + c for c in w[1:]], word_counts[w]])

    count = {}       # (left, right) -> weighted count of adjacent positions
    where = {}       # (left, right) -> indices of words that held it when last counted (a superset)
    for wi, (syms, f) in enumerate(words):
        for p in zip(syms, syms[1:]):
            count[p] = count.get(p, 0) + f
            where.setdefault(p, set()).add(wi)
    heap = [(-c, a, b) for (a, b), c in count.items()]
    heapq.heapify(heap)

    merges = added = 0
    stop = None
    while True:
        if len(entries) >= size:
            stop = f'reached {size} entries'
            break
        best = None
        while heap:
            negc, a, b = heap[0]
            if count.get((a, b), 0) == -negc:
                best = (a, b, -negc)
                break
            heapq.heappop(heap)       # stale: its count changed since it was pushed
        if best is None:
            stop = 'no adjacent pair left'
            break
        a, b, c = best
        if c < 2:
            stop = 'largest count below 2'
            break
        heapq.heappop(heap)
        merged = a + b[2:]            # b is never word-initial, so it starts with '##'
        delta = {}
        for wi in where.pop((a, b), ()):
            syms, f = words[wi]
            if len(syms) < 2:
                continue
            new, i, n, hit = [], 0, len(syms), False
            while i < n:
                if i + 1 < n and syms[i] == a and syms[i + 1] == b:
                    new.append(merged)
                    i += 2
                    hit = True
                else:
                    new.append(syms[i])
                    i += 1
            if not hit:
                continue
            for p in zip(syms, syms[1:]):
                delta[p] = delta.get(p, 0) - f
            for p in zip(new, new[1:]):
                delta[p] = delta.get(p, 0) + f
                s = where.get(p)
                if s is None:
                    where[p] = {wi}
                else:
                    s.add(wi)
            words[wi][0] = new
        for p, d in delta.items():
            if d == 0:
                continue
            v = count.get(p, 0) + d
            if v:
                count[p] = v
                heapq.heappush(heap, (-v, p[0], p[1]))
            else:
                count.pop(p, None)
        if (a, b) in count:         # a left-to-right merge leaves no (a, b) behind
            raise AssertionError(f'pair {(a, b)!r} survived its merge')
        merges += 1
        if merged not in known:
            known.add(merged)
            entries.append(merged)
            added += 1
    info = {'entries': len(entries), 'alphabetCodePoints': len(alphabet), 'alphabetEntries': 2 * len(alphabet),
            'specials': len(specials), 'merges': merges, 'mergesAdded': added,
            'mergesNotAdded': merges - added, 'stop': stop}
    return entries, info


# ---------------------------------------------------------------------------------------------------------------------
# Reported metrics (L1: reported, never decisive)
# ---------------------------------------------------------------------------------------------------------------------
def renyi_efficiency(token_counts, vocab_size, alpha=RENYI_ALPHA):
    """Zouhar et al. 2023 ("Tokenization and the Noiseless Channel"): H_alpha(p) / log |V|, where p is the unigram
    distribution of the tokens in the encoded corpus, H_alpha(p) = log(sum_i p_i^alpha) / (1 - alpha) the Renyi
    entropy of order alpha, and |V| the vocabulary's number of entries (the base of log cancels). The package
    tokenization-scorer divides by the number of distinct tokens observed instead; that variant is
    renyi_efficiency(counts, len(counts))."""
    total = sum(token_counts.values())
    if total == 0 or vocab_size < 2:
        return float('nan')
    s = math.fsum((c / total) ** alpha for c in token_counts.values())
    return (math.log(s) / (1 - alpha)) / math.log(vocab_size)


def metrics(strings, vocab, shortest=False, strip_accents=True):
    """The reported tokenizer metrics of L1 over instance strings (str or UTF-8 bytes):
        fertility            pieces per N_B word (an [UNK] word is one piece)
        continuedWordRate    share of N_B words split into 2 or more pieces
        bytesPerToken        input UTF-8 bytes / tokens
        renyiEfficiency      at alpha = 2.5, over |V| = the vocabulary's entries (renyiEfficiencyObserved: over the
                             distinct tokens seen)
        unkRate              share of tokens that are [UNK]
        failClosed           fail-closed words; longWords: words of more than 100 code points"""
    words = tokens = continued = nbytes = unk = failed = long_words = 0
    counts = {}
    for s in strings:
        data = s.encode('utf-8') if isinstance(s, str) else bytes(s)
        nbytes += len(data)
        r = nb(data, strip_accents=strip_accents)
        for w, bad in zip(r.words, r.failed):
            words += 1
            if bad:
                failed += 1
                ps = ((vocab.unk,),)
            else:
                if len(w) > MAX_CHARS:
                    long_words += 1
                ps = vocab.word(w, shortest)
            tokens += len(ps)
            continued += len(ps) >= 2
            for p in ps:
                counts[p[0]] = counts.get(p[0], 0) + 1
    unk = counts.get(vocab.unk, 0)
    return {
        'strings': len(strings), 'bytes': nbytes, 'words': words, 'tokens': tokens,
        'fertility': tokens / words if words else float('nan'),
        'continuedWordRate': continued / words if words else float('nan'),
        'bytesPerToken': nbytes / tokens if tokens else float('nan'),
        'renyiEfficiency': renyi_efficiency(counts, len(vocab)),
        'renyiEfficiencyObserved': renyi_efficiency(counts, len(counts)),
        'distinctTokens': len(counts),
        'unk': unk, 'unkRate': unk / tokens if tokens else float('nan'),
        'failClosed': failed, 'longWords': long_words,
    }
