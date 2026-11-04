// Engram Mind's Eye, the 3D page. Everything it shows is computed by EngramCore (engram_core.js): the Live session
// (checked against the reference Session by tests/page-engine.cjs), the memory tree in H^3, the watch layer, frames,
// the twin system and the LATTICE-SEED/1 import (tests/page3d-engine.cjs). This file only draws and asks.
(function () {
'use strict';
const EC = window.EngramCore, LIB = window.StrixLibraryV1, LS = window.LatticeSeedV1, C = window.HPCore, T3 = window.HPTwin3D, Fz = window.HPFence;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
if (!EC || !LIB || !LS || !C || !T3 || !Fz) { document.querySelector('.board').innerHTML = '<section class="panel">One of the page&rsquo;s modules did not load.</section>'; return; }
const KEY = 'engram-minds-eye/session/1';
const SRC = { human: '#f8fafc', strix: '#e879f9', biochain: '#2dd4bf', stream: '#fbbf24', unknown: '#94a3b8' }, AX = ['#fca5a5', '#86efac', '#93c5fd'], CELL = ['α', 'β', 'γ'], GEN = ['i', 'I', 'j', 'J', 'k', 'K'];
const MT = EC.membraneTurn(), TURNS = [MT, MT, MT], ARM = 0.6;

let live, replies = [], regs = [], control = null, tfMirror = null, tfSame = null;
const st = { F: 0, target: 0, playing: true, speed: 48, replayFrom: 0, reg: 0, regFollow: true, sel: null, mode: 'dialogue', seed: null, seedPage: 0,
    yaw: 0.6, pitch: 0.35, zoom: 1, dirty: true, watch: new Map(), moved: new Map(), guard: new Map(), guardSeed: 9100, moveSeed: 9100, proj: [] };
const frames = new Map();

// ------------------------------------------------------------------ the session (shared with the 2D page)
const colorOf = s => SRC[s] || '#94a3b8', who = s => (s === 'human' ? 'you' : s === 'strix' ? 'STRIX' : s);
const turnText = tu => (typeof tu.text === 'string' ? tu.text : (tu.tokens || tu.labels || []).join(' '));
function loadSaved() {                         // v2 keeps every turn (imports included); v1 kept your words
    try {
        const s = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (s && s.version === 2 && Array.isArray(s.turns) && s.turns.length) return { turns: s.turns };
        if (s && Array.isArray(s.humans)) return { humans: s.humans.filter(x => typeof x === 'string') };
    } catch (e) { /* storage unavailable or unreadable */ }
    return { humans: [] };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify({ version: 2, turns: EC.turnsOf(live) })); $('save-note').textContent = 'Kept in this browser only, and shared with the 2D page.'; } catch (e) { $('save-note').textContent = 'This browser is not keeping the dialogue (storage unavailable).'; } }
const endFrame = () => Math.max(live.words.length ? live.words[live.words.length - 1].F : 0, live.last);
function start(saved) {
    if (saved.turns) { const r = EC.replayTurns(LIB, saved.turns); live = r.live; replies = r.replies; }
    else { live = new EC.Live(); replies = [null]; live.addTurn('strix', LIB.intro); for (const h of saved.humans) { const r = live.respond(LIB, h); replies.push(null, r.reply); } }
    afterTurn(); st.F = st.target = endFrame();
    renderMessages(); onFrame(true);
}
function send(text) {
    text = text.trim(); if (!text) return;
    const before = live.chain.packets.length, r = live.respond(LIB, text);
    replies.push(null, r.reply); save();
    afterTurn(); st.replayFrom = Math.max(0, live.sched[before].on - 1); st.target = endFrame(); st.playing = true; $('b-play').textContent = 'Pause';
    if (st.mode !== 'dialogue') setMode('dialogue');
    st.regFollow = true; renderMessages(); onFrame(true);
}
function afterTurn() {
    regs = live.registers(); control = null; tfSame = null; tfMirror = EC.twinFrames(live, true);
    for (const k of [...st.watch.keys()]) if (k.startsWith('d:')) { const r = +k.slice(2); if (!(regs[r] && regs[r].complete)) st.watch.delete(k); }
    if ($('t-same').checked) buildControl();
}
function buildControl() {
    control = new EC.Live({ coupler: 'same' });
    for (const t of live.turns) control.addTokens(t.source, t.tokens);
    tfSame = EC.twinFrames(live, false);
}

// ------------------------------------------------------------------ what is shown
const viewKey = () => (st.mode === 'seed' ? `s:${st.seedPage}` : `d:${st.reg}`);
function nodesNow() {
    if (st.mode === 'seed') return EC.seedNodes(st.seed, st.seedPage);
    return EC.memoryNodes(live, st.reg).filter(n => n.depth < 3 || live.sched[n.t].off <= st.F);
}
function wordAtNode(n) {                                       // the memory word of a zero-point node, if written by now
    if (st.mode !== 'dialogue' || n.depth !== 2) return null;
    const Fw = 24 * (30 * st.reg + 5 * n.s + n.c + 1), w = live.words[(Fw - 48) / 24];
    return w && w.F === Fw && Fw <= st.F ? w : null;
}
const movedNow = () => st.moved.get(viewKey()) || new Map();
const latchedCount = F => { let k = 0; while (k < live.sched.length && live.sched[k].off <= F) k++; return k; };
function quatOf(n) { return st.mode === 'seed' ? st.seed.nodes[n.k].quat : live.quats[n.t]; }
function frameMatrix(n) { const id = (st.mode === 'seed' ? 's' : 'd') + (st.mode === 'seed' ? n.k : n.t); if (!frames.has(id)) frames.set(id, EC.frameOf(quatOf(n))); return frames.get(id); }
function runWatch() {
    const t0 = performance.now(), res = EC.watchMemory(nodesNow(), movedNow());
    res.nodes = nodesNow(); res.ms = performance.now() - t0; res.F = st.F;
    st.watch.set(viewKey(), res); st.dirty = true; renderWatch(); renderChips();
}
function runWatchOn(r) {                                       // a closed register of the dialogue, whichever is in view
    const t0 = performance.now(), nodes = EC.memoryNodes(live, r), res = EC.watchMemory(nodes, st.moved.get(`d:${r}`) || new Map());
    res.nodes = nodes; res.ms = performance.now() - t0; res.F = st.F;
    st.watch.set(`d:${r}`, res);
}

// ------------------------------------------------------------------ the frame loop
let lastTs = null, lastInt = -1, dragging = false;
function tick(ts) {
    const dt = lastTs === null ? 0 : Math.min(0.1, (ts - lastTs) / 1000); lastTs = ts;
    const moving = st.mode === 'dialogue' && st.playing && st.F < st.target;
    if (moving) st.F = Math.min(st.target, st.F + st.speed * dt);
    if (Math.floor(st.F) !== lastInt) onFrame(false);
    if ($('v-spin').checked && !dragging) { st.yaw += dt * 0.12; st.dirty = true; }
    if (st.dirty || moving || (st.mode === 'seed' && st.env && $('v-breath').checked)) { drawView(); drawTwin(); st.dirty = false; }
    requestAnimationFrame(tick);
}
function onFrame(force) {
    const F = st.F; lastInt = Math.floor(F);
    if (st.mode === 'dialogue') {
        if (st.regFollow) st.reg = Math.min(EC.place(Math.max(1, lastInt))[0], regs.length ? regs[regs.length - 1].r : 0);
        for (const R of regs) if (R.complete && F >= 720 * (R.r + 1) && !st.watch.has(`d:${R.r}`)) runWatchOn(R.r);   // the fence screens each register as it closes
        if (st.sel === null || st.sel.follow) { const t = Math.max(0, latchedCount(F) - 1); st.sel = { kind: 'cell', t, follow: true }; }
    }
    renderPick(); renderRead(); renderSel(); renderWatch(); renderTwinRead(); renderChips();
    st.dirty = true;
}

// ------------------------------------------------------------------ the view
function fit(cv, ratio) {
    const w = Math.max(200, cv.clientWidth || cv.parentElement.clientWidth), h = Math.round(w * ratio), d = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); cv.style.height = h + 'px'; }
    const ctx = cv.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
}
const rot = p => { const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const x = cy * p[0] + sy * p[1], y1 = -sy * p[0] + cy * p[1]; return [x, cp * p[2] - sp * y1, sp * p[2] + cp * y1]; };
const geodesic = (a, b, n) => {                                  // points along the H^3 geodesic from a to b (hyperboloid floats)
    const d = C.H.dist(a, b); if (d < 1e-9) return [a, b];
    return Array.from({ length: n + 1 }, (_, k) => { const s = k / n, u = Math.sinh((1 - s) * d) / Math.sinh(d), v = Math.sinh(s * d) / Math.sinh(d); return a.map((x, i) => u * x + v * b[i]); });
};
function camera(w, h) {
    const watch = st.watch.get(viewKey()), shells = $('v-shells').checked && watch, c = shells ? watch.centre : null;
    const envBreath = st.mode === 'seed' && st.env && $('v-breath').checked, envF = envBreath ? 1 + Math.floor(performance.now() / 1000 * 48) % st.env.pump.frames : 0;
    const b = st.mode === 'dialogue' && $('v-breath').checked ? EC.breathOf(st.F) : envBreath ? EC.breathOf(envF, st.env.pump.breath, st.env.pump.frames) : 1;
    const phase = st.mode === 'dialogue' ? ((Math.max(1, st.F) - 1) % 720) / 720 : envBreath ? (envF - 1) / st.env.pump.frames : 0;
    const tors = $('v-breath').checked ? +$('v-tors').value : 0, ball = $('v-mode').value === 'ball';
    const nodes = nodesNow(), moved = movedNow();
    const ptOf = n => EC.point3(moved.has(n.key) ? n.word.concat(moved.get(n.key)) : n.word);
    const rec = y => (c ? Fz.recentre(c, [y])[0] : y);
    let maxD = 1e-9;
    for (const n of nodes) maxD = Math.max(maxD, Math.acosh(Math.max(1, rec(ptOf(n))[0])));
    for (const n of EC.LAYOUT) if (n.depth === 3) { maxD = Math.max(maxD, Math.acosh(Math.max(1, rec(EC.point3(n.word))[0]))); break; }
    if (shells) maxD = Math.max(maxD, watch.shells.rG);
    maxD *= 1.04 * ($('v-breath').checked ? (st.mode === 'dialogue' ? 1.5 : envBreath ? 1 + st.env.pump.breath : 1) : 1);
    const R0 = (Math.min(w, h) / 2 - 16) * st.zoom, cx = w / 2, cy = h / 2;
    const map = d => (ball ? Math.tanh(d * b / 2) : d * b / maxD);
    const P = y => {                                           // hyperboloid point -> [screen x, screen y, depth, scale]
        const z = rec(y), d = Math.acosh(Math.max(1, z[0])), v = z.slice(1), nv = Math.hypot(...v) || 1, r = map(d);
        let p = v.map(x => (x / nv) * r);
        if (tors) { const a = phase * 2 * Math.PI * tors * (0.25 + Math.max(0, 1 - d / (maxD / 1.04))), ca = Math.cos(a), sa = Math.sin(a); p = [p[0] * ca - p[1] * sa, p[0] * sa + p[1] * ca, p[2]]; }
        const q = rot(p), s = 1 / (1 - 0.18 * q[2]);
        return [cx + R0 * q[0] * s, cy - R0 * q[1] * s, q[2], s];
    };
    return { P, map, ptOf, nodes, moved, watch, shells, R0, cx, cy, b, ball, maxD };
}
function drawView() {
    const { ctx, w, h } = fit($('cv-view'), $('cv-view').clientWidth < 560 ? 1 : 0.74), cam = camera(w, h), { P, map, ptOf, nodes, moved, watch, shells, R0, cx, cy } = cam;
    const byKey = new Map(nodes.map(n => [n.key, n])), flagged = new Map(watch ? watch.flags.map(f => [f.key, f]) : []);
    const parent = k => (k === 'r' ? null : k.includes(',') ? k.slice(0, k.lastIndexOf(',')) : 'r');
    if (cam.ball) { ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, 2 * Math.PI); ctx.stroke(); }
    const shellList = shells ? [[watch.shells.d1, '#3b6b9a', 'Q1'], [watch.shells.d3, '#38bdf8', 'Q3'], [watch.shells.rF, '#fbbf24', 'outside fence'], [watch.shells.rG, '#fb7185', 'far-out fence']] : [];
    const shell = ([d, col, label], front) => {
        const rr = map(d);
        if (!front) { const R = R0 * rr, g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R); g.addColorStop(0, col + '00'); g.addColorStop(0.85, col + '14'); g.addColorStop(1, col + '33'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill(); }
        ctx.strokeStyle = col; ctx.lineWidth = front ? 1.1 : 0.7; ctx.globalAlpha = front ? 0.6 : 0.25;
        for (const plane of [0, 1, 2]) {
            ctx.beginPath(); let on = false;
            for (let k = 0; k <= 72; k++) {
                const t = 2 * Math.PI * k / 72, v = plane === 0 ? [Math.cos(t), Math.sin(t), 0] : plane === 1 ? [Math.cos(t), 0, Math.sin(t)] : [0, Math.cos(t), Math.sin(t)];
                const q = rot(v.map(x => x * rr)), s = 1 / (1 - 0.18 * q[2]), X = cx + R0 * q[0] * s, Y = cy - R0 * q[1] * s, vis = front ? q[2] >= 0 : q[2] < 0;
                if (vis) { on ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); on = true; } else on = false;
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (front) {                                            // each shell's label at its own angle on its rim
            const a = { Q1: -2.4, Q3: -2.0, 'outside fence': -0.75, 'far-out fence': -0.25 }[label], X = cx + R0 * rr * Math.cos(a), Y = cy + R0 * rr * Math.sin(a), left = Math.cos(a) < 0;
            ctx.font = '10px "Fira Code", monospace'; const tw = ctx.measureText(label).width;
            ctx.fillStyle = 'rgba(2,6,23,.8)'; ctx.fillRect(left ? X - tw - 10 : X + 4, Y - 9, tw + 6, 12); ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText(label, left ? X - tw - 7 : X + 7, Y);
        }
    };
    shellList.forEach(s => shell(s, false));
    // the tree: geodesic edges from each memory to its parent
    if ($('v-edges').checked) for (const n of nodes) {
        const pk = parent(n.key); if (pk === null || !byKey.has(pk)) continue;
        const pts = geodesic(ptOf(byKey.get(pk)), ptOf(n), n.depth === 3 ? 6 : 10).map(P), mv = moved.has(n.key);
        ctx.strokeStyle = mv ? '#fb7185' : n.depth === 3 ? '#1f3b4d' : '#2b4b5c'; ctx.lineWidth = mv ? 1.4 : 1; ctx.setLineDash(mv ? [4, 3] : []);
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
    }
    // a lattice seed's chains, node to node along geodesics
    if (st.mode === 'seed') {
        const keyOfI = new Map(st.seed.nodes.map(sn => { const p = EC.seedPosition(sn.k); return [sn.i, p.page === st.seedPage ? p.key : null]; }));
        st.seed.chains.forEach((c, ci) => {
            ctx.strokeStyle = ['#2dd4bf', '#f59e0b', '#a78bfa', '#38bdf8', '#f472b6', '#84cc16'][ci % 6]; ctx.lineWidth = 1.3; ctx.globalAlpha = 0.7;
            for (let k = 1; k < c.nodes.length; k++) {
                const a = byKey.get(keyOfI.get(c.nodes[k - 1])), b = byKey.get(keyOfI.get(c.nodes[k]));
                if (!a || !b) continue;
                const pts = geodesic(ptOf(a), ptOf(b), 8).map(P);
                ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
            }
            ctx.globalAlpha = 1;
        });
    }
    // the guard's named pair
    const g = st.guard.get(viewKey());
    if (g && g.keys) {
        const [a, b] = g.keys.map(k => byKey.get(k)), pts = geodesic(ptOf(a), ptOf(b), 16).map(P);
        ctx.strokeStyle = g.hit ? '#fbbf24' : '#fb7185'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
    }
    // memories, back to front, cells with their frames
    st.proj = [];
    const items = nodes.map(n => { const y = ptOf(n), p = P(y); return { n, y, p }; }).sort((a, b) => a.p[2] - b.p[2]);
    const sheared = crystalSheared(watch);
    let drewCore = false;
    const core = () => { drawCrystal(ctx, cam, sheared); drewCore = true; };
    for (const { n, y, p } of items) {
        if (!drewCore && p[2] >= 0) core();
        const [x, yy, z, s] = p, fade = z < 0 ? 0.55 + 0.45 * (1 + z) : 1;
        ctx.globalAlpha = fade;
        if (n.depth === 3 && $('v-frames').checked) {
            const R = frameMatrix(n), Lb = C.H.boost(y);
            for (let a = 0; a < 3; a++) { const u = [R[0][a], R[1][a], R[2][a]], e = P(C.H.matvec(Lb, [Math.cosh(ARM), ...u.map(v => Math.sinh(ARM) * v)])); ctx.strokeStyle = AX[a]; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(e[0], e[1]); ctx.stroke(); }
        }
        let col, rad;
        if (n.depth === 0) { col = '#64748b'; rad = 4; }
        else if (n.depth === 1) { col = '#475569'; rad = 3.5; }
        else if (n.depth === 2) { const wd = wordAtNode(n); col = st.mode === 'seed' ? '#334155' : wd ? '#f5c542' : null; rad = 4.2; }
        else if (st.mode === 'seed') { const sn = st.seed.nodes[n.k]; col = sn.parityOk ? (sn.raw ? '#2dd4bf' : '#a78bfa') : '#fb7185'; rad = 4; }
        else { col = colorOf(live.chain.packets[n.t].source); rad = 4; }
        rad *= s;
        ctx.beginPath(); ctx.arc(x, yy, rad, 0, 2 * Math.PI);
        if (col) { ctx.fillStyle = col; ctx.fill(); } else { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1; ctx.stroke(); }
        const f = flagged.get(n.key);
        if (f) { ctx.strokeStyle = f.misplaced ? '#fb7185' : '#fbbf24'; ctx.lineWidth = 1.6; ctx.setLineDash(f.cleared ? [2, 2] : []); ctx.beginPath(); ctx.arc(x, yy, rad + 4, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]); }
        if (n.depth === 1) { ctx.fillStyle = '#94a3b8'; ctx.font = '10px "Fira Code", monospace'; ctx.fillText(`s${n.s}`, x + 6, yy - 6); }
        if (st.mode === 'seed' && st.env && n.depth === 3 && st.env.frontier.includes(st.seed.nodes[n.k].i)) { ctx.strokeStyle = '#2dd4bf'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, yy, rad + 3, 0, 2 * Math.PI); ctx.stroke(); }
        if (isSelected(n)) { ctx.strokeStyle = '#e879f9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, yy, rad + 7, 0, 2 * Math.PI); ctx.stroke(); }
        ctx.globalAlpha = 1;
        st.proj.push([x, yy, n]);
    }
    if (!drewCore) core();
    shellList.forEach(s => shell(s, true));
    ctx.fillStyle = '#64748b'; ctx.font = '11px "Fira Code", monospace'; ctx.textAlign = 'left';
    const what = st.mode === 'seed' ? `lattice seed, page ${st.seedPage}` : `register ${st.reg}`;
    ctx.fillText(`${what} · ${cam.ball ? 'Poincaré ball' : 'radius = hyperbolic distance'} · from ${shells ? 'the fence centre' : 'the register'}${cam.b !== 1 ? ` · breath ${cam.b.toFixed(3)}` : ''}`, 10, h - 10);
}
function isSelected(n) {
    const s = st.sel; if (!s) return false;
    if (st.mode === 'seed') return s.kind === 'seed' && n.depth === 3 && n.k === s.k;
    if (s.kind === 'cell') return n.depth === 3 && n.t === s.t;
    return s.kind === 'node' && s.key === n.key;
}
function crystalSheared(watch) {
    const broken = $('t-same').checked && control && control.couplerLog.some(e => e.F <= st.F && !e.ok);
    const misplaced = watch && watch.flags.some(f => f.misplaced && !f.cleared);
    return broken ? 'the binding moved' : misplaced ? 'a memory is not where its record says' : null;
}
function drawCrystal(ctx, cam, sheared) {
    // the soliton crystal at the core: an octahedron along the six section directions, displaced by the selected
    // word's lean (X, Y) as on the 2D page, sheared when the binding moves or a misplaced memory is confirmed
    let dx = 0, dy = 0, lock = true;
    if (st.mode === 'dialogue' && st.sel && st.sel.kind === 'cell') {
        const g = live.gauges[st.sel.t], k = Math.max(1, g.s.toNumber() / 3);
        dx = Math.max(-1, Math.min(1, g.X.toNumber() / k)); dy = Math.max(-1, Math.min(1, g.Yc.toNumber() * Math.sqrt(3) / 2 / k)); lock = g.X.isZero() && g.Yc.isZero();
    }
    const size = 0.07, off = [dx * 0.08, dy * 0.08, 0], V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(v => {
        let p = v.map((x, i) => x * size + off[i]);
        if (sheared) p = [p[0] + 0.6 * p[1], p[1], p[2]];
        const q = rot(p), s = 1 / (1 - 0.18 * q[2]); return [cam.cx + cam.R0 * q[0] * s, cam.cy - cam.R0 * q[1] * s];
    });
    const col = sheared ? '#fb7185' : lock ? '#f5c542' : '#22d3ee';
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.fillStyle = col + '22';
    const E = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [2, 5], [3, 4], [3, 5]];
    ctx.beginPath(); E.forEach(([a, b]) => { ctx.moveTo(...V[a]); ctx.lineTo(...V[b]); }); ctx.stroke();
}

// ------------------------------------------------------------------ the twin system
function drawTriad(cv, q, label) {
    const { ctx, w, h } = fit(cv, 0.8), cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.36, M = T3.rotOfQuat(q);
    ctx.strokeStyle = '#1e293b'; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, 2 * Math.PI); ctx.stroke();
    const arms = [0, 1, 2].map(a => { const v = rot([M[0][a], M[1][a], M[2][a]]); return [a, v]; }).sort((x, y) => x[1][2] - y[1][2]);
    for (const [a, v] of arms) { ctx.strokeStyle = AX[a]; ctx.globalAlpha = v[2] < 0 ? 0.5 : 1; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * v[0], cy - R * v[1]); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#94a3b8'; ctx.font = '10px "Fira Code", monospace'; ctx.textAlign = 'left'; ctx.fillText(label, 6, h - 6);
}
function drawTwin() {
    if (st.mode !== 'dialogue') return;
    const k = latchedCount(st.F) - 1, tf = $('t-same').checked && tfSame ? tfSame : tfMirror, q = k >= 0 ? tf[k] : [[1, 0, 0, 0], [1, 0, 0, 0]];
    const ang = x => (2 * Math.acos(Math.min(1, Math.abs(x[0]))) * 180 / Math.PI).toFixed(1) + '°';
    drawTriad($('cv-q1'), q[0], `turned ${ang(q[0])}`); drawTriad($('cv-q2'), q[1], `turned ${ang(q[1])}`);
}
function renderTwinRead() {
    if (st.mode !== 'dialogue') { $('bind').innerHTML = ''; $('twin-read').innerHTML = '<span>the twin system belongs to the dialogue</span>'; return; }
    const log = ($('t-same').checked && control ? control : live).couplerLog, shown = log.slice(-96);
    $('bind').innerHTML = shown.map(e => `<i class="${e.F > st.F ? 'later' : e.ok ? '' : 'no'}" title="zero point ${e.F}: ${e.ok ? 'B unchanged' : 'B moved'}"></i>`).join('');
    const seen = log.filter(e => e.F <= st.F), held = seen.filter(e => e.ok).length, k = latchedCount(st.F) - 1;
    const last = k >= 0 ? who(live.chain.packets[k].source) : '—';
    $('twin-read').innerHTML = `<span>binding held <b class="${held === seen.length ? 'good' : 'bad'}">${held}/${seen.length}</b></span><span>twists <b>${k + 1}</b></span><span>last issued by <b>${esc(last)}</b></span>` +
        `<span>law <b>${$('t-same').checked ? 'q₂ ← q₂ w (control)' : 'q₁ ← w q₁, q₂ ← q₂ w̄'}</b></span>`;
}

// ------------------------------------------------------------------ panels
function renderPick() {
    let html;
    if (st.mode === 'seed') {
        const pages = Math.max(1, Math.ceil(st.seed.nodes.length / 90));
        html = '<span class="help" style="margin:0">seed page</span> ' + Array.from({ length: pages }, (_, p) => `<button class="chip${p === st.seedPage ? ' on' : ''}" type="button" data-p="${p}">${p}</button>`).join('');
    } else {
        html = '<span class="help" style="margin:0">register</span> ' + regs.map(R => `<button class="chip${R.r === st.reg ? ' on' : ''}" type="button" data-r="${R.r}">${R.r}${R.complete && st.F >= 720 * (R.r + 1) ? ' ✓' : ''}</button>`).join('') +
            `<label><input type="checkbox" id="reg-follow"${st.regFollow ? ' checked' : ''}> follow</label>`;
    }
    if ($('pick').dataset.html !== html) { $('pick').dataset.html = html; $('pick').innerHTML = html; }
}
function renderRead() {
    if (st.mode === 'seed') { $('read').innerHTML = `<span>seed <b>${esc(st.seed.seed.shape || '—')}</b></span><span>nodes <b>${st.seed.nodes.length}</b></span><span>chains <b>${st.seed.chains.length}</b></span>`; return; }
    const F = Math.floor(st.F), [r, m, l] = EC.place(Math.max(1, F));
    $('read').innerHTML = `<span>frame <b>${F}</b> / ${st.target}</span><span>register <b>${r}</b> · block <b>${m}</b> · group <b>${l}</b></span><span>breath <b>${EC.breathOf(F).toFixed(3)}</b> (720-frame cycle)</span><span>memories shown <b>${nodesNow().length}</b></span>`;
}
function renderChips() {
    const done = regs.filter(R => R.complete).length, held = live.couplerLog.filter(e => e.ok).length;
    const w = [...st.watch.values()], flags = w.reduce((s, x) => s + x.flags.length, 0), bad = w.reduce((s, x) => s + x.settleFail, 0);
    $('chips').innerHTML = [`<span class="stat"><b>${live.chain.packets.length}</b> packets</span>`, `<span class="stat"><b>${live.words.length}</b> memory words</span>`,
        `<span class="stat"><b>${done}</b> register${done === 1 ? '' : 's'} closed</span>`, `<span class="stat ${held === live.couplerLog.length ? 'good' : 'warn'}">binding <b>${held}/${live.couplerLog.length}</b></span>`,
        `<span class="stat ${bad ? 'warn' : 'good'}">fence flags settled <b>${flags - bad}/${flags}</b></span>`, st.mode === 'seed' ? '<span class="stat">showing <b>a lattice seed</b></span>' : ''].join('');
}
function renderSel() {
    const s = st.sel, out = $('sel');
    if (!s) { out.innerHTML = '<p class="help">Click a point in the tree.</p>'; return; }
    const kv = rows => `<div class="sel-kv">${rows.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join('')}</div>`;
    const watch = st.watch.get(viewKey());
    if (st.mode === 'seed' && s.kind === 'seed') {
        const n = st.seed.nodes[s.k], ch = st.seed.chains.map((c, i) => (c.nodes.includes(n.i) ? i : -1)).filter(i => i >= 0), p = EC.seedPosition(n.k);
        out.innerHTML = kv([['node', `${n.i} (${n.k + 1} of ${st.seed.nodes.length})${n.raw ? ' · data crystal' : ''}`], ['word', n.w],
            ['fields', `form ${n.form} · spin ${n.spin} · quat32 ${n.quat32.toString(16).toUpperCase().padStart(8, '0')} · payload ${n.payload16} · freq ${n.freq} · amp ${n.amp}`],
            ['parity', n.parityOk ? '<span class="good">valid</span>' : '<span class="bad">broken</span>'], ['address', `<span class="addr">${n.address.map(g => GEN[g]).join('')}</span>`],
            ['quaternion', `(${n.quat.join(', ')})`], ['chains', ch.length ? ch.map(i => `#${i}`).join(', ') : 'none'], ['placed', `page ${p.page}, section ${p.s}, zero point ${p.c}, cell ${CELL[p.j]}`]]);
        return;
    }
    if (s.kind === 'cell') {
        const t = s.t, p = live.chain.packets[t], sc = live.sched[t], pos = EC.positionOf(sc.off), q = live.quats[t], qf = EC.floatQ(q), w = live.wordOf(t);
        const ang = 2 * Math.acos(Math.min(1, Math.abs(qf[0]))) * 180 / Math.PI, ax = qf.slice(1), na = Math.hypot(...ax) || 1;
        const R = T3.rotOfQuat(q), I = new C.Q(1n), Z = new C.Q(0n), orth = [0, 1, 2].every(a => [0, 1, 2].every(b => R.reduce((acc, row) => acc.add(row[a].mul(row[b])), Z).eq(a === b ? I : Z)));
        const f = watch && watch.flags.find(x => x.key === `${pos.s},${pos.c},${pos.j}` && pos.r === st.reg), g = live.gauges[t];
        out.innerHTML = kv([['word', `#${t} ${esc(p.token)} · <span style="color:${colorOf(p.source)}">${esc(who(p.source))}</span>`],
            ['position', `register ${pos.r} · section ${pos.s} · zero point ${pos.c} (frame ${pos.zeroPoint}) · cell ${CELL[pos.j]}`],
            ['memory word', w ? `@${w.addr} at frame ${w.F}` : 'none: the first two packets latch before a zero point holds three'],
            ['frame', `turned ${ang.toFixed(2)}° about (${ax.map(x => (x / na).toFixed(3)).join(', ')})`],
            ['exact', `R(q)ᵀR(q) = I in rationals: ${orth ? '<span class="good">yes</span>' : '<span class="bad">no</span>'}`],
            ['quaternion', `(${q.join(', ')}) · norm 5²⁸`], ['address', `<span class="addr">${live.addresses[t].map(g2 => GEN[g2]).join('')}</span>`],
            ['gauge', `s ${g.s} · X ${g.X} · Y ${g.Yc}`],
            ['watch', f ? (f.misplaced ? `<span class="bad">misplaced</span>: found at depth ${f.found.word.length}, ${f.found.under ? 'under its record' : 'elsewhere'}` : `flagged by the fence, <span class="good">cleared</span>: it is at its recorded address`) : watch ? 'inside the fence' : 'the fence has not run on this register']]);
        return;
    }
    const n = EC.LAYOUT.find(x => x.key === s.key);
    if (n.depth === 2) {
        const w = wordAtNode(n);
        out.innerHTML = kv([['zero point', `section ${n.s}, place ${n.c} · frame ${24 * (30 * st.reg + 5 * n.s + n.c + 1)}`],
            ['memory word', w ? `@${w.addr} · cells ${w.tokens.map(t => `#${t} ${esc(live.chain.packets[t].token)}`).join(', ')}` : 'not written (yet)'], ['root', w ? w.root.slice(0, 32) + '…' : '—'], ['link', w ? w.link : '—']]);
    } else out.innerHTML = kv(n.depth === 0 ? [['register', `${st.reg}: frames ${720 * st.reg + 1}–${720 * (st.reg + 1)}`]] : [['section', `${n.s}: zero points ${30 * st.reg + 5 * n.s + 1}–${30 * st.reg + 5 * n.s + 5} of the run, 120 frames`]]);
}
function renderWatch() {
    const w = st.watch.get(viewKey()), moved = movedNow();
    if (!w) {
        $('w-read').innerHTML = `<span>${st.mode === 'dialogue' ? `register ${st.reg}: the fence runs when it closes, or now` : 'run the fence on this page of the seed'}</span>`;
        $('w-flags').innerHTML = '';
    } else {
        const far = w.flags.filter(f => f.verdict === 2).length;
        $('w-read').innerHTML = `<span>memories <b>${w.nodes.length}</b></span><span>flagged <b>${w.flags.length}</b>${far ? ` (${far} far out)` : ''}</span><span>settled exactly <b class="${w.settleFail ? 'bad' : 'good'}">${w.flags.length - w.settleFail}/${w.flags.length}</b></span>` +
            `<span>misplaced <b>${moved.size}</b>, found <b>${moved.size - w.missed.length}</b></span><span>shells Q1 ${w.shells.d1.toFixed(2)} · Q3 ${w.shells.d3.toFixed(2)} · fence ${w.shells.rF.toFixed(2)} · far ${w.shells.rG.toFixed(2)}</span><span>${w.ms.toFixed(0)} ms</span>`;
        const label = f => { const n = w.nodes[f.i]; return n.depth === 3 ? `cell ${f.key}${st.mode === 'dialogue' ? ` · #${n.t} ${esc(live.chain.packets[n.t].token)}` : ''}` : n.depth === 2 ? `zero point ${f.key}` : `section ${f.key}`; };
        $('w-flags').innerHTML = w.flags.length ? `<thead><tr><th>memory</th><th>fence</th><th>exact check</th></tr></thead><tbody>` + w.flags.map(f => `<tr><td>${label(f)}</td><td>${f.verdict === 2 ? 'far out' : 'outside'}</td><td class="${f.ok ? 'good' : 'bad'}">${f.misplaced ? `misplaced, ${f.found.word.length - 3} too deep` : 'cleared'}</td></tr>`).join('') + '</tbody>' : '<tbody><tr><td class="help">No memory outside the fence.</td></tr></tbody>';
    }
    const g = st.guard.get(viewKey());
    if (!g) $('g-read').innerHTML = '<span>the guard reads the stored distances between the register, its sections and its zero points (37 memories)</span>';
    else {
        const name = k => (k === 'r' ? 'the register' : k.includes(',') ? `zero point ${k}` : `section ${k}`);
        $('g-read').innerHTML = `<span>clean: worst defect <b>${g.clean.worst.toFixed(4)}</b> ${g.clean.bad ? '<b class="bad">above ln 2</b>' : '&lt; ln 2 = 0.6931 <b class="good">✓</b>'}</span>` +
            (g.keys ? `<span>+${g.delta} on d(${name(g.keys[0])}, ${name(g.keys[1])}): <b>${g.bad}</b> quadruple${g.bad === 1 ? '' : 's'} above ln 2</span>` +
                `<span>the guard (all six pairs) blames <b class="${g.hit ? 'good' : 'bad'}">${g.hit ? 'that pair' : g.topKeys ? `${name(g.topKeys[0])} – ${name(g.topKeys[1])}` : 'nothing'}</b></span>` +
                `<span>the matching guard (E10) ${g.matching.hit ? '<b class="good">names that pair</b>' : g.matching.named ? `names <b class="bad">${name(g.matching.named[0])} – ${name(g.matching.named[1])}</b>` : g.bad === 1 ? '<b>splits between two pairs</b>: one quadruple is one witness' : '<b>has no witness</b>'}</span>` : '');
    }
}
function renderMessages() {
    $('msgs').innerHTML = live.turns.map((tu, i) => {
        const rep = replies[i];
        const txt = turnText(tu), short = txt.length > 400 ? txt.slice(0, 400) + ' …' : txt;
        return `<div class="msg ${tu.source}" data-first="${tu.first}" data-count="${tu.count}"><div class="who" style="color:${colorOf(tu.source)}">${esc(who(tu.source))}</div><div class="txt">${esc(short)}</div><div class="meta">${rep ? `${rep.concept.toLowerCase()} · reply ${rep.index + 1} of 3 · ` : ''}${tu.count} words · #${tu.first}–#${tu.first + tu.count - 1}</div></div>`;
    }).join('');
    $('msgs').scrollTop = $('msgs').scrollHeight;
}
function setMode(mode) {
    st.mode = mode; st.sel = mode === 'seed' ? null : { kind: 'cell', t: Math.max(0, latchedCount(st.F) - 1), follow: true };
    $('view-sub').textContent = mode === 'seed' ? 'an imported lattice seed, 90 nodes to a page' : 'register → section → zero point → cell';
    onFrame(true); drawTwin();
}

// ------------------------------------------------------------------ LATTICE-SEED/1
function sampleSeed() {
    const rng = new C.Rng(9300), nodes = [];
    for (let i = 0; i < 45; i++) nodes.push({ i, w: LS.packWord(1 + rng.below(7), rng.below(8), [0, 1, 2, 3].map(() => rng.below(256)), rng.below(65536), rng.below(32), rng.below(8)) });
    nodes.push({ i: 45, w: LS.crystallizeBytes(Array.from(new TextEncoder().encode('STRIX ON THE CLOCK'))), r: 1 });
    const s = { v: 1, shape: '64-Cell', params: { seedWord: 'MIND', cubeScale: 10, fractalLevel: 1 }, count: 64, rngSeed: 9300, nodes, chains: [nodes.slice(0, 24).map(n => n.i), nodes.slice(24).map(n => n.i)] };
    s.hash = '0x' + LS.fold32(LS.canonicalSeed(s)).toString(16).padStart(8, '0');
    return JSON.stringify(s);
}
function loadSeed() {
    const out = $('seed-out'), line = (ok, text) => `<div><span class="${ok ? 'good' : ok === null ? 'help' : 'bad'}">${ok ? 'PASS' : ok === null ? 'NOTE' : 'FAIL'}</span> ${text}</div>`;
    let imp, env = null;
    try {
        const text = $('seed-text').value.trim(), o = JSON.parse(text);
        if (o && o.kind === 'ENVIRONMENT/1') { env = EC.importEnvironment(LS, window.BiochainV1, o); imp = env.seed; }
        else imp = EC.importLatticeSeed(LS, o);
    } catch (e) { out.innerHTML = line(false, esc(e.message)); return; }
    const envLines = env ? [`<div class="help" style="margin:2px 0 4px">an ENVIRONMENT/1: its boundary seed below, its pump driving the breath</div>`,
        ...env.checks.map(c => line(c.ok, esc(c.label) + (c.detail ? ` <span class="help">· ${esc(c.detail)}</span>` : '')))] : [];
    out.innerHTML = [...envLines,
        imp.hashOk === null ? line(null, `no hash stored; recomputed ${imp.recomputed}`) : line(imp.hashOk, `hash ${imp.hashOk ? `${imp.recomputed} matches, as Owl Academy computes it` : `${imp.recomputed} ≠ stored ${esc(imp.seed.hash)}: the seed was changed after it was hashed`}`),
        line(!imp.parityBad, `${imp.nodes.length} words, ${imp.parityBad ? `${imp.parityBad} with broken parity` : 'every parity valid'}${imp.nodes.some(n => n.raw) ? `, ${imp.nodes.filter(n => n.raw).length} data crystal(s)` : ''}`),
        ...imp.chains.map((c, i) => line(c.unfolds && !c.missing, `chain #${i}: ${c.length} words → one exact quaternion of ${c.letters} letters (norm 5^${c.letters}) that ${c.unfolds ? 'unfolds back into them, in order' : 'does not unfold'}${c.missing ? `; ${c.missing} missing node(s)` : ''}`)),
        line(null, `each word is a 28-letter address and its frame; placed in the tree in index order, 90 to a page`),
    ].join('');
    st.seed = imp; st.seedPage = 0; st.env = env ? { pump: env.pump, frontier: env.frontier } : null; frames.clear();
    if (env) { $('v-tors').value = Math.min(6, env.pump.torsion); $('v-breath').checked = true; }
    setMode('seed');
}

// ------------------------------------------------------------------ wiring
$('composer').addEventListener('submit', e => { e.preventDefault(); const v = $('say').value; $('say').value = ''; send(v); });
$('say').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('composer').requestSubmit(); } });
$('b-play').addEventListener('click', () => { st.playing = !st.playing; $('b-play').textContent = st.playing ? 'Pause' : 'Play'; });
$('b-end').addEventListener('click', () => { st.F = st.target; onFrame(true); });
$('b-replay').addEventListener('click', () => { if (st.mode !== 'dialogue') setMode('dialogue'); st.F = st.replayFrom; st.playing = true; st.regFollow = true; $('b-play').textContent = 'Pause'; onFrame(true); });
$('b-step').addEventListener('click', () => {
    let next = Infinity;
    for (const s of live.sched) { if (s.on > st.F) next = Math.min(next, s.on); if (s.off > st.F) next = Math.min(next, s.off); }
    for (const w of live.words) if (w.F > st.F) next = Math.min(next, w.F);
    if (next <= st.target) { st.F = next; st.playing = false; $('b-play').textContent = 'Play'; onFrame(true); }
});
$('speed').addEventListener('change', e => { st.speed = +e.target.value; });
['v-mode', 'v-frames', 'v-shells', 'v-edges', 'v-breath', 'v-tors'].forEach(id => $(id).addEventListener('input', () => { st.dirty = true; }));
$('b-zin').addEventListener('click', () => { st.zoom = Math.min(4, st.zoom * 1.25); st.dirty = true; });
$('b-zout').addEventListener('click', () => { st.zoom = Math.max(0.5, st.zoom / 1.25); st.dirty = true; });
$('pick').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.r !== undefined) { st.reg = +b.dataset.r; st.regFollow = false; }
    if (b.dataset.p !== undefined) st.seedPage = +b.dataset.p;
    onFrame(true);
});
$('pick').addEventListener('change', e => { if (e.target.id === 'reg-follow') { st.regFollow = e.target.checked; onFrame(true); } });
$('t-same').addEventListener('change', e => { if (e.target.checked && !control) buildControl(); st.dirty = true; renderTwinRead(); drawTwin(); });
$('w-run').addEventListener('click', runWatch);
$('w-move').addEventListener('click', () => {
    const cells = nodesNow().filter(n => n.depth === 3), moved = movedNow(), free = cells.filter(n => !moved.has(n.key));
    if (!free.length) return;
    const sel = st.sel, pick = free.find(n => (sel && sel.kind === 'cell' && st.mode === 'dialogue' && n.t === sel.t) || (sel && sel.kind === 'seed' && st.mode === 'seed' && n.k === sel.k)) || free[new C.Rng(st.moveSeed).below(free.length)];
    moved.set(pick.key, EC.misplace(pick.word, 2, st.moveSeed++));
    st.moved.set(viewKey(), moved); runWatch();
});
$('w-clear').addEventListener('click', () => { st.moved.delete(viewKey()); if (st.watch.has(viewKey())) runWatch(); else { st.dirty = true; renderWatch(); } });
$('g-corrupt').addEventListener('click', () => { const delta = 1.5, g = EC.guardMemory(nodesNow(), { delta, seed: st.guardSeed++ }); g.delta = delta; st.guard.set(viewKey(), g); st.dirty = true; renderWatch(); });
$('g-clear').addEventListener('click', () => { const g = EC.guardMemory(nodesNow()); st.guard.set(viewKey(), g); st.dirty = true; renderWatch(); });
$('msgs').addEventListener('click', e => { const m = e.target.closest('.msg'); if (m && +m.dataset.count) { if (st.mode !== 'dialogue') setMode('dialogue'); const t = +m.dataset.first; st.reg = EC.positionOf(live.sched[t].off).r; st.regFollow = false; st.sel = { kind: 'cell', t }; onFrame(true); } });
$('seed-sample').addEventListener('click', () => { $('seed-text').value = sampleSeed(); loadSeed(); });
$('seed-load').addEventListener('click', loadSeed);
$('seed-back').addEventListener('click', () => setMode('dialogue'));
$('seed-file').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; $('seed-text').value = await f.text(); e.target.value = ''; loadSeed(); });
const cv = $('cv-view');
let drag = null;
cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: false }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 2) { drag.moved = true; dragging = true; } st.yaw += dx * 0.01; st.pitch = Math.max(-1.5, Math.min(1.5, st.pitch + dy * 0.01)); drag.x = e.clientX; drag.y = e.clientY; st.dirty = true; });
cv.addEventListener('pointerup', e => {
    if (drag && !drag.moved) {
        const rc = cv.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top;
        let best = null, bd = 14;
        for (const [px, py, n] of st.proj) { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = n; } }
        if (best) {
            st.sel = st.mode === 'seed' ? (best.depth === 3 ? { kind: 'seed', k: best.k } : null) : best.depth === 3 ? { kind: 'cell', t: best.t } : { kind: 'node', key: best.key };
            renderSel(); st.dirty = true;
        }
    }
    drag = null; dragging = false;
});
cv.addEventListener('wheel', e => { e.preventDefault(); st.zoom = Math.max(0.5, Math.min(4, st.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))); st.dirty = true; }, { passive: false });
window.addEventListener('resize', () => { st.dirty = true; });

start(loadSaved());
requestAnimationFrame(tick);
window.__mindEye3d = { st, live: () => live, send, runWatch, loadSeed };
})();
