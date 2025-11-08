"use client";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* 🗑️ Hapus pasien berdasarkan ID */
export async function deletePatient(id: string): Promise<void> {
  console.log("Deleting pasien id:", id); // 👈 log cek id dikirim
  const { data, error } = await supabase
    .from("pasien")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    console.error("Supabase delete error:", error);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    console.warn("⚠️ Tidak ada baris terhapus, id mungkin tidak cocok:", id);
  } else {
    console.log("✅ Baris terhapus:", data);
  }
}
