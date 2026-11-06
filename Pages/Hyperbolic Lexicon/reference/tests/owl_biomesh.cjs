// Owl Academy's and BioChain-AI's own growBiochain and verifyIntegrity, run unchanged by name-grab (spike S4's
// loadOwl recipe), for tests/test_chain.py: the Python grower is compared with them field for field.
//
//   node owl_biomesh.cjs <Owl-Academy checkout> <BioChain-AI checkout> < request.json > response.json
//
// request:  {"grow": [{"text": str, "engrams": bool}, ...], "verify": [record, ...]}
// response: {"owlSha": hex, "biochainSha": hex, "owl": [record], "biochain": [record],
//            "owlVerify": [{ok, reasons}], "biochainVerify": [{ok, reasons}]}
// Both files are only read. SHA-256 is Node crypto over UTF-8, standing in for seal-crypto's / crypto-core's
// sha256Hex as S4 and Pages/Engram Minds Eye/reference/golden/make_bridges_v1.cjs do. Owl's engram layer is its
// verbatim engramStreamFromText (about 7 s per 60 KB shard): keep engrams-on texts short.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { grab } = require('../../../Engram Minds Eye/reference/golden/owl_eye.cjs');

const SYNC = ['M64', 'fold64', 'qmul', 'qconj', 'qn', 'crystalQuat', 'quatHex', 'PAR_MASK', 'popcountEven', 'crystallize', 'unpackPacket', 'packWord',
    'mulberry32', 'engramCharGrid', 'engramGrid', 'engramGridHex', 'engramJ', 'tokenizeEngrams', 'engramStreamFromText',
    'frameStream', 'parseBiochainStream', 'BW', 'BR', 'cands', 'upd', 'encodeChunk', 'decodeChunk', 'chainFrames', 'recreateChunks', 'recreateText'];
const sha256 = s => crypto.createHash('sha256').update(Buffer.from(String(s), 'utf8')).digest('hex');

function load(file, hashName) {
    const src = fs.readFileSync(file, 'utf8');
    const line = start => { const i = src.indexOf(start); if (i < 0) throw new Error(`${start} not found in ${file}`); return src.slice(i, src.indexOf('\n', i)).trim(); };
    const consts = [line('export const MAX_GROW_BYTES'), line('export const STREAM_VERSION'), line('const CHUNK = ')].map(l => l.replace(/^export /, ''));
    const body = consts.concat(SYNC.map(n => grab(src, n).replace(/^export /, ''))).join('\n');
    const api = new Function(hashName, body + '\n' + grab(src, 'growBiochain').replace(/^export /, '') + '\n' +
        grab(src, 'verifyIntegrity').replace(/^export /, '') + '\nreturn { growBiochain, verifyIntegrity };')({ sha256Hex: async str => sha256(str) });
    return { sha: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), ...api };
}

async function main() {
    const [owlDir, bioDir] = process.argv.slice(2);
    const owl = load(path.join(owlDir, 'scripts', 'biomesh.js'), 'SC');
    const bio = load(path.join(bioDir, 'src', 'biomesh', 'biomesh.js'), 'CC');
    const req = JSON.parse(fs.readFileSync(0, 'utf8'));
    const out = { owlSha: owl.sha, biochainSha: bio.sha, owl: [], biochain: [], owlVerify: [], biochainVerify: [] };
    for (const g of req.grow || []) {
        out.owl.push(await owl.growBiochain(g.text, { engrams: g.engrams }));
        out.biochain.push(await bio.growBiochain(g.text, { engrams: g.engrams }));
    }
    for (const r of req.verify || []) {
        out.owlVerify.push(await owl.verifyIntegrity(r));
        out.biochainVerify.push(await bio.verifyIntegrity(r));
    }
    process.stdout.write(JSON.stringify(out));
}
main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
