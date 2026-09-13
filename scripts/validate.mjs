import AdmZip from "adm-zip";
import path from "node:path";

const ROOT = "C:\\Users\\91951\\Downloads\\anime website";
const zip = new AdmZip(path.join(ROOT, "nextgen-anime-final.zip"));
const entries = zip.getEntries().map((e) => e.entryName).filter((n) => n);

const EXCLUDE_DIRS = ["node_modules", ".next", "test-results", "playwright-report", "temp", ".freebuff", ".kilo", ".git"];
const EXCLUDE_FILES = [".env", ".env.*", "*.zip", "next-env.d.ts", "*.tsbuildinfo", "genre_explorer_verified.png", "walkthrough.md", "claude.md", "simulator*.js", "asci_system.js"];
const globRe = (p) => new RegExp("^" + p.replace(/[+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$", "i");
const exRe = EXCLUDE_FILES.map(globRe);

const violations = [];
for (const e of entries) {
  const base = path.basename(e).toLowerCase();
  const parts = e.split("/");
  if (base === ".env.example") continue;
  if (parts.some((p) => EXCLUDE_DIRS.includes(p.toLowerCase()))) { violations.push(e + " [dir]"); continue; }
  if (base === "nextgen-anime-final.zip") { violations.push(e + " [self]"); continue; }
  if (base === ".env" || base === ".env.local" || base.startsWith(".env.")) { violations.push(e + " [env]"); continue; }
  if (exRe.some((r) => r.test(base))) { violations.push(e + " [glob]"); continue; }
  if (/(^|[_\-])(secret|token|password|passwd|api[_\-]?key|private[_\-]?key|\.pem$|\.key$)/.test(base)) { violations.push(e + " [secret]"); continue; }
}

const rawEntries = zip.getEntries();
const emptyEntries = rawEntries.filter((e) => !e.isDirectory && e.header.size === 0).map((e) => e.entryName);

console.log("Total entries:", entries.length);
console.log("Violations:", violations.length);
violations.slice(0, 20).forEach((v) => console.log("  VIOLATION:", v));
console.log("Empty (0-byte) files count:", emptyEntries.length);
if (emptyEntries.length > 0) {
  console.log("  Sample empty files:", emptyEntries.slice(0, 5));
}
console.log(".env.example present:", entries.some((e) => e.toLowerCase() === ".env.example"));
console.log(".env.local present:", entries.some((e) => e.toLowerCase() === ".env.local"));
console.log("Any .zip present:", entries.filter((e) => e.toLowerCase().endsWith(".zip")));
console.log("Sample entries with sizes:");
rawEntries.slice(0, 10).forEach((e) => console.log(`  ${e.entryName} (${e.header.size} bytes)`));

if (violations.length > 0 || emptyEntries.length > 0) {
  process.exit(1);
}