// Hyperbolic Lexicon: Explainer 15 (explainers/lexical.html) and its live panel in Chromium (Stage 2's write-up).
//
//   node "Pages/Hyperbolic Lexicon/tests/pages-chromium-lexical.cjs"                 every check
//   node "Pages/Hyperbolic Lexicon/tests/pages-chromium-lexical.cjs" --shots DIR     also writes screenshots to DIR
//                                                                                  (a scratch folder; never commit them)
//
// Serves the repository root over http on 127.0.0.1 (a free port, GET and HEAD only, as pages-chromium-2d.cjs does)
// and also opens the page by file://. Requests to Google Fonts are aborted. Viewports 1440x900, 1024x768 and 390x844,
// each in colorScheme dark and light over http, and two over file://. For each load: no page error and no console
// error (resource failures aside, and over file:// the site bar's module, which Chromium blocks there); no horizontal
// scroll of the page; in light, body text contrast of at least 4.5:1. The panel, against data/stage2_view_v1.js read
// here in Node: its status says the view's SHA-256 equals the pin on the panel, that every part's verdict follows from
// its cells by the registered rule in all of the view's parts, and that every number the page fills equals the page as
// written (as many as the page has data-v elements); the three charts in the chapters are drawn. Then each claim's chip,
// with and without the row bootstrap: the chart is drawn, the rules table has one row per part of that claim, no rule
// or prediction line says "≠", and no control says "NOT". The chart's scroll hint shows at 390 px and not at 1440 px.
// It decides nothing: the Python reference decides, and make_stage2_view_v1.py --check checks the page's numbers.
// Exit 0 when every check passes, 1 when one fails, 2 when Playwright or Chromium is not available.
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');

const HL = path.resolve(__dirname, '..'), ROOT = path.resolve(HL, '../..');
const siblings = require('../../../scripts/lib/siblings.cjs');      // PLAYWRIGHT_CHROMIUM, else /opt/pw-browsers/chromium
const PAGE = 'Pages/Hyperbolic Lexicon/explainers/lexical.html';
const argShots = process.argv.indexOf('--shots'), SHOTS = argShots > 0 ? path.resolve(process.argv[argShots + 1]) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

let pw;
try { pw = require('playwright'); } catch (e) { console.log(`skipped: playwright cannot be loaded (${e.message.split('\n')[0]})`); process.exit(2); }

// ------------------------------------------------------------------ what the view says
const VIEW = JSON.parse(require(path.join(HL, 'data', 'stage2_view_v1.js')).stage2_view_v1);
const CLAIMS = Object.keys(VIEW.claims);
const PARTS = Object.fromEntries(CLAIMS.map(c => [c, Object.keys(VIEW.claims[c].parts).length]));
const N_PARTS = Object.values(PARTS).reduce((a, b) => a + b, 0);
const N_DATA_V = (fs.readFileSync(path.join(ROOT, PAGE), 'utf8').match(/\bdata-v="/g) || []).length;

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

async function check(pg, errs, tag, w, scheme, full) {
    await pg.waitForFunction(() => !/Loading/.test(document.getElementById('lab-status').textContent), null, { timeout: 20000 }).catch(() => null);
    const r = await pg.evaluate(() => ({
        sw: document.documentElement.scrollWidth, iw: innerWidth, bg: getComputedStyle(document.body).backgroundColor, fg: getComputedStyle(document.body).color,
        status: document.getElementById('lab-status').textContent,
        forests: [...document.querySelectorAll('[data-forest]')].map(e => !!e.querySelector('svg')),
        hint: (() => { const e = document.querySelector('[data-forest] .scroll-hint'); return e ? getComputedStyle(e).display !== 'none' : null; })(),
    }));
    say(r.sw <= r.iw, `${tag}: no horizontal scroll`, `${r.sw} <= ${r.iw}`);
    if (scheme === 'light') { const c = contrast(r.bg, r.fg); say(c >= 4.5, `${tag}: body text contrast in light`, c.toFixed(1) + ':1'); }
    const pin = /= the pin on this panel/.test(r.status), rules = new RegExp(`yes, in all ${N_PARTS} parts`).test(r.status);
    const filled = new RegExp(`\\b${N_DATA_V} numbers filled from the view; every one equal to the page as written`).test(r.status);
    say(pin && rules && filled, `${tag}: the panel's status: the view's SHA-256 = the pin; the rules give every verdict in all ${N_PARTS} parts; ${N_DATA_V} numbers filled, every one equal`,
        pin && rules && filled ? '' : r.status.replace(/\s+/g, ' ').slice(0, 300));
    say(r.forests.length === 4 && r.forests.every(Boolean), `${tag}: the chapters' four charts are drawn`, r.forests.join(' '));
    if (w === 390) say(r.hint === true, `${tag}: the charts' scroll hint shows on a narrow screen`);
    if (w === 1440) say(r.hint === false, `${tag}: the charts' scroll hint is hidden on a wide screen`);
    if (full) {
        const bad = [];
        for (const c of CLAIMS) for (const row of [false, true]) {
            await pg.click(`#record-lab [data-claim="${c}"]`);
            const cb = await pg.$('#lab-row');
            if ((await cb.isChecked()) !== row) await cb.click();
            const s = await pg.evaluate(() => ({ n: document.querySelectorAll('#lab-rules tr').length, svg: !!document.querySelector('#lab-forest svg'),
                rules: document.getElementById('lab-rules').textContent, controls: document.getElementById('lab-controls').textContent,
                preds: document.getElementById('lab-preds').textContent, on: (document.querySelector('#record-lab .chip.on') || {}).textContent }));
            const ok = s.svg && s.n === PARTS[c] && s.on === c && !/≠/.test(s.rules + s.preds) && !/NOT/.test(s.controls) && /= the view/.test(s.preds);
            if (!ok) bad.push(`${c}${row ? ' (row bootstrap)' : ''}: rows ${s.n}/${PARTS[c]}, chart ${s.svg}, chip ${s.on}, ${(s.rules + ' | ' + s.preds + ' | ' + s.controls).replace(/\s+/g, ' ').slice(0, 200)}`);
        }
        say(!bad.length, `${tag}: each claim's chip, with and without the row bootstrap: chart drawn, one row per part, no "≠", every control fails as required`, bad.join('; '));
        const sw = await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
        say(sw, `${tag}: still no horizontal scroll after the clicks`);
    }
    say(!errs.length, `${tag}: no page or console errors`, errs.slice(0, 3).join(' | '));
}

(async () => {
    let browser;
    const exe = siblings.chromium();
    try { browser = await pw.chromium.launch(exe ? { executablePath: exe } : {}); } catch (e) {
        try { browser = await pw.chromium.launch(); } catch (e2) { console.log(`skipped: Chromium cannot launch (${e.message.split('\n')[0]})`); process.exit(2); }
    }
    const server = await serve(ROOT), port = server.address().port;
    const HTTP = p => `http://127.0.0.1:${port}/` + enc(p), FILE = p => 'file://' + enc(path.join(ROOT, p));
    console.log(`Chromium ${browser.version()}; serving ${ROOT} on 127.0.0.1:${port}; the view: ${CLAIMS.length} claims, ${N_PARTS} parts; the page: ${N_DATA_V} numbers`);
    try {
        for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) for (const scheme of ['dark', 'light']) {
            const tag = `http ${w} ${scheme}`;
            const { pg, errs } = await open(browser, HTTP(PAGE), w, h, scheme);
            await check(pg, errs, tag, w, scheme, scheme === 'dark' || w === 390);
            if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `lexical-${w}-${scheme}.png`), fullPage: false });
            await pg.close();
        }
        for (const [w, h, scheme] of [[1440, 900, 'dark'], [390, 844, 'light']]) {
            const tag = `file ${w} ${scheme}`;
            const { pg, errs } = await open(browser, FILE(PAGE), w, h, scheme);
            await check(pg, errs, tag, w, scheme, w === 1440);
            await pg.close();
        }
    } finally {
        await browser.close();
        server.close();
    }
    console.log(`\n${pass}/${pass + fail} checks pass`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
