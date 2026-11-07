"""Where the sibling checkouts, the download cache and Chromium are, in one place (Python; siblings.cjs is the same
for Node).

    dir('Owl-Academy')    OWL_ACADEMY_DIR, else ../Owl-Academy beside this repository's root
    dir('BioChain-AI')    BIOCHAIN_AI_DIR, else ../BioChain-AI
    dir('SHD-CCP')        SHD_CCP_DIR, else ../SHD-CCP
    present(name)         whether that checkout is there (its marker file exists)
    cache()               HL_CACHE, else ~/.cache/hyperbolic-lexicon
    chromium()            PLAYWRIGHT_CHROMIUM, else /opt/pw-browsers/chromium when it exists, else None

Loaded by path (it is not a package), so it works under python3 -B -I:

    spec = importlib.util.spec_from_file_location('siblings', '<repository>/scripts/lib/siblings.py')

A missing checkout is reported by the caller as skipped (exit 2), never as passed.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VARS = {'Owl-Academy': 'OWL_ACADEMY_DIR', 'BioChain-AI': 'BIOCHAIN_AI_DIR', 'SHD-CCP': 'SHD_CCP_DIR'}
MARKERS = {'Owl-Academy': 'scripts/biomesh.js', 'BioChain-AI': 'src/biomesh/biomesh.js', 'SHD-CCP': 'SHD-CCP_Kernel_Ontology'}


def dir(name):  # noqa: A001 (the same name as siblings.cjs)
    if name not in VARS:
        raise KeyError(f'unknown sibling {name}')
    return os.path.abspath(os.environ.get(VARS[name]) or os.path.join(ROOT, '..', name))


def present(name):
    return os.path.exists(os.path.join(dir(name), MARKERS[name]))


def cache():
    return os.path.abspath(os.environ.get('HL_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'hyperbolic-lexicon'))


def chromium():
    return os.environ.get('PLAYWRIGHT_CHROMIUM') or ('/opt/pw-browsers/chromium' if os.path.exists('/opt/pw-browsers/chromium') else None)


if __name__ == '__main__':
    for n in VARS:
        print(f"{n:<12} {'present' if present(n) else 'missing'}  {dir(n)}  ({VARS[n]})")
    print(f"{'cache':<12} {'present' if os.path.exists(cache()) else 'missing'}  {cache()}  (HL_CACHE)")
