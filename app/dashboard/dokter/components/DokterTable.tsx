"use client";
import { PencilLine, Trash2 } from "lucide-react";

/* =========================================================
   🩺 DokterTable – Cathlab JARVIS Mode v3.8 (Gold-Cyan Hybrid)
   Fitur: Animated List + Pagination + Delete Confirmation
========================================================= */

interface DokterTableProps {
  doctors: any[];
  onDelete: (row: { id: string; nama: string }) => void;
  onEdit?: (row: any) => void;
  /** True when DB ada data tetapi filter/pencarian tidak mengembalikan baris */
  noMatch?: boolean;
}

export default function DokterTable({
  doctors,
  onDelete,
  onEdit,
  noMatch,
}: DokterTableProps) {
  if (noMatch) {
    return (
      <p className="text-center text-cyan-400 py-8 px-2 animate-in fade-in duration-200">
        Tidak ada dokter yang cocok dengan pencarian atau filter. Ubah kata
        kunci atau reset filter.
      </p>
    );
  }

  if (!doctors || doctors.length === 0)
    return (
      <p className="text-center text-cyan-400 py-6 animate-in fade-in duration-200">
        Belum ada data dokter. Gunakan tombol Tambah untuk menambahkan.
      </p>
    );

  return (
    <div
      className="relative overflow-x-auto rounded-xl border border-cyan-700/40 
                 bg-gradient-to-br from-cyan-900/10 to-black/60 
                 shadow-[0_0_15px_rgba(0,255,255,0.1)] backdrop-blur-md animate-in fade-in duration-300"
    >
      {/* ✨ Lapisan hologram */}
      <div
        className="absolute inset-0 bg-gradient-to-br 
                    from-[hsl(var(--cyan))/0.08] via-transparent 
                    to-[hsl(var(--gold))/0.06] blur-2xl 
                    rounded-xl pointer-events-none"
      />

      {/* Tabel Dokter */}
      <table className="relative w-full text-sm border-collapse z-10">
        <thead className="sticky top-0 bg-black/60 text-yellow-400 backdrop-blur-sm">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Nama Dokter</th>
            <th className="px-3 py-2 text-left font-medium">Spesialis</th>
            <th className="px-3 py-2 text-left font-medium">Kontak</th>
            <th className="px-3 py-2 text-center font-medium">Status</th>
            <th className="px-3 py-2 text-center font-medium">Aksi</th>
          </tr>
        </thead>

        <tbody>
          {doctors.map((d, i) => (
            <tr
              key={d.id || `dokter-${i}`}
              className={`border-t border-cyan-600/20 
                         hover:bg-cyan-400/10 transition-all
                         ${onEdit ? "cursor-pointer" : ""}`}
              onClick={() => onEdit?.(d)}
              onKeyDown={(e) => {
                if (!onEdit) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onEdit(d);
                }
              }}
              tabIndex={onEdit ? 0 : undefined}
              role={onEdit ? "button" : undefined}
              aria-label={onEdit ? `Edit dokter ${d.nama}` : undefined}
            >
              <td className="px-3 py-2">{d.nama}</td>
              <td className="px-3 py-2">{d.spesialis || "-"}</td>
              <td className="px-3 py-2">{d.kontak || "-"}</td>
              <td className="px-3 py-2 text-center">{d.badge}</td>
              <td className="px-3 py-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(d);
                      }}
                      className="p-1.5 rounded-md border border-cyan-500/40 
                                 text-cyan-300 hover:text-cyan-100 
                                 hover:bg-cyan-500/10 transition"
                      title="Edit dokter"
                    >
                      <PencilLine size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete({ id: d.id, nama: String(d.nama ?? "") });
                    }}
                    className="p-1.5 rounded-md border border-red-500/40 
                               text-red-400 hover:text-red-200 
                               hover:bg-red-500/10 
                               shadow-[0_0_8px_rgba(255,0,0,0.3)] transition"
                    title="Hapus dokter"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
