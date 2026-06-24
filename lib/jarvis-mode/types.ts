import type { TindakanJoinResult } from "@/app/dashboard/layanan/tindakan/bridge/mapping.types";
import type { TindakanFilteredSummary } from "@/app/dashboard/layanan/tindakan/components/TindakanSummary";

export type JarvisMatrixPeriod = "harian" | "mingguan" | "bulanan";

export type JarvisMatrixPoint = {
  label: string;
  value: number;
};

export type JarvisTrendPoint = {
  label: string;
  value: number;
  dateKey?: string;
};

export type JarvisMatrixReportRow = {
  label: string;
  harian: number;
  mingguan: number;
  bulanan: number;
  /** Persen relatif terhadap total periode (0–100) */
  harianPct: number;
  mingguanPct: number;
  bulananPct: number;
};

export type JarvisTodayPatient = {
  id: string;
  nama: string;
  no_rm: string;
  jenis_kelamin: "L" | "P" | null;
  tindakan: string;
};

export type JarvisActiveDoctor = {
  nama: string;
  count: number;
};

export type JarvisCriticalAlert = {
  id: string;
  label: string;
  detail: string;
  severity: "kritis" | "ppci" | "warning";
};

export type JarvisModeData = {
  stats: Record<string, number>;
  filtered?: TindakanFilteredSummary | null;
  allRows?: readonly TindakanJoinResult[];
  loading?: boolean;
  lastSyncAt?: string | null;
};

export type JarvisModeConfig = {
  /** Durasi idle sebelum JARVIS Mode aktif (ms). Default: 10 detik. */
  idleEnterMs?: number;
  /** Durasi auto-sleep setelah masuk JARVIS Mode tanpa interaksi (ms). Default: 3 menit. */
  autoSleepMs?: number;
  /** Label unit / lokasi tampilan. */
  locationLabel?: string;
};

export const JARVIS_MODE_DEFAULTS = {
  idleEnterMs: 10_000,
  autoSleepMs: 180_000,
  locationLabel: "Cath Lab RSUD dr. Mohamad Soewandhie",
} as const;
