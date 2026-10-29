const { chromium } = require('playwright');
const SP = process.env.SP, ROOT = 'http://localhost:8766/';
const EXP = ROOT + 'Fractal%20Processing/Geometric%20Engine%20of%20Time/Geometric%20Engine%20of%20Time%20Interactive%20Explainer.html';
const HUB = ROOT + 'Fractal%20Processing/Fractal%20Processing%20Learning%20Hub.html';
const KX = SP + '/node_modules/katex/dist/';
const setup = async (pg) => {
  await pg.route(/cdn\.tailwindcss\.com/, r => r.fulfill({ contentType: 'application/javascript', body: require('fs').readFileSync(SP + '/tw/package/dist/index.global.js', 'utf8') + '\nwindow.tailwind = window.tailwind || {};' }));
  await pg.route(/katex@0\.16\.9\/dist\/(.*)$/, r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: KX + f }); });
  await pg.route(/gstatic|googleapis|firebase|fonts\./, r => r.abort());
};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h }, colorScheme: 'dark' });
    const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await setup(pg); await pg.goto(EXP); await pg.waitForTimeout(3000);
    const r = await pg.evaluate(() => {
      const host = [...document.querySelectorAll('*')].find(e => e.shadowRoot && e.shadowRoot.querySelector('.dock'));
      const dock = host && host.shadowRoot.querySelector('.dock');
      const rel = [...document.querySelectorAll('footer nav a, #sec-pump a')].map(a => [a.textContent.trim(), a.getAttribute('href')]);
      return { title: document.title, katex: document.querySelectorAll('.katex').length, katexErr: document.querySelectorAll('.katex-error').length,
        dock: dock ? [dock.dataset.position, Math.round(dock.getBoundingClientRect().left), Math.round(dock.getBoundingClientRect().top)] : null,
        menus: dock ? [...dock.querySelectorAll('button')].map(x => x.getAttribute('aria-label') || x.textContent.trim()).filter(Boolean) : null,
        cur: dock ? [...host.shadowRoot.querySelectorAll('[aria-current]')].map(a => a.textContent.trim()) : null,
        rel, scrollW: document.documentElement.scrollWidth };
    });
    console.log(w, JSON.stringify(r));
    // links resolve
    const st = await pg.evaluate(async (urls) => Promise.all(urls.map(u => fetch(new URL(u, location.href)).then(x => x.status))), r.rel.map(x => x[1]));
    console.log('link status', st.join(','));
    // tab switching, including the "core only" fix
    for (const t of ['eth', 'bench', 'get', 'all']) {
      await pg.evaluate(t => switchMainWorkspaceTab(t), t); await pg.waitForTimeout(150);
      console.log('tab', t, await pg.evaluate(() => ['sec-pnp', 'sec-eth', 'sec-bench'].map(id => id + ':' + (document.getElementById(id).classList.contains('hidden') ? 'hidden' : 'shown')).join(' ')));
    }
    if (w === 1440) { await pg.screenshot({ path: SP + '/galactic/v2/fp_exp_1440.png' }); await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await pg.waitForTimeout(400); await pg.screenshot({ path: SP + '/galactic/v2/fp_exp_foot.png' }); }
    else await pg.screenshot({ path: SP + '/galactic/v2/fp_exp_390.png' });
    console.log('errs', errs.slice(0, 8));
    await pg.close();
  }
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await setup(pg);
  await pg.route(/firebase-app\.js/, r => r.fulfill({ contentType: 'application/javascript', body: 'export const initializeApp = () => ({});' }));
  await pg.route(/firebase-auth\.js/, r => r.fulfill({ contentType: 'application/javascript', body: 'export const getAuth = () => ({ currentUser: null }); export const signInAnonymously = async () => {}; export const onAuthStateChanged = (a, cb) => cb(null); export const signOut = async () => {}; export const signInWithCustomToken = async () => {};' }));
  await pg.route(/firebase-firestore\.js/, r => r.fulfill({ contentType: 'application/javascript', body: 'export const getFirestore = () => ({}); export const doc = () => ({}); export const setDoc = async () => {}; export const onSnapshot = () => () => {};' }));
  await pg.goto(HUB); await pg.waitForTimeout(2000);
  const cards = await pg.evaluate(() => [...document.querySelectorAll('#tutorials-grid h3')].map(h => h.textContent));
  const rel = await pg.evaluate(() => [...document.querySelectorAll('header nav a')].map(a => a.href));
  console.log('hub cards', cards, 'related', (await pg.evaluate(async (u) => Promise.all(u.map(x => fetch(x).then(r => r.status))), rel)).join(','));
  await pg.screenshot({ path: SP + '/galactic/v2/fp_hub.png' });
  await pg.click('text=The Geometric Engine of Time: Interactive Explainer'); await pg.waitForTimeout(3000);
  console.log('viewer', await pg.evaluate(() => [document.getElementById('tutorial-iframe').src, document.getElementById('open-full-page').href, document.getElementById('tutorial-iframe').contentDocument.title]));
  await pg.screenshot({ path: SP + '/galactic/v2/fp_hub_view.png' });
  console.log('hub errs', errs.filter(e => !/firebase|auth|Firebase/i.test(e)));
  await b.close();
})();
