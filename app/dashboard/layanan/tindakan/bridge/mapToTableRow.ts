// ========================================================================
// 📌 mapToTableRow.ts — Mapping JOIN → Tabel Ringkas (12 kolom ideal)
// ========================================================================

import { TindakanJoinResult, TindakanTableRow } from "./mapping.types";

// Helper untuk fallback string
const safe = (v: any, empty = "-") =>
  v === null || v === undefined || v === "" ? empty : v;

export function mapToTableRow(
  data: TindakanJoinResult,
  index: number
): TindakanTableRow {
  return {
    id: safe(data.no_rm) + "-" + index, // unique row ID
    tanggal: safe(data.tanggal),
    waktu: safe(data.waktu),
    no_rm: safe(data.no_rm),
    nama_pasien: safe(data.nama_pasien),
    dokter: safe(data.dokter),
    tindakan: safe(data.tindakan),
    kategori: safe(data.kategori),
    severity_level: safe(data.severity_level),
    ruangan: safe(data.ruangan),
    status: safe(data.status),
    total: Number(data.total ?? 0),
  };
}
