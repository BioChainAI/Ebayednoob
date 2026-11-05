#!/usr/bin/env python3
"""Hyperbolic Lexicon, Phase 0, spike S7, the Python half: BioChain-AI's ATTEST/1 attestation (ECDSA P-256 over
SHA-256) verified and produced with the `cryptography` library, across the P1363 / DER encoding boundary.

WHAT IT MEASURES. With no JS code, from the raw inputs:
  1. the spike's inputs recomputed: the synthetic shard from hpstep.prng.Rng(97000), the LPREP/1-style commitment
     string (15 pipe-joined fields, built as BioChain-AI's biomesh.js builds GROWN/1), its SHA-256 (the contentHash),
     BioChain's identityId (identity-registry.js computeIdentityId) and keyVector (crypto-core.js deriveKeyVector,
     the 64-bit SHD-CCP accumulator only), keyId = 'K-' + sha256(x|y)[0:24] over the JWK's base64url x and y, and
     the ATTEST/1 payload 'ATTEST/1|keyId|keyVector|contentHash|epochToken' (crypto-core.js attestationPayload);
  2. WebCrypto signatures (IEEE P1363 r||s, 64 bytes) verified after r||s -> DER with
     cryptography.hazmat.primitives.asymmetric.utils.encode_dss_signature; and the encoding control: the same bytes
     given raw, as if they were DER, must be rejected;
  3. tampering: every single-character substitution of the payload (by field), of the commitment (by field: the
     contentHash no longer matches and the signature over the rebuilt payload fails) and of the signature hex; the
     high-S twin (r, n - s); the right signature under a wrong key;
  4. Python's own key: JWK, keyId, 200 DER signatures converted to P1363 (r and s left-padded to 32 bytes) for the
     Node script to verify, plus one signature with r < 2^248 and one with s < 2^248 in both the padded and an
     unpadded (minimal-length) conversion, the bug control for the reverse direction;
  5. a deterministic golden attestation: RFC 6979 A.2.5's public P-256 test key and deterministic ECDSA
     (cryptography's deterministic_signing=True) reproduce the RFC's r and s for "sample", then sign this spike's
     ATTEST/1 payload under that key, so the signature is the same on every run (a known-answer vector, never a
     signing key);
  6. "~" timings: sign, verify, conversions and key loading, median of 200 after 20 warm-up runs.

HOW TO RUN.
  - s7_attestation.cjs starts it as  python3 -B -I s7_attestation.py --json  and writes one JSON request to its
    stdin (Node's public JWK, payload, the 200 timed signatures, two short-r/s signatures, the commitment and the
    values Node computed). This script answers with one JSON object on stdout (its report lines, its checks, its own
    key's signatures and the golden vector). No file is written; nothing goes through a temporary file.
  - Alone, as a self-test, from anywhere:  python3 -B -I "Pages/Hyperbolic Lexicon/spikes/s7_attestation.py"
    It then plays both sides with its own key (its signatures, converted to P1363, stand in for Node's), checks
    identityId, keyVector, the commitment hash and the golden signature against the values pinned below from
    s7_attestation.cjs's run of BioChain-AI's own JS, prints its report and ends with SELF-TEST: PASS or FAIL
    (exit status 0 or 1). Its standalone output is not captured to a file: s7_attestation_output.txt, written by
    the .cjs, already embeds the same report run on Node's signatures.
  -B -I: no bytecode is written and nothing from the environment is imported; hpstep (for Rng only) is imported in
  place from Pages/Hyperbolic Oracles/reference through an explicit sys.path entry. Lines that begin with "~ "
  depend on the machine, the runtime or the random key and are ignored on reruns.

WHAT IT SETTLES. With s7_attestation.cjs: L10's encoding control (Python must convert WebCrypto's P1363 r||s to
DER; without the conversion every valid signature is rejected) and L11's attestation cost term. It decides no
claim; it runs before PREREGISTRATION.md is written.

DATA AND SEEDS. Synthetic only, disjoint from every registered instance: one shard of synthetic words from
hpstep.prng.Rng(97000) (90000 + 7000; no other seed is used). The ECDSA keys and nonces come from OpenSSL's random
generator (keys are random by nature); every value that depends on them is printed on a "~" line. The golden vector
uses the published RFC 6979 test key and is deterministic. No WordNet data is read.

RUNTIME. Under 2 s (Python 3.13, cryptography 50.0.1).
"""
import base64
import hashlib
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HERE, '..', '..', 'Hyperbolic Oracles', 'reference')))
from hpstep.prng import Rng  # noqa: E402

import cryptography  # noqa: E402
from cryptography.exceptions import InvalidSignature  # noqa: E402
from cryptography.hazmat.backends.openssl import backend as OPENSSL  # noqa: E402
from cryptography.hazmat.primitives import hashes  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import ec  # noqa: E402
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature, encode_dss_signature  # noqa: E402

# ---- the spike's fixed inputs (the same constants are in s7_attestation.cjs)
SEED_TEXT = 97000
SHARD_LIMIT = 60000
EPOCH_TOKEN = 'EPOCH-OFFLINE-SPIKE'
IDENTITY_SEED = 'hyperbolic-lexicon spike S7 identity seed'
UID = 'spike-s7-uid'
N_TIMED, N_WARM = 200, 20
SHORT = 1 << 248                       # r or s below this has a leading zero byte in its 32-byte form
P256_N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551

# RFC 6979 A.2.5: P-256 test key; SHA-256, message "sample"
RFC_D = 0xC9AFA9D845BA75166B5C215767B1D6934E50C3DB36E89B127B8A622B120F6721
RFC_UX = 0x60FED4BA255A9D31C961EB74C6356D68C049B8923B61FA6CE669622E60F29FB6
RFC_UY = 0x7903FE1008B8BC99A41AE9E95628BC64F2F1B20C2D7E9F5177A3C294D4462299
RFC_R = 0xEFD48B2AACB6A8FD1140DD9CD45E81D69D2C877B56AAF991C34D0EA84EAF3716
RFC_S = 0xF7CB1C942D657C41D436C7A1B6E29F65F3E900DBB9AFF4064DC4AB2F843ACDA8

# Pinned from s7_attestation.cjs (BioChain-AI's own JS, name-grabbed); used by the standalone self-test only.
PINNED = {
    'identityId': '0x3576910B7E3DD241',
    'keyVector': 'AF95A64504223AA8',
    'shardSha': '92b10065af6d41824898acbd1005a44bb83b087257ca64e3bf2b6670ed51f360',
    'contentHash': 'e22ab274b7cd2aee8a1010fad90ae497911d7950894970f887de88ca1d573d03',
    'goldenSig': '7e2e8b3a888b2e935680ed76210739aa24ca7f2292db9d119e31a66b137baafa'
                 'b41f991fa7f8ca36f1dd755d8300422ff3eef1cad3c063393890929655daa272',
}

ECDSA_SHA256 = ec.ECDSA(hashes.SHA256())


def sha256hex(data):
    return hashlib.sha256(data.encode('utf-8') if isinstance(data, str) else data).hexdigest()


def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode('ascii')


def b64u_decode(s):
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))


# ---- BioChain-AI's identity and key-vector derivations (identity-registry.js, crypto-core.js), ported
def holographic(b32):
    """crypto-core.js expandHolographic / identity-registry.js expandToHolographicInverse: byte || NOT byte."""
    return bytes(b32) + bytes(0xFF ^ b for b in b32)


def vector64(bytes64):
    """shdccpCompress's 64-bit accumulator (the float coords and entropy are not part of any payload)."""
    acc = 0
    for x in range(4):
        for y in range(4):
            for z in range(4):
                v = bytes64[x * 16 + y * 4 + z]
                acc = (acc * 31 + v * (x + 1) * (y + 1) * (z + 1)) & 0xFFFFFFFFFFFFFFFF
    return format(acc, '016X')


def identity_id(seed, uid):
    """computeIdentityId: geoVector(seed.trim()) XOR the first 8 bytes of SHA-256(uid), '0x' + 16 upper hex."""
    geo = vector64(holographic(hashlib.sha256(seed.strip().encode('utf-8')).digest()))
    uid_hex = hashlib.sha256(uid.encode('utf-8')).digest()[:8].hex().upper()
    return '0x' + format(int(geo, 16) ^ int(uid_hex, 16), '016X')


def canonical_params():
    """canonicalParams({}): JSON.stringify of the six defaults in this key order, no spaces."""
    return json.dumps({'lattice': 'E8', 'hilbertDim': 64, 'modulus': 240, 'manifold': 'clifford',
                       'coherency': 0.75, 'torsion': 0.5}, separators=(',', ':'))


def key_vector(identity, epoch_token):
    """deriveKeyVector(identityId, {}, epochToken).vector64: it depends on the identity and epoch, not on the key."""
    seed = hashlib.sha256(f'{identity}|{canonical_params()}|{epoch_token}'.encode('utf-8')).digest()
    return vector64(holographic(seed))


def key_id(jwk):
    """keyIdFromPublic: 'K-' + sha256Hex(`${x}|${y}`).slice(0, 24), over the JWK's base64url strings."""
    return 'K-' + sha256hex(f"{jwk['x']}|{jwk['y']}")[:24]


def attestation_payload(kid, kvec, content_hash, epoch_token):
    """attestationPayload: ['ATTEST/1', keyId, keyVector, contentHash, epochToken].join('|')."""
    return '|'.join(['ATTEST/1', kid, kvec, content_hash, epoch_token])


# ---- the spike's synthetic shard and LPREP/1-style commitment (the same code is in s7_attestation.cjs)
CHARS = list('abcdefghijklmnopqrstuvwxyz') + ['é', 'ß', 'ñ', 'α', 'ж', '中', '語',
                                              '\U0001D538']


def synth_text(seed, limit=SHARD_LIMIT):
    """Words of 1-10 characters from CHARS (2-, 3- and 4-byte UTF-8 among them), each followed by '\\n' (1 in 12) or
    ' '; stops before the first word that would take the text past `limit` UTF-8 bytes."""
    rng, parts, n = Rng(seed), [], 0
    while True:
        length = 1 + rng.below(10)
        word = ''.join(CHARS[rng.below(len(CHARS))] for _ in range(length))
        piece = word + ('\n' if rng.below(12) == 0 else ' ')
        b = len(piece.encode('utf-8'))
        if n + b > limit:
            return ''.join(parts)
        parts.append(piece)
        n += b


def lprep_fields(text):
    """LPREP/1's fields in the design's order. Only byteLen and rawSha256 describe the shard; the others are labelled
    placeholders (SHA-256 of 'S7 placeholder <name>'), since the real values come from Phase 1 code."""
    ph = lambda name: sha256hex('S7 placeholder ' + name)  # noqa: E731
    raw = text.encode('utf-8')
    return [('format', 'LPREP/1'), ('corpusId', 'S7-SPIKE'), ('shardIndex', '0'),
            ('chainId', 'BC-' + ph('chainId')[:24]), ('merkleRoot', ph('merkleRoot')), ('byteLen', str(len(raw))),
            ('rawSha256', sha256hex(raw)), ('spdx', 'CC0-1.0'), ('sourceUrlSha', ph('sourceUrl')),
            ('lvocabHash', ph('LVOCAB/1')), ('idStreamSha256', ph('idStream')), ('laddrHash', ph('LADDR/1')),
            ('weave3Sha', ph('weave3')), ('engramStreamSha', ph('engramStream')), ('tier', 'S')]


def commitment_of(fields):
    return '|'.join(v for _, v in fields)


# ---- tampering: every position, one substitution each (the same rule is in s7_attestation.cjs)
def tamper_char(c):
    """Digits cycle 0-9, hex letters cycle a-f / A-F, other letters cycle g-z / G-Z, anything else has bit 0 of its
    code flipped. Never the identity; hex stays hex."""
    o = ord(c)
    if '0' <= c <= '8' or 'a' <= c <= 'e' or 'A' <= c <= 'E' or 'g' <= c <= 'y' or 'G' <= c <= 'Y':
        return chr(o + 1)
    return {'9': '0', 'f': 'a', 'F': 'A', 'z': 'g', 'Z': 'G'}.get(c, chr(o ^ 1))


def tamper_at(s, i):
    return s[:i] + tamper_char(s[i]) + s[i + 1:]


def segments(s, names):
    """(name, start, end) for each '|'-separated field, plus the separators as one group."""
    out, start = [], 0
    for name in names:
        end = s.find('|', start)
        end = len(s) if end < 0 else end
        out.append((name, start, end))
        start = end + 1
    return out


# ---- encodings
def p1363_to_der(sig):
    if len(sig) != 64:
        raise ValueError('P1363 P-256 signature must be 64 bytes')
    return encode_dss_signature(int.from_bytes(sig[:32], 'big'), int.from_bytes(sig[32:], 'big'))


def der_to_p1363(der):
    r, s = decode_dss_signature(der)
    return r.to_bytes(32, 'big') + s.to_bytes(32, 'big')


def der_to_p1363_unpadded(der):
    """The bug the control exposes: r and s written in minimal length, not left-padded to 32 bytes."""
    r, s = decode_dss_signature(der)
    return r.to_bytes((r.bit_length() + 7) // 8, 'big') + s.to_bytes((s.bit_length() + 7) // 8, 'big')


def pub_from_jwk(jwk):
    if jwk.get('kty') != 'EC' or jwk.get('crv') != 'P-256':
        raise ValueError('not a P-256 EC JWK')
    x, y = b64u_decode(jwk['x']), b64u_decode(jwk['y'])
    if len(x) != 32 or len(y) != 32:
        raise ValueError('JWK coordinates must be 32 bytes')
    return ec.EllipticCurvePublicNumbers(int.from_bytes(x, 'big'), int.from_bytes(y, 'big'),
                                         ec.SECP256R1()).public_key()


def jwk_of(pub):
    n = pub.public_numbers()
    return {'kty': 'EC', 'crv': 'P-256', 'x': b64u(n.x.to_bytes(32, 'big')), 'y': b64u(n.y.to_bytes(32, 'big'))}


def verify_der(pub, der, msg):
    try:
        pub.verify(der, msg.encode('utf-8'), ECDSA_SHA256)
        return True
    except InvalidSignature:
        return False


def verify_p1363(pub, sig, msg):
    """The verifier path: WebCrypto's r||s converted to DER, then verified."""
    try:
        der = p1363_to_der(sig)
    except ValueError:
        return False
    return verify_der(pub, der, msg)


def verify_raw_as_der(pub, sig, msg):
    """The control: P1363 bytes handed to cryptography unconverted. Returns (accepted, exception name)."""
    try:
        pub.verify(sig, msg.encode('utf-8'), ECDSA_SHA256)
        return True, None
    except Exception as e:  # noqa: BLE001  (record what cryptography raises)
        return False, type(e).__name__


def median_ms(fn, n=N_TIMED, warm=N_WARM):
    for _ in range(warm):
        fn()
    t = []
    for _ in range(n):
        t0 = time.perf_counter_ns()
        fn()
        t.append(time.perf_counter_ns() - t0)
    t.sort()
    return (t[n // 2 - 1] + t[n // 2]) / 2 / 1e6 if n % 2 == 0 else t[n // 2] / 1e6


def self_request():
    """Standalone self-test: Python plays the Node side with a key of its own."""
    k = ec.generate_private_key(ec.SECP256R1())
    jwk = jwk_of(k.public_key())
    text = synth_text(SEED_TEXT)
    commitment = commitment_of(lprep_fields(text))
    ident = identity_id(IDENTITY_SEED, UID)
    kvec = key_vector(ident, EPOCH_TOKEN)
    content_hash = sha256hex(commitment)
    payload = attestation_payload(key_id(jwk), kvec, content_hash, EPOCH_TOKEN)
    sign = lambda: der_to_p1363(k.sign(payload.encode('utf-8'), ECDSA_SHA256)).hex()  # noqa: E731
    sigs = [sign() for _ in range(N_TIMED)]
    short = {}
    for _ in range(20000):
        sh = sign()
        r, s = int(sh[:64], 16), int(sh[64:], 16)
        if r < SHORT and 'r' not in short:
            short['r'] = sh
        if s < SHORT and 's' not in short:
            short['s'] = sh
        if len(short) == 2:
            break
    return {'standalone': True, 'publicJwk': jwk, 'keyId': key_id(jwk), 'identityId': PINNED['identityId'],
            'keyVector': PINNED['keyVector'], 'shardSha': PINNED['shardSha'], 'commitment': commitment,
            'contentHash': PINNED['contentHash'] or content_hash, 'payload': payload, 'sig': sigs[0], 'sigs': sigs,
            'shortR': short.get('r'), 'shortS': short.get('s'), 'epochToken': EPOCH_TOKEN,
            'identitySeed': IDENTITY_SEED, 'uid': UID, 'seedText': SEED_TEXT}


def run(req):
    lines, checks = [], []
    say = lines.append

    def check(name, ok):
        checks.append([name, bool(ok)])
        return 'true' if ok else 'false'

    def mark(name, ok):
        checks.append([name, bool(ok)])
        return '' if ok else ' FAILED'

    other = 'this script\'s stand-in key' if req.get('standalone') else 'Node'
    say(f'~ Python {sys.version.split()[0]}, cryptography {cryptography.__version__}, {OPENSSL.openssl_version_text()}')

    # 1. inputs
    assert req['epochToken'] == EPOCH_TOKEN and req['identitySeed'] == IDENTITY_SEED and req['uid'] == UID
    assert req['seedText'] == SEED_TEXT
    text = synth_text(SEED_TEXT)
    raw = text.encode('utf-8')
    fields = lprep_fields(text)
    commitment = commitment_of(fields)
    ident = identity_id(IDENTITY_SEED, UID)
    kvec = key_vector(ident, EPOCH_TOKEN)
    content_hash = sha256hex(commitment)
    jwk = req['publicJwk']
    pub = pub_from_jwk(jwk)
    kid = key_id(jwk)
    payload = attestation_payload(kid, kvec, content_hash, EPOCH_TOKEN)
    say('P1. Inputs recomputed in Python from the raw inputs (no JS code)')
    say(f'  synthetic shard from hpstep.prng.Rng({SEED_TEXT}): {len(raw)} B, {len(text)} code points, '
        f'sha256 {sha256hex(raw)}; equal to {"the pinned value" if req.get("standalone") else "Node"}\'s: '
        f'{check("shard sha", sha256hex(raw) == req["shardSha"])}')
    say(f'  identityId (computeIdentityId port) {ident}: equal: {check("identityId", ident == req["identityId"])}')
    say(f'  canonicalParams({{}}) {canonical_params()}')
    say(f'  keyVector (deriveKeyVector port: SHA-256 of identityId|params|epochToken, holographic 64 bytes, SHD-CCP '
        f'accumulator) {kvec}: equal: {check("keyVector", kvec == req["keyVector"])}')
    say(f'  LPREP/1-style commitment: {len(fields)} fields, {len(commitment)} characters; equal: '
        f'{check("commitment", commitment == req["commitment"])}; contentHash = sha256(commitment) {content_hash}: '
        f'equal: {check("contentHash", content_hash == req["contentHash"])}')
    say(f'  keyId of {other}\'s public JWK recomputed (\'K-\' + sha256(x|y)[0:24]): equal: '
        f'{check("keyId", kid == req["keyId"])}')
    say(f'~   keyId {kid}')
    say(f'  ATTEST/1 payload rebuilt in Python: {len(payload)} characters; equal: '
        f'{check("payload", payload == req["payload"])}')

    # 2. the encoding boundary
    sig0 = bytes.fromhex(req['sig'])
    der0 = p1363_to_der(sig0)
    say(f'P2. {other}\'s WebCrypto-format signatures (P1363 r||s, 64 bytes) verified in Python '
        f'(cryptography ECDSA(SHA256), after encode_dss_signature)')
    say(f'  primary signature: {len(sig0)} bytes; DER-converted verifies: {check("primary", verify_der(pub, der0, payload))}; '
        f'the DER decodes back to the same r and s: {check("roundtrip", der_to_p1363(der0) == sig0)}')
    say(f'~   primary signature DER length {len(der0)} B')
    sigs = [bytes.fromhex(h) for h in req['sigs']]
    ok_conv = sum(verify_p1363(pub, s, payload) for s in sigs)
    raw_res = [verify_raw_as_der(pub, s, payload) for s in sigs]
    raw_acc = sum(a for a, _ in raw_res)
    raw_exc = sorted({e for _, e in raw_res if e})
    say(f'  the {len(sigs)} signatures of {other}\'s timed loop: verify after conversion {ok_conv}/{len(sigs)}'
        f'{mark("200 converted", ok_conv == len(sigs))}')
    say(f'  [L10 control] the same {len(sigs)} given raw, as if DER: accepted {raw_acc}/{len(sigs)}'
        f'{mark("200 raw rejected", raw_acc == 0)}; raised: {", ".join(raw_exc)}')
    ders = [p1363_to_der(s) for s in sigs]
    say(f'~   DER lengths of those {len(sigs)}: ' + ', '.join(f'{n} B x{sum(len(d) == n for d in ders)}'
                                                         for n in sorted({len(d) for d in ders})))
    for tag in ('shortR', 'shortS'):
        h = req.get(tag)
        if h is None:
            say(f'  {tag}: none was supplied {check(tag + " supplied", False)}')
            continue
        s = bytes.fromhex(h)
        r_, s_ = int.from_bytes(s[:32], 'big'), int.from_bytes(s[32:], 'big')
        short_ok = (r_ < SHORT) if tag == 'shortR' else (s_ < SHORT)
        acc, _ = verify_raw_as_der(pub, s, payload)
        say(f'  {other}\'s signature with {"r" if tag == "shortR" else "s"} < 2^248 (a leading zero byte in P1363): '
            f'is short: {check(tag + " short", short_ok)}; verifies after conversion: '
            f'{check(tag + " converted", verify_p1363(pub, s, payload))}; raw as DER accepted: '
            f'{"true" if acc else "false"}{mark(tag + " raw rejected", not acc)}')

    # 3. tampering
    say('P3. Tampering, every position once (rule: digits cycle 0-9, hex letters a-f / A-F, other letters g-z / G-Z, '
        'anything else bit 0 flipped)')
    pay_names = ['ATTEST/1', 'keyId', 'keyVector', 'contentHash', 'epochToken']
    segs = segments(payload, pay_names)
    sep_pos = [i for i, c in enumerate(payload) if c == '|']
    tampered_payloads = []
    for name, a, b in segs + [('separators', None, None)]:
        pos = sep_pos if name == 'separators' else range(a, b)
        rej = 0
        for i in pos:
            t = tamper_at(payload, i)
            tampered_payloads.append(t)
            rej += not verify_der(pub, der0, t)
        say(f'  payload {name} ({len(pos)} positions): rejected {rej}/{len(pos)}{mark("payload " + name, rej == len(pos))}')
    tp_digest = sha256hex('\n'.join(tampered_payloads))
    csegs = segments(commitment, [n for n, _ in fields])
    csep = [i for i, c in enumerate(commitment) if c == '|']
    tampered_commitments, tot_pos, tot_hash, tot_sig = [], 0, 0, 0
    per_field = []
    for name, a, b in csegs + [('separators', None, None)]:
        pos = csep if name == 'separators' else range(a, b)
        hdiff = srej = 0
        for i in pos:
            t = tamper_at(commitment, i)
            tampered_commitments.append(t)
            h = sha256hex(t)
            hdiff += h != content_hash
            srej += not verify_der(pub, der0, attestation_payload(kid, kvec, h, EPOCH_TOKEN))
        per_field.append(f'{name} {srej}/{len(pos)}')
        tot_pos += len(pos)
        tot_hash += hdiff
        tot_sig += srej
    say(f'  commitment, all {tot_pos} positions in {len(fields)} fields and {len(csep)} separators: contentHash differs '
        f'{tot_hash}/{tot_pos}, signature over the rebuilt payload rejected {tot_sig}/{tot_pos}'
        f'{mark("commitment tamper", tot_hash == tot_pos and tot_sig == tot_pos)}')
    say('    rejected by field: ' + ', '.join(per_field))
    tc_digest = sha256hex('\n'.join(tampered_commitments))
    say(f'    sha256 over the {tot_pos} tampered commitments, one per line: {tc_digest}')
    sig_hex = req['sig']
    srej = 0
    tampered_sigs = []
    for i in range(len(sig_hex)):
        t = tamper_at(sig_hex, i)
        tampered_sigs.append(t)
        srej += not verify_p1363(pub, bytes.fromhex(t), payload)
    say(f'  signature hex, {len(sig_hex)} positions: rejected {srej}/{len(sig_hex)}{mark("sig tamper", srej == len(sig_hex))}')
    r0, s0 = int.from_bytes(sig0[:32], 'big'), int.from_bytes(sig0[32:], 'big')
    twin = r0.to_bytes(32, 'big') + (P256_N - s0).to_bytes(32, 'big')
    twin_ok = verify_p1363(pub, twin, payload)
    say(f'  high-S twin (r, n - s) of the primary signature: accepted: {"true" if twin_ok else "false"} '
        f'(ECDSA is malleable and OpenSSL does not enforce low-S; signature bytes are not unique)')
    checks.append(['high-S twin accepted (measured fact)', True])
    pk = ec.generate_private_key(ec.SECP256R1())
    wrong = verify_der(pk.public_key(), der0, payload)
    say(f'  the primary signature under a different key (Python\'s own): accepted: {"true" if wrong else "false"}'
        f'{mark("wrong key rejected", not wrong)}')

    # 4. Python's own key
    pjwk = jwk_of(pk.public_key())
    pkid = key_id(pjwk)
    ppayload = attestation_payload(pkid, kvec, content_hash, EPOCH_TOKEN)
    pmsg = ppayload.encode('utf-8')
    say('P4. Python\'s own key (ec.generate_private_key(SECP256R1)): signatures returned to Node as P1363')
    say(f'  JWK x and y: {len(pjwk["x"])} and {len(pjwk["y"])} base64url characters (32 bytes each, left-padded); '
        f'keyId {len(pkid)} characters; payload {len(ppayload)} characters')
    say(f'~   keyId {pkid}')
    pders = []

    def psign():
        pders.append(pk.sign(pmsg, ECDSA_SHA256))
    t_sign = median_ms(psign)
    pders = pders[N_WARM:]
    p1363s = [der_to_p1363(d) for d in pders]
    self_ok = sum(verify_p1363(pk.public_key(), s, ppayload) for s in p1363s)
    say(f'  {len(pders)} DER signatures (the timed loop) converted to P1363: all 64 bytes: '
        f'{check("py p1363 len", all(len(s) == 64 for s in p1363s))}; verify again after the round trip: '
        f'{self_ok}/{len(p1363s)}{mark("py self verify", self_ok == len(p1363s))}')
    short, tries = {}, 0
    while len(short) < 2 and tries < 20000:
        d = pk.sign(pmsg, ECDSA_SHA256)
        tries += 1
        r, s = decode_dss_signature(d)
        if r < SHORT and 'r' not in short:
            short['r'] = d
        if s < SHORT and 's' not in short:
            short['s'] = d
    say(f'  searched for a signature with r < 2^248 and one with s < 2^248: found both: '
        f'{check("py short found", len(short) == 2)}')
    say(f'~   after {tries} signatures')
    shorts = {}
    for k_ in ('r', 's'):
        if k_ not in short:
            continue
        d = short[k_]
        good, bad = der_to_p1363(d), der_to_p1363_unpadded(d)
        shorts[k_] = {'der': d.hex(), 'p1363': good.hex(), 'unpadded': bad.hex()}
        say(f'  short {k_}: padded P1363 64 bytes verifies in Python: '
            f'{check("py short " + k_, verify_p1363(pk.public_key(), good, ppayload))}; the unpadded conversion is '
            f'shorter than 64 bytes: {check("py unpadded " + k_, len(bad) < 64)} (Node verifies both)')

    # 5. RFC 6979 known answer and the golden attestation
    say('P5. RFC 6979 A.2.5 known answer (P-256, SHA-256, message "sample") and a deterministic golden ATTEST/1')
    rk = ec.derive_private_key(RFC_D, ec.SECP256R1())
    rn = rk.public_key().public_numbers()
    say(f'  the RFC private key gives the RFC public key Ux, Uy: {check("rfc pub", (rn.x, rn.y) == (RFC_UX, RFC_UY))}')
    det = ec.ECDSA(hashes.SHA256(), deterministic_signing=True)
    rd = rk.sign(b'sample', det)
    say(f'  deterministic signing gives the RFC r and s: {check("rfc rs", decode_dss_signature(rd) == (RFC_R, RFC_S))}; '
        f'and again on a second call: {check("rfc repeat", rk.sign(b"sample", det) == rd)}')
    gjwk = jwk_of(rk.public_key())
    gkid = key_id(gjwk)
    gpayload = attestation_payload(gkid, kvec, content_hash, EPOCH_TOKEN)
    gder = rk.sign(gpayload.encode('utf-8'), det)
    gsig = der_to_p1363(gder)
    say(f'  golden attestation under the RFC test key (a known-answer vector, never a signing key):')
    say(f'    public JWK x {gjwk["x"]} y {gjwk["y"]}')
    say(f'    keyId {gkid}')
    say(f'    payload {gpayload}')
    say(f'    signature P1363 {gsig.hex()}')
    say(f'    signature DER   {gder.hex()} ({len(gder)} B)')
    say(f'    verifies in Python: {check("golden verify", verify_p1363(rk.public_key(), gsig, gpayload))}; '
        f'repeat signing gives the same bytes: {check("golden repeat", rk.sign(gpayload.encode("utf-8"), det) == gder)}')
    if req.get('standalone') and PINNED['goldenSig']:
        say(f'    equal to the pinned signature from s7_attestation.cjs\'s run: '
            f'{check("golden pinned", gsig.hex() == PINNED["goldenSig"])}')

    # 6. timings
    pub_k = pk.public_key()
    pder0 = pders[0]
    p13630 = p1363s[0]
    t = {
        'sign': t_sign,
        'sign_p1363': median_ms(lambda: der_to_p1363(pk.sign(pmsg, ECDSA_SHA256))),
        'verify_der': median_ms(lambda: pub_k.verify(pder0, pmsg, ECDSA_SHA256)),
        'verify_p1363': median_ms(lambda: verify_p1363(pub_k, p13630, ppayload)),
        'verify_jwk': median_ms(lambda: verify_p1363(pub_from_jwk(pjwk), p13630, ppayload)),
        'verify_node_jwk': median_ms(lambda: verify_p1363(pub_from_jwk(jwk), sig0, payload)),
        'conv': median_ms(lambda: p1363_to_der(p13630)),
        'hash': median_ms(lambda: attestation_payload(kid, kvec, sha256hex(commitment), EPOCH_TOKEN)),
        'step': median_ms(lambda: sha256hex(commitment) == content_hash and verify_p1363(
            pub_from_jwk(jwk), sig0, attestation_payload(kid, kvec, sha256hex(commitment), EPOCH_TOKEN))),
    }
    say(f'P6. Timings, median of {N_TIMED} after {N_WARM} warm-up runs (time.perf_counter_ns)')
    say(f'~   sign (DER) {t["sign"]:.4f} ms; sign + DER -> P1363 {t["sign_p1363"]:.4f} ms')
    say(f'~   verify DER, key loaded {t["verify_der"]:.4f} ms; P1363 -> DER + verify {t["verify_p1363"]:.4f} ms; '
        f'+ key loaded from the JWK each time {t["verify_jwk"]:.4f} ms ({other}\'s key: {t["verify_node_jwk"]:.4f} ms)')
    say(f'~   P1363 -> DER alone {t["conv"]:.4f} ms; sha256(commitment) + payload {t["hash"]:.4f} ms; the whole '
        f'attestation step (contentHash check, payload, JWK load, conversion, verify) {t["step"]:.4f} ms')
    return {
        'lines': lines, 'checks': checks, 'timing': t,
        'digests': {'tamperedPayloads': tp_digest, 'tamperedCommitments': tc_digest,
                    'tamperedSigs': sha256hex('\n'.join(tampered_sigs))},
        'highS': twin_ok,
        'py': {'publicJwk': pjwk, 'keyId': pkid, 'payload': ppayload,
               'sigsP1363': [s.hex() for s in p1363s], 'sigsDer': [d.hex() for d in pders], 'short': shorts},
        'golden': {'publicJwk': gjwk, 'keyId': gkid, 'payload': gpayload, 'sigP1363': gsig.hex(), 'sigDer': gder.hex(),
                   'sampleP1363': der_to_p1363(rd).hex()},
    }


def main():
    if '--json' in sys.argv[1:]:
        req = json.loads(sys.stdin.read())
        sys.stdout.write(json.dumps(run(req)))
        return 0
    print('S7 s7_attestation.py standalone self-test: ATTEST/1 with ECDSA P-256 in Python cryptography, across the '
          'P1363 / DER boundary (this script plays both sides)')
    res = run(self_request())
    for line in res['lines']:
        print(line)
    bad = [n for n, ok in res['checks'] if not ok]
    print(f'checks passed: {len(res["checks"]) - len(bad)}/{len(res["checks"])}' + (f'; failed: {", ".join(bad)}' if bad else ''))
    print('SELF-TEST: ' + ('PASS' if not bad else 'FAIL'))
    return 0 if not bad else 1


if __name__ == '__main__':
    sys.exit(main())
