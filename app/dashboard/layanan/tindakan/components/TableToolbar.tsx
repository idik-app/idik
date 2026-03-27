"use client";
import { useState, useEffect, useRef } from "react";
import {
  Filter,
  Download,
  Search,
  Clock,
  Wifi,
  Activity,
  Plus,
} from "lucide-react";
import type { Pasien } from "@/app/dashboard/pasien/types/pasien";
import TambahPasienQuickModal from "./TambahPasienQuickModal";

interface Props {
  onRefresh?: () => Promise<void> | void;
  onCreateDraftForPasien?: (p: {
    pasienId: string;
    rm: string;
    nama: string;
  }) => Promise<void> | void;
  onSearch: (val: string) => void;
  onFilter: (
    dokter: string,
    status: string,
    tanggalFrom?: string,
    tanggalTo?: string,
  ) => void;
  onExport: () => void;
  dokterOptions: string[];
  statusOptions: string[];
  /** 🔔 Jumlah event realtime dari Supabase */
  eventCount?: number;
}

export default function TableToolbar({
  onRefresh,
  onCreateDraftForPasien,
  onSearch,
  onFilter,
  onExport,
  dokterOptions,
  statusOptions,
  eventCount = 0,
}: Props) {
  type Mode = "LIVE" | "AUTO" | "THROTTLED" | "MANUAL" | "IDLE";
  const [dokter, setDokter] = useState("");
  const [status, setStatus] = useState("");
  const [tanggalFrom, setTanggalFrom] = useState("");
  const [tanggalTo, setTanggalTo] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [mode, setMode] = useState<Mode>("AUTO");
  const [trafficCount, setTrafficCount] = useState(0);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [addPasienOpen, setAddPasienOpen] = useState(false);

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSavedPasien = async (patient: Pasien) => {
    const pasienId = String(patient.id ?? "").trim();
    const rm = String(patient.noRM ?? "").trim();
    const nama = String(patient.nama ?? "").trim();
    if (typeof onCreateDraftForPasien === "function") {
      await onCreateDraftForPasien({ pasienId, rm, nama });
    }
    await Promise.resolve(typeof onRefresh === "function" ? onRefresh() : undefined);
  };

  /** 🧩 Terapkan Filter */
  const handleFilter = () => onFilter(dokter, status, tanggalFrom, tanggalTo);

  /** ⏱ Adaptive timer */
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        // Pause auto-refresh saat user aktif mengetik/search.
        if (isUserTyping) return prev;
        if (prev <= 1) {
          // Never call parent setters (onSearch/onFilter) inside a setState updater —
          // React treats that as updating TindakanTable during TableToolbar's update.
          queueMicrotask(() => {
            setIsRefreshing(true);
            setMode("AUTO");
            Promise.resolve(
              typeof onRefresh === "function" ? onRefresh() : undefined,
            )
              .catch((err) => {
                console.error("[TableToolbar] Refresh error:", err);
              })
              .finally(() => {
                setLastUpdated(new Date());
                setCountdown(mode === "THROTTLED" ? 30 : 60);
                setTimeout(() => setIsRefreshing(false), 800);
              });
          });
          return mode === "THROTTLED" ? 30 : 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isUserTyping, mode, onRefresh]);

  /** 🧠 Realtime event adaptif */
  useEffect(() => {
    if (eventCount > 0) {
      setTrafficCount((c) => c + 1);
      if (trafficCount >= 3) {
        // lalu lintas tinggi, throttle refresh
        setMode("THROTTLED");
        if (!throttleTimeout.current) {
          throttleTimeout.current = setTimeout(() => {
            setTrafficCount(0);
            setMode("AUTO");
            throttleTimeout.current = null;
          }, 10000);
        }
      } else {
        if (!isRefreshing && mode !== "THROTTLED") {
          setIsRefreshing(true);
          setMode("LIVE");
          Promise.resolve(
            typeof onRefresh === "function" ? onRefresh() : undefined,
          )
            .catch((err) => {
              console.error("[TableToolbar] Refresh error:", err);
            })
            .finally(() => {
              setLastUpdated(new Date());
              setCountdown(60);
              setTimeout(() => setIsRefreshing(false), 800);
            });
        }
      }
    } else if (trafficCount === 0 && mode !== "AUTO") {
      setMode("AUTO");
    }
  }, [eventCount, isRefreshing, mode, onRefresh, trafficCount]);

  /** ⏸ Pause auto-refresh ketika mengetik */
  const handleUserTyping = (val: string) => {
    setSearchValue(val);
    onSearch(val);
    setIsUserTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setIsUserTyping(false);
    }, 10000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (throttleTimeout.current) clearTimeout(throttleTimeout.current);
    };
  }, []);

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString("id-ID", { hour12: false })
    : null;

  return (
    <div className="flex flex-col gap-3 px-6 py-3 bg-black/40 border-b border-cyan-800/40 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-cyan-300 font-semibold tracking-wide flex items-center gap-2 flex-wrap">
            <Activity size={15} className="text-cyan-400 shrink-0" />
            <span>Daftar kasus tindakan</span>
          </h3>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <button
          type="button"
          onClick={() => setAddPasienOpen(true)}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-md border border-cyan-500/30 px-3 text-xs text-cyan-200/90 hover:text-cyan-100 hover:bg-cyan-900/30 transition"
          title="Tambah pasien (tanpa pindah halaman)"
        >
          <Plus size={14} />
          <span>Tambah Pasien</span>
        </button>

        {/* 🔍 Search — selaras wireframe: cari di semua sel baris */}
        <div className="relative ml-auto flex-1 min-w-[min(100%,14rem)] max-w-md">
          <Search
            size={14}
            className="absolute left-2 top-2.5 text-cyan-400 opacity-70"
          />
          <input
            type="text"
            value={searchValue}
            placeholder="Cari di semua kolom (RM, nama, dokter, tindakan, status…)"
            disabled={isRefreshing}
            onChange={(e) => handleUserTyping(e.target.value)}
            className={`w-full pl-7 pr-3 py-1.5 text-sm rounded-md bg-black/40 border border-cyan-800/40 text-cyan-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
              isRefreshing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
        </div>

        {/* Filter dokter — domain tab Dokter & tim (wireframe) */}
        <select
          value={dokter}
          onChange={(e) => {
            const v = e.target.value;
            setDokter(v);
            onFilter(v, status, tanggalFrom, tanggalTo);
          }}
          disabled={isRefreshing}
          className="text-sm px-2 py-1.5 rounded-md bg-black/40 border border-cyan-800/40 text-cyan-100 focus:outline-none min-w-[9rem]"
        >
          <option value="">Semua dokter</option>
          {dokterOptions.map((d, idx) => (
            <option key={idx} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Filter status — domain tab Sesi & biaya (wireframe) */}
        <select
          value={status}
          onChange={(e) => {
            const v = e.target.value;
            setStatus(v);
            onFilter(dokter, v, tanggalFrom, tanggalTo);
          }}
          disabled={isRefreshing}
          className="text-sm px-2 py-1.5 rounded-md bg-black/40 border border-cyan-800/40 text-cyan-100 focus:outline-none min-w-[9rem]"
        >
          <option value="">Semua status</option>
          {statusOptions.map((s, idx) => (
            <option key={idx} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* 📅 Filter tanggal (range) */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={tanggalFrom}
            onChange={(e) => {
              const v = e.target.value;
              setTanggalFrom(v);
              onFilter(dokter, status, v, tanggalTo);
            }}
            disabled={isRefreshing}
            className="text-sm px-2 py-1.5 rounded-md bg-black/40 border border-cyan-800/40 text-cyan-100 focus:outline-none"
            title="Tanggal dari"
            aria-label="Tanggal dari"
          />
          <span className="text-cyan-600/80 text-xs font-mono">—</span>
          <input
            type="date"
            value={tanggalTo}
            onChange={(e) => {
              const v = e.target.value;
              setTanggalTo(v);
              onFilter(dokter, status, tanggalFrom, v);
            }}
            disabled={isRefreshing}
            className="text-sm px-2 py-1.5 rounded-md bg-black/40 border border-cyan-800/40 text-cyan-100 focus:outline-none"
            title="Tanggal sampai"
            aria-label="Tanggal sampai"
          />
        </div>

        {/* 🎯 Terapkan ulang (sinkron jika state eksternal) */}
        <button
          type="button"
          onClick={handleFilter}
          disabled={isRefreshing}
          className="p-2 rounded-md border border-cyan-700/40 hover:bg-cyan-900/50 text-cyan-400 transition"
          title="Terapkan filter dokter & status"
        >
          <Filter size={16} />
        </button>

        {/* ⬇️ Export CSV */}
        <button
          onClick={onExport}
          disabled={isRefreshing}
          className="p-2 rounded-md border border-cyan-700/40 hover:bg-cyan-900/50 text-cyan-400 transition"
          title="Export CSV"
        >
          <Download size={16} />
        </button>

        {/* 🕒 Info + Status */}
        <div className="flex items-center gap-2 text-xs text-cyan-400 ml-0 sm:ml-2 opacity-80 flex-wrap">
          <Clock size={12} />
          <span>
            {formattedTime ? `Terakhir: ${formattedTime}` : "Belum ada data"}
          </span>
          <span className="text-cyan-300 font-mono">• {countdown}s</span>

          {/* Dynamic Mode Status */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border ${
              mode === "LIVE"
                ? "text-emerald-400 border-emerald-600 bg-emerald-900/20"
                : mode === "AUTO"
                  ? "text-cyan-300 border-cyan-700 bg-cyan-900/20"
                  : mode === "THROTTLED"
                    ? "text-amber-400 border-amber-600 bg-amber-900/20"
                    : mode === "MANUAL"
                      ? "text-sky-300 border-sky-700 bg-sky-900/20"
                      : "text-gray-400 border-gray-600 bg-gray-900/20"
            }`}
          >
            <Wifi size={10} />
            {mode}
          </div>
        </div>
      </div>

      <TambahPasienQuickModal
        open={addPasienOpen}
        onClose={() => setAddPasienOpen(false)}
        onSaved={handleSavedPasien}
      />
    </div>
  );
}
