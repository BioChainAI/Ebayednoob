#!/usr/bin/env python3
"""Hyperbolic Lexicon: pins the content and order of L1's four instance lists (PREREGISTRATION.md L1, Amendment 1
item 2), so a loader that reorders parts of speech, EWT splits or stress-set groups is caught, here and in Node.

    python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_l1_instances_v1.py"            write l1_instances_v1.meta.json
    python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_l1_instances_v1.py" --check    recompute and compare

Each list is pinned by its count and lexicon.l1.digest: SHA-256 over, per string in order, its UTF-8 length as 8 bytes
big-endian, then its UTF-8 bytes. Hashing an instance is not using it: nothing is normalised or tokenized here.
--check exits 0 equal, 1 different, 2 "skipped" when the WordNet or UD EWT cache is missing.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from lexicon import l1, wordnet  # noqa: E402

META = os.path.join(HERE, 'l1_instances_v1.meta.json')


def build():
    wn = wordnet.load()
    inst = {'a': l1.instance_a(wn), 'b': l1.instance_b(), 'c': l1.instance_c(), 'd': l1.instance_d()}
    return {
        'definition': 'per instance list, in order: count, and sha256 over each string as 8-byte big-endian UTF-8 '
                      'length then its UTF-8 bytes (lexicon.l1.digest)',
        'instances': {k: {'count': len(v), 'sha256': l1.digest(v)} for k, v in inst.items()},
        'dry_d': {'count': 2000, 'sha256': l1.digest([l1.dry(i) for i in range(2000)]),
                  'note': 'Rng(4000 + i) strings from the same pool (dry runs only)'},
    }


def main():
    if not wordnet.available() or not l1.ewt_available():
        print('skipped: the WordNet or UD EWT cache is missing (golden/make_wordnet_v1.cjs, make_ewt_v1.cjs)',
              file=sys.stderr)
        return 2
    meta = build()
    text = json.dumps(meta, indent=1) + '\n'
    if '--check' in sys.argv[1:]:
        if os.path.exists(META) and open(META, encoding='utf-8').read() == text:
            print('l1_instances_v1.meta.json matches: ' + ', '.join(
                f"({k}) {v['count']}" for k, v in meta['instances'].items()))
            return 0
        print('MISMATCH: l1_instances_v1.meta.json', file=sys.stderr)
        return 1
    with open(META, 'w', encoding='utf-8') as f:
        f.write(text)
    print('wrote l1_instances_v1.meta.json: ' + ', '.join(f"({k}) {v['count']}" for k, v in meta['instances'].items()))
    return 0


if __name__ == '__main__':
    sys.exit(main())
