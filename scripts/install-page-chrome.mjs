// Adds the floating site chrome (assets/js/page-chrome.js: Home, Google sign-in, social links)
// to the pages listed in scripts/page-chrome-targets.json, or to the files given as arguments.
//
//   node scripts/install-page-chrome.mjs              install into every listed page
//   node scripts/install-page-chrome.mjs <file.html>  install into one file (position "top")
//
// Each target is { "file", "position"?, "extra"?: { "href", "label", "icon"? } }; "extra" adds one
// button after Home (used to link the Geometric Calculator and its manual to each other).
//   node scripts/install-page-chrome.mjs --check      exit 1 if a listed page is missing it
//
// Safe to run any number of times: an existing block (or a hand-pasted page-chrome.js script tag)
// is replaced, never duplicated. The Pages deploy runs this, so a raw export pushed as-is still
// goes live with the chrome.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULE = path.join(ROOT, "assets/js/page-chrome.js");
const START = "<!-- page-chrome:start -->";
const END = "<!-- page-chrome:end -->";

const BLOCK_RE = /[ \t]*<!-- page-chrome:start -->[\s\S]*?<!-- page-chrome:end -->[ \t]*\r?\n?/g;
const BARE_TAG_RE = /[ \t]*<script\b[^>]*page-chrome\.js[^>]*>\s*<\/script>[ \t]*\r?\n?/gi;

const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function chromeBlock(file, position = "top", extra = null) {
    const rel = path.relative(path.dirname(path.resolve(ROOT, file)), MODULE).split(path.sep).map(encodeURIComponent).join("/");
    const extraAttrs = extra?.href
        ? ` data-extra-href="${attr(extra.href)}" data-extra-label="${attr(extra.label || "More")}" data-extra-icon="${attr(extra.icon || "book")}"`
        : "";
    return `${START}\n<script type="module" src="${rel}" data-position="${attr(position)}"${extraAttrs}></script>\n${END}\n`;
}

function inject(html, block) {
    const clean = html.replace(BLOCK_RE, "").replace(BARE_TAG_RE, "");
    const at = clean.toLowerCase().lastIndexOf("</body>");
    return at === -1 ? `${clean.replace(/\s*$/, "\n")}${block}` : `${clean.slice(0, at)}${block}${clean.slice(at)}`;
}

async function targets(args) {
    const files = args.filter((a) => !a.startsWith("--"));
    if (files.length) return files.map((file) => ({ file, position: "top" }));
    return JSON.parse(await readFile(path.join(ROOT, "scripts/page-chrome-targets.json"), "utf8"));
}

const args = process.argv.slice(2);
const check = args.includes("--check");
let stale = 0;
for (const { file, position = "top", extra = null } of await targets(args)) {
    const full = path.resolve(ROOT, file);
    const html = await readFile(full, "utf8");
    const next = inject(html, chromeBlock(file, position, extra));
    if (next === html) {
        console.log(`ok        ${file}`);
    } else if (check) {
        stale++;
        console.log(`missing   ${file}`);
    } else {
        await writeFile(full, next);
        console.log(`installed ${file}`);
    }
}
if (stale) process.exit(1);
