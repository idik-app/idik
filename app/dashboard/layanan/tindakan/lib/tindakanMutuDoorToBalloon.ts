import type { TindakanJoinResult } from "../bridge/mapping.types";
import { tanggalBarisKeYmdWib } from "./tanggalBarisWib";
import type { MutuPatientTooltip } from "./tindakanMutuPenundaanElektif";
import { formatDurasiJamMenit } from "./displayTindakanRow";

export type MutuDoorToBalloonRow = {
  tanggal: string;
  /** Total waktu dalam menit sejak pasien masuk IGD hingga pemasangan guide wire / inflasi balon di Cathlab. */
  numerator: string;
  /** Jumlah seluruh pasien STEMI yang datang di IGD dan menjalani PPCI. */
  denominator: string;
  patientsD2b: MutuPatientTooltip[];
  patientsStemi: MutuPatientTooltip[];
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

function parseToEpochMs(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  let normalizedT = t;
  if (
    t.includes("T") &&
    !t.includes("Z") &&
    !t.includes("+") &&
    !t.match(/-\d{2}:\d{2}$/)
  ) {
    normalizedT = t.replace("T", " ");
  }
  const d = Date.parse(normalizedT);
  return Number.isFinite(d) ? d : null;
}

/** Durasi menit dari waktu IGD → waktu balloon (D2B); selaras FastTrackBlock.tsx */
export function minutesFromIgdToBalloon(
  igdStr: string,
  balloonStr: string,
): number | null {
  const t0 = parseToEpochMs(igdStr);
  const t1 = parseToEpochMs(balloonStr);
  if (t0 == null || t1 == null) return null;
  const diff = t1 - t0;
  if (diff < 0) return null;
  return Math.round(diff / 60_000);
}

/**
 * Ekstraksi total waktu Fast-Track (dalam menit) dari baris tindakan:
 * 1. Dihitung langsung dari timestamp pasien_datang_igd dan door_to_balloon
 * 2. Fallback ke total_waktu_fast_track jika sudah tersimpan di database
 */
export function extractD2bMinutes(row: TindakanJoinResult): number | null {
  const igd = String(row.pasien_datang_igd ?? "").trim();
  const d2b = String(row.door_to_balloon ?? "").trim();
  if (igd && d2b) {
    const mins = minutesFromIgdToBalloon(igd, d2b);
    if (mins != null) return mins;
  }

  const rawTotal = String(row.total_waktu_fast_track ?? "").trim();
  if (rawTotal) {
    const parsed = parseFloat(rawTotal.replace(",", "."));
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed);
    }
  }

  return null;
}

/**
 * Memeriksa apakah baris tindakan merupakan kasus pasien STEMI / PPCI (Fast-Track).
 */
export function isPasienStemiPpci(row: TindakanJoinResult): boolean {
  const ft = row.is_fast_track;
  const isFtActive =
    ft === true ||
    (ft as unknown) === 1 ||
    String(ft).toLowerCase() === "true" ||
    String(ft) === "1";
  if (isFtActive) return true;

  if (row.pasien_datang_igd && String(row.pasien_datang_igd).trim()) return true;
  if (row.door_to_balloon && String(row.door_to_balloon).trim()) return true;
  if (row.total_waktu_fast_track && String(row.total_waktu_fast_track).trim()) {
    return true;
  }

  const diagnosa = String(row.diagnosa ?? "").toLowerCase();
  const tindakan = String(row.tindakan ?? "").toLowerCase();
  if (
    diagnosa.includes("stemi") &&
    (tindakan.includes("ppci") || tindakan.includes("pci") || tindakan.includes("primary"))
  ) {
    return true;
  }

  return false;
}

function patientFromRow(
  row: TindakanJoinResult,
  d2bMinutes: number | null,
): MutuPatientTooltip {
  const parts: string[] = [];
  if (d2bMinutes != null) {
    parts.push(`D2B: ${d2bMinutes} menit (${formatDurasiJamMenit(d2bMinutes)})`);
    if (d2bMinutes < 90) {
      parts.push("Target tercapai (<90 mnt)");
    } else {
      parts.push("Melebihi target (≥90 mnt)");
    }
  } else {
    parts.push("Waktu D2B belum lengkap");
  }

  const statusKet = String(row.status_keterangan ?? "").trim();
  const ket = String(row.keterangan ?? "").trim();
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
    tanggal:
      tanggalBarisKeYmdWib(row.tanggal || row.pasien_datang_igd) || undefined,
  };
}

/**
 * Agregasi harian untuk tab IMPRS: Waktu Tanggap Door to Balloon (D2B) STEMI PPCI.
 *
 * - TANGGAL: hari kalender tindakan (WIB)
 * - PEMBILANG: Total waktu (dalam menit) sejak pasien masuk IGD hingga pemasangan guide wire dan inflasi balon di Cathlab
 * - PENYEBUT: Jumlah seluruh pasien STEMI yang datang di IGD dan menjalani PPCI
 */
export function buildDoorToBalloonRowsFromTindakan(
  rows: readonly TindakanJoinResult[],
  monthYyyyMm: string,
): MutuDoorToBalloonRow[] {
  const ym = parseYyyyMm(monthYyyyMm);
  if (!ym) return [];

  const dim = daysInMonth(ym.y, ym.m);
  const totalMinutesByDay = Array.from({ length: dim }, () => 0);
  const patientCountByDay = Array.from({ length: dim }, () => 0);
  const patientsD2bByDay: MutuPatientTooltip[][] = Array.from(
    { length: dim },
    () => [],
  );
  const patientsStemiByDay: MutuPatientTooltip[][] = Array.from(
    { length: dim },
    () => [],
  );

  const monthPrefix = `${String(ym.y).padStart(4, "0")}-${String(ym.m).padStart(2, "0")}`;

  for (const row of rows) {
    if (!isPasienStemiPpci(row)) continue;

    const rawDate = row.tanggal || row.pasien_datang_igd;
    const ymd = tanggalBarisKeYmdWib(rawDate);
    if (!ymd || ymd.length < 10) continue;
    if (!ymd.startsWith(monthPrefix)) continue;
    const day = Number.parseInt(ymd.slice(8, 10), 10);
    if (!Number.isFinite(day) || day < 1 || day > dim) continue;

    const d2bMins = extractD2bMinutes(row);
    const isBatal =
      String(row.status ?? "").trim().toLowerCase() === "dibatalkan";
    if (isBatal && d2bMins == null) continue;

    const idx = day - 1;
    const patient = patientFromRow(row, d2bMins);

    patientCountByDay[idx] += 1;
    patientsStemiByDay[idx]!.push(patient);

    if (d2bMins != null) {
      totalMinutesByDay[idx] += d2bMins;
      patientsD2bByDay[idx]!.push(patient);
    }
  }

  return Array.from({ length: dim }, (_, index) => ({
    tanggal: String(index + 1),
    numerator: String(totalMinutesByDay[index] ?? 0),
    denominator: String(patientCountByDay[index] ?? 0),
    patientsD2b: patientsD2bByDay[index] ?? [],
    patientsStemi: patientsStemiByDay[index] ?? [],
  }));
}
