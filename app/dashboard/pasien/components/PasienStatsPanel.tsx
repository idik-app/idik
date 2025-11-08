"use client";
import { motion } from "framer-motion";
import PasienToolbar from "../components/PasienToolbar";
import PasienTable from "../components/PasienTable";
import PasienStatsPanel from "../components/PasienStatsPanel";
import { PasienProvider } from "../contexts/PasienContext";
import { Button } from "@/components/ui/button";
import { UserPlus2 } from "lucide-react";

/* ---------------------------------------------------------
   🧠 Halaman Utama Pasien v5.1
   Dengan Panel Statistik + Toolbar + Tabel + Integrasi AI
---------------------------------------------------------- */

export default function PasienPage() {
  return (
    <PasienProvider>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-cyan-950 p-6 space-y-6"
      >
        {/* 🔹 Header Atas */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <h1 className="text-2xl font-bold text-yellow-400 tracking-wide">
            🧾 Biodata Pasien
          </h1>

          {/* Tombol Tambah Pasien tetap di kanan */}
          <Button
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold 
                       hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg"
          >
            <UserPlus2 className="mr-2 h-4 w-4" />
            Tambah Pasien
          </Button>
        </div>

        {/* 🔸 Panel Statistik (menggantikan tombol atas lama) */}
        <PasienStatsPanel />

        {/* 🔹 Toolbar Filter & Insight */}
        <PasienToolbar />

        {/* 🔹 Tabel Data Pasien */}
        <PasienTable />
      </motion.div>
    </PasienProvider>
  );
}
