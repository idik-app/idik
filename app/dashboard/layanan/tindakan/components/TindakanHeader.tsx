"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Phone, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import type { AccessTarget } from "./TindakanRoleAccessModal";

type ThemeTone = "cyan" | "emerald";

export default function TindakanHeader({
  themeTone,
  onRoleAccessClick,
  onPhoneDirectoryOpen,
  summary,
}: {
  themeTone: ThemeTone;
  onRoleAccessClick: (target: AccessTarget) => void;
  onPhoneDirectoryOpen: () => void;
  /** Ringkasan KPI (mis. Hari ini / Total) — dipasang di samping judul untuk hemat ruang vertikal */
  summary?: ReactNode;
  /** @deprecated No longer used but kept for props compatibility */
  dashboardRows?: readonly TindakanJoinResult[];
  dashboardLoading?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg px-1.5 py-1 sm:px-2 sm:py-1.5 transition-colors duration-500",
        themeTone === "emerald"
          ? "bg-gradient-to-br from-white via-emerald-50/40 to-white dark:bg-gradient-to-br dark:from-black dark:via-black dark:to-black"
          : "bg-gradient-to-br from-white via-cyan-50/35 to-white dark:bg-gradient-to-br dark:from-black dark:via-black dark:to-black",
      )}
    >
        <div className="space-y-0.5 sm:space-y-1">
        <Link
          href="/dashboard/perawat"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-colors",
            themeTone === "emerald"
              ? "border-emerald-500/40 bg-emerald-100/80 text-emerald-900 hover:border-emerald-600/60 dark:border-emerald-700/50 dark:bg-black dark:text-white dark:hover:border-emerald-500/55 dark:hover:text-white"
              : "border-cyan-500/40 bg-cyan-100/80 text-cyan-900 hover:border-cyan-600/60 dark:border-cyan-700/50 dark:bg-black dark:text-white dark:hover:border-cyan-500/55 dark:hover:text-white",
          )}
        >
          <ChevronLeft
            size={14}
            className="shrink-0 opacity-90 dark:opacity-100"
          />
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
              onClick={onPhoneDirectoryOpen}
              className={cn(
                "inline-flex items-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-bold transition",
                "border-amber-500/45 bg-amber-100/90 text-amber-900 hover:border-amber-600/55 dark:border-amber-700/50 dark:bg-black dark:text-white dark:hover:border-amber-500/55",
              )}
            >
              <Phone className="h-3.5 w-3.5 shrink-0 opacity-95 dark:opacity-100" />
              Daftar Telp
            </button>
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-xl border p-0.5",
                "border-slate-200 bg-slate-50/50 dark:border-zinc-800 dark:bg-black",
              )}
            >
              <button
                type="button"
                onClick={() => onRoleAccessClick("depo")}
                className={cn(
                  "rounded-lg px-2 py-0.5 text-[11px] font-bold transition",
                  "bg-cyan-200/90 text-cyan-950 hover:bg-cyan-300/90",
                  "dark:bg-cyan-500/30 dark:text-white dark:hover:bg-cyan-500/40",
                )}
              >
                Depo Farmasi
              </button>
              <button
                type="button"
                onClick={() => onRoleAccessClick("cssd")}
                className={cn(
                  "rounded-lg px-2 py-0.5 text-[11px] font-bold transition",
                  "bg-amber-100 text-amber-900 hover:bg-amber-200",
                  "dark:bg-amber-500/30 dark:text-white dark:hover:bg-amber-500/40",
                )}
              >
                CSSD
              </button>
              <button
                type="button"
                onClick={() => onRoleAccessClick("distributor")}
                className={cn(
                  "rounded-lg px-2 py-0.5 text-[11px] font-bold transition",
                  "bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
                  "dark:bg-emerald-500/30 dark:text-white dark:hover:bg-emerald-500/40",
                )}
              >
                Distributor Cathlab
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
