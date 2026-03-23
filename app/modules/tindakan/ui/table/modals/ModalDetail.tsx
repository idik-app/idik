"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/**
 * 💠 ModalDetail v7.1 — Cathlab JARVIS Gold-Cyan Hybrid
 * ----------------------------------------------
 * - Menampilkan detail lengkap tindakan Cathlab
 * - Efek hologram transparan
 * - Smooth open/close animation
 */

export default function ModalDetail({
  isOpen,
  onClose,
  data,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      >
        {/* Panel Utama */}
        <motion.div
          key="modal-detail"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative w-full max-w-2xl rounded-2xl border border-cyan-700/50 bg-gradient-to-br from-black/60 via-gray-900/80 to-cyan-950/50 shadow-[0_0_20px_rgba(0,255,255,0.2)] text-gray-200 p-6 overflow-hidden"
        >
          {/* Garis Scan */}
          <motion.div
            animate={{ x: ["0%", "100%"] }}
            transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60"
          />

          {/* Tombol Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-cyan-950/60 transition-colors"
          >
            <X className="w-5 h-5 text-cyan-300 hover:text-gold-400 transition-colors" />
          </button>

          {/* Judul */}
          <div className="mb-4 border-b border-cyan-900/40 pb-3">
            <h2 className="text-xl font-semibold text-cyan-300 drop-shadow-[0_0_8px_#00ffff88]">
              Detail Tindakan Cathlab
            </h2>
            <p className="text-sm text-gray-400">
              Data pasien dan tindakan lengkap
            </p>
          </div>

          {/* Isi Detail */}
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <DetailItem label="Tanggal" value={data?.tanggal} />
            <DetailItem label="Nomor RM" value={data?.no_rm} />
            <DetailItem label="Nama Pasien" value={data?.nama_pasien} />
            <DetailItem label="Dokter" value={data?.dokter} />
            <DetailItem label="Tindakan" value={data?.tindakan} />
            <DetailItem label="Status" value={data?.status} />
            <DetailItem label="Waktu Mulai" value={data?.waktu_mulai ?? "-"} />
            <DetailItem
              label="Waktu Selesai"
              value={data?.waktu_selesai ?? "-"}
            />
            <DetailItem
              label="Deskripsi / Catatan"
              value={data?.catatan ?? "Tidak ada catatan."}
              span
            />
          </div>

          {/* Footer */}
          <div className="mt-6 text-right border-t border-cyan-900/40 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-cyan-700/60 text-cyan-300 hover:bg-cyan-900/40 transition-all"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Komponen kecil untuk baris detail */
function DetailItem({
  label,
  value,
  span = false,
}: {
  label: string;
  value: any;
  span?: boolean;
}) {
  return (
    <div className={`flex flex-col ${span ? "col-span-2" : ""}`}>
      <span className="text-xs text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm text-cyan-200 font-medium">{value ?? "-"}</span>
    </div>
  );
}
s;
