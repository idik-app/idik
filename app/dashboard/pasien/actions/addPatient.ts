"use server";

import { createClient } from "@/lib/supabase/server";
import { Pasien } from "../types/pasien";

export async function addPatient(data: Omit<Pasien, "id">) {
  const supabase = createClient();

  const payload = {
    no_rm: data.noRM,
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

  const { error } = await supabase.from("pasien").insert([payload]);
  if (error) throw new Error(error.message);
  return { success: true };
}
