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
    <div className="flex flex-wrap items-center gap-2 rounded-sm border border-[#A3B8CC] bg-[#F0F5FA] p-2 dark:border-[#A3B8CC] dark:bg-neutral-900/40">
      {/* 🔍 Search */}
      <div className="relative min-w-[200px] flex-1">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#003366]/70 dark:text-white/70" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cari No. RM atau Nama Pasien..."
          className="h-8 w-full rounded-sm border border-[#A3B8CC] bg-white py-1 pl-8 pr-8 text-[11px] font-medium text-[#333333] shadow-none placeholder:text-[#888888] focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]/35 dark:border-[#A3B8CC] dark:bg-white dark:text-neutral-900 dark:placeholder:text-white/90"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => handleSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666666] transition-colors hover:text-black dark:text-white/70 dark:hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 📅 Date Filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateChange(e.target.value, dateTo)}
            className="h-8 rounded-sm border border-[#A3B8CC] bg-white px-2 py-0 text-[11px] font-medium text-[#333333] [color-scheme:light] focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]/35 dark:border-[#A3B8CC] dark:bg-white dark:text-neutral-900"
          />
        </div>
        <span className="text-[11px] text-[#666666] dark:text-white/70">—</span>
        <div className="relative">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateChange(dateFrom, e.target.value)}
            className="h-8 rounded-sm border border-[#A3B8CC] bg-white px-2 py-0 text-[11px] font-medium text-[#333333] shadow-sm [color-scheme:light] focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]/35 dark:border-[#A3B8CC] dark:bg-white dark:text-neutral-900"
          />
        </div>
      </div>

      {/* 🔄 Refresh */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-[#A3B8CC] bg-white text-[#003366] shadow-none transition-colors hover:bg-[#E8F1FB] disabled:opacity-50 dark:border-[#A3B8CC] dark:bg-white dark:text-[#003366] dark:hover:bg-[#E8F1FB]",
          isLoading && "animate-pulse",
        )}
        title="Refresh Data"
      >
        <RefreshCw size={16} className={cn(isLoading && "animate-spin")} />
      </button>
    </div>
  );
}

export default memo(CasemixToolbar);
