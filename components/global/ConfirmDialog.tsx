"use client";
import { createPortal } from "react-dom";
import { useEffect, useState, ReactNode } from "react";

/**
 * ✅ ConfirmDialog — Modal konfirmasi global
 * Bisa dipanggil dari mana saja dan selalu muncul di atas layer lain.
 */
interface ConfirmDialogProps {
  open: boolean;
  message: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  message,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[600] bg-black/60 flex items-center justify-center">
      <div className="bg-gray-900 border border-cyan-600 rounded-2xl p-6 shadow-lg text-center w-80">
        <div className="text-cyan-200 text-sm mb-4">{message}</div>
        <div className="flex justify-center gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-yellow-600 text-yellow-400 hover:bg-yellow-600/20 transition"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition"
          >
            {loading ? "Menyimpan..." : "OK"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
