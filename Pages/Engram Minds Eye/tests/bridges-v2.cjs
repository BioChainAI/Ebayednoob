// The biochain, version 2, and the checked import (overhaul E3), against Owl Academy's own code and RFC 07's vectors.
//
//   node "Pages/Engram Minds Eye/tests/bridges-v2.cjs"
//
// Targets: reference/golden/bridges_v2.json (make_bridges_v2.cjs: Owl's strict verdicts, self-consistency and labels on
// fixed inputs), the contract vectors vendored in reference/golden/vendor/shdccp2-contract (CC0, RFC 07:
// shdccp2_record, shdccp2_tamper, shdccp2_tamper_open, engram1_keys) and VENDOR.json (every copied file by SHA-256).
// Checks:
//   the pin       VENDOR.json's SHA-256s; biochain_v2.js's header (SPDX MIT, the copyright, the NOTICE line, the commit
//                 and the source's own last commit and SHA-256) and NOTICE's licence text; its exports (biochain_v1.js's
//                 names, qconj and chainFrames, the strict verifier); v1's functions give the same results in v2 (the
//                 engram grid built once on 10,000 seeded tokens, the codec on bridges_v1.json's records)
//   strict        verifyBiochainStrict (orbital_core.js's SHA-256) gives Owl's verdicts of bridges_v2.json, word for
//                 word, on bridges_v1.json's biochains, the differential set (each row named by its tamper) and every
//                 tamper case, and the same with
//                 Owl's own sha256HexSync; every shdccp2_tamper case fails at its expected check and every honest one
//                 passes; shdccp2_tamper_open as RFC 07 has it (draft); every shdccp2_record record, grown here from
//                 biochain_v2.js's functions, equals the vector and passes, and the two input errors are refused
//   engram keys   both implementations (Owl's and this system's) give every engram1_keys key
//   import        importBiochainChecked keeps importBiochain's fields with their meaning (deep equal on every record
//                 importBiochain can read), adds the strict verdict, the label and the verdict line (a kernel-packet
//                 record: "Owl-compatible ok; strict failed at crystal"), computes each engram key once per distinct
//                 token for each implementation and still compares the two (a planted disagreement is caught), runs
//                 in steps, and returns on a frame length written with a minus sign
//   packages      exportBiochainPackage writes biochain-package/1 (the shdccp/2 fields only, GROWN/1 rebuilt, the
//                 kind checked) and refuses a record that fails the strict check, an unknown kind, a contentHash that is
//                 not the content's and content that is not the record's; checkSigner (Web Crypto) accepts the
//                 fingerprint and an ATTEST/1 signature and rejects an altered keyId, signature or signed field; the
//                 checked import reads the package back with its provenance; a Hyperbolic Lexicon package reads as
//                 LPREP/1, its string (built by lexicon_core.js lprepFields, Tier S and Tier P) bound to the record by
//                 its merkleRoot, its chainId (Tier S) or its salted root with the package's salt (Tier P), and another
//                 record's string, a wrong salt or a malformed string are not; a Tier-P string is not passed on
//   unchanged     the texts of verifyBiochain, importBiochain, importAny and detectImport are those of main (D4)
// Exit code 1 if any check fails.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SYS = path.join(__dirname, '..');
const EC = require(path.join(SYS, 'engram_core.js'));
const BC = require(path.join(SYS, 'biochain_v1.js'));
const BC2 = require(path.join(SYS, 'biochain_v2.js'));
const O = require(path.join(SYS, '..', '..', 'scripts', 'geometric-build', 'orbital_core.js'));
const LC = require(path.join(SYS, '..', 'Hyperbolic Lexicon', 'lexicon_core.js'));      // the LPREP/1 strings' author (an oracle)
const X = require(path.join(SYS, 'reference', 'golden', 'owl_extract.cjs'));
const G = path.join(SYS, 'reference', 'golden'), VD = path.join(G, 'vendor', 'shdccp2-contract');
const fx2 = JSON.parse(fs.readFileSync(path.join(G, 'bridges_v2.json'), 'utf8'));
const fx1 = JSON.parse(fs.readFileSync(path.join(G, 'bridges_v1.json'), 'utf8'));
const suite = n => JSON.parse(fs.readFileSync(path.join(VD, 'suites', `${n}.json`), 'utf8'));
const nodeSha = b => crypto.createHash('sha256').update(typeof b === 'string' ? Buffer.from(b, 'utf8') : b).digest('hex');
const osha = s => O.toHex(O.sha256(O.utf8(String(s))));                // orbital_core.js: what Engram hashes with
const j = x => JSON.stringify(x);
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`); };
const brief = v => ({ ok: v.ok, failed: v.failed, legacy: v.legacy, ...(v.checks && !v.ok && v.checks[v.checks.length - 1].fields ? { fields: v.checks[v.checks.length - 1].fields } : {}) });
const owlBrief = r => ({ ok: r.ok, failed: r.failed, legacy: r.legacy, ...(r.fields ? { fields: r.fields } : {}) });

(async () => {
// ---------------------------------------------------------------- the pin
{
    const V = JSON.parse(fs.readFileSync(path.join(SYS, 'VENDOR.json'), 'utf8'));
    const bad = V.files.filter(f => !fs.existsSync(path.join(SYS, f.path)) || nodeSha(fs.readFileSync(path.join(SYS, f.path))) !== f.sha256);
    const here = fs.readdirSync(VD, { recursive: true }).filter(p => fs.statSync(path.join(VD, p)).isFile()).map(p => 'reference/golden/vendor/shdccp2-contract/' + p.split(path.sep).join('/'));
    const unlisted = here.filter(p => !V.files.some(f => f.path === p));
    check('VENDOR.json: every file it lists has its SHA-256, and every vendored file is listed', !bad.length && !unlisted.length && V.files.length === 7,
        bad.length || unlisted.length ? `differ: ${bad.map(f => f.path).join(', ')}; unlisted: ${unlisted.join(', ')}` : `${V.files.length} files, Owl-Academy ${V.owl.commit.slice(0, 7)}`);
    const js = fs.readFileSync(path.join(SYS, 'biochain_v2.js'), 'utf8'), head = js.split('\n').slice(0, 5).join('\n'), core = V.files[0].from;
    check('biochain_v2.js: SPDX MIT, the source\'s copyright, a NOTICE line, the pinned commit, the source\'s own last commit and SHA-256',
        js.startsWith('// SPDX-License-Identifier: MIT\n// Copyright (c) 2026 Ebayednoob\n// NOTICE: copied from Owl-Academy') && head.includes(V.owl.commit) && head.includes(core.commit) && head.includes(core.sha256) &&
        BC2.source.commit === V.owl.commit && BC2.source.sha256 === core.sha256 && BC2.source.fileCommit === core.commit && fx2.source.files['scripts/biomesh-core.js'].sha256 === core.sha256);
    const notice = fs.readFileSync(path.join(SYS, 'NOTICE'), 'utf8');
    check('NOTICE: the MIT licence text and copyright of Owl-Academy, naming biochain_v2.js; the vectors\' licence is CC0', notice.includes('Permission is hereby granted, free of charge') &&
        notice.includes('Copyright (c) 2026 Ebayednoob') && notice.includes('biochain_v2.js') && /CC0 1\.0 Universal/.test(fs.readFileSync(path.join(VD, 'LICENSE'), 'utf8')));
    const v1names = Object.keys(BC).filter(k => k !== 'source'), v2 = Object.keys(BC2);
    const want = [...v1names, 'qconj', 'chainFrames', 'crystallize', 'engramHex', 'mulberry32', 'parseBiochainStreamStrict', 'sha256HexSync', 'leafHashSync', 'merkleRootSync',
        'chainWeaves', 'STRICT_CHECKS', 'verifyIntegrityStrict', 'failedCheck', 'strictLabel', 'grownCommitment', 'KINDS', 'validateKind'];
    check('biochain_v2.js exports every biochain_v1.js name, qconj and chainFrames (F77), and the strict verifier', want.every(n => v2.includes(n)) && BC2.crystallizeBytes === BC2.crystallize,
        want.filter(n => !v2.includes(n)).join(', ') || `${v2.length} names`);
    check('bridges_v2.json: the strict checks and kinds are the core\'s', j(fx2.strict_checks) === j(BC2.STRICT_CHECKS) && j(fx2.kinds) === j(Object.keys(BC2.KINDS)), fx2.strict_checks.join(', '));
    // v1's functions in v2: the engram grid built once (F15) on the generator's 10,000 seeded tokens, and the codec
    const src = fs.readFileSync(path.join(G, 'make_bridges_v2.cjs'), 'utf8');
    const seededTokens = X.sandbox().compile([], X.grab(src, 'seededTokens') + '\nreturn { seededTokens };')().seededTokens;
    const toks = seededTokens(), k2 = toks.map(t => BC2.engramGridHex(BC2.engramGrid(t))), k1 = toks.map(t => BC.engramGridHex(BC.engramGrid(t)));
    check('the engram grid built once per letter gives biochain_v1.js\'s keys on 10,000 seeded tokens, and bridges_v2.json\'s', k2.every((k, i) => k === k1[i]) && nodeSha(k2.join('\n')) === fx2.engram_grid.keys_sha256 && fx2.engram_grid.same_as_v1,
        `${toks.length} tokens, ${new Set(toks).size} distinct`);
    let same = true;
    for (const b of fx1.biochains.list.slice(0, 3)) {
        const r = b.record, f1 = BC.parseBiochainStream(r.stream), f2 = BC2.parseBiochainStream(r.stream);
        same = same && j(f1) === j(f2) && j(BC.recreateChunks(r)) === j(BC2.recreateChunks(r)) && BC.recreateText(r) === BC2.recreateText(r) &&
            j(BC.engramStreamFromText(BC2.recreateText(r))) === j(BC2.engramStreamFromText(BC2.recreateText(r))) && f2.every(f => BC2.encodeChunk(BC2.decodeChunk(f.residual, f.chunkLen)) === f.residual);
    }
    check('the codec and engram layer of v2 give v1\'s results on bridges_v1.json\'s three grown records', same);
}
// ---------------------------------------------------------------- strict: Owl's verdicts, with orbital_core.js's SHA-256
{
    const rows = [];
    fx1.biochains.list.forEach((b, i) => rows.push([`bridges_v1 "${b.name}"`, b.record, fx2.bridges_v1[i]]));
    X.tamperSet(fx1.biochains.list[1].record).forEach((t, i) => rows.push([`differential "${t.label}"`, t.record, fx2.differential[i]]));
    for (const name of ['shdccp2_tamper', 'shdccp2_tamper_open']) suite(name).cases.forEach((c, i) => rows.push([`${name}/${c.id}`, c.input.record, fx2.tamper[name].cases[i]]));
    const bad = [], badOwnHash = [];
    for (const [label, rec, owl] of rows) {
        const v = EC.verifyBiochainStrict(BC2, rec);
        if (j(brief(v)) !== j(owlBrief(owl))) bad.push(`${label}: ${j(brief(v))} vs Owl ${j(owlBrief(owl))}`);
        if (j(brief(BC2.verifyIntegrityStrict(rec))) !== j(brief(v))) badOwnHash.push(label);
    }
    const tamperNames = X.tamperSet(fx1.biochains.list[1].record).map(t => t.label);
    check('bridges_v2.json\'s differential rows name their tamper, in owl_extract.cjs tamperSet\'s order', j(fx2.differential.map(d => d.tamper)) === j(tamperNames),
        `${tamperNames.length} rows: ${tamperNames.slice(0, 2).join(', ')}, …`);
    check('verifyBiochainStrict gives Owl\'s strict verdict, failing check and fields on every input of bridges_v2.json', !bad.length, bad.slice(0, 3).join('; ') || `${rows.length} inputs`);
    check('... and the same with Owl\'s own SHA-256 (sha256HexSync) as with orbital_core.js\'s', !badOwnHash.length, badOwnHash.slice(0, 3).join('; ') || `${rows.length} inputs`);
    check('Owl\'s labels in bridges_v2.json: the honest biochains "strict ok", the two altered ones "failed at derived" and "failed at canonical"',
        j(fx2.bridges_v1.map(b => b.label)) === j(['strict ok', 'strict ok', 'strict ok', 'failed at derived', 'failed at canonical']));
}
{
    const S = suite('shdccp2_tamper'), O2 = suite('shdccp2_tamper_open');
    const verdictOf = rec => EC.verifyBiochainStrict(BC2, rec);
    const meets = (c, v) => Object.keys(c.expect).every(k => j(c.expect[k]) === j(v[k]));
    const badT = S.cases.filter(c => !meets(c, verdictOf(c.input.record)));
    const honest = S.cases.filter(c => c.expect.ok), byCheck = {};
    for (const c of S.cases.filter(x => !x.expect.ok)) byCheck[c.expect.failed] = (byCheck[c.expect.failed] || 0) + 1;
    check(`shdccp2_tamper (${S.status}): every case at its expected check; the ${honest.length} honest records pass`, !badT.length,
        badT.map(c => c.id).join(', ') || Object.entries(byCheck).map(([k, n]) => `${k} ${n}`).join(', '));
    const badO = O2.cases.filter(c => !meets(c, verdictOf(c.input.record)));
    check(`shdccp2_tamper_open (${O2.status}): RFC 07's expected check on every case (hex case at parity, ill-formed UTF-8 at canonical)`, !badO.length, badO.map(c => c.id).join(', ') || `${O2.cases.length} cases`);
}
// ---------------------------------------------------------------- shdccp2_record: grown here from biochain_v2.js's functions
{
    function grow(text, { engrams = true } = {}) {     // RFC 07 sections 3-10, from the v2 functions; SHA-256 by orbital_core.js
        const data = [...new TextEncoder().encode(text)];
        if (!data.length) throw new Error('empty-input');
        if (data.length > BC2.MAX_GROW_BYTES) throw new Error('input-too-large');
        const chunks = [];
        for (let i = 0; i < data.length; i += BC2.CHUNK) chunks.push(data.slice(i, i + BC2.CHUNK));
        const leafHashes = chunks.map((c, i) => BC2.leafHashSync(i, c, osha)), merkleRoot = BC2.merkleRootSync(leafHashes, osha), w = BC2.chainWeaves(chunks);
        const stream = BC2.frameStream(chunks.map(BC2.crystallize), chunks.map(BC2.encodeChunk)), eng = engrams ? BC2.engramStreamFromText(text) : null;
        const ship = stream.length / 2 + (eng ? eng.stream.length / 2 : 0) + leafHashes.length * 32 + 40;
        return { chainId: 'BC-' + osha(merkleRoot + '|' + w.weaveChiral).slice(0, 24), stream, streamVersion: BC2.STREAM_VERSION, leafHashes, merkleRoot,
            weaveChiral: w.weaveChiral, weaveMirror: w.weaveMirror, segCuts: Array.from({ length: BC2.SEGMENTS + 1 }, (_, i) => Math.round(i * chunks.length / BC2.SEGMENTS)),
            segments: BC2.SEGMENTS, ...(eng ? { engramStream: eng.stream, engramCount: eng.count, engramMeanJ: eng.meanJ } : {}),
            origBytes: data.length, shippedBytes: Math.round(ship), value: +(data.length / ship).toFixed(4) };
    }
    const textOf = i => (typeof i.text === 'string' ? i.text : i.text_parts.map(p => (typeof p === 'string' ? p : p.repeat.repeat(Math.ceil(p.length / p.repeat.length)).slice(0, p.length))).join(''));
    const asVector = (rec, e) => Object.entries(e).every(([k, v]) => { const m = /^(.*)_(sha256|length)$/.exec(k); return m && !(k in rec) ? (m[2] === 'sha256' ? nodeSha(rec[m[1]]) : rec[m[1]].length) === v : j(rec[k]) === j(v); }) &&
        Object.keys(rec).every(k => Object.keys(e).some(x => x === k || x === `${k}_sha256`));
    const S = suite('shdccp2_record'), bad = [];
    let records = 0, x80 = 0;
    for (const c of S.cases) {
        let rec = null, err = null;
        try { rec = grow(textOf(c.input), { engrams: c.input.engrams !== false }); } catch (e) { err = e.message; }
        if (c.expect.error) { if (err !== c.expect.error) bad.push(`${c.id}: ${err}`); continue; }
        records++;
        if (!rec || !asVector(rec, c.expect)) { bad.push(`${c.id}: not the vector`); continue; }
        const v = EC.verifyBiochainStrict(BC2, rec);
        if (!v.ok) bad.push(`${c.id}: strict ${v.failed}`);
        const fx = fx2.records.find(r => r.id === c.id);
        if (!fx || fx.chainId !== rec.chainId || !fx.as_vector) bad.push(`${c.id}: not Owl's`);
        if (BC2.parseBiochainStream(rec.stream).some(f => ((f.quat32 >>> 24) & 255) === 0x80 || ((f.quat32 >>> 16) & 255) === 0x80 || ((f.quat32 >>> 8) & 255) === 0x80 || (f.quat32 & 255) === 0x80)) x80++;
    }
    check(`shdccp2_record (${S.status}): every record grown here equals the vector and Owl's, and passes strict; the two input errors are refused`, !bad.length,
        bad.slice(0, 3).join('; ') || `${records} records (${x80} with a 0x80 crystal byte, written raw), ${S.cases.length - records} errors`);
}
// ---------------------------------------------------------------- engram1_keys: both implementations
{
    const S = suite('engram1_keys');
    const owl = S.cases.filter(c => BC2.engramHex(c.input.key_text) !== c.expect.key_hex), mine = S.cases.filter(c => EC.hexLsb(EC.crystallize(c.input.key_text)).toUpperCase() !== c.expect.key_hex);
    check('engram1_keys: Owl\'s engramHex and this system\'s crystallize give every key (GEODESIC 5C896A4801C9C24C, ß as SS, non-A-Z skipped)', !owl.length && !mine.length && fx2.engram1_keys.every(k => k.as_vector),
        owl.length || mine.length ? `Owl: ${owl.map(c => c.id).join(', ')}; Engram: ${mine.map(c => c.id).join(', ')}` : `${S.cases.length} keys`);
}
// ---------------------------------------------------------------- the checked import
{
    const FIELDS = ['kind', 'label', 'checks', 'verified', 'turns', 'text'], pick = r => j(Object.fromEntries(FIELDS.filter(k => k in r).map(k => [k, r[k]])));
    // importBiochain's own records: bridges_v1.json's, the differential set, and the tamper suites' records that its
    // frame parser can read (a length written with a minus sign makes biochain_v1.js's lenient parser go back to the
    // frame's start, without end: those are left out of the comparison and checked below)
    const recs = [...fx1.biochains.list.map(b => [b.name, b.record]), ...X.tamperSet(fx1.biochains.list[1].record).map(t => [t.label, t.record]),
        ...['shdccp2_tamper', 'shdccp2_tamper_open'].flatMap(n => suite(n).cases.map(c => [`${n}/${c.id}`, c.input.record]))]
        .filter(([, r]) => r && typeof r === 'object' && !Array.isArray(r) && (typeof r.stream === 'string' || Array.isArray(r.streams)) && !(typeof r.stream === 'string' && r.stream.includes('-')));
    const differ = [], verdicts = [];
    for (const [name, rec] of recs) {
        const a = EC.importBiochain(BC, rec), c = EC.importBiochainChecked(BC2, rec);
        if (pick(a) !== pick(c) || c.owlCompatible !== a.verified) differ.push(name);
        verdicts.push(c.verdict);
    }
    check('importBiochainChecked keeps importBiochain\'s fields (kind, label, checks, verified, turns, text) with their meaning; owlCompatible = verified', !differ.length,
        differ.slice(0, 4).join('; ') || `${recs.length} records`);
    const labels = [];
    for (const name of ['shdccp2_tamper', 'shdccp2_tamper_open']) suite(name).cases.forEach((c, i) => {
        if (!EC.biochainInputOf(c.input.record)) return;
        const r = EC.importBiochainChecked(BC2, c.input.record), owl = fx2.tamper[name].cases[i];
        if (r.strict.label !== owl.label || r.checks[0].ok !== owl.self_consistent) labels.push(`${c.id}: ${r.strict.label} vs Owl ${owl.label}`);
    });
    check('the checked import\'s strict label, and its first check (Owl\'s verifyIntegrity steps), are Owl\'s (bridges_v2.json) on every tamper vector that is a record, a frame length with a minus sign included', !labels.length, labels.slice(0, 3).join('; ') ||
        `${suite('shdccp2_tamper').cases.length + suite('shdccp2_tamper_open').cases.length} vectors`);
    const k = suite('shdccp2_tamper').cases.find(c => c.id === 'kernel_normalized_0x80'), kr = EC.importBiochainChecked(BC2, k.input.record);
    check('a kernel-packet record (0x80 written as 0x81): "Owl-compatible ok; strict failed at crystal", label "self-consistent only, failed at crystal"',
        kr.verdict === 'Owl-compatible ok; strict failed at crystal' && kr.strict.label === 'self-consistent only, failed at crystal' && kr.verified === true, kr.strict.detail);
    const longer = fx1.biochains.list[1].record, honest = EC.importBiochainChecked(BC2, longer), leg = EC.importBiochainChecked(BC2, X.tamperSet(longer).find(t => t.label === 'legacy streams and chunkLens').record);
    check('an honest record: "Owl-compatible ok; strict ok"; a legacy one: strict label "legacy", Owl-compatible ok', honest.verdict === 'Owl-compatible ok; strict ok' && honest.strict.label === 'strict ok' &&
        leg.strict.legacy && leg.strict.label === 'legacy' && leg.verdict === 'Owl-compatible ok; strict: legacy', `${new Set(verdicts).size} distinct verdict lines`);
    const neg = suite('shdccp2_tamper').cases.find(c => c.id === 'length_negative'), t0 = Date.now(), nr = EC.importBiochainChecked(BC2, neg.input.record);
    check('a frame length written with a minus sign: the checked import returns ("failed at parity"; Owl-compatible: a decode failure)', nr.strict.failed === 'parity' && !nr.verified && Date.now() - t0 < 2000, nr.checks[0].detail);
    // each key once per distinct token, per implementation, and the two still compared
    let owlCalls = 0, mineCalls = 0;
    const counting = Object.assign({}, BC2, { engramGrid: t => { owlCalls++; return BC2.engramGrid(t); } });
    const memo = EC.engramMemo(counting), text = BC2.recreateText(longer), distinct = new Set(BC2.tokenizeEngrams(text)).size;
    const r1 = EC.importBiochainChecked(counting, longer, { memo }), calls1 = owlCalls;
    EC.importBiochainChecked(counting, longer, { memo });
    check('Owl\'s engram key is computed once per distinct token in an import (F76), and not again for the same text', calls1 === distinct && owlCalls === calls1 &&
        memo.sizes().owl === distinct && memo.sizes().mine === distinct && r1.engrams.agree && r1.engrams.distinct === distinct, `${r1.engrams.tokens} tokens, ${distinct} distinct; Owl's key computed ${calls1} times (the strict check computes its own)`);
    mineCalls = memo.sizes().mine;
    const planted = Object.assign({}, BC2, { engramGrid: t => { const g = BC2.engramGrid(t); return t === 'the' ? g.map((b, i) => (i === 0 ? 1 - b : b)) : g; } });
    const pr = EC.importBiochainChecked(planted, longer);
    check('both engram implementations are still compared: a planted change to Owl\'s key of one token is caught', pr.engrams.agree === false && pr.verified === false, `${mineCalls} keys of this system's`);
    const steps = [], g = EC.importBiochainCheckedSteps(BC2, longer, { every: 100 });
    let r;
    for (r = g.next(); !r.done; r = g.next()) steps.push(r.value.step);
    check('the import runs in steps (a page draws between them): strict, the engram layers in chunks, Owl\'s steps', steps[0] === 'strict' && steps.filter(s => s === 'engrams').length >= 5 && steps[steps.length - 1] === 'owl' && j(r.value.strict) === j(honest.strict),
        steps.join(' ').replace(/(engrams )+/g, m => `engrams x${m.split(' ').length - 1} `));
    const kinded = EC.importBiochainChecked(BC2, { ...longer, kind: 'language-shard' }), unknown = EC.importBiochainChecked(BC2, { ...longer, kind: 'no-such-kind' });
    check('the record\'s kind: kept when Owl\'s registry has it, null (with what was given) otherwise; importBiochain\'s kind stays "biochain"',
        kinded.recordKind === 'language-shard' && unknown.recordKind === null && unknown.recordKindGiven === 'no-such-kind' && kinded.kind === 'biochain' && kinded.strict.ok);
}
// ---------------------------------------------------------------- packages and the signer
{
    const subtle = globalThis.crypto.subtle, hex = b => Buffer.from(new Uint8Array(b)).toString('hex');
    const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']), jwk = await subtle.exportKey('jwk', kp.publicKey);
    const keyId = 'K-' + nodeSha(`${jwk.x}|${jwk.y}`).slice(0, 24), publicJwk = { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y };
    const sign = async (content, extra = {}) => {
        const a = { keyId, keyVector: 'a1b2c3d4e5f60718', contentHash: nodeSha(content), epochToken: 'EPOCH.123456', ...extra };
        a.sig = hex(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, Buffer.from(['ATTEST/1', a.keyId, a.keyVector, a.contentHash, a.epochToken].join('|'))));
        return { ...a, publicJwk };
    };
    const rec = { ...fx1.biochains.list[1].record, owner: 'uid-1', kind: 'text', crystCost: 3 };
    const grown = BC2.grownCommitment(rec), att = await sign(grown);
    const out = EC.exportBiochainPackage(rec, att, { BC2 }), P = out.package;
    check('exportBiochainPackage: biochain-package/1 with the shdccp/2 fields only, the kind, GROWN/1 rebuilt from the record, the attestation tagged attestation/1',
        P.format === 'biochain-package/1' && P.kind === 'text' && j(Object.keys(P.record)) === j(EC.PACKAGE_RECORD_FIELDS) && P.attests === 'GROWN/1' && P.content === grown &&
        P.attestation.format === 'attestation/1' && out.name === `biochain-package_${rec.chainId}.json`, grown.slice(0, 40) + '…');
    const back = EC.importBiochainChecked(BC2, out.text), pr = back.provenance;
    check('the checked import reads it back: strict ok, the kind, the provenance (GROWN/1 content of this record, its hash, the signer)', back.strict.ok && back.verified && back.recordKind === 'text' &&
        pr.from === 'biochain-package/1' && pr.attests === 'GROWN/1' && pr.contentMatches === true && pr.contentHashOk === true && pr.signer === keyId && pr.attestationFormat === 'attestation/1' && back.attestation.sig === att.sig);
    const s1 = await EC.checkSigner(P);
    check('checkSigner: the fingerprint of the embedded key is the keyId, and the ATTEST/1 signature verifies (Web Crypto)', s1.ok === true && s1.signer.id === keyId && s1.checks.every(c => c.ok === true), s1.checks.map(c => c.label).join('; '));
    const alter = f => { const q = JSON.parse(out.text); f(q.attestation); return q; };
    const sKey = await EC.checkSigner(alter(a => { a.keyId = 'K-' + '0'.repeat(24); })), sSig = await EC.checkSigner(alter(a => { a.sig = (a.sig[0] === '0' ? '1' : '0') + a.sig.slice(1); })),
        sEpoch = await EC.checkSigner(alter(a => { a.epochToken = 'EPOCH.123457'; })), sNone = await EC.checkSigner(alter(a => { delete a.publicJwk; }));
    const seal = { attestation: { sealId: 'S-' + nodeSha(`${jwk.x}|${jwk.y}`).slice(0, 24), sealVector: 'x', contentHash: att.contentHash, tickToken: 't', sig: att.sig, publicJwk } };
    const sSeal = await EC.checkSigner(seal);
    check('checkSigner rejects an altered keyId, signature or signed field; with no embedded key, or a SEAL/1, it decides nothing (null)', sKey.ok === false && sSig.ok === false && sEpoch.ok === false &&
        sNone.ok === null && sSeal.ok === null && sSeal.checks[0].ok === true, `${sKey.checks[0].detail}; seal fingerprint ${sSeal.checks[0].ok}`);
    const refused = [];
    const tryExport = (label, f) => { try { f(); } catch (e) { refused.push(label); } };
    tryExport('strict', () => EC.exportBiochainPackage(fx1.biochains.list[3].record, att, { BC2, kind: 'text' }));
    tryExport('kind', () => EC.exportBiochainPackage(rec, att, { BC2, kind: 'no-such-kind' }));
    tryExport('contentHash', () => EC.exportBiochainPackage(rec, { ...att, contentHash: '0'.repeat(64) }, { BC2 }));
    tryExport('content', () => EC.exportBiochainPackage(rec, att, { BC2, content: grown + 'x' }));
    tryExport('no attestation', () => EC.exportBiochainPackage(rec, null, { BC2 }));
    // LPREP/1 strings as the Hyperbolic Lexicon writes them (lexicon_core.js lprepFields), for this record and another
    const lrec = fx1.biochains.list[1].record, other = fx1.biochains.list[0].record;
    const lpOf = (r, tier, salt = null) => LC.lprepFields({ record: r, text: BC2.recreateText(r), corpusId: 'lexicon-synth-v1', shardIndex: 0, spdx: 'CC0-1.0', sourceSha: 'a'.repeat(64),
        lvocabHash: 'b'.repeat(64), laddrHash: 'c'.repeat(64), idSha: 'd'.repeat(64), weaveSha: 'e'.repeat(64), tier, salt }).join('|');
    const salt = LC.testSalt(0), lprepS = lpOf(lrec, 'S'), lprepP = lpOf(lrec, 'P', salt), otherS = lpOf(other, 'S'), otherP = lpOf(other, 'P', salt);
    const swap = (str, k, v) => { const f = str.split('|'); f[k] = v; return f.join('|'); };
    tryExport('LPREP/1 of another chain', () => EC.exportBiochainPackage(rec, att, { BC2, attests: 'LPREP/1', content: 'LPREP/1|c|0|BC-000000000000000000000000|x|x|x|x|x|x|x|x|x|x|S' }));
    // (each with an attestation whose contentHash is its content's, so that only the string can be refused)
    const lpExport = c => () => EC.exportBiochainPackage(lrec, { ...att, contentHash: nodeSha(c) }, { BC2, kind: 'language-shard', attests: 'LPREP/1', content: c });
    tryExport('LPREP/1 of another record', lpExport(otherS));
    tryExport('LPREP/1 with this chainId and another merkleRoot', lpExport(swap(lprepS, 4, other.merkleRoot)));
    tryExport('Tier-P LPREP/1', lpExport(lprepP));
    let passS = null;
    try { passS = lpExport(lprepS)().package.content === lprepS; } catch (e) { passS = e.message; }
    check('exportBiochainPackage refuses a record that fails the strict check, an unknown kind, a contentHash that is not the content\'s, other content, no attestation, an LPREP/1 of another chain or another merkleRoot, a Tier-P LPREP/1',
        refused.length === 9 && passS === true, refused.join(', ') + (passS === true ? '' : `; this record's Tier-S string: ${passS}`));
    // the binding of an LPREP/1 string to the record (lprepBinding), both tiers
    const B = (c, r, sl) => EC.lprepBinding(c, r, sl).ok;
    check('lprepBinding: Tier S binds by chainId and merkleRoot; Tier P by merkleRoot and, with the salt, its salted root (the Lexicon\'s saltedRoot)',
        B(lprepS, lrec) === true && B(otherS, lrec) === false && B(swap(lprepS, 4, other.merkleRoot), lrec) === false && B(swap(lprepS, 3, other.chainId), lrec) === false &&
        B(lprepP, lrec, salt) === true && B(lprepP, lrec) === null && B(lprepP, lrec, LC.testSalt(1)) === false && B(lprepP, lrec, salt.toUpperCase()) === false &&
        B(otherP, lrec, salt) === false && B(otherP, lrec) === false && B(swap(lprepP, 15, LC.saltedRoot(salt, lrec.merkleRoot, other.chainId)), lrec, salt) === false &&
        lprepP.split('|')[15] === LC.saltedRoot(salt, lrec.merkleRoot, lrec.chainId),
        `${EC.lprepBinding(lprepP, lrec, salt).detail}`);
    check('lprepBinding: a string not of the registered shape is not bound (14 fields, Tier S with a salted root, Tier P with a chainId)',
        B(lprepS.split('|').slice(0, 14).join('|'), lrec) === false && B(lprepS + '|' + 'f'.repeat(64), lrec) === false && B(swap(lprepP, 3, lrec.chainId), lrec, salt) === false && B(swap(lprepS, 0, 'LPREP/2'), lrec) === false);
    // a Hyperbolic Lexicon package (lexicon_core.js makePackage: record, lprep, salt for Tier P, attestation, lcorpus,
    // inclusion, lgrow, consistency)
    const lexPkg = async (lp, extra = {}) => ({ record: lrec, lprep: lp, ...extra, attestation: await sign(lp), lcorpus: 'LCORPUS/1|lexicon-synth-v1|1|' + 'c'.repeat(64) + '|x|-|-|-|-', inclusion: [], lgrow: 'LGROW/1', consistency: [] });
    const lprep = lprepS, lpkg = await lexPkg(lprepS);
    const li = EC.importBiochainChecked(BC2, lpkg), lp = li.provenance;
    check('a Hyperbolic Lexicon package: provenance LPREP/1 (Tier S) naming this chainId and merkleRoot, its hash, the signer, a corpus manifest; strict ok', li.strict.ok && lp.from === 'lexicon-package' && lp.attests === 'LPREP/1' &&
        lp.contentMatches === true && lp.tier === 'S' && lp.contentHashOk === true && lp.signer === keyId && lp.manifest === true, lp.contentDetail);
    const pP = EC.importBiochainChecked(BC2, await lexPkg(lprepP, { salt })).provenance, pNoSalt = EC.importBiochainChecked(BC2, await lexPkg(lprepP)).provenance,
        pBadSalt = EC.importBiochainChecked(BC2, await lexPkg(lprepP, { salt: LC.testSalt(1) })).provenance, pOther = EC.importBiochainChecked(BC2, await lexPkg(otherP, { salt })).provenance,
        pOtherS = EC.importBiochainChecked(BC2, await lexPkg(otherS)).provenance;
    check('... in Tier P: this record\'s with the package\'s salt; unchecked (null) without it; not this record\'s with another salt, or naming another record (either tier), its hash still the attestation\'s',
        pP.contentMatches === true && pP.tier === 'P' && pNoSalt.contentMatches === null && pBadSalt.contentMatches === false && pOther.contentMatches === false && pOtherS.contentMatches === false &&
        pOther.contentHashOk === true, `${pNoSalt.contentDetail}; ${pOther.contentDetail}`);
    const lout = EC.exportBiochainPackage(lpkg.record, lpkg.attestation, { BC2, kind: 'language-shard', attests: 'LPREP/1', content: lprep,
        manifest: { lcorpus: lpkg.lcorpus, inclusion: lpkg.inclusion, lgrow: lpkg.lgrow, consistency: lpkg.consistency } });
    const lback = EC.importBiochainChecked(BC2, lout.text), ls = await EC.checkSigner(lout.package);
    check('... exported for Owl Academy as biochain-package/1 (language-shard, LPREP/1, its manifest), read back with the same provenance and signer', lback.provenance.attests === 'LPREP/1' &&
        lback.provenance.contentMatches === true && lback.provenance.manifest === true && lback.recordKind === 'language-shard' && ls.ok === true);
}
// ---------------------------------------------------------------- unchanged (D4: engram_core.js additive only)
{
    const src = fs.readFileSync(path.join(SYS, 'engram_core.js'), 'utf8');
    const PINNED = { verifyBiochain: '7098cee8cc3e1a2d8a7b60d8a967a54ea316d779e4266556dde7da2a937e39e6', importBiochain: '377e3fc8bb1a90f9cf3356ccaeeb3c96bc2a18b7c1ee98dd33ee779b146687a1',
        importAny: 'c5a4158c107c9738baf05fb81309ccf049df62623d9dfd45304a67030d842252', detectImport: '407cf55d76e5f45d33a1e7757836e99d7c0cae5cbd41c1b2f7ed55557cbdd2ad' };
    const changed = Object.entries(PINNED).filter(([n, h]) => X.sha256(X.grab(src, n)) !== h).map(([n]) => n);
    check('verifyBiochain, importBiochain, importAny and detectImport are unchanged (their text\'s SHA-256 as on main before E3)', !changed.length, changed.join(', '));
}
console.log(`\n${pass}/${pass + fail} checks pass${fail ? `, ${fail} fail` : ''}  (${EC.version}; biochain_v2.js from Owl-Academy ${BC2.source.commit.slice(0, 7)})`);
process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
