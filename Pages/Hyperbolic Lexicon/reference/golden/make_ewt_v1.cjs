// Hyperbolic Lexicon: pins Universal Dependencies English EWT (Phase 0).
//
//   node "Pages/Hyperbolic Lexicon/reference/golden/make_ewt_v1.cjs"           fetch (once) and write the metadata
//   node "Pages/Hyperbolic Lexicon/reference/golden/make_ewt_v1.cjs" --check   recompute and compare
//
// UD English EWT (CC BY-SA 4.0) is fetched at a fixed commit with curl into ~/.cache/hyperbolic-lexicon/ewt, outside
// git. No text is committed: ewt_v1.meta.json records the commit, each file's size and SHA-256, and the sentence
// counts ('# text =' lines) that L1's instance (b) uses.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const COMMIT = '4a4d77f599ea53cc405f85d0cec4b2f14f81d42b';
const REPO = 'UniversalDependencies/UD_English-EWT';
const FILES = ['en_ewt-ud-train.conllu', 'en_ewt-ud-dev.conllu', 'en_ewt-ud-test.conllu', 'LICENSE.txt'];
const CACHE = path.join(process.env.HL_CACHE || path.join(os.homedir(), '.cache', 'hyperbolic-lexicon'), 'ewt');
const META = path.join(__dirname, 'ewt_v1.meta.json');
const CHECK = process.argv.includes('--check');
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');

const missing = FILES.filter(f => !fs.existsSync(path.join(CACHE, f)));
if (missing.length) {
    if (CHECK) { console.error(`skipped: UD English EWT not cached at ${CACHE} (run without --check to fetch it)`); process.exit(2); }
    fs.mkdirSync(CACHE, { recursive: true });
    for (const f of missing) execFileSync('curl', ['-sS', '--fail', '-o', path.join(CACHE, f), `https://raw.githubusercontent.com/${REPO}/${COMMIT}/${f}`], { stdio: 'inherit' });
}

const files = {};
for (const f of FILES) {
    const b = fs.readFileSync(path.join(CACHE, f)), entry = { bytes: b.length, sha256: sha256(b) };
    if (f.endsWith('.conllu')) {
        const texts = b.toString('utf8').split('\n').filter(l => l.startsWith('# text = ')).map(l => l.slice(9));
        entry.sentences = texts.length;
        entry.textSha256 = sha256(texts.join('\n'));
    }
    files[f] = entry;
}
const meta = { repository: REPO, commit: COMMIT, licence: 'CC BY-SA 4.0', files };
const json = JSON.stringify(meta, null, 1) + '\n';
if (CHECK) {
    if (fs.readFileSync(META, 'utf8') === json) { console.log(`ewt_v1.meta.json matches ${REPO}@${COMMIT.slice(0, 7)}`); process.exit(0); }
    console.error('MISMATCH: ewt_v1.meta.json'); process.exit(1);
}
fs.writeFileSync(META, json);
const s = FILES.filter(f => f.endsWith('.conllu')).map(f => `${f.split('-').pop().split('.')[0]} ${files[f].sentences}`).join(', ');
console.log(`wrote ewt_v1.meta.json: ${REPO}@${COMMIT.slice(0, 7)}, sentences ${s}`);
