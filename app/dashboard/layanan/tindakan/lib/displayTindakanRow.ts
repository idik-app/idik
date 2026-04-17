import { formatPasienLabel, type PasienOption } from "@/components/ui/pasien-combobox";
import { normalizeNamaPasien } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";

/**
 * Normalisasi tampilan baris tindakan — beberapa baris DB punya RM/nama kosong
 * atau nama kolom bervariasi.
 */
export function pickFirstString(
  row: Record<string, unknown>,
  keys: string[],
): string {
  for (const k of keys) {
    const v = row[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s !== "") return s;
  }
  return "";
}

/** Kunci umum untuk no. RM di baris tindakan / join (bervariasi antar schema). */
export const RM_FIELD_KEYS = [
  "no_rm",
  "nomor_rm",
  "no_rekam_medis",
  "rm",
  "no_rm_pasien",
] as const;

/** Kunci umum untuk nama pasien di baris tindakan / join (bervariasi antar schema). */
export const NAMA_FIELD_KEYS = [
  "nama_pasien",
  "nama",
  "pasien_nama",
] as const;

/**
 * Pecah "RAHMAN (919499)" → nama dasar + RM di dalam kurung.
 * Menghindari salah arti "(TN)" dua huruf sebagai RM.
 */
export function splitNamaDanRmDalamKurung(input: string): {
  baseNama: string;
  rmDalamKurung: string;
} {
  const t = String(input ?? "").trim();
  const m = t.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!m) return { baseNama: t, rmDalamKurung: "" };
  const inner = String(m[2] ?? "").trim();
  const base = String(m[1] ?? "").trim();
  if (inner.length < 2 || inner.length > 24) {
    return { baseNama: t, rmDalamKurung: "" };
  }
  if (inner.length === 2 && /^[A-Za-z]{2}$/.test(inner)) {
    return { baseNama: t, rmDalamKurung: "" };
  }
  return { baseNama: base || t, rmDalamKurung: inner };
}

export function displayRm(row: Record<string, unknown>): string {
  const col = pickFirstString(row, [...RM_FIELD_KEYS]);
  if (col) return col;
  const nama = pickFirstString(row, [...NAMA_FIELD_KEYS]);
  const { rmDalamKurung } = splitNamaDanRmDalamKurung(nama);
  return rmDalamKurung || "—";
}

export function displayNamaPasien(row: Record<string, unknown>): string {
  return pickFirstString(row, [...NAMA_FIELD_KEYS]) || "—";
}

export type JenisKelaminLp = "L" | "P";

/** Normalisasi nilai DB / teks bebas → L atau P. */
export function normalizeJenisKelamin(raw: unknown): JenisKelaminLp | null {
  const s = String(raw ?? "").trim().toUpperCase();
  if (s === "L" || s === "LAKI-LAKI" || s === "LAKI") return "L";
  if (s === "P" || s === "PEREMPUAN" || s === "W") return "P";
  return null;
}

/**
 * Infer L/P dari sufiks gelar di kolom nama: ", TN" / ", TN." (Tuan) → L,
 * ", NY" / ", NY." (Nyonya) → P. Contoh: `NAMA, TN. (919759)`.
 */
export function inferJenisKelaminFromNamaPasien(
  nama: unknown,
): JenisKelaminLp | null {
  const s = String(nama ?? "").trim();
  if (!s) return null;
  const m = s.match(/,\s*(TN|NY)\.?\s*(?:\(|$)/i);
  if (!m) return null;
  const t = m[1].toUpperCase();
  if (t === "TN") return "L";
  if (t === "NY") return "P";
  return null;
}

export function resolveJenisKelaminFromRow(
  raw: Record<string, unknown>,
  pasien: { jenis_kelamin?: JenisKelaminLp | null } | null | undefined,
): JenisKelaminLp | null {
  const fromRow = normalizeJenisKelamin(
    raw.jenis_kelamin ?? raw.jk ?? raw.gender,
  );
  if (fromRow) return fromRow;
  const fromP = pasien?.jenis_kelamin;
  if (fromP === "L" || fromP === "P") return fromP;
  const nama = pickFirstString(raw, [...NAMA_FIELD_KEYS]);
  return inferJenisKelaminFromNamaPasien(nama);
}

export function formatJenisKelaminDisplay(
  jk: JenisKelaminLp | null,
): string {
  if (jk === "L") return "Laki-laki";
  if (jk === "P") return "Perempuan";
  return "—";
}

/** Master data mapping helpers */

export function normalizeDigitsOnly(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

export function mapApiPasienRow(r: Record<string, unknown>): PasienOption | null {
  const rawId = r.id;
  if (rawId == null || rawId === "") return null;
  const id = String(rawId);
  const nama = typeof r.nama === "string" ? r.nama : String(r.nama ?? "");
  const rmStr = pickFirstString(r, [...RM_FIELD_KEYS]);
  const no_rm = rmStr === "" ? null : rmStr;
  const ca = r.created_at;
  const created_at =
    typeof ca === "string"
      ? ca
      : ca instanceof Date
        ? ca.toISOString()
        : ca != null
          ? String(ca)
          : null;
  /** Selaras `mapFromSupabase` (pasien): null di DB → fallback "L", supaya daftar tindakan = drawer detail. */
  const jk = normalizeJenisKelamin(r.jenis_kelamin ?? r.jk ?? "L");
  const jenis_pembiayaan =
    typeof r.jenis_pembiayaan === "string"
      ? r.jenis_pembiayaan
      : r.jenis_pembiayaan != null
        ? String(r.jenis_pembiayaan)
        : null;
  const kelas_perawatan =
    typeof r.kelas_perawatan === "string"
      ? r.kelas_perawatan
      : r.kelas_perawatan != null
        ? String(r.kelas_perawatan)
        : null;
  const legacyPem = typeof r.pembiayaan === "string" ? r.pembiayaan : null;
  const legacyKelas = typeof r.kelas === "string" ? r.kelas : null;
  const tgl_lahir =
    typeof r.tgl_lahir === "string"
      ? r.tgl_lahir
      : r.tanggal_lahir != null
        ? String(r.tanggal_lahir)
        : null;
  const umur =
    typeof r.umur === "number"
      ? r.umur
      : typeof r.usia === "number"
        ? r.usia
        : null;

  return {
    id,
    nama,
    no_rm,
    created_at,
    tgl_lahir,
    umur,
    ...(jk ? { jenis_kelamin: jk } : {}),
    ...(jenis_pembiayaan != null && jenis_pembiayaan !== ""
      ? { jenis_pembiayaan }
      : {}),
    ...(kelas_perawatan != null && kelas_perawatan !== ""
      ? { kelas_perawatan }
      : {}),
    ...(legacyPem != null && legacyPem !== "" ? { pembiayaan: legacyPem } : {}),
    ...(legacyKelas != null && legacyKelas !== ""
      ? { kelas: legacyKelas }
      : {}),
  };
}

export function buildPasienLabelFromRow(raw: Record<string, unknown>): string {
  const namaFull = pickFirstString(raw, ["nama_pasien", "nama", "pasien_nama"]);
  const rmCol = pickFirstString(raw, [...RM_FIELD_KEYS]);
  const { baseNama, rmDalamKurung } = splitNamaDanRmDalamKurung(namaFull);
  const nama = (baseNama || namaFull).trim();
  const rm = rmCol || rmDalamKurung;
  if (nama || rm) return formatPasienLabel({ nama, no_rm: rm || null });
  return "";
}

export function resolvePasienFromLabel(
  options: PasienOption[],
  label: string,
): PasienOption | null {
  const t = label.trim();
  if (!t) return null;
  for (const p of options) {
    if (formatPasienLabel(p) === t) return p;
  }
  return null;
}

export function resolvePasienFromRow(
  options: PasienOption[],
  raw: Record<string, unknown>,
): PasienOption | null {
  const pid = String(raw.pasien_id ?? "").trim();
  if (pid) {
    const hit = options.find((p) => String(p.id) === pid);
    if (hit) return hit;
  }
  const label = buildPasienLabelFromRow(raw);
  if (label) {
    const byLabel = resolvePasienFromLabel(options, label);
    if (byLabel) return byLabel;
  }
  const namaFull = pickFirstString(raw, ["nama_pasien", "nama", "pasien_nama"]);
  const { baseNama, rmDalamKurung } = splitNamaDanRmDalamKurung(namaFull);
  const namaForMatch = normalizeNamaPasien((baseNama || namaFull).trim());
  const rowRmDigits =
    normalizeDigitsOnly(pickFirstString(raw, [...RM_FIELD_KEYS])) ||
    normalizeDigitsOnly(rmDalamKurung);
  if (namaForMatch) {
    const hits = options.filter(
      (p) => normalizeNamaPasien(p.nama ?? "") === namaForMatch,
    );
    if (hits.length === 1) return hits[0]!;
    if (hits.length > 1 && rowRmDigits.length >= 3) {
      const byRm = hits.filter(
        (p) => normalizeDigitsOnly(p.no_rm ?? "") === rowRmDigits,
      );
      if (byRm.length === 1) return byRm[0]!;
    }
  }

  // Fallback penting untuk data legacy: jika `pasien_id` belum tersimpan konsisten
  // atau nama di tindakan sudah berubah casing/format, tetap coba resolve via RM.
  if (rowRmDigits.length >= 3) {
    const byRm = options.filter(
      (p) => normalizeDigitsOnly(p.no_rm ?? "") === rowRmDigits,
    );
    if (byRm.length === 1) return byRm[0]!;
  }
  return null;
}

/**
 * Nilai header "Pasien aktif" bisa berupa RM mentah, teks bebas, atau label combobox
 * `formatPasienLabel`: "Nama (RM)" — filter baris harus mem-parsing itu.
 */
export function parsePasienAktifFilter(input: string): {
  rm: string;
  nama: string;
  freeText: string;
} {
  const t = input.trim();
  if (!t) return { rm: "", nama: "", freeText: "" };
  const m = t.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (m) {
    return { rm: m[2].trim(), nama: m[1].trim(), freeText: "" };
  }
  return { rm: "", nama: "", freeText: t };
}

function normalizeRm(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/^rm/, "");
}

export function rowMatchesPasienAktifFilter(
  row: Record<string, unknown>,
  parsed: ReturnType<typeof parsePasienAktifFilter>,
): boolean {
  const { rm, nama, freeText } = parsed;
  if (!rm && !nama && !freeText) return true;
  const dispRm = displayRm(row).toLowerCase();
  const dispNama = displayNamaPasien(row).toLowerCase();
  if (freeText) {
    const q = freeText.toLowerCase();
    const qRm = normalizeRm(freeText);
    return (
      dispRm.includes(q) ||
      dispNama.includes(q) ||
      (Boolean(qRm) && normalizeRm(dispRm).includes(qRm))
    );
  }
  const rmNorm = rm.toLowerCase();
  const dispRmNorm = normalizeRm(dispRm);
  const rmNormNormalized = normalizeRm(rm);
  const namaNorm = nama.toLowerCase();
  const rmMatch =
    !!rm &&
    dispRm !== "—" &&
    (
      dispRm === rmNorm ||
      dispRm.includes(rmNorm) ||
      (Boolean(rmNormNormalized) &&
        (dispRmNorm === rmNormNormalized ||
          dispRmNorm.includes(rmNormNormalized) ||
          rmNormNormalized.includes(dispRmNorm)))
    );
  const namaMatch =
    !!nama &&
    dispNama !== "—" &&
    dispNama.includes(namaNorm);
  return rmMatch || namaMatch;
}
