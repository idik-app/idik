"use client";

import { useEffect } from "react";
import { RefreshCw, AlertTriangle, Home } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Root Error Boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black px-4 text-white">
      <div className="flex max-w-md flex-col items-center rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-md">
        <div className="mb-4 rounded-full bg-amber-500/10 p-3 text-amber-400">
          <AlertTriangle size={36} />
        </div>
        <h2 className="mb-2 text-xl font-bold tracking-wide text-white">
          Sistem Memerlukan Pembaruan Sesi
        </h2>
        <p className="mb-6 text-xs text-slate-300">
          Terjadi kesalahan saat memuat aplikasi. Tekan tombol di bawah untuk masuk kembali ke sistem IDIK.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              try {
                if (typeof window !== "undefined") {
                  window.localStorage.clear();
                  window.sessionStorage.clear();
                  window.location.href = "/";
                }
              } catch {
                if (typeof window !== "undefined") {
                  window.location.href = "/";
                }
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-cyan-500 active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} />
            Masuk ke Halaman Login
          </button>
        </div>
      </div>
    </div>
  );
}
