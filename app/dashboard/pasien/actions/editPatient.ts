"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardSession } from "@/lib/auth/requireDashboardSession";
import { Pasien } from "../types/pasien";
import { logPasienAudit } from "@/lib/audit/logPasien";
import { normalizeNamaPasien } from "../utils/normalizeNamaPasien";
import { mapFromSupabase, toPgDateFromForm } from "../data/pasienSchema";
import { pasienSchema, type PasienFormData } from "../data/pasienValidation";

/** PATCH drawer / UI — hanya kolom yang dikirim; sisanya dari baris DB saat ini. */
export type PasienPatchInput = Partial<
  Pick<
    PasienFormData,
    "noRM" | "nama" | "jenisKelamin" | "tanggalLahir" | "alamat" | "noHP"
  >
>;

export async function editPatient(
  id: string,
  data: Omit<Pasien, "id">,
): Promise<Pasien> {
  const session = await requireDashboardSession();
  const supabase = createAdminClient();

  const payload = {
    no_rm: data.noRM,
    nama: normalizeNamaPasien(data.nama ?? ""),
    jenis_kelamin: data.jenisKelamin,
    tgl_lahir: toPgDateFromForm(data.tanggalLahir),
    alamat: data.alamat ?? null,
    no_telp: data.noHP ?? null,
    jenis_pembiayaan: data.jenisPembiayaan,
    kelas_perawatan: data.kelasPerawatan,
    asuransi: data.asuransi ?? null,
  };

  const { data: row, error } = await supabase
    .from("pasien")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) {
    throw new Error("Pasien tidak ditemukan atau tidak ada perubahan.");
  }

  await logPasienAudit(
    "UPDATE",
    { patient_id: id, no_rm: data.noRM, nama: payload.nama },
    session.username,
  );

  return mapFromSupabase(row) as Pasien;
}

export async function patchPatientFields(
  id: string,
  partial: PasienPatchInput,
): Promise<Pasien> {
  await requireDashboardSession();

  const defined = Object.fromEntries(
    Object.entries(partial).filter(([, v]) => v !== undefined),
  ) as PasienPatchInput;
  if (Object.keys(defined).length === 0) {
    throw new Error("Tidak ada field untuk diperbarui");
  }

  const supabase = createAdminClient();
  const { data: row, error: fetchErr } = await supabase
    .from("pasien")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error("Pasien tidak ditemukan");

  const current = mapFromSupabase(row) as Pasien;

  const merged: PasienFormData = {
    noRM: defined.noRM ?? current.noRM,
    nama: defined.nama ?? current.nama,
    jenisKelamin: defined.jenisKelamin ?? current.jenisKelamin,
    tanggalLahir: defined.tanggalLahir ?? current.tanggalLahir,
    alamat: defined.alamat ?? current.alamat,
    noHP: defined.noHP !== undefined ? defined.noHP : (current.noHP ?? ""),
    jenisPembiayaan: current.jenisPembiayaan,
    kelasPerawatan: current.kelasPerawatan,
    asuransi: current.asuransi ?? "",
  };

  const parsed = pasienSchema.safeParse(merged);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      [...Object.values(flat.fieldErrors).flat(), ...flat.formErrors].join(
        "; ",
      ) || "Validasi gagal";
    throw new Error(msg);
  }

  return editPatient(id, parsed.data as Omit<Pasien, "id">);
}
