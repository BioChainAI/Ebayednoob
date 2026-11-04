// Engram Mind's Eye: the browser core (Phase 3).
//
// One module that runs the whole engram system in a page or in Node, on the code the other systems already ship:
//   orbital_core.js     (scripts/geometric-build)   the orbital pages' exact core: Fraction, the Einstein tile, SHA-256,
//                                                    the Lemma 15 Merkle chain, the gauge, the readout, the pump
//   hyperbolic_core.js  (Pages/Hyperbolic Oracles)  Hyperbolic PolyStep: the norm-5 tree (P) and the Rng
//   twin3d.js           (with decoder3d.js)          the exact quaternion product and qnormExact of the mirror law
//   fence.js            (Pages/Hyperbolic Oracles)  the 0.7 Claude fence, its ln 2 guard, and the H^3 tree embedding
//   ttmpt_core_v1.js    (this folder)               engram/1, verbatim from Owl Academy
// Nothing here re-implements those. What is new is the engram layer itself, written as a line-by-line twin of the
// Python reference (reference/engram): the packet chain, the 28-letter address, the triple-quad memory word with its
// Form 5 tiles, the zero-point clock and its registers, the coupler, a whole session, the dialogue store, recall and
// the watch layer.
//
// runParity(golden, trace) checks this module against reference/golden/engram_v1.json (claim E1, 613 cases) and
// reference/traces/engram.json (the Python reference's exact values), one line per case. tests/parity-engram.cjs runs
// it in Node; Explainer 5 runs it in the browser.
//
// Load order in a page: orbital_core.js, hyperbolic_core.js, decoder3d.js, twin3d.js, fence.js, ttmpt_core_v1.js,
// engram_core.js.
// In Node: require('./engram_core.js').
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../../scripts/geometric-build/orbital_core.js'), require('../Hyperbolic Oracles/hyperbolic_core.js'),
            require('../Hyperbolic Oracles/decoder3d.js'), require('../Hyperbolic Oracles/twin3d.js'), require('../Hyperbolic Oracles/fence.js'),
            require('./ttmpt_core_v1.js'));
    } else root.EngramCore = factory(root.OrbitalCore, root.HPCore, root.HPDecode3D, root.HPTwin3D, root.HPFence, root.TTMPTv1);
})(typeof self !== 'undefined' ? self : this, function (O, C, D3, T3, Fz, E) {
'use strict';
if (!O || !C || !D3 || !T3 || !Fz || !E) throw new Error('engram_core.js needs orbital_core.js, hyperbolic_core.js, decoder3d.js, twin3d.js, fence.js and ttmpt_core_v1.js first');
const Fr = O.Fraction;
const M32n = 0xFFFFFFFFn;

// ================================================================== engram/1 (reference/engram/ttmpt.py)
// The key itself (mulberry32, encodeToken, crystallize, hamming, chiralKey, computeJ) is ttmpt_core_v1.js, unchanged.
const { crystallize, hamming, chiralKey, computeJ } = E;

function hexLsb(grid) {                      // chiralKey's packing: byte i = cells 8i..8i+7, cell 8i + b at bit b
    let out = '';
    for (let i = 0; i < 8; i++) {
        let byte = 0;
        for (let b = 0; b < 8; b++) byte |= grid[i * 8 + b] << b;
        out += byte.toString(16).padStart(2, '0');
    }
    return out;
}
function jNum(grid) {                         // (cells above the diagonal) - (cells below); J = jNum / 32
    let upper = 0, lower = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        if (c > r) upper += grid[r * 8 + c]; else if (c < r) lower += grid[r * 8 + c];
    }
    return upper - lower;
}
function packGrid64(grid) {                   // the packet body: bit i of the 64-bit word is cell i
    let v = 0n;
    for (let i = 0; i < 64; i++) if (grid[i]) v |= 1n << BigInt(i);
    return v;
}
const gridOf = v => Array.from({ length: 64 }, (_, i) => Number((v >> BigInt(i)) & 1n));
const hex64 = v => v.toString(16).toUpperCase().padStart(16, '0');
const hex32 = x => (x >>> 0).toString(16).toUpperCase().padStart(8, '0');
const fold32 = s => ((Number(s & M32n) >>> 0) ^ (Number((s >> 32n) & M32n) >>> 0)) >>> 0;
const rotl32 = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;

// The page's tokenizer (split on anything but letters and digits, upper-case) and biomesh.js's (runs of letters,
// digits and apostrophes, case kept).
const tokenize = text => (text || '').split(/[^A-Za-z0-9]+/).filter(t => t.length > 0).map(t => t.toUpperCase());
const tokenizeBiomesh = text => (text || '').match(/[A-Za-z0-9']+/g) || [];
function engramStream(text) {                 // biomesh.js engramStreamFromText
    const tokens = tokenizeBiomesh(text);
    let stream = '', jsum = 0;
    for (const t of tokens) { const g = crystallize(t); stream += hexLsb(g).toUpperCase(); jsum += computeJ(g); }
    return { stream, count: tokens.length, meanJ: tokens.length ? +(jsum / tokens.length).toFixed(4) : 0 };
}

const CONCEPT_NAMES = ['GEODESIC', 'CURVATURE', 'POINCARE', 'PARALLEL', 'MANIFOLD', 'TRIANGLE', 'INFINITY', 'TILING',
    'VISUALIZE', 'PERCEPTION', 'DIMENSION', 'UNDERSTAND', 'BOUNDARY', 'SADDLE', 'LIGHT'];
const WINDOW_SEEDS = ['MIND', 'EYE', 'STRIX'];
const CODEX_ROOT = 0x53484443;                // "SHDC"

// logPacket and logTokens of Engram_Mind_Eye.html: each token's packet triangulates against the window (alpha, beta,
// gamma) as it stands, then the window shifts so gamma is the new token.
class PacketChain {
    constructor() {
        this.concepts = CONCEPT_NAMES.map(n => crystallize(n));
        [this.alpha, this.beta, this.gamma] = WINDOW_SEEDS.map(w => crystallize(w));
        this.parity = CODEX_ROOT;
        this.packets = [];
    }
    logPacket(token, source) {
        const grid = crystallize(token), seed64 = packGrid64(grid), prev = this.parity;
        const next = (fold32(seed64) ^ rotl32(prev, 1)) >>> 0;
        const da = hamming(grid, this.alpha), db = hamming(grid, this.beta), dg = hamming(grid, this.gamma);
        let idx = 0xFF, best = Infinity;
        this.concepts.forEach((c, i) => { const d = hamming(grid, c); if (d < best) { best = d; idx = i; } });
        const footer = (((da & 0xFF) << 24) | ((db & 0xFF) << 16) | ((dg & 0xFF) << 8) | (idx & 0xFF)) >>> 0;
        const entry = { index: this.packets.length, token, source, seed64, grid, header: hex32(next), footer: hex32(footer),
            tri: [da, db, dg], concept: idx };
        this.parity = next;
        this.packets.push(entry);
        [this.alpha, this.beta, this.gamma] = [this.beta, this.gamma, grid];
        return entry;
    }
    logTokens(text, source) { return tokenize(text).map(t => this.logPacket(t, source)); }
    logTokenList(tokens, source) { return tokens.map(t => this.logPacket(t, source)); }
}

// ================================================================== the address (reference/engram/address.py, claim E2)
// 64 bits -> 28 letters of the norm-5 tree, read in base 5 from the least significant digit; each letter one of the
// five children of the word so far (generators 0-4 at the root). A chain's word is its packets' words in order.
const L = 28;
const ONE_Q = [1n, 0n, 0n, 0n];
const choicesAfter = last => (last === undefined ? [0, 1, 2, 3, 4] : C.P.children([last]));
const lastOf = w => (w.length ? w[w.length - 1] : undefined);
function encode(v, prefix = []) {
    if (typeof v !== 'bigint' || v < 0n || v >= 1n << 64n) throw new RangeError('a packet is 64 bits');
    const out = [];
    let x = v, last = lastOf(prefix);
    for (let s = 0; s < L; s++) { last = choicesAfter(last)[Number(x % 5n)]; out.push(last); x /= 5n; }
    return out;
}
function decode(word, prefix = []) {          // null when a letter is not a child (the word was not built by encode)
    let x = 0n, m = 1n, last = lastOf(prefix);
    for (const g of word) {
        const i = choicesAfter(last).indexOf(g);
        if (i < 0) return null;
        x += BigInt(i) * m; m *= 5n; last = g;
    }
    return x;
}
function chainWord(values) {
    const w = [];
    for (const v of values) for (const g of encode(v, w)) w.push(g);
    return w;
}
const chainQuaternion = values => C.P.wordQuaternion(chainWord(values));
const qnorm = q => q.reduce((s, c) => s + c * c, 0n);
function unfold(q, K) {                        // right division back into K 64-bit values, in order (null if not a chain)
    const word = C.P.rightDivide(q, L * K);
    if (!word || word.length !== L * K) return null;
    const out = [];
    for (let k = 0; k < K; k++) {
        const v = decode(word.slice(k * L, (k + 1) * L), k ? [word[k * L - 1]] : []);
        if (v === null) return null;
        out.push(v);
    }
    return out;
}
function packetQuaternions(values) {           // each packet's address quaternion, encoded after the ones before it
    const out = [], w = [];
    for (const v of values) { const seg = encode(v, w); out.push(C.P.wordQuaternion(seg)); for (const g of seg) w.push(g); }
    return out;
}
const qprod = qs => qs.reduce((p, q) => T3.qmul(p, q), ONE_Q);
const qeq = (a, b) => a.every((c, i) => c === b[i]);

// ================================================================== the memory word (reference/engram/memory.py, E3)
// Four 64-bit cells alpha, beta, gamma, Y = alpha ^ beta ^ gamma; each cell travels as two Einstein tiles of Form 5
// (D3): tile h = 0 the high 32 bits, h = 1 the low; slot 4h + structure. A leaf is the two tile words followed by the
// cell's 16 hex digits, and the Lemma 15 Merkle chain over the four leaves locates an altered cell.
const FORM = 5;
const STRUCT = ['alpha', 'beta', 'gamma', 'Y'];
const zeroPointContext = F => ({ step: (F % 8) || 8, node: F % 30 });
class Word {
    constructor(alpha, beta, gamma, addr = 0, F = 24) {
        this.cells = [alpha, beta, gamma, alpha ^ beta ^ gamma];
        this.addr = addr; this.F = F;
        const ctx = zeroPointContext(F);
        this.step = ctx.step; this.node = ctx.node;
        this.tau0 = this.chain();              // the chain as written
    }
    tiles(j, v = this.cells[j]) {
        return [v >> 32n, v & M32n].map((half, h) => {
            const slot = 4 * h + j;
            return O.packTile({ step: this.step, wheel: O.wheelSector(this.node), struct: j, gate: this.addr % 64,
                mux: O.muxIndex(this.step, this.node, slot), form: FORM, slot, scale: 0, core: Number(half) });
        });
    }
    leaf(j) {
        const [t0, t1] = this.tiles(j);
        return O.concatBytes(O.concatBytes(O.wordBytes(t0), O.wordBytes(t1)), O.utf8(hex64(this.cells[j])));
    }
    chain() { return O.merkleChain([0, 1, 2, 3].map(j => this.leaf(j))).map(t => (t ? O.toHex(t) : '')); }
    root() { return this.chain()[1]; }
    parityOk() { const c = this.cells; return (c[0] ^ c[1] ^ c[2] ^ c[3]) === 0n; }
    locate() {                                 // Lemma 15: the deepest layer that differs is the altered leaf
        const now = this.chain();
        let deepest = 0;
        for (let d = 1; d <= 4; d++) if (now[d] !== this.tau0[d]) deepest = d;
        return deepest ? deepest - 1 : null;
    }
    rebuild(j) { let x = 0n; this.cells.forEach((c, i) => { if (i !== j) x ^= c; }); return x; }
    repair() {                                 // locate, rebuild, keep it only if the root matches the recorded root
        if (this.parityOk() && this.chain()[1] === this.tau0[1]) return ['intact', null];
        const j = this.locate();
        if (j === null) return ['refused', null];
        const before = this.cells[j];
        this.cells[j] = this.rebuild(j);
        if (this.chain()[1] === this.tau0[1]) return ['repaired', j];
        this.cells[j] = before;                // two unknowns, one equation: put it back and refuse
        return ['refused', j];
    }
}
function memoryLink(F, addr, root, prev) {     // the SHA-256 memory word chained at a zero point, 16 hex digits
    return O.toHex(O.sha256(O.utf8(`ENGRAM-MEM/1|${F}|${addr}|${root}|${prev}`))).slice(0, 16);
}

// ================================================================== the zero-point clock (reference/engram/clock.py, E4)
const ON = [18, 10, 2], OFF = [6, 22, 14];   // joint frames of each channel's onload and offload (Zero-Point Tri-Engine)
const SPIN = [1, -1, 1];                      // I and III forward, II backward
const TAUF = new Fr(1n, 450n);                // turns per engaged frame carried by a latched result
const SLOT_FRAMES = [2, 10, 18], SLOT_CHANNELS = [2, 1, 0];   // FIFO slots: gamma at 2, beta at 10, alpha at 18
if (!SLOT_FRAMES.every((f, i) => ON[SLOT_CHANNELS[i]] === f)) throw new Error('slot table');
if (C.ON && (C.ON.join() !== ON.join() || C.OFF.join() !== OFF.join())) throw new Error('clock differs from hyperbolic_core.js');

function schedule(n) {                         // onload, offload and channel of tokens 0 .. n-1
    const out = [];
    for (let t = 0; t < n; t++) {
        const cyc = Math.floor(t / 3), i = t % 3, on = 24 * cyc + SLOT_FRAMES[i], ch = SLOT_CHANNELS[i];
        out.push({ token: t, channel: ch, on, off: on + 12 });
    }
    return out;
}
function place(F) {                            // register, block and group of frame F (frames from 1)
    const r = Math.floor((F - 1) / 720), m = Math.floor(((F - 1) - 720 * r) / 10);
    return [r, m, Math.floor(10 * m / 72)];
}
function zeroPoints(sched) {                   // every F = 24n once three packets have latched, through the last offload + 24
    if (sched.length < 3) return [];
    const last = sched[sched.length - 1].off, out = [];
    for (let F = 24; F <= last + 24; F += 24) {
        const latched = sched.filter(s => s.off <= F).map(s => s.token);
        if (latched.length >= 3) out.push({ F, tokens: latched.slice(-3) });
    }
    return out;
}
const carriedTurns = (s, frames) => TAUF.mul(new Fr(BigInt(SPIN[s] * frames)));
function membraneTurn() {                      // s / 3 of the turns the three latched packets carry to the zero point
    const raw = [0, 1, 2].map(ch => carriedTurns(ch, (24 - OFF[ch]) % 24));
    return raw[0].add(raw[1]).add(raw[2]).div(new Fr(3n));
}
const groupOf = m => Math.floor(10 * m / 72);
function registers(sched, quats) {
    const last = sched.length ? Math.max(...sched.map(s => s.off)) : 0, regs = new Map();
    sched.forEach((s, i) => {
        const [r, m] = place(s.off);
        if (!regs.has(r)) regs.set(r, { r, packets: [], blocks: Array.from({ length: 72 }, () => []) });
        const R = regs.get(r);
        R.packets.push([s.token, quats[i]]);
        R.blocks[m].push(quats[i]);
    });
    return [...regs.keys()].sort((a, b) => a - b).map(r => {
        const R = regs.get(r), blocks = R.blocks.map(qprod);
        const groups = Array.from({ length: 10 }, (_, l) => qprod(blocks.filter((_, m) => groupOf(m) === l)));
        return Object.assign(R, { complete: 720 * (r + 1) <= last, blockQ: blocks, groupQ: groups, packetQ: qprod(R.packets.map(p => p[1])) });
    });
}
function telescopes(R, blocks = R.blockQ) {    // packet, block and group products agree; conj(q) q = N(q)
    const q = R.packetQ, b = qprod(blocks);
    const g = qprod(Array.from({ length: 10 }, (_, l) => qprod(blocks.filter((_, m) => groupOf(m) === l))));
    const comp = qeq(T3.qmul(T3.qconj(q), q), [qnorm(q), 0n, 0n, 0n]);
    return qeq(q, b) && qeq(b, g) && comp;
}
function engagement(sched, r, mode) {          // 'free' engages every frame; 'hold' only while a packet is in flight
    return [0, 1, 2].map(ch => {
        const bits = new Uint8Array(720);
        if (mode === 'free') bits.fill(1);
        else for (const s of sched) if (s.channel === ch) for (let F = s.on + 1; F <= s.off; F++) {
            const i = F - 720 * r - 1;
            if (i >= 0 && i < 720) bits[i] = 1;
        }
        return O.pumpOf(bits);
    });
}

// ================================================================== the coupler (reference/engram/coupler.py, E5)
// q1 <- w q1 and q2 <- q2 conj(w): the binding B = q2 q1 never changes. 'same' (q2 <- q2 w) is the control.
class Coupler {
    constructor(chirality = 'mirror') {
        if (chirality !== 'mirror' && chirality !== 'same') throw new Error('chirality is mirror (the law) or same (the control)');
        this.chirality = chirality;
        this.q = [ONE_Q, ONE_Q];
        this.B0 = this.binding();
        this.issued = [0, 0];
        this.log = [];
    }
    binding() { return T3.qnormExact(T3.qmul(this.q[1], this.q[0])); }
    twist(w, structure) {
        const [q1, q2] = this.q;
        this.q = [T3.qnormExact(T3.qmul(w, q1)), T3.qnormExact(T3.qmul(q2, this.chirality === 'mirror' ? T3.qconj(w) : w))];
        this.issued[structure] += 1;
    }
    check(F) {
        const B = this.binding(), ok = qeq(B, this.B0);
        this.log.push({ F, B, ok });
        return ok;
    }
}

// ================================================================== a session (reference/engram/session.py)
class Session {
    constructor(turns, coupler = null) {      // turns: [[source, [tokens]]]; coupler: null, 'carry' or 'same'
        this.chain = new PacketChain();
        for (const [source, tokens] of turns) this.chain.logTokenList(tokens, source);
        const P = this.chain.packets;
        this.values = P.map(p => p.seed64);
        this.quats = packetQuaternions(this.values);
        this.sched = schedule(P.length);
        this.gauges = P.map(p => O.gaugeExact(...p.tri.map(x => new Fr(BigInt(x)))));
        this.coupler = coupler === null ? null : new Coupler(coupler === 'carry' ? 'mirror' : 'same');
        this.words = []; this.bChecks = [];
        const events = [...this.sched.map(s => ({ kind: 0, F: s.off, x: s.token })), ...zeroPoints(this.sched).map(z => ({ kind: 1, F: z.F, x: z }))]
            .sort((a, b) => a.F - b.F || a.kind - b.kind);          // a latch before a zero point at the same frame
        let prev = '';
        for (const { kind, F, x } of events) {
            if (kind === 0) { if (this.coupler) this.coupler.twist(this.quats[x], P[x].source === 'human' ? 0 : 1); continue; }
            const [a, b, c] = x.tokens.map(t => this.values[t]);
            const w = new Word(a, b, c, this.words.length % 30, F), root = w.root();
            prev = memoryLink(F, w.addr, root, prev);
            this.words.push({ F, addr: w.addr, tokens: x.tokens, cells: w.cells.slice(), root, tiles: [0, 1, 2, 3].map(j => w.tiles(j)), link: prev, word: w });
            if (this.coupler) this.bChecks.push(this.coupler.check(F));
        }
        this.registers = registers(this.sched, this.quats);
    }
    outputs() {                                // everything but the coupler's own state, as strings (claim E5, K2)
        return {
            packets: this.chain.packets.map(p => [p.header, hex64(p.seed64), p.footer]),
            words: this.words.map(w => [w.F, w.addr, w.cells.map(hex64), w.root, w.link]),
            gauges: this.gauges.map(g => [String(g.s), String(g.X), String(g.Yc)]),
            registers: this.registers.map(R => [R.r, R.packetQ.map(String), R.blockQ.map(q => q.map(String)), R.groupQ.map(q => q.map(String))]),
        };
    }
}

// ================================================================== dialogues (reference/engram/dialogue.py)
const store = golden => golden.sets.dialogue.map(e => e.input);
const goldenSession = golden => golden.packet_chain.turns.map(t => [t.source, tokenize(t.text)]);
function synthetic(golden, seed, turns = 30) { // 30 turns, STRIX first; length 3 + below(10), then tokens below(477)
    const rng = new C.Rng(seed), S = store(golden), out = [];
    for (let k = 0; k < turns; k++) {
        const n = 3 + rng.below(10), toks = [];
        for (let i = 0; i < n; i++) toks.push(S[rng.below(S.length)]);
        out.push([k % 2 === 0 ? 'strix' : 'human', toks]);
    }
    return out;
}

// ================================================================== recall (reference/engram/recall.py, E9)
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const isLetter = c => LETTERS.includes(c.toUpperCase());
const key = text => packGrid64(crystallize(text));
function pop32(x) {
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return Math.imul((x + (x >>> 4)) & 0x0F0F0F0F, 0x01010101) >>> 24;
}
const distance = (a, b) => { const x = a ^ b; return pop32(Number(x & M32n)) + pop32(Number(x >> 32n)); };
function nearest(qkey, keys) {
    const ds = keys.map(k => distance(qkey, k)), m = Math.min(...ds);
    return [ds.map((d, i) => (d === m ? i : -1)).filter(i => i >= 0), m];
}
function hit(qkey, keys, target) { const [tied] = nearest(qkey, keys); return tied.includes(target) ? 1 / tied.length : 0; }
function parityVariants(token) {              // five rewritings that keep every letter's count parity, so the key
    if (!token) throw new Error('a stored token is never empty');
    const letters = [...token].filter(isLetter), first = letters.length ? letters[0] : token[0];
    return [token.toLowerCase(), [...token].reverse().join(''), token + '7', token[0] + first + first + token.slice(1), token[0] + '-' + token.slice(1)];
}
const letterCount = token => [...token.toUpperCase()].filter(c => LETTERS.includes(c)).length;
function substitutions(token, seed, n = 5) {   // one letter replaced: position first, then one of the 25 other letters
    const rng = new C.Rng(seed), pos = [...token].map((c, i) => (isLetter(c) ? i : -1)).filter(i => i >= 0), out = [];
    for (let k = 0; k < n; k++) {
        const p = pos[rng.below(pos.length)], others = [...LETTERS].filter(c => c !== token[p].toUpperCase());
        out.push(token.slice(0, p) + others[rng.below(25)] + token.slice(p + 1));
    }
    return out;
}
function shuffled(keys, seed = 7) { return new C.Rng(seed).shuffle(keys.map((_, i) => i)).map(j => keys[j]); }

// ================================================================== the watch layer (reference/engram/watch.py, E7 and E8)
// E7: the fence's own tree dataset (every memory at its recorded address, then k memories d levels too deep). A memory
// is flagged when the fence's verdict is 1 or 2; the exact address check settles it: a memory in place is recorded at
// its own word, a misplaced one at its depth-L ancestor, read from its own word by decodeExact and confirmed exactly.
// E8: 24 memories of the depth-2 tree, one stored distance raised by delta; the guard names the pair it blames most.
let EMB = null;
const emb = () => EMB || (EMB = new D3.TreeEmbedding3D());
const pointEq = (a, b) => a.length === b.length && a.every((x, i) => x.eq(b[i]));
function e7Instance(L, k, d, seed) {
    const [pts, labels] = Fz.generate({ dim: 3, kind: 'tree', L, seed, out: { k, mode: 'deep', depth: d } });
    const res = Fz.fence(pts, 3), words = Fz.treeWords(L), T = emb(), nProper = words.length;
    if (pts.length !== nProper + k) throw new Error('the tree dataset has an unexpected size');
    let flaggedProper = 0, flaggedMisplaced = 0, settleFail = 0;
    const flags = [];
    pts.forEach((p, i) => {
        let recorded;
        if (labels[i] === 0) recorded = words[i];
        else {
            const full = T.decodeExact(p, L + d);
            if (!pointEq(T.pointExact(full), p)) throw new Error('a misplaced memory whose word does not decode exactly');
            recorded = full.slice(0, L);
        }
        if (res.verdict[i] < 1) return;
        const onAddress = pointEq(T.pointExact(recorded), p), misplaced = labels[i] === 1;
        const ok = misplaced ? !onAddress : onAddress;              // a misplaced memory confirmed, a proper one cleared
        if (misplaced) flaggedMisplaced++; else flaggedProper++;
        if (!ok) settleFail++;
        flags.push({ i, misplaced, cleared: onAddress, ok });
    });
    return { L, k, d, seed, nProper, flaggedProper, flaggedMisplaced, detection: flaggedMisplaced / k, settleFail, flags };
}
const depth2Points = () => Fz.generate({ dim: 3, kind: 'tree', L: 2, seed: 0 })[0];
function e8Instance(i, deltas = [0.5, 1.0, 1.5, 3.0], pts = depth2Points()) {
    const idx = new C.Rng(1000 + i).sample(pts.length, 24), D = Fz.distanceMatrix(idx.map(j => pts[j])), clean = Fz.guardCheck(D);
    return { i, cleanWorst: clean.worst, cleanBad: clean.bad, blame: deltas.map(delta => {
        const [Ec, pairs] = Fz.corrupt(D, 1, delta, 2000 + i), g = Fz.guardCheck(Ec), top = g.top.length ? g.top[0][0] : null;
        return { delta, pair: pairs[0], top, bad: g.bad, hit: !!top && top[0] === pairs[0][0] && top[1] === pairs[0][1] };
    }) };
}

// ================================================================== parity with the reference
// Each check is one line: { section, label, ok, detail }. The sections can be run one at a time (a page yields
// between them); runParity runs them all.
const qs = q => q.map(String);
const canon = x => (Array.isArray(x) ? x.map(canon) : x && typeof x === 'object' ? Object.keys(x).sort().map(k => [k, canon(x[k])]) : x);
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));   // key order does not matter (the trace sorts keys)
function paritySections(golden, trace) {
    const ctx = {};
    const getG = () => ctx.g || (ctx.g = new Session(goldenSession(golden), 'carry'));
    const getD = () => ctx.d || (ctx.d = new Session(synthetic(golden, trace.register.dialogue), 'carry'));
    const line = (section, label, ok, detail = '') => ({ section, label, ok: !!ok, detail });
    return [
        { name: 'E1 golden: engram/1 entries', run() {
            const out = [];
            for (const [set, entries] of Object.entries(golden.sets)) for (const e of entries) {
                const g = crystallize(e.input);
                const mine = { hex_lsb: hexLsb(g), seed64: hex64(packGrid64(g)), chiral_key: chiralKey(e.input), j_num: jNum(g), j: computeJ(g), bits: g.reduce((s, x) => s + x, 0) };
                const bad = Object.keys(mine).filter(k => mine[k] !== e[k]);
                out.push(line('E1', `${set} ${JSON.stringify(e.input)}`, !bad.length, bad.length ? 'differs: ' + bad.join(', ') : mine.seed64));
            }
            return out;
        } },
        { name: 'E1 golden: tokenizers, stream, packet chain', run() {
            const out = [];
            golden.tokenizers.forEach((t, i) => {
                out.push(line('E1', `tokenizer mind_eye #${i + 1}`, same(tokenize(t.text), t.mind_eye), `${t.mind_eye.length} tokens`));
                out.push(line('E1', `tokenizer biomesh #${i + 1}`, same(tokenizeBiomesh(t.text), t.biomesh), `${t.biomesh.length} tokens`));
            });
            const s = golden.biomesh_stream, mine = engramStream(s.text);
            out.push(line('E1', 'biomesh engram stream', mine.stream === s.stream && mine.count === s.count && mine.meanJ === s.meanJ, `${mine.count} packets, mean J ${mine.meanJ}`));
            const pc = golden.packet_chain, chain = new PacketChain();
            for (const t of pc.turns) chain.logTokens(t.text, t.source);
            pc.packets.forEach((g, i) => {
                const m = chain.packets[i];
                const ok = m && m.token === g.token && m.header === g.header && hex64(m.seed64) === g.seed64 && m.footer === g.footer &&
                    same(m.tri, [g.tri.alpha, g.tri.beta, g.tri.gamma]) && CONCEPT_NAMES[m.concept] === g.tri.concept;
                out.push(line('E1', `packet ${g.index} ${g.token}`, ok, m ? `${m.header} ${hex64(m.seed64)} ${m.footer}` : 'missing'));
            });
            out.push(line('E1', 'final codex parity', chain.packets.length === pc.packets.length && hex32(chain.parity) === pc.final_parity, hex32(chain.parity)));
            return out;
        } },
        { name: 'Traces: clock constants and addresses', run() {
            const out = [], a = trace.addresses, g = getG();
            out.push(line('meta', 'membrane turn', membraneTurn().toString() === trace.meta.membrane_turn, membraneTurn().toString()));
            out.push(line('meta', 'address length L', L === trace.meta.L, `${L} letters`));
            const vals = g.values.slice(0, a.values.length);
            a.values.forEach((h, i) => out.push(line('address', `value ${i}`, hex64(vals[i]) === h, h)));
            const word = chainWord(vals);
            out.push(line('address', `chain word (${a.word.length} letters)`, same(word, a.word) && C.P.isReduced(word), 'reduced'));
            a.packet_q.forEach((q, i) => out.push(line('address', `packet quaternion ${i}`, same(qs(g.quats[i]), q), `N = 5^${L}`)));
            const cq = chainQuaternion(vals);
            out.push(line('address', 'chain quaternion', same(qs(cq), a.chain_q) && qnorm(cq) === 5n ** BigInt(L * vals.length), `N = 5^${L * vals.length}`));
            const back = unfold(cq, vals.length);
            out.push(line('address', 'right division unfolds the chain', a.unfolds && !!back && back.every((v, i) => v === vals[i]), `${vals.length} packets back`));
            return out;
        } },
        { name: 'Traces: schedule and memory words', run() {
            const out = [], g = getG();
            trace.schedule.forEach((s, i) => out.push(line('schedule', `token ${s.token}`, same(g.sched[i], { token: s.token, channel: s.channel, on: s.on, off: s.off }), `ch ${s.channel}, on ${s.on}, off ${s.off}`)));
            out.push(line('memory', 'word count', g.words.length === trace.words.length, `${g.words.length} words`));
            trace.words.forEach((t, i) => {
                const w = g.words[i];
                const ok = w && w.F === t.F && w.addr === t.addr && same(w.tokens, t.tokens) && same(w.cells.map(hex64), t.cells) &&
                    same(w.tiles.map(tt => tt.map(O.hexWord)), t.tiles) && w.root === t.root && w.link === t.link;
                out.push(line('memory', `word F=${t.F} addr ${t.addr}`, ok, w ? `root ${w.root.slice(0, 12)}…, link ${w.link}` : 'missing'));
            });
            return out;
        } },
        { name: 'Traces: gauges and readout', run() {
            const out = [], g = getG(), mt = membraneTurn(), saved = Object.assign({}, O.state);
            Object.assign(O.state, { tension: 0, torsion: 0, kappa: 1 });
            try {
                trace.gauges.forEach((t, i) => {
                    const p = g.chain.packets[i], gg = g.gauges[i], r = O.readout(p.tri.map(x => new Fr(BigInt(x))), [mt, mt, mt]);
                    const ok = same(p.tri, t.tri) && gg.s.toString() === t.s && gg.X.toString() === t.X && gg.Yc.toString() === t.Y &&
                        same(r.nodes.map(n => n.map(String)), t.nodes) && r.T.lock === t.lock && r.T.S.toString() === t.S && r.T.poly.toString() === t.poly;
                    out.push(line('gauge', `packet ${i} (${t.tri.join(', ')})`, ok, `s ${t.s}, X ${t.X}, Y ${t.Y}${r.T.lock ? ', lock' : ''}`));
                });
            } finally { Object.assign(O.state, saved); }
            return out;
        } },
        { name: 'Traces: register of dialogue ' + trace.register.dialogue, run() {
            const out = [], t = trace.register, d = getD(), R = d.registers.find(x => x.complete);
            out.push(line('register', `first complete register`, !!R && R.r === t.r, R ? `r = ${R.r}, ${R.packets.length} packets` : 'none'));
            if (!R) return out;
            out.push(line('register', 'tokens in offload order', same(R.packets.map(p => p[0]), t.tokens), `${t.tokens.length} tokens`));
            out.push(line('register', 'packet product', same(qs(R.packetQ), t.packet_q), 'ordered product of the packets'));
            const blocks = {};
            R.blockQ.forEach((q, m) => { if (!qeq(q, ONE_Q)) blocks[String(m)] = qs(q); });
            out.push(line('register', `block products (${Object.keys(t.blocks).length} of 72 not 1)`, same(Object.keys(blocks).sort(), Object.keys(t.blocks).sort()) && Object.keys(t.blocks).every(m => same(blocks[m], t.blocks[m])), '720 -> 72'));
            t.group_q.forEach((q, l) => out.push(line('register', `group ${l}`, same(qs(R.groupQ[l]), q), '72 -> 10')));
            out.push(line('register', 'telescopes', telescopes(R) === t.telescopes, 'packet = block = group product, conj(q) q = N(q)'));
            const free = engagement(d.sched, R.r, 'free'), hold = engagement(d.sched, R.r, 'hold');
            ['I', 'II', 'III'].forEach((n, ch) => {
                out.push(line('register', `pump ${n}, free-run`, same(free[ch], t.pump_free[ch]), `P = ${free[ch].P}, closed ${free[ch].closed}`));
                out.push(line('register', `pump ${n}, hold`, same(hold[ch], t.pump_hold[ch]), `P = ${hold[ch].P}, identity ${hold[ch].identity}`));
            });
            return out;
        } },
        { name: 'Traces: coupler', run() {
            const out = [], c = trace.coupler, g = getG(), d = getD();
            c.golden.forEach((e, i) => {
                const m = g.coupler.log[i];
                out.push(line('coupler', `golden zero point F=${e.F}`, m && m.F === e.F && same(qs(m.B), e.B) && m.ok === e.ok, m ? `B = (${qs(m.B).join(', ')})` : 'missing'));
            });
            out.push(line('coupler', 'golden final q1, q2', same(g.coupler.q.map(qs), c.golden_final_q), `${String(g.coupler.q[0][0]).length}-digit components`));
            c.dialogue_9000_first.forEach((e, i) => {
                const m = d.coupler.log[i];
                out.push(line('coupler', `dialogue ${trace.register.dialogue} F=${e.F}`, m && m.F === e.F && m.ok === e.ok, m && m.ok ? 'B unchanged' : 'B moved'));
            });
            return out;
        } },
        { name: 'Traces: watch layer (fence and guard)', run() {
            const out = [], w = trace.watch;
            if (!w) return [line('watch', 'watch section in the trace', false, 'missing: regenerate with run_traces.py')];
            for (const t of w.e7) {
                const m = e7Instance(t.L, t.k, t.d, t.seed);
                const ok = m.nProper === t.n_proper && m.flaggedProper === t.flagged_proper && m.flaggedMisplaced === t.flagged_misplaced &&
                    m.detection === t.detection && m.settleFail === t.settle_fail && same(m.flags, t.flags);
                out.push(line('watch', `E7 depth ${t.L}, ${t.k} misplaced ${t.d} too deep, seed ${t.seed}`, ok,
                    `${m.flaggedMisplaced}/${t.k} found, ${m.flaggedProper} proper flagged and cleared, ${m.settleFail} settled wrong`));
            }
            const pts = depth2Points();
            for (const t of w.e8) {
                const m = e8Instance(t.i, t.blame.map(b => b.delta), pts);
                out.push(line('watch', `E8 instance ${t.i}: clean matrix`, m.cleanWorst === t.clean_worst && m.cleanBad === t.clean_bad, `worst defect ${m.cleanWorst.toFixed(6)} < ln 2`));
                t.blame.forEach((b, j) => {
                    const x = m.blame[j];
                    out.push(line('watch', `E8 instance ${t.i}: +${b.delta}`, same(x.pair, b.pair) && same(x.top, b.top) && x.bad === b.bad && x.hit === b.hit,
                        `${x.bad} quads above ln 2, ${x.hit ? 'blames the corrupted pair' : 'blames another pair'}`));
                });
            }
            return out;
        } },
        { name: 'Traces: recall', run() {
            const S = store(golden), keys = S.map(key);
            return trace.recall.map(r => {
                const k = key(r.query), [near, dmin] = nearest(k, keys);
                const ok = hex64(k) === r.key && same(near, r.nearest) && dmin === r.distance && hit(k, keys, r.store_index) === r.hit;
                return line('recall', `${S[r.store_index]} -> ${JSON.stringify(r.query)}`, ok, `d = ${dmin}, hit ${+hit(k, keys, r.store_index).toFixed(3)}`);
            });
        } },
    ];
}
// The behaviour the Python tests check (reference/tests), with the same seeds: repair and refusal, the controls of
// the address, the registers and the coupler, the pump, the lock. Not from the trace: these are properties.
function behaviourSections(golden) {
    const line = (section, label, ok, detail = '') => ({ section, label, ok: !!ok, detail });
    const rand64 = rng => (BigInt(rng.nextU32()) << 32n) | BigInt(rng.nextU32());
    const syn = {};
    const run = (seed, coupler = null) => { const k = seed + ':' + coupler; return syn[k] || (syn[k] = new Session(synthetic(golden, seed), coupler)); };
    return [
        { name: 'Behaviour: memory words (test_memory.py)', run() {
            const out = [], rng = new C.Rng(2);
            for (let n = 0; n < 4; n++) {
                const w = new Word(rand64(rng), rand64(rng), rand64(rng));
                let ok = true;
                for (let j = 0; j < 4; j++) for (let bit = 0; bit < 64; bit++) {
                    const orig = w.cells[j];
                    w.cells[j] ^= 1n << BigInt(bit);
                    const r = (!w.parityOk() && w.locate() === j && w.rebuild(j) === orig) ? w.repair() : ['no', null];
                    ok = ok && r[0] === 'repaired' && r[1] === j && w.cells[j] === orig && w.root() === w.tau0[1];
                    w.cells[j] = orig;
                }
                out.push(line('memory', `random word ${n + 1}: every single-bit flip located and repaired`, ok, '4 cells x 64 bits'));
            }
            const rng3 = new C.Rng(3);
            for (const samePos of [false, true]) {
                let ok = true;
                for (let n = 0; n < 40; n++) {
                    const w = new Word(rand64(rng3), rand64(rng3), rand64(rng3)), [a, b] = rng3.sample(4, 2), p = rng3.below(64);
                    const q = samePos ? p : (p + 1 + rng3.below(63)) % 64;
                    w.cells[a] ^= 1n << BigInt(p); w.cells[b] ^= 1n << BigInt(q);
                    ok = ok && w.root() !== w.tau0[1] && w.repair()[0] === 'refused' && w.root() !== w.tau0[1];
                }
                out.push(line('memory', `two cells altered${samePos ? ' at the same bit' : ''}: detected and refused`, ok, '40 words'));
            }
            const rng4 = new C.Rng(4), w = new Word(rand64(rng4), rand64(rng4), rand64(rng4));
            w.cells[0] ^= 1n << 9n; w.cells[2] ^= 1n << 9n;
            out.push(line('memory', 'control: parity alone misses a same-position double, the chain does not', w.parityOk() && w.root() !== w.tau0[1], 'bit 9 of alpha and gamma'));
            return out;
        } },
        { name: 'Behaviour: addresses (test_address.py)', run() {
            const out = [], rng = new C.Rng(4), vals = Array.from({ length: 5 }, () => rand64(rng)), w = chainWord(vals);
            const back = C.P.INV[w[w.length - 1]], bad = [back, ...encode(rand64(rng), [back]).slice(0, L - 1)];
            out.push(line('address', 'control A: a packet that backtracks breaks recovery', unfold(C.P.wordQuaternion([...w, ...bad]), 6) === null, 'unfold returns nothing'));
            const rng5 = new C.Rng(5), v6 = Array.from({ length: 6 }, () => rand64(rng5)), sw = v6.slice();
            [sw[1], sw[4]] = [sw[4], sw[1]];
            out.push(line('address', 'control B: swapping two packets changes the chain quaternion', !qeq(chainQuaternion(v6), chainQuaternion(sw)), 'order is kept'));
            return out;
        } },
        { name: 'Behaviour: clock and registers (test_clock.py)', run() {
            const out = [], r0 = run(9000), complete = r0.registers.filter(R => R.complete), R = complete[0];
            out.push(line('register', 'every complete register telescopes (dialogue 9000)', complete.length && complete.every(R => telescopes(R)), `${complete.length} complete`));
            const nz = R.blockQ.map((b, m) => (qeq(b, ONE_Q) ? -1 : m)).filter(m => m >= 0);
            const swapped = R.blockQ.slice(); [swapped[nz[0]], swapped[nz[5]]] = [swapped[nz[5]], swapped[nz[0]]];
            out.push(line('register', 'control: two blocks swapped no longer telescope', !telescopes(R, swapped), `blocks ${nz[0]} and ${nz[5]}`));
            const replaced = R.blockQ.slice(); replaced[nz[3]] = r0.quats[r0.quats.length - 1];
            out.push(line('register', 'control: a block replaced no longer telescopes', !telescopes(R, replaced), `block ${nz[3]}`));
            const r1 = run(9001), regs = r1.registers.filter(R => R.complete);
            const free = regs.every(R => engagement(r1.sched, R.r, 'free').every(p => p.closed && p.identity));
            const hold = regs.every(R => engagement(r1.sched, R.r, 'hold').every(p => p.identity && (R.r === 0 || (p.P === 360 && p.H === 360))));
            out.push(line('register', 'free-run closes every register (dialogue 9001)', regs.length && free, 'P = 0'));
            out.push(line('register', 'hold leaves half a turn (P = H = 360 after register 0)', regs.length && hold, 'the pump identity still holds'));
            out.push(line('register', 'membrane turn', membraneTurn().toString() === '13/675', '13/675 of a turn'));
            return out;
        } },
        { name: 'Behaviour: coupler, gauge and lock (test_coupler_gauge.py)', run() {
            const out = [], g = new Session(goldenSession(golden), 'carry'), d = run(9002, 'carry');
            out.push(line('coupler', 'K1: the binding holds at every zero point', g.bChecks.length && g.bChecks.every(Boolean) && d.bChecks.length && d.bChecks.every(Boolean), `golden ${g.bChecks.length}, dialogue 9002 ${d.bChecks.length}`));
            out.push(line('coupler', 'K2: carry is identical to no coupler (dialogue 9003)', same(run(9003, 'carry').outputs(), run(9003).outputs()), 'packets, words, gauges, registers'));
            const c = run(9004, 'same');
            out.push(line('coupler', 'control: same chirality moves the binding (dialogue 9004)', !c.bChecks.every(Boolean), `${c.bChecks.filter(x => !x).length} of ${c.bChecks.length} checks fail`));
            let rec = true, zero = true;
            for (let a = 0; a <= 64; a += 4) for (let b = 0; b <= 64; b += 4) for (let cc = 0; cc <= 64; cc += 4) {
                const G = O.gaugeExact(new Fr(BigInt(a)), new Fr(BigInt(b)), new Fr(BigInt(cc)));
                rec = rec && G.recovered; zero = zero && ((G.X.isZero() && G.Yc.isZero()) === (a === b && b === cc));
            }
            out.push(line('gauge', 'the gauge recovers every triple; X = Y = 0 only when equal', rec && zero, '17^3 triples'));
            const mt = membraneTurn(), turns = [mt, mt, mt], saved = Object.assign({}, O.state);
            Object.assign(O.state, { tension: 0, torsion: 0, kappa: 1 });
            try {
                let eq = true, ne = true;
                for (let x = 0; x <= 64; x += 9) eq = eq && O.readout([x, x, x].map(v => new Fr(BigInt(v))), turns).T.lock;
                for (const t of [[1, 2, 3], [30, 29, 0], [32, 32, 33], [0, 0, 64]]) ne = ne && !O.readout(t.map(v => new Fr(BigInt(v))), turns).T.lock;
                out.push(line('gauge', 'the readout locks (3 A_R = S^2) exactly when the three distances are equal', eq && ne, '8 equal, 4 unequal'));
            } finally { Object.assign(O.state, saved); }
            return out;
        } },
        { name: 'Behaviour: watch and recall (test_watch_recall.py)', run() {
            const out = [];
            for (const [L, k, d, seed] of [[2, 5, 2, 9000], [3, 5, 1, 9001]]) {
                const r = e7Instance(L, k, d, seed);
                out.push(line('watch', `E7 depth ${L}: every flag settled correctly (seed ${seed})`, r.settleFail === 0 && r.flags.every(f => f.cleared !== f.misplaced), `${r.flags.length} flags`));
            }
            const pts = Fz.generate({ dim: 3, kind: 'tree', L: 2, seed: 0 })[0];
            out.push(line('watch', 'the tree words are the generator\'s points', Fz.treeWords(2).every((w, i) => pointEq(emb().pointExact(w), pts[i])), `${pts.length} memories`));
            const r8 = e8Instance(8000);
            out.push(line('watch', 'E8: a clean matrix stays under ln 2; +3.0 is blamed on its pair (instance 8000)', r8.cleanBad === 0 && r8.cleanWorst <= Math.LN2 + 1e-9 && r8.blame[3].hit, `worst ${r8.cleanWorst.toFixed(6)}`));
            const S = store(golden).slice(0, 60);
            out.push(line('recall', 'E9a: the five parity-keeping variants keep the key', S.every(t => parityVariants(t).every(v => key(v) === key(t))), '60 stored tokens x 5'));
            out.push(line('recall', 'E9b: a one-letter substitution moves the key (seeds 9000 + i)', S.every((t, i) => letterCount(t) < 3 || substitutions(t, 9000 + i).every(v => v !== t && v.length === t.length && key(v) !== key(t))), 'tokens of 3 letters or more'));
            const keys = [0b1010n, 0b1010n, 0b0110n], sh = shuffled([...Array(10).keys()]);
            out.push(line('recall', 'hits split over ties; the shuffle is a permutation', hit(0b1010n, keys, 0) === 0.5 && hit(0b1010n, keys, 2) === 0 && hit(0b0110n, keys, 2) === 1 &&
                same([...sh].sort((a, b) => a - b), [...Array(10).keys()]) && !same(sh, [...Array(10).keys()]), `shuffle ${sh.join(' ')}`));
            return out;
        } },
    ];
}
function runParity(golden, trace) {
    const t0 = Date.now(), lines = [];
    for (const s of paritySections(golden, trace)) lines.push(...s.run());
    const fail = lines.filter(l => !l.ok).length;
    return { lines, pass: lines.length - fail, fail, ms: Date.now() - t0 };
}

return {
    version: 'engram-browser-1',
    // engram/1
    crystallize, hamming, chiralKey, computeJ, hexLsb, jNum, packGrid64, gridOf, hex64, hex32, fold32, rotl32,
    tokenize, tokenizeBiomesh, engramStream, CONCEPT_NAMES, WINDOW_SEEDS, CODEX_ROOT, PacketChain,
    // address
    L, encode, decode, chainWord, chainQuaternion, qnorm, unfold, packetQuaternions, qprod, qeq,
    // memory
    FORM, STRUCT, zeroPointContext, Word, memoryLink,
    // clock
    ON, OFF, SPIN, TAUF, SLOT_FRAMES, SLOT_CHANNELS, schedule, place, zeroPoints, carriedTurns, membraneTurn, registers, telescopes, engagement,
    // coupler, session, dialogues, recall
    Coupler, Session, store, goldenSession, synthetic, LETTERS, key, distance, nearest, hit, parityVariants, letterCount, substitutions, shuffled,
    // watch
    e7Instance, depth2Points, e8Instance,
    // parity
    paritySections, behaviourSections, runParity,
};
});
