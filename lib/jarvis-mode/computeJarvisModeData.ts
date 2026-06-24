import type { TindakanJoinResult } from "@/app/dashboard/layanan/tindakan/bridge/mapping.types";
import {
  extractCalendarDateKey,
  startOfWeekWibYmd,
  todayWibYmd,
} from "@/app/dashboard/layanan/tindakan/utils/tindakanHelpers";

import type { JarvisCriticalAlert, JarvisMatrixPoint } from "./types";

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return new Intl.DateTimeFormat("en-CA").format(dt);
}

function currentMonthYmd(): { year: number; month: number } {
  const today = todayWibYmd();
  const [y, m] = today.split("-").map(Number);
  return { year: y, month: m };
}

/** Matriks harian: distribusi tindakan hari ini per kategori/jenis (top 8). */
export function computeDailyMatrix(
  rows: readonly TindakanJoinResult[],
): JarvisMatrixPoint[] {
  const today = todayWibYmd();
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = extractCalendarDateKey(String(r.tanggal ?? ""));
    if (key !== today) continue;
    const label =
      String(r.kategori ?? "").trim() ||
      String(r.tindakan ?? "").trim() ||
      "Lainnya";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id"))
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));
}

/** Matriks mingguan: jumlah tindakan per hari (Sen–Min, minggu berjalan WIB). */
export function computeWeeklyMatrix(
  rows: readonly TindakanJoinResult[],
): JarvisMatrixPoint[] {
  const wStart = startOfWeekWibYmd();
  const dayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const buckets = dayLabels.map((label, i) => ({
    label,
    ymd: addDaysYmd(wStart, i),
    value: 0,
  }));

  for (const r of rows) {
    const key = extractCalendarDateKey(String(r.tanggal ?? ""));
    if (!key) continue;
    const bucket = buckets.find((b) => b.ymd === key);
    if (bucket) bucket.value += 1;
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

/** Matriks bulanan: total per minggu dalam bulan berjalan. */
export function computeMonthlyMatrix(
  rows: readonly TindakanJoinResult[],
): JarvisMatrixPoint[] {
  const { year, month } = currentMonthYmd();
  const weekCounts = new Map<number, number>();

  for (const r of rows) {
    const key = extractCalendarDateKey(String(r.tanggal ?? ""));
    if (!key) continue;
    const [y, m, d] = key.split("-").map(Number);
    if (y !== year || m !== month) continue;
    const week = Math.ceil(d / 7);
    weekCounts.set(week, (weekCounts.get(week) ?? 0) + 1);
  }

  const maxWeek = Math.max(4, ...weekCounts.keys());
  const points: JarvisMatrixPoint[] = [];
  for (let w = 1; w <= maxWeek; w += 1) {
    points.push({ label: `M${w}`, value: weekCounts.get(w) ?? 0 });
  }
  return points;
}

/** Peringatan medis krusial: PPCI, severity tinggi, fast-track tanpa door-to-balloon. */
export function computeCriticalAlerts(
  rows: readonly TindakanJoinResult[],
): JarvisCriticalAlert[] {
  const today = todayWibYmd();
  const alerts: JarvisCriticalAlert[] = [];

  for (const r of rows) {
    const key = extractCalendarDateKey(String(r.tanggal ?? ""));
    if (key !== today) continue;

    const id = String(r.id ?? "");
    const nama = String(r.nama_pasien ?? "Pasien").trim();
    const tindakan = String(r.tindakan ?? "").trim().toLowerCase();
    const severity = String(r.severity_level ?? "").trim().toLowerCase();
    const isPpci = tindakan.includes("ppci");
    const isKritis =
      severity.includes("kritis") ||
      severity.includes("critical") ||
      severity === "3" ||
      severity === "iii";

    if (isPpci) {
      alerts.push({
        id: `${id}-ppci`,
        label: "PPCI Aktif",
        detail: `${nama} — ${String(r.tindakan ?? "").trim() || "PPCI"}`,
        severity: "ppci",
      });
    }

    if (isKritis) {
      alerts.push({
        id: `${id}-kritis`,
        label: "Status Kritis",
        detail: `${nama} — Severity ${r.severity_level}`,
        severity: "kritis",
      });
    }

    if (r.is_fast_track && !String(r.door_to_balloon ?? "").trim()) {
      alerts.push({
        id: `${id}-ft`,
        label: "Fast-Track",
        detail: `${nama} — Door-to-balloon belum tercatat`,
        severity: "warning",
      });
    }
  }

  return alerts.slice(0, 6);
}
