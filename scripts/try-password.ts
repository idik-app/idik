import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const user = process.argv[2] || "ayu";
const pass = process.argv[3] || "123456";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("missing env");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("app_users")
    .select("username,password_hash")
    .eq("username", user)
    .maybeSingle();
  if (error || !data) {
    console.log("User tidak ditemukan atau error:", error?.message);
    process.exit(1);
  }
  const ok = await bcrypt.compare(pass, data.password_hash as string);
  console.log(`User "${user}" ada di DB (password_hash ${(data.password_hash as string).length} char)`);
  console.log(`Password "${pass}" cocok?`, ok);
}

main();
