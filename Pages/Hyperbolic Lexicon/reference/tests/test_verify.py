"""lexicon.verify: the hardened, attested import (L10; Amendment 7 item 6) on unregistered packages (synthetic
shards from Rng(70000 + i), fixed test keys), with Owl's own verifyIntegrity on the gap classes (L10 control 1's
shape), and the trace file regenerated (slow)."""
import os
import subprocess
import sys

import pytest

from lexicon import attest as A
from lexicon import chain as C
from lexicon import records as R
from lexicon import verify as V
from lexicon import wordpiece

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.dirname(HERE)
EP = 'EPOCH-OFFLINE-2000-01-01'


@pytest.fixture(scope='module')
def world():
    v0 = wordpiece.load_v0()
    ka, kb = A.private_key(A.TRACE_KEYS['A']), A.private_key(A.TRACE_KEYS['B'])
    kv = A.key_vector(A.identity_id(), EP)
    snap = A.snapshot_text([{'publicJwk': A.jwk_of(ka.public_key()), 'keyVector': kv, 'status': 'active'},
                            {'publicJwk': A.jwk_of(kb.public_key()), 'keyVector': kv, 'status': 'revoked'}])
    sess = V.Session(v0, R.lvocab(v0), R.laddr(v0.sha256, 'cd' * 32), snap, A.sha256hex(snap))
    texts = [C.synth_shard(71000 + i)[0] for i in range(3)] + ['short shard: ' + 'é' * 300]
    shards = [(C.grow(t, engrams=i % 2 == 0), t.encode()) for i, t in enumerate(texts)]
    srcs = [R.source_url_sha_synth(71000, i) for i in range(len(shards))]
    pk = V.corpus_packages(shards, 'lexicon-test', R.SPDX_CC0, srcs, sess, ka, kv, EP)[0]
    salts = [R.test_salt(j) for j in range(len(shards))]
    pkp = V.corpus_packages(shards, 'lexicon-test-p', R.SPDX_CC0, srcs, sess, ka, kv, EP, R.TIER_P, salts)[0]
    return {'sess': sess, 'pk': pk, 'pkp': pkp, 'kb': kb, 'kv': kv, 'salts': salts, 'texts': texts}


def test_clean_packages_are_accepted(world):
    for p in world['pk'] + world['pkp']:
        v = V.verify(p, world['sess'])
        assert (v['selfConsistent'], v['authentic'], v['failed']) == (True, True, '-')
        assert [n for n, _, _ in v['checks']] == list(V.CHECKS) and v['signer'] == p['attestation']['keyId']
    assert list(world['pk'][0]) == ['record', 'lprep', 'attestation', 'lcorpus', 'inclusion', 'lgrow', 'consistency']
    assert list(world['pkp'][0])[:3] == ['record', 'lprep', 'salt']


def test_each_tamper_class_fails_its_check(world):
    pk, s = world['pk'], world['sess']
    for j in (0, 1):
        p = pk[j]
        K = len(p['record']['leafHashes'])
        flip = V.silent_flips_of(p, 1, limit=1)[0]
        cases = {
            'T1': (V.t1_strip(p), False, True, 'leaves'),
            'T2': (V.t2_crystal(p, K - 1, 31), False, True, 'crystal'),
            'T3': (V.t3_lprep(p), False, False, 'commitment'),
            'T4': (V.t4_revoked(p, world['kb'], world['kv'], EP), True, False, 'attestation'),
            'T5': (V.t5_other(p, pk[j + 1]), True, False, 'attestation'),
            'T6': (V.t6_salt(world['pkp'][j], world['salts'][j + 1]), False, True, 'commitment'),
            'T7': (V.t7_swap(p, 1), False, True, 'leaves'),
            'T8': (V.t8_chain_id(p), False, True, 'weaves'),
            'T9': (V.t9_flip(p, 1, flip), False, True, 'canonical'),
        }
        for name, (pkg, sc, au, failed) in cases.items():
            v = V.verify(pkg, s)
            assert (v['selfConsistent'], v['authentic'], v['failed']) == (sc, au, failed), name


def test_malformed_packages_fail_closed(world):
    s, p = world['sess'], world['pk'][3]
    assert V.verify(None, s)['failed'] == 'parity'
    assert V.verify({}, s)['failed'] == 'parity'
    hang = V._copy(p)
    hang['record']['stream'] = '98B8806345000352-000000c'           # Owl's parser loops forever on this
    assert V.verify(hang, s)['failed'] == 'parity'
    upper = V._copy(p)
    upper['record']['stream'] = upper['record']['stream'][:24] + upper['record']['stream'][24:].upper()
    assert V.verify(upper, s)['failed'] == 'canonical'
    lower = V._copy(p)
    lower['record']['stream'] = lower['record']['stream'][:16].lower() + lower['record']['stream'][16:]
    assert V.verify(lower, s)['failed'] == 'crystal'
    rechunk = V._copy(p)                                             # a re-chunked, re-grown record: not the 720 cut
    t = world['texts'][3].encode()
    parts = [t[:360], t[360:]]
    rechunk['record']['stream'] = C.frame_stream([C.crystallize(c) for c in parts], [C.encode_chunk(c) for c in parts])
    assert V.verify(rechunk, s)['failed'] == 'canonical'
    for k, val in (('segments', True), ('origBytes', str(p['record']['origBytes'])), ('engramCount', 1)):
        q = V._copy(p)
        q['record'][k] = val
        assert V.verify(q, s)['failed'] in ('weaves', 'derived'), k
    assert V.verify(dict(p, inclusion=['zz']), s)['failed'] == 'inclusion'
    assert V.verify(dict(p, lgrow=p['lgrow'].replace('|3|', '|2|', 1)), s)['failed'] == 'consistency'
    skipped = V.verify(V.t4_revoked(p, world['kb'], world['kv'], EP), s, skip=('attestation',))
    assert skipped['failed'] == '-' and skipped['checks'][7] == ('attestation', None, 'skipped')


def test_owl_accepts_the_gap_classes_the_verifier_rejects(world):
    """L10's control 1 in shape, on unregistered packages: Owl's verifyIntegrity accepts T1, T2, T8 and T9 (and
    rejects T7), while the hardened verifier names the failing check."""
    from test_chain import owl_biomesh
    p = world['pk'][1]                                               # engrams off: Owl's own engram layer is slow
    flip = V.silent_flips_of(p, 0, limit=1)[0]
    tampered = [V.t1_strip(p), V.t2_crystal(p, 0), V.t8_chain_id(p), V.t9_flip(p, 0, flip), V.t7_swap(p, 0)]
    out = owl_biomesh({'verify': [t['record'] for t in tampered]})
    assert [v['ok'] for v in out['owlVerify']] == [True, True, True, True, False]
    assert [V.verify(t, world['sess'])['failed'] for t in tampered] == ['leaves', 'crystal', 'weaves', 'canonical', 'leaves']


@pytest.mark.slow
def test_trace_file_is_current():
    r = subprocess.run([sys.executable, '-B', os.path.join(REF, 'traces_chain.py'), '--check'], capture_output=True,
                       text=True)
    if r.returncode == 2:
        pytest.skip(r.stderr.strip())
    assert r.returncode == 0, r.stderr
