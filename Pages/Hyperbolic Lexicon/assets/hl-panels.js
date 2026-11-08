// Hyperbolic Lexicon: the panels both app pages mount (Phase 5), and their small shared helpers.
//
//   LexiconPanels.mountChecks(el, { Lex, error })        the load checks; "Recompute LADDR/1"; "Check every noun's points"
//   LexiconPanels.mountShard(el, { Lex, file, getText, onTokens })
//                                                        grow, sign and verify a shard (LexiconPages.shard); tampers;
//                                                        onTokens(keys, ids) shows the shard's tokens in the tree
//   LexiconPanels.mountEngram(el, { Lex, onSession, onTurn, onPair })
//                                                        read an Engram Mind's Eye session (this browser's storage, a
//                                                        file, or pasted text) through LexiconPages.engram; onSession
//                                                        (EngramImport), onTurn(Analysis, { source, index }), onPair(A, B)
//   LexiconPanels.palette()      the canvas colours, read from hl-app.css's custom properties
//   LexiconPanels.onScheme(cb)   cb() when the colour scheme changes (prefers-color-scheme or data-theme)
//   LexiconPanels.fitCanvas(cv, ratio) -> { ctx, w, h }  Engram Mind's Eye's fit(): CSS width, height = width * ratio,
//                                                        devicePixelRatio
//   LexiconPanels.fmtBig(n, max) "1234…5678 (183 bits)" for a BigInt with more than max digits
// Each mount returns a small handle (the shard's run(), tamper(name) and last; the Engram panel's importText(text);
// the checks' laddr() and nouns()) and sets the data attributes the pages' tests read: #p-shard[data-verdict],
// #p-engram[data-imported], and on the checks panel data-laddr and data-nouns ("ok" or "bad").
// It computes nothing itself: every number comes from LexiconPages (assets/hl-pages.js) and lexicon_core.js.
// Nothing is ever written to Engram Mind's Eye's storage.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(null);
    else root.LexiconPanels = factory(root);
})(typeof self !== 'undefined' ? self : this, function (root) {
'use strict';
const LP = () => (root && root.LexiconPages) || null;
const LC = () => (root && root.LexiconCore) || null;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const ms = x => (x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : fmt(Math.round(x)));
const good = s => `<span class="good">${s}</span>`, bad = s => `<span class="bad">${s}</span>`, faint = s => `<span class="faint">${s}</span>`;
const mark = ok => (ok === true ? good('✓') : ok === false ? bad('✗') : faint('·'));
const later = () => new Promise(r => setTimeout(r, 20));
const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
const errText = e => esc((e && e.message) || e);
const short = (s, n = 16) => (s && s.length > n ? esc(s.slice(0, n)) + '…' : esc(s || ''));

function fmtBig(n, max = 40) {
    n = BigInt(n);
    const a = n < 0n ? -n : n, s = a.toString(), sign = n < 0n ? '−' : '';
    if (s.length <= max) return sign + s;
    const k = Math.max(4, Math.floor((max - 1) / 2));
    return `${sign}${s.slice(0, k)}…${s.slice(-k)} (${a.toString(2).length} bits)`;
}
function palette(elm) {
    const cs = getComputedStyle(elm || document.documentElement), v = n => cs.getPropertyValue(n).trim();
    return {
        bg: v('--bg'), panel: v('--panel'), line: v('--line'), text: v('--text'), textStrong: v('--text-strong'), muted: v('--muted'), faint: v('--faint'),
        cyan: v('--cyan'), gold: v('--gold'), rose: v('--rose'), emerald: v('--emerald'), fuchsia: v('--fuchsia'), amber: v('--amber'), purple: v('--purple'),
        root: [0, 1, 2, 3, 4, 5].map(i => v('--r' + i)),
        speaker: { human: v('--human'), strix: v('--strix'), biochain: v('--biochain'), stream: v('--stream'), unknown: v('--unknown') },
        cvBg: v('--cv-bg'), edge: v('--edge'), edgeFaint: v('--edge-faint'), virtual: v('--virtual'), path: v('--path'), lca: v('--lca'), sel: v('--sel'),
        axes: [v('--ax0'), v('--ax1'), v('--ax2')],
    };
}
function onScheme(cb) {
    const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null, h = () => cb();
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', h); else if (mq.addListener) mq.addListener(h); }
    const mo = typeof MutationObserver === 'function' ? new MutationObserver(h) : null;
    if (mo) mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', h); else if (mq.removeListener) mq.removeListener(h); } if (mo) mo.disconnect(); };
}
function fitCanvas(cv, ratio) {
    const w = Math.max(200, cv.clientWidth || (cv.parentElement && cv.parentElement.clientWidth) || 300), h = Math.round(w * ratio), d = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); cv.style.height = h + 'px'; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
}
// the panel's body: keeps the page's own <h2> if it has one
function body(el, title, sub, html) {
    if (!el.querySelector(':scope > h2')) el.insertAdjacentHTML('afterbegin', `<h2>${title} <small>${sub}</small></h2>`);
    const div = document.createElement('div');
    div.className = 'panel-body';
    div.innerHTML = html;
    el.appendChild(div);
    const q = s => div.querySelector(s);
    return { div, q, role: r => q(`[data-role="${r}"]`), act: a => q(`[data-act="${a}"]`) };
}
const engineMissing = (el, title, error) => {
    body(el, title, 'not available', `<p class="err">${error ? 'The page engine did not load: ' + errText(error) : 'The page engine did not load.'}</p>`);
    return null;
};
const rootLabel = (Lex, t) => `${esc(t.rootName)} · ${esc(Lex.label(t.node))}`;

// ================================================================== checks
function mountChecks(el, { Lex, error = null } = {}) {
    const P = body(el, 'Checks', 'the data at load; two more on demand', `
        <div class="checks" data-role="load"></div>
        <div class="row">
            <button type="button" class="btn btn-ghost" data-act="laddr">Recompute LADDR/1</button>
            <button type="button" class="btn btn-ghost" data-act="nouns" title="Several seconds and about 100 MB of memory">Check every noun's points</button>
        </div>
        <div class="progress" data-role="bar" hidden><i></i></div>
        <div class="checks" data-role="demand"></div>
        <p class="help">At load the page checks both WordNet texts against their pins, builds wn-lite, runs the core's L3 rule and map A on it and compares them with the decisive runs' records. "Recompute LADDR/1" builds the address table of all 8,192 V0 entries from this page's data (about half a second of work, in short steps; the shard panel starts it once the page is idle, and both reuse it). "Check every noun's points" writes L3(f)'s canonical point list of all 82,115 nouns and hashes it: several seconds and about 100 MB of memory.</p>`);
    const load = P.role('load'), demand = P.role('demand'), bar = P.role('bar');
    if (!Lex) { load.innerHTML = `<div>${bad('✗')} the engine did not load${error ? ': ' + errText(error) : ''}${error && error.stage ? ` (stage ${esc(error.stage)})` : ''}</div>`; P.act('laddr').disabled = P.act('nouns').disabled = true; return null; }
    load.innerHTML = Lex.checks.map(c => `<div>${mark(c.ok)} ${esc(c.name)} <span class="ms">${ms(c.ms)} ms</span><br>${faint(esc(c.detail))}</div>`).join('') +
        `<div>${Lex.ok ? good('all load checks pass') : bad('a load check failed: the views that need it are disabled')} <span class="ms">loaded in ${ms(Lex.ms)} ms</span></div>`;
    const lines = {};
    const show = () => { demand.innerHTML = Object.values(lines).join(''); };
    async function laddr() {
        const b = P.act('laddr');
        b.disabled = true; lines.laddr = `<div>${faint('recomputing LADDR/1 from this page\'s data…')}</div>`; show(); await later();
        try {
            const A = Lex.addrTableAsync ? await Lex.addrTableAsync() : Lex.addrTable(), pin = LP().PINS;
            lines.laddr = `<div>${mark(A.ok)} addrTableRoot <span class="mono">${short(A.root)}</span> over ${fmt(A.rows.length)} rows ${A.ok ? '= the decisive run\'s' : '≠ the decisive run\'s ' + short(pin.addrTableRoot)} <span class="ms">${ms(A.ms)} ms</span><br>` +
                `${mark(A.laddr.ok)} LADDR/1 hash <span class="mono">${short(A.laddr.sha256)}</span> ${A.laddr.ok ? '= the recorded laddrHash' : '≠ ' + short(pin.laddrHash)}</div>`;
            el.dataset.laddr = A.ok && A.laddr.ok ? 'ok' : 'bad';
        } catch (e) { lines.laddr = `<div>${bad('✗')} ${errText(e)}</div>`; el.dataset.laddr = 'bad'; }
        show(); b.disabled = false;
    }
    async function nouns() {
        const b = P.act('nouns');
        b.disabled = true; bar.hidden = false; bar.firstChild.style.width = '0%';
        lines.nouns = `<div>${faint('writing the canonical point list…')}</div>`; show(); await later();
        try {
            const r = await Lex.verifyNouns({ onProgress: (stage, done, n) => { bar.firstChild.style.width = `${Math.round(100 * (stage === 'H3 points' ? 0.05 : stage === 'H2 points' ? 0.15 : stage === 'lines' ? 0.15 + 0.8 * done / n : 0.97))}%`; lines.nouns = `<div>${faint(esc(stage) + '…')}</div>`; show(); } });
            const pin = LP().PINS.canonicalPointList;
            lines.nouns = `<div>${mark(r.ok)} canonical point list of ${fmt(pin.nouns)} nouns: <span class="mono">${short(r.sha256)}</span>, ${fmt(r.bytes)} bytes ${r.ok ? '= L3\'s record' : '≠ L3\'s record ' + short(pin.sha256)} <span class="ms">${ms(r.ms)} ms</span></div>`;
            el.dataset.nouns = r.ok ? 'ok' : 'bad';
        } catch (e) { lines.nouns = `<div>${bad('✗')} ${errText(e)}</div>`; el.dataset.nouns = 'bad'; }
        bar.firstChild.style.width = '100%'; show(); b.disabled = false;
        setTimeout(() => { bar.hidden = true; }, 600);
    }
    P.act('laddr').addEventListener('click', laddr);
    P.act('nouns').addEventListener('click', nouns);
    return { laddr, nouns };
}

// ================================================================== the shard panel (Explainer 11's lab, on this page's data)
function mountShard(el, { Lex, file = 'lexicon', getText = () => '', onTokens = null, error = null } = {}) {
    if (!Lex || !LP()) return engineMissing(el, 'Shard', error);
    const S = LP().shard;
    const P = body(el, 'Shard', 'grow, sign and verify a language shard', `
        <textarea class="seedbox" rows="4" data-role="text" aria-label="The shard's text"></textarea>
        <div class="row">
            <button type="button" class="chip" data-act="sentence">use the sentence</button>
            <button type="button" class="chip" data-act="sample">the sample paragraph</button>
            <label><input type="checkbox" data-role="eng"> engram layer</label>
            <span class="mono faint" data-role="size"></span>
        </div>
        <div class="row">
            <button type="button" class="btn btn-primary" data-act="run">Grow, sign and verify</button>
            <button type="button" class="btn btn-ghost" data-act="show" disabled>Show its tokens in the tree</button>
        </div>
        <div class="verdict" data-role="status"></div>
        <div data-role="out" hidden>
            <h3 class="mini">The record</h3><div class="kv" data-role="record"></div>
            <h3 class="mini">The session</h3><div class="checks" data-role="session"></div>
            <h3 class="mini">LPREP/1</h3><div class="longtext" data-role="lprep"></div>
            <h3 class="mini">The verifier</h3>
            <div class="tw"><table class="small"><thead><tr><th class="num">#</th><th>check</th><th>result</th><th class="num">ms</th><th>detail</th></tr></thead><tbody data-role="checks"></tbody></table></div>
            <div class="verdict" data-role="verdict"></div>
            <h3 class="mini">Tampers</h3>
            <div class="row" data-role="chips">${S.TAMPERS.map(t => `<button type="button" class="chip" data-t="${t}" disabled>${t}</button>`).join('')}<button type="button" class="chip" data-act="all" disabled>all tampers</button></div>
            <div class="tw"><table class="small"><thead><tr><th>tamper</th><th>what changed</th><th>self-consistent / authentic</th><th>first failing check</th><th>checks</th><th>Owl's rule</th></tr></thead><tbody data-role="tampers"></tbody></table></div>
        </div>
        <p class="help">This panel demonstrates the code and decides nothing: L8 to L11 were decided in Phase 3 (Explainer 11). It follows Explainer 11's lab with one change: LADDR/1 is recomputed here from this page's own data, not taken on trust. Keys are made in this page (WebCrypto P-256 when the context offers it; otherwise the core's own deterministic ECDSA, with the attestation check skipped). Texts up to 60,000 bytes; with the engram layer, up to 6,000.</p>`);
    const ta = P.role('text'), eng = P.role('eng'), status = P.role('status'), out = P.role('out');
    const chips = [...P.role('chips').querySelectorAll('[data-t]')], allBtn = P.act('all'), runBtn = P.act('run'), showBtn = P.act('show');
    ta.value = getText() || S.SAMPLE;
    let run = null, busy = false;
    function sizeLine() {
        let n;
        try { n = LC().shardText(ta.value).data.length; } catch (e) { P.role('size').textContent = ''; return; }
        const k = Math.ceil(n / 720);
        let s = `${fmt(n)} bytes, ${fmt(k)} chunk${k === 1 ? '' : 's'}`;
        if (n > S.CAP) s += ' (over the 60,000-byte cap)';
        else if (eng.checked && n > S.CAP_ENGRAMS) s += ' (over 6,000 with the engram layer)';
        P.role('size').textContent = s;
    }
    ta.addEventListener('input', sizeLine); eng.addEventListener('change', sizeLine);
    P.act('sentence').addEventListener('click', () => { ta.value = getText(); sizeLine(); });
    P.act('sample').addEventListener('click', () => { ta.value = S.SAMPLE; sizeLine(); });
    sizeLine();
    // LADDR/1 (about 0.5 s of work) is memoised by the engine: build it once the page is idle, not on the first click,
    // and in steps of tens of milliseconds (addrTableAsync), so typing or turning the view meanwhile is not held up
    const warm = () => { if (Lex.addrTableAsync) Lex.addrTableAsync().catch(() => { /* the run reports it */ }); };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(warm, { timeout: 10000 }); else setTimeout(warm, 2000);
    const setTampers = on => { allBtn.disabled = !on; chips.forEach(b => { b.disabled = !on || (b.dataset.t === 'T4' && !(run && run.webcrypto)); }); };
    const tf = b => (b ? 'true' : 'false');
    function render(r) {
        const rec = r.record;
        P.role('record').innerHTML = [['chainId', rec.chainId], ['frames (K)', `${r.K} (720 bytes each, the last shorter)`], ['merkleRoot', rec.merkleRoot], ['weaveChiral', rec.weaveChiral], ['bytes', fmt(r.bytes)],
            ['engram layer', rec.engramStream !== undefined ? `${fmt(rec.engramCount)} engrams, mean J ${rec.engramMeanJ}` : 'off']]
            .map(([k, v]) => `<span>${esc(k)}</span><span class="mono">${esc(v)}</span>`).join('');
        const pin = LP().PINS;
        P.role('session').innerHTML =
            `<div>${mark(r.lvocab.equalsRun)} LVOCAB/1 built here from the pinned V0 and table: hash <span class="mono">${short(r.lvocab.sha256)}</span> ${r.lvocab.equalsRun ? '= the decisive run\'s' : '≠ the decisive run\'s'}</div>` +
            `<div>${mark(r.laddr.rootOk)} LADDR/1 <b>${esc(r.laddr.source)}</b>: addrTableRoot <span class="mono">${short(r.laddr.root)}</span> ${r.laddr.rootOk ? '= the decisive run\'s' : '≠ ' + short(pin.addrTableRoot)}; ${mark(r.laddr.equalsRun)} hash <span class="mono">${short(r.laddr.sha256)}</span> ${r.laddr.equalsRun ? '= the recorded laddrHash' : '≠ ' + short(pin.laddrHash)} <span class="ms">${ms(r.timings.laddr)} ms</span></div>` +
            `<div>${faint('·')} identity <span class="mono">${esc(r.identity)}</span>, key vector <span class="mono">${esc(r.keyVector)}</span>, epoch <span class="mono">${esc(r.epoch)}</span></div>` +
            `<div>${faint('·')} registry: two P-256 keys made in this page${r.webcrypto ? ' with WebCrypto' : ' (no WebCrypto here: from random scalars, with the core\'s own arithmetic)'}: <span class="mono" style="overflow-wrap:anywhere">${esc(r.keys.active)}</span> active, <span class="mono" style="overflow-wrap:anywhere">${esc(r.keys.revoked)}</span> revoked; snapshot ${fmt(r.registry.text.length)} bytes, SHA-256 <span class="mono">${short(r.registry.sha256)}</span></div>`;
        P.role('lprep').innerHTML = `${esc(r.lprep.text)}<br>${faint('its SHA-256 ' + esc(r.lprep.sha256) + '; built in ' + ms(r.timings.lprep) + ' ms')}`;
        P.role('checks').innerHTML = r.verdict.checks.map((c, i) => `<tr><td class="num">${i + 1}</td><td>${esc(c.name)}</td><td>${c.ok === true ? good('pass') : c.ok === false ? bad('fail') : faint('skipped')}</td>` +
            `<td class="num">${c.ok === null ? '–' : ms(c.ms)}</td><td class="wrap">${esc(c.ok === null ? c.detail : c.detail)}</td></tr>`).join('');
        P.role('verdict').innerHTML = `self-consistent ${r.verdict.selfConsistent ? good('true') : bad('false')} · authentic ${r.webcrypto ? (r.verdict.authentic ? good('true') : bad('false')) : faint('not checked (no WebCrypto here)')} · failed ${esc(r.verdict.failed)} · ` +
            `${r.accepted ? good('accepted') : bad('rejected')} <span class="ms">(verified in ${ms(r.timings.verify)} ms)</span><br>Owl's rule (verifyBiochain): ${r.owl.ok ? good('accepts') : bad('rejects')}: ${esc(r.owl.reasons.join('; '))}`;
        P.role('tampers').innerHTML = S.TAMPERS.map(t => `<tr data-t="${t}"><td>${t}</td><td class="wrap">–</td><td>–</td><td class="wrap">–</td><td class="mono">–</td><td class="wrap">–</td></tr>`).join('');
        out.hidden = false;
    }
    async function go() {
        if (busy) return null;
        busy = true; runBtn.disabled = true; showBtn.disabled = true; setTampers(false); run = null;
        el.removeAttribute('data-verdict');
        out.hidden = true;                // render() shows the new run; a refused or failed run leaves nothing stale
        try {
            status.innerHTML = faint('growing, committing, signing and verifying…'); await later();
            const t = now();
            run = await S.run(Lex, ta.value, { engrams: eng.checked, source: 'page:' + file });
            render(run);
            status.innerHTML = `${fmt(run.bytes)} bytes grown into ${run.K} frame${run.K === 1 ? '' : 's'} in ${ms(run.timings.grow)} ms (engrams ${run.engrams ? 'on' : 'off'}); signed in ${ms(run.timings.sign)} ms; ` +
                `${run.accepted ? good('accepted') : bad('rejected at ' + esc(run.verdict.failed))}; Owl's rule in ${ms(run.timings.owl)} ms; ${ms(now() - t)} ms in all. Now break it with the tampers below.`;
            el.dataset.verdict = run.accepted ? 'accepted' : 'rejected';
            setTampers(true); showBtn.disabled = !onTokens;
        } catch (e) { status.innerHTML = bad(errText(e)); el.dataset.verdict = 'rejected'; }
        finally { busy = false; runBtn.disabled = false; }
        return run;
    }
    async function tamper(name) {
        if (!run) return null;
        const tr = P.role('tampers').querySelector(`tr[data-t="${name}"]`), c = tr.cells;
        for (const k of [1, 2, 3, 4, 5]) c[k].textContent = '…';
        await later();
        let r;
        try { r = await S.tamper(run, name); } catch (e) { c[3].innerHTML = bad('could not build: ' + errText(e)); return null; }
        c[1].textContent = r.what;
        if (r.skip) { c[2].innerHTML = c[3].innerHTML = faint('not run'); c[4].textContent = c[5].textContent = '–'; return r; }
        c[2].textContent = `${tf(r.verdict.selfConsistent)} / ${run.webcrypto ? tf(r.verdict.authentic) : 'not checked'}`;
        c[3].innerHTML = r.firstFail ? `${good(esc(r.firstFail.name))} ${faint(esc(r.firstFail.detail))}` : bad('none: accepted');
        c[4].textContent = r.letters;
        c[5].innerHTML = r.owl.ok ? (r.unchanged ? faint('accepts: the record is unchanged, and it reads neither LPREP/1 nor the signature') : `${bad('accepts')} ${faint(esc(r.owl.reasons[0] || ''))}`) : `${good('rejects')}: ${esc(r.owl.reasons.join('; '))}`;
        tr.dataset.verdict = r.verdict.failed === '-' ? 'accepted' : 'rejected';
        return r;
    }
    async function guarded(fn) {
        if (busy || !run) return;
        busy = true; runBtn.disabled = true; setTampers(false);
        try { await fn(); } catch (e) { status.innerHTML = bad(errText(e)); } finally { busy = false; runBtn.disabled = false; setTampers(!!run); }
    }
    chips.forEach(b => b.addEventListener('click', () => guarded(async () => { b.classList.add('on'); await tamper(b.dataset.t); })));
    allBtn.addEventListener('click', () => guarded(async () => { for (const b of chips) { if (b.dataset.t === 'T4' && !run.webcrypto) continue; b.classList.add('on'); await tamper(b.dataset.t); } }));
    runBtn.addEventListener('click', go);
    showBtn.addEventListener('click', () => {
        if (!run || !onTokens) return;
        const keys = [...new Set(run.ids.map(id => LC().wordStr(Lex.mapA.words[id])))];
        onTokens(keys, run.ids.slice());
    });
    return { run: go, tamper: name => (run ? tamper(name) : Promise.resolve(null)), get last() { return run; } };
}

// ================================================================== Engram Mind's Eye sessions (read only)
function mountEngram(el, { Lex, onSession = null, onTurn = null, onPair = null, error = null } = {}) {
    if (!Lex || !LP()) return engineMissing(el, 'Engram Mind\'s Eye', error);
    const E = LP().engram, PAGE = 64;
    const P = body(el, 'Engram Mind\'s Eye', 'a session, read and checked', `
        <div class="row">
            <button type="button" class="btn btn-ghost" data-act="local">Read this browser's Engram session</button>
            <label class="btn btn-ghost">Open a file<input type="file" data-role="file" accept=".json,.txt,application/json,text/plain" hidden></label>
        </div>
        <textarea class="seedbox" rows="3" data-role="text" aria-label="Paste an Engram Mind's Eye export" placeholder="… or paste an export (v2 or v1), a chain, a text crystal, a biochain or an engram stream"></textarea>
        <div class="row">
            <button type="button" class="btn btn-primary" data-act="read">Read and check</button>
            <button type="button" class="btn btn-ghost" data-act="show" disabled>Show the whole session in the tree</button>
        </div>
        <div class="verdict" data-role="status"></div>
        <div class="checks" data-role="checks"></div>
        <div class="readout" data-role="summary"></div>
        <div data-role="out" hidden>
            <h3 class="mini">Turns</h3>
            <div class="tw tall"><table class="small"><thead><tr><th class="num">#</th><th>speaker</th><th>text</th><th class="num">packets</th><th></th></tr></thead><tbody data-role="turns"></tbody></table></div>
            <h3 class="mini">Packets</h3>
            <div class="tw tall"><table class="small"><thead><tr><th class="num">#</th><th>speaker</th><th>Engram token</th><th>engram/1 key</th><th>Lexicon pieces</th><th>addresses (root · lemma)</th><th>note</th></tr></thead><tbody data-role="packets"></tbody></table></div>
            <div class="row" data-role="pager"></div>
        </div>
        <p class="help">Engram Mind's Eye keeps its session in this browser's storage when its pages share this page's origin (over http on the same host, or from files in Chromium); this panel only reads it. Engram's own checks run as on its pages. engram/1 is a 64-bit checksum of a token's letters, so anagrams share one key; the Lexicon address is the identity, and the table shows both. Packets known only by their grids (an engram stream) have no text and so no address: engram/1 cannot be inverted.</p>`);
    const status = P.role('status'), out = P.role('out');
    let imp = null, page = 0;
    function addrCell(p) {
        if (!p.analysis) return faint('–');
        return p.analysis.tokens.map(t => `<span class="rc${t.root} root-text">${rootLabel(Lex, t)}</span>`).join('<br>');
    }
    function noteCell(p) {
        if (!p.analysis) return faint('grid only: no text, no address');
        if (p.differs) {
            const mine = p.analysis.tokens.map(t => t.key).join(' '), o = p.sameKey.find(i => imp.packets[i].analysis && imp.packets[i].analysis.tokens.map(t => t.key).join(' ') !== mine);
            return `${bad('same key as #' + o + ', different address')}`;
        }
        if (p.sameKey.length) return faint(`same key and address as #${p.sameKey[0]}`);
        return '';
    }
    function renderPackets() {
        const n = imp.packets.length, pages = Math.max(1, Math.ceil(n / PAGE));
        page = Math.max(0, Math.min(page, pages - 1));
        P.role('packets').innerHTML = imp.packets.slice(page * PAGE, (page + 1) * PAGE).map(p =>
            `<tr><td class="num">${p.index}</td><td class="spk spk-${esc(p.source)}">${esc(p.source)}</td><td>${esc(p.token)}</td><td class="mono">${esc(p.key)}</td>` +
            `<td>${p.analysis ? p.analysis.tokens.map(t => `<span class="rc${t.root} root-text">${esc(t.piece)}</span>`).join(' ') : faint('–')}</td><td>${addrCell(p)}</td><td class="wrap">${noteCell(p)}</td></tr>`).join('');
        P.role('pager').innerHTML = pages > 1 ? `<button type="button" class="chip" data-pg="-1" ${page ? '' : 'disabled'}>◀</button><span class="mono faint">packets ${page * PAGE}–${Math.min(n, (page + 1) * PAGE) - 1} of ${fmt(n)}</span><button type="button" class="chip" data-pg="1" ${page < pages - 1 ? '' : 'disabled'}>▶</button>` : '';
        P.role('pager').querySelectorAll('[data-pg]').forEach(b => b.addEventListener('click', () => { page += Number(b.dataset.pg); renderPackets(); }));
    }
    function render() {
        P.role('checks').innerHTML = (imp.checks || []).map(c => `<div>${mark(c.ok)} ${esc(c.label || c.name || '')}${c.detail ? ' ' + faint(esc(c.detail)) : ''}</div>`).join('');
        const s = imp.summary;
        P.role('summary').innerHTML = `<span>packets <b>${fmt(s.packets)}</b></span><span>turns <b>${fmt(imp.turns.length)}</b></span><span>text turns <b>${fmt(s.textTurns)}</b></span><span>grid-only packets <b>${fmt(s.gridPackets)}</b></span><span>synset tokens <b>${(100 * s.synsetShare).toFixed(0)}%</b></span><span>distinct Lexicon words <b>${fmt(imp.words.length)}</b></span>`;
        P.role('turns').innerHTML = imp.turns.map((t, i) => {
            const next = imp.turns[i + 1], pair = onPair && t.analysis && next && next.analysis && t.source !== next.source;
            return `<tr class="${t.analysis ? 'click' : ''}" data-i="${i}"><td class="num">${i}</td><td class="spk spk-${esc(t.source)}">${esc(t.source)}</td>` +
                `<td class="wrap">${t.text !== undefined ? esc(t.text.length > 120 ? t.text.slice(0, 120) + '…' : t.text) : faint('grids only')}</td><td class="num">${t.count}</td>` +
                `<td>${t.analysis && onTurn ? `<button type="button" class="chip" data-use="${i}">use</button>` : ''}${pair ? ` <button type="button" class="chip" data-pair="${i}">with the next as A and B</button>` : ''}</td></tr>`;
        }).join('');
        P.role('turns').querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); const i = Number(b.dataset.use), t = imp.turns[i]; onTurn(t.analysis, { source: t.source, index: i, text: t.text }); }));
        P.role('turns').querySelectorAll('[data-pair]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); const i = Number(b.dataset.pair); onPair(imp.turns[i].text, imp.turns[i + 1].text); }));
        P.role('turns').querySelectorAll('tr.click').forEach(tr => tr.addEventListener('click', () => { const i = Number(tr.dataset.i), t = imp.turns[i]; if (onTurn && t.analysis) onTurn(t.analysis, { source: t.source, index: i, text: t.text }); }));
        page = 0; renderPackets();
        out.hidden = false;
        P.act('show').disabled = !onSession;
    }
    function take(fn, what) {
        status.innerHTML = faint('reading ' + esc(what) + '…');
        setTimeout(() => {
            try {
                imp = fn();
                el.dataset.imported = imp.kind;
                status.innerHTML = `${esc(imp.label)}: ${imp.verified === true ? good('verified') : imp.verified === false ? bad('a check failed') : faint('read from storage, as Engram\'s pages keep it')} · kind <span class="mono">${esc(imp.kind)}</span>`;
                render();
            } catch (e) {
                // nothing of an earlier import stays on show under the error
                imp = null; out.hidden = true; P.role('checks').innerHTML = ''; P.role('summary').innerHTML = ''; P.act('show').disabled = true; delete el.dataset.imported;
                if (e && (e.kind === 'lattice_seed' || e.kind === 'environment')) status.innerHTML = `${bad(errText(e))}: <a href="../Engram%20Minds%20Eye/mind-eye-3d.html">Engram Mind's Eye in 3D</a>`;
                else status.innerHTML = bad(errText(e));
            }
        }, 20);
    }
    P.act('local').addEventListener('click', () => {
        const r = E.readLocal();
        if (!r.found) { status.innerHTML = `${faint('No Engram Mind\'s Eye session in this browser\'s storage for this page\'s origin')}${r.error ? ' ' + faint('(' + esc(r.error) + ')') : ''}. Open Engram's page from the same place (or over the same http host), talk to STRIX, and come back; or open an export below.`; return; }
        take(() => E.importTurns(Lex, r.turns, 'this browser\'s Engram Mind\'s Eye session' + (r.note ? ' (' + r.note + ')' : '')), 'this browser\'s session');
    });
    P.act('read').addEventListener('click', () => { const t = P.role('text').value; if (!t.trim()) { status.innerHTML = faint('Paste an export first, or open a file.'); return; } take(() => E.importText(Lex, t), 'the text'); });
    P.role('file').addEventListener('change', ev => {
        const f = ev.target.files && ev.target.files[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = () => { P.role('text').value = String(rd.result); take(() => E.importText(Lex, String(rd.result)), f.name); };
        rd.onerror = () => { status.innerHTML = bad('could not read ' + esc(f.name)); };
        rd.readAsText(f);
        ev.target.value = '';
    });
    P.act('show').addEventListener('click', () => { if (imp && onSession) onSession(imp); });
    return { importText: text => { P.role('text').value = text; take(() => E.importText(Lex, text), 'the text'); }, get last() { return imp; } };
}

return { version: 'lexicon-panels-1', mountChecks, mountShard, mountEngram, palette, onScheme, fitCanvas, fmtBig, esc };
});
