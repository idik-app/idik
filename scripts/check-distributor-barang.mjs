/**
 * Cek isi tabel barang distributor di DB remote (.env.local).
 * Jalankan: npx dotenv -e .env.local -- node scripts/check-distributor-barang.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { count: distCount, error: e1 } = await supabase
    .from("master_distributor")
    .select("*", { count: "exact", head: true });

  const { data: distributors, error: e2 } = await supabase
    .from("master_distributor")
    .select("id, nama_pt, is_active")
    .order("nama_pt")
    .limit(50);

  const { count: mapCount, error: e3 } = await supabase
    .from("distributor_barang")
    .select("*", { count: "exact", head: true });

  const { data: rows, error: e4 } = await supabase
    .from("distributor_barang")
    .select(
      `
      id,
      distributor_id,
      master_barang_id,
      kode_distributor,
      is_active,
      updated_at,
      master_distributor ( nama_pt ),
      master_barang ( kode, nama )
    `,
    )
    .order("updated_at", { ascending: false })
    .limit(80);

  const errors = [e1, e2, e3, e4].filter(Boolean);
  if (errors.length) {
    console.error("Query errors:", errors.map((e) => e.message).join("; "));
    process.exit(1);
  }

  console.log("=== Ringkasan ===");
  console.log(`master_distributor (baris): ${distCount ?? "?"}`);
  console.log(`distributor_barang (mapping produk): ${mapCount ?? "?"}`);
  console.log("\n=== Distributor (sampel) ===");
  console.table(distributors ?? []);

  console.log("\n=== Mapping distributor_barang (terbaru, max 80) ===");
  const flat = (rows ?? []).map((r) => ({
    nama_pt: r.master_distributor?.nama_pt ?? "—",
    kode_master: r.master_barang?.kode ?? "—",
    nama_barang: r.master_barang?.nama ?? "—",
    kode_distributor: r.kode_distributor ?? "—",
    aktif: r.is_active,
    updated_at: r.updated_at,
    mapping_id: r.id?.slice(0, 8) + "…",
  }));
  console.table(flat);

  if ((mapCount ?? 0) > 80) {
    console.log(`\n… dan ${mapCount - 80} baris lain (tampil 80 pertama).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
