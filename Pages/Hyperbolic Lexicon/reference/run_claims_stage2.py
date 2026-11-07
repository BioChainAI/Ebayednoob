#!/usr/bin/env python3
"""Runs Stage 2 of ../PREREGISTRATION.md: Amendment 13 (cited A13.n), the lexical claims L12-L15, with Amendment 10's
trainer (A10.n) for L14. Build spec sections 9, 11, 12, 14 and 16.

    python3 -B -I run_claims_stage2.py --time [--workers 4]   the timing projection (A13.16): two epochs of each L14
                                                              cell on U_@, four at once, seeds 95500 + i, no
                                                              evaluation; projects the registered total and the disk
                                                              and refuses (exit 1) above 11 h or past the free disk
                                                              less 2 GB: results/stage2-time.json and its console
    python3 -B -I run_claims_stage2.py --dry [--allow-dirty]  the dry run (A13.13; A13.15 step 3): WordNet's verbs,
                                                              every seed + 3000; dry tuning (48 runs), its settings,
                                                              then the dry decisive run: results/dry/, with every value
                                                              on a human-rated set sealed in the cache
    python3 -B -I run_claims_stage2.py --tune                 registered tuning (A13.10.5; A13.15 step 5): HiT val only;
                                                              results/tuning-stage2.json and its console
    python3 -B -I run_claims_stage2.py --write-settings       settings-stage2.json from results/tuning-stage2.json;
                                                              prints its SHA-256 for the lr-freeze amendment (step 6)
    python3 -B -I run_claims_stage2.py --decisive             the decisive run (A13.15 step 7): results/
                                                              claims-stage2.json and .md, lbench-stage2.txt,
                                                              stage2-manifest.json, stage2-codes/, stage2-tables/,
                                                              stage2-console.txt
    python3 -B -I run_claims_stage2.py --selftest --out DIR [--dry]
                                                              the whole pipeline (time, tune, settings, decisive) on a
                                                              synthetic world (tests/stage2_synth.py) with seeds
                                                              95200 + i and a reduced bootstrap; written under DIR only
                                                              (outside the repository), never under results/; --dry
                                                              runs the dry run's shape (verbs, sealing). It decides
                                                              nothing.

Options: --workers W (default 4, at most 4: A10.1 and spec section 0), --allow-dirty (dry only: a tree with other
changes, the record marked "development run: not a registered run").

Hygiene (A13.2: "parsing runs under python3 -B -I with explicit paths"). --time, --dry, --tune and --decisive read the
pinned downloads (or, for --time, the store and WordNet) and refuse unless the interpreter runs with -B and -I (-I:
no PYTHONPATH, no user site-packages, no script-relative or working-directory path but this folder, which the runner
puts on sys.path itself); the spawn pool passes both flags on to its workers. Every start records the interpreter's
flags. The self-test reads only its synthetic world, so it runs either way (the tests call it in-process).

How it runs.
- The five thread variables are 1 before numpy is imported (A10.1). The main process never imports numba: training
  runs in a spawn pool, one single-threaded process per job; the scoring of pass 1 runs in a fork pool. Every output is
  a function of its job alone and is sorted by job, never by completion.
- Blind two-pass scoring (A13.8; spec section 9). Pass 1 reads the word, POS, MEN tag and fold columns and HiT's names
  (the functions marked @pass1, which call stage2data's word readers only), scores every (instance, arm, score form,
  sense rule, table), and writes a gzip TSV of tie-class codes keyed by row number, the SHA-256 of the stream of its
  120-digit values (str() and LF each, in row order) and a side file of the values that took the 240-digit path or sit
  in a numerical tie, with their input tuples. Pass 2 opens the gold, runs the count checks that need it, selects
  label-chosen rows (BD-dir's True rows; the dry hyp rows), reads each pass-1 file only after checking its SHA-256
  against the run record, and computes every metric, control and decision.
- Resume (A13.15 step 7; A10.14). Each finished job appends a line to runs.jsonl in the cache (lexicon.CACHE/
  stage2-run/<mode>/); a restart at the same HEAD and configuration reuses the lines whose files still have their
  recorded SHA-256s. Every start is listed with its environment and load average, and the console file is appended to.
- Registered tuning and the decisive run refuse an unclean tree (run_claims_phase4's clean-tree and HEAD helpers, over
  the same scope), check it again before each pool and before writing, and refuse until the definitions amendment
  holds the instance manifest's SHA-256 (A13.2, A13.15 step 4). The decisive run also refuses unless the only paths
  changed since tuning's commit are PREREGISTRATION.md, settings-stage2.json, tuning-stage2.json and tuning's console,
  and unless the lr-freeze amendment holds settings-stage2.json's SHA-256 (A13.15 steps 6 and 7).
- The load average is recorded at every start, at every phase and at least every 10 minutes while a pool runs
  (spec section 0). Before --dry, --tune and --decisive the disk pre-flight projects the bytes to write and refuses
  above the free space less 2 GB (A13.8); registered tuning also refuses without a timing projection within 11 h
  (A13.16; spec section 16).

READINGs of this runner are marked "READING" here and collected in each record (readings[]); each cites the A13 or
A10 item it implements. The modules' own READINGs are marked in lexicon/{stage2data,senses,hit,glove,wngraph,
scores2,stats2,embed,stream}.py.
"""
import os

THREAD_VARS = ('OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'OMP_NUM_THREADS', 'NUMEXPR_NUM_THREADS',
               'NUMBA_NUM_THREADS')
for _v in THREAD_VARS:                      # A10.1: before numpy is imported, here and in every worker
    os.environ[_v] = '1'
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'
import sys  # noqa: E402

sys.set_int_max_str_digits(0)               # exact sums of squares and rationals run to thousands of digits

import argparse  # noqa: E402
import ast  # noqa: E402
import functools  # noqa: E402
import gzip  # noqa: E402
import hashlib  # noqa: E402
import inspect  # noqa: E402
import io  # noqa: E402
import json  # noqa: E402
import math  # noqa: E402
import multiprocessing  # noqa: E402
import re  # noqa: E402
import shutil  # noqa: E402
import textwrap  # noqa: E402
import time  # noqa: E402
import traceback  # noqa: E402
from concurrent.futures import FIRST_COMPLETED, ProcessPoolExecutor, wait  # noqa: E402
from dataclasses import dataclass, field, replace  # noqa: E402
from fractions import Fraction  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
TESTS = os.path.join(HERE, 'tests')
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import lexicon  # noqa: E402  (puts hpstep on sys.path)
import numpy as np  # noqa: E402
import run_claims_phase4 as P4  # noqa: E402  (the clean-tree and HEAD checks, the console, runs.jsonl, JSON, gzip)
from lexicon import address as AD  # noqa: E402
from lexicon import embed as EM  # noqa: E402
from lexicon import glove as GL  # noqa: E402
from lexicon import hit as HIT  # noqa: E402
from lexicon import l6  # noqa: E402
from lexicon import learned as LR  # noqa: E402
from lexicon import pystream as PS  # noqa: E402
from lexicon import rank as RK  # noqa: E402
from lexicon import scores2 as SC  # noqa: E402
from lexicon import senses as SE  # noqa: E402
from lexicon import stage2data as S2D  # noqa: E402
from lexicon import stats2 as ST  # noqa: E402
from lexicon import wngraph as WG  # noqa: E402
from lexicon import wordnet as W  # noqa: E402

REPO, SYSTEM = P4.REPO, P4.SYSTEM
REL_SYS, REL_REF = P4.REL_SYS, P4.REL_REF
GIT_SCOPE = P4.GIT_SCOPE
Refused = P4.Refused
sha256 = P4.sha256
sha256_file = P4.sha256_file
write_atomic = P4.write_atomic
gz_bytes = P4.gz_bytes
utc_now = P4.utc_now
RUN_CACHE = os.path.join(lexicon.CACHE, 'stage2-run')
SEALED_REGISTERED = os.path.join(lexicon.CACHE, 'stage2', 'dry-sealed', 'values.json')   # spec section 14
MANIFEST_FILE = os.path.join(lexicon.GOLDEN, 'stage2_instances_v1.meta.json')

GRID = EM.GRID                                             # ('0.03', '0.1', '0.3', '1', '3', '10'): A13.10.5
CELLS = (('lorentz', 2), ('lorentz', 3), ('euclid', 2), ('euclid', 3))   # A13.10.4
MAX_WORKERS = 4                                            # spec section 0: four worker processes at most
BUDGET_HOURS = 11                                          # A13.16: the projection's limit
DISK_MARGIN = 2 * 10 ** 9                                  # A13.8: free space less 2 GB
CODE_LINE_BYTES = 6                                        # spec section 9: lines x 6 B for code files
LOAD_INTERVAL = 600                                        # spec section 0: the load average every 10 minutes
TIME_EPOCHS = 2                                            # A13.16: two epochs of each cell
TIME_SEEDS = tuple(range(95500, 95508))                    # A13.12: the timing projection's seeds, i < 8
TIME_LR = '1'
# A13.16's registered estimates (hours, 4 processes) for the rows the timing projection does not measure.
# READING (A13.16 with spec section 16, "project the registered total from its wall times with the replays and
# evaluations added"): the training rows (tuning, decisive training) and the replays are projected from the measured
# wall times; the exact arms, the two evaluations and the dry run keep A13.16's estimates; the timing projection itself
# counts at its own wall time. The total is compared with 11 h.
A13_16_HOURS = {'exact_arms': 0.5, 'tuning_evaluation': 0.1, 'decisive_evaluation': 0.6, 'dry_run': 1.0}
SNAP_LINE_BYTES = 30                                       # disk projection: a snapped line (offset and d integers)

FORMS_CERT = ('G', 'Grev', 'DepG', 'Dep', 'Groot')         # certified (decimal) forms
FORMS_KEY = ('Sym', 'dist', 'cos', 'LCh')                  # exact keys
FORMS_PLAIN = ('NK17', 'product')                          # reported, uncertified 120-digit values


# ================================================================ LBENCH/1, A13.14's Stage-2 layout
LBENCH2_FIELDS = ('instanceId', 'instanceSha', 'pairSetSha', 'arm', 'geometry', 'd', 'seed', 'lr', 'scoreForm',
                  'senseRule', 'protocolSha', 'settingsSha', 'budget', 'floatTableSha', 'snapSha', 'itemScoresSha',
                  'metric', 'metricSha', 'metricValue', 'track', 'engine', 'wallMs')
LBENCH2_CLAIMS = ('L12/1', 'L13/1', 'L14/1', 'L15/1', 'stage2/1')


def lbench2(claim, **fields):
    """One LBENCH/1 record in A13.14's Stage-2 layout: 'LBENCH/1|<claim>|' + the 22 fields of LBENCH2_FIELDS, 24
    pipe-separated fields in all. None is '-' (a field that does not apply); track defaults to 'cpu'. Returns (record,
    lowercase hex SHA-256 of its UTF-8 bytes)."""
    if claim not in LBENCH2_CLAIMS:
        raise ValueError(f'claim field {claim!r} is not a Stage-2 claim (A13.14)')
    fields = dict(fields)
    fields.setdefault('track', 'cpu')
    unknown, missing = set(fields) - set(LBENCH2_FIELDS), set(LBENCH2_FIELDS) - set(fields)
    if unknown or missing:
        raise ValueError(f'LBENCH/1 Stage-2 fields: unknown {sorted(unknown)}, missing {sorted(missing)}')
    vals = []
    for name in LBENCH2_FIELDS:
        v = fields[name]
        v = '-' if v is None else str(v)
        if v == '' or '|' in v or '\n' in v or '\r' in v:
            raise ValueError(f'LBENCH/1 field {name} = {v!r}: empty, or holds a separator')
        vals.append(v)
    rec = '|'.join(['LBENCH/1', claim] + vals)
    assert rec.count('|') == 23
    return rec, sha256(rec)


def parse_lbench(record):
    """The claim-field-selected parser (A13.14): 'L6/1' records by l6.parse_lbench (A10.12's 22 fields, unchanged),
    'L12/1' to 'L15/1' and 'stage2/1' by A13.14's 24 fields. Returns {field: text} with 'claim'."""
    f = record.split('|')
    if len(f) < 2 or f[0] != 'LBENCH/1':
        raise ValueError('not an LBENCH/1 record')
    if f[1] == 'L6/1':
        return dict(l6.parse_lbench(record), claim='L6/1')
    if f[1] in LBENCH2_CLAIMS:
        if len(f) != 24:
            raise ValueError(f'an LBENCH/1 {f[1]} record has 24 fields, not {len(f)}')
        return dict(zip(LBENCH2_FIELDS, f[2:]), claim=f[1])
    raise ValueError(f'unknown LBENCH/1 claim field {f[1]!r}')


def metric_text(v):
    """A13.14's metricSha text: rho as 'sab|saa|sbb'; AP, accuracy and mean RR as p/q in lowest terms."""
    if isinstance(v, ST.Rho):
        return v.text()
    v = Fraction(v)
    return f'{v.numerator}/{v.denominator}'


def metric_value(v):
    """A13.14's metricValue: format(float(value), '.6f')."""
    return format(float(v), '.6f')


def fstr(x):
    x = Fraction(x)
    return f'{x.numerator}/{x.denominator}'


# ================================================================ seeds (A13.12)
@dataclass(frozen=True)
class Seeds2:
    """Every seed a mode may draw (A13.12). Functions take the seed itself; the registered and dry values live only
    here and are drawn only in the step that uses them."""
    training: tuple           # L14 training seeds 0-4 (dry 3000-3004)
    tuning_base: int          # rate k of the grid trains on tuning_base + 2k and + 2k + 1 (A13.10.5)
    edge_floor: int           # edge pairs and floors Rng(2600 + s)
    within_row: int           # L14 control 1: Rng(2620)
    relabel: int              # L14 control 2: P = Rng(7)
    tail: int                 # the reported relabelling tail Rng(2700 + j)
    tail_count: int
    l14_gold: int             # Rng(2640 + i)
    sfull: int                # S-full Rng(2400 + i)
    w: int                    # W Rng(2420 + i)
    s3: int                   # S3 (reported) s3_words(words, 2000 + i)
    l12_gold: int
    l13_bd: int
    l13_wb: int
    l15_sl: int
    l15_men: int
    l15_wsr: int
    l15_hl: int
    l15_vec: int              # GloVe vector permutations Rng(2580 + i)
    hitr: tuple               # HIT-R Rng(1500), Rng(1501), Rng(1502); dry: the dry split Rng(4500)-Rng(4502)
    bootstrap: int            # numpy default_rng(7) for every interval
    suite: int                # the suite's RandomState(42), the protocol's constant (reported)
    time: tuple               # the timing projection's 95500 + i
    perms: int = 20
    s3_count: int = 5

    def tuning(self, k):
        """The two tuning seeds of rate k (A13.10.5: 9000 + 2k and 9001 + 2k)."""
        if not 0 <= k < len(GRID):
            raise ValueError(f'no grid rate {k}')
        return (self.tuning_base + 2 * k, self.tuning_base + 2 * k + 1)

    def all_drawn(self, grid=GRID):
        """Every seed value this configuration may draw (the self-test checks they lie in 95200..95499)."""
        out = set(self.training) | set(self.hitr) | set(self.time)
        for k in (GRID.index(r) for r in grid):
            out |= set(self.tuning(k))
        out |= {self.edge_floor + s for s in range(len(self.training))}
        out |= {self.within_row, self.relabel, self.bootstrap, self.suite}
        out |= {self.tail + j for j in range(self.tail_count)}
        for base in (self.l14_gold, self.sfull, self.w, self.l12_gold, self.l13_bd, self.l13_wb, self.l15_sl,
                     self.l15_men, self.l15_wsr, self.l15_hl, self.l15_vec):
            out |= {base + i for i in range(self.perms)}
        out |= {self.s3 + i for i in range(self.s3_count)}
        return out


REGISTERED = Seeds2(training=(0, 1, 2, 3, 4), tuning_base=9000, edge_floor=2600, within_row=2620, relabel=7, tail=2700,
                    tail_count=200, l14_gold=2640, sfull=2400, w=2420, s3=2000, l12_gold=2440, l13_bd=2460,
                    l13_wb=2480, l15_sl=2500, l15_men=2520, l15_wsr=2540, l15_hl=2560, l15_vec=2580,
                    hitr=(1500, 1501, 1502), bootstrap=7, suite=42, time=TIME_SEEDS)
DRY = Seeds2(training=(3000, 3001, 3002, 3003, 3004), tuning_base=12000, edge_floor=5600, within_row=5620,
             relabel=3007, tail=5700, tail_count=200, l14_gold=5640, sfull=5400, w=5420, s3=5000, l12_gold=5440,
             l13_bd=5460, l13_wb=5480, l15_sl=5500, l15_men=5520, l15_wsr=5540, l15_hl=5560, l15_vec=5580,
             hitr=(4500, 4501, 4502), bootstrap=7, suite=42, time=TIME_SEEDS)
# the self-test: unregistered seeds 95200 + i only (A13.12), each use its own block; tests/stage2_synth.py's world
# takes 95490-95499
SELFTEST_SEEDS = Seeds2(training=(95200, 95201, 95202, 95203, 95204), tuning_base=95210, edge_floor=95230,
                        within_row=95235, relabel=95236, tail=95237, tail_count=3, l14_gold=95240, sfull=95260,
                        w=95280, s3=95300, l12_gold=95305, l13_bd=95325, l13_wb=95345, l15_sl=95365, l15_men=95385,
                        l15_wsr=95405, l15_hl=95425, l15_vec=95445, hitr=(95465, 95466, 95467), bootstrap=95468,
                        suite=95469, time=(95470, 95471, 95472, 95473, 95474))
SELFTEST_GRID = ('0.3', '1')
SELFTEST_RESAMPLES = 400
SELFTEST_WORLD_SEED = 95499
SELFTEST_BANNER = ('SELFTEST: a synthetic world (tests/stage2_synth.py, seed 95499), unregistered seeds 95200 + i, '
                   'two rates, a bootstrap of 400 resamples: a check of the pipeline that decides nothing')


# ================================================================ configuration
@dataclass
class Cfg:
    mode: str                 # registered | dry | selftest
    shape: str                # noun (the registered instances) | verb (the dry run's, A13.13)
    seal: bool                # A13.13: values on human-rated sets go to the sealed file only
    workers: int
    allow_dirty: bool
    results: str
    cache: str
    sealed: str
    settings: str
    seeds: Seeds2
    grid: tuple
    cells: tuple
    epochs: int
    burnin: int
    resamples: int
    world_root: str = None    # the self-test's synthetic store
    load_interval: float = LOAD_INTERVAL
    reported: bool = True     # A13.11's reports (the self-test runs them too)

    @property
    def label_mode(self):
        return {'registered': 'registered', 'dry': 'dry run (A13.13)',
                'selftest': 'SELFTEST' + (' (the dry run\'s shape)' if self.shape == 'verb' else '')}[self.mode]

    @property
    def pos(self):
        return self.shape


def make_cfg(mode, workers=MAX_WORKERS, allow_dirty=False, out=None, shape=None):
    if mode == 'selftest':
        shape = shape or 'noun'
        out = os.path.abspath(out)
        res = os.path.join(out, 'results', 'dry') if shape == 'verb' else os.path.join(out, 'results')
        return Cfg('selftest', shape, shape == 'verb', workers, False, res, os.path.join(out, 'cache', shape),
                   os.path.join(out, 'cache', 'dry-sealed', 'values.json'), os.path.join(res, 'settings-stage2.json'),
                   SELFTEST_SEEDS, SELFTEST_GRID, CELLS, EM.EPOCHS, EM.BURNIN, SELFTEST_RESAMPLES,
                   world_root=os.path.join(out, 'world'), load_interval=5.0)
    if mode == 'dry':
        res = os.path.join(HERE, 'results', 'dry')
        return Cfg('dry', 'verb', True, workers, allow_dirty, res, os.path.join(RUN_CACHE, 'dry'), SEALED_REGISTERED,
                   os.path.join(res, 'settings-stage2.json'), DRY, GRID, CELLS, EM.EPOCHS, EM.BURNIN, ST.RESAMPLES)
    if mode == 'registered':
        res = os.path.join(HERE, 'results')
        return Cfg('registered', 'noun', False, workers, False, res, os.path.join(RUN_CACHE, 'registered'), None,
                   os.path.join(HERE, 'settings-stage2.json'), REGISTERED, GRID, CELLS, EM.EPOCHS, EM.BURNIN,
                   ST.RESAMPLES)
    raise ValueError(mode)


def paths(cfg, step):
    r = cfg.results
    if step == 'time':
        return {'json': os.path.join(r, 'stage2-time.json'), 'console': os.path.join(r, 'stage2-time-console.txt')}
    if step == 'tune':
        return {'json': os.path.join(r, 'tuning-stage2.json'), 'console': os.path.join(r, 'stage2-tuning-console.txt')}
    if step == 'decisive':
        return {'json': os.path.join(r, 'claims-stage2.json'), 'md': os.path.join(r, 'claims-stage2.md'),
                'console': os.path.join(r, 'stage2-console.txt'), 'lbench': os.path.join(r, 'lbench-stage2.txt'),
                'manifest': os.path.join(r, 'stage2-manifest.json'), 'codes': os.path.join(r, 'stage2-codes'),
                'tables': os.path.join(r, 'stage2-tables')}
    raise ValueError(step)


# ================================================================ the clean tree (run_claims_phase4's helpers)
def results_rel(mode):
    return REL_REF + '/results/' + ('dry/' if mode == 'dry' else '')


def own_outputs(mode, step):
    """The repository paths a step writes itself (allowed uncommitted, so that an interrupted run resumes); a name
    ending in '/' is a folder. The dry run writes results/dry/ only."""
    if mode == 'dry':
        return [results_rel('dry')]
    r = results_rel(mode)
    if step == 'time':
        return [r + 'stage2-time.json', r + 'stage2-time-console.txt']
    if step == 'tune':
        return [r + 'tuning-stage2.json', r + 'stage2-tuning-console.txt']
    if step == 'write-settings':
        return [REL_REF + '/settings-stage2.json', REL_SYS + '/PREREGISTRATION.md']
    if step == 'decisive':
        return [r + x for x in ('claims-stage2.json', 'claims-stage2.md', 'stage2-console.txt', 'lbench-stage2.txt',
                                'stage2-manifest.json', 'stage2-codes/', 'stage2-tables/')]
    raise ValueError(step)


def check_tree(mode, step, gs, allow_dirty):
    """None for a clean tree (own outputs aside); a development mark under --allow-dirty (dry only); otherwise Refused
    (A13.15 steps 5 and 7; P4.check_tree's rule with this runner's outputs). The self-test is never registered."""
    if mode == 'selftest':
        return 'selftest: not a registered run'
    if not gs['status_ok'] or gs['head'] is None:
        raise Refused('git status failed: the runner needs a git checkout')
    bad = [p for p in gs['changed'] if not P4._allowed(p, own_outputs(mode, step))]
    outside = gs.get('sys_path_outside_scope') or []
    if not bad and not outside:
        return None
    if allow_dirty and mode == 'dry':
        return 'development run: not a registered run'
    if bad:
        raise Refused(f'{len(bad)} uncommitted path(s) (A13.15: a clean, committed tree): ' + '; '.join(bad[:10]))
    raise Refused('sys.path holds folder(s) inside the repository that the clean-tree check does not cover: '
                  + '; '.join(outside))


def recheck_tree(cfg, ctx, where):
    """The clean-tree check again, HEAD included, before each pool and before writing; listed in ctx['git_checks']."""
    if cfg.mode == 'selftest':
        return
    gs = P4.git_state()
    ctx['git_checks'].append({'where': where, 'time': utc_now(), 'head': gs['head'], 'changed': gs['changed'],
                              'sys_path_outside_scope': gs['sys_path_outside_scope']})
    if gs['head'] != ctx['git']['head']:
        raise Refused(f'HEAD moved during the run ({where}): {ctx["git"]["head"]} at the start, {gs["head"]} now')
    mark = check_tree(cfg.mode, ctx['step'], gs, cfg.allow_dirty)
    if mark and not ctx['mark']:
        ctx['mark'] = mark
        ctx['log'](f'{where}: the tree changed during the run; the record is marked "{mark}"')


def frozen_in_amendment(prereg_text, sha, after):
    """The number of the one amendment section (after Amendment `after`) that holds the SHA-256 `sha`: A11.4's rule,
    which A13's notation names for the lr-freeze amendment and settings-stage2.json ("found by that hash as A11.4 found
    Amendment 11"); raises otherwise."""
    n = l6.freeze_amendment(prereg_text, sha)
    if n <= after:
        raise ValueError(f'the SHA-256 {sha[:12]}... is in Amendment {n}, not in an amendment after {after}')
    return n


def definitions_amendment(prereg_text, manifest_sha, after=13):
    """The number of the definitions amendment as the decisive run and registered tuning find it: the earliest
    amendment section after Amendment `after` whose text holds the instance manifest's SHA-256 (64 lowercase hex
    digits, not part of a longer hex run); raises if none does.
    READING (A13's notation, "the dated amendment of item 15 step 4 (Amendment 14 unless another comes first)", and
    A13.2, "the definitions amendment freezes it by its SHA-256 ... and the decisive run refuses another"): A13 names
    the definitions amendment by its place in the order of work, not by a hash count, and registers A11.4's
    exactly-one rule only for the lr-freeze amendment; so the first amendment after 13 that holds the manifest's
    SHA-256 is the one that froze it, and a later amendment (the lr-freeze amendment, an erratum) may restate the hash
    without refusing the run."""
    sha = manifest_sha.lower()
    if not re.fullmatch(r'[0-9a-f]{64}', sha):
        raise ValueError('not a SHA-256')
    pat = re.compile(r'(?<![0-9a-fA-F])' + sha + r'(?![0-9a-fA-F])')
    hits = sorted(n for n, sec in l6._sections(prereg_text) if n > after and pat.search('\n'.join(sec).lower()))
    if not hits:
        raise ValueError(f'the instance manifest\'s SHA-256 {sha[:12]}... is in no amendment after Amendment {after}')
    return hits[0]


# ================================================================ the load average (spec section 0)
class LoadLog:
    """os.getloadavg() at every start, at every phase and at least every `interval` seconds while a pool waits; each
    sample is logged and kept for the record. No thread: the pools poll it while they wait (a fork pool must not fork
    a process with a second thread)."""

    def __init__(self, log, interval):
        self.log, self.interval = log, interval
        self.samples = []
        self.last = None

    def sample(self, where):
        try:
            la = [round(x, 2) for x in os.getloadavg()]
        except OSError:                                      # pragma: no cover
            la = None
        self.samples.append({'time': utc_now(), 'where': where, 'loadavg': la})
        self.last = time.monotonic()
        self.log(f'load average {la} ({where})')
        return la

    def maybe(self, where):
        if self.last is None or time.monotonic() - self.last >= self.interval:
            self.sample(where)


# ================================================================ readings
def common_readings(rd):
    rd('stage2-runner-1', 'A13.15 steps 5 and 7, "refuses uncommitted changes": run_claims_phase4\'s git_state (git '
       'status --porcelain --no-renames over the system folder and the reference folders of Hyperbolic Oracles and '
       'Engram Mind\'s Eye, untracked files one by one, renames counting both paths) must list nothing but the step\'s '
       'own outputs; a sys.path entry inside the repository outside that scope is refused. The check, HEAD included, '
       'is repeated before each pool and before writing (git_checks). --allow-dirty exists for the dry run only and '
       'marks its record.')
    rd('stage2-runner-2', 'A13.15 step 7, "it resumes at the same HEAD from its finished jobs": a runs.jsonl line is '
       'reused only at the same HEAD and configuration signature (mode, shape, the pins, WordNet, epochs, burn-in, '
       'the seeds and the SHA-256 of the runner and lexicon modules), and only while every file it names still has its '
       'recorded SHA-256; anything else is rerun. Every '
       'start is listed with its environment and load average.')
    rd('stage2-runner-3', 'A13.8, the value stream: for certified forms the 120-digit Decimal\'s str(); for exact '
       'keys (Sym, the distance-only score, GloVe\'s key, WN and the word-tree integers) the key\'s str() (an int or '
       '"p/q"); for the reported uncertified forms (NK17, the product) the 120-digit Decimal\'s str(). A direction file '
       'streams each row\'s forward then reverse value; a HiT file streams each row\'s slots in slot order.')
    rd('stage2-runner-4', 'A13.14, itemScoresSha: the SHA-256 of the code file\'s uncompressed TSV bytes (gzip\'s '
       'bytes depend on the zlib build); the gzip file\'s own SHA-256 is the one checked before pass 2 reads it, and '
       'both are in stage2-manifest.json.')
    rd('stage2-runner-5', 'A13.14, scoreForm and senseRule fields (ASCII): G, Grev (Phi_G(y, x), L12 control 3), '
       'DepG (Dep°: Dep at G\'s senses), Dep, Sym, Groot, dist (the distance-only score), cos (GloVe), LCh, NK17, '
       'product; max, first, gensim; "-" where no senses are read (HiT, GloVe).')
    rd('stage2-runner-6', 'Spec section 0, "four worker processes at most": --workers is refused above 4; the replay '
       'shares the training pool, longest job first (A10\'s scheduling), so "a fifth slot when a core frees" is a '
       'slot of the same four.')
    for rid, text in RUNNER_READINGS:
        rd(rid, text)


RUNNER_READINGS = (
    ('stage2-runner-8', 'A13.16 with spec section 16, the projection: tuning (12 runs per cell) and decisive training '
     '(5 measured and 5 edge-shuffled runs per cell, the two pre-flight jobs) from the measured per-epoch wall times '
     'of two epochs per cell with four processes at once (lr 1, seeds 95500-95503), the two 1,000-epoch replays from a '
     'two-epoch replay (seed 95504), the projection\'s own wall time, and A13.16\'s estimates for the exact arms '
     '(0.5 h), the two evaluations (0.1 h, 0.6 h) and the dry run (1.0 h); the total is compared with 11 h. The disk '
     'projection is the code-file lines x 6 B plus every table (float .npy and snapped text).'),
    ('stage2-runner-9', 'A13.14, instanceId "names set, pin and slice": the instance manifest\'s names, with -at '
     '(L14(b), U_@), -glove (L15(b), L13 control 3), -dir (BD-dir), -random/-hard (HiT\'s settings) and -relabelled '
     '(L14 control 2) for the slices; the dry sets are named by their pins too (hyperlex-ccb4161-verbs, ...), and the '
     'dry split and HIT-R, built from WordNet, by wordnet30-verb-at-split-<val|test> and hit-r-wordnet30-noun-at-<...>, '
     'with the SHA-256 of their slot lines as instanceSha.'),
    ('stage2-runner-10', 'A13.13, the dry run names fewer sets than the registered decisions read: each decided slot '
     'without its own dry set takes the nearest dry set, marked stand-in: L13(b)\'s WB takes the HyperLex verb '
     'detection set (clusters by word1), L15(a)\'s MEN takes MEN\'s v-v rows (named for (b)), L15(b)\'s WSR takes '
     'SimLex\'s verbs within GloVe; all sealed. G_root is not read in the dry run (no entity.n.01 among the verbs).'),
    ('stage2-runner-11', 'A13.13, the dry split: hit.hit_r on the verb @ graph with Rng(4500)-Rng(4502) and its default '
     'n_val = floor(0.05 |T|) (1,092 for 21,840 indirect pairs).'),
    ('stage2-runner-12', 'A13.11, F1 under HiT\'s protocol (measured tables only), with A13.8 ("pass 2 ... computes '
     'every metric from pass 1\'s files alone") and A13.6 (one tie-class list "where a metric compares" values): the '
     'measured table\'s pass-1 job writes one code file of HiT val\'s and HiT test\'s G values together (val rows, then '
     'test rows, 21 slots, keyed val:<row> and test:<row>; its value-stream SHA-256 and side file as for every code '
     'file); pass 2 reads it after its SHA-256 check and computes F1 per setting (slot 0 the positive, the setting\'s '
     'other slots the negatives): theta the val code with the best val F1, ties to the smallest, a pair positive when '
     'its code is at least theta (stats2.f1_threshold); it decides nothing and has no LBENCH/1 record.'),
    ('stage2-runner-13', 'A13.15 step 7 with A10.14, "the same run": a restart that finds every tuning job finished and '
     'tuning-stage2.json already holding exactly these runs, files and choice leaves it and its settings unchanged.'),
    ('stage2-runner-14', 'Spec section 10, settings-stage2.json: the two geometry keys of the spec, each d a grid string '
     'or null, plus "tuning" naming tuning-stage2.json (path, HEAD, SHA-256) as A10.8\'s settings.json did.'),
    ('stage2-runner-15', 'A13.10.6, the tuning tables kept in the cache for controls 1-2: a missing one (or one whose '
     'snapped text lost its SHA-256) stops the decisive run; A10.9\'s retraining of a lost tuning table is not carried '
     'over, since A13 does not register it.'),
    ('stage2-runner-16', 'A13 L13 control 3: an empty GloVe direction set (no True row within GloVe) is recorded as '
     'accuracy 0 with a flag; it cannot occur on the registered data.'),
    ('stage2-runner-17', 'A13 L14, presence and the decision rules: the seeds are indexed j = 0..4 (the training seed s '
     'itself in the registered run, 3000 + j in the dry run).'),
    ('stage2-runner-18', 'A13.3, the morphy rule ("only for words absent raw"): every HL pair-set word is in the index '
     'raw, so on HL the morphy rule\'s scores are the maximum\'s and are not recomputed; the number of HL words absent '
     'raw is recorded.'),
    ('stage2-runner-19', 'Spec section 8, the relabelling tail and |dRR|: G in binary64 by numpy\'s vectorised arccosh '
     'and sqrt (math.acosh may differ in the last bits; sqrt is correctly rounded in both), ties pessimistic; reported '
     'only.'),
    ('stage2-runner-20', 'A13.11, "the closure bit computed from WordNet in pass 1": some sense pairing (s, t) with t a '
     'strict @/@i ancestor of s (wngraph.WNGraph.anc), per row of HL, BD and WB, in each direction.'),
    ('stage2-runner-21', 'A13.7, the strongest permutation of a control: the largest point estimate of the permuted '
     'arm\'s own metric (rho, AP or direction accuracy, exact), ties to the smaller i; then one interval.'),
    ('stage2-runner-22', 'Spec section 0, the load average every 10 minutes: sampled at every start, at each phase\'s '
     'start and end, and while a pool waits (polled at most every 60 s, a sample once 10 minutes have passed); no '
     'thread, since a fork pool must not fork a process with a second thread.'),
    ('stage2-runner-23', 'A13.8, BD and BD-dir: the detection AP reads a tie-class list of the forward values alone, '
     'BD-dir one list of forward and reverse values of every covered row (both written by one pass-1 job from the same '
     'certified values); pass 2 selects the True rows (the dry run: TYPE hyp-1 to hyp-4).'),
    ('stage2-runner-24', 'A13.11, Nickel & Kiela 2018\'s diagnostic: rho (exact, average ranks) between r and '
     'sp/(sp + lp) over the nodes of U_@ (the dry run: the verb @ graph), sp the distance to the nearest root and lp '
     'the height, both on E (senses.sp_lp); r is ordered by |n|^2 for a learned table and by x0 for H3 and H2, read on '
     'the same nodes; "the tables" are every learned table of the run (tuning, measured, edge-shuffled, floors).'),
    ('stage2-runner-25', 'A13.11, "NK17 scores" (L14): each measured table scored by NK17 (A13.5, alpha 10^3, 120 '
     'digits, uncertified) on HiT test (21 slots: mean RR in both settings) and on HL within U_@ (rho), deciding '
     'nothing; a learned Euclidean table, which has no Poincare norm, is read with its Euclidean norm and distance '
     '(scores2.nk17_value), as P17 scored its Euclidean embeddings by eq. 8.'),
    ('stage2-runner-26', 'A13.11, "L14\'s tables on these rows" (L13): the measured tables read by G at o on BD, WB '
     'and BD-dir covered in U_@ (BD-at, WB-at, BD-dir-at; senses in U_@, as L14(b) reads HL), detection AP '
     '(pessimistic and sklearn\'s convention) and direction accuracy on the True rows, with the exact Lorentz - '
     'Euclidean differences per (d, seed); no interval. The instance manifest records the two U_@ pair sets.'),
    ('stage2-runner-27', 'A13.11, the suite\'s own detection protocol (L13): BD-suite and WB-suite hold the covered '
     'rows of the val and test folds in one tie-class list per arm (the six and WN, G with the maximum over senses); '
     'a test row the arm does not cover takes the code of its lowest in-vocabulary validation score (it ties with that '
     'class), and AP is taken over the whole test fold, pessimistic and in sklearn\'s convention '
     '(stats2.suite_detection); with no in-vocabulary validation row the lowest in-vocabulary test code stands in '
     '(flagged). The dry sets have no validation fold, so it does not run there.'),
    ('stage2-runner-28', 'A13.11, "the vocabulary each arm misses": per word-pair instance and per vocabulary an arm '
     'reads (the senses in the instance\'s universe; index.<pos> for W; GloVe 6B\'s words for GloVe), the word types '
     'of the rows the word-level selection kept that it misses, as a count, the SHA-256 of their N_S forms in '
     'code-point order and the rows holding one; no word is written (A13.2).'),
    ('stage2-runner-29', 'A13.11, "H3 against the learned tables on HL within U_@": rho(H3 G) - rho(table G) on HL-at '
     'for each measured table, with the word-level ci_rho and the row bootstrap beside it, as every difference of rho '
     '(A13.7); deciding nothing.'),
    ('stage2-runner-30', 'A13 L15 control 2, "for every arm and set": every arm of L15\'s Arms list on the sets it '
     'reads: on SL and MEN the six exact arms and the controls K3, S-full_i and W_i (each of the 20 permutations an '
     'arm, as A13.4 defines them), all with Sym; on MEN, WSR and HL within GloVe, H3 with Sym and GloVe 300-d. The '
     'readings the Arms list marks as reported (H3 with G against GloVe on HL; GloVe at 50-d) decide nothing and are '
     'not banded. stats2.decide_l15 refuses a control 2 that lacks one of these (arm, set) pairs.'),
    ('stage2-runner-31', 'A13\'s notation, "the definitions amendment is the dated amendment of item 15 step 4 '
     '(Amendment 14 unless another comes first)", with A13.2, "freezes it by its SHA-256": registered tuning and the '
     'decisive run find it as the earliest amendment after 13 whose text holds the instance manifest\'s SHA-256; a later '
     'amendment (the lr-freeze amendment, an erratum) may restate that hash. A11.4\'s exactly-one rule is kept for the '
     'lr-freeze amendment and settings-stage2.json only, as A13\'s notation registers it.'),
    ('stage2-runner-32', 'A13.2, "parsing runs under python3 -B -I with explicit paths": --time, --dry, --tune and '
     '--decisive refuse an interpreter without -B and -I (sys.flags); the runner puts its own folder on sys.path, and '
     'the spawn pool passes both flags on to its workers. The self-test (a synthetic world) and --write-settings (this '
     'project\'s own JSON) parse nothing fetched and are not held to it. Every start records the flags.'),
    ('stage2-runner-33', 'A13.8 and A13.11, the reported values that A13 defines outside pass 1\'s files of tie-class '
     'codes of an (instance, arm, form, rule, table): the 200 relabelled tails (L14 control 2, "computed in binary64"), '
     '|dRR| (against float64 scoring of the unsnapped table as stored), Nickel & Kiela 2018\'s diagnostic and the radius '
     'ranks of the seven labels under P (over WordNet\'s nodes, no Stage-2 row) are computed in pass 2 from the tables, '
     'each read only after its float or snapped SHA-256 matches the run record; none reads a gold, label or TYPE field, '
     'and each decides nothing. Named for the definitions amendment, since A13.8 says pass 2 computes every metric '
     'from pass 1\'s files alone.'),
)


class Readings:
    def __init__(self):
        self.items = []

    def __call__(self, rid, text):
        if all(x['id'] != rid for x in self.items):
            self.items.append({'id': rid, 'text': text})


# ================================================================ pass-1 marking (A13.8)
PASS1 = {}


def pass1(fn):
    """Marks a function of pass 1. tests/test_stage2_runner.py inspects every marked function: none may name a
    stage2data gold reader (S2D.GOLD_READERS), and at run time a spy refuses any gold read while pass 1 runs."""
    PASS1[fn.__name__] = fn
    return fn


def pass1_gold_references():
    """{function: [gold reader names it references]} over the @pass1 functions (import inspection, A13.8)."""
    gold = set(S2D.GOLD_READERS)
    out = {}
    for name, fn in PASS1.items():
        tree = ast.parse(textwrap.dedent(inspect.getsource(fn)))
        hits = sorted({n.attr for n in ast.walk(tree) if isinstance(n, ast.Attribute) and n.attr in gold}
                      | {n.id for n in ast.walk(tree) if isinstance(n, ast.Name) and n.id in gold})
        if hits:
            out[name] = hits
    return out


# ================================================================ the world: WordNet, the store, the shape
class World:
    """The data a mode reads: WordNet (or the self-test's synthetic lexicon), the pinned store, the part of speech
    and the counts it must reproduce. Everything here is word-level (no gold)."""

    def __init__(self, cfg, build=True):
        self.cfg = cfg
        self.pos = cfg.shape
        if cfg.mode == 'selftest':
            if TESTS not in sys.path:
                sys.path.insert(0, TESTS)
            import stage2_synth
            if build:
                sw = stage2_synth.make_world(cfg.world_root, SELFTEST_WORLD_SEED)
                self.wn, self.pins, self.expected = sw.wn, sw.pins, sw.expected
                os.makedirs(cfg.cache, exist_ok=True)
                write_atomic(os.path.join(cfg.world_root, 'pins.json'), json.dumps(self.pins, indent=1) + '\n')
            else:
                self.wn = stage2_synth.lexicon(SELFTEST_WORLD_SEED)
                with open(os.path.join(cfg.world_root, 'pins.json'), encoding='utf-8') as fh:
                    self.pins = json.load(fh)
                self.expected = None
            self.store = S2D.Store(root=cfg.world_root, pins=self.pins, verify=True)
            self.wordnet_sha = 'synthetic:' + str(SELFTEST_WORLD_SEED)
        else:
            self.wn = W.load()
            self.store = S2D.default_store()
            self.pins = self.store.pins
            self.expected = None
            self.wordnet_sha = W.ZIP_SHA256
        self._cache = {}

    def lazy(self, key, fn):
        if key not in self._cache:
            self._cache[key] = fn()
        return self._cache[key]

    @property
    def index(self):
        return self.wn['index'][self.pos]

    @property
    def U_full(self):
        return self.lazy('U_full', lambda: SE.universe_full(self.wn, self.pos))

    @property
    def offsets(self):
        return self.lazy('offsets', lambda: sorted(self.U_full))

    @property
    def at(self):
        return self.lazy('at', lambda: SE.at_graph(self.wn, self.pos))

    @property
    def U_at(self):
        return self.lazy('U_at', lambda: frozenset(self.at.nodes))

    @property
    def words(self):
        """L3's words of every synset of the part of speech (address.noun_words, or the verb forest's)."""
        return self.lazy('words', lambda: dict(AD.noun_words(self.wn) if self.pos == 'noun'
                                               else AD.verb_words(self.wn)))

    @property
    def root_word(self):
        return AD.NOUN_ROOT if self.pos == 'noun' else AD.VERB_ROOT

    @property
    def wn_graph(self):
        return self.lazy('wn_graph', lambda: WG.noun_graph(self.wn) if self.pos == 'noun' else WG.verb_graph(self.wn))

    @property
    def word_tree(self):
        return self.lazy('word_tree', lambda: WG.WordTree(self.words, self.root_word))

    def universe(self, name):
        return self.U_full if name == 'full' else self.U_at

    def pins_sha(self):
        return sha256(json.dumps(self.pins, sort_keys=True, separators=(',', ':')))


def code_sha():
    """The SHA-256 of the code a job runs: this runner and every lexicon module (so that a line written by other code
    is never reused, even at one HEAD with uncommitted changes, as in the self-test)."""
    h = hashlib.sha256()
    for p in [os.path.abspath(__file__)] + sorted(os.path.join(lexicon.HERE, f) for f in os.listdir(lexicon.HERE)
                                                  if f.endswith('.py')):
        with open(p, 'rb') as fh:
            h.update(os.path.basename(p).encode() + b'\0' + fh.read())
    return h.hexdigest()


def cfg_sig(cfg, world):
    """What a cached job line must share with this run to be reused (besides HEAD and the job key)."""
    return sha256(json.dumps({'mode': cfg.mode, 'shape': cfg.shape, 'pins': world.pins_sha(),
                              'wordnet': world.wordnet_sha, 'epochs': cfg.epochs, 'burnin': cfg.burnin,
                              'seeds': repr(cfg.seeds), 'grid': list(cfg.grid), 'code': code_sha()},
                             sort_keys=True))[:16]


# ================================================================ instances (pass 1: word fields only)
@dataclass
class Inst:
    """One instance of A13 (or A13.11's reports) as pass 1 sees it: the pair set (covered rows, file order) and its
    words. kind 'pair' scores Phi(x, y) per row; 'dir' scores Phi(x, y) and Phi(y, x) in one tie-class list; 'hit'
    scores a HiT row's slots in one list for the whole file."""
    name: str
    iid: str                  # LBENCH instanceId
    key: str                  # the store key whose SHA-256 is instanceSha
    sha: str
    claim: str
    metric: str               # rho | ap | acc | rr
    kind: str                 # pair | dir | hit
    universe: str             # full | at
    rows: list                # [(row, x, y)] of the pair set; HiT: [HitRow]
    glove: bool = False
    clusters: list = None     # per row, the cluster key (A13.7)
    gold: str = None          # pass 2's gold reader spec
    select: str = None        # pass 2's label selection: 'true' (BD-dir), 'hyp' (the dry direction set)
    sealed: bool = False      # A13.13
    perm_seed: int = None     # the gold or label permutations' base seed
    selected_rows: int = 0    # rows the word-level selection kept, before coverage
    slots: int = 21           # HiT: 21 (both settings) or 11 (the random setting)
    note: str = ''
    cand: list = None         # the rows the word-level selection kept, before coverage (A13.11's missed vocabulary)
    folds: dict = None        # the suite protocol's sets (BD-suite, WB-suite): {'val': [rows], 'oov_test': [rows]}

    @property
    def pair_rows(self):
        return [r.row for r in self.rows] if self.kind == 'hit' else [r for r, _, _ in self.rows]

    @property
    def pair_set_sha(self):
        return SE.rows_sha(self.pair_rows)

    def word_pairs(self):
        """Each row's (N_S x, N_S y): the word-level bootstrap's units (A13.7)."""
        return [(SE.N_S(x), SE.N_S(y)) for _, x, y in self.rows]


@pass1
def select_rows(rows, U, wn, pos, vocab=None):
    """The covered rows of [(row, x, y)] in U (and in GloVe's vocabulary), in file order (A13.3)."""
    keep = set(SE.covered_rows(rows, U, wn, vocab, pos))
    return [r for r in rows if r[0] in keep]


@pass1
def glove_vocabulary(world):
    """GloVe 6B 300-d's vocabulary (word-level; counting only)."""
    return world.lazy('vocab300', lambda: GL.vocabulary(300, world.store))


@pass1
def build_instances(cfg, world, log=print):
    """Every instance pass 1 scores, from the word readers alone (A13.8): {name: Inst}."""
    if world.pos == 'noun':
        return _noun_instances(cfg, world, log)
    return _verb_instances(cfg, world, log)


def _inst(world, name, iid, key, claim, metric, kind, universe, rows, **kw):
    if kw.get('cand') is not None:
        kw['cand'] = list(kw['cand'])
        kw.setdefault('selected_rows', len(kw['cand']))
    return Inst(name, iid, key, world.store.sha256(key), claim, metric, kind, universe, rows, **kw)


@pass1
def _at_variant(world, base, name, iid_suffix='-at', note=''):
    """L14's tables on an L13 set (A13.11, "L14's tables on these rows"): the base instance's covered rows that are
    covered in U_@ too, in file order, read with senses restricted to U_@ (as L14(b) reads HL); clusters, gold and
    selection as the base set's.
    READING (A13.11): a learned table holds points of U_@ only, so its pair set is the rows covered in U_@, as A13 L14
    gives HL-at for HL; only the measured tables are scored on them (the tables L14 decides on)."""
    rows = select_rows(base.rows, world.U_at, world.wn, world.pos)
    keep = {r for r, _, _ in rows}
    clusters = [k for (r, _, _), k in zip(base.rows, base.clusters) if r in keep] if base.clusters else None
    return replace(base, name=name, iid=base.iid + iid_suffix, claim='stage2/1', universe='at', rows=rows,
                   clusters=clusters, perm_seed=None, note=note or f'{base.name} covered in U_@ (A13.11)')


@pass1
def _suite_instance(world, name, iid, key, fold_rows, base_gold):
    """The suite's own detection protocol (A13.11, reported): one pair set holding the covered rows of the
    validation and test folds in file order, so that an arm's codes compare across the two folds (tie classes are
    ordinal within one list, A13.6); folds['val'] the covered validation rows, folds['oov_test'] the test rows not
    covered in U_full, which no arm of the protocol scores (they take the lowest in-vocabulary validation score in
    pass 2)."""
    cand = sorted((r, x, y) for r, x, y, f in fold_rows if f in ('val', 'test'))
    fold = {r: f for r, _, _, f in fold_rows}
    rows = select_rows(cand, world.U_full, world.wn, world.pos)
    cov = {r for r, _, _ in rows}
    folds = {'val': [r for r, _, _ in rows if fold[r] == 'val'],
             'oov_test': [r for r, _, _ in cand if fold[r] == 'test' and r not in cov]}
    return _inst(world, name, iid, key, 'stage2/1', 'ap', 'pair', 'full', rows, gold=base_gold, cand=cand,
                 folds=folds, note="the suite's own detection protocol (A13.11): val and test folds in one list")


@pass1
def _noun_instances(cfg, world, log):
    """The registered shape (A13: L12-L15 and item 11's reported sets; spec section 11's table)."""
    wn, store, seeds = world.wn, world.store, cfg.seeds
    Uf, Ua = world.U_full, world.U_at
    vocab = glove_vocabulary(world)
    out = {}

    def add(inst):
        out[inst.name] = inst

    hl = S2D.hyperlex_words('hyperlex-all', store)
    hn = [(r, x, y) for r, x, y, p in hl if p == 'N']
    hl_iid = 'hyperlex-ccb4161-nouns'
    add(_inst(world, 'HL', hl_iid, 'hyperlex-all', 'L12/1', 'rho', 'pair', 'full', select_rows(hn, Uf, wn, 'noun'),
              gold='hyperlex', perm_seed=seeds.l12_gold, cand=hn))
    # READING (A13.14, instanceId "names set, pin and slice"): the slices L14(b) (U_@) and L15(b) (in GloVe) add -at and
    # -glove to the manifest's instance name; BD-dir adds -dir; HiT's settings add -random or -hard (A13.14's example)
    add(_inst(world, 'HL-at', hl_iid + '-at', 'hyperlex-all', 'L14/1', 'rho', 'pair', 'at',
              select_rows(hn, Ua, wn, 'noun'), gold='hyperlex', perm_seed=seeds.l14_gold, cand=hn))
    add(_inst(world, 'HL-glove', hl_iid + '-glove', 'hyperlex-all', 'L15/1', 'rho', 'pair', 'full',
              select_rows(hn, Uf, wn, 'noun', vocab), glove=True, gold='hyperlex', perm_seed=seeds.l15_hl,
              cand=hn))
    bless = S2D.suite_words('bless', store)
    concepts = S2D.bless_concepts(store)
    bt = [(r, x, y) for r, x, y, f in bless if f == 'test']
    bd_rows = select_rows(bt, Uf, wn, 'noun')
    bd_iid = 'suite-6891e0e-bless-test'
    add(_inst(world, 'BD', bd_iid, 'bless', 'L13/1', 'ap', 'pair', 'full', bd_rows, clusters=[x for _, x, _ in bd_rows],
              gold='bless', perm_seed=seeds.l13_bd, cand=bt))
    add(_inst(world, 'BD-dir', bd_iid + '-dir', 'bless', 'L13/1', 'acc', 'dir', 'full', bd_rows,
              clusters=[x for _, x, _ in bd_rows], gold='bless', select='true', cand=bt))
    bdg = select_rows(bt, Uf, wn, 'noun', vocab)
    add(_inst(world, 'BD-dir-glove', bd_iid + '-dir-glove', 'bless', 'L13/1', 'acc', 'dir', 'full', bdg, glove=True,
              clusters=[x for _, x, _ in bdg], gold='bless', select='true', cand=bt))
    wb = S2D.suite_words('wbless', store)
    wt = [(r, x, y) for r, x, y, f in wb if f == 'test']
    wb_rows = select_rows(wt, Uf, wn, 'noun')
    add(_inst(world, 'WB', 'suite-6891e0e-wbless-test', 'wbless', 'L13/1', 'ap', 'pair', 'full', wb_rows,
              clusters=[S2D.wbless_cluster(x, y, concepts) for _, x, y in wb_rows], gold='wbless',
              perm_seed=seeds.l13_wb, cand=wt))
    sl = S2D.simlex_words(store)
    sn = [(r, x, y) for r, x, y, p in sl if p == 'N']
    add(_inst(world, 'SL', 'simlex-fda1b39-nouns', 'simlex', 'L15/1', 'rho', 'pair', 'full',
              select_rows(sn, Uf, wn, 'noun'), gold='simlex', perm_seed=seeds.l15_sl, cand=sn))
    men = S2D.men_words(store)
    mn = [(r, x, y) for r, x, tx, y, ty in men if tx == '-n' and ty == '-n']
    add(_inst(world, 'MEN', 'men-0d05a99-nn', 'men', 'L15/1', 'rho', 'pair', 'full', select_rows(mn, Uf, wn, 'noun'),
              gold='men', perm_seed=seeds.l15_men, cand=mn))
    add(_inst(world, 'MEN-glove', 'men-0d05a99-nn-glove', 'men', 'L15/1', 'rho', 'pair', 'full',
              select_rows(mn, Uf, wn, 'noun', vocab), glove=True, gold='men', perm_seed=seeds.l15_men,
              cand=mn))
    wsr = S2D.ws353_words('ws353-rel', store)
    add(_inst(world, 'WSR-glove', 'ws353-e2de627-rel-glove', 'ws353-rel', 'L15/1', 'rho', 'pair', 'full',
              select_rows(wsr, Uf, wn, 'noun', vocab), glove=True, gold='ws353-rel', perm_seed=seeds.l15_wsr,
              cand=wsr))
    add(_inst(world, 'WSR', 'ws353-e2de627-rel', 'ws353-rel', 'stage2/1', 'rho', 'pair', 'full',
              select_rows(wsr, Uf, wn, 'noun'), gold='ws353-rel', cand=wsr))
    # HiT (L14): names resolved by NLTK's rule (A13.3); rows as given
    names_map, _ = HIT.resolve(wn, store, count=len(world.at.nodes))
    world._cache['hit_names'] = names_map
    for split in ('test', 'val'):
        rows = HIT.rows(split, names_map, store)
        add(_inst(world, f'HIT-{split}', f'hit-zenodo14036213-multi-{split}', HIT.KEYS[split], 'L14/1', 'rr', 'hit',
                  'at', rows, selected_rows=len(rows)))
    if cfg.reported:
        _reported_noun_instances(cfg, world, add, vocab, bless, concepts, wb, sl, sn)
        for base in ('BD', 'WB', 'BD-dir'):
            add(_at_variant(world, out[base], base + '-at'))
    return out


@pass1
def _reported_noun_instances(cfg, world, add, vocab, bless, concepts, wb, sl, sn):
    """A13.11's reported sets (stage2/1)."""
    wn, store = world.wn, world.store
    Uf = world.U_full
    for fold in ('val',):
        rows = [(r, x, y) for r, x, y, f in bless if f == fold]
        rr = select_rows(rows, Uf, wn, 'noun')
        add(_inst(world, 'BD-val', 'suite-6891e0e-bless-val', 'bless', 'stage2/1', 'ap', 'pair', 'full', rr,
                  clusters=[x for _, x, _ in rr], gold='bless', cand=rows))
        rows = [(r, x, y) for r, x, y, f in wb if f == fold]
        rr = select_rows(rows, Uf, wn, 'noun')
        add(_inst(world, 'WB-val', 'suite-6891e0e-wbless-val', 'wbless', 'stage2/1', 'ap', 'pair', 'full', rr,
                  clusters=[S2D.wbless_cluster(x, y, concepts) for _, x, y in rr], gold='wbless',
                  cand=rows))
    # the suite's own detection protocol on L13's sets (A13.11): val and test folds in one list
    add(_suite_instance(world, 'BD-suite', 'suite-6891e0e-bless-valtest', 'bless', bless, 'bless'))
    add(_suite_instance(world, 'WB-suite', 'suite-6891e0e-wbless-valtest', 'wbless', wb, 'wbless'))
    # the suite's 1,000 x 2% protocol: the in-vocabulary rows of the whole file (A13.11)
    wcand = [(r, x, y) for r, x, y, _ in wb]
    wall = select_rows(wcand, Uf, wn, 'noun')
    add(_inst(world, 'WB-all', 'suite-6891e0e-wbless-all', 'wbless', 'stage2/1', 'acc', 'pair', 'full', wall,
              gold='wbless', cand=wcand, note="the suite's 1,000 x 2% protocol (WBLESS)"))
    bib = S2D.suite_words('bibless', store)
    bcand = [(r, x, y) for r, x, y, _ in bib]
    ball = select_rows(bcand, Uf, wn, 'noun')
    add(_inst(world, 'BIB-all', 'suite-6891e0e-bibless-all', 'bibless', 'stage2/1', 'acc', 'dir', 'full', ball,
              gold='bibless', cand=bcand, note="the suite's 1,000 x 2% protocol (BiBLESS)"))
    for name, short in (('leds', 'LEDS'), ('shwartz', 'SHW')):
        rows = [(r, x, y) for r, x, y, f in S2D.suite_words(name, store) if f == 'test']
        add(_inst(world, f'{short}-test', f'suite-6891e0e-{name}-test', name, 'stage2/1', 'ap', 'pair', 'full',
                  select_rows(rows, Uf, wn, 'noun'), gold=name, cand=rows))
    # READING (A13.11, "EVAL test as distinct ordered pairs"): a distinct N_S pair is represented by its first test row
    # in file order (the manifest's distinctPairs); pass 2 drops and counts the pairs with both labels
    ev = [(r, x, y) for r, x, y, f in S2D.suite_words('eval', store) if f == 'test']
    first, seen = [], set()
    for r, x, y in ev:
        p = (SE.N_S(x), SE.N_S(y))
        if p not in seen:
            seen.add(p)
            first.append((r, x, y))
    add(_inst(world, 'EVAL-test', 'suite-6891e0e-eval-test-distinct', 'eval', 'stage2/1', 'ap', 'pair', 'full',
              select_rows(first, Uf, wn, 'noun'), gold='eval', cand=first))
    sp = S2D.hyperlex_split_words(store)
    spn = [(r, x, y) for r, x, y, p, _ in sp if p == 'N']
    add(_inst(world, 'HL-split', 'hyperlex-ccb4161-nouns-random-test', 'hyperlex-test-random', 'stage2/1', 'rho',
              'pair', 'full', select_rows(spn, Uf, wn, 'noun'), gold='hyperlex-split', cand=spn))
    add(_inst(world, 'SL-glove', 'simlex-fda1b39-nouns-glove', 'simlex', 'stage2/1', 'rho', 'pair', 'full',
              select_rows(sn, Uf, wn, 'noun', vocab), glove=True, gold='simlex', cand=sn))
    for key, name, iid in (('ws353-sim', 'WSS', 'ws353-e2de627-sim'), ('ws353-combined', 'WSC', 'ws353-fda1b39-combined')):
        rows = S2D.ws353_words(key, store)
        add(_inst(world, name, iid, key, 'stage2/1', 'rho', 'pair', 'full', select_rows(rows, Uf, wn, 'noun'),
                  gold=key, cand=rows))
        add(_inst(world, name + '-glove', iid + '-glove', key, 'stage2/1', 'rho', 'pair', 'full',
                  select_rows(rows, Uf, wn, 'noun', vocab), glove=True, gold=key, cand=rows))


@pass1
def _verb_instances(cfg, world, log):
    """The dry run's shape (A13.13): WordNet's verbs. Every set with human ratings or labels is sealed.
    READING (A13.13, which names fewer dry sets than the registered decisions read): the decision code runs on the
    dry sets it has, and a decided slot without its own dry set takes the nearest one, marked "stand-in": L13(b)'s WB
    takes the HyperLex verb detection set (clusters by word1), L15(a)'s MEN takes MEN's v-v rows (A13.13 names them for
    (b)), and L15(b)'s WSR takes SimLex's verbs within GloVe. All of them are sealed."""
    wn, store, seeds = world.wn, world.store, cfg.seeds
    Uf, Ua = world.U_full, world.U_at
    vocab = glove_vocabulary(world)
    out = {}

    def add(inst):
        out[inst.name] = inst
    hl = S2D.hyperlex_words('hyperlex-all', store)
    hv = [(r, x, y) for r, x, y, p in hl if p == 'V']
    iid = 'hyperlex-ccb4161-verbs'
    hv_rows = select_rows(hv, Uf, wn, 'verb')
    add(_inst(world, 'HL', iid, 'hyperlex-all', 'L12/1', 'rho', 'pair', 'full', hv_rows, gold='hyperlex', sealed=True,
              perm_seed=seeds.l12_gold, cand=hv))
    add(_inst(world, 'HL-at', iid + '-at', 'hyperlex-all', 'L14/1', 'rho', 'pair', 'at', select_rows(hv, Ua, wn, 'verb'),
              gold='hyperlex', sealed=True, perm_seed=seeds.l14_gold, cand=hv))
    add(_inst(world, 'HL-glove', iid + '-glove', 'hyperlex-all', 'L15/1', 'rho', 'pair', 'full',
              select_rows(hv, Uf, wn, 'verb', vocab), glove=True, gold='hyperlex', sealed=True,
              perm_seed=seeds.l15_hl, cand=hv))
    cl = [x for _, x, _ in hv_rows]
    add(_inst(world, 'BD', iid + '-detection', 'hyperlex-all', 'L13/1', 'ap', 'pair', 'full', hv_rows, clusters=cl,
              gold='hyperlex-hyp', sealed=True, perm_seed=seeds.l13_bd, cand=hv))
    add(_inst(world, 'WB', iid + '-detection-standin', 'hyperlex-all', 'L13/1', 'ap', 'pair', 'full', hv_rows,
              clusters=cl, gold='hyperlex-hyp', sealed=True, perm_seed=seeds.l13_wb, cand=hv,
              note='stand-in for WB (A13.13 has one dry detection set)'))
    add(_inst(world, 'BD-dir', iid + '-direction', 'hyperlex-all', 'L13/1', 'acc', 'dir', 'full', hv_rows, clusters=cl,
              gold='hyperlex-hyp', select='hyp', sealed=True, cand=hv))
    hg = select_rows(hv, Uf, wn, 'verb', vocab)
    add(_inst(world, 'BD-dir-glove', iid + '-direction-glove', 'hyperlex-all', 'L13/1', 'acc', 'dir', 'full', hg,
              glove=True, clusters=[x for _, x, _ in hg], gold='hyperlex-hyp', select='hyp', sealed=True,
              cand=hv))
    sl = S2D.simlex_words(store)
    sv = [(r, x, y) for r, x, y, p in sl if p == 'V']
    add(_inst(world, 'SL', 'simlex-fda1b39-verbs', 'simlex', 'L15/1', 'rho', 'pair', 'full',
              select_rows(sv, Uf, wn, 'verb'), gold='simlex', sealed=True, perm_seed=seeds.l15_sl,
              cand=sv))
    men = S2D.men_words(store)
    mv = [(r, x, y) for r, x, tx, y, ty in men if tx == '-v' and ty == '-v']
    add(_inst(world, 'MEN', 'men-0d05a99-vv-standin', 'men', 'L15/1', 'rho', 'pair', 'full',
              select_rows(mv, Uf, wn, 'verb'), gold='men', sealed=True, perm_seed=seeds.l15_men,
              cand=mv, note="stand-in for L15(a)'s MEN (A13.13 names MEN's v-v rows for (b))"))
    add(_inst(world, 'MEN-glove', 'men-0d05a99-vv-glove', 'men', 'L15/1', 'rho', 'pair', 'full',
              select_rows(mv, Uf, wn, 'verb', vocab), glove=True, gold='men', sealed=True, perm_seed=seeds.l15_men,
              cand=mv))
    add(_inst(world, 'WSR-glove', 'simlex-fda1b39-verbs-glove-standin', 'simlex', 'L15/1', 'rho', 'pair', 'full',
              select_rows(sv, Uf, wn, 'verb', vocab), glove=True, gold='simlex', sealed=True, perm_seed=seeds.l15_wsr,
              cand=sv, note="stand-in for L15(b)'s WSR (A13.13 has no dry relatedness set)"))
    if cfg.reported:
        for base in ('BD', 'WB', 'BD-dir'):
            out[base + '-at'] = _at_variant(world, out[base], base + '-at')
    # L14: the verb '@' graph's HiT-protocol split (A13.13), drawn here with the dry split's seeds (4500-4502)
    split = dry_split(world, cfg.seeds.hitr)
    for name in ('test', 'val'):
        add(_inst(world, f'HIT-{name}', f'wordnet30-verb-at-split-{name}', 'hyperlex-all', 'L14/1', 'rr', 'hit', 'at',
                  split[name], selected_rows=len(split[name]),
                  note='the dry split (A13.13): WordNet data, not sealed'))
    for nm in ('HIT-test', 'HIT-val'):
        out[nm].sha = world.lazy('dry_split_sha', lambda: split['sha'])
    return out


@pass1
def hitr_rows(g, seeds, n_val=None):
    """HIT-R (A13.11) or the dry split (A13.13): hit.hit_r on the '@' graph with the three seeds, rows as HitRows over
    offsets, and the SHA-256 of their slots (the instanceSha of a split built from WordNet)."""
    sp = HIT.hit_r(g, seeds[0], seeds[1], seeds[2], n_val)
    nodes = g.nodes
    out = {'n_T': sp['n_T']}
    lines = []
    for name in ('val', 'test'):
        rows = []
        for i, (c, a, rn, hd) in enumerate(sp[name]):
            rows.append(HIT.HitRow(i, nodes[c], [nodes[a]] + [nodes[x] for x in rn] + [nodes[x] for x in hd]))
            lines.append(f'{name} ' + ' '.join([nodes[c]] + rows[-1].slots))
        out[name] = rows
    out['sha'] = sha256('\n'.join(lines))
    return out


@pass1
def dry_split(world, seeds):
    """The dry run's HiT-protocol split on the verb '@' graph (A13.13): val and test of floor(0.05 |T|) rows each.
    READING (A13.13, "val and test 1,092 rows each"): n_val = floor(0.05 |T|), hit.hit_r's default."""
    return world.lazy('dry_split', lambda: hitr_rows(world.at, seeds))


# ================================================================ arms (A13.4)
SIX = ('H3', 'H2', 'F3', 'F3*', 'F2', 'F2*')


def l15_control2_arms(perms):
    """L15 control 2's arms on SL and MEN (A13 L15 Arms (a) and control 2, "for every arm and set"; READING in
    Pass2.l15): the six exact arms, K3, and every S-full_i and W_i."""
    return SIX + ('K3',) + tuple(f'S-full-{i}' for i in perms) + tuple(f'W-{i}' for i in perms)
ARM_GEOMETRY = {'H3': 'h3', 'H2': 'h2', 'F3': 'f3', 'F3*': 'f3*', 'F2': 'f2', 'F2*': 'f2*', 'K3': 'h3', 'S-full': 'h3',
                'W': 'h3', 'S3': 'h3', 'WN': 'wn', 'WN-U': 'wn-u', 'ST': 'st', 'letter': 'letter', 'GloVe': 'glove',
                'GloVe-vec': 'glove'}
_A = {}                       # per process: arm contexts and base tables (a fork worker inherits the parent's)


def arm_cache(world):
    """_A for this world: emptied whenever another world (mode, shape, pins) asks, so that one process never mixes
    two worlds' tables (the tests run both shapes in one process)."""
    token = (world.cfg.mode, world.pos, world.pins_sha(), world.wordnet_sha)
    if _A.get('__world__') != token:
        _A.clear()
        _A['__world__'] = token
    return _A


def split_arm(arm):
    """'S-full-3' -> ('S-full', 3); 'GloVe-300' -> ('GloVe', 300); 'H3' -> ('H3', None)."""
    for base in ('S-full', 'W', 'S3', 'GloVe-vec', 'GloVe'):
        if arm.startswith(base + '-') and arm[len(base) + 1:].isdigit():
            return base, int(arm[len(base) + 1:])
    return arm, None


def arm_vocabulary(arm, universe):
    """The vocabulary an arm reads (A13.11's missed vocabulary): 'glove' for the GloVe arms (GloVe 6B's words, both
    dimensions sharing them), 'index' for W (a lemma of index.<pos> takes another lemma's sense list), and the senses in
    the instance's universe ('U_full' or 'U_at') for every other arm, the learned tables included."""
    base, _ = split_arm(arm)
    if base in ('GloVe', 'GloVe-vec'):
        return 'glove'
    if base == 'W':
        return 'index'
    return 'U_full' if universe == 'full' else 'U_at'


class ArmCtx:
    """One arm's points (or graph, or vectors) and its sense function (A13.3, A13.4)."""

    def __init__(self, arm, kind, table=None, wmap=None, graph=None, vectors=None):
        self.arm, self.kind, self.table, self.wmap, self.graph, self.vectors = arm, kind, table, wmap, graph, vectors
        self.scorer = SC.Scorer(table) if table is not None else None
        self._senses = {}

    def senses(self, w, U, world):
        """S_U(w), or under W the sense list of the lemma it takes (A13.4: senses_W(L[j]) = S(Q[j]))."""
        key = (w, id(U))
        s = self._senses.get(key)
        if s is None:
            if self.wmap is not None:
                v = SE.N_S(w)
                s = SE.senses(self.wmap[v], U, world.wn, world.pos) if v in self.wmap else []
            else:
                s = SE.senses(w, U, world.wn, world.pos)
            self._senses[key] = s
        return s


@pass1
def base_table(world, name):
    """H3, H2, F3, F3*, F2, F2* over every synset of the part of speech, from L3's words (A13.4)."""
    A = arm_cache(world)
    key = ('table', name)
    if key not in A:
        words = world.words
        if name == 'H3':
            t = SC.h3_table(words, 'H3')
        elif name == 'H2':
            t = SC.h2_table(words, 'H2')
        else:
            dim = 3 if name.startswith('F3') else 2
            t = SC.flat_table(words, dim, star=name.endswith('*'), name=name)
        A[key] = t
    return A[key]


@pass1
def arm_ctx(cfg, world, arm):
    """The arm's context, built once per process. S-full_i: P_i = Rng(sfull + i).shuffle over the synsets in offset
    order (l6.move_points's convention); W_i: one Rng(w + i) over index.<pos>'s strata; S3_i: address.s3_words(words,
    s3 + i). GloVe-vec arms are built per instance (glove_vectors)."""
    A = arm_cache(world)
    key = ('arm', arm)
    if key in A:
        return A[key]
    base, i = split_arm(arm)
    if base in SIX:
        ac = ArmCtx(arm, 'geo', base_table(world, base))
    elif base == 'K3':
        ac = ArmCtx(arm, 'geo', SC.k3_table(world.wn, world.offsets, world.pos))
    elif base == 'S-full':
        P = SC.sfull_permutation(cfg.seeds.sfull + i, len(world.offsets))
        ac = ArmCtx(arm, 'geo', SC.sfull_table(base_table(world, 'H3'), world.offsets, P, name=arm))
    elif base == 'W':
        ac = ArmCtx(arm, 'geo', base_table(world, 'H3'), wmap=SC.w_map(world.index, cfg.seeds.w + i))
    elif base == 'S3':
        ac = ArmCtx(arm, 'geo', SC.s3_table(world.words, world.offsets, cfg.seeds.s3 + i, name=arm))
    elif base in ('WN', 'WN-U'):
        ac = ArmCtx(arm, 'wn', graph=world.wn_graph)
    elif base in ('ST', 'letter'):
        ac = ArmCtx(arm, 'tree', graph=world.word_tree)
    elif base in ('GloVe', 'GloVe-vec'):
        ac = ArmCtx(arm, 'glove')
    else:
        raise ValueError(f'unknown arm {arm!r}')
    A[key] = ac
    return ac


@pass1
def glove_vectors(cfg, world, words, dim):
    """{N_S word: glove.Vec} for the words asked for (read once per process and dimension, then kept)."""
    key = ('glove', dim)
    have = arm_cache(world).setdefault(key, {})
    need = sorted(set(words) - set(have))
    if need:
        have.update(GL.vectors(need, dim, world.store))
    return have


@pass1
def shuffled_vectors(cfg, inst, vecs, i):
    """L15 control 3: the set's distinct covered words in code-point order, permuted by a fresh Rng(vec + i); word k
    takes the vector of the word at position k of the permutation."""
    words = SE.word_types([(x, y) for _, x, y in inst.rows])
    from hpstep.prng import Rng
    pi = Rng(cfg.seeds.l15_vec + i).shuffle(list(range(len(words))))
    return {words[k]: vecs[words[pi[k]]] for k in range(len(words))}


# ================================================================ score values (A13.5, A13.6)
def vtype_of(form):
    if form in FORMS_CERT:
        return 'cert'
    if form in FORMS_KEY:
        return 'key'
    if form in FORMS_PLAIN:
        return 'plain'
    raise ValueError(form)


def _max_int(vals):
    return max(vals)


@pass1
def pair_value(ac, form, rule, sx, sy, cert, p=None):
    """One ordered row's value under the arm, form and sense rule: a Val (certified forms), an exact key (int or
    Fraction) or a reported 120-digit Decimal. sx, sy: S(x) and S(y) (Phi(y, x) is called with them swapped)."""
    if ac.kind == 'geo':
        sc = ac.scorer
        sc.cert = cert
        if form in ('G', 'Grev'):
            return {'max': sc.phi_g, 'first': sc.first_g, 'gensim': sc.gensim_g}[rule](sx, sy)
        if form == 'DepG':
            return sc.dep_circ(sx, sy)
        if form == 'Dep':
            return {'max': sc.phi_dep, 'first': sc.first_dep, 'gensim': sc.gensim_dep}[rule](sx, sy)
        if form in ('Sym', 'dist'):
            return {'max': sc.phi_sym, 'first': sc.first_sym}[rule](sx, sy)
        if form == 'Groot':
            return sc.phi_groot(p, sx, sy)
        if form == 'NK17':
            vals = [SC.nk17_value(ac.table, s, t) for s in sx for t in sy] if rule == 'max' else \
                [SC.nk17_value(ac.table, sx[0], sy[0])]
            return vals[SC.phi_plain(vals)]
        if form == 'product':
            vals = [SC.product_value(ac.table, s, t) for s in sx for t in sy]
            return vals[SC.phi_plain(vals)]
    elif ac.kind == 'wn':
        g = ac.graph
        if ac.arm == 'WN-U':
            return _max_int([g.g_u(s, t) for s in sx for t in sy])
        sc = SC.WNScorer(g)
        if form in ('G', 'Grev'):
            return sc.phi_g(sx, sy) if rule == 'max' else sc.first_g(sx, sy)
        if form == 'DepG':
            return sc.dep_circ(sx, sy)
        if form == 'Dep':
            return sc.phi_dep(sx, sy) if rule == 'max' else sc.first_dep(sx, sy)
        if form == 'Sym':
            return sc.phi_sym(sx, sy) if rule == 'max' else sc.first_sym(sx, sy)
        if form == 'LCh':
            return _max_int([-g.lch_p(s, t) for s in sx for t in sy])
    elif ac.kind == 'tree':
        t = ac.graph
        f = t.g_st if ac.arm == 'ST' else t.g_letter
        return _max_int([f(s, u) for s in sx for u in sy])
    raise ValueError(f'arm {ac.arm} has no form {form} under rule {rule}')


def _wn_vtype(ac, form):
    """WN, WN-U, ST and the letter tree give exact integers whatever the form (A13.6)."""
    return 'key' if ac.kind in ('wn', 'tree') else vtype_of(form)


@pass1
def score_instance(cfg, world, ac, inst, form, rule, cert, vectors=None, p=None):
    """The values of one (instance, arm, form, rule): ('pair', [v]), ('dir', [vf], [vr]) or ('hit', [[slot values]]),
    and their vtype."""
    U = world.universe(inst.universe)
    if inst.kind == 'hit':
        S = inst.slots
        t = ac.table
        out = []
        for r in inst.rows:
            c = r.slots[:S]
            if form == 'G':
                out.append(ac.scorer.slot_vals(r.child, c))
            elif form == 'Groot':
                out.append([SC.Val(t.g_form, t.groot_tuple(p, r.child, x)) for x in c])
            elif form == 'dist':
                out.append([t.sym_key(r.child, x) for x in c])
            elif form == 'NK17':
                out.append([SC.nk17_value(t, r.child, x) for x in c])
            else:
                raise ValueError(f'HiT has no form {form}')
        return 'hit', out, vtype_of(form)
    if ac.kind == 'glove':
        def val(x, y):
            return GL.cos_key(vectors[SE.N_S(x)], vectors[SE.N_S(y)])
        fw = [val(x, y) for _, x, y in inst.rows]
        if inst.kind == 'dir':
            return 'dir', (fw, [val(y, x) for _, x, y in inst.rows]), 'key'
        return 'pair', fw, 'key'
    vt = _wn_vtype(ac, form)
    sx_of = [ac.senses(x, U, world) for _, x, _ in inst.rows]
    sy_of = [ac.senses(y, U, world) for _, _, y in inst.rows]
    if form == 'Grev':
        fw = [pair_value(ac, 'G', rule, sy, sx, cert, p) for sx, sy in zip(sx_of, sy_of)]
    else:
        fw = [pair_value(ac, form, rule, sx, sy, cert, p) for sx, sy in zip(sx_of, sy_of)]
    if inst.kind == 'dir':
        rv = [pair_value(ac, form, rule, sy, sx, cert, p) for sx, sy in zip(sx_of, sy_of)]
        return 'dir', (fw, rv), vt
    return 'pair', fw, vt


@pass1
def code_values(vt, values, cert):
    """(codes, the 120-digit value per item, info, side entries) of one tie-class list (A13.6)."""
    if vt == 'cert':
        tc = cert.tie_classes(values)
        info = {'classes': tc.n_classes, 'distinct': tc.n_distinct, 'recomputed': tc.recomputed,
                'tie_classes': tc.tie_classes, 'tie_tuples': tc.tie_tuples}
        return tc.codes, [str(v) for v in tc.values], info, tc.side
    codes = SC.codes_from_keys(values) if vt == 'key' else SC.codes_plain(values)
    info = {'classes': (max(codes) + 1) if codes else 0, 'distinct': len(set(codes)), 'recomputed': 0,
            'tie_classes': 0, 'tie_tuples': 0}
    return codes, [str(v) for v in values], info, []


def safe_name(fkey):
    return re.sub(r'[^A-Za-z0-9_.-]', lambda m: {'/': '__', '*': 's'}.get(m.group(0), '_'), fkey)


def code_path(cache, fkey):
    return os.path.join(cache, 'codes', safe_name(fkey) + '.tsv.gz')


def side_path(cache, fkey):
    return os.path.join(cache, 'side', safe_name(fkey) + '.json.gz')


@pass1
def write_code_file(cfg, fkey, kind, inst, codes, values, info, side, cert, extra=None):
    """Pass 1's files of one tie-class list (A13.8; spec section 9): the gzip TSV of codes keyed by row number
    (pair: row, code; dir: row, codeF, codeR; HiT: row, slot, code), the SHA-256 of the 120-digit value stream in row
    order, and the side file (every value that took the 240-digit path or sits in a numerical tie, with its tuple;
    and the numerical ties met inside the maximum over senses). Returns the file record."""
    rows = inst.pair_rows
    n = len(rows)
    lines = []
    item_of = []
    if kind == 'pair':
        for r, c in zip(rows, codes):
            lines.append(f'{r}\t{c}\n')
        item_of = [(r, None) for r in rows]
        stream = values
    elif kind == 'dir':
        for i, r in enumerate(rows):
            lines.append(f'{r}\t{codes[i]}\t{codes[n + i]}\n')
        item_of = [(r, 'f') for r in rows] + [(r, 'r') for r in rows]
        stream = [v for i in range(n) for v in (values[i], values[n + i])]
    else:
        S = inst.slots
        for i, r in enumerate(rows):
            for s in range(S):
                lines.append(f'{r}\t{s}\t{codes[i * S + s]}\n')
        item_of = [(r, s) for r in rows for s in range(S)]
        stream = values
    tsv = ''.join(lines).encode('utf-8')
    gz = gz_bytes(tsv)
    vh = hashlib.sha256()
    for v in stream:
        vh.update((v + '\n').encode())
    sd = {'fkey': fkey, 'entries': [dict(e, row=item_of[e['item']][0], slot=item_of[e['item']][1]) for e in side],
          'phi_ties': [{'a': [str(x) for x in a.tup], 'b': [str(x) for x in b.tup], 'a240': str(va), 'b240': str(vb)}
                       for a, b, va, vb in (cert.ties if cert is not None else [])]}
    side_bytes = gz_bytes(json.dumps(sd, separators=(',', ':')).encode())
    cp, sp = code_path(cfg.cache, fkey), side_path(cfg.cache, fkey)
    write_atomic(cp, gz)
    write_atomic(sp, side_bytes)
    rec = {'fkey': fkey, 'kind': kind, 'lines': len(lines), 'rows': n, 'sha': sha256(gz), 'tsv_sha': sha256(tsv),
           'bytes': len(gz), 'values_sha': vh.hexdigest(), 'side_sha': sha256(side_bytes), 'side_entries': len(side),
           'phi_recomputed': cert.recomputed if cert is not None else 0,
           'phi_ties': cert.n_ties if cert is not None else 0, **info}
    if extra:
        rec.update(extra)
    return rec


def fkey_of(inst, arm, form, rule, table='-'):
    return f'{inst}/{arm}/{form}/{rule}/{table}'


@pass1
def job_score(job):
    """A pass-1 job of the exact arms: one arm on one instance, every (form, rule) asked (a fork worker)."""
    cfg, world, insts = _G['cfg'], _G['world'], _G['insts']
    S2D.close_gold()                                       # pass 1: every gold reader refuses (A13.8)
    inst = insts[job['inst']]
    ac = arm_ctx(cfg, world, job['arm'])
    base, i = split_arm(job['arm'])
    vectors = None
    if base in ('GloVe', 'GloVe-vec'):
        vecs = glove_vectors(cfg, world, [w for p in inst.word_pairs() for w in p], 300 if base == 'GloVe-vec' else i)
        vectors = shuffled_vectors(cfg, inst, vecs, i) if base == 'GloVe-vec' else vecs
    files = {}
    for form, rule in job['outputs']:
        cert = SC.Certifier()
        t0 = time.perf_counter()
        kind, vals, vt = score_instance(cfg, world, ac, inst, form, rule, cert, vectors)
        if kind == 'dir':
            flat = list(vals[0]) + list(vals[1])
        elif kind == 'hit':
            flat = [v for row in vals for v in row]
        else:
            flat = list(vals)
        codes, values, info, side = code_values(vt, flat, cert)
        fkey = fkey_of(inst.name, job['arm'], form, rule)
        files[fkey] = write_code_file(cfg, fkey, kind, inst, codes, values, info, side, cert,
                                      {'vtype': vt, 'wall_s': time.perf_counter() - t0, 'inst': inst.name,
                                       'base_inst': inst.name, 'arm': job['arm'], 'form': form, 'rule': rule,
                                       'table': '-', 'slots': inst.slots if kind == 'hit' else None})
    return {'files': files}


_G = {}                       # the parent's state a fork worker inherits: cfg, world, instances, tables, P


@pass1
def load_snapped(cfg, key, want_sha, geometry, offsets):
    """A learned table's snapped integers from the cache, refused unless its text has the recorded SHA-256."""
    p = table_path(cfg.cache, key, '.snap.txt')
    with open(p, encoding='utf-8') as fh:
        text = fh.read()
    if LR.snap_sha(text) != want_sha:
        raise ValueError(f'{p}: SHA-256 differs from the run record')
    offs, N = LR.parse_snap_text(text)
    if tuple(offs) != tuple(offsets):
        raise ValueError(f'{p}: the offsets are not U_@\'s')
    return N


@pass1
def learned_ctx(geometry, offsets, N, name, P=None):
    """The learned table as scores2 reads it (A13.4): Lorentz from the lifted snapped points, Euclidean from n/2^32;
    with P, the relabelled table of L14 control 2 (the node with index P[i] takes row i's point)."""
    if P is not None:
        N = l6.move_points(np.array(N, dtype=object), P).tolist()
    t = (SC.lorentz_table if geometry == 'lorentz' else SC.euclid_table)(offsets, N, name)
    return ArmCtx(name, 'geo', t)


@dataclass
class JointRow:
    """A row of the joint HiT val + test list (F1's file): its key, 'val:<row>' or 'test:<row>'."""
    row: str


@pass1
def job_score_learned(job):
    """A pass-1 job of one learned table (tuning, measured, edge-shuffled or floor): every instance and form asked,
    the relabelled table too when asked (a fork worker). For a measured table it also writes F1's joint list: HiT
    val's and HiT test's G values (21 slots) in one tie-class list (READING below), from which pass 2 computes F1."""
    cfg, world, insts = _G['cfg'], _G['world'], _G['insts']
    S2D.close_gold()
    offsets = world.at.nodes
    N = load_snapped(cfg, job['table'], job['snap_sha'], job['geometry'], offsets)
    ctxs = {}
    files, extra = {}, {}
    for out in job['outputs']:
        relabel = out.get('relabel', False)
        if relabel not in ctxs:
            ctxs[relabel] = learned_ctx(job['geometry'], offsets, N, job['table'], _G['P'] if relabel else None)
        ac = ctxs[relabel]
        inst = insts[out['inst']]
        if out.get('slots') and out['slots'] != inst.slots:
            inst = replace(inst, slots=out['slots'])
        cert = SC.Certifier()
        t0 = time.perf_counter()
        p = world_root_key(world) if out['form'] == 'Groot' else None
        kind, vals, vt = score_instance(cfg, world, ac, inst, out['form'], out['rule'], cert, p=p)
        flat = [v for row in vals for v in row] if kind == 'hit' else (list(vals[0]) + list(vals[1]) if kind == 'dir'
                                                                       else list(vals))
        codes, values, info, side = code_values(vt, flat, cert)
        iname = out['inst'] + ('-relabel' if relabel else '') + (f'-s{inst.slots}' if kind == 'hit' else '')
        fkey = fkey_of(iname, job['arm'], out['form'], out['rule'], job['table'])
        files[fkey] = write_code_file(cfg, fkey, kind, inst, codes, values, info, side, cert,
                                      {'vtype': vt, 'wall_s': time.perf_counter() - t0, 'relabel': bool(relabel),
                                       'inst': iname, 'base_inst': out['inst'], 'arm': job['arm'],
                                       'form': out['form'], 'rule': out['rule'], 'table': job['table'],
                                       'slots': inst.slots if kind == 'hit' else None})
        if out.get('f1'):
            extra.setdefault('f1_vals', {})[out['inst']] = (inst, vals, vt)
    if {'HIT-val', 'HIT-test'} <= set(extra.get('f1_vals', ())):
        # READING (A13.11, F1 under HiT's protocol, with A13.8, "pass 2 ... computes every metric from pass 1's files
        # alone", and A13.6's tie classes "both directions together where a metric compares them"): F1 compares test
        # values with a threshold among the val values, so pass 1 writes one tie-class list of HiT val's and HiT test's
        # G values (val rows first, then test rows, all 21 slots, rows keyed val:<row> and test:<row>), with its
        # value-stream SHA-256 and side file like every code file; pass 2 computes F1 from it alone. Tie classes are
        # ordinal, so theta's class and each test value's place against it are those of the separate lists.
        (vi, vv, vt), (ti, tv, _) = extra['f1_vals']['HIT-val'], extra['f1_vals']['HIT-test']
        cert = SC.Certifier()
        t0 = time.perf_counter()
        codes, values, info, side = code_values(vt, [v for row in vv for v in row] + [v for row in tv for v in row],
                                                cert)
        joint = replace(ti, name='HIT-valtest', rows=[JointRow(f'val:{r.row}') for r in vi.rows]
                        + [JointRow(f'test:{r.row}') for r in ti.rows], slots=ti.slots)
        iname = f'HIT-valtest-s{joint.slots}'
        fkey = fkey_of(iname, job['arm'], 'G', '-', job['table'])
        files[fkey] = write_code_file(cfg, fkey, 'hit', joint, codes, values, info, side, cert,
                                      {'vtype': vt, 'wall_s': time.perf_counter() - t0, 'relabel': False,
                                       'inst': iname, 'base_inst': 'HIT-valtest', 'arm': job['arm'], 'form': 'G',
                                       'rule': '-', 'table': job['table'], 'slots': joint.slots,
                                       'joint_of': ['HIT-val', 'HIT-test'], 'val_rows': len(vi.rows),
                                       'test_rows': len(ti.rows)})
    return {'files': files}


def world_root_key(world):
    """G_root's base point (A13.5, reported): the table's point of entity.n.01 (nouns only)."""
    if world.pos != 'noun':
        raise ValueError('G_root is read on the nouns only (entity.n.01)')
    return W.ENTITY


def table_path(cache, key, ext):
    return os.path.join(cache, 'tables', key + ext)


# ================================================================ training (A13.10; a spawn pool, numba in the workers)
_TW = {}


def _init_train_worker(wcfg):
    for v in THREAD_VARS:
        os.environ[v] = '1'
    from lexicon import stream as S          # numba: in the workers only
    S.compile_implicit_kernels()
    cfg = wcfg['cfg']
    world = World(cfg, build=False)
    inst, imap, offsets = EM.direct_instance(world.wn, cfg.shape)
    env = P4.run_environment()
    _TW.clear()
    _TW.update(cfg=cfg, inst=inst, imap=imap, offsets=offsets, env=env, env_sha=P4.env_sha(env),
               pool_size=wcfg['pool_size'])


def _run_fields(run, cfg):
    loss = run.epoch_loss
    return {'geometry': run.geometry, 'd': run.d, 'lr': run.lr, 'seed': run.seed, 'instance': run.instance,
            'diverged_epoch': run.diverged_epoch, 'epochs_run': run.epochs_run, 'guard_hits': run.guard_hits,
            'max_step': run.max_step, 'max_radius': run.max_radius,
            'loss': {str(e): loss[e] for e in (0, 19, 99, 499, 999) if e < len(loss)},
            'converged': bool(run.table is not None and len(loss) == EM.EPOCHS and EM.converged(loss)),
            'drop_epoch': EM.drop_epoch(loss) if len(loss) == EM.EPOCHS else None,
            'final_state': list(run.final_state), 'float_sha': run.table_sha, 'wall_s': run.wall_s,
            'cpu_s': run.cpu_s, 'wall_ms': int(round(run.wall_s * 1000)), 'stream': run.stream,
            'concurrent_processes': _TW['pool_size']}


def job_train(job):
    """A tuning, measured, pre-flight or edge-shuffled run (A13.10.3-10.6): train_implicit on U_@ (or the shuffled
    pairs' map), then the float table, the snapped text (2^-32) and the epoch losses into the cache."""
    cfg = _TW['cfg']
    inst, imap = _TW['inst'], _TW['imap']
    rec = {}
    if job['kind'] == 'shuffled':
        inst, imap = EM.shuffled_implicit_instance(inst.n, inst.E, job['pairs_seed'])
        rec['pairs'] = {'seed': job['pairs_seed'], 'count': int(inst.E),
                        'sha256': hashlib.sha256(np.ascontiguousarray(inst.pos, dtype='<i8').tobytes()).hexdigest(),
                        'nn_min_over_anchors': int(imap.sizes()[np.unique(inst.pos[:, 0])].min())}
    epochs = job.get('epochs', cfg.epochs)
    run = EM.train_implicit(inst, imap, job['geometry'], job['d'], job['lr'], job['seed'], epochs=epochs,
                            burnin=cfg.burnin, batch=EM.BATCH, negs=EM.NEGS)
    rec.update(_run_fields(run, cfg))
    if job['kind'] == 'time':
        rec['per_epoch_wall_s'] = run.wall_s / max(1, run.epochs_run)
        rec['per_epoch_cpu_s'] = run.cpu_s / max(1, run.epochs_run)
        return rec
    key = job['key']
    os.makedirs(os.path.join(cfg.cache, 'tables'), exist_ok=True)
    write_atomic(table_path(cfg.cache, key, '.loss.json'), json.dumps(run.epoch_loss))
    if run.table is not None:
        N = LR.snap(run.table, job['geometry'])
        text = LR.snap_text(_TW['offsets'], N)
        P4.save_npy(table_path(cfg.cache, key, '.npy'), run.table)
        write_atomic(table_path(cfg.cache, key, '.snap.txt'), text)
        rec.update(snap_sha=LR.snap_sha(text), cached_table=True, cached_snap=True)
    return rec


def job_replay(job):
    """A13.10.9 (A10.1): a run's draws replayed with hpstep.prng.Rng itself, no arithmetic: the state after every
    epoch (the timing projection replays two epochs and keeps the wall time)."""
    cfg, inst, imap = _TW['cfg'], _TW['inst'], _TW['imap']
    st = PS.PyStream(job['seed'])
    t0, c0 = time.perf_counter(), time.process_time()
    epochs = job.get('epochs', cfg.epochs)
    states = PS.replay_states(st, inst.n, job['d'], inst.pos[:, 0], imap.sizes(), epochs, negs=EM.NEGS)
    return {'target': job.get('target'), 'seed': job['seed'], 'd': job['d'], 'stream': st.name, 'epochs': epochs,
            'states': [list(s) for s in states], 'wall_s': time.perf_counter() - t0,
            'cpu_s': time.process_time() - c0}


TRAIN_JOBS = {'tuning': job_train, 'measured': job_train, 'preflight': job_train, 'shuffled': job_train,
              'time': job_train, 'replay': job_replay}


def _run_train_job(job):
    try:
        t0, c0 = time.perf_counter(), time.process_time()
        rec = TRAIN_JOBS[job['kind']](job)
        rec.update(key=job['key'], kind=job['kind'], job_wall_s=time.perf_counter() - t0,
                   job_cpu_s=time.process_time() - c0, pid=os.getpid(), environment_sha=_TW['env_sha'],
                   environment=_TW['env'])
        return job['key'], rec, None
    except Exception:
        return job['key'], None, traceback.format_exc()


def _run_score_job(job):
    try:
        t0, c0 = time.perf_counter(), time.process_time()
        fn = job_score_learned if job['kind'] == 'score-learned' else job_score
        rec = fn(job)
        rec.update(key=job['key'], kind=job['kind'], job_wall_s=time.perf_counter() - t0,
                   job_cpu_s=time.process_time() - c0, pid=os.getpid())
        return job['key'], rec, None
    except Exception:
        return job['key'], None, traceback.format_exc()


# ================================================================ the pools and resume
def cached_ok(cfg, rec):
    """A finished job is reused when every file it names still has its recorded SHA-256 (A13.15 step 7)."""
    for f in (rec.get('files') or {}).values():
        for path, want in ((code_path(cfg.cache, f['fkey']), f['sha']), (side_path(cfg.cache, f['fkey']),
                                                                         f['side_sha'])):
            if not os.path.exists(path) or sha256_file(path) != want:
                return False
    if rec.get('cached_table'):
        p = table_path(cfg.cache, rec['key'], '.npy')
        if not os.path.exists(p) or EM.table_sha(np.load(p)) != rec['float_sha']:
            return False
    if rec.get('cached_snap'):
        p = table_path(cfg.cache, rec['key'], '.snap.txt')
        if not os.path.exists(p) or sha256_file(p) != rec['snap_sha']:
            return False
    return True


def est_cost(job):
    return job.get('est', 1.0)


def run_pool(cfg, ctx, jobs, phase, kind):
    """Runs the jobs not already done (a runs.jsonl line at this HEAD and signature whose files still have their
    SHA-256s), longest first; kind 'spawn' (training: numba in the workers only) or 'fork' (pass-1 scoring: the
    workers inherit _G). Returns {key: record}. The load average is sampled while the pool waits."""
    log, head, sig = ctx['log'], ctx['git']['head'], ctx['sig']
    done = P4.load_runs(cfg.cache)
    results, todo, stale = {}, [], 0
    for job in jobs:
        line = done.get(job['key'])
        if line and line.get('head') == head and line.get('sig') == sig and cached_ok(cfg, line['record']):
            results[job['key']] = dict(line['record'], resumed=True)
        else:
            stale += 1 if line else 0
            todo.append(job)
    todo.sort(key=lambda j: (-est_cost(j), j['key']))
    size = min(cfg.workers, max(1, len(todo)))
    log(f'{phase}: {len(jobs)} jobs, {len(jobs) - len(todo)} done before (runs.jsonl), {len(todo)} to run'
        + (f' ({stale} cached line(s) at another HEAD or configuration, or with a changed file, rerun)' if stale else '')
        + f', {size} worker process(es) ({kind})')
    ctx['load'].sample(f'{phase}: start')
    if not todo:
        return results
    recheck_tree(cfg, ctx, f'before the pool: {phase}')
    t0 = time.perf_counter()
    if kind == 'spawn':
        ex = ProcessPoolExecutor(max_workers=size, mp_context=multiprocessing.get_context('spawn'),
                                 initializer=_init_train_worker, initargs=({'cfg': cfg, 'pool_size': size},))
        fn = _run_train_job
    else:
        ex = ProcessPoolExecutor(max_workers=size, mp_context=multiprocessing.get_context('fork'))
        fn = _run_score_job
    with ex:
        pending = {ex.submit(fn, j): j for j in todo}
        k = 0
        while pending:
            finished, _ = wait(list(pending), timeout=min(cfg.load_interval, 60), return_when=FIRST_COMPLETED)
            ctx['load'].maybe(phase)
            for f in finished:
                pending.pop(f)
                key, rec, err = f.result()
                if err:
                    for g in pending:
                        g.cancel()
                    log(f'FAILED {key}:\n{err}')
                    raise RuntimeError(f'job {key} failed')
                P4.append_run(cfg.cache, {'key': key, 'head': head, 'sig': sig, 'time': utc_now(), 'record': rec})
                results[key] = rec
                k += 1
                if k <= 20 or k % 25 == 0 or k == len(todo):
                    log(f'  [{k}/{len(todo)}] {key} ({rec["job_wall_s"]:.1f} s; {time.perf_counter() - t0:.0f} s in)')
    ctx['load'].sample(f'{phase}: end')
    return results


# ================================================================ disk pre-flight (A13.8; spec section 9)
def disk_projection(cfg, code_lines, tables, table_bytes=None):
    """Bytes the step will write: code-file lines x 6 B, plus the tables (float .npy and snapped text)."""
    tb = table_bytes if table_bytes is not None else 0
    return code_lines * CODE_LINE_BYTES + tb


def disk_preflight(cfg, ctx, projected, where):
    """Refuses when the projected bytes exceed shutil.disk_usage(cache).free less 2 GB (A13.8)."""
    os.makedirs(cfg.cache, exist_ok=True)
    free = shutil.disk_usage(cfg.cache).free
    ok = projected <= free - DISK_MARGIN
    ctx['disk'] = {'where': where, 'projected_bytes': int(projected), 'free_bytes': int(free), 'margin': DISK_MARGIN,
                   'ok': ok}
    ctx['log'](f'disk pre-flight ({where}): {projected / 1e9:.3f} GB to write, {free / 1e9:.2f} GB free; '
               + ('within the free space less 2 GB' if ok else 'REFUSED: more than the free space less 2 GB'))
    if not ok:
        raise Refused(f'the disk projection ({projected / 1e9:.3f} GB) exceeds the free space less 2 GB '
                      f'({(free - DISK_MARGIN) / 1e9:.3f} GB): stop before {where} (A13.8, A13.16)')
    return ctx['disk']


def table_bytes(n, d, geometry):
    return n * (d + (1 if geometry == 'lorentz' else 0)) * 8 + 128 + n * SNAP_LINE_BYTES


# ================================================================ count checks (A13.9: positive controls)
FROZEN_GLOVE = {'MEN-glove': 2005, 'WSR-glove': 245, 'HL-glove': 2162}   # the manifest's gloveCovered (A13.2, L15(b))
BUDGET_STRING = '1000,20,50,50,1517000,3792500000'                         # A13.10.3


def _check(name, computed, expected, problems):
    bad = S2D.compare_counts(computed, expected)
    for k, want, got in bad:
        problems.append(f'{name} {k}: registered {want}, found {got}')
    return not bad


@pass1
def count_checks_words(cfg, world, log):
    """The word-level counts of A13.9 (registered), A13.13 (dry) or the synthetic world's planted counts (self-test),
    before pass 1. A mismatch raises S2D.CountMismatch: the run stops with no result."""
    t0 = time.perf_counter()
    out, problems = {}, []
    wn, store = world.wn, world.store
    if world.pos == 'noun':
        c = S2D.count_checks_words(wn, store)
        out['words'] = c
        g = world.at
        out['at'] = {'nodes': len(g.nodes), 'nodes_sha': g.nodes_sha(), 'edges': len(g.edges),
                     'edges_sha': g.edges_sha(), 'indirect': g.n_indirect, 'roots': len(g.roots), 'anchors': g.anchors,
                     'min_nn': g.min_nn}
        hc, detail = HIT.count_checks(wn, store, count=len(g.nodes))
        out['hit'], out['hit_detail'] = hc, detail
        out['budget'] = l6.budget(len(g.edges), epochs=cfg.epochs, burnin=cfg.burnin)
        if cfg.mode == 'registered':
            _check('words', c, S2D.COUNTS_WORDS, problems)
            try:
                SE.check_at_graph(g)
            except ValueError as e:
                problems.append(str(e))
            _check('hit', hc, HIT.COUNTS, problems)
            try:
                out['w_strata'] = SC.w_check(SC.w_strata(world.index))
            except ValueError as e:
                problems.append(str(e))
            if out['budget'] != BUDGET_STRING:
                problems.append(f'budget {out["budget"]}, registered {BUDGET_STRING}')
            vocab = glove_vocabulary(world)
            out['glove'] = {'words300': len(vocab), 'underscore300': GL.underscore_tokens(vocab)}
            _check('glove', out['glove'], {'words300': GL.LINES, 'underscore300': GL.UNDERSCORE_TOKENS}, problems)
        else:
            ex = world.expected
            _check('words', c, ex['words'], problems)
            _check('hit', hc, ex['hit'], problems)
            _check('at', out['at'], ex['at'], problems)
    else:
        c = S2D.dry_counts(wn, store)
        out['dry'] = c
        g = world.at
        out['verb_at'] = {'nodes': len(g.nodes), 'edges': len(g.edges), 'indirect': g.n_indirect,
                          'roots': len(g.roots), 'isolated': g.isolated}
        out['budget'] = l6.budget(len(g.edges), epochs=cfg.epochs, burnin=cfg.burnin)
        if cfg.mode == 'dry':
            _check('dry', c, S2D.DRY_COUNTS_A13, problems)
            try:
                SE.check_at_graph(g)
            except ValueError as e:
                problems.append(str(e))
        else:
            _check('dry', c, world.expected['dry_words'], problems)
    out['problems'] = problems
    log(f'count checks (word-level, A13.9{", A13.13" if world.pos == "verb" else ""}): '
        + ('all equal' if not problems else f'{len(problems)} MISMATCH(ES)') + f' ({time.perf_counter() - t0:.1f} s)')
    if problems:
        raise S2D.CountMismatch('count check failed (A13.9: the run stops with no result): ' + '; '.join(problems))
    return out


def check_instance_counts(cfg, insts, counts, log):
    """The frozen L15(b) GloVe counts (registered; A13.2, frozen by the definitions amendment) and the dry split's
    size (A13.13)."""
    problems = []
    if cfg.mode == 'registered':
        for k, v in FROZEN_GLOVE.items():
            if len(insts[k].rows) != v:
                problems.append(f'{k}: {len(insts[k].rows)} GloVe-covered rows, frozen {v}')
    if cfg.mode == 'dry':
        for k in ('HIT-test', 'HIT-val'):
            if len(insts[k].rows) != S2D.DRY_COUNTS_A13['verb_at.dry_split_rows']:
                problems.append(f'{k}: {len(insts[k].rows)} rows, A13.13 says 1,092')
    if problems:
        raise S2D.CountMismatch('count check failed: ' + '; '.join(problems))
    counts['instances'] = {k: {'iid': v.iid, 'rows': len(v.rows), 'selected': v.selected_rows,
                               'pairSetSha': v.pair_set_sha} for k, v in sorted(insts.items())}
    log(f'{len(insts)} instances: ' + ', '.join(f'{k} {len(v.rows)}' for k, v in sorted(insts.items())))


def manifest_check(cfg, world, insts, log):
    """Registered: the instance manifest rebuilt from the pinned files must equal golden/stage2_instances_v1.meta.json,
    and the runner's pair sets must be the manifest's covered rows (A13.2: "the decisive run refuses another")."""
    sys.path.insert(0, lexicon.GOLDEN)
    try:
        import make_stage2_v1 as MK
    finally:
        sys.path.remove(lexicon.GOLDEN)
    with open(MANIFEST_FILE, 'rb') as fh:
        raw = fh.read()
    meta = MK.build_manifest(world.wn, world.store, glove_vocabulary(world), GL.vocabulary(50, world.store))
    if MK.manifest_text(meta).encode('utf-8') != raw:
        raise Refused('the instance manifest rebuilt from the pinned files differs from golden/'
                      'stage2_instances_v1.meta.json (A13.2)')
    m = json.loads(raw)['instances']
    want = {'HL': ('hyperlex-ccb4161-nouns', 'covered', 'U_full'), 'HL-at': ('hyperlex-ccb4161-nouns', 'covered', 'U_at'),
            'HL-glove': ('hyperlex-ccb4161-nouns', 'gloveCovered', None),
            'BD': ('suite-6891e0e-bless-test', 'covered', 'U_full'), 'BD-dir-glove': ('suite-6891e0e-bless-test',
                                                                                        'gloveCovered', None),
            'WB': ('suite-6891e0e-wbless-test', 'covered', 'U_full'), 'SL': ('simlex-fda1b39-nouns', 'covered', 'U_full'),
            'MEN': ('men-0d05a99-nn', 'covered', 'U_full'), 'MEN-glove': ('men-0d05a99-nn', 'gloveCovered', None),
            'WSR-glove': ('ws353-e2de627-rel', 'gloveCovered', None),
            'BD-at': ('suite-6891e0e-bless-test', 'covered', 'U_at'), 'WB-at': ('suite-6891e0e-wbless-test', 'covered',
                                                                                  'U_at')}
    bad = []
    for name, (iid, kind, u) in want.items():
        if name not in insts:                     # A13.11's reported instances exist only when the reports run
            continue
        e = m[iid][kind][u] if u else m[iid][kind]
        if e['rowsSha256'] != insts[name].pair_set_sha or e['count'] != len(insts[name].rows):
            bad.append(name)
    if bad:
        raise Refused(f'pair sets differ from the instance manifest: {bad}')
    log('the instance manifest rebuilt from the pinned files equals the committed one; the pair sets are its rows')
    return {'sha256': sha256(raw), 'rebuilt_equal': True}


# ================================================================ the pass-1 plan of the exact arms (spec section 11)
def exact_plan(cfg, insts):
    """[(arm, instance, [(form, rule, claim)])]: every exact arm the claims decide on (claim field L12/1-L15/1) and
    A13.11's reports (stage2/1)."""
    plan = {}
    perms = range(cfg.seeds.perms)
    sfull = [f'S-full-{i}' for i in perms]
    wsh = [f'W-{i}' for i in perms]

    def add(arm, inst, claim, *frs):
        if inst in insts and insts[inst].rows:
            lst = plan.setdefault((arm, inst), [])
            for fr in frs:
                if all((f, r) != fr for f, r, _ in lst):
                    lst.append((fr[0], fr[1], claim))
    # L12 (A13: (a)-(d) and controls 1-4)
    for a in SIX:
        add(a, 'HL', 'L12/1', ('G', 'max'))
    for a in ('H3', 'H2'):
        add(a, 'HL', 'L12/1', ('DepG', 'max'), ('Sym', 'max'))
    add('H3', 'HL', 'L12/1', ('Grev', 'max'))
    for a in ['WN', 'K3'] + sfull + wsh:
        add(a, 'HL', 'L12/1', ('G', 'max'))
    # L13 (a)-(c), controls 1 and 3 (control 2 reads the six arms' codes)
    for inst in ('BD', 'WB', 'BD-dir'):
        for a in list(SIX) + ['K3'] + sfull + wsh:
            add(a, inst, 'L13/1', ('G', 'max'))
    add('H3', 'BD-dir', 'L13/1', ('Sym', 'max'))
    add('GloVe-300', 'BD-dir-glove', 'L13/1', ('cos', '-'))
    # L15 (a), (b) and controls 1-3
    for inst in ('SL', 'MEN'):
        for a in list(SIX) + ['K3'] + sfull + wsh:
            add(a, inst, 'L15/1', ('Sym', 'max'))
    for inst in ('MEN-glove', 'WSR-glove', 'HL-glove'):
        add('H3', inst, 'L15/1', ('Sym', 'max'))
        add('GloVe-300', inst, 'L15/1', ('cos', '-'))
        for i in perms:
            add(f'GloVe-vec-{i}', inst, 'L15/1', ('cos', '-'))
    if cfg.reported:
        rep = 'stage2/1'
        for a in ('H3', 'H2'):
            add(a, 'HL', rep, ('Dep', 'max'), ('G', 'first'), ('G', 'gensim'), ('Dep', 'first'), ('Sym', 'first'),
                ('NK17', 'max'), ('product', 'max'))
        for a in ('F3', 'F3*', 'F2', 'F2*'):
            add(a, 'HL', rep, ('DepG', 'max'), ('Sym', 'max'), ('Dep', 'max'), ('G', 'first'), ('G', 'gensim'),
                ('product', 'max'))
        add('WN', 'HL', rep, ('DepG', 'max'), ('Sym', 'max'), ('Dep', 'max'), ('G', 'first'), ('LCh', 'max'))
        for a in ('WN-U', 'ST', 'letter'):
            add(a, 'HL', rep, ('G', 'max'))
        for i in range(cfg.seeds.s3_count):
            add(f'S3-{i}', 'HL', rep, ('G', 'max'))
        add('H3', 'HL-at', rep, ('G', 'max'))
        add('H3', 'HL-glove', rep, ('G', 'max'))
        for inst in ('HL-glove', 'MEN-glove', 'WSR-glove', 'SL-glove', 'WSS-glove', 'WSC-glove'):
            add('GloVe-50', inst, rep, ('cos', '-'))
            add('GloVe-300', inst, rep, ('cos', '-'))
        for inst in ('BD', 'WB', 'BD-dir'):
            add('WN', inst, rep, ('G', 'max'))
        add('WN', 'SL', rep, ('Sym', 'max'), ('LCh', 'max'))
        for inst in ('WSS', 'WSC', 'WSR'):
            for a in list(SIX) + ['WN']:
                add(a, inst, rep, ('Sym', 'max'))
        for inst in ('BD-val', 'WB-val', 'LEDS-test', 'EVAL-test', 'SHW-test', 'WB-all', 'BIB-all', 'HL-split',
                     'BD-suite', 'WB-suite'):
            for a in list(SIX) + ['WN']:
                add(a, inst, rep, ('G', 'max'))
        for a in ('H3', 'H2'):
            add(a, 'HIT-test', rep, ('G', '-'))
    jobs = []
    for (arm, inst), outs in sorted(plan.items()):
        n = len(insts[inst].rows) * (insts[inst].slots if insts[inst].kind == 'hit' else 1)
        jobs.append({'kind': 'score', 'key': f'p1-{safe_name(arm)}-{inst}', 'arm': arm, 'inst': inst,
                     'outputs': [(f, r) for f, r, _ in outs], 'claims': {f'{f}/{r}': c for f, r, c in outs},
                     'est': n * len(outs) * (2 if insts[inst].kind == 'dir' else 1)})
    return jobs


def plan_lines(insts, jobs):
    """Code-file lines a pass-1 plan writes (the disk pre-flight)."""
    total = 0
    for j in jobs:
        for out in j['outputs']:
            inst = insts[out['inst'] if isinstance(out, dict) else j['inst']]
            slots = (out.get('slots') if isinstance(out, dict) else None) or inst.slots
            total += len(inst.rows) * (slots if inst.kind == 'hit' else 1)
    return total


# ================================================================ step: time (A13.16; spec section 16)
def projection(per_epoch, replay_epoch, timing_s, epochs=EM.EPOCHS, workers=MAX_WORKERS):
    """Hours of the registered total (A13.16): tuning (12 runs per cell) and decisive training (5 measured and 5
    edge-shuffled runs per cell, and the two pre-flight jobs at d = 2) from the measured per-epoch wall times with four
    processes at once; the two replays of 1,000 epochs from the measured replay time; the timing projection itself;
    and A13.16's estimates for the rest. Returns (hours by row, total)."""
    run = {c: per_epoch[c] * epochs for c in per_epoch}
    tuning = sum(run[c] * 2 * len(GRID) for c in CELLS) / workers
    decisive = (sum(run[c] * 10 for c in CELLS) + run[('euclid', 2)] + run[('lorentz', 2)]) / workers
    replays = 2 * replay_epoch * epochs / workers
    hours = {'timing_projection': timing_s / 3600, 'tuning': tuning / 3600, 'decisive_training': decisive / 3600,
             'replays': replays / 3600}
    hours.update(A13_16_HOURS)
    return hours, math.fsum(hours.values())


def projected_bytes(n, E, slots_test=21, hit_rows=29383, exact_lines=0):
    """The registered disk projection (A13.8): tables of tuning (48), measured, edge-shuffled (20 + 20), pre-flight (2)
    and floors (20); code files of the exact arms and of every learned table's evaluations."""
    tb = sum(table_bytes(n, d, g) for g, d in CELLS) / len(CELLS)
    tables = (48 + 20 + 20 + 2 + 20) * tb
    lines = exact_lines + 48 * hit_rows * 21 + 48 * hit_rows * 11 * 2 + 40 * hit_rows * (21 * 3 + 11) \
        + 20 * hit_rows * 21 + 20 * hit_rows * 21
    return lines * CODE_LINE_BYTES + tables


def step_time(cfg, ctx):
    log = ctx['log']
    world = ctx['world']
    seeds = cfg.seeds.time
    jobs = [{'kind': 'time', 'key': f'time-{g}-d{d}-s{seeds[i]}', 'geometry': g, 'd': d, 'lr': TIME_LR,
             'seed': seeds[i], 'epochs': TIME_EPOCHS, 'est': 2.0} for i, (g, d) in enumerate(cfg.cells)]
    jobs.append({'kind': 'replay', 'key': f'time-replay-lorentz-d3-s{seeds[len(cfg.cells)]}', 'd': 3,
                 'seed': seeds[len(cfg.cells)], 'epochs': TIME_EPOCHS, 'est': 1.0})
    t0 = time.perf_counter()
    res = run_pool(cfg, ctx, jobs, 'timing projection', 'spawn')
    wall = time.perf_counter() - t0
    per_epoch = {(j['geometry'], j['d']): res[j['key']]['per_epoch_wall_s'] for j in jobs if j['kind'] == 'time'}
    rp = res[jobs[-1]['key']]
    replay_epoch = rp['wall_s'] / TIME_EPOCHS
    hours, total = projection(per_epoch, replay_epoch, wall)
    n, E = len(world.at.nodes), len(world.at.edges)
    proj = projected_bytes(n, E)
    free = shutil.disk_usage(cfg.cache).free
    within = total <= BUDGET_HOURS
    disk_ok = proj <= free - DISK_MARGIN
    for (g, d), v in per_epoch.items():
        log(f'  {g} d={d}: {v:.3f} s per epoch (wall, {len(cfg.cells)} processes at once)')
    log(f'  replay: {replay_epoch:.3f} s per epoch (hpstep.prng.Rng)')
    log('projection (hours): ' + ', '.join(f'{k} {v:.2f}' for k, v in hours.items()) + f'; total {total:.2f} h '
        f'against {BUDGET_HOURS} h: ' + ('within' if within else 'OVER'))
    log(f'disk: {proj / 1e9:.2f} GB projected, {free / 1e9:.2f} GB free: ' + ('within' if disk_ok else 'OVER'))
    rec = {'label': ctx['label'], 'mode': cfg.mode, 'step': 'time', 'head': ctx['git']['head'], 'git': ctx['git'],
           'starts': ctx['starts'], 'environment': ctx['env'], 'load_averages': ctx['load'].samples,
           'readings': ctx['readings'].items, 'seeds': list(seeds), 'lr': TIME_LR, 'epochs': TIME_EPOCHS,
           'per_epoch_wall_s': {f'{g}-{d}': v for (g, d), v in per_epoch.items()},
           'per_epoch_cpu_s': {f'{j["geometry"]}-{j["d"]}': res[j['key']]['per_epoch_cpu_s'] for j in jobs
                               if j['kind'] == 'time'},
           'replay_epoch_s': replay_epoch, 'hours': hours, 'total_hours': total, 'limit_hours': BUDGET_HOURS,
           'within_budget': within, 'disk': {'projected_bytes': int(proj), 'free_bytes': int(free),
                                             'margin': DISK_MARGIN, 'ok': disk_ok},
           'verdict': 'within budget' if (within and disk_ok) else 'stop before tuning (A13.16): any cut is an '
                                                                   'amendment, not a runner option',
           'jobs': {k: {x: v for x, v in r.items() if x not in ('environment', 'states')} for k, r in res.items()}}
    if cfg.mode == 'selftest':
        rec['selftest'] = SELFTEST_BANNER
    write_atomic(paths(cfg, 'time')['json'], P4.jdump(rec))
    if not (within and disk_ok) and cfg.mode == 'registered':
        log('REFUSED: the projection exceeds 11 h or the disk; stop and report before tuning (A13.16)')
        return 1
    return 0


def time_record_ok(cfg):
    """Registered tuning needs a timing projection within 11 h and the disk (spec section 16)."""
    p = paths(cfg, 'time')['json']
    if not os.path.exists(p):
        raise Refused('no results/stage2-time.json: run --time on U_@ first (A13.16; spec section 16)')
    with open(p, encoding='utf-8') as fh:
        t = json.load(fh)
    if t.get('mode') != cfg.mode or not t.get('within_budget') or not t.get('disk', {}).get('ok'):
        raise Refused('results/stage2-time.json does not project the registered total within 11 h and the disk '
                      '(A13.16): stop before tuning')
    return {'file': P4.display_path(p), 'sha256': sha256_file(p), 'total_hours': t['total_hours']}


# ================================================================ step: tune (A13.10.5)
def tuning_key(g, d, lr, s):
    return f'tuning-{g}-d{d}-lr{lr}-s{s}'


def tuning_jobs(cfg):
    jobs = []
    for g, d in cfg.cells:
        for lr in cfg.grid:
            for s in cfg.seeds.tuning(GRID.index(lr)):
                jobs.append({'kind': 'tuning', 'key': tuning_key(g, d, lr, s), 'geometry': g, 'd': d, 'lr': lr,
                             'seed': s, 'est': 1.0 + d + (0.4 if g == 'lorentz' else 0)})
    return jobs


def replay_check(target, rp):
    ep = target['epochs_run']
    return {'job': target['key'], 'epoch_compared': ep, 'run_state': target['final_state'],
            'replay_state': rp['states'][ep], 'stream': rp['stream'], 'equal': rp['states'][ep] == target['final_state']}


def hit_rr(codes_by_row, slots):
    """Per row, the pessimistic RR (A13.7) of slot 0 against the listed negative slots."""
    out = []
    for cs in codes_by_row:
        out.append(ST.rr(cs[0], [cs[s] for s in slots]))
    return out


RANDOM_SLOTS = tuple(range(1, 11))
HARD_SLOTS = tuple(range(11, 21))


def within_row_rr(codes_by_row, declared):
    """L14 control 1 (A13 L14; spec section 8): row r's declared positive is slot j_r of slots 0..10 (0 the parent,
    1-10 its random negatives in file order); its pessimistic RR against the other ten, from the table's existing test
    codes (no extra scoring)."""
    return [ST.rr(row[j], [row[k] for k in range(11) if k != j]) for row, j in zip(codes_by_row, declared)]


def learned_hit_job(key, rec, outputs, arm, extra=None, tag='decisive'):
    j = {'kind': 'score-learned', 'key': f'p1L-{tag}-{key}', 'table': key, 'geometry': rec['geometry'], 'd': rec['d'],
         'snap_sha': rec['snap_sha'], 'arm': arm, 'outputs': outputs, 'est': 50.0}
    j.update(extra or {})
    return j


def step_tune(cfg, ctx):
    log, rd = ctx['log'], ctx['readings']
    world, insts = ctx['world'], ctx['insts']
    rd('stage2-runner-7', 'A13.10.5: a tuning run\'s score is the exact mean of its mean val RR in the random setting '
       '(slots 0-10) and in the hard setting (slots 0 and 11-20), from one tie-class list of the 21 slots of every val '
       'row (A13.6); a rate is eligible when neither of its two runs diverged and both converged (A13.10.7); the frozen '
       'rate has the largest exact mean of its two runs, ties to the smaller rate; a cell with no eligible rate has '
       'none.')
    jobs = tuning_jobs(cfg)
    want = tuning_key('lorentz', 3, cfg.grid[0], cfg.seeds.tuning(GRID.index(cfg.grid[0]))[0])
    target = next((j for j in jobs if j['key'] == want), jobs[0])
    rjob = {'kind': 'replay', 'key': f'replay-{target["key"]}', 'target': target['key'], 'seed': target['seed'],
            'd': target['d'], 'est': 1e9}
    n = len(world.at.nodes)
    disk_preflight(cfg, ctx, sum(table_bytes(n, j['d'], j['geometry']) for j in jobs)
                   + len(jobs) * len(insts['HIT-val'].rows) * 21 * CODE_LINE_BYTES, 'tuning')
    log(f'tuning: {len(jobs)} runs ({len(cfg.cells)} cells x {len(cfg.grid)} rates x 2 seeds, A13.10.5), and the '
        f'replay of {target["key"]} with hpstep.prng.Rng')
    res = run_pool(cfg, ctx, jobs + [rjob], 'tuning: training', 'spawn')
    rc = replay_check(res[target['key']] | {'key': target['key']}, res[rjob['key']])
    log(f'replay check: {target["key"]} after epoch {rc["epoch_compared"]}: '
        + ('EQUAL' if rc['equal'] else 'DIFFERENT'))
    if not rc['equal']:
        log('REFUSED: the replay\'s state differs from the run\'s; no tuning-stage2.json is written (A10.1)')
        return 1
    sjobs = [learned_hit_job(j['key'], res[j['key']], [{'inst': 'HIT-val', 'form': 'G', 'rule': '-', 'slots': 21}],
                             'tuning', tag='tune') for j in jobs if res[j['key']].get('snap_sha')]
    _G.update(cfg=cfg, world=world, insts=insts, P=None)
    sres = run_pool(cfg, ctx, sjobs, 'tuning: HiT val (pass 1)', 'fork')
    runs, cells = [], {}
    by_key = {}
    for j in jobs:
        r = res[j['key']]
        e = {'cell': f'{j["geometry"]}-{j["d"]}', 'geometry': j['geometry'], 'd': j['d'], 'lr': j['lr'],
             'seed': j['seed'], 'diverged_epoch': r['diverged_epoch'], 'epochs_run': r['epochs_run'],
             'converged': r['converged'], 'drop_epoch': r['drop_epoch'], 'float_sha': r['float_sha'],
             'snap_sha': r.get('snap_sha'), 'guard_hits': r['guard_hits'], 'max_step': r['max_step'],
             'max_radius': r['max_radius'], 'loss': r['loss'], 'final_state': r['final_state'], 'wall_s': r['wall_s'],
             'cpu_s': r['cpu_s'], 'concurrent_processes': r['concurrent_processes'],
             'environment_sha': r.get('environment_sha'), 'resumed': bool(r.get('resumed'))}
        sj = sres.get(f'p1L-tune-{j["key"]}')
        if sj:
            fk = next(iter(sj['files']))
            f = sj['files'][fk]
            rows = read_codes(cfg, f)
            rr_r, rr_h = hit_rr(rows, RANDOM_SLOTS), hit_rr(rows, HARD_SLOTS)
            mr, mh = ST.mean_exact(rr_r), ST.mean_exact(rr_h)
            e.update(code_file=f['fkey'], code_sha=f['sha'], mean_rr_random=fstr(mr), mean_rr_hard=fstr(mh),
                     score=fstr((mr + mh) / 2), score_float=float((mr + mh) / 2))
        runs.append(e)
        by_key[(j['geometry'], j['d'], j['lr'], j['seed'])] = e
    for g, d in cfg.cells:
        rates = {}
        chosen, best = None, None
        for lr in cfg.grid:
            seeds = cfg.seeds.tuning(GRID.index(lr))
            rs = [by_key[(g, d, lr, s)] for s in seeds]
            eligible = all(r['diverged_epoch'] is None and r['converged'] and r.get('score') for r in rs)
            mean = (Fraction(rs[0]['score']) + Fraction(rs[1]['score'])) / 2 if eligible else None
            rates[lr] = {'seeds': list(seeds), 'eligible': eligible, 'mean': None if mean is None else fstr(mean),
                         'mean_float': None if mean is None else float(mean),
                         'diverged': sum(r['diverged_epoch'] is not None for r in rs),
                         'not_converged': sum(not r['converged'] for r in rs)}
            if eligible and (best is None or mean > best):         # strict: an equal mean keeps the smaller rate
                chosen, best = lr, mean
        cells[f'{g}-{d}'] = {'geometry': g, 'd': d, 'rates': rates, 'chosen': chosen,
                             'at_grid_end': chosen in (GRID[0], GRID[-1])}
        log(f'  {g} d={d}: ' + ', '.join(f'{lr} ' + (f'{rates[lr]["mean_float"]:.6f}' if rates[lr]['eligible']
                                                   else 'not eligible') for lr in cfg.grid) + f' -> {chosen}')
    recheck_tree(cfg, ctx, 'before writing tuning-stage2.json')
    tuning = {'label': ctx['label'], 'mode': cfg.mode, 'shape': cfg.shape, 'step': 'tune', 'head': ctx['git']['head'],
              'git': ctx['git'], 'git_checks': ctx['git_checks'], 'development_run': ctx['mark'],
              'starts': ctx['starts'], 'environment': ctx['env'], 'load_averages': ctx['load'].samples,
              'readings': rd.items, 'counts': ctx['counts'], 'disk': ctx.get('disk'), 'time_record': ctx.get('time'),
              'grid': list(cfg.grid), 'cells_run': [list(c) for c in cfg.cells],
              'seeds': {lr: list(cfg.seeds.tuning(GRID.index(lr))) for lr in cfg.grid},
              'budget': ctx['counts']['budget'], 'protocol_sha': S2D.protocol_sha(),
              'instance': {'hit_val': {'iid': insts['HIT-val'].iid, 'sha': insts['HIT-val'].sha,
                                       'rows': len(insts['HIT-val'].rows),
                                       'pairSetSha': insts['HIT-val'].pair_set_sha}},
              'runs': runs, 'replay_check': rc, 'cells': cells,
              'pass1_files': {f['fkey']: {'sha': f['sha'], 'tsv_sha': f['tsv_sha'], 'values_sha': f['values_sha'],
                                          'side_sha': f['side_sha']}
                              for r in sres.values() for f in r['files'].values()},
              'timing': {'total_s': time.perf_counter() - ctx['t0']}}
    if cfg.mode == 'selftest':
        tuning['selftest'] = SELFTEST_BANNER
    text = P4.jdump(tuning)
    tpath = paths(cfg, 'tune')['json']
    if all(res[j['key']].get('resumed') for j in jobs) and same_tuning(tpath, tuning):
        # READING (A13.15 step 7 with A10.14, "the same run"; run_claims_phase4's rule): a restart that finds every
        # job finished and tuning-stage2.json already holding exactly these runs, files and choice leaves it (and its
        # settings) unchanged, so that settings-stage2.json's SHA-256 does not move under a resuming run
        log(f'{P4.display_path(tpath)} already holds these {len(runs)} runs and this choice: left unchanged')
        if cfg.mode in ('dry', 'selftest') and not os.path.exists(cfg.settings):
            write_settings_file(cfg, log)
        return 0
    write_atomic(tpath, text)
    log(f'wrote {P4.display_path(tpath)} (SHA-256 {sha256(text)})')
    if cfg.mode in ('dry', 'selftest'):           # the dry run needs no amendment: its settings are written here
        write_settings_file(cfg, log)
    return 0


def same_tuning(path, tuning):
    """Whether tuning-stage2.json at path already holds these runs (resumed flags aside), cells, files, replay check
    and HEAD."""
    if not os.path.exists(path):
        return False
    with open(path, encoding='utf-8') as fh:
        old = json.load(fh)
    new = json.loads(P4.jdump(tuning))

    def strip(runs):
        return [{k: v for k, v in r.items() if k != 'resumed'} for r in runs]
    return (old.get('head') == new['head'] and strip(old.get('runs', [])) == strip(new['runs'])
            and old.get('cells') == new['cells'] and old.get('replay_check') == new['replay_check']
            and old.get('pass1_files') == new['pass1_files'] and old.get('instance') == new['instance'])


# ================================================================ settings-stage2.json
def settings_text(rates, tuning_ref, cells=CELLS):
    """settings-stage2.json (spec section 10): {"lorentz": {"2": rate or null, "3": ...}, "euclid": {...}} and, as
    A10.8's settings.json did, "tuning": the file it was written from (path, HEAD, SHA-256).
    READING (spec section 10, the file's shape): the two geometry keys as the spec gives them, plus the "tuning" key
    naming tuning-stage2.json, so that the decisive run can check that the settings are tuning's choice."""
    out = {}
    for g, d in cells:
        r = rates[(g, d)]
        if r is not None and r not in GRID:
            raise ValueError(f'{r!r} is not a grid rate')
        out.setdefault(g, {})[str(d)] = r
    out['tuning'] = tuning_ref
    return json.dumps(out, sort_keys=True, indent=1, ensure_ascii=False) + '\n'


def read_settings(text, cells=CELLS):
    obj = json.loads(text)
    out = {}
    for g, d in cells:
        r = obj[g][str(d)]
        if r is not None and r not in GRID:
            raise ValueError(f'settings: cell ({g}, {d}) holds {r!r}')
        out[(g, d)] = r
    if set(obj) != {g for g, _ in cells} | {'tuning'}:
        raise ValueError('settings: unexpected keys')
    return out, obj['tuning']


def write_settings_file(cfg, log):
    tpath = paths(cfg, 'tune')['json']
    with open(tpath, 'rb') as fh:
        raw = fh.read()
    tuning = json.loads(raw)
    rates = {(c['geometry'], c['d']): c['chosen'] for c in tuning['cells'].values()}
    label = 'results/tuning-stage2.json' if cfg.mode == 'registered' else os.path.relpath(tpath, cfg.results)
    text = settings_text(rates, {'file': label, 'head': tuning['head'], 'sha256': hashlib.sha256(raw).hexdigest()},
                         cells=[tuple(c) for c in tuning['cells_run']])
    write_atomic(cfg.settings, text)
    s = sha256(text)
    log(f'wrote {P4.display_path(cfg.settings)}: SHA-256 {s}')
    return s


def step_write_settings(cfg):
    gs = P4.git_state()
    check_tree(cfg.mode, 'write-settings', gs, False)
    tpath = paths(cfg, 'tune')['json']
    if not os.path.exists(tpath):
        raise Refused('no results/tuning-stage2.json: run --tune first')
    if REL_REF + '/results/tuning-stage2.json' in gs['changed']:
        raise Refused('results/tuning-stage2.json is not committed (A13.15 step 6 lists the committed file)')
    s = write_settings_file(cfg, print)
    print(f'settings-stage2.json SHA-256 (for the lr-freeze amendment, A13.15 step 6): {s}')
    return 0


# ================================================================ reading pass-1 files (pass 2 and tuning)
def read_codes(cfg, frec):
    """A pass-1 code file, refused unless its gzip bytes have the recorded SHA-256 (A13.8): pair -> [code];
    dir -> ([codeF], [codeR]); hit -> [[codes of the row's slots]] in row order."""
    p = code_path(cfg.cache, frec['fkey'])
    with open(p, 'rb') as fh:
        gz = fh.read()
    if sha256(gz) != frec['sha']:
        raise Refused(f'{p}: SHA-256 differs from the run record (A13.8): pass 2 refuses it')
    text = gzip.decompress(gz).decode('utf-8')
    lines = text.split('\n')[:-1]
    if frec['kind'] == 'pair':
        return [int(x.split('\t')[1]) for x in lines]
    if frec['kind'] == 'dir':
        f = [x.split('\t') for x in lines]
        return [int(a[1]) for a in f], [int(a[2]) for a in f]
    out, cur, last = [], None, None
    for x in lines:
        r, s, c = x.split('\t')
        if r != last:
            cur = []
            out.append(cur)
            last = r
        cur.append(int(c))
    return out


# ================================================================ step: decisive (A13.15 step 7; spec section 11)
def preflight_settings(cfg, ctx):
    """tuning-stage2.json, settings-stage2.json and (registered) the lr-freeze amendment and the paths changed since
    tuning's commit (A13.15 steps 6 and 7)."""
    log = ctx['log']
    tpath = paths(cfg, 'tune')['json']
    for p in (tpath, cfg.settings):
        if not os.path.exists(p):
            raise Refused(f'{P4.display_path(p)} is missing: run --tune' + ('' if cfg.mode != 'registered'
                                                                            else ' and --write-settings'))
    with open(tpath, 'rb') as fh:
        traw = fh.read()
    tuning = json.loads(traw)
    with open(cfg.settings, 'rb') as fh:
        sraw = fh.read()
    ssha = hashlib.sha256(sraw).hexdigest()
    try:
        rates, ref = read_settings(sraw.decode('utf-8'), cells=cfg.cells)
    except (ValueError, KeyError) as e:
        raise Refused(f'settings-stage2.json: {e}')
    chosen = {(c['geometry'], c['d']): c['chosen'] for c in tuning['cells'].values()}
    if rates != chosen:
        raise Refused(f'settings-stage2.json\'s rates {rates} are not tuning-stage2.json\'s choice {chosen}')
    if ref.get('sha256') != hashlib.sha256(traw).hexdigest() or ref.get('head') != tuning['head']:
        raise Refused('settings-stage2.json does not name this tuning-stage2.json (SHA-256 and HEAD)')
    if tuning['mode'] != cfg.mode or tuning.get('shape') != cfg.shape:
        raise Refused(f'tuning-stage2.json is a {tuning["mode"]} run')
    if not tuning['replay_check']['equal']:
        raise Refused('tuning-stage2.json\'s replay check failed')
    if cfg.mode == 'registered' and tuning.get('development_run'):
        raise Refused(f'tuning-stage2.json is marked "{tuning["development_run"]}"')
    out = {'tuning_path': P4.display_path(tpath), 'tuning_sha256': hashlib.sha256(traw).hexdigest(),
           'tuning_head': tuning['head'], 'settings_path': P4.display_path(cfg.settings), 'settings_sha256': ssha,
           'rates': {f'{g}-{d}': r for (g, d), r in rates.items()}, 'freeze_amendment': None,
           'changed_since_tuning': None}
    if cfg.mode in ('registered', 'dry'):
        head = ctx['git']['head']
        code, _ = P4.git('merge-base', '--is-ancestor', tuning['head'], head)
        code2, changed = P4.changed_between(tuning['head'], head)
        out['changed_since_tuning'] = changed
        out['tuning_head_is_ancestor'] = code == 0
        if cfg.mode == 'registered':
            allowed = {REL_SYS + '/PREREGISTRATION.md', REL_REF + '/settings-stage2.json',
                       REL_REF + '/results/tuning-stage2.json', REL_REF + '/results/stage2-tuning-console.txt'}
            if code != 0 or code2 != 0:
                raise Refused(f'the commit tuning ran on ({tuning["head"]}) is not an ancestor of HEAD')
            bad = [p for p in changed if p not in allowed]
            if bad:
                raise Refused('paths changed since the commit tuning ran on, other than PREREGISTRATION.md, '
                              'settings-stage2.json, tuning-stage2.json and tuning\'s console (A13.15 step 7): '
                              + '; '.join(bad))
            with open(S2D.PREREGISTRATION, encoding='utf-8') as fh:
                try:
                    out['freeze_amendment'] = frozen_in_amendment(fh.read(), ssha, 13)
                except ValueError as e:
                    raise Refused(f'the lr-freeze amendment (A13.15 step 6): {e}')
            log(f'pre-flight: tuning at {tuning["head"][:12]}, changed since: {", ".join(changed) or "nothing"}; the '
                f'lr freeze is Amendment {out["freeze_amendment"]}')
    return tuning, rates, ssha, out


def training_plan(cfg, rates, tuning):
    """Measured (seeds 0-4 at each frozen rate), edge-shuffled (pairs Rng(2600 + s)), the two pre-flight retrainings
    and the replay of measured (lorentz, 3, seed 0) (A13.10.6, A13.10.9)."""
    jobs = []
    for g, d in cfg.cells:
        lr = rates[(g, d)]
        if lr is None:
            continue
        for j, s in enumerate(cfg.seeds.training):
            est = 1.0 + d + (0.4 if g == 'lorentz' else 0)
            jobs.append({'kind': 'measured', 'key': f'measured-{g}-d{d}-lr{lr}-s{s}', 'geometry': g, 'd': d,
                         'lr': lr, 'seed': s, 'index': j, 'est': est})
            jobs.append({'kind': 'shuffled', 'key': f'shuffled-{g}-d{d}-lr{lr}-s{s}', 'geometry': g, 'd': d,
                         'lr': lr, 'seed': s, 'index': j, 'pairs_seed': cfg.seeds.edge_floor + j, 'est': est})
    lr0 = cfg.grid[0]
    s0 = cfg.seeds.tuning(GRID.index(lr0))[0]
    for g in ('euclid', 'lorentz'):
        jobs.append({'kind': 'preflight', 'key': f'preflight-{g}-d2-lr{lr0}-s{s0}', 'geometry': g, 'd': 2, 'lr': lr0,
                     'seed': s0, 'target': tuning_key(g, 2, lr0, s0), 'est': 3.0})
    meas = [j for j in jobs if j['kind'] == 'measured']
    target = next((j for j in meas if (j['geometry'], j['d'], j['index']) == ('lorentz', 3, 0)),
                  meas[0] if meas else None)
    if target is not None:
        jobs.append({'kind': 'replay', 'key': f'replay-{target["key"]}', 'target': target['key'],
                     'seed': target['seed'], 'd': target['d'], 'est': 1e9})
    return jobs


def floor_tables(cfg, ctx, world):
    """A13.10.6's floors: the initial table of item 3 from a fresh Rng(2600 + i), i < 5, untrained and snapped, for
    every cell; written to the cache like a trained table."""
    out = {}
    offsets = world.at.nodes
    n = len(offsets)
    for g, d in cfg.cells:
        for i in range(len(cfg.seeds.training)):
            key = f'floor-{g}-d{d}-i{i}'
            seed = cfg.seeds.edge_floor + i
            X, N = EM.floor_table_snapped(seed, n, d, g)
            text = LR.snap_text(offsets, N)
            os.makedirs(os.path.join(cfg.cache, 'tables'), exist_ok=True)
            P4.save_npy(table_path(cfg.cache, key, '.npy'), X)
            write_atomic(table_path(cfg.cache, key, '.snap.txt'), text)
            out[key] = {'key': key, 'kind': 'floor', 'geometry': g, 'd': d, 'i': i, 'floor_seed': seed,
                        'float_sha': EM.table_sha(X), 'snap_sha': LR.snap_sha(text)}
    ctx['log'](f'floors: {len(out)} untrained tables (Rng({cfg.seeds.edge_floor} + i), i < 5, every cell), snapped')
    return out


def learned_plan(cfg, world, insts, tuning, trained, floors):
    """The pass-1 jobs of every learned table (spec section 11's decisive order)."""
    noun = world.pos == 'noun'
    jobs = []
    for r in tuning['runs']:
        if r.get('snap_sha'):
            key = tuning_key(r['geometry'], r['d'], r['lr'], r['seed'])
            jobs.append(learned_hit_job(key, r, [{'inst': 'HIT-test', 'form': 'G', 'rule': '-', 'slots': 11},
                                                 {'inst': 'HIT-test', 'form': 'G', 'rule': '-', 'slots': 11,
                                                  'relabel': True}], 'tuning'))
    for key, r in trained.items():
        if r['kind'] not in ('measured', 'shuffled') or not r.get('snap_sha'):
            continue
        outs = [{'inst': 'HIT-test', 'form': 'G', 'rule': '-', 'slots': 21},
                {'inst': 'HIT-test', 'form': 'G', 'rule': '-', 'slots': 11, 'relabel': True},
                {'inst': 'HL-at', 'form': 'G', 'rule': 'max'}]
        if r['kind'] == 'measured':
            outs[0]['f1'] = True
            outs += [{'inst': 'HIT-test', 'form': 'dist', 'rule': '-', 'slots': 21},
                     {'inst': 'HL-at', 'form': 'dist', 'rule': 'max'},
                     {'inst': 'HIT-val', 'form': 'G', 'rule': '-', 'slots': 21, 'f1': True}]
            if noun:
                outs += [{'inst': 'HIT-test', 'form': 'Groot', 'rule': '-', 'slots': 21},
                         {'inst': 'HL-at', 'form': 'Groot', 'rule': 'max'}]
            if 'HITR-test' in insts:
                outs.append({'inst': 'HITR-test', 'form': 'G', 'rule': '-', 'slots': 21})
            if cfg.reported:
                # A13.11 (reported): NK17 scores on HiT test (both settings) and HL within U_@; L14's tables on the L13
                # rows (BD, WB and BD-dir covered in U_@)
                outs += [{'inst': 'HIT-test', 'form': 'NK17', 'rule': '-', 'slots': 21},
                         {'inst': 'HL-at', 'form': 'NK17', 'rule': 'max'},
                         {'inst': 'BD-at', 'form': 'G', 'rule': 'max'}, {'inst': 'WB-at', 'form': 'G', 'rule': 'max'},
                         {'inst': 'BD-dir-at', 'form': 'G', 'rule': 'max'}]
        jobs.append(learned_hit_job(key, r, outs, 'learned' if r['kind'] == 'measured' else 'edge-shuffled',
                                    {'est': 200.0}))
    for key, r in floors.items():
        jobs.append(learned_hit_job(key, r, [{'inst': 'HIT-test', 'form': 'G', 'rule': '-', 'slots': 21}], 'floor'))
    for j in jobs:
        j['outputs'] = [o for o in j['outputs'] if insts.get(o['inst']) is not None and insts[o['inst']].rows]
    return jobs


def step_decisive(cfg, ctx):
    log, rd = ctx['log'], ctx['readings']
    world, insts = ctx['world'], ctx['insts']
    tuning, rates, ssha, pre = preflight_settings(cfg, ctx)
    ctx['preflight'] = pre
    if cfg.mode == 'registered':
        ctx['manifest'] = manifest_check(cfg, world, insts, log)
    if world.pos == 'noun':
        # HIT-R (A13.11, reported): drawn here, in the decisive run, from the instance seeds Rng(1500)-Rng(1502)
        hr = hitr_rows(world.at, cfg.seeds.hitr)
        for name in ('test', 'val'):
            insts[f'HITR-{name}'] = Inst(f'HITR-{name}', f'hit-r-wordnet30-noun-at-{name}', 'hit-test', hr['sha'],
                                         'stage2/1', 'rr', 'hit', 'at', hr[name], selected_rows=len(hr[name]),
                                         note='HIT-R (A13.11): rebuilt from WordNet with instance seeds')
        ctx['counts']['hitr'] = {'n_T': hr['n_T'], 'val': len(hr['val']), 'test': len(hr['test']), 'sha': hr['sha'],
                                 'checks': HIT.hit_r_counts({'val': [(world.at.index[r.child],
                                                                      world.at.index[r.parent],
                                                                      [world.at.index[x] for x in r.random],
                                                                      [world.at.index[x] for x in r.hard])
                                                                     for r in hr['val']],
                                                             'test': [(world.at.index[r.child],
                                                                       world.at.index[r.parent],
                                                                       [world.at.index[x] for x in r.random],
                                                                       [world.at.index[x] for x in r.hard])
                                                                      for r in hr['test']]}, world.at)}
    xjobs = exact_plan(cfg, insts)
    tjobs = training_plan(cfg, rates, tuning)
    n = len(world.at.nodes)
    hit_rows = len(insts['HIT-test'].rows)
    n_meas = sum(1 for j in tjobs if j['kind'] == 'measured')
    val_rows = len(insts['HIT-val'].rows) if insts.get('HIT-val') is not None else 0
    learned_lines = (len(tuning['runs']) * hit_rows * 22 + sum(1 for j in tjobs if j['kind'] in ('measured', 'shuffled'))
                     * hit_rows * 21 * 4 + len(cfg.cells) * 5 * hit_rows * 21
                     + (n_meas * hit_rows * 21 if cfg.reported else 0)
                     + n_meas * (val_rows + hit_rows) * 21)          # F1's joint val + test lists (A13.8, A13.11)
    disk_preflight(cfg, ctx, plan_lines(insts, xjobs) * CODE_LINE_BYTES + learned_lines * CODE_LINE_BYTES
                   + sum(table_bytes(n, j['d'], j['geometry']) for j in tjobs if j['kind'] != 'replay')
                   + len(cfg.cells) * 5 * table_bytes(n, 3, 'lorentz'), 'the decisive run')
    _G.update(cfg=cfg, world=world, insts=insts, P=None)
    log(f'pass 1, exact arms: {len(xjobs)} jobs ({sum(len(j["outputs"]) for j in xjobs)} code files)')
    t0 = time.perf_counter()
    xres = run_pool(cfg, ctx, xjobs, 'pass 1: exact arms', 'fork')
    ctx['timings']['pass1_exact_s'] = time.perf_counter() - t0
    # closure bits from WordNet (A13.11: "the closure bit computed from WordNet in pass 1")
    closure = closure_bits(cfg, world, insts)
    t0 = time.perf_counter()
    tres = run_pool(cfg, ctx, tjobs, 'training: measured, edge-shuffled, pre-flight, replay', 'spawn')
    ctx['timings']['training_s'] = time.perf_counter() - t0
    trained = {k: v for k, v in tres.items() if v['kind'] in ('measured', 'shuffled', 'preflight')}
    replay = None
    rj = next((j for j in tjobs if j['kind'] == 'replay'), None)
    if rj is not None:
        replay = replay_check(dict(tres[rj['target']], key=rj['target']), tres[rj['key']])
        log(f'replay check: {rj["target"]} after epoch {replay["epoch_compared"]}: '
            + ('EQUAL' if replay['equal'] else 'DIFFERENT'))
        if not replay['equal']:
            log('REFUSED: the replay\'s state differs from the run\'s; this step writes no result (A13.10.9, A10.1)')
            return 1
    pre_runs = {}
    by_tuning = {tuning_key(r['geometry'], r['d'], r['lr'], r['seed']): r for r in tuning['runs']}
    for j in (j for j in tjobs if j['kind'] == 'preflight'):
        t = by_tuning.get(j['target'])
        pre_runs[j['key']] = {'target': j['target'], 'float_sha': tres[j['key']]['float_sha'],
                              'tuning_float_sha': t['float_sha'] if t else None,
                              'equal': bool(t) and tres[j['key']]['float_sha'] == t['float_sha']}
        if not pre_runs[j['key']]['equal']:
            log(f'NOTE: pre-flight {j["key"]}: float SHA-256 differs from tuning\'s (disclosed; the run goes on, '
                f'A13.10.9)')
    floors = floor_tables(cfg, ctx, world)
    # L14 control 2's P, computed here for the first time (A13.12, A13.15 step 7)
    P = l6.label_permutation(cfg.seeds.relabel, n)
    _G.update(P=P)
    missing = [r for r in tuning['runs'] if r.get('snap_sha') and not os.path.exists(
        table_path(cfg.cache, tuning_key(r['geometry'], r['d'], r['lr'], r['seed']), '.snap.txt'))]
    if missing:
        # READING (A13.10.6, "tuning tables are kept in the cache for controls 1-2"): a tuning table missing from the
        # cache (or, in pass 1, one whose snapped text lost its recorded SHA-256) stops the decisive run; A10.9's
        # retraining of a lost tuning table is not carried over, since A13 does not register it
        raise Refused(f'{len(missing)} tuning tables are missing from the cache (A13.10.6: kept for controls 1-2)')
    ljobs = learned_plan(cfg, world, insts, tuning, trained, floors)
    t0 = time.perf_counter()
    lres = run_pool(cfg, ctx, ljobs, 'pass 1: learned tables', 'fork')
    ctx['timings']['pass1_learned_s'] = time.perf_counter() - t0
    files = {}
    claims_of = {}
    for j in xjobs:
        for fk, f in xres[j['key']]['files'].items():
            files[fk] = f
            form, rule = fk.split('/')[2:4]
            claims_of[fk] = j['claims'][f'{form}/{rule}']
    for j in ljobs:
        for fk, f in lres[j['key']]['files'].items():
            files[fk] = dict(f, table=j['table'], table_kind=j['arm'])
    recheck_tree(cfg, ctx, 'before pass 2')
    return pass2_and_write(cfg, ctx, world, insts, files, claims_of, closure, tuning, rates, ssha, trained, floors,
                           replay, pre_runs, P)


@pass1
def closure_bits(cfg, world, insts):
    """Per row of HL, BD and WB (and their dry stand-ins): whether some sense pairing (s, t) is a WordNet closure pair
    in either direction (t a strict '@'/'@i' ancestor of s), from WordNet alone (A13.11). Returns {inst: (fwd, rev)}."""
    g = world.wn_graph
    U = world.U_full
    out = {}
    for name in ('HL', 'BD', 'WB'):
        inst = insts.get(name)
        if inst is None:
            continue
        fw, rv = [], []
        for _, x, y in inst.rows:
            sx = SE.senses(x, U, world.wn, world.pos)
            sy = SE.senses(y, U, world.wn, world.pos)
            fw.append(any(t != s and t in g.anc(s) for s in sx for t in sy))
            rv.append(any(t != s and t in g.anc(s) for s in sy for t in sx))
        out[name] = (fw, rv)
    return out


# ================================================================ pass 2 (A13.8: gold, metrics, controls, decisions)
def clean(x):
    """JSON-ready values for P4.jdump: Rho as its exact text, display and float; Decimal as str; sets sorted."""
    from decimal import Decimal
    if isinstance(x, ST.Rho):
        return {'rho': x.display(), 'exact': x.text(), 'float': float(x), 'zero_variance': x.zero, 'n': x.n}
    if isinstance(x, Decimal):
        return str(x)
    if isinstance(x, dict):
        return {(k if isinstance(k, str) else '/'.join(map(str, k)) if isinstance(k, tuple) else str(k)): clean(v)
                for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [clean(v) for v in x]
    if isinstance(x, (set, frozenset)):
        return sorted(clean(v) for v in x)
    if isinstance(x, Fraction):
        return {'exact': fstr(x), 'float': float(x)}
    if isinstance(x, (np.bool_,)):
        return bool(x)
    if isinstance(x, np.integer):
        return int(x)
    if isinstance(x, (float, np.floating)):
        x = float(x)
        return x if math.isfinite(x) else repr(x)
    return x


class Pass2:
    """Pass 2 (A13.8): reads gold, labels and TYPE; checks every pass-1 file's SHA-256 before reading it; computes
    every metric, interval, control and decision from the codes alone."""

    def __init__(self, cfg, ctx, world, insts, files):
        self.cfg, self.ctx, self.world, self.insts, self.files = cfg, ctx, world, insts, files
        self.log = ctx['log']
        self.boot, self.R = cfg.seeds.bootstrap, cfg.resamples
        self.perms = range(cfg.seeds.perms)
        self._gold, self._codes, self._perm = {}, {}, {}
        self.n_intervals = 0
        self.by = {}
        for fk, f in files.items():
            self.by[(f['inst'], f['arm'], f['form'], f['rule'], f.get('table', '-'))] = fk

    # ------------------------------------------------------------ logging with the dry seal (A13.13)
    def say(self, sealed, what, msg):
        if self.cfg.seal and sealed:
            self.log(f'{what}: [sealed]')
        else:
            self.log(f'{what}: {msg}')

    # ------------------------------------------------------------ gold
    def gold_map(self, spec):
        if spec not in self._gold:
            st = self.world.store
            if spec == 'hyperlex':
                m = {r: s for r, _, s, _ in S2D.hyperlex_gold('hyperlex-all', st)}
            elif spec == 'hyperlex-hyp':
                m = {r: t in S2D.HL_TYPES[:4] for r, t, _, _ in S2D.hyperlex_gold('hyperlex-all', st)}
            elif spec == 'hyperlex-type':
                m = {r: t for r, t, _, _ in S2D.hyperlex_gold('hyperlex-all', st)}
            elif spec == 'hyperlex-010':
                m = {r: s10 for r, _, _, s10 in S2D.hyperlex_gold('hyperlex-all', st)}
            elif spec == 'hyperlex-split':
                m = {r: s for r, _, s, _ in S2D.hyperlex_split_gold(st)}
            elif spec in ('bless', 'wbless', 'leds', 'shwartz', 'eval', 'bibless'):
                m = dict(S2D.suite_gold(spec, st))
            elif spec == 'simlex':
                m = dict(S2D.simlex_gold(st))
            elif spec == 'men':
                m = dict(S2D.men_gold(st))
            elif spec.startswith('ws353'):
                m = dict(S2D.ws353_gold(spec, st))
            else:
                raise ValueError(spec)
            self._gold[spec] = m
        return self._gold[spec]

    def gold(self, inst, spec=None):
        m = self.gold_map(spec or inst.gold)
        return [m[r] for r in inst.pair_rows]

    def labels(self, inst):
        return [bool(x) for x in self.gold(inst)]

    def permuted(self, values, seed):
        key = (id(values), seed)
        if key not in self._perm:
            self._perm[key] = ST.permute_rows(values, seed)
        return self._perm[key]

    # ------------------------------------------------------------ codes
    def fk(self, inst, arm, form, rule='max', table='-'):
        return self.by[(inst, arm, form, rule, table)]

    def has(self, inst, arm, form, rule='max', table='-'):
        return (inst, arm, form, rule, table) in self.by

    def codes_fk(self, fk):
        if fk not in self._codes:
            self._codes[fk] = read_codes(self.cfg, self.files[fk])
        return self._codes[fk]

    def C(self, inst, arm, form='G', rule='max', table='-'):
        return self.codes_fk(self.fk(inst, arm, form, rule, table))

    # ------------------------------------------------------------ intervals (A13.7)
    def rho_iv(self, inst, A, B, what):
        gold = self.gold(inst)
        iw, ir = {}, {}
        w = ST.ci_rho(A, B, gold, inst.word_pairs(), seed=self.boot, resamples=self.R, info=iw)
        r = ST.ci_rho_rows(A, B, gold, seed=self.boot, resamples=self.R, info=ir)
        self.n_intervals += 2
        return {'what': what, 'est': w.est, 'lo': w.lo, 'hi': w.hi, 'n': len(A), 'pairSetSha': inst.pair_set_sha,
                'unit': 'word', 'V': iw['V'], 'mean_resample_size': iw['mean_size'],
                'undefined': [iw['undefined_a'], iw['undefined_b']], 'ordered': w.lo <= w.est <= w.hi,
                'row_bootstrap': {'est': r.est, 'lo': r.lo, 'hi': r.hi, 'unit': 'row',
                                  'undefined': [ir['undefined_a'], ir['undefined_b']]}}

    def cluster_iv(self, inst, A, B, keys, metric, labels=None, what=''):
        info = {}
        iv = ST.ci_cluster(A, B, keys, metric, labels, seed=self.boot, resamples=self.R, info=info)
        self.n_intervals += 1
        return {'what': what, 'est': iv.est, 'lo': iv.lo, 'hi': iv.hi, 'n': len(keys), 'clusters': info['clusters'],
                'pairSetSha': inst.pair_set_sha, 'unit': 'cluster', 'undefined': [info['undefined_a'],
                                                                                  info['undefined_b']],
                'ordered': iv.lo <= iv.est <= iv.hi}

    def mean_iv(self, values, what, n_unit='row'):
        mean, (lo, hi) = RK.ci_mean(values, resamples=self.R, seed=self.boot)
        self.n_intervals += 1
        return {'what': what, 'est': mean, 'lo': lo, 'hi': hi, 'n': len(values), 'unit': n_unit,
                'ordered': lo <= mean <= hi}

    def rho_of(self, inst, codes, gold=None):
        return ST.rho(codes, self.gold(inst) if gold is None else gold)

    # ------------------------------------------------------------ the count checks that need gold (A13.9)
    def count_checks_gold(self):
        wn, st = self.world.wn, self.world.store
        problems = []
        if self.world.pos == 'noun':
            c = S2D.count_checks_gold(wn, st)
            want = S2D.COUNTS_GOLD if self.cfg.mode == 'registered' else self.world_expected('gold')
            _check('gold', c, want, problems)
            if self.cfg.mode == 'registered':
                pis = {'BD': (sum(self.labels(self.insts['BD'])), len(self.insts['BD'].rows)),
                       'WB': (sum(self.labels(self.insts['WB'])), len(self.insts['WB'].rows))}
                for k, (t, n) in pis.items():
                    if Fraction(t, n) != ST.L13_PI[k]:
                        problems.append(f'{k}: {t} of {n} rows True, registered {ST.L13_PI[k]}')
        else:
            c = S2D.dry_counts_gold(wn, st)
            want = S2D.DRY_COUNTS_GOLD_A13 if self.cfg.mode == 'dry' else self.world_expected('dry_gold')
            _check('dry gold', c, want, problems)
        self.log('count checks (labels and TYPE, pass 2): ' + ('all equal' if not problems else
                                                               f'{len(problems)} MISMATCH(ES)'))
        if problems:
            raise S2D.CountMismatch('count check failed (A13.9: the run stops with no result): ' + '; '.join(problems))
        return c

    def world_expected(self, key):
        if self.world.expected is not None:
            return self.world.expected[key]
        if TESTS not in sys.path:
            sys.path.insert(0, TESTS)
        import stage2_synth
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            return stage2_synth.make_world(d, SELFTEST_WORLD_SEED).expected[key]

    # ------------------------------------------------------------ L12 (A13)
    def l12(self):
        inst = self.insts['HL']
        C = functools.partial(self.C, 'HL')
        sealed = inst.sealed
        a = {f'{h}-{f}': self.rho_iv(inst, C(h), C(f), f'rho({h}) - rho({f})')
             for h, f in (('H3', 'F3'), ('H3', 'F3*'), ('H2', 'F2'), ('H2', 'F2*'))}
        b = {h: self.rho_iv(inst, C(h), C(h, 'DepG'), f'rho({h} G) - rho({h} Dep°)') for h in ('H3', 'H2')}
        c = {h: self.rho_iv(inst, C(h), C(h, 'Sym'), f'rho({h} G) - rho({h} Sym)') for h in ('H3', 'H2')}
        d = self.rho_iv(inst, C('H3'), C('WN'), 'rho(H3) - rho(WN)')
        sf = [self.rho_of(inst, C(f'S-full-{i}')) for i in self.perms]
        i_sf = ST.strongest(sf)
        ws = [self.rho_of(inst, C(f'W-{i}')) for i in self.perms]
        i_w = ST.strongest(ws)
        control1 = {'K3': self.rho_iv(inst, C('H3'), C('K3'), 'rho(H3) - rho(K3)'),
                    'S-full*': self.rho_iv(inst, C('H3'), C(f'S-full-{i_sf}'), f'rho(H3) - rho(S-full_{i_sf})')}
        control2 = {'W*': self.rho_iv(inst, C('H3'), C(f'W-{i_w}'), f'rho(H3) - rho(W_{i_w})')}
        control3 = self.rho_iv(inst, C('H3'), C('H3', 'Grev'), 'rho(H3 as Phi_G(x, y)) - rho(H3 as Phi_G(y, x))')
        gold = self.gold(inst)
        pg = [self.permuted(gold, inst.perm_seed + i) for i in self.perms]
        control4 = {arm: [ST.rho(C(arm), g) for g in pg] for arm in ST.L12_GOLD_ARMS}
        dec = ST.decide_l12(a, b, c, d, control1, control2, control3, control4, n=len(inst.rows))
        dec['intervals'] = {'a': a, 'b': b, 'c': c, 'd': d, 'control1': control1, 'control2': control2,
                            'control3': control3}
        dec['control4_rho'] = control4
        dec['strongest'] = {'S-full': {'i': i_sf, 'rho': [x.display() for x in sf]},
                            'W': {'i': i_w, 'rho': [x.display() for x in ws]}}
        dec['rho'] = {arm: self.rho_of(inst, C(arm)) for arm in list(SIX) + ['WN', 'K3']}
        dec['pair_set'] = {'iid': inst.iid, 'n': len(inst.rows), 'sha': inst.pair_set_sha}
        for k, v in sorted(dec['parts'].items()):
            self.say(sealed, f'L12({k})', v['verdict'])
        self.say(False, 'L12 controls fail as required', dec['controls']['fails_as_required'])
        return dec

    # ------------------------------------------------------------ L13 (A13)
    def l13(self):
        BD, WB, BDd = self.insts['BD'], self.insts['WB'], self.insts['BD-dir']
        sealed = BD.sealed
        lab = {'BD': self.labels(BD), 'WB': self.labels(WB)}
        keys = {'BD': BD.clusters, 'WB': WB.clusters}
        cells = (('H3', 'F3'), ('H3', 'F3*'), ('H2', 'F2'), ('H2', 'F2*'))
        parts = {}
        for p, st in (('a', 'BD'), ('b', 'WB')):
            inst = self.insts[st]
            parts[p] = {f'{h}-{f}': self.cluster_iv(inst, self.C(st, h), self.C(st, f), keys[st], 'ap', lab[st],
                                                    f'AP({h}) - AP({f}) on {st}') for h, f in cells}
        dl = self.labels(BDd)
        sel = [i for i, t in enumerate(dl) if t]
        kd = [BDd.clusters[i] for i in sel]

        def D(arm, form='G', inst='BD-dir'):
            cf, cr = self.C(inst, arm, form)
            return [cf[i] for i in sel], [cr[i] for i in sel]
        parts['c'] = {f'{h}-{f}': self.cluster_iv(BDd, D(h), D(f), kd, 'accuracy', what=f'acc({h}) - acc({f})')
                      for h, f in cells}
        control1 = {}
        for p, st in (('a', 'BD'), ('b', 'WB')):
            inst = self.insts[st]
            aps_sf = [ST.ap_exact(self.C(st, f'S-full-{i}'), lab[st]) for i in self.perms]
            aps_w = [ST.ap_exact(self.C(st, f'W-{i}'), lab[st]) for i in self.perms]
            i_sf, i_w = ST.strongest(aps_sf), ST.strongest(aps_w)
            control1[p] = {'K3': self.cluster_iv(inst, self.C(st, 'H3'), self.C(st, 'K3'), keys[st], 'ap', lab[st],
                                                 f'AP(H3) - AP(K3) on {st}'),
                           'S-full*': self.cluster_iv(inst, self.C(st, 'H3'), self.C(st, f'S-full-{i_sf}'), keys[st],
                                                      'ap', lab[st], f'AP(H3) - AP(S-full_{i_sf}) on {st}'),
                           'W*': self.cluster_iv(inst, self.C(st, 'H3'), self.C(st, f'W-{i_w}'), keys[st], 'ap',
                                                 lab[st], f'AP(H3) - AP(W_{i_w}) on {st}')}
        acc_sf = [ST.accuracy(*D(f'S-full-{i}')) for i in self.perms]
        acc_w = [ST.accuracy(*D(f'W-{i}')) for i in self.perms]
        i_sf, i_w = ST.strongest(acc_sf), ST.strongest(acc_w)
        control1['c'] = {'K3': self.cluster_iv(BDd, D('H3'), D('K3'), kd, 'accuracy', what='acc(H3) - acc(K3)'),
                         'S-full*': self.cluster_iv(BDd, D('H3'), D(f'S-full-{i_sf}'), kd, 'accuracy',
                                                    what=f'acc(H3) - acc(S-full_{i_sf})'),
                         'W*': self.cluster_iv(BDd, D('H3'), D(f'W-{i_w}'), kd, 'accuracy',
                                               what=f'acc(H3) - acc(W_{i_w})')}
        control2 = {}
        for st in ('BD', 'WB'):
            inst = self.insts[st]
            pl = [self.permuted(lab[st], inst.perm_seed + i) for i in self.perms]
            for arm in SIX:
                control2[(arm, st)] = [ST.ap_exact(self.C(st, arm), x) for x in pl]
        g = self.insts['BD-dir-glove']
        gl = self.labels(g)
        gsel = [i for i, t in enumerate(gl) if t]
        cf, cr = self.C('BD-dir-glove', 'GloVe-300', 'cos', '-')
        # READING (A13 L13 control 3): an empty GloVe direction set (no True row within GloVe) would make the accuracy
        # 0/0; it is recorded as 0 with a flag (the control holds vacuously). BD-dir has 1,194 rows within GloVe's
        # coverage in the registered data, so this applies to synthetic data only.
        glove_acc = ST.accuracy([cf[i] for i in gsel], [cr[i] for i in gsel]) if gsel else Fraction(0)
        control3 = {'Sym-H3': ST.accuracy(*D('H3', 'Sym')), 'GloVe': glove_acc}
        pis = {st: Fraction(sum(lab[st]), len(lab[st])) for st in ('BD', 'WB')}
        dec = ST.decide_l13(parts, control1, control2, control3, pis)
        dec['intervals'] = {'parts': parts, 'control1': control1}
        dec['control2_aps'] = {f'{arm}/{st}': [fstr(x) for x in v] for (arm, st), v in control2.items()}
        dec['strongest'] = {'c': {'S-full': i_sf, 'W': i_w}}
        dec['selection'] = {'BD-dir': {'rows': len(sel), 'of': len(dl)}, 'BD-dir-glove': {'rows': len(gsel),
                                                                                            'of': len(gl),
                                                                                            'empty': not gsel}}
        dec['pis'] = {k: fstr(v) for k, v in pis.items()}
        dec['ap'] = {st: {arm: ST.ap_exact(self.C(st, arm), lab[st]) for arm in SIX} for st in ('BD', 'WB')}
        dec['accuracy'] = {arm: ST.accuracy(*D(arm)) for arm in SIX}
        for k, v in sorted(dec['parts'].items()):
            self.say(sealed, f'L13({k})', v['verdict'])
        self.say(False, 'L13 controls fail as required', dec['controls']['fails_as_required'])
        return dec

    # ------------------------------------------------------------ L15 (A13)
    def l15(self):
        cells = (('H3', 'F3'), ('H3', 'F3*'), ('H2', 'F2'), ('H2', 'F2*'))
        a, control1, control2 = {}, {}, []
        for st in ('SL', 'MEN'):
            inst = self.insts[st]

            def S(arm):
                return self.C(st, arm, 'Sym')
            a[st] = {f'{h}-{f}': self.rho_iv(inst, S(h), S(f), f'rho({h} Sym) - rho({f} Sym) on {st}')
                     for h, f in cells}
            sf = [self.rho_of(inst, S(f'S-full-{i}')) for i in self.perms]
            ws = [self.rho_of(inst, S(f'W-{i}')) for i in self.perms]
            i_sf, i_w = ST.strongest(sf), ST.strongest(ws)
            control1[st] = {'K3': self.rho_iv(inst, S('H3'), S('K3'), f'rho(H3) - rho(K3) on {st}'),
                            'S-full*': self.rho_iv(inst, S('H3'), S(f'S-full-{i_sf}'),
                                                   f'rho(H3) - rho(S-full_{i_sf}) on {st}'),
                            'W*': self.rho_iv(inst, S('H3'), S(f'W-{i_w}'), f'rho(H3) - rho(W_{i_w}) on {st}')}
            gold = self.gold(inst)
            pg = [self.permuted(gold, inst.perm_seed + i) for i in self.perms]
            # READING (A13 L15 control 2, "for every arm and set"): every arm of L15's Arms list on the sets it reads.
            # On SL and MEN: the six exact arms and the controls K3, S-full_i and W_i (each of the 20 permutations an
            # arm, as A13.4 defines them), all with Sym; on (b)'s sets: H3 with Sym and GloVe 300-d. The readings that
            # the Arms list marks as reported (H3 with G against GloVe on HL; GloVe at 50-d, item 11) decide nothing
            # and are not banded.
            for arm in l15_control2_arms(self.perms):
                control2.append({'arm': arm, 'set': st, 'n': len(inst.rows),
                                 'rhos': [ST.rho(S(arm), g) for g in pg]})
        b, control3 = {}, {}
        for st, name in (('MEN-glove', 'MEN'), ('WSR-glove', 'WSR'), ('HL-glove', 'HL')):
            inst = self.insts[st]
            H = self.C(st, 'H3', 'Sym')
            G = self.C(st, 'GloVe-300', 'cos', '-')
            b[name] = (self.rho_iv(inst, G, H, f'rho(GloVe) - rho(H3 Sym) on {st}') if name != 'HL' else
                       self.rho_iv(inst, H, G, f'rho(H3 Sym) - rho(GloVe) on {st}'))
            gold = self.gold(inst)
            pg = [self.permuted(gold, inst.perm_seed + i) for i in self.perms]
            for arm, codes in (('H3', H), ('GloVe-300', G)):
                control2.append({'arm': arm, 'set': st, 'n': len(inst.rows), 'rhos': [ST.rho(codes, g) for g in pg]})
            control3[st] = ([ST.rho(self.C(st, f'GloVe-vec-{i}', 'cos', '-'), gold) for i in self.perms],
                            len(inst.rows))
        need = [(arm, st) for st in ST.L15_A_SETS for arm in l15_control2_arms(self.perms)]
        need += [(arm, st) for st in ST.L15_B_SETS for arm in ('H3', 'GloVe-300')]
        dec = ST.decide_l15(a, b, control1, control2, control3, required=need)
        dec['intervals'] = {'a': a, 'b': b, 'control1': control1}
        dec['control2_rho'] = control2
        dec['control3_rho'] = {k: v[0] for k, v in control3.items()}
        dec['rho'] = {st: {arm: self.rho_of(self.insts[st], self.C(st, arm, 'Sym')) for arm in SIX}
                      for st in ('SL', 'MEN')}
        sealed = self.insts['SL'].sealed
        for k, v in sorted(dec['parts'].items()):
            self.say(sealed, f'L15({k})', v['verdict'])
        self.say(False, 'L15 controls fail as required', dec['controls']['fails_as_required'])
        return dec

    # ------------------------------------------------------------ L14 (A13)
    def hit_codes(self, table, inst='HIT-test', slots=21, relabel=False, form='G'):
        name = f'{inst}{"-relabel" if relabel else ""}-s{slots}'
        for (i, arm, f, r, t), fk in self.by.items():
            if i == name and f == form and t == table:
                return self.codes_fk(fk)
        return None

    def l14(self, tuning, rates, trained, floors):
        cfg, world = self.cfg, self.world
        T = self.insts['HIT-test']
        HLa = self.insts['HL-at']
        seeds = cfg.seeds.training
        ok, bad = HIT.closure_check(T.rows, world.at.ancestors)
        closure = {'random': bad['random'] == 0, 'hard': bad['hard'] == 0}
        meas, shuf = {}, {}
        for k, r in trained.items():
            if r['kind'] in ('measured', 'shuffled'):
                j = seeds.index(r['seed'])
                (meas if r['kind'] == 'measured' else shuf)[(r['geometry'], r['d'], j)] = r
        measured = {(g, d, j): {'exists': bool(meas.get((g, d, j), {}).get('snap_sha')),
                                'converged': bool(meas.get((g, d, j), {}).get('converged'))}
                    for g, d in cfg.cells for j in range(len(seeds))}
        shuffled = {(g, d, j): bool(shuf.get((g, d, j), {}).get('snap_sha')) for g, d in cfg.cells
                    for j in range(len(seeds))}
        # READING (A13 L14, "at (d, s) a seed is present ..."): seeds are indexed j = 0..4 in the decision (the
        # training seed s itself in the registered run; 3000 + j in the dry run)
        presence = ST.l14_presence(measured, shuffled, rates)
        rr = {}

        def rr_of(key, slots_codes, setting):
            k = (key, setting)
            if k not in rr:
                rr[k] = hit_rr(slots_codes, RANDOM_SLOTS if setting == 'random' else HARD_SLOTS)
            return rr[k]
        tab = {}
        for (g, d, j), r in meas.items():
            tab[('m', g, d, j)] = r['key']
        for (g, d, j), r in shuf.items():
            tab[('s', g, d, j)] = r['key']
        a, b, c3 = {}, {}, {}
        for d in (2, 3):
            for j in range(len(seeds)):
                if not presence[(d, j)]:
                    continue
                kl, ke = tab[('m', 'lorentz', d, j)], tab[('m', 'euclid', d, j)]
                for st in ('random', 'hard'):
                    xl = rr_of(kl, self.hit_codes(kl), st)
                    xe = rr_of(ke, self.hit_codes(ke), st)
                    a[(d, st, j)] = self.mean_iv([float(p) - float(q) for p, q in zip(xl, xe)],
                                                 f'RR(Lorentz) - RR(Euclidean), d={d}, {st}, seed index {j}')
                b[(d, j)] = self.rho_iv(HLa, self.C('HL-at', 'learned', 'G', 'max', kl),
                                        self.C('HL-at', 'learned', 'G', 'max', ke),
                                        f'rho(Lorentz) - rho(Euclidean) on HL-at, d={d}, seed index {j}')
                for metric in ('rr_random', 'rr_hard', 'rho'):
                    e = {}
                    for g in ('lorentz', 'euclid'):
                        km, ks = tab[('m', g, d, j)], tab.get(('s', g, d, j))
                        if ks is None:
                            e[g] = None
                            continue
                        if metric == 'rho':
                            e[g] = self.rho_iv(HLa, self.C('HL-at', 'learned', 'G', 'max', km),
                                               self.C('HL-at', 'edge-shuffled', 'G', 'max', ks),
                                               f'rho(true) - rho(shuffled), {g} d={d}, seed index {j}')
                        else:
                            st = metric[3:]
                            xt = rr_of(km, self.hit_codes(km), st)
                            xs = rr_of(ks, self.hit_codes(ks), st)
                            e[g] = self.mean_iv([float(p) - float(q) for p, q in zip(xt, xs)],
                                                f'RR(true) - RR(shuffled), {g} d={d}, {st}, seed index {j}')
                    c3[(d, j, metric)] = e
        # controls 1 and 2 over every trained table, as many as exist (A13 L14)
        slots_j = HIT.within_row_slots(cfg.seeds.within_row, len(T.rows))
        groups = [r.parent for r in T.rows]
        control1, control2, rel_rows = {}, {}, {}
        tables = [(tuning_key(r['geometry'], r['d'], r['lr'], r['seed']), 11) for r in tuning['runs']
                  if r.get('snap_sha')]
        tables += [(r['key'], 21) for r in list(meas.values()) + list(shuf.values()) if r.get('snap_sha')]
        for key, slots in tables:
            cs = self.hit_codes(key, slots=slots)
            control1[key] = ST.mean_exact(within_row_rr(cs, slots_j))
            rc = self.hit_codes(key, slots=11, relabel=True)
            rrr = hit_rr(rc, RANDOM_SLOTS)
            control2[key], _ = ST.macro_rr(rrr, groups)
            rel_rows[key] = ST.mean_exact(rrr)
        control4 = {}
        hl_gold = self.gold(HLa)
        pg = [self.permuted(hl_gold, HLa.perm_seed + i) for i in self.perms]
        for (g, d, j), r in sorted(meas.items()):
            if r.get('snap_sha'):
                codes = self.C('HL-at', 'learned', 'G', 'max', r['key'])
                control4[r['key']] = [ST.rho(codes, x) for x in pg]
        dec = ST.decide_l14(a, b, presence, control1, control2, c3, control4, closure, n_rho=len(HLa.rows))
        dec['intervals'] = {'a': a, 'b': b, 'control3': c3}
        dec['control4_rho'] = control4
        dec['closure_failing_rows'] = bad
        dec['relabelled_per_row_mean_rr'] = {k: fstr(v) for k, v in rel_rows.items()}
        dec['tables'] = {'tuning': sum(1 for _, s in tables if s == 11), 'measured': len(meas), 'edge_shuffled': len(shuf)}
        dec['measured'] = {}
        for (g, d, j), r in sorted(meas.items()):
            cs = self.hit_codes(r['key'])
            ent = {'key': r['key'], 'seed': r['seed'], 'converged': r['converged'], 'drop_epoch': r['drop_epoch'],
                   'diverged_epoch': r['diverged_epoch']}
            if cs is not None:
                ent['mean_rr'] = {st: fstr(ST.mean_exact(rr_of(r['key'], cs, st))) for st in ('random', 'hard')}
                ent['rho_hl_at'] = self.rho_of(HLa, self.C('HL-at', 'learned', 'G', 'max', r['key']))
            dec['measured'][f'{g}-{d}-s{r["seed"]}'] = ent
        self.say(False, 'L14 closure check (must pass)', closure)
        self.say(False, 'L14(a)', dec['parts']['a']['verdict'])
        self.say(HLa.sealed, 'L14(b)', dec['parts']['b']['verdict'])
        self.say(False, 'L14 controls 1-2 and the closure check fail/pass as required',
                 {k: v for k, v in dec['controls']['fails_as_required'].items() if k != 'control4'})
        return dec, {'tab': tab, 'meas': meas, 'shuf': shuf, 'rr_of': rr_of, 'presence': presence}

    # ------------------------------------------------------------ every evaluated file: its metric (A13.14, A13.11)
    def file_metrics(self, claims_of):
        """One entry per pass-1 file with its metric (rho, AP, accuracy, mean RR; the suite protocol's accuracy for
        WB-all and BIB-all), the reported tie bounds, sklearn-convention and fractional-tie APs, and the tie and
        recomputation counts. These entries make the LBENCH/1 records."""
        out = []
        for fk in sorted(self.files):
            f = self.files[fk]
            if f.get('joint_of'):
                continue                    # F1's joint val + test list: its metric is F1, reported by Pass2.f1
            inst = self.insts[f['base_inst']]
            claim = claims_of.get(fk) or self.learned_claim(f)
            e = {'fkey': fk, 'inst': f['inst'], 'base_inst': inst.name, 'arm': f['arm'], 'form': f['form'],
                 'rule': f['rule'], 'table': f.get('table', '-'), 'table_kind': f.get('table_kind'), 'claim': claim,
                 'sealed': inst.sealed, 'rows': f['rows'], 'classes': f['classes'], 'recomputed': f['recomputed'],
                 'tie_classes': f['tie_classes'], 'tie_tuples': f['tie_tuples'], 'phi_recomputed': f['phi_recomputed'],
                 'phi_ties': f['phi_ties'], 'metrics': []}
            codes = self.codes_fk(fk)
            if f['kind'] == 'hit':
                if f.get('relabel'):
                    rrr = hit_rr(codes, RANDOM_SLOTS)
                    macro, _ = ST.macro_rr(rrr, [r.parent for r in inst.rows])
                    e['metrics'].append(('macro-rr', 'random', macro))
                    e['metrics'].append(('mean-rr', 'random', ST.mean_exact(rrr)))
                else:
                    e['metrics'].append(('mean-rr', 'random', ST.mean_exact(hit_rr(codes, RANDOM_SLOTS))))
                    if (f.get('slots') or inst.slots) == 21:
                        e['metrics'].append(('mean-rr', 'hard', ST.mean_exact(hit_rr(codes, HARD_SLOTS))))
            elif inst.metric == 'rho':
                gold = self.gold(inst)
                r = ST.rho(codes, gold)
                e['metrics'].append(('rho', None, r))
                pe, op = ST.rho_tie_bounds(codes, gold)
                e['tie_bounds'] = {'pessimistic': pe, 'optimistic': op}
            elif inst.folds is not None:
                # the suite's own detection protocol (A13.11): its records carry the protocol's test-fold AP, not an
                # AP over the validation and test rows together
                val = set(inst.folds['val'])
                m = self.gold_map(inst.gold)
                res = ST.suite_detection(codes, ['val' if r in val else 'test' for r in inst.pair_rows],
                                         [bool(m[r]) for r in inst.pair_rows], [bool(m[r]) for r in inst.folds['oov_test']])
                e['suite_detection'] = res
                e['metrics'].append(('suite-ap', None, res['ap']))
                e['metrics'].append(('suite-ap-sklearn', None, res['ap_sklearn']))
            elif inst.name == 'WB-all':
                info = {}
                res = ST.suite_threshold(codes, self.labels(inst), seed=self.cfg.seeds.suite, info=info)
                e['suite_protocol'] = res
                e['metrics'].append(('suite-acc', None, res['acc_test']))
            elif inst.name == 'BIB-all':
                cf, cr = codes
                h = [max(a, b) for a, b in zip(cf, cr)]
                direction = [1 if a >= b else -1 for a, b in zip(cf, cr)]
                res = ST.suite_threshold(h, self.gold(inst), direction=direction, seed=self.cfg.seeds.suite)
                e['suite_protocol'] = res
                e['metrics'].append(('suite-acc', None, res['acc_test']))
            elif f['kind'] == 'dir':
                lab = self.labels(inst)
                cf, cr = codes
                sel = [i for i, t in enumerate(lab) if t]
                if sel:
                    e['metrics'].append(('accuracy', None, ST.accuracy([cf[i] for i in sel], [cr[i] for i in sel])))
            elif inst.metric == 'ap':
                lab = self.labels(inst)
                if any(lab):
                    e['metrics'].append(('ap', None, ST.ap_exact(codes, lab)))
                    e['ap_sklearn'] = ST.ap_sklearn(codes, lab)
                    e['ap_fractional'] = ST.ap_fractional(codes, lab)
            out.append(e)
        return out

    def learned_claim(self, f):
        """The claim field of a learned table's file: L14/1 for the files L14's decision and controls 1-2 read (HiT
        test under G, its relabelled table, HL within U_@ under G); stage2/1 for the reported ones."""
        if f['form'] != 'G' or f['base_inst'] not in ('HIT-test', 'HL-at'):
            return 'stage2/1'
        if f.get('table_kind') == 'floor':
            return 'stage2/1'
        if f['base_inst'] == 'HL-at' and f.get('table_kind') == 'tuning':
            return 'stage2/1'
        return 'L14/1'

    # ------------------------------------------------------------ A13.11's reports
    def subset_rhos(self, inst, keep, arms, form='G', rule='max'):
        idx = [i for i, k in enumerate(keep) if k]
        gold = self.gold(inst)
        g = [gold[i] for i in idx]
        out = {'n': len(idx)}
        for arm in arms:
            if self.has(inst.name, arm, form, rule):
                c = self.C(inst.name, arm, form, rule)
                out[arm] = ST.rho([c[i] for i in idx], g) if len(idx) >= 3 else None
        return out

    def rep_l12(self, closure):
        inst = self.insts['HL']
        arms = list(SIX) + ['WN']
        U = self.world.U_full
        mono = [len(SE.senses(x, U, self.world.wn, self.world.pos)) == 1 and
                len(SE.senses(y, U, self.world.wn, self.world.pos)) == 1 for _, x, y in inst.rows]
        types = self.gold(inst, 'hyperlex-type')
        out = {'monosemous': self.subset_rhos(inst, mono, arms)}
        strata = {}
        for t in S2D.HL_TYPES:
            keep = [x == t for x in types]
            if sum(keep) >= 100:
                strata[t] = self.subset_rhos(inst, keep, arms)
        out['type_strata_at_least_100'] = strata
        out['no_type_of'] = self.subset_rhos(inst, [t in ('cohyp', 'mero', 'ant', 'no-rel') for t in types], arms)
        fw, rv = closure.get('HL', ([], []))
        out['closure_neither'] = self.subset_rhos(inst, [not a and not b for a, b in zip(fw, rv)], arms)
        g6, g10 = self.gold(inst), self.gold(inst, 'hyperlex-010')
        out['avg_score_0_10_ranks_as_avg_score'] = ST.exact_codes(g6) == ST.exact_codes(g10)
        out['chain'] = {arm: self.rho_of(inst, self.C('HL', arm)) for arm in ('WN', 'WN-U', 'ST', 'letter', 'H3')
                        if self.has('HL', arm, 'G')}
        if self.world.pos == 'noun' and 'HL-split' in self.insts:
            out['random_split_agrees'] = S2D.random_split_agrees(self.world.store)
        out['closure_bits'] = {'forward': sum(fw), 'reverse': sum(rv), 'neither': sum(1 for a, b in zip(fw, rv)
                                                                                     if not a and not b)}
        # READING (A13.3, the morphy rule "only for words absent raw"): on HL every pair-set word is in the index raw
        # (the pair set is the covered rows), so the morphy rule's scores equal the maximum's and are not recomputed;
        # the count of HL words absent raw is recorded
        tag = 'N' if self.world.pos == 'noun' else 'V'
        absent = sorted({w for _, x, y, p in S2D.hyperlex_words('hyperlex-all', self.world.store) if p == tag
                         for w in (x, y) if SE.N_S(w) not in self.world.index})
        out['morphy'] = {'pair_set_words_absent_raw': sum(1 for _, x, y in inst.rows
                                                          for w in (x, y) if SE.N_S(w) not in self.world.index),
                         'file_words_absent_raw': len(absent), 'scores': 'equal to the maximum over senses'}
        return out

    def rep_l13(self, closure, l14x=None):
        out = {}
        BD = self.insts['BD']
        lab = self.labels(BD)
        keep = [SE.N_S(x) != SE.N_S(y) for _, x, y in BD.rows]
        idx = [i for i, k in enumerate(keep) if k]
        out['ap_without_self_pairs'] = {'removed': len(keep) - len(idx)}
        fw, rv = closure.get('BD', ([], []))
        nc = [i for i in range(len(lab)) if not lab[i] or not fw[i]]
        out['non_closure_positives'] = {'positives': sum(1 for i in range(len(lab)) if lab[i] and not fw[i])}
        for arm in list(SIX) + ['WN']:
            if not self.has('BD', arm, 'G'):
                continue
            c = self.C('BD', arm)
            out['ap_without_self_pairs'][arm] = ST.ap_exact([c[i] for i in idx], [lab[i] for i in idx])
            if out['non_closure_positives']['positives']:
                out['non_closure_positives'][arm] = ST.ap_exact([c[i] for i in nc], [lab[i] for i in nc])
        dl = self.labels(self.insts['BD-dir'])
        sel = [i for i, t in enumerate(dl) if t and not fw[i]]
        out['direction_non_closure'] = {'rows': len(sel)}
        if sel:
            for arm in list(SIX) + ['WN']:
                if self.has('BD-dir', arm, 'G'):
                    cf, cr = self.C('BD-dir', arm)
                    out['direction_non_closure'][arm] = ST.accuracy([cf[i] for i in sel], [cr[i] for i in sel])
        out['closure_membership'] = {'forward': sum(fw), 'reverse': sum(rv), 'rows': len(fw)}
        out['suite_detection_protocol'] = self.suite_protocol()
        if l14x is not None:
            out['l14_tables_on_these_rows'] = self.l14_on_l13(l14x['meas'])
        if 'EVAL-test' in self.insts and self.world.pos == 'noun':
            ev = self.insts['EVAL-test']
            rows = S2D.suite_words('eval', self.world.store)
            labs = self.gold_map('eval')
            by = {}
            for r, x, y, f in rows:
                if f == 'test':
                    by.setdefault((SE.N_S(x), SE.N_S(y)), set()).add(labs[r])
            both = {p for p, v in by.items() if len(v) == 2}
            keepe = [(SE.N_S(x), SE.N_S(y)) not in both for _, x, y in ev.rows]
            ie = [i for i, k in enumerate(keepe) if k]
            le = self.labels(ev)
            out['eval_distinct'] = {'pairs_with_both_labels_dropped': len(ev.rows) - len(ie)}
            for arm in SIX:
                if self.has('EVAL-test', arm, 'G') and any(le[i] for i in ie):
                    c = self.C('EVAL-test', arm)
                    out['eval_distinct'][arm] = ST.ap_exact([c[i] for i in ie], [le[i] for i in ie])
        return out

    def suite_protocol(self):
        """A13.11's "the suite's own detection protocol (OOV rows at the lowest in-vocabulary validation score)" on
        L13's BLESS and WBLESS: per arm (the six and WN, by G with the maximum over senses), every test row the arm
        does not cover takes its lowest in-vocabulary validation score, and AP is taken over the whole test fold,
        pessimistic and in sklearn's convention (stats2.suite_detection). Reported; it decides nothing."""
        if self.world.pos != 'noun':
            return {'applies': False, 'why': "the dry detection sets have no validation fold (A13.13: the suite's "
                                             "validation folds are not dry data)"}
        out = {}
        for st, spec in (('BD-suite', 'bless'), ('WB-suite', 'wbless')):
            inst = self.insts.get(st)
            if inst is None or not inst.rows:
                continue
            m = self.gold_map(spec)
            val = set(inst.folds['val'])
            folds = ['val' if r in val else 'test' for r in inst.pair_rows]
            labels = [bool(m[r]) for r in inst.pair_rows]
            oov = [bool(m[r]) for r in inst.folds['oov_test']]
            ent = {'iid': inst.iid, 'pairSetSha': inst.pair_set_sha, 'rows_in_vocabulary': len(inst.rows),
                   'val_rows_in_vocabulary': len(val), 'oov_test_rows': len(oov), 'arms': {}}
            for arm in list(SIX) + ['WN']:
                if self.has(st, arm, 'G'):
                    ent['arms'][arm] = ST.suite_detection(self.C(st, arm), folds, labels, oov)
            out[st] = ent
        return out

    def l14_on_l13(self, meas):
        """A13.11's "L14's tables on these rows": each measured table read by G at o on BD, WB and BD-dir covered in
        U_@ (senses in U_@): detection AP (pessimistic, exact) on BD-at and WB-at, direction accuracy on BD-dir-at's
        True rows, and per (d, seed) the exact Lorentz - Euclidean differences. Reported; no interval."""
        out = {'pair_sets': {}, 'tables': {}, 'lorentz_minus_euclid': {}}
        names = [n for n in ('BD-at', 'WB-at', 'BD-dir-at') if n in self.insts and self.insts[n].rows]
        lab = {n: self.labels(self.insts[n]) for n in names}
        for n in names:
            out['pair_sets'][n] = {'iid': self.insts[n].iid, 'rows': len(self.insts[n].rows),
                                   'pairSetSha': self.insts[n].pair_set_sha,
                                   'true_rows': sum(lab[n])}
        vals = {}
        for (g, d, j), r in sorted(meas.items()):
            if not r.get('snap_sha'):
                continue
            ent = {}
            for n in names:
                if not self.has(n, 'learned', 'G', 'max', r['key']):
                    continue
                c = self.C(n, 'learned', 'G', 'max', r['key'])
                if self.insts[n].kind == 'dir':
                    sel = [i for i, t in enumerate(lab[n]) if t]
                    ent[n] = {'accuracy': ST.accuracy([c[0][i] for i in sel], [c[1][i] for i in sel]) if sel else None}
                elif any(lab[n]):
                    ent[n] = {'ap': ST.ap_exact(c, lab[n]), 'ap_sklearn': ST.ap_sklearn(c, lab[n])}
            out['tables'][f'{g}-{d}-s{r["seed"]}'] = ent
            vals[(g, d, j)] = ent
        for (g, d, j), ent in sorted(vals.items()):
            if g != 'lorentz' or ('euclid', d, j) not in vals:
                continue
            other = vals[('euclid', d, j)]
            diff = {}
            for n, e in ent.items():
                k = 'accuracy' if 'accuracy' in e else 'ap'
                if n in other and e[k] is not None and other[n][k] is not None:
                    diff[n] = e[k] - other[n][k]
            out['lorentz_minus_euclid'][f'd{d}/j{j}'] = diff
        return out

    def coverage(self):
        """A13.11's "every set and arm: coverage and the vocabulary each arm misses" (reported): per word-pair
        instance, the rows the word-level selection kept and the rows covered (its pair set), and for each vocabulary an
        arm reads (arm_vocabulary: the senses in the instance's universe, index.<pos> for W, GloVe 6B's words for
        GloVe) the word types of the selected rows it misses (senses.missed_words): their count, the SHA-256 of their
        N_S forms and the rows holding one, never the words (A13.2). HiT's rows use names, which the count checks map
        one-to-one onto U_@ (A13.9)."""
        world = self.world
        vocab = glove_vocabulary(world)
        test = {'U_full': lambda w: bool(SE.senses(w, world.U_full, world.wn, world.pos)),
                'U_at': lambda w: bool(SE.senses(w, world.U_at, world.wn, world.pos)),
                'index': lambda w: SE.N_S(w) in world.index,
                'glove': lambda w: SE.in_vocab(w, vocab)}
        arms = {}
        for f in self.files.values():
            arms.setdefault(f['base_inst'], set()).add(f['arm'])
        out = {}
        for name, inst in sorted(self.insts.items()):
            if inst.kind == 'hit' or inst.cand is None:
                continue
            by = {}
            for a in sorted(arms.get(name, ())):
                by.setdefault(arm_vocabulary(a, inst.universe), []).append(a)
            out[name] = {'iid': inst.iid, 'selected_rows': len(inst.cand), 'covered_rows': len(inst.rows),
                         'word_types': len(SE.word_types([(x, y) for _, x, y in inst.cand])),
                         'arms_by_vocabulary': by,
                         'missed': {v: SE.missed_report(*SE.missed_words(inst.cand, test[v])) for v in sorted(by)}}
        return out

    def nk18(self, tuning, trained, floors):
        """A13.11's "Nickel & Kiela 2018's diagnostic, the Spearman rho between r and sp/(sp + lp), for the tables and
        the exact trees" (reported): over the nodes of U_@ with sp and lp on E (senses.sp_lp), rho (exact, average
        ranks) between each table's radius from o (|n|^2 orders it in both learned geometries) and sp/(sp + lp), for
        every learned table the decisive run holds (tuning, measured, edge-shuffled and floors) and for H3 and H2.
        READING (A13.11, "the tables"): every learned table of the run, not the measured ones alone; the exact trees
        are read on the same nodes (their points of U_@'s synsets) and the same ranks."""
        g = self.world.at
        nodes = g.nodes
        m = SE.sp_lp(g)
        splp = [m[o] for o in nodes]
        pos = ST.nk18_positions(splp)                       # the ranks sp/(sp + lp), computed once for every table
        out = {'nodes': len(nodes), 'roots': len(g.roots), 'max_sp': max(a for a, _ in splp),
               'max_lp': max(b for _, b in splp), 'exact_trees': {}, 'tables': {}}
        for name in ('H3', 'H2'):
            t = base_table(self.world, name)
            out['exact_trees'][name] = ST.nk18_rho([SC.radius_key(t, o) for o in nodes], splp, pos)
        tabs = [(tuning_key(r['geometry'], r['d'], r['lr'], r['seed']), dict(r, kind='tuning'))
                for r in tuning['runs'] if r.get('snap_sha')]
        tabs += [(k, r) for k, r in sorted(trained.items()) if r['kind'] in ('measured', 'shuffled')
                 and r.get('snap_sha')]
        tabs += sorted(floors.items())
        for key, r in tabs:
            N = load_snapped(self.cfg, key, r['snap_sha'], r['geometry'], nodes)
            out['tables'][key] = {'kind': r['kind'], 'geometry': r['geometry'], 'd': r['d'],
                                  'rho': ST.nk18_rho(SC.snapped_radius_keys(N), splp, pos)}
        return out

    def rep_l15(self):
        out = {}
        cells = (('H3', 'F3'), ('H3', 'F3*'), ('H2', 'F2'), ('H2', 'F2*'))
        for st in ('WSS', 'WSC', 'WSR'):
            if st in self.insts and all(self.has(st, a, 'Sym') for a in SIX):
                inst = self.insts[st]
                out[f'H-F Sym on {st}'] = {f'{h}-{f}': self.rho_iv(inst, self.C(st, h, 'Sym'), self.C(st, f, 'Sym'),
                                                                   f'rho({h}) - rho({f}) Sym on {st}')
                                           for h, f in cells}
        if self.has('HL-glove', 'H3', 'G'):
            inst = self.insts['HL-glove']
            out['H3 G against GloVe on HL'] = self.rho_iv(inst, self.C('HL-glove', 'H3', 'G'),
                                                          self.C('HL-glove', 'GloVe-300', 'cos', '-'),
                                                          'rho(H3 G) - rho(GloVe) on HL-glove')
        if self.has('SL', 'WN', 'Sym'):
            r = self.rho_of(self.insts['SL'], self.C('SL', 'WN', 'Sym'))
            gap = abs(float(r) - 0.513)
            out['WN-path on SL against path2vec 0.513'] = {'rho': r, 'gap': gap, 'gap_above_0.005': gap > 0.005}
        return out

    def rep_l14(self, x, floors, trained, tuning=None):
        """A13.11's L14 reports: floors, G_root and the distance-only score (Lorentz - Euclidean, with sign agreement),
        the macro mean RR with its bootstrap over positive synsets, RR off the 12 most frequent positives, HIT-R, F1
        and the radius ranks of the seven labels under P; NK17 scores of the measured tables (HiT test, both settings,
        and HL within U_@); H3 against the measured tables on HL within U_@ as word-level intervals (with the row
        bootstrap beside them); Nickel & Kiela 2018's diagnostic."""
        out = {}
        T = self.insts['HIT-test']
        HLa = self.insts['HL-at']
        rr_of, tab, meas = x['rr_of'], x['tab'], x['meas']
        out['floors'] = {}
        for key, r in sorted(floors.items()):
            cs = self.hit_codes(key)
            if cs is not None:
                out['floors'][key] = {st: fstr(ST.mean_exact(rr_of(key, cs, st))) for st in ('random', 'hard')}
        groups = [r.parent for r in T.rows]
        cnt = {}
        for g in groups:
            cnt[g] = cnt.get(g, 0) + 1
        top = set(sorted(cnt, key=lambda g: (-cnt[g], g))[:12])
        off12 = [i for i, g in enumerate(groups) if g not in top]
        out['off_top12_rows'] = len(off12)
        out['tables'] = {}
        for (g, d, j), r in sorted(meas.items()):
            cs = self.hit_codes(r['key'])
            if cs is None:
                continue
            ent = {}
            for st in ('random', 'hard'):
                v = rr_of(r['key'], cs, st)
                ent[f'macro_{st}'] = fstr(ST.macro_rr(v, groups)[0])
                ent[f'off_top12_{st}'] = fstr(ST.mean_exact([v[i] for i in off12])) if off12 else None
            hr = self.hit_codes(r['key'], inst='HITR-test')
            if hr is not None:
                ent['hitr'] = {st: fstr(ST.mean_exact(hit_rr(hr, RANDOM_SLOTS if st == 'random' else HARD_SLOTS)))
                               for st in ('random', 'hard')}
            for form in ('Groot', 'dist'):
                c2 = self.hit_codes(r['key'], form=form)
                if c2 is not None:
                    ent[form] = {st: fstr(ST.mean_exact(hit_rr(c2, RANDOM_SLOTS if st == 'random' else HARD_SLOTS)))
                                 for st in ('random', 'hard')}
            nk = self.hit_codes(r['key'], form='NK17')
            if nk is not None:
                ent['NK17'] = {st: fstr(ST.mean_exact(hit_rr(nk, RANDOM_SLOTS if st == 'random' else HARD_SLOTS)))
                               for st in ('random', 'hard')}
            if self.has('HL-at', 'learned', 'NK17', 'max', r['key']):
                ent.setdefault('NK17', {})['rho_hl_at'] = self.rho_of(HLa, self.C('HL-at', 'learned', 'NK17', 'max',
                                                                                  r['key']))
            ent['f1'] = self.f1(r['key'])
            out['tables'][f'{g}-{d}-s{r["seed"]}'] = ent
        # H3 against the learned tables on HL within U_@ (A13.11): word-level intervals, the row bootstrap beside
        hl = {}
        if self.has('HL-at', 'H3', 'G', 'max'):
            H = self.C('HL-at', 'H3', 'G', 'max')
            hl['rho_H3'] = self.rho_of(HLa, H)
            for (g, d, j), r in sorted(meas.items()):
                if r.get('snap_sha') and self.has('HL-at', 'learned', 'G', 'max', r['key']):
                    hl[f'{g}-{d}-s{r["seed"]}'] = self.rho_iv(
                        HLa, H, self.C('HL-at', 'learned', 'G', 'max', r['key']),
                        f'rho(H3) - rho({g}, d={d}, seed {r["seed"]}) on HL-at')
        out['h3_against_learned_on_hl_at'] = hl
        if tuning is not None:
            out['nk18_r_against_sp_lp'] = self.nk18(tuning, trained, floors)
        cells = {}
        for d in (2, 3):
            for j in range(len(self.cfg.seeds.training)):
                if not x['presence'].get((d, j)):
                    continue
                kl, ke = tab[('m', 'lorentz', d, j)], tab[('m', 'euclid', d, j)]
                for st in ('random', 'hard'):
                    sl, se = RANDOM_SLOTS if st == 'random' else HARD_SLOTS, None
                    row = {}
                    for form in ('G', 'Groot', 'dist'):
                        cl, ce = self.hit_codes(kl, form=form), self.hit_codes(ke, form=form)
                        if cl is None or ce is None:
                            continue
                        a, b = hit_rr(cl, sl), hit_rr(ce, sl)
                        row[form] = self.mean_iv([float(p) - float(q) for p, q in zip(a, b)],
                                                 f'{form}: RR(L) - RR(E), d={d}, {st}, seed index {j}')
                        if form == 'G':
                            row['macro'] = ST.ci_macro(a, b, groups, seed=self.boot, resamples=self.R)
                    cells[f'd{d}/{st}/j{j}'] = row
                for form in ('Groot', 'dist'):
                    if self.has('HL-at', 'learned', form, 'max', kl) and self.has('HL-at', 'learned', form, 'max', ke):
                        cells[f'd{d}/HL-at/j{j}/{form}'] = self.rho_iv(
                            self.insts['HL-at'], self.C('HL-at', 'learned', form, 'max', kl),
                            self.C('HL-at', 'learned', form, 'max', ke), f'{form}: rho(L) - rho(E), d={d}, j={j}')
        out['lorentz_minus_euclid'] = cells
        agree = {}
        for d in (2, 3):
            for st in ('random', 'hard'):
                for form in ('Groot', 'dist'):
                    dis = 0
                    for j in range(len(self.cfg.seeds.training)):
                        row = cells.get(f'd{d}/{st}/j{j}')
                        if row and 'G' in row and form in row and (row['G']['est'] > 0) != (row[form]['est'] > 0):
                            dis += 1
                    agree[f'd{d}/{st}/{form}'] = {'seeds_disagreeing_with_G': dis, 'stated': dis >= 3}
        out['sign_agreement_with_G'] = agree
        exact = {}
        for arm in ('H3', 'H2'):
            if self.has('HIT-test', arm, 'G', '-'):
                c = self.C('HIT-test', arm, 'G', '-')
                exact[arm] = {st: fstr(ST.mean_exact(hit_rr(c, RANDOM_SLOTS if st == 'random' else HARD_SLOTS)))
                              for st in ('random', 'hard')}
        if exact:
            exact['flag'] = ('reconstruction (A13.11): the exact trees encode E, and most closure edges by prefix')
        out['exact_trees_on_hit_test'] = exact
        # READING (A13.8 with A13.11 and L14 control 2's "computed in binary64"): the relabelled tails, |dRR|, Nickel &
        # Kiela 2018's diagnostic (above) and the labels' radius ranks (below) are reported values that A13 defines
        # outside pass 1's files of tie-class codes; they are computed here from the tables, each read only after its
        # float or snapped SHA-256 matches the run record, and none reads a gold, label or TYPE field
        out['relabel_tail'] = relabel_tail(self.cfg, self.world, T, meas)
        out['delta_rr_snapped_vs_float64'] = delta_rr(self.cfg, self.world, T, meas,
                                                      lambda key, st: rr_of(key, self.hit_codes(key), st))
        if self.world.pos == 'noun':
            out['relabel_label_radius_ranks'] = self.label_radius_ranks(meas)
        return out

    def f1(self, table):
        """F1 under HiT's protocol (A13.11, reported; measured tables), from the table's joint val + test code file
        (job_score_learned's READING): per setting, theta is the val code with the best val F1 (ties to the smallest;
        stats2.f1_select), a pair is predicted positive when its code is at least theta, and test is scored at that
        theta. Slot 0 is the positive, the setting's other slots the negatives (HiT's labels are structural)."""
        fk = next((k for k, f in self.files.items() if f.get('inst') == 'HIT-valtest-s21' and f.get('form') == 'G'
                   and f.get('table') == table), None)
        if fk is None:
            return None
        rows = self.codes_fk(fk)
        n_val = self.files[fk]['val_rows']
        if len(rows) != n_val + self.files[fk]['test_rows']:
            raise ValueError(f'{fk}: {len(rows)} rows, not val + test')
        out = {}
        for setting, slots in (('random', (0,) + RANDOM_SLOTS), ('hard', (0,) + HARD_SLOTS)):
            def flat(part):
                return [cs[s] for cs in part for s in slots], [s == 0 for _ in part for s in slots]
            vc, vl = flat(rows[:n_val])
            tc, tl = flat(rows[n_val:])
            r = ST.f1_threshold(vc, vl, tc, tl)
            out[setting] = {'theta_code': r['theta_code'], 'f1_val': fstr(r['f1_val']), 'f1_test': fstr(r['f1_test']),
                            'f1_test_float': float(r['f1_test']), 'test_counts': r['test_counts']}
        return out

    def label_radius_ranks(self, meas):
        """For each measured table, the radius rank (1 = nearest o; ties share the first rank) of the points that P
        gives the seven labels of L14 control 2 (A13 L14, reported)."""
        names = self.world._cache.get('hit_names') or {}
        P = _G.get('P')
        if P is None or not names:
            return {}
        idx = self.world.at.index
        Q = l6.inverse(P)
        out = {}
        for (g, d, j), r in sorted(meas.items()):
            if not r.get('snap_sha'):
                continue
            N = load_snapped(self.cfg, r['key'], r['snap_sha'], g, self.world.at.nodes)
            sq = [sum(v * v for v in row) for row in N]
            order = sorted(sq)
            rank = {}
            for pos, v in enumerate(order, 1):
                rank.setdefault(v, pos)
            ent = {}
            for nm in HIT.RELABEL_REPORT_NAMES:
                if nm in names:
                    u = idx[names[nm]]
                    ent[nm] = rank[sq[Q[u]]]
            out[f'{g}-{d}-s{r["seed"]}'] = ent
        return out

    def diagnostics(self):
        """A13.11's diagnostics: synsets whose H3 and H2 Poincaré norms round to 1.0 in float64; WN-LCh's tie classes
        against WN-path's on every set where both were scored."""
        out = {}
        for name in ('H3', 'H2'):
            t = base_table(self.world, name)
            out[f'norm_rounds_to_one_{name}'] = sum(1 for o in self.world.offsets if SC.norm_rounds_to_one(t.x0(o)))
        same = {}
        for (inst, arm, form, rule, table) in list(self.by):
            if arm == 'WN' and form == 'LCh' and self.has(inst, 'WN', 'Sym', rule):
                same[inst] = self.C(inst, 'WN', 'LCh', rule) == self.C(inst, 'WN', 'Sym', rule)
        out['lch_classes_equal_path_classes'] = same
        return out


# ================================================================ binary64 G (A13.11's reported tail and |dRR|)
def float_points(N, geometry):
    """A snapped table as binary64 points: Lorentz, the Poincaré point n/2^32 lifted to (x0, x); Euclidean, n/2^32."""
    X = np.array(N, dtype=np.float64) / 2.0 ** 32
    if geometry == 'lorentz':
        sq = np.einsum('ij,ij->i', X, X)
        x0 = (1.0 + sq) / (1.0 - sq)
        return np.column_stack([x0, 2.0 * X / (1.0 - sq)[:, None]])
    return X


def g_float(geometry, A, B):
    """G(s, t) = r(s) - r(t) - d(s, t) at the origin in binary64, rows of A against rows of B (hyperboloid rows (x0, x)
    for Lorentz, plain rows for Euclidean).
    READING (spec section 8, "G in binary64 (math.acosh, math.sqrt)"): numpy's float64 arccosh and sqrt, vectorised,
    in place of math's (sqrt is correctly rounded in both; arccosh may differ in the last bits); reported only."""
    if geometry == 'lorentz':
        z = A[:, 0] * B[:, 0] - np.einsum('ij,ij->i', A[:, 1:], B[:, 1:])
        with np.errstate(invalid='ignore'):
            return np.arccosh(A[:, 0]) - np.arccosh(B[:, 0]) - np.arccosh(np.maximum(z, 1.0))
    ra = np.sqrt(np.einsum('ij,ij->i', A, A))
    rb = np.sqrt(np.einsum('ij,ij->i', B, B))
    D = A - B
    return ra - rb - np.sqrt(np.einsum('ij,ij->i', D, D))


def float_rr(geometry, pts, child_idx, slot_idx, neg_slots):
    """Per-row pessimistic RR from binary64 G: 1/(1 + #{negatives with G >= G of slot 0})."""
    n_rows = child_idx.shape[0]
    C = pts[np.repeat(child_idx, slot_idx.shape[1])]
    S = pts[slot_idx.reshape(-1)]
    G = g_float(geometry, C, S).reshape(n_rows, slot_idx.shape[1])
    pos = G[:, :1]
    worse = (G[:, list(neg_slots)] >= pos).sum(axis=1)
    return 1.0 / (1.0 + worse)


def relabel_tail(cfg, world, T, meas):
    """A13 L14 control 2's reported tail: each measured table's per-row and macro mean RR (random setting) under
    `tail_count` further permutations Rng(tail + j) (200 in the registered run), G in binary64, ties pessimistic."""
    idx = world.at.index
    child = np.array([idx[r.child] for r in T.rows], dtype=np.int64)
    slots = np.array([[idx[x] for x in r.slots[:11]] for r in T.rows], dtype=np.int64)
    groups = [r.parent for r in T.rows]
    gi = {g: k for k, g in enumerate(sorted(set(groups)))}
    gv = np.array([gi[g] for g in groups], dtype=np.int64)
    gn = np.bincount(gv)
    perms = [np.array(l6.label_permutation(cfg.seeds.tail + j, len(world.at.nodes)), dtype=np.int64)
             for j in range(cfg.seeds.tail_count)]
    out = {}
    for (g, d, j), r in sorted(meas.items()):
        if not r.get('snap_sha'):
            continue
        pts = float_points(load_snapped(cfg, r['key'], r['snap_sha'], g, world.at.nodes), g)
        per_row, macro = [], []
        for P in perms:
            moved = np.empty_like(pts)
            moved[P] = pts                                   # the node with index P[i] takes row i's point
            rr = float_rr(g, moved, child, slots, range(1, 11))
            per_row.append(float(rr.mean()))
            macro.append(float((np.bincount(gv, weights=rr) / gn).mean()))
        out[f'{g}-{d}-s{r["seed"]}'] = {'permutations': len(perms), 'per_row': per_row, 'macro': macro,
                                        'band': float(ST.RR_BAND),
                                        'macro_above_band': sum(1 for x in macro if x > float(ST.RR_BAND))}
    return out


def delta_rr(cfg, world, T, meas, rr_exact):
    """A13.11: |dRR| between snapped-exact and float64 scoring of each measured table (the unsnapped float table read
    as stored; G in binary64, ties pessimistic), per setting: the mean and the largest per-row |dRR|."""
    idx = world.at.index
    child = np.array([idx[r.child] for r in T.rows], dtype=np.int64)
    slots = np.array([[idx[x] for x in r.slots] for r in T.rows], dtype=np.int64)
    out = {}
    for (g, d, j), r in sorted(meas.items()):
        p = table_path(cfg.cache, r['key'], '.npy')
        if not r.get('snap_sha') or not os.path.exists(p):
            continue
        X = np.load(p)
        if EM.table_sha(X) != r['float_sha']:
            raise Refused(f'{p}: the float table\'s SHA-256 differs from the run record')
        ent = {}
        for st, neg in (('random', range(1, 11)), ('hard', range(11, 21))):
            rf = float_rr(g, X, child, slots, neg)
            ex = np.array([float(v) for v in rr_exact(r['key'], st)])
            dd = np.abs(rf - ex)
            ent[st] = {'mean_abs': float(dd.mean()), 'max_abs': float(dd.max()), 'rows_differing': int((dd > 0).sum())}
        out[f'{g}-{d}-s{r["seed"]}'] = ent
    return out


# ================================================================ receipts (A13.14) and the record
def lbench_lines(cfg, ctx, entries, insts, files, settings_sha, trained, floors, tuning):
    """One LBENCH/1 record per evaluated (instance, arm, form, rule, table) and metric: [(sealed, record, sha)]."""
    psha = S2D.protocol_sha()
    engine = l6.engine_string()
    budget = ctx['counts']['budget']
    tab = {}
    for r in tuning['runs']:
        tab[tuning_key(r['geometry'], r['d'], r['lr'], r['seed'])] = dict(r, kind='tuning')
    tab.update(trained)
    tab.update(floors)
    out = []
    for e in entries:
        inst = insts[e['base_inst']]
        f = files[e['fkey']]
        base, i = split_arm(e['arm'])
        t = tab.get(e['table'])
        learned = t is not None
        dim = None
        if base == 'GloVe':
            dim, i = i, None
        elif base == 'GloVe-vec':
            dim = 300
        for metric, setting, value in e['metrics']:
            if value is None:
                continue
            iid = inst.iid + (f'-{setting}' if setting else '') + ('-relabelled' if f.get('relabel') else '')
            if metric == 'suite-acc':
                mtext = repr(float(value))
            else:
                mtext = metric_text(value)
            fields = dict(
                instanceId=iid, instanceSha=inst.sha, pairSetSha=inst.pair_set_sha,
                arm=e['arm'] if not learned else e['table_kind'] or e['arm'],
                geometry=(t['geometry'] if learned else ARM_GEOMETRY.get(base, base.lower())),
                d=(t['d'] if learned else dim),
                seed=(t.get('seed', t.get('i')) if learned else i),
                lr=(t.get('lr') if learned else None), scoreForm=e['form'], senseRule=e['rule'] if e['rule'] != '-'
                else None, protocolSha=psha,
                settingsSha=settings_sha if learned and t.get('kind') in ('measured', 'shuffled') else None,
                budget=budget if learned and t.get('kind') != 'floor' else None,
                floatTableSha=t.get('float_sha') if learned else None, snapSha=t.get('snap_sha') if learned else None,
                itemScoresSha=f['tsv_sha'], metric=metric, metricSha=sha256(mtext), metricValue=metric_value(value),
                engine=engine, wallMs=(t.get('wall_ms', None if t.get('wall_s') is None else
                                             int(round(t['wall_s'] * 1000))) if learned else None))
            rec, h = lbench2(e['claim'], **fields)
            out.append((e['sealed'], rec, h))
    return out


def pass1_summary(files):
    return {'files': len(files), 'lines': sum(f['lines'] for f in files.values()),
            'bytes': sum(f['bytes'] for f in files.values()),
            'recomputed_240': sum(f['recomputed'] for f in files.values()),
            'tie_classes_numerical': sum(f['tie_classes'] for f in files.values()),
            'tie_tuples_numerical': sum(f['tie_tuples'] for f in files.values()),
            'phi_recomputed_240': sum(f['phi_recomputed'] for f in files.values()),
            'phi_numerical_ties': sum(f['phi_ties'] for f in files.values()),
            'side_entries': sum(f['side_entries'] for f in files.values()),
            'value_seconds': sum(f.get('wall_s', 0) for f in files.values()),
            'values': sum(f['lines'] * (2 if f['kind'] == 'dir' else 1) for f in files.values()),
            'certified_values': sum(f['lines'] * (2 if f['kind'] == 'dir' else 1) for f in files.values()
                                    if f.get('vtype') == 'cert'),
            'certified_seconds': sum(f.get('wall_s', 0) for f in files.values() if f.get('vtype') == 'cert'),
            'seconds_per_certified_value': (sum(f.get('wall_s', 0) for f in files.values() if f.get('vtype') == 'cert')
                                            / max(1, sum(f['lines'] * (2 if f['kind'] == 'dir' else 1)
                                                         for f in files.values() if f.get('vtype') == 'cert')))}


def pass2_and_write(cfg, ctx, world, insts, files, claims_of, closure, tuning, rates, ssha, trained, floors, replay,
                    pre_runs, P):
    log = ctx['log']
    t0 = time.perf_counter()
    S2D.open_gold()                                       # pass 2 starts (A13.8)
    try:
        p2 = Pass2(cfg, ctx, world, insts, files)
        counts_gold = p2.count_checks_gold()
        claims = {'L12': p2.l12(), 'L13': p2.l13()}
        l14, l14x = p2.l14(tuning, rates, trained, floors)
        claims['L14'] = l14
        claims['L15'] = p2.l15()
        entries = p2.file_metrics(claims_of)
        reported = {'L12': p2.rep_l12(closure), 'L13': p2.rep_l13(closure, l14x),
                    'L14': p2.rep_l14(l14x, floors, trained, tuning), 'L15': p2.rep_l15(),
                    'diagnostics': p2.diagnostics(), 'coverage': p2.coverage()}
        lb = lbench_lines(cfg, ctx, entries, insts, files, ssha, trained, floors, tuning)
    finally:
        S2D.close_gold()
    ctx['timings']['pass2_s'] = time.perf_counter() - t0
    ctx['timings']['intervals'] = p2.n_intervals
    claims['L12']['flag_d'] = ST.L12_PREVIEW_FLAG
    training = {k: {x: v for x, v in r.items() if x not in ('environment',)} for k, r in sorted(trained.items())}
    record = {
        'label': ctx['label'], 'mode': cfg.mode, 'shape': cfg.shape, 'step': 'decisive',
        'head': ctx['git']['head'], 'git': ctx['git'], 'git_checks': ctx['git_checks'],
        'development_run': ctx['mark'], 'starts': ctx['starts'], 'environment': ctx['env'],
        'load_averages': ctx['load'].samples, 'readings': ctx['readings'].items, 'counts': ctx['counts'],
        'counts_gold': counts_gold, 'manifest': ctx.get('manifest'), 'preflight': ctx.get('preflight'),
        'disk': ctx.get('disk'), 'protocol_sha': S2D.protocol_sha(), 'settings_sha': ssha,
        'instances': {k: {'iid': v.iid, 'instanceSha': v.sha, 'claim': v.claim, 'rows': len(v.rows),
                          'selected': v.selected_rows, 'pairSetSha': v.pair_set_sha, 'sealed': v.sealed,
                          'note': v.note,
                          'clusters': len(set(v.clusters)) if v.clusters else None,
                          'word_types': (len(SE.word_types([(x, y) for _, x, y in v.rows])) if v.kind != 'hit'
                                         else None)} for k, v in sorted(insts.items())},
        'claims': claims, 'reported': reported,
        'training': training, 'replay_check': replay, 'preflight_runs': pre_runs, 'floors': floors,
        'convergence': {k: {'converged': r.get('converged'), 'diverged_epoch': r.get('diverged_epoch'),
                            'drop_epoch': r.get('drop_epoch'),
                            'per_epoch_wall_s': r['wall_s'] / max(1, r['epochs_run'])}
                        for k, r in sorted(trained.items())},
        'pass1': pass1_summary(files), 'files_metrics': entries,
        'P': {'seed': cfg.seeds.relabel, 'n': len(P), 'sha256': sha256(','.join(map(str, P)))},
        'timings': dict(ctx['timings'], total_s=time.perf_counter() - ctx['t0']),
        'flags': {'L12(d)': ST.L12_PREVIEW_FLAG}}
    if cfg.mode == 'selftest':
        record['selftest'] = SELFTEST_BANNER
    recheck_tree(cfg, ctx, 'before writing the record')
    write_outputs(cfg, ctx, record, lb, files, claims_of, insts, trained)
    return 0


# ================================================================ the dry seal (A13.13; spec section 14)
def visible_record(record):
    """The dry record's visible part, built by whitelisting (never by redaction): crashes (none, or there is no
    record), the count checks, whether each control failed as required, convergence, timings, tie and recomputation
    counts, L14's values on the verb graph and its split (WordNet data), and the sealed file's SHA-256. Every metric
    value, interval and verdict on a human-rated or human-labelled set stays out."""
    c = record['claims']
    l14 = c['L14']
    vis14 = {'parts': {'a': l14['parts']['a']}, 'presence': l14['presence'],
             'controls': {'control1': l14['controls']['control1'], 'control2': l14['controls']['control2'],
                          'closure_check': l14['controls']['closure_check'],
                          'control3_rr_cells': {k: v for k, v in l14['controls']['control3']['cells'].items()
                                                if not k.endswith('/rho')},
                          'fails_as_required': l14['controls']['fails_as_required']},
             'intervals_on_the_split': {'a': l14['intervals']['a'],
                                        'control3_rr': {k: v for k, v in l14['intervals']['control3'].items()
                                                        if k[2] != 'rho'}},
             'measured_on_the_split': {k: {x: v for x, v in e.items() if x != 'rho_hl_at'}
                                       for k, e in l14['measured'].items()},
             'relabelled_per_row_mean_rr': l14['relabelled_per_row_mean_rr'], 'void': l14['void']}
    keep = ('label', 'mode', 'shape', 'step', 'head', 'git', 'git_checks', 'development_run', 'starts', 'environment',
            'load_averages', 'readings', 'counts', 'counts_gold', 'preflight', 'disk', 'protocol_sha', 'settings_sha',
            'training', 'replay_check', 'preflight_runs', 'floors', 'convergence', 'pass1', 'P', 'timings', 'flags',
            'selftest')
    out = {k: record[k] for k in keep if k in record}
    out['instances'] = {k: {x: v for x, v in e.items()} for k, e in record['instances'].items()}
    out['controls_fail_as_required'] = {k: c[k]['controls']['fails_as_required'] for k in ('L12', 'L13', 'L15')}
    out['L14_on_the_verb_graph'] = vis14
    out['files_counts'] = [{x: e[x] for x in ('fkey', 'rows', 'classes', 'recomputed', 'tie_classes', 'tie_tuples',
                                              'phi_recomputed', 'phi_ties')} for e in record['files_metrics']]
    out['files_metrics_unsealed'] = [e for e in record['files_metrics'] if not e['sealed']]
    out['sealed'] = None
    return out


# ================================================================ the output files (spec section 12)
CODES_LIMIT = 50 * 10 ** 6                                 # A13.14: committed only if together <= 50 MB


def decision_files(files, claims_of):
    """The pass-1 code files of every arm and table named in a decision of L12-L15 (A13.14): the exact arms on HL, BD,
    WB, BD-dir, SL, MEN and WSR, and the measured tables on HiT test (both settings) and on HL within U_@."""
    out = []
    for fk, f in sorted(files.items()):
        claim = claims_of.get(fk)
        if claim in ('L12/1', 'L13/1', 'L15/1') and f.get('table', '-') == '-':
            out.append(fk)
        elif f.get('table_kind') == 'learned' and f['form'] == 'G' and (
                f['inst'] == 'HIT-test-s21' or f['inst'] == 'HL-at'):
            out.append(fk)
    return out


def write_outputs(cfg, ctx, record, lb, files, claims_of, insts, trained):
    log = ctx['log']
    pth = paths(cfg, 'decisive')
    os.makedirs(cfg.results, exist_ok=True)
    # the code files named in a decision and the 20 measured snapped texts, each group under the 50 MB rule
    dec = decision_files(files, claims_of)
    size = sum(files[fk]['bytes'] for fk in dec)
    committed = size <= CODES_LIMIT
    if os.path.isdir(pth['codes']):
        shutil.rmtree(pth['codes'])
    if committed:
        os.makedirs(pth['codes'])
        for fk in dec:
            shutil.copyfile(code_path(cfg.cache, fk), os.path.join(pth['codes'], os.path.basename(code_path('', fk))))
    meas = [k for k, r in sorted(trained.items()) if r['kind'] == 'measured' and r.get('snap_sha')]
    tables = {}
    for k in meas:
        with open(table_path(cfg.cache, k, '.snap.txt'), 'rb') as fh:
            tables[k] = gz_bytes(fh.read())
    tsize = sum(len(v) for v in tables.values())
    tcommitted = tsize <= CODES_LIMIT
    if os.path.isdir(pth['tables']):
        shutil.rmtree(pth['tables'])
    if tcommitted and tables:
        os.makedirs(pth['tables'])
        for k, v in tables.items():
            write_atomic(os.path.join(pth['tables'], k + '.snap.txt.gz'), v)
    manifest = {'definition': 'Spec section 12 (A13.14): the SHA-256 of every pass-1 code file (gzip bytes, and the '
                              'uncompressed TSV as LBENCH/1\'s itemScoresSha), its 120-digit value stream and its side '
                              'file; committed says whether the file is in stage2-codes/.',
                'files': {fk: {'cache_path': os.path.relpath(code_path(cfg.cache, fk), cfg.cache), 'sha256': f['sha'],
                               'tsv_sha256': f['tsv_sha'], 'values_sha256': f['values_sha'],
                               'side_sha256': f['side_sha'], 'lines': f['lines'], 'bytes': f['bytes'],
                               'committed': committed and fk in dec} for fk, f in sorted(files.items())},
                'decision_files': {'count': len(dec), 'bytes': size, 'committed': committed},
                'measured_snapped_texts': {'count': len(tables), 'bytes_gzip': tsize, 'committed': tcommitted,
                                           'sha256': {k: trained[k]['snap_sha'] for k in meas}}}
    record['receipts'] = {'decision_code_files': manifest['decision_files'],
                          'measured_snapped_texts': manifest['measured_snapped_texts']}
    visible_lb = [rec for sealed, rec, _ in lb if not (cfg.seal and sealed)]
    lb_text = ''.join(r + '\n' for r in sorted(visible_lb))
    write_atomic(pth['lbench'], lb_text)
    mtext = P4.jdump(manifest)
    write_atomic(pth['manifest'], mtext)
    record['receipts'].update(lbench_sha256=sha256(lb_text), lbench_records=len(visible_lb),
                              manifest_sha256=sha256(mtext))
    if cfg.seal:
        sealed_lb = [rec for sealed, rec, _ in lb if sealed]
        payload = {'definition': 'A13.13: every dry metric value, interval and verdict on a human-rated or human-'
                                 'labelled set; opened after A13.15 step 7 and reported then',
                   'record': clean(record), 'lbench_sealed': sorted(sealed_lb)}
        stext = json.dumps(payload, indent=1, ensure_ascii=False, sort_keys=True) + '\n'
        write_atomic(cfg.sealed, stext)
        vis = visible_record(record)
        vis['sealed'] = {'path': cfg.sealed, 'sha256': sha256(stext), 'lbench_records_sealed': len(sealed_lb)}
        out = vis
        log(f'sealed: {len(sealed_lb)} LBENCH/1 records and every value on a human-rated set went to the sealed file '
            f'(SHA-256 {sha256(stext)}); nobody opens it before step 7 (A13.13)')
    else:
        out = record
    text = P4.jdump(clean(out))
    write_atomic(pth['json'], text)
    write_atomic(pth['md'], claims_md(cfg, out))
    log(f'wrote {P4.display_path(pth["json"])} (SHA-256 {sha256(text)}), {P4.display_path(pth["md"])}, '
        f'{P4.display_path(pth["lbench"])} ({len(visible_lb)} records), {P4.display_path(pth["manifest"])}; '
        f'decision code files {"committed" if committed else "hashes only"} ({size / 1e6:.1f} MB), measured '
        f'snapped texts {"committed" if tcommitted else "hashes only"} ({tsize / 1e6:.1f} MB)')


def _iv_text(iv):
    if iv is None:
        return '-'
    return f'{iv["est"]:+.6f} [{iv["lo"]:+.6f}, {iv["hi"]:+.6f}]'


def claims_md(cfg, rec):
    """claims-stage2.md: the record's decisions and controls as tables (the dry run's visible part only)."""
    L = [f'# Stage 2 claims ({cfg.label_mode})', '', f'{rec["label"]}; HEAD `{rec["head"]}`'
         + (f'; {rec["development_run"]}' if rec.get('development_run') else ''), '']
    if rec.get('selftest'):
        L += [f'> {rec["selftest"]}', '']
    if 'claims' in rec:
        for name, c in rec['claims'].items():
            L += [f'## {name}', '', '| Part | Verdict | Cells (estimate [2.5%, 97.5%]) |', '| --- | --- | --- |']
            for p, v in c['parts'].items():
                cells = v.get('cells', {})
                txt = '; '.join(f'{k}: {_iv_text(x) if isinstance(x, dict) and "est" in x else x.get("verdict", "")}'
                                for k, x in cells.items() if isinstance(x, dict))
                L.append(f'| ({p}) | {v["verdict"]} | {txt} |')
            L += ['', f'Controls fail as required: `{json.dumps(c["controls"]["fails_as_required"])}`', '']
        L += ['L12(d) is flagged: ' + ST.L12_PREVIEW_FLAG + '.', '']
    else:
        L += ['## Sealed (A13.13)', '', 'Every value, interval and verdict on a human-rated set is in the sealed file '
              f'(SHA-256 `{rec["sealed"]["sha256"]}`).', '', '## Controls fail as required', '']
        for k, v in rec['controls_fail_as_required'].items():
            L.append(f'- {k}: `{json.dumps(v)}`')
        a = rec['L14_on_the_verb_graph']['parts']['a']
        L += ['', '## L14(a) on the verb graph and its split (WordNet data)', '', f'Verdict: {a["verdict"]}', '']
    conv = rec.get('convergence', {})
    L += ['## Convergence', '', f'{sum(1 for v in conv.values() if v["converged"])} of {len(conv)} runs converged.', '']
    p1 = rec.get('pass1', {})
    L += ['## Pass 1', '', f'{p1.get("files")} code files, {p1.get("lines")} lines; {p1.get("recomputed_240")} '
          f'240-digit recomputations; {p1.get("tie_tuples_numerical")} values in numerical ties between distinct '
          f'tuples.', '']
    return '\n'.join(L) + '\n'


# ================================================================ start, steps and main
def start(cfg, step, console_path):
    """The label, the git state and the tree check, the protocol pin and (registered tuning and decisive) the
    definitions amendment's manifest freeze, before any file is written; then the console, the start record, the
    environment and the load average."""
    label = P4.prereg_label()
    gs = P4.git_state()
    extra = {}
    try:
        mark = check_tree(cfg.mode, step, gs, cfg.allow_dirty)
        S2D.protocol_sha()                      # golden/stage2_protocol_v1.txt must be the pinned text (A13.14)
        if cfg.mode == 'registered' and step in ('tune', 'decisive'):
            with open(S2D.PREREGISTRATION, encoding='utf-8') as fh:
                text = fh.read()
            msha = sha256_file(MANIFEST_FILE)
            try:
                extra['definitions_amendment'] = definitions_amendment(text, msha, 13)
            except ValueError as e:
                raise Refused(f'the definitions amendment must freeze the instance manifest by its SHA-256 '
                              f'{msha[:12]}... before registered tuning and the decisive run (A13.2, A13.15 step 4): '
                              f'{e}')
            if step == 'tune':
                extra['time'] = time_record_ok(cfg)
    except ValueError as e:
        raise Refused(str(e)) from None
    log = P4.Console(console_path)
    rd = Readings()
    common_readings(rd)
    log('=' * 100)
    log(f'Stage 2, {step} ({cfg.label_mode}), started {utc_now()}; {label}; argv {" ".join(sys.argv[1:])}')
    if cfg.mode == 'selftest':
        log(SELFTEST_BANNER)
    log(f'HEAD {gs["head"]}; ' + ('the tree is clean' if not gs['changed'] else
                                  f'{len(gs["changed"])} changed path(s): {"; ".join(gs["changed"][:6])}')
        + (f'; {mark}' if mark else ''))
    renv = P4.run_environment()
    esha = P4.env_sha(renv)
    starts = P4.record_start(cfg, step, gs['head'], mark, renv)
    load = LoadLog(log, cfg.load_interval)
    starts[-1]['loadavg'] = load.sample('start')
    starts[-1]['interpreter_flags'] = flags = interpreter_flags()
    log(f'interpreter flags: isolated (-I) {flags["isolated"]}, no bytecode (-B) {flags["dont_write_bytecode"]}')
    log(f'environment {esha[:12]}: Python {renv["python"]}, numpy {renv["numpy"]}, numba {renv["numba"]}')
    if len(starts) > 1:
        log(f'start {len(starts)} of this step in this cache (earlier: '
            + '; '.join(f'{s["time"]} at {str(s["head"])[:12]}' for s in starts[:-1]) + ')')
    env = P4.environment(cfg.workers)
    ctx = {'log': log, 'readings': rd, 'label': label, 'git': gs, 'mark': mark, 'starts': starts, 'env': env,
           'env_sha': esha, 'step': step, 'git_checks': [], 't0': time.perf_counter(), 'load': load, 'timings': {},
           'counts': {}}
    ctx.update(extra)
    if 'definitions_amendment' in extra:
        log(f'the instance manifest is frozen by Amendment {extra["definitions_amendment"]}')
    return ctx


def run_step(cfg, step, world=None):
    """One step with its console; returns (exit code, world). A refusal or a count mismatch writes no result."""
    con = paths(cfg, step)['console']
    try:
        ctx = start(cfg, step, con)
    except Refused as e:
        print(f'REFUSED: {e}', file=sys.stderr)
        return 1, world
    log = ctx['log']
    try:
        if world is None:
            world = World(cfg)
        ctx['world'] = world
        ctx['sig'] = cfg_sig(cfg, world)
        S2D.close_gold()
        if step == 'time':
            rc = step_time(cfg, ctx)
        else:
            ctx['counts'] = count_checks_words(cfg, world, log)
            insts = build_instances(cfg, world, log)
            check_instance_counts(cfg, insts, ctx['counts'], log)
            ctx['insts'] = insts
            rc = step_tune(cfg, ctx) if step == 'tune' else step_decisive(cfg, ctx)
        if 'numba' in sys.modules:
            log('NOTE: numba was imported in the main process')
        ctx['load'].sample('end')
        log(f'{step} finished with exit code {rc} ({time.perf_counter() - ctx["t0"]:.0f} s)')
        return rc, world
    except Refused as e:
        log(f'REFUSED: {e}')
        return 1, world
    except S2D.CountMismatch as e:
        log(f'STOPPED: {e}')
        return 1, world
    finally:
        S2D.close_gold()
        log.close()


def selftest(cfg, steps=('time', 'tune', 'decisive')):
    bad = sorted(s for s in cfg.seeds.all_drawn(cfg.grid) if not 95200 <= s < 95500)
    if bad:
        print(f'REFUSED: the self-test draws seeds outside 95200 + i: {bad[:5]}', file=sys.stderr)
        return 1
    world = None
    for step in steps:
        rc, world = run_step(cfg, step, world)
        if rc:
            return rc
    return 0


ISOLATED_STEPS = ('time', 'tune', 'decisive')       # and --dry: main() refuses them unless under_b_i() (A13.2)


def under_b_i():
    """Whether the interpreter runs under -B -I (A13.2's hygiene: isolated, and writing no bytecode); main() refuses
    the steps that parse fetched data otherwise. A function so that the tests can stand in for the flags."""
    return bool(sys.flags.isolated) and bool(sys.flags.dont_write_bytecode)


def interpreter_flags():
    """The interpreter's flags that A13.2's hygiene names, recorded at every start."""
    f = sys.flags
    return {'isolated': bool(f.isolated), 'dont_write_bytecode': bool(f.dont_write_bytecode),
            'ignore_environment': bool(f.ignore_environment), 'no_user_site': bool(f.no_user_site),
            'safe_path': bool(getattr(f, 'safe_path', False)), 'sys_path_0': sys.path[0] if sys.path else None}


def main(argv=None):
    ap = argparse.ArgumentParser(description='Stage 2 of the Hyperbolic Lexicon preregistration: L12-L15 (A13).')
    m = ap.add_mutually_exclusive_group()
    m.add_argument('--time', action='store_true', help='the timing projection on U_@ (A13.16)')
    m.add_argument('--tune', action='store_true', help='registered tuning (A13.10.5)')
    m.add_argument('--write-settings', action='store_true', help='settings-stage2.json from tuning-stage2.json')
    m.add_argument('--decisive', action='store_true', help='the decisive run (A13.15 step 7)')
    m.add_argument('--selftest', action='store_true', help='the whole pipeline on a synthetic world')
    ap.add_argument('--dry', action='store_true', help='the dry run (A13.13): alone, or with --selftest for its shape')
    ap.add_argument('--workers', type=int, default=MAX_WORKERS, help='worker processes (1-4, default 4)')
    ap.add_argument('--allow-dirty', action='store_true', help='dry only: run on a tree with other changes')
    ap.add_argument('--out', help='--selftest: the output folder (outside the repository)')
    a = ap.parse_args(argv)

    def refuse(msg):
        print(f'REFUSED: {msg}', file=sys.stderr)
        return 1
    if not 1 <= a.workers <= MAX_WORKERS:
        return refuse('--workers must be 1 to 4 (spec section 0: four worker processes at most)')
    step = 'time' if a.time else 'tune' if a.tune else 'write-settings' if a.write_settings else \
        'decisive' if a.decisive else 'selftest' if a.selftest else None
    if step is None and not a.dry:
        return refuse('give one of --time, --dry, --tune, --write-settings, --decisive or --selftest')
    if a.dry and step not in (None, 'selftest'):
        return refuse('--dry runs the whole dry run (its tuning, settings and decisive run) alone, or gives '
                      '--selftest the dry run\'s shape')
    if a.allow_dirty and not (a.dry and step is None):
        return refuse('--allow-dirty is for the dry run only (A13.15: registered steps refuse an unclean tree)')
    if a.out and step != 'selftest':
        return refuse('--out goes with --selftest only')
    if step == 'selftest':
        if not a.out:
            return refuse('--selftest needs --out DIR')
        out = os.path.realpath(a.out)
        if P4._inside(out, os.path.realpath(REPO)):
            return refuse('the self-test never writes inside the repository (reference/results included): give --out '
                          'a folder outside it')
        cfg = make_cfg('selftest', a.workers, out=out, shape='verb' if a.dry else 'noun')
        return selftest(cfg)
    if (a.dry or step in ISOLATED_STEPS) and not under_b_i():
        # READING (A13.2, "parsing runs under python3 -B -I with explicit paths"): the steps that read the pinned
        # downloads (--dry, --tune, --decisive) and --time (the store and WordNet) refuse an interpreter without -B
        # and -I; the self-test (a synthetic world) and --write-settings (this project's own JSON) parse nothing
        # fetched. Every start records the flags (interpreter_flags).
        given = ' '.join(argv if argv is not None else sys.argv[1:])
        return refuse('this step parses fetched data and runs only under python3 -B -I (A13.2): rerun it as '
                      f'"python3 -B -I {os.path.basename(__file__)} {given}"')
    if a.dry:
        cfg = make_cfg('dry', a.workers, a.allow_dirty)
        rc, world = run_step(cfg, 'tune')
        if rc:
            return rc
        rc, _ = run_step(cfg, 'decisive', world)
        return rc
    cfg = make_cfg('registered', a.workers)
    if step == 'write-settings':
        try:
            return step_write_settings(cfg)
        except Refused as e:
            return refuse(str(e))
    rc, _ = run_step(cfg, step)
    return rc


if __name__ == '__main__':
    sys.exit(main())
