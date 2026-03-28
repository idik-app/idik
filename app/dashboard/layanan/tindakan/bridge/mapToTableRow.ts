// ========================================================================
// 📌 mapToTableRow.ts — Mapping JOIN → Tabel Ringkas (12 kolom ideal)
// ========================================================================

import { formatWaktuDisplay } from "@/lib/tindakan/waktuRangeFormat";
import { TindakanJoinResult, TindakanTableRow } from "./mapping.types";

// Helper untuk fallback string
const safe = (v: any, empty = "-") =>
  v === null || v === undefined || v === "" ? empty : v;

export function mapToTableRow(
  data: TindakanJoinResult,
  index: number
): TindakanTableRow {
  const dbId = (data as { id?: string }).id;
  const raw = data as unknown as Record<string, unknown>;
  const tindakan =
    data.tindakan ??
    (typeof raw.alkes_utama === "string" ? raw.alkes_utama : undefined);
  return {
    id: dbId ? String(dbId) : `${safe(data.no_rm)}-${index}`,
    tanggal: safe(data.tanggal),
    waktu: safe(formatWaktuDisplay(data.waktu) || null),
    no_rm: safe(data.no_rm),
    nama_pasien: safe(data.nama_pasien),
    dokter: safe(data.dokter),
    tindakan: safe(tindakan),
    kategori: safe(data.kategori),
    severity_level: safe(data.severity_level),
    ruangan: safe(data.ruangan),
    status: safe(data.status),
    total: Number(data.total ?? 0),
  };
}
