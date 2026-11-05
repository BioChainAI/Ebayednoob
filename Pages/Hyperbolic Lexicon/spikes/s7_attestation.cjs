// Hyperbolic Lexicon, Phase 0, spike S7: BioChain-AI's ATTEST/1 attestation of an LPREP/1-style commitment, signed
// with ECDSA P-256 in Node WebCrypto and verified in Node and in Python `cryptography`, across the P1363 / DER boundary.
//
// WHAT IT MEASURES. BioChain-AI's attestation code is run as written, by name-grab (the pattern of
// Pages/Engram Minds Eye/reference/golden/make_bridges_v1.cjs): src/identity/crypto-core.js (sha256Hex,
// generateKeypair, signPayload, verifyPayload, keyIdFromPublic, deriveKeyVector, attestationPayload),
// src/identity/signing-key.js (signWithKey, verifyAttestation, verifyAttestationAgainstContent, with an in-memory
// map standing in for Firestore's getDocument), src/biomesh/biomesh.js (grownCommitment, verifyGrown) and
// src/identity/identity-registry.js (computeIdentityId). Then:
//   1. the ATTEST/1 format, confirmed from the code: payload 'ATTEST/1|keyId|keyVector|contentHash|epochToken' with
//      contentHash = sha256Hex(commitment string) (signWithKey; verifyGrown recomputes it from grownCommitment), keyId =
//      'K-' + sha256Hex(`${x}|${y}`).slice(0, 24) over the public JWK's base64url x and y, keyVector =
//      deriveKeyVector(identityId, params, epochToken).vector64 (independent of the key); identityId and keyVector
//      recomputed a second way here (node:crypto + BigInt) and a third in Python;
//   2. a synthetic shard (HPCore.Rng(97000)) and an LPREP/1-style commitment: the 15 fields of the design's LPREP/1
//      row, pipe-joined like GROWN/1; byteLen and rawSha256 are the shard's, the other hashes are labelled placeholders
//      (SHA-256 of 'S7 placeholder <name>') because the real values come from Phase 1 code; contentHash three ways
//      (WebCrypto, node:crypto, orbital_core);
//   3. a P-256 key from BioChain's generateKeypair (WebCrypto), keyId, the payload, signPayload / verifyPayload, the
//      same signature in node:crypto (OpenSSL) with dsaEncoding 'ieee-p1363' and with its default 'der'; signWithKey
//      / verifyAttestation / verifyAttestationAgainstContent / verifyGrown as written on the commitment and on a
//      GROWN/1 record; BioChain's reasons for altered blocks, a revoked or retired key (the L10 T4 class) and a valid
//      attestation of a different shard (T5);
//   4. tampering, every position once (rule: digits cycle 0-9, hex letters a-f / A-F, other letters g-z / G-Z,
//      anything else has bit 0 flipped; never the identity): the 137-character payload by field, the commitment by
//      field (its contentHash changes and the signature over the rebuilt payload fails), the signature's 128 hex
//      characters; the high-S twin (r, n - s);
//   5. s7_attestation.py, started as python3 -B -I with one JSON request on stdin (no file is written): it verifies
//      Node's signatures after P1363 -> DER (encode_dss_signature), shows that the raw P1363 bytes given as DER are
//      rejected (L10's encoding control), repeats item 4, and returns its own key's signatures (DER -> P1363, r and s
//      left-padded) plus a short-r and a short-s signature in a padded and an unpadded conversion;
//   6. Node verifies Python's: 200 converted signatures, the DER bytes given as they are (the reverse control), the
//      unpadded conversions, a Python-made block through BioChain's verifyAttestation, and a deterministic golden
//      attestation (RFC 6979 A.2.5's public test key, deterministic ECDSA in Python) that reproduces on every run;
//   7. "~" timings, median of 200 after 20 warm-up runs: sign and verify in WebCrypto (key imported once, and as
//      signPayload / verifyPayload do it, importing the JWK on every call), node:crypto's synchronous verify, the whole
//      attestation step (verifyAttestationAgainstContent as written), and Python's.
//
// HOW TO RUN, from the repository root (it runs s7_attestation.py itself):
//   node "Pages/Hyperbolic Lexicon/spikes/s7_attestation.cjs" [--biochain <BioChain-AI checkout>] \
//       > "Pages/Hyperbolic Lexicon/spikes/s7_attestation_output.txt"
// The BioChain-AI checkout defaults to ../../../../BioChain-AI from this folder and is only read. Needs Node 20+
// (globalThis.crypto.subtle) and python3 with cryptography (50.0.1 here) and numpy (hpstep's Rng). Lines that begin
// with "~ " depend on the machine, the runtime or the random keys; tests/spikes.cjs ignores them. Every other line
// must be identical on a rerun.
//
// WHAT IT SETTLES. L10's encoding control (WebCrypto signs in IEEE P1363 r||s; Python must convert to DER, and
// without the conversion every valid signature is rejected; the reverse direction must left-pad r and s) and L11's
// attestation cost term (one ECDSA verify per shard, with or without the JWK import). It decides no claim. It runs
// before PREREGISTRATION.md is written; no number here is a finding of a registered test.
//
// DATA AND SEEDS. Disjoint from the registered instances (C0 noun glosses; seeds 1000+i, 2000+i, 4000+i, 9000-9023):
// one synthetic shard of at most 60,000 UTF-8 bytes from HPCore.Rng(97000) (= 90000 + 7000) and a second from
// Rng(97001) for the T5-style check; s7_attestation.py regenerates the first with hpstep.prng.Rng(97000). No WordNet
// data is read; Math.random is never called. The ECDSA keys and nonces come from WebCrypto's and OpenSSL's random
// generators (keys are random by nature): every value that depends on them is on a "~" line. The golden vector uses
// the published RFC 6979 test key and deterministic signing, so it is the same on every run.
// epochToken is the fixed 'EPOCH-OFFLINE-SPIKE' (BioChain's epoch-service writes 'EPOCH.<3-hour window id>'; the
// payload signs the token as a plain string either way); identityId comes from BioChain's computeIdentityId on the
// spike's own seed string and uid.
//
// READINGS CHOSEN WHERE THE TASK IS OPEN.
//   - "Sign the commitment's ATTEST/1 payload (SHA-256)": ECDSA P-256 with SHA-256 over the UTF-8 payload, as
//     crypto-core.js's SIGN = { name: 'ECDSA', hash: 'SHA-256' } does; the commitment enters only through its SHA-256.
//   - "One changed character in each field": every position of every field, once each, so each field is covered at
//     every offset; the separators are a group of their own.
//   - The 200 timed signatures of each language are the ones sent to the other language to verify.
//
// RUNTIME. About 1 s (the Python half about 0.4 s).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const nodeCrypto = require('crypto');
const { spawn } = require('child_process');
const HP = require('../../Hyperbolic Oracles/hyperbolic_core.js');
const O = require('../../../scripts/geometric-build/orbital_core.js');

const T_START = process.hrtime.bigint();
const ARGS = process.argv.slice(2);
const argVal = (k, d) => { const i = ARGS.indexOf(k); return i >= 0 && ARGS[i + 1] ? ARGS[i + 1] : d; };
const BIOCHAIN = path.resolve(argVal('--biochain', path.join(__dirname, '..', '..', '..', '..', 'BioChain-AI')));
const PY_SCRIPT = path.join(__dirname, 's7_attestation.py');

const SEED_TEXT = 97000, SEED_OTHER = 97001, SHARD_LIMIT = 60000;
const EPOCH_TOKEN = 'EPOCH-OFFLINE-SPIKE';
const IDENTITY_SEED = 'hyperbolic-lexicon spike S7 identity seed', UID = 'spike-s7-uid';
const N_TIMED = 200, N_WARM = 20, SHORT_CAP = 20000;
const P256_N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551n;
const RFC_UX = '60fed4ba255a9d31c961eb74c6356d68c049b8923b61fa6ce669622e60f29fb6';
const RFC_UY = '7903fe1008b8bc99a41ae9e95628bc64f2f1b20c2d7e9f5177a3c294d4462299';
const RFC_R = 'efd48b2aacb6a8fd1140dd9cd45e81d69d2c877b56aaf991c34d0ea84eaf3716';
const RFC_S = 'f7cb1c942d657c41d436c7a1b6e29f65f3e900dbb9aff4064dc4ab2f843acda8';

const say = s => process.stdout.write(s + '\n');
const CHECKS = [];
const ck = (name, ok) => { CHECKS.push([name, !!ok]); return ok ? 'true' : 'false'; };
const mk = (name, ok) => { CHECKS.push([name, !!ok]); return ok ? '' : ' FAILED'; };   // a check whose line already states the verdict
const sha256 = s => nodeCrypto.createHash('sha256').update(typeof s === 'string' ? Buffer.from(s, 'utf8') : s).digest();
const sha256hex = s => sha256(s).toString('hex');
const hex = u8 => Buffer.from(u8).toString('hex');
const fromHex = h => new Uint8Array(Buffer.from(h, 'hex'));
const f4 = x => x.toFixed(4);

// ---- taking code by name (as make_bridges_v1.cjs does): a function to its closing brace, a const to its semicolon
function grab(src, name) {
    const m = new RegExp(`^[ \\t]*(?:export )?((?:async )?function ${name}\\(|class ${name} |const ${name} = )`, 'm').exec(src);
    if (!m) throw new Error(`${name} not found`);
    const start = m.index + m[0].length - m[1].length;
    let i = start, depth = 0;
    if (m[1].startsWith('const')) {
        for (; i < src.length; i++) { const c = src[i]; if ('([{'.includes(c)) depth++; else if (')]}'.includes(c)) depth--; else if (c === ';' && depth === 0) break; }
        return src.slice(start, i + 1);
    }
    if (m[1].includes('function')) {
        i = src.indexOf('(', start);
        for (depth = 0; i < src.length; i++) { if (src[i] === '(') depth++; else if (src[i] === ')' && --depth === 0) break; }
    }
    i = src.indexOf('{', i);
    for (depth = 0; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}' && --depth === 0) break; }
    return src.slice(start, i + 1);
}
const F_CC = 'src/identity/crypto-core.js', F_SK = 'src/identity/signing-key.js', F_BM = 'src/biomesh/biomesh.js', F_IR = 'src/identity/identity-registry.js';
const SRC = {};
for (const f of [F_CC, F_SK, F_BM, F_IR]) {
    const p = path.join(BIOCHAIN, f);
    if (!fs.existsSync(p)) { console.error(`missing ${f}: pass --biochain <path of a BioChain-AI checkout>`); process.exit(2); }
    SRC[f] = fs.readFileSync(p, 'utf8');
}
const CC_NAMES = ['subtle', 'enc', 'bufToHex', 'hexToBuf', 'sha256Hex', 'KEY_LATTICES', 'expandHolographic', 'shdccpCompress', 'canonicalParams',
    'deriveKeyVector', 'ALGO', 'SIGN', 'generateKeypair', 'importPriv', 'importPub', 'signPayload', 'verifyPayload', 'keyIdFromPublic', 'attestationPayload'];
const SK_NAMES = ['signWithKey', 'verifyAttestation', 'verifyAttestationAgainstContent'];
const BM_NAMES = ['grownCommitment', 'verifyGrown'];
const IR_NAMES = ['LATTICE_SPACES', 'sha256Bytes', 'expandToHolographicInverse', 'shdccpCompress', 'xorBlendHex', 'computeGeoVector', 'computeIdentityId'];
const body = (f, names) => names.map(n => grab(SRC[f], n)).join('\n');
const CC = new Function(body(F_CC, CC_NAMES) + `\nreturn { ${CC_NAMES.join(', ')} };`)();
const STORE = new Map();                                   // Firestore stand-in: path -> document
const getDocument = async p => (STORE.has(p) ? structuredClone(STORE.get(p)) : null);
const SK = new Function('CC', 'getDocument', body(F_SK, SK_NAMES) + `\nreturn { ${SK_NAMES.join(', ')} };`)(CC, getDocument);
const BM = new Function('CC', 'verifyAttestation', body(F_BM, BM_NAMES) + `\nreturn { ${BM_NAMES.join(', ')} };`)(CC, SK.verifyAttestation);
const IR = new Function(body(F_IR, IR_NAMES) + '\nreturn { computeIdentityId };')();
const subtle = globalThis.crypto.subtle;

// ---- a second way to the identity and key vector: node:crypto and BigInt, no BioChain code
function vector64(b64) {
    let acc = 0n;
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++)
        acc = (acc * 31n + BigInt(b64[x * 16 + y * 4 + z] * (x + 1) * (y + 1) * (z + 1))) & 0xFFFFFFFFFFFFFFFFn;
    return acc.toString(16).toUpperCase().padStart(16, '0');
}
const holo = b32 => Buffer.concat([b32, Buffer.from(Array.from(b32, b => 0xff ^ b))]);
const identityIdPort = (seed, uid) => '0x' + (BigInt('0x' + vector64(holo(sha256(seed.trim())))) ^ BigInt('0x' + sha256(uid).subarray(0, 8).toString('hex')))
    .toString(16).toUpperCase().padStart(16, '0');
const CANON = JSON.stringify({ lattice: 'E8', hilbertDim: 64, modulus: 240, manifold: 'clifford', coherency: 0.75, torsion: 0.5 });
const keyVectorPort = (identityId, epoch) => vector64(holo(sha256(`${identityId}|${CANON}|${epoch}`)));
const keyIdPort = jwk => 'K-' + sha256hex(`${jwk.x}|${jwk.y}`).slice(0, 24);

// ---- the synthetic shard and the LPREP/1-style commitment (the same code is in s7_attestation.py)
const CHARS = [...'abcdefghijklmnopqrstuvwxyz', 'é', 'ß', 'ñ', 'α', 'ж', '中', '語', '\u{1D538}'];
function synthText(seed, limit = SHARD_LIMIT) {
    const rng = new HP.Rng(seed), parts = [];
    let n = 0;
    for (;;) {
        const len = 1 + rng.below(10);
        let w = '';
        for (let i = 0; i < len; i++) w += CHARS[rng.below(CHARS.length)];
        const piece = w + (rng.below(12) === 0 ? '\n' : ' ');
        const b = Buffer.byteLength(piece, 'utf8');
        if (n + b > limit) return parts.join('');
        parts.push(piece); n += b;
    }
}
const ph = name => sha256hex('S7 placeholder ' + name);
const lprepFields = text => [['format', 'LPREP/1'], ['corpusId', 'S7-SPIKE'], ['shardIndex', '0'], ['chainId', 'BC-' + ph('chainId').slice(0, 24)],
    ['merkleRoot', ph('merkleRoot')], ['byteLen', String(Buffer.byteLength(text, 'utf8'))], ['rawSha256', sha256hex(text)], ['spdx', 'CC0-1.0'],
    ['sourceUrlSha', ph('sourceUrl')], ['lvocabHash', ph('LVOCAB/1')], ['idStreamSha256', ph('idStream')], ['laddrHash', ph('LADDR/1')],
    ['weave3Sha', ph('weave3')], ['engramStreamSha', ph('engramStream')], ['tier', 'S']];
const commitmentOf = fields => fields.map(f => f[1]).join('|');

// ---- tampering (the same rule is in s7_attestation.py)
function tamperChar(c) {
    if ((c >= '0' && c <= '8') || (c >= 'a' && c <= 'e') || (c >= 'A' && c <= 'E') || (c >= 'g' && c <= 'y') || (c >= 'G' && c <= 'Y'))
        return String.fromCharCode(c.charCodeAt(0) + 1);
    const m = { 9: '0', f: 'a', F: 'A', z: 'g', Z: 'G' };
    return m[c] !== undefined ? m[c] : String.fromCharCode(c.charCodeAt(0) ^ 1);
}
const tamperAt = (s, i) => s.slice(0, i) + tamperChar(s[i]) + s.slice(i + 1);
function segments(s, names) {
    const out = []; let start = 0;
    for (const name of names) { let end = s.indexOf('|', start); if (end < 0) end = s.length; out.push([name, start, end]); start = end + 1; }
    return out;
}
const sepPositions = s => [...s].map((c, i) => (c === '|' ? i : -1)).filter(i => i >= 0);
const isAscii = s => /^[\x20-\x7e]*$/.test(s);

async function medianMs(fn) {
    for (let i = 0; i < N_WARM; i++) await fn();
    const t = [];
    for (let i = 0; i < N_TIMED; i++) { const a = process.hrtime.bigint(); await fn(); t.push(Number(process.hrtime.bigint() - a) / 1e6); }
    t.sort((a, b) => a - b);
    return (t[N_TIMED / 2 - 1] + t[N_TIMED / 2]) / 2;
}

function runPython(request) {
    return new Promise((resolve, reject) => {
        const py = spawn('python3', ['-B', '-I', PY_SCRIPT, '--json'], { stdio: ['pipe', 'pipe', 'pipe'] });
        let out = '', err = '';
        py.stdout.on('data', d => { out += d; });
        py.stderr.on('data', d => { err += d; });
        py.on('error', reject);
        py.on('close', code => {
            if (code !== 0) return reject(new Error(`s7_attestation.py exited with ${code}: ${err}`));
            try { resolve(JSON.parse(out)); } catch (e) { reject(new Error(`s7_attestation.py gave no JSON: ${err || out.slice(0, 200)}`)); }
        });
        py.stdin.end(JSON.stringify(request));
    });
}

async function main() {
    say('S7 s7_attestation: BioChain-AI\'s ATTEST/1 attestation (ECDSA P-256 over SHA-256) of an LPREP/1-style commitment, signed in Node WebCrypto and verified in Node and in Python cryptography across the P1363 / DER boundary; tampering; the reverse direction; a deterministic golden vector; sign and verify costs');
    say('Settles: L10\'s encoding control and L11\'s attestation cost term. Decides no claim. Data: one synthetic shard from Rng(97000) (and one from Rng(97001)); the keys are random, so key-dependent values are on "~" lines; the golden vector uses RFC 6979\'s public test key.');
    say(`~ node ${process.version}, OpenSSL ${process.versions.openssl}, ${process.platform}-${process.arch}, ${os.cpus().length} cpus (${os.cpus()[0].model})`);
    say('');

    // 0. sources
    say('0. Sources (read only; run as written by name-grab, Firestore replaced by an in-memory map)');
    for (const f of [F_CC, F_SK, F_BM, F_IR]) say(`  BioChain-AI ${f}: sha256 ${sha256hex(SRC[f])}`);
    say(`  taken by name from crypto-core.js: ${CC_NAMES.join(', ')}`);
    say(`  from signing-key.js: ${SK_NAMES.join(', ')}; from biomesh.js: ${BM_NAMES.join(', ')}; from identity-registry.js: ${IR_NAMES.join(', ')}`);
    say('');

    // 1. the format, from the code
    say('1. The ATTEST/1 format, read from the code');
    const oneLine = s => s.replace(/\s+/g, ' ').trim();
    const lineOf = (src, needle) => { const i = src.indexOf(needle); if (i < 0) throw new Error(`${needle} not found`); return src.slice(src.lastIndexOf('\n', i) + 1, src.indexOf('\n', i)).trim(); };
    say(`  crypto-core.js:  ${oneLine(grab(SRC[F_CC], 'attestationPayload'))}`);
    say(`  crypto-core.js:  ${lineOf(SRC[F_CC], 'return "K-" +')}   (keyIdFromPublic)`);
    say(`  crypto-core.js:  const SIGN = ${oneLine(grab(SRC[F_CC], 'SIGN').replace(/^const SIGN = /, ''))}   (signPayload / verifyPayload: WebCrypto ECDSA, P1363 r||s, hex)`);
    say(`  signing-key.js:  ${lineOf(SRC[F_SK], 'const contentHash = await CC.sha256Hex(contentText)')}   (signWithKey)`);
    say(`  signing-key.js:  ${lineOf(SRC[F_SK], 'if (block.keyVector !== reg.keyVector)')}   (verifyAttestation)`);
    say(`  biomesh.js:      ${oneLine(grab(SRC[F_BM], 'grownCommitment'))}`);
    say(`  biomesh.js:      ${lineOf(SRC[F_BM], 'const h = await CC.sha256Hex(grownCommitment(chain))')}   (verifyGrown)`);
    const template = CC.attestationPayload({ keyId: '<keyId>', keyVector: '<keyVector>', contentHash: '<sha256(commitment)>', epochToken: '<epochToken>' });
    say(`  attestationPayload on placeholders: ${template}; equal to 'ATTEST/1|keyId|keyVector|SHA256(commitment)|epochToken': ${ck('template', template === 'ATTEST/1|<keyId>|<keyVector>|<sha256(commitment)>|<epochToken>')}`);
    const { identityId } = await IR.computeIdentityId(IDENTITY_SEED, UID);
    say(`  identityId = computeIdentityId('${IDENTITY_SEED}', '${UID}'): ${identityId}; recomputed with node:crypto + BigInt: ${ck('identityId port', identityIdPort(IDENTITY_SEED, UID) === identityId)}`);
    const kv = await CC.deriveKeyVector(identityId, {}, EPOCH_TOKEN);
    const keyVector = kv.vector64;
    say(`  canonicalParams({}): ${CC.canonicalParams({})}; equal to the port's: ${ck('canonicalParams', CC.canonicalParams({}) === CANON)}`);
    say(`  keyVector = deriveKeyVector(identityId, {}, '${EPOCH_TOKEN}').vector64: ${keyVector}; recomputed: ${ck('keyVector port', keyVectorPort(identityId, EPOCH_TOKEN) === keyVector)} (it does not depend on the ECDSA key)`);
    say('');

    // 2. the commitment
    const text = synthText(SEED_TEXT), raw = Buffer.from(text, 'utf8');
    const fields = lprepFields(text), commitment = commitmentOf(fields);
    if (!isAscii(commitment)) throw new Error('commitment must be ASCII');
    const contentHash = await CC.sha256Hex(commitment);
    say('2. The sample LPREP/1-style commitment (field order from the design\'s LPREP/1 row; pipe-joined like GROWN/1)');
    say(`  synthetic shard from HPCore.Rng(${SEED_TEXT}): ${raw.length} B, ${[...text].length} code points, ${[...text].filter(c => c.codePointAt(0) > 0x7f).length} non-ASCII; sha256 ${sha256hex(raw)}; orbital_core gives the same: ${ck('shard orbital', O.toHex(O.sha256(O.utf8(text))) === sha256hex(raw))}`);
    say(`  fields (name:length): ${fields.map(([n, v]) => `${n}:${v.length}`).join(', ')}`);
    say(`  placeholders (SHA-256 of 'S7 placeholder <name>'): chainId, merkleRoot, sourceUrlSha, lvocabHash, idStreamSha256, laddrHash, weave3Sha, engramStreamSha; from the shard: byteLen, rawSha256`);
    say(`  commitment, ${commitment.length} characters:`);
    say(`    ${commitment}`);
    say(`  contentHash = sha256Hex(commitment) (BioChain, WebCrypto) ${contentHash}; node:crypto equal: ${ck('contentHash node', sha256hex(commitment) === contentHash)}; orbital_core equal: ${ck('contentHash orbital', O.toHex(O.sha256(O.utf8(commitment))) === contentHash)}`);
    say('');

    // 3. Node key, sign, verify, BioChain's flows
    say('3. A P-256 key from BioChain\'s generateKeypair (WebCrypto), signed and verified in Node');
    const kp = await CC.generateKeypair();
    const jwk = kp.publicJwk;
    say(`  public JWK fields: ${Object.keys(jwk).sort().join(', ')}; kty ${jwk.kty}, crv ${jwk.crv}; x and y ${jwk.x.length} and ${jwk.y.length} base64url characters (32 bytes): ${ck('jwk shape', jwk.kty === 'EC' && jwk.crv === 'P-256' && Buffer.from(jwk.x, 'base64url').length === 32 && Buffer.from(jwk.y, 'base64url').length === 32)}; private JWK adds: ${Object.keys(kp.privateJwk).filter(k => !(k in jwk)).sort().join(', ')}`);
    const keyId = await CC.keyIdFromPublic(jwk);
    say(`  keyId = keyIdFromPublic(publicJwk): ${keyId.length} characters, 'K-' + 24 hex: ${ck('keyId shape', /^K-[0-9a-f]{24}$/.test(keyId))}; node:crypto gives the same: ${ck('keyId port', keyIdPort(jwk) === keyId)}`);
    say(`~   keyId ${keyId}; x ${jwk.x}; y ${jwk.y}`);
    const payload = CC.attestationPayload({ keyId, keyVector, contentHash, epochToken: EPOCH_TOKEN });
    say(`  payload = attestationPayload({ keyId, keyVector, contentHash, epochToken }): ${payload.length} characters = 8 + 1 + 26 + 1 + 16 + 1 + 64 + 1 + ${EPOCH_TOKEN.length}: ${ck('payload length', payload.length === 8 + 1 + 26 + 1 + 16 + 1 + 64 + 1 + EPOCH_TOKEN.length)}; equal to the plain join: ${ck('payload join', payload === ['ATTEST/1', keyId, keyVector, contentHash, EPOCH_TOKEN].join('|'))}`);
    say(`~   payload ${payload}`);
    const sigHex = await CC.signPayload(kp.privateJwk, payload);
    const sig0 = fromHex(sigHex), msg = new TextEncoder().encode(payload), msgBuf = Buffer.from(payload, 'utf8');
    say(`  signPayload: ${sigHex.length} hex characters = ${sig0.length} bytes, IEEE P1363 r||s: ${ck('sig length', sig0.length === 64)}; verifyPayload: ${ck('verifyPayload', await CC.verifyPayload(jwk, payload, sigHex))}`);
    const keyObj = nodeCrypto.createPublicKey({ key: jwk, format: 'jwk' });
    say(`  node:crypto (OpenSSL, synchronous) verify with dsaEncoding 'ieee-p1363': ${ck('nodecrypto p1363', nodeCrypto.verify('sha256', msgBuf, { key: keyObj, dsaEncoding: 'ieee-p1363' }, sig0))}; with its default 'der' (the same bytes unconverted): ${nodeCrypto.verify('sha256', msgBuf, keyObj, sig0)}${mk('nodecrypto der rejects p1363', !nodeCrypto.verify('sha256', msgBuf, keyObj, sig0))}`);
    // BioChain's flows on an in-memory registry
    const regDoc = { keyId, ownerUid: UID, identityId, role: 'MEMBER', keyVector, coords: kv.coords, params: JSON.parse(CC.canonicalParams({})), epochToken: EPOCH_TOKEN, publicJwk: jwk, status: 'active', label: 'S7 spike key' };
    STORE.set(`users/${UID}/signingKeys/${keyId}`, { ...regDoc, privateJwk: kp.privateJwk });
    STORE.set(`keyRegistry/${keyId}`, regDoc);
    const block = await SK.signWithKey(UID, keyId, commitment);
    say(`  signWithKey(uid, keyId, commitment) block fields: ${Object.keys(block).join(', ')}; format '${block.format}'`);
    say(`    its contentHash is sha256(commitment): ${ck('block contentHash', block.contentHash === contentHash)}; its sig verifies against our payload (so it signs exactly that string): ${ck('block payload', await subtle.verify(CC.SIGN, await CC.importPub(jwk), fromHex(block.sig), msg))}`);
    const va = await SK.verifyAttestation(block);
    say(`    verifyAttestation: valid ${va.valid}, reason '${va.reason}', reported identityId is the registry's: ${va.identityId === identityId}${mk('verifyAttestation', va.valid && va.reason === 'verified')}`);
    const vc = await SK.verifyAttestationAgainstContent(block, commitment);
    say(`    verifyAttestationAgainstContent(block, commitment): valid ${vc.valid}, contentMatch ${vc.contentMatch}, reason '${vc.reason}'${mk('against content', vc.valid && vc.contentMatch)}`);
    const vt = await SK.verifyAttestationAgainstContent(block, tamperAt(commitment, commitment.length - 1));
    say(`    ... against the commitment with its last character changed: valid ${vt.valid}, reason '${vt.reason}'${mk('against tampered content', !vt.valid)}`);
    const other = commitmentOf(lprepFields(synthText(SEED_OTHER)));
    const blockOther = await SK.signWithKey(UID, keyId, other);
    const v5 = await SK.verifyAttestationAgainstContent(blockOther, commitment);
    say(`    T5-style: a valid attestation of a different shard's commitment (Rng(${SEED_OTHER})) checked against this one: verifyAttestation alone valid ${(await SK.verifyAttestation(blockOther)).valid}; against this content valid ${v5.valid}, reason '${v5.reason}'${mk('T5', !v5.valid)}`);
    // GROWN/1, the pattern LPREP/1 follows
    const chain = { chainId: 'BC-' + ph('grown chainId').slice(0, 24), merkleRoot: ph('grown merkleRoot'), weaveChiral: 'S7-placeholder-weaveChiral', weaveMirror: 'S7-placeholder-weaveMirror', origBytes: raw.length };
    const gc = BM.grownCommitment(chain);
    chain.grownAttestation = await SK.signWithKey(UID, keyId, gc);
    const vg = await BM.verifyGrown(chain);
    say(`  GROWN/1 (biomesh.js, as written) on a placeholder record: ${gc}`);
    say(`    signWithKey + verifyGrown: valid ${vg.valid}, reason '${vg.reason}'${mk('verifyGrown', vg.valid)}`);
    const vg2 = await BM.verifyGrown({ ...chain, merkleRoot: tamperAt(chain.merkleRoot, 0) });
    say(`    the same record with merkleRoot's first character changed: valid ${vg2.valid}, reason '${vg2.reason}'${mk('verifyGrown tampered', !vg2.valid)}`);
    // block-level alterations through verifyAttestation, as written
    say('  BioChain\'s verifyAttestation on altered blocks (last character changed) and registry states:');
    for (const f of ['keyId', 'keyVector', 'contentHash', 'epochToken', 'sig']) {
        const r = await SK.verifyAttestation({ ...block, [f]: tamperAt(block[f], block[f].length - 1) });
        say(`    ${f}: valid ${r.valid}, reason '${r.reason}'${mk('block ' + f, !r.valid)}`);
    }
    for (const f of ['identityId', 'ownerUid', 'signedAt', 'format']) {
        const r = await SK.verifyAttestation({ ...block, [f]: tamperAt(block[f], block[f].length - 1) });
        say(`    ${f} (not in the payload): valid ${r.valid}, reason '${r.reason}', reported identityId is the registry's: ${r.identityId === identityId}`);
    }
    for (const st of ['revoked', 'retired']) {
        STORE.set(`keyRegistry/${keyId}`, { ...regDoc, status: st });
        const r = await SK.verifyAttestation(block);
        say(`    registry status '${st}' (L10 T4): valid ${r.valid}, reason '${r.reason}'${mk('status ' + st, !r.valid)}`);
    }
    STORE.set(`users/${UID}/signingKeys/${keyId}`, { ...regDoc, privateJwk: kp.privateJwk, status: 'revoked' });
    let refused = '';
    try { await SK.signWithKey(UID, keyId, commitment); } catch (e) { refused = e.message; }
    say(`    signWithKey with the owner's copy marked revoked: refused with '${refused}'${mk('sign refused', refused !== '')}`);
    STORE.set(`users/${UID}/signingKeys/${keyId}`, { ...regDoc, privateJwk: kp.privateJwk });
    STORE.set(`keyRegistry/${keyId}`, regDoc);
    say('');

    // 4. exhaustive tampering in Node
    say('4. Tampering in Node, every position once (rule: digits cycle 0-9, hex letters a-f / A-F, other letters g-z / G-Z, anything else bit 0 flipped)');
    const pubKey = await CC.importPub(jwk);
    const vfy = async (s, m) => subtle.verify(CC.SIGN, pubKey, s, new TextEncoder().encode(m));
    const payNames = ['ATTEST/1', 'keyId', 'keyVector', 'contentHash', 'epochToken'];
    const tamperedPayloads = [];
    for (const [name, a, b] of [...segments(payload, payNames), ['separators']]) {
        const pos = name === 'separators' ? sepPositions(payload) : Array.from({ length: b - a }, (_, k) => a + k);
        let rej = 0;
        for (const i of pos) { const t = tamperAt(payload, i); tamperedPayloads.push(t); rej += !(await vfy(sig0, t)); }
        say(`  payload ${name} (${pos.length} positions): rejected ${rej}/${pos.length}${ck('node payload ' + name, rej === pos.length) === 'true' ? '' : ' FAILED'}`);
    }
    const cNames = fields.map(f => f[0]);
    const tamperedCommitments = [], perField = [];
    let totPos = 0, totHash = 0, totSig = 0;
    for (const [name, a, b] of [...segments(commitment, cNames), ['separators']]) {
        const pos = name === 'separators' ? sepPositions(commitment) : Array.from({ length: b - a }, (_, k) => a + k);
        let hd = 0, sr = 0;
        for (const i of pos) {
            const t = tamperAt(commitment, i); tamperedCommitments.push(t);
            const h = await CC.sha256Hex(t);
            hd += h !== contentHash;
            sr += !(await vfy(sig0, CC.attestationPayload({ keyId, keyVector, contentHash: h, epochToken: EPOCH_TOKEN })));
        }
        perField.push(`${name} ${sr}/${pos.length}`); totPos += pos.length; totHash += hd; totSig += sr;
    }
    say(`  commitment, all ${totPos} positions in ${fields.length} fields and ${sepPositions(commitment).length} separators: contentHash differs ${totHash}/${totPos}, signature over the rebuilt payload rejected ${totSig}/${totPos}${ck('node commitment', totHash === totPos && totSig === totPos) === 'true' ? '' : ' FAILED'}`);
    say('    rejected by field: ' + perField.join(', '));
    const tcDigest = sha256hex(tamperedCommitments.join('\n'));
    say(`    sha256 over the ${totPos} tampered commitments, one per line: ${tcDigest}`);
    const tamperedSigs = [];
    let sRej = 0;
    for (let i = 0; i < sigHex.length; i++) { const t = tamperAt(sigHex, i); tamperedSigs.push(t); sRej += !(await vfy(fromHex(t), payload)); }
    say(`  signature hex, ${sigHex.length} positions: rejected ${sRej}/${sigHex.length}${ck('node sig tamper', sRej === sigHex.length) === 'true' ? '' : ' FAILED'}`);
    const r0 = BigInt('0x' + sigHex.slice(0, 64)), s0 = BigInt('0x' + sigHex.slice(64));
    const twin = fromHex(sigHex.slice(0, 64) + (P256_N - s0).toString(16).padStart(64, '0'));
    const twinNode = await vfy(twin, payload), twinOssl = nodeCrypto.verify('sha256', msgBuf, { key: keyObj, dsaEncoding: 'ieee-p1363' }, twin);
    say(`  high-S twin (r, n - s): WebCrypto accepts: ${twinNode}; node:crypto accepts: ${twinOssl} (ECDSA is malleable; neither enforces low-S, so signature bytes are not unique)`);
    say(`  r and s of the primary signature are in [1, n - 1]: ${ck('r s range', r0 > 0n && r0 < P256_N && s0 > 0n && s0 < P256_N)}`);
    say('');

    // 5. timed loops (their signatures go to Python) and the short-r / short-s search
    const privKey = await CC.importPriv(kp.privateJwk);
    const tm = {};
    const nodeSigs = [];
    tm.sign = await medianMs(async () => { nodeSigs.push(new Uint8Array(await subtle.sign(CC.SIGN, privKey, msg))); });
    nodeSigs.splice(0, N_WARM);
    tm.signBio = await medianMs(() => CC.signPayload(kp.privateJwk, payload));
    tm.verify = await medianMs(() => subtle.verify(CC.SIGN, pubKey, sig0, msg));
    tm.verifyBio = await medianMs(() => CC.verifyPayload(jwk, payload, sigHex));
    tm.importPub = await medianMs(() => CC.importPub(jwk));
    tm.ossl = await medianMs(async () => nodeCrypto.verify('sha256', msgBuf, { key: keyObj, dsaEncoding: 'ieee-p1363' }, sig0));
    tm.osslJwk = await medianMs(async () => nodeCrypto.verify('sha256', msgBuf, { key: nodeCrypto.createPublicKey({ key: jwk, format: 'jwk' }), dsaEncoding: 'ieee-p1363' }, sig0));
    tm.hashWeb = await medianMs(() => CC.sha256Hex(commitment));
    tm.hashOrb = await medianMs(async () => O.toHex(O.sha256(O.utf8(commitment))));
    tm.step = await medianMs(() => SK.verifyAttestationAgainstContent(block, commitment));
    tm.stepNoSig = await medianMs(async () => { await getDocument(`keyRegistry/${keyId}`); return (await CC.sha256Hex(commitment)) === block.contentHash; });
    const shortSig = {};
    let tries = 0;
    while ((!shortSig.r || !shortSig.s) && tries < SHORT_CAP) {
        const s = new Uint8Array(await subtle.sign(CC.SIGN, privKey, msg)); tries++;
        if (s[0] === 0 && !shortSig.r) shortSig.r = hex(s);
        if (s[32] === 0 && !shortSig.s) shortSig.s = hex(s);
    }
    const allNodeOk = (await Promise.all(nodeSigs.map(s => vfy(s, payload)))).every(Boolean);
    say(`5. Node's timed signatures and the short-r / short-s search (they are sent to Python)`);
    say(`  ${nodeSigs.length} signatures from the timed sign loop, all 64 bytes and verifying in Node: ${ck('node 200', nodeSigs.length === N_TIMED && nodeSigs.every(s => s.length === 64) && allNodeOk)}`);
    say(`  signatures with r < 2^248 and with s < 2^248 (a leading zero byte in P1363) found: ${ck('node short found', !!(shortSig.r && shortSig.s))}`);
    say(`~   after ${tries} signatures`);
    say('');

    // 6. Python
    const request = {
        epochToken: EPOCH_TOKEN, identitySeed: IDENTITY_SEED, uid: UID, seedText: SEED_TEXT, publicJwk: jwk, keyId, identityId, keyVector,
        shardSha: sha256hex(raw), commitment, contentHash, payload, sig: sigHex, sigs: nodeSigs.map(hex), shortR: shortSig.r || null, shortS: shortSig.s || null,
    };
    const tPy = process.hrtime.bigint();
    const PY = await runPython(request);
    const pyMs = Number(process.hrtime.bigint() - tPy) / 1e6;
    say('6. Python: s7_attestation.py --json (python3 -B -I; the request on stdin, the answer on stdout; no file written)');
    for (const l of PY.lines) say(l.startsWith('~') ? l : '  ' + l);
    const pyBad = PY.checks.filter(c => !c[1]).map(c => c[0]);
    say(`  Python's checks passed: ${PY.checks.length - pyBad.length}/${PY.checks.length}${pyBad.length ? '; failed: ' + pyBad.join(', ') : ''}${mk('python checks', pyBad.length === 0)}`);
    say(`  the same tampered strings in both languages: payloads ${ck('digest payloads', PY.digests.tamperedPayloads === sha256hex(tamperedPayloads.join('\n')))}, commitments ${ck('digest commitments', PY.digests.tamperedCommitments === tcDigest)}, signatures ${ck('digest sigs', PY.digests.tamperedSigs === sha256hex(tamperedSigs.join('\n')))}; high-S twin verdicts agree: ${ck('high-S agree', PY.highS === twinNode && twinNode === twinOssl)}`);
    say(`~   python3 round trip ${pyMs.toFixed(0)} ms`);
    say('');

    // 7. Node verifies Python's
    say('7. Python\'s signatures verified in Node (the reverse direction: DER -> P1363)');
    const P = PY.py;
    say(`  keyIdFromPublic(Python's JWK) equals Python's keyId: ${ck('py keyId', (await CC.keyIdFromPublic(P.publicJwk)) === P.keyId)}; attestationPayload rebuilds Python's payload: ${ck('py payload', CC.attestationPayload({ keyId: P.keyId, keyVector, contentHash, epochToken: EPOCH_TOKEN }) === P.payload)}`);
    const pyPub = await CC.importPub(P.publicJwk), pyMsg = new TextEncoder().encode(P.payload), pyMsgBuf = Buffer.from(P.payload, 'utf8');
    const pyKeyObj = nodeCrypto.createPublicKey({ key: P.publicJwk, format: 'jwk' });
    let okP = 0, okBio = 0, okDerRaw = 0, okDerBio = 0, okOsslDer = 0;
    const derLens = {};
    for (let i = 0; i < P.sigsP1363.length; i++) {
        okP += await subtle.verify(CC.SIGN, pyPub, fromHex(P.sigsP1363[i]), pyMsg);
        okBio += await CC.verifyPayload(P.publicJwk, P.payload, P.sigsP1363[i]);
        const der = fromHex(P.sigsDer[i]);
        derLens[der.length] = (derLens[der.length] || 0) + 1;
        okDerRaw += await subtle.verify(CC.SIGN, pyPub, der, pyMsg);
        okDerBio += await CC.verifyPayload(P.publicJwk, P.payload, P.sigsDer[i]);
        okOsslDer += nodeCrypto.verify('sha256', pyMsgBuf, pyKeyObj, der);
    }
    const nP = P.sigsP1363.length;
    say(`  ${nP} Python signatures converted to P1363: WebCrypto verifies ${okP}/${nP}, BioChain's verifyPayload ${okBio}/${nP}${mk('py converted', okP === nP && okBio === nP && nP === N_TIMED)}`);
    say(`  [reverse control] the same ${nP} as DER, unconverted: WebCrypto accepts ${okDerRaw}/${nP}, verifyPayload ${okDerBio}/${nP}${mk('py der rejected', okDerRaw === 0 && okDerBio === 0)}; node:crypto, which reads DER by default, accepts ${okOsslDer}/${nP}${mk('ossl der', okOsslDer === nP)}`);
    say(`~   DER lengths of Python's ${nP}: ` + Object.keys(derLens).sort().map(k => `${k} B x${derLens[k]}`).join(', '));
    for (const k of ['r', 's']) {
        const S = P.short[k];
        if (!S) { say(`  Python's short-${k} signature: missing ${ck('py short ' + k, false)}`); continue; }
        const good = await subtle.verify(CC.SIGN, pyPub, fromHex(S.p1363), pyMsg), bad = await subtle.verify(CC.SIGN, pyPub, fromHex(S.unpadded), pyMsg);
        say(`  Python's signature with ${k} < 2^248: left-padded P1363 (64 B) verifies: ${ck('py short pad ' + k, good)}; unpadded (${S.unpadded.length / 2 < 64 ? 'under 64 B' : '64 B'}) verifies: ${bad}${mk('py short unpadded ' + k, !bad && S.unpadded.length / 2 < 64)}`);
    }
    const pyBlock = { format: 'attestation/1', keyId: P.keyId, identityId, ownerUid: UID, keyVector, epochToken: EPOCH_TOKEN, contentHash, sig: P.sigsP1363[0] };
    STORE.set(`keyRegistry/${P.keyId}`, { ...regDoc, keyId: P.keyId, publicJwk: P.publicJwk, label: 'S7 Python key' });
    const vpy = await SK.verifyAttestationAgainstContent(pyBlock, commitment);
    say(`  a block carrying Python's signature, through BioChain's verifyAttestationAgainstContent (Python's JWK in the registry): valid ${vpy.valid}, reason '${vpy.reason}'${mk('py block', vpy.valid)}`);
    const wrong = await subtle.verify(CC.SIGN, pubKey, fromHex(P.sigsP1363[0]), pyMsg);
    say(`  Python's signature under Node's key: accepted ${wrong}${mk('wrong key node', !wrong)}`);
    // the golden vector
    const G = PY.golden;
    say('  the golden attestation (RFC 6979 A.2.5 test key, deterministic ECDSA in Python):');
    say(`    the JWK's x, y are the RFC's Ux, Uy: ${ck('golden xy', Buffer.from(G.publicJwk.x, 'base64url').toString('hex') === RFC_UX && Buffer.from(G.publicJwk.y, 'base64url').toString('hex') === RFC_UY)}; RFC r||s for "sample" verifies in WebCrypto: ${ck('rfc sample', G.sampleP1363 === RFC_R + RFC_S && await subtle.verify(CC.SIGN, await CC.importPub(G.publicJwk), fromHex(RFC_R + RFC_S), new TextEncoder().encode('sample')))}`);
    say(`    keyIdFromPublic gives Python's keyId ${G.keyId}: ${ck('golden keyId', (await CC.keyIdFromPublic(G.publicJwk)) === G.keyId)}; attestationPayload rebuilds the payload: ${ck('golden payload', CC.attestationPayload({ keyId: G.keyId, keyVector, contentHash, epochToken: EPOCH_TOKEN }) === G.payload)}`);
    say(`    sha256(payload) ${sha256hex(G.payload)}; signature P1363 sha256 ${sha256hex(fromHex(G.sigP1363))}`);
    STORE.set(`keyRegistry/${G.keyId}`, { ...regDoc, keyId: G.keyId, publicJwk: G.publicJwk, label: 'RFC 6979 test key (known answer only)' });
    const gBlock = { format: 'attestation/1', keyId: G.keyId, identityId, ownerUid: UID, keyVector, epochToken: EPOCH_TOKEN, contentHash, sig: G.sigP1363 };
    const vgold = await SK.verifyAttestationAgainstContent(gBlock, commitment);
    say(`    WebCrypto verifies the P1363 signature: ${ck('golden webcrypto', await subtle.verify(CC.SIGN, await CC.importPub(G.publicJwk), fromHex(G.sigP1363), new TextEncoder().encode(G.payload)))}; node:crypto the DER: ${ck('golden ossl', nodeCrypto.verify('sha256', Buffer.from(G.payload, 'utf8'), nodeCrypto.createPublicKey({ key: G.publicJwk, format: 'jwk' }), fromHex(G.sigDer)))}; BioChain's verifyAttestationAgainstContent: valid ${vgold.valid}, reason '${vgold.reason}'${mk('golden biochain', vgold.valid)}`);
    say('');

    // 8. timings
    const T = PY.timing;
    say(`8. Timings, median of ${N_TIMED} after ${N_WARM} warm-up runs (process.hrtime.bigint; Python time.perf_counter_ns)`);
    say(`~   Node sign: WebCrypto, key imported once ${f4(tm.sign)} ms; signPayload as written (JWK import + sign + hex) ${f4(tm.signBio)} ms`);
    say(`~   Node verify: WebCrypto, key imported once ${f4(tm.verify)} ms; verifyPayload as written (JWK import + verify) ${f4(tm.verifyBio)} ms; importKey(jwk) alone ${f4(tm.importPub)} ms`);
    say(`~   Node verify, node:crypto synchronous (OpenSSL, ieee-p1363): KeyObject reused ${f4(tm.ossl)} ms; created from the JWK each time ${f4(tm.osslJwk)} ms`);
    say(`~   Node sha256(commitment, ${commitment.length} chars): WebCrypto ${f4(tm.hashWeb)} ms; orbital_core ${f4(tm.hashOrb)} ms`);
    say(`~   Node attestation step (verifyAttestationAgainstContent as written: registry read, keyVector check, verifyPayload, contentHash) ${f4(tm.step)} ms; the same without the signature (registry read + contentHash) ${f4(tm.stepNoSig)} ms`);
    say(`~   Python sign (DER) ${f4(T.sign)} ms, + DER -> P1363 ${f4(T.sign_p1363)} ms; verify DER ${f4(T.verify_der)} ms, P1363 -> DER + verify ${f4(T.verify_p1363)} ms, + JWK load ${f4(T.verify_jwk)} ms; P1363 -> DER alone ${f4(T.conv)} ms; whole attestation step ${f4(T.step)} ms`);
    say('');

    const bad = CHECKS.filter(c => !c[1]).map(c => c[0]);
    say(`Node checks passed: ${CHECKS.length - bad.length}/${CHECKS.length}${bad.length ? '; failed: ' + bad.join(', ') : ''}`);
    say('');
    say('SETTLES:');
    say(`- ATTEST/1, from BioChain-AI's code: payload 'ATTEST/1|keyId|keyVector|contentHash|epochToken' (${payload.length} characters with the ${EPOCH_TOKEN.length}-character epoch token), contentHash = sha256Hex(commitment string) as signWithKey and verifyGrown compute it, keyId = 'K-' + sha256Hex(x|y)[0:24] over the JWK's base64url x and y, keyVector = deriveKeyVector(identityId, params, epochToken).vector64 (16 upper hex, independent of the key); ECDSA P-256 with SHA-256 over the UTF-8 payload; WebCrypto signatures are IEEE P1363 r||s, 64 bytes, carried as 128 hex characters. identityId, keyVector, commitment and contentHash agree in JS (BioChain's code, a port) and Python.`);
    say(`- L10's encoding control: Python cryptography verifies Node's signatures after P1363 -> DER (encode_dss_signature) (${N_TIMED}/${N_TIMED} plus the primary and the short-r and short-s ones) and accepts 0/${N_TIMED} given raw (InvalidSignature); the reverse holds: WebCrypto and BioChain's verifyPayload accept 0/${N_TIMED} of Python's DER signatures unconverted and ${N_TIMED}/${N_TIMED} after DER -> P1363; that conversion must left-pad r and s to 32 bytes (an unpadded conversion of a short-r or short-s signature is under 64 bytes and rejected; r or s falls below 2^248 in about 1 signature in 128, 2 x 2^-8).`);
    say(`- Tampering: every single-character substitution of the payload (137 positions, all 5 fields and the separators), of the commitment (${totPos} positions; contentHash always changes) and of the signature (128 hex positions) is rejected in Node and in Python, on identical tampered strings. BioChain's verifyAttestation names the failing check (unknown key, key-vector mismatch, signature invalid, key revoked / retired); identityId, ownerUid, signedAt and format are outside the payload and do not affect its verdict. The high-S twin (r, n - s) verifies in WebCrypto, node:crypto and Python: signatures are not unique, so nothing may be keyed by signature bytes.`);
    say(`- A deterministic golden ATTEST/1 for tests (RFC 6979 A.2.5 test key, deterministic ECDSA; RFC r, s for "sample" reproduced): keyId ${G.keyId}, payload sha256 ${sha256hex(G.payload)}, signature P1363 ${G.sigP1363}; it verifies in WebCrypto, node:crypto and Python and through BioChain's verifyAttestationAgainstContent.`);
    say(`~ L11's attestation term per shard (this container): WebCrypto verify ${f4(tm.verify)} ms with the key imported once, ${f4(tm.verifyBio)} ms as verifyPayload does it (JWK import each time); the whole step as BioChain writes it ${f4(tm.step)} ms; node:crypto synchronous ${f4(tm.ossl)} ms; Python ${f4(T.verify_p1363)} ms (${f4(T.step)} ms with the JWK load and contentHash). Signing: WebCrypto ${f4(tm.sign)} ms, Python ${f4(T.sign)} ms. For 1,000 shards: ${(tm.step).toFixed(2)} s in Node.`);
    say(`~ total runtime ${(Number(process.hrtime.bigint() - T_START) / 1e9).toFixed(1)} s`);
    if (bad.length || pyBad.length) process.exitCode = 1;
}

main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
