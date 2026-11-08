#!/usr/bin/env python3
"""Hyperbolic Lexicon: pins V1, bert-base-uncased's vocab.txt, L1's second vocabulary cell (Phase 1; D4,
Amendment 1 item 3).

    python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_vocab_v1.py"           fetch (once) and write the meta
    python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_vocab_v1.py" --check   verify the cached file

Without --check: reads the model's current commit from https://huggingface.co/api/models/google-bert/bert-base-uncased
(field 'sha'), fetches https://huggingface.co/google-bert/bert-base-uncased/resolve/<sha>/vocab.txt with curl into
the cache (lexicon.CACHE/bert-base-uncased/<sha>/vocab.txt, outside git) and writes vocab_v1.meta.json: the
revision, the URL, the size, the SHA-256, the entry count (30,522), the ids of [PAD] [UNK] [CLS] [SEP] [MASK] and
the licence (Apache-2.0). When vocab_v1.meta.json already exists, its revision is kept and the file fetched from it,
so a rerun never moves the pin. Nothing downloaded is executed: the API answer is parsed as JSON and the vocabulary
is read as UTF-8 text.

--check: exit 0 when the cached file matches the meta (bytes, SHA-256, entries, special ids), 1 on a mismatch,
2 "skipped" when the file is not cached.
"""
import hashlib
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from lexicon import wordpiece  # noqa: E402

MODEL = 'google-bert/bert-base-uncased'
API = f'https://huggingface.co/api/models/{MODEL}'
META = wordpiece.V1_META
EXPECT = {'entries': 30522, 'specials': {'[PAD]': 0, '[UNK]': 100, '[CLS]': 101, '[SEP]': 102, '[MASK]': 103}}


def curl(url, out=None):
    args = ['curl', '-sS', '--fail', '-L', url]
    if out:
        args[1:1] = ['-o', out]
    return subprocess.run(args, check=True, capture_output=out is None).stdout


def describe(blob, revision):
    v = wordpiece.Vocab.from_bytes(blob, name='V1')
    return {
        'name': 'V1 bert-base-uncased',
        'model': MODEL,
        'revision': revision,
        'url': wordpiece.v1_url(revision),
        'cachePath': f'bert-base-uncased/{revision}/vocab.txt (under lexicon.CACHE)',
        'bytes': len(blob),
        'sha256': hashlib.sha256(blob).hexdigest(),
        'entries': len(v),
        'specials': {e: v.ids[e] for e in wordpiece.SPECIALS},
        'licence': 'Apache-2.0',
    }


def main():
    check = '--check' in sys.argv[1:]
    old = json.load(open(META)) if os.path.exists(META) else None
    if check:
        if old is None:
            print('MISMATCH: no vocab_v1.meta.json', file=sys.stderr)
            return 1
        path = wordpiece.v1_path(old['revision'])
        if not os.path.exists(path):
            print(f'skipped: V1 not cached at {path} (run without --check to fetch it)', file=sys.stderr)
            return 2
        got = describe(open(path, 'rb').read(), old['revision'])
        if got == old:
            print(f'vocab_v1.meta.json matches the cached vocab.txt at {MODEL}@{old["revision"][:12]}: '
                  f'{got["entries"]} entries, sha256 {got["sha256"]}')
            return 0
        print(f'MISMATCH: cached file gives {json.dumps(got)}', file=sys.stderr)
        return 1
    if old is not None:
        revision = old['revision']
    else:
        revision = json.loads(curl(API).decode('utf-8'))['sha']
        if not (len(revision) == 40 and all(c in '0123456789abcdef' for c in revision)):
            raise SystemExit(f'unexpected revision {revision!r}')
    path = wordpiece.v1_path(revision)
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tmp = path + '.part'
        curl(wordpiece.v1_url(revision), out=tmp)
        os.replace(tmp, path)
    meta = describe(open(path, 'rb').read(), revision)
    for k, v in EXPECT.items():
        if meta[k] != v:
            raise SystemExit(f'refused: {k} is {meta[k]}, expected {v}')
    if old is not None and old != meta:
        raise SystemExit(f'refused: the cached file disagrees with the committed meta: {json.dumps(meta)}')
    with open(META, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(meta, indent=1) + '\n')
    print(f'wrote vocab_v1.meta.json: {MODEL}@{revision}, {meta["entries"]} entries, sha256 {meta["sha256"]}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
