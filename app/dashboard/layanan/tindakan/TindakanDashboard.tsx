"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useTindakanStats } from "./hooks/useTindakanStats";
import { useTindakanRealtime } from "./hooks/useTindakanRealtime";
import TindakanHeader from "./components/TindakanHeader";
import TindakanSummary from "./components/TindakanSummary";
import TindakanTable from "./components/TindakanTable";

import DiagnosticsHUD from "@/app/dashboard/ui/DiagnosticsHUD";

/** 💠 TindakanDashboard v8.5.1 — Toolbar & Charts Removed */
export default function TindakanDashboard() {
  const { show } = useNotification();
  const { stats, refreshStats, loading } = useTindakanStats();
  const { eventCount } = useTindakanRealtime();

  const hasMounted = useRef(false);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const scrollAnchor = useRef<number>(0);
  const [isLive, setIsLive] = useState(false);

  /** 🔄 Refresh awal */
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      refreshStats();
      setIsLive(true);
    }
  }, [refreshStats]);

  /** 🧠 Realtime listener + fokus ke data baru */
  useEffect(() => {
    if (eventCount > 0) {
      show({
        type: "info",
        message: `Realtime update: ${eventCount} event${
          eventCount > 1 ? "s" : ""
        } baru`,
        duration: 2500,
      });
      refreshStats();

      if (tableRef.current) {
        tableRef.current.scrollTo({
          top: tableRef.current.scrollHeight,
          behavior: "smooth",
        });
      }

      setIsLive(true);
      const t = setTimeout(() => setIsLive(false), 2500);
      return () => clearTimeout(t);
    }
  }, [eventCount, show, refreshStats]);

  /** 💾 Refresh manual dengan posisi scroll terjaga (masih dipakai internal) */
  const handleRefreshWithAnchor = async () => {
    if (tableRef.current) scrollAnchor.current = tableRef.current.scrollTop;
    await refreshStats();
    requestAnimationFrame(() => {
      if (tableRef.current) {
        tableRef.current.scrollTo({
          top: scrollAnchor.current,
          behavior: "smooth",
        });
      }
    });
  };

  /** Smooth fade */
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div
      key="tindakan-dashboard"
      className="relative min-h-screen bg-gradient-to-br from-black via-gray-900 to-cyan-950 text-white overflow-hidden"
    >
      {/* ✴️ HEADER */}
      <motion.header
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="sticky top-0 z-30 backdrop-blur-md bg-black/40 border-b border-cyan-900/40 p-6"
      >
        <div className="space-y-2">
          <TindakanHeader />
          <div className="text-xs font-mono text-cyan-400/80">v8.5.1</div>
        </div>
      </motion.header>

      {/* 🌌 KONTEN UTAMA */}
      <main className="relative overflow-y-auto max-h-[calc(100vh-160px)] px-6 pt-6 pb-28 space-y-10 scrollbar-thin scrollbar-thumb-cyan-800/60 scrollbar-track-transparent">
        {/* 🧩 Summary tetap */}
        <section>
          <TindakanSummary stats={stats} loading={loading} />
        </section>

        {/* 🧾 Tabel */}
        <section
          ref={tableRef}
          className="relative rounded-xl border border-cyan-900/50 bg-black/30 backdrop-blur-md shadow-inner shadow-cyan-900/20 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-cyan-800/60 scrollbar-track-transparent"
          id="tindakan-table-section"
        >
          {/* 🔴 LIVE Indicator */}
          <div className="absolute top-3 right-4 flex items-center gap-2 z-20">
            <div
              className={`w-3 h-3 rounded-full ${
                isLive ? "bg-cyan-400 animate-pulse" : "bg-gray-600"
              }`}
            />
            <span
              className={`text-xs font-mono ${
                isLive ? "text-cyan-300" : "text-gray-500"
              }`}
            >
              {isLive ? "LIVE" : "IDLE"}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <TindakanTable />
          </AnimatePresence>
        </section>
      </main>

      {/* 🧠 DiagnosticsHUD */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6, duration: 0.6 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <DiagnosticsHUD />
      </motion.div>
    </div>
  );
}
