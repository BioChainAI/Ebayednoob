const { chromium } = require('playwright');
const SP = process.env.SP, T = SP + '/three128/node_modules/three/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1600, height: 1000 }, colorScheme: 'dark' });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/r128\/three\.min\.js/, r => r.fulfill({ path: T + 'build/three.min.js', contentType: 'application/javascript' }));
  await pg.route(/OrbitControls\.js/, r => r.fulfill({ path: T + 'examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }));
  await pg.route(/gstatic|googleapis|firebase/, r => r.abort());
  await pg.goto('http://localhost:8766/Pages/Geometric%20Calculator/index.html'); await pg.waitForTimeout(2500);
  const st = (label) => pg.evaluate((label) => {
    const kids = triangulationGroup.children, markers = kids.filter(o => o.isMesh && (o.geometry.type.startsWith('Sphere') || o.geometry.type.startsWith('Octahedron')));
    const ghost = kids.filter(o => o.isLineSegments && o.material.color.getHex() === 0x94a3b8)[0];
    return `${label}: checked=${document.getElementById('cb-vis-triangulation').checked} visible=${triangulationGroup.visible} live=${markers.length / 4} ghost=${ghost ? ghost.geometry.attributes.position.count / 12 : 0} stage=${calcState.inspectedStage} node=${selectedNodeIndex} scope=${document.getElementById('select-triangulation-mode').value}`;
  }, label);
  console.log(await st('load'));
  await pg.evaluate(() => selectRegisterStage(2)); console.log(await st('register S2 (TQF off)'));
  await pg.evaluate(() => triggerPaperSim(2)); console.log(await st('paper sim 2'));
  await pg.evaluate(() => applyMaximumTorsionShear()); console.log(await st('shear test'));
  await pg.evaluate(() => { const cb = document.getElementById('cb-vis-triangulation'); cb.checked = true; toggleTriangulation(); }); console.log(await st('user ticks TQF'));
  for (const sIdx of [0, 3, 4]) { await pg.evaluate(s => selectRegisterStage(s), sIdx); console.log(await st(`register S${sIdx}`)); }
  await pg.evaluate(() => selectNode(5)); console.log(await st('node 6 in stage'));
  await pg.evaluate(() => updateTrajectoryScan(40)); console.log(await st('scan 40%'));
  await pg.evaluate(() => { const m = document.getElementById('select-triangulation-mode'); m.value = 'stage'; updateTriangulationVisuals(); }); console.log(await st('scope stage'));
  await pg.evaluate(() => selectRegisterStage(1)); console.log(await st('scope stage, S1'));
  await pg.evaluate(() => { const m = document.getElementById('select-triangulation-mode'); m.value = 'single'; updateTriangulationVisuals(); }); console.log(await st('scope single'));
  await pg.evaluate(() => { const cb = document.getElementById('cb-vis-triangulation'); cb.checked = false; toggleTriangulation(); }); console.log(await st('user unticks'));
  await pg.evaluate(() => enableFullSystemTQF()); console.log(await st('ALL TQF'));
  await pg.evaluate(() => selectRegisterStage(2)); await pg.evaluate(() => selectNode(14));
  await pg.waitForTimeout(500); await pg.screenshot({ path: SP + '/galactic/v2/tqf_s2.png' });
  console.log(await st('S2 node 15'));
  // a live calculation: the lit set grows with the running node
  await pg.evaluate(() => { calcState.expression = '0.1 + 0.2'; handleCalculate(); });
  for (let i = 0; i < 3; i++) { await pg.waitForTimeout(1500); console.log(await st('computing ' + i)); }
  console.log('errs', errs);
  await b.close();
})();
