"""engram/1: the TTMPT engram core of Owl Academy's Engram_Mind_Eye.html, ported to Python (decision D4).

Everything here reproduces the page's JavaScript bit for bit, and claim E1 checks it against the golden corpus
(reference/golden/engram_v1.json), which was computed from the page and from scripts/biomesh.js. The integer
arithmetic of Mulberry32 is done on unsigned 32-bit values, which gives the same bits as the page's int32 and
Math.imul operations.

The key: a word's engram is the XOR of an 8x8 grid per letter A-Z (other characters are skipped), so it records
only the parity of each letter's count (spike A). Also here: the page's tokenizer and biomesh.js's, the chiral
key, the torsion J, and the 128-bit packet chain (codex parity header, grid body, triangulation footer).
"""
from fractions import Fraction
import re

M32 = 0xFFFFFFFF


INC = 0x6D2B79F5


def mulberry32(seed, inc=INC):
    """The page's Mulberry32, on unsigned 32-bit values. Returns a function giving floats in [0, 1).
    `inc` exists only for E1's control (Amendment 1: 0x6D2B79F7 in place of 0x6D2B79F5)."""
    s = seed & M32

    def rnd():
        nonlocal s
        s = (s + inc) & M32
        t = ((s ^ (s >> 15)) * (1 | s)) & M32
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & M32)) & M32) ^ t
        return ((t ^ (t >> 14)) & M32) / 4294967296
    return rnd


def encode_token(token, mult=31, inc=INC):
    """encodeToken: a seed from the characters (seed * 31 + code, UTF-16 code units), then 64 Mulberry32 draws > 0.5.
    `mult` and `inc` exist only for E1's controls: the registered one (37 in place of 31), void because crystallize
    seeds one letter at a time, and Amendment 1's (Mulberry32's increment)."""
    seed = 0
    for unit in _utf16_units(token):
        seed = (seed * mult + unit) & M32
    rng = mulberry32(seed, inc)
    return [1 if rng() > 0.5 else 0 for _ in range(64)]


def _utf16_units(s):
    b = s.encode('utf-16-le')
    return [b[i] | (b[i + 1] << 8) for i in range(0, len(b), 2)]


_GRID_CACHE = {}


def _letter_grid(ch, mult=31, inc=INC):
    key = (ch, mult, inc)
    if key not in _GRID_CACHE:
        _GRID_CACHE[key] = encode_token(ch, mult, inc)
    return _GRID_CACHE[key]


def crystallize(text, mult=31, inc=INC):
    """XOR crystallization: the grids of the letters A-Z of text.toUpperCase(), in order."""
    acc = [0] * 64
    for ch in (text or '').upper():
        if 'A' <= ch <= 'Z':
            g = _letter_grid(ch, mult, inc)
            acc = [a ^ b for a, b in zip(acc, g)]
    return acc


def hamming(a, b):
    return sum(1 for x, y in zip(a, b) if x != y)


def hex_lsb(grid):
    """chiralKey's packing: byte i = cells 8i..8i+7, cell 8i + b at bit b; lowercase (biomesh.js prints uppercase)."""
    out = ''
    for i in range(8):
        byte = 0
        for b in range(8):
            byte |= grid[i * 8 + b] << b
        out += format(byte, '02x')
    return out


def chiral_key(text):
    m = re.search('[A-Za-z]', text or '')
    root = m.group(0) if m else '?'
    return f'O1::{root}::{hex_lsb(crystallize(text))}'


def j_num(grid):
    """(cells above the diagonal) - (cells below); the torsion flow J is j_num / 32."""
    upper = lower = 0
    for r in range(8):
        for c in range(8):
            if c > r:
                upper += grid[r * 8 + c]
            elif c < r:
                lower += grid[r * 8 + c]
    return upper - lower


def compute_j(grid):
    return j_num(grid) / 32


def pack_grid64(grid):
    """The packet body: bit i of the 64-bit word is cell i."""
    v = 0
    for i in range(64):
        if grid[i]:
            v |= 1 << i
    return v


def grid_of(v):
    return [(v >> i) & 1 for i in range(64)]


def hex64(v):
    return format(v, '016X')


def hex32(x):
    return format(x & M32, '08X')


def fold32(seed64):
    return ((seed64 & M32) ^ ((seed64 >> 32) & M32)) & M32


def rotl32(x, n):
    return ((x << n) | (x >> (32 - n))) & M32


# ------------------------------------------------------------------ tokenizers
def tokenize(text):
    """The page's tokenizer: split on anything but letters and digits, keep non-empty pieces, upper-case."""
    return [t.upper() for t in re.split(r'[^A-Za-z0-9]+', text or '') if t]


def tokenize_biomesh(text):
    """biomesh.js's tokenizer: runs of letters, digits and apostrophes, case kept."""
    return re.findall(r"[A-Za-z0-9']+", text or '')


def js_to_fixed(x, digits):
    """Number.prototype.toFixed: the exact value of the double, the nearer of the two candidates, the larger on a tie."""
    neg = x < 0
    f = Fraction(abs(x)) * 10 ** digits
    n = f.numerator // f.denominator
    if f - n >= Fraction(1, 2):
        n += 1
    s = str(n).rjust(digits + 1, '0')
    out = s[:-digits] + '.' + s[-digits:] if digits else s
    return ('-' if neg and n != 0 else '') + out


def engram_stream(text):
    """biomesh.js engramStreamFromText: one 16-hex packet (uppercase, LSB packing) per token, the count and mean J."""
    tokens = tokenize_biomesh(text)
    stream, jsum = '', 0.0
    for t in tokens:
        g = crystallize(t)
        stream += hex_lsb(g).upper()
        jsum += compute_j(g)
    mean = float(js_to_fixed(jsum / len(tokens), 4)) if tokens else 0
    return {'stream': stream, 'count': len(tokens), 'meanJ': mean}


# ------------------------------------------------------------------ the concept library and the 128-bit packet chain
CONCEPT_NAMES = ['GEODESIC', 'CURVATURE', 'POINCARE', 'PARALLEL', 'MANIFOLD', 'TRIANGLE', 'INFINITY', 'TILING',
                 'VISUALIZE', 'PERCEPTION', 'DIMENSION', 'UNDERSTAND', 'BOUNDARY', 'SADDLE', 'LIGHT']
WINDOW_SEEDS = ['MIND', 'EYE', 'STRIX']
CODEX_ROOT = 0x53484443         # "SHDC"


class PacketChain:
    """logPacket and logTokens of Engram_Mind_Eye.html: each token's packet triangulates against the window
    (alpha, beta, gamma) as it stands, then the window shifts so gamma is the new token."""

    def __init__(self):
        self.concepts = [crystallize(n) for n in CONCEPT_NAMES]
        self.alpha, self.beta, self.gamma = (crystallize(w) for w in WINDOW_SEEDS)
        self.parity = CODEX_ROOT
        self.packets = []

    def log_packet(self, token, source):
        grid = crystallize(token)
        seed64 = pack_grid64(grid)
        prev = self.parity
        new = (fold32(seed64) ^ rotl32(prev, 1)) & M32
        da, db, dg = hamming(grid, self.alpha), hamming(grid, self.beta), hamming(grid, self.gamma)
        idx, best = 0xFF, None
        for i, c in enumerate(self.concepts):
            d = hamming(grid, c)
            if best is None or d < best:
                best, idx = d, i
        footer = ((da & 0xFF) << 24 | (db & 0xFF) << 16 | (dg & 0xFF) << 8 | (idx & 0xFF)) & M32
        entry = {'index': len(self.packets), 'token': token, 'source': source, 'seed64': seed64, 'grid': grid,
                 'header': hex32(new), 'footer': hex32(footer), 'tri': (da, db, dg), 'concept': idx}
        self.parity = new
        self.packets.append(entry)
        self.alpha, self.beta, self.gamma = self.beta, self.gamma, grid
        return entry

    def log_tokens(self, text, source):
        return [self.log_packet(t, source) for t in tokenize(text)]

    def log_token_list(self, tokens, source):
        return [self.log_packet(t, source) for t in tokens]
