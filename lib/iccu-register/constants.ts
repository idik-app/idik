/**
 * Nilai kolom `keterangan` pada baris dari migrasi demo rekapitulasi wireframe.
 * Baris ini disembunyikan dari daftar REGISTER operasional (GET /api/iccu-register),
 * tetapi tetap ada di DB agar Rekapitulasi / migrasi tes tidak terputus.
 * Untuk menyertakan di daftar pas API, pasang query `includeWireframeSeed=true`.
 */
export const ICCU_WIREFRAME_REKAP_DEMO_KETERANGAN =
  "__wireframe_seed_rekap_demo__";

/** Kunci invasive disimpan di `invasive_procedures` (jsonb array). */
export const ICCU_INVASIVE_KEYS = [
  "ventilator",
  "niv",
  "hfnc",
  "cvc",
  "pdt",
  "dca",
  "ptca",
  "tpm",
  "ppm",
  "pericardiosintesis",
  "ablasi",
  "streptase",
] as const;

export type IccuInvasiveKey = (typeof ICCU_INVASIVE_KEYS)[number];

export const ICCU_INVASIVE_LABELS: Record<IccuInvasiveKey, string> = {
  ventilator: "VENTILATOR",
  niv: "NIV",
  hfnc: "HFNC",
  cvc: "CVC",
  pdt: "PDT",
  dca: "DCA",
  ptca: "PTCA",
  tpm: "TPM",
  ppm: "PPM",
  pericardiosintesis: "PERICARDIOSINTESIS",
  ablasi: "ABLASI",
  streptase: "STREPTASE",
};

export const ICCU_CARA_KELUAR = [
  "pindah_ruangan",
  "krs",
  "pulang_paksa",
  "rujuk",
  "meninggal",
] as const;

export type IccuCaraKeluar = (typeof ICCU_CARA_KELUAR)[number];

export const ICCU_CARA_KELUAR_LABELS: Record<IccuCaraKeluar, string> = {
  pindah_ruangan: "Pindah ruangan",
  krs: "KRS / Pulang",
  pulang_paksa: "Pulang paksa",
  rujuk: "Rujuk",
  meninggal: "Meninggal",
};

/** Asal pasien (teks bebas + beberapa preset UI). */
export const ICCU_ASAL_PRESETS = [
  "IGD",
  "POLI",
  "RUJUKAN",
  "OK",
  "CATHLAB",
] as const;

/** Pilihan posisi BED (tempat tidur) di register ICCU. */
export const ICCU_BED_OPTIONS = [
  "ICCU-1",
  "ICCU-2",
  "ICCU-3",
  "ICCU-4",
  "ICCU-5",
  "ICCU-6",
  "ICCU-7",
  "ICCU-8",
] as const;

export type IccuBedOption = (typeof ICCU_BED_OPTIONS)[number];
