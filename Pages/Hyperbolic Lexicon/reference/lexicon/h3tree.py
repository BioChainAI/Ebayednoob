"""Exact H^3 points of a whole forest: hpstep's octahedral tree (decoder3d.TreeEmbedding3D, t = 3/4, tau = ln 7), as
integer frames over 7^n, for L3(e) and the H3 arm of L4/L5 (D3; Amendment 1, items 5-7).

hpstep's exact step matrices times 7 are integer matrices (cosh tau = 25/7, sinh tau = 24/7, and the rotations are
signed permutations), so the frame of a word of n letters is an integer matrix over 7^n. Frames are built once per
distinct prefix (a sorted trie walk), so a forest of N words with T distinct prefixes costs T sparse 4x4 steps.
A point is an integer 4-vector X with x = X / 7^n, n = len(word); the sheet identity reads
X0^2 - X1^2 - X2^2 - X3^2 = 49^n with X0 > 0.

    points(words)              [X] for a list of words (tuples), aligned; x = X / 7^len
    point(word)                one word
    on_sheet(X, n)             the sheet identity, exactly
    fractions(X, n)            the point as Fractions (hpstep's point_exact form)
    decode_exact(X, n)         hpstep's TreeEmbedding3D.decode_exact (Fractions), the authority of L3(e)
    decode_int(X, n)           the same greedy descent on integers only (proof below), for speed
    float_point(word), float_decode(y, n), float_ok(word)   L3 control 3: hpstep's float point and decode
    coords_lowest(X, den), coord_bits(X, den), point_bits(X, den), coords_text(X, den)   bits and canonical text
    walk(words, state0, step)  the sorted trie walk, shared by h2exact and flat
    arm(words, name)           the H3 arm for lexicon.rank (one common denominator 7^Lmax)

hpstep.decode3d (OCTA, LOCAL, slot_direction, TreeEmbedding3D) and hpstep.problems (children) are imported in
place, unchanged.
"""
import math
from fractions import Fraction

from hpstep.decode3d import OCTA, TreeEmbedding3D, decode_exact as octa_decode_exact, slot_direction
from hpstep.problems import children

EMB = TreeEmbedding3D()                         # t = 3/4: the tree of D3 and L3(e)
BASE = 7                                        # x = X / 7^n
TAU = math.log(7)


def _int7(M):
    out = []
    for row in M:
        r = []
        for x in row:
            y = Fraction(x) * BASE
            if y.denominator != 1:
                raise ValueError('7 times a step matrix is not integral')
            r.append(int(y))
        out.append(tuple(r))
    return tuple(out)


STEP7 = tuple(_int7(M) for M in EMB.step_q)         # STEP7[s] = 7 * hpstep's exact step for OCTA direction s
STEP7_INV = tuple(_int7(M) for M in EMB.step_inv_q)  # 7 * J M^T J


def _sparse_columns(M):
    """For each column j of M: the (k, M[k][j]) with M[k][j] != 0."""
    return tuple(tuple((k, M[k][j]) for k in range(len(M)) if M[k][j]) for j in range(len(M)))


_COLS = tuple(_sparse_columns(M) for M in STEP7)


def walk(words, state0, step):
    """The state of every word (aligned with `words`), each prefix's state computed once.

    step(state, prev, g, i) -> the state of word[:i + 1] from that of word[:i], g = word[i], prev = word[i - 1]
    (None at the root). Words are visited in sorted order with a stack of the previous word's prefix states, so the
    cost is one step per distinct prefix (trie node)."""
    order = sorted(range(len(words)), key=words.__getitem__)
    out = [None] * len(words)
    stack, prev_word = [state0], ()
    for j in order:
        w = words[j]
        k, lim = 0, min(len(w), len(prev_word))
        while k < lim and w[k] == prev_word[k]:
            k += 1
        del stack[k + 1:]
        for i in range(k, len(w)):
            stack.append(step(stack[-1], w[i - 1] if i else None, w[i], i))
        out[j] = stack[len(w)]
        prev_word = w
    return out


def _step(F, prev, g, i):
    """F (a tuple of 4 integer columns) times STEP7 of the slot of g after prev."""
    s = g if prev is None else slot_direction((prev,), g)
    cols = []
    for terms in _COLS[s]:
        if len(terms) == 1:
            (k, c), = terms
            a = F[k]
            cols.append((c * a[0], c * a[1], c * a[2], c * a[3]))
        else:
            (k1, c1), (k2, c2) = terms
            a, b = F[k1], F[k2]
            cols.append((c1 * a[0] + c2 * b[0], c1 * a[1] + c2 * b[1], c1 * a[2] + c2 * b[2], c1 * a[3] + c2 * b[3]))
    return tuple(cols)


I_COLS = ((1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1))
assert all(len(t) in (1, 2) for c in _COLS for t in c)


def frames(words):
    """The integer frames (tuples of 4 columns) over 7^len, aligned with `words`."""
    return walk([tuple(w) for w in words], I_COLS, _step)


def points(words):
    """The exact H^3 points of `words` (tuples or lists of letters), aligned: integer 4-tuples X, x = X / 7^len."""
    return [F[0] for F in frames(words)]


def point(word):
    return points([tuple(word)])[0]


def den(n):
    return BASE ** n


def on_sheet(X, n):
    """X0^2 - X1^2 - X2^2 - X3^2 = 49^n and X0 > 0: the exact sheet identity of x = X / 7^n."""
    return X[0] > 0 and X[0] * X[0] - X[1] * X[1] - X[2] * X[2] - X[3] * X[3] == 49 ** n


def fractions(X, n):
    d = BASE ** n
    return [Fraction(x, d) for x in X]


# ================================================================ decoding
def decode_exact(X, n, L=None):
    """hpstep's exact greedy descent (TreeEmbedding3D.decode_exact, Fractions) on x = X / 7^n, to depth L (default
    n). This is the authority for L3(e) (Amendment 1, item 6)."""
    return tuple(EMB.decode_exact(fractions(X, n), n if L is None else L))


def decode_int(X, L):
    """The same greedy descent as hpstep's decode_exact (anchor at the root), on integers only.

    hpstep, at each level: v = the query's spatial part in the current frame, k = decode_exact(v, dirs) with dirs the
    OCTA directions of the allowed children (argmax of <a_k, v>, ties to the lowest index), then the query is carried
    into the child's frame by step_inv_q[slot]. Here the query is held as an integer vector Y = c x with c > 0 (c =
    7^n at the start, for x = X / 7^n), and carried by STEP7_INV[slot] = 7 step_inv_q[slot], so c is multiplied by 7
    at each level and stays positive. Each argmax compares the same linear forms of v scaled by c > 0, so every
    comparison, every tie and every choice is the same; by induction the words are equal. (Here the forms are signed
    coordinates, since OCTA's directions are signed axes.) X may carry any positive scale, not only 7^n."""
    word, v = [], tuple(X)
    for _ in range(L):
        allowed = children(word)
        dirs = [OCTA[slot_direction(word, g)] for g in allowed]
        k = octa_decode_exact(v, dirs)
        g = allowed[k]
        S = STEP7_INV[slot_direction(word, g)]
        word.append(g)
        v = tuple(S[i][0] * v[0] + S[i][1] * v[1] + S[i][2] * v[2] + S[i][3] * v[3] for i in range(4))
    return tuple(word)


def float_point(word):
    """L3 control 3: hpstep's float frame product (TreeEmbedding3D.point)."""
    return EMB.point(list(word))


def float_decode(y, L):
    """L3 control 3: hpstep's float greedy decoder (TreeEmbedding3D.decode)."""
    return tuple(EMB.decode(y, L))


def float_ok(word):
    """Float placement then float decoding returns the word (control 3 must find a word where it does not)."""
    return float_decode(float_point(word), len(word)) == tuple(word)


# ================================================================ bits and canonical text (shared by h2exact, flat)
def coords_lowest(X, d):
    """Each coordinate X_i / d in lowest terms, as (p, q) with q >= 1 (0 is 0/1)."""
    out = []
    for x in X:
        g = math.gcd(x, d)
        out.append((x // g, d // g))
    return out


def coords_text(X, d):
    """Amendment 1, item 6 (f): the coordinates in lowest terms, 'p/q' (q >= 1, written even when 1), space-joined."""
    return ' '.join(f'{p}/{q}' for p, q in coords_lowest(X, d))


def coord_bits(X, d):
    """[(numerator bits, denominator bits)] per coordinate in lowest terms (L3's reported maximum bits)."""
    return [(abs(p).bit_length(), q.bit_length()) for p, q in coords_lowest(X, d)]


def point_bits(X, d):
    """Amendment 1, item 7: the point over one common denominator (the lcm of its coordinates' lowest-terms
    denominators), numerator bits plus denominator bits: sum of |numerator| bit lengths + bit length of the
    denominator, as spike S2's 'pt'."""
    lo = coords_lowest(X, d)
    D = 1
    for _, q in lo:
        D = D * q // math.gcd(D, q)
    return sum(abs(p * (D // q)).bit_length() for p, q in lo) + D.bit_length()


# ================================================================ the arm
def arm(words, name='H3'):
    """The H3 arm for lexicon.rank: the points of `words` over the common denominator 7^Lmax."""
    from .rank import Arm
    pts = points(words)
    L = max(len(w) for w in words)
    return Arm.from_points(name, 'lorentz', pts, [BASE ** (L - len(w)) for w in words], BASE ** L, tau=TAU)
