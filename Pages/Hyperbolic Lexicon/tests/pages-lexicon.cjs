// Hyperbolic Lexicon, Phase 5: the page engine (assets/hl-pages.js) and its data, checked in Node.
//
//   node "Pages/Hyperbolic Lexicon/tests/pages-lexicon.cjs"
//
// One line per check, as chain-lexicon.cjs writes them:
//   pins      every value in LexiconPages.PINS against the record it comes from
//   data      make_wordnet_view_v1.cjs rebuilt in memory equals data/*.js byte for byte (with its own checks: the
//             canonical point list, the verb words, map A against the full archive, addrTableRoot); the wrappers'
//             sizes; the texts' SHA-256 and sizes against PINS; the WordNet licence at their heads; printable ASCII
//   load      LexiconPages.load() from the wrappers alone (no archive): every load check passes
//   archive   map A on wn-lite equals the core's on the full archive; LADDR/1 recomputed from the page's data (in
//             yielding steps, equal to the core's single call) is the decisive run's; verifyNouns() gives the L3 canonical point list (skipped without the archive)
//   trace     every line of reference/traces/pages_v1.txt (written by reference/traces_pages.py from the Python
//             reference) regenerated from the engine and compared line by line
//   analyse   ids, pieces, spans, words, points and bits equal the core's own functions
//   decode    round trips on all 8,192 map A words (H^2 with no ties; H^3 h3DecodeInt), and on the 2,000 nouns of
//             results/l3f-python.txt with decodeExact, their points equal to that file byte for byte
//   lca       2,000 random noun pairs (Rng(8500)) and 200 cross-root pairs
//   chart     500 random (centre, word) pairs: the exact isometry; ratio's correct rounding
//   view      budgets, ancestors, children, paging over the 659-child node, the truncation order, edges
//   lps       X(5, q) against the L7 record; walk = reduction on 100 words and on every map A word
//   coupler   the mirror law holds, its control and the skip tamper move the binding
//   shard     grow, sign and verify (LVOCAB/1 = the run's, LADDR/1 recomputed = the run's); T1-T9 rejected at the
//             lab's first checks
//   engram    an Engram Mind's Eye v2 export made here, imported; anagrams; an engram stream (grid-only packets)
//   sizes     reported
// It also runs tests/parity-lexicon.cjs --quiet and requires 22,586/22,586. WordNet-dependent lines are skipped when
// the archive is not cached (exit 2 only if every line is skipped). Exit 1 on any failure.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const SYS = path.join(__dirname, '..'), REF = path.join(SYS, 'reference');
const LC = require(path.join(SYS, 'lexicon_core.js'));
const LP = require(path.join(SYS, 'assets', 'hl-pages.js'));
const C = require(path.join(SYS, '..', 'Hyperbolic Oracles', 'hyperbolic_core.js'));
const W = require(path.join(REF, 'golden', 'wordnet_v1.cjs'));
const GEN = require(path.join(REF, 'golden', 'make_wordnet_view_v1.cjs'));
const EC = require(path.join(SYS, '..', 'Engram Minds Eye', 'engram_core.js'));

let pass = 0, fail = 0, skip = 0;
const check = (group, label, ok, detail = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${group.padEnd(8)} ${label}${detail ? `  (${detail})` : ''}`); };
const skipped = (group, label, why) => { skip++; console.log(`skip  ${group.padEnd(8)} ${label}  (${why})`); };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const ws = LC.wordStr;
const lowest = (n, d) => { const g = LC.gcdB(n, d) || 1n; return `${n / g}/${d / g}`; };
const hasArchive = fs.existsSync(W.ZIP_PATH);
const T0 = Date.now();

(async () => {
    // ------------------------------------------------------------------ data
    const P = LP.PINS;
    let wn = null;
    for (const pin of [P.nounsText, P.mapAText]) {
        const file = path.join(SYS, 'data', pin.name + '.js'), bytes = fs.readFileSync(file), text = require(file)[pin.name];
        const tb = Buffer.from(text, 'latin1');
        check('data', `data/${pin.name}.js is under 4,000,000 bytes`, bytes.length < 4000000, `${fmt(bytes.length)} B, gzip ${fmt(require('zlib').gzipSync(bytes).length)} B`);
        check('data', `its text's SHA-256 and size are PINS.${pin === P.nounsText ? 'nounsText' : 'mapAText'}`, sha(tb) === pin.sha256 && tb.length === pin.bytes, `${fmt(tb.length)} B, ${pin.sha256.slice(0, 16)}…`);
        const lic = fs.readFileSync(path.join(REF, 'golden', 'LICENSE-WORDNET.txt'), 'latin1').split('\n').filter((l, i, a) => i < a.length - 1 || l).map(l => '# ' + l).join('\n');
        check('data', 'the WordNet licence is at the head of the text, verbatim', text.includes('\n' + lic + '\n') && text.split('\n').slice(0, 60).some(l => l.includes('WordNet 3.0 Copyright 2006 by Princeton University')));
        check('data', 'every line is printable ASCII, LF line ends, a final LF', /^[\x20-\x7e\n]*$/.test(text) && text.endsWith('\n') && !text.includes('\r'));
    }
    if (!hasArchive) skipped('data', 'make_wordnet_view_v1.cjs --check in memory', `no WordNet archive at ${W.ZIP_PATH}`);
    else {
        const t = Date.now();
        wn = W.load();
        try {
            const T = GEN.texts(wn, LC), notes = GEN.verify(T, wn, LC, LP);
            const same = [['wordnet_nouns_v1', T.nouns], ['wordnet_map_a_v1', T.mapA]].every(([name, text]) =>
                Buffer.compare(GEN.wrapper(name, text, name === 'wordnet_nouns_v1' ? 'every noun synset of WordNet 3.0 (offset, first lemma, L3 spanning parent), for the 2D and 3D pages' :
                    'the verb forest of WordNet 3.0 and the index entries of V0\'s entries, for map A on the 2D and 3D pages'), fs.readFileSync(path.join(SYS, 'data', name + '.js'))) === 0);
            check('data', 'make_wordnet_view_v1.cjs --check in memory: both wrappers rebuilt byte for byte, and its checks pass', same, `${notes.slice(0, 3).map(n => n.split(' ').slice(0, 3).join(' ')).join('; ')}; ${((Date.now() - t) / 1000).toFixed(1)} s`);
        } catch (e) { check('data', 'make_wordnet_view_v1.cjs --check in memory', false, e.message); }
    }

    // ------------------------------------------------------------------ pins: each against its record
    {
        const rd = f => JSON.parse(fs.readFileSync(path.join(REF, 'results', f), 'utf8'));
        const c1 = rd('claims.json').claims, c3 = rd('claims-phase3.json').claims;
        const trace = fs.readFileSync(path.join(REF, 'traces', 'address_v1.txt'), 'utf8');
        const l6 = require(path.join(SYS, 'data', 'l6_view_v1.js')).l6_view_v1;
        const lpsOk = [13, 17, 29].every(q => { const r = c1.L7.reported.per_q[String(q)], p = P.lps[q]; return r.structure.iota === p.iota && r.structure.vertices === p.n && r.structure.diameter === p.diameter && r.girth === p.girth && r.r === p.r; });
        check('pins', 'PINS against the records: the canonical point list (claims.json L3), LADDR/1 and its root (claims-phase3.json L8(d)), laddrHash and lvocabHash (L10\'s session), the verb words (address_v1.txt), X(5, q) (L7), the L6 view',
            P.canonicalPointList.sha256 === c1.L3.reported.canonical_point_list_sha256 && P.laddr === c3.L8.d.global.laddr.python && P.laddr === c3.L8.d.global.laddr.js &&
            P.addrTableRoot === P.laddr.split('|')[4] && P.laddrHash === c3.L10.python_session.laddrHash && P.lvocabHash === c3.L10.python_session.lvocabHash &&
            trace.includes(`verb_words_sha256 ${P.verbWordsSha256}\n`) && lpsOk && sha(Buffer.from(l6, 'latin1')) === P.l6View && LC.sha256Str(P.laddr) === P.laddrHash && LC.lvocab().sha256 === P.lvocabHash);
    }

    // ------------------------------------------------------------------ load
    let t = Date.now();
    const steps = [];
    const Lex = LP.load({ onStep: name => steps.push(name) });
    const loadMs = Date.now() - t;
    check('load', 'LexiconPages.load() from the two wrappers: every load check passes', Lex.ok && Lex.checks.length === 4 && Lex.checks.every(c => c.ok === true), Lex.checks.map(c => `${c.ok ? '✓' : '✗'} ${Math.round(c.ms)} ms`).join(', ') + `; ${loadMs} ms`);
    check('load', 'onStep reports data, parse, words, mapA, tree in order', steps.join() === 'data,parse,words,mapA,tree');
    check('load', 'counts: 82,115 nouns, 13,767 verbs, 8,192 tokens, per root 2,493/537/1,103/1,982/1,962/115',
        Lex.counts.nouns === 82115 && Lex.counts.verbs === 13767 && Lex.counts.tokens === 8192 && [0, 1, 2, 3, 4, 5].every(r => Lex.counts.perRoot[r] === P.mapAReport.per_root[r]), `${fmt(Lex.counts.named)} named nodes`);
    check('load', 'noun and verb words equal the pins (the core\'s wordsSha256)', LC.wordsSha256(LC.nounWords(Lex.lite)) === P.nounWordsSha256 && LC.wordsSha256(LC.verbWords(Lex.lite)) === P.verbWordsSha256);
    {
        // the wrapper module is cached by require, so a changed text can be lent to load() and put back
        const saved = require(path.join(SYS, 'data', 'wordnet_nouns_v1.js')), key = 'wordnet_nouns_v1', orig = saved[key];
        const tryLoad = text => { saved[key] = text; try { return { L: LP.load() }; } catch (e) { return { e }; } finally { saved[key] = orig; } };
        const a = tryLoad(orig.replace('00002137 abstraction 0', '00002137 abstraction 1'));
        const b = tryLoad(orig.replace('# nodes 82115', '# nodes 82116'));
        const c = tryLoad(orig.replace('00001930 physical_entity 0', '00001930 physical_entity x'));
        check('load', 'a nouns text with one parent changed loads with ok = false (data and words checks fail; the page stays up); a wrong count or a broken line is refused with .stage = parse',
            a.L && !a.L.ok && a.L.checks[0].ok === false && a.L.checks[2].ok === false && b.e && b.e.stage === 'parse' && c.e && c.e.stage === 'parse',
            `${a.L ? a.L.checks.map(x => (x.ok ? '✓' : '✗')).join('') : a.e.message}; ${b.e ? b.e.message.slice(0, 50) : '-'}`);
    }

    // ------------------------------------------------------------------ archive
    if (!wn) { skipped('archive', 'map A, LADDR/1 and the canonical point list against the full archive', 'no WordNet archive'); }
    else {
        const v0 = LC.loadV0(), [fw] = LC.mapA(v0.entries, wn, LC.nounWords(wn), LC.verbWords(wn));
        const diff = Lex.mapA.words.filter((w, i) => ws(w) !== ws(fw[i])).length;
        check('archive', 'map A on wn-lite equals the core\'s on the full archive for all 8,192 entries', diff === 0 && fw.length === 8192, `${diff} differ`);
    }
    t = Date.now();
    const A = await Lex.addrTableAsync(), A1 = LC.addrRows(Lex.v0.entries, Lex.mapA.words);
    check('archive', 'Lex.addrTableAsync() (yielding steps) = the core\'s addrRows and addrTableRoot in one call; addrTableRoot = 30b17bc3… and the LADDR/1 hash = 83f09be9…, recomputed from the page\'s data; Lex.addrTable() returns the same',
        A.ok && A.laddr.ok && A.root === P.addrTableRoot && A.laddr.sha256 === P.laddrHash && JSON.stringify(A.rows) === JSON.stringify(A1) && LC.addrTableRoot(A1) === A.root && Lex.addrTable() === A,
        `${A.rows.length} rows, ${Math.round(A.ms)} ms of work`);
    t = Date.now();
    const prog = [];
    const VN = await Lex.verifyNouns({ onProgress: (stage, done) => prog.push(stage) });
    check('archive', 'Lex.verifyNouns(): the canonical point list of every noun is eb22bf00… (29,442,565 B)', VN.ok && VN.sha256 === P.canonicalPointList.sha256 && VN.bytes === 29442565, `${Math.round(VN.ms)} ms, ${prog.length} progress calls`);

    // ------------------------------------------------------------------ trace
    const trace = fs.readFileSync(path.join(REF, 'traces', 'pages_v1.txt'), 'utf8').split('\n');
    if (trace[trace.length - 1] === '') trace.pop();
    const got = traceLines(Lex);
    let first = -1;
    for (let i = 0; i < Math.max(trace.length, got.length); i++) if (trace[i] !== got[i]) { first = i; break; }
    const groups = {};
    trace.forEach(l => { const k = l.startsWith('#') ? '#' : l.split(' ')[0] + (l[0] === 's' || l[0] === 'p' ? ' ' + l.split(' ')[2] : ''); groups[k] = (groups[k] || 0) + 1; });
    check('trace', `reference/traces/pages_v1.txt: ${trace.length}/${trace.length} lines regenerated from the engine`, first < 0,
        first < 0 ? Object.entries(groups).map(([k, n]) => `${k} ${n}`).join(', ') : `line ${first + 1}: want ${JSON.stringify((trace[first] || '').slice(0, 120))}, got ${JSON.stringify((got[first] || '').slice(0, 120))}`);

    // ------------------------------------------------------------------ analyse
    const SENT = ['The dog chased the cat up the tree.', 'Oxygen and nitrogen are gases.', 'She can run, jump and swim.', 'Ünïcödé façade, naïve café — résumé!',
        'unbelievably, 12,345 apples!', 'Entity, physical entity, abstraction.', 'ΣΊΣΥΦΟΣ', '[CLS] literal brackets [SEP]', '', 'pneumonoultramicroscopicsilicovolcanoconiosis'];
    {
        const v0 = LC.loadV0();
        let n = 0, okText = true, okGeo = true;
        for (const s of SENT) {
            const a = Lex.analyse(s), e = LC.encode(LC.utf8(s), v0);
            okText = okText && a.tokens.length === e.ids.length && a.tokens.every((tk, i) => tk.id === e.ids[i] && tk.piece === e.pieces[i] && tk.span[0] === e.spans[i][0] && tk.span[1] === e.spans[i][1] && ws(tk.word) === ws(Lex.mapA.words[tk.id]))
                && a.idStreamHex === LC.hex(LC.idStream([e.ids]));
            for (const tk of a.tokens) {
                n++;
                const p3 = Lex.point(3, tk.word), p2 = Lex.point(2, tk.word);
                okGeo = okGeo && LC.qText(LC.h3PointExact(tk.word)) === LC.coordsText(p3.X, p3.den) && LC.coordsText(LC.H2_TREE.points([tk.word])[0], LC.H2_TREE.den(tk.len)) === LC.coordsText(p2.X, p2.den)
                    && JSON.stringify(Lex.bits(3, tk.word).coords) === JSON.stringify(LC.coordBits(p3.X, p3.den)) && Lex.bits(2, tk.word).point === LC.pointBits(p2.X, p2.den);
            }
        }
        check('analyse', 'on the trace sentences: ids, pieces, byte spans and the id stream equal LC.encode; words equal map A\'s', okText);
        check('analyse', `... points equal LC.h3PointExact (decoder3d.js) and H2_TREE.points; bits equal LC.coordBits and pointBits (${n} tokens)`, okGeo);
        const pr = Lex.analyse(null, { pair: ['The dog chased the cat.', 'The cat climbed the tree.'] }), pe = Lex.analyse(null, { pair: ['She can run.', ''] });
        check('analyse', 'a pair is [CLS] A [SEP] B [SEP] (segments 0 then 1; specials have no span); B empty gives [CLS] A [SEP]',
            pr.tokens[0].piece === '[CLS]' && pr.tokens[0].span === null && pr.tokens.filter(x => x.piece === '[SEP]').length === 2 && pr.tokens[pr.tokens.length - 1].segment === 1 &&
            pr.tokens.findIndex(x => x.segment === 1) === pr.tokens.findIndex(x => x.piece === '[SEP]') + 1 && pe.tokens.map(x => x.piece).join(' ') === '[CLS] she can run . [SEP]',
            pr.tokens.map(x => x.piece + '/' + x.segment).join(' '));
        const ls = Lex.analyse('ok \ud800 no'), fw = Lex.analyse('a ͸ b');
        check('analyse', 'a lone surrogate is reported (Analysis.error), not thrown; a word with an unassigned code point is listed in failedWords', ls.error && ls.tokens.length === 0 && fw.failedWords.length === 1 && fw.failedWords[0] === '͸' && fw.unk === 1, ls.error);
        const sat = Lex.analyse('sat whale a are').tokens.map(x => Lex.label(x.node));
        check('analyse', 'first senses, no context: sat -> Saturday, whale -> giant, a -> angstrom, are -> are (the unit)', sat.join(' | ') === 'Saturday.n (15164570) | giant.n (10129133) | angstrom.n (13658027) | are.n (13613862)', sat.join(' | '));
        const dc = Lex.analyse('The dog chased the cat up the tree.');
        check('analyse', 'the default centre of "The dog chased the cat up the tree." is organism.n.01 (the named LCA of dog, cat, tree)', Lex.label(Lex.defaultCentre(dc)) === 'organism.n (00004475)');
        const hits = Lex.search('Dog', 3).map(n => Lex.label(n)), hit2 = Lex.search('big cat', 1).map(n => Lex.label(n)), hit3 = Lex.search('##ased', 1).map(n => n.key);
        check('analyse', 'search: first lemmas by prefix (any case, space = underscore) and V0 pieces', hits[0] === 'dog.n (02084071)' && hit2[0] === 'big cat.n (02127808)' && hit3[0] === dc.tokens[3].key, hits.join(', '));
    }

    // ------------------------------------------------------------------ decode
    {
        let bad2 = 0, ties = 0, bad3 = 0;
        t = Date.now();
        for (const w of Lex.mapA.words) {
            const d2 = Lex.decode(2, w), d3 = Lex.decode(3, w, { authority: false });
            if (!d2.ok) bad2++; if (d2.ties) ties++; if (!d3.ok) bad3++;
        }
        check('decode', 'all 8,192 map A words decode back in H^2 (no ties) and in H^3 (h3DecodeInt)', !bad2 && !ties && !bad3, `${bad2} + ${ties} ties, ${bad3}; ${((Date.now() - t) / 1000).toFixed(1)} s`);
        const l3f = fs.readFileSync(path.join(REF, 'results', 'l3f-python.txt'), 'utf8').split('\n').filter(l => l && !l.startsWith('#'));
        const keyOf = new Map(Lex.forest.noun.offsets.map((o, i) => [o, Lex.forest.noun.keys[i]]));
        let badLine = 0, badDec = 0, firstBad = '';
        t = Date.now();
        for (const line of l3f) {
            const [off, word, l3, l2] = line.split('\t'), key = keyOf.get(off), p3 = Lex.point(3, key), p2 = Lex.point(2, key);
            const mine = `${off}\t${key}\t${off} H3 ${LC.coordsText(p3.X, p3.den)}\t${off} H2 ${LC.coordsText(p2.X, p2.den)}`;
            if (mine !== line || word !== key) { badLine++; if (!firstBad) firstBad = off; }
            const d = Lex.decode(3, key);
            if (!d.ok || !d.authority) badDec++;
        }
        check('decode', `the ${fmt(l3f.length)} nouns of results/l3f-python.txt: word and points equal the file byte for byte; h3DecodeInt and decodeExact return the word`,
            l3f.length === 2000 && !badLine && !badDec, `${badLine} lines differ${firstBad ? ' (first ' + firstBad + ')' : ''}, ${badDec} decodes fail; ${((Date.now() - t) / 1000).toFixed(1)} s`);
    }

    // ------------------------------------------------------------------ lca
    {
        const N = Lex.forest.noun, rng = new C.Rng(8500);
        let bad = 0, firstBad = '';
        const note = s => { bad++; if (!firstBad) firstBad = s; };
        for (let i = 0; i < 2000; i++) {
            const a = N.keys[rng.below(N.keys.length)], b = N.keys[rng.below(N.keys.length)], l = Lex.lca(a, b);
            const anc = k => new Set([...Lex.ancestors(k), k]);
            if (!(a.startsWith(l.named) && b.startsWith(l.named) && anc(a).has(l.named) && anc(b).has(l.named))) { note('named ' + a + ' ' + b); continue; }
            for (let j = l.named.length + 1; j <= l.lcp; j++) if (Lex.node(a.slice(0, j))) note('longer named prefix ' + a + ' ' + b);
            if (l.letters !== a.length + b.length - 2 * l.named.length) note('letters');
            if (l.synset !== l.named && Lex.node(l.named).kind === 'noun') note('synset');
            for (const dim of [2, 3]) { const c = Lex.cosh(dim, a, b), pl = Lex.chart(dim, a).place(b); if (c.n * pl.D !== pl.R[0] * c.d) note('cosh ' + dim); }
        }
        check('lca', '2,000 random noun pairs (Rng(8500)): the named LCA is a common prefix and a forest ancestor of both, no longer common prefix is named, letters = |a| + |b| - 2|named|, cosh = the chart\'s R0/D', !bad, firstBad);
        const V = Lex.forest.verb, T = Lex.mapA.words.filter(w => w[0] >= 2).map(ws);
        let cross = 0;
        for (let i = 0; i < 200; i++) {
            const a = N.keys[rng.below(N.keys.length)], b = i % 2 ? V.keys[rng.below(V.keys.length)] : T[rng.below(T.length)], l = Lex.lca(a, b);
            if (l.named === '' && l.synset === null && l.letters === a.length + b.length && l.pathKeys.includes('')) cross++;
        }
        check('lca', '200 cross-root pairs (noun-verb, noun-spelled token) meet at the origin', cross === 200, `${cross}/200`);
        const dc = Lex.analyse('The dog chased the cat up the tree.'), dog = dc.tokens[1].key, cat = dc.tokens[5].key, tree = dc.tokens[8].key;
        const l = Lex.lca(dog, cat), l2 = Lex.lca(cat, tree), ox = Lex.analyse('Oxygen and nitrogen'), l3 = Lex.lca(ox.tokens[0].key, ox.tokens[2].key);
        check('lca', 'dog-cat: lcp 24 letters, named LCA carnivore.n.01 (23 letters, 7 letters of path); cat-tree: organism; oxygen-nitrogen: chemical element',
            l.lcp === 24 && l.named.length === 23 && Lex.label(l.named) === 'carnivore.n (02075296)' && l.letters === 7 && Lex.label(l2.named) === 'organism.n (00004475)' && Lex.label(l3.named) === 'chemical element.n (14622893)',
            `${Lex.label(l.named)}, ${Lex.label(l2.named)}, ${Lex.label(l3.named)}`);
        const p = Lex.path(2, dog, cat), p3 = Lex.path(3, dog, cat);
        check('lca', 'path(dim, a, b): tree = letters x tau (ln 12, ln 7) and detour = tree - geodesic', Math.abs(p.tree - 7 * Math.log(12)) < 1e-12 && Math.abs(p3.tree - 7 * Math.log(7)) < 1e-12 && p.detour === p.tree - p.geodesic && p.geodesic > 0,
            `H2 ${p.tree.toFixed(3)} vs ${p.geodesic.toFixed(3)}; H3 ${p3.tree.toFixed(3)} vs ${p3.geodesic.toFixed(3)}`);
    }

    // ------------------------------------------------------------------ chart
    {
        const N = Lex.forest.noun, rng = new C.Rng(8600);
        const allKeys = N.keys.concat(Lex.forest.verb.keys, Lex.mapA.words.map(ws));
        let bad = 0, firstBad = '', worst = 0;
        const note = s => { bad++; if (!firstBad) firstBad = s; };
        const lor = (a, b) => { let s = -a[0] * b[0]; for (let k = 1; k < a.length; k++) s += a[k] * b[k]; return s; };
        for (let i = 0; i < 500; i++) {
            const c = allKeys[rng.below(allKeys.length)], x = allKeys[rng.below(allKeys.length)], y = allKeys[rng.below(allKeys.length)], dim = 2 + (i % 2);
            const ch = Lex.chart(dim, c), pc = ch.place(c), px = ch.place(x), py = ch.place(y);
            if (!(pc.R[0] === pc.D && pc.R.slice(1).every(v => v === 0n))) note('centre ' + c);
            if (lor(px.R, px.R) !== -px.D * px.D) note('sheet ' + x);
            const X = Lex.point(dim, x), Y = Lex.point(dim, y);
            if (lor(px.R, py.R) * X.den * Y.den !== lor(X.X, Y.X) * px.D * py.D) note('isometry ' + x + ' ' + y);
            if (c.length) {
                const pp = ch.place(c.slice(0, -1));
                if (!(pp.R[1] < 0n && pp.R.slice(2).every(v => v === 0n))) note('parent ' + c);
            }
            const ex = Lex.cosh(dim, c, x), want = Math.acosh(LP.ratio(ex.n, ex.d)), dd = ex.value < 1e8 ? Math.abs(px.d - want) / Math.max(1, want) : 0;
            worst = Math.max(worst, dd);
            if (dd > 1e-9) note('float d ' + x);
        }
        check('chart', '500 random (centre, word) pairs: the centre goes to (D, 0, 0); every placed point is on the sheet exactly; Lorentz products are kept; the letter parent lies on the negative x-axis; float d = acosh(exact cosh) to 1e-9',
            !bad, firstBad || `worst relative ${worst.toExponential(1)}`);
        const r2 = new C.Rng(8700);
        let rb = 0;
        for (let i = 0; i < 2000; i++) {
            const n = BigInt(r2.below(1 << 26)) * 134217728n + BigInt(r2.below(1 << 27)), d = BigInt(1 + r2.below(1 << 26)) * 134217728n + BigInt(r2.below(1 << 27)), s = i % 2 ? -1n : 1n;
            if (LP.ratio(s * n, d) !== Number(s * n) / Number(d)) rb++;
        }
        // halfway cases: (2m + 1) 2^(e - 1) lies between m 2^e and (m + 1) 2^e; ties go to the even one
        let hb = 0;
        for (let i = 0; i < 400; i++) {
            const m = (1n << 52n) + BigInt(r2.below(1 << 26)) * 67108864n + BigInt(r2.below(1 << 26)), e = r2.below(200) - 100;
            const num = (2n * m + 1n), den = 1n, scaleUp = e - 1 >= 0 ? (1n << BigInt(e - 1)) : 1n, scaleDn = e - 1 < 0 ? (1n << BigInt(1 - e)) : 1n;
            const even = m % 2n === 0n ? m : m + 1n, want = Number(even) * LP.pow2(e);
            const got = LP.ratio(num * scaleUp * den, scaleDn);
            const above = LP.ratio(num * scaleUp * 1000003n + 1n, scaleDn * 1000003n), below = LP.ratio(num * scaleUp * 1000003n - 1n, scaleDn * 1000003n);
            if (got !== want || above !== Number(m + 1n) * LP.pow2(e) || below !== Number(m) * LP.pow2(e)) hb++;
        }
        const sub = LP.ratio(1n, 1n << 1074n) === 5e-324 && LP.ratio(1n, 1n << 1075n) === 0 && LP.ratio(3n, 1n << 1076n) === 5e-324 && LP.ratio(1n << 1024n, 1n) === Infinity;
        check('chart', 'ratio(n, d) equals Number(n) / Number(d) on 2,000 exact pairs, and rounds 400 constructed halfway cases to even (and their neighbours away); subnormals and overflow', !rb && !hb && sub, `${rb}, ${hb}`);
        const d = LP.dyadic(0.1), back = Number(d[0]) * LP.pow2(d[1]);
        check('chart', 'dyadic(x) reads a double back exactly (m odd)', back === 0.1 && d[0] % 2n === 1n && LP.dyadic(-3 * 2 ** -1070)[1] === -1070);
        const dc = Lex.analyse('The dog chased the cat.'), ch3 = Lex.chart(3, dc.tokens[4].key), arms = ch3.frameAxes(dc.tokens[1].key), pd = ch3.place(dc.tokens[1].key);
        const armD = arms.map(v => { let s = v[0] * pd.y[0]; for (let k = 1; k < 4; k++) s -= v[k] * pd.y[k]; return Math.acosh(Math.max(1, s)); });
        check('chart', 'frameAxes: three arms of length 0.6 from the token\'s chart point (float, after the exact isometry)', armD.every(x => Math.abs(x - 0.6) < 1e-6 * Math.max(1, pd.y[0])), armD.map(x => x.toFixed(6)).join(', '));
    }

    // ------------------------------------------------------------------ view
    {
        const N = Lex.forest.noun;
        const big = [...N.keys].reduce((m, k) => (Lex.node(k).nChildren > Lex.node(m).nChildren ? k : m), N.keys[0]);
        check('view', `the widest noun has ${Lex.node(big).nChildren} children (${Lex.label(big)})`, Lex.node(big).nChildren === 659);
        const seen = new Map();
        let pages = 0;
        for (let p = 0; ; p++) { const v = Lex.view(big, { childPage: p }); for (const nd of v.nodes) if (nd.roles.includes('child')) seen.set(nd.key, (seen.get(nd.key) || 0) + 1); pages++; if (!v.paging.children.next) break; }
        check('view', 'paging over its 659 children visits each exactly once', seen.size === 659 && [...seen.values()].every(n => n === 1), `${pages} pages of 48`);
        const kid = Lex.children(big)[300], sseen = new Map();
        for (const dir of [-1, 1]) for (let p = dir === -1 ? -1 : 0; ; p += dir) {
            const v = Lex.view(kid, { siblingPage: p });
            for (const nd of v.nodes) if (nd.roles.includes('sibling')) sseen.set(nd.key, (sseen.get(nd.key) || 0) + 1);
            if (dir === -1 ? !v.paging.siblings.prev : !v.paging.siblings.next) break;
        }
        check('view', 'paging over the siblings of its 301st child (page 0 centred on it) visits each other sibling exactly once', sseen.size === 658 && [...sseen.values()].every(n => n === 1));
        const spanning = LC.spanningForest(Lex.lite.synsets.noun), keyOf = new Map(N.offsets.map((o, i) => [o, N.keys[i]]));
        const rng = new C.Rng(8800);
        let badKids = 0, badAnc = 0, badBudget = 0, badEdge = 0;
        for (let i = 0; i < 300; i++) {
            const o = N.offsets[rng.below(N.offsets.length)], k = keyOf.get(o);
            const want = (spanning.children.get(o) || []).map(x => keyOf.get(x));
            if (Lex.children(k).join() !== want.join()) badKids++;
            const chain = []; let p = spanning.parent.get(o); while (p) { chain.push(keyOf.get(p)); p = spanning.parent.get(p); }
            if (Lex.ancestors(k).join() !== ['', ...chain.reverse()].join()) badAnc++;
            const v = Lex.view(k, { maxNodes: 60 + (i % 5) * 80 });
            const must = new Set(v.nodes.filter(nd => nd.roles.some(r => r === 'ancestor' || r === 'centre' || r === 'path' || r === 'lca')).map(nd => nd.key));
            if (v.nodes.length > Math.max(60 + (i % 5) * 80, must.size)) badBudget++;
            for (const e of v.edges) if (e.hidden === 0 ? Lex.node(e.to).parent !== e.from : !Lex.ancestors(e.to).includes(e.from)) badEdge++;
        }
        check('view', '300 random nouns: children equal the forest children in offset order; ancestors are the forest chain from the origin', !badKids && !badAnc, `${badKids}, ${badAnc}`);
        check('view', '... their views stay within maxNodes; every edge joins a node to its named parent (or, past undrawn nodes, an ancestor)', !badBudget && !badEdge, `${badBudget}, ${badEdge}`);
        // truncation order: grandchildren, siblings beyond +-8, children beyond 24, extras beyond 64
        const cands = N.keys.filter(k => { const n = Lex.node(k); return n.nChildren >= 30 && n.nChildren <= 48 && n.parent !== null && Lex.children(n.parent).length >= 30 && Lex.children(k).some(c => Lex.node(c).nChildren > 0); });
        const c = cands[0];
        const extra = Lex.mapA.words.slice(1000, 1100).map(ws);
        const full = Lex.view(c, { extra, maxNodes: 100000 }), count = (v, r) => v.nodes.filter(nd => nd.roles.includes(r)).length;
        const v1 = Lex.view(c, { extra, maxNodes: full.nodes.length - 1 });
        const v2 = Lex.view(c, { extra, maxNodes: v1.nodes.length - 1 });
        const v3 = Lex.view(c, { extra, maxNodes: v2.nodes.length - 1 });
        const v4 = Lex.view(c, { extra, maxNodes: 10 });
        check('view', `truncation order on ${Lex.label(c)}: grandchildren go first, then siblings beyond +-8, then children beyond 24, then extras beyond 64`,
            !full.truncated && count(full, 'grandchild') > 0 && v1.truncated && count(v1, 'grandchild') === 0 && count(v1, 'sibling') === count(full, 'sibling') &&
            count(v2, 'sibling') <= 16 && count(v2, 'child') === count(full, 'child') && count(v3, 'child') <= 24 && count(v3, 'extra') === 100 && count(v4, 'extra') === 64 && v4.truncated,
            `${full.nodes.length} -> ${v1.nodes.length} -> ${v2.nodes.length} -> ${v3.nodes.length} -> ${v4.nodes.length}`);
        const dc = Lex.analyse('The dog chased the cat up the tree.'), dog = dc.tokens[1].key, cat = dc.tokens[5].key;
        const vp = Lex.view(Lex.defaultCentre(dc), { extra: dc.tokens.map(x => x.key), paths: [[dog, cat]] });
        const lcaNode = vp.nodes.find(nd => nd.rel === 'lca'), virt = vp.virtual.every(x => !Lex.node(ws(x.word)) && ws(x.word).startsWith(x.from) && x.to.startsWith(ws(x.word)));
        check('view', 'a view with the sentence as extras and a dog-cat path: the LCA is marked, the path\'s named nodes are drawn, virtual letters are unnamed prefixes inside edges',
            lcaNode && Lex.label(lcaNode.key) === 'carnivore.n (02075296)' && Lex.lca(dog, cat).pathKeys.every(k => vp.nodes.some(nd => nd.key === k)) && virt, `${vp.nodes.length} nodes, ${vp.virtual.length} virtual letters`);
    }

    // ------------------------------------------------------------------ lps
    {
        let ok = true;
        for (const q of [13, 17, 29]) { const G = Lex.lps(q), p = P.lps[q]; ok = ok && G.n === p.n && G.iota === p.iota && G.diameter === p.diameter && G.girth === p.girth && G.r === p.r; }
        check('lps', 'X(5, 13), X(5, 17), X(5, 29): vertices, iota, diameter, girth and r equal the L7 record', ok, [13, 17, 29].map(q => `${q}: ${Lex.lps(q).n}, d ${Lex.lps(q).diameter}, g ${Lex.lps(q).girth}`).join('; '));
        let bad = 0;
        for (let i = 0; i < 100; i++) { const w = randomWord(new C.Rng(8400 + i)); for (const q of [13, 17, 29]) if (!Lex.vertex(w, q).agree) bad++; }
        t = Date.now();
        for (const w of Lex.mapA.words) for (const q of [13, 17, 29]) { const G = Lex.lps(q); if (G.walk(w) !== G.reduction(w)) bad++; }
        check('lps', 'walk = reduction (L7(b)) on the 100 trace words and on every map A word, for each q', !bad, `${bad} disagree; ${((Date.now() - t) / 1000).toFixed(1)} s`);
        const ball = Lex.lpsBall(13, Lex.vertex(Lex.mapA.words[1753], 13).v);
        check('lps', 'the radius-2 ball is a tree of 1 + 6 + 30 vertices (girth 8)', ball.nodes.length === 37 && ball.edges.length === 36 && ball.extra.length === 0);
    }

    // ------------------------------------------------------------------ coupler
    {
        const PAIRS = [['The dog chased the cat.', 'The cat climbed the tree.'], ['Is oxygen a gas?', 'Yes, and so is nitrogen.'], ['She can run.', '']];
        let held = true, moved = true, skipOk = true;
        for (const [a, b] of PAIRS) {
            const an = Lex.analyse(null, { pair: [a, b] }), m = Lex.couple(an), s = Lex.couple(an, { chirality: 'same' });
            held = held && m.held === m.total;
            moved = moved && s.held < s.total;
            const k = Math.floor(an.tokens.length / 2), sk = Lex.couple(an, { skip: k });
            skipOk = skipOk && sk.checks.every(c => (c.i < k ? c.ok : !c.ok));
        }
        check('coupler', 'the mirror law holds at every token of the three trace pairs; the control (same) moves the binding', held && moved);
        check('coupler', 'skipping one twist on structure 2 moves the binding from that token on, and not before', skipOk);
        const an = Lex.analyse(null, { pair: PAIRS[0] }), m = Lex.couple(an), ortho = M => [0, 1, 2].every(i => [0, 1, 2].every(j => Math.abs(M[0][i] * M[0][j] + M[1][i] * M[1][j] + M[2][i] * M[2][j] - (i === j ? 1 : 0)) < 1e-12));
        check('coupler', 'f1 and f2 are rotations (float, from the exact R(q))', ortho(m.f1) && ortho(m.f2) && m.issued[0] + m.issued[1] === m.total, `issued ${m.issued.join(', ')}`);
        const r = Lex.rotation(an.tokens[2].word);
        check('coupler', 'rotation(w): R(q) of the word quaternion, R^T R = I exactly', r.ok && ortho(r.f));
    }

    // ------------------------------------------------------------------ shard
    {
        t = Date.now();
        const run = await LP.shard.run(Lex, SENT[0], { source: 'page:tests/pages-lexicon.cjs' });
        check('shard', 'sentence 1 grown, signed (WebCrypto) and verified: accepted; LVOCAB/1 = 55962675…; LADDR/1 recomputed from the page\'s data = 83f09be9…',
            run.accepted && run.webcrypto && run.lvocab.equalsRun && run.laddr.equalsRun && run.laddr.rootOk && run.owl.ok && run.ids.length > 0,
            `${run.verdictText}; K ${run.K}; ${Date.now() - t} ms`);
        const r2 = await LP.shard.run(Lex, LP.shard.SAMPLE, { source: 'page:tests/pages-lexicon.cjs' });
        const want = { T1: 'leaves', T2: 'crystal', T3: 'commitment', T4: 'attestation', T7: 'leaves', T8: 'weaves', T9: 'canonical' };
        const res = [];
        for (const name of LP.shard.TAMPERS) res.push(await LP.shard.tamper(r2, name));
        check('shard', `the ${fmt(r2.bytes)}-byte sample (K ${r2.K}) is accepted, and T1, T2, T3, T4, T7, T8, T9 are rejected at the lab's first checks`,
            r2.accepted && r2.K === 3 && res.every(x => x.firstFail && x.firstFail.name === want[x.name] && x.verdict.failed !== '-'),
            res.map(x => `${x.name} ${x.firstFail ? x.firstFail.name : 'none'}`).join(', '));
        const owl = n => res.find(x => x.name === n).owl.ok;
        check('shard', 'Owl\'s rule (verifyBiochain) accepts T1, T2, T8 and T9, which the hardened verifier rejects (L10\'s control 1, as in the lab), and T3 and T4 leave the record unchanged',
            owl('T1') && owl('T2') && owl('T8') && owl('T9') && owl('T3') && owl('T4') && res.find(x => x.name === 'T3').unchanged && res.find(x => x.name === 'T4').unchanged,
            res.map(x => `${x.name} ${x.owl.ok ? 'accepts' : 'rejects'}`).join(', '));
        let refused = 0;
        for (const [txt, eng] of [['', false], ['x'.repeat(60001), false], ['x'.repeat(6001), true]]) { try { await LP.shard.run(Lex, txt, { engrams: eng, laddr: 'pinned' }); } catch (e) { refused++; } }
        const noWc = await LP.shard.run(Lex, SENT[1], { webcrypto: false, laddr: 'pinned' }), t4 = await LP.shard.tamper(noWc, 'T4');
        check('shard', 'an empty text and texts over the caps are refused; without WebCrypto the deterministic key signs, the attestation check is skipped and T4 is not run',
            refused === 3 && noWc.accepted && noWc.verdict.checks.find(x => x.name === 'attestation').ok === null && !!t4.skip, `${noWc.verdictText}`);
    }

    // ------------------------------------------------------------------ engram
    {
        const live = new EC.Live();
        live.addTurn('human', 'The cat sat.');
        live.addTurn('human', 'Act now, tac!');
        const v2 = EC.exportV2(live, { generatedAt: '2026-11-07T00:00:00.000Z' });
        const imp = LP.engram.importText(Lex, v2.text);
        const P2 = live.chain.packets;
        check('engram', 'an Engram Mind\'s Eye v2 export made here imports verified, kind engram_mind_eye_v2', imp.kind === 'engram_mind_eye_v2' && imp.verified === true, imp.checks.map(c => (c.ok ? '✓' : c.ok === false ? '✗' : '·')).join(''));
        check('engram', 'its packets are Engram\'s (token, source), each engram/1 key is EC.hexLsb(crystallize(token))',
            imp.packets.length === P2.length && imp.packets.every((p, i) => p.token === P2[i].token && p.source === P2[i].source && p.key === EC.hexLsb(EC.crystallize(p.token)) && p.analysis),
            imp.packets.map(p => p.token).join(' '));
        const by = tok => imp.packets.find(p => p.token === tok);
        check('engram', 'CAT, ACT and TAC share one engram/1 key and are marked differs (their Lexicon addresses differ); THE and SAT are not',
            by('CAT').key === by('ACT').key && by('ACT').key === by('TAC').key && by('CAT').differs && by('ACT').differs && by('TAC').differs && !by('THE').differs && !by('SAT').differs,
            `key ${by('CAT').key}: ${['CAT', 'ACT', 'TAC'].map(x => Lex.label(by(x).analysis.tokens[0].node)).join(', ')}`);
        check('engram', 'words and summary: every distinct Lexicon word by speaker; text turns and synset share', imp.words.every(w => w.count === Object.values(w.bySource).reduce((a, b) => a + b, 0)) &&
            imp.summary.packets === P2.length && imp.summary.textTurns === 2 && imp.summary.gridPackets === 0 && imp.summary.synsetShare > 0, `${imp.words.length} words, synset share ${(100 * imp.summary.synsetShare).toFixed(0)}%`);
        const stream = EC.engramStream('The cat sat on the mat').stream, si = LP.engram.importText(Lex, stream);
        check('engram', 'an engram stream imports as grid-only packets: no text, no address (analysis null)', si.kind === 'engram_stream' && si.packets.length === 6 && si.packets.every(p => p.analysis === null) && si.summary.gridPackets === 6);
        let refusal = '';
        try { LP.engram.importText(Lex, JSON.stringify({ v: 1, nodes: [] })); } catch (e) { refusal = e.kind + ': ' + e.message; }
        check('engram', 'a lattice seed is refused with the pointer to Engram\'s 3D page', refusal.startsWith('lattice_seed') && refusal.includes('3D page'), refusal);
        const rl = LP.engram.readLocal();
        check('engram', 'readLocal() in Node: nothing found, no throw', rl.found === false && typeof rl.error === 'string');
    }

    // ------------------------------------------------------------------ parity of the core
    {
        const r = spawnSync('node', [path.join(SYS, 'tests', 'parity-lexicon.cjs'), '--quiet'], { encoding: 'utf8', maxBuffer: 64 << 20 });
        const m = /Parity: (\d+)\/(\d+) lines pass/.exec(r.stdout || '');
        check('core', 'node tests/parity-lexicon.cjs --quiet: 22,586/22,586 (lexicon_core.js unchanged)', r.status === 0 && m && m[1] === '22586' && m[2] === '22586', m ? m[0] : (r.stdout || '').slice(-200));
    }

    // ------------------------------------------------------------------ sizes
    const size = f => fs.statSync(path.join(SYS, f)).size;
    console.log(`info  sizes    load() ${loadMs} ms (${Object.entries(Lex.timings).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ')}); hl-pages.js ${fmt(size('assets/hl-pages.js'))} B; ` +
        `wordnet_nouns_v1.js ${fmt(size('data/wordnet_nouns_v1.js'))} B; wordnet_map_a_v1.js ${fmt(size('data/wordnet_map_a_v1.js'))} B; total ${((Date.now() - T0) / 1000).toFixed(1)} s`);
    console.log(`\n${pass}/${pass + fail} checks pass${fail ? `, ${fail} fail` : ''}${skip ? `, ${skip} skipped` : ''}  (${LP.version}, ${LC.version})`);
    process.exit(fail ? 1 : pass === 0 && skip ? 2 : 0);
})().catch(e => { console.error(e); process.exit(1); });

// ================================================================== the trace, regenerated from the engine
function randomWord(rng) {                     // lps.random_word: length 1 + below(60), item 9's draw
    const L = 1 + rng.below(60), w = [rng.below(6)];
    while (w.length < L) w.push(C.P.children(w)[rng.below(5)]);
    return w;
}
function traceLines(Lex) {
    const HEAD = [
        '# pages_v1: the page engine\'s outputs (Phase 5), written by reference/traces_pages.py; decides nothing',
        '# s <k> text|tok|id|h3|h2|dec|bits|f64|lps|pair|chart: sentence k through N_B, WordPiece (V0), map A, the D6 id,',
        '# exact points (coordinates p/q in lowest terms), greedy decoding, bits, float64 storage, X(5, q); pair and chart',
        '# lines join token i and i + 1 (their synset LCA, exact cosh; i + 1 in i\'s chart). p <k>: a BERT-style pair',
        '# [CLS] A [SEP] B [SEP] with segments 0/1 and the coupler (mirror, and the control same). e: engram/1 keys.',
        '# lps / lpsw: the X(5, q) graphs (L7) and 100 words from Rng(8400 + i), length 1 + below(60) (item 9).',
    ];
    const SENT = ['The dog chased the cat up the tree.', 'Oxygen and nitrogen are gases.', 'She can run, jump and swim.', 'Ünïcödé façade, naïve café — résumé!',
        'unbelievably, 12,345 apples!', 'Entity, physical entity, abstraction.', 'ΣΊΣΥΦΟΣ', '[CLS] literal brackets [SEP]', '', 'pneumonoultramicroscopicsilicovolcanoconiosis'];
    const PAIRS = [['The dog chased the cat.', 'The cat climbed the tree.'], ['Is oxygen a gas?', 'Yes, and so is nitrogen.'], ['She can run.', '']];
    const QS = [13, 17, 29], out = HEAD.slice();
    const bitsText = b => b.coords.map(([a, c]) => `${a}/${c}`).join(',');
    const synText = k => { const n = k === null ? null : Lex.node(k); return n ? `${n.pos}:${n.offset}` : '-'; };
    SENT.forEach((s, k) => {
        out.push(`s ${k} text ${JSON.stringify(s)}`);
        const T = Lex.analyse(s).tokens;
        T.forEach((tk, i) => {
            const w = tk.word, id = Lex.ids(w), p3 = Lex.point(3, w), p2 = Lex.point(2, w), d2 = Lex.decode(2, w), d3 = Lex.decode(3, w);
            out.push(`s ${k} tok ${i} ${tk.id} ${JSON.stringify(tk.piece)} ${tk.span[0]} ${tk.span[1]} ${tk.key} ${tk.root} ${tk.synset ? synText(tk.synset.key) : '-'}`);
            out.push(`s ${k} id ${i} ${id.id} ${id.id59 === null ? '-' : id.id59} ${id.id64 === null ? '-' : id.id64} ${id.certified ? 1 : 0}`);
            out.push(`s ${k} h3 ${i} ${LC.coordsText(p3.X, p3.den)}`);
            out.push(`s ${k} h2 ${i} ${LC.coordsText(p2.X, p2.den)}`);
            out.push(`s ${k} dec ${i} ${ws(d2.word)} ${d2.ties} ${ws(d3.word)} ${ws(d3.exactWord)}`);
            const b3 = Lex.bits(3, w), b2 = Lex.bits(2, w);
            out.push(`s ${k} bits ${i} ${bitsText(b3)} ${b3.point} ${bitsText(b2)} ${b2.point}`);
            out.push(`s ${k} f64 ${i} ${Lex.float64Kept(2, w)} ${Lex.float64Kept(3, w)}`);
            for (const q of QS) { const v = Lex.vertex(w, q); out.push(`s ${k} lps ${i} ${q} ${v.v} ${v.m.join(',')} ${v.dist} ${v.walk}`); }
        });
        for (let i = 0; i + 1 < T.length; i++) {
            const a = T[i].key, b = T[i + 1].key, l = Lex.lca(a, b);
            out.push(`s ${k} pair ${i} ${i + 1} ${l.lcp} ${synText(l.synset)} ${l.synset === null ? '-' : a.length + b.length - 2 * l.synset.length} ${Lex.cosh(3, a, b).text} ${Lex.cosh(2, a, b).text}`);
            const r2 = Lex.chart(2, a).place(b), r3 = Lex.chart(3, a).place(b);
            out.push(`s ${k} chart ${i} ${i + 1} h2 ${r2.R.map(x => lowest(x, r2.D)).join(' ')} h3 ${r3.R.map(x => lowest(x, r3.D)).join(' ')}`);
        }
    });
    PAIRS.forEach(([a, b], k) => {
        out.push(`p ${k} text ${JSON.stringify(a)} ${JSON.stringify(b)}`);
        const an = Lex.analyse(null, { pair: [a, b] });
        an.tokens.forEach(tk => out.push(`p ${k} tok ${tk.i} ${tk.segment} ${tk.id} ${tk.key}`));
        for (const law of ['mirror', 'same']) {
            const c = Lex.couple(an, { chirality: law });
            c.checks.forEach(x => out.push(`p ${k} cpl ${law} ${x.i} ${x.segment} ${x.ok ? 1 : 0}`));
            out.push(`p ${k} q ${law} ${c.q1.join(',')} ${c.q2.join(',')} ${c.issued[0]} ${c.issued[1]}`);
        }
    });
    for (const tok of ['THE', 'CAT', 'ACT', 'TAC', 'DOG', 'GOD', 'SAT']) out.push(`e ${tok} ${EC.hexLsb(EC.crystallize(tok))}`);
    for (const q of QS) { const G = Lex.lps(q); out.push(`lps ${q} n ${G.n} iota ${G.iota} diameter ${G.diameter} girth ${G.girth} r ${G.r}`); }
    for (let i = 0; i < 100; i++) { const w = randomWord(new C.Rng(8400 + i)); out.push(`lpsw ${i} ${ws(w)} ${QS.map(q => Lex.vertex(w, q).v).join(' ')}`); }
    return out;
}
