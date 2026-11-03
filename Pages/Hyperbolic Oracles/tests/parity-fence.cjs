// The 0.7 Claude fence: replay reference/traces/fence.json through fence.js. Run from this folder:
//   node tests/parity-fence.cjs        (-v prints every line; --checks also runs CF1-CF9)
const path = require('path'), fs = require('fs');
const Fz = require(path.join(__dirname, '..', 'fence.js'));
const trace = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reference', 'traces', 'fence.json'), 'utf8'));
const t0 = Date.now(), R = Fz.runParityFence(trace);
R.lines.forEach(l => { if (process.argv.includes('-v') || !l.ok) console.log(l.ok ? 'ok  ' : 'FAIL', l.name, l.detail); });
console.log(`${R.passed}/${R.total} fence lines match (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
let ok = R.passed === R.total;
if (process.argv.includes('--checks')) {
    const t1 = Date.now(), C = Fz.runChecksFence();
    for (const c of C) {
        const pass = c.passed === c.trials && c.control[0] === c.control[1];
        ok = ok && pass;
        console.log(pass ? 'ok  ' : 'FAIL', c.id, `${c.passed}/${c.trials}`, 'control', c.control.join('/'), '-', c.title);
        if (!pass || process.argv.includes('-v')) console.log('      ', c.detail);
    }
    console.log(`checks ${((Date.now() - t1) / 1000).toFixed(1)} s`);
}
process.exit(ok ? 0 : 1);
