"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Activity, Loader2, Trash2, X } from "lucide-react";

export interface ConfirmDeleteMasterTindakanProps {
  itemName: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDeleteMasterTindakan({
  itemName,
  onConfirm,
  onCancel,
}: ConfirmDeleteMasterTindakanProps) {
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
        e instanceof Error ? e.message : "Gagal menghapus. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-auto animate-in fade-in duration-200"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-mt-title"
      aria-describedby="confirm-mt-desc"
    >
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
        aria-hidden
        onClick={() => !busy && onCancel()}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-cyan-500/35 bg-gradient-to-b from-[#0a1628] via-[#060d18] to-[#03070c] shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_24px_56px_rgba(0,0,0,0.65),0_0_40px_rgba(34,211,238,0.08)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="p-6 pb-4 relative">
          <div className="flex justify-between items-start gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/40 shadow-[0_0_28px_rgba(34,211,238,0.2)]"
                aria-hidden
              >
                <Activity className="h-6 w-6 text-cyan-300" strokeWidth={2} />
              </div>
              <div className="min-w-0 text-left">
                <h2
                  id="confirm-mt-title"
                  className="text-lg font-semibold text-white tracking-tight"
                >
                  Hapus jenis tindakan?
                </h2>
                <p
                  id="confirm-mt-desc"
                  className="mt-2 text-sm text-gray-300 leading-relaxed"
                >
                  <span className="text-cyan-200/90">Item</span>{" "}
                  <span className="font-semibold text-yellow-300/95 break-words">
                    {itemName.trim() || "(tanpa nama)"}
                  </span>{" "}
                  akan dihapus dari master. Baris kasus yang sudah menyimpan
                  teks ini tidak berubah otomatis.
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

          <div className="mt-4 flex gap-2 rounded-lg border border-cyan-500/15 bg-cyan-950/20 px-3 py-2.5 text-left">
            <Trash2
              className="h-4 w-4 shrink-0 text-cyan-400/90 mt-0.5"
              aria-hidden
            />
            <p className="text-xs text-cyan-100/80 leading-snug">
              Penghapusan tidak dapat dibatalkan. Pastikan Anda memilih item
              yang benar.
            </p>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-red-400 text-center">{error}</p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end px-6 pb-6 pt-0 relative">
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-900/80 to-red-800/90 hover:from-red-800 hover:to-red-700 text-white text-sm font-medium border border-red-500/35 shadow-[0_0_24px_rgba(220,38,38,0.28)] transition-colors disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menghapus…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Hapus permanen
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
