"use client";

import { memo } from "react";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import BiayaAutosaveField, {
  type BiayaAutosaveSyncedInfo,
} from "@/app/dashboard/layanan/tindakan/components/BiayaAutosaveField";
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
  onBiayaSynced?: (info?: BiayaAutosaveSyncedInfo) => void;
}

function CasemixTable({ data, isLoading, onRowClick, onBiayaSynced }: Props) {
  if (isLoading && data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center bg-white/50 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600 shadow-lg" />
          <p className="text-sm font-bold tracking-tight text-slate-500">
            Mensinkronisasi Data Tindakan...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 backdrop-blur-md">
            <th className="px-6 py-5">Tanggal</th>
            <th className="px-6 py-5 text-center">No. RM</th>
            <th className="px-6 py-5">Nama Pasien</th>
            <th className="px-6 py-5">Tindakan</th>
            <th className="w-[300px] px-6 py-5">Perolehan BPJS</th>
            <th className="w-[140px] px-6 py-5 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          <AnimatePresence mode="popLayout">
            {data.length === 0 ? (
              <motion.tr
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white"
              >
                <td colSpan={6} className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-5xl text-slate-100">∅</span>
                    <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Tidak ada data ditemukan</p>
                  </div>
                </td>
              </motion.tr>
            ) : (
              data.map((row, idx) => (
                <motion.tr
                  key={row.id || idx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02, ease: "easeOut" }}
                  whileHover={{ backgroundColor: "rgba(241, 245, 249, 0.5)" }}
                  className="group cursor-pointer bg-white transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
                  onClick={(e) => {
                    if (
                      e.target instanceof HTMLElement &&
                      (e.target.closest("input") || e.target.closest("button"))
                    ) {
                      return;
                    }
                    const selection = window.getSelection();
                    if (selection && selection.toString().length > 0) {
                      return;
                    }
                    row.id && onRowClick(row.id);
                  }}
                >
                  <td className="px-6 py-5">
                    <span className="font-mono text-xs font-bold tabular-nums text-slate-400">
                      {formatTanggalDisplay(row.tanggal)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex items-center rounded-xl bg-orange-50 px-3 py-1 text-xs font-extrabold tabular-nums text-orange-600 ring-1 ring-orange-200/50 shadow-sm shadow-orange-100">
                      {row.no_rm || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-black text-slate-800 tracking-tight uppercase">
                      {row.nama_pasien || "—"}
                    </p>
                  </td>
                  <td className="px-6 py-5 text-slate-500">
                    <div
                      className="max-w-[240px] truncate font-medium group-hover:text-slate-900 transition-colors"
                      title={row.tindakan || ""}
                    >
                      {row.tindakan || "—"}
                    </div>
                  </td>
                  <td
                    className="px-6 py-5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {row.id && (
                      <div className="max-w-[260px]">
                        <BiayaAutosaveField
                          key={`casemix-total-${row.id}`}
                          tindakanId={row.id}
                          field="total"
                          value={row.total}
                          onSaved={onBiayaSynced}
                          uiVariant="modern"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center">
                    {row.total && Number(row.total) > 0 ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 py-1.5 px-3 gap-2 font-bold shadow-sm shadow-emerald-50 ring-1 ring-emerald-200/30">
                        <Check size={14} strokeWidth={3} />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-50 text-slate-400 border-transparent py-1.5 px-3 font-bold">
                        Pending
                      </Badge>
                    )}
                  </td>
                </motion.tr>
              ))
            )}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

export default memo(CasemixTable);
