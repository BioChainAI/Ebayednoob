// assets/js/github-store.js keeps the GitHub token in memory for the page only.
//   node --test tests/site/github-store.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const MODULE = pathToFileURL(path.resolve(__dirname, '../../assets/js/github-store.js')).href;
const KEY = 'ebayednoob-github-settings';

class FakeStorage {
    constructor(init = {}) { this.m = new Map(Object.entries(init)); }
    get length() { return this.m.size; }
    key(i) { return [...this.m.keys()][i] ?? null; }
    getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
    setItem(k, v) { this.m.set(k, String(v)); }
    removeItem(k) { this.m.delete(k); }
    dump() { return [...this.m.entries()].map(([k, v]) => `${k}=${v}`).join('\n'); }
}

let n = 0;
// A fresh copy of the module (its own memory) with the given storage in place.
async function load(local, session = new FakeStorage()) {
    globalThis.localStorage = local;
    globalThis.sessionStorage = session;
    return import(`${MODULE}?case=${++n}`);
}

test('a token saved by an earlier version is erased on load; owner, repo and branch stay', async () => {
    const local = new FakeStorage({ [KEY]: JSON.stringify({ owner: 'o', repo: 'r', branch: 'b', token: 'old-token-value' }) });
    const gs = await load(local);
    assert.ok(!local.dump().includes('old-token-value'), 'the old token is gone from storage');
    const stored = JSON.parse(local.getItem(KEY));
    assert.deepEqual({ owner: stored.owner, repo: stored.repo, branch: stored.branch }, { owner: 'o', repo: 'r', branch: 'b' });
    assert.equal(gs.loadGitHubSettings().token, '');
    assert.equal(gs.isConnected(), false);
    assert.equal(gs.takeTokenRemovedNotice(), true, 'the notice is given once');
    assert.equal(gs.takeTokenRemovedNotice(), false);
    assert.ok(!('tokenRemoved' in JSON.parse(local.getItem(KEY))));
});

test('an empty token from an earlier version is dropped without a notice', async () => {
    const local = new FakeStorage({ [KEY]: JSON.stringify({ owner: 'o', repo: 'r', branch: 'b', token: '' }) });
    const gs = await load(local);
    assert.ok(!('token' in JSON.parse(local.getItem(KEY))));
    assert.equal(gs.takeTokenRemovedNotice(), false);
});

test('an unreadable stored value is removed', async () => {
    const local = new FakeStorage({ [KEY]: '{"token":"broken-token-value"' });
    await load(local);
    assert.equal(local.getItem(KEY), null);
});

test('after a save the token is in no storage, only in the page memory', async () => {
    const local = new FakeStorage();
    const session = new FakeStorage();
    const gs = await load(local, session);
    gs.saveGitHubSettings({ owner: 'o', repo: 'r', branch: 'main', token: 'page-token-value' });
    assert.ok(!local.dump().includes('page-token-value'));
    assert.ok(!session.dump().includes('page-token-value'));
    assert.deepEqual(JSON.parse(local.getItem(KEY)), { owner: 'o', repo: 'r', branch: 'main' });
    assert.equal(gs.loadGitHubSettings().token, 'page-token-value');
    assert.equal(gs.isConnected(), true);

    // Saving owner/repo/branch without a token keeps the token held for the page.
    gs.saveGitHubSettings({ owner: 'o', repo: 'r2', branch: 'main' });
    assert.equal(gs.loadGitHubSettings().token, 'page-token-value');
    assert.equal(gs.loadGitHubSettings().repo, 'r2');

    gs.forgetToken();
    assert.equal(gs.loadGitHubSettings().token, '');
    assert.equal(gs.isConnected(), false);
});

test('a new page (a fresh module) starts without the token', async () => {
    const local = new FakeStorage();
    const a = await load(local);
    a.saveGitHubSettings({ owner: 'o', repo: 'r', branch: 'main', token: 'page-token-value' });
    const b = await load(local);
    assert.equal(b.loadGitHubSettings().token, '');
    assert.equal(b.loadGitHubSettings().repo, 'r');
});

test('API calls send the token held in memory to api.github.com only', async () => {
    const gs = await load(new FakeStorage());
    gs.saveGitHubSettings({ owner: 'o', repo: 'r', branch: 'main', token: 'page-token-value' });
    const calls = [];
    globalThis.fetch = async (url, init) => {
        calls.push({ url, auth: init.headers.Authorization });
        return { ok: true, status: 200, json: async () => ({ full_name: 'o/r', permissions: { push: true } }) };
    };
    const repo = await gs.testConnection();
    assert.equal(repo.full_name, 'o/r');
    assert.deepEqual(calls, [{ url: 'https://api.github.com/repos/o/r', auth: 'Bearer page-token-value' }]);
    delete globalThis.fetch;
});

test('the module loads when browser storage is unavailable', async () => {
    const throwing = { get length() { throw new Error('denied'); }, key() { throw new Error('denied'); }, getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
    const gs = await load(throwing, throwing);
    gs.saveGitHubSettings({ owner: 'o', repo: 'r', branch: 'main', token: 'page-token-value' });
    assert.equal(gs.loadGitHubSettings().token, 'page-token-value');
    assert.equal(gs.takeTokenRemovedNotice(), false);
});

test('a pending "token removed" notice survives saving owner/repo/branch until it is taken', async () => {
    const local = new FakeStorage({ [KEY]: JSON.stringify({ owner: 'o', repo: 'r', branch: 'b', token: 'old-token-value' }) });
    const gs = await load(local);
    gs.saveGitHubSettings({ owner: 'o', repo: 'r', branch: 'b', token: 'page-token-value' });
    assert.ok(!local.dump().includes('page-token-value'));
    assert.equal(JSON.parse(local.getItem(KEY)).tokenRemoved, true, 'still pending after a save');
    assert.equal(gs.takeTokenRemovedNotice(), true);
    gs.saveGitHubSettings({ owner: 'o', repo: 'r', branch: 'b' });
    assert.ok(!('tokenRemoved' in JSON.parse(local.getItem(KEY))), 'not brought back once taken');
});

// assets/js/storage-keys.js: moves only the listed old keys of this site.
const KEYS_MODULE = pathToFileURL(path.resolve(__dirname, '../../assets/js/storage-keys.js')).href;

test('moveLegacyKeys moves only the listed names and leaves other apps\' keys alone', async () => {
    const others = { owlAcademy_codex: 'a', engram_mind_eye_v1: 'b', 'hyperbolic-lexicon/state': 'c', 'engram-minds-eye/session': 'd', 'studio-modes': 'e' };
    const local = new FakeStorage({ ...others, 'studio-mode': 'split', 'studio-backup:articles:new': '{"title":"t"}', 'ebayednoob-studio-backup:articles:x': 'kept', 'studio-backup:articles:x': 'old' });
    globalThis.localStorage = local;
    globalThis.sessionStorage = new FakeStorage();
    const { moveLegacyKeys } = await import(`${KEYS_MODULE}?case=${++n}`);
    moveLegacyKeys('localStorage', ['studio-mode', 'studio-backup:*']);
    for (const [k, v] of Object.entries(others)) assert.equal(local.getItem(k), v, `${k} untouched`);
    assert.equal(local.getItem('studio-mode'), null);
    assert.equal(local.getItem('ebayednoob-studio-mode'), 'split');
    assert.equal(local.getItem('ebayednoob-studio-backup:articles:new'), '{"title":"t"}');
    assert.equal(local.getItem('ebayednoob-studio-backup:articles:x'), 'kept', 'an existing new key is not overwritten');
    assert.equal(local.getItem('studio-backup:articles:x'), null);
    moveLegacyKeys('localStorage', ['*']); // a bare "*" names nothing
    for (const [k, v] of Object.entries(others)) assert.equal(local.getItem(k), v, `${k} untouched by "*"`);
});
