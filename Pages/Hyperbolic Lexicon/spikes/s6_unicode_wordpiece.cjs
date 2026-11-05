#!/usr/bin/env node
// Hyperbolic Lexicon, Phase 0, spike S6: the Unicode behaviour of Node, Python 3.13 and headless Chromium over every
// code point, the L1 stress set, Final_Sigma and U+0130, and a toy WordPiece run in all three runtimes.
//
// WHAT IT MEASURES.
//   0. The Unicode version of each runtime: Node's process.versions.unicode and icu; Python's
//      unicodedata.unidata_version; for Chromium (Chrome for Testing via Playwright) the browser version and user
//      agent, and the Unicode version inferred from behaviour: the number of assigned graphic and format code points
//      (gc not Cn, Co, Cs or Cc), compared with the totals the Unicode Consortium publishes (15.1: 149,813; 16.0:
//      154,998; 17.0: 159,801), which the script checks on Python (15.1.0) and Node (17.0) before using it on
//      Chromium; and three marker code points (U+2FFC, 15.1; U+0897 ARABIC PEPET, 16.0; U+20C1 SAUDI RIYAL SIGN, 17.0).
//   1. For every code point 0..10FFFF except the surrogates D800..DFFF (1,112,064), in each runtime, with the
//      runtime's own functions:
//        gc     JS: the 30 \p{gc=..} classes, each run as one global /\p{gc=X}+/gu over a string holding every code
//               point in order (checked: every code point is matched by exactly one class); Python:
//               unicodedata.category;
//        lower  String.fromCodePoint(cp).toLowerCase() / chr(cp).lower();
//        nfd    normalize('NFD') / unicodedata.normalize('NFD');
//        mn     JS: /\p{Mn}+/gu (the class a platform normaliser removes); Python: category == 'Mn';
//      and two extra properties read from the same functions, reported but not part of the stress-set rule:
//        sigma  the Final_Sigma context class from two probes, lower('A' + c + U+03A3) and lower(c + U+03A3):
//               C (cased, not case-ignorable) if both end in U+03C2, I (case-ignorable) if only the first, N if
//               neither, X if only the second (impossible under the Unicode rule);
//        ordp   canonical-ordering participation: NFD(c + U+0334) != NFD(c) + U+0334 or
//               NFD(U+0301 + c) != U+0301 + NFD(c).
//      Each property is a canonical text (described in s6_unicode_wordpiece.py) hashed with SHA-256 in its runtime
//      (Node crypto, Python hashlib, Chromium WebCrypto); the texts are compared code point by code point here.
//   2. The divergences: per property and pair of runtimes, and listed in full for code points assigned in both.
//   3. THE STRESS SET (L1 instance (c)), s6_stress_set_v1.json. Rule: every code point where any two runtimes
//      disagree on gc, lower, nfd or mn, each alone (group divergentAlone) and inside "a" + c + "b"
//      (divergentInContext), in code point order; then explicit groups: finalSigma (a fixed list, then for every
//      code point whose sigma class differs between runtimes "A" + c + U+03A3 and "A" + U+03A3 + c + "B"), u0130,
//      hangul, canonicalOrdering (a fixed list, then "a" + U+0301 + c + U+0323 for every code point whose ordp
//      differs). It also records divergentRanges (each maximal range of code points with one divergence signature,
//      as "SSSS..EEEE gc[P:Cn NC:Mn] mn[P:0 NC:1]": P = Python, N = Node, C = Chromium, runtimes grouped by equal
//      value, gc and mn with their values, lower and nfd without) and post151First64: the first 64 code
//      points, by code point, that are assigned in Node's Unicode and unassigned (Cn) in Python's 15.1.0 (L1(d)'s
//      pool; reading: they are already cases of divergentAlone and divergentInContext, so the list names them and is
//      not a group of its own, and no instance is counted twice). A case is a string written as upper-case hex code
//      points joined by single spaces. The canonical JSON is
//      JSON.stringify(set, null, 1) + LF (ASCII only); its SHA-256 is the stress-set hash. Python re-serialises the
//      parsed file with json.dumps(indent=1) + LF and must get the same bytes. Only "--write" writes the file; a
//      normal run regenerates the set in memory and compares it with the committed file.
//   4. Final_Sigma and U+0130: the lowercase of every finalSigma and u0130 case in each runtime, as code point lists.
//   5. L1's must-fail control (1): a platform normaliser, s.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '')
//      (BERT's order: lowercase, NFD, drop Mn), in Node and in Chromium, against Python's reference
//      R(s) = drop Mn(unicodedata.normalize('NFD', s.lower())), on every stress-set case (the committed file's cases
//      when it exists); the number that differ, by group, and the first few.
//   6. The pinned 15.1 table, prototyped by the Python half from unicodedata 15.1.0 (nothing written): entry counts
//      and compact-JSON bytes, and the check that a table-driven lower + Final_Sigma + NFD + drop-Mn reproduces
//      Python's own functions on every code point and on 2,000 synthetic strings Rng(90000 + i).
//   7. A toy WordPiece in Node, Python and Chromium on the repository Markdown pinned at commit
//      7b10514a4f2955c92cd0a06a3a658998080cb310 (the merge of PR #33, on origin/main): every blob under Pages/ whose
//      path ends in ".md" (git ls-tree -r at that commit), sorted by path bytes, decoded as strict UTF-8 (a BOM is
//      kept), joined with one LF. It is read with read-only git plumbing (ls-tree, cat-file); nothing in git is
//      written, so later edits to the working tree do not move the corpus. Recipe:
//        pre-tokenizer (no Unicode tables): A-Z -> a-z only; split on ASCII whitespace (TAB LF VT FF CR SPACE); each
//          ASCII punctuation character (BERT's ranges 21-2F, 3A-40, 5B-60, 7B-7E) is a word of its own; every other
//          code point, ASCII or not, stays inside its word;
//        vocabulary, 500 entries, ids in this order: [PAD] [UNK] [CLS] [SEP] [MASK]; the 68 printable ASCII
//          characters 21..7E other than A-Z, in code point order; "##" + each of 0-9 a-z; the 196 most frequent words
//          of 2..100 characters made only of [a-z0-9]; the 195 most frequent "##" + s, s a proper suffix of 2..4
//          characters of a [a-z0-9] word, counted per occurrence (ties in both lists: string order);
//        WordPiece: BERT's greedy longest-match-first with "##" continuations; a word of more than 100 code points,
//          or with no full match, becomes one [UNK];
//        the token-id stream is the ids as LEB128 varints; its SHA-256 and the vocabulary's ("token\n" lines) are
//          computed in each runtime, which builds the vocabulary itself (Python independently of this file).
//      "~" throughput in tokens/s and MB/s (UTF-8 bytes of the corpus), best of up to 20 repeats.
//
// "~" LINES. Every line that depends on timing, the machine or a runtime version starts with "~ ", including every
// value measured from Node's or Chromium's Unicode data (ICU/V8), the divergences, the regenerated stress-set hash
// and its equality with the committed file, and the control's counts. Python's 15.1 values are printed without "~"
// only while unicodedata.unidata_version is 15.1.0 (the pinned authority); otherwise with "~". Facts read from the
// committed s6_stress_set_v1.json and the WordPiece results (pinned corpus, ASCII-only toy) are not "~".
//
// HOW TO RUN (from the repository root; needs Playwright with Chrome for Testing, git with commit 7b10514 present,
// and python3; the Python half imports only hpstep.prng, so numpy is not needed):
//   node "Pages/Hyperbolic Lexicon/spikes/s6_unicode_wordpiece.cjs" > "Pages/Hyperbolic Lexicon/spikes/s6_unicode_wordpiece_output.txt"
//   node "Pages/Hyperbolic Lexicon/spikes/s6_unicode_wordpiece.cjs" --write    (writes s6_stress_set_v1.json first)
// It starts python3 -B -I s6_unicode_wordpiece.py twice (--sweep, then --cases with the stress set on stdin) and one
// headless Chromium page (served in memory at http://localhost/s6.html through a Playwright route, so that it is a
// secure context with WebCrypto; no server and no file).
//
// WHAT IT SETTLES. The pinned-table design (D5): whether the runtimes' own Unicode functions agree, and where not;
// the table size; L1's must-fail control (1); the stress-set hash. It decides no claim.
//
// DATA AND SEEDS. Full Unicode sweeps; synthetic strings from hpstep.prng.Rng(90000 + i), i = 0..1999 (Python half,
// table check); the repository Markdown at commit 7b10514. No WordNet, no registered seed, no noun.
//
// RUNTIME. About 11 s on the build machine (Node 22.23.4, Python 3.13.18, Chrome for Testing 153): the Python half
// about 5 s, each JS sweep about 1 s, Chromium's launch, sweep and WordPiece about 1.5 s.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync, execFileSync } = require('child_process');

const HERE = __dirname;
const REPO = path.resolve(HERE, '..', '..', '..');
const PY = path.join(HERE, 's6_unicode_wordpiece.py');
const STRESS_PATH = path.join(HERE, 's6_stress_set_v1.json');
const PIN_COMMIT = '7b10514a4f2955c92cd0a06a3a658998080cb310';
const AUTHORITY = '15.1.0';
const WRITE = process.argv.includes('--write');
const T0 = performance.now();
const PUBLISHED = [['15.0', 149186], ['15.1', 149813], ['16.0', 154998], ['17.0', 159801]];
const MARKERS = [[0x2FFC, '15.1'], [0x0897, '16.0'], [0x20C1, '17.0']];
const PROPS = ['gc', 'lower', 'nfd', 'mn'];
const EXTRA = ['sigma', 'ordp'];
const RT = ['P', 'N', 'C'];
const RTNAME = { P: 'python', N: 'node', C: 'chromium' };

function say(s) { process.stdout.write(s + '\n'); }
function env(s) { process.stdout.write('~ ' + s.replace(/^ {2}/, '') + '\n'); }
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const msSince = (t) => performance.now() - t;
const fmt = (n) => n.toLocaleString('en-US');

// =====================================================================================================================
// Kits that run unchanged in Node and in the Chromium page (no outer references; passed to the page as source text)
// =====================================================================================================================
function unicodeKit() {
    const GC = ['Lu', 'Ll', 'Lt', 'Lm', 'Lo', 'Mn', 'Mc', 'Me', 'Nd', 'Nl', 'No', 'Pc', 'Pd', 'Ps', 'Pe', 'Pi', 'Pf', 'Po',
        'Sm', 'Sc', 'Sk', 'So', 'Zs', 'Zl', 'Zp', 'Cc', 'Cf', 'Cs', 'Co', 'Cn'];
    const hex = (cp) => cp.toString(16).toUpperCase().padStart(4, '0');
    const hexs = (s) => Array.from(s, (ch) => hex(ch.codePointAt(0))).join(' ');
    const fromHex = (h) => (h === '' ? '' : String.fromCodePoint(...h.split(' ').map((x) => parseInt(x, 16))));
    function forEachCp(f) {
        for (let cp = 0; cp < 0xD800; cp++) f(cp);
        for (let cp = 0xE000; cp <= 0x10FFFF; cp++) f(cp);
    }
    function runs(arr, label) {
        const lines = [];
        let start = -1, prev = -1, cur;
        forEachCp((cp) => {
            const v = arr[cp];
            if (start >= 0 && v === cur && cp === prev + 1) { prev = cp; return; }
            if (start >= 0) { const lab = label(cur); if (lab !== null) lines.push(hex(start) + '..' + hex(prev) + lab + '\n'); }
            start = prev = cp; cur = v;
        });
        const lab = label(cur);
        if (lab !== null) lines.push(hex(start) + '..' + hex(prev) + lab + '\n');
        return lines.join('');
    }
    function markRuns(S, re, f) {
        let m;
        while ((m = re.exec(S)) !== null) {
            const end = m.index + m[0].length;
            for (let i = m.index; i < end;) { const cp = S.codePointAt(i); f(cp); i += cp > 0xFFFF ? 2 : 1; }
        }
    }
    function sweep() {
        const t0 = performance.now();
        const parts = [];
        forEachCp((cp) => parts.push(String.fromCodePoint(cp)));
        const S = parts.join('');
        const cat = new Int8Array(0x110000).fill(-1);
        let multi = 0, unmatched = 0;
        for (let gi = 0; gi < GC.length; gi++) {
            markRuns(S, new RegExp('\\p{gc=' + GC[gi] + '}+', 'gu'), (cp) => { if (cat[cp] !== -1) multi++; cat[cp] = gi; });
        }
        forEachCp((cp) => { if (cat[cp] === -1) unmatched++; });
        const mn = new Uint8Array(0x110000);
        markRuns(S, /\p{Mn}+/gu, (cp) => { mn[cp] = 1; });
        const lowerL = [], nfdL = [];
        const sig = new Uint8Array(0x110000), ordp = new Uint8Array(0x110000);
        forEachCp((cp) => {
            const c = String.fromCodePoint(cp);
            const lo = c.toLowerCase();
            if (lo !== c) lowerL.push(hex(cp) + ':' + hexs(lo) + '\n');
            const d = c.normalize('NFD');
            if (d !== c) nfdL.push(hex(cp) + ':' + hexs(d) + '\n');
            const a = ('A' + c + '\u03A3').toLowerCase().endsWith('\u03C2');
            const b = (c + '\u03A3').toLowerCase().endsWith('\u03C2');
            sig[cp] = b ? (a ? 2 : 3) : (a ? 1 : 0);
            ordp[cp] = ((c + '\u0334').normalize('NFD') !== d + '\u0334' || ('\u0301' + c).normalize('NFD') !== '\u0301' + d) ? 1 : 0;
        });
        const SIG = 'NICX';
        const texts = {
            gc: runs(cat, (v) => ' ' + (v >= 0 ? GC[v] : '??')),
            lower: lowerL.join(''),
            nfd: nfdL.join(''),
            mn: runs(mn, (v) => (v ? '' : null)),
            sigma: runs(sig, (v) => (v === 0 ? null : ' ' + SIG[v])),
            ordp: runs(ordp, (v) => (v ? '' : null)),
        };
        let nMn = 0, nI = 0, nC = 0, nX = 0, nOrd = 0, gf = 0, cn = 0;
        const cnI = GC.indexOf('Cn'), skip = new Set(['Cn', 'Co', 'Cs', 'Cc'].map((g) => GC.indexOf(g)));
        forEachCp((cp) => {
            nMn += mn[cp]; nOrd += ordp[cp];
            if (sig[cp] === 1) nI++; else if (sig[cp] === 2) nC++; else if (sig[cp] === 3) nX++;
            if (!skip.has(cat[cp])) gf++;
            if (cat[cp] === cnI) cn++;
        });
        const counts = {
            gcRuns: texts.gc.split('\n').length - 1, lower: lowerL.length,
            lowerMulti: lowerL.filter((l) => l.includes(' ')).length, nfd: nfdL.length, mn: nMn,
            sigmaI: nI, sigmaC: nC, sigmaX: nX, ordp: nOrd, graphicFormat: gf, cn,
        };
        const markers = {};
        for (const cp of [0x2FFC, 0x0897, 0x20C1]) markers[hex(cp)] = GC[cat[cp]];
        return { texts, counts, check: { multi, unmatched }, markers, ms: performance.now() - t0 };
    }
    function platformNormalise(s) { return s.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, ''); }
    function runCases(set) {
        const res = {};
        for (const g of set.groups) {
            const lower = [], plat = [];
            for (const h of set.cases[g]) { const s = fromHex(h); lower.push(hexs(s.toLowerCase())); plat.push(hexs(platformNormalise(s))); }
            res[g] = { lower, plat };
        }
        return res;
    }
    return { GC, hex, hexs, fromHex, sweep, runCases, platformNormalise };
}

function wordpieceKit() {
    const isWs = (c) => c === 0x20 || (c >= 0x09 && c <= 0x0D);
    const isPunct = (c) => (c >= 0x21 && c <= 0x2F) || (c >= 0x3A && c <= 0x40) || (c >= 0x5B && c <= 0x60) || (c >= 0x7B && c <= 0x7E);
    function words(text) {
        const out = [];
        let cur = '';
        for (const ch of text) {
            let c = ch.codePointAt(0), s = ch;
            if (c >= 0x41 && c <= 0x5A) { c += 0x20; s = String.fromCharCode(c); }
            if (isWs(c)) { if (cur) { out.push(cur); cur = ''; } }
            else if (isPunct(c)) { if (cur) { out.push(cur); cur = ''; } out.push(s); }
            else cur += s;
        }
        if (cur) out.push(cur);
        return out;
    }
    function buildVocab(ws) {
        const V = ['[PAD]', '[UNK]', '[CLS]', '[SEP]', '[MASK]'];
        for (let c = 0x21; c <= 0x7E; c++) if (!(c >= 0x41 && c <= 0x5A)) V.push(String.fromCharCode(c));
        for (const ch of '0123456789abcdefghijklmnopqrstuvwxyz') V.push('##' + ch);
        const wc = new Map(), sc = new Map(), alnum = /^[a-z0-9]+$/;
        for (const w of ws) {
            if (!alnum.test(w)) continue;
            if (w.length >= 2 && w.length <= 100) wc.set(w, (wc.get(w) || 0) + 1);
            for (let k = 2; k <= 4 && k < w.length; k++) { const s = w.slice(w.length - k); sc.set(s, (sc.get(s) || 0) + 1); }
        }
        const top = (m, k) => [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(0, k).map((e) => e[0]);
        for (const w of top(wc, 196)) V.push(w);
        for (const s of top(sc, 195)) V.push('##' + s);
        return V;
    }
    function tokenize(ws, vocab) {
        const ids = [], unk = vocab.get('[UNK]');
        let longWords = 0, multi = 0;
        for (const w of ws) {
            const chars = Array.from(w);
            if (chars.length > 100) { ids.push(unk); longWords++; continue; }
            const pieces = [];
            let start = 0, bad = false;
            while (start < chars.length) {
                let end = chars.length, hit = -1;
                while (start < end) {
                    const sub = (start > 0 ? '##' : '') + chars.slice(start, end).join('');
                    const id = vocab.get(sub);
                    if (id !== undefined) { hit = id; break; }
                    end--;
                }
                if (hit < 0) { bad = true; break; }
                pieces.push(hit);
                start = end;
            }
            if (bad) ids.push(unk);
            else { for (const p of pieces) ids.push(p); if (pieces.length > 1) multi++; }
        }
        return { ids, longWords, multi };
    }
    function leb128(ids) {
        const out = [];
        for (let x of ids) { for (;;) { const b = x & 0x7F; x >>>= 7; if (x) out.push(b | 0x80); else { out.push(b); break; } } }
        return Uint8Array.from(out);
    }
    function run(text) {
        const ws = words(text);
        const vlist = buildVocab(ws);
        const vocab = new Map(vlist.map((t, i) => [t, i]));
        const r = tokenize(ws, vocab);
        const stream = leb128(r.ids);
        let reps = 0, best = Infinity;
        const tAll = performance.now();
        while (reps < 3 || (performance.now() - tAll < 1500 && reps < 20)) {
            const t0 = performance.now();
            const r2 = tokenize(words(text), vocab);
            best = Math.min(best, performance.now() - t0);
            reps++;
            if (r2.ids.length !== r.ids.length || r2.ids.some((x, i) => x !== r.ids[i])) throw new Error('nondeterministic tokenization');
        }
        let cps = 0, nonAscii = 0;
        for (const ch of text) { cps++; if (ch.codePointAt(0) > 0x7F) nonAscii++; }
        return {
            vocab: vlist, vocabDistinct: vocab.size, stream, codePoints: cps, nonAsciiCodePoints: nonAscii,
            words: ws.length, tokens: r.ids.length, unk: r.ids.filter((x) => x === vocab.get('[UNK]')).length,
            longWords: r.longWords, multiPieceWords: r.multi, streamBytes: stream.length, reps, bestMs: best,
        };
    }
    return { words, buildVocab, tokenize, leb128, run };
}

// The Chromium page's entry point (serialised by Playwright; it rebuilds the kits from their source text).
async function pageMain(arg) {
    const make = (src) => (new Function('return (' + src + ')'))()();
    const U = make(arg.unicodeKit), W = make(arg.wordpieceKit);
    const enc = new TextEncoder();
    const digest = async (bytes) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) => b.toString(16).padStart(2, '0')).join('');
    if (arg.mode === 'cases') return U.runCases(arg.set);
    const sw = U.sweep();
    const sha = {};
    for (const k of Object.keys(sw.texts)) sha[k] = await digest(enc.encode(sw.texts[k]));
    const dec = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    const files = arg.files.map((b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    const text = files.map((f) => dec.decode(f)).join('\n');
    const wp = W.run(text);
    const bytes = enc.encode(text).length;
    const wpOut = Object.assign({}, wp, {
        vocab: undefined, stream: undefined, bytes,
        vocabSize: wp.vocab.length, vocabSha256: await digest(enc.encode(wp.vocab.join('\n') + '\n')),
        streamSha256: await digest(wp.stream), streamB64: btoa(Array.from(wp.stream, (b) => String.fromCharCode(b)).join('')),
        textSha256: await digest(enc.encode(text)),
        tokPerSec: wp.tokens / (wp.bestMs / 1000), mbPerSec: bytes / (wp.bestMs / 1000) / 1e6,
    });
    return {
        ua: navigator.userAgent, secure: isSecureContext, texts: sw.texts, sha, counts: sw.counts, check: sw.check,
        markers: sw.markers, sweepMs: sw.ms, wordpiece: wpOut,
    };
}

// =====================================================================================================================
// Helpers on the Node side
// =====================================================================================================================
const U = unicodeKit();
const W = wordpieceKit();
const { hex, hexs, fromHex, GC } = U;

function forEachCp(f) {
    for (let cp = 0; cp < 0xD800; cp++) f(cp);
    for (let cp = 0xE000; cp <= 0x10FFFF; cp++) f(cp);
}
function parseRuns(text, Arr, val) {
    const a = new Arr(0x110000);
    for (const line of text.split('\n')) {
        if (!line) continue;
        const m = /^([0-9A-F]+)\.\.([0-9A-F]+)( ?)(.*)$/.exec(line);
        const v = val(m[4]);
        for (let cp = parseInt(m[1], 16), e = parseInt(m[2], 16); cp <= e; cp++) a[cp] = v;
    }
    return a;
}
function parseMap(text) {
    const m = new Map();
    for (const line of text.split('\n')) { if (!line) continue; const i = line.indexOf(':'); m.set(parseInt(line.slice(0, i), 16), line.slice(i + 1)); }
    return m;
}
function parseAll(texts) {
    return {
        gc: parseRuns(texts.gc, Int8Array, (s) => GC.indexOf(s)),
        lower: parseMap(texts.lower),
        nfd: parseMap(texts.nfd),
        mn: parseRuns(texts.mn, Uint8Array, () => 1),
        sigma: parseRuns(texts.sigma, Uint8Array, (s) => 'NICX'.indexOf(s)),
        ordp: parseRuns(texts.ordp, Uint8Array, () => 1),
    };
}
// The value of a property at a code point, as a comparable string.
function val(R, prop, cp) {
    switch (prop) {
    case 'gc': return GC[R.gc[cp]];
    case 'lower': return R.lower.has(cp) ? R.lower.get(cp) : hex(cp);
    case 'nfd': return R.nfd.has(cp) ? R.nfd.get(cp) : hex(cp);
    case 'mn': return String(R.mn[cp]);
    case 'sigma': return 'NICX'[R.sigma[cp]];
    case 'ordp': return String(R.ordp[cp]);
    default: throw new Error(prop);
    }
}
// Partition of the runtimes by equal value, e.g. "P:Cn NC:Lo" (with values) or "P|NC" (without).
function partition(vals, withValues) {
    const groups = [];
    for (const r of RT) {
        const g = groups.find((x) => x.v === vals[r]);
        if (g) g.who += r; else groups.push({ v: vals[r], who: r });
    }
    return groups.map((g) => (withValues ? g.who + ':' + g.v : g.who)).join(withValues ? ' ' : '|');
}
function pyCall(args, input) {
    const r = spawnSync('python3', ['-B', '-I', PY, ...args], { input, maxBuffer: 1 << 28, encoding: 'utf8' });
    if (r.status !== 0) throw new Error('python failed: ' + r.stderr);
    return JSON.parse(r.stdout);
}
function git(args) { return execFileSync('git', ['-C', REPO, ...args], { maxBuffer: 1 << 28 }); }
function readCorpus() {
    const raw = git(['ls-tree', '-r', '-z', '--full-tree', PIN_COMMIT, '--', 'Pages']);
    const items = [];
    let i = 0;
    while (i < raw.length) {
        const z = raw.indexOf(0, i);
        const ent = raw.subarray(i, z);
        i = z + 1;
        const tab = ent.indexOf(9);
        const [, type, oid] = ent.subarray(0, tab).toString('latin1').split(' ');
        const p = ent.subarray(tab + 1);
        const ps = p.toString('utf8');
        if (type === 'blob' && ps.startsWith('Pages/') && ps.endsWith('.md')) items.push({ p, ps, oid });
    }
    items.sort((a, b) => Buffer.compare(a.p, b.p));
    return items.map((it) => ({ path: it.ps, data: git(['cat-file', 'blob', it.oid]) }));
}
function inferVersion(graphicFormat) {
    const hit = PUBLISHED.find(([, n]) => n === graphicFormat);
    return hit ? hit[0] : 'unknown (' + graphicFormat + ' matches no published total)';
}
function cpList(h) { return '[' + h + ']'; }
function playwrightVersion() {
    try { return JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve('playwright')), 'package.json'), 'utf8')).version; } catch (e) { return '?'; }
}

// =====================================================================================================================
// The explicit stress-set cases (fixed lists; derived cases are appended at build time)
// =====================================================================================================================
const BASE_SIGMA = [
    '\u039F\u0394\u039F\u03A3', '\u039F\u0394\u039F\u03A3 \u039F\u0394\u039F\u03A3', '\u03A3', 'A\u03A3.', 'A\u03A3',
    '\u03A3A', 'A\u03A3B', 'A\u03A3\u03A3', '\u03A3\u03A3', 'A\u03A3\u03A3B', '\u03A3\u0391\u03A3', 'A.\u03A3',
    'A.\u03A3.', 'A\u03A3.B', 'A\u03A3\u0301', 'A\u0301\u03A3', 'A\u03A3\u0301B', '\u0301\u03A3', "A\u03A3'",
    "A\u03A3'B", "A'\u03A3", 'A\u03A3\u2019B', 'A\u2019\u03A3', 'A\u03A3\u00ADB', 'A\u00AD\u03A3', 'A\u03A3\u200DB',
    'A\u200D\u03A3', 'A\u03A3:B', 'A:\u03A3', 'A\u03A3\u00B7B', '1\u03A3', 'A\u03A31', 'A \u03A3', 'A\u03A3 B',
    'A-\u03A3', '\u1D2C\u03A3', 'A\u1D2C\u03A3', 'A\u03A3\u1D2C', 'A\u03A3\u1D2CB', '\u0345\u03A3', 'A\u0345\u03A3',
    'A\u03A3\u0345', 'A\u03A3\u0345B', '\u01C5\u03A3', 'A\u03A3\u01C5', '\u02B0\u03A3', 'A\u02B0\u03A3',
    'A\u03A3\u02B0B', '\u1F48\u0394\u03A5\u03A3\u03A3\u0395\u038E\u03A3', '\u038C\u03A3\u039F\u03A3',
    '\u0130\u03A3', 'A\u03A3\u0130',
];
const BASE_U0130 = [
    '\u0130', 'a\u0130b', '\u0130STANBUL', 'I\u0307', '\u0130\u0301', '\u0130\u0130', 'I\u0131\u0130i',
    'I\u0307\u0301', '\u0130\u0323', 'i\u0307',
];
const BASE_HANGUL = [
    '\uAC00', '\uAC01', '\uD7A3', '\uD4DB', '\uB098', '\uD55C\uAD6D\uC5B4', '\u1100\u1161\u11A8', '\uAC00\u11A8',
    '\u1100\uAC00', 'a\uAC00b', '\u3131', '\uD7B0', '\uD7FB', '\uAC00\u0301', '\uAC1C',
];
const BASE_ORDER = [
    'a\u0323\u0301', 'a\u0301\u0323', '\u1E0B\u0323', '\u1E0D\u0307', 'q\u0307\u0323', 'q\u0323\u0307',
    'a\u0301\u0300', 'a\u0300\u0301', '\u00E1\u0323', '\u1EA1\u0301', '\u0344', '\u0F73', '\u0F75', '\u0F81',
    '\u0958', '\u2ADC', '\u1E9B\u0323', '\u05B8\u05B9\u05B1', 'a\u0315\u0300\u05AE\u0300b',
    'a\u0334\u0301\u0323\u0334', '\u00C5\u0323', '\u212B\u0323', '\u1FB3\u0301',
];

// =====================================================================================================================
// Main
// =====================================================================================================================
async function main() {
    say('S6 s6_unicode_wordpiece: Unicode behaviour of Node, Python 3.13 and headless Chromium over every code point; the L1 stress set; Final_Sigma and U+0130; a toy WordPiece in all three runtimes');
    say('Settles: the pinned-table design (D5), the table size, L1\'s must-fail control (1) and the stress-set hash. Decides no claim. Data: full Unicode sweeps, synthetic strings Rng(90000+i), repository Markdown at commit 7b10514; no WordNet, nothing registered.');
    env(`node ${process.version}, ${process.platform}-${process.arch}`);
    say('');

    // ---- the three runtimes ----------------------------------------------------------------------------------------
    const tPy = performance.now();
    const py = pyCall(['--sweep']);
    const msPy = msSince(tPy);
    const pyPin = py.versions.unidata === AUTHORITY;
    const pySay = (s) => (pyPin ? say(s) : env(s));

    const tN = performance.now();
    const nsw = U.sweep();
    const nsha = {};
    for (const k of Object.keys(nsw.texts)) nsha[k] = sha256(nsw.texts[k]);
    const msN = msSince(tN);

    const corpus = readCorpus();
    const { chromium } = require('playwright');
    const tC = performance.now();
    const browser = await chromium.launch();
    const chromeVersion = browser.version();
    const page = await (await browser.newContext()).newPage();
    await page.route('http://localhost/**', (r) => r.fulfill({
        status: 200, contentType: 'text/html; charset=utf-8',
        body: '<!doctype html><html><head><meta charset="utf-8"><title>S6 Unicode and WordPiece</title></head><body>S6</body></html>',
    }));
    await page.goto('http://localhost/s6.html');
    const kitArgs = { unicodeKit: unicodeKit.toString(), wordpieceKit: wordpieceKit.toString() };
    const csw = await page.evaluate(pageMain, Object.assign({ mode: 'sweep', files: corpus.map((f) => f.data.toString('base64')) }, kitArgs));
    const msC = msSince(tC);

    // ---- 0. versions ------------------------------------------------------------------------------------------------
    say('0. Runtimes and their Unicode versions');
    env(`  node ${process.version}: process.versions.unicode ${process.versions.unicode}, icu ${process.versions.icu}, cldr ${process.versions.cldr}, v8 ${process.versions.v8}`);
    env(`  python ${py.versions.python} (python3 -B -I): unicodedata.unidata_version ${py.versions.unidata}`);
    env(`  chromium: Chrome for Testing ${chromeVersion} via Playwright ${playwrightVersion()}; secure context ${csw.secure}; UA ${csw.ua}`);
    say('  inference from behaviour: assigned graphic + format code points (gc not Cn, Co, Cs, Cc) against the published totals');
    say(`  (${PUBLISHED.map(([v, n]) => v + ': ' + fmt(n)).join(', ')}); checked on Python and Node first. Markers: ${MARKERS.map(([cp, v]) => 'U+' + hex(cp) + ' (' + v + ')').join(', ')}`);
    const pyVer = inferVersion(py.counts.graphicFormat), nVer = inferVersion(nsw.counts.graphicFormat), cVer = inferVersion(csw.counts.graphicFormat);
    pySay(`  python: ${fmt(py.counts.graphicFormat)} -> Unicode ${pyVer} (reports ${py.versions.unidata})`);
    env(`  node: ${fmt(nsw.counts.graphicFormat)} -> Unicode ${nVer} (reports ${process.versions.unicode}); markers ${Object.entries(nsw.markers).map(([k, v]) => k + ' ' + v).join(', ')}`);
    env(`  chromium: ${fmt(csw.counts.graphicFormat)} -> Unicode ${cVer} (inferred); markers ${Object.entries(csw.markers).map(([k, v]) => k + ' ' + v).join(', ')}`);
    env(`  agreement of the inference with the reported version: python ${pyVer + '.0' === py.versions.unidata ? 'yes' : 'no'}, node ${nVer === process.versions.unicode ? 'yes' : 'no'}`);
    say('');

    // ---- 1. the sweep -----------------------------------------------------------------------------------------------
    say('1. Every code point 0..10FFFF except D800..DFFF (1,112,064): gc, lower, nfd, mn (the stress-set properties) and sigma, ordp (reported)');
    say('  canonical texts, SHA-256 per runtime: gc runs "SSSS..EEEE Cat"; lower and nfd "XXXX:YYYY ZZZZ" where the mapping is not the identity;');
    say('  mn and ordp runs of members; sigma runs of classes I and C; hex upper case, >= 4 digits, LF, code point order');
    const lineCount = (t) => t.split('\n').length - 1;
    for (const k of [...PROPS, ...EXTRA]) pySay(`  python ${k.padEnd(5)} ${String(lineCount(py.texts[k])).padStart(6)} lines  sha256 ${py.sha[k]}`);
    for (const k of [...PROPS, ...EXTRA]) env(`  node   ${k.padEnd(5)} ${String(lineCount(nsw.texts[k])).padStart(6)} lines  sha256 ${nsha[k]}${nsha[k] === py.sha[k] ? ' (= python)' : ''}`);
    for (const k of [...PROPS, ...EXTRA]) {
        const own = sha256(csw.texts[k]);
        env(`  chrome ${k.padEnd(5)} ${String(lineCount(csw.texts[k])).padStart(6)} lines  sha256 ${csw.sha[k]}${csw.sha[k] === nsha[k] ? ' (= node)' : ''}${csw.sha[k] === py.sha[k] ? ' (= python)' : ''}${own === csw.sha[k] ? '' : ' WEBCRYPTO != NODE CRYPTO'}`);
    }
    const cntLine = (c) => `lower ${c.lower} (multi-code-point ${c.lowerMulti}), nfd ${c.nfd}, Mn ${c.mn}, sigma I ${c.sigmaI} / C ${c.sigmaC} / X ${c.sigmaX}, ordp ${c.ordp}, Cn ${fmt(c.cn)}`;
    pySay(`  python counts: ${cntLine(py.counts)}; ordp = (combining != 0) on every code point without a decomposition: ${py.counts.ordpVsCombiningMismatch === 0 ? 'yes' : 'NO, ' + py.counts.ordpVsCombiningMismatch + ' differ'}`);
    env(`  node counts: ${cntLine(nsw.counts)}`);
    env(`  chromium counts: ${cntLine(csw.counts)}`);
    env(`  JS gc check: every code point matched by exactly one of the 30 classes: node ${nsw.check.multi === 0 && nsw.check.unmatched === 0 ? 'yes' : 'NO'}, chromium ${csw.check.multi === 0 && csw.check.unmatched === 0 ? 'yes' : 'NO'}`);
    env(`  sweep time: python ${py.ms.sweep.toFixed(0)} ms, node ${nsw.ms.toFixed(0)} ms, chromium ${csw.sweepMs.toFixed(0)} ms`);
    say('');

    // ---- 2. divergences ---------------------------------------------------------------------------------------------
    const R = { P: parseAll(py.texts), N: parseAll(nsw.texts), C: parseAll(csw.texts) };
    const cnIdx = GC.indexOf('Cn');
    const assignedIn = (r, cp) => R[r].gc[cp] !== cnIdx;
    say('2. Divergences (code points on which two runtimes give different values)');
    const pairs = [['N', 'P'], ['C', 'P'], ['N', 'C']];
    const divCount = {};
    for (const prop of [...PROPS, ...EXTRA]) {
        const c = { NP: 0, CP: 0, NC: 0, NPboth: 0 };
        forEachCp((cp) => {
            const v = { P: val(R.P, prop, cp), N: val(R.N, prop, cp), C: val(R.C, prop, cp) };
            if (v.N !== v.P) { c.NP++; if (assignedIn('P', cp) && assignedIn('N', cp)) c.NPboth++; }
            if (v.C !== v.P) c.CP++;
            if (v.N !== v.C) c.NC++;
        });
        divCount[prop] = c;
        env(`  ${prop.padEnd(5)} node-python ${String(c.NP).padStart(5)} (assigned in both: ${c.NPboth}), chromium-python ${String(c.CP).padStart(5)}, node-chromium ${c.NC}`);
    }
    // New code points and the per-property lists on code points assigned in both.
    let newN = 0, newC = 0, goneN = 0;
    forEachCp((cp) => {
        if (!assignedIn('P', cp) && assignedIn('N', cp)) newN++;
        if (!assignedIn('P', cp) && assignedIn('C', cp)) newC++;
        if (assignedIn('P', cp) && !assignedIn('N', cp)) goneN++;
    });
    env(`  code points assigned in node but Cn in python: ${fmt(newN)}; in chromium but Cn in python: ${fmt(newC)}; assigned in python but Cn in node: ${goneN}`);
    for (const prop of [...PROPS, ...EXTRA]) {
        const list = [];
        forEachCp((cp) => {
            if (!(assignedIn('P', cp) && assignedIn('N', cp) && assignedIn('C', cp))) return;
            const v = { P: val(R.P, prop, cp), N: val(R.N, prop, cp), C: val(R.C, prop, cp) };
            if (v.P !== v.N || v.P !== v.C) list.push(`${hex(cp)} ${partition(v, true)}`);
        });
        env(`  ${prop} differences on code points assigned in all three runtimes: ${list.length}${list.length ? ':' : ''}`);
        for (let i = 0; i < list.length; i += 4) env(`    ${list.slice(i, i + 4).join('; ')}`);
    }
    say('');

    // ---- 3. the stress set ------------------------------------------------------------------------------------------
    say('3. The L1 stress set (s6_stress_set_v1.json)');
    const D = [], sigOf = new Map();
    forEachCp((cp) => {
        const parts = [];
        for (const prop of PROPS) {
            const v = { P: val(R.P, prop, cp), N: val(R.N, prop, cp), C: val(R.C, prop, cp) };
            if (v.P === v.N && v.P === v.C) continue;
            parts.push(prop + '[' + partition(v, prop === 'gc' || prop === 'mn') + ']');
        }
        if (parts.length) { D.push(cp); sigOf.set(cp, parts.join(' ')); }
    });
    const ranges = [];
    for (const cp of D) {
        const last = ranges[ranges.length - 1];
        if (last && last.e === cp - 1 && last.s === sigOf.get(cp)) last.e = cp;
        else ranges.push({ b: cp, e: cp, s: sigOf.get(cp) });
    }
    const post151 = [];
    forEachCp((cp) => { if (post151.length < 64 && assignedIn('N', cp) && !assignedIn('P', cp)) post151.push(cp); });
    const sigmaDiv = [], ordpDiv = [];
    forEachCp((cp) => {
        const s = { P: val(R.P, 'sigma', cp), N: val(R.N, 'sigma', cp), C: val(R.C, 'sigma', cp) };
        if (s.P !== s.N || s.P !== s.C) sigmaDiv.push(cp);
        const o = { P: val(R.P, 'ordp', cp), N: val(R.N, 'ordp', cp), C: val(R.C, 'ordp', cp) };
        if (o.P !== o.N || o.P !== o.C) ordpDiv.push(cp);
    });
    const SIG = '\u03A3';
    const cases = {
        divergentAlone: D.map((cp) => hex(cp)),
        divergentInContext: D.map((cp) => hexs('a' + String.fromCodePoint(cp) + 'b')),
        finalSigma: [...BASE_SIGMA.map(hexs), ...sigmaDiv.flatMap((cp) => {
            const c = String.fromCodePoint(cp);
            return [hexs('A' + c + SIG), hexs('A' + SIG + c + 'B')];
        })],
        u0130: BASE_U0130.map(hexs),
        hangul: BASE_HANGUL.map(hexs),
        canonicalOrdering: [...BASE_ORDER.map(hexs), ...ordpDiv.map((cp) => hexs('a\u0301' + String.fromCodePoint(cp) + '\u0323'))],
    };
    const groups = Object.keys(cases);
    const caseCount = groups.reduce((a, g) => a + cases[g].length, 0);
    const stressSet = {
        format: 'hyperbolic-lexicon/s6-stress-set/1',
        about: 'L1 instance (c), written by spike S6 (s6_unicode_wordpiece.cjs --write). A case is a string written as upper-case hex code points joined by single spaces. The instances are the cases of the groups, in the order of groups and then of each list. divergentAlone and divergentInContext hold every code point on which Node, Python and Chromium do not all agree on gc, lower, nfd or mn, alone and as a + c + b. finalSigma, u0130, hangul and canonicalOrdering hold fixed lists followed by derived cases: A + c + SIGMA and A + SIGMA + c + B for every code point whose Final_Sigma context class differs, and a + U+0301 + c + U+0323 for every code point whose canonical-ordering probe differs. divergentRanges gives each maximal range of code points with one divergence signature, as SSSS..EEEE signature (P Python, N Node, C Chromium; gc and mn with their values). post151First64 lists the first 64 code points assigned in Node but unassigned in Python 15.1.0.',
        unicode: { python: py.versions.unidata, node: process.versions.unicode, chromium: cVer },
        properties: PROPS,
        divergentCodePoints: D.length,
        divergentRanges: ranges.map((r) => hex(r.b) + '..' + hex(r.e) + ' ' + r.s),
        post151First64: post151.map(hex),
        groups,
        caseCount,
        cases,
    };
    const canon = JSON.stringify(stressSet, null, 1) + '\n';
    if (/[^\x20-\x7E\n]/.test(canon)) throw new Error('stress set is not printable ASCII');
    const regenSha = sha256(canon);
    if (WRITE) {
        fs.writeFileSync(STRESS_PATH, canon);
        env(`  --write: wrote ${path.basename(STRESS_PATH)} (${fmt(Buffer.byteLength(canon))} B)`);
    }
    const committed = fs.existsSync(STRESS_PATH) ? fs.readFileSync(STRESS_PATH) : null;
    env(`  regenerated in memory: ${fmt(caseCount)} cases, ${fmt(Buffer.byteLength(canon))} B, sha256 ${regenSha}; equal to the committed file: ${committed ? (sha256(committed) === regenSha ? 'yes' : 'NO') : 'no file'}`);
    let set = stressSet, setRaw = canon;
    if (committed) {
        set = JSON.parse(committed.toString('utf8'));
        setRaw = committed.toString('utf8');
        const propCount = {};
        for (const p of PROPS) propCount[p] = 0;
        let nCp = 0;
        const rng = set.divergentRanges.map((x) => /^([0-9A-F]+)\.\.([0-9A-F]+) (.+)$/.exec(x).slice(1));
        for (const [b, e, s] of rng) {
            const n = parseInt(e, 16) - parseInt(b, 16) + 1;
            nCp += n;
            for (const p of PROPS) if (s.includes(p + '[')) propCount[p] += n;
        }
        say(`  committed file: ${fmt(committed.length)} B, sha256 ${sha256(committed)}`);
        say(`  canonical (JSON.stringify(set, null, 1) + LF, printable ASCII): ${(JSON.stringify(set, null, 1) + '\n') === setRaw ? 'yes' : 'NO'}; recorded Unicode versions: python ${set.unicode.python}, node ${set.unicode.node}, chromium ${set.unicode.chromium} (inferred)`);
        say(`  ${fmt(set.caseCount)} cases: ${set.groups.map((g) => g + ' ' + set.cases[g].length).join(', ')}`);
        say(`  ${fmt(set.divergentCodePoints)} divergent code points (= ${fmt(nCp)} in ${set.divergentRanges.length} ranges) by property: ${PROPS.map((p) => p + ' ' + propCount[p]).join(', ')}`);
        const sigCount = new Map();
        for (const [b, e, s] of rng) sigCount.set(s, (sigCount.get(s) || 0) + parseInt(e, 16) - parseInt(b, 16) + 1);
        say('  code points by divergence signature:');
        for (const [s, n] of [...sigCount.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))) say(`    ${String(n).padStart(5)}  ${s}`);
        say(`  finalSigma: ${BASE_SIGMA.length} fixed + ${set.cases.finalSigma.length - BASE_SIGMA.length} derived (2 per code point whose sigma class differs); canonicalOrdering: ${BASE_ORDER.length} fixed + ${set.cases.canonicalOrdering.length - BASE_ORDER.length} derived`);
        say('  post151First64 (assigned in Node, Cn in Python 15.1.0; L1(d)\'s pool):');
        for (let i = 0; i < set.post151First64.length; i += 16) say(`    ${set.post151First64.slice(i, i + 16).join(' ')}`);
    } else {
        env('  no committed s6_stress_set_v1.json yet: run with --write');
    }
    // the cases in the three runtimes (the committed file's when it exists)
    const pyc = pyCall(['--cases'], setRaw);
    const nc = U.runCases(set);
    const cc = await page.evaluate(pageMain, Object.assign({ mode: 'cases', set }, kitArgs));
    await browser.close();
    env(`  python read the ${committed ? 'committed' : 'regenerated'} set: sha256 ${pyc.sha256 === sha256(setRaw) ? 'equal' : 'DIFFERENT'}; json.dumps(json.loads(text), indent=1) + LF reproduces it byte for byte: ${pyc.canonical ? 'yes' : 'NO'}`);
    say('');

    // ---- 4. Final_Sigma and U+0130 ----------------------------------------------------------------------------------
    say('4. Final_Sigma and U+0130: lowercase in each runtime, as code point lists (the fixed cases; derived cases summarised)');
    const showLower = (g, n) => {
        const exc = [];
        for (let i = 0; i < n; i++) {
            const inp = set.cases[g][i], p = pyc.groups[g].lower[i], nv = nc[g].lower[i], cv = cc[g].lower[i];
            pySay(`    ${cpList(inp)} -> ${cpList(p)}`);
            if (nv !== p) exc.push(`node ${cpList(inp)} -> ${cpList(nv)}`);
            if (cv !== p) exc.push(`chromium ${cpList(inp)} -> ${cpList(cv)}`);
        }
        env(`  node and chromium give python's lowercase on ${exc.length ? 'all but these' : 'all ' + n + ' of these cases'}${exc.length ? ':' : ''}`);
        for (const e of exc) env(`    ${e}`);
    };
    say('  Final_Sigma (U+03A3 -> U+03C2 when final, U+03C3 otherwise; the context skips case-ignorable code points), python:');
    showLower('finalSigma', BASE_SIGMA.length);
    {
        const g = 'finalSigma';
        let dn = 0, dc = 0;
        const ex = [];
        for (let i = BASE_SIGMA.length; i < set.cases[g].length; i++) {
            const p = pyc.groups[g].lower[i];
            if (nc[g].lower[i] !== p) { dn++; if (ex.length < 6) ex.push(`${cpList(set.cases[g][i])}: python ${cpList(p)}, node ${cpList(nc[g].lower[i])}`); }
            if (cc[g].lower[i] !== p) dc++;
        }
        env(`  derived Final_Sigma cases: node lowercase differs from python on ${dn} of ${set.cases[g].length - BASE_SIGMA.length}, chromium on ${dc}; first:`);
        for (const e of ex) env(`    ${e}`);
        const newCls = {}, both = [];
        for (const cp of sigmaDiv) {
            if (assignedIn('P', cp)) { both.push(`U+${hex(cp)} ${val(R.P, 'sigma', cp)} -> ${val(R.N, 'sigma', cp)}`); continue; }
            const k = val(R.N, 'sigma', cp);
            newCls[k] = (newCls[k] || 0) + 1;
        }
        env(`  the ${sigmaDiv.length} code points whose sigma class differs: ${both.length} assigned in python (${both.join(', ') || 'none'}), ${sigmaDiv.length - both.length} new since 15.1 (node class ${Object.keys(newCls).sort().map((k) => k + ' ' + newCls[k]).join(', ')})`);
    }
    say('  U+0130 (full lowercase mapping to U+0069 U+0307; no locale), python:');
    showLower('u0130', BASE_U0130.length);
    say('');

    // ---- 5. the must-fail control -----------------------------------------------------------------------------------
    say('5. L1\'s must-fail control (1): platform normaliser toLowerCase().normalize(\'NFD\').replace(/\\p{Mn}/gu, \'\') against Python\'s R(s) on the stress set');
    pySay(`  python reference outputs (all ${fmt(set.caseCount)} cases, "hex\\n" each), sha256 ${sha256(set.groups.map((g) => pyc.groups[g].ref.map((x) => x + '\n').join('')).join(''))}`);
    const ctl = {};
    for (const [rt, res] of [['node', nc], ['chromium', cc]]) {
        let total = 0;
        const byGroup = [], ex = [];
        for (const g of set.groups) {
            let d = 0;
            for (let i = 0; i < set.cases[g].length; i++) {
                if (res[g].plat[i] !== pyc.groups[g].ref[i]) {
                    d++;
                    if (d <= 2) ex.push(`${g} ${cpList(set.cases[g][i])}: python ${cpList(pyc.groups[g].ref[i])}, ${rt} ${cpList(res[g].plat[i])}`);
                }
            }
            total += d;
            byGroup.push(`${g} ${d}/${set.cases[g].length}`);
        }
        ctl[rt] = total;
        env(`  ${rt}: differs from python on ${fmt(total)} of ${fmt(set.caseCount)} cases (${byGroup.join(', ')}); the control ${total > 0 ? 'FAILS, as it must' : 'PASSES (the cell would be void)'}; the first two per group:`);
        for (const e of ex) env(`    ${e}`);
    }
    let ncDiff = 0;
    for (const g of set.groups) for (let i = 0; i < set.cases[g].length; i++) if (nc[g].plat[i] !== cc[g].plat[i] || nc[g].lower[i] !== cc[g].lower[i]) ncDiff++;
    env(`  node and chromium platform normalisers (and lowercases) differ from each other on ${ncDiff} cases`);
    say('');

    // ---- 6. the pinned table ----------------------------------------------------------------------------------------
    const T = py.table, TC = py.tableCheck;
    say('6. The pinned Unicode 15.1 table, prototyped from Python\'s unicodedata (nothing written; reference/golden/unicode_15_1_v1.json will be the real one)');
    pySay(`  categories: ${fmt(T.gcRanges)} ranges over 0..10FFFF (they also give Mn, Cc/Cf, Zs and P* for N_B's other steps); canonical decompositions`);
    pySay(`  (single step, Hangul algorithmic): ${fmt(T.decomp)} (${fmt(T.decompSingleton)} singletons);`);
    pySay(`  combining classes: ${T.cccRanges} ranges of ${T.cccCodePoints} code points, ${T.cccValues} distinct non-zero values; lowercase: ${fmt(T.lower)} mappings (${T.lowerMulti} to more than one code point);`);
    pySay(`  Final_Sigma sets: case-ignorable ${fmt(T.ignCodePoints)} code points in ${T.ignRanges} ranges, cased-not-ignorable ${fmt(T.casCodePoints)} in ${T.casRanges} ranges (read from str.lower by the sigma probes)`);
    pySay(`  compact JSON: ${fmt(T.bytes)} B, sha256 ${T.sha256} (a prototype, not a pin)`);
    pySay(`  exactness, table-driven lower + Final_Sigma + NFD + drop Mn against Python's own functions: every code point alone: lower ${TC.lowerAloneMismatch}, nfd ${TC.nfdAloneMismatch}, full ${TC.normAloneMismatch} mismatches of ${fmt(TC.codePoints)};`);
    pySay(`  ${fmt(TC.synthetic)} synthetic strings Rng(90000+i) from a ${TC.poolSize}-code-point pool: ${TC.syntheticMismatch} mismatches (${TC.syntheticWithFinalSigma} contain a final sigma, ${TC.syntheticWithMedialSigma} a non-final one); digest ${TC.syntheticDigest}`);
    env(`  table build ${py.ms.table.toFixed(0)} ms, check ${py.ms.check.toFixed(0)} ms`);
    say('');

    // ---- 7. the toy WordPiece ---------------------------------------------------------------------------------------
    say('7. Toy WordPiece (greedy longest-match-first, "##", [UNK], 100 code points per word; 500-entry vocabulary from the corpus) in three runtimes');
    const tN2 = performance.now();
    const dec = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    const text = corpus.map((f) => dec.decode(f.data)).join('\n');
    const nwp = W.run(text);
    const nbytes = Buffer.byteLength(text, 'utf8');
    const nw = Object.assign({}, nwp, {
        bytes: nbytes, vocabSize: nwp.vocab.length, vocabSha256: sha256(nwp.vocab.join('\n') + '\n'), streamSha256: sha256(nwp.stream),
        textSha256: sha256(Buffer.from(text, 'utf8')), tokPerSec: nwp.tokens / (nwp.bestMs / 1000), mbPerSec: nbytes / (nwp.bestMs / 1000) / 1e6,
    });
    const msWp = msSince(tN2);
    const pw = py.wordpiece, cw = csw.wordpiece;
    const manifest = corpus.map((f) => sha256(f.data) + ' ' + f.path + '\n').join('');
    say(`  corpus: commit ${PIN_COMMIT}, ${corpus.length} files (Pages/**/*.md), ${fmt(nbytes)} B UTF-8 joined with LF, ${fmt(nw.codePoints)} code points (${nw.nonAsciiCodePoints} non-ASCII)`);
    say(`  manifest sha256 ("sha256 path\\n" per file) ${sha256(manifest)} (python ${pw.manifestSha256 === sha256(manifest) ? 'equal' : 'DIFFERENT'}); text sha256 ${nw.textSha256}`);
    for (const f of corpus) say(`    ${String(f.data.length).padStart(6)} B  ${f.path}`);
    const keys = ['words', 'tokens', 'unk', 'longWords', 'multiPieceWords', 'streamBytes', 'vocabSize'];
    const row = (w) => keys.map((k) => k + ' ' + w[k]).join(', ');
    say(`  python:   ${row(pw)}`);
    say(`            vocab sha256 ${pw.vocabSha256}, id stream sha256 ${pw.streamSha256}`);
    for (const [name, w] of [['node', nw], ['chromium', cw]]) {
        const same = keys.every((k) => w[k] === pw[k]) && w.vocabSha256 === pw.vocabSha256 && w.streamSha256 === pw.streamSha256 && w.textSha256 === pw.textSha256;
        say(`  ${(name + ':').padEnd(9)} ${row(w)}`);
        say(`            vocab sha256 ${w.vocabSha256 === pw.vocabSha256 ? 'equal' : w.vocabSha256}, id stream sha256 ${w.streamSha256 === pw.streamSha256 ? 'equal' : w.streamSha256}, text sha256 ${w.textSha256 === pw.textSha256 ? 'equal' : 'DIFFERENT'}: ${same ? 'identical to python' : 'DIFFERENT'}`);
    }
    const cStream = Buffer.from(cw.streamB64, 'base64');
    say(`  chromium's stream re-hashed in Node: ${sha256(cStream) === cw.streamSha256 ? 'equal to its WebCrypto hash' : 'DIFFERENT'}; byte-identical to Node's: ${Buffer.compare(cStream, Buffer.from(nw.stream)) === 0 ? 'yes' : 'NO'}`);
    const vocab = nwp.vocab;
    say(`  vocabulary: ids 0-4 specials, 5-72 ASCII, 73-108 "##" + [0-9a-z], 109-304 words (${vocab.slice(109, 115).join(' ')} ... ${vocab[304]}), 305-499 "##" suffixes (${vocab.slice(305, 311).join(' ')} ... ${vocab[499]})`);
    const ex = W.words('Hyperbolic Lexicon: pinned tables, tokenization and WordPiece.');
    const vmap = new Map(vocab.map((t, i) => [t, i]));
    const exIds = W.tokenize(ex, vmap).ids;
    say(`  example: "Hyperbolic Lexicon: pinned tables, tokenization and WordPiece." -> ${exIds.map((i) => vocab[i]).join(' ')}`);
    say(`           ids ${exIds.join(' ')}`);
    for (const [name, w] of [['python', pw], ['node', nw], ['chromium', cw]]) {
        env(`  ${name.padEnd(8)} throughput ${fmt(Math.round(w.tokPerSec))} tokens/s, ${w.mbPerSec.toFixed(2)} MB/s (best of ${w.reps} passes, ${w.bestMs.toFixed(1)} ms per pass)`);
    }
    say('');

    // ---- SETTLES ----------------------------------------------------------------------------------------------------
    say('SETTLES:');
    env(`- Unicode versions: Node ${process.versions.unicode} (ICU ${process.versions.icu}), Python ${py.versions.unidata}, Chrome for Testing ${chromeVersion} Unicode ${cVer} (inferred from ${fmt(csw.counts.graphicFormat)} assigned graphic + format code points).`);
    env(`  Node and Python differ on ${fmt(divCount.gc.NP)} gc, ${divCount.lower.NP} lower, ${divCount.nfd.NP} nfd and ${divCount.mn.NP} Mn values (${fmt(D.length)} code points in all; on code points assigned in`);
    env(`  both: gc ${divCount.gc.NPboth}, lower ${divCount.lower.NPboth}, nfd ${divCount.nfd.NPboth}, mn ${divCount.mn.NPboth}); Final_Sigma context classes on ${divCount.sigma.NP}; Node and Chromium differ on ${PROPS.map((p) => divCount[p].NC).reduce((a, b) => a + b, 0)} values.`);
    if (pyPin) {
        const bad = TC.normAloneMismatch + TC.nfdAloneMismatch + TC.lowerAloneMismatch + TC.syntheticMismatch;
        say(`- D5 (pinned tables) and the table size: the 15.1 table prototyped from Python's unicodedata 15.1.0 (${fmt(T.gcRanges)} category ranges, ${fmt(T.decomp)}`);
        say(`  single-step canonical decompositions, ${T.cccRanges} combining-class ranges, ${fmt(T.lower)} lowercase mappings, 2 Final_Sigma sets of ${T.ignRanges} + ${T.casRanges} ranges;`);
        say(`  ${fmt(T.bytes)} B as compact JSON) ${bad === 0 ? 'reproduces' : 'does NOT reproduce'} Python's lower + Final_Sigma + NFD + drop Mn: ${TC.normAloneMismatch + TC.nfdAloneMismatch + TC.lowerAloneMismatch} mismatches on ${fmt(TC.codePoints)} code points`);
        say(`  alone and ${TC.syntheticMismatch} on ${fmt(TC.synthetic)} synthetic strings. Final_Sigma needs the Cased and Case_Ignorable sets, which unicodedata does not expose;`);
        say('  the sigma probes read them from str.lower, so the export must include them.');
    } else {
        env(`- Python's unicodedata is ${py.versions.unidata}, not ${AUTHORITY}: the 15.1 table facts are not reproduced here.`);
    }
    env(`- L1 control (1): the platform normaliser differs from Python's R(s) on ${fmt(ctl.node)} of ${fmt(set.caseCount)} stress-set cases in Node and ${fmt(ctl.chromium)} in Chromium`);
    env(`  (it must differ on >= 1: ${ctl.node > 0 && ctl.chromium > 0 ? 'it does, so the control fails as required' : 'it does NOT'}). Node and Chromium agree with each other on every case.`.replace('agree with each other on every case', ncDiff === 0 ? 'agree with each other on every case' : 'differ from each other on ' + ncDiff + ' cases'));
    if (committed) {
        say(`- Stress set: s6_stress_set_v1.json, ${fmt(committed.length)} B, ${fmt(set.caseCount)} cases (${fmt(set.divergentCodePoints)} divergent code points x 2 + ${set.caseCount - 2 * set.divergentCodePoints} explicit),`);
        say(`  sha256 ${sha256(committed)}; post151First64 from U+${set.post151First64[0]} to U+${set.post151First64[63]}.`);
    }
    say(`- Toy WordPiece on the pinned Markdown: Python, Node and Chromium give the same vocabulary (sha256 ${pw.vocabSha256.slice(0, 16)}...) and the same`);
    say(`  ${fmt(pw.tokens)}-token id stream (sha256 ${pw.streamSha256.slice(0, 16)}...): ${['node', 'chromium'].every((n) => (n === 'node' ? nw : cw).streamSha256 === pw.streamSha256) ? 'identical' : 'NOT identical'}.`);
    env(`  Throughput: python ${fmt(Math.round(pw.tokPerSec))}, node ${fmt(Math.round(nw.tokPerSec))}, chromium ${fmt(Math.round(cw.tokPerSec))} tokens/s.`);
    env(`total runtime ${(msSince(T0) / 1000).toFixed(1)} s (python --sweep call: sweep, table, check, WordPiece ${(msPy / 1000).toFixed(1)} s, node sweep ${(msN / 1000).toFixed(1)} s, chromium launch + sweep + WordPiece ${(msC / 1000).toFixed(1)} s, node WordPiece ${(msWp / 1000).toFixed(1)} s)`);
}

main().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
