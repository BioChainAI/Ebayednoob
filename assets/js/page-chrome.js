// Floating site chrome for standalone tools: a Home button, Google sign-in shared with the main
// site (same Firebase project, local persistence) and social links. Everything renders inside a
// shadow root, so the host page's CSS and this module's CSS never touch each other.
//
// Add it to any page with one line (path relative to that page), or list the page in
// scripts/page-chrome-targets.json and let scripts/install-page-chrome.mjs add it:
//   <script type="module" src="../../assets/js/page-chrome.js" data-position="top"></script>
// Optional attributes on that script tag:
//   data-position  "top" (default), "bottom-left" or "bottom-right"
//   data-home      URL for the Home button (default: the site's index.html)
//   data-extra-href, data-extra-label, data-extra-icon ("book" or "engine")
//                  one extra button after Home, e.g. a tool's manual (relative to the page)

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
.signin { background: #fff; color: #1f2937; font-weight: 600; }
.signin:hover { background: #e5e7eb; color: #111827; }
.avatar { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; background: #0d9488; color: #fff;
    display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
.name { max-width: 9rem; overflow: hidden; text-overflow: ellipsis; }
.menu {
    position: absolute; top: calc(100% + 6px); right: 0; min-width: 210px; padding: 6px; border-radius: 12px;
    background: rgba(15, 23, 42, 0.96); border: 1px solid rgba(45, 212, 191, 0.35); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
    display: flex; flex-direction: column; gap: 2px;
}
.dock[data-position^="bottom"] .menu { top: auto; bottom: calc(100% + 6px); }
.menu .who { padding: 6px 10px 8px; font-size: 12px; color: #94a3b8; line-height: 1.4; overflow-wrap: anywhere; }
.menu a, .menu button { justify-content: flex-start; border-radius: 8px; padding: 0 10px; }
.menu .danger { color: #fca5a5; }
.auth { position: relative; display: inline-flex; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 640px) { .label { display: none; } a, button { padding: 0 6px; } }
`;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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

function mount() {
    if (document.getElementById("ebayednoob-page-chrome")) return; // already on the page
    const script = document.querySelector('script[src*="page-chrome.js"]');
    const position = ["top", "bottom-left", "bottom-right"].includes(script?.dataset.position) ? script.dataset.position : "top";
    const home = script?.dataset.home || new URL("index.html", SITE_ROOT).href;
    const extra = script?.dataset.extraHref
        ? { href: script.dataset.extraHref, label: script.dataset.extraLabel || "More", icon: ICONS[script.dataset.extraIcon] ? script.dataset.extraIcon : "book" }
        : null;

    const host = document.createElement("div");
    host.id = "ebayednoob-page-chrome";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `
        <style>${CSS}</style>
        <nav class="dock" data-position="${position}" aria-label="Site">
            <button class="icon expand" type="button" title="Show site menu" aria-label="Show site menu" aria-expanded="false">${ICONS.grip}</button>
            <div class="full">
                <a href="${esc(home)}" title="Back to the main site">${ICONS.home}<span class="label">Home</span></a>
                ${extra ? `<a class="extra" href="${esc(extra.href)}" title="${esc(extra.label)}">${ICONS[extra.icon]}<span class="label">${esc(extra.label)}</span></a>` : ""}
                <span class="sep"></span>
                ${SOCIAL_LINKS.map((l) => `<a class="icon" href="${esc(l.href)}" target="_blank" rel="noopener noreferrer" title="${esc(l.label)}" aria-label="${esc(l.label)}">${ICONS[l.icon]}</a>`).join("")}
                <span class="sep"></span>
                <div class="auth">
                    <button class="signin" type="button" hidden>${ICONS.google}<span class="label">Sign in</span></button>
                    <button class="profile" type="button" hidden aria-haspopup="menu" aria-expanded="false"></button>
                    <div class="menu" role="menu" hidden>
                        <div class="who"></div>
                        <a role="menuitem" href="${esc(new URL("control-panel/index.html", SITE_ROOT).href)}">Control Panel</a>
                        <button role="menuitem" class="danger signout" type="button">Sign out</button>
                    </div>
                </div>
                <button class="icon collapse" type="button" title="Hide site menu" aria-label="Hide site menu">${ICONS.hide}</button>
            </div>
        </nav>`;
    document.body.appendChild(host);

    const $ = (sel) => root.querySelector(sel);
    const dock = $(".dock"), expandBtn = $(".expand"), signinBtn = $(".signin"), profileBtn = $(".profile"), menu = $(".menu");

    const setCollapsed = (v, persist = true) => {
        dock.classList.toggle("collapsed", v);
        expandBtn.setAttribute("aria-expanded", String(!v));
        if (v) closeMenu();
        if (persist) saveCollapsed(v);
    };
    const closeMenu = () => { menu.hidden = true; profileBtn.setAttribute("aria-expanded", "false"); };
    setCollapsed(readCollapsed(), false);
    expandBtn.addEventListener("click", () => setCollapsed(false));
    $(".collapse").addEventListener("click", () => setCollapsed(true));
    profileBtn.addEventListener("click", () => {
        menu.hidden = !menu.hidden;
        profileBtn.setAttribute("aria-expanded", String(!menu.hidden));
    });
    document.addEventListener("pointerdown", (e) => { if (!e.composedPath().includes(host)) closeMenu(); });
    window.addEventListener("blur", closeMenu); // clicks inside an iframe never reach this document
    root.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

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
