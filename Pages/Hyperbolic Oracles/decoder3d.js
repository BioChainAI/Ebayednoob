// Version 2, phase A: the decoders of H^3 in the browser, a port of reference/hpstep/decode3d.py on the browser
// core's exact rationals (load hyperbolic_core.js first). Every answer must equal the reference's, so
// runParity3d replays reference/traces/decode3d.json, whose fields are all exact.
//
//   HPDecode3D.decodeExact(y, A)   argmax <ybar, a_k>, ties to the lowest index, in exact rationals (Q)
//   HPDecode3D.decodeFloat(v, A)   the same on floats, equal to decodeExact on every finite input (D2)
//   new HPDecode3D.TreeEmbedding3D()  the norm-5 tree in H^3, exact frames, greedy decoding (E1-E3)
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./hyperbolic_core.js'));
    else root.HPDecode3D = factory(root.HPCore);
})(typeof self !== 'undefined' ? self : this, function (C) {
    'use strict';
    const { Q, P } = C;

    const AXES = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const TETRA = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    const OCTA = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const CUBE = [];
    for (const b1 of [0, 1]) for (const b2 of [0, 1]) for (const b3 of [0, 1]) CUBE.push([2 * b1 - 1, 2 * b2 - 1, 2 * b3 - 1]);
    const ANCHORS = { axes: AXES, tetra: TETRA, octa: OCTA, cube: CUBE };
    const nameOf = A => Object.keys(ANCHORS).find(k => ANCHORS[k] === A);

    const spatial = y => (y.length === 4 ? y.slice(1) : y);

    // ---------------------------------------------------------------- the anchor decoder
    function decodeExact(y, A) {
        const v = spatial(y).map(Q.from);
        let best = null, bk = 0;
        A.forEach((a, k) => {
            const s = v[0].mul(new Q(BigInt(a[0]))).add(v[1].mul(new Q(BigInt(a[1])))).add(v[2].mul(new Q(BigInt(a[2]))));
            if (best === null || s.cmp(best) > 0) { best = s; bk = k; }
        });
        return bk;
    }
    // a_k - a_j as signed coordinate terms; all nonzero entries have the same size, so only the signs matter
    const BEATS = {};
    for (const name of ['axes', 'tetra', 'octa']) {
        const A = ANCHORS[name], m = {};
        A.forEach((a, k) => A.forEach((b, j) => { if (k !== j) m[k + ',' + j] = [0, 1, 2].filter(i => a[i] !== b[i]).map(i => [i, a[i] > b[i] ? 1 : -1]); }));
        BEATS[name] = m;
    }
    function decodeFloat(y, A) {
        const v = spatial(y);
        if (A === CUBE) return 4 * (v[0] > 0) + 2 * (v[1] > 0) + (v[2] > 0);
        const beats = BEATS[nameOf(A)], n = A.length;
        for (let k = 0; k < n; k++) {
            let ok = true;
            for (let j = 0; j < n && ok; j++) {
                if (j === k) continue;
                const t = beats[k + ',' + j];
                let x = t[0][1] * v[t[0][0]];
                if (t.length > 1) x = x + t[1][1] * v[t[1][0]];   // fl(a + b) keeps the sign of a + b exactly
                ok = j < k ? x > 0 : x >= 0;
            }
            if (ok) return k;
        }
        return 0;
    }

    // ---------------------------------------------------------------- symmetry
    function symmetryGroup(A) {
        const index = new Map(A.map((a, k) => [a.join(), k])), out = [];
        const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
        for (const perm of perms) for (const s0 of [1, -1]) for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
            const signs = [s0, s1, s2], M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
            perm.forEach((row, col) => { M[row][col] = signs[col]; });
            const det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
            if (det !== 1) continue;
            const img = A.map(a => [0, 1, 2].map(r => M[r][0] * a[0] + M[r][1] * a[1] + M[r][2] * a[2]).join());
            if (img.every(v => index.has(v))) out.push({ R: M, sigma: img.map(v => index.get(v)) });
        }
        return out;
    }
    // R with integer (or Q) entries applied exactly to a point of Q coordinates
    const rotateExact = (R, y) => { const v = spatial(y), Rq = R.map(r => r.map(Q.from)), w = [0, 1, 2].map(r => Rq[r][0].mul(v[0]).add(Rq[r][1].mul(v[1])).add(Rq[r][2].mul(v[2]))); return y.length === 4 ? [y[0], ...w] : w; };
    const rotate = (R, y) => { const v = spatial(y), w = [0, 1, 2].map(r => R[r][0] * v[0] + R[r][1] * v[1] + R[r][2] * v[2]); return y.length === 4 ? [y[0], ...w] : w; };

    // ---------------------------------------------------------------- the octahedral tree in H^3
    const LOCAL = [0, 2, 3, 4, 5];
    const slotDirection = (word, g) => (word.length ? LOCAL[P.children(word).indexOf(g)] : g);
    function rotTo(u) {
        const i = u.findIndex(x => x !== 0), perm = [i, (i + 1) % 3, (i + 2) % 3], M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        perm.forEach((row, col) => { M[row][col] = 1; });
        if (u[i] < 0) for (let r = 0; r < 3; r++) { M[r][0] = -M[r][0]; M[r][1] = -M[r][1]; }
        return M;
    }
    const qmm = (A, B) => A.map(row => B[0].map((_, c) => row.reduce((s, a, k) => s.add(a.mul(B[k][c])), Q.ZERO)));
    const qmv = (A, v) => A.map(row => row.reduce((s, a, k) => s.add(a.mul(v[k])), Q.ZERO));
    const fmv = (A, v) => A.map(row => row[0] * v[0] + row[1] * v[1] + row[2] * v[2] + row[3] * v[3]);
    class TreeEmbedding3D {
        constructor(t = new Q(3n, 4n)) {
            this.t = Q.from(t);
            const tt = this.t.mul(this.t), c = Q.ONE.add(tt).div(Q.ONE.sub(tt)), s = Q.TWO.mul(this.t).div(Q.ONE.sub(tt));
            this.cosh = c; this.sinh = s; this.tau = 2 * Math.atanh(this.t.toNumber());
            const I = n => new Q(BigInt(n));
            this.stepQ = OCTA.map(u => {
                const R = rotTo(u), R4 = [[I(1), I(0), I(0), I(0)], ...R.map(row => [I(0), ...row.map(I)])];
                const B = [[c, s, I(0), I(0)], [s, c, I(0), I(0)], [I(0), I(0), I(1), I(0)], [I(0), I(0), I(0), I(1)]];
                return qmm(R4, B);
            });
            const J = [-1, 1, 1, 1];
            this.stepInvQ = this.stepQ.map(M => M.map((row, i) => row.map((_, j) => (J[i] * J[j] < 0 ? M[j][i].neg() : M[j][i]))));
            this.step = this.stepQ.map(M => M.map(row => row.map(x => x.toNumber())));
            this.stepInv = this.stepInvQ.map(M => M.map(row => row.map(x => x.toNumber())));
        }
        frameExact(word) {
            let M = [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => (i === j ? Q.ONE : Q.ZERO)));
            word.forEach((g, i) => { M = qmm(M, this.stepQ[slotDirection(word.slice(0, i), g)]); });
            return M;
        }
        pointExact(word) { return this.frameExact(word).map(row => row[0]); }
        point(word) { let v = [1, 0, 0, 0]; for (let i = word.length - 1; i >= 0; i--) v = fmv(this.step[slotDirection(word.slice(0, i), word[i])], v); return v; }
        decodeExact(y, L, anchor = []) { return this._decode(y.map(Q.from), L, anchor, true); }
        decode(y, L, anchor = []) { return this._decode(y.slice(), L, anchor, false); }
        _decode(y, L, anchor, exact) {
            const mv = exact ? qmv : fmv, steps = exact ? this.stepQ : this.step, inv = exact ? this.stepInvQ : this.stepInv;
            const up = [y];
            for (let i = anchor.length - 1; i >= 0; i--) up.push(mv(steps[slotDirection(anchor.slice(0, i), anchor[i])], up[up.length - 1]));
            up.reverse();
            const word = []; let local = up[0], onPath = true;
            for (let level = 0; level < L; level++) {
                const allowed = P.children(word), dirs = allowed.map(g => OCTA[slotDirection(word, g)]), v = [local[1], local[2], local[3]];
                const k = exact ? decodeExact(v, dirs) : decodeSubsetFloat(v, dirs), g = allowed[k];
                word.push(g);
                if (onPath && level < anchor.length && g === anchor[level]) { local = up[level + 1]; continue; }
                onPath = false;
                local = mv(inv[slotDirection(word.slice(0, -1), g)], local);
            }
            return word;
        }
    }
    // a running argmax over a subset of OCTA that keeps the earlier index on ties; each test is a sign of a
    // coordinate or of a sum or difference of two, so it is exact
    function decodeSubsetFloat(v, dirs) {
        let best = 0;
        for (let k = 1; k < dirs.length; k++) {
            const a = dirs[k], b = dirs[best];
            let x = 0;
            for (let i = 0; i < 3; i++) if (a[i] !== b[i]) x = x + (a[i] > b[i] ? 1 : -1) * v[i];
            if (x > 0) best = k;
        }
        return best;
    }

    // ---------------------------------------------------------------- the problems' Helix B
    const conflicts3D = (points, edges) => { const c = points.map(y => decodeExact(y, AXES)); return edges.reduce((s, [u, v]) => s + (c[u] === c[v] ? 1 : 0), 0); };
    function unsat3D(points, lits, n) {
        const tv = [];
        points.forEach(y => { const k = decodeExact(y, CUBE); tv.push(!!((k >> 2) & 1), !!((k >> 1) & 1), !!(k & 1)); });
        return lits.reduce((s, c) => s + (c.some(l => (l >= n ? tv[l - n] : !tv[l])) ? 0 : 1), 0);
    }
    function nearestExact(z, protos) {
        z = z.map(Q.from);
        let best = null, bk = 0;
        protos.forEach((p, k) => { p = p.map(Q.from); const s = z[0].mul(p[0]).sub(z[1].mul(p[1])).sub(z[2].mul(p[2])).sub(z[3].mul(p[3])); if (best === null || s.cmp(best) < 0) { best = s; bk = k; } });
        return bk;
    }
    function certifyWord(w, L) {
        const q = P.wordQuaternion(w), norm = q.reduce((s, c) => s + c * c, 0n), rd = P.rightDivide(q, L);
        return norm === 5n ** BigInt(L) && rd !== null && rd.join() === w.join() && P.isReduced(w);
    }

    // ---------------------------------------------------------------- parity with the reference
    function runParity3d(trace) {
        const T = trace.data, lines = [], add = (name, ok, detail = '') => lines.push({ name, ok: !!ok, detail });
        const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        for (const [name, S] of Object.entries(T.anchors)) {
            const A = ANCHORS[name];
            add(`${name}: anchors`, same(S.anchors, A));
            const fl = S.float_cases.filter(c => decodeFloat(c.v.map(Number), A) === c.k).length;
            add(`${name}: float decoder on ${S.float_cases.length} boundary cases (D2)`, fl === S.float_cases.length, `${fl}/${S.float_cases.length}`);
            const ex = S.exact_cases.filter(c => decodeExact(c.y.map(Q.parse), A) === c.k).length;
            add(`${name}: exact decoder on ${S.exact_cases.length} rational points`, ex === S.exact_cases.length, `${ex}/${S.exact_cases.length}`);
            const G = symmetryGroup(A).map(g => JSON.stringify(g)).sort(), Gr = S.group.map(g => JSON.stringify(g)).sort();
            add(`${name}: symmetry group, ${S.group.length} rotations with their permutations (D3)`, same(G, Gr));
        }
        const emb = new TreeEmbedding3D(Q.parse(T.tree.t));
        add('tree: t, cosh, sinh', emb.t.toString() === T.tree.t && emb.cosh.toString() === T.tree.cosh && emb.sinh.toString() === T.tree.sinh);
        add(`tree: ${T.tree.frames.length} exact frames (E1)`, T.tree.frames.every(f => same(emb.frameExact(f.word).map(r => r.map(x => x.toString())), f.frame)));
        const dec = T.tree.decodes.filter(d => same(emb.pointExact(d.word).map(x => x.toString()), d.point) && same(emb.decodeExact(d.point.map(Q.parse), d.L), d.decoded) && same(d.decoded, d.word));
        add(`tree: ${T.tree.decodes.length} exact points decoded to their own words (E2)`, dec.length === T.tree.decodes.length, `${dec.length}/${T.tree.decodes.length}`);
        const anc = T.tree.anchored.filter(d => same(emb.decode(d.local.map(Number), d.L, d.anchor), d.decoded));
        add(`tree: ${T.tree.anchored.length} anchored float decodes`, anc.length === T.tree.anchored.length, `${anc.length}/${T.tree.anchored.length}`);
        const pb = T.problems, b1 = P.plantedThreeColouring(pb.b1.n, pb.b1.c, new C.Rng(pb.b1.seed));
        add('B1 in H^3: the planted instance', same(b1.edges, pb.b1.edges));
        add('B2 in H^3: the clause instance', same(P.maxsatInstance(pb.b2.n, 4.27, pb.b2.seed, pb.b2.source), pb.b2.lits));
        pb.states.forEach((st, i) => {
            const c1 = conflicts3D(st.b1.map(y => y.map(Number)), pb.b1.edges), u2 = unsat3D(st.b2.map(y => y.map(Number)), pb.b2.lits, pb.b2.n);
            add(`state ${i + 1}: Helix B conflicts and unsatisfied clauses`, c1 === st.b1_conflicts && u2 === st.b2_unsat, `${c1}, ${u2}`);
        });
        const passed = lines.filter(l => l.ok).length;
        return { lines, passed, total: lines.length };
    }

    // ---------------------------------------------------------------- live checks of D1-D5 and E1-E3
    // Each check runs on seeded random instances and also runs a control, a deliberately wrong input that it must
    // reject, so a check that cannot fail would show. scale multiplies the number of trials.
    function runChecks3d({ seed = 2027, scale = 1 } = {}) {
        const out = [], n = k => Math.max(1, Math.round(k * scale));
        const add = (id, title, trials, passed, control, detail) => out.push({ id, title, trials, passed, control, detail });
        const ratPoint = rng => {                                       // an exact point of H^3: the ghost map of a rational point of the ball
            for (;;) { const p = [0, 1, 2].map(() => new Q(BigInt(rng.randint(-4096, 4096)), 4096n)); const q = p.reduce((s, x) => s.add(x.mul(x)), Q.ZERO); if (q.cmp(new Q(81n, 100n)) < 0) return C.X.ghost(p); }
        };
        const boundary = rng => {                                       // floats on or beside the decision boundaries
            const x = (2 * rng.random() - 1) * Math.pow(10, rng.randint(-300, 300)), k = rng.below(6), e = x * Number.EPSILON * rng.randint(-3, 3);
            const v = k === 0 ? [x, x + e, (2 * rng.random() - 1) * Math.abs(x)] : k === 1 ? [x, -x + e, x] : k === 2 ? [x, x, x] : k === 3 ? [0, -0, x] : k === 4 ? [x, (2 * rng.random() - 1) * 1e-300, -x - e] : [0, 1, 2].map(() => 2 * rng.random() - 1);
            return rng.shuffle(v);
        };
        const sets = Object.entries(ANCHORS);
        { // D1
            const rng = new C.Rng(seed + 1); let t = 0, p = 0, c = 0, cr = 0;
            for (let i = 0; i < n(60); i++) {
                const y = ratPoint(rng), den = Q.ONE.add(y[0]), poin = y.slice(1).map(x => x.div(den)), klein = y.slice(1).map(x => x.div(y[0]));
                for (const [, A] of sets) { const k = decodeExact(y, A); t++; if (decodeExact(poin, A) === k && decodeExact(klein, A) === k) p++; }
                // control: reading a non-radial chart (each coordinate shifted by 1) must change some answer
                cr++; if (sets.some(([, A]) => decodeExact(y.slice(1).map(x => x.add(Q.ONE)), A) !== decodeExact(y, A))) c++;
            }
            add('D1', 'The same answer in every radial chart', t, p, [c > 0 ? 1 : 0, 1], `hyperboloid, Poincaré and Klein coordinates of exact points of H³, all four anchor sets; a non-radial chart (every coordinate shifted by 1) changed the answer on ${c} of ${cr} points`);
        }
        { // D2
            const rng = new C.Rng(seed + 2); let t = 0, p = 0;
            for (let i = 0; i < n(800); i++) { const v = boundary(rng); for (const [, A] of sets) { t++; if (decodeFloat(v, A) === decodeExact(v, A)) p++; } }
            let bad = 0; const runs = n(800);                             // control: argmax of float dot products for CUBE (three-term sums)
            for (let i = 0; i < runs; i++) { const v = boundary(rng), d = CUBE.map(a => a[0] * v[0] + a[1] * v[1] + a[2] * v[2]); let bk = 0; d.forEach((x, k) => { if (x > d[bk]) bk = k; }); if (bk !== decodeExact(v, CUBE)) bad++; }
            add('D2', 'The float decoder is exact', t, p, [bad > 0 ? 1 : 0, 1], `float against exact on boundary cases (ties, signed zeros, 1e±300); the naive dot-product decoder disagreed on ${bad} of ${runs}`);
        }
        { // D3
            const rng = new C.Rng(seed + 3); let t = 0, p = 0;
            const Rc = C.X.randomRotation(new C.Rng(seed + 33), 3);    // control: a rational rotation outside every group
            const seen = sets.map(() => new Map());                     // answer of y -> answer of Rc y, which must stop being a function
            for (let i = 0; i < n(40); i++) {
                const y = ratPoint(rng);
                for (const [si, [, A]] of sets.entries()) {
                    const dots = A.map(a => y[1].mul(new Q(BigInt(a[0]))).add(y[2].mul(new Q(BigInt(a[1])))).add(y[3].mul(new Q(BigInt(a[2]))))).sort((u, v) => u.cmp(v));
                    if (dots[dots.length - 1].cmp(dots[dots.length - 2]) === 0) continue;
                    const k = decodeExact(y, A);
                    for (const g of symmetryGroup(A)) { t++; if (decodeExact(rotateExact(g.R, y), A) === g.sigma[k]) p++; }
                    const kc = decodeExact(rotateExact(Rc, y), A), m = seen[si];
                    if (!m.has(k)) m.set(k, new Set()); m.get(k).add(kc);
                }
            }
            const broken = seen.filter(m => [...m.values()].some(v => v.size > 1)).length;
            add('D3', 'Symmetries permute the answers', t, p, [broken === sets.length ? 1 : 0, 1], `decode(g·y) = σ_g(decode(y)) for every g in G_A (3, 12, 24, 24 rotations) off ties; for a Cayley rotation outside the groups no permutation fits, in ${broken} of ${sets.length} anchor sets`);
        }
        { // D4
            const rng = new C.Rng(seed + 4); let t = 0, p = 0;
            const N = n(40000), dirs = Array.from({ length: N }, () => { const u1 = rng.random() || 1e-12, u2 = rng.random(), u3 = rng.random() || 1e-12, u4 = rng.random(); const r1 = Math.sqrt(-2 * Math.log(u1)), r2 = Math.sqrt(-2 * Math.log(u3)); return [r1 * Math.cos(2 * Math.PI * u2), r1 * Math.sin(2 * Math.PI * u2), r2 * Math.cos(2 * Math.PI * u4)]; });
            const argmax = (v, A) => { let bk = 0, bd = -Infinity; A.forEach((a, k) => { const d = a[0] * v[0] + a[1] * v[1] + a[2] * v[2]; if (d > bd) { bd = d; bk = k; } }); return bk; };
            const balanced = A => { const cnt = new Array(A.length).fill(0); dirs.forEach(v => cnt[nameOf(A) ? decodeFloat(v, A) : argmax(v, A)]++); const q = 1 / A.length, sd = Math.sqrt(N * q * (1 - q)); return cnt.every(x => Math.abs(x - N * q) < 5 * sd); };
            for (const [, A] of sets) { t++; const G = symmetryGroup(A); if (new Set(G.map(g => g.sigma[0])).size === A.length && balanced(A)) p++; }
            const lop = [[1, 0, 0], [-1, 0, 0], [0, 1, 0]];               // control: an anchor set with no transitive symmetry
            add('D4', 'Every answer has the same share', t, p, [balanced(lop) ? 0 : 1, 1], `G_A is transitive on A, and ${N.toLocaleString()} uniform directions split evenly (within 5σ); the lopsided set {+e1, −e1, +e2} does not`);
        }
        { // D5
            const rng = new C.Rng(seed + 5), inst = P.plantedThreeColouring(45, 4.4, new C.Rng(seed + 55)), G = symmetryGroup(AXES);
            let t = 0, p = 0, c = 0, cr = 0;
            const Rq = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];               // control: a quarter-turn about e3, not in G_AXES
            for (let i = 0; i < n(20); i++) {
                const pts = Array.from({ length: 45 }, () => [0, 1, 2].map(() => 2 * rng.random() - 1)), base = conflicts3D(pts, inst.edges);
                for (const g of G) { t++; if (conflicts3D(pts.map(y => rotate(g.R, y)), inst.edges) === base) p++; }
                cr++; if (conflicts3D(pts.map(y => rotate(Rq, y)), inst.edges) !== base) c++;
            }
            add('D5', 'Global axis rotations leave B1 unchanged', t, p, [c > 0 ? 1 : 0, 1], `the conflict count of a 3-colouring in H³ under the 3 rotations of G_AXES; a quarter-turn changed it on ${c} of ${cr}`);
        }
        const emb = new TreeEmbedding3D(), J = [-1, 1, 1, 1];
        { // E1
            let t = 0, p = 0;
            const words = [[]]; for (let L = 0; L < 2; L++) for (const w of words.slice()) if (w.length === L) for (const g of P.children(w)) words.push([...w, g]);
            for (const w of words) {
                const M = emb.frameExact(w); t++;
                const ok = [0, 1, 2, 3].every(i => [0, 1, 2, 3].every(j => [0, 1, 2, 3].reduce((s, k) => s.add(M[k][i].mul(M[k][j]).mul(new Q(BigInt(J[k])))), Q.ZERO).eq(new Q(BigInt(i === j ? J[i] : 0)))));
                if (ok) p++;
            }
            const bad = emb.frameExact([0, 2]).map(r => r.slice()); bad[1][1] = bad[1][1].add(new Q(1n, 1n << 40n));
            const badOk = [0, 1, 2, 3].every(i => [0, 1, 2, 3].every(j => [0, 1, 2, 3].reduce((s, k) => s.add(bad[k][i].mul(bad[k][j]).mul(new Q(BigInt(J[k])))), Q.ZERO).eq(new Q(BigInt(i === j ? J[i] : 0)))));
            add('E1', 'Every node frame is an exact Lorentz matrix', t, p, [badOk ? 0 : 1, 1], `MᵀJM = J in rationals for all ${t} nodes to depth 2 (cosh τ = 25/7, sinh τ = 24/7); a frame nudged by 2⁻⁴⁰ fails`);
        }
        { // E2, E3
            const rng = new C.Rng(seed + 6); let t = 0, p = 0, t3 = 0, p3 = 0;
            for (let i = 0; i < n(30); i++) {
                const L = 1 + rng.below(7), w = [rng.below(6)]; while (w.length < L) { const k = P.children(w); w.push(k[rng.below(k.length)]); }
                const dec = emb.decodeExact(emb.pointExact(w), L); t++; if (dec.join() === w.join()) p++;
                t3++; if (certifyWord(dec, L)) p3++;
            }
            const low = new TreeEmbedding3D(new Q(1n, 2n)); let bad = 0; const runs = n(60);
            for (let i = 0; i < runs; i++) { const w = [rng.below(6)]; while (w.length < 6) { const k = P.children(w); w.push(k[rng.below(k.length)]); } if (low.decodeExact(low.pointExact(w), 6).join() !== w.join()) bad++; }
            add('E2', 'Greedy decoding returns every node', t, p, [bad > 0 ? 1 : 0, 1], `exact round trips of random nodes to depth 7 at t = 3/4 > 1/√2; at t = 1/2, below the threshold, ${bad} of ${runs} depth-6 nodes decode wrongly (t = 2/3 fails too, rarely: 192 of all 18,750 depth-6 nodes)`);
            add('E3', 'Helix B certifies the decoded words', t3, p3, [certifyWord([0, 1], 2) ? 0 : 1, 1], 'quaternion of norm 5^L, right-division returns the word, and it is reduced; the unreduced word 0 1 is rejected');
        }
        return out;
    }

    return { AXES, TETRA, OCTA, CUBE, ANCHORS, decodeExact, decodeFloat, symmetryGroup, rotate, rotateExact, TreeEmbedding3D, slotDirection,
        conflicts3D, unsat3D, nearestExact, certifyWord, runParity3d, runChecks3d, version: '2.0-a' };
});
