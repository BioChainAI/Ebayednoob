"""lexicon.attest: ATTEST/1 across the P1363 / DER boundary (L10), against BioChain-AI's own identity code and Node's
WebCrypto (by name-grab, as spike S7 ran them), RFC 6979's known answer, and S7's pinned values."""
import json
import os
import subprocess

import pytest

import lexicon
from lexicon import attest as A

HERE = os.path.dirname(os.path.abspath(__file__))
BIOCHAIN = os.path.join(os.path.dirname(lexicon.REPO), 'BioChain-AI')
NODE_OK = subprocess.run(['node', '--version'], capture_output=True).returncode == 0

RFC_R = 0xEFD48B2AACB6A8FD1140DD9CD45E81D69D2C877B56AAF991C34D0EA84EAF3716
RFC_S = 0xF7CB1C942D657C41D436C7A1B6E29F65F3E900DBB9AFF4064DC4AB2F843ACDA8
RFC_UX = 0x60FED4BA255A9D31C961EB74C6356D68C049B8923B61FA6CE669622E60F29FB6


def test_s7_pinned_identity_and_key_vector():
    ident = A.identity_id('hyperbolic-lexicon spike S7 identity seed', 'spike-s7-uid')
    assert ident == '0x3576910B7E3DD241'
    assert A.key_vector(ident, 'EPOCH-OFFLINE-SPIKE') == 'AF95A64504223AA8'
    assert A.canonical_params() == '{"lattice":"E8","hilbertDim":64,"modulus":240,"manifold":"clifford","coherency":0.75,"torsion":0.5}'
    assert A.epoch_token('2026-11-05') == 'EPOCH-OFFLINE-2026-11-05'
    with pytest.raises(ValueError):
        A.epoch_token('5 Nov 2026')


def test_rfc6979_known_answer_and_determinism():
    k = A.private_key(A.RFC6979_D)
    assert k.public_key().public_numbers().x == RFC_UX
    sig = A.sign_p1363(k, 'sample')
    assert sig == RFC_R.to_bytes(32, 'big') + RFC_S.to_bytes(32, 'big')
    assert A.sign_p1363(k, 'x') == A.sign_p1363(k, 'x')
    assert A.verify_p1363(k.public_key(), sig, 'sample')


def test_encodings_padding_twin_and_the_no_conversion_control():
    k = A.private_key(A.TRACE_KEYS['B'])
    pub = k.public_key()
    short = {}
    for n in range(4000):
        der = k.sign(f'pad {n}'.encode(), A.ECDSA_SHA256_DET)
        r, s = A.decode_dss_signature(der)
        p = A.der_to_p1363(der)
        assert len(p) == 64 and A.p1363_to_der(p) == der
        if r < 1 << 248:
            short.setdefault('r', (n, der))
        if s < 1 << 248:
            short.setdefault('s', (n, der))
        if n < 200:
            acc, exc = A.verify_raw_as_der(pub, p, f'pad {n}')
            assert not acc and exc                                     # L10 control 2: rejected unconverted
            assert A.verify_p1363(pub, p, f'pad {n}')
            assert A.verify_p1363(pub, A.high_s_twin(p), f'pad {n}')  # malleable: the twin verifies too
            assert not A.verify_p1363(pub, p, f'pad {n + 1}')
        if len(short) == 2 and n >= 200:
            break
    assert set(short) == {'r', 's'}
    for n, der in short.values():
        good, bad = A.der_to_p1363(der), A.der_to_p1363_unpadded(der)
        assert len(good) == 64 and len(bad) < 64
        assert A.verify_p1363(pub, good, f'pad {n}') and not A.verify_p1363(pub, bad, f'pad {n}')


def test_registry_snapshot_and_verify_attestation():
    ka, kb, kc = (A.private_key(d) for d in (A.TRACE_KEYS['A'], A.TRACE_KEYS['B'], 12345))
    kv = A.key_vector(A.identity_id(), 'EPOCH-OFFLINE-2000-01-01')
    ents = [{'publicJwk': A.jwk_of(ka.public_key()), 'keyVector': kv, 'status': 'active'},
            {'publicJwk': A.jwk_of(kb.public_key()), 'keyVector': kv, 'status': 'revoked'}]
    snap = A.snapshot_text(ents)
    rows = json.loads(snap)
    assert [list(r) for r in rows] == [['keyId', 'publicJwk', 'keyVector', 'status']] * 2
    assert [r['keyId'] for r in rows] == sorted(r['keyId'] for r in rows)
    reg = A.load_snapshot(snap, A.sha256hex(snap))
    with pytest.raises(ValueError):
        A.load_snapshot(snap, '00' * 32)
    bent = snap.replace(rows[0]['keyId'], rows[0]['keyId'][:-1] + ('0' if rows[0]['keyId'][-1] != '0' else '1'))
    with pytest.raises(ValueError):
        A.load_snapshot(bent, A.sha256hex(bent))
    content = 'LPREP/1|demo'
    ep = 'EPOCH-OFFLINE-2000-01-01'
    good = A.attest(ka, kv, content, ep)
    assert A.verify_attestation(good, content, reg)[:2] == (True, 'verified')
    assert A.verify_attestation(good, content + 'x', reg)[1] == 'content does not match attestation'
    assert A.verify_attestation(A.attest(kb, kv, content, ep), content, reg)[1] == 'key revoked'
    assert A.verify_attestation(A.attest(kc, kv, content, ep), content, reg)[1] == 'unknown key'
    assert A.verify_attestation(dict(good, keyVector='0' * 16), content, reg)[1] == 'key-vector mismatch'
    assert A.verify_attestation(dict(good, epochToken='EPOCH-OFFLINE-2000-01-02'), content, reg)[1] == 'signature invalid'
    assert A.verify_attestation(dict(good, sig=good['sig'][:-2]), content, reg)[1] == 'signature is not 128 hex digits'
    assert A.verify_attestation({'keyId': good['keyId']}, content, reg)[1] == 'malformed attestation block'
    twin = dict(good, sig=A.high_s_twin(bytes.fromhex(good['sig'])).hex())
    assert A.verify_attestation(twin, content, reg)[0]
    retired = A.load_snapshot(A.snapshot_text([dict(ents[0], status='retired')]),
                              A.sha256hex(A.snapshot_text([dict(ents[0], status='retired')])))
    assert A.verify_attestation(good, content, retired)[1] == 'key retired'


BIOCHAIN_JS = r'''
const fs = require('fs'), path = require('path');
const { grab } = require('../../../Engram Minds Eye/reference/golden/owl_eye.cjs');
const [dir] = process.argv.slice(1);
const req = JSON.parse(fs.readFileSync(0, 'utf8'));
const src = f => fs.readFileSync(path.join(dir, f), 'utf8');
const body = (f, names) => names.map(n => grab(src(f), n)).join('\n');
const CCN = ['subtle', 'enc', 'bufToHex', 'hexToBuf', 'sha256Hex', 'KEY_LATTICES', 'expandHolographic', 'shdccpCompress', 'canonicalParams',
    'deriveKeyVector', 'ALGO', 'SIGN', 'generateKeypair', 'importPriv', 'importPub', 'signPayload', 'verifyPayload', 'keyIdFromPublic', 'attestationPayload'];
const IRN = ['LATTICE_SPACES', 'sha256Bytes', 'expandToHolographicInverse', 'shdccpCompress', 'xorBlendHex', 'computeGeoVector', 'computeIdentityId'];
const CC = new Function(body('src/identity/crypto-core.js', CCN) + `\nreturn { ${CCN.join(', ')} };`)();
const IR = new Function(body('src/identity/identity-registry.js', IRN) + '\nreturn { computeIdentityId };')();
(async () => {
    const { identityId } = await IR.computeIdentityId(req.seed, req.uid);
    const keyVector = (await CC.deriveKeyVector(identityId, {}, req.epoch)).vector64;
    const kp = await CC.generateKeypair();
    const keyId = await CC.keyIdFromPublic(kp.publicJwk);
    const payload = CC.attestationPayload({ keyId, keyVector, contentHash: await CC.sha256Hex(req.content), epochToken: req.epoch });
    const sigs = [];
    for (let i = 0; i < 100; i++) sigs.push(await CC.signPayload(kp.privateJwk, payload));
    const pyOk = [];
    for (const b of req.blocks) pyOk.push(await CC.verifyPayload(req.jwk, CC.attestationPayload(b), b.sig));
    const pyKeyId = await CC.keyIdFromPublic(req.jwk);
    process.stdout.write(JSON.stringify({ identityId, keyVector, publicJwk: kp.publicJwk, keyId, payload, sigs, pyOk, pyKeyId }));
})().catch(e => { console.error(e); process.exit(1); });
'''


def test_against_biochain_ai_and_webcrypto():
    if not (NODE_OK and os.path.isdir(os.path.join(BIOCHAIN, 'src', 'identity'))):
        pytest.skip('needs node and the BioChain-AI checkout')
    ka = A.private_key(A.TRACE_KEYS['A'])
    ident = A.identity_id()
    ep = A.epoch_token('2000-01-01')
    kv = A.key_vector(ident, ep)
    content = 'LPREP/1|from python'
    blocks = [A.attest(ka, kv, content, ep, deterministic=False) for _ in range(50)]
    req = {'seed': A.IDENTITY_SEED, 'uid': A.UID, 'epoch': ep, 'content': content, 'jwk': A.jwk_of(ka.public_key()),
           'blocks': [{'keyId': b['keyId'], 'keyVector': b['keyVector'], 'contentHash': b['contentHash'],
                       'epochToken': b['epochToken'], 'sig': b['sig']} for b in blocks]}
    r = subprocess.run(['node', '-e', BIOCHAIN_JS, BIOCHAIN], input=json.dumps(req), capture_output=True, text=True,
                       cwd=HERE)
    assert r.returncode == 0, r.stderr
    js = json.loads(r.stdout)
    assert js['identityId'] == ident and js['keyVector'] == kv            # the registered seed and uid
    assert js['pyKeyId'] == A.key_id(req['jwk']) and all(js['pyOk'])      # Python's P1363 signatures in WebCrypto
    assert js['keyId'] == A.key_id(js['publicJwk'])
    assert js['payload'] == A.attestation_payload(js['keyId'], kv, A.sha256hex(content), ep)
    pub = A.pub_from_jwk(js['publicJwk'])
    assert all(A.verify_p1363(pub, bytes.fromhex(s), js['payload']) for s in js['sigs'])
    assert not any(A.verify_raw_as_der(pub, bytes.fromhex(s), js['payload'])[0] for s in js['sigs'])
