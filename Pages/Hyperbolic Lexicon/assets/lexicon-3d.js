// Hyperbolic Lexicon, the 3D page (lexicon-3d.html; Phase 5). Everything it shows is computed by the page engine
// (assets/hl-pages.js, LexiconPages) on lexicon_core.js and the shared cores: the pair's tokens and addresses, the named
// tree and its views, the exact chart of the centre (an isometry in BigInt, floats only at the last step), the frames,
// decoding and bits, X(5, q) and the coupler. The shard, Engram Mind's Eye and checks panels are hl-panels.js's. This
// file only draws and asks (one exception, marked at frameOf: the frames' directions); the renderer follows Engram
// Mind's Eye's mind-eye-3d.js (canvas 2D, yaw and pitch, perspective 1/(1 - 0.18 z), back-to-front painting with
// fade, triads). Test hooks: body[data-ready|tokens|centre|selected], #p-sel[data-decoded], #p-twin[data-held],
// #cv-lps[data-vertex]; window.__lexicon3d. It decides no claim.
(function () {
'use strict';
const LP = window.LexiconPages, UI = window.LexiconPanels, LC = window.LexiconCore;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const body = document.body;
const GEN = ['i', 'I', 'j', 'J', 'k', 'K'], QS = [13, 17, 29], FRAME_LEN = 17, TOK_PAGE = 64, HIST = 50, COUPLE_MAX = 192, FRAME_BUDGET_MS = 8;
const STORE = 'hyperbolic-lexicon/pages/1', SLOT = '3d';            // the 2D page keeps its own slot, '2d', in the same object
const EXAMPLES = [
    ['The dog chased the cat.', 'The cat climbed the tree.'],
    ['Is oxygen a gas?', 'Yes, and so is nitrogen.'],
    ['She can run.', ''],
];
const SEG = ['A', 'B'];
const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// hl-panels.js's fitCanvas keeps Engram's 200 px floor; the page's small canvases (the triads, X(5, q)) use the same
// sizing without it, so they are never drawn wider than they are shown
function fitSmall(cv, ratio) {
    const w = Math.max(60, Math.round(cv.clientWidth || (cv.parentElement && cv.parentElement.clientWidth) || 200)), h = Math.round(w * ratio), d = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    cv.style.height = h + 'px';
    const ctx = cv.getContext('2d');
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
}
const good = s => `<span class="good">${s}</span>`, bad = s => `<span class="bad">${s}</span>`, faint = s => `<span class="faint">${s}</span>`;
const mark = ok => (ok === true ? good('✓') : ok === false ? bad('✗') : faint('·'));

if (!LP || !UI || !LC) {
    document.querySelector('.board').insertAdjacentHTML('afterbegin', '<section class="panel"><p class="err">One of the page&rsquo;s modules did not load (lexicon_core.js, hl-pages.js or hl-panels.js).</p></section>');
    body.dataset.ready = 'error';
    return;
}

let Lex = null, loadErr = null, PAL = UI.palette();
const st = {
    A: EXAMPLES[0][0], B: EXAMPLES[0][1], an: null, keys: [], paths: [],
    centre: '', hist: [], sel: null, sibPage: 0, childPage: 0, extra: [], session: null,
    yaw: 0.6, pitch: 0.35, zoom: 1, spread: 3, mode: 'ball', q: 13, skip: null, tokPage: 0,
    geo: null, proj: [], dirty: true, lpsDirty: true, framesPending: false, cpl: null,
};

// ------------------------------------------------------------------ storage (per-viewer conveniences only)
function readStore() {
    try { const s = JSON.parse(localStorage.getItem(STORE) || 'null'); return s && typeof s === 'object' && s[SLOT] && typeof s[SLOT] === 'object' ? s[SLOT] : null; } catch (e) { return null; }
}
function save() {
    try {
        let all = null;
        try { all = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { all = null; }
        if (!all || typeof all !== 'object' || Array.isArray(all)) all = {};
        all[SLOT] = { a: st.A, b: st.B, mode: st.mode, spread: st.spread, q: st.q,
            frames: $('v-frames').checked, tree: $('v-tree').checked, labels: $('v-labels').checked, paths: $('v-paths').checked, turn: $('v-turn').checked };
        localStorage.setItem(STORE, JSON.stringify(all));
    } catch (e) { /* storage unavailable: nothing is kept */ }
}
function readHash() {
    try {
        const h = location.hash.replace(/^#/, '');
        if (!h) return null;
        const p = new URLSearchParams(h);
        if (!p.has('a') && !p.has('b')) return null;
        return { a: p.get('a') || '', b: p.get('b') || '' };
    } catch (e) { return null; }
}
function writeHash() {
    try { history.replaceState(null, '', `#a=${encodeURIComponent(st.A)}&b=${encodeURIComponent(st.B)}`); } catch (e) { /* a sandboxed frame may refuse */ }
}

// ------------------------------------------------------------------ names
const nodeOf = k => Lex.node(k);
function tokenOfKey(k) { return st.an ? st.an.tokens.find(t => t.key === k) || null : null; }
function shortName(k) {
    const n = nodeOf(k);
    if (!n) return k;
    if (n.kind === 'origin') return 'origin';
    if (n.kind === 'root') return LP.ROOTS[n.root].short + ' root';
    const t = tokenOfKey(k);
    if (t) return t.piece;
    if (n.kind === 'noun' || n.kind === 'verb') return n.name;
    return n.name;
}
function longName(k) { const n = nodeOf(k); return n ? Lex.label(n) : k; }
const rootOf = n => (n.kind === 'origin' ? null : n.word[0]);
function wordHtml(k) {
    if (k === '') return '<span class="faint">(the empty word)</span>';
    return Lex.edges(k).map(e => `<span>${e[0]}</span>${e.length > 1 ? `<span class="v">${e.slice(1).join('')}</span>` : ''}`).join('<span class="sep">·</span>');
}

// ------------------------------------------------------------------ the pair
function setPair(A, B) {
    st.A = String(A); st.B = String(B);
    st.an = Lex.analyse(st.A, { pair: [st.A, st.B] });
    const toks = st.an.tokens;
    st.keys = [...new Set(toks.map(t => t.key))];
    // LCA paths: consecutive distinct synset tokens, in BERT order
    const syn = toks.filter(t => t.synset).map(t => t.key), paths = [];
    for (let i = 1; i < syn.length; i++) if (syn[i] !== syn[i - 1] && !paths.some(p => p[0] === syn[i - 1] && p[1] === syn[i])) paths.push([syn[i - 1], syn[i]]);
    st.paths = paths;
    if (st.skip !== null && st.skip >= toks.length) st.skip = null;
    st.tokPage = 0;
    const first = toks.find(t => t.synset) || toks[1] || toks[0] || null;
    st.sel = first ? first.key : '';
    st.hist = []; st.sibPage = st.childPage = 0;
    st.centre = Lex.defaultCentre(st.an);
    body.dataset.tokens = String(toks.length);
    writeHash(); save();
    renderInput(); renderTokens(); renderTwin(); rebuild(); renderSel();
}
const pairText = () => (st.B.trim() ? st.A + '\n' + st.B : st.A);

// ------------------------------------------------------------------ the view: exact chart, then floats
function extraKeys() {
    const out = st.keys.slice();
    for (const k of st.extra) out.push(k);
    if (st.session) for (const w of st.session.words) out.push(w.key);
    return out;
}
function rebuild() {
    const t0 = performance.now();
    let v;
    try { v = Lex.view(st.centre, { extra: extraKeys(), paths: $('v-paths').checked ? st.paths : [], siblingPage: st.sibPage, childPage: st.childPage }); }
    catch (e) { st.centre = ''; v = Lex.view('', { extra: extraKeys() }); }
    const ch = Lex.chart(3, st.centre), placed = new Map();
    const P = w => { const k = typeof w === 'string' ? w : LC.wordStr(w); let p = placed.get(k); if (!p) { const pl = ch.place(w); p = { d: pl.d, u: pl.u }; placed.set(k, p); } return p; };
    const geo1 = (a, b, n) => ch.geodesic(a, b, n).map(x => ({ d: x.d, u: x.u }));
    const nodes = v.nodes.map(n => ({ key: n.key, rel: n.rel, node: nodeOf(n.key), p: P(n.key) }));
    // edges letter by letter: each letter is one geodesic step of length ln 7 in the tree
    const steps = [];
    for (const e of v.edges) {
        const w = nodeOf(e.to).word;
        for (let j = e.from.length; j < w.length; j++) steps.push({ pts: geo1(w.slice(0, j), w.slice(0, j + 1), 4), hidden: e.hidden > 0 });
    }
    const virtual = v.virtual.map(x => P(x.word));
    const paths = [];
    if ($('v-paths').checked) for (const [a, b] of st.paths) {
        const l = Lex.lca(a, b), pw = l.pathWords, pts = [];
        for (let i = 1; i < pw.length; i++) { const seg = geo1(pw[i - 1], pw[i], 4); pts.push(...(i === 1 ? seg : seg.slice(1))); }
        paths.push({ a, b, named: l.named, pts });
    }
    let maxD = 1e-9;
    for (const n of nodes) maxD = Math.max(maxD, n.p.d);
    const session = new Map();
    if (st.session) for (const w of st.session.words) {
        let src = 'unknown', best = -1;
        for (const [s, c] of Object.entries(w.bySource)) if (c > best) { best = c; src = s; }
        session.set(w.key, { src, count: w.count });
    }
    st.geo = { v, ch, nodes, steps, virtual, paths, frames: new Map(), maxD, session, extra: new Set(st.extra), ms: performance.now() - t0 };
    body.dataset.centre = st.centre;
    renderPaging(); renderRead();
    st.dirty = true;
}
// A token's frame where it is drawn. Chart.frameAxes gives the endpoints of three arms of length 0.6, but far from the
// centre (most tokens: dog is 17 letters from organism, d = 25.5) the ball shrinks them below a pixel and float
// endpoints lose their sideways part. So the page draws each frame as a triad of fixed screen size, turned as the
// frame is turned at that point of the conformal Poincare ball: the rotation part K of the chart isometry
// T = M_c^-1 L_x (T = L_y K with L_y the boost to y = T e0; a boost's differential at the origin of the ball is a
// scalar), applied to R(q)'s columns. T, L_y and K are exact (Q), from the core's integer frame (LC.h3Frames, as
// Lex.chart uses it) and hyperbolic_core.js's boost; floats only at the end. At the centre it equals frameAxes's
// directions (checked in tests/pages-chromium-3d.cjs). An engine request: Chart.frameDirs(x).
function frameOf(key, deadline = Infinity) {
    const g = st.geo;
    if (!g || key === '' || key === null) return null;
    let f = g.frames.get(key);
    if (!f) {
        if (performance.now() > deadline) { st.framesPending = true; return null; }   // drawn on a later frame
        const C = window.HPCore, Q = C.Q, cw = Lex.wordOf(st.centre), w = Lex.wordOf(key), J = [-1n, 1n, 1n, 1n];
        const N = LC.h3Frames([cw])[0], dc = LC.h3Den(cw.length), pt = Lex.point(3, w);
        const Minv = N.map((row, i) => row.map((v, j) => new Q(J[i] * J[j] * v, dc)));
        const T = C.X.matmul(Minv, C.X.boost(pt.X.map(v => new Q(v, pt.den))));
        const K = C.X.matmul(C.X.lorentzInverse(C.X.boost(T.map(r => r[0]))), T).slice(1).map(r => r.slice(1).map(e => LP.ratio(e.n, e.d)));
        const R = Lex.rotation(w).f;
        f = [0, 1, 2].map(k => [0, 1, 2].map(i => K[i][0] * R[0][k] + K[i][1] * R[1][k] + K[i][2] * R[2][k]));
        g.frames.set(key, f);
    }
    return f;
}
const rot = p => {
    const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const x = cy * p[0] + sy * p[1], y1 = -sy * p[0] + cy * p[1];
    return [x, cp * p[2] - sp * y1, sp * p[2] + cp * y1];
};
function camera(w, h) {
    const ball = st.mode === 'ball', R0 = (Math.min(w, h) / 2 - 18) * st.zoom, cx = w / 2, cy = h / 2 - 4, maxD = st.geo.maxD * 1.04;
    const at3 = p => (ball ? LP.toDisk(p, st.spread) : p.u.map(x => x * Math.min(1, p.d / maxD)));
    const S = xyz => { const q = rot(xyz), s = 1 / (1 - 0.18 * q[2]); return [cx + R0 * q[0] * s, cy - R0 * q[1] * s, q[2], s]; };
    const P = p => S(at3(p));
    return { P, S, at3, R0, cx, cy, ball };
}
function polyline(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
function drawView() {
    const cv = $('cv-view'), { ctx, w, h } = UI.fitCanvas(cv, cv.clientWidth < 560 ? 1 : 0.74), g = st.geo;
    ctx.fillStyle = PAL.cvBg; ctx.fillRect(0, 0, w, h);
    if (!g) return;
    const cam = camera(w, h), { P } = cam;
    if (cam.ball) { ctx.strokeStyle = PAL.edgeFaint; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cam.cx, cam.cy, cam.R0, 0, 2 * Math.PI); ctx.stroke(); }
    // the tree, letter by letter
    if ($('v-tree').checked) {
        ctx.lineWidth = 1;
        for (const s of g.steps) {
            const pts = s.pts.map(P), z = pts.reduce((a, p) => a + p[2], 0) / pts.length;
            ctx.strokeStyle = PAL.edge; ctx.globalAlpha = 0.3 + 0.6 * Math.max(0, Math.min(1, (z + 1) / 2));
            ctx.setLineDash(s.hidden ? [3, 3] : []);
            polyline(ctx, pts);
        }
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.fillStyle = PAL.virtual;
        for (const p of g.virtual) { const [x, y, z, s] = P(p); ctx.globalAlpha = z < 0 ? 0.55 : 0.95; ctx.beginPath(); ctx.arc(x, y, 1.7 * s, 0, 2 * Math.PI); ctx.fill(); }
        ctx.globalAlpha = 1;
    }
    // paths through the lowest common ancestors
    if ($('v-paths').checked) {
        ctx.strokeStyle = PAL.path; ctx.lineWidth = 2.2; ctx.globalAlpha = 0.85;
        for (const p of g.paths) polyline(ctx, p.pts.map(P));
        ctx.globalAlpha = 1;
    }
    // the nodes, back to front, tokens with their frames
    st.proj = [];
    const frames = $('v-frames').checked, tokSet = new Set(st.keys), lcas = new Set(g.paths.map(p => p.named));
    const items = g.nodes.map(n => ({ n, q: P(n.p) })).sort((a, b) => a.q[2] - b.q[2]), framed = [], frameDeadline = performance.now() + FRAME_BUDGET_MS;
    st.framesPending = false;
    for (const { n, q } of items) {
        const [x, y, z, s] = q, fade = z < 0 ? 0.55 + 0.45 * (1 + z) : 1, isTok = tokSet.has(n.key), sess = g.session.get(n.key), r0 = rootOf(n.node);
        ctx.globalAlpha = fade;
        if (frames && (isTok || n.key === st.sel) && n.key !== '' && (n.key === st.sel || !framed.some(([fx, fy]) => Math.hypot(fx - x, fy - y) < 4))) {
            framed.push([x, y]);
            const dirs = frameOf(n.key, n.key === st.sel ? Infinity : frameDeadline);
            if (dirs) {
                const o = cam.at3(n.p), e3 = FRAME_LEN / cam.R0, arms = dirs.map((v, a) => [a, cam.S(o.map((c, i) => c + e3 * v[i])), rot(v)[2]]).sort((p1, p2) => p1[2] - p2[2]);
                for (const [a, e, dz] of arms) { ctx.strokeStyle = PAL.axes[a]; ctx.globalAlpha = fade * (dz < 0 ? 0.55 : 1); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(e[0], e[1]); ctx.stroke(); }
                ctx.globalAlpha = fade;
            }
        }
        let col, rad;
        if (n.node.kind === 'origin') { col = PAL.muted; rad = 4; }
        else if (isTok) { col = PAL.root[r0]; rad = 5.5; }
        else if (sess) { col = PAL.speaker[sess.src] || PAL.speaker.unknown; rad = 2.6 + 1.4 * Math.log2(1 + sess.count); }
        else if (g.extra.has(n.key)) { col = PAL.root[r0]; rad = 3.6; }
        else if (n.rel === 'ancestor') { col = PAL.faint; rad = 3; }
        else if (n.rel === 'centre') { col = PAL.root[r0]; rad = 4.6; }
        else if (n.rel === 'grandchild') { col = PAL.root[r0]; rad = 1.8; }
        else { col = PAL.root[r0]; rad = 2.6; }
        rad *= s;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rad, 0, 2 * Math.PI); ctx.fill();
        if (sess && isTok) { ctx.strokeStyle = PAL.speaker[sess.src] || PAL.speaker.unknown; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, rad + 2.5, 0, 2 * Math.PI); ctx.stroke(); }
        if (n.key === st.centre) { ctx.strokeStyle = PAL.text; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, rad + 4, 0, 2 * Math.PI); ctx.stroke(); }
        if (lcas.has(n.key) && $('v-paths').checked) { ctx.strokeStyle = PAL.lca; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x, y, rad + 3, 0, 2 * Math.PI); ctx.stroke(); }
        if (n.key === st.sel) { ctx.strokeStyle = PAL.sel; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, rad + 6.5, 0, 2 * Math.PI); ctx.stroke(); }
        ctx.globalAlpha = 1;
        st.proj.push([x, y, n.key, z]);
    }
    if ($('v-labels').checked) drawLabels(ctx, w, h, g, lcas, tokSet);
    ctx.fillStyle = PAL.muted; ctx.font = '11px "Fira Code", monospace'; ctx.textAlign = 'left';
    const c = nodeOf(st.centre);
    ctx.fillText(w < 560 ? `${shortName(st.centre)} · ${cam.ball ? `ball ×${st.spread}` : 'r = d'} · ${g.nodes.length} nodes` :
        `centre ${shortName(st.centre)} · depth ${c.depth} · ${c.len} letters · ${cam.ball ? `Poincaré ball · spread ×${st.spread}` : 'radius = distance'} · ${g.nodes.length} nodes`, 10, h - 10);
}
function drawLabels(ctx, w, h, g, lcas, tokSet) {
    const at = new Map(st.proj.map(p => [p[2], p])), boxes = [];
    ctx.font = '11px "Fira Code", monospace'; ctx.textAlign = 'left';
    const put = (key, text, colour, strong) => {
        const p = at.get(key);
        if (!p || !text) return;
        const tw = ctx.measureText(text).width, x = Math.min(w - tw - 6, p[0] + 7), y = Math.max(14, p[1] - 6), box = [x - 2, y - 11, tw + 4, 14];
        if (!strong && boxes.some(b => box[0] < b[0] + b[2] && b[0] < box[0] + box[2] && box[1] < b[1] + b[3] && b[1] < box[1] + box[3])) return;
        boxes.push(box);
        ctx.globalAlpha = p[3] < 0 ? 0.7 : 1;
        ctx.fillStyle = PAL.cvBg; ctx.globalAlpha *= 0.78; ctx.fillRect(box[0], box[1], box[2], box[3]);
        ctx.globalAlpha = p[3] < 0 ? 0.7 : 1;
        ctx.fillStyle = colour; ctx.fillText(text, x, y);
        ctx.globalAlpha = 1;
    };
    // tokens that land on the same pixels (far from the centre, the ball crowds them at the rim) share one label; the
    // selected token is grouped too, so a token beside it is named in its label rather than dropped
    const groups = [];
    if (st.an) for (const k of st.keys) {
        const p = at.get(k);
        if (!p) continue;
        const t = tokenOfKey(k), grp = groups.find(gr => Math.hypot(gr.x - p[0], gr.y - p[1]) < 10);
        if (grp) { grp.keys.push(k); grp.names.push(t.piece); } else groups.push({ key: k, keys: [k], x: p[0], y: p[1], names: [t.piece] });
    }
    const most = w < 560 ? 3 : 5, groupText = gr => (gr.names.length > most ? gr.names.slice(0, most).join(' · ') + ` +${gr.names.length - most}` : gr.names.join(' · '));
    const selGroup = groups.find(gr => gr.keys.includes(st.sel));
    if (selGroup) { const i = selGroup.keys.indexOf(st.sel); selGroup.names.unshift(selGroup.names.splice(i, 1)[0]); }
    if (st.sel !== null) put(st.sel, selGroup ? groupText(selGroup) : shortName(st.sel), PAL.sel, true);
    for (const gr of groups) if (gr !== selGroup) put(gr.key, groupText(gr), PAL.textStrong || PAL.text, false);
    put(st.centre, shortName(st.centre), PAL.text, false);
    for (const k of lcas) put(k, shortName(k), PAL.lca, false);
    const anc = Lex.ancestors(st.centre).slice(-4).reverse();
    for (const k of anc) put(k, shortName(k), PAL.muted, false);
    if (g.session.size) [...g.session.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 16).forEach(([k]) => put(k, shortName(k), PAL.muted, false));
    if (Lex.children(st.centre).length <= 16) for (const k of Lex.children(st.centre)) put(k, shortName(k), PAL.faint, false);
}
function drawTriad(cv, f, label) {
    const { ctx, w, h } = fitSmall(cv, 0.8), cx = w / 2, cy = h / 2 - 4, R = Math.min(w, h) * 0.34;
    ctx.fillStyle = PAL.cvBg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = PAL.edgeFaint; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, 2 * Math.PI); ctx.stroke();
    const arms = [0, 1, 2].map(a => [a, rot([f[0][a], f[1][a], f[2][a]])]).sort((x, y) => x[1][2] - y[1][2]);
    for (const [a, v] of arms) { ctx.strokeStyle = PAL.axes[a]; ctx.globalAlpha = v[2] < 0 ? 0.5 : 1; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * v[0], cy - R * v[1]); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.fillStyle = PAL.muted; ctx.font = '10px "Fira Code", monospace'; ctx.textAlign = 'left';
    if (label) ctx.fillText(label, 6, h - 6);
}
const turned = f => (Math.acos(Math.max(-1, Math.min(1, (f[0][0] + f[1][1] + f[2][2] - 1) / 2))) * 180 / Math.PI).toFixed(1) + '°';
function drawTriads() {
    if (st.cpl) { drawTriad($('cv-q1'), st.cpl.f1, `turned ${turned(st.cpl.f1)}`); drawTriad($('cv-q2'), st.cpl.f2, `turned ${turned(st.cpl.f2)}`); }
    const rc = $('cv-rot');
    if (rc && st.sel !== null) { const r = Lex.rotation(st.sel); drawTriad(rc, r.f, 'R(q)'); }
}

// ------------------------------------------------------------------ X(5, q): the ball of radius 2 around the vertex
function drawLps() {
    const cv = $('cv-lps');
    if (!cv || st.sel === null) return;
    const q = st.q, vx = Lex.vertex(st.sel, q), ball = Lex.lpsBall(q, vx.v, 2);
    const { ctx, w, h } = fitSmall(cv, 0.86), cx = w / 2, cy = h / 2 + 2, M = Math.min(w, h), R1 = M * 0.2, R2 = M * 0.43;
    ctx.fillStyle = PAL.cvBg; ctx.fillRect(0, 0, w, h);
    const pos = new Map([[vx.v, [cx, cy]]]), angle = new Map();
    ball.nodes.filter(n => n.depth === 1).forEach((n, k) => { const a = -Math.PI / 2 + k * Math.PI / 3; angle.set(n.v, a); pos.set(n.v, [cx + R1 * Math.cos(a), cy + R1 * Math.sin(a)]); });
    for (const [u, a0] of angle) {
        const kids = ball.nodes.filter(n => n.depth === 2 && n.parent === u);
        kids.forEach((n, j) => { const a = a0 + (j - (kids.length - 1) / 2) * 0.17; pos.set(n.v, [cx + R2 * Math.cos(a), cy + R2 * Math.sin(a)]); });
    }
    const tr = vx.trail, hot = new Set();
    if (tr.length >= 2) hot.add(tr[tr.length - 2] + ':' + tr[tr.length - 1]);
    if (tr.length >= 3) hot.add(tr[0] + ':' + tr[1]);
    ctx.font = '10px "Fira Code", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [u, t, gn] of ball.edges) {
        const a = pos.get(u), b = pos.get(t), on = hot.has(u + ':' + t) || hot.has(t + ':' + u);
        ctx.strokeStyle = on ? PAL.path : PAL.edge; ctx.lineWidth = on ? 2.6 : 1; ctx.globalAlpha = on ? 1 : 0.8;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.globalAlpha = 1;
        if (u === vx.v) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; ctx.fillStyle = PAL.cvBg; ctx.fillRect(mx - 6, my - 7, 12, 14); ctx.fillStyle = on ? PAL.path : PAL.muted; ctx.fillText(GEN[gn], mx, my); }
    }
    // other tokens of the pair whose vertex is inside the ball
    const others = [];
    for (const k of st.keys) if (k !== st.sel && k !== '') { const v = Lex.vertex(k, q).v; if (pos.has(v)) others.push([k, v]); }
    for (const n of ball.nodes) {
        const [x, y] = pos.get(n.v);
        ctx.fillStyle = n.depth === 0 ? PAL.sel : n.depth === 1 ? PAL.text : PAL.muted;
        ctx.beginPath(); ctx.arc(x, y, n.depth === 0 ? 5 : n.depth === 1 ? 3 : 2, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.textAlign = 'left';
    for (const [k, v] of others) {
        const [x, y] = pos.get(v), n = nodeOf(k);
        ctx.strokeStyle = PAL.root[rootOf(n)]; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x, y, 6, 0, 2 * Math.PI); ctx.stroke();
        ctx.fillStyle = PAL.root[rootOf(n)]; ctx.fillText(shortName(k), x + 8, y - 6);
    }
    ctx.fillStyle = PAL.sel; ctx.fillText(`${vx.v}`, cx + 8, cy - 9);
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = PAL.muted;
    ctx.fillText(`X(5, ${q}) · vertex ${vx.v} · ${ball.nodes.length} vertices within 2`, 6, h - 6);
    cv.dataset.vertex = String(vx.v);
    cv.setAttribute('aria-label', `The ball of radius 2 around vertex ${vx.v} of X(5, ${q}): ${ball.nodes.length} vertices, a tree; the word's last two letters are highlighted${others.length ? `; ${others.length} other token(s) of the pair inside it` : ''}.`);
}

// ------------------------------------------------------------------ panels
function renderChips() {
    const c = Lex.checks, dataOk = c[0] && c[0].ok, wordsOk = c[2] && c[2].ok;
    $('chips').innerHTML = `<span class="stat"><b>${fmt(Lex.counts.nouns)}</b> nouns</span><span class="stat"><b>${fmt(Lex.counts.tokens)}</b> tokens</span>` +
        `<span class="stat ${dataOk ? 'good' : 'bad'}">data = pins <b>${dataOk ? '✓' : '✗'}</b></span><span class="stat ${wordsOk ? 'good' : 'bad'}">words = pins <b>${wordsOk ? '✓' : '✗'}</b></span>` +
        `<span class="stat">loaded in <b>${fmt(Math.round(Lex.ms))}</b> ms</span>`;
}
function renderInput() {
    const an = st.an;
    $('toks').innerHTML = an.tokens.map(t =>
        `<span class="tw3 ${t.segment ? 'seg-b' : 'seg-a'}"><button type="button" class="tok${t.special ? ' special' : ''}${t.key === st.sel ? ' on' : ''}" data-root="${t.root}" data-i="${t.i}" aria-pressed="${t.key === st.sel}" ` +
        `title="${esc(`token ${t.i} · segment ${t.segment} (${SEG[t.segment]}) · id ${t.id} · ${t.rootName} · ${Lex.label(t.node)}`)}">${esc(t.piece)}<small>${t.id} · <b>${t.segment}</b></small></button><i class="seg-band"></i></span>`).join('');
    const nA = an.tokens.filter(t => t.segment === 0).length, nB = an.tokens.length - nA;
    $('in-read').innerHTML = `<span>tokens <b>${an.tokens.length}</b></span><span>segment A (0) <b>${nA}</b></span><span>segment B (1) <b>${nB}</b></span>` +
        `<span>synset tokens <b>${an.tokens.filter(t => t.synset).length}</b></span><span>[UNK] <b>${an.unk}</b></span>` +
        (an.failedWords.length ? `<span class="bad">refused by N<sub>B</sub>: ${an.failedWords.map(esc).join(', ')}</span>` : '') +
        (an.error ? `<span class="bad">${esc(an.error)}</span>` : '');
    $('in-stream').innerHTML = `<span class="faint">id stream (LEB128)</span> ${esc(an.idStreamHex.slice(0, 64))}${an.idStreamHex.length > 64 ? '…' : ''} <span class="faint">${an.idStreamHex.length / 2} bytes · SHA-256</span> ${esc(an.idStreamSha256)}`;
    const sk = $('t-skip'), cur = st.skip === null ? '' : String(st.skip);
    sk.innerHTML = '<option value="">none</option>' + an.tokens.slice(0, COUPLE_MAX).map(t => `<option value="${t.i}">${t.i} · ${esc(t.piece)} (${SEG[t.segment]})</option>`).join('');
    sk.value = cur;
}
function renderTokens() {
    const T = st.an.tokens, pages = Math.max(1, Math.ceil(T.length / TOK_PAGE));
    st.tokPage = Math.max(0, Math.min(st.tokPage, pages - 1));
    const rows = T.slice(st.tokPage * TOK_PAGE, (st.tokPage + 1) * TOK_PAGE).map(t => {
        const ids = Lex.ids(t.word), b3 = Lex.bits(3, t.word), b2 = Lex.bits(2, t.word), d3 = Lex.decode(3, t.word, { authority: false });
        const syn = t.synset ? `${esc(t.synset.name)}.${t.synset.pos} <span class="faint">${t.synset.offset}</span>` : faint('–');
        return `<tr class="click seg${t.segment}${t.key === st.sel ? ' sel' : ''}" data-i="${t.i}"><td class="num">${t.i}</td><td>${t.segment} <span class="faint">${SEG[t.segment]}</span></td><td>${esc(t.piece)}</td><td class="num">${t.id}</td>` +
            `<td>${t.span ? t.span.join('–') : faint('–')}</td><td><span class="rc${t.root} root-text">${t.root} ${esc(t.rootName)}</span></td><td>${syn}</td>` +
            `<td class="wrap"><span class="mono">${t.word.join('')}</span> <span class="faint">(${t.len})</span></td><td class="num">${ids.id59 === null ? faint('–') : ids.id59}</td>` +
            `<td class="num">${b3.point}</td><td class="num">${b2.point}</td><td>${mark(d3.ok)}</td></tr>`;
    }).join('');
    $('tok-table').innerHTML = `<thead><tr><th class="num">#</th><th>seg</th><th>piece</th><th class="num">id</th><th>bytes</th><th>root</th><th>synset (lemma, offset)</th><th>word (len)</th><th class="num">id59</th><th class="num">H³ bits</th><th class="num">H² bits</th><th>decodes</th></tr></thead><tbody>${rows}</tbody>`;
    $('tok-pager').innerHTML = pages > 1 ? `<button type="button" class="chip" data-tp="-1" ${st.tokPage ? '' : 'disabled'}>◀</button><span class="mono faint">tokens ${st.tokPage * TOK_PAGE}–${Math.min(T.length, (st.tokPage + 1) * TOK_PAGE) - 1} of ${fmt(T.length)}</span><button type="button" class="chip" data-tp="1" ${st.tokPage < pages - 1 ? '' : 'disabled'}>▶</button>` :
        `<span class="help" style="margin:0">bits: the point&rsquo;s bits over one common denominator, the lcm of its coordinates&rsquo; lowest-terms denominators (7<sup>n</sup> in H&sup3;; in H&sup2; a divisor of 2&middot;300<sup>n</sup>, usually much smaller); decodes: <code>h3DecodeInt</code> returns the word</span>`;
}
function renderTwin() {
    // the exact quaternions grow with every letter, so a long pair is coupled over its first COUPLE_MAX tokens
    // (192 tokens take about 0.06-0.07 s, the same-chirality control about 0.11-0.13 s, in Node; the cost grows faster than
    // the count: 256 take about 0.13 s and 0.30 s)
    const toks = st.an.tokens.length > COUPLE_MAX ? { tokens: st.an.tokens.slice(0, COUPLE_MAX) } : st.an;
    const c = Lex.couple(toks, { chirality: $('t-same').checked ? 'same' : 'mirror', skip: st.skip !== null && st.skip < COUPLE_MAX ? st.skip : null });
    st.cpl = c;
    $('bind').innerHTML = c.checks.map(x => { const t = st.an.tokens[x.i]; return `<i class="${x.ok ? '' : 'no'}${x.i === st.skip ? ' skip' : ''} ${x.segment ? 'seg-b' : 'seg-a'}" title="${esc(`token ${x.i} · ${t.piece} · segment ${SEG[x.segment]}: ${x.ok ? 'B unchanged' : 'B moved'}`)}"></i>`; }).join('');
    const nA = toks.tokens.filter(t => t.segment === 0).length;
    $('twin-read').innerHTML = `<span>binding held <b class="${c.held === c.total ? 'good' : 'bad'}">${c.held}/${c.total}</b></span><span>twists A <b>${nA}</b>, B <b>${c.total - nA}</b></span>` +
        (toks !== st.an ? `<span class="faint">the first ${COUPLE_MAX} of ${st.an.tokens.length} tokens</span>` : '') +
        `<span>law <b>${c.chirality === 'same' ? 'q₂ ← q₂ w (the control)' : 'q₁ ← w q₁, q₂ ← q₂ w̄'}</b></span>${st.skip !== null ? `<span class="bad">twist ${st.skip} skipped on structure 2</span>` : ''}`;
    $('p-twin').dataset.held = `${c.held}/${c.total}`;
    st.dirty = true;
}
function renderPaging() {
    const pg = st.geo.v.paging, part = (name, p, key) => (p.total > (key === 'sib' ? 0 : 0) && (p.prev || p.next) ?
        `<button type="button" class="chip" data-pg="${key}:-1" ${p.prev ? '' : 'disabled'} aria-label="Previous ${name}">◀</button><span class="mono faint">${name} ${p.from + 1}–${p.to} of ${fmt(p.total)}</span><button type="button" class="chip" data-pg="${key}:1" ${p.next ? '' : 'disabled'} aria-label="Next ${name}">▶</button>` : '');
    const extra = st.extra.length || st.session ? `<button type="button" class="chip" id="b-clear-extra">clear ${st.session ? 'the session' : 'the shard'}&rsquo;s points</button>` : '';
    $('paging').innerHTML = part('siblings', pg.siblings, 'sib') + part('children', pg.children, 'child') + extra + (st.geo.v.truncated ? '<span class="faint mono">over the 400-node budget: some nodes are left out</span>' : '');
}
function renderRead() {
    const c = nodeOf(st.centre), g = st.geo, lcaTxt = g.paths.length ? g.paths.map(p => `${esc(shortName(p.a))}–${esc(shortName(p.b))} via <b>${esc(shortName(p.named))}</b>`).join(' · ') : 'none';
    $('read').innerHTML = `<span>centre <b>${esc(longName(st.centre))}</b></span><span>depth <b>${c.depth}</b></span><span>letters <b>${c.len}</b></span><span>drawn <b>${g.nodes.length}</b> nodes, <b>${g.virtual.length}</b> virtual letters</span>` +
        `<span>paths ${lcaTxt}</span><span>chart in <b>${g.ms.toFixed(0)}</b> ms</span>` +
        (st.extra.length ? `<span>shard tokens <b>${st.extra.length}</b></span>` : '') + (st.session ? `<span>session words <b>${st.session.words.length}</b></span>` : '');
    $('view-sub').textContent = `centred on ${shortName(st.centre)}: the exact chart of its frame, drawn in floats`;
}
function renderLegend() {
    const items = LP.ROOTS.map((r, i) => `<span><i style="--c:${PAL.root[i]}"></i>${esc(r.short)}</span>`);
    items.push(`<span><i style="--c:${PAL.faint}"></i>ancestor</span>`, `<span><i style="--c:${PAL.virtual}"></i>virtual letter</span>`,
        `<span><i style="--c:transparent;box-shadow:0 0 0 2px ${PAL.lca}"></i>LCA</span>`, `<span><i style="--c:transparent;box-shadow:0 0 0 2px ${PAL.sel}"></i>selected</span>`,
        `<span><i style="--c:transparent;border-radius:0;height:0;border-top:2px dashed ${PAL.edge}"></i>edge past undrawn nodes</span>`,
        `<span><i style="--c:${PAL.axes[0]};border-radius:1px;height:3px"></i><i style="--c:${PAL.axes[1]};border-radius:1px;height:3px"></i><i style="--c:${PAL.axes[2]};border-radius:1px;height:3px"></i>frame R(q)</span>`);
    if (st.session) for (const s of ['human', 'strix', 'biochain', 'stream']) items.push(`<span><i style="--c:${PAL.speaker[s]}"></i>${s === 'strix' ? 'STRIX' : s}</span>`);
    $('legend').innerHTML = items.join('');
}
function renderSel() {
    const el = $('sel'), k = st.sel;
    if (k === null || !nodeOf(k)) { el.innerHTML = '<p class="help">Select a token above, or click a point in the tree.</p>'; $('p-sel').removeAttribute('data-decoded'); return; }
    const n = nodeOf(k), w = n.word, len = w.length, toks = st.an ? st.an.tokens.filter(t => t.key === k) : [];
    const ids = Lex.ids(w), pt = Lex.point(3, w), bits = Lex.bits(3, w), dec = Lex.decode(3, w), f64 = Lex.float64Kept(3, w);
    const fromO = Lex.cosh(3, '', w), fromC = Lex.cosh(3, st.centre, w), q = Lex.quaternion(w), rt = Lex.rotation(w);
    const coords = LC.coordsLowest(pt.X, pt.den), exactText = LC.coordsText(pt.X, pt.den);
    const ok = dec.ok && dec.authority !== false;
    $('p-sel').dataset.decoded = ok ? 'ok' : 'bad';
    const kindTxt = n.kind === 'noun' || n.kind === 'verb' ? `${n.kind} synset ${esc(n.lemma)}.${n.pos} · offset ${n.offset}` : n.kind === 'token' ? `spelled token (root ${n.root}: ${esc(LP.ROOTS[n.root].name)})` : n.kind === 'root' ? `root ${n.root}: ${esc(LP.ROOTS[n.root].name)}` : 'the origin (the empty word)';
    const anc = Lex.ancestors(k);
    const xs = QS.map(qq => ({ q: qq, x: Lex.vertex(w, qq), G: Lex.lps(qq) }));
    const share = qq => {
        const by = new Map();
        for (const kk of st.keys) { const v = Lex.vertex(kk, qq).v; if (!by.has(v)) by.set(v, []); by.get(v).push(kk); }
        let s = 0; for (const list of by.values()) if (list.length > 1) s += list.length;
        return s;
    };
    const tokLine = toks.length ? `<span>tokens</span><span>${toks.map(t => `#${t.i} <b>${esc(t.piece)}</b> id ${t.id} (segment ${SEG[t.segment]})`).join(', ')}</span>` : '';
    const idsLine = n.ids.length ? `<span>V0 ids here</span><span>${n.ids.slice(0, 12).join(', ')}${n.ids.length > 12 ? ` … (${n.ids.length})` : ''}${n.ids.length > 1 ? ' <span class="faint">(a shared address)</span>' : ''}</span>` : '';
    const short = x => { const t = (x < 0n ? -x : x).toString(); return (x < 0n ? '−' : '') + (t.length <= 20 ? t : t.slice(0, 8) + '…' + t.slice(-8)); };
    const frac = (nn, dd) => (dd === 1n ? short(nn) : `${short(nn)} / ${short(dd)}`);
    const maxR = Math.min(...xs.map(x => x.G.r));
    el.innerHTML = `<div class="sel3">
        <h3 class="mini">The word</h3>
        <div class="kv"><span>name</span><span><b>${esc(longName(k))}</b></span><span>kind</span><span>${kindTxt}</span>${tokLine}${idsLine}<span>depth</span><span>${n.depth} named levels, ${len} letters</span></div>
        <div class="word" aria-label="the word, grouped by named edges; letters after an edge's first are virtual">${wordHtml(k)}</div>
        <div class="kv"><span>D6 id</span><span class="mono">${UI.fmtBig(ids.id, 40)}</span><span>id59 · id64</span><span class="mono">${ids.id59 === null ? '– (over 25 letters)' : ids.id59} · ${ids.id64 === null ? '– (over 27 letters)' : ids.id64}</span>
            <span>certified</span><span>${mark(ids.certified)} <span class="faint">norm 5<sup>n</sup></span> ${mark(ids.parts[0])} <span class="faint">right division</span> ${mark(ids.parts[1])} <span class="faint">reduced</span> ${mark(ids.parts[2])}</span></div>
        ${anc.length ? `<div class="anc" aria-label="Named ancestors: click one to centre the view on it">${anc.map(a => `<button type="button" class="chip" data-centre="${a}" title="${esc(longName(a))}">${esc(shortName(a))}</button>`).join('')}<button type="button" class="chip on" data-centre="${k}" title="centre on it">${esc(shortName(k))}</button></div>` : ''}

        <h3 class="mini">The H³ point <small class="faint">exact, in lowest terms</small></h3>
        <div class="coords">${coords.map(([a, b2], i) => `<div><span class="faint">x${'₀₁₂₃'[i]}</span> ${frac(a, b2)} <span class="faint nowrap">· ${bits.coords[i][0]}/${bits.coords[i][1]} bits</span></div>`).join('')}</div>
        <div class="kv"><span>point bits</span><span>${bits.point} over one denominator 7<sup>${len}</sup></span>
            <span>cosh d, origin</span><span class="mono">${frac(fromO.n, fromO.d)} <span class="faint">d ≈ ${fromO.dist.toFixed(3)}</span></span>
            <span>cosh d, centre</span><span class="mono">${frac(fromC.n, fromC.d)} <span class="faint">d ≈ ${fromC.dist.toFixed(3)} from ${esc(shortName(st.centre))}</span></span>
            <span>decode</span><span>${mark(dec.ok)} <code>h3DecodeInt</code> ${mark(dec.authority)} <code>decodeExact</code> (the authority) · <b class="${ok ? 'good' : 'bad'}">${ok ? 'decodes back ✓' : 'does not decode back ✗'}</b></span>
            <span>in float64</span><span>${f64} of ${len} letters survive <span class="faint">(the exact point stored in float64, decoded exactly)</span></span></div>
        <div class="row"><button type="button" class="chip" id="b-copy">copy exact</button><span class="faint mono" id="copy-out"></span></div>

        <h3 class="mini">The quaternion and its frame</h3>
        <div class="sel-grid"><div class="kv"><span>q</span><span class="mono">(${q.map(x => short(x)).join(', ')})</span><span>norm</span><span>5<sup>${len}</sup> ${mark(ids.parts[0])}</span>
            <span>R(q)</span><span class="mono">${rt.f.map(r => '[' + r.map(x => x.toFixed(3)).join(' ') + ']').join(' ')}</span><span>RᵀR = I</span><span>${rt.ok ? good('exactly ✓') : bad('✗')}</span></div>
            <canvas class="cv" id="cv-rot" width="150" height="120" role="img" aria-label="R(q): the frame, turning with the view"></canvas></div>

        <h3 class="mini">X(5, q): the vertex <small class="faint">L7</small></h3>
        <div class="tw"><table class="small" id="lps-table"><thead><tr><th class="num">q</th><th class="num">vertex</th><th>matrix mod q</th><th class="num">from 1</th><th>walk = reduction</th><th>girth · r</th><th class="num">sharing</th></tr></thead><tbody>
            ${xs.map(({ q: qq, x, G }) => `<tr data-q="${qq}" data-v="${x.v}"><td class="num">${qq}</td><td class="num">${x.v}</td><td class="mono">[${x.m[0]} ${x.m[1]}; ${x.m[2]} ${x.m[3]}]</td><td class="num">${x.dist}</td><td>${mark(x.agree)} ${x.walk}</td><td>${G.girth} · ${G.r}</td><td class="num">${share(qq)}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="help">Walk = the word&rsquo;s letters from the identity vertex; reduction = q mod p&rsquo;s class. Injective on words of up to r letters (L7(c)); this word has ${len}${len > maxR ? ', so it may share a vertex' : ''}. &ldquo;Sharing&rdquo;: the pair&rsquo;s distinct tokens on a shared vertex. Display only: no integrity.</p>
        <div class="row" role="group" aria-label="Choose the graph">${QS.map(qq => `<button type="button" class="chip${qq === st.q ? ' on' : ''}" data-q="${qq}" aria-pressed="${qq === st.q}">q = ${qq}</button>`).join('')}</div>
        <canvas class="cv" id="cv-lps" width="300" height="258" role="img" aria-label="The ball of radius 2 around the vertex"></canvas>
    </div>`;
    el.querySelector('#b-copy').addEventListener('click', () => copyExact(exactText, k));
    el.querySelectorAll('[data-centre]').forEach(b => b.addEventListener('click', () => recentre(b.dataset.centre)));
    el.querySelectorAll('button[data-q]').forEach(b => b.addEventListener('click', () => { st.q = Number(b.dataset.q); save(); renderSel(); }));
    body.dataset.selected = k;
    // the token strip and table follow the selection
    document.querySelectorAll('#toks .tok').forEach(b => { const on = st.an.tokens[Number(b.dataset.i)].key === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    document.querySelectorAll('#tok-table tbody tr').forEach(tr => tr.classList.toggle('sel', st.an.tokens[Number(tr.dataset.i)].key === k));
    st.lpsDirty = true; st.dirty = true;
}
function copyExact(text, k) {
    const out = $('copy-out'), fallback = () => {
        out.innerHTML = '';
        const ta = document.createElement('textarea'); ta.className = 'copybox'; ta.readOnly = true; ta.value = `${k} H3 ${text}`;
        const row = out.parentElement, old = row.nextElementSibling;
        if (old && old.matches('textarea.copybox')) old.remove();
        row.insertAdjacentElement('afterend', ta); ta.focus(); ta.select();
    };
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(`${k} H3 ${text}`).then(() => { out.textContent = `copied (${text.length} characters)`; }, fallback);
        else fallback();
    } catch (e) { fallback(); }
}

// ------------------------------------------------------------------ actions
function select(key) {
    if (key === null || !nodeOf(key)) return;
    st.sel = key;
    renderSel();
    st.dirty = true;
}
function recentre(key, { push = true } = {}) {
    if (!nodeOf(key)) return;
    if (push && key !== st.centre) { st.hist.push(st.centre); if (st.hist.length > HIST) st.hist.shift(); }
    st.centre = key; st.sibPage = st.childPage = 0;
    rebuild();
    renderSel();
}
function lcaOf(keys) {
    const syn = [...new Set(keys)].filter(k => { const n = nodeOf(k); return n && (n.kind === 'noun' || n.kind === 'verb'); });
    if (syn.length >= 2) return syn.slice(1).reduce((acc, k) => Lex.lca(acc, k).named, syn[0]);
    if (syn.length === 1) return nodeOf(syn[0]).parent;
    return '';
}
function nearestAt(x, y, within = 12) {
    let best = null, bd = within;
    for (const [px, py, key] of st.proj) { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = key; } }
    return best;
}

// ------------------------------------------------------------------ the animation loop
let lastTs = null, dragging = false;
function tick(ts) {
    const dt = lastTs === null ? 0 : Math.min(0.1, (ts - lastTs) / 1000);
    lastTs = ts;
    if ($('v-turn').checked && !dragging && !document.hidden) { st.yaw += dt * 0.12; st.dirty = true; }
    try {
        if (st.dirty) { drawView(); drawTriads(); st.dirty = !!st.framesPending; }
        if (st.lpsDirty) { drawLps(); st.lpsDirty = false; }
    } catch (e) { st.dirty = st.lpsDirty = false; $('read').insertAdjacentHTML('beforeend', `<span class="bad">drawing failed: ${esc(e.message)}</span>`); }
    requestAnimationFrame(tick);
}

// ------------------------------------------------------------------ wiring
function wire() {
    let timer = null;
    const onInput = () => { clearTimeout(timer); timer = setTimeout(() => setPair($('in-a').value, $('in-b').value), 150); };
    $('in-a').addEventListener('input', onInput);
    $('in-b').addEventListener('input', onInput);
    $('examples').innerHTML = EXAMPLES.map(([a, b], i) => `<button type="button" class="chip" data-ex="${i}" title="${esc(`A: ${a}  B: ${b || '(empty)'}`)}">${esc(a)}${b ? ' / ' + esc(b) : ' / (B empty)'}</button>`).join('');
    $('examples').addEventListener('click', e => { const b = e.target.closest('[data-ex]'); if (!b) return; const [a, bb] = EXAMPLES[Number(b.dataset.ex)]; $('in-a').value = a; $('in-b').value = bb; setPair(a, bb); });
    $('toks').addEventListener('click', e => { const b = e.target.closest('.tok'); if (b) select(st.an.tokens[Number(b.dataset.i)].key); });
    $('tok-table').addEventListener('click', e => { const tr = e.target.closest('tr[data-i]'); if (tr) select(st.an.tokens[Number(tr.dataset.i)].key); });
    $('tok-pager').addEventListener('click', e => { const b = e.target.closest('[data-tp]'); if (b) { st.tokPage += Number(b.dataset.tp); renderTokens(); } });
    $('b-up').addEventListener('click', () => { const p = Lex.parentKey(st.centre); if (p !== null) recentre(p); });
    $('b-back').addEventListener('click', () => { if (st.hist.length) recentre(st.hist.pop(), { push: false }); });
    $('b-origin').addEventListener('click', () => recentre(''));
    $('b-centre').addEventListener('click', () => { if (st.sel !== null) recentre(st.sel); });
    $('paging').addEventListener('click', e => {
        if (e.target.closest('#b-clear-extra')) { st.extra = []; st.session = null; renderLegend(); rebuild(); return; }
        const b = e.target.closest('[data-pg]'); if (!b) return;
        const [which, d] = b.dataset.pg.split(':');
        if (which === 'sib') st.sibPage += Number(d); else st.childPage += Number(d);
        rebuild();
    });
    const search = $('search');
    search.addEventListener('input', () => {
        const r = search.value.trim() ? Lex.search(search.value, 12) : [];
        $('search-list').innerHTML = r.map(n => `<option value="${esc(n.kind === 'token' ? n.name : n.lemma || n.name)}">${esc(Lex.label(n))}</option>`).join('');
    });
    search.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const r = Lex.search(search.value, 1);
        if (r.length) { select(r[0].key); recentre(r[0].key); }
        else { const old = $('read').querySelector('.search-miss'); if (old) old.remove(); $('read').insertAdjacentHTML('afterbegin', `<span class="bad search-miss">no lemma or piece starts with “${esc(search.value)}”</span>`); }
    });
    $('v-mode').addEventListener('change', () => { st.mode = $('v-mode').value; $('v-spread').disabled = st.mode !== 'ball'; save(); st.dirty = true; });
    $('v-spread').addEventListener('input', () => { st.spread = Number($('v-spread').value); $('v-spread-out').textContent = '×' + st.spread; save(); st.dirty = true; });
    $('v-pitch').addEventListener('input', () => { st.pitch = Number($('v-pitch').value); st.dirty = true; });
    $('b-zin').addEventListener('click', () => { st.zoom = Math.min(4, st.zoom * 1.2); st.dirty = true; });
    $('b-zout').addEventListener('click', () => { st.zoom = Math.max(0.5, st.zoom / 1.2); st.dirty = true; });
    for (const id of ['v-frames', 'v-tree', 'v-labels', 'v-turn']) $(id).addEventListener('change', () => { save(); st.dirty = true; });
    $('v-paths').addEventListener('change', () => { save(); rebuild(); });
    $('t-same').addEventListener('change', renderTwin);
    $('t-skip').addEventListener('change', () => { st.skip = $('t-skip').value === '' ? null : Number($('t-skip').value); renderTwin(); });

    const cv = $('cv-view');
    let drag = null, press = null, pressedAt = -1e9;
    const at = e => { const rc = cv.getBoundingClientRect(); return [e.clientX - rc.left, e.clientY - rc.top]; };
    cv.addEventListener('pointerdown', e => {
        drag = { x: e.clientX, y: e.clientY, moved: false, touch: e.pointerType === 'touch' };
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
        if (drag.touch) { const [x, y] = at(e); clearTimeout(press); press = setTimeout(() => { if (drag && !drag.moved) { pressedAt = performance.now(); const k = nearestAt(x, y, 18); if (k !== null) { select(k); recentre(k); } drag.moved = true; } }, 550); }
    });
    cv.addEventListener('pointermove', e => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) { drag.moved = true; dragging = true; clearTimeout(press); }
        st.yaw += dx * 0.01;
        if (!drag.touch) { st.pitch = Math.max(-1.5, Math.min(1.5, st.pitch + dy * 0.01)); $('v-pitch').value = String(st.pitch); }
        drag.x = e.clientX; drag.y = e.clientY; st.dirty = true;
    });
    const end = e => {
        clearTimeout(press);
        if (drag && !drag.moved && e.type === 'pointerup') { const [x, y] = at(e), k = nearestAt(x, y); if (k !== null) select(k); }
        drag = null; dragging = false;
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    // a tap and then a long-press close by can make the browser fire a dblclick on release, after the long-press has
    // already recentred: ignore it, or it would select and recentre on whatever node now sits under the finger
    cv.addEventListener('dblclick', e => { if (performance.now() - pressedAt < 1000) return; const [x, y] = at(e), k = nearestAt(x, y, 14); if (k !== null) { select(k); recentre(k); } });
    cv.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); st.zoom = Math.max(0.5, Math.min(4, st.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))); st.dirty = true; }, { passive: false });
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => { st.dirty = true; st.lpsDirty = true; }).observe($('p-view'));
    window.addEventListener('resize', () => { st.dirty = true; st.lpsDirty = true; });
    UI.onScheme(() => { PAL = UI.palette(); renderLegend(); st.dirty = true; st.lpsDirty = true; });
    // a new #a=&b= typed in the address bar or followed from a link (setPair writes the hash with replaceState, which
    // does not fire hashchange)
    window.addEventListener('hashchange', () => { const h = readHash(); if (h && (h.a !== st.A || h.b !== st.B)) { $('in-a').value = h.a; $('in-b').value = h.b; setPair(h.a, h.b); } });
}

// ------------------------------------------------------------------ the shared panels
function onTokens(keys) {
    st.extra = keys.slice(); st.session = null;
    renderLegend();
    recentre(lcaOf(keys));
    $('p-view').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}
function onSession(imp) {
    st.session = imp; st.extra = [];
    renderLegend();
    recentre(lcaOf(imp.words.map(w => w.key)));
    $('p-view').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}
function useText(A, B) { $('in-a').value = A; $('in-b').value = B; setPair(A, B); $('p-input').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }); }

// ------------------------------------------------------------------ start
function start() {
    try { Lex = LP.load(); } catch (e) { loadErr = e; }
    UI.mountChecks($('p-checks'), { Lex, error: loadErr });
    UI.mountShard($('p-shard'), { Lex, file: 'lexicon-3d.html', getText: pairText, onTokens, error: loadErr });
    UI.mountEngram($('p-engram'), { Lex, onSession, onTurn: (an, info) => useText(info && typeof info.text === 'string' ? info.text : an.text, ''), onPair: (a, b) => useText(a, b || ''), error: loadErr });
    if (!Lex || !Lex.ok) {
        const why = !Lex ? `The page engine did not load${loadErr ? ': ' + loadErr.message : ''}.` : `A load check failed (${Lex.checks.filter(c => c.ok === false).map(c => c.name).join('; ')}): the tree is not drawn. See the checks panel.`;
        $('chips').innerHTML = `<span class="stat bad">data = pins <b>✗</b></span>`;
        $('read').innerHTML = `<span class="bad">${esc(why)}</span>`;
        $('sel').innerHTML = `<p class="err">${esc(why)}</p>`;
        for (const id of ['in-a', 'in-b']) $(id).disabled = true;
        body.dataset.ready = 'error';
        return;
    }
    renderChips();
    const saved = readStore(), hash = readHash();
    if (saved) {
        if (saved.mode === 'ball' || saved.mode === 'dist') st.mode = saved.mode;
        if (Number(saved.spread) >= 1 && Number(saved.spread) <= 6) st.spread = Number(saved.spread);
        if (QS.includes(saved.q)) st.q = saved.q;
        for (const [id, f] of [['v-frames', 'frames'], ['v-tree', 'tree'], ['v-labels', 'labels'], ['v-paths', 'paths'], ['v-turn', 'turn']]) if (typeof saved[f] === 'boolean') $(id).checked = saved[f];
    }
    if (!saved || typeof saved.turn !== 'boolean') $('v-turn').checked = !reducedMotion;
    if (reducedMotion) $('v-turn').checked = false;
    $('v-mode').value = st.mode; $('v-spread').value = String(st.spread); $('v-spread-out').textContent = '×' + st.spread; $('v-spread').disabled = st.mode !== 'ball';
    $('v-pitch').value = String(st.pitch);
    const A = hash ? hash.a : saved && typeof saved.a === 'string' ? saved.a : EXAMPLES[0][0];
    const B = hash ? hash.b : saved && typeof saved.b === 'string' ? saved.b : EXAMPLES[0][1];
    $('in-a').value = A; $('in-b').value = B;
    wire();
    renderLegend();
    setPair(A, B);
    body.dataset.ready = 'ok';
    requestAnimationFrame(tick);
}
window.__lexicon3d = { st, get Lex() { return Lex; }, select, recentre, setPair, nearestAt };
setTimeout(start, 30);           // let the loading line paint before the synchronous load (about a second)
})();
