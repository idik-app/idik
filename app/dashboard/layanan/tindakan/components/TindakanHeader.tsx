"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { useTindakanLightMode } from "../hooks/useTindakanLightMode";
import { cn } from "@/lib/utils";

type ThemeTone = "cyan" | "emerald";

export default function TindakanHeader({
  themeTone,
  onThemeToneChange,
  summary,
}: {
  themeTone: ThemeTone;
  onThemeToneChange: (next: ThemeTone) => void;
  /** Ringkasan KPI (mis. Hari ini / Total) — dipasang di samping judul untuk hemat ruang vertikal */
  summary?: ReactNode;
}) {
  const isLight = useTindakanLightMode();
  const now = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <div
      className={cn(
        "rounded-lg px-2 py-1.5 sm:px-2.5 sm:py-2 transition-colors duration-500",
        isLight
          ? themeTone === "emerald"
            ? "bg-gradient-to-br from-white via-emerald-50/40 to-white"
            : "bg-gradient-to-br from-white via-cyan-50/35 to-white"
          : themeTone === "emerald"
            ? "bg-gradient-to-br from-emerald-950/35 via-black/50 to-slate-950/50"
            : "bg-gradient-to-br from-cyan-950/35 via-black/50 to-slate-950/50",
      )}
    >
      <div className="space-y-1 sm:space-y-1.5">
        <Link
          href="/dashboard/perawat"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors",
            isLight
              ? themeTone === "emerald"
                ? "border-emerald-500/40 bg-emerald-100/80 text-emerald-900 hover:border-emerald-600/60"
                : "border-cyan-500/40 bg-cyan-100/80 text-cyan-900 hover:border-cyan-600/60"
              : themeTone === "emerald"
                ? "border-emerald-800/55 bg-emerald-950/35 text-emerald-300/85 hover:border-emerald-600/70 hover:text-emerald-200"
                : "border-cyan-800/55 bg-cyan-950/35 text-cyan-300/85 hover:border-cyan-600/70 hover:text-cyan-200",
          )}
        >
          <ChevronLeft size={14} />
          Beranda Perawat
        </Link>
        <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 lg:min-w-[12rem] lg:flex-1">
            {summary ? (
              <div className="min-w-0 flex-1 basis-full sm:basis-auto sm:flex-initial">
                {summary}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end lg:shrink-0 min-w-0">
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-xl border p-1",
                isLight
                  ? themeTone === "emerald"
                    ? "border-emerald-400/45 bg-emerald-50/90"
                    : "border-cyan-400/45 bg-cyan-50/90"
                  : "bg-black/30",
                !isLight &&
                  (themeTone === "emerald"
                    ? "border-emerald-800/45"
                    : "border-cyan-800/45"),
              )}
            >
              <button
                type="button"
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-bold transition",
                  isLight
                    ? themeTone === "cyan"
                      ? "bg-cyan-200/90 text-cyan-950"
                      : "text-cyan-800/80 hover:text-cyan-950"
                    : themeTone === "cyan"
                      ? "bg-cyan-500/25 text-cyan-100"
                      : "text-cyan-200/70 hover:text-cyan-100",
                )}
                onClick={() => onThemeToneChange("cyan")}
              >
                Cyan
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-bold transition",
                  isLight
                    ? themeTone === "emerald"
                      ? "bg-emerald-200/90 text-emerald-950"
                      : "text-emerald-800/80 hover:text-emerald-950"
                    : themeTone === "emerald"
                      ? "bg-emerald-500/25 text-emerald-100"
                      : "text-emerald-200/70 hover:text-emerald-100",
                )}
                onClick={() => onThemeToneChange("emerald")}
              >
                Emerald
              </button>
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5",
                isLight
                  ? themeTone === "emerald"
                    ? "border-emerald-400/45 bg-white/80"
                    : "border-cyan-400/45 bg-white/80"
                  : "bg-black/35",
                !isLight &&
                  (themeTone === "emerald"
                    ? "border-emerald-800/45"
                    : "border-cyan-800/45"),
              )}
            >
              <Sparkles
                className={cn(
                  "h-4 w-4",
                  isLight
                    ? themeTone === "emerald"
                      ? "text-emerald-700"
                      : "text-cyan-700"
                    : themeTone === "emerald"
                      ? "text-emerald-300"
                      : "text-cyan-300",
                )}
              />
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-semibold min-w-0 max-w-full sm:max-w-[20rem] md:max-w-none truncate",
                  isLight
                    ? themeTone === "emerald"
                      ? "text-emerald-900/90"
                      : "text-cyan-900/90"
                    : themeTone === "emerald"
                      ? "text-emerald-100/85"
                      : "text-cyan-100/85",
                )}
                title={now}
              >
                {now}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
