# Geometric Calculator build sources

The Galactic Lensing pages and the Zero-Point Tri-Engine are generated from the templates in this folder.
Edit the templates or `orbital_core.js` here, never the built pages, then rebuild:

```bash
python3 scripts/geometric-build/build.py
node scripts/install-page-chrome.mjs
```

| Source | Builds |
| --- | --- |
| `page.html` + `orbital_core.js` + `ref_output.txt` | `Pages/Geometric Calculator/Galactic Lensing/galactic_lensing_hierarchy.html` (Part 1) |
| `page2.html` (+ shared blocks of `page.html`) | `Galactic Lensing/tri_engine_soliton.html` (Part 2) |
| `page3.html` (+ segments of `page2.html`) | `Galactic Lensing/tri_engine_convergence.html` |
| `gen4.py` turns `page3.html` + `gen4_body.html` into `page4.html` | `Zero Point Calculations/zero_point_tri_engine.html` |

`build.py` runs `gen4.py` first. `page4.html` is an intermediate file and is not committed.

## The orbital core

`orbital_core.js` holds the exact code the four pages share, once: the exact core (rationals, quaternions, the
Cayley map, Python's Mersenne Twister, Part 1's physics and the port of `verify_galactic_hierarchy.py`, which used
to be `core.js`), engine v10's tiers, Layer B's helpers, the Fifteen-Lemma layer (SHA-256, the 64-bit Einstein tile,
data and frame-leg packets, Hurwitz Form 1, the Lemma 15 Merkle chain), Part 2's exact frames, nodes and Triple-Quad
Formula, the convergence gauge, readout, memory word, rebuild and locate, and the Zero-Point pump.

It is two things at once:

- **The source of the pages.** Each piece is a segment between `// @orbital-begin name` and `// @orbital-end name`.
  In a template, `/*__ORB:name__*/` marks where the segment goes, and `orbital_segments.py` writes it back
  before `build.py` or `gen4.py` reads the template. The built pages are byte for byte what they were before the
  code moved here (`tests/rebuild-identical.sh` checks that).
- **A module.** It is UMD: `window.OrbitalCore` in a browser, `require()` in Node. Other systems use the code the
  pages run rather than a copy. `Pages/Engram Minds Eye` is the first.

To change shared code, edit the text inside its segment and rebuild: every page that uses it changes. Code outside
the segments exists only in the module (the wrapper, a neutral `state` with no tension or torsion and κ = 1, and
the export list). `gen4.py` still patches the `readout` segment for the Zero-Point page (the pairing node k).

Placeholders in the templates:
- `/*__CORE__*/` is replaced by the `core` segment of `orbital_core.js`.
- `/*__ORB:name__*/` is replaced by the segment `name` of `orbital_core.js`.
- `/*__REF__*/` is replaced by `ref_output.txt`.
- `/*__SHARED_A__*/`, `/*__SHARED_UI__*/`, `/*__SHARED_VERIFY__*/` and `/*__CSS__*/` are filled from blocks of Part 1.
- `/*__P2:name__*/` is filled from named segments of Part 2.

`ref_output.txt` is the output of `reference/verify_galactic_hierarchy.py` (standard library only), which Part 1's
verification panel reproduces line by line.

## Tests without a browser

| Test | Checks |
| --- | --- |
| `node tests/orbital-core.cjs` | The module on its own: every export defined, segments and placeholders agree, `runVerification()` reproduces `ref_output.txt` (66/66 lines), SHA-256, tiles, Hurwitz Form 1, the memory word's locate and rebuild, the gauge and the lock, the pump, the tier laws. Exit code 0 when all pass |
| `bash tests/rebuild-identical.sh` | Rebuilds the four pages and reinstalls the site bar; fails if any built page differs from the committed one |

## Browser tests

The other `tests/` scripts drive the built pages in headless Chromium with Playwright. They print what they see;
read the output for failures (`errs`, `fails`, the verification and self-test summaries). They expect:
- the repository served at `http://localhost:8766/` (`python3 -m http.server 8766` from the repository root);
- `SP` set to a folder holding local copies of the CDN libraries the sandbox blocks:
  - `t158/package/build/three.min.js` (three r158, `npm pack three@0.158.0`)
  - `three128/node_modules/three/build/three.min.js` (three r128, for `tqf.cjs` and `idx.cjs`)
  - `node_modules/katex/dist/` (KaTeX 0.16.9)
  - `tw/package/dist/index.global.js` (Tailwind browser build, for `fp.cjs`)

Screenshots go to `$SP/galactic/v2/`.

| Test | Checks |
| --- | --- |
| `all.cjs` | Part 1 and Part 2: verification (19/19, 66/66 lines), lemma rows, guide pages |
| `exp.cjs` | The manual's experiments on Part 2 |
| `conv.cjs`, `clutch.cjs` | Convergence calculator: presets, memory, the clutch modes |
| `zp.cjs`, `zp2.cjs`, `zp3.cjs` | Zero-Point Tri-Engine: self-test, pairing at n = 0, register closure per clutch mode, opens paused |
| `tqf.cjs`, `idx.cjs` | Engine v10: TQF off by default and following the inspected phase (`idx.cjs` also needs Three's OrbitControls from jsdelivr) |
| `bar.cjs` | The site bar on every page: menus, current page, links, keyboard, phone width |
| `man.cjs` | Manual pages |
| `fp.cjs` | Fractal Processing hub and the Geometric Engine of Time explainer |
