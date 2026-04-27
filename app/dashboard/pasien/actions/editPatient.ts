"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardSession } from "@/lib/auth/requireDashboardSession";
import { Pasien } from "../types/pasien";
import { logPasienAudit } from "@/lib/audit/logPasien";
import { normalizeNamaPasien } from "../utils/normalizeNamaPasien";
import { mapFromSupabase, toPgDateFromForm } from "../data/pasienSchema";
import {
  pasienSchema,
  type PasienFormData,
} from "../data/pasienValidation";

/** Hanya field form utama — PATCH drawer mengirim subset; jangan validasi seluruh pasien (menyebabkan pesan error “nyasar” ke field lain). */
const PASIEN_PATCH_SCHEMA_KEYS = new Set<keyof PasienFormData>([
  "noRM",
  "nama",
  "jenisKelamin",
  "tanggalLahir",
  "alamat",
  "noHP",
]);

function assertPasienPatchFieldsValid(
  merged: PasienFormData,
  defined: PasienPatchInput,
): void {
  for (const key of Object.keys(defined) as (keyof PasienPatchInput)[]) {
    if (!PASIEN_PATCH_SCHEMA_KEYS.has(key as keyof PasienFormData)) continue;
    const formKey = key as keyof PasienFormData;
    const fieldSchema = pasienSchema.shape[formKey];
    const result = fieldSchema.safeParse(merged[formKey]);
    if (!result.success) {
      const msg =
        result.error.issues.map((i) => i.message).join("; ") || "Validasi gagal";
      throw new Error(msg);
    }
  }
}

/** PATCH drawer / UI — hanya kolom yang dikirim; sisanya dari baris DB saat ini. */
export type PasienPatchInput = Partial<
  Pick<
    PasienFormData,
    "noRM" | "nama" | "jenisKelamin" | "tanggalLahir" | "alamat" | "noHP"
  >
> & {
  pci_report_link?: string | null;
  diagnosa?: string | null;
  faktor_risiko?: string | null;
  severity_level?: string | null;
  hasil_lab_ppm?: string | null;
  temuan_pembuluh?: string | null;
  kesimpulan_laporan?: string | null;
  plan_medis?: string | null;
  total_kontras?: string | null;
  air_kerma?: number | string | null;
  dap_dose?: number | string | null;
};

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
    pci_report_link: data.pci_report_link ?? null,
    diagnosa: data.diagnosa ?? null,
    faktor_risiko: data.faktor_risiko ?? null,
    severity_level: data.severity_level ?? null,
    hasil_lab_ppm: data.hasil_lab_ppm ?? null,
    temuan_pembuluh: data.temuan_pembuluh ?? null,
    kesimpulan_laporan: data.kesimpulan_laporan ?? null,
    plan_medis: data.plan_medis ?? null,
    total_kontras: data.total_kontras ?? null,
    air_kerma: data.air_kerma ?? null,
    dap_dose: data.dap_dose ?? null,
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

  const clinical = {
    pci_report_link: defined.pci_report_link !== undefined ? defined.pci_report_link : current.pci_report_link,
    diagnosa: defined.diagnosa !== undefined ? defined.diagnosa : current.diagnosa,
    faktor_risiko: defined.faktor_risiko !== undefined ? defined.faktor_risiko : current.faktor_risiko,
    severity_level: defined.severity_level !== undefined ? defined.severity_level : current.severity_level,
    hasil_lab_ppm: defined.hasil_lab_ppm !== undefined ? defined.hasil_lab_ppm : current.hasil_lab_ppm,
    temuan_pembuluh: defined.temuan_pembuluh !== undefined ? defined.temuan_pembuluh : current.temuan_pembuluh,
    kesimpulan_laporan: defined.kesimpulan_laporan !== undefined ? defined.kesimpulan_laporan : current.kesimpulan_laporan,
    plan_medis: defined.plan_medis !== undefined ? defined.plan_medis : current.plan_medis,
    total_kontras: defined.total_kontras !== undefined ? defined.total_kontras : current.total_kontras,
    air_kerma: defined.air_kerma !== undefined ? defined.air_kerma : current.air_kerma,
    dap_dose: defined.dap_dose !== undefined ? defined.dap_dose : current.dap_dose,
  };

  assertPasienPatchFieldsValid(merged, defined);

  return editPatient(id, { ...merged, ...clinical } as Omit<Pasien, "id">);
}
