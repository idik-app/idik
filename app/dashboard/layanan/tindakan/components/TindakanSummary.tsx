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
import { useTindakanLightMode } from "../hooks/useTindakanLightMode";
import { cn } from "@/lib/utils";

export type TindakanFilteredSummary = {
  count: number;
  /** Label singkat filter aktif (untuk kartu ringkas) */
  lines: string[];
  /** KPI kartu header — sama dengan baris yang tampil di tabel (setelah filter) */
  stats: Record<string, number>;
  /** Total gender berdasarkan kolom `jenis_kelamin` (filteredRecords yang sama dengan tabel) */
  gender?: { laki: number; perempuan: number };
};

type SummaryProps = {
  stats: Record<string, number>;
  loading: boolean;
  themeTone: "cyan" | "emerald";
  /** Lebih ringkas untuk dipasang di baris judul header */
  variant?: "default" | "header";
  /** Jumlah baris setelah filter di tabel + ringkasan filter */
  filtered?: TindakanFilteredSummary | null;
  /** Saat klik KPI "Tindakan hari ini" (variant header). */
  onTodayKpiClick?: () => void;
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
  isLight: boolean,
): Omit<SummaryItem, "label" | "value" | "filterLines"> {
  const key = label.toLowerCase();
  if (key.includes("hasil")) {
    if (isLight) {
      return {
        icon: Filter,
        tone: "from-amber-50/95 to-white border-amber-300/50",
        iconWrap: "border-amber-400/45 bg-amber-100/90 text-amber-900",
      };
    }
    return {
      icon: Filter,
      tone: "from-amber-950/45 to-black/20 border-amber-800/40",
      iconWrap: "border-amber-700/35 bg-amber-950/40 text-amber-200/90",
    };
  }
  if (key.includes("hari")) {
    if (isLight) {
      return {
        icon: CalendarDays,
        tone:
          themeTone === "emerald"
            ? "from-emerald-50/95 to-white border-emerald-300/55"
            : "from-cyan-50/95 to-white border-cyan-300/55",
        iconWrap:
          themeTone === "emerald"
            ? "border-emerald-400/45 bg-emerald-100/90 text-emerald-800"
            : "border-cyan-400/45 bg-cyan-100/90 text-cyan-800",
      };
    }
    return {
      icon: CalendarDays,
      tone:
        themeTone === "emerald"
          ? "from-emerald-950/50 to-black/20 border-emerald-800/40"
          : "from-cyan-950/50 to-black/20 border-cyan-800/40",
      iconWrap:
        themeTone === "emerald"
          ? "border-emerald-700/35 bg-emerald-950/40 text-emerald-300/90"
          : "border-cyan-700/35 bg-cyan-950/40 text-cyan-300/90",
    };
  }
  if (key.includes("pasien")) {
    if (isLight) {
      return {
        icon: Users,
        tone: "from-sky-50/95 to-white border-sky-300/50",
        iconWrap: "border-sky-400/45 bg-sky-100/90 text-sky-900",
      };
    }
    return {
      icon: Users,
      tone: "from-sky-950/40 to-black/20 border-sky-800/35",
      iconWrap: "border-sky-700/35 bg-sky-950/35 text-sky-200/90",
    };
  }
  if (key.includes("dokter")) {
    if (isLight) {
      return {
        icon: Stethoscope,
        tone: "from-indigo-50/95 to-white border-indigo-300/50",
        iconWrap: "border-indigo-400/45 bg-indigo-100/90 text-indigo-900",
      };
    }
    return {
      icon: Stethoscope,
      tone: "from-indigo-950/40 to-black/20 border-indigo-800/35",
      iconWrap: "border-indigo-700/35 bg-indigo-950/35 text-indigo-200/90",
    };
  }
  if (key.includes("tindakan") && !key.includes("hari")) {
    if (isLight) {
      return {
        icon: Syringe,
        tone: "from-rose-50/95 to-white border-rose-300/50",
        iconWrap: "border-rose-400/45 bg-rose-100/90 text-rose-800",
      };
    }
    return {
      icon: Syringe,
      tone: "from-rose-950/40 to-black/20 border-rose-800/35",
      iconWrap: "border-rose-700/35 bg-rose-950/35 text-rose-200/90",
    };
  }
  if (isLight) {
    return {
      icon: Activity,
      tone:
        themeTone === "emerald"
          ? "from-emerald-50/95 to-white border-emerald-300/55"
          : "from-cyan-50/95 to-white border-cyan-300/55",
      iconWrap:
        themeTone === "emerald"
          ? "border-emerald-400/45 bg-emerald-100/90 text-emerald-800"
          : "border-cyan-400/45 bg-cyan-100/90 text-cyan-800",
    };
  }
  return {
    icon: Activity,
    tone:
      themeTone === "emerald"
        ? "from-emerald-950/50 to-black/20 border-emerald-800/40"
        : "from-cyan-950/50 to-black/20 border-cyan-800/40",
    iconWrap:
      themeTone === "emerald"
        ? "border-emerald-700/35 bg-emerald-950/40 text-emerald-300/90"
        : "border-cyan-700/35 bg-cyan-950/40 text-cyan-300/90",
  };
}

function sortStatEntries(entries: [string, number][]): [string, number][] {
  const rank = (label: string) => {
    const k = label.toLowerCase();
    if (k.includes("hari")) return 0;
    if (k.includes("pasien")) return 1;
    if (k.includes("tindakan")) return 2;
    if (k.includes("dokter")) return 3;
    return 4;
  };
  return [...entries].sort(([a], [b]) => {
    const d = rank(a) - rank(b);
    return d !== 0 ? d : a.localeCompare(b, "id");
  });
}

export default function TindakanSummary({
  stats,
  loading,
  themeTone,
  variant = "default",
  filtered,
  onTodayKpiClick,
}: SummaryProps) {
  const isLight = useTindakanLightMode();
  const header = variant === "header";
  const entries = sortStatEntries(Object.entries(stats || {}));
  const baseCards: SummaryItem[] = entries.map(([label, rawValue]) => ({
    label,
    value: Number(rawValue || 0),
    ...pickItemStyle(label, themeTone, isLight),
  }));
  const gender = filtered?.gender;

  const genderCardEl =
    gender != null ? (
      <div
        key="total-gender"
        className={cn(
          "flex min-w-0 flex-1 basis-[10rem] items-center rounded-lg border bg-gradient-to-br shadow-sm transition sm:flex-initial sm:basis-auto",
          header ? "gap-1.5 px-1.5 py-1" : "gap-2 px-2 py-1.5",
          isLight
            ? "shadow-cyan-900/5 hover:border-cyan-500/35 from-sky-50/95 to-white border-sky-300/50"
            : "shadow-black/25 hover:border-white/10 from-sky-950/40 to-black/20 border-sky-800/35",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col leading-tight items-center text-center">
          <p
            className={cn(
              "font-bold uppercase tracking-[0.12em]",
              header ? "text-[9px]" : "text-[10px]",
              isLight ? "text-cyan-950/80" : "text-cyan-200/55",
            )}
          >
            TOTAL GENDER
          </p>

          <div className="mt-0.5 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 min-w-0">
              <Mars
                className={cn(
                  "h-4 w-4",
                  isLight ? "text-sky-600" : "text-sky-300",
                )}
                strokeWidth={2}
              />
              <span
                className={cn(
                  "font-extrabold tabular-nums",
                  header ? "text-sm" : "text-base",
                  isLight ? "text-slate-900" : "text-cyan-50",
                )}
              >
                {gender.laki.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <Venus
                className={cn(
                  "h-4 w-4",
                  isLight ? "text-rose-600" : "text-rose-300",
                )}
                strokeWidth={2}
              />
              <span
                className={cn(
                  "font-extrabold tabular-nums",
                  header ? "text-sm" : "text-base",
                  isLight ? "text-slate-900" : "text-cyan-50",
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
    <div
      className={cn(
        "flex flex-wrap items-stretch min-w-0",
        header ? "gap-1.5" : "gap-2 sm:gap-2.5",
      )}
    >
      {loading
        ? Array.from({ length: skeletonCount }, (_, idx) => (
            <div
              key={`loading-${idx}`}
              className={cn(
                "flex min-w-[9rem] flex-1 basis-[10rem] items-center rounded-lg border sm:min-w-0 sm:flex-initial sm:basis-auto",
                header
                  ? "min-h-[2.25rem] gap-2 px-2 py-1"
                  : "min-h-[2.75rem] gap-2.5 px-2.5 py-2",
                isLight
                  ? "border-cyan-300/50 bg-white/80"
                  : "border-cyan-900/40 bg-black/30",
              )}
            >
              <div
                className={cn(
                  "shrink-0 animate-pulse rounded-md",
                  header ? "h-6 w-6" : "h-7 w-7",
                  isLight ? "bg-cyan-200/60" : "bg-cyan-900/30",
                )}
              />
              <div
                className={cn("min-w-0 flex-1", header ? "space-y-1" : "space-y-1.5")}
              >
                <div
                  className={cn(
                    "animate-pulse rounded",
                    header ? "h-2 w-12" : "h-2.5 w-14",
                    isLight ? "bg-cyan-200/50" : "bg-cyan-900/35",
                  )}
                />
                <div
                  className={cn(
                    "animate-pulse rounded",
                    header ? "h-4 w-8" : "h-5 w-10",
                    isLight ? "bg-cyan-200/50" : "bg-cyan-900/35",
                  )}
                />
              </div>
            </div>
          ))
        : (
            <>
              {baseCards.map((item) => {
                const Icon = item.icon;
                const clickableTodayCard =
                  Boolean(onTodayKpiClick) &&
                  header &&
                  item.label === "Tindakan hari ini";
                const cardEl = (
                  <div
                    key={item.label}
                    className={cn(
                      "flex min-w-0 flex-1 basis-[10rem] items-center rounded-lg border bg-gradient-to-br shadow-sm transition sm:flex-initial sm:basis-auto",
                      header
                        ? "gap-1.5 px-1.5 py-1"
                        : "gap-2 px-2 py-1.5",
                      isLight
                        ? "shadow-cyan-900/5 hover:border-cyan-500/35"
                        : "shadow-black/25 hover:border-white/10",
                      item.tone,
                      clickableTodayCard
                        ? "cursor-pointer hover:brightness-110 active:scale-[0.99]"
                        : "",
                    )}
                    role={clickableTodayCard ? "button" : undefined}
                    tabIndex={clickableTodayCard ? 0 : undefined}
                    onClick={
                      clickableTodayCard ? () => onTodayKpiClick?.() : undefined
                    }
                    onKeyDown={(e) => {
                      if (!clickableTodayCard) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onTodayKpiClick?.();
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
                          isLight ? "text-cyan-950/80" : "text-cyan-200/55",
                        )}
                      >
                        {item.label}
                      </p>
                      <p
                        className={cn(
                          "font-extrabold tabular-nums",
                          header
                            ? "mt-0 text-sm sm:text-base"
                            : "mt-0.5 text-base sm:text-lg",
                          isLight ? "text-slate-900" : "text-cyan-50",
                        )}
                      >
                        {item.value.toLocaleString("id-ID")}
                      </p>
                      {item.filterLines?.length ? (
                        <p
                          className={cn(
                            "mt-0.5 line-clamp-2 font-medium leading-snug",
                            header ? "text-[8px]" : "text-[10px]",
                            isLight
                              ? "text-slate-700/90"
                              : "text-cyan-100/70",
                          )}
                          title={item.filterLines.join("\n")}
                        >
                          {item.filterLines.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
                return [cardEl, item.label === "Total pasien" ? genderCardEl : null];
              })}

            </>
          )}
    </div>
  );
}
