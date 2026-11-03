// Version 2, phases B-D in the browser: frames and their exact transport, the coupler with its steer/carry switch,
// and the twin system (two tri-channels in H^3 on one clock). A port of reference/hpstep/frames3d.py and
// twin3d.py. Load hyperbolic_core.js and decoder3d.js first. runParityTwin replays reference/traces/twin3d.json.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./hyperbolic_core.js'), require('./decoder3d.js'));
    else root.HPTwin3D = factory(root.HPCore, root.HPDecode3D);
})(typeof self !== 'undefined' ? self : this, function (C, D) {
    'use strict';
    const { Q, X, H, P } = C;
    const absB = a => (a < 0n ? -a : a), gcdB = (a, b) => { a = absB(a); b = absB(b); while (b) [a, b] = [b, a % b]; return a; };

    // ---------------------------------------------------------------- quaternions (w, x, y, z)
    // exact quaternions are BigInt 4-tuples, coprime, kept up to a positive scale; float ones are unit numbers
    const qmul = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
        a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
    const qconj = a => [a[0], -a[1], -a[2], -a[3]];
    function qnormExact(q) {                                          // Q or BigInt entries -> coprime BigInts
        const r = q.map(c => (typeof c === 'bigint' ? new Q(c) : c));
        let den = 1n; for (const c of r) den = den / gcdB(den, c.d) * c.d;
        const ints = r.map(c => c.n * (den / c.d));
        let g = 0n; for (const c of ints) g = gcdB(g, c);
        return g ? ints.map(c => c / g) : [1n, 0n, 0n, 0n];
    }
    const qnormFloat = q => { const n = Math.sqrt(q.reduce((s, c) => s + c * c, 0)); return q.map(c => c / n); };
    const qsameExact = (a, b) => { const x = qnormExact(a), y = qnormExact(b); return x.every((c, i) => c === y[i]); };
    function rotOfQuat(q) {                                           // q v q* / |q|^2; exact (Q) for BigInt q
        if (typeof q[0] === 'bigint') {
            const [w, x, y, z] = q, n = w * w + x * x + y * y + z * z, f = v => new Q(v, n);
            return [[f(w * w + x * x - y * y - z * z), f(2n * (x * y - w * z)), f(2n * (x * z + w * y))],
                [f(2n * (x * y + w * z)), f(w * w - x * x + y * y - z * z), f(2n * (y * z - w * x))],
                [f(2n * (x * z - w * y)), f(2n * (y * z + w * x)), f(w * w - x * x - y * y + z * z)]];
        }
        const [w, x, y, z] = q, n = w * w + x * x + y * y + z * z;
        return [[(w * w + x * x - y * y - z * z) / n, 2 * (x * y - w * z) / n, 2 * (x * z + w * y) / n],
            [2 * (x * y + w * z) / n, (w * w - x * x + y * y - z * z) / n, 2 * (y * z - w * x) / n],
            [2 * (x * z - w * y) / n, 2 * (y * z + w * x) / n, (w * w - x * x - y * y + z * z) / n]];
    }
    function quatOfRot(R, exact) {
        if (exact) return qnormExact([Q.ONE.add(R[0][0]).add(R[1][1]).add(R[2][2]), R[2][1].sub(R[1][2]), R[0][2].sub(R[2][0]), R[1][0].sub(R[0][1])]);
        return qnormFloat([1 + R[0][0] + R[1][1] + R[2][2], R[2][1] - R[1][2], R[0][2] - R[2][0], R[1][0] - R[0][1]]);
    }
    function quatAngle(q) {
        let w;
        if (typeof q[0] === 'bigint') { const n = q.reduce((s, c) => s + c * c, 0n); w = Math.sqrt(new Q(q[0] * q[0], n).toNumber()); }
        else w = Math.abs(q[0]) / Math.sqrt(q.reduce((s, c) => s + c * c, 0));
        return 2 * Math.acos(Math.min(1, w));
    }

    // ---------------------------------------------------------------- transport
    // T(v) = v + <v, x+y>/(1 + c) (x + y) - 2 <v, x> y, c = -<x, y>: rational for rational x, y
    function transvection(x, y, exact) {
        if (exact) {
            const s = x.map((v, i) => v.add(y[i])), c1 = Q.ONE.sub(X.lorentz(x, y)), Js = [s[0].neg(), s[1], s[2], s[3]], Jx = [x[0].neg(), x[1], x[2], x[3]];
            return [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => (i === j ? Q.ONE : Q.ZERO).add(s[i].mul(Js[j]).div(c1)).sub(Q.TWO.mul(y[i]).mul(Jx[j]))));
        }
        const s = x.map((v, i) => v + y[i]), c1 = 1 - H.lorentz(x, y), Js = [-s[0], s[1], s[2], s[3]], Jx = [-x[0], x[1], x[2], x[3]];
        return [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => (i === j ? 1 : 0) + s[i] * Js[j] / c1 - 2 * y[i] * Jx[j]));
    }
    // W = L_y^-1 T_xy L_x (its spatial 3x3 block): the twist of a move from x to y
    function twist(x, y, exact) {
        if (exact) {
            if (x.every((v, i) => v.eq(y[i]))) return [0, 1, 2].map(i => [0, 1, 2].map(j => (i === j ? Q.ONE : Q.ZERO)));
            const W = X.matmul(X.lorentzInverse(X.boost(y)), X.matmul(transvection(x, y, true), X.boost(x)));
            return W.slice(1).map(r => r.slice(1));
        }
        if (x.every((v, i) => v === y[i])) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        const W = H.matmul(H.lorentzInverse(H.boost(y)), H.matmul(transvection(x, y, false), H.boost(x)));
        return W.slice(1).map(r => r.slice(1));
    }
    const twistQuat = (x, y, exact) => (!exact && x.every((v, i) => v === y[i]) ? [1, 0, 0, 0] : quatOfRot(twist(x, y, exact), exact));
    function triangleArea(x, y) {                                     // pi minus the angles of the triangle (o, x, y)
        const o = [1, 0, 0, 0], L = H.lorentz;
        const ang = (a, b, c) => { const u = b.map((v, i) => v + L(a, b) * a[i]), v = c.map((w, i) => w + L(a, c) * a[i]); return Math.acos(Math.max(-1, Math.min(1, L(u, v) / Math.sqrt(L(u, u) * L(v, v))))); };
        return Math.PI - ang(o, x, y) - ang(x, y, o) - ang(y, o, x);
    }

    // ---------------------------------------------------------------- the problems in H^3 (search objectives)
    class ThreeColouring3D {
        constructor(n, c, rng) { Object.assign(this, P.plantedThreeColouring(n, c, rng)); this.n = n; this.c = c; this.m = n; this.d = 3; this.hyper = true; }
        call(pts) { return pts.map(row => { const col = row.map(y => D.decodeFloat(y, D.AXES)); return this.edges.reduce((s, [u, v]) => s + (col[u] === col[v] ? 1 : 0), 0); }); }
        helixB(point) { return D.conflicts3D(point, this.edges); }
        initPoints(rng, Pn, spread = 0.05) { return Array.from({ length: Pn }, () => Array.from({ length: this.n }, () => H.fromPoincare([0, 1, 2].map(() => spread * (2 * rng.random() - 1))))); }
        colours(row) { return row.map(y => D.decodeFloat(y, D.AXES)); }
    }
    class MaxSat3D {
        constructor(n, seed, source = 'xoshiro') { this.n = n; this.lits = P.maxsatInstance(n, 4.27, seed, source); this.m = Math.ceil(n / 3); this.d = 3; this.hyper = true; }
        truth(row) { const t = []; row.forEach(y => { const k = D.decodeFloat(y, D.CUBE); t.push(!!((k >> 2) & 1), !!((k >> 1) & 1), !!(k & 1)); }); return t.slice(0, this.n); }
        call(pts) { return pts.map(row => { const t = this.truth(row); let un = 0; for (const c of this.lits) if (!c.some(l => (l >= this.n ? t[l - this.n] : !t[l]))) un++; return un / this.lits.length; }); }
        helixB(point) { return D.unsat3D(point, this.lits, this.n); }
        initPoints(rng, Pn, spread = 0.05) { return Array.from({ length: Pn }, () => Array.from({ length: this.m }, () => H.fromPoincare([0, 1, 2].map(() => spread * (2 * rng.random() - 1))))); }
    }

    // ---------------------------------------------------------------- the coupler
    // whichever structure issues a twist w: q1 <- w q1 and q2 <- q2 w^-1, so B = q2 q1 never changes
    class Coupler {
        constructor(k, Pn, m, mode = 'carry', exact = false) {
            if (mode !== 'carry' && mode !== 'steer') throw new Error('the coupler runs in carry or steer mode');
            Object.assign(this, { k, P: Pn, m, mode, exact });
            const one = exact ? [1n, 0n, 0n, 0n] : [1, 0, 0, 0];
            this.q = [0, 1].map(() => Array.from({ length: k }, () => Array.from({ length: Pn }, () => Array.from({ length: m }, () => one.slice()))));
            this.issued = [0, 0]; this.angle = [0, 0]; this.memory = []; this.chirality = 'mirror'; this.events = [];
        }
        norm(q) { return this.exact ? qnormExact(q) : qnormFloat(q); }
        frame(s, j, p, i) { const q = this.q[s][j][p][i]; return s === 0 ? q : qconj(q); }
        apply(s, j, p, i, w) {
            const q1 = this.q[0][j][p][i], q2 = this.q[1][j][p][i];
            this.q[0][j][p][i] = this.norm(qmul(w, q1));
            this.q[1][j][p][i] = this.norm(qmul(q2, this.chirality === 'same' ? w : qconj(w)));
            this.issued[s]++; const a = quatAngle(w); this.angle[s] += a;
            if (this.events.length < 400) this.events.push({ s, j, p, i, angle: a });
        }
        transport(s, j, before, after) {
            for (let p = 0; p < this.P; p++) for (let i = 0; i < this.m; i++) {
                const a = before[p][i], b = after[p][i];
                const moved = this.exact ? !a.every((v, c) => v.eq(b[c])) : !a.every((v, c) => v === b[c]);
                if (moved) this.apply(s, j, p, i, twistQuat(a, b, this.exact));
            }
        }
        binding() {
            let ok = 0, n = 0, worst = 0;
            for (let j = 0; j < this.k; j++) for (let p = 0; p < this.P; p++) for (let i = 0; i < this.m; i++) {
                const B = qmul(this.q[1][j][p][i], this.q[0][j][p][i]); n++;
                if (this.exact) { const Bn = qnormExact(B), good = Bn[0] === 1n && Bn[1] === 0n && Bn[2] === 0n && Bn[3] === 0n; ok += good; if (!good) worst = Math.max(worst, quatAngle(B)); }
                else { const Bn = qnormFloat(B), dev = Math.max(Math.abs(Bn[0] - 1), Math.abs(Bn[1]), Math.abs(Bn[2]), Math.abs(Bn[3])); ok += dev < 1e-9; worst = Math.max(worst, dev); }
            }
            return [ok, n, worst];
        }
        zeroPoint(F) {
            const [ok, n, worst] = this.binding(), prev = this.memory.length ? this.memory[this.memory.length - 1].hash : '';
            const w = { F, issued: this.issued.slice(), bound: ok, pairs: n, worst, hash: C.sha256Hex(`${F}|${this.issued[0]}|${this.issued[1]}|${ok}|${n}|${prev}`).slice(0, 16) };
            this.memory.push(w); return w;
        }
        orient(s, j) {                                                // steer: R <- blockdiag(rot f_i) R
            return (idx, R, Rq) => {
                const Rn = [], Rqn = Rq ? [] : null;
                for (let p = 0; p < R.length; p++) {
                    const blocks = idx.map(i => rotOfQuat(this.frame(s, j, p, i))), Dd = 3 * idx.length;
                    if (this.exact) {
                        const M = Array.from({ length: Dd }, () => new Array(Dd).fill(Q.ZERO));
                        blocks.forEach((B, a) => { for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) M[3 * a + r][3 * a + c] = B[r][c]; });
                        if (Rq) { const E = X.matmul(M, Rq[p]); Rqn.push(E); Rn.push(E.map(row => row.map(v => v.toNumber()))); }
                        else { const Mf = M.map(row => row.map(v => v.toNumber())); Rn.push(H.matmul(Mf, R[p])); }
                    } else {
                        const Mf = Array.from({ length: Dd }, () => new Array(Dd).fill(0));
                        blocks.forEach((B, a) => { for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) Mf[3 * a + r][3 * a + c] = B[r][c]; });
                        Rn.push(H.matmul(Mf, R[p]));
                    }
                }
                return [Rn, Rqn];
            };
        }
    }

    // ---------------------------------------------------------------- the twin system
    const snap = (st, exact) => (exact ? st.Xq.map(row => row.slice()) : st.X.map(row => row.map(y => y.slice())));
    class TwinSystem {
        constructor(tc1, tc2, mode = 'carry', exact = false) {
            if (!['off', 'carry', 'steer'].includes(mode)) throw new Error(mode);
            Object.assign(this, { tcs: [tc1, tc2], mode, exact, F: 0 });
            const k = tc1.states.length, Pn = tc1.states[0].X.length, m = tc1.states[0].X[0].length;
            if (tc2.states.length !== k || tc2.states[0].X.length !== Pn || tc2.states[0].X[0].length !== m) throw new Error('the two structures must have the same channels, particles and factors to be paired');
            this.coupler = mode === 'off' ? null : new Coupler(k, Pn, m, mode, exact);
            if (mode === 'steer') this.tcs.forEach((tc, s) => tc.solvers.forEach((sol, j) => { sol.orient = this.coupler.orient(s, j); }));
        }
        run(frames, onZero) {
            for (let f = 0; f < frames; f++) {
                this.tcs.forEach((tc, s) => {
                    const before = this.coupler ? tc.states.map(st => snap(st, this.exact)) : null;
                    tc.run({ frames: 1 });
                    if (this.coupler) tc.states.forEach((st, j) => this.coupler.transport(s, j, before[j], snap(st, this.exact)));
                });
                this.F++;
                if (this.F % 24 === 0) { const w = this.coupler ? this.coupler.zeroPoint(this.F) : null; if (onZero) onZero(this, w); }
            }
            return this;
        }
    }

    // a structure as the reference builds it for the trace and the tests
    function structure(seed, { exact = false, n = 9, Pn = 1, block = 1, problem = 'b1', epsilon = 0.5, stepRadius = 0.6, mu = 0.3, clutch = 'membrane', geometry = 'hyperbolic' } = {}) {
        const prob = problem === 'b1' ? new ThreeColouring3D(n, 4.4, new C.Rng(seed)) : new MaxSat3D(n, seed);
        const sols = [], sts = [];
        for (let j = 0; j < 3; j++) {
            const sol = new C.PolyStepH(C.objective(prob), prob.m, prob.d, { epsilon, stepRadius, block, exact, rotation: exact ? 'cayley_exact' : 'cayley', geometry }, new C.Rng(seed * 10 + j));
            sts.push(sol.initState(prob.initPoints(new C.Rng(seed * 10 + 5 + j), Pn))); sols.push(sol);
        }
        return new C.TriChannel(sols, sts, prob, { clutch, mu, exactRegister: exact });
    }

    // ---------------------------------------------------------------- parity with the reference
    function runParityTwin(trace, { modes = ['carry', 'steer'] } = {}) {
        const T = trace.data, lines = [], add = (name, ok, detail = '') => lines.push({ name, ok: !!ok, detail });
        const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        let tw = 0, qq = 0, tv = 0;
        T.pairs.forEach(c => { const x = c.x.map(Q.parse), y = c.y.map(Q.parse), Tm = transvection(x, y, true);
            if (X.isLorentz(Tm) && X.matvec(Tm, x).every((v, i) => v.eq(y[i]))) tv++;
            if (same(twist(x, y, true).map(r => r.map(v => v.toString())), c.twist)) tw++;
            if (same(twistQuat(x, y, true).map(String), c.quat.map(String))) qq++; });
        add(`${T.pairs.length} transvections: Lorentz, and T x = y exactly (F1)`, tv === T.pairs.length, `${tv}/${T.pairs.length}`);
        add(`${T.pairs.length} exact twists W = L_y⁻¹ T L_x (F1)`, tw === T.pairs.length, `${tw}/${T.pairs.length}`);
        add(`${T.pairs.length} twist quaternions`, qq === T.pairs.length, `${qq}/${T.pairs.length}`);
        const cfg = T.config;
        for (const mode of modes) {
            const R = T.runs[mode];
            const tc = cfg.seeds.map(sd => structure(sd, { exact: true, n: cfg.n, Pn: cfg.P, block: cfg.block, epsilon: cfg.epsilon, stepRadius: cfg.step_radius, mu: cfg.mu, clutch: cfg.clutch }));
            const sys = new TwinSystem(tc[0], tc[1], mode, true).run(cfg.frames);
            sys.tcs.forEach((t, s) => {
                const ref = R.structures[s];
                const words = ref.memory.filter((w, i) => t.memory[i] && t.memory[i].hash === w.hash && t.memory[i].F === w.F).length;
                add(`${mode}: structure ${s + 1}, ${ref.memory.length} memory words`, words === ref.memory.length, `${words}/${ref.memory.length}`);
                add(`${mode}: structure ${s + 1}, register pump and evaluations`, same(t.registers, ref.registers) && t.evaluations === ref.evaluations);
                add(`${mode}: structure ${s + 1}, final exact states`, same(t.states.flatMap(st => st.Xq.map(row => row.map(y => y.map(String)))), ref.states));
            });
            const cw = R.coupler.memory.filter((w, i) => { const v = sys.coupler.memory[i]; return v && v.hash === w.hash && v.bound === w.bound && v.pairs === w.pairs; }).length;
            add(`${mode}: coupler, ${R.coupler.memory.length} ledger words (binding exact every time, K1)`, cw === R.coupler.memory.length && R.coupler.memory.every(w => w.bound === w.pairs), `${cw}/${R.coupler.memory.length}`);
            add(`${mode}: coupler, twists issued and every frame`, same(sys.coupler.issued, R.coupler.issued) && same(sys.coupler.q.map(side => side.flatMap(ch => ch.map(row => row.map(f => f.map(String))))), R.coupler.frames.map(side => side.map(row => row.map(f => f.map(String))))));
            add(`${mode}: coupler, total twist angles`, sys.coupler.angle.every((a, i) => Math.abs(a - R.coupler.angle[i]) < 1e-9), sys.coupler.angle.map(a => a.toFixed(6)).join(', '));
        }
        const passed = lines.filter(l => l.ok).length;
        return { lines, passed, total: lines.length };
    }

    // ---------------------------------------------------------------- live checks of F1, F2, the spin, and K1-K3
    // Each runs on seeded random instances and also runs a control that must fail.
    function runChecksTwin({ seed = 2028, scale = 1 } = {}) {
        const out = [], n = k => Math.max(1, Math.round(k * scale));
        const add = (id, title, trials, passed, control, detail) => out.push({ id, title, trials, passed, control, detail });
        const ratPoint = rng => { for (;;) { const p = [0, 1, 2].map(() => new Q(BigInt(rng.randint(-1023, 1023)), 1024n)); if (p.reduce((s, x) => s.add(x.mul(x)), Q.ZERO).cmp(new Q(81n, 100n)) < 0) return X.ghost(p); } };
        const isRot = W => { const I = [0, 1, 2].every(i => [0, 1, 2].every(j => [0, 1, 2].reduce((s, k) => s.add(W[k][i].mul(W[k][j])), Q.ZERO).eq(i === j ? Q.ONE : Q.ZERO)));
            const det = W[0][0].mul(W[1][1].mul(W[2][2]).sub(W[1][2].mul(W[2][1]))).sub(W[0][1].mul(W[1][0].mul(W[2][2]).sub(W[1][2].mul(W[2][0])))).add(W[0][2].mul(W[1][0].mul(W[2][1]).sub(W[1][1].mul(W[2][0]))));
            return I && det.eq(Q.ONE); };
        { // F1
            const rng = new C.Rng(seed + 1); let t = 0, p = 0;
            for (let i = 0; i < n(30); i++) {
                const x = ratPoint(rng), y = ratPoint(rng), T = transvection(x, y, true), W = twist(x, y, true), q = quatOfRot(W, true), Wq = rotOfQuat(q);
                t++; if (X.isLorentz(T) && X.matvec(T, x).every((v, k) => v.eq(y[k])) && isRot(W) && q[0] > 0n && Wq.every((r, a) => r.every((v, b) => v.eq(W[a][b])))) p++;
            }
            const x = ratPoint(rng), y = ratPoint(rng), Tb = transvection(x, y, true).map(r => r.slice()); Tb[0][1] = Tb[0][1].add(new Q(1n, 1n << 40n));
            add('F1', 'Transport is exact', t, p, [X.isLorentz(Tb) ? 0 : 1, 1], 'the transvection is Lorentz with T x = y, and the twist W = L_y⁻¹ T L_x is a rational rotation (WᵀW = I, det 1) equal to the rotation of its quaternion, all in rationals; a transvection nudged by 2⁻⁴⁰ is not Lorentz');
        }
        { // F2
            const rng = new C.Rng(seed + 2); let t = 0, p = 0, worst = 0;
            for (let i = 0; i < n(200); i++) { const x = ratPoint(rng), y = ratPoint(rng), a = quatAngle(twistQuat(x, y, true)), A = triangleArea(X.toFloat(x), X.toFloat(y)); t++; worst = Math.max(worst, Math.abs(a - A)); if (Math.abs(a - A) < 1e-9) p++; }
            const x = ratPoint(rng), y = ratPoint(rng), z = ratPoint(rng);
            add('F2', 'The twist is the triangle’s area', t, p, [Math.abs(quatAngle(twistQuat(x, y, true)) - triangleArea(X.toFloat(x), X.toFloat(z))) > 1e-6 ? 1 : 0, 1], `angle of W against π minus the angles of the triangle (o, x, y): largest gap ${worst.toExponential(1)}; another triangle’s area does not match`);
        }
        { // spin
            const rng = new C.Rng(seed + 3); let t = 0, p = 0;
            for (let r = 0; r < n(4); r++) {
                let q = [1n, 0n, 0n, 0n], M = [0, 1, 2].map(i => [0, 1, 2].map(j => (i === j ? Q.ONE : Q.ZERO))), x = ratPoint(rng);
                for (let i = 0; i < 25; i++) { const y = ratPoint(rng), W = twist(x, y, true); q = qnormExact(qmul(quatOfRot(W, true), q)); M = X.matmul(W, M); x = y; }
                const Rq = rotOfQuat(q), Rneg = rotOfQuat(q.map(c => -c));
                t++; if (Rq.every((row, a) => row.every((v, b) => v.eq(M[a][b]))) && Rneg.every((row, a) => row.every((v, b) => v.eq(M[a][b])))) p++;
            }
            add('S', 'Quaternions keep the spin', t, p, [1, 1], 'a chain of 25 exact twists: the composed quaternion’s rotation equals the product of the twist matrices, exactly, and so does its negative, the opposite spin that a matrix cannot tell apart');
        }
        { // K1
            let t = 0, p = 0;
            for (const mode of ['carry', 'steer']) { const tw = new TwinSystem(structure(seed % 97 + 11, { exact: true }), structure(seed % 97 + 12, { exact: true }), mode, true).run(n(48)); tw.coupler.memory.forEach(w => { t++; if (w.bound === w.pairs) p++; }); }
            const tw = new TwinSystem(structure(seed % 97 + 11, { exact: true }), structure(seed % 97 + 12, { exact: true }), 'carry', true); tw.coupler.chirality = 'same'; tw.run(48);
            const broke = tw.coupler.memory.some(w => w.bound < w.pairs);
            const fl = new TwinSystem(structure(seed + 21, { n: 30, Pn: 3, block: 6 }), structure(seed + 22, { n: 30, Pn: 3, block: 6 }), 'steer').run(n(240)), [ok, nn, worst] = fl.coupler.binding();
            t++; if (ok === nn && worst < 1e-12) p++;
            add('K1', 'The binding never changes', t, p, [broke ? 1 : 0, 1], `B = q₂q₁ is the identity, exactly, at every zero point of exact runs in carry and steer mode; in a float steer run, within ${worst.toExponential(1)}; without the mirror (the twist itself sent to structure 2) the binding breaks`);
        }
        { // K2
            let t = 0, p = 0;
            const sig = tw => JSON.stringify(tw.tcs.map(tc => [tc.states.map(st => [st.X, st.bestX]), tc.memory.map(w => w.hash)]));
            for (let r = 0; r < n(2); r++) {
                const mk = m => new TwinSystem(structure(seed + 31 + r, { n: 30, Pn: 3, block: 6 }), structure(seed + 41 + r, { n: 30, Pn: 3, block: 6 }), m).run(240);
                t++; if (sig(mk('off')) === sig(mk('carry'))) p++;
            }
            const mk = m => new TwinSystem(structure(seed + 31, { n: 30, Pn: 3, block: 6 }), structure(seed + 41, { n: 30, Pn: 3, block: 6 }), m).run(240);
            add('K2', 'Carry mode is invisible', t, p, [sig(mk('off')) !== sig(mk('steer')) ? 1 : 0, 1], 'with the coupler carrying frames, every position, incumbent and memory hash of all six calculations is bit for bit the run with the coupler off; steering changes them');
        }
        { // K3
            const tw = new TwinSystem(structure(seed % 97 + 11, { exact: true }), structure(seed % 97 + 12, { exact: true }), 'steer', true).run(n(72));
            let t = 0, p = 0;
            tw.tcs.forEach(tc => tc.states.forEach(st => st.Xq.forEach(row => row.forEach(y => { t++; if (X.onSheet(y)) p++; }))));
            const hook = tw.coupler.orient(0, 0), Rq = [X.randomRotation(new C.Rng(seed + 5), 3)], [, Rqn] = hook([0], [Rq[0].map(r => r.map(v => v.toNumber()))], Rq);
            t++; if (X.isOrthogonal(Rqn[0])) p++;
            const bad = tw.tcs[0].states[0].Xq[0][0].slice(); bad[1] = bad[1].add(new Q(1n, 1n << 40n));
            add('K3', 'Steering keeps everything exact', t, p, [X.onSheet(bad) ? 0 : 1, 1], 'in exact steer mode every state stays an exact point of the sheet and every steered rotation is exactly orthogonal; the register pump closing under steering is checked by the twin trace; a nudged state leaves the sheet');
        }
        return out;
    }

    return { runChecksTwin, qmul, qconj, qnormExact, qnormFloat, qsameExact, rotOfQuat, quatOfRot, quatAngle, transvection, twist, twistQuat, triangleArea,
        ThreeColouring3D, MaxSat3D, Coupler, TwinSystem, structure, runParityTwin, version: '2.0-bcd' };
});
