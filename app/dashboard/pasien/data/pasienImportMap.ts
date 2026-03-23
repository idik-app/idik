/* ============================================================
   📁 pasienImportMap.ts
   Map kolom spreadsheet (Excel/CSV) → format pasien IDIK-App
   Mendukung berbagai nama kolom yang umum dipakai
============================================================ */

/** Nama kolom spreadsheet → key camelCase kita */
const COLUMN_ALIASES: Record<string, string> = {
  "no. rm": "noRM",
  "no rm": "noRM",
  norm: "noRM",
  "no_rm": "noRM",
  "nomor rm": "noRM",
  nama: "nama",
  "nama lengkap": "nama",
  "nama pasien": "nama",
  jk: "jenisKelamin",
  "jenis kelamin": "jenisKelamin",
  "jenis_kelamin": "jenisKelamin",
  "l/p": "jenisKelamin",
  "tanggal lahir": "tanggalLahir",
  "tgl lahir": "tanggalLahir",
  "tgl_lahir": "tanggalLahir",
  "tanggal_lahir": "tanggalLahir",
  "tgl. lahir": "tanggalLahir",
  alamat: "alamat",
  "no. hp": "noHP",
  "no hp": "noHP",
  "no_hp": "noHP",
  "no. telp": "noHP",
  "no telp": "noHP",
  "no_telp": "noHP",
  telepon: "noHP",
  "no telepon": "noHP",
  pembiayaan: "jenisPembiayaan",
  "jenis pembiayaan": "jenisPembiayaan",
  "jenis_pembiayaan": "jenisPembiayaan",
  "kelas": "kelasPerawatan",
  "kelas perawatan": "kelasPerawatan",
  "kelas_perawatan": "kelasPerawatan",
  asuransi: "asuransi",
};

function normalizeKey(header: string): string {
  const lower = String(header ?? "").trim().toLowerCase();
  return COLUMN_ALIASES[lower] ?? lower;
}

/** Normalisasi nilai tanggal dari Excel (angka) atau string DD/MM/YYYY → YYYY-MM-DD */
function normalizeTanggalLahir(val: unknown): string {
  if (val == null || val === "") return "";
  if (typeof val === "number") {
    // Excel date: hari sejak 1900-01-01 (minus 2 untuk bug Lotus 123)
    const date = new Date((val - 25569) * 86400 * 1000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  // Sudah YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY atau DD-MM-YYYY
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  return s;
}

/** Normalisasi JK: Laki-laki/L/Pria → L, Perempuan/P/Wanita → P */
function normalizeJK(val: unknown): string {
  const s = String(val ?? "").trim().toUpperCase();
  if (s === "L" || s === "P") return s;
  if (/^(LAKI|PRIA|MALE|LK)$/i.test(s)) return "L";
  if (/^(PEREMPUAN|WANITA|FEMALE|W)$/i.test(s)) return "P";
  return s || "L";
}

/** Normalisasi pembiayaan */
function normalizePembiayaan(val: unknown): string {
  const s = String(val ?? "").trim();
  if (["BPJS", "BPJS PBI", "Umum", "Asuransi"].includes(s)) return s;
  if (/^PBI$/i.test(s)) return "BPJS PBI";
  if (/^BPJS/i.test(s)) return s.startsWith("BPJS PBI") ? "BPJS PBI" : "BPJS";
  if (/^(UMUM|SWASTA)$/i.test(s)) return "Umum";
  if (/^ASURANSI$/i.test(s)) return "Asuransi";
  return s || "Umum";
}

/** Normalisasi kelas perawatan */
function normalizeKelas(val: unknown): string {
  const s = String(val ?? "").trim();
  if (["Kelas 1", "Kelas 2", "Kelas 3"].includes(s)) return s;
  if (/^1$|Kelas 1/i.test(s)) return "Kelas 1";
  if (/^2$|Kelas 2/i.test(s)) return "Kelas 2";
  if (/^3$|Kelas 3/i.test(s)) return "Kelas 3";
  return "Kelas 2";
}

/**
 * Ubah satu baris sheet (object dengan key dari header) menjadi object siap validasi pasien.
 */
export function mapSheetRowToPasien(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [header, value] of Object.entries(row)) {
    const key = normalizeKey(header);
    if (!key) continue;
    out[key] = value;
  }
  // Normalisasi field yang perlu transform
  out.noRM = out.noRM != null ? String(out.noRM).trim() : "";
  out.nama = out.nama != null ? String(out.nama).trim() : "";
  out.jenisKelamin = normalizeJK(out.jenisKelamin);
  out.tanggalLahir = normalizeTanggalLahir(out.tanggalLahir);
  out.alamat = out.alamat != null ? String(out.alamat).trim() : "";
  out.noHP = out.noHP != null ? String(out.noHP).trim() : "";
  out.jenisPembiayaan = normalizePembiayaan(out.jenisPembiayaan);
  out.kelasPerawatan = normalizeKelas(out.kelasPerawatan);
  out.asuransi = out.asuransi != null ? String(out.asuransi).trim() : "";
  return out;
}
