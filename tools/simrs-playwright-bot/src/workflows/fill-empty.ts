import { getPasien, mapSimrsToIdikPayload } from "../simrs/getPasien.js";
import { ensureIdikSession } from "../idik/login.js";
import { listTindakan, patchTindakan } from "../idik/pasien-api.js";
import {
  buildSafePatchFromPasien,
  isIncomplete,
  missingFields,
} from "../idik/empty-fields.js";
import { acquireLock } from "../util/lock.js";
import { postBotStatus } from "../idik/bot-status.js";

export type FillEmptyOptions = {
  dryRun?: boolean;
  limit?: number;
};

export async function runFillEmpty(opts: FillEmptyOptions = {}) {
  const dryRun = opts.dryRun !== false;
  const limit = opts.limit ?? 20;
  const release = acquireLock("fill-empty");
  try {
    const session = await ensureIdikSession();
    await postBotStatus(session, { state: "running" });
    const rows = await listTindakan(session);
    const incomplete = rows.filter((r) =>
      isIncomplete(r as Record<string, unknown>),
    );
    console.log(
      `Tindakan total=${rows.length} incomplete=${incomplete.length} (limit ${limit})`,
    );

    let n = 0;
    for (const row of incomplete) {
      if (n >= limit) break;
      const rec = row as Record<string, unknown>;
      const id = String(rec.id ?? "");
      const noRm = String(rec.no_rm ?? rec.rm ?? "").trim();
      if (!id || !noRm) continue;

      const miss = missingFields(rec);
      console.log(`— ${id} RM ${noRm} missing: ${miss.join(", ")}`);

      const gp = await getPasien(noRm);
      if (!gp.ok) {
        console.warn(`  getPasien skip: ${gp.error}`);
        continue;
      }
      const mapped = mapSimrsToIdikPayload(gp.data);
      const patch = buildSafePatchFromPasien(rec, mapped);
      if (Object.keys(patch).length === 0) {
        console.log("  no safe patch from getPasien");
        continue;
      }
      console.log("  patch:", patch);
      if (dryRun) {
        n++;
        continue;
      }
      const res = await patchTindakan(session, id, patch);
      console.log(res.ok ? "  patched" : `  fail: ${res.error}`);
      n++;
    }

    console.log(
      dryRun
        ? `[dry-run] ${n} kasus diveriksa. Pakai --write untuk PATCH.`
        : `Selesai ${n} kasus.`,
    );
    await postBotStatus(session, { state: "ok", ms: 0 });
  } finally {
    release();
  }
}
