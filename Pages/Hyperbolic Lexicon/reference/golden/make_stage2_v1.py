#!/usr/bin/env python3
"""Hyperbolic Lexicon, Stage 2 (Amendment 13 item 2): fetch and check the pinned data, and write the instance manifest.

    python3 -B -I make_stage2_v1.py                      fetch every pinned file into its own new folder
                                                         ~/.cache/hyperbolic-lexicon/stage2/<name>/, then check it
    python3 -B -I make_stage2_v1.py --source DIR ...     the same, taking a file from DIR (searched recursively, no
                                                         symlinks followed) when its name, size and SHA-256 match
                                                         the pin, instead of downloading it
    python3 -B -I make_stage2_v1.py --check              verify every pin: each file's size and SHA-256, HiT's API
                                                         MD5, and every member used of each archive (GloVe's two
                                                         text members streamed out of the zip); exit 0 all equal,
                                                         1 any difference or missing file
    python3 -B -I make_stage2_v1.py --manifest           write golden/stage2_instances_v1.meta.json (counting only)
    python3 -B -I make_stage2_v1.py --check-manifest     rebuild the manifest in memory and compare (exit 0 / 1)
    --root DIR, --pins FILE                              another cache root or pins file (tests)

Hygiene (A13.2): each fetched file goes into a folder created for it, empty before; a download lands in a temporary
name there and is renamed only after its size and SHA-256 match. Nothing fetched is executed or imported. Parsing runs
under `python3 -B -I` (this script puts reference/ on sys.path itself).

The manifest (A13.2) holds, for every instance of L12-L15 and of item 11: the source SHA-256; the row count; the
covered count in each universe used and the SHA-256 of the covered row numbers (0-based data rows after any header,
decimal, LF-joined, no final LF); the SHA-256 of the N_S pairs 'x<TAB>y' in row order; the clusters (count, and the
SHA-256 of their keys in row order); the word types of each rho set (count, and the SHA-256 of their N_S forms in
code-point order, LF-joined); and the GloVe-covered rows. It reads word, POS, MEN tag and fold fields and HiT's names
only: no rating, label, relation or TYPE.
"""
import argparse
import hashlib
import json
import os
import shutil
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REFERENCE = os.path.dirname(HERE)
sys.path.insert(0, REFERENCE)
from lexicon import glove, hit, senses, stage2data, wordnet  # noqa: E402

META = os.path.join(HERE, 'stage2_instances_v1.meta.json')
USER_AGENT = 'hyperbolic-lexicon-stage2/1'


# ================================================================ fetch
def _find_source(pin, dirs):
    for d in dirs or ():
        for base, subdirs, files in os.walk(d, followlinks=False):
            subdirs.sort()
            if pin['file'] in files:
                p = os.path.join(base, pin['file'])
                if not os.path.islink(p) and os.path.getsize(p) == pin['bytes']:
                    digest, _ = stage2data.sha256_file(p)
                    if digest == pin['sha256']:
                        return p
    return None


def _download(url, dest, timeout=120):
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp, open(dest, 'wb') as out:
        shutil.copyfileobj(resp, out, 1 << 20)


def fetch(pins, root, sources=(), log=print):
    """Fetch (or copy from sources) each pinned file that is not already present and correct. A folder that exists
    but does not hold the pinned file is refused, not reused."""
    os.makedirs(root, exist_ok=True)
    failed = []
    for pin in pins['files']:
        folder = os.path.join(root, pin['name'])
        dest = os.path.join(folder, pin['file'])
        if os.path.isdir(folder):
            problems = stage2data.check_pin(pin, root)
            if not problems:
                log(f'ok      {pin["name"]}')
                continue
            failed.append(pin['name'])
            log(f'REFUSED {pin["name"]}: {folder} exists but does not hold the pinned file ({problems[0]}); '
                f'remove the folder to fetch it again')
            continue
        os.makedirs(folder)
        tmp = os.path.join(folder, '.partial-' + pin['file'])
        try:
            src = _find_source(pin, sources)
            if src is not None:
                shutil.copyfile(src, tmp)
                how = f'copied from {src}'
            else:
                _download(pin['url'], tmp)
                how = f'downloaded {pin["url"]}'
            digest, n = stage2data.sha256_file(tmp)
            if n != pin['bytes'] or digest != pin['sha256']:
                raise stage2data.PinError(f'{n} B SHA-256 {digest}, pinned {pin["bytes"]} B {pin["sha256"]}')
            os.rename(tmp, dest)
            problems = stage2data.check_pin(pin, root)
            if problems:
                raise stage2data.PinError('; '.join(problems))
            log(f'fetched {pin["name"]}: {how}')
        except Exception as e:  # noqa: BLE001 (any failure removes the new folder and is reported)
            failed.append(pin['name'])
            shutil.rmtree(folder, ignore_errors=True)
            log(f'FAILED  {pin["name"]}: {e}')
    return failed


# ================================================================ the instance manifest
def _sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def _cov(rows, U, wn, vocab=None):
    r = senses.covered_rows(rows, U, wn, vocab)
    return r, {'count': len(r), 'rowsSha256': senses.rows_sha(r)}


def _types(rows, keep):
    keep = set(keep)
    t = senses.word_types([(x, y) for r, x, y in rows if r in keep])
    return {'count': len(t), 'sha256': senses.word_types_sha(t)}


def word_instance(store, wn, U, vocab, key, rows, file_rows, selection, claims, universes=('U_full',), rho=False,
                  clusters=None, glove_rows=True):
    """One manifest entry for a word-pair instance. rows: [(row, x, y)] selected by word-level fields.
    READING (A13.2, "the row count ... the SHA-256 of the N_S pairs x<TAB>y in row order"): the row count and the
    N_S pairs are those of the rows the selection keeps (POS, tag or fold), before coverage; the covered rows of each
    universe follow with their own count and hash.
    READING (A13.2, "the GloVe-covered rows"): GloVe coverage uses glove.6B.300d.txt's vocabulary (the decided
    member; the 50-d member's vocabulary is checked equal) and is recorded for every word set, not only L15(b)'s and
    BD's.
    READING (A13.2, "the clusters ... their keys in row order"): keys are the raw word fields (BD: word1; WB: the
    BLESS concept), over the rows covered in U_full."""
    out = {
        'claims': claims,
        'source': {'key': key, 'pin': stage2data.SOURCES[key][0], 'member': stage2data.SOURCES[key][1],
                   'sha256': store.sha256(key)},
        'selection': selection,
        'fileRows': file_rows,
        'rows': len(rows),
        'rowsSha256': senses.rows_sha([r for r, _, _ in rows]),
        'nsPairsSha256': senses.ns_pairs_sha([(x, y) for _, x, y in rows]),
        # A13.3: "Non-ASCII words are kept and counted": distinct N_S forms of the selected rows with a non-ASCII
        # character, and the distinct words that N_S changed (an ASCII capital or a space)
        'nonAsciiWords': len({senses.N_S(w) for _, x, y in rows for w in (x, y) if any(ord(c) > 127 for c in w)}),
        'wordsChangedByNS': len({w for _, x, y in rows for w in (x, y) if senses.N_S(w) != w}),
        'covered': {},
    }
    covered = {}
    for u in universes:
        covered[u], out['covered'][u] = _cov(rows, U[u], wn)
    if glove_rows:
        covered['U_full+glove300'], out['gloveCovered'] = _cov(rows, U['U_full'], wn, vocab)
    if rho:
        out['wordTypes'] = {u: _types(rows, covered[u]) for u in covered}
    if clusters is not None:
        name, keyfn = clusters
        keep = set(covered['U_full'])
        keys = [keyfn(x, y) for r, x, y in rows if r in keep]
        if any(k is None for k in keys):
            raise ValueError(f'{key}: a covered row without a cluster key')
        out['clusters'] = {'key': name, 'over': 'U_full', 'count': len(set(keys)), 'keysSha256': senses.keys_sha(keys)}
    return out


def build_manifest(wn, store, vocab300, vocab50=None):
    U = {'U_full': senses.universe_full(wn)}
    g = senses.at_graph(wn)
    senses.check_at_graph(g)
    U['U_at'] = frozenset(g.nodes)
    full_sorted = sorted(U['U_full'])
    inst = {}

    hl = stage2data.hyperlex_words('hyperlex-all', store)
    inst['hyperlex-ccb4161-nouns'] = word_instance(
        store, wn, U, vocab300, 'hyperlex-all', [(r, x, y) for r, x, y, p in hl if p == 'N'], len(hl),
        "POS == 'N'; x = WORD1, y = WORD2", 'L12 (U_full); L14(b) (U_at); L15(b) (U_full+glove300); item 11',
        universes=('U_full', 'U_at'), rho=True)
    sp = stage2data.hyperlex_split_words(store)
    inst['hyperlex-ccb4161-nouns-random-test'] = word_instance(
        store, wn, U, vocab300, 'hyperlex-test-random', [(r, x, y) for r, x, y, p, _ in sp if p == 'N'], len(sp),
        "POS == 'N' (the random split's test file)", 'item 11 (L12, reported)', rho=True)
    rnd = stage2data.hyperlex_rnd_words(store)
    rnd_n = [(r, x, y) for r, x, y, p, f in rnd if p == 'N' and f == 'test']
    inst['suite-6891e0e-hyperlex_rnd-nouns-test'] = word_instance(
        store, wn, U, vocab300, 'hyperlex_rnd', rnd_n, len(rnd), "pos == 'N' and fold == 'test'",
        'item 11 (L12, reported; must agree with hyperlex-ccb4161-nouns-random-test)', rho=True)
    inst['suite-6891e0e-hyperlex_rnd-nouns-test']['agreesWithSplitFile'] = (
        [(x, y) for _, x, y in rnd_n] == [(x, y) for r, x, y, p, _ in sp if p == 'N'])

    concepts = stage2data.bless_concepts(store)
    for name in ('bless', 'wbless', 'leds', 'eval', 'shwartz'):
        rows = stage2data.suite_words(name, store)
        for fold in ('test', 'val'):
            sel = [(r, x, y) for r, x, y, f in rows if f == fold]
            # READING (A13.2 with A13.8): BD-dir has no entry of its own; its rows are chosen by a label in pass 2, so
            # the manifest (written from word fields only) records BD's covered rows, clusters and GloVe rows for it.
            claims = {('bless', 'test'): 'L13(a) BD and L13(c) BD-dir (pass 2 selects the True rows; both directions '
                                         'of every covered row are scored); control 3 (gloveCovered)',
                      ('wbless', 'test'): 'L13(b) WB'}.get((name, fold), 'item 11 (reported)')
            cl = None
            if name == 'bless':
                cl = ('word1', lambda x, y: x)
            elif name == 'wbless':
                cl = ('the BLESS concept: word1 if a bless.tsv word1 value, else word2',
                      lambda x, y: stage2data.wbless_cluster(x, y, concepts))
            e = word_instance(store, wn, U, vocab300, name, sel, len(rows), f"fold == '{fold}'", claims, clusters=cl)
            if name == 'eval':
                # READING (A13.11, "EVAL test as distinct ordered pairs"): a distinct N_S pair is represented by its
                # first row in file order; pass 2 drops and counts the pairs with both labels.
                first, seen = [], set()
                for r, x, y in sel:
                    p = (senses.N_S(x), senses.N_S(y))
                    if p not in seen:
                        seen.add(p)
                        first.append((r, x, y))
                e['distinctPairs'] = {'count': len(first), 'firstRowsSha256': senses.rows_sha([r for r, _, _ in first]),
                                      'covered': _cov(first, U['U_full'], wn)[1]}
            inst[f'suite-6891e0e-{name}-{fold}'] = e
        if name == 'wbless':
            inst['suite-6891e0e-wbless-all'] = word_instance(
                store, wn, U, vocab300, name, [(r, x, y) for r, x, y, _ in rows], len(rows), 'every row',
                "item 11 (the suite's 1,000 x 2% protocol: the in-vocabulary rows of the whole file)",
                clusters=('the BLESS concept', lambda x, y: stage2data.wbless_cluster(x, y, concepts)))
    bib = stage2data.suite_words('bibless', store)
    inst['suite-6891e0e-bibless-all'] = word_instance(
        store, wn, U, vocab300, 'bibless', [(r, x, y) for r, x, y, _ in bib], len(bib), 'every row (no fold column)',
        "item 11 (the suite's 1,000 x 2% protocol)")

    sl = stage2data.simlex_words(store)
    inst['simlex-fda1b39-nouns'] = word_instance(
        store, wn, U, vocab300, 'simlex', [(r, x, y) for r, x, y, p in sl if p == 'N'], len(sl), "POS == 'N'",
        'L15(a) SL; item 11 (GloVe, WN-path)', rho=True)
    men = stage2data.men_words(store)
    inst['men-0d05a99-nn'] = word_instance(
        store, wn, U, vocab300, 'men', [(r, x, y) for r, x, tx, y, ty in men if tx == '-n' and ty == '-n'], len(men),
        "both tags '-n', tags removed", 'L15(a) MEN; L15(b) (U_full+glove300)', rho=True)
    for key, iid, claims in (('ws353-rel', 'ws353-e2de627-rel', 'L15(b) WSR (U_full+glove300)'),
                             ('ws353-sim', 'ws353-e2de627-sim', 'item 11 (L15, reported)'),
                             ('ws353-combined', 'ws353-fda1b39-combined', 'item 11 (L15, reported)')):
        rows = stage2data.ws353_words(key, store)
        inst[iid] = word_instance(store, wn, U, vocab300, key, rows, len(rows), 'every row', claims, rho=True)

    names_map, _ = hit.resolve(wn, store)
    off_name = {o: n for n, o in names_map.items()}
    for split in ('test', 'val', 'train'):
        rows = hit.rows(split, names_map, store)
        e = {
            'claims': {'test': 'L14(a) (random: slots 0-10; hard: slots 0 and 11-20); controls 1-2; closure check',
                       'val': 'L14 tuning (step 5); item 11 F1 threshold (step 7)',
                       'train': 'L14: the training edges must equal E'}[split],
            'source': {'key': hit.KEYS[split], 'pin': 'hit-multi', 'member': stage2data.SOURCES[hit.KEYS[split]][1],
                       'sha256': store.sha256(hit.KEYS[split])},
            'selection': 'every row; names resolved by NLTK\'s rule (senses.hit_names), no senses',
            'fileRows': len(rows),
            'rows': len(rows),
            'rowsSha256': senses.rows_sha([r.row for r in rows]),
            'nsPairsSha256': _sha('\n'.join(f'{off_name[r.child]}\t{off_name[r.parent]}' for r in rows)),
            'slotsSha256': _sha('\n'.join(' '.join(off_name[x] for x in [r.child] + r.slots) for r in rows)),
            'covered': {'U_at': {'count': sum(1 for r in rows if all(x in U['U_at'] for x in [r.child] + r.slots)),
                                 'rowsSha256': senses.rows_sha([r.row for r in rows
                                                               if all(x in U['U_at'] for x in [r.child] + r.slots)])}},
        }
        if split != 'train':
            keys = [off_name[r.parent] for r in rows]
            e['clusters'] = {'key': 'the positive synset (parent) name', 'over': 'U_at', 'count': len(set(keys)),
                             'keysSha256': senses.keys_sha(keys)}
        inst[f'hit-zenodo14036213-multi-{split}'] = e

    gl = {'member300': store.sha256('glove-300'), 'words300': len(vocab300),
          'underscoreTokens300': glove.underscore_tokens(vocab300)}
    if vocab50 is not None:
        gl.update({'member50': store.sha256('glove-50'), 'words50': len(vocab50), 'vocabulary50Equals300':
                   vocab50 == vocab300})
    return {
        'definition': (
            'Amendment 13 item 2, the instance manifest, written by golden/make_stage2_v1.py --manifest from the '
            'pinned files and WordNet 3.0, counting only (word, POS, MEN tag and fold fields and HiT names; no '
            'rating, label, relation or TYPE). Row numbers are 0-based over the data rows after any header line, '
            'in file order. rows '
            'are the rows the selection keeps; covered[U] those covered in U (A13.3: S_U(x) and S_U(y) non-empty), '
            'rowsSha256 the SHA-256 of their decimal row numbers LF-joined without a final LF. nsPairsSha256 hashes '
            "the selected rows' N_S pairs 'x<TAB>y' in row order, LF-joined (HiT: child and parent names). "
            'gloveCovered: covered in U_full with both N_S words in glove.6B.300d.txt and neither containing "_" '
            "(A13.3; required by A13.2 for L15(b) and L13's control 3, recorded for every word set). wordTypes (rho "
            "sets): the distinct N_S forms of the covered rows' x and y values in code-point order, count and SHA-256 "
            'LF-joined. clusters: over the covered rows, count of distinct keys and the SHA-256 of the keys in row '
            'order, LF-joined. nonAsciiWords and wordsChangedByNS count distinct words of the selected rows (A13.3). '
            'HIT-R (item 11) is drawn from registered seeds in step 7 and is not listed; dry '
            '(verb) instances are counted for the definitions amendment, not listed.'),
        'amendment': 13,
        'pins': {'file': 'golden/stage2_pins_v1.json',
                 'sha256': stage2data.sha256_file(stage2data.PINS_FILE)[0]},
        'wordnet': {
            'zipSha256': wordnet.ZIP_SHA256,
            'U_full': {'count': len(full_sorted), 'sha256': _sha('\n'.join(full_sorted))},
            'U_at': {'count': len(g.nodes), 'sha256': g.nodes_sha()},
            'E': {'count': len(g.edges), 'sha256': g.edges_sha()},
            'T': g.n_indirect,
        },
        'glove': gl,
        'instances': inst,
    }


def manifest_text(meta):
    return json.dumps(meta, indent=1, sort_keys=False, ensure_ascii=True) + '\n'


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--manifest', action='store_true')
    ap.add_argument('--check-manifest', action='store_true')
    ap.add_argument('--source', action='append', default=[])
    ap.add_argument('--root', default=None)
    ap.add_argument('--pins', default=stage2data.PINS_FILE)
    a = ap.parse_args(argv)
    pins = stage2data.load_pins(a.pins)
    root = a.root or stage2data.STAGE2
    if a.check:
        problems = stage2data.check_pins(pins, root)
        for p in problems:
            print('DIFFERENT', p)
        if problems:
            print(f'--check: {len(problems)} differences: refused')
            return 1
        print(f'--check: all {len(pins["files"])} pinned files and '
              f'{sum(len(p.get("members", [])) for p in pins["files"])} members equal their pins')
        return 0
    if a.manifest or a.check_manifest:
        if not wordnet.available():
            print('skipped: no WordNet archive in the cache', file=sys.stderr)
            return 2
        store = stage2data.Store(root=root, pins=pins)
        problems = stage2data.check_pins(pins, root)
        if problems:
            print('refused: the pins do not check:', problems[:3])
            return 1
        wn = wordnet.load()
        meta = build_manifest(wn, store, glove.vocabulary(300, store), glove.vocabulary(50, store))
        text = manifest_text(meta)
        if a.check_manifest:
            with open(META, encoding='utf-8') as fh:
                same = fh.read() == text
            print('manifest equal' if same else 'manifest DIFFERENT')
            return 0 if same else 1
        with open(META, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(text)
        print(f'wrote {META} ({len(text.encode())} B, SHA-256 {_sha(text)})')
        return 0
    failed = fetch(pins, root, a.source)
    if failed:
        print(f'fetch failed for {failed}')
        return 1
    problems = stage2data.check_pins(pins, root)
    for p in problems:
        print('DIFFERENT', p)
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
