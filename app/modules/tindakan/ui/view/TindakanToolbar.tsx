"use client";
import React from "react";
import { motion } from "framer-motion";
import { RefreshCcw, Plus, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTindakanCrud } from "../../hooks/useTindakanCrud";
import { useTindakanFilter } from "../../hooks/useTindakanFilter";
import { useNotification } from "@/app/contexts/NotificationContext";

/** ⚡ TindakanToolbar v6.6 — Cathlab JARVIS Gold-Cyan Hybrid */
export function TindakanToolbar() {
  const { openAddModal, refreshData } = useTindakanCrud();
  const { toggleFilter } = useTindakanFilter();
  const { show } = useNotification();

  const handleExport = () => {
    show("📤 Ekspor tindakan: hubungkan ke backend untuk file unduhan.", "info");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-wrap justify-between items-center gap-3 p-4
                 bg-gradient-to-r from-gray-900/80 via-cyan-900/30 to-gray-900/80
                 border border-cyan-800/40 rounded-2xl shadow-lg shadow-cyan-900/10"
    >
      {/* === Judul Kiri === */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg md:text-xl font-semibold text-cyan-300 tracking-wide">
          Tindakan Medis
        </h2>
        <span className="text-xs text-cyan-500/70 mt-1">v6.6</span>
      </div>

      {/* === Tombol Aksi === */}
      <div className="flex items-center gap-2">
        <Button
          onClick={openAddModal}
          className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-black font-semibold hover:opacity-90"
        >
          <Plus size={16} className="mr-1" /> Tambah
        </Button>

        <Button
          variant="outline"
          onClick={toggleFilter}
          className="border-cyan-700 text-cyan-300 hover:bg-cyan-800/40"
        >
          <Filter size={16} className="mr-1" /> Filter
        </Button>

        <Button
          variant="outline"
          onClick={refreshData}
          className="border-cyan-700 text-cyan-300 hover:bg-cyan-800/40"
        >
          <RefreshCcw size={16} className="mr-1" /> Refresh
        </Button>

        <Button
          variant="outline"
          onClick={handleExport}
          className="border-cyan-700 text-cyan-300 hover:bg-cyan-800/40"
        >
          <Download size={16} className="mr-1" /> Export
        </Button>
      </div>
    </motion.div>
  );
}
