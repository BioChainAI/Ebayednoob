# Updating the Geometric Harmonics Calculator

The calculator is a single file: **`Pages/Geometric Calculator/index.html`**. It's your export with one
small snippet at the end that loads the floating bar (Home button, a **Manual** button, Google sign-in
shared with the main site, GitHub / X / YouTube / Patreon links, and the hide toggle). The bar itself lives
in [`assets/js/page-chrome.js`](../../assets/js/page-chrome.js), never in the calculator file.

The instruction manual is **`manual.html`** in the same folder. Its bar has an **Open Engine** button, so
the two pages link to each other.

`calculator.html` only redirects old links to `index.html`. Don't put new versions there.

## Automatic (the usual way)

1. Rename your new export to `index.html`.
2. Upload it over `Pages/Geometric Calculator/index.html` on `main`, through GitHub's
   *Add file → Upload files* or a normal commit.

That's all. The Pages deploy (`.github/workflows/static.yml`) runs
`node scripts/install-page-chrome.mjs` before publishing. That script adds the snippet to every page
listed in [`scripts/page-chrome-targets.json`](../../scripts/page-chrome-targets.json), so the live
site gets the bar even if your export doesn't have it. The copy stored in the repository stays exactly
as you uploaded it.

## Manual (when you want the snippet in the file itself)

Paste this just above the closing `</body>` tag of the new export:

```html
<!-- page-chrome:start -->
<script type="module" src="../../assets/js/page-chrome.js" data-position="top" data-extra-href="manual.html" data-extra-label="Manual" data-extra-icon="book"></script>
<!-- page-chrome:end -->
```

Or let the script do it from the repository root:

```bash
node scripts/install-page-chrome.mjs           # every page in scripts/page-chrome-targets.json
node scripts/install-page-chrome.mjs --check   # report pages that are missing it (exit code 1)
```

Running either more than once is harmless. An existing snippet, including a bare
`page-chrome.js` script tag pasted by hand, is replaced, never duplicated.

## Options

- `data-position`: `top` (default, centred between the calculator's side panels), `bottom-left` or
  `bottom-right`. For automatic installs, set `position` in `scripts/page-chrome-targets.json`.
- `data-home`: a different address for the Home button (default: the site's main page).
- `data-extra-href`, `data-extra-label`, `data-extra-icon` (`book` or `engine`): one extra button after
  Home. This is how the calculator links to its manual and the manual links back. For automatic installs,
  set `extra` in `scripts/page-chrome-targets.json`.
- The social links are the `SOCIAL_LINKS` list at the top of `assets/js/page-chrome.js`. Change them
  there and every page using the bar picks the change up.

## Adding the bar to another page

Add the page to `scripts/page-chrome-targets.json`:

```json
[
    {
        "file": "Pages/Geometric Calculator/index.html",
        "position": "top",
        "extra": { "href": "manual.html", "label": "Manual", "icon": "book" }
    },
    { "file": "Pages/Some Other Tool/index.html", "position": "bottom-right" }
]
```

The next deploy adds the bar. The script works out the right relative path to `page-chrome.js` for each file.

## If the links don't show

- Make sure you're on `.../Pages/Geometric Calculator/index.html` (or the folder address), and that
  the latest *Deploy static content to Pages* run on the Actions tab succeeded.
- The bar may be hidden. Look for a small round **•••** button at the top centre and click it.
  Phones start with it hidden.
- Hard-refresh the page (Ctrl/Cmd + Shift + R). GitHub Pages can serve a cached copy for a few minutes.

## Keeping the manual current

`manual.html` is written for engine version 10. When a new version adds, renames or removes a control,
update the matching chapter. The interactive labs in the manual (exact-vs-float, clutch, engram tile) copy
the engine's formulas, so if the arithmetic, the clutch formulas or the engram hash change, update the
script at the bottom of `manual.html` too.
