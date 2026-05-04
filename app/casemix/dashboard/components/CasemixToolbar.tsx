"use client";

import { memo, useState } from "react";
import { Search, RefreshCw, X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onRefresh: () => void;
  isLoading: boolean;
  onSearch: (val: string) => void;
  onFilter: (from: string, to: string) => void;
}

function CasemixToolbar({ onRefresh, isLoading, onSearch, onFilter }: Props) {
  const [searchValue, setSearchValue] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleSearch = (val: string) => {
    setSearchValue(val);
    onSearch(val);
  };

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    onFilter(from, to);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-500/10 bg-black/20 p-3 backdrop-blur-sm">
      {/* 🔍 Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cari RM atau Nama Pasien..."
          className="w-full rounded-xl border border-cyan-500/20 bg-black/40 py-2 pl-10 pr-10 text-sm text-white placeholder:text-cyan-300/30 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        />
        {searchValue && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-300/50 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 📅 Date Filter */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateChange(e.target.value, dateTo)}
            className="rounded-xl border border-cyan-500/20 bg-black/40 py-2 px-3 text-xs text-white [color-scheme:dark] focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <span className="text-cyan-500/50">—</span>
        <div className="relative">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateChange(dateFrom, e.target.value)}
            className="rounded-xl border border-cyan-500/20 bg-black/40 py-2 px-3 text-xs text-white [color-scheme:dark] focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* 🔄 Refresh */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-100 transition-all hover:bg-cyan-500/20 active:scale-95 disabled:opacity-50",
          isLoading && "animate-pulse"
        )}
        title="Refresh Data"
      >
        <RefreshCw size={18} className={cn(isLoading && "animate-spin")} />
      </button>
    </div>
  );
}

export default memo(CasemixToolbar);
