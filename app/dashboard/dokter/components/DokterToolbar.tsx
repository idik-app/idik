"use client";

import { useDokter } from "../contexts/DokterContext";
import { Search } from "react-bootstrap-icons";
import { ExportButton } from "@/components/global/ExportShare";
import { useSpring, animated } from "@react-spring/web";
import { useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";

export default function DokterToolbar() {
  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalPages,
    rowsPerPage,
    setRowsPerPage,
    paginatedDoctors,
    filteredDoctors,
  } = useDokter();

  const disabledPrev = currentPage <= 1;
  const disabledNext = currentPage >= totalPages;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, [filteredDoctors]);

  const totalCount = filteredDoctors?.length ?? 0;
  const { total, aura } = useSpring({
    from: { total: 0, aura: 0 },
    to: { total: totalCount, aura: totalCount },
    config: { tension: 120, friction: 16 },
  });

  const glowStyle = {
    boxShadow: aura.to(
      (a) =>
        `0 0 ${Math.min(25, a / 3)}px rgba(0,255,255,${
          0.15 + Math.min(0.4, a / 400)
        })`
    ),
    backgroundColor: "rgba(0, 60, 80, 0.2)",
    borderColor: "rgba(0, 255, 255, 0.25)",
  };

  return (
    <div className="jarvis-glass flex flex-col md:flex-row justify-between items-center gap-3 p-3 rounded-xl border border-cyan-700/40 shadow-[0_0_15px_rgba(0,255,255,0.1)] backdrop-blur-md">
      {/* 🔹 Kiri: Search & Export */}
      <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-2 w-full md:w-72">
          <Search className="text-cyan-400" size={18} />
          <input
            type="text"
            placeholder="Cari dokter..."
            className="w-full bg-transparent border-b border-cyan-700 text-cyan-200 placeholder-cyan-600 outline-none px-2 pb-1 text-sm focus:border-yellow-400 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex justify-end md:justify-start w-full md:w-auto">
          <ExportButton type="dokter" data={paginatedDoctors} />
        </div>
      </div>

      {/* 🔸 Kanan: Statistik & Navigasi */}
      <div className="flex flex-col md:flex-row items-center justify-center md:justify-end gap-4 text-sm text-cyan-300 font-medium w-full md:w-auto">
        <animated.div
          style={glowStyle}
          className="flex flex-col items-center md:items-start gap-1 px-3 py-2 rounded-lg border transition-all duration-300 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <Stethoscope
              size={16}
              className="text-cyan-400 drop-shadow-[0_0_6px_rgba(0,255,255,0.5)]"
            />
            <span className="text-cyan-400">Total Dokter:</span>
            {isLoading ? (
              <div className="animate-pulse bg-cyan-900/20 rounded-md h-4 w-10" />
            ) : (
              <animated.span className="text-yellow-400 font-bold text-base drop-shadow-[0_0_6px_rgba(255,255,0,0.6)]">
                {total.to((n) => `${Math.floor(n)}`)}
              </animated.span>
            )}
          </div>
        </animated.div>

        {/* Info Halaman */}
        <div className="flex flex-col text-center md:text-right text-xs text-cyan-400">
          <span>
            Menampilkan <span className="text-yellow-400">{rowsPerPage}</span>{" "}
            data per halaman
          </span>
          <span>
            Halaman <span className="text-yellow-400">{currentPage}</span> dari{" "}
            <span className="text-yellow-400">{totalPages}</span>
          </span>
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => !disabledPrev && setCurrentPage(currentPage - 1)}
            disabled={disabledPrev}
            className={`transition ${
              disabledPrev
                ? "opacity-40 cursor-not-allowed"
                : "hover:text-yellow-400"
            }`}
          >
            ◀ Prev
          </button>
          <button
            onClick={() => !disabledNext && setCurrentPage(currentPage + 1)}
            disabled={disabledNext}
            className={`transition ${
              disabledNext
                ? "opacity-40 cursor-not-allowed"
                : "hover:text-yellow-400"
            }`}
          >
            Next ▶
          </button>
        </div>

        {/* Jumlah per halaman */}
        <div className="flex items-center gap-1">
          <span className="text-cyan-400">Tampilkan:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            className="bg-transparent border border-cyan-700 text-cyan-200 rounded-md px-2 py-1 focus:border-yellow-400 transition"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  );
}
