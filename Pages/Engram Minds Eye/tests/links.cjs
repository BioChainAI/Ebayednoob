// Engram Mind's Eye: every link resolves, and the system is reachable from the rest of the site (Phase 8).
//
//   node "Pages/Engram Minds Eye/tests/links.cjs"
//
// 1. Every relative href and src in the folder's pages and explainers names a file that exists, and every #anchor
//    names an id in its target page.
// 2. Every href and explainer on the system map (assets/em-map.js) resolves the same way.
// 3. The site's ways in: the catalog card in pages.html, the site-bar menus (every file in every menu set exists,
//    and Engram is in the Hyperbolic Oracles and Geometric Calculator menus), the Hyperbolic Oracles hub's callout
//    and its map node, and the "Used by" section of its README.
// Exits 1 on any failure.
'use strict';
const fs = require('fs');
const path = require('path');

const HERE = path.resolve(__dirname, '..');
const ROOT = path.resolve(HERE, '../..');
const rel = p => path.relative(ROOT, p);
let pass = 0, fail = 0;
const line = (group, label, ok, detail = '') => {
    if (ok) pass += 1; else fail += 1;
    if (!ok || process.argv.includes('-v')) console.log(`${ok ? 'pass' : 'FAIL'}  ${group.padEnd(8)} ${label}${detail ? '  (' + detail + ')' : ''}`);
};

const idsCache = new Map();
function idsOf(file) {
    if (!idsCache.has(file)) {
        const html = fs.readFileSync(file, 'utf8');
        idsCache.set(file, new Set([...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(m => m[1])));
    }
    return idsCache.get(file);
}
const external = h => /^(https?:)?\/\//.test(h) || /^(mailto|data|javascript|blob):/.test(h);
// Resolve a link written in `fromDir`; returns null when it resolves, else the reason.
function check(fromDir, href, selfFile) {
    if (!href || external(href) || href.includes('${')) return null;
    const [beforeHash, hash] = href.split('#');
    const p = beforeHash.split('?')[0];
    const target = p ? path.resolve(fromDir, decodeURIComponent(p)) : selfFile;
    if (!target) return 'no page to anchor in';
    if (!fs.existsSync(target)) return 'missing ' + rel(target);
    if (fs.statSync(target).isDirectory()) return 'a folder, not a page: ' + rel(target);
    if (hash && /\.html?$/.test(target) && !idsOf(target).has(decodeURIComponent(hash))) return `no id "${hash}" in ${rel(target)}`;
    return null;
}

// ---- 0. controls: the checker must catch a missing file and a missing anchor
line('control', 'a link to a missing file is caught', check(HERE, 'no-such-page.html', null) !== null);
line('control', 'a link to a missing anchor is caught', check(HERE, 'index.html#no-such-anchor', null) !== null);
line('control', 'a link to a real anchor passes', check(HERE, 'index.html#ledger', null) === null);

// ---- 1. the folder's pages
const htmlIn = dir => fs.readdirSync(path.join(HERE, dir)).filter(f => f.endsWith('.html')).sort().map(f => path.join(HERE, dir, f));
const pages = [...htmlIn('.'), ...htmlIn('explainers')];
for (const file of pages) {
    // the site bar is checked by its installer; markup shown as text (&lt;script src=…&gt;) is not a link
    const html = fs.readFileSync(file, 'utf8').replace(/<!-- page-chrome:start -->[\s\S]*?<!-- page-chrome:end -->/, '')
        .replace(/&lt;[\s\S]*?&gt;/g, '');
    const links = [...html.matchAll(/\b(?:href|src)\s*=\s*"([^"]*)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
    const bad = [];
    for (const h of new Set(links)) { const why = check(path.dirname(file), h, file); if (why) bad.push(`${h}: ${why}`); }
    line('pages', `${rel(file)}: ${new Set(links).size} links`, bad.length === 0, bad.join('; '));
}

// ---- 2. the system map
global.window = { addEventListener() {} };
global.document = { addEventListener() {}, querySelectorAll: () => [], readyState: 'loading', body: { dataset: {} } };
require(path.join(HERE, 'assets/em-map.js'));
const EM = global.window.EMMap;
line('map', 'assets/em-map.js exports its nodes', !!(EM && EM.NODES && EM.NODES.length));
if (EM && EM.NODES) {
    const bad = [];
    let n = 0;
    for (const node of EM.NODES) for (const k of ['href', 'explainer']) {
        if (!node[k]) continue;
        n += 1;
        const why = check(HERE, node[k], null);
        if (why) bad.push(`${node.id}.${k} ${node[k]}: ${why}`);
    }
    line('map', `${n} hrefs and explainers on ${EM.NODES.length} nodes`, bad.length === 0, bad.join('; '));
    const ids = new Set(EM.NODES.map(x => x.id));
    line('map', `${EM.EDGES.length} edges join known nodes`, EM.EDGES.every(([a, b]) => ids.has(a) && ids.has(b)));
}

// ---- 3. the site's ways in
const HUB = 'Pages/Engram Minds Eye/index.html';
const catalog = fs.readFileSync(path.join(ROOT, 'pages.html'), 'utf8');
const loads = [...catalog.matchAll(/data-load-path="([^"]+)"/g)].map(m => m[1]);
const ours = loads.filter(p => p.startsWith('Pages/Engram Minds Eye/'));
line('site', 'pages.html has an Engram card that opens the hub', ours.includes(HUB), ours.join(', '));
line('site', `pages.html: the card's ${ours.length} buttons open pages that exist`,
    ours.length > 0 && ours.every(p => fs.existsSync(path.join(ROOT, p))), ours.filter(p => !fs.existsSync(path.join(ROOT, p))).join(', '));

const targets = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/page-chrome-targets.json'), 'utf8'));
for (const [set, menus] of Object.entries(targets.menus)) {
    const files = menus.flatMap(m => m.items.map(i => i.file));
    const missing = files.filter(f => !fs.existsSync(path.join(ROOT, f)));
    line('menus', `menu set ${set}: ${files.length} items name files that exist`, missing.length === 0, missing.join(', '));
}
const inMenu = (set, label) => (targets.menus[set] || []).some(m => m.label === label && m.items.some(i => i.file === HUB));
line('menus', 'Engram is in the Hyperbolic Oracles menus (Elsewhere)', inMenu('hyperbolic-oracles', 'Elsewhere'));
line('menus', 'Engram is in the Geometric Calculator menus (Simulations)', inMenu('geometric-calculator', 'Simulations'));
const ourPages = targets.pages.filter(p => p.file.startsWith('Pages/Engram Minds Eye/'));
line('menus', `the site bar covers every Engram page (${ourPages.length})`,
    pages.every(f => ourPages.some(p => path.join(ROOT, p.file) === f && p.menus === 'engram-minds-eye')),
    pages.filter(f => !ourPages.some(p => path.join(ROOT, p.file) === f)).map(rel).join(', '));

const HO = path.join(ROOT, 'Pages/Hyperbolic Oracles');
const hoHub = fs.readFileSync(path.join(HO, 'index.html'), 'utf8');
const hoLinks = [...hoHub.matchAll(/href="(\.\.\/Engram[^"]*)"/g)].map(m => m[1]);
line('oracles', `the Hyperbolic Oracles hub links to Engram (${hoLinks.length} links)`,
    hoLinks.includes('../Engram%20Minds%20Eye/index.html') && hoLinks.every(h => !check(HO, h, null)), hoLinks.map(h => check(HO, h, null)).filter(Boolean).join('; '));
delete global.window.HPMap;
require(path.join(HO, 'assets/hp-map.js'));
const HP = global.window.HPMap;
const node = HP && HP.NODES.find(n => n.id === 'engram');
line('oracles', 'its system map has an Engram node whose link resolves', !!node && !check(HO, node.href, null), node ? check(HO, node.href, null) || '' : 'no node');
const feeds = HP ? HP.EDGES.filter(e => e[1] === 'engram').map(e => e[0]) : [];
line('oracles', `the node draws on the four cores Engram loads (${feeds.join(', ')})`,
    ['jscore', 'decoder3d', 'twin', 'fencecode'].every(id => feeds.includes(id)));
const hoReadme = fs.readFileSync(path.join(HO, 'README.md'), 'utf8');
line('oracles', 'its README has a "Used by" section naming Engram', /## Used by[\s\S]*Engram Mind's Eye/.test(hoReadme));

console.log(`\n${pass}/${pass + fail} link checks pass`);
process.exit(fail ? 1 : 0);
