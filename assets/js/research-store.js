// Firestore data layer for the Research hub. Public pages read only `status == "published"`
// documents; the Control Panel (admins) reads and writes everything. The Firestore security
// rules (firestore.rules) enforce the same split.
import { db, sessionEmail } from "./firebase.js";
import {
    collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { normalizeConfig, slugify, hashId } from "./feed-core.js";
import { normalizeArticleConfig } from "./article-sync.js";
import { SITE_ROOT, fetchJson } from "./ui.js";

export const COLLECTIONS = {
    publications: { label: "Publications", seed: "Pages/Research/data/publications.json" },
    articles: { label: "Articles", seed: "Pages/Research/data/articles.json" },
    feedItems: { label: "Curated feed items", seed: null }
};

const byDateDesc = (a, b) => String(b.date || b.published || "").localeCompare(String(a.date || a.published || ""));

export async function loadSeed(name) {
    const seed = COLLECTIONS[name]?.seed;
    if (!seed) return [];
    try {
        const data = await fetchJson(SITE_ROOT + seed);
        return (data.items || []).filter((x) => (x.status || "published") === "published");
    } catch {
        return [];
    }
}

// Published items for public pages. Falls back to the repository seed file when the
// collection is empty or Firestore is unreachable.
export async function loadPublished(name) {
    try {
        const snap = await getDocs(query(collection(db, name), where("status", "==", "published")));
        const items = snap.docs.map((d) => ({ ...d.data(), id: d.id })).sort(byDateDesc);
        if (items.length || !COLLECTIONS[name]?.seed) return { items, origin: "firestore" };
    } catch (e) {
        console.warn(`Firestore read for ${name} failed:`, e.message);
    }
    return { items: (await loadSeed(name)).sort(byDateDesc), origin: "repository" };
}

// Every document, drafts included (admins only).
export async function loadAll(name) {
    const snap = await getDocs(collection(db, name));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id })).sort(byDateDesc);
}

const clean = (obj) => JSON.parse(JSON.stringify(obj));

export function newId(title) {
    return `${slugify(title).slice(0, 40)}-${hashId(`${title}${Date.now()}`).slice(0, 5)}`;
}

export async function saveItem(name, id, data, user) {
    const docId = id || newId(data.title || "item");
    const payload = clean({ ...data, id: undefined });
    payload.updatedAt = serverTimestamp();
    payload.updatedBy = sessionEmail(user);
    if (!id) payload.createdAt = serverTimestamp();
    await setDoc(doc(db, name, docId), payload, { merge: true });
    return docId;
}

export function deleteItem(name, id) {
    return deleteDoc(doc(db, name, id));
}

export async function importSeed(name, user) {
    const items = await loadSeed(name);
    const batch = writeBatch(db);
    for (const it of items) {
        const { id, ...rest } = it;
        batch.set(doc(db, name, id || newId(it.title)), clean({ ...rest, status: rest.status || "published", createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: sessionEmail(user) }), { merge: true });
    }
    await batch.commit();
    return items.length;
}

// ---------- Stay Current automation settings ----------

export async function loadFeedConfig() {
    try {
        const snap = await getDoc(doc(db, "settings", "feedConfig"));
        if (snap.exists()) {
            const { updatedAt, updatedBy, ...cfg } = snap.data();
            return { config: normalizeConfig(cfg), origin: "firestore", updatedBy };
        }
    } catch (e) {
        console.warn("Feed config read failed:", e.message);
    }
    try {
        return { config: normalizeConfig(await fetchJson(SITE_ROOT + "Pages/Research/data/feed-config.json")), origin: "repository" };
    } catch {
        return { config: normalizeConfig(null), origin: "defaults" };
    }
}

export function saveFeedConfig(config, user) {
    return setDoc(doc(db, "settings", "feedConfig"), clean({ ...normalizeConfig(config), updatedAt: new Date().toISOString(), updatedBy: sessionEmail(user) }));
}

// ---------- Article sync settings (sources scanned for your own articles) ----------

export async function loadArticleSyncConfig() {
    try {
        const snap = await getDoc(doc(db, "settings", "articleSync"));
        if (snap.exists()) {
            const { updatedAt, updatedBy, ...cfg } = snap.data();
            return { config: normalizeArticleConfig(cfg), origin: "firestore", updatedBy };
        }
    } catch (e) {
        console.warn("Article sync config read failed:", e.message);
    }
    return { config: normalizeArticleConfig(null), origin: "defaults" };
}

export function saveArticleSyncConfig(config, user) {
    return setDoc(doc(db, "settings", "articleSync"), clean({ ...normalizeArticleConfig(config), updatedAt: new Date().toISOString(), updatedBy: sessionEmail(user) }));
}

// One published Studio piece by slug (Research reader).
export async function loadPublishedBySlug(name, slug) {
    const snap = await getDocs(query(collection(db, name), where("status", "==", "published"), where("slug", "==", slug)));
    const d = snap.docs[0];
    return d ? { ...d.data(), id: d.id } : null;
}
