import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // 1. Check total count
  const { count, error: countErr } = await supabase
    .from("pasien")
    .select("*", { count: "exact", head: true });
  console.log("Total patients count:", count, "Error:", countErr);

  // 2. Search for Samsul (RM 924820)
  const { data: samsul, error: samErr } = await supabase
    .from("pasien")
    .select("*")
    .eq("no_rm", "924820");
  console.log("Samsul by eq no_rm:", samsul, "Error:", samErr);

  // 3. Search by ilike no_rm
  const { data: samsulLike, error: samLikeErr } = await supabase
    .from("pasien")
    .select("*")
    .ilike("no_rm", "%924820%");
  console.log("Samsul by ilike no_rm:", samsulLike, "Error:", samLikeErr);

  // 4. Search in tindakan table for SAMSUL
  const { data: tind, error: tindErr } = await supabase
    .from("tindakan")
    .select("id, no_rm, nama_pasien, pasien_id, umur, jenis_kelamin")
    .eq("no_rm", "924820");
  console.log("Tindakan SAMSUL row:", tind, "Error:", tindErr);
}

check();
