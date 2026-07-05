import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Tiny append-only JSON store. Persists submissions to disk as newline-safe
 * JSON arrays. In production you would swap this for a database — the calling
 * code only depends on `append` / `readAll`, so that migration is trivial.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function fileFor(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

export async function readAll(collection) {
  try {
    const raw = await fs.readFile(fileFor(collection), "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function append(collection, record) {
  await ensureDir();
  const items = await readAll(collection);
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...record,
  };
  items.push(entry);
  await fs.writeFile(fileFor(collection), JSON.stringify(items, null, 2), "utf8");
  return entry;
}

export async function existsWhere(collection, predicate) {
  const items = await readAll(collection);
  return items.some(predicate);
}
