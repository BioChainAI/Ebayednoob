"""The hardened, attested import (Phase 3; L10, L11; Amendment 7 item 6): packages, the verifier, and the tamper
helpers of T1-T9.

A package is a JSON object (keys in this order):
    record       the biochain record (Owl's fields)
    lprep        its LPREP/1 string
    salt         Tier P only: the salt, 64 lowercase hex digits
    attestation  the ATTEST/1 block {keyId, keyVector, contentHash, epochToken, sig (P1363, 128 hex digits)}
    lcorpus      the LCORPUS/1 string
    inclusion    the inclusion proof of SHA-256(lprep) at position shardIndex: a list of 64-hex-digit hashes
    lgrow        an LGROW/1 string from N - 1 shards to N
    consistency  its consistency proof: a list of 64-hex-digit hashes

verify(package, session) runs L10's hardened checks in the registered order and returns
{'selfConsistent', 'authentic', 'failed'} (failed: the name of the first check that failed, or '-'), plus 'checks'
([(name, True | False | None, detail)], None for a check not run) and 'signer' (the registry's keyId, or None).
The checks, in order:

    parity       the stream parses as shdccp/2 (lexicon.chain.frames' strict framing; streamVersion 'shdccp/2'),
                 at least one frame, every packet's parity holds
    canonical    the chunk lengths are the 720-byte cut (every frame 720 bytes but the last, 1..720; at most 60,000
                 in all); each residual decodes, and re-encoding the chunk gives the stored residual byte for byte;
                 the stream re-framed from its packets and residuals is the stored stream
    crystal      crystallize(chunk) is the stored packet, for every frame
    leaves       leafHashes and merkleRoot are present and equal the values recomputed with the JS rules
    weaves       weaveChiral, weaveMirror, segCuts, segments and chainId equal the recomputed ones
    derived      the engram layer (if the record has one: engramStream, engramCount, engramMeanJ; else none of the
                 three fields), origBytes, shippedBytes and value; the V0 id stream and the exact weave are
                 recomputed (norm 5^(28K), unfold to the leaf prefixes, the segCuts sub-weaves multiply to it)
    commitment   the LPREP/1 string equals the one rebuilt from the recomputed fields, the session's LVOCAB and
                 LADDR hashes and the string's own corpusId, shardIndex, spdx and sourceUrlSha (Tier P: the salted
                 root recomputed with the package's salt)
    attestation  the ATTEST/1 block verifies against SHA-256(lprep) and the pinned registry snapshot (an unknown,
                 revoked or retired key, a key-vector mismatch, another commitment or a bad signature fail)
    inclusion    LCORPUS/1 parses, its corpusId is the LPREP's, and the inclusion proof of SHA-256(lprep) at
                 position shardIndex verifies against its root (RFC 9162)
    consistency  LGROW/1 parses, names the same corpus, grows from N - 1 to N ending in the LCORPUS root, its
                 proofSha is the proof's, and the consistency proof verifies (RFC 9162)

The verdicts (Amendment 8 item 3, Explainer 4's definition from Phase 0): selfConsistent is "parity .. commitment,
inclusion and consistency all pass" (the record, its derived layers and its place in the manifest agree: steps 1-6
and 8) and authentic is "the attestation passes" (step 7). The checks run in the registered order: parity ..
commitment stop at the first failure; attestation, inclusion and consistency always run. A package is accepted when
both hold, i.e. failed is '-'.
The record's other fields (beyond Owl's) are ignored.

The session (Session) holds what a holder pins: the vocabulary (V0), the LVOCAB/1 string, the LADDR/1 string (its
addrTableRoot recomputed once per session, Amendment 7 item 7) and the registry snapshot with its pinned SHA-256.
"""
import copy
import hashlib
import math
import re
import time

from . import attest, chain, manifest, records

CHECKS = ('parity', 'canonical', 'crystal', 'leaves', 'weaves', 'derived', 'commitment', 'attestation', 'inclusion',
          'consistency')
SELF_CHECKS = CHECKS[:7]
AUTH_CHECKS = CHECKS[7:]
PACKAGE_KEYS = ('record', 'lprep', 'salt', 'attestation', 'lcorpus', 'inclusion', 'lgrow', 'consistency')
_HEX64 = re.compile(r'[0-9a-f]{64}')


class Session:
    """What a verifying holder pins once per session."""

    def __init__(self, vocab, lvocab_string, laddr_string, registry_text, registry_sha):
        self.vocab = vocab
        self.lvocab = lvocab_string
        self.laddr = laddr_string
        self.lvocab_hash = records.record_hash(lvocab_string)
        self.laddr_hash = records.record_hash(laddr_string)
        self.registry = attest.load_snapshot(registry_text, registry_sha)
        self.registry_sha = registry_sha


def _is_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _num_eq(x, y):
    """JavaScript's === on two numbers (and false for anything that is not one)."""
    return _is_num(x) and _is_num(y) and x == y


def _proof(p):
    if not isinstance(p, list) or not all(isinstance(h, str) and _HEX64.fullmatch(h) for h in p):
        raise ValueError('a proof is a list of 64-hex-digit hashes')
    return [bytes.fromhex(h) for h in p]


# ================================================================ the verifier
def verify(package, session, skip=(), times=None):
    """L10's hardened verification of one package. skip: names of checks not to run (L11's control skips
    'attestation'); a skipped check is reported as None and does not count against the verdict. times: a dict that
    receives each check's milliseconds (L11's breakdown by step)."""
    checks = []
    st = {}

    def run(name, fn):
        if name in skip:
            checks.append((name, None, 'skipped'))
            return True
        t0 = time.perf_counter()
        try:
            ok, detail = fn()
        except Exception as e:  # noqa: BLE001  (a malformed package fails the check it breaks)
            ok, detail = False, f'{type(e).__name__}: {e}'
        if times is not None:
            times[name] = times.get(name, 0.0) + (time.perf_counter() - t0) * 1000
        checks.append((name, bool(ok), detail))
        return bool(ok)

    rec = package.get('record') if isinstance(package, dict) else None
    lp = package.get('lprep') if isinstance(package, dict) else None

    def c_parity():
        if not isinstance(rec, dict) or rec.get('streamVersion') != chain.STREAM_VERSION:
            return False, 'no shdccp/2 record'
        fr = chain.frames(rec.get('stream'))
        if not fr:
            return False, 'no frames'
        bad = [i for i, (_, _, u) in enumerate(fr) if not u['parityOk']]
        st['frames'] = fr
        return not bad, f'packet {bad[0]} parity failed' if bad else f'{len(fr)} frames'

    def c_canonical():
        fr = st['frames']
        lens = [u['chunkLen'] for _, _, u in fr]
        K = len(lens)
        if any(n != chain.CHUNK for n in lens[:-1]) or not 1 <= lens[-1] <= chain.CHUNK or sum(lens) > chain.MAX_GROW_BYTES:
            return False, 'the chunk lengths are not the 720-byte cut'
        chunks = []
        for i, (_, res, u) in enumerate(fr):
            c = chain.decode_chunk(res, u['chunkLen'])
            if chain.encode_chunk(c) != res:
                return False, f'frame {i}: the residual is not the canonical encoding of its chunk'
            chunks.append(c)
        if chain.frame_stream([p for p, _, _ in fr], [r for _, r, _ in fr]) != rec['stream']:
            return False, 'the stream is not canonically framed'
        st['chunks'] = chunks
        st['data'] = bytes(b for c in chunks for b in c)
        return True, f'{K} chunks, {len(st["data"])} B'

    def c_crystal():
        bad = [i for i, ((p, _, _), c) in enumerate(zip(st['frames'], st['chunks'])) if chain.crystallize(c) != p]
        return not bad, f'packet {bad[0]} is not crystallize(chunk)' if bad else 'every packet'

    def c_leaves():
        lh = rec.get('leafHashes')
        if not isinstance(lh, list) or 'merkleRoot' not in rec:
            return False, 'leafHashes and merkleRoot are mandatory'
        leaves = [chain.leaf_hash(i, c) for i, c in enumerate(st['chunks'])]
        root = chain.merkle_shdccp2(leaves) or chain.sha256hex('empty')
        st['leaves'], st['root'] = leaves, root
        if lh != leaves:
            return False, 'leafHashes differ from the recomputed leaves'
        return rec['merkleRoot'] == root, 'merkleRoot' + ('' if rec['merkleRoot'] == root else ' mismatch')

    def c_weaves():
        wf, wm = chain.weaves(st['chunks'])
        chiral, mirror = chain.quat_hex(wf), chain.quat_hex(wm)
        cuts = chain.seg_cuts(len(st['chunks']))
        cid = chain.chain_id(st['root'], chiral)
        st['chainId'] = cid
        bad = [n for n, ok in (('weaveChiral', rec.get('weaveChiral') == chiral),
                               ('weaveMirror', rec.get('weaveMirror') == mirror),
                               ('segCuts', isinstance(rec.get('segCuts'), list) and len(rec['segCuts']) == len(cuts)
                                and all(_num_eq(a, b) for a, b in zip(rec['segCuts'], cuts))),
                               ('segments', _num_eq(rec.get('segments'), chain.SEGMENTS)),
                               ('chainId', rec.get('chainId') == cid)) if not ok]
        return not bad, (', '.join(bad) + ' mismatch') if bad else 'weaves and chainId'

    def c_derived():
        data = st['data']
        bad = []
        if 'engramStream' in rec or 'engramCount' in rec or 'engramMeanJ' in rec:
            eng = chain.engram_stream(data.decode('utf-8', 'replace'))
            if not (rec.get('engramStream') == eng['stream'] and _num_eq(rec.get('engramCount'), eng['count'])
                    and _num_eq(rec.get('engramMeanJ'), eng['meanJ'])):
                bad.append('engram layer')
            elen = len(eng['stream'])
        else:
            elen = 0
        ship = len(rec['stream']) / 2 + elen / 2 + len(st['leaves']) * 32 + 40
        if not _num_eq(rec.get('origBytes'), len(data)):
            bad.append('origBytes')
        if not _num_eq(rec.get('shippedBytes'), int(math.floor(ship + 0.5))):
            bad.append('shippedBytes')
        if not _num_eq(rec.get('value'), float(chain.js_to_fixed(len(data) / ship, 4))):
            bad.append('value')
        q = chain.exact_weave(st['leaves'])
        norm_ok, unfold_ok, seg_ok = chain.exact_weave_checks(st['leaves'], chain.seg_cuts(len(st['leaves'])), q)
        if not (norm_ok and unfold_ok and seg_ok):
            bad.append('exact weave')
        st['weave3'] = q
        st['idStreamSha256'] = records.id_stream_sha(data, session.vocab)
        return not bad, (', '.join(bad) + ' mismatch') if bad else 'engram layer, sizes, id stream, exact weave'

    def c_commitment():
        f, salted = records.parse_lprep(lp)
        mine = {'corpusId': f['corpusId'], 'shardIndex': f['shardIndex'], 'spdx': f['spdx'],
                'sourceUrlSha': f['sourceUrlSha'], 'lvocabHash': session.lvocab_hash, 'laddrHash': session.laddr_hash,
                'chainId': st['chainId'], 'merkleRoot': st['root'], 'byteLen': str(len(st['data'])),
                'rawSha256': records.sha256hex(st['data']), 'idStreamSha256': st['idStreamSha256'],
                'weave3Sha': chain.weave3_sha(st['weave3']), 'engramStreamSha': records.engram_stream_sha(rec)}
        if salted is None:
            want = records.lprep(mine)
        else:
            salt = package.get('salt')
            if not isinstance(salt, str) or not _HEX64.fullmatch(salt):
                return False, 'a Tier-P record needs its salt'
            want = records.lprep(mine, records.TIER_P, salt)
        if want == lp:
            return True, 'LPREP/1 recomputed'
        diff = [k for k in records.LPREP_FIELDS if records.parse_lprep(want)[0][k] != f[k]]
        return False, 'LPREP/1 differs in ' + (', '.join(diff) if diff else 'saltedRoot')

    def c_attestation():
        ok, reason, entry = attest.verify_attestation(package.get('attestation'), lp, session.registry)
        if ok:
            st['signer'] = entry['keyId']
        return ok, reason

    def c_inclusion():
        f, _ = records.parse_lprep(lp)
        lc = records.parse_lcorpus(package.get('lcorpus'))
        if lc['corpusId'] != f['corpusId']:
            return False, 'LCORPUS names another corpus'
        idx = records._dec(f['shardIndex'])
        leaf = manifest.leaf_hash(hashlib.sha256(lp.encode('utf-8')).digest())
        ok = manifest.verify_inclusion(idx, lc['N'], leaf, _proof(package.get('inclusion')), bytes.fromhex(lc['root']))
        st['lcorpus'] = lc
        return ok, f'shard {idx} of {lc["N"]}'

    def c_consistency():
        lc = st.get('lcorpus') or records.parse_lcorpus(package.get('lcorpus'))
        g = records.parse_lgrow(package.get('lgrow'))
        proof = _proof(package.get('consistency'))
        if g['corpusId'] != lc['corpusId'] or g['N_new'] != lc['N'] or g['root_new'] != lc['root']:
            return False, 'LGROW does not end at the LCORPUS root'
        if g['N_old'] != lc['N'] - 1:
            return False, 'LGROW does not grow from N - 1'
        if g['proofSha'] != records.proof_sha(proof):
            return False, 'proofSha mismatch'
        if g['N_old'] == 0:
            ok = not proof and g['root_old'] == manifest.EMPTY.hex()
        else:
            ok = manifest.verify_consistency(g['N_old'], g['N_new'], bytes.fromhex(g['root_old']),
                                             bytes.fromhex(g['root_new']), proof)
        return ok, f'{g["N_old"]} -> {g["N_new"]}'

    for name, fn in zip(SELF_CHECKS, (c_parity, c_canonical, c_crystal, c_leaves, c_weaves, c_derived, c_commitment)):
        if not run(name, fn):
            break
    for name in SELF_CHECKS[len(checks):]:
        checks.append((name, None, 'not run'))
    for name, fn in zip(AUTH_CHECKS, (c_attestation, c_inclusion, c_consistency)):
        run(name, fn)
    by = {n: ok for n, ok, _ in checks}
    failed = next((n for n, ok, _ in checks if ok is False), '-')
    return {'selfConsistent': all(by[n] is not False for n in SELF_CHECKS + ('inclusion', 'consistency')),
            'authentic': by['attestation'] is not False,
            'failed': failed, 'checks': checks, 'signer': st.get('signer')}


def verdict_text(v):
    """'selfConsistent authentic failed' as the traces write a verdict."""
    return f"{'true' if v['selfConsistent'] else 'false'} {'true' if v['authentic'] else 'false'} {v['failed']}"


# ================================================================ packages
def make_package(record, lprep_string, block, lcorpus_string, inclusion, lgrow_string, consistency, salt_hex=None):
    """A package with its keys in PACKAGE_KEYS order (salt only for Tier P); proofs as lists of hex strings."""
    pkg = {'record': record, 'lprep': lprep_string}
    if salt_hex is not None:
        pkg['salt'] = salt_hex
    pkg.update({'attestation': block, 'lcorpus': lcorpus_string, 'inclusion': [h.hex() for h in inclusion],
                'lgrow': lgrow_string, 'consistency': [h.hex() for h in consistency]})
    return pkg


def corpus_packages(shards, corpus_id, spdx, source_url_shas, session, priv, kvec, epoch, tier=records.TIER_S,
                    salts=None, deterministic=True):
    """Packages for a corpus. shards: [(record, UTF-8 data)] in shard order; one LPREP/1 each (Tier S, or Tier P with
    salts[j]); LCORPUS/1 over all; LGROW/1 from N - 1; each LPREP attested by priv. Returns (packages, lpreps,
    lcorpus string, lgrow string)."""
    lpreps = []
    for j, (rec, data) in enumerate(shards):
        f = records.lprep_fields(rec, data, session.vocab, corpus_id, j, spdx, source_url_shas[j],
                                 session.lvocab_hash, session.laddr_hash)
        lpreps.append(records.lprep(f, tier, salts[j] if tier == records.TIER_P else None))
    log = records.corpus_log(lpreps)
    lc = records.lcorpus(corpus_id, lpreps, [spdx] * len(lpreps), log)
    lg, cproof = records.grow_record(lpreps, corpus_id, log=log)
    pkgs = []
    for j, (rec, _) in enumerate(shards):
        block = attest.attest(priv, kvec, lpreps[j], epoch, deterministic)
        pkgs.append(make_package(rec, lpreps[j], block, lc, log.path(j), lg, cproof,
                                 salts[j] if tier == records.TIER_P else None))
    return pkgs, lpreps, lc, lg


# ================================================================ the tamper classes (Amendment 7 item 6)
def _copy(pkg):
    return copy.deepcopy(pkg)


def _last_digit(s):
    """S4's T8 rule: the last character becomes '1' if it is '0', else '0'."""
    return s[:-1] + ('1' if s.endswith('0') else '0')


def t1_strip(pkg):
    """T1: leafHashes and merkleRoot removed."""
    p = _copy(pkg)
    del p['record']['leafHashes']
    del p['record']['merkleRoot']
    return p


def _frame_offsets(stream):
    out, p = [], 0
    while p < len(stream):
        r = int(stream[p + 16:p + 24], 16) * 2
        out.append((p, p + 24, r))
        p += 24 + r
    return out


def t2_crystal(pkg, k, bit=0):
    """T2: bit `bit` (0..31) of packet k's crystal32 flipped, parity re-fixed."""
    p = _copy(pkg)
    s = p['record']['stream']
    off = _frame_offsets(s)[k][0]
    w = chain.refix_parity(int(s[off:off + 16], 16) ^ (1 << (24 + bit)))
    p['record']['stream'] = s[:off] + '%016X' % w + s[off + 16:]
    return p


def t3_lprep(pkg, field='lvocabHash'):
    """T3: one LPREP/1 field changed (the vocabulary hash: its last hex digit, S4's rule); the attestation kept."""
    p = _copy(pkg)
    parts = p['lprep'].split('|')
    i = records.LPREP_FIELDS.index(field)
    parts[i] = _last_digit(parts[i])
    p['lprep'] = '|'.join(parts)
    return p


def t4_revoked(pkg, priv_revoked, kvec, epoch, deterministic=True):
    """T4: the LPREP/1 attested by a key the registry marks revoked."""
    p = _copy(pkg)
    p['attestation'] = attest.attest(priv_revoked, kvec, p['lprep'], epoch, deterministic)
    return p


def t5_other(pkg, other):
    """T5: a valid attestation of a different shard (the next clean package's)."""
    p = _copy(pkg)
    p['attestation'] = copy.deepcopy(other['attestation'])
    return p


def t6_salt(pkg_tier_p, wrong_salt_hex):
    """T6: a Tier-P package checked with a wrong salt (shard j + 1's)."""
    p = _copy(pkg_tier_p)
    p['salt'] = wrong_salt_hex
    return p


def t7_swap(pkg, k):
    """T7: frames k and k + 1 swapped in the stream."""
    p = _copy(pkg)
    s = p['record']['stream']
    fo = _frame_offsets(s)
    a, b = fo[k], fo[k + 1]
    fa, fb = s[a[0]:a[1] + a[2]], s[b[0]:b[1] + b[2]]
    p['record']['stream'] = s[:a[0]] + fb + fa + s[b[1] + b[2]:]
    return p


def t8_chain_id(pkg):
    """T8: chainId altered (its last hex digit, S4's rule)."""
    p = _copy(pkg)
    p['record']['chainId'] = _last_digit(p['record']['chainId'])
    return p


def t9_flip(pkg, k, flip):
    """T9: frame k's residual replaced by `flip['alt']`, a single-bit flip that decodes to the same bytes
    (chain.silent_flips)."""
    p = _copy(pkg)
    s = p['record']['stream']
    off, r0, rl = _frame_offsets(s)[k]
    if len(flip['alt']) != rl:
        raise ValueError('the flipped residual has another length')
    p['record']['stream'] = s[:r0] + flip['alt'] + s[r0 + rl:]
    return p


def silent_flips_of(pkg, k, limit=None):
    """chain.silent_flips of frame k of a package's record."""
    s = pkg['record']['stream']
    off, r0, rl = _frame_offsets(s)[k]
    res = s[r0:r0 + rl]
    n = chain.unpack_packet(s[off:off + 16])['chunkLen']
    return chain.silent_flips(res, chain.decode_chunk(res, n), limit)
