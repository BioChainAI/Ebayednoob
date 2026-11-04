# Reads the segments of orbital_core.js and writes them back into the build templates.
#
#   segments()     {name: text} for every `// @orbital-begin name` ... `// @orbital-end name` block
#   expand(text)   replaces each /*__ORB:name__*/ placeholder with its segment
#   core()         the exact core, for /*__CORE__*/ (it was core.js, which ended with a newline)
#
# build.py and gen4.py expand every template before they read or patch it, so they see exactly the text the
# templates held before the code moved into orbital_core.js.
import os
import re

D = os.path.dirname(os.path.abspath(__file__)) + '/'
_BLOCK = re.compile(r'^// @orbital-begin (\w+)[^\n]*\n(.*?)\n// @orbital-end \1$', re.S | re.M)
_PLACE = re.compile(r'/\*__ORB:(\w+)__\*/')


def segments():
    src = open(D + 'orbital_core.js', encoding='utf-8').read()
    out = {}
    for m in _BLOCK.finditer(src):
        assert m.group(1) not in out, 'segment defined twice: ' + m.group(1)
        out[m.group(1)] = m.group(2)
    return out


def expand(text, segs=None):
    segs = segs or segments()

    def put(m):
        if m.group(1) not in segs:
            raise KeyError('no segment named ' + m.group(1) + ' in orbital_core.js')
        return segs[m.group(1)]
    return _PLACE.sub(put, text)


def core(segs=None):
    return (segs or segments())['core'] + '\n'
