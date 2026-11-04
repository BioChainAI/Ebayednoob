import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import engram  # noqa: E402,F401  (puts Hyperbolic PolyStep's reference on the path, so tests can import hpstep)
