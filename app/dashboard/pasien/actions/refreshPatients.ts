"use client";
import { supabase } from "@/lib/supabase/client";
import { Pasien } from "../types/pasien";
import { mapFromSupabase } from "../data/pasienSchema";

/**
 * 🔄 refreshPatients v3.1 — Clean Stable Edition
 * - Gunakan koneksi Supabase baru (client.ts)
 * - Tangani error & data kosong dengan aman
 * - Hindari log spam dan cache
 */
export async function refreshPatients(): Promise<Pasien[]> {
  try {
    const { data, error } = await supabase
      .from("pasien")
      .select(
        `
        id,
        no_rm,
        nama,
        jenis_kelamin,
        tgl_lahir,
        alamat,
        no_telp,
        jenis_pembiayaan,
        kelas_perawatan,
        asuransi,
        created_at
      `
      )
      .order("nama", { ascending: true });

    if (error) {
      console.error("❌ Supabase error:", error.message);
      return [];
    }

    if (!data?.length) return [];

    return data.map((p: any) => mapFromSupabase(p)) as Pasien[];
  } catch (err: any) {
    console.warn("⚠️ Gagal memuat data pasien:", err.message);
    return [];
  }
}
