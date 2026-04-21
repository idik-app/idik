/**
 * Pesan untuk error RPC `fifo_pemakaian_allocate_json` / `allocate_pemakaian_fifo`.
 *
 * Dipakai dari route alokasi terpisah (mis. `/api/pemakaian/allocate`). Kriteria baris order:
 * `lineEligibleForPemakaianFifo` di `fifoOrderLine.ts`
 * (Konsolidasi / non Konsolidasi sama; default hanya `tipe === "N"` dan `qtyDipakai > 0`).
 *
 * Error uuid sering disalahartikan sebagai "stok habis"; penyebabnya biasanya skema/fungsi DB.
 */
export function fifoAllocationUserMessage(
  namaBarangLabel: string,
  allocErrMessage: string,
): string {
  if (/invalid input syntax for type uuid/i.test(allocErrMessage)) {
    return (
      `Gagal stok FIFO untuk "${namaBarangLabel}" (baris tipe N yang dialokasikan bisa beda dari baris yang Anda edit). ` +
      `Biasanya ini bug fungsi database lama; terapkan migrasi sampai 20260422230000 lalu jalankan npx supabase db push ke project yang dipakai app, restart server. ` +
      `Detail: ${allocErrMessage}`
    );
  }
  if (
    /foreign key constraint/i.test(allocErrMessage) &&
    /pemakaian_cathlab_pemakaian_order_id_fkey/i.test(allocErrMessage)
  ) {
    return (
      `Gagal mencatat pemakaian untuk "${namaBarangLabel}": order cathlab (\`cathlab_pemakaian_order\`) belum ada di database untuk ID yang dipakai, sehingga penautan \`pemakaian.cathlab_pemakaian_order_id\` ditolak. ` +
      `Pastikan order disimpan dulu sebelum alokasi FIFO, atau periksa apakah order sudah dihapus. Detail: ${allocErrMessage}`
    );
  }
  if (/Stok tidak cukup|Remaining=/i.test(allocErrMessage)) {
    return `Stok tidak cukup untuk "${namaBarangLabel}". ${allocErrMessage}`;
  }
  return `Gagal alokasi FIFO untuk "${namaBarangLabel}". ${allocErrMessage}`;
}
