// Owl Academy's and BioChain-AI's own growBiochain and verifyIntegrity, run unchanged by name-grab (spike S4's
// loadOwl recipe), for tests/test_chain.py: the Python grower is compared with them field for field.
//
//   node owl_biomesh.cjs <Owl-Academy checkout> <BioChain-AI checkout> [--live] < request.json > response.json
//
// request:  {"grow": [{"text": str, "engrams": bool}, ...], "verify": [record, ...]}
// response: {"owlSha": hex, "biochainSha": hex, "owl": [record], "biochain": [record],
//            "owlVerify": [{ok, reasons}], "biochainVerify": [{ok, reasons}], "owlFrom": str, "biochainFrom": str}
// By default it runs the pinned content, the files L8 was measured against (SHA-256 and commit in
// Pages/Engram Minds Eye/biochain_v1.provenance.json), found in the working tree or else in git history, so an
// upstream commit does not change what the Python port is compared with; owlSha and biochainSha are the SHA-256 of the
// files run. --live runs the checkouts' current growers instead (the Firebase-free core first, then biomesh.js); the
// pin check make_biomesh_compat_v1.cjs --check compares those with v1. Exits 2 when a checkout or the pinned content is
// missing (a shallow clone, say). Both checkouts are only read, and their code runs in a vm context without process or
// require (Pages/Engram Minds Eye/reference/golden/owl_extract.cjs); SHA-256 over UTF-8 stands in for seal-crypto's /
// crypto-core's sha256Hex as S4 and make_bridges_v1.cjs do. Owl's engram layer is its verbatim engramStreamFromText
// (about 7 s per 60 KB shard): keep engrams-on texts short.
'use strict';
const fs = require('fs');
const X = require('../../../Engram Minds Eye/reference/golden/owl_extract.cjs');

const ARGS = process.argv.slice(2), LIVE = ARGS.includes('--live');
const [owlDir, bioDir] = ARGS.filter(a => !a.startsWith('--'));
const P = X.provenance().sources;

function load(repo, root, file, candidates) {
    if (!root || !fs.existsSync(root)) { console.error(`skipped: no ${repo} checkout at ${root}`); process.exit(2); }
    let src, from;
    if (LIVE) {
        const g = X.loadGrower(root, candidates);
        if (!g) { console.error(`no grower in ${repo} (${candidates.join(' or ')})`); process.exit(1); }
        return { sha: g.sha256, from: `${g.file} (working tree)`, growBiochain: g.growBiochain, verifyIntegrity: g.verifyIntegrity };
    } else {
        const pin = P[`${repo}:${file}`], hit = X.findSource(root, file, pin.sha256, [pin.commit]);
        if (!hit) { console.error(`skipped: the pinned ${repo} ${file} (${pin.sha256.slice(0, 12)}…) is not in the checkout or its git history`); process.exit(2); }
        src = hit.src; from = `${file} (${hit.where})`;
    }
    return { sha: X.sha256(src), from, ...X.growerFromSource(src) };
}

async function main() {
    const owl = load('Owl-Academy', owlDir, 'scripts/biomesh.js', X.OWL_GROWER);
    const bio = load('BioChain-AI', bioDir, 'src/biomesh/biomesh.js', X.BIOCHAIN_GROWER);
    const req = JSON.parse(fs.readFileSync(0, 'utf8'));
    const out = { owlSha: owl.sha, biochainSha: bio.sha, owl: [], biochain: [], owlVerify: [], biochainVerify: [], owlFrom: owl.from, biochainFrom: bio.from };
    for (const g of req.grow || []) {
        out.owl.push(await owl.growBiochain(g.text, { engrams: g.engrams }));
        out.biochain.push(await bio.growBiochain(g.text, { engrams: g.engrams }));
    }
    for (const r of req.verify || []) {
        out.owlVerify.push(await owl.verifyIntegrity(r));
        out.biochainVerify.push(await bio.verifyIntegrity(r));
    }
    process.stdout.write(JSON.stringify(out));
}
main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
