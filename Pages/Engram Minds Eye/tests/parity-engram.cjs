// The browser core against the Python reference, line for line (Phase 3).
//
//   node "Pages/Engram Minds Eye/tests/parity-engram.cjs" [--quiet]
//
// Loads engram_core.js as a page does (orbital_core.js; PolyStep's hyperbolic_core.js, decoder3d.js, twin3d.js and
// fence.js; ttmpt_core_v1.js) and checks it against reference/golden/engram_v1.json (claim E1: 613 cases from Owl
// Academy's own code) and reference/traces/engram.json (the Python reference's exact values: addresses, schedule,
// memory words, gauges and readouts, a complete register, the coupler, the watch layer, recall), one line per case.
// Then the behaviour the Python tests check (repair and refusal, the controls, the pump, the lock, the watch layer,
// recall). The exit code is 1 if any line fails.
'use strict';
const fs = require('fs');
const path = require('path');
const EC = require(path.join(__dirname, '..', 'engram_core.js'));

const REF = path.join(__dirname, '..', 'reference');
const golden = JSON.parse(fs.readFileSync(path.join(REF, 'golden', 'engram_v1.json'), 'utf8'));
const trace = JSON.parse(fs.readFileSync(path.join(REF, 'traces', 'engram.json'), 'utf8'));
const quiet = process.argv.includes('--quiet');

function runAll(sections) {
    let pass = 0, fail = 0;
    for (const s of sections) {
        const t = Date.now(), lines = s.run(), bad = lines.filter(l => !l.ok);
        pass += lines.length - bad.length; fail += bad.length;
        console.log(`${bad.length ? 'FAIL' : 'ok  '}  ${s.name}: ${lines.length - bad.length}/${lines.length}  (${Date.now() - t} ms)`);
        for (const l of lines) if (!l.ok || !quiet) console.log(`        ${l.ok ? 'ok  ' : 'FAIL'}  [${l.section}] ${l.label}  ${l.detail}`);
    }
    return [pass, fail];
}
const t0 = Date.now();
const [pp, pf] = runAll(EC.paritySections(golden, trace));
console.log(`\nParity: ${pp}/${pp + pf} lines match the reference${pf ? `, ${pf} differ` : ''}\n`);
const [bp, bf] = runAll(EC.behaviourSections(golden));
console.log(`\nBehaviour: ${bp}/${bp + bf} checks of the Python tests hold${bf ? `, ${bf} fail` : ''}  (${Date.now() - t0} ms in all, ${EC.version})`);
process.exit(pf + bf ? 1 : 0);
