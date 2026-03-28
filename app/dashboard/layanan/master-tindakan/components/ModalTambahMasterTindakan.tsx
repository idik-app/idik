"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Activity, Loader2, X } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalTambahMasterTindakan({
  onClose,
  onSuccess,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [nama, setNama] = useState("");
  const [urutan, setUrutan] = useState("");
  const [aktif, setAktif] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      nama: nama.trim(),
      aktif,
    };
    if (urutan.trim() !== "") {
      const n = Number(urutan);
      if (!Number.isFinite(n)) {
        setError("Urutan harus angka");
        setLoading(false);
        return;
      }
      body.urutan = Math.trunc(n);
    } else {
      body.urutan = 0;
    }

    const res = await fetch("/api/master-tindakan", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
    };

    setLoading(false);
    if (!res.ok || !json.ok) {
      setError(
        json.message ||
          (res.status === 403
            ? "Hanya admin yang dapat menambah master tindakan."
            : "Gagal menyimpan."),
      );
      return;
    }
    onSuccess();
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-cyan-700/40 rounded-2xl shadow-lg shadow-cyan-900/40 p-6 text-gray-200 animate-in fade-in zoom-in-95 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-cyan-400 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Tambah jenis tindakan
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-cyan-300/90 mb-1">
              Nama <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full rounded-lg border border-cyan-700/50 bg-black/40 px-3 py-2 text-sm text-cyan-100 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              placeholder="contoh: ANGIOPLASTY"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-cyan-300/90 mb-1">
              Urutan (opsional)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={urutan}
              onChange={(e) => setUrutan(e.target.value)}
              className="w-full rounded-lg border border-cyan-700/50 bg-black/40 px-3 py-2 text-sm text-cyan-100 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              placeholder="0"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-cyan-200">
            <input
              type="checkbox"
              checked={aktif}
              onChange={(e) => setAktif(e.target.checked)}
              className="rounded border-cyan-600"
            />
            Aktif (tampil di pilihan kasus)
          </label>

          {error ? (
            <p className="text-sm text-red-400 text-center">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-700/40 border border-cyan-500/40 text-cyan-100 hover:bg-cyan-600/40 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
