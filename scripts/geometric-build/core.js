// ===== CORE:BEGIN =====
// ---------- Python-compatible number formatting (for line-by-line parity with the script) ----------
const pyExp = (s) => s.replace(/e([+-])(\d)$/, "e$10$2");
const fE = (x, p) => pyExp(x.toExponential(p));
const fF = (x, p, w = 0) => x.toFixed(p).padStart(w);
const fD = (n, w = 0) => String(n).padStart(w);
function fG(x, p) {
    if (x === 0) return "0";
    const e = Number(x.toExponential(p - 1).split("e")[1]);
    const strip = (m) => (m.includes(".") ? m.replace(/0+$/, "").replace(/\.$/, "") : m);
    if (e < -4 || e >= p) { const [m, ex] = x.toExponential(p - 1).split("e"); return pyExp(strip(m) + "e" + ex); }
    return strip(x.toFixed(Math.max(0, p - 1 - e)));
}
const pyFloat = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
const pyStrList = (a) => "[" + a.map((s) => `'${s}'`).join(", ") + "]";

// ---------- Exact rationals (BigInt) ----------
const absB = (a) => (a < 0n ? -a : a);
function gcdB(a, b) { a = absB(a); b = absB(b); while (b) { [a, b] = [b, a % b]; } return a; }
class Fraction {
    constructor(num, den = 1n) {
        let n = BigInt(num), d = BigInt(den);
        if (d === 0n) throw new RangeError("Fraction with zero denominator");
        if (d < 0n) { n = -n; d = -d; }
        const g = gcdB(n, d);
        this.n = n / g; this.d = d / g;
    }
    add(o) { return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { return new Fraction(this.n * o.n, this.d * o.d); }
    div(o) { return new Fraction(this.n * o.d, this.d * o.n); }
    neg() { return new Fraction(-this.n, this.d); }
    eq(o) { return this.n === o.n && this.d === o.d; }
    isZero() { return this.n === 0n; }
    toNumber() { return Number(this.n) / Number(this.d); }
    toString() { return this.d === 1n ? this.n.toString() : `${this.n}/${this.d}`; }
    // Rationalize a float at declared precision 2^-k (Layer A3): round(x * 2^k) / 2^k
    static fromFloat(x, k) { const s = 2 ** k; return new Fraction(BigInt(Math.round(x * s)), 1n << BigInt(k)); }
}
Fraction.ZERO = new Fraction(0n); Fraction.ONE = new Fraction(1n); Fraction.TWO = new Fraction(2n);

// ---------- Exact quaternions over Q: [w, x, y, z] ----------
function qmul(a, b) {
    const [w1, x1, y1, z1] = a, [w2, x2, y2, z2] = b;
    return [
        w1.mul(w2).sub(x1.mul(x2)).sub(y1.mul(y2)).sub(z1.mul(z2)),
        w1.mul(x2).add(x1.mul(w2)).add(y1.mul(z2)).sub(z1.mul(y2)),
        w1.mul(y2).sub(x1.mul(z2)).add(y1.mul(w2)).add(z1.mul(x2)),
        w1.mul(z2).add(x1.mul(y2)).sub(y1.mul(x2)).add(z1.mul(w2))
    ];
}
const qconj = (a) => [a[0], a[1].neg(), a[2].neg(), a[3].neg()];
function qinv(a) { const n = a.reduce((s, x) => s.add(x.mul(x)), Fraction.ZERO); return qconj(a).map((x) => x.div(n)); }
const Q_ONE = [Fraction.ONE, Fraction.ZERO, Fraction.ZERO, Fraction.ZERO];
const qprod = (...qs) => qs.reduce((p, q) => qmul(p, q), Q_ONE);
const qeq = (a, b) => a.every((x, i) => x.eq(b[i]));
// Cayley map (Lemma 9 Part 3): (u1, u2, u3) in Q^3 -> rational unit quaternion
function cayleyMap(u1, u2, u3) {
    const n2 = u1.mul(u1).add(u2.mul(u2)).add(u3.mul(u3));
    const d = Fraction.ONE.add(n2);
    return [Fraction.ONE.sub(n2).div(d), u1.mul(Fraction.TWO).div(d), u2.mul(Fraction.TWO).div(d), u3.mul(Fraction.TWO).div(d)];
}

// ---------- Python's random module (MT19937, seed by init_by_array, randint via getrandbits) ----------
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
        let y = mt[this.i++];
        y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18;
        return y >>> 0;
    }
    getrandbits(k) { return this.uint32() >>> (32 - k); } // k <= 32 is all the script needs
    randbelow(n) { const k = Math.floor(Math.log2(n)) + 1; let r = this.getrandbits(k); while (r >= n) r = this.getrandbits(k); return r; }
    randint(a, b) { return a + this.randbelow(b - a + 1); }
}

// ---------- Physics constants (Layer A, floating point; same values as the script) ----------
const PHYS = { G: 6.67430e-11, c: 299792458.0, GMsun: 1.3271244e20, pc: 3.0856775814913673e16, AU: 149597870700.0,
               M_BH: 4.297e6, R0_pc: 8275.0, yr: 365.25 * 86400, mas: Math.PI / 180 / 3600 / 1000 };
PHYS.GM = PHYS.M_BH * PHYS.GMsun;
PHYS.R0 = PHYS.R0_pc * PHYS.pc;
PHYS.rs = 2 * PHYS.GM / PHYS.c ** 2;
PHYS.tS = 2 * PHYS.GM / PHYS.c ** 3;

// The seven pulsars (SKAO chapter Table 1), in the script's order
const PULSARS = [
    { name: "J1746-2849", P: 1.48, DM: 1360, off: 12.3, tau: "266 @1.5 GHz", rem: "" },
    { name: "J1746-2850", P: 1.08, DM: 941, off: 11.3, tau: "-", rem: "magnetar-like" },
    { name: "J1746-2856", P: 0.95, DM: 1155, off: 15.6, tau: "450 @1 GHz", rem: "" },
    { name: "J1745-2900", P: 3.76, DM: 1778, off: 0.04, tau: "1300 @1 GHz", rem: "magnetar" },
    { name: "J1745-2912", P: 0.19, DM: 1106, off: 14.5, tau: "750 @1 GHz", rem: "" },
    { name: "J1745-2910", P: 0.98, DM: 1088, off: 12.9, tau: "-", rem: "position poorly known" },
    { name: "J1746-2829", P: 1.89, DM: 1309, off: 31.8, tau: "67 @1 GHz", rem: "magnetar-like" }
];
const projPc = (p) => PHYS.R0 * p.off * 60 * 1000 * PHYS.mas / PHYS.pc;

// ---------- Verification: a line-by-line port of verify_galactic_hierarchy.py ----------
function runVerification() {
    const out = []; let failed = null;
    const log = (tag, ...a) => out.push(`[${tag}] ` + a.join(" "));
    const check = (tag, cond, msg) => { log(tag, msg, "->", cond ? "PASS" : "FAIL"); if (!cond && !failed) failed = `${tag} ${msg}`; };
    const { G, c, GMsun, pc, AU, yr, mas, M_BH, R0_pc, GM, R0 } = PHYS;
    const random = new PyRandom(20261026);

    // A
    log("A", `M_BH = ${fG(M_BH, 4)} Msun, R0 = ${fF(R0_pc, 0)} pc, GM = ${fE(GM, 4)} m^3/s^2`);
    // B
    const rs = 2 * GM / c ** 2, thE_inf = Math.sqrt(2 * rs / R0), tS = 2 * GM / c ** 3;
    log("B", `Schwarzschild radius r_s = ${fE(rs, 4)} m = ${fF(rs / AU, 4)} AU; angular size at R0 = ${fF(rs / R0 / mas * 1e3, 2)} uas`);
    log("B", `Einstein radius, source at infinity: ${fF(thE_inf / mas / 1e3, 3)} arcsec`);
    for (const dls of [0.01, 0.1, 1.0, 30.0]) {
        const Dls = dls * pc, Ds = R0 + Dls;
        const th = Math.sqrt(2 * rs * Dls / (R0 * Ds)), RE = Math.sqrt(2 * rs * Dls * R0 / Ds);
        log("B", `source ${pyFloat(dls).padStart(5)} pc behind Sgr A*: theta_E = ${fF(th / mas, 3, 8)} mas, R_E (at lens) = ${fF(RE / AU, 1, 7)} AU`);
    }
    log("B", `Shapiro scale 2GM/c^3 = ${fF(tS, 2)} s`);
    const sigma = 100e3, r_infl = GM / sigma ** 2 / pc;
    log("B", `sphere of influence GM/sigma^2 (sigma = 100 km/s) = ${fF(r_infl, 2)} pc`);
    const M_NSC = 2.5e7;
    log("B", `nuclear star cluster mass / M_BH = ${fF(M_NSC / M_BH, 1)} (NSC 2.5e7 Msun within ~4.2 pc half-light radius)`);
    for (const r_pc of [0.097, 1.0, 30.0]) {
        const eps = GM / (c ** 2 * r_pc * pc);
        log("B", `weak-field parameter GM/(c^2 r) at ${pyFloat(r_pc)} pc = ${fE(eps, 2)} (second-order terms ~ eps^2 = ${fE(eps ** 2, 1)}, a fraction ~eps of the first-order terms)`);
    }
    check("B", GM / (c ** 2 * 0.097 * pc) < 1e-5, "Sgr A* field is weak (GM/c^2 r < 1e-5) at every known pulsar: superposition holds");
    log("B", `strong-field region: a few r_s ~ ${fF(3 * rs / AU, 2)} AU, where superposition fails (System I inner tiers only)`);
    // C
    for (const p of PULSARS) {
        const rproj = R0 * p.off * 60 * 1000 * mas / pc;
        const Pk = 2 * Math.PI * Math.sqrt((rproj * pc) ** 3 / GM) / yr;
        log("C", `${p.name}: P=${fF(p.P, 2, 5)} s DM=${fD(p.DM, 5)} offset ${fF(p.off, 2, 5)}' -> projected ${fF(rproj, 2, 6)} pc; ` +
                 `Keplerian period about Sgr A* alone at that radius ${fG(Pk, 3)} yr ${p.rem}`);
    }
    check("C", PULSARS.length === 7, "seven known pulsars within 100 pc projected");
    check("C", PULSARS.every((p) => R0 * p.off * 60e3 * mas / pc < 100), "all seven within 100 pc projected at R0 = 8275 pc");
    const outside = PULSARS.filter((p) => R0 * p.off * 60e3 * mas / pc > r_infl).map((p) => p.name);
    log("C", `pulsars outside Sgr A*'s sphere of influence (~${fF(r_infl, 1)} pc): ${outside.length} of 7 -> ${pyStrList(outside)}`);
    // D
    const v_perp = 236e3, r_mag = 0.097 * pc, a_max = GM / r_mag ** 2;
    log("D", `magnetar transverse velocity: v/c = ${fE(v_perp / c, 3)} (Doppler scale on P)`);
    log("D", `max line-of-sight acceleration a/c at r >= 0.097 pc: ${fE(a_max / c, 3)} s^-1 (upper bound: true r >= projected)`);
    const P_orb = 2 * Math.PI * Math.sqrt(r_mag ** 3 / GM), shapiro_rate = tS * 2 * Math.PI / P_orb;
    log("D", `Keplerian period at 0.097 pc: ${fF(P_orb / yr, 0)} yr; Shapiro-delay rate bound ~ ${fE(shapiro_rate, 2)} (s/s)`);
    log("D", `ratio Doppler / Shapiro-rate = ${fE((v_perp / c) / shapiro_rate, 1)}`);
    check("D", (v_perp / c) / shapiro_rate > 1e4, "Shapiro-rate term is >1e4 below the Doppler term for the magnetar");
    // E
    log("E", "astrometric shift theta_E^2/theta if each pulsar sat behind Sgr A* at a depth equal to its projected offset:");
    for (const p of PULSARS) {
        const theta = p.off * 60 * 1000 * mas, dls = R0 * theta, th2 = 2 * rs * dls / (R0 * (R0 + dls));
        log("E", `  ${p.name}: depth ${fF(dls / pc, 2, 6)} pc, shift ${fF(th2 / theta / mas * 1e3, 3, 9)} uas`);
    }
    const RE01 = Math.sqrt(2 * rs * 0.1 * pc), p_align = (RE01 / (0.1 * pc)) ** 2, cross_t = RE01 / v_perp / yr;
    const shift_scale = 2 * rs / R0 / mas * 1e3;
    log("E", `  all shifts are close to 2 r_s / R0 = ${fF(shift_scale, 2)} uas: with depth = R0*theta, theta_E^2/theta = 2 r_s/(R0 + depth)`);
    check("E", Math.abs(20.43 - shift_scale) < 0.2, "the astrometric shift is ~2 r_s/R0 ~ 20 uas, independent of offset when depth equals the projected offset");
    log("E", `magnetar-depth source (0.1 pc): R_E = ${fF(RE01 / AU, 1)} AU, instantaneous alignment probability ~ (R_E/r)^2 = ${fE(p_align, 1)},` +
             ` Einstein-crossing time at 236 km/s = ${fF(cross_t, 2)} yr`);
    check("E", p_align < 1e-4, "strong lensing of a 0.1 pc pulsar by Sgr A* is rare (< 1e-4 at any instant)");
    // F
    for (const Mg of [1e10, 1e11]) log("F", `2GM/c^3 for ${fE(Mg, 0)} Msun = ${fF(2 * Mg * GMsun / c ** 3 / 86400, 2)} days (a constant offset, absorbed by the timing fit)`);
    const acc = 2.32e-10;
    log("F", `Gaia EDR3 solar-system acceleration ${fE(acc, 2)} m/s^2 -> aberration drift ${fF(acc / c * yr / mas * 1e3, 2)} uas/yr ` +
             "(published 5.05 +- 0.35 uas/yr)");
    check("F", Math.abs(acc / c * yr / mas * 1e3 - 5.05) < 0.1, "acceleration reproduces the published 5.05 uas/yr drift");
    log("F", `same acceleration as a pulsar period-derivative term a/c = ${fE(acc / c, 2)} s^-1`);
    // G
    const k = 4.740470463, mu_l = 6.411, mu_b = 0.219;
    const V_tot = k * mu_l * R0_pc / 1000, W_tot = k * mu_b * R0_pc / 1000;
    log("G", `Sgr A* apparent motion -> (Theta0 + V_sun) = ${fF(V_tot, 1)} km/s, W_sun = ${fF(W_tot, 2)} km/s at R0 = ${fF(R0_pc, 0)} pc`);
    log("G", `with V_sun = 12.24 km/s (Schoenrich et al. 2010): Theta0 = ${fF(V_tot - 12.24, 1)} km/s`);
    log("G", "Reid & Brunthaler 2020 report the residual (intrinsic Sgr A* motion): -0.58 +- 2.23 km/s (rotation), " +
             "-0.85 +- 0.75 km/s (toward NGP): closure consistent with zero");
    log("G", `R0 systematic (33 pc) alone moves (Theta0+V_sun) by ${fF(k * mu_l * 0.033, 2)} km/s`);
    // H: exact arithmetic
    const F = (n, d = 1) => new Fraction(BigInt(n), BigInt(d));
    const rq = (scale = 9) => {
        const u = [0, 1, 2].map(() => { const n = random.randint(-scale, scale); return F(n, random.randint(1, scale)); });
        return cayleyMap(u[0], u[1], u[2]);
    };
    // H1
    let ok = true;
    for (let i = 0; i < 2000; i++) {
        const [I, II, III, R] = [0, 1, 2, 3].map(() => { const n = random.randint(-(10 ** 6), 10 ** 6); return F(n, random.randint(1, 10 ** 3)); });
        const T = I.add(II).add(III).add(R);
        ok = ok && T.sub(II).sub(III).sub(R).eq(I) && T.sub(I).sub(III).sub(R).eq(II) && T.sub(I).sub(II).sub(R).eq(III) && T.sub(I).sub(II).sub(III).eq(R);
    }
    check("H1", ok, "2000 exact cases: any one of {I, II, III, residual} is recovered from the measured total and the other three");
    { const T = F(7), I = F(2); const pairs = new Set(); for (let n = 0; n < 50; n++) { const x = F(n); pairs.add(`${x}|${T.sub(I).sub(F(1)).sub(x)}`); }
      check("H1", pairs.size === 50, "two unknown components with one total: 50 distinct consistent pairs (not recoverable)"); }
    // H2
    let ok_open = true, ok_detect = true, ok_cyc = true;
    for (let i = 0; i < 500; i++) {
        const H1 = rq(), H2 = rq(), H3 = rq();
        const H4_meas = qinv(qprod(H1, H2, H3));
        ok_open = ok_open && qeq(qprod(H1, H2, H3, H4_meas), Q_ONE);
        const eps = rq(50);
        if (!qeq(eps, Q_ONE)) ok_detect = ok_detect && !qeq(qprod(H1, qmul(eps, H2), H3, H4_meas), Q_ONE);
        const H4_cyc = qinv(qprod(H1, qmul(eps, H2), H3));
        ok_cyc = ok_cyc && qeq(qprod(H1, qmul(eps, H2), H3, H4_cyc), Q_ONE);
    }
    check("H2", ok_open, "500 exact cases: four independently measured frame legs close, H1H2H3H4 = 1");
    check("H2", ok_detect, "500 exact cases: an error in any one measured leg breaks closure (open convention detects it)");
    check("H2", ok_cyc, "500 exact cases: if the fourth leg is computed from the other three, closure holds even with the error (vacuous)");
    // H3
    const classes = ["astrometry", "timing", "velocity"], sides = ["model", "data"];
    const slots = Array.from({ length: 6 }, (_, k) => [classes[k % 3], sides[k % 2]]);
    const slotStr = "{" + slots.map(([a, b], k) => `${k}: ('${a}', '${b}')`).join(", ") + "}";
    check("H3", new Set(slots.map((s) => s.join())).size === 6, `k -> (k mod 3, k mod 2) is a bijection Z/6 -> C3 x C2: ${slotStr}`);
    // H4
    const Rn = [0, 1, 2, 3, 4].map((n) => 5 * n * n + 15 * n + 15);
    const systems = [["I", rs / pc, 2.0], ["II", 2.0, 200.0], ["III", 200.0, 1.0e5]];
    const isclose = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
    for (const [name, r_in, r_out] of systems) {
        const shells = [0, 1, 2, 3, 4].map((n) => r_in * (r_out / r_in) ** ((Rn[n] - Rn[0]) / (Rn[4] - Rn[0])));
        const mono = shells.every((s, i) => i === 4 || s < shells[i + 1]);
        const ends = isclose(shells[0], r_in) && isclose(shells[4], r_out);
        check("H4", mono && ends, `System ${name}: tiers at r = ` + shells.map((s) => fG(s, 3)).join(", ") + " pc (monotone, exact ends)");
    }
    log("H4", "fractions (R_n - R_0)/(R_4 - R_0) =", pyStrList([0, 1, 2, 3, 4].map((n) => F(Rn[n] - Rn[0], Rn[4] - Rn[0]).toString())));
    // H5
    ok = true;
    for (let i = 0; i < 500; i++) {
        const A = rq(), Iq = rq();
        const E = qprod(A, qinv(Iq), qinv(A));
        ok = ok && E[0].eq(Iq[0]) && qeq(qprod(A, Iq, qinv(A), E), Q_ONE);
    }
    check("H5", ok, "500 exact cases: frame change E = A I^-1 A^-1 closes A I A^-1 E = 1 and keeps Re(E) = Re(I)");
    // H6
    const g = (a, b) => (b ? g(b, a % b) : a);
    check("H6", g(7, 6) === 1 && g(7, 30) === 1 && g(7, 60) === 1, "7 is coprime to 6, 30 and 60: no equal partition of the seven pulsars over the engine's channels");
    check("H6", PULSARS.filter((p) => R0 * p.off * 60e3 * mas / pc <= 2.0).length === 1 && PULSARS.length - 1 === 6,
          "placement by radius: 1 pulsar in System I (< 2 pc), 6 in System II (2-200 pc), 0 in System III");
    out.push("");
    out.push(failed ? `FAILED: ${failed}` : "All checks passed.");
    return out;
}
// ===== CORE:END =====
