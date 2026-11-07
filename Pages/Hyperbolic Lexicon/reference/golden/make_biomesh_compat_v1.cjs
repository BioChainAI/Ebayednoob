// Hyperbolic Lexicon, Phase 3: lexicon_core.js's growSync against Owl Academy's and BioChain-AI's own growers, field
// for field, on a fixed set of unregistered texts; golden/biomesh_compat_v1.json records the outcome.
//
//   node "Pages/Hyperbolic Lexicon/reference/golden/make_biomesh_compat_v1.cjs" <Owl-Academy> <BioChain-AI> [--check]
//
// Owl-Academy scripts/biomesh.js (7f45f35) and BioChain-AI src/biomesh/biomesh.js (c975161) run unchanged, by
// name-grab (spike S4's loadOwl; Pages/Engram Minds Eye/reference/golden/owl_eye.cjs's grab), their sha256Hex stood in
// for by Node crypto's SHA-256 over UTF-8 (seal-crypto.js and crypto-core.js both hash a string's UTF-8 with Web
// Crypto). Both checkouts are only read. For each text, engrams off and on: growSync, Owl's growBiochain and
// BioChain-AI's growBiochain; the fields that differ (PREREGISTRATION.md L8's fifteen, and key order); Owl's and
// BioChain-AI's verifyIntegrity on growSync's record. Writes golden/biomesh_compat_v1.json; with --check, recomputes
// and compares (lines and fields that begin with "~" are times and are not compared) and exits 1 on any difference or
// any mismatch or rejection.
//
// The texts (none is a registered instance): Rng(8000 + i), i = 0..3, through Amendment 7 item 2's generator
// (lexicon_core.js synthShard; L8 draws Rng(1000 + i), its dry run Rng(4000 + i)); seven edge texts (one byte, one
// chunk exactly, one byte over, a two-byte character across the first chunk boundary, a four-byte character at the
// end, engram tokens with digits and apostrophes, and 60,000 bytes exactly); and the first two WordNet verb gloss
// shards as spike S4 cut them (dry-run data, Amendment 7 item 8).
//
// RUNTIME. About 2 minutes: Owl's and BioChain-AI's verbatim engram layer takes ~7 s per 60 KB of gloss text, and each
// verifyIntegrity runs it again.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const SYS = path.join(__dirname, '..', '..');
const LC = require(path.join(SYS, 'lexicon_core.js'));
const W = require('./wordnet_v1.cjs');
const { grab } = require(path.join(SYS, '..', 'Engram Minds Eye', 'reference', 'golden', 'owl_eye.cjs'));
const OUT = path.join(__dirname, 'biomesh_compat_v1.json');

const args = process.argv.slice(2), check = args.includes('--check'), pos = args.filter(a => !a.startsWith('--'));
if (pos.length < 2) { console.error('usage: make_biomesh_compat_v1.cjs <Owl-Academy> <BioChain-AI> [--check]'); process.exit(2); }
const OWL = path.resolve(pos[0]), BIOCHAIN = path.resolve(pos[1]);
const F_OWL = 'scripts/biomesh.js', F_BIO = 'src/biomesh/biomesh.js';
const sha256Node = s => crypto.createHash('sha256').update(typeof s === 'string' ? Buffer.from(s, 'utf8') : s).digest('hex');

// growBiochain and verifyIntegrity of a biomesh.js, run as written (spike S4's loadOwl), with ns.sha256Hex
// (SC in Owl's file, CC in BioChain-AI's) as Node crypto's SHA-256 over UTF-8
function loadGrower(root, file, ns) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) { console.error(`missing ${p}`); process.exit(2); }
    const src = fs.readFileSync(p, 'utf8');
    const line = start => { const i = src.indexOf(start); if (i < 0) throw new Error(`${start} not found in ${file}`); return src.slice(i, src.indexOf('\n', i)).trim(); };
    const SYNC = ['M64', 'fold64', 'qmul', 'qconj', 'qn', 'crystalQuat', 'quatHex', 'PAR_MASK', 'popcountEven', 'crystallize', 'unpackPacket', 'packWord',
        'mulberry32', 'engramCharGrid', 'engramGrid', 'engramGridHex', 'engramJ', 'tokenizeEngrams', 'engramStreamFromText',
        'frameStream', 'parseBiochainStream', 'BW', 'BR', 'cands', 'upd', 'encodeChunk', 'decodeChunk', 'chainFrames', 'recreateChunks', 'recreateText', 'parseCodexStream'];
    const consts = [line('export const MAX_GROW_BYTES'), line('export const STREAM_VERSION'), line('const CHUNK = ')].map(l => l.replace(/^export /, ''));
    const body = consts.concat(SYNC.map(n => grab(src, n).replace(/^export /, ''))).join('\n');
    const api = new Function(ns, body + '\n' + grab(src, 'growBiochain').replace(/^export /, '') + '\n' + grab(src, 'verifyIntegrity').replace(/^export /, '') +
        '\nreturn { growBiochain, verifyIntegrity };')({ sha256Hex: async str => sha256Node(str) });
    let commit = null;
    try { commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD']).toString().trim(); } catch (e) { /* not a git checkout */ }
    return { file, commit, sha256: sha256Node(fs.readFileSync(p)), ...api };
}

function texts() {
    const out = [];
    for (let i = 0; i < 4; i++) { const s = LC.synthShard(8000 + i); out.push({ name: `synth ${8000 + i}`, origin: `Amendment 7 item 2's generator on Rng(${8000 + i}) (${s.draws} draw${s.draws > 1 ? 's' : ''})`, text: s.text }); }
    const a = n => 'abcdefghijklmnopqrstuvwxyz '.repeat(Math.ceil(n / 27)).slice(0, n);
    out.push({ name: 'edge one byte', origin: 'the letter x', text: 'x' });
    out.push({ name: 'edge 720', origin: '720 ASCII bytes: one chunk exactly', text: a(720) });
    out.push({ name: 'edge 721', origin: '721 ASCII bytes: one byte into a second chunk', text: a(721) });
    out.push({ name: 'edge split', origin: 'U+00E9 across the first chunk boundary (bytes 719-720)', text: a(719) + 'é' + a(100) });
    out.push({ name: 'edge four-byte end', origin: 'U+1D538 as the last four bytes', text: a(1000) + '\u{1D538}' });
    out.push({ name: 'edge tokens', origin: 'engram tokens with digits and apostrophes, and a 0x80 byte', text: "Owl's 3 tests: don't 42x, A1B2 'quoted' it's \u0080 café 中文 x'y'z 0 '' end" });
    const r = new (require(path.join(SYS, '..', 'Hyperbolic Oracles', 'hyperbolic_core.js')).Rng)(8100);
    let big = '';
    while (Buffer.byteLength(big) < 60000 - 3) big += r.below(3) ? String.fromCharCode(97 + r.below(26)) : r.below(2) ? ' ' : 'é';
    while (Buffer.byteLength(big) < 60000) big += 'z';
    out.push({ name: 'edge 60000', origin: '60,000 bytes exactly: letters, spaces and U+00E9 from Rng(8100)', text: big });
    const wn = W.load(), verbs = LC.glossShards(wn, 'verb');
    for (let k = 0; k < 2; k++) out.push({ name: `verb ${String(k).padStart(2, '0')}`, origin: `WordNet 3.0 verb gloss shard ${k} (spike S4's cut; dry-run data)`, text: verbs[k] });
    return out;
}

async function main() {
    const t0 = Date.now();
    const owl = loadGrower(OWL, F_OWL, 'SC'), bio = loadGrower(BIOCHAIN, F_BIO, 'CC');
    const BC = LC.chainCores().BC;
    const result = {
        definition: 'lexicon_core.js growSync against Owl Academy\'s and BioChain-AI\'s growBiochain (unchanged, name-grab, Node crypto SHA-256 over UTF-8), engrams off and on; diff: the fields that differ among PREREGISTRATION.md L8\'s fifteen (and "(key order)"); verify: each verifyIntegrity on growSync\'s record; record: SHA-256 of growSync\'s record as JSON.stringify writes it',
        sources: {
            owl: { repository: 'BioChainAI/Owl-Academy', file: owl.file, commit: owl.commit, sha256: owl.sha256 },
            biochain: { repository: 'BioChainAI/BioChain-AI', file: bio.file, commit: bio.commit, sha256: bio.sha256 },
            biochain_v1: { file: 'Pages/Engram Minds Eye/biochain_v1.js', generatedFrom: BC.source, sameAsOwl: BC.source.sha256 === owl.sha256 },
        },
        texts: [],
    };
    let total = 0, owlSame = 0, bioSame = 0, owlOk = 0, bioOk = 0;
    for (const t of texts()) {
        const data = Buffer.from(t.text, 'utf8'), t1 = Date.now(), off = LC.growSync(t.text, { engrams: false }), msOff = Date.now() - t1;
        const entry = { name: t.name, origin: t.origin, bytes: data.length, sha256: sha256Node(data), chunks: off.leafHashes.length,
            chunks80: LC.framesStrict(off.stream).filter(f => LC.crystalHas80(f.packet)).length, records: {} };
        for (const mode of ['off', 'on']) {
            const opts = { engrams: mode === 'on' }, ta = Date.now();
            const mine = mode === 'off' ? off : LC.growSync(t.text, opts), msMine = mode === 'off' ? msOff : Date.now() - ta;
            const tb = Date.now(), o = await owl.growBiochain(t.text, opts), msOwl = Date.now() - tb;
            const b = await bio.growBiochain(t.text, opts);
            const vo = await owl.verifyIntegrity(mine), vb = await bio.verifyIntegrity(mine);
            const dOwl = LC.recordDiff(mine, o), dBio = LC.recordDiff(mine, b);
            total++; owlSame += !dOwl.length; bioSame += !dBio.length; owlOk += vo.ok; bioOk += vb.ok;
            entry.records[mode] = { record: sha256Node(JSON.stringify(mine)), chainId: mine.chainId, merkleRoot: mine.merkleRoot, value: mine.value,
                owlDiff: dOwl, biochainDiff: dBio, owlVerify: vo.ok, biochainVerify: vb.ok, '~ms': { growSync: msMine, owl: msOwl } };
            if (!check) console.log(`  ${t.name.padEnd(20)} engrams ${mode.padEnd(3)}  Owl ${dOwl.length ? 'DIFFERS: ' + dOwl.join(',') : 'equal'}  BioChain-AI ${dBio.length ? 'DIFFERS: ' + dBio.join(',') : 'equal'}  verifyIntegrity ${vo.ok}/${vb.ok}  ~${msMine}/${msOwl} ms`);
        }
        result.texts.push(entry);
    }
    result.summary = { records: total, equalToOwl: owlSame, equalToBiochain: bioSame, owlVerifyIntegrityAccepts: owlOk, biochainVerifyIntegrityAccepts: bioOk };
    const ok = owlSame === total && bioSame === total && owlOk === total && bioOk === total && result.sources.biochain_v1.sameAsOwl;
    const text = JSON.stringify(result, null, 1) + '\n';
    const strip = s => JSON.stringify(JSON.parse(s), (k, v) => (k.startsWith('~') ? undefined : v));
    console.log(`growSync equal to Owl's record ${owlSame}/${total}, to BioChain-AI's ${bioSame}/${total}; Owl's verifyIntegrity accepts ${owlOk}/${total}, BioChain-AI's ${bioOk}/${total}  (~${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    if (check) {
        if (!fs.existsSync(OUT)) { console.log(`FAIL  ${OUT} is missing: run without --check`); process.exit(1); }
        const same = strip(fs.readFileSync(OUT, 'utf8')) === strip(text);
        console.log(`${same ? 'ok  ' : 'FAIL'}  golden/biomesh_compat_v1.json ${same ? 'reproduces' : 'DIFFERS'}`);
        process.exit(same && ok ? 0 : 1);
    }
    fs.writeFileSync(OUT, text);
    console.log(`wrote ${OUT}`);
    process.exit(ok ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
