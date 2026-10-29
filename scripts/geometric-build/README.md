# Geometric Calculator build sources

The Galactic Lensing pages and the Zero-Point Tri-Engine are generated from the templates in this folder.
Edit the templates here, never the built pages, then rebuild:

```bash
python3 scripts/geometric-build/build.py
node scripts/install-page-chrome.mjs
```

| Source | Builds |
| --- | --- |
| `page.html` + `core.js` + `ref_output.txt` | `Pages/Geometric Calculator/Galactic Lensing/galactic_lensing_hierarchy.html` (Part 1) |
| `page2.html` (+ shared blocks of `page.html`) | `Galactic Lensing/tri_engine_soliton.html` (Part 2) |
| `page3.html` (+ segments of `page2.html`) | `Galactic Lensing/tri_engine_convergence.html` |
| `gen4.py` turns `page3.html` + `gen4_body.html` into `page4.html` | `Zero Point Calculations/zero_point_tri_engine.html` |

`build.py` runs `gen4.py` first. `page4.html` is an intermediate file and is not committed.

Placeholders in the templates:
- `/*__CORE__*/` is replaced by `core.js`, the exact arithmetic core.
- `/*__REF__*/` is replaced by `ref_output.txt`.
- `/*__SHARED_A__*/`, `/*__SHARED_UI__*/`, `/*__SHARED_VERIFY__*/` and `/*__CSS__*/` are filled from blocks of Part 1.
- `/*__P2:name__*/` is filled from named segments of Part 2.

`ref_output.txt` is the output of `reference/verify_galactic_hierarchy.py` (standard library only), which Part 1's verification panel reproduces line by line.

## Browser tests

The `tests/` scripts drive the built pages in headless Chromium with Playwright. They expect:
- the repository served at `http://localhost:8766/` (`python3 -m http.server 8766` from the repository root);
- `SP` set to a folder holding local copies of the CDN libraries the sandbox blocks:
  - `t158/package/build/three.min.js` (three r158)
  - `node_modules/katex/dist/` (KaTeX 0.16.9)
  - `tw/package/dist/index.global.js` (Tailwind browser build, for `fp.cjs`)

Screenshots go to `$SP/galactic/v2/`.

| Test | Checks |
| --- | --- |
| `all.cjs` | Part 1 and Part 2: verification (19/19, 66/66 lines), lemma rows, guide pages |
| `exp.cjs` | The manual's experiments on Part 2 |
| `conv.cjs`, `clutch.cjs` | Convergence calculator: presets, memory, the clutch modes |
| `zp.cjs`, `zp2.cjs`, `zp3.cjs` | Zero-Point Tri-Engine: self-test, pairing at n = 0, register closure per clutch mode, opens paused |
| `tqf.cjs`, `idx.cjs` | Engine v10: TQF off by default and following the inspected phase |
| `bar.cjs` | The site bar on every page: menus, current page, links, keyboard, phone width |
| `man.cjs` | Manual pages |
| `fp.cjs` | Fractal Processing hub and the Geometric Engine of Time explainer |
