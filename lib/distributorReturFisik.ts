/** Nilai kolom `retur_fisik_status` untuk event KATALOG_RETUR. */
export const RETUR_FISIK_STATUS = [
  "MENUNGGU_AMBIL",
  "DIAMBIL_PETUGAS",
  "DITERIMA_DISTRIBUTOR",
] as const;

export type ReturFisikStatus = (typeof RETUR_FISIK_STATUS)[number];

export const RETUR_FISIK_LABEL: Record<ReturFisikStatus, string> = {
  MENUNGGU_AMBIL: "Menunggu diambil",
  DIAMBIL_PETUGAS: "Diambil petugas",
  DITERIMA_DISTRIBUTOR: "Diterima distributor",
};

export function isReturFisikStatus(v: string): v is ReturFisikStatus {
  return (RETUR_FISIK_STATUS as readonly string[]).includes(v);
}
