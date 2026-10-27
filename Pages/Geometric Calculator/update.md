# Updating the Geometric Harmonics Calculator

The calculator is a single file: **`Pages/Geometric Calculator/index.html`**. It's your export with one
small snippet at the end that loads the floating bar. The bar holds a Home button, two dropdowns
(**Simulations** and **Manuals**, listing every page below), Google sign-in shared with the main site, a
**social** button that unfolds the GitHub / X / YouTube / Patreon links only when pressed, and the hide
toggle. The bar itself lives in [`assets/js/page-chrome.js`](../../assets/js/page-chrome.js), never in
the calculator file.

Every page below carries the same two dropdowns, and the current page is marked in its menu:

| Dropdown | File | Page |
| --- | --- | --- |
| Simulations | `index.html` | The engine (v10) |
| Simulations | `numogram.html` | Engine / Numogram correspondence: three panels on one clock, with in-page verification |
| Simulations | `Galactic Lensing/galactic_lensing_hierarchy.html` | Galactic Lensing Hierarchy Part 1: Sgr A* systems I–III, residual parity, frame closure and lensing, with a line-by-line port of `verify_galactic_hierarchy.py` and live checks against the Fifteen Lemmas |
| Simulations | `Galactic Lensing/tri_engine_soliton.html` | Part 2: three active engines, cross-engine TQF and the soliton crystal |
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
- Icons: `book`, `engine`, `trace`, `numogram`, `lensing` or `soliton`.
- `data-compact="true"`: shows the bar's buttons as icons only, with their names on hover. The
  engine uses this so the bar fits between its two side panels. For automatic installs, set `"compact": true`.
- The social links are the `SOCIAL_LINKS` list at the top of `assets/js/page-chrome.js`. Change them
  there and every page using the bar picks the change up.

## Adding the bar to another page

Add the page to `pages` in `scripts/page-chrome-targets.json`:

```json
{
    "menus": { "geometric-calculator": [ "…the two dropdowns…" ] },
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
- The social links are inside the share-icon button next to the Manuals dropdown.
- Hard-refresh the page (Ctrl/Cmd + Shift + R). GitHub Pages can serve a cached copy for a few minutes.

## Keeping the manual current

`manual.html` is written for engine version 10. When a new version adds, renames or removes a control,
update the matching chapter. The interactive labs in the manual (exact-vs-float, clutch, engram tile) copy
the engine's formulas, so if the arithmetic, the clutch formulas or the engram hash change, update the
script at the bottom of `manual.html` too.

`Galactic Lensing/tri_engine_manual.html` documents Part 2's controls, panels and expected experiment
results. If a control is added, renamed or changes its range or default in `tri_engine_soliton.html`,
update chapters 4, 7 and 14 of the manual, and the labs at its end if the clock, node or tile formulas change.
