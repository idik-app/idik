"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ToolbarPagination({
  currentPage,
  totalPages,
  perPage,
  handlePageChange,
  handlePerPage,
}: any) {
  return (
    <div className="flex items-center gap-3 text-sm text-cyan-300">
      {/* 🔹 Tombol Prev */}
      <button
        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`px-2 py-1 rounded border ${
          currentPage === 1
            ? "border-cyan-800 text-gray-500 cursor-not-allowed"
            : "border-cyan-600 hover:border-yellow-400 hover:text-yellow-300"
        }`}
      >
        <ChevronLeft size={14} />
      </button>

      {/* 🔹 Info halaman */}
      <span>
        Hal <span className="text-yellow-400">{currentPage}</span> /{" "}
        {totalPages}
      </span>

      {/* 🔹 Tombol Next */}
      <button
        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`px-2 py-1 rounded border ${
          currentPage === totalPages
            ? "border-cyan-800 text-gray-500 cursor-not-allowed"
            : "border-cyan-600 hover:border-yellow-400 hover:text-yellow-300"
        }`}
      >
        <ChevronRight size={14} />
      </button>

      {/* 🔹 PerPage dropdown */}
      <select
        value={perPage}
        onChange={(e) => handlePerPage(Number(e.target.value))}
        className="ml-3 bg-transparent border border-cyan-600/40 rounded px-2 py-1 text-cyan-300 hover:border-yellow-400"
      >
        {[10, 25, 50, 100].map((num) => (
          <option key={num} value={num} className="bg-gray-900">
            {num} / halaman
          </option>
        ))}
      </select>
    </div>
  );
}
