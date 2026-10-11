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

## Article sync (Articles tab)

Configured under **Control Panel → Articles: sources** (stored in `settings/articleSync`). Each source is a page or
feed URL; the platform is detected from the URL and can be changed.

- **Substack / Medium:** any URL on the publication (even the writer dashboard) is read through its public RSS feed.
- **LinkedIn / X:** their article lists are only shown to signed-in visitors, so automatic reading is best-effort.
  If a source shows a red dot, either paste a **feed URL override** (an RSS/Atom feed for that profile, e.g. from
  an RSS bridge service) or add the LinkedIn articles by hand under **Articles**. The **Fetch details** button in
  the article editor fills in the title, summary, image and date from a public LinkedIn article URL.
- **Combining cross-posts:** links you set by hand always win. Otherwise posts are combined when one links to the
  other (for example "originally published on LinkedIn") or when their titles match closely and they were
  published within the configured number of days. Two different posts from the same site are never combined.
  LinkedIn is always the main link; other sites become "Also read on" buttons.
- **LinkedIn only** (on by default): articles with no LinkedIn version are not listed. **Test sync** shows them
  under "Not shown" with a **Save as article** button so you can attach the LinkedIn URL.
- The daily workflow writes `Pages/Research/data/articles-feed.json` and keeps every post it has ever seen.
  Visitors can press **Check for new articles** for a live check.

## Accounts, usernames and Guest Observers

- **Members** (Google or email sign-in) choose a username the first time they open the Control Panel. Usernames
  are unique (reserved in `usernames/{lowercased}`) and can change once every 7 days; `firestore.rules` enforce
  both, using the server clock. The Profile page shows a live countdown to the next allowed change.
- **Guest Observers** pick a username without signing in. It is stored only in that browser (localStorage) and
  checked against member usernames, but not reserved. Guests never get admin features.
- **Session & sync** shows what Google, Firebase Authentication and Firestore report for the session, why it
  is or isn't an admin, and a **Sync now** button that refreshes everything from the Google account.

### If your Google account shows as "Member" instead of "Administrator"
Open **Session & sync**. If "Token email" is empty, Firebase is set to allow multiple accounts per email, so
Google sessions carry no email for the rules to check. Either switch Authentication → Settings → **User account
linking** to "Link accounts that use the same email" and sign in again, or add your UID (shown on that page) to
`ownerUids()` in `firestore.rules` and `BOOTSTRAP_ADMIN_UIDS` in `assets/js/firebase.js`. The rules also
accept the email Google supplies in the token's identities, which covers most such sessions.

## Article Studio & Publication Studio (admins)

Linked from the admin section of the Control Panel (`control-panel/article-studio.html`,
`control-panel/publication-studio.html`). Write in Markdown with a formatting toolbar, live preview and
`$math$` (KaTeX); drafts autosave to Firestore. **Publish** puts the piece on the site
(`Pages/Research/read.html?kind=…&slug=…`) and, when GitHub is connected, commits it to `content/` (see
`content/README.md`), building a permanent archive in the repository. The archive sidebar lists every draft and
published piece; **Archive all published to GitHub** backfills anything not yet committed.

GitHub connection: in a Studio press **GitHub** and paste a fine-grained personal access token limited to this
repository with **Contents: Read and write** (add **Actions: Read and write** to start the article sync from the
Control Panel). The token stays in that browser only.

Cross-posting: the Studio copies the piece with formatting for LinkedIn, Substack, X Articles and Medium, opens
their editors, and records the resulting URLs so the Articles page shows one entry with "Also read on" buttons.

## Users, admins and the admin log

**Control Panel → Users & admins** lists every account that has signed in (username, name, email, sign-in
method, joined, last login, role) with search and an All / Admins / Members filter. **Make admin** and
**Revoke admin** ask for an optional note, then write two records in one batch:

- `admins/{email}`: the grant, with `active: true/false`. Grants are never deleted, so a revoked admin stays
  visible as "Revoked".
- `adminLog/{id}`: an append-only entry (grant / revoke / owner recorded, account, acting admin, note, time).

The rules refuse a grant or revoke without its matching new log entry, stamp each entry with the server time and
the acting admin's own email, and forbid editing or deleting entries. The log shows on the same screen and can be
downloaded as CSV. Guest Observers exist only in visitors' browsers, so they are not listed.
