#!/usr/bin/env python3
"""Hyperbolic Lexicon: trains and pins V0 "lex0", L1's decisive vocabulary (Phase 1; D4, Amendment 1 item 3).

    python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_vocab_v0.py"           train, write vocab and meta
    python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_vocab_v0.py" --check   retrain and compare SHA-256

The corpus is L1 instance (a), every WordNet 3.0 gloss field (lexicon.wordnet.glosses, 117,659 strings), through
N_B (lexicon.normalise.nb), without fail-closed words and words of more than 100 code points, counted by frequency.
The trainer is lexicon.wordpiece.train_v0, which is item 3 exactly: specials at ids 0-4, both alphabet forms, then
the merges in order until 8,192 entries or a largest count below 2. It is deterministic and single-threaded.

Writes vocab_v0_lex0.txt (one entry per line, LF after each, id = line number) and vocab_v0.meta.json (its SHA-256,
the entry and alphabet counts, merges done, the stop reason, the corpus word counts; the training time is marked
machine-dependent). V0 is frozen when the vocabulary file is committed, before any decisive run.

--check retrains and compares the SHA-256 (and the meta's counts): exit 0 equal, 1 mismatch, 2 "skipped" when the
WordNet archive is not in the cache (lexicon.CACHE; run golden/make_wordnet_v1.cjs first). Runtime: about 5 s.
"""
import hashlib
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from lexicon import wordnet, wordpiece  # noqa: E402

VOCAB = os.path.join(HERE, 'vocab_v0_lex0.txt')
META = os.path.join(HERE, 'vocab_v0.meta.json')


def train():
    t0 = time.perf_counter()
    strings = wordnet.glosses(wordnet.load())
    counts, cinfo = wordpiece.corpus_counts(strings)
    t1 = time.perf_counter()
    entries, tinfo = wordpiece.train_v0(counts)
    t2 = time.perf_counter()
    vocab = wordpiece.Vocab(entries, name='V0')
    blob = vocab.to_bytes()
    meta = {
        'name': 'V0 "lex0"',
        'file': os.path.basename(VOCAB),
        'bytes': len(blob),
        'sha256': hashlib.sha256(blob).hexdigest(),
        'entries': tinfo['entries'],
        'specials': {e: vocab.ids[e] for e in wordpiece.SPECIALS},
        'alphabetCodePoints': tinfo['alphabetCodePoints'],
        'alphabetEntries': tinfo['alphabetEntries'],
        'merges': tinfo['merges'],
        'mergesAdded': tinfo['mergesAdded'],
        'mergesNotAdded': tinfo['mergesNotAdded'],
        'stop': tinfo['stop'],
        'corpus': {
            'instance': 'L1 (a): wordnet.glosses(wn), 117,659 strings, through N_B',
            'strings': len(strings),
            'words': cinfo['words'],
            'distinctWords': cinfo['distinctWords'],
            'failClosedLeftOut': cinfo['failClosedLeftOut'],
            'longLeftOut': cinfo['longLeftOut'],
        },
        'algorithm': 'PREREGISTRATION.md Amendment 1 item 3; lexicon/wordpiece.py train_v0',
        '~machineDependent': {'corpusSeconds': round(t1 - t0, 2), 'trainSeconds': round(t2 - t1, 2)},
    }
    return blob, meta


def comparable(meta):
    return {k: v for k, v in meta.items() if not k.startswith('~')}


def main():
    check = '--check' in sys.argv[1:]
    if not wordnet.available():
        if check:
            print(f'skipped: no WordNet archive at {wordnet.ZIP_PATH} (run golden/make_wordnet_v1.cjs)', file=sys.stderr)
            return 2
        raise SystemExit(f'no WordNet archive at {wordnet.ZIP_PATH}: run golden/make_wordnet_v1.cjs first')
    blob, meta = train()
    if check:
        committed = open(VOCAB, 'rb').read() if os.path.exists(VOCAB) else b''
        old = json.load(open(META)) if os.path.exists(META) else {}
        digest = hashlib.sha256(committed).hexdigest()
        if digest == meta['sha256'] == old.get('sha256') and comparable(old) == comparable(meta):
            print(f'vocab_v0_lex0.txt matches a retrain: {meta["entries"]} entries, sha256 {digest} '
                  f'(~{meta["~machineDependent"]["trainSeconds"]} s)')
            return 0
        print(f'MISMATCH: retrained sha256 {meta["sha256"]}, committed file {digest}, meta {old.get("sha256")}',
              file=sys.stderr)
        return 1
    with open(VOCAB, 'wb') as f:
        f.write(blob)
    with open(META, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(meta, indent=1, ensure_ascii=False) + '\n')
    print(f'wrote vocab_v0_lex0.txt: {meta["entries"]} entries ({meta["stop"]}), {meta["merges"]} merges, '
          f'sha256 {meta["sha256"]}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
