"use client";

import { useDokter } from "../contexts/DokterContext";
import { Search } from "react-bootstrap-icons";
import { Filter } from "lucide-react";

export default function DokterToolbar() {
  const {
    searchQuery,
    setSearchQuery,
    filterSpesialis,
    setFilterSpesialis,
    statusFilter,
    setStatusFilter,
    spesialisOptions,
    filteredDoctors,
  } = useDokter();

  return (
    <div
      className="jarvis-glass flex flex-col lg:flex-row flex-wrap justify-between items-stretch lg:items-end gap-3 p-3 mb-4 rounded-xl border border-cyan-700/40 shadow-[0_0_15px_rgba(0,255,255,0.08)] backdrop-blur-md dark:border-cyan-600/30 dark:bg-black/35 dark:shadow-[0_0_18px_rgba(0,255,255,0.06)]"
    >
      <div className="flex flex-col sm:flex-row flex-1 gap-3 min-w-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 md:max-w-md">
          <Search
            className="shrink-0 text-cyan-600 dark:text-white"
            size={18}
            aria-hidden
          />
          <input
            type="search"
            placeholder="Cari nama, spesialis, atau kontak..."
            className="w-full bg-transparent border-b border-cyan-700 text-cyan-100 placeholder-cyan-500/70 outline-none px-2 pb-1 text-sm transition-all focus:border-yellow-400 dark:border-white/25 dark:text-white dark:placeholder:text-white/45 dark:focus:border-white/60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Cari dokter"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Filter
              className="shrink-0 text-cyan-600 dark:text-white"
              size={16}
              aria-hidden
            />
            <label className="sr-only" htmlFor="filter-spesialis">
              Filter spesialis
            </label>
            <select
              id="filter-spesialis"
              value={filterSpesialis}
              onChange={(e) => setFilterSpesialis(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-cyan-700/50 bg-gray-900/70 px-2 py-1.5 text-sm text-cyan-100 focus:border-yellow-400 focus:outline-none dark:border-white/20 dark:bg-black dark:text-white dark:[color-scheme:dark] dark:focus:border-white/50"
            >
              <option value="">Semua spesialis</option>
              {spesialisOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <label className="sr-only" htmlFor="filter-status">
              Filter status
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "aktif" | "nonaktif")
              }
              className="w-full min-w-0 rounded-lg border border-cyan-700/50 bg-gray-900/70 px-2 py-1.5 text-sm text-cyan-900 focus:border-yellow-500 focus:outline-none dark:border-white/20 dark:bg-black dark:text-white dark:[color-scheme:dark] dark:focus:border-white/50"
            >
              <option value="all">Semua status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      <div className="shrink-0 text-xs text-cyan-400/95 lg:text-right dark:text-white">
        <span>Hasil: </span>
        <span className="font-semibold text-yellow-400 dark:text-white">
          {filteredDoctors.length}
        </span>
        <span className="dark:text-white/95"> dokter</span>
      </div>
    </div>
  );
}
