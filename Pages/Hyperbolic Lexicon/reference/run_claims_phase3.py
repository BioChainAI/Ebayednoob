#!/usr/bin/env python3
"""The Python half of run_claims_phase3.cjs (Phase 3: L8-L11; PREREGISTRATION.md L8-L11, the common rules and
Amendment 7). It is never run alone:

    python3 -B run_claims_phase3.py <request.json> <response.json>

run_claims_phase3.cjs writes one JSON request into the cache (~/.cache/hyperbolic-lexicon/phase3[-dry]/, HL_CACHE
overrides the root), starts this file and reads the JSON response it writes. Progress goes to stderr. The request
names one task:

  l8l9    L8's Python port and the reference side of L9. The instance shards are regenerated here from their own
          sources (lexicon.wordnet.c0_shards; lexicon.chain.synth_shard(seed); lexicon.chain.gloss_shards for the dry
          runs' verb and adjective shards), so the runner can check that both languages grow the same texts. Each
          shard is grown with engrams off and on (chain.grow); the controls' growers run beside them (BioChain-AI's
          packet normalisation, chain.grow(packets='kernel'), on the synthetic shards: L8 control 1; leaves over
          binary bytes, chain.grow(leaves='binary'), on every shard: L8 control 2). Each record is returned as its
          key order and the SHA-256 of JavaScript's JSON text of each field (chain.js_json), and written whole to the
          cache. L8(d): LVOCAB/1, LADDR/1 (addrTableRoot over map A, recomputed from WordNet), every shard's V0 id
          stream and its LPREP/1 strings (engrams off and on). L9(a): the corpus manifest over the LPREP/1 strings of
          the package mode and the synthetic leaf lists of Amendment 7 item 5 (roots; every inclusion proof for its
          own leaf and position and the two wrong ones; consistency proofs; the alterations), with the draws of
          l9_draws below; L9's controls 1 and 2; L9(b): every shard's exact weave and its checks.
  verify  L10: the packages run_claims_phase3.cjs built (JSON lines in the cache) verified by lexicon.verify under a
          session that recomputes LADDR/1 from WordNet once; BioChain's identity and key vector (lexicon.attest's
          port); L10 control 2 (each valid signature handed to cryptography as DER without the P1363 conversion).
  time    L11's Python time (reported; L11 is decided in Node): the hardened verification of each listed package, 3
          repetitions, the first discarded, with each check's milliseconds; and the 95% percentile bootstrap
          interval of the median of each series the runner sends (numpy default_rng(7), 10,000 resamples of the
          values with replacement, percentiles 2.5 and 97.5: lexicon.rank.ci_mean's procedure with the median).

No decision is taken here: the runner compares, counts and decides. Seeds and instances are the request's; a dry run
sends the registered dry ones (Amendment 7 item 8), a decisive run the registered ones.
"""
import hashlib
import json
import os
import platform
import ssl
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lexicon  # noqa: E402,F401  (puts hpstep and engram on sys.path)
from lexicon import attest as A  # noqa: E402
from lexicon import chain as C  # noqa: E402
from lexicon import manifest as M  # noqa: E402
from lexicon import records as R  # noqa: E402
from lexicon import verify as V  # noqa: E402
from lexicon import wordnet as W  # noqa: E402
from lexicon import wordpiece as WP  # noqa: E402
from hpstep.prng import Rng  # noqa: E402
import numpy as np  # noqa: E402


def sha(x):
    return hashlib.sha256(x.encode('utf-8') if isinstance(x, str) else bytes(x)).hexdigest()


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def ms_since(t0):
    return (time.perf_counter() - t0) * 1000.0


def environment():
    import cryptography
    return {'python': platform.python_version(), 'implementation': platform.python_implementation(),
            'cryptography': cryptography.__version__, 'numpy': np.__version__, 'openssl': ssl.OPENSSL_VERSION,
            'platform': platform.platform()}


def field_digests(rec):
    """A record's key order and, per field, the SHA-256 of JavaScript's JSON.stringify text of its value."""
    return {'keys': list(rec), 'fields': {k: sha(C.js_json(v)) for k, v in rec.items()}}


def shard_name(kind, i):
    return f'c0 {i:03d}' if kind == 'c0' else f'{kind} {i:02d}'


def shard_texts(spec, wn):
    """[(index, text, extra)] of one instance set, from its own source."""
    kind = spec['set']
    if kind == 'c0':
        return [(i, t, None) for i, t in enumerate(W.c0_shards(wn))]
    if kind == 'synth':
        out = []
        for i, seed in enumerate(spec['seeds']):
            text, draws = C.synth_shard(seed)
            out.append((i, text, {'seed': seed, 'draws': draws}))
        return out
    if kind in ('verb', 'adj'):
        texts = C.gloss_shards(wn, kind)
        return [(i, t, None) for i, t in enumerate(texts[:spec['limit']] if spec.get('limit') else texts)]
    raise ValueError(f'unknown instance set {kind!r}')


def source_sha(spec, i):
    return R.source_url_sha_synth(spec['sourceBase'], i) if spec['set'] == 'synth' else R.source_url_sha_c0()


# ================================================================ L9(a): the draws, a list's every check
def l9_alterations(K):
    """Every alteration of L9(a) for a list of K, in the trace's order: for i = 0..K-1, replace i, delete i, insert
    before i, swap i and i+1 (i + 1 < K), truncate to the first i (i >= 1); then duplicate-last."""
    alts = []
    for i in range(K):
        alts += [('replace', i), ('delete', i), ('insert', i)]
        if i + 1 < K:
            alts.append(('swap', i))
        if i >= 1:
            alts.append(('truncate', i))
    alts.append(('duplicate-last', K - 1))
    return alts


def l9_draws(K, seed, samples, every_max):
    """(alterations, consistency sizes m, 'every' | 'sampled'). Every alteration and every m in 1..K-1 for K <=
    every_max (200); otherwise `samples` (2,000) of each from Rng(seed).

    READING: a sample is drawn with replacement: first the 2,000 alterations, each alts[below(len(alts))] over
    l9_alterations(K) (uniform over the alterations the K <= 200 rule enumerates), then from the same Rng the 2,000
    consistency sizes, each 1 + below(K - 1) (K = 1000 has only 999 sizes m < N, so 2,000 cannot be drawn without
    replacement)."""
    alts = l9_alterations(K)
    if K <= every_max:
        return alts, list(range(1, K)), 'every'
    if seed is None:
        raise ValueError(f'a list of {K} > {every_max} needs a draw seed')
    r = Rng(seed)
    tam = [alts[r.below(len(alts))] for _ in range(samples)]
    cons = [1 + r.below(K - 1) for _ in range(samples)]
    return tam, cons, 'sampled'


def proof_digest(p):
    """'<number of hashes>:<SHA-256 of the hashes concatenated>' (a proof compared exactly between languages)."""
    return f'{len(p)}:' + hashlib.sha256(b''.join(p)).hexdigest()


def l9_list(D, seed, samples, every_max):
    """L9(a) on one list of entries (bytes): its root, every inclusion proof (own leaf and position; leaf (i + 1) mod
    K at position i; own leaf at position (i + 1) mod K), the consistency proofs and the alterations."""
    K = len(D)
    t0 = time.perf_counter()
    lg = M.Log(D)
    rt = lg.root()
    ms_root = ms_since(t0)
    t0 = time.perf_counter()
    incl = []
    for i in range(K):
        p = lg.path(i)
        ok = M.verify_inclusion(i, K, M.leaf_hash(D[i]), p, rt)
        if K >= 2:
            o = (i + 1) % K
            wl = not M.verify_inclusion(i, K, M.leaf_hash(D[o]), p, rt)
            wp = not M.verify_inclusion(o, K, M.leaf_hash(D[i]), p, rt)
        else:
            wl = wp = None
        incl.append([proof_digest(p), ok, wl, wp])
    ms_incl = ms_since(t0)
    tam, cons_ms, how = l9_draws(K, seed, samples, every_max)
    t0 = time.perf_counter()
    cons = []
    for m in cons_ms:
        p = lg.consistency(m)
        ok = M.verify_consistency(m, K, lg.root(m), rt, p)
        bad = bytearray(lg.root(m))
        bad[0] ^= 1
        cons.append([m, proof_digest(p), ok, not M.verify_consistency(m, K, bytes(bad), rt, p)])
    ms_cons = ms_since(t0)
    t0 = time.perf_counter()
    alters = []
    for kind, i in tam:
        new = None
        if kind == 'replace':
            b = bytearray(D[i])
            b[0] ^= 1
            new = bytes(b)
        elif kind == 'insert':
            new = bytes(32)
        alters.append([kind, i, M.root(M.tampered(D, kind, i, new)) != rt])
    ms_alt = ms_since(t0)
    return {'K': K, 'root': rt.hex(), 'draws': how, 'inclusion': incl, 'consistency': cons, 'alterations': alters,
            'ms': {'root': ms_root, 'inclusion': ms_incl, 'consistency': ms_cons, 'alterations': ms_alt}}


def l9_controls(D, j, K, every_max):
    """Control 1 (the shdccp/2 rule: L and L with its last entry duplicated, over the entries' hex) and control 2
    (adjacent swaps: the XOR of the 64-bit prefixes against the exact weave of the same prefixes).

    READING: control 2 checks every adjacent swap for K <= 200 and the first and last (i = 0 and K - 2) for larger K
    (each weave of 1,001 prefixes takes about 0.3 s here; the control needs one swap the XOR misses and the weave
    detects)."""
    hx = [d.hex() for d in D]
    a, b = C.merkle_shdccp2(hx), C.merkle_shdccp2(hx + [hx[-1]])
    vals = [int.from_bytes(d[:8], 'big') for d in D]
    x0 = M.xor_summary(vals)
    q0 = C.chain_quaternion(vals)
    swaps = []
    for i in (range(K - 1) if K <= every_max else ([0, K - 2] if K >= 2 else [])):
        sw = list(vals)
        sw[i], sw[i + 1] = sw[i + 1], sw[i]
        swaps.append([i, M.xor_summary(sw) == x0, C.chain_quaternion(sw) != q0])
    return {'shdccp2': [a, b, a == b], 'xor': format(x0, '016x'), 'swaps': swaps}


# ================================================================ tasks
def task_l8l9(req):
    out = {'environment': environment()}
    t0 = time.perf_counter()
    wn = W.load()
    v0 = WP.load_v0()
    out['ms_load'] = ms_since(t0)
    lv = R.lvocab(v0)
    lvh = R.record_hash(lv)
    t0 = time.perf_counter()
    la, root, rows, report = R.laddr_v0(wn, v0)
    out['laddr_ms'] = ms_since(t0)
    lah = R.record_hash(la)
    out.update({'lvocab': lv, 'lvocabHash': lvh, 'laddr': la, 'laddrHash': lah, 'addrTableRoot': root,
                'addrRows': len(rows)})
    log(f'LVOCAB/1 {lvh[:16]}..., LADDR/1 {lah[:16]}... (addrTableRoot {root[:16]}..., {len(rows)} rows, '
        f'{out["laddr_ms"] / 1000:.1f} s)')
    shards = []
    mode = req['packageMode']
    manifest_lpreps = []
    with open(req['recordsPath'], 'w', encoding='utf-8') as rec_file:
        for spec in req['sets']:
            t_set = time.perf_counter()
            texts = shard_texts(spec, wn)
            for i, text, extra in texts:
                data = C.js_utf8(text)
                sh = {'set': spec['set'], 'index': i, 'name': shard_name(spec['set'], i), 'bytes': len(data),
                      'sha256': sha(data), 'records': {}, 'lprep': {}}
                if extra:
                    tb, n = C.two_byte_share(text)
                    sh['synth'] = dict(extra, twoByte=tb, codePoints=n)
                recs = {}
                for m in ('off', 'on'):
                    t0 = time.perf_counter()
                    rec = C.grow(text, engrams=(m == 'on'))
                    ms = ms_since(t0)
                    recs[m] = rec
                    sh['records'][m] = dict(field_digests(rec), ms=ms)
                    rec_file.write(json.dumps({'name': sh['name'], 'mode': m}) + '\t' + C.js_json(rec) + '\n')
                if spec.get('kernel'):
                    sh['kernel'] = field_digests(C.grow(text, engrams=False, packets='kernel'))
                sh['binary'] = field_digests(C.grow(text, engrams=False, leaves='binary'))
                t0 = time.perf_counter()
                ids = WP.encode(data, v0)[0]
                sh['idStream'] = {'sha256': sha(WP.id_stream([ids])), 'ids': len(ids), 'ms': ms_since(t0)}
                lh, cuts = recs['off']['leafHashes'], recs['off']['segCuts']
                t0 = time.perf_counter()
                q = C.exact_weave(lh)
                norm_ok, unfold_ok, seg_ok = C.exact_weave_checks(lh, cuts, q)
                sh['weave'] = {'K': len(lh), 'text': C.weave3_text(q), 'sha256': C.weave3_sha(q), 'normOk': norm_ok,
                               'unfoldOk': unfold_ok, 'segmentsOk': seg_ok, 'bits': [abs(c).bit_length() for c in q],
                               'segments': [C.weave3_sha(s) for s in C.segment_weaves(lh, cuts)], 'ms': ms_since(t0)}
                src = source_sha(spec, i)
                for m in ('off', 'on'):
                    f = R.lprep_fields(recs[m], data, v0, spec['corpusId'], i, spec['spdx'], src, lvh, lah, weave3=q)
                    sh['lprep'][m] = R.lprep(f)
                if spec['set'] == req['manifestSet']:
                    manifest_lpreps.append(sh['lprep'][mode])
                shards.append(sh)
            log(f'{spec["set"]}: {len(texts)} shards grown, engrams off and on, with the controls\' growers, ids, '
                f'weaves and LPREP/1 ({ms_since(t_set) / 1000:.1f} s)')
    out['shards'] = shards
    rfc = req['rfc']
    lists = []
    t_l9 = time.perf_counter()
    for j, K in enumerate(rfc['Ks']):
        D = M.synthetic_leaves(rfc['listSeedBase'] + j, K)
        x = l9_list(D, rfc['drawSeedBase'] + j, rfc['samples'], rfc['everyMax'])
        x.update({'j': j, 'seed': rfc['listSeedBase'] + j, 'drawSeed': rfc['drawSeedBase'] + j,
                  'controls': l9_controls(D, j, K, rfc['everyMax'])})
        lists.append(x)
        log(f'L9 list j={j} K={K}: root {x["root"][:16]}... ({sum(x["ms"].values()) / 1000:.1f} s)')
    out['l9'] = {'lists': lists, 'ms': ms_since(t_l9)}
    entries = R.corpus_leaves(manifest_lpreps)
    cm = l9_list(entries, None, rfc['samples'], rfc['everyMax'])
    cm.update({'set': req['manifestSet'], 'mode': mode})
    out['l9']['corpus'] = cm
    log(f'L9 corpus manifest ({req["manifestSet"]}, engrams {mode}): K={cm["K"]}, root {cm["root"][:16]}...')
    return out


def check_pattern(v):
    return ''.join('P' if ok else '-' if ok is None else 'F' for _, ok, _ in v['checks'])


def failed_detail(v):
    return next((d for _, ok, d in v['checks'] if ok is False), '')


def session_of(req):
    wn = W.load()
    v0 = WP.load_v0()
    lv = R.lvocab(v0)
    t0 = time.perf_counter()
    la = R.laddr_v0(wn, v0)[0]
    laddr_ms = ms_since(t0)
    s = V.Session(v0, lv, la, req['registry'], req['registrySha256'])
    return s, laddr_ms


def task_verify(req):
    out = {'environment': environment()}
    s, laddr_ms = session_of(req)
    out.update({'laddr_ms': laddr_ms, 'lvocabHash': s.lvocab_hash, 'laddrHash': s.laddr_hash})
    ident = A.identity_id()
    out['identityId'] = ident
    out['keyVector'] = A.key_vector(ident, req['epochToken'])
    out['keyIds'] = {e['keyId']: A.key_id(e['publicJwk']) for e in json.loads(req['registry'])}
    verdicts = []
    t_all = time.perf_counter()
    with open(req['packagesPath'], encoding='utf-8') as f:
        for n, line in enumerate(f):
            pkg = json.loads(line)
            t0 = time.perf_counter()
            v = V.verify(pkg, s)
            verdicts.append([v['selfConsistent'], v['authentic'], v['failed'], check_pattern(v), v['signer'],
                             failed_detail(v), ms_since(t0)])
            if n % 100 == 99:
                log(f'verified {n + 1} packages ({ms_since(t_all) / 1000:.1f} s)')
    out['verdicts'] = verdicts
    out['ms'] = ms_since(t_all)
    c2 = []
    for x in req['signatures']:
        pub = A.pub_from_jwk(x['publicJwk'])
        sig = bytes.fromhex(x['sig'])
        raw_ok, err = A.verify_raw_as_der(pub, sig, x['payload'])
        c2.append([A.verify_p1363(pub, sig, x['payload']), raw_ok, err])
    out['control2'] = c2
    return out


def ci_median(values, seed=7, resamples=10000):
    """The median and its 95% percentile bootstrap interval: lexicon.rank.ci_mean's procedure (numpy
    default_rng(seed); each resample draws len(values) values with replacement; percentiles 2.5 and 97.5), with the
    median in place of the mean."""
    v = np.asarray(values, dtype=float)
    rng = np.random.default_rng(seed)
    meds = np.array([np.median(v[rng.integers(0, len(v), len(v))]) for _ in range(resamples)])
    lo, hi = np.percentile(meds, [2.5, 97.5])
    return {'median': float(np.median(v)), 'interval': [float(lo), float(hi)], 'n': int(len(v)), 'seed': seed,
            'resamples': resamples}


def task_time(req):
    out = {'environment': environment()}
    rows = []
    if req.get('packagesPath'):
        s, laddr_ms = session_of(req)
        out['laddr_ms'] = laddr_ms
        reps = req.get('reps', 3)
        t_all = time.perf_counter()
        with open(req['packagesPath'], encoding='utf-8') as f:
            for n, line in enumerate(f):
                pkg = json.loads(line)
                times, checks, failed = [], [], []
                for _ in range(reps):
                    td = {}
                    t0 = time.perf_counter()
                    v = V.verify(pkg, s, times=td)
                    times.append(ms_since(t0))
                    checks.append(td)
                    failed.append(v['failed'])
                kept = times[1:]
                per_check = {k: sum(c.get(k, 0.0) for c in checks[1:]) / len(kept) for k in V.CHECKS}
                rows.append({'ms': sum(kept) / len(kept), 'reps': times, 'checks': per_check, 'failed': failed})
                if n % 20 == 19:
                    log(f'timed {n + 1} packages ({ms_since(t_all) / 1000:.1f} s)')
        out['rows'] = rows
        out['ms'] = ms_since(t_all)
    series = dict(req.get('bootstrap') or {})
    if rows:
        series['python_full'] = [r['ms'] for r in rows]
    out['bootstrap'] = {k: ci_median(v) for k, v in series.items() if len(v)}
    return out


TASKS = {'l8l9': task_l8l9, 'verify': task_verify, 'time': task_time}


def main(argv):
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    with open(argv[1], encoding='utf-8') as f:
        req = json.load(f)
    t0 = time.perf_counter()
    out = TASKS[req['task']](req)
    out['task'] = req['task']
    out['seconds'] = round(ms_since(t0) / 1000, 1)
    with open(argv[2], 'w', encoding='utf-8') as f:
        json.dump(out, f, separators=(',', ':'))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
