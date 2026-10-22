# Geometric Harmonics Calculator

| File | What it is |
| --- | --- |
| `index.html` | The page people open. A full-screen frame around the calculator, plus the site chrome. |
| `calculator.html` | The calculator exactly as exported. Nothing site-specific is added to it. |

The floating bar (Home button, Google sign-in, GitHub / X / YouTube / Patreon links, hide toggle) comes from
[`assets/js/page-chrome.js`](../../assets/js/page-chrome.js). It shares the main site's Firebase project and
local sign-in persistence, so someone signed in on the main page is already signed in here, and the other way round.

## Installing a new revision

Replace `calculator.html` with the new export (keep the file name). That's all: the shell page, sign-in and links
don't live in the calculator file, so they carry over unchanged.

## Adding the same chrome to another page

Add one line before `</body>`, with the path adjusted to where the page sits:

```html
<script type="module" src="../../assets/js/page-chrome.js" data-position="top"></script>
```

`data-position` can be `top` (default), `bottom-left` or `bottom-right`; `data-home` overrides the Home link.
The social links are the `SOCIAL_LINKS` list at the top of `page-chrome.js`.
