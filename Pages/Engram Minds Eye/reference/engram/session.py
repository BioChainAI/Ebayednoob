"""One dialogue run end to end: the 128-bit packet chain (engram/1), the address of every packet, the clock, the
words written at the zero points with their Merkle roots and SHA-256 links, the gauge of every packet's footer,
the registers, and optionally the coupler.

Everything a run produces is gathered in `outputs()`, so two runs (coupler on and off, claim E5 K2) can be compared
field by field.
"""
from fractions import Fraction

from . import orbital as O
from .address import packet_quaternions
from .clock import schedule, zero_points, registers
from .coupler import Coupler
from .memory import Word, memory_link
from .ttmpt import PacketChain


class Session:
    def __init__(self, turns, coupler=None):
        """turns: [(source, [tokens])]. coupler: None, 'carry' (the law) or 'same' (the control)."""
        self.chain = PacketChain()
        for source, tokens in turns:
            self.chain.log_token_list(tokens, source)
        P = self.chain.packets
        self.values = [p['seed64'] for p in P]
        self.quats = packet_quaternions(self.values)
        self.sched = schedule(len(P))
        self.gauges = [O.gauge_exact(*(Fraction(x) for x in p['tri'])) for p in P]
        self.coupler = None if coupler is None else Coupler('mirror' if coupler == 'carry' else 'same')
        self.words, self.links, self.b_checks = [], [], []
        events = sorted([('latch', s['off'], s['token']) for s in self.sched] +
                        [('zero', z['F'], z) for z in zero_points(self.sched)],
                        key=lambda e: (e[1], 0 if e[0] == 'latch' else 1))
        prev = ''
        for kind, F, x in events:
            if kind == 'latch':
                if self.coupler:
                    self.coupler.twist(self.quats[x], 0 if P[x]['source'] == 'human' else 1)
                continue
            a, b, c = (self.values[t] for t in x['tokens'])
            w = Word(a, b, c, addr=len(self.words) % 30, F=F)
            prev = memory_link(F, w.addr, w.root(), prev)
            self.words.append({'F': F, 'addr': w.addr, 'tokens': x['tokens'], 'cells': list(w.cells), 'root': w.root(),
                               'tiles': [w.tiles(j) for j in range(4)], 'link': prev})
            if self.coupler:
                self.b_checks.append(self.coupler.check(F))
        self.registers = registers(self.sched, self.quats)

    def outputs(self):
        """Everything but the coupler's own state."""
        return {'packets': [(p['header'], p['seed64'], p['footer']) for p in self.chain.packets],
                'words': [(w['F'], w['addr'], tuple(w['cells']), w['root'], w['link']) for w in self.words],
                'gauges': [(str(g['s']), str(g['X']), str(g['Yc'])) for g in self.gauges],
                'registers': [(R['r'], R['packet_q'], tuple(R['block_q']), tuple(R['group_q'])) for R in self.registers]}
