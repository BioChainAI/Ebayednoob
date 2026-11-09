// Three strict verifiers, case for case (overhaul E3, nightly; the Phase 2 exit criteria):
//   Owl      Owl Academy's verifyIntegrityStrict: the checkout's scripts/biomesh-core.js, its code taken by name and run
//            in owl_extract.cjs's sandbox (with Owl's own SHA-256)
//   Engram   EngramCore.verifyBiochainStrict: biochain_v2.js (Owl's core as pinned here) with orbital_core.js's SHA-256
//   Lexicon  the Hyperbolic Lexicon's verifyPackage, steps 1-6 (parity, canonical, crystal, leaves, weaves, derived):
//            lexicon_core.js, written apart from Owl's code, the independent oracle; only loaded, never changed
// on two corpora of the decided Phase 3 run (run_claims_phase3.cjs), rebuilt here from WordNet (the Lexicon's cache):
//   L8   its 336 records: the 148 C0 gloss shards and the 20 synthetic shards of Amendment 7 item 2, each grown by
//        growSync with engrams off and on. Every verifier must accept every one.
//   compat  the 26 records of the Lexicon's compat pin (reference/golden/biomesh_compat_v1.json: its 13 texts, engrams
//        off and on, as make_biomesh_compat_v1.cjs texts() makes them), checked against the SHA-256 that pin records.
//        Every verifier must accept every one.
//   L10  the record half of its tamper corpus: the 50 clean records and the 250 records of the record tampers T1
//        (leafHashes and merkleRoot deleted), T2 (a crystal32 bit, parity re-fixed), T7 (two frames swapped), T8 (the
//        chainId's last digit) and T9 (a residual flip that decodes to the same bytes), by the registered rules
//        (READING runner-9); T3-T6 alter the package, not the record. The three must name the same first failing check.
// Before anything is compared, every rebuilt record's SHA-256 (over its JSON) must be the one the decided run wrote,
// pinned in tests/contracts/strict_corpus_v1.json (and, for compat, in biomesh_compat_v1.json).
// Two differences are open in RFC 07 section 17 (where the hex-case and UTF-8 checks sit) and are NOTE lines, not
// failures: Owl and Engram fail at parity on hex-case drift and at canonical on ill-formed UTF-8, where the Lexicon names
// a later check. Every other difference fails, and so does any difference between Owl's and Engram's verdicts.
//
//   node tests/contracts/strict-verifiers.cjs [--owl <Owl-Academy checkout>]
//   node tests/contracts/strict-verifiers.cjs --write-pins     (once: strict_corpus_v1.json from the decided run's cache,
//                                                              ~/.cache/hyperbolic-lexicon/phase3: growsync-records.tsv,
//                                                              l10-packages.jsonl, l10-index.json)
// The checkout defaults to OWL_ACADEMY_DIR, else ../Owl-Academy (scripts/lib/siblings.cjs). Exits 0 when everything
// agrees, 1 on a difference or a rebuild that is not the decided run's, 2 when the checkout or WordNet is missing
// (skipped, never passed).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const siblings = require(path.join(ROOT, 'scripts', 'lib', 'siblings.cjs'));
const X = require(path.join(ROOT, 'Pages', 'Engram Minds Eye', 'reference', 'golden', 'owl_extract.cjs'));
const ARGS = process.argv.slice(2), owlAt = ARGS.indexOf('--owl'), WRITE = ARGS.includes('--write-pins');
const OWL = path.resolve(owlAt >= 0 ? ARGS[owlAt + 1] : siblings.dir('Owl-Academy'));
const PINS = path.join(__dirname, 'strict_corpus_v1.json');
const sha = s => crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const recSha = r => sha(JSON.stringify(r));
const T0 = Date.now(), secs = () => ((Date.now() - T0) / 1000).toFixed(1);
let failed = 0;
const line = (ok, label, detail = '') => { if (ok === false) failed++; console.log(`${ok === null ? 'NOTE' : ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`); };

// ---- --write-pins: the decided run's records, from its cache
if (WRITE) {
    const dir = path.join(siblings.cache(), 'phase3');
    const l8 = fs.readFileSync(path.join(dir, 'growsync-records.tsv'), 'utf8').split('\n').filter(Boolean).map(l => {
        const [k, v] = l.split('\t'), key = JSON.parse(k);
        return { name: key.name, mode: key.mode, sha256: recSha(JSON.parse(v)) };
    });
    const index = JSON.parse(fs.readFileSync(path.join(dir, 'l10-index.json'), 'utf8')), pk = fs.readFileSync(path.join(dir, 'l10-packages.jsonl'), 'utf8').split('\n').filter(Boolean);
    const l10 = index.map((x, i) => ({ id: x.id, cls: x.cls, shard: x.place.shard, sha256: recSha(JSON.parse(pk[i]).record) })).filter(x => ['clean', 'T1', 'T2', 'T7', 'T8', 'T9'].includes(x.cls));
    const out = { format: 'strict_corpus_v1', version: 1,
        note: 'The SHA-256 (over JSON.stringify) of every record of the decided Phase 3 run of the Hyperbolic Lexicon that tests/contracts/strict-verifiers.cjs rebuilds: L8 (growsync-records.tsv: 168 shards, engrams off and on) and the record half of L10 (l10-packages.jsonl: clean, T1, T2, T7, T8, T9). Written once from that run\'s cache with --write-pins; the records themselves are derived from WordNet 3.0 and are not stored here.',
        l8, l10 };
    fs.writeFileSync(PINS, JSON.stringify(out, null, 1) + '\n');
    console.log(`wrote ${path.relative(ROOT, PINS)}: ${l8.length} L8 records, ${l10.length} L10 records`);
    process.exit(0);
}

(async () => {
    // ---- the three verifiers
    if (!fs.existsSync(OWL)) { console.log(`skipped: no Owl-Academy checkout at ${OWL}`); process.exit(2); }
    const hit = X.locate(OWL, X.OWL_GROWER, ['verifyIntegrityStrict', 'strictLabel', 'verifyIntegrity']);
    if (!hit) { line(false, 'Owl-Academy\'s scripts/biomesh-core.js defines verifyIntegrityStrict', `not in ${OWL} (a checkout from before O3?)`); process.exit(1); }
    if (hit.conflicts.length) { line(false, 'Owl-Academy defines the strict verifier once', 'defined differently in more than one file'); process.exit(1); }
    const body = X.withHelpers(hit.src, ['verifyIntegrityStrict', 'strictLabel'].map(n => X.grab(hit.src, n)).join('\n'), X.HASH_PARAMS);
    const OWLV = X.sandbox().compile(X.HASH_PARAMS, body + '\nreturn { verifyIntegrityStrict, strictLabel };', X.HASH_INJECT)();
    const EC = require(path.join(ROOT, 'Pages', 'Engram Minds Eye', 'engram_core.js')), BC2 = require(path.join(ROOT, 'Pages', 'Engram Minds Eye', 'biochain_v2.js'));
    const LC = require(path.join(ROOT, 'Pages', 'Hyperbolic Lexicon', 'lexicon_core.js'));
    const HP = require(path.join(ROOT, 'Pages', 'Hyperbolic Oracles', 'hyperbolic_core.js'));
    const W = require(path.join(ROOT, 'Pages', 'Hyperbolic Lexicon', 'reference', 'golden', 'wordnet_v1.cjs'));
    let wn;
    try { wn = W.load(); } catch (e) { console.log(`skipped: no WordNet archive in the Lexicon's cache (${e.message}); fetch it with Pages/Hyperbolic Lexicon/reference/golden/make_wordnet_v1.cjs`); process.exit(2); }
    const kp = await LC.newKeyPair(), kv = LC.keyVectorOf(LC.identityIdOf(), LC.epochTokenOf('2026-11-08'));
    const reg = LC.registrySnapshot([{ publicJwk: kp.publicJwk, keyVector: kv, status: 'active' }]);
    const session = await LC.chainSession({ lvocab: LC.lvocab().text, laddr: 'LADDR/1|stand-in', registry: reg.text, registrySha256: reg.sha256 });
    const SKIP = ['commitment', 'attestation', 'inclusion', 'consistency'];
    console.log(`Owl-Academy ${X.headCommit(OWL) ? X.headCommit(OWL).slice(0, 7) : '?'} ${hit.file} (${hit.sha256.slice(0, 12)}…); biochain_v2.js from ${BC2.source.commit.slice(0, 7)}; lexicon_core.js ${LC.version}`);

    // ---- the corpora, rebuilt (run_claims_phase3.cjs: inputs, L8, L10)
    const pins = JSON.parse(fs.readFileSync(PINS, 'utf8'));
    const wmeta = JSON.parse(fs.readFileSync(path.join(ROOT, 'Pages', 'Hyperbolic Lexicon', 'reference', 'golden', 'wordnet_v1.meta.json'), 'utf8'));
    const c0 = LC.glossShards(wn, 'noun'), c0ok = c0.length === wmeta.c0.shards && c0.every((t, i) => sha(t) === wmeta.c0.shardSha256[i]);
    line(c0ok, 'C0: the 148 noun gloss shards of golden/wordnet_v1.meta.json', `${c0.length} shards`);
    if (!c0ok) process.exit(1);
    const shards = [...c0.map((text, i) => ({ name: `c0 ${String(i).padStart(3, '0')}`, text })),
        ...Array.from({ length: 20 }, (_, i) => ({ name: `synth ${String(i).padStart(2, '0')}`, text: LC.synthShard(1000 + i).text }))];
    const l8 = [];
    for (const s of shards) for (const mode of ['off', 'on']) l8.push({ name: s.name, mode, record: LC.growSync(s.text, { engrams: mode === 'on' }) });
    const l8bad = l8.filter((r, i) => !pins.l8[i] || pins.l8[i].name !== r.name || pins.l8[i].mode !== r.mode || pins.l8[i].sha256 !== recSha(r.record));
    line(!l8bad.length && l8.length === pins.l8.length, 'L8: the 336 records rebuilt are the decided run\'s, record for record', l8bad.length ? `${l8bad.length} differ, first ${l8bad[0].name} ${l8bad[0].mode}` : `${l8.length} records (${secs()} s)`);
    // the compat pin's 13 texts (make_biomesh_compat_v1.cjs texts(), in its order), grown engrams off and on
    const compatPin = JSON.parse(fs.readFileSync(path.join(ROOT, 'Pages', 'Hyperbolic Lexicon', 'reference', 'golden', 'biomesh_compat_v1.json'), 'utf8')).texts;
    const a = n => 'abcdefghijklmnopqrstuvwxyz '.repeat(Math.ceil(n / 27)).slice(0, n), big = (() => {
        const r = new HP.Rng(8100);
        let t = '';
        while (Buffer.byteLength(t) < 60000 - 3) t += r.below(3) ? String.fromCharCode(97 + r.below(26)) : r.below(2) ? ' ' : 'é';
        while (Buffer.byteLength(t) < 60000) t += 'z';
        return t;
    })(), verbs = LC.glossShards(wn, 'verb');
    const compatTexts = [...[0, 1, 2, 3].map(i => LC.synthShard(8000 + i).text), 'x', a(720), a(721), a(719) + 'é' + a(100), a(1000) + '\u{1D538}',
        "Owl's 3 tests: don't 42x, A1B2 'quoted' it's \u0080 café 中文 x'y'z 0 '' end", big, verbs[0], verbs[1]];
    const compat = [], compatBad = [];
    compatTexts.forEach((text, i) => {
        for (const mode of ['off', 'on']) {
            const record = LC.growSync(text, { engrams: mode === 'on' }), want = compatPin[i] && compatPin[i].records[mode];
            if (!want || want.record !== recSha(record)) compatBad.push(`${compatPin[i] ? compatPin[i].name : i} ${mode}`);
            compat.push({ id: `${compatPin[i] ? compatPin[i].name : i} ${mode}`, cls: `engrams ${mode}`, record });
        }
    });
    line(!compatBad.length && compat.length === 26 && compatPin.length === 13, 'compat: the 26 records rebuilt are those biomesh_compat_v1.json records', compatBad.join(', ') || `${compat.length} records`);
    // L10's clean set: Rng(1000 + i).below(148) until 50 distinct; record j of class k from Rng(2000 + 50(k - 1) + j)
    const N = c0.length, clean = [];
    for (let i = 0; clean.length < 50; i++) { const v = new HP.Rng(1000 + i).below(N); if (!clean.includes(v)) clean.push(v); }
    const offRec = new Map(l8.filter(r => r.mode === 'off' && r.name.startsWith('c0 ')).map(r => [Number(r.name.slice(3)), r.record]));
    const clone = o => JSON.parse(JSON.stringify(o)), lastDigit = s => s.slice(0, -1) + (s.endsWith('0') ? '1' : '0');
    const flipsCache = new Map(), BC = LC.chainCores().BC;
    function tamper(k, j) {
        const rng = new HP.Rng(2000 + 50 * (k - 1) + j), c = rng.below(clean.length), sIdx = clean[c], r = clone(offRec.get(sIdx)), s = r.stream, fo = LC.frameOffsets(s), K = fo.length;
        if (k === 1) { delete r.leafHashes; delete r.merkleRoot; }
        else if (k === 2) { const f = rng.below(K), bit = rng.below(32), at = fo[f][0]; r.stream = s.slice(0, at) + LC.refixParity(LC.word16(BigInt('0x' + s.slice(at, at + 16)) ^ (1n << BigInt(24 + bit)))) + s.slice(at + 16); }
        else if (k === 7) r.stream = LC.swapFrames(s, rng.below(K - 1));
        else if (k === 8) r.chainId = lastDigit(r.chainId);
        else if (k === 9) {
            const fr = LC.framesStrict(s);
            for (let tries = 0; ; tries++) {
                if (tries > 10000) throw new Error('no frame with a silent flip');
                const f = rng.below(K), key = `${sIdx}|${f}`;
                if (!flipsCache.has(key)) flipsCache.set(key, LC.silentFlips(fr[f].residual, Uint8Array.from(BC.decodeChunk(fr[f].residual, fr[f].chunkLen))));
                const flips = flipsCache.get(key);
                if (!flips.length) continue;
                const fl = flips[rng.below(flips.length)], [, r0, rl] = fo[f];
                r.stream = s.slice(0, r0) + fl.alt + s.slice(r0 + rl);
                break;
            }
        }
        return r;
    }
    const l10 = clean.map((sIdx, c) => ({ id: `clean ${c}`, cls: 'clean', record: offRec.get(sIdx) }));
    for (const k of [1, 2, 7, 8, 9]) for (let j = 0; j < 50; j++) l10.push({ id: `T${k}.${j}`, cls: `T${k}`, record: tamper(k, j) });
    const l10bad = l10.filter((r, i) => !pins.l10[i] || pins.l10[i].id !== r.id || pins.l10[i].sha256 !== recSha(r.record));
    line(!l10bad.length && l10.length === pins.l10.length, 'L10: the 300 records of the record classes rebuilt are the decided run\'s, record for record', l10bad.length ? `${l10bad.length} differ, first ${l10bad[0].id}` : `${l10.length} records (${secs()} s)`);
    if (l8bad.length || l10bad.length || compatBad.length) process.exit(1);

    // ---- the verdicts
    const ORDER = ['parity', 'canonical', 'crystal', 'leaves', 'weaves', 'derived'];
    async function verdicts(rec) {
        const o = OWLV.verifyIntegrityStrict(rec), e = EC.verifyBiochainStrict(BC2, rec), l = await LC.verifyPackage(session, { record: rec }, { skip: SKIP });
        const last = v => (v.ok ? null : v.checks[v.checks.length - 1]);
        return { owl: o.ok ? null : o.failed, owlDetail: o.ok ? '' : last(o).detail, engram: e.ok ? null : e.failed, lexicon: l.failed === '-' ? null : l.failed,
            lexiconDetail: (l.checks.find(c => c.ok === false) || {}).detail || '' };
    }
    const openClass = v => {
        if (v.owl === 'parity' && /upper-case|lower-case/.test(v.owlDetail) && ORDER.indexOf(v.lexicon) > 0) return 'hex case';
        if (v.owl === 'canonical' && /well-formed UTF-8/.test(v.owlDetail) && (v.lexicon === null || ORDER.indexOf(v.lexicon) > 1)) return 'ill-formed UTF-8';
        return null;
    };
    for (const [set, list, want] of [['L8', l8.map(r => ({ id: `${r.name} ${r.mode}`, cls: `engrams ${r.mode}`, record: r.record })), true], ['compat', compat, true], ['L10', l10, null]]) {
        const byCls = {}, diffs = [], owlEngram = [], open = {};
        for (const x of list) {
            const v = await verdicts(x.record), b = (byCls[x.cls] = byCls[x.cls] || {});
            const key = v.owl || 'ok';
            b[key] = (b[key] || 0) + 1;
            if (v.owl !== v.engram) owlEngram.push(`${x.id}: Owl ${v.owl}, Engram ${v.engram}`);
            if (want && v.owl !== null) diffs.push(`${x.id}: Owl rejects it at ${v.owl} (${v.owlDetail})`);
            if (v.owl !== v.lexicon) {
                const oc = openClass(v);
                if (oc) (open[oc] = open[oc] || []).push(`${x.id} (Lexicon ${v.lexicon || 'accepts'})`);
                else diffs.push(`${x.id}: Owl ${v.owl || 'accepts'}, Lexicon ${v.lexicon || 'accepts'}${v.lexiconDetail ? ` (${v.lexiconDetail})` : ''}`);
            }
        }
        const summary = Object.entries(byCls).map(([c, m]) => `${c}: ${Object.entries(m).map(([k, n]) => `${k} ${n}`).join(', ')}`).join('; ');
        line(!owlEngram.length, `${set}: Engram's verdict (biochain_v2.js) is the checkout's (Owl), case for case`, owlEngram.slice(0, 3).join('; ') || `${list.length} records`);
        line(!diffs.length, want ? `${set}: Owl, Engram and the Lexicon (steps 1-6) accept every record` : `${set}: Owl, Engram and the Lexicon (steps 1-6) name the same first failing check, case for case`,
            diffs.length ? `${diffs.length} differ: ${diffs.slice(0, 3).join('; ')}` : summary);
        for (const [k, l] of Object.entries(open)) line(null, `${set}: ${l.length} record(s) where the order of the ${k} check is open (RFC 07 section 17)`, l.slice(0, 3).join('; '));
    }
    console.log(`\n${failed ? `${failed} FAIL` : 'the three strict verifiers agree'} (${secs()} s)`);
    process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
