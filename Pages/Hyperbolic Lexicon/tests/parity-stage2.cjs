// Hyperbolic Lexicon: the Stage-2 re-evaluation in Node (PREREGISTRATION.md Amendment 13 item 1).
//
//   node "Pages/Hyperbolic Lexicon/tests/parity-stage2.cjs" --trace          the trace only (exit 0 pass, 1 fail)
//   node "Pages/Hyperbolic Lexicon/tests/parity-stage2.cjs" --codes [opts]   the decisive code files (exit 0 pass,
//                                                                           1 fail, 2 skipped: no cache)
//   node "Pages/Hyperbolic Lexicon/tests/parity-stage2.cjs"                   both (exit 0, 1; 3 when the trace passed
//                                                                           and the code files were skipped)
//   options: --group exact|hit_test|hl_at|reported (repeatable; default the three decision groups), --only TEXT (the
//            files whose key contains TEXT), -j N (worker processes, default 4), --quiet, --json PATH (a report)
//
// The trace (reference/traces/stage2_v1.txt, written by reference/traces_stage2.py from Rng(8000 + i) draws only) is
// regenerated line for line by lexicon_stage2.js's stage2TraceLines(), header included. Two controls: one changed trace
// line must fail exactly that line; and on the planted cases (near-ties 10^-40 to 10^-300 apart), square roots at 64
// bits in place of 1,024 must change some line with the precision guard off, and stop with a PrecisionError with it on.
//
// The code files. A13.1 asks that the browser core reproduce "the rational keys and the tie-class lists (BigInt fixed
// point at 1,024 bits for the square roots), compared by SHA-256 ... on the decisive pass-1 code files". With the
// pinned data and WordNet in the cache (~/.cache/hyperbolic-lexicon, or HL_CACHE), this re-renders each decisive pass-1
// code file in lexicon_stage2.js from the pinned word columns, WordNet and the committed snapped tables alone (no
// Python, and no code file read as input), and compares:
//   tsv       the SHA-256 of the rendered TSV text and its line count with stage2-manifest.json's tsv_sha256 and lines
//             (LBENCH/1's itemScoresSha: the code file's text, byte for byte). With the decisive run's own files in the
//             cache (stage2-run/registered), a mismatch names the first differing line of the cached text.
//   counts    classes, distinct, recomputed, tie_classes, tie_tuples, phi_recomputed and phi_ties against the record's
//             files_metrics (claims-stage2.json) and the run record (runs.jsonl, for distinct), when present
//   side      with the run's files in the cache: the side file's content without its decimal strings (every value that
//             took the 240-digit path: item, multiplicity, exact tuple, code, tie flag, row, slot; every numerical tie
//             met inside the maximum over senses: both exact tuples). The rational keys, value by value, wherever the
//             120-digit pass looked closer.
//   gzip      reported only: Node bundles its own zlib, whose level-9 deflate stream differs from Python's (the gzip
//             header and the CRC-32 and size trailer agree), so the gzip SHA-256 is not the comparison
// Every file used is checked first: the pinned files and zip members against reference/golden/stage2_pins_v1.json, the
// WordNet archive against its pin, the instance rows against stage2_instances_v1.meta.json (covered rows, N_S pairs,
// HiT's slots), the snapped tables, and the cached code and side files, against stage2-manifest.json.
// Groups. The decision files of A13.14 (run_claims_stage2.decision_files): exact, the exact-arm files a decided
// comparison reads (the record's wiring provenance: HL, HL-glove, BD, BD-dir, WB, SL, MEN, MEN-glove, WSR-glove; 66);
// hit_test, the 20 measured tables' G on HiT test (21 slots, both settings); hl_at, the 20 measured tables' G on HL
// within U_@. The group 'reported' adds the other exact-arm files of the same instances (and WSR) whose forms are
// certified or exact keys (G, Grev, DepG, Dep, Sym under max, first and gensim; GloVe's cosine key): every S-full_i and
// W_i, K3, WN, H3, H2 and the flat arms (624 files). Not rendered: NK17, product and WN-LCh (reported forms ordered by
// 120-digit decimals of ln, not by a certified comparison), the closure bits, and the reported arms WN-U, ST, letter,
// S3 and GloVe-vec; nor the files only controls read, which A13.14 leaves out of the decision group: L14's
// edge-shuffled, tuning and relabelled tables' (controls 1-3) and GloVe's cosine on BD-dir-glove (L13 control 3) and
// its vector permutations (L15 control 3). Nothing here decides a claim.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { spawn } = require('child_process');

const SYS = path.join(__dirname, '..');
const REF = path.join(SYS, 'reference');
const RESULTS = path.join(REF, 'results');
const S2 = require(path.join(SYS, 'lexicon_stage2.js'));
const LC = require(path.join(SYS, 'lexicon_core.js'));
const WNL = require(path.join(REF, 'golden', 'wordnet_v1.cjs'));
const CACHE = process.env.HL_CACHE || path.join(os.homedir(), '.cache', 'hyperbolic-lexicon');
const STAGE2 = path.join(CACHE, 'stage2');
const RUN = path.join(CACHE, 'stage2-run', 'registered');

const argv = process.argv.slice(2);
const opt = name => argv.includes(name);
const optVals = name => argv.flatMap((a, i) => (a === name && i + 1 < argv.length ? [argv[i + 1]] : []));
const quiet = opt('--quiet');
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const say = (...a) => { if (!quiet) console.log(...a); };

// ================================================================== the pinned inputs
const PINS = JSON.parse(fs.readFileSync(path.join(REF, 'golden', 'stage2_pins_v1.json'), 'utf8'));
const pinOf = name => { const p = PINS.files.find(f => f.name === name); if (!p) throw new Error(`no pin ${name}`); return p; };
const pinPath = name => path.join(STAGE2, name, pinOf(name).file);
const checked = new Map();
// a pinned file's bytes, refused unless its size and SHA-256 are the pin's
function pinnedFile(name) {
    if (checked.has(name)) return checked.get(name);
    const p = pinOf(name), b = fs.readFileSync(pinPath(name));
    if (b.length !== p.bytes || sha256(b) !== p.sha256) throw new Error(`${name}: ${b.length} B, SHA-256 ${sha256(b)}: not the pin`);
    checked.set(name, b);
    return b;
}
// the central directory of a zip archive (no zip64: the pinned archives need none)
function zipEntries(fd, size) {
    const tail = Buffer.alloc(Math.min(size, 65557));
    fs.readSync(fd, tail, 0, tail.length, size - tail.length);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('not a zip archive');
    const n = tail.readUInt16LE(eocd + 10), cdSize = tail.readUInt32LE(eocd + 12), cdOff = tail.readUInt32LE(eocd + 16);
    const cd = Buffer.alloc(cdSize);
    fs.readSync(fd, cd, 0, cdSize, cdOff);
    const out = new Map();
    let p = 0;
    for (let k = 0; k < n; k++) {
        if (cd.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory entry');
        const method = cd.readUInt16LE(p + 10), csize = cd.readUInt32LE(p + 20), usize = cd.readUInt32LE(p + 24);
        const nl = cd.readUInt16LE(p + 28), el = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32), local = cd.readUInt32LE(p + 42);
        const name = cd.toString('utf8', p + 46, p + 46 + nl);
        p += 46 + nl + el + cl;
        const lh = Buffer.alloc(30);
        fs.readSync(fd, lh, 0, 30, local);
        if (lh.readUInt32LE(0) !== 0x04034b50) throw new Error(`${name}: bad local header`);
        out.set(name, { method, csize, usize, start: local + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28) });
    }
    return out;
}
// a pinned zip member's bytes (the archive and the member both checked against the pin)
function pinnedMember(name, member) {
    const key = name + '::' + member;
    if (checked.has(key)) return checked.get(key);
    pinnedFile(name);
    const p = pinOf(name), mp = (p.members || []).find(m => m.path === member);
    if (!mp) throw new Error(`${name}: no pinned member ${member}`);
    const fd = fs.openSync(pinPath(name), 'r');
    try {
        const e = zipEntries(fd, fs.fstatSync(fd).size).get(member);
        const raw = Buffer.alloc(e.csize);
        fs.readSync(fd, raw, 0, e.csize, e.start);
        const b = e.method === 0 ? raw : zlib.inflateRawSync(raw);
        if (b.length !== mp.bytes || sha256(b) !== mp.sha256) throw new Error(`${name}/${member}: not the pinned member`);
        checked.set(key, b);
        return b;
    } finally { fs.closeSync(fd); }
}
// GloVe 6B 300-d (glove.py): the member streamed out of the zip and hashed as it is read (refused at its end unless
// its size and SHA-256 are the pin's); returns the vocabulary and the lines of the words asked for
function gloveRead(want, dim = 300) {
    const name = 'glove-6b', member = `glove.6B.${dim}d.txt`, p = pinOf(name), mp = p.members.find(m => m.path === member);
    const fd = fs.openSync(pinPath(name), 'r');
    if (fs.fstatSync(fd).size !== p.bytes) throw new Error(`${name}: not the pinned size`);
    const e = zipEntries(fd, p.bytes).get(member);
    fs.closeSync(fd);
    return new Promise((resolve, reject) => {
        const h = crypto.createHash('sha256'), vocab = new Set(), lines = new Map();
        let rest = '', bytes = 0, nLines = 0;
        const take = line => {
            const sp = line.indexOf(' '), w = line.slice(0, sp);
            if (sp <= 0) throw new Error('a GloVe line without a word');
            if (vocab.has(w)) throw new Error(`GloVe ${dim}d repeats a word`);
            vocab.add(w);
            nLines++;
            if (want.has(w)) lines.set(w, line);
        };
        const inf = zlib.createInflateRaw();
        fs.createReadStream(pinPath(name), { start: e.start, end: e.start + e.csize - 1, highWaterMark: 1 << 22 }).pipe(inf);
        inf.on('data', chunk => {
            h.update(chunk); bytes += chunk.length;
            const s = rest + chunk.toString('utf8'), parts = s.split('\n');
            rest = parts.pop();
            for (const l of parts) take(l);
        });
        inf.on('error', reject);
        inf.on('end', () => {
            try {
                if (rest !== '') throw new Error(`${member}: a line without its final LF`);
                if (bytes !== mp.bytes || h.digest('hex') !== mp.sha256) throw new Error(`${member}: not the pinned member`);
                resolve({ vocab, lines, nLines });
            } catch (err) { reject(err); }
        });
    });
}

// ================================================================== the world: WordNet, universes, instances
function makeWorld() {
    const wn = WNL.load();                              // checks the archive's SHA-256
    const offsets = [...wn.synsets.noun.keys()].sort();
    const Ufull = new Set(offsets);
    const atNodes = S2.atNodes(wn), Uat = new Set(atNodes);
    if (atNodes.length !== 74401 || sha256(atNodes.join('\n')) !== '9af5a81a2d8725ba431ebfc55fe17b6698a024b8d85f09c01106ae1218eeb117') throw new Error('U_@ is not the registered one');
    return { wn, offsets, Ufull, Uat, atNodes, cache: new Map() };
}
const lazy = (world, key, fn) => { if (!world.cache.has(key)) world.cache.set(key, fn()); return world.cache.get(key); };
const META = JSON.parse(fs.readFileSync(path.join(REF, 'golden', 'stage2_instances_v1.meta.json'), 'utf8'));
// instance -> { rows: [[row, x, y]], universe, kind, check: [manifest entry, covered key] }
const INSTANCES = {
    HL: { iid: 'hyperlex-ccb4161-nouns', universe: 'full', kind: 'pair', cand: w => hlNouns(w) },
    'HL-at': { iid: 'hyperlex-ccb4161-nouns', universe: 'at', kind: 'pair', cand: w => hlNouns(w) },
    'HL-glove': { iid: 'hyperlex-ccb4161-nouns', universe: 'full', glove: true, kind: 'pair', cand: w => hlNouns(w) },
    BD: { iid: 'suite-6891e0e-bless-test', universe: 'full', kind: 'pair', cand: () => suiteTest('bless') },
    'BD-dir': { iid: 'suite-6891e0e-bless-test', universe: 'full', kind: 'dir', cand: () => suiteTest('bless') },
    WB: { iid: 'suite-6891e0e-wbless-test', universe: 'full', kind: 'pair', cand: () => suiteTest('wbless') },
    SL: { iid: 'simlex-fda1b39-nouns', universe: 'full', kind: 'pair', cand: () => S2.READERS.simlexWords(pinnedFile('simlex')).filter(r => r[3] === 'N').map(r => r.slice(0, 3)) },
    MEN: { iid: 'men-0d05a99-nn', universe: 'full', kind: 'pair', cand: () => menNN() },
    'MEN-glove': { iid: 'men-0d05a99-nn', universe: 'full', glove: true, kind: 'pair', cand: () => menNN() },
    'WSR-glove': { iid: 'ws353-e2de627-rel', universe: 'full', glove: true, kind: 'pair', cand: () => S2.READERS.ws353Words(pinnedFile('ws353-rel'), 'ws353-rel') },
    WSR: { iid: 'ws353-e2de627-rel', universe: 'full', kind: 'pair', cand: () => S2.READERS.ws353Words(pinnedFile('ws353-rel'), 'ws353-rel') },
};
const hlNouns = () => S2.READERS.hyperlexWords(pinnedMember('hyperlex', 'hyperlex-all.txt')).filter(r => r[3] === 'N').map(r => r.slice(0, 3));
const suiteTest = name => S2.READERS.suiteWords(pinnedFile('suite-' + name), name).filter(r => r[3] === 'test').map(r => r.slice(0, 3));
const menNN = () => S2.READERS.menWords(pinnedFile('men')).filter(r => r[2] === '-n' && r[4] === '-n').map(r => [r[0], r[1], r[3]]);
// GloVe's vocabulary (300-d, A13.3's coverage) and the vectors of the words the GloVe instances hold (dim 300, or 50
// for the reported GloVe-50 arm)
async function gloveOf(world, dim = 300) {
    world.glove = world.glove || {};
    if (!world.glove[dim]) {
        const want = new Set();
        for (const n of ['HL-glove', 'MEN-glove', 'WSR-glove']) for (const [, x, y] of INSTANCES[n].cand(world)) for (const w of [x, y]) { const v = S2.N_S(w); if (!v.includes('_')) want.add(v); }
        const t0 = Date.now(), g = await gloveRead(want, dim);
        const meta = META.glove;
        if (g.nLines !== meta['words' + dim]) throw new Error(`GloVe ${dim}d: ${g.nLines} words, not ${meta['words' + dim]}`);
        world.glove[dim] = { vocab: g.vocab, vec: new Map([...g.lines].map(([w, l]) => [w, S2.gloveLine(l, dim)[1]])) };
        say(`  GloVe 6B ${dim}d: the pinned member streamed and hashed, ${g.nLines} words, ${g.lines.size} vectors kept (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    }
    return world.glove[dim];
}
// an instance's rows (selected and covered as the runner selects them), checked against the instance manifest
async function instanceOf(world, name) {
    if (world.cache.has('inst:' + name)) return world.cache.get('inst:' + name);
    return (await (async () => {
        const spec = INSTANCES[name];
        if (!spec) throw new Error(`no instance ${name} here`);
        const cand = spec.cand(world), U = spec.universe === 'at' ? world.Uat : world.Ufull;
        const vocab = spec.glove ? (await gloveOf(world)).vocab : null;
        const rows = S2.selectRows(cand, U, world.wn, vocab);
        const m = META.instances[spec.iid], cov = spec.glove ? m.gloveCovered : m.covered[spec.universe === 'at' ? 'U_at' : 'U_full'];
        const got = { count: rows.length, sha: S2.rowsSha(rows.map(r => r[0])) };
        if (got.count !== cov.count || got.sha !== cov.rowsSha256) throw new Error(`${name}: covered rows ${got.count} ${got.sha} are not the manifest's ${cov.count} ${cov.rowsSha256}`);
        const ns = sha256(cand.map(([, x, y]) => `${S2.N_S(x)}\t${S2.N_S(y)}`).join('\n'));
        if (cand.length !== m.rows || ns !== m.nsPairsSha256) throw new Error(`${name}: the selected rows' N_S pairs are not the manifest's`);
        const inst = { name, kind: spec.kind, universe: spec.universe, U, rows };
        world.cache.set('inst:' + name, inst);
        return inst;
    })());
}
async function hitInstance(world) {
    return lazy(world, 'hit', () => {
        const names = S2.hitNames(world.wn), lex = S2.READERS.hitLexiconNames(pinnedMember('hit-multi', 'wordnet-multi/entity_lexicon.json'));
        if (new Set(lex).size !== lex.length || lex.length !== 74401) throw new Error('HiT names: not 74,401 distinct names');
        const lexSet = new Set(lex), offs = new Set();
        for (const n of lex) { const o = names.get(n); if (o === undefined) throw new Error(`HiT name ${n} does not resolve`); offs.add(o); }
        if (offs.size !== lex.length || [...offs].some(o => !world.Uat.has(o))) throw new Error('HiT names: not one-to-one onto U_@');
        const raw = S2.READERS.hitRows(pinnedMember('hit-multi', 'wordnet-multi/test.jsonl'), 'hit-test');
        for (const [r, c, s] of raw) for (const x of [c, ...s]) if (!lexSet.has(x)) throw new Error(`hit-test: row ${r}: name ${x} is not in the lexicon`);
        const m = META.instances['hit-zenodo14036213-multi-test'];
        if (raw.length !== m.rows || S2.rowsSha(raw.map(r => r[0])) !== m.rowsSha256) throw new Error('HiT test rows differ from the manifest');
        if (sha256(raw.map(([, c, s]) => [c, ...s].join(' ')).join('\n')) !== m.slotsSha256) throw new Error("HiT test slots differ from the manifest's");
        if (raw.some(r => r[2].length !== 21)) throw new Error('a HiT test row without 21 slots');
        return { name: 'HIT-test', kind: 'hit', rows: raw.map(([r, c, s]) => [r, names.get(c), s.map(x => names.get(x))]) };
    });
}

// ================================================================== arms
const ARM_SEEDS = { 'S-full': 2400, W: 2420 };            // A13.12's registered bases (the record's P names them)
const splitArm = arm => { const m = /^(S-full|W|S3|GloVe-vec|GloVe)-(\d+)$/.exec(arm); return m ? [m[1], Number(m[2])] : [arm, null]; };
function baseTable(world, name) {
    return lazy(world, 'table:' + name, () => {
        const words = lazy(world, 'words', () => LC.nounWords(world.wn));
        if (name === 'H3') return S2.h3Table(words, 'H3');
        if (name === 'H2') return S2.h2Table(words, 'H2');
        return S2.flatTable(words, name);
    });
}
// { kind: 'geo' | 'wn' | 'glove', table, senses(w, U) }
function armOf(world, arm) {
    return lazy(world, 'arm:' + arm, () => {
        const [base, i] = splitArm(arm), plain = (w, U) => S2.senses(w, U, world.wn);
        if (['H3', 'H2', 'F3', 'F3*', 'F2', 'F2*'].includes(base)) return { kind: 'geo', table: baseTable(world, base), senses: plain };
        if (base === 'K3') return { kind: 'geo', table: S2.k3Table(world.wn, world.offsets), senses: plain };
        if (base === 'S-full') {
            const P = S2.labelPermutation(ARM_SEEDS['S-full'] + i, world.offsets.length);
            return { kind: 'geo', table: S2.sfullTable(baseTable(world, 'H3'), world.offsets, P, arm), senses: plain };
        }
        if (base === 'W') {
            const wmap = S2.wMap(world.wn.index.noun, ARM_SEEDS.W + i);
            return { kind: 'geo', table: baseTable(world, 'H3'), senses: (w, U) => { const v = S2.N_S(w); return wmap.has(v) ? S2.senses(wmap.get(v), U, world.wn) : []; } };
        }
        if (base === 'WN') return { kind: 'wn', graph: lazy(world, 'wngraph', () => S2.nounGraph(world.wn)), senses: plain };
        if (base === 'GloVe') return { kind: 'glove' };
        throw new Error(`arm ${arm} is not reproduced here`);
    });
}
const TABLES_DIR = path.join(RESULTS, 'stage2-tables');
function learnedArm(world, key, manifest) {
    return lazy(world, 'learned:' + key, () => {
        const text = zlib.gunzipSync(fs.readFileSync(path.join(TABLES_DIR, key + '.snap.txt.gz'))).toString('utf8');
        if (sha256(text) !== manifest.measured_snapped_texts.sha256[key]) throw new Error(`${key}: the snapped text is not the record's`);
        const { offsets, N } = LC.parseSnapText(text);
        if (offsets.length !== world.atNodes.length || offsets.some((o, i) => o !== world.atNodes[i])) throw new Error(`${key}: the offsets are not U_@'s`);
        const geometry = key.includes('lorentz') ? 'lorentz' : 'euclid';
        return { kind: 'geo', table: (geometry === 'lorentz' ? S2.lorentzTable : S2.euclidTable)(offsets, N, key), senses: (w, U) => S2.senses(w, U, world.wn) };
    });
}

// ================================================================== one code file
const parseFkey = fk => { const [inst, arm, form, rule, table] = fk.split('/'); return { inst, arm, form, rule, table }; };
async function render(world, manifest, fkey) {
    const { inst: iname, arm, form, rule, table } = parseFkey(fkey);
    if (table !== '-') {
        const ac = learnedArm(world, table, manifest);
        if (iname === 'HIT-test-s21' && form === 'G') {
            const inst = await hitInstance(world), sc = new S2.Scorer(ac.table);
            const { cert, flat } = S2.scoreList('hit', inst.rows, { slot: (c, r) => { sc.cert = c; return sc.slotVals(r[1], r[2]); } });
            return S2.codeFile('hit', inst.rows.map(r => r[0]), flat, 'cert', cert, 21);
        }
        if (iname === 'HL-at' && form === 'G' && rule === 'max') return renderPairs(world, await instanceOf(world, 'HL-at'), ac, form, rule);
        throw new Error(`${fkey}: not a file this re-evaluation renders`);
    }
    const inst = await instanceOf(world, iname), ac = armOf(world, arm);
    if (ac.kind === 'glove') {
        const g = await gloveOf(world, splitArm(arm)[1]), vec = w => g.vec.get(S2.N_S(w));
        const keys = inst.rows.map(([, x, y]) => S2.cosKey(vec(x), vec(y)));
        const flat = inst.kind === 'dir' ? keys.concat(inst.rows.map(([, x, y]) => S2.cosKey(vec(y), vec(x)))) : keys;
        return S2.codeFile(inst.kind, inst.rows.map(r => r[0]), flat, 'key', null);
    }
    return renderPairs(world, inst, ac, form, rule);
}
function renderPairs(world, inst, ac, form, rule) {
    const sx = inst.rows.map(([, x]) => ac.senses(x, inst.U)), sy = inst.rows.map(([, , y]) => ac.senses(y, inst.U));
    const rows = inst.rows.map((r, i) => form === 'Grev' ? [r[0], sy[i], sx[i]] : [r[0], sx[i], sy[i]]);
    const kind = ac.kind === 'wn' ? 'wn' : 'geo';
    const sc = kind === 'wn' ? new S2.WNScorer(ac.graph) : new S2.Scorer(ac.table);
    const { cert, flat } = S2.scoreList(inst.kind, rows, { pair: (c, a, b) => { sc.cert = c; return S2.pairValue(sc, kind, form, rule, a, b); } });
    return S2.codeFile(inst.kind, inst.rows.map(r => r[0]), flat, S2.vtypeOf(kind, form), kind === 'wn' ? new S2.Certifier() : cert);
}

// ================================================================== what to compare
const OUT_OF_SCOPE_FORMS = new Set(['NK17', 'product', 'LCh', 'closure', 'Groot', 'dist']);
function fileGroups(manifest, record) {
    const files = manifest.files, exact = new Set();
    for (const p of Object.values(record.wiring.provenance)) for (const fk of [p.x, p.y]) if (files[fk] && parseFkey(fk).table === '-') exact.add(fk);
    const g = { exact: [...exact].sort(), hit_test: [], hl_at: [], reported: [], out_of_scope: [] };
    for (const fk of Object.keys(files).sort()) {
        const f = parseFkey(fk);
        if (f.table.startsWith('measured-') && f.form === 'G') {
            if (f.inst === 'HIT-test-s21') g.hit_test.push(fk);
            else if (f.inst === 'HL-at' && f.rule === 'max') g.hl_at.push(fk);
        }
        if (f.table === '-' && !exact.has(fk) && INSTANCES[f.inst] && f.inst !== 'HL-at') {
            const base = splitArm(f.arm)[0];
            if (OUT_OF_SCOPE_FORMS.has(f.form) || ['WN-U', 'ST', 'letter', 'S3', 'GloVe-vec'].includes(base)) g.out_of_scope.push(fk);
            else g.reported.push(fk);
        }
    }
    return g;
}
// the cached code file, checked against the manifest (gzip and TSV SHA-256), and its side file
function cachedFiles(entry) {
    const gz = fs.readFileSync(path.join(RUN, entry.cache_path));
    if (sha256(gz) !== entry.sha256) throw new Error(`${entry.cache_path}: not the manifest's gzip SHA-256`);
    const tsv = zlib.gunzipSync(gz);
    if (sha256(tsv) !== entry.tsv_sha256) throw new Error(`${entry.cache_path}: not the manifest's TSV SHA-256`);
    const sp = path.join(RUN, entry.cache_path.replace(/^codes\//, 'side/').replace(/\.tsv\.gz$/, '.json.gz'));
    let side = null;
    if (fs.existsSync(sp)) {
        const sb = fs.readFileSync(sp);
        if (sha256(sb) !== entry.side_sha256) throw new Error(`${sp}: not the manifest's side SHA-256`);
        side = JSON.parse(zlib.gunzipSync(sb).toString('utf8'));
    }
    return { gz, tsv, side };
}
// Python's gzip.GzipFile(filename='', mtime=0, compresslevel=9): header 1f8b 08 00 00000000 02 ff, raw deflate at
// level 9 (zlib's defaults otherwise), CRC-32 and size. Node bundles its own zlib, so equal bytes are reported, not
// required: the registered comparison is the text's SHA-256.
function pyGzip(buf) {
    const body = zlib.deflateRawSync(buf, { level: 9, windowBits: 15, memLevel: 8, strategy: 0 });
    const tail = Buffer.alloc(8);
    tail.writeUInt32LE(zlib.crc32 ? zlib.crc32(buf) >>> 0 : 0, 0);
    tail.writeUInt32LE(buf.length >>> 0, 4);
    return Buffer.concat([Buffer.from([0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 2, 0xff]), body, tail]);
}
function firstDiff(a, b) {
    const A = a.split('\n'), B = b.split('\n');
    for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) return `line ${i + 1}: rendered ${JSON.stringify(A[i])}, recorded ${JSON.stringify(B[i])}`;
    return 'no line differs';
}
async function checkOne(world, manifest, metrics, runsInfo, fkey) {
    const t0 = Date.now(), entry = manifest.files[fkey];
    const res = { fkey, lines: entry.lines, ok: false, checks: {} };
    try {
        const r = await render(world, manifest, fkey), tsvSha = sha256(r.text);
        res.secs = (Date.now() - t0) / 1000;
        res.checks.tsv = tsvSha === entry.tsv_sha256 && r.lines === entry.lines;
        let cached = null;
        if (fs.existsSync(path.join(RUN, entry.cache_path))) cached = cachedFiles(entry);
        if (!res.checks.tsv) res.detail = cached ? firstDiff(r.text, cached.tsv.toString('utf8')) : `TSV SHA-256 ${tsvSha}, recorded ${entry.tsv_sha256}`;
        res.checks.gzip = sha256(pyGzip(Buffer.from(r.text, 'utf8'))) === entry.sha256;
        const m = metrics.get(fkey), info = runsInfo.get(fkey);
        const want = Object.assign({}, info || {}, m || {});
        const keys = ['classes', 'distinct', 'recomputed', 'tie_classes', 'tie_tuples', 'phi_recomputed', 'phi_ties'].filter(k => want[k] !== undefined);
        res.checks.counts = keys.every(k => want[k] === r.info[k]);
        if (!res.checks.counts) res.detail = (res.detail ? res.detail + '; ' : '') + 'counts ' + keys.filter(k => want[k] !== r.info[k]).map(k => `${k} ${r.info[k]} vs ${want[k]}`).join(', ');
        res.counted = keys;
        if (cached && cached.side) {
            const a = JSON.stringify(r.side), b = JSON.stringify(S2.sideProjection(cached.side));
            res.checks.side = a === b;
            res.sideEntries = r.side.entries.length; res.phiTies = r.side.phiTies.length;
            if (!res.checks.side) res.detail = (res.detail ? res.detail + '; ' : '') + `side: ${r.side.entries.length} entries and ${r.side.phiTies.length} ties rendered, ${cached.side.entries.length} and ${cached.side.phi_ties.length} recorded`;
        }
        res.ok = res.checks.tsv && res.checks.counts && res.checks.side !== false;
    } catch (e) {
        res.secs = (Date.now() - t0) / 1000;
        res.error = `${e.name}: ${e.message}`;
    }
    return res;
}

// ================================================================== the worker (one process renders a list of files)
async function worker(list) {
    const manifest = JSON.parse(fs.readFileSync(path.join(RESULTS, 'stage2-manifest.json'), 'utf8'));
    const record = JSON.parse(fs.readFileSync(path.join(RESULTS, 'claims-stage2.json'), 'utf8'));
    const metrics = new Map(record.files_metrics.map(f => [f.fkey, f]));
    const runsInfo = new Map();
    const rp = path.join(RUN, 'runs.jsonl');
    if (fs.existsSync(rp)) for (const l of fs.readFileSync(rp, 'utf8').split('\n')) {
        if (!l) continue;
        const o = JSON.parse(l), files = (o.record && o.record.files) || o.files;
        if (files && typeof files === 'object') for (const [k, v] of Object.entries(files)) if (v && v.distinct !== undefined) runsInfo.set(k, { distinct: v.distinct });
    }
    const world = makeWorld();
    for (const fk of list) process.stdout.write('RESULT ' + JSON.stringify(await checkOne(world, manifest, metrics, runsInfo, fk)) + '\n');
}

// ================================================================== the parent
function haveCache() {
    const why = [];
    if (!fs.existsSync(WNL.ZIP_PATH)) why.push(`no WordNet archive at ${WNL.ZIP_PATH}`);
    for (const p of PINS.files) if (!fs.existsSync(pinPath(p.name))) { why.push(`no pinned ${p.name} under ${STAGE2}`); break; }
    return why;
}
function runWorkers(lists) {
    return Promise.all(lists.filter(l => l.length).map(list => new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['--max-old-space-size=6144', __filename, '--worker', JSON.stringify(list)], { stdio: ['ignore', 'pipe', 'inherit'] });
        const out = [];
        let buf = '';
        child.stdout.on('data', d => {
            buf += d;
            const parts = buf.split('\n');
            buf = parts.pop();
            for (const l of parts) if (l.startsWith('RESULT ')) {
                const r = JSON.parse(l.slice(7));
                out.push(r);
                say(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.fkey}  ${r.lines} lines  ${r.secs.toFixed(1)} s${r.error ? '  ' + r.error : r.detail ? '  ' + r.detail : ''}`);
            } else if (l.trim()) say('  ' + l);
        });
        child.on('close', code => (code === 0 ? resolve(out) : reject(new Error(`a worker exited with ${code}`))));
    })));
}
async function codesSection() {
    const why = haveCache();
    if (why.length) { console.log(`code files: skipped (${why.join('; ')})`); return { skipped: true }; }
    if (!fs.existsSync(path.join(RUN, 'codes'))) say(`  the decisive run's own files are not under ${RUN}: the side files are not compared`);
    const manifest = JSON.parse(fs.readFileSync(path.join(RESULTS, 'stage2-manifest.json'), 'utf8'));
    const record = JSON.parse(fs.readFileSync(path.join(RESULTS, 'claims-stage2.json'), 'utf8'));
    const groups = fileGroups(manifest, record);
    const asked = optVals('--group');
    const names = asked.length ? asked : ['exact', 'hit_test', 'hl_at'];
    const only = optVals('--only');
    const t0 = Date.now(), summary = {};
    const jobs = Math.max(1, Number(optVals('-j')[0] || 4));
    let all = [];
    for (const g of names) {
        let list = groups[g];
        if (!list) throw new Error(`no group ${g}`);
        if (only.length) list = list.filter(fk => only.some(o => fk.includes(o)));
        say(`group ${g}: ${list.length} files, ${list.reduce((s, fk) => s + manifest.files[fk].lines, 0)} lines`);
        all = all.concat(list.map(fk => [g, fk]));
    }
    // spread the work: the files of the instances that read GloVe go to one worker (the 1 GB member is streamed once
    // per process; about the work of 150,000 lines), then the heaviest files first, greedy by lines
    const order = all.slice().sort((a, b) => manifest.files[b[1]].lines - manifest.files[a[1]].lines);
    const lists = Array.from({ length: jobs }, () => []), load = new Array(jobs).fill(0);
    const readsGlove = fk => /^(HL|MEN|WSR|SL|BD|BD-dir|WB)-glove\//.test(fk);
    for (const [, fk] of order.filter(([, fk]) => readsGlove(fk))) { lists[0].push(fk); load[0] += manifest.files[fk].lines + 2000; }
    if (lists[0].length) load[0] += 150000;
    for (const [, fk] of order.filter(([, fk]) => !readsGlove(fk))) { const k = load.indexOf(Math.min(...load)); lists[k].push(fk); load[k] += manifest.files[fk].lines + 2000; }
    const results = (await runWorkers(lists)).flat();
    const byKey = new Map(results.map(r => [r.fkey, r]));
    for (const g of names) {
        const rs = all.filter(([gg]) => gg === g).map(([, fk]) => byKey.get(fk));
        const ok = rs.filter(r => r && r.ok);
        summary[g] = {
            files: rs.length, reproduced: ok.length, lines: rs.reduce((s, r) => s + r.lines, 0), linesReproduced: ok.reduce((s, r) => s + r.lines, 0),
            gzipEqual: rs.filter(r => r && r.checks && r.checks.gzip).length, sideCompared: rs.filter(r => r && r.checks && r.checks.side !== undefined).length,
            sideEntries: rs.reduce((s, r) => s + (r.sideEntries || 0), 0), phiTies: rs.reduce((s, r) => s + (r.phiTies || 0), 0),
            cpuSeconds: rs.reduce((s, r) => s + (r.secs || 0), 0),
        };
    }
    const wall = (Date.now() - t0) / 1000;
    for (const [g, s] of Object.entries(summary)) {
        console.log(`code files ${g}: ${s.reproduced}/${s.files} reproduced (${s.linesReproduced}/${s.lines} lines; TSV SHA-256 and counts; side files compared ${s.sideCompared}: ${s.sideEntries} 240-digit entries, ${s.phiTies} ties inside Phi; gzip bytes equal ${s.gzipEqual}), ${s.cpuSeconds.toFixed(1)} s of work`);
    }
    if (groups.out_of_scope.length && !only.length) console.log(`  not rendered: ${groups.out_of_scope.length} exact-arm files on these instances whose forms or arms lie outside A13.1's comparison (the uncertified 120-digit forms NK17, product and WN-LCh, the closure bits, and the reported arms WN-U, ST, letter, S3, GloVe-vec)`);
    const okLines = results.filter(r => r.ok).reduce((s, r) => s + r.lines, 0);
    console.log(`code files: ${results.filter(r => r.ok).length}/${all.length} reproduced byte for byte (${okLines}/${all.reduce((s, [, fk]) => s + manifest.files[fk].lines, 0)} lines), ${wall.toFixed(1)} s wall with ${jobs} workers`);
    const jp = optVals('--json')[0];
    if (jp) fs.writeFileSync(jp, JSON.stringify({ summary, wall, results }, null, 1));
    return { skipped: false, fail: results.filter(r => !r.ok).length + (results.length !== all.length ? 1 : 0) };
}

// ================================================================== the trace
function traceSection() {
    const p = path.join(REF, 'traces', 'stage2_v1.txt');
    if (!fs.existsSync(p)) { console.log('trace: reference/traces/stage2_v1.txt is missing'); return { fail: 1 }; }
    if (typeof S2.stage2TraceLines !== 'function') { console.log('trace: lexicon_stage2.js has no stage2TraceLines'); return { fail: 1 }; }
    const t0 = Date.now(), want = fs.readFileSync(p, 'utf8').split('\n');
    if (want[want.length - 1] === '') want.pop();
    const got = S2.stage2TraceLines();
    let fail = 0;
    const n = Math.max(want.length, got.length);
    for (let i = 0; i < n; i++) if (want[i] !== got[i]) { fail++; if (fail <= 10) console.log(`  trace line ${i + 1}: want ${JSON.stringify((want[i] || '').slice(0, 160))}, got ${JSON.stringify((got[i] || '').slice(0, 160))}`); }
    // the control: one changed trace line must fail exactly one line
    const k = want.findIndex(l => !l.startsWith('#') && l.includes(' codes '));
    const changed = want.slice();
    changed[k] = changed[k].replace(/[0-9a-f]$/, c => (c === '0' ? '1' : '0'));
    const ctl = changed.reduce((s, l, i) => s + (l !== got[i] ? 1 : 0), 0) === 1 + (fail ? fail : 0);
    // the precision controls, on the planted cases (12-15, whose near-ties sit 10^-40 to 10^-300 apart): with the square
    // roots at 64 bits in place of 1,024 and the guard off, some line must differ; with the guard on, the run must stop
    // with a PrecisionError instead of giving codes
    const planted = [12, 13, 14, 15], wantP = want.filter(l => l.startsWith('#') || planted.includes(Number(l.split(' ')[0])));
    const coarse = S2.withPrecision(64, () => S2.stage2TraceLines(planted), { guard: false });
    const coarseDiff = wantP.reduce((s, l, i) => s + (l !== coarse[i] ? 1 : 0), 0);
    let guarded = false;
    try { S2.withPrecision(64, () => S2.stage2TraceLines(planted)); } catch (e) { guarded = e instanceof S2.PrecisionError; }
    const ctl2 = coarseDiff > 0 && guarded && S2.precision().FP === 1024n;
    const shaW = sha256(want.join('\n') + '\n'), shaG = sha256(got.join('\n') + '\n');
    console.log(`trace: ${n - fail}/${n} lines equal (stage2_v1.txt SHA-256 ${shaW.slice(0, 16)}…, rendered ${shaG.slice(0, 16)}…); controls: one changed line fails exactly one line ${ctl ? 'ok' : 'FAIL'}; 64-bit roots change ${coarseDiff} planted lines (guard off) and stop with a PrecisionError (guard on) ${ctl2 ? 'ok' : 'FAIL'}; ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    return { fail: fail + (ctl ? 0 : 1) + (ctl2 ? 0 : 1) };
}

async function main() {
    if (opt('--worker')) return worker(JSON.parse(argv[argv.indexOf('--worker') + 1]));
    const doTrace = opt('--trace') || !opt('--codes'), doCodes = opt('--codes') || !opt('--trace');
    let fail = 0, skipped = false;
    if (doTrace) fail += traceSection().fail;
    if (doCodes) { const r = await codesSection(); if (r.skipped) skipped = true; else fail += r.fail; }
    if (fail) process.exit(1);
    if (skipped) process.exit(doTrace ? 3 : 2);
    process.exit(0);
}
if (require.main === module) main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
module.exports = { fileGroups, makeWorld, instanceOf, hitInstance, render, renderPairs, armOf, learnedArm, checkOne, pyGzip };
