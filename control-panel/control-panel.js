// Control Panel: account area for every signed-in user, plus site management for admins.
// UI gating here is for convenience only; firestore.rules is what actually protects the data.
import { auth, db, signInWithGoogle, signOut, onAuthStateChanged, getAdminStatus, BOOTSTRAP_ADMIN_EMAILS, normalizeEmail, sessionEmail } from "../assets/js/firebase.js";
import { validateUsername, checkUsername, claimUsername, cooldownRemaining, formatDuration, loadGuest, saveGuest, clearGuest, setGuestUsername } from "../assets/js/identity.js";
import {
    createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail,
    sendEmailVerification, updateProfile
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
    doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { startBackground } from "../assets/js/background.js";
import { isConnected, dispatchWorkflow } from "../assets/js/github-store.js";
import { changeAdminAccess, loadAdminLog } from "../assets/js/admin-access.js";
import { loadAll, saveItem, deleteItem, importSeed, loadFeedConfig, saveFeedConfig, loadArticleSyncConfig, saveArticleSyncConfig, COLLECTIONS } from "../assets/js/research-store.js";
import { DEFAULT_ARTICLE_SYNC, PLATFORMS, normalizeArticleConfig, syncArticles, groupArticles, mergeArticleItems, fetchPlan, fetchArticleMeta, detectPlatform } from "../assets/js/article-sync.js";
import { DEFAULT_FEED_CONFIG, SOURCE_TYPES, normalizeConfig, scanFeed, toList, slugify, safeUrl } from "../assets/js/feed-core.js";
import { $, $$, esc, fmtDate, timeAgo, toast, fetchJson, resolveLink, SITE_ROOT, CROSSPOST_PLATFORMS } from "../assets/js/ui.js";

startBackground();

const REPO = "BioChainAI/Ebayednoob";
const FEED_WORKFLOW_URL = `https://github.com/${REPO}/actions/workflows/update-research-feed.yml`;

const state = { user: null, profile: null, isAdmin: false, adminStatus: null, guest: null, feedConfig: null };
let viewTimers = [];
// Each route renders into a fresh container. Views capture it when they start, so a slow view
// that finishes after you navigate away writes into a detached element, not the new page.
const viewHost = $("#view-root");
let currentView = viewHost;

// ---------- Auth screen ----------

let authMode = "signin";
function setAuthMode(mode) {
    authMode = mode;
    $$("[data-auth-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.authMode === mode)));
    $("#name-row").classList.toggle("hidden", mode !== "register");
    $("#email-submit").textContent = mode === "register" ? "Create account" : "Sign in";
    $("#auth-password").autocomplete = mode === "register" ? "new-password" : "current-password";
}
$$("[data-auth-mode]").forEach((b) => b.addEventListener("click", () => setAuthMode(b.dataset.authMode)));

function authError(e) {
    const msg = {
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/user-not-found": "No account exists for that email.",
        "auth/wrong-password": "Email or password is incorrect.",
        "auth/email-already-in-use": "An account already exists for that email. Try signing in, or continue with Google.",
        "auth/weak-password": "Use a password of at least 8 characters.",
        "auth/popup-closed-by-user": "The Google sign-in window was closed.",
        "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication yet.",
        "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication settings.",
        "auth/too-many-requests": "Too many attempts. Please wait a moment and try again."
    }[e.code] || e.message;
    const el = $("#auth-error");
    el.textContent = msg;
    el.classList.remove("hidden");
}

$("#google-login").addEventListener("click", () => signInWithGoogle().catch(authError));
$("#email-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#auth-error").classList.add("hidden");
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    try {
        if (authMode === "register") {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const name = $("#auth-name").value.trim();
            if (name) await updateProfile(cred.user, { displayName: name });
            await sendEmailVerification(cred.user);
            toast("Account created. Check your inbox to verify your email.", "success");
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (err) {
        authError(err);
    }
});
$("#forgot-btn").addEventListener("click", async () => {
    const email = $("#auth-email").value.trim();
    if (!email) return authError({ message: "Enter your email above first." });
    try {
        await sendPasswordResetEmail(auth, email);
        toast("Password reset email sent (if an account exists).", "success");
    } catch (err) {
        authError(err);
    }
});

const logout = () => signOut(auth);
$("#header-logout").addEventListener("click", logout);
$("#header-signin").addEventListener("click", () => showLogin());
$("#side-signin").addEventListener("click", (e) => { e.preventDefault(); showLogin(); });

function showScreen(name) {
    for (const s of ["loading", "login", "app"]) $(`#view-${s}`).classList.toggle("hidden", s !== name);
}

const displayName = () => state.profile?.username || state.guest?.username || "";

function renderIdentity() {
    const u = state.user;
    const name = displayName();
    const role = u ? (state.isAdmin ? "Administrator" : "Member") : "Guest Observer";
    const email = u ? sessionEmail(u) : "";
    $("#header-identity").textContent = u ? `${name || u.displayName || email || "Member"}${state.isAdmin ? " · Admin" : ""}` : (name ? `${name} · Guest Observer` : "Guest Observer");
    $("#header-signin").classList.toggle("hidden", !!u || !$("#view-login").classList.contains("hidden"));
    $("#header-logout").classList.toggle("hidden", !u);
    $("#guest-label").textContent = name && !u ? `${name} (Guest Observer)` : "Guest Observer";
    const initial = (name || u?.displayName || email || "G")[0].toUpperCase();
    $("#side-photo").src = u?.photoURL || u?.providerData?.find((p) => p.photoURL)?.photoURL || `https://placehold.co/88x88/1f2937/5eead4?text=${encodeURIComponent(initial)}`;
    $("#side-name").textContent = name || (u ? "Choose a username" : "Guest Observer");
    $("#side-role").innerHTML = `<span class="${state.isAdmin ? "text-amber-300" : u ? "text-teal-300" : "text-gray-300"}">${role}</span>`;
    $("#side-email").textContent = email;
    $("#admin-nav").classList.toggle("hidden", !state.isAdmin);
    $$("[data-member-only]").forEach((el) => el.classList.toggle("hidden", !u));
    $("#side-signin").classList.toggle("hidden", !!u);
}

function showLogin() {
    showScreen("login");
    renderIdentity();
}

function enterGuest() {
    state.guest = loadGuest() || { createdAt: new Date().toISOString() };
    showScreen("app");
    renderIdentity();
    if (!state.guest.username) openUsernameDialog({ guest: true });
    route();
}
$("#guest-continue").addEventListener("click", enterGuest);

onAuthStateChanged(auth, async (user) => {
    state.user = user;
    state.profile = null;
    state.isAdmin = false;
    state.adminStatus = null;
    state.guest = loadGuest();
    if (!user) {
        // Returning Guest Observers go straight in; everyone else sees the sign-in screen.
        if (state.guest?.username) enterGuest();
        else showLogin();
        return;
    }
    showScreen("loading");
    await recordLogin(user);
    state.adminStatus = await getAdminStatus(user);
    state.isAdmin = state.adminStatus.isAdmin;
    if (state.isAdmin) await ensureAdminDoc(user);
    showScreen("app");
    renderIdentity();
    if (!state.profile?.username) openUsernameDialog({ guest: false });
    route();
});

// Copy Google/Firebase account details into users/{uid} on every visit.
async function recordLogin(user) {
    const ref = doc(db, "users", user.uid);
    try {
        const snap = await getDoc(ref);
        const google = user.providerData.find((p) => p.providerId === "google.com");
        const base = {
            email: sessionEmail(user),
            displayName: user.displayName || google?.displayName || "",
            photoURL: user.photoURL || google?.photoURL || "",
            providers: user.providerData.map((p) => p.providerId),
            lastLoginAt: serverTimestamp()
        };
        if (!snap.exists()) base.createdAt = serverTimestamp();
        await setDoc(ref, base, { merge: true });
        state.profile = { ...(snap.exists() ? snap.data() : {}), ...base, lastLoginAt: new Date().toISOString() };
    } catch (e) {
        console.warn("Could not record login:", e.message);
        state.profile = { email: sessionEmail(user), syncError: e.message };
    }
}

// Record the bootstrap admin in admins/{email} and the admin log the first time they sign in,
// so the log starts with the site owner.
async function ensureAdminDoc(user) {
    const email = state.adminStatus?.tokenEmail;
    if (!email || state.adminStatus.via !== "bootstrap email") return;
    try {
        const snap = await getDoc(doc(db, "admins", email));
        if (!snap.exists() || snap.data().active === false || !snap.data().logId) {
            await changeAdminAccess(user, "bootstrap", { email, uid: user.uid, name: state.profile?.username || state.profile?.displayName || "", note: "Site owner (bootstrap admin)" });
        }
    } catch (e) {
        console.warn("Could not record the bootstrap admin:", e.message);
    }
}

// ---------- Username dialog ----------

function openUsernameDialog({ guest }) {
    const dlg = $("#username-dialog");
    const input = $("#username-input");
    const status = $("#username-status");
    const save = $("#username-save");
    $("#username-intro").textContent = guest
        ? "Guest Observer usernames are saved only in this browser. We check that the name isn't already taken by a member. You can change it once a week."
        : "This is how you appear across the site. Usernames are unique and can be changed once a week.";
    $("#username-cancel").textContent = guest ? "Back" : "Sign out";
    const suggestion = guest ? "" : (loadGuest()?.username || (state.user?.displayName || "").replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 20));
    input.value = suggestion;
    let seq = 0;
    const check = async () => {
        const mine = ++seq;
        const name = input.value.trim();
        save.disabled = true;
        const problem = validateUsername(name);
        if (problem) {
            status.textContent = problem;
            status.className = "text-xs mt-1 text-amber-300";
            return;
        }
        status.textContent = "Checking…";
        status.className = "text-xs mt-1 text-gray-400";
        const r = await checkUsername(name, state.user?.uid);
        if (mine !== seq) return;
        status.textContent = r.available ? "Available" : r.reason;
        status.className = `text-xs mt-1 ${r.available ? "text-emerald-300" : "text-red-300"}`;
        save.disabled = !r.available;
    };
    let t;
    input.oninput = () => { clearTimeout(t); t = setTimeout(check, 300); };
    $("#username-cancel").onclick = () => {
        dlg.close();
        if (guest) { state.guest = loadGuest(); if (!state.guest?.username) showLogin(); }
        else logout();
    };
    dlg.oncancel = (e) => e.preventDefault(); // a username is required to continue
    $("#username-form").onsubmit = async (e) => {
        e.preventDefault();
        save.disabled = true;
        try {
            if (guest) state.guest = await setGuestUsername(input.value);
            else state.profile = await claimUsername(state.user, state.profile, input.value);
            dlg.close();
            renderIdentity();
            route();
            toast("Username saved.", "success");
        } catch (err) {
            status.textContent = err.message;
            status.className = "text-xs mt-1 text-red-300";
        }
    };
    dlg.showModal();
    if (suggestion) check();
    input.focus();
}

// ---------- Routing ----------

const VIEWS = {
    overview: renderOverview,
    profile: renderProfile,
    session: renderSession,
    security: renderSecurity,
    dashboard: renderDashboard,
    publications: () => renderCollection("publications"),
    articles: () => renderCollection("articles"),
    "feed-curated": () => renderCollection("feedItems"),
    "feed-automation": renderAutomation,
    "article-sources": renderArticleSources,
    users: renderUsers,
    data: renderDataTools
};
const ADMIN_VIEWS = new Set(["dashboard", "publications", "articles", "article-sources", "feed-curated", "feed-automation", "users", "data"]);

const MEMBER_VIEWS = new Set(["security"]);

function route() {
    if (!state.user && !state.guest) return;
    viewTimers.forEach(clearInterval);
    viewTimers = [];
    let view = location.hash.replace(/^#/, "") || (state.isAdmin ? "dashboard" : "overview");
    if (!VIEWS[view] || (ADMIN_VIEWS.has(view) && !state.isAdmin) || (MEMBER_VIEWS.has(view) && !state.user)) view = "overview";
    $$(".side-link").forEach((a) => { if (a.dataset.view === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    const root = currentView = document.createElement("div");
    viewHost.replaceChildren(root);
    root.innerHTML = `<div class="panel p-10 text-center text-gray-400">Loading…</div>`;
    Promise.resolve(VIEWS[view]()).catch((e) => {
        root.innerHTML = `<div class="panel p-6 border-red-700/60"><h2 class="text-lg font-semibold text-red-300">Could not load this section</h2><p class="text-gray-400 mt-2 text-sm">${esc(e.message)}</p><p class="text-gray-500 mt-2 text-xs">If this says “Missing or insufficient permissions”, deploy firestore.rules (see control-panel/README.md).</p></div>`;
    });
}
window.addEventListener("hashchange", route);

// "Run now" buttons: start the sync workflow through the GitHub API when a token with
// Actions access is saved (Studio → GitHub); otherwise open the workflow page.
document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-run-sync]");
    if (!b) return;
    if (!isConnected()) {
        window.open(FEED_WORKFLOW_URL, "_blank", "noopener");
        toast("On GitHub, press “Run workflow”. Connect GitHub in a Studio to start it from here.", "info");
        return;
    }
    b.disabled = true;
    try {
        await dispatchWorkflow("update-research-feed.yml");
        toast("Sync started. Results appear on the site in a few minutes.", "success");
    } catch (err) {
        toast(`${err.message}. The token may need “Actions: Read and write”.`, "error");
        window.open(FEED_WORKFLOW_URL, "_blank", "noopener");
    } finally {
        b.disabled = false;
    }
});

const heading = (title, sub = "", actions = "") => `
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5">
        <div><h1 class="text-2xl font-semibold text-teal-400">${title}</h1>${sub ? `<p class="text-gray-400 text-sm mt-1">${sub}</p>` : ""}</div>
        <div class="flex flex-wrap gap-2">${actions}</div>
    </div>`;

const tsToDate = (v) => (v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v || null);

// ---------- User views ----------

// Learning hubs save completion flags at artifacts/default-app-id/users/{uid}/tutorial_statuses/progress.
async function loadTutorialProgress(uid) {
    try {
        const snap = await getDoc(doc(db, "artifacts", "default-app-id", "users", uid, "tutorial_statuses", "progress"));
        return snap.exists() ? Object.entries(snap.data().completion || {}) : [];
    } catch {
        return [];
    }
}

const providerLabel = (id) => ({ "google.com": "Google", password: "Email & password" }[id] || id);

async function renderOverview() {
    const root = currentView;
    const u = state.user;
    const name = displayName();
    if (!u) {
        const g = state.guest || {};
        root.innerHTML = `
            ${heading(`Welcome${name ? `, ${esc(name)}` : ""}`, "You are browsing as a Guest Observer.")}
            <div class="grid md:grid-cols-2 gap-4">
                <div class="panel p-5">
                    <h2 class="font-semibold mb-3">Guest Observer profile</h2>
                    <dl class="text-sm grid grid-cols-[8rem_1fr] gap-y-2">
                        <dt class="text-gray-400">Username</dt><dd>${esc(g.username || "—")}</dd>
                        <dt class="text-gray-400">Role</dt><dd>Guest Observer</dd>
                        <dt class="text-gray-400">Stored</dt><dd>Only in this browser</dd>
                        <dt class="text-gray-400">Since</dt><dd>${esc(fmtDate(g.createdAt))}</dd>
                    </dl>
                </div>
                <div class="panel p-5">
                    <h2 class="font-semibold mb-2">Get a member account</h2>
                    <p class="text-sm text-gray-400">Sign in with Google or email to keep your username across devices, save tutorial progress and, for site admins, manage the site.</p>
                    <button id="ov-signin" class="btn btn-blue btn-sm mt-3">Sign in</button>
                </div>
            </div>`;
        $("#ov-signin").onclick = showLogin;
        return;
    }
    const progress = await loadTutorialProgress(u.uid);
    const done = progress.filter(([, v]) => v).length;
    const email = sessionEmail(u);
    root.innerHTML = `
        ${heading(`Welcome${name ? `, ${esc(name)}` : ""}`, "Your Ebayednoob account at a glance.")}
        <div class="grid md:grid-cols-2 gap-4">
            <div class="panel p-5">
                <h2 class="font-semibold mb-3">Account</h2>
                <dl class="text-sm grid grid-cols-[8rem_1fr] gap-y-2">
                    <dt class="text-gray-400">Username</dt><dd>${esc(name || "—")}</dd>
                    <dt class="text-gray-400">Email</dt><dd class="break-all">${esc(email || "—")}</dd>
                    <dt class="text-gray-400">Name</dt><dd>${esc(state.profile?.displayName || "—")}</dd>
                    <dt class="text-gray-400">Sign-in</dt><dd>${u.providerData.map((x) => esc(providerLabel(x.providerId))).join(", ")}</dd>
                    <dt class="text-gray-400">Member since</dt><dd>${esc(fmtDate(u.metadata.creationTime))}</dd>
                    <dt class="text-gray-400">Role</dt><dd>${state.isAdmin ? `<span class="text-amber-300 font-semibold">Administrator</span>` : `Member <a href="#session" class="text-xs text-teal-300 hover:underline ml-1">why?</a>`}</dd>
                </dl>
            </div>
            <div class="panel p-5">
                <h2 class="font-semibold mb-3">Quick links</h2>
                <ul class="space-y-2 text-sm">
                    <li><a class="text-teal-300 hover:underline" href="../Pages/Research/index.html#publications">Research publications</a></li>
                    <li><a class="text-teal-300 hover:underline" href="../Pages/Research/index.html#stay-current">Stay Current feed</a></li>
                    <li><a class="text-teal-300 hover:underline" href="../Pages/Research/index.html#articles">Articles</a></li>
                    <li><a class="text-teal-300 hover:underline" href="#profile">Username &amp; feed topics</a></li>
                    <li><a class="text-teal-300 hover:underline" href="#session">Session &amp; sync details</a></li>
                    ${state.isAdmin ? `<li><a class="text-amber-300 hover:underline" href="#dashboard">Admin dashboard</a></li><li><a class="text-amber-300 hover:underline" href="article-studio.html">Article Studio</a> · <a class="text-amber-300 hover:underline" href="publication-studio.html">Publication Studio</a></li>` : ""}
                </ul>
            </div>
            <div class="panel p-5 md:col-span-2">
                <h2 class="font-semibold mb-3">Tutorial progress ${progress.length ? `<span class="text-sm font-normal text-gray-400">· ${done} of ${progress.length} marked complete</span>` : ""}</h2>
                ${progress.length ? `<ul class="text-sm grid sm:grid-cols-2 gap-x-6">${progress.map(([k, v]) => `<li class="flex justify-between gap-4 border-b border-gray-700/50 py-1.5"><span class="truncate">${esc(k)}</span><span class="${v ? "text-emerald-300" : "text-gray-500"}">${v ? "Complete" : "In progress"}</span></li>`).join("")}</ul>` : `<p class="text-sm text-gray-400">No tutorial progress recorded yet. Mark tutorials complete in the learning hubs and they will show up here.</p>`}
            </div>
        </div>`;
}

// Username card with a live countdown to the next allowed change.
function usernameCardHtml() {
    return `
        <div class="panel p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div class="lbl">Username</div>
                    <div class="text-xl font-semibold">${esc(displayName() || "—")}</div>
                    <div class="text-xs text-gray-500 mt-1">${state.user ? "Unique across all members." : "Stored in this browser only; checked against member usernames."} One change per week.</div>
                </div>
                <div class="text-right">
                    <div id="un-timer" class="text-sm"></div>
                    <button id="un-change" class="btn btn-ghost btn-sm mt-2">Change username</button>
                </div>
            </div>
        </div>`;
}

function startUsernameTimer() {
    const changedAt = state.user ? state.profile?.usernameChangedAt : state.guest?.usernameChangedAt;
    const tick = () => {
        const el = $("#un-timer");
        if (!el) return;
        const wait = displayName() ? cooldownRemaining(changedAt) : 0;
        el.innerHTML = wait ? `<span class="text-gray-400">Next change in</span> <span class="font-mono text-amber-200">${esc(formatDuration(wait))}</span>` : `<span class="text-emerald-300">You can change it now</span>`;
        $("#un-change").disabled = !!wait;
    };
    tick();
    viewTimers.push(setInterval(tick, 1000));
    $("#un-change").onclick = () => openUsernameDialog({ guest: !state.user });
}

async function renderProfile() {
    const root = currentView;
    if (!state.feedConfig) state.feedConfig = (await loadFeedConfig()).config;
    const prefs = state.user ? state.profile?.preferences : state.guest?.preferences;
    const chosen = new Set(prefs?.feedTopics || []);
    const topics = state.feedConfig.topics.filter((t) => t.enabled);
    root.innerHTML = `
        ${heading("Profile & preferences")}
        <div class="space-y-4 max-w-2xl">
            ${usernameCardHtml()}
            <form id="profile-form" class="panel p-5 space-y-5">
                ${state.user ? `<div><label class="lbl" for="pf-name">Display name</label><input id="pf-name" class="field" value="${esc(state.profile?.displayName || state.user.displayName || "")}"></div>` : ""}
                <fieldset>
                    <legend class="lbl">Stay Current topics</legend>
                    <p class="text-xs text-gray-500 mb-2">The Stay Current feed opens filtered to these topics. Leave all unchecked to see everything.</p>
                    <div class="grid sm:grid-cols-2 gap-2">
                        ${topics.map((t) => `<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="topic" value="${esc(t.name)}" ${chosen.has(t.name) ? "checked" : ""} class="accent-teal-500"> ${esc(t.name)}</label>`).join("")}
                    </div>
                </fieldset>
                <button class="btn btn-primary">Save</button>
            </form>
        </div>`;
    startUsernameTimer();
    $("#profile-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const feedTopics = $$('input[name="topic"]:checked').map((i) => i.value);
        try {
            if (!state.user) {
                state.guest = { ...state.guest, preferences: { feedTopics } };
                saveGuest(state.guest);
            } else {
                const name = $("#pf-name").value.trim();
                if (name !== (state.user.displayName || "")) await updateProfile(state.user, { displayName: name });
                await setDoc(doc(db, "users", state.user.uid), { displayName: name, preferences: { feedTopics } }, { merge: true });
                state.profile = { ...state.profile, displayName: name, preferences: { feedTopics } };
            }
            toast("Profile saved.", "success");
        } catch (err) {
            toast(`Could not save: ${err.message}`, "error");
        }
    });
}

// ---------- Session & sync ----------

function kv(rows) {
    return `<dl class="text-sm grid grid-cols-[10rem_1fr] gap-y-1.5">${rows.map(([k, v]) => `<dt class="text-gray-400">${esc(k)}</dt><dd class="break-all">${v}</dd>`).join("")}</dl>`;
}

async function renderSession() {
    const root = currentView;
    const u = state.user;
    if (!u) {
        const g = state.guest || {};
        root.innerHTML = `
            ${heading("Session & sync", "Guest Observer session: nothing is sent to the server.")}
            <div class="space-y-4 max-w-3xl">
                <div class="panel p-5">${kv([["Mode", "Guest Observer"], ["Username", esc(g.username || "—")], ["Stored in", "This browser (localStorage)"], ["Created", esc(fmtDate(g.createdAt))], ["Feed topics", esc((g.preferences?.feedTopics || []).join(", ") || "All")], ["Admin features", `<span class="text-gray-300">Not available to guests</span>`]])}</div>
                <div class="panel p-5 flex flex-wrap gap-2">
                    <button id="ss-signin" class="btn btn-blue btn-sm">Sign in to sync</button>
                    <button id="ss-clear" class="btn btn-danger btn-sm">Delete guest profile</button>
                </div>
            </div>`;
        $("#ss-signin").onclick = showLogin;
        $("#ss-clear").onclick = () => {
            if (!confirm("Delete the Guest Observer profile stored in this browser?")) return;
            clearGuest();
            state.guest = null;
            showLogin();
        };
        return;
    }
    const st = state.adminStatus || {};
    const google = u.providerData.find((p) => p.providerId === "google.com");
    const p = state.profile || {};
    const ok = (b) => (b ? `<span class="text-emerald-300">yes</span>` : `<span class="text-red-300">no</span>`);
    const diagnosis = state.isAdmin
        ? `<p class="text-emerald-300">Admin access granted via ${esc(st.via)}.</p>`
        : `<div class="space-y-2 text-gray-300">
            <p>You are signed in as a <b>Member</b>. ${st.notes?.length ? esc(st.notes.join(" ")) : `${esc(st.tokenEmail || "This email")} is not the bootstrap admin and is not in the admins list.`}</p>
            ${!st.tokenEmail ? `<p>Your Google account reports <b>${esc(google?.email || "no email")}</b>, but the sign-in token the security rules see has no email. This happens when Firebase Authentication is set to allow multiple accounts per email. Fix it either way:</p>
            <ol class="list-decimal pl-5 space-y-1">
                <li>Firebase console → Authentication → Settings → <b>User account linking</b> → “Link accounts that use the same email”, then sign out and back in. Or:</li>
                <li>Add your UID to <code>ownerUids()</code> in <code>firestore.rules</code> and to <code>BOOTSTRAP_ADMIN_UIDS</code> in <code>assets/js/firebase.js</code>: <code class="text-teal-200">'${esc(u.uid)}'</code></li>
            </ol>` : ""}
        </div>`;
    root.innerHTML = `
        ${heading("Session & sync", "What your Google account, Firebase Authentication and the site database currently report.", `<button id="ss-sync" class="btn btn-primary">Sync now</button>`)}
        <div class="space-y-4 max-w-4xl">
            <div class="panel p-5 ${state.isAdmin ? "border-emerald-600/50" : "border-amber-600/50"}">
                <h2 class="font-semibold mb-2">Admin access</h2>${diagnosis}
            </div>
            <div class="panel p-5"><h2 class="font-semibold mb-3">Google account</h2>${google ? kv([
                ["Name", esc(google.displayName || "—")], ["Email", esc(google.email || "—")],
                ["Photo", google.photoURL ? `<img src="${esc(google.photoURL)}" alt="" referrerpolicy="no-referrer" class="w-8 h-8 rounded-full inline-block">` : "—"],
                ["Google ID", esc(google.uid)]]) : `<p class="text-sm text-gray-400">This session did not sign in with Google.</p>`}</div>
            <div class="panel p-5"><h2 class="font-semibold mb-3">Firebase Authentication</h2>${kv([
                ["UID", `<code>${esc(u.uid)}</code> <button id="ss-copy" class="text-xs text-teal-300 hover:underline">copy</button>`],
                ["Account email", esc(u.email || "(none)")], ["Email verified", ok(u.emailVerified)],
                ["Token email", esc(st.tokenEmail || "(none)")], ["Token email trusted", ok(st.tokenEmailVerified)],
                ["Signed in with", esc(providerLabel(st.signInProvider || "—"))],
                ["Providers", esc(u.providerData.map((x) => providerLabel(x.providerId)).join(", "))],
                ["Created", esc(fmtDate(u.metadata.creationTime, { dateStyle: "medium", timeStyle: "short" }))],
                ["Last sign-in", esc(fmtDate(u.metadata.lastSignInTime, { dateStyle: "medium", timeStyle: "short" }))]])}</div>
            <div class="panel p-5"><h2 class="font-semibold mb-3">Site database (Firestore users/${esc(u.uid.slice(0, 6))}…)</h2>${p.syncError ? `<p class="text-red-300 text-sm mb-2">Could not read or write your profile: ${esc(p.syncError)}</p>` : ""}${kv([
                ["Username", esc(p.username || "—")], ["Username changed", esc(p.usernameChangedAt ? fmtDate(tsToDate(p.usernameChangedAt), { dateStyle: "medium", timeStyle: "short" }) : "—")],
                ["Display name", esc(p.displayName || "—")], ["Stored email", esc(p.email || "—")],
                ["Feed topics", esc((p.preferences?.feedTopics || []).join(", ") || "All")],
                ["Joined", esc(fmtDate(tsToDate(p.createdAt)))], ["Last login", esc(p.lastLoginAt ? timeAgo(tsToDate(p.lastLoginAt)) : "—")]])}</div>
        </div>`;
    $("#ss-copy").onclick = () => navigator.clipboard?.writeText(u.uid).then(() => toast("UID copied.", "success"));
    $("#ss-sync").onclick = async () => {
        try {
            await u.reload();
            await recordLogin(auth.currentUser || u);
            state.adminStatus = await getAdminStatus(auth.currentUser || u, { forceRefresh: true });
            state.isAdmin = state.adminStatus.isAdmin;
            renderIdentity();
            toast("Synced with your Google account and the site database.", "success");
            route();
        } catch (err) {
            toast(`Sync failed: ${err.message}`, "error");
        }
    };
}

function renderSecurity() {
    const root = currentView;
    const u = state.user;
    const hasPassword = u.providerData.some((p) => p.providerId === "password");
    root.innerHTML = `
        ${heading("Security")}
        <div class="space-y-4 max-w-2xl">
            <div class="panel p-5">
                <h2 class="font-semibold">Email verification</h2>
                <p class="text-sm text-gray-400 mt-1">${u.emailVerified ? "Your email address is verified." : "Your email address is not verified yet. Admin access always requires a verified email."}</p>
                ${u.emailVerified ? "" : `<button id="sec-verify" class="btn btn-primary btn-sm mt-3">Send verification email</button>`}
            </div>
            <div class="panel p-5">
                <h2 class="font-semibold">Password</h2>
                <p class="text-sm text-gray-400 mt-1">${hasPassword ? "Send yourself a link to choose a new password." : "You sign in with Google, so your password is managed by your Google account."}</p>
                ${hasPassword ? `<button id="sec-reset" class="btn btn-ghost btn-sm mt-3">Send password reset email</button>` : `<a class="btn btn-ghost btn-sm mt-3" href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">Google account security</a>`}
            </div>
            <div class="panel p-5">
                <h2 class="font-semibold">Session</h2>
                <p class="text-sm text-gray-400 mt-1">Last sign-in ${esc(fmtDate(u.metadata.lastSignInTime, { dateStyle: "medium", timeStyle: "short" }))}.</p>
                <button id="sec-logout" class="btn btn-danger btn-sm mt-3">Sign out</button>
            </div>
        </div>`;
    $("#sec-verify")?.addEventListener("click", () => sendEmailVerification(u).then(() => toast("Verification email sent.", "success"), (e) => toast(e.message, "error")));
    $("#sec-reset")?.addEventListener("click", () => sendPasswordResetEmail(auth, u.email).then(() => toast("Password reset email sent.", "success"), (e) => toast(e.message, "error")));
    $("#sec-logout").addEventListener("click", logout);
}

// ---------- Admin: dashboard ----------

async function renderDashboard() {
    const root = currentView;
    const [pubs, arts, items, users, admins, feed] = await Promise.all([
        loadAll("publications"), loadAll("articles"), loadAll("feedItems"),
        getDocs(collection(db, "users")).then((s) => s.size).catch(() => "—"),
        getDocs(collection(db, "admins")).then((s) => s.docs.filter((d) => d.data().active !== false).length).catch(() => "—"),
        fetchJson(`${SITE_ROOT}Pages/Research/data/feed.json`).catch(() => null)
    ]);
    const tile = (label, value, sub, href) => `<a href="${href}" class="panel p-4 block hover:border-teal-500/60"><div class="text-xs uppercase tracking-wide text-gray-400">${label}</div><div class="text-2xl font-semibold mt-1">${value}</div><div class="text-xs text-gray-500 mt-1">${sub}</div></a>`;
    const pub = (list) => list.filter((x) => x.status === "published").length;
    const failing = (feed?.sourceStatus || []).filter((s) => !s.ok);
    root.innerHTML = `
        ${heading("Admin dashboard", "Manage the Research hub, the Stay Current automation and user access.")}
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            ${tile("Publications", pubs.length, `${pub(pubs)} published · ${pubs.length - pub(pubs)} draft`, "#publications")}
            ${tile("Articles", arts.length, `${pub(arts)} published · ${arts.length - pub(arts)} draft`, "#articles")}
            ${tile("Curated feed items", items.length, `${items.filter((i) => i.pinned).length} pinned`, "#feed-curated")}
            ${tile("Users", users, "signed up", "#users")}
            ${tile("Admins", admins, "active grants · see the admin log", "#users")}
            ${tile("Feed snapshot", feed?.generatedAt ? timeAgo(feed.generatedAt) : "none", feed?.generatedAt ? `${feed.items?.length || 0} items · ${failing.length} failing source(s)` : "run the workflow to create one", "#feed-automation")}
        </div>
        <div class="panel p-5 text-sm text-gray-300 space-y-2">
            <h2 class="font-semibold text-gray-100">Stay Current snapshot</h2>
            <p>A GitHub Action scans every enabled source daily using the settings saved under <a class="text-teal-300 hover:underline" href="#feed-automation">Feed: automation</a>, then publishes <code class="text-teal-200">Pages/Research/data/feed.json</code> and grows the archive. Visitors can also press “Refresh feed” for a live scan in their browser.</p>
            <button data-run-sync class="btn btn-ghost btn-sm">Run the snapshot workflow now</button>
            ${failing.length ? `<p class="text-amber-300">Failing in the last snapshot: ${failing.map((f) => esc(`${f.name} (${f.error})`)).join(", ")}</p>` : ""}
        </div>`;
}

// ---------- Admin: generic collection CRUD ----------

const STATUS_OPTIONS = [["published", "Published"], ["draft", "Draft (hidden)"]];

const SCHEMAS = {
    publications: {
        title: "Publications", noun: "publication",
        sub: "Your papers, simulations and reports. The 10 most recent show on the Publications tab; older ones move to its archive.",
        fields: [
            { key: "title", label: "Title", required: true },
            { key: "date", label: "Publication date", type: "date", required: true },
            { key: "type", label: "Type", type: "select", options: ["Paper", "Preprint", "Simulation", "Report", "Dataset", "Talk", "Other"].map((x) => [x, x]) },
            { key: "authors", label: "Authors (comma separated)", type: "list" },
            { key: "venue", label: "Venue / publisher" },
            { key: "abstract", label: "Abstract", type: "textarea" },
            { key: "tags", label: "Tags (comma separated)", type: "list" },
            { key: "url", label: "Main link (URL or site path, e.g. research_papers/…/index.html)", type: "link" },
            { key: "pdfUrl", label: "PDF link (URL or site path)", type: "link" },
            { key: "doi", label: "DOI (e.g. 10.1234/abcd)" },
            { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS }
        ]
    },
    articles: {
        title: "Articles", noun: "article",
        sub: "LinkedIn articles with optional cross-posts. The 10 most recent show on the Articles tab; older ones move to its archive.",
        fields: [
            { key: "title", label: "Title", required: true },
            { key: "date", label: "Publication date", type: "date", required: true },
            { key: "linkedinUrl", label: "LinkedIn article URL", type: "link", required: true },
            { key: "summary", label: "Summary", type: "textarea" },
            { key: "tags", label: "Tags (comma separated)", type: "list" },
            { key: "coverImage", label: "Cover image (URL or site path, optional)", type: "link" },
            ...CROSSPOST_PLATFORMS.map((p) => ({ key: `crossposts.${p.key}`, label: `${p.label} cross-post URL (optional)`, type: "link" })),
            { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS }
        ]
    },
    feedItems: {
        title: "Feed: curated items", noun: "curated item",
        sub: "Hand-picked items for the Stay Current feed. Pinned items always appear at the top; the rest mix in with scanned results by date.",
        fields: [
            { key: "title", label: "Title", required: true },
            { key: "url", label: "Link to the original", type: "link", required: true },
            { key: "date", label: "Publication date", type: "date", required: true },
            { key: "sourceName", label: "Source name (e.g. Nature, arXiv)", required: true },
            { key: "sourceUrl", label: "Source homepage", type: "link" },
            { key: "summary", label: "Summary / excerpt", type: "textarea" },
            { key: "authors", label: "Authors (comma separated)", type: "list" },
            { key: "venue", label: "Journal / venue" },
            { key: "doi", label: "DOI" },
            { key: "topics", label: "Topics", type: "topics" },
            { key: "pinned", label: "Pin to the top of the feed", type: "checkbox" },
            { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS }
        ]
    }
};

const getPath = (o, p) => p.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
function setPath(o, p, v) {
    const keys = p.split(".");
    let cur = o;
    keys.slice(0, -1).forEach((k) => { cur = cur[k] = cur[k] && typeof cur[k] === "object" ? cur[k] : {}; });
    cur[keys.at(-1)] = v;
}

const STUDIO_PAGES = { articles: "article-studio.html", publications: "publication-studio.html" };

async function renderCollection(name) {
    const root = currentView;
    const schema = SCHEMAS[name];
    if (name === "feedItems" && !state.feedConfig) state.feedConfig = (await loadFeedConfig()).config;
    const items = await loadAll(name);
    let q = "";

    const draw = () => {
        const list = items.filter((it) => !q || JSON.stringify(it).toLowerCase().includes(q));
        $("#coll-body").innerHTML = list.length ? list.map((it) => `
            <tr class="border-t border-gray-700/60">
                <td class="py-2.5 pr-3">
                    <div class="font-medium text-gray-100">${esc(it.title || "(untitled)")}${it.pinned ? ` <span class="chip !text-amber-200 !border-amber-400/50 !bg-amber-500/10">pinned</span>` : ""}</div>
                    <div class="text-xs text-gray-500 truncate max-w-md">${esc(it.sourceName || it.venue || (it.tags || []).join(", ") || "")}</div>
                </td>
                <td class="py-2.5 pr-3 text-sm text-gray-400 whitespace-nowrap">${esc(fmtDate(it.date))}</td>
                <td class="py-2.5 pr-3"><span class="chip ${it.status === "published" ? "" : "!text-gray-300 !border-gray-500/50 !bg-gray-600/20"}">${esc(it.status || "draft")}</span></td>
                <td class="py-2.5 text-right whitespace-nowrap">
                    ${STUDIO_PAGES[name] ? `<a href="${STUDIO_PAGES[name]}?id=${encodeURIComponent(it.id)}" class="btn btn-ghost btn-sm">Studio</a>` : ""}
                    <button data-edit="${esc(it.id)}" class="btn btn-ghost btn-sm">Edit</button>
                    <button data-toggle="${esc(it.id)}" class="btn btn-ghost btn-sm">${it.status === "published" ? "Unpublish" : "Publish"}</button>
                    <button data-delete="${esc(it.id)}" class="btn btn-danger btn-sm">Delete</button>
                </td>
            </tr>`).join("") : `<tr><td colspan="4" class="py-8 text-center text-gray-400">${items.length ? "No matches." : `No ${schema.noun}s yet.`}</td></tr>`;
    };

    root.innerHTML = `
        ${heading(schema.title, schema.sub, `<a class="btn btn-ghost" href="../Pages/Research/index.html#${name === "feedItems" ? "stay-current" : name}" target="_blank" rel="noopener">View page</a>${STUDIO_PAGES[name] ? `<a class="btn btn-ghost" href="${STUDIO_PAGES[name]}">Write in Studio</a>` : ""}<button id="coll-new" class="btn btn-primary">${STUDIO_PAGES[name] ? "Quick add" : `New ${schema.noun}`}</button>`)}
        <div class="panel p-4">
            <input id="coll-search" type="search" class="field mb-3" placeholder="Search ${schema.noun}s…" aria-label="Search">
            <div class="overflow-x-auto"><table class="w-full text-left">
                <thead><tr class="text-xs uppercase tracking-wide text-gray-400"><th class="pb-2">Title</th><th class="pb-2">Date</th><th class="pb-2">Status</th><th class="pb-2"></th></tr></thead>
                <tbody id="coll-body"></tbody>
            </table></div>
        </div>`;
    draw();

    $("#coll-search").addEventListener("input", (e) => { q = e.target.value.toLowerCase(); draw(); });
    $("#coll-new").addEventListener("click", () => openEditor(name, null, async (saved) => { items.unshift(saved); draw(); }));
    $("#coll-body").addEventListener("click", async (e) => {
        const id = e.target.dataset.edit || e.target.dataset.toggle || e.target.dataset.delete;
        if (!id) return;
        const idx = items.findIndex((x) => x.id === id);
        const it = items[idx];
        if (e.target.dataset.edit) {
            openEditor(name, it, (saved) => { items[idx] = saved; draw(); });
        } else if (e.target.dataset.toggle) {
            const status = it.status === "published" ? "draft" : "published";
            try {
                await saveItem(name, id, { status }, state.user);
                it.status = status;
                draw();
            } catch (err) { toast(err.message, "error"); }
        } else if (confirm(`Delete “${it.title}”? This cannot be undone.`)) {
            try {
                await deleteItem(name, id);
                items.splice(idx, 1);
                draw();
                toast("Deleted.", "success");
            } catch (err) { toast(err.message, "error"); }
        }
    });
}

function fieldHtml(f, value) {
    const id = `f-${f.key.replace(/\./g, "-")}`;
    const req = f.required ? "required" : "";
    const label = `<label class="lbl" for="${id}">${esc(f.label)}${f.required ? " *" : ""}</label>`;
    switch (f.type) {
        case "textarea": return `<div>${label}<textarea id="${id}" data-key="${f.key}" rows="5" class="field" ${req}>${esc(value || "")}</textarea></div>`;
        case "date": return `<div>${label}<input id="${id}" data-key="${f.key}" type="date" class="field" value="${esc(value || "")}" ${req}></div>`;
        case "select": return `<div>${label}<select id="${id}" data-key="${f.key}" class="field">${f.options.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`;
        case "checkbox": return `<label class="flex items-center gap-2 text-sm"><input id="${id}" data-key="${f.key}" type="checkbox" class="accent-teal-500" ${value ? "checked" : ""}> ${esc(f.label)}</label>`;
        case "list": return `<div>${label}<input id="${id}" data-key="${f.key}" data-list class="field" value="${esc((value || []).join(", "))}" ${req}></div>`;
        case "topics": {
            const names = state.feedConfig.topics.map((t) => t.name);
            const chosen = new Set(value || []);
            const extra = [...chosen].filter((t) => !names.includes(t));
            return `<fieldset><legend class="lbl">${esc(f.label)}</legend><div class="grid sm:grid-cols-2 gap-1.5" data-key="${f.key}" data-topics>
                ${[...names, ...extra].map((t) => `<label class="flex items-center gap-2 text-sm"><input type="checkbox" value="${esc(t)}" ${chosen.has(t) ? "checked" : ""} class="accent-teal-500"> ${esc(t)}</label>`).join("")}
            </div></fieldset>`;
        }
        default: return `<div>${label}<input id="${id}" data-key="${f.key}" ${f.type === "link" ? 'data-link inputmode="url"' : ""} class="field" value="${esc(value || "")}" ${req}></div>`;
    }
}

// `prefill` seeds a new item (e.g. "Save as article" from the article sync preview).
function openEditor(name, item, onSaved, prefill = null) {
    const schema = SCHEMAS[name];
    const dlg = $("#editor");
    const defaults = { status: "published", date: new Date().toISOString().slice(0, 10), type: "Paper" };
    const values = item || prefill;
    $("#editor-title").textContent = item ? `Edit ${schema.noun}` : `New ${schema.noun}`;
    $("#editor-fields").innerHTML = schema.fields.map((f) => fieldHtml(f, values ? (getPath(values, f.key) ?? defaults[f.key]) : defaults[f.key])).join("");
    const form = $("#editor-form");
    if (name === "articles") addFetchDetailsButton(form);

    const close = () => dlg.close();
    $$("[data-close]", dlg).forEach((b) => (b.onclick = close));
    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = {};
        for (const f of schema.fields) {
            let v;
            if (f.type === "topics") v = $$(`[data-topics] input:checked`, form).map((i) => i.value);
            else {
                const el = form.querySelector(`[data-key="${f.key}"]`);
                if (f.type === "checkbox") v = el.checked;
                else if (f.type === "list") v = toList(el.value);
                else v = el.value.trim();
            }
            if (f.type === "link" && v && !resolveLink(v)) return toast(`“${f.label}” is not a valid http(s) URL or site path.`, "error");
            if (f.key === "doi") v = v.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
            setPath(data, f.key, v);
        }
        try {
            const id = await saveItem(name, item?.id || null, data, state.user);
            onSaved({ ...item, ...data, id });
            close();
            toast("Saved.", "success");
        } catch (err) {
            toast(`Could not save: ${err.message}`, "error");
        }
    };
    dlg.showModal();
}

// Fill empty article fields from the LinkedIn page's public metadata (title, summary, image, date).
function addFetchDetailsButton(form) {
    const input = form.querySelector('[data-key="linkedinUrl"]');
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost btn-sm mt-2";
    btn.textContent = "Fetch details from this URL";
    input.after(btn);
    btn.onclick = async () => {
        const url = input.value.trim();
        if (!url) return toast("Paste the LinkedIn article URL first.", "error");
        btn.disabled = true;
        btn.textContent = "Fetching…";
        try {
            const { config } = await loadArticleSyncConfig();
            const meta = await fetchArticleMeta(url, { proxy: config.corsProxy });
            const fill = (key, v) => {
                const el = form.querySelector(`[data-key="${key}"]`);
                if (el && v && !el.value.trim()) el.value = v;
            };
            fill("title", meta.title);
            fill("summary", meta.summary);
            fill("coverImage", meta.image);
            if (meta.published) form.querySelector('[data-key="date"]').value = meta.published.slice(0, 10);
            toast(meta.title ? "Filled in what the page shares publicly. Review before saving." : "The page shared no details; fill them in by hand.", meta.title ? "success" : "error");
        } catch (err) {
            toast(`Could not read the page: ${err.message}`, "error");
        } finally {
            btn.disabled = false;
            btn.textContent = "Fetch details from this URL";
        }
    };
}

// ---------- Admin: article sources ----------

async function renderArticleSources() {
    const root = currentView;
    const loaded = await loadArticleSyncConfig();
    let draft = structuredClone(loaded.config);
    let dirty = false;
    let preview = null;

    const platformOptions = (sel) => Object.entries(PLATFORMS).map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${esc(v.label)}</option>`).join("");

    const sourceRow = (s, i) => {
        const plan = fetchPlan(s);
        const reads = plan[0] ? `${plan[0].note ? `${plan[0].note}: ` : ""}${plan[0].url}` : "nothing (add a URL)";
        return `
        <div class="py-3 border-t border-gray-700/50 grid md:grid-cols-12 gap-2 items-center">
            <label class="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" data-bind="sources.${i}.enabled" ${s.enabled ? "checked" : ""} class="accent-teal-500"> Enabled</label>
            <input data-bind="sources.${i}.name" value="${esc(s.name)}" class="field md:col-span-3" placeholder="Name" aria-label="Source name">
            <select data-bind="sources.${i}.platform" class="field md:col-span-2" aria-label="Platform">${platformOptions(s.platform)}</select>
            <div class="md:col-span-5 flex gap-2 justify-end">
                <button data-move="${i}:-1" class="btn btn-ghost btn-sm" ${i === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
                <button data-move="${i}:1" class="btn btn-ghost btn-sm" ${i === draft.sources.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
                <button data-remove="${i}" class="btn btn-danger btn-sm">Remove</button>
            </div>
            <input data-bind="sources.${i}.url" value="${esc(s.url)}" class="field md:col-span-6" placeholder="Page or profile URL, e.g. https://name.substack.com" aria-label="Page URL">
            <input data-bind="sources.${i}.feedUrl" value="${esc(s.feedUrl)}" class="field md:col-span-6" placeholder="Feed URL override (optional RSS/Atom)" aria-label="Feed URL override">
            <p class="text-xs text-gray-500 md:col-span-12 break-all">Reads: ${esc(reads)}</p>
        </div>`;
    };

    const previewHtml = () => {
        if (!preview) return "";
        if (preview.error) return `<div class="panel p-5 text-red-300">${esc(preview.error)}</div>`;
        const row = (a, unmatched) => `
            <li class="py-3 border-t border-gray-700/50">
                <div class="flex flex-wrap justify-between gap-2">
                    <div class="min-w-0">
                        <div class="font-medium text-gray-100">${esc(a.title || "(untitled)")}${a.manualId ? ` <span class="chip">saved article</span>` : ""}</div>
                        <div class="text-xs text-gray-500">${esc(fmtDate(a.date))}</div>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        ${a.manualId ? "" : `<button data-save="${esc(a.id)}" class="btn btn-ghost btn-sm">Save as article</button>`}
                        <button data-hide="${esc(a.id)}" class="btn btn-ghost btn-sm">Hide</button>
                    </div>
                </div>
                <ul class="mt-1 text-xs space-y-0.5">${a.members.map((m) => `<li><span class="${m.platform === "linkedin" ? "text-blue-300" : "text-gray-400"}">${esc(PLATFORMS[m.platform]?.label || m.platform)}</span> · <a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer" class="text-teal-300 hover:underline break-all">${esc(m.url)}</a>${m.manual ? " <span class='text-gray-500'>(set by hand)</span>" : ""}</li>`).join("")}</ul>
                ${unmatched ? `<p class="text-xs text-amber-300 mt-1">No LinkedIn version found, so this is not shown on the site. Save it as an article with its LinkedIn URL, or add the URL to an existing article's cross-posts.</p>` : ""}
            </li>`;
        return `
            <div class="panel p-5 mb-4">
                <h2 class="font-semibold mb-3">Sync preview</h2>
                <ul class="text-sm space-y-1 mb-4">${preview.sourceStatus.map((st) => `<li class="flex gap-2"><span class="status-dot mt-1.5 ${st.ok ? "bg-emerald-400" : "bg-red-500"}"></span><span><b>${esc(st.name)}</b>: ${st.ok ? `${st.count} post(s) via <span class="break-all">${esc(st.via)}</span>` : esc(st.error)}</span></li>`).join("")}</ul>
                <h3 class="text-sm font-semibold text-gray-200">Shown on the Articles page (${preview.groups.articles.length})</h3>
                <ul class="mb-4">${preview.groups.articles.map((a) => row(a, false)).join("") || `<li class="text-sm text-gray-400 py-2">Nothing yet.</li>`}</ul>
                ${preview.groups.unmatched.length ? `<h3 class="text-sm font-semibold text-amber-200">Not shown: no LinkedIn version (${preview.groups.unmatched.length})</h3><ul>${preview.groups.unmatched.map((a) => row(a, true)).join("")}</ul>` : ""}
            </div>`;
    };

    const draw = () => {
        root.innerHTML = `
            ${heading("Articles: sources", `Pages and feeds scanned for your articles. Posts that are the same article on different sites are combined, with LinkedIn as the main link. Loaded from ${loaded.origin === "firestore" ? `Firestore${loaded.updatedBy ? ` (last saved by ${esc(loaded.updatedBy)})` : ""}` : "defaults: nothing saved yet"}.`,
                `<button id="as-test" class="btn btn-ghost">Test sync</button><button id="as-save" class="btn btn-primary">Save settings</button>`)}
            <div id="as-dirty" class="${dirty ? "" : "hidden"} mb-4 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2">Unsaved changes.</div>

            <div class="panel p-5 mb-4">
                <div class="flex items-center justify-between"><h2 class="font-semibold">Sources</h2><button id="as-add" class="btn btn-ghost btn-sm">Add source</button></div>
                <p class="text-xs text-gray-500 mt-1 mb-2">Substack and Medium pages are read through their public RSS feeds automatically. LinkedIn and X only show article lists to signed-in visitors, so automatic reading may fail there. If it does, paste a feed URL override (for example from an RSS bridge service), or add those articles by hand under <a class="text-teal-300 hover:underline" href="#articles">Articles</a>; synced cross-posts still attach to them.</p>
                ${draft.sources.map(sourceRow).join("") || `<p class="text-sm text-gray-400 py-2">No sources. Add one.</p>`}
            </div>

            <div class="panel p-5 mb-4">
                <h2 class="font-semibold mb-3">Matching</h2>
                <div class="grid md:grid-cols-3 gap-4">
                    <label class="flex items-start gap-2 text-sm md:col-span-3"><input type="checkbox" data-bind="linkedinOnly" ${draft.linkedinOnly ? "checked" : ""} class="accent-teal-500 mt-1"><span>Show LinkedIn articles only<br><span class="text-xs text-gray-500">Posts on other sites appear only as “Also read on” buttons on their LinkedIn article. Turn off to also list articles that exist only elsewhere.</span></span></label>
                    <div><label class="lbl" for="as-th">Title match strictness (0.5–1)</label><input id="as-th" type="number" step="0.05" min="0.5" max="1" data-bind="matchThreshold" data-num value="${esc(draft.matchThreshold)}" class="field"><p class="text-xs text-gray-500 mt-1">Higher means titles must match more closely. Default 0.75.</p></div>
                    <div><label class="lbl" for="as-days">Max days between cross-posts</label><input id="as-days" type="number" min="1" data-bind="maxDaysApart" data-num value="${esc(draft.maxDaysApart)}" class="field"><p class="text-xs text-gray-500 mt-1">Posts further apart are never combined.</p></div>
                    <div><label class="lbl" for="as-proxy">CORS proxy for browser checks</label><textarea id="as-proxy" data-bind="corsProxy" rows="3" class="field">${esc(draft.corsProxy.split(/[\s,]+/).join("\n"))}</textarea><p class="text-xs text-gray-500 mt-1">One relay per line, tried in order. Used by “Check for new articles” and Test sync. The daily scan reads directly.</p></div>
                    <div class="md:col-span-3"><label class="lbl" for="as-hidden">Hidden URLs (one per line)</label><textarea id="as-hidden" data-bind="hiddenUrls" data-list rows="3" class="field">${esc(draft.hiddenUrls.join("\n"))}</textarea><p class="text-xs text-gray-500 mt-1">Posts here are never shown or matched.</p></div>
                </div>
                <div class="flex flex-wrap gap-2 mt-4">
                    <button id="as-defaults" class="btn btn-ghost btn-sm">Reset to defaults</button>
                    <button data-run-sync class="btn btn-ghost btn-sm">Run the daily sync now</button>
                </div>
            </div>
            <div id="as-preview">${previewHtml()}</div>`;
    };

    const markDirty = () => { dirty = true; $("#as-dirty")?.classList.remove("hidden"); };

    root.oninput = root.onchange = (e) => {
        const el = e.target;
        const path = el.dataset?.bind;
        if (!path) return;
        let v = el.type === "checkbox" ? el.checked : el.value;
        if (el.dataset.list !== undefined) v = v.split(/\n/).map((x) => x.trim()).filter(Boolean);
        if (el.dataset.num !== undefined) v = Number(v);
        setPath(draft, path, v);
        markDirty();
        // Pasting a URL picks the platform for you.
        if (e.type === "change" && path.endsWith(".url")) {
            const src = getPath(draft, path.replace(/\.url$/, ""));
            const p = detectPlatform(src.url);
            if (p && p !== "other") src.platform = p;
            if (!src.name || src.name === "New source") src.name = PLATFORMS[src.platform]?.label || "Website";
            draw();
        }
    };

    root.onclick = async (e) => {
        const t = e.target.closest("button");
        if (!t) return;
        if (t.id === "as-add") {
            draft.sources.push({ id: `src-${Date.now()}`, name: "New source", platform: "other", enabled: true, url: "", feedUrl: "" });
            markDirty();
            draw();
        } else if (t.dataset.remove !== undefined) {
            draft.sources.splice(Number(t.dataset.remove), 1);
            markDirty();
            draw();
        } else if (t.dataset.move) {
            const [i, d] = t.dataset.move.split(":").map(Number);
            const [s] = draft.sources.splice(i, 1);
            draft.sources.splice(i + d, 0, s);
            markDirty();
            draw();
        } else if (t.id === "as-defaults") {
            if (confirm("Replace the current (unsaved) settings with the defaults?")) {
                draft = structuredClone(DEFAULT_ARTICLE_SYNC);
                markDirty();
                draw();
            }
        } else if (t.id === "as-save") {
            const cfg = normalizeArticleConfig(draft);
            const bad = cfg.sources.filter((s) => s.enabled && !safeUrl(s.url) && !safeUrl(s.feedUrl));
            if (bad.length) return toast(`Add a valid URL for: ${bad.map((s) => s.name).join(", ")}`, "error");
            try {
                await saveArticleSyncConfig(cfg, state.user);
                draft = cfg;
                dirty = false;
                loaded.origin = "firestore";
                loaded.updatedBy = sessionEmail(state.user);
                draw();
                toast("Saved. The next sync will use these sources.", "success");
            } catch (err) { toast(`Could not save: ${err.message}`, "error"); }
        } else if (t.id === "as-test") {
            t.disabled = true;
            t.textContent = "Syncing…";
            try {
                const [result, manual, snapshot] = await Promise.all([
                    syncArticles(normalizeArticleConfig(draft)),
                    loadAll("articles"),
                    fetchJson(`${SITE_ROOT}Pages/Research/data/articles-feed.json`).catch(() => null)
                ]);
                const items = mergeArticleItems(snapshot?.items || [], result.items);
                preview = { sourceStatus: result.sourceStatus, manual, items, groups: groupArticles(manual.filter((a) => a.status === "published"), items, draft) };
            } catch (err) {
                preview = { error: err.message };
            }
            t.disabled = false;
            t.textContent = "Test sync";
            $("#as-preview").innerHTML = previewHtml();
        } else if (t.dataset.hide) {
            const g = [...preview.groups.articles, ...preview.groups.unmatched].find((a) => a.id === t.dataset.hide);
            if (!g || !confirm(`Hide “${g.title}” (${g.members.length} link${g.members.length === 1 ? "" : "s"})? Save settings to keep this.`)) return;
            draft.hiddenUrls = [...new Set([...draft.hiddenUrls, ...g.members.map((m) => m.url)])];
            preview.groups = groupArticles(preview.manual.filter((a) => a.status === "published"), preview.items, draft);
            markDirty();
            draw();
        } else if (t.dataset.save) {
            const g = [...preview.groups.articles, ...preview.groups.unmatched].find((a) => a.id === t.dataset.save);
            if (!g) return;
            openEditor("articles", null, () => toast("Article saved. Run Test sync again to see it combined.", "success"), {
                title: g.title, date: g.date, summary: g.summary, coverImage: g.coverImage, linkedinUrl: g.linkedinUrl, crossposts: g.crossposts, status: "published"
            });
        }
    };

    draw();
}

// ---------- Admin: feed automation ----------

async function renderAutomation() {
    const root = currentView;
    const loaded = await loadFeedConfig();
    let draft = structuredClone(loaded.config);
    let dirty = false;

    const topicRow = (t, i) => `
        <div class="grid grid-cols-[auto_1fr] md:grid-cols-[auto_12rem_1fr_auto] gap-2 items-center py-2 border-t border-gray-700/50">
            <input type="checkbox" data-bind="topics.${i}.enabled" ${t.enabled ? "checked" : ""} class="accent-teal-500" aria-label="Enabled">
            <input data-bind="topics.${i}.name" value="${esc(t.name)}" class="field" aria-label="Topic name">
            <input data-bind="topics.${i}.keywords" data-list value="${esc(t.keywords.join(", "))}" class="field col-span-2 md:col-span-1" placeholder="keywords, comma separated" aria-label="Keywords">
            <button data-remove="topics.${i}" class="btn btn-ghost btn-sm col-span-2 md:col-span-1 justify-self-end" aria-label="Remove topic">Remove</button>
        </div>`;

    const sourceRow = (s, i) => `
        <div class="py-3 border-t border-gray-700/50 grid md:grid-cols-6 gap-2 items-center">
            <label class="flex items-center gap-2 text-sm md:col-span-1"><input type="checkbox" data-bind="sources.${i}.enabled" ${s.enabled ? "checked" : ""} class="accent-teal-500"> Enabled</label>
            <input data-bind="sources.${i}.name" value="${esc(s.name)}" class="field md:col-span-2" aria-label="Source name" placeholder="Name">
            <select data-bind="sources.${i}.type" class="field md:col-span-1" aria-label="Source type">${Object.entries(SOURCE_TYPES).map(([k, v]) => `<option value="${k}" ${k === s.type ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select>
            <select data-bind="sources.${i}.cors" class="field md:col-span-1" aria-label="Browser access" title="How browsers reach this source during “Refresh feed”">
                <option value="auto" ${s.cors === "auto" ? "selected" : ""}>Direct, proxy fallback</option>
                <option value="direct" ${s.cors === "direct" ? "selected" : ""}>Direct only</option>
                <option value="proxy" ${s.cors === "proxy" ? "selected" : ""}>Always via proxy</option>
            </select>
            <button data-remove="sources.${i}" class="btn btn-ghost btn-sm md:col-span-1 justify-self-end">Remove</button>
            ${s.type === "rss"
                ? `<input data-bind="sources.${i}.url" value="${esc(s.url)}" class="field md:col-span-3" placeholder="Feed URL (RSS or Atom)" aria-label="Feed URL">`
                : `<input data-bind="sources.${i}.query" value="${esc(s.query)}" class="field md:col-span-2" placeholder="Custom query (blank = built from topics)" aria-label="Custom query">
                   <select data-bind="sources.${i}.queryMode" class="field md:col-span-1" aria-label="Query mode"><option value="per-topic" ${s.queryMode === "per-topic" ? "selected" : ""}>One query per topic</option><option value="combined" ${s.queryMode === "combined" ? "selected" : ""}>One combined query</option></select>`}
            <input data-bind="sources.${i}.homepage" value="${esc(s.homepage)}" class="field md:col-span-3" placeholder="Homepage shown as attribution" aria-label="Homepage">
        </div>`;

    const num = (key, label, hint) => `<div><label class="lbl" for="p-${key}">${label}</label><input id="p-${key}" type="number" min="1" data-bind="${key}" data-num value="${esc(draft[key])}" class="field"><p class="text-xs text-gray-500 mt-1">${hint}</p></div>`;

    const draw = () => {
        root.innerHTML = `
            ${heading("Feed: automation", `Topics, sources and parameters for the Stay Current scanner. Loaded from ${loaded.origin === "firestore" ? `Firestore${loaded.updatedBy ? ` (last saved by ${esc(loaded.updatedBy)})` : ""}` : "defaults: nothing saved yet"}.`,
                `<button id="au-test" class="btn btn-ghost">Test scan</button><button id="au-save" class="btn btn-primary">Save settings</button>`)}
            <div id="au-dirty" class="${dirty ? "" : "hidden"} mb-4 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2">Unsaved changes.</div>

            <div class="panel p-5 mb-4">
                <h2 class="font-semibold mb-3">Parameters</h2>
                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    ${num("latestCount", "Items in latest view", "Shown before the archive.")}
                    ${num("lookbackDays", "Look-back window (days)", "Older scanned items are ignored.")}
                    ${num("perSourceLimit", "Results per request", "Per topic for per-topic sources.")}
                    ${num("archiveCap", "Archive size limit", "Snapshot archive keeps this many.")}
                </div>
                <div class="grid md:grid-cols-2 gap-4 mt-4">
                    <label class="flex items-start gap-2 text-sm"><input type="checkbox" data-bind="balanceTopics" ${draft.balanceTopics ? "checked" : ""} class="accent-teal-500 mt-1"><span>Balance topics<br><span class="text-xs text-gray-500">Rotate through topics so one busy field can't fill the whole latest view.</span></span></label>
                    <label class="flex items-start gap-2 text-sm"><input type="checkbox" data-bind="requireTopicMatch" ${draft.requireTopicMatch ? "checked" : ""} class="accent-teal-500 mt-1"><span>Require a topic match<br><span class="text-xs text-gray-500">Drop scanned items whose title/abstract match none of the keywords.</span></span></label>
                    <div><label class="lbl" for="p-proxy">CORS proxy for browser scans</label><textarea id="p-proxy" data-bind="corsProxy" rows="3" class="field">${esc(draft.corsProxy.split(/[\s,]+/).join("\n"))}</textarea><p class="text-xs text-gray-500 mt-1">One relay per line (prefix, or template with {url}), tried in order when a source blocks direct browser access. The scheduled scan never uses it.</p></div>
                    <div><label class="lbl" for="p-mail">Contact email for APIs (optional)</label><input id="p-mail" data-bind="contactEmail" value="${esc(draft.contactEmail)}" class="field" type="email"><p class="text-xs text-gray-500 mt-1">Sent to OpenAlex as <code>mailto</code> for its faster “polite pool”.</p></div>
                    <div class="md:col-span-2"><label class="lbl" for="p-block">Blocked URLs (one per line)</label><textarea id="p-block" data-bind="blockedUrls" data-list rows="2" class="field">${esc(draft.blockedUrls.join("\n"))}</textarea></div>
                </div>
            </div>

            <div class="panel p-5 mb-4">
                <div class="flex items-center justify-between"><h2 class="font-semibold">Topics &amp; tags</h2><button data-add="topic" class="btn btn-ghost btn-sm">Add topic</button></div>
                <p class="text-xs text-gray-500 mt-1 mb-2">Each topic becomes a tag on matching items. Keywords drive both the search queries and the matching (plurals match automatically).</p>
                ${draft.topics.map(topicRow).join("")}
            </div>

            <div class="panel p-5 mb-4">
                <div class="flex items-center justify-between"><h2 class="font-semibold">Sources, websites &amp; RSS feeds</h2>
                    <div class="flex gap-2"><button data-add="rss" class="btn btn-ghost btn-sm">Add RSS feed</button><button data-add="api" class="btn btn-ghost btn-sm">Add API source</button></div></div>
                <p class="text-xs text-gray-500 mt-1 mb-2">API sources (arXiv, OpenAlex, Europe PMC) are searched with your topic keywords. RSS/Atom feeds are read whole and filtered by topic.</p>
                ${draft.sources.map(sourceRow).join("")}
            </div>

            <div class="panel p-5 mb-4 flex flex-wrap gap-2">
                <button id="au-export" class="btn btn-ghost btn-sm">Export JSON</button>
                <label class="btn btn-ghost btn-sm cursor-pointer">Import JSON<input id="au-import" type="file" accept="application/json" class="hidden"></label>
                <button id="au-defaults" class="btn btn-ghost btn-sm">Reset to defaults</button>
                <button data-run-sync class="btn btn-ghost btn-sm">Run snapshot workflow</button>
            </div>

            <div id="au-results"></div>`;
    };

    const markDirty = () => { dirty = true; $("#au-dirty")?.classList.remove("hidden"); };

    root.oninput = root.onchange = async (e) => {
        const el = e.target;
        if (el.id === "au-import" && e.type === "change" && el.files[0]) {
            try {
                draft = normalizeConfig(JSON.parse(await el.files[0].text()));
                markDirty();
                draw();
                toast("Imported. Review, then Save settings.", "success");
            } catch (err) { toast(`Invalid JSON: ${err.message}`, "error"); }
            return;
        }
        const path = el.dataset?.bind;
        if (!path) return;
        let v = el.type === "checkbox" ? el.checked : el.value;
        if (el.dataset.list !== undefined) v = toList(v);
        if (el.dataset.num !== undefined) v = Number(v);
        setPath(draft, path, v);
        markDirty();
        if (e.type === "change" && path.endsWith(".type")) {
            const s = getPath(draft, path.replace(/\.type$/, ""));
            if (!s.homepage || Object.values(SOURCE_TYPES).some((t) => t.home === s.homepage)) s.homepage = SOURCE_TYPES[s.type].home;
            draw();
        }
    };

    root.onclick = async (e) => {
        const t = e.target;
        if (t.dataset.remove) {
            const [list, idx] = t.dataset.remove.split(".");
            draft[list].splice(Number(idx), 1);
            markDirty();
            draw();
        } else if (t.dataset.add) {
            if (t.dataset.add === "topic") draft.topics.push({ id: `topic-${Date.now()}`, name: "New topic", enabled: true, keywords: [] });
            else if (t.dataset.add === "rss") draft.sources.push({ id: `rss-${Date.now()}`, name: "New feed", type: "rss", enabled: true, url: "", cors: "proxy", homepage: "", query: "", queryMode: "per-topic" });
            else draft.sources.push({ id: `api-${Date.now()}`, name: "OpenAlex (custom)", type: "openalex", enabled: true, url: "", cors: "auto", homepage: SOURCE_TYPES.openalex.home, query: "", queryMode: "per-topic" });
            markDirty();
            draw();
        } else if (t.id === "au-save") {
            const cfg = normalizeConfig(draft);
            cfg.topics.forEach((x) => { if (!x.id || x.id.startsWith("topic-")) x.id = slugify(x.name); });
            const badRss = cfg.sources.filter((s) => s.type === "rss" && s.enabled && !safeUrl(s.url));
            if (badRss.length) return toast(`Feed URL missing or invalid for: ${badRss.map((s) => s.name).join(", ")}`, "error");
            try {
                await saveFeedConfig(cfg, state.user);
                draft = cfg;
                state.feedConfig = cfg;
                dirty = false;
                loaded.origin = "firestore";
                loaded.updatedBy = sessionEmail(state.user);
                draw();
                toast("Settings saved. The next scan will use them.", "success");
            } catch (err) { toast(`Could not save: ${err.message}`, "error"); }
        } else if (t.id === "au-test") {
            t.disabled = true;
            t.textContent = "Scanning…";
            const res = await scanFeed(normalizeConfig(draft)).catch((err) => ({ error: err.message }));
            t.disabled = false;
            t.textContent = "Test scan";
            $("#au-results").innerHTML = res.error ? `<div class="panel p-5 text-red-300">${esc(res.error)}</div>` : `
                <div class="panel p-5">
                    <h2 class="font-semibold mb-3">Test scan: ${res.items.length} items (latest ${res.latest.length} shown)</h2>
                    <ul class="text-sm space-y-1 mb-4">${res.sourceStatus.map((s) => `<li class="flex gap-2"><span class="status-dot mt-1.5 ${s.ok ? "bg-emerald-400" : "bg-red-500"}"></span><span><b>${esc(s.name)}</b>: ${s.ok ? `${s.count} items in ${s.ms} ms` : esc(s.error)}${s.ok && s.error ? ` <span class="text-amber-300">(${esc(s.error)})</span>` : ""}</span></li>`).join("")}</ul>
                    <ol class="text-sm space-y-2 list-decimal pl-5">${res.latest.map((it) => `<li><a class="text-teal-300 hover:underline" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${esc(it.title)}</a> <span class="text-gray-500">· ${esc(fmtDate(it.published))} · ${esc(it.source.name)} · ${esc(it.topics.join(", "))}</span></li>`).join("")}</ol>
                </div>`;
        } else if (t.id === "au-export") {
            download("feed-config.json", normalizeConfig(draft));
        } else if (t.id === "au-defaults") {
            if (confirm("Replace the current (unsaved) settings with the defaults?")) {
                draft = structuredClone(DEFAULT_FEED_CONFIG);
                markDirty();
                draw();
            }
        }
    };

    draw();
}

function download(filename, data) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- Admin: users & admins ----------

const roleBadge = (role) => ({
    owner: `<span class="chip !text-amber-200 !border-amber-400/50 !bg-amber-500/10">Owner</span>`,
    admin: `<span class="chip !text-amber-200 !border-amber-400/50 !bg-amber-500/10">Admin</span>`,
    revoked: `<span class="chip !text-gray-300 !border-gray-500/50 !bg-gray-600/20">Revoked</span>`,
    member: `<span class="chip !text-gray-300 !border-gray-500/50 !bg-gray-600/20">Member</span>`
}[role]);

const actionBadge = (a) => ({
    grant: `<span class="text-emerald-300 font-semibold">Granted</span>`,
    revoke: `<span class="text-red-300 font-semibold">Revoked</span>`,
    bootstrap: `<span class="text-amber-300 font-semibold">Owner recorded</span>`
}[a] || esc(a));

async function renderUsers() {
    const root = currentView;
    const [usersSnap, adminsSnap, log] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "admins")),
        loadAdminLog().catch((e) => { console.warn("Admin log:", e.message); return null; })
    ]);
    const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const grants = new Map(adminsSnap.docs.map((d) => [d.id, d.data()]));
    const isOwner = (email) => BOOTSTRAP_ADMIN_EMAILS.includes(email);
    const roleOf = (email) => (isOwner(email) ? "owner" : grants.get(email)?.active === false ? "revoked" : grants.has(email) ? "admin" : "member");
    const activeAdmins = [...new Set([...BOOTSTRAP_ADMIN_EMAILS, ...[...grants].filter(([, g]) => g.active !== false).map(([e]) => e)])];
    const userByEmail = new Map(users.filter((u) => u.email).map((u) => [normalizeEmail(u.email), u]));
    let q = "";
    let filter = "all";

    const userRow = (u) => {
        const email = normalizeEmail(u.email);
        const role = email ? roleOf(email) : "member";
        const g = grants.get(email);
        let action;
        if (!email) action = `<span class="text-xs text-gray-500" title="No email on this profile yet; it fills in at their next sign-in.">No email</span>`;
        else if (role === "owner") action = `<span class="text-xs text-gray-500">Set in firestore.rules</span>`;
        else if (role === "admin") action = `<button data-revoke="${esc(email)}" data-uid="${esc(u.uid)}" class="btn btn-ghost btn-sm">Revoke admin</button>`;
        else action = `<button data-grant="${esc(email)}" data-uid="${esc(u.uid)}" class="btn btn-primary btn-sm">Make admin</button>`;
        return `<tr class="border-t border-gray-700/60 align-top">
            <td class="py-2.5 pr-3">
                <div class="text-gray-100 font-medium">${u.username ? `@${esc(u.username)}` : `<span class="text-gray-500">no username</span>`}</div>
                <div class="text-xs text-gray-400">${esc(u.displayName || "")}</div>
                <div class="text-xs text-gray-500 break-all">${esc(u.email || u.uid)}</div>
            </td>
            <td class="py-2.5 pr-3">${roleBadge(role)}${g && role !== "owner" ? `<div class="text-[11px] text-gray-500 mt-1">${g.active === false ? `revoked by ${esc(g.revokedBy || "?")}` : `by ${esc(g.grantedBy || "?")}`}</div>` : ""}</td>
            <td class="py-2.5 pr-3 text-gray-400 text-sm">${esc((u.providers || []).map(providerLabel).join(", ") || "—")}</td>
            <td class="py-2.5 pr-3 text-gray-400 text-sm whitespace-nowrap">${esc(fmtDate(tsToDate(u.createdAt)))}</td>
            <td class="py-2.5 pr-3 text-gray-400 text-sm whitespace-nowrap">${u.lastLoginAt ? esc(timeAgo(tsToDate(u.lastLoginAt))) : "—"}</td>
            <td class="py-2.5 text-right whitespace-nowrap">${action}</td>
        </tr>`;
    };

    const draw = () => {
        const needle = q.toLowerCase();
        const list = users
            .filter((u) => !needle || `${u.username || ""} ${u.displayName || ""} ${u.email || ""} ${u.uid}`.toLowerCase().includes(needle))
            .filter((u) => {
                const role = roleOf(normalizeEmail(u.email));
                return filter === "all" || (filter === "admins" ? role === "owner" || role === "admin" : role === "member" || role === "revoked");
            })
            .sort((a, b) => String(tsToDate(b.lastLoginAt) || "").localeCompare(String(tsToDate(a.lastLoginAt) || "")));
        $("#users-body", root).innerHTML = list.map(userRow).join("") || `<tr><td colspan="6" class="py-6 text-center text-gray-400">No users match.</td></tr>`;
        $("#users-count", root).textContent = `${list.length} of ${users.length}`;
    };

    root.innerHTML = `
        ${heading("Users & admins", "Every signed-in account, with one-click admin elevation. Each change is recorded permanently in the admin log.")}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div class="panel p-4"><div class="text-xs uppercase tracking-wide text-gray-400">Users</div><div class="text-2xl font-semibold mt-1">${users.length}</div></div>
            <div class="panel p-4"><div class="text-xs uppercase tracking-wide text-gray-400">Active admins</div><div class="text-2xl font-semibold mt-1">${activeAdmins.length}</div></div>
            <div class="panel p-4"><div class="text-xs uppercase tracking-wide text-gray-400">Log entries</div><div class="text-2xl font-semibold mt-1">${log ? log.length : "—"}</div></div>
            <div class="panel p-4"><div class="text-xs uppercase tracking-wide text-gray-400">Guest Observers</div><div class="text-sm text-gray-400 mt-1">Stored in visitors' browsers only; not listed.</div></div>
        </div>

        <div class="panel p-5 mb-4">
            <div class="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                <h2 class="font-semibold">All users <span id="users-count" class="text-sm font-normal text-gray-400"></span></h2>
                <input id="users-search" type="search" class="field md:ml-auto md:max-w-xs" placeholder="Search username, name, email…" aria-label="Search users">
                <div class="inline-flex rounded-lg border border-gray-700 overflow-hidden text-sm" role="group" aria-label="Filter users">
                    <button data-ufilter="all" aria-pressed="true" class="seg-btn px-3 py-1.5 text-gray-300">All</button>
                    <button data-ufilter="admins" aria-pressed="false" class="seg-btn px-3 py-1.5 text-gray-300 border-l border-gray-700">Admins</button>
                    <button data-ufilter="members" aria-pressed="false" class="seg-btn px-3 py-1.5 text-gray-300 border-l border-gray-700">Members</button>
                </div>
            </div>
            <div class="overflow-x-auto"><table class="w-full text-left text-sm">
                <thead><tr class="text-xs uppercase tracking-wide text-gray-400"><th class="pb-2">User</th><th class="pb-2">Role</th><th class="pb-2">Sign-in</th><th class="pb-2">Joined</th><th class="pb-2">Last login</th><th class="pb-2"></th></tr></thead>
                <tbody id="users-body"></tbody>
            </table></div>
        </div>

        <div class="grid lg:grid-cols-2 gap-4 mb-4">
            <div class="panel p-5">
                <h2 class="font-semibold mb-3">Current admins</h2>
                <ul class="divide-y divide-gray-700/60">${activeAdmins.map((email) => {
                    const g = grants.get(email) || {};
                    const u = userByEmail.get(email);
                    return `<li class="py-2 text-sm flex justify-between gap-3">
                        <span class="min-w-0"><span class="text-gray-100">${u?.username ? `@${esc(u.username)} · ` : ""}${esc(email)}</span>
                        <span class="block text-xs text-gray-500">${isOwner(email) ? "Owner (bootstrap admin in firestore.rules)" : `granted by ${esc(g.grantedBy || "?")}${g.grantedAt ? ` · ${esc(fmtDate(tsToDate(g.grantedAt)))}` : ""}`}</span></span>
                        ${isOwner(email) ? roleBadge("owner") : `<button data-revoke="${esc(email)}" data-uid="${esc(g.uid || u?.uid || "")}" class="btn btn-ghost btn-sm shrink-0">Revoke</button>`}
                    </li>`;
                }).join("")}</ul>
            </div>
            <div class="panel p-5">
                <h2 class="font-semibold mb-1">Grant by email</h2>
                <p class="text-xs text-gray-500 mb-3">For someone who has not signed in yet. Their admin access starts when they sign in with this exact, verified email.</p>
                <form id="add-admin" class="flex flex-col sm:flex-row gap-2">
                    <input id="add-admin-email" type="email" required class="field" placeholder="email@example.com" aria-label="Email to make admin">
                    <button class="btn btn-primary shrink-0">Grant admin</button>
                </form>
            </div>
        </div>

        <div class="panel p-5">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 class="font-semibold">Admin log</h2>
                ${log?.length ? `<button id="log-export" class="btn btn-ghost btn-sm">Download CSV</button>` : ""}
            </div>
            ${log === null ? `<p class="text-sm text-amber-300">The admin log could not be loaded. Publish the latest firestore.rules (they add the adminLog collection).</p>` : log.length ? `
            <div class="overflow-x-auto"><table class="w-full text-left text-sm">
                <thead><tr class="text-xs uppercase tracking-wide text-gray-400"><th class="pb-2">When</th><th class="pb-2">Change</th><th class="pb-2">Account</th><th class="pb-2">By</th><th class="pb-2">Note</th></tr></thead>
                <tbody>${log.map((e) => `<tr class="border-t border-gray-700/60 align-top">
                    <td class="py-2 pr-3 text-gray-400 whitespace-nowrap">${esc(fmtDate(tsToDate(e.at), { dateStyle: "medium", timeStyle: "short" }))}</td>
                    <td class="py-2 pr-3 whitespace-nowrap">${actionBadge(e.action)}</td>
                    <td class="py-2 pr-3 break-all">${e.targetName ? `${esc(e.targetName)} · ` : ""}${esc(e.target)}</td>
                    <td class="py-2 pr-3 break-all text-gray-300">${esc(e.by)}</td>
                    <td class="py-2 text-gray-400">${esc(e.note || "")}</td>
                </tr>`).join("")}</tbody>
            </table></div>` : `<p class="text-sm text-gray-400">No changes recorded yet.</p>`}
            <p class="text-xs text-gray-500 mt-3">Log entries are enforced by the security rules: stamped with the server time and the acting admin, and they can never be edited or deleted.</p>
        </div>`;
    draw();

    $("#users-search", root).addEventListener("input", (e) => { q = e.target.value; draw(); });
    $$("[data-ufilter]", root).forEach((b) => b.addEventListener("click", () => {
        filter = b.dataset.ufilter;
        $$("[data-ufilter]", root).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        draw();
    }));

    const change = async (action, email, uid) => {
        email = normalizeEmail(email);
        const u = users.find((x) => x.uid === uid) || userByEmail.get(email);
        const label = u?.username ? `@${u.username} (${email})` : email;
        if (action === "revoke" && email === sessionEmail(state.user) && !confirm("Revoke your own admin access?")) return;
        const note = prompt(`${action === "grant" ? "Make" : "Remove"} ${label} ${action === "grant" ? "an admin" : "as admin"}?\n\nOptional note for the admin log (reason):`, "");
        if (note === null) return; // cancelled
        try {
            await changeAdminAccess(state.user, action, { email, uid: u?.uid || uid || "", name: u?.username || u?.displayName || "", note });
            toast(`${label} ${action === "grant" ? "is now an admin" : "is no longer an admin"}. Logged.`, "success");
            renderUsers();
        } catch (err) {
            toast(`${err.message}${/permission/i.test(err.message) ? " — publish the latest firestore.rules." : ""}`, "error");
        }
    };
    // Assigned (not added): renderUsers() re-runs in the same container after each change.
    root.onclick = (e) => {
        const g = e.target.closest("[data-grant]");
        const r = e.target.closest("[data-revoke]");
        if (g) change("grant", g.dataset.grant, g.dataset.uid);
        else if (r) change("revoke", r.dataset.revoke, r.dataset.uid);
    };
    $("#add-admin", root).addEventListener("submit", (e) => {
        e.preventDefault();
        const email = $("#add-admin-email", root).value;
        if (roleOf(normalizeEmail(email)) === "admin" || isOwner(normalizeEmail(email))) return toast("That email is already an admin.", "info");
        change("grant", email, "");
    });
    $("#log-export", root)?.addEventListener("click", () => {
        const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const rows = [["when", "action", "account", "name", "by", "note"], ...log.map((e) => [tsToDate(e.at), e.action, e.target, e.targetName, e.by, e.note])];
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv" }));
        a.download = `ebayednoob-admin-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
}

// ---------- Admin: data tools ----------

function renderDataTools() {
    const root = currentView;
    root.innerHTML = `
        ${heading("Data tools")}
        <div class="space-y-4 max-w-3xl">
            <div class="panel p-5">
                <h2 class="font-semibold">Import repository seed data</h2>
                <p class="text-sm text-gray-400 mt-1">Copies <code>Pages/Research/data/publications.json</code> and <code>articles.json</code> into Firestore. Until a collection has at least one published document, the Research hub shows these files instead.</p>
                <div class="flex flex-wrap gap-2 mt-3">
                    <button data-seed="publications" class="btn btn-ghost btn-sm">Import publications</button>
                    <button data-seed="articles" class="btn btn-ghost btn-sm">Import articles</button>
                </div>
            </div>
            <div class="panel p-5">
                <h2 class="font-semibold">Backup</h2>
                <p class="text-sm text-gray-400 mt-1">Download every publication, article, curated feed item and the feed settings as one JSON file.</p>
                <button id="backup" class="btn btn-ghost btn-sm mt-3">Download backup</button>
            </div>
            <div class="panel p-5 text-sm text-gray-400">
                <h2 class="font-semibold text-gray-100">Setup checklist</h2>
                <ol class="list-decimal pl-5 mt-2 space-y-1">
                    <li>Deploy <code>firestore.rules</code> (Firebase console → Firestore → Rules, or <code>firebase deploy --only firestore:rules</code>).</li>
                    <li>Firebase console → Authentication → Sign-in method: enable Google, and Email/Password if you want email accounts.</li>
                    <li>Authentication → Settings → Authorized domains: include your GitHub Pages domain.</li>
                    <li>Run the “Update research feed” workflow once to create the first snapshot.</li>
                </ol>
            </div>
        </div>`;
    root.querySelectorAll("[data-seed]").forEach((b) => b.addEventListener("click", async () => {
        try {
            const n = await importSeed(b.dataset.seed, state.user);
            toast(`Imported ${n} ${b.dataset.seed}.`, "success");
        } catch (err) { toast(err.message, "error"); }
    }));
    $("#backup").addEventListener("click", async () => {
        try {
            const out = { exportedAt: new Date().toISOString(), feedConfig: (await loadFeedConfig()).config };
            for (const name of Object.keys(COLLECTIONS)) out[name] = (await loadAll(name)).map((x) => JSON.parse(JSON.stringify(x, (k, v) => (v?.toDate ? v.toDate().toISOString() : v))));
            download(`ebayednoob-research-backup-${out.exportedAt.slice(0, 10)}.json`, out);
        } catch (err) { toast(err.message, "error"); }
    });
}
