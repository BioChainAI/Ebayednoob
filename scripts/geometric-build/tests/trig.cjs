// The Geometric Calculator keypad's sin, cos and tan (eq. 85, change T1-T3 of scripts/trig-audit/CHANGELOG.md):
// the page's own calculateExactRational against the reference kernel rational_trig.js, digit for digit, and the
// exact unit circle. Expects the repository served at http://localhost:8766/ and SP as for the other tests.
const { chromium } = require('playwright');
const path = require('path');
const T = require(path.join(__dirname, '..', '..', '..', 'Pages', 'Hyperbolic Oracles', 'rational_trig.js'));
const C = require(path.join(__dirname, '..', '..', '..', 'Pages', 'Hyperbolic Oracles', 'hyperbolic_core.js'));
const SP = process.env.SP;
const digits = (f, n = 48) => { const neg = f.n < 0n, a = neg ? -f.n : f.n; let r = a % f.d, s = (neg ? '-' : '') + (a / f.d) + '.'; for (let i = 0; i < n; i++) { r *= 10n; s += (r / f.d); r %= f.d; } return s; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }), pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => { if (!/OrbitControls/.test(e.message)) errs.push(e.message); });
  await pg.route(/three(\.min)?\.js/, r => r.fulfill({ path: SP + '/t158/package/build/three.min.js', contentType: 'application/javascript' }));
  await pg.route(/gstatic|googleapis|firebase/, r => r.abort());
  await pg.goto('http://localhost:8766/Pages/Geometric%20Calculator/index.html'); await pg.waitForTimeout(2000);
  const angles = ['1', '10', '0.5', '100', '2.25', '7', '0', '12.345'];
  const page = await pg.evaluate(a => a.map(x => ['sin', 'cos', 'tan'].map(f => calculateExactRational(`${f}(${x})`))), angles);
  const exprs = await pg.evaluate(() => ['sin(pi)', 'cos(pi)', 'sin(1)^2+cos(1)^2', 'sin(7)^2+cos(7)^2', 'tan(pi/4)', 'sin(pi/6)'].map(e => calculateExactRational(e)));
  let fail = 0;
  angles.forEach((x, i) => {
    const k = T.keypadTrig(C.Q.parse(x.includes('.') ? `${x.replace('.', '')}/${10 ** x.split('.')[1].length}` : x)), want = [k.sin, k.cos, k.sin.div(k.cos)].map(v => digits(v));
    ['sin', 'cos', 'tan'].forEach((f, j) => { const got = page[i][j].replace(/\.\.\.$/, ''), w = want[j].slice(0, got.length); const ok = got === w || (got === '0' && /^-?0\.0+$/.test(want[j])) || (got === '1' && /^1\.0+$/.test(want[j])); if (!ok) { fail++; console.log('FAIL', f, x, got, w); } });
  });
  const ex = { 'sin(pi)': '0', 'cos(pi)': '-1', 'sin(1)^2+cos(1)^2': '1', 'sin(7)^2+cos(7)^2': '1' };
  exprs.slice(0, 4).forEach((v, i) => { const e = Object.keys(ex)[i]; if (v !== ex[e]) { fail++; console.log('FAIL', e, v); } });
  if (!/^1\.0{20}/.test(exprs[4]) && !/^0\.9{20}/.test(exprs[4])) { fail++; console.log('FAIL tan(pi/4)', exprs[4]); }
  if (!/^0\.49{20}|^0\.50{20}/.test(exprs[5])) { fail++; console.log('FAIL sin(pi/6)', exprs[5]); }
  const keys = await pg.evaluate(() => [...document.querySelectorAll('#keypad-sci button')].map(x => x.textContent.trim().split(/\s+/)[0]));
  if (keys.slice(0, 5).join() !== 'sin,cos,tan,√,^' || keys.length !== 25) { fail++; console.log('FAIL keypad', keys.join(' ')); }
  console.log(`keypad: ${angles.length * 3} sin/cos/tan values equal the reference kernel to every printed digit; sin(pi) ${exprs[0]}, cos(pi) ${exprs[1]}, sin²+cos² ${exprs[2]}; keys ${keys.slice(0, 5).join(' ')}`, errs);
  console.log(fail || errs.length ? `${fail} FAILED` : 'all passed');
  await b.close(); process.exit(fail || errs.length ? 1 : 0);
})();
