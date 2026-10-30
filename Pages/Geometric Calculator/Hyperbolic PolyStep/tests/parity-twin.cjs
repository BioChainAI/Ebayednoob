// Version 2 phases B-D: replay reference/traces/twin3d.json through twin3d.js. Run from this folder:
//   node tests/parity-twin.cjs        (-v prints every line)
const path = require('path'), fs = require('fs');
const Tw = require(path.join(__dirname, '..', 'twin3d.js'));
const trace = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reference', 'traces', 'twin3d.json'), 'utf8'));
const t0 = Date.now(), R = Tw.runParityTwin(trace);
R.lines.forEach(l => { if (process.argv.includes('-v') || !l.ok) console.log(l.ok ? 'ok  ' : 'FAIL', l.name, l.detail); });
console.log(`${R.passed}/${R.total} twin lines match (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(R.passed === R.total ? 0 : 1);
