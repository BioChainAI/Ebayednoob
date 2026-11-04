"""The watch layer (claims E7 and E8): the 0.7 Claude fence as a screen for misplaced memories in the H^3 tree,
settled by an exact address check, and its ln 2 guard on stored distances. hpstep.fence and hpstep.decode3d are
used in place.

E7 instance: the fence's own generator (kind 'tree', out.mode 'deep') gives the tree to depth L, every memory at its
recorded address, followed by k memories placed d levels too deep. A memory is flagged when the fence's verdict is
1 or 2. Settlement compares, in exact rationals, a memory's point with the point of its recorded address: a memory
in its proper place is recorded at its own word; a misplaced memory at its depth-L ancestor. The ancestor is read
from the misplaced memory's own word, which decode_exact recovers and the check confirms exactly [DEFINITION].

E8 instance: 24 memories drawn without replacement from the depth-2 tree (hpstep Rng(1000 + i).sample), one pair's
distance raised by delta with fence.corrupt (its pair drawn with seed 2000 + i).
"""
from hpstep import fence as Fz
from hpstep.decode3d import TreeEmbedding3D
from hpstep.prng import Rng

_EMB = None


def emb():
    global _EMB
    if _EMB is None:
        _EMB = TreeEmbedding3D()
    return _EMB


def tree_words(L):
    """The tree's words in the order fence.generate lays them out."""
    from hpstep.problems import children
    words = [()]
    for depth in range(L):
        for w in [w for w in words if len(w) == depth]:
            words += [w + (c,) for c in children(w)]
    return words


def e7_instance(L, k, d, seed):
    pts, labels = Fz.generate({'dim': 3, 'kind': 'tree', 'L': L, 'seed': seed, 'out': {'k': k, 'mode': 'deep', 'depth': d}})
    res = Fz.fence(pts, 3)
    words = tree_words(L)
    E = emb()
    n_proper = len(words)
    assert len(pts) == n_proper + k
    flagged_proper = flagged_misplaced = settle_fail = 0
    cases = []
    for i, (p, lab) in enumerate(zip(pts, labels)):
        flag = res['verdict'][i] >= 1
        if lab == 0:
            recorded = tuple(words[i])
        else:
            full = tuple(E.decode_exact(p, L + d))
            if E.point_exact(full) != p:
                raise AssertionError('a misplaced memory whose word does not decode exactly')
            recorded = full[:L]
        on_address = E.point_exact(recorded) == p
        if flag:
            if lab == 0:
                flagged_proper += 1
                ok = on_address                     # must be cleared
            else:
                flagged_misplaced += 1
                ok = not on_address                 # must be confirmed
            if not ok:
                settle_fail += 1
            cases.append({'i': i, 'misplaced': bool(lab), 'cleared': on_address, 'ok': ok})
    return {'L': L, 'k': k, 'd': d, 'seed': seed, 'n_proper': n_proper, 'flagged_proper': flagged_proper,
            'flagged_misplaced': flagged_misplaced, 'detection': flagged_misplaced / k, 'settle_fail': settle_fail,
            'flags': cases}


def depth2_points():
    pts, _ = Fz.generate({'dim': 3, 'kind': 'tree', 'L': 2, 'seed': 0})
    return pts


def e8_instance(i, deltas=(0.5, 1.0, 1.5, 3.0), pts=None):
    pts = pts or depth2_points()
    idx = Rng(1000 + i).sample(len(pts), 24)
    D = Fz.distance_matrix([pts[j] for j in idx])
    clean = Fz.guard_check(D)
    out = {'i': i, 'clean_worst': clean['worst'], 'clean_bad': clean['bad'], 'blame': {}}
    for delta in deltas:
        Ec, pairs = Fz.corrupt(D, 1, delta, 2000 + i)
        g = Fz.guard_check(Ec)
        top = tuple(g['top'][0][0]) if g['top'] else None
        out['blame'][delta] = {'pair': tuple(pairs[0]), 'top': top, 'bad': g['bad'], 'hit': top == tuple(pairs[0])}
    return out
