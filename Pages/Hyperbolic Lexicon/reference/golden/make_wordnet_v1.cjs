// Hyperbolic Lexicon: pins WordNet 3.0 (Phase 0).
//
//   node "Pages/Hyperbolic Lexicon/reference/golden/make_wordnet_v1.cjs"           fetch (once) and write the metadata
//   node "Pages/Hyperbolic Lexicon/reference/golden/make_wordnet_v1.cjs" --check   recompute and compare
//
// The archive (nltk_data's wordnet.zip, 10,775,600 B) is fetched once with curl into ~/.cache/hyperbolic-lexicon,
// outside git, and must match the SHA-256 pinned in wordnet_v1.cjs. Nothing of WordNet's text is committed except its
// licence. wordnet_v1.meta.json records the hashes of every file and the counts the preregistration's instances use:
// synsets, the noun spanning forest and hypernym closure, the mammal sets, the lemma types, and C0's shards.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const W = require('./wordnet_v1.cjs');

const CHECK = process.argv.includes('--check');
const META = path.join(__dirname, 'wordnet_v1.meta.json');
const LICENSE_OUT = path.join(__dirname, 'LICENSE-WORDNET.txt');
const SHARD_MAX = 60000;

if (!fs.existsSync(W.ZIP_PATH)) {
    if (CHECK) { console.error(`skipped: no WordNet archive at ${W.ZIP_PATH} (run without --check to fetch it)`); process.exit(2); }
    fs.mkdirSync(W.CACHE, { recursive: true });
    execFileSync('curl', ['-sS', '--fail', '-o', W.ZIP_PATH, W.URL], { stdio: 'inherit' });
}

const { buf, files } = W.readArchive();
const wn = W.load();
const fileMeta = {};
for (const [name, data] of [...files.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    let nonAscii = 0;
    for (const b of data) if (b > 127) nonAscii++;
    fileMeta[name] = { bytes: data.length, sha256: W.sha256(data), nonAsciiBytes: nonAscii };
}

const counts = {};
for (const pos of W.POS) counts[pos] = wn.synsets[pos].size;
counts.adjSatellites = [...wn.synsets.adj.values()].filter(s => s.ssType === 's').length;

// nouns: the L3 spanning forest and the hypernym ∪ instance-hypernym closure
const nouns = wn.synsets.noun, forest = W.spanningForest(nouns), anc = W.closure(nouns);
const degrees = [...forest.children.values()].map(c => c.length);
let closureEdges = 0, multiParent = 0;
for (const [off, set] of anc) { closureEdges += set.size; if (W.closureParents(nouns.get(off)).length > 1) multiParent++; }
let maxDepth = 0;
const depthOf = new Map();
const depth = off => { if (depthOf.has(off)) return depthOf.get(off); const p = forest.parent.get(off), d = p === null ? 0 : depth(p) + 1; depthOf.set(off, d); return d; };
for (const off of nouns.keys()) maxDepth = Math.max(maxDepth, depth(off));

// the mammal sets: mammal.n.01 is the first sense of 'mammal' in index.noun
const MAMMAL = wn.index.noun.get('mammal').offsets[0];
const mammalClosure = [...nouns.keys()].filter(off => off === MAMMAL || anc.get(off).has(MAMMAL)).sort();
const inMammal = new Set(mammalClosure);
let mammalClosureEdges = 0;
for (const off of mammalClosure) for (const a of anc.get(off)) if (inMammal.has(a)) mammalClosureEdges++;
const mammalSpanning = [];
const stack = [MAMMAL];
while (stack.length) { const off = stack.pop(); mammalSpanning.push(off); for (const c of forest.children.get(off) || []) stack.push(c); }
mammalSpanning.sort();

// verbs: the spanning forest (spikes and dry runs only)
const verbForest = W.spanningForest(wn.synsets.verb);

// lemma types over the four index files, '_' read as a space (L2 normalises them further with N_B)
const lemmaTypes = new Set();
for (const pos of W.POS) for (const lemma of wn.index[pos].keys()) lemmaTypes.add(lemma.replace(/_/g, ' '));

// C0: noun synsets in offset order, one line each: offset TAB lemmas joined by ", " TAB gloss, cut at line
// boundaries into shards of at most 60,000 UTF-8 bytes (lines joined by "\n" inside a shard, no trailing newline)
const c0Lines = [...nouns.values()].sort((a, b) => (a.offset < b.offset ? -1 : 1))
    .map(s => `${s.offset}\t${s.lemmas.map(l => l.replace(/_/g, ' ')).join(', ')}\t${s.gloss}`);
const shards = [];
let cur = [], curBytes = 0;
for (const line of c0Lines) {
    const b = Buffer.byteLength(line, 'utf8');
    if (b > SHARD_MAX) throw new Error('a C0 line is longer than a shard');
    if (cur.length && curBytes + 1 + b > SHARD_MAX) { shards.push(cur.join('\n')); cur = []; curBytes = 0; }
    curBytes += (cur.length ? 1 : 0) + b; cur.push(line);
}
if (cur.length) shards.push(cur.join('\n'));
const c0Bytes = shards.map(s => Buffer.byteLength(s, 'utf8'));

const meta = {
    source: { url: W.URL, archive: 'nltk_data wordnet.zip (WordNet 3.0)', bytes: buf.length, sha256: W.ZIP_SHA256 },
    files: fileMeta,
    synsets: counts,
    nouns: {
        spanningRule: "first '@' or '@i' pointer of the data line; children ordered by synset offset",
        spanningRoots: forest.roots,
        maxDepth,
        internalNodes: degrees.length,
        maxChildren: Math.max(...degrees),
        nodesWithOneChild: degrees.filter(d => d === 1).length,
        nodesWithMoreThan5Children: degrees.filter(d => d > 5).length,
        nodesWithMoreThan25Children: degrees.filter(d => d > 25).length,
        closureEdges,
        nodesWithSeveralParents: multiParent,
    },
    mammal: {
        synset: MAMMAL,
        closureNodes: mammalClosure.length,
        closureEdges: mammalClosureEdges,
        closureSha256: W.sha256(mammalClosure.join('\n')),
        spanningNodes: mammalSpanning.length,
        spanningSha256: W.sha256(mammalSpanning.join('\n')),
    },
    verbs: { spanningRoots: verbForest.roots.length, internalNodes: verbForest.children.size },
    lemmaTypes: { count: lemmaTypes.size, sha256: W.sha256([...lemmaTypes].sort().join('\n')) },
    c0: {
        definition: 'noun synsets in offset order; line = offset TAB lemmas ("_" as space) joined by ", " TAB gloss; shards cut at line boundaries, at most 60,000 UTF-8 bytes, lines joined by "\\n"',
        lines: c0Lines.length,
        shards: shards.length,
        fullShards: c0Bytes.filter(b => b >= 59000).length,
        minShardBytes: Math.min(...c0Bytes),
        maxShardBytes: Math.max(...c0Bytes),
        shardSha256: shards.map(s => W.sha256(Buffer.from(s, 'utf8'))),
    },
};

const json = JSON.stringify(meta, null, 1) + '\n';
if (CHECK) {
    const committed = fs.readFileSync(META, 'utf8');
    const licenseOk = fs.readFileSync(LICENSE_OUT, 'latin1') === wn.license;
    if (committed === json && licenseOk) { console.log(`wordnet_v1.meta.json matches the pinned archive (${W.ZIP_SHA256.slice(0, 12)}…)`); process.exit(0); }
    console.error(`MISMATCH: ${committed === json ? '' : 'wordnet_v1.meta.json '}${licenseOk ? '' : 'LICENSE-WORDNET.txt'}`);
    process.exit(1);
}
fs.writeFileSync(META, json);
fs.writeFileSync(LICENSE_OUT, wn.license, 'latin1');
console.log(`wrote wordnet_v1.meta.json: ${counts.noun} nouns, ${closureEdges} closure edges, mammals ${mammalClosure.length} (closure) / ${mammalSpanning.length} (spanning), ${lemmaTypes.size} lemma types, C0 ${shards.length} shards`);
