// Hyperbolic Lexicon, Phase 5: lexicon-3d.html and its manual (Explainer 14) in Chromium, against the page engine in
// Node.
//
//   node "Pages/Hyperbolic Lexicon/tests/pages-chromium-3d.cjs"            serve the repository on a free port, and file://
//   HL_BASE=http://127.0.0.1:8000/ node ".../pages-chromium-3d.cjs"       use a server already running at the repository root
//
// The matrix: 1440x900, 1024x768 and 390x844, each in colorScheme dark and light, over http and over file://. For the
// page and the manual: no page errors and no console errors (blocked fonts aside, and over file:// the site bar's
// module, which Chromium blocks there), no horizontal scroll, and (the page) body[data-ready="ok"] within 20 s and body
// text contrast of at least 4.5:1 in light mode. Behaviour, checked against LexiconPages.load() in this process:
//   pair     each trace pair and example through #a=&b= and through the textareas: data-tokens, the token table's
//            pieces, segments and words (the addresses), and every token's exact H3 point in the page equal Node's
//   select   a token chip, a table row and a click on the canvas set data-selected; #p-sel decodes back; its X(5, q)
//            table (vertex, matrix, distance, walk) and the radius-2 ball's vertex equal Node's for q = 13, 17, 29
//   view     Up, Back, Origin, Centre on selection, search and a double-click move data-centre as Node predicts; paging
//            through city.n's 659 children draws Node's page; the frames toggle, a drag (yaw and pitch), the mode and
//            the spread change the canvas pixels, and a colour-scheme switch repaints it; the LCA readout names Node's
//            lowest common ancestors; the page's frame directions at the centre equal Chart.frameAxes's
//   touch    at 390 px with touch: a tap selects, a horizontal swipe turns the yaw, the canvas is touch-action pan-y
//   state    the pair in the address (#a=&b=); the pair and a toggle kept across a reload; a 756-token pair analysed,
//            drawn and coupled over its first 192 tokens
//   twin     #p-twin[data-held] is n/n; the control (same chirality) and the skip tamper give Node's held counts
//   panels   the shard panel accepts sentence 1 and rejects T8; the Engram panel imports a v2 export made here
//            (CAT, ACT and TAC marked), makes one turn segment A, loads a human turn and the STRIX reply after it as A
//            and B, and finds a session
//            put in this origin's storage after a reload
// Screenshots go to the scratch directory given by HL_SHOTS (none when unset). Exit 0 all pass, 1 a failure, 2 when
// Playwright or Chromium cannot launch.
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const SYS = path.join(__dirname, '..'), ROOT = path.resolve(SYS, '..', '..');
const siblings = require(path.join(ROOT, 'scripts', 'lib', 'siblings.cjs'));      // PLAYWRIGHT_CHROMIUM, else /opt/pw-browsers/chromium
const LP = require(path.join(SYS, 'assets', 'hl-pages.js'));
const LC = require(path.join(SYS, 'lexicon_core.js'));
const EC = require(path.join(ROOT, 'Pages', 'Engram Minds Eye', 'engram_core.js'));

let pw;
try { pw = require('playwright'); } catch (e) { console.log(`skip  Chromium checks (playwright cannot be loaded: ${e.message})`); process.exit(2); }

let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); };
const SHOTS = process.env.HL_SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

// ------------------------------------------------------------------ Node's side
const Lex = LP.load();
const PAIRS = [['The dog chased the cat.', 'The cat climbed the tree.'], ['Is oxygen a gas?', 'Yes, and so is nitrogen.'], ['She can run.', ''],
    ['Ünïcödé façade, naïve café — résumé!', 'unbelievably, 12,345 apples!'], ['Oxygen and nitrogen are gases.', 'ΣΊΣΥΦΟΣ']];
const expectPair = ([a, b]) => {
    const an = Lex.analyse(a, { pair: [a, b] });
    return { n: an.tokens.length, rows: an.tokens.map(t => [t.piece, t.segment, t.word.join('')]), h3: an.tokens.map(t => { const p = Lex.point(3, t.word); return LC.coordsText(p.X, p.den); }), an };
};
const SENT1 = 'The dog chased the cat up the tree.';
const live = new EC.Live();
live.addTurn('human', 'The cat sat.'); live.addTurn('strix', 'Act now, tac!');
const V2 = EC.exportV2(live, { generatedAt: '2026-11-07T00:00:00.000Z' }).text;
const turns = EC.turnsOf(live);

// ------------------------------------------------------------------ a static server at the repository root (as run_claims_js.cjs)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
function serve(root) {
    const server = http.createServer((req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
        let p;
        try { p = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); } catch { res.writeHead(400); res.end(); return; }
        const file = path.resolve(root, '.' + p);
        if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
        fs.readFile(file, (err, data) => {
            if (err) { res.writeHead(404); res.end(); return; }
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            res.end(req.method === 'HEAD' ? undefined : data);
        });
    });
    return new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve(server)); });
}
const rel = p => p.split('/').map(encodeURIComponent).join('/');
const PAGE = 'Pages/Hyperbolic Lexicon/lexicon-3d.html', MANUAL = 'Pages/Hyperbolic Lexicon/explainers/page-3d.html';

// ------------------------------------------------------------------ helpers in the page
const contrast = (bg, fg) => {
    const parse = s => s.match(/[\d.]+/g).slice(0, 3).map(Number), lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const L1 = lum(parse(bg)), L2 = lum(parse(fg));
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
};
async function pixels(pg, id = 'cv-view') {
    // the frames of many tokens are computed over several animation frames: wait until the picture is complete
    await pg.waitForFunction(() => { const s = window.__lexicon3d.st; return !s.dirty && !s.framesPending; }, null, { timeout: 10000 });
    await pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const url = await pg.evaluate(i => document.getElementById(i).toDataURL(), id);
    return crypto.createHash('sha256').update(url).digest('hex');
}
async function open(pg, url) {
    await pg.goto(url);
    await pg.waitForFunction(() => document.body.dataset.ready, null, { timeout: 20000 });
    // a still view for the pixel checks: the slow turn off
    await pg.evaluate(() => { const t = document.getElementById('v-turn'); if (t && t.checked) t.click(); });
}
async function setPair(pg, a, b, how) {
    if (how === 'hash') {
        await pg.evaluate(([x, y]) => { location.hash = `a=${encodeURIComponent(x)}&b=${encodeURIComponent(y)}`; }, [a, b]);
        await pg.reload();
        await pg.waitForFunction(() => document.body.dataset.ready, null, { timeout: 20000 });
        await pg.evaluate(() => { const t = document.getElementById('v-turn'); if (t && t.checked) t.click(); });
    } else {
        await pg.fill('#in-a', a);
        await pg.fill('#in-b', b);
        await pg.waitForTimeout(400);
    }
}
const pageRows = pg => pg.$$eval('#tok-table tbody tr', rows => rows.map(r => { const c = r.cells; return [c[2].textContent, Number(c[1].textContent.trim().split(/\s+/)[0]), c[7].textContent.trim().split(/\s+/)[0]]; }));
const pageH3 = pg => pg.evaluate(() => { const L = window.__lexicon3d.Lex, an = window.__lexicon3d.st.an; return an.tokens.map(t => { const p = L.point(3, t.word); return window.LexiconCore.coordsText(p.X, p.den); }); });

async function pageRun(browser, base, w, h, scheme, full) {
    const tag = `${base.startsWith('file:') ? 'file' : 'http'} ${w}px ${scheme}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
    if (!base.startsWith('file:')) await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin });
    const pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', e => errs.push('page: ' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|page-chrome\.js' from origin 'null' has been blocked by CORS/.test(m.text())) errs.push('console: ' + m.text()); });
    await pg.route(/googleapis|gstatic|firebase/, r => r.abort());
    const t0 = Date.now();
    await open(pg, base + rel(PAGE));
    const r0 = await pg.evaluate(() => ({ ready: document.body.dataset.ready, tokens: document.body.dataset.tokens, centre: document.body.dataset.centre, sel: document.body.dataset.selected,
        sw: document.documentElement.scrollWidth, iw: innerWidth, bg: getComputedStyle(document.body).backgroundColor, fg: getComputedStyle(document.body).color }));
    const E0 = expectPair(PAIRS[0]);
    check(`${tag}: data-ready ok, the default pair's ${E0.n} tokens`, r0.ready === 'ok' && Number(r0.tokens) === E0.n, `${r0.ready}, ${r0.tokens} tokens, ${Date.now() - t0} ms`);
    check(`${tag}: the default centre is Node's (${Lex.label(Lex.defaultCentre(E0.an))}) and the first synset token is selected`, r0.centre === Lex.defaultCentre(E0.an) && r0.sel === E0.an.tokens.find(t => t.synset).key);
    check(`${tag}: no horizontal scroll at load`, r0.sw <= r0.iw, `${r0.sw} <= ${r0.iw}`);
    if (scheme === 'light') { const cr = contrast(r0.bg, r0.fg); check(`${tag}: body text contrast in light mode`, cr >= 4.5, cr.toFixed(1) + ':1'); }
    if (full) {
        // ---- pairs: counts, addresses, exact points (hash and textareas)
        for (let i = 0; i < PAIRS.length; i++) {
            const E = expectPair(PAIRS[i]);
            await setPair(pg, PAIRS[i][0], PAIRS[i][1], i % 2 ? 'fill' : 'hash');
            const n = Number(await pg.getAttribute('body', 'data-tokens')), rows = await pageRows(pg), h3 = await pageH3(pg);
            check(`${tag}: pair ${i} (${i % 2 ? 'textareas' : '#a=&b='}): ${E.n} tokens with specials, pieces, segments and addresses = Node's`, n === E.n && JSON.stringify(rows) === JSON.stringify(E.rows), `${n}`);
            check(`${tag}: pair ${i}: every token's exact H3 point in the page = Node's`, JSON.stringify(h3) === JSON.stringify(E.h3));
        }
        await setPair(pg, PAIRS[0][0], PAIRS[0][1], 'fill');
        const E = expectPair(PAIRS[0]);
        // ---- selection: chip, row, canvas click
        const cat = E.an.tokens.find(t => t.piece === 'cat');
        await pg.click(`#toks .tok[data-i="${cat.i}"]`);
        let sel = await pg.getAttribute('body', 'data-selected'), dec = await pg.getAttribute('#p-sel', 'data-decoded');
        check(`${tag}: clicking the "cat" chip selects it; #p-sel decodes back`, sel === cat.key && dec === 'ok', `${dec}`);
        const xs = await pg.$$eval('#lps-table tbody tr', rows => rows.map(r => [...r.cells].slice(0, 5).map(c => c.textContent.replace(/\s+/g, ' ').replace('✓', '').trim())));
        const xn = [13, 17, 29].map(q => { const v = Lex.vertex(cat.word, q); return [String(q), String(v.v), `[${v.m[0]} ${v.m[1]}; ${v.m[2]} ${v.m[3]}]`, String(v.dist), String(v.walk)]; });
        check(`${tag}: X(5, q) for "cat" in #p-sel (vertex, matrix, distance, walk) = Node's for q = 13, 17, 29`, JSON.stringify(xs) === JSON.stringify(xn), JSON.stringify(xs[0]));
        // "copy exact": the clipboard, or the selectable fallback, holds Node's exact point
        await pg.click('#b-copy');
        await pg.waitForTimeout(200);
        const copied = await pg.evaluate(async () => { const ta = document.querySelector('#sel textarea.copybox'); if (ta) return ta.value; try { return await navigator.clipboard.readText(); } catch (e) { return 'unreadable: ' + e.message; } });
        const catPt = Lex.point(3, cat.word), exactLine = `${cat.key} H3 ${LC.coordsText(catPt.X, catPt.den)}`;
        if (/^unreadable/.test(copied)) {          // file://: the test may not read the clipboard back; the page reports what it wrote
            const said = await pg.textContent('#copy-out');
            check(`${tag}: "copy exact" writes Node's exact H3 point of "cat" (${exactLine.length - cat.key.length - 4} characters)`, said === `copied (${exactLine.length - cat.key.length - 4} characters)`, said);
        } else check(`${tag}: "copy exact" gives Node's exact H3 point of "cat"`, copied === exactLine, copied.slice(0, 40));
        await pg.click('#p-sel button[data-q="29"]');
        await pg.waitForTimeout(150);
        const v29 = await pg.getAttribute('#cv-lps', 'data-vertex');
        check(`${tag}: the q = 29 ball is drawn around Node's vertex`, v29 === String(Lex.vertex(cat.word, 29).v), v29);
        await pg.click('#p-sel button[data-q="13"]');
        const tree = E.an.tokens.find(t => t.piece === 'tree');
        await pg.click(`#tok-table tbody tr[data-i="${tree.i}"]`);
        check(`${tag}: clicking a table row selects its token`, (await pg.getAttribute('body', 'data-selected')) === tree.key);
        // a click on the canvas: the nearest drawn point within 12 px
        await pg.$eval('#cv-view', c => c.scrollIntoView({ block: 'center' }));
        await pixels(pg);
        const target = await pg.evaluate(() => { const L = window.__lexicon3d, p = L.st.proj.find(q => q[2] !== L.st.sel && q[2] !== '' && q[3] > 0) || L.st.proj[0]; return p; });
        const box = await pg.$eval('#cv-view', c => { const r = c.getBoundingClientRect(); return [r.left, r.top]; });
        await pg.mouse.click(box[0] + target[0], box[1] + target[1]);
        await pg.waitForTimeout(120);
        const picked = await pg.getAttribute('body', 'data-selected'), expectPick = await pg.evaluate(([x, y]) => window.__lexicon3d.nearestAt(x, y), [target[0], target[1]]);
        check(`${tag}: a click on the canvas selects the nearest drawn point`, picked === expectPick && picked !== null, `${picked === null ? 'none' : Lex.label(picked)}`);
        check(`${tag}: the clicked point decodes back`, (await pg.getAttribute('#p-sel', 'data-decoded')) === 'ok');
        // ---- navigation
        const c0 = await pg.getAttribute('body', 'data-centre');
        await pg.click('#b-up');
        const c1 = await pg.getAttribute('body', 'data-centre');
        check(`${tag}: Up centres on Node's named parent`, c1 === Lex.parentKey(c0), `${Lex.label(c0)} -> ${Lex.label(c1)}`);
        await pg.click('#b-back');
        check(`${tag}: Back returns`, (await pg.getAttribute('body', 'data-centre')) === c0);
        await pg.click('#b-origin');
        check(`${tag}: Origin centres on the empty word`, (await pg.getAttribute('body', 'data-centre')) === '');
        await pg.click(`#toks .tok[data-i="${cat.i}"]`);
        await pg.click('#b-centre');
        check(`${tag}: Centre on selection`, (await pg.getAttribute('body', 'data-centre')) === cat.key);
        // the frame at the centre: the page's directions = Chart.frameAxes's (the exact rotation part, both ways)
        await pixels(pg);
        const fr = await pg.evaluate(k => { const L = window.__lexicon3d; const f = L.st.geo.frames.get(k) || null; return f; }, cat.key);
        const fa = Lex.chart(3, cat.key).frameAxes(cat.key).map(y => LP.placedOf(y).u);
        check(`${tag}: the drawn frame's directions at the centre = Chart.frameAxes's`, fr && fr.every((v, a) => v.every((x, i) => Math.abs(x - fa[a][i]) < 1e-9)));
        await pg.fill('#search', 'carnivore');
        await pg.press('#search', 'Enter');
        check(`${tag}: search "carnivore" + Enter centres on Node's first match`, (await pg.getAttribute('body', 'data-centre')) === Lex.search('carnivore', 1)[0].key);
        await pg.click('#b-back'); await pg.click('#b-back'); await pg.click('#b-back');
        // double-click recentres
        await pg.$eval('#cv-view', c => c.scrollIntoView({ block: 'center' }));
        await pixels(pg);
        const tgt = await pg.evaluate(() => { const L = window.__lexicon3d; return L.st.proj.find(q => q[2] !== L.st.centre && q[2] !== '' && q[3] > 0.2) || L.st.proj[1]; });
        const box2 = await pg.$eval('#cv-view', c => { const r = c.getBoundingClientRect(); return [r.left, r.top]; });
        const want = await pg.evaluate(([x, y]) => window.__lexicon3d.nearestAt(x, y, 14), [tgt[0], tgt[1]]);
        await pg.mouse.dblclick(box2[0] + tgt[0], box2[1] + tgt[1]);
        await pg.waitForTimeout(150);
        check(`${tag}: a double-click centres on the point`, want !== null && (await pg.getAttribute('body', 'data-centre')) === want, want === null ? 'none' : Lex.label(want));
        await pg.click('#b-back');
        // ---- pixels: frames, drag, mode, spread
        await setPair(pg, PAIRS[0][0], PAIRS[0][1], 'fill');
        const p0 = await pixels(pg);
        await pg.click('#v-frames');
        const p1 = await pixels(pg);
        await pg.click('#v-frames');
        check(`${tag}: the frames toggle changes the canvas`, p0 !== p1 && (await pixels(pg)) === p0);
        const yaw0 = await pg.evaluate(() => [window.__lexicon3d.st.yaw, window.__lexicon3d.st.pitch]);
        await pg.$eval('#cv-view', c => c.scrollIntoView({ block: 'center' }));
        const bb = await pg.$eval('#cv-view', c => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
        await pg.mouse.move(bb[0], bb[1]); await pg.mouse.down(); await pg.mouse.move(bb[0] + 60, bb[1] + 25, { steps: 6 }); await pg.mouse.up();
        const yaw1 = await pg.evaluate(() => [window.__lexicon3d.st.yaw, window.__lexicon3d.st.pitch]), p2 = await pixels(pg);
        check(`${tag}: a drag turns the view (yaw and pitch) and the pixels`, yaw1[0] > yaw0[0] + 0.3 && yaw1[1] > yaw0[1] + 0.1 && p2 !== p0, `yaw ${yaw0[0].toFixed(2)} -> ${yaw1[0].toFixed(2)}`);
        await pg.selectOption('#v-mode', 'dist');
        const p3 = await pixels(pg);
        await pg.selectOption('#v-mode', 'ball');
        await pg.$eval('#v-spread', el => { el.value = '5'; el.dispatchEvent(new Event('input', { bubbles: true })); });
        const p4 = await pixels(pg);
        check(`${tag}: radius = distance and the spread redraw the view`, p3 !== p2 && p4 !== p2 && p4 !== p3);
        await pg.$eval('#v-spread', el => { el.value = '3'; el.dispatchEvent(new Event('input', { bubbles: true })); });
        const read = await pg.textContent('#read'), l1 = Lex.lca('000200002002021421430240202', '00020000200202142143024030'), l2 = Lex.lca('00020000200202142143024030', '00020000200212022141');
        check(`${tag}: the LCA readout names Node's: dog-cat via ${Lex.node(l1.named).name}, cat-tree via ${Lex.node(l2.named).name}`, read.includes(`dog–cat via ${Lex.node(l1.named).name}`) && read.includes(`cat–tree via ${Lex.node(l2.named).name}`));
        // ---- the twin system
        const cm = Lex.couple(E.an, { chirality: 'mirror' }), cs = Lex.couple(E.an, { chirality: 'same' }), sk = 5, ck = Lex.couple(E.an, { chirality: 'mirror', skip: sk });
        check(`${tag}: #p-twin[data-held] = n/n under the mirror law`, (await pg.getAttribute('#p-twin', 'data-held')) === `${cm.held}/${cm.total}` && cm.held === cm.total);
        await pg.click('#t-same');
        const hs = await pg.getAttribute('#p-twin', 'data-held');
        check(`${tag}: the control (same chirality) moves the binding, as in Node`, hs === `${cs.held}/${cs.total}` && cs.held < cs.total, hs);
        await pg.click('#t-same');
        await pg.selectOption('#t-skip', String(sk));
        const hk = await pg.getAttribute('#p-twin', 'data-held'), strip = await pg.$$eval('#bind i', is => is.map(i => (i.classList.contains('no') ? 0 : 1)).join(''));
        check(`${tag}: skipping token ${sk}'s twist on structure 2 moves the binding from that token on`, hk === `${ck.held}/${ck.total}` && strip === ck.checks.map(c => (c.ok ? 1 : 0)).join('') && /^1*0+$/.test(strip) && strip.indexOf('0') === sk, `${hk} ${strip}`);
        await pg.selectOption('#t-skip', '');
        // ---- the colour scheme changes while the page is open: the canvas follows the tokens
        const other = scheme === 'dark' ? 'light' : 'dark';
        await pg.emulateMedia({ colorScheme: other });
        const bgPix = await pg.evaluate(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const c = document.getElementById('cv-view'), d = c.getContext('2d').getImageData(3, 3, 1, 1).data; return [d[0], d[1], d[2]]; });
        await pg.emulateMedia({ colorScheme: scheme });
        check(`${tag}: switching to ${other} repaints the canvas in ${other} tokens`, other === 'light' ? bgPix.join() === '255,255,255' : bgPix.join() === '2,6,23', bgPix.join());
        // ---- the address keeps the pair; storage keeps the toggles (per viewer)
        const hash = await pg.evaluate(() => location.hash);
        check(`${tag}: the pair is written to the address as #a=&b=`, hash === `#a=${encodeURIComponent(PAIRS[0][0])}&b=${encodeURIComponent(PAIRS[0][1])}`);
        await pg.click('#v-labels');
        await pg.reload();
        await pg.waitForFunction(() => document.body.dataset.ready, null, { timeout: 20000 });
        const kept = await pg.evaluate(() => [document.getElementById('v-labels').checked, document.getElementById('in-a').value]);
        check(`${tag}: after a reload the labels toggle and the pair are kept`, kept[0] === false && kept[1] === PAIRS[0][0]);
        await pg.click('#v-labels');
        await pg.evaluate(() => { const t = document.getElementById('v-turn'); if (t.checked) t.click(); });
        // ---- paging: city.n has 659 children
        const city = Lex.search('city', 5).find(n => Lex.children(n.key).length === 659);
        await pg.evaluate(k => window.__lexicon3d.recentre(k), city.key);
        const pg0 = await pg.textContent('#paging');
        await pg.click('#paging [data-pg="child:1"]');
        const pg1 = await pg.textContent('#paging'), kidsDrawn = await pg.evaluate(() => window.__lexicon3d.st.geo.v.nodes.filter(n => n.rel === 'child').map(n => n.key));
        const wantKids = Lex.view(city.key, { childPage: 1 }).nodes.filter(n => n.rel === 'child').map(n => n.key);
        check(`${tag}: paging through city.n's 659 children (children 1–48, then 49–96)`, /children 1–48 of 659/.test(pg0) && /children 49–96 of 659/.test(pg1) && JSON.stringify(kidsDrawn) === JSON.stringify(wantKids), pg1.trim());
        await pg.click('#b-back');
        // ---- a long pair: 3,490 characters
        const LA = LP.shard.SAMPLE.slice(0, 1990), LB = LP.shard.SAMPLE.slice(0, 1500), EL = expectPair([LA, LB]);
        const tl = Date.now();
        await pg.fill('#in-a', LA); await pg.fill('#in-b', LB);
        await pg.waitForFunction(n => document.body.dataset.tokens === String(n), EL.n, { timeout: 30000 });
        await pixels(pg);
        const tw = await pg.textContent('#twin-read'), held = await pg.getAttribute('#p-twin', 'data-held');
        check(`${tag}: a long pair (${EL.n} tokens) is analysed, drawn with every frame, and coupled over its first 192 tokens`, held === '192/192' && /first 192 of/.test(tw), `${((Date.now() - tl) / 1000).toFixed(1)} s`);
        check(`${tag}: no horizontal scroll after the interactions`, await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await setPair(pg, PAIRS[0][0], PAIRS[0][1], 'fill');
    }
    if (full === 'panels') {
        // ---- the shard panel: sentence 1, then T8
        await pg.fill('#p-shard textarea', SENT1);
        await pg.click('#p-shard [data-act="run"]');
        await pg.waitForFunction(() => document.querySelector('#p-shard').dataset.verdict, null, { timeout: 60000 });
        const verdict = await pg.getAttribute('#p-shard', 'data-verdict'), sess = await pg.textContent('#p-shard [data-role="session"]');
        await pg.click('#p-shard [data-t="T8"]');
        await pg.waitForFunction(() => { const r = document.querySelector('#p-shard tr[data-t="T8"]'); return r && r.dataset.verdict; }, null, { timeout: 30000 });
        const t8 = await pg.getAttribute('#p-shard tr[data-t="T8"]', 'data-verdict');
        check(`${tag}: the shard panel accepts sentence 1 (LADDR/1 recomputed here), then rejects T8`, verdict === 'accepted' && t8 === 'rejected' && /recomputed here/.test(sess) && sess.includes(LP.PINS.laddrHash.slice(0, 16)), `${verdict}, T8 ${t8}`);
        await pg.click('#p-shard [data-act="show"]');
        await pg.waitForTimeout(200);
        const shardKeys = [...new Set(Lex.analyse(SENT1).tokens.map(t => t.key))];
        const drawn = await pg.evaluate(() => window.__lexicon3d.st.geo.nodes.map(n => n.key));
        check(`${tag}: "Show its tokens in the tree" draws the shard's ${shardKeys.length} distinct tokens`, shardKeys.every(k => drawn.includes(k)));
        await pg.click('#b-clear-extra');
        check(`${tag}: "clear the shard's points" removes them`, await pg.evaluate(() => window.__lexicon3d.st.extra.length === 0 && !document.getElementById('b-clear-extra')));
        // ---- the Engram panel: a v2 export made here; the turn pair as A and B; this origin's storage
        await pg.fill('#p-engram textarea', V2);
        await pg.click('#p-engram [data-act="read"]');
        await pg.waitForFunction(() => document.querySelector('#p-engram').dataset.imported, null, { timeout: 30000 });
        const kind = await pg.getAttribute('#p-engram', 'data-imported'), differs = await pg.$$eval('#p-engram tbody[data-role="packets"] tr', rows => rows.filter(tr => /different address/.test(tr.textContent)).length);
        check(`${tag}: the Engram panel imports a v2 export; CAT, ACT and TAC are marked`, kind === 'engram_mind_eye_v2' && differs === 3, `${kind}, ${differs}`);
        await pg.click('#p-engram [data-use="1"]');
        await pg.waitForTimeout(400);
        const one = await pg.evaluate(() => [document.getElementById('in-a').value, document.getElementById('in-b').value]);
        check(`${tag}: "use" makes one turn segment A, with B empty`, one[0] === 'Act now, tac!' && one[1] === '' && Number(await pg.getAttribute('body', 'data-tokens')) === expectPair(['Act now, tac!', '']).n);
        await pg.click('#p-engram [data-pair="0"]');
        await pg.waitForTimeout(400);
        const ep = expectPair(['The cat sat.', 'Act now, tac!']), ab = await pg.evaluate(() => [document.getElementById('in-a').value, document.getElementById('in-b').value]);
        check(`${tag}: a human turn and the STRIX reply after it become segments A and B`, ab[0] === 'The cat sat.' && ab[1] === 'Act now, tac!' && Number(await pg.getAttribute('body', 'data-tokens')) === ep.n, `${ep.n} tokens`);
        await pg.click('#p-engram [data-act="show"]');
        await pg.waitForTimeout(200);
        const words = await pg.evaluate(() => window.__lexicon3d.st.session ? window.__lexicon3d.st.session.words.length : 0);
        check(`${tag}: "Show the whole session in the tree" draws the session's words`, words > 0, `${words} words`);
        await pg.evaluate(t => localStorage.setItem('engram-minds-eye/session/1', JSON.stringify({ version: 2, turns: t })), turns);
        await pg.reload();
        await pg.waitForFunction(() => document.body.dataset.ready, null, { timeout: 20000 });
        await pg.click('#p-engram [data-act="local"]');
        await pg.waitForFunction(() => document.querySelector('#p-engram').dataset.imported, null, { timeout: 30000 });
        check(`${tag}: after a reload, "Read this browser's Engram session" finds the session in this origin's storage`, (await pg.getAttribute('#p-engram', 'data-imported')) === 'engram_local');
        const stored = await pg.evaluate(() => localStorage.getItem('engram-minds-eye/session/1'));
        check(`${tag}: Engram's storage is read, never written`, stored === JSON.stringify({ version: 2, turns }));
        await pg.evaluate(() => localStorage.removeItem('engram-minds-eye/session/1'));
        check(`${tag}: no horizontal scroll with the panels filled`, await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    if (SHOTS) {
        await setPair(pg, PAIRS[0][0], PAIRS[0][1], 'fill');
        await pg.screenshot({ path: path.join(SHOTS, `page3d-${base.startsWith('file:') ? 'file' : 'http'}-${w}-${scheme}.png`), fullPage: true });
    }
    check(`${tag}: no page errors or console errors`, !errs.length, errs.slice(0, 3).join(' | '));
    await ctx.close();
}
// a phone: a tap selects, a horizontal swipe turns the yaw (the canvas lets vertical swipes scroll the page)
async function touchRun(browser, base) {
    const tag = `${base.startsWith('file:') ? 'file' : 'http'} 390px touch`;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'dark' });
    const pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', e => errs.push('page: ' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|page-chrome\.js' from origin 'null' has been blocked by CORS/.test(m.text())) errs.push('console: ' + m.text()); });
    await pg.route(/googleapis|gstatic|firebase/, r => r.abort());
    await open(pg, base + rel(PAGE));
    await pg.$eval('#cv-view', c => c.scrollIntoView({ block: 'center' }));
    await pixels(pg);
    const target = await pg.evaluate(() => { const L = window.__lexicon3d; return L.st.proj.find(q => q[2] !== L.st.sel && q[2] !== '' && q[3] > 0) || L.st.proj[0]; });
    const box = await pg.$eval('#cv-view', c => { const r = c.getBoundingClientRect(); return [r.left, r.top]; });
    const want = await pg.evaluate(([x, y]) => window.__lexicon3d.nearestAt(x, y), [target[0], target[1]]);
    await pg.touchscreen.tap(box[0] + target[0], box[1] + target[1]);
    await pg.waitForTimeout(150);
    check(`${tag}: a tap on the canvas selects the nearest drawn point`, want !== null && (await pg.getAttribute('body', 'data-selected')) === want, want === null ? 'none' : Lex.label(want));
    const yaw0 = await pg.evaluate(() => window.__lexicon3d.st.yaw);
    const cdp = await ctx.newCDPSession(pg), cx = box[0] + 120, cy = box[1] + 120;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
    for (let k = 1; k <= 6; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + 12 * k, y: cy }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await pg.waitForTimeout(150);
    const yaw1 = await pg.evaluate(() => window.__lexicon3d.st.yaw);
    check(`${tag}: a horizontal swipe on the canvas turns the yaw`, yaw1 > yaw0 + 0.2, `${yaw0.toFixed(2)} -> ${yaw1.toFixed(2)}`);
    check(`${tag}: the canvas leaves vertical swipes to the page (touch-action pan-y)`, (await pg.$eval('#cv-view', c => getComputedStyle(c).touchAction)) === 'pan-y');
    check(`${tag}: no page errors or console errors`, !errs.length, errs.slice(0, 3).join(' | '));
    await ctx.close();
}
async function manualRun(browser, base, w, h, scheme) {
    const tag = `${base.startsWith('file:') ? 'file' : 'http'} ${w}px ${scheme}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
    const pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', e => errs.push('page: ' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|page-chrome\.js' from origin 'null' has been blocked by CORS/.test(m.text())) errs.push('console: ' + m.text()); });
    await pg.route(/googleapis|gstatic|firebase/, r => r.abort());
    await pg.goto(base + rel(MANUAL));
    await pg.waitForTimeout(400);
    const r = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, h1: (document.querySelector('h1') || {}).textContent, chapters: document.querySelectorAll('section.chapter').length,
        dead: [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(x => x.length > 1 && !document.querySelector(x)) }));
    check(`${tag}: the manual (${r.h1}, ${r.chapters} chapters): no horizontal scroll, no dead anchors`, r.sw <= r.iw && r.chapters >= 10 && !r.dead.length, `${r.sw} <= ${r.iw}${r.dead.length ? '; dead ' + r.dead.join(' ') : ''}`);
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `manual3d-${w}-${scheme}.png`), fullPage: false });
    check(`${tag}: the manual has no page errors or console errors`, !errs.length, errs.slice(0, 3).join(' | '));
    await ctx.close();
}

(async () => {
    let browser;
    const exe = siblings.chromium();
    try { browser = await pw.chromium.launch(exe ? { executablePath: exe } : {}); } catch (e) { console.log(`skip  Chromium checks (Chromium cannot launch: ${e.message.split('\n')[0]})`); process.exit(2); }
    let server = null, httpBase = process.env.HL_BASE || '';
    if (!httpBase) { server = await serve(ROOT); httpBase = `http://127.0.0.1:${server.address().port}/`; }
    if (!httpBase.endsWith('/')) httpBase += '/';
    const fileBase = 'file://' + ROOT.split(path.sep).map(encodeURIComponent).join('/') + '/';
    const t = Date.now();
    try {
        for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) for (const scheme of ['dark', 'light']) {
            // http: the full behaviour at every size in dark, and the panels at 1440 and 390; file:// loads and the panels once
            await pageRun(browser, httpBase, w, h, scheme, scheme === 'dark' ? (w === 1024 ? true : 'panels') : (w === 390 ? true : false));
            await pageRun(browser, fileBase, w, h, scheme, w === 1440 && scheme === 'dark' ? 'panels' : false);
            await manualRun(browser, httpBase, w, h, scheme);
        }
        await touchRun(browser, httpBase);
    } catch (e) { check('the Chromium run finished', false, e.stack.split('\n').slice(0, 3).join(' | ')); }
    await browser.close();
    if (server) server.close();
    console.log(`\n${pass}/${pass + fail} checks pass (${((Date.now() - t) / 1000).toFixed(0)} s)`);
    process.exit(fail ? 1 : 0);
})();
