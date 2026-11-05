#!/usr/bin/env python3
# Hyperbolic Lexicon, Phase 0, spike S4 (Python side): BioChain-AI's packer and our Python port of the float weave.
#
# WHAT IT MEASURES.
#   1. BioChain-AI protocol/shdccp_kernel.py, imported unchanged: what its crystallize() and pack() write for a chunk
#      whose 32-bit crystal holds a 0x80 byte (it normalises the int8 code -128 to -127, i.e. 0x80 -> 0x81, and
#      recomputes parity), against a raw port of Owl's JS crystallize (biomesh.js), which keeps 0x80.
#   2. The 1,000 synthetic S4 shards, regenerated here from hpstep.prng.Rng(90000 + i) (bit-identical to
#      HPCore.Rng(90000 + i) in s4_lexicon_shard.cjs): their bytes' SHA-256, chunk count and 0x80-crystal count, and
#      the two float weaves biomesh.js growBiochain writes (weaveChiral, weaveMirror), computed by two Python ports:
#        faithful  crystalQuat, qmul, qconj and qn line for line; Math.hypot as V8 computes it (scale by the largest
#                  |x|, Kahan-compensated sum of squares, sqrt, times the largest); Number.prototype.toFixed(12) exactly
#                  (round half up on the exact binary value, no sign on -0) with fractions.Fraction;
#        naive     the same, with Python's math.hypot and format(x, '.12f') (round half even, '-0.000000000000').
#      It counts the calls on which math.hypot differs from the V8 algorithm and the components on which
#      format(x, '.12f') differs from toFixed(12).
#   With --json it instead reads a request from stdin and answers in JSON on stdout: s4_lexicon_shard.cjs sends the
#   chunk bytes, crystal fields and packets of its gloss shards (the kernel packs them), and asks for the synthetic
#   rows (it compares the weave strings with Owl's JS, one by one).
#
# HOW TO RUN, from the repository root (s4_lexicon_shard.cjs runs it the same way, with --json):
#   python3 -B -I "Pages/Hyperbolic Lexicon/spikes/s4_python_pack.py" [--biochain <BioChain-AI checkout>] \
#       > "Pages/Hyperbolic Lexicon/spikes/s4_python_pack_output.txt"
# -B -I are required (no __pycache__ is written, and no environment or script directory is on sys.path); the two
# imports come from explicit sys.path entries: Pages/Hyperbolic Oracles/reference (hpstep.prng) and
# <BioChain-AI>/protocol (shdccp_kernel), which defaults to ../../../../BioChain-AI from this folder. Nothing is
# written to either tree. Lines that begin with "~ " depend on the machine or the runtime; every other line must be
# identical on a rerun.
#
# WHAT IT SETTLES. With s4_lexicon_shard.cjs: L8's Python prediction (whether a Python port reproduces the weave
# strings), and the 0x80 divergence of BioChain-AI's packer. It decides no claim; it runs before PREREGISTRATION.md.
#
# DATA AND SEEDS. Synthetic only: shard i (i = 0..999) from Rng(90000 + i). target = 4 + below(59997) bytes; then one
# 32-bit draw u = below(2^32) per code point, class u % 100 and value v = u // 100: 0-49 an ASCII letter
# (v % 52), 50-61 a space, 62-69 one of 30 ASCII digits and marks (v % 30, newline and tab among them), 70-84
# U+0080 + v % 0x780 (2 bytes), 85-94 U+0800 + v % 0xF000 with the surrogates skipped (3 bytes), 95-99
# U+10000 + v % 0x100000 (4 bytes). The first code point that would pass the target ends the shard. No WordNet data.
#
# RUNTIME. About 20-30 s on one core (generating ~20 M code points with the Python Rng dominates).
import hashlib
import json
import math
import os
import sys
import time
from fractions import Fraction

if not (sys.flags.dont_write_bytecode and sys.flags.isolated):
    sys.exit('run as python3 -B -I (no __pycache__, isolated sys.path)')

HERE = os.path.dirname(os.path.abspath(__file__))


def _opt(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


BIOCHAIN = os.path.abspath(_opt('--biochain', os.path.join(HERE, '..', '..', '..', '..', 'BioChain-AI')))
HO_REF = os.path.abspath(os.path.join(HERE, '..', '..', 'Hyperbolic Oracles', 'reference'))
KERNEL_FILE = os.path.join(BIOCHAIN, 'protocol', 'shdccp_kernel.py')
sys.path.insert(0, HO_REF)
sys.path.insert(0, os.path.join(BIOCHAIN, 'protocol'))
from hpstep.prng import Rng          # noqa: E402  (the shared generator)
import shdccp_kernel as K            # noqa: E402  (BioChain-AI, unchanged)

N_SYNTH, SEED0, CHUNK = 1000, 90000, 720
LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
PUNCT = '0123456789.,;:\'!?-()"\n\t/&%#*+='
M64 = (1 << 64) - 1


def synth_shard(i):
    r = Rng(SEED0 + i)
    target = 4 + r.below(59997)
    out = bytearray()
    while True:
        u = r.below(4294967296)
        cls, v = u % 100, u // 100
        if cls < 50:
            cp = ord(LETTERS[v % 52])
        elif cls < 62:
            cp = 32
        elif cls < 70:
            cp = ord(PUNCT[v % len(PUNCT)])
        elif cls < 85:
            cp = 0x80 + v % 0x780
        elif cls < 95:
            cp = 0x800 + v % 0xF000
            if cp >= 0xD800:
                cp += 0x800
        else:
            cp = 0x10000 + v % 0x100000
        b = chr(cp).encode('utf-8')
        if len(out) + len(b) > target:
            return bytes(out)
        out += b


# ---- biomesh.js, ported: fold64, the crystal word (raw, as JS writes it), crystalQuat, qmul, qconj, qn, quatHex
def fold64(bs):
    a = 0x9E3779B97F4A7C15
    for b in bs:
        a = (((a << 7) | (a >> 57)) & M64) ^ ((b * 0x100000001B3) & M64)
    return a


def crystal32(bs):
    f = fold64(bs)
    return (f ^ (f >> 32)) & 0xFFFFFFFF


def int8_codes(c32):
    out = []
    for i in (24, 16, 8, 0):
        v = (c32 >> i) & 255
        out.append(v - 256 if v >= 128 else v)
    return out


def parity63(word):
    return bin(word & (M64 ^ (1 << 59))).count('1') & 1


def raw_crystallize(bs):              # Owl's JS crystallize: the crystal goes in raw, 0x80 kept
    c32 = crystal32(bs)
    csum = sum(bs) & 0xFF
    word = (9 << 60) | (c32 << 24) | ((len(bs) & 0xFFFF) << 8) | ((csum >> 3) << 3) | (csum & 7)
    word |= parity63(word) << 59
    return '%016X' % word


def qmul(a, b):
    return [a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3], a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],
            a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1], a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]]


def qconj(a):
    return [a[0], -a[1], -a[2], -a[3]]


def v8_hypot(a):                      # V8's Math.hypot (builtins/math.tq): scale, Kahan sum of squares, sqrt, rescale
    absv = [abs(x) for x in a]
    mx = 0.0
    for x in absv:
        if x > mx:
            mx = x
    if mx == math.inf:
        return math.inf
    if mx == 0:
        return 0.0
    s = comp = 0.0
    for x in absv:
        n = x / mx
        summand = n * n - comp
        pre = s + summand
        comp = (pre - s) - summand
        s = pre
    return math.sqrt(s) * mx


def js_to_fixed(x, f=12):             # Number.prototype.toFixed(f): n = floor(|x| 10^f + 1/2) on the exact value
    if x != x:
        return 'NaN'
    if abs(x) >= 1e21:
        raise ValueError('toFixed above 1e21 is ToString, not needed here')
    s = ''
    if x < 0:
        s, x = '-', -x
    m = str(math.floor(Fraction(x) * 10 ** f + Fraction(1, 2)))
    if f:
        k = len(m)
        if k <= f:
            m = '0' * (f + 1 - k) + m
            k = f + 1
        m = m[:k - f] + '.' + m[k - f:]
    return s + m


class Counter:
    def __init__(self):
        self.calls = self.diffs = 0


def make_port(hyp, fmt):
    def qn(a):
        n = hyp(a) or 1
        return [x / n for x in a]
    return qn, fmt


def weave_rows(data, hyp_count, fix_count):
    """Both weaves of one shard under both ports, plus the shard's chunk and 0x80 counts."""
    chunks = [data[i:i + CHUNK] for i in range(0, len(data), CHUNK)]
    raw, n80 = [], 0
    for c in chunks:
        cs = int8_codes(crystal32(c))
        if -128 in cs:
            n80 += 1
        raw.append([0.5 + cs[0] / 254, cs[1] / 127, cs[2] / 127, cs[3] / 127])

    def hyp_faithful(a):
        h = v8_hypot(a)
        hyp_count.calls += 1
        if math.hypot(*a) != h:
            hyp_count.diffs += 1
        return h

    def fmt_faithful(x):
        s = js_to_fixed(x, 12)
        fix_count.calls += 1
        if format(x, '.12f') != s:
            fix_count.diffs += 1
        return s

    out = []
    for hyp, fmt in ((hyp_faithful, fmt_faithful), (lambda a: math.hypot(*a), lambda x: format(x, '.12f'))):
        qn, _ = make_port(hyp, fmt)
        cq = [qn(r) for r in raw]
        wf = [1.0, 0.0, 0.0, 0.0]
        for q in cq:
            wf = qn(qmul(q, wf))
        wm = [1.0, 0.0, 0.0, 0.0]
        for q in reversed(cq):
            wm = qn(qmul(qconj(q), wm))
        out.append(','.join(fmt(v) for v in wf))
        out.append(','.join(fmt(v) for v in wm))
    return out, len(chunks), n80


def synth_all(n=N_SYNTH):
    hyp_count, fix_count, rows = Counter(), Counter(), []
    t_gen = t_weave = 0.0
    for i in range(n):
        t0 = time.perf_counter()
        data = synth_shard(i)
        t1 = time.perf_counter()
        (cf, mf, cn, mn), nch, n80 = weave_rows(data, hyp_count, fix_count)
        t_weave += time.perf_counter() - t1
        t_gen += t1 - t0
        rows.append([hashlib.sha256(data).hexdigest(), cf, mf, cn, mn, nch, n80, len(data)])
    return {'rows': rows, 'hypot': [hyp_count.calls, hyp_count.diffs], 'fixed': [fix_count.calls, fix_count.diffs],
            'ms': {'generate': round(t_gen * 1000), 'weave': round(t_weave * 1000)}}


def example():                        # the documented divergence: crystallize(bytes [75, 0, 7])
    c = bytes([75, 0, 7])
    return {'bytes': [75, 0, 7], 'codes': int8_codes(crystal32(c)), 'kernel': K.packet_hex(K.crystallize(c)),
            'raw_port': raw_crystallize(c)}


def pack_request(items):
    out = []
    for sh in items:
        kern, packed, raw, ok, m128 = [], [], [], 0, 0
        for chex, fld, jsp in zip(sh['chunks'], sh['fields'], sh['packets']):
            c = bytes.fromhex(chex)
            kern.append(K.packet_hex(K.crystallize(c)))
            form, spin, q0, q1, q2, q3, payload, freq, amp = fld
            packed.append(K.packet_hex(K.pack(form, spin, (q0, q1, q2, q3), payload, freq, amp)))
            raw.append(raw_crystallize(c))
            try:
                u = K.unpack(int(jsp, 16))
                ok += 1
                m128 += list(u['quat_codes']).count(-128)
            except ValueError:
                pass
        out.append({'name': sh['name'], 'kernel': kern, 'packed': packed, 'raw_port': raw, 'unpack_ok': ok,
                    'unpack_minus128': m128})
    return out


def kernel_sha():
    with open(KERNEL_FILE, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def digest(lines):
    return hashlib.sha256('\n'.join(lines).encode('utf-8')).hexdigest()


def main_json():
    req = json.loads(sys.stdin.read())
    t0 = time.perf_counter()
    res = {'python': sys.version.split()[0], 'kernel_sha256': kernel_sha(), 'example': example(),
           'pack': pack_request(req.get('pack', []))}
    t1 = time.perf_counter()
    res['synth'] = synth_all(int(req.get('synth', N_SYNTH)))
    res['ms_pack'] = round((t1 - t0) * 1000)
    sys.stdout.write(json.dumps(res))


def main_report():
    t0 = time.perf_counter()
    print('S4 s4_python_pack (Python side of S4): BioChain-AI shdccp_kernel packing and two Python ports of the biomesh.js float weave, on the 1,000 synthetic S4 shards')
    print('Settles, with s4_lexicon_shard.cjs: L8\'s Python prediction (weave-string agreement) and the 0x80 packing divergence. Decides no claim. Synthetic data only (Rng(90000+i)).')
    print('~ python %s, %s' % (sys.version.split()[0], sys.platform))
    print('')
    print('1. BioChain-AI protocol/shdccp_kernel.py (imported unchanged, python3 -B -I, explicit sys.path)')
    print('  sha256 %s' % kernel_sha())
    ex = example()
    print('  crystallize(bytes [75, 0, 7]): crystal int8 codes %s' % ex['codes'])
    print('    kernel crystallize (code -128 written as -127, parity recomputed): %s' % ex['kernel'])
    print('    raw port of Owl\'s JS crystallize (0x80 kept):                    %s' % ex['raw_port'])
    print('    they differ: %s; kernel.unpack of the raw word reads codes %s' % (ex['kernel'] != ex['raw_port'],
          list(K.unpack(int(ex['raw_port'], 16))['quat_codes'])))
    print('')
    s = synth_all()
    rows = s['rows']
    nb = sum(r[7] for r in rows)
    nch = sum(r[5] for r in rows)
    n80 = sum(r[6] for r in rows)
    p = Fraction(256 ** 4 - 255 ** 4, 256 ** 4)
    print('2. The 1,000 synthetic shards, regenerated from hpstep.prng.Rng(90000 + i)')
    print('  bytes %d (min %d, max %d), chunks %d, shards with 84 chunks %d' % (nb, min(r[7] for r in rows), max(r[7] for r in rows),
          nch, sum(1 for r in rows if r[5] == 84)))
    print('  inputs digest (sha256 over the 1,000 shard sha256s, one per line): %s' % digest([r[0] for r in rows]))
    print('  chunks whose crystal holds a 0x80 byte: %d of %d = %.4f%% (analytic 1 - (255/256)^4 = %s = %.4f%%)' % (
        n80, nch, 100 * n80 / nch, p, 100 * float(p)))
    print('  shards with at least one such chunk: %d of %d' % (sum(1 for r in rows if r[6]), len(rows)))
    print('')
    print('3. The float weave (weaveChiral, weaveMirror), two Python ports')
    print('  weave digest, faithful port (sha256 over "chiral|mirror" lines): %s' % digest(['%s|%s' % (r[1], r[2]) for r in rows]))
    print('  weave digest, naive port:                                         %s' % digest(['%s|%s' % (r[3], r[4]) for r in rows]))
    print('  s4_lexicon_shard.cjs prints the same digest of Owl\'s JS weaves; equal digests mean every string agrees')
    dc = sum(1 for r in rows if r[1] != r[3])
    dm = sum(1 for r in rows if r[2] != r[4])
    print('  naive against faithful: weaveChiral differs on %d of 1000 shards, weaveMirror on %d; either on %d' % (
        dc, dm, sum(1 for r in rows if r[1] != r[3] or r[2] != r[4])))
    print('  math.hypot against V8\'s Math.hypot algorithm: differ on %d of %d calls (on the faithful port\'s inputs)' % (s['hypot'][1], s['hypot'][0]))
    print('  format(x, \'.12f\') against toFixed(12): differ on %d of %d weave components' % (s['fixed'][1], s['fixed'][0]))
    print('~ generate %d ms, weave %d ms' % (s['ms']['generate'], s['ms']['weave']))
    print('')
    print('SETTLES:')
    print('- BioChain-AI\'s kernel writes 0x81 where Owl\'s JS writes 0x80 (e.g. [75, 0, 7]: %s vs %s); a raw port reproduces the JS word.' % (ex['kernel'], ex['raw_port']))
    print('- On the synthetic shards %.4f%% of chunks have a 0x80 crystal byte (analytic %.4f%%).' % (100 * n80 / nch, 100 * float(p)))
    print('- A Python port with Python\'s own math.hypot and %%.12f writes a different weave string on %d of 1000 shards; with V8\'s hypot and exact toFixed see the digest comparison in s4_lexicon_shard_output.txt.' % (
        sum(1 for r in rows if r[1] != r[3] or r[2] != r[4])))
    print('~ total runtime %.1f s' % (time.perf_counter() - t0))


if __name__ == '__main__':
    if '--json' in sys.argv:
        main_json()
    else:
        main_report()
