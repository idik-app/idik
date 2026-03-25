/* ============================================================
   🩺 Type Definition — Pasien Cathlab (IDIK-App)
   Versi konsisten camelCase (sinkron dengan frontend)
   Tetap kompatibel dengan tabel Supabase public.pasien
============================================================ */

export interface Pasien {
  id: string; // Primary key (uuid / bigint)
  noRM: string; // Nomor Rekam Medis (Supabase: no_rm)
  nama: string; // Nama lengkap pasien
  jenisKelamin: "L" | "P"; // Jenis kelamin (Supabase: jk)
  usia?: number; // Usia pasien (opsional)
  tanggalLahir: string; // Format ISO (YYYY-MM-DD) — Supabase: tanggal_lahir
  alamat: string;
  noHP?: string; // Supabase: no_hp

  /** Jenis Pembiayaan — NPBI = non-PBI / PBI (nama tampilan singkat) */
  jenisPembiayaan: "BPJS" | "NPBI" | "Umum" | "Asuransi"; // Supabase: pembiayaan

  kelasPerawatan: "Kelas 1" | "Kelas 2" | "Kelas 3"; // Supabase: kelas
  asuransi?: string;
  /** Jika view/join menyediakan nama DPJP (opsional) */
  dokter?: string;
  created_at?: string;
  updated_at?: string;
}

/* ============================================================
   🔧 Helper Types
============================================================ */

/** Data input form (tanpa id & timestamp) */
export type PasienInput = Omit<Pasien, "id" | "created_at" | "updated_at">;

/** Data ringan untuk tampilan ringkas */
export interface PasienLite {
  id: string;
  nama: string;
  noRM: string;
  jenisPembiayaan: string;
  kelasPerawatan: string;
}

/** Data agregasi untuk rekap dan grafik */
export interface PasienStats {
  total: number;
  hariIni: number;
  bpjs: number;
  umum: number;
  asuransi: number;
  kelas1: number;
  kelas2: number;
  kelas3: number;
}
