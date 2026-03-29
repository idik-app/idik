"use client";

import { Activity, CalendarDays, Layers3 } from "lucide-react";
import { useTindakanLightMode } from "../hooks/useTindakanLightMode";
import { cn } from "@/lib/utils";

type SummaryProps = {
  stats: Record<string, number>;
  loading: boolean;
  themeTone: "cyan" | "emerald";
  /** Lebih ringkas untuk dipasang di baris judul header */
  variant?: "default" | "header";
};

type SummaryItem = {
  label: string;
  value: number;
  icon: typeof CalendarDays;
  tone: string;
  iconWrap: string;
};

function pickItemStyle(
  label: string,
  themeTone: "cyan" | "emerald",
  isLight: boolean,
): Omit<SummaryItem, "label" | "value"> {
  const key = label.toLowerCase();
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
  if (key.includes("total")) {
    if (isLight) {
      return {
        icon: Layers3,
        tone: "from-violet-50/95 to-white border-violet-300/50",
        iconWrap: "border-violet-400/45 bg-violet-100/90 text-violet-800",
      };
    }
    return {
      icon: Layers3,
      tone: "from-violet-950/40 to-black/20 border-violet-800/35",
      iconWrap: "border-violet-700/35 bg-violet-950/35 text-violet-200/90",
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
    if (k.includes("total")) return 1;
    return 2;
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
}: SummaryProps) {
  const isLight = useTindakanLightMode();
  const header = variant === "header";
  const entries = sortStatEntries(Object.entries(stats || {}));
  const cards: SummaryItem[] = entries.map(([label, rawValue]) => ({
    label,
    value: Number(rawValue || 0),
    ...pickItemStyle(label, themeTone, isLight),
  }));

  const skeletonCount = loading ? Math.max(2, entries.length || 2) : 0;

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
        : cards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={cn(
                  "flex min-w-0 flex-1 basis-[10rem] items-center rounded-lg border bg-gradient-to-br shadow-sm transition sm:flex-initial sm:basis-auto",
                  header ? "gap-1.5 px-1.5 py-1" : "gap-2 px-2 py-1.5",
                  isLight
                    ? "shadow-cyan-900/5 hover:border-cyan-500/35"
                    : "shadow-black/25 hover:border-white/10",
                  item.tone,
                )}
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
                </div>
              </div>
            );
          })}
    </div>
  );
}
