# Research archive

Everything published from the **Article Studio** and **Publication Studio** (Control Panel → Admin)
is committed here, so the repository holds a complete, readable copy of all articles and publications.

```
content/
  articles/
    index.json                  # manifest: every archived article (id, slug, title, date, status, path, …)
    2026/
      my-article-slug/
        index.md                # front matter (title, date, tags, cross-post links, …) + Markdown body
        media/figure-1.png      # images uploaded while writing
        cover.jpg
  publications/
    index.json
    2026/
      my-paper-slug/
        index.md                # front matter (authors, venue, DOI, abstract, …) + full text
        paper.pdf
```

- Front matter values are JSON (valid YAML), so the files are easy to read with any tool.
- `status` in the manifest is `published`, `draft` (unpublished after publishing) or `withdrawn` (deleted from the site; the file is kept).
- Pieces are served at `Pages/Research/read.html?kind=articles&slug=…` (or `kind=publications`). The reader uses
  Firestore and falls back to these files, so the archive alone is enough to display everything.
