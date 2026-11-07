"""ATTEST/1 in Python (Phase 3; L10; Amendment 7 item 6): BioChain-AI's attestation format, verified with the
`cryptography` library across the IEEE P1363 / DER boundary, as spike S7 settled it.

BioChain-AI (c975161) src/identity: the payload is 'ATTEST/1|keyId|keyVector|contentHash|epochToken'
(crypto-core.js attestationPayload) with contentHash = sha256Hex(the commitment string), keyId = 'K-' +
sha256Hex(`${x}|${y}`)[0:24] over the public JWK's base64url x and y (keyIdFromPublic), keyVector =
deriveKeyVector(identityId, params, epochToken).vector64 and identityId = computeIdentityId(seed, uid) (ported below
from identity-registry.js and crypto-core.js, as S7's s7_attestation.py ported them; the shdccpCompress float
coordinates are not part of any payload). The signature is ECDSA P-256 over SHA-256 of the payload's UTF-8, carried
as WebCrypto writes it: IEEE P1363 r || s, 64 bytes, 128 hex digits. `cryptography` verifies DER, so a P1363
signature is converted first; DER back to P1363 left-pads r and s to 32 bytes (a short r or s occurs in about 1
signature in 128). verify_raw_as_der is L10's control 2 (the conversion skipped). ECDSA is malleable: the high-S twin
(r, n - s) of a valid signature also verifies, so nothing is keyed by signature bytes.

    identity_id(seed, uid), key_vector(identity, epoch_token), key_id(jwk), attestation_payload(...), epoch_token(date)
    p1363_to_der(sig), der_to_p1363(der), der_to_p1363_unpadded(der), high_s_twin(sig)
    pub_from_jwk(jwk), jwk_of(public_key), private_key(d)
    verify_p1363(pub, sig, payload), verify_raw_as_der(pub, sig, payload), sign_p1363(priv, payload, deterministic)
    attest(priv, jwk, key_vector, content, epoch_token)          an ATTEST/1 block {keyId, keyVector, contentHash,
                                                                 epochToken, sig}
    snapshot_text(entries), load_snapshot(text, pinned_sha)      the key-registry snapshot (keyId, public JWK,
                                                                 keyVector, status), pinned by its SHA-256
    verify_attestation(block, content, registry)                 (ok, reason, registry entry)
    TRACE_KEYS                                                   fixed test keys for traces and tests only (RFC 6979
                                                                 A.2.5's published key and one derived from a label)
"""
import base64
import hashlib
import json
import re

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature, encode_dss_signature

P256_N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
ECDSA_SHA256 = ec.ECDSA(hashes.SHA256())
ECDSA_SHA256_DET = ec.ECDSA(hashes.SHA256(), deterministic_signing=True)
IDENTITY_SEED = 'hyperbolic-lexicon/phase3'          # Amendment 7 item 6
UID = 'lexicon'
STATUSES = ('active', 'revoked', 'retired')
_SIG = re.compile(r'[0-9A-Fa-f]{128}')

# Fixed keys for traces and tests: never a registered key (Amendment 7 item 6 makes the run's keys per run).
# A: RFC 6979 A.2.5's published P-256 test key (spike S7's golden vector); B: d = SHA-256('hyperbolic-lexicon trace
# key B') mod (n - 1) + 1.
RFC6979_D = 0xC9AFA9D845BA75166B5C215767B1D6934E50C3DB36E89B127B8A622B120F6721
TRACE_KEYS = {
    'A': RFC6979_D,
    'B': int.from_bytes(hashlib.sha256(b'hyperbolic-lexicon trace key B').digest(), 'big') % (P256_N - 1) + 1,
}


def sha256hex(s):
    return hashlib.sha256(s.encode('utf-8') if isinstance(s, str) else bytes(s)).hexdigest()


def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode('ascii')


def b64u_decode(s):
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))


# ================================================================ BioChain's identity and key vector (ported)
def _holographic(b32):
    """expandHolographic / expandToHolographicInverse: the 32 bytes, then each byte's complement."""
    return bytes(b32) + bytes(0xFF ^ b for b in b32)


def _vector64(bytes64):
    """shdccpCompress's 64-bit accumulator: acc = acc * 31 + v (x+1)(y+1)(z+1) over the 4x4x4 cube, 16 upper hex."""
    acc = 0
    for x in range(4):
        for y in range(4):
            for z in range(4):
                acc = (acc * 31 + bytes64[x * 16 + y * 4 + z] * (x + 1) * (y + 1) * (z + 1)) & 0xFFFFFFFFFFFFFFFF
    return format(acc, '016X')


def identity_id(seed=IDENTITY_SEED, uid=UID):
    """computeIdentityId(seed, uid): geoVector(seed.trim()) XOR the first 8 bytes of SHA-256(uid), '0x' + 16 upper hex."""
    seed = seed.strip()
    if not seed:
        raise ValueError('Identity seed is empty')
    geo = _vector64(_holographic(hashlib.sha256(seed.encode('utf-8')).digest()))
    uid8 = hashlib.sha256(uid.encode('utf-8')).digest()[:8].hex().upper()
    return '0x' + format(int(geo, 16) ^ int(uid8, 16), '016X')


def canonical_params():
    """canonicalParams({}): the six defaults, JSON without spaces, in this key order."""
    return json.dumps({'lattice': 'E8', 'hilbertDim': 64, 'modulus': 240, 'manifold': 'clifford',
                       'coherency': 0.75, 'torsion': 0.5}, separators=(',', ':'))


def key_vector(identity, epoch):
    """deriveKeyVector(identityId, {}, epochToken).vector64 (it does not depend on the ECDSA key)."""
    return _vector64(_holographic(hashlib.sha256(f'{identity}|{canonical_params()}|{epoch}'.encode('utf-8')).digest()))


def key_id(jwk):
    """keyIdFromPublic: 'K-' + sha256Hex(`${x}|${y}`).slice(0, 24)."""
    return 'K-' + sha256hex(f"{jwk['x']}|{jwk['y']}")[:24]


def attestation_payload(kid, kvec, content_hash, epoch):
    return '|'.join(['ATTEST/1', kid, kvec, content_hash, epoch])


def epoch_token(date):
    """'EPOCH-OFFLINE-<UTC date>'. READING: the date is written YYYY-MM-DD (a datetime.date or such a string)."""
    d = date if isinstance(date, str) else date.isoformat()
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', d):
        raise ValueError(f'not a YYYY-MM-DD date: {d!r}')
    return 'EPOCH-OFFLINE-' + d


# ================================================================ keys and encodings
def pub_from_jwk(jwk):
    if jwk.get('kty') != 'EC' or jwk.get('crv') != 'P-256':
        raise ValueError('not a P-256 EC JWK')
    x, y = b64u_decode(jwk['x']), b64u_decode(jwk['y'])
    if len(x) != 32 or len(y) != 32:
        raise ValueError('JWK coordinates must be 32 bytes')
    return ec.EllipticCurvePublicNumbers(int.from_bytes(x, 'big'), int.from_bytes(y, 'big'),
                                         ec.SECP256R1()).public_key()


def jwk_of(pub):
    """The public JWK as {kty, crv, x, y} (x and y left-padded to 32 bytes, base64url)."""
    n = pub.public_numbers()
    return {'kty': 'EC', 'crv': 'P-256', 'x': b64u(n.x.to_bytes(32, 'big')), 'y': b64u(n.y.to_bytes(32, 'big'))}


def private_key(d):
    return ec.derive_private_key(d, ec.SECP256R1())


def p1363_to_der(sig):
    """WebCrypto's r || s (64 bytes) as DER (encode_dss_signature)."""
    sig = bytes(sig)
    if len(sig) != 64:
        raise ValueError('a P1363 P-256 signature is 64 bytes')
    return encode_dss_signature(int.from_bytes(sig[:32], 'big'), int.from_bytes(sig[32:], 'big'))


def der_to_p1363(der):
    """DER back to r || s, each left-padded to 32 bytes."""
    r, s = decode_dss_signature(bytes(der))
    return r.to_bytes(32, 'big') + s.to_bytes(32, 'big')


def der_to_p1363_unpadded(der):
    """The bug S7's control exposes: r and s in minimal length (under 64 bytes when r or s < 2^248)."""
    r, s = decode_dss_signature(bytes(der))
    return r.to_bytes((r.bit_length() + 7) // 8, 'big') + s.to_bytes((s.bit_length() + 7) // 8, 'big')


def high_s_twin(sig):
    """(r, n - s): the other valid encoding of the same ECDSA signature."""
    sig = bytes(sig)
    s = int.from_bytes(sig[32:], 'big')
    return sig[:32] + (P256_N - s).to_bytes(32, 'big')


def verify_der(pub, der, payload):
    try:
        pub.verify(bytes(der), payload.encode('utf-8'), ECDSA_SHA256)
        return True
    except (InvalidSignature, ValueError):
        return False


def verify_p1363(pub, sig, payload):
    """The verifier's path: r || s converted to DER, then ECDSA P-256 / SHA-256 over the payload's UTF-8."""
    try:
        der = p1363_to_der(sig)
    except ValueError:
        return False
    return verify_der(pub, der, payload)


def verify_raw_as_der(pub, sig, payload):
    """L10's control 2: the P1363 bytes handed to cryptography unconverted. (accepted, exception name or None)."""
    try:
        pub.verify(bytes(sig), payload.encode('utf-8'), ECDSA_SHA256)
        return True, None
    except Exception as e:  # noqa: BLE001  (what cryptography raises is reported)
        return False, type(e).__name__


def sign_p1363(priv, payload, deterministic=True):
    """A signature as WebCrypto carries it (P1363, 64 bytes). deterministic=True is RFC 6979 (traces and tests)."""
    der = priv.sign(payload.encode('utf-8'), ECDSA_SHA256_DET if deterministic else ECDSA_SHA256)
    return der_to_p1363(der)


def attest(priv, kvec, content, epoch, deterministic=True):
    """An ATTEST/1 block for a commitment string: {keyId, keyVector, contentHash, epochToken, sig (P1363 hex)}."""
    jwk = jwk_of(priv.public_key())
    kid = key_id(jwk)
    ch = sha256hex(content)
    sig = sign_p1363(priv, attestation_payload(kid, kvec, ch, epoch), deterministic)
    return {'keyId': kid, 'keyVector': kvec, 'contentHash': ch, 'epochToken': epoch, 'sig': sig.hex()}


# ================================================================ the key-registry snapshot
def registry_entry(jwk, kvec, status):
    if status not in STATUSES:
        raise ValueError(f'unknown key status {status!r}')
    return {'keyId': key_id(jwk), 'publicJwk': {'kty': jwk['kty'], 'crv': jwk['crv'], 'x': jwk['x'], 'y': jwk['y']},
            'keyVector': kvec, 'status': status}


def snapshot_text(entries):
    """The registry snapshot as written with a run.

    READING: a JSON array (JSON.stringify, no spaces) of {keyId, publicJwk: {kty, crv, x, y}, keyVector, status},
    in that key order, entries sorted by keyId; it is pinned by the SHA-256 of this text's UTF-8."""
    rows = sorted((registry_entry(e['publicJwk'], e['keyVector'], e['status']) for e in entries),
                  key=lambda e: e['keyId'])
    if len({e['keyId'] for e in rows}) != len(rows):
        raise ValueError('two registry entries share a keyId')
    return json.dumps(rows, separators=(',', ':'), ensure_ascii=False)


def load_snapshot(text, pinned_sha):
    """{keyId: entry} from a snapshot text, refused unless its SHA-256 is the pinned one and every entry's keyId is
    its JWK's and its status a known one."""
    if sha256hex(text) != pinned_sha:
        raise ValueError('the registry snapshot is not the pinned one')
    out = {}
    for e in json.loads(text):
        if registry_entry(e['publicJwk'], e['keyVector'], e['status']) != e:
            raise ValueError(f'a malformed registry entry: {e.get("keyId")!r}')
        out[e['keyId']] = e
    return out


_PUB_CACHE = {}


def _pub(entry):
    """The entry's public key, cached by keyId and JWK (never by anything a package carries)."""
    k = (entry['keyId'], entry['publicJwk']['x'], entry['publicJwk']['y'])
    if k not in _PUB_CACHE:
        _PUB_CACHE[k] = pub_from_jwk(entry['publicJwk'])
    return _PUB_CACHE[k]


def verify_attestation(block, content, registry):
    """An ATTEST/1 block against a commitment string and the registry (BioChain's verifyAttestationAgainstContent,
    with the registry snapshot in place of Firestore): (ok, reason, entry). The signer is the registry's entry for
    block.keyId; the payload is rebuilt with the registry's keyVector; only an 'active' key verifies."""
    keys = ('keyId', 'keyVector', 'contentHash', 'epochToken', 'sig')
    if not isinstance(block, dict) or not all(isinstance(block.get(k), str) for k in keys):
        return False, 'malformed attestation block', None
    entry = registry.get(block['keyId'])
    if entry is None:
        return False, 'unknown key', None
    if entry['status'] != 'active':
        return False, f"key {entry['status']}", entry
    if block['keyVector'] != entry['keyVector']:
        return False, 'key-vector mismatch', entry
    if block['contentHash'] != sha256hex(content):
        return False, 'content does not match attestation', entry
    if not _SIG.fullmatch(block['sig']):
        return False, 'signature is not 128 hex digits', entry
    payload = attestation_payload(block['keyId'], entry['keyVector'], block['contentHash'], block['epochToken'])
    if not verify_p1363(_pub(entry), bytes.fromhex(block['sig']), payload):
        return False, 'signature invalid', entry
    return True, 'verified', entry
