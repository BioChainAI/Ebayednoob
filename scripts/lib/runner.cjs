// Runs a list of checks with one set of statuses, for the systems' tests/all.cjs and the root tests/run-all.cjs.
//
//   const { runAll, parseArgs } = require('<repository>/scripts/lib/runner.cjs');
//   runAll(RUNS, { jobs, allowPartial, strict }).then(code => process.exit(code));
//
// A run is [group, label, command, options?]. The command is an argv array run from the repository root ('node' is this
// Node). Options: skips: false when the command's exit 2 is not "skipped" (pytest uses 2 for an interrupted run or a
// collection error); python: modules the command needs (missing ones make the run skipped, with the reason); tags: for
// run-all's profiles ('siblings' needs the sibling checkouts, 'browser' needs Chromium, 'slow'); exclusive: the command
// rewrites files of the working tree (and restores them), so it runs alone, after the others, whatever -j is;
// optional: a skip stays a skip under --strict; innerSkips: under --strict, tests that pytest itself skipped (its
// summary line says "N skipped") make the run a failure too.
//
// Statuses, from the exit code:  0 pass   2 skip (nothing ran: a checkout, cache or tool is missing)
//                                3 partial (some parts ran and passed, others were skipped)   anything else FAIL
// The summary is "N pass, M partial, K skipped" (and "F FAIL"). The exit code is 1 when a check failed, or when one was
// partial and allowPartial is not set (--allow-partial, for local runs without the caches); 0 otherwise.
// Strict (--strict, or CHECKS_STRICT=1): a skip is a failure, unless the run is optional. For CI jobs whose
// prerequisites are installed or checked out, where a skip can only mean a broken setup.
'use strict';
const { spawn, spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATUS = { 0: 'pass', 2: 'skip', 3: 'partial' };
const pyCache = new Map();
function pythonHas(mods) {
    const key = mods.join(',');
    if (!pyCache.has(key)) {
        const r = spawnSync('python3', ['-B', '-I', '-c', mods.map(m => `import ${m}`).join('; ')], { encoding: 'utf8' });
        pyCache.set(key, r.status === 0 ? null : (mods.filter(m => spawnSync('python3', ['-B', '-I', '-c', `import ${m}`]).status !== 0).join(', ') || 'python3'));
    }
    return pyCache.get(key);
}

const STRICT_NOTE = '  [--strict: a skip is a failure]';
function runOne([group, label, cmd, opts = {}], cwd, strict = false) {
    const strictly = strict && !opts.optional;
    return new Promise(resolve => {
        const t0 = Date.now();
        const missing = opts.python ? pythonHas(opts.python) : null;
        if (missing) return resolve({ group, label, status: strictly ? 'FAIL' : 'skip', secs: 0, last: `skipped: needs the Python module(s) ${missing}${strictly ? STRICT_NOTE : ''}`, out: [] });
        const exe = cmd[0] === 'node' ? process.execPath : cmd[0];
        let buf = '';
        const child = spawn(exe, cmd.slice(1), { cwd, env: process.env });
        child.stdout.on('data', d => { buf += d; });
        child.stderr.on('data', d => { buf += d; });
        child.on('error', e => { buf += `\n${e.message}`; });
        child.on('close', code => {
            const out = buf.trim().split('\n').filter(Boolean);
            let status = STATUS[code] || 'FAIL', last = out[out.length - 1] || '';
            if (status === 'skip' && opts.skips === false) status = 'FAIL';
            if (strictly && (status === 'skip' || (status === 'pass' && opts.innerSkips && /\b\d+ skipped\b/.test(last)))) { status = 'FAIL'; last += STRICT_NOTE; }
            resolve({ group, label, status, code, secs: (Date.now() - t0) / 1000, last, out });
        });
    });
}

async function runAll(runs, { cwd = ROOT, jobs = 1, allowPartial = false, strict = false, print = console.log } = {}) {
    const results = [];
    const show = r => {
        print(`${r.status.padEnd(7)} ${r.group.padEnd(9)} ${r.label.padEnd(42)} ${r.secs.toFixed(1).padStart(6)} s  ${r.last}`);
        if (r.status === 'FAIL' || r.status === 'partial') print(r.out.slice(-12).map(l => '          ' + l).join('\n'));
    };
    const shared = runs.filter(r => !(r[3] && r[3].exclusive)), alone = runs.filter(r => r[3] && r[3].exclusive);
    let next = 0;
    const worker = async () => { while (next < shared.length) { const r = await runOne(shared[next++], cwd, strict); results.push(r); show(r); } };
    await Promise.all(Array.from({ length: Math.max(1, Math.min(jobs, shared.length)) }, worker));
    for (const run of alone) { const r = await runOne(run, cwd, strict); results.push(r); show(r); }
    const n = s => results.filter(r => r.status === s).length;
    const fail = n('FAIL'), partial = n('partial');
    print(`\n${n('pass')} pass, ${partial} partial, ${n('skip')} skipped${fail ? `, ${fail} FAIL` : ''}  (${runs.length} checks)` +
        (partial && !fail ? (allowPartial ? '; partial allowed (--allow-partial)' : '; partial counts as a failure without --allow-partial') : '') +
        (strict ? '; strict: a skip counts as a failure' : ''));
    return fail || (partial && !allowPartial) ? 1 : 0;
}

// -j N / --jobs N, --allow-partial, --strict (or CHECKS_STRICT=1), --profile NAME, --skip-tag TAG (repeatable), and
// the arguments without a dash; the value of an option that takes one is never taken as a positional argument
function parseArgs(argv = process.argv.slice(2)) {
    const o = { jobs: 1, allowPartial: argv.includes('--allow-partial'), strict: argv.includes('--strict') || process.env.CHECKS_STRICT === '1', profile: null, skipTags: [], positional: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '-j' || a === '--jobs') o.jobs = Math.max(1, parseInt(argv[++i], 10) || 1);
        else if (/^-j\d+$/.test(a)) o.jobs = parseInt(a.slice(2), 10);
        else if (a === '--profile') o.profile = argv[++i];
        else if (a === '--skip-tag') o.skipTags.push(argv[++i]);
        else if (!a.startsWith('-')) o.positional.push(a);
    }
    return o;
}

module.exports = { ROOT, runAll, runOne, parseArgs, pythonHas };
