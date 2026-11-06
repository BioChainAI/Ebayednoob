#!/usr/bin/env node
// Hyperbolic Lexicon, Phase 3: the decisions of L8, L9, L10 and L11 (PREREGISTRATION.md: L8-L11, D7, D8, the common
// rules, and Amendment 7 items 1-8).
//
//   node "Pages/Hyperbolic Lexicon/reference/run_claims_phase3.cjs"          the decisive run: results/claims-phase3.json, .md
//   node "Pages/Hyperbolic Lexicon/reference/run_claims_phase3.cjs" --dry    the registered dry run (Amendment 7 item 8):
//                                                                            results/dry/claims-phase3.json, .md
// Options: --owl <Owl-Academy checkout> and --biochain <BioChain-AI checkout> (default: next to this repository),
// --workers <n> (default min(4, cores)). --smoke --out <dir> (with --dry only) is a development run on 3 shards a set
// and a few tampers; it writes only into <dir> and decides nothing.
//
// It needs Node 22 (globalThis.crypto.subtle, worker_threads), python3 with cryptography and numpy, the WordNet
// archive in the cache (golden/make_wordnet_v1.cjs), Owl Academy at 7f45f35 and BioChain-AI at c975161 (both only
// read; their code runs unchanged by name-grab, as spikes S4 and S7 ran it). The Python half is
// run_claims_phase3.py, started as python3 -B with one JSON request in the cache. Per-instance data goes to
// ~/.cache/hyperbolic-lexicon/phase3[-dry]/ (HL_CACHE overrides the root), never into git.
//
// What it does, in order (each step refuses to go on when its inputs are not the registered ones):
//   1. Gate: spawns tests/parity-lexicon.cjs and refuses unless every line passes and none is skipped (the chain
//      section, reference/traces/chain_v1.txt, included). Checks the Owl and BioChain-AI checkouts' commits and that
//      their files are unchanged.
//   2. Inputs. Decisive: C0 (lexicon_core.js glossShards over the nouns, the cut of golden/make_wordnet_v1.cjs, equal
//      to the 148 SHA-256s of golden/wordnet_v1.meta.json) and the 20 synthetic shards of Amendment 7 item 2 from
//      Rng(1000 + i). Dry: Rng(4000 + i) synthetic shards and the verb and adjective gloss shards (spike S4's cut,
//      checked against its digest). Every synthetic shard is checked for 20,000-60,000 bytes and >= 25% two-byte code
//      points (refused otherwise); Python regenerates every text and its SHA-256 must be the runner's.
//   3. L8: every shard grown with engrams off and on by growSync (lexicon_core.js), Owl's growBiochain (the
//      authority) and BioChain-AI's (worker threads, for Owl's verbatim engram layer, ~7 s a shard), and the Python
//      port (chain.grow); the fields that differ from Owl's record, per shard and grower; Owl's and BioChain-AI's
//      verifyIntegrity and EngramCore.importBiochain (flag, and the recreated text byte for byte) on every distinct
//      record; (d) Python against JS for the V0 id stream and its SHA-256, LVOCAB/1, LADDR/1 with addrTableRoot, and
//      every LPREP/1 string. Controls: 1. Python's grower with BioChain-AI's packet normalisation must differ from
//      Owl's record on >= 1 synthetic shard; 2. a grower with leaves over binary bytes must differ on every shard and
//      be rejected by Owl's verifyIntegrity; 3. one byte of every shard altered must change its leaf and its root.
//      Reported: the share of chunks whose crystal holds 0x80, value per shard, timings.
//   4. L9 (a): the RFC 6962 manifest over the LPREP/1 strings of the package mode (C0's 148; dry: the verb shards) and
//      the synthetic leaf lists of Amendment 7 item 5 (Rng(1000 + j); dry Rng(4000 + j)), in JS and Python: roots,
//      every inclusion proof for its own leaf and position and the two wrong ones, consistency proofs (every m < N
//      for K <= 200; 2,000 drawn from Rng(2000 + j) otherwise), the alterations (every one for K <= 200; 2,000 drawn
//      otherwise), JS = Python for every root and proof. (b) every corpus shard's exact weave: norm 5^(28K), unfold in
//      order, the product of its 7 segment sub-weaves, JS = Python. Controls 1 (the shdccp/2 rule at K = 3, 7, 1001)
//      and 2 (XOR of the prefixes against the weave, by adjacent swaps).
//   5. L10: P-256 keys made here in WebCrypto (one active, one the registry marks revoked; private keys never leave
//      memory), identity and keyVector by BioChain-AI's own computeIdentityId and deriveKeyVector (name-grab), the
//      registry snapshot written to results with its SHA-256; a package for every corpus shard; the 50 clean ones
//      (Rng(1000 + i).below(148) until 50 distinct; dry Rng(4000 + i) over the verb shards) and 9 x 50 tampered ones
//      (record j of class k from Rng(2000 + 50(k - 1) + j); dry 5000); every package verified in JS and in Python;
//      false accepts and rejects in each, the verdicts (selfConsistent, authentic, failed) compared. Control 1: Owl's
//      verifyIntegrity on the T1, T2, T8 and T9 records; control 2: Python without the P1363-to-DER conversion on
//      every valid signature made here.
//   6. L11 (nothing else running): a timed session (LADDR/1 recomputed from WordNet once), then every corpus shard of
//      >= 59,000 bytes verified 3 times with process.hrtime.bigint, the first discarded, the attestation-skipped
//      control interleaved; the literal per-shard LADDR variant and the engrams-off packages reported; Python's time;
//      the median's bootstrap interval (numpy default_rng(7), 10,000 resamples) from the Python half.
//   7. Decisions exactly as registered; results[/dry]/claims-phase3.json and .md, results[/dry]/phase3-registry.json.
// Exits 1 when it refuses or fails; 0 when the results are written, whatever they decide.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync, execFileSync } = require('child_process');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const REF = __dirname;
const SYS = path.resolve(REF, '..');
const ROOT = path.resolve(SYS, '..', '..');
const EME = path.join(SYS, '..', 'Engram Minds Eye');
const F_OWL = 'scripts/biomesh.js', F_BIO = 'src/biomesh/biomesh.js', F_CC = 'src/identity/crypto-core.js', F_IR = 'src/identity/identity-registry.js';
const PINNED = { owl: '7f45f35', biochain: 'c975161' };
const nodeSha = b => crypto.createHash('sha256').update(typeof b === 'string' ? Buffer.from(b, 'utf8') : b).digest('hex');   // comparisons and files only

// ---- Owl Academy's / BioChain-AI's growBiochain and verifyIntegrity, run as written (spike S4's loadOwl,
// golden/make_biomesh_compat_v1.cjs), their sha256Hex stood in for by Node crypto's SHA-256 over UTF-8
function loadGrower(root, file, ns) {
    const { grab } = require(path.join(EME, 'reference', 'golden', 'owl_eye.cjs'));
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    const line = start => { const i = src.indexOf(start); if (i < 0) throw new Error(`${start} not found in ${file}`); return src.slice(i, src.indexOf('\n', i)).trim(); };
    const SYNC = ['M64', 'fold64', 'qmul', 'qconj', 'qn', 'crystalQuat', 'quatHex', 'PAR_MASK', 'popcountEven', 'crystallize', 'unpackPacket', 'packWord',
        'mulberry32', 'engramCharGrid', 'engramGrid', 'engramGridHex', 'engramJ', 'tokenizeEngrams', 'engramStreamFromText',
        'frameStream', 'parseBiochainStream', 'BW', 'BR', 'cands', 'upd', 'encodeChunk', 'decodeChunk', 'chainFrames', 'recreateChunks', 'recreateText', 'parseCodexStream'];
    const consts = [line('export const MAX_GROW_BYTES'), line('export const STREAM_VERSION'), line('const CHUNK = ')].map(l => l.replace(/^export /, ''));
    const body = consts.concat(SYNC.map(n => grab(src, n).replace(/^export /, ''))).join('\n');
    return new Function(ns, body + '\n' + grab(src, 'growBiochain').replace(/^export /, '') + '\n' + grab(src, 'verifyIntegrity').replace(/^export /, '') +
        '\nreturn { growBiochain, verifyIntegrity };')({ sha256Hex: async str => nodeSha(str) });
}

// ================================================================== worker threads (Owl's verbatim engram layer)
function workerMain() {
    const owl = loadGrower(workerData.owl, F_OWL, 'SC'), bio = loadGrower(workerData.biochain, F_BIO, 'CC');
    const BC = require(path.join(EME, 'biochain_v1.js')), EC = require(path.join(EME, 'engram_core.js'));
    parentPort.on('message', async job => {
        const t = process.hrtime.bigint();
        let out;
        try {
            if (job.kind === 'grow') out = { record: await (job.grower === 'owl' ? owl : bio).growBiochain(job.text, { engrams: job.engrams }) };
            else if (job.kind === 'verify') { const r = await (job.verifier === 'owl' ? owl : bio).verifyIntegrity(job.record); out = { ok: r.ok === true, reasons: r.reasons }; }
            else if (job.kind === 'import') {
                const imp = EC.importBiochain(BC, job.record);
                out = { verified: imp.verified === true, textEqual: typeof imp.text === 'string' && Buffer.from(imp.text, 'utf8').equals(Buffer.from(job.data)),
                    detail: imp.checks.map(c => `${c.ok}`).join(',') };
            } else throw new Error('unknown job ' + job.kind);
        } catch (e) { out = { error: e && e.message ? e.message : String(e) }; }
        out.id = job.id; out.ms = Number(process.hrtime.bigint() - t) / 1e6;
        parentPort.postMessage(out);
    });
}

// ================================================================== L11's timing process (Amendment 7 item 7)
// node run_claims_phase3.cjs --l11-child <request.json> <response.json>, started by the runner with nothing else running.
// A fresh process: WordNet and V0 loaded, then the session timed (LVOCAB/1, LADDR/1 recomputed from WordNet, the
// registry snapshot loaded); then repetition-major passes over the shards, each shard's full verification and its
// attestation-skipped verification back to back, the order alternating ((pass + shard) even: full first), each timed
// with process.hrtime.bigint; then the literal variant (LADDR/1 recomputed inside each verification) and the
// engrams-off packages, 3 repetitions each. A shard's time is the mean of its repetitions 2 and 3.
async function l11Child(reqPath, resPath) {
    const LC = require(path.join(SYS, 'lexicon_core.js'));
    const W = require('./golden/wordnet_v1.cjs');
    const req = JSON.parse(fs.readFileSync(reqPath, 'utf8'));
    const readJsonl = p => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    const pkgs = readJsonl(req.packagesPath), offPkgs = readJsonl(req.offPackagesPath);
    const wn = W.load(), vocab = LC.loadV0();
    LC.chainCores();
    const hr = () => process.hrtime.bigint(), msSince = t => Number(process.hrtime.bigint() - t) / 1e6, clockMs = () => Number(process.hrtime.bigint()) / 1e6;
    const sum = xs => xs.reduce((a, b) => a + b, 0), mean = xs => sum(xs) / xs.length, keep = xs => xs.slice(1);
    const say = m => process.stdout.write(`   [l11] ${m}\n`);
    const ts = hr(), session = await LC.chainSession({ vocab, wn, registry: req.registry, registrySha256: req.registrySha256, clock: clockMs }), sessionMs = msSince(ts);
    if (session.laddrHash !== req.laddrHash) throw new Error('the session\'s LADDR/1 is not the committed one');
    say(`session ${sessionMs.toFixed(1)} ms (LADDR/1 ${session.timings.laddr.toFixed(1)} ms)`);
    const timed = async (pkg, o = {}) => { const t = hr(), v = await LC.verifyPackage(session, pkg, { clock: clockMs, ...o }); return { ms: msSince(t), v }; };
    const seconds = {};
    let t0 = hr();
    const rows = req.shards.map(x => ({ ...x, full: [], skip: [], checks: [], failed: [], skipFailed: [] }));
    for (let rep = 0; rep < req.reps; rep++) {
        for (let b = 0; b < rows.length; b++) {
            const row = rows[b];
            for (const kind of ((rep + b) % 2 === 0 ? ['full', 'skip'] : ['skip', 'full'])) {
                const { ms, v } = await timed(pkgs[b], kind === 'skip' ? { skip: ['attestation'] } : {});
                row[kind].push(ms);
                if (kind === 'full') { row.checks.push(Object.fromEntries(v.checks.map(c => [c.name, c.ms]))); row.failed.push(v.failed); } else row.skipFailed.push(v.failed);
            }
        }
        say(`pass ${rep + 1}/${req.reps} (${(msSince(t0) / 1000).toFixed(1)} s)`);
    }
    rows.forEach(r => { r.ms = mean(keep(r.full)); r.msSkip = mean(keep(r.skip)); r.byCheck = Object.fromEntries(LC.CHECKS.map(c => [c, mean(keep(r.checks).map(x => x[c] || 0))])); delete r.checks; });
    seconds.protocol = msSince(t0) / 1000; t0 = hr();
    const literal = rows.slice(0, req.literal).map(r => ({ shard: r.shard, reps: [], failed: [] }));
    for (let rep = 0; rep < req.reps; rep++) for (let b = 0; b < literal.length; b++) { const { ms, v } = await timed(pkgs[b], { recomputeAddr: true }); literal[b].reps.push(ms); literal[b].failed.push(v.failed); }
    literal.forEach(r => { r.ms = mean(keep(r.reps)); });
    seconds.literal = msSince(t0) / 1000; t0 = hr();
    say(`literal variant (${literal.length} shards) ${seconds.literal.toFixed(1)} s`);
    const off = rows.map(r => ({ shard: r.shard, reps: [], failed: [] }));
    for (let rep = 0; rep < req.reps; rep++) for (let b = 0; b < off.length; b++) { const { ms, v } = await timed(offPkgs[b]); off[b].reps.push(ms); off[b].failed.push(v.failed); }
    off.forEach(r => { r.ms = mean(keep(r.reps)); });
    seconds.engrams_off = msSince(t0) / 1000;
    fs.writeFileSync(resPath, JSON.stringify({ session: { ms: sessionMs, timings: session.timings, laddrHash: session.laddrHash }, rows, literal, off, seconds,
        process: { pid: process.pid, node: process.version, rss_mb: Math.round(process.memoryUsage().rss / 1048576) } }));
}

if (!isMainThread) workerMain();
else if (process.argv[2] === '--l11-child') l11Child(process.argv[3], process.argv[4]).then(() => process.exit(0), e => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
else main().catch(e => { console.error(e && e.stack ? e.stack : e); process.exit(1); });

// ================================================================== the main thread
async function main() {
    const LC = require(path.join(SYS, 'lexicon_core.js'));
    const HP = require(path.join(SYS, '..', 'Hyperbolic Oracles', 'hyperbolic_core.js'));
    const W = require('./golden/wordnet_v1.cjs');
    const { BC, EC } = LC.chainCores();
    const { grab } = require(path.join(EME, 'reference', 'golden', 'owl_eye.cjs'));

    const ARGS = process.argv.slice(2);
    const opt = (name, def) => { const i = ARGS.indexOf(name); return i >= 0 ? ARGS[i + 1] : def; };
    const DRY = ARGS.includes('--dry'), SMOKE = ARGS.includes('--smoke');
    const OFF = DRY ? 3000 : 0;                    // Amendment 1 item 10, Amendment 7 item 8: +3000 on every seed in a dry run
    const CACHE = process.env.HL_CACHE || path.join(os.homedir(), '.cache', 'hyperbolic-lexicon');
    let RESULTS = path.join(REF, 'results', ...(DRY ? ['dry'] : [])), CACHE_DIR = path.join(CACHE, DRY ? 'phase3-dry' : 'phase3');
    if (SMOKE) {
        if (!DRY || !opt('--out')) { console.error('REFUSED: --smoke needs --dry and --out <dir>'); process.exit(1); }
        RESULTS = path.resolve(opt('--out')); CACHE_DIR = path.join(RESULTS, 'cache');
    }
    const OWL_DIR = path.resolve(opt('--owl', path.join(ROOT, '..', 'Owl-Academy')));
    const BIO_DIR = path.resolve(opt('--biochain', path.join(ROOT, '..', 'BioChain-AI')));
    const N_WORKERS = Math.max(1, Number(opt('--workers', Math.min(4, os.availableParallelism ? os.availableParallelism() : os.cpus().length))));

    // registered constants (Amendment 7 items 2, 5, 6, 7)
    const N_SYNTH = SMOKE ? 3 : 20, SYNTH_BASE = 1000 + OFF;
    const KS = SMOKE ? [1, 2, 3, 7, 84] : [1, 2, 3, 7, 84, 200, 1000, 1001], LIST_BASE = 1000 + OFF, DRAW_BASE = 2000 + OFF, SAMPLES = 2000, EVERY_MAX = 200;
    const N_CLEAN = SMOKE ? 3 : 50, PER_CLASS = SMOKE ? 2 : 50, CLEAN_BASE = 1000 + OFF, TAMPER_BASE = 2000 + OFF;
    const REPS = 3, L11_MIN_BYTES = 59000, L11_BAR = 250, L11_REFUTE = 500;
    const KEEP = 20;                               // counterexamples kept in the JSON (as run_claims.py)
    // READING (runner 1): the packages of L10 and L11, and the corpus manifest of L9(a), are grown with engrams on.
    // L10 packages "the biochain record (Owl's fields)", and L8 lists Owl's fields as fifteen, the engram trio among
    // them; growBiochain's opts.engrams defaults to true. L11's time on engrams-off packages is reported, deciding nothing.
    const PACKAGE_MODE = 'on';
    const CORPUS_SET = DRY ? 'verb' : 'c0';
    const SETS = DRY
        ? [{ set: 'synth', corpusId: LC.CHAIN_PINS.synthCorpusId, spdx: LC.CHAIN_PINS.synthSpdx, sourceBase: SYNTH_BASE, kernel: true },
            { set: 'verb', corpusId: 'wordnet30-verb', spdx: LC.CHAIN_PINS.c0Spdx }, { set: 'adj', corpusId: 'wordnet30-adj', spdx: LC.CHAIN_PINS.c0Spdx }]
        : [{ set: 'c0', corpusId: LC.CHAIN_PINS.c0CorpusId, spdx: LC.CHAIN_PINS.c0Spdx },
            { set: 'synth', corpusId: LC.CHAIN_PINS.synthCorpusId, spdx: LC.CHAIN_PINS.synthSpdx, sourceBase: SYNTH_BASE, kernel: true }];
    const CLASSES = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'];

    const T0 = performance.now();
    const secs = t => Math.round((performance.now() - t) / 100) / 10;
    const log = msg => console.log(msg);
    const rel = p => path.relative(REF, p);
    const refuse = msg => { console.error(`REFUSED: ${msg}`); process.exit(1); };
    const tick = () => new Promise(r => setImmediate(r));
    const hr = () => process.hrtime.bigint();
    const msSince = t => Number(process.hrtime.bigint() - t) / 1e6;
    const clockMs = () => Number(process.hrtime.bigint()) / 1e6;
    const median = xs => { const s = xs.slice().sort((a, b) => a - b), n = s.length; return n ? (n & 1 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
    const r1 = x => (x === null || x === undefined ? null : Math.round(x * 10) / 10);
    const r3 = x => (x === null || x === undefined ? null : Math.round(x * 1000) / 1000);
    const clone = o => JSON.parse(JSON.stringify(o));
    const lastDigit = s => s.slice(0, -1) + (s.endsWith('0') ? '1' : '0');   // S4's rule (the trace's T3 and T8)
    const sum = xs => xs.reduce((a, b) => a + b, 0);
    const pad2 = i => String(i).padStart(2, '0'), pad3 = i => String(i).padStart(3, '0');
    const shardName = (set, i) => (set === 'c0' ? `c0 ${pad3(i)}` : `${set} ${pad2(i)}`);
    function exactDecision(failures, controlsShowWeakness = true) { return !controlsShowWeakness ? 'void' : failures === 0 ? 'supported' : 'refuted'; }
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.mkdirSync(RESULTS, { recursive: true });
    const timings = {};
    const readings = [];
    const reading = (id, text) => { readings.push({ id, text }); };
    log(`Phase 3: L8-L11${DRY ? ' (dry run)' : ''}${SMOKE ? ' (SMOKE: a development run, decides nothing)' : ''}; results to ${SMOKE ? RESULTS : rel(RESULTS)}, per-instance data to ${CACHE_DIR}`);

    // ============================================================== 1. the gate
    function gate() {
        const t = performance.now();
        const r = spawnSync(process.execPath, [path.join(SYS, 'tests', 'parity-lexicon.cjs'), '--quiet'], { encoding: 'utf8', maxBuffer: 256 << 20 });
        const lines = `${r.stdout || ''}${r.stderr || ''}`.split('\n');
        const summary = lines.filter(l => l.startsWith('Parity:')).pop() || '';
        const m = /^Parity: (\d+)\/(\d+) lines pass/.exec(summary);
        const failing = lines.filter(l => /^\s*FAIL\b/.test(l)), skipped = lines.filter(l => /^\s*skip\b/.test(l) || /skipped/.test(l));
        const chain = lines.filter(l => /^ok\s+chain_v1\.txt: (\d+)\/\1\b/.test(l) || /^ok\s+chain: controls/.test(l));
        const out = { command: 'node tests/parity-lexicon.cjs --quiet', exit: r.status, summary, pass: m ? +m[1] : null, total: m ? +m[2] : null,
            chain_sections: chain.map(l => l.trim().replace(/\s+\(\d+ ms\)$/, '')), seconds: secs(t) };
        if (r.status !== 0 || !m || m[1] !== m[2] || failing.length) refuse(`tests/parity-lexicon.cjs does not pass (exit ${r.status}): ${summary || 'no summary'}\n${failing.slice(0, 20).join('\n')}`);
        if (skipped.length) refuse(`tests/parity-lexicon.cjs skipped lines: ${skipped.join(' | ')}`);
        if (chain.length !== 2) refuse('tests/parity-lexicon.cjs did not run the chain section (chain_v1.txt and its control)');
        return out;
    }
    log('1. gate: tests/parity-lexicon.cjs (the chain section included), the Owl Academy and BioChain-AI checkouts ...');
    const PARITY = gate();
    log(`   ${PARITY.summary}; ${PARITY.chain_sections.join('; ')}`);
    function checkout(dir, pinned, files) {
        if (!fs.existsSync(dir)) refuse(`no checkout at ${dir} (pass --owl / --biochain)`);
        let commit = null, dirty = null;
        try { commit = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD']).toString().trim(); dirty = execFileSync('git', ['-C', dir, 'status', '--porcelain', '--', ...files]).toString().trim(); } catch (e) { refuse(`${dir} is not a git checkout`); }
        if (!commit.startsWith(pinned)) refuse(`${dir} is at ${commit}, not the registered ${pinned}`);
        if (dirty) refuse(`${dir}: the registered files are changed: ${dirty}`);
        return { path: dir, commit, files: Object.fromEntries(files.map(f => [f, nodeSha(fs.readFileSync(path.join(dir, f)))])) };
    }
    const EXT = { owl: checkout(OWL_DIR, PINNED.owl, [F_OWL]), biochain: checkout(BIO_DIR, PINNED.biochain, [F_BIO, F_CC, F_IR]) };
    log(`   Owl Academy ${EXT.owl.commit.slice(0, 12)} (${F_OWL} ${EXT.owl.files[F_OWL].slice(0, 12)}...), BioChain-AI ${EXT.biochain.commit.slice(0, 12)} (${F_BIO} ${EXT.biochain.files[F_BIO].slice(0, 12)}...): unchanged`);

    // ============================================================== the worker pool and the Python half
    class Pool {
        constructor(n) { this.n = n; this.queue = []; this.workers = []; this.seq = 0; this.timeoutMs = 600000; this.jobs = 0; }
        start() { while (this.workers.length < this.n) this.spawn(); return this; }
        spawn() {
            const w = new Worker(__filename, { workerData: { owl: OWL_DIR, biochain: BIO_DIR } });
            w.task = null;
            w.on('message', m => this.done(w, m));
            w.on('error', e => this.lost(w, `worker error: ${e && e.message ? e.message : e}`));
            this.workers.push(w);
            this.pump();
        }
        run(job) { return new Promise(resolve => { this.queue.push({ id: this.seq++, job, resolve }); this.pump(); }); }
        pump() {
            for (const w of this.workers) {
                if (w.task || !this.queue.length) continue;
                const t = this.queue.shift();
                w.task = t;
                t.timer = setTimeout(() => this.lost(w, 'timeout'), this.timeoutMs);
                w.postMessage({ ...t.job, id: t.id });
            }
        }
        done(w, m) { const t = w.task; if (!t) return; clearTimeout(t.timer); w.task = null; this.jobs++; t.resolve(m); this.pump(); }
        lost(w, why) {
            const t = w.task;
            w.removeAllListeners(); w.terminate();
            this.workers = this.workers.filter(x => x !== w);
            if (t) { clearTimeout(t.timer); t.resolve({ error: why }); }
            this.spawn();
        }
        async close() { const ws = this.workers; this.workers = []; await Promise.all(ws.map(w => { w.removeAllListeners(); return w.terminate(); })); }
    }
    function runPython(task, req, tag) {
        return new Promise((resolve, reject) => {
            const reqPath = path.join(CACHE_DIR, `python-${tag}-request.json`), resPath = path.join(CACHE_DIR, `python-${tag}-response.json`);
            fs.writeFileSync(reqPath, JSON.stringify({ task, ...req }));
            if (fs.existsSync(resPath)) fs.unlinkSync(resPath);
            const py = spawn('python3', ['-B', path.join(REF, 'run_claims_phase3.py'), reqPath, resPath], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, HL_CACHE: CACHE } });
            const err = [];
            let buf = '';
            py.stderr.on('data', d => { buf += d.toString('utf8'); let k; while ((k = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, k); buf = buf.slice(k + 1); err.push(l); log(`   [python ${tag}] ${l}`); } });
            py.stdout.on('data', d => err.push(d.toString('utf8')));
            py.on('error', reject);
            py.on('close', code => {
                if (code !== 0) return reject(new Error(`run_claims_phase3.py ${task} exited ${code}:\n${err.slice(-20).join('\n')}${buf}`));
                try { resolve(JSON.parse(fs.readFileSync(resPath, 'utf8'))); } catch (e) { reject(e); }
            });
        });
    }

    // ============================================================== 2. the inputs
    log('2. inputs ...');
    let t = performance.now();
    const wn = W.load(), vocab = LC.loadV0();
    const wmeta = JSON.parse(fs.readFileSync(path.join(REF, 'golden', 'wordnet_v1.meta.json'), 'utf8'));
    const shards = [];
    const add = (spec, i, text, data, extra = null) => shards.push({ set: spec.set, index: i, name: shardName(spec.set, i), text, data, corpusId: spec.corpusId, spdx: spec.spdx,
        sourceSha: spec.set === 'synth' ? LC.sourceUrlSha(LC.synthSource(i, spec.sourceBase)) : LC.sourceUrlSha(LC.CHAIN_PINS.wordnetUrl), synth: extra, sha256: nodeSha(data), bytes: data.length });
    const SYNTH_SEEDS = Array.from({ length: N_SYNTH }, (_, i) => SYNTH_BASE + i);
    for (const spec of SETS) {
        if (spec.set === 'synth') {
            spec.seeds = SYNTH_SEEDS;
            SYNTH_SEEDS.forEach((seed, i) => {
                const s = LC.synthShard(seed);
                if (!(s.data.length >= 20000 && s.data.length <= 60000 && 4 * s.twoByte >= s.codePoints && s.chunks80.length > 0))
                    refuse(`synthetic shard ${i} (Rng(${seed})): ${s.data.length} B, ${s.twoByte}/${s.codePoints} two-byte code points, ${s.chunks80.length} 0x80 chunks: not Amendment 7 item 2's shard`);
                add(spec, i, s.text, s.data, { seed, draws: s.draws, target: s.target, codePoints: s.codePoints, twoByte: s.twoByte, chunks80: s.chunks80.length });
            });
        } else {
            const texts = LC.glossShards(wn, spec.set === 'c0' ? 'noun' : spec.set);
            if (spec.set === 'c0') {
                const hs = texts.map(x => nodeSha(Buffer.from(x, 'utf8')));
                if (texts.length !== wmeta.c0.shards || hs.some((h, i) => h !== wmeta.c0.shardSha256[i])) refuse('the C0 cut is not the 148 shards pinned in golden/wordnet_v1.meta.json');
            }
            texts.slice(0, SMOKE ? 3 : texts.length).forEach((x, i) => add(spec, i, x, LC.utf8(x)));
        }
    }
    if (DRY) {
        const s4 = [...LC.glossShards(wn, 'verb'), ...LC.glossShards(wn, 'adj')];
        if (nodeSha(s4.map(x => nodeSha(Buffer.from(x, 'utf8'))).join('\n')) !== '498371616959d8e85a6a5588f97ac297668431693e5251f8eb6b7822ca3578be') refuse('the verb and adjective shards are not spike S4\'s');
    }
    const corpus = shards.filter(s => s.set === CORPUS_SET);
    timings.inputs = secs(t);
    log(`   ${SETS.map(sp => `${sp.set} ${shards.filter(s => s.set === sp.set).length}`).join(', ')} shards (${sum(shards.map(s => s.bytes))} B); corpus ${CORPUS_SET} (${corpus.length}); synthetic draws ${shards.filter(s => s.synth).map(s => s.synth.draws).join(',')}`);
    reading('runner-1', 'The packages of L10 and L11 and the corpus manifest of L9(a) use the records grown with engrams on: L10 packages "the biochain record (Owl\'s fields)", L8 lists Owl\'s fields as fifteen with the engram trio among them, and growBiochain\'s opts.engrams defaults to true. L11 on engrams-off packages is reported and decides nothing.');
    if (DRY) reading('runner-2', 'Dry-run corpora: the verb shards are corpus "wordnet30-verb" and the adjective shards "wordnet30-adj" (spdx LicenseRef-WordNet-3.0 and sourceUrlSha of the archive URL, as C0); the Rng(4000 + i) synthetic shards keep "lexicon-synth-v1" with sourceUrlSha of "rng:4000+i". The verb shards stand in for C0 in L9(a), L9(b), L10 and L11.');

    // ============================================================== 3. L8 in JS: growSync and the controls
    log('3. L8: growSync, engrams off and on, and the controls\' growers ...');
    t = performance.now();
    const fieldDigests = rec => { const keys = Object.keys(rec); return { keys, fields: Object.fromEntries(keys.map(k => [k, nodeSha(JSON.stringify(rec[k]))])) }; };
    const recordSha = rec => nodeSha(JSON.stringify(rec));
    function digestDiff(a, b) {
        const keys = [...new Set([...LC.OWL_FIELDS, ...a.keys, ...b.keys])], bad = keys.filter(k => a.fields[k] !== b.fields[k]);
        if (a.keys.join() !== b.keys.join()) bad.push('(key order)');
        return bad;
    }
    for (const s of shards) {
        s.js = {}; s.ms = { growSync: {} }; s.T = {};
        for (const mode of ['off', 'on']) {
            const T = {}, t1 = hr();
            s.js[mode] = LC.growSync(s.text, { engrams: mode === 'on' }, T);
            s.ms.growSync[mode] = msSince(t1); s.T[mode] = T;
            s.js[mode + 'Digest'] = fieldDigests(s.js[mode]);
        }
        const fr = LC.framesStrict(s.js.off.stream);
        s.chunks = fr.length; s.chunks80 = fr.filter(f => LC.crystalHas80(f.packet)).length;
        s.binary = LC.growSync(s.text, { engrams: false, leaves: 'binary' });
        s.binaryDigest = fieldDigests(s.binary);
        if (s.set === 'synth') s.kernelDigest = fieldDigests(LC.growSync(s.text, { engrams: false, packets: 'kernel' }));
        // control 3: the first ASCII byte of the text, bit 0 flipped (it stays ASCII, so the text stays UTF-8), regrown
        const pos = s.data.findIndex(b => b < 0x80), alt = Uint8Array.from(s.data);
        alt[pos] ^= 1;
        const ra = LC.growSync(alt, { engrams: false }), k = Math.floor(pos / BC.CHUNK);
        s.control3 = { byte: pos, chunk: k, leafChanged: ra.leafHashes[k] !== s.js.off.leafHashes[k], rootChanged: ra.merkleRoot !== s.js.off.merkleRoot };
    }
    timings.l8_js_grow = secs(t);
    reading('runner-3', 'L8 control 3: in every shard, bit 0 of the first ASCII byte is flipped (it stays ASCII, so the text stays valid UTF-8) and the text regrown with engrams off; the leaf of the chunk holding that byte and merkleRoot must both change.');
    reading('runner-4', 'L8 control 2: the grower with leaves over binary bytes (lexicon_core.js leaves: "binary", the reference\'s READING 10) runs with engrams off on every shard; its record is compared with Owl\'s engrams-off record and given to Owl\'s verifyIntegrity; the Python port\'s binary record must equal it (reported). Control 1 is the Python grower with BioChain-AI\'s normalisation (packets "kernel"), engrams off, against Owl\'s engrams-off record on the synthetic shards; the JS twin is reported.');
    log(`   ${shards.length} shards x 2 grown (${timings.l8_js_grow} s); median growSync ${r1(median(shards.map(s => s.ms.growSync.off)))} ms off, ${r1(median(shards.map(s => s.ms.growSync.on)))} ms on`);

    // ============================================================== 4. the pool (Owl, BioChain-AI), Python, and JS's (d) and L9
    log(`4. Owl's and BioChain-AI's growers, verifyIntegrity and importBiochain in ${N_WORKERS} worker threads; the Python port; L8(d) and L9 in JS ...`);
    t = performance.now();
    const pool = new Pool(N_WORKERS).start();
    const poolJobs = [];
    for (const mode of ['on', 'off']) for (const s of shards) {
        s.ext = s.ext || { off: {}, on: {} };
        const e = s.ext[mode], engrams = mode === 'on', rec = s.js[mode];
        for (const g of ['owl', 'bio']) poolJobs.push(pool.run({ kind: 'grow', grower: g, text: s.text, engrams }).then(m => { e[g] = m; }));
        for (const v of ['owl', 'bio']) poolJobs.push(pool.run({ kind: 'verify', verifier: v, record: rec }).then(m => { e['verify_' + v] = m; }));
        poolJobs.push(pool.run({ kind: 'import', record: rec, data: s.data }).then(m => { e.import = m; }));
        if (mode === 'off') poolJobs.push(pool.run({ kind: 'verify', verifier: 'owl', record: s.binary }).then(m => { s.binaryOwlVerify = m; }));
    }
    const poolDone = Promise.all(poolJobs).then(() => secs(t));
    const pyRecordsPath = path.join(CACHE_DIR, 'python-records.tsv');
    const pyReq = { dry: DRY, sets: SETS.map(sp => ({ ...sp, ...(SMOKE && sp.set !== 'synth' ? { limit: 3 } : {}) })), packageMode: PACKAGE_MODE, manifestSet: CORPUS_SET, recordsPath: pyRecordsPath,
        rfc: { Ks: KS, listSeedBase: LIST_BASE, drawSeedBase: DRAW_BASE, samples: SAMPLES, everyMax: EVERY_MAX } };
    const pyDone = runPython('l8l9', pyReq, 'l8l9');
    pyDone.catch(() => {});

    // ---- (d) in JS: LVOCAB/1, LADDR/1, the id streams, the exact weaves, LPREP/1
    let t1 = hr();
    const LV = LC.lvocab({ vocab });
    const tl = hr(), LA = LC.laddrOf(vocab, wn), laddrMs = msSince(tl);
    log(`   JS: LVOCAB/1 ${LV.sha256.slice(0, 16)}..., LADDR/1 ${LA.sha256.slice(0, 16)}... (addrTableRoot ${LA.root.slice(0, 16)}..., ${LA.rows} rows, ${r1(laddrMs / 1000)} s)`);
    await tick();
    for (const s of shards) {
        let t2 = hr();
        const ids = LC.encode(s.data, vocab).ids;
        s.idStream = { sha256: LC.sha256Hex(LC.idStream([ids])), ids: ids.length, ms: msSince(t2) };
        t2 = hr();
        const w = LC.weaveReport(s.js.off.leafHashes, s.js.off.segCuts);
        s.weave = { K: w.K, text: w.text, sha256: w.sha256, normOk: w.normOk, unfoldOk: w.unfoldOk, segmentsOk: w.segmentsOk, bits: w.bits,
            segments: w.segments.map(q => LC.sha256Hex(LC.utf8(LC.weaveText(q)))), ms: msSince(t2) };
        s.lprep = {};
        for (const mode of ['off', 'on']) s.lprep[mode] = LC.lprep({ record: s.js[mode], text: s.data, corpusId: s.corpusId, shardIndex: s.index, spdx: s.spdx, sourceSha: s.sourceSha,
            lvocabHash: LV.sha256, laddrHash: LA.sha256, vocab, idSha: s.idStream.sha256, weaveSha: w.sha256 }).text;
        await tick();
    }
    timings.l8d_js = r1(msSince(t1) / 1000);

    // ---- L9 in JS (Amendment 7 item 5): the draws and every check, the twin of run_claims_phase3.py
    function l9Alterations(K) {
        const alts = [];
        for (let i = 0; i < K; i++) {
            alts.push(['replace', i], ['delete', i], ['insert', i]);
            if (i + 1 < K) alts.push(['swap', i]);
            if (i >= 1) alts.push(['truncate', i]);
        }
        alts.push(['duplicate-last', K - 1]);
        return alts;
    }
    function l9Draws(K, seed) {
        const alts = l9Alterations(K);
        if (K <= EVERY_MAX) return { alters: alts, cons: Array.from({ length: Math.max(0, K - 1) }, (_, i) => i + 1), how: 'every' };
        const r = new HP.Rng(seed), alters = [], cons = [];
        for (let i = 0; i < SAMPLES; i++) alters.push(alts[r.below(alts.length)]);
        for (let i = 0; i < SAMPLES; i++) cons.push(1 + r.below(K - 1));
        return { alters, cons, how: 'sampled' };
    }
    const proofDigest = p => `${p.length}:${nodeSha(Buffer.concat(p.map(h => Buffer.from(h))))}`;
    function tampered(D, kind, i, nw) {
        const e = D.slice();
        if (kind === 'replace') e[i] = nw;
        else if (kind === 'delete') e.splice(i, 1);
        else if (kind === 'insert') e.splice(i, 0, nw);
        else if (kind === 'swap') [e[i], e[i + 1]] = [e[i + 1], e[i]];
        else if (kind === 'duplicate-last') e.push(e[e.length - 1]);
        else if (kind === 'truncate') e.length = i;
        else throw new Error('unknown alteration ' + kind);
        return e;
    }
    async function l9List(D, seed) {
        const K = D.length, ms = {};
        let t2 = hr();
        const tree = new LC.RfcTree(D), rt = tree.root();
        ms.root = msSince(t2); t2 = hr();
        const inclusion = [];
        for (let i = 0; i < K; i++) {
            const p = tree.path(i), ok = LC.rfcVerifyInclusion(i, K, LC.rfcLeafHash(D[i]), p, rt);
            if (K >= 2) {
                const o = (i + 1) % K;
                inclusion.push([proofDigest(p), ok, !LC.rfcVerifyInclusion(i, K, LC.rfcLeafHash(D[o]), p, rt), !LC.rfcVerifyInclusion(o, K, LC.rfcLeafHash(D[i]), p, rt)]);
            } else inclusion.push([proofDigest(p), ok, null, null]);
        }
        ms.inclusion = msSince(t2); t2 = hr();
        const dr = l9Draws(K, seed), consistency = [];
        for (const m of dr.cons) {
            const p = tree.consistency(m), rm = tree.mth(0, m), bad = Uint8Array.from(rm);
            bad[0] ^= 1;
            consistency.push([m, proofDigest(p), LC.rfcVerifyConsistency(m, K, rm, rt, p), !LC.rfcVerifyConsistency(m, K, bad, rt, p)]);
        }
        ms.consistency = msSince(t2); t2 = hr();
        const alterations = [];
        let n = 0;
        for (const [kind, i] of dr.alters) {
            let nw = null;
            if (kind === 'replace') { nw = Uint8Array.from(D[i]); nw[0] ^= 1; } else if (kind === 'insert') nw = new Uint8Array(32);
            alterations.push([kind, i, !LC.bytesEq(LC.rfcRoot(tampered(D, kind, i, nw)), rt)]);
            if (++n % 200 === 0) await tick();
        }
        ms.alterations = msSince(t2);
        return { K, root: LC.hex(rt), draws: dr.how, inclusion, consistency, alterations, ms };
    }
    function l9Controls(D) {
        const K = D.length, hx = D.map(d => LC.hex(d)), a = LC.merkleShdccp2(hx), b = LC.merkleShdccp2([...hx, hx[K - 1]]);
        const vals = D.map(d => BigInt('0x' + LC.hex(d.subarray(0, 8)))), x0 = LC.xorSummary(hx), q0 = EC.chainQuaternion(vals), swaps = [];
        for (const i of (K <= EVERY_MAX ? Array.from({ length: Math.max(0, K - 1) }, (_, x) => x) : K >= 2 ? [0, K - 2] : [])) {
            const sw = vals.slice(), sh = hx.slice();
            [sw[i], sw[i + 1]] = [sw[i + 1], sw[i]]; [sh[i], sh[i + 1]] = [sh[i + 1], sh[i]];
            swaps.push([i, LC.xorSummary(sh) === x0, !EC.qeq(EC.chainQuaternion(sw), q0)]);
        }
        return { shdccp2: [a, b, a === b], xor: x0, swaps };
    }
    t1 = hr();
    const jsL9 = { lists: [] };
    for (let j = 0; j < KS.length; j++) {
        const D = LC.rfcLeaves(LIST_BASE + j, KS[j]);
        const x = await l9List(D, DRAW_BASE + j);
        await tick();
        jsL9.lists.push({ ...x, j, seed: LIST_BASE + j, drawSeed: DRAW_BASE + j, controls: l9Controls(D) });
        await tick();
    }
    const corpusLpreps = corpus.map(s => s.lprep[PACKAGE_MODE]);
    jsL9.corpus = { ...(await l9List(LC.corpusTree(corpusLpreps).D, null)), set: CORPUS_SET, mode: PACKAGE_MODE };
    timings.l9_js = r1(msSince(t1) / 1000);
    fs.writeFileSync(path.join(CACHE_DIR, 'l9-js.json'), JSON.stringify(jsL9));
    fs.writeFileSync(path.join(CACHE_DIR, 'growsync-records.tsv'), shards.flatMap(s => ['off', 'on'].map(m => JSON.stringify({ name: s.name, mode: m }) + '\t' + JSON.stringify(s.js[m]))).join('\n') + '\n');
    log(`   JS: (d) for ${shards.length} shards (${timings.l8d_js} s); L9 lists ${KS.join(', ')} and the corpus manifest (K = ${corpus.length}) (${timings.l9_js} s)`);
    reading('runner-5', 'L9(a) draws for K > 200 (the Python half\'s l9_draws): with replacement from Rng(2000 + j), first the 2,000 alterations, each uniform over the alterations the K <= 200 rule enumerates (the trace\'s order: for each i replace, delete, insert before i, swap i and i + 1, truncate to i entries; then duplicate-last), then the 2,000 consistency sizes m = 1 + below(K - 1) (K = 1000 has only 999 sizes m < N). A replacement entry is entry i with its first byte XOR 1, an insertion 32 zero bytes (the trace\'s). For K <= 200 every m in 1..N - 1 (RFC 9162 has no proof from m = 0).');
    reading('runner-6', 'L9 control 2 checks every adjacent swap of the synthetic lists for K <= 200 and the first and last (i = 0 and K - 2) for K = 1000 and 1001 (a weave of 1,001 prefixes takes 0.15 s in JS and 0.3 s in Python; the control needs one swap that the XOR misses and the weave detects).');

    // ---- wait for the pool and Python
    let PY;
    try { PY = await pyDone; } catch (e) { await pool.close(); refuse(`the Python half failed: ${e.message}`); }
    timings.python_l8l9 = PY.seconds;
    log(`   Python l8l9 done (${PY.seconds} s); waiting for the worker threads ...`);
    timings.pool_l8 = await poolDone;
    log(`   worker threads done (${timings.pool_l8} s, ${pool.jobs} jobs)`);

    // ============================================================== L8: compare and decide
    log('5. L8: field for field, verifyIntegrity, importBiochain, (d), controls ...');
    const pyShard = new Map(PY.shards.map(x => [x.name, x]));
    const inputMismatch = shards.filter(s => !pyShard.has(s.name) || pyShard.get(s.name).sha256 !== s.sha256 || pyShard.get(s.name).bytes !== s.bytes);
    if (inputMismatch.length || PY.shards.length !== shards.length) { await pool.close(); refuse(`Python's shard texts are not the runner's: ${inputMismatch.slice(0, 5).map(s => s.name).join(', ')} (${PY.shards.length} vs ${shards.length})`); }
    for (const s of shards) if (s.synth) { const p = pyShard.get(s.name).synth; if (p.draws !== s.synth.draws || p.twoByte !== s.synth.twoByte || p.codePoints !== s.synth.codePoints) { await pool.close(); refuse(`${s.name}: Python's draw count or code points differ`); } }
    let pyRecordLines = null;
    const pyRecord = (name, mode) => {
        if (!pyRecordLines) { pyRecordLines = new Map(); for (const l of fs.readFileSync(pyRecordsPath, 'utf8').split('\n')) { if (!l) continue; const k = l.indexOf('\t'), h = JSON.parse(l.slice(0, k)); pyRecordLines.set(`${h.name}|${h.mode}`, l.slice(k + 1)); } }
        return JSON.parse(pyRecordLines.get(`${name}|${mode}`));
    };
    // the distinct records of a shard and mode (growSync, Python, Owl, BioChain-AI): verify each once
    const extraJobs = [];
    for (const s of shards) for (const mode of ['off', 'on']) {
        const e = s.ext[mode], py = pyShard.get(s.name).records[mode];
        e.digest = { js: s.js[mode + 'Digest'], py: { keys: py.keys, fields: py.fields } };
        e.records = { js: s.js[mode] };
        for (const g of ['owl', 'bio']) {
            if (e[g].error) { e.digest[g] = null; continue; }
            e.digest[g] = fieldDigests(e[g].record); e.records[g] = e[g].record; e.ms = e.ms || {}; e.ms[g] = e[g].ms; delete e[g].record;
        }
        const base = recordSha(s.js[mode]);
        e.distinct = { js: { sha: base, verify_owl: e.verify_owl, verify_bio: e.verify_bio, import: e.import } };
        const ids = { js: base };
        for (const g of ['py', 'owl', 'bio']) {
            if (!e.digest[g]) continue;
            const same = digestDiff(e.digest.js, e.digest[g]).length === 0;
            ids[g] = same ? base : g === 'py' ? recordSha(pyRecord(s.name, mode)) : recordSha(e.records[g]);
            if (same) continue;
            const prior = Object.entries(ids).find(([k, v]) => k !== g && v === ids[g] && e.distinct[k]);
            if (prior) { e.distinct[g] = e.distinct[prior[0]]; continue; }
            const rec = g === 'py' ? pyRecord(s.name, mode) : e.records[g], d = e.distinct[g] = { sha: ids[g] };
            extraJobs.push(pool.run({ kind: 'verify', verifier: 'owl', record: rec }).then(m => { d.verify_owl = m; }));
            extraJobs.push(pool.run({ kind: 'verify', verifier: 'bio', record: rec }).then(m => { d.verify_bio = m; }));
            extraJobs.push(pool.run({ kind: 'import', record: rec, data: s.data }).then(m => { d.import = m; }));
        }
        e.records = null;
    }
    if (extraJobs.length) { log(`   ${extraJobs.length / 3} records differ from growSync's: verifying them too ...`); await Promise.all(extraJobs); }
    reading('runner-7', 'L8(b) and (c) "every record": per shard and mode, the distinct records among growSync\'s, the Python port\'s, Owl\'s and BioChain-AI\'s (equal records are verified once). A rejection of growSync\'s, Owl\'s or BioChain-AI\'s record counts against the JS grower, of the Python port\'s, Owl\'s or BioChain-AI\'s against the Python port. BioChain-AI\'s record differing from Owl\'s counts against both (claim (a): "BioChain-AI\'s gives the same"). (d) is decided by the reference, so a (d) mismatch counts against the JS grower.');

    const L8 = { js: { failures: [], count: 0 }, py: { failures: [], count: 0 } };
    const fail = (side, what) => { L8[side].count++; if (L8[side].failures.length < KEEP) L8[side].failures.push(what); };
    const perShard = [];
    const verdictOk = v => !!v && v.ok === true, importOk = v => !!v && v.verified === true && v.textEqual === true;
    for (const s of shards) {
        const py = pyShard.get(s.name), row = { name: s.name, bytes: s.bytes, chunks: s.chunks, chunks80: s.chunks80, value: {}, diff: {}, verify: {}, import: {}, ms: { growSync: {}, owl: {}, biochain: {}, python: {} } };
        for (const mode of ['off', 'on']) {
            const e = s.ext[mode], D = e.digest;
            const err = g => (e[g] && e[g].error ? [`error: ${e[g].error}`] : null);
            const dJs = err('owl') || digestDiff(D.js, D.owl), dPy = err('owl') || digestDiff(D.py, D.owl), dBio = err('owl') || err('bio') || digestDiff(D.bio, D.owl);
            row.value[mode] = s.js[mode].value;
            row.diff[mode] = { growSync: dJs, python: dPy, biochain: dBio };
            row.ms.growSync[mode] = r1(s.ms.growSync[mode]); row.ms.owl[mode] = r1(e.ms && e.ms.owl); row.ms.biochain[mode] = r1(e.ms && e.ms.bio); row.ms.python[mode] = r1(py.records[mode].ms);
            if (dJs.length) fail('js', { shard: s.name, mode, part: '(a) growSync vs Owl', fields: dJs });
            if (dPy.length) fail('py', { shard: s.name, mode, part: '(a) Python vs Owl', fields: dPy });
            if (dBio.length) { fail('js', { shard: s.name, mode, part: '(a) BioChain-AI vs Owl', fields: dBio }); fail('py', { shard: s.name, mode, part: '(a) BioChain-AI vs Owl', fields: dBio }); }
            const dist = e.distinct, sides = { js: ['js', 'owl', 'bio'], py: ['py', 'owl', 'bio'] };
            row.verify[mode] = Object.fromEntries(Object.entries(dist).map(([g, d]) => [g, { owl: verdictOk(d.verify_owl), biochain: verdictOk(d.verify_bio) }]));
            row.import[mode] = Object.fromEntries(Object.entries(dist).map(([g, d]) => [g, { verified: !!(d.import && d.import.verified), textEqual: !!(d.import && d.import.textEqual) }]));
            for (const [side, gs] of Object.entries(sides)) for (const g of gs) {
                const d = dist[g] || (g === 'py' ? dist.js : null);
                if (!d) continue;
                if (!verdictOk(d.verify_owl)) fail(side, { shard: s.name, mode, part: '(b) Owl verifyIntegrity', record: g, reasons: d.verify_owl && (d.verify_owl.reasons || d.verify_owl.error) });
                if (!verdictOk(d.verify_bio)) fail(side, { shard: s.name, mode, part: '(b) BioChain-AI verifyIntegrity', record: g, reasons: d.verify_bio && (d.verify_bio.reasons || d.verify_bio.error) });
                if (!importOk(d.import)) fail(side, { shard: s.name, mode, part: '(c) importBiochain', record: g, import: d.import });
            }
        }
        // (d)
        const dd = [];
        if (py.idStream.sha256 !== s.idStream.sha256 || py.idStream.ids !== s.idStream.ids) dd.push('idStream');
        for (const mode of ['off', 'on']) if (py.lprep[mode] !== s.lprep[mode]) dd.push(`LPREP/1 engrams ${mode}`);
        row.d = { idStreamSha256: s.idStream.sha256, ids: s.idStream.ids, equal: !dd.length, differing: dd };
        for (const x of dd) fail('js', { shard: s.name, part: '(d) Python vs JS', field: x, js: x === 'idStream' ? s.idStream.sha256 : s.lprep[x.endsWith('on') ? 'on' : 'off'], python: x === 'idStream' ? py.idStream.sha256 : py.lprep[x.endsWith('on') ? 'on' : 'off'] });
        row.lprepSha256 = { off: nodeSha(s.lprep.off), on: nodeSha(s.lprep.on) };
        row.ms.idStream = { js: r1(s.idStream.ms), python: r1(py.idStream.ms) };
        perShard.push(row);
    }
    const dGlobal = { lvocab: { js: LV.text, python: PY.lvocab, equal: LV.text === PY.lvocab }, laddr: { js: LA.text, python: PY.laddr, equal: LA.text === PY.laddr },
        addrTableRoot: { js: LA.root, python: PY.addrTableRoot, equal: LA.root === PY.addrTableRoot }, addrRows: { js: LA.rows, python: PY.addrRows },
        laddr_ms: { js: r1(laddrMs), python: r1(PY.laddr_ms) } };
    for (const k of ['lvocab', 'laddr', 'addrTableRoot']) if (!dGlobal[k].equal) fail('js', { part: '(d) Python vs JS', field: k, js: dGlobal[k].js, python: dGlobal[k].python });
    // controls
    const synthShards = shards.filter(s => s.set === 'synth');
    const c1 = synthShards.map(s => { const py = pyShard.get(s.name), d = s.ext.off.digest.owl ? digestDiff(py.kernel, s.ext.off.digest.owl) : ['(no Owl record)'];
        return { shard: s.name, chunks80: s.chunks80, differs: d.length > 0, fields: d, jsKernelEqualsPython: digestDiff(s.kernelDigest, py.kernel).length === 0 }; });
    const c2 = shards.map(s => { const py = pyShard.get(s.name), d = s.ext.off.digest.owl ? digestDiff(s.binaryDigest, s.ext.off.digest.owl) : ['(no Owl record)'];
        return { shard: s.name, differs: d.length > 0, fields: d, owlRejects: !!s.binaryOwlVerify && s.binaryOwlVerify.ok === false, owlReason: s.binaryOwlVerify && (s.binaryOwlVerify.reasons || [s.binaryOwlVerify.error]).join('; '),
            pythonEqualsJs: digestDiff(s.binaryDigest, py.binary).length === 0 }; });
    const c3 = shards.map(s => ({ shard: s.name, ...s.control3 }));
    const L8controls = {
        1: { what: 'the Python grower with BioChain-AI\'s shdccp_kernel.pack normalisation (0x80 written as 0x81), engrams off, against Owl\'s engrams-off record; must differ on at least one synthetic shard',
            shows_its_weakness: c1.some(x => x.differs), differing: c1.filter(x => x.differs).length, shards: c1.length, cases: c1 },
        2: { what: 'a grower that hashes leaves over binary bytes (engrams off); must differ from Owl\'s record on every shard and be rejected by Owl\'s verifyIntegrity',
            shows_its_weakness: c2.every(x => x.differs && x.owlRejects), differing: c2.filter(x => x.differs).length, rejected: c2.filter(x => x.owlRejects).length, shards: c2.length,
            python_binary_equals_js: c2.filter(x => x.pythonEqualsJs).length, exceptions: c2.filter(x => !(x.differs && x.owlRejects)).slice(0, KEEP),
            first_reason: (c2[0] || {}).owlReason },
        3: { what: 'one byte of every shard altered (bit 0 of its first ASCII byte), regrown: its leaf and its root must change',
            shows_its_weakness: c3.every(x => x.leafChanged && x.rootChanged), changed: c3.filter(x => x.leafChanged && x.rootChanged).length, shards: c3.length, exceptions: c3.filter(x => !(x.leafChanged && x.rootChanged)).slice(0, KEEP) },
    };
    const L8controlsOk = [1, 2, 3].every(k => L8controls[k].shows_its_weakness);
    const share80 = sets => { const ss = shards.filter(s => sets.includes(s.set)); return { chunks: sum(ss.map(s => s.chunks)), with80: sum(ss.map(s => s.chunks80)), share: r3(100 * sum(ss.map(s => s.chunks80)) / sum(ss.map(s => s.chunks))) }; };
    const L8out = {
        decision: { js: exactDecision(L8.js.count, L8controlsOk), python: exactDecision(L8.py.count, L8controlsOk) },
        rule: 'all-or-nothing, separately for the JS grower (growSync) and the Python port: (a) the record equal to Owl\'s growBiochain field for field (and BioChain-AI\'s equal to Owl\'s), (b) Owl\'s and BioChain-AI\'s verifyIntegrity accept every record, (c) EngramCore.importBiochain accepts every record and recreates the text byte for byte, (d) the V0 id stream (SHA-256 and count), LVOCAB/1, LADDR/1 with addrTableRoot and every LPREP/1 string equal in Python and JS (the reference decides (d)); void if a control fails to show its weakness',
        failures: { js: L8.js.count, python: L8.py.count }, counterexamples: { js: L8.js.failures, python: L8.py.failures },
        records: { shards: shards.length, modes: 2, per_grower: shards.length * 2 },
        mismatching_records: {
            growSync: perShard.reduce((a, r) => a + ['off', 'on'].filter(m => r.diff[m].growSync.length).length, 0),
            python: perShard.reduce((a, r) => a + ['off', 'on'].filter(m => r.diff[m].python.length).length, 0),
            biochain: perShard.reduce((a, r) => a + ['off', 'on'].filter(m => r.diff[m].biochain.length).length, 0),
        },
        d: { global: dGlobal, shards_with_a_difference: perShard.filter(r => !r.d.equal).length },
        controls: L8controls,
        reported: {
            share_of_chunks_with_0x80: Object.fromEntries([...new Set(shards.map(s => s.set))].map(x => [x, share80([x])])),
            synthetic_draws: synthShards.map(s => ({ shard: s.name, seed: s.synth.seed, draws: s.synth.draws, bytes: s.bytes, two_byte_share: r3(100 * s.synth.twoByte / s.synth.codePoints), chunks80: s.chunks80 })),
            value_median: { off: r3(median(shards.map(s => s.js.off.value))), on: r3(median(shards.map(s => s.js.on.value))) },
            ms_median: { growSync: { off: r1(median(shards.map(s => s.ms.growSync.off))), on: r1(median(shards.map(s => s.ms.growSync.on))) },
                growSync_by_stage_on: Object.fromEntries(['encode', 'crystal', 'hash', 'weave', 'engram'].map(k => [k, r1(median(shards.map(s => s.T.on[k] || 0)))])),
                owl: { off: r1(median(shards.map(s => s.ext.off.ms && s.ext.off.ms.owl).filter(x => x !== undefined))), on: r1(median(shards.map(s => s.ext.on.ms && s.ext.on.ms.owl).filter(x => x !== undefined))) },
                biochain: { off: r1(median(shards.map(s => s.ext.off.ms && s.ext.off.ms.bio).filter(x => x !== undefined))), on: r1(median(shards.map(s => s.ext.on.ms && s.ext.on.ms.bio).filter(x => x !== undefined))) },
                python: { off: r1(median(PY.shards.map(x => x.records.off.ms))), on: r1(median(PY.shards.map(x => x.records.on.ms))) },
                note: `Owl's and BioChain-AI's growers ran in ${N_WORKERS} worker threads beside the Python half (contended); growSync and Python alone` },
        },
        shards: perShard,
    };
    log(`   JS grower: ${L8out.decision.js} (${L8.js.count} failures); Python port: ${L8out.decision.python} (${L8.py.count}); mismatching records growSync ${L8out.mismatching_records.growSync}, Python ${L8out.mismatching_records.python}, BioChain-AI ${L8out.mismatching_records.biochain} of ${shards.length * 2}; controls 1/2/3 show their weakness: ${[1, 2, 3].map(k => L8controls[k].shows_its_weakness).join('/')}`);

    // ============================================================== L9: compare and decide
    log('6. L9: the manifests in JS and Python, the exact weaves, the controls ...');
    const L9f = { count: 0, failures: [] };
    const fail9 = what => { L9f.count++; if (L9f.failures.length < KEEP) L9f.failures.push(what); };
    function compareList(name, js, py) {
        const out = { name, K: js.K, root: js.root, roots_equal: js.root === py.root, draws: js.draws, inclusion: {}, consistency: {}, alterations: {} };
        if (js.root !== py.root) fail9({ list: name, part: 'JS/Python root', js: js.root, python: py.root });
        let own = 0, wl = 0, wp = 0, mis = 0;
        js.inclusion.forEach((x, i) => {
            const y = py.inclusion[i];
            if (!x[1]) { own++; fail9({ list: name, part: 'inclusion: rejected for its own leaf and position', i }); }
            if (x[2] === false) { wl++; fail9({ list: name, part: 'inclusion: accepted for leaf (i + 1) mod K', i }); }
            if (x[3] === false) { wp++; fail9({ list: name, part: 'inclusion: accepted at position (i + 1) mod K', i }); }
            if (!y || y[0] !== x[0] || y[1] !== x[1] || y[2] !== x[2] || y[3] !== x[3]) { mis++; fail9({ list: name, part: 'JS/Python inclusion proof or verdict', i, js: x, python: y }); }
        });
        out.inclusion = { proofs: js.inclusion.length, rejected_for_own: own, accepted_wrong_leaf: wl, accepted_wrong_position: wp, js_python_mismatches: mis + Math.abs(js.inclusion.length - py.inclusion.length),
            max_hashes: Math.max(0, ...js.inclusion.map(x => +x[0].split(':')[0])), mean_hashes: r3(js.inclusion.length ? sum(js.inclusion.map(x => +x[0].split(':')[0])) / js.inclusion.length : 0) };
        if (js.inclusion.length !== py.inclusion.length) fail9({ list: name, part: 'JS/Python inclusion count', js: js.inclusion.length, python: py.inclusion.length });
        let cf = 0, cm = 0, crej = 0;
        js.consistency.forEach((x, k) => {
            const y = py.consistency[k];
            if (!x[2]) { cf++; fail9({ list: name, part: 'consistency proof failed', m: x[0] }); }
            if (x[3]) crej++;
            if (!y || y[0] !== x[0] || y[1] !== x[1] || y[2] !== x[2] || y[3] !== x[3]) { cm++; fail9({ list: name, part: 'JS/Python consistency proof, draw or verdict', k, js: x, python: y }); }
        });
        if (js.consistency.length !== py.consistency.length) { cm++; fail9({ list: name, part: 'JS/Python consistency count', js: js.consistency.length, python: py.consistency.length }); }
        out.consistency = { proofs: js.consistency.length, failed: cf, js_python_mismatches: cm, rejected_with_a_wrong_old_root: crej,
            max_hashes: Math.max(0, ...js.consistency.map(x => +x[1].split(':')[0])), distinct_m: new Set(js.consistency.map(x => x[0])).size };
        let un = 0, am = 0;
        const byKind = {};
        js.alterations.forEach((x, k) => {
            const y = py.alterations[k];
            byKind[x[0]] = byKind[x[0]] || { cases: 0, detected: 0 };
            byKind[x[0]].cases++; if (x[2]) byKind[x[0]].detected++;
            if (!x[2]) { un++; fail9({ list: name, part: 'alteration not detected', kind: x[0], i: x[1] }); }
            if (!y || y[0] !== x[0] || y[1] !== x[1] || y[2] !== x[2]) { am++; fail9({ list: name, part: 'JS/Python alteration draw or verdict', k, js: x, python: y }); }
        });
        if (js.alterations.length !== py.alterations.length) { am++; fail9({ list: name, part: 'JS/Python alteration count', js: js.alterations.length, python: py.alterations.length }); }
        out.alterations = { cases: js.alterations.length, undetected: un, js_python_mismatches: am, by_kind: byKind };
        out.ms = { js: Object.fromEntries(Object.entries(js.ms).map(([k, v]) => [k, r1(v)])), python: Object.fromEntries(Object.entries(py.ms).map(([k, v]) => [k, r1(v)])) };
        return out;
    }
    const L9lists = jsL9.lists.map((js, j) => ({ seed: js.seed, drawSeed: js.drawSeed, ...compareList(`K=${js.K} (Rng(${js.seed}))`, js, PY.l9.lists[j]) }));
    const L9corpus = compareList(`${CORPUS_SET} manifest (engrams ${PACKAGE_MODE})`, jsL9.corpus, PY.l9.corpus);
    // controls 1 and 2, in both languages
    const ctl1 = jsL9.lists.filter(x => x.K >= 3 && x.K % 2 === 1).map(x => { const y = PY.l9.lists[x.j].controls; return { K: x.K, equal_roots: x.controls.shdccp2[2], python_equal_roots: y.shdccp2[2], roots_js_eq_python: x.controls.shdccp2[0] === y.shdccp2[0] }; });
    const ctl2 = jsL9.lists.map(x => { const y = PY.l9.lists[x.j].controls, hit = x.controls.swaps.filter(w => w[1] && w[2]), hitPy = y.swaps.filter(w => w[1] && w[2]);
        return { K: x.K, swaps: x.controls.swaps.length, missed_by_xor_detected_by_weave: hit.length, python: hitPy.length, xor_js_eq_python: x.controls.xor === y.xor,
            swaps_js_eq_python: JSON.stringify(x.controls.swaps) === JSON.stringify(y.swaps) }; });
    const L9controls = {
        1: { what: 'the shdccp/2 Merkle rule (pairwise SHA-256 over hex, odd node duplicated) gives equal roots for L and L with its last element duplicated, at every odd K >= 3 among the synthetic K (CVE-2012-2459)',
            shows_its_weakness: ctl1.length > 0 && ctl1.every(x => x.equal_roots && x.python_equal_roots), cases: ctl1 },
        2: { what: 'an XOR summary of the leaf prefixes misses at least one adjacent swap that the exact weave detects', shows_its_weakness: ctl2.some(x => x.missed_by_xor_detected_by_weave > 0 && x.python > 0), cases: ctl2 },
    };
    // (b): every corpus shard's exact weave
    const weaves = corpus.map(s => {
        const py = pyShard.get(s.name).weave, w = s.weave, ok = w.normOk && w.unfoldOk && w.segmentsOk, pyOk = py.normOk && py.unfoldOk && py.segmentsOk, eq = py.text === w.text;
        if (!ok) fail9({ shard: s.name, part: '(b) weave check (JS)', normOk: w.normOk, unfoldOk: w.unfoldOk, segmentsOk: w.segmentsOk });
        if (!pyOk) fail9({ shard: s.name, part: '(b) weave check (Python)', normOk: py.normOk, unfoldOk: py.unfoldOk, segmentsOk: py.segmentsOk });
        if (!eq) fail9({ shard: s.name, part: '(b) JS/Python weave components', js: w.sha256, python: py.sha256 });
        return { shard: s.name, K: w.K, weave3Sha: w.sha256, js: { norm: w.normOk, unfold: w.unfoldOk, segments: w.segmentsOk }, python: { norm: py.normOk, unfold: py.unfoldOk, segments: py.segmentsOk },
            components_equal: eq, segment_subweaves_equal: JSON.stringify(py.segments) === JSON.stringify(w.segments), bits: w.bits, ms: { js: r1(w.ms), python: r1(py.ms) } };
    });
    const L9out = {
        decision: exactDecision(L9f.count, L9controls[1].shows_its_weakness && L9controls[2].shows_its_weakness),
        rule: 'exact and all-or-nothing: supported with 0 failures (undetected alterations, inclusion proofs accepted for a wrong leaf or position or rejected for the right one, failed consistency proofs, JS/Python mismatches of roots, proofs, draws or verdicts, weave failures and JS/Python weave mismatches), refuted by 1, void if a control fails to show its weakness',
        failures: L9f.count, counterexamples: L9f.failures,
        a: { corpus: L9corpus, lists: L9lists },
        b: { shards: weaves.length, failing: weaves.filter(x => !(x.js.norm && x.js.unfold && x.js.segments && x.python.norm && x.python.unfold && x.python.segments && x.components_equal)).length,
            segment_subweaves_equal: weaves.filter(x => x.segment_subweaves_equal).length,
            bits_per_component: { min: Math.min(...weaves.flatMap(x => x.bits)), max: Math.max(...weaves.flatMap(x => x.bits)), at_K: Object.fromEntries([...new Set(weaves.map(x => x.K))].sort((a, b) => a - b).map(K => [K, weaves.find(x => x.K === K).bits])) },
            ms_median: { js: r1(median(weaves.map(x => x.ms.js))), python: r1(median(weaves.map(x => x.ms.python))) }, per_shard: weaves },
        controls: L9controls,
    };
    log(`   L9 ${L9out.decision}: ${L9f.count} failures; corpus root ${L9corpus.root.slice(0, 16)}... ${L9corpus.roots_equal ? '=' : '≠'} Python; weaves ${weaves.length - L9out.b.failing}/${weaves.length}; controls 1/2: ${L9controls[1].shows_its_weakness}/${L9controls[2].shows_its_weakness}`);

    // ============================================================== L10: keys, registry, packages, tampers, verdicts
    log('7. L10: keys, the registry, the packages and the tampers ...');
    t = performance.now();
    const SRC = {};
    for (const f of [F_CC, F_IR]) SRC[f] = fs.readFileSync(path.join(BIO_DIR, f), 'utf8');
    const CC_NAMES = ['subtle', 'enc', 'bufToHex', 'hexToBuf', 'sha256Hex', 'KEY_LATTICES', 'expandHolographic', 'shdccpCompress', 'canonicalParams', 'deriveKeyVector', 'keyIdFromPublic', 'attestationPayload'];
    const IR_NAMES = ['LATTICE_SPACES', 'sha256Bytes', 'expandToHolographicInverse', 'shdccpCompress', 'xorBlendHex', 'computeGeoVector', 'computeIdentityId'];
    const bodyOf = (f, names) => names.map(n => grab(SRC[f], n)).join('\n');
    const BCC = new Function(bodyOf(F_CC, CC_NAMES) + `\nreturn { ${CC_NAMES.join(', ')} };`)();
    const BIR = new Function(bodyOf(F_IR, IR_NAMES) + '\nreturn { computeIdentityId };')();
    const EPOCH = LC.epochTokenOf(new Date().toISOString().slice(0, 10));
    const { identityId } = await BIR.computeIdentityId(LC.IDENTITY_SEED, LC.IDENTITY_UID);
    const keyVector = (await BCC.deriveKeyVector(identityId, {}, EPOCH)).vector64;
    const kA = await LC.newKeyPair(), kB = await LC.newKeyPair();
    for (const k of [kA, kB]) { const bid = await BCC.keyIdFromPublic(k.publicJwk); if (bid !== k.keyId) refuse(`keyId ${k.keyId} is not BioChain-AI's keyIdFromPublic (${bid})`); }
    const REG = LC.registrySnapshot([{ publicJwk: kA.publicJwk, keyVector, status: 'active' }, { publicJwk: kB.publicJwk, keyVector, status: 'revoked' }]);
    const regPath = path.join(RESULTS, 'phase3-registry.json');
    fs.writeFileSync(regPath, REG.text);
    if (nodeSha(fs.readFileSync(regPath)) !== REG.sha256) refuse('the registry snapshot written is not the one pinned');
    const identity = { seed: LC.IDENTITY_SEED, uid: LC.IDENTITY_UID, identityId, keyVector, epochToken: EPOCH,
        core_identityId: LC.identityIdOf(), core_keyVector: LC.keyVectorOf(identityId, EPOCH), equal_to_core: LC.identityIdOf() === identityId && LC.keyVectorOf(identityId, EPOCH) === keyVector };
    log(`   identity ${identityId}, keyVector ${keyVector} (BioChain-AI's code; the core's port ${identity.equal_to_core ? 'equal' : 'DIFFERENT'}), epoch ${EPOCH}; keys ${kA.keyId} (active), ${kB.keyId} (revoked); registry ${REG.sha256.slice(0, 16)}...`);
    const session = await LC.chainSession({ vocab, wn, registry: REG.text, registrySha256: REG.sha256, clock: clockMs });
    if (session.laddrHash !== LA.sha256 || session.lvocabHash !== LV.sha256) refuse('the verification session\'s LVOCAB/LADDR are not the ones the records commit to');
    // the corpus (Tier S) and its Tier-P twin (for T6)
    const N = corpus.length;
    const tree = LC.corpusTree(corpusLpreps), LCO = LC.lcorpus({ corpusId: corpus[0].corpusId, tree, spdxSha: LC.spdxSetSha(corpus.map(s => s.spdx)) });
    if (LCO.root !== L9corpus.root) refuse('the L10 corpus root is not L9\'s');
    const consProof = N > 1 ? tree.consistency(N - 1) : [];
    const LG = LC.lgrow({ corpusId: corpus[0].corpusId, nOld: N - 1, rootOld: LC.hex(tree.mth(0, N - 1)), nNew: N, rootNew: LCO.root, proof: consProof });
    const packages = [];
    for (let j = 0; j < N; j++) {
        const s = corpus[j];
        packages.push(LC.makePackage({ record: s.js[PACKAGE_MODE], lprep: corpusLpreps[j], attestation: await LC.attestSign(kA.privateKey, { keyId: kA.keyId, keyVector, epochToken: EPOCH }, corpusLpreps[j]),
            lcorpus: LCO.text, inclusion: tree.path(j), lgrow: LG.text, consistency: consProof }));
    }
    const lprepsP = corpus.map((s, j) => LC.lprep({ record: s.js[PACKAGE_MODE], text: s.data, corpusId: s.corpusId, shardIndex: s.index, spdx: s.spdx, sourceSha: s.sourceSha,
        lvocabHash: LV.sha256, laddrHash: LA.sha256, tier: 'P', salt: LC.testSalt(j), vocab, idSha: s.idStream.sha256, weaveSha: s.weave.sha256 }).text);
    const treeP = LC.corpusTree(lprepsP), LCP = LC.lcorpus({ corpusId: corpus[0].corpusId, tree: treeP, spdxSha: LC.spdxSetSha(corpus.map(s => s.spdx)) });
    const consP = N > 1 ? treeP.consistency(N - 1) : [];
    const LGP = LC.lgrow({ corpusId: corpus[0].corpusId, nOld: N - 1, rootOld: LC.hex(treeP.mth(0, N - 1)), nNew: N, rootNew: LCP.root, proof: consP });
    const tierP = new Map();
    const packageP = async j => {
        if (!tierP.has(j)) tierP.set(j, LC.makePackage({ record: corpus[j].js[PACKAGE_MODE], lprep: lprepsP[j], salt: LC.testSalt(j),
            attestation: await LC.attestSign(kA.privateKey, { keyId: kA.keyId, keyVector, epochToken: EPOCH }, lprepsP[j]), lcorpus: LCP.text, inclusion: treeP.path(j), lgrow: LGP.text, consistency: consP }));
        return tierP.get(j);
    };
    // the 50 clean shards: Rng(1000 + i).below(N) for i = 0, 1, ... until 50 distinct (dry: all N if N < 50)
    const nClean = Math.min(N_CLEAN, N), clean = [];
    let drawsClean = 0;
    for (let i = 0; clean.length < nClean; i++) { const v = new HP.Rng(CLEAN_BASE + i).below(N); drawsClean++; if (!clean.includes(v)) clean.push(v); }
    if (nClean < N_CLEAN) reading('runner-8', `Dry-run L10 clean set: ${N} verb shards cannot give ${N_CLEAN} distinct indices, so Rng(${CLEAN_BASE} + i).below(${N}) is drawn until all ${nClean} are; each tamper record draws its clean package with below(${nClean}).`);
    reading('runner-9', 'L10 tamper places, record j of class k from Rng(base + 50(k - 1) + j) after its clean package below(n): T2 frame below(K), then bit below(32) of its crystal32 (word bit 24 + bit), parity re-fixed; T7 frames below(K - 1) and the next; T9 frame below(K), drawn again from the same Rng until the frame has a single-bit residual flip that decodes the same (spike S4\'s search, in its order), then that flip below(count). T3 (lvocabHash) and T8 (chainId) change the last hex digit, S4\'s rule as in the trace. T4 is attested by the key the registry marks revoked. T5 takes the attestation of the next clean package in draw order ((c + 1) mod n). T6 is the Tier-P package of the same shard (a Tier-P twin of the corpus, each shard j salted with the test salt of j, its own LCORPUS/1 and LGROW/1, attested by the active key) checked with the salt of shard index + 1, the next shard\'s, as the trace reads "the salt of shard j + 1".');
    const flipsCache = new Map();
    function tamper(k, j) {
        const seed = TAMPER_BASE + 50 * (k - 1) + j, rng = new HP.Rng(seed), c = rng.below(nClean), sIdx = clean[c], base = packages[sIdx];
        const place = { seed, clean: c, shard: corpus[sIdx].name, shardIndex: sIdx };
        const p = clone(base), s = p.record.stream, fo = LC.frameOffsets(s), K = fo.length;
        if (k === 1) { delete p.record.leafHashes; delete p.record.merkleRoot; }
        else if (k === 2) {
            const f = rng.below(K), bit = rng.below(32), at = fo[f][0];
            p.record.stream = s.slice(0, at) + LC.refixParity(LC.word16(BigInt('0x' + s.slice(at, at + 16)) ^ (1n << BigInt(24 + bit)))) + s.slice(at + 16);
            Object.assign(place, { frame: f, bit });
        } else if (k === 3) { const f = p.lprep.split('|'); f[9] = lastDigit(f[9]); p.lprep = f.join('|'); place.field = 'lvocabHash'; }
        else if (k === 4) return { place, async: true, make: async () => ({ ...clone(base), attestation: await LC.attestSign(kB.privateKey, { keyId: kB.keyId, keyVector, epochToken: EPOCH }, base.lprep) }) };
        else if (k === 5) { p.attestation = clone(packages[clean[(c + 1) % nClean]].attestation); place.attestationOf = corpus[clean[(c + 1) % nClean]].name; }
        else if (k === 6) return { place: { ...place, salt: `test salt of ${sIdx + 1}` }, async: true, make: async () => { const q = clone(await packageP(sIdx)); q.salt = LC.testSalt(sIdx + 1); return q; } };
        else if (k === 7) { const f = rng.below(K - 1); p.record.stream = LC.swapFrames(s, f); place.frames = [f, f + 1]; }
        else if (k === 8) p.record.chainId = lastDigit(p.record.chainId);
        else if (k === 9) {
            const fr = LC.framesStrict(s);
            for (let tries = 0; ; tries++) {
                if (tries > 10000) throw new Error('no frame with a silent flip');
                const f = rng.below(K), key = `${sIdx}|${f}`;
                if (!flipsCache.has(key)) flipsCache.set(key, LC.silentFlips(fr[f].residual, Uint8Array.from(BC.decodeChunk(fr[f].residual, fr[f].chunkLen))));
                const flips = flipsCache.get(key);
                if (!flips.length) continue;
                const fl = flips[rng.below(flips.length)], [, r0, rl] = fo[f];
                if (fl.alt.length !== rl) throw new Error('a flip changed the residual length');
                p.record.stream = s.slice(0, r0) + fl.alt + s.slice(r0 + rl);
                Object.assign(place, { frame: f, digit: fl.i, bit: fl.bit, kind: fl.kind, frames_tried: tries + 1, flips_in_frame: flips.length });
                break;
            }
        }
        return { place, pkg: p };
    }
    const L10pk = [];
    clean.forEach((sIdx, c) => L10pk.push({ id: `clean ${c}`, cls: 'clean', place: { clean: c, shard: corpus[sIdx].name, shardIndex: sIdx }, pkg: packages[sIdx] }));
    for (let k = 1; k <= 9; k++) for (let j = 0; j < PER_CLASS; j++) {
        const x = tamper(k, j);
        L10pk.push({ id: `T${k}.${j}`, cls: `T${k}`, place: x.place, pkg: x.async ? await x.make() : x.pkg });
        if (j % 10 === 9) await tick();
    }
    const pkgPath = path.join(CACHE_DIR, 'l10-packages.jsonl');
    fs.writeFileSync(pkgPath, L10pk.map(x => JSON.stringify(x.pkg)).join('\n') + '\n');
    fs.writeFileSync(path.join(CACHE_DIR, 'l10-index.json'), JSON.stringify(L10pk.map(x => ({ id: x.id, cls: x.cls, place: x.place, sha256: nodeSha(JSON.stringify(x.pkg)) }))));
    // every valid signature made here (control 2): the clean ones, T4's (the revoked key) and the Tier-P ones T6 uses
    const sigs = [];
    const addSig = (pkg, jwk, what) => sigs.push({ what, publicJwk: jwk, sig: pkg.attestation.sig, payload: LC.attestPayload(pkg.attestation) });
    L10pk.filter(x => x.cls === 'clean').forEach(x => addSig(x.pkg, kA.publicJwk, x.id));
    L10pk.filter(x => x.cls === 'T4').forEach(x => addSig(x.pkg, kB.publicJwk, x.id));
    for (const [j, pkg] of tierP) addSig(pkg, kA.publicJwk, `Tier P ${corpus[j].name}`);
    timings.l10_build = secs(t);
    log(`   ${packages.length} corpus packages, ${tierP.size} Tier-P twins, clean set ${clean.length} (${drawsClean} draws), ${L10pk.length} packages for L10 (${timings.l10_build} s); verifying in JS and Python; Owl's verifyIntegrity on T1, T2, T8, T9 ...`);
    t = performance.now();
    const pyVerify = runPython('verify', { packagesPath: pkgPath, registry: REG.text, registrySha256: REG.sha256, epochToken: EPOCH, signatures: sigs }, 'verify');
    pyVerify.catch(() => {});
    const owlCtl = Promise.all(L10pk.filter(x => ['T1', 'T2', 'T8', 'T9'].includes(x.cls)).map(x => pool.run({ kind: 'verify', verifier: 'owl', record: x.pkg.record }).then(m => { x.owl = m; })));
    for (const x of L10pk) {
        const t2 = hr(), v = await LC.verifyPackage(session, x.pkg, { clock: clockMs });
        x.js = { selfConsistent: v.selfConsistent, authentic: v.authentic, failed: v.failed, pattern: v.checks.map(c => (c.ok ? 'P' : c.ok === null ? '-' : 'F')).join(''),
            signer: v.signer, detail: (v.checks.find(c => c.ok === false) || {}).detail || '', ms: msSince(t2) };
    }
    const tierPok = [];
    for (const [j, pkg] of tierP) tierPok.push((await LC.verifyPackage(session, pkg)).failed === '-');
    timings.l10_js_verify = secs(t);
    log(`   JS verified ${L10pk.length} (${timings.l10_js_verify} s); waiting for Python and the worker threads ...`);
    let PV;
    try { PV = await pyVerify; } catch (e) { await pool.close(); refuse(`the Python half failed: ${e.message}`); }
    await owlCtl;
    timings.l10_python_verify = PV.seconds;
    timings.l10_total = secs(t);
    if (PV.verdicts.length !== L10pk.length) refuse(`Python returned ${PV.verdicts.length} verdicts for ${L10pk.length} packages`);
    L10pk.forEach((x, i) => { const v = PV.verdicts[i]; x.py = { selfConsistent: v[0], authentic: v[1], failed: v[2], pattern: v[3], signer: v[4], detail: v[5], ms: v[6] }; });
    // verdicts
    const L10f = { count: 0, failures: [] };
    const fail10 = what => { L10f.count++; if (L10f.failures.length < KEEP) L10f.failures.push(what); };
    const owlAccepts = cls => L10pk.filter(x => x.cls === cls && x.owl && x.owl.ok === true).length;
    const ctl10 = Object.fromEntries(['T1', 'T2', 'T8', 'T9'].map(c => [c, { accepted_by_owl: owlAccepts(c), records: L10pk.filter(x => x.cls === c).length,
        errors: L10pk.filter(x => x.cls === c && x.owl && x.owl.error).length, first_rejection: (L10pk.find(x => x.cls === c && x.owl && x.owl.ok === false) || { owl: {} }).owl.reasons || null }]));
    const voidClasses = Object.entries(ctl10).filter(([, v]) => v.accepted_by_owl === 0).map(([c]) => c);
    const c2rows = PV.control2;
    const L10c2 = { what: 'Python verification without the P1363-to-DER conversion (the raw 64 bytes handed to cryptography as DER) must reject every valid signature made in this run',
        signatures: c2rows.length, valid_with_conversion: c2rows.filter(r => r[0]).length, accepted_raw: c2rows.filter(r => r[1]).length,
        exceptions: [...new Set(c2rows.map(r => r[2]))], shows_its_weakness: c2rows.length > 0 && c2rows.every(r => r[0] && !r[1]) };
    const byClass = {};
    for (const x of L10pk) {
        const expectAccept = x.cls === 'clean', b = byClass[x.cls] = byClass[x.cls] || { records: 0, js: { accepted: 0, selfConsistent: 0, authentic: 0, failed: {} }, python: { accepted: 0, selfConsistent: 0, authentic: 0, failed: {} }, agree: 0, void: voidClasses.includes(x.cls) };
        b.records++;
        for (const [side, v] of [['js', x.js], ['python', x.py]]) { if (v.failed === '-') b[side].accepted++; if (v.selfConsistent) b[side].selfConsistent++; if (v.authentic) b[side].authentic++; b[side].failed[v.failed] = (b[side].failed[v.failed] || 0) + 1; }
        const agree = x.js.selfConsistent === x.py.selfConsistent && x.js.authentic === x.py.authentic && x.js.failed === x.py.failed;
        if (agree) b.agree++;
        if (b.void) continue;
        for (const [side, v] of [['JS', x.js], ['Python', x.py]]) {
            if (expectAccept && v.failed !== '-') fail10({ id: x.id, part: `false reject (${side})`, place: x.place, verdict: v });
            if (!expectAccept && v.failed === '-') fail10({ id: x.id, part: `false accept (${side})`, place: x.place, verdict: v });
        }
        if (!agree) fail10({ id: x.id, part: 'JS and Python verdicts differ', place: x.place, js: x.js, python: x.py });
    }
    fs.writeFileSync(path.join(CACHE_DIR, 'l10-verdicts.json'), JSON.stringify(L10pk.map(x => ({ id: x.id, cls: x.cls, place: x.place, js: x.js, python: x.py, owl: x.owl || null }))));
    const cnt = (side, pred) => L10pk.filter(x => !voidClasses.includes(x.cls) && pred(x, x[side])).length;
    const L10out = {
        decision: L10c2.shows_its_weakness ? exactDecision(L10f.count) : 'void',
        rule: 'supported if there are 0 false accepts and 0 false rejects in both languages and the verdicts (selfConsistent, authentic and the failing check) are identical; refuted by any one; void when control 2 fails; a class whose control 1 fails (Owl accepts none of its records) is void and left out',
        failures: L10f.count, counterexamples: L10f.failures,
        false_accepts: { js: cnt('js', (x, v) => x.cls !== 'clean' && v.failed === '-'), python: cnt('py', (x, v) => x.cls !== 'clean' && v.failed === '-') },
        false_rejects: { js: cnt('js', (x, v) => x.cls === 'clean' && v.failed !== '-'), python: cnt('py', (x, v) => x.cls === 'clean' && v.failed !== '-') },
        verdicts_differ: L10pk.filter(x => !(x.js.selfConsistent === x.py.selfConsistent && x.js.authentic === x.py.authentic && x.js.failed === x.py.failed)).length,
        void_classes: voidClasses, by_class: byClass,
        clean: { draws: drawsClean, indices: clean, shards: clean.map(i => corpus[i].name) },
        corpus: { set: CORPUS_SET, N, lcorpus: LCO.text, lgrow: LG.text, tier_p_lcorpus: LCP.text, tier_p_packages_accepted: `${tierPok.filter(Boolean).length}/${tierPok.length}` },
        identity, keys: [{ keyId: kA.keyId, status: 'active' }, { keyId: kB.keyId, status: 'revoked' }],
        registry: { file: SMOKE ? regPath : rel(regPath), sha256: REG.sha256, bytes: Buffer.byteLength(REG.text) },
        python_session: { lvocabHash: PV.lvocabHash, laddrHash: PV.laddrHash, equal_to_js: PV.lvocabHash === LV.sha256 && PV.laddrHash === LA.sha256, identityId: PV.identityId, keyVector: PV.keyVector,
            identity_equal: PV.identityId === identityId && PV.keyVector === keyVector, keyIds_equal: Object.entries(PV.keyIds).every(([a, b]) => a === b) },
        controls: { 1: { what: 'Owl\'s verifyIntegrity, run from the Owl checkout, must accept at least one T1, one T2, one T8 and one T9 record (else that class\'s gap claim is withdrawn and the class is void)',
            shows_its_weakness: Object.fromEntries(Object.entries(ctl10).map(([c, v]) => [c, v.accepted_by_owl > 0])), classes: ctl10 }, 2: L10c2 },
        places: L10pk.filter(x => x.cls !== 'clean').map(x => ({ id: x.id, ...x.place, js: x.js.failed, python: x.py.failed })),
        ms_median: { js: r1(median(L10pk.map(x => x.js.ms))), python: r1(median(L10pk.map(x => x.py.ms))) },
    };
    if (voidClasses.length) reading('runner-10', `L10 control 1 failed for ${voidClasses.join(', ')}: those classes are void and left out of the decision (their verdicts are reported).`);
    log(`   L10 ${L10out.decision}: false accepts JS ${L10out.false_accepts.js} / Python ${L10out.false_accepts.python}, false rejects ${L10out.false_rejects.js} / ${L10out.false_rejects.python}, verdicts differ ${L10out.verdicts_differ}; control 1 ${Object.entries(ctl10).map(([c, v]) => `${c} ${v.accepted_by_owl}/${v.records}`).join(', ')}; control 2 raw accepted ${L10c2.accepted_raw}/${L10c2.signatures}`);
    await pool.close();

    // ============================================================== L11: the timing (nothing else running)
    // In a fresh Node process (l11Child below): a holder's process holds the packages and its session, not this
    // runner's records, Owl's results and 500 package copies, whose heap would add collector pauses to every time.
    log('8. L11: hardened verification times in a fresh Node process (nothing else running) ...');
    t = performance.now();
    const big = corpus.map((s, j) => ({ s, j })).filter(x => x.s.bytes >= L11_MIN_BYTES);
    if (!DRY && big.length !== 147) refuse(`L11 has ${big.length} shards of >= 59,000 bytes, not 147`);
    const p11 = path.join(CACHE_DIR, 'l11-packages.jsonl'), p11off = path.join(CACHE_DIR, 'l11-packages-engrams-off.jsonl');
    fs.writeFileSync(p11, big.map(({ j }) => JSON.stringify(packages[j])).join('\n') + '\n');
    // the engrams-off packages (reported): the same shards' engrams-off records, their own corpus manifest, attested alike
    const lpOff = corpus.map(s => s.lprep.off), treeO = LC.corpusTree(lpOff), LCOo = LC.lcorpus({ corpusId: corpus[0].corpusId, tree: treeO, spdxSha: LC.spdxSetSha(corpus.map(s => s.spdx)) });
    const consO = N > 1 ? treeO.consistency(N - 1) : [], LGO = LC.lgrow({ corpusId: corpus[0].corpusId, nOld: N - 1, rootOld: LC.hex(treeO.mth(0, N - 1)), nNew: N, rootNew: LCOo.root, proof: consO });
    const offPk = [];
    for (const { s, j } of big) offPk.push(JSON.stringify(LC.makePackage({ record: s.js.off, lprep: lpOff[j], attestation: await LC.attestSign(kA.privateKey, { keyId: kA.keyId, keyVector, epochToken: EPOCH }, lpOff[j]),
        lcorpus: LCOo.text, inclusion: treeO.path(j), lgrow: LGO.text, consistency: consO })));
    fs.writeFileSync(p11off, offPk.join('\n') + '\n');
    const q11 = path.join(CACHE_DIR, 'l11-request.json'), a11 = path.join(CACHE_DIR, 'l11-node.json');
    fs.writeFileSync(q11, JSON.stringify({ packagesPath: p11, offPackagesPath: p11off, shards: big.map(({ s }) => ({ shard: s.name, bytes: s.bytes })), registry: REG.text, registrySha256: REG.sha256,
        laddrHash: LA.sha256, reps: REPS, literal: SMOKE ? 1 : big.length }));
    if (fs.existsSync(a11)) fs.unlinkSync(a11);
    const child = spawnSync(process.execPath, [__filename, '--l11-child', q11, a11], { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, HL_CACHE: CACHE } });
    if (child.status !== 0 || !fs.existsSync(a11)) refuse(`the L11 timing process exited ${child.status}`);
    const N11 = JSON.parse(fs.readFileSync(a11, 'utf8'));
    const rows11 = N11.rows, literal = N11.literal, offRows = N11.off, sessionMs = N11.session.ms, session11 = N11.session;
    timings.l11_node = r1(N11.seconds.protocol); timings.l11_literal = r1(N11.seconds.literal); timings.l11_engrams_off = r1(N11.seconds.engrams_off); timings.l11_child_total = secs(t);
    // Python: its time (reported) and the bootstrap intervals
    t = performance.now();
    let PT;
    try {
        PT = await runPython('time', { packagesPath: p11, registry: REG.text, registrySha256: REG.sha256, reps: REPS,
            bootstrap: { node_full: rows11.map(r => r.ms), node_attestation_skipped: rows11.map(r => r.msSkip), node_literal_laddr: literal.map(r => r.ms), node_engrams_off: offRows.map(r => r.ms) } }, 'time');
    } catch (e) { refuse(`the Python half failed: ${e.message}`); }
    timings.l11_python = secs(t);
    const B = PT.bootstrap.node_full, Bs = PT.bootstrap.node_attestation_skipped;
    const nodeMedian = median(rows11.map(r => r.ms));
    if (Math.abs(B.median - nodeMedian) > 1e-9) refuse(`numpy's median ${B.median} is not the runner's ${nodeMedian}`);
    const notAccepted = rows11.filter(r => r.failed.some(f => f !== '-') || r.skipFailed.some(f => f !== '-')).map(r => ({ shard: r.shard, failed: r.failed, skipFailed: r.skipFailed }));
    const ctl11 = { what: 'the same verifications with the attestation step skipped must be faster (median of the per-shard times); otherwise the step is not being timed and the test is void',
        median_full: r3(B.median), median_skipped: r3(Bs.median), difference_ms: r3(B.median - Bs.median), interval_skipped: Bs.interval.map(r3),
        attestation_step_ms_median: r3(median(rows11.map(r => r.byCheck.attestation))), shards_where_skipped_is_faster: rows11.filter(r => r.msSkip < r.ms).length, shards: rows11.length,
        paired: { what: 'reported, decides nothing: per shard, full minus skipped (means of repetitions 2 and 3)', median_difference_ms: r3(median(rows11.map(r => r.ms - r.msSkip))),
            positive: rows11.filter(r => r.ms > r.msSkip).length, of: rows11.length, per_verification_sd_ms: r3(Math.sqrt(median(rows11.map(r => { const xs = r.full.slice(1), m = sum(xs) / xs.length; return sum(xs.map(x => (x - m) ** 2)) / Math.max(1, xs.length - 1); })))) },
        shows_its_weakness: Bs.median < B.median };
    const lo = B.interval[0], hi = B.interval[1];
    if (notAccepted.length) reading('runner-12', 'A clean package that failed a check while being timed was not verified "with every hardened check", so its times are not L11\'s measurement: L11 is then void (not registered; it happened here).');
    const L11decision = !ctl11.shows_its_weakness ? 'void' : notAccepted.length ? 'void' : hi <= L11_BAR ? 'supported' : lo > L11_REFUTE ? 'refuted' : 'inconclusive';
    const L11out = {
        decision: L11decision,
        rule: `supported if the upper end of the 95% bootstrap interval of the median per-shard time is <= ${L11_BAR} ms; refuted if its lower end exceeds ${L11_REFUTE} ms; inconclusive otherwise; void if the attestation-skipped control is not faster`,
        shards: rows11.length, median_ms: r3(B.median), interval_ms: B.interval.map(r3), bootstrap: { seed: B.seed, resamples: B.resamples, n: B.n, by: 'numpy default_rng(7) in run_claims_phase3.py (rank.ci_mean\'s procedure, the median)' },
        session: { ms: r1(sessionMs), laddr_ms: r1(session11.timings.laddr), lvocab_ms: r1(session11.timings.lvocab), registry_ms: r3(session11.timings.registry) },
        corpus_estimate_1000_shards_s: r1((sessionMs + 1000 * B.median) / 1000),
        by_step_median_ms: Object.fromEntries(LC.CHECKS.map(c => [c, r3(median(rows11.map(r => r.byCheck[c])))])),
        control: ctl11,
        not_accepted: notAccepted,
        reported: {
            literal_laddr_per_shard: { what: 'LADDR/1 recomputed inside each verification (Amendment 7 item 7\'s literal alternative; decides nothing)', shards: literal.length,
                median_ms: r3(median(literal.map(r => r.ms))), interval_ms: PT.bootstrap.node_literal_laddr ? PT.bootstrap.node_literal_laddr.interval.map(r3) : null, failed: literal.filter(r => r.failed.some(f => f !== '-')).length },
            engrams_off_packages: { what: 'the same shards\' engrams-off records, packaged and attested the same way (decides nothing)', shards: offRows.length, median_ms: r3(median(offRows.map(r => r.ms))),
                interval_ms: PT.bootstrap.node_engrams_off ? PT.bootstrap.node_engrams_off.interval.map(r3) : null, failed: offRows.filter(r => r.failed.some(f => f !== '-')).length },
            python: { shards: PT.rows.length, median_ms: r3(PT.bootstrap.python_full.median), interval_ms: PT.bootstrap.python_full.interval.map(r3), session_laddr_ms: r1(PT.laddr_ms),
                by_step_median_ms: Object.fromEntries(LC.CHECKS.map(c => [c, r3(median(PT.rows.map(r => r.checks[c])))])), not_accepted: PT.rows.filter(r => r.failed.some(f => f !== '-')).length },
        },
        per_shard: rows11.map(r => ({ shard: r.shard, bytes: r.bytes, ms: r3(r.ms), reps: r.full.map(r3), skipped_ms: r3(r.msSkip), skipped_reps: r.skip.map(r3) })),
    };
    reading('runner-11', 'L11 protocol: repetition-major passes over the shards; in each pass a shard\'s full verification and its attestation-skipped verification run back to back, the order alternating, so drift affects both alike; a shard\'s time is the mean of its repetitions 2 and 3, the median is over shards, and the control compares the two medians. The package is passed as the parsed object (JSON parsing is not one of the hardened checks). The session (LVOCAB/1, LADDR/1 recomputed from WordNet, the registry snapshot loaded) is timed once and counted once in the 1,000-shard estimate.');
    fs.writeFileSync(path.join(CACHE_DIR, 'l11-times.json'), JSON.stringify({ rows: rows11, literal, engramsOff: offRows, python: PT.rows }));
    log(`   L11 ${L11decision}: median ${r1(B.median)} ms, interval [${r1(lo)}, ${r1(hi)}]; skipped ${r1(Bs.median)} ms (control ${ctl11.shows_its_weakness ? 'shows its weakness' : 'FAILS'}); session ${r1(sessionMs)} ms; literal ${r1(L11out.reported.literal_laddr_per_shard.median_ms)} ms; engrams off ${r1(L11out.reported.engrams_off_packages.median_ms)} ms; Python ${r1(PT.bootstrap.python_full.median)} ms`);

    // ============================================================== write
    const gitInfo = () => { const run = args => { const r = spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
        return { git_head: run(['rev-parse', 'HEAD']), system_uncommitted_changes: !!run(['status', '--porcelain', '--', SYS]) }; };
    const R = {
        preregistration: 'PREREGISTRATION.md with Amendments 1-7', phase: 3, dry: DRY, smoke: SMOKE || undefined,
        started: new Date(Date.now() - (performance.now() - T0)).toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        environment: { node: { version: process.version, v8: process.versions.v8, openssl: process.versions.openssl, platform: `${os.platform()} ${os.release()} ${os.arch()}`, cpus: os.cpus().length,
            cpu: (os.cpus()[0] || {}).model, workers: N_WORKERS, core: LC.version }, python: PY.environment, owl: EXT.owl, biochain: EXT.biochain, ...gitInfo() },
        cache: { root: '~/.cache/hyperbolic-lexicon (HL_CACHE overrides)', dir: SMOKE ? CACHE_DIR : path.basename(CACHE_DIR) },
        instances: { sets: SETS.map(sp => ({ set: sp.set, corpusId: sp.corpusId, spdx: sp.spdx, shards: shards.filter(s => s.set === sp.set).length, ...(sp.seeds ? { seeds: `${sp.seeds[0]}..${sp.seeds[sp.seeds.length - 1]}` } : {}),
            sha256_of_shard_sha256s: nodeSha(shards.filter(s => s.set === sp.set).map(s => s.sha256).join('\n')) })), corpus: CORPUS_SET, package_mode: PACKAGE_MODE,
            l9_lists: KS.map((K, j) => ({ K, seed: LIST_BASE + j, draws: DRAW_BASE + j })), l10: { clean_seeds: `${CLEAN_BASE}+i`, tamper_seeds: `${TAMPER_BASE} + 50(k - 1) + j` } },
        parity: PARITY,
        claims: { L8: L8out, L9: L9out, L10: L10out, L11: L11out },
        readings,
        timings: { ...timings, total: secs(T0) },
    };
    const stem = path.join(RESULTS, 'claims-phase3');
    fs.writeFileSync(stem + '.json', JSON.stringify(R, null, 1) + '\n');
    fs.writeFileSync(stem + '.md', report(R));
    log(`\nL8 JS ${L8out.decision.js}, Python ${L8out.decision.python}; L9 ${L9out.decision}; L10 ${L10out.decision}; L11 ${L11decision}`);
    log(`wrote ${SMOKE ? stem : rel(stem)}.json and .md, ${SMOKE ? regPath : rel(regPath)} (${secs(T0)} s)`);
    process.exit(0);

    // ============================================================== the Markdown report
    function report(R) {
        const C = R.claims, md = [], e = R.environment;
        const yes = b => (b ? 'yes' : 'NO');
        md.push(`# Hyperbolic Lexicon, Phase 3: L8-L11${R.dry ? ' (dry run)' : ''}${R.smoke ? ' (SMOKE: development run, decides nothing)' : ''}`, '',
            `Run ${R.started} with ${R.preregistration} by \`reference/run_claims_phase3.cjs${R.dry ? ' --dry' : ''}\`. Node ${e.node.version} (V8 ${e.node.v8}, ${e.node.cpus} CPUs, ${e.node.workers} worker threads); `
            + `Python ${e.python.python} (cryptography ${e.python.cryptography}, numpy ${e.python.numpy}); Owl Academy ${e.owl.commit.slice(0, 7)}, BioChain-AI ${e.biochain.commit.slice(0, 7)}; repository ${e.git_head ? e.git_head.slice(0, 7) : '?'}${e.system_uncommitted_changes ? ' (with uncommitted changes in the system)' : ''}. `
            + `Gate: ${R.parity.pass}/${R.parity.total} lines of tests/parity-lexicon.cjs pass, none skipped (${R.parity.chain_sections.join('; ')}).`, '',
            `Instances: ${R.instances.sets.map(x => `${x.set} ${x.shards} shards (${x.corpusId}${x.seeds ? `, Rng(${x.seeds})` : ''})`).join('; ')}; the corpus of L9(a), L10 and L11 is ${R.instances.corpus}, packaged with engrams ${R.instances.package_mode}.`, '',
            '| Claim | Decision | What decided it |', '| --- | --- | --- |',
            `| L8 (JS grower) | ${C.L8.decision.js} | ${C.L8.failures.js} failures over ${C.L8.records.per_grower} records; controls 1/2/3 show their weakness: ${[1, 2, 3].map(k => yes(C.L8.controls[k].shows_its_weakness)).join('/')} |`,
            `| L8 (Python port) | ${C.L8.decision.python} | ${C.L8.failures.python} failures over ${C.L8.records.per_grower} records |`,
            `| L9 | ${C.L9.decision} | ${C.L9.failures} failures (manifest K = ${C.L9.a.corpus.K}, ${C.L9.a.lists.length} synthetic lists, ${C.L9.b.shards} weaves); controls 1/2: ${yes(C.L9.controls[1].shows_its_weakness)}/${yes(C.L9.controls[2].shows_its_weakness)} |`,
            `| L10 | ${C.L10.decision} | false accepts ${C.L10.false_accepts.js} (JS) / ${C.L10.false_accepts.python} (Python), false rejects ${C.L10.false_rejects.js} / ${C.L10.false_rejects.python}, verdicts differ on ${C.L10.verdicts_differ}${C.L10.void_classes.length ? `; void classes ${C.L10.void_classes.join(', ')}` : ''}; control 2: ${C.L10.controls[2].accepted_raw}/${C.L10.controls[2].signatures} raw signatures accepted |`,
            `| L11 | ${C.L11.decision} | median ${C.L11.median_ms} ms, 95% interval [${C.L11.interval_ms.join(', ')}] over ${C.L11.shards} shards; attestation skipped ${C.L11.control.median_skipped} ms |`, '');
        const L8 = C.L8;
        md.push('## L8 · Language shards are Owl-valid biochains', '',
            `Records: ${L8.records.shards} shards x engrams off and on. Records differing from Owl's: growSync ${L8.mismatching_records.growSync}, Python ${L8.mismatching_records.python}, BioChain-AI ${L8.mismatching_records.biochain}. `
            + `(d): LVOCAB/1 ${L8.d.global.lvocab.equal ? 'equal' : 'DIFFERENT'}, LADDR/1 ${L8.d.global.laddr.equal ? 'equal' : 'DIFFERENT'} (addrTableRoot \`${L8.d.global.addrTableRoot.js}\`, ${L8.d.global.addrRows.js} rows; ${L8.d.global.laddr_ms.js} ms in JS, ${L8.d.global.laddr_ms.python} ms in Python), shards with an id stream or LPREP/1 difference: ${L8.d.shards_with_a_difference}.`, '');
        md.push('| Control | Shows its weakness | Detail |', '| --- | --- | --- |',
            `| 1 (kernel normalisation) | ${yes(L8.controls[1].shows_its_weakness)} | differs from Owl on ${L8.controls[1].differing}/${L8.controls[1].shards} synthetic shards |`,
            `| 2 (leaves over binary) | ${yes(L8.controls[2].shows_its_weakness)} | differs on ${L8.controls[2].differing}/${L8.controls[2].shards}, rejected by Owl on ${L8.controls[2].rejected}/${L8.controls[2].shards} (${L8.controls[2].first_reason}); Python's equals JS's on ${L8.controls[2].python_binary_equals_js} |`,
            `| 3 (one byte altered) | ${yes(L8.controls[3].shows_its_weakness)} | leaf and root changed on ${L8.controls[3].changed}/${L8.controls[3].shards} |`, '');
        const rp = L8.reported;
        md.push(`Reported: share of chunks whose crystal holds 0x80: ${Object.entries(rp.share_of_chunks_with_0x80).map(([k, v]) => `${k} ${v.with80}/${v.chunks} (${v.share}%)`).join(', ')}; `
            + `synthetic draws ${rp.synthetic_draws.map(x => x.draws).join(',')} (two-byte share ${Math.min(...rp.synthetic_draws.map(x => x.two_byte_share))}-${Math.max(...rp.synthetic_draws.map(x => x.two_byte_share))}%); `
            + `median value ${rp.value_median.off} (engrams off), ${rp.value_median.on} (on); median ms per shard: growSync ${rp.ms_median.growSync.off} / ${rp.ms_median.growSync.on}, Python ${rp.ms_median.python.off} / ${rp.ms_median.python.on}, Owl ${rp.ms_median.owl.off} / ${rp.ms_median.owl.on}, BioChain-AI ${rp.ms_median.biochain.off} / ${rp.ms_median.biochain.on} (off / on; ${rp.ms_median.note}).`, '');
        if (L8.counterexamples.js.length || L8.counterexamples.python.length) md.push('Counterexamples (first ' + KEEP + '): ' + '`' + JSON.stringify(L8.counterexamples).slice(0, 2000) + '`', '');
        md.push('<details><summary>Per shard</summary>', '', '| Shard | Bytes | Chunks | 0x80 | Value off / on | Differing fields (growSync, Python, BioChain-AI) | Owl / BioChain-AI verify, import | (d) |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
        for (const r of L8.shards) {
            const df = ['off', 'on'].map(m => ['growSync', 'python', 'biochain'].map(g => r.diff[m][g].length ? r.diff[m][g].join('+') : '-').join(', ')).join(' / ');
            const vf = ['off', 'on'].map(m => Object.values(r.verify[m]).every(v => v.owl && v.biochain) && Object.values(r.import[m]).every(v => v.verified && v.textEqual) ? 'ok' : 'FAIL').join(' / ');
            md.push(`| ${r.name} | ${r.bytes} | ${r.chunks} | ${r.chunks80} | ${r.value.off} / ${r.value.on} | ${df} | ${vf} | ${r.d.equal ? 'equal' : r.d.differing.join(', ')} |`);
        }
        md.push('', '</details>', '');
        const L9 = C.L9;
        md.push('## L9 · The corpus manifest, its growth, and the exact weave', '', '| List | K | Root (JS = Python) | Inclusion proofs (max hashes) | Wrong leaf / position accepted | Consistency proofs (failed) | Alterations (undetected) | JS/Python mismatches |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
        for (const x of [L9.a.corpus, ...L9.a.lists]) md.push(`| ${x.name} | ${x.K} | \`${x.root.slice(0, 16)}…\` ${x.roots_equal ? '=' : '≠'} | ${x.inclusion.proofs} (${x.inclusion.max_hashes}) | ${x.inclusion.accepted_wrong_leaf} / ${x.inclusion.accepted_wrong_position} | ${x.consistency.proofs} ${x.draws === 'sampled' ? 'sampled' : 'every m'} (${x.consistency.failed}) | ${x.alterations.cases} (${x.alterations.undetected}) | ${x.inclusion.js_python_mismatches + x.consistency.js_python_mismatches + x.alterations.js_python_mismatches} |`);
        md.push('', `(b) exact weaves: ${L9.b.shards - L9.b.failing}/${L9.b.shards} pass (norm 5^(28K), unfold, segment product, JS = Python); segment sub-weaves equal in both languages on ${L9.b.segment_subweaves_equal}/${L9.b.shards}; bits per component ${L9.b.bits_per_component.min}-${L9.b.bits_per_component.max}; median ms JS ${L9.b.ms_median.js}, Python ${L9.b.ms_median.python}.`,
            `Control 1 (shdccp/2 duplicate-last collision): ${L9.controls[1].cases.map(x => `K=${x.K} ${x.equal_roots ? 'collides' : 'does not collide'}`).join(', ')}. Control 2 (XOR blind to swaps the weave detects): ${L9.controls[2].cases.map(x => `K=${x.K} ${x.missed_by_xor_detected_by_weave}/${x.swaps}`).join(', ')}.`, '');
        if (L9.counterexamples.length) md.push('Counterexamples: `' + JSON.stringify(L9.counterexamples).slice(0, 2000) + '`', '');
        const L10 = C.L10;
        md.push('## L10 · The hardened, attested import', '', `Identity ${L10.identity.identityId} and keyVector ${L10.identity.keyVector} by BioChain-AI's computeIdentityId and deriveKeyVector (the core's port ${L10.identity.equal_to_core ? 'equal' : 'DIFFERENT'}; Python's ${L10.python_session.identity_equal ? 'equal' : 'DIFFERENT'}), epoch ${L10.identity.epochToken}; keys ${L10.keys.map(k => `${k.keyId} (${k.status})`).join(', ')}, made in WebCrypto for this run; registry snapshot \`${path.basename(L10.registry.file)}\` SHA-256 \`${L10.registry.sha256}\`. `
            + `Clean set: ${L10.clean.indices.length} shards (${L10.clean.draws} draws). Tier-P twins accepted: ${L10.corpus.tier_p_packages_accepted}.`, '',
            '| Class | Records | Accepted (JS / Python) | Self-consistent / authentic (JS) | Failing check (JS) | Agree | Owl accepts (control 1) |', '| --- | --- | --- | --- | --- | --- | --- |');
        for (const [c, b] of Object.entries(L10.by_class)) md.push(`| ${c}${b.void ? ' (void)' : ''} | ${b.records} | ${b.js.accepted} / ${b.python.accepted} | ${b.js.selfConsistent} / ${b.js.authentic} | ${Object.entries(b.js.failed).map(([k, v]) => `${k} ${v}`).join(', ')} | ${b.agree}/${b.records} | ${L10.controls[1].classes[c] ? `${L10.controls[1].classes[c].accepted_by_owl}/${L10.controls[1].classes[c].records}` : ''} |`);
        md.push('', `Control 2: Python without the P1363-to-DER conversion accepted ${L10.controls[2].accepted_raw} of ${L10.controls[2].signatures} valid signatures (${L10.controls[2].valid_with_conversion} verify with it; ${L10.controls[2].exceptions.join(', ')}): ${L10.controls[2].shows_its_weakness ? 'shows its weakness' : 'FAILS'}. Median verification ms per package: JS ${L10.ms_median.js}, Python ${L10.ms_median.python}.`, '');
        if (L10.counterexamples.length) md.push('Counterexamples: `' + JSON.stringify(L10.counterexamples).slice(0, 2000) + '`', '');
        const L11 = C.L11;
        md.push('## L11 · Verification is cheap enough for corpora', '', `${L11.shards} shards of at least 59,000 bytes, ${REPS} repetitions with process.hrtime.bigint, the first discarded: median **${L11.median_ms} ms**, 95% bootstrap interval [${L11.interval_ms.join(', ')}] (${L11.bootstrap.by}). `
            + `Session ${L11.session.ms} ms (LADDR/1 ${L11.session.laddr_ms} ms), once; 1,000 shards ≈ ${L11.corpus_estimate_1000_shards_s} s.`, '',
            `By step (median ms): ${Object.entries(L11.by_step_median_ms).map(([k, v]) => `${k} ${v}`).join(', ')}.`, '',
            `Control (attestation skipped): median ${L11.control.median_skipped} ms against ${L11.control.median_full} ms (difference ${L11.control.difference_ms} ms; the attestation step measures ${L11.control.attestation_step_ms_median} ms; skipped faster on ${L11.control.shards_where_skipped_is_faster}/${L11.control.shards} shards; paired, full minus skipped, median ${L11.control.paired.median_difference_ms} ms; a single verification's spread is about ${L11.control.paired.per_verification_sd_ms} ms): ${L11.control.shows_its_weakness ? 'shows its weakness' : 'FAILS: the test is void'}.`, '',
            `Reported: LADDR/1 recomputed in each verification ${L11.reported.literal_laddr_per_shard.median_ms} ms (${L11.reported.literal_laddr_per_shard.shards} shards); engrams-off packages ${L11.reported.engrams_off_packages.median_ms} ms [${(L11.reported.engrams_off_packages.interval_ms || []).join(', ')}]; Python ${L11.reported.python.median_ms} ms [${L11.reported.python.interval_ms.join(', ')}] (by step: ${Object.entries(L11.reported.python.by_step_median_ms).map(([k, v]) => `${k} ${v}`).join(', ')}).`, '');
        if (L11.not_accepted.length) md.push(`Not accepted while timed: ${JSON.stringify(L11.not_accepted).slice(0, 1000)}`, '');
        md.push('## READINGs of this runner', '', ...R.readings.map(x => `- **${x.id}.** ${x.text}`), '',
            'The core\'s and the reference\'s own READINGs are marked in lexicon_core.js (chain section) and reference/lexicon/{chain,records,manifest,attest,verify}.py; run_claims_phase3.py marks the L9 draws and control 2\'s swaps.', '',
            '## Timings (seconds)', '', Object.entries(R.timings).map(([k, v]) => `${k} ${v}`).join(', ') + '.', '',
            '## Full results', '', '`claims-phase3.json` (every shard, list, class and control; counterexamples, first 20 of each). Per-instance data (Python\'s records, the packages, the L11 times) are in '
            + `\`~/.cache/hyperbolic-lexicon/${path.basename(R.cache.dir)}/\` (HL_CACHE overrides the root), outside git. The registry snapshot holds public JWKs only; no private key is written anywhere.`, '');
        return md.join('\n');
    }
}
