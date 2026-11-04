// Spike D: the 0.7 Claude fence and its ln 2 guard on a memory laid out as the norm-5 tree in H^3.
//   node "Pages/Engram Minds Eye/spikes/fence_memory.cjs"
// Output is captured in fence_memory_output.txt. Deterministic (the fence's own seeded generator).
// Uses fence.js, decoder3d.js and hyperbolic_core.js as they are.
'use strict';
const path = require('path');
const HO = path.join(__dirname, '..', '..', 'Hyperbolic Oracles');
const C = require(path.join(HO, 'hyperbolic_core.js'));
const D = require(path.join(HO, 'decoder3d.js'));
const Fe = require(path.join(HO, 'fence.js'));

let pass = 0, total = 0;
const check = (label, ok, detail = '') => { total++; if (ok) pass++; console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' · ' + detail : ''}`); };

console.log('Spike D · the 0.7 Claude fence (' + Fe.version + ') on a memory tree in H^3');
console.log('');
console.log('1. Misplaced memories: the tree to depth L (every memory at its recorded address) plus k memories placed deeper');
const emb = new D.TreeEmbedding3D();
const sameExact = (x, y) => x.every((c, j) => c.eq(y[j]));
const rows = [];
for (const [L, depth, seed] of [[2, 1, 1], [2, 2, 2], [3, 1, 3], [3, 2, 4]]) {
    const k = 5, words = Fe.treeWords(L);
    const [pts, labels] = Fe.generate({ dim: 3, kind: 'tree', L, seed, out: { k, mode: 'deep', depth } });
    const res = Fe.fence(pts, 3);
    let falseFlags = 0, caught = 0, inliers = 0, cleared = 0, confirmed = 0;
    const straight = [];
    res.verdict.forEach((v, i) => {
        // Helix B: a memory is where it should be when it sits exactly (in rationals) on the point of its recorded
        // address. An inlier's recorded address is its tree word; a misplaced memory was recorded at its depth-L ancestor.
        const rec = labels[i] ? emb.decode(Fe.toFloat(pts[i]), L) : words[i];
        const onAddress = sameExact(pts[i], emb.pointExact(rec));
        if (labels[i]) { if (v > 0) { caught++; if (!onAddress) confirmed++; } }
        else { inliers++; if (v > 0) { falseFlags++; straight.push(words[i].join('')); if (onAddress) cleared++; } }
    });
    rows.push({ L, depth, inliers, k, falseFlags, caught, cleared, confirmed, straight });
    console.log(`  L = ${L}, ${inliers} memories, ${k} placed ${depth} level${depth > 1 ? 's' : ''} too deep: flagged ${caught}/${k}, ` +
        `flagged at their proper place ${falseFlags}/${inliers}${straight.length ? ' (' + straight.join(', ') + ')' : ''}`);
}
check('every memory two levels too deep is flagged', rows.filter(r => r.depth === 2).every(r => r.caught === r.k));
const one = rows.filter(r => r.depth === 1);
console.log(`  one level too deep: flagged ${one.map(r => `${r.caught}/${r.k}`).join(' and ')} (the fence sits within ln 2 of the upper quartile, CF5)`);
console.log('  at L = 3 the fence also flags the six straightest leaves, one per branch: it measures distance from the centre,');
console.log('  not depth, and straight paths reach farther than bent ones. So the fence screens and the address check decides:');
check('every flag is settled exactly: memories on their address cleared, misplaced memories confirmed',
    rows.every(r => r.cleared === r.falseFlags && r.confirmed === r.caught),
    rows.map(r => `L${r.L}/+${r.depth}: cleared ${r.cleared}, confirmed ${r.confirmed}`).join(' · '));

console.log('');
console.log('2. The guard: a corrupted stored distance is caught and blamed on its pair (CF9)');
const [pts] = Fe.generate({ dim: 3, kind: 'tree', L: 2, seed: 7 });
const sub = pts.slice(0, 24), Dm = Fe.distanceMatrix(sub);
const clean = Fe.guardCheck(Dm);
check('clean distances: no four-point defect above ln 2', clean.bad === 0, `worst defect ${clean.worst.toFixed(4)} (ln 2 = 0.6931)`);
const [Ec, hit] = Fe.corrupt(Dm, 1, 1.5, 11), bad = Fe.guardCheck(Ec);
const blamed = bad.top.length ? bad.top[0][0] : null;
check('one distance off by 1.5: quads fail and the top-blamed pair is the corrupted one',
    bad.bad > 0 && blamed && blamed[0] === hit[0][0] && blamed[1] === hit[0][1],
    `${bad.bad} quads above ln 2, corrupted ${hit[0].join('-')}, blamed ${blamed ? blamed.join('-') : 'none'}`);

console.log('');
console.log(`${pass}/${total} checks pass`);
process.exitCode = pass === total ? 0 : 1;
