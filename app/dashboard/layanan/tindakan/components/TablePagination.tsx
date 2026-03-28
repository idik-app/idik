"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const sizeChoices = useMemo(() => {
    const s = new Set([...pageSizeOptions, pageSize]);
    return [...s].sort((a, b) => a - b);
  }, [pageSizeOptions, pageSize]);

  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between py-2 px-2 sm:px-2.5 bg-black/50 border-t border-cyan-800/40">
      <p className="text-center sm:text-left text-cyan-200/90 text-[11px] sm:text-xs">
        Menampilkan{" "}
        <span className="font-mono text-cyan-100 tabular-nums">
          {start}–{end}
        </span>{" "}
        dari{" "}
        <span className="font-mono text-cyan-100 tabular-nums">
          {totalItems.toLocaleString("id-ID")}
        </span>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
        <label className="flex items-center gap-2 text-[11px] sm:text-xs text-cyan-400/90">
          <span className="whitespace-nowrap">Baris / halaman</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-cyan-700/50 bg-black/60 px-2 py-1.5 text-cyan-100 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/45"
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
            className="p-2 rounded-md border border-cyan-700/40 hover:bg-cyan-900/40 text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-cyan-200 text-xs sm:text-sm whitespace-nowrap min-w-[7.5rem] text-center tabular-nums">
            Halaman {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-2 rounded-md border border-cyan-700/40 hover:bg-cyan-900/40 text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
            aria-label="Halaman berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
