"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ToolbarTindakan, SummaryCards, TindakanTable } from "./components";
import DiagnosticsHUD from "@/components/DiagnosticsHUD";

/** 💠 TindakanContent v7.0 — Cathlab JARVIS Gold-Cyan Hybrid */
export default function TindakanContent() {
  const [isLoading, setIsLoading] = useState(false);
  const onRefresh = async () => {
    setIsLoading(true);
    try {
      // placeholder; implement real reload in TindakanTable hook/controller
      await Promise.resolve();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative min-h-screen bg-gradient-to-br from-black via-gray-900 to-cyan-950 px-3 py-4 sm:px-4 sm:py-5 md:p-6 space-y-4 md:space-y-6 overflow-x-hidden min-w-0"
    >
      {/* 🩺 Toolbar Aksi */}
      <ToolbarTindakan onRefresh={onRefresh} isLoading={isLoading} />

      {/* 📊 Ringkasan Tindakan */}
      <SummaryCards />

      {/* 📋 Spreadsheet View */}
      <TindakanTable />

      {/* 🧠 Diagnostics HUD */}
      <DiagnosticsHUD module="Tindakan" />
    </motion.div>
  );
}
