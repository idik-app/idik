"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalTambahDokter({ onClose, onSuccess }: Props) {
  const [nama, setNama] = useState("");
  const [spesialis, setSpesialis] = useState("");
  const [kontak, setKontak] = useState("");
  const [status, setStatus] = useState("aktif");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await (supabase as any).from("doctor").insert([{ nama_dokter: nama.trim(), spesialis: spesialis.trim() || null, kontak: kontak.trim() || null, status: status === "aktif" }]);

    setLoading(false);
    if (error) setError(error.message);
    else onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-cyan-700/40 rounded-2xl shadow-lg shadow-cyan-900/40 p-6 text-gray-200"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-cyan-400">
            Tambah Data Dokter
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-cyan-300 transition-colors"
            title="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-cyan-300">
              Nama Dokter
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              className="w-full bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-cyan-300">
              Spesialis
            </label>
            <input
              type="text"
              value={spesialis}
              onChange={(e) => setSpesialis(e.target.value)}
              placeholder="Contoh: Kardiologi"
              className="w-full bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-cyan-300">Kontak</label>
            <input
              type="text"
              value={kontak}
              onChange={(e) => setKontak(e.target.value)}
              placeholder="Nomor HP / Email"
              className="w-full bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-cyan-300">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-gray-800/60 border border-cyan-700/40 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
            >
              <option value="aktif">Aktif</option>
              <option value="cuti">Cuti</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center pt-1">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700/60 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-cyan-500/40 bg-cyan-700/40 hover:bg-cyan-600/60 text-cyan-100 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Simpan
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
