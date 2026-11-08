// Loads the pages that carry a Content-Security-Policy <meta> in Chromium, walks their signed-out flows, and fails
// on any CSP violation (securitypolicyviolation events and "Content Security Policy" console errors).
//   node tests/site/csp-smoke.cjs
// Environment:
//   PLAYWRIGHT_CHROMIUM   path to a Chromium binary (default: Playwright's own)
//   CDN_MIRROR            optional folder laid out as <host>/<path> (a bare host is <host>/index): requests to
//                         other hosts are answered from it when the file exists, for runs without network access
// Each page gets 20 s to load and each flow step 5 s; a page that does not load or a flow that does not finish is
// reported as "part" (not fully checked), so a stalled CDN never passes as a clean run.
// Exit codes: 0 every page loaded, every flow finished and no violation; 1 violations; 2 skipped (Playwright not
// installed, or Chromium did not start); 3 partial: no violation seen, but a page did not load or a flow did not
// finish (treat it as a failure in CI).
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');

let chromium;
try {
    ({ chromium } = require('playwright'));
} catch {
    console.log('csp-smoke: skipped (Playwright is not installed)');
    process.exit(2);
}

const ROOT = path.resolve(__dirname, '../..');
const MIRROR = process.env.CDN_MIRROR || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.md': 'text/plain' };
const typeOf = (f) => TYPES[path.extname(f).toLowerCase()] || (path.basename(f) === 'index' ? 'text/javascript' : 'application/octet-stream');

function serve() {
    const server = http.createServer((req, res) => {
        const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
        const file = path.resolve(ROOT, rel);
        if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': typeOf(file) });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const FLOWS = {
    'index.html': async (page) => {
        await page.click('#projects-btn');
        await page.click('[data-toggle-id]'); // open an accordion in the projects list
        for (const id of ['#pages-btn', '#tutorials-btn', '#research-btn']) {
            await page.click(id);
            await page.waitForTimeout(400);
        }
        await page.click('#codex-btn');
        await page.waitForTimeout(800);
        await page.click('#home-btn');
    },
    'control-panel/index.html': async (page) => { await page.waitForTimeout(1500); },
    'control-panel/article-studio.html': async (page) => { await page.waitForTimeout(1500); },
    'control-panel/publication-studio.html': async (page) => { await page.waitForTimeout(1500); }
};

const LOAD_MS = 20000;
const STEP_MS = 5000;

(async () => {
    const server = await serve();
    const base = `http://127.0.0.1:${server.address().port}/`;
    let browser;
    try {
        browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined });
    } catch (e) {
        console.log(`csp-smoke: skipped (Chromium did not start: ${e.message.split('\n')[0]})`);
        server.close();
        process.exit(2);
    }
    const context = await browser.newContext();
    if (MIRROR) {
        await context.route((url) => !url.href.startsWith(base), async (route) => {
            const u = new URL(route.request().url());
            const file = path.join(MIRROR, u.hostname, decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index');
            if (fs.existsSync(file) && fs.statSync(file).isFile()) {
                return route.fulfill({ status: 200, body: fs.readFileSync(file), headers: { 'Content-Type': typeOf(file), 'Access-Control-Allow-Origin': '*' } });
            }
            return route.continue();
        });
    }
    await context.addInitScript(() => {
        window.__csp = [];
        document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.effectiveDirective} blocked ${e.blockedURI || '(inline)'}${e.sourceFile ? ` at ${e.sourceFile}:${e.lineNumber}` : ''}`));
    });
    let violations = 0;
    let partial = 0;
    for (const [rel, flow] of Object.entries(FLOWS)) {
        const page = await context.newPage();
        page.setDefaultTimeout(STEP_MS);
        const consoleCsp = [];
        page.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy/i.test(m.text())) consoleCsp.push(m.text()); });
        page.on('popup', (p) => p.close().catch(() => {}));
        let note = '';
        try {
            await page.goto(base + rel, { waitUntil: 'domcontentloaded', timeout: LOAD_MS });
            await page.waitForLoadState('load', { timeout: LOAD_MS }).catch(() => { note = '(the load event did not fire in time)'; });
            try {
                await flow(page);
            } catch (e) {
                note = `(flow did not finish: ${e.message.split('\n')[0]})`;
            }
        } catch (e) {
            note = `(page did not load: ${e.message.split('\n')[0]})`;
        }
        await page.waitForTimeout(300).catch(() => {});
        const events = await page.evaluate(() => window.__csp).catch(() => []);
        const found = [...new Set([...events, ...consoleCsp])];
        violations += found.length;
        if (note) partial++;
        console.log(`${found.length ? 'FAIL' : note ? 'part' : 'ok  '} ${rel}: ${found.length} CSP violation(s)${note ? ` ${note}` : ''}`);
        for (const f of found) console.log(`       ${f}`);
        await page.close().catch(() => {});
    }
    await browser.close();
    server.close();
    const pages = Object.keys(FLOWS).length;
    console.log(`csp-smoke: ${pages} pages, ${violations} CSP violation(s), ${partial} page(s) not fully checked`);
    process.exit(violations ? 1 : partial ? 3 : 0);
})().catch((e) => {
    console.log(`csp-smoke: stopped (${e.message.split('\n')[0]}); not fully checked`);
    process.exit(3);
});
