"""The window as a triple-quad memory word over GF(2) (claim E3).

A word holds four 64-bit cells: alpha, beta, gamma and their parity Y = alpha ^ beta ^ gamma. It mirrors Tri-Engine
Convergence's memory word (orbital_core.js segments memory, rebuild, locate), with XOR in place of the rational
sum: any one cell is the XOR of the other three, and a Merkle chain over the four leaves (Lemma 15) locates an
altered cell as the deepest layer that differs.

Tiles (decision D3): each cell travels as two Einstein tiles of Form 5, "an engram/1 half". Tile h = 0 holds the
high 32 bits (cells 32-63), tile h = 1 the low 32 bits; the slot field is 4h + structure, structure alpha = 0,
beta = 1, gamma = 2, Y = 3. The other header fields follow cellTile in the Convergence page [DEFINITION]: the step
and node of the frame the word is written at, the gate = address mod 64, the mux index from step, node and slot.

A leaf is the two tile words followed by the cell's 16 hex digits [DEFINITION], as the Convergence page's leaf is
the tile word followed by the exact value it stands for.
"""
import hashlib

from . import orbital as O

FORM = 5                        # an engram/1 half (D3); 0-4, 6 and 12 are taken elsewhere
STRUCT = ('alpha', 'beta', 'gamma', 'Y')


def zero_point_context(F):
    """The step and node of frame F on the zero-point clock: step k = F mod 8 (0 read as 8), node = F mod 30."""
    return {'step': (F % 8) or 8, 'node': F % 30}


class Word:
    """A triple-quad memory word: cells[0..3] = alpha, beta, gamma, Y (ints of 64 bits)."""

    def __init__(self, alpha, beta, gamma, addr=0, F=24):
        self.cells = [alpha, beta, gamma, alpha ^ beta ^ gamma]
        self.addr, self.F = addr, F
        ctx = zero_point_context(F)
        self.step, self.node = ctx['step'], ctx['node']
        self.tau0 = self.chain()                 # the chain as written

    # tiles and leaves
    def tiles(self, j, v=None):
        v = self.cells[j] if v is None else v
        out = []
        for h, half in enumerate((v >> 32, v & 0xFFFFFFFF)):
            slot = 4 * h + j
            out.append(O.pack_tile({'step': self.step, 'wheel': O.wheel_sector(self.node), 'struct': j,
                                    'gate': self.addr % 64, 'mux': O.mux_index(self.step, self.node, slot),
                                    'form': FORM, 'slot': slot, 'scale': 0, 'core': half}))
        return out

    def leaf(self, j):
        t0, t1 = self.tiles(j)
        return O.word_bytes(t0) + O.word_bytes(t1) + O.utf8(format(self.cells[j], '016X'))

    def chain(self):
        tau = O.merkle_chain([self.leaf(j) for j in range(4)])
        return [O.to_hex(t) if t is not None else '' for t in tau]

    def root(self):
        return self.chain()[1]

    # parity, locate, rebuild, repair
    def parity_ok(self):
        c = self.cells
        return c[0] ^ c[1] ^ c[2] ^ c[3] == 0

    def locate(self):
        """Lemma 15: the deepest layer of the chain that differs from the recorded one is the altered leaf."""
        now = self.chain()
        deepest = 0
        for d in range(1, 5):
            if now[d] != self.tau0[d]:
                deepest = d
        return deepest - 1 if deepest else None

    def rebuild(self, j):
        """Cell j from the other three."""
        c = self.cells
        x = 0
        for i in range(4):
            if i != j:
                x ^= c[i]
        return x

    def repair(self):
        """Locate, rebuild, and keep the rebuilt cell only if the root matches the recorded root again.
        Returns ('intact' | 'repaired' | 'refused', cell index or None)."""
        if self.parity_ok() and self.chain()[1] == self.tau0[1]:
            return 'intact', None
        j = self.locate()
        if j is None:
            return 'refused', None
        before = self.cells[j]
        self.cells[j] = self.rebuild(j)
        if self.chain()[1] == self.tau0[1]:
            return 'repaired', j
        self.cells[j] = before               # two unknowns, one equation: put it back and refuse
        return 'refused', j


def memory_link(F, addr, root, prev):
    """The SHA-256 memory word chained at a zero point [DEFINITION]: frame, address, the word's Merkle root and
    the previous link; 16 hex digits, as Hyperbolic PolyStep's memory words."""
    body = f'ENGRAM-MEM/1|{F}|{addr}|{root}|{prev}'
    return hashlib.sha256(body.encode()).hexdigest()[:16]
