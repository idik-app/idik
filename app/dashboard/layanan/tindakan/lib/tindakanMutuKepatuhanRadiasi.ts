import type { TindakanJoinResult } from "../bridge/mapping.types";
import { tanggalBarisKeYmdWib } from "./tanggalBarisWib";
import type { MutuPatientTooltip } from "./tindakanMutuPenundaanElektif";

export type MutuKepatuhanRadiasiRow = {
  tanggal: string;
  /** Jumlah tindakan dengan pencatatan 5 kolom radiologi lengkap di hari kalender yang sama. */
  numerator: string;
  /** Jumlah seluruh tindakan pada tanggal tersebut. */
  denominator: string;
  patientsPatuh: MutuPatientTooltip[];
  patientsSemua: MutuPatientTooltip[];
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

function isValueFilled(val: unknown): boolean {
  if (val == null) return false;
  const s = String(val).trim();
  return s !== "" && s !== "—" && s !== "-" && s !== "null" && s !== "undefined";
}

/**
 * Memeriksa apakah 5 kolom teknis Radiologi terisi:
 * 1. fluoro_time
 * 2. dose (Air Kerma)
 * 3. dap_dose / dap_gy_cm2
 * 4. kv
 * 5. ma
 * (accession_no bersifat opsional sesuai kesepakatan indikator mutu)
 */
export function isRadiologiTeknisLengkap(row: TindakanJoinResult): boolean {
  const hasFluoro = isValueFilled(row.fluoro_time);
  const hasDose = isValueFilled(row.dose);
  const hasDap = isValueFilled(row.dap_dose) || isValueFilled(row.dap_gy_cm2);
  const hasKv = isValueFilled(row.kv);
  const hasMa = isValueFilled(row.ma);

  return hasFluoro && hasDose && hasDap && hasKv && hasMa;
}

/**
 * Memeriksa apakah pengisian dilakukan pada hari kalender WIB yang sama dengan tanggal tindakan.
 * Jika dibuat atau diisi di hari berikutnya, bernilai false (pembilang tetap 0).
 */
export function isDiisiDiHariYangSama(row: TindakanJoinResult): boolean {
  const tglTindakan = tanggalBarisKeYmdWib(row.tanggal);
  if (!tglTindakan) return false;

  const tglCreated = tanggalBarisKeYmdWib(row.created_at || (row as any).inserted_at);
  const tglUpdated = tanggalBarisKeYmdWib(row.updated_at);

  // Jika tidak ada data timestamp di sistem, dianggap valid
  if (!tglCreated && !tglUpdated) return true;

  // Jika created_at baru dibuat setelah tanggal tindakan (keesokan harinya / lebih lambat)
  if (tglCreated && tglCreated > tglTindakan) {
    return false;
  }

  // Jika dibuat atau diperbarui tepat di hari tindakan
  if (tglCreated === tglTindakan || tglUpdated === tglTindakan) {
    return true;
  }

  // Jika created_at sebelum hari H (misal booking/terjadwal lebih awal)
  if (tglCreated && tglCreated < tglTindakan) {
    if (tglUpdated) {
      return tglUpdated === tglTindakan;
    }
    // Jika tidak ada updated_at terpisah, tetapi data radiologi sudah terisi
    return true;
  }

  return false;
}

function patientFromRow(
  row: TindakanJoinResult,
  isPatuh: boolean,
  isLengkap: boolean,
  isSameDay: boolean,
): MutuPatientTooltip {
  const statusKet = String(row.status_keterangan ?? "").trim();
  const ket = String(row.keterangan ?? "").trim();
  const parts: string[] = [];

  if (isPatuh) {
    parts.push("Lengkap & Hari H");
  } else if (!isLengkap) {
    parts.push("Field radiologi belum lengkap");
  } else if (!isSameDay) {
    parts.push("Terlambat (diisi setelah hari H)");
  }

  if (statusKet) parts.push(statusKet);
  if (ket) parts.push(ket);

  const keterangan = parts.length > 0 ? parts.join(" · ") : undefined;

  return {
    nama: String(row.nama_pasien ?? "").trim() || "Tanpa Nama",
    no_rm: String(row.no_rm ?? "").trim() || "-",
    dokter: String(row.dokter ?? "").trim() || "-",
    tindakan: String(row.tindakan ?? "").trim() || undefined,
    status: String(row.status ?? "").trim() || undefined,
    keterangan,
    tanggal: tanggalBarisKeYmdWib(row.tanggal) || undefined,
  };
}

/**
 * Agregasi harian untuk tab IMPU: Kepatuhan Perawat Dalam Pencatatan Kelengkapan Dosis Radiasi dan Fluoroskopi Time.
 *
 * - TANGGAL: hari kalender dari kolom `tanggal` tindakan (WIB)
 * - PEMBILANG: jumlah tindakan dengan pencatatan 5 kolom teknis radiologi lengkap di hari yang sama
 * - PENYEBUT: jumlah seluruh tindakan pada tanggal tersebut (semua baris tindakan tanpa memandang status pembatalan)
 */
export function buildKepatuhanRadiasiRowsFromTindakan(
  rows: readonly TindakanJoinResult[],
  monthYyyyMm: string,
): MutuKepatuhanRadiasiRow[] {
  const ym = parseYyyyMm(monthYyyyMm);
  if (!ym) return [];

  const dim = daysInMonth(ym.y, ym.m);
  const patuhByDay = Array.from({ length: dim }, () => 0);
  const semuaByDay = Array.from({ length: dim }, () => 0);
  const patientsPatuhByDay: MutuPatientTooltip[][] = Array.from(
    { length: dim },
    () => [],
  );
  const patientsSemuaByDay: MutuPatientTooltip[][] = Array.from(
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
    const isLengkap = isRadiologiTeknisLengkap(row);
    const isSameDay = isDiisiDiHariYangSama(row);
    const isPatuh = isLengkap && isSameDay;

    const patient = patientFromRow(row, isPatuh, isLengkap, isSameDay);

    semuaByDay[idx] += 1;
    patientsSemuaByDay[idx]!.push(patient);

    if (isPatuh) {
      patuhByDay[idx] += 1;
      patientsPatuhByDay[idx]!.push(patient);
    }
  }

  return Array.from({ length: dim }, (_, index) => ({
    tanggal: String(index + 1),
    numerator: String(patuhByDay[index] ?? 0),
    denominator: String(semuaByDay[index] ?? 0),
    patientsPatuh: patientsPatuhByDay[index] ?? [],
    patientsSemua: patientsSemuaByDay[index] ?? [],
  }));
}
