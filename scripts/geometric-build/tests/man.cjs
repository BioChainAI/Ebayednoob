const { chromium } = require('playwright');
const SP = process.env.SP, K = SP + '/node_modules/katex/dist/', URL = 'http://localhost:8766/Pages/Geometric%20Calculator/Galactic%20Lensing/tri_engine_manual.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const w of [1440, 390]) {
    const pg = await b.newPage({ viewport: { width: w, height: 900 }, colorScheme: 'dark' });
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route(/katex\.min\.js/, r => r.fulfill({ path: K + 'katex.min.js', contentType: 'application/javascript' }));
    await pg.route(/auto-render\.min\.js/, r => r.fulfill({ path: K + 'contrib/auto-render.min.js', contentType: 'application/javascript' }));
    await pg.route(/katex\.min\.css/, r => r.fulfill({ path: K + 'katex.min.css', contentType: 'text/css' }));
    await pg.route(/gstatic|googleapis|firebase/, r => r.abort());
    await pg.goto(URL); await pg.waitForTimeout(1500);
    const r = await pg.evaluate(() => ({ katexErr: document.querySelectorAll('.katex-error').length, katex: document.querySelectorAll('.katex').length,
      raw: [...document.querySelectorAll('main p, main li, main td, main dd')].filter(e => /\\\(|\$\$/.test(e.textContent)).map(e => e.textContent.slice(0, 60)),
      ov: document.documentElement.scrollWidth, wide: [...document.querySelectorAll('main *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.table-wrap,.katex-display')).map(e => e.tagName + '.' + e.className).slice(0, 5),
      clock: document.querySelector('#ck-out').textContent, lock: document.querySelector('#lk-out').textContent, tile: document.querySelector('#tl-out').textContent }));
    if (w === 1440) {
      for (const lk of ['2,2,2', '-3,0,0']) { await pg.click(`[data-lk="${lk}"]`); r['lock ' + lk] = await pg.textContent('#lk-out'); }
      await pg.fill('#lk-ten', '40'); await pg.dispatchEvent('#lk-ten', 'input'); await pg.click('[data-lk="0,0,0"]'); r['lock ten40'] = await pg.textContent('#lk-out');
      await pg.click('#tl-ex2'); r.tile2 = await pg.textContent('#tl-out');
      await pg.click('[data-t="3.15"]'); r.clock2 = await pg.textContent('#ck-out');
      r.links = await pg.evaluate(async () => { const hrefs = [...new Set([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => !/^https?:/.test(h)))]; const out = []; for (const h of hrefs) { if (h.startsWith('#')) { if (!document.getElementById(h.slice(1))) out.push('MISSING ' + h); continue; } const res = await fetch(new URL(h, location.href).href.split('#')[0]); const id = h.split('#')[1]; let anchor = ''; if (id) { const t = await res.clone().text(); anchor = t.includes(`id="${id}"`) ? ' #ok' : ' #MISSING'; } out.push(`${res.status} ${h}${anchor}`); } return out; });
      for (const id of ['clock', 'hud', 'lock', 'experiments']) { await pg.evaluate(id => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById(id).scrollIntoView(); }, id); await pg.waitForTimeout(600); await pg.screenshot({ path: `${SP}/galactic/v2/m_${id}.png` }); }
    } else { await pg.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById('hud').scrollIntoView(); }); await pg.waitForTimeout(600); await pg.screenshot({ path: `${SP}/galactic/v2/m_hud_390.png` }); }
    console.log(w, JSON.stringify(r, null, 1), errs);
    await pg.close();
  }
  await b.close();
})();
