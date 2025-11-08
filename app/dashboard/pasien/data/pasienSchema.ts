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
    .regex(/^(\+62|0)[0-9]{8,15}$/, "Nomor HP tidak valid")
    .optional()
    .or(z.literal("")),
  jenisPembiayaan: z
    .enum(["BPJS", "Umum", "Asuransi"])
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
export const mapFromSupabase = (p: any) => ({
  id: String(p.id),
  noRM: p.no_rm ?? "",
  nama: p.nama ?? "",
  jenisKelamin: p.jk ?? "L",
  tanggalLahir: p.tanggal_lahir ?? "",
  alamat: p.alamat ?? "",
  noHP: p.no_hp ?? "",
  jenisPembiayaan: p.pembiayaan ?? "Umum",
  kelasPerawatan: p.kelas ?? "Kelas 2",
  asuransi: p.asuransi ?? "",
  created_at: p.created_at ?? "",
  updated_at: p.updated_at ?? "",
});

export const mapToSupabase = (p: PasienFormData) => ({
  no_rm: p.noRM,
  nama: p.nama,
  jk: p.jenisKelamin,
  tanggal_lahir: p.tanggalLahir,
  alamat: p.alamat,
  no_hp: p.noHP ?? "",
  pembiayaan: p.jenisPembiayaan,
  kelas: p.kelasPerawatan,
  asuransi: p.asuransi ?? "",
});
