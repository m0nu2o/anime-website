#!/usr/bin/env node
/**
 * Perfect Production ZIP packaging for NextGen Anime platform.
 *
 * Creates `nextgen-anime-perfect-final.zip` at the project root while strictly preserving
 * existing baseline archives (nextgen-anime-final.zip, nextgen-anime-ultra-final.zip, nextgen-anime-master-final.zip) and excluding:
 *   - .env files (except .env.example)
 *   - node_modules, .next, test-results, playwright-report, temp, .freebuff, .kilo, .git
 *   - tsbuildinfo, next-env.d.ts
 *   - all existing ZIP archives (*.zip)
 *   - secrets and certificates
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import AdmZip from "adm-zip";

const ROOT = process.cwd();
const OUTPUT = join(ROOT, "nextgen-anime-perfect-final.zip");

// Directories excluded by name (case-insensitive)
const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".next",
  "test-results",
  "playwright-report",
  "temp",
  ".freebuff",
  ".kilo",
  ".git",
]);

// File name globs to exclude (matched against basename, case-insensitive)
const EXCLUDE_FILES = [
  ".env",
  ".env.*",
  "*.zip",
  "next-env.d.ts",
  "*.tsbuildinfo",
  "genre_explorer_verified.png",
  "walkthrough.md",
  "claude.md",
  "simulator*.js",
  "asci_system.js",
];

const ALLOWED_ENV = ".env.example";

function globToRegex(pattern) {
  const escaped = pattern.replace(/[+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("^" + escaped.replace(/\*/g, ".*") + "$", "i");
}

const excludeFileRegexes = EXCLUDE_FILES.map(globToRegex);

function isExcludedDir(name) {
  return EXCLUDE_DIRS.has(name.toLowerCase());
}

function isExcludedFile(name) {
  const lower = name.toLowerCase();
  if (lower === ALLOWED_ENV) return false;
  if (lower.endsWith(".zip")) return true; // never package any ZIP inside
  if (lower === ".env" || lower === ".env.local" || lower.startsWith(".env.")) return true;
  if (excludeFileRegexes.some((re) => re.test(name))) return true;
  if (/(^|[_\-])(secret|token|password|passwd|api[_\-]?key|private[_\-]?key|\.pem$|\.key$)/.test(lower)) {
    return true;
  }
  return false;
}

function walk(dir, entries = []) {
  let items;
  try {
    items = readdirSync(dir);
  } catch {
    return entries;
  }
  for (const item of items) {
    if (item === "." || item === "..") continue;
    const full = join(dir, item);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (isExcludedDir(item)) continue;
      walk(full, entries);
    } else if (st.isFile()) {
      if (isExcludedFile(item)) continue;
      // Filter out any 0-byte files
      if (st.size === 0) continue;
      entries.push(full);
    }
  }
  return entries;
}

console.log("[package-perfect] Scanning workspace for production packaging...");
const files = walk(ROOT);
console.log(`[package-perfect] Found ${files.length} clean source files to bundle.`);

const zip = new AdmZip();
for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  const dirname = rel.includes("/") ? rel.substring(0, rel.lastIndexOf("/")) : "";
  zip.addLocalFile(file, dirname);
}

zip.writeZip(OUTPUT);

const outStat = statSync(OUTPUT);
console.log(`[package-perfect] SUCCESS: ${OUTPUT} generated (${(outStat.size / (1024 * 1024)).toFixed(2)} MB).`);

// Verify contents
const verify = new AdmZip(OUTPUT);
const zipEntries = verify.getEntries().map((e) => e.entryName);
console.log(`[package-perfect] ZIP verification: ${zipEntries.length} entries bundled.`);

// Confirm key files
const criticalFiles = [
  "package.json",
  "src/app/page.tsx",
  "src/app/watch/[animeId]/[episodeId]/page.tsx",
  "src/app/watch/[animeId]/[episodeId]/page.module.css",
  "src/app/anime/[id]/page.tsx",
  "src/components/VideoPlayer.tsx",
  "src/components/VideoPlayer.module.css",
  "src/components/AnimeCard.tsx",
  "src/components/AnimeCard.module.css",
  "src/lib/api/kitsu.ts",
  "src/lib/api/index.ts",
  "src/app/api/anime/episodes/route.ts",
  "src/app/api/anime/download/route.ts",
  "tests/core-flows.spec.ts",
];

for (const c of criticalFiles) {
  const found = zipEntries.some((e) => e.replace(/\\/g, "/") === c);
  if (!found) {
    console.error(`[package-perfect] CRITICAL WARNING: Missing file in ZIP: ${c}`);
    process.exit(1);
  }
}
console.log("[package-perfect] All critical production files verified in ZIP archive.");
