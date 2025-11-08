"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

/* =========================================================
   🩺 DokterTable – Cathlab JARVIS Mode v3.8 (Gold-Cyan Hybrid)
   Fitur: Animated List + Pagination + Delete Confirmation
========================================================= */

interface DokterTableProps {
  doctors: any[];
  onDelete: (id: string) => void;
}

export default function DokterTable({ doctors, onDelete }: DokterTableProps) {
  if (!doctors || doctors.length === 0)
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-cyan-400 py-6"
      >
        🟢 Koneksi berhasil, tetapi belum ada data dokter.
      </motion.p>
    );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-x-auto rounded-xl border border-cyan-700/40 
                 bg-gradient-to-br from-cyan-900/10 to-black/60 
                 shadow-[0_0_15px_rgba(0,255,255,0.1)] backdrop-blur-md"
    >
      {/* ✨ Lapisan hologram */}
      <div
        className="absolute inset-0 bg-gradient-to-br 
                    from-[hsl(var(--cyan))/0.08] via-transparent 
                    to-[hsl(var(--gold))/0.06] blur-2xl 
                    rounded-xl pointer-events-none"
      />

      {/* Tabel Dokter */}
      <table className="relative w-full text-sm border-collapse z-10">
        <thead className="sticky top-0 bg-black/60 text-yellow-400 backdrop-blur-sm">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Nama Dokter</th>
            <th className="px-3 py-2 text-left font-medium">Spesialis</th>
            <th className="px-3 py-2 text-left font-medium">Kontak</th>
            <th className="px-3 py-2 text-center font-medium">Status</th>
            <th className="px-3 py-2 text-center font-medium">Aksi</th>
          </tr>
        </thead>

        <tbody>
          {doctors.map((d, i) => (
            <motion.tr
              key={d.id || `dokter-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="border-t border-cyan-600/20 
                         hover:bg-cyan-400/10 transition-all"
            >
              <td className="px-3 py-2">{d.nama}</td>
              <td className="px-3 py-2">{d.spesialis || "-"}</td>
              <td className="px-3 py-2">{d.kontak || "-"}</td>
              <td className="px-3 py-2 text-center">{d.badge}</td>
              <td className="px-3 py-2 text-center">
                <button
                  onClick={() => {
                    if (confirm(`Hapus dokter ${d.nama}?`)) onDelete(d.id);
                  }}
                  className="p-1.5 rounded-md border border-red-500/40 
                             text-red-400 hover:text-red-200 
                             hover:bg-red-500/10 
                             shadow-[0_0_8px_rgba(255,0,0,0.3)] transition"
                  title="Hapus dokter"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
