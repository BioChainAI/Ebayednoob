"""The duplicated primitives' golden (overhaul F43): SHA-256, exact rationals and quaternion products, computed with
Python's standard library only, for primitives.cjs (the JavaScript copies in the shared cores) and test_primitives.py
(Python's own copies) to bind. The copies are not merged; each must give these values.

    python3 -B -I tests/contracts/make_primitives_v1.py           write primitives_v1.json beside this file
    python3 -B -I tests/contracts/make_primitives_v1.py --check   rebuild in memory and compare (exit 1 if different)

Contents:
  sha256       FIPS 180-2 Appendix B's SHA-256 examples (B.1 "abc", B.2 the 448-bit message, B.3 one million "a") and
               the empty message, each checked against its published digest before it is written; then messages of
               0-130 bytes and around the 55/56/64-byte padding boundaries from a fixed generator, and UTF-8 text
  rationals    pairs from a fixed generator (signs, zero, numerators and denominators up to 2^90): a + b, a - b, a * b,
               a / b, the sign of a - b, all in lowest terms with a positive denominator (fractions.Fraction)
  doubles      doubles (as their IEEE 754 bits) and their exact value (Fraction(float)); rationals and their correctly
               rounded double (float(Fraction))
  quaternions  integer quaternion pairs and their Hamilton product (w, x, y, z order); "small" marks those whose
               components and products stay below 2^53 (where a binary64 copy must agree too); words over the six
               generators 1 +- 2i, 1 +- 2j, 1 +- 2k and their products
The generator is a 64-bit LCG (Knuth's MMIX constants), so the file is the same on every machine.
"""
import hashlib
import json
import os
import struct
import sys
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'primitives_v1.json')
M64 = (1 << 64) - 1


class Lcg:
    def __init__(self, seed):
        self.s = seed & M64

    def next(self):
        self.s = (self.s * 6364136223846793005 + 1442695040888963407) & M64
        return self.s >> 11                       # 53 bits

    def below(self, n):
        return self.next() % n

    def big(self, bits):
        v = 0
        for _ in range((bits + 52) // 53):
            v = (v << 53) | self.next()
        return v & ((1 << bits) - 1)


PUBLISHED = [
    ('empty message', b'', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
    ('FIPS 180-2 B.1: "abc"', b'abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'),
    ('FIPS 180-2 B.2: 448 bits', b'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
     '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'),
]
MILLION_A = 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0'   # FIPS 180-2 B.3


def frac(f):
    return f'{f.numerator}/{f.denominator}'


def build():
    sha = []
    for name, msg, want in PUBLISHED:
        assert hashlib.sha256(msg).hexdigest() == want, name
        sha.append({'name': name, 'hex': msg.hex(), 'sha256': want})
    assert hashlib.sha256(b'a' * 1000000).hexdigest() == MILLION_A
    sha.append({'name': 'FIPS 180-2 B.3: one million "a"', 'repeat': {'hex': '61', 'times': 1000000}, 'sha256': MILLION_A})
    r = Lcg(43)
    for n in list(range(0, 131, 7)) + [55, 56, 57, 63, 64, 65, 119, 120, 127, 128]:
        msg = bytes(r.below(256) for _ in range(n))
        sha.append({'name': f'{n} bytes', 'hex': msg.hex(), 'sha256': hashlib.sha256(msg).hexdigest()})
    for text in ['hyperbolic lexicon', 'café 中文 \U0001d538', '\u0080ÿĀ']:
        msg = text.encode('utf-8')
        sha.append({'name': f'UTF-8 of {text!r}', 'hex': msg.hex(), 'text': text, 'sha256': hashlib.sha256(msg).hexdigest()})

    rats = []
    r = Lcg(4301)

    def rnd_frac():
        k = r.below(6)
        if k == 0:
            return Fraction(0)
        bits = (8, 24, 53, 64, 90)[r.below(5)]
        num = r.big(bits) * (-1 if r.below(2) else 1)
        den = r.big(bits) + 1
        return Fraction(num, den)
    for _ in range(120):
        a, b = rnd_frac(), rnd_frac()
        e = {'a': frac(a), 'b': frac(b), 'add': frac(a + b), 'sub': frac(a - b), 'mul': frac(a * b), 'cmp': (a > b) - (a < b)}
        if b != 0:
            e['div'] = frac(a / b)
        rats.append(e)

    doubles = []
    for x in [0.0, 1.0, -2.5, 0.1, 1 / 3, 2.0 ** 60 + 2.0 ** 8, -1e-300, 5e-324, 2.2250738585072014e-308, 1.7976931348623157e308, 123456.789]:
        doubles.append({'bits': struct.pack('>d', x).hex(), 'exact': frac(Fraction(x))})
    r = Lcg(4302)
    for _ in range(40):                           # finite doubles: a sign, an exponent field 0-2046, 52 mantissa bits
        word = (r.below(2) << 63) | (r.below(2047) << 52) | r.big(52)
        x = struct.unpack('>d', word.to_bytes(8, 'big'))[0]
        doubles.append({'bits': '%016x' % word, 'exact': frac(Fraction(x))})
    rounding = []
    for _ in range(60):
        bits = (20, 53, 54, 80, 120)[r.below(5)]
        q = Fraction(r.big(bits) * (-1 if r.below(2) else 1), r.big(bits) + 1)
        rounding.append({'q': frac(q), 'bits': struct.pack('>d', float(q)).hex()})
    for q in [Fraction(1, 3), Fraction(2 ** 53 + 1), Fraction(2 ** 53 + 3), Fraction(-(2 ** 54) - 2), Fraction(1, 10 ** 30)]:
        rounding.append({'q': frac(q), 'bits': struct.pack('>d', float(q)).hex()})

    def qmul(a, b):
        a0, a1, a2, a3 = a
        b0, b1, b2, b3 = b
        return (a0 * b0 - a1 * b1 - a2 * b2 - a3 * b3, a0 * b1 + a1 * b0 + a2 * b3 - a3 * b2,
                a0 * b2 - a1 * b3 + a2 * b0 + a3 * b1, a0 * b3 + a1 * b2 - a2 * b1 + a3 * b0)
    quats = []
    r = Lcg(4303)
    for i in range(80):
        bits = 10 if i < 40 else (26, 40, 70)[r.below(3)]
        a = tuple(r.big(bits) * (-1 if r.below(2) else 1) for _ in range(4))
        b = tuple(r.big(bits) * (-1 if r.below(2) else 1) for _ in range(4))
        p = qmul(a, b)
        small = all(abs(v) < 2 ** 26 for v in a + b) and all(abs(v) < 2 ** 53 for v in p)
        quats.append({'a': [str(v) for v in a], 'b': [str(v) for v in b], 'product': [str(v) for v in p], 'small': small})
    gens = [(1, 2, 0, 0), (1, -2, 0, 0), (1, 0, 2, 0), (1, 0, -2, 0), (1, 0, 0, 2), (1, 0, 0, -2)]
    words = []
    for n in (0, 1, 2, 5, 9, 16, 30):
        w = [r.below(6) for _ in range(n)]
        q = (1, 0, 0, 0)
        for g in w:
            q = qmul(q, gens[g])
        words.append({'word': w, 'product': [str(v) for v in q]})
    return {
        'format': 'primitives_v1', 'version': 1,
        'note': 'Computed by make_primitives_v1.py with Python\'s standard library (hashlib, fractions, struct, integer arithmetic). '
                'Bound by tests/contracts/primitives.cjs (the JavaScript copies in the shared cores) and test_primitives.py (the Python copies). Overhaul F43: the copies are not merged.',
        'sha256': sha, 'rationals': rats, 'doubles': doubles, 'rounding': rounding,
        'quaternions': quats, 'generators': [list(g) for g in gens], 'words': words,
    }


def main():
    text = json.dumps(build(), indent=1, ensure_ascii=False) + '\n'
    if '--check' in sys.argv[1:]:
        with open(OUT, encoding='utf-8') as fh:
            same = fh.read() == text
        print('primitives_v1.json ' + ('reproduces' if same else 'DIFFERS'))
        sys.exit(0 if same else 1)
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write(text)
    print(f'wrote {OUT}')


if __name__ == '__main__':
    main()
