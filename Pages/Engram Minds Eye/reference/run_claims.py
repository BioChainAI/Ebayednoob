#!/usr/bin/env python3
"""Runs the preregistered claims E1-E9 (../PREREGISTRATION.md, with Amendment 1) and writes the decisions.

    python3 run_claims.py                 every claim; results/claims.json and results/claims.md
    python3 run_claims.py E2 E6           only these claims (written to results/claims-<names>.json)
    python3 run_claims.py --dry           a dry run: every seed moved up by 8000 and every set made small, so the
                                          code is exercised without touching a registered instance (nothing written)

Needs numpy, and Node for E1's check against the Owl-Academy checkout (reported, not decisive). Torch is not
needed. Every case is counted, every failure is kept as a counterexample (the first 20), and every control is run:
an exact claim whose control passes is reported as void.
"""
import json
import math
import os
import platform
import shutil
import subprocess
import sys
import time
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import engram  # noqa: E402
from engram import address as A, clock as C, dialogue as Dg, orbital as O, recall as RC, ttmpt as T, watch as W  # noqa: E402
from engram.memory import Word  # noqa: E402
from engram.session import Session  # noqa: E402
from engram.stats import ci_mean  # noqa: E402
from hpstep.prng import Rng  # noqa: E402
from hpstep.problems import INV, word_quaternion, right_divide  # noqa: E402

KEEP = 20
DRY = '--dry' in sys.argv
OFF = 8000 if DRY else 0                          # seed offset of a dry run


def few(n, small):
    return small if DRY else n


if DRY:                                          # dry runs never use a registered dialogue
    Dg.SYNTHETIC_SEEDS = [9100, 9101]
    Dg.golden_session = lambda: Dg.synthetic(9200)
    _not_dialogue = [e['input'] for k in ('letters', 'concepts', 'window', 'edge') for e in Dg.golden()['sets'][k]]
    Dg.store = lambda: [t for t in dict.fromkeys(_not_dialogue) if t]   # not the registered store


def exact_decision(failures, control_failed=True):
    if not control_failed:
        return 'void'
    return 'supported' if failures == 0 else 'refuted'


def rand64(rng):
    return (rng.next_u32() << 32) | rng.next_u32()


def combine(*decisions):
    if 'refuted' in decisions:
        return 'refuted'
    if 'void' in decisions:
        return 'void'
    return 'supported' if all(d == 'supported' for d in decisions) else 'inconclusive'


# ---------------------------------------------------------------- E1
def run_e1():
    G = Dg.golden()
    fails, cases = [], 0
    for name, entries in G['sets'].items():
        for e in entries:
            g = T.crystallize(e['input'])
            mine = {'hex_lsb': T.hex_lsb(g), 'seed64': T.hex64(T.pack_grid64(g)), 'chiral_key': T.chiral_key(e['input']),
                    'j_num': T.j_num(g), 'bits': sum(g)}
            cases += 1
            bad = [k for k in mine if mine[k] != e[k]]
            if bad:
                fails.append({'set': name, 'input': e['input'], 'fields': bad})
    for t in G['tokenizers']:
        for which, fn in (('mind_eye', T.tokenize), ('biomesh', T.tokenize_biomesh)):
            cases += 1
            if fn(t['text']) != t[which]:
                fails.append({'tokenizer': which, 'text': t['text'][:40]})
    s = G['biomesh_stream']
    cases += 1
    if T.engram_stream(s['text']) != {'stream': s['stream'], 'count': s['count'], 'meanJ': s['meanJ']}:
        fails.append({'stream': 'mismatch'})
    pc = G['packet_chain']
    chain = T.PacketChain()
    for turn in pc['turns']:
        chain.log_tokens(turn['text'], turn['source'])
    for mine, g in zip(chain.packets, pc['packets']):
        cases += 1
        same = (mine['token'], mine['header'], T.hex64(mine['seed64']), mine['footer'], mine['tri'], T.CONCEPT_NAMES[mine['concept']]) == \
            (g['token'], g['header'], g['seed64'], g['footer'], (g['tri']['alpha'], g['tri']['beta'], g['tri']['gamma']), g['tri']['concept'])
        if not same:
            fails.append({'packet': g['index']})
    cases += 1
    if len(chain.packets) != len(pc['packets']) or T.hex32(chain.parity) != pc['final_parity']:
        fails.append({'final_parity': T.hex32(chain.parity)})
    entries = [e for es in G['sets'].values() for e in es]
    amended = sum(1 for e in entries if T.hex_lsb(T.crystallize(e['input'], inc=0x6D2B79F7)) != e['hex_lsb'])
    registered = sum(1 for e in entries if T.hex_lsb(T.crystallize(e['input'], mult=37)) != e['hex_lsb'])
    owl = {'ran': False}
    script = os.path.join(engram.REFERENCE, 'golden', 'make_golden_v1.cjs')
    owl_dir = os.path.join(engram.REPO, '..', 'Owl-Academy')
    if shutil.which('node') and os.path.isdir(owl_dir):
        p = subprocess.run(['node', script, owl_dir, '--check'], capture_output=True, text=True)
        owl = {'ran': True, 'matches': p.returncode == 0, 'output': p.stdout.strip() or p.stderr.strip()}
    return {'decision': exact_decision(len(fails), amended > 0), 'cases': cases, 'failures': len(fails), 'counterexamples': fails[:KEEP],
            'control': {'amended: Mulberry32 increment 0x6D2B79F7, entries that differ': amended,
                        'registered (void): multiplier 37, entries that differ': registered},
            'reported': {'owl_academy_check': owl}}


# ---------------------------------------------------------------- E2
def e2_values(K, c):
    if c % 2 == 0:
        rng = Rng(1000 + OFF + c)
        return [rand64(rng) for _ in range(K)], 'random'
    S, j = Dg.store(), c // 2
    start = (j * K + OFF) % len(S)
    return [T.pack_grid64(T.crystallize(S[(start + t) % len(S)])) for t in range(K)], 'dialogue'


def run_e2():
    fails, cases, rows, ctrl_a, ctrl_a_n, ctrl_b, ctrl_b_n = [], 0, [], 0, 0, 0, 0
    for K, n in ((1, few(20, 2)), (2, few(20, 2)), (10, few(20, 2)), (72, few(20, 2)), (720, few(5, 1))):
        for c in range(n):
            vals, kind = e2_values(K, c)
            t0 = time.time()
            word = A.chain_word(vals)
            q = word_quaternion(word)
            ok_norm = A.norm(q) == 5 ** (A.L * K)
            back = A.unfold(q, K)
            secs = time.time() - t0
            cases += 1
            if not (ok_norm and back == vals):
                fails.append({'K': K, 'chain': c, 'kind': kind, 'norm_ok': ok_norm})
            bits = max(abs(x).bit_length() for x in q)
            rows.append({'K': K, 'chain': c, 'kind': kind, 'bits_per_component': bits, 'bits_per_packet': round(4 * bits / K, 2), 'seconds': round(secs, 3)})
            if K <= 72:
                rng = Rng(3000 + OFF + c)
                bad = [INV[word[-1]]]
                bad += A.encode(rand64(rng), bad)[:A.L - 1]
                ctrl_a_n += 1
                if A.unfold(word_quaternion(word + bad), K + 1) is None:
                    ctrl_a += 1
            if K >= 2:
                i = 0
                j = next((t for t in range(K - 1, 0, -1) if vals[t] != vals[i]), None)
                if j is not None:
                    sw = vals[:]
                    sw[i], sw[j] = sw[j], sw[i]
                    ctrl_b_n += 1
                    if A.chain_quaternion(sw) != q:
                        ctrl_b += 1
    by_k = {}
    for r in rows:
        b = by_k.setdefault(r['K'], {'chains': 0, 'max_bits_per_component': 0, 'bits_per_packet': [], 'seconds': 0.0})
        b['chains'] += 1
        b['max_bits_per_component'] = max(b['max_bits_per_component'], r['bits_per_component'])
        b['bits_per_packet'].append(r['bits_per_packet'])
        b['seconds'] += r['seconds']
    for b in by_k.values():
        b['bits_per_packet'] = [min(b['bits_per_packet']), max(b['bits_per_packet'])]
        b['seconds'] = round(b['seconds'] / b['chains'], 3)
    return {'decision': exact_decision(len(fails), ctrl_a > 0 and ctrl_b > 0), 'cases': cases, 'failures': len(fails), 'counterexamples': fails[:KEEP],
            'control': {'a: backtracking packet appended, recovery broken': f'{ctrl_a}/{ctrl_a_n}',
                        'b: two distinct packets swapped, quaternion changed': f'{ctrl_b}/{ctrl_b_n}'},
            'reported': {'by_length': by_k}}


# ---------------------------------------------------------------- E3
def window_sets():
    sets = {'golden': [], 'dialogues': [], 'random': []}
    g = Session(Dg.golden_session()).values
    sets['golden'] = [(g[i], g[i + 1], g[i + 2], i) for i in range(len(g) - 2)]
    for seed in Dg.SYNTHETIC_SEEDS:
        v = Session(Dg.synthetic(seed)).values
        sets['dialogues'] += [(v[i], v[i + 1], v[i + 2], i) for i in range(len(v) - 2)]
    for i in range(few(1000, 20)):
        rng = Rng(1000 + OFF + i)
        sets['random'].append((rand64(rng), rand64(rng), rand64(rng), i))
    return sets


def make_word(win):
    a, b, c, i = win
    return Word(a, b, c, addr=i % 30, F=24 * (i + 1))


def run_e3():
    sets = window_sets()
    single_fail, single_n, double_fail, double_n, same_pos_parity_fooled, same_pos_n = [], 0, [], 0, 0, 0
    for name, wins in sets.items():
        for win in wins:
            w = make_word(win)
            root0 = w.tau0[1]
            for j in range(4):
                orig = w.cells[j]
                for b in range(64):
                    single_n += 1
                    w.cells[j] = orig ^ (1 << b)
                    ok = not w.parity_ok()
                    loc = w.locate()
                    ok = ok and loc == j
                    rebuilt = w.rebuild(j)
                    ok = ok and rebuilt == orig
                    w.cells[j] = rebuilt
                    ok = ok and w.root() == root0
                    if not ok and len(single_fail) < KEEP:
                        single_fail.append({'set': name, 'window': win[3], 'cell': j, 'bit': b, 'located': loc})
                    elif not ok:
                        single_fail.append(None)
                    w.cells[j] = orig
        for i in range(few(200, 60)):
            rng = Rng(2000 + OFF + i)
            win = wins[rng.below(len(wins))]
            w = make_word(win)
            a, b = rng.sample(4, 2)
            p = rng.below(64)
            q = p if i < 50 else (p + 1 + rng.below(63)) % 64
            w.cells[a] ^= 1 << p
            w.cells[b] ^= 1 << q
            double_n += 1
            if i < 50:
                same_pos_n += 1
                if w.parity_ok():
                    same_pos_parity_fooled += 1
            detected = w.root() != w.tau0[1]
            status, _ = w.repair()
            if not (detected and status == 'refused' and w.root() != w.tau0[1]):
                double_fail.append({'set': name, 'i': i, 'cells': (a, b), 'bits': (p, q), 'status': status})
    fails = len([x for x in single_fail]) + len(double_fail)
    return {'decision': exact_decision(fails, same_pos_parity_fooled > 0), 'cases': single_n + double_n, 'failures': fails,
            'counterexamples': ([x for x in single_fail if x] + double_fail)[:KEEP],
            'control': {'parity alone fooled by same-position doubles': f'{same_pos_parity_fooled}/{same_pos_n}'},
            'reported': {'windows': {k: len(v) for k, v in sets.items()}, 'single_alterations': single_n, 'double_alterations': double_n}}


# ---------------------------------------------------------------- E4
def unfolds(R, run):
    toks = [t for t, _ in R['packets']]
    prefix = A.chain_word(run.values[:toks[0]])
    word = right_divide(R['packet_q'], A.L * len(toks))
    if word is None:
        return False
    pre, out = list(prefix), []
    for k in range(len(toks)):
        seg = word[k * A.L:(k + 1) * A.L]
        try:
            out.append(A.decode(seg, pre))
        except ValueError:
            return False
        pre += seg
    return out == [run.values[t] for t in toks]


def run_e4():
    fails, n, swap_broken, swap_n, repl_broken, repl_n, partial, hold, unfold_ok = [], 0, 0, 0, 0, 0, [], [], 0
    for seed in Dg.SYNTHETIC_SEEDS:
        run = Session(Dg.synthetic(seed))
        for R in run.registers:
            if not R['complete']:
                partial.append({'dialogue': seed, 'register': R['r'], 'packets': len(R['packets'])})
                continue
            n += 1
            free = C.engagement(run.sched, R['r'], 'free')
            ok = C.telescopes(R) and all(p['closed'] and p['identity'] for p in free)
            if not ok:
                fails.append({'dialogue': seed, 'register': R['r']})
            hold.append([p['P'] for p in C.engagement(run.sched, R['r'], 'hold')])
            if unfolds(R, run):
                unfold_ok += 1
            nz = [m for m, b in enumerate(R['block_q']) if b != (1, 0, 0, 0)]
            if len(nz) >= 2:
                swap_n += 1
                sw = R['block_q'][:]
                a, b = nz[0], next((m for m in nz[1:] if sw[m] != sw[nz[0]]), nz[1])
                sw[a], sw[b] = sw[b], sw[a]
                if not C.telescopes(R, blocks=sw):
                    swap_broken += 1
            repl_n += 1
            rp = R['block_q'][:]
            first_tok = R['packets'][0][0]
            other = run.quats[(first_tok + len(R['packets'])) % len(run.quats)]
            m = nz[0]
            blk = [q for (t, q) in R['packets'] if C.place(run.sched[t]['off'])[1] == m]
            rp[m] = A.qprod([other] + blk[1:])
            if not C.telescopes(R, blocks=rp):
                repl_broken += 1
    return {'decision': exact_decision(len(fails), swap_broken > 0 and repl_broken > 0), 'cases': n, 'failures': len(fails),
            'counterexamples': fails[:KEEP],
            'control': {'two distinct non-identity blocks swapped, equality broken': f'{swap_broken}/{swap_n}',
                        'one packet replaced by another, equality broken': f'{repl_broken}/{repl_n}'},
            'reported': {'complete_registers': n, 'partial_registers': partial,
                         'hold_setting_P_per_channel': {'values': sorted({tuple(h) for h in hold}), 'expected': 360},
                         'register_products_that_unfold_to_their_packets': f'{unfold_ok}/{n}'}}


# ---------------------------------------------------------------- E5
def run_e5():
    k1_fail, k1_checks, k2_fail, ctrl, runs = [], 0, [], 0, 0
    sessions = [('golden', Dg.golden_session())] + [(s, Dg.synthetic(s)) for s in Dg.SYNTHETIC_SEEDS]
    for name, turns in sessions:
        runs += 1
        on = Session(turns, coupler='carry')
        k1_checks += len(on.b_checks)
        bad = [e['F'] for e in on.coupler.log if not e['ok']]
        if bad:
            k1_fail.append({'session': name, 'zero_points': bad[:5]})
        if on.outputs() != Session(turns).outputs():
            k2_fail.append({'session': name})
        same = Session(turns, coupler='same')
        if not all(same.b_checks):
            ctrl += 1
    fails = len(k1_fail) + len(k2_fail)
    return {'decision': exact_decision(fails, ctrl > 0), 'cases': runs, 'failures': fails, 'counterexamples': (k1_fail + k2_fail)[:KEEP],
            'control': {'same chirality changed B in runs': f'{ctrl}/{runs}'},
            'reported': {'zero_points_checked': k1_checks, 'K1_failures': len(k1_fail), 'K2_failures': len(k2_fail)}}


# ---------------------------------------------------------------- E6
def run_e6():
    gfail, n = [], 0
    wrong_fail = 0
    R65 = range(65) if not DRY else range(65, 81, 5)                 # dry: values outside the registered 0..64
    for a in R65:
        for b in R65:
            for c in R65:
                n += 1
                A_, B_, C_ = Fraction(a), Fraction(b), Fraction(c)
                g = O.gauge_exact(A_, B_, C_)
                if not (g['recovered'] and ((g['X'] == 0 and g['Yc'] == 0) == (a == b == c))):
                    gfail.append({'triple': (a, b, c)})
                s, X, Y = A_ + B_ + C_, A_ - (B_ + C_) / 2, B_ + C_                     # the control: Y = b + c
                a2 = (s + 2 * X) / 3
                b2, c2 = (s - a2 + Y) / 2, (s - a2 - Y) / 2
                if not (a2 == A_ and b2 == B_ and c2 == C_):
                    wrong_fail += 1
    turns = [C.membrane_turn()] * 3
    triples = []
    triples += [tuple(p['tri']) for p in Session(Dg.golden_session()).chain.packets]
    for seed in Dg.SYNTHETIC_SEEDS:
        triples += [tuple(p['tri']) for p in Session(Dg.synthetic(seed)).chain.packets]
    n_footer = len(triples)
    triples += [(x, x, x) for x in (range(65) if not DRY else range(65, 70))]
    for i in range(few(5000, 50)):
        rng = Rng(1000 + OFF + i)
        triples.append((rng.below(65), rng.below(65), rng.below(65)))
    lfail, locks_footer = [], 0
    for k, t in enumerate(triples):
        r = O.readout([Fraction(v) for v in t], turns)
        lock = r['T']['lock']
        if k < n_footer and lock:
            locks_footer += 1
        if lock != (t[0] == t[1] == t[2]):
            lfail.append({'triple': t, 'lock': lock})
    fails = len(gfail) + len(lfail)
    return {'decision': exact_decision(fails, wrong_fail > 0), 'cases': n + len(triples), 'failures': fails,
            'counterexamples': (gfail + lfail)[:KEEP],
            'control': {'gauge with Y = b + c, triples it fails to recover': f'{wrong_fail}/{n}'},
            'reported': {'gauge_triples': n, 'lock_triples': len(triples), 'footer_triples': n_footer,
                         'footer_triples_that_lock': locks_footer, 'membrane_turn': str(C.membrane_turn())}}


# ---------------------------------------------------------------- E7
def run_e7():
    cells, settle_fail, examples = [], 0, []
    for L in (2, 3):
        for k in (5, 10):
            for d in (1, 2):
                rs = [W.e7_instance(L, k, d, 1000 + OFF + i) for i in range(few(50, 2))]
                det = [r['detection'] for r in rs]
                mean, ci = ci_mean(det)
                ff = sum(r['flagged_proper'] for r in rs) / sum(r['n_proper'] for r in rs)
                sf = sum(r['settle_fail'] for r in rs)
                settle_fail += sf
                if sf:
                    examples += [{'L': L, 'k': k, 'd': d, 'seed': r['seed']} for r in rs if r['settle_fail']][:5]
                cells.append({'L': L, 'k': k, 'd': d, 'detection': round(mean, 4), 'ci95': [round(x, 4) for x in ci],
                              'false_flag_rate': round(ff, 4), 'flags_settled': sum(len(r['flags']) for r in rs) - sf,
                              'flags': sum(len(r['flags']) for r in rs)})
    d2 = [c for c in cells if c['d'] == 2]
    if any(c['detection'] < 0.90 for c in d2):
        detect = 'refuted'
    elif all(c['detection'] >= 0.99 and c['ci95'][0] >= 0.95 for c in d2):
        detect = 'supported'
    else:
        detect = 'inconclusive'
    settle = exact_decision(settle_fail)
    return {'decision': combine(settle, detect), 'parts': {'settlement (exact)': settle, 'detection at d = 2 (statistical)': detect},
            'cases': sum(c['flags'] for c in cells), 'failures': settle_fail, 'counterexamples': examples[:KEEP],
            'reported': {'cells': cells,
                         'false_flags_by_depth': {L: round(sum(c['false_flag_rate'] for c in cells if c['L'] == L) / 4, 4) for L in (2, 3)}}}


# ---------------------------------------------------------------- E8
def run_e8():
    pts = W.depth2_points()
    rs = [W.e8_instance(i + OFF, pts=pts) for i in range(few(50, 3))]
    clean_fail = [r['i'] for r in rs if r['clean_bad'] > 0 or r['clean_worst'] > math.log(2) + 1e-9]
    rates = {}
    for delta in (0.5, 1.0, 1.5, 3.0):
        hits = [1.0 if r['blame'][delta]['hit'] else 0.0 for r in rs]
        mean, ci = ci_mean(hits)
        rates[delta] = {'rate': round(mean, 4), 'ci95': [round(x, 4) for x in ci], 'quads_above_ln2_median': sorted(r['blame'][delta]['bad'] for r in rs)[len(rs) // 2]}
    dec = [rates[d] for d in (1.5, 3.0)]
    if any(x['rate'] < 0.90 for x in dec):
        blame = 'refuted'
    elif all(x['rate'] >= 0.99 and x['ci95'][0] >= 0.95 for x in dec):
        blame = 'supported'
    else:
        blame = 'inconclusive'
    clean = exact_decision(len(clean_fail))
    return {'decision': combine(clean, blame), 'parts': {'clean bound (exact)': clean, 'blame at 1.5 and 3.0 (statistical)': blame},
            'cases': len(rs), 'failures': len(clean_fail), 'counterexamples': [{'instance': i} for i in clean_fail][:KEEP],
            'reported': {'blame_by_delta': {str(k): v for k, v in rates.items()},
                         'clean_worst_defect_max': max(r['clean_worst'] for r in rs)}}


# ---------------------------------------------------------------- E9
def run_e9():
    S = Dg.store()
    keys = [RC.key(t) for t in S]
    shared = {k: keys.count(k) for k in set(keys)}
    a_fail, a_n = [], 0
    for i, t in enumerate(S):
        for v in RC.parity_variants(t):
            a_n += 1
            kv = RC.key(v)
            h = RC.hit(kv, keys, i)
            if RC.distance(kv, keys[i]) != 0 or h != 1 / shared[keys[i]]:
                a_fail.append({'token': t, 'variant': v, 'hit': h})
    control = RC.shuffled(keys, 7 + OFF)
    diffs, he, hc, nq = [], [], [], 0
    for i, t in enumerate(S):
        if RC.letter_count(t) < 3:
            continue
        for v in RC.substitutions(t, 1000 + OFF + i):
            kv = RC.key(v)
            x, y = RC.hit(kv, keys, i), RC.hit(kv, control, i)
            diffs.append(x - y)
            he.append(x)
            hc.append(y)
            nq += 1
    mean, ci = ci_mean(diffs)
    if ci[0] >= -0.05 and ci[1] <= 0.05:
        b = 'supported'
    elif ci[0] > 0.05:
        b = 'refuted'
    else:
        b = 'inconclusive'
    a = exact_decision(len(a_fail))
    return {'decision': combine(a, b), 'parts': {'E9a parity-keeping variants (exact)': a, 'E9b one-letter substitutions (equivalence)': b},
            'cases': a_n + nq, 'failures': len(a_fail), 'counterexamples': a_fail[:KEEP],
            'reported': {'store_tokens': len(S), 'distinct_keys': len(shared), 'E9a_queries': a_n, 'E9b_queries': nq,
                         'E9b_recall_engram': round(sum(he) / nq, 4), 'E9b_recall_shuffled': round(sum(hc) / nq, 4),
                         'E9b_difference': round(mean, 4), 'E9b_ci95': [round(x, 4) for x in ci], 'chance': round(1 / len(S), 4)}}


CLAIMS = {'E1': run_e1, 'E2': run_e2, 'E3': run_e3, 'E4': run_e4, 'E5': run_e5, 'E6': run_e6, 'E7': run_e7, 'E8': run_e8, 'E9': run_e9}


def main(argv):
    argv = [a for a in argv if a != '--dry']
    names = [a.upper() for a in argv] or list(CLAIMS)
    out = {'preregistration': 'PREREGISTRATION.md with Amendment 1', 'started': time.strftime('%Y-%m-%d %H:%M:%S %Z'),
           'environment': {'python': platform.python_version(), 'platform': platform.platform()}, 'claims': {}}
    try:
        import numpy
        out['environment']['numpy'] = numpy.__version__
    except ImportError:
        pass
    for name in names:
        t0 = time.time()
        r = CLAIMS[name]()
        r['seconds'] = round(time.time() - t0, 1)
        out['claims'][name] = r
        parts = ''.join(f'\n      {k}: {v}' for k, v in r.get('parts', {}).items())
        print(f'{name}: {r["decision"].upper()}  ({r["cases"]} cases, {r["failures"]} failures, {r["seconds"]} s){parts}', flush=True)
    if DRY:
        print('dry run: nothing written')
        return
    os.makedirs(os.path.join(HERE, 'results'), exist_ok=True)
    stem = 'claims' if not argv else 'claims-' + '-'.join(names)
    with open(os.path.join(HERE, 'results', stem + '.json'), 'w') as f:
        json.dump(out, f, indent=1, default=str)
    lines = ['# Engram Mind\'s Eye: preregistered claims', '', f'Run {out["started"]}, Python {out["environment"]["python"]}.', '',
             '| Claim | Decision | Cases | Failures | Controls |', '| --- | --- | --- | --- | --- |']
    for name, r in out['claims'].items():
        ctrl = '; '.join(f'{k}: {v}' for k, v in r.get('control', {}).items()) or '—'
        dec = r['decision'] + (' (' + ', '.join(f'{k}: {v}' for k, v in r['parts'].items()) + ')' if 'parts' in r else '')
        lines.append(f'| {name} | {dec} | {r["cases"]} | {r["failures"]} | {ctrl} |')
    with open(os.path.join(HERE, 'results', stem + '.md'), 'w') as f:
        f.write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main(sys.argv[1:])
