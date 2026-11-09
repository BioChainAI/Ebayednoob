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
    logPacket(token, source) { return this.logGrid(crystallize(token), source, token); }
    logGrid(grid, source, token) {             // a packet whose grid is known without its token (a biochain's engram stream)
        const seed64 = packGrid64(grid), prev = this.parity;
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
function unfold(q, K, prefix = []) {           // right division back into K 64-bit values, in order (null if not a chain);
    const word = C.P.rightDivide(q, L * K);       // prefix: the chain before them, for a piece of a longer chain (E4)
    if (!word || word.length !== L * K) return null;
    const out = [];
    for (let k = 0; k < K; k++) {
        const v = decode(word.slice(k * L, (k + 1) * L), k ? [word[k * L - 1]] : prefix);
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

// ================================================================== the page engine (Phase 4)
// Live is a Session that grows one turn at a time, for the pages. Everything it shows equals what Session computes
// on the same turns (tests/page-engine.cjs checks it turn by turn); it only avoids recomputing.
//  * A zero point is final once no future token can latch at or before it: F < the next token's offload frame.
//    Final words, links and coupler checks are kept; the few after them are recomputed on each turn.
//  * A complete register can no longer change, so its products, telescoping, unfolding and pumps are kept.
//  * The coupler normalizes with qnormPow5: every quaternion it holds has a norm that is a power of 5, so the gcd of
//    its components is a power of 5 and dividing out the 5s gives exactly qnormExact's coprime representative.
//    It avoids a Euclid gcd on numbers that grow by about ten digits a packet.
function qnormPow5(q) {
    if (q.every(c => c === 0n)) return [1n, 0n, 0n, 0n];
    while (q.every(c => c % 5n === 0n)) q = q.map(c => c / 5n);
    return q;
}
function bindingPow5(q2, q1) {
    const P = T3.qmul(q2, q1);
    if (P[1] === 0n && P[2] === 0n && P[3] === 0n) return [P[0] > 0n ? 1n : -1n, 0n, 0n, 0n];
    return qnormPow5(P);
}
const offOf = t => 24 * Math.floor(t / 3) + SLOT_FRAMES[t % 3] + 12;
const STRUCT_OF_OFF = { 6: 0, 14: 1, 22: 2 };           // latch order inside the 24 frames before a zero point

// The memory tree in H^2 [DEFINITION]: register -> section (five zero points, 120 frames) -> zero point (its memory
// word) -> the word's three cells. A packet latches in the 24 frames before zero point m = ceil(off / 24), as cell
// alpha, beta or gamma of that word; in register r = floor((m - 1) / 30) the zero point is q = (m - 1) mod 30, in
// section s = floor(q / 5), place c = q mod 5. On the norm-5 tree: s at the root (six), c then the cell among the
// five children. So 6 x 5 zero points per register (its 30 memory words) and 3 of 5 leaves under each.
function positionOf(off) {
    const m = Math.ceil(off / 24), r = Math.floor((m - 1) / 30), q = (m - 1) - 30 * r, s = Math.floor(q / 5), c = q % 5, j = STRUCT_OF_OFF[off % 24];
    const l2 = C.P.children([s])[c], l3 = C.P.children([s, l2])[j];
    return { zeroPoint: 24 * m, r, q, s, c, j, word: [s, l2, l3] };
}

// STRIX's reply (Engram_Mind_Eye.html selectResponse): the concept nearest the whole human text, first on ties;
// reply 0, 1 or 2 by the torsion J of gamma, the window after the human tokens were logged.
function strixReply(lib, text, gamma) {
    const u = crystallize(text), distances = {};
    let best = 0, bd = Infinity;
    lib.concepts.forEach((c, i) => { const d = hamming(u, crystallize(c.name)); distances[c.name] = d; if (d < bd) { bd = d; best = i; } });
    const J = computeJ(gamma), index = J > 0.1 ? 0 : J < -0.1 ? 2 : 1;
    return { concept: lib.concepts[best].name, index, J, distance: bd, distances, response: lib.concepts[best].responses[index] };
}

class Live {
    constructor({ coupler = 'carry' } = {}) {
        if (coupler !== null && coupler !== 'carry' && coupler !== 'same') throw new Error('coupler is null, carry or same');
        this.chain = new PacketChain();
        this.turns = [];
        this.values = []; this.quats = []; this.addresses = []; this.sched = []; this.gauges = [];
        this.chainQ = ONE_Q;
        this.mirror = coupler !== 'same';
        const q0 = coupler === null ? null : [ONE_Q, ONE_Q];
        this.B0 = q0 && bindingPow5(ONE_Q, ONE_Q);
        this.fin = { zi: 24, li: 0, words: [], log: [], prev: '', q: q0, base: 0 };
        this.words = []; this.couplerLog = []; this.couplerQ = q0;
        this.done = new Map();
    }
    get last() { return this.sched.length ? this.sched[this.sched.length - 1].off : 0; }
    addTokens(source, tokens) { return this._add(source, tokens.map(tok => () => this.chain.logPacket(tok, source)), { tokens: tokens.slice() }); }
    addGrids(source, grids, labels = []) {     // packets known by their grids only: labels stand in for the tokens
        const L2 = grids.map((g, k) => (labels[k] === undefined ? '?' : labels[k]));
        return this._add(source, grids.map((g, k) => () => this.chain.logGrid(g, source, L2[k])), { grids: grids.map(g => hexLsb(g).toUpperCase()), labels: L2 });
    }
    _add(source, makers, fields) {
        const first = this.chain.packets.length;
        for (const make of makers) {
            const p = make(), t = p.index;
            const seg = encode(p.seed64, this.addresses.length ? this.addresses[t - 1] : []);
            const q = C.P.wordQuaternion(seg);
            this.values.push(p.seed64); this.addresses.push(seg); this.quats.push(q);
            this.chainQ = T3.qmul(this.chainQ, q);
            const cyc = Math.floor(t / 3), i = t % 3, on = 24 * cyc + SLOT_FRAMES[i];
            this.sched.push({ token: t, channel: SLOT_CHANNELS[i], on, off: on + 12 });
            this.gauges.push(O.gaugeExact(...p.tri.map(x => new Fr(BigInt(x)))));
        }
        this.turns.push(Object.assign({ source, first, count: makers.length }, fields));
        this._advance();
        return this.chain.packets.slice(first);
    }
    addTurn(source, text) { const out = this.addTokens(source, tokenize(text)); this.turns[this.turns.length - 1].text = text; return out; }
    respond(lib, text) {                       // a human turn, then STRIX's reply by retrieval
        const human = this.addTurn('human', text), reply = strixReply(lib, text, this.chain.gamma);
        const strix = this.addTurn('strix', reply.response);
        return { human, reply, strix };
    }
    _twist(q, t) {
        const w = this.quats[t];
        return [qnormPow5(T3.qmul(w, q[0])), qnormPow5(T3.qmul(q[1], this.mirror ? T3.qconj(w) : w))];
    }
    _step(st, F) {                             // the latches up to F, then the word written at the zero point F
        while (st.li < this.sched.length && this.sched[st.li].off <= F) { if (st.q) st.q = this._twist(st.q, st.li); st.li++; }
        if (st.li < 3 || this.sched.length < 3) return;
        const tk = [st.li - 3, st.li - 2, st.li - 1], [a, b, c] = tk.map(t => this.values[t]);
        const w = new Word(a, b, c, (st.base + st.words.length) % 30, F), root = w.root();
        st.prev = memoryLink(F, w.addr, root, st.prev);
        st.words.push({ F, addr: w.addr, tokens: tk, cells: w.cells.slice(), root, tiles: [0, 1, 2, 3].map(j => w.tiles(j)), link: st.prev, word: w });
        if (st.q) { const B = bindingPow5(st.q[1], st.q[0]); st.log.push({ F, B, ok: qeq(B, this.B0) }); }
    }
    _advance() {
        const n = this.sched.length, st = this.fin, offNext = offOf(n);
        while (st.zi < offNext) { this._step(st, st.zi); st.zi += 24; }
        const tail = { zi: st.zi, li: st.li, words: [], log: [], prev: st.prev, q: st.q, base: st.words.length };
        if (n >= 3) for (let F = tail.zi; F <= this.last + 24; F += 24) this._step(tail, F);
        while (tail.li < n) { if (tail.q) tail.q = this._twist(tail.q, tail.li); tail.li++; }
        this.words = st.words.concat(tail.words);
        this.couplerLog = st.log.concat(tail.log);
        this.couplerQ = tail.q;
        this.final = { words: st.words.length, frame: st.zi - 24 };
    }
    get bChecks() { return this.couplerLog.map(e => e.ok); }
    registers() {                              // as clock.registers; complete ones are kept, with their checks
        const n = this.sched.length, last = this.last, out = [];
        for (let t = 0; t < n;) {
            const r = place(this.sched[t].off)[0];
            let u = t;
            while (u < n && place(this.sched[u].off)[0] === r) u++;
            const complete = 720 * (r + 1) <= last;
            let R = complete ? this.done.get(r) : null;
            if (!R) {
                R = { r, packets: [], blocks: Array.from({ length: 72 }, () => []), first: t, count: u - t };
                for (let k = t; k < u; k++) { R.packets.push([k, this.quats[k]]); R.blocks[place(this.sched[k].off)[1]].push(this.quats[k]); }
                const blocks = R.blocks.map(qprod);
                Object.assign(R, { complete, blockQ: blocks, groupQ: Array.from({ length: 10 }, (_, l) => qprod(blocks.filter((_, m) => groupOf(m) === l))),
                    packetQ: qprod(R.packets.map(p => p[1])) });
                if (complete) {
                    const back = unfold(R.packetQ, R.count, t ? this.addresses[t - 1] : []);
                    Object.assign(R, { telescopes: telescopes(R), unfolds: !!back && back.every((v, i) => v === this.values[t + i]),
                        pumpFree: engagement(this.sched, r, 'free'), pumpHold: engagement(this.sched, r, 'hold') });
                    this.done.set(r, R);
                }
            }
            out.push(R);
            t = u;
        }
        return out;
    }
    windowBefore(t) {                          // alpha, beta, gamma as packet t found them
        const g = k => (k >= 0 ? this.chain.packets[k].grid : crystallize(WINDOW_SEEDS[3 + k]));
        return [g(t - 3), g(t - 2), g(t - 1)];
    }
    wordOf(t) {                                // the word written at the zero point packet t latches before (tokens 0, 1: none)
        const F = positionOf(this.sched[t].off).zeroPoint, k = (F - 48) / 24, w = this.words[k];
        return w && w.F === F ? w : null;
    }
    isProvisional(w) { return this.words.indexOf(w) >= this.final.words; }   // a word after the last final zero point
    outputs() {
        const regs = this.registers();
        return {
            packets: this.chain.packets.map(p => [p.header, hex64(p.seed64), p.footer]),
            words: this.words.map(w => [w.F, w.addr, w.cells.map(hex64), w.root, w.link]),
            gauges: this.gauges.map(g => [String(g.s), String(g.X), String(g.Yc)]),
            registers: regs.map(R => [R.r, R.packetQ.map(String), R.blockQ.map(q => q.map(String)), R.groupQ.map(q => q.map(String))]),
        };
    }
}

// ---- exports. v1: byte for byte what Engram_Mind_Eye.html downloads (exportChain, exportSegmented), checked against
// reference/golden/exports_v1.json. v2: everything this system adds, exact.
const MANIFOLD_DEFAULT = { n: 8, k: 3, t: 2 };
const anchorOf = m => 'D' + m.n + 'K' + m.k + 'T' + m.t;
const rootLetter = token => ((token || '').replace(/[^A-Za-z]/g, '')[0] || 'D');
const crystalKey = (grid, root) => 'O1::' + root + '::' + hex64(packGrid64(grid));
function exportV1Chain(packets, parity) {
    const data = packets.map(p => ({
        system_header: { chiral_key: chiralKey(p.token), seed_state: p.grid.map(b => (b ? 1 : 0)),
            topology_constants: { major_R: 35.0, minor_R: 12.0, total_frames: 720, node_count: 72 } },
        packet_meta: { index: p.index, source: p.source, token: p.token, codex_parity_hex: p.header, triangulation_hex: p.footer,
            triangulation: { alpha_hamming: p.tri[0] & 0xff, beta_hamming: p.tri[1] & 0xff, gamma_hamming: p.tri[2] & 0xff,
                nearest_concept_index: p.concept === 255 ? null : p.concept } },
    }));
    return { name: `engram_chain_N${packets.length}_P${hex32(parity)}.json`, text: JSON.stringify(data, null, 2) };
}
function exportV1Crystal(packets, sections, { manifold = MANIFOLD_DEFAULT, generatedAt = new Date().toISOString() } = {}) {
    const N = packets.length;
    if (N === 0) return null;
    const slots = Array.from({ length: sections }, () => ({ seedGrid: null, tokens: [], token_count: 0, source_mix: { human: 0, strix: 0 } }));
    for (let i = 0; i < N; i++) {
        const slot = slots[Math.floor(i * sections / N)], g = packets[i].grid;
        slot.seedGrid = slot.seedGrid ? slot.seedGrid.map((b, k) => b ^ g[k]) : g.slice();
        slot.tokens.push(packets[i].token); slot.token_count++;
        if (packets[i].source === 'human') slot.source_mix.human++; else slot.source_mix.strix++;
    }
    let prev = new Array(64).fill(0);
    for (const slot of slots) { if (slot.seedGrid === null) slot.seedGrid = prev.slice(); prev = slot.seedGrid; }
    let master = crystallize(anchorOf(manifold));
    for (const p of packets) master = master.map((b, i) => b ^ p.grid[i]);
    const masterRoot = rootLetter(packets[0].token), masterKey = crystalKey(master, masterRoot);
    const data = {
        format: 'engram_text_chain', version: 1, sections, generated_at: generatedAt,
        manifold: { n: manifold.n, k: manifold.k, t: manifold.t, anchor: anchorOf(manifold) },
        master_crystal: { seed_state: master.map(b => (b ? 1 : 0)), chiral_key: masterKey },
        system_header: { chiral_key: masterKey, seed_state: master.map(b => (b ? 1 : 0)),
            topology_constants: { major_R: 35.0, minor_R: 12.0, total_frames: 720, node_count: sections } },
        quaternion_chain: slots.map((slot, n_id) => ({
            n_id, t_param: n_id / sections, seed_state: slot.seedGrid.map(b => (b ? 1 : 0)),
            chiral_key: crystalKey(slot.seedGrid, slot.tokens.length ? rootLetter(slot.tokens[0]) : masterRoot),
            token_count: slot.token_count, tokens: slot.tokens, source_mix: slot.source_mix, collisions: [] })),
    };
    return { name: `engram_crystal_S${sections}_N${N}.json`, text: JSON.stringify(data, null, 2) };
}
function exportV2(live, { generatedAt = new Date().toISOString(), manifold = MANIFOLD_DEFAULT } = {}) {
    const P = live.chain.packets, regs = live.registers(), L2 = s => s.map(String);
    const data = {
        format: 'engram_mind_eye', version: 2, key: 'engram/1', generated_at: generatedAt,
        note: 'Engram Mind\'s Eye (Ebayednoob). Quaternions and fractions are decimal strings; 64-bit words are 16 hex digits; an address is 28 letters, each 0-5 for 1+2i, 1-2i, 1+2j, 1-2j, 1+2k, 1-2k.',
        manifold: { n: manifold.n, k: manifold.k, t: manifold.t, anchor: anchorOf(manifold) },
        turns: live.turns.map(t => ({ source: t.source, text: t.text === undefined ? null : t.text, tokens: t.tokens, grids: t.grids, labels: t.labels })),
        window_start: WINDOW_SEEDS, codex_root: hex32(CODEX_ROOT), final_parity: hex32(live.chain.parity),
        clock: { slot_frames: SLOT_FRAMES, slot_channels: SLOT_CHANNELS, onload: ON, offload: OFF, membrane_turn: membraneTurn().toString(), setting: 'free-run + membrane' },
        packets: P.map((p, t) => ({ index: t, token: p.token, source: p.source, header: p.header, seed64: hex64(p.seed64), footer: p.footer,
            tri: p.tri, concept: p.concept === 255 ? null : CONCEPT_NAMES[p.concept], chiral_key: chiralKey(p.token),
            address: live.addresses[t].join(''), quaternion: L2(live.quats[t]), channel: live.sched[t].channel, on: live.sched[t].on, off: live.sched[t].off,
            gauge: { s: String(live.gauges[t].s), X: String(live.gauges[t].X), Y: String(live.gauges[t].Yc) } })),
        chain: { letters: 28 * P.length, norm: `5^${28 * P.length}`, quaternion: L2(live.chainQ) },
        words: live.words.map(w => ({ F: w.F, addr: w.addr, tokens: w.tokens, cells: w.word.cells.map(hex64), root: w.root,
            intact: w.word.chain()[1] === w.word.tau0[1], tiles: w.tiles.map(tt => tt.map(O.hexWord)), link: w.link })),
        registers: regs.map(R => {
            const blocks = {};
            R.blockQ.forEach((q, m) => { if (!qeq(q, ONE_Q)) blocks[String(m)] = L2(q); });
            const out = { r: R.r, complete: R.complete, first: R.first, count: R.count, packet_q: L2(R.packetQ), group_q: R.groupQ.map(L2), block_q: blocks };
            if (R.complete) Object.assign(out, { telescopes: R.telescopes, unfolds: R.unfolds, pump_free: R.pumpFree, pump_hold: R.pumpHold });
            return out;
        }),
        coupler: live.couplerQ ? { law: live.mirror ? 'mirror' : 'same', zero_points: live.couplerLog.length, held: live.couplerLog.filter(e => e.ok).length,
            q: live.couplerQ.map(L2) } : null,
    };
    return { name: `engram_mind_eye_v2_N${P.length}_P${hex32(live.chain.parity)}.json`, text: JSON.stringify(data, null, 1) };
}

// ================================================================== the 3D engine (Phase 5)
// The memory tree of a register in H^3 on Hyperbolic PolyStep's octahedral tree embedding (decoder3d.js, step ln 7),
// the same position words as the 2D page: the register at the root, six sections, thirty zero points (its memory
// words), and each word's three cells. Positions are structural, so every full register has the same layout; what
// differs between packets is their frame, the rotation of their own address quaternion.
const LAYOUT = (() => {
    const out = [{ key: 'r', depth: 0, word: [] }];
    for (let s = 0; s < 6; s++) {
        out.push({ key: `${s}`, depth: 1, s, word: [s] });
        for (let c = 0; c < 5; c++) {
            const l2 = C.P.children([s])[c];
            out.push({ key: `${s},${c}`, depth: 2, s, c, word: [s, l2] });
            for (let j = 0; j < 3; j++) out.push({ key: `${s},${c},${j}`, depth: 3, s, c, j, word: [s, l2, C.P.children([s, l2])[j]] });
        }
    }
    return out;
})();
const EXACT3 = new Map(), FLOAT3 = new Map();
const point3Exact = word => { const k = word.join(','); if (!EXACT3.has(k)) EXACT3.set(k, emb().pointExact(word)); return EXACT3.get(k); };
const point3 = word => { const k = word.join(','); if (!FLOAT3.has(k)) FLOAT3.set(k, emb().point(word)); return FLOAT3.get(k); };

// The memories of register r: the structural nodes, and a cell for each packet that latched in it.
function memoryNodes(live, r) {
    const cells = new Map();
    for (let t = 0; t < live.sched.length; t++) {
        const pos = positionOf(live.sched[t].off);
        if (pos.r === r) cells.set(`${pos.s},${pos.c},${pos.j}`, t);
    }
    return LAYOUT.filter(n => n.depth < 3 || cells.has(n.key)).map(n => (n.depth === 3 ? Object.assign({ t: cells.get(n.key) }, n) : Object.assign({}, n)));
}
// A memory moved d levels deeper than its record says (E7's misplacement): d more letters below its word, drawn
// from the shared generator with the given seed.
function misplace(word, d = 2, seed = 0) {
    const rng = new C.Rng(seed), w = word.slice();
    for (let k = 0; k < d; k++) { const ch = C.P.children(w); w.push(ch[rng.below(ch.length)]); }
    return w.slice(word.length);
}
// The watch layer on a memory (E7): the fence screens the exact points; every flag is settled by comparing the point
// with the point of the recorded word, exactly. `moved` maps a node key to the extra letters of a misplaced memory.
function watchMemory(nodes, moved = new Map()) {
    const pts = nodes.map(n => point3Exact(moved.has(n.key) ? n.word.concat(moved.get(n.key)) : n.word));
    const res = Fz.fence(pts, 3), T = emb(), flags = [];
    nodes.forEach((n, i) => {
        if (res.verdict[i] < 1) return;
        const misplaced = moved.has(n.key), onRecord = pointEq(T.pointExact(n.word), pts[i]);
        let found = null;
        if (misplaced) { const full = T.decodeExact(pts[i], n.word.length + moved.get(n.key).length); found = { word: full, under: full.slice(0, n.word.length).join() === n.word.join() }; }
        flags.push({ i, key: n.key, depth: n.depth, misplaced, cleared: onRecord, ok: misplaced ? !onRecord : onRecord, verdict: res.verdict[i], found });
    });
    const missed = nodes.filter((n, i) => moved.has(n.key) && res.verdict[i] < 1).map(n => n.key);
    return { res, flags, missed, centre: Fz.centrePoint(res), shells: { d1: res.d1, d3: res.d3, rF: res.rF, rG: res.rG }, settleFail: flags.filter(f => !f.ok).length, pts };
}
// The guard on the stored distances between the register, its sections and its zero points (37 memories, E8).
function guardMemory(nodes, corrupt = null) {
    const ix = nodes.map((n, i) => (n.depth <= 2 ? i : -1)).filter(i => i >= 0);
    const D = Fz.distanceMatrix(ix.map(i => point3Exact(nodes[i].word)));
    const clean = Fz.guardCheck(D);
    const out = { ix, clean: { worst: clean.worst, bad: clean.bad } };
    if (corrupt) {
        const [E, pairs] = Fz.corrupt(D, 1, corrupt.delta, corrupt.seed), g = Fz.guardCheck(E), top = g.top.length ? g.top[0][0] : null;
        const m = guardsOf(E), named = aloneOf(m.matching);
        Object.assign(out, { pair: pairs[0], top, bad: g.bad, hit: !!top && top[0] === pairs[0][0] && top[1] === pairs[0][1], keys: pairs[0].map(k => nodes[ix[k]].key), topKeys: top && top.map(k => nodes[ix[k]].key),
            matching: { named: named && named.map(k => nodes[ix[k]].key), hit: !!named && named[0] === pairs[0][0] && named[1] === pairs[0][1], top: m.matching.slice(0, 2).map(([p, n]) => [p.map(k => nodes[ix[k]].key), n]) } });
    }
    return out;
}
// The sharper guard of E10 (reference/engram/guard.py): every quadruple above ln 2 counts all six of its pairs (the
// guard of fence.js), or only the two pairs of its largest matching sum (the matching guard), or of its smallest
// (the control). Same floating-point operations as fence.js's defect.
function guardsOf(D, tol = 1e-9) {
    const N = D.length, orig = new Map(), mat = new Map(), small = new Map(), bump = (m, a, b) => { const k = a * N + b; m.set(k, (m.get(k) || 0) + 1); };
    let bad = 0, worst = -1;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) for (let k = j + 1; k < N; k++) for (let l = k + 1; l < N; l++) {
        const v = Fz.defect(D, i, j, k, l);
        if (v > worst) worst = v;
        if (v <= Fz.LN2 + tol) continue;
        bad++;
        for (const [a, b] of [[i, j], [i, k], [i, l], [j, k], [j, l], [k, l]]) bump(orig, a, b);
        const m = [[i, j, k, l, D[i][j] + D[k][l]], [i, k, j, l, D[i][k] + D[j][l]], [i, l, j, k, D[i][l] + D[j][k]]];
        let mx = 0, mn = 0;
        for (let t = 1; t < 3; t++) { if (m[t][4] > m[mx][4]) mx = t; if (m[t][4] < m[mn][4]) mn = t; }
        bump(mat, m[mx][0], m[mx][1]); bump(mat, m[mx][2], m[mx][3]); bump(small, m[mn][0], m[mn][1]); bump(small, m[mn][2], m[mn][3]);
    }
    const top = c => [...c.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0]).slice(0, 6).map(([k, n]) => [[Math.floor(k / N), k % N], n]);
    return { bad, worst, original: top(orig), matching: top(mat), smallest: top(small) };
}
const aloneOf = top => (top.length && (top.length === 1 || top[0][1] > top[1][1]) ? top[0][0] : null);
// Frames: a float unit quaternion from an exact one whose coprime integers may be far beyond 2^53, and its rotation.
function floatQ(q) {
    const bits = Math.max(...q.map(c => (c < 0n ? -c : c).toString(2).length)), sh = BigInt(Math.max(0, bits - 52));
    return T3.qnormFloat(q.map(c => Number(c >> sh)));
}
const frameOf = q => T3.rotOfQuat(floatQ(q));
// The two structures' frames after each latch, in floats for drawing (the binding is checked exactly by Live).
function twinFrames(live, mirror = true) {
    const fm = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
        a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
    let q1 = [1, 0, 0, 0], q2 = [1, 0, 0, 0];
    return live.quats.map(w => {
        const f = floatQ(w), c = [f[0], -f[1], -f[2], -f[3]];
        q1 = T3.qnormFloat(fm(f, q1)); q2 = T3.qnormFloat(fm(q2, mirror ? c : f));
        return [q1, q2];
    });
}
// The breath of Owl Academy's Synchronization Pump, timed by the register: 1 + sin(pi t) amp over its 720 frames.
const breathOf = (F, amp = 0.5, cycle = 720) => 1 + Math.sin(Math.PI * (((Math.max(1, F) - 1) % cycle) / cycle)) * amp;

// ---- LATTICE-SEED/1 import (lattice_seed_v1.js, Owl Academy's codec and hash, verbatim)
function importLatticeSeed(LS, input) {
    const s = typeof input === 'string' ? JSON.parse(input) : input;
    if (s && s.kind === 'ENVIRONMENT/1') throw new Error('an ENVIRONMENT/1 object: read it with importEnvironment, which checks its boundary seed with this');
    if (!s || s.v !== 1 || !Array.isArray(s.nodes)) throw new Error('not a LATTICE-SEED/1 object (v 1 with nodes)');
    const recomputed = LS.collectHashOf(s), hashOk = s.hash ? recomputed === s.hash : null;
    const nodes = s.nodes.slice().sort((a, b) => a.i - b.i).map((n, k) => {
        const u = LS.unpackWord(n.w), value = BigInt('0x' + n.w), address = encode(value);
        return Object.assign({ i: n.i, k, w: n.w, raw: !!n.r, value, address, quat: C.P.wordQuaternion(address) }, u);
    });
    const byI = new Map(nodes.map(n => [n.i, n]));
    const chains = (s.chains || []).map(c => {
        const vals = c.map(i => byI.get(i)).filter(Boolean).map(n => n.value), q = chainQuaternion(vals), back = unfold(q, vals.length);
        return { nodes: c.slice(), length: vals.length, missing: c.length - vals.length, quaternion: q, letters: L * vals.length, unfolds: !!back && back.every((v, k) => v === vals[k]) };
    });
    return { seed: s, recomputed, hashOk, nodes, chains, parityBad: nodes.filter(n => !n.parityOk).length };
}
// A seed's k-th node (by index) laid out like a register's k-th cell, 90 to a page.
function seedPosition(k) {
    const page = Math.floor(k / 90), j = k % 3, q = Math.floor(k / 3) % 30, s = Math.floor(q / 5), c = q % 5;
    const key = `${s},${c},${j}`;
    return { page, s, c, j, key, word: LAYOUT.find(n => n.key === key).word };
}
function seedNodes(imp, page) {
    const cells = new Map();
    imp.nodes.forEach(n => { const p = seedPosition(n.k); if (p.page === page) cells.set(p.key, n.k); });
    return LAYOUT.filter(n => n.depth < 3 || cells.has(n.key)).map(n => (n.depth === 3 ? Object.assign({ k: cells.get(n.key) }, n) : Object.assign({}, n)));
}

// ================================================================== the bridges (Phase 6)
// Owl Academy in and out. Each importer checks what it reads by recomputing it, and returns
//   { kind, label, checks: [{ ok, label, detail }], verified, turns, ... }
// where turns ({ source, text } | { source, tokens } | { source, grids, labels }) rebuild the session with Live.
// Pinned against Owl Academy's own code by reference/golden/bridges_v1.json (tests/bridges.cjs).
const check = (ok, label, detail = '') => ({ ok: ok === null ? null : !!ok, label, detail });
const sha256Hex = str => O.toHex(O.sha256(O.utf8(String(str))));           // seal-crypto.js: SHA-256 over UTF-8, hex
function gridFromHex(hex) {                    // the inverse of hexLsb: byte i holds cells 8i..8i+7, cell 8i + b at bit b
    const g = new Array(64);
    for (let i = 0; i < 8; i++) { const byte = parseInt(hex.slice(2 * i, 2 * i + 2), 16); for (let b = 0; b < 8; b++) g[8 * i + b] = (byte >> b) & 1; }
    return g;
}
function runsOf(items) {                       // consecutive items of one source become one turn
    const out = [];
    for (const [source, token] of items) {
        if (!out.length || out[out.length - 1].source !== source) out.push({ source, tokens: [] });
        out[out.length - 1].tokens.push(token);
    }
    return out;
}
function liveOf(turns, coupler = 'carry') {
    const L2 = new Live({ coupler });
    for (const t of turns) {
        if (t.grids) L2.addGrids(t.source, t.grids.map(gridFromHex), t.labels);
        else if (typeof t.text === 'string') L2.addTurn(t.source, t.text);
        else L2.addTokens(t.source, t.tokens);
    }
    return L2;
}
// A stored session replayed: a STRIX turn that is the library's reply to the human turn before it is replayed as
// that reply, so the page can say which concept and J chose it. replies[i] is that reply for turn i, or null.
function replayTurns(lib, turns, coupler = 'carry') {
    const live = new Live({ coupler }), replies = [];
    for (let i = 0; i < turns.length; i++) {
        const t = turns[i], nx = turns[i + 1];
        if (lib && t.source === 'human' && typeof t.text === 'string' && nx && nx.source === 'strix' && typeof nx.text === 'string') {
            live.addTurn('human', t.text); replies.push(null);
            const r = strixReply(lib, t.text, live.chain.gamma);
            live.addTurn('strix', nx.text); replies.push(r.response === nx.text ? r : null);
            i++; continue;
        }
        if (t.grids) live.addGrids(t.source, t.grids.map(gridFromHex), t.labels);
        else if (typeof t.text === 'string') live.addTurn(t.source, t.text);
        else live.addTokens(t.source, t.tokens);
        replies.push(null);
    }
    return { live, replies };
}
const turnsOf = live => live.turns.map(t => (t.grids ? { source: t.source, grids: t.grids, labels: t.labels } : typeof t.text === 'string' ? { source: t.source, text: t.text } : { source: t.source, tokens: t.tokens }));

// ---- out: the session as Owl Academy's Engram Mind Eye saves it (saveEngram), so it restores there
function exportOwlSession(live, { manifold = MANIFOLD_DEFAULT } = {}) {
    const state = {
        manifold: { n: manifold.n, k: manifold.k, t: manifold.t },
        codexParity: live.chain.parity,
        biochain: [],
        packets: live.chain.packets.map(p => ({
            index: p.index, token: p.token, source: p.source,
            seed64: hex64(p.seed64), header: p.header, footer: p.footer,
            parityOk: true, gridArray: p.grid.map(b => (b ? 1 : 0)),
            triAlpha: p.tri[0] & 0xff, triBeta: p.tri[1] & 0xff, triGamma: p.tri[2] & 0xff,
            triConceptIdx: p.concept & 0xff, chiralKeyStr: chiralKey(p.token),
            tri: { a: p.tri[0], b: p.tri[1], g: p.tri[2], conceptIdx: p.concept },
        })),
        conversation: live.turns.map(t => ({ role: t.source, text: typeof t.text === 'string' ? t.text : (t.tokens || t.labels).join(' ') })),
    };
    return { name: 'engram_mind_eye_v1.json', text: JSON.stringify(state) };
}
// The greeting Owl Academy's page types when it restores a session (no epochs are ever grown there)
const owlGreeting = (packetCount, epochCount = 0) => `The engram persists. ${packetCount} tokens crystallized across ${epochCount} epoch${epochCount !== 1 ? 's' : ''}. We continue.`;

// ---- what an import is
function detectImport(text) {
    const t = String(text || '').trim();
    if (!t) throw new Error('nothing to import');
    if (/^[0-9A-Fa-f\s]+$/.test(t) && t.replace(/\s+/g, '').length % 16 === 0) return { kind: 'engram_stream', obj: t.replace(/\s+/g, '') };
    let o;
    try { o = JSON.parse(t); } catch (e) { throw new Error('not JSON and not an engram stream: ' + e.message); }
    if (Array.isArray(o) && o.length && o[0] && o[0].packet_meta && o[0].system_header) return { kind: 'engram_chain', obj: o };
    if (o && o.format === 'engram_text_chain') return { kind: 'engram_text_chain', obj: o };
    if (o && o.format === 'engram_mind_eye' && o.version === 2) return { kind: 'engram_mind_eye_v2', obj: o };
    if (o && Array.isArray(o.packets) && 'codexParity' in o) return { kind: 'owl_session', obj: o };
    if (o && o.kind === 'ENVIRONMENT/1') return { kind: 'environment', obj: o };
    if (o && o.v === 1 && Array.isArray(o.nodes)) return { kind: 'lattice_seed', obj: o };
    if (o && typeof o.stream === 'string' && (o.chainId || o.leafHashes)) return { kind: 'biochain', obj: o };
    if (o && typeof o.engramStream === 'string') return { kind: 'engram_stream', obj: o };
    throw new Error('not a format these bridges read');
}
function compareChain(live, entries, label) {  // the first packet that differs, if any
    for (let k = 0; k < Math.max(live.chain.packets.length, entries.length); k++) {
        const p = live.chain.packets[k], e = entries[k];
        if (!p || !e) return check(false, label, `${live.chain.packets.length} packets rebuilt, ${entries.length} in the file`);
        const bad = e(p);
        if (bad) return check(false, label, `packet ${k} (${p.token}): ${bad}`);
    }
    return check(true, label, `${entries.length} packets`);
}

// ---- in: Owl Academy's saved session (localStorage engram_mind_eye_v1)
function importOwlSession(o) {
    const checks = [], P = o.packets;
    const same = q => p => {
        const t = q.tri || {};
        return p.token !== q.token ? 'token' : p.source !== q.source ? 'source' : hex64(p.seed64) !== q.seed64 ? 'body' : p.header !== q.header ? 'header' : p.footer !== q.footer ? 'footer' :
            (q.gridArray && q.gridArray.join('') !== p.grid.join('')) ? 'grid' : (t.a !== p.tri[0] || t.b !== p.tri[1] || t.g !== p.tri[2]) ? 'triangulation' :
            (q.chiralKeyStr !== undefined && q.chiralKeyStr !== chiralKey(p.token)) ? 'chiral key' : '';
    };
    let turns = (o.conversation || []).filter(c => c && typeof c.text === 'string').map(c => ({ source: c.role, text: c.text }));
    let live = liveOf(turns), c = compareChain(live, P.map(same), 'the conversation rebuilds every packet: token, body, header, footer, grid, triangulation, chiral key');
    if (!c.ok) {
        checks.push(check(null, 'the conversation does not rebuild the packets', c.detail + '; rebuilding from the packets\' own tokens instead'));
        turns = runsOf(P.map(q => [q.source, q.token]));
        live = liveOf(turns);
        c = compareChain(live, P.map(same), 'the packets\' tokens rebuild every packet');
    }
    checks.push(c);
    checks.push(check((live.chain.parity >>> 0) === (o.codexParity >>> 0), 'the final codex parity matches', hex32(o.codexParity >>> 0)));
    if (o.manifold) checks.push(check(null, 'manifold', `N ${o.manifold.n} · K ${o.manifold.k} · T ${o.manifold.t}`));
    return { kind: 'owl_session', label: 'an Engram Mind Eye session (engram_mind_eye_v1)', checks, verified: checks.every(x => x.ok !== false), turns, manifold: o.manifold || null };
}
// ---- in: a v1 chain export (exportChain)
function importV1Chain(arr, text) {
    const turns = runsOf(arr.map(e => [e.packet_meta.source, e.packet_meta.token])), live = liveOf(turns), checks = [];
    checks.push(compareChain(live, arr.map(e => p => {
        const m = e.packet_meta, t = m.triangulation;
        return m.codex_parity_hex !== p.header ? 'header' : m.triangulation_hex !== p.footer ? 'footer' : e.system_header.seed_state.join('') !== p.grid.join('') ? 'seed state' :
            e.system_header.chiral_key !== chiralKey(p.token) ? 'chiral key' : (t.alpha_hamming !== p.tri[0] || t.beta_hamming !== p.tri[1] || t.gamma_hamming !== p.tri[2]) ? 'triangulation' :
            t.nearest_concept_index !== (p.concept === 255 ? null : p.concept) ? 'concept' : '';
    }), 'every packet rebuilt from its token: header, footer, seed state, chiral key, triangulation'));
    if (typeof text === 'string') checks.push(check(exportV1Chain(live.chain.packets, live.chain.parity).text === text.trim() ? true : null, 'exported again, byte for byte the same file', 'as Owl Academy writes it'));
    return { kind: 'engram_chain', label: 'a v1 chain export (engram_chain)', checks, verified: checks.every(x => x.ok !== false), turns };
}
// ---- in: a v1 text crystal (exportSegmented, 72 or 720 sections)
function importV1Crystal(o, text) {
    const slots = o.quaternion_chain || [], items = [];
    let unknown = 0;
    for (const s of slots) {
        const mix = s.source_mix || {}, src = mix.human === s.token_count ? 'human' : mix.strix === s.token_count ? 'strix' : 'unknown';
        if (src === 'unknown') unknown += s.token_count;
        for (const tok of s.tokens) items.push([src, tok]);
    }
    const turns = runsOf(items), live = liveOf(turns), checks = [];
    checks.push(check(slots.length === o.sections && slots.every((s, i) => s.n_id === i && s.token_count === s.tokens.length), `${o.sections} sections, ${items.length} tokens`, 'in order'));
    const again = exportV1Crystal(live.chain.packets, o.sections, { manifold: o.manifold, generatedAt: o.generated_at });
    const d = JSON.parse(again.text);
    d.quaternion_chain.forEach((s, i) => { s.source_mix = slots[i].source_mix; });
    const rebuilt = JSON.stringify(d, null, 2), exact = typeof text === 'string' && rebuilt === text.trim();
    checks.push(check(typeof text === 'string' ? exact : JSON.stringify(d) === JSON.stringify(o), 'every slot\'s crystal and chiral key, the master crystal on its manifold anchor, rebuilt from the tokens',
        exact ? 'byte for byte the same file' : 'field for field'));
    checks.push(check(unknown ? null : true, unknown ? `${unknown} of ${items.length} tokens share a section with the other speaker: who said them is not in the file` : 'every token\'s speaker is in the file', unknown ? 'marked unknown; their packets do not depend on it' : ''));
    return { kind: 'engram_text_chain', label: `a v1 text crystal in ${o.sections} sections (engram_text_chain)`, checks, verified: checks.every(x => x.ok !== false), turns, manifold: o.manifold };
}
// ---- in: a biochain record (biomesh.js growBiochain), checked as verifyIntegrity checks it
function verifyBiochain(BC, chain) {
    const reasons = [];
    try {
        let frames;
        if (typeof chain.stream === 'string') frames = BC.parseBiochainStream(chain.stream);
        else if (Array.isArray(chain.streams)) frames = chain.streams.map((residual, i) => ({ residual, chunkLen: chain.chunkLens[i], parityOk: true }));
        else throw new Error('no stream data on record');
        const out = [];
        for (let i = 0; i < frames.length; i++) {
            if (frames[i].parityOk === false) { reasons.push(`packet ${i} parity failed`); return { ok: false, reasons }; }
            out.push(BC.decodeChunk(frames[i].residual, frames[i].chunkLen));
        }
        const leaves = [];
        for (let i = 0; i < out.length; i++) {
            const h = sha256Hex(i + '|' + sha256Hex(String.fromCharCode(...out[i])));
            if (chain.leafHashes && h !== chain.leafHashes[i]) { reasons.push(`leaf ${i} mismatch`); return { ok: false, reasons }; }
            leaves.push(h);
        }
        let root = leaves.slice();
        if (!root.length) root = [sha256Hex('empty')];
        while (root.length > 1) {
            if (root.length & 1) root.push(root[root.length - 1]);
            const next = [];
            for (let i = 0; i < root.length; i += 2) next.push(sha256Hex(root[i] + root[i + 1]));
            root = next;
        }
        if (chain.merkleRoot && root[0] !== chain.merkleRoot) { reasons.push('merkle root mismatch'); return { ok: false, reasons }; }
        let wf = [1, 0, 0, 0];
        for (const c of out) wf = BC.qn(BC.qmul(BC.crystalQuat(c), wf));
        if (BC.quatHex(wf) !== chain.weaveChiral) { reasons.push('chiral weave mismatch'); return { ok: false, reasons }; }
        const text = new TextDecoder().decode(new Uint8Array(out.flat()));
        let engNote = '';
        if (typeof chain.engramStream === 'string') {
            const eng = BC.engramStreamFromText(text);
            if (eng.stream !== chain.engramStream) { reasons.push('engram stream mismatch'); return { ok: false, reasons }; }
            engNote = ` + ${eng.count} token engrams`;
        }
        reasons.push(`recreated ${out.reduce((a, c) => a + c.length, 0)} B · parity + leaves + merkle + chiral weave${engNote} verified`);
        return { ok: true, reasons, text };
    } catch (e) {
        return { ok: false, reasons: ['decode failure: ' + e.message] };
    }
}
function importBiochain(BC, rec) {
    const v = verifyBiochain(BC, rec), checks = [check(v.ok, 'Owl Academy\'s verifyIntegrity steps: frame parity, leaves, Merkle root, chiral weave, engram layer', v.reasons.join('; '))];
    if (!v.ok) return { kind: 'biochain', label: `a biochain (${rec.chainId || 'no id'})`, checks, verified: false, turns: [] };
    const tokens = BC.tokenizeEngrams(v.text), mine = engramStream(v.text);
    checks.push(check(typeof rec.engramStream !== 'string' || (mine.stream === rec.engramStream && mine.count === rec.engramCount && mine.meanJ === rec.engramMeanJ),
        'this system\'s engram stream of the recreated text equals the record\'s', `${mine.count} tokens, mean J ${mine.meanJ}`));
    return { kind: 'biochain', label: `a biochain (${rec.chainId || 'no id'}), ${v.text.length} characters recreated`, checks, verified: checks.every(x => x.ok !== false), turns: [{ source: 'biochain', tokens }], text: v.text };
}
// ---- in: an engram stream on its own (16 hex digits a token, biomesh.js engramStreamFromText)
function importEngramStream(o, store = []) {
    const s = typeof o === 'string' ? o : o.engramStream, checks = [];
    if (!/^[0-9A-Fa-f]*$/.test(s) || s.length % 16) throw new Error('an engram stream is 16 hex digits a packet');
    const grids = [];
    for (let i = 0; i < s.length; i += 16) grids.push(gridFromHex(s.slice(i, i + 16)));
    const meanJ = grids.length ? +(grids.reduce((a, g) => a + computeJ(g), 0) / grids.length).toFixed(4) : 0;
    if (typeof o === 'object') {
        if (o.engramCount !== undefined) checks.push(check(o.engramCount === grids.length, 'the count matches', `${grids.length} packets`));
        if (o.engramMeanJ !== undefined) checks.push(check(o.engramMeanJ === meanJ, 'the mean torsion J matches', String(meanJ)));
    }
    const keys = new Map();
    for (const t of store) { const k = hexLsb(crystallize(t)); if (!keys.has(k)) keys.set(k, t); }
    const labels = grids.map(g => keys.get(hexLsb(g)) || '·');
    const named = labels.filter(l => l !== '·').length;
    checks.push(check(null, 'the tokens themselves are not in a stream', `${named} of ${grids.length} keys equal a stored word's, and are labelled with it (engram/1 keeps only letter parity)`));
    return { kind: 'engram_stream', label: `an engram stream of ${grids.length} packets`, checks, verified: checks.every(x => x.ok !== false), turns: [{ source: 'stream', grids: grids.map(g => hexLsb(g).toUpperCase()), labels }] };
}
// ---- in: this system's own v2 export
function importV2(o) {
    const turns = (o.turns || []).map(t => (t.grids ? { source: t.source, grids: t.grids, labels: t.labels } : typeof t.text === 'string' ? { source: t.source, text: t.text } : { source: t.source, tokens: t.tokens }));
    const live = liveOf(turns), checks = [];
    checks.push(compareChain(live, (o.packets || []).map(q => p => (q.header !== p.header ? 'header' : q.footer !== p.footer ? 'footer' : q.seed64 !== hex64(p.seed64) ? 'body' : q.address !== live.addresses[p.index].join('') ? 'address' : '')), 'every packet and address rebuilt'));
    const W = o.words || [];
    checks.push(check(W.length === live.words.length && W.every((w, i) => w.root === live.words[i].root && w.link === live.words[i].link), 'every memory word\'s Merkle root and link rebuilt', `${W.length} words${W.some(w => w.intact === false) ? `; ${W.filter(w => w.intact === false).length} were damaged when exported` : ''}`));
    checks.push(check(o.chain && live.chainQ.map(String).join() === o.chain.quaternion.join(), 'the chain quaternion rebuilt', o.chain ? o.chain.norm : ''));
    return { kind: 'engram_mind_eye_v2', label: 'an Engram Mind\'s Eye v2 export', checks, verified: checks.every(x => x.ok !== false), turns, manifold: o.manifold };
}
// ---- in: ENVIRONMENT/1 (Biomesh Mind's Eye 3D): a boundary seed, a codex, pump settings and a frontier
function importEnvironment(LS, BC, o) {
    const checks = [];
    const recomputed = '0x' + LS.fold32(JSON.stringify({ b: o.boundary && o.boundary.hash, c: o.codex, p: o.pump, f: o.frontier })).toString(16).padStart(8, '0');
    checks.push(check(o.hash ? recomputed === o.hash : null, o.hash ? (recomputed === o.hash ? `hash ${recomputed} matches, as Owl Academy computes it` : `hash ${recomputed} ≠ stored ${o.hash}: changed after it was hashed`) : `no hash stored; recomputed ${recomputed}`));
    const seed = importLatticeSeed(LS, o.boundary);
    checks.push(check(seed.hashOk !== false && !seed.parityBad && seed.chains.every(c => c.unfolds), 'the boundary seed: hash, parities and chains', `${seed.nodes.length} nodes, ${seed.chains.length} chain(s)`));
    let codex = null;
    if (typeof o.codex === 'string') {
        try { const p = BC.parseCodexStream(o.codex); codex = { ok: true, order: p.order, chunk: p.chunk, entries: p.entries.length }; checks.push(check(true, 'the codex passes Owl Academy\'s ABI gate', `GEAR order ${p.order}, ${p.entries.length} PRIME entries, HALT`)); }
        catch (e) { codex = { ok: false, error: e.message }; checks.push(check(false, 'the codex fails Owl Academy\'s ABI gate', e.message)); }
    } else checks.push(check(null, 'no codex attached'));
    const pump = Object.assign({ frames: 720, breath: 0.5, torsion: 3, reach: 12, backprop: true }, o.pump || {});
    const ids = new Set(seed.nodes.map(n => n.i)), frontier = (o.frontier || []).slice();
    checks.push(check(null, 'pump and frontier', `${pump.frames} frames, breath ${pump.breath}, torsion ${pump.torsion}; ${frontier.length} frontier index(es), ${frontier.filter(i => ids.has(i)).length} on programmed nodes`));
    return { kind: 'environment', label: 'an ENVIRONMENT/1 object', checks, verified: checks.every(x => x.ok !== false), recomputed, hashOk: o.hash ? recomputed === o.hash : null, seed, codex, pump, frontier };
}
// One entry point: what it is, and the import.
function importAny(text, { LS = null, BC = null, store = [] } = {}) {
    const { kind, obj } = detectImport(text);
    if (kind === 'owl_session') return importOwlSession(obj);
    if (kind === 'engram_chain') return importV1Chain(obj, text);
    if (kind === 'engram_text_chain') return importV1Crystal(obj, text);
    if (kind === 'engram_mind_eye_v2') return importV2(obj);
    if (kind === 'engram_stream') return importEngramStream(obj, store);
    if (kind === 'biochain') { if (!BC) throw new Error('biochain_v1.js is needed for a biochain'); return importBiochain(BC, obj); }
    if (kind === 'environment') { if (!LS || !BC) throw new Error('lattice_seed_v1.js and biochain_v1.js are needed for an environment'); return importEnvironment(LS, BC, obj); }
    if (kind === 'lattice_seed') {
        if (!LS) throw new Error('lattice_seed_v1.js is needed for a lattice seed');
        const imp = importLatticeSeed(LS, obj);
        return { kind, label: 'a LATTICE-SEED/1', seed: imp, verified: imp.hashOk !== false && !imp.parityBad,
            checks: [check(imp.hashOk, imp.hashOk === null ? 'no hash stored' : imp.hashOk ? 'the hash matches' : 'the hash does not match'), check(!imp.parityBad, `${imp.parityBad} broken parities`)] };
    }
    throw new Error('unknown format');
}

// ================================================================== strict verification and the checked import (overhaul E3)
// Additive (D4): verifyBiochain, importBiochain and importAny above are unchanged; the Hyperbolic Lexicon's decided
// L8(c) runner and tests/bridges-lexicon.cjs read them. BC2 is biochain_v2.js (BiochainV2): Owl Academy's Firebase-free
// core, verbatim, pinned by reference/golden/make_bridges_v2.cjs, with the strict verifier of RFC 07 section 12.
// Two verdicts are kept apart:
//   Owl-compatible  what importBiochain reports as `verified`: the record agrees with itself. Owl Academy's
//                   verifyIntegrity steps (each packet's parity bit, its residuals decode, the leaves, root, chiral weave
//                   and engram layer it carries match the recreated text) and this system's engram stream, count and
//                   mean J of that text.
//   strict          Owl's verifyIntegrityStrict: the record is what growBiochain grows from its bytes. Only this verdict
//                   checks that: parity, canonical, crystal, leaves, weaves, derived, in that order, or the first check
//                   that fails.
// The labels follow decision D15, as Owl labels them: "strict ok", "legacy", "failed at <check>", and "self-consistent
// only, failed at <check>" when Owl's verifyIntegrity steps pass (the Owl-compatible verdict also needs this system's
// engram stream, so it can read "failed" beside that label).

// The strict verdict of a record: Owl's verifyIntegrityStrict, run with orbital_core.js's SHA-256 (synchronous).
// -> { ok, failed, legacy, checks: [{ name, ok, detail, fields? }] }
function verifyBiochainStrict(BC2, chain) {
    if (!BC2 || typeof BC2.verifyIntegrityStrict !== 'function') throw new Error('biochain_v2.js is needed for the strict check');
    return BC2.verifyIntegrityStrict(chain, { sha256: sha256Hex });
}
// A record's engram layer by both implementations, each key computed once per distinct token (F76): Owl's
// (biochain_v2.js engramGrid, engramGridHex, engramJ, its grid built once per letter) and this system's (ttmpt_core_v1.js
// crystallize, hexLsb, computeJ). The stream, count and mean J are assembled as biomesh.js engramStreamFromText does,
// in token order, so they equal the unmemoised results.
function engramMemo(BC2) {
    const owl = new Map(), mine = new Map(), texts = new Map();
    const owlKey = t => { let e = owl.get(t); if (!e) { const g = BC2.engramGrid(t); e = [BC2.engramGridHex(g), BC2.engramJ(g)]; owl.set(t, e); } return e; };
    const mineKey = t => { let e = mine.get(t); if (!e) { const g = crystallize(t); e = [hexLsb(g).toUpperCase(), computeJ(g)]; mine.set(t, e); } return e; };
    // a generator: the stream of `tokens` under `key`, yielding every `every` tokens
    function* layer(tokens, key, every = 1000) {
        let stream = '', jsum = 0;
        for (let i = 0; i < tokens.length; i++) {
            const [h, j] = key(tokens[i]);
            stream += h; jsum += j;
            if ((i + 1) % every === 0) yield i + 1;
        }
        return { stream, count: tokens.length, meanJ: tokens.length ? +(jsum / tokens.length).toFixed(4) : 0 };
    }
    const run = g => { let r; do r = g.next(); while (!r.done); return r.value; };
    function* both(text, every) {                  // { owl, mine } of a text, cached by text
        if (texts.has(text)) return texts.get(text);
        const o = yield* layer(BC2.tokenizeEngrams(text), owlKey, every), m = yield* layer(tokenizeBiomesh(text), mineKey, every);
        const r = { owl: o, mine: m };
        texts.set(text, r);
        return r;
    }
    return { both, owl: text => run(both(text)).owl, mine: text => run(both(text)).mine, sizes: () => ({ owl: owl.size, mine: mine.size }) };
}
// What a biochain import can be: a record as growBiochain returns it (or a legacy one), a biochain-package/1 (the
// draft of RFC 07, overhaul S3: format, kind, record, attests, content, attestation, registry?, manifest?), or the
// Hyperbolic Lexicon's package (record, lprep, attestation, lcorpus, inclusion, lgrow, consistency). null otherwise.
function biochainInputOf(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    if (o.format === 'biochain-package/1') return o.record && typeof o.record === 'object' && !Array.isArray(o.record) ? { from: 'biochain-package/1', record: o.record, pkg: o } : null;
    if (o.record && typeof o.record === 'object' && typeof o.lprep === 'string') return { from: 'lexicon-package', record: o.record, pkg: o };
    if (typeof o.stream === 'string' || Array.isArray(o.streams)) return { from: 'record', record: o, pkg: null };
    return null;
}
const attestationFormatOf = a => (typeof a.format === 'string' ? a.format : typeof a.keyId === 'string' ? 'attestation/1' : typeof a.sealId === 'string' ? 'owl-seal/1' : null);
// An LPREP/1 string (the Hyperbolic Lexicon's lprepFields) against a record. Its registered shape: 15 fields and tier S,
// or 16 with tier P, chainId "-" and a salted root of 64 lower-case hex digits. Field 4, merkleRoot, must be the
// record's in both tiers; Tier S's field 3 must be its chainId; Tier P's salted root, SHA-256 over UTF-8 of
// "LPREP-SALT/1|salt|merkleRoot|chainId", is checked when the salt (64 lower-case hex digits) is given.
// The other fields (sizes, text hashes, vocabulary and address hashes) are the Lexicon's verifyPackage's to recompute.
// -> { ok: true | false | null (Tier P without its salt: the salted root not checked), tier: 'S' | 'P' | null, detail }
const HEX64 = /^[0-9a-f]{64}$/;
function lprepBinding(content, record, salt = null) {
    const parts = typeof content === 'string' ? content.split('|') : [], f = parts.slice(0, 15);
    const tier = parts[0] !== 'LPREP/1' ? null : parts.length === 15 && f[14] === 'S' ? 'S' : parts.length === 16 && f[14] === 'P' && f[3] === '-' && HEX64.test(parts[15]) ? 'P' : null;
    if (!tier) return { ok: false, tier: null, detail: 'not an LPREP/1 string of the registered shape (15 fields and tier S, or 16 with tier P)' };
    if (!record || f[4] !== record.merkleRoot) return { ok: false, tier, detail: 'it names another merkleRoot' };
    if (tier === 'S') return f[3] === record.chainId ? { ok: true, tier, detail: 'it names this record\'s chainId and merkleRoot' } : { ok: false, tier, detail: 'it names another chainId' };
    if (salt === null || salt === undefined) return { ok: null, tier, detail: 'Tier P: it names this record\'s merkleRoot; its salted root needs the salt, which the package does not carry' };
    if (typeof salt !== 'string' || !HEX64.test(salt)) return { ok: false, tier, detail: 'Tier P: the salt is not 64 lower-case hex digits' };
    return sha256Hex(`LPREP-SALT/1|${salt}|${record.merkleRoot}|${record.chainId}`) === parts[15] ?
        { ok: true, tier, detail: 'Tier P: it names this record\'s merkleRoot, and its salted root is this record\'s with the package\'s salt' } :
        { ok: false, tier, detail: 'Tier P: its salted root is not this record\'s with the package\'s salt' };
}
// Where a record says it came from, read from its package (nothing is trusted here: each claim is checked or marked
// unchecked). contentMatches: the signed content against the record (GROWN/1 rebuilt with Owl's grownCommitment;
// LPREP/1 by lprepBinding above, with the package's salt when it has one), and contentDetail says what was compared;
// tier: an LPREP/1 string's tier. contentHashOk: the attestation's contentHash is SHA-256(content). The signature and
// the key: checkSigner (asynchronous).
function provenanceOf(BC2, input) {
    const { from, record, pkg } = input;
    if (!pkg) return { from, attests: null, content: null, contentMatches: null, contentDetail: null, tier: null, contentHashOk: null, signer: null, attestationFormat: null, registry: null, manifest: false };
    const att = pkg.attestation && typeof pkg.attestation === 'object' && !Array.isArray(pkg.attestation) ? pkg.attestation : null;
    const attests = from === 'lexicon-package' ? 'LPREP/1' : typeof pkg.attests === 'string' ? pkg.attests : null;
    const content = from === 'lexicon-package' ? pkg.lprep : typeof pkg.content === 'string' ? pkg.content : null;
    let contentMatches = null, contentDetail = content === null ? 'no content' : 'not a content this system checks', tier = null;
    if (content !== null && attests === 'GROWN/1') {
        contentMatches = content === BC2.grownCommitment(record);
        contentDetail = contentMatches ? 'the GROWN/1 commitment rebuilt from the record' : 'not the GROWN/1 commitment rebuilt from the record';
    } else if (content !== null && attests === 'LPREP/1') {
        const b = lprepBinding(content, record, Object.prototype.hasOwnProperty.call(pkg, 'salt') ? pkg.salt : null);
        contentMatches = b.ok; contentDetail = b.detail; tier = b.tier;
    }
    return {
        from, attests, content, contentMatches, contentDetail, tier,
        contentHashOk: att && content !== null && typeof att.contentHash === 'string' ? att.contentHash === sha256Hex(content) : null,
        signer: att ? (typeof att.keyId === 'string' ? att.keyId : typeof att.sealId === 'string' ? att.sealId : null) : null,
        attestationFormat: att ? attestationFormatOf(att) : null,
        registry: pkg.registry && typeof pkg.registry.sha256 === 'string' ? { sha256: pkg.registry.sha256 } : null,
        manifest: from === 'lexicon-package' ? typeof pkg.lcorpus === 'string' : !!(pkg.manifest && typeof pkg.manifest === 'object'),
    };
}
// The checked import, step by step: a generator that yields { step, label, done?, of? } between its stages (a page
// runs it in chunks and draws between them; importBiochainChecked runs it to the end) and returns the result:
//   importBiochain's fields, with the same meaning (kind 'biochain', label, checks, verified, turns, text): Owl's
//     verifyIntegrity steps and this system's engram stream, as importBiochain computes them, here on biochain_v2.js
//   owlCompatible  = verified
//   strict         the strict verdict, its label (D15, as Owl labels it: "self-consistent only" when the first check,
//                  Owl's verifyIntegrity steps, passes) and the failing check's detail
//   verdict        "Owl-compatible ok; strict ok", "Owl-compatible ok; strict failed at crystal", ...
//   engrams        both engram implementations on the recreated text, compared: { agree, tokens, distinct }
//   recordKind     the package's or the record's kind when it is in Owl's registry (RFC 07 section 11.3), else null;
//                  recordKindGiven is what was given (null when none). importBiochain's `kind` stays 'biochain'.
//   provenance     provenanceOf above
//   attestation    the package's attestation, as given (null when none)
// input: an object or its JSON text. opts.every: the tokens between two yields of the engram passes (default 1,000).
function* importBiochainCheckedSteps(BC2, input, opts = {}) {
    if (!BC2 || typeof BC2.verifyIntegrityStrict !== 'function') throw new Error('biochain_v2.js is needed for the checked import');
    const o = typeof input === 'string' ? JSON.parse(input) : input, inp = biochainInputOf(o);
    if (!inp) throw new Error('not a biochain record or package');
    const rec = inp.record, memo = opts.memo || engramMemo(BC2);
    yield { step: 'strict', label: 'the strict check (RFC 07 section 12)' };
    const strict = verifyBiochainStrict(BC2, rec);
    // the recreated text, read ahead so that both engram layers can be computed in chunks before Owl's steps use them
    let text = null;
    try { text = BC2.recreateText(rec); } catch (e) { text = null; }
    if (text !== null) {
        yield { step: 'engrams', label: 'both engram layers of the recreated text', done: 0 };
        const g = memo.both(text, opts.every || 1000);
        for (let r = g.next(); !r.done; r = g.next()) yield { step: 'engrams', label: 'both engram layers of the recreated text', done: r.value };
    }
    yield { step: 'owl', label: 'Owl Academy\'s verifyIntegrity steps' };
    // importBiochain, step for step: verifyBiochain (unchanged) on biochain_v2.js with Owl's engram layer memoised
    const v = verifyBiochain(Object.assign({}, BC2, { engramStreamFromText: memo.owl }), rec);
    const checks = [check(v.ok, 'Owl Academy\'s verifyIntegrity steps: frame parity, leaves, Merkle root, chiral weave, engram layer', v.reasons.join('; '))];
    let base;
    if (!v.ok) base = { kind: 'biochain', label: `a biochain (${rec.chainId || 'no id'})`, checks, verified: false, turns: [] };
    else {
        const tokens = BC2.tokenizeEngrams(v.text), mine = memo.mine(v.text);
        checks.push(check(typeof rec.engramStream !== 'string' || (mine.stream === rec.engramStream && mine.count === rec.engramCount && mine.meanJ === rec.engramMeanJ),
            'this system\'s engram stream of the recreated text equals the record\'s', `${mine.count} tokens, mean J ${mine.meanJ}`));
        base = { kind: 'biochain', label: `a biochain (${rec.chainId || 'no id'}), ${v.text.length} characters recreated`, checks, verified: checks.every(x => x.ok !== false), turns: [{ source: 'biochain', tokens }], text: v.text };
    }
    let engrams = null;
    if (text !== null) {
        const r = memo.owl(text), m = memo.mine(text);
        engrams = { agree: r.stream === m.stream && r.count === m.count && r.meanJ === m.meanJ, tokens: r.count, distinct: new Set(BC2.tokenizeEngrams(text)).size, meanJ: r.meanJ };
    }
    const f = strict.ok ? null : strict.checks[strict.checks.length - 1];
    // the label as Owl labels it: "self-consistent only" when Owl's verifyIntegrity steps (the first check) pass
    const strictOut = { ok: strict.ok, failed: strict.failed, legacy: strict.legacy, label: BC2.strictLabel(strict, v.ok), detail: f ? f.detail : null, ...(f && f.fields ? { fields: f.fields } : {}), checks: strict.checks };
    const kindGiven = inp.pkg && typeof inp.pkg.kind === 'string' ? inp.pkg.kind : typeof rec.kind === 'string' ? rec.kind : null;
    let recordKind = null;
    if (kindGiven !== null) { try { recordKind = BC2.validateKind(kindGiven); } catch (e) { recordKind = null; } }
    return {
        ...base,
        owlCompatible: base.verified,
        strict: strictOut,
        verdict: `Owl-compatible ${base.verified ? 'ok' : 'failed'}; ${strict.ok ? 'strict ok' : strict.legacy ? 'strict: legacy' : `strict failed at ${strict.failed}`}`,
        engrams,
        recordKind, recordKindGiven: kindGiven,
        provenance: provenanceOf(BC2, inp),
        attestation: inp.pkg && inp.pkg.attestation && typeof inp.pkg.attestation === 'object' ? inp.pkg.attestation : null,
    };
}
// The checked import, synchronously (importBiochainCheckedSteps run to the end).
function importBiochainChecked(BC2, input, opts = {}) {
    const g = importBiochainCheckedSteps(BC2, input, opts);
    let r;
    do r = g.next(); while (!r.done);
    return r.value;
}
// The signer of a package, asynchronously with Web Crypto (opts.subtle, else globalThis.crypto.subtle):
//   fingerprint  the attestation's embedded publicJwk (P-256): SHA-256 over UTF-8 of "x|y", its first 24 hex digits,
//                must be the keyId ("K-" + them, BioChain-AI's keyIdFromPublic) or the sealId ("S-" + them, Owl's
//                sealIdFromPublic)
//   signature    ATTEST/1 only: the P1363 signature (128 hex digits) over "ATTEST/1|keyId|keyVector|contentHash|
//                epochToken" verifies with that key. SEAL/1 signatures are Owl Academy's to check (overhaul phase 4).
// It does not decide whether the key may sign (its registry status, decision D10): that needs a registry.
// -> { ok (true, false, or null when the signature could not be checked here), signer: { id, kind, fingerprint } | null, checks }
async function checkSigner(pkg, opts = {}) {
    const checks = [], subtle = opts.subtle || (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) || null;
    const att = pkg && typeof pkg === 'object' && pkg.attestation && typeof pkg.attestation === 'object' ? pkg.attestation : null;
    if (!att) return { ok: null, signer: null, checks: [check(null, 'no attestation in the package')] };
    const isKey = typeof att.keyId === 'string', id = isKey ? att.keyId : typeof att.sealId === 'string' ? att.sealId : null, jwk = att.publicJwk;
    if (!id) return { ok: false, signer: null, checks: [check(false, 'the attestation names no keyId or sealId')] };
    if (!jwk || typeof jwk !== 'object' || typeof jwk.x !== 'string' || typeof jwk.y !== 'string') return { ok: null, signer: { id, kind: isKey ? 'key' : 'seal', fingerprint: null }, checks: [check(null, 'no public key in the attestation', 'the signer can be checked only against a registry')] };
    if (!subtle) return { ok: null, signer: { id, kind: isKey ? 'key' : 'seal', fingerprint: null }, checks: [check(null, 'Web Crypto is not available here')] };
    const bytes = s => new Uint8Array(O.utf8(String(s)));
    const fp = O.toHex(new Uint8Array(await subtle.digest('SHA-256', bytes(`${jwk.x}|${jwk.y}`)))).slice(0, 24), prefix = isKey ? 'K-' : 'S-';
    const fpOk = id === prefix + fp;
    checks.push(check(fpOk, `the embedded public key's fingerprint is the ${isKey ? 'keyId' : 'sealId'}`, fpOk ? id : `${prefix}${fp} ≠ ${id}`));
    let sigOk = null;
    if (isKey && typeof att.sig === 'string' && /^[0-9a-f]{128}$/i.test(att.sig)) {
        try {
            const key = await subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
            const payload = ['ATTEST/1', att.keyId, att.keyVector, att.contentHash, att.epochToken].join('|');
            sigOk = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, Uint8Array.from(att.sig.match(/../g).map(h => parseInt(h, 16))), bytes(payload));
        } catch (e) { sigOk = false; }
        checks.push(check(sigOk, 'the ATTEST/1 signature verifies with that key', sigOk ? 'P-256, SHA-256' : 'it does not'));
    } else checks.push(check(null, isKey ? 'no P1363 signature (128 hex digits) to check' : 'the SEAL/1 signature is checked by Owl Academy'));
    // ok: true when the fingerprint holds and the signature verifies; false when either fails; null when the signature
    // could not be checked here (a SEAL/1, or no signature)
    return { ok: !fpOk || sigOk === false ? false : sigOk === true ? true : null, signer: { id, kind: isKey ? 'key' : 'seal', fingerprint: fp }, checks };
}
// A biochain-package/1 for the next hop (overhaul N03, hop 2: the Hyperbolic Lexicon -> Engram -> Owl Academy), in the
// draft form of RFC 07 (overhaul S3): { format, kind, record, attests, content, attestation, registry?, manifest? }.
// The record must pass the strict check, else nothing is written; only its shdccp/2 fields are kept (Firestore and
// app fields are dropped). opts: BC2 (biochain_v2.js, required); kind (default the record's; required, in Owl's
// registry); attests ('GROWN/1', the default, or 'LPREP/1'); content (GROWN/1: rebuilt from the record when absent and
// must equal it when given; LPREP/1: required, a Tier-S string naming the record's chainId and merkleRoot, see
// lprepBinding; a Tier-P string is not written, since the draft package has no field for its salt and the next hop could
// not check its salted root); registry ({ snapshot, sha256 }) and manifest ({ lcorpus, inclusion, lgrow, consistency })
// copied when given. The attestation's contentHash, when present, must be SHA-256(content).
// -> { name, text, package }
const PACKAGE_RECORD_FIELDS = ['chainId', 'stream', 'streamVersion', 'leafHashes', 'merkleRoot', 'weaveChiral', 'weaveMirror', 'segCuts', 'segments',
    'engramStream', 'engramCount', 'engramMeanJ', 'origBytes', 'shippedBytes', 'value'];
function exportBiochainPackage(chain, attestation, opts = {}) {
    const BC2 = opts.BC2;
    if (!BC2 || typeof BC2.verifyIntegrityStrict !== 'function') throw new Error('biochain_v2.js is needed (opts.BC2) to export a package');
    const strict = verifyBiochainStrict(BC2, chain);
    if (!strict.ok) throw new Error(`the record fails the strict check (${BC2.strictLabel(strict)}): not exported`);
    if (!attestation || typeof attestation !== 'object' || Array.isArray(attestation)) throw new Error('a package carries an attestation');
    const record = {};
    for (const k of PACKAGE_RECORD_FIELDS) if (Object.prototype.hasOwnProperty.call(chain, k)) record[k] = JSON.parse(JSON.stringify(chain[k]));
    const kind = BC2.validateKind(opts.kind !== undefined ? opts.kind : chain.kind);
    const attests = opts.attests || 'GROWN/1';
    let content;
    if (attests === 'GROWN/1') {
        content = BC2.grownCommitment(record);
        if (opts.content !== undefined && opts.content !== content) throw new Error('the content given is not the GROWN/1 commitment of the record');
    } else if (attests === 'LPREP/1') {
        if (typeof opts.content !== 'string' || opts.content.split('|')[0] !== 'LPREP/1') throw new Error('an LPREP/1 package needs its LPREP/1 string as content');
        const b = lprepBinding(opts.content, record);
        if (b.tier === 'P') throw new Error('a Tier-P LPREP/1 is not passed on: biochain-package/1 has no field for its salt yet');
        if (b.ok !== true) throw new Error(`the LPREP/1 string is not this record's: ${b.detail}`);
        content = opts.content;
    } else throw new Error('attests is GROWN/1 or LPREP/1');
    const att = JSON.parse(JSON.stringify(attestation));
    if (!att.format) { const fmt = attestationFormatOf(att); if (fmt) att.format = fmt; }
    if (typeof att.contentHash === 'string' && att.contentHash !== sha256Hex(content)) throw new Error('the attestation\'s contentHash is not SHA-256 of the content');
    const pkg = { format: 'biochain-package/1', kind, record, attests, content, attestation: att };
    if (opts.registry) pkg.registry = { snapshot: opts.registry.snapshot, sha256: opts.registry.sha256 };
    if (opts.manifest) pkg.manifest = { lcorpus: opts.manifest.lcorpus, inclusion: opts.manifest.inclusion, lgrow: opts.manifest.lgrow, consistency: opts.manifest.consistency };
    return { name: `biochain-package_${record.chainId}.json`, text: JSON.stringify(pkg, null, 1), package: pkg };
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
        { name: 'Traces: the sharper guard (E10)', run() {
            const out = [], w = trace.watch;
            if (!w || !w.e10) return [line('watch', 'E10 section in the trace', false, 'missing: regenerate with run_traces.py')];
            const pts = depth2Points(), whole = Fz.distanceMatrix(pts);
            for (const t of w.e10) {
                const D = t.set === 'A' ? Fz.distanceMatrix(new C.Rng(t.i).sample(pts.length, 24).map(j => pts[j])) : whole;
                const [E, pairs] = Fz.corrupt(D, 1, t.delta, t.i + (t.set === 'A' ? 1000 : 2000)), g = guardsOf(E);
                const ok = same(pairs[0], t.pair) && g.bad === t.bad && same(g.original.slice(0, 3), t.original) && same(g.matching.slice(0, 3), t.matching) && same(g.smallest.slice(0, 3), t.smallest);
                const nm = aloneOf(g.matching);
                out.push(line('watch', `E10 set ${t.set}, instance ${t.i}, +${t.delta}`, ok, `${g.bad} quadruples above ln 2; the matching guard ${nm ? (nm[0] === t.pair[0] && nm[1] === t.pair[1] ? 'names the pair' : 'names another pair') : 'names no pair alone'}`));
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
    version: 'engram-browser-5',
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
    // the page engine (Phase 4)
    qnormPow5, bindingPow5, offOf, positionOf, strixReply, Live, MANIFOLD_DEFAULT, anchorOf, exportV1Chain, exportV1Crystal, exportV2,
    // the 3D engine (Phase 5)
    LAYOUT, point3, point3Exact, memoryNodes, misplace, watchMemory, guardMemory, guardsOf, aloneOf, floatQ, frameOf, twinFrames, breathOf, importLatticeSeed, seedPosition, seedNodes,
    // the bridges (Phase 6)
    gridFromHex, liveOf, turnsOf, replayTurns, exportOwlSession, owlGreeting, detectImport, importOwlSession, importV1Chain, importV1Crystal, verifyBiochain, importBiochain,
    importEngramStream, importV2, importEnvironment, importAny,
    // strict verification and the checked import (overhaul E3; additive)
    verifyBiochainStrict, engramMemo, biochainInputOf, lprepBinding, provenanceOf, importBiochainCheckedSteps, importBiochainChecked, checkSigner, exportBiochainPackage,
    PACKAGE_RECORD_FIELDS,
    // parity
    paritySections, behaviourSections, runParity,
};
});
