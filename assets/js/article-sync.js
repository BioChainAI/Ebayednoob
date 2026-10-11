// Article sync: pulls your own articles from LinkedIn, Substack, X, Medium, Patreon or any
// RSS/Atom feed, then folds cross-posts of the same article into one entry with LinkedIn as
// the primary link. Environment-agnostic (browser + Node 18+), like feed-core.js.
import { parseXmlFeed, fetchText, stripHtml, decodeEntities, truncate, safeUrl, toIsoDate, hashId } from "./feed-core.js";

export const PLATFORMS = {
    linkedin: { label: "LinkedIn", hosts: ["linkedin.com"] },
    substack: { label: "Substack", hosts: ["substack.com"] },
    x: { label: "X", hosts: ["x.com", "twitter.com"] },
    medium: { label: "Medium", hosts: ["medium.com"] },
    patreon: { label: "Patreon", hosts: ["patreon.com"] },
    other: { label: "Website", hosts: [] },
    site: { label: "Ebayednoob", hosts: [] } // pieces written in the Article Studio (never auto-detected)
};

export const DEFAULT_ARTICLE_SYNC = {
    version: 1,
    linkedinOnly: true,      // only show articles that have a LinkedIn version; others attach to them as cross-posts
    matchThreshold: 0.75,    // title similarity (0-1) needed to treat two posts as the same article
    maxDaysApart: 180,       // cross-posts published further apart than this are never merged
    corsProxy: "https://api.allorigins.win/raw?url= https://corsproxy.io/?url= https://api.codetabs.com/v1/proxy?quest=",
    archiveCap: 2000,
    hiddenUrls: [],
    sources: [
        { id: "linkedin", name: "LinkedIn", platform: "linkedin", enabled: true, url: "https://www.linkedin.com/in/ghoard/recent-activity/articles/", feedUrl: "" },
        { id: "substack", name: "Substack", platform: "substack", enabled: true, url: "https://biochainai.substack.com/publish/posts/published", feedUrl: "" },
        { id: "x", name: "X", platform: "x", enabled: true, url: "https://x.com/Ebayednoob/articles", feedUrl: "" }
    ]
};

const toList = (v) => (Array.isArray(v) ? v : typeof v === "string" ? v.split(/[\n,]/) : []).map((x) => String(x).trim()).filter(Boolean);

export function normalizeArticleConfig(cfg) {
    const base = JSON.parse(JSON.stringify(DEFAULT_ARTICLE_SYNC));
    if (!cfg || typeof cfg !== "object") return base;
    const out = { ...base, ...cfg };
    out.sources = Array.isArray(cfg.sources) ? cfg.sources.map((s, i) => ({
        id: s.id || `source-${i}`,
        name: String(s.name || detectPlatform(s.url) || `Source ${i + 1}`),
        platform: PLATFORMS[s.platform] ? s.platform : (detectPlatform(s.url) || "other"),
        enabled: s.enabled !== false,
        url: String(s.url || "").trim(),
        feedUrl: String(s.feedUrl || "").trim()
    })) : base.sources;
    out.hiddenUrls = toList(cfg.hiddenUrls);
    if (!out.corsProxy || out.corsProxy.trim() === "https://api.allorigins.win/raw?url=") out.corsProxy = base.corsProxy;
    out.linkedinOnly = out.linkedinOnly !== false;
    const t = Number(out.matchThreshold);
    out.matchThreshold = Number.isFinite(t) && t > 0 && t <= 1 ? t : base.matchThreshold;
    for (const k of ["maxDaysApart", "archiveCap"]) {
        const n = Number(out[k]);
        out[k] = Number.isFinite(n) && n > 0 ? Math.round(n) : base[k];
    }
    return out;
}

// ---------- URLs ----------

export function detectPlatform(url) {
    let host;
    try {
        host = new URL(String(url)).hostname.toLowerCase();
    } catch {
        return "";
    }
    for (const [key, p] of Object.entries(PLATFORMS)) {
        if (p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) return key;
    }
    return "other";
}

// One key per article regardless of tracking parameters, "www.", trailing slashes or twitter.com vs x.com.
export function canonicalUrl(url) {
    const safe = safeUrl(url);
    if (!safe) return "";
    const u = new URL(safe);
    let host = u.hostname.toLowerCase().replace(/^(www|mobile|m)\./, "");
    if (host === "twitter.com") host = "x.com";
    if (host.endsWith(".linkedin.com")) host = "linkedin.com"; // uk.linkedin.com etc.
    const path = u.pathname.replace(/\/+$/, "") || "/";
    // Unknown sites may identify posts by query string (e.g. ?p=123, ?slug=...): keep it, minus tracking.
    let search = "";
    if (detectPlatform(`https://${host}/`) === "other") {
        const params = [...u.searchParams].filter(([k]) => !/^(utm_|fbclid|gclid|ref$|trk$)/i.test(k)).sort(([a], [b]) => a.localeCompare(b));
        if (params.length) search = `?${new URLSearchParams(params)}`;
    }
    return `https://${host}${path}${search}`;
}

// Public locations to read for a configured page. Writer dashboards and profile pages are
// mapped to their public feeds where one exists.
export function fetchPlan(source) {
    if (safeUrl(source.feedUrl)) return [{ url: source.feedUrl, kind: "auto", note: "feed URL override" }];
    const url = safeUrl(source.url);
    if (!url) return [];
    const u = new URL(url);
    const platform = source.platform || detectPlatform(url);
    if (/\.(xml|rss|atom)$|\/(feed|rss)\/?$/i.test(u.pathname)) return [{ url, kind: "feed" }];
    switch (platform) {
        case "substack":
            return [{ url: `${u.origin}/feed`, kind: "feed", note: "public Substack feed" }];
        case "medium": {
            const user = u.pathname.match(/^\/(@[^/]+)/)?.[1];
            return [{ url: user ? `https://medium.com/feed/${user}` : `${u.origin}/feed`, kind: "feed", note: "public Medium feed" }];
        }
        default:
            return [{ url, kind: "page" }];
    }
}

// ---------- Page scanning ----------

const ARTICLE_PATTERNS = {
    linkedin: /^https:\/\/linkedin\.com\/pulse\/[^/]+$/,
    x: /^https:\/\/x\.com\/(?:i\/article\/\d+|[A-Za-z0-9_]+\/article\/\d+|[A-Za-z0-9_]+\/status\/\d+)$/,
    substack: /^https:\/\/[a-z0-9-]+\.substack\.com\/p\/[^/]+$/,
    medium: /^https:\/\/(?:[a-z0-9-]+\.)?medium\.com\/.+-[0-9a-f]{8,}$/,
    patreon: /^https:\/\/patreon\.com\/posts\/[^/]+$/
};

function metaContent(html, names) {
    for (const n of names) {
        const re1 = new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${n}["'][^>]*content\\s*=\\s*["']([^"']*)["']`, "i");
        const re2 = new RegExp(`<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*(?:property|name)\\s*=\\s*["']${n}["']`, "i");
        const m = html.match(re1) || html.match(re2);
        if (m) return decodeEntities(m[1]).trim();
    }
    return "";
}

// Open Graph metadata of a single article page (LinkedIn /pulse/ pages are public).
export function parseArticleMeta(html, url) {
    const title = metaContent(html, ["og:title", "twitter:title"]) || stripHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
    return {
        url: canonicalUrl(metaContent(html, ["og:url"]) || url) || url,
        title: title.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim(),
        summary: metaContent(html, ["og:description", "description", "twitter:description"]),
        image: metaContent(html, ["og:image", "twitter:image"]),
        published: toIsoDate(metaContent(html, ["article:published_time", "datePublished", "pubdate"])) || toIsoDate((html.match(/"datePublished"\s*:\s*"([^"]+)"/) || [])[1])
    };
}

export async function fetchArticleMeta(url, { fetchImpl = globalThis.fetch?.bind(globalThis), proxy = "", cors = "auto" } = {}) {
    const html = await fetchText(url, { fetchImpl, proxy, cors, accept: "text/html" });
    return { ...parseArticleMeta(html, url), platform: detectPlatform(url) };
}

// Article links on an HTML page (profile, archive or listing page).
export function extractArticleLinks(html, pageUrl) {
    const found = new Map();
    for (const m of String(html).matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
        let abs;
        try {
            abs = new URL(decodeEntities(m[1]), pageUrl).href;
        } catch {
            continue;
        }
        const key = canonicalUrl(abs);
        const platform = detectPlatform(key);
        if (!key || !ARTICLE_PATTERNS[platform]?.test(key)) continue;
        const text = stripHtml(m[2]);
        const prev = found.get(key);
        if (!prev || (text.length > prev.title.length && text.length < 300)) found.set(key, { url: key, title: text.length >= 8 ? text : "", platform });
    }
    return [...found.values()];
}

const looksLikeFeed = (text) => /^\s*(<\?xml|<rss|<feed|<rdf:RDF)/i.test(text);
const looksLikeLogin = (html) => /authwall|login-form|sign ?in to (view|see)|JavaScript is (not available|disabled)/i.test(html);

// ---------- Normalizing ----------

const STOP = new Set("a an the of and or to in on for with is are be by at from as how why what when your our my this that it its vs".split(" "));

export function titleTokens(title) {
    return String(title || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w && !STOP.has(w));
}

// Titles recovered from URL slugs, e.g. linkedin.com/pulse/my-title-greg-hoard-abc12 or substack.com/p/my-title.
export function slugTitle(url) {
    const key = canonicalUrl(url);
    const m = key.match(/linkedin\.com\/pulse\/([^/]+)$/) || key.match(/substack\.com\/p\/([^/]+)$/) || key.match(/patreon\.com\/posts\/([^/]+)$/);
    if (!m) return "";
    let words = decodeURIComponent(m[1]).split("-").filter(Boolean);
    if (/linkedin/.test(key) || /patreon/.test(key)) words = words.filter((w, i) => !(i >= words.length - 1 && /\d/.test(w) && w.length >= 4));
    const t = words.join(" ");
    return t ? t[0].toUpperCase() + t.slice(1) : "";
}

export function titleSimilarity(a, b) {
    const A = new Set(titleTokens(a));
    const B = new Set(titleTokens(b));
    if (!A.size || !B.size) return 0;
    let inter = 0;
    for (const w of A) if (B.has(w)) inter++;
    const jaccard = inter / (A.size + B.size - inter);
    const small = Math.min(A.size, B.size);
    // One title containing the other (subtitle added on one site, author name in a slug...).
    const containment = small >= 3 ? inter / small : 0;
    return Math.max(jaccard, containment * 0.95);
}

function normalizeRaw(raw, sourcePlatform, sourceId) {
    const url = canonicalUrl(raw.url);
    if (!url) return null;
    const platform = detectPlatform(url) === "other" ? sourcePlatform : detectPlatform(url);
    const titleFromSlug = !raw.title;
    return {
        url,
        platform,
        title: truncate(stripHtml(raw.title || "") || slugTitle(url), 300),
        titleFromSlug,
        summary: truncate(stripHtml(raw.summary || ""), 600),
        image: safeUrl(raw.image) || "",
        published: raw.published || null,
        links: [...new Set((raw.links || []).map(canonicalUrl).filter((l) => l && l !== url))],
        sourceId
    };
}

// ---------- Syncing ----------

export async function syncArticles(rawConfig, opts = {}) {
    const config = normalizeArticleConfig(rawConfig);
    const fetchImpl = opts.fetchImpl || globalThis.fetch.bind(globalThis);
    const proxy = opts.useProxy === false ? "" : config.corsProxy;

    const runSource = async (source) => {
        const started = Date.now();
        const plan = fetchPlan(source);
        const status = { id: source.id, name: source.name, platform: source.platform, ok: false, count: 0, error: "", via: "", ms: 0 };
        if (!plan.length) return { status: { ...status, error: "Missing or invalid URL" }, items: [] };
        let lastError = "";
        for (const step of plan) {
            try {
                const cors = opts.forceDirect ? "direct" : "auto";
                let text = await fetchText(step.url, { fetchImpl, proxy, cors, accept: "application/rss+xml, application/atom+xml, text/html;q=0.9, */*;q=0.8" });
                let raw;
                let via = step.url;
                if (looksLikeFeed(text)) {
                    raw = parseXmlFeed(text);
                } else {
                    // A page that advertises its own feed: follow it.
                    const alt = text.match(/<link[^>]+type\s*=\s*["']application\/(?:rss|atom)\+xml["'][^>]*href\s*=\s*["']([^"']+)["']/i);
                    if (alt) {
                        via = new URL(decodeEntities(alt[1]), step.url).href;
                        text = await fetchText(via, { fetchImpl, proxy, cors, accept: "application/rss+xml, application/atom+xml" });
                        raw = parseXmlFeed(text);
                    } else {
                        raw = extractArticleLinks(text, step.url);
                        if (!raw.length) {
                            throw new Error(looksLikeLogin(text)
                                ? `${PLATFORMS[source.platform]?.label || "This site"} requires sign-in to list articles. Add a feed URL override, or add these articles by hand.`
                                : "No article links found on this page.");
                        }
                    }
                }
                const items = raw.map((r) => normalizeRaw(r, source.platform, source.id)).filter(Boolean);
                return { status: { ...status, ok: true, count: items.length, via: step.note ? `${step.note}: ${via}` : via, ms: Date.now() - started }, items };
            } catch (e) {
                lastError = e.message || String(e);
                if (/HTTP (999|401|403|429)/.test(lastError) && ["linkedin", "x"].includes(source.platform)) {
                    lastError = `${PLATFORMS[source.platform].label} blocked automated reading (${lastError}). Add a feed URL override, or add these articles by hand.`;
                }
            }
        }
        return { status: { ...status, error: lastError, ms: Date.now() - started }, items: [] };
    };

    const results = await Promise.all(config.sources.filter((s) => s.enabled).map(runSource));
    return {
        scannedAt: new Date().toISOString(),
        sourceStatus: results.map((r) => r.status),
        items: mergeArticleItems([], results.flatMap((r) => r.items))
    };
}

// Accumulate scanned items across runs (feeds usually only list the latest ~20 posts).
export function mergeArticleItems(existing, incoming, cap = 2000) {
    const now = new Date().toISOString();
    const map = new Map();
    const better = (a, b) => (a && !(b && a.length < b.length) ? a : b);
    for (const it of [...(existing || []), ...(incoming || [])]) {
        if (!it?.url) continue;
        const prev = map.get(it.url);
        if (!prev) {
            map.set(it.url, { firstSeen: now, ...it });
            continue;
        }
        map.set(it.url, {
            ...prev,
            title: !it.titleFromSlug && it.title ? it.title : prev.title,
            titleFromSlug: prev.titleFromSlug && it.titleFromSlug,
            summary: better(it.summary, prev.summary) || "",
            image: it.image || prev.image,
            published: it.published || prev.published,
            links: [...new Set([...(prev.links || []), ...(it.links || [])])]
        });
    }
    return [...map.values()].sort((a, b) => String(b.published || b.firstSeen || "").localeCompare(String(a.published || a.firstSeen || ""))).slice(0, cap);
}

// ---------- Grouping cross-posts ----------

const CROSSPOST_KEYS = ["x", "medium", "substack", "patreon"];

/**
 * Combine manual articles (Firestore `articles`) and synced items into one list.
 * Each result has one primary link (LinkedIn when one exists) and a `crossposts` map.
 * Rules, strongest first:
 *   1. Links you set by hand on an article always win, and those URLs are not re-matched.
 *   2. A post that links to another of your posts (e.g. "originally published on LinkedIn").
 *   3. Matching titles (see titleSimilarity), published within maxDaysApart of each other.
 * A group never holds two different posts from the same platform.
 */
export function groupArticles(manualArticles, syncedItems, rawConfig) {
    const config = normalizeArticleConfig(rawConfig);
    const hidden = new Set(config.hiddenUrls.map(canonicalUrl));
    const nodes = [];
    const byUrl = new Map();
    const add = (node) => {
        if (!node.url || hidden.has(node.url)) return -1;
        if (byUrl.has(node.url)) {
            const i = byUrl.get(node.url);
            const cur = nodes[i];
            // Keep the richer data; manual data always wins.
            nodes[i] = {
                ...cur,
                manual: cur.manual || node.manual,
                title: cur.manual ? cur.title : (!node.titleFromSlug && node.title) || cur.title,
                titleFromSlug: cur.titleFromSlug && node.titleFromSlug,
                summary: cur.summary || node.summary,
                image: cur.image || node.image,
                published: cur.published || node.published,
                links: [...new Set([...(cur.links || []), ...(node.links || [])])]
            };
            return i;
        }
        nodes.push(node);
        byUrl.set(node.url, nodes.length - 1);
        return nodes.length - 1;
    };

    const parent = [];
    const platformsOf = new Map(); // root -> Map(platform -> url)
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const canUnion = (a, b) => {
        const ra = find(a), rb = find(b);
        if (ra === rb) return false;
        const pa = platformsOf.get(ra), pb = platformsOf.get(rb);
        for (const [p, url] of pb) if (pa.has(p) && pa.get(p) !== url) return false;
        return true;
    };
    const union = (a, b, force = false) => {
        if (!force && !canUnion(a, b)) return false;
        const ra = find(a), rb = find(b);
        if (ra === rb) return false;
        parent[rb] = ra;
        for (const [p, url] of platformsOf.get(rb)) if (!platformsOf.get(ra).has(p)) platformsOf.get(ra).set(p, url);
        platformsOf.delete(rb);
        return true;
    };

    // 1. Manual articles and their hand-set cross-posts.
    const manualGroups = [];
    for (const a of manualArticles || []) {
        const primaryUrl = canonicalUrl(a.linkedinUrl);
        const siteUrl = canonicalUrl(a.siteUrl);
        const ids = [];
        const extraLinks = [];
        if (primaryUrl) ids.push(add({ url: primaryUrl, platform: "linkedin", title: a.title, summary: a.summary || "", image: a.coverImage || "", published: a.date || null, manual: true, links: [] }));
        if (siteUrl) {
            ids.push(add({ url: siteUrl, platform: "site", title: a.title, summary: a.summary || "", image: a.coverImage || "", published: a.date || null, manual: true, links: [] }));
            extraLinks.push(siteUrl);
        }
        for (const [key, link] of Object.entries(a.crossposts || {})) {
            const u = canonicalUrl(link);
            if (u) {
                ids.push(add({ url: u, platform: detectPlatform(u) === "other" ? key : detectPlatform(u), title: a.title, summary: "", image: "", published: a.date || null, manual: true, links: [] }));
                extraLinks.push(u);
            }
        }
        manualGroups.push({ article: a, ids: ids.filter((i) => i >= 0), primaryUrl, extraLinks });
    }
    const manualUrls = new Set(nodes.map((n) => n.url));

    for (const it of syncedItems || []) add({ ...it, manual: false });
    nodes.forEach((n, i) => {
        parent[i] = i;
        platformsOf.set(i, new Map([[n.platform, n.url]]));
    });
    for (const g of manualGroups) for (const i of g.ids.slice(1)) union(g.ids[0], i, true);

    // 2. Explicit links between posts.
    nodes.forEach((n, i) => {
        for (const l of n.links || []) {
            const j = byUrl.get(l);
            if (j !== undefined && !(manualUrls.has(n.url) && manualUrls.has(l))) union(i, j);
        }
    });

    // 3. Title similarity, best matches first.
    const pairs = [];
    const dayMs = 86400000;
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            if (a.platform === b.platform) continue;
            if (manualUrls.has(a.url) && manualUrls.has(b.url)) continue; // both placed by hand
            if (a.published && b.published && Math.abs(new Date(a.published) - new Date(b.published)) > config.maxDaysApart * dayMs) continue;
            const score = titleSimilarity(a.title, b.title);
            if (score >= config.matchThreshold) pairs.push([score, i, j]);
        }
    }
    pairs.sort((x, y) => y[0] - x[0]).forEach(([, i, j]) => union(i, j));

    // Build the output entries.
    const groups = new Map();
    nodes.forEach((n, i) => {
        const r = find(i);
        if (!groups.has(r)) groups.set(r, []);
        groups.get(r).push(n);
    });
    const manualByUrl = new Map(manualGroups.filter((g) => g.primaryUrl).map((g) => [g.primaryUrl, g.article]));
    const manualByAnyUrl = new Map();
    for (const g of manualGroups) for (const u of [g.primaryUrl, ...g.extraLinks]) if (u) manualByAnyUrl.set(u, g.article);

    const out = [];
    for (const members of groups.values()) {
        const linkedin = members.find((m) => m.platform === "linkedin");
        const site = members.find((m) => m.platform === "site");
        const manual = (linkedin && manualByUrl.get(linkedin.url)) || members.map((m) => manualByAnyUrl.get(m.url)).find(Boolean);
        const byDate = [...members].sort((a, b) => String(a.published || "9").localeCompare(String(b.published || "9")));
        const primary = linkedin || site || byDate[0];
        const crossposts = {};
        for (const m of members) {
            if (m === primary || m.platform === "site") continue;
            const key = CROSSPOST_KEYS.includes(m.platform) ? m.platform : (m.platform === "linkedin" ? "linkedin" : new URL(m.url).hostname.replace(/^www\./, ""));
            if (!crossposts[key]) crossposts[key] = m.url;
        }
        const named = members.filter((m) => m.title && !m.titleFromSlug);
        const title = manual?.title || (!primary.titleFromSlug && primary.title) || named.sort((a, b) => b.title.length - a.title.length)[0]?.title || primary.title;
        const summary = manual?.summary || [...members].sort((a, b) => (b.summary || "").length - (a.summary || "").length)[0]?.summary || "";
        out.push({
            id: manual?.id || `sync-${hashId(primary.url)}`,
            manualId: manual?.id || null,
            title,
            summary,
            date: manual?.date || (primary.published || byDate[0].published || "").slice(0, 10),
            coverImage: manual?.coverImage || members.map((m) => m.image).find(Boolean) || "",
            tags: manual?.tags || [],
            primaryPlatform: primary.platform,
            primaryUrl: primary.url,
            linkedinUrl: linkedin ? (manual?.linkedinUrl || linkedin.url) : "",
            siteUrl: site ? (manual?.siteUrl || site.url) : "",
            crossposts: { ...crossposts, ...(manual?.crossposts ? Object.fromEntries(Object.entries(manual.crossposts).filter(([, v]) => v)) : {}) },
            synced: members.some((m) => !m.manual),
            members: members.map((m) => ({ url: m.url, platform: m.platform, title: m.title, manual: !!m.manual }))
        });
    }
    out.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    // Your own Studio pieces always count as "yours", like LinkedIn articles.
    const shown = (a) => a.linkedinUrl || a.siteUrl;
    return {
        articles: config.linkedinOnly ? out.filter(shown) : out,
        unmatched: config.linkedinOnly ? out.filter((a) => !shown(a)) : []
    };
}
