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

export function displayRm(row: Record<string, unknown>): string {
  return (
    pickFirstString(row, [
      "no_rm",
      "nomor_rm",
      "no_rekam_medis",
      "rm",
      "no_rm_pasien",
    ]) || "—"
  );
}

export function displayNamaPasien(row: Record<string, unknown>): string {
  return (
    pickFirstString(row, ["nama_pasien", "nama", "pasien_nama"]) || "—"
  );
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
