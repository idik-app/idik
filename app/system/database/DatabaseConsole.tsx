// DatabaseConsole.tsx

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
// ... Asumsi import lainnya (misal, untuk mendapatkan user sesi yang asli)

// Catatan: Fungsi runQuery yang Anda kirimkan sebelumnya sudah menggunakan fetch("/api/database/query")
// Kita tetap menggunakan struktur itu.

export default function DatabaseConsole() {
  const [sql, setSql] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runQuery() {
    if (!sql.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    // TODO: Ganti ini dengan data user yang SESUNGGUHNYA dari session/auth hook Anda
    const user = {
      id: "system-test",
      name: "Cathlab Admin",
      role: "admin", // Kritis: Harus 'admin' agar API Route mengizinkan eksekusi
    };

    try {
      const res = await fetch("/api/database/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql, user }),
      });

      const data = await res.json();

      // Jika API Route mengembalikan ok: false atau status HTTP non-200
      if (!data.ok || !res.ok) {
        throw new Error(data.message || "Gagal menjalankan query.");
      }

      // Data yang dikembalikan adalah array of objects (SELECT) atau JSON status (DML)
      setResult(data.data);
    } catch (err: any) {
      // Menangkap error dari API Route (error SQL atau error keamanan)
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fungsi untuk menentukan apakah hasil adalah data tabel atau status DML
  const isDMLStatus =
    result && result.status === "success" && result.rows_affected !== undefined;
  const isSelectData = result && Array.isArray(result) && result.length > 0;

  return (
    <div className="p-6 text-sm text-cyan-100 space-y-5">
      <h2 className="text-lg font-semibold text-[#D4AF37]">
        Database SQL Console
      </h2>

      {/* Editor SQL (tidak diubah) */}
      <textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        placeholder="Tulis query SQL di sini..."
        className="w-full h-40 bg-black/40 border border-[#D4AF37]/40 text-cyan-200 rounded-xl p-3 font-mono focus:ring-2 focus:ring-cyan-400 focus:outline-none"
      />

      {/* Tombol Aksi (tidak diubah) */}
      <div className="flex gap-3">
        <button
          onClick={runQuery}
          disabled={loading || !sql.trim()}
          className="px-5 py-2 bg-gradient-to-r from-[#D4AF37]/90 to-cyan-600/70 rounded-lg text-black font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Menjalankan..." : "Jalankan Query"}
        </button>
        <button
          onClick={() => {
            setSql("");
            setResult(null);
            setError("");
          }}
          className="px-4 py-2 bg-[#222]/70 border border-[#D4AF37]/30 rounded-lg text-gray-300 hover:text-white"
        >
          Bersihkan
        </button>
      </div>

      {/* Hasil & Error */}
      {error && (
        <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-3 text-red-300">
          ⚠️ SQL Error: {error}
        </div>
      )}

      {/* Kasus 1: DML (INSERT, UPDATE, DELETE) Sukses */}
      {isDMLStatus && (
        <div className="bg-green-900/40 border border-green-500/40 rounded-lg p-3 text-green-300">
          ✅ Query Sukses: {result.rows_affected} baris terpengaruh.
        </div>
      )}

      {/* Kasus 2: SELECT Data Sukses */}
      {isSelectData && (
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="overflow-x-auto border border-[#D4AF37]/40 rounded-lg p-3 bg-black/30 backdrop-blur-sm"
        >
          <p className="text-[#D4AF37] mb-2">
            Hasil Ditemukan: {result.length} baris
          </p>
          <table className="min-w-full text-xs">
            {/* Header Tabel */}
            <thead className="text-[#D4AF37] border-b border-[#D4AF37]/30">
              <tr>
                {Object.keys(result[0] || {}).map((key) => (
                  <th key={key} className="text-left px-2 py-1">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            {/* Isi Data */}
            <tbody>
              {result.map((row: any, i: number) => (
                <tr key={i} className="border-b border-gray-700/50">
                  {Object.values(row).map((val: any, j: number) => (
                    <td
                      key={j}
                      className="px-2 py-1 text-cyan-200/90 max-w-xs truncate"
                    >
                      {String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {!error && !result && (
        <p className="text-gray-400 text-xs">
          Masukkan query dan klik <b>Jalankan Query</b> untuk melihat hasil.
        </p>
      )}
    </div>
  );
}
