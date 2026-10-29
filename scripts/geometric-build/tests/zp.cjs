const { chromium } = require('playwright');
const SP = process.env.SP, URL = 'http://localhost:8766/Pages/Geometric%20Calculator/Zero%20Point%20Calculations/zero_point_tri_engine.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|Sign-in/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await pg.route(/three(\.min)?\.js/, r => r.fulfill({ path: SP + '/t158/package/build/three.min.js', contentType: 'application/javascript' }));
  await pg.route(/gstatic|googleapis|firebase/, r => r.abort());
  await pg.goto(URL); await pg.waitForTimeout(1800);
  const T = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
  const snap = async (label) => { const r = await pg.evaluate((Ts) => { const T = eval(Ts); return {
      play: T('#btn-play'), frame: T('#zp-now'), sol: T('#sol-state'),
      jobs: [0, 1, 2].map(s => T('#job-st-' + s) + ' | ' + T('#job-out-' + s)),
      reg: T('#zp-reg'), tests: T('#zp-tests'), pkts: T('#zp-pkts'), tracks: T('#zp-tracks'),
      tqf: T('#tqf-rows'), quad: T('#quad-out'), pump: T('#pump-rows'), pumpNote: T('#pump-note'),
      clutch: T('#clutch-rows'), mem: [...document.querySelectorAll('#mem-rows tr')].map(t => t.textContent),
      lemma: T('#lemma-sum'), fails: [...document.querySelectorAll('#lemma-rows tr')].filter(t => t.querySelector('.st-fail')).map(t => t.children[0].textContent),
      vsum: T('#vsum') }; }, T.toString()); console.log('== ' + label, JSON.stringify(r, null, 1)); return r; };
  const waitFor = async (cond, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await pg.evaluate(cond)) return true; await pg.waitForTimeout(250); } return false; };
  const f0 = await pg.evaluate(() => state.simTime); await pg.waitForTimeout(1200);
  console.log('paused: simTime', f0, '->', await pg.evaluate(() => state.simTime));
  await snap('start');
  await pg.click('#btn-verify'); await pg.waitForTimeout(4000);
  console.log('verify', await pg.evaluate(() => document.querySelector('#vsum').textContent));
  console.log('vfails', await pg.evaluate(() => [...document.querySelectorAll('#log div')].map(d => d.textContent).filter(l => /FAIL/.test(l))));
  await pg.click('#btn-step'); await pg.waitForTimeout(200); console.log('after step', await pg.evaluate(() => document.querySelector('#zp-now').textContent));
  await pg.click('#btn-zero'); await pg.waitForTimeout(200); console.log('after zero', await pg.evaluate(() => document.querySelector('#zp-now').textContent));
  await pg.evaluate(() => { const s = document.querySelector('#speed'); s.value = '1'; s.dispatchEvent(new Event('input')); });
  await pg.click('[data-preset="ieee"]'); await pg.click('#run-all');
  await pg.waitForTimeout(1500); await snap('ieee running');
  await pg.screenshot({ path: SP + '/galactic/v2/zp_running.png' });
  console.log('converged', await waitFor(() => /CONVERGED/.test(document.querySelector('#sol-state').textContent)));
  await pg.waitForTimeout(600); await snap('ieee converged');
  await pg.screenshot({ path: SP + '/galactic/v2/zp_done.png' });
  console.log('frame at pairing n mod 24 =', await pg.evaluate(() => typeof lastPair !== 'undefined' ? lastPair : null));
  await pg.click('[data-preset="mixed"]'); await pg.click('#run-stagger');
  console.log('converged2', await waitFor(() => document.querySelectorAll('#mem-rows tr').length >= 2));
  await pg.waitForTimeout(500); await snap('mixed staggered');
  // run until the register closes at a multiple of 720
  console.log('pump closed', await waitFor(() => /closed|Q10|P⁻¹|P\^-1/.test(document.querySelector('#pump-note').textContent), 90000));
  await snap('pump');
  await pg.evaluate(() => document.querySelector('#panel-z').scrollIntoView()); await pg.waitForTimeout(300);
  await pg.screenshot({ path: SP + '/galactic/v2/zp_panelz.png' });
  console.log('errs', errs);
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
  await m.route(/three(\.min)?\.js/, r => r.fulfill({ path: SP + '/t158/package/build/three.min.js', contentType: 'application/javascript' }));
  await m.route(/gstatic|googleapis|firebase/, r => r.abort());
  await m.goto(URL); await m.waitForTimeout(1500);
  console.log('phone overflow', await m.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth, [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(e).position !== 'fixed').slice(0, 8).map(e => e.tagName + '#' + e.id + '.' + e.className)]));
  await m.screenshot({ path: SP + '/galactic/v2/zp_390.png', fullPage: false });
  await b.close();
})();
