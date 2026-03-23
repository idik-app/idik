// app/core/workers/cleanupWorker.ts
import { db } from "../db/idikDexie";

export async function autoCleanup() {
  const last = localStorage.getItem("lastCleanup");
  const today = Date.now();
  if (!last || today - parseInt(last) > 7 * 24 * 60 * 60 * 1000) {
    await db.log_sync.where("status").equals("synced").delete();
    localStorage.setItem("lastCleanup", today.toString());
  }
}
