# Zeta Energy simulation collection

Open [the Zeta Energy collection](index.html), or use its entry in
`../Simulation Homepage Learning Hub.html`.

## 2026i Torsional Pump resources

| Resource | File |
| --- | --- |
| Iteration overview | [2026i overview](iterations/2026i-torsional-pump/index.html) |
| Simulation | [Geometric Engine & Torsional Markov Pump](iterations/2026i-torsional-pump/simulation.html) |
| Interactive explainer | [Mathematical Architecture & Interaction Mechanics Explorer](iterations/2026i-torsional-pump/explainers/mathematical-architecture.html) |
| Technical monograph (27 pages) | [Hoard 2026i — Fifteen Lemmas edition (PDF)](iterations/2026i-torsional-pump/documents/zeta_energy_system_technical_monograph_hoard_2026i_15_lemmas_edition.pdf) |
| Monograph source | [Matching LaTeX source (.tex)](iterations/2026i-torsional-pump/documents/zeta_energy_system_technical_monograph_hoard_2026i_15_lemmas_edition.tex) |

The simulation links directly to the explorer, PDF, and TeX source in its controls
panel. The explorer header links back to the simulation and overview, opens the
PDF, and downloads the TeX source. The collection and iteration overview link
these resources together. PDF links open in a new tab; TeX links offer a download.

Both monograph files retain their supplied filenames and bytes. The explorer's
placeholder references to `zeta_energy_system.html` and
`zeta_energy_system_monograph.tex` have been replaced by working links to the
actual installed resources. Those historical names also appear as descriptive
text inside the supplied monograph; the PDF and TeX are preserved as uploaded.
See the [iteration notes](iterations/2026i-torsional-pump/README.md) for provenance.

## Layout

```text
Zeta Energy/
  index.html                         # Collection and iteration directory
  collection.css                     # Styles for the collection and overview
  README.md                          # Organization and upload checklist
  iterations/
    2026i-torsional-pump/
      index.html                     # This iteration's overview and guide links
      simulation.html                # Simulation with companion-resource navigation
      README.md                      # Upload provenance and iteration notes
      explainers/
        mathematical-architecture.html # Uploaded interactive explorer
        README.md                    # Guide index and authoring conventions
      documents/
        zeta_energy_system_technical_monograph_hoard_2026i_15_lemmas_edition.pdf
        zeta_energy_system_technical_monograph_hoard_2026i_15_lemmas_edition.tex
```

## Adding another iteration

1. Create a new folder under `iterations/` with a stable, lowercase, hyphenated
   identifier, such as `<edition>-<variant>`. If an edition has several uploads,
   give each its own descriptive suffix. Do not overwrite an earlier upload.
2. Save its standalone HTML as `simulation.html`. Preserve its simulation logic;
   document any navigation additions in the iteration notes. Put accompanying
   resources inside the same iteration folder and preserve the relative paths
   it expects. Keep supplied PDF/TeX documents unchanged under `documents/`.
3. Add an `index.html` overview with its edition, title, a short description,
   a simulation link, a link back to `../../index.html`, and an explainers section.
   Record the original filename, source checksum, and meaningful differences
   from other iterations in that iteration's `README.md`. Edition labels are
   identifiers, not inferred upload dates or proof of validation.
4. Add guides to that iteration's `explainers/` folder using descriptive names
   such as `clock-and-sequencer.html` or `torsional-pump.html`. Identify the exact
   edition in each guide and link back to `../index.html` and `../simulation.html`.
   Put explainer images and other resources in `explainers/assets/` when needed.
   Link companion documents using their actual filenames under `../documents/`
   and add return links from the simulation to the explainer and documents.
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

The 2026i simulation uses external Tailwind, Three.js r128, OrbitControls,
Chart.js, and KaTeX scripts/styles. The explorer uses Tailwind, Google Fonts,
and KaTeX 0.16.9. The collection and overview pages use local CSS only.
