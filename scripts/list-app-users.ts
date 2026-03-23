/**
 * Daftar username + role di app_users (tanpa password).
 * Jalankan: npx tsx scripts/list-app-users.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error(
      "Butuh NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY (atau SUPABASE_SERVICE_KEY) di .env.local"
    );
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("app_users")
    .select("username, role, distributor_id, created_at")
    .order("username");

  if (error) {
    console.error("Gagal baca app_users:", error.message);
    process.exit(1);
  }
  if (!data?.length) {
    console.log("Tidak ada baris di app_users (belum ada user login).");
    return;
  }
  console.log(`app_users: ${data.length} user\n`);
  for (const row of data) {
    const r = row as Record<string, unknown>;
    console.log(
      `- ${String(r.username)} | role=${String(r.role ?? "")}` +
        (r.distributor_id ? ` | distributor_id=${r.distributor_id}` : "")
    );
  }
}

main();
