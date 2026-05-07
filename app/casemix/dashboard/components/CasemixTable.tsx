"use client";

import { memo } from "react";
import { Check } from "lucide-react";
import BiayaAutosaveField, {
  type BiayaAutosaveSyncedInfo,
} from "@/app/dashboard/layanan/tindakan/components/BiayaAutosaveField";
import { TindakanJoinResult } from "@/app/dashboard/layanan/tindakan/bridge/mapping.types";
import { cn } from "@/lib/utils";

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
  onBiayaSynced?: (info?: BiayaAutosaveSyncedInfo) => void;
}

function CasemixTable({ data, isLoading, onBiayaSynced }: Props) {
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
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm text-neutral-900">
        <thead>
          <tr className="sticky top-0 z-10 border-b border-[#A3B8CC] bg-[#E0E0E0] text-sm font-bold uppercase tracking-wide text-neutral-950">
            <th className="px-3 py-2 text-left">Tanggal</th>
            <th className="min-w-[5.5rem] px-3 py-2 text-center align-middle text-neutral-950">
              No. RM
            </th>
            <th className="px-3 py-2 text-left">Nama Pasien</th>
            <th className="px-3 py-2 text-left">Tindakan</th>
            <th className="w-[240px] px-3 py-2 text-left">Perolehan BPJS</th>
            <th className="w-[112px] min-w-[104px] px-2 py-2.5 text-center align-middle text-neutral-700">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr className="bg-white">
              <td colSpan={6} className="px-3 py-10 text-center text-neutral-600">
                Tidak ada data tindakan ditemukan.
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className={cn(
                  "border-b border-[#E6EEF7] transition-colors hover:bg-[#E8F1FB]",
                  idx % 2 === 0 ? "bg-white" : "bg-[#F5F5F5]",
                )}
              >
                <td className="px-3 py-2 font-mono tabular-nums text-neutral-900">
                  {formatTanggalDisplay(row.tanggal)}
                </td>
                <td className="px-3 py-2 text-center align-middle">
                  <span className="inline-flex min-w-[4.25rem] justify-center rounded-sm bg-[#FFF9E8] px-2 py-0.5 font-semibold tabular-nums text-[#6E5A16] ring-1 ring-amber-300/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-amber-100 dark:text-amber-950 dark:ring-amber-400/45">
                    {row.no_rm || "—"}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium text-neutral-950">
                  {row.nama_pasien || "—"}
                </td>
                <td className="px-3 py-2 text-neutral-900">
                  <div
                    className="max-w-[200px] truncate"
                    title={row.tindakan || ""}
                  >
                    {row.tindakan || "—"}
                  </div>
                </td>
                <td
                  className="px-3 py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {row.id && (
                    <BiayaAutosaveField
                      key={`casemix-total-${row.id}`}
                      tindakanId={row.id}
                      field="total"
                      value={row.total}
                      onSaved={onBiayaSynced}
                      uiVariant="enterprise"
                    />
                  )}
                </td>
                <td className="px-3 py-3 text-center align-middle">
                  {row.total && Number(row.total) > 0 ? (
                    <div className="flex justify-center">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-[#A3B8CC] bg-white text-[#003366] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" title="Sudah diisi">
                        <Check size={17} strokeWidth={2.75} />
                      </div>
                    </div>
                  ) : (
                    <span className="inline-block text-sm font-bold uppercase tracking-[0.1em] text-neutral-500">
                      Belum isi
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
