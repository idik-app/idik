"use client";

import { memo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import BiayaAutosaveField from "@/app/dashboard/layanan/tindakan/components/BiayaAutosaveField";
import { TindakanJoinResult } from "@/app/dashboard/layanan/tindakan/bridge/mapping.types";

/** Format YYYY-MM-DD ke DD-MM-YYYY */
function formatTanggalDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

interface Props {
  data: TindakanJoinResult[];
  isLoading: boolean;
  onRowClick: (id: string) => void;
}

function CasemixTable({ data, isLoading, onRowClick }: Props) {
  if (isLoading && data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm font-medium text-cyan-500/70">Memuat data tindakan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-black uppercase tracking-widest text-cyan-400/80">
            <th className="px-4 py-3">Tanggal</th>
            <th className="px-4 py-3">No. RM</th>
            <th className="px-4 py-3">Nama Pasien</th>
            <th className="px-4 py-3">Tindakan</th>
            <th className="px-4 py-3 w-[240px]">Perolehan BPJS</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                Tidak ada data tindakan ditemukan.
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr 
                key={row.id} 
                className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                onClick={(e) => {
                  // Jika klik berasal dari dalam input atau sedang memblok teks, jangan buka drawer
                  if (
                    e.target instanceof HTMLElement && 
                    (e.target.closest('input') || e.target.closest('button'))
                  ) {
                    return;
                  }
                  
                  // Cek jika ada teks yang sedang diblok (selection)
                  const selection = window.getSelection();
                  if (selection && selection.toString().length > 0) {
                    return;
                  }

                  row.id && onRowClick(row.id);
                }}
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                  {formatTanggalDisplay(row.tanggal)}
                </td>
                <td className="px-4 py-3 font-bold text-amber-200/90">
                  {row.no_rm || "—"}
                </td>
                <td className="px-4 py-3 font-semibold text-white">
                  {row.nama_pasien || "—"}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  <div className="max-w-[200px] truncate" title={row.tindakan || ""}>
                    {row.tindakan || "—"}
                  </div>
                </td>
                <td className="px-4 py-3" onClick={(e) => {
                  e.stopPropagation();
                  // Jangan panggil onRowClick di sini agar tidak membuka drawer
                }}>
                  {row.id && (
                    <BiayaAutosaveField
                      tindakanId={row.id}
                      field="total"
                      value={row.total}
                    />
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.total && Number(row.total) > 0 ? (
                    <div className="flex justify-center">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Belum Isi
                    </span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default memo(CasemixTable);
