"use client";

import { useMemo, useState } from "react";
import { BarChart3, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  defaultTindakanDashboardFilters,
  filterTindakanDashboardRows,
  type TindakanDashboardFilterState,
} from "../lib/filterTindakanDashboardRows";
import TindakanDashboardFilters from "./TindakanDashboardFilters";
import TindakanDashboardSummaryCharts from "./TindakanDashboardSummaryCharts";

export default function TindakanDashboardModal({
  open,
  onOpenChange,
  rows,
  loading,
  themeTone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  loading: boolean;
  themeTone: "cyan" | "emerald";
}) {
  const [filters, setFilters] = useState<TindakanDashboardFilterState>(
    defaultTindakanDashboardFilters,
  );

  const filtered = useMemo(
    () => filterTindakanDashboardRows(rows, filters),
    [rows, filters],
  );

  const shell = cn(
    "flex max-h-[min(92vh,900px)] w-full flex-col gap-3 overflow-y-auto overflow-x-visible p-4 sm:p-5",
    "border-slate-200/80 bg-white text-slate-900 shadow-xl dark:border-cyan-600/35 dark:bg-slate-950/95 dark:text-cyan-50",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[95vh] w-[min(100vw-1rem,96vw)] max-w-[min(96vw,90rem)] overflow-visible border p-0",
          "border-slate-300/60 bg-white/98 backdrop-blur-xl dark:border-cyan-500/35 dark:bg-black/80",
        )}
      >
        <div className={shell}>
          <DialogHeader className="shrink-0 space-y-1 pr-8 text-left">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3
                  className={cn(
                    "h-5 w-5 shrink-0",
                    themeTone === "emerald"
                      ? "text-emerald-600 dark:text-emerald-300"
                      : "text-cyan-600 dark:text-cyan-300",
                  )}
                />
                <DialogTitle
                  className={cn(
                    "text-lg font-bold sm:text-xl",
                    "text-slate-900 dark:text-gold",
                  )}
                >
                  Dashboard tindakan
                </DialogTitle>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => onOpenChange(false)}
                className={cn(
                  "rounded-lg p-1.5 transition",
                  "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-cyan-300/80 dark:hover:bg-cyan-950/60 dark:hover:text-cyan-100",
                )}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DialogDescription
              className={cn(
                "text-xs sm:text-sm",
                "text-slate-600 dark:text-cyan-300/75",
              )}
            >
              Filter dan ringkasan grafik dari data tindakan yang sama dengan
              daftar utama (
              {loading ? "memuat…" : `${rows.length} baris tersedia`}).
            </DialogDescription>
          </DialogHeader>

          <TindakanDashboardFilters
            value={filters}
            onChange={setFilters}
            rows={rows}
            themeTone={themeTone}
          />

          <div className="flex min-h-[280px] min-h-0 flex-1 flex-col">
            {loading ? (
              <div
                className={cn(
                  "flex flex-1 items-center justify-center rounded-xl border py-16 text-sm",
                  "border-slate-200 bg-slate-50 text-slate-500 dark:border-cyan-800/40 dark:bg-black/30 dark:text-cyan-200/60",
                )}
              >
                Memuat data tindakan…
              </div>
            ) : (
              <TindakanDashboardSummaryCharts
                rows={filtered}
                themeTone={themeTone}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
