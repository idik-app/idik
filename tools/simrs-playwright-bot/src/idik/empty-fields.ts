/** Mirror fieldsToCheck di TindakanDetailDrawer (allowlist bot = subset aman dari getPasien + dasar). */
export const EMPTY_FIELD_GROUPS: string[][] = [
  ["no_rm"],
  ["nama_pasien", "nama"],
  ["jenis_kelamin", "jk"],
  ["tgl_lahir"],
  ["alamat"],
  ["no_telp"],
  ["tanggal", "tanggal_tindakan"],
  ["waktu"],
  ["tindakan"],
  ["kategori"],
  ["status"],
  ["dokter"],
  ["diagnosa"],
  ["billing_simrs"],
  ["resume_erm"],
];

/** Field yang boleh diisi bot dari getPasien saja (fase lanjutan aman). */
export const BOT_FILLABLE_FROM_GETPASIEN = new Set([
  "no_rm",
  "nama_pasien",
  "nama",
  "jenis_kelamin",
  "jk",
  "tgl_lahir",
  "alamat",
  "no_telp",
]);

export function isEmptyValue(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  const s = String(val).trim();
  return s === "" || s === "—" || s === "-";
}

export function missingFields(record: Record<string, unknown>): string[] {
  const missing: string[] = [];
  for (const keys of EMPTY_FIELD_GROUPS) {
    const has = keys.some((k) => !isEmptyValue(record[k]));
    if (!has) missing.push(keys[0]!);
  }
  return missing;
}

export function isIncomplete(record: Record<string, unknown>): boolean {
  return missingFields(record).length > 0;
}

/** Patch hanya kolom kosong yang boleh diisi dari data getPasien. */
export function buildSafePatchFromPasien(
  record: Record<string, unknown>,
  mapped: {
    noRM: string;
    nama: string;
    jenisKelamin: string;
    tanggalLahir: string;
    alamat: string;
  },
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const candidates: [string, unknown][] = [
    ["no_rm", mapped.noRM],
    ["nama_pasien", mapped.nama],
    ["jenis_kelamin", mapped.jenisKelamin],
    ["tgl_lahir", mapped.tanggalLahir],
    ["alamat", mapped.alamat],
  ];
  for (const [key, value] of candidates) {
    if (!BOT_FILLABLE_FROM_GETPASIEN.has(key)) continue;
    if (isEmptyValue(record[key]) && !isEmptyValue(value)) {
      patch[key] = value;
    }
  }
  return patch;
}
