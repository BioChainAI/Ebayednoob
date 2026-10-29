// Hyperbolic PolyStep: hub and explainers render, charts draw every node and edge, links resolve, the lab's step obeys H2.
const { chromium } = require('playwright');
const SP = process.env.SP, BASE = 'http://localhost:8766/Pages/Geometric%20Calculator/Hyperbolic%20PolyStep/';
const PAGES = ['index.html', 'explainers/hyperbolic-step.html', 'explainers/channels.html', 'explainers/benchmarks.html', 'explainers/build-and-verify.html', 'explainers/reference-guide.html', 'explainers/core-reference.html'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let fail = 0;
  for (const [w, h] of [[1440, 900], [390, 844]]) for (const p of PAGES) {
    const pg = await b.newPage({ viewport: { width: w, height: h }, colorScheme: 'dark' });
    const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await pg.route(/KaTeX\/0\.16\.9\/(.*)$/, r => r.fulfill({ path: SP + '/node_modules/katex/dist/' + r.request().url().split('/0.16.9/')[1] }));
    await pg.route(/gstatic|googleapis|firebase/, r => r.abort());
    await pg.goto(BASE + p); await pg.waitForTimeout(1500);
    const r = await pg.evaluate(async () => {
      const full = document.querySelector('[data-hp-map="full"] svg'), focus = [...document.querySelectorAll('[data-hp-map="focus"] svg')];
      const links = [...document.querySelectorAll('main a[href], footer a[href], .hero a[href]')].map(a => a.getAttribute('href')).filter(h => !/^(https?:|#|mailto:)/.test(h));
      const uniq = [...new Set(links.map(h => new URL(h, location.href).href.split('#')[0]))];
      const st = await Promise.all(uniq.map(u => fetch(u).then(x => x.status).catch(() => 0)));
      const anchors = [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h));
      return { title: document.title, katex: document.querySelectorAll('.katex').length, katexErr: document.querySelectorAll('.katex-error').length,
        fullNodes: full ? full.querySelectorAll('.map-node').length : null, fullEdges: full ? full.querySelectorAll('.map-edge').length : null,
        expect: [HPMap.NODES.length, HPMap.EDGES.length], focus: focus.map(s => s.querySelectorAll('.map-node').length),
        bad: uniq.filter((u, i) => st[i] !== 200), deadAnchors: anchors, scrollW: document.documentElement.scrollWidth, innerW: innerWidth };
    });
    let ok = !errs.length && !r.katexErr && !r.bad.length && !r.deadAnchors.length && r.scrollW <= r.innerW && r.focus.every(n => n >= 2) && (r.fullNodes === null || (r.fullNodes === r.expect[0] && r.fullEdges === r.expect[1]));
    if (p === 'index.html') {
      await pg.click('.map-node[data-id="channels"]'); await pg.waitForTimeout(200);
      const d = await pg.textContent('.map-detail'); r.detail = d.slice(0, 60); ok = ok && /Three channels/.test(d) && /Draws on/.test(d);
    }
    if (p === 'explainers/hyperbolic-step.html') {
      const outs = [];
      for (let i = 0; i < 12; i++) { await pg.click('#b-step'); outs.push(await pg.textContent('#lab-out')); }
      for (const v of ['-2', '0.7']) { await pg.evaluate(v => { const e = document.querySelector('#in-eps'); e.value = v; e.dispatchEvent(new Event('input')); }, v); outs.push(await pg.textContent('#lab-out')); }
      r.labH2 = outs.every(o => /≤ r =/.test(o)); r.labSample = outs[outs.length - 1].slice(0, 120); ok = ok && r.labH2;
    }
    if (p === 'explainers/core-reference.html') {
      await pg.waitForFunction(() => document.body.dataset.parity, null, { timeout: 120000 });
      r.parity = await pg.evaluate(() => document.body.dataset.parity);
      await pg.click('#b-run'); await pg.waitForFunction(() => document.body.dataset.run !== undefined, null, { timeout: 120000 });
      r.run = await pg.evaluate(() => [document.body.dataset.run, document.querySelector('#run-out').textContent.slice(0, 90)]);
      ok = ok && r.parity === '169/169';
    }
    if (p === 'explainers/channels.html') { r.charts = await pg.evaluate(() => [document.querySelectorAll('#packet-chart rect').length, document.querySelectorAll('#schedule-chart rect').length]); ok = ok && r.charts[0] === 13 && r.charts[1] === 73; }
    if (!ok) fail++;
    console.log(ok ? 'PASS' : 'FAIL', w, p, JSON.stringify(r), errs.slice(0, 3));
    if (SP) await pg.screenshot({ path: `${SP}/galactic/v2/hp_${w}_${p.replace(/\W/g, '_')}.png`, fullPage: w === 390 ? false : false });
    await pg.close();
  }
  console.log(fail ? `${fail} FAILED` : 'all passed');
  await b.close();
})();
