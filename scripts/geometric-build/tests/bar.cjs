const { chromium } = require('playwright');
const SP = process.env.SP, K = SP + '/node_modules/katex/dist/', BASE = 'http://localhost:8766/Pages/Geometric%20Calculator/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const open = async (url, w = 1440) => {
    const pg = await b.newPage({ viewport: { width: w, height: 900 }, colorScheme: 'dark' });
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|Sign-in/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await pg.route(/three(\.min)?\.js/, r => r.fulfill({ path: SP + '/t158/package/build/three.min.js', contentType: 'application/javascript' }));
    await pg.route(/katex\.min\.js/, r => r.fulfill({ path: K + 'katex.min.js', contentType: 'application/javascript' }));
    await pg.route(/auto-render\.min\.js/, r => r.fulfill({ path: K + 'contrib/auto-render.min.js', contentType: 'application/javascript' }));
    await pg.route(/katex\.min\.css/, r => r.fulfill({ path: K + 'katex.min.css', contentType: 'text/css' }));
    await pg.route(/gstatic|googleapis|firebase/, r => r.abort());
    await pg.goto(url); await pg.waitForTimeout(1500);
    return { pg, errs };
  };
  const pages = ['index.html', 'manual.html', 'tracer.html', 'numogram.html', 'Galactic%20Lensing/galactic_lensing_hierarchy.html', 'Galactic%20Lensing/tri_engine_soliton.html', 'Galactic%20Lensing/galactic_companion.html', 'Galactic%20Lensing/tri_engine_manual.html', 'Galactic%20Lensing/tri_engine_convergence.html', 'Zero%20Point%20Calculations/zero_point_tri_engine.html', 'Hyperbolic%20PolyStep/index.html', 'Hyperbolic%20PolyStep/explainers/hyperbolic-step.html'];
  for (const p of pages) {
    const { pg, errs } = await open(BASE + p);
    const r = await pg.evaluate(async () => {
      const root = document.getElementById('ebayednoob-page-chrome').shadowRoot;
      const btns = [...root.querySelectorAll('.dd-btn:not(.profile)')].map(x => x.textContent.trim() || x.title);
      const vis = [...root.querySelectorAll('a[target=_blank]')].filter(a => a.offsetParent).length;
      const items = [...root.querySelectorAll('.menu a.item')];
      const cur = items.filter(a => a.getAttribute('aria-current')).map(a => a.textContent.split('·')[0]);
      const status = []; for (const a of items) { const r = await fetch(a.href); status.push(r.status); }
      const w = root.querySelector('.dock').getBoundingClientRect().width;
      return { btns, socialsVisible: vis, items: items.length, cur, status: status.join(','), dockW: Math.round(w) };
    });
    console.log(p, JSON.stringify(r), errs.length ? errs : '');
    await pg.close();
  }
  // interaction + screenshots
  for (const w of [1440, 390]) {
    const { pg, errs } = await open(BASE + 'Galactic%20Lensing/tri_engine_soliton.html', w);
    const root = 'ebayednoob-page-chrome';
    if (w === 390) await pg.evaluate(() => document.getElementById('ebayednoob-page-chrome').shadowRoot.querySelector('.expand').click());
    const clickBtn = async (i) => pg.evaluate(i => document.getElementById('ebayednoob-page-chrome').shadowRoot.querySelectorAll('.dd-btn')[i].click(), i);
    await clickBtn(0); await pg.waitForTimeout(200); await pg.screenshot({ path: `${SP}/galactic/v2/bar_sims_${w}.png`, clip: { x: 0, y: 0, width: w, height: 420 } });
    await clickBtn(1); await pg.waitForTimeout(200); await pg.screenshot({ path: `${SP}/galactic/v2/bar_man_${w}.png`, clip: { x: 0, y: 0, width: w, height: 420 } });
    await clickBtn(2); await pg.waitForTimeout(200); await pg.screenshot({ path: `${SP}/galactic/v2/bar_soc_${w}.png`, clip: { x: 0, y: 0, width: w, height: 300 } });
    const st = await pg.evaluate(() => { const r = document.getElementById('ebayednoob-page-chrome').shadowRoot; return { open: [...r.querySelectorAll('.menu')].filter(m => !m.hidden).map(m => m.id), rects: [...r.querySelectorAll('.menu')].filter(m => !m.hidden).map(m => { const b = m.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right)]; }) }; });
    await pg.mouse.click(30, 700);   // outside any open menu await pg.waitForTimeout(100);
    const after = await pg.evaluate(() => [...document.getElementById('ebayednoob-page-chrome').shadowRoot.querySelectorAll('.menu')].filter(m => !m.hidden).length);
    // keyboard
    await pg.evaluate(() => document.getElementById('ebayednoob-page-chrome').shadowRoot.querySelectorAll('.dd-btn')[1].focus());
    await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown');
    const focused = await pg.evaluate(() => document.getElementById('ebayednoob-page-chrome').shadowRoot.activeElement?.textContent);
    await pg.keyboard.press('Escape');
    const afterEsc = await pg.evaluate(() => [...document.getElementById('ebayednoob-page-chrome').shadowRoot.querySelectorAll('.menu')].filter(m => !m.hidden).length);
    console.log('interact', w, JSON.stringify(st), 'closedOnOutside', after === 0, 'kbd', focused, 'esc', afterEsc === 0, 'scrollW', await pg.evaluate(() => document.documentElement.scrollWidth), errs);
    if (w === 1440) {
      const tiles = await pg.evaluate(() => [...document.querySelectorAll('#pk2-rows td[data-k]')].map(t => t.dataset.k + '=' + t.textContent));
      console.log(tiles.join(' '));
    }
    await pg.close();
  }
  await b.close();
})();
