"""Owl Academy's shdccp/2 biochain, grown synchronously in Python (Phase 3; L8; Amendment 7 items 1, 2 and 4).

Owl Academy's scripts/biomesh.js (7f45f35) growBiochain, step for step, as spike S4's growSync restated it on
biochain_v1.js (Owl's codec, verbatim) and orbital_core's SHA-256 over UTF-8. Every step is a line-by-line port of
the JavaScript, with the JavaScript's own quirks kept:

    leaves      leaf i = sha256Hex(i + '|' + sha256Hex(String.fromCharCode(...chunk))): the chunk's bytes read as
                code units 0-255 and hashed as UTF-8 (so a byte >= 0x80 is hashed as two bytes), the outer hash over
                the decimal index, '|' and the inner hash's lowercase hex
    root        the shdccp/2 Merkle rule: pairwise SHA-256 over the concatenated hex strings, an odd last node
                duplicated, a one-leaf root the leaf itself
    weaves      crystalQuat, qmul, qconj and qn in IEEE-754 double, with V8's Math.hypot algorithm (scale by the
                largest |x|, Kahan-compensated sum of squares, sqrt, times the largest) and Number.prototype.toFixed(12)
                exactly (round half up on the exact binary value), as spike S4's s4_python_pack.py proved on 1,000
                shards; Python's math.hypot differs from V8's on about 31% of calls
    packets     crystallize: the 32-bit crystal written raw (Owl keeps the byte 0x80); kernel_crystallize is
                BioChain-AI protocol/shdccp_kernel.py's normalisation (int8 code -128 written as -127, parity
                recomputed), the grower of L8's control 1
    codec       the order-2 rank coder (encodeChunk / decodeChunk) with Elias-gamma ranks and raw-byte escapes,
                candidates ordered by count descending then byte ascending (kept incrementally here; the order is
                the same total order JS sorts each time)
    engrams     engram.ttmpt.engram_stream (biomesh.js engramStreamFromText), imported in place

    grow(text, engrams=True, packets='owl', leaves='owl')   Owl's record, field for field, in Owl's key order
    frames(stream), recreate_chunks(record), recreate_text(record)
    encode_chunk(bytes), decode_chunk(hex, n), crystallize(bytes), kernel_crystallize(bytes), unpack_packet(hex)
    leaf_hash(i, chunk), merkle_shdccp2(leaves), weaves(chunks), quat_hex(q), seg_cuts(K)
    exact_weave(leafHashes), segment_weaves(leafHashes, segCuts), weave3_text(q), weave3_sha(q)   (item 4)
    silent_flips(residual, chunk)          S4's search: single-bit residual flips that decode to the same bytes (T9)
    synth_shard(seed)                      Amendment 7 item 2's generator (text, draws)
    gloss_shards(wn, pos)                  spike S4's cut of the verb or adjective glosses (the dry runs)
    js_to_fixed(x, f), js_number(x), js_json(obj)   JavaScript's number and JSON text, for records and traces

engram.ttmpt (engram_stream), engram.address (chain_quaternion, packet_quaternions, unfold, qprod) and hpstep.prng
(Rng) are imported in place, unchanged.
"""
import hashlib
import json
import math
import re
from fractions import Fraction

from engram.address import L as ADDRESS_LETTERS
from engram.address import chain_quaternion, packet_quaternions, qprod, unfold
from engram.ttmpt import engram_stream
from hpstep.prng import Rng

MAX_GROW_BYTES = 60000
STREAM_VERSION = 'shdccp/2'
CHUNK = 720
SEGMENTS = 7
M64 = (1 << 64) - 1
PAR_MASK = M64 ^ (1 << 59)
FIELDS = ('chainId', 'stream', 'streamVersion', 'leafHashes', 'merkleRoot', 'weaveChiral', 'weaveMirror', 'segCuts',
          'segments', 'engramStream', 'engramCount', 'engramMeanJ', 'origBytes', 'shippedBytes', 'value')
ENGRAM_FIELDS = ('engramStream', 'engramCount', 'engramMeanJ')
_HEX = re.compile(r'[0-9A-Fa-f]*')


def sha256hex(s):
    """SC.sha256Hex / orbital_core: SHA-256 of a string's UTF-8 (or of bytes), lowercase hex."""
    return hashlib.sha256(s.encode('utf-8') if isinstance(s, str) else bytes(s)).hexdigest()


def js_utf8(text):
    """TextEncoder.encode: UTF-8, a lone surrogate written as U+FFFD (a Python str holds none when it came from
    valid UTF-8; a surrogate pair is joined first, as a JS string would read it)."""
    if any(0xD800 <= ord(c) <= 0xDFFF for c in text):
        text = text.encode('utf-16-le', 'surrogatepass').decode('utf-16-le', 'replace')
    return text.encode('utf-8')


# ================================================================ JavaScript's numbers
def js_to_fixed(x, f=12):
    """Number.prototype.toFixed(f) for |x| < 1e21: n = floor(|x| 10^f + 1/2) on the exact binary value; '-' when
    x < 0 (so a tiny negative gives '-0.000000000000'; -0 gives '0.000...')."""
    if x != x:
        return 'NaN'
    if abs(x) >= 1e21:
        raise ValueError('toFixed above 1e21 is ToString; not needed here')
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


def js_number(x):
    """Number::toString (ECMAScript 6.1.6.1.20) of an int or a float: the shortest round-trip digits (Python's repr
    gives the same digits), laid out as JavaScript does ('1', '0.25', '1e-7', '1.5e+21'; -0 is '0')."""
    if isinstance(x, bool):
        raise TypeError('a boolean is not a number')
    if isinstance(x, int):
        return str(x)
    if x != x:
        return 'NaN'
    if x in (math.inf, -math.inf):
        return 'Infinity' if x > 0 else '-Infinity'
    if x == 0:
        return '0'
    if x < 0:
        return '-' + js_number(-x)
    r = repr(x)
    mant, _, exp = r.partition('e')
    e = int(exp) if exp else 0
    if '.' in mant:
        ip, fp = mant.split('.')
    else:
        ip, fp = mant, ''
    digits = (ip + fp).lstrip('0')
    lead = len(ip + fp) - len((ip + fp).lstrip('0'))
    n = len(ip) - lead + e                       # value = 0.digits * 10^n
    digits = digits.rstrip('0')
    k = len(digits)
    if k <= n <= 21:
        return digits + '0' * (n - k)
    if 0 < n <= 21:
        return digits[:n] + '.' + digits[n:]
    if -6 < n <= 0:
        return '0.' + '0' * (-n) + digits
    e1 = n - 1
    sign = '+' if e1 > 0 else '-'
    return (digits if k == 1 else digits[0] + '.' + digits[1:]) + 'e' + sign + str(abs(e1))


def js_json(obj):
    """JSON.stringify(obj) without spaces, for the values a record or package holds (dict, list, str, int, float,
    bool, None). Keys keep their insertion order, as a JS object's own string keys do."""
    if obj is None:
        return 'null'
    if obj is True:
        return 'true'
    if obj is False:
        return 'false'
    if isinstance(obj, (int, float)):
        return js_number(obj) if obj == obj and abs(obj) != math.inf else 'null'
    if isinstance(obj, str):
        return json.dumps(obj, ensure_ascii=False)
    if isinstance(obj, (list, tuple)):
        return '[' + ','.join(js_json(x) for x in obj) + ']'
    if isinstance(obj, dict):
        return '{' + ','.join(json.dumps(str(k), ensure_ascii=False) + ':' + js_json(v) for k, v in obj.items()) + '}'
    raise TypeError(f'not a JSON value: {type(obj).__name__}')


# ================================================================ the crystal and the packet
def fold64(data):
    a = 0x9E3779B97F4A7C15
    for b in data:
        a = (((a << 7) | (a >> 57)) & M64) ^ ((b * 0x100000001B3) & M64)
    return a


def crystal32(data):
    f = fold64(data)
    return (f ^ (f >> 32)) & 0xFFFFFFFF


def popcount_even(word):
    """biomesh.js popcountEven: the parity of the other 63 bits."""
    return bin(word & PAR_MASK).count('1') & 1


def crystallize(data):
    """biomesh.js crystallize (biochain_v1.js crystallizeBytes): Form 9, spin 0, the 32-bit crystal raw, payload16 the
    chunk length, freq/amp the byte sum's 5/3 split, parity set last; 16 uppercase hex digits."""
    c32 = crystal32(data)
    csum = sum(data) & 0xFF
    word = (9 << 60) | (c32 << 24) | ((len(data) & 0xFFFF) << 8) | ((csum >> 3) << 3) | (csum & 7)
    word |= popcount_even(word) << 59
    return '%016X' % word


def kernel_crystallize(data):
    """BioChain-AI protocol/shdccp_kernel.py crystallize (L8 control 1): as crystallize, but each int8 crystal code
    -128 is written as -127 (the byte 0x80 as 0x81), and parity recomputed. Ported here (D12: BioChain-AI's Python
    runs only as python3 -B -I; tests/test_chain.py runs the kernel itself that way and compares)."""
    c32 = crystal32(data)
    q = 0
    for i in (24, 16, 8, 0):
        v = (c32 >> i) & 0xFF
        q = (q << 8) | (0x81 if v == 0x80 else v)
    csum = sum(data) & 0xFF
    word = (9 << 60) | (q << 24) | ((len(data) & 0xFFFF) << 8) | ((csum >> 3) << 3) | (csum & 7)
    word |= popcount_even(word) << 59
    return '%016X' % word


def unpack_packet(hexword):
    """biomesh.js unpackPacket on a 16-hex-digit word."""
    if len(hexword) != 16 or not _HEX.fullmatch(hexword):
        raise ValueError(f'a packet is 16 hex digits: {hexword!r}')
    word = int(hexword, 16)
    payload16 = (word >> 8) & 0xFFFF
    return {'form': (word >> 60) & 0xF, 'spin': (word >> 56) & 0x7, 'quat32': (word >> 24) & 0xFFFFFFFF,
            'payload16': payload16, 'chunkLen': payload16, 'freq': (word >> 3) & 0x1F, 'amp': word & 0x7,
            'parityOk': popcount_even(word) == (word >> 59) & 1}


def refix_parity(word):
    """Set a 64-bit word's parity bit for its other 63 bits (S4's refixParity: the T2 tamper keeps parity valid)."""
    word &= ~(1 << 59) & M64
    return word | (popcount_even(word) << 59)


def has_80(packet):
    """The 32-bit crystal (bits 55..24) of a packet holds the byte 0x80."""
    q = int(packet, 16) >> 24 & 0xFFFFFFFF
    return any((q >> s) & 0xFF == 0x80 for s in (24, 16, 8, 0))


def crystal_has_80(data):
    c = crystal32(data)
    return any((c >> s) & 0xFF == 0x80 for s in (24, 16, 8, 0))


# ================================================================ the float weave (V8's Math.hypot, exact toFixed)
def qmul(a, b):
    return [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
            a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]]


def qconj(a):
    return [a[0], -a[1], -a[2], -a[3]]


def v8_hypot(a):
    """V8's Math.hypot (builtins/math.tq): scale by the largest |x|, Kahan-compensated sum of squares, sqrt, rescale."""
    absv = [abs(x) for x in a]
    nan = any(x != x for x in absv)
    mx = 0.0
    for x in absv:
        if x == x and x > mx:
            mx = x
    if mx == math.inf:
        return math.inf
    if nan:
        return math.nan
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


def qn(a):
    """biomesh.js qn: a / (Math.hypot(...a) || 1)."""
    n = v8_hypot(a)
    if n == 0 or n != n:
        n = 1
    return [x / n for x in a]


def _int8(v):
    return v - 256 if v >= 128 else v


def crystal_quat(data):
    c = crystal32(data)
    return qn([0.5 + _int8((c >> 24) & 255) / 254, _int8((c >> 16) & 255) / 127, _int8((c >> 8) & 255) / 127,
               _int8(c & 255) / 127])


def quat_hex(q):
    return ','.join(js_to_fixed(v, 12) for v in q)


def weaves(chunks):
    """(weaveChiral, weaveMirror) as float quaternions: wf = qn(q_k * wf) over the chunks in order, wm =
    qn(conj(q_k) * wm) over them in reverse."""
    cq = [crystal_quat(c) for c in chunks]
    wf = [1.0, 0.0, 0.0, 0.0]
    for q in cq:
        wf = qn(qmul(q, wf))
    wm = [1.0, 0.0, 0.0, 0.0]
    for q in reversed(cq):
        wm = qn(qmul(qconj(q), wm))
    return wf, wm


def seg_cuts(K):
    """Math.round(i * K / 7), i = 0..7: i K / 7 is never within 1/14 of a half, so round half up is exact here."""
    return [(2 * i * K + SEGMENTS) // (2 * SEGMENTS) for i in range(SEGMENTS + 1)]


# ================================================================ the order-2 rank coder
def _bump(order, cnt, b):
    """Count b once more in a context and move it to its place in cands() order (count desc, byte asc)."""
    c = cnt.get(b, 0) + 1
    cnt[b] = c
    if c == 1:
        order.append(b)
        j = len(order) - 1
    else:
        j = order.index(b)
    while j > 0:
        p = order[j - 1]
        pc = cnt[p]
        if pc < c or (pc == c and p > b):
            order[j] = p
            order[j - 1] = b
            j -= 1
        else:
            break


def encode_chunk(data):
    """biomesh.js encodeChunk: for each byte, its rank among the context's candidates as an Elias-gamma code (rank+1),
    or the escape code (candidates+1) then the byte in 8 bits; bits packed MSB first, the last byte zero-padded;
    lowercase hex."""
    tabs = {}
    out = bytearray()
    acc = nb = 0
    ctx = 0                                      # (previous byte << 8) | last byte; the start context is "0,0"
    for b in data:
        t = tabs.get(ctx)
        if t is None:
            t = tabs[ctx] = ([], {})
        order, cnt = t
        if b in cnt:
            n = order.index(b) + 1
            w = n.bit_length()
            acc = (acc << (2 * w - 1)) | n
            nb += 2 * w - 1
        else:
            n = len(order) + 1
            w = n.bit_length()
            acc = (acc << (2 * w + 7)) | (n << 8) | b
            nb += 2 * w + 7
        while nb >= 8:
            nb -= 8
            out.append((acc >> nb) & 0xFF)
        acc &= (1 << nb) - 1
        _bump(order, cnt, b)
        ctx = ((ctx & 0xFF) << 8) | b
    if nb:
        out.append((acc << (8 - nb)) & 0xFF)
    return out.hex()


class JsUndefined(ValueError):
    """A rank code JavaScript reads with 32-bit overflow as a negative rank: decodeChunk would push undefined, which
    can never equal a byte, so no byte decode exists."""


def _i32(x):
    x &= 0xFFFFFFFF
    return x - (1 << 32) if x & 0x80000000 else x


def decode_chunk(hexstr, length, trace=False):
    """biomesh.js decodeChunk: `length` bytes from a residual. Raises ValueError('residual truncated') where JS throws.

    Ranks are read as JS reads them: (1 << z) | r(z) in 32-bit arithmetic, so a code of z >= 31 zeros wraps (the
    shift count is z mod 32 and only the last 32 bits read survive); a wrapped rank of 0 or less is JsUndefined (JS
    would push undefined). A canonical residual never holds such a code (its ranks are at most 257). With trace=True
    returns (bytes, bits used, bits in all, escapes [(start bit, end bit, candidates)]) as S4's decodeTraced."""
    if len(hexstr) % 2 or not _HEX.fullmatch(hexstr):
        raise ValueError('a residual is hex digit pairs')
    data = bytes.fromhex(hexstr)
    total = len(data) * 8
    bits = format(int.from_bytes(data, 'big'), 'b').zfill(total) if total else ''
    p = 0
    tabs = {}
    out = []
    escapes = []
    ctx = 0
    for _ in range(length):
        t = tabs.get(ctx)
        if t is None:
            t = tabs[ctx] = ([], {})
        order, cnt = t
        p0 = p
        q = bits.find('1', p)
        if q < 0:
            raise ValueError('residual truncated')
        z = q - p
        p = q + 1
        if z:
            if p + z > total:
                raise ValueError('residual truncated')
            v = int(bits[p:p + z], 2)
            p += z
            n = (1 << z) | v if z <= 30 else _i32((1 << (z & 31)) | (v & 0xFFFFFFFF))
        else:
            n = 1
        if n - 1 < len(order):
            if n - 1 < 0:
                raise JsUndefined('a rank code that JavaScript reads as undefined')
            b = order[n - 1]
        else:
            if p + 8 > total:
                raise ValueError('residual truncated')
            escapes.append((p0, p, len(order)))
            b = int(bits[p:p + 8], 2)
            p += 8
        out.append(b)
        _bump(order, cnt, b)
        ctx = ((ctx & 0xFF) << 8) | b
    if trace:
        return out, p, total, escapes
    return out


def frame_stream(packets, residuals):
    """biomesh.js frameStream: packet + residual bytes as 8 lowercase hex digits + residual, frame after frame."""
    return ''.join(pk + format(len(r) // 2, '08x') + r for pk, r in zip(packets, residuals))


_FRAME = re.compile(r'([0-9A-Fa-f]{16})([0-9A-Fa-f]{8})')


def frames(stream):
    """The stream's frames [(packet, residual, unpacked packet)], parsed strictly: 16 hex digits, 8 hex digits n,
    then exactly n hex digit pairs, frame after frame to the end of the string (ValueError otherwise).

    READING (the hardened verifier's parse): Owl's parseBiochainStream reads the length with parseInt, which takes
    a sign, whitespace or a prefix of hex digits and loops forever on a negative length such as '-000000c'; a stream
    that does not parse strictly fails the first check, 'parity'. A well-formed stream parses the same both ways."""
    if not isinstance(stream, str):
        raise ValueError('no stream on the record')
    out, p, n = [], 0, len(stream)
    while p < n:
        m = _FRAME.match(stream, p)
        if not m:
            raise ValueError(f'malformed stream frame at {p}')
        rlen = int(m.group(2), 16) * 2
        r0 = m.end()
        residual = stream[r0:r0 + rlen]
        if len(residual) != rlen or not _HEX.fullmatch(residual):
            raise ValueError(f'malformed residual at {r0}')
        out.append((m.group(1), residual, unpack_packet(m.group(1))))
        p = r0 + rlen
    return out


def recreate_chunks(record):
    """biomesh.js recreateChunks on a v2 record (strict parse): the decoded chunks; ValueError on parity or decode."""
    out = []
    for pk, res, u in frames(record['stream']):
        if not u['parityOk']:
            raise ValueError('packet parity failed')
        out.append(decode_chunk(res, u['chunkLen']))
    return out


def recreate_text(record):
    """recreateText: the decoded bytes through TextDecoder (U+FFFD for ill-formed UTF-8)."""
    return bytes(b for c in recreate_chunks(record) for b in c).decode('utf-8', 'replace')


# ================================================================ leaves, root, chainId
def leaf_hash(i, chunk):
    """sha256Hex(i + '|' + sha256Hex(String.fromCharCode(...chunk))): the inner hash over the chunk's bytes as code
    units 0-255, in UTF-8."""
    inner = hashlib.sha256(bytes(chunk).decode('latin-1').encode('utf-8')).hexdigest()
    return hashlib.sha256((str(i) + '|' + inner).encode('ascii')).hexdigest()


def leaf_hash_binary(i, chunk):
    """L8 control 2, a grower that hashes leaves over binary bytes: SHA-256(ASCII(i + '|') + SHA-256(chunk) as its
    32 raw bytes), lowercase hex.

    READING: "hashes leaves over binary bytes" is read as hashing binary digests and raw chunk bytes where Owl
    hashes text (the code units of String.fromCharCode in UTF-8, and the inner hash's hex). Hashing only the
    chunk's raw bytes would equal Owl's leaf on every all-ASCII chunk, and the control is registered to differ on
    every non-empty shard; with the inner digest's 32 raw bytes in the outer hash it does."""
    return hashlib.sha256((str(i) + '|').encode('ascii') + hashlib.sha256(bytes(chunk)).digest()).hexdigest()


def merkle_shdccp2(leaves):
    """The shdccp/2 Merkle rule (growBiochain): pairwise SHA-256 over the concatenated hex strings, an odd last node
    duplicated; the root of one leaf is the leaf itself; None for no leaves."""
    level = list(leaves)
    while len(level) > 1:
        if len(level) & 1:
            level.append(level[-1])
        level = [hashlib.sha256((level[i] + level[i + 1]).encode('utf-8')).hexdigest()
                 for i in range(0, len(level), 2)]
    return level[0] if level else None


def chain_id(merkle_root, weave_chiral):
    return 'BC-' + sha256hex(merkle_root + '|' + weave_chiral)[:24]


# ================================================================ the grower
def _chunks(data):
    return [data[i:i + CHUNK] for i in range(0, len(data), CHUNK)]


def grow(text, engrams=True, packets='owl', leaves='owl'):
    """growBiochain(text, { engrams }), synchronously: Owl's record with its fields in Owl's order.

    text: a str (UTF-8 encoded as TextEncoder does) or UTF-8 bytes. packets='kernel' packs with BioChain-AI's
    kernel normalisation (L8 control 1); leaves='binary' hashes leaves over binary bytes (L8 control 2)."""
    if isinstance(text, (bytes, bytearray)):
        data = bytes(text)
        text = data.decode('utf-8')
    else:
        data = js_utf8(text)
    if not data:
        raise ValueError('Nothing to grow.')
    if len(data) > MAX_GROW_BYTES:
        raise ValueError(f'Grow input capped at {MAX_GROW_BYTES} bytes (got {len(data)}).')
    chunks = _chunks(data)
    residuals = [encode_chunk(c) for c in chunks]
    pack = {'owl': crystallize, 'kernel': kernel_crystallize}[packets]
    pkts = [pack(c) for c in chunks]
    lh = {'owl': leaf_hash, 'binary': leaf_hash_binary}[leaves]
    leaf_hashes = [lh(i, c) for i, c in enumerate(chunks)]
    root = merkle_shdccp2(leaf_hashes)
    stream = frame_stream(pkts, residuals)
    cuts = seg_cuts(len(chunks))
    wf, wm = weaves(chunks)
    merkle_root = root or sha256hex('empty')
    chiral = quat_hex(wf)
    eng = engram_stream(text) if engrams else None
    ship = len(stream) / 2 + (len(eng['stream']) / 2 if eng else 0) + len(leaf_hashes) * 32 + 40
    rec = {'chainId': chain_id(merkle_root, chiral), 'stream': stream, 'streamVersion': STREAM_VERSION,
           'leafHashes': leaf_hashes, 'merkleRoot': merkle_root, 'weaveChiral': chiral, 'weaveMirror': quat_hex(wm),
           'segCuts': cuts, 'segments': SEGMENTS}
    if eng:
        rec['engramStream'] = eng['stream']
        rec['engramCount'] = eng['count']
        rec['engramMeanJ'] = eng['meanJ']
    rec['origBytes'] = len(data)
    rec['shippedBytes'] = int(math.floor(ship + 0.5))
    rec['value'] = float(js_to_fixed(len(data) / ship, 4))
    return rec


def diff_fields(a, b):
    """S4's diffFields: the fields (Owl's fifteen and any other key) whose JSON differs, and '(key order)'."""
    keys = list(dict.fromkeys(list(FIELDS) + list(a) + list(b)))
    bad = [k for k in keys if (js_json(a[k]) if k in a else None) != (js_json(b[k]) if k in b else None)]
    if list(a) != list(b):
        bad.append('(key order)')
    return bad


# ================================================================ the exact weave (Amendment 7 item 4)
def leaf_values(leaf_hashes):
    """v_k: the first 8 bytes (16 hex digits) of leafHashes[k], big-endian."""
    return [int(h[:16], 16) for h in leaf_hashes]


def exact_weave(leaf_hashes):
    """engram_core.chainQuaternion(v_0 .. v_{K-1}): an integer quaternion of norm 5^(28K)."""
    return chain_quaternion(leaf_values(leaf_hashes))


def segment_weaves(leaf_hashes, cuts):
    """The products of packetQuaternions over the record's segCuts, as spike S4 computed them."""
    pq = packet_quaternions(leaf_values(leaf_hashes))
    return [qprod(pq[lo:hi]) for lo, hi in zip(cuts, cuts[1:])]


def weave3_text(q):
    """The exact weave's components in decimal joined by ','."""
    return ','.join(str(c) for c in q)


def weave3_sha(q):
    return sha256hex(weave3_text(q))


def exact_weave_checks(leaf_hashes, cuts, q=None):
    """L9(b) on one record: (norm == 5^(28K), unfold gives the prefixes in order, the segment product equals it)."""
    K = len(leaf_hashes)
    q = exact_weave(leaf_hashes) if q is None else q
    vals = leaf_values(leaf_hashes)
    norm_ok = sum(c * c for c in q) == 5 ** (ADDRESS_LETTERS * K)
    back = unfold(q, K)
    unfold_ok = back is not None and list(back) == vals
    seg_ok = tuple(qprod(segment_weaves(leaf_hashes, cuts))) == tuple(q)
    return norm_ok, unfold_ok, seg_ok


# ================================================================ residual aliases (T9; S4's silentFlips)
def silent_flips(residual, chunk, limit=None):
    """Every single-bit flip of a residual that decodes to the same bytes, in S4's order (hex digit i, then bit 0..3
    of that digit): [{'i', 'bit', 'alt', 'kind'}], kind 'padding' (after the last code), 'escape' (inside a raw-byte
    rank code) or 'other'. limit: stop after that many."""
    chunk = list(chunk)
    out, used, _, escapes = decode_chunk(residual, len(chunk), trace=True)
    if out != chunk:
        raise ValueError('the residual does not decode to the chunk')
    same = []
    for i in range(len(residual)):
        d = int(residual[i], 16)
        for bit in range(4):
            alt = residual[:i] + format(d ^ (1 << bit), 'x') + residual[i + 1:]
            try:
                ok = decode_chunk(alt, len(chunk)) == chunk
            except ValueError:
                ok = False
            if ok:
                q = 4 * i + (3 - bit)
                kind = 'padding' if q >= used else 'escape' if any(a <= q < b for a, b, _ in escapes) else 'other'
                same.append({'i': i, 'bit': bit, 'alt': alt, 'kind': kind})
                if limit is not None and len(same) >= limit:
                    return same
    return same


# ================================================================ L8's synthetic shards (Amendment 7 item 2)
LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
PUNCT = '0123456789.,;:\'!?-()"\n\t/&%#*+='           # spike S4's set (30 characters)
SYNTH_MIN, SYNTH_SPAN = 20000, 40001


def _utf8_len(cp):
    return 1 if cp < 0x80 else 2 if cp < 0x800 else 3 if cp < 0x10000 else 4


def synth_draw(rng):
    """One draw of the generator from rng's current state: the target 20,000 + below(40,001) bytes, then code points
    until the next would pass it (that one is drawn and dropped).

    READING: each code point draws its class with below(100), then its value from the same Rng: an ASCII letter is
    LETTERS[below(52)] (S4's letters, a-z then A-Z), a space draws nothing more, punctuation is S4's PUNCT[below(30)];
    the two-, three- and four-byte code points are as registered (three-byte ones skip the surrogates as S4 does:
    cp >= 0xD800 moves up by 0x800)."""
    target = SYNTH_MIN + rng.below(SYNTH_SPAN)
    out, n = [], 0
    while True:
        c = rng.below(100)
        if c < 40:
            cp = ord(LETTERS[rng.below(len(LETTERS))])
        elif c < 50:
            cp = 32
        elif c < 55:
            cp = ord(PUNCT[rng.below(len(PUNCT))])
        elif c < 85:
            cp = 0x80 + rng.below(0x780)
        elif c < 95:
            cp = 0x800 + rng.below(0xF000)
            if cp >= 0xD800:
                cp += 0x800
        else:
            cp = 0x10000 + rng.below(0x100000)
        ln = _utf8_len(cp)
        if n + ln > target:
            return ''.join(out)
        out.append(chr(cp))
        n += ln


def synth_shard(seed):
    """Shard of Rng(seed): (text, draws). If no chunk of a draw has a crystal holding the byte 0x80, the same Rng
    draws again (READING: continuing from its state after the dropped code point)."""
    rng = Rng(seed)
    draws = 0
    while True:
        draws += 1
        text = synth_draw(rng)
        data = text.encode('utf-8')
        if any(crystal_has_80(c) for c in _chunks(data)):
            return text, draws


def two_byte_share(text):
    """(two-byte code points, all code points): the registered check is 4 * first >= second (at least 25%)."""
    return sum(1 for c in text if 0x80 <= ord(c) < 0x800), len(text)


# ================================================================ the dry-run gloss shards (spike S4's cut)
def pos_lines(wn, pos):
    """offset TAB lemmas ('_' read as a space) joined by ', ' TAB gloss, in offset order (as C0, for any part of
    speech; adjective markers such as '(a)' kept as written)."""
    syn = wn['synsets'][pos]
    return [f"{o}\t{', '.join(l.replace('_', ' ') for l in syn[o].lemmas)}\t{syn[o].gloss}" for o in sorted(syn)]


def cut_lines(lines, limit=MAX_GROW_BYTES):
    """Greedy cut at line boundaries: a line joins the current shard while the shard stays <= limit UTF-8 bytes; the
    newline at a cut belongs to neither shard."""
    shards, cur, b = [], [], 0
    for line in lines:
        n = len(line.encode('utf-8'))
        if n > limit:
            raise ValueError('a line longer than a shard')
        if cur and b + 1 + n > limit:
            shards.append('\n'.join(cur))
            cur, b = [], 0
        b += (1 if cur else 0) + n
        cur.append(line)
    if cur:
        shards.append('\n'.join(cur))
    return shards


def gloss_shards(wn, pos):
    """Spike S4's verb ('verb') or adjective ('adj') gloss shards: the dry-run instances of L8-L11."""
    if pos not in ('verb', 'adj'):
        raise ValueError('the dry runs use the verb and adjective glosses only')
    return cut_lines(pos_lines(wn, pos))
