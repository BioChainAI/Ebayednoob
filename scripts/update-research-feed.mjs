#!/usr/bin/env node
// Builds the Stay Current snapshot used by Pages/Research.
//   - Reads the admin's automation settings from Firestore (settings/feedConfig) via the public
//     REST API, falling back to Pages/Research/data/feed-config.json.
//   - Scans every enabled source with the same engine the browser uses (assets/js/feed-core.js).
//   - Writes Pages/Research/data/feed.json (latest scan) and merges into feed-archive.json.
//   - Syncs your own articles (settings/articleSync) into articles-feed.json.
// Run locally with: node scripts/update-research-feed.mjs
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { scanFeed, normalizeConfig, mergeArchive } from "../assets/js/feed-core.js";
import { syncArticles, normalizeArticleConfig, mergeArticleItems } from "../assets/js/article-sync.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "Pages/Research/data");
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "ebayednoob-github";

// Convert Firestore REST typed values ({stringValue: ...}) into plain JSON.
function fromFirestore(v) {
    if (!v || typeof v !== "object") return v;
    if ("stringValue" in v) return v.stringValue;
    if ("booleanValue" in v) return v.booleanValue;
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return v.doubleValue;
    if ("timestampValue" in v) return v.timestampValue;
    if ("nullValue" in v) return null;
    if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromFirestore);
    if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromFirestore(x)]));
    return null;
}

async function readJson(file, fallback) {
    try {
        return JSON.parse(await readFile(file, "utf8"));
    } catch {
        return fallback;
    }
}

async function readSettings(name) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/${name}`;
    try {
        const res = await fetch(url);
        if (res.ok) {
            const docJson = await res.json();
            console.log(`Using settings/${name} from Firestore`);
            return fromFirestore({ mapValue: { fields: docJson.fields || {} } });
        }
        console.warn(`settings/${name} unavailable (HTTP ${res.status}); using defaults`);
    } catch (e) {
        console.warn(`settings/${name} unavailable (${e.message}); using defaults`);
    }
    return null;
}

async function loadConfig() {
    const cfg = await readSettings("feedConfig");
    if (cfg) return { config: normalizeConfig(cfg), configSource: "firestore" };
    return { config: normalizeConfig(await readJson(path.join(dataDir, "feed-config.json"), null)), configSource: "repository" };
}

// ---- Your own articles (LinkedIn, Substack, X, ...) ----
const articleConfig = normalizeArticleConfig(await readSettings("articleSync"));
const articleResult = await syncArticles(articleConfig, { useProxy: false, forceDirect: true });
for (const s of articleResult.sourceStatus) {
    console.log(`${s.ok ? "ok  " : "FAIL"} [articles] ${s.name}: ${s.count} item(s)${s.error ? ` — ${s.error}` : ""}`);
}
const articlesFile = path.join(dataDir, "articles-feed.json");
const previousArticles = await readJson(articlesFile, { items: [] });
await writeFile(articlesFile, JSON.stringify({
    generatedAt: articleResult.scannedAt,
    sourceStatus: articleResult.sourceStatus,
    items: mergeArticleItems(previousArticles.items, articleResult.items, articleConfig.archiveCap)
}, null, 2) + "\n");

const { config, configSource } = await loadConfig();
const result = await scanFeed(config, { useProxy: false, forceDirect: true, politeDelayMs: 1000 });

for (const s of result.sourceStatus) {
    console.log(`${s.ok ? "ok  " : "FAIL"} ${s.name}: ${s.count} item(s)${s.error ? ` — ${s.error}` : ""}`);
}

const okCount = result.sourceStatus.filter((s) => s.ok).length;
if (!okCount) {
    console.error("Every source failed; keeping the previous snapshot.");
    process.exit(1);
}

await writeFile(path.join(dataDir, "feed.json"), JSON.stringify({
    generatedAt: result.scannedAt,
    configSource,
    sourceStatus: result.sourceStatus,
    latest: result.latest,
    items: result.items.slice(0, 100)
}, null, 2) + "\n");

const archiveFile = path.join(dataDir, "feed-archive.json");
const archive = await readJson(archiveFile, { items: [] });
const merged = mergeArchive(archive.items, result.items, config.archiveCap);
await writeFile(archiveFile, JSON.stringify({ updatedAt: result.scannedAt, items: merged }, null, 2) + "\n");

console.log(`Snapshot: ${result.latest.length} latest, ${result.items.length} scanned, archive ${merged.length}.`);
