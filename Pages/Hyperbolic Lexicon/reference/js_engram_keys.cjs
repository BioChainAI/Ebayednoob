// L2's Node half: the engram/1 key of every type, from Engram Mind's Eye's ttmpt_core_v1.js, unchanged.
//
//   node js_engram_keys.cjs < types.txt > keys.txt
//
// Input: one type per line (UTF-8, LF; a type never contains LF). Output: `type TAB key` per line, in input order,
// where key is crystallize(type)'s 64 cells packed as engram.ttmpt.hex_lsb does (byte i = cells 8i..8i+7, cell 8i+b
// at bit b, lowercase hex) — the packing PREREGISTRATION.md Amendment 1 item 8 names. The core is loaded by
// relative path and never modified; only the packing, a formatting step, lives here.
'use strict';
const path = require('path');
const T = require(path.join(__dirname, '../../Engram Minds Eye/ttmpt_core_v1.js'));

function hexLsb(grid) {
    let out = '';
    for (let i = 0; i < 8; i++) {
        let byte = 0;
        for (let b = 0; b < 8; b++) byte |= grid[i * 8 + b] << b;
        out += byte.toString(16).padStart(2, '0');
    }
    return out;
}

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
    const text = Buffer.concat(chunks).toString('utf8');
    const types = text.length ? text.replace(/\n$/, '').split('\n') : [];
    const out = types.map(t => `${t}\t${hexLsb(T.crystallize(t))}`);
    process.stdout.write(out.length ? out.join('\n') + '\n' : '');
});
