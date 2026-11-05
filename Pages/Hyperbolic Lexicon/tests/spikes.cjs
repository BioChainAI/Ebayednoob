// Hyperbolic Lexicon: rerun the Phase 0 spikes and compare them with their captured outputs.
//
//   node "Pages/Hyperbolic Lexicon/tests/spikes.cjs"          the quick set: S1, S6, S7 (about a minute)
//   node "Pages/Hyperbolic Lexicon/tests/spikes.cjs" --all    all seven, S4's Python port included (about ten minutes)
//
// Every line that does not start with "~" must reproduce exactly; "~" lines carry timings and runtime versions and are
// ignored. A spike whose data or checkout is missing (the WordNet cache, Owl-Academy, BioChain-AI or SHD-CCP beside this
// repository, numpy, Playwright's Chromium) is reported as skipped, never as passed. Exits 1 if any rerun differs.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const SP = 'Pages/Hyperbolic Lexicon/spikes/';
const ALL = process.argv.includes('--all');
const sibling = name => path.join(ROOT, '..', name);
const cache = path.join(process.env.HL_CACHE || path.join(os.homedir(), '.cache', 'hyperbolic-lexicon'), 'wordnet.zip');
const has = {
    wordnet: fs.existsSync(cache),
    owl: fs.existsSync(path.join(sibling('Owl-Academy'), 'scripts/biomesh.js')),
    biochain: fs.existsSync(path.join(sibling('BioChain-AI'), 'protocol/shdccp_kernel.py')),
    shdccp: fs.existsSync(path.join(sibling('SHD-CCP'), 'Geometric_Engine')),
    numpy: spawnSync('python3', ['-c', 'import numpy'], { encoding: 'utf8' }).status === 0,
    chromium: (() => { try { require.resolve('playwright'); return true; } catch { return false; } })(),
};

const RUNS = [
    { id: 'S1', out: 's1_h3_tree_metrics_output.txt', cmd: ['node', SP + 's1_h3_tree_metrics.cjs'], quick: true, needs: [] },
    { id: 'S2', out: 's2_h2_exact_tree_output.txt', cmd: ['node', SP + 's2_h2_exact_tree.cjs'], needs: [] },
    { id: 'S3', out: 's3_wordnet_shape_output.txt', cmd: ['node', SP + 's3_wordnet_shape.cjs'], needs: ['wordnet', 'owl'] },
    { id: 'S4', out: 's4_lexicon_shard_output.txt', cmd: ['node', SP + 's4_lexicon_shard.cjs'], needs: ['wordnet', 'owl', 'biochain'] },
    { id: 'S4 (Python pack)', out: 's4_python_pack_output.txt', cmd: ['python3', '-B', '-I', SP + 's4_python_pack.py'], needs: ['biochain'] },
    { id: 'S5', out: 's5_lps_overlay_output.txt', cmd: ['python3', '-B', '-I', SP + 's5_lps_overlay.py'], needs: ['numpy', 'shdccp'] },
    { id: 'S6', out: 's6_unicode_wordpiece_output.txt', cmd: ['node', SP + 's6_unicode_wordpiece.cjs'], quick: true, needs: ['chromium'] },
    { id: 'S7', out: 's7_attestation_output.txt', cmd: ['node', SP + 's7_attestation.cjs'], quick: true, needs: ['biochain'] },
];

const stable = text => text.split('\n').filter(l => !l.startsWith('~')).join('\n').trimEnd();
let failed = 0, ran = 0, skipped = 0;
for (const r of RUNS) {
    if (!ALL && !r.quick) continue;
    const missing = r.needs.filter(n => !has[n]);
    if (missing.length) { skipped++; console.log(`skip  ${r.id.padEnd(17)} (missing: ${missing.join(', ')})`); continue; }
    const t0 = Date.now();
    const p = spawnSync(r.cmd[0], r.cmd.slice(1), { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 << 20, timeout: 20 * 60 * 1000 });
    const want = stable(fs.readFileSync(path.join(ROOT, SP, r.out), 'utf8'));
    const got = stable(p.stdout || '');
    ran++;
    const ok = p.status === 0 && got === want;
    if (!ok) failed++;
    let detail = '';
    if (!ok) {
        if (p.status !== 0) detail = `exit ${p.status}${p.signal ? ' ' + p.signal : ''}: ${(p.stderr || '').trim().split('\n').slice(-2).join(' | ')}`;
        else {
            const a = want.split('\n'), b = got.split('\n');
            const i = a.findIndex((l, k) => l !== b[k]);
            detail = `first difference at stable line ${i + 1}: captured "${(a[i] || '').slice(0, 90)}" vs rerun "${(b[i] || '').slice(0, 90)}"`;
        }
    }
    console.log(`${ok ? 'pass' : 'FAIL'}  ${r.id.padEnd(17)} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)} s  ${ok ? `${want.split('\n').length} stable lines reproduce` : detail}`);
}
console.log(`\n${ran - failed}/${ran} spike reruns reproduce${skipped ? `, ${skipped} skipped` : ''}${ALL ? '' : ' (quick set; --all for every spike)'}`);
process.exit(failed ? 1 : 0);
