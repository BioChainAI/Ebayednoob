// Hyperbolic Lexicon: the 2D page (lexicon-2d.html) and its manual (explainers/page-2d.html) in Chromium (Phase 5).
//
//   node "Pages/Hyperbolic Lexicon/tests/pages-chromium-2d.cjs"                 every check
//   node "Pages/Hyperbolic Lexicon/tests/pages-chromium-2d.cjs" --shots DIR     also writes screenshots to DIR
//                                                                              (a scratch folder; never commit them)
//   node "Pages/Hyperbolic Lexicon/tests/pages-chromium-2d.cjs" --base URL      uses a server already serving the
//                                                                              repository root at URL instead of its own
//
// Serves the repository root over http on 127.0.0.1 (a free port, GET and HEAD only, as run_claims_js.cjs does) and
// also opens the page by file://. Requests to Google Fonts are aborted. Viewports 1440x900, 1024x768 and 390x844, each
// in colorScheme dark and light. For the page and its manual: no page error and no console error (resource failures
// aside, and over file:// the site bar's module, which Chromium blocks there), no horizontal scroll; for the page:
// body[data-ready="ok"] within 20 s and, in light, body text contrast of at least 4.5:1. Behaviour, against the page
// engine run here in Node (assets/hl-pages.js, the same files): each trace sentence of reference/traces/pages_v1.txt
// set through #q= gives Node's token count; three sentences' addresses and exact H^2 points, and their H^2 and H^3
// point bits, equal Node's token by token; clicking a token chip selects it and decodes it back; Centre, Up and Back
// move the centre as Node's parentKey predicts; a click at the canvas centre selects the centre; the LCA panel's
// letters for dog and cat equal Node's; spread, a sideways drag and the learned view change the canvas's pixels; the
// search centres on a synset; the shard panel accepts sentence 1 and T8 is rejected; the Engram panel reads a v2 export
// made here in Node and shows its words in the tree; after a session is put in the page's own localStorage and the page
// reloads, "Read this browser's Engram session" finds it. It decides nothing.
// Exit 0 when every check passes, 1 when one fails, 2 when Playwright or Chromium is not available.
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');

const HL = path.resolve(__dirname, '..'), ROOT = path.resolve(HL, '../..');
const siblings = require('../../../scripts/lib/siblings.cjs');      // PLAYWRIGHT_CHROMIUM, else /opt/pw-browsers/chromium
const PAGE = 'Pages/Hyperbolic Lexicon/lexicon-2d.html', MANUAL = 'Pages/Hyperbolic Lexicon/explainers/page-2d.html';
const argShots = process.argv.indexOf('--shots'), SHOTS = argShots > 0 ? path.resolve(process.argv[argShots + 1]) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const argBase = process.argv.indexOf('--base'), BASE = argBase > 0 ? process.argv[argBase + 1].replace(/\/?$/, '/') : null;

let pw;
try { pw = require('playwright'); } catch (e) { console.log(`skipped: playwright cannot be loaded (${e.message.split('\n')[0]})`); process.exit(2); }
const LP = require('../assets/hl-pages.js');
const LC = require('../lexicon_core.js');
const EC = require('../../Engram Minds Eye/engram_core.js');

// ------------------------------------------------------------------ what Node says
const t0 = Date.now();
const Lex = LP.load();
const SENTENCES = fs.readFileSync(path.join(HL, 'reference/traces/pages_v1.txt'), 'utf8').split('\n')
    .map(l => /^s (\d+) text (.*)$/.exec(l)).filter(Boolean).map(m => JSON.parse(m[2]));
const tokenCount = s => Lex.analyse(s).tokens.length;
const S1 = SENTENCES[0];
const an1 = Lex.analyse(S1), syn1 = an1.tokens.filter(t => t.synset);
const expectCentre = Lex.defaultCentre(an1), firstSel = syn1[0].key;
const dogCat = Lex.lca(syn1[0].key, syn1[1].key).letters;
const live = new EC.Live();
live.addTurn('human', 'The cat sat.');
live.addTurn('human', 'Act now, tac!');
const V2 = EC.exportV2(live, { generatedAt: '2026-11-07T00:00:00.000Z' }).text;
const TURNS = EC.turnsOf(live);
const carnivore = Lex.search('carnivore', 1)[0].key;
const nodeMs = Date.now() - t0;

// ------------------------------------------------------------------ a static server at the repository root
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
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
const enc = p => p.split('/').map(encodeURIComponent).join('/');

// ------------------------------------------------------------------ checks
let pass = 0, fail = 0;
function say(ok, label, detail = '') {
    if (ok) pass++; else fail++;
    console.log(`${ok ? 'pass' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
}
const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const rgb = s => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
const contrast = (a, b) => { const L1 = lum(rgb(a)), L2 = lum(rgb(b)); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); };

async function open(browser, url, w, h, scheme) {
    const pg = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
    const errs = [];
    pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|page-chrome\.js' from origin 'null' has been blocked by CORS/.test(m.text())) errs.push('console: ' + m.text()); });
    await pg.route(/googleapis|gstatic/, r => r.abort());
    try {
        const resp = await pg.goto(url);
        if (resp && !resp.ok()) errs.push(`HTTP ${resp.status()} for ${url}`);
    } catch (e) { errs.push('navigation: ' + e.message.split('\n')[0]); }
    return { pg, errs };
}
const ready = pg => pg.waitForFunction(() => document.body.dataset.ready && document.body.dataset.ready !== 'loading', null, { timeout: 20000 }).then(() => pg.evaluate(() => document.body.dataset.ready)).catch(() => 'timeout');
const pixels = pg => pg.evaluate(() => {
    const c = document.getElementById('cv-disk'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let h = 2166136261;
    for (let i = 0; i < d.length; i += 7) h = Math.imul(h ^ d[i], 16777619) >>> 0;
    return h;
});
async function setText(pg, text) {
    await pg.evaluate(t => { location.hash = '#q=' + encodeURIComponent(t); }, text);
    await pg.waitForFunction(t => document.getElementById('q').value === t, text, { timeout: 10000 });
    return pg.evaluate(() => Number(document.body.dataset.tokens));
}
async function basics(pg, errs, tag, scheme, isPage) {
    const r = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, bg: getComputedStyle(document.body).backgroundColor, fg: getComputedStyle(document.body).color }));
    say(r.sw <= r.iw, `${tag}: no horizontal scroll`, `${r.sw} <= ${r.iw}`);
    if (isPage && scheme === 'light') { const c = contrast(r.bg, r.fg); say(c >= 4.5, `${tag}: body text contrast in light`, c.toFixed(1) + ':1'); }
    say(!errs.length, `${tag}: no page or console errors`, errs.slice(0, 3).join(' | '));
}

// the page's behaviour; `full` adds the slower panels (shard, Engram, storage)
async function behaviour(pg, errs, tag, full) {
    // every trace sentence through #q=
    const got = [];
    for (const s of SENTENCES) got.push(await setText(pg, s));
    const want = SENTENCES.map(tokenCount);
    say(JSON.stringify(got) === JSON.stringify(want), `${tag}: the ${SENTENCES.length} trace sentences through #q= give Node's token counts`, got.join(' '));
    // three sentences: addresses, exact H2 points and point bits, token by token
    let ok = true, n = 0, firstBad = '';
    for (const s of [SENTENCES[0], SENTENCES[1], SENTENCES[3]]) {
        await setText(pg, s);
        const a = Lex.analyse(s);
        const bits = await pg.$$eval('#bits-table tbody tr', rows => rows.map(r => [...r.cells].map(c => c.textContent)));
        for (const t of a.tokens) {
            await pg.click(`#toks .tok[data-i="${t.i}"]`);
            const r = await pg.evaluate(() => ({ sel: document.body.dataset.selected, dec: document.getElementById('p-sel').dataset.decoded, exact: (document.getElementById('b-copy') || {}).dataset ? document.getElementById('b-copy').dataset.exact : null,
                pressed: document.querySelector('#toks .tok.on') ? Number(document.querySelector('#toks .tok.on').dataset.i) : -1 }));
            const p = Lex.point(2, t.key), want2 = `${t.key} H2 ${LC.coordsText(p.X, p.den)}`;
            const b = bits[t.i], wantBits = [String(t.i), t.piece, Lex.bits(2, t.key).point.toLocaleString('en-US'), Lex.bits(3, t.key).point.toLocaleString('en-US')];
            const good = r.sel === t.key && r.dec === 'ok' && r.exact === want2 && r.pressed === t.i && b && JSON.stringify(b) === JSON.stringify(wantBits);
            if (!good && !firstBad) firstBad = `${JSON.stringify(s)} token ${t.i}: ${JSON.stringify(r).slice(0, 160)} bits ${JSON.stringify(b)}`;
            ok = ok && good; n++;
        }
    }
    say(ok, `${tag}: ${n} tokens of three sentences: chip selects, decodes back, address and exact H² point and H²/H³ point bits = Node's`, firstBad);
    // navigation
    await setText(pg, S1);
    const c0 = await pg.evaluate(() => document.body.dataset.centre);
    const s0 = await pg.evaluate(() => document.body.dataset.selected);
    await pg.click('#b-centre');
    const c1 = await pg.evaluate(() => document.body.dataset.centre);
    await pg.click('#b-up');
    const c2 = await pg.evaluate(() => document.body.dataset.centre);
    await pg.click('#b-back');
    const c3 = await pg.evaluate(() => document.body.dataset.centre);
    await pg.click('#b-back');
    const c4 = await pg.evaluate(() => document.body.dataset.centre);
    say(c0 === expectCentre && s0 === firstSel && c1 === firstSel && c2 === Lex.parentKey(firstSel) && c3 === firstSel && c4 === expectCentre,
        `${tag}: default centre, Centre on selection, Up, Back, Back move the centre as Node predicts`, `${Lex.label(c0)} → ${Lex.label(c1)} → ${Lex.label(c2)} → back → back`);
    // a click at the canvas centre selects the centre
    await pg.locator('#cv-disk').scrollIntoViewIfNeeded();
    let box = await pg.locator('#cv-disk').boundingBox();
    await pg.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const s1 = await pg.evaluate(() => document.body.dataset.selected);
    say(s1 === expectCentre, `${tag}: a click at the canvas centre selects the centre`, Lex.label(s1));
    // LCA panel: dog and cat
    const letters = await pg.evaluate(() => Number(document.getElementById('p-lca').dataset.letters));
    say(letters === dogCat, `${tag}: LCA panel, dog and cat: ${dogCat} letters through carnivore, as Node`, String(letters));
    // pixels: spread, a sideways drag, the learned view
    const h0 = await pixels(pg);
    await pg.click('#b-splus'); await pg.waitForTimeout(80);
    const h1 = await pixels(pg);
    await pg.locator('#cv-disk').scrollIntoViewIfNeeded();
    box = await pg.locator('#cv-disk').boundingBox();
    await pg.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.2);
    await pg.mouse.down(); await pg.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.22, { steps: 6 }); await pg.mouse.up();
    await pg.waitForTimeout(80);
    const h2 = await pixels(pg);
    say(h0 !== h1 && h1 !== h2, `${tag}: spread and a sideways drag change the canvas's pixels`);
    await pg.click('#b-sminus'); await pg.click('#b-rot0');
    await pg.selectOption('#mode', 'learned'); await pg.waitForTimeout(150);
    const lv = await pg.evaluate(() => ({ n: document.getElementById('p-disk').dataset.learned, out: document.getElementById('learned-out').textContent }));
    const h3 = await pixels(pg);
    say(lv.n === '1182' && /= the pin/.test(lv.out) && /decides nothing/.test(lv.out) && h3 !== h2, `${tag}: the learned view draws L6's 1,182 mammals, its data = the pin`, lv.out.slice(0, 90));
    await pg.selectOption('#mode', 'exact'); await pg.waitForTimeout(80);
    // search
    await pg.fill('#find', 'carnivore'); await pg.press('#find', 'Enter');
    const cs = await pg.evaluate(() => document.body.dataset.centre);
    say(cs === carnivore, `${tag}: find "carnivore" + Enter centres on the search's first match`, Lex.label(cs));
    if (!full) return;
    // the shard panel
    await setText(pg, S1);
    await pg.click('#p-shard [data-act="sentence"]');
    await pg.click('#p-shard [data-act="run"]');
    await pg.waitForFunction(() => document.getElementById('p-shard').dataset.verdict, null, { timeout: 60000 });
    const verdict = await pg.getAttribute('#p-shard', 'data-verdict'), sess = await pg.textContent('#p-shard [data-role="session"]');
    await pg.click('#p-shard [data-t="T8"]');
    await pg.waitForFunction(() => { const r = document.querySelector('#p-shard tr[data-t="T8"]'); return r && r.dataset.verdict; }, null, { timeout: 30000 });
    const t8 = await pg.getAttribute('#p-shard tr[data-t="T8"]', 'data-verdict');
    say(verdict === 'accepted' && t8 === 'rejected' && /recomputed here/.test(sess), `${tag}: shard panel accepts sentence 1 with LADDR/1 recomputed here; T8 rejected`, `${verdict}, T8 ${t8}`);
    await pg.click('#p-shard [data-act="show"]'); await pg.waitForTimeout(100);
    const ov1 = await pg.textContent('#overlay');
    say(/shard/.test(ov1), `${tag}: "Show its tokens in the tree" draws the shard's words`, ov1.trim());
    // the Engram panel: a v2 export made here
    await pg.fill('#p-engram textarea', V2);
    await pg.click('#p-engram [data-act="read"]');
    await pg.waitForFunction(() => document.getElementById('p-engram').dataset.imported, null, { timeout: 30000 });
    const kind = await pg.getAttribute('#p-engram', 'data-imported');
    await pg.click('#p-engram [data-act="show"]'); await pg.waitForTimeout(100);
    const ov2 = await pg.textContent('#overlay');
    await pg.click('#p-engram [data-use="1"]');
    const turnText = await pg.inputValue('#q');
    say(kind === 'engram_mind_eye_v2' && /Engram session/.test(ov2) && turnText === 'Act now, tac!', `${tag}: Engram panel reads a v2 export, draws its words, a turn becomes the sentence`, `${kind}; ${ov2.trim()}; "${turnText}"`);
    // this browser's Engram session (read only), after a reload
    await pg.evaluate(t => localStorage.setItem('engram-minds-eye/session/1', JSON.stringify({ version: 2, turns: t })), TURNS);
    await pg.reload();
    await ready(pg);
    await pg.click('#p-engram [data-act="local"]');
    await pg.waitForFunction(() => document.getElementById('p-engram').dataset.imported === 'engram_local', null, { timeout: 30000 }).catch(() => null);
    const local = await pg.getAttribute('#p-engram', 'data-imported');
    const stored = await pg.evaluate(() => localStorage.getItem('engram-minds-eye/session/1'));
    say(local === 'engram_local' && stored === JSON.stringify({ version: 2, turns: TURNS }), `${tag}: after a reload, "Read this browser's Engram session" finds it, and leaves it as it was`, String(local));
    await pg.evaluate(() => localStorage.removeItem('engram-minds-eye/session/1'));
    say(!errs.length, `${tag}: no page or console errors after the panels`, errs.slice(0, 3).join(' | '));
}

(async () => {
    let browser;
    const exe = siblings.chromium();
    try { browser = await pw.chromium.launch(exe ? { executablePath: exe } : {}); } catch (e) {
        try { browser = await pw.chromium.launch(); } catch (e2) { console.log(`skipped: Chromium cannot launch (${e.message.split('\n')[0]})`); process.exit(2); }
    }
    const server = BASE ? null : await serve(ROOT), port = server ? server.address().port : null;
    const HTTP = p => (BASE || `http://127.0.0.1:${port}/`) + enc(p), FILE = p => 'file://' + enc(path.join(ROOT, p));
    console.log(`Chromium ${browser.version()}; ${BASE ? 'using the server at ' + BASE : `serving ${ROOT} on 127.0.0.1:${port}`}; Node: engine loaded in ${nodeMs} ms`);
    try {
        for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) for (const scheme of ['dark', 'light']) {
            const tag = `http ${w} ${scheme}`;
            const t = Date.now();
            const { pg, errs } = await open(browser, HTTP(PAGE), w, h, scheme);
            const r = await ready(pg);
            say(r === 'ok', `${tag}: body[data-ready="ok"]`, `${r}, ${Date.now() - t} ms`);
            if (r === 'ok') {
                if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `2d-${w}-${scheme}.png`), fullPage: true });
                await basics(pg, errs, tag, scheme, true);
                await behaviour(pg, errs, tag, (w === 1440 && scheme === 'dark') || (w === 390 && scheme === 'light') || (w === 1024 && scheme === 'dark'));
                const sw = await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
                say(sw, `${tag}: still no horizontal scroll after the interactions`);
                if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `2d-${w}-${scheme}-after.png`), fullPage: true });
            }
            await pg.close();
            const m = await open(browser, HTTP(MANUAL), w, h, scheme);
            await m.pg.waitForTimeout(300);
            if (SHOTS) await m.pg.screenshot({ path: path.join(SHOTS, `manual-2d-${w}-${scheme}.png`), fullPage: false });
            await basics(m.pg, m.errs, `http ${w} ${scheme} manual`, scheme, false);
            await m.pg.close();
        }
        for (const [w, h, scheme] of [[1440, 900, 'dark'], [390, 844, 'light']]) {
            const tag = `file ${w} ${scheme}`;
            const { pg, errs } = await open(browser, FILE(PAGE), w, h, scheme);
            const r = await ready(pg);
            say(r === 'ok', `${tag}: body[data-ready="ok"] over file://`, r);
            if (r === 'ok') { await basics(pg, errs, tag, scheme, true); await behaviour(pg, errs, tag, w === 1440); }
            await pg.close();
            const m = await open(browser, FILE(MANUAL), w, h, scheme);
            await m.pg.waitForTimeout(300);
            await basics(m.pg, m.errs, `file ${w} ${scheme} manual`, scheme, false);
            await m.pg.close();
        }
    } finally {
        await browser.close();
        if (server) server.close();
    }
    console.log(`\n${pass}/${pass + fail} checks pass`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
