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
   📅 Tanggal lahir — DB (date / timestamptz / ISO) → YYYY-MM-DD
   Hindari string kosong ke Postgres (menjadi NULL) dan input type=text yang tidak lolos Zod.
------------------------------------------------------------ */
export function formatTanggalLahirFromDb(raw: unknown): string {
  if (raw == null || raw === "") return "";
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, "0");
    const d = String(raw.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(raw).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return s;
}

/** Nilai aman untuk kolom Postgres `date` — jangan kirim string kosong */
export function toPgDateFromForm(tanggalLahir: string | undefined | null): string | null {
  const n = formatTanggalLahirFromDb(tanggalLahir ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(n) ? n : null;
}

/** DB bisa menyimpan "1" / "Kelas 1" / angka — seragamkan ke enum form */
function normalizeKelasPerawatanFromDb(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "Kelas 2";
  if (/^Kelas [123]$/.test(s)) return s;
  if (/^[123]$/.test(s)) return `Kelas ${s}`;
  return s;
}

function normalizeJenisPembiayaanFromDb(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "Umum";
  const upper = s.toUpperCase();
  if (upper === "BPJS PBI" || upper === "PBI") return "NPBI";
  if (["BPJS", "NPBI", "UMUM", "ASURANSI"].includes(upper)) {
    return upper === "UMUM"
      ? "Umum"
      : upper === "ASURANSI"
        ? "Asuransi"
        : upper;
  }
  if (["BPJS", "NPBI", "Umum", "Asuransi"].includes(s)) return s;
  return s || "Umum";
}

export const mapFromSupabase = (p: any) => {
  const jp = String(p?.jenis_pembiayaan ?? "").trim();
  const legacy = String(p?.pembiayaan ?? "").trim();
  const rawPembiayaan = jp || legacy || "Umum";

  return {
  id: String(p.id),
  noRM: p.no_rm ?? "",
  nama: p.nama ?? "",
  // dukung beberapa variasi kolom yang pernah dipakai di repo/view
  jenisKelamin: p.jenis_kelamin ?? p.jk ?? "L",
  tanggalLahir: formatTanggalLahirFromDb(p.tgl_lahir ?? p.tanggal_lahir),
  alamat: p.alamat ?? "",
  noHP: p.no_telp ?? p.no_hp ?? "",
  jenisPembiayaan: normalizeJenisPembiayaanFromDb(rawPembiayaan),
  kelasPerawatan: normalizeKelasPerawatanFromDb(
    p.kelas_perawatan ?? p.kelas
  ),
  asuransi: p.asuransi ?? "",
  dokter: p.dokter_nama ?? p.nama_dokter ?? p.dokter ?? "",
  created_at: p.created_at ?? "",
  updated_at: p.updated_at ?? "",
};
};

export const mapToSupabase = (p: PasienFormData) => ({
  no_rm: p.noRM,
  nama: p.nama,
  jenis_kelamin: p.jenisKelamin,
  tgl_lahir: toPgDateFromForm(p.tanggalLahir),
  alamat: p.alamat,
  no_telp: p.noHP ?? "",
  jenis_pembiayaan: p.jenisPembiayaan,
  kelas_perawatan: p.kelasPerawatan,
  asuransi: p.asuransi ?? "",
});
