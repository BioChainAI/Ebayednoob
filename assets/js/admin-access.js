// Admin access changes. Each grant or revoke writes the admins/{email} record and an
// append-only adminLog entry in one batch; firestore.rules reject either one without the other.
import { db, sessionEmail, normalizeEmail } from "./firebase.js";
import { doc, collection, writeBatch, serverTimestamp, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

/**
 * @param {object} actor   the signed-in admin (Firebase user)
 * @param {"grant"|"revoke"|"bootstrap"} action
 * @param {{ email: string, uid?: string, name?: string, note?: string }} target
 */
export async function changeAdminAccess(actor, action, target) {
    const email = normalizeEmail(target.email);
    if (!email) throw new Error("That user has no email address, so admin access cannot be tied to them.");
    const by = sessionEmail(actor);
    const logRef = doc(collection(db, "adminLog"));
    const batch = writeBatch(db);
    batch.set(logRef, {
        action,
        target: email,
        targetUid: target.uid || "",
        targetName: target.name || "",
        note: String(target.note || "").slice(0, 500),
        by,
        byUid: actor.uid,
        at: serverTimestamp()
    });
    const active = action !== "revoke";
    batch.set(doc(db, "admins", email), {
        email,
        active,
        logId: logRef.id,
        uid: target.uid || "",
        name: target.name || "",
        updatedBy: by,
        updatedAt: serverTimestamp(),
        ...(active ? { grantedBy: action === "bootstrap" ? "bootstrap" : by, grantedAt: serverTimestamp() } : { revokedBy: by, revokedAt: serverTimestamp() })
    }, { merge: true });
    await batch.commit();
    return logRef.id;
}

export async function loadAdminLog(max = 500) {
    const snap = await getDocs(query(collection(db, "adminLog"), orderBy("at", "desc"), limit(max)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
