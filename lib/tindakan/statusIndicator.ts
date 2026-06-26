/**
 * Indikator visual status tindakan di tabel daftar kasus.
 * Selaras dengan `TINDAKAN_STATUS` di bridge.constants.
 */

export type StatusIndicatorMeta = {
  barClass: string;
  label: string;
};

function normStatus(status: string | null | undefined): string {
  return String(status ?? "").trim().toLowerCase();
}

export function getStatusIndicatorMeta(
  status: string | null | undefined,
  opts?: {
    isToday?: boolean;
    tindakan?: string | null;
    statusKeterangan?: string | null;
  },
): StatusIndicatorMeta | null {
  const s = normStatus(status);
  const t = String(opts?.tindakan ?? "").trim().toLowerCase();
  const ket = String(opts?.statusKeterangan ?? "").trim();
  const withKet = (label: string) =>
    ket ? `${label}: ${ket}` : label;

  if (s === "meninggal" || s.includes("meninggal")) {
    return {
      barClass: "bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.5)]",
      label: withKet("Meninggal"),
    };
  }
  if (s === "dibatalkan" || s.includes("batal")) {
    return {
      barClass: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.45)]",
      label: withKet("Dibatalkan"),
    };
  }
  if (s === "proses") {
    return {
      barClass: "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.35)]",
      label: withKet("Proses"),
    };
  }
  if (s === "pending" || s.includes("tunggu") || s.includes("menunggu")) {
    return {
      barClass: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.35)]",
      label: withKet("Pending"),
    };
  }
  if (s === "selesai" || s.includes("selesai") || s.includes("langsung")) {
    return {
      barClass: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
      label: withKet("Selesai"),
    };
  }

  if (
    s.includes("cito") ||
    s.includes("emergency") ||
    t.includes("ppci")
  ) {
    return {
      barClass: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]",
      label: withKet("Cito / Emergency"),
    };
  }

  if (opts?.isToday) {
    return {
      barClass: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
      label: "Hari ini",
    };
  }

  return null;
}

export function getStatusBadgeClass(
  status: string | null | undefined,
): string | null {
  const s = normStatus(status);
  if (s === "meninggal" || s.includes("meninggal")) {
    return "bg-rose-600/15 text-rose-700 border-rose-500/35 dark:text-rose-300";
  }
  if (s === "dibatalkan" || s.includes("batal")) {
    return "bg-red-500/15 text-red-700 border-red-500/35 dark:text-red-300";
  }
  if (s === "proses") {
    return "bg-cyan-500/15 text-cyan-800 border-cyan-500/35 dark:text-cyan-300";
  }
  if (s === "pending" || s.includes("tunggu") || s.includes("menunggu")) {
    return "bg-amber-400/15 text-amber-800 border-amber-500/35 dark:text-amber-300";
  }
  if (s === "selesai" || s.includes("selesai")) {
    return "bg-emerald-500/15 text-emerald-800 border-emerald-500/35 dark:text-emerald-300";
  }
  return null;
}

export function getStatusTooltip(
  status: string | null | undefined,
  statusKeterangan?: string | null,
): string | null {
  const label = String(status ?? "").trim();
  if (!label) return null;
  const ket = String(statusKeterangan ?? "").trim();
  return ket ? `${label}: ${ket}` : label;
}
