# Builds page4.html (Zero-Point Tri-Engine template) from page3.html (Tri-Engine Convergence template).
# Shared blocks stay placeholders, so build.py fills both pages from the same Part 1 / Part 2 sources.
import os
D = os.path.dirname(os.path.abspath(__file__)) + '/'
s = open(D + 'page3.html').read()
BAR = '// =====================================================================\n'

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, f'expected {n}, found {c}: {a[:90]!r}'
    s = s.replace(a, b)

def cut(a, b, new):
    """Replace s[a .. b) (a inclusive, b exclusive) with new."""
    global s
    assert s.count(a) == 1, 'start not unique: ' + a[:80]
    i = s.index(a)
    j = s.index(b, i)
    s = s[:i] + new + s[j:]

# ---------------------------------------------------------------- head
rep('<title>Tri-Engine Convergence</title>', '<title>Zero-Point Tri-Engine</title>')
i = s.index('<meta name="description"'); j = s.index('>', i)
s = s[:i] + '<meta name="description" content="The tri-engine convergence calculator rebuilt on the zero-point eight-step cycle: every frame of the 720-frame register is one step of the Gaussian clock 1 + i, the three engines are the three 120° branches with onload and offload twelve frames apart, the results pair at the zero point, and each register closes with the 720 → 72 → 10 pump and the open memory test."' + s[j:]
rep('@media (max-width: 900px) { .jobs { grid-template-columns: minmax(0, 1fr); } }', '''@media (max-width: 900px) { .jobs { grid-template-columns: minmax(0, 1fr); } }
/* ---- Zero-point additions ---- */
#panel-z { margin-bottom: 12px; }
.zp-grid { display: grid; grid-template-columns: 320px minmax(0, 1fr) minmax(0, 1.15fr); gap: 14px; }
.zp-col { min-width: 0; }
.zp-col h3 { margin: 10px 0 4px; font-size: 13px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.zp-col h3:first-child { margin-top: 0; }
#zp-dial { width: 100%; max-width: 320px; height: auto; display: block; margin: 0 auto 6px; }
.zp-strip { display: grid; grid-template-columns: repeat(24, minmax(0, 1fr)); gap: 2px; }
.zp-strip div { font: 9.5px/1.25 var(--mono); text-align: center; border: 1px solid var(--line); border-radius: 4px; padding: 3px 0; color: var(--muted); }
.zp-strip div b { display: block; font-size: 10px; color: var(--text); }
.zp-strip div.now { outline: 2px solid var(--gold); outline-offset: -1px; color: var(--text); }
.zp-strip div.off { border-style: dashed; border-width: 2px; }
#zp-stages td:last-child { white-space: normal; text-align: left; font-family: var(--sans); }
#zp-stages tr.now td { background: rgba(245, 197, 66, 0.16); }
#zp-stages tr.win td:first-child { color: var(--gold); }
@media (max-width: 1100px) { .zp-grid { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 640px) { .zp-strip { grid-template-columns: repeat(12, minmax(0, 1fr)); } }''')

# ---------------------------------------------------------------- body
cut('<body>', '<!-- Three.js r158 (classic build)', open(D + 'gen4_body.html').read().split('<!-- Three.js r158 (classic build)')[0])

# ---------------------------------------------------------------- state and the frame clock
cut("const state = { playing: false, clutch: 'hold', speed: 1,", '/*__SHARED_UI__*/', r'''const state = { playing: false, clutch: 'hold', speed: 10 ** -1.3, logScale: true, eta: 1, noise: 0, signal: 'none', error: null, sight: MAGNETAR, event: null,
                tension: 0, torsion: 0, kappa: 1, trails: true, memory: true, tier3: true, lemmaFrames: true, framePk: 'off', solo: null };
const SPIN = [1, -1, 1];                       // counter-rotating nested engines: I and III forward, II backward [DEFINITION]
const sim = { t: 0, prevT: 0 };
const RATE = 0.5, DT = 1 / 60;
const FPP = 12;                                // engine v10: outerFrameN = 12·pulse mod 720, so a pulse holds 12 frames and a register 60 pulses
const frameOfT = t => Math.floor(t * 720 + 1e-9);
// Definition 3.6: one zero-point step per frame. Spinor step k = F mod 8, branch j = F mod 3, joint frame n = F mod 24
const zpOf = F => ({ F, f: F % 720, k: F % 8, j: F % 3, n: F % 24, joint: Math.floor((F % 720) / 24), cyc: Math.floor((F % 720) / 8),
                     reg: Math.floor(F / 720), pulse: Math.floor(F / FPP), node: Math.floor(F / FPP) % 30 });
const ON_PHASE = [18, 10, 2], OFF_PHASE = [6, 22, 14];   // Table 5: joint frames of each branch's onload (k = 2) and offload (k = 6)
function physicsStep(dt) {
    sim.prevT = sim.t;
    sim.t += dt * state.speed * RATE;
}

''')
cut("const CLASS_HEX = [0xff0055", BAR + '// Layer B for three engines', r'''const CLASS_HEX = [0xff0055, 0x00f2ff, 0xffd700], CLASS_CSS = ['#ff0055', '#00f2ff', '#ffd700'];   // the crystal file's pair colours, one per branch
const CALC = ['A', 'B', 'C'], ENG = ['I', 'II', 'III'], STRUCT3 = ['A', 'B', 'C', 'Y'];
// Table 4: the eight stages of the zero-point cycle; step 8 (Snap) is step 0 of the next cycle
const ZP_STAGES = [
    ['Zero point · Snap', 'Spinor identity; record the holonomy residual; the closure tests'],
    ['Seed', 'Launch the nine-phase wheel and its three tetrahedra'],
    ['Onload', 'Lift the branch to the 4-simplex and the null cone; first handshake'],
    ['Project', 'Ghost map into the hyperboloid'],
    ['Invert', 'Spatial identity on the −1 spinor sheet; a node of the envelope'],
    ['Fold', 'Apply the inverse transforms in reverse order'],
    ['Offload', 'Pull back and recombine; second handshake'],
    ['Index', 'Rebuild symmetric tables from a fundamental domain; look up']
];
const SPREADS = ['0', '1/2', '1', '1/2', '0', '1/2', '1', '1/2'];
const SPINOR_TXT = ['+1', '(1 + i)/√2', '+i', '(−1 + i)/√2', '−1', '(−1 − i)/√2', '−i', '(1 − i)/√2'];
const redState = k => (k % 8 === 0 ? [1n, 0n] : GAUSS_STEPS[(k % 8) - 1].red);   // Proposition 2.2: the reduced state of (1 + i)^k

''')

# ---------------------------------------------------------------- the calculator: instructions in postfix order
rep("    const stack = [], steps = [], literals = [];", "    const stack = [], steps = [], literals = [], trace = [];")
rep("            stack.push(v); literals.push(`${tk.text === 'pi' ? 'π' : tk.text} → ${showV(v)}`);",
    "            stack.push(v); literals.push(`${tk.text === 'pi' ? 'π' : tk.text} → ${showV(v)}`); trace.push(`anchor ${literals[literals.length - 1]}`);")
rep("            stack.push(r); steps.push(`${tk.text === 'neg' ? '−' : tk.text}(${showV(a)}) = ${showV(r)}`);",
    "            stack.push(r); steps.push(`${tk.text === 'neg' ? '−' : tk.text}(${showV(a)}) = ${showV(r)}`); trace.push(steps[steps.length - 1]);")
rep("            stack.push(r); steps.push(`${showV(a)} ${{ '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^' }[tk.text]} ${showV(b)} = ${showV(r)}`);",
    "            stack.push(r); steps.push(`${showV(a)} ${{ '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^' }[tk.text]} ${showV(b)} = ${showV(r)}`); trace.push(steps[steps.length - 1]);")
rep("    return { value: stack[0], steps, literals };", "    return { value: stack[0], steps, literals, trace };")
cut('function prepareJob(src) {', 'const fmtExact', r'''// The program a branch carries: each literal and each operation in postfix order, then reduce and latch, one per joint cycle
function prepareJob(src) {
    const rpn = compile(tokenize(src)), ev = evaluate(rpn), v = ev.value;
    const instr = [...ev.trace, `reduce and latch: ${fmtFrac(v.f, 40)}${v.exact ? '' : ' (approximate)'}`];
    return { src, rpn, value: v, instr };
}
''')

# ---------------------------------------------------------------- zero-point core and the job scheduler
cut(BAR + '// Jobs on the shared clock', BAR + '// Convergence: the triple quad', r'''// =====================================================================
// The zero-point cycle: exact branch geometry, the four tracks of the clock and the 720 → 72 → 10 pump
// =====================================================================
// Proposition 3.1 in the corrected frame u = (2, −1, −1)/√6, v = (0, 1, −1)/√2: the a = 0 triad is three cube vertices, 120° apart,
// and with the apex x* = (1, 1, 1) they make the regular tetrahedron Δ₀ of side 2√2. Branch j sits at 120j°, so engine s is branch s.
const FI = x => new Fraction(BigInt(x));
const XJ = [[1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v => v.map(FI)), XSTAR = [1, 1, 1].map(FI);
const dot3 = (a, b) => a.reduce((acc, x, i) => acc.add(x.mul(b[i])), Fraction.ZERO);
const liftX = x => [...x, dot3(x, x).div(Fraction.TWO), Fraction.ONE];                                  // X(x) = (x, |x|²/2, 1) in R^{4,1}
const cform = (X, Y) => dot3(X.slice(0, 3), Y.slice(0, 3)).sub(X[3].mul(Y[4])).sub(X[4].mul(Y[3]));     // ⟨X, Y⟩ = x·y − αβ' − βα'
const ghostMap = p => { const q = dot3(p, p), d = Fraction.ONE.sub(q); return [Fraction.ONE.add(q).div(d), ...p.map(x => Fraction.TWO.mul(x).div(d))]; };   // onto t² − |y|² = 1
const unghost = H => H.slice(1).map(y => y.div(Fraction.ONE.add(H[0])));
// One packet's exact round trip on branch j: onload (lift), project (ghost map), fold (both inverses, in reverse order)
function branchPass(j) {
    const x = XJ[j], X = liftX(x), Xs = liftX(XSTAR), dx = vsub(x, XSTAR);
    const nullOk = cform(X, X).isZero(), distOk = cform(X, Xs).mul(FI(-2)).eq(dot3(dx, dx));
    const H = ghostMap(x.map(v => v.div(Fraction.TWO))), hypOk = H[0].mul(H[0]).sub(dot3(H.slice(1), H.slice(1))).eq(Fraction.ONE);
    const back = unghost(H).map(v => v.mul(Fraction.TWO)), restored = back.every((v, i) => v.eq(x[i])) && X.slice(0, 3).every((v, i) => v.eq(x[i]));
    return { nullOk, distOk, hypOk, restored, ok: nullOk && distOk && hypOk && restored, H };
}
function detF(M) {   // exact determinant by elimination over Q
    const A = M.map(r => r.slice()), n = A.length; let det = Fraction.ONE;
    for (let c = 0; c < n; c++) {
        let p = c; while (p < n && A[p][c].isZero()) p++;
        if (p === n) return Fraction.ZERO;
        if (p !== c) { [A[p], A[c]] = [A[c], A[p]]; det = det.neg(); }
        det = det.mul(A[c][c]);
        for (let r = c + 1; r < n; r++) { const f = A[r][c].div(A[c][c]); for (let k = c; k < n; k++) A[r][k] = A[r][k].sub(f.mul(A[c][k])); }
    }
    return det;
}
const ZP_STATIC = (() => {
    const raw = k => GAUSS_STEPS[k - 1].raw, red = [1, 2, 3, 4, 5, 6, 7, 8].map(redState);
    const p22 = red.every(v => v.every(x => x >= -1n && x <= 1n)) && raw(4)[0] === -4n && raw(4)[1] === 0n && raw(8)[0] === 16n && raw(8)[1] === 0n;
    // Proposition 2.3: x ↦ (1+i)^k x (1−i)^k / 2^k is Rot_x(90k°); steps 2 and 6 give diag(1, −1, −1) with spinors i and −i; step 4 is I with spinor −1
    const rotOf = k => { const [a, b] = raw(k), q = [new Fraction(a), new Fraction(b), Fraction.ZERO, Fraction.ZERO], N = q[0].mul(q[0]).add(q[1].mul(q[1]));
        return [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(e => qmul(qmul(q, [Fraction.ZERO, ...e.map(FI)]), qconj(q)).slice(1).map(x => x.div(N))); };
    const rotX = k => { const c = [1, 0, -1, 0][k % 4], sn = [0, 1, 0, -1][k % 4]; return [[1, 0, 0], [0, c, sn], [0, -sn, c]]; };   // images of e1, e2, e3
    const p23 = [1, 2, 3, 4, 5, 6, 7, 8].every(k => rotOf(k).every((row, i) => row.every((x, c) => x.eq(FI(rotX(k)[i][c])))))
        && red[1].join() === '0,1' && red[5].join() === '0,-1' && red[3].join() === '-1,0' && red[7].join() === '1,0';
    const pts = [...XJ, XSTAR];
    let tet = pts.every(x => dot3(x, x).eq(FI(3))), nullc = pts.every(x => cform(liftX(x), liftX(x)).isZero());
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
        const d = vsub(pts[a], pts[b]);
        tet = tet && dot3(d, d).eq(FI(8));
        nullc = nullc && cform(liftX(pts[a]), liftX(pts[b])).mul(FI(-2)).eq(dot3(d, d));
    }
    const X0 = [Fraction.ZERO, Fraction.ZERO, Fraction.ZERO, Fraction.ZERO, Fraction.ONE];
    const rank5 = !detF([X0, liftX(XSTAR), ...XJ.map(liftX)]).isZero();
    const sigmaBranch = XJ.every((x, j) => c3pow(XJ[0], j).every((v, i) => v.eq(x[i])));   // branch j is σ^j of branch 0
    const pairs = new Set(Array.from({ length: 24 }, (_, n) => `${n % 8},${n % 3}`));
    const ons = [...Array(24).keys()].filter(n => n % 8 === 2), offs = [...Array(24).keys()].filter(n => n % 8 === 6);
    const delays = [...Array(24).keys()].filter(d => d > 0 && d % 8 === 4 && d % 3 === 0);
    const p37 = pairs.size === 24 && ons.join() === '2,10,18' && ons.map(n => n % 3).join() === '2,1,0' && offs.join() === '6,14,22' && offs.map(n => n % 3).join() === '0,2,1'
        && delays.join() === '12' && 720 === 30 * 24 && 720 === 90 * 8
        && ON_PHASE.every((n, j) => n % 3 === j && n % 8 === 2) && OFF_PHASE.every((n, j) => n % 3 === j && n % 8 === 6 && (n - ON_PHASE[j] + 24) % 24 === 12);
    const p71 = new Set([0, 1, 2, 3, 4, 5].map(m => `${(4 * m + 2) % 3},${m % 2}`)).size === 6;   // Proposition 7.1: n = 4m + 2 ↦ (j, σ)
    const sp = [1, 2, 3, 4, 5, 6, 7, 8].map(k => { const [a, b] = raw(k); return new Fraction(b * b, a * a + b * b); });
    const p82 = sp.map(String).join() === '1/2,1,1/2,0,1/2,1,1/2,0' && sp.map((x, i) => (x.eq(Fraction.ONE) ? i + 1 : 0)).filter(Boolean).join() === '2,6';
    const blocks = Array.from({ length: 10 }, (_, l) => [...Array(72).keys()].filter(m => Math.floor(10 * m / 72) === l).length), p39 = blocks.join() === '8,7,7,7,7,8,7,7,7,7';
    const res881 = (387 * 387) % 881 === 880;   // i ↦ 387 in Z/881, since 881 ≡ 1 (mod 4)
    return { p22, p23, tet, nullc, rank5, sigmaBranch, p37, p71, p82, p39, blocks, res881 };
})();
// §8.10: the spinor clock on three tracks. A: floating-point e^{iπ/4} multiplied once per frame. B: the exact reduced state of (1 + i)^F.
// R: (1 + i)^F modulo 881 with i ↦ 387, checked against 2^⌊F/2⌋·ε_F. Track C is not needed for the clock (Table 14).
const tracks = { a: [1, 0], err: 0, maxErr: 0, R: 1, rOk: true, frames: 0 };
const powmod = (b, e, m) => { let r = 1, x = b % m; while (e > 0) { if (e & 1) r = (r * x) % m; x = (x * x) % m; e = Math.floor(e / 2); } return r; };
function advanceTracks(F) {
    const [x, y] = tracks.a; tracks.a = [Math.SQRT1_2 * (x - y), Math.SQRT1_2 * (x + y)];
    const [a, b] = redState(F).map(Number), nb = Math.hypot(a, b);
    tracks.err = Math.hypot(tracks.a[0] - a / nb, tracks.a[1] - b / nb); tracks.maxErr = Math.max(tracks.maxErr, tracks.err);
    tracks.R = (tracks.R * 388) % 881;
    const eps = (((a % 881) + 881) % 881 + 387 * (((b % 881) + 881) % 881)) % 881;
    tracks.rOk = tracks.rOk && tracks.R === (powmod(2, Math.floor(F / 2), 881) * eps) % 881;
    tracks.frames = F;
}
// The pump (Proposition 3.9) on each engine's own outer gear: frame increments of 0 or 1 frame (engaged or not), held as residues mod 720
const reg = { bits: [0, 1, 2].map(() => new Uint8Array(720)), last: null, count: 0 };
function pumpOf(d) {
    const engaged = d.reduce((a, x) => a + x, 0), P = engaged % 720, sum = a => a.reduce((t, x) => (t + x) % 720, 0);
    const dQ = Array.from({ length: 72 }, (_, m) => d.subarray(10 * m, 10 * m + 10).reduce((a, x) => a + x, 0));   // ΔQ_m: ten-frame blocks
    const delta = dQ.map(x => (720 - x) % 720);                                                                 // δ_m = ΔQ_m⁻¹
    const Q10 = sum(delta), Q8 = sum(Array.from({ length: 10 }, (_, l) => sum(delta.filter((_, m) => Math.floor(10 * m / 72) === l))));
    const H = (Q8 + Q10 + P) % 720, inv = (720 - P) % 720;
    return { engaged, P, Q10, Q8, H, closed: P === 0, identity: Q10 === inv && Q8 === inv && H === inv };
}
function closeRegister(F) {
    const res = reg.bits.map(pumpOf);
    reg.last = { F, n: F / 720, res }; reg.count++;
    reg.bits.forEach(b => b.fill(0));
    log(`[0] register ${F / 720} closed at frame ${F}: memory test ${res.map((r, s) => `${CALC[s]} ${r.closed ? 'P = 1' : `residual P = ${r.P}/720 turn, compensator H = ${r.H}/720`}`).join('; ')} · H = Q8·Q10·P = P^-1 ${res.every(r => r.identity) ? 'holds' : 'FAILS'}`, res.every(r => r.closed) ? 'pass' : '');
}

// =====================================================================
// Jobs on the zero-point schedule
// =====================================================================
const jobs = [0, 1, 2].map(s => ({ s, st: 'idle', prog: null, gate: 0, F0: null, i: 0, L: 0, pkt: null, msg: '', landF: null, last: null, carry: 0 }));
// Timing clutch, per frame: each engine's own clock E counts the frames its clutch is engaged. Its helices turn SPIN·(freq/3600)/12 of a turn
// per engaged frame, so a result latched on T0 (freq 96) rides it 1/450 of a turn per frame.
const TAUF = new Fraction(1n, 450n);
const eng = [0, 1, 2].map(() => ({ E: 0, on: false }));
const engagedFor = J => state.clutch !== 'hold' || J.st === 'running';
const fracPart = f => new Fraction(((f.n % f.d) + f.d) % f.d, f.d);                 // a turn count modulo one turn, exactly
const carriedTurns = (s, frames) => TAUF.mul(new Fraction(BigInt(SPIN[s] * frames)));
const fmtTurns = f => `${fmtShort(f, 12)} turn${f.eq(Fraction.ONE) ? '' : 's'} (${fmt(toNum(fracPart(f)) * 360, 4)}°)`;
const framesTo = (F, r, m) => ((r - (F % m)) % m + m) % m || m;                     // frames from F to the next F' ≡ r (mod m), strictly later
const trails = [[], [], []], checkpoints = [[], [], []], completed = [], geo = [0, 1, 2].map(() => ({ n: 0, ok: 0 }));
const TRAIL_MAX = 2400;
let lastFrame = 0, pairWait = null, snaps = 0;
const tierOf = J => (J.st === 'running' ? 4 - Math.min(4, Math.floor(5 * J.i / J.L)) : J.st === 'queued' ? 4 : 0);
const PKT = ['onload (k = 2): lift to the null cone', 'project (k = 3): ghost map onto the hyperboloid', 'invert (k = 4): the −1 spinor sheet',
             'fold (k = 5): both inverses, in reverse order', 'k = 6: another branch offloads', 'index (k = 7): table lookup', 'zero point (k = 0)',
             'seed (k = 1)', 'k = 2: another branch onloads', 'project (k = 3)', 'invert (k = 4)', 'fold (k = 5)', 'offload (k = 6): result out'];
function submit(s, turns = 0) {
    const J = jobs[s], src = $(`#expr-${s}`).value.trim();
    if (J.st === 'running') return false;
    let prog;
    try { prog = prepareJob(src); }
    catch (e) { Object.assign(J, { st: 'err', msg: e.message, prog: null }); renderJob(s); log(`[${CALC[s]}] not started: ${e.message}`, 'fail'); return false; }
    if (J.st === 'held') log(`[${CALC[s]}] replaces the result held on Engine ${ENG[s]} (${fmtVal(J.prog.value)})`);
    const gate = lastFrame + framesTo(lastFrame, ON_PHASE[s], 24) + 24 * turns;
    Object.assign(J, { st: 'queued', prog, gate, F0: null, i: 0, L: prog.instr.length, pkt: null, msg: '', landF: null });
    log(`[${CALC[s]}] ${src} = ${fmtVal(prog.value)}: ${prog.instr.length} instructions, queued on Engine ${ENG[s]}'s outer manifold; onloads at frame ${gate} (joint frame ${ON_PHASE[s]}: k = 2, branch ${s} at ${120 * s}°)`);
    if (!state.playing) setPlaying(true);
    renderJob(s);
    return true;
}
function processFrame(F) {
    const z = zpOf(F);
    if (z.k === 0) snaps++;
    for (const J of jobs) {
        const s = J.s, e = eng[s];
        if (J.st === 'queued' && F >= J.gate) {
            J.st = 'running'; J.F0 = F; J.i = 0; J.pkt = null; trails[s] = []; checkpoints[s] = [{ n: 4, F }];
            log(`[${CALC[s]}] onloads at frame ${F} (k = 2, branch ${s}) onto T4 of Engine ${ENG[s]}`);
        }
        e.on = engagedFor(J);
        if (e.on) e.E++;
        reg.bits[s][(F - 1) % 720] = e.on ? 1 : 0;           // register r holds the frames 720(r − 1) + 1 … 720r
        if (J.st === 'held' && e.on) J.carry++;                 // the latched result rides its turning helix
        if (J.st !== 'running') continue;
        if (!J.pkt && z.n === ON_PHASE[s]) J.pkt = { i: J.i, on: F };
        if (J.pkt) {
            const d = F - J.pkt.on;
            if (d === 3) { const g = branchPass(s); geo[s].n++; if (g.ok) geo[s].ok++; else log(`[${CALC[s]}] geometric test FAILED on branch ${s}`, 'fail'); }
            J.msg = `instruction ${J.pkt.i + 1}/${J.L}: ${J.prog.instr[J.pkt.i]}\npacket frame ${d}/12 · ${PKT[d]}`;
            if (d === 12) {                                       // its own offload, twelve frames after its onload
                J.i++; J.pkt = null;
                if (J.i === J.L) {
                    J.st = 'held'; J.landF = F; J.carry = 0;
                    completed.push({ s, F0: J.F0, land: F, L: J.L });
                    const waiting = jobs.filter(o => o.st !== 'held').map(o => CALC[o.s]);
                    log(`[${CALC[s]}] offloads its last instruction at frame ${F} (k = 6, branch ${s}) and latches on T0: ${fmtVal(J.prog.value)}${waiting.length ? ` · held in memory, waiting for ${waiting.join(' and ')}` : ''}`, 'pass');
                }
            }
        } else J.msg = `instruction ${J.i + 1}/${J.L} waits for branch ${s}'s next onload (k = 2) in ${framesTo(F, ON_PHASE[s], 24)} frames`;
        if (J.st === 'running') {
            const n = tierOf(J);
            trails[s].push({ n, F });
            if (checkpoints[s][checkpoints[s].length - 1].n !== n) checkpoints[s].push({ n, F });
        }
    }
    if (F % 720 === 0) closeRegister(F);
    advanceTracks(F);
    const allHeld = jobs.every(J => J.st === 'held');
    if (allHeld && z.n === 0) converge(F);
    else if (allHeld && pairWait === null) {
        pairWait = F;
        log(`[0] all three latched; they pair at the next zero point of the joint cycle (n = 0), in ${framesTo(F, 0, 24)} frames`);
    }
}
function liveTurns() { return jobs.map(J => (J.st === 'held' ? carriedTurns(J.s, J.carry) : Fraction.ZERO)); }

''')

# ---------------------------------------------------------------- pairing at the zero point
rep("function readout(vals, turns = ZERO3) {", "function readout(vals, turns = ZERO3, k = 29) {")
rep("    const nodes = [0, 1, 2].map(s => exactNodeSpin(s, 29, 4, dphi[s], turns[s]));   // T0, node 29, carried by each engine's spin",
    "    const nodes = [0, 1, 2].map(s => exactNodeSpin(s, k, 4, dphi[s], turns[s]));    // T0, the pairing node, carried by each engine's spin")
cut('function converge(p) {', '// The newest word', r'''function converge(F) {
    const vals = jobs.map(J => J.prog.value);
    const cells = [...vals.map(v => v.f), vals[0].f.add(vals[1].f).add(vals[2].f)];
    const z = zpOf(F), addr = wordCount % 30, mode = state.clutch, carry = jobs.map(J => J.carry);
    const raw = carry.map((c, s) => carriedTurns(s, c)), Z = gaugeExact(raw[0], raw[1], raw[2]);
    const turns = mode === 'membrane' ? raw.map(() => Z.s.div(F3)) : raw;          // the membrane removes the differential z exactly
    const w = { id: wordCount, addr, F, pulse: z.pulse, kPair: z.node, mode, carry, raw, turns, Z, step: z.k || 8, k: z.node,
                src: jobs.map(J => J.prog.src), exact: vals.map(v => v.exact), cells, orig: cells.slice(), starts: jobs.map(J => J.F0), lands: jobs.map(J => J.landF), altered: null };
    Object.assign(w, readout(cells.slice(0, 3), turns, z.node), { G: gaugeExact(cells[0], cells[1], cells[2]) });
    pairWait = null;
    w.tau0 = chainOf(w);
    memory = memory.filter(o => o.addr !== addr);
    [...memErased].filter(key => key.startsWith(`${addr}:`)).forEach(key => memErased.delete(key));
    memory.push(w); wordCount++; latest = w;
    jobs.forEach(J => { J.st = 'done'; J.last = J.prog; });
    const spread = Math.max(...w.lands) - Math.min(...w.lands), zTxt = `(${fmtShort(Z.X, 10)}, ${fmtShort(Z.Yc, 10)})`;
    log(`[Σ] paired at the zero point, frame ${F} (joint frame 0, node ${z.node}): Y = A + B + C = ${fmtExact(w.G.s)}${vals.every(v => v.exact) ? ' (exact)' : ' (approximate inputs)'} · landings ${spread ? `${spread} frames apart` : 'together'} · written to address ${addr}: A, B, C on T4, Y on T0`, 'hd');
    if (mode === 'hold') log(`[⊥] clutch held the finished engines: spin since landing ${carry.join(' · ')} frames, so no shear`);
    else if (mode === 'free') log(`[⊥] free-run: the held results rode their helices ${raw.map((t, s) => `${CALC[s]} ${fmt(toNum(t) * 360, 4)}°`).join(', ')}; differential z = ${zTxt} turns ${Z.X.isZero() && Z.Yc.isZero() ? '(none)' : 'shears the landing triangle'}`, Z.X.isZero() && Z.Yc.isZero() ? '' : 'fail');
    else log(`[⊥] membrane offload at the zero point (frame ${F}): differential z = ${zTxt} turns removed exactly, common rotation s/3 = ${fmtShort(Z.s.div(F3), 12)} turns kept; the three landing nodes are congruent again`, 'pass');
    log(`[Q] quadrance out: Q = (${w.T.Q.map(q => fmt(q.toNumber(), 6)).join(', ')}), A_R = ${fmt(w.T.poly.toNumber(), 6)} (poly ${w.T.same ? '=' : '≠'} Gram), χ = ${w.T.chi.toFixed(6)}, ${agree(w) ? (w.T.lock ? 'LOCK: the three results are equal' : 'deformed by the carried spin, although the three results are equal') : w.T.lock ? 'LOCK at the 2^-24 grid, although the results differ below it' : 'deformed: the results differ'} · |P4*|² = ${fmt(w.Q4.toNumber(), 6)}`, w.T.lock ? 'pass' : '');
    renderAll(true);
}
''')
rep("function refreshReadout() { if (latest) Object.assign(latest, readout(latest.cells.slice(0, 3), latest.turns)); renderAll(true); }",
    "function refreshReadout() { if (latest) Object.assign(latest, readout(latest.cells.slice(0, 3), latest.turns, latest.kPair)); renderAll(true); }")

# ---------------------------------------------------------------- console and readouts
cut('function renderJob(s) {', 'function renderTqf() {', r'''function renderJob(s) {
    const J = jobs[s], st = $(`#job-st-${s}`), out = $(`#job-out-${s}`), bars = [...$(`#job-bar-${s}`).children];
    const label = { idle: 'idle', queued: 'queued · T4', running: `running · T${tierOf(J)} · ${J.i}/${J.L}`, held: 'latched · held', done: 'paired', err: 'error' }[J.st];
    st.textContent = label; st.className = `job-st ${J.st}`;
    const frac = J.st === 'running' ? J.i / J.L : (J.st === 'held' || J.st === 'done') ? 1 : 0, lit = J.st === 'running' ? Math.floor(frac * 5) + 1 : Math.round(frac * 5);
    bars.forEach((b, n) => { b.style.background = n < lit ? (J.st === 'running' && n === lit - 1 ? CLASS_CSS[s] : CLASS_CSS[s] + '99') : 'transparent'; });
    $(`#run-${s}`).disabled = J.st === 'running';
    let text = '';
    if (J.st === 'idle') text = 'Ready. Press Run, or Run all.';
    else if (J.st === 'err') text = `Error: ${J.msg}`;
    else if (J.st === 'queued') text = `${J.prog.src} = ${fmtVal(J.prog.value)} · ${J.L} instructions\nHeld on the outer manifold until frame ${J.gate}, branch ${s}'s onload (k = 2): ${Math.max(0, J.gate - lastFrame)} frames to go.`;
    else if (J.st === 'running') text = J.msg;
    else if (J.st === 'held') { const wt = jobs.filter(o => o.st !== 'held'); text = `Latched at frame ${J.landF}: ${fmtVal(J.prog.value)}\n${wt.length ? `Held in memory until ${wt.map(o => CALC[o.s]).join(' and ')} land${wt.length === 1 ? 's' : ''}.` : `All three latched: they pair at the zero point in ${framesTo(lastFrame, 0, 24)} frames.`}`; }
    else if (J.st === 'done') text = `${J.last.src} = ${fmtVal(J.last.value)}\nOnloaded frame ${latest ? latest.starts[s] : '?'}, latched frame ${latest ? latest.lands[s] : '?'} · ${J.L} instructions · paired into word ${latest ? latest.addr : '?'}.`;
    out.textContent = `${text}\nclutch ${clutchLabel(J)} · own gear ${eng[s].E % 720}/720`;
}
''')
rep("        <div><span>entries · landings</span><br>${w.starts.join(', ')} · ${w.lands.join(', ')}</div>`;",
    "        <div><span>onloads · latches (frames)</span><br>${w.starts.join(', ')} · ${w.lands.join(', ')}</div>\n        <div><span>paired at</span><br>frame ${w.F} · node ${w.kPair}</div>`;")
cut('const ownFrame = (s, pf) =>', 'function renderGauge() {', r'''const ownFrame = (s, fF) => effE(s, fF) % 720;
function clutchLabel(J) {
    const on = engagedFor(J);
    return { running: 'engaged · computing', held: on ? 'engaged · held, riding' : 'disengaged · held', queued: on ? 'engaged · queued' : 'disengaged · queued',
             done: on ? 'engaged · free' : 'disengaged', idle: on ? 'engaged · free' : 'disengaged', err: on ? 'engaged · free' : 'disengaged' }[J.st];
}
function renderClutch() {
    $('#clutch-rows').innerHTML = jobs.map((J, s) => {
        const f = eng[s].E % 720, held = J.st === 'held', done = J.st === 'done' && latest;
        const spin = held ? `${J.carry} frames · ${fmtTurns(carriedTurns(s, J.carry))}` : done ? `${latest.carry[s]} frames · ${fmtTurns(latest.raw[s])}${latest.mode === 'membrane' ? ' → ' + fmtShort(latest.turns[s], 10) : ''}` : '—';
        return `<tr><td><span class="cls-dot" style="background:${CLASS_CSS[s]}"></span>${CALC[s]} · ${ENG[s]}</td><td>${clutchLabel(J)}</td><td>${eng[s].E} frames</td><td>${f}/720 · k ${eng[s].E % 8}</td><td>${spin}</td></tr>`;
    }).join('');
    const fr = jobs.map((J, s) => eng[s].E % 720), meshed = fr.every(f => f === fr[0]);
    const anyHeld = jobs.some(J => J.st === 'held');
    const c = anyHeld ? liveTurns() : latest ? latest.raw : ZERO3, Z = gaugeExact(c[0], c[1], c[2]), zero = Z.X.isZero() && Z.Yc.isZero();
    $('#membrane-out').innerHTML = `
        <div><span>mode</span><br>${{ hold: 'hold finished engines', free: 'free-run', membrane: 'free-run + membrane' }[state.clutch]}</div>
        <div><span>own gears</span><br>${meshed ? '<span class="st st-pass">meshed</span>' : `<span class="st st-tol">lag ${fr.map(f => (f - fr[0] + 1080) % 720 - 360).join(' · ')} frames</span>`}</div>
        <div><span>${anyHeld ? 'carried now' : 'carried at pairing'}: s (common)</span><br>${fmtShort(Z.s, 14)} turns</div>
        <div><span>${anyHeld ? 'z now (the shear)' : latest && latest.mode === 'membrane' ? 'z loaded, then removed at the zero point' : 'z at pairing (the shear)'}</span><br>${zero ? '<span class="st st-pass">0</span>' : `(${fmtShort(Z.X, 9)}, ${fmtShort(Z.Yc, 9)})`}</div>
        <div><span>next zero point</span><br>in ${framesTo(lastFrame, 0, 24)} frames (joint frame 0)</div>`;
}
function renderPump() {
    const last = reg.last;
    $('#pump-rows').innerHTML = jobs.map((J, s) => {
        const now = reg.bits[s].reduce((a, x) => a + x, 0), r = last ? last.res[s] : null;
        return `<tr><td><span class="cls-dot" style="background:${CLASS_CSS[s]}"></span>${CALC[s]} · ${ENG[s]}</td><td>${now} of ${lastFrame % 720}</td>` +
            (r ? `<td>${r.P}/720</td><td>${r.Q10}/720</td><td>${r.Q8}/720</td><td>${r.H}/720</td><td>${r.closed ? '<span class="st st-pass">P = 1: closed</span>' : `<span class="st st-tol">residual ${r.P}/720, removed by H</span>`}${r.identity ? '' : ' <span class="st st-fail">identity FAILS</span>'}</td>`
               : '<td colspan="5" style="text-align:left;color:var(--muted)">after the first register (720 frames)</td>') + '</tr>';
    }).join('');
    $('#pump-note').textContent = last ? `Register ${last.n} closed at frame ${last.F}: 72 ten-frame blocks, inner gear blocks ${ZP_STATIC.blocks.join(', ')}, and H = Q⁽⁸⁾Q⁽¹⁰⁾P = P⁻¹ for all three. An engine that turned all 720 frames closes (P = 1). One the clutch held falls behind by the held frames and records that residual, which its compensator H removes.`
        : `Register ${zpOf(lastFrame).reg + 1} is filling: frame ${lastFrame % 720}/720. It closes at frame ${(zpOf(lastFrame).reg + 1) * 720}.`;
}
// The master gear and each engine's own 12-tooth outer gear; a bar between them shows the clutch
function drawClutchGears(fF, frameF) {
    const cv = $('#clutch-gears'); if (!cv) return;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, light = document.documentElement.dataset.theme === 'light';
    ctx.clearRect(0, 0, W, H);
    const gear = (cx, cy, rad, teeth, rot, stroke, fill) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.beginPath();
        for (let i = 0; i < teeth * 2; i++) { const r = i % 2 === 0 ? rad + 5 : rad - 3, a = (i / (teeth * 2)) * Math.PI * 2; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(rad - 8, 0); ctx.stroke(); ctx.restore();
    };
    const txt = light ? '#161a2e' : '#e6e8f2', mut = light ? '#4b5470' : '#9aa3bd';
    ctx.font = '600 12px ui-monospace, monospace'; ctx.textAlign = 'center';
    gear(80, 66, 40, 12, frameF / 720 * 2 * Math.PI, '#8b5cf6', 'rgba(139,92,246,0.14)');
    ctx.fillStyle = txt; ctx.fillText('master', 80, 132); ctx.fillStyle = mut; ctx.fillText(`${String(Math.floor(frameF)).padStart(3)}/720`, 80, 146);
    jobs.forEach((J, s) => {
        const cx = 250 + s * 160, on = eng[s].on, f = ownFrame(s, fF);
        ctx.strokeStyle = on ? CLASS_CSS[s] : mut; ctx.lineWidth = on ? 3 : 1.5; ctx.setLineDash(on ? [] : [4, 5]);
        ctx.beginPath(); ctx.moveTo(cx - 52, 66); ctx.lineTo(cx - 80, 66); ctx.stroke(); ctx.setLineDash([]);
        gear(cx, 66, 40, 12, SPIN[s] * f / 720 * 2 * Math.PI, CLASS_CSS[s], on ? CLASS_CSS[s] + '33' : 'rgba(148,163,184,0.08)');
        ctx.fillStyle = txt; ctx.fillText(`${CALC[s]} · Engine ${ENG[s]}`, cx, 132);
        ctx.fillStyle = mut; ctx.fillText(`${String(Math.floor(f)).padStart(3)}/720 · ${on ? 'engaged' : 'held'}`, cx, 146);
    });
}
function solStateOf() {
    if (memory.some(w => !parityOk(w))) return 'fail';
    if (jobs.some(J => J.st === 'running' || J.st === 'queued')) return 'busy';
    if (jobs.some(J => J.st === 'held')) return jobs.every(J => J.st === 'held') ? 'pend' : 'hold';
    if (!latest) return 'idle';
    return agree(latest) ? (latest.T.lock ? 'lock' : 'shear') : 'conv';
}
''')
cut('function renderAll(force) {', BAR + '// Panel D: lemma rows', r'''function renderAll(force) {
    jobs.forEach((J, s) => renderJob(s));
    renderClutch(); renderPump();
    const key = [wordCount, memory.map(w => w.cells.map(String).join()).join('|'), [...memErased].join(), state.kappa, state.tension, state.torsion, crys.lock, completed.length, reg.count, geo.map(g => g.n).join()].join('#');
    if (!force && key === lastRendered) return;
    lastRendered = key;
    renderTqf(); renderMemory(); renderTiles(); renderHud(); renderGauge(); renderLemmaRows3();
}

// =====================================================================
// Panel Z: the zero-point cycle
// =====================================================================
const BRANCH_CSS = CLASS_CSS;
function renderZP() {
    const F = lastFrame, z = zpOf(F), [ra, rb] = redState(z.k);
    if (!$('#zp-strip').children.length) {
        $('#zp-strip').innerHTML = Array.from({ length: 24 }, (_, n) => {
            const k = n % 8, j = n % 3, m = (n - 2) / 4, hs = k === 2 || k === 6;
            const style = k === 2 ? `background:${BRANCH_CSS[j]}40;border-color:${BRANCH_CSS[j]}` : k === 6 ? `border-color:${BRANCH_CSS[j]}` : '';
            const title = k === 2 ? `frame ${n}: onload of branch ${j} (${120 * j}°), spinor ${m % 2 ? '−i' : '+i'}` : k === 6 ? `frame ${n}: offload of branch ${j} (${120 * j}°), spinor ${m % 2 ? '−i' : '+i'}` : `frame ${n}: k = ${k}, j = ${j}`;
            return `<div class="${k === 6 ? 'off' : ''}" style="${style}" title="${title}" data-n="${n}"><b>${n}</b>k${k}<br>j${j}${hs ? `<br>${m % 2 ? '−i' : '+i'}` : ''}</div>`;
        }).join('');
        $('#zp-stages tbody').innerHTML = ZP_STAGES.map(([name, op], k) => {
            const [a, b] = redState(k), state = b === 0n ? `${a}` : a === 0n ? (b === 1n ? 'i' : '−i') : fmtGauss([a, b]);
            return `<tr data-k="${k}" class="${k === 2 || k === 6 ? 'win' : ''}"><td>${k === 0 ? '0 / 8' : k}</td><td>${name}</td><td>${SPINOR_TXT[k]}</td><td>${state.replace('-', '−')}</td><td>${k === 0 ? '0° / 720°' : 90 * k + '°'}</td><td>${SPREADS[k]}</td><td>${op}</td></tr>`;
        }).join('');
    }
    [...$('#zp-strip').children].forEach(d => d.classList.toggle('now', +d.dataset.n === z.n));
    [...$('#zp-stages tbody').children].forEach(r => r.classList.toggle('now', +r.dataset.k === z.k));
    const hsNow = z.k === 2 || z.k === 6 ? `${z.k === 2 ? 'onload' : 'offload'} of branch ${z.j} (${120 * z.j}°, Engine ${ENG[z.j]}), spinor ${((z.n - 2) / 4) % 2 ? '−i' : '+i'}` : 'no handshake';
    $('#zp-strip-note').textContent = `joint frame n = ${z.n} · ${hsNow}. Branch 0 onloads at 18 and offloads at 6, branch 1 at 10 → 22, branch 2 at 2 → 14: twelve frames each.`;
    $('#zp-now').innerHTML = `
        <div><span>frame F</span><br>${F}</div>
        <div><span>step k = F mod 8</span><br>${z.k || '0 = 8'} · ${ZP_STAGES[z.k][0]}</div>
        <div><span>spinor q_k</span><br>${SPINOR_TXT[z.k]} · state ${fmtGauss([ra, rb])}</div>
        <div><span>spatial angle · spread</span><br>${(90 * z.k) % 360}° · ${SPREADS[z.k]}</div>
        <div><span>branch j = F mod 3</span><br>${z.j} · ${120 * z.j}° · Engine ${ENG[z.j]}</div>`;
    const nOn = [0, 1, 2].map(j => framesTo(F, ON_PHASE[j], 24)), nOff = [0, 1, 2].map(j => framesTo(F, OFF_PHASE[j], 24));
    $('#zp-reg').innerHTML = `
        <div><span>register</span><br>${z.reg + 1} · frame ${z.f}/720</div>
        <div><span>joint cycle</span><br>${z.joint + 1}/30 · n = ${z.n}</div>
        <div><span>spinor cycle</span><br>${z.cyc + 1}/90 · k = ${z.k}</div>
        <div><span>pulse · node</span><br>${z.pulse} · ${z.node}</div>
        <div><span>next onloads (frames)</span><br>${nOn.map((x, j) => `${CALC[j]} ${x}`).join(' · ')}</div>
        <div><span>next offloads (frames)</span><br>${nOff.map((x, j) => `${CALC[j]} ${x}`).join(' · ')}</div>`;
    const geoN = geo.reduce((a, g) => a + g.n, 0), geoOk = geo.reduce((a, g) => a + g.ok, 0), last = reg.last;
    $('#zp-tests').innerHTML = `
        <div><span>spinor test</span><br><span class="st ${ZP_STATIC.p22 && ZP_STATIC.p23 ? 'st-pass' : 'st-fail'}">q₈ = +1, q₄ = −1</span> ${snaps} snaps</div>
        <div><span>geometric test</span><br>${geoN ? `<span class="st ${geoOk === geoN ? 'st-pass' : 'st-fail'}">${geoOk}/${geoN} exact</span> round trips` : 'after the first packet folds'}</div>
        <div><span>memory test</span><br>${last ? last.res.map((r, s) => `<span class="st ${r.closed ? 'st-pass' : 'st-tol'}" style="white-space:nowrap">${CALC[s]}: ${r.closed ? 'P = 1' : 'P = ' + r.P + '/720'}</span>`).join(' ') : 'at frame 720'}</div>
        <div><span>cyclic holonomy</span><br><span class="st st-na">identically 1: no test</span></div>`;
    const [a, b] = redState(z.k).map(Number), nb = Math.hypot(a, b);
    $('#zp-tracks').innerHTML = `
        <div><span>B · exact</span><br>(1+i)^F reduced: ${fmtGauss([ra, rb])}</div>
        <div><span>A · floating point</span><br>(${tracks.a[0].toFixed(6)}, ${tracks.a[1].toFixed(6)})</div>
        <div><span>A against B's readout</span><br><span class="st ${tracks.maxErr < 1e-9 ? 'st-pass' : 'st-fail'}">${tracks.err.toExponential(1)}</span> now · ${tracks.maxErr.toExponential(1)} worst</div>
        <div><span>R · mod 881 (i ↦ 387)</span><br>${tracks.R} · <span class="st ${tracks.rOk ? 'st-pass' : 'st-fail'}">${tracks.rOk ? 'agrees with B' : 'DISAGREES'}</span></div>
        <div><span>B readout</span><br>(${(a / nb).toFixed(6)}, ${(b / nb).toFixed(6)})</div>`;
    $('#zp-pkts').innerHTML = jobs.map((J, s) => {
        const pk = J.st === 'running' && J.pkt ? `instr ${J.pkt.i + 1}/${J.L} · ${PKT[F - J.pkt.on].split(':')[0]}` : J.st === 'running' ? `between windows (${J.i}/${J.L} done)` : J.st;
        return `<tr><td><span class="cls-dot" style="background:${CLASS_CSS[s]}"></span>${s} · ${120 * s}° · ${CALC[s]}</td><td>${pk}</td><td>${geo[s].n ? `<span class="st ${geo[s].ok === geo[s].n ? 'st-pass' : 'st-fail'}">${geo[s].ok}/${geo[s].n}</span>` : '—'}</td></tr>`;
    }).join('');
}
// The eight-step dial: one turn per 8 frames; the outer ring is the joint cycle of 24 frames with the six handshakes
function drawZpDial(fF) {
    const cv = $('#zp-dial'); if (!cv) return;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, light = document.documentElement.dataset.theme === 'light';
    const txt = light ? '#161a2e' : '#e6e8f2', mut = light ? '#4b5470' : '#9aa3bd', F = Math.floor(fF), k = F % 8, n = F % 24;
    ctx.clearRect(0, 0, W, H);
    // joint ring
    for (let m = 0; m < 24; m++) {
        const a0 = (m / 24) * 2 * Math.PI - Math.PI / 2, a1 = ((m + 1) / 24) * 2 * Math.PI - Math.PI / 2, km = m % 8, jm = m % 3;
        ctx.beginPath(); ctx.arc(cx, cy, 148, a0 + 0.02, a1 - 0.02); ctx.lineWidth = km === 2 || km === 6 ? 10 : 4;
        ctx.strokeStyle = km === 2 ? CLASS_CSS[jm] : km === 6 ? CLASS_CSS[jm] + '88' : (light ? 'rgba(30,41,59,0.18)' : 'rgba(148,163,184,0.25)');
        ctx.stroke();
        if (m === n) { ctx.beginPath(); ctx.arc(cx, cy, 136, a0, a1); ctx.lineWidth = 3; ctx.strokeStyle = '#f5c542'; ctx.stroke(); }
    }
    // the eight steps
    ctx.beginPath(); ctx.arc(cx, cy, 110, 0, 2 * Math.PI); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(245,197,66,0.4)'; ctx.stroke();
    ctx.font = '600 13px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let s = 0; s < 8; s++) {
        const a = (s / 8) * 2 * Math.PI - Math.PI / 2, on = s === k, win = s === 2 || s === 6;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22); ctx.lineTo(cx + Math.cos(a) * 104, cy + Math.sin(a) * 104);
        ctx.strokeStyle = on ? '#f5c542' : win ? '#fb923c' : (light ? 'rgba(30,41,59,0.3)' : 'rgba(148,163,184,0.35)'); ctx.lineWidth = on ? 4 : 1.5; ctx.stroke();
        ctx.fillStyle = on ? '#f5c542' : mut; ctx.fillText(s === 0 ? '0/8' : String(s), cx + Math.cos(a) * 122, cy + Math.sin(a) * 122);
    }
    const frac = fF - Math.floor(fF), a = ((k + frac) / 8) * 2 * Math.PI - Math.PI / 2;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 104, cy + Math.sin(a) * 104, 6, 0, 2 * Math.PI); ctx.fillStyle = '#f5c542'; ctx.fill();
    ctx.fillStyle = txt; ctx.font = '700 15px ui-sans-serif, system-ui, sans-serif'; ctx.fillText(ZP_STAGES[k][0], cx, cy - 10);
    ctx.font = '12px ui-monospace, monospace'; ctx.fillStyle = mut; ctx.fillText(`k = ${k} · q = ${SPINOR_TXT[k]}`, cx, cy + 10);
    ctx.fillText(`frame ${F % 720}/720`, cx, cy + 28);
}

''')

# ---------------------------------------------------------------- lemma rows
cut("const okB = b =>", BAR + '// Panel A:', r'''const okB = b => (b ? '<span class="st st-pass">PASS</span>' : '<span class="st st-fail">FAIL</span>');
const NA3 = '<span class="st st-na">not used</span>', DEF3 = '<span class="st st-na">definition</span>', HEU3 = '<span class="st st-na">heuristic</span>', WAIT3 = '<span class="st st-na">after a pairing</span>';
function renderLemmaRows3() {
    const S = STATIC, C = CUBE_STATIC, Z = ZP_STATIC, w = latest, drawn = drawnFramesCheck();
    const geoN = geo.reduce((a, g) => a + g.n, 0), geoOk = geo.reduce((a, g) => a + g.ok, 0);
    const schedOk = completed.every(j => j.F0 % 24 === ON_PHASE[j.s] && j.land % 24 === OFF_PHASE[j.s] && j.land - j.F0 === 24 * (j.L - 1) + 12);
    const words = memory, intact = words.filter(o => o.altered === null);
    const parityRow = words.every(o => (o.altered === null ? parityOk(o) : o.altered === -1 || !parityOk(o)));
    const locateRow = words.every(o => (o.altered === null ? locate(o) === null : o.altered === -1 || locate(o) === o.altered));
    const erasureRow = intact.every(o => [0, 1, 2, 3].every(j => rebuild(o, j).eq(o.cells[j])));
    let arithOk = true;
    if (w) try { arithOk = w.src.every((src, s) => prepareJob(src).value.f.eq(w.orig[s])); } catch (e) { arithOk = false; }
    const tilesOk = !w || w.cells.every((v, j) => { const t = cellTile(w, j, v).word; return packTile({ ...decodeTile(t) }) === t; });
    const phasesAgree = !!w && w.dphi.every(d => d === w.dphi[0]) && w.turns.every(t => fracPart(t).eq(fracPart(w.turns[0])));
    const holdWords = memory.filter(o => o.mode === 'hold'), memWords = memory.filter(o => o.mode === 'membrane');
    const zeroPairs = memory.every(o => o.F % 24 === 0);
    const gateOpen = Math.abs(((state.tension - state.torsion) % 30 + 30) % 30) < 1e-9;
    const rows = [
        ['Prop. 2.2 · Lemma 13 Part 4', 'The clock is the Gaussian integer 1 + i: (1 + i)⁴ = −4 and (1 + i)⁸ = 16, and the reduced states 1 + i, i, −1 + i, −1, −1 − i, −i, 1 − i, 1 need two signed bits', 'Exact Gaussian powers; track B is the reduced state of every frame', okB(Z.p22)],
        ['Prop. 2.3', 'Conjugation by (1 + i)^k is Rot<sub>x</sub>(90k°): a 45° spinor step is a 90° spatial step. Steps 2 and 6 give the same half-turn with spinors ±i, and step 4 is the identity on the −1 sheet', 'Exact integer rotation matrices for k = 1…8', okB(Z.p23)],
        ['Prop. 2.4 (Niven)', 'No rational unit quaternion has order 8, so the clock runs projectively on reduced states rather than on e<sup>ikπ/4</sup>', `Track A (floating point) has drifted ${tracks.maxErr.toExponential(1)} after ${tracks.frames} frames; track B cannot drift`, okB(Z.p22 && tracks.maxErr < 1e-9)],
        ['Prop. 3.1', 'The a = 0 triad is three cube vertices 120° apart (corrected frame), with x* = (1, 1, 1) a regular tetrahedron of side 2√2. Branch j is engine j and σ<sup>j</sup> of branch 0', 'All six quadrances 8, |x|² = 3; σ carries branch to branch', okB(Z.tet && Z.sigmaBranch)],
        ['Prop. 3.2–3.3', 'Paraboloid and conformal lifts: ⟨X, X⟩ = 0 and −2⟨X(x), X(y)⟩ = |x − y|²; the five null vectors of a family span R⁵', 'Exact identities; the determinant of the five lifts is non-zero', okB(Z.nullc && Z.rank5)],
        ['Def. 3.12 · geometric test', 'Every packet\'s branch transforms (null-cone lift, ghost map) followed by their exact inverses restore the point, the metric and the tetrahedron', `${geoOk}/${geoN} packet round trips exact`, geoN ? okB(geoOk === geoN) : '<span class="st st-na">after a packet folds</span>'],
        ['Prop. 3.7 · Def. 3.6', 'Joint register k = n mod 8, j = n mod 3 with period 24. Onloads fall at n = 2, 10, 18 on branches 2, 1, 0 and offloads 12 frames later; 720 = 30 · 24 = 90 · 8', `${completed.length} job(s): every packet onloaded at its branch's k = 2 frame and offloaded at k = 6, 12 frames later`, okB(Z.p37 && schedOk)],
        ['Prop. 7.1', 'The six handshakes of a joint cycle are labelled by C₃ × C₂: the branch j and the spinor sign ±i', 'n = 4m + 2 ↦ (n mod 3, (−1)<sup>m</sup>) is a bijection', okB(Z.p71)],
        ['Prop. 8.2', 'Spreads on the clock, 0, 1/2, 1, 1/2, 0, … are rational; the handshake windows are the steps of spread 1', 'Exact spreads from the reduced states', okB(Z.p82)],
        ['Prop. 3.9', 'The 720 → 72 → 10 pump: ten-frame blocks telescope, δ<sub>m</sub> = ΔQ<sub>m</sub><sup>−1</sup>, inner blocks (8,7,7,7,7,8,7,7,7,7), and H = Q⁽⁸⁾Q⁽¹⁰⁾P = P<sup>−1</sup>; the cycle closes iff P = 1', reg.last ? `register ${reg.last.n}: H = P⁻¹ for all three; ${reg.last.res.filter(r => r.closed).length}/3 closed` : `inner blocks ${Z.blocks.join(',')}`, okB(Z.p39 && (!reg.last || reg.last.res.every(r => r.identity)))],
        ['Def. 3.12 · memory test', 'The memory test is the open holonomy of each engine\'s gear: P = 1, or a recorded residual removed by its compensator H', reg.last ? reg.last.res.map((r, s) => `${CALC[s]} ${r.closed ? 'closed' : 'residual ' + r.P + '/720'}`).join(', ') : 'at the first register boundary (frame 720)', DEF3],
        ['Prop. 3.13', 'The cyclic holonomy is identically 1 and tests nothing', 'The page uses the open product only', DEF3],
        ['§8.10 · Prop. 8.8', 'Four tracks: A (floating point) proposes, B (exact) certifies, R (residues mod 881) fingerprints B; a disagreement is assigned to the track that fails its own identity', `A within 10⁻⁹ of B; R ${tracks.rOk ? 'agrees' : 'DISAGREES'} with B over ${tracks.frames} frames; 387² ≡ −1 (mod 881)`, okB(tracks.maxErr < 1e-9 && tracks.rOk && Z.res881)],
        ['Def. 3.12 · pairing', 'The three results pair only at a zero point of the joint cycle (joint frame 0, a Snap)', `${memory.length} word(s), all paired at n = 0`, memory.length ? okB(zeroPairs) : WAIT3],
        ['Layer B', 'Calculations: ℚ is closed under + − × ÷ and whole powers, so these results are exact; sqrt, sin, cos, π are exact only where the value is rational, and are otherwise marked ≈', w ? `Newest word's three expressions re-evaluated independently: ${arithOk ? 'bit for bit' : 'MISMATCH'}` : 'after a pairing', w ? okB(arithOk) : WAIT3],
        ['Prop. 3.4 · 7.14', 'The pairing: (A, B, C) split into the fixed line s = Y and the rotating plane z, and recovered exactly', w ? `Recovery ${w.G.recovered ? 'exact' : 'fails'}` : 'after a pairing', w ? okB(w.G.recovered) : WAIT3],
        ['Lemma 5 Part 6(a)', 'Quadrance out: A<sub>R</sub> = (ΣQ)² − 2ΣQ² = 4(|u|²|v|² − ⟨u,v⟩²) for the triangle at the zero point', w ? `Both forms equal and ≥ 0 in BigInt (${w.T.bits}-bit values)` : 'after a pairing', w ? okB(w.T.same && w.T.nonneg) : WAIT3],
        ['Lemma 4 Part 2', 'Weitzenböck: χ ≤ 1/√3 with equality iff equilateral. Equal results carried by equal spins give an exact lock', w ? `χ = ${w.T.chi.toFixed(6)}; ${phasesAgree ? 'phases and carried spins agree, and the triangle is locked' : 'phases or carried spins differ'}` : 'after a pairing', w ? okB(w.T.weitz && (!phasesAgree || w.T.lock)) : WAIT3],
        ['Props. 3.10 · G1', 'Each memory word is a group of four: Y = A + B + C. One lost cell is rebuilt exactly, two are not; parity fails exactly on altered words', `${words.length} word(s); ${words.filter(o => !parityOk(o)).length} flagged; ${intact.length} intact rebuild bit for bit`, okB(parityRow && erasureRow)],
        ['Lemma 15 Part 3', 'Each word keeps the Merkle chain of its four leaves; the deepest differing layer locates an altered cell', `${words.filter(o => locate(o) !== null).length} word(s) differ from their chain`, okB(locateRow)],
        ['§6.1 · Lemma 15', 'Memory cells as 64-bit tiles (Form 3) chained by SHA-256 into the memory root; the step field holds the zero-point step of the pairing frame', w ? '4/4 newest tiles re-encode bit for bit' : 'after a pairing', w ? okB(tilesOk) : WAIT3],
        ['Clutch', 'Holding a finished engine disengages it, so its latched node does not move while the others catch up', holdWords.length ? `${holdWords.length} word(s) paired with held engines; spin since landing 0 in all` : 'after a pairing in hold mode', holdWords.length ? okB(holdWords.every(o => o.carry.every(c => c === 0))) : WAIT3],
        ['Membrane', 'The carried spins split into a common rotation s and an orthogonal differential z; the membrane removes z exactly at the zero point and keeps s/3', memWords.length ? `${memWords.length} offload(s): z removed, the three turns equal` : 'after a membrane pairing', memWords.length ? okB(memWords.every(o => o.Z.recovered && o.turns.every(t => t.eq(o.turns[0])))) : WAIT3],
        ['Lemma 4', 'Tier laws R<sub>n</sub> = 5n² + 15n + 15, ρ<sub>n</sub> = 2n + 4, W<sub>n</sub> = 16 − 2n, and the pure tier frames, for all three engines', `Exact integers; drawn frame steps are 120° turns to ${drawn === null ? '–' : drawn.toExponential(1)}`, okB(S.l4p1 && C.frames && (drawn === null || drawn < 1e-9))],
        ['§7.1–7.2, 7.13', 'The three engines are related by σ: (x, y, z) ↦ (z, x, y), the same 120° turn that carries one branch to the next', 'σ orthogonal with integer entries, σ³ = 1', okB(C.perm)],
        ['Lemma 8.2 · Prop. 2.1', 'Crystal: the nine-phase wheel as the nine C<sub>9</sub> rays at 40° on |x| = √3; exactly three (the a = 0 triad) are cube corners', `cube corners at s = ${C9.corners.join(', ')}`, okB(C9.onSphere && C9.corners.join() === '0,3,6')],
        ['Props. 7.16–7.17', 'The central cube: Δ₁ ∪ −Δ₁ are the 8 vertices of Cube 1', 'Exact integer vertices', okB(C.cube)],
        ['Prop. 3.8', 'Clock windows: caesium, 40 Hz and 432 Hz close together every 120 frames. The paper states this for its frame of 1/60 s; this page keeps engine v10\'s frame of 1/720 s', 'Not applied here', DEF3],
        ['Definition', 'One instruction per joint cycle on its branch window; trails frame by frame; Δφ driver; clutch modes; pairing node', 'Design choices of this page', DEF3],
        ['Remark §3.3', 'The apex as a parity channel: here the parity Y is stored on the inner manifold, not at the apex', 'An analogy, not an encoder', HEU3],
        ['Lemma 5 Part 3', 'The spec\'s π/6 "zero-drag" gate', `Gate ${gateOpen ? 'open' : 'closed'} (Δθ = ${state.tension - state.torsion}°)`, HEU3],
        ['§4–5, physics', 'The hyperbolic Euler formula, the {4,3,5} boosts, the conditional P = NP equivalence and Part 2\'s lensing physics', 'Not used here; P versus NP stays open (Theorem 5.11)', NA3]
    ];
    $('#lemma-rows').innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('');
    const pass = rows.filter(r => r[3].includes('st-pass')).length, fail = rows.filter(r => r[3].includes('st-fail')).length;
    $('#lemma-sum').innerHTML = `${pass} live checks pass${fail ? `, <span style="color:var(--fail)">${fail} fail</span>` : ''} · ${rows.length - pass - fail} rows are waiting, definitions, heuristics or not used`;
}

''')

# ---------------------------------------------------------------- Panel A
rep("lineGeo(152)", "lineGeo(TRAIL_MAX)")
cut('// A node of engine s in the helices', '// The gauge of the three results scaled', r'''// A point of engine s on tier n at angle th, in the helices' co-rotating frame, lifted off the tube by `lift` and carried by `turns`
function dispAngle(s, n, th, dphi = 0, lift = 1.12, turns = 0, chi = 1) {
    const { D, tube } = tierDisp(s, n), rr = tube * lift, ph = TIERS_SPEC[n].W * th * chi + dphi, a = th + 2 * Math.PI * turns;
    const q = modRot([(D + rr * Math.cos(ph)) * Math.cos(a), (D + rr * Math.cos(ph)) * Math.sin(a), rr * Math.sin(ph)], n);
    return new THREE.Vector3(...c3pow(frameOf(n, q, NEG_N), s));
}
const dispPoint = (s, n, k, dphi = 0, lift = 1.12, turns = 0) => dispAngle(s, n, 2 * Math.PI * k / 30, dphi, lift, turns, k % 2 === 0 ? 1 : -1);
const thetaOfFrame = F => 2 * Math.PI * F / 360;            // the 30-node wheel takes 360 frames (12 per node)
// Engaged frames of engine s at fractional frame fF (the frame in progress counts in part while the clutch is engaged)
const partOf = fF => Math.min(1, Math.max(0, fF - lastFrame));
const effE = (s, fF) => eng[s].E - (eng[s].on ? 1 - partOf(fF) : 0);
const effCarry = (s, fF) => Math.max(0, jobs[s].carry - (eng[s].on ? 1 - partOf(fF) : 0));
const ease = x => x * x * (3 - 2 * x);
const beadSize = (s, n) => Math.max(1.4, tierDisp(s, n).D * 0.03);
function headOf(s, fF) {
    const J = jobs[s];
    if (J.st === 'queued') return dispAngle(s, 4, thetaOfFrame(J.gate));
    if (J.st === 'running') return dispAngle(s, tierOf(J), thetaOfFrame(fF));
    if (J.st === 'held') return dispAngle(s, 0, thetaOfFrame(J.landF), 0, 1.12, SPIN[s] * effCarry(s, fF) / 450);
    if (J.st === 'done' && latest) return dispPoint(s, 0, latest.kPair, latest.dphi[s], 1.12, toNum(fracPart(latest.turns[s])));
    return null;
}
function updateScene(alpha, tI) {
    if (!three) return;
    const fF = Math.max(0, tI * 720), heads = [];
    three.systems.forEach((sg, s) => sg.tiers.forEach((t, n) => { t.hg.rotation.z = SPIN[s] * 2 * Math.PI * (TIERS_SPEC[n].freq / 3600 / FPP) * effE(s, fF); }));
    three.jobs.forEach((G, s) => {
        const J = jobs[s], h = headOf(s, fF);
        G.head.visible = !!h;
        if (h) { G.head.position.copy(h); G.head.scale.setScalar(Math.max(2.4, tierDisp(s, tierOf(J)).D * 0.035)); heads.push(h); }
        const pts = trails[s].slice(-TRAIL_MAX + 1).map(v => dispAngle(s, v.n, thetaOfFrame(v.F)));
        if (h && J.st === 'running') pts.push(h);
        G.trail.visible = state.trails && pts.length > 1;
        if (G.trail.visible) setLine(G.trail, pts);
        G.marks.forEach((m, j) => {
            const c = checkpoints[s][j];
            m.visible = state.trails && !!c;
            if (c) { m.position.copy(dispAngle(s, c.n, thetaOfFrame(c.F))); m.scale.setScalar(Math.max(2, tierDisp(s, c.n).D * 0.04)); }
        });
        const byAddr = new Map(memory.map(w => [w.addr, w]));
        for (let a = 0; a < 30; a++) {
            const w = byAddr.get(a), o = G.outer[a], inn = G.inner[a];
            o.visible = inn.visible = state.memory && !!w;
            if (!w) continue;
            const bad = !parityOk(w);
            o.position.copy(dispPoint(s, 4, a, 0, 2.2)); o.scale.setScalar(beadSize(s, 4));
            o.material.opacity = memErased.has(`${a}:${s}`) ? 0.25 : 1; o.material.color.setHex(bad && locate(w) === s ? 0xf87171 : CLASS_HEX[s]);
            inn.position.copy(dispPoint(s, 0, a, 0, 2.2)); inn.scale.setScalar(beadSize(s, 0));
            inn.material.opacity = memErased.has(`${a}:3`) ? 0.25 : 1; inn.material.color.setHex(bad && locate(w) === 3 ? 0xf87171 : 0xf5c542);
        }
    });
    three.sync.visible = jobs.some(J => J.st === 'running') && heads.length >= 2;
    if (three.sync.visible) setLine(three.sync, [...heads, heads[0]]);
    // the triangle at the zero point, its exact closure and the inferred fourth sliding into the core over one wheel turn
    const w = latest, show = !!w && jobs.every(J => J.st === 'done');
    three.tri.visible = three.p4.visible = three.p4s.visible = show;
    const core = w ? gaugeDisplay(gaugeNorm(w)) : [0, 0, 0];
    three.soliton.position.lerp(new THREE.Vector3(core[0] * 4, core[1] * 4, core[2] * 4), 0.12);
    three.soliton.material.opacity = w ? 1 : 0.45;
    if (show) {
        const P = [0, 1, 2].map(s => dispPoint(s, 0, w.kPair, w.dphi[s], 1.12, toNum(fracPart(w.turns[s]))));
        setLine(three.tri, [P[0], P[1], P[2], P[0]]);
        three.tri.material.opacity = w.T.lock ? 0.5 : 0.95;
        const u = P[1].clone().sub(P[0]), v = P[2].clone().sub(P[0]);
        const latch = Math.min(1, Math.max(0, (fF - w.F) / (29 * FPP)));
        three.p4.position.copy(P[0].clone().add(u.clone().add(v).multiplyScalar(w.T.qScale)).lerp(three.soliton.position, ease(latch))); three.p4.scale.setScalar(5);
        three.p4s.position.copy(P[1].clone().add(P[2]).sub(P[0])); three.p4s.scale.setScalar(2.2);
    }
    const o = three.orbit;
    three.camera.position.setFromSphericalCoords(o.radius, o.phi, o.theta);
    three.camera.lookAt(0, 0, 0);
    three.renderer.render(three.scene, three.camera);
}
''')

# ---------------------------------------------------------------- crystal progress and readouts
cut('// Largest pairwise difference', 'function updateCrystal(frameF, tI) {', r'''// Largest pairwise difference (in turns, wrapped to ±½) of the spins the results carry: live while held, else the newest word's
function shearOf(fF) {
    const t = jobs.some(J => J.st === 'held') ? jobs.map((J, s) => (J.st === 'held' ? SPIN[s] * effCarry(s, fF) / 450 : 0))
            : latest ? latest.turns.map(x => toNum(fracPart(x))) : [0, 0, 0];
    let m = 0;
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) { const d = t[a] - t[b]; m = Math.max(m, Math.abs(d - Math.round(d))); }
    return m;
}
function progressOf(s, fF) {
    const J = jobs[s];
    if (J.st === 'running') return Math.min(1, (J.i + (J.pkt ? Math.min(12, Math.max(0, fF - J.pkt.on)) / 12 : 0)) / J.L);
    return J.st === 'held' || J.st === 'done' ? 1 : 0;
}
''')
rep("    const Bs = crystal.basis, K = crystalCarrier(), pf = Math.max(0, tI * 60), sol = solStateOf();",
    "    const Bs = crystal.basis, K = crystalCarrier(), pf = Math.max(0, tI * 720), sol = solStateOf();")
cut('function updateReadouts(frameF) {', '// Orthogonal scope:', r'''function updateReadouts(fF) {
    const F = Math.floor(fF), k = F % 8;
    $('#sol-step').innerHTML = `step k = ${k || 8} · ${ZP_STAGES[k][0]} · spinor ${SPINOR_TXT[k]}${k === 2 || k === 6 ? ` · ${k === 2 ? 'onload' : 'offload'} of branch ${F % 3}` : ''}`;
    $('#step-count').textContent = String(F % 720).padStart(3, '0');
    $('#progress-fill').style.width = ((fF % 720) / 720 * 100).toFixed(2) + '%';
    const sol = solStateOf(), st = $('#sol-state');
    const busy = jobs.map(J => (J.st === 'running' ? `${CALC[J.s]} T${tierOf(J)} ${J.i}/${J.L}` : J.st === 'queued' ? `${CALC[J.s]} queued` : J.st === 'held' ? `${CALC[J.s]} held` : null)).filter(Boolean).join(' · ');
    st.className = sol === 'fail' ? 'sol-active' : sol === 'lock' || sol === 'conv' ? 'sol-locked' : 'sol-tol';
    st.textContent = { fail: 'PARITY FAIL · memory altered', busy: `COMPUTING · ${busy}`, hold: `HOLDING · ${busy}`,
                       pend: `HOLDING · they pair at the zero point in ${framesTo(lastFrame, 0, 24)} frames`, shear: 'PAIRED · A = B = C, but sheared by free-run spin',
                       lock: 'PAIRED · LOCK: A = B = C', conv: `PAIRED · Y = A + B + C${latest && latest.T.lock ? ' · lock within 2⁻²⁴' : ''}`, idle: 'IDLE · run three calculations' }[sol];
}
''')

# ---------------------------------------------------------------- self-test
rep("""    ok = true;
    for (let i = 0; i < 30 && ok; i++) { const p0 = 30 * Math.floor(rnd() * 1000), land = p0 + 149; ok = land % 30 === 29 && Math.floor((land - p0) / 30) === 4 && [0, 1, 2, 3, 4].every(S => (p0 + 30 * S) % 30 === 0); }
    check('V7', ok, '30 random gates: a job entering at node 0 spends one wheel turn per tier and lands on T0 at node 29');
    const regs = [];
    for (let h = 1; h <= 300; h++) { const t = [0, 1, 2].map(s => fracPart(carriedTurns(s, h))); if (t.every(x => x.eq(t[0]))) regs.push(h); }
    check('V8', regs.join() === '75,150,225,300', `counter-rotating T0 helices that turn the same number of pulses re-register only every 75 pulses (${regs.join(', ')}): a free-running wait shears the results`);""",
r"""    const regs = [];
    for (let h = 1; h <= 900; h++) { const t = [0, 1, 2].map(s => fracPart(carriedTurns(s, h))); if (t.every(x => x.eq(t[0]))) regs.push(h); }
    check('V8', regs.join() === '225,450,675,900', `counter-rotating T0 helices that turn the same number of frames re-register only every 225 frames (${regs.join(', ')}): a free-running wait shears the results`);
    const Z = ZP_STATIC;
    check('Z1', Z.p22 && Z.p23, '(1+i)^4 = −4, (1+i)^8 = 16 with two-signed-bit states; conjugation by (1+i)^k is Rot_x(90k°): steps 2 and 6 the same half-turn with spinors ±i, step 4 the identity on the −1 sheet (Props 2.2, 2.3)');
    check('Z2', Z.tet && Z.nullc && Z.rank5 && Z.sigmaBranch && [0, 1, 2].every(j => branchPass(j).ok), 'the a = 0 tetrahedron: six quadrances 8; null lifts with −2⟨X(x),X(y)⟩ = |x − y|²; five null vectors span R⁵; each branch survives lift, ghost map and fold exactly (Props 3.1–3.3)');
    check('Z3', Z.p37 && Z.p71 && Z.p82, 'Z/24 ≅ Z/8 × Z/3; onloads 2, 10, 18 on branches 2, 1, 0, offloads 12 frames later; six handshakes = C₃ × C₂; spreads 1/2, 1, 1/2, 0, … (Props 3.7, 7.1, 8.2)');
    {   // Proposition 3.9 in full, non-commutative generality: 720 random exact rational frame states
        const rq = () => cayleyMap(F(Math.floor((rnd() - 0.5) * 18), 1 + Math.floor(rnd() * 9)), F(Math.floor((rnd() - 0.5) * 18), 1 + Math.floor(rnd() * 9)), F(Math.floor((rnd() - 0.5) * 18), 1 + Math.floor(rnd() * 9)));
        const q = Array.from({ length: 720 }, rq), dq = q.map((x, n) => qmul(x, qinv(q[n === 0 ? 0 : n - 1])));
        let P = Q_ONE; for (let n = 1; n < 720; n++) P = qmul(dq[n], P);
        const tele = qeq(P, qmul(q[719], qinv(q[0])));
        const dQ = Array.from({ length: 72 }, (_, m) => { let B = Q_ONE; for (let i = 0; i < 10; i++) B = qmul(dq[10 * m + i], B); return B; }), delta = dQ.map(qinv);
        const Q10 = delta.reduce((A, x) => qmul(A, x), Q_ONE);
        const Q8 = Array.from({ length: 10 }, (_, l) => delta.filter((_, m) => Math.floor(10 * m / 72) === l).reduce((A, x) => qmul(A, x), Q_ONE)).reduce((A, x) => qmul(A, x), Q_ONE);
        const Pinv = qinv(P), H = qprod(Q8, Q10, P), Pfull = dq.reduce((A, x) => qmul(x, A), Q_ONE);
        check('Z4', tele && qeq(Q10, qinv(qmul(q[719], qinv(q[0])))) && qeq(Q8, Q10) && qeq(H, qinv(qmul(q[719], qinv(q[0])))) && qeq(Pfull, P) && qeq(Pinv, qinv(P)),
              '720 random exact rational frame states: P = Δq₇₁₉⋯Δq₁ = q₇₁₉q₀⁻¹, Q⁽¹⁰⁾ = Q⁽⁸⁾ = P⁻¹ over the 72 and 10 blocks, H = Q⁽⁸⁾Q⁽¹⁰⁾P = P⁻¹ (Prop 3.9)');
        const cyc = qprod(...q.map((x, n) => qmul(x, qinv(q[(n + 719) % 720]))).reverse());
        check('Z5', qeq(cyc, Q_ONE) && !qeq(P, Q_ONE), 'the cyclic convention Δq₀ = q₀q₇₁₉⁻¹ gives product 1 for the same random history whose open product P ≠ 1 (Prop 3.13)');
    }
    {   // the four tracks over 7200 frames: A within tolerance of B, R agreeing with B
        let a = [1, 0], worst = 0, R = 1, rOk = true;
        for (let Fq = 1; Fq <= 7200; Fq++) {
            a = [Math.SQRT1_2 * (a[0] - a[1]), Math.SQRT1_2 * (a[0] + a[1])];
            const [x, y] = redState(Fq).map(Number), nb = Math.hypot(x, y); worst = Math.max(worst, Math.hypot(a[0] - x / nb, a[1] - y / nb));
            R = (R * 388) % 881; rOk = rOk && R === (powmod(2, Math.floor(Fq / 2), 881) * ((((x % 881) + 881) % 881 + 387 * (((y % 881) + 881) % 881)) % 881)) % 881;
        }
        check('Z6', worst < 1e-9 && rOk && Z.res881, `ten registers (7200 frames): floating-point track A stays within ${worst.toExponential(1)} of exact track B; residues mod 881 agree with B at every frame (§8.10)`);
    }""")
rep("    log('──── Self-test: exact calculator, triple quad, gauge, quadrance-out, chain, clock and clutch ────', 'hd');",
    "    log('──── Self-test: exact calculator, triple quad, gauge, quadrance-out, chain, clutch and the zero-point cycle ────', 'hd');")

# ---------------------------------------------------------------- controls
rep("    $('#btn-play').onclick = () => setPlaying(!state.playing);",
    """    $('#btn-play').onclick = () => setPlaying(!state.playing);
    const stepTo = target => { setPlaying(false); sim.t = sim.prevT = (target + 0.5) / 720; };
    $('#btn-step').onclick = () => stepTo(lastFrame + 1);
    $('#btn-zero').onclick = () => stepTo(lastFrame + framesTo(lastFrame, 0, 24));""")
rep("    const sp = $('#speed'); sp.oninput = () => { state.speed = 10 ** parseFloat(sp.value); $('#speed-v').textContent = state.speed.toFixed(state.speed < 1 ? 2 : 1) + '×'; };",
    "    const sp = $('#speed'); sp.oninput = () => { state.speed = 10 ** parseFloat(sp.value); $('#speed-v').textContent = state.speed.toFixed(state.speed < 1 ? 2 : 1) + '×'; $('#fps-v').textContent = `${fmt(720 * RATE * state.speed, 3)} frames/s`; };")
rep("""        log(`[⊥] clutch: ${{ hold: 'hold finished engines (a latched engine stops turning until the others land)', free: 'free-run (every engine turns on every pulse)', membrane: 'free-run + membrane (shear removed at the step-6 window)' }[state.clutch]}`, 'hd');""",
    """        log(`[⊥] clutch: ${{ hold: 'hold finished engines (a latched engine stops turning until the others land)', free: 'free-run (every engine turns on every frame)', membrane: 'free-run + membrane (shear removed at the zero point)' }[state.clutch]}`, 'hd');""")

# ---------------------------------------------------------------- main loop
cut(BAR + '// Main loop: fixed 1/60 s', '/*__P2:boot__*/', r'''// =====================================================================
// Main loop: fixed 1/60 s physics step; every frame is processed in order, so no zero-point step is ever skipped
// =====================================================================
let acc = 0, lastWall = performance.now();
function frame(now) {
    const dtWall = Math.min(0.25, (now - lastWall) / 1000); lastWall = now;
    if (state.playing) { acc += dtWall; while (acc >= DT) { physicsStep(DT); acc -= DT; } }
    else sim.prevT = sim.t;
    const alpha = state.playing ? acc / DT : 1, F = frameOfT(sim.t);
    if (F !== lastFrame) {
        for (let x = lastFrame + 1; x <= F; x++) { lastFrame = x; processFrame(x); }
        drawClockPumpCanvas($('#gears'), F % 720, state.eta, (F % 8) || 8);
        renderAll(false); renderZP();
    }
    const tInterp = sim.prevT + (sim.t - sim.prevT) * alpha, fF = Math.max(0, tInterp * 720);
    updateScene(alpha, tInterp);
    updateCrystal(fF % 720, tInterp);
    updateReadouts(fF);
    drawClutchGears(fF, fF % 720);
    drawZpDial(fF);
    requestAnimationFrame(frame);
}
function start() {
    wireControls();
    initThree();
    initCrystal();
    log('[ZP] the zero-point cycle at frame resolution: k = F mod 8, j = F mod 3, n = F mod 24; 90 spinor cycles and 30 joint cycles per 720-frame register. Each engine is a branch: one instruction per joint cycle, onload at k = 2, offload at k = 6. The clock starts paused; Run starts it.', 'hd');
    drawClockPumpCanvas($('#gears'), 0, state.eta, 8);
    $('#scale-note').textContent = 'log radii: display = 6 + 20·log10(r / r_s); engines turned by σˢ about (1,1,1)';
    renderAll(true); renderZP();
    requestAnimationFrame(frame);
    setTimeout(runSelfTest, 400);
}
''')
assert 'processPulse' not in s and 'lastPulse' not in s and 'STAGE_NAMES' not in s, [w for w in ('processPulse', 'lastPulse', 'STAGE_NAMES') if w in s]
open(D + 'page4.html', 'w').write(s)
print('page4 written', len(s))
