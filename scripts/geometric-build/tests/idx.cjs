const { chromium } = require('playwright');
const SP = process.env.SP;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/r128\/three\.min\.js/, r => r.fulfill({ path: '/tmp/claude-0/-home-user-Ebayednoob/11d8b981-d8f4-5be8-a90f-f3c90070a8e5/scratchpad/three128/node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
  await pg.route(/gstatic|googleapis|firebase/, r => r.abort());
  await pg.goto('http://localhost:8766/Pages/Geometric%20Calculator/index.html'); await pg.waitForTimeout(2500);
  await pg.evaluate(() => document.getElementById('ebayednoob-page-chrome').shadowRoot.querySelectorAll('.dd-btn')[1].click());
  await pg.waitForTimeout(200);
  await pg.screenshot({ path: SP + '/galactic/v2/bar_index.png', clip: { x: 300, y: 0, width: 840, height: 400 } });
  console.log(errs);
  await b.close();
})();
