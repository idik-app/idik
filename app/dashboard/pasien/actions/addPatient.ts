"use server";

import { createClient } from "@/lib/supabase/server-";
import { Pasien } from "../types/pasien";
import { logPasienAudit } from "@/lib/audit/logPasien";

export async function addPatient(data: Omit<Pasien, "id">) {
  const supabase = await createClient();

  const noRM = data.noRM || `RM-${Date.now()}`;
  const payload = {
    no_rm: noRM,
    nama: data.nama,
    jenis_kelamin: data.jenisKelamin ?? "L",
    tgl_lahir: data.tanggalLahir ?? null,
    alamat: data.alamat ?? null,
    no_telp: data.noHP ?? null,
    jenis_pembiayaan: data.jenisPembiayaan ?? "Umum",
    kelas_perawatan:
      data.jenisPembiayaan === "BPJS PBI"
        ? "Kelas 3"
        : data.kelasPerawatan ?? "Kelas 2",
    asuransi: data.asuransi ?? null,
  };

  const { data: inserted, error } = await supabase
    .from("pasien")
    .insert([payload])
    .select("id")
    .single();

  if (error) {
    console.error("❌ Supabase insert error:", error);
    console.error("📦 Payload dikirim:", payload);
    throw new Error(error.message);
  }

  const userId = (await supabase.auth.getUser()).data?.user?.id;
  await logPasienAudit(
    "CREATE",
    { patient_id: inserted?.id, no_rm: noRM, nama: data.nama },
    userId
  );

  return { success: true };
}
