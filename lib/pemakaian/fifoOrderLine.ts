/**
 * Kriteria baris order Cathlab yang memicu alokasi FIFO (`allocate_pemakaian_fifo`).
 *
 * - **Konsolidasi vs non Konsolidasi**: tidak dibedakan — keduanya boleh memicu FIFO
 *   jika baris lolos kriteria di bawah (sudah dihapus filter `isKonsolidasi` di API).
 * - **`qtyDipakai <= 0`**: tidak ada konsumsi → tidak ada yang dialokasikan (bukan bug;
 *   tidak perlu “solusi” FIFO).
 * - **`tipe`**: secara default hanya **N** (baru) yang mengurangi stok inventaris Cathlab
 *   lewat FIFO. **R** (reuse) dan **B** (rusak) di-skip agar tidak mencampur alur
 *   konsumsi dengan retur/rusak; jika bisnis Anda ingin stok Cathlab ikut berkurang
 *   untuk R/B, set `PEMAKAIAN_FIFO_INCLUDE_REUSE_DAN_RUSAK` ke `true`.
 */
export const PEMAKAIAN_FIFO_INCLUDE_REUSE_DAN_RUSAK = false;

export function lineEligibleForPemakaianFifo(item: {
  tipe: string;
  qtyDipakai: number;
}): boolean {
  if (item.qtyDipakai <= 0) return false;
  if (PEMAKAIAN_FIFO_INCLUDE_REUSE_DAN_RUSAK) {
    return item.tipe === "N" || item.tipe === "R" || item.tipe === "B";
  }
  return item.tipe === "N";
}
