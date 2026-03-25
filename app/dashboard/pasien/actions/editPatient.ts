"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardSession } from "@/lib/auth/requireDashboardSession";
import { Pasien } from "../types/pasien";
import { logPasienAudit } from "@/lib/audit/logPasien";
import { normalizeNamaPasien } from "../utils/normalizeNamaPasien";

export async function editPatient(id: string, data: Omit<Pasien, "id">) {
  const session = await requireDashboardSession();
  const supabase = createAdminClient();

  const payload = {
    no_rm: data.noRM,
    nama: normalizeNamaPasien(data.nama ?? ""),
    jenis_kelamin: data.jenisKelamin,
    tgl_lahir: data.tanggalLahir ?? null,
    alamat: data.alamat ?? null,
    no_telp: data.noHP ?? null,
    jenis_pembiayaan: data.jenisPembiayaan,
    kelas_perawatan: data.kelasPerawatan,
    asuransi: data.asuransi ?? null,
  };

  const { data: updated, error } = await supabase
    .from("pasien")
    .update(payload)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!updated) {
    throw new Error("Pasien tidak ditemukan atau tidak ada perubahan.");
  }

  await logPasienAudit(
    "UPDATE",
    { patient_id: id, no_rm: data.noRM, nama: payload.nama },
    session.username
  );
}
