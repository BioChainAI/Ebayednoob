// Engram Mind's Eye: every name the two pages take from the shared cores exists in those cores (overhaul F72).
//
//   node "Pages/Engram Minds Eye/tests/core-names.cjs"
//
// assets/mind-eye.js and assets/mind-eye-3d.js bind cores from window (const C = window.HPCore, ...) and use their
// members (C.TreeEmbedding, C.H.boost, Fz.recentre, O.TIERS_SPEC, ...), some of them outside any other test. This
// reads both scripts, collects every alias.name and alias.name.name of a bound core (comments and string literals
// removed first), loads the cores in Node as the pages load them, and fails on any name that is not there. A control
// plants an unknown name and must be caught. Exits 1 on any missing name.
'use strict';
const fs = require('fs');
const path = require('path');

const SYS = path.join(__dirname, '..'), HO = path.join(SYS, '..', 'Hyperbolic Oracles'), ROOT = path.join(SYS, '..', '..');
const CORES = {
    OrbitalCore: path.join(ROOT, 'scripts', 'geometric-build', 'orbital_core.js'),
    HPCore: path.join(HO, 'hyperbolic_core.js'), HPDecode3D: path.join(HO, 'decoder3d.js'), HPTwin3D: path.join(HO, 'twin3d.js'), HPFence: path.join(HO, 'fence.js'),
    EngramCore: path.join(SYS, 'engram_core.js'), StrixLibraryV1: path.join(SYS, 'strix_library_v1.js'),
    LatticeSeedV1: path.join(SYS, 'lattice_seed_v1.js'), BiochainV1: path.join(SYS, 'biochain_v1.js'),
};
const PAGES = ['assets/mind-eye.js', 'assets/mind-eye-3d.js'];

const N = require('../../../scripts/lib/core-names.cjs');      // the scanner check-cores.mjs uses too
function usedNames(src) {
    const aliases = N.windowAliases(src, Object.keys(CORES));
    return N.usedNames(src, aliases).map(u => ({ core: aliases[u.alias], path: u.path }));
}
// the cores, loaded as the pages load them (each UMD module as Node requires it)
const loaded = Object.fromEntries(Object.entries(CORES).map(([k, f]) => [k, require(f)]));
function missing(used) {
    const bad = new Set();
    for (const u of used) {
        let v = loaded[u.core];
        for (const p of u.path) { v = v == null ? undefined : v[p]; if (v === undefined) break; }
        if (v === undefined) bad.add(`${u.core}.${u.path.join('.')}`);
    }
    return [...bad];
}

let failed = 0;
const line = (ok, label, detail) => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}  ${detail}`); };
for (const page of PAGES) {
    const used = usedNames(fs.readFileSync(path.join(SYS, page), 'utf8')), bad = missing(used);
    const byCore = {};
    for (const u of used) (byCore[u.core] = byCore[u.core] || new Set()).add(u.path.join('.'));
    line(!bad.length && used.length > 0, page, bad.length ? `missing: ${bad.join(', ')}` : Object.entries(byCore).map(([k, s]) => `${k} ${s.size}`).join(', '));
}
// the names overhaul F72 found outside any test must be among those checked
const all = PAGES.flatMap(p => usedNames(fs.readFileSync(path.join(SYS, p), 'utf8'))).map(u => `${u.core}.${u.path.join('.')}`);
const f72 = ['HPCore.TreeEmbedding', 'HPCore.H.boost', 'HPCore.H.dist', 'HPCore.H.matvec', 'HPFence.recentre'];
line(f72.every(n => all.includes(n)), 'the F72 names are collected', f72.join(', '));
// control: an unknown name must be caught, in code but not in a comment or a string
const planted = usedNames('const C = window.HPCore, T3 = window.HPTwin3D;\nC.P.children(1); T3.noSuchName(2);\n// C.inAComment\nconst s = "C.inAString";');
line(missing(planted).join() === 'HPTwin3D.noSuchName' && planted.length === 2, 'control: a planted unknown name is caught', missing(planted).join(', '));
console.log(`\n${failed ? `${failed} FAIL` : 'every core name the pages use exists'}`);
process.exit(failed ? 1 : 0);
