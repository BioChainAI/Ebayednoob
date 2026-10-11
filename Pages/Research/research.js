// Research hub: Publications, Stay Current feed and Articles, each with its own archive.
import { auth, db, signInWithGoogle, signOut, onAuthStateChanged, checkIsAdmin, sessionEmail } from "../../assets/js/firebase.js";
import { loadGuest } from "../../assets/js/identity.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { startBackground } from "../../assets/js/background.js";
import { createBrowser } from "../../assets/js/collection-browser.js";
import { loadPublished, loadFeedConfig, saveItem, loadArticleSyncConfig } from "../../assets/js/research-store.js";
import { syncArticles, groupArticles, mergeArticleItems, PLATFORMS } from "../../assets/js/article-sync.js";
import { scanFeed, selectLatest, dedupe, SOURCE_TYPES, safeUrl } from "../../assets/js/feed-core.js";
import { $, $$, esc, resolveLink, hostOf, fmtDate, timeAgo, toast, fetchJson, ICONS, CROSSPOST_PLATFORMS, SITE_ROOT } from "../../assets/js/ui.js";

startBackground();

const state = {
    user: null,
    isAdmin: false,
    config: null,
    configOrigin: "",
    snapshot: null,      // data/feed.json (scheduled scan)
    archive: [],         // data/feed-archive.json
    live: null,          // result of a "Refresh feed" scan in this browser
    curated: [],         // admin-added feed items (Firestore feedItems)
    topics: new Set(),   // selected topic filters
    scanning: false
};

// ---------- Tabs ----------

const TABS = ["publications", "stay-current", "articles"];
const browsers = {};

function showTab(name, view) {
    if (!TABS.includes(name)) name = "publications";
    for (const t of TABS) {
        $(`#tab-${t}`).setAttribute("aria-selected", String(t === name));
        $(`#panel-${t}`).classList.toggle("hidden", t !== name);
    }
    const b = { publications: browsers.publications, "stay-current": browsers.feed, articles: browsers.articles }[name];
    if (view && b) b.setView(view);
}

function routeFromHash() {
    const [tab, view] = location.hash.replace(/^#/, "").split("/");
    showTab(tab || "publications", view);
}

$$("[data-tab]").forEach((btn) => btn.addEventListener("click", () => {
    history.replaceState(null, "", `#${btn.dataset.tab}`);
    showTab(btn.dataset.tab);
}));
window.addEventListener("hashchange", routeFromHash);

// ---------- Shared rendering ----------

const tagChips = (tags) => (tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join(" ");

function linkBtn(href, label, cls = "btn-ghost", icon = ICONS.external) {
    const url = resolveLink(href);
    return url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="btn ${cls} btn-sm">${label}${icon ? ` ${icon}` : ""}</a>` : "";
}

const authorLine = (authors, max = 6) => {
    const list = authors || [];
    return list.length ? esc(list.slice(0, max).join(", ") + (list.length > max ? ` +${list.length - max} more` : "")) : "";
};

// ---------- Publications ----------

function renderPublication(p, layout) {
    const actions = [
        linkBtn(p.url, "Read", "btn-primary"),
        linkBtn(p.pdfUrl, "PDF"),
        p.doi ? linkBtn(`https://doi.org/${p.doi}`, "DOI") : ""
    ].join("");
    return `
    <article class="panel p-5 flex flex-col ${layout === "list" ? "md:flex-row md:items-start md:gap-6" : ""} hover:border-teal-500/50 transition-colors">
        <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-2">
                ${p.type ? `<span class="uppercase tracking-wide text-blue-300 font-semibold">${esc(p.type)}</span><span>·</span>` : ""}
                <time datetime="${esc(p.date || "")}">${esc(fmtDate(p.date))}</time>
                ${p.venue ? `<span>·</span><span>${esc(p.venue)}</span>` : ""}
            </div>
            <h3 class="text-xl font-semibold text-white leading-snug">${esc(p.title)}</h3>
            ${p.authors?.length ? `<p class="text-sm text-gray-400 mt-1">${authorLine(p.authors)}</p>` : ""}
            ${p.abstract ? `<details class="mt-3 group"><summary class="text-sm text-gray-300 cursor-pointer list-none"><span class="line-clamp-3 group-open:hidden">${esc(p.abstract)}</span><span class="text-teal-400 text-xs group-open:hidden">Show abstract</span><span class="hidden group-open:inline text-teal-400 text-xs">Hide abstract</span></summary><p class="text-sm text-gray-300 mt-2 whitespace-pre-line">${esc(p.abstract)}</p></details>` : ""}
            ${p.tags?.length ? `<div class="flex flex-wrap gap-1.5 mt-3">${tagChips(p.tags)}</div>` : ""}
        </div>
        ${actions.trim() ? `<div class="flex flex-wrap gap-2 mt-4 ${layout === "list" ? "md:mt-0 md:flex-col md:items-stretch md:w-32" : ""}">${actions}</div>` : ""}
    </article>`;
}

browsers.publications = createBrowser($("#publications-browser"), {
    key: "publications",
    noun: "publication",
    dateOf: (p) => p.date,
    tagsOf: (p) => p.tags || [],
    textOf: (p) => [p.title, p.abstract, p.venue, p.type, ...(p.authors || []), ...(p.tags || [])].join(" "),
    render: renderPublication,
    empty: "No publications have been posted yet."
});

// ---------- Articles ----------

const PLATFORM_LABEL = (key) => PLATFORMS[key]?.label || key;

function renderArticle(a, layout) {
    const cover = resolveLink(a.coverImage);
    const site = resolveLink(a.siteUrl);
    const primary = resolveLink(a.linkedinUrl) || site || resolveLink(a.primaryUrl);
    const primaryPlatform = a.linkedinUrl ? "linkedin" : site ? "site" : a.primaryPlatform;
    // Known platforms first, in a fixed order, then any other sites.
    const keys = Object.keys(a.crossposts || {}).sort((x, y) => {
        const order = CROSSPOST_PLATFORMS.map((p) => p.key);
        return (order.indexOf(x) + 1 || 99) - (order.indexOf(y) + 1 || 99) || x.localeCompare(y);
    });
    const crossposts = keys.map((key) => {
        const url = resolveLink(a.crossposts[key]);
        const label = PLATFORM_LABEL(key);
        return url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" title="Read on ${esc(label)}">${ICONS[key] || ICONS.external}<span>${esc(label)}</span></a>` : "";
    }).join("");
    return `
    <article class="panel overflow-hidden flex flex-col ${layout === "list" ? "md:flex-row" : ""} hover:border-teal-500/50 transition-colors">
        ${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" class="${layout === "list" ? "md:w-56 h-40 md:h-auto" : "h-40"} w-full object-cover bg-gray-800" onerror="this.remove()">` : ""}
        <div class="p-5 flex flex-col flex-1 min-w-0">
            <time datetime="${esc(a.date || "")}" class="text-xs text-gray-400">${esc(fmtDate(a.date))}</time>
            <h3 class="text-xl font-semibold text-white leading-snug mt-1">${site || primary ? `<a href="${esc(site || primary)}" ${site ? "" : 'target="_blank" rel="noopener noreferrer"'} class="hover:text-teal-300">${esc(a.title)}</a>` : esc(a.title)}</h3>
            ${a.summary ? `<p class="text-sm text-gray-300 mt-2 line-clamp-3">${esc(a.summary)}</p>` : ""}
            ${a.tags?.length ? `<div class="flex flex-wrap gap-1.5 mt-3">${tagChips(a.tags)}</div>` : ""}
            <div class="mt-auto pt-4 space-y-2">
                <div class="flex flex-wrap gap-2">
                    ${site ? `<a href="${esc(site)}" class="btn btn-primary btn-sm"><span>Read here</span></a>` : ""}
                    ${primary && primary !== site ? `<a href="${esc(primary)}" target="_blank" rel="noopener noreferrer" class="btn ${primaryPlatform === "linkedin" ? "btn-blue" : "btn-ghost"} btn-sm">${ICONS[primaryPlatform] || ICONS.external}<span>Read on ${esc(PLATFORM_LABEL(primaryPlatform))}</span></a>` : ""}
                </div>
                ${crossposts ? `<div class="flex flex-wrap items-center gap-2"><span class="text-xs text-gray-400">Also read on</span>${crossposts}</div>` : ""}
            </div>
        </div>
    </article>`;
}

browsers.articles = createBrowser($("#articles-browser"), {
    key: "articles",
    noun: "article",
    dateOf: (a) => a.date,
    tagsOf: (a) => a.tags || [],
    textOf: (a) => [a.title, a.summary, ...(a.tags || []), ...Object.keys(a.crossposts || {}).map(PLATFORM_LABEL)].join(" "),
    render: renderArticle,
    empty: "No articles have been posted yet."
});

// ---------- Stay Current ----------

function curatedToItem(c) {
    const url = resolveLink(c.url);
    return {
        id: `curated-${c.id}`,
        docId: c.id,
        title: c.title || "",
        url,
        summary: c.summary || "",
        authors: c.authors || [],
        published: c.date ? new Date(`${c.date}T12:00:00Z`).toISOString() : null,
        venue: c.venue || "",
        topics: c.topics || [],
        curated: true,
        pinned: !!c.pinned,
        doi: c.doi || "",
        source: {
            name: c.sourceName || hostOf(url) || "Curated",
            homepage: resolveLink(c.sourceUrl) || (url ? new URL(url).origin : ""),
            type: "curated"
        }
    };
}

function scannedItems() {
    return state.live?.items || state.snapshot?.items || [];
}

function allFeedItems() {
    const curated = state.curated.map(curatedToItem);
    return dedupe([...curated, ...scannedItems(), ...state.archive]);
}

function topicFiltered(items) {
    if (!state.topics.size) return items;
    return items.filter((it) => (it.topics || []).some((t) => state.topics.has(t)));
}

function splitFeed(items) {
    const n = state.config?.latestCount || 10;
    const pinned = items.filter((i) => i.pinned);
    const scannedIds = new Set([...scannedItems().map((i) => i.id), ...state.curated.map((c) => `curated-${c.id}`)]);
    // Latest view: pinned curated items, then the newest current items (balanced across topics).
    const candidates = items.filter((i) => !i.pinned && scannedIds.has(i.id));
    const latest = [...pinned, ...selectLatest(candidates, Math.max(0, n - pinned.length), state.config?.balanceTopics !== false)].slice(0, n);
    const latestIds = new Set(latest.map((i) => i.id));
    const archive = items.filter((i) => !latestIds.has(i.id)).sort((a, b) => String(b.published || "").localeCompare(String(a.published || "")));
    return { latest, archive };
}

function renderFeedItem(it, layout) {
    const url = safeUrl(it.url);
    const home = safeUrl(it.source?.homepage);
    const srcName = esc(it.source?.name || "Unknown source");
    return `
    <article class="panel p-4 ${layout === "grid" ? "flex flex-col" : ""} hover:border-teal-500/50 transition-colors">
        <div class="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-1.5">
            <time datetime="${esc(it.published || "")}">${esc(fmtDate(it.published))}</time>
            ${it.venue ? `<span>·</span><span class="truncate max-w-[16rem]">${esc(it.venue)}</span>` : ""}
            ${it.pinned ? `<span class="chip !border-amber-400/50 !text-amber-200 !bg-amber-500/10">Pinned</span>` : ""}
            ${it.curated ? `<span class="chip">Curated</span>` : ""}
        </div>
        <h3 class="text-base md:text-lg font-semibold leading-snug">
            ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="text-white hover:text-teal-300">${esc(it.title)}</a>` : esc(it.title)}
        </h3>
        ${it.authors?.length ? `<p class="text-xs text-gray-400 mt-1">${authorLine(it.authors, 5)}</p>` : ""}
        ${it.summary ? `<p class="text-sm text-gray-300 mt-2 line-clamp-3">${esc(it.summary)}</p>` : ""}
        <div class="flex flex-wrap items-center gap-1.5 mt-3">${tagChips(it.topics)}</div>
        <div class="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-700/60 text-xs ${layout === "grid" ? "mt-auto" : ""}">
            <span class="text-gray-400">Source:
                ${home ? `<a href="${esc(home)}" target="_blank" rel="noopener noreferrer" class="text-teal-300 hover:underline">${srcName}</a>` : `<span class="text-gray-200">${srcName}</span>`}
                ${url ? `<span class="text-gray-500">· ${esc(hostOf(url))}</span>` : ""}
            </span>
            <span class="flex gap-2">
                ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="text-teal-300 hover:underline inline-flex items-center gap-1">Original ${ICONS.external}</a>` : ""}
                ${state.isAdmin && !it.curated ? `<button data-curate="${esc(it.id)}" class="text-amber-300 hover:underline">Curate</button>` : ""}
            </span>
        </div>
    </article>`;
}

browsers.feed = createBrowser($("#feed-browser"), {
    key: "feed",
    noun: "item",
    defaultLayout: "list",
    dateOf: (it) => it.published,
    tagsOf: (it) => it.topics || [],
    textOf: (it) => [it.title, it.summary, it.venue, it.source?.name, ...(it.authors || []), ...(it.topics || [])].join(" "),
    render: renderFeedItem,
    split: splitFeed,
    empty: "No feed items yet. Press “Refresh feed” to scan the sources now.",
    onRender: (root) => root.querySelectorAll("[data-curate]").forEach((b) => b.addEventListener("click", () => curate(b.dataset.curate)))
});

function renderFeedChrome() {
    const scan = state.live || (state.snapshot?.generatedAt ? { scannedAt: state.snapshot.generatedAt, sourceStatus: state.snapshot.sourceStatus || [] } : null);
    const enabled = (state.config?.sources || []).filter((s) => s.enabled);
    const statusById = new Map((scan?.sourceStatus || []).map((s) => [s.id, s]));
    const okCount = (scan?.sourceStatus || []).filter((s) => s.ok).length;

    $("#stat-mode").innerHTML = state.live ? `<span class="text-teal-300">Live</span>` : `<span class="text-blue-300">Snapshot</span>`;
    $("#stat-scan").textContent = scan ? timeAgo(scan.scannedAt) : "never";
    $("#stat-scan").title = scan ? new Date(scan.scannedAt).toLocaleString() : "";
    $("#stat-sources").textContent = scan ? `${okCount} / ${scan.sourceStatus.length}` : `${enabled.length} configured`;
    $("#stat-items").textContent = String(allFeedItems().length);
    $("#refresh-sub").textContent = `Live scan of ${enabled.length} source${enabled.length === 1 ? "" : "s"}`;
    $("#config-origin").textContent = state.configOrigin === "firestore" ? "Settings managed in the Control Panel" : "Default settings";

    $("#source-status").innerHTML = enabled.map((s) => {
        const st = statusById.get(s.id);
        const color = !st ? "bg-gray-500" : st.ok ? (st.error ? "bg-amber-400" : "bg-emerald-400") : "bg-red-500";
        const label = !st ? "not scanned yet" : st.ok ? `${st.count} item${st.count === 1 ? "" : "s"}${st.error ? ` · ${st.error}` : ""}` : `failed: ${st.error}`;
        const home = safeUrl(s.homepage) || SOURCE_TYPES[s.type]?.home;
        return `<li class="flex items-center gap-2 min-w-0"><span class="status-dot ${color}"></span>
            ${home ? `<a href="${esc(home)}" target="_blank" rel="noopener noreferrer" class="text-gray-200 hover:text-teal-300 truncate">${esc(s.name)}</a>` : `<span class="text-gray-200 truncate">${esc(s.name)}</span>`}
            <span class="text-gray-500 text-xs truncate" title="${esc(label)}">${esc(label)}</span></li>`;
    }).join("") || `<li class="text-gray-500">No sources are enabled.</li>`;

    const counts = new Map();
    for (const it of allFeedItems()) for (const t of it.topics || []) counts.set(t, (counts.get(t) || 0) + 1);
    const topicNames = (state.config?.topics || []).filter((t) => t.enabled).map((t) => t.name);
    for (const t of counts.keys()) if (!topicNames.includes(t)) topicNames.push(t);
    $("#topic-chips").innerHTML = topicNames.map((t) => `<button data-topic="${esc(t)}" aria-pressed="${state.topics.has(t)}" class="chip chip-btn hover:border-teal-300">${esc(t)} <span class="opacity-70">${counts.get(t) || 0}</span></button>`).join("");

    const types = new Set(enabled.map((s) => s.type));
    $("#attribution-list").innerHTML = [...types].map((type) => {
        const info = SOURCE_TYPES[type];
        if (type === "rss") {
            return enabled.filter((s) => s.type === "rss").map((s) => `<li><span class="text-gray-100">${esc(s.name)}</span> — <a class="text-teal-300 hover:underline break-all" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.url)}</a></li>`).join("");
        }
        return `<li><a class="text-teal-300 hover:underline" href="${esc(info.home)}" target="_blank" rel="noopener noreferrer">${esc(info.label)}</a> — ${esc(info.attribution)}</li>`;
    }).join("");
}

function refreshFeedViews() {
    renderFeedChrome();
    browsers.feed.setItems(topicFiltered(allFeedItems()));
}

$("#topic-chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-topic]");
    if (!b) return;
    const t = b.dataset.topic;
    state.topics.has(t) ? state.topics.delete(t) : state.topics.add(t);
    refreshFeedViews();
});
$("#topics-clear").addEventListener("click", () => {
    state.topics.clear();
    refreshFeedViews();
});

function setScanning(on) {
    state.scanning = on;
    const btn = $("#refresh-feed");
    btn.disabled = on;
    $("#refresh-icon").innerHTML = `<span class="inline-block ${on ? "spin" : ""}">${ICONS.refresh}</span>`;
    if (on) $("#refresh-sub").textContent = "Scanning sources…";
}

async function refreshFeed() {
    if (state.scanning || !state.config) return;
    setScanning(true);
    try {
        const result = await scanFeed(state.config);
        state.live = result;
        try { sessionStorage.setItem("research-live-scan", JSON.stringify(result)); } catch { /* storage unavailable */ }
        const failed = result.sourceStatus.filter((s) => !s.ok);
        toast(failed.length ? `Scan finished: ${result.items.length} items; ${failed.length} source(s) failed.` : `Scan finished: ${result.items.length} items from ${result.sourceStatus.length} sources.`, failed.length ? "error" : "success");
    } catch (e) {
        toast(`Scan failed: ${e.message}`, "error");
    } finally {
        setScanning(false);
        refreshFeedViews();
    }
}
$("#refresh-feed").addEventListener("click", refreshFeed);

async function curate(id) {
    const it = allFeedItems().find((x) => x.id === id);
    if (!it || !state.isAdmin) return;
    try {
        await saveItem("feedItems", null, {
            title: it.title,
            url: it.url,
            summary: it.summary,
            authors: it.authors,
            date: (it.published || "").slice(0, 10),
            venue: it.venue,
            doi: it.doi || "",
            topics: it.topics,
            sourceName: it.source?.name || "",
            sourceUrl: it.source?.homepage || "",
            pinned: false,
            status: "published"
        }, state.user);
        state.curated = (await loadPublished("feedItems")).items;
        refreshFeedViews();
        toast("Added to the curated feed.", "success");
    } catch (e) {
        toast(`Could not curate: ${e.message}`, "error");
    }
}

// ---------- Article sync ----------

const articleState = { manual: [], synced: [], config: null, scan: null, scanning: false };

// Studio-written articles have a page on this site; give the grouping an absolute URL for it.
const withSiteUrl = (a) => (a.siteUrl || (a.source === "studio" && a.slug) ? { ...a, siteUrl: resolveLink(a.siteUrl || `Pages/Research/read.html?kind=articles&slug=${encodeURIComponent(a.slug)}`) } : a);

function refreshArticles() {
    const { articles } = groupArticles(articleState.manual.map(withSiteUrl), articleState.synced, articleState.config);
    browsers.articles.setItems(articles);
    const scan = articleState.scan;
    const statusById = new Map((scan?.sourceStatus || []).map((s) => [s.id, s]));
    $("#article-sources").innerHTML = (articleState.config?.sources || []).filter((s) => s.enabled).map((s) => {
        const st = statusById.get(s.id);
        const color = !st ? "bg-gray-500" : st.ok ? "bg-emerald-400" : "bg-red-500";
        const url = safeUrl(s.url);
        const title = !st ? "Not checked yet" : st.ok ? `${st.count} post(s) found` : st.error;
        return `<li class="flex items-center gap-2" title="${esc(title)}"><span class="status-dot ${color}"></span>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="text-gray-200 hover:text-teal-300">${esc(s.name)}</a>` : esc(s.name)}</li>`;
    }).join("");
    $("#article-sync-time").textContent = scan?.scannedAt ? `Last checked ${timeAgo(scan.scannedAt)}` : "";
}

async function checkArticles() {
    if (articleState.scanning || !articleState.config) return;
    articleState.scanning = true;
    $("#refresh-articles").disabled = true;
    $("#refresh-articles-icon").innerHTML = `<span class="inline-block spin">${ICONS.refresh}</span>`;
    try {
        const result = await syncArticles(articleState.config);
        articleState.scan = result;
        articleState.synced = mergeArticleItems(articleState.synced, result.items);
        const failed = result.sourceStatus.filter((s) => !s.ok).length;
        toast(failed ? `Checked: ${result.items.length} posts found; ${failed} site(s) could not be read.` : `Checked: ${result.items.length} posts found.`, failed ? "error" : "success");
    } catch (e) {
        toast(`Check failed: ${e.message}`, "error");
    } finally {
        articleState.scanning = false;
        $("#refresh-articles").disabled = false;
        $("#refresh-articles-icon").innerHTML = ICONS.refresh;
        refreshArticles();
    }
}
$("#refresh-articles").addEventListener("click", checkArticles);
$("#refresh-articles-icon").innerHTML = ICONS.refresh;

// ---------- Auth ----------

$("#login-btn").addEventListener("click", () => signInWithGoogle().catch((e) => toast(`Login failed: ${e.message}`, "error")));
$("#logout-btn").addEventListener("click", () => signOut(auth));

function applyTopicPrefs(prefs) {
    if (Array.isArray(prefs) && prefs.length && !state.topics.size) prefs.forEach((t) => state.topics.add(t));
}

onAuthStateChanged(auth, async (user) => {
    state.user = user;
    const guest = loadGuest();
    $("#login-btn").classList.toggle("hidden", !!user);
    $("#guest-identity").classList.toggle("hidden", !!user);
    $("#guest-identity").classList.toggle("md:inline", !user);
    $("#guest-identity").textContent = guest?.username ? `${guest.username} · Guest Observer` : "Guest Observer";
    $("#user-profile").classList.toggle("hidden", !user);
    $("#user-profile").classList.toggle("flex", !!user);
    $("#user-email").textContent = user ? sessionEmail(user) : "";
    state.isAdmin = await checkIsAdmin(user);
    $("#admin-bar").classList.toggle("hidden", !state.isAdmin);
    if (user) {
        try {
            const snap = await getDoc(doc(db, "users", user.uid));
            const data = snap.exists() ? snap.data() : {};
            if (data.username) $("#user-email").textContent = `${data.username}${state.isAdmin ? " · Admin" : ""}`;
            applyTopicPrefs(data.preferences?.feedTopics);
        } catch { /* preferences are optional */ }
    } else {
        applyTopicPrefs(guest?.preferences?.feedTopics);
    }
    if (state.config) refreshFeedViews();
});

// ---------- Load ----------

routeFromHash();
try {
    const saved = JSON.parse(sessionStorage.getItem("research-live-scan") || "null");
    if (saved?.items) state.live = saved;
} catch { /* storage unavailable */ }

const dataUrl = (f) => `${SITE_ROOT}Pages/Research/data/${f}`;
const [pubs, arts, curated, cfg, snapshot, archive, articleCfg, articleFeed] = await Promise.all([
    loadPublished("publications"),
    loadPublished("articles"),
    loadPublished("feedItems"),
    loadFeedConfig(),
    fetchJson(dataUrl("feed.json")).catch(() => null),
    fetchJson(dataUrl("feed-archive.json")).catch(() => null),
    loadArticleSyncConfig(),
    fetchJson(dataUrl("articles-feed.json")).catch(() => null)
]);

browsers.publications.setItems(pubs.items);
articleState.manual = arts.items;
articleState.config = articleCfg.config;
articleState.synced = articleFeed?.items || [];
articleState.scan = articleFeed?.generatedAt ? { scannedAt: articleFeed.generatedAt, sourceStatus: articleFeed.sourceStatus || [] } : null;
refreshArticles();
state.curated = curated.items;
state.config = cfg.config;
state.configOrigin = cfg.origin;
state.snapshot = snapshot;
state.archive = archive?.items || [];
refreshFeedViews();
routeFromHash();

// No snapshot and no live scan in this session: scan automatically once.
if (!state.live && !(state.snapshot?.items?.length)) refreshFeed();
