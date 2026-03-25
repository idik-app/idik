"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardSession } from "@/lib/auth/requireDashboardSession";
import { Pasien } from "../types/pasien";
import { logPasienAudit } from "@/lib/audit/logPasien";
import { normalizeNamaPasien } from "../utils/normalizeNamaPasien";

export async function addPatient(data: Omit<Pasien, "id">) {
  const session = await requireDashboardSession();
  const supabase = createAdminClient();

  const noRM = data.noRM || `RM-${Date.now()}`;
  const payload = {
    no_rm: noRM,
    nama: normalizeNamaPasien(data.nama ?? ""),
    jenis_kelamin: data.jenisKelamin ?? "L",
    tgl_lahir: data.tanggalLahir ?? null,
    alamat: data.alamat ?? null,
    no_telp: data.noHP ?? null,
    jenis_pembiayaan: data.jenisPembiayaan ?? "Umum",
    kelas_perawatan:
      data.jenisPembiayaan === "NPBI"
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

  await logPasienAudit(
    "CREATE",
    { patient_id: inserted?.id, no_rm: noRM, nama: payload.nama },
    session.username
  );

  return { success: true };
}
