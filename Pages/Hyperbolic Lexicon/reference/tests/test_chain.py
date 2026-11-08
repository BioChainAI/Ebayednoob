"""lexicon.chain: the Python port of Owl Academy's synchronous biochain grower (L8), against Owl's and BioChain-AI's
own JavaScript (tests/owl_biomesh.cjs, by name-grab), V8's Math.hypot / toFixed / Number::toString (Node), BioChain-AI's
shdccp_kernel.py (run as python3 -B -I), spike S4's printed values for the verb and adjective gloss shards, and
independent oracles. Unregistered data only: seeds 70000 + i, hand-made strings, and S4's gloss shards (the dry runs).
"""
import importlib.util
import json
import os
import struct
import subprocess
import sys

import pytest

import lexicon
from lexicon import chain as C
from hpstep.prng import Rng

HERE = os.path.dirname(os.path.abspath(__file__))
# the checkouts: OWL_ACADEMY_DIR and BIOCHAIN_AI_DIR, else beside the repository (scripts/lib/siblings.py)
_spec = importlib.util.spec_from_file_location('ebayednoob_siblings', os.path.join(lexicon.REPO, 'scripts', 'lib', 'siblings.py'))
siblings = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(siblings)
OWL = siblings.dir('Owl-Academy')
BIOCHAIN = siblings.dir('BioChain-AI')
NODE_OK = subprocess.run(['node', '--version'], capture_output=True).returncode == 0


def node(script, payload):
    r = subprocess.run(['node', '-e', script], input=json.dumps(payload), capture_output=True, text=True, cwd=HERE)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def owl_biomesh(req):
    if not (NODE_OK and os.path.isdir(OWL) and os.path.isdir(BIOCHAIN)):
        pytest.skip('needs node and the Owl-Academy and BioChain-AI checkouts (OWL_ACADEMY_DIR, BIOCHAIN_AI_DIR)')
    r = subprocess.run(['node', os.path.join(HERE, 'owl_biomesh.cjs'), OWL, BIOCHAIN], input=json.dumps(req),
                       capture_output=True, text=True)
    if r.returncode == 2:  # a checkout or the pinned content is missing (e.g. a shallow clone): skipped, never passed
        pytest.skip(r.stderr.strip())
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def rand_bytes(seed, n, alphabet=256):
    r = Rng(seed)
    return bytes(r.below(alphabet) for _ in range(n))


# ---------------------------------------------------------------- the rank coder
def naive_encode(data):
    """biomesh.js encodeChunk, literally: sort each context's candidates every time (count desc, byte asc)."""
    t, bits, ctx = {}, [], (0, 0)
    for b in data:
        m = t.get(ctx, {})
        cs = [e[0] for e in sorted(m.items(), key=lambda e: (-e[1], e[0]))]
        n = cs.index(b) + 1 if b in cs else len(cs) + 1
        w = n.bit_length()
        bits += [0] * (w - 1) + [(n >> i) & 1 for i in range(w - 1, -1, -1)]
        if b not in cs:
            bits += [(b >> i) & 1 for i in range(7, -1, -1)]
        t.setdefault(ctx, {})[b] = m.get(b, 0) + 1
        ctx = (ctx[1], b)
    out = []
    for i in range(0, len(bits), 8):
        s = bits[i:i + 8]
        v = 0
        for x in s:
            v = (v << 1) | x
        out.append((v << (8 - len(s))) & 0xFF)
    return bytes(out).hex()


@pytest.mark.parametrize('seed,n,alpha', [(70000, 0, 256), (70001, 1, 256), (70002, 720, 256), (70003, 720, 4),
                                          (70004, 720, 30), (70005, 333, 2), (70006, 720, 1), (70007, 719, 200)])
def test_codec_matches_the_literal_encoder_and_round_trips(seed, n, alpha):
    data = rand_bytes(seed, n, alpha)
    res = C.encode_chunk(data)
    assert res == naive_encode(data)
    assert C.decode_chunk(res, n) == list(data)


def test_decode_reads_ranks_as_javascript_does():
    # a rank code of 31 zeros wraps to a negative int32: JS pushes undefined, so there is no byte decode
    bits = '0' * 31 + '1' + '0' * 31
    bits += '0' * (-len(bits) % 8)
    hx = int(bits, 2).to_bytes(len(bits) // 8, 'big').hex()
    with pytest.raises(C.JsUndefined):
        C.decode_chunk(hx, 1)
    with pytest.raises(ValueError):
        C.decode_chunk('00', 1)                         # zeros only: residual truncated
    with pytest.raises(ValueError):
        C.decode_chunk('8', 1)                          # not hex digit pairs
    # an escape code longer than needed is an alias (S4's residual aliasing): it decodes to the same bytes
    def hexbits(bits):
        bits += '0' * (-len(bits) % 8)
        return int(bits, 2).to_bytes(len(bits) // 8, 'big').hex()
    canon = hexbits('1' + '01000001' + '1' + '10000001')        # g(1) escape 0x41, g(1) escape 0x81
    alias = hexbits('1' + '01000001' + '010' + '10000001')      # the second escape written as g(2)
    assert C.encode_chunk(bytes([0x41, 0x81])) == canon
    assert C.decode_chunk(alias, 2) == C.decode_chunk(canon, 2) == [0x41, 0x81]


def test_packets_and_the_kernel_normalisation():
    # spike S4: crystallize([75, 0, 7]) has the crystal codes [-72, -128, 99, 69]
    assert C.crystallize(bytes([75, 0, 7])) == '98B8806345000352'
    assert C.kernel_crystallize(bytes([75, 0, 7])) == '90B8816345000352'
    u = C.unpack_packet('98B8806345000352')
    assert u['parityOk'] and u['chunkLen'] == 3 and u['form'] == 9
    assert not C.unpack_packet('90B8806345000352')['parityOk']
    for s in range(200):
        d = rand_bytes(70100 + s, 1 + s % 720)
        assert (C.kernel_crystallize(d) != C.crystallize(d)) == C.crystal_has_80(d)
        assert C.unpack_packet(C.kernel_crystallize(d))['parityOk']


def test_kernel_port_equals_biochain_ai_kernel():
    kfile = os.path.join(BIOCHAIN, 'protocol', 'shdccp_kernel.py')
    if not os.path.exists(kfile):
        pytest.skip('no BioChain-AI checkout')
    chunks = [bytes([75, 0, 7])] + [rand_bytes(70300 + s, 1 + 37 * s % 720) for s in range(300)]
    # D12: BioChain-AI's Python runs only as python3 -B -I with an explicit sys.path
    code = ('import sys, json; sys.path.insert(0, sys.argv[1]); import shdccp_kernel as K; '
            'print(json.dumps([K.packet_hex(K.crystallize(bytes.fromhex(h))) for h in json.load(sys.stdin)]))')
    r = subprocess.run([sys.executable, '-B', '-I', '-c', code, os.path.dirname(kfile)],
                       input=json.dumps([c.hex() for c in chunks]), capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    assert json.loads(r.stdout) == [C.kernel_crystallize(c) for c in chunks]
    assert sum(C.crystal_has_80(c) for c in chunks) >= 1


# ---------------------------------------------------------------- JavaScript's numbers
JS_NUMBERS = r'''
const xs = JSON.parse(require('fs').readFileSync(0, 'utf8')).map(h => new DataView(Uint8Array.from(Buffer.from(h, 'hex')).buffer).getFloat64(0));
const hex = x => { const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, x); return Buffer.from(b.buffer).toString('hex'); };
const out = { hypot: [], fixed: [] };
for (let i = 0; i + 4 <= xs.length; i += 4) out.hypot.push(hex(Math.hypot(xs[i], xs[i + 1], xs[i + 2], xs[i + 3])));
for (const x of xs) out.fixed.push([x.toFixed(12), x.toFixed(4), String(x)]);
process.stdout.write(JSON.stringify(out));
'''


def test_hypot_tofixed_and_tostring_equal_v8():
    if not NODE_OK:
        pytest.skip('no node')
    r = Rng(70400)
    xs = []
    for i in range(4000):
        e = r.below(40) - 20
        x = (2 * r.random() - 1) * 10.0 ** e
        k = r.below(20)
        if k == 0:
            x = 0.0
        elif k == 1:
            x = -0.0
        elif k == 2:
            x = r.below(1000) / 8
        elif k == 3:
            x = -1e-13 * r.random()
        xs.append(x)
    xs += [1e21 * 0.999, 5e-324, 1.7976931348623157e308, 123456789012345680000.0, 1e-7, 1.5e-7, 0.1, 1 / 3]
    xs = xs[:len(xs) // 4 * 4]
    js = node(JS_NUMBERS, [struct.pack('>d', x).hex() for x in xs])
    hyp = [struct.pack('>d', C.v8_hypot(xs[i:i + 4])).hex() for i in range(0, len(xs), 4)]
    assert hyp == js['hypot']
    for x, (f12, f4, s) in zip(xs, js['fixed']):
        assert C.js_number(x) == s
        if abs(x) < 1e21:
            assert C.js_to_fixed(x, 12) == f12 and C.js_to_fixed(x, 4) == f4


def test_js_json():
    assert C.js_json({'a': [1, 0.5, -0.0, 1.0, 'x"\n\u00e9'], 'b': None, 'c': True}) == \
        '{"a":[1,0.5,0,1,"x\\"\\n\u00e9"],"b":null,"c":true}'


# ---------------------------------------------------------------- the grower against Owl's and BioChain-AI's own
def test_grow_equals_owl_and_biochain_field_for_field():
    texts = [C.synth_shard(70500 + i)[0] for i in range(3)]
    small = ["Hello, world! Don't stop.", 'a', 'é' * 400 + "it's 42 x", ''.join(chr(c) for c in range(1, 0x500)),
             'x' * 721, '\U0001F600' * 180, "o'clock " * 90 + '\n\t']
    grow = [{'text': t, 'engrams': False} for t in texts] + [{'text': t, 'engrams': e} for t in small for e in (False, True)]
    py = [C.grow(g['text'], engrams=g['engrams']) for g in grow]
    out = owl_biomesh({'grow': grow, 'verify': py})
    assert out['owlSha'] == '7ffd768ce8458345b912ed96e4f70db580b31f0b533faba1b880be4887743eb1'
    for p, o, b in zip(py, out['owl'], out['biochain']):
        assert C.diff_fields(p, o) == []
        assert C.diff_fields(p, b) == []
    assert all(v['ok'] for v in out['owlVerify']) and all(v['ok'] for v in out['biochainVerify'])


def test_grow_refuses_what_owl_refuses():
    with pytest.raises(ValueError):
        C.grow('')
    with pytest.raises(ValueError):
        C.grow('a' * 60001)
    assert C.grow('a' * 60000, engrams=False)['origBytes'] == 60000


def test_controls_of_l8():
    text = C.synth_shard(70600)[0]
    owl = C.grow(text, engrams=False)
    k = C.grow(text, engrams=False, packets='kernel')
    b = C.grow(text, engrams=False, leaves='binary')
    # control 1: the kernel's packets change the stream (the generator guarantees a 0x80 crystal), never the root
    assert k['stream'] != owl['stream'] and k['chainId'] == owl['chainId'] and k['merkleRoot'] == owl['merkleRoot']
    # control 2: leaves over binary bytes differ on every chunk, ASCII ones included
    assert all(x != y for x, y in zip(b['leafHashes'], owl['leafHashes']))
    asc = C.grow('plain ASCII text ' * 100, engrams=False)
    asc_b = C.grow('plain ASCII text ' * 100, engrams=False, leaves='binary')
    assert all(x != y for x, y in zip(asc['leafHashes'], asc_b['leafHashes']))
    # control 3: one byte altered changes its leaf and the root
    data = bytearray(text.encode())
    i = next(i for i in range(1000, len(data)) if 0x61 <= data[i] <= 0x79)
    data[i] += 1
    alt = C.grow(bytes(data), engrams=False)
    k = i // C.CHUNK
    assert alt['leafHashes'][k] != owl['leafHashes'][k] and alt['merkleRoot'] != owl['merkleRoot']
    assert [j for j, (x, y) in enumerate(zip(alt['leafHashes'], owl['leafHashes'])) if x != y] == [k]


def test_owl_rejects_the_binary_leaf_record():
    text = C.synth_shard(70601)[0]
    out = owl_biomesh({'verify': [C.grow(text, engrams=False, leaves='binary')]})
    assert not out['owlVerify'][0]['ok'] and 'leaf 0 mismatch' in out['owlVerify'][0]['reasons'][0]


def test_s4_gloss_shards_and_chain_ids(wn):
    v, a = C.gloss_shards(wn, 'verb'), C.gloss_shards(wn, 'adj')
    import hashlib
    assert (len(v), len(a)) == (22, 33)
    assert hashlib.sha256('\n'.join(hashlib.sha256(s.encode()).hexdigest() for s in v + a).encode()).hexdigest() == \
        '498371616959d8e85a6a5588f97ac297668431693e5251f8eb6b7822ca3578be'
    # spike S4's table: chainId, stream hex length and value (engrams off / on)
    for text, cid, hexlen, off, on in ((v[0], 'BC-3988c9279e0b149f70539866', 107824, 1.059, 0.4527),
                                      (v[21], 'BC-3a3a8de1012619b967c99cf4', 87692, 1.0412, 0.4448),
                                      (a[32], 'BC-619011df1d4c75a7de9a186e', 13492, 1.1086, 0.4714)):
        r = C.grow(text, engrams=False)
        assert (r['chainId'], len(r['stream']), r['value']) == (cid, hexlen, off)
        assert C.grow(text, engrams=True)['value'] == on
    r = C.grow(v[0], engrams=False)
    q = C.exact_weave(r['leafHashes'])
    assert C.weave3_sha(q) == '00bc14596f3b161bdd1e749046a8c13464616a34007391428e16440e695e24c7'
    assert [abs(c).bit_length() for c in q] == [2730, 2730, 2729, 2730]
    assert C.exact_weave_checks(r['leafHashes'], r['segCuts'], q) == (True, True, True)
    assert C.recreate_text(r) == v[0]


# ---------------------------------------------------------------- the stream, the weave, the generator, aliases
def test_frames_are_strict():
    rec = C.grow('hello world ' * 100, engrams=False)
    fr = C.frames(rec['stream'])
    assert len(fr) == 2 and all(u['parityOk'] for _, _, u in fr)
    for bad in (rec['stream'] + '0', rec['stream'][:-2], '98B8806345000352-000000c', '98B880634500035200000001zz',
                rec['stream'].replace(rec['stream'][16:24], ' ' + rec['stream'][17:24], 1)):
        with pytest.raises(ValueError):
            C.frames(bad)
    assert C.frames('') == []


def test_exact_weave_order_and_segments():
    vals_rec = C.grow(C.synth_shard(70700)[0], engrams=False)
    lh = vals_rec['leafHashes']
    assert C.exact_weave_checks(lh, vals_rec['segCuts']) == (True, True, True)
    sw = lh[:]
    sw[3], sw[4] = sw[4], sw[3]
    assert C.exact_weave(sw) != C.exact_weave(lh)
    assert C.seg_cuts(84) == [0, 12, 24, 36, 48, 60, 72, 84]
    assert C.seg_cuts(1) == [0, 0, 0, 0, 1, 1, 1, 1]          # Math.round(i / 7): i >= 4 rounds up
    assert C.seg_cuts(57) == [round(i * 57 / 7 + 1e-9) for i in range(8)]


def test_synthetic_generator():
    draws = []
    for i in range(12):
        text, d = C.synth_shard(70800 + i)
        data = text.encode()
        two, n = C.two_byte_share(text)
        assert 20000 <= len(data) - 0 <= 60000 and 4 * two >= n
        assert any(C.crystal_has_80(data[k:k + 720]) for k in range(0, len(data), 720))
        assert C.synth_shard(70800 + i) == (text, d)
        assert not any(0xD800 <= ord(c) <= 0xDFFF for c in text)
        draws.append(d)
    assert max(draws) > 1                                  # the redraw rule is exercised
    # a redrawn shard is the generator's next draw from the same Rng
    i = draws.index(max(draws))
    r = Rng(70800 + i)
    for _ in range(max(draws)):
        t = C.synth_draw(r)
    assert t == C.synth_shard(70800 + i)[0]


def test_silent_flips_are_aliases_the_reencode_check_rejects():
    data = rand_bytes(70900, 720, 40)
    res = C.encode_chunk(data)
    fl = C.silent_flips(res, data)
    assert fl and {f['kind'] for f in fl} <= {'padding', 'escape', 'other'}
    for f in fl:
        assert C.decode_chunk(f['alt'], 720) == list(data) and f['alt'] != res
        assert C.encode_chunk(bytes(C.decode_chunk(f['alt'], 720))) != f['alt']
    assert C.silent_flips(res, data, limit=2) == fl[:2]


def test_recreate_text_round_trip():
    t = 'α' * 500 + ' mixed ASCII ' + '\U00010348' * 99
    assert C.recreate_text(C.grow(t)) == t
