const { chromium } = require('playwright');
const SP = process.env.SP, URL = 'http://localhost:8766/Pages/Geometric%20Calculator/Zero%20Point%20Calculations/zero_point_tri_engine.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const mode of ['hold', 'free', 'membrane']) {
    const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route(/three(\.min)?\.js/, r => r.fulfill({ path: SP + '/t158/package/build/three.min.js', contentType: 'application/javascript' }));
    await pg.route(/gstatic|googleapis|firebase/, r => r.abort());
    await pg.goto(URL); await pg.waitForTimeout(1500);
    await pg.selectOption('#clutch', mode);
    await pg.evaluate(() => { const s = document.querySelector('#speed'); s.value = '0.3'; s.dispatchEvent(new Event('input')); });
    await pg.click('[data-preset="ieee"]'); await pg.click('#run-stagger');
    await pg.waitForFunction(() => [...document.querySelectorAll('#log div')].some(d => /register 2 closed/.test(d.textContent)), null, { timeout: 60000 });
    await pg.click('#btn-play'); await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => ({ sol: document.querySelector('#sol-state').textContent, tqf: document.querySelector('#tqf-rows').textContent,
      tests: document.querySelector('#zp-tests').textContent.replace(/\s+/g, ' '), pump: [...document.querySelectorAll('#pump-rows tr')].map(t => t.textContent),
      mem: document.querySelector('#membrane-out').textContent.replace(/\s+/g, ' '), clutch: [...document.querySelectorAll('#clutch-rows tr')].map(t => t.textContent),
      fails: [...document.querySelectorAll('#lemma-rows tr')].filter(t => t.querySelector('.st-fail')).map(t => t.children[0].textContent),
      log: [...document.querySelectorAll('#log div')].map(d => d.textContent).reverse() }));
    console.log('== ' + mode, JSON.stringify(r, null, 1), errs);
    if (mode === 'hold') { await pg.evaluate(() => document.querySelector('#panel-c').scrollIntoView()); await pg.waitForTimeout(300); await pg.screenshot({ path: SP + '/galactic/v2/zp_hold_c.png' }); }
    await pg.close();
  }
  await b.close();
})();
