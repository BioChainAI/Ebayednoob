const { chromium } = require('playwright');
const SP = process.env.SP, URL = 'http://localhost:8766/Pages/Geometric%20Calculator/Galactic%20Lensing/tri_engine_soliton.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/three(\.min)?\.js/, r => r.fulfill({ path: SP + '/t158/package/build/three.min.js', contentType: 'application/javascript' }));
  await pg.route(/gstatic|googleapis|firebase/, r => r.abort());
  await pg.goto(URL); await pg.waitForTimeout(2500);
  const snap = async (label) => { await pg.waitForTimeout(400); const r = await pg.evaluate(() => ({
      sol: document.querySelector('#sol-state').textContent,
      tqf: [...document.querySelectorAll('#tqf-rows tr')].map(tr => tr.children[0].textContent + ':' + tr.children[7].textContent + ' χ=' + tr.children[5].textContent + ' dφ=' + tr.children[6].textContent),
      gauge: document.querySelector('#gauge-out').textContent.replace(/\s+/g, ' '),
      hol: document.querySelector('#hol-out').textContent.replace(/\s+/g, ' ').slice(-80),
      lemma: document.querySelector('#lemma-sum').textContent, ep: document.querySelector('#ep-v').textContent,
      fails: [...document.querySelectorAll('#lemma-rows tr')].filter(t => t.querySelector('.st-fail')).map(t => t.children[0].textContent) })); console.log('== ' + label, JSON.stringify(r, null, 0)); };
  const set = async (id, v, ev = 'input') => { await pg.evaluate(([id, v, ev]) => { const e = document.querySelector(id); e.value = v; e.dispatchEvent(new Event(ev)); }, [id, v, ev]); };
  // the page opens paused
  await snap('baseline');
  await set('#noise', '1'); await snap('noise 1');
  await set('#noise', '3'); await snap('noise 3');
  await set('#noise', '0');
  await set('#kappa', '0'); await set('#noise', '3'); await snap('kappa 0 noise 3');
  await set('#kappa', '1'); await set('#noise', '0');
  await set('#ten', '40'); await set('#tor', '10'); await snap('ten 40 tor 10');
  await set('#ten', '0'); await set('#tor', '0');
  await set('#signal', 'lensing', 'change'); await snap('lensing inj');
  for (let i = 0; i < 14; i++) await pg.click('#ep-fwd'); await snap('lensing +14 epochs');
  await set('#signal', 'shapiro', 'change'); for (let i = 0; i < 14; i++) await pg.click('#ep-fwd'); await snap('shapiro +14');
  await set('#signal', 'scalar', 'change'); await snap('scalar magnetar');
  for (const n of ['J1746-2850', 'J1746-2829']) { await pg.evaluate(n => { const s = document.querySelector('#sight'); s.value = [...s.options].find(o => o.text.startsWith(n)).value; s.dispatchEvent(new Event('change')); }, n); await snap('scalar ' + n); }
  await set('#signal', 'none', 'change');
  await pg.click('#btn-error'); await snap('error');
  await pg.click('#btn-error');
  await pg.uncheck('#c-lock'); await set('#c-torus', '25'); await snap('unlock torus 25');
  console.log('sight options', await pg.evaluate(() => [...document.querySelector('#sight').options].map(o => o.text)));
  console.log('vsum', await pg.textContent('#vsum'), 'errs', errs);
  await b.close();
})();
