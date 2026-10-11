// Small DOM helpers shared by the Research hub and Control Panel.
import { safeUrl } from "./feed-core.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Site root, derived from where this module is served (assets/js/ui.js -> ../../).
// Works both at a domain root and under a subpath such as /Ebayednoob/.
export const SITE_ROOT = new URL("../../", import.meta.url).href;

// Resolve a stored link: absolute http(s) URLs pass through, site-relative paths resolve
// against the site root, anything else (javascript:, data:, ...) is dropped.
export function resolveLink(u) {
    const s = String(u || "").trim();
    if (!s) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return safeUrl(s);
    try {
        return safeUrl(new URL(s.replace(/^\/+/, ""), SITE_ROOT).href);
    } catch {
        return "";
    }
}

export function hostOf(u) {
    try {
        return new URL(u).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
}

export function fmtDate(v, opts = { year: "numeric", month: "short", day: "numeric" }) {
    if (!v) return "Undated";
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00` : v);
    return Number.isNaN(d.getTime()) ? "Undated" : d.toLocaleDateString(undefined, opts);
}

export function timeAgo(v) {
    if (!v) return "never";
    const s = Math.round((Date.now() - new Date(v).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return `${Math.round(s / 86400)} d ago`;
}

export function toast(message, kind = "info") {
    let host = document.getElementById("toast-host");
    if (!host) {
        host = document.createElement("div");
        host.id = "toast-host";
        host.className = "fixed bottom-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 items-end";
        host.setAttribute("aria-live", "polite");
        document.body.appendChild(host);
    }
    const colors = { info: "border-teal-500/60", error: "border-red-500/70", success: "border-emerald-500/70" };
    const el = document.createElement("div");
    el.className = `content-overlay border ${colors[kind] || colors.info} text-sm text-gray-100 px-4 py-3 rounded-lg shadow-lg max-w-sm fade-in`;
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => el.remove(), kind === "error" ? 7000 : 4000);
}

export async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
}

export const ICONS = {
    linkedin: '<svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
    x: '<svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.63 7.58H.48l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.48 3.24H4.3l13.31 17.41z"/></svg>',
    medium: '<svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>',
    substack: '<svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M22.54 8.25H1.46V5.4h21.08v2.85zM1.46 10.8V24L12 18.11 22.54 24V10.8H1.46zM22.54 0H1.46v2.84h21.08V0z"/></svg>',
    patreon: '<svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M15.39 0C10.98 0 7.4 3.59 7.4 8.01c0 4.4 3.58 7.97 7.99 7.97 4.4 0 7.97-3.57 7.97-7.97C23.36 3.59 19.79 0 15.39 0zM.64 24h3.92V0H.64v24z"/></svg>',
    external: '<svg viewBox="0 0 20 20" class="w-3.5 h-3.5" fill="currentColor" aria-hidden="true"><path d="M11 3a1 1 0 1 0 0 2h2.59l-6.3 6.29a1 1 0 1 0 1.42 1.42L15 6.41V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5z"/><path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 0 0 0-2H5z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>'
};

export const CROSSPOST_PLATFORMS = [
    { key: "x", label: "X" },
    { key: "medium", label: "Medium" },
    { key: "substack", label: "Substack" },
    { key: "patreon", label: "Patreon" }
];
