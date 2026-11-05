// Hyperbolic Lexicon: WordNet 3.0 from the nltk_data archive, read with Node alone (zlib, crypto), no dependencies.
//
//   const W = require('./wordnet_v1.cjs');
//   const wn = W.load();                      // reads ~/.cache/hyperbolic-lexicon/wordnet.zip, checks its SHA-256
//   wn.synsets.noun.get('01861778')           // { pos, offset, lemmas, ptrs: [{ sym, offset, pos }], gloss }
//
// The archive is not committed: it is fetched once by make_wordnet_v1.cjs into the cache, outside git, and its
// SHA-256 is pinned here. Everything this file derives is a pure function of the archive's bytes.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const URL = 'https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip';
const ZIP_SHA256 = 'cbda5ea6eef7f36a97a43d4a75f85e07fccbb4f23657d27b4ccbc93e2646ab59';
const ZIP_BYTES = 10775600;
const CACHE = process.env.HL_CACHE || path.join(os.homedir(), '.cache', 'hyperbolic-lexicon');
const ZIP_PATH = path.join(CACHE, 'wordnet.zip');
const POS = ['noun', 'verb', 'adj', 'adv'];

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');

// a minimal reader for a zip archive: the end-of-central-directory record, then each central entry, then its data
function unzip(buf) {
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('not a zip archive');
    const n = buf.readUInt16LE(eocd + 10);
    let p = buf.readUInt32LE(eocd + 16);
    const files = new Map();
    for (let k = 0; k < n; k++) {
        if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory entry');
        const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), size = buf.readUInt32LE(p + 24);
        const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
        const local = buf.readUInt32LE(p + 42), name = buf.toString('utf8', p + 46, p + 46 + nameLen);
        p += 46 + nameLen + extraLen + commentLen;
        if (name.endsWith('/')) continue;
        const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28), raw = buf.subarray(start, start + csize);
        const data = method === 0 ? raw : method === 8 ? zlib.inflateRawSync(raw) : null;
        if (!data || data.length !== size) throw new Error(`cannot read ${name}`);
        files.set(name, data);
    }
    return files;
}

// one line of data.<pos>: offset lex_filenum ss_type w_cnt(hex) [word lex_id]... p_cnt [sym offset pos src/tgt]... [frames] | gloss
function parseData(text, pos) {
    const out = new Map();
    for (const line of text.split('\n')) {
        if (!line || line.startsWith('  ')) continue;
        const bar = line.indexOf(' | '), head = (bar < 0 ? line : line.slice(0, bar)).trim().split(' '), gloss = bar < 0 ? '' : line.slice(bar + 3).trim();
        const offset = head[0], ssType = head[2], wCnt = parseInt(head[3], 16), lemmas = [];
        let i = 4;
        for (let k = 0; k < wCnt; k++, i += 2) lemmas.push(head[i]);
        const pCnt = parseInt(head[i], 10), ptrs = [];
        i += 1;
        for (let k = 0; k < pCnt; k++, i += 4) ptrs.push({ sym: head[i], offset: head[i + 1], pos: head[i + 2] });
        out.set(offset, { pos, ssType, offset, lemmas, ptrs, gloss });
    }
    return out;
}

// index.<pos>: lemma pos synset_cnt p_cnt [ptr]... sense_cnt tagsense_cnt synset_offset...
function parseIndex(text) {
    const out = new Map();
    for (const line of text.split('\n')) {
        if (!line || line.startsWith('  ')) continue;
        const f = line.trim().split(' '), synCnt = parseInt(f[2], 10), pCnt = parseInt(f[3], 10);
        out.set(f[0], { lemma: f[0], tagsense: parseInt(f[5 + pCnt], 10), offsets: f.slice(f.length - synCnt) });
    }
    return out;
}

function readArchive(zipPath = ZIP_PATH) {
    if (!fs.existsSync(zipPath)) throw new Error(`no WordNet archive at ${zipPath}: run make_wordnet_v1.cjs first`);
    const buf = fs.readFileSync(zipPath), digest = sha256(buf);
    if (digest !== ZIP_SHA256 || buf.length !== ZIP_BYTES) throw new Error(`WordNet archive digest ${digest} (${buf.length} B) is not the pinned ${ZIP_SHA256}`);
    return { buf, files: unzip(buf) };
}

function load(zipPath = ZIP_PATH) {
    const { files } = readArchive(zipPath), txt = n => files.get('wordnet/' + n).toString('latin1');
    const synsets = {}, index = {};
    for (const pos of POS) { synsets[pos] = parseData(txt('data.' + pos), pos); index[pos] = parseIndex(txt('index.' + pos)); }
    return { files, synsets, index, license: txt('LICENSE') };
}

// the L3 spanning parent: the first '@' (hypernym) or '@i' (instance hypernym) pointer in the data line
function spanningParent(syn) { const p = syn.ptrs.find(x => x.sym === '@' || x.sym === '@i'); return p ? p.offset : null; }
// every hypernym or instance-hypernym parent (multiple inheritance kept), for the closure
function closureParents(syn) { return syn.ptrs.filter(x => x.sym === '@' || x.sym === '@i').map(x => x.offset); }

// the spanning forest of one part of speech: parent and ordered children (by synset offset)
function spanningForest(map) {
    const parent = new Map(), children = new Map(), roots = [];
    for (const [off, syn] of map) {
        const p = spanningParent(syn);
        parent.set(off, p);
        if (p === null) roots.push(off); else { if (!children.has(p)) children.set(p, []); children.get(p).push(off); }
    }
    for (const list of children.values()) list.sort();
    roots.sort();
    return { parent, children, roots };
}

// ancestors of every node in the hypernym ∪ instance-hypernym closure (memoised; the graph is acyclic)
function closure(map) {
    const anc = new Map();
    const visit = off => {
        if (anc.has(off)) return anc.get(off);
        const set = new Set();
        anc.set(off, set);
        for (const p of closureParents(map.get(off))) { set.add(p); for (const a of visit(p)) set.add(a); }
        return set;
    };
    for (const off of map.keys()) visit(off);
    return anc;
}

module.exports = { URL, ZIP_SHA256, ZIP_BYTES, CACHE, ZIP_PATH, POS, sha256, unzip, readArchive, load, parseData, parseIndex, spanningParent, closureParents, spanningForest, closure };
