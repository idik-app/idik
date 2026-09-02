"use client";

import { useEffect } from "react";
import { RefreshCw, AlertTriangle, Home } from "lucide-react";

export default function TindakanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Tindakan Error Boundary]", error);
  }, [error]);

  const handleReset = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("idik_tindakan_date_filter_v2");
        window.localStorage.removeItem("idik_tindakan_date_filter");
      }
    } catch {
      /* ignore */
    }
    reset();
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 px-4 text-white">
      <div className="flex max-w-md flex-col items-center rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-md">
        <div className="mb-4 rounded-full bg-amber-500/10 p-3 text-amber-400">
          <AlertTriangle size={36} />
        </div>
        <h2 className="mb-2 text-xl font-bold tracking-wide text-white">
          Gagal Memuat Halaman Tindakan
        </h2>
        <p className="mb-6 text-xs text-slate-300">
          Terjadi kesalahan saat memuat komponen atau data. Tekan tombol di bawah untuk menyegarkan tampilan.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-cyan-500 active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} />
            Coba Lagi
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/dashboard";
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
          >
            <Home size={14} />
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
