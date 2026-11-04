"""The zero-point clock that carries the window, and the 720-frame register (claim E4).

From the preregistration: channel j (alpha, beta, gamma for j = 0, 1, 2) onloads one packet per 24-frame joint
cycle at joint frame 18, 10 or 2 and offloads it twelve frames later; a packet belongs to the ten-frame block of
its offload frame; a register is 720 frames, its 72 blocks fall into 10 groups by m -> floor(10m / 72).

Two [DEFINITION]s complete it:
  * Slots are filled in time order (first in, first out): the joint frames 2, 10, 18 of each cycle carry the next
    three tokens, on channels 2, 1, 0. So the order of tokens is the order of onloads and of offloads, and a
    register's product of address quaternions is a contiguous piece of the chain's word (it unfolds).
  * The word written at a zero point (joint frame 0) is the last three packets latched by then, oldest first:
    alpha, beta, gamma, as in Owl Academy's window. It is written at address (count mod 30), as in Tri-Engine
    Convergence.
Frames are numbered from 1, as on the Zero-Point Tri-Engine; register r holds frames 720 r + 1 ... 720 (r + 1).
"""
from fractions import Fraction

from . import orbital as O
from .address import qprod, norm
from hpstep.problems import qmul, qconj

SLOT_FRAMES = (2, 10, 18)               # joint frames of the onload slots, in time order
SLOT_CHANNELS = (2, 1, 0)               # the channel onloading at each: gamma at 2, beta at 10, alpha at 18
assert all(O.ON[c] == f for f, c in zip(SLOT_FRAMES, SLOT_CHANNELS))


def schedule(n):
    """Onload frame, offload frame and channel of tokens 0 .. n-1."""
    out = []
    for t in range(n):
        cyc, i = divmod(t, 3)
        on = 24 * cyc + SLOT_FRAMES[i]
        ch = SLOT_CHANNELS[i]
        assert (on + 12) % 24 == O.OFF[ch]
        out.append({'token': t, 'channel': ch, 'on': on, 'off': on + 12})
    return out


def place(F):
    """Register, block and group of frame F."""
    r, f = divmod(F - 1, 720)
    m = f // 10
    return r, m, (10 * m) // 72


def zero_points(sched):
    """The zero points at which a word is written: every F = 24 n once three packets have latched, through the
    zero point after the last offload. Each entry: frame, the indices of the last three latched tokens."""
    if len(sched) < 3:
        return []
    last = sched[-1]['off']
    out, F = [], 24
    while F <= last + 24:
        latched = [s['token'] for s in sched if s['off'] <= F]
        if len(latched) >= 3:
            out.append({'F': F, 'tokens': latched[-3:]})
        F += 24
    return out


def membrane_turn():
    """The common turn the membrane leaves on the three nodes at a zero point: each channel's latched packet has
    ridden its helix from its offload to the zero point (free-run), and the membrane keeps s / 3 of the three."""
    raw = [O.carried_turns(ch, (24 - O.OFF[ch]) % 24) for ch in range(3)]
    return (raw[0] + raw[1] + raw[2]) / 3


def registers(sched, quats):
    """Every register the run reaches: its packets (offload order), the 72 block and 10 group products, and
    whether it is complete (the run passes its last frame)."""
    last = max(s['off'] for s in sched) if sched else 0
    regs = {}
    for s, q in zip(sched, quats):
        r, m, l = place(s['off'])
        R = regs.setdefault(r, {'r': r, 'packets': [], 'blocks': [[] for _ in range(72)]})
        R['packets'].append((s['token'], q))
        R['blocks'][m].append(q)
    out = []
    for r in sorted(regs):
        R = regs[r]
        blocks = [qprod(b) for b in R['blocks']]
        groups = [qprod([blocks[m] for m in range(72) if (10 * m) // 72 == l]) for l in range(10)]
        R.update({'complete': 720 * (r + 1) <= last, 'block_q': blocks, 'group_q': groups,
                  'packet_q': qprod([q for _, q in R['packets']])})
        out.append(R)
    return out


def telescopes(R, blocks=None, groups=None):
    """The three ordered products agree, and the compensator H = conj(q) gives H q = N(q) 1."""
    blocks = R['block_q'] if blocks is None else blocks
    q = R['packet_q']
    b = qprod(blocks)
    g = qprod([qprod([blocks[m] for m in range(72) if (10 * m) // 72 == l]) for l in range(10)]) if groups is None else qprod(groups)
    comp = qmul(qconj(q), q) == (norm(q), 0, 0, 0)
    return q == b == g and comp


def engagement(sched, r, mode):
    """Engaged frames of each channel over register r: 'free' (free-run, and the membrane setting) engages every
    frame; 'hold' engages a channel only while a packet is in flight, the frames after its onload through its
    offload."""
    bits = [[0] * 720 for _ in range(3)]
    for ch in range(3):
        for i in range(720):
            F = 720 * r + i + 1
            if mode == 'free':
                bits[ch][i] = 1
            else:
                bits[ch][i] = 1 if any(s['channel'] == ch and s['on'] < F <= s['off'] for s in sched) else 0
    return [O.pump_of(b) for b in bits]
