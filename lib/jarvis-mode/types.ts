import type { PasienOption } from "@/components/ui/pasien-combobox";
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
  /** Master pasien untuk laporan cara bayar di widget Laporan tindakan. */
  pasienOptions?: readonly PasienOption[];
  loading?: boolean;
  lastSyncAt?: string | null;
};

export type JarvisModeConfig = {
  /** Durasi idle sebelum JARVIS Mode aktif (ms). Default: 60 menit. */
  idleEnterMs?: number;
  /** Durasi auto-sleep setelah masuk JARVIS Mode tanpa interaksi (ms). Default: 60 menit. */
  autoSleepMs?: number;
  /** Label unit / lokasi tampilan. */
  locationLabel?: string;
};

/** Idle sebelum JARVIS Mode otomatis aktif: 60 menit tanpa input. */
export const JARVIS_MODE_IDLE_ENTER_MS = 60 * 60 * 1000;

/** Auto-sleep JARVIS Mode: 60 menit tanpa interaksi. */
export const JARVIS_MODE_AUTO_SLEEP_MS = 60 * 60 * 1000;

export const JARVIS_MODE_DEFAULTS = {
  idleEnterMs: JARVIS_MODE_IDLE_ENTER_MS,
  autoSleepMs: JARVIS_MODE_AUTO_SLEEP_MS,
  locationLabel: "Cath Lab RSUD dr. Mohamad Soewandhie",
} as const;
