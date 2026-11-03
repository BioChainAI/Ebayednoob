// The rational replacements for sin, cos, tan and 3D rotation (operator specification, section 12.1, eqs. 85-88), a
// port of reference/hpstep/rational_trig.py on the browser core's exact rationals (load hyperbolic_core.js first).
// Nothing here calls a transcendental function except the checks' comparisons with Math.
//
//   HPTrig.halfAngle(Q)        cos, sin^2, tan^2 from Q = tan^2(theta/2)            (eq. 85)
//   HPTrig.rot(u, x)           the rotation by the tangent half-angle vector u       (eq. 86)
//   HPTrig.symmedian(A, C0)    symmedian foot and Apollonius point, harmonic         (eq. 87)
//   HPTrig.ghostQuadrance(p,r) sinh^2 d between Poincare-ball points                 (eq. 88)
//   HPTrig.compose(a, b)       the exact Gibbs vector of R(a) R(b)                   (replaces eq. 88's drift sum)
//   HPTrig.keypadTrig(a)       the Geometric Calculator keypad's sin, cos (eq. 85 with the double angle)
//   HPTrig.runChecksTrig()     R1-R6 live, each with a control that must fail
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./hyperbolic_core.js'));
    else root.HPTrig = factory(root.HPCore);
})(typeof self !== 'undefined' ? self : this, function (C) {
    'use strict';
    const { Q, X } = C;
    const q = v => (v instanceof Q ? v : typeof v === 'number' ? Q.fromDouble(v) : typeof v === 'string' ? Q.parse(v) : new Q(BigInt(v)));
    const dot = (a, b) => a.reduce((s, x, i) => s.add(x.mul(b[i])), Q.ZERO);
    const cross = (a, b) => [a[1].mul(b[2]).sub(a[2].mul(b[1])), a[2].mul(b[0]).sub(a[0].mul(b[2])), a[0].mul(b[1]).sub(a[1].mul(b[0]))];
    const TWO = Q.TWO, ONE = Q.ONE;

    // ---------------------------------------------------------------- eq. 85
    function halfAngle(Qv) {
        Qv = q(Qv); const den = ONE.add(Qv);
        return { cos: ONE.sub(Qv).div(den), sin2: new Q(4n).mul(Qv).div(den.mul(den)), tan2: Qv.eq(ONE) ? null : new Q(4n).mul(Qv).div(ONE.sub(Qv).mul(ONE.sub(Qv))) };
    }
    const unitPoint = t => { t = q(t); const d = ONE.add(t.mul(t)); return [ONE.sub(t.mul(t)).div(d), TWO.mul(t).div(d)]; };

    // ---------------------------------------------------------------- eq. 86
    function rot(u, x) {
        u = u.map(q); x = x.map(q);
        const ux = cross(u, x), uux = cross(u, ux), k = TWO.div(ONE.add(dot(u, u)));
        return x.map((xi, i) => xi.add(k.mul(ux[i].add(uux[i]))));
    }
    function rotMatrix(u) { const cols = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(e => rot(u, e.map(v => new Q(BigInt(v))))); return [0, 1, 2].map(i => [0, 1, 2].map(j => cols[j][i])); }
    const skew = u => { u = u.map(q); return [[Q.ZERO, u[2].neg(), u[1]], [u[2], Q.ZERO, u[0].neg()], [u[1].neg(), u[0], Q.ZERO]]; };

    // ---------------------------------------------------------------- eq. 87
    function symmedian(A, C0) {
        A = A.map(q); C0 = q(C0);
        const Q3 = A[0].mul(A[0]).add(A[1].mul(A[1])), dx = A[0].sub(TWO.mul(C0)), Q2 = dx.mul(dx).add(A[1].mul(A[1]));
        return { xF: Q3.div(Q2.add(Q3)).mul(TWO).mul(C0), xE: Q3.eq(Q2) ? null : Q3.div(Q3.sub(Q2)).mul(TWO).mul(C0), Q2, Q3 };
    }
    const crossRatio = (a, b, c, d) => c.sub(a).div(c.sub(b)).div(d.sub(a).div(d.sub(b)));

    // ---------------------------------------------------------------- eq. 88
    function ghostQuadrance(p, r) {
        p = p.map(q); r = r.map(q); const pp = dot(p, p), rr = dot(r, r);
        const c = ONE.add(pp).mul(ONE.add(rr)).sub(new Q(4n).mul(dot(p, r))).div(ONE.sub(pp).mul(ONE.sub(rr)));
        return c.mul(c).sub(ONE);
    }
    function compose(a, b) { a = a.map(q); b = b.map(q); const d = ONE.sub(dot(a, b)); if (d.isZero()) return null; const c = cross(a, b); return a.map((x, i) => x.add(b[i]).add(c[i]).div(d)); }
    function driftSum(e1, e2, e3) { [e1, e2, e3] = [e1, e2, e3].map(e => e.map(q)); const c12 = cross(e1, e2), c13 = cross(e1, e3), c23 = cross(e2, e3); return [0, 1, 2].map(i => e1[i].add(e2[i]).add(e3[i]).add(c12[i]).add(c13[i]).add(c23[i])); }

    // ---------------------------------------------------------------- the calculator keypad (the same integers as index.html)
    const PI64 = new Q(3141592653589793238462643383279502884197169399375105820974944592n, 10n ** 63n);
    const fdiv = (x, y) => (x >= 0n ? x / y : -((-x + y - 1n) / y));
    function keypadTrig(a, digits = 60n) {
        a = q(a);
        const S = 10n ** 70n, num = a.n * PI64.d, den = a.d * PI64.n * 2n, k = fdiv(2n * num + den, 2n * den);
        const r = a.sub(new Q(2n * k * PI64.n, PI64.d)), x = (r.n * S) / (4n * r.d);
        let sn = 0n, cs = 0n, term = S, j = 0n;
        while (term !== 0n) {
            if (j % 2n === 0n) cs += (j / 2n) % 2n === 0n ? term : -term; else sn += ((j - 1n) / 2n) % 2n === 0n ? term : -term;
            j += 1n; term = (term * x) / (S * j);
        }
        const T = (sn * S) / cs, t = new Q(fdiv(T + 5n * 10n ** (69n - digits), 10n ** (70n - digits)), 10n ** digits);
        const [c2, s2] = unitPoint(t);
        return { sin: TWO.mul(s2).mul(c2), cos: c2.mul(c2).sub(s2.mul(s2)), t };
    }
    const taylor3 = x => [x - x ** 3 / 6 + x ** 5 / 120, 1 - x ** 2 / 2 + x ** 4 / 24];       // the keypad's old kernel

    // ---------------------------------------------------------------- live checks
    function runChecksTrig({ seed = 2029, scale = 1 } = {}) {
        const out = [], n = k => Math.max(1, Math.round(k * scale)), rng = new C.Rng(seed);
        const add = (id, title, trials, passed, control, detail) => out.push({ id, title, trials, passed, control, detail });
        const rq = (K = 60) => new Q(BigInt(rng.randint(-K, K)), BigInt(rng.randint(1, K)));
        const vec = (K = 60) => [rq(K), rq(K), rq(K)];
        const same = (A, B) => A.every((r, i) => r.every((v, j) => v.eq(B[i][j])));
        { // R1 eq. 85
            let t = 0, p = 0;
            for (let i = 0; i < n(200); i++) { const u = vec(), Qv = dot(u, u), h = halfAngle(Qv); t++; if (h.cos.mul(h.cos).add(h.sin2).eq(ONE) && (h.tan2 === null || h.tan2.eq(h.sin2.div(h.cos.mul(h.cos))))) p++; }
            const th = 2 * Math.atan(0.7), h = halfAngle(0.49), agree = Math.abs(h.cos.toNumber() - Math.cos(th)) < 1e-15 && Math.abs(h.sin2.toNumber() - Math.sin(th) ** 2) < 1e-15;
            const [s3, c3] = taylor3(Math.PI), off = Math.abs(s3 * s3 + c3 * c3 - 1);
            add('R1', 'Eq. 85: cos, sin² and tan² from the quadrance are exact', t, p + (agree ? 0 : -t), [off > 0.5 ? 1 : 0, 1],
                `cos² + sin² = 1 and tan² = sin²/cos² exactly on ${t} random rational quadrances, and Q = tan²(θ/2) gives Math.cos and Math.sin² to 10⁻¹⁵; control: the old 3-term polynomial puts (sin π, cos π) at distance² ${(s3 * s3 + c3 * c3).toFixed(3)} from the origin`);
        }
        { // R2 eq. 86
            let t = 0, p = 0;
            const J3 = X.eye(3);
            for (let i = 0; i < n(80); i++) {
                const u = vec(), M = rotMatrix(u), MT = X.transpose(M), fixes = rot(u, u).every((v, k) => v.eq(u[k]));
                const det = M[0][0].mul(M[1][1].mul(M[2][2]).sub(M[1][2].mul(M[2][1]))).sub(M[0][1].mul(M[1][0].mul(M[2][2]).sub(M[1][2].mul(M[2][0])))).add(M[0][2].mul(M[1][0].mul(M[2][1]).sub(M[1][1].mul(M[2][0]))));
                const cay = X.cayley(skew(u)), cayInv = X.cayleyInverse(skew(u)), neg = rotMatrix(u.map(v => v.neg()));
                t++; if (same(X.matmul(MT, M), J3) && det.eq(ONE) && fixes && same(cay, neg) && same(cay, cayInv)) p++;
            }
            const u = vec(), bad = (() => { const x = [1, 0, 0].map(v => new Q(BigInt(v))), ux = cross(u, x), uux = cross(u, ux), k = ONE.div(ONE.add(dot(u, u))); return x.map((xi, i) => xi.add(k.mul(ux[i].add(uux[i])))); })();
            add('R2', 'Eq. 86: Rot(u) is an exact rotation, and the Cayley map of [u]× is Rot(−u)', t, p, [dot(bad, bad).eq(ONE) ? 0 : 1, 1],
                `orthogonal, determinant 1 and fixing u, for ${t} random rational u; the closed Cayley map equals both Rot(−u) and the matrix inverse, Fraction for Fraction; control: with the factor 2 halved the image of e₁ leaves the unit sphere`);
        }
        { // R3 eq. 87
            let t = 0, p = 0;
            for (let i = 0; i < n(120); i++) {
                const A = [rq(), rq()], C0 = rq(); if (A[1].isZero() || C0.isZero()) continue;
                const s = symmedian(A, C0); if (!s.xE) continue;
                t++; if (crossRatio(Q.ZERO, TWO.mul(C0), s.xE, s.xF).eq(ONE.neg()) && s.xF.div(TWO.mul(C0).sub(s.xF)).eq(s.Q3.div(s.Q2))) p++;
            }
            const C0 = new Q(3n), mid = C0, s = symmedian([new Q(1n), new Q(2n)], C0), crm = crossRatio(Q.ZERO, TWO.mul(C0), s.xE, mid);
            add('R3', 'Eq. 87: the symmedian foot and the Apollonius point are harmonic, (B, C; E, F) = −1', t, p, [crm.eq(ONE.neg()) ? 0 : 1, 1],
                `BF : FC = Q₃ : Q₂ and the cross-ratio is exactly −1 on ${t} random triangles; control: with the median's foot (the midpoint) in place of F the cross-ratio is ${crm.toNumber().toFixed(3)}`);
        }
        { // R4 eq. 88, Q_h
            let t = 0, p = 0;
            for (let i = 0; i < n(120); i++) {
                const P = vec(200).map(v => v.div(new Q(4n))), R = vec(200).map(v => v.div(new Q(4n)));
                if (dot(P, P).cmp(ONE) >= 0 || dot(R, R).cmp(ONE) >= 0) continue;
                const a = X.lorentz(X.ghost(P), X.ghost(R)).neg(); t++;
                if (ghostQuadrance(P, R).eq(a.mul(a).sub(ONE))) p++;
            }
            const P = [new Q(1n, 3n), Q.ZERO, Q.ZERO], R = [Q.ZERO, new Q(1n, 2n), Q.ZERO], eu = dot(P.map((v, i) => v.sub(R[i])), P.map((v, i) => v.sub(R[i])));
            add('R4', 'Eq. 88: the ghost kernel Q_h is sinh² of the hyperbolic distance', t, p, [ghostQuadrance(P, R).eq(eu) ? 0 : 1, 1],
                `Q_h(p, r) = (−⟨G(p), G(r)⟩)² − 1 exactly on ${t} random pairs in the ball, the quantity the 0.7 Claude fence decides with; control: the Euclidean quadrance |p − r|² is not it`);
        }
        { // R5 eq. 88, the drift sum against the exact composition
            let t = 0, p = 0;
            for (let i = 0; i < n(120); i++) { const a = vec(8), b = vec(8), g = compose(a, b); if (!g) continue; t++; if (same(X.matmul(rotMatrix(a), rotMatrix(b)), rotMatrix(g))) p++; }
            const errs = [], base = [0, 1, 2].map(() => vec(5));
            for (const e of [new Q(1n, 100n), new Q(1n, 1000n)]) {          // the same three drifts, scaled down tenfold
                const es = base.map(b => b.map(v => v.mul(e))), exact = compose(compose(es[0], es[1]), es[2]), ds = driftSum(...es);
                const rev = [0, 1, 2].map(i => es[0][i].add(es[1][i]).add(es[2][i]).add(cross(es[1], es[0])[i]).add(cross(es[2], es[0])[i]).add(cross(es[2], es[1])[i]));
                const err = v => Math.max(...v.map((x, i) => Math.abs(x.sub(exact[i]).toNumber())));
                errs.push([e.toNumber(), err(ds), err(rev)]);
            }
            const third = errs[0][1] / errs[1][1] > 500, rr = errs[0][2] / errs[1][2], secondRev = rr > 50 && rr < 200;
            t++; if (third) p++;
            add('R5', 'Eq. 88: the drift sum is second order; the composition (a + b + a×b)/(1 − a·b) is exact', t, p, [secondRev ? 1 : 0, 1],
                `R(a)R(b) = R(compose(a, b)) exactly on ${t - 1} random pairs; the drift sum's error falls ${(errs[0][1] / errs[1][1]).toFixed(0)}× when the drifts shrink tenfold (${errs.map(e => e[1].toExponential(1)).join(' → ')}), third order; control: in the reversed order R(ε₃)R(ε₂)R(ε₁) the same sum falls only ${rr.toFixed(0)}× (${errs.map(e => e[2].toExponential(1)).join(' → ')}), second order`);
        }
        { // R6 the keypad
            let t = 0, p = 0;
            for (let i = 0; i < n(30); i++) {
                const a = new Q(BigInt(rng.randint(-40000, 40000)), 1000n), k = keypadTrig(a); t++;
                if (k.sin.mul(k.sin).add(k.cos.mul(k.cos)).eq(ONE) && Math.abs(k.sin.toNumber() - Math.sin(a.toNumber())) < 1e-13 && Math.abs(k.cos.toNumber() - Math.cos(a.toNumber())) < 1e-13) p++;
            }
            const ref = '0.84147098480789650665250232163029899962256306079837', got = keypadTrig(ONE).sin, digits = (() => { let r = got.n * 10n ** 50n / got.d; return '0.' + r.toString().padStart(50, '0'); })();
            t++; if (digits === ref) p++;
            const [s1] = taylor3(1);
            add('R6', 'The calculator keypad: sin and cos as an exact point on the unit circle, every digit right', t, p, [Math.abs(s1 - Math.sin(1)) > 1e-4 ? 1 : 0, 1],
                `sin² + cos² = 1 exactly and agreement with Math to 10⁻¹³ on ${t - 1} angles up to ±40; sin 1 matches a 50-digit reference; control: the old 3-term polynomial gives sin 1 = ${s1.toFixed(6)}`);
        }
        return out;
    }

    return { halfAngle, unitPoint, rot, rotMatrix, skew, symmedian, crossRatio, ghostQuadrance, compose, driftSum, keypadTrig, taylor3, PI64, runChecksTrig, version: '12.1' };
});
