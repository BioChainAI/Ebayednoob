"""The Phase 3 records (D7; Amendment 7 item 3): LVOCAB/1, LADDR/1 (with addrTableRoot over map A), LPREP/1 (Tier S
and Tier P), LCORPUS/1 and LGROW/1. Each record is a pipe-joined UTF-8 string; its hash is the lowercase hex SHA-256
of those bytes; an empty field is '-'.

    nb_spec_sha()                         SHA-256 of golden/nb_spec_v1.txt (Amendment 1 item 1 with Amendment 2's
                                          N_B readings, verbatim), refused unless it is the pinned one
    lvocab(vocab)                         LVOCAB/1|vocabSha256|normaliserSpecSha|unicodeTablesSha|wordpiece-greedy/1|
                                          lex0-bpe/1|trainSetSha|-|specials
    addr_rows(entries, words)             map A's rows id|token|word|len|h3PointSha|h2PointSha, in id order
    addr_table_root(rows)                 the RFC 6962 root (lexicon.manifest) over the rows' UTF-8
    laddr(vocab_sha, root), laddr_v0(wn)  LADDR/1|vocabSha256|wordnetZipSha256|L3/1|addrTableRoot|3/4|11/13|D3
    id_stream_sha(data, vocab)            the V0 id stream of a whole shard as one instance (Amendment 1 item 2)
    derived(record, data, vocab)          the LPREP/1 fields recomputed from a record and its text
    lprep(...), lprep_tier_p(...), parse_lprep(s)
    salted_root(salt_hex, merkle_root, chain_id), test_salt(j)
    lcorpus(corpus_id, lpreps, spdx_values), corpus_log(lpreps), lgrow(...), parse_lcorpus(s), parse_lgrow(s)
    source_url_sha_c0(), source_url_sha_synth(base, i)

lexicon.address (map_a, noun_words, verb_words, word_str), lexicon.h3tree, lexicon.h2exact, lexicon.manifest and
lexicon.wordpiece build the derived layers; nothing here changes them.
"""
import hashlib
import json
import os
import re

from . import GOLDEN, chain, manifest, unicode_tables, wordnet, wordpiece

NB_SPEC_PATH = os.path.join(GOLDEN, 'nb_spec_v1.txt')
NB_SPEC_SHA256 = '4ceb92c48d9cbe92204931da3ab2ef1133f74bfb2bd53af26d482af7e69316fd'
NB_SPEC_BYTES = 2601
L1_META = os.path.join(GOLDEN, 'l1_instances_v1.meta.json')

C0_CORPUS = 'wordnet30-c0'
SYNTH_CORPUS = 'lexicon-synth-v1'
SPDX_WORDNET = 'LicenseRef-WordNet-3.0'
SPDX_CC0 = 'CC0-1.0'
TIER_S, TIER_P = 'S', 'P'

LPREP_FIELDS = ('format', 'corpusId', 'shardIndex', 'chainId', 'merkleRoot', 'byteLen', 'rawSha256', 'spdx',
                'sourceUrlSha', 'lvocabHash', 'idStreamSha256', 'laddrHash', 'weave3Sha', 'engramStreamSha', 'tier')
# the fields a verifier recomputes from the record and its text (the others it takes from the string)
DERIVED_FIELDS = ('chainId', 'merkleRoot', 'byteLen', 'rawSha256', 'idStreamSha256', 'weave3Sha', 'engramStreamSha')
_HEX64 = re.compile(r'[0-9a-f]{64}')
_DEC = re.compile(r'0|[1-9][0-9]*')


def sha256hex(s):
    return hashlib.sha256(s.encode('utf-8') if isinstance(s, str) else bytes(s)).hexdigest()


def record_hash(s):
    """A record's hash: the lowercase hex SHA-256 of its UTF-8."""
    return sha256hex(s)


def _dec(s):
    """A canonical decimal (no sign, no leading zero), or ValueError."""
    if not isinstance(s, str) or not _DEC.fullmatch(s):
        raise ValueError(f'not a canonical decimal: {s!r}')
    return int(s)


# ================================================================ LVOCAB/1
def nb_spec_sha():
    """The normaliser spec's SHA-256, refused unless golden/nb_spec_v1.txt is the pinned file.

    READING: the spec is Amendment 1 item 1, then Amendment 2 item 3's heading and its N_B reading, copied verbatim
    from PREREGISTRATION.md (LF line ends, a blank line between the two, LF at the end); Amendment 2 item 2, an
    erratum to item 1's parenthesis that changes no rule, is not part of it."""
    blob = open(NB_SPEC_PATH, 'rb').read()
    d = hashlib.sha256(blob).hexdigest()
    if d != NB_SPEC_SHA256 or len(blob) != NB_SPEC_BYTES:
        raise ValueError(f'{NB_SPEC_PATH}: sha256 {d} ({len(blob)} B) is not the pinned {NB_SPEC_SHA256}')
    return d


def train_set_sha():
    """L1 instance (a)'s digest in golden/l1_instances_v1.meta.json (V0's training corpus)."""
    return json.load(open(L1_META))['instances']['a']['sha256']


def specials_field(vocab):
    """The five special entries with their ids, '[PAD]=0,[UNK]=1,[CLS]=2,[SEP]=3,[MASK]=4'."""
    return ','.join(f'{s}={vocab.ids[s]}' for s in wordpiece.SPECIALS)


def lvocab(vocab=None):
    """LVOCAB/1 for a vocabulary (V0 by default): the normaliser spec and the Unicode table by their pinned hashes,
    the algorithms 'wordpiece-greedy/1' and 'lex0-bpe/1', the training set's digest, '-' (no seed), the specials."""
    vocab = wordpiece.load_v0() if vocab is None else vocab
    return '|'.join(['LVOCAB/1', vocab.sha256, nb_spec_sha(), unicode_tables.SHA256, 'wordpiece-greedy/1',
                     'lex0-bpe/1', train_set_sha(), '-', specials_field(vocab)])


# ================================================================ LADDR/1
def point_sha(X, d):
    """A point's hash: SHA-256 of its canonical text, the coordinates in lowest terms as 'p/q' (q >= 1, written even
    when 1), space-joined (Amendment 1 item 6; lexicon.h3tree.coords_text).

    READING: the canonical text of one point is its coordinates alone, as h3tree.coords_text writes them, without
    the offset and tree token that a line of the canonical point list adds (a map A row has no offset; the column
    names the tree)."""
    from .h3tree import coords_text
    return sha256hex(coords_text(X, d))


def addr_rows(entries, words):
    """Map A's rows in id order: 'id|token|word|len|h3PointSha|h2PointSha' (token the vocabulary entry as it is,
    word its letters as digits, len its letter count)."""
    from . import h2exact, h3tree
    from .address import word_str
    words = [tuple(w) for w in words]
    if len(entries) != len(words):
        raise ValueError('one word per entry')
    p3 = h3tree.points(words)
    p2 = h2exact.TREE.points(words)
    return [f'{i}|{e}|{word_str(w)}|{len(w)}|{point_sha(X3, h3tree.den(len(w)))}|{point_sha(X2, h2exact.TREE.den(len(w)))}'
            for i, (e, w, X3, X2) in enumerate(zip(entries, words, p3, p2))]


def addr_table_root(rows):
    """addrTableRoot: the RFC 6962 root over the rows' UTF-8 bytes, lowercase hex."""
    return manifest.root([r.encode('utf-8') for r in rows]).hex()


def laddr(vocab_sha, root):
    return '|'.join(['LADDR/1', vocab_sha, wordnet.ZIP_SHA256, 'L3/1', root, '3/4', '11/13', 'D3'])


def map_a_v0(wn, vocab=None):
    """Map A's words for V0 (lexicon.address.map_a with the noun and verb forests): (entries, words, report)."""
    from . import address as A
    vocab = wordpiece.load_v0() if vocab is None else vocab
    words, report = A.map_a(vocab.entries, wn, A.noun_words(wn), A.verb_words(wn))
    return vocab.entries, words, report


def laddr_v0(wn, vocab=None):
    """(LADDR/1 string, addrTableRoot, rows, map A report) for V0. Needs the WordNet archive."""
    vocab = wordpiece.load_v0() if vocab is None else vocab
    entries, words, report = map_a_v0(wn, vocab)
    rows = addr_rows(entries, words)
    root = addr_table_root(rows)
    return laddr(vocab.sha256, root), root, rows, report


# ================================================================ LPREP/1
def id_stream_sha(data, vocab):
    """SHA-256 of the V0 id stream of the whole shard as one instance: LEB128(number of ids), then LEB128 of each id
    (Amendment 1 item 2), over the ids of N_B + WordPiece of the shard's UTF-8 bytes."""
    ids = wordpiece.encode(bytes(data), vocab)[0]
    return hashlib.sha256(wordpiece.id_stream([ids])).hexdigest()


def engram_stream_sha(record):
    """SHA-256 of the record's engramStream (its hex string's UTF-8), or '-' with engrams off."""
    s = record.get('engramStream')
    return sha256hex(s) if isinstance(s, str) else '-'


def derived(record, data, vocab, weave3=None):
    """The LPREP/1 fields a verifier recomputes: chainId and merkleRoot (the record's, recomputed by the caller),
    byteLen and rawSha256 of the text's UTF-8, the V0 id stream's SHA-256, the exact weave's weave3Sha (over
    leafHashes) and the engram stream's SHA-256."""
    q = chain.exact_weave(record['leafHashes']) if weave3 is None else weave3
    return {'chainId': record['chainId'], 'merkleRoot': record['merkleRoot'], 'byteLen': str(len(data)),
            'rawSha256': sha256hex(bytes(data)), 'idStreamSha256': id_stream_sha(data, vocab),
            'weave3Sha': chain.weave3_sha(q), 'engramStreamSha': engram_stream_sha(record)}


def source_url_sha_c0():
    """C0's sourceUrlSha: the SHA-256 of the archive's URL (lexicon.wordnet.URL, as golden/wordnet_v1.cjs)."""
    return sha256hex(wordnet.URL)


def source_url_sha_synth(base, i):
    """A synthetic shard's sourceUrlSha: SHA-256 of 'rng:<base>+<i>'.

    READING: Amendment 7 item 3's 'rng:1000+i' is written with i in decimal and the base as the seed family the
    shard came from ('rng:1000+3' for shard 3 of L8's instances; 'rng:4000+3' in the dry run, 'rng:8000+3' in the
    traces)."""
    return sha256hex(f'rng:{base}+{i}')


def lprep(fields, tier=TIER_S, salt_hex=None):
    """The LPREP/1 string from a dict of its fields (format and tier filled in). Tier P (salt_hex given) writes
    chainId '-' and appends saltedRoot = SHA-256('LPREP-SALT/1|' + salt hex + '|' + merkleRoot + '|' + chainId).

    READING: a Tier-P record's tier field is 'P' (Amendment 7 writes tier 'S' for the records it defines and gives
    Tier P its own shape); its merkleRoot and other fields are written as in Tier S."""
    f = dict(fields)
    f['format'] = 'LPREP/1'
    f['tier'] = tier
    if tier == TIER_P:
        if salt_hex is None:
            raise ValueError('a Tier-P record needs its salt')
        salted = salted_root(salt_hex, f['merkleRoot'], f['chainId'])
        f['chainId'] = '-'
        return '|'.join(str(f[k]) for k in LPREP_FIELDS) + '|' + salted
    if tier != TIER_S or salt_hex is not None:
        raise ValueError('tier S has no salt')
    return '|'.join(str(f[k]) for k in LPREP_FIELDS)


def lprep_fields(record, data, vocab, corpus_id, shard_index, spdx, source_url_sha, lvocab_hash, laddr_hash,
                 weave3=None):
    """All fifteen fields of a shard's LPREP/1 (format and tier included as 'LPREP/1' and 'S')."""
    f = {'format': 'LPREP/1', 'corpusId': corpus_id, 'shardIndex': str(shard_index), 'spdx': spdx,
         'sourceUrlSha': source_url_sha, 'lvocabHash': lvocab_hash, 'laddrHash': laddr_hash, 'tier': TIER_S}
    f.update(derived(record, data, vocab, weave3))
    return f


def parse_lprep(s):
    """An LPREP/1 string as (fields dict, salted root or None). ValueError unless it has the registered shape:
    15 fields (tier S) or 16 (tier P, chainId '-')."""
    if not isinstance(s, str):
        raise ValueError('an LPREP/1 record is a string')
    parts = s.split('|')
    if len(parts) not in (15, 16) or parts[0] != 'LPREP/1':
        raise ValueError('not an LPREP/1 record')
    f = dict(zip(LPREP_FIELDS, parts[:15]))
    if len(parts) == 16:
        if f['tier'] != TIER_P or f['chainId'] != '-' or not _HEX64.fullmatch(parts[15]):
            raise ValueError('a 16-field LPREP/1 record is Tier P with chainId "-" and a salted root')
        _dec(f['shardIndex'])
        return f, parts[15]
    if f['tier'] != TIER_S:
        raise ValueError('a 15-field LPREP/1 record is Tier S')
    _dec(f['shardIndex'])
    return f, None


def salted_root(salt_hex, merkle_root, chain_id_):
    return sha256hex(f'LPREP-SALT/1|{salt_hex}|{merkle_root}|{chain_id_}')


def test_salt(j):
    """The test salt of shard j: the SHA-256 of 'lexicon-test-salt/1|j' (32 bytes), returned as lowercase hex."""
    return sha256hex(f'lexicon-test-salt/1|{j}')


# ================================================================ LCORPUS/1 and LGROW/1
def corpus_leaves(lpreps):
    """LCORPUS leaves: the 32-byte SHA-256 digests of the LPREP/1 strings, in shard order."""
    return [hashlib.sha256(s.encode('utf-8')).digest() for s in lpreps]


def corpus_log(lpreps):
    return manifest.Log(corpus_leaves(lpreps))


def spdx_set_sha(spdx_values):
    """SHA-256 of the corpus's licence set.

    READING: the set is the distinct SPDX identifiers of its shards, sorted by code point and joined by ','."""
    return sha256hex(','.join(sorted(set(spdx_values))))


def lcorpus(corpus_id, lpreps, spdx_values, log=None):
    """LCORPUS/1|corpusId|N|root|spdxSetSha|-|-|-|- (the evaluation-set, contamination and Croissant fields empty
    until Phase 6)."""
    log = corpus_log(lpreps) if log is None else log
    return '|'.join(['LCORPUS/1', corpus_id, str(len(lpreps)), log.root().hex(), spdx_set_sha(spdx_values),
                     '-', '-', '-', '-'])


def proof_sha(proof):
    """SHA-256 of a proof's hashes concatenated (raw bytes), lowercase hex."""
    return hashlib.sha256(b''.join(proof)).hexdigest()


def lgrow(corpus_id, n_old, root_old, n_new, root_new, proof):
    """LGROW/1|corpusId|N_old|root_old|N_new|root_new|proofSha (roots as bytes or hex)."""
    h = lambda r: r.hex() if isinstance(r, (bytes, bytearray)) else r  # noqa: E731
    return '|'.join(['LGROW/1', corpus_id, str(n_old), h(root_old), str(n_new), h(root_new), proof_sha(proof)])


def grow_record(lpreps, corpus_id, n_old=None, log=None):
    """The LGROW/1 string and its consistency proof from the first n_old shards (N - 1 by default) to all N.

    READING: from n_old = 0 (a one-shard corpus) the old root is MTH({}) = SHA-256('') and the proof is empty."""
    log = corpus_log(lpreps) if log is None else log
    n = len(lpreps)
    n_old = n - 1 if n_old is None else n_old
    proof = log.consistency(n_old, n) if n_old > 0 else []
    return lgrow(corpus_id, n_old, log.root(n_old), n, log.root(), proof), proof


def parse_lcorpus(s):
    parts = s.split('|') if isinstance(s, str) else []
    if len(parts) != 9 or parts[0] != 'LCORPUS/1' or not _HEX64.fullmatch(parts[3]) or parts[5:] != ['-'] * 4:
        raise ValueError('not an LCORPUS/1 record')
    return {'corpusId': parts[1], 'N': _dec(parts[2]), 'root': parts[3], 'spdxSetSha': parts[4]}


def parse_lgrow(s):
    parts = s.split('|') if isinstance(s, str) else []
    if len(parts) != 7 or parts[0] != 'LGROW/1' or not all(_HEX64.fullmatch(parts[k]) for k in (3, 5, 6)):
        raise ValueError('not an LGROW/1 record')
    return {'corpusId': parts[1], 'N_old': _dec(parts[2]), 'root_old': parts[3], 'N_new': _dec(parts[4]),
            'root_new': parts[5], 'proofSha': parts[6]}
