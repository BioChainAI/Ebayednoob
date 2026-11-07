// Which members of the shared cores a script uses: alias.name and alias.name.name, with comments and the contents of
// string and template literals removed first (their ${...} parts are kept). Used by scripts/check-cores.mjs and
// Pages/Engram Minds Eye/tests/core-names.cjs.
//
//   codeOnly(src)                     the code without comments and string contents
//   windowAliases(src, globals)       { alias: global } for `alias = window.Global` bindings of the given globals
//   usedNames(src, aliases)           [{ alias, path: [name] or [name, name] }], destructured names included
//   normalise(core, path)             [name, name] only when the first is a namespace object of the core
//   lookup(obj, path)                 the member, or undefined
'use strict';

function codeOnly(src) {
    let out = '', i = 0;
    const tpl = [];                                   // open template literals: brace depth inside each ${ }
    while (i < src.length) {
        const c = src[i], d = src[i + 1];
        if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
        if (c === '/' && d === '*') { i = src.indexOf('*/', i + 2); i = i < 0 ? src.length : i + 2; continue; }
        if (c === '"' || c === "'") { const q = c; i++; while (i < src.length && src[i] !== q && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1; i++; out += '""'; continue; }
        if (c === '`' || (c === '}' && tpl.length && tpl[tpl.length - 1] === 0)) {
            if (c === '}') tpl.pop();
            i++;
            while (i < src.length && src[i] !== '`' && !(src[i] === '$' && src[i + 1] === '{')) i += src[i] === '\\' ? 2 : 1;
            if (src[i] === '$') { tpl.push(0); i += 2; out += '`${'; } else { i++; out += '``'; }
            continue;
        }
        if (tpl.length && c === '{') tpl[tpl.length - 1]++;
        if (tpl.length && c === '}' && tpl[tpl.length - 1] > 0) tpl[tpl.length - 1]--;
        out += c; i++;
    }
    return out;
}
function windowAliases(src, globals) {
    const out = {};
    for (const m of codeOnly(src).matchAll(/\b([A-Za-z_$][\w$]*)\s*=\s*window\.([A-Za-z_$][\w$]*)/g)) if (globals.includes(m[2])) out[m[1]] = m[2];
    return out;
}
function usedNames(src, aliases) {
    const code = codeOnly(src), used = [];
    for (const alias of Object.keys(aliases)) {
        const a = alias.replace(/\$/g, '\\$');
        const re = new RegExp(`(?<![\\w$.])${a}\\.([A-Za-z_$][\\w$]*)(?:\\.([A-Za-z_$][\\w$]*))?`, 'g');
        for (const m of code.matchAll(re)) used.push({ alias, path: m[2] ? [m[1], m[2]] : [m[1]] });
        // destructuring: const { a, b: c } = alias;
        const de = new RegExp(`(?:const|let|var)\\s*\\{([^{}]*)\\}\\s*=\\s*${a}(?![\\w$.(\\[])`, 'g');
        for (const m of code.matchAll(de)) for (const part of m[1].split(',')) {
            const name = part.split(':')[0].split('=')[0].trim();
            if (/^[A-Za-z_$][\w$]*$/.test(name)) used.push({ alias, path: [name] });
        }
    }
    return used;
}
// a two-part name is kept only when its first part is a namespace object of the core (C.P.children, C.H.boost);
// a value's own member (C.ON.join, D3.OCTA.map, O.Fraction.ONE) counts as its first part
function normalise(core, p) {
    if (p.length < 2) return p;
    const v = core == null ? undefined : core[p[0]];
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? p : [p[0]];
}
function lookup(obj, p) {
    let v = obj;
    for (const k of p) { v = v == null ? undefined : v[k]; if (v === undefined) return undefined; }
    return v;
}
module.exports = { codeOnly, windowAliases, usedNames, normalise, lookup };
