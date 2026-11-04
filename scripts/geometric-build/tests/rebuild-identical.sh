#!/usr/bin/env bash
# Rebuilds the four orbital pages from the templates and orbital_core.js, reinstalls the site bar, and fails if any
# built page differs from the committed one.
#   bash scripts/geometric-build/tests/rebuild-identical.sh
# Use it after a change that must not alter the pages (a refactor of the templates or of orbital_core.js). After a
# change that should alter them, run it to see which pages moved, then commit the rebuilt pages.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
python3 scripts/geometric-build/build.py > /dev/null
node scripts/install-page-chrome.mjs > /dev/null
rm -f scripts/geometric-build/page4.html
PAGES=(
  "Pages/Geometric Calculator/Galactic Lensing/galactic_lensing_hierarchy.html"
  "Pages/Geometric Calculator/Galactic Lensing/tri_engine_soliton.html"
  "Pages/Geometric Calculator/Galactic Lensing/tri_engine_convergence.html"
  "Pages/Geometric Calculator/Zero Point Calculations/zero_point_tri_engine.html"
)
if git diff --quiet -- "${PAGES[@]}"; then
  echo "the four built pages are byte-identical to the committed ones"
else
  git diff --stat -- "${PAGES[@]}"
  echo "the rebuild changed the pages above"
  exit 1
fi
