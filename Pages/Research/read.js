// Reader for Studio articles and publications: Firestore first, then the GitHub archive copy
// (content/<kind>/index.json + the piece's index.md), so pieces stay readable either way.
import { startBackground } from "../../assets/js/background.js";
import { loadPublishedBySlug } from "../../assets/js/research-store.js";
import { renderMarkdown, readingMinutes, parseFrontMatter } from "../../assets/js/markdown.js";
import { $, esc, fmtDate, resolveLink, fetchJson, SITE_ROOT, ICONS, CROSSPOST_PLATFORMS } from "../../assets/js/ui.js";

startBackground();

const params = new URLSearchParams(location.search);
const kind = params.get("kind") === "publications" ? "publications" : "articles";
const slug = params.get("slug") || "";
const isArticle = kind === "articles";
$("#back-link").href = `index.html#${kind}`;

async function fromArchive() {
    const manifest = await fetchJson(`${SITE_ROOT}content/${kind}/index.json`);
    const entry = (manifest.items || []).find((x) => x.slug === slug && x.status === "published");
    if (!entry) return null;
    const res = await fetch(SITE_ROOT + entry.path, { cache: "no-cache" });
    if (!res.ok) return null;
    const { meta, body } = parseFrontMatter(await res.text());
    return { ...entry, ...meta, body };
}

async function load() {
    try {
        const d = await loadPublishedBySlug(kind, slug);
        if (d?.body) return d;
    } catch (e) {
        console.warn("Firestore unavailable, using the archive copy:", e.message);
    }
    try {
        return await fromArchive();
    } catch {
        return null;
    }
}

const linkBtn = (url, label, icon, cls = "btn-ghost") => {
    const u = resolveLink(url);
    return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" class="btn ${cls} btn-sm">${icon || ""}<span>${esc(label)}</span></a>` : "";
};

function render(d) {
    document.title = `${d.title} - Ebayednoob Research`;
    document.querySelector('meta[name="description"]').content = d.summary || d.abstract || d.subtitle || d.title;
    const cover = resolveLink(d.coverImage);
    const authors = isArticle ? "" : (d.authors || []).join(", ");
    const elsewhere = isArticle ? [
        linkBtn(d.linkedinUrl, "LinkedIn", ICONS.linkedin, "btn-blue"),
        ...CROSSPOST_PLATFORMS.map((p) => linkBtn(d.crossposts?.[p.key], p.label, ICONS[p.key]))
    ].join("") : [
        linkBtn(d.pdfUrl, "Download PDF", ICONS.external, "btn-primary"),
        d.doi ? linkBtn(`https://doi.org/${d.doi}`, `DOI: ${d.doi}`, ICONS.external) : ""
    ].join("");
    $("#reader").innerHTML = `
        ${cover ? `<img src="${esc(cover)}" alt="" class="w-full max-h-96 object-cover rounded-xl mb-8" onerror="this.remove()">` : ""}
        <div class="flex flex-wrap items-center gap-2 text-sm text-gray-400 mb-3">
            ${!isArticle && d.type ? `<span class="uppercase tracking-wide text-blue-300 font-semibold text-xs">${esc(d.type)}</span><span>·</span>` : ""}
            <time datetime="${esc(d.date || "")}">${esc(fmtDate(d.date, { dateStyle: "long" }))}</time>
            <span>·</span><span>${readingMinutes(d.body)} min read</span>
            ${d.venue ? `<span>·</span><span>${esc(d.venue)}</span>` : ""}
        </div>
        <h1 class="reader-title">${esc(d.title)}</h1>
        ${d.subtitle ? `<p class="reader-subtitle">${esc(d.subtitle)}</p>` : ""}
        ${authors ? `<p class="text-gray-300 mt-4">${esc(authors)}</p>` : ""}
        ${d.tags?.length ? `<div class="flex flex-wrap gap-1.5 mt-4">${d.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>` : ""}
        ${elsewhere.trim() ? `<div class="flex flex-wrap items-center gap-2 mt-6"><span class="text-xs text-gray-400">${isArticle ? "Also on" : "Resources"}</span>${elsewhere}</div>` : ""}
        ${!isArticle && d.abstract ? `<section class="panel p-5 mt-8"><h2 class="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">Abstract</h2><p class="text-gray-200 leading-relaxed whitespace-pre-line">${esc(d.abstract)}</p></section>` : ""}
        <div class="prose-reader mt-10">${renderMarkdown(d.body)}</div>
        <footer class="mt-12 pt-6 border-t border-gray-700/60 text-sm text-gray-400 flex flex-wrap justify-between gap-3">
            <a href="index.html#${kind}" class="text-teal-300 hover:underline">← More ${isArticle ? "articles" : "publications"}</a>
            <span>Archived in the <a class="text-teal-300 hover:underline" href="https://github.com/BioChainAI/Ebayednoob/tree/main/content/${kind}" target="_blank" rel="noopener noreferrer">site repository</a></span>
        </footer>`;
}

const d = slug ? await load() : null;
if (d) render(d);
else $("#reader").innerHTML = `<h1 class="text-2xl font-semibold text-center">Not found</h1><p class="text-gray-400 text-center mt-2">This ${isArticle ? "article" : "publication"} does not exist or is not published.</p><p class="text-center mt-4"><a class="text-teal-300 hover:underline" href="index.html#${kind}">Back to Our Research</a></p>`;
