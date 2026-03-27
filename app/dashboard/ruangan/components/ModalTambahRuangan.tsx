"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DoorOpen, X, Loader2 } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalTambahRuangan({ onClose, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false);
  const [nama, setNama] = useState("");
  const [kode, setKode] = useState("");
  const [kategori, setKategori] = useState("");
  const [kapasitas, setKapasitas] = useState("");
  const [keterangan, setKeterangan] = useState("");
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
      kode: kode.trim() || null,
      kategori: kategori.trim() || null,
      keterangan: keterangan.trim() || null,
      aktif,
    };
    if (kapasitas.trim() !== "") {
      const n = Number(kapasitas);
      if (!Number.isFinite(n) || n < 0) {
        setError("Kapasitas harus angka ≥ 0");
        setLoading(false);
        return;
      }
      body.kapasitas = Math.floor(n);
    } else {
      body.kapasitas = null;
    }

    const res = await fetch("/api/ruangan", {
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
            ? "Hanya admin yang dapat menambah data ruangan."
            : "Gagal menyimpan data ruangan.")
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
            <DoorOpen className="h-5 w-5" />
            Tambah Ruangan
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

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-cyan-500/90 mb-1">
              Nama ruangan *
            </label>
            <input
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full bg-gray-950/60 border border-cyan-700/50 rounded-lg px-3 py-2 text-sm text-cyan-100 focus:border-yellow-400 focus:outline-none"
              placeholder="Contoh: Cathlab 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cyan-500/90 mb-1">Kode</label>
              <input
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                className="w-full bg-gray-950/60 border border-cyan-700/50 rounded-lg px-3 py-2 text-sm text-cyan-100 focus:border-yellow-400 focus:outline-none"
                placeholder="CL-01"
              />
            </div>
            <div>
              <label className="block text-xs text-cyan-500/90 mb-1">
                Kapasitas
              </label>
              <input
                value={kapasitas}
                onChange={(e) => setKapasitas(e.target.value)}
                type="number"
                min={0}
                className="w-full bg-gray-950/60 border border-cyan-700/50 rounded-lg px-3 py-2 text-sm text-cyan-100 focus:border-yellow-400 focus:outline-none"
                placeholder="—"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-cyan-500/90 mb-1">
              Kategori
            </label>
            <input
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full bg-gray-950/60 border border-cyan-700/50 rounded-lg px-3 py-2 text-sm text-cyan-100 focus:border-yellow-400 focus:outline-none"
              placeholder="Contoh: Cathlab, ICU"
            />
          </div>
          <div>
            <label className="block text-xs text-cyan-500/90 mb-1">
              Keterangan
            </label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={2}
              className="w-full bg-gray-950/60 border border-cyan-700/50 rounded-lg px-3 py-2 text-sm text-cyan-100 focus:border-yellow-400 focus:outline-none resize-y"
              placeholder="Catatan opsional"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="aktif-ruangan"
              type="checkbox"
              checked={aktif}
              onChange={(e) => setAktif(e.target.checked)}
              className="rounded border-cyan-600 text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="aktif-ruangan" className="text-sm text-cyan-200">
              Ruangan aktif
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800/80"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600/40 hover:bg-cyan-500/50 border border-cyan-500/50 text-cyan-100 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan…
                </>
              ) : (
                "Simpan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
