"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMasterTindakan } from "../contexts/MasterTindakanContext";

export default function MasterTindakanPagination() {
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    rowsPerPage,
    setRowsPerPage,
    filteredRows,
  } = useMasterTindakan();

  const disabledPrev = currentPage <= 1;
  const disabledNext = currentPage >= totalPages;
  const total = filteredRows.length;
  const start = total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, total);

  const pageNumbers = (() => {
    const max = totalPages;
    if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [];
    const show = (n: number) => pages.push(n);
    if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) show(i);
      pages.push("ellipsis");
      show(max);
    } else if (currentPage >= max - 2) {
      show(1);
      pages.push("ellipsis");
      for (let i = max - 3; i <= max; i++) show(i);
    } else {
      show(1);
      pages.push("ellipsis");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) show(i);
      pages.push("ellipsis");
      show(max);
    }
    return pages;
  })();

  return (
    <div
      className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-cyan-700/30"
      role="navigation"
      aria-label="Paginasi master tindakan"
    >
      <p className="text-xs text-cyan-500/90 order-2 sm:order-1">
        Menampilkan{" "}
        <span className="text-yellow-400 font-medium">
          {total === 0 ? 0 : `${start}–${end}`}
        </span>{" "}
        dari <span className="text-yellow-400 font-medium">{total}</span> item
      </p>

      <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => !disabledPrev && setCurrentPage(currentPage - 1)}
          disabled={disabledPrev}
          className={`p-1.5 rounded-md border border-cyan-600/40 text-cyan-300 transition ${
            disabledPrev
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-cyan-500/15 hover:border-yellow-400/50"
          }`}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={18} />
        </button>

        {pageNumbers.map((p, idx) =>
          p === "ellipsis" ? (
            <span
              key={`e-${idx}`}
              className="px-1 text-cyan-600 text-sm select-none"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => setCurrentPage(p)}
              className={`min-w-[2rem] px-2 py-1 rounded-md text-sm font-medium transition ${
                p === currentPage
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.25)]"
                  : "text-cyan-400 border border-transparent hover:bg-cyan-500/10 hover:border-cyan-600/40"
              }`}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => !disabledNext && setCurrentPage(currentPage + 1)}
          disabled={disabledNext}
          className={`p-1.5 rounded-md border border-cyan-600/40 text-cyan-300 transition ${
            disabledNext
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-cyan-500/15 hover:border-yellow-400/50"
          }`}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-cyan-400 order-3">
        <label htmlFor="master-tindakan-rows-per-page" className="whitespace-nowrap">
          Per halaman
        </label>
        <select
          id="master-tindakan-rows-per-page"
          value={rowsPerPage}
          onChange={(e) => setRowsPerPage(Number(e.target.value))}
          className="bg-gray-900/80 border border-cyan-700/50 text-cyan-200 rounded-md px-2 py-1.5 focus:border-yellow-400 focus:outline-none"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
}
