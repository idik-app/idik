"use client";

import { createClient } from "@supabase/supabase-js";

/* ⚙️ Supabase Client – IDIK Unified Edition
   ✅ Satu-satunya instance global
   🧠 Aman untuk mode online/offline
*/

const MODE = process.env.NEXT_PUBLIC_MODE || "online";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase =
  MODE === "offline" ? null : URL && KEY ? createClient(URL, KEY) : null;

if (MODE === "offline") {
  console.warn("⚠️ [IDIK] Mode OFFLINE – koneksi Supabase dinonaktifkan.");
} else if (!URL || !KEY) {
  console.warn("⚠️ [IDIK] Supabase belum dikonfigurasi. Cek .env.local.");
} else {
  console.info("✅ [IDIK] Supabase client aktif.");
}

/* Ambil client dengan pengecekan aman */
export function getSafeSupabase() {
  if (!supabase) {
    console.log("📴 Supabase tidak aktif (offline atau belum dikonfigurasi).");
  }
  return supabase;
}
