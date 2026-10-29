// Floating site chrome for standalone tools: a Home button, dropdown menus (for example the Geometric
// Calculator's simulations and its manuals), Google sign-in shared with the main site (same Firebase
// project, local persistence) and the social links, which stay folded behind one button until it is
// pressed. Everything renders inside a shadow root, so the host page's CSS and this module's CSS never
// touch each other.
//
// Add it to any page with one line (path relative to that page), or list the page in
// scripts/page-chrome-targets.json and let scripts/install-page-chrome.mjs add it:
//   <script type="module" src="../../assets/js/page-chrome.js" data-position="top"></script>
// Optional attributes on that script tag:
//   data-position  "top" (default), "bottom-left" or "bottom-right"
//   data-home      URL for the Home button (default: the site's index.html)
//   data-menus     dropdown menus as JSON: [{"label": "Simulations", "icon": "engine", "items": [
//                      {"href": "...", "label": "...", "icon": "...", "note": "...", "section": "..."}]}]
//                  hrefs are relative to the page; "note" is a second line, "section" a heading the item
//                  starts (repeat it on the following items). The current page is marked in its menu.
//   data-extras    plain buttons after Home as JSON: [{"href": "...", "label": "...", "icon": "..."}]
//   data-extra-href, data-extra-label, data-extra-icon   one such button
//   data-compact   "true" shows every button as an icon only (names on hover)
// Icons: book, engine, trace, numogram, lensing, soliton, calc, hyper.

const SITE_ROOT = new URL("../../", import.meta.url).href;
const STORE_KEY = "ebayednoob-page-chrome-collapsed";

export const SOCIAL_LINKS = [
    { label: "GitHub - Geometric Labs", href: "https://github.com/BioChainAI/Geometric-Labs", icon: "github" },
    { label: "X - @Ebayednoob", href: "https://x.com/Ebayednoob", icon: "x" },
    { label: "YouTube - Neural Awakening", href: "https://www.youtube.com/@Neural-Awakening", icon: "youtube" },
    { label: "Patreon - Neural Awakening", href: "https://www.patreon.com/cw/NeuralAwakening", icon: "patreon" }
];

const svg = (body, viewBox = "0 0 24 24", extra = 'fill="currentColor"') =>
    `<svg viewBox="${viewBox}" ${extra} aria-hidden="true" focusable="false">${body}</svg>`;

const ICONS = {
    home: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>', "0 0 24 24", 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'),
    github: svg('<path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57l-.02-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3"/>'),
    x: svg('<path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.63 7.58H.48l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.48 3.24H4.3l13.31 17.41z"/>'),
    youtube: svg('<path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/>'),
    patreon: svg('<path d="M15.39 0C10.98 0 7.4 3.59 7.4 8.01c0 4.4 3.58 7.97 7.99 7.97 4.4 0 7.97-3.57 7.97-7.97C23.36 3.59 19.79 0 15.39 0zM.64 24h3.92V0H.64v24z"/>'),
    google: svg('<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>', "0 0 48 48", ""),
    book: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/>', "0 0 24 24", 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'),
    engine: svg('<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>', "0 0 24 24", 'fill="none" stroke="currentColor" stroke-width="1.8"'),
    numogram: svg('<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" stroke-opacity="0.45"/>', "0 0 24 24", 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"'),
    lensing: svg('<circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="12" r="6"/><path d="M2.5 12c3-5 16-5 19 0M2.5 12c3 5 16 5 19 0" stroke-opacity="0.55"/>', "0 0 24 24", 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"'),
    hyper: svg('<circle cx="12" cy="12" r="9.5"/><path d="M4.2 7.5C8 9.5 9.5 14 9 21M19.8 7.5C16 9.5 14.5 14 15 21M3.2 14.5C9 12 15 12 20.8 14.5" stroke-opacity="0.6"/><circle cx="12" cy="11.6" r="1.4" fill="currentColor" stroke="none"/>', "0 0 24 24", 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"'),
    soliton: svg('<circle cx="12" cy="8.2" r="4.2"/><circle cx="8.6" cy="14.1" r="4.2"/><circle cx="15.4" cy="14.1" r="4.2"/><circle cx="12" cy="12.2" r="1.3" fill="currentColor" stroke="none"/>', "0 0 24 24", 'fill="none" stroke="currentColor" stroke-width="1.7"'),
    trace: svg('<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>', "0 0 24 24", 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'),
    calc: svg('<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M8.5 6.5h7"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01"/>', "0 0 24 24", 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'),
    social: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>', "0 0 24 24", 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"'),
    caret: svg('<path d="m6 9 6 6 6-6"/>', "0 0 24 24", 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"'),
    hide: svg('<path d="m15 18-6-6 6-6"/>', "0 0 24 24", 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"'),
    grip: svg('<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>')
};

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.dock {
    position: fixed; z-index: 2147483000; display: flex; align-items: center; gap: 4px;
    padding: 4px; border-radius: 999px; font: 500 13px/1 Inter, system-ui, sans-serif; color: #e5e7eb;
    background: rgba(15, 23, 42, 0.82); border: 1px solid rgba(45, 212, 191, 0.35);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.dock[data-position="top"] { top: 6px; left: 50%; transform: translateX(-50%); }
.dock[data-position="bottom-left"] { bottom: 10px; left: 10px; }
.dock[data-position="bottom-right"] { bottom: 10px; right: 10px; flex-direction: row-reverse; }
.dock.collapsed .full { display: none; }
.dock.compact .label { display: none; }
.dock.compact .bar-btn { padding: 0 6px; min-width: 30px; }
.dock.compact .home, .dock.compact .extra, .dock.compact .signin { padding: 0; width: 30px; }
.dock:not(.collapsed) .expand { display: none; }
.full { display: flex; align-items: center; gap: 4px; }
.sep { width: 1px; height: 20px; background: rgba(148, 163, 184, 0.3); margin: 0 2px; }
a, button {
    all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    gap: 6px; height: 30px; min-width: 30px; padding: 0 8px; border-radius: 999px; color: #cbd5e1;
    transition: background-color .15s, color .15s; white-space: nowrap;
}
a:hover, button:hover { background: rgba(45, 212, 191, 0.16); color: #fff; }
a:focus-visible, button:focus-visible { outline: 2px solid #2dd4bf; outline-offset: 1px; }
.icon { padding: 0; width: 30px; }
svg { width: 16px; height: 16px; flex: none; }
.extra { color: #5eead4; }
.dd-btn { color: #5eead4; }
.dd-btn .caret svg { width: 12px; height: 12px; transition: transform .15s; }
.dd-btn[aria-expanded="true"] { background: rgba(45, 212, 191, 0.2); color: #fff; }
.dd-btn[aria-expanded="true"] .caret svg { transform: rotate(180deg); }
.dd-btn.here::after { content: ""; width: 5px; height: 5px; border-radius: 50%; background: #f5c542; margin-left: -2px; }
.signin { background: #fff; color: #1f2937; font-weight: 600; }
.signin:hover { background: #e5e7eb; color: #111827; }
.avatar { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; background: #0d9488; color: #fff;
    display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
.name { max-width: 9rem; overflow: hidden; text-overflow: ellipsis; }
.menu {
    position: absolute; top: calc(100% + 6px); left: 0; min-width: 210px; max-width: calc(100vw - 16px);
    max-height: calc(100vh - 70px); overflow-y: auto; padding: 6px; border-radius: 12px;
    background: rgba(15, 23, 42, 0.97); border: 1px solid rgba(45, 212, 191, 0.35); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
    display: flex; flex-direction: column; gap: 2px; line-height: 1.3;
}
.menu.wide { width: 300px; }
.dock[data-position^="bottom"] .menu { top: auto; bottom: calc(100% + 6px); }
.menu .who { padding: 6px 10px 8px; font-size: 12px; color: #94a3b8; line-height: 1.4; overflow-wrap: anywhere; }
.menu .sect { padding: 8px 10px 3px; font: 600 10.5px/1 Inter, system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #64748b; }
.menu .sect:first-child { padding-top: 4px; }
.menu a, .menu button { justify-content: flex-start; border-radius: 8px; padding: 0 10px; }
.menu a.item { height: auto; min-height: 34px; padding: 6px 10px; align-items: flex-start; white-space: normal; }
.menu a.item svg { margin-top: 1px; color: #5eead4; }
.menu .txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.menu .txt b { font-weight: 600; color: #e5e7eb; }
.menu .txt small { font-size: 11.5px; color: #94a3b8; }
.menu a.item[aria-current="page"] { background: rgba(245, 197, 66, 0.12); box-shadow: inset 2px 0 0 #f5c542; }
.menu a.item[aria-current="page"] .txt b::after { content: " \\00b7  you are here"; font-weight: 500; font-size: 11px; color: #f5c542; }
.menu .danger { color: #fca5a5; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 640px) { .bar-btn .label, .home .label, .signin .label { display: none; } a, button { padding: 0 6px; } }
`;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const iconOr = (name, fallback = "book") => (ICONS[name] ? name : fallback);

function readCollapsed() {
    try {
        const v = localStorage.getItem(STORE_KEY);
        if (v !== null) return v === "1";
    } catch { /* storage unavailable */ }
    return window.matchMedia("(max-width: 767px)").matches; // start tucked away on phones
}

function saveCollapsed(v) {
    try { localStorage.setItem(STORE_KEY, v ? "1" : "0"); } catch { /* storage unavailable */ }
}

function readJSON(script, key) {
    try {
        const parsed = JSON.parse(script?.dataset[key] || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn(`page-chrome: data-${key} is not valid JSON`, e);
        return [];
    }
}

// Plain buttons from data-extras (JSON list) and/or the single data-extra-* attributes.
function readExtras(script) {
    const list = readJSON(script, "extras");
    if (script?.dataset.extraHref) list.unshift({ href: script.dataset.extraHref, label: script.dataset.extraLabel, icon: script.dataset.extraIcon });
    return list
        .filter((x) => x && typeof x.href === "string" && x.href)
        .map((x) => ({ href: x.href, label: x.label || "More", icon: iconOr(x.icon) }));
}

// Dropdown menus from data-menus. Links resolve against the page, and the one that is this page is marked.
function readMenus(script) {
    const here = location.pathname.replace(/\/index\.html$/, "/");
    return readJSON(script, "menus")
        .filter((m) => m && Array.isArray(m.items))
        .map((m) => {
            const items = m.items.filter((x) => x && typeof x.href === "string" && x.href).map((x) => {
                let current = false;
                try { current = new URL(x.href, location.href).pathname.replace(/\/index\.html$/, "/") === here; } catch { /* bad URL */ }
                return { href: x.href, label: x.label || x.href, icon: iconOr(x.icon), note: x.note || "", section: x.section || "", current };
            });
            return { label: m.label || "Menu", icon: iconOr(m.icon, "book"), items };
        })
        .filter((m) => m.items.length);
}

function menuHTML(id, items) {
    let section = "";
    return `<div class="menu wide" id="${id}" hidden>${items.map((x) => {
        const head = x.section && x.section !== section ? `<div class="sect">${esc(x.section)}</div>` : "";
        section = x.section || section;
        return `${head}<a class="item" href="${esc(x.href)}"${x.current ? ' aria-current="page"' : ""}>${ICONS[x.icon]}<span class="txt"><b>${esc(x.label)}</b>${x.note ? `<small>${esc(x.note)}</small>` : ""}</span></a>`;
    }).join("")}</div>`;
}

function mount() {
    if (document.getElementById("ebayednoob-page-chrome")) return; // already on the page
    const script = document.querySelector('script[src*="page-chrome.js"]');
    const position = ["top", "bottom-left", "bottom-right"].includes(script?.dataset.position) ? script.dataset.position : "top";
    const home = script?.dataset.home || new URL("index.html", SITE_ROOT).href;
    const extras = readExtras(script), menus = readMenus(script);

    const host = document.createElement("div");
    host.id = "ebayednoob-page-chrome";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `
        <style>${CSS}</style>
        <nav class="dock${script?.dataset.compact === "true" ? " compact" : ""}" data-position="${position}" aria-label="Site">
            <button class="icon expand" type="button" title="Show site menu" aria-label="Show site menu" aria-expanded="false">${ICONS.grip}</button>
            <div class="full">
                <a class="home" href="${esc(home)}" title="Back to the main site" aria-label="Home">${ICONS.home}<span class="label">Home</span></a>
                ${extras.map((x) => `<a class="extra" href="${esc(x.href)}" title="${esc(x.label)}">${ICONS[x.icon]}<span class="label">${esc(x.label)}</span></a>`).join("")}
                ${menus.map((m, i) => `<button class="bar-btn dd-btn${m.items.some((x) => x.current) ? " here" : ""}" type="button" data-menu="pc-menu-${i}" aria-controls="pc-menu-${i}" aria-expanded="false" title="${esc(m.label)}">${ICONS[m.icon]}<span class="label">${esc(m.label)}</span><span class="caret">${ICONS.caret}</span></button>${menuHTML(`pc-menu-${i}`, m.items)}`).join("")}
                <span class="sep"></span>
                <button class="bar-btn dd-btn" type="button" data-menu="pc-social" aria-controls="pc-social" aria-expanded="false" title="Social links" aria-label="Social links">${ICONS.social}<span class="caret">${ICONS.caret}</span></button>
                <div class="menu" id="pc-social" hidden>
                    ${SOCIAL_LINKS.map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${ICONS[l.icon]}<span>${esc(l.label)}</span></a>`).join("")}
                </div>
                <button class="signin" type="button" title="Sign in with Google" aria-label="Sign in with Google" hidden>${ICONS.google}<span class="label">Sign in</span></button>
                <button class="profile dd-btn" type="button" data-menu="pc-account" aria-controls="pc-account" hidden aria-expanded="false"></button>
                <div class="menu" id="pc-account" hidden>
                    <div class="who"></div>
                    <a href="${esc(new URL("control-panel/index.html", SITE_ROOT).href)}">Control Panel</a>
                    <button class="danger signout" type="button">Sign out</button>
                </div>
                <button class="icon collapse" type="button" title="Hide site menu" aria-label="Hide site menu">${ICONS.hide}</button>
            </div>
        </nav>`;
    document.body.appendChild(host);

    const $ = (sel) => root.querySelector(sel);
    const dock = $(".dock"), expandBtn = $(".expand"), signinBtn = $(".signin"), profileBtn = $(".profile");
    const triggers = [...root.querySelectorAll("[data-menu]")];
    const menuOf = (btn) => root.getElementById(btn.dataset.menu);

    // One dropdown open at a time. Each opens under its own button, kept inside the window.
    const closeMenu = () => triggers.forEach((b) => { b.setAttribute("aria-expanded", "false"); menuOf(b).hidden = true; });
    const openMenu = (btn, focusFirst = false) => {
        closeMenu();
        const menu = menuOf(btn);
        menu.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        const d = dock.getBoundingClientRect(), b = btn.getBoundingClientRect(), w = menu.offsetWidth;
        const left = Math.min(Math.max(b.left + b.width / 2 - w / 2, 8), window.innerWidth - 8 - w);
        menu.style.left = `${left - d.left}px`;
        if (focusFirst) menu.querySelector("a, button")?.focus();
    };
    triggers.forEach((btn) => {
        btn.addEventListener("click", () => (btn.getAttribute("aria-expanded") === "true" ? closeMenu() : openMenu(btn)));
        btn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { e.preventDefault(); openMenu(btn, true); } });
        const menu = menuOf(btn);
        menu.addEventListener("keydown", (e) => {
            const items = [...menu.querySelectorAll("a, button")], i = items.indexOf(root.activeElement);
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
            } else if (e.key === "Escape") { closeMenu(); btn.focus(); }
        });
        menu.addEventListener("click", (e) => { if (e.target.closest("a")) closeMenu(); });
    });

    const setCollapsed = (v, persist = true) => {
        dock.classList.toggle("collapsed", v);
        expandBtn.setAttribute("aria-expanded", String(!v));
        if (v) closeMenu();
        if (persist) saveCollapsed(v);
    };
    setCollapsed(readCollapsed(), false);
    expandBtn.addEventListener("click", () => setCollapsed(false));
    $(".collapse").addEventListener("click", () => setCollapsed(true));
    document.addEventListener("pointerdown", (e) => { if (!e.composedPath().includes(host)) closeMenu(); });
    window.addEventListener("blur", closeMenu); // clicks inside an iframe never reach this document
    window.addEventListener("resize", closeMenu);
    root.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
    root.addEventListener("focusout", (e) => { if (e.relatedTarget && !root.contains(e.relatedTarget)) closeMenu(); });

    // Auth loads after the dock is on screen, so a blocked or offline Firebase never hides the links.
    import("./firebase.js").then(({ auth, db, signInWithGoogle, signOut, onAuthStateChanged, sessionEmail }) => {
        signinBtn.hidden = false;
        signinBtn.addEventListener("click", () => signInWithGoogle().catch((e) => console.error("Sign-in failed:", e)));
        $(".signout").addEventListener("click", () => { closeMenu(); signOut(auth).catch((e) => console.error("Sign-out failed:", e)); });

        onAuthStateChanged(auth, async (user) => {
            signinBtn.hidden = !!user;
            profileBtn.hidden = !user;
            if (!user) return closeMenu();
            const email = sessionEmail(user);
            let name = user.displayName || email || "Signed in";
            // Same first-visit profile record the main page creates, then prefer the chosen username.
            try {
                const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js");
                const ref = doc(db, "users", user.uid);
                const snap = await getDoc(ref);
                if (!snap.exists()) await setDoc(ref, { email, createdAt: new Date(), tutorialProgress: {} });
                else if (snap.data().username) name = snap.data().username;
            } catch (e) {
                console.warn("Could not load the user profile:", e);
            }
            const initial = esc((name[0] || "?").toUpperCase());
            const avatar = user.photoURL
                ? `<img class="avatar" src="${esc(user.photoURL)}" alt="" referrerpolicy="no-referrer">`
                : `<span class="avatar">${initial}</span>`;
            profileBtn.innerHTML = `${avatar}<span class="label name">${esc(name)}</span><span class="sr">Account menu</span>`;
            profileBtn.title = email || name;
            $(".who").textContent = email ? `Signed in as ${email}` : "Signed in";
        });
    }).catch((e) => console.warn("Sign-in is unavailable on this page:", e));
}

if (document.body) mount();
else document.addEventListener("DOMContentLoaded", mount, { once: true });
