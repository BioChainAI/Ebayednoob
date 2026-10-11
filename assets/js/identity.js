// Usernames for signed-in members (Firestore) and Guest Observers (this browser only).
// Uniqueness: usernames/{lowercased name} -> { uid }. A member claims a name in one batch that
// writes the reservation, releases the old one and updates users/{uid}; firestore.rules enforce
// the format, uniqueness and the once-a-week limit.
import { db } from "./firebase.js";
import { doc, getDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

export const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,20}$/;
const GUEST_KEY = "ebayednoob-guest-profile";
const RESERVED = new Set(["admin", "administrator", "guest", "guest-observer", "guestobserver", "ebayednoob", "moderator", "root", "system", "support", "null", "undefined"]);

export function validateUsername(name) {
    const n = String(name || "").trim();
    if (!USERNAME_PATTERN.test(n)) return "Use 3–20 letters, numbers, dots, dashes or underscores.";
    if (/^[._-]|[._-]$/.test(n)) return "Start and end with a letter or number.";
    if (RESERVED.has(n.toLowerCase())) return "That name is reserved.";
    return "";
}

const toMillis = (v) => (v?.toMillis ? v.toMillis() : v ? new Date(v).getTime() : 0);

// Milliseconds until the name may change again (0 = now).
export function cooldownRemaining(changedAt) {
    const t = toMillis(changedAt);
    return t ? Math.max(0, t + USERNAME_COOLDOWN_MS - Date.now()) : 0;
}

export function formatDuration(ms) {
    const s = Math.ceil(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
}

// { available, reason, ownedByMe } — reads the public reservation document.
export async function checkUsername(name, uid = null) {
    const problem = validateUsername(name);
    if (problem) return { available: false, reason: problem };
    try {
        const snap = await getDoc(doc(db, "usernames", name.trim().toLowerCase()));
        if (!snap.exists()) return { available: true, reason: "" };
        if (uid && snap.data().uid === uid) return { available: true, ownedByMe: true, reason: "" };
        return { available: false, reason: "That username is taken." };
    } catch (e) {
        return { available: false, reason: `Could not check availability (${e.message}).` };
    }
}

// Claim a username for a member. `profile` is the current users/{uid} data.
export async function claimUsername(user, profile, name) {
    const clean = name.trim();
    const lower = clean.toLowerCase();
    const wait = cooldownRemaining(profile?.usernameChangedAt);
    if (profile?.username && wait) throw new Error(`You can change your username again in ${formatDuration(wait)}.`);
    const check = await checkUsername(clean, user.uid);
    if (!check.available) throw new Error(check.reason);
    if (profile?.usernameLower === lower && profile?.username === clean) return profile;

    const batch = writeBatch(db);
    if (!check.ownedByMe) batch.set(doc(db, "usernames", lower), { uid: user.uid, username: clean, claimedAt: serverTimestamp() });
    if (profile?.usernameLower && profile.usernameLower !== lower) batch.delete(doc(db, "usernames", profile.usernameLower));
    batch.set(doc(db, "users", user.uid), { username: clean, usernameLower: lower, usernameChangedAt: serverTimestamp() }, { merge: true });
    await batch.commit();
    return { ...profile, username: clean, usernameLower: lower, usernameChangedAt: new Date().toISOString() };
}

// ---------- Guest Observer (stored only in this browser) ----------

export function loadGuest() {
    try {
        return JSON.parse(localStorage.getItem(GUEST_KEY) || "null");
    } catch {
        return null;
    }
}

export function saveGuest(profile) {
    try {
        localStorage.setItem(GUEST_KEY, JSON.stringify(profile));
        return true;
    } catch {
        return false;
    }
}

export function clearGuest() {
    try { localStorage.removeItem(GUEST_KEY); } catch { /* storage unavailable */ }
}

export async function setGuestUsername(name) {
    const guest = loadGuest() || { createdAt: new Date().toISOString() };
    const wait = cooldownRemaining(guest.usernameChangedAt);
    if (guest.username && wait) throw new Error(`You can change your username again in ${formatDuration(wait)}.`);
    const check = await checkUsername(name);
    if (!check.available) throw new Error(check.reason);
    const next = { ...guest, username: name.trim(), usernameChangedAt: new Date().toISOString() };
    if (!saveGuest(next)) throw new Error("This browser is not allowing local storage, so a guest profile cannot be saved.");
    return next;
}
