// The duplicated primitives in the shared cores, bound to one golden without merging them (overhaul F43).
//
//   node tests/contracts/primitives.cjs
//
// primitives_v1.json (make_primitives_v1.py: Python's hashlib, fractions and integer arithmetic) against:
//   SHA-256       orbital_core.js sha256 (bytes), hyperbolic_core.js sha256Hex (a string's UTF-8), Node's crypto
//   rationals     orbital_core.js Fraction and hyperbolic_core.js Q: add, sub, mul, div, lowest terms, comparison
//   doubles       orbital_core.js fracOfDouble and Q.fromDouble (exact), Q.toNumber (correctly rounded); orbital's
//                 Fraction.toNumber is Number(n) / Number(d) and is reported, not bound
//   quaternions   orbital_core.js qmul (over Fraction), twin3d.js qmul (BigInt), biochain_v1.js qmul (binary64, on the
//                 "small" cases only) and hyperbolic_core.js P.wordQuaternion (words over the six generators)
// Exits 1 on any difference. The cores are only loaded, never changed.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const G = JSON.parse(fs.readFileSync(path.join(__dirname, 'primitives_v1.json'), 'utf8'));
const O = require(path.join(ROOT, 'scripts', 'geometric-build', 'orbital_core.js'));
const C = require(path.join(ROOT, 'Pages', 'Hyperbolic Oracles', 'hyperbolic_core.js'));
const T3 = require(path.join(ROOT, 'Pages', 'Hyperbolic Oracles', 'twin3d.js'));
const BC = require(path.join(ROOT, 'Pages', 'Engram Minds Eye', 'biochain_v1.js'));

let failed = 0;
const line = (ok, label, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`); };
const count = (list, f) => { const bad = list.filter(x => !f(x)); return { n: list.length, bad }; };
const report = (label, r, name = x => JSON.stringify(x).slice(0, 80)) => line(!r.bad.length, label, r.bad.length ? `${r.bad.length}/${r.n} differ, first ${name(r.bad[0])}` : `${r.n}/${r.n}`);

// ---- SHA-256
const bytesOf = v => (v.repeat ? Buffer.from(v.repeat.hex.repeat(v.repeat.times), 'hex') : Buffer.from(v.hex, 'hex'));
report('SHA-256: Node crypto', count(G.sha256, v => crypto.createHash('sha256').update(bytesOf(v)).digest('hex') === v.sha256), v => v.name);
report('SHA-256: orbital_core.js sha256', count(G.sha256, v => O.toHex(O.sha256(new Uint8Array(bytesOf(v)))) === v.sha256), v => v.name);
// sha256Hex takes a string and hashes its UTF-8: the vectors that are text (ASCII bytes, or given as text)
const asText = v => (v.text !== undefined ? v.text : bytesOf(v).every(b => b < 0x80) ? bytesOf(v).toString('latin1') : null);
const textual = G.sha256.filter(v => asText(v) !== null);
report(`SHA-256: hyperbolic_core.js sha256Hex (the ${textual.length} text vectors)`, count(textual, v => C.sha256Hex(asText(v)) === v.sha256), v => v.name);
line(textual.some(v => v.repeat) && textual.some(v => v.text), 'SHA-256: the text vectors include one million "a" and non-ASCII UTF-8');

// ---- rationals
const parseQ = (s, K) => { const [n, d] = s.split('/'); return new K(BigInt(n), BigInt(d)); };
const str = q => `${q.n}/${q.d}`;
for (const [name, K] of [['orbital_core.js Fraction', O.Fraction], ['hyperbolic_core.js Q', C.Q]]) {
    report(`rationals: ${name} add, sub, mul, div in lowest terms`, count(G.rationals, e => {
        const a = parseQ(e.a, K), b = parseQ(e.b, K);
        return str(a) === e.a && str(b) === e.b && str(a.add(b)) === e.add && str(a.sub(b)) === e.sub && str(a.mul(b)) === e.mul && (e.div === undefined || str(a.div(b)) === e.div);
    }), e => `${e.a} ? ${e.b}`);
}
report('rationals: hyperbolic_core.js Q.cmp', count(G.rationals, e => parseQ(e.a, C.Q).cmp(parseQ(e.b, C.Q)) === e.cmp));
report('rationals: orbital_core.js Fraction, the sign of a - b', count(G.rationals, e => { const d = parseQ(e.a, O.Fraction).sub(parseQ(e.b, O.Fraction)); return (d.n > 0n) - (d.n < 0n) === e.cmp; }));

// ---- doubles
const dbl = bits => Buffer.from(bits, 'hex').readDoubleBE(0);
const hexOf = x => { const b = Buffer.alloc(8); b.writeDoubleBE(x); return b.toString('hex'); };
report('doubles: orbital_core.js fracOfDouble is exact', count(G.doubles, d => str(O.fracOfDouble(dbl(d.bits))) === d.exact), d => d.bits);
report('doubles: hyperbolic_core.js Q.fromDouble is exact', count(G.doubles, d => str(C.Q.fromDouble(dbl(d.bits))) === d.exact), d => d.bits);
report('doubles: hyperbolic_core.js Q.toNumber is correctly rounded (as float(Fraction))', count(G.rounding, d => hexOf(parseQ(d.q, C.Q).toNumber()) === d.bits), d => d.q);
const naive = G.rounding.filter(d => hexOf(parseQ(d.q, O.Fraction).toNumber()) !== d.bits).length;
console.log(`note  doubles: orbital_core.js Fraction.toNumber (Number(n) / Number(d)) differs from float(Fraction) on ${naive}/${G.rounding.length} (reported, not bound)`);

// ---- quaternions
const big = a => a.map(BigInt), sameArr = (x, y) => x.length === y.length && x.every((v, i) => String(v) === String(y[i]));
report('quaternions: orbital_core.js qmul over Fraction', count(G.quaternions, q => sameArr(O.qmul(q.a.map(v => new O.Fraction(BigInt(v))), q.b.map(v => new O.Fraction(BigInt(v)))).map(f => (f.d === 1n ? f.n : NaN)), q.product)));
report('quaternions: twin3d.js qmul over BigInt', count(G.quaternions, q => sameArr(T3.qmul(big(q.a), big(q.b)), q.product)));
const small = G.quaternions.filter(q => q.small);
report(`quaternions: biochain_v1.js qmul in binary64 (the ${small.length} small cases)`, count(small, q => sameArr(BC.qmul(q.a.map(Number), q.b.map(Number)), q.product)));
line(JSON.stringify(C.P.GENS.map(g => g.map(Number))) === JSON.stringify(G.generators), 'quaternions: hyperbolic_core.js P.GENS are the six generators 1 +- 2i, 1 +- 2j, 1 +- 2k');
report('quaternions: hyperbolic_core.js P.wordQuaternion on words over them', count(G.words, w => sameArr(C.P.wordQuaternion(w.word), w.product)), w => w.word.join(''));

console.log(`\n${failed ? `${failed} FAIL` : 'every copy agrees with the golden'}`);
process.exit(failed ? 1 : 0);
