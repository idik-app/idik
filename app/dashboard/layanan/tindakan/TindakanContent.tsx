"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ToolbarTindakan, SummaryCards, TindakanTable } from "./components";
import DiagnosticsHUD from "@/components/DiagnosticsHUD";
import { useTindakanBridgeAdapter } from "./bridge/useTindakanBridgeAdapter";

/** 💠 TindakanContent v7.0 — Cathlab JARVIS Gold-Cyan Hybrid */
export default function TindakanContent() {
  const adapter = useTindakanBridgeAdapter();
  const [isLoading, setIsLoading] = useState(false);
  const onRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.resolve();
      void adapter.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-x-hidden bg-gradient-to-br from-black via-gray-900 to-cyan-950 px-3 py-3 sm:px-4 sm:py-4 md:gap-4 md:p-4"
    >
      {/* 🩺 Toolbar Aksi */}
      <ToolbarTindakan onRefresh={onRefresh} isLoading={isLoading} />

      {/* 📊 Ringkasan Tindakan */}
      <SummaryCards />

      {/* 📋 Spreadsheet View — isi sisa tinggi area tab */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TindakanTable adapter={adapter} />
      </div>

      {/* 🧠 Diagnostics HUD */}
      <DiagnosticsHUD module="Tindakan" />
    </motion.div>
  );
}
