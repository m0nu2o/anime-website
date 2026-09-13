#!/usr/bin/env node
/**
 * Cross-platform production ZIP packaging for the NextGen Anime platform.
 *
 * Creates `nextgen-anime-ultra-final.zip` at the project root while strictly preserving
 * existing ZIP files and excluding:
 *   - .env files (except .env.example)
 *   - node_modules, .next, test-results, playwright-report, temp, .freebuff, .kilo
 *   - tsbuildinfo, next-env.d.ts
 *   - all existing ZIP archives (*.zip)
 *   - generated screenshots/docs (genre_explorer_verified.png, walkthrough.md, CLAUDE.md, simulator*.js, asci_system.js)
 *   - secrets
 */

import { readdirSync, statSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import AdmZip from "adm-zip";

const ROOT = process.cwd();
const OUTPUT = join(ROOT, "nextgen-anime-ultra-final.zip");

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
      entries.push(full);
    }
  }
  return entries;
}

async function main() {
  if (!existsSync(ROOT)) {
    console.error("Project root does not exist:", ROOT);
    process.exit(1);
  }

  const files = walk(ROOT);
  const zip = new AdmZip();

  for (const full of files) {
    const relPath = relative(ROOT, full).replace(/\\/g, "/");
    zip.addFile(relPath, readFileSync(full));
  }

  mkdirSync(join(ROOT, "scripts"), { recursive: true });

  zip.writeZip(OUTPUT);
  console.log(`Created: ${OUTPUT}`);
  console.log(`Files packaged: ${files.length}`);
}

main().catch((err) => {
  console.error("Packaging failed:", err);
  process.exit(1);
});
