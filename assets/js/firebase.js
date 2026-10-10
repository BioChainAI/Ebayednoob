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

export const normalizeEmail = (email) => (email || "").trim().toLowerCase();

export function isBootstrapAdmin(user) {
    return !!user && user.emailVerified && BOOTSTRAP_ADMIN_EMAILS.includes(normalizeEmail(user.email));
}

// Resolves true when the signed-in user is an admin. The UI uses this only to decide what to
// show; the actual protection is enforced by the Firestore security rules.
export async function checkIsAdmin(user) {
    if (!user || !user.email) return false;
    if (isBootstrapAdmin(user)) return true;
    if (!user.emailVerified) return false;
    try {
        const snap = await getDoc(doc(db, "admins", normalizeEmail(user.email)));
        return snap.exists();
    } catch {
        return false;
    }
}

export function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return signInWithPopup(auth, provider);
}

export { onAuthStateChanged, signOut };
