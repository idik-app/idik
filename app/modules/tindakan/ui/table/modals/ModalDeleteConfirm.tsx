"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useTindakanCrud } from "@/modules/tindakan/hooks/useTindakanCrud";

/**
 * 💠 ModalDeleteConfirm v7.1 — Cathlab JARVIS Gold-Cyan Hybrid
 * ------------------------------------------------------------
 * - Konfirmasi penghapusan tindakan
 * - Efek glow & transparansi hologram
 * - Animasi lembut + notifikasi realtime
 */

export default function ModalDeleteConfirm({
  isOpen,
  onClose,
  data,
}: {
  isOpen: boolean;
  onClose: () => void;
  data?: any;
}) {
  const { deleteTindakan } = useTindakanCrud();
  const { show } = useNotification();

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!data?.id) return;
    const result = await deleteTindakan(data.id);
    if (result === "ok") {
      show(`🗑️ Data tindakan ${data.nama_pasien ?? ""} dihapus`);
      onClose();
    } else {
      show("⚠️ Gagal menghapus data tindakan");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      >
        <motion.div
          key="modal-delete"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 8 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative w-full max-w-md rounded-2xl border border-red-700/40 bg-gradient-to-br from-black/60 via-gray-900/80 to-red-950/40 shadow-[0_0_20px_rgba(255,100,100,0.25)] p-6 text-gray-200"
        >
          {/* Tombol Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-red-950/60 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-red-400 transition-colors" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4 border-b border-red-900/40 pb-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h2 className="text-lg font-semibold text-red-300 drop-shadow-[0_0_6px_#ff5555aa]">
              Konfirmasi Hapus
            </h2>
          </div>

          {/* Isi */}
          <p className="text-sm text-gray-300 mb-4">
            Apakah Anda yakin ingin menghapus tindakan berikut?
          </p>

          <div className="rounded-md bg-black/30 border border-red-900/40 px-4 py-3 text-sm">
            <p>
              <span className="text-gray-500">Pasien:</span>{" "}
              <span className="text-red-300 font-medium">
                {data?.nama_pasien ?? "-"}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Tindakan:</span>{" "}
              <span className="text-red-300 font-medium">
                {data?.tindakan ?? "-"}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Tanggal:</span>{" "}
              <span className="text-gray-400">{data?.tanggal ?? "-"}</span>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3 border-t border-red-900/40 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-gray-700/60 text-gray-400 hover:bg-gray-800/50 transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm rounded-md border border-red-700/60 text-red-300 hover:bg-red-900/40 transition-all"
            >
              Hapus
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
