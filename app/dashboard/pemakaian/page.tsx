"use client";

import { motion } from "framer-motion";
import { ClipboardList, Box, Activity } from "lucide-react";

/*───────────────────────────────────────────────
 ⚙️ PemakaianPage – Cathlab JARVIS Mode v3.1
───────────────────────────────────────────────*/
export default function PemakaianPage() {
  return (
    <div className="p-6 text-cyan-200 space-y-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-2"
      >
        <ClipboardList size={28} className="text-[#D4AF37]" />
        <h1 className="text-2xl font-bold text-[#D4AF37] drop-shadow-[0_0_6px_#00ffff]">
          Data Pemakaian Alkes
        </h1>
      </motion.div>

      {/* ── Statistik Ringkas ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: <Box size={22} className="text-[#D4AF37]" />,
            title: "Total Item Terpakai Hari Ini",
            value: "34",
            color: "text-white",
          },
          {
            icon: <Activity size={22} className="text-[#D4AF37]" />,
            title: "Stent Baru",
            value: "12",
            color: "text-emerald-300",
          },
          {
            icon: <Activity size={22} className="text-[#D4AF37]" />,
            title: "Reuse Item",
            value: "5",
            color: "text-rose-300",
          },
        ].map((c, i) => (
          <motion.div
            key={i}
            animate={{
              boxShadow: [
                "0 0 10px rgba(212,175,55,0.25), 0 0 20px rgba(0,224,255,0.1)",
                "0 0 18px rgba(212,175,55,0.45), 0 0 25px rgba(0,224,255,0.2)",
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="bg-gradient-to-br from-[#0B0F15]/95 to-[#101A24]/95 border border-[#D4AF37]/70 rounded-2xl p-4 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              {c.icon}
              <div>
                <h3 className="text-lg font-semibold text-[#D4AF37]">
                  {c.title}
                </h3>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Placeholder Konten Dinamis ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-br from-[#0B0F15]/90 to-[#111B26]/90 border border-[#D4AF37]/70 rounded-2xl p-5 backdrop-blur-md"
      >
        <p className="text-sm text-cyan-300/80">
          Modul ini akan menampilkan data pemakaian alat kesehatan pasien,
          terhubung dengan sheet{" "}
          <span className="text-[#D4AF37]">PEMAKAIAN</span> dan
          <span className="text-[#D4AF37]"> MASTER</span>. Fitur berikut sedang
          disiapkan:
        </p>
        <ul className="list-disc list-inside mt-3 space-y-1 text-cyan-200/90">
          <li>Pencatatan otomatis berdasarkan pasien aktif</li>
          <li>Validasi stok reuse vs baru</li>
          <li>Rekomendasi pengadaan berdasarkan frekuensi pemakaian</li>
          <li>Grafik harian pemakaian alkes</li>
        </ul>
      </motion.div>
    </div>
  );
}
