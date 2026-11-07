#!/usr/bin/env node
// Content-Security-Policy and Subresource Integrity on the pages that carry a CSP <meta>: index.html (with the
// fragments it loads into itself) and control-panel/*.html.
//   node scripts/checks/sri.cjs           check, and list the remaining debt
//   node scripts/checks/sri.cjs --fetch   also download every versioned CDN file listed as debt and print the
//                                         integrity value to add (and verify the integrity values already present)
// Fails (exit 1) when
//   - one of these pages has no CSP <meta>, or a script, stylesheet, module import or fragment image comes from a
//     place its policy does not allow;
//   - script-src allows a whole scheme (https:), or a host or folder on a host that serves script gadgets (see
//     GADGETS below), where only exact files may be listed;
//   - a page keeps 'unsafe-inline' in script-src with no inline code left, or has inline code without it;
//   - a tag has integrity= without crossorigin=, or an external tag without integrity= is not listed in DEBT below
//     (so new debt is added on purpose, with its reason);
//   - with --fetch, a file does not match the integrity value on its tag (as browsers check it: only the entries of
//     the strongest algorithm listed count).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '../..');
const PAGES = ['index.html', ...fs.readdirSync(path.join(ROOT, 'control-panel')).filter((f) => f.endsWith('.html')).map((f) => `control-panel/${f}`)];
const FRAGMENTS = { 'index.html': ['projects.html', 'pages.html', 'tutorials.html', 'research.html'] };

// External files these pages load without integrity=, and why. `url` may end with * to match a prefix.
const UNREACHABLE = 'versioned; integrity to be added once the file can be fetched from the CDN (run with --fetch)';
const DEBT = [
    { url: 'https://cdn.tailwindcss.com', why: 'unversioned Tailwind Play CDN: its content changes, so it cannot be pinned; replace with a built stylesheet' },
    { url: 'https://fonts.googleapis.com/css2*', why: 'Google Fonts stylesheet: generated per browser, so it cannot be pinned; self-host the fonts to remove' },
    { url: 'https://www.gstatic.com/firebasejs/11.9.1/*', why: 'Firebase SDK loaded with import, not a tag: integrity needs an import map with "integrity" (or a bundled copy)' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', why: UNREACHABLE },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/js-sha256/0.9.0/sha256.min.js', why: UNREACHABLE },
    { url: 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js', why: UNREACHABLE },
    { url: 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/renderers/CSS2DRenderer.js', why: UNREACHABLE },
    { url: 'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js', why: UNREACHABLE },
    { url: 'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js', why: UNREACHABLE },
    { url: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js', why: UNREACHABLE },
    { url: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css', why: UNREACHABLE }
];
// Pages that keep 'unsafe-inline' in script-src because inline code remains, and what that code is.
const INLINE_DEBT = {
    'index.html': 'the main inline module (navigation, sign-in, Codex tool) and onerror attributes on images in the page and its fragments; move them to a file to drop \'unsafe-inline\''
};

// Hosts that serve script gadgets: libraries (AngularJS builds) or endpoints (JSONP) that run code taken from page
// markup or from the URL. A policy may list exact files on these hosts, never the host or a folder that covers one
// of these paths.
const GADGETS = {
    'www.google.com': ['/'],
    'ajax.googleapis.com': ['/'],
    'www.gstatic.com': ['/fsn/'],
    'cdnjs.cloudflare.com': ['/ajax/libs/angular.js/', '/ajax/libs/angularjs/'],
    'cdn.jsdelivr.net': ['/npm/angular@', '/npm/angular/', '/gh/'],
    'unpkg.com': ['/angular@', '/angular/'],
};

// The problem with a script-src source, or null.
function scriptSourceProblem(src) {
    if (/^[a-z][a-z0-9+.-]*:$/i.test(src)) return `allows every ${src} script`;
    const m = /^(?:https?:\/\/)?(\*\.)?([^/:'\s]+)(?::\d+)?(\/.*)?$/i.exec(src);
    if (!m || src.startsWith("'")) return null;
    const host = m[2].toLowerCase();
    const p = m[3] || '/';
    if (!p.endsWith('/')) return null; // one exact file
    for (const [h, paths] of Object.entries(GADGETS)) {
        if (!(m[1] ? h === host || h.endsWith(`.${host}`) : h === host)) continue;
        const hit = paths.find((g) => g.startsWith(p) || p.startsWith(g));
        if (hit) return `allows every script under ${src}, which covers ${h}${hit} (script gadgets); list the exact files instead`;
    }
    return null;
}

const FETCH = process.argv.includes('--fetch');
const problems = [];
const debtSeen = new Set();
const debtRows = [];
const toFetch = new Map(); // url -> expected integrity or null

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const attr = (tag, name) => {
    const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
    return m ? (m[2] ?? m[3] ?? m[4] ?? '') : null;
};
const hasAttr = (tag, name) => new RegExp(`\\s${name}(\\s*=|[\\s>/])`, 'i').test(tag);
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function parseCsp(html) {
    const m = /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content="([^"]*)"/i.exec(html);
    if (!m) return null;
    const d = {};
    for (const part of decode(m[1]).split(';')) {
        const [name, ...vals] = part.trim().split(/\s+/);
        if (name) d[name.toLowerCase()] = vals;
    }
    return d;
}

const directive = (csp, name) => csp[name] || csp['default-src'] || [];

function allowed(url, sources) {
    let u;
    try { u = new URL(url); } catch { return false; }
    return sources.some((s) => {
        if (s === `${u.protocol}`) return true; // a scheme source such as https:
        const m = /^(https?:)\/\/(\*\.)?([^/:]+)(:\d+)?(\/.*)?$/i.exec(s);
        if (!m) return false;
        if (m[1].toLowerCase() !== u.protocol) return false;
        const host = u.hostname.toLowerCase();
        const want = m[3].toLowerCase();
        if (m[2] ? !(host.endsWith(`.${want}`)) : host !== want) return false;
        if (!m[5]) return true;
        const p = decodeURIComponent(u.pathname);
        return m[5].endsWith('/') ? p.startsWith(m[5]) : p === m[5];
    });
}

const debtFor = (url) => DEBT.find((d) => (d.url.endsWith('*') ? url.startsWith(d.url.slice(0, -1)) : url === d.url));
const external = (u) => /^https?:\/\//i.test(u || '');

// Module imports with absolute URLs in a module and the local modules it imports (relative paths).
function moduleImports(file, seen = new Set()) {
    if (seen.has(file) || !fs.existsSync(path.join(ROOT, file))) return [];
    seen.add(file);
    const src = read(file);
    return importsIn(src, path.dirname(file), seen);
}
function importsIn(src, dir, seen) {
    const out = [];
    for (const m of src.matchAll(/\b(?:import|export)\s[^'"`;]*?\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|\bimport\s*["']([^"']+)["']/g)) {
        const spec = m[1] || m[2] || m[3];
        if (external(spec)) out.push(spec);
        else if (/^\.{1,2}\//.test(spec)) out.push(...moduleImports(path.posix.join(dir, spec), seen));
    }
    return out;
}

function checkPage(page) {
    const html = read(page);
    const csp = parseCsp(html);
    if (!csp) { problems.push(`${page}: no Content-Security-Policy <meta>`); return; }
    const cspAt = html.search(/<meta\s+http-equiv=["']Content-Security-Policy/i);
    const firstScript = html.search(/<(script|link)\b/i);
    if (firstScript >= 0 && firstScript < cspAt) problems.push(`${page}: the CSP <meta> must come before the first <script> or <link>`);
    const scriptSrc = directive(csp, 'script-src');
    for (const src of scriptSrc) {
        const why = scriptSourceProblem(src);
        if (why) problems.push(`${page}: script-src ${why}`);
    }
    const styleSrc = directive(csp, 'style-src');
    const imgSrc = directive(csp, 'img-src');
    const tags = [];
    for (const m of html.matchAll(/<script\b[^>]*>/gi)) {
        const src = attr(m[0], 'src');
        if (src) tags.push({ kind: 'script', tag: m[0], url: decode(src), sources: scriptSrc, dir: 'script-src' });
    }
    for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
        const rel = (attr(m[0], 'rel') || '').toLowerCase();
        const href = attr(m[0], 'href');
        if (href && /\bstylesheet\b/.test(rel)) tags.push({ kind: 'stylesheet', tag: m[0], url: decode(href), sources: styleSrc, dir: 'style-src' });
    }
    for (const t of tags.filter((x) => external(x.url))) {
        if (!allowed(t.url, t.sources)) problems.push(`${page}: ${t.kind} ${t.url} is not allowed by ${t.dir}`);
        const integrity = attr(t.tag, 'integrity');
        if (integrity !== null) {
            if (!hasAttr(t.tag, 'crossorigin')) problems.push(`${page}: ${t.url} has integrity= but no crossorigin=`);
            toFetch.set(t.url, integrity);
            continue;
        }
        const d = debtFor(t.url);
        if (!d) { problems.push(`${page}: ${t.kind} ${t.url} has no integrity= and is not listed as debt`); continue; }
        debtSeen.add(d);
        debtRows.push([page, t.url, d.why]);
        if (d.why === UNREACHABLE) toFetch.set(t.url, null);
    }

    // Inline code and module imports.
    const inline = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].filter((m) => m[1].trim());
    const fragments = (FRAGMENTS[page] || []).filter((f) => fs.existsSync(path.join(ROOT, f)));
    const handlers = [html, ...fragments.map(read)].reduce((n, h) => n + (h.match(/<[^>]+\son[a-z]+\s*=/gi) || []).length, 0);
    const unsafeInline = scriptSrc.includes("'unsafe-inline'");
    if ((inline.length || handlers) && !unsafeInline) problems.push(`${page}: ${inline.length} inline script(s) and ${handlers} inline handler(s) need 'unsafe-inline' in script-src, or move them to files`);
    if (unsafeInline && !inline.length && !handlers) problems.push(`${page}: script-src keeps 'unsafe-inline' but no inline code is left; remove it`);
    if (unsafeInline) {
        if (!INLINE_DEBT[page]) problems.push(`${page}: 'unsafe-inline' is not listed in INLINE_DEBT`);
        debtRows.push([page, "script-src 'unsafe-inline'", `${inline.length} inline script(s), ${handlers} inline handler(s): ${INLINE_DEBT[page] || '(unlisted)'}`]);
    }
    const imports = [
        ...inline.flatMap((m) => importsIn(m[1], path.dirname(page), new Set())),
        ...[...html.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*>/gi)].map((m) => attr(m[0], 'src')).filter((s) => s && !external(s)).flatMap((s) => moduleImports(path.posix.join(path.dirname(page), decodeURI(s))))
    ];
    for (const url of new Set(imports)) {
        if (!allowed(url, scriptSrc)) problems.push(`${page}: module import ${url} is not allowed by script-src`);
        const d = debtFor(url);
        if (!d) problems.push(`${page}: module import ${url} is not listed as debt`);
        else { debtSeen.add(d); debtRows.push([page, url, d.why]); }
    }

    // Fragments inserted into the page: no scripts or stylesheets of their own; images allowed by img-src.
    for (const f of fragments) {
        const h = read(f);
        if (/<script\b/i.test(h) || /<link\b[^>]*stylesheet/i.test(h)) problems.push(`${f}: a fragment loaded into ${page} must not carry scripts or stylesheets`);
        for (const m of h.matchAll(/<img\b[^>]*\ssrc=["']([^"']+)["']/gi)) if (external(m[1]) && !allowed(m[1], imgSrc)) problems.push(`${f}: image ${m[1]} is not allowed by ${page}'s img-src`);
        for (const m of h.matchAll(/url\(\s*['"]?(https?:[^'")]+)/gi)) if (!allowed(m[1], imgSrc)) problems.push(`${f}: background ${m[1]} is not allowed by ${page}'s img-src`);
    }
}

// Site-wide picture, for the record (not a failure): external script tags with and without integrity.
function siteSummary() {
    const { execFileSync } = require('child_process');
    const files = execFileSync('git', ['ls-files', '-z', '--', '*.html'], { cwd: ROOT }).toString('utf8').split('\0').filter(Boolean);
    let tags = 0, sri = 0, csp = 0;
    for (const f of files) {
        if (!fs.existsSync(path.join(ROOT, f))) continue;
        const h = read(f);
        if (parseCsp(h)) csp++;
        for (const m of h.matchAll(/<script\b[^>]*\ssrc=["']https?:[^>]*>/gi)) { tags++; if (/\sintegrity=/i.test(m[0])) sri++; }
    }
    return `site: ${files.length} HTML files, ${csp} with a CSP <meta>; ${tags} external script tags, ${sri} with integrity=`;
}

// Checks a file against an integrity value the way browsers do: of the entries with a supported algorithm, only those
// of the strongest algorithm present count, and the file must match one of them. Returns null when it matches, else
// the reason.
const ALGS = ['sha512', 'sha384', 'sha256']; // strongest first
function integrityProblem(expected, buf) {
    const entries = expected.split(/\s+/).filter(Boolean).map((e) => {
        const value = e.replace(/\?.*$/, ''); // options after "?" are ignored by browsers
        const dash = value.indexOf('-');
        return { alg: value.slice(0, dash).toLowerCase(), digest: value.slice(dash + 1) };
    }).filter((e) => ALGS.includes(e.alg));
    if (!entries.length) return 'no sha256/sha384/sha512 entry';
    const alg = ALGS.find((a) => entries.some((e) => e.alg === a));
    const got = crypto.createHash(alg).update(buf).digest('base64');
    if (entries.some((e) => e.alg === alg && e.digest === got)) return null;
    return `browsers check only the ${alg} entries, and the file is ${alg}-${got}`;
}

async function fetchAll() {
    let bad = 0;
    for (const [url, expected] of toFetch) {
        try {
            const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = Buffer.from(await res.arrayBuffer());
            const got = `sha384-${crypto.createHash('sha384').update(buf).digest('base64')}`;
            const why = expected === null ? null : integrityProblem(expected, buf);
            if (expected === null) console.log(`  ${url}\n      integrity="${got}" crossorigin="anonymous"`);
            else if (why) {
                bad++;
                console.log(`  MISMATCH ${url}: ${why}`);
            } else console.log(`  ok ${url}`);
        } catch (e) {
            console.log(`  unreachable ${url} (${e.cause?.code || e.message})`);
        }
    }
    return bad;
}

(async () => {
    for (const p of PAGES) checkPage(p);
    const stale = DEBT.filter((d) => !debtSeen.has(d));
    console.log(`sri: ${PAGES.length} pages with a CSP (${PAGES.join(', ')})`);
    console.log(siteSummary());
    console.log(`debt (${debtRows.length}):`);
    for (const [page, what, why] of debtRows) console.log(`  ${page}: ${what}\n      ${why}`);
    for (const d of stale) console.log(`note: debt entry ${d.url} is no longer used; remove it`);
    if (FETCH) {
        console.log('\nfetching:');
        const bad = await fetchAll();
        if (bad) problems.push(`${bad} file(s) do not match their integrity value`);
    }
    if (problems.length) {
        console.log(`\nFAIL: ${problems.length} problem(s)`);
        for (const p of problems) console.log(`  ${p}`);
        process.exit(1);
    }
    console.log('ok: every external tag is allowed by its page policy; remaining debt is listed above');
})();
