// Trace parity: replay the Python reference's traces (reference/traces/*.json) through the browser core.
// Exact fields must match exactly; float fields within the trace's tolerance (relative, 1e-12); Sinkhorn plans,
// which both sides stop at a convergence threshold, within 1e-5. Each comparison is one line of the report.
//
//   runParity(HPCore, traces) -> { lines: [{ file, name, ok, detail }], passed, total }
// traces is { 'prng.json': {...}, ... } as loaded from disk (Node) or fetched (browser).
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.HPParity = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function runParity(C, traces) {
        const lines = [];
        const add = (file, name, ok, detail = '') => lines.push({ file, name, ok: !!ok, detail });
        const relClose = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
        const allClose = (A, B, tol) => {
            const fa = [].concat(...[A].flat(9)), fb = [].concat(...[B].flat(9));
            if (fa.length !== fb.length) return [false, `length ${fa.length} vs ${fb.length}`];
            let worst = 0;
            for (let i = 0; i < fa.length; i++) worst = Math.max(worst, Math.abs(fa[i] - fb[i]) / Math.max(1, Math.abs(fa[i]), Math.abs(fb[i])));
            return [worst <= tol, `worst relative difference ${worst.toExponential(2)}`];
        };
        const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        const qstr = v => `${v.n}/${v.d}`;
        const exactList = arr => arr.map(qstr);

        // ---------------------------------------------------------------- the generator
        if (traces['prng.json']) {
            const T = traces['prng.json'].data, f = 'prng.json';
            const r = new C.Rng(0, [1, 2, 3, 4]);
            add(f, 'xoshiro128** vector, state (1, 2, 3, 4)', same(Array.from({ length: 20 }, () => r.nextU32()), T.xoshiro128ss_state_1_2_3_4));
            add(f, 'splitmix32 seeding of 42', same(new C.Rng(42).s, T.seed_42_state));
            const s = new C.Rng(42);
            add(f, 'seed 42, ten outputs', same(Array.from({ length: 10 }, () => s.nextU32()), T.seed_42_u32));
            const t = new C.Rng(7);
            add(f, 'seed 7, ten floats in [0, 1) (bit for bit)', same(Array.from({ length: 10 }, () => t.random()), T.seed_7_random));
            add(f, 'seed 7, below(1000)', same(Array.from({ length: 10 }, () => t.below(1000)), T.seed_7_below_1000));
            add(f, 'seed 7, sample(50, 10)', same(t.sample(50, 10), T.seed_7_sample_50_10));
            add(f, 'seed 7, rationals a/4', same(Array.from({ length: 10 }, () => qstr(t.rational(4))), T.seed_7_rational_4));
            add(f, 'seed 7, exact Cayley rotation in 3D', same(C.X.randomRotation(t, 3).map(exactList), T.seed_7_cayley_3));
        }

        // ---------------------------------------------------------------- geometry
        if (traces['geometry.json']) {
            const tol = traces['geometry.json'].meta.float_tolerance, f = 'geometry.json';
            traces['geometry.json'].data.forEach((c, i) => {
                const x = C.H.fromPoincare(c.p), y = C.H.expAt(x, c.v);
                const g = allClose(x, c.ghost_float, tol), e = allClose(y, c.exp_at, tol);
                add(f, `case ${i + 1}: ghost map, exp at a point, distance, Klein chart`, g[0] && e[0] && relClose(C.H.dist(x, y), c.dist, tol) && allClose(C.H.toKlein(y), c.klein, tol)[0], e[1]);
                const p16 = c.p.map(v => new C.Q(BigInt(Math.floor(v * 65536 + 0.5)), 65536n)), xq = C.X.ghost(p16);
                add(f, `case ${i + 1}: exact ghost point and boost`, same(exactList(xq), c.ghost_exact_of_p16) && same(C.X.boost(xq).map(exactList), c.boost_exact));
            });
        }

        // ---------------------------------------------------------------- one channel, step by step
        if (traces['step_b1.json']) {
            const T = traces['step_b1.json'].data, cfg = T.config, f = 'step_b1.json', tol = traces['step_b1.json'].meta.float_tolerance;
            const prob = new C.ThreeColouring(T.instance.n, T.instance.c, new C.Rng(T.instance.seed));
            add(f, 'instance: planted classes and edges', same(prob.classes, T.instance.classes) && same(prob.edges, T.instance.edges));
            const s = new C.PolyStepH(C.objective(prob), prob.m, 2, { epsilon: cfg.epsilon, stepRadius: cfg.step_radius, block: cfg.block, exact: true,
                rotation: 'cayley_exact', snapBits: cfg.snap_bits, cayleyK: cfg.K }, new C.Rng(cfg.rng_seed));
            const st = s.initState(prob.initPoints(new C.Rng(cfg.init_seed), cfg.particles, cfg.init_spread));
            add(f, 'initial states, snapped exactly', same(st.Xq.map(row => row.map(exactList)), T.initial_state));
            T.steps.forEach((ref, k) => {
                const info = s.step(st, true), i0 = info.block[0];
                const exactOk = same(info.block, ref.block) && same(info.Rq.map(R => R.map(exactList)), ref.rotation)
                    && same(info.exactCorners.map(row => row.map(c => exactList(c[i0]))), ref.corners) && same(info.C, ref.costs)
                    && same(st.Xq.map(row => row.map(exactList)), ref.state) && same(st.Xq.map(row => prob.helixB(row.map(y => y.map(v => v.toNumber())))), ref.helix_b);
                const w = allClose(info.W, ref.weights, tol);
                add(f, `step ${k + 1}: block, rotation, corners, costs, state, Helix B exact; weights`, exactOk && w[0], w[1]);
            });
        }

        // ---------------------------------------------------------------- three channels, two registers
        if (traces['channels_b1.json']) {
            const T = traces['channels_b1.json'].data, f = 'channels_b1.json';
            const prob = new C.ThreeColouring(9, 4.4, new C.Rng(T.instance_seed));
            const sols = [], sts = [];
            for (let j = 0; j < 3; j++) {
                const sol = new C.PolyStepH(C.objective(prob), prob.m, 2, { epsilon: 0.5, stepRadius: 0.6, block: 1, exact: true, rotation: 'cayley_exact' }, new C.Rng(T.rng_seeds[j]));
                sts.push(sol.initState(prob.initPoints(new C.Rng(T.init_seeds[j]), 1))); sols.push(sol);
            }
            const tc = new C.TriChannel(sols, sts, prob, { clutch: T.clutch, mu: T.mu, exactRegister: true }).run({ frames: 1440 });
            T.memory.forEach((m, i) => {
                const w = tc.memory[i] || {};
                add(f, `zero point ${i + 1} (frame ${m.F}): certified costs, best, Y and chain hash`, w.F === m.F && same(w.costs, m.costs) && w.Y === m.Y && w.best === m.best && w.hash === m.hash);
            });
            add(f, 'steps per channel, evaluations', same(sts.map(st => st.iteration), T.steps) && tc.evaluations === T.evaluations);
            T.registers.forEach((r, i) => add(f, `register ${i + 1}: the pump closes with H = P^-1`, tc.registers[i] && tc.registers[i].F === r.F && tc.registers[i].pump_identity === r.pump_identity && r.pump_identity));
            add(f, 'final exact states of all three channels', same(sts.map(st => st.Xq.map(row => row.map(exactList))), T.final_states));
        }

        // ---------------------------------------------------------------- instances, tree, Sinkhorn
        if (traces['maxsat.json']) {
            const T = traces['maxsat.json'].data, f = 'maxsat.json';
            add(f, "polystep's generator (Python's random), n = 50, seed 42", same(C.P.maxsatInstance(50, 4.27, 42, 'polystep'), T.polystep_50_42));
            add(f, "polystep's generator, n = 200, seed 1000", same(C.P.maxsatInstance(200, 4.27, 1000, 'polystep'), T.polystep_200_1000));
            add(f, 'shared-generator variant, n = 40, seed 3', same(C.P.maxsatInstance(40, 4.27, 3, 'xoshiro'), T.xoshiro_40_3));
        }
        if (traces['tree.json']) {
            const f = 'tree.json', emb = new C.TreeEmbedding(3);
            traces['tree.json'].data.forEach((c, i) => {
                const q = C.P.wordQuaternion(c.word).map(String), dec = emb.decode(c.local, c.word.length, c.anchor);
                add(f, `word ${i + 1} (depth ${c.word.length}): quaternion, right-division, anchored decoding`,
                    same(q, c.quaternion) && same(C.P.rightDivide(C.P.wordQuaternion(c.word), c.word.length), c.word) && same(dec, c.decoded));
            });
        }
        if (traces['sinkhorn.json']) {
            const f = 'sinkhorn.json';
            traces['sinkhorn.json'].data.forEach((c, i) => {
                const r = allClose(C.sinkhornWeights(c.C, c.epsilon), c.W, 1e-5);
                add(f, `plan ${i + 1} (${c.C.length} x ${c.C[0].length}, eps ${c.epsilon}), approximate`, r[0], r[1]);
            });
        }
        const passed = lines.filter(l => l.ok).length;
        return { lines, passed, total: lines.length };
    }
    return { runParity, files: ['prng.json', 'geometry.json', 'step_b1.json', 'channels_b1.json', 'maxsat.json', 'tree.json', 'sinkhorn.json'] };
});
