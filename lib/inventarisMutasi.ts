/** Tipe mutasi stok (sinkron dengan DB check + RPC). */
export const INVENTARIS_STOK_MUTASI_TIPE = [
  "MASUK",
  "KELUAR_RETUR",
  "KELUAR_RUSAK",
  "KELUAR_PEMAKAIAN",
  "KOREKSI",
] as const;

export type InventarisStokMutasiTipe =
  (typeof INVENTARIS_STOK_MUTASI_TIPE)[number];

/** Tipe yang boleh dicatat oleh distributor lewat portal (bukan jalur pemakaian RS). */
export const DISTRIBUTOR_MUTASI_INPUT_TIPE: readonly InventarisStokMutasiTipe[] = [
  "MASUK",
  "KELUAR_RETUR",
  "KELUAR_RUSAK",
  "KOREKSI",
];

export const MUTASI_TIPE_LABEL: Record<InventarisStokMutasiTipe, string> = {
  MASUK: "Masuk / pengiriman",
  KELUAR_RETUR: "Keluar retur",
  KELUAR_RUSAK: "Keluar rusak / hangus",
  KELUAR_PEMAKAIAN: "Pemakaian",
  KOREKSI: "Koreksi stok",
};
