import type { TindakanJoinResult } from "../bridge/mapping.types";
import { tanggalBarisKeYmdWib } from "./tanggalBarisWib";

export type MutuPatientTooltip = {
  nama: string;
  no_rm: string;
  dokter: string;
  tindakan?: string;
  status?: string;
  tanggal?: string;
};

export type MutuPenundaanElektifRow = {
  tanggal: string;
  /** Jumlah pasien status Dibatalkan (flag 1); Selesai/status lain = 0. */
  numerator: string;
  /** Jumlah pasien (baris tindakan) pada tanggal tersebut. */
  denominator: string;
  patientsTertunda: MutuPatientTooltip[];
  patientsElektif: MutuPatientTooltip[];
};

function parseYyyyMm(s: string): { y: number; m: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const y = Number.parseInt(match[1]!, 10);
  const m = Number.parseInt(match[2]!, 10);
  if (m < 1 || m > 12) return null;
  return { y, m };
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

function isStatusBatal(status: string | null | undefined): boolean {
  return String(status ?? "").trim() === "Dibatalkan";
}

function patientFromRow(row: TindakanJoinResult): MutuPatientTooltip {
  return {
    nama: String(row.nama_pasien ?? "").trim() || "Tanpa Nama",
    no_rm: String(row.no_rm ?? "").trim() || "-",
    dokter: String(row.dokter ?? "").trim() || "-",
    tindakan: String(row.tindakan ?? "").trim() || undefined,
    status: String(row.status ?? "").trim() || undefined,
    tanggal: tanggalBarisKeYmdWib(row.tanggal) || undefined,
  };
}

/**
 * Agregasi harian untuk tab IMN. PENUNDAAN PASIEN ELEKTIF.
 *
 * - TANGGAL: hari kalender dari kolom `tanggal` tabel tindakan (WIB)
 * - JUMLAH PASIEN TERTUNDA (>1 jam): dari Status tindakan — 1 jika Dibatalkan, 0 jika Selesai
 * - JUMLAH PASIEN ELEKTIF: jumlah baris tindakan pada tanggal tersebut
 */
export function buildPenundaanElektifRowsFromTindakan(
  rows: readonly TindakanJoinResult[],
  monthYyyyMm: string,
): MutuPenundaanElektifRow[] {
  const ym = parseYyyyMm(monthYyyyMm);
  if (!ym) return [];

  const dim = daysInMonth(ym.y, ym.m);
  const tertundaByDay = Array.from({ length: dim }, () => 0);
  const elektifByDay = Array.from({ length: dim }, () => 0);
  const patientsTertundaByDay: MutuPatientTooltip[][] = Array.from(
    { length: dim },
    () => [],
  );
  const patientsElektifByDay: MutuPatientTooltip[][] = Array.from(
    { length: dim },
    () => [],
  );

  const monthPrefix = `${String(ym.y).padStart(4, "0")}-${String(ym.m).padStart(2, "0")}`;

  for (const row of rows) {
    const ymd = tanggalBarisKeYmdWib(row.tanggal);
    if (!ymd || ymd.length < 10) continue;
    if (!ymd.startsWith(monthPrefix)) continue;
    const day = Number.parseInt(ymd.slice(8, 10), 10);
    if (!Number.isFinite(day) || day < 1 || day > dim) continue;

    const idx = day - 1;
    const patient = patientFromRow(row);
    elektifByDay[idx] += 1;
    patientsElektifByDay[idx]!.push(patient);
    if (isStatusBatal(row.status)) {
      tertundaByDay[idx] += 1;
      patientsTertundaByDay[idx]!.push(patient);
    }
  }

  return Array.from({ length: dim }, (_, index) => ({
    tanggal: String(index + 1),
    numerator: String(tertundaByDay[index] ?? 0),
    denominator: String(elektifByDay[index] ?? 0),
    patientsTertunda: patientsTertundaByDay[index] ?? [],
    patientsElektif: patientsElektifByDay[index] ?? [],
  }));
}
