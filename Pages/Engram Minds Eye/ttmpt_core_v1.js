// The TTMPT engram core, version 1, copied verbatim from Owl-Academy
// Library/Experimental_Systems/Engram_Mind_Eye.html (lines 599-657, commit 9082520), where it is marked
// "PRESERVED VERBATIM". Do not edit the function bodies: they define the engram/1 wire format, and
// Owl-Academy's scripts/biomesh.js reproduces them bit for bit (crystallize("GEODESIC") = 5c896a4801c9c24c).
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.TTMPTv1 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
/* --- 1. Mulberry32 PRNG --- */
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* --- 2. TTMPT Panmagic 8x8 token encoding --- */
function encodeToken(token) {
  let seed = 0;
  for (let i = 0; i < token.length; i++) seed = (seed * 31 + token.charCodeAt(i)) & 0xffffffff;
  const rng = mulberry32(seed);
  const grid = Array.from({length: 64}, () => rng() > 0.5 ? 1 : 0);
  return grid;
}

/* --- 3. XOR Crystallization --- */
function crystallize(text) {
  let acc = new Array(64).fill(0);
  for (const ch of text.toUpperCase()) {
    if (!/[A-Z]/.test(ch)) continue;
    const tokenGrid = encodeToken(ch);
    acc = acc.map((b, i) => b ^ tokenGrid[i]);
  }
  return acc;
}

/* --- 4. Hamming distance --- */
function hamming(a, b) {
  return a.reduce((sum, bit, i) => sum + (bit !== b[i] ? 1 : 0), 0);
}

/* --- 5. Chiral key generation --- */
function chiralKey(text) {
  const root = (text || '').replace(/[^A-Za-z]/g,'')[0] || '?';
  const grid = crystallize(text);
  let hex = '';
  for (let i = 0; i < 8; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte |= (grid[i*8+b] << b);
    hex += byte.toString(16).padStart(2, '0');
  }
  return `O1::${root}::${hex}`;
}

/* --- 6. Torsion flow J --- */
function computeJ(grid) {
  let upper = 0, lower = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (c > r) upper += grid[r*8+c];
      else if (c < r) lower += grid[r*8+c];
    }
  }
  return (upper - lower) / 32;
}

return { mulberry32, encodeToken, crystallize, hamming, chiralKey, computeJ };
});
