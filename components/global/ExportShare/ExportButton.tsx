"use client";

/*
  🔹 Tombol utama "Ekspor" (reusable di semua tabel)
  🔹 Saat diklik → membuka ExportModal
  🔹 Props:
      - type: string ("pasien", "inventaris", "pemakaian", "laporan")
      - data: any[] (data yang akan diekspor)
*/

import { useState } from "react";
import { ExportModal } from "./ExportModal";

export function ExportButton({ type, data }: { type: string; data: any[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-yellow-600/30 hover:bg-yellow-500/50 border border-yellow-400/50
                   rounded-lg text-yellow-300 text-sm font-medium transition-all
                   hover:shadow-[0_0_12px_rgba(255,215,0,0.4)]"
      >
        ⬇️ Ekspor
      </button>

      {open && (
        <ExportModal
          isOpen={open}
          type={type}
          data={data}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
