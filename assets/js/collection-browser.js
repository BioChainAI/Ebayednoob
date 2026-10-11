// Modular collection browser: "Latest N" view plus a searchable, year-grouped archive.
// Each tab of the Research hub (Publications, Stay Current, Articles) gets its own instance
// with its own archive, so they never mix.
import { esc } from "./ui.js";

const PAGE_SIZE = 24;

function store(key, value) {
    try {
        if (value === undefined) return localStorage.getItem(key);
        localStorage.setItem(key, value);
    } catch {
        return null;
    }
}

/**
 * @param {HTMLElement} root
 * @param {object} opts
 *   key          unique id (used for remembered layout)
 *   noun         singular label, e.g. "publication"
 *   latestCount  size of the Latest view (default 10)
 *   dateOf(it)   ISO date string used for ordering and archive grouping
 *   tagsOf(it)   array of tags for the tag filter
 *   textOf(it)   searchable text
 *   render(it, layout) HTML for one item ("grid" | "list")
 *   split(items) optional: returns { latest, archive } (default: newest N / the rest)
 *   empty        message when there is nothing at all
 *   defaultLayout "grid" | "list"
 *   onRender(root) called after each render (wire up item buttons)
 */
export function createBrowser(root, opts) {
    const o = { latestCount: 10, defaultLayout: "grid", ...opts };
    const state = {
        items: [],
        view: "latest",
        q: "",
        tag: "",
        sort: "newest",
        page: 1,
        layout: store(`browser-layout:${o.key}`) || o.defaultLayout,
        loading: true
    };

    const split = (items) => {
        if (o.split) return o.split(items);
        const sorted = [...items].sort((a, b) => String(o.dateOf(b) || "").localeCompare(String(o.dateOf(a) || "")));
        return { latest: sorted.slice(0, o.latestCount), archive: sorted.slice(o.latestCount) };
    };

    function filtered(list) {
        const q = state.q.trim().toLowerCase();
        let out = list.filter((it) => (!state.tag || o.tagsOf(it).includes(state.tag)) && (!q || o.textOf(it).toLowerCase().includes(q)));
        if (state.view === "archive") {
            const cmp = {
                newest: (a, b) => String(o.dateOf(b) || "").localeCompare(String(o.dateOf(a) || "")),
                oldest: (a, b) => String(o.dateOf(a) || "").localeCompare(String(o.dateOf(b) || "")),
                title: (a, b) => String(a.title || "").localeCompare(String(b.title || ""))
            }[state.sort];
            out = [...out].sort(cmp);
        }
        return out;
    }

    function itemsHtml(list) {
        const wrap = state.layout === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-4" : "flex flex-col gap-3";
        return `<div class="${wrap}">${list.map((it) => o.render(it, state.layout)).join("")}</div>`;
    }

    function archiveHtml(list) {
        if (state.sort === "title") return itemsHtml(list);
        const groups = new Map();
        for (const it of list) {
            const y = String(o.dateOf(it) || "").slice(0, 4) || "Undated";
            if (!groups.has(y)) groups.set(y, []);
            groups.get(y).push(it);
        }
        return [...groups].map(([year, items]) => `
            <div class="mb-6">
                <h4 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-3"><span>${esc(year)}</span><span class="h-px flex-1 bg-gray-700/70"></span><span class="text-gray-500 normal-case tracking-normal font-normal">${items.length}</span></h4>
                ${itemsHtml(items)}
            </div>`).join("");
    }

    function render() {
        const { latest, archive } = split(state.items);
        const source = state.view === "latest" ? latest : archive;
        const list = filtered(source);
        const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
        state.page = Math.min(state.page, pages);
        const pageItems = state.view === "archive" ? list.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE) : list;
        const tags = [...new Set(source.flatMap(o.tagsOf))].sort((a, b) => a.localeCompare(b));
        if (state.tag && !tags.includes(state.tag)) tags.unshift(state.tag);

        let body;
        if (state.loading) {
            body = `<div class="panel p-10 text-center text-gray-400">Loading…</div>`;
        } else if (!state.items.length) {
            body = `<div class="panel p-10 text-center text-gray-400">${esc(o.empty || `No ${o.noun}s yet.`)}</div>`;
        } else if (!list.length) {
            const why = source.length ? `No ${o.noun}s match your filters.` : state.view === "archive" ? `The archive is empty: every ${o.noun} is still in the latest ${o.latestCount}.` : `Nothing here yet.`;
            body = `<div class="panel p-10 text-center text-gray-400">${esc(why)}</div>`;
        } else {
            body = state.view === "archive" ? archiveHtml(pageItems) : itemsHtml(pageItems);
        }

        const pager = state.view === "archive" && pages > 1 ? `
            <div class="flex items-center justify-center gap-3 mt-6 text-sm">
                <button data-act="prev" class="btn btn-ghost btn-sm" ${state.page <= 1 ? "disabled" : ""}>Previous</button>
                <span class="text-gray-400">Page ${state.page} of ${pages}</span>
                <button data-act="next" class="btn btn-ghost btn-sm" ${state.page >= pages ? "disabled" : ""}>Next</button>
            </div>` : "";

        root.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center gap-3 mb-5">
                <div class="inline-flex rounded-lg border border-gray-700 overflow-hidden self-start shrink-0" role="group" aria-label="View">
                    <button data-view="latest" aria-pressed="${state.view === "latest"}" class="seg-btn px-3 py-1.5 text-sm text-gray-300 hover:text-white">Latest ${o.latestCount}</button>
                    <button data-view="archive" aria-pressed="${state.view === "archive"}" class="seg-btn px-3 py-1.5 text-sm text-gray-300 hover:text-white border-l border-gray-700">Archive <span class="opacity-70">(${archive.length})</span></button>
                </div>
                <input data-act="search" type="search" value="${esc(state.q)}" placeholder="Search ${o.noun}s…" aria-label="Search ${o.noun}s" class="field md:flex-1 min-w-0">
                <div class="flex gap-2">
                    <select data-act="tag" aria-label="Filter by tag" class="field !w-auto max-w-[12rem]">
                        <option value="">All tags</option>
                        ${tags.map((t) => `<option value="${esc(t)}" ${t === state.tag ? "selected" : ""}>${esc(t)}</option>`).join("")}
                    </select>
                    ${state.view === "archive" ? `
                    <select data-act="sort" aria-label="Sort" class="field !w-auto">
                        <option value="newest" ${state.sort === "newest" ? "selected" : ""}>Newest</option>
                        <option value="oldest" ${state.sort === "oldest" ? "selected" : ""}>Oldest</option>
                        <option value="title" ${state.sort === "title" ? "selected" : ""}>Title A–Z</option>
                    </select>` : ""}
                    <button data-act="layout" class="btn btn-ghost btn-sm shrink-0" title="Switch layout" aria-label="Switch to ${state.layout === "grid" ? "list" : "grid"} layout">${state.layout === "grid" ? "List" : "Grid"}</button>
                </div>
            </div>
            <div class="fade-in">${body}</div>
            ${pager}`;
        o.onRender?.(root);
    }

    root.addEventListener("click", (e) => {
        const v = e.target.closest("[data-view]");
        if (v) {
            state.view = v.dataset.view;
            state.page = 1;
            render();
            return;
        }
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "layout") {
            state.layout = state.layout === "grid" ? "list" : "grid";
            store(`browser-layout:${o.key}`, state.layout);
            render();
        } else if (act === "prev" || act === "next") {
            state.page += act === "next" ? 1 : -1;
            render();
            root.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
    root.addEventListener("change", (e) => {
        const act = e.target.dataset.act;
        if (act === "tag") state.tag = e.target.value;
        else if (act === "sort") state.sort = e.target.value;
        else return;
        state.page = 1;
        render();
    });
    let t;
    root.addEventListener("input", (e) => {
        if (e.target.dataset.act !== "search") return;
        clearTimeout(t);
        t = setTimeout(() => {
            state.q = e.target.value;
            state.page = 1;
            const pos = e.target.selectionStart;
            render();
            const input = root.querySelector('[data-act="search"]');
            input.focus();
            input.setSelectionRange(pos, pos);
        }, 200);
    });

    render();
    return {
        setItems(items) {
            state.items = items || [];
            state.loading = false;
            render();
        },
        setView(view) {
            if (view === "latest" || view === "archive") {
                state.view = view;
                render();
            }
        },
        refresh: render
    };
}
