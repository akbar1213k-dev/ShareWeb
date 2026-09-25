import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const KEY_FILE = path.join(process.cwd(), ".server-identity");

let cached: string | null = null;

export function getServerId(): string {
  if (cached) return cached;
  try {
    if (fs.existsSync(KEY_FILE)) {
      cached = fs.readFileSync(KEY_FILE, "utf8").trim();
      if (cached) return cached;
    }
  } catch {}
  const id = randomUUID();
  try {
    fs.writeFileSync(KEY_FILE, id, "utf8");
  } catch {}
  cached = id;
  return id;
}
