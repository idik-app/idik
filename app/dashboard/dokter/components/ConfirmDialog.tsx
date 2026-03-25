"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

export interface ConfirmDeleteDoctorProps {
  /** Nama dokter yang ditampilkan di teks konfirmasi */
  itemName: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  itemName,
  onConfirm,
  onCancel,
}: ConfirmDeleteDoctorProps) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  const handleConfirm = async () => {
    setError(null);
    setBusy(true);
    try {
      await onConfirm();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal menghapus. Coba lagi."
      );
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-auto"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-desc"
      >
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-md cursor-pointer"
          aria-hidden
          onClick={() => !busy && onCancel()}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/25 bg-gradient-to-b from-gray-900 via-[#0c1222] to-gray-950 shadow-[0_0_0_1px_rgba(239,68,68,0.12),0_24px_48px_rgba(0,0,0,0.55)] overflow-hidden"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

          <div className="p-6 pb-4">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-500/35 bg-red-950/50 shadow-[0_0_24px_rgba(239,68,68,0.2)]"
                  aria-hidden
                >
                  <Trash2 className="h-6 w-6 text-red-400" strokeWidth={2} />
                </div>
                <div className="min-w-0 text-left">
                  <h2
                    id="confirm-delete-title"
                    className="text-lg font-semibold text-white tracking-tight"
                  >
                    Hapus data dokter?
                  </h2>
                  <p
                    id="confirm-delete-desc"
                    className="mt-2 text-sm text-gray-300 leading-relaxed"
                  >
                    Anda akan menghapus{" "}
                    <span className="font-semibold text-yellow-300/95 break-words">
                      {itemName.trim() || "(tanpa nama)"}
                    </span>{" "}
                    secara permanen dari database. Baris ini akan hilang dari
                    tabel setelah penghapusan berhasil.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !busy && onCancel()}
                disabled={busy}
                className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors disabled:opacity-40"
                title="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-950/25 px-3 py-2.5 text-left">
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-amber-400 mt-0.5"
                aria-hidden
              />
              <p className="text-xs text-amber-100/85 leading-snug">
                Tindakan ini tidak dapat dibatalkan. Pastikan Anda memilih data
                yang benar sebelum mengonfirmasi.
              </p>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-400 text-center">{error}</p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end px-6 pb-6 pt-0">
            <button
              type="button"
              onClick={() => !busy && onCancel()}
              disabled={busy}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gray-800/90 hover:bg-gray-700/90 text-gray-100 text-sm font-medium border border-gray-600/50 transition-colors disabled:opacity-45"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-700/90 hover:bg-red-600 text-white text-sm font-medium border border-red-500/40 shadow-[0_0_20px_rgba(220,38,38,0.25)] transition-colors disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menghapus…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Hapus
                </>
              )}
            </button>
          </div>
        </motion.div>
    </motion.div>,
    document.body
  );
}
