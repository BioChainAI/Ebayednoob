// Engram Mind's Eye: the system map, drawn on the hub in full and on every explainer as a focused chart.
// One list of nodes and edges serves every page. When a module is added or built, change its node here (its
// status, its explainer) and every chart in the folder picks it up. The renderer is Hyperbolic Oracles'
// hp-map.js, unchanged apart from its names, so the two systems' maps read the same way.
//
//   <div data-em-map="full"></div>                  the whole system, four columns, click a node for details
//   <div data-em-map="focus" data-node="memory"></div> what one node draws on (left) and feeds (right)
//
// Paths in `href` and `explainer` are relative to the Engram Minds Eye folder; a page one level down sets
// <body data-root="../">. Absolute URLs are used as they are.
(function () {
    const KIND = {
        source: { name: 'Owl Academy source', color: '#f5c542' },
        existing: { name: 'Ebayednoob system', color: '#94a3b8' },
        math: { name: 'Mathematics', color: '#c084fc' },
        comp: { name: 'Layer', color: '#22d3ee' },
        artifact: { name: 'Page, data or code', color: '#34d399' }
    };
    const STATUS = {
        source: 'source', existing: 'built earlier', done: 'done', design: 'designed, not built', next: 'next to build', planned: 'planned'
    };
    const OWL = 'https://github.com/BioChainAI/Owl-Academy/blob/main/';
    const ARCH = 'explainers/architecture.html', EVID = 'explainers/evidence.html';
    const GC = '../Geometric%20Calculator/', HO = '../Hyperbolic%20Oracles/';

    // col: 0 sources, 1 mathematics, 2 layers, 3 pages, data and code. row: position in the column.
    const NODES = [
        { id: 'owlEye', col: 0, row: 0, kind: 'source', status: 'source', label: 'Engram Mind Eye', sub: 'Owl Academy · STRIX · 128-bit packets',
          desc: 'The reference page: the TTMPT engram core, the three-packet window α, β, γ, a 128-bit packet per token (codex parity, the 64-bit grid, triangulation), the text crystal, the 72- and 720-section exports and the concept library STRIX answers from.',
          refs: 'Library/Experimental_Systems/Engram_Mind_Eye.html', href: OWL + 'Library/Experimental_Systems/Engram_Mind_Eye.html' },
        { id: 'owlCodec', col: 0, row: 1, kind: 'source', status: 'source', label: 'Engram Codec', sub: 'Owl Academy · quaternion offload',
          desc: 'The memory-offload codec: fixed-axis quaternion deltas, block telescoping, Smallest-Three quantization and equal-share SLERP. Block boundaries are exact to about 1e-15 and detail inside a block is lossy. The register replaces it with exact integer products.',
          refs: 'Engram_Codec/engram_codec.py', href: OWL + 'Library/Experimental_Systems/Engram_Codec/engram_codec.py' },
        { id: 'owl3d', col: 0, row: 2, kind: 'source', status: 'source', label: "Biomesh Mind's Eye 3D", sub: 'Owl Academy · lattice · breath pump',
          desc: 'The 3D Mind’s Eye: a navigable lattice of 64-bit SHD-CCP packets, chains, the 64-cell fractal seed, LATTICE-SEED/1, a 720-frame breath pump and ENVIRONMENT/1. Its seeds are imported by the bridges.',
          refs: 'mage_tower/Biomesh_Mind_Eye_3D.html', href: OWL + 'mage_tower/Biomesh_Mind_Eye_3D.html' },
        { id: 'engine', col: 0, row: 3.5, kind: 'existing', status: 'existing', label: 'Geometric Harmonics Calculator', sub: 'engine v10 · one engine · five tiers',
          desc: 'The one-engine orbital calculator: five nested tori T4 to T0, the 30-node clock, 150 pulses per calculation (ingestion, alignment, superposition, pruning, latch) and the 64-bit Einstein tile. Each token runs as one of its calculations. The file is an uploaded export and stays untouched.',
          refs: 'index.html · manual chapters 4–12', href: GC + 'index.html' },
        { id: 'zp', col: 0, row: 4.5, kind: 'existing', status: 'existing', label: 'Zero-Point Tri-Engine', sub: 'three engines · the clock',
          desc: 'The three-engine orbital calculator: the eight-step cycle, the 24-frame joint cycle with onloads at 18, 10, 2 and offloads twelve frames later, pairing at the zero point, the clutch settings and the 720-frame register with its pump.',
          refs: 'gen4.py template', href: GC + 'Zero%20Point%20Calculations/zero_point_tri_engine.html' },
        { id: 'conv', col: 0, row: 5.5, kind: 'existing', status: 'existing', label: 'Tri-Engine Convergence', sub: 'triple quad · memory · gauge',
          desc: 'Three calculations converging into a triple quad: the gauge of Proposition 7.14, the quadrance-out, the membrane, and memory on the outer and inner manifolds at 30 addresses with Lemma 15 locate and repair.',
          refs: 'page3.html template', href: GC + 'Galactic%20Lensing/tri_engine_convergence.html' },
        { id: 'sol', col: 0, row: 6.5, kind: 'existing', status: 'existing', label: 'Tri-Engine Soliton', sub: 'cross-engine TQF · crystal',
          desc: 'Three active engines compared node by node with the cross-engine TQF, the emergent fourth drawn as a soliton crystal that stays at the centre while the books balance, the 16 Einstein tiles and the Merkle root.',
          refs: 'page2.html template', href: GC + 'Galactic%20Lensing/tri_engine_soliton.html' },
        { id: 'hps', col: 0, row: 7.5, kind: 'existing', status: 'existing', label: 'Hyperbolic PolyStep', sub: 'H² and H³ · tree · frames · twin',
          desc: 'The exact hyperbolic stack: rationals, the norm-5 quaternion tree with right division, tree embeddings in H² and H³, frames carried by transvections, the coupler with its binding B = q₂q₁, and the twin system.',
          refs: 'hyperbolic_core.js · decoder3d.js · twin3d.js', href: HO + 'index.html' },
        { id: 'fence', col: 0, row: 8.5, kind: 'existing', status: 'existing', label: 'The 0.7 Claude fence', sub: 'Tukey in H³ · ln 2 guard',
          desc: 'Tukey’s fence on the mass each point reaches from a Fréchet-median centre: exact in H², certified in H³, preregistered and supported on hierarchy-shaped clouds. Its four-point guard proves a stored distance wrong and names the pair.',
          refs: 'fence.js · CF1–CF9', href: HO + 'claude-fence.html' },

        { id: 'keym', col: 1, row: 0.5, kind: 'math', status: 'source', label: 'The engram/1 key', sub: 'letter-count parity · rank 26',
          desc: 'An engram is the XOR of the grids of a token’s letters, so it records only whether each letter appears an odd or even number of times. The 26 letter grids are independent over GF(2): at most 2²⁶ keys occur.',
          refs: 'Spike A', explainer: ARCH + '#key' },
        { id: 'tiers', col: 1, row: 2, kind: 'math', status: 'source', label: 'Five tier laws', sub: 'R = 5n²+15n+15 · W = 16−2n',
          desc: 'The radii, tube radii and winding numbers of engine v10’s five tori, the 30-node clock and the five stage roles a calculation passes from T4 to T0.',
          refs: 'engine v10 manual ch. 4–6', explainer: ARCH + '#pipeline' },
        { id: 'clockm', col: 1, row: 3, kind: 'math', status: 'source', label: 'Zero-point clock', sub: '8 steps · 24 frames · 720',
          desc: 'k = F mod 8, branch F mod 3, joint frame n = F mod 24. Channel j onloads at n = 18, 10, 2 and offloads twelve frames later; the three pair at n = 0.',
          refs: 'Props 2.2, 3.7', explainer: ARCH + '#memory' },
        { id: 'norm5', col: 1, row: 4, kind: 'math', status: 'source', label: 'Norm-5 tree', sub: '28 letters ↔ 64 bits',
          desc: 'Reduced words in 1 ± 2i, 1 ± 2j, 1 ± 2k factor uniquely, so right division recovers a word from its quaternion. 5²⁸ > 2⁶⁴, so a 28-letter word holds a packet, and a chain of words is one quaternion.',
          refs: 'Spike B', explainer: ARCH + '#packet' },
        { id: 'tq', col: 1, row: 5, kind: 'math', status: 'source', label: 'Triple quad, Lemma 15', sub: 'Y = α ⊕ β ⊕ γ · Merkle locate',
          desc: 'Four cells, the fourth the parity of the other three: any one lost cell is rebuilt. A Merkle chain over the four leaves locates an altered cell as the deepest layer that differs.',
          refs: 'Lemma 15 · Spike C', explainer: ARCH + '#memory' },
        { id: 'gaugem', col: 1, row: 6, kind: 'math', status: 'source', label: 'Proposition 7.14 gauge', sub: '(s, X, Y) · lock at χ = 1/√3',
          desc: 'Three values become their total s and their lean (X, Y), exactly and invertibly. Equal values give an equilateral landing triangle, the lock.',
          refs: 'Prop 7.14 · Spike C', explainer: ARCH + '#resonance' },
        { id: 'pumpm', col: 1, row: 7, kind: 'math', status: 'source', label: '720 → 72 → 10 pump', sub: 'H = Q₈Q₁₀P = P⁻¹',
          desc: 'A register’s increments telescope through 72 ten-frame blocks and 10 inner groups. Owl Academy’s Ontological Codex uses the same three scales.',
          refs: 'Prop 3.9 · Spike C', explainer: ARCH + '#register' },
        { id: 'fencem', col: 1, row: 8, kind: 'math', status: 'source', label: 'Fence and guard', sub: 'CF1–CF9 · ln 2',
          desc: 'The fence lies within ln 2 of the upper quartile on hierarchy-shaped clouds; no four points of H^n have a defect above ln 2, so a larger defect proves a distance wrong.',
          refs: 'CF5, CF9 · Spike D', explainer: ARCH + '#watch' },

        { id: 'L0', col: 2, row: 0, kind: 'comp', status: 'design', label: 'L0 · Key', sub: 'engram/1, frozen',
          desc: 'The TTMPT core, verbatim, pinned by the golden corpus so chains, seeds and exports move between the repositories.',
          refs: 'D4 · E1', explainer: ARCH + '#key' },
        { id: 'L1', col: 2, row: 1, kind: 'comp', status: 'design', label: 'L1 · Pipeline', sub: 'one token, T4 → T0',
          desc: 'Each token as one calculation of engine v10: ingest (crystallize), align (triangulate against the window), superpose (fold into Y and the chain quaternion), prune (keep the word reduced), latch (tiles, leaf, memory word).',
          refs: 'design', explainer: ARCH + '#pipeline' },
        { id: 'L2', col: 2, row: 2, kind: 'comp', status: 'design', label: 'L2 · Packet', sub: 'address · two tiles',
          desc: 'The 128-bit packet kept for compatibility, an exact 28-letter address, and on the wire two Einstein tiles with the structure field set to α, β, γ or Y.',
          refs: 'D3 · E2', explainer: ARCH + '#packet' },
        { id: 'L3', col: 2, row: 3, kind: 'comp', status: 'design', label: 'L3 · Window and memory', sub: 'three channels · 30 addresses',
          desc: 'α, β, γ on Engines I–III of the zero-point clock; at each zero point a triple-quad word over GF(2) at one of 30 addresses, with Merkle locate and repair and a SHA-256 memory word.',
          refs: 'E3', explainer: ARCH + '#memory' },
        { id: 'L4', col: 2, row: 4, kind: 'comp', status: 'design', label: 'L4 · Resonance', sub: 'gauge · lock · soliton',
          desc: 'Each packet’s three distances to the window through the gauge; the lock; the soliton crystal at the core as the memory’s health.',
          refs: 'E6', explainer: ARCH + '#resonance' },
        { id: 'L5', col: 2, row: 5, kind: 'comp', status: 'design', label: 'L5 · Register', sub: '720 → 72 → 10 slots',
          desc: 'Every 720 frames a register closes in the free-run + membrane setting; its slots at three scales hold exact chain quaternions.',
          refs: 'D5 · E4', explainer: ARCH + '#register' },
        { id: 'L6', col: 2, row: 6, kind: 'comp', status: 'design', label: 'L6 · Geometry', sub: 'H² and H³ · frames · twin',
          desc: 'The memory’s structure tree laid out in H² and H³, a frame per packet from its quaternion, and the human and STRIX streams as the twin system bound by the coupler.',
          refs: 'E5', explainer: ARCH + '#geometry' },
        { id: 'L7', col: 2, row: 7, kind: 'comp', status: 'design', label: 'L7 · Watch', sub: 'fence screen · exact check · guard',
          desc: 'The fence screens the H³ layout at each register close and an exact address comparison settles every flag; the guard checks the stored float distances.',
          refs: 'E7, E8', explainer: ARCH + '#watch' },

        { id: 'prereg', col: 3, row: 0, kind: 'artifact', status: 'done', label: 'Preregistration', sub: 'E1–E9 · decision rules',
          desc: 'The nine claims with their instances, controls and decision rules, fixed in Phase 0 before any engram code. Amendment 1 (Phase 2, before any decisive run) replaced E1’s void control and recorded the definitions the reference fixed.',
          refs: 'PREREGISTRATION.md · Amendment 1', explainer: EVID + '#prereg' },
        { id: 'golden', col: 3, row: 1, kind: 'artifact', status: 'done', label: 'Golden corpus', sub: 'engram_v1.json · 536 entries',
          desc: 'Pinned in Phase 0 from Owl Academy’s own files: 536 entries, both tokenizers, the engram stream and the 69-packet chain of a fresh session. The page and biomesh.js agree on every entry.',
          refs: 'reference/golden/', explainer: EVID + '#golden' },
        { id: 'spikes', col: 3, row: 2, kind: 'artifact', status: 'done', label: 'Feasibility spikes', sub: 'A–D · 36/36 checks',
          desc: 'Four scripts run on the repositories’ own code, unchanged: the key, quaternion addresses, the orbital memory code and the fence on a memory tree. They shaped the design and decide no claim.',
          refs: 'spikes/', explainer: EVID },
        { id: 'ocore', col: 3, row: 3, kind: 'artifact', status: 'done', label: 'Shared cores', sub: 'Phase 1 · orbital_core.js',
          desc: 'Built in Phase 1: the orbital pages’ exact code (the core, tiers, the Fifteen-Lemma layer with tiles and the Merkle chain, tier frames and the TQF, the gauge, readout, memory repair and the pump) moved out of four build templates into one UMD module of 15 segments, which build.py writes back so the four pages stay byte-identical. Its Node test passes 18/18, Part 1’s verification included (66/66 lines). Hyperbolic PolyStep’s package now imports its exact modules without torch; its suite passes 137/137 before and after the change.',
          refs: 'D2, D7 · scripts/geometric-build/orbital_core.js', explainer: 'explainers/shared-cores.html', href: '../../scripts/geometric-build/orbital_core.js' },
        { id: 'ref', col: 3, row: 4, kind: 'artifact', status: 'done', label: 'Python reference', sub: 'Phase 2 · 8 supported · E8 inconclusive',
          desc: 'Built in Phase 2: twelve modules in reference/engram (engram/1, the orbital ports, addresses, the triple-quad memory, the clock and registers, the coupler, recall and the watch layer), 41 tests with exact parity against orbital_core.js, traces for the browser core, and the runner. It decided the claims: E1–E7 and E9 supported; E8 inconclusive (the guard’s bound exact, its naming right 96 times in 100 at +1.5).',
          refs: 'Phase 2 · results/claims.json', explainer: 'explainers/reference-results.html' },
        { id: 'jscore', col: 3, row: 5, kind: 'artifact', status: 'next', label: 'Browser core', sub: 'Phase 3 · engram_core.js',
          desc: 'The reference ported to the browser on the shared cores, checked line by line against the reference’s traces.',
          refs: 'Phase 3' },
        { id: 'page2d', col: 3, row: 6, kind: 'artifact', status: 'planned', label: 'The 2D page', sub: 'Phase 4 · mind-eye.html',
          desc: 'STRIX on the three-engine clock, each token on the five tiers, the memory panel, the gauge and lock, register closure and exports.',
          refs: 'Phase 4' },
        { id: 'page3d', col: 3, row: 7, kind: 'artifact', status: 'planned', label: 'The 3D page', sub: 'Phase 5 · mind-eye-3d.html',
          desc: 'The memory tree in H³ with frames, the twin system, the soliton crystal at the core and the fence shells with the screen and guard.',
          refs: 'Phase 5' },
        { id: 'bridges', col: 3, row: 8, kind: 'artifact', status: 'planned', label: 'Bridges', sub: 'Phase 6 · Owl Academy in and out',
          desc: 'Import and export of Owl Academy chains, 72/720 exports, biochain engram streams, lattice seeds and environments, with v1 exports byte-compatible.',
          refs: 'Phase 6' }
    ];
    const EDGES = [
        ['owlEye', 'keym'], ['owlEye', 'L3'], ['owlEye', 'golden'], ['owlEye', 'bridges'], ['owlCodec', 'L5'], ['owl3d', 'L6'], ['owl3d', 'bridges'],
        ['engine', 'tiers'], ['zp', 'clockm'], ['zp', 'pumpm'], ['conv', 'tq'], ['conv', 'gaugem'], ['sol', 'gaugem'], ['sol', 'L4'],
        ['hps', 'norm5'], ['hps', 'L6'], ['fence', 'fencem'],
        ['keym', 'L0'], ['tiers', 'L1'], ['clockm', 'L3'], ['clockm', 'L5'], ['norm5', 'L2'], ['norm5', 'L6'], ['tq', 'L3'], ['gaugem', 'L4'],
        ['pumpm', 'L5'], ['fencem', 'L7'],
        ['tiers', 'ocore'], ['tq', 'ocore'], ['gaugem', 'ocore'], ['pumpm', 'ocore'], ['hps', 'ocore'], ['ocore', 'spikes'],
        ['L0', 'L1'], ['L1', 'L2'], ['L2', 'L3'], ['L3', 'L4'], ['L3', 'L5'], ['L2', 'L6'], ['L6', 'L7'],
        ['L0', 'golden'], ['golden', 'prereg'], ['spikes', 'prereg'], ['golden', 'ref'], ['prereg', 'ref'], ['ocore', 'ref'],
        ['ref', 'jscore'], ['jscore', 'page2d'], ['jscore', 'page3d'], ['L1', 'page2d'], ['L3', 'page2d'], ['L4', 'page2d'], ['L5', 'page2d'],
        ['L4', 'page3d'], ['L6', 'page3d'], ['L7', 'page3d'], ['L2', 'bridges']
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
        const heads = ['Sources', 'Mathematics', 'Layers', 'Pages, data and code'];
        let s = `<svg viewBox="0 0 1076 ${height}" role="img" aria-label="System map of Engram Mind's Eye">`;
        s += `<defs><marker id="em-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs>`;
        heads.forEach((h, i) => { s += `<text x="${COLX[i] + W / 2}" y="24" text-anchor="middle" fill="#64748b" font-family="Fira Code, monospace" font-size="11" letter-spacing="2">${h.toUpperCase()}</text>`; });
        EDGES.forEach(([a, b]) => { const A = byId[a], B = byId[b]; s += `<path class="map-edge" data-a="${a}" data-b="${b}" d="${edgePath(A, B)}" stroke="${KIND[A.kind].color}" stroke-opacity="0.55" marker-end="url(#em-arrow)"/>`; });
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
        s += `<defs><marker id="em-arrow-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs>`;
        s += `<text x="126" y="16" text-anchor="middle" fill="#64748b" font-family="Fira Code, monospace" font-size="10" letter-spacing="2">DRAWS ON</text><text x="666" y="16" text-anchor="middle" fill="#64748b" font-family="Fira Code, monospace" font-size="10" letter-spacing="2">FEEDS</text>`;
        const edge = (a, b, color, ea, eb) => `<path class="map-edge" data-a="${ea}" data-b="${eb}" d="${edgePath({ x: a.x, y: a.y }, { x: b.x, y: b.y })}" stroke="${color}" stroke-opacity="0.6" marker-end="url(#em-arrow-${id})"/>`;
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

    window.EMMap = { NODES, EDGES, KIND, STATUS, renderFull, renderFocus };
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-em-map="full"]').forEach(renderFull);
        document.querySelectorAll('[data-em-map="focus"]').forEach(renderFocus);
        toc();
    });
    window.addEventListener('load', math);
})();
