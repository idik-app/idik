"use client";

import { memo, useState } from "react";
import { Search, RefreshCw, X } from "lucide-react";
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
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/20 bg-white/40 p-3 shadow-lg shadow-slate-200/30 backdrop-blur-md dark:border-slate-800/50 dark:bg-slate-900/40 dark:shadow-none">
      {/* 🔍 Search */}
      <div className="relative min-w-[240px] flex-1 group">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500 dark:text-slate-500" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cari No. RM atau Nama Pasien..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white/50 py-2 pl-10 pr-10 text-sm font-medium text-slate-700 transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 dark:placeholder:text-slate-600 dark:focus:border-indigo-500"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 📅 Date Filter */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/50 p-1 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="relative">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateChange(e.target.value, dateTo)}
            className="h-8 rounded-lg border-none bg-transparent px-3 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-0 dark:text-slate-300"
          />
        </div>
        <span className="text-slate-300 dark:text-slate-700">—</span>
        <div className="relative">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateChange(dateFrom, e.target.value)}
            className="h-8 rounded-lg border-none bg-transparent px-3 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-0 dark:text-slate-300"
          />
        </div>
      </div>

      {/* 🔄 Refresh */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-indigo-600 active:scale-95 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800",
          isLoading && "animate-pulse",
        )}
        title="Refresh Data"
      >
        <RefreshCw size={18} className={cn(isLoading && "animate-spin")} />
      </button>
    </div>
  );
}

export default memo(CasemixToolbar);
