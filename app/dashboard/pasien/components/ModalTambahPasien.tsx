// app/dashboard/pasien/components/ModalTambahPasien.tsx
"use client";

import { usePasien } from "../contexts/PasienContext";

export default function ModalTambahPasien() {
  const { openAddModal } = usePasien();

  return (
    <button
      onClick={openAddModal}
      className="px-5 py-2.5 rounded-lg font-semibold text-yellow-900 
                 bg-gradient-to-br from-yellow-400/90 to-amber-500/80
                 border border-yellow-400/50 shadow-[0_0_12px_rgba(255,200,0,0.25)]
                 hover:from-yellow-300 hover:to-amber-400
                 hover:shadow-[0_0_18px_rgba(255,200,0,0.3)]
                 active:scale-95 transition-all duration-300 backdrop-blur-sm"
    >
      + Tambah Pasien
    </button>
  );
}
