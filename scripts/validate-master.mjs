import AdmZip from "adm-zip";
import path from "node:path";

const ROOT = process.cwd();
const zip = new AdmZip(path.join(ROOT, "nextgen-anime-master-final.zip"));
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
  if (base.endsWith(".zip")) { violations.push(e + " [zip]"); continue; }
  if (base === ".env" || base === ".env.local" || base.startsWith(".env.")) { violations.push(e + " [env]"); continue; }
  if (exRe.some((r) => r.test(base))) { violations.push(e + " [glob]"); continue; }
  if (/(^|[_\-])(secret|token|password|passwd|api[_\-]?key|private[_\-]?key|\.pem$|\.key$)/.test(base)) { violations.push(e + " [secret]"); continue; }
}

const rawEntries = zip.getEntries();
const emptyEntries = rawEntries.filter((e) => !e.isDirectory && e.header.size === 0).map((e) => e.entryName);

console.log("Total entries in master-final ZIP:", entries.length);
console.log("Violations:", violations.length);
violations.slice(0, 20).forEach((v) => console.log("  VIOLATION:", v));
console.log("Empty (0-byte) files count:", emptyEntries.length);
if (emptyEntries.length > 0) {
  console.log("  Sample empty files:", emptyEntries.slice(0, 5));
}
console.log(".env.example present:", entries.some((e) => e.toLowerCase() === ".env.example"));
console.log(".env.local present:", entries.some((e) => e.toLowerCase() === ".env.local"));
console.log("Any .zip present:", entries.filter((e) => e.toLowerCase().endsWith(".zip")));

// Check critical application components exist in the master ZIP
const criticalFiles = [
  "src/app/page.tsx",
  "src/components/Navbar.tsx",
  "src/components/BrandLogo.tsx",
  "src/components/AnimeCard.tsx",
  "src/components/ScheduleViewer.tsx",
  "src/components/VideoPlayer.tsx",
  "src/components/HomeCommunityPosts.tsx",
  "src/app/watch/[animeId]/[episodeId]/page.tsx",
  "src/app/profile/page.tsx",
  "src/components/simulator/BlackHoleSimulator.tsx",
  "src/components/simulator/SunSimulator.tsx",
  "src/lib/api/reanime.ts",
  "src/lib/api/anilist.ts",
  "src/lib/api/jikan.ts",
  "src/lib/api/kitsu.ts",
  "src/lib/storage/guestStore.ts",
  "package.json"
];

for (const cf of criticalFiles) {
  const hasFile = entries.includes(cf);
  if (!hasFile) {
    violations.push(`Missing critical file: ${cf}`);
  }
}

if (violations.length > 0 || emptyEntries.length > 0) {
  console.error("Validation failed with errors.");
  process.exit(1);
} else {
  console.log("Validation passed successfully with 0 violations and 0 empty files!");
}
