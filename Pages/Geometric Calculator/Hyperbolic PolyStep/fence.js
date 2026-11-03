// The 0.7 Claude fence in the browser: Tukey's fence for hyperbolic space, a port of reference/hpstep/fence.py.
// Load hyperbolic_core.js and decoder3d.js first (the tree dataset is version 2's norm-5 tree). Every float and
// every exact value must equal the reference's, so runParityFence replays reference/traces/fence.json.
//
//   HPFence.generate(cfg)          a dataset of exact points of H^2 or H^3, with planted outliers
//   HPFence.fence(points, dim)     the fence: centre, radii, quartiles, mass, fences, verdicts, certificates
//   HPFence.guardCheck(D)          the four-point guard (ln 2) on a distance matrix
//   HPFence.runChecksFence()       CF1-CF9 live, each with a control that must fail
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./hyperbolic_core.js'), require('./decoder3d.js'));
    else root.HPFence = factory(root.HPCore, root.HPDecode3D);
})(typeof self !== 'undefined' ? self : this, function (C, D3) {
    'use strict';
    const { Q, X } = C;

    const LN2 = 0.6931471805599453, LN2_HI = 6.93147180369123816490e-01, LN2_LO = 1.90821492927058770002e-10;
    const INV_LN2 = 1.4426950408889634, SQRT2 = 1.4142135623730951, DATA_BITS = 32;

    // ================================================================ portable floats
    const POW2 = new Map([[0, 1]]);
    { let v = 1; for (let k = 1; k < 1100; k++) { v *= 2; POW2.set(k, v); } v = 1; for (let k = 1; k < 1100; k++) { v *= 0.5; POW2.set(-k, v); } }
    const pow2 = k => POW2.get(k);

    function pexp(x) {
        const k = Math.floor(x * INV_LN2 + 0.5);
        const r = (x - k * LN2_HI) - k * LN2_LO;
        let p = 1;
        for (let j = 20; j > 0; j--) p = 1 + r * p / j;
        return p * pow2(k);
    }
    function pexpm1(x) {
        if (Math.abs(x) < 1) { let p = 1; for (let j = 18; j > 1; j--) p = 1 + x * p / j; return x * p; }
        return pexp(x) - 1;
    }
    function atanhSeries(u, terms) {
        const u2 = u * u; let t = u, s = u;
        for (let k = 1; k <= terms; k++) { t = t * u2; s = s + t / (2 * k + 1); }
        return s;
    }
    function plog(x) {
        let e = Math.floor(Math.log2(x)), m = x * pow2(-e);
        while (m >= 2) { m = m * 0.5; e += 1; }
        while (m < 1) { m = m * 2; e -= 1; }
        if (m > SQRT2) { m = m * 0.5; e += 1; }
        const u = (m - 1) / (m + 1);
        return e * LN2 + 2 * atanhSeries(u, 14);
    }
    const plog1p = x => (Math.abs(x) < 0.25 ? 2 * atanhSeries(x / (2 + x), 12) : plog(1 + x));
    const pacosh1 = am1 => (am1 <= 0 ? 0 : plog1p(am1 + Math.sqrt(am1 * (am1 + 2))));
    function psinhmx(x) {
        if (x < 1) { const x2 = x * x; let p = 1; for (let k = 12; k > 0; k--) p = 1 + x2 * p / ((2 * k + 2) * (2 * k + 3)); return x * x2 / 6 * p; }
        const e = pexp(x);
        return (e - 1 / e) * 0.5 - x;
    }
    const pcoshm1 = x => { const em = pexpm1(x); return em * em / (2 * (em + 1)); };
    const ptanhHalf = r => { const em = pexpm1(r); return em / (em + 2); };

    // ================================================================ mass
    const massOfDistance = (d, dim) => (dim === 2 ? pcoshm1(d) : psinhmx(2 * d));
    const massOfAm1 = (am1, dim) => (dim === 2 ? am1 : psinhmx(2 * pacosh1(am1)));
    function distanceOfMass(m, dim) {
        if (m <= 0) return 0;
        if (dim === 2) return pacosh1(m);
        let lo = 0, hi = 1;
        while (psinhmx(2 * hi) < m) hi = hi * 2;
        for (let i = 0; i < 90; i++) { const mid = (lo + hi) * 0.5; if (psinhmx(2 * mid) < m) lo = mid; else hi = mid; }
        return (lo + hi) * 0.5;
    }
    const rhoOfMass = (m, dim) => (dim === 2 ? Math.sqrt(m / (m + 2)) : ptanhHalf(distanceOfMass(m, dim)));
    const ballMass = (R, dim) => massOfDistance(R, dim);

    // ================================================================ big integers
    const absB = a => (a < 0n ? -a : a);
    const gcdB = (a, b) => { a = absB(a); b = absB(b); while (b) [a, b] = [b, a % b]; return a; };
    const bitLen = a => (a === 0n ? 0 : a.toString(2).length);
    function isqrt(n) {
        if (n < 2n) return n;
        let x = 1n << BigInt(Math.ceil(bitLen(n) / 2));
        for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; }
    }
    // n / d correctly rounded to the nearest double, ties to even (Python's int / int), d > 0
    function ratio(n, d) {
        if (n === 0n) return 0;
        const neg = n < 0n, a = absB(n);
        const s = 65 - (bitLen(a) - bitLen(d));
        let q, r;
        if (s >= 0) { const A = a << BigInt(s); q = A / d; r = A % d; } else { const B = d << BigInt(-s); q = a / B; r = a % B; }
        if (r !== 0n) q |= 1n;
        const x = Number(q) * Math.pow(2, -s);
        return neg ? -x : x;
    }

    // ================================================================ exact points
    function dyadic(p, K = DATA_BITS) {
        const s = Math.pow(2, K), lim = 1n << BigInt(2 * K);
        let n = p.map(v => BigInt(Math.floor(v * s + 0.5)));
        while (n.reduce((a, t) => a + t * t, 0n) >= lim) n = n.map(t => (t > 0n ? t - 1n : t < 0n ? t + 1n : 0n));
        const den = 1n << BigInt(K);
        return n.map(t => new Q(t, den));
    }
    const lift = (p, K = DATA_BITS) => X.ghost(dyadic(p, K));
    const qs = v => v.toString();
    function intrep(x) {
        let den = 1n;
        for (const v of x) den = den / gcdB(den, v.d) * v.d;
        return [x.map(v => v.n * (den / v.d)), den];
    }
    const lneg = (A, B) => { let s = A[0] * B[0]; for (let i = 1; i < A.length; i++) s -= A[i] * B[i]; return s; };

    // ================================================================ data
    class Gen {
        constructor(seed) { this.rng = new C.Rng(seed); this.spare = null; }
        direction(n) {
            for (;;) {
                const v = Array.from({ length: n }, () => 2 * this.rng.random() - 1);
                let s = 0; for (const t of v) s += t * t;
                if (1e-6 < s && s <= 1) { const r = Math.sqrt(s); return v.map(t => t / r); }
            }
        }
        normal() {
            if (this.spare !== null) { const z = this.spare; this.spare = null; return z; }
            for (;;) {
                const x = 2 * this.rng.random() - 1, y = 2 * this.rng.random() - 1, s = x * x + y * y;
                if (0 < s && s < 1) { const f = Math.sqrt(-2 * plog(s) / s); this.spare = y * f; return x * f; }
            }
        }
    }
    function treeWords(L) {
        const words = [[]];
        for (let l = 0; l < L; l++) for (const w of words.filter(w => w.length === l)) for (const c of C.P.children(w)) words.push([...w, c]);
        return words;
    }
    function generate(cfg) {
        const dim = cfg.dim, kind = cfg.kind, g = new Gen(cfg.seed || 0);
        let pts = [];
        if (kind === 'ball') {
            const mR = ballMass(cfg.R, dim);
            for (let i = 0; i < cfg.N; i++) { const m = g.rng.random() * mR, u = g.direction(dim), rho = rhoOfMass(m, dim); pts.push(lift(u.map(t => rho * t))); }
        } else if (kind === 'gauss') {
            const s = cfg.sigma;
            for (let i = 0; i < cfg.N; i++) {
                const v = Array.from({ length: dim }, () => s * g.normal());
                let r2 = 0; for (const t of v) r2 += t * t;
                const r = Math.sqrt(r2);
                if (r === 0) { pts.push(lift(new Array(dim).fill(0))); continue; }
                const rho = ptanhHalf(r);
                pts.push(lift(v.map(t => rho * t / r)));
            }
        } else if (kind === 'tree') {
            if (dim !== 3) throw new RangeError('the tree dataset is the norm-5 tree of H^3');
            const emb = new D3.TreeEmbedding3D();
            pts = treeWords(cfg.L).map(w => emb.pointExact(w));
        } else throw new RangeError('unknown dataset ' + kind);
        const labels = pts.map(() => 0), out = cfg.out || {}, k = out.k || 0;
        if (k) {
            const mode = out.mode || 'shell';
            if (mode === 'deep') {
                const emb = new D3.TreeEmbedding3D();
                for (let j = 0; j < k; j++) {
                    const w = [g.rng.below(6)];
                    while (w.length < cfg.L + (out.depth || 1)) { const ch = C.P.children(w); w.push(ch[g.rng.below(ch.length)]); }
                    pts.push(emb.pointExact(w));
                }
            } else {
                const rho = rhoOfMass(out.f * ballMass(cfg.R, dim), dim);
                if (mode === 'shell') for (let j = 0; j < k; j++) { const u = g.direction(dim); pts.push(lift(u.map(t => rho * t))); }
                else if (mode === 'cluster') {
                    const X0 = lift(g.direction(dim).map(t => rho * t)), L0 = X.boost(X0);
                    for (let j = 0; j < k; j++) { const jj = 0.02 * g.rng.random(); const z = lift(g.direction(dim).map(t => jj * t)); pts.push(X.matvec(L0, z)); }
                } else throw new RangeError('unknown outlier mode ' + mode);
            }
            for (let j = 0; j < k; j++) labels.push(1);
        }
        return [pts, labels];
    }
    function randomIsometry(rng, dim, K = 64) {
        const p = Array.from({ length: dim }, () => new Q(BigInt(rng.randint(-K, K)), BigInt(2 * K)));
        const R = X.randomRotation(rng, dim);
        const R4 = [[Q.ONE, ...new Array(dim).fill(Q.ZERO)], ...R.map(row => [Q.ZERO, ...row])];
        return X.matmul(X.boost(X.ghost(p)), R4);
    }
    const transform = (L, pts) => pts.map(x => X.matvec(L, x));

    // ================================================================ certified mass in H^3
    function atanhFixed(U, P) {
        const U2 = (U * U) >> P; let S = 0n, T = U, k = 0n;
        while (T) { S += T / (2n * k + 1n); T = (T * U2) >> P; k += 1n; }
        return [S, k];
    }
    const LN2F = new Map();
    function ln2Fixed(P) {
        if (!LN2F.has(P)) { const [S, n] = atanhFixed((1n << P) / 3n, P); LN2F.set(P, [2n * S, 2n * (3n * n + 4n)]); }
        return LN2F.get(P);
    }
    function lnFixed(Y, P, errIn) {
        const e = BigInt(bitLen(Y) - 1) - P, Z = Y >> e, one = 1n << P;
        const U = ((Z - one) << P) / (Z + one);
        const [S, n] = atanhFixed(U, P), [L2, e2] = ln2Fixed(P);
        return [2n * S + e * L2, 2n * (3n * n + 4n) + e * e2 + 2n + errIn];
    }
    function massFixed(A2, P) {                                         // A2 a Q (a^2 >= 1), P a BigInt
        const u = A2.n, v = A2.d;
        if (u < v) throw new RangeError('a radius below 1');
        if (u === v) return [0n, 0n];
        const four = 1n << (2n * P);
        const A = isqrt(u * four / v), S = isqrt((u - v) * four / v), T = isqrt(4n * u * (u - v) * four / (v * v));
        const [Lv, Le] = lnFixed(A + S, P, 2n);
        return [T - 2n * Lv, 1n + 2n * Le];
    }
    function certifySign(coefs, A2s, P0 = 64, Pmax = 8192) {
        for (let P = P0; P <= Pmax; P *= 2) {
            let Cs = 0n, E = 0n;
            coefs.forEach((c, k) => { const [M, e] = massFixed(A2s[k], BigInt(P)); Cs += BigInt(c) * M; E += BigInt(Math.abs(c)) * e; });
            if (Cs > E) return [1, P];
            if (Cs < -E) return [-1, P];
        }
        return [0, Pmax];
    }

    // ================================================================ the centre
    const quartileIndices = N => [Math.floor((N + 3) / 4) - 1, Math.floor((N + 1) / 2) - 1, Math.floor((3 * N + 3) / 4) - 1];
    function medoid(ip) {
        const N = ip.length, S = new Array(N).fill(0);
        for (let j = 0; j < N; j++) {
            const [Xj, Dj] = ip[j]; let s = 0;
            for (let i = 0; i < N; i++) { const [Xi, Di] = ip[i], DD = Di * Dj, num = lneg(Xi, Xj) - DD; s += num > 0n ? pacosh1(ratio(num, DD)) : 0; }
            S[j] = s;
        }
        let best = 0; for (let j = 1; j < N; j++) if (S[j] < S[best]) best = j;
        return [best, S];
    }
    function gram(ip) {
        const N = ip.length, G = Array.from({ length: N }, () => new Array(N).fill(1));
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) G[i][j] = G[j][i] = ratio(lneg(ip[i][0], ip[j][0]), ip[i][1] * ip[j][1]);
        return G;
    }
    function frechetMedian(G, tol = 1e-13, maxIter = 2000) {
        const N = G.length; let lam = new Array(N).fill(1 / N), it = 0;
        for (it = 1; it <= maxIter; it++) {
            const v = new Array(N).fill(0);
            for (let i = 0; i < N; i++) { const li = lam[i], Gi = G[i]; if (li !== 0) for (let j = 0; j < N; j++) v[j] += li * Gi[j]; }
            let s2 = 0; for (let j = 0; j < N; j++) s2 += lam[j] * v[j];
            const s = Math.sqrt(s2), w = new Array(N).fill(0); let tot = 0;
            for (let j = 0; j < N; j++) { const a = v[j] / s, am1 = a - 1; if (am1 > 1e-30) w[j] = 1 / Math.sqrt(am1 * (a + 1)); tot += w[j]; }
            let delta = 0;
            for (let j = 0; j < N; j++) { w[j] = w[j] / tot; delta = Math.max(delta, Math.abs(w[j] - lam[j])); }
            lam = w;
            if (delta < tol) break;
        }
        return [lam, Math.min(it, maxIter)];
    }
    const radial = (S, ip) => ip.map(([Xi, Di]) => new Q(lneg(S, Xi), Di));
    function combine(ip, lam) {
        const fr = []; lam.forEach((l, i) => { if (l !== 0) fr.push([Q.fromDouble(l), i]); });
        let L = 1n; for (const [q, i] of fr) { const d = q.d * ip[i][1]; L = L / gcdB(L, d) * d; }
        let S = new Array(ip[0][0].length).fill(0n);
        for (const [q, i] of fr) { const [Xi, Di] = ip[i], k = L / (q.d * Di) * q.n; S = S.map((s, t) => s + k * Xi[t]); }
        let g = 0n; for (const t of S) g = gcdB(g, t);
        return g > 1n ? S.map(t => t / g) : S;
    }

    // ================================================================ the fence
    function fence(points, dim, { centre = 'median' } = {}) {
        const N = points.length, ip = points.map(intrep);
        const [c0, sums] = medoid(ip);
        let lam, steps;
        if (centre === 'medoid') { lam = ip.map((_, i) => (i === c0 ? 1 : 0)); steps = 0; } else [lam, steps] = frechetMedian(gram(ip));
        const S = combine(ip, lam), sigma = lneg(S, S), sq = new Q(sigma);
        const b = radial(S, ip);
        const w = b.map(bi => bi.mul(bi).sub(sq).div(sq));
        const order = Array.from({ length: N }, (_, i) => i).sort((i, j) => b[i].cmp(b[j]) || i - j);
        const [i1, i2, i3] = quartileIndices(N), j1 = order[i1], j2 = order[i2], j3 = order[i3];
        const b1 = b[j1], b3 = b[j3], A2 = b.map(bi => bi.mul(bi).div(sq));
        const verdict = new Array(N).fill(0), cert = new Array(N).fill('');
        for (let i = 0; i < N; i++) {
            if (b[i].cmp(b3) <= 0) { verdict[i] = 0; cert[i] = 'order'; }
            else if (b1.eq(b3)) { verdict[i] = 2; cert[i] = 'order'; }
            else if (dim === 2) {
                verdict[i] = decideH2(b[i], b1, b3); cert[i] = 'exact';
            } else {
                const [s1, p1] = certifySign([2, 3, -5], [A2[i], A2[j1], A2[j3]]);
                if (s1 <= 0) { verdict[i] = 0; cert[i] = s1 ? `bits:${p1}` : 'unresolved'; continue; }
                const [s2, p2] = certifySign([1, 3, -4], [A2[i], A2[j1], A2[j3]]);
                verdict[i] = s2 > 0 ? 2 : 1;
                cert[i] = s2 ? `bits:${Math.max(p1, p2)}` : 'unresolved';
            }
        }
        const wf = w.map(v => v.toNumber());
        const am1f = wf.map(v => v / (Math.sqrt(1 + v) + 1));
        const mf = am1f.map(v => massOfAm1(v, dim));
        const m1 = mf[j1], m2 = mf[j2], m3 = mf[j3], mF = m3 + 1.5 * (m3 - m1), mG = m3 + 3 * (m3 - m1);
        const verdictFloat = mf.map(m => (m > mG ? 2 : m > mF ? 1 : 0));
        const d = am1f.map(pacosh1), d1 = d[j1], d2 = d[j2], d3 = d[j3];
        const dF = d3 + 1.5 * (d3 - d1), dG = d3 + 3 * (d3 - d1);
        const rF = distanceOfMass(mF, dim), rG = distanceOfMass(mG, dim);
        return {
            N, dim, medoid: c0, sums, lam, S, sigma, steps, b, w, order, idx: [i1, i2, i3], q: [j1, j2, j3],
            m1, m2, m3, mF, mG, verdict, cert, verdictFloat, mass: mf, dist: d, d1, d2, d3, rF, rG, gap: rF - d3, gapG: rG - d3,
            ratio: m3 > 0 ? mF / m3 : Infinity, tukeyD: { F: dF, G: dG, verdict: d.map(x => (x > dG ? 2 : x > dF ? 1 : 0)) },
        };
    }
    // the centre as floats on the sheet, S / sqrt(sigma), scaled so big integers do not overflow
    function centrePoint(res) {
        const S = res.S; let mx = 0; for (const s of S) mx = Math.max(mx, bitLen(absB(s)));
        const sh = BigInt(Math.max(0, mx - 500)), Sf = S.map(s => ratio(s, 1n << sh));
        let n2 = Sf[0] * Sf[0]; for (let i = 1; i < Sf.length; i++) n2 -= Sf[i] * Sf[i];
        const sf = Math.sqrt(Math.max(n2, 0));
        return Sf.map(t => t / sf);
    }
    const toFloat = x => x.map(v => v.toNumber());
    const poincare = y => y.slice(1).map(v => v / (1 + y[0]));
    // move float points so the centre sits at the origin: the boost L_c^-1 applied in floats (for drawing)
    function recentre(c, Y) {
        const c0 = c[0], cb = c.slice(1);
        return Y.map(y => {
            const ip = -c0 * y[0] + cb.reduce((s, t, i) => s + t * y[i + 1], 0);           // <c, y>
            const y0 = -ip;
            const k = (cb.reduce((s, t, i) => s + t * y[i + 1], 0) / (1 + c0)) - y[0];
            return [y0, ...cb.map((t, i) => y[i + 1] + k * t)];
        });
    }

    // ================================================================ the guard (four-point, ln 2)
    function distanceMatrix(points) {
        const ip = points.map(intrep), N = ip.length, D = Array.from({ length: N }, () => new Array(N).fill(0));
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
            const DD = ip[i][1] * ip[j][1], num = lneg(ip[i][0], ip[j][0]) - DD;
            D[i][j] = D[j][i] = num > 0n ? pacosh1(ratio(num, DD)) : 0;
        }
        return D;
    }
    function defect(D, i, j, k, l) {
        const s = [D[i][j] + D[k][l], D[i][k] + D[j][l], D[i][l] + D[j][k]].sort((a, b) => a - b);
        return (s[2] - s[1]) * 0.5;
    }
    function corrupt(D, k, delta, seed) {
        const N = D.length, pairs = [];
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) pairs.push([i, j]);
        const pick = new C.Rng(seed).sample(pairs.length, k).sort((a, b) => a - b), E = D.map(r => r.slice()), out = [];
        for (const t of pick) { const [i, j] = pairs[t]; E[i][j] += delta; E[j][i] += delta; out.push([i, j]); }
        return [E, out];
    }
    function guardCheck(D, { tol = 1e-9, sample = null, seed = 0 } = {}) {
        const N = D.length, blame = new Map();
        let worst = -1, wq = null, bad = 0;
        const visit = q => {
            const v = defect(D, ...q);
            if (v > worst) { worst = v; wq = q; }
            if (v > LN2 + tol) {
                bad++;
                const [i, j, k, l] = q;
                for (const p of [[i, j], [i, k], [i, l], [j, k], [j, l], [k, l]]) { const key = p.join(','); blame.set(key, (blame.get(key) || 0) + 1); }
            }
        };
        if (sample === null) { for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) for (let k = j + 1; k < N; k++) for (let l = k + 1; l < N; l++) visit([i, j, k, l]); }
        else { const rng = new C.Rng(seed); for (let t = 0; t < sample; t++) visit(rng.sample(N, 4).sort((a, b) => a - b)); }
        const top = [...blame.entries()].map(([k, c]) => [k.split(',').map(Number), c])
            .sort((a, b) => b[1] - a[1] || a[0][0] - b[0][0] || a[0][1] - b[0][1]).slice(0, 6);
        return { worst, quad: wq, bad, top };
    }
    function idealSquare(R, dim = 2) {
        const rho = ptanhHalf(R), dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
        return dirs.map(v => lift([...v.map(u => rho * u), ...new Array(dim - 2).fill(0)], 60));
    }

    // ================================================================ comparisons
    function euclidMedian(V, tol = 1e-15, maxIter = 5000) {
        const n = V[0].length; let c = Array.from({ length: n }, (_, k) => V.reduce((s, v) => s + v[k], 0) / V.length);
        for (let it = 0; it < maxIter; it++) {
            const num = new Array(n).fill(0); let tot = 0;
            for (const v of V) { let r2 = 0; for (let k = 0; k < n; k++) r2 += (v[k] - c[k]) ** 2; const r = Math.sqrt(r2); if (r > 1e-300) { const w = 1 / r; tot += w; for (let k = 0; k < n; k++) num[k] += w * v[k]; } }
            const c2 = num.map(t => t / tot); let st = 0, cn = 0;
            for (let k = 0; k < n; k++) { st += (c2[k] - c[k]) ** 2; cn += c2[k] * c2[k]; }
            c = c2;
            if (Math.sqrt(st) < tol * (1 + Math.sqrt(cn))) break;
        }
        return c;
    }
    function euclidVolumeFence(V, n) {
        const c = euclidMedian(V), m = V.map(v => { let r2 = 0; for (let k = 0; k < n; k++) r2 += (v[k] - c[k]) ** 2; return r2 ** (n / 2); });
        const order = m.map((_, i) => i).sort((i, j) => m[i] - m[j] || i - j), [i1, , i3] = quartileIndices(m.length);
        const m1 = m[order[i1]], m3 = m[order[i3]], mF = m3 + 1.5 * (m3 - m1), mG = m3 + 3 * (m3 - m1);
        return m.map(x => (x > mG ? 2 : x > mF ? 1 : 0));
    }
    function expOrigin(v, eps = 1, K = DATA_BITS) {
        let r2 = 0; for (const t of v) r2 += t * t; const r = Math.sqrt(r2);
        if (r === 0) return lift(new Array(v.length).fill(0), K);
        const rho = ptanhHalf(eps * r);
        return lift(v.map(t => rho * t / r), K);
    }
    function medianResidual(points, res) {
        const c = centrePoint(res); let tot = 0, acc = new Array(c.length).fill(0);
        for (const x of points) {
            const xf = toFloat(x); let a = c[0] * xf[0]; for (let k = 1; k < c.length; k++) a -= c[k] * xf[k];
            const sh = Math.sqrt(Math.max(a * a - 1, 0)); if (sh < 1e-12) continue;
            const g = xf.map((t, k) => (t - a * c[k]) / sh);
            acc = acc.map((p, k) => p + g[k]);
            let gn = -g[0] * g[0]; for (let k = 1; k < g.length; k++) gn += g[k] * g[k]; tot += Math.sqrt(Math.abs(gn));
        }
        let an = -acc[0] * acc[0]; for (let k = 1; k < acc.length; k++) an += acc[k] * acc[k];
        return Math.sqrt(Math.abs(an)) / tot;
    }
    const decideH2 = (b, b1, b3) => (b.cmp(new Q(4n).mul(b3).sub(new Q(3n).mul(b1))) > 0 ? 2 : Q.TWO.mul(b).cmp(new Q(5n).mul(b3).sub(new Q(3n).mul(b1))) > 0 ? 1 : 0);
    const decideH2Float = (b, b1, b3) => { const m = b.toNumber() - 1, m1 = b1.toNumber() - 1, m3 = b3.toNumber() - 1; return m > m3 + 3 * (m3 - m1) ? 2 : m > m3 + 1.5 * (m3 - m1) ? 1 : 0; };
    const doublingGap = (Q3, dim, f = 2) => distanceOfMass(f * massOfDistance(Q3, dim), dim) - Q3;
    function populationRadii(R, dim) { const mR = massOfDistance(R, dim); return [0.25, 0.5, 0.75].map(p => distanceOfMass(p * mR, dim)); }

    // ================================================================ parity with the reference
    function runParityFence(T) {
        const lines = [], add = (name, ok, detail = '') => lines.push({ name, ok: !!ok, detail });
        const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        const fl = (v, s) => v === Number(s) || (Number.isNaN(v) && s === 'nan') || (v === Infinity && s === 'inf');
        const K = T.kernels, fn = { pexp, pexpm1, plog, plog1p, pacosh1, psinhmx, pcoshm1, ptanh_half: ptanhHalf,
            distance_of_mass2: x => distanceOfMass(x, 2), distance_of_mass3: x => distanceOfMass(x, 3), rho_of_mass2: x => rhoOfMass(x, 2), rho_of_mass3: x => rhoOfMass(x, 3) };
        for (const [name, rows] of Object.entries(K)) {
            const ok = rows.filter(([x, y]) => fl(fn[name](Number(x)), y)).length;
            add(`kernel ${name}: ${rows.length} values bit for bit`, ok === rows.length, `${ok}/${rows.length}`);
        }
        const mfOk = T.mass_fixed.filter(r => { const [M, e] = massFixed(Q.parse(r.A2), BigInt(r.P)); return M.toString() === r.M && e.toString() === r.err; }).length;
        add(`certified mass: ${T.mass_fixed.length} fixed-point values and error bounds`, mfOk === T.mass_fixed.length, `${mfOk}/${T.mass_fixed.length}`);
        const cOk = T.certify.filter(r => same(certifySign(r.coefs, r.A2.map(Q.parse)), [r.sign, r.bits])).length;
        add(`certified signs: ${T.certify.length} decisions with their precisions`, cOk === T.certify.length, `${cOk}/${T.certify.length}`);
        const tOk = T.ties.filter(r => decideH2(Q.parse(r.b), Q.parse(r.b1), Q.parse(r.b3)) === r.v).length;
        add(`exact ties: ${T.ties.length} radii on and beside the fences`, tOk === T.ties.length, `${tOk}/${T.ties.length}`);
        const sha = C.sha256Hex;
        const checkCase = (rec, pts, dim, centre) => {
            const r = fence(pts, dim, { centre });
            const parts = [
                ['medoid and its sums', r.medoid === rec.medoid && r.sums.every((v, i) => fl(v, rec.sums[i]))],
                ['median weights', r.steps === rec.steps && r.lam.every((v, i) => fl(v, rec.lam[i]))],
                ['exact centre S and radii w', sha(r.S.map(String).join('|')) === rec.S_hash && sha(r.w.map(qs).join('|')) === rec.w_hash],
                ['order and quartiles', same(r.order, rec.order) && same(r.q, rec.q)],
                ['verdicts and certificates', same(r.verdict, rec.verdict) && same(r.cert, rec.cert) && same(r.verdictFloat, rec.verdict_float)],
                ['mass and distance floats', r.mass.every((v, i) => fl(v, rec.mass[i])) && r.dist.every((v, i) => fl(v, rec.dist[i]))],
                ['fences, radii, gap', [r.m1, r.m2, r.m3, r.mF, r.mG].every((v, i) => fl(v, rec.m[i])) && [r.rF, r.rG, r.gap, r.gapG, r.ratio].every((v, i) => fl(v, rec.r[i]))],
                ['distance Tukey baseline', fl(r.tukeyD.F, rec.tukey_d.F) && fl(r.tukeyD.G, rec.tukey_d.G) && same(r.tukeyD.verdict, rec.tukey_d.verdict)],
            ];
            return parts;
        };
        for (const rec of T.cases) {
            const [pts, lab] = generate(rec.cfg);
            add(`${rec.name}: ${pts.length} exact points generated`, same(pts.map(x => x.map(qs)), rec.points) && same(lab, rec.labels));
            for (const [what, ok] of checkCase(rec, pts, rec.cfg.dim, rec.cfg.centre || 'median')) add(`${rec.name}: ${what}`, ok);
        }
        {
            const I = T.isometry, [pts] = generate(T.cases[0].cfg), L = randomIsometry(new C.Rng(77), 2);
            const moved = transform(L, pts);
            add('CF2 on the trace: the rational isometry and the moved points', same(L.map(r => r.map(qs)), I.L) && same(moved.map(x => x.map(qs)), I.points) && X.isLorentz(L));
            for (const [what, ok] of checkCase(I, moved, 2, 'median')) add(`moved: ${what}`, ok);
            add('CF2 on the trace: verdicts unchanged by the isometry', same(I.verdict, T.cases[0].verdict) && same(I.cert, T.cases[0].cert));
        }
        {
            const G = T.guard, [gp] = generate({ dim: 2, kind: 'ball', N: 16, R: 3.0, seed: 12 }), Dm = distanceMatrix(gp);
            add('guard: points and distances', same(gp.map(x => x.map(qs)), G.points) && Dm.every((row, i) => row.every((v, j) => fl(v, G.D[i][j]))));
            const [E, pairs] = corrupt(Dm, 2, 2.5, 5), g0 = guardCheck(Dm), g1 = guardCheck(E);
            const eq = (g, ref) => fl(g.worst, ref.worst) && same(g.quad, ref.quad) && g.bad === ref.bad && same(g.top, ref.top);
            add('guard: clean data has no quadruple above ln 2', eq(g0, G.clean) && g0.bad === 0);
            add('guard: corrupted distances, quadruples above ln 2 and the blamed pairs', same(pairs, G.pairs) && eq(g1, G.corrupt), `${g1.bad} quadruples, top pair ${g1.top[0] && g1.top[0][0]}`);
            add('guard: the ideal square and the sampled guard', fl(defect(distanceMatrix(idealSquare(20)), 0, 1, 2, 3), G.square) && guardCheck(E, { sample: 500, seed: 9 }).bad === G.sample);
        }
        const passed = lines.filter(l => l.ok).length;
        return { lines, passed, total: lines.length };
    }

    // ================================================================ live checks of CF1-CF9
    // Each check runs on seeded instances and also a control, an input that must make it fail, so a check that
    // cannot fail would show. control = [what the control produced, what it must produce].
    function runChecksFence({ seed = 2028, scale = 1, only = null } = {}) {
        const out = [], n = k => Math.max(1, Math.round(k * scale));
        const add = (id, title, trials, passed, control, detail) => out.push({ id, title, trials, passed, control, detail });
        const want = id => !only || only.includes(id);
        const small = (dim, kind, N, s, extra = {}) => generate(Object.assign({ dim, kind, N, R: 3, sigma: 1, L: 2, seed: s, out: { k: 4, f: 3, mode: 'shell' } }, extra));
        const rng = new C.Rng(seed);
        if (want('CF1')) {
            let t = 0, p = 0;
            for (let i = 0; i < n(3); i++) for (const dim of [2, 3]) {
                const [pts] = small(dim, 'ball', 30, rng.below(1e6)), r = fence(pts, dim);
                for (const coord of [r.dist, r.mass, r.w.map(v => v.toNumber())]) {
                    const o = coord.map((_, i) => i).sort((a, b) => coord[a] - coord[b] || a - b); t++;
                    if (same(r.idx.map(i => o[i]), r.q)) p++;
                }
            }
            const a = [1, 2, 7, 40], q7 = (v, pp) => { const h = pp * (v.length - 1), lo = Math.floor(h); return v[lo] + (h - lo) * (v[lo + 1] - v[lo]); };
            const gapc = Math.abs(Math.acosh(q7(a, 0.75)) - q7(a.map(Math.acosh), 0.75));
            add('CF1', 'Order-statistic quartiles are the same points in every monotone coordinate', t, p, [gapc > 0.1 ? 1 : 0, 1],
                `distance, mass and sinh² d pick the same three points; control: an interpolating (type 7) quartile of cosh d and of d disagree by ${gapc.toFixed(3)}`);
        }
        if (want('CF2')) {
            let t = 0, p = 0;
            for (let i = 0; i < n(2); i++) for (const [dim, kind] of [[2, 'ball'], [3, 'gauss']]) {
                const [pts] = small(dim, kind, 24, rng.below(1e6)), r0 = fence(pts, dim), L = randomIsometry(rng, dim), r1 = fence(transform(L, pts), dim); t++;
                if (X.isLorentz(L) && same(r0.verdict, r1.verdict) && same(r0.cert, r1.cert) && same(r0.lam, r1.lam) && same(r0.mass, r1.mass)) p++;
            }
            const [pts] = small(2, 'ball', 24, 5), r0 = fence(pts, 2);
            const sq = pts.map(x => X.ghost(x.slice(1).map(v => v.div(Q.ONE.add(x[0])).mul(new Q(9n, 10n)))));
            const changed = !same(r0.mass, fence(sq, 2).mass);
            add('CF2', 'Verdicts are invariant under rational isometries, bit for bit', t, p, [changed ? 1 : 0, 1],
                'random exact Lorentz maps (boost after a Cayley rotation) leave every weight, mass and verdict unchanged; control: shrinking the Poincaré chart by 9/10, not an isometry, changes the masses');
        }
        if (want('CF3')) {
            let t = 0, p = 0; const g = new Gen(seed + 3), M = n(8000);
            for (const [dim, R] of [[2, 1], [2, 6], [3, 0.5], [3, 4]]) {
                const mR = ballMass(R, dim), m = Array.from({ length: M }, () => g.rng.random() * mR).sort((a, b) => a - b);
                const [i1, , i3] = quartileIndices(M), m1 = m[i1], m3 = m[i3]; t++;
                if (Math.abs((m3 + 1.5 * (m3 - m1)) / m3 - 2) < 0.05) p++;
            }
            const v = Array.from({ length: M }, () => [2 * g.normal(), 2 * g.normal()]).map(w => massOfDistance(Math.hypot(w[0], w[1]), 2)).sort((a, b) => a - b);
            const [i1, , i3] = quartileIndices(M), ctrl = (v[i3] + 1.5 * (v[i3] - v[i1])) / v[i3];
            add('CF3', 'A uniform ball puts the fence on the doubling sphere', t, p, [ctrl > 2.15 ? 1 : 0, 1],
                `Tukey's fence on mass sits at twice the upper quartile's mass in flat-ish and broad balls of H² and H³; control: a wrapped normal (σ = 2) gives ${ctrl.toFixed(2)}×, not 2×`);
        }
        if (want('CF4')) {
            let t = 0, p = 0;
            for (let i = 0; i < n(2); i++) for (const dim of [2, 3]) {
                const [pts] = small(dim, 'ball', 30, rng.below(1e6)), r = fence(pts, dim); t++;
                const okc = dim === 2 ? r.cert.every(c => c === 'exact' || c === 'order') : r.cert.every(c => c === 'order' || c.startsWith('bits:'));
                if (okc && same(r.verdict, r.verdictFloat)) p++;
            }
            const a1 = new Q(5n, 4n), a3 = new Q(11n, 3n), aF = new Q(5n).mul(a3).sub(new Q(3n).mul(a1)).div(Q.TWO);
            let wrong = 0, exactOk = true;
            for (let k = 1; k < 40; k++) for (const s of [1n, -1n]) {
                const a = aF.add(new Q(s, 1n << BigInt(50 + k))), ex = decideH2(a, a1, a3);
                exactOk = exactOk && ex === (s > 0n ? 1 : 0); if (decideH2Float(a, a1, a3) !== ex) wrong++;
            }
            add('CF4', 'The plane needs only rational comparisons; space three is certified', t, p + (exactOk ? 0 : -t), [wrong > 0 ? 1 : 0, 1],
                `H² verdicts are two comparisons of rationals, H³ verdicts carry a certificate (order or bits) and agree with floats; control: on 78 radii a hair either side of the fence the float rule gets ${wrong} wrong, the exact rule none`);
        }
        if (want('CF5')) {
            let t = 0, p = 0;
            for (const dim of [2, 3]) for (const f of [1.5, 2, 2.5, 3]) {
                const bound = Math.log(f) / (dim - 1); let prev = 0, ok = true;
                for (let k = 0; k < 36; k++) { const g = doublingGap(0.01 * 1.25 ** k, dim, f); ok = ok && g < bound + 1e-12 && g >= prev - 1e-12; prev = g; }
                t++; if (ok && Math.abs(doublingGap(30, dim, f) - bound) < 1e-6) p++;
            }
            const g30 = doublingGap(30, 2);
            add('CF5', 'The doubling gap is below ln f / (n − 1) and tends to it: in H², ln 2 = 0.693…', t, p, [(2 ** 0.5 - 1) * 30 > 3 ? 1 : 0, 1],
                `the doubling sphere of a ball of radius 30 in H² lies ${g30.toFixed(12)} beyond it (ln 2 = ${LN2.toFixed(12)}); control: in flat space the gap (2^(1/n) − 1)Q grows without bound`);
        }
        if (want('CF6')) {
            let t = 0, p = 0, differ = 0;
            for (let s = 0; s < n(4); s++) {
                const g = new Gen(100 + s), dim = 2 + (s % 2);
                const V = [...Array.from({ length: 30 }, () => Array.from({ length: dim }, () => g.normal())), ...Array.from({ length: 3 }, () => g.direction(dim).map(x => 4 * x))];
                const flat = euclidVolumeFence(V, dim), tiny = fence(V.map(v => expOrigin(v, 1e-5, 60)), dim); t++;
                if (same(tiny.verdict, flat)) p++;
                if (!same(fence(V.map(v => expOrigin(v, 2.5, 60)), dim).verdict, flat)) differ++;
            }
            add('CF6', 'The flat limit is the Euclidean volume fence', t, p, [differ > 0 ? 1 : 0, 1],
                `scaled by 10⁻⁵ the Claude fence returns the flat fence on |v − median|ⁿ exactly; control: at scale 2.5 curvature changes the verdicts (${differ} of ${t} clouds)`);
        }
        if (want('CF7')) {
            let t = 0, p = 0;
            for (const [dim, R] of [[2, 24], [3, 12]]) {
                const [q1, , q3] = populationRadii(R, dim), lam = dim - 1, mR = ballMass(R, dim);
                const m1 = massOfDistance(q1, dim), m3 = massOfDistance(q3, dim), rF = distanceOfMass(m3 + 1.5 * (m3 - m1), dim); t++;
                if (Math.abs(q3 - q1 - Math.log(3) / lam) < 1e-6 && Math.abs(q3 + 1.5 * (q3 - q1) - R - (1.5 * Math.log(3) - Math.log(4 / 3)) / lam) < 1e-6 && Math.abs(rF - R - Math.log(1.5) / lam) < 1e-6 && mR > 0) p++;
            }
            const iqr = R => (0.75 ** 0.5 - 0.25 ** 0.5) * R;
            add('CF7', 'Distance-Tukey saturates: its IQR stops growing and its fence sits 1.36/(n − 1) past the edge', t, p, [iqr(24) > 10 * iqr(2) - 1e-9 ? 1 : 0, 1],
                'in broad balls the radius IQR is ln 3/(n − 1) whatever the size; Tukey on distance then sits (1.5 ln 3 − ln 4/3)/(n − 1) past the edge, the Claude fence ln 1.5/(n − 1); control: a flat ball\'s IQR grows with R');
        }
        if (want('CF8')) {
            let t = 0, p = 0;
            for (const dim of [2, 3]) {
                const [pts] = small(dim, 'ball', 50, 8, { R: dim === 2 ? 5 : 3.5, out: { k: 0 } }), r = fence(pts, dim);
                const c = centrePoint(r), dm = Math.acosh(pts[r.medoid][0].toNumber()), dc = Math.acosh(Math.max(1, c[0])); t++;
                if (medianResidual(pts, r) < 1e-8 && dm > dc) p++;
            }
            const [pts] = small(2, 'ball', 30, 10, { R: 3, out: { k: 18, f: 400, mode: 'cluster' } });
            const [pts2] = small(2, 'ball', 30, 10, { R: 3, out: { k: 32, f: 400, mode: 'cluster' } });
            const dOf = q => Math.acosh(Math.max(1, centrePoint(fence(q, 2))[0])); t++;
            const held = dOf(pts) < 3, carried = dOf(pts2) > 3;
            if (held) p++;
            add('CF8', 'The centre: the median is a critical point, no data point is as central, and a cluster under half cannot carry it', t, p, [carried ? 1 : 0, 1],
                'the Weiszfeld fixed point zeroes the gradient of Σ d to 10⁻⁸ and sits nearer the true centre than the medoid; 18 far points among 48 leave it in place; control: 32 among 62 carry it away');
        }
        if (want('CF9')) {
            let t = 0, p = 0, worst = 0, ratioMax = 0; const g = new Gen(seed + 9);
            for (const dim of [2, 3]) for (const sc of [0.3, 2, 8]) for (let i = 0; i < n(60); i++) {
                const q = Array.from({ length: 4 }, () => expOrigin(Array.from({ length: dim }, () => sc * g.normal()), 1, 48)), Dm = distanceMatrix(q);
                const v = defect(Dm, 0, 1, 2, 3), gp = (a, b) => (Dm[a][3] + Dm[b][3] - Dm[a][b]) / 2;
                const ra = Math.exp(-gp(0, 2)) / (Math.exp(-gp(0, 1)) + Math.exp(-gp(1, 2)));
                worst = Math.max(worst, v); ratioMax = Math.max(ratioMax, ra); t++;
                if (v <= LN2 + 1e-12 && ra <= 1 + 1e-12) p++;
            }
            const sqd = defect(distanceMatrix(idealSquare(20)), 0, 1, 2, 3);
            t++; if (Math.abs(sqd - LN2) < 1e-9) p++;
            const [gp] = small(2, 'ball', 14, 12, { out: { k: 0 } }), Dm = distanceMatrix(gp), [E, pairs] = corrupt(Dm, 1, 3, 5), gc = guardCheck(E);
            t++; if (guardCheck(Dm).bad === 0 && gc.bad > 0 && same(gc.top[0][0], pairs[0])) p++;
            const s4 = 4, r2 = Math.SQRT2 * s4, flatSq = [[0, s4, r2, s4], [s4, 0, s4, r2], [r2, s4, 0, s4], [s4, r2, s4, 0]];
            add('CF9', 'No four points of hyperbolic space beat ln 2; a quadruple that does names a wrong distance', t, p, [defect(flatSq, 0, 1, 2, 3) > LN2 ? 1 : 0, 1],
                `largest defect over random quadruples ${worst.toFixed(6)} ≤ ln 2, strong-hyperbolicity ratio ${ratioMax.toFixed(6)} ≤ 1, the ideal square reaches ${sqd.toFixed(12)}; one corrupted distance is the guard's top suspect; control: a flat square of side 4 has defect ${defect(flatSq, 0, 1, 2, 3).toFixed(3)}`);
        }
        return out;
        function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
    }

    return {
        LN2, DATA_BITS, pexp, pexpm1, plog, plog1p, pacosh1, psinhmx, pcoshm1, ptanhHalf, massOfDistance, massOfAm1, distanceOfMass, rhoOfMass, ballMass,
        isqrt, ratio, dyadic, lift, intrep, lneg, Gen, generate, treeWords, randomIsometry, transform, massFixed, certifySign, quartileIndices,
        medoid, gram, frechetMedian, combine, fence, centrePoint, toFloat, poincare, recentre, distanceMatrix, defect, corrupt, guardCheck, idealSquare,
        euclidMedian, euclidVolumeFence, expOrigin, medianResidual, decideH2, decideH2Float, doublingGap, populationRadii,
        runParityFence, runChecksFence, version: 'fence-0.7',
    };
});
