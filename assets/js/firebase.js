// Shared Firebase setup for standalone pages (Research hub, Control Panel).
// Uses the same project and SDK version as index.html.
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
    setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

export const firebaseConfig = {
    apiKey: "AIzaSyBzp3tg4RC3gCAePdzUxNFo5J3ixC6o2IQ",
    authDomain: "ebayednoob-github.firebaseapp.com",
    projectId: "ebayednoob-github",
    storageBucket: "ebayednoob-github.firebasestorage.app",
    messagingSenderId: "955029720726",
    appId: "1:955029720726:web:5f498c0fdb61613ca7bcb7"
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

// The first admin. Must match the bootstrap email in firestore.rules.
// Further admins are granted from the Control Panel (stored in the `admins` collection).
export const BOOTSTRAP_ADMIN_EMAILS = ["ghoard1@gmail.com"];
// Optional owner UIDs, mirrored from ownerUids() in firestore.rules. Use this when your Firebase
// project keeps one account per sign-in provider and Google sessions carry no email claim.
export const BOOTSTRAP_ADMIN_UIDS = [];

export const normalizeEmail = (email) => (email || "").trim().toLowerCase();

// The best email for a session: the account email, else the one Google (or another provider) supplied.
export function sessionEmail(user) {
    return normalizeEmail(user?.email || user?.providerData?.find((p) => p.email)?.email || "");
}

// Mirrors the email logic in firestore.rules, using the ID token the rules actually see.
export async function getAdminStatus(user, { forceRefresh = false } = {}) {
    const status = { isAdmin: false, via: "", tokenEmail: "", tokenEmailVerified: false, signInProvider: "", claims: {}, notes: [] };
    if (!user) return status;
    let claims = {};
    try {
        claims = (await user.getIdTokenResult(forceRefresh)).claims || {};
    } catch (e) {
        status.notes.push(`Could not read the ID token: ${e.message}`);
    }
    const identityEmail = claims.firebase?.identities?.email?.[0] || "";
    status.claims = claims;
    status.signInProvider = claims.firebase?.sign_in_provider || "";
    status.tokenEmail = normalizeEmail(claims.email || identityEmail);
    status.tokenEmailVerified = (typeof claims.email === "string" && claims.email_verified === true) || (!claims.email && !!identityEmail && status.signInProvider === "google.com");

    if (BOOTSTRAP_ADMIN_UIDS.includes(user.uid)) {
        return { ...status, isAdmin: true, via: "owner UID" };
    }
    if (!status.tokenEmail) {
        status.notes.push("Your sign-in token carries no email address, so email-based admin access cannot apply.");
        return status;
    }
    if (!status.tokenEmailVerified) {
        status.notes.push("Your email is not verified, and admin access requires a verified email.");
        return status;
    }
    if (BOOTSTRAP_ADMIN_EMAILS.includes(status.tokenEmail)) return { ...status, isAdmin: true, via: "bootstrap email" };
    try {
        const snap = await getDoc(doc(db, "admins", status.tokenEmail));
        if (snap.exists()) return { ...status, isAdmin: true, via: "admins list" };
    } catch (e) {
        status.notes.push(`Could not check the admins list: ${e.message}`);
    }
    return status;
}

export function isBootstrapAdmin(user) {
    return !!user && (BOOTSTRAP_ADMIN_UIDS.includes(user.uid) || BOOTSTRAP_ADMIN_EMAILS.includes(sessionEmail(user)));
}

// Resolves true when the signed-in user is an admin. The UI uses this only to decide what to
// show; the actual protection is enforced by the Firestore security rules.
export async function checkIsAdmin(user) {
    return (await getAdminStatus(user)).isAdmin;
}

export function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return signInWithPopup(auth, provider);
}

export { onAuthStateChanged, signOut };
