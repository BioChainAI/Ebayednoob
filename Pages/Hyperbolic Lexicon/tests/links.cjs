// Hyperbolic Lexicon: every link resolves, and the system is reachable from the rest of the site (Phase 0).
//
//   node "Pages/Hyperbolic Lexicon/tests/links.cjs" [-v]
//
// 1. Every relative href and src in the folder's pages and explainers names a file that exists, and every #anchor
//    names an id in its target page. The markdown documents' relative links resolve too.
//    Every amendment the pages, the map and the READMEs cite ("Amendment N", "Amendments M-N", "AN.k", "AN item k")
//    is one PREREGISTRATION.md already holds (its last "### Amendment N" heading), so a page never cites an amendment
//    before it is committed.
// 2. Every href and explainer on the system map (assets/hl-map.js) resolves the same way.
// 3. The site's ways in: the catalog card in pages.html; the site-bar menus (every file in every menu set exists, the
//    hyperbolic-lexicon set covers every page here, and the Lexicon is in the Hyperbolic Oracles, Engram Mind's Eye
//    and Geometric Calculator menus); the Hyperbolic Oracles and Engram hubs' notes and map nodes; the "Used by" rows
//    in Hyperbolic Oracles' README.
// Same pattern as Engram Mind's Eye's tests/links.cjs, with its three controls. Exits 1 on any failure.
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

// ---- 1. the folder's pages and documents
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
const docs = ['README.md', 'PREREGISTRATION.md', 'reference/README.md', ...fs.readdirSync(path.join(HERE, 'proposals')).filter(f => f.endsWith('.md')).map(f => 'proposals/' + f)];
for (const doc of docs) {
    const file = path.join(HERE, doc), md = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
    const links = [...md.matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1]);
    const bad = links.map(h => [h, check(path.dirname(file), h, file)]).filter(([, why]) => why).map(([h, why]) => `${h}: ${why}`);
    line('docs', `${rel(file)}: ${links.length} links`, bad.length === 0, bad.join('; '));
}

// every amendment cited is one the preregistration holds
{
    const prereg = fs.readFileSync(path.join(HERE, 'PREREGISTRATION.md'), 'utf8');
    const heads = [...prereg.matchAll(/^### Amendment (\d+)\b/gm)].map(m => Number(m[1]));
    const last = heads.length ? Math.max(...heads) : 0;
    const cited = file => {
        const t = fs.readFileSync(file, 'utf8').replace(/<!-- page-chrome:start -->[\s\S]*?<!-- page-chrome:end -->/, '');
        const nums = [];
        for (const m of t.matchAll(/\bAmendments?\s+(\d+)(?:\s*(?:&ndash;|\u2013|-|to)\s*(\d+))?/g)) nums.push(Number(m[1]), Number(m[2] || 0));
        for (const m of t.matchAll(/\bA(\d{1,2})(?:\.\d|\s+item\b)/g)) nums.push(Number(m[1]));
        return nums;
    };
    const files = [...pages, path.join(HERE, 'assets/hl-map.js'), path.join(HERE, 'README.md'), path.join(HERE, 'reference/README.md')];
    const over = files.map(f => [f, cited(f).filter(n => n > last)]).filter(([, ns]) => ns.length);
    line('amend', `every amendment cited (${files.length} files) is in PREREGISTRATION.md (Amendments 1-${last})`, last > 0 && over.length === 0,
        over.map(([f, ns]) => `${rel(f)} cites Amendment ${[...new Set(ns)].join(', ')}`).join('; '));
}

// ---- 2. the system map
global.window = { addEventListener() {} };
global.document = { addEventListener() {}, querySelectorAll: () => [], readyState: 'loading', body: { dataset: {} } };
require(path.join(HERE, 'assets/hl-map.js'));
const HL = global.window.HLMap;
line('map', 'assets/hl-map.js exports its nodes', !!(HL && HL.NODES && HL.NODES.length));
if (HL && HL.NODES) {
    const bad = [];
    let n = 0;
    for (const node of HL.NODES) for (const k of ['href', 'explainer']) {
        if (!node[k]) continue;
        n += 1;
        const why = check(HERE, node[k], null);
        if (why) bad.push(`${node.id}.${k} ${node[k]}: ${why}`);
    }
    line('map', `${n} hrefs and explainers on ${HL.NODES.length} nodes`, bad.length === 0, bad.join('; '));
    const ids = new Set(HL.NODES.map(x => x.id));
    line('map', `${HL.EDGES.length} edges join known nodes`, HL.EDGES.every(([a, b]) => ids.has(a) && ids.has(b)));
    const focus = pages.flatMap(f => [...fs.readFileSync(f, 'utf8').replace(/&lt;[\s\S]*?&gt;/g, '').matchAll(/data-hl-map="focus" data-node="([^"]+)"/g)].map(m => m[1]));
    line('map', `every focused chart names a node (${focus.length})`, focus.every(id => ids.has(id)), focus.filter(id => !ids.has(id)).join(', '));
}

// ---- 3. the site's ways in
const HUB = 'Pages/Hyperbolic Lexicon/index.html';
const catalog = fs.readFileSync(path.join(ROOT, 'pages.html'), 'utf8');
const ours = [...catalog.matchAll(/data-load-path="([^"]+)"/g)].map(m => m[1]).filter(p => p.startsWith('Pages/Hyperbolic Lexicon/'));
line('site', 'pages.html has a Hyperbolic Lexicon card that opens the hub', ours.includes(HUB), ours.join(', '));
line('site', `pages.html: the card's ${ours.length} buttons open pages that exist`,
    ours.length > 0 && ours.every(p => fs.existsSync(path.join(ROOT, p))), ours.filter(p => !fs.existsSync(path.join(ROOT, p))).join(', '));

const targets = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/page-chrome-targets.json'), 'utf8'));
for (const [set, menus] of Object.entries(targets.menus)) {
    const files = menus.flatMap(m => m.items.map(i => i.file));
    const missing = files.filter(f => !fs.existsSync(path.join(ROOT, f)));
    line('menus', `menu set ${set}: ${files.length} items name files that exist`, missing.length === 0, missing.join(', '));
}
const inMenu = (set, label) => (targets.menus[set] || []).some(m => m.label === label && m.items.some(i => i.file === HUB));
line('menus', 'the Lexicon is in the Hyperbolic Oracles menus (Elsewhere)', inMenu('hyperbolic-oracles', 'Elsewhere'));
line('menus', 'the Lexicon is in the Engram Mind\'s Eye menus (Elsewhere)', inMenu('engram-minds-eye', 'Elsewhere'));
line('menus', 'the Lexicon is in the Geometric Calculator menus (Simulations)', inMenu('geometric-calculator', 'Simulations'));
const ourPages = targets.pages.filter(p => p.file.startsWith('Pages/Hyperbolic Lexicon/'));
line('menus', `the site bar covers every Lexicon page (${ourPages.length})`,
    pages.every(f => ourPages.some(p => path.join(ROOT, p.file) === f && p.menus === 'hyperbolic-lexicon')),
    pages.filter(f => !ourPages.some(p => path.join(ROOT, p.file) === f)).map(rel).join(', '));

const nodeIn = (mapFile, globalName, id, fromDir) => {
    delete global.window[globalName];
    require(mapFile);
    const M = global.window[globalName], node = M && M.NODES.find(n => n.id === id);
    return node ? check(fromDir, node.href, null) || 'ok' : 'no node';
};
const HO = path.join(ROOT, 'Pages/Hyperbolic Oracles'), EM = path.join(ROOT, 'Pages/Engram Minds Eye');
for (const [name, dir, map, glob] of [['Hyperbolic Oracles', HO, 'assets/hp-map.js', 'HPMap'], ['Engram Mind\'s Eye', EM, 'assets/em-map.js', 'EMMap']]) {
    const hub = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    const links = [...hub.matchAll(/href="(\.\.\/Hyperbolic%20Lexicon[^"]*)"/g)].map(m => m[1]);
    line('cross', `the ${name} hub links to the Lexicon (${links.length})`,
        links.includes('../Hyperbolic%20Lexicon/index.html') && links.every(h => !check(dir, h, null)), links.map(h => check(dir, h, null)).filter(Boolean).join('; '));
    const r = nodeIn(path.join(dir, map), glob, 'lexicon', dir);
    line('cross', `the ${name} map has a Lexicon node whose link resolves`, r === 'ok', r === 'ok' ? '' : r);
}
const hoReadme = fs.readFileSync(path.join(HO, 'README.md'), 'utf8');
line('cross', 'Hyperbolic Oracles\' README lists what the Lexicon uses', /## Used by[\s\S]*What Hyperbolic Lexicon uses/.test(hoReadme));
const emReadme = fs.readFileSync(path.join(EM, 'README.md'), 'utf8');
line('cross', 'Engram\'s README notes the Lexicon', /Hyperbolic Lexicon/.test(emReadme));

console.log(`\n${pass}/${pass + fail} link checks pass`);
process.exit(fail ? 1 : 0);
