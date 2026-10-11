// Article Studio / Publication Studio: write, archive and publish long-form pieces.
//   - Drafts and published pieces live in Firestore (`articles` / `publications`), so they show
//     up on the Research hub immediately.
//   - Publishing also commits the piece to the repository under content/<kind>/<year>/<slug>/
//     plus a manifest (content/<kind>/index.json): a permanent archive kept with the site.
// The page is only usable by admins; firestore.rules enforce that for every write.
import { auth, onAuthStateChanged, getAdminStatus } from "../assets/js/firebase.js";
import { loadAll, saveItem, deleteItem, loadArticleSyncConfig } from "../assets/js/research-store.js";
import { renderMarkdown, plainText, wordCount, readingMinutes, toFrontMatter } from "../assets/js/markdown.js";
import { loadGitHubSettings, saveGitHubSettings, isConnected, testConnection, putText, putFile, bytesToBase64, updateJson, rawUrl } from "../assets/js/github-store.js";
import { slugify, toList } from "../assets/js/feed-core.js";
import { $, $$, esc, fmtDate, timeAgo, toast, resolveLink, SITE_ROOT, CROSSPOST_PLATFORMS } from "../assets/js/ui.js";

const KIND = document.body.dataset.kind === "publications" ? "publications" : "articles";
const IS_ARTICLE = KIND === "articles";
const NOUN = IS_ARTICLE ? "article" : "publication";
const SUMMARY_KEY = IS_ARTICLE ? "summary" : "abstract";
const PUB_TYPES = ["Paper", "Preprint", "Report", "Simulation", "Dataset", "Talk", "Other"];

const state = {
    user: null,
    items: [],
    doc: blankDoc(),
    dirty: false,
    saving: false,
    slugEdited: false,
    filter: "all",
    q: "",
    lastSavedAt: null,
    substackOrigin: "https://biochainai.substack.com"
};

function blankDoc() {
    return {
        id: null, title: "", subtitle: "", slug: "", body: "", [SUMMARY_KEY]: "", tags: [], coverImage: "",
        date: new Date().toISOString().slice(0, 10), status: "draft",
        ...(IS_ARTICLE ? { linkedinUrl: "", crossposts: {} } : { authors: [], type: "Paper", venue: "", doi: "", pdfUrl: "" })
    };
}

const toMillis = (v) => (v?.toMillis ? v.toMillis() : v ? new Date(v).getTime() : 0);
const readerPath = (slug) => `Pages/Research/read.html?kind=${KIND}&slug=${encodeURIComponent(slug)}`;
const readerUrl = (slug) => SITE_ROOT + readerPath(slug);
const repoDir = (d) => `content/${KIND}/${(d.date || new Date().toISOString()).slice(0, 4)}/${d.slug}`;

// Site-relative paths under content/ may not be deployed yet: preview them from GitHub directly.
const previewResolve = (src) => (/^content\//.test(src || "") && isConnected() ? rawUrl(src) : resolveLink(src));

// ---------- Access gate ----------

onAuthStateChanged(auth, async (user) => {
    state.user = user;
    if (!user) {
        $("#st-gate-msg").textContent = "Sign in on the Control Panel first. This page is for site admins.";
        return;
    }
    const status = await getAdminStatus(user);
    if (!status.isAdmin) {
        $("#st-gate-msg").textContent = "This page is only available to site admins.";
        return;
    }
    $("#st-gate").classList.add("hidden");
    $("#st-app").classList.remove("hidden");
    try {
        const { config } = await loadArticleSyncConfig();
        const sub = config.sources.find((s) => s.platform === "substack" && s.url);
        if (sub) state.substackOrigin = new URL(sub.url).origin;
    } catch { /* keep default */ }
    await reloadItems();
    const wanted = new URLSearchParams(location.search).get("id");
    const found = state.items.find((x) => x.id === wanted);
    if (found) openDoc(found);
    else restoreBackupOrNew();
    setMode(localStore("studio-mode") || "split");
});

// ---------- Archive ----------

async function reloadItems() {
    state.items = await loadAll(KIND);
    renderArchive();
}

function renderArchive() {
    const q = state.q.toLowerCase();
    const list = state.items
        .filter((x) => state.filter === "all" || (x.status || "draft") === state.filter)
        .filter((x) => !q || `${x.title} ${x.subtitle || ""} ${(x.tags || []).join(" ")} ${x.body || ""}`.toLowerCase().includes(q))
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || toMillis(b.updatedAt) - toMillis(a.updatedAt));
    const groups = new Map();
    for (const it of list) {
        const y = (it.date || "").slice(0, 4) || "Undated";
        if (!groups.has(y)) groups.set(y, []);
        groups.get(y).push(it);
    }
    $("#st-archive-list").innerHTML = list.length ? [...groups].map(([y, items]) => `
        <div class="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wider text-gray-500">${esc(y)} · ${items.length}</div>
        ${items.map((it) => `
            <button data-open="${esc(it.id)}" aria-current="${it.id === state.doc.id}" class="arch-item w-full text-left px-3 py-2 rounded-lg border border-transparent hover:bg-gray-800/70">
                <div class="text-sm text-gray-100 line-clamp-3">${esc(it.title || "(untitled)")}</div>
                <div class="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                    <span class="${it.status === "published" ? "text-emerald-300" : "text-amber-300"}">${it.status === "published" ? "Published" : "Draft"}</span>
                    <span>${esc(fmtDate(it.date))}</span>
                    ${it.github?.path ? `<span class="text-teal-300" title="Archived on GitHub">GitHub ✓</span>` : ""}
                    ${it.source !== "studio" && !it.body ? `<span title="Created outside the Studio">form</span>` : ""}
                </div>
            </button>`).join("")}`).join("")
        : `<p class="text-sm text-gray-500 p-3">${state.items.length ? "No matches." : `No ${NOUN}s yet. Start writing!`}</p>`;
    const s = loadGitHubSettings();
    $("#st-repo-link").href = `https://github.com/${s.owner}/${s.repo}/tree/${s.branch}/content/${KIND}`;
}

$("#st-archive-list").addEventListener("click", async (e) => {
    const id = e.target.closest("[data-open]")?.dataset.open;
    if (!id || id === state.doc.id) return;
    if (state.dirty) await saveDraft({ quiet: true });
    const it = state.items.find((x) => x.id === id);
    if (it) openDoc(it);
    if (window.innerWidth < 1024) $("#st-archive").classList.add("hidden");
});
$("#st-search").addEventListener("input", (e) => { state.q = e.target.value; renderArchive(); });
$$("[data-filter]").forEach((b) => b.addEventListener("click", () => {
    state.filter = b.dataset.filter;
    $$("[data-filter]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    renderArchive();
}));
$('[data-filter="all"]').setAttribute("aria-pressed", "true");
$("#st-new").addEventListener("click", async () => {
    if (state.dirty) await saveDraft({ quiet: true });
    openDoc(blankDoc());
});
$("#st-toggle-archive").addEventListener("click", () => {
    const a = $("#st-archive");
    a.classList.toggle("hidden");
    a.classList.toggle("fixed");
    a.classList.toggle("inset-y-0");
    a.classList.toggle("left-0");
    a.classList.toggle("z-50");
    a.classList.toggle("flex");
});

// ---------- Editor ----------

function localStore(key, value) {
    try {
        if (value === undefined) return localStorage.getItem(key);
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
    } catch {
        return null;
    }
}
const backupKey = () => `studio-backup:${KIND}:${state.doc.id || "new"}`;

function restoreBackupOrNew() {
    openDoc(blankDoc());
    const raw = localStore(`studio-backup:${KIND}:new`);
    if (!raw) return;
    try {
        const b = JSON.parse(raw);
        if (b.title || b.body) {
            if (confirm(`Restore the unsaved ${NOUN} “${b.title || "(untitled)"}” from this browser?`)) openDoc({ ...blankDoc(), ...b, id: null });
            else localStore(`studio-backup:${KIND}:new`, null);
        }
    } catch { /* ignore broken backup */ }
}

function openDoc(d) {
    state.doc = { ...blankDoc(), ...structuredClone(stripTimestamps(d)) };
    state.slugEdited = !!d.slug && d.slug !== slugify(d.title || "");
    state.dirty = false;
    $("#st-title").value = state.doc.title;
    $("#st-subtitle").value = state.doc.subtitle || "";
    $("#st-body").value = state.doc.body || "";
    renderDetails();
    renderArchive();
    refreshPreview();
    autoGrow();
    updateSaveState();
    const url = new URL(location.href);
    if (state.doc.id) url.searchParams.set("id", state.doc.id); else url.searchParams.delete("id");
    history.replaceState(null, "", url);
}

function stripTimestamps(d) {
    const out = {};
    for (const [k, v] of Object.entries(d)) out[k] = v?.toDate ? v.toDate().toISOString() : v;
    return out;
}

function autoGrow() {
    const ta = $("#st-body");
    ta.style.height = "auto";
    ta.style.height = `${Math.max(ta.scrollHeight, window.innerHeight * 0.6)}px`;
}

function markDirty() {
    state.dirty = true;
    updateSaveState();
    localStore(backupKey(), JSON.stringify(collectDoc()));
    clearTimeout(markDirty.t);
    markDirty.t = setTimeout(() => saveDraft({ quiet: true, auto: true }), 5000);
}

function updateSaveState() {
    const el = $("#st-save-state");
    if (state.saving) el.textContent = "Saving…";
    else if (state.dirty) el.textContent = "Unsaved changes";
    else if (state.lastSavedAt) el.textContent = `Saved ${timeAgo(state.lastSavedAt)}`;
    else el.textContent = state.doc.id ? "" : "New, not saved yet";
    const body = $("#st-body").value;
    $("#st-count").textContent = `${wordCount(body)} words · ${readingMinutes(body)} min read`;
    $("#st-slug-info").textContent = state.doc.status === "published" ? `Live: ${readerPath(state.doc.slug)}` : "Draft";
}
setInterval(updateSaveState, 30000);

$("#st-title").addEventListener("input", (e) => {
    state.doc.title = e.target.value;
    if (!state.slugEdited) {
        state.doc.slug = slugify(state.doc.title);
        const slugInput = $("#d-slug");
        if (slugInput) slugInput.value = state.doc.slug;
    }
    refreshPreview();
    markDirty();
});
$("#st-subtitle").addEventListener("input", (e) => { state.doc.subtitle = e.target.value; refreshPreview(); markDirty(); });
$("#st-body").addEventListener("input", () => { autoGrow(); refreshPreview(); markDirty(); });

window.addEventListener("beforeunload", (e) => {
    if (state.dirty) {
        e.preventDefault();
        e.returnValue = "";
    }
});

// ---------- Formatting toolbar ----------

function surround(before, after = before, placeholder = "text") {
    const ta = $("#st-body");
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || placeholder;
    ta.setRangeText(before + sel + after, s, e, "end");
    ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    ta.focus();
    ta.dispatchEvent(new Event("input"));
}

function prefixLines(prefix) {
    const ta = $("#st-body");
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    const block = value.slice(start, e) || "";
    const lines = block.split("\n").map((l, i) => (typeof prefix === "function" ? prefix(i) : prefix) + l.replace(/^(#{1,6} |> |- |\d+\. )/, ""));
    ta.setRangeText(lines.join("\n"), start, e, "end");
    ta.focus();
    ta.dispatchEvent(new Event("input"));
}

function insertBlock(text) {
    const ta = $("#st-body");
    const { selectionStart: s, value } = ta;
    const pre = s && value[s - 1] !== "\n" ? "\n\n" : "";
    ta.setRangeText(`${pre}${text}\n`, s, ta.selectionEnd, "end");
    ta.focus();
    ta.dispatchEvent(new Event("input"));
}

const FORMATS = {
    h2: () => prefixLines("## "),
    h3: () => prefixLines("### "),
    bold: () => surround("**"),
    italic: () => surround("_"),
    strike: () => surround("~~"),
    code: () => surround("`", "`", "code"),
    codeblock: () => surround("\n```\n", "\n```\n", "code"),
    quote: () => prefixLines("> "),
    ul: () => prefixLines("- "),
    ol: () => prefixLines((i) => `${i + 1}. `),
    hr: () => insertBlock("\n---\n"),
    math: () => surround("\n$$\n", "\n$$\n", "E = mc^2"),
    table: () => insertBlock("| Column | Column |\n| --- | --- |\n| Value | Value |"),
    link: () => {
        const url = prompt("Link URL (https://…)");
        if (url) surround("[", `](${url.trim()})`, "link text");
    },
    image: () => pickFile("image/*", insertImageFile, () => {
        const url = prompt("Image URL (https://…)");
        if (url) insertBlock(`![](${url.trim()})`);
    })
};
$("#st-toolbar").addEventListener("click", (e) => {
    const f = e.target.closest("[data-fmt]")?.dataset.fmt;
    if (f) FORMATS[f]();
});
$("#st-body").addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const map = { b: "bold", i: "italic", k: "link", s: null };
    const key = e.key.toLowerCase();
    if (key === "s") {
        e.preventDefault();
        saveDraft();
    } else if (map[key]) {
        e.preventDefault();
        FORMATS[map[key]]();
    }
});

// ---------- Uploads (committed to the repository next to the piece) ----------

function pickFile(accept, onFile, fallback) {
    if (!isConnected()) {
        if (fallback) fallback();
        else toast("Connect GitHub (button in the top bar) to upload files, or paste a URL.", "error");
        return;
    }
    const input = $("#st-file");
    input.accept = accept;
    input.value = "";
    input.onchange = () => input.files[0] && onFile(input.files[0]);
    input.click();
}

async function uploadToRepo(file, subdir = "media") {
    if (!state.doc.slug) throw new Error("Give the piece a title first (it names the folder).");
    if (file.size > 20 * 1024 * 1024) throw new Error("Files over 20 MB are too large for the archive.");
    const name = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const path = `${repoDir(state.doc)}/${subdir ? `${subdir}/` : ""}${name}`;
    toast(`Uploading ${file.name}…`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    await putFile(path, bytesToBase64(bytes), `${IS_ARTICLE ? "Article" : "Publication"} media: ${state.doc.title || state.doc.slug}`);
    return path;
}

async function insertImageFile(file) {
    try {
        const path = await uploadToRepo(file);
        insertBlock(`![${file.name.replace(/\.[^.]+$/, "")}](${path})`);
        toast("Image uploaded to the repository.", "success");
    } catch (e) {
        toast(`Upload failed: ${e.message}`, "error");
    }
}

$("#st-body").addEventListener("paste", (e) => {
    const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
    if (file && isConnected()) {
        e.preventDefault();
        insertImageFile(file);
    }
});
$("#st-body").addEventListener("drop", (e) => {
    const file = [...(e.dataTransfer?.files || [])].find((f) => f.type.startsWith("image/"));
    if (file && isConnected()) {
        e.preventDefault();
        insertImageFile(file);
    }
});

// ---------- Preview & modes ----------

function refreshPreview() {
    clearTimeout(refreshPreview.t);
    refreshPreview.t = setTimeout(() => {
        const cover = previewResolve(state.doc.coverImage);
        $("#pv-cover").classList.toggle("hidden", !cover);
        if (cover) $("#pv-cover").src = cover;
        $("#pv-title").textContent = state.doc.title || "Untitled";
        $("#pv-subtitle").textContent = state.doc.subtitle || "";
        $("#pv-body").innerHTML = renderMarkdown($("#st-body").value, { resolve: previewResolve });
    }, 150);
}

function setMode(mode) {
    if (mode === "split" && window.innerWidth < 768) mode = "write";
    $$("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    $("#st-write-pane").classList.toggle("hidden", mode === "preview");
    $("#st-preview-pane").classList.toggle("hidden", mode === "write");
    localStore("studio-mode", mode);
    refreshPreview();
}
$$("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

// ---------- Details panel ----------

function detailsToggleButton() {
    if ($("#st-toggle-details")) return;
    const b = document.createElement("button");
    b.id = "st-toggle-details";
    b.className = "btn btn-ghost btn-sm xl:hidden";
    b.textContent = "Details";
    b.onclick = () => {
        const d = $("#st-details");
        const open = d.classList.contains("hidden");
        d.classList.toggle("hidden", !open);
        d.classList.toggle("fixed", open);
        d.classList.toggle("inset-y-0", open);
        d.classList.toggle("right-0", open);
        d.classList.toggle("z-50", open);
    };
    $("#st-save").before(b);
}
detailsToggleButton();

const field = (id, label, value, attrs = "") => `<div><label class="lbl" for="${id}">${label}</label><input id="${id}" class="field !py-1.5 text-sm" value="${esc(value ?? "")}" ${attrs}></div>`;

function renderDetails() {
    const d = state.doc;
    const gh = d.github;
    const crosspostFields = IS_ARTICLE ? `
        <section class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-200">Cross-posts</h3>
            ${field("d-linkedinUrl", "LinkedIn article URL", d.linkedinUrl, 'placeholder="https://www.linkedin.com/pulse/…"')}
            ${CROSSPOST_PLATFORMS.map((p) => field(`d-cp-${p.key}`, `${p.label} URL`, d.crossposts?.[p.key])).join("")}
            <p class="text-xs text-gray-500">On the Articles page this piece shows once, with buttons for every site it is posted on.</p>
        </section>
        <section class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-200">Publish elsewhere</h3>
            <p class="text-xs text-gray-500">Copy the formatted piece, then paste it into each editor. Paste the resulting link above.</p>
            <div class="grid grid-cols-2 gap-2">
                <button data-copy="rich" class="btn btn-ghost btn-sm">Copy formatted</button>
                <button data-copy="markdown" class="btn btn-ghost btn-sm">Copy Markdown</button>
                <button data-copy="post" class="btn btn-ghost btn-sm">Copy post text</button>
                <button data-copy="link" class="btn btn-ghost btn-sm">Copy site link</button>
            </div>
            <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <a class="text-teal-300 hover:underline" target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/article/new/">LinkedIn editor ↗</a>
                <a class="text-teal-300 hover:underline" target="_blank" rel="noopener noreferrer" href="${esc(state.substackOrigin)}/publish/post">Substack editor ↗</a>
                <a class="text-teal-300 hover:underline" target="_blank" rel="noopener noreferrer" href="https://x.com/compose/articles">X Articles ↗</a>
                <a class="text-teal-300 hover:underline" target="_blank" rel="noopener noreferrer" href="https://medium.com/p/import">Medium import ↗</a>
            </div>
        </section>` : `
        <section class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-200">Publication details</h3>
            ${field("d-authors", "Authors (comma separated)", (d.authors || []).join(", "))}
            <div><label class="lbl" for="d-type">Type</label><select id="d-type" class="field !py-1.5 text-sm">${PUB_TYPES.map((t) => `<option ${t === d.type ? "selected" : ""}>${t}</option>`).join("")}</select></div>
            ${field("d-venue", "Venue / publisher", d.venue)}
            ${field("d-doi", "DOI", d.doi, 'placeholder="10.1234/abcd"')}
            ${field("d-pdfUrl", "PDF (URL or site path)", d.pdfUrl)}
            <button id="d-pdf-upload" class="btn btn-ghost btn-sm">Upload PDF to archive</button>
        </section>
        <section class="space-y-2">
            <h3 class="text-sm font-semibold text-gray-200">Share &amp; cite</h3>
            <div class="grid grid-cols-2 gap-2">
                <button data-copy="cite" class="btn btn-ghost btn-sm">Copy citation</button>
                <button data-copy="bibtex" class="btn btn-ghost btn-sm">Copy BibTeX</button>
                <button data-copy="rich" class="btn btn-ghost btn-sm">Copy formatted</button>
                <button data-copy="link" class="btn btn-ghost btn-sm">Copy site link</button>
            </div>
        </section>`;
    $("#st-details").innerHTML = `
        <section class="space-y-2">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-gray-200">Details</h3>
                <span class="chip ${d.status === "published" ? "" : "!text-amber-200 !border-amber-400/50 !bg-amber-500/10"}">${d.status === "published" ? "Published" : "Draft"}</span>
            </div>
            ${field("d-slug", "URL slug", d.slug)}
            ${field("d-date", "Publication date", d.date, 'type="date"')}
            ${field("d-tags", "Tags (comma separated)", (d.tags || []).join(", "))}
            <div><label class="lbl" for="d-summary">${IS_ARTICLE ? "Summary" : "Abstract"}</label><textarea id="d-summary" rows="${IS_ARTICLE ? 3 : 6}" class="field !py-1.5 text-sm">${esc(d[SUMMARY_KEY] || "")}</textarea><button id="d-summary-auto" class="text-xs text-teal-300 hover:underline">Fill from the opening paragraph</button></div>
            ${field("d-cover", "Cover image (URL or site path)", d.coverImage)}
            <button id="d-cover-upload" class="btn btn-ghost btn-sm">Upload cover image</button>
        </section>
        ${crosspostFields}
        <section class="space-y-2 border-t border-gray-800 pt-4">
            <h3 class="text-sm font-semibold text-gray-200">GitHub archive</h3>
            ${gh?.path ? `<p class="text-xs text-gray-400">Archived at <a class="text-teal-300 hover:underline break-all" target="_blank" rel="noopener noreferrer" href="${esc(gh.htmlUrl || "#")}">${esc(gh.path)}</a> ${gh.committedAt ? `· ${esc(timeAgo(gh.committedAt))}` : ""}${gh.commitUrl ? ` · <a class="text-teal-300 hover:underline" target="_blank" rel="noopener noreferrer" href="${esc(gh.commitUrl)}">commit</a>` : ""}</p>` : `<p class="text-xs text-gray-400">Not archived yet. Publishing commits it to <code>content/${KIND}/</code>.</p>`}
            ${!isConnected() ? `<p class="text-xs text-amber-300">GitHub is not connected in this browser.</p>` : ""}
            ${d.status === "published" ? `<button id="d-commit" class="btn btn-ghost btn-sm" ${isConnected() ? "" : "disabled"}>Commit latest version</button>` : ""}
        </section>
        <section class="space-y-2 border-t border-gray-800 pt-4">
            ${d.status === "published" ? `<a class="btn btn-ghost btn-sm w-full" target="_blank" rel="noopener noreferrer" href="${esc(readerUrl(d.slug))}">View on the site ↗</a><button id="d-unpublish" class="btn btn-ghost btn-sm w-full">Unpublish (back to draft)</button>` : ""}
            ${d.id ? `<button id="d-delete" class="btn btn-danger btn-sm w-full">Delete</button>` : ""}
        </section>`;
}

// Details inputs write straight into state.doc.
$("#st-details").addEventListener("input", (e) => {
    const t = e.target;
    const d = state.doc;
    const v = t.value;
    switch (t.id) {
        case "d-slug": d.slug = slugify(v); state.slugEdited = true; break;
        case "d-date": d.date = v; break;
        case "d-tags": d.tags = toList(v); break;
        case "d-summary": d[SUMMARY_KEY] = v; break;
        case "d-cover": d.coverImage = v.trim(); refreshPreview(); break;
        case "d-linkedinUrl": d.linkedinUrl = v.trim(); break;
        case "d-authors": d.authors = toList(v); break;
        case "d-type": d.type = v; break;
        case "d-venue": d.venue = v; break;
        case "d-doi": d.doi = v.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""); break;
        case "d-pdfUrl": d.pdfUrl = v.trim(); break;
        default:
            if (t.id.startsWith("d-cp-")) d.crossposts = { ...d.crossposts, [t.id.slice(5)]: v.trim() };
            else return;
    }
    markDirty();
});
$("#st-details").addEventListener("change", (e) => { if (e.target.id === "d-type") { state.doc.type = e.target.value; markDirty(); } });
$("#st-details").addEventListener("click", async (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.copy) return copyAs(t.dataset.copy);
    switch (t.id) {
        case "d-summary-auto": {
            const para = $("#st-body").value.split(/\n\s*\n/).map(plainText).find((p) => p.length > 40) || "";
            state.doc[SUMMARY_KEY] = para.length > 400 ? `${para.slice(0, 397).replace(/\s+\S*$/, "")}…` : para;
            $("#d-summary").value = state.doc[SUMMARY_KEY];
            markDirty();
            break;
        }
        case "d-cover-upload":
            pickFile("image/*", async (file) => {
                try {
                    state.doc.coverImage = await uploadToRepo(file, "");
                    renderDetails();
                    refreshPreview();
                    markDirty();
                } catch (err) { toast(`Upload failed: ${err.message}`, "error"); }
            });
            break;
        case "d-pdf-upload":
            pickFile("application/pdf", async (file) => {
                try {
                    state.doc.pdfUrl = await uploadToRepo(file, "");
                    renderDetails();
                    markDirty();
                    toast("PDF uploaded to the repository.", "success");
                } catch (err) { toast(`Upload failed: ${err.message}`, "error"); }
            });
            break;
        case "d-commit":
            await commitToGitHub(state.doc);
            break;
        case "d-unpublish":
            if (confirm("Move this back to drafts? It disappears from the site; the GitHub archive copy is kept and marked as a draft.")) {
                state.doc.status = "draft";
                await saveDraft();
                if (isConnected() && state.doc.github?.path) await updateManifest([state.doc]).catch(() => {});
            }
            break;
        case "d-delete":
            if (!confirm(`Delete “${state.doc.title || "this draft"}” permanently from the site? Any GitHub archive copy is kept and marked as withdrawn.`)) return;
            try {
                await deleteItem(KIND, state.doc.id);
                if (isConnected() && state.doc.github?.path) await updateManifest([{ ...state.doc, status: "withdrawn" }]).catch(() => {});
                localStore(backupKey(), null);
                toast("Deleted.", "success");
                await reloadItems();
                openDoc(blankDoc());
            } catch (err) { toast(err.message, "error"); }
            break;
    }
});

// ---------- Copy for other platforms ----------

function absoluteHtml() {
    const md = $("#st-body").value;
    const html = renderMarkdown(md, { resolve: (src) => (/^content\//.test(src || "") ? SITE_ROOT + src : resolveLink(src)) });
    const head = `<h1>${esc(state.doc.title)}</h1>${state.doc.subtitle ? `<h3>${esc(state.doc.subtitle)}</h3>` : ""}`;
    const foot = state.doc.slug ? `<p><em>Also published at <a href="${esc(readerUrl(state.doc.slug))}">Ebayednoob Research</a>.</em></p>` : "";
    return head + html + foot;
}

async function copyAs(kind) {
    const d = state.doc;
    const link = d.slug ? readerUrl(d.slug) : "";
    const year = (d.date || "").slice(0, 4);
    const texts = {
        markdown: () => `# ${d.title}\n${d.subtitle ? `\n_${d.subtitle}_\n` : ""}\n${$("#st-body").value}`,
        post: () => {
            const base = `${d.title}${d[SUMMARY_KEY] ? `\n\n${d[SUMMARY_KEY]}` : ""}`;
            const room = 280 - (link ? link.length + 2 : 0);
            return `${base.length > room ? `${base.slice(0, room - 1)}…` : base}${link ? `\n\n${link}` : ""}`;
        },
        link: () => link,
        cite: () => `${(d.authors || []).join(", ") || "Ebayednoob"} (${year || "n.d."}). ${d.title}. ${d.venue || "Ebayednoob Research"}.${d.doi ? ` https://doi.org/${d.doi}` : link ? ` ${link}` : ""}`,
        bibtex: () => `@${d.type === "Paper" ? "article" : "misc"}{${(d.authors?.[0] || "ebayednoob").split(" ").pop().toLowerCase()}${year}${(d.slug || "").split("-")[0]},\n  title = {${d.title}},\n  author = {${(d.authors || ["Ebayednoob"]).join(" and ")}},\n  year = {${year}},\n  ${d.venue ? `publisher = {${d.venue}},\n  ` : ""}${d.doi ? `doi = {${d.doi}},\n  ` : ""}url = {${link}}\n}`
    };
    if (!d.title) return toast("Add a title first.", "error");
    try {
        if (kind === "rich") {
            const html = absoluteHtml();
            if (window.ClipboardItem) {
                await navigator.clipboard.write([new ClipboardItem({
                    "text/html": new Blob([html], { type: "text/html" }),
                    "text/plain": new Blob([texts.markdown()], { type: "text/plain" })
                })]);
            } else {
                await navigator.clipboard.writeText(texts.markdown());
            }
        } else {
            await navigator.clipboard.writeText(texts[kind]());
        }
        toast(kind === "rich" ? "Copied with formatting. Paste it into the other site's editor." : "Copied.", "success");
    } catch (e) {
        toast(`Copy failed: ${e.message}`, "error");
    }
}

// ---------- Saving & publishing ----------

function collectDoc() {
    const d = state.doc;
    d.title = $("#st-title").value.trim();
    d.subtitle = $("#st-subtitle").value.trim();
    d.body = $("#st-body").value;
    if (!d.slug) d.slug = slugify(d.title);
    return d;
}

function uniqueSlug(slug, id) {
    const taken = new Set(state.items.filter((x) => x.id !== id).map((x) => x.slug).filter(Boolean));
    let s = slug || "untitled";
    for (let i = 2; taken.has(s); i++) s = `${slug}-${i}`;
    return s;
}

function firestorePayload(d) {
    const payload = {
        title: d.title,
        subtitle: d.subtitle || "",
        slug: d.slug,
        body: d.body,
        [SUMMARY_KEY]: d[SUMMARY_KEY] || "",
        tags: d.tags || [],
        coverImage: d.coverImage || "",
        date: d.date || "",
        status: d.status || "draft",
        source: "studio",
        wordCount: wordCount(d.body),
        readingMinutes: readingMinutes(d.body)
    };
    if (IS_ARTICLE) {
        Object.assign(payload, { linkedinUrl: d.linkedinUrl || "", crossposts: d.crossposts || {}, siteUrl: readerPath(d.slug) });
    } else {
        Object.assign(payload, { authors: d.authors || [], type: d.type || "Paper", venue: d.venue || "", doi: d.doi || "", pdfUrl: d.pdfUrl || "", url: readerPath(d.slug) });
    }
    if (d.github) payload.github = d.github;
    return payload;
}

async function saveDraft({ quiet = false, auto = false } = {}) {
    clearTimeout(markDirty.t);
    const d = collectDoc();
    if (!d.title && !d.body.trim()) return;
    if (auto && !d.title) return; // autosave starts once there is a title
    if (state.saving) return;
    if (new Blob([d.body]).size > 900 * 1024) return toast("This piece is close to the 1 MB database limit; move large images to uploads.", "error");
    state.saving = true;
    updateSaveState();
    try {
        d.slug = uniqueSlug(d.slug || slugify(d.title), d.id);
        const wasNew = !d.id;
        const prevKey = backupKey();
        d.id = await saveItem(KIND, d.id, firestorePayload(d), state.user);
        localStore(prevKey, null);
        state.dirty = false;
        state.lastSavedAt = new Date().toISOString();
        const idx = state.items.findIndex((x) => x.id === d.id);
        const snapshot = { ...structuredClone(d), updatedAt: state.lastSavedAt };
        if (idx >= 0) state.items[idx] = { ...state.items[idx], ...snapshot }; else state.items.unshift(snapshot);
        if (wasNew) {
            const url = new URL(location.href);
            url.searchParams.set("id", d.id);
            history.replaceState(null, "", url);
        }
        renderArchive();
        renderDetails();
        if (!quiet) toast(d.status === "published" ? "Saved. The live version is updated." : "Draft saved.", "success");
    } catch (e) {
        toast(`Could not save: ${e.message}`, "error");
    } finally {
        state.saving = false;
        updateSaveState();
    }
}
$("#st-save").addEventListener("click", () => saveDraft());

$("#st-publish").addEventListener("click", async () => {
    const d = collectDoc();
    if (!d.title) return toast("Add a title before publishing.", "error");
    if (!d.body.trim()) return toast("Write something before publishing.", "error");
    if (!d.date) d.date = new Date().toISOString().slice(0, 10);
    if (!d[SUMMARY_KEY]) {
        const para = d.body.split(/\n\s*\n/).map(plainText).find((p) => p.length > 40) || "";
        d[SUMMARY_KEY] = para.length > 400 ? `${para.slice(0, 397).replace(/\s+\S*$/, "")}…` : para;
    }
    const first = d.status !== "published";
    d.status = "published";
    state.dirty = true; // cleared only by a successful save
    await saveDraft({ quiet: true });
    if (state.dirty) return; // save failed
    let archived = false;
    if (isConnected()) archived = await commitToGitHub(d);
    toast(`${first ? "Published" : "Updated"} on the site${archived ? " and archived on GitHub" : isConnected() ? "" : " (connect GitHub to archive it in the repository)"}.`, "success");
});

// ---------- GitHub archive ----------

function archiveMeta(d) {
    const meta = {
        id: d.id, kind: NOUN, title: d.title, subtitle: d.subtitle, slug: d.slug, date: d.date, status: d.status,
        [SUMMARY_KEY]: d[SUMMARY_KEY], tags: d.tags, coverImage: d.coverImage
    };
    if (IS_ARTICLE) Object.assign(meta, { linkedinUrl: d.linkedinUrl, crossposts: d.crossposts });
    else Object.assign(meta, { authors: d.authors, type: d.type, venue: d.venue, doi: d.doi, pdfUrl: d.pdfUrl });
    meta.siteUrl = readerPath(d.slug);
    meta.updatedAt = new Date().toISOString();
    return meta;
}

function manifestEntry(d, path) {
    const m = archiveMeta(d);
    delete m.subtitle;
    return { ...m, path };
}

async function updateManifest(docs) {
    return updateJson(`content/${KIND}/index.json`, (cur) => {
        const items = Array.isArray(cur?.items) ? cur.items : [];
        for (const d of docs) {
            const path = d.github?.path || `${repoDir(d)}/index.md`;
            const i = items.findIndex((x) => x.id === d.id);
            const entry = manifestEntry(d, path);
            if (i >= 0) items[i] = entry; else items.push(entry);
        }
        items.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
        return { kind: KIND, updatedAt: new Date().toISOString(), items };
    }, `Update ${KIND} archive index`);
}

async function commitOne(d) {
    const path = `${repoDir(d)}/index.md`;
    const res = await putText(path, toFrontMatter(archiveMeta(d), d.body), `${d.github?.path ? "Update" : "Archive"} ${NOUN}: ${d.title}`);
    d.github = { path, sha: res.sha, htmlUrl: res.htmlUrl, commitUrl: res.commitUrl, committedAt: new Date().toISOString() };
    await saveItem(KIND, d.id, { github: d.github }, state.user);
    return d;
}

async function commitToGitHub(d) {
    try {
        toast("Committing to GitHub…");
        await commitOne(d);
        await updateManifest([d]);
        const idx = state.items.findIndex((x) => x.id === d.id);
        if (idx >= 0) state.items[idx] = { ...state.items[idx], github: d.github };
        renderArchive();
        renderDetails();
        return true;
    } catch (e) {
        toast(`GitHub archive failed: ${e.message}`, "error");
        return false;
    }
}

$("#st-sync-all").addEventListener("click", async () => {
    if (!isConnected()) return openGitHubDialog();
    const pending = state.items.filter((x) => x.status === "published" && x.body && (!x.github?.path || toMillis(x.updatedAt) > toMillis(x.github.committedAt) + 1000));
    if (!pending.length) return toast("Everything published is already archived.", "success");
    if (!confirm(`Commit ${pending.length} published ${NOUN}(s) to GitHub?`)) return;
    const done = [];
    for (const it of pending) {
        try {
            done.push(await commitOne({ ...blankDoc(), ...stripTimestamps(it) }));
        } catch (e) {
            toast(`“${it.title}”: ${e.message}`, "error");
        }
    }
    if (done.length) await updateManifest(done).catch((e) => toast(`Index update failed: ${e.message}`, "error"));
    await reloadItems();
    toast(`Archived ${done.length} ${NOUN}(s) on GitHub.`, "success");
});

function openGitHubDialog() {
    const s = loadGitHubSettings();
    $("#gh-owner").value = s.owner;
    $("#gh-repo").value = s.repo;
    $("#gh-branch").value = s.branch;
    $("#gh-token").value = s.token;
    $("#gh-status").textContent = isConnected(s) ? "A token is saved in this browser." : "Not connected.";
    $("#gh-dialog").showModal();
}
$("#st-github").addEventListener("click", openGitHubDialog);
$$("#gh-dialog [data-close]").forEach((b) => (b.onclick = () => $("#gh-dialog").close()));
$("#gh-forget").addEventListener("click", () => {
    saveGitHubSettings({ ...loadGitHubSettings(), token: "" });
    $("#gh-token").value = "";
    $("#gh-status").textContent = "Token removed from this browser.";
    renderDetails();
});
$("#gh-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const s = { owner: $("#gh-owner").value.trim(), repo: $("#gh-repo").value.trim(), branch: $("#gh-branch").value.trim() || "main", token: $("#gh-token").value.trim() };
    $("#gh-status").textContent = "Testing…";
    try {
        const repo = await testConnection(s);
        saveGitHubSettings(s);
        $("#gh-status").innerHTML = `<span class="text-emerald-300">Connected to ${esc(repo.full_name)} with write access.</span>`;
        renderDetails();
        renderArchive();
    } catch (err) {
        $("#gh-status").innerHTML = `<span class="text-red-300">${esc(err.message)}</span>`;
    }
});
