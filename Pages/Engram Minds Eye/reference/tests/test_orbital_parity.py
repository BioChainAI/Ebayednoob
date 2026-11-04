"""The Python ports in engram/orbital.py against scripts/geometric-build/orbital_core.js itself (through Node).
Exact values must be equal as strings; floats equal as doubles, except the readout's tanh, compared to 1e-15."""
import json
import os
import random
import shutil
import subprocess
from fractions import Fraction

import pytest

from engram import orbital as O

BRIDGE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'js_orbital.cjs')
pytestmark = pytest.mark.skipif(shutil.which('node') is None, reason='needs Node to run orbital_core.js')


def js(cases):
    out = subprocess.run(['node', BRIDGE], input=json.dumps({'cases': cases}), capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


R = random.Random(20261104)


def test_tiles_wheel_mux():
    fields = [{'step': 1 + R.randrange(8), 'wheel': R.randrange(8), 'struct': R.randrange(4), 'gate': R.randrange(256),
               'mux': R.randrange(16), 'form': R.randrange(16), 'slot': R.randrange(16), 'scale': R.randrange(16),
               'core': R.randrange(2 ** 32)} for _ in range(300)]
    got = js([{'kind': 'tile', 'f': f} for f in fields] + [{'kind': 'wheel', 'k': k} for k in range(30)] +
             [{'kind': 'mux', 'step': s, 'k': k, 'slot': sl} for s in range(1, 9) for k in range(30) for sl in range(16)])
    tiles, rest = got[:300], got[300:]
    assert tiles == [O.hex_word(O.pack_tile(f)) for f in fields]
    assert rest[:30] == [O.wheel_sector(k) for k in range(30)]
    assert rest[30:] == [O.mux_index(s, k, sl) for s in range(1, 9) for k in range(30) for sl in range(16)]
    words = [O.pack_tile(f) for f in fields[:50]]
    dec = js([{'kind': 'decode', 'w': str(w)} for w in words])
    assert dec == [O.decode_tile(w) for w in words]


def test_merkle_chain():
    for n in (1, 2, 4, 7):
        leaves = [bytes(R.randrange(256) for _ in range(R.randrange(1, 60))) for _ in range(n)]
        got = js([{'kind': 'merkle', 'leaves': [l.hex() for l in leaves]}])[0]
        mine = [O.to_hex(t) if t is not None else '' for t in O.merkle_chain(leaves)]
        assert got[1:] == mine[1:]          # index 0 is unused: a hole in the JavaScript array (null in JSON), '' here


def test_rat_tonum_fracpart():
    xs = [R.uniform(-200, 200) for _ in range(400)] + [0.5 / 2 ** 24, -0.5 / 2 ** 24, 1.5 / 2 ** 24, 2.5 / 2 ** 24, -2.5 / 2 ** 24]
    assert js([{'kind': 'rat', 'x': x} for x in xs]) == [str(O.RAT(x)) for x in xs]
    fs = [Fraction(R.randrange(-10 ** 6, 10 ** 6), R.randrange(1, 10 ** 6)) for _ in range(200)] + [Fraction(3 ** 900, 7 ** 600)]
    assert js([{'kind': 'tonum', 'f': str(f)} for f in fs]) == [O.to_num(f) for f in fs]
    assert js([{'kind': 'fracpart', 'f': str(f)} for f in fs]) == [str(O.frac_part(f)) for f in fs]


def test_gauge():
    trip = [(R.randrange(-70, 70), R.randrange(-70, 70), R.randrange(-70, 70)) for _ in range(300)]
    got = js([{'kind': 'gauge', 'a': str(a), 'b': str(b), 'c': str(c)} for a, b, c in trip])
    for (a, b, c), g in zip(trip, got):
        mine = O.gauge_exact(Fraction(a), Fraction(b), Fraction(c))
        assert g == {'s': str(mine['s']), 'X': str(mine['X']), 'Yc': str(mine['Yc']), 'recovered': mine['recovered']}


def test_readout():
    turns = ['13/675'] * 3
    vals = [[x, x, x] for x in range(0, 65, 8)] + [[R.randrange(65), R.randrange(65), R.randrange(65)] for _ in range(120)]
    got = js([{'kind': 'readout', 'vals': [str(v) for v in vs], 'turns': turns} for vs in vals])
    exact_nodes = 0
    for vs, g in zip(vals, got):
        r = O.readout([Fraction(v) for v in vs], [Fraction(t) for t in turns])
        assert all(abs(a - b) <= 1e-15 for a, b in zip(g['dphi'], r['dphi']))
        mine_nodes = [[str(x) for x in n] for n in r['nodes']]
        if g['nodes'] == mine_nodes:
            exact_nodes += 1
            assert g['Q'] == [str(q) for q in r['T']['Q']] and g['S'] == str(r['T']['S']) and g['poly'] == str(r['T']['poly'])
            assert g['lock'] == r['T']['lock'] and g['same'] == r['T']['same'] and g['Q4'] == str(r['Q4'])
        assert g['lock'] == r['T']['lock']
    # the nodes are rationalized at 2^-24 from libm's cos and sin; V8 and C may differ in the last bit, which the grid
    # absorbs except on a tie. Every case seen so far matches exactly, and the lock never differs.
    assert exact_nodes == len(vals)


def test_pump():
    regs = [[1 if R.random() < p else 0 for _ in range(720)] for p in (0, 0.2, 0.5, 0.9, 1)] + [[1] * 720, [0] * 720]
    got = js([{'kind': 'pump', 'd': d} for d in regs])
    assert got == [O.pump_of(d) for d in regs]
