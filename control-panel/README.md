# Control Panel & Research Hub

| Path | What it is |
| --- | --- |
| `control-panel/` | Sign-in (Google or email/password), user account area, admin tools |
| `Pages/Research/` | Research hub: Publications, Stay Current feed, Articles (each with its own archive) |
| `assets/js/` | Shared modules: Firebase setup, feed engine, data layer, collection browser |
| `firestore.rules` | Security rules: **the real admin enforcement** |
| `scripts/update-research-feed.mjs` + `.github/workflows/update-research-feed.yml` | Daily Stay Current snapshot |

## One-time setup

1. **Deploy the Firestore rules.** Firebase console → Firestore Database → Rules → paste `firestore.rules` → Publish
   (or `firebase deploy --only firestore:rules`). Until you do, admin writes fail with "Missing or insufficient permissions".
2. **Authentication → Sign-in method:** Google is already on; enable Email/Password if you want email accounts.
3. **Authentication → Settings → Authorized domains:** make sure your GitHub Pages domain is listed.
4. Sign in at `control-panel/` with `ghoard1@gmail.com` (Google). That account is the bootstrap admin (hard-coded in
   `firestore.rules` and `assets/js/firebase.js`). Grant more admins under **Users & admins**.
5. Run **Actions → Update research feed → Run workflow** once to create the first snapshot. It then runs daily.

## Data model (Firestore)

- `publications/{id}`: title, date, type, authors[], venue, abstract, tags[], url, pdfUrl, doi, status
- `articles/{id}`: title, date, linkedinUrl, summary, tags[], coverImage, crossposts {x, medium, substack, patreon}, status
- `feedItems/{id}`: curated Stay Current items: title, url, date, sourceName, sourceUrl, summary, topics[], pinned, status
- `settings/feedConfig`: Stay Current automation (topics/keywords, sources/RSS feeds, parameters)
- `admins/{lowercased email}`: admin grants
- `users/{uid}`: profile, last login, `preferences.feedTopics`

`status` is `published` or `draft`; drafts are visible only to admins. Until a collection has a published document,
the hub falls back to `Pages/Research/data/*.json`.

## How Stay Current works

Sources: arXiv API, OpenAlex, Europe PMC (searched with your topic keywords) and any RSS/Atom feeds you add.
The daily workflow scans server-side and commits `Pages/Research/data/feed.json` and `feed-archive.json`.
**Refresh feed** on the page runs the same scan live in the visitor's browser; sources that block browser
requests go through the CORS proxy configured under Feed: automation.
If `main` is branch-protected, allow `github-actions[bot]` to push or the snapshot commit will fail.
