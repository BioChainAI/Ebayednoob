"""engram/1 against the golden corpus (the mechanics of claim E1) and its control."""
from engram import dialogue as Dg
from engram import ttmpt as T

G = Dg.golden()


def entry_fields(text, mult=31):
    g = T.crystallize(text, mult)
    return {'hex_lsb': T.hex_lsb(g), 'seed64': T.hex64(T.pack_grid64(g)), 'chiral_key': T.chiral_key(text) if mult == 31 else None,
            'j_num': T.j_num(g), 'j': T.compute_j(g), 'bits': sum(g)}


def test_mulberry32_first_draws():
    # first outputs as the page's JavaScript gives them (node), including a negative int32 seed
    expect = {1: [0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741],
              65: [0.10763607081025839, 0.3820509684737772, 0.6012095084879547, 0.7297299590427428],
              90: [0.04127897717989981, 0.21263434900902212, 0.278760728193447, 0.35782540193758905],
              -559038737: [0.9413696140982211, 0.26719574979506433, 0.772033357527107, 0.35816076025366783]}
    for seed, want in expect.items():
        r = T.mulberry32(seed)
        assert [r() for _ in range(4)] == want


def test_every_golden_entry():
    for name, entries in G['sets'].items():
        for e in entries:
            f = entry_fields(e['input'])
            for k in ('hex_lsb', 'seed64', 'chiral_key', 'j_num', 'j', 'bits'):
                assert f[k] == e[k], (name, e['input'], k)


def test_tokenizers_and_stream():
    for t in G['tokenizers']:
        assert T.tokenize(t['text']) == t['mind_eye']
        assert T.tokenize_biomesh(t['text']) == t['biomesh']
    s = G['biomesh_stream']
    assert T.engram_stream(s['text']) == {'stream': s['stream'], 'count': s['count'], 'meanJ': s['meanJ']}


def test_packet_chain():
    pc = G['packet_chain']
    chain = T.PacketChain()
    assert T.hex32(chain.parity) == pc['codex_root']
    for turn in pc['turns']:
        chain.log_tokens(turn['text'], turn['source'])
    assert len(chain.packets) == len(pc['packets'])
    for mine, g in zip(chain.packets, pc['packets']):
        assert (mine['index'], mine['token'], mine['source']) == (g['index'], g['token'], g['source'])
        assert (mine['header'], T.hex64(mine['seed64']), mine['footer']) == (g['header'], g['seed64'], g['footer'])
        assert mine['tri'] == (g['tri']['alpha'], g['tri']['beta'], g['tri']['gamma'])
        assert T.CONCEPT_NAMES[mine['concept']] == g['tri']['concept']
    assert T.hex32(chain.parity) == pc['final_parity']


def test_registered_control_was_void():
    # the multiplier only multiplies the zero seed of a single letter, so it cannot change any grid (Amendment 1)
    diff = sum(1 for es in G['sets'].values() for e in es if entry_fields(e['input'], 37)['hex_lsb'] != e['hex_lsb'])
    assert diff == 0


def test_amended_control_mulberry_increment_differs():
    diff = sum(1 for es in G['sets'].values() for e in es if T.hex_lsb(T.crystallize(e['input'], inc=0x6D2B79F7)) != e['hex_lsb'])
    assert diff > 0


def test_js_to_fixed_rounds_ties_up():
    assert T.js_to_fixed(0.03125, 4) == '0.0313'          # Python's format would give 0.0312
    assert T.js_to_fixed(-0.03125, 4) == '-0.0313'
    assert T.js_to_fixed(0.0, 4) == '0.0000'
