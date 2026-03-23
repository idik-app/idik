// =============================================================
// 📌 BRIDGE CONSTANTS — LAYANAN TINDAKAN (FINAL MASTER CONSTANTS)
// =============================================================

// -------------------------------------------------------------
// 🔥 1. Severity Level (Medis)
// -------------------------------------------------------------
export const SEVERITY_LEVELS = ["Low", "Moderate", "High", "Critical"];

// -------------------------------------------------------------
// 🩺 2. Kategori Tindakan
// -------------------------------------------------------------
export const TINDAKAN_KATEGORI = [
  "Cathlab",
  "PCI",
  "Diagnostic",
  "PPM",
  "EVT",
  "Emergency",
  "Control",
];

// -------------------------------------------------------------
// 💳 3. Pembiayaan
// -------------------------------------------------------------
export const PEMBIAYAAN_TYPES = ["BPJS", "UMUM", "Asuransi", "Karyawan"];

// -------------------------------------------------------------
// 🏥 4. Status Tindakan
// -------------------------------------------------------------
export const TINDAKAN_STATUS = ["Selesai", "Proses", "Pending", "Dibatalkan"];

// -------------------------------------------------------------
// 🗂 5. MASTER SCHEMA — 38 KOLUM (FINAL IDIK)
// -------------------------------------------------------------
export const TINDAKAN_SCHEMA_38 = [
  "no",
  "tanggal",
  "waktu",
  "fluoro_time",
  "dose",
  "kv",
  "ma",
  "status_duplikat",
  "no_rm",
  "nama_pasien",
  "tgl_lahir",
  "umur",
  "alamat",
  "no_telp",
  "ruangan",
  "cath",
  "dokter",
  "tindakan",
  "kategori",
  "hasil_lab_ppm",
  "diagnosa",
  "severity_level",
  "asisten",
  "sirkuler",
  "logger",
  "status",
  "kelas",
  "lama_perawatan",
  "level",
  "perolehan",
  "kelas_pembiayaan",
  "pembiayaan",
  "tarif_tindakan",
  "consumable",
  "total",
  "krs",
  "selisih",
  "resume",
  "pemakaian",
];

// -------------------------------------------------------------
// 🔍 6. Grouping untuk Modal Detail (5 Bagian)
// -------------------------------------------------------------
export const DETAIL_GROUPS = {
  pasien: ["no_rm", "nama_pasien", "tgl_lahir", "umur", "alamat", "no_telp"],
  tindakan: [
    "tanggal",
    "waktu",
    "dokter",
    "tindakan",
    "kategori",
    "severity_level",
    "ruangan",
    "status",
  ],
  mesin: ["fluoro_time", "dose", "kv", "ma", "cath", "status_duplikat"],
  klinis: [
    "diagnosa",
    "hasil_lab_ppm",
    "asisten",
    "sirkuler",
    "logger",
    "lama_perawatan",
  ],
  keuangan: [
    "tarif_tindakan",
    "consumable",
    "total",
    "selisih",
    "kelas_pembiayaan",
    "pembiayaan",
    "krs",
    "resume",
  ],
};

// -------------------------------------------------------------
// ✏ 7. Grouping untuk Modal Editor (4 Tab)
// -------------------------------------------------------------
export const EDITOR_TABS = {
  info: [
    "tanggal",
    "waktu",
    "dokter",
    "tindakan",
    "kategori",
    "severity_level",
    "status",
    "ruangan",
    "kelas_pembiayaan",
    "pembiayaan",
    "tarif_tindakan",
  ],
  mesin: ["fluoro_time", "dose", "kv", "ma", "cath"],
  klinis: [
    "diagnosa",
    "hasil_lab_ppm",
    "asisten",
    "sirkuler",
    "logger",
    "lama_perawatan",
  ],
  summary: [
    "krs",
    "resume",

    // readonly
    "consumable",
    "total",
    "selisih",
  ],
};

// -------------------------------------------------------------
// 🎨 8. Badge / Color mapping (optional)
// -------------------------------------------------------------
export const SEVERITY_COLORS = {
  Low: "text-green-400",
  Moderate: "text-yellow-400",
  High: "text-orange-400",
  Critical: "text-red-500",
};

export const STATUS_COLORS = {
  Selesai: "text-green-400",
  Proses: "text-cyan-400",
  Pending: "text-yellow-400",
  Dibatalkan: "text-red-500",
};
