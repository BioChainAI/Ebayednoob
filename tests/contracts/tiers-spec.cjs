// The five tiers, written twice (overhaul F55, optional): Pages/Geometric Calculator/index.html (engine v10's export)
// keeps its own TIERS_SPEC beside orbital_core.js's. This binds the two without merging them: every tier's W, R, r,
// freq and rotation axis must agree (the page adds colours and display settings, which are not compared).
//
//   node tests/contracts/tiers-spec.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const O = require(path.join(ROOT, 'scripts', 'geometric-build', 'orbital_core.js'));
const page = fs.readFileSync(path.join(ROOT, 'Pages', 'Geometric Calculator', 'index.html'), 'utf8');
const m = /const TIERS_SPEC = (\[[\s\S]*?\n\s*\]);/.exec(page);
let failed = 0;
const line = (ok, label, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`); };
line(!!m, 'the calculator page declares TIERS_SPEC');
if (m) {
    const tiers = vm.runInNewContext(`(${m[1]})`, Object.create(null), { timeout: 1000 });
    line(tiers.length === O.TIERS_SPEC.length, 'the same number of tiers', `${tiers.length} and ${O.TIERS_SPEC.length}`);
    O.TIERS_SPEC.forEach((t, i) => {
        const p = tiers[i] || {};
        const same = p.id === t.n && p.W === t.W && p.R === t.R && p.r === t.r && p.freq === t.freq && p.rotAxis === t.rotAxis;
        line(same, `tier ${t.n}: W ${t.W}, R ${t.R}, r ${t.r}, freq ${t.freq}, axis ${t.rotAxis}`, same ? '' : `page: ${JSON.stringify({ id: p.id, W: p.W, R: p.R, r: p.r, freq: p.freq, rotAxis: p.rotAxis })}`);
    });
}
console.log(`\n${failed ? `${failed} FAIL` : 'the calculator and orbital_core.js agree on the five tiers'}`);
process.exit(failed ? 1 : 0);
