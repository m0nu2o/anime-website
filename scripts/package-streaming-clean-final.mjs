#!/usr/bin/env node
/**
 * Packages the clean streaming final repository into `nextgen-anime-streaming-clean-final.zip`
 * Preserves all existing ZIP archives untouched.
 * Excludes node_modules, .next, .git, .env*, caches, logs, temp, .playwright*.
 */
import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import AdmZip from "adm-zip";

const ROOT = process.cwd();
const OUTPUT = join(ROOT, "nextgen-anime-streaming-clean-final.zip");

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".next",
  "test-results",
  "playwright-report",
  ".playwright-mcp",
  "temp",
  ".freebuff",
  ".kilo",
  ".git",
  ".vercel",
]);

const EXCLUDE_EXTS = new Set([
  ".zip",
  ".tsbuildinfo",
  ".log",
]);

function isExcludedFile(name) {
  const lower = name.toLowerCase();
  if (lower === ".env.example") return false;
  if (lower.startsWith(".env")) return true;
  if (lower.endsWith(".zip")) return true;
  if (lower.endsWith(".tsbuildinfo")) return true;
  if (lower.endsWith(".log")) return true;
  if (lower === "next-env.d.ts") return true;
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
      if (EXCLUDE_DIRS.has(item.toLowerCase())) continue;
      walk(full, entries);
    } else if (st.isFile()) {
      if (isExcludedFile(item)) continue;
      entries.push(full);
    }
  }
  return entries;
}

async function main() {
  const files = walk(ROOT);
  const zip = new AdmZip();

  for (const full of files) {
    const relPath = relative(ROOT, full).replace(/\\/g, "/");
    zip.addFile(relPath, readFileSync(full));
  }

  zip.writeZip(OUTPUT);
  const st = statSync(OUTPUT);
  console.log(`Successfully created: ${OUTPUT}`);
  console.log(`Files packaged: ${files.length}`);
  console.log(`Archive size: ${(st.size / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("Packaging failed:", err);
  process.exit(1);
});
