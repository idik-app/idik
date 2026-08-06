import fs from "node:fs";
import path from "node:path";
import { config, ensureDirs } from "../config.js";

const LOCK_PATH = () => path.join(config.checkpointDir, "bot.lock");

export function acquireLock(owner: string): () => void {
  ensureDirs();
  const p = LOCK_PATH();
  if (fs.existsSync(p)) {
    const raw = fs.readFileSync(p, "utf8");
    let age = 0;
    try {
      const j = JSON.parse(raw) as { at?: number };
      age = Date.now() - (j.at ?? 0);
    } catch {
      age = 0;
    }
    if (age < 30 * 60_000) {
      throw new Error(
        `Bot lain masih berjalan (lock: ${p}). Hapus file jika stale.`,
      );
    }
  }
  fs.writeFileSync(
    p,
    JSON.stringify({ owner, at: Date.now(), pid: process.pid }, null, 2),
  );
  return () => {
    try {
      fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
  };
}
