"use client";
import { createClient } from "@supabase/supabase-js";
import { Pasien } from "../types/pasien";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ✏️ Edit data pasien */
export async function editPatient(id: string, data: Omit<Pasien, "id">) {
  const payload = {
    no_rm: data.noRM,
    nama: data.nama,
    jenis_kelamin: data.jenisKelamin,
    tgl_lahir: data.tanggalLahir,
    alamat: data.alamat,
    no_telp: data.noHP,
    jenis_pembiayaan: data.jenisPembiayaan,
    kelas_perawatan: data.kelasPerawatan,
    asuransi: data.asuransi,
  };

  const { error } = await supabase.from("pasien").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}
