# Builds the Galactic Lensing pages and the Zero-Point Tri-Engine from the templates in this folder.
#   python3 scripts/geometric-build/build.py      then   node scripts/install-page-chrome.mjs
# page.html -> Part 1, page2.html -> Part 2, page3.html -> Tri-Engine Convergence, and gen4.py turns
# page3.html (+ gen4_body.html) into page4.html -> Zero-Point Tri-Engine. Shared blocks are spliced in below.
# The exact code the pages share lives in orbital_core.js: every template is expanded (orbital_segments.expand)
# before it is read, and the core fills /*__CORE__*/.
import json, os, runpy, sys
d = os.path.dirname(os.path.abspath(__file__)) + '/'
sys.path.insert(0, d)
from orbital_segments import segments, expand, core as core_text
SEG = segments()
def src(name):
    return expand(open(d + name).read(), SEG)
root = os.path.normpath(d + '../..') + '/'
out = root + 'Pages/Geometric Calculator/Galactic Lensing/'
runpy.run_path(d + 'gen4.py')
p1 = src('page.html'); core = core_text(SEG)
ref = json.dumps(open(d + 'ref_output.txt').read().rstrip('\n').split('\n'), ensure_ascii=False)
BAR = '// =====================================================================\n'
def block(src, start, end):
    a = src.index(BAR + start); b = src.index(BAR + end, a)
    return src[a:b]
shared = {
    '/*__SHARED_A__*/': block(p1, '// Engine v10 structures', '// State and clock'),
    '/*__SHARED_UI__*/': block(p1, '// UI helpers', '// Panel B dashboard'),
    '/*__SHARED_VERIFY__*/': block(p1, '// Run Verification', '// Main loop'),
    '/*__CSS__*/': p1[p1.index('<style>\n') + 8:p1.index('</style>')],
}
def finish(s):
    s = s.replace('/*__CORE__*/', core).replace('/*__REF__*/', ref)
    assert '/*__ORB:' not in s and '/*__CORE__*/' not in s, 'unexpanded placeholder'
    return s
open(out + 'galactic_lensing_hierarchy.html', 'w').write(finish(p1))
p2 = src('page2.html')
for k, v in shared.items():
    assert p2.count(k) == 1, k
    p2 = p2.replace(k, v)
open(out + 'tri_engine_soliton.html', 'w').write(finish(p2))
# Part 2 reversed: Part 1's shared blocks plus named segments of the Part 2 template
p2src = src('page2.html')
SEGS = {'css2': ('/* ---- Part 2 additions ---- */', '</style>'), 'exact': ('// Exact integer maps', '// Per-system data-minus-model'),
        'omega': ('// Engine-frame loop: σ lifts', '// Soliton gauge (Proposition 7.14)'), 'ring': ('// §7.7 layer: ring order', 'function renderHud'),
        'static2': ('const C9 = (() => {', 'function renderLemmaRows2'), 'three': ('let three = null, crystal = null;', 'function initThree() {'),
        'engines': ('function resizeR', '// Display position of the class-c node'), 'gauge': ('// Saturated display vector of the gauge', BAR + '// Panel B: the soliton crystal'),
        'crystal': ('const PHI = (1 + Math.sqrt(5)) / 2, U20 = 20;', '// Particle flow: the crystal file advances'), 'boot': ('// Three.js r158 comes from cdnjs', '</script>')}
def splice(name):
    p = src(name)
    for k, (a, b2) in SEGS.items():
        assert p2src.count(a) == 1, k
        i = p2src.index(a); j = p2src.index(b2, i)
        p = p.replace('/*__P2:' + k + '__*/', p2src[i:j].rstrip() + '\n')
    for k, v in shared.items():
        if k == '/*__SHARED_VERIFY__*/': continue
        assert p.count(k) == 1, (name, k)
        p = p.replace(k, v)
    assert '/*__P2:' not in p, name
    return finish(p)
p3 = splice('page3.html')
open(out + 'tri_engine_convergence.html', 'w').write(p3)
# Zero-point tri-engine: the convergence calculator at frame resolution inside the 720-frame register
zp = root + 'Pages/Geometric Calculator/Zero Point Calculations/'
os.makedirs(zp, exist_ok=True)
p4 = splice('page4.html')
open(zp + 'zero_point_tri_engine.html', 'w').write(p4)
print('built', len(p1), len(p2), len(p3), len(p4))
