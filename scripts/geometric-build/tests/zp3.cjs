const { chromium } = require('playwright');
const SP = process.env.SP, URL = 'http://localhost:8766/Pages/Geometric%20Calculator/Zero%20Point%20Calculations/zero_point_tri_engine.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  await pg.route(/three(\.min)?\.js/, r => r.fulfill({ path: SP + '/t158/package/build/three.min.js', contentType: 'application/javascript' }));
  await pg.route(/gstatic|googleapis|firebase/, r => r.abort());
  await pg.goto(URL); await pg.waitForTimeout(1200);
  const a = await pg.evaluate(() => [sim.t, lastFrame, state.playing]); await pg.waitForTimeout(1500);
  const c = await pg.evaluate(() => [sim.t, lastFrame, state.playing]);
  await pg.click('#btn-play'); await pg.waitForTimeout(2000);
  const d = await pg.evaluate(() => [sim.t, lastFrame, state.playing, document.querySelector('#fps-v').textContent]);
  console.log('load', a, 'after 1.5 s', c, 'after Play 2 s', d);
  await b.close();
})();
