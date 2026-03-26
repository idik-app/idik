"use client";

import { PlusCircle } from "lucide-react";

/*───────────────────────────────────────────────
 🤖 PasienEmptyState v3.4
 Ditampilkan saat filteredPatients.length === 0
───────────────────────────────────────────────*/
export default function PasienEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-cyan-300/70 space-y-4">
      <div className="rounded-full p-6 bg-gradient-to-br from-cyan-900/30 to-black/60 shadow-[0_0_20px_rgba(0,255,255,0.15)] animate-in fade-in zoom-in-95 duration-200">
        <PlusCircle className="w-10 h-10 text-yellow-400" />
      </div>

      <h3 className="text-lg font-semibold text-yellow-300 animate-in fade-in slide-in-from-top-1 duration-200">
        Belum ada data pasien sesuai filter
      </h3>

      <p className="text-sm text-cyan-400/70 animate-in fade-in slide-in-from-top-1 duration-200">
        Coba ubah kata kunci pencarian atau klik tombol{" "}
        <span className="text-yellow-400 font-medium">Tambah Pasien</span> untuk
        menambahkan data baru.
      </p>
    </div>
  );
}
