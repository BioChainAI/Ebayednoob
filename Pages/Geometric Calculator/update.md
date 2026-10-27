# Updating the Geometric Harmonics Calculator

The calculator is a single file: **`Pages/Geometric Calculator/index.html`**. It's your export with one
small snippet at the end that loads the floating bar. The bar holds a Home button, three dropdowns
(**Simulations**, **Calculations** and **Manuals**, listing every page below), Google sign-in shared with the main site, a
**social** button that unfolds the GitHub / X / YouTube / Patreon links only when pressed, and the hide
toggle. The bar itself lives in [`assets/js/page-chrome.js`](../../assets/js/page-chrome.js), never in
the calculator file.

Every page below carries the same three dropdowns, and the current page is marked in its menu:

| Dropdown | File | Page |
| --- | --- | --- |
| Simulations | `index.html` | The engine (v10) |
| Simulations | `numogram.html` | Engine / Numogram correspondence: three panels on one clock, with in-page verification |
| Simulations | `Galactic Lensing/galactic_lensing_hierarchy.html` | Galactic Lensing Hierarchy Part 1: Sgr A* systems I–III, residual parity, frame closure and lensing, with a line-by-line port of `verify_galactic_hierarchy.py` and live checks against the Fifteen Lemmas |
| Simulations | `Galactic Lensing/tri_engine_soliton.html` | Part 2: three active engines, cross-engine TQF and the soliton crystal |
| Calculations | `Galactic Lensing/tri_engine_convergence.html` | Tri-Engine Convergence: Part 2 run in reverse. Three exact calculations, one per engine, scheduled asynchronously on one clock, converging into a triple quad with an automatic TQF readout and memory on the outer and inner manifolds |
| Calculations | `Zero Point Calculations/zero_point_tri_engine.html` | Zero-Point Tri-Engine: the convergence calculator on the zero-point eight-step cycle. Every frame of the 720-frame register is one step (k = F mod 8, branch j = F mod 3, joint frame n = F mod 24); each engine carries one instruction per joint cycle, onloaded at its k = 2 frame and offloaded twelve frames later at k = 6; results pair at the zero point and each register closes with the 720 → 72 → 10 pump and the memory test |
| Calculations | `index.html` | The engine's own exact calculator (its Terminal tab) |
| Manuals | `manual.html` | Engine instruction manual & explainer |
| Manuals | `tracer.html` | Calculation Tracer: trace mechanics, rational trig and the computational bypasses |
| Manuals | `Galactic Lensing/galactic_companion.html` | Companion guide: from one engine to the triple quad, lemma by lemma, and Part 2 |
| Manuals | `Galactic Lensing/tri_engine_manual.html` | Tri-Engine Soliton operating manual: every control and panel of Part 2, experiments, troubleshooting |

The menus are defined once, in the `menus` section of
[`scripts/page-chrome-targets.json`](../../scripts/page-chrome-targets.json). To add a page to a dropdown,
add an item there (`file` is the path from the repository root; `note` is the grey second line and
`section` the heading it sits under) and, if the page should carry the bar too, add it to `pages`.

To update the tracer, upload the new version over `tracer.html` (keep the name); the bar is added the same way.

Two files only redirect to `index.html`: `calculator.html` (the old address) and `shd_ccp_unified_engine.html`
(the engine's export name, which the tracer links to). Don't put new versions in either. The old addresses
`galactic_lensing_hierarchy.html` and `galactic_companion.html` in this folder redirect into `Galactic Lensing/`.

## Automatic (the usual way)

1. Rename your new export to `index.html`.
2. Upload it over `Pages/Geometric Calculator/index.html` on `main`, through GitHub's
   *Add file → Upload files* or a normal commit.

That's all. The Pages deploy (`.github/workflows/static.yml`) runs
`node scripts/install-page-chrome.mjs` before publishing. That script adds the snippet to every page
listed in `scripts/page-chrome-targets.json`, with the menu links rewritten relative to each page, so the
live site gets the bar even if your export doesn't have it. The copy stored in the repository stays exactly
as you uploaded it.

## Manual (when you want the snippet in the file itself)

Run the script from the repository root and copy the block it writes at the end of `index.html`
(between `<!-- page-chrome:start -->` and `<!-- page-chrome:end -->`):

```bash
node scripts/install-page-chrome.mjs           # every page in scripts/page-chrome-targets.json
node scripts/install-page-chrome.mjs --check   # report pages that are missing it or out of date (exit code 1)
```

Running it more than once is harmless. An existing snippet, including a bare
`page-chrome.js` script tag pasted by hand, is replaced, never duplicated. A minimal hand-written
snippet (Home, sign-in and the social button only) is:

```html
<!-- page-chrome:start -->
<script type="module" src="../../assets/js/page-chrome.js" data-position="top"></script>
<!-- page-chrome:end -->
```

## Options

- `data-position`: `top` (default, centred between the calculator's side panels), `bottom-left` or
  `bottom-right`. For automatic installs, set `position` on the page in `pages`.
- `data-home`: a different address for the Home button (default: the site's main page).
- `data-menus`: the dropdowns, as JSON:
  `[{"label":"Simulations","icon":"engine","items":[{"href":"index.html","label":"Engine","icon":"engine","note":"…","section":"…"}]}]`.
  For automatic installs, give the page `"menus": "<name of a set in menus>"` instead.
- `data-extras`: plain buttons after Home, as JSON, e.g.
  `[{"href":"manual.html","label":"Manual","icon":"book"}]`. (A single button can also be given as
  `data-extra-href`, `data-extra-label`, `data-extra-icon`.) For automatic installs, set `extra` on the page.
- Icons: `book`, `engine`, `trace`, `numogram`, `lensing`, `soliton` or `calc`.
- `data-compact="true"`: shows the bar's buttons as icons only, with their names on hover. The
  engine uses this so the bar fits between its two side panels. For automatic installs, set `"compact": true`.
- The social links are the `SOCIAL_LINKS` list at the top of `assets/js/page-chrome.js`. Change them
  there and every page using the bar picks the change up.

## Adding the bar to another page

Add the page to `pages` in `scripts/page-chrome-targets.json`:

```json
{
    "menus": { "geometric-calculator": [ "…the three dropdowns…" ] },
    "pages": [
        { "file": "Pages/Geometric Calculator/index.html", "position": "top", "compact": true, "menus": "geometric-calculator" },
        { "file": "Pages/Some Other Tool/index.html", "position": "bottom-right" }
    ]
}
```

The next deploy adds the bar. The script works out the right relative path to `page-chrome.js`, and to
every menu link, for each file.

## If the links don't show

- Make sure you're on `.../Pages/Geometric Calculator/index.html` (or the folder address), and that
  the latest *Deploy static content to Pages* run on the Actions tab succeeded.
- The bar may be hidden. Look for a small round **•••** button at the top centre and click it.
  Phones start with it hidden.
- The social links are inside the share-icon button after the Manuals dropdown.
- Hard-refresh the page (Ctrl/Cmd + Shift + R). GitHub Pages can serve a cached copy for a few minutes.

## Keeping the manual current

`manual.html` is written for engine version 10. When a new version adds, renames or removes a control,
update the matching chapter. The interactive labs in the manual (exact-vs-float, clutch, engram tile) copy
the engine's formulas, so if the arithmetic, the clutch formulas or the engram hash change, update the
script at the bottom of `manual.html` too.

`Galactic Lensing/tri_engine_manual.html` documents Part 2's controls, panels and expected experiment
results. If a control is added, renamed or changes its range or default in `tri_engine_soliton.html`,
update chapters 4, 7 and 14 of the manual, and the labs at its end if the clock, node or tile formulas change.

`Galactic Lensing/tri_engine_convergence.html` is built from the same source as Part 2 (its engines, crystal,
exact frames and tiles are Part 2's code), so a change to those parts of Part 2 reaches it on the next build.

`Zero Point Calculations/zero_point_tri_engine.html` is generated from the convergence calculator's source and built
the same way, so it carries the same Part 2 code. It adds the zero-point clock of *The Geometric Engine of Time*
(Table 4, Proposition 3.7 and Table 5): each engine is one 120° branch and moves one instruction per 24-frame joint
cycle, with onloads at joint frames 18, 10 and 2 and offloads twelve frames later. A register is frames
720(r − 1) + 1 … 720r; at frame 720r it closes, and the pump (Proposition 3.9) evaluates each engine's engaged
frames. With the clutch holding finished engines, a register in which a calculation ran closes with a residual
that its compensator H = P⁻¹ removes. In free-run or with the membrane, every engine turns all 720 frames and the
register closes with P = 1. The page's self-test (rows Z1–Z6) checks the eight-step clock, the a = 0 tetrahedron and
its null lifts, the joint schedule, the non-commutative pump on random rational frames, the cyclic holonomy and the
four-track clock. If the clock, the schedule or the pump changes, update those rows and the Table 5 constants
(`ON_PHASE`, `OFF_PHASE`) together.
