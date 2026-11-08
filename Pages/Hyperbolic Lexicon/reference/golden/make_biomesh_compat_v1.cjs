// Hyperbolic Lexicon, Phase 3: lexicon_core.js's growSync against Owl Academy's and BioChain-AI's own growers, field
// for field, on a fixed set of unregistered texts; golden/biomesh_compat_v1.json records the outcome.
//
//   node "Pages/Hyperbolic Lexicon/reference/golden/make_biomesh_compat_v1.cjs" [<Owl-Academy> <BioChain-AI>] [--check]
//
// Owl-Academy scripts/biomesh.js (7f45f35) and BioChain-AI src/biomesh/biomesh.js (c975161) run unchanged, by
// name-grab (spike S4's loadOwl; Pages/Engram Minds Eye/reference/golden/owl_extract.cjs, whose grab takes the same
// text as owl_eye.cjs's on these files),
// their sha256Hex stood in for by a SHA-256 over UTF-8 (seal-crypto.js and crypto-core.js both hash a string's UTF-8
// with Web Crypto), in a vm context without process or require. Both checkouts are only read (default: OWL_ACADEMY_DIR
// and BIOCHAIN_AI_DIR, else beside this repository; scripts/lib/siblings.cjs). For each text, engrams off and on:
// growSync, Owl's growBiochain and BioChain-AI's growBiochain; the fields that differ (PREREGISTRATION.md L8's fifteen,
// and key order); Owl's and BioChain-AI's verifyIntegrity on growSync's record. biomesh_compat_v1.json is a v1 pin and
// frozen: without --check it is written only when absent.
//
// --check compares content, not commits (owl_extract.cjs's checkPin), fields beginning with "~" (times) aside:
//   reproduction   the file rebuilt from the pinned content of both biomesh.js files (found by SHA-256 in the checkout
//                  or its git history) must match; if that content or the WordNet archive is missing the check is
//                  skipped (exit 2), never passed
//   live contract  the current growers (the Firebase-free core first, then biomesh.js) must give the same records and
//                  verdicts (everything but "sources"), and on the differential set (owl_extract.cjs: a 1,539-byte
//                  three-chunk record grown by the pinned Owl code, with one field altered at a time, legacy records,
//                  the grow cap) each verifyIntegrity and growBiochain must give its pinned code's verdicts, and
//                  BioChain-AI's must also give Owl's pinned verdicts. When every function and constant they are made
//                  of has the pinned text the result is the reproduction's and is not recomputed; otherwise all 26
//                  records are grown again.
// "sources" is provenance: a changed commit or file is a NOTE, and sameAsOwl, kept in the file, is reported as
// bodiesMatch, function by function, between biochain_v1.js and the current Owl grower. Exits 1 on any difference.
//
// The texts (none is a registered instance): Rng(8000 + i), i = 0..3, through Amendment 7 item 2's generator
// (lexicon_core.js synthShard; L8 draws Rng(1000 + i), its dry run Rng(4000 + i)); seven edge texts (one byte, one
// chunk exactly, one byte over, a two-byte character across the first chunk boundary, a four-byte character at the
// end, engram tokens with digits and apostrophes, and 60,000 bytes exactly); and the first two WordNet verb gloss
// shards as spike S4 cut them (dry-run data, Amendment 7 item 8).
//
// RUNTIME. About 2 minutes: Owl's and BioChain-AI's verbatim engram layer takes ~7 s per 60 KB of gloss text, and each
// verifyIntegrity runs it again. --check takes as long, and twice as long when the growers' code has changed.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SYS = path.join(__dirname, '..', '..');
const LC = require(path.join(SYS, 'lexicon_core.js'));
const W = require('./wordnet_v1.cjs');
const X = require(path.join(SYS, '..', 'Engram Minds Eye', 'reference', 'golden', 'owl_extract.cjs'));
const siblings = require(path.join(SYS, '..', '..', 'scripts', 'lib', 'siblings.cjs'));
const OUT = path.join(__dirname, 'biomesh_compat_v1.json');

const args = process.argv.slice(2), check = args.includes('--check'), pos = args.filter(a => !a.startsWith('--'));
const OWL = path.resolve(pos[0] || siblings.dir('Owl-Academy')), BIOCHAIN = path.resolve(pos[1] || siblings.dir('BioChain-AI'));
const F_OWL = 'scripts/biomesh.js', F_BIO = 'src/biomesh/biomesh.js';
const sha256Node = s => crypto.createHash('sha256').update(typeof s === 'string' ? Buffer.from(s, 'utf8') : s).digest('hex');

// growBiochain and verifyIntegrity of a biomesh.js source, run as written (spike S4's loadOwl), in a sandbox
function loadGrower(src, file, commit) {
    return { file, commit, sha256: sha256Node(src), ...X.growerFromSource(src) };
}

function texts() {
    const out = [];
    for (let i = 0; i < 4; i++) { const s = LC.synthShard(8000 + i); out.push({ name: `synth ${8000 + i}`, origin: `Amendment 7 item 2's generator on Rng(${8000 + i}) (${s.draws} draw${s.draws > 1 ? 's' : ''})`, text: s.text }); }
    const a = n => 'abcdefghijklmnopqrstuvwxyz '.repeat(Math.ceil(n / 27)).slice(0, n);
    out.push({ name: 'edge one byte', origin: 'the letter x', text: 'x' });
    out.push({ name: 'edge 720', origin: '720 ASCII bytes: one chunk exactly', text: a(720) });
    out.push({ name: 'edge 721', origin: '721 ASCII bytes: one byte into a second chunk', text: a(721) });
    out.push({ name: 'edge split', origin: 'U+00E9 across the first chunk boundary (bytes 719-720)', text: a(719) + 'é' + a(100) });
    out.push({ name: 'edge four-byte end', origin: 'U+1D538 as the last four bytes', text: a(1000) + '\u{1D538}' });
    out.push({ name: 'edge tokens', origin: 'engram tokens with digits and apostrophes, and a 0x80 byte', text: "Owl's 3 tests: don't 42x, A1B2 'quoted' it's \u0080 café 中文 x'y'z 0 '' end" });
    const r = new (require(path.join(SYS, '..', 'Hyperbolic Oracles', 'hyperbolic_core.js')).Rng)(8100);
    let big = '';
    while (Buffer.byteLength(big) < 60000 - 3) big += r.below(3) ? String.fromCharCode(97 + r.below(26)) : r.below(2) ? ' ' : 'é';
    while (Buffer.byteLength(big) < 60000) big += 'z';
    out.push({ name: 'edge 60000', origin: '60,000 bytes exactly: letters, spaces and U+00E9 from Rng(8100)', text: big });
    const wn = W.load(), verbs = LC.glossShards(wn, 'verb');
    for (let k = 0; k < 2; k++) out.push({ name: `verb ${String(k).padStart(2, '0')}`, origin: `WordNet 3.0 verb gloss shard ${k} (spike S4's cut; dry-run data)`, text: verbs[k] });
    return out;
}

// The result for the two sources (S: file -> text); `sources` is the provenance block written into it (v1's own in a
// reproduction). Returns { text, ok, line }.
async function build(S, sources) {
    const t0 = Date.now();
    const owl = loadGrower(S[F_OWL], F_OWL), bio = loadGrower(S[F_BIO], F_BIO);
    const result = {
        definition: 'lexicon_core.js growSync against Owl Academy\'s and BioChain-AI\'s growBiochain (unchanged, name-grab, Node crypto SHA-256 over UTF-8), engrams off and on; diff: the fields that differ among PREREGISTRATION.md L8\'s fifteen (and "(key order)"); verify: each verifyIntegrity on growSync\'s record; record: SHA-256 of growSync\'s record as JSON.stringify writes it',
        sources,
        texts: [],
    };
    let total = 0, owlSame = 0, bioSame = 0, owlOk = 0, bioOk = 0;
    for (const t of texts()) {
        const data = Buffer.from(t.text, 'utf8'), t1 = Date.now(), off = LC.growSync(t.text, { engrams: false }), msOff = Date.now() - t1;
        const entry = { name: t.name, origin: t.origin, bytes: data.length, sha256: sha256Node(data), chunks: off.leafHashes.length,
            chunks80: LC.framesStrict(off.stream).filter(f => LC.crystalHas80(f.packet)).length, records: {} };
        for (const mode of ['off', 'on']) {
            const opts = { engrams: mode === 'on' }, ta = Date.now();
            const mine = mode === 'off' ? off : LC.growSync(t.text, opts), msMine = mode === 'off' ? msOff : Date.now() - ta;
            const tb = Date.now(), o = await owl.growBiochain(t.text, opts), msOwl = Date.now() - tb;
            const b = await bio.growBiochain(t.text, opts);
            const vo = await owl.verifyIntegrity(mine), vb = await bio.verifyIntegrity(mine);
            const dOwl = LC.recordDiff(mine, o), dBio = LC.recordDiff(mine, b);
            total++; owlSame += !dOwl.length; bioSame += !dBio.length; owlOk += vo.ok; bioOk += vb.ok;
            entry.records[mode] = { record: sha256Node(JSON.stringify(mine)), chainId: mine.chainId, merkleRoot: mine.merkleRoot, value: mine.value,
                owlDiff: dOwl, biochainDiff: dBio, owlVerify: vo.ok, biochainVerify: vb.ok, '~ms': { growSync: msMine, owl: msOwl } };
            if (!check) console.log(`  ${t.name.padEnd(20)} engrams ${mode.padEnd(3)}  Owl ${dOwl.length ? 'DIFFERS: ' + dOwl.join(',') : 'equal'}  BioChain-AI ${dBio.length ? 'DIFFERS: ' + dBio.join(',') : 'equal'}  verifyIntegrity ${vo.ok}/${vb.ok}  ~${msMine}/${msOwl} ms`);
        }
        result.texts.push(entry);
    }
    result.summary = { records: total, equalToOwl: owlSame, equalToBiochain: bioSame, owlVerifyIntegrityAccepts: owlOk, biochainVerifyIntegrityAccepts: bioOk };
    const ok = owlSame === total && bioSame === total && owlOk === total && bioOk === total;
    return { text: JSON.stringify(result, null, 1) + '\n', ok,
        line: `growSync equal to Owl's record ${owlSame}/${total}, to BioChain-AI's ${bioSame}/${total}; Owl's verifyIntegrity accepts ${owlOk}/${total}, BioChain-AI's ${bioOk}/${total}  (~${((Date.now() - t0) / 1000).toFixed(1)} s)` };
}

// times ("~" keys) are never compared; the live contract also leaves out the provenance ("sources")
const strip = (text, keys = []) => JSON.parse(text, (k, v) => (k.startsWith('~') || keys.includes(k) ? undefined : v));
const BC = LC.chainCores().BC;
if (!fs.existsSync(W.ZIP_PATH)) { console.log(`skipped: no WordNet archive at ${W.ZIP_PATH} (run reference/golden/make_wordnet_v1.cjs)`); process.exit(2); }
if (check) {
    if (!fs.existsSync(OUT)) { console.log(`FAIL  ${OUT} is missing: run without --check`); process.exit(1); }
    const v1 = JSON.parse(fs.readFileSync(OUT, 'utf8')), rec = v1.sources;
    const live = { owl: null, biochain: null, biochain_v1: null };
    const OUT_BC = path.join(SYS, '..', 'Engram Minds Eye', 'biochain_v1.js');
    X.checkPin({
        name: 'make_biomesh_compat_v1 (biomesh_compat_v1.json)',
        repos: [{ name: 'Owl-Academy', root: OWL }, { name: 'BioChain-AI', root: BIOCHAIN }],
        sources: [
            { repo: 'Owl-Academy', file: F_OWL, sha256: rec.owl.sha256, candidates: X.OWL_GROWER, names: X.GROWER_NAMES },
            { repo: 'BioChain-AI', file: F_BIO, sha256: rec.biochain.sha256, candidates: X.BIOCHAIN_GROWER, names: X.GROWER_NAMES },
        ],
        outputs: [{ label: 'biomesh_compat_v1.json (times aside)', path: OUT }],
        build: async (S, mode) => {
            const b = await build(S, mode === 'reproduction' ? rec : live);
            console.log(`${mode.padEnd(12)} ${b.line}`);
            // reproduction compares the text, times aside: the times of the v1 file are put back
            const t = JSON.parse(b.text), old = JSON.parse(fs.readFileSync(OUT, 'utf8'));
            t.texts.forEach((x, i) => { for (const m of ['off', 'on']) if (old.texts[i] && old.texts[i].records[m] && x.records[m]) x.records[m]['~ms'] = old.texts[i].records[m]['~ms']; });
            return [JSON.stringify(t, null, 1) + '\n'];
        },
        behaviour: texts => strip(texts[0], ['sources']),
        // the growers are made of these texts only: when all of them are unchanged, so is every record and verdict
        liveSkip: (P, L) => {
            const names = X.GROWER_NAMES, same = f => X.changedBodies(P[f], L[f], names).length === 0;
            return same(F_OWL) && same(F_BIO) ? `the ${names.length - X.CONST_NAMES.length} functions and ${X.CONST_NAMES.length} constants of both growers have the pinned text` : null;
        },
        // the verifiers' reject paths (biomesh_compat_v1.json verifies only growSync's valid records) and the grow cap
        differential: async (P, L) => {
            const po = X.growerFromSource(P[F_OWL]), lo = X.growerFromSource(L[F_OWL]), pb = X.growerFromSource(P[F_BIO]), lb = X.growerFromSource(L[F_BIO]);
            const base = await po.growBiochain('abcdefghijklmnopqrstuvwxyz '.repeat(56).slice(0, 1500) + " Owl's 3 tests: don't 42x, café 中文");
            const owl = await X.differential(po, lo, base), bio = await X.differential(pb, lb, base);
            return [...owl.map(x => ({ ...x, label: `Owl-Academy, ${x.label}` })), ...bio.map(x => ({ ...x, label: `BioChain-AI, ${x.label}` })),
                ...bio.map((x, i) => ({ label: `BioChain-AI against Owl-Academy's pinned code, ${x.label}`, want: owl[i].want, got: x.got }))];
        },
        bodies: [
            { file: F_OWL, names: X.GROWER_NAMES, pinned: () => X.findSource(OWL, F_OWL, rec.owl.sha256, X.hints('Owl-Academy', F_OWL)).src },
            { file: F_BIO, names: X.GROWER_NAMES, pinned: () => X.findSource(BIOCHAIN, F_BIO, rec.biochain.sha256, X.hints('BioChain-AI', F_BIO)).src },
        ],
        commitNotes: () => {
            const out = [], o = X.headCommit(OWL), b = X.headCommit(BIOCHAIN);
            if (o && rec.owl.commit && o !== rec.owl.commit) out.push(`Owl-Academy HEAD is ${o.slice(0, 7)}, v1 recorded ${rec.owl.commit.slice(0, 7)}`);
            if (b && rec.biochain.commit && b !== rec.biochain.commit) out.push(`BioChain-AI HEAD is ${b.slice(0, 7)}, v1 recorded ${rec.biochain.commit.slice(0, 7)}`);
            // sameAsOwl, kept in the file, as bodiesMatch: biochain_v1.js's functions against the current Owl grower
            const cur = X.locate(OWL, X.OWL_GROWER, X.GROWER_NAMES);
            if (cur && !cur.conflicts.length) {
                const diff = X.changedBodies(fs.readFileSync(OUT_BC, 'utf8'), cur.src, X.SYNC);
                out.push(`biochain_v1 bodiesMatch ${X.SYNC.length - diff.length}/${X.SYNC.length} with ${cur.file}${diff.length ? ` (differ: ${diff.join(', ')})` : ''}; sameAsOwl recorded ${rec.biochain_v1.sameAsOwl} (whole-file SHA-256, not compared)`);
            }
            return out;
        },
    }).catch(e => { console.error(e); process.exit(1); });
} else {
    (async () => {
        for (const [root, f] of [[OWL, F_OWL], [BIOCHAIN, F_BIO]]) if (!fs.existsSync(path.join(root, f))) { console.error(`missing ${path.join(root, f)}`); process.exit(2); }
        const S = { [F_OWL]: fs.readFileSync(path.join(OWL, F_OWL), 'utf8'), [F_BIO]: fs.readFileSync(path.join(BIOCHAIN, F_BIO), 'utf8') };
        const sources = {
            owl: { repository: 'BioChainAI/Owl-Academy', file: F_OWL, commit: X.headCommit(OWL), sha256: sha256Node(S[F_OWL]) },
            biochain: { repository: 'BioChainAI/BioChain-AI', file: F_BIO, commit: X.headCommit(BIOCHAIN), sha256: sha256Node(S[F_BIO]) },
            biochain_v1: { file: 'Pages/Engram Minds Eye/biochain_v1.js', generatedFrom: BC.source, sameAsOwl: BC.source.sha256 === sha256Node(S[F_OWL]) },
        };
        const b = await build(S, sources);
        console.log(b.line);
        console.log(`biomesh_compat_v1.json ${X.writeFrozen(OUT, b.text)}`);
        process.exit(b.ok ? 0 : 1);
    })().catch(e => { console.error(e); process.exit(1); });
}
