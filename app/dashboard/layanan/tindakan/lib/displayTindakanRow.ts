import { formatPasienLabel, type PasienOption } from "@/components/ui/pasien-combobox";
import { normalizeNamaPasien } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import { hitungUsia } from "@/app/dashboard/pasien/utils/formatUsia";
import type { TindakanJoinResult } from "../bridge/mapping.types";

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
  let umur =
    typeof r.umur === "number"
      ? r.umur
      : typeof r.usia === "number"
        ? r.usia
        : typeof r.umur === "string" && !isNaN(Number(r.umur))
          ? Number(r.umur)
          : typeof r.usia === "string" && !isNaN(Number(r.usia))
            ? Number(r.usia)
            : null;

  if (umur === null && tgl_lahir) {
    const calculated = hitungUsia(tgl_lahir);
    if (calculated && calculated.angka > 0) {
      umur = calculated.angka;
    }
  }

  const diagnosa =
    typeof r.diagnosa === "string"
      ? r.diagnosa
      : r.diagnosa != null
        ? String(r.diagnosa)
        : null;
  const faktor_risiko =
    typeof r.faktor_risiko === "string"
      ? r.faktor_risiko
      : r.faktor_risiko != null
        ? String(r.faktor_risiko)
        : null;
  const alamat =
    typeof r.alamat === "string"
      ? r.alamat
      : r.alamat != null
        ? String(r.alamat)
        : null;
  const no_telp =
    typeof r.no_telp === "string"
      ? r.no_telp
      : typeof r.no_hp === "string"
        ? r.no_hp
        : r.no_telp != null
          ? String(r.no_telp)
          : r.no_hp != null
            ? String(r.no_hp)
            : null;

  return {
    id,
    nama,
    no_rm,
    created_at,
    tgl_lahir,
    umur,
    ...(jk ? { jenis_kelamin: jk } : {}),
    ...(alamat != null && alamat !== "" ? { alamat } : {}),
    ...(no_telp != null && no_telp !== "" ? { no_telp } : {}),
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
    ...(diagnosa != null && diagnosa !== "" ? { diagnosa } : {}),
    ...(faktor_risiko != null && faktor_risiko !== ""
      ? { faktor_risiko }
      : {}),
  };
}

export function buildPasienLabelFromRow(raw: Record<string, unknown>): string {
  const namaFull = pickFirstString(raw, ["nama_pasien", "nama", "pasien_nama"]);
  const rmCol = pickFirstString(raw, [...RM_FIELD_KEYS]);
  const { baseNama, rmDalamKurung } = splitNamaDanRmDalamKurung(namaFull);
  const nama = (baseNama || namaFull).trim();
  const rm = rmDalamKurung || rmCol;
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

const resolvePasienCacheMap = new WeakMap<object, { result: PasienOption | null; optionsRef: PasienOption[] }>();

export function resolvePasienFromRow(
  options: PasienOption[],
  raw: Record<string, unknown>,
): PasienOption | null {
  const cached = resolvePasienCacheMap.get(raw);
  if (cached && cached.optionsRef === options) {
    return cached.result;
  }

  const result = (() => {
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
  })();

  resolvePasienCacheMap.set(raw, { result, optionsRef: options });
  return result;
}

/**
 * Indeks pasien untuk laporan / matriks (O(1) per baris, hindari scan linear ribuan master).
 */
export type PasienReportLookup = {
  byId: Map<string, PasienOption>;
  /** RM numerik → pasien hanya jika unik di master (sama aturan `resolvePasienFromRow`). */
  byRmSingleton: Map<string, PasienOption>;
  byLabel: Map<string, PasienOption>;
  byNormalizedNama: Map<string, PasienOption[]>;
};

export function buildPasienReportLookup(
  options: readonly PasienOption[],
): PasienReportLookup {
  const byId = new Map<string, PasienOption>();
  const rmBuckets = new Map<string, PasienOption[]>();
  const byLabel = new Map<string, PasienOption>();
  const byNormalizedNama = new Map<string, PasienOption[]>();

  for (const p of options) {
    const id = String(p.id ?? "").trim();
    if (id) byId.set(id, p);

    const d = normalizeDigitsOnly(p.no_rm ?? "");
    if (d.length >= 3) {
      const arr = rmBuckets.get(d);
      if (arr) arr.push(p);
      else rmBuckets.set(d, [p]);
    }

    const nn = normalizeNamaPasien(String(p.nama ?? "").trim());
    if (nn) {
      const arr = byNormalizedNama.get(nn);
      if (arr) arr.push(p);
      else byNormalizedNama.set(nn, [p]);
    }

    const lbl = formatPasienLabel({
      nama: p.nama ?? "",
      no_rm: p.no_rm ?? null,
    });
    if (lbl) byLabel.set(lbl, p);
  }

  const byRmSingleton = new Map<string, PasienOption>();
  for (const [d, arr] of rmBuckets) {
    if (arr.length === 1) byRmSingleton.set(d, arr[0]!);
  }

  return { byId, byRmSingleton, byLabel, byNormalizedNama };
}

/** Setara `resolvePasienFromRow` untuk data laporan; memakai indeks. */
export function resolvePasienFromLookup(
  raw: Record<string, unknown>,
  lookup: PasienReportLookup,
): PasienOption | null {
  const pid = String(raw.pasien_id ?? "").trim();
  if (pid) {
    const h = lookup.byId.get(pid);
    if (h) return h;
  }
  const label = buildPasienLabelFromRow(raw);
  if (label) {
    const h = lookup.byLabel.get(label);
    if (h) return h;
  }
  const namaFull = pickFirstString(raw, [
    "nama_pasien",
    "nama",
    "pasien_nama",
  ]);
  const { baseNama, rmDalamKurung } = splitNamaDanRmDalamKurung(namaFull);
  const namaForMatch = normalizeNamaPasien((baseNama || namaFull).trim());
  const rowRmDigits =
    normalizeDigitsOnly(pickFirstString(raw, [...RM_FIELD_KEYS])) ||
    normalizeDigitsOnly(rmDalamKurung);
  if (namaForMatch) {
    const hits = lookup.byNormalizedNama.get(namaForMatch);
    if (hits?.length === 1) return hits[0]!;
    if (hits && hits.length > 1 && rowRmDigits.length >= 3) {
      const byRm = hits.filter(
        (p) => normalizeDigitsOnly(p.no_rm ?? "") === rowRmDigits,
      );
      if (byRm.length === 1) return byRm[0]!;
    }
  }
  if (rowRmDigits.length >= 3) {
    const h = lookup.byRmSingleton.get(rowRmDigits);
    if (h) return h;
  }
  return null;
}

/** Sama seperti `resolvePasienOptionForLaporanCaraBayar` di matriks cara bayar. */
export function resolvePasienOptionForLaporanCaraBayarFromLookup(
  row: TindakanJoinResult,
  lookup: PasienReportLookup,
): PasienOption | null {
  const raw = row as unknown as Record<string, unknown>;
  const pid = String(raw.pasien_id ?? "").trim();
  if (pid) {
    const h = lookup.byId.get(pid);
    if (h) return h;
  }
  const rm = String(
    raw.no_rm ?? raw.rm ?? raw.no_rm_pasien ?? raw.nomor_rm ?? "",
  ).trim();
  const digits = normalizeDigitsOnly(rm);
  if (digits.length >= 3) {
    return lookup.byRmSingleton.get(digits) ?? null;
  }
  return null;
}

/** Untuk laporan modal: tampilkan nama/RM terbaru dari master bila baris terhubung. */
export function mergePasienMasterIntoRowForReport(
  row: TindakanJoinResult,
  options: readonly PasienOption[],
  lookup?: PasienReportLookup,
): TindakanJoinResult {
  if (!options.length) return row;
  const raw = row as unknown as Record<string, unknown>;
  const p = lookup
    ? resolvePasienFromLookup(raw, lookup)
    : resolvePasienFromRow(options as PasienOption[], raw);
  if (!p) return row;
  const next: TindakanJoinResult = { ...row };
  const nama = p.nama?.trim();
  if (nama) next.nama_pasien = nama;
  if (p.no_rm != null && String(p.no_rm).trim() !== "") {
    next.no_rm = String(p.no_rm);
  }
  if (p.jenis_kelamin) next.jenis_kelamin = p.jenis_kelamin;
  if (p.tgl_lahir) next.tgl_lahir = p.tgl_lahir;
  if (p.umur != null) next.umur = p.umur;
  if (p.alamat) next.alamat = p.alamat;
  if (p.no_telp) next.no_telp = p.no_telp;

  if (!next.kelas_pembiayaan && (p.jenis_pembiayaan || p.pembiayaan)) {
    const jp = (p.jenis_pembiayaan || p.pembiayaan || "").trim();
    const kls = (p.kelas_perawatan || p.kelas || "").trim();
    if (jp && kls) next.kelas_pembiayaan = `${jp} - ${kls}`;
    else if (jp) next.kelas_pembiayaan = jp;
    else if (kls) next.kelas_pembiayaan = kls;
  }
  if (!next.pembiayaan && (p.jenis_pembiayaan || p.pembiayaan)) {
    next.pembiayaan = (p.jenis_pembiayaan || p.pembiayaan || "").trim();
  }
  if (!next.kelas && (p.kelas_perawatan || p.kelas)) {
    next.kelas = (p.kelas_perawatan || p.kelas || "").trim();
  }
  if (!next.diagnosa && p.diagnosa) {
    next.diagnosa = p.diagnosa.trim();
  }
  if (!next.faktor_risiko && p.faktor_risiko) {
    next.faktor_risiko = p.faktor_risiko.trim();
  }
  return next;
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
