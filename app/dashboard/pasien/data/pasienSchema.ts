/* ============================================================
📁 File: app/dashboard/pasien/data/pasienSchema.ts
🩺 Skema validasi & mapping data pasien (IDIK-App)
============================================================ */

import { z } from "zod";

/* ------------------------------------------------------------
   🧩 Validasi input pasien
------------------------------------------------------------ */
export const pasienSchema = z.object({
  noRM: z.string().min(1, "Nomor RM wajib diisi"),
  nama: z.string().min(1, "Nama pasien wajib diisi"),
  jenisKelamin: z
    .enum(["L", "P"])
    .refine((val) => !!val, { message: "Jenis kelamin wajib dipilih" }),
  tanggalLahir: z
    .string()
    .min(4, "Tanggal lahir wajib diisi")
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Format tanggal lahir tidak valid (YYYY-MM-DD)"
    ),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  noHP: z
    .string()
    .refine(
      (s) => s === "" || /^(\+62|0)[0-9]{8,15}$/.test(s),
      "Nomor HP tidak valid (kosongkan atau format 08… / +62…)"
    ),
  jenisPembiayaan: z
    .enum(["BPJS", "NPBI", "Umum", "Asuransi"])
    .refine((val) => !!val, { message: "Jenis pembiayaan wajib dipilih" }),
  kelasPerawatan: z
    .enum(["Kelas 1", "Kelas 2", "Kelas 3"])
    .refine((val) => !!val, { message: "Kelas perawatan wajib dipilih" }),
  asuransi: z.string().optional().or(z.literal("")),
});

/* ------------------------------------------------------------
   🧠 Inferensi tipe otomatis dari schema
------------------------------------------------------------ */
export type PasienFormData = z.infer<typeof pasienSchema>;

/* ------------------------------------------------------------
   🔁 Mapper: Supabase ↔ Frontend (camelCase)
------------------------------------------------------------ */
function normalizeJenisPembiayaanFromDb(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (s === "BPJS PBI") return "NPBI";
  if (["BPJS", "NPBI", "Umum", "Asuransi"].includes(s)) return s;
  return s || "Umum";
}

export const mapFromSupabase = (p: any) => ({
  id: String(p.id),
  noRM: p.no_rm ?? "",
  nama: p.nama ?? "",
  // dukung beberapa variasi kolom yang pernah dipakai di repo/view
  jenisKelamin: p.jenis_kelamin ?? p.jk ?? "L",
  tanggalLahir: p.tgl_lahir ?? p.tanggal_lahir ?? "",
  alamat: p.alamat ?? "",
  noHP: p.no_telp ?? p.no_hp ?? "",
  jenisPembiayaan: normalizeJenisPembiayaanFromDb(
    p.jenis_pembiayaan ?? p.pembiayaan ?? "Umum"
  ),
  kelasPerawatan: p.kelas_perawatan ?? p.kelas ?? "Kelas 2",
  asuransi: p.asuransi ?? "",
  dokter: p.dokter_nama ?? p.nama_dokter ?? p.dokter ?? "",
  created_at: p.created_at ?? "",
  updated_at: p.updated_at ?? "",
});

export const mapToSupabase = (p: PasienFormData) => ({
  no_rm: p.noRM,
  nama: p.nama,
  jenis_kelamin: p.jenisKelamin,
  tgl_lahir: p.tanggalLahir,
  alamat: p.alamat,
  no_telp: p.noHP ?? "",
  jenis_pembiayaan: p.jenisPembiayaan,
  kelas_perawatan: p.kelasPerawatan,
  asuransi: p.asuransi ?? "",
});
