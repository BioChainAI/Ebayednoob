// Browser storage keys of this site start with "ebayednoob-" (scripts/checks/storage-policy.cjs enforces it). Keys that
// earlier versions saved under unprefixed names are moved once: the value is copied to "ebayednoob-" + the old name
// (unless that already exists) and the old key is removed.
//   area   "localStorage" or "sessionStorage" (looked up here, since reading it can throw)
//   names  the old keys, as string literals; a name ending in "*" stands for every key that starts with the text
//          before it. Only names listed in MOVED in scripts/checks/storage-policy.cjs may be passed, so no call can
//          reach another app's keys on the shared origin.
export function moveLegacyKeys(area, names) {
    const exact = new Set(names.filter((n) => !n.endsWith("*")));
    const starts = names.filter((n) => n.endsWith("*")).map((n) => n.slice(0, -1)).filter(Boolean);
    const isLegacy = (key) => exact.has(key) || starts.some((s) => key.startsWith(s));
    try {
        const storage = area === "sessionStorage" ? globalThis.sessionStorage : globalThis.localStorage;
        const keys = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key !== null && isLegacy(key)) keys.push(key);
        }
        for (const key of keys) {
            const value = storage.getItem(key);
            const next = `ebayednoob-${key}`;
            if (value !== null && storage.getItem(next) === null) storage.setItem(next, value);
            storage.removeItem(key);
        }
    } catch { /* storage unavailable */ }
}
