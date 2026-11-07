// Where the sibling checkouts, the download cache and Chromium are, in one place (Node; siblings.py is the same for Python).
//
//   const S = require('<repository>/scripts/lib/siblings.cjs');
//   S.dir('Owl-Academy')       OWL_ACADEMY_DIR, else ../Owl-Academy beside this repository's root
//   S.dir('BioChain-AI')       BIOCHAIN_AI_DIR, else ../BioChain-AI
//   S.dir('SHD-CCP')           SHD_CCP_DIR, else ../SHD-CCP
//   S.present(name)            whether that checkout is there (its marker file exists)
//   S.cache()                  HL_CACHE, else ~/.cache/hyperbolic-lexicon (the Hyperbolic Lexicon's downloads)
//   S.chromium()               PLAYWRIGHT_CHROMIUM, else /opt/pw-browsers/chromium when it exists, else undefined
//                              (Playwright's own browser)
//
// A missing checkout is reported by the caller as skipped (exit 2), never as passed.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const VARS = { 'Owl-Academy': 'OWL_ACADEMY_DIR', 'BioChain-AI': 'BIOCHAIN_AI_DIR', 'SHD-CCP': 'SHD_CCP_DIR' };
const MARKERS = { 'Owl-Academy': 'scripts/biomesh.js', 'BioChain-AI': 'src/biomesh/biomesh.js', 'SHD-CCP': 'SHD-CCP_Kernel_Ontology' };

function dir(name) {
    if (!(name in VARS)) throw new Error(`unknown sibling ${name}`);
    return path.resolve(process.env[VARS[name]] || path.join(ROOT, '..', name));
}
const present = name => fs.existsSync(path.join(dir(name), MARKERS[name]));
const cache = () => path.resolve(process.env.HL_CACHE || path.join(os.homedir(), '.cache', 'hyperbolic-lexicon'));
const chromium = () => process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

module.exports = { ROOT, VARS, MARKERS, dir, present, cache, chromium };

if (require.main === module) {                     // node scripts/lib/siblings.cjs: print what was found
    for (const n of Object.keys(VARS)) console.log(`${n.padEnd(12)} ${present(n) ? 'present' : 'missing'}  ${dir(n)}  (${VARS[n]})`);
    console.log(`${'cache'.padEnd(12)} ${fs.existsSync(cache()) ? 'present' : 'missing'}  ${cache()}  (HL_CACHE)`);
    console.log(`${'chromium'.padEnd(12)} ${chromium() || "Playwright's own"}  (PLAYWRIGHT_CHROMIUM)`);
}
