"use client";

import { memo } from "react";
import { Check, Search } from "lucide-react";
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
          <tr className="sticky top-0 z-10 border-b border-blue-100 bg-blue-50/50 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
            <th className="px-6 py-5">Tanggal</th>
            <th className="px-6 py-5 text-center">No. RM</th>
            <th className="px-6 py-5">Nama Pasien</th>
            <th className="px-6 py-5">Tindakan</th>
            <th className="w-[280px] px-6 py-5">Perolehan BPJS</th>
            <th className="w-[140px] px-6 py-5 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50/50 dark:divide-slate-800/50">
          <AnimatePresence mode="popLayout">
            {data.length === 0 ? (
              <motion.tr
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/30 dark:bg-transparent"
              >
                <td colSpan={6} className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-200 dark:bg-slate-800 dark:text-slate-700">
                      <Search size={32} />
                    </div>
                    <p className="font-bold text-blue-300">Data tidak ditemukan</p>
                  </div>
                </td>
              </motion.tr>
            ) : (
              data.map((row, idx) => (
                <motion.tr
                  key={row.id || idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  whileHover={{ backgroundColor: "rgba(239, 246, 255, 0.6)" }}
                  className="group cursor-pointer bg-white transition-colors dark:bg-slate-900/20 dark:hover:bg-slate-800/40"
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
                    <span className="font-mono text-xs font-bold tabular-nums text-blue-400">
                      {formatTanggalDisplay(row.tanggal)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 text-xs font-extrabold tabular-nums text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:ring-blue-900/50">
                      {row.no_rm || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-extrabold text-slate-800 dark:text-slate-200">
                      {row.nama_pasien || "—"}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <div
                      className="max-w-[220px] truncate text-slate-400 font-medium transition-colors group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-slate-200"
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
                      <div className="max-w-[240px]">
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
                      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 px-3 py-1 gap-1.5 font-bold dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50">
                        <Check size={12} strokeWidth={4} />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-50 text-slate-300 border-transparent px-3 py-1 font-bold dark:bg-slate-800 dark:text-slate-500">
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
