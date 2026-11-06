// Hyperbolic Lexicon: the system map, drawn on the hub in full and on every explainer as a focused chart.
// One list of nodes and edges serves every page. When a module is added or built, change its node here (its
// status, its explainer) and every chart in the folder picks it up. The renderer is Hyperbolic Oracles'
// hp-map.js, unchanged apart from its names and one status ('both': built in Python and JS), as Engram Mind's Eye's
// em-map.js is, so the three maps read alike.
//
//   <div data-hl-map="full"></div>                    the whole system, four columns, click a node for details
//   <div data-hl-map="focus" data-node="addr"></div>  what one node draws on (left) and feeds (right)
//
// Paths in `href` and `explainer` are relative to the Hyperbolic Lexicon folder; a page one level down sets
// <body data-root="../">. Absolute URLs are used as they are.
(function () {
    const KIND = {
        source: { name: 'Outside source', color: '#f5c542' },
        existing: { name: 'Ebayednoob system', color: '#94a3b8' },
        math: { name: 'Mathematics', color: '#c084fc' },
        comp: { name: 'Stage or layer', color: '#22d3ee' },
        artifact: { name: 'Page, data or code', color: '#34d399' }
    };
    const STATUS = {
        source: 'source', existing: 'built earlier', done: 'done', built: 'built in the Python reference', both: 'built in Python and JS', design: 'designed, not built', next: 'next to build', planned: 'planned'
    };
    const GH = 'https://github.com/BioChainAI/';
    const ANA = 'explainers/analysis.html', SHD = 'explainers/shdccp.html', ARC = 'explainers/architecture.html', BIO = 'explainers/biochains.html';
    const ALT = 'explainers/alternatives.html', TRK = 'explainers/tracks.html', BEN = 'explainers/benchmarks.html', EVI = 'explainers/evidence.html';
    const HO = '../Hyperbolic%20Oracles/', EM = '../Engram%20Minds%20Eye/';

    // col: 0 sources and systems, 1 mathematics, 2 stages and layers, 3 pages, data and code. row: position in the column.
    const NODES = [
        { id: 'shdspec', col: 0, row: 0, kind: 'source', status: 'source', label: 'SHD-CCP specification', sub: 'RFC 01 tile · Ontology · SHDGEV01',
          desc: 'The SHD-CCP repository: a specification scaffold. RFC 01 drafts the 64-bit tile with Form ID at bits 36-39; the Kernel Ontology puts its Form header at 60-63 and records the clash as open; exact CRT, Gram-TQF and Hurwitz code in six bindings; the SHDGEV01 golden-vector format. It has no chain format, and Lemma 15 (Merkle integrity) is a TODO.',
          refs: 'BioChainAI/SHD-CCP @ 97d90ac', explainer: SHD + '#layers', href: GH + 'SHD-CCP' },
        { id: 'biomesh', col: 0, row: 1, kind: 'source', status: 'source', label: 'Working SHD-CCP', sub: 'Blackwell word · shdccp/2 stream',
          desc: 'What actually runs: the Blackwell 64-bit word (form 63..60, parity 59, spin, quat32, payload16, freq, amp) and the shdccp/2 stream of Owl Academy and BioChain-AI biomesh.js: 720-byte chunks, a lossless rank coder, form-9 crystal packets, SHA-256 leaves, a Merkle root, a float chiral weave, ECDSA attestations. Engram Mind’s Eye pins it verbatim as biochain_v1.js.',
          refs: 'Owl scripts/biomesh.js · BioChain-AI src/biomesh/biomesh.js', explainer: SHD + '#working', href: GH + 'Owl-Academy/blob/main/scripts/biomesh.js' },
        { id: 'wordnet', col: 0, row: 2, kind: 'source', status: 'source', label: 'WordNet 3.0', sub: '82,115 nouns · 743,241 closure edges',
          desc: 'Princeton WordNet 3.0 from nltk_data on GitHub, pinned by SHA-256 (cbda5ea6…). 82,115 noun synsets with one spanning root (entity.n.01), 743,241 hypernym closure edges (the Nickel and Kiela count), a mammal closure of 1,182 synsets, 147,306 lemma types. The WordNet licence allows use and redistribution with its notice kept.',
          refs: 'reference/golden/wordnet_v1.meta.json', explainer: BEN + '#stage1' },
        { id: 'ewt', col: 0, row: 3, kind: 'source', status: 'source', label: 'UD English EWT', sub: '16,622 sentences · CC BY-SA 4.0',
          desc: 'Universal Dependencies English Web Treebank at commit 4a4d77f: 12,544 train, 2,001 dev and 2,077 test sentences. Instance (b) of L1 (tokenizer determinism) and, later, the structural and Poincaré probes. Pinned by hashes; no text is committed.',
          refs: 'reference/golden/ewt_v1.meta.json', explainer: BEN + '#stage0' },
        { id: 'bertvocab', col: 0, row: 4, kind: 'source', status: 'source', label: 'BERT vocabulary (V1)', sub: '30,522 WordPiece entries · pinned',
          desc: 'The bert-base-uncased vocabulary (Apache-2.0), the second vocabulary cell of L1 and Stage 2’s tokenizer. huggingface.co became reachable at the start of Phase 1, so V1 is pinned at revision 86b5e09 (vocab.txt SHA-256 07eced37…, 30,522 entries), kept in the cache outside git, and L1’s second cell is in force (Amendment 1). The in-house V0 still decides L1.',
          refs: 'D4 · reference/golden/vocab_v1.meta.json', explainer: ARC + '#tokenize' },
        { id: 'babylm', col: 0, row: 5, kind: 'source', status: 'planned', label: 'BabyLM, BLiMP, GLUE', sub: 'Stages 3-4 · Hugging Face · a GPU',
          desc: 'The small-pretraining and encoder benchmarks: BabyLM strict-small (10M words) and strict (100M), BLiMP (on GitHub), GLUE and a cheap MTEB subset. Since the network was widened at the start of Phase 1, Hugging Face is reachable here; osf.io’s file downloads still redirect to a blocked store, and BabyLM is also on Hugging Face. Stage 4 needs a GPU, on the user’s hardware.',
          refs: 'Stages 3-4', explainer: BEN + '#stage3' },
        { id: 'ho', col: 0, row: 6.5, kind: 'existing', status: 'existing', label: 'Hyperbolic Oracles cores', sub: 'tree · decoder3d · fence · PolyStep',
          desc: 'Loaded unchanged: hyperbolic_core.js (the norm-5 tree P, exact rationals Q, the shared Rng, hyperboloid tools, PolyStepH), decoder3d.js (the exact octahedral tree in H³), fence.js (dyadic snapping, the 0.7 fence and the ln 2 guard) and twin3d.js (quaternion frames).',
          refs: 'Pages/Hyperbolic Oracles', href: HO + 'index.html' },
        { id: 'engram', col: 0, row: 7.5, kind: 'existing', status: 'existing', label: 'Engram Mind’s Eye', sub: 'engram/1 · biochain codec · bridges',
          desc: 'Loaded unchanged: ttmpt_core_v1.js (engram/1, kept here only as a compatibility checksum), biochain_v1.js (the verbatim SHD-CCP codec, on which the Phase 3 grower runs) and engram_core.js (verifyBiochain, importBiochain, the exact chain quaternion of the exact weave). Every lexicon shard is a biochain Engram imports: in Phase 3, importBiochain recreated the text of every one of the 336 records byte for byte (L8(c)).',
          refs: 'Pages/Engram Minds Eye', href: EM + 'index.html' },
        { id: 'orbital', col: 0, row: 8.5, kind: 'existing', status: 'existing', label: 'Orbital core', sub: 'SHA-256 · tiles · linear Merkle chain',
          desc: 'The orbital calculators’ exact code (scripts/geometric-build/orbital_core.js): SHA-256 and byte helpers used by the records. Its Lemma 15 Merkle chain is a linear backward chain, a different structure from the biochain Merkle tree; the two are named apart.',
          refs: 'scripts/geometric-build/orbital_core.js', href: '../../scripts/geometric-build/orbital_core.js' },

        { id: 'lps', col: 1, row: 0, kind: 'math', status: 'existing', label: 'LPS p = 5 tree', sub: '1±2i, 1±2j, 1±2k · 6-regular',
          desc: 'The norm-5 quaternion tree’s generators are exactly the Lubotzky-Phillips-Sarnak set for p = 5. Every reduced word is an integer quaternion of norm 5^L that right division unfolds; the same tree’s finite quotients X(5, q) are the Ramanujan graphs SHD-CCP RFC 03 plans as an overlay.',
          refs: 'hyperbolic_core.js P.GENS', explainer: SHD + '#lps' },
        { id: 'h3', col: 1, row: 1.5, kind: 'math', status: 'existing', label: 'Exact H³ tree', sub: 't = 3/4 · τ = ln 7 · to depth 28',
          desc: 'decoder3d.js steps along the six octahedral directions with the rational boost t = 3/4 (cosh 25/7, sinh 24/7, τ = ln 7). A word of length n is an integer vector over 7^n, and decodeExact returns the word. The primary exact store of the lexicon (D3). In Phase 2 its pointExact placed every noun for L3(f).',
          refs: 'decoder3d.js TreeEmbedding3D', explainer: ARC + '#place' },
        { id: 'h2', col: 1, row: 2.5, kind: 'math', status: 'both', label: 'Exact H² tree', sub: 't = 11/13 · τ = ln 12 · Pythagorean',
          desc: 'New: six rational directions (1,0), (3/5,±4/5), (−7/25,±24/25), (−1,0) with a boost t = (m−1)/(m+1), so τ = ln m exactly. Spike S2 measured decodability and bits by m and fixed m = 12 (t = 11/13) for the 2D system; the plane costs more bits per level than H³. Built in Phase 1 (lexicon/h2exact.py): every one of the 82,115 noun words decodes back exactly, at most 252-bit numerators over 142-bit denominators per coordinate (H³: 184 over 102); at t = 3/4 the same tree fails on 19,796 (L3). Built again in Phase 2 in lexicon_core.js: Node’s H² points equal Python’s on every noun (L3(f), supported).',
          refs: 'D3 · spike S2 · L3', explainer: ARC + '#place' },
        { id: 'rank', col: 1, row: 3.5, kind: 'math', status: 'both', label: 'Exact Lorentz ranking', sub: 'integer keys · pessimistic ties',
          desc: 'Candidates ranked by the exact Lorentz inner product of exact points, compared as integers over a common denominator; ties are exact and counted against the query. Float64 ranks invert on deep words (spike S1), so MAP and mean rank are computed exactly (L4). Built in Phase 1 (lexicon/rank.py: keys, rank lists, pessimistic AP, MAP, mean rank, the bootstrap) and used for L5. Built again in Phase 2 in lexicon_core.js. L4(a) and (b) are supported: Python and Node give the same rank list for every query and the same MAP and mean rank as exact rationals (1,176 mammal and 200 noun queries, H³ and H²), while float64 ranking of the same points inverts an exactly ordered pair in 997 of 1,000 noun queries. L4(c) is Phase 4.',
          refs: 'L4 · spike S1', explainer: ARC + '#rank' },
        { id: 'rfc6962', col: 1, row: 4.5, kind: 'math', status: 'both', label: 'RFC 6962 manifest', sub: 'no duplication · consistency proofs',
          desc: 'The corpus manifest: a Certificate Transparency Merkle tree (0x00 leaf, 0x01 node, split at the largest power of two, no duplication) over the per-shard records, with inclusion and consistency proofs, so growth is append-only. The biochain rule duplicates the last node and is malleable; this one is not (L9). Built in Phase 3 (lexicon/manifest.py, with RFC 9162’s proof checks; lexicon_core.js’s chain section). L9 is supported: over C0’s 148 LPREP/1 hashes (root f567700d…) and synthetic lists of K = 1 to 1,001 leaves, every root and proof is equal in JS and Python, every alteration is detected and every wrong proof rejected, with at most 10 hashes per inclusion proof; the shdccp/2 rule gives a list and the list with its last leaf duplicated one root at K = 3, 7 and 1,001 (control 1).',
          refs: 'L9 · spike S4', explainer: BIO + '#manifest' },
        { id: 'weave', col: 1, row: 5.5, kind: 'math', status: 'both', label: 'Exact norm-5 weave', sub: 'replaces the float weave',
          desc: 'An order-sensitive shard summary in exact integers: engram_core.chainQuaternion over the leaf-hash prefixes, of norm 5^(28K), unfolded in order by right division. Proposed for shdccp/3 in place of the float chiral weave (Math.hypot, toFixed(12)), whose agreement across languages is not guaranteed (L9). Built in Phase 3 (lexicon/chain.py; lexicon_core.js), and committed in each LPREP/1 as weave3Sha. L9(b) is supported: each of the 148 C0 shards’ weaves has norm exactly 5^(28K), unfolds to its leaf prefixes and equals the product of its 7 segment sub-weaves, with identical components in JS and Python (971-2,731 bits each); an XOR summary misses every adjacent swap tested that the weave detects (control 2). shdccp/2 itself still carries the float weave, which the grower reproduces.',
          refs: 'L9 · engram_core.js', explainer: BIO + '#weave' },
        { id: 'x5q', col: 1, row: 6.5, kind: 'math', status: 'built', label: 'X(5, q) overlay', sub: 'q = 13, 17, 29 · Ramanujan',
          desc: 'The LPS Ramanujan graphs: the tree reduced mod q, with 2,184, 4,896 and 12,180 vertices for q = 13, 17, 29. An address maps to a vertex; distinct short words map to distinct vertices. A shard key, never integrity: LPS Cayley hashes have known collision attacks. Built in Phase 1 (lexicon/lps.py); L7 is supported: girths 8, 8, 9, Ramanujan margins 0.2224, 0.1632, 0.0301, and SHD-CCP’s Hurwitz product, halved, equals the word quaternion.',
          refs: 'L7 · spike S5', explainer: SHD + '#lps' },

        { id: 'norm', col: 2, row: 0, kind: 'comp', status: 'both', label: 'A · Normalise', sub: 'N_B on pinned Unicode 15.1 tables',
          desc: 'BERT’s BasicTokenizer rules (controls, CJK spacing, lower-casing, NFD and accent stripping, punctuation splitting) on Unicode 15.1 tables exported from Python and pinned by hash, failing closed on unassigned code points. Node (Unicode 17.0) and Python (15.1) disagree, so the platform’s functions are never called (L1, spike S6). Built in Phase 1 (lexicon/normalise.py on golden/unicode_15_1_v1.json); an independent oracle agreed on every L1 instance and 6.7 million code-point contexts. Built again in Phase 2 in lexicon_core.js, on the same table and with a guard against platform Unicode calls. L1 is supported: Node and Chromium, both at Unicode 17.0, give the reference’s bytes on all 156,801 instances, while the platform’s own functions differ on 725 of the 20,520 stress cases (control 1). The table also equals the official UCD 15.1.0 files in every field.',
          refs: 'L1 · D5 · spike S6', explainer: ARC + '#normalise' },
        { id: 'tok', col: 2, row: 1, kind: 'comp', status: 'both', label: 'B · Tokenize', sub: 'WordPiece · V0 frozen · V1 pinned',
          desc: 'Greedy longest-match-first WordPiece with ## continuations. V0 “lex0” (8,192 entries after 8,059 merges, trained on WordNet glosses by the algorithm fixed in Amendment 1, and frozen) decides L1; V1 (bert-base-uncased, pinned) is its second cell. V0’s alphabet is 64 ASCII code points, so a word with a non-ASCII letter is [UNK] under V0. Built in Phase 1 (lexicon/wordpiece.py); an independent naive trainer rebuilt V0 byte for byte. Built again in Phase 2 in lexicon_core.js: the same pieces, ids and offsets on every L1 instance, for V0 and V1, in Node and Chromium (L1, supported).',
          refs: 'L1 · D4', explainer: ARC + '#tokenize' },
        { id: 'ids', col: 2, row: 2, kind: 'comp', status: 'both', label: 'C · Ids', sub: 'id stream · engram/1 only a checksum',
          desc: 'Token ids as a LEB128 stream with its SHA-256. engram/1 is computed only as a compatibility checksum for Owl Academy, never as an input: its 26 letter grids keep only letter-count parity, so anagrams collide and numbers share the zero key. L2 is supported: 52.6% of WordNet’s 147,305 lemma types share a key with another (a SHA-256-prefix key: 0 collisions), identically in Python and Node. Phase 2: lexicon_core.js writes the same id streams, every id-stream SHA-256 equal in Node and Chromium (L1).',
          refs: 'L2 · D4', explainer: ANA + '#engram' },
        { id: 'addr', col: 2, row: 3, kind: 'comp', status: 'both', label: 'D · Address', sub: 'L3 rule · 59/64-bit bijective id',
          desc: 'A training-free address for every noun synset: the spanning parent is the first hypernym pointer; child k of a node with c children takes max(1, ⌈log₅ c⌉) letters, the base-5 digits of k. Ancestry equals prefix order. A bijective mixed-radix code gives 59-bit ids to words of length ≤ 25 (L3). Built in Phase 1 (lexicon/address.py): all 82,115 words are distinct, invertible and certified; up to 36 letters, mean 18.37; 90.88% fit id59 and 95.66% id64. Built again in Phase 2 in lexicon_core.js, which gives the same words in Node (L3(f), supported).',
          refs: 'L3 · D6', explainer: ARC + '#address' },
        { id: 'place', col: 2, row: 4, kind: 'comp', status: 'both', label: 'E · Placement', sub: 'exact H³ and H² points',
          desc: 'Every address becomes an exact point in H³ (the primary store) and in H² (the 2D system), both checked on the hyperboloid exactly and decoded back to the word (L3); ranked exactly (L4); compared with curvature-0 trees of the same construction (L5). Built in Phase 1 (lexicon/h3tree.py, h2exact.py, flat.py). L5 is supported: noun graph-edge MAP H³ 0.568, H² 0.590, against F3 0.007 and F3* 0.500. Phase 2: Node’s H³ points (decoder3d.js pointExact) and H² points (lexicon_core.js) equal Python’s on every noun, by the canonical point list’s SHA-256 and 2,000 sampled lines (L3(f), supported).',
          refs: 'L3 · L4 · L5', explainer: ARC + '#place' },
        { id: 'embed', col: 2, row: 5, kind: 'comp', status: 'planned', label: 'F · Static embeddings', sub: 'Lorentz vs Euclidean, float64',
          desc: 'Learned embeddings of the mammal hierarchy, Lorentz against Euclidean at matched dimension (2, 3, 50), in numpy float64, snapped to 2^−32 for certified storage and ranked exactly (L6, L4(c); Phase 4).',
          refs: 'L6 · Phase 4', explainer: ALT + '#baselines' },
        { id: 'encoder', col: 2, row: 6, kind: 'comp', status: 'planned', label: 'G · Encoder', sub: 'hierarchy factor · Stage 2',
          desc: 'A Euclidean BERT-style encoder that takes the address in as a hierarchy factor (prefix embeddings and the H^d log coordinates of the truncated point). 1-10M parameters on CPU, BERT-mini/small on GPU. Registered by amendment after the Stage-1 gate.',
          refs: 'Phases 6-7', explainer: ARC + '#encoder' },
        { id: 'heads', col: 2, row: 7, kind: 'comp', status: 'planned', label: 'H · Heads', sub: 'MLM · hyperbolic hierarchy head',
          desc: 'A masked-LM head and a HiT-style hyperbolic hierarchy head (distance plus a norm term, with feature clipping); certified assignment of outputs to tree words by exact decoding.',
          refs: 'Phases 6-7', explainer: ARC + '#encoder' },
        { id: 'records', col: 2, row: 8, kind: 'comp', status: 'both', label: 'Records', sub: 'LVOCAB to LGROW · LBENCH in Phase 4',
          desc: 'Typed commitments, SHA-256 hashed and optionally signed in BioChain’s ATTEST/1 format: the vocabulary, the address table, one record per shard, the corpus manifest, its growth, and benchmark receipts. The namespace lives in record kinds, never in a Form nibble (D7). Five kinds were built in Phase 3, as Amendment 7 item 3 fixed them (lexicon/records.py; lexicon_core.js): LVOCAB/1, LADDR/1 (with addrTableRoot, an RFC 6962 root over the 8,192 rows of map A), LPREP/1 (Tier S, and Tier P with a salted root), LCORPUS/1 and LGROW/1. LVOCAB/1, LADDR/1 (addrTableRoot 30b17bc3…) and every shard’s LPREP/1 are identical in Python and JS (L8(d)); each clean LPREP/1 was attested and verified (L10). LBENCH/1 is defined when Phase 4 first uses it.',
          refs: 'L8-L11 · D7 · D8', explainer: BIO + '#records' },
        { id: 'ladder', col: 2, row: 9, kind: 'comp', status: 'design', label: 'Benchmark ladder', sub: 'Stages 0-4 · three compute tracks',
          desc: 'Stage 0 determinism and the tokenizer; Stage 1 WordNet hierarchy; Stage 2 lexical semantics; Stage 3 small MLM pretraining (BabyLM, BLiMP); Stage 4 sentence tasks (GLUE, MTEB subset). Browser, CPU and GPU tracks share the tokenizer record, the data roots, the seeds and the metric code.',
          refs: 'D10', explainer: BEN },

        { id: 'pins', col: 3, row: 0, kind: 'artifact', status: 'done', label: 'Pins', sub: 'WordNet · EWT · Unicode · V0 · V1',
          desc: 'Phase 0: make_wordnet_v1.cjs and make_ewt_v1.cjs fetch the data once into a cache outside git and record hashes and counts. Phase 1 added the Unicode 15.1 table (142,624 bytes, committed), V0 “lex0” (8,192 entries, committed and frozen), V1 (bert-base-uncased at revision 86b5e09, its hash committed, the file in the cache) and the order-sensitive digests of L1’s four instance lists. Phase 2 added the table and V0 as script files for the pages (data/*.js, make_js_data_v1.cjs), L1’s instance loaders in JS (l1_instances_v1.cjs), and a check of the Unicode table against the official UCD 15.1.0 files, equal in every field (check_ucd_v1.py). Phase 3 added the normaliser spec nb_spec_v1.txt, which LVOCAB/1 hashes, and biomesh_compat_v1.json: growSync against Owl Academy’s and BioChain-AI’s own growers on 13 unregistered texts, 26 of 26 records equal and accepted. Every pin has --check.',
          refs: 'reference/golden/', explainer: EVI + '#pins' },
        { id: 'spikes', col: 3, row: 1, kind: 'artifact', status: 'done', label: 'Spikes S1-S7', sub: 'captured outputs · decide nothing',
          desc: 'Phase 0: seven measurement scripts run before the preregistration, on data disjoint from every registered instance: the H³ and H² trees, WordNet’s shape on verbs, a lexicon shard against Owl’s grower, the LPS overlay, Unicode across three runtimes, and ATTEST/1 in two languages.',
          refs: 'spikes/', explainer: EVI + '#spikes' },
        { id: 'prereg', col: 3, row: 2, kind: 'artifact', status: 'done', label: 'Preregistration', sub: 'L1-L11 · D1-D12 · Amendments 1-9',
          desc: 'Eleven claims with instances, controls that must fail, decision rules and predictions, committed alone, after the spikes and before any code that tests them. Amendment 1 fixed the open definitions before any Phase 1 code; Amendment 2, after the dry run and before the decisive run, recorded a disclosure, an erratum and the readings fixed in code; Amendment 3 corrected it after the run. In Phase 2, Amendment 4 fixed how the engines are run and compared before any code, and Amendment 5, after the dry run and before the decisive run, the disclosures, readings, environment and review. Amendment 6 is an erratum to L6’s protocol attribution; no rule changed. In Phase 3, Amendment 7 fixed the records, the synthetic shards, the manifest’s conventions, the packages and L11’s timing before any code, and Amendment 8, after the dry runs and before the decisive run, grew the packages with engrams off (disclosed as fixed after the dry runs), replaced L11’s control with the verifier’s own step record and aligned the two verdicts with Explainer 4; Amendment 9, an erratum written with the write-up, records three stale texts in the decisive record and changes no result.',
          refs: 'PREREGISTRATION.md', explainer: EVI + '#claims' },
        { id: 'reference', col: 3, row: 3, kind: 'artifact', status: 'done', label: 'Python reference', sub: 'Phases 1-3 · the authority',
          desc: 'The exact reference (reference/lexicon/): N_B on the pinned Unicode table, WordPiece with V0 and V1, L1’s instance loaders, WordNet, the address rule and id codec, exact H³ and H² points, the flat arms, exact ranking and X(5, q), with tests and the traces the browser core must reproduce. Its claims runner was committed after its dry run, fixed after the geometry review, dry-run again after both adversarial reviews, and, after Amendment 2, run once: L2, L5, L7 and L3’s Python side supported, every control failing as required. In Phase 2 it ran the reference’s half once (run_claims.py --phase2, lexicon/phase2.py): L1’s per-instance records and digests, which Node and Chromium matched, the Hugging Face agreement (reported), L4(a)’s rank lists, and L4(b), which it decides: supported. Phase 3 added the chain modules (chain.py, records.py, manifest.py, attest.py, verify.py), the chain trace (traces_chain.py) and run_claims_phase3.py, the Python half of the Phase 3 runner: the authority for L8(d), L9 and L10’s verdicts, which the JS equalled on every record, root, proof and package.',
          refs: 'reference/README.md · reference/results/claims.json · phase2-python.json · claims-phase3.json', href: 'reference/README.md', explainer: 'explainers/reference.html' },
        { id: 'proposals', col: 3, row: 4, kind: 'artifact', status: 'done', label: 'Proposals', sub: 'SHD-CCP · BioChain-AI · Owl Academy',
          desc: 'Documents for the other repositories, never applied: the layout census, RFC 03 and LPS, a Lemma 15 note, kernel 0xA (passing the Ontology’s own lint), golden-vector suites, language biochains for BioChain-AI, and notes for Owl Academy.',
          refs: 'proposals/', explainer: SHD + '#proposals' },
        { id: 'core', col: 3, row: 5, kind: 'artifact', status: 'done', label: 'lexicon_core.js', sub: 'Phases 2-3 · parity 19,991 lines',
          desc: 'The browser core (UMD), on orbital_core.js, hyperbolic_core.js and decoder3d.js unchanged: a strict UTF-8 decoder, N_B on the pinned Unicode 15.1 table alone (a guard forbids platform Unicode calls), WordPiece, the id stream and L1’s record; the L3 address rule and id codec, exact H³ points (decoder3d.js pointExact), the exact H² tree, exact ranking with pessimistic AP, and L4(b)’s float keys. A page gets the pinned data from data/*.js. At the end of Phase 2, tests/parity-lexicon.cjs passed 18,667 of 18,667 lines in Node, 18,578 of them reproducing the five Phase 1 traces. One decisive run: L1 supported in all four cells (V0 and V1, in Node 22 and Chromium 153; 0 of 156,801 instances differ), L3(f) supported (the canonical point list equals Python’s), L4(a, b) supported. Phase 3 added the chain section, on Engram Mind’s Eye’s biochain_v1.js and engram_core.js unchanged: growSync, the records, RFC 6962 with RFC 9162’s proofs, the exact weave, ATTEST/1 in WebCrypto and the hardened verifier; parity now passes 19,991 of 19,991 lines, 1,323 of them for the chain trace.',
          refs: 'Phases 2-3 · tests/parity-lexicon.cjs · claims-phase2.json · claims-phase3.json', href: 'lexicon_core.js', explainer: 'explainers/browser-core.html' },
        { id: 'chains', col: 3, row: 6, kind: 'artifact', status: 'done', label: 'Shards and manifests', sub: 'Phase 3 · L8-L11 supported',
          desc: 'Phase 3: the synchronous grower (growSync in lexicon_core.js’s chain section; chain.py in the reference), the records, the RFC 6962 manifest, the exact weave and the hardened, ATTEST/1-signed verifier (verifyPackage; verify.py and attest.py), with a chain trace the core reproduces line for line and one decisive run. L8: 0 of 336 records (148 C0 and 20 synthetic shards, engrams off and on) differ from Owl Academy’s own growBiochain, for the JS grower and the Python port. L9: the manifest and the exact weaves, 0 failures. L10: 50 clean and 450 tampered packages, 0 false accepts and 0 false rejects in JS and Python, verdicts identical, while Owl’s verifyIntegrity accepts every T1, T2, T8 and T9 record. L11: a full C0 shard verifies in a median 155.4 ms in Node [154.2, 156.0] (bar 250 ms) on packages grown with engrams off, which Amendment 8 fixed after dry runs had put the engrams-on median at 243.5-265.5 ms; engrams on, reported, 243.6 ms. All four supported.',
          refs: 'Phase 3 · Amendments 7-8 · reference/results/claims-phase3.json', href: 'reference/results/claims-phase3.md', explainer: 'explainers/chains.html' },
        { id: 'pages', col: 3, row: 7, kind: 'artifact', status: 'planned', label: '2D and 3D pages', sub: 'Phase 5 · disk and ball',
          desc: 'lexicon-2d.html (the exact H² tree in the Poincaré disk) and lexicon-3d.html (the exact H³ tree in the ball), with a shard panel and an Engram session import.',
          refs: 'Phase 5', explainer: ARC + '#pages' },
        { id: 'summary', col: 3, row: 8, kind: 'artifact', status: 'done', label: 'Summary page', sub: 'the shareable page',
          desc: 'One self-contained page with the six answers, the pipeline, the biochain design, the ladder and the claims.',
          refs: 'summary.html', href: 'summary.html' }
    ];
    const EDGES = [
        ['shdspec', 'lps'], ['shdspec', 'records'], ['shdspec', 'proposals'], ['biomesh', 'records'], ['biomesh', 'weave'], ['biomesh', 'chains'],
        ['wordnet', 'addr'], ['wordnet', 'tok'], ['wordnet', 'pins'], ['ewt', 'norm'], ['ewt', 'pins'], ['bertvocab', 'tok'], ['bertvocab', 'pins'], ['babylm', 'ladder'],
        ['ho', 'lps'], ['ho', 'h3'], ['ho', 'rank'], ['engram', 'ids'], ['engram', 'weave'], ['engram', 'chains'], ['orbital', 'records'],
        ['lps', 'addr'], ['lps', 'x5q'], ['h3', 'place'], ['h2', 'place'], ['rank', 'place'], ['rank', 'embed'], ['rfc6962', 'records'], ['weave', 'records'], ['x5q', 'records'],
        ['norm', 'tok'], ['tok', 'ids'], ['ids', 'addr'], ['addr', 'place'], ['place', 'embed'], ['embed', 'encoder'], ['place', 'encoder'], ['encoder', 'heads'],
        ['ids', 'records'], ['addr', 'records'], ['heads', 'ladder'], ['embed', 'ladder'], ['place', 'ladder'],
        ['spikes', 'prereg'], ['pins', 'prereg'], ['prereg', 'reference'], ['pins', 'reference'], ['reference', 'core'],
        ['norm', 'reference'], ['tok', 'reference'], ['ids', 'reference'], ['addr', 'reference'], ['place', 'reference'],
        ['h2', 'reference'], ['rank', 'reference'], ['x5q', 'reference'], ['records', 'chains'], ['core', 'chains'], ['reference', 'chains'], ['core', 'pages'], ['place', 'pages'],
        ['ho', 'core'], ['orbital', 'core'], ['norm', 'core'], ['tok', 'core'], ['ids', 'core'], ['addr', 'core'], ['place', 'core'], ['h2', 'core'], ['rank', 'core'],
        ['prereg', 'summary'], ['proposals', 'summary']
    ];
    const byId = Object.fromEntries(NODES.map(n => [n.id, n]));
    const ins = id => EDGES.filter(e => e[1] === id).map(e => byId[e[0]]);
    const outs = id => EDGES.filter(e => e[0] === id).map(e => byId[e[1]]);
    const root = () => document.body.dataset.root || '';
    const url = h => (!h ? null : /^(https?:)?\/\//.test(h) || h.startsWith('#') ? h : root() + h);
    const target = n => url(n.explainer || n.href);
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const NS = 'http://www.w3.org/2000/svg';
    const W = 232, H = 50;

    function nodeSVG(n, x, y, opts = {}) {
        const k = KIND[n.kind], dashed = n.status === 'planned' || n.status === 'next' || n.status === 'design';
        const fill = opts.focus ? 'rgba(120,53,15,0.55)' : 'rgba(15,23,42,0.95)';
        return `<g class="map-node" data-id="${n.id}" tabindex="0" role="button" aria-label="${esc(n.label)}: ${esc(STATUS[n.status])}" transform="translate(${x},${y})">
            <rect width="${W}" height="${H}" rx="10" fill="${fill}" stroke="${opts.focus ? '#f5c542' : k.color}" stroke-width="1.6"${dashed ? ' stroke-dasharray="5 4"' : ''}/>
            <circle cx="12" cy="14" r="4" fill="${k.color}"/>
            <text x="22" y="18" fill="#f8fafc" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="600">${esc(n.label)}</text>
            <text x="12" y="37" fill="#94a3b8" font-family="Fira Code, ui-monospace, monospace" font-size="9.8">${esc(n.sub)}</text>
        </g>`;
    }
    function edgePath(a, b) {
        // right edge of a to left edge of b; inside one column, bow out to the right
        if (a.x === b.x) {
            const x = a.x + W, y1 = a.y + H / 2, y2 = b.y + H / 2, bow = 34 + Math.abs(y2 - y1) * 0.12;
            return `M${x},${y1} C${x + bow},${y1} ${x + bow},${y2} ${x},${y2}`;
        }
        const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, dx = (x2 - x1) * 0.5;
        return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
    }
    function detailHTML(n) {
        const link = target(n), list = arr => arr.length ? arr.map(m => `<a href="#" data-pick="${m.id}">${esc(m.label)}</a>`).join(' · ') : '—';
        return `<h4><span class="dot" style="background:${KIND[n.kind].color}"></span>${esc(n.label)} <span class="status ${n.status === 'done' || n.status === 'built' || n.status === 'both' ? 's-done' : n.status === 'next' ? 's-next' : n.status === 'existing' || n.status === 'source' ? 's-existing' : 's-planned'}">${STATUS[n.status]}</span></h4>
            <p>${esc(n.desc)}</p>
            <p class="links">${esc(KIND[n.kind].name)} · ${esc(n.refs)}${link ? ` · <a href="${link}">${n.explainer ? 'Read the explainer' : 'Open'} →</a>` : ''}${n.explainer && n.href && !n.href.includes('#') ? ` · <a href="${url(n.href)}">Open →</a>` : ''}</p>
            <p class="links">Draws on: ${list(ins(n.id))}<br>Feeds: ${list(outs(n.id))}</p>`;
    }
    function wire(svg, detail, pick) {
        const lit = id => {
            if (!id) { svg.classList.remove('dim'); svg.querySelectorAll('.lit,.sel').forEach(e => e.classList.remove('lit', 'sel')); return; }
            svg.classList.add('dim');
            svg.querySelectorAll('.map-node').forEach(g => {
                const on = g.dataset.id === id || EDGES.some(e => (e[0] === id && e[1] === g.dataset.id) || (e[1] === id && e[0] === g.dataset.id));
                g.classList.toggle('lit', on); g.classList.toggle('sel', g.dataset.id === id);
            });
            svg.querySelectorAll('.map-edge').forEach(p => p.classList.toggle('lit', p.dataset.a === id || p.dataset.b === id));
        };
        let held = null;
        svg.querySelectorAll('.map-node').forEach(g => {
            const id = g.dataset.id;
            g.addEventListener('mouseenter', () => lit(id));
            g.addEventListener('mouseleave', () => lit(held));
            g.addEventListener('focus', () => lit(id));
            const choose = () => pick ? pick(id) : (held = id, lit(id), detail && (detail.innerHTML = detailHTML(byId[id])));
            g.addEventListener('click', choose);
            g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
        });
        if (detail) detail.addEventListener('click', e => {
            const a = e.target.closest('[data-pick]'); if (!a) return;
            e.preventDefault(); held = a.dataset.pick; lit(held); detail.innerHTML = detailHTML(byId[held]);
        });
        return { select: id => { held = id; lit(id); if (detail) detail.innerHTML = detailHTML(byId[id]); } };
    }
    function legend() {
        return `<div class="map-legend">${Object.values(KIND).map(k => `<span style="--c:${k.color}">${k.name}</span>`).join('')}<span class="dashed" style="--c:#94a3b8">Dashed: designed or planned, not built yet</span></div>`;
    }

    function renderFull(el) {
        const COLX = [14, 284, 554, 830], TOP = 46, ROW = 66;
        const pos = n => ({ x: COLX[n.col], y: TOP + n.row * ROW });
        NODES.forEach(n => Object.assign(n, pos(n)));
        const height = Math.max(...NODES.map(n => n.y)) + H + 24;
        const heads = ['Sources', 'Mathematics', 'Layers', 'Pages, data and code'];
        let s = `<svg viewBox="0 0 1076 ${height}" role="img" aria-label="System map of Hyperbolic Lexicon">`;
        s += `<defs><marker id="hl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs>`;
        heads.forEach((h, i) => { s += `<text x="${COLX[i] + W / 2}" y="24" text-anchor="middle" fill="#64748b" font-family="Fira Code, monospace" font-size="11" letter-spacing="2">${h.toUpperCase()}</text>`; });
        EDGES.forEach(([a, b]) => { const A = byId[a], B = byId[b]; s += `<path class="map-edge" data-a="${a}" data-b="${b}" d="${edgePath(A, B)}" stroke="${KIND[A.kind].color}" stroke-opacity="0.55" marker-end="url(#hl-arrow)"/>`; });
        NODES.forEach(n => { s += nodeSVG(n, n.x, n.y); });
        s += '</svg>';
        el.innerHTML = `<div class="map-wrap">${s}</div>${legend()}<div class="map-detail" aria-live="polite"><p class="links">Hover a box to light up its connections; click it for what it is, where it comes from and where it is explained.</p></div>`;
        const api = wire(el.querySelector('svg'), el.querySelector('.map-detail'));
        if (el.dataset.select) api.select(el.dataset.select);
    }

    function renderFocus(el) {
        const id = el.dataset.node, f = byId[id]; if (!f) return;
        const L = ins(id), R = outs(id), rows = Math.max(L.length, R.length, 1), GAP = 62;
        const height = 30 + rows * GAP + 10, cy = 30 + (rows * GAP - GAP) / 2;
        const place = (arr, x) => arr.map((n, i) => ({ n, x, y: 30 + (rows - arr.length) * GAP / 2 + i * GAP }));
        const left = place(L, 10), right = place(R, 550), mid = { n: f, x: 280, y: cy };
        let s = `<svg viewBox="0 0 792 ${height}" role="img" aria-label="Where ${esc(f.label)} sits">`;
        s += `<defs><marker id="hl-arrow-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs>`;
        s += `<text x="126" y="16" text-anchor="middle" fill="#64748b" font-family="Fira Code, monospace" font-size="10" letter-spacing="2">DRAWS ON</text><text x="666" y="16" text-anchor="middle" fill="#64748b" font-family="Fira Code, monospace" font-size="10" letter-spacing="2">FEEDS</text>`;
        const edge = (a, b, color, ea, eb) => `<path class="map-edge" data-a="${ea}" data-b="${eb}" d="${edgePath({ x: a.x, y: a.y }, { x: b.x, y: b.y })}" stroke="${color}" stroke-opacity="0.6" marker-end="url(#hl-arrow-${id})"/>`;
        left.forEach(p => { s += edge(p, mid, KIND[p.n.kind].color, p.n.id, id); });
        right.forEach(p => { s += edge(mid, p, KIND[f.kind].color, id, p.n.id); });
        [...left, ...right].forEach(p => { s += nodeSVG(p.n, p.x, p.y); });
        s += nodeSVG(f, mid.x, mid.y, { focus: true });
        s += '</svg>';
        el.innerHTML = `<div class="map-wrap mini">${s}</div>`;
        wire(el.querySelector('svg'), null, pick => { const n = byId[pick], t = target(n); if (pick !== id && t) location.href = t; });
    }

    // Table of contents: mark the section in view
    function toc() {
        const links = [...document.querySelectorAll('.toc a[href^="#"]')]; if (!links.length) return;
        const secs = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
        const io = new IntersectionObserver(es => {
            es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id)); });
        }, { rootMargin: '-20% 0px -70% 0px' });
        secs.forEach(s => io.observe(s));
    }
    function math() {
        if (window.renderMathInElement) renderMathInElement(document.body, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false });
    }

    window.HLMap = { NODES, EDGES, KIND, STATUS, renderFull, renderFocus };
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-hl-map="full"]').forEach(renderFull);
        document.querySelectorAll('[data-hl-map="focus"]').forEach(renderFocus);
        toc();
    });
    window.addEventListener('load', math);
})();
