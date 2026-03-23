"use client";
import { useState, useEffect, useRef } from "react";
import {
  RotateCcw,
  Filter,
  Download,
  Search,
  Clock,
  Power,
  Wifi,
  Activity,
} from "lucide-react";

interface Props {
  onRefresh?: () => Promise<void> | void;
  onSearch: (val: string) => void;
  onFilter: (dokter: string, status: string) => void;
  onExport: () => void;
  dokterOptions: string[];
  statusOptions: string[];
  /** 🔔 Jumlah event realtime dari Supabase */
  eventCount?: number;
}

export default function TableToolbar({
  onRefresh,
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
  const [searchValue, setSearchValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [mode, setMode] = useState<Mode>("AUTO");
  const [trafficCount, setTrafficCount] = useState(0);

  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  /** 🧩 Terapkan Filter */
  const handleFilter = () => onFilter(dokter, status);

  /** 🔄 Refresh aman */
  const safeRefresh = async (
    source: Mode
  ) => {
    setIsRefreshing(true);
    setMode(source);
    setDokter("");
    setStatus("");
    setSearchValue("");
    onSearch("");
    onFilter("", "");
    try {
      if (typeof onRefresh === "function") await Promise.resolve(onRefresh());
    } catch (err) {
      console.error("[TableToolbar] Refresh error:", err);
    }
    setLastUpdated(new Date());
    setCountdown(source === "THROTTLED" ? 30 : 60);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  /** ⏱ Adaptive timer */
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          safeRefresh("AUTO");
          return mode === "THROTTLED" ? 30 : 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, mode]);

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
        if (!isRefreshing && mode !== "THROTTLED") safeRefresh("LIVE");
      }
    } else if (trafficCount === 0 && mode !== "AUTO") {
      setMode("AUTO");
    }
  }, [eventCount]);

  /** ⏸ Pause auto-refresh ketika mengetik */
  const handleUserTyping = (val: string) => {
    setSearchValue(val);
    onSearch(val);
    setAutoRefresh(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setAutoRefresh(true), 10000);
  };

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString("id-ID", { hour12: false })
    : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-black/40 border-b border-cyan-800/40 backdrop-blur-sm">
      <h3 className="text-cyan-300 font-semibold tracking-wide flex items-center gap-2">
        <Activity size={15} className="text-cyan-400" />
        Daftar Tindakan Cathlab
      </h3>

      <div className="flex items-center gap-3 flex-wrap">
        {/* 🔍 Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2 top-2.5 text-cyan-400 opacity-70"
          />
          <input
            type="text"
            value={searchValue}
            placeholder="Cari nama pasien..."
            disabled={isRefreshing}
            onChange={(e) => handleUserTyping(e.target.value)}
            className={`pl-7 pr-3 py-1.5 text-sm rounded-md bg-black/40 border border-cyan-800/40 text-cyan-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
              isRefreshing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
        </div>

        {/* 🧑‍⚕️ Filter Dokter */}
        <select
          value={dokter}
          onChange={(e) => setDokter(e.target.value)}
          disabled={isRefreshing}
          className="text-sm px-2 py-1.5 rounded-md bg-black/40 border border-cyan-800/40 text-cyan-100 focus:outline-none"
        >
          <option value="">Semua Dokter</option>
          {dokterOptions.map((d, idx) => (
            <option key={idx} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* 📊 Filter Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={isRefreshing}
          className="text-sm px-2 py-1.5 rounded-md bg-black/40 border border-cyan-800/40 text-cyan-100 focus:outline-none"
        >
          <option value="">Semua Status</option>
          {statusOptions.map((s, idx) => (
            <option key={idx} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* 🎯 Terapkan Filter */}
        <button
          onClick={handleFilter}
          disabled={isRefreshing}
          className="p-2 rounded-md border border-cyan-700/40 hover:bg-cyan-900/50 text-cyan-400 transition"
          title="Terapkan Filter"
        >
          <Filter size={16} />
        </button>

        {/* 🔄 Refresh manual */}
        <button
          onClick={() => safeRefresh("MANUAL")}
          disabled={isRefreshing}
          className={`p-2 rounded-md border border-cyan-700/40 text-cyan-400 transition ${
            isRefreshing
              ? "animate-spin border-cyan-400 bg-cyan-950/50 shadow-inner shadow-cyan-700/20"
              : "hover:bg-cyan-900/50"
          }`}
          title="Reset Filter & Refresh Data"
        >
          <RotateCcw size={16} />
        </button>

        {/* ⚙️ Toggle Auto Refresh */}
        <button
          onClick={() => setAutoRefresh((p) => !p)}
          className={`p-2 rounded-md border border-cyan-700/40 transition flex items-center gap-1 ${
            autoRefresh
              ? "bg-cyan-900/50 text-cyan-300 hover:bg-cyan-800/60"
              : "text-gray-400 hover:bg-gray-800/40"
          }`}
          title={
            autoRefresh ? "Matikan Auto Refresh" : "Aktifkan Auto Refresh (60s)"
          }
        >
          <Power size={14} />
          <span className="text-xs font-mono">
            {autoRefresh ? "ON" : "OFF"}
          </span>
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
        <div className="flex items-center gap-2 text-xs text-cyan-400 ml-2 opacity-80">
          <Clock size={12} />
          <span>
            {formattedTime ? `Terakhir: ${formattedTime}` : "Belum ada data"}
          </span>
          {autoRefresh && (
            <span className="text-cyan-300 font-mono">• {countdown}s</span>
          )}

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
    </div>
  );
}
