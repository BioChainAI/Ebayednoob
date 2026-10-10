// Stay Current feed engine.
// Environment-agnostic ES module: runs in the browser (Research hub, Control Panel test scans)
// and in Node 18+ (scripts/update-research-feed.mjs, run by the scheduled GitHub Action).
// No DOM APIs are used so the same parsing and ranking logic applies everywhere.

export const SOURCE_TYPES = {
    arxiv: { label: "arXiv API", home: "https://arxiv.org", attribution: "arXiv.org (Cornell University). Metadata is CC0." },
    openalex: { label: "OpenAlex API", home: "https://openalex.org", attribution: "OpenAlex (OurResearch). Metadata is CC0." },
    europepmc: { label: "Europe PMC API", home: "https://europepmc.org", attribution: "Europe PMC (EMBL-EBI)." },
    rss: { label: "RSS / Atom feed", home: "", attribution: "Publisher RSS/Atom feed." }
};

export const DEFAULT_FEED_CONFIG = {
    version: 1,
    latestCount: 10,          // items shown in the main Stay Current view
    lookbackDays: 45,         // ignore scanned items older than this
    perSourceLimit: 8,        // max results requested per source (per topic for per-topic sources)
    balanceTopics: true,      // round-robin across topics so one busy field can't fill all 10 slots
    requireTopicMatch: true,  // drop scanned items that match none of the enabled topics
    archiveCap: 1000,         // max items kept in the snapshot archive
    corsProxy: "https://api.allorigins.win/raw?url=",
    contactEmail: "",         // optional; sent to OpenAlex as `mailto` (polite pool)
    blockedUrls: [],
    topics: [
        { id: "ethical-ai", name: "Ethical AI", enabled: true, keywords: ["AI ethics", "ethical AI", "AI alignment", "responsible AI", "AI safety", "machine ethics"] },
        { id: "general-ai", name: "General AI", enabled: true, keywords: ["artificial general intelligence", "AGI", "general-purpose AI", "foundation model"] },
        { id: "superintelligence", name: "Superintelligence", enabled: true, keywords: ["superintelligence", "superintelligent", "recursive self-improvement", "intelligence explosion"] },
        { id: "hyperbolic-geometry", name: "Hyperbolic Geometry", enabled: true, keywords: ["hyperbolic geometry", "hyperbolic space", "hyperbolic embedding", "hyperbolic neural network", "Poincare ball"] },
        { id: "physics", name: "Physics", enabled: true, keywords: ["Chern-Simons", "topological quantum field theory", "quantum coherence", "quaternion", "scalar field"] },
        { id: "biomolecular", name: "Bio-molecular Systems", enabled: true, keywords: ["biomolecular", "molecular machine", "protein folding", "biomolecular condensate"] },
        { id: "bio-resonance", name: "Bio-Resonance", enabled: true, keywords: ["bioresonance", "biological resonance", "bioelectromagnetics", "biophoton", "Frohlich condensate"] },
        { id: "microtubules", name: "Microtubules", enabled: true, keywords: ["microtubule", "tubulin", "Orch OR", "orchestrated objective reduction"] },
        { id: "neuromorphic-ai", name: "Neuromorphic AI", enabled: true, keywords: ["neuromorphic", "spiking neural network", "memristive", "memristor"] },
        { id: "mycelium-computation", name: "Mycelium Computation", enabled: true, keywords: ["mycelium", "fungal computing", "fungal electrical", "unconventional computing"] },
        { id: "quantum-biology", name: "Quantum Biology", enabled: true, keywords: ["quantum biology", "quantum effects in biology", "quantum consciousness"] },
        { id: "geometric-deep-learning", name: "Geometric Deep Learning", enabled: true, keywords: ["geometric deep learning", "Clifford algebra", "geometric algebra", "quaternion neural network"] }
    ],
    sources: [
        { id: "arxiv", name: "arXiv", type: "arxiv", enabled: true, queryMode: "combined", cors: "auto", homepage: "https://arxiv.org" },
        { id: "openalex", name: "OpenAlex", type: "openalex", enabled: true, queryMode: "per-topic", cors: "auto", homepage: "https://openalex.org" },
        { id: "europepmc", name: "Europe PMC", type: "europepmc", enabled: true, queryMode: "per-topic", cors: "auto", homepage: "https://europepmc.org" },
        { id: "arxiv-q-bio-nc", name: "arXiv q-bio.NC (RSS)", type: "rss", enabled: true, url: "https://rss.arxiv.org/rss/q-bio.NC", cors: "proxy", homepage: "https://arxiv.org/list/q-bio.NC/new" },
        { id: "arxiv-cs-ne", name: "arXiv cs.NE (RSS)", type: "rss", enabled: true, url: "https://rss.arxiv.org/rss/cs.NE", cors: "proxy", homepage: "https://arxiv.org/list/cs.NE/new" },
        { id: "quanta", name: "Quanta Magazine (RSS)", type: "rss", enabled: false, url: "https://www.quantamagazine.org/feed/", cors: "proxy", homepage: "https://www.quantamagazine.org" }
    ]
};

const clone = (v) => JSON.parse(JSON.stringify(v));

// Fill in any missing settings from the defaults so older saved configs keep working.
export function normalizeConfig(cfg) {
    const base = clone(DEFAULT_FEED_CONFIG);
    if (!cfg || typeof cfg !== "object") return base;
    const out = { ...base, ...cfg };
    out.topics = Array.isArray(cfg.topics) ? cfg.topics.map((t, i) => ({
        id: t.id || slugify(t.name || `topic-${i}`),
        name: String(t.name || `Topic ${i + 1}`),
        enabled: t.enabled !== false,
        keywords: toList(t.keywords)
    })) : base.topics;
    out.sources = Array.isArray(cfg.sources) ? cfg.sources.map((s, i) => ({
        id: s.id || slugify(s.name || `source-${i}`),
        name: String(s.name || `Source ${i + 1}`),
        type: SOURCE_TYPES[s.type] ? s.type : "rss",
        enabled: s.enabled !== false,
        url: s.url || "",
        query: s.query || "",
        queryMode: s.queryMode === "combined" ? "combined" : (s.queryMode === "per-topic" ? "per-topic" : (s.type === "arxiv" ? "combined" : "per-topic")),
        cors: ["direct", "proxy", "auto"].includes(s.cors) ? s.cors : "auto",
        homepage: s.homepage || SOURCE_TYPES[s.type]?.home || ""
    })) : base.sources;
    out.blockedUrls = toList(cfg.blockedUrls);
    for (const k of ["latestCount", "lookbackDays", "perSourceLimit", "archiveCap"]) {
        const n = Number(out[k]);
        out[k] = Number.isFinite(n) && n > 0 ? Math.round(n) : base[k];
    }
    out.balanceTopics = out.balanceTopics !== false;
    out.requireTopicMatch = out.requireTopicMatch !== false;
    return out;
}

export function toList(v) {
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
    if (typeof v === "string") return v.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    return [];
}

export function slugify(s) {
    return String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").slice(0, 60) || "item";
}

export function hashId(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
}

// ---------- Text helpers ----------

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

export function decodeEntities(s) {
    return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
        if (e[0] === "#") {
            const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
            return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
        }
        return NAMED_ENTITIES[e.toLowerCase()] ?? m;
    });
}

// Feed text is untrusted: reduce it to plain text. Rendering code must still escape it.
export function stripHtml(s) {
    if (!s) return "";
    let t = String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
    t = decodeEntities(t);              // entity-encoded HTML (common in RSS descriptions)
    t = t.replace(/<[^>]*>/g, " ");
    t = decodeEntities(t);
    return t.replace(/\s+/g, " ").trim();
}

export function truncate(s, n) {
    return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;
}

export function safeUrl(u) {
    try {
        const url = new URL(String(u).trim());
        return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

export function toIsoDate(v) {
    if (!v) return null;
    const d = new Date(String(v).trim());
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------- Topic matching ----------

export function compileTopics(topics) {
    return (topics || []).filter((t) => t.enabled !== false && t.keywords?.length).map((t) => ({
        id: t.id,
        name: t.name,
        patterns: t.keywords.map((k) => new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRe(k).replace(/-|\s+/g, "[\\s-]?")}(?:s|es)?(?=$|[^\\p{L}\\p{N}])`, "iu"))
    }));
}

export function matchTopics(text, compiled) {
    const plain = text.normalize("NFKD").replace(/[̀-ͯ]/g, "");
    return compiled.filter((t) => t.patterns.some((re) => re.test(plain))).map((t) => t.name);
}

// ---------- XML (RSS 2.0 / RSS 1.0 / Atom, incl. arXiv) ----------

function tagContent(block, names) {
    for (const name of names) {
        const re = new RegExp(`<${escapeRe(name)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeRe(name)}>`, "i");
        const m = block.match(re);
        if (m) return m[1];
    }
    return "";
}

function allTagContents(block, name) {
    const re = new RegExp(`<${escapeRe(name)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeRe(name)}>`, "gi");
    return [...block.matchAll(re)].map((m) => m[1]);
}

function atomLink(block) {
    const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1]);
    const attr = (a, n) => (a.match(new RegExp(`${n}\\s*=\\s*["']([^"']*)["']`, "i")) || [])[1] || "";
    const alt = links.find((a) => /rel\s*=\s*["']alternate["']/i.test(a)) || links.find((a) => !/rel\s*=/i.test(a)) || links[0];
    return alt ? decodeEntities(attr(alt, "href")) : "";
}

export function parseXmlFeed(xml) {
    const text = String(xml);
    const isAtom = /<feed[\s>]/i.test(text) && /<entry[\s>]/i.test(text);
    const blocks = isAtom
        ? [...text.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0])
        : [...text.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0]);
    return blocks.map((b) => {
        const authors = isAtom
            ? allTagContents(b, "author").map((a) => stripHtml(tagContent(a, ["name"]) || a))
            : [...allTagContents(b, "dc:creator"), ...allTagContents(b, "author")].flatMap((a) => stripHtml(a).split(/,\s*|\s+and\s+/));
        return {
            title: stripHtml(tagContent(b, ["title"])),
            url: isAtom ? atomLink(b) : stripHtml(tagContent(b, ["link"])) || stripHtml(tagContent(b, ["guid"])),
            summary: stripHtml(tagContent(b, isAtom ? ["summary", "content"] : ["description", "content:encoded", "summary"])),
            authors: authors.map((a) => a.trim()).filter(Boolean),
            published: toIsoDate(stripHtml(tagContent(b, isAtom ? ["published", "updated"] : ["pubDate", "dc:date", "published", "prism:publicationDate"]))),
            doi: stripHtml(tagContent(b, ["arxiv:doi", "prism:doi", "dc:identifier"])).replace(/^doi:\s*/i, "")
        };
    });
}

// ---------- Fetching ----------

async function fetchText(url, { fetchImpl, cors, proxy, timeoutMs = 20000, accept }) {
    const attempt = async (u) => {
        const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
        try {
            const res = await fetchImpl(u, { signal: ctrl?.signal, headers: accept ? { Accept: accept } : undefined });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } finally {
            if (timer) clearTimeout(timer);
        }
    };
    const viaProxy = () => {
        if (!proxy) throw new Error("This source needs a CORS proxy, but none is configured");
        return attempt(proxy.includes("{url}") ? proxy.replace("{url}", encodeURIComponent(url)) : proxy + encodeURIComponent(url));
    };
    if (cors === "proxy") return viaProxy();
    if (cors === "direct" || !proxy) return attempt(url);
    try {
        return await attempt(url);
    } catch {
        return viaProxy();
    }
}

const quoteTerms = (kws) => kws.map((k) => `"${k.replace(/"/g, "")}"`);

function dateDaysAgo(days) {
    return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

// Each fetcher returns raw items: { title, url, summary, authors, published, doi, venue }.
const FETCHERS = {
    async arxiv(source, terms, ctx) {
        const q = source.query || quoteTerms(terms).map((t) => `all:${t}`).join(" OR ");
        const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(q)}&sortBy=submittedDate&sortOrder=descending&max_results=${ctx.limit}`;
        const xml = await fetchText(url, { ...ctx, accept: "application/atom+xml" });
        return parseXmlFeed(xml).map((it) => ({ ...it, url: it.url.replace(/^http:/, "https:"), venue: "arXiv preprint" }));
    },
    async openalex(source, terms, ctx) {
        const search = source.query || quoteTerms(terms).join(" OR ");
        const today = new Date().toISOString().slice(0, 10);
        let url = `https://api.openalex.org/works?search=${encodeURIComponent(search)}&filter=from_publication_date:${dateDaysAgo(ctx.lookbackDays)},to_publication_date:${today}&sort=publication_date:desc&per-page=${ctx.limit}`;
        if (ctx.contactEmail) url += `&mailto=${encodeURIComponent(ctx.contactEmail)}`;
        const data = JSON.parse(await fetchText(url, { ...ctx, accept: "application/json" }));
        return (data.results || []).map((w) => ({
            title: stripHtml(w.display_name || w.title || ""),
            url: w.doi || w.primary_location?.landing_page_url || w.id,
            summary: invertedIndexToText(w.abstract_inverted_index),
            authors: (w.authorships || []).map((a) => a.author?.display_name).filter(Boolean),
            published: toIsoDate(w.publication_date),
            doi: (w.doi || "").replace(/^https?:\/\/doi\.org\//i, ""),
            venue: w.primary_location?.source?.display_name || ""
        }));
    },
    async europepmc(source, terms, ctx) {
        const today = new Date().toISOString().slice(0, 10);
        const q = `(${source.query || quoteTerms(terms).join(" OR ")}) AND FIRST_PDATE:[${dateDaysAgo(ctx.lookbackDays)} TO ${today}]`;
        const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}&format=json&resultType=core&sort=${encodeURIComponent("FIRST_PDATE_D desc")}&pageSize=${ctx.limit}`;
        const data = JSON.parse(await fetchText(url, { ...ctx, accept: "application/json" }));
        return (data.resultList?.result || []).map((r) => ({
            title: stripHtml(r.title || ""),
            url: r.doi ? `https://doi.org/${r.doi}` : `https://europepmc.org/article/${r.source}/${r.id}`,
            summary: stripHtml(r.abstractText || ""),
            authors: (r.authorString || "").replace(/\.$/, "").split(/,\s*/).filter(Boolean),
            published: toIsoDate(r.firstPublicationDate),
            doi: r.doi || "",
            venue: r.journalInfo?.journal?.title || r.bookOrReportDetails?.publisher || (r.source === "PPR" ? "Preprint" : "")
        }));
    },
    async rss(source, _terms, ctx) {
        if (!safeUrl(source.url)) throw new Error("Missing or invalid feed URL");
        return parseXmlFeed(await fetchText(source.url, { ...ctx, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" }));
    }
};

function invertedIndexToText(idx) {
    if (!idx) return "";
    const words = [];
    for (const [w, positions] of Object.entries(idx)) for (const p of positions) words[p] = w;
    return words.filter(Boolean).join(" ");
}

// ---------- Ranking ----------

const byDateDesc = (a, b) => (b.published || "").localeCompare(a.published || "");

// Newest first; when balancing, take the newest item from each topic in turn.
export function selectLatest(items, limit, balance) {
    const sorted = [...items].sort(byDateDesc);
    if (!balance) return sorted.slice(0, limit);
    const groups = new Map();
    for (const it of sorted) {
        const key = it.topics?.[0] || "_other";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(it);
    }
    const queues = [...groups.values()];
    const picked = [];
    while (picked.length < limit && queues.some((q) => q.length)) {
        for (const q of queues) {
            if (q.length && picked.length < limit) picked.push(q.shift());
        }
    }
    return picked.sort(byDateDesc);
}

export function normalizeItem(raw, source, compiled) {
    const title = truncate(stripHtml(raw.title || ""), 300);
    const url = safeUrl(raw.url) || (raw.doi ? `https://doi.org/${raw.doi}` : "");
    const summary = truncate(stripHtml(raw.summary || ""), 700);
    const topics = matchTopics(`${title} ${summary}`, compiled);
    const typeInfo = SOURCE_TYPES[source.type] || {};
    return {
        id: hashId((raw.doi || url || title).toLowerCase()),
        title,
        url,
        summary,
        authors: (raw.authors || []).slice(0, 12),
        published: raw.published || null,
        doi: raw.doi || "",
        venue: raw.venue || "",
        topics,
        source: {
            id: source.id,
            name: source.name,
            type: source.type,
            homepage: safeUrl(source.homepage) || typeInfo.home || "",
            feedUrl: source.type === "rss" ? safeUrl(source.url) : "",
            attribution: typeInfo.attribution || ""
        }
    };
}

export function dedupe(items) {
    const seen = new Map();
    for (const it of items) {
        const key = it.doi ? `doi:${it.doi.toLowerCase()}` : it.title.toLowerCase().replace(/\W+/g, " ").trim();
        const prev = seen.get(key);
        if (!prev) seen.set(key, it);
        else prev.topics = [...new Set([...prev.topics, ...it.topics])];
    }
    return [...seen.values()];
}

// Scan every enabled source. Never throws for a single failing source: each source gets a
// status row so the UI can show exactly where material came from and what failed.
export async function scanFeed(rawConfig, opts = {}) {
    const config = normalizeConfig(rawConfig);
    const fetchImpl = opts.fetchImpl || globalThis.fetch.bind(globalThis);
    const compiled = compileTopics(config.topics);
    const topics = config.topics.filter((t) => t.enabled && t.keywords.length);
    const allTerms = topics.flatMap((t) => t.keywords);
    const cutoff = new Date(Date.now() - config.lookbackDays * 86400000).toISOString();
    const blocked = new Set(config.blockedUrls.map((u) => safeUrl(u)).filter(Boolean));
    const ctx = {
        fetchImpl,
        proxy: opts.useProxy === false ? "" : config.corsProxy,
        lookbackDays: config.lookbackDays,
        contactEmail: config.contactEmail,
        limit: config.perSourceLimit
    };

    const runSource = async (source) => {
        const started = Date.now();
        const fetcher = FETCHERS[source.type];
        const sctx = { ...ctx, cors: opts.forceDirect ? "direct" : source.cors };
        const raw = [];
        const errors = [];
        try {
            if (source.type === "rss" || source.query || source.queryMode === "combined") {
                raw.push(...await fetcher(source, allTerms, { ...sctx, limit: source.queryMode === "combined" && source.type !== "rss" ? Math.min(100, config.perSourceLimit * 5) : sctx.limit }));
            } else {
                for (const topic of topics) {
                    try {
                        raw.push(...await fetcher(source, topic.keywords, sctx));
                    } catch (e) {
                        errors.push(`${topic.name}: ${e.message}`);
                    }
                    if (opts.politeDelayMs) await new Promise((r) => setTimeout(r, opts.politeDelayMs));
                }
                if (!raw.length && errors.length) throw new Error(errors[0]);
            }
        } catch (e) {
            return { status: { id: source.id, name: source.name, type: source.type, homepage: source.homepage, ok: false, count: 0, error: e.message || String(e), ms: Date.now() - started }, items: [] };
        }
        let items = raw.map((r) => normalizeItem(r, source, compiled)).filter((it) => it.title && it.url && !blocked.has(it.url));
        items = items.filter((it) => !it.published || it.published >= cutoff);
        if (config.requireTopicMatch) items = items.filter((it) => it.topics.length);
        return {
            status: { id: source.id, name: source.name, type: source.type, homepage: source.homepage, ok: true, count: items.length, error: errors.length ? `${errors.length} partial error(s)` : "", ms: Date.now() - started },
            items
        };
    };

    const enabled = config.sources.filter((s) => s.enabled && FETCHERS[s.type]);
    const results = await Promise.all(enabled.map(runSource));
    const items = dedupe(results.flatMap((r) => r.items)).sort(byDateDesc);
    return {
        scannedAt: new Date().toISOString(),
        sourceStatus: results.map((r) => r.status),
        items,
        latest: selectLatest(items, config.latestCount, config.balanceTopics)
    };
}

// Merge newly scanned items into an archive list (dedupe, keep first-seen time, newest first).
export function mergeArchive(existing, incoming, cap = 1000) {
    const now = new Date().toISOString();
    const map = new Map();
    for (const it of existing || []) map.set(it.id, it);
    for (const it of incoming || []) {
        const prev = map.get(it.id);
        map.set(it.id, prev ? { ...it, firstSeen: prev.firstSeen || now } : { ...it, firstSeen: now });
    }
    return [...map.values()].sort(byDateDesc).slice(0, cap);
}
