import type { TindakanJoinResult } from "@/app/dashboard/layanan/tindakan/bridge/mapping.types";
import {
  extractCalendarDateKey,
  startOfWeekWibYmd,
  todayWibYmd,
} from "@/app/dashboard/layanan/tindakan/utils/tindakanHelpers";

import type {
  JarvisActiveDoctor,
  JarvisCriticalAlert,
  JarvisMatrixPoint,
  JarvisTodayPatient,
  JarvisTrendPoint,
} from "./types";

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

function isPpciRow(tindakan: string, rsPerujuk?: string | null, ket?: string | null): boolean {
  const t = tindakan.trim().toLowerCase();
  if (!t.includes("ppci")) return false;
  const rs = String(rsPerujuk ?? "").trim().toLowerCase();
  const k = String(ket ?? "").trim().toLowerCase();
  return !rs.includes("pribadi") && !k.includes("pribadi");
}

/** Deret tren PPCI untuk grafik (harian / mingguan / bulanan). */
export function computePpciTrendSeries(
  rows: readonly TindakanJoinResult[],
  period: "harian" | "mingguan" | "bulanan",
): JarvisTrendPoint[] {
  const ppciRows = rows.filter((r) =>
    isPpciRow(
      String(r.tindakan ?? ""),
      r.rs_perujuk,
      r.keterangan,
    ),
  );

  if (period === "harian") {
    const counts = new Map<string, number>();
    for (let i = 13; i >= 0; i -= 1) {
      const key = addDaysYmd(todayWibYmd(), -i);
      counts.set(key, 0);
    }
    for (const r of ppciRows) {
      const key = extractCalendarDateKey(String(r.tanggal ?? ""));
      if (key && counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([dateKey, value]) => ({
      label: dateKey.slice(8, 10),
      value,
      dateKey,
    }));
  }

  if (period === "mingguan") {
    const wStart = startOfWeekWibYmd();
    const buckets = Array.from({ length: 8 }, (_, i) => {
      const ymd = addDaysYmd(wStart, -7 * (7 - i));
      return { label: `W${i + 1}`, ymd, value: 0 };
    });
    for (const r of ppciRows) {
      const key = extractCalendarDateKey(String(r.tanggal ?? ""));
      if (!key) continue;
      for (const b of buckets) {
        const end = addDaysYmd(b.ymd, 6);
        if (key >= b.ymd && key <= end) b.value += 1;
      }
    }
    return buckets.map(({ label, value }) => ({ label, value }));
  }

  const { year, month } = currentMonthYmd();
  const counts = new Map<number, number>();
  for (let m = 5; m >= 0; m -= 1) {
    const d = new Date(year, month - 1 - m, 1);
    counts.set(d.getMonth() + 1 + d.getFullYear() * 100, 0);
  }
  for (const r of ppciRows) {
    const key = extractCalendarDateKey(String(r.tanggal ?? ""));
    if (!key) continue;
    const [y, mo] = key.split("-").map(Number);
    const bucket = mo + y * 100;
    if (counts.has(bucket)) counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return [...counts.entries()].map(([bucket, value]) => {
    const y = Math.floor(bucket / 100);
    const m = bucket % 100;
    return { label: `${monthNames[m - 1]} ${String(y).slice(2)}`, value };
  });
}

/** Pasien hari ini untuk widget gender. */
export function computeTodayPatients(
  rows: readonly TindakanJoinResult[],
): JarvisTodayPatient[] {
  const today = todayWibYmd();
  const out: JarvisTodayPatient[] = [];
  for (const r of rows) {
    const key = extractCalendarDateKey(String(r.tanggal ?? ""));
    if (key !== today) continue;
    const raw = r as unknown as Record<string, unknown>;
    const jkRaw = String(r.jenis_kelamin ?? raw.jk ?? "").trim().toUpperCase();
    const jk: "L" | "P" | null =
      jkRaw === "L" || jkRaw === "LAKI-LAKI" ? "L" : jkRaw === "P" || jkRaw === "PEREMPUAN" ? "P" : null;
    out.push({
      id: String(r.id ?? `${r.no_rm}-${key}`),
      nama: String(r.nama_pasien ?? "—").trim(),
      no_rm: String(r.no_rm ?? "—").trim(),
      jenis_kelamin: jk,
      tindakan: String(r.tindakan ?? "—").trim(),
    });
  }
  return out.slice(0, 8);
}

/** Dokter aktif hari ini. */
export function computeActiveDoctors(
  rows: readonly TindakanJoinResult[],
): JarvisActiveDoctor[] {
  const today = todayWibYmd();
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = extractCalendarDateKey(String(r.tanggal ?? ""));
    if (key !== today) continue;
    const d = String(r.dokter ?? "").trim();
    if (!d || d === "—") continue;
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id"))
    .slice(0, 6)
    .map(([nama, count]) => ({ nama, count }));
}
