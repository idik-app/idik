// =============================================================
// 📌 TYPE DEFINITIONS — LAYANAN TINDAKAN (BRIDGE LAYER)
// =============================================================

// =============================================================
// 1. JOIN RESULT (38 kolom dari database + relasi)
// =============================================================
export interface TindakanJoinResult {
  /** Primary key Supabase — wajib untuk drawer, CRUD, deep link pemakaian */
  id?: string;
  pasien_id?: string | null;
  no: number | null;
  tanggal: string | null;
  waktu: string | null;
  fluoro_time: number | null;
  dose: number | null;
  kv: number | null;
  ma: number | null;
  status_duplikat: string | null;

  no_rm: string | null;
  nama_pasien: string | null;
  /** Denormalisasi / join pasien (jk, jenis_kelamin) bila ada di baris API */
  jenis_kelamin?: string | null;
  tgl_lahir: string | null;
  umur: number | null;
  alamat: string | null;
  no_telp: string | null;

  ruangan: string | null;
  cath: string | null;
  dokter: string | null;
  tindakan: string | null;
  kategori: string | null;

  hasil_lab_ppm: string | null;
  diagnosa: string | null;
  severity_level: string | null;

  asisten: string | null;
  sirkuler: string | null;
  logger: string | null;

  status: string | null;
  kelas: string | null;
  lama_perawatan: number | null;
  level: string | null;
  perolehan: string | null;

  kelas_pembiayaan: string | null;
  pembiayaan: string | null;

  tarif_tindakan: number | null;
  consumable: number | null;
  total: number | null;
  krs: string | null;
  selisih: number | null;
  resume: string | null;

  pemakaian: string | null; // JSON, teks, atau summary

  /** Metadata audit dari API/DB (opsional, tab Resume) */
  created_at?: string | null;
  updated_at?: string | null;
  inserted_at?: string | null;
}

// =============================================================
// 2. DETAIL VIEW STRUCTURE (untuk modal detail, 5 section)
// =============================================================
export interface TindakanDetailView {
  pasien: Record<string, any>;
  tindakan: Record<string, any>;
  mesin: Record<string, any>;
  klinis: Record<string, any>;
  keuangan: Record<string, any>;
}

// =============================================================
// 3. EDITOR FORM STATE (untuk modal editor 4 tab)
// =============================================================
export interface TindakanEditorState {
  info: {
    tanggal: string;
    waktu: string;
    dokter: string;
    tindakan: string;
    kategori: string;
    severity_level: string;
    status: string;
    ruangan: string;
    kelas_pembiayaan: string;
    tarif_tindakan: string;
  };
  mesin: {
    fluoro_time: string;
    dose: string;
    kv: string;
    ma: string;
    cath: string;
  };
  klinis: {
    diagnosa: string;
    hasil_lab_ppm: string;
    asisten: string;
    sirkuler: string;
    logger: string;
    lama_perawatan: string;
  };
  summary: {
    krs: string;
    resume: string;

    // Readonly fields
    consumable: string;
    total: string;
    selisih: string;
  };
}

// =============================================================
// 4. TABLE ROW TYPE (untuk tabel ringkas 12 kolom)
// =============================================================
export interface TindakanTableRow {
  id: string;
  tanggal: string;
  waktu: string;
  no_rm: string;
  nama_pasien: string;
  dokter: string;
  tindakan: string;
  kategori: string;
  severity_level: string;
  ruangan: string;
  status: string;
  total: number;
}

// =============================================================
// 5. EVENT PAYLOAD TYPES — Untuk EventBridge
// =============================================================
export interface TindakanEventPayload {
  id?: string;
  record?: any;
  message?: string;
  ts?: number;
  stats?: any;
}
