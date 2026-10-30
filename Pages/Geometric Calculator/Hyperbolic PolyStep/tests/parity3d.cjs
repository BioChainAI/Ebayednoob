// Version 2 phase A: replay reference/traces/decode3d.json through decoder3d.js. Run from this folder:
//   node tests/parity3d.cjs        (-v prints every line)
const path = require('path'), fs = require('fs');
const D = require(path.join(__dirname, '..', 'decoder3d.js'));
const trace = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reference', 'traces', 'decode3d.json'), 'utf8'));
const t0 = Date.now(), R = D.runParity3d(trace);
R.lines.forEach(l => { if (process.argv.includes('-v') || !l.ok) console.log(l.ok ? 'ok  ' : 'FAIL', l.name, l.detail); });
console.log(`${R.passed}/${R.total} decoder lines match (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(R.passed === R.total ? 0 : 1);
