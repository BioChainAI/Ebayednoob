"""The sin / cos / tan audit: every transcendental call in Hyperbolic Oracles and the Geometric Calculator,
classified by what it is for, against the rational replacements of the operator specification (section 12.1,
eqs. 85-88).

    python3 scripts/trig-audit/audit.py        -> scripts/trig-audit/audit.json and a summary on stdout

Categories (a call gets the first that applies; specific overrides come first):
    replaced    a call removed in this audit (kept in the ledger from the change log, not found in the code)
    input       a real-valued input (a configured length, a measured angle) converted once to a rational, after
                which everything is exact: the replacement is in place downstream
    labelled    a terminal function that returns a float and marks the result as approximate
    float       the float search track, whose bits are fixed by the reference traces and the preregistered runs
    intrinsic   exp / log / softmax / random normals / schedules: no rational form exists, nor is one wanted
    check       a test, a live check or a parity line that measures something against the exact track
    model       the calculator engines' float model of the toroidal dynamics (Layers 2-3), whose exact checks run
                separately on rationals
    display     drawing, animation, labels and readouts
The redirect stubs and generated intermediates are skipped.
"""
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SYSTEMS = {'Hyperbolic Oracles': 'Pages/Hyperbolic Oracles', 'Geometric Calculator': 'Pages/Geometric Calculator'}
SKIP = ('Pages/Geometric Calculator/Hyperbolic PolyStep/', 'node_modules', '__pycache__', '/reference/results/', '/traces/')
CALL = re.compile(r'\b(?:Math|math|np|torch)\.(sin|cos|tan|asin|acos|atan2|atan|sinh|cosh|tanh|asinh|acosh|atanh|arccosh|arctanh|arccos|arctan2|arctan|exp|expm1|log1p|log2|log10|log)\(')

# (file suffix, substring of the line) -> (category, note). The most specific facts of the audit live here.
OVERRIDES = [
    ('hyperbolic_core.js', 'Math.tanh(length / 2)', 'input', 'the configured step radius r becomes the rational t = tanh(r/2) once; then cosh r = (1+t^2)/(1-t^2), sinh r = 2t/(1-t^2) exactly (eq. 85, hyperbolic form)'),
    ('step.py', 'math.tanh(length / 2)', 'input', 'as in the browser core: the step radius becomes the rational tanh(r/2) once'),
    ('decoder3d.js', 'Math.atanh(this.t', 'display', 'tau = ln 7 reported; the tree frames use cosh = 25/7, sinh = 24/7 from t = 3/4 exactly'),
    ('decode3d.py', 'math.atanh(float(self.t))', 'display', 'tau reported; frames are exact from t = 3/4'),
    ('hyperbolic_core.js', 'X.lorentz(y, yFloat', 'display', 'track C: the distance the snap moved a point, logged'),
    ('exact.py', 'math.acosh(max(1.0, -float(lorentz(y', 'display', 'track C: the distance the snap moved a point, logged'),
    ('hyperbolic_core.js', 'Math.ceil(Math.log(k * 3) / Math.log(4))', 'intrinsic', 'a set size 4^ceil(log4 3k) for the MAX-SAT generator (polystep\'s own rule)'),
    ('twin3d.js', '2 * Math.acos(Math.min(1, w))', 'display', 'the twist angle in radians for the sparkline; the twist itself is an exact quaternion and composes exactly'),
    ('frames3d.py', '2 * math.acos(min(1.0, w))', 'display', 'the twist angle in radians; exact quaternions carry the twist'),
    ('twin3d.js', 'const ang = (a, b, c)', 'check', 'F2 live check: a triangle\'s angles, to compare its area with the exact twist'),
    ('frames3d.py', 'math.acos(max(-1.0, min(1.0, _lor(u, v)', 'check', 'F2: the triangle area the exact twist is checked against'),
    ('problems.py', 'c, s = math.cos(a), math.sin(a)', 'float', 'version 1 B3 tree frames in float, fixed by the preregistered runs'),
    ('problems.py', 'math.cosh(t), math.sinh(t)', 'float', 'version 1 B3 tree frames in float, fixed by the preregistered runs'),
    ('hyperbolic_core.js', 'const rot3 = a', 'float', 'version 1 B3 tree frames in float, matching problems.py bit for bit'),
    ('hyperbolic_core.js', 'const boostX = t', 'float', 'version 1 B3 tree frames in float, matching problems.py bit for bit'),
    ('index.html', 'RationalMath', 'replaced', 'see the change log'),
    ('zero_point_tri_engine.html', "approx(name === 'sin'", 'labelled', 'terminal sin/cos return a float and mark it approximate'),
    ('tri_engine_convergence.html', "approx(name === 'sin'", 'labelled', 'terminal sin/cos return a float and mark it approximate'),
    ('.html', 'const axisAngle = (ax, ang)', 'input', 'a measured rotation (axis, angle) is turned into the rational Gibbs vector u = v/(1+w) by exactLeg, then the exact Cayley map (eq. 86)'),
    ('.html', 'exactLeg(axisAngle(', 'input', 'the sightline leg: measured angles to an exact rational rotation once (eq. 86)'),
    ('.html', 'Fraction.fromFloat(v, 30)', 'input', 'the sightline probe vector rationalised once; only its quadrance is tested'),
    ('.html', 'function legAngle(q)', 'display', 'the residual angle of an exact quaternion, for the closure readout'),
    ('.html', 'function gauss(seed)', 'intrinsic', 'random normals for the noise model (Box-Muller)'),
    ('.html', '4 * Math.asin(Math.min(1, Math.hypot(', 'display', 'an angle readout from an exact frame difference'),
    ('.html', 'ang = 2 * Math.acos(w)', 'display', 'an angle readout from an exact quaternion'),
    ('.html', 'Math.atan2(U0, ev.tau', 'display', 'lensing light-curve geometry for the plot'),
]
RULES = [
    ('check', re.compile(r'/tests?/|test_[a-z0-9_]+\.py$|parity[-\w]*\.(cjs|js)$|proofs\.js$')),
]
LINE_RULES = [
    ('display', re.compile(r'sp\.set|ctx\.|addEventListener\(\'wheel|THREE|Vector3|position\.set|pulseAnim|wallT')),
    ('intrinsic', re.compile(r'K\[p\]|k \+ f\[p\]|la = -Math\.log\(P\)|self\.total|gauss|normal\(|Box|softmax|sinkhorn|\blse\b|logsumexp|Schedule|random\(\)|rnd\(\)|\.log\(1 - u1\)|-2 \* Math\.log|-2 \* math\.log|exp\(-\(c|np\.exp\(-\(costs|epsilon|uniform\(math\.log')),
    ('model', re.compile(r'modRot|dphi|dphiOf|state\.tension|tension \* D2R|poleR|sAx|R9 \*|Math\.PI / 6\) \* Math\.tanh')),
    ('float', re.compile(r'H\.dist|expOrigin|logOrigin|np\.arccosh|np\.cosh|np\.sinh|Math\.acosh\(Math\.max\(1, row\[i\]\[0\]\)\)|arccosh\(np\.maximum')),
    ('display', re.compile(r'ctx\.|moveTo|lineTo|\.arc\(|fillRect|strokeRect|THREE|Vector3|position\.set|addScaledVector|multiplyScalar|lerp|el\(\'path|fillText|\bpx\b|\bpy\b|\bpz\b|rInterp|textR|cx2|C_CENTER|C_TRI|wallT|shimmer|spinSign|sp\.set|tier\.R|ch\.R|T\.R|K\.R|modRot|\bD \+ rr|buckle|poleR|push|dphi|tanh\(m / 2\)|R9|Math\.cos\(a\)\s*\*\s*r|angPhi|angTheta|waveTime|\brot\(|view|yaw|pitch|draw|svg|gap-plot|\bang\b|tension|torsion|Math\.PI / 6\) \* Math\.tanh|p\.pa\)|ty \* Math|p\.r \* Math')),
]


def classify(path, line, in_checks):
    for suf, sub, cat, note in OVERRIDES:
        if path.endswith(suf) and sub in line:
            return cat, note
    for cat, rx in RULES:
        if rx.search(path):
            return cat, ''
    if in_checks:
        return 'check', 'inside a live-check or parity function'
    for cat, rx in LINE_RULES:
        if rx.search(line):
            return cat, ''
    if path.endswith('.html') and '/explainers/' in path or path.endswith('tracer.html') or path.endswith('manual.html') or path.endswith('companion.html'):
        return 'display', 'an explainer\'s diagram or lab'
    if path.endswith(('fence.js', 'fence.py')):
        return 'intrinsic', 'portable float kernels and dataset generation (exp/log by fixed loops); verdicts are rational'
    if path.endswith('.html'):
        return 'display', 'page drawing or readout'
    return 'unclassified', ''


def scan():
    rows = []
    for system, base in SYSTEMS.items():
        for dp, dn, fn in os.walk(os.path.join(ROOT, base)):
            rel_dir = os.path.relpath(dp, ROOT).replace(os.sep, '/') + '/'
            if any(s in rel_dir for s in SKIP):
                continue
            for f in sorted(fn):
                if not f.endswith(('.js', '.py', '.html', '.cjs')):
                    continue
                rel = rel_dir + f
                with open(os.path.join(dp, f), encoding='utf-8', errors='ignore') as fh:
                    text = fh.read()
                text = re.sub(r'<!-- page-chrome:start -->.*?<!-- page-chrome:end -->', '', text, flags=re.S)
                depth, check_depth = 0, None
                for n, line in enumerate(text.split('\n'), 1):
                    if re.search(r'function (runChecks\w*|runParity\w*)|def test_', line):
                        check_depth = depth
                    depth += line.count('{') - line.count('}')
                    if check_depth is not None and depth <= check_depth and '}' in line:
                        check_depth = None
                    for m in CALL.finditer(line):
                        cat, note = classify(rel, line, check_depth is not None)
                        rows.append({'system': system, 'file': rel[len(base) + 1:], 'line': n, 'fn': m.group(1), 'category': cat, 'note': note,
                                     'code': line.strip()[:200]})
    return rows


CHANGES = [
    {'id': 'T1', 'system': 'Geometric Calculator', 'file': 'index.html', 'what': 'Keypad sin and cos',
     'before': "3-term Maclaurin polynomials a - a^3/6 + a^5/120 and 1 - a^2/2 + a^4/24, printed to 48 digits: sin(1) = 0.84166..., sin(pi) = 0.524, sin^2 + cos^2 = 0.290 at pi",
     'after': 'the rational half-angle substitution (eq. 85): reduce modulo 2 pi, t = tan(r/4) rational to 10^-60, cos(r/2) = (1-t^2)/(1+t^2), sin(r/2) = 2t/(1+t^2), then the double angle. sin^2 + cos^2 = 1 exactly; every printed digit correct (checked against 80-digit references)'},
    {'id': 'T2', 'system': 'Geometric Calculator', 'file': 'index.html', 'what': 'Keypad tan, and the keypad layout',
     'before': 'no tan; keypad rows sin cos sqrt ( ) / ^ 7 8 9 / ...; = spanned two cells',
     'after': 'tan = sin / cos, both rational; rows sin cos tan sqrt ^ / ( 7 8 9 / ... / ) 0 . + ='},
    {'id': 'T3', 'system': 'Geometric Calculator', 'file': 'index.html', 'what': 'Keypad pi',
     'before': 'pi to 21 digits (3.14159265358979323846)', 'after': 'pi to 64 digits, shared with the reduction, so sin(pi) = 0 and cos(pi) = -1 exactly'},
    {'id': 'T4', 'system': 'Hyperbolic Oracles', 'file': 'hyperbolic_core.js, reference/hpstep/exact.py', 'what': 'The exact Cayley map in 2D and 3D',
     'before': 'R = (I - A)(I + A)^-1 by Gauss-Jordan inversion over Q',
     'after': 'the closed rational rotation R = I + 2(A^2 - A)/(1 + Q) (eq. 86); identical Fractions, every trace regenerated byte for byte; 2.0x (2D) and 2.8x (3D) faster in the browser, 1.6x and 1.5x in Python. Dimensions above 3 keep the inverse'},
    {'id': 'T5', 'system': 'Hyperbolic Oracles', 'file': 'rational_trig.js, reference/hpstep/rational_trig.py', 'what': 'A kernel of eqs. 85-88',
     'before': 'not present as one module', 'after': 'half-angle cos, sin^2, tan^2 from a quadrance; the rotation Rot(u)x without square roots; the symmedian foot and Apollonius point; the ghost kernel Q_h = sinh^2 d; the exact Gibbs composition and the second-order drift sum, with live checks'},
    {'id': 'T6', 'system': 'Geometric Calculator', 'file': 'tracer.html', 'what': 'The Calculation Tracer\'s description of the keypad',
     'before': 'says the keypad evaluates 3-term BigInt Taylor polynomials', 'after': 'says the keypad uses the rational half-angle substitution; the 3-term polynomial stays in Lab 3 as the comparison it was built for'},
]

FINDINGS = [
    {'eq': '85', 'status': 'verified', 'text': 'cos = (1 - Q)/(1 + Q), sin^2 = 4Q/(1 + Q)^2 and tan^2 = 4Q/(1 - Q)^2 hold exactly for Q = tan^2(theta/2); tan^2 has its pole at Q = 1 (theta = pi/2).'},
    {'eq': '86', 'status': 'verified', 'text': 'Rot(u) is orthogonal with determinant 1 and fixes u, for every rational u. It is the Cayley map: (I - A)(I + A)^-1 with A = [u]x equals Rot(-u), so the project\'s Cayley rotations were already this replacement; the closed form now replaces the inverse.'},
    {'eq': '87', 'status': 'verified', 'text': 'With B = 0, C = 2C0: BF/FC = Q3/Q2 (the symmedian divides BC in the ratio of the squared sides) and (0, 2C0; xE, xF) = -1 exactly. xE needs Q2 != Q3 (an isosceles triangle has its Apollonius point at infinity).'},
    {'eq': '88 (Q_h)', 'status': 'verified', 'text': 'Q_h(p, r) = sinh^2 d(p, r) exactly: the bracket is -<G(p), G(r)> = cosh d. The 0.7 Claude fence already decides with this quantity, w = (b^2 - sigma)/sigma.'},
    {'eq': '88 (eps_net)', 'status': 'qualified', 'text': 'True to second order only, and only when the eps_i are tangent half-angle (Gibbs) vectors composed as R(eps1)R(eps2)R(eps3), eps3 acting first. With the opposite order the cross terms change sign (error 2e-3 at |eps| = 0.01, against 8e-6). For rotation vectors (angle x axis) the cross coefficient is 1/2. The exact rational replacement needs no truncation: R(a)R(b) = R((a + b + a x b)/(1 - a.b)). The coupler already composes exact quaternions, which is exact.'},
]


def main():
    rows = scan()
    summary = {}
    for r in rows:
        k = (r['system'], r['category'])
        summary[k] = summary.get(k, 0) + 1
    out = {'rows': rows, 'changes': CHANGES, 'findings': FINDINGS,
           'summary': [{'system': s, 'category': c, 'count': n} for (s, c), n in sorted(summary.items())]}
    with open(os.path.join(os.path.dirname(__file__), 'audit.json'), 'w') as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    for (s, c), n in sorted(summary.items()):
        print(f'{s:22s} {c:12s} {n}')
    un = [r for r in rows if r['category'] == 'unclassified']
    for r in un:
        print('UNCLASSIFIED', r['file'], r['line'], r['code'][:120])
    print(len(rows), 'calls')


if __name__ == '__main__':
    main()
