#!/usr/bin/env python3
"""Hyperbolic Lexicon: the data of Explainer 12's lab ("The mammals in the disk", explainers/learned.html) as a script
file a page loads without fetch, so file:// works: two of L6's measured snapped tables and the closure set they rank.

    python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_l6_view_v1.py"           write data/l6_view_v1.js
    python3 -B "Pages/Hyperbolic Lexicon/reference/golden/make_l6_view_v1.py" --check   rebuild in memory and compare

It reads, and writes nothing but data/l6_view_v1.js:
- results/l6-tables/learned-lorentz-d2-s0.snap.txt.gz and learned-euclid-d2-s0.snap.txt.gz, the snapped texts of
  measured runs learned-lorentz-d2-lr1-s0 and learned-euclid-d2-lr0.1-s0, committed with the decisive run (b6f3b9d);
- results/claims-phase4.json, the decisive record: each run's snap_sha, its LBENCH/1 record and its exact MAPs;
- the WordNet 3.0 archive in the cache, through lexicon.wordnet, and the mammal closure set S through
  lexicon.embed.closure_set, the function the decisive run built S and its neighbour sets with.

The data, as one JSON text (one node or table row per line):
- nodes, in S's offset order (node i is S's i-th offset): [offset, first lemma, closure parents, spanning parent].
  The closure parents are lexicon.wordnet.closure_parents (hypernym and instance-hypernym pointers, in the data
  line's order) restricted to S, as indices. A node's closure ancestors inside S are exactly what these reach: an
  ancestor of an outside parent cannot be in S, or that parent would be. The spanning parent is the index of
  lexicon.wordnet.spanning_parent, or -1 when it lies outside S (mammal.n.01's own, and six others').
- tables.lorentz and tables.euclid: the run's key, geometry, d, seed, lr and K = 32; rows, the snapped integers n
  (for Lorentz those of the Poincare point, p = n / 2^32); snapSha256, the record's snap_sha; and the exact closure
  and graph-edge MAPs as the record writes them, p/q in lowest terms, with the SHA-256 of that text (LBENCH/1's
  closureMapSha and graphMapSha) and LBENCH/1's six decimals.
A page rebuilds closure ancestors and descendants (lexicon_core.js closureNeighbours' sets) from the closure parents,
graph-edge neighbours from the spanning parents, and the snapped text from the rows, and checks them.

Before anything is written, and in --check, it refuses unless: S has the record's size, closure edges and SHA-256;
the closure and graph-edge neighbour sets rebuilt from the two parent lists equal embed.closure_set's for every
node; each snapped text has the run's snap_sha and its LBENCH/1 snapSha, S's offsets in order and d = 2 integers per
line, each below 2^53 in size (so a page can read it as a JSON number); each MAP text's SHA-256 is its LBENCH/1 hash.
Every first lemma is ASCII, so the output is ASCII. It ranks nothing; the page and run_l6_node.cjs do that.

--check exits 0 equal, 1 different, 2 "skipped" when the WordNet archive is not in the cache. About 4 s.
"""
import gzip
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REFERENCE = os.path.dirname(HERE)
SYSTEM = os.path.dirname(REFERENCE)
sys.path.insert(0, REFERENCE)
from lexicon import embed, wordnet  # noqa: E402

RESULTS = os.path.join(REFERENCE, 'results')
RECORD = os.path.join(RESULTS, 'claims-phase4.json')
OUT = os.path.join(SYSTEM, 'data', 'l6_view_v1.js')
NAME = 'l6_view_v1'
TABLES = (
    ('lorentz', 'learned-lorentz-d2-lr1-s0', 'l6-tables/learned-lorentz-d2-s0.snap.txt.gz'),
    ('euclid', 'learned-euclid-d2-lr0.1-s0', 'l6-tables/learned-euclid-d2-s0.snap.txt.gz'),
)
LBENCH_FIELDS = ('kind', 'protocol', 'instanceId', 'instanceSha', 'arm', 'geometry', 'd', 'seed', 'lr', 'protocolSha',
                 'settingsSha', 'budget', 'floatTableSha', 'snapBits', 'snapSha', 'closureMapSha', 'graphMapSha',
                 'closureMap', 'graphMap', 'track', 'engine', 'wallMs')
LICENCE = ('Derived from WordNet 3.0 (the first lemma and the hypernym and instance-hypernym pointers of each synset '
           'of the mammal closure set). WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved. '
           'Used and redistributed under the WordNet licence, reference/golden/LICENSE-WORDNET.txt.')
SAFE = 2 ** 53


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def refuse(msg):
    raise SystemExit(f'REFUSED: {msg}')


def lbench(s):
    f = s.split('|')
    if len(f) != len(LBENCH_FIELDS) or f[0] != 'LBENCH/1':
        refuse(f'not an LBENCH/1 record: {s[:80]}')
    return dict(zip(LBENCH_FIELDS, f))


def build():
    record = json.load(open(RECORD, encoding='utf-8'))
    if record.get('mode') != 'registered' or record.get('step') != 'measure':
        refuse('results/claims-phase4.json is not the decisive record')
    inst = record['instance']
    wn = wordnet.load()
    nouns = wn['synsets']['noun']
    cs = embed.closure_set(wn, wordnet.MAMMAL)
    S = list(cs.offsets)
    E = sum(len(a) for a in cs.anc)
    if (len(S), E, cs.instance_sha, cs.root) != (inst['n'], inst['E'], inst['instance_sha'], inst['root']):
        refuse(f'S has {len(S)} nodes, {E} closure edges, SHA-256 {cs.instance_sha}: not the record\'s')
    index = {o: i for i, o in enumerate(S)}

    # the two parent lists, and the neighbour sets a page rebuilds from them
    parents, span, lemmas = [], [], []
    for o in S:
        syn = nouns[o]
        ps = []
        for p in wordnet.closure_parents(syn):
            if p in index and index[p] not in ps:
                ps.append(index[p])
        parents.append(ps)
        sp = wordnet.spanning_parent(syn)
        span.append(index[sp] if sp in index else -1)
        lemma = syn.lemmas[0]
        if not lemma.isascii() or '"' in lemma or '\\' in lemma:
            refuse(f'the first lemma of {o} is not plain ASCII: {lemma!r}')
        lemmas.append(lemma)
    anc = [None] * len(S)

    def ancestors(i):
        if anc[i] is None:
            s = set()
            for p in parents[i]:
                s.add(p)
                s |= ancestors(p)
            anc[i] = s
        return anc[i]
    desc = [set() for _ in S]
    for i in range(len(S)):
        for a in ancestors(i):
            desc[a].add(i)
    closure_nb = [sorted(ancestors(i) | desc[i]) for i in range(len(S))]
    children = [[] for _ in S]
    for i, p in enumerate(span):
        if p >= 0:
            children[p].append(i)
    graph_nb = [sorted(children[i] + ([span[i]] if span[i] >= 0 else [])) for i in range(len(S))]
    if [list(x) for x in cs.closure_nb] != closure_nb:
        refuse('the closure neighbours rebuilt from the closure parents differ from embed.closure_set\'s')
    if [list(x) for x in cs.graph_nb] != graph_nb:
        refuse('the graph-edge neighbours rebuilt from the spanning parents differ from embed.closure_set\'s')
    if [frozenset(a) for a in anc] != list(cs.anc):
        refuse('the closure ancestors rebuilt from the closure parents differ from embed.closure_set\'s')

    runs = {r['key']: r for r in record['runs']}
    tables = {}
    for name, key, path in TABLES:
        run = runs.get(key)
        if run is None or run['kind'] != 'learned' or run['geometry'] != name or run['d'] != 2 or run['seed'] != 0:
            refuse(f'{key} is not a measured d = 2, seed 0 run of the record')
        lb = lbench(run['lbench'])
        text = gzip.decompress(open(os.path.join(RESULTS, path), 'rb').read()).decode('ascii')
        if sha(text) != run['snap_sha'] or sha(text) != lb['snapSha']:
            refuse(f'{path}: SHA-256 {sha(text)} is not the run\'s snap_sha {run["snap_sha"]}')
        rows = []
        for i, line in enumerate(text.split('\n')):
            f = line.split(' ')
            if len(f) != 3 or f[0] != S[i]:
                refuse(f'{path} line {i + 1} is not "offset n_1 n_2" for {S[i]}')
            row = [int(t) for t in f[1:]]
            if any(abs(t) >= SAFE for t in row) or ' '.join([f[0]] + [str(t) for t in row]) != line:
                refuse(f'{path} line {i + 1}: an integer out of range or not in canonical decimal')
            rows.append(row)
        if len(rows) != len(S):
            refuse(f'{path} has {len(rows)} lines for {len(S)} nodes')
        maps = {}
        for metric, field in (('closure', 'closureMap'), ('graph', 'graphMap')):
            pq = run['maps'][metric]['exact']
            if sha(pq) != lb[field + 'Sha']:
                refuse(f'{key}: the {metric} MAP text\'s SHA-256 is not its LBENCH/1 {field}Sha')
            maps[metric] = {'pq': pq, 'sha256': sha(pq), 'six': lb[field]}
        tables[name] = {'key': key, 'file': 'reference/results/' + path, 'geometry': name, 'd': 2, 'seed': 0,
                        'lr': run['lr'], 'K': 32, 'snapSha256': run['snap_sha'], 'map': maps, 'rows': rows}

    head = {
        'format': 'hyperbolic-lexicon/l6-view/1',
        'what': 'Two of L6\'s measured snapped tables (learned Lorentz and learned Euclidean, d = 2, seed 0) and the '
                'mammal closure set S they rank, for Explainer 12\'s lab. Written by reference/golden/make_l6_view_v1.py.',
        'licence': LICENCE,
        'record': {'file': 'reference/results/claims-phase4.json', 'head': record['head'], 'label': record['label']},
        'instance': {'id': 'wordnet30-mammal-closure', 'root': inst['root'], 'n': len(S), 'closureEdges': E,
                     'sha256': cs.instance_sha, 'closureNeighbourPairs': sum(map(len, closure_nb)),
                     'graphNeighbourPairs': sum(map(len, graph_nb)),
                     'withoutGraphNeighbours': [S[i] for i in range(len(S)) if not graph_nb[i]]},
        'node': '[offset, first lemma, closure parents inside S (indices), spanning parent (index, -1 outside S)]',
    }
    j = json.dumps
    lines = ['{']
    for k, v in head.items():
        lines.append(f'{j(k)}:{j(v, separators=(",", ":"))},')
    lines.append('"nodes":[')
    for i, o in enumerate(S):
        lines.append(j([o, lemmas[i], parents[i], span[i]], separators=(',', ':')) + (',' if i + 1 < len(S) else ''))
    lines.append('],')
    lines.append('"tables":{')
    for t, (name, _, _) in enumerate(TABLES):
        tb = dict(tables[name])
        rows = tb.pop('rows')
        lines.append(f'{j(name)}:{{')
        for k, v in tb.items():
            lines.append(f'{j(k)}:{j(v, separators=(",", ":"))},')
        lines.append('"rows":[')
        for i, row in enumerate(rows):
            lines.append(j(row, separators=(',', ':')) + (',' if i + 1 < len(rows) else ''))
        lines.append(']}' + (',' if t + 1 < len(TABLES) else ''))
    lines.append('}}')
    text = '\n'.join(lines) + '\n'
    back = json.loads(text)
    if back['nodes'][0][0] != S[0] or len(back['nodes']) != len(S) or back['tables']['euclid']['rows'][-1] != tables['euclid']['rows'][-1]:
        refuse('the JSON text does not read back')
    if not text.isascii():
        refuse('the JSON text is not ASCII')
    return wrap(text, record), text


def literal(s):
    """A JS string literal for ASCII text: printable characters as they are, the rest escaped (make_js_data_v1.cjs)."""
    out = ['"']
    for ch in s:
        c = ord(ch)
        if ch in '"\\':
            out.append('\\' + ch)
        elif c == 0x0A:
            out.append('\\n')
        elif 0x20 <= c <= 0x7E:
            out.append(ch)
        else:
            out.append('\\x%02x' % c)
    out.append('"')
    return ''.join(out)


def wrap(text, record):
    chunks = text.splitlines(keepends=True)
    out = [
        '// Hyperbolic Lexicon data: two of L6\'s measured snapped tables (learned Lorentz and learned Euclidean, d = 2, '
        'seed 0, from the decisive run at 515a4a1, committed in b6f3b9d) and the mammal closure set they rank, for Explainer 12\'s lab.',
        '// Generated by reference/golden/make_l6_view_v1.py from reference/results/l6-tables/learned-lorentz-d2-s0.snap.txt.gz, '
        'learned-euclid-d2-s0.snap.txt.gz, reference/results/claims-phase4.json and the WordNet 3.0 archive; do not edit (--check compares).',
        f'// The JSON text: {len(text)} bytes, sha256 {sha(text)}. Licence: derived from WordNet 3.0 (first lemmas and hypernym '
        'pointers); WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved. WordNet licence, reference/golden/LICENSE-WORDNET.txt.',
        f'// Registers the JSON text as LexiconData.{NAME}; the page checks its SHA-256, rebuilds each snapped text and checks it against '
        'the record\'s SHA-256, and compares the MAPs it computes with the record\'s.',
        '(function (root, name, text) {',
        '    if (typeof module === \'object\' && module.exports) module.exports = { [name]: text };',
        '    else root.LexiconData = Object.assign(root.LexiconData || {}, { [name]: text });',
        f'}})(typeof self !== \'undefined\' ? self : this, \'{NAME}\', [',
        *[literal(c) + ',' for c in chunks],
        '].join(\'\'));',
        '',
    ]
    return '\n'.join(out)


def main():
    if not wordnet.available():
        print('skipped: the WordNet archive is not in the cache (golden/make_wordnet_v1.cjs)', file=sys.stderr)
        return 2
    js, text = build()
    data = js.encode('ascii')
    digest = hashlib.sha256(data).hexdigest()
    if '--check' in sys.argv[1:]:
        same = os.path.exists(OUT) and open(OUT, 'rb').read() == data
        print(f'{"ok  " if same else "MISMATCH"}  data/l6_view_v1.js ({len(data)} B, sha256 {digest[:16]}...; '
              f'JSON text sha256 {sha(text)[:16]}...)')
        return 0 if same else 1
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'wb') as f:
        f.write(data)
    print(f'wrote data/l6_view_v1.js: {len(data)} B, sha256 {digest}; JSON text {len(text)} B, sha256 {sha(text)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
