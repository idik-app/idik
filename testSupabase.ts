// testSupabase.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

// --- DEBUG ENV ---
console.log("🧩 DEBUG ENV:");
console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(
  "KEY:",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10) + "... (hidden)"
);

// --- VALIDASI ENV ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Variabel environment Supabase tidak ditemukan.");
  console.error("Pastikan file .env.local berisi:");
  console.error("NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co");
  console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxx");
  process.exit(1);
}

// --- INISIALISASI CLIENT ---
const supabase = createClient(supabaseUrl, supabaseKey);

// --- TES KONEKSI ---
async function testConnection() {
  console.log("🔍 Menguji koneksi ke Supabase...");

  // ganti dengan nama tabel sebenarnya
  const { data, error } = await supabase.from("patients").select("*").limit(1);

  if (error) {
    console.error("❌ Koneksi gagal:", error.message);
  } else if (data && data.length > 0) {
    console.log("✅ Koneksi berhasil. Contoh data dari tabel 'patients':");
    console.table(data);
  } else {
    console.log("✅ Koneksi berhasil, tetapi tabel 'patients' kosong.");
  }
}

testConnection();
