/**
 * Cek apakah tiap app_users punya password_hash (wajib untuk login).
 * npx tsx scripts/check-app-users-password.ts
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
    console.error("Butuh NEXT_PUBLIC_SUPABASE_URL + service role di .env.local");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("app_users")
    .select("username, role, password_hash")
    .order("username");

  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log("Login POST /api/auth butuh password_hash (bcrypt) per baris.\n");
  for (const row of data ?? []) {
    const r = row as { username: string; role: string; password_hash: string | null };
    const h = r.password_hash;
    const ok = typeof h === "string" && h.length >= 20;
    console.log(
      `${ok ? "✓" : "✗"} ${r.username} | role=${r.role} | password_hash=${ok ? `ada (${h.length} char)` : "KOSONG / tidak valid — login akan gagal"}`
    );
  }
}

main();
