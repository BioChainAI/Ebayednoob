// Live checks of H1-H7 on the browser core: each property is tested on seeded random instances, in exact rational
// arithmetic where the claim is exact, and each check also runs a control that must fail, so a check that cannot
// fail is caught.
//
//   runProofChecks(HPCore, { seed, scale }) -> [{ id, title, trials, passed, worst, control, detail }]
// scale multiplies the number of trials (1 = the page's default, a few seconds in total).
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.HPProofs = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function runProofChecks(C, { seed = 2026, scale = 1 } = {}) {
        const { Q, X, H, Rng, PolyStepH, softmaxWeights } = C;
        const out = [];
        const n = k => Math.max(1, Math.round(k * scale));
        const randUnit = (rng, d) => { const v = Array.from({ length: d }, () => 2 * rng.random() - 1); const s = H.norm(v) || 1; return v.map(x => x / s); };
        const randPoint = (rng, d, maxDist) => H.expOrigin(randUnit(rng, d).map(x => x * maxDist * rng.random()));
        const randRot = (rng, d) => {                                       // a float rotation in SO(d): a Cayley map
            const A = X.randomSkew(rng, d, 64).map(row => row.map(v => v.toNumber()));
            const I = A.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)));
            return H.matmul(I.map((row, i) => row.map((x, j) => x - A[i][j])), H.solve(I.map((row, i) => row.map((x, j) => x + A[i][j])), I));
        };
        const det = M => {                                                  // float determinant, Gaussian elimination
            const A = M.map(r => r.slice()), k = A.length; let s = 1;
            for (let c = 0; c < k; c++) {
                let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
                if (A[p][c] === 0) return 0;
                if (p !== c) { [A[p], A[c]] = [A[c], A[p]]; s = -s; }
                s *= A[c][c];
                for (let r = c + 1; r < k; r++) { const f = A[r][c] / A[c][c]; for (let j = c; j < k; j++) A[r][j] -= f * A[c][j]; }
            }
            return s;
        };
        const hashCost = (salt) => pts => pts.map(row => {                 // a deterministic, gradient-free black box
            let h = salt;
            for (const y of row) for (const v of y) h = Math.sin(h * 12.9898 + v * 78.233) * 43758.5453;
            return Math.floor(Math.abs(h % 1) * 8);
        });
        // coordinate gap relative to the point's size: acosh near 1 loses half the digits, so tiny distances are not measured with it
        const gap = (a, b) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0) / Math.max(1, Math.abs(a[0]));
        const add = (id, title, trials, passed, worst, control, detail) => out.push({ id, title, trials, passed, worst, control, detail });

        // ------------------------------------------------ H1: exact corners and snapped states lie on the sheet
        {
            const rng = new Rng(seed + 1); let trials = 0, passed = 0, ctl = 0, ctlRuns = 0;
            for (let i = 0; i < n(40); i++) {
                const d = 2 + rng.below(3);
                const p = Array.from({ length: d }, () => new Q(BigInt(rng.randint(-40000, 40000)), 1n << 16n));
                if (p.reduce((s, v) => s + v.toNumber() ** 2, 0) >= 0.95) continue;
                const x = X.ghost(p), R = X.randomRotation(rng, d), t = new Q(BigInt(1 + rng.below(63)), 64n);
                for (const u of X.orthoplexDirections(R)) { trials++; if (X.onSheet(X.pointAt(x, t, u))) passed++; }
                const yf = H.expAt(X.toFloat(x), randUnit(rng, d).map(v => v * 3 * rng.random()));
                trials++; if (X.onSheet(X.snap(yf)[0])) passed++;
                // control: a corner nudged by 2^-60 in one coordinate must leave the sheet
                ctlRuns++; const V = X.pointAt(x, t, X.orthoplexDirections(R)[0]); V[1] = V[1].add(new Q(1n, 1n << 60n)); if (!X.onSheet(V)) ctl++;
            }
            add('H1', 'Everything stays on the sheet', trials, passed, null, [ctl, ctlRuns], 'exact: <y, y> = -1 and y0 > 0 in rationals, for every corner and every snapped state');
        }

        // ------------------------------------------------ H2: every factor moves at most r (with the horizon)
        {
            const rng = new Rng(seed + 2); let trials = 0, passed = 0, worst = -Infinity, ctl = 0, ctlRuns = 0;
            // d(a, b) <= r up to float rounding: an error of k ulps in -<a, b> ~ a0 b0 moves acosh by about k 1e-16 a0 b0 / sinh r
            const within = (a, b, r) => H.dist(a, b) <= r + 1e-13 * a[0] * b[0] / Math.sinh(r);
            for (let i = 0; i < n(40); i++) {
                const d = 2 + rng.below(2), m = 1 + rng.below(4), P = 1 + rng.below(3), r = 0.05 + 2.95 * rng.random();
                const sol = new PolyStepH(hashCost(rng.random()), m, d, { epsilon: Math.pow(10, -2 + 2.5 * rng.random()), stepRadius: r, block: rng.below(2) ? null : 1 + rng.below(m), horizon: 8 }, new Rng(seed * 7 + i));
                const st = sol.initState(Array.from({ length: P }, () => Array.from({ length: m }, () => randPoint(rng, d, 8))));
                for (let k = 0; k < 4; k++) {
                    const info = sol.step(st, true);
                    for (let p = 0; p < P; p++) for (const f of info.block) {
                        const a = info.Xbefore[p][f], b = st.X[p][f], mv = H.dist(a, b);
                        trials++; worst = Math.max(worst, mv / r); if (within(a, b, r)) passed++;
                    }
                }
                // control: a move 0.1% longer than r, from a point as far out as the step's, must fail the same check
                const x = randPoint(rng, d, 8), y = H.expAt(x, randUnit(rng, d).map(v => v * r * 1.001));
                ctlRuns++; if (!within(x, y, r)) ctl++;
            }
            add('H2', 'One step moves each factor at most r', trials, passed, worst, [ctl, ctlRuns], 'worst d(x, x\') / r over all factors of all particles, horizon 8 on; the check allows float rounding of 1e-13 x0 y0 / sinh r');
        }

        // ------------------------------------------------ H3: the centroid minimises the weighted squared Lorentzian distance
        {
            const rng = new Rng(seed + 3); let trials = 0, passed = 0, worst = Infinity, ctl = 0, ctlRuns = 0;
            for (let i = 0; i < n(60); i++) {
                const d = 2 + rng.below(3), k = 2 + rng.below(6);
                const V = Array.from({ length: k }, () => randPoint(rng, d, 4)), wr = V.map(() => rng.random() + 1e-3), S = wr.reduce((a, b) => a + b, 0), w = wr.map(v => v / S);
                const F = y => V.reduce((a, v, j) => a + w[j] * (-2 - 2 * H.lorentz(y, v)), 0), c = H.lorentzCentroid(V, w), Fc = F(c);
                for (let q = 0; q < 20; q++) {
                    const y = q < 10 ? H.expAt(c, randUnit(rng, d).map(v => v * 1e-3 * (1 + 100 * rng.random()))) : randPoint(rng, d, 5);
                    trials++; const gap = F(y) - Fc; worst = Math.min(worst, gap); if (gap >= -1e-9 * (1 + Math.abs(Fc))) passed++;
                }
                // control: the first corner is (almost surely) not the minimiser
                ctlRuns++; if (F(V[0]) > Fc + 1e-12) ctl++;
            }
            add('H3', 'The centroid is the best compromise', trials, passed, worst, [ctl, ctlRuns], 'smallest F(y) - F(centroid) seen over nearby and random y (must be >= 0)');
        }

        // ------------------------------------------------ H4: the step commutes with Lorentz isometries
        {
            const rng = new Rng(seed + 4); let trials = 0, passed = 0, worst = 0, ctl = 0, ctlRuns = 0;
            for (let i = 0; i < n(40); i++) {
                const d = 2 + rng.below(2), r = 0.1 + 2 * rng.random(), eps = 0.05 + rng.random();
                const z = randPoint(rng, d, 3), Rg = randRot(rng, d), G = H.matmul(H.boost(z), [[1, ...new Array(d).fill(0)], ...Rg.map(row => [0, ...row])]);
                const Ginv = H.lorentzInverse(G), x = randPoint(rng, d, 4), gx = H.matvec(G, x), R = randRot(rng, d);
                const f = pts => pts.map(row => { const y = row[0]; return Math.floor(4 * (Math.sin(3 * y[1]) + Math.cos(2 * y[2]) + y[0] / 5)); });
                const fg = pts => f(pts.map(row => [H.matvec(Ginv, row[0])]));
                // Q = (G L_x)^-1 L_gx fixes the origin; its spatial block is a rotation; R' = Q^T R
                const Qm = H.matmul(H.lorentzInverse(H.matmul(G, H.boost(x))), H.boost(gx)), Qs = Qm.slice(1).map(row => row.slice(1));
                const Rp = H.matmul(H.transpose(Qs), R);
                const a = new PolyStepH(f, 1, d, { epsilon: eps, stepRadius: r, horizon: null, elitist: false }, new Rng(1)); a.fixedR = [[R], null];
                const b = new PolyStepH(fg, 1, d, { epsilon: eps, stepRadius: r, horizon: null, elitist: false }, new Rng(1)); b.fixedR = [[Rp], null];
                const sa = a.initState([[x]]), sb = b.initState([[gx]]); a.step(sa); b.step(sb);
                const want = H.matvec(G, sa.X[0][0]), got = sb.X[0][0], err = gap(want, got);
                trials++; worst = Math.max(worst, err); if (err < 1e-9 && Math.abs(det(Qs) - 1) < 1e-9 && Math.abs(Qm[0][0] - 1) < 1e-9) passed++;
                // control: the same step at gx with the unadjusted rotation R generally differs
                const c = new PolyStepH(fg, 1, d, { epsilon: eps, stepRadius: r, horizon: null, elitist: false }, new Rng(1)); c.fixedR = [[R], null];
                const sc = c.initState([[gx]]); c.step(sc); ctlRuns++; if (gap(want, sc.X[0][0]) > 1e-6) ctl++;
            }
            add('H4', 'Any chart gives the same step', trials, passed, worst, [ctl, ctlRuns], 'largest relative coordinate gap between g·step(x) and step(gx), with the rotation carried by g (horizon off)');
        }

        // ------------------------------------------------ H5: curvature -c -> 0 gives polystep's step
        {
            const rng = new Rng(seed + 5); let trials = 0, passed = 0, worst = 0, ctl = 0, ctlRuns = 0;
            for (let i = 0; i < n(30); i++) {
                const d = 2 + rng.below(3), r = 0.1 + rng.random(), eps = 0.1 + rng.random();
                const xi = Array.from({ length: d }, () => 4 * rng.random() - 2), R = randRot(rng, d);
                const dirs = []; for (let k = 0; k < 2 * d; k++) dirs.push(R.map(row => (k < d ? 1 : -1) * row[k % d]));
                const f = z => Math.sin(2 * z[0]) + z.reduce((a, v) => a + v * v, 0) / 4;
                const flatCorners = dirs.map(u => xi.map((v, c) => v + r * u[c])), wf = softmaxWeights([flatCorners.map(f)], eps)[0];
                const flat = xi.map((_, c) => flatCorners.reduce((a, v, k) => a + wf[k] * v[c], 0));
                // the same step on the hyperboloid of curvature -c, read in spatial coordinates
                const stepC = cc => {
                    const sc = Math.sqrt(cc), x0 = Math.sqrt(1 / cc + xi.reduce((a, v) => a + v * v, 0)), ch = Math.cosh(sc * r), sh = Math.sinh(sc * r) / sc;
                    const V = dirs.map(u => { const b = u.map(v => sh * v), xb = xi.reduce((a, v, c) => a + v * b[c], 0);
                        const sp = xi.map((v, c) => v * ch + b[c] + cc * v * xb / (1 + sc * x0)); return [Math.sqrt(1 / cc + sp.reduce((a, v) => a + v * v, 0)), ...sp]; });
                    const w = softmaxWeights([V.map(y => f(y.slice(1)))], eps)[0];
                    const s = V[0].map((_, c) => V.reduce((a, y, k) => a + w[k] * y[c], 0)), norm = Math.sqrt(s[0] * s[0] - s.slice(1).reduce((a, v) => a + v * v, 0)) * sc;
                    return s.slice(1).map(v => v / norm);
                };
                const errs = [1e-1, 1e-3, 1e-5].map(cc => H.norm(stepC(cc).map((v, c) => v - flat[c])));
                trials++; worst = Math.max(worst, errs[2]);
                if (errs[2] < 1e-3 && errs[2] <= errs[1] + 1e-12 && errs[1] <= errs[0] + 1e-12) passed++;
                // control: at curvature -1 the step differs from polystep's
                ctlRuns++; if (H.norm(stepC(1).map((v, c) => v - flat[c])) > 1e-4) ctl++;
            }
            // and the core's curvature-0 geometry is polystep's formula exactly
            const rng2 = new Rng(seed + 55); let exactFlat = 0, tries = 0;
            for (let i = 0; i < n(20); i++) {
                const d = 2 + rng2.below(3), r = 0.1 + rng2.random(), eps = 0.1 + rng2.random(), R = randRot(rng2, d), x = Array.from({ length: d }, () => 2 * rng2.random() - 1);
                const f = pts => pts.map(row => Math.floor(3 * Math.sin(row[0][0] * 5 + row[0][1] * 3)));
                const s = new PolyStepH(f, 1, d, { epsilon: eps, stepRadius: r, geometry: 'flat', horizon: null, elitist: false }, new Rng(1)); s.fixedR = [[R], null];
                const st = s.initState([[x]]); s.step(st);
                const V = []; for (let k = 0; k < 2 * d; k++) V.push(x.map((v, c) => v + r * (k < d ? 1 : -1) * R[c][k % d]));
                const w = softmaxWeights([f(V.map(v => [v]))], eps)[0], want = x.map((_, c) => V.reduce((a, v, k) => a + w[k] * v[c], 0));
                tries++; if (H.norm(want.map((v, c) => v - st.X[0][0][c])) < 1e-12) exactFlat++;
            }
            trials += tries; passed += exactFlat;
            add('H5', 'Flat space gives polystep back', trials, passed, worst, [ctl, ctlRuns], 'distance to polystep\'s step at curvature -1e-5 (it shrinks with c); the curvature-0 geometry matches polystep\'s formula to 1e-12');
        }

        // ------------------------------------------------ H6: small epsilon picks the best corner; the incumbent never worsens
        {
            const rng = new Rng(seed + 6); let trials = 0, passed = 0, worst = 0, ctl = 0, ctlRuns = 0;
            for (let i = 0; i < n(40); i++) {
                const d = 2 + rng.below(3), r = 0.2 + rng.random(), x = randPoint(rng, d, 3), R = randRot(rng, d), V = [];
                for (let k = 0; k < 2 * d; k++) V.push(H.expAt(x, R.map(row => (k < d ? 1 : -1) * row[k % d] * r)));
                const C = V.map(() => 0.1 * rng.below(20)), kmin = C.indexOf(Math.min(...C));
                if (C.filter(c => c === C[kmin]).length > 1) continue;
                const x1 = H.lorentzCentroid(V, softmaxWeights([C], 1e-3)[0]), e = gap(x1, V[kmin]);
                trials++; worst = Math.max(worst, e); if (e < 1e-9) passed++;
                ctlRuns++; if (H.dist(H.lorentzCentroid(V, softmaxWeights([C], 1)[0]), V[kmin]) > 1e-3) ctl++;
            }
            for (let i = 0; i < n(10); i++) {
                const m = 2 + rng.below(3), sol = new PolyStepH(hashCost(rng.random()), m, 2, { epsilon: 0.5, stepRadius: 1 }, new Rng(seed + 60 + i));
                const st = sol.initState(Array.from({ length: 3 }, () => Array.from({ length: m }, () => randPoint(rng, 2, 3))));
                let prev = null, mono = true;
                for (let k = 0; k < 15; k++) { sol.step(st); if (prev) st.bestCost.forEach((c, p) => { if (c > prev[p]) mono = false; }); prev = st.bestCost.slice(); }
                trials++; if (mono) passed++;
            }
            add('H6', 'Small epsilon picks the best corner', trials, passed, worst, [ctl, ctlRuns], 'relative coordinate gap between the centroid and the best corner at epsilon = 1e-3 with a cost gap of 0.1; and incumbents never worsen over 15 steps');
        }

        // ------------------------------------------------ H7: the register's pump closes exactly
        {
            const rng = new Rng(seed + 7); let trials = 0, passed = 0, ctl = 0, ctlRuns = 0;
            const pt = d => X.ghost(Array.from({ length: d }, () => new Q(BigInt(rng.randint(-900, 900)), 2048n)));
            for (let i = 0; i < n(12); i++) {
                const d = 2 + rng.below(2), start = pt(d), dq = new Array(720).fill(null), frames = rng.sample(720, 8 + rng.below(30)).sort((a, b) => a - b);
                let x = start; for (const f of frames) { const y = pt(d); dq[f] = X.displacement(x, y); x = y; }
                trials++; if (X.pumpHolds(dq, start, x) && dq.every(D => !D || X.isLorentz(D))) passed++;
                // controls: two increments swapped, or the wrong end point, must fail
                const sw = dq.slice(); [sw[frames[0]], sw[frames[1]]] = [sw[frames[1]], sw[frames[0]]];
                ctlRuns += 2; if (!X.pumpHolds(sw, start, x)) ctl++; if (!X.pumpHolds(dq, start, pt(d))) ctl++;
            }
            add('H7', 'The register\'s holonomy is exact', trials, passed, null, [ctl, ctlRuns], 'exact: Q10 = Q8 = H = P^-1 and P carries the start to the end, every increment a rational Lorentz matrix');
        }
        return out;
    }
    return { runProofChecks };
});
