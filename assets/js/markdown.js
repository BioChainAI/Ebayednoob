// Markdown rendering for the Studio editors and the public reader.
// Uses marked + DOMPurify (+ KaTeX for $math$) loaded as globals by the page; degrades to
// escaped plain text if a library failed to load.
import { esc, resolveLink } from "./ui.js";

export const MARKDOWN_SCRIPTS = [
    "https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js",
    "https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js",
    "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"
];

// Pull math out before Markdown parsing so underscores and asterisks inside it survive.
function extractMath(md) {
    const math = [];
    const keep = (tex, display) => `@@MATH${math.push({ tex, display }) - 1}@@`;
    let out = md.replace(/```[\s\S]*?```|`[^`\n]*`/g, (m) => m.replace(/\$/g, "@@DOLLAR@@")); // leave code alone
    out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => keep(t.trim(), true));
    out = out.replace(/(^|[^\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g, (_, pre, t) => pre + keep(t, false));
    return { md: out.replace(/@@DOLLAR@@/g, "$"), math };
}

function renderMath({ tex, display }) {
    if (window.katex) {
        try {
            return window.katex.renderToString(tex, { displayMode: display, throwOnError: false, output: "html" });
        } catch { /* fall through */ }
    }
    return `<code>${esc(display ? `$$${tex}$$` : `$${tex}$`)}</code>`;
}

/**
 * @param {string} md
 * @param {{ resolve?: (src: string) => string }} opts  maps site-relative links/images (e.g. to
 *   raw.githubusercontent.com while a fresh upload is not deployed yet)
 */
export function renderMarkdown(md, opts = {}) {
    const source = String(md || "");
    if (!window.marked || !window.DOMPurify) return `<pre class="whitespace-pre-wrap">${esc(source)}</pre>`;
    const { md: prepared, math } = extractMath(source);
    let html = window.marked.parse(prepared, { gfm: true, breaks: false });
    html = window.DOMPurify.sanitize(html, { ADD_ATTR: ["target"] });
    html = html.replace(/@@MATH(\d+)@@/g, (_, i) => renderMath(math[Number(i)]));
    // Resolve site-relative links and images; open external links in a new tab.
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const resolve = opts.resolve || resolveLink;
    tpl.content.querySelectorAll("img[src]").forEach((img) => {
        const u = resolve(img.getAttribute("src"));
        if (u) img.setAttribute("src", u); else img.remove();
        img.setAttribute("loading", "lazy");
    });
    tpl.content.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href");
        if (href.startsWith("#")) return;
        const u = resolve(href);
        if (!u) return a.removeAttribute("href");
        a.setAttribute("href", u);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
    });
    return tpl.innerHTML;
}

export function plainText(md) {
    return String(md || "")
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[#>*_`~|-]+/g, " ")
        .replace(/\$\$?[^$]*\$\$?/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function wordCount(md) {
    const t = plainText(md);
    return t ? t.split(" ").length : 0;
}

export const readingMinutes = (md) => Math.max(1, Math.round(wordCount(md) / 230));

// ---------- Front matter (the archive's .md files) ----------

export function toFrontMatter(meta, body) {
    const lines = Object.entries(meta)
        .filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length) && !(typeof v === "object" && !Array.isArray(v) && !Object.values(v).some(Boolean)))
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
    return `---\n${lines.join("\n")}\n---\n\n${String(body || "").trim()}\n`;
}

export function parseFrontMatter(text) {
    const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return { meta: {}, body: String(text) };
    const meta = {};
    for (const line of m[1].split(/\r?\n/)) {
        const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (!kv) continue;
        try {
            meta[kv[1]] = JSON.parse(kv[2]);
        } catch {
            meta[kv[1]] = kv[2];
        }
    }
    return { meta, body: m[2].replace(/^\n+/, "") };
}
