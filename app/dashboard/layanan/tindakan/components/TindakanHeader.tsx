"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { BarChart3, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import type { AccessTarget } from "./TindakanRoleAccessModal";
import TindakanDashboardModal from "./TindakanDashboardModal";

type ThemeTone = "cyan" | "emerald";

export default function TindakanHeader({
  themeTone,
  onRoleAccessClick,
  summary,
  dashboardRows,
  dashboardLoading,
}: {
  themeTone: ThemeTone;
  onRoleAccessClick: (target: AccessTarget) => void;
  /** Ringkasan KPI (mis. Hari ini / Total) — dipasang di samping judul untuk hemat ruang vertikal */
  summary?: ReactNode;
  /** Snapshot daftar tindakan (sumber yang sama dengan tabel utama) untuk modal dashboard */
  dashboardRows?: readonly TindakanJoinResult[];
  dashboardLoading?: boolean;
}) {
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const rows = dashboardRows ?? [];
  const loadingDash = Boolean(dashboardLoading);
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
        themeTone === "emerald"
          ? "bg-gradient-to-br from-white via-emerald-50/40 to-white dark:bg-gradient-to-br dark:from-black dark:via-black dark:to-black"
          : "bg-gradient-to-br from-white via-cyan-50/35 to-white dark:bg-gradient-to-br dark:from-black dark:via-black dark:to-black",
      )}
    >
      <div className="space-y-1 sm:space-y-1.5">
        <Link
          href="/dashboard/perawat"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors",
            themeTone === "emerald"
              ? "border-emerald-500/40 bg-emerald-100/80 text-emerald-900 hover:border-emerald-600/60 dark:border-emerald-700/50 dark:bg-black dark:text-white dark:hover:border-emerald-500/55 dark:hover:text-white"
              : "border-cyan-500/40 bg-cyan-100/80 text-cyan-900 hover:border-cyan-600/60 dark:border-cyan-700/50 dark:bg-black dark:text-white dark:hover:border-cyan-500/55 dark:hover:text-white",
          )}
        >
          <ChevronLeft size={14} className="shrink-0 opacity-90 dark:opacity-100" />
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
            <button
              type="button"
              onClick={() => setDashboardOpen(true)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition",
                themeTone === "emerald"
                  ? "border-emerald-500/45 bg-emerald-100/90 text-emerald-900 hover:border-emerald-600/55 dark:border-emerald-700/50 dark:bg-black dark:text-white dark:hover:border-emerald-500/55"
                  : "border-cyan-500/45 bg-cyan-100/90 text-cyan-900 hover:border-cyan-600/55 dark:border-cyan-700/50 dark:bg-black dark:text-white dark:hover:border-cyan-500/55",
              )}
            >
              <BarChart3 className="h-4 w-4 shrink-0 opacity-95 dark:opacity-100" />
              Dashboard
            </button>
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-xl border p-1",
                "border-cyan-400/45 bg-cyan-50/90 dark:border-cyan-700/45 dark:bg-black",
              )}
            >
              <button
                type="button"
                onClick={() => onRoleAccessClick("depo")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-bold transition",
                  "bg-cyan-200/90 text-cyan-950 hover:bg-cyan-300/90",
                  "dark:bg-cyan-500/30 dark:text-white dark:hover:bg-cyan-500/40",
                )}
              >
                Depo Farmasi
              </button>
              <button
                type="button"
                onClick={() => onRoleAccessClick("distributor")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-bold transition",
                  "text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/80",
                  "dark:text-white/90 dark:hover:text-white dark:hover:bg-emerald-500/25",
                )}
              >
                Distributor Cathlab
              </button>
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5",
                themeTone === "emerald"
                  ? "border-emerald-400/45 bg-white/80 dark:border-emerald-700/45 dark:bg-black"
                  : "border-cyan-400/45 bg-white/80 dark:border-cyan-700/45 dark:bg-black",
              )}
            >
              <Sparkles
                className={cn(
                  "h-4 w-4 shrink-0",
                  themeTone === "emerald"
                    ? "text-emerald-700 dark:text-white"
                    : "text-cyan-700 dark:text-white",
                )}
              />
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-semibold min-w-0 max-w-full sm:max-w-[20rem] md:max-w-none truncate",
                  themeTone === "emerald"
                    ? "text-emerald-900/90 dark:text-white"
                    : "text-cyan-900/90 dark:text-white",
                )}
                title={now}
              >
                {now}
              </span>
            </div>
          </div>
        </div>
      </div>

      <TindakanDashboardModal
        open={dashboardOpen}
        onOpenChange={setDashboardOpen}
        rows={rows}
        loading={loadingDash}
        themeTone={themeTone}
      />
    </div>
  );
}
