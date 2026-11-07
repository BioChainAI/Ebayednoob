// Hyperbolic Lexicon: the WordNet data of the 2D and 3D pages (Phase 5) as script files a page loads without fetch,
// so file:// works.
//
//   node "Pages/Hyperbolic Lexicon/reference/golden/make_wordnet_view_v1.cjs"           write data/wordnet_nouns_v1.js
//                                                                                     and data/wordnet_map_a_v1.js
//   node "Pages/Hyperbolic Lexicon/reference/golden/make_wordnet_view_v1.cjs" --check   rebuild in memory and compare
//                                                                                     the bytes
//
// The two texts (ASCII, LF line ends, a final LF; lines starting with '#' are comments):
//   wordnet_nouns_v1   every noun synset of WordNet 3.0 in offset order, "offset first_lemma parent", parent the
//                      0-based index (among node lines) of its L3 spanning parent (the first @ or @i pointer, the
//                      core's spanningParent), -1 for entity.n.01
//   wordnet_map_a_v1   "v offset first_lemma parent" for the verb forest (-1 for its 559 roots), then
//                      "i entry pos tagsense first_offset" (pos n v a r) for every V0 entry that part of speech's index
//                      lists, in the order noun, verb, adj, adv and V0 id: what map A reads (Amendment 1 item 4)
// Each begins with the WordNet licence (reference/golden/LICENSE-WORDNET.txt) verbatim, each line prefixed "# ".
//
// It reads the archive through wordnet_v1.cjs (its SHA-256 pin), lexicon_core.js, the licence, and the records it
// checks against (read only). It parses its own output back with the page engine's parsers (assets/hl-pages.js:
// parseNouns, parseMapA, buildLite), so the path a page takes is the one verified, and it refuses to write unless:
//   1. every line has its fields (3; v: 4; i: 5) of printable ASCII, no space inside a lemma or an entry;
//   2. the noun words built from the shipped parents (the core's nounWords on wn-lite) give the canonical point list
//      of results/claims.json, claims.L3.reported.canonical_point_list_sha256 (offsets, order and parents pinned);
//   3. the verb words give the verb_words_sha256 line of reference/traces/address_v1.txt;
//   4. map A on wn-lite equals map A on the full archive, word for word, for all 8,192 V0 entries, and the
//      addrTableRoot of its rows is the one inside the LADDR/1 string of results/claims-phase3.json
//      (claims.L8.d.global.laddr.python);
//   5. each wrapper is under 4,000,000 bytes and evaluating it gives its text back exactly.
// It prints each text's SHA-256 and size: assets/hl-pages.js pins them (PINS.nounsText, PINS.mapAText).
// --check exits 0 equal, 1 different (or a check above fails), 2 "skipped" when the archive is not cached. About 6 s.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GOLDEN = __dirname, REF = path.resolve(GOLDEN, '..'), SYS = path.resolve(REF, '..'), DATA = path.join(SYS, 'data');
const W = require('./wordnet_v1.cjs');
const LIMIT = 4000000;
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

// a JS string literal for ASCII text (make_js_data_v1.cjs's)
function literal(s) {
    let out = '"';
    for (const ch of s) {
        const c = ch.charCodeAt(0);
        if (ch === '"' || ch === '\\') out += '\\' + ch;
        else if (c === 0x0A) out += '\\n';
        else if (c >= 0x20 && c <= 0x7E) out += ch;
        else out += '\\x' + c.toString(16).padStart(2, '0');
    }
    return out + '"';
}

function licenceLines() {
    const t = fs.readFileSync(path.join(GOLDEN, 'LICENSE-WORDNET.txt'), 'latin1');
    if (/[^\x0a\x20-\x7e]/.test(t)) throw new Error('LICENSE-WORDNET.txt is not printable ASCII');
    const lines = t.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    return lines.map(l => '# ' + l);
}

function texts(wn, LC) {
    const v0 = LC.loadV0(), lic = licenceLines();
    const forest = map => {
        const offs = [...map.keys()].sort(), at = new Map(offs.map((o, i) => [o, i]));
        return offs.map(o => { const s = map.get(o), p = LC.spanningParent(s); return [o, s.lemmas[0], p === null ? -1 : at.get(p)]; });
    };
    const N = forest(wn.synsets.noun), V = forest(wn.synsets.verb), I = [];
    for (const pos of LC.POS) for (const e of v0.entries) if (wn.index[pos].has(e)) { const x = wn.index[pos].get(e); I.push([e, pos === 'adv' ? 'r' : pos[0], x.tagsense, x.offsets[0]]); }
    const zip = W.ZIP_SHA256;
    const nouns = [
        '# hyperbolic-lexicon/wordnet-nouns/1',
        '# Every noun synset of WordNet 3.0 in offset order, one per line: "offset first_lemma parent". parent is the 0-based',
        '# index, among node lines, of the synset\'s L3 spanning parent (its first @ or @i pointer); -1 for entity.n.01.',
        `# Written by reference/golden/make_wordnet_view_v1.cjs from the pinned archive (sha256 ${zip}).`,
        ...lic,
        `# nodes ${N.length}`,
        ...N.map(r => r.join(' ')),
    ].join('\n') + '\n';
    const mapA = [
        '# hyperbolic-lexicon/wordnet-map-a/1',
        '# The verb forest and the WordNet index entries of V0\'s entries, for map A (Amendment 1 item 4). Written by',
        `# reference/golden/make_wordnet_view_v1.cjs from the pinned archive (sha256 ${zip}) and V0 (sha256 ${LC.PINS.V0.sha256}).`,
        ...lic,
        `# verbs ${V.length}: "v offset first_lemma parent", parent = 0-based index among v lines, -1 for the ${V.filter(r => r[2] < 0).length} roots`,
        ...V.map(r => 'v ' + r.join(' ')),
        `# index ${I.length}: "i entry pos tagsense first_offset" (pos n v a r) for every V0 entry in that part of speech's index`,
        ...I.map(r => 'i ' + r.join(' ')),
    ].join('\n') + '\n';
    return { nouns, mapA };
}

function fieldsOk(text, what) {
    const lines = text.split('\n');
    lines.pop();
    for (const [k, line] of lines.entries()) {
        if (/[^\x20-\x7e]/.test(line)) throw new Error(`${what} line ${k + 1} is not printable ASCII`);
        if (line[0] === '#') continue;
        const f = line.split(' '), n = f[0] === 'v' ? 4 : f[0] === 'i' ? 5 : 3;
        if (f.length !== n || f.some(x => x === '')) throw new Error(`${what} line ${k + 1} has ${f.length} fields, not ${n}: ${line}`);
    }
    return lines.length;
}

function wrapper(name, text, what) {
    const chunks = [];
    let a = 0;
    for (let i = 0; i < text.length; i++) if (text[i] === '\n') { chunks.push(text.slice(a, i + 1)); a = i + 1; }
    if (a !== text.length) throw new Error(`${name}: the text does not end with LF`);
    const out = [
        `// Hyperbolic Lexicon data: ${what}.`,
        `// Generated by reference/golden/make_wordnet_view_v1.cjs from the WordNet 3.0 archive (sha256 ${W.ZIP_SHA256}); do not edit (--check compares).`,
        `// The text: ${Buffer.byteLength(text, 'latin1')} bytes, sha256 ${sha(Buffer.from(text, 'latin1'))}. Licence: derived from WordNet 3.0; WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved. The WordNet licence (reference/golden/LICENSE-WORDNET.txt) is reproduced in full at the head of the text.`,
        `// Registers the text as LexiconData.${name}; assets/hl-pages.js refuses it unless its SHA-256 and size are the pins.`,
        '(function (root, name, text) {',
        '    if (typeof module === \'object\' && module.exports) module.exports = { [name]: text };',
        '    else root.LexiconData = Object.assign(root.LexiconData || {}, { [name]: text });',
        `})(typeof self !== 'undefined' ? self : this, '${name}', [`,
        ...chunks.map(c => literal(c) + ','),
        '].join(\'\'));',
        '',
    ].join('\n');
    const m = { exports: {} };
    new Function('module', out)(m);
    if (m.exports[name] !== text) throw new Error(`${name}: the generated wrapper does not give the text back`);
    if (out.length >= LIMIT) throw new Error(`${name}: the wrapper has ${out.length} bytes, over ${LIMIT}`);
    return Buffer.from(out, 'latin1');
}

// the checks of the header, on the texts as a page reads them
function verify(T, wn, LC, LP) {
    const t0 = Date.now(), out = [];
    fieldsOk(T.nouns, 'nouns'); fieldsOk(T.mapA, 'map A');
    const nouns = LP.parseNouns(T.nouns), mapA = LP.parseMapA(T.mapA), lite = LP.buildLite(nouns, mapA);
    const claims = JSON.parse(fs.readFileSync(path.join(REF, 'results', 'claims.json'), 'utf8'));
    const p3 = JSON.parse(fs.readFileSync(path.join(REF, 'results', 'claims-phase3.json'), 'utf8'));
    const trace = fs.readFileSync(path.join(REF, 'traces', 'address_v1.txt'), 'utf8');
    const wantCpl = claims.claims.L3.reported.canonical_point_list_sha256;
    const wantVerb = (/^verb_words_sha256 ([0-9a-f]{64})$/m.exec(trace) || [])[1];
    const wantRoot = p3.claims.L8.d.global.laddr.python.split('|')[4];
    const nw = LC.nounWords(lite), vw = LC.verbWords(lite), f = LC.forestOf(lite, 'noun');
    const cpl = LC.canonicalPointList(f.offsets, f.words, { h3: 'bigint' });
    if (cpl.sha256 !== wantCpl) throw new Error(`the noun words from the shipped parents give the canonical point list ${cpl.sha256}, not the record's ${wantCpl}`);
    out.push(`canonical point list ${cpl.sha256.slice(0, 16)}… (${cpl.bytes} B) = results/claims.json L3`);
    const vSha = LC.wordsSha256(vw);
    if (vSha !== wantVerb) throw new Error(`the verb words give ${vSha}, not address_v1.txt's ${wantVerb}`);
    out.push(`verb words ${vSha.slice(0, 16)}… = traces/address_v1.txt; noun words ${LC.wordsSha256(nw)}`);
    const v0 = LC.loadV0();
    const [lw, lrep] = LC.mapA(v0.entries, lite, nw, vw), [fw] = LC.mapA(v0.entries, wn, LC.nounWords(wn), LC.verbWords(wn));
    const diff = lw.findIndex((w, i) => w.join(',') !== fw[i].join(','));
    if (diff >= 0 || lw.length !== fw.length) throw new Error(`map A on wn-lite differs from the full archive's at V0 id ${diff}`);
    const root = LC.addrTableRoot(LC.addrRows(v0.entries, lw));
    if (root !== wantRoot) throw new Error(`addrTableRoot ${root} is not the decisive run's ${wantRoot}`);
    out.push(`map A on wn-lite = on the full archive for all ${lw.length} entries (per root ${[0, 1, 2, 3, 4, 5].map(r => lrep.per_root[r]).join('/')}); addrTableRoot ${root.slice(0, 16)}… = claims-phase3.json`);
    out.push(`verified in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    return out;
}

function build() {
    const LC = require('../../lexicon_core.js'), LP = require('../../assets/hl-pages.js');
    const wn = W.load(), T = texts(wn, LC), notes = verify(T, wn, LC, LP);
    const files = [
        { name: 'wordnet_nouns_v1', text: T.nouns, what: 'every noun synset of WordNet 3.0 (offset, first lemma, L3 spanning parent), for the 2D and 3D pages' },
        { name: 'wordnet_map_a_v1', text: T.mapA, what: 'the verb forest of WordNet 3.0 and the index entries of V0\'s entries, for map A on the 2D and 3D pages' },
    ].map(o => ({ ...o, bytes: wrapper(o.name, o.text, o.what), textSha: sha(Buffer.from(o.text, 'latin1')), textBytes: Buffer.byteLength(o.text, 'latin1') }));
    return { files, notes };
}

function main() {
    const check = process.argv.includes('--check');
    if (!fs.existsSync(W.ZIP_PATH)) {
        console.log(`skipped: no WordNet archive at ${W.ZIP_PATH} (run make_wordnet_v1.cjs first)`);
        process.exit(2);
    }
    let r;
    try { r = build(); } catch (e) { console.log('FAIL  ' + e.message); process.exit(1); }
    for (const n of r.notes) console.log('ok    ' + n);
    let bad = 0;
    for (const f of r.files) {
        const p = path.join(DATA, f.name + '.js');
        console.log(`text  ${f.name}: ${f.textBytes} B, sha256 ${f.textSha}`);
        if (check) {
            const same = fs.existsSync(p) && Buffer.compare(fs.readFileSync(p), f.bytes) === 0;
            if (!same) bad++;
            console.log(`${same ? 'ok    ' : 'MISMATCH'}  data/${f.name}.js (${f.bytes.length} B, sha256 ${sha(f.bytes).slice(0, 16)}…)`);
        } else {
            fs.mkdirSync(DATA, { recursive: true });
            fs.writeFileSync(p, f.bytes);
            console.log(`wrote data/${f.name}.js: ${f.bytes.length} B, sha256 ${sha(f.bytes)}`);
        }
    }
    if (check) console.log(bad ? `${bad} data file(s) differ from a rebuild` : 'data files match a rebuild');
    process.exit(bad ? 1 : 0);
}

if (require.main === module) main();
module.exports = { texts, verify, wrapper, build };
