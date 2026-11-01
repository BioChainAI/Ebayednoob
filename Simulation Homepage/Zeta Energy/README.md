# Zeta Energy simulation collection

Open `index.html` for the collection, or use its entry in
`../Simulation Homepage Learning Hub.html`.

## Layout

```text
Zeta Energy/
  index.html                         # Collection and iteration directory
  README.md                          # Organization and upload checklist
  iterations/
    2026i-torsional-pump/
      index.html                     # This iteration's overview and guide links
      simulation.html                # Original standalone simulation upload
      README.md                      # Upload provenance and iteration notes
      explainers/
        README.md                    # Where to add guides for this iteration
```

## Adding another iteration

1. Create a new folder under `iterations/` with a stable, lowercase, hyphenated
   identifier, such as `<edition>-<variant>`. If an edition has several uploads,
   give each its own descriptive suffix. Do not overwrite an earlier upload.
2. Save its standalone HTML as `simulation.html`. Keep the uploaded simulation
   intact; put any accompanying resources inside the same iteration folder and
   preserve the relative paths it expects.
3. Add an `index.html` overview with its edition, title, a short description,
   a simulation link, a link back to `../../index.html`, and an explainers section.
   Record the original filename, source checksum, and meaningful differences
   from other iterations in that iteration's `README.md`. Edition labels are
   identifiers, not inferred upload dates or proof of validation.
4. Add guides to that iteration's `explainers/` folder using descriptive names
   such as `clock-and-sequencer.html` or `torsional-pump.html`. Identify the exact
   edition in each guide and link back to `../index.html` and `../simulation.html`.
   Put explainer images and other resources in `explainers/assets/` when needed.
5. Add a card to the collection's `index.html`. Link published explainers from
   the iteration overview; show a plain status message until guides exist.
   Do not link to nonexistent placeholder HTML pages. Keep older iteration URLs
   stable so guides and comparisons remain reproducible.
6. Serve the repository root with `python3 -m http.server 8766` and check the
   collection, overview, simulation, and guide links. Smoke-test the uploaded
   simulation's controls and inspect browser errors before describing it as tested.

The main Simulation Homepage entry points to this collection, so subsequent
uploads only need a new iteration folder and an entry here. No build step,
account, or database is needed for the collection and overview pages.

The 2026i upload uses external Tailwind, Three.js r128, OrbitControls, Chart.js,
and KaTeX scripts/styles. Those dependencies belong to the uploaded simulation;
the collection and overview pages use local CSS only.
