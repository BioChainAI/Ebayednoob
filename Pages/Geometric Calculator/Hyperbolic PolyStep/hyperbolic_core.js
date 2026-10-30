// Hyperbolic PolyStep: the browser core (Phase 2).
//
// A line-by-line port of the Python reference (reference/hpstep). It runs in the browser (window.HPCore) and
// in Node (require). It is trusted because it reproduces the reference's traces (reference/traces/*.json):
// exact fields exactly, float fields within 1e-12. tests/parity.cjs checks that in Node, and
// explainers/core-reference.html runs the same check in the browser.
//
// Tracks, as in the paper's section 8.10: A float search; B exact rationals (Q, BigInt); C the snap to the
// grid 2^-k with its residual; R residues (the memory chain uses SHA-256 here). Functions say which track
// they are on.
//
// Parity rules that the reference follows too:
//   * Q.toNumber is correctly rounded (as Python's float(Fraction)); Q.fromDouble is exact (as Fraction(float)).
//   * Halves round up: floor(x + 1/2), in the snap, the exact step length t and B1's edge count.
//   * Sums run left to right, in the order the reference writes them.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.HPCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ============================================================ track B: exact rationals
    const absB = a => (a < 0n ? -a : a);
    function gcdB(a, b) { a = absB(a); b = absB(b); while (b) { [a, b] = [b, a % b]; } return a; }
    const bitLen = a => (a === 0n ? 0 : a.toString(2).length);

    class Q {
        constructor(num, den = 1n) {
            let n = BigInt(num), d = BigInt(den);
            if (d === 0n) throw new RangeError('Q with zero denominator');
            if (d < 0n) { n = -n; d = -d; }
            const g = gcdB(n, d) || 1n;
            this.n = n / g; this.d = d / g;
        }
        add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
        sub(o) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
        mul(o) { return new Q(this.n * o.n, this.d * o.d); }
        div(o) { return new Q(this.n * o.d, this.d * o.n); }
        neg() { return new Q(-this.n, this.d); }
        eq(o) { return this.n === o.n && this.d === o.d; }
        cmp(o) { const l = this.n * o.d, r = o.n * this.d; return l < r ? -1 : l > r ? 1 : 0; }
        sign() { return this.n < 0n ? -1 : this.n > 0n ? 1 : 0; }
        isZero() { return this.n === 0n; }
        toString() { return `${this.n}/${this.d}`; }
        // Correctly rounded to the nearest double, ties to even, as Python's float(Fraction).
        toNumber() {
            if (this.n === 0n) return 0;
            const neg = this.n < 0n, a = absB(this.n), b = this.d;
            let s = 65 - (bitLen(a) - bitLen(b));                      // aim for a 65- or 66-bit quotient
            let q, r;
            if (s >= 0) { const A = a << BigInt(s); q = A / b; r = A % b; }
            else { const B = b << BigInt(-s); q = a / B; r = a % B; }
            if (r !== 0n) q |= 1n;                                     // sticky bit below the rounding position
            const x = Number(q) * Math.pow(2, -s);                     // Number(BigInt) rounds to nearest, ties even
            return neg ? -x : x;
        }
        static from(v) { return v instanceof Q ? v : typeof v === 'bigint' ? new Q(v) : Q.fromDouble(v); }
        // The exact value of a double, as Python's Fraction(float).
        static fromDouble(x) {
            if (!isFinite(x)) throw new RangeError('fromDouble of ' + x);
            if (x === 0) return Q.ZERO;
            const buf = new DataView(new ArrayBuffer(8));
            buf.setFloat64(0, x);
            const hi = buf.getUint32(0), lo = buf.getUint32(4);
            const sign = hi >>> 31, exp = (hi >>> 20) & 0x7ff;
            let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
            let e;
            if (exp === 0) e = -1074; else { mant |= 1n << 52n; e = exp - 1075; }
            const n = sign ? -mant : mant;
            return e >= 0 ? new Q(n << BigInt(e)) : new Q(n, 1n << BigInt(-e));
        }
        static parse(s) { const [n, d] = s.split('/'); return new Q(BigInt(n), BigInt(d === undefined ? 1 : d)); }
    }
    Q.ZERO = new Q(0n); Q.ONE = new Q(1n); Q.TWO = new Q(2n);
    const qs = v => v.toString();

    // ============================================================ the shared generator: xoshiro128**
    const MASK = 0xFFFFFFFF;
    const rotl = (x, k) => ((x << k) | (x >>> (32 - k))) >>> 0;
    function* splitmix32(seed) {
        let state = seed >>> 0;
        for (;;) {
            state = (state + 0x9E3779B9) >>> 0;
            let z = state;
            z = Math.imul(z ^ (z >>> 16), 0x85EBCA6B) >>> 0;
            z = Math.imul(z ^ (z >>> 13), 0xC2B2AE35) >>> 0;
            yield (z ^ (z >>> 16)) >>> 0;
        }
    }
    class Rng {
        constructor(seed = 0, state = null) {
            if (!state) { const sm = splitmix32(seed); state = [0, 1, 2, 3].map(() => sm.next().value); }
            this.s = state.map(x => x >>> 0);
            if (!this.s.some(Boolean)) throw new Error('xoshiro128** state must not be all zero');
        }
        nextU32() {
            const s = this.s;
            const result = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0;
            const t = (s[1] << 9) >>> 0;
            s[2] = (s[2] ^ s[0]) >>> 0; s[3] = (s[3] ^ s[1]) >>> 0; s[1] = (s[1] ^ s[2]) >>> 0; s[0] = (s[0] ^ s[3]) >>> 0;
            s[2] = (s[2] ^ t) >>> 0; s[3] = rotl(s[3], 11);
            return result;
        }
        random() { const a = this.nextU32() >>> 5, b = this.nextU32() >>> 6; return (a * 67108864 + b) / 9007199254740992; }
        below(n) {
            if (!(n > 0 && n <= 4294967296)) throw new RangeError('n must be in 1 .. 2^32');
            const limit = 4294967296 - (4294967296 % n);
            for (;;) { const x = this.nextU32(); if (x < limit) return x % n; }
        }
        randint(lo, hi) { return lo + this.below(hi - lo + 1); }
        sample(n, k) {
            const pool = Array.from({ length: n }, (_, i) => i);
            for (let i = 0; i < k; i++) { const j = i + this.below(n - i); [pool[i], pool[j]] = [pool[j], pool[i]]; }
            return pool.slice(0, k);
        }
        shuffle(items) {
            for (let i = items.length - 1; i > 0; i--) { const j = this.below(i + 1); [items[i], items[j]] = [items[j], items[i]]; }
            return items;
        }
        rational(K) { return new Q(BigInt(this.randint(-K, K)), BigInt(K)); }
    }

    // Python's random module (Mersenne Twister), for polystep's own MAX-SAT generator. Seeding, getrandbits,
    // _randbelow, random() and sample() follow CPython 3.13.
    class PyRandom {
        constructor(seed) {
            this.mt = new Uint32Array(624); this.i = 625;
            const key = []; let s = BigInt(seed); if (s < 0n) s = -s;
            do { key.push(Number(s & 0xffffffffn)); s >>= 32n; } while (s > 0n);
            this.initByArray(key);
        }
        initGenrand(s) {
            const mt = this.mt; mt[0] = s >>> 0;
            for (let i = 1; i < 624; i++) { const p = mt[i - 1] ^ (mt[i - 1] >>> 30); mt[i] = (Math.imul(1812433253, p) + i) >>> 0; }
            this.i = 624;
        }
        initByArray(key) {
            this.initGenrand(19650218); const mt = this.mt; let i = 1, j = 0;
            for (let k = Math.max(624, key.length); k; k--) {
                const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
                mt[i] = ((mt[i] ^ Math.imul(p, 1664525)) + key[j] + j) >>> 0; i++; j++;
                if (i >= 624) { mt[0] = mt[623]; i = 1; } if (j >= key.length) j = 0;
            }
            for (let k = 623; k; k--) {
                const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
                mt[i] = ((mt[i] ^ Math.imul(p, 1566083941)) - i) >>> 0; i++;
                if (i >= 624) { mt[0] = mt[623]; i = 1; }
            }
            mt[0] = 0x80000000;
        }
        uint32() {
            const mt = this.mt;
            if (this.i >= 624) {
                for (let k = 0; k < 624; k++) {
                    const y = (mt[k] & 0x80000000) | (mt[(k + 1) % 624] & 0x7fffffff);
                    mt[k] = mt[(k + 397) % 624] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
                }
                this.i = 0;
            }
            let y = this.mt[this.i++];
            y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18;
            return y >>> 0;
        }
        getrandbits(k) { return this.uint32() >>> (32 - k); }
        randbelow(n) { const k = n.toString(2).length; let r = this.getrandbits(k); while (r >= n) r = this.getrandbits(k); return r; }
        random() { const a = this.uint32() >>> 5, b = this.uint32() >>> 6; return (a * 67108864 + b) * (1 / 9007199254740992); }
        sampleRange(n, k) {                                           // random.sample(range(n), k)
            let setsize = 21;
            if (k > 5) setsize += 4 ** Math.ceil(Math.log(k * 3) / Math.log(4));
            const out = new Array(k);
            if (n <= setsize) {
                const pool = Array.from({ length: n }, (_, i) => i);
                for (let i = 0; i < k; i++) { const j = this.randbelow(n - i); out[i] = pool[j]; pool[j] = pool[n - i - 1]; }
            } else {
                const seen = new Set();
                for (let i = 0; i < k; i++) { let j = this.randbelow(n); while (seen.has(j)) j = this.randbelow(n); seen.add(j); out[i] = j; }
            }
            return out;
        }
    }

    // ============================================================ track B: matrices and the sheet over Q
    const X = {};
    X.eye = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? Q.ONE : Q.ZERO)));
    // A sum of products, accumulated unreduced and reduced once: the same rational as adding term by term.
    const dot = (row, col) => {
        let n = 0n, d = 1n;
        for (let k = 0; k < row.length; k++) { const a = row[k], b = col(k); if (a.n === 0n || b.n === 0n) continue; const tn = a.n * b.n, td = a.d * b.d; if (td === d) n += tn; else { n = n * td + tn * d; d *= td; } }
        return n === 0n ? Q.ZERO : new Q(n, d);
    };
    X.matmul = (A, B) => A.map(row => B[0].map((_, c) => dot(row, k => B[k][c])));
    X.matvec = (A, v) => A.map(row => dot(row, k => v[k]));
    X.transpose = A => A[0].map((_, j) => A.map(row => row[j]));
    X.inverse = A => {                                               // Gauss-Jordan over Q
        const n = A.length, M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? Q.ONE : Q.ZERO))]);
        for (let c = 0; c < n; c++) {
            let p = c; while (M[p][c].isZero()) p++;
            [M[c], M[p]] = [M[p], M[c]];
            const piv = M[c][c]; M[c] = M[c].map(x => x.div(piv));
            for (let r = 0; r < n; r++) if (r !== c && !M[r][c].isZero()) { const f = M[r][c]; M[r] = M[r].map((x, k) => x.sub(f.mul(M[c][k]))); }
        }
        return M.map(row => row.slice(n));
    };
    X.isIdentity = A => A.every((row, i) => row.every((x, j) => x.eq(i === j ? Q.ONE : Q.ZERO)));
    X.matEq = (A, B) => A.every((row, i) => row.every((x, j) => x.eq(B[i][j])));
    X.randomSkew = (rng, d, K = 4) => {
        const A = Array.from({ length: d }, () => Array.from({ length: d }, () => Q.ZERO));
        for (let i = 0; i < d; i++) for (let j = i + 1; j < d; j++) { const a = rng.rational(K); A[i][j] = a; A[j][i] = a.neg(); }
        return A;
    };
    X.cayley = A => {
        const n = A.length, I = X.eye(n);
        const minus = I.map((row, i) => row.map((x, j) => x.sub(A[i][j]))), plus = I.map((row, i) => row.map((x, j) => x.add(A[i][j])));
        return X.matmul(minus, X.inverse(plus));
    };
    X.randomRotation = (rng, d, K = 4) => X.cayley(X.randomSkew(rng, d, K));
    X.isOrthogonal = R => X.isIdentity(X.matmul(X.transpose(R), R));
    X.lorentz = (a, b) => { let s = a[0].mul(b[0]).neg(); for (let i = 1; i < a.length; i++) s = s.add(a[i].mul(b[i])); return s; };
    X.onSheet = y => X.lorentz(y, y).eq(Q.ONE.neg()) && y[0].sign() > 0;
    X.ghost = p => {
        const q = p.reduce((s, x) => s.add(x.mul(x)), Q.ZERO);
        if (q.cmp(Q.ONE) >= 0) throw new RangeError('ghost map needs |p| < 1');
        const den = Q.ONE.sub(q);
        return [Q.ONE.add(q).div(den), ...p.map(x => Q.TWO.mul(x).div(den))];
    };
    X.boost = x => {
        const d = x.length - 1, x0 = x[0], xb = x.slice(1), L = [[x0, ...xb]];
        for (let i = 0; i < d; i++) L.push([xb[i], ...xb.map((xj, j) => (i === j ? Q.ONE : Q.ZERO).add(xb[i].mul(xj).div(Q.ONE.add(x0))))]);
        return L;
    };
    X.J = d => { const M = X.eye(d + 1); M[0][0] = Q.ONE.neg(); return M; };
    X.lorentzInverse = L => L.map((row, i) => row.map((_, j) => ((i === 0) !== (j === 0) ? L[j][i].neg() : L[j][i])));   // J L^T J
    X.isLorentz = L => { const d = L.length - 1; return X.matEq(X.matmul(X.matmul(X.transpose(L), X.J(d)), L), X.J(d)); };
    X.coshSinh = t => { t = Q.from(t); const tt = t.mul(t); return [Q.ONE.add(tt).div(Q.ONE.sub(tt)), Q.TWO.mul(t).div(Q.ONE.sub(tt))]; };
    X.pointAt = (x, t, u) => { const [c, s] = X.coshSinh(t); return X.matvec(X.boost(x), [c, ...u.map(ui => s.mul(ui))]); };
    X.orthoplexDirections = R => {
        const d = R.length, cols = Array.from({ length: d }, (_, c) => R.map(row => row[c]));
        return [...cols, ...cols.map(col => col.map(v => v.neg()))];
    };
    const halfUp = v => Math.floor(v + 0.5);
    X.snap = (yFloat, k = 24) => {                                     // track C
        const y0 = yFloat[0], scale = Math.pow(2, k), den = 1n << BigInt(k);
        let q = yFloat.slice(1).map(v => new Q(BigInt(halfUp((v / (1 + y0)) * scale)), den));
        while (q.reduce((s, x) => s.add(x.mul(x)), Q.ZERO).cmp(Q.ONE) >= 0)
            q = q.map(x => new Q(BigInt(halfUp(x.toNumber() * scale * (1 - Math.pow(2, -k)))), den));
        const y = X.ghost(q);
        const moved = Math.acosh(Math.max(1, -X.lorentz(y, yFloat.map(Q.fromDouble)).toNumber()));
        return [y, moved];
    };
    X.toFloat = y => y.map(v => v.toNumber());
    X.displacement = (xPrev, xNew) => (xPrev.every((v, i) => v.eq(xNew[i])) ? X.eye(xNew.length) : X.matmul(X.boost(xNew), X.lorentzInverse(X.boost(xPrev))));
    // The 720 -> 72 -> 10 pump (Prop 3.9) in any group: returns P, Q10, Q8, H = Q8 Q10 P and P^-1.
    // Increments that are the identity itself (frames where a factor did not move) are skipped, not multiplied.
    X.pump = (dq, mul0, inv0, one) => {
        if (dq.length !== 720) throw new RangeError('a register has 720 increments');
        const mul = (a, b) => (a === one ? b : b === one ? a : mul0(a, b)), inv = a => (a === one ? one : inv0(a));
        let P = one; for (const x of dq) P = mul(x, P);
        const dQ = [];
        for (let m = 0; m < 72; m++) { let B = one; for (let i = 0; i < 10; i++) B = mul(dq[10 * m + i], B); dQ.push(B); }
        const delta = dQ.map(inv);
        let Q10 = one; for (const x of delta) Q10 = mul(Q10, x);
        let Q8 = one;
        for (let l = 0; l < 10; l++) { let A = one; for (let m = 0; m < 72; m++) if (Math.floor(10 * m / 72) === l) A = mul(A, delta[m]); Q8 = mul(Q8, A); }
        return { P, Q10, Q8, H: mul(mul(Q8, Q10), P), Pinv: inv(P) };
    };
    // The same pump on one factor's register, run on integer matrices over a common denominator (N / D) and never
    // reduced: products of rationals without a gcd per entry, equalities by cross-multiplication. Exact, and fast
    // enough for a live page, where reducing every entry dominated. Checks Q10 = Q8 = H = P^-1 and P start = end.
    X.pumpHolds = (dq, start, end) => {
        const lcm = (a, b) => (a / gcdB(a, b)) * b;
        const intMat = A => { let D = 1n; for (const r of A) for (const q of r) D = lcm(D, q.d); return { N: A.map(r => r.map(q => q.n * (D / q.d))), D }; };
        const intVec = v => { let D = 1n; for (const q of v) D = lcm(D, q.d); return { N: v.map(q => q.n * (D / q.d)), D }; };
        const k = start.length, one = { N: Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? 1n : 0n))), D: 1n };
        const mul0 = (A, B) => ({ N: A.N.map(row => B.N[0].map((_, c) => { let t = 0n; for (let q = 0; q < k; q++) t += row[q] * B.N[q][c]; return t; })), D: A.D * B.D });
        const inv0 = L => ({ N: L.N.map((row, i) => row.map((_, j) => ((i === 0) !== (j === 0) ? -L.N[j][i] : L.N[j][i]))), D: L.D });   // J L^T J
        const eq = (A, B) => A.N.every((row, i) => row.every((v, j) => v * B.D === B.N[i][j] * A.D));
        const r = X.pump(dq.map(x => (x ? intMat(x) : one)), mul0, inv0, one);
        const v = intVec(start), y = intVec(end);
        const tele = r.P.N.every((row, i) => { let t = 0n; for (let q = 0; q < k; q++) t += row[q] * v.N[q]; return t * y.D === y.N[i] * r.P.D * v.D; });
        return eq(r.Q10, r.Pinv) && eq(r.Q8, r.Pinv) && eq(r.H, r.Pinv) && tele;
    };
    X.innerBlockSizes = () => Array.from({ length: 10 }, (_, l) => Array.from({ length: 72 }, (_, m) => m).filter(m => Math.floor(10 * m / 72) === l).length);

    // ============================================================ track A: the hyperboloid in floating point
    const H = {};
    H.lorentz = (a, b) => { let s = 0; for (let i = 1; i < a.length; i++) s += a[i] * b[i]; return -a[0] * b[0] + s; };
    H.dist = (a, b) => Math.acosh(Math.max(1, -H.lorentz(a, b)));
    H.fromPoincare = p => { let q = 0; for (const v of p) q += v * v; return [(1 + q) / (1 - q), ...p.map(v => (2 * v) / (1 - q))]; };
    H.toPoincare = y => y.slice(1).map(v => v / (1 + y[0]));
    H.toKlein = y => y.slice(1).map(v => v / y[0]);
    H.fromKlein = k => { let q = 0; for (const v of k) q += v * v; const g = 1 / Math.sqrt(1 - q); return [g, ...k.map(v => g * v)]; };
    H.boost = x => {
        const d = x.length - 1, x0 = x[0], xb = x.slice(1), L = [[x0, ...xb]];
        for (let i = 0; i < d; i++) L.push([xb[i], ...xb.map((xj, j) => (i === j ? 1 : 0) + (xb[i] * xj) / (1 + x0))]);
        return L;
    };
    H.matvec = (A, v) => A.map(row => { let s = 0; for (let k = 0; k < row.length; k++) s += row[k] * v[k]; return s; });
    H.matmul = (A, B) => A.map(row => B[0].map((_, c) => { let s = 0; for (let k = 0; k < row.length; k++) s += row[k] * B[k][c]; return s; }));
    H.transpose = A => A[0].map((_, j) => A.map(row => row[j]));
    H.norm = v => { let s = 0; for (const x of v) s += x * x; return Math.sqrt(s); };
    H.expOrigin = v => { const n = H.norm(v), safe = n > 0 ? n : 1; return [Math.cosh(n), ...v.map(x => (Math.sinh(n) * x) / safe)]; };
    H.logOrigin = y => { const n = H.norm(y.slice(1)), safe = n > 0 ? n : 1; const a = Math.acosh(Math.max(1, y[0])); return y.slice(1).map(x => (a * x) / safe); };
    H.expAt = (x, v) => H.matvec(H.boost(x), H.expOrigin(v));
    H.lorentzCentroid = (V, w) => {
        const s = V[0].map((_, i) => { let t = 0; for (let k = 0; k < V.length; k++) t += w[k] * V[k][i]; return t; });
        const n = Math.sqrt(-H.lorentz(s, s));
        return s.map(v => v / n);
    };
    H.kleinWeights = (V, w) => { const lam = V.map((v, k) => w[k] * v[0]); const S = lam.reduce((a, b) => a + b, 0); return lam.map(v => v / S); };
    H.J = d => Array.from({ length: d + 1 }, (_, i) => Array.from({ length: d + 1 }, (_, j) => (i === j ? (i === 0 ? -1 : 1) : 0)));
    H.lorentzInverse = L => { const d = L.length - 1; return H.matmul(H.matmul(H.J(d), H.transpose(L)), H.J(d)); };
    H.liftSpatial = y => { let q = 1; for (let i = 1; i < y.length; i++) q += y[i] * y[i]; return [Math.sqrt(q), ...y.slice(1)]; };   // keep ȳ, recompute y0
    H.projectToSheet = y => { const n = Math.sqrt(-H.lorentz(y, y)) * Math.sign(y[0]); return y.map(v => v / n); };
    H.solve = (A, B) => {                                            // float Gauss-Jordan with partial pivoting: A^-1 B
        const n = A.length, M = A.map((row, i) => [...row, ...B[i]]);
        for (let c = 0; c < n; c++) {
            let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
            [M[c], M[p]] = [M[p], M[c]];
            const piv = M[c][c]; M[c] = M[c].map(x => x / piv);
            for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f !== 0) M[r] = M[r].map((x, k) => x - f * M[c][k]); }
        }
        return M.map(row => row.slice(n));
    };

    // ============================================================ the step
    const at = (v, t) => (v && typeof v.at === 'function' ? v.at(t) : v);
    const CosineSchedule = (init, target, total) => ({ at: t => target + 0.5 * (init - target) * (1 + Math.cos(Math.PI * Math.min(t, total) / total)) });
    const PowerDecay = (init, gamma = 0.1, target = 0) => ({ at: t => Math.max(init * Math.pow(Math.max(t, 0) + 1, -(0.5 + gamma)), target) });

    function stepConfig(o = {}) {
        return Object.assign({ epsilon: 0.1, stepRadius: 0.5, probeRadius: null, numProbe: 1, probeJitter: 0, solver: 'softmax',
            geometry: 'hyperbolic', rotation: 'cayley', cayleyK: 4, block: null, exact: false, snapBits: 24, elitist: true,
            flatFactors: [], horizon: 8 }, o);
    }

    // softmax(-C/eps) per row, as polystep's SoftmaxSolver (shifted by the row minimum)
    function softmaxWeights(C, eps) {
        return C.map(row => {
            let mn = Infinity; for (const c of row) mn = Math.min(mn, c);
            const e = row.map(c => Math.exp(-(c - mn) / eps));
            let S = 0; for (const v of e) S += v;
            return e.map(v => v / S);
        });
    }
    // Log-domain Sinkhorn with uniform marginals, as polystep's SinkhornSolver at its defaults (approximate parity).
    function sinkhornWeights(C, eps, iters = 2000, threshold = 3e-5) {
        const P = C.length, V = C[0].length, la = -Math.log(P), lb = -Math.log(V);
        let mn = Infinity; for (const row of C) for (const c of row) mn = Math.min(mn, c);
        const K = C.map(row => row.map(c => -(c - mn) / eps));
        const f = new Array(P).fill(0), g = new Array(V).fill(0);
        const lse = arr => { let m = -Infinity; for (const v of arr) m = Math.max(m, v); let s = 0; for (const v of arr) s += Math.exp(v - m); return m + Math.log(s); };
        for (let it = 0; it < iters; it++) {
            for (let p = 0; p < P; p++) f[p] = la - lse(K[p].map((k, v) => k + g[v]));
            for (let v = 0; v < V; v++) g[v] = lb - lse(K.map((row, p) => row[v] + f[p]));
            if (it % 10 === 9) {
                let err = 0;
                for (let p = 0; p < P; p++) { let s = 0; for (let v = 0; v < V; v++) s += Math.exp(K[p][v] + f[p] + g[v]); err = Math.max(err, Math.abs(s * P - 1)); }
                if (err < threshold) break;
            }
        }
        return K.map((row, p) => { const r = row.map((k, v) => Math.exp(k + f[p] + g[v])); let S = 0; for (const x of r) S += x; return r.map(x => x / S); });
    }

    class PolyStepH {
        // objective(points): points is an array of candidate states (each an array of m factors); returns costs
        constructor(objective, m, d, cfg, rng) {
            this.f = objective; this.m = m; this.d = d; this.cfg = stepConfig(cfg); this.rng = rng;
            this.hyper = this.cfg.geometry === 'hyperbolic';
            if (this.cfg.exact && !this.hyper) throw new Error('exact mode is for the hyperbolic geometry');
            this.flat = new Set(this.cfg.flatFactors);
            this.fixedR = null;
            this.orient = null;              // version 2 steer mode: orient(idx, R, Rq) -> [R, Rq] turns each polytope by the frames
        }
        initState(X0) {
            const st = { X: X0.map(row => row.map(y => y.slice())), Xq: null, bestCost: null, bestX: null, iteration: 0, evaluations: 0,
                history: [], chart: null, bestChart: null };
            if (this.cfg.exact) {
                st.Xq = st.X.map(row => row.map(y => X.snap(y, this.cfg.snapBits)[0]));
                st.X = st.Xq.map(row => row.map(X.toFloat));
            }
            if (this.f.rechart) this.f.rechart(st);
            return st;
        }
        rotations(P, D) {
            if (this.fixedR) return this.fixedR;
            if (this.cfg.rotation === 'cayley_exact') {
                const Rq = Array.from({ length: P }, () => X.randomRotation(this.rng, D, this.cfg.cayleyK));
                return [Rq.map(R => R.map(row => row.map(v => v.toNumber()))), Rq];
            }
            const Rs = [];
            for (let p = 0; p < P; p++) {
                const A = X.randomSkew(this.rng, D, this.cfg.cayleyK).map(row => row.map(v => v.toNumber()));
                const I = A.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)));
                const minus = I.map((row, i) => row.map((x, j) => x - A[i][j])), plus = I.map((row, i) => row.map((x, j) => x + A[i][j]));
                Rs.push(H.matmul(minus, H.solve(plus, I)));
            }
            return [Rs, null];
        }
        blockOf() {
            const b = this.cfg.block;
            if (b === null || b === undefined || b >= this.m) return Array.from({ length: this.m }, (_, i) => i);
            return this.rng.sample(this.m, b).sort((a, c) => a - c);
        }
        move(x, idx, v) {                                             // one candidate: x with factors idx moved by v[a]
            const out = x.map(y => y.slice());
            idx.forEach((i, a) => {
                if (this.hyper && !this.flat.has(i)) out[i] = H.expAt(x[i], v[a]);
                else if (this.hyper) out[i] = [1, ...x[i].slice(1).map((z, c) => z + v[a][c])];
                else out[i] = x[i].map((z, c) => z + v[a][c]);
            });
            return out;
        }
        candidates(st, p, idx, dirs, length, Rq) {
            const fl = dirs.map(dv => this.move(st.X[p], idx, dv.map(chunk => chunk.map(c => length * c))));
            if (!this.cfg.exact) return [fl, null];
            const k = this.cfg.snapBits, exactPts = [];
            if (idx.length === 1 && Rq) {
                const t = new Q(BigInt(halfUp(Math.tanh(length / 2) * Math.pow(2, k))), 1n << BigInt(k));
                for (const u of X.orthoplexDirections(Rq)) { const row = st.Xq[p].slice(); row[idx[0]] = X.pointAt(st.Xq[p][idx[0]], t, u); exactPts.push(row); }
            } else {
                for (const cand of fl) { const row = st.Xq[p].slice(); for (const i of idx) row[i] = X.snap(cand[i], k)[0]; exactPts.push(row); }
            }
            return [exactPts.map(row => row.map(X.toFloat)), exactPts];
        }
        clamp(Xs, idx) {
            const R = this.cfg.horizon; if (R === null || R === undefined) return 0;
            let count = 0;
            for (const row of Xs) for (const i of idx) {
                if (this.hyper && !this.flat.has(i)) {
                    const rad = Math.acosh(Math.max(1, row[i][0]));
                    if (rad > R) { const v = H.logOrigin(row[i]); const n = H.norm(v); row[i] = H.expOrigin(v.map(x => x * (R / n))); count++; }
                } else {
                    const z = this.hyper ? row[i].slice(1) : row[i], n = H.norm(z);
                    if (n > R) { const zz = z.map(x => x * (R / n)); row[i] = this.hyper ? [row[i][0], ...zz] : zz; count++; }
                }
            }
            return count;
        }
        weights(C, eps) { return this.cfg.solver === 'sinkhorn' && C.length > 1 ? sinkhornWeights(C, eps) : softmaxWeights(C, eps); }

        step(st, record = false) {
            const cfg = this.cfg, t = st.iteration;
            const eps = at(cfg.epsilon, t), r = at(cfg.stepRadius, t);
            let rho = cfg.probeRadius === null ? 2 * r : at(cfg.probeRadius, t);
            if (cfg.probeJitter) rho *= 1 + cfg.probeJitter * (2 * this.rng.random() - 1);
            const P = st.X.length, idx = this.blockOf(), b = idx.length, d = this.d, D = b * d;
            let [R, Rq] = this.rotations(P, D);
            if (this.orient) [R, Rq] = this.orient(idx, R, Rq);
            const fr = Array.from({ length: cfg.numProbe }, (_, i) => (i + 1) / (cfg.numProbe + 1));
            const C = [], corners = [], exactCorners = cfg.exact ? [] : null, probesBest = [];
            for (let p = 0; p < P; p++) {
                if (this.f.focus) this.f.focus(st.chart ? st.chart[p] : null);
                // direction k: R(+e_k) for k < D, R(-e_{k-D}) after; cut into b chunks of d
                const dirs = [];
                for (let k = 0; k < 2 * D; k++) {
                    const col = k < D ? k : k - D, sg = k < D ? 1 : -1, v = R[p].map(row => sg * row[col]);
                    dirs.push(Array.from({ length: b }, (_, a) => v.slice(a * d, a * d + d)));
                }
                const [cp, cq] = this.candidates(st, p, idx, dirs, r, Rq ? Rq[p] : null);
                corners.push(cp); if (cfg.exact) exactCorners.push(cq);
                const costs = [], ptsAll = [];
                for (const s of fr) {
                    const pts = Math.abs(s * rho - r) < 1e-15 ? cp : this.candidates(st, p, idx, dirs, s * rho, Rq ? Rq[p] : null)[0];
                    ptsAll.push(pts); costs.push(Array.from(this.f(pts)));
                }
                C.push(costs[0].map((_, k) => { let s = 0; for (const c of costs) s += c[k]; return s / costs.length; }));
                st.evaluations += 2 * D * fr.length;
                let best = Infinity, bs = 0, bj = 0;
                costs.forEach((row, s) => row.forEach((c, j) => { if (c < best) { best = c; bs = s; bj = j; } }));
                probesBest.push([best, ptsAll[bs][bj]]);
            }
            const W = this.weights(C, eps);
            const newX = st.X.map(row => row.map(y => y.slice()));
            for (let p = 0; p < P; p++) idx.forEach(i => {
                const V = corners[p].map(c => c[i]);
                if (this.hyper && !this.flat.has(i)) newX[p][i] = H.lorentzCentroid(V, W[p]);
                else newX[p][i] = V[0].map((_, c) => { let s = 0; for (let k = 0; k < V.length; k++) s += W[p][k] * V[k][c]; return s; });
            });
            const clamped = this.clamp(newX, idx);
            const info = { iteration: t, epsilon: eps, radius: r, probeRadius: rho, block: idx, clamped, C, W };
            if (this.hyper) {
                const hyp = idx.filter(i => !this.flat.has(i));
                if (hyp.length) {
                    info.kleinMove = st.X.map((row, p) => hyp.reduce((a, i) => a + H.norm(H.toKlein(newX[p][i]).map((v, c) => v - H.toKlein(row[i])[c])), 0) / hyp.length);
                    info.kleinRadius = st.X.map(row => hyp.reduce((a, i) => a + H.norm(H.toKlein(row[i])), 0) / hyp.length);
                }
                info.productMove = st.X.map((row, p) => Math.sqrt(idx.reduce((a, i) => {
                    const m = this.flat.has(i) ? H.norm(newX[p][i].slice(1).map((v, c) => v - row[i][c + 1])) : H.dist(row[i], newX[p][i]);
                    return a + m * m; }, 0)));
            } else info.productMove = st.X.map((row, p) => Math.sqrt(row.reduce((a, y, i) => a + y.reduce((b2, v, c) => b2 + (newX[p][i][c] - v) ** 2, 0), 0)));
            let finalX = newX;
            if (cfg.exact) {
                let snapMax = 0;
                const newXq = st.Xq.map(row => row.slice());
                for (let p = 0; p < P; p++) for (const i of idx) { const [y, mv] = X.snap(newX[p][i], cfg.snapBits); newXq[p][i] = y; snapMax = Math.max(snapMax, mv); }
                info.snapMax = snapMax;
                st.Xq = newXq;
                finalX = newXq.map(row => row.map(X.toFloat));
            }
            if (record) Object.assign(info, { corners, exactCorners, R, Rq, Xbefore: st.X });
            if (cfg.elitist) {
                if (st.bestCost === null) { st.bestCost = new Array(P).fill(Infinity); st.bestX = st.X.map(row => row.map(y => y.slice())); if (st.chart) st.bestChart = st.chart.slice(); }
                probesBest.forEach(([c, pt], p) => { if (c < st.bestCost[p]) { st.bestCost[p] = c; st.bestX[p] = pt; if (st.chart) st.bestChart[p] = st.chart[p]; } });
            }
            st.X = finalX;
            if (this.f.rechart) this.f.rechart(st);
            st.iteration++;
            const h = { iteration: t, epsilon: eps, radius: r, costMean: mean2(C), costMin: Math.min(...C.flat()) };
            if (info.snapMax !== undefined) h.snapMax = info.snapMax;
            if (info.kleinMove) { h.kleinMove = info.kleinMove; h.kleinRadius = info.kleinRadius; }
            st.history.push(h);
            return info;
        }
    }
    const mean2 = C => { let s = 0, n = 0; for (const row of C) for (const c of row) { s += c; n++; } return s / n; };

    // ============================================================ the problems
    const P = {};
    P.plantedThreeColouring = (n, c, rng) => {
        const classes = rng.shuffle(Array.from({ length: n }, (_, i) => i % 3));
        const m = halfUp(c * n / 2);
        const sizes = [0, 1, 2].map(k => classes.filter(x => x === k).length);
        const cross = sizes[0] * sizes[1] + sizes[0] * sizes[2] + sizes[1] * sizes[2];
        if (m > cross) throw new RangeError(`${m} edges asked for, but only ${cross} pairs lie between classes`);
        const edges = [], seen = new Set();
        while (edges.length < m) {
            const u = rng.below(n), v = rng.below(n);
            if (u === v || classes[u] === classes[v]) continue;
            const e = [Math.min(u, v), Math.max(u, v)], key = e[0] * n + e[1];
            if (!seen.has(key)) { seen.add(key); edges.push(e); }
        }
        return { classes, edges };
    };
    // Branch of a direction, by comparisons only; works on numbers and on Q
    P.colourOf = (x, y) => {
        if (x instanceof Q) {
            const zero = Q.ZERO, yy = y.mul(y), xx3 = new Q(3n).mul(x.mul(x));
            if (x.isZero() && y.isZero()) return 0;
            if (x.cmp(zero) > 0 && (y.cmp(zero) < 0 || yy.cmp(xx3) < 0) && (y.cmp(zero) >= 0 || yy.cmp(xx3) <= 0)) return 0;
            if (y.cmp(zero) > 0 && (x.cmp(zero) <= 0 || yy.cmp(xx3) >= 0)) return 1;
            return 2;
        }
        if (x === 0 && y === 0) return 0;
        if (x > 0 && (y < 0 || y * y < 3 * x * x) && (y >= 0 || y * y <= 3 * x * x)) return 0;
        if (y > 0 && (x <= 0 || y * y >= 3 * x * x)) return 1;
        return 2;
    };
    class ThreeColouring {
        constructor(n, c, rng, hyper = true) { Object.assign(this, P.plantedThreeColouring(n, c, rng)); this.n = n; this.c = c; this.hyper = hyper; this.m = n; this.d = 2; }
        colours(state) { return state.map(y => (this.hyper ? P.colourOf(y[1], y[2]) : P.colourOf(y[0], y[1]))); }
        conflicts(cols) { let k = 0; for (const [u, v] of this.edges) if (cols[u] === cols[v]) k++; return k; }
        call(pts) { return pts.map(s => this.conflicts(this.colours(s))); }
        helixB(state) { return this.conflicts(this.colours(state)); }
        initPoints(rng, Pn, spread = 0.05) {
            return Array.from({ length: Pn }, () => Array.from({ length: this.n }, () => {
                const z = [spread * (2 * rng.random() - 1), spread * (2 * rng.random() - 1)];
                return this.hyper ? H.fromPoincare(z) : z;
            }));
        }
    }
    P.maxsatInstance = (n, ratio = 4.27, seed = 42, source = 'polystep') => {
        const m = Math.trunc(n * ratio), lits = [];
        if (source === 'polystep') {
            const r = new PyRandom(seed);
            for (let i = 0; i < m; i++) lits.push(r.sampleRange(n, 3).map(v => v + n * (r.random() < 0.5 ? 1 : 0)));
        } else {
            const r = new Rng(seed);
            for (let i = 0; i < m; i++) lits.push(r.sample(n, 3).map(v => v + n * (r.random() < 0.5 ? 1 : 0)));
        }
        return lits;
    };
    class MaxSat {
        constructor(n, { ratio = 4.27, seed = 42, hyper = true, source = 'polystep', block = 8 } = {}) {
            this.n = n; this.hyper = hyper; this.block = block; this.lits = P.maxsatInstance(n, ratio, seed, source);
            this.m = Math.ceil(n / block); this.d = block;
        }
        truth(state) { const t = []; for (const y of state) for (const v of (this.hyper ? y.slice(1) : y)) t.push(v > 0); return t.slice(0, this.n); }
        unsat(t) { let k = 0; for (const c of this.lits) if (!c.some(l => (l >= this.n ? t[l - this.n] : !t[l]))) k++; return k; }
        call(pts) { return pts.map(s => this.unsat(this.truth(s)) / this.lits.length); }
        helixB(state) { return this.unsat(this.truth(state)); }
        initPoints(rng, Pn, spread = 0.05) {
            return Array.from({ length: Pn }, () => Array.from({ length: this.m }, () => {
                const z = Array.from({ length: this.d }, () => spread * (2 * rng.random() - 1));
                return this.hyper ? H.fromPoincare(z) : z;
            }));
        }
    }
    // ---- B3: the norm-5 tree
    P.GENS = [[1, 2, 0, 0], [1, -2, 0, 0], [1, 0, 2, 0], [1, 0, -2, 0], [1, 0, 0, 2], [1, 0, 0, -2]].map(g => g.map(BigInt));
    P.INV = [1, 0, 3, 2, 5, 4];
    const qmulI = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
        a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
    const qconjI = a => [a[0], -a[1], -a[2], -a[3]];
    P.wordQuaternion = word => word.reduce((q, g) => qmulI(q, P.GENS[g]), [1n, 0n, 0n, 0n]);
    P.rightDivide = (q, L) => {
        const word = [];
        for (let s = 0; s < L; s++) {
            const hits = [0, 1, 2, 3, 4, 5].filter(g => qmulI(q, qconjI(P.GENS[g])).every(c => c % 5n === 0n));
            if (hits.length !== 1) return null;
            q = qmulI(q, qconjI(P.GENS[hits[0]])).map(c => c / 5n); word.push(hits[0]);
        }
        const unit = (q[0] === 1n || q[0] === -1n) && q[1] === 0n && q[2] === 0n && q[3] === 0n;
        return unit ? word.reverse() : null;
    };
    P.isReduced = w => w.every((g, i) => i === w.length - 1 || w[i + 1] !== P.INV[g]);
    P.children = w => [0, 1, 2, 3, 4, 5].filter(g => !w.length || g !== P.INV[w[w.length - 1]]);
    P.treeDistance = (a, b) => { let k = 0; while (k < Math.min(a.length, b.length) && a[k] === b[k]) k++; return (a.length - k) + (b.length - k); };
    const rot3 = a => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
    const boostX = t => [[Math.cosh(t), Math.sinh(t), 0], [Math.sinh(t), Math.cosh(t), 0], [0, 0, 1]];
    class TreeEmbedding {
        constructor(tau = 3) {
            this.tau = tau;
            this.step = [0, 1, 2, 3, 4, 5].map(k => H.matmul(H.matmul(rot3(2 * Math.PI * k / 6), boostX(tau)), rot3(Math.PI)));
            this.stepInv = this.step.map(H.lorentzInverse);
        }
        slot(word, g) { return P.children(word).indexOf(g) + (word.length ? 1 : 0); }
        point(word) { let M = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; word.forEach((g, i) => { M = H.matmul(M, this.step[this.slot(word.slice(0, i), g)]); }); return M.map(r => r[0]); }
        decode(y, L, anchor = []) {
            const up = [y.slice()];
            for (let i = anchor.length - 1; i >= 0; i--) up.push(H.matvec(this.step[this.slot(anchor.slice(0, i), anchor[i])], up[up.length - 1]));
            up.reverse();
            const word = []; let local = up[0], onPath = true;
            for (let level = 0; level < L; level++) {
                let best = null, bg = null, bs = null;
                for (const g of P.children(word)) {
                    const sl = this.slot(word, g), c = this.step[sl].map(r => r[0]);
                    const dd = local[0] * c[0] - local[1] * c[1] - local[2] * c[2];
                    if (best === null || dd < best) { best = dd; bg = g; bs = sl; }
                }
                word.push(bg);
                if (onPath && level < anchor.length && bg === anchor[level]) { local = up[level + 1]; continue; }
                onPath = false; local = H.matvec(this.stepInv[bs], local);
            }
            return word;
        }
        reanchor(anchor, y, L) {
            const path = this.decode(y, L, anchor), up = [y.slice()];
            for (let i = anchor.length - 1; i >= 0; i--) up.push(H.matvec(this.step[this.slot(anchor.slice(0, i), anchor[i])], up[up.length - 1]));
            let k = 0; while (k < Math.min(anchor.length, path.length) && anchor[k] === path[k]) k++;
            let local = up[anchor.length - k], bestWord = path.slice(0, k), bestLocal = local, bestD = local[0];
            for (let i = k; i < path.length; i++) {
                local = H.matvec(this.stepInv[this.slot(path.slice(0, i), path[i])], local);
                if (local[0] < bestD) { bestWord = path.slice(0, i + 1); bestLocal = local; bestD = local[0]; } else if (local[0] > bestD * 50) break;
            }
            return [bestWord, H.projectToSheet(bestLocal)];
        }
    }
    class TreeAddress {
        constructor(L, target, { tau = 3, objective = 'graded', hyper = true } = {}) {
            this.L = L; this.target = target.slice(); this.objective = objective; this.hyper = hyper;
            this.emb = new TreeEmbedding(tau); this.m = 1; this.d = 2; this.size = 6 * Math.pow(5, L - 1); this._anchor = [];
        }
        focus(chart) { this._anchor = chart ? chart.slice() : []; }
        rechart(st) {
            if (!st.chart) st.chart = st.X.map(() => []);
            st.X.forEach((row, p) => {
                const y = this.hyper ? row[0] : H.expOrigin(row[0]);
                const [a, z] = this.emb.reanchor(st.chart[p], y, this.L);
                st.chart[p] = a; row[0] = this.hyper ? z : H.logOrigin(z);
            });
        }
        call(pts) {
            return pts.map(s => { const y = this.hyper ? s[0] : H.expOrigin(s[0]); const w = this.emb.decode(y, this.L, this._anchor);
                return this.objective === 'graded' ? P.treeDistance(w, this.target) : (w.join() === this.target.join() ? 0 : 1); });
        }
        helixB(state, chart = []) {
            const y = this.hyper ? state[0] : H.expOrigin(state[0]), w = this.emb.decode(y, this.L, chart || []);
            const q = P.wordQuaternion(w), norm = q.reduce((s, c) => s + c * c, 0n);
            const rd = P.rightDivide(q, this.L);
            return { word: w, certified: norm === 5n ** BigInt(this.L) && rd !== null && rd.join() === w.join() && P.isReduced(w), distance: P.treeDistance(w, this.target) };
        }
        static randomTarget(rng, L) { const w = [rng.below(6)]; while (w.length < L) { const k = P.children(w); w.push(k[rng.below(k.length)]); } return w; }
    }
    // ---- B4: a hard-threshold network
    P.gaussian = rng => { const u1 = rng.random(), u2 = rng.random(); return Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2); };
    P.hierarchicalData = (rng, nTrain = 2000, nTest = 1000, dim = 16, noise = 0.5) => {
        const unit = () => { const v = Array.from({ length: dim }, () => P.gaussian(rng)); const n = H.norm(v); return v.map(x => x / n); };
        const node = {}; for (let l = 1; l <= 3; l++) for (let k = 0; k < 2 ** l; k++) node[l + ',' + k] = unit();
        const means = Array.from({ length: 8 }, (_, c) => { const m = new Array(dim).fill(0); for (let l = 1; l <= 3; l++) node[l + ',' + (c >> (3 - l))].forEach((v, i) => { m[i] += Math.pow(2, -(l - 1)) * v; }); return m; });
        const draw = N => { const y = Array.from({ length: N }, () => rng.below(8)); const x = y.map(c => means[c].map(m => m + noise * P.gaussian(rng))); return { x, y }; };
        return { train: draw(nTrain), test: draw(nTest), means };
    };
    class HardThresholdNet {
        constructor(data, rng, { hyper = true, batch = 256 } = {}) {
            this.data = data; this.rng = rng; this.hyper = hyper; this.batch = batch; this.m = 24; this.d = 2;
            this.enc = Array.from({ length: 16 }, (_, i) => i); this.protos = Array.from({ length: 8 }, (_, i) => 16 + i);
            this.flatFactors = hyper ? this.enc.slice() : []; this.resample();
        }
        resample() { this.bi = Array.from({ length: this.batch }, () => this.rng.below(this.data.train.y.length)); }
        predict(state, x) {
            const Wz = this.enc.map(i => (this.hyper ? state[i].slice(1) : state[i]));
            return x.map(xi => {
                const z = [0, 1].map(c => { let s = 0; for (let j = 0; j < 16; j++) s += Wz[j][c] * xi[j]; return s; });
                let best = Infinity, cls = 0;
                this.protos.forEach((pi, k) => {
                    const pr = state[pi];
                    const dd = this.hyper ? (() => { const Z = H.expOrigin(z); return -(-Z[0] * pr[0] + Z[1] * pr[1] + Z[2] * pr[2]); })() : (z[0] - pr[0]) ** 2 + (z[1] - pr[1]) ** 2;
                    if (dd < best) { best = dd; cls = k; }
                });
                return cls;
            });
        }
        call(pts) { const x = this.bi.map(i => this.data.train.x[i]), y = this.bi.map(i => this.data.train.y[i]);
            return pts.map(s => { const p = this.predict(s, x); return p.reduce((a, c, i) => a + (c !== y[i] ? 1 : 0), 0) / y.length; }); }
        accuracy(state, test = true) { const D = test ? this.data.test : this.data.train, p = this.predict(state, D.x);
            return [p.filter((c, i) => c === D.y[i]).length / D.y.length, p.filter((c, i) => (c >> 1) === (D.y[i] >> 1)).length / D.y.length]; }
        helixB(state) { const p = this.predict(state, this.data.train.x); return p.filter((c, i) => c !== this.data.train.y[i]).length; }
        initPoints(rng, Pn, scale = 0.3) {
            return Array.from({ length: Pn }, () => Array.from({ length: this.m }, (_, i) => {
                const z = [scale * (2 * rng.random() - 1), scale * (2 * rng.random() - 1)];
                return this.hyper ? (this.flatFactors.includes(i) ? [1, ...z] : H.fromPoincare(z.map(v => v * 0.5))) : z;
            }));
        }
    }

    // ============================================================ memory words (SHA-256 chain)
    function sha256Hex(str) {
        const bytes = new TextEncoder().encode(str);
        const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
            0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
            0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
            0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
        const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
        const len = bytes.length, total = ((len + 9 + 63) >> 6) << 6, msg = new Uint8Array(total);
        msg.set(bytes); msg[len] = 0x80;
        const bits = len * 8; for (let i = 0; i < 8; i++) msg[total - 1 - i] = Math.floor(bits / 2 ** (8 * i)) & 0xff;
        const w = new Uint32Array(64), ror = (x, n) => (x >>> n) | (x << (32 - n));
        for (let off = 0; off < total; off += 64) {
            for (let i = 0; i < 16; i++) w[i] = (msg[off + 4 * i] << 24) | (msg[off + 4 * i + 1] << 16) | (msg[off + 4 * i + 2] << 8) | msg[off + 4 * i + 3];
            for (let i = 16; i < 64; i++) {
                const s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10);
                w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
            }
            let [a, b, c, d, e, f, g, hh] = h;
            for (let i = 0; i < 64; i++) {
                const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25), ch = (e & f) ^ (~e & g), t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
                const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) >>> 0;
                hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
            }
            [a, b, c, d, e, f, g, hh].forEach((v, i) => { h[i] = (h[i] + v) >>> 0; });
        }
        return h.map(v => v.toString(16).padStart(8, '0')).join('');
    }
    const pyList = a => '[' + a.join(', ') + ']';
    function memoryWord(F, costs, best, extra = '') {
        const Y = costs.reduce((a, b) => a + b, 0);
        return { F, costs: costs.slice(), Y, best, hash: sha256Hex(`${F}|${pyList(costs)}|${Y}|${best}|${extra}`).slice(0, 16) };
    }

    // ============================================================ three channels on the zero-point clock
    const ON = [18, 10, 2], OFF = [6, 22, 14];
    function scheduleFacts() {
        return { onloadK: ON.map(n => n % 8), offloadK: OFF.map(n => n % 8), onloadBranch: ON.map(n => n % 3), offloadBranch: OFF.map(n => n % 3),
            delay: [0, 1, 2].map(j => (OFF[j] - ON[j] + 24) % 24), disjoint: !ON.some(n => OFF.includes(n)),
            maxInFlight: Math.max(...Array.from({ length: 24 }, (_, n) => [0, 1, 2].filter(j => (n - ON[j] + 24) % 24 <= 12).length)) };
    }
    function transvection(a, b, frac) {
        const dd = H.dist(a, b);
        if (dd < 1e-15) return a.map((_, i) => a.map((_, j) => (i === j ? 1 : 0)));
        const vo = H.matvec(H.lorentzInverse(H.boost(a)), b), sp = vo.slice(1), n = H.norm(sp);
        if (!(n > 0)) return a.map((_, i) => a.map((_, j) => (i === j ? 1 : 0)));   // a and b equal to rounding
        const u = sp.map(x => x / n);
        const c = H.expAt(a, u.map(x => frac * dd * x));
        return H.matmul(H.boost(c), H.lorentzInverse(H.boost(a)));
    }
    class TriChannel {
        constructor(solvers, states, problem, { clutch = 'membrane', mu = 0.5, patience = 3, exactRegister = false } = {}) {
            Object.assign(this, { solvers, states, problem, clutch, mu, patience, exactRegister });
            this.k = solvers.length; this.F = 0; this.resting = new Array(this.k).fill(false); this.stale = new Array(this.k).fill(0);
            this.bestCert = new Array(this.k).fill(Infinity); this.memory = []; this.registers = []; this.membraneLog = [];
            if (exactRegister) this.resetRegister();
        }
        get evaluations() { return this.states.reduce((a, s) => a + s.evaluations, 0); }
        resetRegister() {
            this.regDq = this.states.map(st => st.X.map(row => row.map(() => new Array(720).fill(null))));
            this.regStart = this.states.map(st => st.Xq.map(row => row.slice()));
        }
        record(j, before, only = null) {
            if (!this.exactRegister) return;
            const idx = (this.F - 1) % 720, st = this.states[j];
            st.Xq.forEach((row, p) => row.forEach((y, i) => { if (only !== null && i !== only) return; const b = before[p][i]; if (!y.every((v, c) => v.eq(b[c]))) this.regDq[j][p][i][idx] = X.displacement(b, y); }));
        }
        closeRegister() {
            let ok = true;
            this.states.forEach((st, j) => st.Xq.forEach((row, p) => row.forEach((y, i) => {
                ok = ok && X.pumpHolds(this.regDq[j][p][i], this.regStart[j][p][i], y);
            })));
            this.registers.push({ F: this.F, pump_identity: ok });
            this.resetRegister();
        }
        certify(j) {
            const st = this.states[j];
            let p = 0; if (st.bestCost) st.bestCost.forEach((c, i) => { if (c < st.bestCost[p]) p = i; });
            const point = st.bestX ? st.bestX[p] : st.X[p];
            const c = st.chart ? this.problem.helixB(point, st.bestChart ? st.bestChart[p] : st.chart[p]) : this.problem.helixB(point);
            return [typeof c === 'object' ? c.distance : c, point];
        }
        zeroPoint() {
            const certs = this.solvers.map((_, j) => this.certify(j)), costs = certs.map(c => c[0]);
            let best = 0; costs.forEach((c, j) => { if (c < costs[best]) best = j; });
            let improvedAny = false;
            costs.forEach((c, j) => { if (c < this.bestCert[j]) { this.bestCert[j] = c; this.stale[j] = 0; improvedAny = true; } else this.stale[j]++; });
            this.memory.push(memoryWord(this.F, costs, best, this.memory.length ? this.memory[this.memory.length - 1].hash : ''));
            if (this.clutch === 'hold') {
                for (let j = 0; j < this.k; j++) if (this.resting[j] && improvedAny && this.stale[j] > 0) { this.resting[j] = false; this.stale[j] = 0; }
                for (let j = 0; j < this.k; j++) if (!this.resting[j] && this.stale[j] >= this.patience && this.resting.filter(r => !r).length > 1) this.resting[j] = true;
            } else if (this.clutch === 'membrane' && this.k > 1) this.membrane(certs);
            return [costs, best];
        }
        membrane(certs) {
            if (this.states.some(st => st.chart)) throw new Error('the membrane combines points of one chart; use clutch free or hold for charted problems (B3)');
            const costs = certs.map(c => c[0]), mn = Math.min(...costs), e = costs.map(c => Math.exp(-(c - mn)));
            let S = 0; for (const v of e) S += v; const w = e.map(v => v / S);
            const pts = certs.map(c => c[1]), moved = [], s0 = this.solvers[0];
            const nf = pts[0].length;
            for (let i = 0; i < nf; i++) {
                const V = pts.map(p => p[i]);
                const flatI = !s0.hyper || s0.flat.has(i);
                const common = flatI ? V[0].map((_, c) => { let t = 0; for (let k = 0; k < V.length; k++) t += w[k] * V[k][c]; return t; }) : H.lorentzCentroid(V, w);
                this.states.forEach((st, j) => {
                    const before = st.Xq ? st.Xq.map(row => row.slice()) : null;
                    if (!s0.hyper) {
                        const shift = common.map((v, c) => this.mu * (v - V[j][c]));
                        st.X.forEach(row => { row[i] = row[i].map((v, c) => v + shift[c]); });
                        this.solvers[j].clamp(st.X, [i]); moved.push(H.norm(shift));
                        return;
                    }
                    if (flatI) {
                        const shift = common.map((v, c) => this.mu * (v - V[j][c]));
                        st.X.forEach(row => { row[i] = [row[i][0], ...row[i].slice(1).map((v, c) => v + shift[c + 1])]; });
                        moved.push(H.norm(shift.slice(1)));
                    } else {
                        const T = transvection(V[j], common, this.mu);
                        // float states back onto the sheet: rounding near the horizon otherwise compounds (Amendment 3)
                        st.X.forEach(row => { row[i] = st.Xq ? H.matvec(T, row[i]) : H.liftSpatial(H.matvec(T, row[i])); });
                        moved.push(this.mu * H.dist(V[j], common));
                    }
                    this.solvers[j].clamp(st.X, [i]);
                    if (st.Xq) {
                        st.Xq.forEach((row, p) => { row[i] = X.snap(st.X[p][i], this.solvers[j].cfg.snapBits)[0]; st.X[p][i] = X.toFloat(row[i]); });
                        this.record(j, before, i);
                    }
                });
            }
            this.membraneLog.push({ F: this.F, differentialRemoved: moved.length ? Math.max(...moved) : 0 });
        }
        run({ frames = null, budget = null, onZero = null } = {}) {
            for (;;) {
                if (frames !== null && frames <= 0) break;
                if (budget !== null && this.evaluations >= budget) break;
                this.F++;
                const n = this.F % 24;
                for (let j = 0; j < this.k; j++) {
                    if (n === OFF[j % 3] && !this.resting[j]) {
                        const st = this.states[j], before = st.Xq ? st.Xq.map(row => row.slice()) : null;
                        if (this.problem.resample) this.problem.resample();
                        this.solvers[j].step(st); this.record(j, before);
                    }
                }
                if (n === 0) { const [costs, best] = this.zeroPoint(); if (onZero) onZero(this, costs, best); }
                if (this.exactRegister && this.F % 720 === 0) this.closeRegister();
                if (frames !== null) frames--;
            }
            return this;
        }
    }

    // Problem objects are called as f(pts); wrap them so the step can call them directly
    const objective = prob => {
        const f = pts => prob.call(pts);
        if (prob.focus) f.focus = c => prob.focus(c);
        if (prob.rechart) f.rechart = st => prob.rechart(st);
        return f;
    };

    return { Q, qs, Rng, PyRandom, splitmix32, X, H, stepConfig, softmaxWeights, sinkhornWeights, PolyStepH, CosineSchedule, PowerDecay,
        P, ThreeColouring, MaxSat, TreeEmbedding, TreeAddress, HardThresholdNet, sha256Hex, memoryWord, ON, OFF, scheduleFacts,
        transvection, TriChannel, objective, version: '2.0.0' };
});
