const { chromium } = require('playwright');
const SP = process.env.SP, URL = 'http://localhost:8766/Pages/Geometric%20Calculator/Galactic%20Lensing/tri_engine_convergence.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|Sign-in/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await pg.route(/three(\.min)?\.js/, r => r.fulfill({ path: SP + '/t158/package/build/three.min.js', contentType: 'application/javascript' }));
  await pg.route(/gstatic|googleapis|firebase/, r => r.abort());
  await pg.goto(URL); await pg.waitForTimeout(1500);
  const snap = async (label) => { const r = await pg.evaluate(() => ({
      sol: document.querySelector('#sol-state').textContent,
      jobs: [0, 1, 2].map(s => document.querySelector('#job-st-' + s).textContent + ' | ' + document.querySelector('#job-out-' + s).textContent.replace(/\n/g, ' / ')),
      tqf: document.querySelector('#tqf-rows').textContent, quad: document.querySelector('#quad-out').textContent.replace(/\s+/g, ' '),
      mem: [...document.querySelectorAll('#mem-rows tr')].map(t => t.textContent), memAct: document.querySelector('#mem-act').textContent,
      lemma: document.querySelector('#lemma-sum').textContent, fails: [...document.querySelectorAll('#lemma-rows tr')].filter(t => t.querySelector('.st-fail')).map(t => t.children[0].textContent),
      gauge: document.querySelector('#gauge-out').textContent.replace(/\s+/g, ' '), vsum: document.querySelector('#vsum').textContent })); console.log('== ' + label, JSON.stringify(r, null, 1)); };
  const waitFor = async (cond, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await pg.evaluate(cond)) return true; await pg.waitForTimeout(200); } return false; };
  await snap('start');
  await pg.evaluate(() => { const s = document.querySelector('#speed'); s.value = '1'; s.dispatchEvent(new Event('input')); });
  await pg.click('[data-preset="ieee"]'); await pg.click('#run-all');
  await pg.waitForTimeout(1500); await snap('ieee running');
  await pg.screenshot({ path: SP + '/galactic/v2/conv_running.png' });
  console.log('converged', await waitFor(() => /CONVERGED/.test(document.querySelector('#sol-state').textContent)));
  await pg.waitForTimeout(800); await snap('ieee converged');
  await pg.screenshot({ path: SP + '/galactic/v2/conv_done.png' });
  await pg.click('[data-preset="mixed"]'); await pg.click('#run-stagger'); await pg.waitForTimeout(2600); await snap('mixed staggered mid');
  await pg.screenshot({ path: SP + '/galactic/v2/conv_stagger.png' });
  console.log('converged2', await waitFor(() => /CONVERGED/.test(document.querySelector('#sol-state').textContent) && document.querySelectorAll('#mem-rows tr').length >= 2));
  await pg.waitForTimeout(500); await snap('mixed converged');
  await pg.click('#mem-alter'); await pg.waitForTimeout(500); await snap('altered');
  await pg.click('#mem-repair'); await pg.waitForTimeout(500); await snap('repaired');
  await pg.click('#mem-rows td[data-m]'); await pg.waitForTimeout(300); console.log('erase1', await pg.textContent('#mem-rows tr'));
  await pg.click('#mem-rows tr td[data-m]:nth-child(3)'); await pg.waitForTimeout(300); console.log('erase2', await pg.textContent('#mem-rows tr'));
  await pg.click('#mem-restore');
  await pg.fill('#expr-0', '1/0'); await pg.click('#run-0'); await pg.waitForTimeout(300); console.log('err', await pg.textContent('#job-out-0'));
  await pg.click('[data-preset="approx"]'); await pg.click('#run-all'); console.log('converged3', await waitFor(() => document.querySelectorAll('#mem-rows tr').length >= 3)); await pg.waitForTimeout(500); await snap('approx');
  await pg.evaluate(() => { const s = document.querySelector('#kappa'); s.value = '0'; s.dispatchEvent(new Event('input')); }); await pg.waitForTimeout(300); console.log('kappa0', await pg.textContent('#tqf-rows'));
  console.log('errs', errs);
  await b.close();
})();
