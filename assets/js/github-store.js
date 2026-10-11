// Minimal GitHub contents API client used by the Studios to keep a permanent archive of every
// published article and publication in the repository (content/...). The token is a
// fine-grained personal access token with "Contents: read and write" on this repository only;
// it is kept in this browser's localStorage and never sent anywhere except api.github.com.

const SETTINGS_KEY = "ebayednoob-github-settings";
export const DEFAULT_REPO = { owner: "BioChainAI", repo: "Ebayednoob", branch: "main" };

export function loadGitHubSettings() {
    try {
        return { ...DEFAULT_REPO, token: "", ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
    } catch {
        return { ...DEFAULT_REPO, token: "" };
    }
}

export function saveGitHubSettings(s) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ owner: s.owner, repo: s.repo, branch: s.branch, token: s.token }));
    } catch { /* storage unavailable */ }
}

export const isConnected = (s = loadGitHubSettings()) => !!(s.token && s.owner && s.repo);

const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");

export function rawUrl(path, s = loadGitHubSettings()) {
    return `https://raw.githubusercontent.com/${s.owner}/${s.repo}/${s.branch}/${encPath(path)}`;
}

async function api(path, { method = "GET", body, s = loadGitHubSettings() } = {}) {
    const res = await fetch(`https://api.github.com/repos/${s.owner}/${s.repo}${path}`, {
        method,
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${s.token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            ...(body ? { "Content-Type": "application/json" } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 404 && method === "GET") return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(`GitHub ${res.status}: ${data.message || res.statusText}`);
        err.status = res.status;
        throw err;
    }
    return data;
}

export async function testConnection(s = loadGitHubSettings()) {
    const repo = await api("", { s });
    if (!repo) throw new Error("Repository not found, or the token cannot see it.");
    if (repo.permissions && !repo.permissions.push) throw new Error("The token can read but not write to this repository.");
    return repo;
}

// UTF-8 text <-> base64 without the deprecated escape/unescape tricks.
export function textToBase64(text) {
    return bytesToBase64(new TextEncoder().encode(text));
}

export function bytesToBase64(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
}

function base64ToText(b64) {
    const bin = atob(b64.replace(/\n/g, ""));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export async function getFile(path) {
    const s = loadGitHubSettings();
    const data = await api(`/contents/${encPath(path)}?ref=${encodeURIComponent(s.branch)}`, { s });
    return data ? { sha: data.sha, text: data.content ? base64ToText(data.content) : "", htmlUrl: data.html_url } : null;
}

// Create or update a file. `content` is a base64 string. Returns { sha, commitUrl, htmlUrl }.
export async function putFile(path, content, message, sha) {
    const s = loadGitHubSettings();
    const write = async (currentSha) => api(`/contents/${encPath(path)}`, {
        method: "PUT",
        s,
        body: { message, content, branch: s.branch, ...(currentSha ? { sha: currentSha } : {}) }
    });
    let data;
    try {
        data = await write(sha ?? (await getFile(path))?.sha);
    } catch (e) {
        if (e.status !== 409 && e.status !== 422) throw e;
        data = await write((await getFile(path))?.sha); // file changed meanwhile: retry with fresh sha
    }
    return { sha: data.content.sha, htmlUrl: data.content.html_url, commitUrl: data.commit.html_url };
}

export const putText = (path, text, message, sha) => putFile(path, textToBase64(text), message, sha);

// Read-modify-write a JSON file (e.g. the archive manifest), retrying once on a conflict.
export async function updateJson(path, mutate, message) {
    for (let attempt = 0; attempt < 2; attempt++) {
        const cur = await getFile(path);
        let data;
        try {
            data = cur ? JSON.parse(cur.text) : null;
        } catch {
            data = null;
        }
        const next = mutate(data);
        try {
            return await putText(path, JSON.stringify(next, null, 2) + "\n", message, cur?.sha || null);
        } catch (e) {
            if (attempt || (e.status !== 409 && e.status !== 422)) throw e;
        }
    }
}

// Start a workflow (e.g. the daily article sync) on demand. Needs "Actions: write" on the token.
export async function dispatchWorkflow(file) {
    const s = loadGitHubSettings();
    await api(`/actions/workflows/${encodeURIComponent(file)}/dispatches`, { method: "POST", s, body: { ref: s.branch } });
}
