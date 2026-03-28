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

const NAMA_FIELD_KEYS = ["nama_pasien", "nama", "pasien_nama"] as const;

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
  return null;
}

export function formatJenisKelaminDisplay(
  jk: JenisKelaminLp | null,
): string {
  if (jk === "L") return "Laki-laki";
  if (jk === "P") return "Perempuan";
  return "—";
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
