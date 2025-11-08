"use client";
import { createClient } from "@supabase/supabase-js";
import { Pasien } from "../types/pasien";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * 🔄 refreshPatients v2.2
 * Memuat ulang data pasien dari Supabase dengan pemetaan aman.
 */
export async function refreshPatients(): Promise<Pasien[]> {
  const { data, error } = await supabase
    .from("pasien")
    .select(
      "id, no_rm, nama, jenis_kelamin, tgl_lahir, alamat, no_telp, jenis_pembiayaan, kelas_perawatan, asuransi, created_at"
    )
    .order("nama", { ascending: true });

  if (error) {
    console.error("❌ Supabase error:", error.message);
    return [];
  }

  if (!data || data.length === 0) {
    console.warn("⚠️ Tidak ada data pasien ditemukan dari Supabase.");
    return [];
  }

  return data.map((p: any) => ({
    id: p.id,
    noRM: p.no_rm ?? "",
    nama: p.nama ?? "",
    jenisKelamin: p.jenis_kelamin ?? "L",
    tanggalLahir: p.tgl_lahir ?? "",
    alamat: p.alamat ?? "",
    noHP: p.no_telp ?? "",
    jenisPembiayaan: p.jenis_pembiayaan ?? "Umum",
    kelasPerawatan: p.kelas_perawatan ?? "Kelas 2",
    asuransi: p.asuransi ?? "",
    created_at: p.created_at ?? null,
  }));
}
