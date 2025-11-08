"use client";
import { useEffect, useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import { motion } from "framer-motion";
import { usePasien } from "../contexts/PasienContext";
import { Pasien } from "../types/pasien";
import { ExportButton } from "@/components/global/ExportShare";
import {
  Search,
  People,
  PersonStanding,
  PersonStandingDress,
} from "react-bootstrap-icons";
import { Sparkles, RotateCcw, Plus, RefreshCw, Clock } from "lucide-react";
import { useNotification } from "@/app/contexts/NotificationContext";

/* ---------------------------------------------------------
   🧩 PasienToolbar v5.7 – Stable & Synced with Context v3.9
   - Pakai filter global dari PasienContext
   - Tidak ada setSearchQuery lokal
   - Tidak ada fetch manual (realtime + auto-sync sudah aktif)
---------------------------------------------------------- */
export default function PasienToolbar() {
  const {
    filters,
    setFilters,
    resetFilters,
    paginatedPatients,
    filteredPatients,
    openAddModal,
  } = usePasien();

  const { show } = useNotification();

  const [isLoading, setIsLoading] = useState(true);
  const [showInsight, setShowInsight] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>("—");

  /* 🧭 Simulasi indikator sinkronisasi (realtime) */
  useEffect(() => {
    const now = new Date();
    setLastSynced(
      now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    );
  }, [filteredPatients]);

  /* 🔁 Reset Filter */
  const handleResetFilter = () => {
    resetFilters();
    show({ type: "info", message: "🔄 Filter dikembalikan ke default." });
  };

  /* 🧮 Statistik animasi */
  const totalCount = filteredPatients?.length ?? 0;
  const maleCount =
    filteredPatients?.filter((p: Pasien) => p.jenisKelamin === "L").length ?? 0;
  const femaleCount =
    filteredPatients?.filter((p: Pasien) => p.jenisKelamin === "P").length ?? 0;

  const { total, male, female, aura } = useSpring({
    from: { total: 0, male: 0, female: 0, aura: 0 },
    to: {
      total: totalCount,
      male: maleCount,
      female: femaleCount,
      aura: totalCount,
    },
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

  const insightText = "💤 Belum ada insight. Tambahkan data atau ubah filter.";

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(t);
  }, [filteredPatients]);

  return (
    <div className="w-full jarvis-glass flex flex-col gap-3 p-4 rounded-xl border border-cyan-700/40 shadow-[0_0_15px_rgba(0,255,255,0.1)] backdrop-blur-md relative">
      <div className="w-full flex flex-wrap justify-between items-center gap-3">
        {/* 🔹 Search + Filter + Export + Insight + Reload */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          <div className="flex items-center gap-2 flex-grow md:w-64">
            <Search className="text-cyan-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama / No. RM..."
              className="w-full bg-transparent border-b border-cyan-700 text-cyan-200 placeholder-cyan-600 outline-none px-2 pb-1 text-sm focus:border-yellow-400 transition-all"
              value={filters.search}
              onChange={(e) =>
                setFilters((f: any) => ({ ...f, search: e.target.value }))
              }
            />
          </div>

          <select
            value={filters.pembiayaan}
            onChange={(e) =>
              setFilters((f: any) => ({ ...f, pembiayaan: e.target.value }))
            }
            className="bg-transparent border border-cyan-700 text-cyan-200 rounded-md px-2 py-1 text-sm focus:border-yellow-400 transition"
          >
            <option value="Semua">Semua Pembiayaan</option>
            <option value="BPJS">BPJS</option>
            <option value="Umum">Umum</option>
            <option value="Asuransi">Asuransi</option>
          </select>

          <select
            value={filters.kelas}
            onChange={(e) =>
              setFilters((f: any) => ({ ...f, kelas: e.target.value }))
            }
            className="bg-transparent border border-cyan-700 text-cyan-200 rounded-md px-2 py-1 text-sm focus:border-yellow-400 transition"
          >
            <option value="Semua">Semua Kelas</option>
            <option value="Kelas 1">Kelas 1</option>
            <option value="Kelas 2">Kelas 2</option>
            <option value="Kelas 3">Kelas 3</option>
          </select>

          <button
            onClick={handleResetFilter}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-cyan-700 text-cyan-300 hover:text-yellow-400 hover:border-yellow-400 transition"
          >
            <RotateCcw size={14} />
            Reset
          </button>

          <ExportButton type="pasien" data={paginatedPatients} />

          <button
            onClick={() => setShowInsight((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border ${
              showInsight
                ? "border-yellow-400 text-yellow-400"
                : "border-cyan-700 text-cyan-300 hover:text-yellow-400 hover:border-yellow-400"
            } transition`}
          >
            <Sparkles size={14} />
            Insight
          </button>
        </div>

        {/* 🔸 Statistik + Tombol Tambah */}
        <div className="flex items-center gap-4 justify-end flex-wrap">
          <animated.div
            style={glowStyle}
            className="flex flex-col items-center md:items-start gap-1 px-3 py-2 rounded-lg border transition-all duration-300 shadow-lg min-w-[160px]"
          >
            <div className="flex items-center gap-2">
              <People size={16} className="text-cyan-400" />
              <span className="text-cyan-400">Total Pasien:</span>
              {isLoading ? (
                <div className="animate-pulse bg-cyan-900/20 rounded-md h-4 w-10" />
              ) : (
                <animated.span className="text-yellow-400 font-bold text-base">
                  {total.to((n) => `${Math.floor(n)}`)}
                </animated.span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-cyan-400">
              <div className="flex items-center gap-1">
                <PersonStanding className="text-cyan-300" size={13} />
                <animated.span className="text-yellow-300">
                  {male.to((n) => `${Math.floor(n)} L`)}
                </animated.span>
              </div>
              <div className="flex items-center gap-1">
                <PersonStandingDress className="text-pink-300" size={13} />
                <animated.span className="text-pink-300">
                  {female.to((n) => `${Math.floor(n)} P`)}
                </animated.span>
              </div>
            </div>
          </animated.div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1 px-4 py-2 rounded-md bg-gradient-to-b from-yellow-400 to-yellow-600 text-black font-semibold hover:from-yellow-300 hover:to-yellow-500 shadow-[0_0_10px_rgba(255,215,0,0.5)] transition"
          >
            <Plus size={16} />
            Tambah Pasien
          </button>
        </div>
      </div>

      <AnimateInsight show={showInsight} insightText={insightText} />

      <div className="absolute bottom-[-1.5rem] right-2 flex items-center gap-1 text-[11px] text-cyan-400">
        <Clock size={12} className="text-yellow-400" />
        <span>Sinkron terakhir: </span>
        <span className="text-yellow-400 font-semibold">{lastSynced}</span>
      </div>
    </div>
  );
}

/* ✨ Komponen animasi Insight */
function AnimateInsight({
  show,
  insightText,
}: {
  show: boolean;
  insightText: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={
        show
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 15, scale: 0.95 }
      }
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`absolute top-[4.5rem] left-0 right-0 mx-auto w-fit px-4 py-2 text-[11px] text-cyan-100 rounded-lg bg-gradient-to-r from-cyan-900/70 to-gray-900/80 border border-yellow-400/30 shadow-[0_0_25px_rgba(255,215,0,0.25)] backdrop-blur-md ${
        show ? "visible" : "invisible"
      }`}
    >
      {insightText}
    </motion.div>
  );
}
