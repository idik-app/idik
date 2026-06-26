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
  dap_gy_cm2: number | null;
  /** Kolom klinis DAP (mGy·cm); dipakai bila DB tidak punya `dap_gy_cm2`. */
  dap_dose?: number | null;
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
  /** Dokter anestesi (teks bebas), kolom `dokter_anestesi` di DB */
  dokter_anestesi?: string | null;
  /** PPDS (teks bebas), kolom `ppds` di DB */
  ppds?: string | null;
  tindakan: string | null;
  kategori: string | null;
  temuan_pembuluh: string | null;
  kesimpulan_laporan: string | null;
  plan_medis: string | null;

  hasil_lab_ppm: string | null;
  diagnosa: string | null;
  faktor_risiko: string | null;
  severity_level: string | null;
  total_kontras: string | null;
  pci_report_link: string | null;

  /** Fast-Track STEMI / IGD (teks) */
  is_fast_track?: boolean | null;
  pasien_datang_igd?: string | null;
  door_to_balloon?: string | null;
  total_waktu_fast_track?: string | null;
  fast_track_sign_in?: string | null;
  fast_track_time_out?: string | null;
  fast_track_sign_out?: string | null;
  /** JSON array string URL foto Fast-Track */
  fast_track_fotos?: string | null;

  asisten: string | null;
  sirkuler: string | null;
  logger: string | null;
  rs_perujuk?: string | null;
  keterangan?: string | null;
  /** Keterangan khusus status (mis. alasan pembatalan) */
  status_keterangan?: string | null;

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

  asmed?: string | null;
  resume_erm?: string | null;
  sjp?: string | null;
  berkas_laporan?: string | null;
  consumable_kelengkapan?: string | null;
  billing_simrs?: string | null;
  pj_laporan?: string | null;
  operan_ranap?: string | null;

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
    dap_gy_cm2: string;
    kv: string;
    ma: string;
    cath: string;
  };
  klinis: {
    diagnosa: string;
    hasil_lab_ppm: string;
    pci_report_link: string;
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
