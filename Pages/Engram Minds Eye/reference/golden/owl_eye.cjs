// Owl Academy's Engram Mind Eye, run as written outside its page: the code that logs a session, replies, saves it,
// restores it and greets on a reload. Used by make_bridges_v1.cjs (the fixture) and ../run_e11.cjs (claim E11).
//
//   const { loadOwlEye } = require('./owl_eye.cjs');
//   const eye = loadOwlEye('<path to an Owl-Academy checkout>');
//   const owl = eye.owl();               // a fresh page: its own packet chain, window, codex parity, conversation
//   owl.intro(); owl.say('What is a geodesic?'); owl.stateJson();
//
// From Library/Experimental_Systems/Engram_Mind_Eye.html it takes, unchanged: everything from the TTMPT core to the
// first RENDERING block (the key, the concept library, selectResponse, tokenize, logPacket, logTokens, the chain
// state), STRIX_INTRO, the state saveEngram builds, restoreEngram, and the greeting the page types when it restores.
// The page's DOM is stood in for by a manifold setter that keeps the manifold, and a message function that draws
// nothing. intro() and say() are what the page does at startup and in transmit(), without the typewriter and BERT.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const F_EYE = 'Library/Experimental_Systems/Engram_Mind_Eye.html';

function grab(src, name) {                    // a function to its closing brace (skipping its parameter list)
    const m = new RegExp(`^[ \\t]*(?:export )?((?:async )?function ${name}\\(|class ${name} |const ${name} = )`, 'm').exec(src);
    if (!m) throw new Error(`${name} not found`);
    const start = m.index + m[0].length - m[1].length;
    let i = start, depth = 0;
    if (m[1].startsWith('const')) {
        for (; i < src.length; i++) { const c = src[i]; if ('([{'.includes(c)) depth++; else if (')]}'.includes(c)) depth--; else if (c === ';' && depth === 0) break; }
        return src.slice(start, i + 1);
    }
    if (m[1].includes('function')) {
        i = src.indexOf('(', start);
        for (depth = 0; i < src.length; i++) { if (src[i] === '(') depth++; else if (src[i] === ')' && --depth === 0) break; }
    }
    i = src.indexOf('{', i);
    for (depth = 0; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}' && --depth === 0) break; }
    return src.slice(start, i + 1);
}

function loadOwlEye(owlPath) {
    const file = path.join(owlPath, F_EYE);
    if (!fs.existsSync(file)) throw new Error(`missing ${file}: pass the path of an Owl-Academy checkout`);
    const EYE = fs.readFileSync(file, 'utf8');
    let commit = null;
    try { commit = execFileSync('git', ['-C', owlPath, 'log', '-1', '--format=%H', '--', F_EYE]).toString().trim(); } catch (e) { /* not a git checkout */ }
    const a = EYE.indexOf('/* =====================================================================\n   TTMPT ENGRAM CORE');
    const b = EYE.indexOf('/* =====================================================================\n   RENDERING');
    if (a < 0 || b < 0 || b < a) throw new Error('markers not found in Engram_Mind_Eye.html');
    const introM = /const STRIX_INTRO =\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+);/.exec(EYE);
    const saveBody = grab(EYE, 'saveEngram'), stateStmt = saveBody.slice(saveBody.indexOf('const state = '), saveBody.indexOf('localStorage.setItem'));
    const greetStmt = (() => { const i = EYE.indexOf('const resumeGreeting = '); return EYE.slice(i, EYE.indexOf(';', EYE.indexOf('We continue.', i)) + 1); })();
    const body = `
        const window = { MANIFOLD_TOKEN: 'D8K3T2' };
        let manifoldN = 8, manifoldK = 3, manifoldT = 2;
        const setEngramManifold = (n, k, t) => { manifoldN = n; manifoldK = k; manifoldT = t; window.MANIFOLD_TOKEN = 'D' + n + 'K' + k + 'T' + t; };
        const addMessage = () => ({}), escapeHtml = s => s;
        ${EYE.slice(a, b)}
        const STRIX_INTRO = ${introM[1]};
        function stateJson() { ${stateStmt} return JSON.stringify(state); }
        ${grab(EYE, 'restoreEngram')}
        function greeting(saved) {
            const epochCount = (saved.biochain || []).length, packetCount = (saved.packets || []).length;
            const lastNode = (saved.biochain || []).slice(-1)[0], lastTheme = lastNode ? lastNode.theme : null;
            ${greetStmt}
            return resumeGreeting;
        }
        function say(text) {                          // transmit() without the page: the human turn, then STRIX's reply
            conversationLog.push({ role: 'human', text }); logTokens(text, 'human');
            const r = selectResponse(text); conversationLog.push({ role: 'strix', text: r.response }); logTokens(r.response, 'strix');
            return r;
        }
        function intro() { logTokens(STRIX_INTRO, 'strix'); conversationLog.push({ role: 'strix', text: STRIX_INTRO }); }
        return { intro, say, stateJson, restoreEngram, greeting, logTokens, packetChain, parity: () => codexParity, hex32, conversation: () => conversationLog };`;
    return {
        source: { repository: 'BioChainAI/Owl-Academy', commit, file: F_EYE, sha256: crypto.createHash('sha256').update(EYE).digest('hex') },
        intro: new Function(`return ${introM[1]};`)(),
        owl: () => new Function(body)(),
    };
}

module.exports = { loadOwlEye, grab, F_EYE };
