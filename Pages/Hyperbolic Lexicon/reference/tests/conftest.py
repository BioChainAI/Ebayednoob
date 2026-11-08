import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import lexicon  # noqa: E402,F401  (puts hpstep and engram on the path)
from lexicon import wordnet  # noqa: E402


@pytest.fixture(scope='session')
def wn():
    if not wordnet.available():
        pytest.skip('no WordNet archive in the cache: run golden/make_wordnet_v1.cjs')
    return wordnet.load()
