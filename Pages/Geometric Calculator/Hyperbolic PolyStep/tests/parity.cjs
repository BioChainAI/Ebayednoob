// node tests/parity.cjs  - replay the reference traces through the browser core and report every line.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const C = require(path.join(root, 'hyperbolic_core.js')), { runParity, files } = require(path.join(root, 'parity.js'));
const traces = {};
for (const f of files) traces[f] = JSON.parse(fs.readFileSync(path.join(root, 'reference', 'traces', f), 'utf8'));
const t0 = Date.now(), r = runParity(C, traces);
for (const l of r.lines) if (!l.ok || process.argv.includes('-v')) console.log(l.ok ? 'PASS' : 'FAIL', l.file, '-', l.name, l.detail ? `(${l.detail})` : '');
const byFile = {};
for (const l of r.lines) { byFile[l.file] = byFile[l.file] || [0, 0]; byFile[l.file][1]++; if (l.ok) byFile[l.file][0]++; }
for (const [f, [p, t]] of Object.entries(byFile)) console.log(`${f.padEnd(18)} ${p}/${t}`);
console.log(`${r.passed}/${r.total} trace lines match (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(r.passed === r.total ? 0 : 1);
