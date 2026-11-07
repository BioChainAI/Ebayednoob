// Hyperbolic Lexicon, the 2D page (lexicon-2d.html; Phase 5): the exact H^2 tree in the Poincare disk.
//
// This file draws and asks; it computes nothing the page engine computes. Every number comes from LexiconPages
// (assets/hl-pages.js: the named tree, analyse, exact points and charts, decoding, bits, LCA, views) and from
// lexicon_core.js (N_B's words for the input panel, the canonical coordinate text); the shard, Engram and checks panels
// are LexiconPanels' (assets/hl-panels.js). The disk is drawn from an exact chart: Lex.chart(2, centre) recentres every
// point by an isometry computed in BigInt, and floats appear only at the last step (LexiconPages.toDisk, then a turn).
// Browser storage keeps only this viewer's last sentence, spread and toggles, under 'hyperbolic-lexicon/pages/1' ("2d").
// Test hooks: body[data-ready|data-tokens|data-centre|data-selected], #p-sel[data-decoded], #p-lca[data-letters],
// #p-disk[data-mode|data-learned]; the sentence is read from and written to location.hash as #q=<text>.
(function () {
'use strict';
const $ = id => document.getElementById(id);
const LP = window.LexiconPages, UI = window.LexiconPanels, LC = window.LexiconCore;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const good = s => `<span class="good">${s}</span>`, bad = s => `<span class="bad">${s}</span>`, faint = s => `<span class="faint">${s}</span>`;
const mark = ok => (ok ? good('✓') : bad('✗'));
const errText = e => esc((e && e.message) || e);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fix = (x, k = 3) => (Number.isFinite(x) ? x.toFixed(k) : String(x));
const big = (n, max = 36) => (UI ? UI.fmtBig(n, max) : String(n));
const frac = (n, d, max = 36) => `${big(n, max)}/${big(d, max)}`;
const STORE = 'hyperbolic-lexicon/pages/1';
const EXAMPLES = ['The dog chased the cat up the tree.', 'Oxygen and nitrogen are gases.', 'She can run, jump and swim.', 'Ünïcödé façade, naïve café', 'unbelievably, 12,345 apples!'];
const TOK_PAGE = 64, HIST = 50, MAXLEN = 2000;
const SHORT_ROOT = ['entity', 'verbs', 'adj/adv', '##', 'other', 'special'];
const KIND = { origin: 'the origin (the empty word)', root: 'a root', noun: 'noun synset', verb: 'verb synset', token: 'spelled V0 piece' };
const SUB = ['₀', '₁', '₂', '₃'];

let Lex = null, loadError = null, P = null, scene = null, sceneDirty = true, raf = 0, hits = [], bitsHits = [];
const st = {
    text: EXAMPLES[0], an: null, tokKeys: new Set(), centre: '', hist: [], sel: null, selTok: -1,
    spread: 2, rot: 0, t: { siblings: true, children: true, grandchildren: true, labels: true, virtual: true, paths: true },
    sibPage: 0, childPage: 0, lcaA: -1, lcaB: -1, tokPage: 0, mode: 'exact', overlay: null, hover: null, learnedSel: -1,
};

// ------------------------------------------------------------------ storage (per-viewer conveniences only) and the hash
function readStore() {
    try { const raw = localStorage.getItem(STORE); if (!raw) return null; const s = JSON.parse(raw); return s && typeof s === 'object' ? s : null; } catch (e) { return null; }
}
function writeStore() {
    try { const s = readStore() || {}; s['2d'] = { text: st.text, spread: st.spread, toggles: st.t }; localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) { /* storage is a convenience */ }
}
function hashText() {
    const m = /^#q=([\s\S]*)$/.exec(location.hash || '');
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch (e) { return null; }
}
function writeHash() {
    try { const h = '#q=' + encodeURIComponent(st.text); if (location.hash !== h) history.replaceState(null, '', location.pathname + location.search + h); } catch (e) { /* a lone surrogate cannot be encoded; keep the old hash */ }
}

// ------------------------------------------------------------------ names
function shortName(key) {
    const n = Lex.node(key);
    if (!n) return key;
    if (n.kind === 'origin') return 'origin';
    if (n.kind === 'root') return SHORT_ROOT[n.root] + ' root';
    if (n.kind === 'token') return n.piece || n.name;
    return n.name;
}
const memo = new Map();
function facts(key) {                           // per-key readings the tables and the chart show, asked once
    let f = memo.get(key);
    if (!f) {
        f = { b2: Lex.bits(2, key).point, b3: Lex.bits(3, key).point, dec: Lex.decode(2, key).ok, id59: Lex.ids(key).id59 };
        memo.set(key, f);
    }
    return f;
}
function wordHtml(key) {
    const groups = Lex.edges(key);
    if (!groups.length) return faint('(the empty word)');
    return groups.map(g => `<span>${g[0]}</span>${g.length > 1 ? `<span class="v">${g.slice(1).join('')}</span>` : ''}`).join('<span class="sep">·</span>');
}
function centreOfKeys(keys) {                   // the engine's defaultCentre over a set of named keys
    return Lex.defaultCentre({ tokens: keys.map(k => { const n = Lex.node(k); return { key: k, synset: n && (n.kind === 'noun' || n.kind === 'verb') ? n : null }; }) });
}

// ------------------------------------------------------------------ boot
function failAll(msg) {
    document.body.dataset.ready = 'error';
    $('chips').innerHTML = `<span class="stat bad">engine <b>✗</b></span>`;
    const p = `<p class="err">${msg}</p>`;
    for (const id of ['nb-out', 'sel-body', 'prec-body', 'lca-body']) $(id).innerHTML = p;
    $('disk-read').innerHTML = p;
    $('q').disabled = true;
}
function boot() {
    if (!LP || !LC || !UI) { failAll('The page engine did not load: open this page from its place in the repository (it loads lexicon_core.js, assets/hl-pages.js, assets/hl-panels.js and the data files beside it).'); return; }
    try { Lex = LP.load(); } catch (e) { loadError = e; }
    const mounts = [() => UI.mountChecks($('p-checks'), { Lex, error: loadError }),
        () => UI.mountShard($('p-shard'), { Lex, file: 'lexicon-2d.html', getText: () => st.text, onTokens: showShard, error: loadError }),
        () => UI.mountEngram($('p-engram'), { Lex, onSession: showSession, onTurn: useTurn, error: loadError })];
    for (const m of mounts) { try { m(); } catch (e) { console.warn(e); } }
    if (!Lex) { failAll(`The engine and its data did not load${loadError && loadError.stage ? ` (stage ${esc(loadError.stage)})` : ''}: ${errText(loadError)}`); return; }
    P = UI.palette();
    renderChips();
    initControls();
    const saved = (readStore() || {})['2d'] || {};
    if (typeof saved.spread === 'number') st.spread = clamp(Math.round(saved.spread * 2) / 2, 1, 6);
    if (saved.toggles && typeof saved.toggles === 'object') for (const k of Object.keys(st.t)) if (typeof saved.toggles[k] === 'boolean') st.t[k] = saved.toggles[k];
    syncControls();
    const h = hashText();
    st.text = (h !== null ? h : typeof saved.text === 'string' ? saved.text : EXAMPLES[0]).slice(0, MAXLEN);
    $('q').value = st.text;
    analyse();
    if (!Lex.ok) {                               // the page stays up, and says why its values are not to be trusted
        const failed = Lex.checks.filter(c => c.ok !== true).map(c => c.name).join('; ');
        $('p-disk').insertAdjacentHTML('afterbegin', `<p class="err">A load check failed (${esc(failed)}): the data are not the pinned data, so the values here are not the decisive runs'. See the checks panel.</p>`);
    }
    document.body.dataset.ready = Lex.ok ? 'ok' : 'error';
}
function renderChips() {
    const c = Lex.checks, dataOk = c[0] && c[0].ok && c[1] && c[1].ok, wordsOk = c[2] && c[2].ok && c[3] && c[3].ok;
    $('chips').innerHTML = `<span class="stat"><b>${fmt(Lex.counts.nouns)}</b> nouns</span><span class="stat"><b>${fmt(Lex.counts.tokens)}</b> tokens</span>` +
        `<span class="stat ${dataOk ? 'good' : 'bad'}">data = pins <b>${dataOk ? '✓' : '✗'}</b></span><span class="stat ${wordsOk ? 'good' : 'bad'}">words = pins <b>${wordsOk ? '✓' : '✗'}</b></span>` +
        `<span class="stat">loaded in <b>${fmt(Math.round(Lex.ms))}</b> ms</span>`;
}

// ------------------------------------------------------------------ the sentence
function analyse() {
    sceneDirty = true;
    const an = Lex.analyse(st.text);
    st.an = an;
    st.tokKeys = new Set(an.tokens.map(t => t.key));
    document.body.dataset.tokens = String(an.tokens.length);
    st.centre = Lex.defaultCentre(an);
    st.sibPage = st.childPage = 0;
    document.body.dataset.centre = st.centre;
    const syn = an.tokens.filter(t => t.synset);
    const first = syn[0] || an.tokens[0] || null;
    st.sel = first ? first.key : st.centre;
    st.selTok = first ? first.i : -1;
    document.body.dataset.selected = st.sel;
    st.lcaA = syn.length >= 2 ? syn[0].i : an.tokens.length ? 0 : -1;
    st.lcaB = syn.length >= 2 ? syn[1].i : an.tokens.length >= 2 ? 1 : an.tokens.length ? 0 : -1;
    st.tokPage = 0;
    st.learnedSel = -1;
    for (const f of [renderInput, renderTokens, renderLcaSelects, renderLca, renderSel, renderPrec, updateNav]) guard(f);
    invalidate(true);
    writeHash(); writeStore();
}
function guard(f) {
    try { f(); } catch (e) {
        console.warn(e);
        const where = { renderInput: 'nb-out', renderTokens: 'tok-pager', renderLca: 'lca-body', renderSel: 'sel-body', renderPrec: 'prec-body' }[f.name];
        if (where) $(where).innerHTML = `<p class="err">The engine refused this: ${errText(e)}</p>`;
    }
}
function renderInput() {
    const an = st.an;
    $('toks').innerHTML = an.tokens.map(t => `<button type="button" class="tok${t.special ? ' special' : ''}${t.i === st.selTok ? ' on' : ''}" data-root="${t.root}" data-i="${t.i}" aria-pressed="${t.i === st.selTok}" title="${esc(t.rootName + ' · ' + Lex.label(t.node))}">${esc(t.piece)}<small>${t.id}</small></button>`).join('') ||
        faint('no tokens');
    let words = '', refused = '';
    if (an.error) words = bad(esc(an.error) + ': the text cannot be read as UTF-8');
    else {
        try {
            const r = LC.nb(LC.utf8(st.text)), shown = r.words.slice(0, 160);
            words = shown.map((w, k) => (r.failed[k] ? bad(esc(w)) : esc(w))).join(' <span class="faint">·</span> ') + (r.words.length > shown.length ? faint(` … ${fmt(r.words.length - shown.length)} more`) : '') || faint('none');
        } catch (e) { words = bad(errText(e)); }
        refused = an.failedWords.length ? an.failedWords.map(w => bad(esc(w))).join(' ') + faint(' → [UNK]: a code point unassigned in Unicode 15.1') : faint('none');
    }
    const hex = an.idStreamHex, n = hex.length / 2;
    $('nb-out').innerHTML = `<span>N_B words</span><span class="longtext">${words}</span>` +
        `<span>refused</span><span>${refused || faint('none')}</span>` +
        `<span>tokens</span><span>${fmt(an.tokens.length)}${an.unk ? ` · ${bad(an.unk + ' [UNK]')}` : ''}</span>` +
        `<span>id stream</span><span class="longtext">${esc(hex.slice(0, 64))}${hex.length > 64 ? faint('…') : ''} ${faint(`(LEB128, ${fmt(n)} bytes)`)}</span>` +
        `<span>SHA-256</span><span class="longtext">${esc(an.idStreamSha256)}</span>`;
}
function markTokens() {
    for (const b of $('toks').querySelectorAll('.tok')) { const on = Number(b.dataset.i) === st.selTok; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
    for (const tr of $('tok-table').tBodies[0].rows) tr.classList.toggle('sel', Number(tr.dataset.i) === st.selTok);
}

// ------------------------------------------------------------------ selection and centre
function select(key, tokIndex = null) {
    if (key === null || key === undefined || !Lex.node(key)) return;
    st.sel = key;
    st.selTok = tokIndex !== null ? tokIndex : st.an && st.an.tokens.some(t => t.key === key) ? st.an.tokens.find(t => t.key === key).i : -1;
    document.body.dataset.selected = key;
    sceneDirty = true;
    markTokens();
    guard(renderSel); guard(renderPrecSelected); drawBits();
    updateNav();
    invalidate(true);
}
function setCentre(key, push = true) {
    if (key === null || key === undefined || !Lex.node(key)) return;
    if (key !== st.centre) {
        if (push) { st.hist.push(st.centre); if (st.hist.length > HIST) st.hist.shift(); }
        st.centre = key; st.sibPage = st.childPage = 0;
    }
    sceneDirty = true;
    document.body.dataset.centre = st.centre;
    guard(renderSel);
    updateNav();
    invalidate(true);
}
function updateNav() {
    $('b-up').disabled = st.centre === '';
    $('b-back').disabled = !st.hist.length;
    $('b-centre').disabled = st.sel === null || st.sel === st.centre;
}

// ------------------------------------------------------------------ the selected point
function renderSel() {
    const box = $('sel-body'), key = st.sel, n = key !== null ? Lex.node(key) : null;
    if (!n) { box.innerHTML = '<p class="help">Select a token or a point.</p>'; delete $('p-sel').dataset.decoded; return; }
    const ids = Lex.ids(key), p = Lex.point(2, key), dec = Lex.decode(2, key), o = Lex.cosh(2, '', key), c = Lex.cosh(2, st.centre, key);
    const coords = LC.coordsText(p.X, p.den).split(' ').map(s => s.split('/').map(BigInt));
    const tok = st.selTok >= 0 ? st.an.tokens[st.selTok] : null;
    const head = n.kind === 'noun' || n.kind === 'verb' ? `${esc(n.name)} <span class="faint">.${n.pos}. ${esc(n.offset)}</span>` : esc(shortName(key));
    const ancs = Lex.ancestors(key);
    const crumbs = ancs.map(k => `<button type="button" data-go="${esc(k)}">${esc(shortName(k))}</button>`).join('<span class="gt">›</span>') || faint('none: this is the origin');
    const decWord = LC.wordStr(dec.word);
    box.innerHTML = `<div class="sel-name">${head}</div>` +
        `<div class="muted" style="font-size:0.8rem">${esc(KIND[n.kind] || n.kind)}${tok ? ` · token #${tok.i} “${esc(tok.piece)}” (id ${tok.id})` : ''}${n.ids.length ? ` · V0 id${n.ids.length > 1 ? 's' : ''} here: ${n.ids.slice(0, 8).join(', ')}${n.ids.length > 8 ? '…' : ''}` : ''}</div>` +
        `<div class="kv" style="margin-top:6px">` +
        `<span>word</span><span class="word">${wordHtml(key)}</span>` +
        `<span>length</span><span>${n.len} letters · ${n.depth} named level${n.depth === 1 ? '' : 's'} below the origin</span>` +
        `<span>D6 id</span><span class="big">${esc(String(ids.id))}</span>` +
        `<span>id59</span><span class="big">${ids.id59 === null ? faint('– (over 25 letters: not covered)') : esc(String(ids.id59))}</span>` +
        `<span>id64</span><span class="big">${ids.id64 === null ? faint('– (over 27 letters: not covered)') : esc(String(ids.id64))}</span>` +
        `<span>certified</span><span>${mark(ids.certified)} norm 5ⁿ ${mark(ids.parts[0])} · right division ${mark(ids.parts[1])} · reduced ${mark(ids.parts[2])}</span>` +
        `</div>` +
        `<h3 class="mini">The exact H² point <small class="faint">(coordinates in lowest terms; before reduction each is over 2·300ⁿ, n = ${p.n})</small></h3>` +
        `<div class="kv">${coords.map(([a, b], i) => `<span>x${SUB[i]}</span><span class="big">${frac(a, b)}</span>`).join('')}</div>` +
        `<div class="row"><button type="button" class="chip" id="b-copy" data-exact="${esc(`${key} H2 ${LC.coordsText(p.X, p.den)}`)}">copy exact</button><span class="faint" id="copy-note" style="font-size:0.78rem"></span></div><div id="copy-box"></div>` +
        `<div class="kv">` +
        `<span>cosh d(origin)</span><span class="big">${frac(o.n, o.d)} ${faint('≈ ' + fix(o.value, 3) + ', d ≈ ' + fix(o.dist, 4))}</span>` +
        `<span>cosh d(centre)</span><span class="big">${frac(c.n, c.d)} ${faint('≈ ' + fix(c.value, 3) + ', d ≈ ' + fix(c.dist, 4) + ' from ' + esc(shortName(st.centre)))}</span>` +
        `</div>` +
        `<h3 class="mini">Decode</h3>` +
        `<div class="kv"><span>H² decode</span><span class="word">${esc(decWord) || faint('(the empty word)')}</span>` +
        `<span>ties</span><span>${dec.ties}</span><span>result</span><span>${dec.ok ? good('decodes back ✓') : bad('does not decode back ✗')} ${faint('(greedy, exact; D3’s decoder)')}</span></div>` +
        `<h3 class="mini">Named ancestors</h3><div class="crumbs">${crumbs}</div>` +
        `<h3 class="mini">Nearest in view <small class="faint">exact keys among the drawn points</small></h3><div id="near"></div>`;
    $('p-sel').dataset.decoded = dec.ok ? 'ok' : 'bad';
    const copyText = `${shortName(key)} word ${key} H2 ${LC.coordsText(p.X, p.den)}`;
    $('b-copy').addEventListener('click', () => {
        const fallback = () => { $('copy-box').innerHTML = `<textarea class="copybox" readonly aria-label="The exact point">${esc(copyText)}</textarea>`; const ta = $('copy-box').firstChild; ta.focus(); ta.select(); $('copy-note').textContent = 'select and copy'; };
        try { navigator.clipboard.writeText(copyText).then(() => { $('copy-note').textContent = 'copied'; }, fallback); } catch (e) { fallback(); }
    });
    renderNear();
}
function renderNear() {
    const box = $('near');
    if (!box || st.sel === null) return;
    ensureScene();
    if (!scene || st.mode !== 'exact') { box.innerHTML = faint('in the exact view'); return; }
    const near = Lex.nearest(2, st.sel, scene.nodes.map(x => x.key), 8);
    box.innerHTML = near.length ? `<ol class="near">${near.map(x => `<li><button type="button" class="linkish" data-go="${esc(x.key)}" data-sel="1">${esc(shortName(x.key))}</button> ${faint('d ≈ ' + fix(x.dist, 3))}${x.tie ? ' ' + bad('tie') : ''}</li>`).join('')}</ol>` : faint('no other point drawn');
}

// ------------------------------------------------------------------ precision
function renderPrec() { renderPrecSelected(); renderBitsTable(); drawBits(); }
function renderPrecSelected() {
    const key = st.sel, box = $('prec-body');
    if (key === null || !Lex.node(key)) { box.innerHTML = faint('Select a token.'); $('prec-line').textContent = ''; return; }
    const b2 = Lex.bits(2, key), b3 = Lex.bits(3, key), k2 = Lex.float64Kept(2, key), k3 = Lex.float64Kept(3, key), n = b2.n;
    const cell = c => (c ? `${c[0]}/${c[1]}` : '–');
    const row = (name, b, den, k) => `<tr><td>${name}</td>${[0, 1, 2, 3].map(i => `<td class="num">${cell(b.coords[i])}</td>`).join('')}<td class="num">${fmt(b.point)}</td><td class="num">${k}/${n}</td><td title="${b.den.toString(2).length} bits">${den}</td></tr>`;
    box.innerHTML = `<div class="muted" style="font-size:0.8rem">${esc(shortName(key))}${st.selTok >= 0 ? ` (token #${st.selTok})` : ''} · ${n} letters · numerator/denominator bits per coordinate, in lowest terms</div>` +
        `<div class="tw"><table class="small"><thead><tr><th></th><th class="num">x₀</th><th class="num">x₁</th><th class="num">x₂</th><th class="num">x₃</th><th class="num">point</th><th class="num">f64</th><th>over</th></tr></thead><tbody>` +
        row('H²', b2, `2·300<sup>${n}</sup>`, k2) + row('H³', b3, `7<sup>${n}</sup>`, k3) + `</tbody></table></div>` +
        `<p class="help">x₀…x₃: numerator/denominator bits of each coordinate in lowest terms. point: the bits of the point over one common denominator (numerators plus the denominator). f64: the letters that survive when the exact point is stored in float64 (each coordinate correctly rounded), read back exactly and decoded exactly. over: the denominator before reduction.</p>`;
    const X0 = LP.ratio(Lex.point(2, key).X[0], Lex.point(2, key).den);
    $('prec-line').innerHTML = `The picture’s floats were computed after an exact isometry; this point’s own x₀ is ≈ ${X0 < 1e6 ? fix(X0, 4) : X0.toExponential(1).replace('e+', 'e')} in H² (the cosh of its distance from the origin)` +
        (k2 < n ? `; stored in float64 it keeps ${k2} of its ${n} letters, which is why the chart recentres exactly before any float is taken.` : '; float64 still keeps all its letters.');
}
function bitsTokens() {
    const T = st.an ? st.an.tokens : [];
    return T.slice(st.tokPage * TOK_PAGE, (st.tokPage + 1) * TOK_PAGE);
}
function renderBitsTable() {
    const T = bitsTokens();
    $('bits-table').innerHTML = T.length ? `<table class="small"><thead><tr><th class="num">#</th><th>piece</th><th class="num">H² point bits</th><th class="num">H³ point bits</th></tr></thead><tbody>${T.map(t => { const f = facts(t.key); return `<tr><td class="num">${t.i}</td><td>${esc(t.piece)}</td><td class="num">${fmt(f.b2)}</td><td class="num">${fmt(f.b3)}</td></tr>`; }).join('')}</tbody></table>` : faint('no tokens');
    const cs = getComputedStyle(document.documentElement);
    $('bits-legend').innerHTML = `<span><span class="sw-bar" style="--c:${cs.getPropertyValue('--bits-h2').trim()}"></span>H² (t = 11/13; before reduction over 2·300ⁿ)</span><span><span class="sw-bar" style="--c:${cs.getPropertyValue('--bits-h3').trim()}"></span>H³ (t = 3/4, over 7ⁿ)</span>` +
        (st.an && st.an.tokens.length > TOK_PAGE ? `<span>tokens ${st.tokPage * TOK_PAGE}–${st.tokPage * TOK_PAGE + T.length - 1}, as the tokens table’s page</span>` : '');
}
function drawBits() {
    const cv = $('cv-bits');
    if (!cv || !Lex || !P) return;
    const T = bitsTokens(), w0 = cv.clientWidth || 300, { ctx, w, h } = UI.fitCanvas(cv, w0 < 500 ? 0.62 : 0.42);
    const cs = getComputedStyle(document.documentElement), C2 = cs.getPropertyValue('--bits-h2').trim(), C3 = cs.getPropertyValue('--bits-h3').trim();
    ctx.fillStyle = P.cvBg; ctx.fillRect(0, 0, w, h);
    bitsHits = [];
    if (!T.length) return;
    const F = T.map(t => facts(t.key)), maxV = Math.max(1, ...F.map(f => Math.max(f.b2, f.b3)));
    const step = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].find(s => maxV / s <= 4) || 5000, top = Math.ceil(maxV / step) * step;
    const L = 40, Rm = 8, Tp = 16, B = 22, pw = w - L - Rm, ph = h - Tp - B, y = v => Tp + ph * (1 - v / top);
    ctx.font = '10px "Fira Code", ui-monospace, monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    for (let v = 0; v <= top; v += step) { ctx.strokeStyle = P.edgeFaint; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, Math.round(y(v)) + 0.5); ctx.lineTo(w - Rm, Math.round(y(v)) + 0.5); ctx.stroke(); ctx.fillStyle = P.muted; ctx.fillText(fmt(v), L - 5, y(v)); }
    const band = pw / T.length, bw = Math.max(1, Math.min(12, (band - 4) / 2));
    const bar = (x, v, col) => {
        const y0 = y(0), y1 = y(v), r = Math.min(4, bw / 2, y0 - y1);
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1 + r); ctx.arcTo(x, y1, x + r, y1, r); ctx.lineTo(x + bw - r, y1); ctx.arcTo(x + bw, y1, x + bw, y1 + r, r); ctx.lineTo(x + bw, y0); ctx.closePath(); ctx.fill();
    };
    T.forEach((t, j) => {
        const x0 = L + j * band, mid = x0 + band / 2;
        if (t.i === st.selTok) { ctx.fillStyle = P.edgeFaint; ctx.globalAlpha = 0.45; ctx.fillRect(x0 + 1, Tp, band - 2, ph); ctx.globalAlpha = 1; }
        bar(mid - bw - 1, F[j].b2, C2); bar(mid + 1, F[j].b3, C3);
        bitsHits.push({ x0, x1: x0 + band, t, f: F[j] });
        const every = band >= 18 ? 1 : band >= 7 ? 5 : 10;
        if (t.i % every === 0 || t.i === st.selTok) { ctx.fillStyle = t.i === st.selTok ? P.textStrong : P.muted; ctx.textAlign = 'center'; ctx.fillText(String(t.i), mid, h - B / 2); }
    });
    const s = T.findIndex(t => t.i === st.selTok);
    if (s >= 0) {                               // the selected token's two values, once, above its pair
        const mid = L + s * band + band / 2, text = `${F[s].b2} · ${F[s].b3}`, tw = ctx.measureText(text).width;
        ctx.fillStyle = P.text; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText(text, clamp(mid - tw / 2, L, w - Rm - tw), Math.max(Tp - 2, y(Math.max(F[s].b2, F[s].b3)) - 3));
    }
}
function bitsTip(ev) {
    const cv = $('cv-bits'), tip = $('bits-tip'), r = cv.getBoundingClientRect(), x = ev.clientX - r.left;
    const hHit = bitsHits.find(b => x >= b.x0 && x < b.x1);
    if (!hHit) { tip.hidden = true; return; }
    const cs = getComputedStyle(document.documentElement);
    tip.innerHTML = `#${hHit.t.i} “${esc(hHit.t.piece)}”<br><span class="key" style="--c:${cs.getPropertyValue('--bits-h2').trim()}"></span><b>${fmt(hHit.f.b2)}</b> bits H²<br><span class="key" style="--c:${cs.getPropertyValue('--bits-h3').trim()}"></span><b>${fmt(hHit.f.b3)}</b> bits H³`;
    tip.hidden = false;
    const tw = tip.offsetWidth, left = clamp(x + 12, 4, r.width - tw - 4);
    tip.style.left = left + 'px'; tip.style.top = Math.max(4, ev.clientY - r.top - 50) + 'px';
}

// ------------------------------------------------------------------ the tokens table
function renderTokens() {
    const T = st.an.tokens, pages = Math.max(1, Math.ceil(T.length / TOK_PAGE));
    st.tokPage = clamp(st.tokPage, 0, pages - 1);
    const rows = T.slice(st.tokPage * TOK_PAGE, (st.tokPage + 1) * TOK_PAGE);
    $('tok-table').tBodies[0].innerHTML = rows.map(t => {
        const f = facts(t.key);
        return `<tr class="click${t.i === st.selTok ? ' sel' : ''}" data-i="${t.i}" tabindex="0"><td class="num">${t.i}</td><td>${esc(t.piece)}</td><td class="num">${t.id}</td><td>${t.span ? `${t.span[0]}–${t.span[1]}` : '–'}</td>` +
            `<td><span class="sw rc${t.root}"></span>${esc(t.rootName)}</td><td>${t.synset ? `${esc(t.synset.name)} ${faint(esc(t.synset.offset))}` : faint('–')}</td>` +
            `<td class="word-cell mono" title="${esc(t.key)}">${esc(t.key.length > 18 ? t.key.slice(0, 18) + '…' : t.key)} ${faint('(' + t.len + ')')}</td>` +
            `<td class="num">${f.id59 === null ? faint('–') : esc(String(f.id59))}</td><td class="num">${fmt(f.b2)}</td><td>${f.dec ? good('✓') : bad('✗')}</td></tr>`;
    }).join('') || `<tr><td colspan="10" class="faint">no tokens</td></tr>`;
    $('tok-pager').innerHTML = pages > 1 ? `<button type="button" class="chip" data-tp="-1" ${st.tokPage ? '' : 'disabled'}>◀</button><span class="mono faint">tokens ${st.tokPage * TOK_PAGE}–${Math.min(T.length, (st.tokPage + 1) * TOK_PAGE) - 1} of ${fmt(T.length)}</span><button type="button" class="chip" data-tp="1" ${st.tokPage < pages - 1 ? '' : 'disabled'}>▶</button>` : '';
}

// ------------------------------------------------------------------ the lowest common ancestor
function renderLcaSelects() {
    const T = st.an.tokens, opts = T.map(t => `<option value="${t.i}">${t.i} · ${esc(t.piece)}${t.synset ? ' (' + esc(t.synset.name) + ')' : ''}</option>`).join('');
    for (const [id, v] of [['lca-a', st.lcaA], ['lca-b', st.lcaB]]) { $(id).innerHTML = opts; $(id).disabled = !T.length; if (v >= 0) $(id).value = String(v); }
}
function lcaPair() {
    const T = st.an ? st.an.tokens : [];
    if (st.lcaA < 0 || st.lcaB < 0 || !T[st.lcaA] || !T[st.lcaB]) return null;
    return [T[st.lcaA].key, T[st.lcaB].key];
}
function renderLca() {
    const box = $('lca-body'), pr = lcaPair();
    if (!pr) { box.innerHTML = faint('Type a sentence with tokens to compare.'); delete $('p-lca').dataset.letters; return; }
    const A = st.an.tokens[st.lcaA], B = st.an.tokens[st.lcaB], l = Lex.lca(pr[0], pr[1]), p2 = Lex.path(2, pr[0], pr[1]), p3 = Lex.path(3, pr[0], pr[1]);
    const cross = A.root !== B.root;
    const named = l.named === '' ? 'the origin' : `${esc(Lex.label(l.named))} ${faint('(' + l.named.length + ' letters)')}`;
    const keys = l.pathKeys.map(k => (k === l.named ? `<b>${esc(shortName(k))}</b>` : esc(shortName(k))));
    const pathText = keys.length > 24 ? keys.slice(0, 11).join(' → ') + ` → ${faint('… ' + (keys.length - 22) + ' more …')} → ` + keys.slice(-11).join(' → ') : keys.join(' → ');
    box.innerHTML = (cross ? `<p class="note">${esc(A.piece)} is under the ${esc(SHORT_ROOT[A.root])} root and ${esc(B.piece)} under the ${esc(SHORT_ROOT[B.root])} root: they meet at the origin.</p>` : '') +
        `<div class="kv">` +
        `<span>common prefix</span><span>${l.lcp} letter${l.lcp === 1 ? '' : 's'}${l.lcp ? ' <span class="word">' + esc(LC.wordStr(l.common)) + '</span>' : ''}</span>` +
        `<span>named LCA</span><span>${named}</span>` +
        `<span>synset LCA</span><span>${l.synset === null ? faint('none: no common noun or verb synset') : l.synset === l.named ? faint('the same') : esc(Lex.label(l.synset))}</span>` +
        `<span>letters</span><span>${l.up} up from A, ${l.down} down to B: <b>${l.letters}</b></span>` +
        `<span>path</span><span class="longtext">${pathText}</span></div>` +
        `<div class="tw"><table class="small"><thead><tr><th></th><th class="num">H²</th><th class="num">H³</th></tr></thead><tbody>` +
        `<tr><td>tree path, letters × τ</td><td class="num">${fix(p2.tree)}</td><td class="num">${fix(p3.tree)}</td></tr>` +
        `<tr><td>geodesic (exact cosh)</td><td class="num">${fix(p2.geodesic)}</td><td class="num">${fix(p3.geodesic)}</td></tr>` +
        `<tr><td>detour</td><td class="num">${fix(p2.detour)}</td><td class="num">${fix(p3.detour)}</td></tr>` +
        `</tbody></table></div>` +
        `<p class="help">τ, one letter&rsquo;s step: ln 12 in H², ln 7 in H³.</p><div class="kv"><span>cosh, H²</span><span class="big">${frac(p2.cosh.n, p2.cosh.d, 24)}</span><span>cosh, H³</span><span class="big">${frac(p3.cosh.n, p3.cosh.d, 24)}</span></div>` +
        (l.lcp > l.named.length ? `<p class="help">The common prefix runs ${l.lcp - l.named.length} letter${l.lcp - l.named.length === 1 ? '' : 's'} past the named LCA, into a multi-letter edge: those letters are virtual, and no node is named there.</p>` : '');
    $('p-lca').dataset.letters = String(l.letters);
}

// ------------------------------------------------------------------ the view: a scene from the engine
const charts = new Map();
function chartOf(c) {
    let x = charts.get(c);
    if (x) { charts.delete(c); charts.set(c, x); return x; }
    x = { chart: Lex.chart(2, c), geo: new Map() };
    charts.set(c, x);
    if (charts.size > 8) charts.delete(charts.keys().next().value);
    return x;
}
function geo(cx, a, b, n) {
    const k = a + '|' + b + '|' + n;
    let g = cx.geo.get(k);
    if (!g) { g = cx.chart.geodesic(a, b, n).map(p => ({ d: p.d, u: p.u })); cx.geo.set(k, g); }
    return g;
}
function viewPaths() {
    if (!st.t.paths || !st.an) return [];
    const out = [], seen = new Set(), main = lcaPair();
    if (main) { out.push(main); seen.add(main.join('|')); }
    const syn = st.an.tokens.filter(t => t.synset).map(t => t.key);
    for (let i = 0; i + 1 < syn.length && out.length < 12; i++) {
        if (syn[i] === syn[i + 1]) continue;
        const k = syn[i] + '|' + syn[i + 1];
        if (!seen.has(k)) { seen.add(k); out.push([syn[i], syn[i + 1]]); }
    }
    return out;
}
function ensureScene() { if (sceneDirty || !scene) { buildScene(); sceneDirty = false; } }
function buildScene() {
    const t = st.t, extra = [];
    if (st.sel !== null) extra.push(st.sel);
    for (const k of st.tokKeys) extra.push(k);
    if (st.overlay) extra.push(...st.overlay.keys);
    const paths = viewPaths();
    const v = Lex.view(st.centre, { siblings: t.siblings ? 24 : 0, children: t.children ? 48 : 0, grandchildren: t.grandchildren ? 4 : 0, extra, paths, siblingPage: st.sibPage, childPage: st.childPage });
    const cx = chartOf(st.centre), ch = cx.chart;
    const nodes = v.nodes.map(x => { const p = ch.place(x.key); return { key: x.key, rel: x.rel, roles: x.roles, node: Lex.node(x.key), d: p.d, u: p.u }; });
    const edges = v.edges.map(e => ({ from: e.from, to: e.to, hidden: e.hidden, g: geo(cx, e.from, e.to, clamp(e.letters.length * 4, 6, 48)) }));
    const virt = v.virtual.map(x => { const p = ch.place(x.word); return { d: p.d, u: p.u }; });
    const lines = paths.map((pr, j) => {
        const l = Lex.lca(pr[0], pr[1]), pts = [];
        for (let i = 0; i + 1 < l.pathWords.length; i++) { const seg = geo(cx, LC.wordStr(l.pathWords[i]), LC.wordStr(l.pathWords[i + 1]), 5); pts.push(...(i ? seg.slice(1) : seg)); }
        return { main: j === 0, pts };
    });
    scene = { v, nodes, edges, virt, lines, centre: st.centre };
    renderPaging();
}
function renderPaging() {
    const pg = scene.v.paging, out = [];
    const one = (name, p, act) => {
        if (!p.total || (!p.prev && !p.next)) return;
        out.push(`<button type="button" class="chip" data-pg="${act}:-1" ${p.prev ? '' : 'disabled'} aria-label="Previous ${name}">◀</button><span class="mono faint">${name} ${p.from + 1}–${p.to} of ${fmt(p.total)}</span><button type="button" class="chip" data-pg="${act}:1" ${p.next ? '' : 'disabled'} aria-label="Next ${name}">▶</button>`);
    };
    if (st.t.siblings) one('siblings', pg.siblings, 'sib');
    if (st.t.children) one('children', pg.children, 'child');
    $('paging').innerHTML = out.join('<span class="faint">·</span>');
    const ov = st.overlay;
    $('overlay').innerHTML = ov ? `<span class="muted" style="font-size:0.8rem">also drawn:</span><button type="button" class="chip on" id="b-ovl" title="Stop drawing them">${esc(ov.label)} ✕</button>` : '';
}
function invalidate(rebuild) {
    if (rebuild) sceneDirty = true;
    if (!raf) raf = requestAnimationFrame(draw);
}

// ------------------------------------------------------------------ drawing
function geodesicArc(ctx, a, b, S, ox, oy) {     // Engram Mind's Eye's mind-eye.js geodesic(): the circle orthogonal to the rim
    const A = [ox + a[0] * S, oy + a[1] * S], B = [ox + b[0] * S, oy + b[1] * S], det = a[0] * b[1] - a[1] * b[0];
    ctx.beginPath();
    if (Math.abs(det) < 1e-9) { ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); return; }
    const da = (a[0] ** 2 + a[1] ** 2 + 1) / 2, db = (b[0] ** 2 + b[1] ** 2 + 1) / 2;
    const cx = (da * b[1] - db * a[1]) / det, cy = (a[0] * db - b[0] * da) / det, r = Math.hypot(a[0] - cx, a[1] - cy);
    if (!(r < 1e6)) { ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); return; }
    const t1 = Math.atan2(a[1] - cy, a[0] - cx);
    let d = Math.atan2(b[1] - cy, b[0] - cx) - t1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    ctx.arc(ox + cx * S, oy + cy * S, r * S, t1, t1 + d, d < 0); ctx.stroke();
}
function geom(w, h) {
    const R = Math.min(w, h) / 2 - 12, ox = w / 2, oy = h / 2, s = st.spread, c = Math.cos(st.rot), sn = Math.sin(st.rot);
    const disk = p => { const q = LP.toDisk(p, s); return [q[0] * c - q[1] * sn, q[0] * sn + q[1] * c]; };   // a turn, after the chart
    const scr = q => [ox + R * q[0], oy - R * q[1]];
    return { R, ox, oy, disk, scr, at: p => scr(disk(p)) };
}
function canvasRatio(cv) {
    const w = cv.clientWidth || (cv.parentElement && cv.parentElement.clientWidth) || 360;
    return w < 600 ? 1 : clamp((window.innerHeight - 150) / w, 0.55, 0.8);
}
function draw() {
    raf = 0;
    if (!Lex) return;
    try {
        const cv = $('cv-disk'), { ctx, w, h } = UI.fitCanvas(cv, canvasRatio(cv));
        ctx.fillStyle = P.cvBg; ctx.fillRect(0, 0, w, h);
        if (st.mode === 'learned') return drawLearned(ctx, w, h);
        ensureScene();
        drawExact(ctx, w, h);
    } catch (e) {
        console.warn(e);
        $('disk-read').innerHTML = `<span class="err">The view could not be drawn: ${errText(e)}</span>`;
    }
}
function nodeStyle(x) {
    const k = x.key, n = x.node, col = n.kind === 'origin' ? P.text : P.root[n.word[0]];
    if (st.tokKeys.has(k)) return { r: 6, fill: col, ring: P.cvBg, layer: 8 };
    if (st.overlay && st.overlay.set.has(k)) {
        if (st.overlay.kind === 'session') { const s = st.overlay.speaker.get(k); return { r: 2.6 + Math.min(6, 1.4 * Math.sqrt(s.count)), fill: P.speaker[s.speaker] || P.speaker.unknown, ring: P.cvBg, layer: 7 }; }
        return { r: 3.6, fill: col, ring: P.text, layer: 7 };
    }
    if (k === st.centre) return { r: 5, fill: col, layer: 9 };
    switch (x.rel) {
        case 'ancestor': return { r: 3, fill: n.kind === 'origin' ? P.text : P.muted, layer: 0 };
        case 'grandchild': return { r: 2, fill: col, alpha: 0.75, layer: 1 };
        case 'sibling': return { r: 2.6, fill: col, layer: 2 };
        case 'child': return { r: 3, fill: col, layer: 3 };
        case 'path': return { r: 2.4, fill: col, layer: 4 };
        case 'lca': return { r: 3.4, fill: col, layer: 5 };
        default: return { r: 3, fill: col, layer: 6 };
    }
}
function drawExact(ctx, w, h) {
    const G = geom(w, h), S = scene, wide = w >= 560;
    ctx.strokeStyle = P.edge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(G.ox, G.oy, G.R, 0, 2 * Math.PI); ctx.stroke();
    // edges: true arcs at spread x1, the chart's float geodesics otherwise
    ctx.lineWidth = 1;
    for (const e of S.edges) {
        ctx.strokeStyle = e.hidden ? P.edgeFaint : P.edge;
        ctx.setLineDash(e.hidden ? [3, 3] : []);
        if (st.spread === 1) {
            const a = G.disk(e.g[0]), b = G.disk(e.g[e.g.length - 1]);
            geodesicArc(ctx, [a[0], -a[1]], [b[0], -b[1]], G.R, G.ox, G.oy);
        } else {
            ctx.beginPath();
            e.g.forEach((p, i) => { const [x, y] = G.at(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
            ctx.stroke();
        }
    }
    ctx.setLineDash([]);
    if (st.t.virtual) { ctx.fillStyle = P.virtual; for (const p of S.virt) { const [x, y] = G.at(p); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 2 * Math.PI); ctx.fill(); } }
    // paths through the lowest common ancestor
    for (const L of S.lines.slice().reverse()) {
        ctx.strokeStyle = P.path; ctx.lineWidth = L.main ? 2.6 : 1.3; ctx.globalAlpha = L.main ? 0.95 : 0.55; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath();
        L.pts.forEach((p, i) => { const [x, y] = G.at(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.stroke(); ctx.globalAlpha = 1;
    }
    // nodes, by layer
    hits = [];
    const drawn = S.nodes.map(x => ({ x, s: nodeStyle(x), p: G.at(x) })).sort((a, b) => a.s.layer - b.s.layer);
    for (const { x, s, p } of drawn) {
        ctx.globalAlpha = s.alpha || 1;
        if (s.ring) { ctx.fillStyle = s.ring; ctx.beginPath(); ctx.arc(p[0], p[1], s.r + 1.6, 0, 2 * Math.PI); ctx.fill(); }
        ctx.fillStyle = s.fill; ctx.beginPath(); ctx.arc(p[0], p[1], s.r, 0, 2 * Math.PI); ctx.fill();
        ctx.globalAlpha = 1;
        hits.push({ x: p[0], y: p[1], key: x.key });
    }
    const ring = (key, r, col, lw) => { const d = drawn.find(z => z.x.key === key); if (!d) return; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(d.p[0], d.p[1], r, 0, 2 * Math.PI); ctx.stroke(); };
    ring(st.centre, 9, P.textStrong, 1.5);
    for (const d of drawn) if (d.x.roles.includes('lca')) ring(d.x.key, 10.5, P.lca, 2);
    if (st.hover && st.hover !== st.sel) ring(st.hover, 8, P.text, 1.2);
    if (st.sel !== null) ring(st.sel, 12.5, P.sel, 2.2);
    if (st.t.labels) drawLabels(ctx, w, h, drawn);
    const readout = `centre ${shortName(S.centre)} · depth ${Lex.node(S.centre).depth} · ${S.centre.length} letters · spread ×${st.spread} · ${fmt(S.nodes.length)} nodes${S.v.truncated ? ' (truncated)' : ''}`;
    cornerText(ctx, w, h, wide, readout);
    $('cv-disk').setAttribute('aria-label', `The named tree in the Poincaré disk: ${readout}`);
}
function drawLabels(ctx, w, h, drawn) {
    const want = [], seen = new Set(), push = (key, text, strong) => { if (key === null || seen.has(key)) return; const d = drawn.find(z => z.x.key === key); if (!d) return; seen.add(key); want.push({ d, text, strong }); };
    const pieces = new Map();
    if (st.an) for (const t of st.an.tokens) { if (!pieces.has(t.key)) pieces.set(t.key, []); if (!pieces.get(t.key).includes(t.piece)) pieces.get(t.key).push(t.piece); }
    // tokens far from the centre land on the same pixels at the rim: one label per pixel group, as the 3D page does
    const groups = [];
    for (const [k, ps] of pieces) {
        const d = drawn.find(z => z.x.key === k);
        if (!d) continue;
        const g = groups.find(o => Math.hypot(o.p[0] - d.p[0], o.p[1] - d.p[1]) < 4);
        if (g) { g.keys.push(k); for (const p of ps) if (!g.names.includes(p)) g.names.push(p); } else groups.push({ p: d.p, keys: [k], names: ps.slice() });
    }
    const groupText = g => (g.names.length > 5 ? g.names.slice(0, 5).join(' / ') + ` +${g.names.length - 5}` : g.names.join(' / '));
    const selGroup = groups.find(g => g.keys.includes(st.sel));
    if (selGroup && pieces.has(st.sel)) { const mine = pieces.get(st.sel); selGroup.names = mine.concat(selGroup.names.filter(p => !mine.includes(p))); }   // the selection's pieces first
    push(st.sel, selGroup ? groupText(selGroup) : shortName(st.sel), true);
    if (selGroup) for (const k of selGroup.keys) seen.add(k);     // named in the selection's label
    if (st.hover) push(st.hover, shortName(st.hover), true);
    for (const g of groups) if (g !== selGroup) { push(g.keys[0], groupText(g), true); for (const k of g.keys) seen.add(k); }
    push(st.centre, shortName(st.centre), true);
    for (const d of drawn) if (d.x.roles.includes('lca')) push(d.x.key, shortName(d.x.key), false);
    const anc = Lex.ancestors(st.centre).slice(-6).reverse();
    for (const k of anc) push(k, shortName(k), false);
    const kids = drawn.filter(d => d.x.rel === 'child');
    if (kids.length <= 24) for (const d of kids) push(d.x.key, shortName(d.x.key), false);
    if (st.overlay && st.overlay.keys.length <= 24) for (const k of st.overlay.keys) push(k, shortName(k), false);
    ctx.font = '11px "Fira Code", ui-monospace, monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const boxes = [];
    for (const { d, text, strong } of want) {
        const tw = ctx.measureText(text).width, [px, py] = d.p;
        let x = 0, y = 0, box = null;
        for (const [dx, dy] of [[8, -7], [8, 8], [-8, -7], [-8, 8]]) {      // right above, right below, left above, left below
            x = clamp(dx > 0 ? px + dx : px + dx - tw, 4, w - 4 - tw); y = clamp(py + dy, 8, h - 8);
            const b = [x - 2, y - 7, x + tw + 2, y + 7];
            if (!boxes.some(o => !(b[2] < o[0] || b[0] > o[2] || b[3] < o[1] || b[1] > o[3]))) { box = b; break; }
        }
        if (!box) continue;
        boxes.push(box);
        ctx.lineWidth = 3; ctx.strokeStyle = P.cvBg; ctx.strokeText(text, x, y);
        ctx.fillStyle = strong ? P.textStrong : P.muted; ctx.fillText(text, x, y);
    }
}
function legendItems() {
    const items = ['noun', 'verb', 'adj/adv', '##', 'other', 'special'].map((s, i) => ({ dot: P.root[i], text: s }));
    items.push({ ring: P.textStrong, text: 'centre' }, { ring: P.lca, text: 'LCA' }, { ring: P.sel, text: 'selected' }, { dot: P.virtual, text: 'virtual letter', small: true });
    if (st.overlay && st.overlay.kind === 'session') for (const s of ['human', 'strix', 'biochain', 'stream']) if ([...st.overlay.speaker.values()].some(v => v.speaker === s)) items.push({ dot: P.speaker[s], text: s === 'strix' ? 'STRIX' : s });
    return items;
}
function cornerText(ctx, w, h, wide, readout) {
    const items = st.mode === 'exact' ? legendItems() : [{ dot: P.faint, text: 'mammal (learned point)' }, { dot: P.root[0], text: 'a noun of the sentence' }, { ring: P.sel, text: 'selected' }];
    $('disk-read').hidden = wide; $('disk-legend').hidden = wide;
    if (!wide) {
        $('disk-read').innerHTML = readout.split(' · ').map(s => `<span>${esc(s)}</span>`).join('');
        $('disk-legend').innerHTML = items.map(it => `<span><i style="--c:${it.dot || 'transparent'};${it.ring ? `box-shadow:inset 0 0 0 2px ${it.ring}` : ''}"></i>${esc(it.text)}</span>`).join('');
        return;
    }
    ctx.font = '11px "Fira Code", ui-monospace, monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const lines = [], parts = readout.split(' · ');
    let cur = '';
    for (const p of parts) { const t = cur ? cur + ' · ' + p : p; if (ctx.measureText(t).width > w * 0.46 && cur) { lines.push(cur); cur = p; } else cur = t; }
    if (cur) lines.push(cur);
    lines.forEach((l, i) => { ctx.lineWidth = 3; ctx.strokeStyle = P.cvBg; ctx.strokeText(l, 10, 14 + i * 15); ctx.fillStyle = P.muted; ctx.fillText(l, 10, 14 + i * 15); });
    const rows = [];
    let row = [], rw = 0;
    for (const it of items) { const iw = 16 + ctx.measureText(it.text).width + 10; if (rw + iw > w * 0.42 && row.length) { rows.push(row); row = []; rw = 0; } row.push([it, iw]); rw += iw; }
    if (row.length) rows.push(row);
    rows.forEach((r, j) => {
        let x = 10;
        const y = h - 12 - (rows.length - 1 - j) * 16;
        for (const [it, iw] of r) {
            if (it.ring) { ctx.strokeStyle = it.ring; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x + 5, y, 4.5, 0, 2 * Math.PI); ctx.stroke(); }
            else { ctx.fillStyle = it.dot; ctx.beginPath(); ctx.arc(x + 5, y, it.small ? 2 : 4.5, 0, 2 * Math.PI); ctx.fill(); }
            ctx.lineWidth = 3; ctx.strokeStyle = P.cvBg; ctx.strokeText(it.text, x + 14, y);
            ctx.fillStyle = P.muted; ctx.fillText(it.text, x + 14, y);
            x += iw;
        }
    });
}

// ------------------------------------------------------------------ the learned view (L6's measured d = 2 table)
let L6 = null;
function l6() {
    if (L6) return L6;
    const TEXT = (window.LexiconData || {}).l6_view_v1;
    if (typeof TEXT !== 'string') return (L6 = { error: 'data/l6_view_v1.js did not load' });
    try {
        const V = JSON.parse(TEXT), tb = V.tables.lorentz, sha = LC.sha256Hex(LC.textBytes(TEXT));
        const byOff = new Map(Lex.forest.noun.offsets.map((o, i) => [o, Lex.forest.noun.keys[i]]));
        L6 = { sha, ok: sha === LP.PINS.l6View, key: tb.key, n: V.nodes.length, off: V.nodes.map(x => x[0]), lemma: V.nodes.map(x => x[1]), sp: V.nodes.map(x => x[3]),
            pts: tb.rows.map(r => [Number(r[0]) / 4294967296, Number(r[1]) / 4294967296]), keys: V.nodes.map(x => byOff.get(x[0]) || null) };
        L6.index = new Map(L6.keys.map((k, i) => [k, i]));
    } catch (e) { L6 = { error: 'data/l6_view_v1.js could not be read: ' + e.message }; }
    return L6;
}
function drawLearned(ctx, w, h) {
    const V = l6(), out = $('learned-out');
    out.hidden = false;
    if (V.error) { out.innerHTML = bad(esc(V.error)); return; }
    const R = Math.min(w, h) / 2 - 12, ox = w / 2, oy = h / 2, c = Math.cos(st.rot), sn = Math.sin(st.rot), s = st.spread;
    const at = ([x, y]) => { const r = Math.hypot(x, y), rr = r > 0 ? Math.tanh(Math.atanh(Math.min(r, 1 - 1e-16)) / s) / r : 0, X = x * rr, Y = y * rr; return [ox + R * (X * c - Y * sn), oy - R * (X * sn + Y * c)]; };
    const pos = V.pts.map(at);
    ctx.strokeStyle = P.edge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(ox, oy, R, 0, 2 * Math.PI); ctx.stroke();
    ctx.strokeStyle = P.edgeFaint; ctx.lineWidth = 0.7; ctx.beginPath();
    for (let i = 0; i < V.n; i++) if (V.sp[i] >= 0) { ctx.moveTo(pos[i][0], pos[i][1]); ctx.lineTo(pos[V.sp[i]][0], pos[V.sp[i]][1]); }
    ctx.stroke();
    hits = [];
    ctx.fillStyle = P.faint;
    for (let i = 0; i < V.n; i++) { ctx.beginPath(); ctx.arc(pos[i][0], pos[i][1], 1.8, 0, 2 * Math.PI); ctx.fill(); hits.push({ x: pos[i][0], y: pos[i][1], key: V.keys[i], i }); }
    const inS = st.an ? st.an.tokens.filter(t => t.synset && V.index.has(t.key)) : [];
    const lab = [];
    for (const t of inS) { const i = V.index.get(t.key); ctx.fillStyle = P.cvBg; ctx.beginPath(); ctx.arc(pos[i][0], pos[i][1], 7.4, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = P.root[0]; ctx.beginPath(); ctx.arc(pos[i][0], pos[i][1], 6, 0, 2 * Math.PI); ctx.fill(); lab.push([i, t.piece]); }
    const si = st.sel !== null && V.index.has(st.sel) ? V.index.get(st.sel) : -1;
    if (si >= 0) { ctx.strokeStyle = P.sel; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(pos[si][0], pos[si][1], 10, 0, 2 * Math.PI); ctx.stroke(); lab.unshift([si, V.lemma[si].replace(/_/g, ' ')]); }
    ctx.font = '11px "Fira Code", ui-monospace, monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const seen = new Set();
    for (const [i, text] of lab) { if (seen.has(i)) continue; seen.add(i); const x = Math.min(pos[i][0] + 9, w - 6 - ctx.measureText(text).width), y = pos[i][1] - 8; ctx.lineWidth = 3; ctx.strokeStyle = P.cvBg; ctx.strokeText(text, x, y); ctx.fillStyle = P.textStrong; ctx.fillText(text, x, y); }
    const readout = `L6 · learned Lorentz d = 2 · seed 0 · ${fmt(V.n)} mammals · spread ×${st.spread}`;
    cornerText(ctx, w, h, w >= 560, readout);
    $('p-disk').dataset.learned = String(V.n);
    out.innerHTML = `data/l6_view_v1.js: JSON text SHA-256 <span class="mono">${esc(V.sha.slice(0, 16))}…</span> ${V.ok ? good('= the pin ✓') : bad('≠ the pin ✗')} · <span class="mono">${esc(V.key)}</span>, L6’s measured table of the ${fmt(V.n)} synsets of the mammal closure (Poincaré coordinates n/2³², straight spanning edges). ` +
        `A measured table; it decides nothing here. ${inS.length ? `The sentence’s nouns in the closure: ${inS.map(t => `<b>${esc(t.piece)}</b>`).join(', ')}.` : 'None of the sentence’s nouns is in the closure: try “The dog chased the cat.”'}` +
        (st.learnedSel >= 0 ? `<br>Picked: <b>${esc(V.lemma[st.learnedSel].replace(/_/g, ' '))}</b> (${esc(V.off[st.learnedSel])}), selected and centred in the exact view.` : ' Click a point to select it and centre it in the exact view.');
    $('cv-disk').setAttribute('aria-label', 'L6’s learned d = 2 table of the mammals in the Poincaré disk');
}

// ------------------------------------------------------------------ overlays from the shard and Engram panels
function showShard(keys) {
    st.overlay = { kind: 'shard', keys: keys.slice(), set: new Set(keys), label: `the shard’s ${fmt(keys.length)} words` };
    setMode('exact');
    setCentre(centreOfKeys(keys));
    $('p-disk').scrollIntoView({ block: 'nearest' });
}
function showSession(imp) {
    const speaker = new Map();
    for (const x of imp.words) {
        let best = 'unknown', n = -1;
        for (const [s, c] of Object.entries(x.bySource)) if (c > n) { n = c; best = s; }
        speaker.set(x.key, { speaker: best, count: x.count });
    }
    const keys = imp.words.map(x => x.key);
    st.overlay = { kind: 'session', keys, set: new Set(keys), speaker, label: `the Engram session’s ${fmt(keys.length)} words` };
    setMode('exact');
    setCentre(centreOfKeys(keys));
    $('p-disk').scrollIntoView({ block: 'nearest' });
}
function useTurn(an, info) {
    const text = info && typeof info.text === 'string' ? info.text : an.text;
    st.text = String(text).slice(0, MAXLEN);
    $('q').value = st.text;
    analyse();
    $('p-input').scrollIntoView({ block: 'nearest' });
}

// ------------------------------------------------------------------ controls
function setMode(m) {
    st.mode = m === 'learned' ? 'learned' : 'exact';
    $('mode').value = st.mode;
    $('p-disk').dataset.mode = st.mode;
    $('learned-out').hidden = st.mode !== 'learned';
    st.hover = null;
    invalidate(true);
    guard(renderSel);
}
function syncControls() {
    $('spread').value = String(st.spread);
    $('spread-v').textContent = '×' + st.spread;
    for (const cb of $('toggles').querySelectorAll('input[data-t]')) cb.checked = !!st.t[cb.dataset.t];
}
function setSpread(v) {
    st.spread = clamp(Math.round(v * 2) / 2, 1, 6);
    syncControls();
    invalidate(false);
    writeStore();
}
function hitAt(clientX, clientY, maxPx) {
    const r = $('cv-disk').getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top;
    let best = null, bd = maxPx * maxPx;
    for (const p of hits) { const dx = p.x - x, dy = p.y - y, d = dx * dx + dy * dy; if (d <= bd && typeof p.key === 'string') { bd = d; best = p; } }
    return best;
}
function pickAt(clientX, clientY, maxPx, centre) {
    const hit = hitAt(clientX, clientY, maxPx);
    if (!hit) return false;
    if (st.mode === 'learned') { st.learnedSel = hit.i; select(hit.key); setCentre(hit.key); return true; }
    select(hit.key);
    if (centre) setCentre(hit.key);
    return true;
}
function initControls() {
    let deb = 0;
    $('q').addEventListener('input', () => {
        clearTimeout(deb);
        deb = setTimeout(() => { const v = $('q').value.slice(0, MAXLEN); if (v !== st.text) { st.text = v; analyse(); } }, 150);
    });
    $('examples').innerHTML = EXAMPLES.map((s, i) => `<button type="button" class="chip" data-ex="${i}">${esc(s)}</button>`).join('');
    $('examples').addEventListener('click', e => { const b = e.target.closest('[data-ex]'); if (!b) return; st.text = EXAMPLES[Number(b.dataset.ex)]; $('q').value = st.text; analyse(); });
    $('toks').addEventListener('click', e => { const b = e.target.closest('.tok'); if (!b) return; const t = st.an.tokens[Number(b.dataset.i)]; if (t) select(t.key, t.i); });
    const rowPick = e => { const tr = e.target.closest('tr[data-i]'); if (!tr) return; const t = st.an.tokens[Number(tr.dataset.i)]; if (t) select(t.key, t.i); };
    $('tok-table').addEventListener('click', rowPick);
    $('tok-table').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rowPick(e); } });
    $('tok-pager').addEventListener('click', e => { const b = e.target.closest('[data-tp]'); if (!b) return; st.tokPage += Number(b.dataset.tp); guard(renderTokens); renderBitsTable(); drawBits(); });
    // the disk's controls
    $('b-up').addEventListener('click', () => { const p = Lex.parentKey(st.centre); if (p !== null) setCentre(p); });
    $('b-back').addEventListener('click', () => { if (st.hist.length) setCentre(st.hist.pop(), false); });
    $('b-origin').addEventListener('click', () => setCentre(''));
    $('b-centre').addEventListener('click', () => { if (st.sel !== null) setCentre(st.sel); });
    $('spread').addEventListener('input', e => setSpread(Number(e.target.value)));
    $('b-sminus').addEventListener('click', () => setSpread(st.spread - 0.5));
    $('b-splus').addEventListener('click', () => setSpread(st.spread + 0.5));
    $('b-rot0').addEventListener('click', () => { st.rot = 0; invalidate(false); });
    $('toggles').addEventListener('change', e => { const cb = e.target.closest('input[data-t]'); if (!cb) return; st.t[cb.dataset.t] = cb.checked; if (cb.dataset.t === 'siblings') st.sibPage = 0; if (cb.dataset.t === 'children') st.childPage = 0; invalidate(true); writeStore(); });
    $('paging').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (!b) return; const [which, d] = b.dataset.pg.split(':'); if (which === 'sib') st.sibPage += Number(d); else st.childPage = Math.max(0, st.childPage + Number(d)); invalidate(true); });
    $('overlay').addEventListener('click', e => { if (e.target.closest('#b-ovl')) { st.overlay = null; invalidate(true); } });
    $('mode').addEventListener('change', e => setMode(e.target.value));
    // find
    const findOut = $('find-out');
    const go = key => { findOut.innerHTML = ''; setMode('exact'); select(key); setCentre(key); };
    $('find').addEventListener('input', () => {
        const q = $('find').value;
        const res = q.trim() ? Lex.search(q, 8) : [];
        findOut.innerHTML = q.trim() ? (res.length ? res.map(n => `<button type="button" class="chip" data-find="${esc(n.key)}">${esc(Lex.label(n))}</button>`).join('') : faint('no first lemma or piece starts so')) : '';
    });
    $('find').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); const r = Lex.search($('find').value, 1); if (r.length) go(r[0].key); }
        if (e.key === 'Escape') findOut.innerHTML = '';
    });
    findOut.addEventListener('click', e => { const b = e.target.closest('[data-find]'); if (b) go(b.dataset.find); });
    // links in the selected panel: ancestors centre and select; nearest entries select
    $('sel-body').addEventListener('click', e => {
        const b = e.target.closest('[data-go]');
        if (!b) return;
        const k = b.dataset.go;
        select(k);
        if (!b.dataset.sel) setCentre(k);
    });
    // the LCA panel
    $('lca-a').addEventListener('change', e => { st.lcaA = Number(e.target.value); guard(renderLca); invalidate(true); });
    $('lca-b').addEventListener('change', e => { st.lcaB = Number(e.target.value); guard(renderLca); invalidate(true); });
    $('b-lca-centre').addEventListener('click', () => { const pr = lcaPair(); if (pr) setCentre(Lex.lca(pr[0], pr[1]).named); });
    $('b-lca-a').addEventListener('click', () => { const t = st.an.tokens[st.lcaA]; if (t) select(t.key, t.i); });
    $('b-lca-b').addEventListener('click', () => { const t = st.an.tokens[st.lcaB]; if (t) select(t.key, t.i); });
    // the canvas: click selects, double-click or long-press centres, a sideways drag turns
    const cv = $('cv-disk');
    let ptr = null, longAt = -1e9;
    cv.addEventListener('pointerdown', ev => {
        if (ev.pointerType === 'mouse' && ev.button !== 0) return;
        ptr = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, rot0: st.rot, moved: false, long: false, type: ev.pointerType, timer: 0 };
        if (ev.pointerType !== 'mouse') ptr.timer = setTimeout(() => { if (ptr && !ptr.moved) { ptr.long = true; longAt = performance.now(); pickAt(ptr.x0, ptr.y0, 24, true); } }, 600);
    });
    cv.addEventListener('pointermove', ev => {
        if (ptr && ev.pointerId === ptr.id) {
            const dx = ev.clientX - ptr.x0, dy = ev.clientY - ptr.y0;
            if (!ptr.moved && Math.hypot(dx, dy) > 6) { ptr.moved = true; clearTimeout(ptr.timer); cv.classList.add('dragging'); try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ } }
            if (ptr.moved) { st.rot = ptr.rot0 - dx * Math.PI / Math.max(200, cv.clientWidth); invalidate(false); }
            return;
        }
        if (ev.pointerType !== 'mouse') return;
        const hit = hitAt(ev.clientX, ev.clientY, 10), k = hit ? hit.key : null;
        if (st.mode === 'exact' && k !== st.hover) { st.hover = k; invalidate(false); }
    });
    const end = ev => {
        if (!ptr || ev.pointerId !== ptr.id) return;
        clearTimeout(ptr.timer);
        if (ev.type === 'pointerup' && !ptr.moved && !ptr.long) pickAt(ev.clientX, ev.clientY, ptr.type === 'mouse' ? 12 : 18, false);
        cv.classList.remove('dragging');
        ptr = null;
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', () => { if (st.hover) { st.hover = null; invalidate(false); } });
    // a tap and then a long-press close by can make the browser fire a dblclick on release, after the long-press has
    // already recentred: ignore it, or it would recentre again on whatever node now sits under the finger
    cv.addEventListener('dblclick', ev => { if (performance.now() - longAt < 1000) return; pickAt(ev.clientX, ev.clientY, 12, true); });
    cv.addEventListener('keydown', e => {
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'ArrowRight') { st.rot += k === 'ArrowLeft' ? 0.1 : -0.1; invalidate(false); }
        else if (k === '+' || k === '=') setSpread(st.spread + 0.5);
        else if (k === '-') setSpread(st.spread - 0.5);
        else if (k === 'u' || k === 'ArrowUp') $('b-up').click();
        else if (k === 'b' || k === 'Backspace') $('b-back').click();
        else if (k === 'o') $('b-origin').click();
        else if (k === 'Enter') $('b-centre').click();
        else return;
        e.preventDefault();
    });
    // the bits chart's tooltip
    const bc = $('cv-bits');
    bc.addEventListener('pointermove', bitsTip);
    bc.addEventListener('pointerleave', () => { $('bits-tip').hidden = true; });
    bc.addEventListener('click', ev => { const r = bc.getBoundingClientRect(), x = ev.clientX - r.left, b = bitsHits.find(z => x >= z.x0 && x < z.x1); if (b) select(b.t.key, b.t.i); });
    // sizes, the colour scheme, the hash
    if (typeof ResizeObserver === 'function') {
        let lastW = 0, lastB = 0;
        new ResizeObserver(() => { const w = $('p-disk').clientWidth, b = $('bits-wrap').clientWidth; if (w !== lastW) { lastW = w; invalidate(false); } if (b !== lastB) { lastB = b; drawBits(); } }).observe(document.querySelector('.board'));
    } else window.addEventListener('resize', () => { invalidate(false); drawBits(); });
    UI.onScheme(() => { P = UI.palette(); renderBitsTable(); drawBits(); invalidate(false); });
    window.addEventListener('hashchange', () => { const t = hashText(); if (t !== null && t.slice(0, MAXLEN) !== st.text) { st.text = t.slice(0, MAXLEN); $('q').value = st.text; analyse(); } });
}

setTimeout(boot, 20);
})();
