// Taking code from Owl Academy and BioChain-AI by name, running it apart from Node, and checking a pin by content.
// Shared by the pin scripts (make_golden_v1, make_owl_v1, make_lattice_v1 and make_bridges_v1 here; the Lexicon's
// make_biomesh_compat_v1 and reference/tests/owl_biomesh.cjs).
//
//   grab(src, name), line(src, start)   a function, class or const by name; a line by its start. grab takes the
//                                       declaration with the least indentation (a top-level one before any local of
//                                       the same name) and matches brackets outside comments, strings, template
//                                       literals and regular expressions. On the pinned sources it gives the same text
//                                       as owl_eye.cjs's grab (the decided runners' grab, which stays as it is)
//   constStatement(src, name)           the top-level const statement that declares name (which may declare others),
//                                       to the end of the line that ends it, without "export "
//   piece(src, name)                    constStatement for CONST_NAMES, grab for every other name
//   SYNC, CONST_NAMES                   the biochain's synchronous functions and its constants, in biochain_v1.js order
//   OWL_GROWER, BIOCHAIN_GROWER         where a grower may live: the Firebase-free core first, then biomesh.js
//   findSource(root, file, sha256)      a file's content with that SHA-256: the working tree first, then git history
//                                       (git log, then git show) until the SHA-256 matches; null when it is not found
//   locate(root, candidates, names)     the first candidate file that defines every name, else all the candidates
//                                       together (a partial move into a core module); null when even together they lack
//                                       a name. A name defined in more than one candidate must have the same text in
//                                       each: otherwise the result carries `conflicts` (an ES module's own export hides
//                                       a star export, so the pages may run a copy the pins do not), and identical
//                                       copies are listed in `shared`
//   functionHashes(src, names)          the SHA-256 of each name's text, as piece takes it (null when it is missing)
//   withHelpers(src, body, provided)    body plus the top-level helpers of src it uses and does not declare (Owl's O3
//                                       engramGrid calls letterGrid), transitively; body unchanged when it needs none
//   sandbox()                           a fresh vm context for sibling code: no process, no require
//   loadGrower(root, candidates)        the grower in a checkout (locate with GROWER_NAMES, the candidates default
//                                       OWL_GROWER), as growerFromSource gives it, with its file and SHA-256; throws on
//                                       conflicting copies
//   growerFromSource(src)               growBiochain, verifyIntegrity and MAX_GROW_BYTES, with SYNC and CONST_NAMES, run
//                                       in a sandbox; their SC.sha256Hex (Owl), CC.sha256Hex (BioChain-AI) or sha256Hex
//                                       is SHA-256 over UTF-8
//   tamperSet(record), differential(pinned, live, record)
//                                       records derived from one valid record, one field altered in each, and the grow
//                                       cap probed; the verdicts of two growers on them, for the live contract
//   loadOwlEye(src)                     owl_eye.cjs's recipe for Engram_Mind_Eye.html, run in a sandbox
//   checkPin(spec), Report              the --check of a pin: reproduction, live contract, NOTE lines, exit 0, 1 or 2
//
// The sandbox. Sibling code is evaluated with vm in a new context that holds only JavaScript's built-ins and, from a
// prelude evaluated inside it, a UTF-8 TextEncoder and TextDecoder (the Encoding Standard's algorithms, with the
// decoder's fatal and ignoreBOM options: Owl's strict verifier decodes with both), a SHA-256
// over UTF-8 (FIPS 180-4), and the timer and timing globals a page has, made deterministic: setTimeout and
// clearTimeout (callbacks run as microtasks in the order set; delays are ignored), queueMicrotask, performance.now (a
// counter) and structuredClone (for plain data, through JSON). String evaluation (eval, new Function, a string given
// to setTimeout) is refused inside it. The functions it returns take their arguments as primitives or as JSON copies
// parsed inside the context. vm is not a security boundary: this keeps Node's process object and module loader out of
// the sibling code's scope, and a checkout is still only as trusted as running its code makes it. The checkouts are
// read, never written.
//
// A pin's --check has two parts:
//   reproduction   each v1 file is rebuilt from the pinned source content (found by SHA-256) with its recorded
//                  provenance, and must match byte for byte. A source that cannot be found (missing checkout, shallow
//                  clone) makes the result "skipped" (exit 2), never a pass.
//   live contract  the current checkout's functions run on the v1 fixture inputs; the results must equal v1's. Where a
//                  pin has a differential set (make_bridges_v1, make_biomesh_compat_v1), the pinned code and the
//                  current code must also give the same verdicts on it; without the pinned content there is no oracle
//                  and that part is skipped (exit 2). A changed body prints "NOTE body changed, behaviour identical:
//                  <names>" when the differential set agreed too, else "NOTE body changed; same results on the v1
//                  inputs: <names>"; a changed file or commit prints "NOTE provenance".
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { execFileSync } = require('child_process');

const sha256 = s => crypto.createHash('sha256').update(typeof s === 'string' ? Buffer.from(s, 'utf8') : s).digest('hex');
const line = (src, start) => { const i = src.indexOf(start); if (i < 0) throw new Error(`${start} not found`); return src.slice(i, src.indexOf('\n', i)).trim(); };
const SYNC = ['M64', 'fold64', 'qmul', 'qconj', 'qn', 'crystalQuat', 'quatHex', 'PAR_MASK', 'popcountEven', 'crystallize', 'unpackPacket', 'packWord',
    'mulberry32', 'engramCharGrid', 'engramGrid', 'engramGridHex', 'engramJ', 'tokenizeEngrams', 'engramStreamFromText',
    'frameStream', 'parseBiochainStream', 'BW', 'BR', 'cands', 'upd', 'encodeChunk', 'decodeChunk', 'chainFrames', 'recreateChunks', 'recreateText', 'parseCodexStream'];
// the grower's constants: biomesh.js declares the last two in one statement (const CHUNK = 720, SEGMENTS = 7;)
const CONST_NAMES = ['MAX_GROW_BYTES', 'STREAM_VERSION', 'CHUNK', 'SEGMENTS'];
const OWL_GROWER = ['scripts/biomesh-core.js', 'scripts/biomesh.js'];
const BIOCHAIN_GROWER = ['src/biomesh/biomesh-core.js', 'src/biomesh/biomesh.js'];

// ------------------------------------------------------------------ declarations by name
// Brackets are matched outside comments, strings, template literals (their ${...} parts are code) and regular
// expressions (a / where an expression may start).
const REGEX_AFTER = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);
function regexMayStart(src, i) {
    let j = i - 1;
    while (j >= 0 && /\s/.test(src[j])) j--;
    if (j < 0 || '(,=:[!&|?{};+-*%<>~^'.includes(src[j])) return true;
    if (!/[\w$]/.test(src[j])) return false;
    let k = j;
    while (k >= 0 && /[\w$]/.test(src[k])) k--;
    return REGEX_AFTER.has(src.slice(k + 1, j + 1));
}
// the index just past the comment, string, template literal or regular expression that starts at i (i when none does)
function skipNonCode(src, i) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i); return e < 0 ? src.length : e; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); return e < 0 ? src.length : e + 2; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1; return j + 1; }
    if (c === '`') {
        let j = i + 1;
        while (j < src.length && src[j] !== '`') { if (src[j] === '\\') j += 2; else if (src[j] === '$' && src[j + 1] === '{') j = closeOf(src, j + 1) + 1; else j++; }
        return j + 1;
    }
    if (c === '/' && regexMayStart(src, i)) {
        let j = i + 1, inClass = false;
        while (j < src.length && src[j] !== '\n') {
            if (src[j] === '\\') { j += 2; continue; }
            if (src[j] === '[') inClass = true; else if (src[j] === ']') inClass = false; else if (src[j] === '/' && !inClass) break;
            j++;
        }
        return j + 1;
    }
    return i;
}
// the index of the bracket that closes the one at `open` ((, [ or {)
function closeOf(src, open) {
    let depth = 0;
    for (let i = open; i < src.length;) {
        const j = skipNonCode(src, i);
        if (j !== i) { i = j; continue; }
        const c = src[i];
        if (c === '(' || c === '[' || c === '{') depth++;
        else if ((c === ')' || c === ']' || c === '}') && --depth === 0) return i;
        i++;
    }
    return src.length - 1;
}
// the index of the first `ch` at bracket depth 0 from i (before stop), outside non-code; -1 when there is none
function findAtDepth0(src, i, ch, stop = src.length) {
    let depth = 0;
    while (i < stop) {
        const j = skipNonCode(src, i);
        if (j !== i) { i = j; continue; }
        const c = src[i];
        if (c === ch && depth === 0) return i;
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') depth--;
        i++;
    }
    return -1;
}
const esc = n => n.replace(/[$]/g, '\\$');
// the matches of re (whose group 1 is the indentation) with the least indentation, the first of them
function leastIndented(re, src) {
    let best = null;
    for (const m of src.matchAll(re)) if (!best || m[1].length < best[1].length) best = m;
    return best;
}
function grab(src, name) {
    const m = leastIndented(new RegExp(`^([ \\t]*)(?:export )?((?:async )?function ${esc(name)}\\(|class ${esc(name)} |const ${esc(name)} = )`, 'gm'), src);
    if (!m) throw new Error(`${name} not found`);
    const start = m.index + m[0].length - m[2].length;
    if (m[2].startsWith('const')) {
        const end = findAtDepth0(src, start, ';');
        if (end < 0) throw new Error(`${name}: no end of statement`);
        return src.slice(start, end + 1);
    }
    let i = start;
    if (m[2].includes('function')) i = closeOf(src, src.indexOf('(', start)) + 1;
    for (let j; i < src.length && src[i] !== '{'; i = j === i ? i + 1 : j) j = skipNonCode(src, i);
    return src.slice(start, closeOf(src, i) + 1);
}
function constStatement(src, name) {
    let best = null;
    for (const m of src.matchAll(/^([ \t]*)(export )?((?:const|let|var)\s)/gm)) {
        if (best && m[1].length >= best.indent) continue;
        const declStart = m.index + m[1].length + (m[2] ? m[2].length : 0), listStart = declStart + m[3].length;
        const end = findAtDepth0(src, listStart, ';');
        if (end < 0) continue;
        const names = [];
        for (let i = listStart; i < end;) {                 // the declarators, split at depth-0 commas
            const comma = findAtDepth0(src, i, ',', end);
            const id = /^\s*([A-Za-z_$][\w$]*)/.exec(src.slice(i, comma < 0 ? end : comma));
            if (id) names.push(id[1]);
            i = comma < 0 ? end : comma + 1;
        }
        if (names.includes(name)) { const eol = src.indexOf('\n', end); best = { indent: m[1].length, text: src.slice(declStart, eol < 0 ? src.length : eol).trim() }; }
    }
    if (!best) throw new Error(`${name} not found`);
    return best.text;
}
const piece = (src, name) => (CONST_NAMES.includes(name) ? constStatement(src, name) : grab(src, name));
const has = (src, name) => { try { piece(src, name); return true; } catch (e) { return false; } };

// ------------------------------------------------------------------ sources by content
const git = (root, args) => execFileSync('git', ['-C', root, ...args], { maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
function findSource(root, file, want, hints = []) {
    const p = path.join(root, file);
    if (fs.existsSync(p)) { const b = fs.readFileSync(p); if (sha256(b) === want) return { src: b.toString('utf8'), where: 'working tree' }; }
    const at = c => { try { const b = git(root, ['show', `${c}:${file}`]); return sha256(b) === want ? { src: b.toString('utf8'), where: `git ${c.slice(0, 7)}` } : null; } catch (e) { return null; } };
    for (const c of hints.filter(Boolean)) { const hit = at(c); if (hit) return hit; }
    let commits = [];
    try { commits = git(root, ['log', '--all', '--format=%H', '--', file]).toString().split('\n').filter(Boolean); } catch (e) { return null; }
    for (const c of commits) { const hit = at(c); if (hit) return hit; }
    return null;
}
function locate(root, candidates, names = [], lines = []) {
    const files = candidates.filter(f => fs.existsSync(path.join(root, f))).map(file => ({ file, src: fs.readFileSync(path.join(root, file), 'utf8') }));
    const defines = src => names.every(n => has(src, n)) && lines.every(l => src.includes(l));
    // a name in more than one candidate: the module the pages import (biomesh.js, after `export * from` the core) would
    // run its own copy, so the copies must be the same text
    const conflicts = [], shared = [];
    if (files.length > 1) {
        for (const n of names) {
            const texts = files.map(f => { try { return piece(f.src, n); } catch (e) { return null; } });
            const where = files.filter((f, i) => texts[i] !== null).map(f => f.file);
            if (where.length > 1) (new Set(texts.filter(t => t !== null)).size > 1 ? conflicts : shared).push({ name: n, files: where });
        }
    }
    const result = (file, src) => ({ file, src, sha256: sha256(src), conflicts, shared });
    for (const f of files) if (defines(f.src)) return result(f.file, f.src);
    // spread over the candidates (a partial move into a core module): piece and line take each name from the first file
    if (files.length > 1) {
        const src = files.map(f => f.src).join('\n');
        if (defines(src)) return result(files.map(f => f.file).join(' + '), src);
    }
    return null;
}
// "quatHex (scripts/biomesh-core.js, scripts/biomesh.js)" for a list of { name, files }
const byFiles = list => { const g = new Map(); for (const c of list) { const k = c.files.join(', '); g.set(k, [...(g.get(k) || []), c.name]); } return [...g].map(([k, n]) => `${n.join(', ')} (${k})`).join('; '); };
const functionHashes = (src, names) => Object.fromEntries(names.map(n => { try { return [n, sha256(piece(src, n))]; } catch (e) { return [n, null]; } }));
function lastCommit(root, files) {
    try { return git(root, ['log', '-1', '--format=%H', '--', ...files]).toString().trim() || null; } catch (e) { return null; }
}
function headCommit(root) {
    try { return git(root, ['rev-parse', 'HEAD']).toString().trim(); } catch (e) { return null; }
}

// ------------------------------------------------------------------ the sandbox
const PRELUDE = `(function (g) {
    'use strict';
    function utf8Encode(s) {                          // a USVString's UTF-8 (lone surrogates become U+FFFD)
        s = String(s);
        const out = [];
        for (let i = 0; i < s.length; i++) {
            let c = s.charCodeAt(i);
            if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length && s.charCodeAt(i + 1) >= 0xDC00 && s.charCodeAt(i + 1) <= 0xDFFF) { c = 0x10000 + ((c - 0xD800) << 10) + (s.charCodeAt(i + 1) - 0xDC00); i++; }
            else if (c >= 0xD800 && c <= 0xDFFF) c = 0xFFFD;
            if (c < 0x80) out.push(c);
            else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
            else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
            else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
        }
        return out;
    }
    function utf8Decode(bytes, fatal, keepBOM) {      // the Encoding Standard's UTF-8 decoder: replacement or fatal mode; its BOM
        const units = [];                             // removed unless ignoreBOM
        let cp = 0, seen = 0, need = 0, lo = 0x80, hi = 0xBF;
        const emit = c => { if (c < 0x10000) units.push(c); else { c -= 0x10000; units.push(0xD800 + (c >> 10), 0xDC00 + (c & 1023)); } };
        const bad = () => { if (fatal) throw new TypeError('The encoded data was not valid for encoding utf-8'); emit(0xFFFD); };
        for (let i = 0; i < bytes.length; i++) {
            const b = bytes[i];
            if (need === 0) {
                if (b <= 0x7F) emit(b);
                else if (b >= 0xC2 && b <= 0xDF) { need = 1; cp = b & 0x1F; }
                else if (b >= 0xE0 && b <= 0xEF) { if (b === 0xE0) lo = 0xA0; if (b === 0xED) hi = 0x9F; need = 2; cp = b & 0xF; }
                else if (b >= 0xF0 && b <= 0xF4) { if (b === 0xF0) lo = 0x90; if (b === 0xF4) hi = 0x8F; need = 3; cp = b & 7; }
                else bad();
                continue;
            }
            if (b < lo || b > hi) { cp = need = seen = 0; lo = 0x80; hi = 0xBF; bad(); i--; continue; }
            lo = 0x80; hi = 0xBF; cp = (cp << 6) | (b & 0x3F);
            if (++seen === need) { emit(cp); cp = need = seen = 0; }
        }
        if (need) bad();
        let s = '';
        for (let k = !keepBOM && units[0] === 0xFEFF ? 1 : 0; k < units.length; k += 8192) s += String.fromCharCode.apply(null, units.slice(k, k + 8192));
        return s;
    }
    class TextEncoder { get encoding() { return 'utf-8'; } encode(s = '') { return Uint8Array.from(utf8Encode(s)); } }
    const FATAL = new WeakMap(), KEEP_BOM = new WeakMap();
    class TextDecoder {                               // utf-8 only, with the fatal and ignoreBOM options
        constructor(label = 'utf-8', options = {}) {
            if (!['utf-8', 'utf8', 'unicode-1-1-utf-8'].includes(String(label).trim().toLowerCase())) throw new RangeError('this sandbox decodes utf-8 only');
            FATAL.set(this, !!(options && options.fatal)); KEEP_BOM.set(this, !!(options && options.ignoreBOM));
        }
        get encoding() { return 'utf-8'; }
        get fatal() { return FATAL.get(this); }
        get ignoreBOM() { return KEEP_BOM.get(this); }
        decode(v) { return utf8Decode(v === undefined ? [] : v instanceof ArrayBuffer ? new Uint8Array(v) : new Uint8Array(v.buffer, v.byteOffset, v.byteLength), FATAL.get(this), KEEP_BOM.get(this)); }
    }
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
        0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
        0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
        0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    function sha256Hex(str) {                         // FIPS 180-4 SHA-256 of a string's UTF-8, as lowercase hex
        const m = utf8Encode(str), l = m.length, n = ((l + 9 + 63) >> 6) << 6, b = new Uint8Array(n);
        b.set(m); b[l] = 0x80;
        const dv = new DataView(b.buffer);
        dv.setUint32(n - 4, (l * 8) >>> 0); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
        const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64);
        const r = (x, k) => (x >>> k) | (x << (32 - k));
        for (let o = 0; o < n; o += 64) {
            for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + 4 * i);
            for (let i = 16; i < 64; i++) { const x = w[i - 15], y = w[i - 2]; w[i] = (w[i - 16] + (r(x, 7) ^ r(x, 18) ^ (x >>> 3)) + w[i - 7] + (r(y, 17) ^ r(y, 19) ^ (y >>> 10))) >>> 0; }
            let [a, bb, c, d, e, f, gg, h] = H;
            for (let i = 0; i < 64; i++) {
                const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & gg)) + K[i] + w[i]) >>> 0;
                const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0;
                h = gg; gg = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
            }
            H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + bb) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
            H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + gg) >>> 0; H[7] = (H[7] + h) >>> 0;
        }
        return H.map(x => x.toString(16).padStart(8, '0')).join('');
    }
    // the timer and timing globals a page has, deterministic: callbacks run as microtasks in the order they were set
    // (delays are ignored), performance.now counts calls, structuredClone copies plain data
    const fn = (f, what) => { if (typeof f !== 'function') throw new TypeError(what + ' needs a function'); return f; };
    const pending = new Set();
    let timerId = 0, clock = 0;
    function setTimeout(f, ms, ...args) { fn(f, 'setTimeout'); const id = ++timerId; pending.add(id); Promise.resolve().then(() => { if (pending.delete(id)) f(...args); }); return id; }
    function clearTimeout(id) { pending.delete(id); }
    function queueMicrotask(f) { fn(f, 'queueMicrotask'); Promise.resolve().then(() => f()); }
    const performance = { now: () => ++clock, timeOrigin: 0 };
    const structuredClone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
    const globals = { TextEncoder, TextDecoder, setTimeout, clearTimeout, queueMicrotask, performance, structuredClone };
    for (const k of Object.keys(globals)) Object.defineProperty(g, k, { value: globals[k], writable: true, configurable: true });
    Object.defineProperty(g, '__sandboxSha256Hex', { value: sha256Hex });
})(globalThis);`;
const HASH_NS = '({ sha256Hex: async str => __sandboxSha256Hex(str) })';
// what a grower may call its hash: SC.sha256Hex (Owl), CC.sha256Hex (BioChain-AI) or an imported sha256Hex (a core module)
const HASH_PARAMS = ['SC', 'CC', 'sha256Hex'], HASH_INJECT = [HASH_NS, HASH_NS, 'async str => __sandboxSha256Hex(str)'];
// The built-ins, bound as locals of an outer function: the same objects, but a global lookup inside a vm context is
// several times slower than a local one, and Owl's engram layer makes millions of them.
const BUILTINS = 'Math, BigInt, String, Number, Boolean, Array, Object, Map, Set, WeakMap, Symbol, JSON, Promise, RegExp, Error, RangeError, TypeError, ' +
    'Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array, DataView, ArrayBuffer, ' +
    'TextEncoder, TextDecoder, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent';

function sandbox() {
    const ctx = vm.createContext(Object.create(null), { name: 'sibling code', codeGeneration: { strings: false, wasm: false } });
    vm.runInContext(PRELUDE, ctx);
    const parse = vm.runInContext('JSON.parse', ctx);
    const adopt = v => {
        if (v === null || (typeof v !== 'object' && typeof v !== 'function')) return v;
        if (typeof v === 'function') throw new TypeError('a function cannot be passed into the sandbox');
        return parse(JSON.stringify(v));
    };
    const wrap = api => {
        if (api === null || typeof api !== 'object') return api;
        const out = {};
        for (const k of Object.keys(api)) out[k] = typeof api[k] === 'function' ? (...a) => api[k](...a.map(adopt)) : api[k];
        return out;
    };
    return {
        adopt, wrap,
        // compile(params, body, inject): `function (params) { body }`, made inside the context; calling the result runs
        // it there with inject (source text evaluated inside the context, one per parameter) and returns its value,
        // with any functions in it wrapped so that their arguments are copied in
        compile(params, body, inject = []) {
            const make = vm.runInContext(`(function (${BUILTINS}) { return function () { return (function (${params.join(', ')}) {\n${body}\n})(${inject.join(', ')}); }; })(${BUILTINS})`, ctx);
            return () => wrap(make());
        },
        run: code => vm.runInContext(code, ctx),
    };
}

// ------------------------------------------------------------------ the helpers a body taken by name needs
// Upstream may move part of a named function into a top-level helper: Owl's O3 builds each letter's engram grid once,
// so engramGrid now calls letterGrid, which reads LETTER_GRIDS. withHelpers(src, body, provided) returns body followed
// by the top-level declarations of src (at column 0, as in a module) that body uses and does not declare, and those
// that they use in turn, each once, in source order. A body that already declares everything it uses is returned
// unchanged, so a v1 artefact rebuilt from its pinned source stays byte for byte the same. provided: names the caller
// supplies (a sandbox's parameters), never taken from src. Identifiers are read outside comments, strings and regular
// expressions (template literals' ${...} parts are code); a name after "." is a property, not a use (after "..." it is).
function identifiersIn(text) {
    const ids = new Set();
    const scan = s => {
        for (let i = 0; i < s.length;) {
            const c = s[i];
            if (c === '`') {
                let j = i + 1;
                while (j < s.length && s[j] !== '`') {
                    if (s[j] === '\\') j += 2;
                    else if (s[j] === '$' && s[j + 1] === '{') { const e = closeOf(s, j + 1); scan(s.slice(j + 2, e)); j = e + 1; }
                    else j++;
                }
                i = j + 1;
                continue;
            }
            const j = skipNonCode(s, i);
            if (j !== i) { i = j; continue; }
            if (/[0-9]/.test(c)) { while (i < s.length && /[\w.]/.test(s[i])) i++; continue; }
            if (/[A-Za-z_$]/.test(c)) {
                let k = i;
                while (k < s.length && /[\w$]/.test(s[k])) k++;
                let p = i - 1;
                while (p >= 0 && /\s/.test(s[p])) p--;
                if (s[p] !== '.' || s.slice(p - 2, p + 1) === '...') ids.add(s.slice(i, k));   // a property, unless spread
                i = k;
                continue;
            }
            i++;
        }
    };
    scan(text);
    return ids;
}
// the declarations at column 0: [{ names, at, text }], in source order (a const statement may declare several names)
function topLevelDeclarations(src) {
    const out = [];
    for (const m of src.matchAll(/^(export )?(?:(?:async )?function ([A-Za-z_$][\w$]*)\(|class ([A-Za-z_$][\w$]*) |(const|let|var)\s)/gm)) {
        const at = m.index + (m[1] ? m[1].length : 0);
        if (m[2] || m[3]) {
            const name = m[2] || m[3];
            let text;
            try { text = grab(src.slice(at), name); } catch (e) { continue; }
            out.push({ names: [name], at, text });
            continue;
        }
        const listStart = at + m[4].length + 1, end = findAtDepth0(src, listStart, ';');
        if (end < 0) continue;
        const names = [];
        for (let i = listStart; i < end;) {
            const comma = findAtDepth0(src, i, ',', end);
            const id = /^\s*([A-Za-z_$][\w$]*)/.exec(src.slice(i, comma < 0 ? end : comma));
            if (id) names.push(id[1]);
            i = comma < 0 ? end : comma + 1;
        }
        if (names.length) out.push({ names, at, text: src.slice(at, end + 1) });
    }
    return out;
}
function withHelpers(src, body, provided = []) {
    const decls = topLevelDeclarations(src), byName = new Map();
    for (const d of decls) for (const n of d.names) if (!byName.has(n)) byName.set(n, d);
    const have = new Set([...topLevelDeclarations(body).flatMap(d => d.names), ...provided]);
    const added = new Set(), todo = [...identifiersIn(body)];
    while (todo.length) {
        const id = todo.pop();
        if (have.has(id) || !byName.has(id)) continue;
        const d = byName.get(id);
        if (added.has(d)) continue;
        added.add(d);
        for (const n of d.names) have.add(n);
        todo.push(...identifiersIn(d.text));
    }
    if (!added.size) return body;
    return body + '\n' + [...added].sort((a, b) => a.at - b.at).map(d => d.text).join('\n');
}

// growBiochain and verifyIntegrity of a biomesh source, with SYNC and CONST_NAMES (each statement once), in a sandbox
function syncBody(src) {
    const consts = [...new Set(CONST_NAMES.map(n => constStatement(src, n)))];
    return withHelpers(src, consts.concat(SYNC.map(n => grab(src, n))).join('\n'));
}
function growerFromSource(src, sb = sandbox()) {
    const body = withHelpers(src, syncBody(src) + '\n' + grab(src, 'growBiochain') + '\n' + grab(src, 'verifyIntegrity'), HASH_PARAMS);
    return sb.compile(HASH_PARAMS, body + '\nreturn { growBiochain, verifyIntegrity, MAX_GROW_BYTES };', HASH_INJECT)();
}
const GROWER_NAMES = [...CONST_NAMES, ...SYNC, 'growBiochain', 'verifyIntegrity'];
function loadGrower(root, candidates = OWL_GROWER, sb = sandbox()) {
    const hit = locate(root, candidates, GROWER_NAMES);
    if (hit && hit.conflicts.length) throw new Error(`defined differently in more than one file: ${byFiles(hit.conflicts)}`);
    return hit ? { file: hit.file, sha256: hit.sha256, src: hit.src, ...growerFromSource(hit.src, sb) } : null;
}

// ------------------------------------------------------------------ the differential set
// v1's fixtures hold few records a verifier must reject (make_bridges_v1: two; make_biomesh_compat_v1: none), so
// a verifier that stopped comparing the Merkle root or the weave would still give v1's results. tamperSet derives
// records from one valid record, each with one thing altered; differential runs two growers (the pinned code and the
// current code) on them and on the grow cap, and pairs their outcomes: { label, want (pinned), got (current) }.
function framesOf(stream) {                       // [{ packet, len, residual }] of a valid shdccp/2 stream
    const out = [];
    for (let p = 0; p + 24 <= stream.length;) {
        const packet = stream.slice(p, p + 16), n = parseInt(stream.slice(p + 16, p + 24), 16);
        out.push({ packet, len: Number((BigInt('0x' + packet) >> 8n) & 0xFFFFn), residual: stream.slice(p + 24, p + 24 + 2 * n) });
        p += 24 + 2 * n;
    }
    return out;
}
function tamperSet(rec) {
    const flip = (s, k) => s.slice(0, k) + (s[k] === '0' ? '1' : '0') + s.slice(k + 1);       // one digit changed
    const set = [], add = (label, edit) => { const r = JSON.parse(JSON.stringify(rec)); edit(r); set.push({ label, record: r }); };
    const frames = framesOf(rec.stream), k = Math.min(1, frames.length - 1);
    const at = i => frames.slice(0, i).reduce((n, f) => n + 24 + f.residual.length, 0);    // where frame i starts
    add('as grown', () => {});
    add('merkleRoot altered', r => { r.merkleRoot = flip(r.merkleRoot, r.merkleRoot.length - 1); });
    add('weaveChiral altered', r => { r.weaveChiral = flip(r.weaveChiral, r.weaveChiral.length - 1); });
    add('a leaf hash altered', r => { r.leafHashes[r.leafHashes.length - 1] = flip(r.leafHashes[r.leafHashes.length - 1], 0); });
    add('leafHashes absent', r => { delete r.leafHashes; });
    add(`packet ${k}'s parity bit flipped`, r => { const p = at(k) + 1; r.stream = r.stream.slice(0, p) + (parseInt(r.stream[p], 16) ^ 8).toString(16).toUpperCase() + r.stream.slice(p + 1); });
    add(`a residual digit of frame ${k} altered`, r => { r.stream = flip(r.stream, at(k) + 24); });
    add('the last frame truncated', r => { r.stream = r.stream.slice(0, -6); });
    add('a frame length not hexadecimal', r => { r.stream = r.stream.slice(0, 16) + 'zzzzzzzz' + r.stream.slice(24); });
    if (typeof rec.engramStream === 'string') add('engramStream altered', r => { r.engramStream = flip(r.engramStream, 20); });
    add('chainId altered', r => { r.chainId = flip(r.chainId, r.chainId.length - 1); });
    add('no stream', r => { delete r.stream; });
    add('legacy streams and chunkLens', r => { delete r.stream; r.streams = frames.map(f => f.residual); r.chunkLens = frames.map(f => f.len); });
    add('legacy streams and chunkLens, a residual altered', r => { delete r.stream; r.streams = frames.map(f => f.residual); r.chunkLens = frames.map(f => f.len); r.streams[k] = flip(r.streams[k], 0); });
    return set;
}
async function verdict(g, rec) {                  // { ok, reason: the first reason }, or { threw }
    try { const v = await g.verifyIntegrity(rec); return { ok: v.ok, reason: v.reasons[0] }; } catch (e) { return { threw: String(e && e.message) }; }
}
async function growOutcome(g, text) {             // engrams off: the cap is checked before any work
    try { const r = await g.growBiochain(text, { engrams: false }); return { chainId: r.chainId, origBytes: r.origBytes }; } catch (e) { return { threw: String(e && e.message) }; }
}
async function differential(pinned, live, rec) {
    const rows = [];
    for (const t of tamperSet(rec)) rows.push({ label: t.label, want: await verdict(pinned, t.record), got: await verdict(live, t.record) });
    const cap = pinned.MAX_GROW_BYTES;
    for (const [label, n] of [[`${cap} bytes (the grow cap)`, cap], [`${cap + 1} bytes (one over the cap)`, cap + 1]]) {
        const text = 'abcdefghijklmnopqrstuvwxyz '.repeat(Math.ceil(n / 27)).slice(0, n);
        rows.push({ label: `grow ${label}`, want: await growOutcome(pinned, text), got: await growOutcome(live, text) });
    }
    return rows;
}

// owl_eye.cjs's recipe (its loadOwlEye) on a given Engram_Mind_Eye.html source, in a sandbox
function loadOwlEye(EYE, sb = sandbox()) {
    const a = EYE.indexOf('/* =====================================================================\n   TTMPT ENGRAM CORE');
    const b = EYE.indexOf('/* =====================================================================\n   RENDERING');
    if (a < 0 || b < 0 || b < a) throw new Error('markers not found in Engram_Mind_Eye.html');
    const introM = /const STRIX_INTRO =\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+);/.exec(EYE);
    if (!introM) throw new Error('STRIX_INTRO not found');
    const saveBody = grab(EYE, 'saveEngram'), stateStmt = saveBody.slice(saveBody.indexOf('const state = '), saveBody.indexOf('localStorage.setItem'));
    const greetStmt = (() => { const i = EYE.indexOf('const resumeGreeting = '); return EYE.slice(i, EYE.indexOf(';', EYE.indexOf('We continue.', i)) + 1); })();
    const body = `
        const window = { MANIFOLD_TOKEN: 'D8K3T2' };
        let manifoldN = 8, manifoldK = 3, manifoldT = 2;
        const setEngramManifold = (n, k, t) => { manifoldN = n; manifoldK = k; manifoldT = t; window.MANIFOLD_TOKEN = 'D' + n + 'K' + k + 'T' + t; };
        const addMessage = () => ({}), escapeHtml = s => s;
        ${EYE.slice(a, b)}
        const STRIX_INTRO = ${introM[1]};
        function stateJson() { ${stateStmt} return JSON.stringify(state); }
        ${grab(EYE, 'restoreEngram')}
        function greeting(saved) {
            const epochCount = (saved.biochain || []).length, packetCount = (saved.packets || []).length;
            const lastNode = (saved.biochain || []).slice(-1)[0], lastTheme = lastNode ? lastNode.theme : null;
            ${greetStmt}
            return resumeGreeting;
        }
        function say(text) {                          // transmit() without the page: the human turn, then STRIX's reply
            conversationLog.push({ role: 'human', text }); logTokens(text, 'human');
            const r = selectResponse(text); conversationLog.push({ role: 'strix', text: r.response }); logTokens(r.response, 'strix');
            return r;
        }
        function intro() { logTokens(STRIX_INTRO, 'strix'); conversationLog.push({ role: 'strix', text: STRIX_INTRO }); }
        return { intro, say, stateJson, restoreEngram, greeting, logTokens, packetChain, parity: () => codexParity, hex32, conversation: () => conversationLog };`;
    return { intro: sb.run(`(${introM[1]})`), owl: sb.compile([], body) };
}

// ------------------------------------------------------------------ the verdict of a --check
// r.repro(label, ok, detail): a reproduction line (ok: true, false, or null for skipped)
// r.live(label, ok, detail): a live-contract line; r.note(text): a NOTE line; r.exit(): 0, 1 or 2
class Report {
    constructor(name, pin = 'v1') { this.name = name; this.pin = pin; this.lines = []; this.failed = 0; this.skipped = 0; }
    repro(label, ok, detail = '') { this.add('reproduction', label, ok, detail); }
    live(label, ok, detail = '') { this.add('live', label, ok, detail); }
    add(part, label, ok, detail) {
        if (ok === false) this.failed++;
        if (ok === null) this.skipped++;
        this.lines.push(`${ok === null ? 'skip' : ok ? 'ok  ' : 'FAIL'}  ${part.padEnd(12)} ${label}${detail ? `  (${detail})` : ''}`);
    }
    note(text) { this.lines.push(`NOTE ${text}`); }
    // provenance: what the current checkout holds against what v1 recorded
    provenance(file, pinned, current, where) {
        if (current === null) this.note(`provenance: ${file} is not in the checkout (pinned ${pinned.slice(0, 12)}…${where ? `, found at ${where}` : ''})`);
        else if (current !== pinned) this.note(`provenance: ${file} is now ${current.slice(0, 12)}…, pinned ${pinned.slice(0, 12)}…${where ? ` (pinned content found at ${where})` : ' (pinned content not found)'}`);
    }
    // sameResults: the live contract held; differential: true when the differential set agreed too (null: none ran)
    bodies(changed, sameResults, differential = null) {
        if (!changed.length) return;
        if (sameResults && differential === true) this.note(`body changed, behaviour identical: ${changed.join(', ')}`);
        else if (sameResults && differential === null) this.note(`body changed; same results on the ${this.pin} inputs: ${changed.join(', ')}`);
        else this.note(`body changed: ${changed.join(', ')}`);
    }
    exit() {
        const code = this.failed ? 1 : this.skipped ? 2 : 0;
        for (const l of this.lines) console.log(l);
        console.log(`${this.name}: ${code === 0 ? `${this.pin} reproduces and the live contract holds` : code === 1 ? 'FAILED' : 'skipped (a pinned source or checkout is missing); nothing failed'}`);
        process.exit(code);
    }
}
// changed names between two sources (both present): [names whose text differs or that one side lacks]
function changedBodies(pinnedSrc, currentSrc, names) {
    const a = functionHashes(pinnedSrc, names), b = functionHashes(currentSrc, names);
    return names.filter(n => a[n] !== b[n]);
}
// v1 files are frozen (D4): write only when absent; if present and different, refuse
function writeFrozen(file, text) {
    if (fs.existsSync(file)) {
        if (fs.readFileSync(file, 'utf8') === text) return 'unchanged';
        console.error(`refusing to overwrite ${path.basename(file)}: v1 pins are frozen; a new pin is a v2 file beside it. Use --check.`);
        process.exit(1);
    }
    fs.writeFileSync(file, text);
    return 'written';
}
// a copy of an object without the given top-level keys (a pin's provenance); nested keys of the same name are data
const stripKeys = (v, keys) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([k]) => !keys.includes(k))) : v);

// The sidecar (../../biochain_v1.provenance.json): the commit that wrote each pinned source, a hint for findSource
const SIDECAR = path.join(__dirname, '..', '..', 'biochain_v1.provenance.json');
const provenance = () => JSON.parse(fs.readFileSync(SIDECAR, 'utf8'));
function hints(repo, file) { const s = provenance().sources[`${repo}:${file}`]; return s ? [s.commit] : []; }

// A pin's --check, the same for every pin script.
//   spec.name        what is checked (printed)
//   spec.repo        { name, root }: the sibling checkout (missing: exit 2); spec.repos for several
//   spec.sources     [{ file, sha256, repo?, candidates?, names?, lines?, liveOptional? }]: the pinned files, by recorded
//                    SHA-256, in spec.repo or in the named one of spec.repos; for the live contract the first of
//                    `candidates` (default [file]) that defines every name and line is used. A liveOptional source is
//                    needed for the reproduction only (a copied data file): missing from the checkout, it is a NOTE
//   spec.pin         optional: what the outputs are called in the summary line (default 'v1')
//   spec.outputs     [{ label, path }]: the v1 files, in the order build returns their texts
//   spec.build       async (S, mode) => [texts]: S maps each source file to its text; mode is 'reproduction' (use the
//                    provenance recorded in v1) or 'live'
//   spec.behaviour   (texts) => value: what the live contract compares (v1's texts against the live build's), e.g. a
//                    fixture without its provenance fields
//   spec.bodies      [{ file, names, pinned: () => src }]: names whose text is compared between the pinned source and
//                    the current text of that source file, for the NOTE lines (pinned() may read a v1 file that holds
//                    the bodies verbatim)
//   spec.differential optional async (pinnedS, liveS) => [{ label, want, got }]: the same inputs through the pinned
//                    code and the current code (differential above); every got must equal its want. Without the pinned
//                    content there is no oracle and this part is skipped
//   spec.liveSkip    optional (pinnedS, liveS) => reason: when the live contract needs no rebuild (identical bodies)
//   spec.commitNotes optional () => [text]: recorded commits that differ from the checkout's (NOTE provenance lines)
async function checkPin(spec) {
    const r = new Report(spec.name, spec.pin), repos = spec.repos || [spec.repo];
    for (const rp of repos) if (!fs.existsSync(rp.root)) { console.log(`skipped: no ${rp.name} checkout at ${rp.root}`); process.exit(2); }
    const repoOf = s => (s.repo ? repos.find(rp => rp.name === s.repo) : repos[0]);
    const found = spec.sources.map(s => ({ s, hit: findSource(repoOf(s).root, s.file, s.sha256, hints(repoOf(s).name, s.file)) }));
    const v1 = spec.outputs.map(o => (fs.existsSync(o.path) ? fs.readFileSync(o.path, 'utf8') : null));
    let pinnedS = null;
    if (found.every(f => f.hit)) {
        pinnedS = Object.fromEntries(found.map(f => [f.s.file, f.hit.src]));
        const texts = await spec.build(pinnedS, 'reproduction');
        const why = (a, b) => { try { return `DIFFERS: ${firstDifference(JSON.parse(a), JSON.parse(b))}`; } catch (e) { return 'DIFFERS'; } };
        spec.outputs.forEach((o, i) => r.repro(o.label, v1[i] !== null && texts[i] === v1[i], v1[i] === null ? `the ${r.pin} file is missing` : texts[i] === v1[i] ? `byte for byte, from ${[...new Set(found.map(f => f.hit.where))].join(', ')}` : why(v1[i], texts[i])));
    } else {
        for (const f of found.filter(x => !x.hit)) r.repro(`${f.s.file} ${f.s.sha256.slice(0, 12)}…`, null, 'the pinned content is not in the checkout or its git history (missing file or shallow clone)');
    }
    // the live contract: the current checkout's code on v1's inputs
    const liveS = {};
    let missing = false;
    for (const s of spec.sources) {
        const hit = locate(repoOf(s).root, s.candidates || [s.file], s.names || [], s.lines || []);
        if (!hit && s.liveOptional) { r.note(`provenance: ${s.file} is not in the checkout (pinned ${s.sha256.slice(0, 12)}…; the live contract does not use it)`); continue; }
        if (!hit) { missing = true; r.live(s.file, false, `no ${(s.candidates || [s.file]).join(' or ')} in the checkout defines ${(s.names || []).length} names it needs`); continue; }
        if (hit.conflicts.length) { missing = true; r.live(s.file, false, `defined differently in more than one file, so the pages may run code the pin does not: ${byFiles(hit.conflicts)}`); continue; }
        if (hit.shared.length) r.note(`defined in more than one file, with the same text: ${byFiles(hit.shared)}`);
        liveS[s.file] = hit.src;
        const f = found.find(x => x.s === s);
        r.provenance(hit.file === s.file ? s.file : `${s.file} (now ${hit.file})`, s.sha256, hit.sha256, f.hit && f.hit.where !== 'working tree' ? f.hit.where : null);
    }
    if (!missing) {
        const same = spec.sources.every(s => typeof liveS[s.file] === 'string' && sha256(liveS[s.file]) === s.sha256);
        const skip = !same && pinnedS && spec.liveSkip ? spec.liveSkip(pinnedS, liveS) : null;
        let ok = true, deep = null;          // deep: the differential set agreed (true), disagreed (false) or did not run (null)
        if (same) { r.live('the checkout holds the pinned sources', true, 'the reproduction above is the live run'); deep = spec.differential ? true : null; }
        else if (skip) { r.live('bodies identical to the pinned source', true, skip); deep = spec.differential ? true : null; }
        else {
            const want = spec.behaviour(v1), got = spec.behaviour(await spec.build(liveS, 'live'));
            ok = JSON.stringify(want) === JSON.stringify(got);
            r.live(`the current code on the ${r.pin} inputs`, ok, ok ? `records and verdicts equal ${r.pin}` : `differs from ${r.pin}: ${firstDifference(want, got)}`);
            if (spec.differential && !pinnedS) r.live('the differential set (altered records, the grow cap)', null, 'no oracle: the pinned content was not found');
            else if (spec.differential) {
                const rows = await spec.differential(pinnedS, liveS);
                const bad = rows.filter(x => JSON.stringify(x.want) !== JSON.stringify(x.got));
                const show = v => { const t = JSON.stringify(v); return t.length > 70 ? t.slice(0, 70) + '…' : t; };
                deep = !bad.length;
                r.live(`the current code on the differential set (${rows.length} inputs)`, deep, deep ? 'the same verdicts as the pinned code: altered records, the grow cap' :
                    bad.slice(0, 3).map(b => `${b.label}: pinned ${show(b.want)}, now ${show(b.got)}`).join('; ') + (bad.length > 3 ? `; and ${bad.length - 3} more` : ''));
            }
        }
        for (const b of spec.bodies || []) {
            const cur = liveS[b.file];
            let pin = null;
            try { pin = b.pinned(); } catch (e) { pin = null; }
            if (cur && pin) r.bodies(changedBodies(pin, cur, b.names), ok && deep !== false, deep);
        }
    }
    for (const n of spec.commitNotes ? spec.commitNotes() : []) r.note(`provenance: ${n}`);
    r.exit();
}
// a short path to the first difference between two JSON values
function firstDifference(a, b, at = '') {
    if (JSON.stringify(a) === JSON.stringify(b)) return null;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = firstDifference(a[k], b[k], `${at}/${k}`); if (d) return d; }
        return `${at} (key order)`;
    }
    const show = v => { const t = JSON.stringify(v); return t === undefined ? 'absent' : t.length > 60 ? t.slice(0, 60) + '…' : t; };
    return `${at || '/'}: v1 ${show(a)}, now ${show(b)}`;
}

module.exports = { grab, line, constStatement, piece, has, sha256, SYNC, CONST_NAMES, OWL_GROWER, BIOCHAIN_GROWER, GROWER_NAMES, findSource, locate, functionHashes,
    lastCommit, headCommit, sandbox, identifiersIn, topLevelDeclarations, withHelpers, syncBody, growerFromSource, loadGrower, tamperSet, differential, loadOwlEye, HASH_NS, HASH_PARAMS, HASH_INJECT, Report, changedBodies,
    writeFrozen, stripKeys, SIDECAR, provenance, hints, checkPin, firstDifference };
