// Engram Mind's Eye, the 2D page. Everything it shows is computed by EngramCore (engram_core.js): a Live session that
// tests/page-engine.cjs checks against the reference Session, turn by turn. This file only draws and asks.
(function () {
'use strict';
const EC = window.EngramCore, LIB = window.StrixLibraryV1, O = window.OrbitalCore, C = window.HPCore;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
if (!EC || !LIB || !O || !C) {
    document.querySelector('.board').innerHTML = '<section class="panel">One of the page&rsquo;s modules did not load (engram_core.js, strix_library_v1.js and the shared cores).</section>';
    return;
}
const CH = ['α', 'β', 'γ'], ENG = ['I', 'II', 'III'], CHCOL = ['#ff0055', '#00f2ff', '#ffd700'];
const TCOL = ['#60a5fa', '#c084fc', '#34d399', '#fbbf24', '#fb7185'];                  // T0 .. T4
const TNAME = ['T0 · Latch', 'T1 · Prune', 'T2 · Superpose', 'T3 · Align', 'T4 · Ingest'];
const SRC = { human: '#f8fafc', strix: '#e879f9', biochain: '#2dd4bf', stream: '#fbbf24', unknown: '#94a3b8' };
const colorOf = s => SRC[s] || '#94a3b8', who = s => (s === 'human' ? 'you' : s === 'strix' ? 'STRIX' : s);
const turnText = tu => (typeof tu.text === 'string' ? tu.text : (tu.tokens || tu.labels || []).join(' '));
const GEN = ['i', 'I', 'j', 'J', 'k', 'K'];                                           // 1 + 2i, 1 − 2i, 1 + 2j, 1 − 2j, 1 + 2k, 1 − 2k
const CELLCOL = ['var(--wa)', 'var(--wb)', 'var(--wg)', 'var(--wy)'], CELLNAME = ['α', 'β', 'γ', 'Y'];
const KEY = 'engram-minds-eye/session/1';
const MT = EC.membraneTurn(), TURNS = [MT, MT, MT];

let live, regs = [], replies = [];
const view = { F: 0, target: 0, playing: true, speed: 48, sel: 0, follow: true, word: null, wordFollow: true, reg: null, regFollow: true, replayFrom: 0 };
const readouts = new Map();

// ------------------------------------------------------------------ session
function endFrame() {
    const w = live.words.length ? live.words[live.words.length - 1].F : 0;
    return Math.max(w, live.last);
}
function loadSaved() {                         // v2 keeps every turn; v1 kept your words, from which STRIX's replies follow
    try {
        const s = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (s && s.version === 2 && Array.isArray(s.turns) && s.turns.length) return { turns: s.turns };
        if (s && Array.isArray(s.humans)) return { humans: s.humans.filter(x => typeof x === 'string') };
    } catch (e) { /* storage unavailable or unreadable */ }
    return { humans: [] };
}
function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ version: 2, turns: EC.turnsOf(live) })); $('save-note').textContent = 'Kept in this browser only.'; }
    catch (e) { $('save-note').textContent = 'This browser is not keeping the dialogue (storage unavailable).'; }
}
function start(saved) {
    readouts.clear();
    if (saved.turns) { const r = EC.replayTurns(LIB, saved.turns); live = r.live; replies = r.replies; }
    else { live = new EC.Live(); replies = [null]; live.addTurn('strix', LIB.intro); for (const h of saved.humans) { const r = live.respond(LIB, h); replies.push(null, r.reply); } }
    regs = live.registers();
    view.F = view.target = endFrame(); view.replayFrom = 0;
    Object.assign(view, { follow: true, wordFollow: true, regFollow: true, word: null, reg: null });
    $('t-follow').checked = true;
    renderTurn();
}
function send(text) {
    text = text.trim();
    if (!text) return;
    const before = live.chain.packets.length, r = live.respond(LIB, text);
    replies.push(null, r.reply); save();
    regs = live.registers();
    view.replayFrom = Math.max(0, live.sched[before].on - 1);
    view.target = endFrame(); view.playing = true;
    Object.assign(view, { follow: true, wordFollow: true, regFollow: true });
    $('t-follow').checked = true; $('b-play').textContent = 'Pause';
    renderTurn();
}
function renderTurn() { renderMessages(); renderLedger(); renderChips(); lastInt = -1; onFrame(true); }

// ------------------------------------------------------------------ what the clock shows at frame F
const visibleWords = F => { let n = 0; while (n < live.words.length && live.words[n].F <= F) n++; return n; };
function newestOnloaded(F) { let t = -1; for (let k = 0; k < live.sched.length && live.sched[k].on <= F; k++) t = k; return Math.max(0, t); }
function stateOf(t, F) {
    const s = live.sched[t], w = live.wordOf(t);
    if (F < s.on) return 'waiting';
    if (F < s.off) return 'in flight';
    if (!w || F < w.F) return 'latched';
    return 'written';
}
const intact = w => w.word.chain()[1] === w.word.tau0[1];
function damaged(F) { const out = []; for (let k = 0, n = visibleWords(F); k < n; k++) if (!intact(live.words[k])) out.push(live.words[k]); return out; }

// ------------------------------------------------------------------ the frame loop
let lastTs = null, lastInt = -1, lastVis = { words: -1, sel: -1, latched: -1 };
function tick(ts) {
    const dt = lastTs === null ? 0 : Math.min(0.1, (ts - lastTs) / 1000);
    lastTs = ts;
    const moving = view.playing && view.F < view.target;
    if (moving) view.F = Math.min(view.target, view.F + view.speed * dt);
    if (Math.floor(view.F) !== lastInt) onFrame(false);
    if (moving || clockDirty) { drawClock(); clockDirty = false; }
    requestAnimationFrame(tick);
}
let clockDirty = true;
function onFrame(force) {
    const F = view.F, Fi = Math.floor(F);
    lastInt = Fi;
    if (view.follow) view.sel = newestOnloaded(F);
    const vw = visibleWords(F);
    let latched = 0; while (latched < live.sched.length && live.sched[latched].off <= F) latched++;
    if (view.wordFollow) view.word = vw ? vw - 1 : null;
    if (view.regFollow) view.reg = Math.min(EC.place(Math.max(1, Fi))[0], regs.length ? regs[regs.length - 1].r : 0);
    const selChanged = force || view.sel !== lastVis.sel, wordsChanged = force || vw !== lastVis.words, latchChanged = force || latched !== lastVis.latched;
    lastVis = { words: vw, sel: view.sel, latched };
    renderClockRead(); renderRegister();
    if (selChanged) { renderTiers(); renderRes(); markSelection(); }
    else if (wordsChanged) renderRes();
    if (wordsChanged || selChanged) renderMemory();
    if (wordsChanged || selChanged || latchChanged) drawMap();
    clockDirty = true;
}

// ------------------------------------------------------------------ canvases
function fit(cv, ratio) {
    const w = Math.max(200, cv.clientWidth || cv.parentElement.clientWidth), h = Math.round(w * ratio), d = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); cv.style.height = h + 'px'; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
}
const tierR = n => 0.14 + 0.86 * (O.TIERS_SPEC[n].R - 15) / 140;

function drawClock() {
    const cv = $('cv-clock'), { ctx, w, h } = fit(cv, 0.8), F = view.F, U = Math.min(w, h);
    const cx = w / 2, cy = h / 2 + U * 0.03, Rd = U * 0.14, D = U * 0.31, Re = U * 0.135;
    const engAng = [150, 30, -90].map(a => a * Math.PI / 180);
    const E = engAng.map(a => [cx + D * Math.cos(a), cy + D * Math.sin(a)]);
    ctx.font = '11px "Fira Code", monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    // zero-point flash: the three latched cells join into the word
    const zp = 24 * Math.floor(F / 24), since = F - zp, wz = zp >= 48 ? live.words[(zp - 48) / 24] : null;
    if (wz && wz.F === zp && since < 5) {
        ctx.globalAlpha = 1 - since / 5;
        E.forEach(([x, y], ch) => { ctx.strokeStyle = CHCOL[ch]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx, cy); ctx.stroke(); });
        ctx.fillStyle = '#f5c542'; ctx.font = '600 12px "Fira Code", monospace';
        ctx.fillText(`word @${wz.addr}`, cx, cy + Rd + 16);
        ctx.globalAlpha = 1; ctx.font = '11px "Fira Code", monospace';
    }
    // the engines: five tiers each, counter-rotating (II backward)
    E.forEach(([ex, ey], ch) => {
        const spin = EC.SPIN[ch] * 2 * Math.PI * F / 96;
        ctx.strokeStyle = CHCOL[ch]; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(ex, ey, Re * 1.1, 0, 2 * Math.PI); ctx.stroke(); ctx.globalAlpha = 1;
        for (let n = 4; n >= 0; n--) {
            const rr = Re * tierR(n), Wn = O.TIERS_SPEC[n].W, amp = Re * 0.035;
            ctx.strokeStyle = TCOL[n]; ctx.globalAlpha = 0.55; ctx.lineWidth = 1;
            ctx.beginPath();
            for (let k = 0; k <= 180; k++) {
                const th = 2 * Math.PI * k / 180, r = rr + amp * Math.cos(Wn * th);
                const x = ex + r * Math.cos(th + spin), y = ey + r * Math.sin(th + spin);
                if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
            }
            ctx.stroke(); ctx.globalAlpha = 1;
        }
        ctx.fillStyle = CHCOL[ch]; ctx.font = '600 11px "Fira Code", monospace';
        const ly = ch === 2 ? ey - Re * 1.1 - 9 : ey + Re * 1.1 + 10;
        ctx.fillText(`Engine ${ENG[ch]} · ${CH[ch]}`, ex, ly);
        ctx.font = '11px "Fira Code", monospace';
    });
    // packets: in flight from T4 to T0, latched at the centre until their zero point
    const t0 = Math.max(0, newestOnloaded(F) - 6), t1 = Math.min(live.sched.length - 1, newestOnloaded(F));
    for (let t = t0; t <= t1; t++) {
        const s = live.sched[t], p = live.chain.packets[t], [ex, ey] = E[s.channel], st = stateOf(t, F);
        if (st === 'waiting' || st === 'written') continue;
        let x = ex, y = ey, tier = 0;
        if (st === 'in flight') {
            const q = (F - s.on) / 12, r = Re * (1 - 0.86 * q), a = -Math.PI / 2 + EC.SPIN[s.channel] * q * 1.5 * Math.PI;
            x = ex + r * Math.cos(a); y = ey + r * Math.sin(a); tier = 4 - Math.min(4, Math.floor(q * 5));
        }
        ctx.fillStyle = colorOf(p.source); ctx.shadowColor = st === 'latched' ? '#f5c542' : colorOf(p.source); ctx.shadowBlur = st === 'latched' ? 14 : 6;
        ctx.beginPath(); ctx.arc(x, y, st === 'latched' ? 6 : 5, 0, 2 * Math.PI); ctx.fill(); ctx.shadowBlur = 0;
        if (t === view.sel) { ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9, 0, 2 * Math.PI); ctx.stroke(); }
        ctx.fillStyle = '#e2e8f0';
        const label = (p.token.length > 11 ? p.token.slice(0, 10) + '…' : p.token) + (st === 'in flight' ? ` · T${tier}` : ' · latched');
        ctx.fillText(label, x, y - 14);
    }
    // the 24-frame joint dial
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, Rd, 0, 2 * Math.PI); ctx.stroke();
    for (let f = 0; f < 24; f++) {
        const a = -Math.PI / 2 + 2 * Math.PI * f / 24, c = Math.cos(a), s = Math.sin(a), L = f % 6 === 0 ? 8 : 4;
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + (Rd - L) * c, cy + (Rd - L) * s); ctx.lineTo(cx + Rd * c, cy + Rd * s); ctx.stroke();
        const on = EC.ON.indexOf(f), off = EC.OFF.indexOf(f);
        if (on >= 0) { ctx.fillStyle = CHCOL[on]; ctx.beginPath(); ctx.moveTo(cx + (Rd + 3) * c, cy + (Rd + 3) * s); ctx.lineTo(cx + (Rd + 11) * c - 4 * s, cy + (Rd + 11) * s + 4 * c); ctx.lineTo(cx + (Rd + 11) * c + 4 * s, cy + (Rd + 11) * s - 4 * c); ctx.fill(); }
        if (off >= 0) { ctx.strokeStyle = CHCOL[off]; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx + (Rd - 14) * c, cy + (Rd - 14) * s, 3.5, 0, 2 * Math.PI); ctx.stroke(); }
        if (f === 0) { ctx.fillStyle = '#f5c542'; const X = cx, Y = cy - Rd - 7; ctx.beginPath(); ctx.moveTo(X, Y - 6); ctx.lineTo(X + 5, Y); ctx.lineTo(X, Y + 6); ctx.lineTo(X - 5, Y); ctx.fill(); }
    }
    const ha = -Math.PI / 2 + 2 * Math.PI * (F % 24) / 24;
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Rd * 0.78 * Math.cos(ha), cy + Rd * 0.78 * Math.sin(ha)); ctx.stroke();
    ctx.fillStyle = '#020617'; ctx.beginPath(); ctx.arc(cx, cy, Rd * 0.42, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#f8fafc'; ctx.font = '600 15px "Fira Code", monospace'; ctx.fillText(String(Math.floor(F)), cx, cy - 3);
    ctx.fillStyle = '#64748b'; ctx.font = '10px "Fira Code", monospace'; ctx.fillText('frame', cx, cy + 12);
    ctx.textAlign = 'left'; ctx.fillStyle = '#94a3b8'; ctx.font = '11px "Fira Code", monospace';
    ctx.fillText('▲ onload   ○ offload (latch)   ◆ zero point', 8, h - 10);
}

function renderClockRead() {
    const F = Math.floor(view.F), [r, m, l] = EC.place(Math.max(1, F)), next = 24 * (Math.floor(F / 24) + 1);
    $('clock-read').innerHTML = `<span>frame <b>${F}</b> / ${view.target}</span><span>joint frame <b>${F % 24}</b></span><span>register <b>${r}</b> · block <b>${m}</b> · group <b>${l}</b></span>` +
        `<span>next zero point <b>${next}</b></span><span>words written <b>${visibleWords(view.F)}</b></span>`;
}

// ------------------------------------------------------------------ the five tiers
const grid8 = (g, col, j) => `<div class="grid8" style="--c:${col}"${j !== undefined ? ` data-j="${j}"` : ''}>${g.map((b, i) => `<i data-i="${i}" class="${b ? 'on' : ''}"></i>`).join('')}</div>`;
function oddLetters(tok) { const c = {}; for (const ch of tok.toUpperCase()) if (ch >= 'A' && ch <= 'Z') c[ch] = (c[ch] || 0) ^ 1; return Object.keys(c).filter(k => c[k]).sort().join(' ') || 'none'; }
function renderTiers() {
    const t = view.sel, P = live.chain.packets, p = P[t];
    if (!p) { $('tiers').innerHTML = ''; return; }
    const s = live.sched[t], st = stateOf(t, view.F), win = live.windowBefore(t), names = [t - 3, t - 2, t - 1].map(k => (k >= 0 ? P[k].token : EC.WINDOW_SEEDS[3 + k]));
    const prev = t ? parseInt(P[t - 1].header, 16) : EC.CODEX_ROOT, w = live.wordOf(t), pos = EC.positionOf(s.off), [r, m, l] = EC.place(s.off);
    const conc = p.concept === 255 ? null : EC.CONCEPT_NAMES[p.concept], q = live.quats[t];
    $('t-name').innerHTML = `#${t} ${esc(p.token)} <span style="font-weight:400;color:${colorOf(p.source)}">· ${esc(who(p.source))} · ${st}</span>`;
    const tier = (n, body) => `<div class="tier" style="--c:${TCOL[n]}"><div class="tn">${TNAME[n].split(' · ')[0]}<span>${TNAME[n].split(' · ')[1]}</span></div><div class="tb">${body}</div></div>`;
    const bar = (k, d) => `<span style="color:${CHCOL[k]}">${CH[k]} ${esc(names[k])}</span><span class="bar" style="--c:${CHCOL[k]}"><i style="width:${(100 * d / 64).toFixed(1)}%"></i></span><span>${d}</span>`;
    $('tiers').innerHTML = [
        tier(4, `<span class="inline-grid">${grid8(p.grid, 'var(--t4)')}</span><div class="kv"><span>crystallize</span><span>${esc(p.token)} → odd letters ${oddLetters(p.token)}</span><span>body</span><span>${EC.hex64(p.seed64)}</span><span>chiral key</span><span>${esc(EC.chiralKey(p.token))}</span><span>torsion J</span><span>${EC.computeJ(p.grid)}</span></div><div class="clear"></div>`),
        tier(3, `<div class="bars">${bar(0, p.tri[0])}${bar(1, p.tri[1])}${bar(2, p.tri[2])}</div><div class="kv" style="margin-top:4px"><span>footer</span><span>${p.footer} = ${p.tri.join(' · ')} · ${p.concept}</span><span>nearest</span><span>${conc ? `${conc}, ${EC.hamming(p.grid, EC.crystallize(conc))} bits away` : 'none'}</span></div>`),
        tier(2, `<div class="kv"><span>header</span><span>${p.header} = fold32 ${EC.hex32(EC.fold32(p.seed64))} <span class="op">⊕</span> rotl32 ${EC.hex32(EC.rotl32(prev, 1))}</span><span>chain</span><span>${28 * (t + 1)} letters: one quaternion of norm 5<sup>${28 * (t + 1)}</sup></span><span>Y</span><span>${w ? `folds into Y = α <span class="op">⊕</span> β <span class="op">⊕</span> γ of the word at frame ${w.F}` : 'no word: the first two packets latch before any zero point holds three'}</span></div>`),
        tier(1, `<div class="addr">${live.addresses[t].map(g => GEN[g]).join('')}</div><div class="help" style="margin:2px 0 0">i, j, k: 1 + 2i, 1 + 2j, 1 + 2k; I, J, K: their conjugates</div><div class="kv" style="margin-top:4px"><span>reduced</span><span>no letter undoes the one before${t ? ` (the first follows #${t - 1}&rsquo;s last)` : ''}</span><span>quaternion</span><span>(${q.join(', ')})</span><span>norm</span><span>5<sup>28</sup> = ${(5n ** 28n).toString()}</span></div>`),
        tier(0, `<div class="kv"><span>engine</span><span style="color:${CHCOL[s.channel]}">${ENG[s.channel]} · ${CH[s.channel]}: onload ${s.on}, latch ${s.off}</span><span>register</span><span>${r} · block ${m} · group ${l}</span><span>tree</span><span>section ${pos.s}, zero point ${pos.c} (frame ${pos.zeroPoint}), cell ${CELLNAME[pos.j]}</span>` +
            (w ? `<span>word</span><span>@${w.addr}, frame ${w.F}${live.isProvisional(w) ? ' (provisional until the next turn)' : ''}</span><span>tiles</span><span>${w.tiles[pos.j].map(O.hexWord).join(' ')} · Form 5</span>` : '') + `</div>`),
    ].join('');
}
function select(t, opts = {}) {
    view.sel = Math.max(0, Math.min(live.chain.packets.length - 1, t));
    view.follow = false; $('t-follow').checked = false;
    if (opts.word !== false) { const w = live.wordOf(view.sel); if (w) { view.word = live.words.indexOf(w); view.wordFollow = false; } }
    renderTiers(); renderRes(); markSelection(); renderMemory(); drawMap(); clockDirty = true;
}
function markSelection() {
    for (const tr of $('ledger').children) tr.classList.toggle('sel', +tr.dataset.t === view.sel);
    for (const m of $('msgs').children) { const a = +m.dataset.first, n = +m.dataset.count; m.classList.toggle('sel', view.sel >= a && view.sel < a + n); }
}

// ------------------------------------------------------------------ resonance
function readoutOf(t) {
    if (!readouts.has(t)) readouts.set(t, O.readout(live.chain.packets[t].tri.map(x => new O.Fraction(BigInt(x))), TURNS));
    return readouts.get(t);
}
function renderRes() {
    const t = view.sel, p = live.chain.packets[t];
    if (!p) return;
    const g = live.gauges[t], R = readoutOf(t), lock = R.T.lock, bad = damaged(view.F), held = live.couplerLog.filter(e => e.F <= view.F), broken = held.some(e => !e.ok);
    // the landing triangle on T0
    {
        const { ctx, w, h } = fit($('cv-tri'), 0.8), S = (Math.min(w, h) / 2 - 14) / 20, ox = w / 2, oy = h / 2;
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
        for (const rr of [11, 15, 19]) { ctx.beginPath(); ctx.arc(ox, oy, rr * S, 0, 2 * Math.PI); ctx.stroke(); }
        const pts = R.nodes.map(n => [ox + n[0].toNumber() * S, oy - n[1].toNumber() * S]);
        ctx.fillStyle = lock ? 'rgba(245,197,66,0.18)' : 'rgba(251,113,133,0.12)'; ctx.strokeStyle = lock ? '#f5c542' : '#fb7185'; ctx.lineWidth = 1.6;
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.stroke();
        pts.forEach(([x, y], i) => { ctx.fillStyle = CHCOL[i]; ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI); ctx.fill(); });
        ctx.fillStyle = '#94a3b8'; ctx.font = '10px "Fira Code", monospace'; ctx.textAlign = 'left'; ctx.fillText('T0 band, node 29, membrane turn 13/675', 6, h - 8);
        $('tri-cap').textContent = lock ? 'locked: 3·A = S² exactly' : `no lock: χ = ${R.T.chi.toFixed(4)} (lock at 1/√3 ≈ 0.5774)`;
    }
    // the soliton crystal
    {
        const { ctx, w, h } = fit($('cv-crystal'), 0.8), ox = w / 2, oy = h / 2, k = Math.max(1, g.s.toNumber() / 3);
        const dx = Math.max(-1, Math.min(1, g.X.toNumber() / k)), dy = Math.max(-1, Math.min(1, g.Yc.toNumber() * Math.sqrt(3) / 2 / k));
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ox, 10); ctx.lineTo(ox, h - 10); ctx.moveTo(10, oy); ctx.lineTo(w - 10, oy); ctx.stroke();
        ctx.beginPath(); ctx.arc(ox, oy, Math.min(w, h) * 0.36, 0, 2 * Math.PI); ctx.stroke();
        const sheared = bad.length > 0 || broken, col = sheared ? '#fb7185' : lock ? '#f5c542' : '#22d3ee';
        ctx.save(); ctx.translate(ox + dx * w * 0.3, oy - dy * h * 0.3);
        if (sheared) ctx.transform(1, 0, 0.45, 1, 0, 0);
        ctx.strokeStyle = col; ctx.fillStyle = col + '33'; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3, rr = Math.min(w, h) * 0.11; i ? ctx.lineTo(rr * Math.cos(a), rr * Math.sin(a)) : ctx.moveTo(rr * Math.cos(a), rr * Math.sin(a)); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = Math.PI / 6 + i * Math.PI / 3, rr = Math.min(w, h) * 0.11; ctx.moveTo(rr * Math.cos(a), rr * Math.sin(a)); ctx.lineTo(-rr * Math.cos(a), -rr * Math.sin(a)); } ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#94a3b8'; ctx.font = '10px "Fira Code", monospace'; ctx.textAlign = 'left'; ctx.fillText('X →   Y ↑   (lean / (s/3))', 6, h - 8);
        $('cry-cap').textContent = sheared ? `sheared: ${bad.length ? `${bad.length} memory word${bad.length > 1 ? 's' : ''} damaged` : 'the binding moved'}` : lock ? 'centred: the three distances are equal' : 'displaced by the lean X, Y; memory intact';
    }
    $('gauge').innerHTML = `<span>distances</span><span>α ${p.tri[0]} · β ${p.tri[1]} · γ ${p.tri[2]} (#${t} ${esc(p.token)} against the window)</span>` +
        `<span>gauge</span><span>s = ${g.s} · X = ${g.X} · Y = ${g.Yc} · ${g.recovered ? '<span class="good">recovers the three exactly</span>' : '<span class="bad">does not recover</span>'}</span>` +
        `<span>lock</span><span>${lock ? '<span class="good">yes</span>: the landing triangle is equilateral' : 'no: X or Y is not zero'}</span>` +
        `<span>binding</span><span>${held.length ? `${held.filter(e => e.ok).length}/${held.length} zero points: B = q₂q₁ unchanged` : 'no zero point yet'}</span>`;
}

// ------------------------------------------------------------------ memory
function renderMemory() {
    const vw = visibleWords(view.F), latest = new Array(30).fill(null);
    for (let k = 0; k < vw; k++) latest[live.words[k].addr] = k;
    $('addr-grid').innerHTML = latest.map((k, a) => {
        if (k === null) return `<button type="button" disabled title="address ${a}: empty"><b>@${a}</b>—</button>`;
        const w = live.words[k], cls = ['w', live.isProvisional(w) ? 'prov' : '', intact(w) ? '' : 'bad', k === view.word ? 'sel' : ''].join(' ');
        return `<button type="button" class="${cls}" data-k="${k}" title="address ${a}: word at frame ${w.F}"><b>@${a}</b>${w.F}</button>`;
    }).join('');
    const w = view.word !== null && view.word < vw ? live.words[view.word] : null;
    if (!w) { $('word').innerHTML = '<span class="help">No word written yet: the first is written at frame 48, when three packets have latched.</span>'; return; }
    const W = w.word, orig = W.orig || W.cells, now = W.chain(), toks = w.tokens.map(t => `#${t} ${esc(live.chain.packets[t].token)}`);
    const figs = W.cells.map((c, j) => {
        const g = EC.gridOf(c), o = EC.gridOf(orig[j]);
        return `<figure><div class="grid8" style="--c:${CELLCOL[j]}" data-j="${j}">${g.map((b, i) => `<i data-i="${i}" class="${b ? 'on' : ''}${b !== o[i] ? ' flip' : ''}"></i>`).join('')}</div><figcaption class="mono" style="font-size:.72rem">${CELLNAME[j]}${j < 3 ? ' ' + esc(live.chain.packets[w.tokens[j]].token) : ' = α<span class="op">⊕</span>β<span class="op">⊕</span>γ'}</figcaption></figure>`;
    }).join('');
    const rows = [1, 2, 3, 4].map(d => `<span>τ${d}${d === 1 ? ' root' : ''}</span><span>${now[d].slice(0, 20)}…</span><span class="${now[d] === W.tau0[d] ? 'ok' : 'no'}">${now[d] === W.tau0[d] ? '= recorded' : '≠ recorded'}</span>`).join('');
    $('word').innerHTML = `<div class="readout"><span>word <b>@${w.addr}</b></span><span>zero point <b>${w.F}</b></span><span>cells ${toks.join(', ')}</span>${live.isProvisional(w) ? '<span>provisional</span>' : ''}</div>` +
        `<div class="cells4" style="margin-top:8px">${figs}</div><div class="chainrows">${rows}</div>` +
        `<div class="readout" style="margin-top:6px"><span>parity α<span class="op">⊕</span>β<span class="op">⊕</span>γ<span class="op">⊕</span>Y = 0: <b class="${W.parityOk() ? 'good' : 'bad'}">${W.parityOk() ? 'yes' : 'no'}</b></span><span>link <b>${w.link}</b></span></div>`;
}
function currentWord() { const vw = visibleWords(view.F); return view.word !== null && view.word < vw ? live.words[view.word] : null; }
function alter(j, i) {
    const w = currentWord();
    if (!w) return;
    const W = w.word;
    if (!W.orig) W.orig = W.cells.slice();
    W.cells[j] ^= 1n << BigInt(i);
    view.wordFollow = false;
    $('m-verdict').innerHTML = `flipped bit ${i} of ${CELLNAME[j]}: parity ${W.parityOk() ? '<span class="bad">still 0, fooled</span>' : '<span class="good">notices</span>'}`;
    afterMemoryChange();
}
function afterMemoryChange() { renderMemory(); renderRes(); drawMap(); renderChips(); }

// ------------------------------------------------------------------ the register
function renderRegister() {
    if (!regs.length) return;
    const F = view.F, R = regs.find(x => x.r === view.reg) || regs[regs.length - 1], r = R.r;
    const pickKey = regs.map(x => `${x.r}${x.complete && F >= 720 * (x.r + 1) ? '+' : ''}`).join(',') + `|${r}|${view.regFollow}`;
    if ($('reg-pick').dataset.key !== pickKey) {                 // rebuilt only when it changes, so clicks are not lost mid-play
        $('reg-pick').dataset.key = pickKey;
        $('reg-pick').innerHTML = '<span class="help" style="margin:0">register</span> ' + regs.map(x => `<button class="chip${x.r === r ? ' on' : ''}" type="button" data-r="${x.r}">${x.r}${x.complete && F >= 720 * (x.r + 1) ? ' ✓' : ''}</button>`).join('') +
            `<label><input type="checkbox" id="reg-follow"${view.regFollow ? ' checked' : ''}> follow</label>`;
    }
    const done = Math.max(0, Math.min(720, Math.floor(F) - 720 * r)), closed = R.complete && F >= 720 * (r + 1);
    $('reg-prog').style.width = (100 * done / 720).toFixed(2) + '%';
    let inNow = 0; const counts = new Array(72).fill(0);
    for (const [t] of R.packets) { const s = live.sched[t]; if (s.off <= F) { counts[EC.place(s.off)[1]]++; inNow++; } }
    const cur = F > 720 * r && F <= 720 * (r + 1) ? EC.place(Math.floor(F))[1] : -1;
    const blocks = $('blocks');
    if (!blocks.dataset.built) {                 // one row per group: the 72 blocks fall into 10 groups by m -> floor(10m / 72)
        blocks.dataset.built = '1';
        blocks.innerHTML = Array.from({ length: 10 }, (_, l) => `<div class="grp" data-l="${l}"><span>g${l}</span>` +
            Array.from({ length: 72 }, (_, m) => m).filter(m => Math.floor(10 * m / 72) === l).map(m => `<i data-m="${m}" title="block ${m} (frames ${10 * m + 1}–${10 * m + 10} of the register), group ${l}"></i>`).join('') + '</div>').join('');
    }
    blocks.querySelectorAll('i[data-m]').forEach(el => { const m = +el.dataset.m; el.className = (counts[m] ? 'n' + Math.min(3, counts[m]) : '') + (m === cur ? ' now' : ''); });
    blocks.querySelectorAll('.grp').forEach(g => g.classList.toggle('now', cur >= 0 && +g.dataset.l === Math.floor(10 * cur / 72)));
    $('reg-read').innerHTML = `<span>frames <b>${720 * r + 1}–${720 * (r + 1)}</b></span><span>elapsed <b>${done}</b>/720</span><span>packets latched <b>${inNow}</b>${R.complete ? `/${R.count}` : ''}</span>` +
        (cur >= 0 ? `<span>block <b>${cur}</b> · group <b>${Math.floor(10 * cur / 72)}</b></span>` : '');
    const key = `${r}|${closed}`;
    if ($('reg-checks').dataset.key === key) return;
    $('reg-checks').dataset.key = key;
    if (!closed) {
        $('reg-checks').innerHTML = `<p class="help">Closes at frame ${720 * (r + 1)}. Then its packet, block and group products are compared (720 → 72 → 10), the product is unfolded back into its packets, and each engine&rsquo;s pump is read in free-run, where it returns to zero.</p>`;
        return;
    }
    const ok = b => `<span class="${b ? 'good' : 'bad'}">${b ? 'yes' : 'no'}</span>`;
    $('reg-checks').innerHTML = `<div class="readout" style="margin:6px 0"><span>telescopes ${ok(R.telescopes)}</span><span>unfolds into its ${R.count} packets ${ok(R.unfolds)}</span></div>` +
        `<table class="small"><thead><tr><th>engine</th><th>free-run: engaged · P · H</th><th>closes</th><th>hold: P · H</th><th>H = P⁻¹</th></tr></thead><tbody>` +
        [0, 1, 2].map(ch => { const f = R.pumpFree[ch], hd = R.pumpHold[ch]; return `<tr><td style="color:${CHCOL[ch]}">${ENG[ch]} · ${CH[ch]}</td><td>${f.engaged} · ${f.P} · ${f.H}</td><td>${ok(f.closed)}</td><td>${hd.P} · ${hd.H}</td><td>${ok(hd.identity && f.identity)}</td></tr>`; }).join('') +
        `</tbody></table>`;
}

// ------------------------------------------------------------------ the memory tree in H^2
const EMB = new C.TreeEmbedding(1.6), NODE = new Map();     // tau 1.6 [DESIGN]: branches apart, leaves off the rim
const disk = word => { const y = EMB.point(word); return [y[1] / (1 + y[0]), y[2] / (1 + y[0])]; };
for (let s = 0; s < 6; s++) {
    NODE.set(`${s}`, disk([s]));
    for (let c = 0; c < 5; c++) {
        const l2 = C.P.children([s])[c];
        NODE.set(`${s},${c}`, disk([s, l2]));
        for (let j = 0; j < 3; j++) NODE.set(`${s},${c},${j}`, disk([s, l2, C.P.children([s, l2])[j]]));
    }
}
let mapHits = [];
function geodesic(ctx, a, b, S, ox, oy) {
    const A = [ox + a[0] * S, oy + a[1] * S], B = [ox + b[0] * S, oy + b[1] * S], det = a[0] * b[1] - a[1] * b[0];
    ctx.beginPath();
    if (Math.abs(det) < 1e-9) { ctx.moveTo(...A); ctx.lineTo(...B); ctx.stroke(); return; }
    const da = (a[0] ** 2 + a[1] ** 2 + 1) / 2, db = (b[0] ** 2 + b[1] ** 2 + 1) / 2;
    const cx = (da * b[1] - db * a[1]) / det, cy = (a[0] * db - b[0] * da) / det, r = Math.hypot(a[0] - cx, a[1] - cy);
    const t1 = Math.atan2(a[1] - cy, a[0] - cx); let d = Math.atan2(b[1] - cy, b[0] - cx) - t1;
    while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    ctx.arc(ox + cx * S, oy + cy * S, r * S, t1, t1 + d, d < 0); ctx.stroke();
}
function drawMap() {
    if (!regs.length) return;
    const { ctx, w, h } = fit($('cv-map'), 1), S = Math.min(w, h) / 2 - 8, ox = w / 2, oy = h / 2, F = view.F;
    const R = regs.find(x => x.r === view.reg) || regs[regs.length - 1];
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(ox, oy, S, 0, 2 * Math.PI); ctx.stroke();
    const leaf = new Map(), wordAt = new Map();
    for (const [t] of R.packets) { const pos = EC.positionOf(live.sched[t].off); leaf.set(`${pos.s},${pos.c},${pos.j}`, t); }
    live.words.forEach((wd, k) => { if (EC.place(wd.F)[0] === R.r) { const pos = EC.positionOf(wd.F - 2); wordAt.set(`${pos.s},${pos.c}`, k); } });
    ctx.lineWidth = 1;
    for (let s = 0; s < 6; s++) {
        ctx.strokeStyle = '#334155'; geodesic(ctx, [0, 0], NODE.get(`${s}`), S, ox, oy);
        for (let c = 0; c < 5; c++) {
            ctx.strokeStyle = '#1e3a4a'; geodesic(ctx, NODE.get(`${s}`), NODE.get(`${s},${c}`), S, ox, oy);
            for (let j = 0; j < 3; j++) { const t = leaf.get(`${s},${c},${j}`); ctx.strokeStyle = t !== undefined && live.sched[t].off <= F ? '#2b4b5c' : '#111c2c'; geodesic(ctx, NODE.get(`${s},${c}`), NODE.get(`${s},${c},${j}`), S, ox, oy); }
        }
    }
    mapHits = [];
    for (const [key, pt] of NODE) {
        const depth = key.split(',').length, x = ox + pt[0] * S, y = oy + pt[1] * S;
        if (depth === 1) { ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.fill(); continue; }
        if (depth === 2) {
            const k = wordAt.get(key), wd = k !== undefined ? live.words[k] : null, shown = wd && wd.F <= F;
            ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
            if (shown) { ctx.fillStyle = intact(wd) ? '#f5c542' : '#fb7185'; ctx.fill(); if (k === view.word) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); } }
            else { ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.stroke(); }
            continue;
        }
        const t = leaf.get(key);
        if (t === undefined) continue;
        const on = live.sched[t].off <= F;
        ctx.fillStyle = on ? colorOf(live.chain.packets[t].source) : '#1e293b';
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 2 * Math.PI); ctx.fill();
        if (t === view.sel) { ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, 6, 0, 2 * Math.PI); ctx.stroke(); }
        mapHits.push([x, y, t]);
    }
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px "Fira Code", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(`register ${R.r}`, 8, 16);
    ctx.fillStyle = '#f5c542'; ctx.fillText('● word', 8, h - 26); ctx.fillStyle = SRC.human; ctx.fillText('● you', 8, h - 12); ctx.fillStyle = SRC.strix; ctx.fillText('● STRIX', 60, h - 12);
}

// ------------------------------------------------------------------ dialogue, ledger, chips
function renderMessages() {
    $('msgs').innerHTML = live.turns.map((tu, i) => {
        const rep = replies[i], last = tu.first + tu.count - 1;
        const meta = (rep ? `${rep.concept.toLowerCase()} · J ${rep.J} · reply ${rep.index + 1} of 3 · ` : i === 0 && tu.text === LIB.intro ? 'introduction · ' : tu.grids ? 'engram stream, grids only · ' : '') + (tu.count ? `${tu.count} words · #${tu.first}–#${last}` : 'no words');
        const txt = turnText(tu), short = txt.length > 700 ? txt.slice(0, 700) + ' …' : txt;
        return `<div class="msg ${tu.source}" data-first="${tu.first}" data-count="${tu.count}" tabindex="0"><div class="who" style="color:${colorOf(tu.source)}">${esc(who(tu.source))}</div><div class="txt">${esc(short)}</div><div class="meta">${meta}</div></div>`;
    }).join('');
    $('msgs').scrollTop = $('msgs').scrollHeight;
    markSelection();
}
function renderLedger() {
    const P = live.chain.packets, from = Math.max(0, P.length - 240), rows = [];
    for (let t = P.length - 1; t >= from; t--) {
        const p = P[t], s = live.sched[t], w = live.wordOf(t), c = p.concept === 255 ? '—' : EC.CONCEPT_NAMES[p.concept].toLowerCase();
        rows.push(`<tr data-t="${t}"><td>${t}</td><td>${esc(p.token)}</td><td style="color:${colorOf(p.source)}">${esc(who(p.source))}</td><td style="color:${CHCOL[s.channel]}">${ENG[s.channel]} ${CH[s.channel]}</td><td>${s.on} → ${s.off}</td><td>${p.header}</td><td>${EC.hex64(p.seed64)}</td><td>${p.footer}</td><td>${c}</td><td>${w ? `@${w.addr} · ${w.F}` : '—'}</td></tr>`);
    }
    if (from > 0) rows.push(`<tr><td colspan="10" class="help">and ${from} earlier packets (all are in the exports)</td></tr>`);
    $('ledger').innerHTML = rows.join('');
    markSelection();
}
function renderChips() {
    const P = live.chain.packets, done = regs.filter(R => R.complete).length, bad = damaged(Infinity).length, held = live.couplerLog.filter(e => e.ok).length;
    $('chips').innerHTML = [
        `<span class="stat"><b>${P.length}</b> packets</span>`, `<span class="stat">codex parity <b>${EC.hex32(live.chain.parity)}</b></span>`,
        `<span class="stat"><b>${live.words.length}</b> memory words</span>`, `<span class="stat"><b>${done}</b> register${done === 1 ? '' : 's'} closed</span>`,
        `<span class="stat ${held === live.couplerLog.length ? 'good' : 'warn'}">binding <b>${held}/${live.couplerLog.length}</b></span>`,
        `<span class="stat">chain <b>${28 * P.length}</b> letters</span>`,
        bad ? `<span class="stat warn"><b>${bad}</b> word${bad > 1 ? 's' : ''} damaged</span>` : '',
    ].join('');
}

// ------------------------------------------------------------------ exports and the self-check
function download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const clampInt = (v, lo, hi, d) => { v = parseInt(v, 10); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
function manifold() { const m = { n: clampInt($('mf-n').value, 3, 24, 8), k: clampInt($('mf-k').value, 1, 24, 3), t: clampInt($('mf-t').value, 1, 4, 2) }; $('mf-n').value = m.n; $('mf-k').value = m.k; $('mf-t').value = m.t; return m; }
function doExport(kind) {
    let e;
    if (kind === 'chain') e = EC.exportV1Chain(live.chain.packets, live.chain.parity);
    else if (kind === 'v2') e = EC.exportV2(live, { manifold: manifold() });
    else if (kind === 'owl') { e = EC.exportOwlSession(live, { manifold: manifold() }); lastOwl = e.text; $('b-snippet').textContent = loader(e.text, 160); }
    else e = EC.exportV1Crystal(live.chain.packets, kind, { manifold: manifold() });
    if (!e) return;
    download(e.name, e.text);
    $('x-note').innerHTML = `<span class="good">${esc(e.name)}</span> · ${(e.text.length / 1024).toFixed(1)} KB`;
}
async function selfCheck() {
    const out = $('checks'), line = (ok, label, detail) => { out.insertAdjacentHTML('beforeend', `<div><span class="${ok ? 'good' : 'bad'}">${ok ? 'PASS' : 'FAIL'}</span> ${esc(label)}${detail ? ` <span class="help">· ${esc(detail)}</span>` : ''}</div>`); };
    const tick = () => new Promise(r => setTimeout(r, 0));
    out.innerHTML = ''; $('b-check').disabled = true;
    try {
        line(EC.hexLsb(EC.crystallize('GEODESIC')) === '5c896a4801c9c24c', 'engram/1 key: GEODESIC → 5c896a4801c9c24c, as in Owl Academy'); await tick();
        const n = live.chain.packets.length, withCoupler = n <= 300;
        if (live.turns.some(t => t.grids)) { line(true, 'Live = Session is not compared: an engram stream has no tokens for the reference Session', 'the bridges tests compare it by its grids instead'); }
        else {
            const S = new EC.Session(live.turns.map(t => [t.source, t.tokens]), withCoupler ? 'carry' : null);
            const j = x => JSON.stringify(x, (k, v) => (typeof v === 'bigint' ? String(v) : v));
            // the reference twin computes the words as written; compare against the record, not any alterations made here
            const rec = live.outputs(); rec.words = live.words.map(w => [w.F, w.addr, (w.word.orig || w.word.cells).map(EC.hex64), w.root, w.link]);
            const same = j(rec) === j(S.outputs()) && (!withCoupler || j(live.couplerLog.map(e => [e.F, e.B, e.ok])) === j(S.coupler.log.map(e => [e.F, e.B, e.ok])));
            line(same, 'this page\'s Live session = the reference Session on the same turns', `${n} packets, ${live.words.length} words, ${regs.length} registers${withCoupler ? ', coupler included' : ', coupler compared only up to 300 packets'}`); await tick();
        }
        line(live.couplerLog.every(e => e.ok), 'the binding B = q₂q₁ held at every zero point', `${live.couplerLog.length} zero points`);
        const bad = damaged(Infinity);
        line(true, bad.length ? `memory: ${bad.length} word(s) you damaged are flagged by their Merkle roots` : 'memory: every word\'s Merkle root matches its record', `${live.words.length} words`);
        const done = regs.filter(R => R.complete);
        line(done.every(R => R.telescopes && R.unfolds && R.pumpFree.every(p => p.closed && p.identity)), 'every complete register telescopes, unfolds and closes in free-run', `${done.length} complete`); await tick();
        const word = live.addresses.flat();
        line(C.P.isReduced(word) && live.quats.every(q => EC.qnorm(q) === 5n ** 28n), 'the chain address is one reduced word; every packet quaternion has norm 5^28', `${word.length} letters`);
        const v1 = JSON.parse(EC.exportV1Chain(live.chain.packets, live.chain.parity).text);
        line(v1.length === n && v1.every((e, t) => e.packet_meta.codex_parity_hex === live.chain.packets[t].header && e.system_header.seed_state.join('') === live.chain.packets[t].grid.join('')), 'the v1 chain export reads back: every header and seed state', `${v1.length} entries`);
        const a = EC.exportV2(live, { generatedAt: 'x' }).text, b = EC.exportV2(live, { generatedAt: 'x' }).text;
        line(a === b, 'the v2 export is deterministic', `${(a.length / 1024).toFixed(0)} KB`);
    } catch (e) { line(false, 'the self-check stopped: ' + e.message); }
    $('b-check').disabled = false;
}

// ------------------------------------------------------------------ wiring
$('composer').addEventListener('submit', e => { e.preventDefault(); const v = $('say').value; $('say').value = ''; send(v); });
$('say').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('composer').requestSubmit(); } });
$('b-new').addEventListener('click', () => { if (live.turns.length > 1 && !confirm('Start a new session? The dialogue kept in this browser will be cleared.')) return; try { localStorage.removeItem(KEY); } catch (e) { /* storage unavailable */ } start({ humans: [] }); });
$('b-play').addEventListener('click', () => { view.playing = !view.playing; $('b-play').textContent = view.playing ? 'Pause' : 'Play'; });
$('b-end').addEventListener('click', () => { view.F = view.target; onFrame(true); });
$('b-replay').addEventListener('click', () => { view.F = view.replayFrom; view.playing = true; $('b-play').textContent = 'Pause'; Object.assign(view, { follow: true, wordFollow: true, regFollow: true }); $('t-follow').checked = true; onFrame(true); });
$('b-step').addEventListener('click', () => {
    let next = Infinity;
    for (const s of live.sched) { if (s.on > view.F) next = Math.min(next, s.on); if (s.off > view.F) next = Math.min(next, s.off); }
    for (const w of live.words) if (w.F > view.F) next = Math.min(next, w.F);
    if (next <= view.target) { view.F = next; view.playing = false; $('b-play').textContent = 'Play'; onFrame(true); }
});
$('speed').addEventListener('change', e => { view.speed = +e.target.value; });
$('t-prev').addEventListener('click', () => select(view.sel - 1));
$('t-next').addEventListener('click', () => select(view.sel + 1));
$('t-follow').addEventListener('change', e => { view.follow = e.target.checked; if (view.follow) { view.wordFollow = true; onFrame(true); } });
$('msgs').addEventListener('click', e => { const m = e.target.closest('.msg'); if (m && +m.dataset.count) select(+m.dataset.first); });
$('ledger').addEventListener('click', e => { const tr = e.target.closest('tr[data-t]'); if (tr) select(+tr.dataset.t); });
$('addr-grid').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; view.word = +b.dataset.k; view.wordFollow = false; $('m-verdict').textContent = ''; renderMemory(); drawMap(); });
$('word').addEventListener('click', e => { const i = e.target.closest('i[data-i]'), g = e.target.closest('.grid8[data-j]'); if (i && g) alter(+g.dataset.j, +i.dataset.i); });
$('m-flip').addEventListener('click', () => alter(Math.floor(Math.random() * 4), Math.floor(Math.random() * 64)));
$('m-locate').addEventListener('click', () => {
    const w = currentWord(); if (!w) return;
    const j = w.word.locate();
    $('m-verdict').innerHTML = j === null ? '<span class="good">nothing differs from the recorded chain</span>' : `Lemma 15: the deepest layer that differs is τ${j + 1}, so the altered cell is <b>${CELLNAME[j]}</b>`;
});
$('m-repair').addEventListener('click', () => {
    const w = currentWord(); if (!w) return;
    const [v, j] = w.word.repair();
    $('m-verdict').innerHTML = v === 'intact' ? '<span class="good">intact: nothing to repair</span>' : v === 'repaired' ? `<span class="good">repaired</span> ${CELLNAME[j]} from the other three; the root matches its record again` : `<span class="bad">refused</span>: rebuilding ${j === null ? 'no cell' : CELLNAME[j]} does not restore the root, so more than one cell changed`;
    if (v === 'repaired' && w.word.orig && w.word.cells.every((c, k) => c === w.word.orig[k])) delete w.word.orig;
    afterMemoryChange();
});
$('m-restore').addEventListener('click', () => { const w = currentWord(); if (!w || !w.word.orig) return; w.word.cells = w.word.orig.slice(); delete w.word.orig; $('m-verdict').textContent = 'restored as written'; afterMemoryChange(); });
$('reg-pick').addEventListener('click', e => { const b = e.target.closest('button[data-r]'); if (!b) return; view.reg = +b.dataset.r; view.regFollow = false; $('reg-checks').dataset.key = ''; renderRegister(); drawMap(); });
$('reg-pick').addEventListener('change', e => { if (e.target.id === 'reg-follow') { view.regFollow = e.target.checked; onFrame(true); } });
$('cv-map').addEventListener('click', e => {
    const r = e.target.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 12;
    for (const [hx, hy, t] of mapHits) { const d = Math.hypot(hx - x, hy - y); if (d < bd) { bd = d; best = t; } }
    if (best !== null) select(best);
});
$('x-chain').addEventListener('click', () => doExport('chain'));
$('x-72').addEventListener('click', () => doExport(72));
$('x-720').addEventListener('click', () => doExport(720));
$('x-v2').addEventListener('click', () => doExport('v2'));
$('x-owl').addEventListener('click', () => doExport('owl'));

// ------------------------------------------------------------------ Owl Academy, in and out
let pending = null, lastOwl = null;
const loader = (text, cut) => `localStorage.setItem('engram_mind_eye_v1', JSON.stringify(${cut && text.length > cut ? text.slice(0, cut) + ' … ' : text})); location.reload();`;
const STORE = [...new Set(EC.tokenize(LIB.intro + ' ' + LIB.concepts.flatMap(c => c.responses).join(' ')))];
const yieldTask = () => new Promise(r => setTimeout(r, 0));
const importLine = (ok, label, detail) => `<div><span class="${ok === true ? 'good' : ok === false ? 'bad' : 'help'}">${ok === true ? 'PASS' : ok === false ? 'FAIL' : 'NOTE'}</span> ${esc(label)}${detail ? ` <span class="help">· ${esc(detail)}</span>` : ''}</div>`;
let importRun = 0, passOn = null;
// a biochain record or package: the checked import (engram_core.js importBiochainCheckedSteps on biochain_v2.js), run
// step by step so the page draws between the steps; its two verdicts, the engram cross-check, the kind and where the
// record says it came from; the signer (Web Crypto) after that
async function readChecked(obj, run) {
    const out = $('b-out'), BC2 = window.BiochainV2;
    let r;
    const g = EC.importBiochainCheckedSteps(BC2, obj);
    for (let s = g.next(); ; s = g.next()) {
        if (s.done) { r = s.value; break; }
        out.innerHTML = importLine(null, `checking: ${s.value.label}`, s.value.done ? `${s.value.done} words` : '');
        await yieldTask();
        if (run !== importRun) return;
    }
    const st = r.strict, pv = r.provenance, yesNo = v => (v === true ? 'yes' : v === false ? 'no' : 'not checked here');
    // the Owl-compatible line names the line below it that failed: Owl Academy's verifyIntegrity steps (checks[0]) or
    // this system's engram stream (checks[1])
    const owlDetail = r.owlCompatible ? 'the record agrees with itself: Owl Academy\'s verifyIntegrity steps and this system\'s engram stream' :
        r.checks[0].ok === false ? 'Owl Academy\'s verifyIntegrity steps fail' : 'this system\'s engram stream of the text differs from the record\'s';
    out.innerHTML = `<div class="help" style="margin:2px 0 4px">${esc(r.label)} · ${esc(r.verdict)}</div>` +
        importLine(st.ok, `strict: ${st.label}`, st.ok ? 'parity, canonical, crystal, leaves, weaves, derived (RFC 07)' : st.detail) +
        importLine(r.owlCompatible, `Owl-compatible: ${r.owlCompatible ? 'ok' : 'failed'}`, owlDetail) +
        r.checks.map(c => importLine(c.ok, c.label, c.detail)).join('') +
        (r.engrams ? importLine(r.engrams.agree, 'Owl Academy\'s engram layer and this system\'s agree on the text', `${r.engrams.tokens} words, ${r.engrams.distinct} distinct`) : '') +
        importLine(r.recordKindGiven === null || r.recordKind !== null ? null : false, 'kind', r.recordKind || (r.recordKindGiven ? `${r.recordKindGiven}: not in Owl Academy's registry` : 'none given')) +
        (pv.from === 'record' ? importLine(null, 'a bare record: no package, so nothing says who grew it') :
            importLine(pv.contentMatches === false || pv.contentHashOk === false ? false : null, `from a ${pv.from === 'lexicon-package' ? 'Hyperbolic Lexicon package' : 'biochain-package/1'}: attests ${pv.attests || 'nothing'}`,
                `content is this record's: ${yesNo(pv.contentMatches)} (${pv.contentDetail}); its hash is the attestation's: ${yesNo(pv.contentHashOk)}; signer ${pv.signer || 'none'}${pv.manifest ? '; with a corpus manifest' : ''}`));
    if (r.turns && r.turns.length) { pending = r; $('b-load').disabled = false; $('b-load').textContent = r.verified && st.ok ? 'Load as this session' : 'Load it anyway'; }
    // passed on only when exportBiochainPackage would write it: strict ok, an attestation, a kind, the content this
    // record's (or rebuilt from it) and its hash the attestation's; a Tier-P LPREP/1 is not (no package field for its salt)
    if (st.ok && r.attestation && pv.tier === 'P') out.insertAdjacentHTML('beforeend', importLine(null, 'not passed on: a Tier-P LPREP/1 needs its salt, and biochain-package/1 has no field for it yet'));
    else if (st.ok && r.attestation && pv.contentMatches !== false && pv.contentHashOk !== false) {
        const inp = EC.biochainInputOf(obj), kind = r.recordKind || (pv.from === 'lexicon-package' ? 'language-shard' : null);
        if (kind) {
            const manifest = pv.from === 'lexicon-package' ? { lcorpus: obj.lcorpus, inclusion: obj.inclusion, lgrow: obj.lgrow, consistency: obj.consistency } : obj.manifest;
            passOn = { record: inp.record, attestation: r.attestation, opts: { BC2, kind, attests: pv.attests || 'GROWN/1', content: pv.content === null ? undefined : pv.content, manifest, registry: obj.registry } };
            $('b-pass').hidden = false;
        }
    }
    if (r.attestation) {
        const s = await EC.checkSigner(obj.format === 'biochain-package/1' ? obj : { attestation: r.attestation });
        if (run !== importRun) return;
        out.insertAdjacentHTML('beforeend', s.checks.map(c => importLine(c.ok, `signer: ${c.label}`, c.detail)).join('') +
            importLine(null, 'whether that key may sign is not checked here', 'that needs the key registry'));
    }
}
async function readImport() {
    const out = $('b-out'), text = $('b-text').value, run = ++importRun;
    pending = null; passOn = null; $('b-load').disabled = true; $('b-pass').hidden = true;
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) { obj = null; }
    if (obj && window.BiochainV2 && EC.biochainInputOf(obj)) {
        try { await readChecked(obj, run); } catch (e) { if (run === importRun) out.innerHTML = importLine(false, e.message); }
        return;
    }
    let r;
    try { r = EC.importAny(text, { LS: window.LatticeSeedV1, BC: window.BiochainV1, store: STORE }); }
    catch (e) { out.innerHTML = importLine(false, e.message); return; }
    out.innerHTML = `<div class="help" style="margin:2px 0 4px">${esc(r.label)}</div>` + r.checks.map(c => importLine(c.ok, c.label, c.detail)).join('');
    if (r.turns && r.turns.length) { pending = r; $('b-load').disabled = false; $('b-load').textContent = r.verified ? 'Load as this session' : 'Load it anyway'; }
    else if (r.kind === 'lattice_seed' || r.kind === 'environment') out.insertAdjacentHTML('beforeend', importLine(null, 'lattice seeds and environments are shown on the 3D page: paste it in its LATTICE-SEED/1 panel'));
}
$('b-pass').addEventListener('click', () => {
    if (!passOn) return;
    try { const e = EC.exportBiochainPackage(passOn.record, passOn.attestation, passOn.opts); download(e.name, e.text); $('b-out').insertAdjacentHTML('beforeend', importLine(true, `written ${e.name}`, 'for Owl Academy\'s package import')); }
    catch (e) { $('b-out').insertAdjacentHTML('beforeend', importLine(false, e.message)); }
});
$('b-backup').addEventListener('click', () => {
    const e = EC.exportV2(live, { manifold: manifold() }), name = e.name.replace('engram_mind_eye_v2_', 'engram_mind_eye_backup_');
    download(name, e.text);
    $('save-note').textContent = `Backed up as ${name}. Kept in this browser too.`;
});
$('b-read').addEventListener('click', readImport);
$('b-file').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; $('b-text').value = await f.text(); e.target.value = ''; readImport(); });
$('b-load').addEventListener('click', () => {
    if (!pending) return;
    if (live.turns.length > 1 && !confirm('Replace the dialogue kept in this browser with the import?')) return;
    if (pending.manifold) { $('mf-n').value = pending.manifold.n; $('mf-k').value = pending.manifold.k; $('mf-t').value = pending.manifold.t; }
    start({ turns: pending.turns }); save();
    $('b-out').insertAdjacentHTML('beforeend', `<div><span class="good">LOADED</span> ${live.chain.packets.length} packets, ${live.words.length} memory words, ${regs.length} register(s)</div>`);
    pending = null; $('b-load').disabled = true;
});
$('b-copy').addEventListener('click', async () => {
    const text = lastOwl || EC.exportOwlSession(live, { manifold: manifold() }).text, snippet = loader(text);
    try { await navigator.clipboard.writeText(snippet); $('b-copied').textContent = `copied (${(snippet.length / 1024).toFixed(0)} KB)`; }
    catch (e) { $('b-snippet').textContent = snippet; $('b-copied').textContent = 'the clipboard is blocked here: the whole loader is in the box above, select and copy it'; }
});
$('b-check').addEventListener('click', selfCheck);
let rz = null;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { clockDirty = true; renderRes(); drawMap(); }, 120); });

start(loadSaved());
requestAnimationFrame(tick);
window.__mindEye = { live: () => live, view, send, select, selfCheck };
})();
