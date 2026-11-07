"""The L3 address rule, its two controls, the verb forest, certifyWord, the bijective 59/64-bit id codec (D6), the
prefix check of L3(d), map A for vocabulary entries (Amendment 1, item 4), and the word sets of L5's S3 and K3 arms.

The rule (L3): the spanning parent is the first '@' or '@i' pointer (lexicon.wordnet.spanning_forest); children are
ordered by synset offset; child k of a node with c children takes m = max(1, ceil(log5 c)) letters, the m base-5
digits of k, most significant first, each choosing hpstep.problems.children(current word)[digit]. entity.n.01 sits
at the word [0]. The verb forest (Amendment 1, item 10) hangs its 559 roots under a virtual root at [1], as that
root's children by the same rule. Words are tuples of letters 0..5 (the generators 1 +- 2i, 1 +- 2j, 1 +- 2k).

    letters_for(c), child_word(parent_word, k, c, variant)      the rule ('rule') and its controls ('zero', 'trunc')
    forest_words(parent, children, roots, root_word, variant)    {offset: word} for a whole forest
    noun_words(wn, variant), verb_words(wn, variant)            the two WordNet forests
    certify(word), certify_parts(word)                          L3(c) with hpstep's word_quaternion/right_divide
    word_id(word), id_word(n), id59(word), id64(word)           D6, the bijective mixed-radix id
    prefix_check(words, parent)                                 L3(d) by a trie walk (Amendment 1, item 6)
    map_a(entries, wn, noun_words, verb_words)                  Amendment 1, item 4: one word per vocabulary entry
    s3_words(words, seed), k3_word(lemma), k3_words(wn, offsets)  L5's control arms (Amendment 1, item 7)

hpstep.problems (children, word_quaternion, right_divide, is_reduced) and engram.address (encode) are imported
in place, unchanged.
"""
import hashlib

from engram.address import encode as engram_encode
from hpstep.prng import Rng
from hpstep.problems import children, is_reduced, right_divide, word_quaternion

from . import wordnet as W

VARIANTS = ('rule', 'zero', 'trunc')
NOUN_ROOT = (0,)
VERB_ROOT = (1,)
ID59_MAX_LEN = 25
ID64_MAX_LEN = 27


# ================================================================ the rule and its two controls
def letters_for(c):
    """max(1, ceil(log5 c)) in integers: the least m with 5^m >= c, at least 1."""
    return max(1, letters_for_zero(c))


def letters_for_zero(c):
    """ceil(log5 c) without the max(1, .): 0 for a single child (L3 control 1)."""
    m, p = 0, 1
    while p < c:
        p *= 5
        m += 1
    return m


def child_word(parent_word, k, c, variant='rule'):
    """The word of child k (0-based, in offset order) of a node with c children, as a tuple.

    variant 'rule': the L3 rule. 'zero' (control 1): m = ceil(log5 c), so an only child gets no letter and shares
    its parent's word. 'trunc' (control 2): children beyond the fifth are folded into the fifth child."""
    if not 0 <= k < c:
        raise ValueError(f'child {k} of {c}')
    if variant == 'rule':
        m = letters_for(c)
    elif variant == 'zero':
        m = letters_for_zero(c)
    elif variant == 'trunc':
        # READING: "children beyond the fifth are folded into the fifth child": every child takes one letter, the
        # digit min(k, 4), so children 5, 6, ... get the fifth child's word (and their subtrees overlap its own).
        m, k = 1, min(k, 4)
    else:
        raise ValueError(f'unknown variant {variant!r}')
    digits = []
    x = k
    for _ in range(m):
        digits.append(x % 5)
        x //= 5
    if x:
        raise ValueError(f'child {k} does not fit {m} letters')
    w = list(parent_word)
    for d in reversed(digits):
        w.append(children(w)[d])
    return tuple(w)


def forest_words(parent, children_of, roots, root_word, variant='rule', virtual=None):
    """{offset: word} for a spanning forest (parent, children, roots as lexicon.wordnet.spanning_forest returns them).

    virtual=False: the forest is one tree and its root sits at root_word (the nouns: entity.n.01 at [0]).
    virtual=True: the roots, in offset order, are the children of a virtual root at root_word, by the rule (the
    verbs: 559 roots under [1]). The default (None) is False for a single root and True otherwise. The virtual root
    itself gets no entry. Children lists must be in offset order, as spanning_forest gives them."""
    if virtual is None:
        virtual = len(roots) != 1
    root_word = tuple(root_word)
    if virtual:
        stack = [(o, child_word(root_word, k, len(roots), variant)) for k, o in enumerate(roots)]
    else:
        if len(roots) != 1:
            raise ValueError(f'a forest of {len(roots)} roots needs a virtual root')
        stack = [(roots[0], root_word)]
    out = {}
    while stack:
        o, w = stack.pop()
        if o in out:
            raise ValueError(f'{o} reached twice: not a forest')
        out[o] = w
        ks = children_of.get(o, ())
        for k, c in enumerate(ks):
            if parent.get(c) != o:
                raise ValueError(f'{c} is listed under {o} but its parent is {parent.get(c)}')
            stack.append((c, child_word(w, k, len(ks), variant)))
    if len(out) != len(parent):
        raise ValueError(f'{len(parent) - len(out)} nodes are not reachable from the roots')
    return out


_WORDS = {}


def noun_words(wn, variant='rule'):
    """The L3 words of all 82,115 noun synsets: entity.n.01 at [0]. Cached per (wn, variant); do not mutate."""
    key = (id(wn), 'noun', variant)
    if key not in _WORDS:
        parent, kids, roots = W.spanning_forest(wn['synsets']['noun'])
        if roots != [W.ENTITY]:
            raise ValueError(f'the noun forest has roots {roots[:5]}..., not entity.n.01 alone')
        _WORDS[key] = forest_words(parent, kids, roots, NOUN_ROOT, variant, virtual=False)
    return _WORDS[key]


def verb_words(wn, variant='rule'):
    """The verb forest's words (Amendment 1, item 10): the 559 roots are the children of a virtual root at [1]."""
    key = (id(wn), 'verb', variant)
    if key not in _WORDS:
        parent, kids, roots = W.spanning_forest(wn['synsets']['verb'])
        _WORDS[key] = forest_words(parent, kids, roots, VERB_ROOT, variant, virtual=True)
    return _WORDS[key]


def word_str(word):
    """The canonical text of a word: its letters as digits, no separator ('0213')."""
    return ''.join(map(str, word))


def words_sha256(words, offsets=None):
    """SHA-256 of the lines 'offset word' + LF, in offset order (spike S3's verb.words.sha256 format)."""
    offsets = sorted(words) if offsets is None else offsets
    return hashlib.sha256(''.join(f'{o} {word_str(words[o])}\n' for o in offsets).encode()).hexdigest()


# ================================================================ L3(c): certifyWord
def certify_parts(word):
    """certifyWord's three checks (Amendment 1, item 6): the integer quaternion has norm exactly 5^len, right
    division returns the word, and the word is reduced. Returns the three booleans."""
    q = word_quaternion(word)
    n = len(word)
    return (sum(c * c for c in q) == 5 ** n, right_divide(q, n) == list(word), is_reduced(word))


def certify(word):
    return all(certify_parts(word))


# ================================================================ D6: the bijective mixed-radix id
def start_of(n):
    """The number of reduced words shorter than n letters, the empty word included: 1 + 6 (5^(n-1) - 1) / 4."""
    return 0 if n == 0 else 1 + 6 * (5 ** (n - 1) - 1) // 4


def word_id(word):
    """id(w) = (reduced words shorter than w) + (rank of w at its length: first letter base 6, then each later
    letter's index among children(word so far), base 5; the first letter is the most significant digit).

    READING: the empty word is a reduced word (id 0), and the first letter is the leading digit; both as in
    explainers/architecture.html (idOf/wordOf) and its count 1 + 6 (5^25 - 1)/4 of words up to 25 letters."""
    if not word:
        return 0
    if not 0 <= word[0] < 6:
        raise ValueError(f'not a letter: {word[0]}')
    r = word[0]
    for i in range(1, len(word)):
        r = r * 5 + children((word[i - 1],)).index(word[i])      # children() depends on the last letter only
    return start_of(len(word)) + r


def id_word(n):
    """The inverse of word_id: the reduced word with id n (a tuple)."""
    if n < 0:
        raise ValueError('ids are non-negative')
    if n == 0:
        return ()
    L = 1
    while start_of(L + 1) <= n:
        L += 1
    r = n - start_of(L)
    idx = []
    for _ in range(L - 1):
        idx.append(r % 5)
        r //= 5
    w = [r]
    for j in reversed(idx):
        w.append(children(w)[j])
    return tuple(w)


def id59(word):
    """The 59-bit id of a word of at most 25 letters; None (not covered, never a failure) for a longer word."""
    return word_id(word) if len(word) <= ID59_MAX_LEN else None


def id64(word):
    """The 64-bit id of a word of at most 27 letters; None for a longer word."""
    return word_id(word) if len(word) <= ID64_MAX_LEN else None


# ================================================================ L3(d): ancestors are exactly the proper prefixes
def prefix_check(words, parent):
    """Amendment 1, item 6: walk every node's word through a trie of all words; the synsets met at proper prefixes
    must be exactly its spanning ancestors (parent chain). O(N L). Returns the failures as a list of
    (offset, sorted synsets met at proper prefixes, sorted ancestors); [] when L3(d) holds."""
    END = -1
    trie = {}
    for o, w in words.items():
        node = trie
        for g in w:
            node = node.setdefault(g, {})
        node.setdefault(END, []).append(o)
    fails = []
    for o, w in words.items():
        met, node = [], trie
        for g in w[:-1]:
            node = node[g]
            met.extend(node.get(END, ()))
        anc, p = [], parent.get(o)
        while p is not None:
            anc.append(p)
            p = parent.get(p)
        if len(met) != len(anc) or set(met) != set(anc):
            fails.append((o, sorted(met), sorted(anc)))
    return fails


# ================================================================ map A (Amendment 1, item 4)
SPECIALS = ('[PAD]', '[UNK]', '[CLS]', '[SEP]', '[MASK]')
_BERT_ASCII_PUNCT = frozenset(list(range(0x21, 0x30)) + list(range(0x3A, 0x41)) + list(range(0x5B, 0x61))
                              + list(range(0x7B, 0x7F)))


def nb_punct(ch):
    """N_B's punctuation (Amendment 1, item 1, step 6): BERT's ASCII ranges 21-2F, 3A-40, 5B-60, 7B-7E, or a 15.1
    category starting with P, read from the pinned table through lexicon.normalise, as N_B itself reads it (so map A
    never depends on the interpreter's own Unicode version)."""
    from .normalise import PUNCT, _flags
    return bool(_flags()[ord(ch)] & PUNCT)


def is_special(entry):
    """[PAD], [UNK], [CLS], [SEP], [MASK] and V1's [unusedN]."""
    return entry in SPECIALS or (entry.startswith('[unused') and entry.endswith(']') and entry[7:-1].isdigit()
                                 and entry[7:-1].isascii())


def _digits_word(root, values, m):
    """[root] followed by each value in m base-5 digits, most significant first, each choosing children()[digit]."""
    w = [root]
    for v in values:
        digits = []
        for _ in range(m):
            digits.append(v % 5)
            v //= 5
        if v:
            raise ValueError('value does not fit')
        for d in reversed(digits):
            w.append(children(w)[d])
    return tuple(w)


def map_a(entries, wn, noun_words, verb_words, is_punct=nb_punct):
    """Map A: one reduced word per vocabulary entry (entries in id order). Returns (words, report).

    Root 5: the specials and every whole-word entry made only of digits 0-9 or only of N_B punctuation; the j-th
    in id order gets [5] + j in max(1, ceil(log5 n5)) digits. Root 0 / 1: a whole-word entry equal to a single-word
    WordNet lemma whose part of speech (the largest tagsense_cnt among the index files that list it, ties noun,
    verb, adj, adv) is noun / verb: the L3 word / verb-forest word of the first synset its index lists. Root 2: such
    an entry whose part of speech is adjective or adverb; root 3: every '##' entry ('##' removed); root 4: every other
    whole-word entry. Roots 2-4 spell the characters, each as its index in the trie alphabet (the distinct code
    points of all entries outside root 5, '##' removed, in code-point order) in max(1, ceil(log5 A)) digits.

    READING: the roots are decided in the order listed (root 5 first, so an all-digit lemma such as '1' is root 5);
    a '##' entry is never root 5 or a lemma; '##' is removed once from the front. The report: entries per root,
    n5 and its digit count, the alphabet size A and its digit count, and the addresses shared by two or more entries
    (A is not injective: synonyms whose first senses coincide share one)."""
    index = wn['index']
    root_of, lemma_word = [], {}
    for i, e in enumerate(entries):
        cont = e.startswith('##')
        if not cont and (is_special(e) or (e and (all(c in '0123456789' for c in e) or all(is_punct(c) for c in e)))):
            root_of.append(5)
            continue
        if cont:
            root_of.append(3)
            continue
        listed = [pos for pos in W.POS if '_' not in e and e in index[pos]]
        if listed:
            best = max(listed, key=lambda pos: (index[pos][e].tagsense, -W.POS.index(pos)))
            if best == 'noun':
                root_of.append(0)
                lemma_word[i] = noun_words[index['noun'][e].offsets[0]]
            elif best == 'verb':
                root_of.append(1)
                lemma_word[i] = verb_words[index['verb'][e].offsets[0]]
            else:
                root_of.append(2)
            continue
        root_of.append(4)
    text = [e[2:] if r == 3 else e for e, r in zip(entries, root_of)]
    alphabet = sorted({c for t, r in zip(text, root_of) if r != 5 for c in t})
    letter = {c: j for j, c in enumerate(alphabet)}
    m_a = letters_for(len(alphabet)) if alphabet else 1
    n5 = sum(1 for r in root_of if r == 5)
    m5 = letters_for(n5) if n5 else 1
    words, j5 = [], 0
    for i, (t, r) in enumerate(zip(text, root_of)):
        if r == 5:
            words.append(_digits_word(5, [j5], m5))
            j5 += 1
        elif r in (0, 1):
            words.append(tuple(lemma_word[i]))
        else:
            words.append(_digits_word(r, [letter[c] for c in t], m_a))
    holders = {}
    for i, w in enumerate(words):
        holders.setdefault(w, []).append(i)
    shared = sorted((ids for ids in holders.values() if len(ids) > 1), key=lambda ids: ids[0])
    report = {
        'entries': len(entries),
        'per_root': {r: root_of.count(r) for r in range(6)},
        'n5': n5, 'm5': m5, 'alphabet': len(alphabet), 'm_alphabet': m_a,
        'distinct_words': len(holders),
        'shared_addresses': len(shared),
        'entries_sharing': sum(len(ids) for ids in shared),
        'shared': shared,
        'max_len': max((len(w) for w in words), default=0),
    }
    return words, report


# ================================================================ L5's control arms (Amendment 1, item 7)
def s3_words(words, seed):
    """S3: the words (a list in the instance set's offset order) permuted among synsets of equal word length. One
    Rng(seed) for all lengths: for each length in increasing order, that length's words in offset order are permuted
    by Rng.shuffle. Returns a new list in the same order."""
    rng = Rng(seed)
    out = list(words)
    by_len = {}
    for i, w in enumerate(words):
        by_len.setdefault(len(w), []).append(i)
    for L in sorted(by_len):
        idx = by_len[L]
        ws = rng.shuffle([words[i] for i in idx])
        for i, w in zip(idx, ws):
            out[i] = w
    return out


def k3_word(lemma):
    """K3: engram.address.encode(v), v the first 8 bytes of SHA-256 of the lemma's UTF-8 read big-endian; 28 letters
    from the root."""
    v = int.from_bytes(hashlib.sha256(lemma.encode('utf-8')).digest()[:8], 'big')
    return tuple(engram_encode(v))


def k3_words(wn, offsets, pos='noun'):
    """K3 words of the synsets `offsets`: the first lemma of each data line, as stored (underscores kept)."""
    syn = wn['synsets'][pos]
    return [k3_word(syn[o].lemmas[0]) for o in offsets]
