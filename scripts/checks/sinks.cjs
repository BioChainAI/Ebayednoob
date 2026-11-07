#!/usr/bin/env node
// HTML built from data must escape it. Scans assets/, control-panel/ and Pages/Research/ (scripts and inline
// <script> blocks) for
//   - template literals that build HTML (their text contains a tag, or they sit inside such a template) and insert
//     a value with ${...} that is not escaped with esc(...) and is not otherwise known to be safe: a literal, a
//     number or count, a boolean, a nested template (checked in turn), a constant of this file or of a sibling
//     module, a loop index, a local helper whose templates are checked here, or a reviewed entry in
//     scripts/checks/sinks-trusted.json;
//   - a value that starts a URL attribute (href=, src=, action=, formaction=, poster=) and does not come from
//     safeUrl(...) or resolveLink(...) (alone or inside esc()) or a literal: esc() leaves the URL scheme as it is;
//   - innerHTML / outerHTML / srcdoc (also written el["innerHTML"]), insertAdjacentHTML, createContextualFragment,
//     parseFromString, setHTMLUnsafe and document.write given anything else that is not safe in the same sense,
//     including a template literal without tags given to them directly.
//   node scripts/checks/sinks.cjs           exit 1 on any finding
//   node scripts/checks/sinks.cjs --list    also print every reviewed entry with its reason
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DIRS = ['assets/', 'control-panel/', 'Pages/Research/'];

// Expressions that are inserted into HTML without esc() on purpose: file -> { expression text: reason }.
// The expression text is matched exactly (whitespace collapsed), so a changed expression must be reviewed again.
const TRUSTED = require('./sinks-trusted.json');

function listFiles() {
    const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...DIRS], { cwd: ROOT });
    return out.toString('utf8').split('\0').filter((f) => /\.(m?js|cjs|html?)$/i.test(f) && fs.existsSync(path.join(ROOT, f)));
}

// ---------- a small JS scanner: comments, strings, regex literals, templates ----------

const REGEX_BEFORE = /[(,=:[!&|?{};+\-*%<>~^]$/;
const REGEX_WORDS = /\b(?:return|typeof|case|in|of|new|delete|void|throw|else|do|yield|await)$/;

// Calls onTemplate(start, end) for each top-level template literal in src[from, to); returns nothing.
function scan(src, from, to, onTemplate) {
    let i = from;
    let lastSig = '';
    while (i < to) {
        const c = src[i];
        const n = src[i + 1];
        if (c === '/' && n === '/') { while (i < to && src[i] !== '\n') i++; continue; }
        if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? to : e + 2; continue; }
        if (c === '"' || c === "'") { i = skipString(src, i); lastSig = 'x'; continue; }
        if (c === '`') { const e = skipTemplate(src, i); onTemplate(i, e); i = e; lastSig = 'x'; continue; }
        if (c === '/') {
            const before = src.slice(Math.max(from, i - 12), i).trimEnd();
            if (!before || REGEX_BEFORE.test(before) || REGEX_WORDS.test(before)) { i = skipRegex(src, i); lastSig = 'x'; continue; }
        }
        if (!/\s/.test(c)) lastSig = c;
        i++;
    }
    return lastSig;
}

function skipString(src, i) {
    const q = src[i++];
    while (i < src.length && src[i] !== q && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
    return i + 1;
}

function skipRegex(src, i) {
    i++;
    let cls = false;
    while (i < src.length && src[i] !== '\n') {
        const c = src[i];
        if (c === '\\') { i += 2; continue; }
        if (c === '[') cls = true; else if (c === ']') cls = false; else if (c === '/' && !cls) break;
        i++;
    }
    i++;
    while (/[a-z]/i.test(src[i] || '')) i++;
    return i;
}

// End index (exclusive) of the expression inside ${ ... } that starts at i.
function skipExpr(src, i) {
    let depth = 0;
    while (i < src.length) {
        const c = src[i];
        const n = src[i + 1];
        if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
        if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
        if (c === '"' || c === "'") { i = skipString(src, i); continue; }
        if (c === '`') { i = skipTemplate(src, i); continue; }
        if (c === '/') {
            const before = src.slice(Math.max(0, i - 12), i).trimEnd();
            if (REGEX_BEFORE.test(before) || REGEX_WORDS.test(before)) { i = skipRegex(src, i); continue; }
        }
        if (c === '{' || c === '(' || c === '[') depth++;
        else if (c === '}' || c === ')' || c === ']') { if (depth === 0) return i; depth--; }
        i++;
    }
    return i;
}

function skipTemplate(src, i) {
    i++;
    while (i < src.length) {
        const c = src[i];
        if (c === '\\') { i += 2; continue; }
        if (c === '`') return i + 1;
        if (c === '$' && src[i + 1] === '{') { i = skipExpr(src, i + 2) + 1; continue; }
        i++;
    }
    return i;
}

// The parts of the template literal src[start, end): static text and ${} expressions with their offsets.
function parts(src, start, end) {
    const text = [];
    const exprs = [];
    let i = start + 1;
    let chunk = '';
    while (i < end - 1) {
        const c = src[i];
        if (c === '\\') { chunk += src.slice(i, i + 2); i += 2; continue; }
        if (c === '$' && src[i + 1] === '{') {
            text.push(chunk);
            chunk = '';
            const e = skipExpr(src, i + 2);
            exprs.push({ start: i + 2, end: e });
            i = e + 1;
            continue;
        }
        chunk += c;
        i++;
    }
    text.push(chunk);
    return { text, exprs };
}

// ---------- what counts as safe ----------

// Top-level `cond ? a : b` of an expression, honouring nesting, `?.` and `??`.
function ternary(expr) {
    let depth = 0;
    let q = -1;
    let nest = 0;
    for (let i = 0; i < expr.length; i++) {
        const c = expr[i];
        if (c === '"' || c === "'") { i = skipString(expr, i) - 1; continue; }
        if (c === '`') { i = skipTemplate(expr, i) - 1; continue; }
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') depth--;
        else if (depth === 0 && c === '?') {
            if (expr[i + 1] === '.' && !/\d/.test(expr[i + 2] || '')) continue;
            if (expr[i + 1] === '?') { i++; continue; }
            if (q < 0) q = i; else nest++;
        } else if (depth === 0 && c === ':' && q >= 0) {
            if (nest) { nest--; continue; }
            return { a: expr.slice(q + 1, i), b: expr.slice(i + 1) };
        }
    }
    return null;
}

// Split at top-level binary operators; returns the operand texts, or null when there is no such operator.
function splitTop(expr, ops) {
    const segs = [];
    let depth = 0;
    let last = 0;
    for (let i = 0; i < expr.length; i++) {
        const c = expr[i];
        if (c === '"' || c === "'") { i = skipString(expr, i) - 1; continue; }
        if (c === '`') { i = skipTemplate(expr, i) - 1; continue; }
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') depth--;
        else if (depth === 0) {
            const op = ops.find((o) => expr.startsWith(o, i) && !(o.length === 1 && /[=>!<]/.test(expr[i + 1] || '')) && !(o === '=' && /[=!<>]/.test(expr[i - 1] || '')));
            if (op) { segs.push(expr.slice(last, i)); last = i + op.length; i += op.length - 1; }
        }
    }
    segs.push(expr.slice(last));
    return segs.length > 1 ? segs : null;
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const IDENT = '[A-Za-z_$][\\w$]*';

function closeParen(e, open) {
    let depth = 0;
    for (let i = open; i < e.length; i++) {
        const c = e[i];
        if (c === '"' || c === "'") { i = skipString(e, i) - 1; continue; }
        if (c === '`') { i = skipTemplate(e, i) - 1; continue; }
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) return i; }
    }
    return -1;
}
const wrapped = (e) => e[0] === '(' && closeParen(e, 0) === e.length - 1;
// `name(...)` as the whole expression -> the argument text, else null.
function callOf(e) {
    const m = new RegExp(`^(${IDENT}(?:\\.${IDENT})*)\\s*\\(`).exec(e);
    if (!m) return null;
    const close = closeParen(e, m[0].length - 1);
    return close === e.length - 1 ? { name: m[1], args: e.slice(m[0].length, close) } : null;
}

// Per-file facts: functions that build HTML from checked templates, and plain constants.
function fileFacts(src, file) {
    const builders = new Set();
    const consts = new Set();
    const arrows = new Map(); // name -> expression body of a local arrow function
    const defs = [];
    // ALL_CAPS constants imported from a sibling module that exports them as literals.
    for (const im of src.matchAll(/\bimport\s*\{([^}]*)\}\s*from\s*["'](\.{1,2}\/[^"']+)["']/g)) {
        let dep = '';
        try { dep = fs.readFileSync(path.resolve(ROOT, path.dirname(file), im[2]), 'utf8'); } catch { continue; }
        for (const n of im[1].split(',').map((x) => x.trim().split(/\s+as\s+/).pop()).filter((x) => /^[A-Z][A-Z0-9_]*$/.test(x))) {
            if (new RegExp(`\\bexport\\s+const\\s+${n}\\s*=\\s*(?:[\\[{"'\\d]|new\\s+URL\\()`).test(dep)) consts.add(n);
        }
    }
    const re = new RegExp(`\\bfunction\\s+(${IDENT})\\s*\\(|\\b(?:const|let|var)\\s+(${IDENT})\\s*=\\s*`, 'g');
    let m;
    while ((m = re.exec(src))) {
        const name = m[1] || m[2];
        const at = m.index + m[0].length;
        let body;
        if (m[1]) {
            const open = src.indexOf('{', closeParen(src, at - 1));
            body = src.slice(open, skipExpr(src, open + 1) + 1);
        } else {
            const end = (() => { let d = 0; for (let i = at; i < src.length; i++) { const c = src[i]; if (c === '"' || c === "'") { i = skipString(src, i) - 1; continue; } if (c === '`') { i = skipTemplate(src, i) - 1; continue; } if (c === '(' || c === '[' || c === '{') d++; else if (c === ')' || c === ']' || c === '}') { if (d === 0) return i; d--; } else if (c === ';' && d === 0) return i; } return src.length; })();
            body = src.slice(at, end);
        }
        defs.push({ name, at: m.index, rhs: m[2] ? body : null });
        const isFn = !!m[1] || /^(async\s+)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(body);
        if (isFn && /`[^`]*<\/?[a-zA-Z]/.test(body)) builders.add(name);
        const ex = /^(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*([\s\S]*)$/.exec(body.trim());
        if (m[2] && ex) arrows.set(name, ex[1].trim().startsWith('{') ? { block: ex[1].trim() } : { expr: ex[1] });
        else if (m[1]) arrows.set(name, { block: body.trim() });
        if (!isFn && m[2] && /^[A-Z][A-Z0-9_]*$/.test(name) && /^(\{|\[|"|'|-?\d|`[^$`]*`)/.test(body.trim())) consts.add(name);
    }
    return { builders, consts, arrows, defs };
}

// The expressions returned by a block body `{ ... return X; ... }` (not looking into nested functions).
function returns(block) {
    const out = [];
    for (let i = 1; i < block.length - 1; i++) {
        const c = block[i];
        if (c === '"' || c === "'") { i = skipString(block, i) - 1; continue; }
        if (c === '`') { i = skipTemplate(block, i) - 1; continue; }
        if (block.startsWith('=>', i)) { // nested function: skip its body
            let j = i + 2;
            while (/\s/.test(block[j])) j++;
            if (block[j] === '{') { i = closeParen(block, j); continue; }
        }
        if (/\breturn\b/y.test(block.slice(i, i + 7)) && !/[\w$]/.test(block[i - 1])) {
            const start = i + 6;
            let d = 0;
            let j = start;
            for (; j < block.length; j++) {
                const ch = block[j];
                if (ch === '"' || ch === "'") { j = skipString(block, j) - 1; continue; }
                if (ch === '`') { j = skipTemplate(block, j) - 1; continue; }
                if (ch === '(' || ch === '[' || ch === '{') d++;
                else if (ch === ')' || ch === ']' || ch === '}') { if (d === 0) break; d--; }
                else if (ch === ';' && d === 0) break;
            }
            out.push(block.slice(start, j));
            i = j;
        }
    }
    return out;
}

// Problems with inserting `expr` (found at offset `at` of the file) into HTML: [] when it is safe.
// o.sink: the expression is given straight to a sink (not written inside an HTML template), so a template literal in
// it is not checked by the template pass unless it contains a tag. o.remote: the expression was reached through a
// definition (a variable or a helper's return value), so its templates are not inside the one being checked.
function problems(exprRaw, ctx, at, depth = 0, o = {}) {
    const e = exprRaw.trim();
    if (!e || depth > 6) return [];
    if (ctx.trusted[norm(e)] !== undefined) return [];
    for (const [k, v] of Object.entries(ctx.trustedRe)) if (new RegExp(k.slice(1, -1)).test(norm(e))) { void v; ctx.useRe(k); return []; }
    const same = (x) => problems(x, ctx, at, depth + 1, o);
    if (wrapped(e)) return same(e.slice(1, -1));
    if (/^(['"])(?:(?!\1)[^\\]|\\.)*\1$/s.test(e)) return []; // string literal
    if (/^-?\d+(\.\d+)?$/.test(e) || /^(true|false|null|undefined)$/.test(e)) return [];
    if (e[0] === '`' && skipTemplate(e, 0) === e.length) {
        // A template with a tag is checked as HTML by the template pass, and so is one written inside an HTML
        // template. Any other template (given straight to a sink, or reached through a definition) is checked here.
        const { text, exprs } = parts(e, 0, e.length);
        if (/<\/?[a-zA-Z!]/.test(text.join('')) || (!o.sink && !o.remote)) return [];
        return exprs.flatMap((x) => problems(e.slice(x.start, x.end), ctx, at, depth + 1, o));
    }
    const t = ternary(e);
    if (t) return [...same(t.a), ...same(t.b)];
    const or = splitTop(e, ['||', '??']);
    if (or) return or.flatMap(same);
    const and = splitTop(e, ['&&']);
    if (and) return same(and[and.length - 1]); // a falsy left side prints "", 0, false...
    if (splitTop(e, ['===', '!==', '==', '!=', '<=', '>=', '<', '>']) || /^!/.test(e) || /^typeof\b/.test(e)) return []; // boolean
    if (/\.(has|includes|startsWith|endsWith|some|every|test)\([^]*\)$/.test(e) && callOf(e.replace(/^[\s\S]*\.(?=(has|includes|startsWith|endsWith|some|every|test)\()/, ''))) return []; // boolean
    const plus = splitTop(e, ['+']);
    if (plus) return plus.flatMap(same);
    if (splitTop(e, ['-', '*', '/', '%'])) return []; // arithmetic gives a number
    if (/\.length$/.test(e) || /\.size$/.test(e)) return []; // a count
    if (/^(Math\.\w+|Number|parseInt|parseFloat|String\(\s*\d)/.test(e) || /\.toFixed\(\d*\)$/.test(e)) return [];
    const call = callOf(e);
    if (call) {
        if (call.name === 'esc' || call.name === 'encodeURIComponent') return [];
        if (ctx.builders.has(call.name)) return []; // returns a checked template; template arguments are checked as HTML
        const fn = ctx.arrows.get(call.name); // a local helper that returns something safe, e.g. a count or esc(...)
        const far = { ...o, remote: true };
        if (fn && fn.expr !== undefined && !problems(fn.expr, ctx, at, depth + 1, far).length) return [];
        if (fn && fn.block !== undefined) { const rs = returns(fn.block); if (rs.length && rs.every((r) => !problems(r, ctx, at, depth + 1, far).length)) return []; }
    }
    // `list.map(cb).join("...")`: safe when the callback is a builder or returns something safe.
    const mj = /^([\s\S]+?)\.map\(([\s\S]*)\)\s*\.join\(\s*(['"`])[^'"`]*\3\s*\)$/.exec(e);
    if (mj) {
        const cb = mj[2].trim();
        if (ctx.builders.has(cb)) return [];
        const arrow = /^(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*([\s\S]*)$/.exec(cb);
        if (arrow && !arrow[1].trim().startsWith('{')) return same(arrow[1]);
        if (arrow) return returns(arrow[1].trim()).flatMap(same); // block body: every return
    }
    // `[a, b, c].join("")`: each element.
    const aj = /^\[([\s\S]*)\]\s*\.join\(\s*(['"`])[^'"`]*\2\s*\)$/.exec(e);
    if (aj) return splitTop(aj[1], [',']) ? splitTop(aj[1], [',']).flatMap((x) => same(x.replace(/^\.\.\./, ''))) : same(aj[1]);
    // A plain name: a constant, a loop index, or a local defined from something safe.
    const name = new RegExp(`^(${IDENT})((?:\\??\\.${IDENT}|\\[[^\\]]*\\])*)$`).exec(e);
    if (name) {
        if (ctx.consts.has(name[1])) return [];
        const near = ctx.src.slice(Math.max(0, at - 4000), at);
        // An element (or key/value) of a constant list or object: `LIST.map((x) => ...)`, `Object.entries(OBJ).map(([k, v]) => ...)`.
        for (const c of near.matchAll(new RegExp(`\\b(?:([A-Z][A-Z0-9_]*)|Object\\.(?:entries|keys|values)\\(\\s*([A-Z][A-Z0-9_]*)\\s*\\))\\.(?:map|forEach|filter|flatMap)\\(\\s*\\(?\\s*\\[?\\s*([\\w$\\s,]*?)\\s*\\]?\\s*\\)?\\s*=>`, 'g'))) {
            if (ctx.consts.has(c[1] || c[2]) && c[3].split(',').map((x) => x.trim()).includes(name[1])) return [];
        }
        if (!name[2]) {
            const before = near;
            if (new RegExp(`\\(\\s*${IDENT}\\s*,\\s*${name[1]}\\s*\\)\\s*=>`).test(before) || new RegExp(`\\bfor\\s*\\(\\s*let\\s+${name[1]}\\s*=\\s*\\d`).test(before)) return []; // index
            const def = ctx.defs.filter((d) => d.name === name[1] && d.rhs !== null && d.at < at).pop();
            if (def) {
                const rhs = def.rhs.trim();
                if (rhs[0] === '`' && skipTemplate(rhs, 0) === rhs.length) {
                    // A template kept in a variable: if it has no tags it was not checked as HTML, so check it here.
                    if (/<\/?[a-zA-Z]/.test(rhs)) return [];
                    const { exprs } = parts(rhs, 0, rhs.length);
                    return exprs.flatMap((x) => problems(rhs.slice(x.start, x.end), ctx, def.at, depth + 1, { ...o, remote: true }));
                }
                return problems(rhs, ctx, def.at, depth + 1, { ...o, remote: true }).length ? [norm(e)] : [];
            }
        }
    }
    return [norm(e)];
}

// A value that starts a URL attribute: it must come from safeUrl()/resolveLink() (which allow only http(s) and
// site links), alone or inside esc(), or be a literal, a constant or a site path that is not a javascript:, data: or
// vbscript: URL. src= and poster= on images and media are left out: browsers do not run script from those.
const URL_START = /<([a-zA-Z][\w-]*)\b[^<>]*?\s(href|src|action|formaction|poster|xlink:href)\s*=\s*["']?$/;
const MEDIA = /^(img|source|video|audio|track|picture|input)$/i;
function urlStart(before) {
    const m = URL_START.exec(before);
    if (!m) return false;
    return !(/^(src|poster)$/i.test(m[2]) && MEDIA.test(m[1]));
}
const MEMBER = new RegExp(`^(${IDENT})((?:\\??\\.${IDENT}|\\[[^\\]]*\\])*)$`);
// An element (or key/value) of a constant list or object: `LIST.map((x) => ...)`, `Object.entries(OBJ).map(([k, v]) => ...)`.
function fromConstList(name, ctx, at) {
    const near = ctx.src.slice(Math.max(0, at - 4000), at);
    for (const c of near.matchAll(new RegExp(`\\b(?:([A-Z][A-Z0-9_]*)|Object\\.(?:entries|keys|values)\\(\\s*([A-Z][A-Z0-9_]*)\\s*\\))\\.(?:map|forEach|filter|flatMap)\\(\\s*\\(?\\s*\\[?\\s*([\\w$\\s,]*?)\\s*\\]?\\s*\\)?\\s*=>`, 'g'))) {
        if (ctx.consts.has(c[1] || c[2]) && c[3].split(',').map((x) => x.trim()).includes(name)) return true;
    }
    return false;
}
function urlProblems(exprRaw, ctx, at, depth = 0) {
    const e = exprRaw.trim();
    if (!e || depth > 6) return [];
    if (ctx.trusted[`url:${norm(e)}`] !== undefined) return [];
    const same = (x, where = at) => urlProblems(x, ctx, where, depth + 1);
    if (wrapped(e)) return same(e.slice(1, -1));
    const lit = /^(['"])((?:(?!\1)[^\\]|\\.)*)\1$/s.exec(e);
    if (lit) return /^\s*(javascript|data|vbscript):/i.test(lit[2]) ? [norm(e)] : [];
    if (e[0] === '`' && skipTemplate(e, 0) === e.length) {
        // The fixed text before the first ${...} decides the scheme: a site path, a fragment or an http(s) URL is fine;
        // a template that starts with ${...} is judged by that first value.
        const { text, exprs } = parts(e, 0, e.length);
        if (text[0]) return /^(https?:\/\/[^\s]|[./#?]|[\w-]+(\/|\.html?\b))/i.test(text[0]) ? [] : [norm(e)];
        return exprs.length ? same(e.slice(exprs[0].start, exprs[0].end)) : [];
    }
    const t = ternary(e);
    if (t) return [...same(t.a), ...same(t.b)];
    const or = splitTop(e, ['||', '??']);
    if (or) return or.flatMap((x) => same(x));
    const plus = splitTop(e, ['+']);
    if (plus) return same(plus[0]); // the first part decides the scheme
    const nu = /^new\s+URL\(\s*(['"])([^'"]*)\1\s*,[\s\S]*\)\s*\.href$/.exec(e);
    if (nu && !/^[a-z][a-z0-9+.-]*:/i.test(nu[2])) return []; // a relative path resolved against a base
    const call = callOf(e);
    if (call) {
        if (call.name === 'esc') return same(call.args);
        if (/^(?:[\w$]+\.)*(safeUrl|resolveLink)$/.test(call.name)) return [];
        const fn = ctx.arrows.get(call.name); // a local helper: what it returns
        if (fn && fn.expr !== undefined) return same(fn.expr).length ? [norm(e)] : [];
        if (fn && fn.block !== undefined) { const rs = returns(fn.block); return rs.length && rs.every((r) => !same(r).length) ? [] : [norm(e)]; }
        return [norm(e)];
    }
    const name = MEMBER.exec(e);
    if (name) {
        if (ctx.consts.has(name[1]) || fromConstList(name[1], ctx, at)) return [];
        const def = ctx.defs.filter((d) => d.name === name[1] && d.rhs !== null && d.at < at).pop();
        if (def) {
            // A local: its value must be safe; a property of it is safe when the local is an element of a constant.
            const rhs = def.rhs.trim();
            if (!name[2]) return same(rhs, def.at).length ? [norm(e)] : [];
            const base = MEMBER.exec(rhs);
            if (base && (ctx.consts.has(base[1]) || fromConstList(base[1], ctx, def.at))) return [];
        }
    }
    return [norm(e)];
}

// ---------- run ----------

const FILES_TRUSTED = Object.entries(TRUSTED).filter(([file]) => !file.startsWith('//'));

const findings = [];
const used = new Set();
let templates = 0;
let sinks = 0;

function contextFor(file, src) {
    const entries = TRUSTED[file] || {};
    const exact = {};
    const res = {};
    for (const [k, v] of Object.entries(entries)) {
        if (k.startsWith('//')) continue;
        if (k.length > 2 && k.startsWith('/') && k.endsWith('/')) res[k] = v; else exact[k] = v;
    }
    const trusted = new Proxy(exact, { get: (o, k) => { if (k in o) { used.add(`${file}\u0000${k}`); return o[k]; } return undefined; } });
    return { src, trusted, trustedRe: res, useRe: (k) => used.add(`${file}\u0000${k}`), ...fileFacts(src, file) };
}

function checkSource(file, src, from, to) {
    const ctx = contextFor(file, src);
    const line = (i) => src.slice(0, i).split('\n').length;
    const visit = (inherit) => (start, end) => {
        const { text, exprs } = parts(src, start, end);
        const inEsc = /\b(?:esc|encodeURIComponent)\(\s*$/.test(src.slice(Math.max(0, start - 24), start));
        const html = (inherit && !inEsc) || /<\/?[a-zA-Z!]/.test(text.join(''));
        if (html) templates++;
        exprs.forEach((x, k) => {
            if (html) for (const p of new Set(problems(src.slice(x.start, x.end), ctx, x.start))) findings.push(`${file}:${line(x.start)}: \${${p}} is inserted into HTML without esc()`);
            if (html && urlStart(text.slice(0, k + 1).join('\u0000'))) for (const p of new Set(urlProblems(src.slice(x.start, x.end), ctx, x.start))) findings.push(`${file}:${line(x.start)}: \${${p}} starts a URL attribute; pass it through safeUrl() or resolveLink() (esc() leaves the URL scheme as it is)`);
            // Templates inside an interpolation end up in the same HTML, unless they are escaped as a whole.
            const escaped = /^\s*(esc|encodeURIComponent)\s*\(/.test(src.slice(x.start, x.end));
            scan(src, x.start, x.end, visit(html && !escaped));
        });
    };
    scan(src, from, to, visit(false));

    // Sinks given something other than a template literal.
    const sinkRe = /\.(innerHTML|outerHTML|srcdoc)\s*\+?=(?!=)\s*|\[\s*(['"`])(innerHTML|outerHTML|srcdoc)\2\s*\]\s*\+?=(?!=)\s*|\.insertAdjacentHTML\s*\(\s*(?:'[^']*'|"[^"]*"|[\w$.]+)\s*,\s*|\.(createContextualFragment|parseFromString|setHTMLUnsafe)\s*\(\s*|\bdocument\.write(?:ln)?\s*\(\s*/g;
    sinkRe.lastIndex = from;
    let m;
    while ((m = sinkRe.exec(src)) && m.index < to) {
        sinks++;
        const at = m.index + m[0].length;
        let end = to;
        for (let i = at, d = 0; i < to; i++) {
            const c = src[i];
            if (c === '"' || c === "'") { i = skipString(src, i) - 1; continue; }
            if (c === '`') { i = skipTemplate(src, i) - 1; continue; }
            if (c === '(' || c === '[' || c === '{') d++;
            else if (c === ')' || c === ']' || c === '}') { if (d === 0) { end = i; break; } d--; }
            else if ((c === ';' || c === ',') && d === 0) { end = i; break; }
        }
        for (const p of new Set(problems(src.slice(at, end), ctx, at, 0, { sink: true }))) {
            findings.push(`${file}:${line(m.index)}: ${m[1] || m[3] || m[4] || 'an HTML sink'} receives ${p.length > 140 ? p.slice(0, 137) + '...' : p}, which is not escaped or reviewed`);
        }
    }
}

const files = listFiles();
for (const file of files) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (/\.html?$/i.test(file)) {
        for (const m of src.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
            const from = m.index + m[0].indexOf('>') + 1;
            checkSource(file, src, from, from + m[1].length);
        }
    } else {
        checkSource(file, src, 0, src.length);
    }
}

const stale = [];
for (const [file, entries] of FILES_TRUSTED) for (const k of Object.keys(entries)) if (!k.startsWith('//') && !used.has(`${file}\u0000${k}`)) stale.push(`${file}: ${k}`);

console.log(`sinks: ${files.length} files in ${DIRS.join(', ')}; ${templates} HTML templates, ${sinks} HTML sinks; ${used.size} reviewed expressions in use (scripts/checks/sinks-trusted.json)`);
if (process.argv.includes('--list')) {
    for (const [file, entries] of FILES_TRUSTED) for (const [k, why] of Object.entries(entries)) if (!k.startsWith('//')) console.log(`  ${file}: \${${k}}  -- ${why}`);
}
if (stale.length) {
    console.log(`note: ${stale.length} reviewed entr${stale.length === 1 ? 'y is' : 'ies are'} no longer used; remove ${stale.length === 1 ? 'it' : 'them'} from scripts/checks/sinks-trusted.json:`);
    for (const s of stale) console.log(`  ${s}`);
}
if (findings.length) {
    console.log(`\nFAIL: ${findings.length} finding(s). Escape the value with esc(...), or, if it is markup built safely elsewhere, add it to scripts/checks/sinks-trusted.json with the reason.`);
    for (const f of findings) console.log(`  ${f}`);
    process.exit(1);
}
console.log('ok: every value inserted into HTML is escaped, a literal or number, or reviewed');
