"use client";

import { ClipboardList, Info, ScanLine } from "lucide-react";
import { useCallback, useState } from "react";

/**
 * Halaman Stok opname — akses untuk semua pengguna portal distributor (tanpa gate peran).
 * Backend sesi / penyimpanan menyusul; UI ini menyiapkan alur scan & jumlah fisik.
 */
export default function DistributorStokOpnamePage() {
  const [sesiAktif, setSesiAktif] = useState(false);
  const [barcode, setBarcode] = useState("");

  const mulaiSesi = useCallback(() => {
    setSesiAktif(true);
    setBarcode("");
  }, []);

  const selesaiSesi = useCallback(() => {
    setSesiAktif(false);
    setBarcode("");
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-[#D4AF37] flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-cyan-300/90" aria-hidden />
          Stok opname
        </h1>
        <p className="text-[12px] text-cyan-300/70 mt-1 max-w-2xl">
          Inventaris fisik dengan pemindaian barcode. Tersedia untuk{" "}
          <strong className="text-cyan-200/90">semua pengguna</strong> yang
          masuk ke portal distributor — tidak dibatasi peran admin.
        </p>
      </div>

      <div
        className="rounded-xl border border-cyan-700/50 bg-cyan-950/25 px-3 py-2.5 flex gap-2 items-start"
        role="status"
      >
        <Info className="h-4 w-4 shrink-0 text-cyan-400/90 mt-0.5" aria-hidden />
        <p className="text-[11px] leading-relaxed text-cyan-200/85">
          Modul ini dalam pengembangan: penyimpanan sesi, rekonsiliasi ke
          inventaris Cathlab, dan laporan selisih akan dihubungkan ke server
          pada iterasi berikutnya. Gunakan menu ini sebagai titik masuk tunggal
          untuk tim gudang / shift.
        </p>
      </div>

      {!sesiAktif ? (
        <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-5 space-y-4">
          <h2 className="text-sm font-medium text-cyan-100/95">Sesi opname</h2>
          <p className="text-[12px] text-cyan-300/75">
            Lokasi: <span className="text-cyan-200/90">Cathlab</span> (mengikuti
            konteks portal). Mulai sesi untuk membuka area scan percobaan.
          </p>
          <button
            type="button"
            onClick={mulaiSesi}
            className="px-4 py-2 rounded-lg text-[12px] font-medium bg-emerald-500/20 border border-emerald-400/50 text-emerald-100 hover:bg-emerald-500/30"
          >
            Mulai sesi baru
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-cyan-100/95">
              Sesi aktif (pratinjau)
            </h2>
            <button
              type="button"
              onClick={selesaiSesi}
              className="px-3 py-1.5 rounded-lg text-[11px] border border-slate-600/80 text-cyan-200/90 hover:bg-slate-800/80"
            >
              Akhiri sesi
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-medium text-cyan-200/90">
              Scan / ketik barcode
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Contoh: 21… atau QR dari kemasan"
                autoComplete="off"
                className="min-w-[12rem] flex-1 bg-slate-950/70 border border-cyan-800/70 rounded-md px-3 py-2 text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
              <span className="inline-flex items-center gap-1 text-[11px] text-cyan-500/80">
                <ScanLine className="h-4 w-4" aria-hidden />
                Kamera menyusul
              </span>
            </div>
            <p className="text-[10px] text-cyan-500/75">
              Setelah scan terhubung ke API, di sini akan muncul nama barang,
              LOT, stok sistem, dan input jumlah fisik.
            </p>
          </div>

          <div className="border border-dashed border-cyan-800/50 rounded-lg p-4 text-center text-[11px] text-cyan-400/70">
            Belum ada baris opname (data lokal / server menyusul).
          </div>
        </div>
      )}
    </div>
  );
}
