"use client";

import { motion } from "framer-motion";
import { PlusCircle } from "lucide-react";

/*───────────────────────────────────────────────
 🤖 PasienEmptyState v3.4
 Ditampilkan saat filteredPatients.length === 0
───────────────────────────────────────────────*/
export default function PasienEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-cyan-300/70 space-y-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-full p-6 bg-gradient-to-br from-cyan-900/30 to-black/60 shadow-[0_0_20px_rgba(0,255,255,0.15)]"
      >
        <PlusCircle className="w-10 h-10 text-yellow-400" />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-semibold text-yellow-300"
      >
        Belum ada data pasien sesuai filter
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-cyan-400/70"
      >
        Coba ubah kata kunci pencarian atau klik tombol{" "}
        <span className="text-yellow-400 font-medium">Tambah Pasien</span> untuk
        menambahkan data baru.
      </motion.p>
    </div>
  );
}
