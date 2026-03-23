/**
 * Seed user ke tabel app_users (login hanya dari DB — tidak ada kredensial bawaan di kode).
 * Wajib: SEED_USERNAME dan SEED_PASSWORD
 *
 * Contoh:
 *   SEED_USERNAME=adminuser SEED_PASSWORD=GantiPasswordKuat npx tsx scripts/seed-app-user.ts
 *
 * Distributor: SEED_ROLE=distributor SEED_DISTRIBUTOR_ID=<uuid> ...
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const username = process.env.SEED_USERNAME?.trim() || "";
const password = process.env.SEED_PASSWORD || "";
const role = (process.env.SEED_ROLE || "admin").trim();
const seedDistributorId = process.env.SEED_DISTRIBUTOR_ID?.trim() || "";

async function main() {
  if (!username || !password) {
    console.error(
      "Wajib set SEED_USERNAME dan SEED_PASSWORD (tidak ada default di repo).\n" +
        "Contoh: SEED_USERNAME=adminuser SEED_PASSWORD=PasswordKuatAnda npx tsx scripts/seed-app-user.ts"
    );
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (url && key) {
    const supabase = createClient(url, key);
    const row: Record<string, unknown> = {
      username,
      password_hash: hash,
      role,
      updated_at: new Date().toISOString(),
    };
    if (seedDistributorId) {
      row.distributor_id = seedDistributorId;
    }
    const { error } = await supabase.from("app_users").upsert(row, {
      onConflict: "username",
    });
    if (error) {
      console.error("Gagal insert:", error.message);
      process.exit(1);
    }
    console.log("✅ User", username, "berhasil disimpan ke app_users.");
  } else {
    console.log("Env Supabase tidak set. Gunakan SQL berikut di Supabase SQL Editor:\n");
    const distSql = seedDistributorId
      ? `, distributor_id = excluded.distributor_id`
      : "";
    const distCol = seedDistributorId ? ", distributor_id" : "";
    const distVal = seedDistributorId ? `, '${seedDistributorId}'` : "";
    console.log(
      `insert into public.app_users (username, password_hash, role${distCol}) values ('${username}', '${hash}', '${role}'${distVal}) on conflict (username) do update set password_hash = excluded.password_hash, role = excluded.role${distSql}, updated_at = now();`
    );
  }
}

main();
