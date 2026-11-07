// Hyperbolic Lexicon: L1's four instance lists in Node, each string as its UTF-8 bytes (a Buffer), the twin of
// reference/lexicon/l1.py (PREREGISTRATION.md L1; Amendment 1 item 2; Amendment 2 item 3; Amendment 4 items 2 and 7).
// Loaders only: nothing here normalises, tokenizes or compares an instance.
//
//   const L = require('./l1_instances_v1.cjs');
//   L.instanceA(wn?)     (a) every WordNet 3.0 gloss field, (part of speech, offset) order: 117,659
//   L.instanceB()        (b) every '# text = ' sentence of UD English EWT train, dev, test: 16,622
//   L.instanceC()        (c) the Unicode stress set's cases, groups in order: 20,520
//   L.instanceD()        (d) 2,000 synthetic strings, string i from Rng(1000 + i)
//   L.dry(i), L.dryD()   dry runs: Rng(4000 + i), and the 2,000 of them; L.traceString(i): Rng(8000 + i)
//   L.markdown()         the dry run's repository Markdown (spike S6's corpus), one instance per file
//   L.digest(list)       lexicon.l1.digest: SHA-256 over each string's 8-byte big-endian UTF-8 length, then its bytes
//   L.loadAll()          { a, b, c, d } checked against l1_instances_v1.meta.json (throws on any difference)
//
//   node "Pages/Hyperbolic Lexicon/reference/golden/l1_instances_v1.cjs" --check
//       recompute the four lists and dry_d and compare each count and digest with l1_instances_v1.meta.json
//       (hashing only); exit 0 equal, 1 different, 2 skipped when the WordNet or UD EWT cache is missing
//
// (a) is read with wordnet_v1.cjs (the gloss after ' | ', trimmed, as Amendment 1 item 2 defines it); (b) from the
// cache make_ewt_v1.cjs fills, each file refused unless its SHA-256 is ewt_v1.meta.json's; (c) from
// spikes/s6_stress_set_v1.json, refused unless its SHA-256 is the registered bd1179ea…; (d) with hyperbolic_core.js's
// Rng (= hpstep.prng.Rng) and l1.py's pool.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const GOLDEN = __dirname;
const SYSTEM = path.resolve(GOLDEN, '..', '..');
const REPO = path.resolve(SYSTEM, '..', '..');
const HP = require(path.join(SYSTEM, '..', 'Hyperbolic Oracles', 'hyperbolic_core.js'));
const LC = require(path.join(SYSTEM, 'lexicon_core.js'));
const W = require('./wordnet_v1.cjs');

const CACHE = process.env.HL_CACHE || path.join(os.homedir(), '.cache', 'hyperbolic-lexicon');
const EWT_DIR = path.join(CACHE, 'ewt');
const EWT_FILES = ['en_ewt-ud-train.conllu', 'en_ewt-ud-dev.conllu', 'en_ewt-ud-test.conllu'];
const STRESS_PATH = path.join(SYSTEM, 'spikes', 's6_stress_set_v1.json');
const STRESS_SHA256 = 'bd1179ea80eb3dd44e05a4efa0484f034a637a66d8f09ffe10e428f040f6e94a';
const META = path.join(GOLDEN, 'l1_instances_v1.meta.json');
const SEED_D = 1000, SEED_DRY = 4000, SEED_TRACE = 8000, N_D = 2000;
const SPIKE_MARKDOWN_COMMIT = '7b10514a4f2955c92cd0a06a3a658998080cb310';   // spike S6's PIN_COMMIT

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const u8 = cps => Buffer.from(LC.utf8FromCps(cps));

// (a) lexicon.wordnet.glosses: parts of speech noun, verb, adj, adv; offsets sorted as strings (= numeric order).
// The data files are read as Latin-1 (they are ASCII), so a gloss's UTF-8 is that of its Latin-1 code points, as
// Python's gloss.encode('utf-8').
function instanceA(wn = W.load()) {
    const out = [];
    for (const pos of W.POS) {
        const m = wn.synsets[pos];
        for (const off of [...m.keys()].sort()) out.push(Buffer.from(m.get(off).gloss, 'utf8'));
    }
    return out;
}

function ewtAvailable() { return EWT_FILES.every(f => fs.existsSync(path.join(EWT_DIR, f))); }
// (b) the rest of each line that starts with '# text = ', without its line ending (LF, or CRLF: the pinned files hold
// no CR), train then dev then test. Split on the byte 0x0A, which never occurs inside a UTF-8 sequence, so this equals
// Python's split of the decoded text; each file must be well-formed UTF-8 (Python decodes it strictly).
function instanceB(split = null) {
    const meta = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'ewt_v1.meta.json'), 'utf8')).files;
    const PREFIX = Buffer.from('# text = ');
    const out = [];
    for (const f of EWT_FILES) {
        if (split !== null && f !== `en_ewt-ud-${split}.conllu`) continue;
        const p = path.join(EWT_DIR, f);
        if (!fs.existsSync(p)) throw new Error(`no UD EWT file at ${p}: run make_ewt_v1.cjs first`);
        const blob = fs.readFileSync(p);
        if (sha256(blob) !== meta[f].sha256) throw new Error(`${p} is not the pinned file`);
        const bad = LC.utf8FirstBad(blob);
        if (bad >= 0) throw new Error(`${p}: invalid UTF-8 at byte ${bad}`);
        let a = 0;
        while (a <= blob.length) {
            let e = blob.indexOf(0x0A, a);
            if (e < 0) e = blob.length;
            if (e - a >= PREFIX.length && blob.subarray(a, a + PREFIX.length).equals(PREFIX)) {
                const end = e > a && blob[e - 1] === 0x0D ? e - 1 : e;
                out.push(Buffer.from(blob.subarray(a + PREFIX.length, end)));
            }
            a = e + 1;
        }
    }
    return out;
}

let STRESS = null;
function stressSet() {                          // the parsed stress set, refused unless its SHA-256 is the registered one
    if (!STRESS) {
        const blob = fs.readFileSync(STRESS_PATH), digest = sha256(blob);
        if (digest !== STRESS_SHA256) throw new Error(`${STRESS_PATH}: sha256 ${digest} is not the registered ${STRESS_SHA256}`);
        STRESS = JSON.parse(blob.toString('latin1'));   // ASCII (Python decodes it as 'ascii')
    }
    return STRESS;
}
// a case: upper-case hex code points joined by single spaces ('' is the empty string)
const fromHexCps = h => (h ? h.split(' ').map(x => parseInt(x, 16)) : []);
// (c) the cases of each group, groups in order
function instanceC() {
    const s = stressSet(), out = [];
    for (const g of s.groups) for (const h of s.cases[g]) out.push(u8(fromHexCps(h)));
    return out;
}

// (d)'s pool, one list in code-point order: the whole blocks or ranges named in L1 (d) (Amendment 2 item 3: Greek is
// U+0370-03FF), their union without repeats, plus the stress set's post151First64 (the 64 code points assigned after
// 15.1 that spike S6 wrote as L1(d)'s pool): 12,726 code points. As reference/lexicon/l1.py POOL_RANGES.
const POOL_RANGES = [[0x0000, 0x007F], [0x0080, 0x00FF], [0x0100, 0x017F], [0x0300, 0x036F], [0x0370, 0x03FF],
    [0x0400, 0x04FF], [0xAC00, 0xD7A3], [0x4E00, 0x4FFF], [0x1F600, 0x1F64F], [0x0000, 0x001F],
    [0x200B, 0x200B], [0xFEFF, 0xFEFF]];
const post151 = () => stressSet().post151First64.map(h => parseInt(h, 16));
let POOL = null;
function pool() {
    if (!POOL) {
        const s = new Set();
        for (const [a, b] of POOL_RANGES) for (let c = a; c <= b; c++) s.add(c);
        for (const c of post151()) s.add(c);
        POOL = [...s].sort((x, y) => x - y);
    }
    return POOL;
}
// one synthetic string: Rng(seed), length 1 + below(64), each code point pool()[below(len(pool()))], drawn in order
function synthetic(seed) {
    const p = pool(), r = new HP.Rng(seed), n = 1 + r.below(64), cps = [];
    for (let k = 0; k < n; k++) cps.push(p[r.below(p.length)]);
    return u8(cps);
}
const instanceD = () => Array.from({ length: N_D }, (_, i) => synthetic(SEED_D + i));
const dry = i => synthetic(SEED_DRY + i);
const dryD = () => Array.from({ length: N_D }, (_, i) => dry(i));
const traceString = i => synthetic(SEED_TRACE + i);

// Amendment 4 item 7's other dry instance set: the repository Markdown spike S6 used, one instance per file: every
// blob under Pages/ whose path ends in '.md' at commit 7b10514, sorted by path bytes, as S6 read it (read-only git
// plumbing, so later edits to the working tree do not move it).
function markdown() {
    const git = args => execFileSync('git', ['-C', REPO, ...args], { maxBuffer: 1 << 28 });
    const raw = git(['ls-tree', '-r', '-z', '--full-tree', SPIKE_MARKDOWN_COMMIT, '--', 'Pages']), items = [];
    for (let i = 0; i < raw.length;) {
        const z = raw.indexOf(0, i), ent = raw.subarray(i, z);
        i = z + 1;
        const tab = ent.indexOf(9), [, type, oid] = ent.subarray(0, tab).toString('latin1').split(' '), p = ent.subarray(tab + 1);
        if (type === 'blob' && p.subarray(0, 6).equals(Buffer.from('Pages/')) && p.subarray(p.length - 3).equals(Buffer.from('.md'))) items.push({ p, oid });
    }
    items.sort((a, b) => Buffer.compare(a.p, b.p));
    return items.map(it => ({ path: it.p.toString('utf8'), data: git(['cat-file', 'blob', it.oid]) }));
}

// lexicon.l1.digest
function digest(list) {
    const h = crypto.createHash('sha256'), len = Buffer.alloc(8);
    for (const b of list) { len.writeBigUInt64BE(BigInt(b.length)); h.update(len); h.update(b); }
    return h.digest('hex');
}

function meta() { return JSON.parse(fs.readFileSync(META, 'utf8')); }
// each list against the meta: [name, count, digest, ok]
function checkLists(lists) {
    const m = meta();
    return Object.entries(lists).map(([k, v]) => {
        const want = k === 'dry_d' ? m.dry_d : m.instances[k], d = digest(v);
        return [k, v.length, d, !!want && want.count === v.length && want.sha256 === d];
    });
}
// the four lists, refused unless every one matches the meta (Amendment 4 item 2: before Node runs)
function loadAll() {
    const lists = { a: instanceA(), b: instanceB(), c: instanceC(), d: instanceD() };
    const bad = checkLists(lists).filter(r => !r[3]);
    if (bad.length) throw new Error('L1 instance lists differ from l1_instances_v1.meta.json: ' + bad.map(r => r[0]).join(', '));
    return lists;
}

function main() {
    if (!fs.existsSync(W.ZIP_PATH) || !ewtAvailable()) {
        console.error('skipped: the WordNet or UD EWT cache is missing (make_wordnet_v1.cjs, make_ewt_v1.cjs)');
        process.exit(2);
    }
    const t0 = Date.now();
    const lists = { a: instanceA(), b: instanceB(), c: instanceC(), d: instanceD(), dry_d: dryD() };
    const rows = checkLists(lists);
    for (const [k, n, d, ok] of rows) console.log(`${ok ? 'ok  ' : 'MISMATCH'}  (${k}) ${n} strings, sha256 ${d}`);
    const bad = rows.filter(r => !r[3]).length;
    console.log(bad ? `${bad} list(s) differ from l1_instances_v1.meta.json` : `L1 instance lists match l1_instances_v1.meta.json (pool ${pool().length} code points; ${Date.now() - t0} ms)`);
    process.exit(bad ? 1 : 0);
}

if (require.main === module) main();
module.exports = { instanceA, instanceB, instanceC, instanceD, dry, dryD, traceString, synthetic, pool, POOL_RANGES, post151, stressSet,
    markdown, digest, checkLists, loadAll, ewtAvailable, SEED_D, SEED_DRY, SEED_TRACE, N_D, SPIKE_MARKDOWN_COMMIT, STRESS_SHA256 };
