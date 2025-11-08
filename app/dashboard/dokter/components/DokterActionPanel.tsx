"use client";

export default function DokterActionPanel({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex justify-between items-center">
      <h2 className="text-lg font-semibold text-cyan-300">Daftar Dokter</h2>
      <button
        onClick={onAdd}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-cyan-400 text-black font-semibold hover:scale-105 transition-transform"
      >
        + Tambah Dokter
      </button>
    </div>
  );
}
