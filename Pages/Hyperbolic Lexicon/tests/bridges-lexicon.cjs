// Hyperbolic Lexicon, Phase 3: lexicon_core.js's grower against Engram Mind's Eye's biochain importer (L8(c)).
//
//   node "Pages/Hyperbolic Lexicon/tests/bridges-lexicon.cjs"
//
// EngramCore.importBiochain (Pages/Engram Minds Eye/engram_core.js, with biochain_v1.js, Owl's codec verbatim) must
// accept every record growSync grows and recreate its text byte for byte; a copy with one stream byte altered must be
// rejected, or decode to the same bytes (S4's residual aliasing, which only the hardened verifier's re-encode check
// closes). Engrams off on every text; engrams on (importBiochain then runs Owl's verbatim engram layer, ~7 s per 60 KB
// of glosses) on the texts of at most 4,000 bytes and on the first synthetic shard.
//
// The texts (none is a registered instance): Rng(8000 + i), i = 0..5, through Amendment 7 item 2's generator
// (lexicon_core.js synthShard); edge texts (one byte, a chunk exactly, one byte over, a two-byte character across the
// chunk boundary, a four-byte character at the end, engram tokens with digits and apostrophes, lone surrogates as
// TextEncoder writes them); short texts from Rng(70000 + i). Exit code 1 if any check fails.
'use strict';
const path = require('path');
const SYS = path.join(__dirname, '..');
const LC = require(path.join(SYS, 'lexicon_core.js'));
const HP = require(path.join(SYS, '..', 'Hyperbolic Oracles', 'hyperbolic_core.js'));
const { BC, EC } = LC.chainCores();

let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); };
const utf8 = s => Buffer.from(s, 'utf8');
const sameText = (a, b) => typeof a === 'string' && Buffer.from(a, 'utf8').equals(Buffer.from(b, 'utf8'));

const a = n => 'the quick brown fox, 0123 jumps! '.repeat(Math.ceil(n / 33)).slice(0, n);
const texts = [];
for (let i = 0; i < 6; i++) { const s = LC.synthShard(8000 + i); texts.push([`synthetic Rng(${8000 + i})`, s.text]); }
texts.push(['one byte', 'x'], ['720 bytes', a(720)], ['721 bytes', a(721)], ['U+00E9 across the chunk boundary', a(719) + 'é' + a(50)],
    ['a four-byte character at the end', a(1500) + '\u{1F600}'], ['engram tokens', "Owl's 3 tests: don't 42x, A1B2 'quoted' it's café 中 x'y'z 0 '' end"],
    ['lone surrogates (written as U+FFFD, as TextEncoder writes them)', 'a\uD800b ' + a(100) + ' \uDC00z']);
for (let i = 0; i < 6; i++) {                  // short texts from Rng(70000 + i): ASCII words, Latin-1 and CJK, newlines
    const r = new HP.Rng(70000 + i), parts = [];
    for (let k = 0, n = 50 + r.below(400); k < n; k++) parts.push(r.below(5) ? a(1 + r.below(9)).split(' ').join('') : ['é', 'ß', '中', '\n', '\u{1D538}', '\u0080'][r.below(6)]);
    texts.push([`short Rng(${70000 + i})`, parts.join(' ')]);
}

// ---- every text, engrams off: accepted, text byte for byte; one stream byte altered: rejected or the same bytes
let altered = 0, alteredSame = 0;
for (const [name, text] of texts) {
    const rec = LC.growSync(text, { engrams: false }), imp = EC.importBiochain(BC, rec);
    check(`${name}: ${utf8(text).length} B, engrams off: importBiochain accepts it and recreates the text byte for byte`, imp.verified && sameText(imp.text, text),
        `${rec.leafHashes.length} chunks, ${rec.chainId}`);
    const [, rp, rl] = LC.frameOffsets(rec.stream)[0], pos = rp + 2 * Math.floor(rl / 4), d = parseInt(rec.stream[pos], 16);
    const alt = { ...rec, stream: rec.stream.slice(0, pos) + (d ^ 8).toString(16) + rec.stream.slice(pos + 1) }, ai = EC.importBiochain(BC, alt);
    altered++;
    if (ai.verified) {
        const same = sameText(ai.text, text), reenc = (() => { const f = LC.framesStrict(alt.stream)[0]; return BC.encodeChunk(BC.decodeChunk(f.residual, f.chunkLen)) === f.residual; })();
        if (same) alteredSame++;
        check(`${name}: one stream byte altered and accepted by importBiochain: it decodes to the same bytes, and the re-encode check rejects it`, same && !reenc);
    }
}
check('one stream byte altered (frame 0\'s residual, middle byte, high nibble): rejected, or accepted only where it decodes to the same bytes', true,
    `${altered - alteredSame} of ${altered} rejected; ${alteredSame} decode to the same bytes`);

// ---- engrams on: the texts of at most 4,000 bytes, and the first synthetic shard
for (const [name, text] of texts.filter(([n, t], k) => k === 0 || utf8(t).length <= 4000)) {
    const t0 = Date.now(), rec = LC.growSync(text, { engrams: true }), imp = EC.importBiochain(BC, rec);
    check(`${name}: engrams on: importBiochain accepts it (Owl's engram layer and this core's agree) and recreates the text byte for byte`, imp.verified && sameText(imp.text, text),
        `${rec.engramCount} engram tokens, ~${Date.now() - t0} ms`);
}

// ---- a leaf or the root altered, and a record of the binary-leaf grower (L8 control 2): importBiochain rejects them
{
    const [, text] = texts[0], rec = LC.growSync(text, { engrams: false });
    const leaf = rec.leafHashes.slice(); leaf[1] = leaf[1].slice(0, -1) + (leaf[1].endsWith('0') ? '1' : '0');
    check('a leaf hash altered: rejected', !EC.importBiochain(BC, { ...rec, leafHashes: leaf }).verified);
    check('merkleRoot altered: rejected', !EC.importBiochain(BC, { ...rec, merkleRoot: rec.merkleRoot.slice(0, -1) + (rec.merkleRoot.endsWith('0') ? '1' : '0') }).verified);
    check('a record of the binary-leaf grower (L8 control 2): rejected', !EC.importBiochain(BC, LC.growSync(text, { engrams: false, leaves: 'binary' })).verified);
    check('a record with BioChain-AI\'s kernel packets (L8 control 1) still imports: leaves, root and weave commit to bytes, not packets',
        EC.importBiochain(BC, LC.growSync(text, { engrams: false, packets: 'kernel' })).verified);
}
// ---- the lazy chain section: lexicon_core.js without Engram Mind's Eye's cores still loads (a page's view)
{
    const vm = require('vm'), fs = require('fs');
    const src = fs.readFileSync(path.join(SYS, 'lexicon_core.js'), 'utf8'), ctx = { self: {}, console };
    ctx.self.OrbitalCore = require(path.join(SYS, '..', '..', 'scripts', 'geometric-build', 'orbital_core.js'));
    ctx.self.HPCore = HP;
    ctx.self.HPDecode3D = require(path.join(SYS, '..', 'Hyperbolic Oracles', 'decoder3d.js'));
    vm.runInNewContext(src, ctx);
    const L = ctx.self.LexiconCore;
    let msg = '';
    try { L.growSync('x'); } catch (e) { msg = e.message; }
    check('lexicon_core.js loads in a page without biochain_v1.js and engram_core.js; the chain section says what it needs', !!L && L.wordStr([0, 1]) === '01' && /biochain_v1\.js/.test(msg), msg);
    ctx.self.BiochainV1 = BC; ctx.self.EngramCore = EC;
    check('... and grows once they are loaded', L.growSync(texts[6][1], { engrams: false }).chainId === LC.growSync(texts[6][1], { engrams: false }).chainId);
}
console.log(`\n${pass}/${pass + fail} checks pass${fail ? `, ${fail} fail` : ''}  (${LC.version})`);
process.exit(fail ? 1 : 0);
