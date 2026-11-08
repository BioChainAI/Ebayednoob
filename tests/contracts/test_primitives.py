"""The duplicated primitives on the Python side, bound to primitives_v1.json (overhaul F43; primitives.cjs binds the
JavaScript copies to the same file). The copies are only imported, never changed.

    python3 -B -m pytest -q -p no:cacheprovider tests/contracts

  SHA-256       hashlib on every vector, FIPS 180-2's included
  rationals     fractions.Fraction: add, sub, mul, div, comparison, Fraction(float), float(Fraction)
  quaternions   hpstep.problems.qmul and word_quaternion (Hyperbolic Oracles), hpstep.frames3d.qmul (needs numpy),
                lexicon.chain.qmul (Hyperbolic Lexicon)
The golden itself must reproduce (make_primitives_v1.py --check).
"""
import hashlib
import json
import os
import struct
import subprocess
import sys
from fractions import Fraction

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
with open(os.path.join(HERE, 'primitives_v1.json'), encoding='utf-8') as fh:
    G = json.load(fh)
for p in (os.path.join(ROOT, 'Pages', 'Hyperbolic Oracles', 'reference'), os.path.join(ROOT, 'Pages', 'Hyperbolic Lexicon', 'reference')):
    if p not in sys.path:
        sys.path.append(p)


def F(s):
    n, d = s.split('/')
    return Fraction(int(n), int(d))


def test_golden_reproduces():
    r = subprocess.run([sys.executable, '-B', '-I', os.path.join(HERE, 'make_primitives_v1.py'), '--check'], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr


def test_sha256_hashlib():
    for v in G['sha256']:
        msg = bytes.fromhex(v['repeat']['hex']) * v['repeat']['times'] if 'repeat' in v else bytes.fromhex(v['hex'])
        assert hashlib.sha256(msg).hexdigest() == v['sha256'], v['name']
        if 'text' in v:
            assert v['text'].encode('utf-8') == msg


def test_rationals_fraction():
    for e in G['rationals']:
        a, b = F(e['a']), F(e['b'])
        assert f'{a.numerator}/{a.denominator}' == e['a']
        assert a + b == F(e['add']) and a - b == F(e['sub']) and a * b == F(e['mul'])
        assert (a > b) - (a < b) == e['cmp']
        if 'div' in e:
            assert a / b == F(e['div'])


def test_doubles_exact_and_rounded():
    for d in G['doubles']:
        x = struct.unpack('>d', bytes.fromhex(d['bits']))[0]
        assert Fraction(x) == F(d['exact']), d['bits']
    for d in G['rounding']:
        assert struct.pack('>d', float(F(d['q']))).hex() == d['bits'], d['q']


def quats():
    return [(tuple(int(v) for v in q['a']), tuple(int(v) for v in q['b']), tuple(int(v) for v in q['product'])) for q in G['quaternions']]


def test_qmul_hpstep_problems():
    from hpstep import problems
    for a, b, p in quats():
        assert tuple(problems.qmul(a, b)) == p
    assert [tuple(g) for g in problems.GENS] == [tuple(g) for g in G['generators']]
    for w in G['words']:
        assert tuple(problems.word_quaternion(w['word'])) == tuple(int(v) for v in w['product']), w['word']


def test_qmul_hpstep_frames3d():
    pytest.importorskip('numpy')
    from hpstep import frames3d
    for a, b, p in quats():
        assert tuple(frames3d.qmul(a, b)) == p


def test_qmul_lexicon_chain():
    from lexicon import chain
    for a, b, p in quats():
        assert tuple(chain.qmul(list(a), list(b))) == p
