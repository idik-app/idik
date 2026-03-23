"use server";

import { createClient } from "@/lib/supabase/server-";
import { Pasien } from "../types/pasien";
import { logPasienAudit } from "@/lib/audit/logPasien";

export async function editPatient(id: string, data: Omit<Pasien, "id">) {
  const supabase = await createClient();

  const payload = {
    no_rm: data.noRM,
    nama: data.nama,
    jenis_kelamin: data.jenisKelamin,
    tgl_lahir: data.tanggalLahir ?? null,
    alamat: data.alamat ?? null,
    no_telp: data.noHP ?? null,
    jenis_pembiayaan: data.jenisPembiayaan,
    kelas_perawatan: data.kelasPerawatan,
    asuransi: data.asuransi ?? null,
  };

  const { error } = await supabase
    .from("pasien")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);

  const userId = (await supabase.auth.getUser()).data?.user?.id;
  await logPasienAudit(
    "UPDATE",
    { patient_id: id, no_rm: data.noRM, nama: data.nama },
    userId
  );
}
