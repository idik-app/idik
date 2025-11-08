"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function PasienDrawerDetail({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
          className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-gradient-to-br from-gray-950 via-gray-900 to-cyan-950 border-l border-cyan-800/40 shadow-[0_0_30px_rgba(0,255,255,0.15)] z-50 backdrop-blur-lg p-6 overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-yellow-400">
              Detail Pasien
            </h2>
            <button
              onClick={onClose}
              className="text-cyan-300 hover:text-yellow-400 transition-colors"
            >
              <X size={22} />
            </button>
          </div>

          {/* Profil Singkat */}
          <div className="space-y-2 mb-4">
            <p>
              <span className="text-gray-400">Nama:</span> Ahmad Fauzi
            </p>
            <p>
              <span className="text-gray-400">No. RM:</span> 1003
            </p>
            <p>
              <span className="text-gray-400">Jenis Kelamin:</span> L
            </p>
            <p>
              <span className="text-gray-400">Tanggal Lahir:</span> 12-05-1980
            </p>
            <p>
              <span className="text-gray-400">Alamat:</span> Sidoarjo
            </p>
            <p>
              <span className="text-gray-400">Jenis Pembiayaan:</span> Umum
            </p>
            <p>
              <span className="text-gray-400">Kelas:</span> Kelas 2
            </p>
          </div>

          {/* Riwayat singkat */}
          <div className="mt-6 border-t border-cyan-800/40 pt-4">
            <h3 className="text-yellow-400 font-medium mb-2">
              Riwayat Tindakan
            </h3>
            <ul className="space-y-1 text-sm text-cyan-100">
              <li>15-04-2024 — Angiografi</li>
              <li>22-06-2024 — Stenting LAD</li>
            </ul>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
