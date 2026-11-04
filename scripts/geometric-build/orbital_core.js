// The orbital core: the exact code the Geometric Calculator's orbital pages share, in one place.
//
// Galactic Lensing Part 1, the Tri-Engine Soliton, Tri-Engine Convergence and the Zero-Point Tri-Engine are built
// from the templates in this folder. The code below used to live inside those templates; it now lives here once,
// and build.py writes each segment back into the templates at its /*__ORB:name__*/ placeholder (and the core at
// /*__CORE__*/), so the built pages are byte for byte what they were. orbital_segments.py does the expansion.
//
// The same file is a UMD module (window.OrbitalCore in a browser, require() in Node), so other systems use the
// exact code the pages run, not a copy: Pages/Engram Minds Eye is the first.
//
// Rules for editing:
//   * A segment runs from its `// @orbital-begin name` line to its `// @orbital-end name` line. Edit the text
//     between them as you would have edited the template; rebuild, and every page that uses it changes.
//   * Code outside the segments exists only in the module. Keep it to the wrapper, `state` and the export list.
//   * gen4.py patches the `readout` segment for the Zero-Point page (the pairing node k), as it did before.
//
// In the pages, `state` is each page's own control state. Here it is a neutral stand-in: no tension, no torsion and
// coupling κ = 1. Change OrbitalCore.state to read the pages' functions under other settings.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.OrbitalCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
const state = { tension: 0, torsion: 0, kappa: 1 };

// @orbital-begin core · the exact arithmetic core (was core.js): Fraction, quaternions, the Cayley map, Python's Mersenne Twister, Part 1's physics and the line-by-line port of verify_galactic_hierarchy.py; every page through /*__CORE__*/
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
// @orbital-end core

// @orbital-begin tiers · Part 1 (page.html): engine v10's five tiers; all four pages through SHARED_A
const TIERS_SPEC = [
    { n: 0, W: 16, R: 15,  r: 4,  freq: 96, rotAxis: 'Z' },
    { n: 1, W: 14, R: 35,  r: 6,  freq: 84, rotAxis: 'X' },
    { n: 2, W: 12, R: 65,  r: 8,  freq: 72, rotAxis: 'Z' },
    { n: 3, W: 10, R: 105, r: 10, freq: 60, rotAxis: 'X' },
    { n: 4, W: 8,  R: 155, r: 12, freq: 48, rotAxis: 'Z' }
];
const TOTAL_NODES = 30, TOTAL_CALC_PULSES = 150;
// @orbital-end tiers

// @orbital-begin krat · Part 1: the declared rationalization precision 2^-24
const K_RAT = 24;                         // declared rationalization precision 2^-24
// @orbital-end krat

// @orbital-begin layerb · Part 1: Layer B helpers
const RAT = x => Fraction.fromFloat(x, K_RAT);
const fracAbs = f => (f.n < 0n ? f.neg() : f);
const fracLe = (a, b) => a.n * b.d <= b.n * a.d;
const bits = f => Math.max(f.n < 0n ? (-f.n).toString(2).length : f.n.toString(2).length, f.d.toString(2).length);
// @orbital-end layerb

// @orbital-begin d2r · Part 1: degrees to radians
const D2R = Math.PI / 180;
// @orbital-end d2r

// @orbital-begin lemma · Part 1: the Fifteen-Lemma layer: SHA-256, the 64-bit Einstein tile, data and frame-leg packets, Hurwitz Form 1, the Lemma 15 Merkle chain
const f32 = new DataView(new ArrayBuffer(4));

// =====================================================================
// Fifteen-Lemma layer: §6.1 packets, Lemma 15 Merkle chain, Lemma 8 cycle,
// Proposition 7.11 erasure, and the live compliance checks of Panel D
// =====================================================================
const qnorm = q => q.reduce((s, x) => s.add(x.mul(x)), Fraction.ZERO);
// Exact value of a double as a fraction (for the Form 3 exactness flag)
function fracOfDouble(x) {
    if (x === 0) return Fraction.ZERO;
    const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, x);
    const hi = dv.getUint32(0), lo = dv.getUint32(4), e = (hi >>> 20) & 0x7ff;
    let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo), E;
    if (e === 0) E = -1074; else { m |= 1n << 52n; E = e - 1075; }
    if (hi >>> 31) m = -m;
    return E >= 0 ? new Fraction(m << BigInt(E), 1n) : new Fraction(m, 1n << BigInt(-E));
}

// ---------- SHA-256 (FIPS 180-4), synchronous so the chain is recomputed every update ----------
const SHA_K = Uint32Array.from([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
function sha256(msg) {
    const l = msg.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb);
    m.set(msg); m[l] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(nb - 4, (l * 8) >>> 0); dv.setUint32(nb - 8, Math.floor(l / 0x20000000));
    const H = Uint32Array.from([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]), w = new Uint32Array(64);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < nb; o += 64) {
        for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + 4 * i);
        for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (rot(a, 7) ^ rot(a, 18) ^ (a >>> 3)) + w[i - 7] + (rot(b, 17) ^ rot(b, 19) ^ (b >>> 10))) >>> 0; }
        let [a, b, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
            const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + SHA_K[i] + w[i]) >>> 0;
            const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
            h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
        }
        H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32), odv = new DataView(out.buffer);
    H.forEach((v, i) => odv.setUint32(4 * i, v));
    return out;
}
const toHex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
const utf8 = s => new TextEncoder().encode(s);
const concatBytes = (a, b) => { const r = new Uint8Array(a.length + b.length); r.set(a); r.set(b, a.length); return r; };
const wordBytes = w => Uint8Array.from({ length: 8 }, (_, i) => Number((w >> BigInt(56 - 8 * i)) & 0xffn));

// ---------- 64-bit Einstein Tile, monograph §6.1 Tables 4–5 with the stream use of spec §5.3 ----------
const WHEEL = [1, 7, 11, 13, 17, 19, 23, 29];                 // (ℤ/30ℤ)×, Lemma 4 Part 5
const B_PLUS = WHEEL.filter(u => u % 5 === 1 || u % 5 === 4); // quadratic residues mod 5: {1, 11, 19, 29}
// Wheel field [60:58]: the unit u_i with u_i ≤ k < u_(i+1) on the 30-node wheel (node 0 belongs to 29) [DEFINITION]
const wheelSector = k => { let u = 7; WHEEL.forEach((w, i) => { if (w <= k) u = i; }); return u; };
// Step-multiplexed index [47:44] (Table 4): circle phase s ∈ ℤ/9 at steps 1–2, half-cube l at step 3,
// ghost index 0 (central cell) at step 6, otherwise one of the 12 coordinates of aff(3) (here the stream slot)
const muxIndex = (step, k, slot) => (step <= 2 ? k % 9 : step === 3 ? k % 16 : step === 6 ? 0 : slot % 12);
const STRUCT_NAMES = ['System I', 'System II', 'System III', 'residual R'];
function packTile(f) {
    return (BigInt(f.step - 1) << 61n) | (BigInt(f.wheel) << 58n) | (BigInt(f.struct) << 56n) | (BigInt(f.gate) << 48n) |
           (BigInt(f.mux) << 44n) | (BigInt(f.form) << 40n) | (BigInt(f.slot) << 36n) | (BigInt(f.scale) << 32n) | BigInt(f.core >>> 0);
}
function decodeTile(w) {
    const g = (hi, lo) => Number((w >> BigInt(lo)) & ((1n << BigInt(hi - lo + 1)) - 1n));
    return { step: g(63, 61) + 1, wheel: g(60, 58), struct: g(57, 56), halo: g(63, 56), gate: g(55, 48), comp: g(55, 54), slice: g(53, 48),
             mux: g(47, 44), form: g(43, 40), slot: g(39, 36), scale: g(35, 32), core: g(31, 0) };
}
const hexWord = w => '0x' + w.toString(16).toUpperCase().padStart(16, '0');
// Twelve streams per update: stream slot 4·class + structure, structure 0–2 = Y_I..Y_III, 3 = Y_R (spec §5.3)
function makePackets(ck, B) {
    const out = [];
    for (let c = 0; c < 3; c++) for (let s = 0; s < 4; s++) {
        const rat = s < 3 ? B[c].Ys[s] : B[c].YR, v = rat.toNumber(), slot = 4 * c + s;
        f32.setFloat32(0, v);
        const core = f32.getUint32(0), exact = fracOfDouble(f32.getFloat32(0)).eq(rat);
        const word = packTile({ step: ck.piCycleStepK, wheel: wheelSector(ck.k), struct: s, gate: (0 << 6) | (ck.epoch % 64),
                                mux: muxIndex(ck.piCycleStepK, ck.k, slot), form: 3, slot, scale: 0, core });
        out.push({ kind: 'data', key: `d:${slot}`, c, s, slot, rat, word, exact });
    }
    return out;
}
// ---------- Frame-leg packets (spec §5.3: "12–15: the four quaternion components of a frame leg") ----------
// Stream ID for leg ℓ = (structure bits ℓ, slot 12–15), the same pattern as the data streams (structure s, slot 4c + s)
// [DEFINITION]. Form 3: one binary32 component per packet, component also in gate bits 55–54. Form 1: the whole leg in one packet.
const LEG_NAMES = ['H1 ICRS → Galactic', 'H2 Galactic → Sgr A*', 'H3 Sgr A* → pulsar', 'H4 pulsar → observer'];
const GATE_HOLONOMY = 0b11;   // geometric gate (Forms 0–2): locus 0, C9 offset 0, harmonic flag 11 = holonomy H
// Form 1 (Table 5): 2Q gcd-reduced and sign-normalized (first non-zero coordinate positive). Core word [DEFINITION of byte order]:
// bits 31–24 = loss flag (bit 31) + 2w (bits 30–24), bits 23–16 = x, 15–8 = y, 7–0 = z, signed bytes in [−127, 127].
function hurwitzEncode(q) {
    const L = q.reduce((l, f) => l / gcdB(l, f.d) * f.d, 1n);
    let v = q.map(f => 2n * f.n * (L / f.d));
    const g = v.reduce((a, x) => gcdB(a, x), 0n) || 1n;
    v = v.map(x => x / g);
    if ((v.find(x => x !== 0n) || 0n) < 0n) v = v.map(x => -x);
    const bitsNeeded = Math.max(...v.map(x => absB(x).toString(2).length));
    let b, loss = false;
    if (v[0] <= 127n && v.slice(1).every(x => absB(x) <= 127n)) b = v.map(Number);
    else {   // renormalize to the nearest representable direction on the 7-bit grid and set the loss flag
        loss = true;
        let f = q.map(x => x.toNumber()); if ((f.find(x => x !== 0) || 0) < 0) f = f.map(x => -x);
        const m = Math.max(...f.map(Math.abs)); b = f.map(x => Math.round(x * 127 / m));
    }
    const byte = x => (x < 0 ? 256 + x : x) & 0xff;
    const core = (((loss ? 0x80 : 0) | (b[0] & 0x7f)) << 24 | byte(b[1]) << 16 | byte(b[2]) << 8 | byte(b[3])) >>> 0;
    return { b, loss, core, bitsNeeded, err: hurwitzAngleError(q, b) };
}
function hurwitzDecode(core) {
    const sb = x => (x > 127 ? x - 256 : x);
    return { loss: !!(core >>> 31), b: [(core >>> 24) & 0x7f, sb((core >>> 16) & 0xff), sb((core >>> 8) & 0xff), sb(core & 0xff)] };
}
// Rotation-angle difference between the exact leg and the decoded direction: 4·asin(|q̂ − b̂|/2) with matched signs
function hurwitzAngleError(q, b) {
    const f = q.map(x => x.toNumber()), nb = Math.hypot(...b);
    if (!nb) return Math.PI;
    let bh = b.map(x => x / nb); const dot = f.reduce((s, x, i) => s + x * bh[i], 0); if (dot < 0) bh = bh.map(x => -x);
    return 4 * Math.asin(Math.min(1, Math.hypot(...f.map((x, i) => x - bh[i])) / 2));
}
function makeFramePackets(ck, legs, mode) {
    const out = [], step = ck.piCycleStepK, wheel = wheelSector(ck.k);
    legs.forEach((q, l) => {
        if (mode === 'f3') q.forEach((comp, j) => {
            f32.setFloat32(0, comp.toNumber());
            const core = f32.getUint32(0), exact = fracOfDouble(f32.getFloat32(0)).eq(comp);
            const word = packTile({ step, wheel, struct: l, gate: (j << 6) | (ck.epoch % 64), mux: muxIndex(step, ck.k, 12 + j), form: 3, slot: 12 + j, scale: 0, core });
            out.push({ kind: 'f3', key: `f:${l}:${j}`, leg: l, j, rat: comp, word, exact, leafText: comp.toString() });
        });
        else {
            const h = hurwitzEncode(q);
            const word = packTile({ step, wheel, struct: l, gate: GATE_HOLONOMY, mux: muxIndex(step, ck.k, 12 + l), form: 1, slot: 12 + l, scale: 0, core: h.core });
            out.push({ kind: 'f1', key: `f:${l}:q`, leg: l, q, h, word, exact: !h.loss, leafText: q.map(String).join(',') });
        }
    });
    return out;
}
// Lemma 15 Part 3: τN = H(GN), τd = H(Gd ‖ τd+1); leaf Gd = tile word ‖ the exact value it stands for
const leafBytes = p => concatBytes(wordBytes(p.word), utf8(p.leafText !== undefined ? p.leafText : p.rat.toString()));
function merkleChain(leaves) {
    const N = leaves.length, tau = new Array(N + 1);
    tau[N] = sha256(leaves[N - 1]);
    for (let d = N - 1; d >= 1; d--) tau[d] = sha256(concatBytes(leaves[d - 1], tau[d + 1]));
    return tau;
}
// @orbital-end lemma

// @orbital-begin exact · Part 2 (page2.html): exact tier frames, nodes and the Triple-Quad Formula; Convergence and Zero-Point through P2:exact
// Exact integer maps (all orthogonal with integer entries, so they act on ℚ³ without rounding)
const ROT_X = (v, neg) => [v[0], neg(v[2]), v[1]];   // Rot_x(π/2): (x, y, z) ↦ (x, −z, y)   (even tiers, Lemma 4)
const ROT_Y = (v, neg) => [v[2], v[1], neg(v[0])];   // Rot_y(π/2): (x, y, z) ↦ (z, y, −x)   (odd tiers, Lemma 4)
const C3 = v => [v[2], v[0], v[1]];                  // σ: 120° about (1, 1, 1), x ↦ y ↦ z ↦ x
const c3pow = (v, s) => { for (let i = 0; i < s; i++) v = C3(v); return v; };
const NEG_F = f => f.neg(), NEG_N = x => -x;
const frameOf = (n, v, neg) => (n % 2 === 0 ? ROT_X(v, neg) : ROT_Y(v, neg));
const SIG_F = [new Fraction(1n, 2n), new Fraction(1n, 20n), new Fraction(2n, 1n)];   // σ per class, exactly the SIGMA of Part 1
// Tension turns the outer tiers (T4, T3) about local y; Torsion turns the inner tiers (T2–T0) the other way about local z
function modRot(p, n) {
    const a = n >= 3 ? state.tension * D2R : -state.torsion * D2R, c = Math.cos(a), s = Math.sin(a);
    return n >= 3 ? [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]] : [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]];
}
// Node on tier n = 4 − S at θ_k = 2πk/30 with φ = W_n θ_k χ_k + 2πc/3 + Δφ (spec §2A); χ_k = (−1)^k
function torusPoint(R, r, n, k, c, dphi) {
    const th = 2 * Math.PI * k / 30, chi = k % 2 === 0 ? 1 : -1, ph = TIERS_SPEC[n].W * th * chi + 2 * Math.PI * c / 3 + dphi;
    return modRot([(R + r * Math.cos(ph)) * Math.cos(th), (R + r * Math.cos(ph)) * Math.sin(th), r * Math.sin(ph)], n);
}
function exactNode(s, c, k, S, dphi) {
    const n = 4 - S, T = TIERS_SPEC[n];
    const P = torusPoint(T.R, T.r, n, k, c, dphi).map(x => RAT(x));          // Layer A → B at 2⁻²⁴, in cubits
    return c3pow(frameOf(n, P, NEG_F), s);                                    // then exact frame and exact σˢ
}
const vsub = (a, b) => a.map((x, i) => x.sub(b[i])), vadd = (a, b) => a.map((x, i) => x.add(b[i]));
const vdot = (a, b) => a.reduce((acc, x, i) => acc.add(x.mul(b[i])), Fraction.ZERO);
const F3 = new Fraction(3n), F4 = new Fraction(4n);
const fbits = f => Math.max((f.n < 0n ? -f.n : f.n).toString(2).length, f.d.toString(2).length);
function tqf(P) {
    const u = vsub(P[1], P[0]), v = vsub(P[2], P[0]), w = vsub(P[2], P[1]);
    const Q1 = vdot(u, u), Q2 = vdot(w, w), Q3 = vdot(v, v), S = Q1.add(Q2).add(Q3), S2 = S.mul(S);
    const poly = S2.sub(Fraction.TWO.mul(Q1.mul(Q1).add(Q2.mul(Q2)).add(Q3.mul(Q3))));
    const uv = vdot(u, v), gram = F4.mul(Q1.mul(Q3).sub(uv.mul(uv)));
    const lock = !S.isZero() && F3.mul(poly).eq(S2);
    const chi = S.isZero() ? 0 : Math.sqrt(Math.max(0, poly.toNumber())) / S.toNumber();
    return { Q: [Q1, Q2, Q3], S, poly, gram, same: poly.eq(gram), nonneg: !(poly.n < 0n), weitz: fracLe(F3.mul(poly), S2), lock, chi,
             qScale: 0.65 + 0.45 * chi, P4star: vsub(vadd(P[1], P[2]), P[0]), bits: Math.max(...[Q1, Q2, Q3, poly].map(fbits)) };
}
// @orbital-end exact

// @orbital-begin tonum · Convergence (page3.html): a Fraction as a double, also beyond 2^1024
const flen = f => Math.max(absB(f.n).toString(2).length, f.d.toString(2).length);
function toNum(f) {   // a Fraction as a double, also when its numerator or denominator is beyond 2^1024
    const sh = Math.max(0, flen(f) - 1000);
    return sh ? Number(f.n >> BigInt(sh)) / Number(f.d >> BigInt(sh)) : Number(f.n) / Number(f.d);
}
// @orbital-end tonum

// @orbital-begin fracpart · Convergence and gen4.py: a turn count modulo one turn, exactly
const fracPart = f => new Fraction(((f.n % f.d) + f.d) % f.d, f.d);                 // a turn count modulo one turn, exactly
// @orbital-end fracpart

// @orbital-begin gauge · Convergence: the Proposition 7.14 gauge, exact and invertible
const gaugeExact = (a, b, c) => {
    const s = a.add(b).add(c), X = a.sub(b.add(c).div(Fraction.TWO)), Yc = b.sub(c);
    const a2 = s.add(Fraction.TWO.mul(X)).div(F3), b2 = s.sub(a2).add(Yc).div(Fraction.TWO), c2 = s.sub(a2).sub(Yc).div(Fraction.TWO);
    return { s, X, Yc, recovered: a2.eq(a) && b2.eq(b) && c2.eq(c) };
};
// @orbital-end gauge

// @orbital-begin readout · Convergence: the landing nodes and their TQF readout (gen4.py patches the node index for the Zero-Point page)
// Δφ from each result's deviation from the mean [DEFINITION]: equal results give equal phases, hence an exact lock
// Part 2's exactNode with the node carried round its tier by `turns` (only the fractional turn moves it)
function exactNodeSpin(s, k, S, dphi, turns) {
    const n = 4 - S, T = TIERS_SPEC[n], th = 2 * Math.PI * k / 30, chi = k % 2 === 0 ? 1 : -1, ph = T.W * th * chi + dphi;
    const a = th + 2 * Math.PI * toNum(fracPart(turns));
    const P = modRot([(T.R + T.r * Math.cos(ph)) * Math.cos(a), (T.R + T.r * Math.cos(ph)) * Math.sin(a), T.r * Math.sin(ph)], n).map(x => RAT(x));
    return c3pow(frameOf(n, P, NEG_F), s);
}
const ZERO3 = [Fraction.ZERO, Fraction.ZERO, Fraction.ZERO];
function readout(vals, turns = ZERO3) {
    const Y = vals[0].add(vals[1]).add(vals[2]), m = Y.div(F3), den = Math.abs(toNum(m)) + 1;
    const dphi = vals.map(x => state.kappa * (Math.PI / 6) * Math.tanh(toNum(x.sub(m)) / den));
    const nodes = [0, 1, 2].map(s => exactNodeSpin(s, 29, 4, dphi[s], turns[s]));   // T0, node 29, carried by each engine's spin
    const T = tqf(nodes);
    return { dphi, nodes, T, Q4: vdot(T.P4star, T.P4star) };
}
// @orbital-end readout

// @orbital-begin memory · Convergence: a memory word's tiles, leaves, Merkle chain and parity
const cellTile = (w, j, v) => {
    f32.setFloat32(0, toNum(v));
    const slot = 4 * (w.addr % 3) + j;
    return { word: packTile({ step: w.step, wheel: wheelSector(w.k), struct: j, gate: w.addr % 64, mux: muxIndex(w.step, w.k, slot), form: 3, slot, scale: 0, core: f32.getUint32(0) }),
             exact: fracOfDouble(f32.getFloat32(0)).eq(v) };
};
const leavesOf = w => w.cells.map((v, j) => concatBytes(wordBytes(cellTile(w, j, v).word), utf8(v.toString())));
const chainOf = w => merkleChain(leavesOf(w)).map(t => (t ? toHex(t) : ''));
const parityOk = w => w.cells[0].add(w.cells[1]).add(w.cells[2]).eq(w.cells[3]);
// @orbital-end memory

// @orbital-begin rebuild · Convergence: rebuild one cell of a word from the other three
function rebuild(w, j) {   // the cell j of word w from the other three
    const c = w.cells;
    return j === 3 ? c[0].add(c[1]).add(c[2]) : [0, 1, 2].filter(i => i !== j).reduce((acc, i) => acc.sub(c[i]), c[3]);
}
// @orbital-end rebuild

// @orbital-begin locate · Convergence: Lemma 15, the deepest differing layer locates the altered cell
function locate(w) {   // Lemma 15: the deepest layer of the chain that differs is the altered leaf
    const now = chainOf(w);
    let deepest = 0;
    for (let d = 1; d <= 4; d++) if (now[d] !== w.tau0[d]) deepest = d;
    return deepest ? deepest - 1 : null;
}
// @orbital-end locate

// @orbital-begin pump · Zero-Point (gen4.py): the 720 -> 72 -> 10 pump of one engine's register
function pumpOf(d) {
    const engaged = d.reduce((a, x) => a + x, 0), P = engaged % 720, sum = a => a.reduce((t, x) => (t + x) % 720, 0);
    const dQ = Array.from({ length: 72 }, (_, m) => d.subarray(10 * m, 10 * m + 10).reduce((a, x) => a + x, 0));   // ΔQ_m: ten-frame blocks
    const delta = dQ.map(x => (720 - x) % 720);                                                                 // δ_m = ΔQ_m⁻¹
    const Q10 = sum(delta), Q8 = sum(Array.from({ length: 10 }, (_, l) => sum(delta.filter((_, m) => Math.floor(10 * m / 72) === l))));
    const H = (Q8 + Q10 + P) % 720, inv = (720 - P) % 720;
    return { engaged, P, Q10, Q8, H, closed: P === 0, identity: Q10 === inv && Q8 === inv && H === inv };
}
// @orbital-end pump

const SEGMENTS = ["core", "tiers", "krat", "layerb", "d2r", "lemma", "exact", "tonum", "fracpart", "gauge", "readout", "memory", "rebuild", "locate", "pump"];
return {
    state, SEGMENTS, version: "orbital-1",
    // core
    pyExp, fE, fF, fD, fG, pyFloat, pyStrList, absB, gcdB, Fraction, qmul, qconj, qinv, Q_ONE, qprod, qeq, cayleyMap, PyRandom, PHYS, PULSARS, projPc, runVerification,
    // tiers
    TIERS_SPEC, TOTAL_NODES, TOTAL_CALC_PULSES,
    // krat
    K_RAT,
    // layerb
    RAT, fracAbs, fracLe, bits,
    // d2r
    D2R,
    // lemma
    f32, qnorm, fracOfDouble, SHA_K, sha256, toHex, utf8, concatBytes, wordBytes, WHEEL, B_PLUS, wheelSector, muxIndex, STRUCT_NAMES, packTile, decodeTile, hexWord, makePackets, LEG_NAMES, GATE_HOLONOMY, hurwitzEncode, hurwitzDecode, hurwitzAngleError, makeFramePackets, leafBytes, merkleChain,
    // exact
    ROT_X, ROT_Y, C3, c3pow, NEG_F, NEG_N, frameOf, SIG_F, modRot, torusPoint, exactNode, vsub, vadd, vdot, F3, F4, fbits, tqf,
    // tonum
    flen, toNum,
    // fracpart
    fracPart,
    // gauge
    gaugeExact,
    // readout
    exactNodeSpin, ZERO3, readout,
    // memory
    cellTile, leavesOf, chainOf, parityOk,
    // rebuild
    rebuild,
    // locate
    locate,
    // pump
    pumpOf,
};
});
