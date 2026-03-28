"use client";

import { Search } from "react-bootstrap-icons";
import { Filter } from "lucide-react";
import { useMasterTindakan } from "../contexts/MasterTindakanContext";

export default function MasterTindakanToolbar() {
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredRows,
  } = useMasterTindakan();

  return (
    <div className="jarvis-glass flex flex-col lg:flex-row flex-wrap justify-between items-stretch lg:items-end gap-3 p-3 mb-4 rounded-xl border border-cyan-700/40 shadow-[0_0_15px_rgba(0,255,255,0.08)] backdrop-blur-md">
      <div className="flex flex-col sm:flex-row flex-1 gap-3 min-w-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 md:max-w-md">
          <Search className="text-cyan-400 shrink-0" size={18} aria-hidden />
          <input
            type="search"
            placeholder="Cari nama jenis tindakan…"
            className="w-full bg-transparent border-b border-cyan-700 text-cyan-200 placeholder-cyan-600 outline-none px-2 pb-1 text-sm focus:border-yellow-400 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Cari master tindakan"
          />
        </div>

        <div className="flex items-center gap-2 min-w-0 flex-1 sm:max-w-xs">
          <Filter className="text-cyan-500 shrink-0" size={16} aria-hidden />
          <label className="sr-only" htmlFor="filter-status-master-tindakan">
            Filter status
          </label>
          <select
            id="filter-status-master-tindakan"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "aktif" | "nonaktif")
            }
            className="w-full min-w-0 bg-gray-900/70 border border-cyan-700/50 text-cyan-200 rounded-lg px-2 py-1.5 text-sm focus:border-yellow-400 focus:outline-none"
          >
            <option value="all">Semua status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>
      </div>

      <div className="text-xs text-cyan-500/90 lg:text-right shrink-0">
        <span className="text-cyan-400">Hasil: </span>
        <span className="text-yellow-400 font-semibold">
          {filteredRows.length}
        </span>
        <span className="text-cyan-500"> item</span>
      </div>
    </div>
  );
}
