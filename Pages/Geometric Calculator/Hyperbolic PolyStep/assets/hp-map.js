// Hyperbolic PolyStep: the system map, drawn on the hub in full and on every explainer as a focused chart.
// One list of nodes and edges serves every page. When a module is added, give it a node here (with its
// explainer) and its edges, and every chart in the folder picks it up.
//
//   <div data-hp-map="full"></div>                  the whole system, four columns, click a node for details
//   <div data-hp-map="focus" data-node="step"></div> what one node draws on (left) and feeds (right)
//
// Paths in `href` and `explainer` are relative to the Hyperbolic PolyStep folder; a page one level down sets
// <body data-root="../">. Absolute URLs are used as they are.
(function () {
    const KIND = {
        source: { name: 'Source', color: '#f5c542' },
        math: { name: 'Mathematics', color: '#c084fc' },
        comp: { name: 'Component', color: '#22d3ee' },
        artifact: { name: 'Page or code', color: '#34d399' },
        existing: { name: 'Existing page', color: '#94a3b8' }
    };
    const STATUS = {
        source: 'source', existing: 'built earlier', done: 'done', built: 'built in the Python reference', design: 'designed, not built', next: 'next to build', planned: 'planned'
    };
    const PAPER = '../../../Fractal%20Processing/Geometric%20Engine%20of%20Time/Geometric%20Engine%20of%20Time%20Interactive%20Explainer.html';
    const STEP = 'explainers/hyperbolic-step.html', CH = 'explainers/channels.html', BENCH = 'explainers/benchmarks.html', BUILD = 'explainers/build-and-verify.html';

    // col: 0 sources, 1 mathematics, 2 components, 3 pages and code. row: position in the column.
    const NODES = [
        { id: 'paper', col: 0, row: 0, kind: 'source', status: 'source', label: 'Zero-Point paper', sub: 'cycle · hyperbolic Euler · P = NP',
          desc: 'The Geometric Engine of Time: the eight-step cycle, Euler’s formula in hyperbolic space and the conditional P = NP equivalence. It supplies the geometry, the schedule and the limits.',
          refs: '§§2–5, 8', href: PAPER },
        { id: 'lemmas', col: 0, row: 1.5, kind: 'source', status: 'source', label: 'Fifteen Lemmas', sub: 'exact arithmetic · TQF · parity',
          desc: 'The lemma set behind the engine: exact rational quaternions, the TQF and Weitzenböck lock, parity groups and the Merkle chain. The certifier and the memory reuse them.',
          refs: 'Lemmas 4–15', href: '../Galactic%20Lensing/galactic_companion.html' },
        { id: 'polystep', col: 0, row: 3.5, kind: 'source', status: 'source', label: 'polystep 1.1.1', sub: 'Le, TMLR 2026 · Apache-2.0',
          desc: 'Gradient-free training by optimal transport: rotate a polytope around each particle, score its vertices, weight them by softmax or Sinkhorn and move to the weighted barycentre. Its paper proves convergence under stated conditions (its theory mode: a power-decay step radius, a flat ε, probe jitter); its default heuristics are outside that theorem and are judged empirically.',
          refs: 'solver.py, geometry.py, solvers/', href: 'https://github.com/anindex/polystep' },
        { id: 'zp', col: 0, row: 6, kind: 'existing', status: 'existing', label: 'Zero-Point Tri-Engine', sub: 'the schedule, running',
          desc: 'The existing page that runs three engines on the 24-frame joint schedule inside the 720-frame register. The simulation page is generated from its template.',
          refs: 'page4 template', href: '../Zero%20Point%20Calculations/zero_point_tri_engine.html' },
        { id: 'conv', col: 0, row: 7.5, kind: 'existing', status: 'existing', label: 'Tri-Engine Convergence', sub: 'pairing · clutch · memory',
          desc: 'The existing calculator whose pairing, timing clutch, orthogonal membrane and outer/inner-manifold memory the channels reuse.',
          refs: 'page3 template', href: '../Galactic%20Lensing/tri_engine_convergence.html' },

        { id: 'clock', col: 1, row: 0, kind: 'math', status: 'source', label: 'Eight-step clock', sub: '24-frame joint schedule',
          desc: 'k = F mod 8, branch j = F mod 3, joint frame n = F mod 24. Branches onload at n = 18, 10, 2 and offload twelve frames later.',
          refs: 'Props 2.2, 3.7; Def 3.6', explainer: CH },
        { id: 'pump', col: 1, row: 1, kind: 'math', status: 'source', label: '720 → 72 → 10 pump', sub: 'H = Q⁽⁸⁾Q⁽¹⁰⁾P = P⁻¹',
          desc: 'The telescoping of a register’s increments into ten-frame and inner blocks. With non-commuting increments it still returns P⁻¹ exactly.',
          refs: 'Prop 3.9, 3.13', explainer: CH },
        { id: 'ghost', col: 1, row: 2, kind: 'math', status: 'source', label: 'Ghost map', sub: 'rational lift to the hyperboloid',
          desc: 'G(p) = ((1 + |p|²), 2p)/(1 − |p|²) sends a rational point of the unit ball to a rational point of the hyperboloid. It is how every vertex stays exact.',
          refs: '§3.2, Prop 3.3', explainer: STEP },
        { id: 'klein', col: 1, row: 3, kind: 'math', status: 'source', label: 'Klein model', sub: 'straight geodesics · {4,3,5} cell',
          desc: 'In the Klein model geodesics are straight lines, so the hyperbolic barycentre is an ordinary convex combination. The central {4,3,5} cell is the cube [−a, a]³.',
          refs: '§4.3, Prop 4.3', explainer: STEP },
        { id: 'rapidity', col: 1, row: 4, kind: 'math', status: 'source', label: 'Complex rapidity', sub: 'rotations · boosts · screws',
          desc: 'One exponential with λ = ϑ + iθ covers rotations (elliptic), boosts (hyperbolic) and screws (loxodromic). A PolyStep move is a boost; the rotation of its polytope is elliptic.',
          refs: '§§4.1–4.5', explainer: STEP },
        { id: 'polytope', col: 1, row: 5, kind: 'math', status: 'source', label: 'Rotated polytope', sub: 'orthoplex · Haar rotation · probes',
          desc: 'polystep’s candidate set: the 2d vertices of an orthoplex, turned by a random rotation and scaled by the step radius, with probe points along each direction.',
          refs: 'polystep geometry.py', explainer: STEP },
        { id: 'ot', col: 1, row: 6, kind: 'math', status: 'source', label: 'Transport weights', sub: 'softmax(−C/ε) · Sinkhorn',
          desc: 'Vertex costs become weights by a softmax at temperature ε, or by Sinkhorn, which also balances the weights across particles.',
          refs: 'polystep solvers/', explainer: STEP },
        { id: 'tracks', col: 1, row: 7, kind: 'math', status: 'source', label: 'Four tracks', sub: 'float · exact · snap · mod 881',
          desc: 'Float for search, exact rationals for certificates, a declared rational snap with its residual logged, and residues modulo 881 as fingerprints.',
          refs: '§8.10', explainer: BUILD },
        { id: 'limits', col: 1, row: 8, kind: 'math', status: 'source', label: 'The boundary', sub: 'Thm 5.11 · Props 5.9, 5.13',
          desc: 'What no result here can show: an encoding of all SAT is equivalent to P = NP; black-box search costs the volume; constant time is not P.',
          refs: '§§5.5–5.9', explainer: BENCH },

        { id: 'channels', col: 2, row: 0.5, kind: 'comp', status: 'built', label: 'Three channels', sub: 'A · B · C on the zero-point clock',
          desc: 'Three particle populations on the three 120° branches. Each runs one hyperbolic PolyStep step per joint cycle, carried by one 12-frame packet from its onload to its offload.',
          refs: 'design', explainer: CH },
        { id: 'memory', col: 2, row: 2, kind: 'comp', status: 'built', label: 'Pairing, membrane, memory', sub: 'zero point · clutch · register',
          desc: 'At each zero point the certified incumbents are compared and the best is written to memory. The clutch rests a stalled channel; the membrane recentres the channels. Each register closes with the pump.',
          refs: 'design', explainer: CH },
        { id: 'step', col: 2, row: 3.5, kind: 'comp', status: 'built', label: 'Hyperbolic PolyStep step', sub: 'corners · weights · centroid',
          desc: 'polystep’s step on the hyperboloid: geodesic vertices around x, black-box costs, transport weights and the Lorentzian centroid, computed in the Klein model as a convex combination.',
          refs: 'H1–H7', explainer: STEP },
        { id: 'helixb', col: 2, row: 5, kind: 'comp', status: 'built', label: 'Helix B certifier', sub: 'exact verification',
          desc: 'Every answer a channel proposes is checked in exact arithmetic: conflicts counted, clauses satisfied, an address verified by right-division, the state confirmed on the hyperboloid.',
          refs: 'Def 5.3 (6)', explainer: CH },
        { id: 'problems', col: 2, row: 6.5, kind: 'comp', status: 'built', label: 'Problem decoders', sub: '3-colour · MAX-SAT · tree · nets',
          desc: 'How a point of hyperbolic space becomes a discrete answer: a colour by nearest branch direction, a truth value by sign, a tree address, a hard-threshold network’s weights.',
          refs: 'B1–B4', explainer: BENCH },

        { id: 'prereg', col: 3, row: 0, kind: 'artifact', status: 'done', label: 'Preregistration', sub: 'tasks · budgets · decision rules',
          desc: 'The benchmarks, budgets, metrics and decision rules, fixed before any run, in the registered-report form of the paper’s open problems.',
          refs: 'PREREGISTRATION.md', explainer: BENCH, href: BENCH + '#prereg' },
        { id: 'ref', col: 3, row: 2, kind: 'artifact', status: 'done', label: 'Python reference', sub: 'reference/ · uses polystep',
          desc: 'Built in Phase 1: the hyperbolic step on polystep’s own solvers, the four problems with exact Helix B, the three channels on the clock, 82 passing tests of H1–H7, parity with polystep and the membrane, seeded traces for the browser port, and the benchmark runner.',
          refs: 'Phases 1 and 4 · 82 tests', explainer: 'explainers/reference-guide.html' },
        { id: 'jscore', col: 3, row: 3.5, kind: 'artifact', status: 'done', label: 'JavaScript core', sub: 'hyperbolic_core.js',
          desc: 'Built in Phase 2: hyperbolic_core.js, the reference ported function for function with no dependencies. It reproduces all 169 lines of the reference’s traces (exact fields exactly, floats to 1e-12), checked live in the browser.',
          refs: 'Phase 2 · 169/169 trace lines', explainer: 'explainers/core-reference.html' },
        { id: 'sim', col: 3, row: 5, kind: 'artifact', status: 'done', label: 'Simulation page', sub: 'three channels, live',
          desc: 'Built in Phase 3 on the browser core: the three channels on the zero-point clock for any of the four problems, with a Poincaré view of the particles and the last step’s polytopes, the clock, Helix B’s certified answer, the memory chain, the clutch and membrane, and the exact register pump. It opens paused and checks itself against the reference on load.',
          refs: 'Phase 3 · simulation.html', explainer: 'explainers/simulation-manual.html', href: 'simulation.html' },
        { id: 'proofs', col: 3, row: 6.5, kind: 'artifact', status: 'done', label: 'Proofs and results', sub: 'H1–H7 · B1–B4',
          desc: 'Built in Phase 4: full proofs of H1–H7 and of Lemma S (the step is polystep’s step in the frame of the particle, shortened), live checks of each property with controls that must fail, the reduction of T1, and the preregistered benchmarks run as registered, with every cell and decision.',
          refs: 'Phase 4', explainer: 'explainers/proofs-and-results.html' }
    ];
    const EDGES = [
        ['paper', 'clock'], ['paper', 'pump'], ['paper', 'ghost'], ['paper', 'klein'], ['paper', 'rapidity'], ['paper', 'tracks'], ['paper', 'limits'],
        ['lemmas', 'tracks'], ['lemmas', 'helixb'], ['lemmas', 'memory'],
        ['polystep', 'polytope'], ['polystep', 'ot'], ['polystep', 'ref'],
        ['zp', 'channels'], ['conv', 'memory'],
        ['clock', 'channels'], ['pump', 'memory'], ['ghost', 'step'], ['klein', 'step'], ['rapidity', 'step'], ['polytope', 'step'], ['ot', 'step'],
        ['tracks', 'helixb'], ['tracks', 'jscore'], ['limits', 'prereg'],
        ['step', 'channels'], ['channels', 'memory'], ['helixb', 'memory'], ['problems', 'helixb'], ['problems', 'step'], ['problems', 'prereg'],
        ['step', 'ref'], ['ref', 'jscore'], ['jscore', 'sim'], ['channels', 'sim'], ['memory', 'sim'], ['helixb', 'sim'],
        ['prereg', 'proofs'], ['step', 'proofs'], ['sim', 'proofs'], ['ref', 'proofs']
    ];
    const byId = Object.fromEntries(NODES.map(n => [n.id, n]));
    const ins = id => EDGES.filter(e => e[1] === id).map(e => byId[e[0]]);
    const outs = id => EDGES.filter(e => e[0] === id).map(e => byId[e[1]]);
    const root = () => document.body.dataset.root || '';
    const url = h => (!h ? null : /^(https?:)?\/\//.test(h) || h.startsWith('#') ? h : root() + h);
    const target = n => url(n.explainer || n.href);
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const NS = 'http://www.w3.org/2000/svg';
    const W = 232, H = 50;

    function nodeSVG(n, x, y, opts = {}) {
        const k = KIND[n.kind], dashed = n.status === 'planned' || n.status === 'next' || n.status === 'design';
        const fill = opts.focus ? 'rgba(120,53,15,0.55)' : 'rgba(15,23,42,0.95)';
        return `<g class="map-node" data-id="${n.id}" tabindex="0" role="button" aria-label="${esc(n.label)}: ${esc(STATUS[n.status])}" transform="translate(${x},${y})">
            <rect width="${W}" height="${H}" rx="10" fill="${fill}" stroke="${opts.focus ? '#f5c542' : k.color}" stroke-width="1.6"${dashed ? ' stroke-dasharray="5 4"' : ''}/>
            <circle cx="12" cy="14" r="4" fill="${k.color}"/>
            <text x="22" y="18" fill="#f8fafc" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="600">${esc(n.label)}</text>
            <text x="12" y="37" fill="#94a3b8" font-family="Fira Code, ui-monospace, monospace" font-size="9.8">${esc(n.sub)}</text>
        </g>`;
    }
    function edgePath(a, b) {
        // right edge of a to left edge of b; inside one column, bow out to the right
        if (a.x === b.x) {
            const x = a.x + W, y1 = a.y + H / 2, y2 = b.y + H / 2, bow = 34 + Math.abs(y2 - y1) * 0.12;
            return `M${x},${y1} C${x + bow},${y1} ${x + bow},${y2} ${x},${y2}`;
        }
        const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, dx = (x2 - x1) * 0.5;
        return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
    }
    function detailHTML(n) {
        const link = target(n), list = arr => arr.length ? arr.map(m => `<a href="#" data-pick="${m.id}">${esc(m.label)}</a>`).join(' · ') : '—';
        return `<h4><span class="dot" style="background:${KIND[n.kind].color}"></span>${esc(n.label)} <span class="status ${n.status === 'done' || n.status === 'built' ? 's-done' : n.status === 'next' ? 's-next' : n.status === 'existing' || n.status === 'source' ? 's-existing' : 's-planned'}">${STATUS[n.status]}</span></h4>
            <p>${esc(n.desc)}</p>
            <p class="links">${esc(KIND[n.kind].name)} · ${esc(n.refs)}${link ? ` · <a href="${link}">${n.explainer ? 'Read the explainer' : 'Open'} →</a>` : ''}${n.explainer && n.href && !n.href.includes('#') ? ` · <a href="${url(n.href)}">Open →</a>` : ''}</p>
            <p class="links">Draws on: ${list(ins(n.id))}<br>Feeds: ${list(outs(n.id))}</p>`;
    }
    function wire(svg, detail, pick) {
        const lit = id => {
            if (!id) { svg.classList.remove('dim'); svg.querySelectorAll('.lit,.sel').forEach(e => e.classList.remove('lit', 'sel')); return; }
            svg.classList.add('dim');
            svg.querySelectorAll('.map-node').forEach(g => {
                const on = g.dataset.id === id || EDGES.some(e => (e[0] === id && e[1] === g.dataset.id) || (e[1] === id && e[0] === g.dataset.id));
                g.classList.toggle('lit', on); g.classList.toggle('sel', g.dataset.id === id);
            });
            svg.querySelectorAll('.map-edge').forEach(p => p.classList.toggle('lit', p.dataset.a === id || p.dataset.b === id));
        };
        let held = null;
        svg.querySelectorAll('.map-node').forEach(g => {
            const id = g.dataset.id;
            g.addEventListener('mouseenter', () => lit(id));
            g.addEventListener('mouseleave', () => lit(held));
            g.addEventListener('focus', () => lit(id));
            const choose = () => pick ? pick(id) : (held = id, lit(id), detail && (detail.innerHTML = detailHTML(byId[id])));
            g.addEventListener('click', choose);
            g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
        });
        if (detail) detail.addEventListener('click', e => {
            const a = e.target.closest('[data-pick]'); if (!a) return;
            e.preventDefault(); held = a.dataset.pick; lit(held); detail.innerHTML = detailHTML(byId[held]);
        });
        return { select: id => { held = id; lit(id); if (detail) detail.innerHTML = detailHTML(byId[id]); } };
    }
    function legend() {
        return `<div class="map-legend">${Object.values(KIND).map(k => `<span style="--c:${k.color}">${k.name}</span>`).join('')}<span class="dashed" style="--c:#94a3b8">Dashed: designed or planned, not built yet</span></div>`;
    }

    function renderFull(el) {
        const COLX = [14, 284, 554, 830], TOP = 46, ROW = 66;
        const pos = n => ({ x: COLX[n.col], y: TOP + n.row * ROW });
        NODES.forEach(n => Object.assign(n, pos(n)));
        const height = Math.max(...NODES.map(n => n.y)) + H + 24;
        const heads = ['Sources', 'Mathematics', 'Components', 'Pages and code'];
        let s = `<svg viewBox="0 0 1076 ${height}" role="img" aria-label="System map of Hyperbolic PolyStep">`;
        s += `<defs><marker id="hp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs>`;
        heads.forEach((h, i) => { s += `<text x="${COLX[i] + W / 2}" y="24" text-anchor="middle" fill="#64748b" font-family="Fira Code, monospace" font-size="11" letter-spacing="2">${h.toUpperCase()}</text>`; });
        EDGES.forEach(([a, b]) => { const A = byId[a], B = byId[b]; s += `<path class="map-edge" data-a="${a}" data-b="${b}" d="${edgePath(A, B)}" stroke="${KIND[A.kind].color}" stroke-opacity="0.55" marker-end="url(#hp-arrow)"/>`; });
        NODES.forEach(n => { s += nodeSVG(n, n.x, n.y); });
        s += '</svg>';
        el.innerHTML = `<div class="map-wrap">${s}</div>${legend()}<div class="map-detail" aria-live="polite"><p class="links">Hover a box to light up its connections; click it for what it is, where it comes from and where it is explained.</p></div>`;
        const api = wire(el.querySelector('svg'), el.querySelector('.map-detail'));
        if (el.dataset.select) api.select(el.dataset.select);
    }

    function renderFocus(el) {
        const id = el.dataset.node, f = byId[id]; if (!f) return;
        const L = ins(id), R = outs(id), rows = Math.max(L.length, R.length, 1), GAP = 62;
        const height = 30 + rows * GAP + 10, cy = 30 + (rows * GAP - GAP) / 2;
        const place = (arr, x) => arr.map((n, i) => ({ n, x, y: 30 + (rows - arr.length) * GAP / 2 + i * GAP }));
        const left = place(L, 10), right = place(R, 550), mid = { n: f, x: 280, y: cy };
        let s = `<svg viewBox="0 0 792 ${height}" role="img" aria-label="Where ${esc(f.label)} sits">`;
        s += `<defs><marker id="hp-arrow-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs>`;
        s += `<text x="126" y="16" text-anchor="middle" fill="#64748b" font-family="Fira Code, monospace" font-size="10" letter-spacing="2">DRAWS ON</text><text x="666" y="16" text-anchor="middle" fill="#64748b" font-family="Fira Code, monospace" font-size="10" letter-spacing="2">FEEDS</text>`;
        const edge = (a, b, color, ea, eb) => `<path class="map-edge" data-a="${ea}" data-b="${eb}" d="${edgePath({ x: a.x, y: a.y }, { x: b.x, y: b.y })}" stroke="${color}" stroke-opacity="0.6" marker-end="url(#hp-arrow-${id})"/>`;
        left.forEach(p => { s += edge(p, mid, KIND[p.n.kind].color, p.n.id, id); });
        right.forEach(p => { s += edge(mid, p, KIND[f.kind].color, id, p.n.id); });
        [...left, ...right].forEach(p => { s += nodeSVG(p.n, p.x, p.y); });
        s += nodeSVG(f, mid.x, mid.y, { focus: true });
        s += '</svg>';
        el.innerHTML = `<div class="map-wrap mini">${s}</div>`;
        wire(el.querySelector('svg'), null, pick => { const n = byId[pick], t = target(n); if (pick !== id && t) location.href = t; });
    }

    // Table of contents: mark the section in view
    function toc() {
        const links = [...document.querySelectorAll('.toc a[href^="#"]')]; if (!links.length) return;
        const secs = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
        const io = new IntersectionObserver(es => {
            es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id)); });
        }, { rootMargin: '-20% 0px -70% 0px' });
        secs.forEach(s => io.observe(s));
    }
    function math() {
        if (window.renderMathInElement) renderMathInElement(document.body, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false });
    }

    window.HPMap = { NODES, EDGES, KIND, STATUS, renderFull, renderFocus };
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-hp-map="full"]').forEach(renderFull);
        document.querySelectorAll('[data-hp-map="focus"]').forEach(renderFocus);
        toc();
    });
    window.addEventListener('load', math);
})();
