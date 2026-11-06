// Hyperbolic Lexicon, Phase 3: lexicon_core.js's chain section, the checks that are not trace lines.
//
//   node "Pages/Hyperbolic Lexicon/tests/chain-lexicon.cjs"
//
// What reference/traces/chain_v1.txt cannot hold (its keys are fixed and its signatures deterministic):
//   pins     CHAIN_PINS against reference/golden (the training set's digest, the WordNet archive and URL, the
//            normaliser spec nb_spec_v1.txt and its pin); a spec with one byte changed is refused
//   shards   the gloss cut: C0's 148 shard texts against the SHA-256s pinned in wordnet_v1.meta.json (their hashes
//            only: no C0 shard is grown, compared or verified here), and the verb and adjective shards against spike
//            S4's digest; Amendment 7 item 2's generator on Rng(8000 + i) (the 25% two-byte check, the 0x80 rule)
//   keys     WebCrypto's path, as a registered run uses it: P-256 pairs made here, ATTEST/1 blocks signed in
//            WebCrypto and verified against a registry snapshot; the snapshot refused when not the pinned one or
//            when an entry's keyId is not its JWK's; P1363 to DER and back with r or s short
//   verifier packages of six unregistered texts (Rng(8000 + i) synthetic shards, engrams off and on) under a fresh
//            key: every clean one accepted; T1-T9 (one each, made as Amendment 7 item 6 describes) rejected by the
//            check the reference names; L11's control (the attestation skipped) runs, the check reported skipped (not counted against authentic)
// The session's LADDR/1 here is a stand-in (the hash of a fixed string): the real addrTableRoot is L8(d)'s.
// Exit code 1 if any check fails.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SYS = path.join(__dirname, '..'), REF = path.join(SYS, 'reference');
const LC = require(path.join(SYS, 'lexicon_core.js'));
const W = require(path.join(REF, 'golden', 'wordnet_v1.cjs'));
const { BC } = LC.chainCores();

let pass = 0, fail = 0, skip = 0;
const check = (label, ok, detail = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); };
const skipped = (label, why) => { skip++; console.log(`skip  ${label}  (${why})`); };
const meta = n => JSON.parse(fs.readFileSync(path.join(REF, 'golden', n), 'utf8'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const throws = f => { try { f(); return false; } catch (e) { return true; } };
const athrows = async f => { try { await f(); return false; } catch (e) { return true; } };

(async () => {
    // ---- pins
    const P = LC.CHAIN_PINS, wm = meta('wordnet_v1.meta.json');
    check('trainSetSha is L1 instance (a)\'s digest (l1_instances_v1.meta.json)', P.trainSetSha === meta('l1_instances_v1.meta.json').instances.a.sha256);
    check('wordnetZipSha256 and the archive URL are wordnet_v1.meta.json\'s and wordnet_v1.cjs\'s', P.wordnetZipSha256 === wm.source.sha256 && P.wordnetUrl === wm.source.url && P.wordnetUrl === W.URL);
    const spec = fs.readFileSync(path.join(REF, 'golden', 'nb_spec_v1.txt'));
    check('nb_spec_v1.txt is the pinned normaliser spec, and LVOCAB/1 carries its SHA-256', sha(spec) === P.nbSpecSha256 && spec.length === P.nbSpecBytes && LC.lvocab().text.split('|')[2] === P.nbSpecSha256,
        `${spec.length} B, ${P.nbSpecSha256.slice(0, 16)}...`);
    const recordsPy = fs.readFileSync(path.join(REF, 'lexicon', 'records.py'), 'utf8');
    check('the pin is the reference\'s (records.py NB_SPEC_SHA256)', recordsPy.includes(`NB_SPEC_SHA256 = '${P.nbSpecSha256}'`));
    const bent = Buffer.from(spec); bent[10] ^= 1;
    check('the spec is accepted as pinned, and with one bit changed it is refused', LC.nbSpecShaOf(spec) === P.nbSpecSha256 && throws(() => LC.nbSpecShaOf(bent)));
    check('LVOCAB/1: nine fields, V0, the pinned table, the specials with their ids', (() => { const f = LC.lvocab().text.split('|'); return f.length === 9 && f[1] === LC.PINS.V0.sha256 && f[3] === LC.PINS.unicode.sha256 && f[7] === '-' && f[8] === '[PAD]=0,[UNK]=1,[CLS]=2,[SEP]=3,[MASK]=4'; })());

    // ---- shards
    if (!fs.existsSync(W.ZIP_PATH)) skipped('the gloss cut', `no WordNet archive at ${W.ZIP_PATH}`);
    else {
        const wn = W.load();
        const c0 = LC.glossShards(wn, 'noun'), hashes = c0.map(t => sha(Buffer.from(t, 'utf8')));
        check('C0: the cut gives the 148 shard texts pinned in wordnet_v1.meta.json (hashes only)', c0.length === wm.c0.shards && hashes.every((h, i) => h === wm.c0.shardSha256[i]),
            `${c0.length} shards, ${c0.filter(t => Buffer.byteLength(t) >= 59000).length} of at least 59,000 bytes`);
        const s4 = [...LC.glossShards(wn, 'verb'), ...LC.glossShards(wn, 'adj')];
        check('the verb and adjective shards are spike S4\'s (its digest over the 55 shards\' SHA-256s)', s4.length === 55 &&
            sha(s4.map(t => sha(Buffer.from(t, 'utf8'))).join('\n')) === '498371616959d8e85a6a5588f97ac297668431693e5251f8eb6b7822ca3578be');
        const { EC } = LC.chainCores(), same = s4.filter(t => { const a = LC.engramLayer(t), b = EC.engramStream(t); return a.stream === b.stream && a.count === b.count && a.meanJ === b.meanJ; });
        check('engramLayer (each distinct token once) equals engram_core.js engramStream on the 55 verb and adjective shards', same.length === 55, `${same.length}/55`);
    }
    const syn = Array.from({ length: 4 }, (_, i) => LC.synthShard(8000 + i));
    { const { EC } = LC.chainCores(); check('... and on Rng(8000 + i)\'s synthetic shards', syn.every(s => JSON.stringify(LC.engramLayer(s.text)) === JSON.stringify(EC.engramStream(s.text)))); }
    check('Amendment 7 item 2 on Rng(8000 + i): 20,000-60,000 bytes, at least 25% two-byte code points, a 0x80 crystal',
        syn.every(s => s.data.length >= 20000 && s.data.length <= 60000 && 4 * s.twoByte >= s.codePoints && s.chunks80.length > 0 && s.data.length <= s.target),
        syn.map(s => `${s.data.length} B, ${(100 * s.twoByte / s.codePoints).toFixed(1)}%, ${s.draws} draw${s.draws > 1 ? 's' : ''}`).join('; '));

    // ---- keys and attestation in WebCrypto
    const ident = LC.identityIdOf(), epoch = LC.epochTokenOf('2026-11-05'), kv = LC.keyVectorOf(ident, epoch);
    const kA = await LC.newKeyPair(), kR = await LC.newKeyPair();
    const reg = LC.registrySnapshot([{ publicJwk: kA.publicJwk, keyVector: kv, status: 'active' }, { publicJwk: kR.publicJwk, keyVector: kv, status: 'revoked' }]);
    const R = LC.loadSnapshot(reg.text, reg.sha256);
    const content = 'LPREP/1|example';
    const block = await LC.attestSign(kA.privateKey, { keyId: kA.keyId, keyVector: kv, epochToken: epoch }, content);
    check('a WebCrypto ATTEST/1 block verifies against the registry; its signer is the registry\'s keyId', (await LC.verifyAttestation(block, content, R))[0] && (await LC.verifyAttestation(block, content, R))[2].keyId === kA.keyId);
    check('... and its high-S twin verifies too (nothing is keyed by signature bytes)', (await LC.verifyAttestation({ ...block, sig: LC.hex(LC.highSTwin(LC.fromHex(block.sig))) }, content, R))[0]);
    check('... another content, a revoked key, a changed key vector and a changed signature are refused', !(await LC.verifyAttestation(block, content + 'x', R))[0] &&
        !(await LC.verifyAttestation(await LC.attestSign(kR.privateKey, { keyId: kR.keyId, keyVector: kv, epochToken: epoch }, content), content, R))[0] &&
        !(await LC.verifyAttestation({ ...block, keyVector: kv.slice(0, -1) + (kv.endsWith('0') ? '1' : '0') }, content, R))[0] &&
        !(await LC.verifyAttestation({ ...block, sig: block.sig.slice(0, -1) + (block.sig.endsWith('0') ? '1' : '0') }, content, R))[0]);
    check('the registry snapshot is refused when it is not the pinned one, or when an entry\'s keyId is not its JWK\'s',
        throws(() => LC.loadSnapshot(reg.text + ' ', reg.sha256)) && (() => { const t = reg.text.replace(kA.keyId, kR.keyId.slice(0, -1) + 'x'); return throws(() => LC.loadSnapshot(t, LC.sha256Str(t))); })());
    let shortR = null;
    for (let n = 0; n < 5000 && !shortR; n++) { const s = LC.ecdsaSignDet(LC.TRACE_KEYS().B, LC.strBytes(`chain-lexicon short ${n}`)); if (s.r < (1n << 248n)) shortR = s; }
    check('P1363 <-> DER with a short r: the DER integer is minimal, P1363 keeps 32 bytes, the unpadded form is shorter', !!shortR && LC.p1363Of(shortR).length === 64 &&
        LC.derOf(shortR)[3] < 32 && LC.p1363Unpadded(shortR).length < 64);

    // ---- the verifier on unregistered packages
    const session = await LC.chainSession({ lvocab: LC.lvocab().text, laddr: 'LADDR/1|stand-in for the tests', registry: reg.text, registrySha256: reg.sha256 });
    const shards = [];
    for (const s of syn.slice(0, 3)) for (const engrams of [false, true]) shards.push({ text: s.text, record: LC.growSync(s.text, { engrams }) });
    const C = await LC.corpusPackages({ shards, corpusId: 'lexicon-test-v1', spdx: 'CC0-1.0', sourceShas: shards.map((_, i) => LC.sourceUrlSha(LC.synthSource(i, 8000))),
        session, privateKey: kA.privateKey, keyId: kA.keyId, keyVector: kv, epochToken: epoch });
    const vs = [];
    for (const p of C.packages) vs.push(await LC.verifyPackage(session, JSON.parse(JSON.stringify(p))));
    check('six clean packages (three synthetic shards, engrams off and on) accepted: self-consistent, authentic, every check passes',
        vs.every(v => v.selfConsistent && v.authentic && v.failed === '-' && v.checks.every(c => c.ok === true) && v.signer === kA.keyId), vs.map(v => LC.verdictText(v)).join('; '));
    const base = C.packages[1], cl = o => JSON.parse(JSON.stringify(o)), last = s => s.slice(0, -1) + (s.endsWith('0') ? '1' : '0');
    const edit = f => { const p = cl(base); f(p); return p; };
    const f0 = LC.framesStrict(base.record.stream)[0], flip = LC.silentFlips(f0.residual, Uint8Array.from(BC.decodeChunk(f0.residual, f0.chunkLen)), 1)[0];
    const salts = shards.map((_, j) => LC.testSalt(j));
    const CP = await LC.corpusPackages({ shards, corpusId: 'lexicon-test-p-v1', spdx: 'CC0-1.0', sourceShas: shards.map((_, i) => LC.sourceUrlSha(LC.synthSource(i, 8000))),
        session, privateKey: kA.privateKey, keyId: kA.keyId, keyVector: kv, epochToken: epoch, tier: 'P', salts });
    const fo = LC.frameOffsets(base.record.stream);
    const T = [
        ['T1', 'false true leaves', edit(p => { delete p.record.leafHashes; delete p.record.merkleRoot; })],
        ['T2', 'false true crystal', edit(p => { const s = p.record.stream, at = fo[1][0]; p.record.stream = s.slice(0, at) + LC.refixParity(LC.word16(BigInt('0x' + s.slice(at, at + 16)) ^ (1n << 30n))) + s.slice(at + 16); })],
        ['T3', 'false false commitment', edit(p => { p.lprep = LC.withField(p.lprep, 'lvocabHash', last(p.lprep.split('|')[9])); })],
        ['T4', 'true false attestation', { ...cl(base), attestation: await LC.attestSign(kR.privateKey, { keyId: kR.keyId, keyVector: kv, epochToken: epoch }, base.lprep) }],
        ['T5', 'true false attestation', edit(p => { p.attestation = cl(C.packages[2].attestation); })],
        ['T6', 'false true commitment', (() => { const p = cl(CP.packages[1]); p.salt = salts[2]; return p; })()],
        ['T7', 'false true leaves', edit(p => { p.record.stream = LC.swapFrames(p.record.stream, 1); })],
        ['T8', 'false true weaves', edit(p => { p.record.chainId = last(p.record.chainId); })],
        ['T9', 'false true canonical', edit(p => { const s = p.record.stream, [, r0, rl] = fo[0]; p.record.stream = s.slice(0, r0) + flip.alt + s.slice(r0 + rl); })],
    ];
    check('the Tier-P packages with their own salts are accepted', (await LC.verifyPackage(session, CP.packages[1])).failed === '-');
    for (const [name, want, p] of T) { const v = await LC.verifyPackage(session, p); check(`${name}: ${want}`, LC.verdictText(v) === want, LC.verdictText(v)); }
    const ctl = await LC.verifyPackage(session, base, { skip: ['attestation'] });
    check('L11\'s control: with the attestation skipped the other checks run and pass, and the attestation check is reported skipped (not run, so it does not count against authentic)',
        ctl.failed === '-' && ctl.checks.find(c => c.name === 'attestation').ok === null && ctl.checks.filter(c => c.ok === true).length === 9);
    check('a package given as JSON text verifies as the object does', LC.verdictText(await LC.verifyPackage(session, JSON.stringify(base))) === 'true true -');
    check('a session refuses a registry snapshot that is not the pinned one', await athrows(() => LC.chainSession({ lvocab: 'x', laddr: 'y', registry: reg.text, registrySha256: '0'.repeat(64) })));
    console.log(`\n${pass}/${pass + fail} checks pass${fail ? `, ${fail} fail` : ''}${skip ? `, ${skip} skipped` : ''}  (${LC.version})`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
