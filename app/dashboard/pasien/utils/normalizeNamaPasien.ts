/**
 * Normalisasi nama pasien untuk rekam medis:
 * - Huruf besar semua
 * - Rapatkan hanya spasi berlebih (2+ → 1), spasi tunggal tetap (termasuk saat mengetik antar kata)
 * - Hapus gelar/sapaan di akhir (mis. ", TN", ", NY", " TN")
 */

const SUFFIX_AFTER_COMMA =
  /\s*,\s*(TN|NY|NN|BY|AN|DR|DRG|BPK|IBU|SDR|SITA|NIT|NONA)\.?\s*$/i;

/** Gelar tanpa koma di depan (hanya jika di akhir string) */
const SUFFIX_WORD = /\s+(TN|NY|NN|BY)\.?\s*$/i;

function stripSuffixGelar(s: string): string {
  let t = s;
  while (true) {
    const next = t
      .replace(SUFFIX_AFTER_COMMA, "")
      .replace(SUFFIX_WORD, "");
    if (next === t) break;
    t = next.trim();
  }
  return t;
}

/**
 * Untuk field saat diketik: tidak memangkas spasi di akhir agar spasi antar kata tetap bisa diketik.
 * Rapatkan hanya spasi ganda.
 */
export function normalizeNamaPasienInput(raw: string): string {
  const collapsed = raw.replace(/\s{2,}/g, " ");
  return stripSuffixGelar(collapsed).toUpperCase();
}

/**
 * Untuk simpan ke DB / import: sama seperti input lalu trim penuh di akhir.
 */
export function normalizeNamaPasien(raw: string): string {
  return stripSuffixGelar(raw.replace(/\s{2,}/g, " "))
    .trim()
    .toUpperCase();
}
