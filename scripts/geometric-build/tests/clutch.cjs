const { chromium } = require('playwright');
const SP = process.env.SP, BASE = 'http://localhost:8766/Pages/Geometric%20Calculator/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const mk = async (url) => {
    const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route(/three(\.min)?\.js/, r => r.fulfill({ path: SP + '/t158/package/build/three.min.js', contentType: 'application/javascript' }));
    await pg.route(/gstatic|googleapis|firebase/, r => r.abort());
    await pg.goto(BASE + url); await pg.waitForTimeout(1500); return { pg, errs };
  };
  // every engine page opens paused
  for (const u of ['index.html', 'numogram.html', 'Galactic%20Lensing/galactic_lensing_hierarchy.html', 'Galactic%20Lensing/tri_engine_soliton.html', 'Galactic%20Lensing/tri_engine_convergence.html']) {
    const { pg, errs } = await mk(u);
    const r = await pg.evaluate(() => {
      const btn = document.querySelector('#btn-play, #play-btn, [id*="play"]');
      const t = typeof sim !== 'undefined' ? sim.t : typeof clock !== 'undefined' && clock.simTime !== undefined ? clock.simTime : typeof state !== 'undefined' && state.simTime !== undefined ? state.simTime : null;
      return { btn: btn ? btn.textContent.trim().slice(0, 20) : null, t };
    });
    await pg.waitForTimeout(1200);
    const t2 = await pg.evaluate(() => typeof sim !== 'undefined' ? sim.t : typeof clock !== 'undefined' && clock.simTime !== undefined ? clock.simTime : typeof state !== 'undefined' && state.simTime !== undefined ? state.simTime : null);
    console.log('paused?', u, JSON.stringify(r), 'time after 1.2 s:', t2, errs.filter(e => !/OrbitControls/.test(e)));
    await pg.close();
  }
  // clutch modes on the calculator, staggered equal values
  for (const mode of ['hold', 'free', 'membrane']) {
    const { pg, errs } = await mk('Galactic%20Lensing/tri_engine_convergence.html');
    await pg.selectOption('#clutch', mode);
    await pg.evaluate(() => { const s = document.querySelector('#speed'); s.value = '1'; s.dispatchEvent(new Event('input')); });
    await pg.click('[data-preset="ieee"]'); await pg.click('#run-stagger');
    await pg.waitForTimeout(900);
    const mid = await pg.evaluate(() => ({ sol: document.querySelector('#sol-state').textContent, rows: [...document.querySelectorAll('#clutch-rows tr')].map(t => t.textContent) }));
    await pg.waitForFunction(() => /CONVERGED/.test(document.querySelector('#sol-state').textContent), null, { timeout: 30000 });
    await pg.waitForTimeout(400);
    const r = await pg.evaluate(() => ({ sol: document.querySelector('#sol-state').textContent, tqf: document.querySelector('#tqf-rows').textContent,
      rows: [...document.querySelectorAll('#clutch-rows tr')].map(t => t.textContent), mem: document.querySelector('#membrane-out').textContent.replace(/\s+/g, ' '),
      lemma: document.querySelector('#lemma-sum').textContent, fails: [...document.querySelectorAll('#lemma-rows tr')].filter(t => t.querySelector('.st-fail')).map(t => t.children[0].textContent),
      vsum: document.querySelector('#vsum').textContent, log: [...document.querySelectorAll('#log div')].map(d => d.textContent).filter(l => /^\[⊥\]|^\[Q\]|^\[Σ\]/.test(l)) }));
    console.log('== ' + mode, JSON.stringify({ mid, ...r }, null, 1), errs);
    if (mode === 'free') { await pg.evaluate(() => document.querySelector('#panel-c').scrollIntoView()); await pg.waitForTimeout(300); await pg.screenshot({ path: SP + '/galactic/v2/clutch_free.png' }); }
    await pg.close();
  }
  await b.close();
})();
