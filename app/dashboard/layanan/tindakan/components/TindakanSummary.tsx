"use client";

import {
  Activity,
  CalendarDays,
  Filter,
  Mars,
  Stethoscope,
  Syringe,
  Venus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TindakanFilteredSummary = {
  count: number;
  /** Label singkat filter aktif (untuk kartu ringkas) */
  lines: string[];
  /** KPI kartu header — sama dengan baris yang tampil di tabel (setelah filter) */
  stats: Record<string, number>;
  /** Total gender berdasarkan kolom `jenis_kelamin` (filteredRecords yang sama dengan tabel) */
  gender?: { laki: number; perempuan: number };
  /** Rincian jenis tindakan untuk KPI total tindakan (hari ini). */
  tindakanBreakdown?: string[];
  /** Rincian dokter untuk KPI total dokter (hari ini). */
  dokterBreakdown?: string[];
  /** Mode perhitungan KPI aktif. */
  kpiMode?: "default" | "filter";
  /** Label mode KPI untuk ditampilkan ke user. */
  kpiModeLabel?: string;
  /** Semua baris hasil filter (termasuk fallback) untuk pencarian record di drawer. */
  allRows?: any[];
};

type SummaryProps = {
  stats: Record<string, number>;
  loading: boolean;
  themeTone: "cyan" | "emerald";
  /** Lebih ringkas untuk dipasang di baris judul header */
  variant?: "default" | "header";
  /** Jumlah baris setelah filter di tabel + ringkasan filter */
  filtered?: TindakanFilteredSummary | null;
  /** Saat klik KPI "Pasien hari ini" (variant header). */
  onTodayKpiClick?: () => void;
  /** Saat klik KPI "Fast-Track" (variant header). */
  onFastTrackKpiClick?: () => void;
};

type SummaryItem = {
  label: string;
  value: number;
  icon: typeof CalendarDays;
  tone: string;
  iconWrap: string;
  filterLines?: string[];
};

function pickItemStyle(
  label: string,
  themeTone: "cyan" | "emerald",
): Omit<SummaryItem, "label" | "value" | "filterLines"> {
  const key = label.toLowerCase();
  if (key.includes("hasil")) {
    return {
      icon: Filter,
      tone: "from-amber-50/95 to-white border-amber-300/50 dark:from-black dark:to-black dark:border-amber-800/40",
      iconWrap:
        "border-amber-400/45 bg-amber-100/90 text-amber-900 dark:border-amber-700/50 dark:bg-black dark:text-amber-200/90",
    };
  }
  if (key.includes("hari")) {
    return {
      icon: CalendarDays,
      tone:
        themeTone === "emerald"
          ? "from-emerald-50/95 to-white border-emerald-300/55 dark:from-black dark:to-black dark:border-emerald-800/40"
          : "from-cyan-50/95 to-white border-cyan-300/55 dark:from-black dark:to-black dark:border-cyan-800/40",
      iconWrap:
        themeTone === "emerald"
          ? "border-emerald-400/45 bg-emerald-100/90 text-emerald-800 dark:border-emerald-700/50 dark:bg-black dark:text-emerald-300/90"
          : "border-cyan-400/45 bg-cyan-100/90 text-cyan-800 dark:border-cyan-700/50 dark:bg-black dark:text-cyan-300/90",
    };
  }
  if (key.includes("pasien")) {
    return {
      icon: Users,
      tone: "from-sky-50/95 to-white border-sky-300/50 dark:from-black dark:to-black dark:border-sky-800/35",
      iconWrap:
        "border-sky-400/45 bg-sky-100/90 text-sky-900 dark:border-sky-700/50 dark:bg-black dark:text-sky-200/90",
    };
  }
  if (key.includes("dokter")) {
    return {
      icon: Stethoscope,
      tone: "from-indigo-50/95 to-white border-indigo-300/50 dark:from-black dark:to-black dark:border-indigo-800/35",
      iconWrap:
        "border-indigo-400/45 bg-indigo-100/90 text-indigo-900 dark:border-indigo-700/50 dark:bg-black dark:text-indigo-200/90",
    };
  }
  if (key.includes("tindakan") && !key.includes("hari")) {
    return {
      icon: Syringe,
      tone: "from-rose-50/95 to-white border-rose-300/50 dark:from-black dark:to-black dark:border-rose-800/35",
      iconWrap:
        "border-rose-400/45 bg-rose-100/90 text-rose-800 dark:border-rose-700/50 dark:bg-black dark:text-rose-200/90",
    };
  }
  return {
    icon: Activity,
    tone:
      themeTone === "emerald"
        ? "from-emerald-50/95 to-white border-emerald-300/55 dark:from-black dark:to-black dark:border-emerald-800/40"
        : "from-cyan-50/95 to-white border-cyan-300/55 dark:from-black dark:to-black dark:border-cyan-800/40",
    iconWrap:
      themeTone === "emerald"
        ? "border-emerald-400/45 bg-emerald-100/90 text-emerald-800 dark:border-emerald-700/50 dark:bg-black dark:text-emerald-300/90"
        : "border-cyan-400/45 bg-cyan-100/90 text-cyan-800 dark:border-cyan-700/50 dark:bg-black dark:text-cyan-300/90",
  };
}

function sortStatEntries(entries: [string, number][]): [string, number][] {
  const rank = (label: string) => {
    const k = label.toLowerCase();
    if (k.includes("pasien") && !k.includes("hari")) return 0;
    if (k.includes("hari")) return 1;
    if (k.includes("tindakan")) return 2;
    if (k.includes("dokter")) return 3;
    return 4;
  };
  return [...entries].sort(([a], [b]) => {
    const d = rank(a) - rank(b);
    return d !== 0 ? d : a.localeCompare(b, "id");
  });
}

function extractTextAccentClass(iconWrap: string): string {
  // Ambil class yang diawali `text-...` dari string `iconWrap`.
  const tokens = String(iconWrap ?? "")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return tokens.find((t) => t.startsWith("text-")) ?? "";
}

function getEmptyHint(label: string): string | null {
  const k = label.toLowerCase();
  if (k.includes("hari")) return "Belum ada jadwal hari ini";
  if (k.includes("tindakan")) return "Input alkes di baris tabel";
  if (k.includes("dokter")) return "Pilih dokter di tabel";
  return null;
}

export default function TindakanSummary({
  stats,
  loading,
  themeTone,
  variant = "default",
  filtered,
  onTodayKpiClick,
  onFastTrackKpiClick,
}: SummaryProps) {
  const header = variant === "header";
  const entries = sortStatEntries(Object.entries(stats || {}));
  const baseCards: SummaryItem[] = entries.map(([label, rawValue]) => ({
    label,
    value: Number(rawValue || 0),
    filterLines:
      label === "Total tindakan"
        ? filtered?.tindakanBreakdown ?? []
        : label === "Total dokter"
          ? filtered?.dokterBreakdown ?? []
          : undefined,
    ...pickItemStyle(label, themeTone),
  }));
  const gender = filtered?.gender;

  const genderCardEl =
    gender != null ? (
      <div
        key="total-gender"
        className={cn(
          "flex min-w-0 flex-1 basis-[10rem] items-center rounded-lg border bg-gradient-to-br shadow-sm transition sm:flex-initial sm:basis-auto",
          header ? "gap-1 px-1 py-0.5" : "gap-2 px-2 py-1.5",
          "shadow-cyan-900/5 hover:border-cyan-500/35 from-sky-50/95 to-white border-sky-300/50 dark:shadow-black/25 dark:hover:border-white/10 dark:from-black dark:to-black dark:border-sky-800/35",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col leading-tight items-center text-center">
          <p
            className={cn(
              "font-bold uppercase tracking-[0.12em]",
              header ? "text-[9px]" : "text-[10px]",
              "text-cyan-950/80 dark:text-white/85",
            )}
          >
            TOTAL GENDER
          </p>

          <div className="mt-0.5 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 min-w-0">
              <Mars
                className={cn("h-4 w-4", "text-sky-600 dark:text-sky-300")}
                strokeWidth={2}
              />
              <span
                className={cn(
                  "font-extrabold tabular-nums",
                  header ? "text-sm" : "text-base",
                  "text-slate-900 dark:text-white",
                )}
              >
                {gender.laki.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <Venus
                className={cn("h-4 w-4", "text-rose-600 dark:text-rose-300")}
                strokeWidth={2}
              />
              <span
                className={cn(
                  "font-extrabold tabular-nums",
                  header ? "text-sm" : "text-base",
                  "text-slate-900 dark:text-white",
                )}
              >
                {gender.perempuan.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  const skeletonCount = loading ? Math.max(5, entries.length + 1) : 0;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {header && filtered?.kpiModeLabel ? (
        <div
          className={cn(
            "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide",
            filtered.kpiMode === "filter"
              ? "border-amber-400/60 bg-amber-100/90 text-amber-900 dark:border-amber-700/55 dark:bg-black dark:text-white"
              : "border-cyan-400/60 bg-cyan-100/90 text-cyan-900 dark:border-cyan-700/55 dark:bg-black dark:text-white",
          )}
          title={filtered.kpiModeLabel}
        >
          Mode KPI: {filtered.kpiModeLabel}
        </div>
      ) : null}
      <div
        className={cn(
          "flex flex-wrap items-stretch min-w-0",
          header ? "gap-1.5" : "gap-2 sm:gap-2.5",
        )}
      >
      {loading ? (
        Array.from({ length: skeletonCount }, (_, idx) => (
          <div
            key={`loading-${idx}`}
            className={cn(
              "flex min-w-[9rem] flex-1 basis-[10rem] items-center rounded-lg border sm:min-w-0 sm:flex-initial sm:basis-auto",
              header
                ? "min-h-[2rem] gap-1 px-1 py-0.5"
                : "min-h-[2.75rem] gap-2.5 px-2.5 py-2",
              "border-cyan-300/50 bg-white/80 dark:border-cyan-900/40 dark:bg-black/30",
            )}
          >
            <div
              className={cn(
                "shrink-0 animate-pulse rounded-md",
                header ? "h-6 w-6" : "h-7 w-7",
                "bg-cyan-200/60 dark:bg-cyan-900/30",
              )}
            />
            <div
              className={cn(
                "min-w-0 flex-1",
                header ? "space-y-1" : "space-y-1.5",
              )}
            >
              <div
                className={cn(
                  "animate-pulse rounded",
                  header ? "h-2 w-12" : "h-2.5 w-14",
                  "bg-cyan-200/50 dark:bg-cyan-900/35",
                )}
              />
              <div
                className={cn(
                  "animate-pulse rounded",
                  header ? "h-4 w-8" : "h-5 w-10",
                  "bg-cyan-200/50 dark:bg-cyan-900/35",
                )}
              />
            </div>
          </div>
        ))
      ) : (
        <>
          {baseCards.map((item) => {
            const Icon = item.icon;
            // Di mode gelap, kita paksa teks menjadi putih terang untuk
            // menghindari "tabrakan" fallback `text-cyan-*` vs kebutuhan kontras.
            const accentText = extractTextAccentClass(item.iconWrap);
            const clickableTodayCard =
              Boolean(onTodayKpiClick) &&
              header &&
              item.label === "Pasien hari ini";
            const clickableFastTrackCard =
              Boolean(onFastTrackKpiClick) &&
              header &&
              item.label.toLowerCase().includes("fast-track");

            const isClickable = clickableTodayCard || clickableFastTrackCard;

            const sideBreakdown =
              item.label === "Total tindakan" || item.label === "Total dokter"
                ? item.filterLines ?? []
                : [];
            const sideBorderClass =
              item.label === "Total dokter"
                ? "border-indigo-300/60 dark:border-indigo-700/45"
                : "border-rose-300/60 dark:border-rose-700/45";
            const cardEl = (
              <div
                key={item.label}
                className={cn(
                  "flex min-w-0 flex-1 basis-[10rem] items-center rounded-lg border bg-gradient-to-br shadow-sm transition sm:flex-initial sm:basis-auto",
                  header ? "gap-1 px-1 py-0.5" : "gap-2 px-2 py-1.5",
                  "shadow-cyan-900/5 hover:border-cyan-500/35 dark:shadow-black/25 dark:hover:border-white/10",
                  item.tone,
                  isClickable
                    ? "cursor-pointer hover:brightness-110 active:scale-[0.99]"
                    : "",
                )}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={() => {
                  if (clickableTodayCard) onTodayKpiClick?.();
                  if (clickableFastTrackCard) onFastTrackKpiClick?.();
                }}
                onKeyDown={(e) => {
                  if (!isClickable) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (clickableTodayCard) onTodayKpiClick?.();
                    if (clickableFastTrackCard) onFastTrackKpiClick?.();
                  }
                }}
              >
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-md border",
                    header ? "h-6 w-6" : "h-7 w-7",
                    item.iconWrap,
                  )}
                >
                  <Icon
                    className={header ? "h-3 w-3" : "h-3.5 w-3.5"}
                    strokeWidth={2}
                  />
                </div>
                <div className="min-w-0 leading-tight">
                  <p
                    className={cn(
                      "font-bold uppercase tracking-[0.12em]",
                      header ? "text-[9px]" : "text-[10px]",
                      accentText || "text-cyan-950/80",
                      "dark:text-white/90",
                    )}
                  >
                    {item.label}
                  </p>
                  {sideBreakdown.length ? (
                    <div className="mt-0.5 flex items-start gap-2">
                      <p
                        className={cn(
                          "font-extrabold tabular-nums shrink-0",
                          header
                            ? "text-sm sm:text-base"
                            : "text-base sm:text-lg",
                          accentText || "text-slate-900",
                          "dark:text-white",
                        )}
                      >
                        {item.value.toLocaleString("id-ID")}
                      </p>
                      <div
                        className={cn(
                          "min-w-0 space-y-0.5 border-l pl-2 font-medium leading-snug",
                          header ? "text-[8px]" : "text-[10px]",
                          sideBorderClass,
                          accentText || "text-slate-700/90",
                          "dark:text-white/85",
                        )}
                        title={sideBreakdown.join("\n")}
                      >
                        {sideBreakdown.map((line) => (
                          <p key={`${item.label}-${line}`} className="truncate">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p
                        className={cn(
                          "font-extrabold tabular-nums",
                          header
                            ? "mt-0 text-sm sm:text-base"
                            : "mt-0.5 text-base sm:text-lg",
                          accentText || "text-slate-900",
                          item.value === 0
                            ? "text-slate-400 dark:text-white/40"
                            : "dark:text-white",
                        )}
                      >
                        {item.value.toLocaleString("id-ID")}
                      </p>
                      {item.value === 0 && getEmptyHint(item.label) ? (
                        <p
                          className={cn(
                            "mt-0.5 text-[8px] sm:text-[9px] font-medium leading-tight",
                            "text-slate-500/80 dark:text-white/85",
                          )}
                        >
                          {getEmptyHint(item.label)}
                        </p>
                      ) : null}
                      {item.filterLines?.length ? (
                        <p
                          className={cn(
                            "mt-0.5 line-clamp-2 font-medium leading-snug",
                            header ? "text-[8px]" : "text-[10px]",
                            accentText || "text-slate-700/90",
                            "dark:text-white/80",
                          )}
                          title={item.filterLines.join("\n")}
                        >
                          {item.filterLines.join(" · ")}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            );
            return [
              cardEl,
              item.label === "Total pasien" ? genderCardEl : null,
            ];
          })}
        </>
      )}
      </div>
    </div>
  );
}
