"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTindakanLightMode } from "../hooks/useTindakanLightMode";

const DEFAULT_SIZES = [10, 15, 25, 50, 100];

interface Props {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export default function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_SIZES,
}: Props) {
  const isLight = useTindakanLightMode();
  const sizeChoices = useMemo(() => {
    const s = new Set([...pageSizeOptions, pageSize]);
    return [...s].sort((a, b) => a - b);
  }, [pageSizeOptions, pageSize]);

  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between py-1.5 px-2 sm:px-2 transition-colors duration-500 bg-transparent",
      )}
    >
      <p
        className={cn(
          "text-center sm:text-left text-[11px] sm:text-xs font-semibold",
          isLight ? "text-slate-800" : "text-cyan-200/90",
        )}
      >
        Menampilkan{" "}
        <span
          className={cn(
            "font-mono font-bold tabular-nums",
            isLight ? "text-slate-950" : "text-cyan-100",
          )}
        >
          {start}–{end}
        </span>{" "}
        dari{" "}
        <span
          className={cn(
            "font-mono font-bold tabular-nums",
            isLight ? "text-slate-950" : "text-cyan-100",
          )}
        >
          {totalItems.toLocaleString("id-ID")}
        </span>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
        <label
          className={cn(
            "flex items-center gap-2 text-[11px] sm:text-xs font-bold",
            isLight ? "text-cyan-950" : "text-cyan-400/90",
          )}
        >
          <span className="whitespace-nowrap">Baris / halaman</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={cn(
              "rounded-md border px-2 py-1.5 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/45",
              isLight
                ? "border-cyan-500/45 bg-white text-slate-950 [color-scheme:light]"
                : "border-cyan-700/50 bg-black/60 text-cyan-100",
            )}
          >
            {sizeChoices.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className={cn(
              "p-2 rounded-md border disabled:opacity-30 disabled:cursor-not-allowed transition",
              isLight
                ? "border-cyan-500/40 hover:bg-cyan-100 text-cyan-900"
                : "border-cyan-700/40 hover:bg-cyan-900/40 text-cyan-300",
            )}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className={cn(
              "text-xs sm:text-sm font-bold whitespace-nowrap min-w-[7.5rem] text-center tabular-nums",
              isLight ? "text-slate-950" : "text-cyan-200",
            )}
          >
            Halaman {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className={cn(
              "p-2 rounded-md border disabled:opacity-30 disabled:cursor-not-allowed transition",
              isLight
                ? "border-cyan-500/40 hover:bg-cyan-100 text-cyan-900"
                : "border-cyan-700/40 hover:bg-cyan-900/40 text-cyan-300",
            )}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
