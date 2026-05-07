"use client";

import { useMemo, memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_SIZES = [10, 15, 25, 50, 100];

interface Props {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  /** Gaya pagination untuk dashboard Casemix (warna grid HIS). */
  variant?: "default" | "enterprise";
}

function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_SIZES,
  variant = "default",
}: Props) {
  const ent = variant === "enterprise";
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
          ent ? "text-[#333333] dark:text-white/90" : "text-slate-800 dark:text-white/90",
        )}
      >
        Menampilkan{" "}
        <span
          className={cn(
            "font-mono font-bold tabular-nums",
            ent ? "text-black dark:text-white" : "text-slate-950 dark:text-white",
          )}
        >
          {start}–{end}
        </span>{" "}
        dari{" "}
        <span
          className={cn(
            "font-mono font-bold tabular-nums",
            ent ? "text-black dark:text-white" : "text-slate-950 dark:text-white",
          )}
        >
          {totalItems.toLocaleString("id-ID")}
        </span>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
        <label
          className={cn(
            "flex items-center gap-2 text-[11px] sm:text-xs font-bold",
            ent ? "text-[#333333] dark:text-white/90" : "text-cyan-950 dark:text-white/90",
          )}
        >
          <span className="whitespace-nowrap">Baris / halaman</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={cn(
              "border px-2 py-1 text-[11px] font-bold focus:outline-none [color-scheme:light]",
              ent
                ? "rounded-sm border-[#A3B8CC] bg-white text-[#333333] focus-visible:ring-1 focus-visible:ring-[#003366]/40 dark:border-[#A3B8CC] dark:bg-white dark:text-neutral-900 dark:[color-scheme:light]"
                : "rounded-md border-cyan-500/45 bg-white py-1.5 text-xs text-slate-950 focus-visible:ring-2 focus-visible:ring-cyan-500/45 dark:border-cyan-700/50 dark:bg-black/60 dark:text-white dark:[color-scheme:dark]",
            )}
          >
            {sizeChoices.map((n) => (
              <option key={n} value={n} className="dark:bg-slate-900">
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
              "border p-1.5 disabled:cursor-not-allowed disabled:opacity-30 transition",
              ent
                ? "rounded-sm border-[#A3B8CC] bg-white text-[#003366] hover:bg-[#E8F1FB] dark:border-[#A3B8CC] dark:bg-white dark:text-white dark:hover:bg-neutral-800"
                : "rounded-md border-cyan-500/40 p-2 text-cyan-900 hover:bg-cyan-100 dark:border-cyan-700/40 dark:hover:bg-cyan-900/40 dark:text-white",
            )}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className={cn(
              "min-w-[7.5rem] whitespace-nowrap text-center text-xs font-bold tabular-nums sm:text-sm",
              ent ? "text-[#333333] dark:text-white" : "text-slate-950 dark:text-white",
            )}
          >
            Halaman {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className={cn(
              "border p-1.5 disabled:cursor-not-allowed disabled:opacity-30 transition",
              ent
                ? "rounded-sm border-[#A3B8CC] bg-white text-[#003366] hover:bg-[#E8F1FB] dark:border-[#A3B8CC] dark:bg-white dark:text-white dark:hover:bg-neutral-800"
                : "rounded-md border-cyan-500/40 p-2 text-cyan-900 hover:bg-cyan-100 dark:border-cyan-700/40 dark:hover:bg-cyan-900/40 dark:text-white",
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

export default memo(TablePagination);
