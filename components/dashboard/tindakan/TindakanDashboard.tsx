"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useTindakanStats } from "@/modules/tindakan/hooks/useTindakanStats";
import { useTindakanRealtime } from "@/modules/tindakan/hooks/useTindakanRealtime";

import TindakanHeader from "@/components/TindakanHeader";
import TindakanToolbar from "@/components/TindakanToolbar";
import TindakanSummary from "./components/TindakanSummary";
import TindakanChart from "@/app/dashboard/layanan/tindakan/components/TindakanChart";
import TindakanTable from "@/modules/tindakan/ui/table/TindakanTable";
import TindakanHUD from "./components/TindakanHUD";
import "./styles/tindakanLayout.css";

/** 💠 TindakanDashboard v7.2 — Scroll Adaptive Layout (Gold-Cyan Hybrid) */
export default function TindakanDashboard() {
  const { show } = useNotification();
  const { stats, refreshStats, loading } = useTindakanStats();
  const { eventCount } = useTindakanRealtime();
  const hasMounted = useRef(false);

  /** 🔄 Refresh otomatis saat pertama kali mount */
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      refreshStats();
    }
  }, [refreshStats]);

  /** 🧠 Update otomatis jika ada event realtime dari Supabase */
  useEffect(() => {
    if (eventCount > 0) {
      show(`Realtime update: ${eventCount} event baru`);
      refreshStats();
    }
  }, [eventCount, show, refreshStats]);

  /** 🎞️ Animasi container & fadeUp motion variants */
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.25,
        delayChildren: 0.25,
        ease: "easeOut",
      },
    },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <motion.div
      key="tindakan-dashboard"
      variants={container}
      initial="hidden"
      animate="show"
      className="relative min-h-screen bg-gradient-to-br from-black via-gray-900 to-cyan-950 text-white overflow-hidden"
    >
      {/* ✴️ HEADER (sticky) */}
      <motion.header
        variants={fadeUp}
        className="sticky top-0 z-30 backdrop-blur-md bg-black/40 border-b border-cyan-900/40 p-6"
      >
        <TindakanHeader />
        <div className="mt-4">
          <TindakanToolbar onRefresh={refreshStats} isLoading={loading} />
        </div>
      </motion.header>

      {/* 🌌 AREA KONTEN UTAMA (scroll mandiri) */}
      <motion.main
        variants={fadeUp}
        className="relative overflow-y-auto max-h-[calc(100vh-160px)] px-6 pt-6 pb-28 space-y-10 scrollbar-thin scrollbar-thumb-cyan-800/60 scrollbar-track-transparent"
      >
        {/* 📊 SUMMARY */}
        <section>
          <TindakanSummary stats={stats} loading={loading} />
        </section>

        {/* 📈 CHART */}
        <section className="grid md:grid-cols-2 gap-6">
          <TindakanChart />
        </section>

        {/* 🧾 TABLE */}
        <section>
          <AnimatePresence mode="wait">
            <TindakanTable />
          </AnimatePresence>
        </section>
      </motion.main>

      {/* 🧠 DIAGNOSTICS HUD (fixed) */}
      <TindakanHUD />
    </motion.div>
  );
}
