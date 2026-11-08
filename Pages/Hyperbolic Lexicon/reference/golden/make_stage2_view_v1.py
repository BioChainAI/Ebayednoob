#!/usr/bin/env python3
"""Hyperbolic Lexicon: the data of Explainer 15 ("The Lexical Claims, Decided", explainers/lexical.html) as a script
file a page loads without fetch, so file:// works: Stage 2's decisions, intervals, controls, tuning and the dry run's
sealed values, read from the committed record and nothing typed by hand.

    python3 -B -I "Pages/Hyperbolic Lexicon/reference/golden/make_stage2_view_v1.py"           write data/stage2_view_v1.js
    python3 -B -I "Pages/Hyperbolic Lexicon/reference/golden/make_stage2_view_v1.py" --check   rebuild in memory and compare
    python3 -B -I "Pages/Hyperbolic Lexicon/reference/golden/make_stage2_view_v1.py" --copy-sealed
        write the committed copies of the two opened sealed files from the cache (each refused unless its SHA-256 is
        the one named; gzip level 9, no name or time in the header), once, in step 8

It reads, and writes nothing but data/stage2_view_v1.js:
- reference/results/claims-stage2.json, the decisive record (run at 6b6ec09, committed in 5d32f47): every verdict,
  interval (with its row bootstrap where the record has one), control, arm value and run count below;
- reference/results/stage2-manifest.json: the decision files' line counts (A13.14's group, rebuilt from the record's
  wiring provenance by the runner's own rule, checked against the receipts' count and bytes);
- reference/results/tuning-stage2.json and reference/settings-stage2.json: the frozen rates, every eligible rate's
  mean, the preview of L14 on HiT val (Amendment 15 items 1 and 3) and tuning's three starts;
- reference/results/dry/claims-stage2.json, the visible record of the dry rerun (5acbbb7), which names the sealed
  file by its SHA-256;
- the two sealed files of the dry runs (A13.13; opened after step 7 and committed in step 8, A13.15, as gzip copies
  whose decompressed bytes are the sealed files): reference/results/dry/stage2-sealed/values-5acbbb7.json.gz (the
  rerun's, named by the visible dry record) and values-05d467d.json.gz (the first dry run's, named by Amendment 14).
  Each is refused unless the SHA-256 of its decompressed bytes is the one named; the view takes its dry values from
  the rerun's file and records whether the first file's claims are equal to them. The originals are in the cache
  (~/.cache/hyperbolic-lexicon/stage2/dry-sealed/values.json and dry-sealed-05d467d/values.json); --copy-sealed made
  the copies from them.
- PREREGISTRATION.md, only to find the first sealed file's SHA-256 in Amendment 14.

The data, as one JSON text: sources (each file with its SHA-256), run (the decisive run's counts), claims (per claim and
part: the record's verdict, the verdict before the controls, the registered rule's name and every cell's estimate and
interval, so a page can apply the rule again), controls, arms (the values behind the differences), tuning, dry,
predictions (the registered predictions' measurable parts, graded here by fixed tests stated beside each), and values:
{key: [display text, source id, path in that source]}, the text a page shows for each number, with where it comes from.

With --check it also reads explainers/lexical.html, when present, and refuses unless every element carrying
data-v="key" holds plain text equal to that key's display text (HTML entities decoded), and the panel's data-json-sha is
this JSON text's SHA-256: the page's numbers, as written, are the view's.

Before anything is written, and in --check, it refuses unless: every record is the kind expected (registered,
decisive; tuning registered; dry visible record dry); each sealed file has its named SHA-256; the decision files rebuilt
from the manifest match the receipts' count and bytes; every verdict the record states follows from its own cells by the
registered rule (A13; stats2's float64 reading); the JSON text is ASCII and reads back.

--check exits 0 equal, 1 different, 2 "skipped" when a committed sealed copy is missing. It reads committed files
only, so it needs no cache. Under a second.
"""
import gzip
import hashlib
import html
import json
import math
import os
import re
import sys
from fractions import Fraction

sys.set_int_max_str_digits(0)   # the record's exact APs and macro means are rationals of thousands of digits

HERE = os.path.dirname(os.path.abspath(__file__))
REFERENCE = os.path.dirname(HERE)
SYSTEM = os.path.dirname(REFERENCE)
RESULTS = os.path.join(REFERENCE, 'results')
CACHE = os.environ.get('HL_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'hyperbolic-lexicon')
CACHE_SEALED = os.path.join(CACHE, 'stage2', 'dry-sealed', 'values.json')
CACHE_SEALED_FIRST = os.path.join(CACHE, 'stage2', 'dry-sealed-05d467d', 'values.json')
OUT = os.path.join(SYSTEM, 'data', 'stage2_view_v1.js')
PAGE = os.path.join(SYSTEM, 'explainers', 'lexical.html')
NAME = 'stage2_view_v1'
MINUS = '−'
BAND = 0.02
SRC = {
    'rec': 'reference/results/claims-stage2.json',
    'man': 'reference/results/stage2-manifest.json',
    'tun': 'reference/results/tuning-stage2.json',
    'set': 'reference/settings-stage2.json',
    'dry': 'reference/results/dry/claims-stage2.json',
    'seal': 'reference/results/dry/stage2-sealed/values-5acbbb7.json.gz',
    'seal1': 'reference/results/dry/stage2-sealed/values-05d467d.json.gz',
}
SEALED = os.path.join(SYSTEM, SRC['seal'])
SEALED_FIRST = os.path.join(SYSTEM, SRC['seal1'])
ARMS6 = ('H3', 'H2', 'F3', 'F3*', 'F2', 'F2*')
A4 = ('H3-F3', 'H3-F3*', 'H2-F2', 'H2-F2*')


def refuse(msg):
    raise SystemExit(f'REFUSED: {msg}')


def sha_bytes(b):
    return hashlib.sha256(b).hexdigest()


def load(rel):
    path = os.path.join(SYSTEM, rel)
    data = open(path, 'rb').read()
    return json.loads(data), sha_bytes(data)


# ------------------------------------------------------------------ display text
def num(x, d=6):
    """x to d decimals, a minus sign for negatives."""
    s = format(float(x), f'.{d}f')
    return s.replace('-', MINUS)


def sgn(x, d=6):
    s = format(float(x), f'+.{d}f')
    return s.replace('-', MINUS)


def ci(iv, d=6):
    return f'{sgn(iv["est"], d)} [{sgn(iv["lo"], d)}, {sgn(iv["hi"], d)}]'


def ci_lohi(lo, hi, d=6):
    return f'[{sgn(lo, d)}, {sgn(hi, d)}]'


def comma(n):
    return f'{int(n):,}'


def frac(s):
    return Fraction(s)


# ------------------------------------------------------------------ the registered rules (stats2's float64 reading)
def above0(c):
    return c['lo'] > 0.0


def at_or_below0(c):
    return c['hi'] <= 0.0


def verdict(support, refute):
    if support and refute:
        return 'inconclusive'
    return 'supported' if support else 'refuted' if refute else 'inconclusive'


def rule_verdict(rule, cells):
    """The verdict of one part from its cells, by the rule A13 registered for it."""
    if rule == 'above0':                       # L12(a)-(c), L13, L15(b)
        return verdict(all(above0(c) for c in cells), any(at_or_below0(c) for c in cells))
    if rule == 'band':                         # L12(d): within [-0.02, +0.02], or entirely outside it
        return verdict(all(c['lo'] >= -BAND and c['hi'] <= BAND for c in cells),
                       any(c['lo'] > BAND or c['hi'] < -BAND for c in cells))
    if rule == 'gain':                         # L15(a): every hi <= +0.02; refuted if any lo > +0.02
        return verdict(all(c['hi'] <= BAND for c in cells), any(c['lo'] > BAND for c in cells))
    if rule == 'seeds':                        # L14: per cell, five seeds present with lo > 0; >= 3 means <= 0
        sub = []
        for c in cells:
            ss = c['seeds']
            sup = len(ss) == 5 and all(s['lo'] > 0.0 for s in ss)
            ref = sum(1 for s in ss if s['est'] <= 0.0) >= 3
            sub.append(verdict(sup, ref))
        return verdict(all(v == 'supported' for v in sub), any(v == 'refuted' for v in sub))
    raise ValueError(rule)


# ------------------------------------------------------------------ the build
class View:
    def __init__(self):
        self.values = {}

    def put(self, key, text, src, path):
        if key in self.values:
            refuse(f'value key {key!r} twice')
        if src not in SRC:
            refuse(f'unknown source {src!r}')
        self.values[key] = [text, src, path]
        return text


def cell(iv, name, row=None):
    out = {'name': name, 'est': iv['est'], 'lo': iv['lo'], 'hi': iv['hi']}
    rb = iv.get('row_bootstrap') if row is None else row
    if rb:
        out['rowLo'], out['rowHi'] = rb['lo'], rb['hi']
    return out


def rho_of(fm, fkey):
    f = fm.get(fkey)
    if f is None:
        refuse(f'files_metrics has no {fkey}')
    for name, _, m in f['metrics']:
        if name == 'rho':
            return m
    refuse(f'{fkey} has no rho')


def decision_lines(rec, man):
    """A13.14's decision files (run_claims_stage2.decision_files' rule) and their lines from the manifest."""
    files = man['files']
    exact = set()
    for p in rec['wiring']['provenance'].values():
        for fk in (p['x'], p['y']):
            if fk in files and fk.split('/')[-1] == '-':
                exact.add(fk)
    groups = {'exact': sorted(exact), 'hit_test': [], 'hl_at': []}
    for fk in sorted(files):
        inst, arm, form, _rule, table = fk.split('/')
        if arm == 'learned' and form == 'G' and table.startswith('measured-'):
            if inst == 'HIT-test-s21':
                groups['hit_test'].append(fk)
            elif inst == 'HL-at':
                groups['hl_at'].append(fk)
    rc = rec['receipts']['decision_code_files']
    for g, keys in groups.items():
        b = sum(files[k]['bytes'] for k in keys)
        if (len(keys), b) != (rc['parts'][g]['count'], rc['parts'][g]['bytes']):
            refuse(f'decision group {g}: {len(keys)} files, {b} B, not the receipts\' {rc["parts"][g]}')
    lines = {g: sum(files[k]['lines'] for k in keys) for g, keys in groups.items()}
    return {g: len(k) for g, k in groups.items()}, lines


def sealed_names(dry):
    """The SHA-256 of each sealed file, as named: the rerun's by the visible dry record, the first run's by Amendment
    14 (the only place it is named)."""
    prereg = open(os.path.join(SYSTEM, 'PREREGISTRATION.md'), encoding='utf-8').read()
    a14 = prereg[prereg.index('### Amendment 14'):prereg.index('### Amendment 15')]
    m = re.search(r'The sealed file \(SHA-256 `([0-9a-f]{64})`\) has not\s+been opened', a14)
    if not m:
        refuse('Amendment 14 does not name the first sealed file\'s SHA-256')
    return dry['sealed']['sha256'], m.group(1)


def copy_sealed():
    """Write the committed gzip copies of the two opened sealed files from the cache, each refused unless its SHA-256
    is the one named. Run once, in A13.15 step 8; the view then reads only the copies."""
    dry, _ = load(SRC['dry'])
    for (src, key), want in zip(((CACHE_SEALED, 'seal'), (CACHE_SEALED_FIRST, 'seal1')), sealed_names(dry)):
        data = open(src, 'rb').read()
        if sha_bytes(data) != want:
            refuse(f'{src}: SHA-256 {sha_bytes(data)} is not the named {want}')
        out = os.path.join(SYSTEM, SRC[key])
        os.makedirs(os.path.dirname(out), exist_ok=True)
        gz = gzip.compress(data, compresslevel=9, mtime=0)
        if gzip.decompress(gz) != data:
            refuse(f'{out}: the copy does not decompress to the sealed file')
        with open(out, 'wb') as f:
            f.write(gz)
        print(f'wrote {SRC[key]}: {len(gz)} B (gzip), the sealed file {len(data)} B, sha256 {want}')
    return 0


def build():
    V = View()
    rec, rec_sha = load(SRC['rec'])
    man, man_sha = load(SRC['man'])
    tun, tun_sha = load(SRC['tun'])
    settings, set_sha = load(SRC['set'])
    dry, dry_sha = load(SRC['dry'])
    if (rec.get('mode'), rec.get('step')) != ('registered', 'decisive'):
        refuse('results/claims-stage2.json is not the decisive registered record')
    if (tun.get('mode'), tun.get('step')) != ('registered', 'tune'):
        refuse('results/tuning-stage2.json is not registered tuning')
    if dry.get('mode') != 'dry' or 'sealed' not in dry:
        refuse('results/dry/claims-stage2.json is not the visible dry record')
    if rec['receipts']['manifest_sha256'] != man_sha:
        refuse('stage2-manifest.json is not the one the record names')
    if rec['preflight']['tuning_sha256'] != tun_sha or rec['preflight']['settings_sha256'] != set_sha:
        refuse('the tuning record or the settings are not the ones the decisive record names')
    if not (os.path.exists(SEALED) and os.path.exists(SEALED_FIRST)):
        return None
    named, named_first = sealed_names(dry)
    sealed_b = gzip.decompress(open(SEALED, 'rb').read())
    if sha_bytes(sealed_b) != named:
        refuse(f'{SRC["seal"]}: SHA-256 {sha_bytes(sealed_b)} (decompressed) is not the visible dry record\'s {named}')
    first_b = gzip.decompress(open(SEALED_FIRST, 'rb').read())
    if sha_bytes(first_b) != named_first:
        refuse(f'{SRC["seal1"]}: SHA-256 {sha_bytes(first_b)} (decompressed) is not Amendment 14\'s {named_first}')
    sealed = json.loads(sealed_b)
    first = json.loads(first_b)
    S = sealed['record']
    C = rec['claims']
    fm = {f['fkey']: f for f in rec['files_metrics']}

    sources = {
        'rec': {'file': SRC['rec'], 'sha256': rec_sha, 'head': rec['head'], 'label': rec['label']},
        'man': {'file': SRC['man'], 'sha256': man_sha},
        'tun': {'file': SRC['tun'], 'sha256': tun_sha, 'head': tun['head'], 'label': tun['label']},
        'set': {'file': SRC['set'], 'sha256': set_sha},
        'dry': {'file': SRC['dry'], 'sha256': dry_sha, 'head': dry['head'], 'label': dry['label']},
        'seal': {'file': SRC['seal'], 'sha256': sha_bytes(sealed_b), 'head': S['head'], 'label': S['label'],
                 'namedBy': SRC['dry'] + ' (sealed.sha256)', 'stored': 'gzip; sha256 is that of the decompressed file'},
        'seal1': {'file': SRC['seal1'], 'sha256': sha_bytes(first_b), 'head': first['record']['head'],
                  'namedBy': 'PREREGISTRATION.md, Amendment 14', 'stored': 'gzip; sha256 is that of the decompressed file'},
    }

    # ---------------------------------------------------------------- the run
    counts, lines = decision_lines(rec, man)
    conv = rec['convergence']
    run = {
        'head': rec['head'], 'label': rec['label'], 'started': rec['starts'][0]['time'], 'starts': len(rec['starts']),
        'totalSeconds': rec['timings']['total_s'], 'pass1Files': rec['pass1']['files'], 'pass1Lines': rec['pass1']['lines'],
        'lbench': rec['receipts']['lbench_records'], 'comparisons': rec['wiring']['comparisons'],
        'controlValues': rec['wiring']['control_values'], 'specEqualsA13': rec['wiring']['spec_equals_a13'],
        'converged': sum(1 for v in conv.values() if v['converged']), 'runs': len(conv),
        'replayEqual': rec['replay_check']['equal'], 'decisionFiles': counts, 'decisionLines': lines,
        'decisionBytes': rec['receipts']['decision_code_files']['bytes'],
        'snappedGzipBytes': rec['receipts']['measured_snapped_texts']['bytes_gzip'],
        'recomputed240': rec['pass1']['recomputed_240'], 'flags': rec['flags'],
    }
    V.put('run.started', run['started'].replace('T', ' ').replace('Z', ' UTC'), 'rec', 'starts[0].time')
    V.put('run.hours', format(run['totalSeconds'] / 3600, '.2f'), 'rec', 'timings.total_s / 3600')
    V.put('run.files', comma(run['pass1Files']), 'rec', 'pass1.files')
    V.put('run.lines', comma(run['pass1Lines']), 'rec', 'pass1.lines')
    V.put('run.lbench', comma(run['lbench']), 'rec', 'receipts.lbench_records')
    V.put('run.comparisons', str(run['comparisons']), 'rec', 'wiring.comparisons')
    V.put('run.comparisons.L14c3', str(sum(1 for k in rec['wiring']['provenance'] if k.startswith('L14/control3/'))), 'rec',
          'wiring.provenance (entries L14/control3/...)')
    V.put('run.controlValues', str(run['controlValues']), 'rec', 'wiring.control_values')
    V.put('run.converged', str(run['converged']), 'rec', 'convergence (converged)')
    V.put('run.runs', str(run['runs']), 'rec', 'convergence (entries)')
    V.put('run.decisionFiles', str(sum(counts.values())), 'rec', 'receipts.decision_code_files.count')
    for g in counts:
        V.put(f'run.decisionFiles.{g}', str(counts[g]), 'rec', f'receipts.decision_code_files.parts.{g}.count')
    V.put('run.decisionLines', comma(sum(lines.values())), 'man', 'files[decision files].lines, summed')
    V.put('run.decisionMB', format(run['decisionBytes'] / 1e6, '.1f'), 'rec', 'receipts.decision_code_files.bytes / 10^6')
    V.put('run.snapped', str(rec['receipts']['measured_snapped_texts']['count']), 'rec', 'receipts.measured_snapped_texts.count')
    V.put('run.snappedMB', format(run['snappedGzipBytes'] / 1e6, '.1f'), 'rec', 'receipts.measured_snapped_texts.bytes_gzip / 10^6')

    # ---------------------------------------------------------------- the claims, part by part
    claims = {}

    def part(cl, p, rule, cells, extra=None):
        P = C[cl]['parts'][p]
        mine = rule_verdict(rule, cells)
        if mine != P['verdict_before_controls']:
            refuse(f'{cl}({p}): the rule gives {mine}, the record {P["verdict_before_controls"]}')
        out = {'verdict': P['verdict'], 'beforeControls': P['verdict_before_controls'], 'rule': rule, 'cells': cells}
        if extra:
            out.update(extra)
        claims.setdefault(cl, {'void': C[cl]['void'], 'controls': C[cl]['controls']['fails_as_required'], 'parts': {}})
        claims[cl]['parts'][p] = out
        V.put(f'{cl}.{p}', P['verdict'], 'rec', f'claims.{cl}.parts.{p}.verdict')
        flat = [x for c in cells for x in (c['seeds'] if rule == 'seeds' else [c])]
        bar = BAND if rule == 'gain' else 0.0
        V.put(f'{cl}.{p}.cells', str(len(flat)), 'rec', f'claims.{cl}.parts.{p}.cells (intervals)')
        V.put(f'{cl}.{p}.above', str(sum(1 for x in flat if x['lo'] > bar)), 'rec',
              f'claims.{cl}.parts.{p}.cells (intervals with lo > {"+0.02" if rule == "gain" else "0"})')
        V.put(f'{cl}.{p}.minLo', sgn(min(x['lo'] for x in flat)), 'rec', f'claims.{cl}.parts.{p}.cells (least lo)')

    I12 = C['L12']['intervals']
    for p, names in (('a', A4), ('b', ('H3', 'H2')), ('c', ('H3', 'H2'))):
        cells = [cell(I12[p][k], k) for k in names]
        part('L12', p, 'above0', cells)
        for k in names:
            V.put(f'L12.{p}.{k}', ci(I12[p][k]), 'rec', f'claims.L12.intervals.{p}.{k}')
            rb = I12[p][k]['row_bootstrap']
            V.put(f'L12.{p}.{k}.row', ci_lohi(rb['lo'], rb['hi']), 'rec', f'claims.L12.intervals.{p}.{k}.row_bootstrap')
    d = I12['d']
    Pd = C['L12']['parts']['d']
    part('L12', 'd', 'band', [cell(d, 'H3-WN')], {'failingSide': Pd['failing_side'], 'flag': Pd['flag']})
    V.put('L12.d.H3-WN', ci(d), 'rec', 'claims.L12.intervals.d')
    V.put('L12.d.H3-WN.row', ci_lohi(d['row_bootstrap']['lo'], d['row_bootstrap']['hi']), 'rec',
          'claims.L12.intervals.d.row_bootstrap')
    V.put('L12.d.side', Pd['failing_side'], 'rec', 'claims.L12.parts.d.failing_side')
    V.put('L12.d.excess', num(Pd['failing_excess'][Pd['failing_side']]), 'rec', 'claims.L12.parts.d.failing_excess')
    V.put('L12.d.halfwidth', num((d['hi'] - d['lo']) / 2, 3), 'rec', 'claims.L12.intervals.d: (hi - lo)/2')
    V.put('L12.d.rowHalfwidth', num((d['row_bootstrap']['hi'] - d['row_bootstrap']['lo']) / 2, 3), 'rec',
          'claims.L12.intervals.d.row_bootstrap: (hi - lo)/2')
    V.put('L12.d.flag', Pd['flag'], 'rec', 'claims.L12.parts.d.flag')
    # the margin that decides "refuted": the whole interval below -0.02, i.e. its upper end
    V.put('L12.d.lo', sgn(d['lo']), 'rec', 'claims.L12.intervals.d.lo')
    V.put('L12.d.hi', sgn(d['hi']), 'rec', 'claims.L12.intervals.d.hi')
    V.put('L12.d.hiMargin', num(-BAND - d['hi']), 'rec', 'claims.L12.intervals.d: -0.02 - hi')
    strata = rec['reported']['L12']['type_strata_at_least_100']
    for k in ('hyp-1', 'hyp-2', 'hyp-3', 'hyp-4'):
        V.put(f'L12.strata.H3.{k}', num(strata[k]['H3']['float']), 'rec',
              f'reported.L12.type_strata_at_least_100.{k}.H3.float')
    V.put('L12.V', comma(d['V']), 'rec', 'claims.L12.intervals.d.V')
    V.put('L12.n', comma(d['n']), 'rec', 'claims.L12.intervals.d.n')

    I13 = C['L13']['intervals']['parts']
    for p in 'abc':
        cells = [cell(I13[p][k], k) for k in A4]
        part('L13', p, 'above0', cells)
        for k in A4:
            V.put(f'L13.{p}.{k}', ci(I13[p][k]), 'rec', f'claims.L13.intervals.parts.{p}.{k}')

    P14 = C['L14']['parts']
    cells_a = []
    for name in ('d2/random', 'd2/hard', 'd3/random', 'd3/hard'):
        ps = P14['a']['cells'][name]['per_seed']
        seeds = [{'s': int(s), 'est': v['est'], 'lo': v['lo'], 'hi': v['hi']} for s, v in sorted(ps.items(), key=lambda x: int(x[0]))]
        cells_a.append({'name': name, 'seeds': seeds, 'verdict': P14['a']['cells'][name]['verdict']})
        for sd in seeds:
            V.put(f'L14.a.{name}.s{sd["s"]}', ci(sd), 'rec', f'claims.L14.parts.a.cells.{name}.per_seed.{sd["s"]}')
        V.put(f'L14.a.{name}', P14['a']['cells'][name]['verdict'], 'rec', f'claims.L14.parts.a.cells.{name}.verdict')
        V.put(f'L14.a.{name}.estRange', f'{sgn(min(s["est"] for s in seeds))} to {sgn(max(s["est"] for s in seeds))}',
              'rec', f'claims.L14.parts.a.cells.{name}.per_seed (est, least and greatest)')
        V.put(f'L14.a.{name}.minLo', sgn(min(s['lo'] for s in seeds)), 'rec',
              f'claims.L14.parts.a.cells.{name}.per_seed (least lo)')
    part('L14', 'a', 'seeds', cells_a)
    cells_b = []
    for dd in (2, 3):
        ps = P14['b']['cells'][f'd{dd}']['per_seed']
        seeds = []
        for s, v in sorted(ps.items(), key=lambda x: int(x[0])):
            rb = C['L14']['intervals']['b'][f'{dd}/{s}']['row_bootstrap']
            seeds.append({'s': int(s), 'est': v['est'], 'lo': v['lo'], 'hi': v['hi'], 'rowLo': rb['lo'], 'rowHi': rb['hi']})
            V.put(f'L14.b.d{dd}.s{s}', ci(v), 'rec', f'claims.L14.parts.b.cells.d{dd}.per_seed.{s}')
        cells_b.append({'name': f'd{dd}', 'seeds': seeds, 'verdict': P14['b']['cells'][f'd{dd}']['verdict']})
        V.put(f'L14.b.d{dd}', P14['b']['cells'][f'd{dd}']['verdict'], 'rec', f'claims.L14.parts.b.cells.d{dd}.verdict')
        V.put(f'L14.b.d{dd}.estRange', f'{sgn(min(s["est"] for s in seeds))} to {sgn(max(s["est"] for s in seeds))}',
              'rec', f'claims.L14.parts.b.cells.d{dd}.per_seed (est, least and greatest)')
        V.put(f'L14.b.d{dd}.minLo', sgn(min(s['lo'] for s in seeds)), 'rec', f'claims.L14.parts.b.cells.d{dd}.per_seed (least lo)')
    part('L14', 'b', 'seeds', cells_b)

    I15 = C['L15']['intervals']
    cells = []
    for st in ('SL', 'MEN'):
        for k in A4:
            cells.append(cell(I15['a'][st][k], f'{st}/{k}'))
            V.put(f'L15.a.{st}/{k}', ci(I15['a'][st][k]), 'rec', f'claims.L15.intervals.a.{st}.{k}')
            rb = I15['a'][st][k]['row_bootstrap']
            V.put(f'L15.a.{st}/{k}.row', ci_lohi(rb['lo'], rb['hi']), 'rec', f'claims.L15.intervals.a.{st}.{k}.row_bootstrap')
    part('L15', 'a', 'gain', cells)
    cells = [cell(I15['b'][k], k) for k in ('MEN', 'WSR', 'HL')]
    part('L15', 'b', 'above0', cells)
    for k in ('MEN', 'WSR', 'HL'):
        V.put(f'L15.b.{k}', ci(I15['b'][k]), 'rec', f'claims.L15.intervals.b.{k}')
    for p in 'abc':
        iv = I13[p]['H3-F3']
        V.put(f'L13.n.{p}', comma(iv['n']), 'rec', f'claims.L13.intervals.parts.{p}.H3-F3.n')
        V.put(f'L13.clusters.{p}', comma(iv['clusters']), 'rec', f'claims.L13.intervals.parts.{p}.H3-F3.clusters')
    verdicts = [pp['verdict'] for c in claims.values() for pp in c['parts'].values()]
    V.put('sum.parts', str(len(verdicts)), 'rec', 'claims.*.parts')
    V.put('sum.supported', str(verdicts.count('supported')), 'rec', 'claims.*.parts.*.verdict (supported)')
    V.put('sum.refuted', str(verdicts.count('refuted')), 'rec', 'claims.*.parts.*.verdict (refuted)')
    for cl in claims:
        if claims[cl]['void'] != C[cl]['void']:
            refuse(f'{cl}: void flag')
        if not all(claims[cl]['controls'].values()):
            refuse(f'{cl}: a control did not fail as required, which this page does not expect')

    # ---------------------------------------------------------------- the arms behind the differences
    arms = {}
    rho12 = C['L12']['rho']
    arms['L12'] = {k: rho12[k]['float'] for k in rho12}
    for k in rho12:
        V.put(f'L12.rho.{k}', rho12[k]['rho'], 'rec', f'claims.L12.rho.{k}.rho')
    for a in ('H3', 'H2'):
        for form in ('DepG', 'Sym'):
            r = rho_of(fm, f'HL/{a}/{form}/max/-')
            arms['L12'][f'{a}/{form}'] = r['float']
            V.put(f'L12.rho.{a}/{form}', r['rho'], 'rec', f'files_metrics[HL/{a}/{form}/max/-].rho')
    chain = rec['reported']['L12']['chain']
    arms['L12chain'] = {k: chain[k]['float'] for k in chain}
    for k in chain:
        V.put(f'L12.chain.{k}', chain[k]['rho'], 'rec', f'reported.L12.chain.{k}.rho')
    for a, b in (('WN', 'WN-U'), ('WN', 'ST'), ('ST', 'letter'), ('letter', 'H3'), ('WN', 'H3')):
        V.put(f'L12.chain.{a}~{b}', num(chain[a]['float'] - chain[b]['float'], 3), 'rec', f'reported.L12.chain: {a} - {b}')
    for a in ('WN', 'H3'):
        tb = fm[f'HL/{a}/G/max/-']['tie_bounds']
        V.put(f'L12.tie.{a}.pess', tb['pessimistic']['rho'], 'rec', f'files_metrics[HL/{a}/G/max/-].tie_bounds.pessimistic')
        V.put(f'L12.tie.{a}.opt', tb['optimistic']['rho'], 'rec', f'files_metrics[HL/{a}/G/max/-].tie_bounds.optimistic')
    V.put('L12.classes.WN', str(fm['HL/WN/G/max/-']['classes']), 'rec', 'files_metrics[HL/WN/G/max/-].classes')
    V.put('L12.classes.H3', comma(fm['HL/H3/G/max/-']['classes']), 'rec', 'files_metrics[HL/H3/G/max/-].classes')

    ap = C['L13']['ap']
    acc = C['L13']['accuracy']
    arms['L13'] = {'ap': {st: {a: ap[st][a]['float'] for a in ap[st]} for st in ap},
                   'accuracy': {a: acc[a]['float'] for a in acc}}
    for st in ap:
        for a in ap[st]:
            V.put(f'L13.ap.{st}.{a}', num(ap[st][a]['float']), 'rec', f'claims.L13.ap.{st}.{a}.float')
    ndir = C['L13']['intervals']['parts']['c']['H3-F3']['n']
    for a in acc:
        V.put(f'L13.acc.{a}', num(acc[a]['float']), 'rec', f'claims.L13.accuracy.{a}.float')
        V.put(f'L13.accx.{a}', acc[a]['exact'], 'rec', f'claims.L13.accuracy.{a}.exact')
        right = frac(acc[a]['exact']) * ndir
        if right.denominator != 1:
            refuse(f'L13 accuracy of {a} times {ndir} rows is not a count')
        V.put(f'L13.accn.{a}', comma(right.numerator), 'rec', f'claims.L13.accuracy.{a}.exact x {ndir} rows')
    fap = [ap['BD'][a]['float'] for a in ('F3', 'F3*', 'F2', 'F2*')]
    V.put('L13.ap.BD.Frange', f'{num(min(fap))} to {num(max(fap))}', 'rec', 'claims.L13.ap.BD.F*.float (least and greatest)')
    fap = [ap['WB'][a]['float'] for a in ('F3', 'F3*', 'F2', 'F2*')]
    V.put('L13.ap.WB.Frange', f'{num(min(fap))} to {num(max(fap))}', 'rec', 'claims.L13.ap.WB.F*.float (least and greatest)')
    for st, key in (('BD', 'bd.test_covered_true'), ('WB', 'wb.test_covered_true')):
        V.put(f'L13.true.{st}', comma(rec['counts_gold'][key]), 'rec', f'counts_gold.{key}')
    for st, pq in C['L13']['pis'].items():
        V.put(f'L13.pi.{st}', num(frac(pq)), 'rec', f'claims.L13.pis.{st}')
        V.put(f'L13.pix.{st}', pq, 'rec', f'claims.L13.pis.{st}')
        arms['L13'].setdefault('pi', {})[st] = float(frac(pq))

    meas = C['L14']['measured']
    l14 = {'rr': {}, 'rho': {}}
    for dd in (2, 3):
        for setting in ('random', 'hard'):
            per = {}
            for g in ('lorentz', 'euclid'):
                fr = [frac(meas[f'{g}-{dd}-s{s}']['mean_rr'][setting]) for s in range(5)]
                per[g] = [float(x) for x in fr]
                mean = sum(fr) / 5
                V.put(f'L14.rr.d{dd}/{setting}.{g}', num(mean), 'rec', f'claims.L14.measured.{g}-{dd}-s0..4.mean_rr.{setting}, mean of five')
                per[g + 'Mean'] = float(mean)
            gap = Fraction(0)
            for s in range(5):
                gap += frac(meas[f'lorentz-{dd}-s{s}']['mean_rr'][setting]) - frac(meas[f'euclid-{dd}-s{s}']['mean_rr'][setting])
            V.put(f'L14.rr.d{dd}/{setting}.gap', sgn(gap / 5), 'rec', f'claims.L14.measured: Lorentz - Euclidean mean_rr.{setting}, mean of five')
            per['gap'] = float(gap / 5)
            l14['rr'][f'd{dd}/{setting}'] = per
        per = {}
        for g in ('lorentz', 'euclid'):
            per[g] = [meas[f'{g}-{dd}-s{s}']['rho_hl_at']['float'] for s in range(5)]
            mean = math.fsum(per[g]) / 5
            per[g + 'Mean'] = mean
            V.put(f'L14.rho.d{dd}.{g}', num(mean), 'rec', f'claims.L14.measured.{g}-{dd}-s0..4.rho_hl_at.float, mean of five')
        per['gap'] = per['lorentzMean'] - per['euclidMean']
        V.put(f'L14.rho.d{dd}.gap', sgn(per['gap']), 'rec', 'claims.L14.measured: Lorentz - Euclidean rho_hl_at, mean of five')
        l14['rho'][f'd{dd}'] = per
    arms['L14'] = l14
    eh = [x for dd in (2, 3) for x in l14['rr'][f'd{dd}/hard']['euclid']]
    V.put('L14.rr.hardEuclidRange', f'{num(min(eh))} to {num(max(eh))}', 'rec', 'claims.L14.measured.euclid-*.mean_rr.hard (least and greatest)')
    V.put('L14.a.ahead', str(sum(1 for c in cells_a for x in c['seeds'] if x['est'] > 0)), 'rec', 'claims.L14.parts.a.cells.*.per_seed (est > 0)')
    V.put('L14.b.ahead', str(sum(1 for c in cells_b for x in c['seeds'] if x['est'] > 0)), 'rec', 'claims.L14.parts.b.cells.*.per_seed (est > 0)')
    V.put('L14.n.hit', comma(C['L14']['intervals']['a']['2/random/0']['n']), 'rec', 'claims.L14.intervals.a.2/random/0.n')
    V.put('L14.n.hl', comma(C['L14']['intervals']['b']['2/0']['n']), 'rec', 'claims.L14.intervals.b.2/0.n')
    edges = rec['reported']['L14']['hl_rows_that_are_E_edges']
    V.put('L14.hlEdges', comma(edges['either']), 'rec', 'reported.L14.hl_rows_that_are_E_edges.either')
    sign = rec['reported']['L14']['sign_agreement_with_G']
    V.put('L14.signDisagree', str(sum(v['seeds_disagreeing_with_G'] for v in sign.values())), 'rec',
          'reported.L14.sign_agreement_with_G (seeds disagreeing, summed)')

    rho15 = C['L15']['rho']
    arms['L15'] = {st: {a: rho15[st][a]['float'] for a in rho15[st]} for st in rho15}
    for st in rho15:
        for a in rho15[st]:
            V.put(f'L15.rho.{st}.{a}', rho15[st][a]['rho'], 'rec', f'claims.L15.rho.{st}.{a}.rho')
    arms['L15b'] = {}
    for st in ('MEN', 'WSR', 'HL'):
        for a, fk in (('GloVe', f'{st}-glove/GloVe-300/cos/-/-'), ('H3', f'{st}-glove/H3/Sym/max/-')):
            r = rho_of(fm, fk)
            arms['L15b'].setdefault(st, {})[a] = r['float']
            V.put(f'L15.b.rho.{st}.{a}', r['rho'], 'rec', f'files_metrics[{fk}].rho')
    rep15 = rec['reported']['L15']
    for st in ('WSS', 'WSC', 'WSR'):
        for k in A4:
            V.put(f'L15.rep.{st}/{k}', ci(rep15[f'H-F Sym on {st}'][k]), 'rec', f'reported.L15["H-F Sym on {st}"].{k}')
    V.put('L15.rep.HLG', ci(rep15['H3 G against GloVe on HL']), 'rec', 'reported.L15["H3 G against GloVe on HL"]')
    for st in ('SL', 'MEN'):
        V.put(f'L15.n.{st}', comma(I15['a'][st]['H3-F3']['n']), 'rec', f'claims.L15.intervals.a.{st}.H3-F3.n')
    for st in ('MEN', 'WSR', 'HL'):
        V.put(f'L15.n.{st}-glove', comma(I15['b'][st]['n']), 'rec', f'claims.L15.intervals.b.{st}.n')
    classes = {}
    for st in ('SL', 'MEN'):
        for a in ('H3', 'F3', 'F3*'):
            c = fm[f'{st}/{a}/Sym/max/-']['classes']
            classes[f'{st}/{a}'] = c
            V.put(f'L15.classes.{st}/{a}', comma(c), 'rec', f'files_metrics[{st}/{a}/Sym/max/-].classes')

    # ---------------------------------------------------------------- controls
    controls = {}
    K = C['L12']['intervals']
    st12 = C['L12']['strongest']
    c4 = C['L12']['controls']['control4']
    controls['L12'] = {
        'control1': [cell(K['control1'][k], k) for k in ('K3', 'S-full*')],
        'control2': [cell(K['control2']['W*'], 'W*')],
        'control3': [cell(K['control3'], 'roles')],
        'control4': {'band': c4['H3']['band'], 'means': {a: c4[a]['mean'] for a in c4}},
        'strongest': {'S-full': st12['S-full']['i'], 'W': st12['W']['i']},
    }
    for k in ('K3', 'S-full*'):
        V.put(f'L12.c1.{k}', ci(K['control1'][k]), 'rec', f'claims.L12.intervals.control1.{k}')
    V.put('L12.c2.W*', ci(K['control2']['W*']), 'rec', 'claims.L12.intervals.control2.W*')
    V.put('L12.c3', ci(K['control3']), 'rec', 'claims.L12.intervals.control3')
    V.put('L12.c1.i', str(st12['S-full']['i']), 'rec', 'claims.L12.strongest.S-full.i')
    V.put('L12.c2.i', str(st12['W']['i']), 'rec', 'claims.L12.strongest.W.i')
    V.put('L12.c1.irho', st12['S-full']['rho'][st12['S-full']['i']], 'rec', 'claims.L12.strongest.S-full.rho[i]')
    V.put('L12.c2.irho', st12['W']['rho'][st12['W']['i']], 'rec', 'claims.L12.strongest.W.rho[i]')
    V.put('L12.c4.band', num(c4['H3']['band']), 'rec', 'claims.L12.controls.control4.*.band')
    worst = max(c4, key=lambda a: abs(c4[a]['mean']))
    V.put('L12.c4.maxabs', num(abs(c4[worst]['mean'])), 'rec', f'claims.L12.controls.control4 (largest |mean|, {worst})')
    V.put('L12.c4.maxarm', worst, 'rec', 'claims.L12.controls.control4 (arm with the largest |mean|)')

    I13c = C['L13']['intervals']['control1']
    st13 = C['L13']['strongest']
    controls['L13'] = {'control1': {p: [cell(I13c[p][k], k) for k in ('K3', 'S-full*', 'W*')] for p in 'abc'},
                       'strongest': st13, 'control2': {}, 'control3': C['L13']['controls']['control3']}
    for p in 'abc':
        for k in ('K3', 'S-full*', 'W*'):
            V.put(f'L13.c1.{p}.{k}', ci(I13c[p][k]), 'rec', f'claims.L13.intervals.control1.{p}.{k}')
        for k in ('S-full', 'W'):
            V.put(f'L13.c1.{p}.{k}.i', str(st13[p][k]), 'rec', f'claims.L13.strongest.{p}.{k}')
    c2 = C['L13']['controls']['control2']
    for key, v in c2.items():
        a, st = key.split('/')
        controls['L13']['control2'][key] = {'mean': float(frac(v['mean'])), 'bound': float(frac(v['bound'])), 'holds': v['holds']}
    for st in ('BD', 'WB'):
        ms = {k: v for k, v in controls['L13']['control2'].items() if k.endswith('/' + st)}
        top = max(ms, key=lambda k: ms[k]['mean'])
        V.put(f'L13.c2.{st}.bound', num(ms[top]['bound']), 'rec', f'claims.L13.controls.control2.*/{st}.bound')
        V.put(f'L13.c2.{st}.boundx', c2[top]['bound'], 'rec', f'claims.L13.controls.control2.*/{st}.bound')
        V.put(f'L13.c2.{st}.max', num(ms[top]['mean']), 'rec', f'claims.L13.controls.control2 (largest mean on {st}, {top})')
        V.put(f'L13.c2.{st}.min', num(min(v['mean'] for v in ms.values())), 'rec', f'claims.L13.controls.control2 (least mean on {st})')
    legs13 = [I13c[p][k] for p in 'abc' for k in ('K3', 'S-full*', 'W*')]
    V.put('L13.c1.n', str(len(legs13)), 'rec', 'claims.L13.intervals.control1 (legs)')
    V.put('L13.c1.above', str(sum(1 for iv in legs13 if iv['lo'] > 0)), 'rec', 'claims.L13.intervals.control1 (lo > 0)')
    V.put('L13.c2.n', str(len(c2)), 'rec', 'claims.L13.controls.control2 (entries)')
    V.put('L13.c1.minLo', sgn(min(I13c[p][k]['lo'] for p in 'abc' for k in ('K3', 'S-full*', 'W*'))), 'rec',
          'claims.L13.intervals.control1 (least lo)')
    V.put('L13.c2.held', str(sum(1 for v in c2.values() if v['holds'])), 'rec', 'claims.L13.controls.control2 (holds)')
    for k, v in C['L13']['controls']['control3'].items():
        V.put(f'L13.c3.{k}', str(frac(v['accuracy'])), 'rec', f'claims.L13.controls.control3.{k}.accuracy')

    c14 = C['L14']['controls']
    band14 = Fraction(sum(Fraction(1, k) for k in range(1, 12)) / 11) + Fraction(1, 50)
    c1v = {k: frac(v['mean']) for k, v in c14['control1'].items()}
    c2v = {k: frac(v['macro']) for k, v in c14['control2'].items()}
    rowv = {k: frac(v) for k, v in C['L14']['relabelled_per_row_mean_rr'].items()}
    for name, vals in (('control1', c1v), ('control2', c2v)):
        if any((v <= band14) != c14[name][k]['holds'] for k, v in vals.items()):
            refuse(f'L14 {name}: a holds flag does not follow from the exact band')
    c3 = c14['control3']
    c3cells = []
    for k, row in c3['cells'].items():
        c3cells.append({'name': k, 'lorentz': cell(row['lorentz'], 'lorentz'), 'euclid': cell(row['euclid'], 'euclid'),
                        'passes': row['passes']})
    c4_14 = c14['control4']
    controls['L14'] = {
        'band': float(band14), 'bandExact': f'{band14.numerator}/{band14.denominator}',
        'control1': {k: float(v) for k, v in c1v.items()},
        'control2': {k: float(v) for k, v in c2v.items()},
        'relabelledPerRow': {k: float(v) for k, v in rowv.items()},
        'control3': c3cells, 'control3Failed': c3['failed'],
        'control4': {'band': next(iter(c4_14.values()))['band'], 'means': {k: v['mean'] for k, v in c4_14.items()}},
        'closureFailingRows': C['L14']['closure_failing_rows'],
    }
    V.put('L14.band', num(band14), 'rec', 'H11/11 + 1/50 (A13 L14), the band claims.L14.controls.control1-2 compare with')
    V.put('L14.bandx', f'{band14.numerator}/{band14.denominator}', 'rec', 'H11/11 + 1/50, exact')
    V.put('L14.c1.n', str(len(c1v)), 'rec', 'claims.L14.controls.control1 (tables)')
    V.put('L14.c1.held', str(sum(1 for v in c14['control1'].values() if v['holds'])), 'rec', 'claims.L14.controls.control1 (holds)')
    V.put('L14.c2.held', str(sum(1 for v in c14['control2'].values() if v['holds'])), 'rec', 'claims.L14.controls.control2 (holds)')
    V.put('L14.c4.n', str(len(c14['control4'])), 'rec', 'claims.L14.controls.control4 (tables)')
    k1 = max(c1v, key=c1v.get)
    V.put('L14.c1.max', num(c1v[k1]), 'rec', f'claims.L14.controls.control1.{k1}.mean')
    V.put('L14.c1.maxKey', k1, 'rec', 'claims.L14.controls.control1 (largest mean)')
    k2 = max(c2v, key=c2v.get)
    V.put('L14.c2.max', num(c2v[k2]), 'rec', f'claims.L14.controls.control2.{k2}.macro')
    V.put('L14.c2.maxKey', k2, 'rec', 'claims.L14.controls.control2 (largest macro mean)')
    kr = max(rowv, key=rowv.get)
    V.put('L14.c2.rowMax', num(rowv[kr]), 'rec', f'claims.L14.relabelled_per_row_mean_rr.{kr}')
    V.put('L14.c2.rowMaxKey', kr, 'rec', 'claims.L14.relabelled_per_row_mean_rr (largest)')
    over = sorted(k for k, v in rowv.items() if v > band14)
    V.put('L14.c2.rowOver', str(len(over)), 'rec', 'claims.L14.relabelled_per_row_mean_rr (above the band)')
    V.put('L14.c2.rowOverMeasured', str(sum(1 for k in over if k.startswith('measured-'))), 'rec',
          'claims.L14.relabelled_per_row_mean_rr (measured tables above the band)')
    V.put('L14.c3.n', str(len(c3cells)), 'rec', 'claims.L14.controls.control3.cells')
    V.put('L14.c3.pass', str(sum(1 for c in c3cells if c['passes'])), 'rec', 'claims.L14.controls.control3.cells (passes)')
    approx = [(c['name'], g) for c in c3cells for g in ('lorentz', 'euclid') if not c[g]['lo'] > 0]
    V.put('L14.c3.approx', str(len(approx)), 'rec', 'claims.L14.controls.control3.cells (labelled "true ≈ shuffled")')
    if approx:
        nm, g = approx[0]
        row = c3['cells'][nm]
        V.put('L14.c3.approxCell', f'{nm} {g}', 'rec', 'claims.L14.controls.control3.cells (the first labelled "true ≈ shuffled")')
        V.put('L14.c3.approxCi', ci(row[g]), 'rec', f'claims.L14.controls.control3.cells.{nm}.{g}')
        other = 'lorentz' if g == 'euclid' else 'euclid'
        V.put('L14.c3.approxOther', ci(row[other]), 'rec', f'claims.L14.controls.control3.cells.{nm}.{other}')
    k4 = max(c4_14, key=lambda k: abs(c4_14[k]['mean']))
    V.put('L14.c4.maxabs', num(abs(c4_14[k4]['mean'])), 'rec', f'claims.L14.controls.control4.{k4}.mean')
    V.put('L14.c4.band', num(controls['L14']['control4']['band']), 'rec', 'claims.L14.controls.control4.*.band')
    for s in ('random', 'hard'):
        V.put(f'L14.closure.{s}', str(C['L14']['closure_failing_rows'][s]), 'rec', f'claims.L14.closure_failing_rows.{s}')

    c15 = C['L15']['controls']
    controls['L15'] = {'control1': {st: [cell(I15['control1'][st][k], k) for k in ('K3', 'S-full*', 'W*')] for st in ('SL', 'MEN')},
                       'control2': [{'arm': e['arm'], 'set': e['set'], 'mean': e['mean'], 'band': e['band']} for e in c15['control2']],
                       'control3': {k: {'mean': v['mean'], 'band': v['band']} for k, v in c15['control3'].items()}}
    for st in ('SL', 'MEN'):
        for k in ('K3', 'S-full*', 'W*'):
            iv = I15['control1'][st][k]
            V.put(f'L15.c1.{st}.{k}', ci(iv), 'rec', f'claims.L15.intervals.control1.{st}.{k}')
            if k != 'K3':
                V.put(f'L15.c1.{st}.{k}.arm', iv['y'].split('/')[1], 'rec', f'claims.L15.intervals.control1.{st}.{k}.y')
    legs15 = [I15['control1'][st][k] for st in ('SL', 'MEN') for k in ('K3', 'S-full*', 'W*')]
    V.put('L15.c1.n', str(len(legs15)), 'rec', 'claims.L15.intervals.control1 (legs)')
    V.put('L15.c1.above', str(sum(1 for iv in legs15 if iv['lo'] > 0)), 'rec', 'claims.L15.intervals.control1 (lo > 0)')
    V.put('L15.c1.minLo', sgn(min(I15['control1'][st][k]['lo'] for st in ('SL', 'MEN') for k in ('K3', 'S-full*', 'W*'))),
          'rec', 'claims.L15.intervals.control1 (least lo)')
    V.put('L15.c2.n', str(len(c15['control2'])), 'rec', 'claims.L15.controls.control2 (entries)')
    V.put('L15.c2.held', str(sum(1 for e in c15['control2'] if e['holds'])), 'rec', 'claims.L15.controls.control2 (holds)')
    w2 = max(c15['control2'], key=lambda e: abs(e['mean']) / e['band'])
    V.put('L15.c2.worst', f'{w2["set"]} {w2["arm"]}', 'rec', 'claims.L15.controls.control2 (largest |mean| / band)')
    V.put('L15.c2.worstMean', num(abs(w2['mean'])), 'rec', 'claims.L15.controls.control2 (its |mean|)')
    V.put('L15.c2.worstBand', num(w2['band']), 'rec', 'claims.L15.controls.control2 (its band)')
    for k, v in c15['control3'].items():
        V.put(f'L15.c3.{k}', num(v['mean']), 'rec', f'claims.L15.controls.control3.{k}.mean')
        V.put(f'L15.c3.{k}.band', num(v['band']), 'rec', f'claims.L15.controls.control3.{k}.band')

    # ---------------------------------------------------------------- tuning (Amendment 15's sources)
    grid = tun['grid']
    tcells = {}
    for name, cel in tun['cells'].items():
        rates = {}
        for rt in grid:
            r = cel['rates'][rt]
            rates[rt] = r['mean_float'] if r['eligible'] else None
            if r['eligible']:
                V.put(f'tun.{name}.{rt}', num(r['mean_float']), 'tun', f'cells.{name}.rates.{rt}.mean')
        tcells[name] = {'chosen': cel['chosen'], 'atGridEnd': cel['at_grid_end'], 'means': rates}
        if settings[cel['geometry']][str(cel['d'])] != cel['chosen']:
            refuse(f'settings-stage2.json does not hold tuning\'s choice for {name}')
        V.put(f'tun.{name}.chosen', cel['chosen'], 'set', f'{cel["geometry"]}.{cel["d"]}')
    runs = tun['runs']
    preview = {}
    for dd in (2, 3):
        for setting in ('random', 'hard'):
            mm = {}
            for g in ('lorentz', 'euclid'):
                rs = [r for r in runs if r['geometry'] == g and r['d'] == dd and r['lr'] == '10']
                if len(rs) != 2:
                    refuse('tuning: not two runs at rate 10')
                mm[g] = sum(frac(r[f'mean_rr_{setting}']) for r in rs) / 2
                V.put(f'tun.prev.d{dd}/{setting}.{g}', num(mm[g]), 'tun', f'runs[{g}, d={dd}, lr 10].mean_rr_{setting}, mean of two')
            V.put(f'tun.prev.d{dd}/{setting}.gap', sgn(mm['lorentz'] - mm['euclid']), 'tun', 'runs at lr 10: Lorentz - Euclidean')
            preview[f'd{dd}/{setting}'] = {g: float(v) for g, v in mm.items()}
    second = []
    for name, cel in tcells.items():
        el = sorted((v for v in cel['means'].values() if v is not None), reverse=True)
        second.append((el[0] - el[1], name))
    gapmin, closest = min(second)
    nice = {'lorentz': 'Lorentz', 'euclid': 'Euclidean'}
    V.put('tun.closest', f'{nice[tun["cells"][closest]["geometry"]]} d = {tun["cells"][closest]["d"]}', 'tun',
          'cells (the smallest difference of the two largest eligible means)')
    V.put('tun.closestGap', num(gapmin), 'tun', 'cells (that difference)')
    V.put('tun.runs', str(len(runs)), 'tun', 'runs')
    V.put('tun.converged', str(sum(1 for r in runs if r['converged'])), 'tun', 'runs (converged)')
    V.put('tun.diverged', str(sum(1 for r in runs if r['diverged_epoch'] is not None)), 'tun', 'runs (diverged)')
    V.put('tun.resumed', str(sum(1 for r in runs if r['resumed'])), 'tun', 'runs (resumed)')
    V.put('tun.replay', 'equal' if tun['replay_check']['equal'] else 'different', 'tun', 'replay_check.equal')
    for i, s in enumerate(tun['starts']):
        V.put(f'tun.start{i + 1}', s['time'][11:19], 'tun', f'starts[{i}].time')
    V.put('tun.starts', str(len(tun['starts'])), 'tun', 'starts')
    V.put('tun.projection', format(tun['time_record']['total_hours'], '.2f'), 'tun', 'time_record.total_hours')
    V.put('tun.wall', comma(round(math.fsum(r['wall_s'] for r in runs))), 'tun', 'runs.wall_s, summed')
    V.put('tun.rows', comma(tun['instance']['hit_val']['rows']), 'tun', 'instance.hit_val.rows')
    tuning = {'grid': grid, 'cells': tcells, 'preview': preview, 'starts': [s['time'] for s in tun['starts']],
              'settingsSha256': set_sha}

    # ---------------------------------------------------------------- the dry runs' sealed values (A13.13)
    SC = S['claims']
    first_equal = first['record']['claims'] == SC
    dryv = {'firstClaimsEqual': first_equal, 'instances': {}, 'claims': {}}
    if not first_equal:
        refuse('the first sealed file\'s claims differ from the rerun\'s, which this page does not expect')
    V.put('dry.firstEqual', 'equal' if first_equal else 'different', 'seal1', 'record.claims, compared with the rerun\'s')
    V.put('dry.lbench', comma(len(sealed['lbench_sealed'])), 'seal', 'lbench_sealed')
    V.put('dry.lbench1', comma(len(first['lbench_sealed'])), 'seal1', 'lbench_sealed')
    for k in ('HL', 'BD', 'BD-dir', 'SL', 'MEN', 'WSR-glove'):
        inst = S['instances'][k]
        dryv['instances'][k] = {'iid': inst['iid'], 'rows': inst['rows'], 'types': inst['word_types']}
        V.put(f'dry.n.{k}', comma(inst['rows']), 'seal', f'record.instances.{k}.rows')
        if inst['word_types'] is not None:
            V.put(f'dry.types.{k}', comma(inst['word_types']), 'seal', f'record.instances.{k}.word_types')
    for cl, cc in SC.items():
        dryv['claims'][cl] = {'void': cc['void'], 'controls': cc['controls']['fails_as_required'],
                              'parts': {p: [v['verdict'], v.get('verdict_before_controls', v['verdict'])] for p, v in cc['parts'].items()}}
        for p, v in cc['parts'].items():
            V.put(f'dry.{cl}.{p}', v['verdict'], 'seal', f'record.claims.{cl}.parts.{p}.verdict')
            V.put(f'dry.{cl}.{p}.before', v.get('verdict_before_controls', v['verdict']), 'seal',
                  f'record.claims.{cl}.parts.{p}.verdict_before_controls')
    DI = SC['L12']['intervals']
    for p, names in (('a', A4), ('b', ('H3', 'H2')), ('c', ('H3', 'H2'))):
        for k in names:
            V.put(f'dry.L12.{p}.{k}', ci(DI[p][k]), 'seal', f'record.claims.L12.intervals.{p}.{k}')
    V.put('dry.L12.d.H3-WN', ci(DI['d']), 'seal', 'record.claims.L12.intervals.d')
    V.put('dry.L12.d.side', SC['L12']['parts']['d']['failing_side'], 'seal', 'record.claims.L12.parts.d.failing_side')
    for k, v in SC['L12']['rho'].items():
        V.put(f'dry.L12.rho.{k}', v['rho'], 'seal', f'record.claims.L12.rho.{k}.rho')
    dchain = S['reported']['L12']['chain']
    for k in dchain:
        V.put(f'dry.L12.chain.{k}', dchain[k]['rho'], 'seal', f'record.reported.L12.chain.{k}.rho')
    for k in ('K3', 'S-full*'):
        V.put(f'dry.L12.c1.{k}', ci(DI['control1'][k]), 'seal', f'record.claims.L12.intervals.control1.{k}')
    V.put('dry.L12.c2.W*', ci(DI['control2']['W*']), 'seal', 'record.claims.L12.intervals.control2.W*')
    V.put('dry.L12.c3', ci(DI['control3']), 'seal', 'record.claims.L12.intervals.control3')
    dc4 = SC['L12']['controls']['control4']
    V.put('dry.L12.c4.maxabs', num(max(abs(v['mean']) for v in dc4.values())), 'seal', 'record.claims.L12.controls.control4 (largest |mean|)')
    V.put('dry.L12.c4.band', num(next(iter(dc4.values()))['band']), 'seal', 'record.claims.L12.controls.control4.*.band')
    D13 = SC['L13']
    for p in 'abc':
        for k in A4:
            V.put(f'dry.L13.{p}.{k}', ci(D13['intervals']['parts'][p][k]), 'seal', f'record.claims.L13.intervals.parts.{p}.{k}')
    for st in D13['ap']:
        for a in D13['ap'][st]:
            if st == 'BD':
                V.put(f'dry.L13.ap.{a}', num(D13['ap'][st][a]['float']), 'seal', f'record.claims.L13.ap.BD.{a}.float')
    for a, v in D13['accuracy'].items():
        V.put(f'dry.L13.acc.{a}', num(v['float']), 'seal', f'record.claims.L13.accuracy.{a}.float')
        V.put(f'dry.L13.accx.{a}', v['exact'], 'seal', f'record.claims.L13.accuracy.{a}.exact')
    V.put('dry.L13.pix.BD', D13['pis']['BD'], 'seal', 'record.claims.L13.pis.BD')
    dm = [frac(v['mean']) for v in D13['controls']['control2'].values()]
    V.put('dry.L13.c2.range', f'{num(min(dm), 3)} to {num(max(dm), 3)}', 'seal', 'record.claims.L13.controls.control2 (means)')
    V.put('dry.L13.c2.bound', next(iter(D13['controls']['control2'].values()))['bound'], 'seal', 'record.claims.L13.controls.control2.*.bound')
    D14 = SC['L14']
    for name in ('d2/random', 'd2/hard', 'd3/random', 'd3/hard'):
        ps = D14['parts']['a']['cells'][name]['per_seed']
        es = [v['est'] for v in ps.values()]
        V.put(f'dry.L14.a.{name}.estRange', f'{sgn(min(es))} to {sgn(max(es))}', 'seal', f'record.claims.L14.parts.a.cells.{name}.per_seed (est)')
        V.put(f'dry.L14.a.{name}.minLo', sgn(min(v['lo'] for v in ps.values())), 'seal', f'record.claims.L14.parts.a.cells.{name}.per_seed (least lo)')
    for dd in (2, 3):
        ps = D14['parts']['b']['cells'][f'd{dd}']['per_seed']
        es = [v['est'] for v in ps.values()]
        V.put(f'dry.L14.b.d{dd}.estRange', f'{sgn(min(es))} to {sgn(max(es))}', 'seal', f'record.claims.L14.parts.b.cells.d{dd}.per_seed (est)')
    dc1 = {k: frac(v['mean']) for k, v in D14['controls']['control1'].items()}
    V.put('dry.L14.c1.n', str(len(dc1)), 'seal', 'record.claims.L14.controls.control1')
    V.put('dry.L14.c1.held', str(sum(1 for v in D14['controls']['control1'].values() if v['holds'])), 'seal', 'record.claims.L14.controls.control1 (holds)')
    V.put('dry.L14.c2.held', str(sum(1 for v in D14['controls']['control2'].values() if v['holds'])), 'seal', 'record.claims.L14.controls.control2 (holds)')
    kd = max(dc1, key=dc1.get)
    V.put('dry.L14.c1.max', num(dc1[kd]), 'seal', f'record.claims.L14.controls.control1.{kd}.mean')
    V.put('dry.L14.c1.maxKey', kd, 'seal', 'record.claims.L14.controls.control1 (largest mean)')
    D15 = SC['L15']
    for st in ('SL', 'MEN'):
        for k in A4:
            V.put(f'dry.L15.a.{st}/{k}', ci(D15['intervals']['a'][st][k]), 'seal', f'record.claims.L15.intervals.a.{st}.{k}')
        for a in ('H3', 'H2', 'F3', 'F3*', 'F2', 'F2*'):
            V.put(f'dry.L15.rho.{st}.{a}', D15['rho'][st][a]['rho'], 'seal', f'record.claims.L15.rho.{st}.{a}.rho')
        hws = [(D15['intervals']['a'][st][k]['hi'] - D15['intervals']['a'][st][k]['lo']) / 2 for k in A4]
        V.put(f'dry.L15.a.{st}.hwRange', f'{num(min(hws), 3)} to {num(max(hws), 3)}', 'seal',
              f'record.claims.L15.intervals.a.{st}: (hi - lo)/2, least and largest of four')
    for k in ('MEN', 'WSR', 'HL'):
        V.put(f'dry.L15.b.{k}', ci(D15['intervals']['b'][k]), 'seal', f'record.claims.L15.intervals.b.{k}')
    legs = {}
    for st in ('SL', 'MEN'):
        for k in ('K3', 'S-full*', 'W*'):
            iv = D15['intervals']['control1'][st][k]
            legs[f'{st}/{k}'] = {'arm': iv['y'].split('/')[1], 'est': iv['est'], 'lo': iv['lo'], 'hi': iv['hi'],
                                 'registered': cell(I15['control1'][st][k], k)}
            V.put(f'dry.L15.c1.{st}.{k}', ci(iv), 'seal', f'record.claims.L15.intervals.control1.{st}.{k}')
            V.put(f'dry.L15.c1.{st}.{k}.arm', iv['y'].split('/')[1], 'seal', f'record.claims.L15.intervals.control1.{st}.{k}.y')
            V.put(f'dry.L15.c1.{st}.{k}.hw', num((iv['hi'] - iv['lo']) / 2, 3), 'seal', f'record.claims.L15.intervals.control1.{st}.{k}: (hi - lo)/2')
            rg = I15['control1'][st][k]
            V.put(f'L15.c1.{st}.{k}.hw', num((rg['hi'] - rg['lo']) / 2, 3), 'rec', f'claims.L15.intervals.control1.{st}.{k}: (hi - lo)/2')
    dryv['l15control1'] = legs
    dryv['l12'] = {p: [cell(DI[p][k], k) for k in names] for p, names in (('a', A4), ('b', ('H3', 'H2')), ('c', ('H3', 'H2')))}
    dryv['l12']['d'] = [cell(DI['d'], 'H3-WN')]

    # ---------------------------------------------------------------- predictions: their measurable parts, graded
    preds = []

    def pred(key, claim, text, right, measured, src='rec'):
        preds.append({'key': key, 'claim': claim, 'test': text, 'right': right, 'measured': measured})
        V.put(f'pred.{key}', 'right' if right is True else 'wrong' if right is False else 'partly', src, f'predictions.{key}')

    r12 = arms['L12']
    pred('L12.rhoH3', 'L12', 'rho(H3) between 0.45 and 0.70', 0.45 <= r12['H3'] <= 0.70, r12['H3'])
    gaps = {a: r12['H3'] - r12[a] for a in ('F3', 'F3*', 'F2', 'F2*')}
    pred('L12.Fgap', 'L12', 'every F arm at least 0.10 below rho(H3)', all(g >= 0.10 for g in gaps.values()), min(gaps.values()))
    V.put('pred.L12.FgapMin', num(min(gaps.values()), 3), 'rec', 'claims.L12.rho: rho(H3) - rho(F), least of four')
    for p in 'abc':
        pred(f'L12.{p}', 'L12', f'({p}) supported', C['L12']['parts'][p]['verdict'] == 'supported', C['L12']['parts'][p]['verdict'])
    pred('L12.d', 'L12', '(d) refuted on the low side', Pd['verdict'] == 'refuted' and Pd['failing_side'] == 'low',
         Pd['verdict'] + ', ' + str(Pd['failing_side']))
    hw = (d['hi'] - d['lo']) / 2
    pred('L12.dHalfwidth', 'L12', "(d)'s word-level half-width between 0.015 and 0.026", 0.015 <= hw <= 0.026, hw)
    for p in 'abc':
        pred(f'L13.{p}', 'L13', f'({p}) supported', C['L13']['parts'][p]['verdict'] == 'supported', C['L13']['parts'][p]['verdict'])
    fstar = [c for c in claims['L13']['parts']['c']['cells'] if c['name'].endswith('*')]
    pred('L13.cFstar', 'L13', "an F* cell of (c) is the inconclusive one (neither lo > 0 nor hi <= 0)",
         any(not (c['lo'] > 0) and not (c['hi'] <= 0) for c in fstar), min(c['lo'] for c in fstar))
    V.put('pred.L13.cFstarLo', sgn(min(c['lo'] for c in fstar)), 'rec', 'claims.L13.intervals.parts.c (F* cells, least lo)')
    for p in 'ab':
        pred(f'L14.{p}', 'L14', f'({p}) supported', P14[p]['verdict'] == 'supported', P14[p]['verdict'])
    bigger = {}
    for name in ('d2/random', 'd2/hard', 'd3/random', 'd3/hard'):
        dd = name[:2]
        ga = math.fsum(s['est'] for s in next(c for c in cells_a if c['name'] == name)['seeds']) / 5
        gb = math.fsum(s['est'] for s in next(c for c in cells_b if c['name'] == dd)['seeds']) / 5
        bigger[name] = ga > gb
        V.put(f'pred.L14.gapA.{name}', sgn(ga), 'rec', f'claims.L14.parts.a.cells.{name}.per_seed (mean est)')
        if name.endswith('random'):
            V.put(f'pred.L14.gapB.{dd}', sgn(gb), 'rec', f'claims.L14.parts.b.cells.{dd}.per_seed (mean est)')
    nb = sum(bigger.values())
    pred('L14.gapAB', 'L14', 'a larger gap in (a) than in (b), cell by cell (mean of the five per-seed estimates)',
         True if nb == 4 else False if nb == 0 else None, {k: bool(v) for k, v in bigger.items()})
    V.put('pred.L14.gapABcount', str(nb), 'rec', 'claims.L14: (a) cells whose mean estimate exceeds (b)\'s at the same d')
    pred('L15.a', 'L15', '(a) refuted, at least on SimLex', C['L15']['parts']['a']['verdict'] == 'refuted'
         and all(c['lo'] > BAND for c in claims['L15']['parts']['a']['cells'] if c['name'].startswith('SL/')), C['L15']['parts']['a']['verdict'])
    sl = {c['name'][3:]: c['est'] for c in claims['L15']['parts']['a']['cells'] if c['name'].startswith('SL/')}
    men = {c['name'][4:]: c for c in claims['L15']['parts']['a']['cells'] if c['name'].startswith('MEN/')}
    smaller = all(men[k]['est'] < sl[k] for k in A4)
    pred('L15.aMENsmaller', 'L15', 'on MEN the gain is smaller (each MEN estimate below the SimLex one)', smaller,
         {k: [sl[k], men[k]['est']] for k in A4})
    slc = {c['name'][3:]: c for c in claims['L15']['parts']['a']['cells'] if c['name'].startswith('SL/')}
    wider = {k: (men[k]['hi'] - men[k]['lo']) > (slc[k]['hi'] - slc[k]['lo']) for k in A4}
    pred('L15.aMENwider', 'L15', "MEN's word reuse widens its intervals (each MEN interval wider than the SimLex one)",
         all(wider.values()), {k: [slc[k]['hi'] - slc[k]['lo'], men[k]['hi'] - men[k]['lo']] for k in A4})
    V.put('pred.L15.MENwider', str(sum(wider.values())), 'rec', 'claims.L15.intervals.a: MEN intervals wider than SimLex\'s')
    V.put('pred.L15.MENminLo', sgn(min(men[k]['lo'] for k in A4)), 'rec', 'claims.L15.intervals.a.MEN (least lo)')
    for st, cc in (('SL', slc), ('MEN', men)):
        ws = [cc[k]['hi'] - cc[k]['lo'] for k in A4]
        V.put(f'pred.L15.width.{st}', f'{num(min(ws), 3)} to {num(max(ws), 3)}', 'rec', f'claims.L15.intervals.a.{st}: hi - lo')
    pred('L15.b', 'L15', '(b) supported', C['L15']['parts']['b']['verdict'] == 'supported', C['L15']['parts']['b']['verdict'])

    head = {
        'format': 'hyperbolic-lexicon/stage2-view/1',
        'what': 'Stage 2 of the Hyperbolic Lexicon decided: the verdicts, intervals, controls and arm values of L12-L15 '
                'from the decisive record, tuning from its record, and the dry runs\' sealed values (A13.13), for '
                'Explainer 15. Written by reference/golden/make_stage2_view_v1.py; every number a page shows is in '
                '"values" with its source.',
        'licence': 'Metric values only (correlations, average precisions, accuracies, reciprocal ranks and their '
                   'intervals); no pair, rating, label or vector of any data set.',
        'rules': {'above0': 'supported if every interval has lo > 0; refuted if any has hi <= 0 (L12(a)-(c), L13, L15(b))',
                  'band': 'supported if lo >= -0.02 and hi <= +0.02; refuted if lo > +0.02 or hi < -0.02 (L12(d))',
                  'gain': 'supported if every hi <= +0.02; refuted if any lo > +0.02 (L15(a))',
                  'seeds': 'per cell: supported if five seeds are present with lo > 0, refuted if est <= 0 in three or '
                           'more; the part: supported if every cell is, refuted if any cell is (L14)',
                  'both': 'a part both supported and refuted by its conditions is inconclusive (A13.7)'},
        'sources': sources,
        'run': run,
    }
    body = {'claims': claims, 'controls': controls, 'arms': arms, 'tuning': tuning, 'dry': dryv,
            'predictions': preds}
    j = lambda v: json.dumps(v, separators=(',', ':'), ensure_ascii=True, allow_nan=False)
    lines = ['{']
    for k, v in head.items():
        lines.append(f'{j(k)}:{j(v)},')
    for k, v in body.items():
        lines.append(f'{j(k)}:{j(v)},')
    lines.append('"values":{')
    keys = list(V.values)
    for i, k in enumerate(keys):
        lines.append(f'{j(k)}:{j(V.values[k])}' + (',' if i + 1 < len(keys) else ''))
    lines.append('}}')
    text = '\n'.join(lines) + '\n'
    back = json.loads(text)
    if back['values'] != V.values or back['claims']['L12']['parts']['d']['verdict'] != 'refuted':
        refuse('the JSON text does not read back')
    if not text.isascii():
        refuse('the JSON text is not ASCII')
    return wrap(text), text, V.values


def literal(s):
    """A JS string literal for ASCII text (make_l6_view_v1.py's)."""
    out = ['"']
    for ch in s:
        c = ord(ch)
        if ch in '"\\':
            out.append('\\' + ch)
        elif c == 0x0A:
            out.append('\\n')
        elif 0x20 <= c <= 0x7E:
            out.append(ch)
        else:
            out.append('\\x%02x' % c)
    out.append('"')
    return ''.join(out)


def wrap(text):
    chunks = text.splitlines(keepends=True)
    out = [
        '// Hyperbolic Lexicon data: Stage 2 decided (L12-L15), for Explainer 15 (explainers/lexical.html): the verdicts, '
        'intervals, controls and arm values of the decisive record (run at 6b6ec09, committed in 5d32f47), tuning, and the dry '
        'runs\' sealed values (A13.13).',
        '// Generated by reference/golden/make_stage2_view_v1.py from reference/results/claims-stage2.json, stage2-manifest.json, '
        'tuning-stage2.json, reference/settings-stage2.json, results/dry/claims-stage2.json and the two opened sealed files (results/dry/stage2-sealed/); '
        'do not edit (--check compares).',
        f'// The JSON text: {len(text)} bytes, sha256 {sha_bytes(text.encode())}. Metric values only; no pair, rating, label or '
        'vector of any data set.',
        f'// Registers the JSON text as LexiconData.{NAME}; the page checks its SHA-256, applies each registered rule to the '
        'cells again and fills every number from "values".',
        '(function (root, name, text) {',
        '    if (typeof module === \'object\' && module.exports) module.exports = { [name]: text };',
        '    else root.LexiconData = Object.assign(root.LexiconData || {}, { [name]: text });',
        f'}})(typeof self !== \'undefined\' ? self : this, \'{NAME}\', [',
        *[literal(c) + ',' for c in chunks],
        '].join(\'\'));',
        '',
    ]
    return '\n'.join(out)


DATA_V = re.compile(r'<([a-z][a-z0-9]*)\b[^>]*\bdata-v="([^"]+)"[^>]*>(.*?)</\1>', re.S)


def check_page(values, text):
    """The page's numbers as written: every data-v element holds plain text equal to its value's display text, and the
    pin on the page's panel (data-json-sha) is this JSON text's SHA-256."""
    if not os.path.exists(PAGE):
        return None, []
    src = open(PAGE, encoding='utf-8').read()
    found = list(DATA_V.finditer(src))
    bad = []
    pins = re.findall(r'data-json-sha="([0-9a-f]*)"', src)
    if pins != [sha_bytes(text.encode())]:
        bad.append(f'the panel\'s data-json-sha {pins} is not the JSON text\'s SHA-256 {sha_bytes(text.encode())}')
    if len(found) != src.count('data-v="'):
        bad.append(f'{src.count("data-v=") - len(found)} data-v attributes not on a simple element')
    for m in found:
        key, inner = m.group(2), m.group(3)
        if '<' in inner:
            bad.append(f'{key}: markup inside')
        elif key not in values:
            bad.append(f'{key}: no such value')
        elif html.unescape(inner) != values[key][0]:
            bad.append(f'{key}: the page has {html.unescape(inner)!r}, the view {values[key][0]!r}')
    return len(found), bad


def main():
    if '--copy-sealed' in sys.argv[1:]:
        return copy_sealed()
    built = build()
    if built is None:
        print(f'skipped: a committed sealed copy is missing ({SRC["seal"]}, {SRC["seal1"]})', file=sys.stderr)
        return 2
    js, text, values = built
    data = js.encode('ascii')
    digest = sha_bytes(data)
    if '--check' in sys.argv[1:]:
        same = os.path.exists(OUT) and open(OUT, 'rb').read() == data
        n, bad = check_page(values, text)
        print(f'{"ok  " if same else "MISMATCH"}  data/stage2_view_v1.js ({len(data)} B, sha256 {digest[:16]}...; '
              f'JSON text sha256 {sha_bytes(text.encode())[:16]}...; {len(values)} values)')
        if n is not None:
            print(f'{"ok  " if not bad else "MISMATCH"}  explainers/lexical.html: {n} numbers written as the view has them'
                  + ''.join(f'\n    {b}' for b in bad[:20]))
        return 0 if same and not bad else 1
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'wb') as f:
        f.write(data)
    print(f'wrote data/stage2_view_v1.js: {len(data)} B, sha256 {digest}; JSON text {len(text)} B, sha256 '
          f'{sha_bytes(text.encode())}; {len(values)} values')
    return 0


if __name__ == '__main__':
    sys.exit(main())
