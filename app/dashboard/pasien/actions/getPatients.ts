"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function getPatients() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("pasien")
      .select("*")
      .order("nama", { ascending: true });

    if (error) throw new Error(error.message);

    return {
      ok: true,
      data: (data ?? []).map((p: any) => ({
        id: String(p.id),
        noRM: p.no_rm,
        nama: p.nama,
        jenisKelamin: p.jk ?? "L",
        tanggalLahir: p.tanggal_lahir ?? "",
        alamat: p.alamat ?? "",
        noHP: p.no_hp ?? "",
        jenisPembiayaan: p.pembiayaan ?? "Umum",
        kelasPerawatan: p.kelas ?? "Kelas 2",
        asuransi: p.asuransi ?? "",
      })),
    };
  } catch (err: any) {
    console.error("❌ getPatients error:", err.message);
    return { ok: false, message: err.message, data: [] };
  }
}
