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
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white bg-white/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.03)] backdrop-blur-md">
      {/* 🔍 Search */}
      <div className="relative min-w-[280px] flex-1 group">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-blue-500" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cari No. RM atau Nama Pasien..."
          className="h-12 w-full rounded-2xl border border-slate-100 bg-white px-5 pl-12 pr-12 text-sm font-semibold text-slate-700 transition-all placeholder:text-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 shadow-sm shadow-slate-100"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => handleSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors hover:text-slate-500"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 📅 Date Filter */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-1.5 px-4 shadow-sm shadow-slate-100">
        <div className="relative">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateChange(e.target.value, dateTo)}
            className="h-9 rounded-xl border-none bg-transparent px-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-0"
          />
        </div>
        <span className="font-bold text-slate-200">—</span>
        <div className="relative">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateChange(dateFrom, e.target.value)}
            className="h-9 rounded-xl border-none bg-transparent px-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {/* 🔄 Refresh */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-400 shadow-sm transition-all hover:bg-blue-50 hover:text-blue-600 hover:shadow-md hover:shadow-blue-100 active:scale-95 disabled:opacity-50",
          isLoading && "animate-pulse",
        )}
        title="Refresh Data"
      >
        <RefreshCw size={20} className={cn(isLoading && "animate-spin")} />
      </button>
    </div>
  );
}

export default memo(CasemixToolbar);
