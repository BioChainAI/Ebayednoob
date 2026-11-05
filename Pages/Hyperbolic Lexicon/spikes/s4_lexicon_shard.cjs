// Hyperbolic Lexicon, Phase 0, spike S4: language shards as shdccp/2 biochains, and what they cost.
//
// WHAT IT MEASURES. WordNet 3.0 verb and adjective glosses are cut into shards of at most 60,000 UTF-8 bytes and grown
// by a spike-only synchronous grower (growSync below: biochain_v1.js's verbatim Owl codec, orbital_core.js's
// synchronous SHA-256 over UTF-8, Owl's leaf / Merkle / weave / chainId rules restated line for line). Then:
//   1. field-for-field equality with Owl Academy's own growBiochain (Owl-Academy scripts/biomesh.js, run unchanged by
//      name-grab, with Node crypto SHA-256 over UTF-8 standing in for seal-crypto's sha256Hex, as
//      Pages/Engram Minds Eye/reference/golden/make_bridges_v1.cjs does), engrams on and off, on every verb and
//      adjective shard and on 8 synthetic shards; Owl's verifyIntegrity on every engrams-off record;
//   2. per shard: bytes, chunks, stream hex length, residual bytes, value (engrams off and on), chainId; and "~" timings
//      of encode, decode, crystallize, leaf hashing, weave and engram layer, and of Owl's own growBiochain;
//   3. the share of chunks whose 32-bit crystal holds a 0x80 byte, against the analytic 1 - (255/256)^4;
//   4. packets normalised as BioChain-AI protocol/shdccp_kernel.py writes them (0x80 -> 0x81, parity recomputed), packed
//      by that kernel in s4_python_pack.py (python3 -B -I): they change the stream but not merkleRoot, the weaves or
//      chainId (all recomputed from the normalised stream), and Owl's verifyIntegrity accepts the normalised record;
//   5. JS against Python weave strings on 1,000 synthetic shards (Rng(90000 + i)), Python regenerating the same bytes
//      and porting crystalQuat / qmul / qn / toFixed(12) two ways (faithful: V8's hypot and exact toFixed; naive: math.hypot
//      and '%.12f');
//   6. what Owl's verifyIntegrity accepts that it should not: leafHashes and merkleRoot deleted (T1), one packet's
//      crystal32 changed with parity re-fixed (T2), and, beyond the task list, the checksum changed (parity re-fixed),
//      chainId altered (T8), one padding bit of a residual flipped, and, as a control that must be caught, two frames
//      swapped (T7); EngramCore.verifyBiochain's verdicts beside Owl's; and one bit of a raw-byte rank code flipped
//      where the decode does not change (found in item 10);
//   7. RFC 6962 (0x00 leaf, 0x01 node, split at the largest power of two below n, no duplication) at N = 1,000 and
//      10,000 synthetic leaves: the CT reference roots for the 8-entry vector, a second root with orbital_core's SHA-256,
//      RFC 6962 section 2.1.3's worked audit paths and consistency proofs, every inclusion proof and every consistency
//      proof generated and verified (RFC 9162 algorithms), wrong leaves, positions and old roots rejected, their sizes,
//      "~" times;
//   8. the shdccp/2 Merkle rule's duplicate-last ambiguity (CVE-2012-2459 class): [a,b,c] and [a,b,c,c], and every
//      K = 1..200;
//   9. the exact norm-5 weave of one 84-chunk shard: engram_core chainQuaternion over the first 8 bytes of each leaf hash,
//      its norm against 5^(28K), bits per component, unfold, and (beyond the task list) the product of its 7 segments;
//  10. EngramCore.importBiochain on every verb shard (engrams off and on): accepted, text recreated byte for byte, and a
//      copy with one stream byte altered rejected; for any altered copy that is accepted, whether it decodes to the
//      same bytes; and, for frame 0 of verb 00-03, every single-bit residual flip that leaves the decode unchanged,
//      classified with a traced copy of decodeChunk (padding, inside a raw-byte rank code, elsewhere), and whether a
//      re-encode check (encodeChunk(decoded) === stored residual) rejects it;
//  11. "~" extrapolation to BabyLM strict-small (10M words, 55-60 MB) and strict (100M words, 550-600 MB), and the codec
//      part of L11's hardened verification per shard (parity, decode, crystal re-check, leaves and root, weaves and
//      chainId, exact weave), timed 3 times per verb shard with the first discarded, and the re-encode check beside it.
//
// HOW TO RUN, from the repository root (it runs s4_python_pack.py itself, as python3 -B -I):
//   node "Pages/Hyperbolic Lexicon/spikes/s4_lexicon_shard.cjs" [--owl <Owl-Academy>] [--biochain <BioChain-AI>] \
//       > "Pages/Hyperbolic Lexicon/spikes/s4_lexicon_shard_output.txt"
// The checkouts default to ../../../../Owl-Academy and ../../../../BioChain-AI from this folder; both are only read.
// Lines that begin with "~ " depend on the machine or the runtime (versions, timings, worker count); tests/spikes.cjs
// ignores them. Every other line must be identical on a rerun.
//
// WHAT IT SETTLES. The cost tables of the language-biochain design, D8 (shards <= 60,000 B, unmodified shdccp/2 with
// JS-compatible hashing, RFC 6962 manifests), L8's Python prediction (weave-string agreement) and L11's expected range.
// It decides no claim. It runs before PREREGISTRATION.md is written; no number here is a finding of a registered test.
//
// DATA AND SEEDS. Disjoint from the registered instances (C0 is noun glosses; seeds 1000+i, 2000+i, 4000+i, 9000-9023):
//   - WordNet 3.0 (wordnet_v1.cjs, SHA-256-checked archive) VERB and ADJECTIVE synsets, separately, each in offset
//     order, one line per synset: offset TAB lemmas joined by ', ' ('_' read as a space, adjective markers such as
//     '(a)' / '(p)' / '(ip)' kept as written) TAB gloss. Lines are joined by '\n' and cut greedily at line boundaries:
//     a line joins the current shard if the shard stays <= 60,000 UTF-8 bytes, otherwise it opens the next one; the
//     newline at a cut belongs to neither shard. No noun data is read.
//   - Synthetic shards: shard i from HPCore.Rng(90000 + i), i = 0..999 (generator in synthText; s4_python_pack.py has
//     the same one); shards 0..7 are also grown by both growers. RFC 6962 leaves: 10,000 entries of 32 bytes from
//     Rng(91000) (the N = 1,000 tree is the first 1,000). Rng(91001): 1,000 strings on which orbital_core's SHA-256 is
//     checked against Node's. No other randomness; Math.random is never called.
//
// READINGS CHOSEN WHERE THE TASK IS OPEN.
//   - The grower's engram layer is engram_core.js engramStream (ttmpt_core_v1.js's key, ~50x faster than
//     biochain_v1.js engramStreamFromText, which recomputes each letter's grid 64 times); item 1 checks it against
//     Owl's verbatim layer on every shard. The verbatim layer is timed once, alone on the main thread (verb shard 00);
//     the extrapolation uses that figure. Owl's engrams-on runs and the engrams-on imports run in worker threads (each
//     loads Owl's code by name-grab itself); results do not depend on the number of workers.
//   - biochain_v1.js does not export qconj, so growSync restates it; its text is checked equal to Owl's.
//   - "One byte of the stream altered" (item 10): the middle byte of frame 0's residual, high nibble flipped.
//   - BabyLM sizes are taken as 55e6 and 60e6 bytes (strict-small) and 550e6 and 600e6 (strict); shard fill, hex per
//     byte and per-shard times are the verb and adjective full shards' (all but the last of each part of speech).
//
// RUNTIME. About 3.5 minutes on 4 idle cores: ~50 s single-threaded timing, then ~150 s in which Owl's verbatim engram
// layer (~7 s per 60 KB shard, 85 runs) is spread over the workers while s4_python_pack.py (~25 s) runs beside them.
// 5-6 minutes when another job shares the cores; only the worker-phase "~" times change.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { Worker, isMainThread, parentPort } = require('worker_threads');
const { spawn } = require('child_process');

const HP = require('../../Hyperbolic Oracles/hyperbolic_core.js');
const O = require('../../../scripts/geometric-build/orbital_core.js');
const BC = require('../../Engram Minds Eye/biochain_v1.js');
const EC = require('../../Engram Minds Eye/engram_core.js');
const { grab } = require('../../Engram Minds Eye/reference/golden/owl_eye.cjs');

const ARGS = process.argv.slice(2);
const opt = (name, def) => { const i = ARGS.indexOf(name); return i >= 0 ? ARGS[i + 1] : def; };
const OWL = path.resolve(opt('--owl', path.join(__dirname, '..', '..', '..', '..', 'Owl-Academy')));
const BIOCHAIN = path.resolve(opt('--biochain', path.join(__dirname, '..', '..', '..', '..', 'BioChain-AI')));
const F_BIO = 'scripts/biomesh.js';

const SEED0 = 90000, N_SYNTH = 1000, N_SYNTH_GROWN = 8, SEED_RFC = 91000;
const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PUNCT = '0123456789.,;:\'!?-()"\n\t/&%#*+=';
const QCONJ_SRC = 'const qconj = a => [a[0], -a[1], -a[2], -a[3]];';
const qconj = a => [a[0], -a[1], -a[2], -a[3]];          // biomesh.js's qconj (not exported by biochain_v1.js)

const sha256Node = s => crypto.createHash('sha256').update(Buffer.from(String(s), 'utf8')).digest('hex');
const sha256Orb = s => O.toHex(O.sha256(O.utf8(String(s))));
const now = () => process.hrtime.bigint();
const msSince = t => Number(process.hrtime.bigint() - t) / 1e6;

// ---- Owl Academy's growBiochain and verifyIntegrity, run as written (make_bridges_v1.cjs's recipe)
function loadOwl() {
    const src = fs.readFileSync(path.join(OWL, F_BIO), 'utf8');
    const line = start => { const i = src.indexOf(start); if (i < 0) throw new Error(`${start} not found`); return src.slice(i, src.indexOf('\n', i)).trim(); };
    const SYNC = ['M64', 'fold64', 'qmul', 'qconj', 'qn', 'crystalQuat', 'quatHex', 'PAR_MASK', 'popcountEven', 'crystallize', 'unpackPacket', 'packWord',
        'mulberry32', 'engramCharGrid', 'engramGrid', 'engramGridHex', 'engramJ', 'tokenizeEngrams', 'engramStreamFromText',
        'frameStream', 'parseBiochainStream', 'BW', 'BR', 'cands', 'upd', 'encodeChunk', 'decodeChunk', 'chainFrames', 'recreateChunks', 'recreateText', 'parseCodexStream'];
    const consts = [line('export const MAX_GROW_BYTES'), line('export const STREAM_VERSION'), line('const CHUNK = ')].map(l => l.replace(/^export /, ''));
    const body = consts.concat(SYNC.map(n => grab(src, n).replace(/^export /, ''))).join('\n');
    const SC = { sha256Hex: async str => sha256Node(str) };
    const api = new Function('SC', body + '\n' + grab(src, 'growBiochain').replace(/^export /, '') + '\n' + grab(src, 'verifyIntegrity').replace(/^export /, '') +
        '\nreturn { growBiochain, verifyIntegrity };')(SC);
    return { sha256: sha256Node(src), qconjSrc: grab(src, 'qconj'), ...api };
}

// ---- the spike-only synchronous grower: growBiochain's steps, in its order, on biochain_v1.js + orbital_core sha256
function merkleShdccp2(leaves, sha) {            // pairwise SHA-256 over hex strings, an odd last node duplicated
    let root = leaves.slice();
    while (root.length > 1) {
        if (root.length & 1) root.push(root[root.length - 1]);
        const next = [];
        for (let i = 0; i < root.length; i += 2) next.push(sha(root[i] + root[i + 1]));
        root = next;
    }
    return root[0];
}
function weaves(chunks) {
    const cq = chunks.map(c => BC.crystalQuat(c));
    let wf = [1, 0, 0, 0], wm = [1, 0, 0, 0];
    for (const q of cq) wf = BC.qn(BC.qmul(q, wf));
    for (const q of cq.slice().reverse()) wm = BC.qn(BC.qmul(qconj(q), wm));
    return [wf, wm];
}
function growSync(text, opts = {}, T = null) {
    const withEngrams = opts.engrams !== false, sha = opts.sha || sha256Orb, engramFn = opts.engramFn || EC.engramStream;
    const data = [...new TextEncoder().encode(text)];
    if (!data.length) throw new Error('Nothing to grow.');
    if (data.length > BC.MAX_GROW_BYTES) throw new Error(`Grow input capped at ${BC.MAX_GROW_BYTES} bytes (got ${data.length}).`);
    const chunks = []; for (let i = 0; i < data.length; i += BC.CHUNK) chunks.push(data.slice(i, i + BC.CHUNK));
    let t = now();
    const residuals = chunks.map(c => BC.encodeChunk(c));
    if (T) { T.encode += msSince(t); t = now(); }
    const packets = chunks.map(c => BC.crystallizeBytes(c));
    if (T) { T.crystal += msSince(t); t = now(); }
    const leafHashes = chunks.map((c, i) => sha(i + '|' + sha(String.fromCharCode(...c))));
    const root = merkleShdccp2(leafHashes, sha);
    if (T) { T.hash += msSince(t); t = now(); }
    const stream = BC.frameStream(packets, residuals);
    const segCuts = Array.from({ length: BC.SEGMENTS + 1 }, (_, i) => Math.round(i * chunks.length / BC.SEGMENTS));
    const [wf, wm] = weaves(chunks);
    if (T) { T.weave += msSince(t); t = now(); }
    const merkleRoot = root || sha('empty');
    const chainId = 'BC-' + sha(merkleRoot + '|' + BC.quatHex(wf)).slice(0, 24);
    if (T) { T.hash += msSince(t); t = now(); }
    const eng = withEngrams ? engramFn(text) : null;
    if (T && eng) T.engram += msSince(t);
    const ship = stream.length / 2 + (eng ? eng.stream.length / 2 : 0) + leafHashes.length * 32 + 40;
    return {
        chainId, stream, streamVersion: BC.STREAM_VERSION, leafHashes, merkleRoot,
        weaveChiral: BC.quatHex(wf), weaveMirror: BC.quatHex(wm), segCuts, segments: BC.SEGMENTS,
        ...(eng ? { engramStream: eng.stream, engramCount: eng.count, engramMeanJ: eng.meanJ } : {}),
        origBytes: data.length, shippedBytes: Math.round(ship),
        value: +(data.length / ship).toFixed(4),
    };
}
// what a verifier recomputes from a stream alone: leaves, root, weaves and chainId (the record's other fields ignored)
function recomputeFromStream(stream, sha = sha256Orb) {
    const frames = BC.parseBiochainStream(stream);
    if (frames.some(f => f.parityOk === false)) return null;
    const chunks = frames.map(f => BC.decodeChunk(f.residual, f.chunkLen));
    const leaves = chunks.map((c, i) => sha(i + '|' + sha(String.fromCharCode(...c))));
    const merkleRoot = merkleShdccp2(leaves, sha) || sha('empty');
    const [wf, wm] = weaves(chunks);
    return { merkleRoot, weaveChiral: BC.quatHex(wf), weaveMirror: BC.quatHex(wm), chainId: 'BC-' + sha(merkleRoot + '|' + BC.quatHex(wf)).slice(0, 24), chunks };
}
const FIELDS_OWL = ['chainId', 'stream', 'streamVersion', 'leafHashes', 'merkleRoot', 'weaveChiral', 'weaveMirror', 'segCuts', 'segments',
    'engramStream', 'engramCount', 'engramMeanJ', 'origBytes', 'shippedBytes', 'value'];
function diffFields(a, b) {
    const keys = [...new Set([...FIELDS_OWL, ...Object.keys(a), ...Object.keys(b)])], bad = keys.filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    if (Object.keys(a).join() !== Object.keys(b).join()) bad.push('(key order)');
    return bad;
}

// ---- synthetic shards (s4_python_pack.py synth_shard is the same generator)
function synthText(i) {
    const r = new HP.Rng(SEED0 + i), target = 4 + r.below(59997), parts = [];
    let n = 0;
    for (;;) {
        const u = r.below(4294967296), cls = u % 100, v = Math.floor(u / 100);
        let cp;
        if (cls < 50) cp = LETTERS.charCodeAt(v % 52);
        else if (cls < 62) cp = 32;
        else if (cls < 70) cp = PUNCT.charCodeAt(v % PUNCT.length);
        else if (cls < 85) cp = 0x80 + v % 0x780;
        else if (cls < 95) { cp = 0x800 + v % 0xF000; if (cp >= 0xD800) cp += 0x800; }
        else cp = 0x10000 + v % 0x100000;
        const len = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
        if (n + len > target) break;
        parts.push(String.fromCodePoint(cp)); n += len;
    }
    return parts.join('');
}

// ---- packets: the crystal bytes, and the fields s4_python_pack.py packs with the kernel
const crystalBytesHex = p => [p.slice(2, 4), p.slice(4, 6), p.slice(6, 8), p.slice(8, 10)];
const has80 = p => crystalBytesHex(p).includes('80');
function packetFields(p) {
    const u = BC.unpackPacket(p), q = u.quat32, s = i => { const v = (q >>> i) & 255; return v >= 128 ? v - 256 : v; };
    return [u.form, u.spin, s(24), s(16), s(8), s(0), u.payload16, u.freq, u.amp];
}
function frameOffsets(stream) {                  // [packet offset, residual offset, residual hex length] per frame
    const out = []; let p = 0;
    while (p < stream.length) { const r = parseInt(stream.slice(p + 16, p + 24), 16) * 2; out.push([p, p + 24, r]); p += 24 + r; }
    return out;
}
// spike-only: decodeChunk's loop (biochain_v1.js) with bit positions recorded, to classify residual bits whose flip
// leaves the decode unchanged; its output is checked equal to BC.decodeChunk before it is used
function decodeTraced(hex, len) {
    const d = []; for (let i = 0; i < hex.length; i += 2) d.push(parseInt(hex.slice(i, i + 2), 16));
    let p = 0;
    const r = n => { let v = 0; for (let i = 0; i < n; i++) { if (p >= d.length * 8) throw new Error('residual truncated'); v = (v << 1) | ((d[p >> 3] >> (7 - (p & 7))) & 1); p++; } return v; };
    const g = () => { let z = 0; while (r(1) === 0) z++; return z ? ((1 << z) | r(z)) : 1; };
    const t = new Map(), out = [], escapes = [];
    let c = [0, 0], ctx = '0,0';
    for (let k = 0; k < len; k++) {
        const m = t.get(ctx), cs = m ? [...m.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(e => e[0]) : [];
        const p0 = p, n = g();
        let b;
        if (n - 1 < cs.length) b = cs[n - 1]; else { escapes.push([p0, p, cs.length]); b = r(8); }
        out.push(b);
        let mm = t.get(ctx); if (!mm) { mm = new Map(); t.set(ctx, mm); } mm.set(b, (mm.get(b) || 0) + 1);
        c = [c[1], b]; ctx = c.join(',');
    }
    return { out, used: p, bits: d.length * 8, escapes };
}
function silentFlips(residual, chunk) {           // every single-bit flip of a residual that decodes to the same bytes
    const tr = decodeTraced(residual, chunk.length), same = [];
    if (JSON.stringify(tr.out) !== JSON.stringify(BC.decodeChunk(residual, chunk.length))) throw new Error('traced decoder differs');
    for (let i = 0; i < residual.length; i++) for (let bit = 0; bit < 4; bit++) {
        const alt = residual.slice(0, i) + (parseInt(residual[i], 16) ^ (1 << bit)).toString(16) + residual.slice(i + 1);
        let ok = false;
        try { const x = BC.decodeChunk(alt, chunk.length); ok = x.length === chunk.length && x.every((v, j) => v === chunk[j]); } catch (e) { ok = false; }
        if (ok) { const q = 4 * i + (3 - bit); same.push({ i, bit, alt, kind: q >= tr.used ? 'padding' : tr.escapes.some(([a, b]) => q >= a && q < b) ? 'escape' : 'other' }); }
    }
    return { tr, same, flips: residual.length * 4 };
}
function refixParity(word) { word &= ~(1n << 59n); return word | (BC.popcountEven(word) << 59n); }
const hex16 = w => w.toString(16).toUpperCase().padStart(16, '0');

// ---- RFC 6962 Merkle tree hash, audit paths and consistency proofs (binary SHA-256), and RFC 9162 verifiers
const B0 = Buffer.from([0]), B1 = Buffer.from([1]);
function rfcHashers(kind) {
    const h = kind === 'orbital'
        ? (...parts) => Buffer.from(O.sha256(Buffer.concat(parts)))
        : (...parts) => { const x = crypto.createHash('sha256'); for (const p of parts) x.update(p); return x.digest(); };
    return { h, leaf: d => h(B0, d), node: (l, r) => h(B1, l, r) };
}
const largestPow2Below = n => { let k = 1; while (k * 2 < n) k *= 2; return k; };
class RfcLog {
    constructor(entries, kind = 'node') { this.D = entries; this.H = rfcHashers(kind); this.memo = new Map(); }
    mth(lo, hi) {
        if (hi === lo) return this.H.h(Buffer.alloc(0));
        const key = lo * 4194304 + hi;
        let x = this.memo.get(key);
        if (x) return x;
        if (hi - lo === 1) x = this.H.leaf(this.D[lo]);
        else { const k = largestPow2Below(hi - lo); x = this.H.node(this.mth(lo, lo + k), this.mth(lo + k, hi)); }
        this.memo.set(key, x);
        return x;
    }
    path(m, lo, hi) {
        const n = hi - lo;
        if (n === 1) return [];
        const k = largestPow2Below(n);
        return m < k ? [...this.path(m, lo, lo + k), this.mth(lo + k, hi)] : [...this.path(m - k, lo + k, hi), this.mth(lo, lo + k)];
    }
    subproof(m, lo, hi, b) {
        const n = hi - lo;
        if (m === n) return b ? [] : [this.mth(lo, hi)];
        const k = largestPow2Below(n);
        return m <= k ? [...this.subproof(m, lo, lo + k, b), this.mth(lo + k, hi)] : [...this.subproof(m - k, lo + k, hi, false), this.mth(lo, lo + k)];
    }
    consistency(m, n) { return this.subproof(m, 0, n, true); }
}
function verifyInclusion(H, index, size, leafHash, proof, root) {
    if (index >= size) return false;
    let fn = index, sn = size - 1, r = leafHash;
    for (const p of proof) {
        if (sn === 0) return false;
        if ((fn & 1) || fn === sn) { r = H.node(p, r); if (!(fn & 1)) while (!(fn & 1) && fn !== 0) { fn >>= 1; sn >>= 1; } }
        else r = H.node(r, p);
        fn >>= 1; sn >>= 1;
    }
    return sn === 0 && r.equals(root);
}
function verifyConsistency(H, m, n, rootM, rootN, proof) {
    if (m < 1 || m > n) return false;
    if (m === n) return proof.length === 0 && rootM.equals(rootN);
    const c = (m & (m - 1)) === 0 ? [rootM, ...proof] : proof.slice();
    if (!c.length) return false;
    let fn = m - 1, sn = n - 1;
    while (fn & 1) { fn >>= 1; sn >>= 1; }
    let fr = c[0], sr = c[0];
    for (const x of c.slice(1)) {
        if (sn === 0) return false;
        if ((fn & 1) || fn === sn) { fr = H.node(x, fr); sr = H.node(x, sr); if (!(fn & 1)) while (!(fn & 1) && fn !== 0) { fn >>= 1; sn >>= 1; } }
        else sr = H.node(sr, x);
        fn >>= 1; sn >>= 1;
    }
    return fr.equals(rootM) && sr.equals(rootN) && sn === 0;
}

// ---- small helpers
const median = xs => { const s = xs.slice().sort((a, b) => a - b), n = s.length; return n ? (n & 1 ? s[(n - 1) >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
const sum = xs => xs.reduce((a, b) => a + b, 0);
const f1 = x => x.toFixed(1), f4 = x => x.toFixed(4);
const pad = (s, n) => String(s).padStart(n);
const group = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const tick = () => new Promise(r => setImmediate(r));
function describeK(ks) {                         // e.g. "3, 5, 7, ..., 199 (99 values)" for an arithmetic run
    if (!ks.length) return 'none';
    const step = ks.length > 1 ? ks[1] - ks[0] : 0, arith = ks.length > 3 && ks.every((k, i) => !i || k - ks[i - 1] === step);
    return arith ? `${ks[0]}, ${ks[1]}, ${ks[2]}, ..., ${ks[ks.length - 1]} (${ks.length} values, step ${step})` : `${ks.join(', ')} (${ks.length} values)`;
}

// ---- worker threads: Owl's growBiochain with engrams on, and imports of engrams-on records (both pay Owl's verbatim
// engram layer, ~7 s per 60 KB shard)
function runPool(jobs, n) {
    return new Promise((resolve, reject) => {
        const results = new Array(jobs.length); let next = 0, done = 0;
        if (!jobs.length) return resolve(results);
        for (let w = 0; w < Math.min(n, jobs.length); w++) {
            const wk = new Worker(__filename, { argv: ARGS });
            wk.on('message', m => {
                results[m.id] = m; done++;
                if (next < jobs.length) wk.postMessage(jobs[next++]); else wk.terminate();
                if (done === jobs.length) resolve(results);
            });
            wk.on('error', reject);
            wk.postMessage(jobs[next++]);
        }
    });
}
function workerMain() {
    const owl = loadOwl();
    parentPort.on('message', async job => {
        const t = now();
        let out;
        if (job.kind === 'owlOn') out = { rec: await owl.growBiochain(job.text, { engrams: true }) };
        else {
            const rec = growSync(job.text, { engrams: true }), imp = EC.importBiochain(BC, rec);
            out = { verified: imp.verified, textEqual: typeof imp.text === 'string' && Buffer.from(imp.text, 'utf8').equals(Buffer.from(job.text, 'utf8')),
                detail: imp.checks.map(c => `${c.ok}`).join(',') };
        }
        out.ms = msSince(t); out.id = job.id;
        parentPort.postMessage(out);
    });
}

function runPython(req) {
    return new Promise((resolve, reject) => {
        const py = spawn('python3', ['-B', '-I', path.join(__dirname, 's4_python_pack.py'), '--json', '--biochain', BIOCHAIN], { stdio: ['pipe', 'pipe', 'pipe'] });
        const out = [], err = [];
        py.stdout.on('data', d => out.push(d)); py.stderr.on('data', d => err.push(d));
        py.on('error', reject);
        py.on('close', code => (code === 0 ? resolve(JSON.parse(Buffer.concat(out).toString('utf8'))) : reject(new Error(`s4_python_pack.py exited ${code}: ${Buffer.concat(err)}`))));
        py.stdin.end(JSON.stringify(req));
    });
}

async function main() {
    const T0 = now();
    const say = s => console.log(s);
    const W = require('../reference/golden/wordnet_v1.cjs');
    say('S4 s4_lexicon_shard: WordNet verb and adjective gloss shards grown as shdccp/2 biochains by a spike-only synchronous grower, field for field against Owl Academy\'s growBiochain; their costs, the 0x80 packing divergence, the float-weave port, the verifier gap, RFC 6962 manifests and the exact weave');
    say('Settles: the cost tables, D8, L8\'s Python prediction (weave agreement) and L11\'s expected range. Decides no claim. Data: WordNet verbs and adjectives, synthetic shards from Rng(90000+i), RFC 6962 leaves from Rng(91000).');
    const nWorkers = Math.max(1, Math.min(4, (os.availableParallelism ? os.availableParallelism() : os.cpus().length)));
    say(`~ node ${process.version}, ${process.platform}-${process.arch}, ${os.cpus().length} cpus (${os.cpus()[0].model}), ${nWorkers} worker threads`);
    say('');

    // ------------------------------------------------------------------ sources
    const owl = loadOwl();
    say('0. Sources (read only)');
    say(`  Owl-Academy ${F_BIO}: sha256 ${owl.sha256}; biochain_v1.js was generated from sha256 ${BC.source.sha256}: ${owl.sha256 === BC.source.sha256 ? 'the same file' : 'A DIFFERENT FILE'}`);
    say(`  growSync's qconj (biochain_v1.js does not export it) is Owl's text verbatim: ${owl.qconjSrc === QCONJ_SRC}`);
    say(`  constants: CHUNK ${BC.CHUNK}, SEGMENTS ${BC.SEGMENTS}, MAX_GROW_BYTES ${BC.MAX_GROW_BYTES}, STREAM_VERSION ${BC.STREAM_VERSION}`);
    const kernelSha = sha256Node(fs.readFileSync(path.join(BIOCHAIN, 'protocol', 'shdccp_kernel.py')));
    say(`  BioChain-AI protocol/shdccp_kernel.py: sha256 ${kernelSha}`);
    say(`  WordNet 3.0 archive sha256 ${W.ZIP_SHA256} (${W.ZIP_BYTES} B, checked by wordnet_v1.cjs)`);
    const sv = 'orbital_core.sha256 against Node crypto, SHA-256 over UTF-8, on 1,000 strings of 0..999 characters, ASCII and U+0080..U+07FF (Rng(91001))', rv = new HP.Rng(SEED_RFC + 1);
    let shaAgree = 0;
    for (let k = 0; k < 1000; k++) { const s = Array.from({ length: rv.below(1000) }, () => String.fromCharCode(rv.below(2) ? 32 + rv.below(95) : 0x80 + rv.below(0x780))).join(''); if (sha256Orb(s) === sha256Node(s)) shaAgree++; }
    say(`  ${sv}: ${shaAgree}/1000 equal`);
    say('');

    // ------------------------------------------------------------------ data
    const t = now();
    const wn = W.load();
    const glossLines = map => [...map.keys()].sort().map(off => { const s = map.get(off); return off + '\t' + s.lemmas.map(l => l.replace(/_/g, ' ')).join(', ') + '\t' + s.gloss; });
    function cut(lines) {
        const out = []; let cur = [], b = 0;
        for (const l of lines) {
            const n = Buffer.byteLength(l, 'utf8');
            if (n > BC.MAX_GROW_BYTES) throw new Error('a line longer than a shard');
            if (cur.length && b + 1 + n > BC.MAX_GROW_BYTES) { out.push(cur); cur = []; b = 0; }
            b += (cur.length ? 1 : 0) + n; cur.push(l);
        }
        if (cur.length) out.push(cur);
        return out;
    }
    const shards = [];
    say('1. Data');
    for (const [pos, tag] of [['verb', 'verb'], ['adj', 'adj ']]) {
        const lines = glossLines(wn.synsets[pos]), groups = cut(lines);
        const total = sum(lines.map(l => Buffer.byteLength(l, 'utf8'))) + lines.length - 1;
        groups.forEach((g, k) => shards.push({ name: `${tag} ${String(k).padStart(2, '0')}`, pos, text: g.join('\n'), lines: g.length, full: k < groups.length - 1 }));
        say(`  WordNet ${pos}: ${lines.length} synsets, ${group(total)} bytes joined, non-ASCII lines ${lines.filter(l => /[^\x00-\x7f]/.test(l)).length}, ${groups.length} shards (last ${Buffer.byteLength(groups[groups.length - 1].join('\n'))} B)`);
    }
    const synth = Array.from({ length: N_SYNTH }, (_, i) => synthText(i));
    for (let i = 0; i < N_SYNTH_GROWN; i++) shards.push({ name: `syn  ${String(i).padStart(2, '0')}`, pos: 'synthetic', text: synth[i], lines: 0, full: false, synthetic: true });
    const real = shards.filter(s => !s.synthetic), verbs = shards.filter(s => s.pos === 'verb'), fullReal = real.filter(s => s.full);
    say(`  shard texts: sha256 over the ${real.length} gloss shards' sha256s, one per line: ${sha256Node(real.map(s => sha256Node(s.text)).join('\n'))}`);
    say(`  synthetic: ${N_SYNTH} shards from Rng(90000+i), ${group(sum(synth.map(s => Buffer.byteLength(s))))} bytes; shards 0..${N_SYNTH_GROWN - 1} (${synth.slice(0, N_SYNTH_GROWN).map(s => Buffer.byteLength(s)).join(', ')} B) are also grown`);
    const synthBytes = synth.map(s => Buffer.from(s, 'utf8'));
    const synthDigest = sha256Node(synthBytes.map(b => crypto.createHash('sha256').update(b).digest('hex')).join('\n'));
    say(`  synthetic inputs digest (sha256 over the 1,000 shard sha256s, one per line): ${synthDigest}`);
    say(`~ data built in ${f1(msSince(t))} ms (WordNet load included)`);
    say('');

    // ------------------------------------------------------------------ phase 1: single-threaded growth and timing
    for (const s of shards) {
        s.T = { encode: 0, crystal: 0, hash: 0, weave: 0, engram: 0 };
        s.off = growSync(s.text, { engrams: false }, s.T);
        const T2 = { encode: 0, crystal: 0, hash: 0, weave: 0, engram: 0 };
        s.on = growSync(s.text, { engrams: true }, T2);
        s.T.engram = T2.engram;
        let t1 = now();
        s.owlOff = await owl.growBiochain(s.text, { engrams: false });
        s.msOwlOff = msSince(t1);
        t1 = now();
        const fr = BC.parseBiochainStream(s.off.stream), dec = fr.map(f => BC.decodeChunk(f.residual, f.chunkLen));
        s.msDecode = msSince(t1);
        s.decodedOk = Buffer.from(dec.flat()).equals(Buffer.from(s.text, 'utf8'));
        t1 = now();
        s.leafNodeMs = (() => { const bytes = [...Buffer.from(s.text, 'utf8')]; for (let i = 0, k = 0; i < bytes.length; i += BC.CHUNK, k++) sha256Node(k + '|' + sha256Node(String.fromCharCode(...bytes.slice(i, i + BC.CHUNK)))); return msSince(t1); })();
        s.packets = fr.map(f => f.packet);
        s.residualBytes = sum(fr.map(f => f.residual.length / 2));
        s.chunks = fr.length;
        s.n80 = s.packets.filter(has80).length;
    }
    // the verbatim engram layer, once, on verb 00
    let t1 = now();
    const engV = BC.engramStreamFromText(verbs[0].text);
    const msEngVerbatim = msSince(t1);
    t1 = now();
    const engF = EC.engramStream(verbs[0].text);
    const msEngFast = msSince(t1);

    // ------------------------------------------------------------------ phase 2: workers (Owl engrams on, imports on), Python, synthetic JS weaves
    const pyReq = { synth: N_SYNTH, pack: shards.map(s => { const bytes = Buffer.from(s.text, 'utf8'); return {
        name: s.name, chunks: s.packets.map((_, i) => bytes.subarray(i * BC.CHUNK, (i + 1) * BC.CHUNK).toString('hex')), fields: s.packets.map(packetFields), packets: s.packets }; }) };
    const tPool = now();
    const pyP = runPython(pyReq);
    const jobs = [...real.map(s => ({ kind: 'owlOn', text: s.text, ref: s })), ...verbs.map(s => ({ kind: 'importOn', text: s.text, ref: s })),
        ...shards.filter(s => s.synthetic).map(s => ({ kind: 'owlOn', text: s.text, ref: s }))].map((j, id) => ({ ...j, id }));
    const poolP = runPool(jobs.map(({ kind, text, id }) => ({ kind, text, id })), nWorkers);
    // meanwhile (yielding between shards so the pool is fed): Owl's JS weaves of the 1,000 synthetic shards
    const tSyn = now(), jsWeave = [];
    for (let i = 0; i < N_SYNTH; i++) {
        const b = synthBytes[i], chunks = [];
        for (let k = 0; k < b.length; k += BC.CHUNK) chunks.push(b.subarray(k, k + BC.CHUNK));
        const [wf, wm] = weaves(chunks);
        jsWeave.push([BC.quatHex(wf), BC.quatHex(wm)]);
        if (i % 10 === 9) await tick();
    }
    const msSynWeave = msSince(tSyn);
    const [results, py] = await Promise.all([poolP, pyP]);
    const msPool = msSince(tPool);
    jobs.forEach((j, id) => { const r = results[id]; if (j.kind === 'owlOn') { j.ref.owlOn = r.rec; j.ref.msOwlOn = r.ms; } else j.ref.importOn = r; });

    // ------------------------------------------------------------------ 1. equality with Owl
    say('2. Field-for-field equality with Owl Academy\'s growBiochain (scripts/biomesh.js unchanged, name-grab, Node crypto SHA-256 over UTF-8)');
    say(`  fields compared: ${FIELDS_OWL.join(', ')} (and key order)`);
    const groupsOf = [['verb', shards.filter(s => s.pos === 'verb')], ['adjective', shards.filter(s => s.pos === 'adj')], ['synthetic', shards.filter(s => s.synthetic)]];
    let mismatchTotal = 0, recTotal = 0;
    for (const [label, list] of groupsOf) {
        for (const mode of ['off', 'on']) {
            const bad = [];
            for (const s of list) { const d = diffFields(mode === 'off' ? s.off : s.on, mode === 'off' ? s.owlOff : s.owlOn); recTotal++; if (d.length) { mismatchTotal++; bad.push(`${s.name}: ${d.join(', ')}`); } }
            say(`  ${label} shards, engrams ${mode}: ${list.length - bad.length}/${list.length} records identical; mismatching fields: ${bad.length ? bad.join('; ') : 'none'}`);
        }
    }
    let owlOk = 0;
    for (const s of shards) if ((await owl.verifyIntegrity(s.off)).ok) owlOk++;
    say(`  Owl's verifyIntegrity accepts ${owlOk}/${shards.length} engrams-off records; the decoded stream equals the shard's bytes on ${shards.filter(s => s.decodedOk).length}/${shards.length}`);
    say(`  the engram layer: engram_core engramStream (the grower's) equals biochain_v1 engramStreamFromText (verbatim) on verb 00: ${engF.stream === engV.stream && engF.count === engV.count && engF.meanJ === engV.meanJ} (${engV.count} tokens); on every shard through Owl's records above`);
    say('');

    // ------------------------------------------------------------------ 2. costs per shard
    say('3. Per shard: bytes, synsets, chunks, stream hex, residual bytes, value (engrams off / on), engram tokens, 0x80 chunks, chainId');
    for (const s of shards) {
        say(`  ${s.name}  ${pad(s.off.origBytes, 5)} B  ${pad(s.lines, 3)} syn  ${pad(s.chunks, 2)} ch  hex ${pad(s.off.stream.length, 6)}  res ${pad(s.residualBytes, 5)} B  value ${s.off.value.toFixed(4)} / ${s.on.value.toFixed(4)}  eng ${pad(s.on.engramCount, 5)}  0x80 ${s.n80}  ${s.off.chainId}`);
    }
    say('  "~" per shard: ms of encode, decode, crystallize, leaves+root+chainId (orbital_core sha256), the same leaves (Node crypto), both weaves, engram layer (engram_core), Owl growBiochain engrams off (main thread) and on (worker, verbatim engram layer)');
    for (const s of shards) {
        say(`~ ${s.name}  enc ${pad(f1(s.T.encode), 5)}  dec ${pad(f1(s.msDecode), 5)}  crys ${pad(f1(s.T.crystal), 4)}  hash ${pad(f1(s.T.hash), 5)}  node ${pad(f1(s.leafNodeMs), 4)}  weave ${pad(f1(s.T.weave), 4)}  eng ${pad(f1(s.T.engram), 5)}  owl-off ${pad(f1(s.msOwlOff), 5)}  owl-on ${pad(f1(s.msOwlOn), 7)}`);
    }
    const F = fullReal, totBytes = sum(F.map(s => s.off.origBytes)), totHex = sum(F.map(s => s.off.stream.length)), totRes = sum(F.map(s => s.residualBytes));
    const jsonOff = sum(F.map(s => JSON.stringify(s.off).length)), jsonOn = sum(F.map(s => JSON.stringify(s.on).length)), engTok = sum(F.map(s => s.on.engramCount));
    say(`  full gloss shards (${F.length}, all but the last of each part of speech): ${group(totBytes)} B, mean ${f1(totBytes / F.length)} B per shard (min ${Math.min(...F.map(s => s.off.origBytes))}), chunks: ${[...new Set(F.map(s => s.chunks))].sort().map(k => `${F.filter(s => s.chunks === k).length} with ${k}`).join(', ')}`);
    say(`    stream hex ${group(totHex)} chars = ${f4(totHex / totBytes)} per byte; residual ${group(totRes)} B = ${f4(8 * totRes / totBytes)} bits per byte (rank coder alone)`);
    say(`    value: engrams off median ${f4(median(F.map(s => s.off.value)))} (range ${f4(Math.min(...F.map(s => s.off.value)))}-${f4(Math.max(...F.map(s => s.off.value)))}), engrams on median ${f4(median(F.map(s => s.on.value)))} (${f4(Math.min(...F.map(s => s.on.value)))}-${f4(Math.max(...F.map(s => s.on.value)))})`);
    say(`    record JSON: ${f4(jsonOff / totBytes)} chars per text byte engrams off, ${f4(jsonOn / totBytes)} on; ${group(engTok)} engram tokens = ${f1(totBytes / engTok)} B per token`);
    const med = k => median(F.map(s => (k === 'decode' ? s.msDecode : k === 'node' ? s.leafNodeMs : k === 'owlOff' ? s.msOwlOff : k === 'owlOn' ? s.msOwlOn : s.T[k])));
    say(`~   median ms per full shard: encode ${f1(med('encode'))}, decode ${f1(med('decode'))}, crystallize ${f1(med('crystal'))}, leaves+root+chainId ${f1(med('hash'))} (orbital_core) / ${f1(med('node'))} (Node crypto leaves), weaves ${f1(med('weave'))}, engram layer ${f1(med('engram'))} (engram_core)`);
    say(`~   median ms per full shard, Owl's growBiochain: engrams off ${f1(med('owlOff'))}, engrams on ${f1(med('owlOn'))} (in ${nWorkers} parallel workers, slower if other jobs share the cores; the next line is the clean figure)`);
    say(`~   verbatim engram layer measured alone on verb 00 (main thread): ${f1(msEngVerbatim)} ms for ${engV.count} tokens (${f1(1000 * msEngVerbatim / engV.count)} us per token); engram_core's: ${f1(msEngFast)} ms (${f1(msEngVerbatim / msEngFast)}x faster)`);
    const zl = require('zlib'), gz = sum(F.map(s => zl.gzipSync(Buffer.from(s.text, 'utf8'), { level: 9 }).length));
    say(`~   for context only (never claimed): gzip -9 ${f4(8 * gz / totBytes)} bits per byte on the same shards (zlib ${process.versions.zlib})`);
    say('');

    // ------------------------------------------------------------------ 3. the 0x80 crystal rate
    const P80 = new HP.Q(256n ** 4n - 255n ** 4n, 256n ** 4n), p80 = P80.toNumber();
    say('4. Chunks whose 32-bit crystal holds a 0x80 byte (Owl writes it raw; BioChain-AI\'s kernel would write 0x81)');
    say(`  analytic share 1 - (255/256)^4 = ${P80.n}/${P80.d} = ${f4(100 * p80)}%; for an 84-chunk record, P(at least one) = 1 - (1-p)^84 = ${f4(100 * (1 - Math.pow(1 - p80, 84)))}%`);
    for (const [label, list] of [['verb', shards.filter(s => s.pos === 'verb')], ['adjective', shards.filter(s => s.pos === 'adj')], ['all gloss', real]]) {
        const n = sum(list.map(s => s.chunks)), k = sum(list.map(s => s.n80)), z = (k - n * p80) / Math.sqrt(n * p80 * (1 - p80));
        say(`  ${label} shards: ${k} of ${n} chunks = ${f4(100 * k / n)}% (z = ${z.toFixed(2)} against the analytic share); shards with at least one: ${list.filter(s => s.n80).length} of ${list.length}`);
    }
    const synRows = py.synth.rows, synCh = sum(synRows.map(r => r[5])), syn80 = sum(synRows.map(r => r[6]));
    say(`  the 1,000 synthetic shards (counted in Python on the same bytes): ${syn80} of ${synCh} chunks = ${f4(100 * syn80 / synCh)}%; shards with at least one: ${synRows.filter(r => r[6]).length} of 1000`);
    say('');

    // ------------------------------------------------------------------ 4. normalised packets
    say('5. Packets normalised as BioChain-AI protocol/shdccp_kernel.py writes them (s4_python_pack.py, python3 -B -I, the kernel unchanged)');
    const ex = py.example;
    say(`  crystallize(bytes [75, 0, 7]): crystal codes ${JSON.stringify(ex.codes)}; JS ${BC.crystallizeBytes([75, 0, 7])}, Python raw port ${ex.raw_port}, kernel ${ex.kernel}`);
    let kernEqPack = 0, rawEqJs = 0, packetsTotal = 0, diffPk = 0, diffAt80 = 0, diffOnlyQuat = 0, unpackOk = 0, unpackM128 = 0, m128Js = 0;
    let streamChanged = 0, idSame = 0, rootSame = 0, weaveSame = 0, owlNormOk = 0, recompOrig = 0, ecNormOk = 0;
    const pyPack = new Map(py.pack.map(p => [p.name, p]));
    for (const s of shards) {
        const pp = pyPack.get(s.name);
        let changedHere = 0;
        s.packets.forEach((jp, i) => {
            packetsTotal++;
            if (pp.kernel[i] === pp.packed[i]) kernEqPack++;
            if (pp.raw_port[i] === jp) rawEqJs++;
            m128Js += crystalBytesHex(jp).filter(x => x === '80').length;
            if (pp.kernel[i] !== jp) {
                diffPk++; changedHere++;
                if (has80(jp)) diffAt80++;
                const a = packetFields(jp), b = packetFields(pp.kernel[i]);
                if ([0, 1, 6, 7, 8].every(k => a[k] === b[k]) && [2, 3, 4, 5].every(k => (a[k] === -128 ? b[k] === -127 : b[k] === a[k]))) diffOnlyQuat++;
            }
        });
        unpackOk += pp.unpack_ok; unpackM128 += pp.unpack_minus128;
        const fr = frameOffsets(s.off.stream);
        let ns = '';
        fr.forEach(([p, , r], i) => { ns += pp.kernel[i] + s.off.stream.slice(p + 16, p + 24 + r); });
        if (ns !== s.off.stream) streamChanged++;
        if ((changedHere > 0) !== (ns !== s.off.stream)) throw new Error('stream change bookkeeping');
        const re = recomputeFromStream(ns), re0 = recomputeFromStream(s.off.stream);
        if (re0 && re0.chainId === s.off.chainId && re0.merkleRoot === s.off.merkleRoot) recompOrig++;
        if (re && re.chainId === s.off.chainId) idSame++;
        if (re && re.merkleRoot === s.off.merkleRoot) rootSame++;
        if (re && re.weaveChiral === s.off.weaveChiral && re.weaveMirror === s.off.weaveMirror) weaveSame++;
        const normRec = { ...s.off, stream: ns };
        if ((await owl.verifyIntegrity(normRec)).ok) owlNormOk++;
        if (EC.verifyBiochain(BC, normRec).ok) ecNormOk++;
    }
    const n80All = sum(shards.map(s => s.n80));
    say(`  ${shards.length} shards (${real.length} gloss + ${N_SYNTH_GROWN} synthetic), ${packetsTotal} packets:`);
    say(`    kernel crystallize(chunk) equals kernel pack(the JS word's fields): ${kernEqPack}/${packetsTotal}; the Python raw port equals Owl's JS word: ${rawEqJs}/${packetsTotal}`);
    say(`    kernel packets that differ from Owl's: ${diffPk}; packets with a 0x80 crystal byte: ${n80All}; differing ones that have one: ${diffAt80}; differing only by -128 -> -127 codes and parity: ${diffOnlyQuat}`);
    say(`    kernel.unpack accepts Owl's raw packets: ${unpackOk}/${packetsTotal}, reading ${unpackM128} codes of -128 (Owl wrote ${m128Js} bytes 0x80)`);
    say(`    the normalised stream differs from Owl's on ${streamChanged} of ${shards.length} shards (exactly those with a 0x80 chunk: ${streamChanged === shards.filter(s => s.n80).length})`);
    say(`    recomputed from the normalised stream (decode, leaves, root, weaves, chainId): merkleRoot unchanged ${rootSame}/${shards.length}, both weaves unchanged ${weaveSame}/${shards.length}, chainId unchanged ${idSame}/${shards.length} (from Owl's own stream: ${recompOrig}/${shards.length})`);
    say(`    Owl's verifyIntegrity accepts the record with its stream normalised: ${owlNormOk}/${shards.length}; EngramCore.verifyBiochain: ${ecNormOk}/${shards.length}`);
    say('    (leaves and the weave are computed from chunk bytes, never from packet words; so chainId and merkleRoot do not commit to the packets, and a verifier must re-crystallize to check them)');
    say(`~   Python ${py.python}: pack ${py.ms_pack} ms, synthetic generate ${py.synth.ms.generate} ms, weave ${py.synth.ms.weave} ms`);
    say('');

    // ------------------------------------------------------------------ 5. JS against Python weave strings
    say('6. JS against Python weave strings on the 1,000 synthetic shards (Rng(90000+i); Python regenerates the bytes with hpstep.prng.Rng)');
    let inMis = 0, fC = 0, fM = 0, fAny = 0, nC = 0, nM = 0, nAny = 0;
    synRows.forEach((r, i) => {
        if (r[0] !== crypto.createHash('sha256').update(synthBytes[i]).digest('hex')) inMis++;
        const [c, m] = jsWeave[i];
        if (r[1] !== c) fC++; if (r[2] !== m) fM++; if (r[1] !== c || r[2] !== m) fAny++;
        if (r[3] !== c) nC++; if (r[4] !== m) nM++; if (r[3] !== c || r[4] !== m) nAny++;
    });
    const jsDigest = sha256Node(jsWeave.map(([c, m]) => `${c}|${m}`).join('\n'));
    const chunkHist = [1, 2, 10, 42, 84].map(k => `${synRows.filter(r => r[5] <= k).length} with <= ${k}`).join(', ');
    say(`  input bytes differ (sha256): ${inMis} of 1000; chunks per shard: ${chunkHist}`);
    say(`  JS weave digest (sha256 over "chiral|mirror" lines; s4_python_pack_output.txt prints Python's): ${jsDigest}`);
    say(`  faithful Python port (V8's Math.hypot algorithm, exact toFixed(12)): weaveChiral differs on ${fC}, weaveMirror on ${fM}; shards with any difference ${fAny} of 1000`);
    say(`  naive Python port (math.hypot, format(x, '.12f')): weaveChiral differs on ${nC}, weaveMirror on ${nM}; shards with any difference ${nAny} of 1000`);
    say(`  math.hypot differs from V8's Math.hypot on ${py.synth.hypot[1]} of ${py.synth.hypot[0]} calls; format(x, '.12f') differs from toFixed(12) on ${py.synth.fixed[1]} of ${py.synth.fixed[0]} weave components`);
    say(`~   JS synthetic weaves: ${f1(msSynWeave)} ms (interleaved with the worker pool)`);
    say('');

    // ------------------------------------------------------------------ 6. the verifier gap
    say('7. What Owl\'s verifyIntegrity accepts (verb 00, engrams off); EngramCore.verifyBiochain beside it');
    const base = verbs[0].off, fo = frameOffsets(base.stream);
    const setPacket = (rec, i, word) => { const p = frameOffsets(rec.stream)[i][0]; return { ...rec, stream: rec.stream.slice(0, p) + hex16(word) + rec.stream.slice(p + 16) }; };
    const w0 = BigInt('0x' + base.stream.slice(0, 16));
    // a padding bit: the lowest bit of the last residual byte of the first frame whose decode ignores it
    let padFrame = -1, padStream = null;
    for (let i = 0; i < fo.length && padFrame < 0; i++) {
        const [, rp, rl] = fo[i], pos = rp + rl - 1, d = parseInt(base.stream[pos], 16), alt = base.stream.slice(0, pos) + (d ^ 1).toString(16) + base.stream.slice(pos + 1);
        const f = BC.parseBiochainStream(alt)[i];
        let same = false;
        try { same = JSON.stringify(BC.decodeChunk(f.residual, f.chunkLen)) === JSON.stringify(BC.decodeChunk(BC.parseBiochainStream(base.stream)[i].residual, f.chunkLen)); } catch (e) { same = false; }
        if (same) { padFrame = i; padStream = alt; }
    }
    const sf0 = silentFlips(fo.length ? base.stream.slice(fo[0][1], fo[0][1] + fo[0][2]) : '', BC.decodeChunk(BC.parseBiochainStream(base.stream)[0].residual, BC.parseBiochainStream(base.stream)[0].chunkLen));
    const esc0 = sf0.same.find(x => x.kind === 'escape');
    const escStream = esc0 ? base.stream.slice(0, fo[0][1]) + esc0.alt + base.stream.slice(fo[0][1] + fo[0][2]) : null;
    const swap = (() => { const [a, b] = [fo[0], fo[1]], fa = base.stream.slice(a[0], a[1] + a[2]), fb = base.stream.slice(b[0], b[1] + b[2]); return fb + fa + base.stream.slice(b[1] + b[2]); })();
    const crys = refixParity(w0 ^ (1n << 24n)), csum = refixParity(w0 ^ (1n << 3n));
    const tampers = [
        ['T1 leafHashes and merkleRoot deleted', (() => { const r = { ...base }; delete r.leafHashes; delete r.merkleRoot; return r; })()],
        ['T2 packet 0 crystal32 bit 0 flipped, parity re-fixed', setPacket(base, 0, crys)],
        ['packet 0 checksum (freq bit 0) flipped, parity re-fixed', setPacket(base, 0, csum)],
        ['T8 chainId altered (last hex digit)', { ...base, chainId: base.chainId.slice(0, -1) + (base.chainId.endsWith('0') ? '1' : '0') }],
        [`one padding bit flipped (last residual byte of frame ${padFrame})`, { ...base, stream: padStream }],
        [`one bit of a raw-byte rank code flipped (frame 0, residual bit ${esc0 ? 4 * esc0.i + 3 - esc0.bit : -1}; decodes the same)`, { ...base, stream: escStream }],
        ['T7 frames 0 and 1 swapped (control: must be rejected)', { ...base, stream: swap }],
        ['packet 0 parity bit flipped (control: must be rejected)', setPacket(base, 0, w0 ^ (1n << 59n))],
    ];
    const verdict = {};
    for (const [name, rec] of tampers) {
        const v = await owl.verifyIntegrity(rec), e = EC.verifyBiochain(BC, rec);
        verdict[name.split(' ')[0]] = v.ok; verdict[name] = v.ok;
        const streamSame = rec.stream === base.stream ? 'stream unchanged' : `stream sha256 changed`;
        say(`  ${name}: Owl ${v.ok ? 'ACCEPTS' : 'rejects (' + v.reasons[0] + ')'}; EngramCore ${e.ok ? 'accepts' : 'rejects'}; ${streamSame}`);
    }
    say(`  (the packet words changed above were re-parsed: T2 parity ok ${BC.unpackPacket(hex16(crys)).parityOk}, checksum change parity ok ${BC.unpackPacket(hex16(csum)).parityOk})`);
    say('');

    // ------------------------------------------------------------------ 7. RFC 6962
    say('8. RFC 6962 Merkle tree (0x00 leaf, 0x01 node, split at the largest power of two below n, no duplication)');
    const CT = ['', '00', '10', '2021', '3031', '40414243', '5051525354555657', '606162636465666768696a6b6c6d6e6f'].map(h => Buffer.from(h, 'hex'));
    const CT_ROOTS = ['e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', '6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d',
        'fac54203e7cc696cf0dfcb42c92a1d9dbaf70ad9e621f4bd8d98662f00e3c125', 'aeb6bcfe274b70a14fb067a5e5578264db0fa9b51af5e0ba159158f329e06e77',
        'd37ee418976dd95753c1c73862b9398fa2a2cf9b4ff0fdfe8b30cd95209614b7', '4e3bbb1f7b478dcfe71fb631631519a3bca12c9aefca1612bfce4c13a86264d4',
        '76e67dadbcdf1e10e1b74ddc608abd2f98dfb16fbce75277b5232a127f2087ef', 'ddb89be403809e325750d3d263cd78929c2942b7942a34b77e122c9594a74c8c',
        '5dc9da79a70659a9ad559cb701ded9a2ab9d823aad2f4960cfe370eff4604328'];
    const ctLog = new RfcLog(CT), ctOk = CT_ROOTS.filter((r, n) => ctLog.mth(0, n).toString('hex') === r).length;
    say(`  the certificate-transparency reference vector (8 entries, roots of every prefix n = 0..8): ${ctOk}/9 roots equal`);
    const L7 = new RfcLog(CT.slice(0, 7)), nm = { a: L7.mth(0, 1), b: L7.mth(1, 2), c: L7.mth(2, 3), d: L7.mth(3, 4), f: L7.mth(5, 6), j: L7.mth(6, 7),
        g: L7.mth(0, 2), h: L7.mth(2, 4), i: L7.mth(4, 6), k: L7.mth(0, 4), l: L7.mth(4, 7) };
    const eqList = (xs, names) => xs.length === names.length && xs.every((x, q) => x.equals(nm[names[q]]));
    const rfcEx = [[L7.path(0, 0, 7), 'bhl'], [L7.path(3, 0, 7), 'cgl'], [L7.path(4, 0, 7), 'fjk'], [L7.path(6, 0, 7), 'ik'],
        [L7.consistency(3, 7), 'cdgl'], [L7.consistency(4, 7), 'l'], [L7.consistency(6, 7), 'ijk']].filter(([xs, n]) => eqList(xs, n.split(''))).length;
    say(`  RFC 6962 section 2.1.3's worked examples (7 leaves): audit paths of d0, d3, d4, d6 = [b,h,l], [c,g,l], [f,j,k], [i,k] and consistency proofs PROOF(3), PROOF(4), PROOF(6) = [c,d,g,l], [l], [i,j,k]: ${rfcEx}/7 equal`);
    const rfcAll = [], rfcMax = [], rfcCMax = [];
    const rr = new HP.Rng(SEED_RFC), ENT = Array.from({ length: 10000 }, () => { const b = Buffer.alloc(32); for (let k = 0; k < 8; k++) b.writeUInt32BE(rr.below(4294967296), 4 * k); return b; });
    for (const N of [1000, 10000]) {
        const D = ENT.slice(0, N);
        let tb = now(); const log = new RfcLog(D), root = log.mth(0, N); const msBuild = msSince(tb);
        const H = log.H, rootOrb = new RfcLog(D, 'orbital').mth(0, N);
        tb = now(); const paths = D.map((_, m) => log.path(m, 0, N)); const msPaths = msSince(tb);
        tb = now(); let incOk = 0; paths.forEach((p, m) => { if (verifyInclusion(H, m, N, log.mth(m, m + 1), p, root)) incOk++; }); const msIncV = msSince(tb);
        let wrongLeaf = 0, wrongPos = 0;
        paths.forEach((p, m) => { const o = (m + 1) % N; if (!verifyInclusion(H, m, N, log.mth(o, o + 1), p, root)) wrongLeaf++; if (!verifyInclusion(H, o, N, log.mth(m, m + 1), p, root)) wrongPos++; });
        const lens = paths.map(p => p.length);
        rfcMax.push(Math.max(...lens));
        tb = now(); let conOk = 0; const clens = [];
        for (let m = 1; m < N; m++) { const pr = log.consistency(m, N); clens.push(pr.length); if (verifyConsistency(H, m, N, log.mth(0, m), root, pr)) conOk++; }
        const msCons = msSince(tb);
        rfcCMax.push(Math.max(...clens));
        let conBad = 0, conSampled = 0;
        for (let m = 1; m < N; m += 97) {                // a wrong old root (first byte flipped) must be rejected
            const pr = log.consistency(m, N), wrong = Buffer.from(log.mth(0, m)); wrong[0] ^= 1; conSampled++;
            if (!verifyConsistency(H, m, N, wrong, root, pr)) conBad++;
        }
        rfcAll.push(incOk === N && wrongLeaf === N && wrongPos === N && conOk === N - 1 && conBad === conSampled && rootOrb.equals(root));
        say(`  N = ${N}: root ${root.toString('hex')} (orbital_core's SHA-256 gives the same: ${rootOrb.equals(root)})`);
        say(`    inclusion proofs: ${incOk}/${N} verify; rejected for the next leaf's hash ${wrongLeaf}/${N}, at the next position ${wrongPos}/${N}; length ${Math.min(...lens)}-${Math.max(...lens)} hashes (mean ${f4(sum(lens) / N)}), at most ${Math.max(...lens) * 32} B`);
        say(`    consistency proofs from every m = 1..${N - 1}: ${conOk}/${N - 1} verify; ${conBad}/${conSampled} sampled ones (m = 1, 98, 195, ...) rejected against the wrong old root; length ${Math.min(...clens)}-${Math.max(...clens)} hashes (mean ${f4(sum(clens) / clens.length)}), at most ${Math.max(...clens) * 32} B`);
        say(`~   N = ${N}: build ${f1(msBuild)} ms, all audit paths ${f1(msPaths)} ms, verify all ${f1(msIncV)} ms (${f1(1000 * msIncV / N)} us each), all consistency proofs made and verified ${f1(msCons)} ms`);
    }
    say('');

    // ------------------------------------------------------------------ 8. the duplicate-last ambiguity
    say('9. The shdccp/2 Merkle rule\'s duplicate-last ambiguity (pairwise SHA-256 over hex, odd last node duplicated; Node crypto)');
    const LV = verbs.flatMap(s => s.off.leafHashes).slice(0, 200), r2 = L => merkleShdccp2(L, sha256Node);
    const [a, b, c] = LV;
    say(`  a, b, c = verb 00's first three leaf hashes: root[a,b,c] = ${r2([a, b, c]).slice(0, 16)}..., root[a,b,c,c] = ${r2([a, b, c, c]).slice(0, 16)}...: ${r2([a, b, c]) === r2([a, b, c, c]) ? 'EQUAL' : 'different'}`);
    const coll1 = [], coll2 = [];
    let rfcColl = 0;
    for (let K = 1; K <= 200; K++) {
        const L = LV.slice(0, K);
        if (r2(L) === r2([...L, L[K - 1]])) coll1.push(K);
        if (K >= 2 && r2(L) === r2([...L, L[K - 2], L[K - 1]])) coll2.push(K);
        const toB = x => Buffer.from(x, 'hex'), A = new RfcLog(L.map(toB)).mth(0, K), B2 = new RfcLog([...L, L[K - 1]].map(toB)).mth(0, K + 1);
        if (A.equals(B2)) rfcColl++;
    }
    const odd = Array.from({ length: 100 }, (_, i) => 2 * i + 1), oddOk = odd.slice(1).every(k => coll1.includes(k)) && coll1.every(k => k % 2 === 1 && k >= 3);
    say(`  K = 1..200, L and L + [last]: equal roots at K = ${describeK(coll1)}; exactly the odd K >= 3: ${oddOk}; K = 1: ${coll1.includes(1)}`);
    say(`    (K = 1 is safe because a one-leaf root is the leaf itself, never hashed; [a] and [a,a] differ)`);
    say(`  L and L + [last two]: equal roots at K = ${describeK(coll2)}`);
    say(`  RFC 6962 roots of the same lists, L against L + [last]: equal at ${rfcColl} of 200`);
    say('');

    // ------------------------------------------------------------------ 9. the exact weave
    say('10. The exact norm-5 weave of verb 00 (engram_core chainQuaternion over the first 8 bytes of each leaf hash, as 64-bit values)');
    const leaves0 = verbs[0].off.leafHashes, K0 = leaves0.length, vals = leaves0.map(h => BigInt('0x' + h.slice(0, 16)));
    let tq = now(); const Q = EC.chainQuaternion(vals); const msQ = msSince(tq);
    const norm = EC.qnorm(Q), expect = 5n ** (28n * BigInt(K0));
    tq = now(); const back = EC.unfold(Q, K0); const msU = msSince(tq);
    const bits = Q.map(x => (x < 0n ? -x : x).toString(2).length);
    tq = now(); const pq = EC.packetQuaternions(vals), cuts = verbs[0].off.segCuts, segs = cuts.slice(0, -1).map((lo, s) => EC.qprod(pq.slice(lo, cuts[s + 1]))); const segProd = EC.qprod(segs); const msSeg = msSince(tq);
    say(`  K = ${K0} leaves, ${EC.L * K0} letters; norm (sum of squares) = 5^(28K) = 5^${28 * K0} exactly: ${norm === expect} (log2 = ${(28 * K0 * Math.log2(5)).toFixed(1)}; sqrt bound ${(14 * K0 * Math.log2(5)).toFixed(1)} bits)`);
    say(`  component bits: ${bits.join(', ')}; components sha256 (decimal, comma-joined): ${sha256Node(Q.map(String).join(','))}`);
    const unfoldOk = !!back && back.length === K0 && back.every((v, i) => v === vals[i]);
    say(`  unfold(q, ${K0}) returns the ${K0} values in order: ${unfoldOk}; the ordered product of the 7 segment sub-weaves (segCuts ${cuts.join(',')}) equals it: ${EC.qeq(segProd, Q)}`);
    say(`~   chainQuaternion ${f1(msQ)} ms, unfold ${f1(msU)} ms, segment products ${f1(msSeg)} ms`);
    say('');

    // ------------------------------------------------------------------ 10. importBiochain
    say('11. EngramCore.importBiochain on every verb shard');
    let impOff = 0, impOffText = 0, impOn = 0, impOnText = 0, rej = 0;
    const reasons = new Map(), impMs = [], acceptedAlt = [];
    for (const s of verbs) {
        let ti = now(); const imp = EC.importBiochain(BC, s.off); impMs.push(msSince(ti));
        if (imp.verified) impOff++;
        if (typeof imp.text === 'string' && Buffer.from(imp.text, 'utf8').equals(Buffer.from(s.text, 'utf8'))) impOffText++;
        if (s.importOn.verified) impOn++;
        if (s.importOn.textEqual) impOnText++;
        const [, rp, rl] = frameOffsets(s.off.stream)[0], pos = rp + 2 * Math.floor(rl / 4), d = parseInt(s.off.stream[pos], 16);
        const alt = { ...s.off, stream: s.off.stream.slice(0, pos) + (d ^ 8).toString(16) + s.off.stream.slice(pos + 1) };
        const ai = EC.importBiochain(BC, alt);
        if (!ai.verified) { rej++; const why = (ai.checks[0].detail || '').replace(/\d+/g, 'k'); reasons.set(why, (reasons.get(why) || 0) + 1); }
        else {
            const f0 = BC.parseBiochainStream(alt.stream)[0], f0o = BC.parseBiochainStream(s.off.stream)[0], c0 = BC.decodeChunk(f0o.residual, f0o.chunkLen);
            acceptedAlt.push(`${s.name}: residual hex ${pos - rp} of ${rl}; decodes to the same ${c0.length} bytes: ${JSON.stringify(BC.decodeChunk(f0.residual, f0.chunkLen)) === JSON.stringify(c0)}; re-encoding them gives the stored residual: ${BC.encodeChunk(c0) === f0.residual}, the original: ${BC.encodeChunk(c0) === f0o.residual}`);
        }
    }
    say(`  engrams off: accepted ${impOff}/${verbs.length}, text recreated byte for byte ${impOffText}/${verbs.length}`);
    say(`  engrams on (verbatim engram check inside, in the workers): accepted ${impOn}/${verbs.length}, text recreated byte for byte ${impOnText}/${verbs.length}`);
    say(`  one stream byte altered (frame 0's residual, middle byte, high nibble flipped): rejected ${rej}/${verbs.length}; reasons: ${[...reasons].map(([k, v]) => `${v} x "${k}"`).join('; ')}`);
    for (const a of acceptedAlt) say(`    accepted: ${a}`);
    const sfAll = verbs.slice(0, 4).map(s => { const fr0 = BC.parseBiochainStream(s.off.stream)[0]; return silentFlips(fr0.residual, BC.decodeChunk(fr0.residual, fr0.chunkLen)); });
    const sfN = sum(sfAll.map(x => x.same.length)), sfT = sum(sfAll.map(x => x.flips)), kinds = k => sum(sfAll.map(x => x.same.filter(y => y.kind === k).length));
    say(`  every single-bit flip of frame 0's residual, verb 00-03: ${sfN} of ${sfT} (${f4(100 * sfN / sfT)}%) decode to the same 720 bytes: ${kinds('padding')} in the final byte's padding, ${kinds('escape')} inside a rank code that reads a raw byte, ${kinds('other')} elsewhere`);
    say('    (decodeChunk reads a raw byte for ANY rank above the candidate count, so an escape code has aliases; leaves, root, weave and chainId commit to decoded bytes only, so such a stream verifies; the check below re-encodes the decoded chunk and compares it with the stored residual)');
    const sfRej = sum(sfAll.map(x => x.same.filter(y => BC.encodeChunk(BC.decodeChunk(y.alt, 720)) !== y.alt).length));
    say(`    re-encode check on those flipped copies: rejects ${sfRej} of ${sfN}`);
    say(`~   importBiochain engrams off: median ${f1(median(impMs))} ms; engrams on: median ${f1(median(verbs.map(s => s.importOn.ms)))} ms (workers)`);
    say('');

    // ------------------------------------------------------------------ 11. extrapolation, and the codec part of L11
    say('12. The codec part of L11\'s hardened verification, per verb shard (3 timed runs, the first discarded): parity, decode, crystal re-check, leaves and root, weaves and chainId, the exact weave');
    const parts = { parse: [], decode: [], crystal: [], leaves: [], weave: [], exact: [] }, reenc = [];
    let reencOk = 0;
    let hardOk = 0;
    for (const s of verbs) {
        const runs = [];
        let ok = true;
        for (let rep = 0; rep < 3; rep++) {
            const r = {};
            let tv = now(); const fr = BC.parseBiochainStream(s.off.stream); ok = ok && fr.every(f => f.parityOk); r.parse = msSince(tv);
            tv = now(); const ch = fr.map(f => BC.decodeChunk(f.residual, f.chunkLen)); r.decode = msSince(tv);
            tv = now(); ok = ok && ch.every((c, i) => BC.crystallizeBytes(c) === fr[i].packet); r.crystal = msSince(tv);
            tv = now(); const lv = ch.map((c, i) => sha256Orb(i + '|' + sha256Orb(String.fromCharCode(...c)))); const rt = merkleShdccp2(lv, sha256Orb);
            ok = ok && lv.every((h, i) => h === s.off.leafHashes[i]) && rt === s.off.merkleRoot; r.leaves = msSince(tv);
            tv = now(); const [wf, wm] = weaves(ch); ok = ok && BC.quatHex(wf) === s.off.weaveChiral && BC.quatHex(wm) === s.off.weaveMirror && 'BC-' + sha256Orb(rt + '|' + BC.quatHex(wf)).slice(0, 24) === s.off.chainId; r.weave = msSince(tv);
            tv = now(); const q = EC.chainQuaternion(lv.map(h => BigInt('0x' + h.slice(0, 16)))); ok = ok && EC.qnorm(q) === 5n ** (28n * BigInt(lv.length)); r.exact = msSince(tv);
            runs.push(r);
        }
        if (ok) hardOk++;
        for (const k of Object.keys(parts)) parts[k].push(median(runs.slice(1).map(r => r[k])));
        const fr = BC.parseBiochainStream(s.off.stream), ch = fr.map(f => BC.decodeChunk(f.residual, f.chunkLen)), rr2 = [];
        let same = true;
        for (let rep = 0; rep < 3; rep++) { const tv = now(); same = ch.every((c, i) => BC.encodeChunk(c) === fr[i].residual); rr2.push(msSince(tv)); }
        if (same) reencOk++;
        reenc.push(median(rr2.slice(1)));
    }
    const perShard = verbs.map((_, i) => sum(Object.keys(parts).map(k => parts[k][i])));
    say(`  every check passes on ${hardOk}/${verbs.length} verb shards`);
    say(`~   median ms per shard: parse+parity ${f1(median(parts.parse))}, decode ${f1(median(parts.decode))}, crystal re-check ${f1(median(parts.crystal))}, leaves+root ${f1(median(parts.leaves))} (orbital_core), weaves+chainId ${f1(median(parts.weave))}, exact weave ${f1(median(parts.exact))}; total ${f1(median(perShard))} (range ${f1(Math.min(...perShard))}-${f1(Math.max(...perShard))})`);
    say(`  beyond L11's list: re-encoding each decoded chunk gives the stored residual on ${reencOk}/${verbs.length} verb shards (the check that closes residual aliasing)`);
    say(`~   re-encode check: median ${f1(median(reenc))} ms per shard more`);
    say('  not included (measured elsewhere or later): the V0 id stream and addrTableRoot, the LPREP/1 commitment, the ECDSA attestation (S7)');
    say('');
    say('13. Extrapolation to BabyLM (from the full gloss shards above; the text differs, so value and times are indicative)');
    const fill = totBytes / F.length, hexPerByte = totHex / totBytes, jsonPerByteOff = jsonOff / totBytes;
    const mEnc = med('encode'), mDec = med('decode'), mEng = msEngVerbatim, mEngF = med('engram'), mGrow = med('encode') + med('crystal') + med('hash') + med('weave'), mVer = median(perShard);
    for (const [label, bytes] of [['strict-small, 55 MB', 55e6], ['strict-small, 60 MB', 60e6], ['strict, 550 MB', 550e6], ['strict, 600 MB', 600e6]]) {
        const n = Math.ceil(bytes / fill), inc = Math.ceil(Math.log2(n));
        say(`  ${label}: ${group(n)} shards at ${f1(fill)} B; stream hex ${f1(bytes * hexPerByte / 1e6)} MB; records (JSON, engrams off) ${f1(bytes * jsonPerByteOff / 1e6)} MB; manifest inclusion proofs <= ${inc} hashes (${inc * 32} B)`);
        say(`~   ${label}: encode ${f1(n * mEnc / 1000)} s, whole sync grow ${f1(n * mGrow / 1000)} s, decode ${f1(n * mDec / 1000)} s, codec verification ${f1(n * mVer / 1000)} s, engram layer verbatim ${f1(n * mEng / 3.6e6)} h / engram_core ${f1(n * mEngF / 1000)} s (single thread)`);
    }
    say('');

    // ------------------------------------------------------------------ SETTLES
    say('SETTLES:');
    say(`- D8 and L8(a) for JS: the spike-only synchronous grower (biochain_v1.js + orbital_core sha256) gives Owl's growBiochain record field for field on ${recTotal - mismatchTotal}/${recTotal} records (${real.length} gloss shards and ${N_SYNTH_GROWN} synthetic, engrams on and off); Owl's verifyIntegrity accepts every engrams-off record.`);
    say(`- Cost table, WordNet glosses, per full 60 KB shard: 84 chunks, ${f4(hexPerByte)} stream hex chars per byte, ${f4(8 * totRes / totBytes)} residual bits per byte, value ${f4(median(F.map(s => s.off.value)))} engrams off and ${f4(median(F.map(s => s.on.value)))} on; ${f1(totBytes / engTok)} B per engram token.`);
    say(`~ Cost table times (median per full shard, this container): encode ${f1(mEnc)} ms, decode ${f1(mDec)} ms, whole sync grow ${f1(mGrow)} ms, verbatim engram layer ${f1(mEng)} ms (verb 00, measured alone; engram_core's ${f1(mEngF)} ms).`);
    say(`- 0x80: ${f4(100 * sum(real.map(s => s.n80)) / sum(real.map(s => s.chunks)))}% of gloss chunks (${sum(real.map(s => s.n80))} of ${sum(real.map(s => s.chunks))}) against the analytic ${f4(100 * p80)}%; ${real.filter(s => s.n80).length} of ${real.length} gloss shards have at least one.`);
    say(`- Normalised (BioChain-AI kernel) packets change the stream of ${streamChanged} of ${shards.length} shards and never merkleRoot, the weaves or chainId (${idSame}/${shards.length}); Owl's verifyIntegrity accepts them (${owlNormOk}/${shards.length}).`);
    say(`- L8's Python prediction: a faithful Python port (V8's hypot algorithm, exact toFixed) writes weave strings different from Owl's JS on ${fAny} of 1000 synthetic shards; a naive port (math.hypot, '%.12f') on ${nAny} of 1000 (math.hypot differs from V8's on ${f4(100 * py.synth.hypot[1] / py.synth.hypot[0])}% of calls).`);
    const acc = tampers.filter(([n]) => verdict[n]).map(([n]) => n.replace(/ \(control.*\)$/, '')), rejd = tampers.filter(([n]) => !verdict[n]).map(([n]) => n.replace(/ \(control.*\)$/, ''));
    say(`- The gap: Owl's verifyIntegrity ACCEPTS ${acc.join('; ')}. It rejects ${rejd.join('; ')}.`);
    say(`- RFC 6962: inclusion proofs at most ${rfcMax[0]} hashes (${rfcMax[0] * 32} B) at N = 1,000 and ${rfcMax[1]} (${rfcMax[1] * 32} B) at 10,000; consistency proofs at most ${rfcCMax[0]} and ${rfcCMax[1]} hashes (${rfcCMax[0] * 32} and ${rfcCMax[1] * 32} B); every proof verifies, every wrong one is rejected and both SHA-256s agree: ${rfcAll.every(Boolean)}; CT reference roots reproduced: ${ctOk}/9; RFC 6962's worked proofs reproduced: ${rfcEx}/7.`);
    say(`- The shdccp/2 Merkle rule gives L and L + [last] the same root at K = ${describeK(coll1)} of 1..200 (so at every odd K >= 3: ${oddOk}, at K = 1: ${coll1.includes(1)}); L + [last two] at K = ${describeK(coll2)}; RFC 6962 at ${rfcColl} of 200.`);
    say(`- The exact weave at K = ${K0}: norm = 5^${28 * K0} exactly: ${norm === expect}; components of ${Math.min(...bits)}-${Math.max(...bits)} bits; unfold returns the leaf prefixes in order: ${unfoldOk}; the 7 segment products multiply to it: ${EC.qeq(segProd, Q)}.`);
    say(`- EngramCore.importBiochain accepts every verb shard (${impOff}/${verbs.length} engrams off, ${impOn}/${verbs.length} on) and recreates its text byte for byte; it rejects ${rej}/${verbs.length} copies with one stream byte altered${acceptedAlt.length ? `; the ${acceptedAlt.length} it accepts decode${acceptedAlt.length === 1 ? 's' : ''} to the same bytes` : ''}.`);
    say(`- Residual aliasing: ${f4(100 * sfN / sfT)}% of single-bit flips of a residual (frame 0 of verb 00-03) leave the decode unchanged (${kinds('escape')} in raw-byte rank codes, ${kinds('padding')} in padding, ${kinds('other')} elsewhere), so Owl's checks accept them; a re-encode check rejects ${sfRej} of ${sfN}, at the cost of one encode per shard.`);
    say(`~ L11's expected range: the codec part of the hardened verification takes ${f1(median(perShard))} ms per 60 KB shard (median; ${f1(Math.min(...perShard))}-${f1(Math.max(...perShard))}), so a 1,000-shard corpus needs ~${f1(1000 * median(perShard) / 1000)} s for it single-threaded, before the id stream, commitment and ECDSA terms.`);
    say(`~ total runtime ${f1(msSince(T0) / 1000)} s (worker phase ${f1(msPool / 1000)} s)`);
}

if (isMainThread) main().catch(e => { console.error(e); process.exit(1); });
else workerMain();
