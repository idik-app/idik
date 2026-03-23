"use client";

import { Search } from "lucide-react";

interface Props {
  onSearch: (val: string) => void;
  onFilter: (dokter: string, status: string) => void;
  dokterOptions: string[];
  statusOptions: string[];
}

export default function MiniTableFilter({
  onSearch,
  onFilter,
  dokterOptions,
  statusOptions,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3 bg-black/20 border-b border-cyan-900/40 backdrop-blur-sm rounded-t-xl">
      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2 top-2.5 text-cyan-400 opacity-70"
        />
        <input
          type="text"
          placeholder="Cari nama pasien..."
          onChange={(e) => onSearch(e.target.value)}
          className="pl-7 pr-3 py-1.5 text-sm rounded-md bg-black/40 border border-cyan-700/40 text-cyan-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {/* Filter Dokter */}
      <select
        onChange={(e) => onFilter(e.target.value, "")}
        className="text-sm px-2 py-1.5 rounded-md bg-black/40 border border-cyan-700/40 text-cyan-100 focus:outline-none"
      >
        <option value="">Semua Dokter</option>
        {dokterOptions.map((d, idx) => (
          <option key={idx} value={d}>
            {d}
          </option>
        ))}
      </select>

      {/* Filter Status */}
      <select
        onChange={(e) => onFilter("", e.target.value)}
        className="text-sm px-2 py-1.5 rounded-md bg-black/40 border border-cyan-700/40 text-cyan-100 focus:outline-none"
      >
        <option value="">Semua Status</option>
        {statusOptions.map((s, idx) => (
          <option key={idx} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
