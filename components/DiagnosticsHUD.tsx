"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/* -------------------------------------------------------------
   🧠 DiagnosticsHUD v4.4 – Stabil & Non-Overlapping
   Dapat digunakan di semua modul (Pasien, Dokter, Inventaris, dll)
-------------------------------------------------------------- */

interface DiagnosticsHUDProps {
  module: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  accent?: "gold-cyan" | "cyan-only";
}

export default function DiagnosticsHUD({
  module,
  position = "bottom-right",
  accent = "gold-cyan",
}: DiagnosticsHUDProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [events, setEvents] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>("–");

  // 🧩 Optional context fallback
  let stats: any = {};
  let insight: string | null = null;
  try {
    const {
      usePasien,
    } = require("@/app/dashboard/pasien/contexts/PasienContext");
    const pasienCtx = usePasien();
    stats = pasienCtx.stats;
    insight = pasienCtx.insight;
  } catch {
    /* abaikan untuk modul lain */
  }

  // 📡 Status koneksi
  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  // 🔄 Realtime listener
  useEffect(() => {
    const handler = () => {
      setEvents((e) => e + 1);
      setLastUpdate(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    window.addEventListener("jarvis-realtime", handler);
    return () => window.removeEventListener("jarvis-realtime", handler);
  }, []);

  // 📍 Posisi fleksibel
  const posClass =
    position === "bottom-left"
      ? "bottom-6 left-6"
      : position === "top-right"
      ? "top-6 right-6"
      : position === "top-left"
      ? "top-6 left-6"
      : "bottom-6 right-6";

  // 🎨 Warna dinamis
  const statusColor = isOnline
    ? "bg-green-400 shadow-[0_0_6px_#22c55e]"
    : "bg-red-500 shadow-[0_0_6px_#ef4444]";

  const accentBorder =
    accent === "gold-cyan"
      ? "border-cyan-400/40 hover:border-yellow-400/40"
      : "border-cyan-400/40 hover:border-cyan-300";

  const accentGlow =
    accent === "gold-cyan"
      ? "shadow-[0_0_20px_rgba(255,215,0,0.25)]"
      : "shadow-[0_0_15px_rgba(0,255,255,0.3)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed ${posClass} z-40 px-4 py-3 rounded-xl
                  backdrop-blur-md border ${accentBorder}
                  bg-gradient-to-r from-gray-950/80 via-cyan-900/40 to-black/70
                  ${accentGlow}
                  text-cyan-300 text-[11px] font-mono tracking-tight
                  pointer-events-none select-none`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-yellow-400">{module}</span>
        <motion.span
          className={`ml-2 w-2.5 h-2.5 rounded-full ${statusColor}`}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        />
      </div>

      {/* Data Realtime */}
      <div className="flex justify-between">
        <span>Events</span>
        <span>{events}</span>
      </div>
      <div className="flex justify-between">
        <span>Last</span>
        <span>{lastUpdate}</span>
      </div>

      {/* Statistik Pasien (opsional) */}
      {stats?.total !== undefined && (
        <>
          <div className="border-t border-cyan-700/30 my-1" />
          <div className="flex justify-between">
            <span>Total</span>
            <span>{stats.total}</span>
          </div>
          <div className="flex justify-between">
            <span>Hari Ini</span>
            <span>{stats.hariIni}</span>
          </div>
        </>
      )}

      {/* Insight singkat */}
      {insight && (
        <div className="mt-1 text-[10px] text-cyan-400/90 italic leading-snug">
          💡 {insight.length > 80 ? `${insight.slice(0, 80)}…` : insight}
        </div>
      )}
    </motion.div>
  );
}
