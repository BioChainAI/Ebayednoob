const { chromium } = require('playwright');
const SP = process.env.SP, K = SP + '/node_modules/katex/dist/', BASE = 'http://localhost:8766/Pages/Geometric%20Calculator/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const res = {};
  const open = async (url, w = 1440) => {
    const pg = await b.newPage({ viewport: { width: w, height: 900 }, colorScheme: 'dark' });
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await pg.route(/three(\.min)?\.js/, r => r.fulfill({ path: SP + '/t158/package/build/three.min.js', contentType: 'application/javascript' }));
    await pg.route(/katex\.min\.js/, r => r.fulfill({ path: K + 'katex.min.js', contentType: 'application/javascript' }));
    await pg.route(/auto-render\.min\.js/, r => r.fulfill({ path: K + 'contrib/auto-render.min.js', contentType: 'application/javascript' }));
    await pg.route(/katex\.min\.css/, r => r.fulfill({ path: K + 'katex.min.css', contentType: 'text/css' }));
    await pg.route(/gstatic|googleapis|firebase/, r => r.abort());
    await pg.goto(url); await pg.waitForTimeout(3500);
    return { pg, errs };
  };
  // Part 1 at its new address
  { const { pg, errs } = await open(BASE + 'Galactic%20Lensing/galactic_lensing_hierarchy.html');
    res.p1 = { vsum: await pg.textContent('#vsum'), lemma: await pg.textContent('#lemma-sum'), bar: await pg.evaluate(() => [...document.querySelector('script[src*="page-chrome"]').attributes].map(a => a.name + '=' + a.value).join(' ').slice(0, 400)), ov: await pg.evaluate(() => document.documentElement.scrollWidth), errs }; await pg.close(); }
  // Part 2
  for (const w of [1440, 390]) { const { pg, errs } = await open(BASE + 'Galactic%20Lensing/tri_engine_soliton.html', w);
    res['p2_' + w] = { vsum: await pg.textContent('#vsum'), lemma: await pg.textContent('#lemma-sum'), state: await pg.textContent('#sol-state'), ov: await pg.evaluate(() => document.documentElement.scrollWidth), errs };
    if (w === 1440) { await pg.evaluate(() => document.querySelector('#hud').scrollIntoView({ block: 'center' })); await pg.fill('#noise', '2'); await pg.dispatchEvent('#noise', 'input'); await pg.waitForTimeout(800); await pg.screenshot({ path: SP + '/galactic/v2/p2_hud.png' }); }
    await pg.close(); }
  // Guide
  for (const w of [1440, 390]) { const { pg, errs } = await open(BASE + 'Galactic%20Lensing/galactic_companion.html#soliton', w);
    res['guide_' + w] = { katexErr: await pg.evaluate(() => document.querySelectorAll('.katex-error').length), raw: await pg.evaluate(() => [...document.querySelectorAll('main p, main li, main td')].filter(e => /\\\(|\$\$/.test(e.textContent)).length), ov: await pg.evaluate(() => document.documentElement.scrollWidth), gauge: await pg.textContent('#ga-out'), errs };
    if (w === 1440) { await pg.click('#ga-equal'); res.gaugeEq = await pg.textContent('#ga-out'); await pg.evaluate(() => document.getElementById('soliton').scrollIntoView()); await pg.waitForTimeout(300); await pg.screenshot({ path: SP + '/galactic/v2/g_soliton.png' });
      res.links = await pg.evaluate(async () => { const hrefs = [...new Set([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => !/^(#|https?:)/.test(h)))]; const out = []; for (const h of hrefs) { const r = await fetch(new URL(h, location.href).href.split('#')[0]); out.push(`${r.status} ${h}`); } return out; }); }
    await pg.close(); }
  // Redirect stubs and the engine's bar link
  { const { pg } = await open(BASE + 'galactic_lensing_hierarchy.html'); res.redirect1 = pg.url(); await pg.close(); }
  { const { pg } = await open(BASE + 'galactic_companion.html#framepk'); res.redirect2 = pg.url(); await pg.close(); }
  { const { pg } = await open(BASE + 'manual.html'); res.manualLinks = await pg.evaluate(async () => { const out = []; for (const a of document.querySelectorAll('a[href*="Galactic"]')) { const r = await fetch(a.href.split('#')[0]); out.push(r.status + ' ' + a.getAttribute('href')); } return out; }); await pg.close(); }
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
