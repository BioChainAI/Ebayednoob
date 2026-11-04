// The parity bridge: evaluates cases on scripts/geometric-build/orbital_core.js and prints the results as JSON, so
// the Python ports in engram/orbital.py can be compared with the code the pages run. Fractions travel as "n/d"
// strings, 64-bit words as hex, floats as JSON numbers (exact for doubles).
//   echo '{"cases": [...]}' | node tests/js_orbital.cjs
'use strict';
const path = require('path');
const O = require(path.join(__dirname, '..', '..', '..', '..', 'scripts', 'geometric-build', 'orbital_core.js'));
const F = s => { const [n, d = '1'] = String(s).split('/'); return new O.Fraction(BigInt(n), BigInt(d)); };
const S = f => f.toString();
const fromHex = h => Uint8Array.from(h.match(/../g) || [], x => parseInt(x, 16));

const run = c => {
    switch (c.kind) {
        case 'tile': return '0x' + O.packTile(c.f).toString(16).toUpperCase().padStart(16, '0');
        case 'decode': return O.decodeTile(BigInt(c.w));
        case 'wheel': return O.wheelSector(c.k);
        case 'mux': return O.muxIndex(c.step, c.k, c.slot);
        case 'merkle': return O.merkleChain(c.leaves.map(fromHex)).map(t => (t ? O.toHex(t) : ''));
        case 'rat': return S(O.RAT(c.x));
        case 'tonum': return O.toNum(F(c.f));
        case 'fracpart': return S(O.fracPart(F(c.f)));
        case 'gauge': { const g = O.gaugeExact(F(c.a), F(c.b), F(c.c)); return { s: S(g.s), X: S(g.X), Yc: S(g.Yc), recovered: g.recovered }; }
        case 'readout': {
            const r = O.readout(c.vals.map(F), (c.turns || ['0', '0', '0']).map(F));
            return { dphi: r.dphi, nodes: r.nodes.map(n => n.map(S)), Q: r.T.Q.map(S), S: S(r.T.S), poly: S(r.T.poly), gram: S(r.T.gram),
                     lock: r.T.lock, same: r.T.same, chi: r.T.chi, Q4: S(r.Q4), bits: r.T.bits };
        }
        case 'pump': return O.pumpOf(Uint8Array.from(c.d));
        default: throw new Error('unknown case ' + c.kind);
    }
};
let input = '';
process.stdin.on('data', d => { input += d; });
process.stdin.on('end', () => {
    const { cases } = JSON.parse(input);
    process.stdout.write(JSON.stringify(cases.map(run), (k, v) => (typeof v === 'bigint' ? v.toString() : v)));
});
