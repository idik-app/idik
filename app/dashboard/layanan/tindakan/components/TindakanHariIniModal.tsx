"use client";

import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  displayNamaPasien,
  displayRm,
  formatJenisKelaminDisplay,
  resolveJenisKelaminFromRow,
} from "../lib/displayTindakanRow";
import {
  normalizeNamaPasien,
} from "@/app/dashboard/pasien/utils/normalizeNamaPasien";

function todayWibYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function tanggalKey(raw: unknown): string {
  if (raw == null || raw === "") return "";
  return String(raw).slice(0, 10);
}

export default function TindakanHariIniModal({
  open,
  onOpenChange,
  rows,
  loading,
  isLight,
  themeTone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  loading: boolean;
  isLight: boolean;
  themeTone: "cyan" | "emerald";
}) {
  const today = todayWibYmd();
  const todayRows = useMemo(
    () => rows.filter((r) => tanggalKey(r.tanggal) === today),
    [rows, today],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[95vh] w-[min(100vw-1rem,96vw)] max-w-[min(96vw,90rem)] overflow-auto p-0",
          isLight
            ? "border-slate-300/60 bg-white/98 backdrop-blur-xl"
            : "border-cyan-500/35 bg-black/80 backdrop-blur-xl",
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-3 p-4 sm:p-6",
            isLight ? "text-slate-900" : "text-cyan-50",
          )}
        >
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-left font-bold tracking-wide">
              Tindakan hari ini
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-10 text-center text-sm font-semibold",
                isLight
                  ? "border-slate-200 bg-slate-50 text-slate-700"
                  : "border-cyan-800/40 bg-black/25 text-cyan-200/80",
              )}
            >
              Memuat data…
            </div>
          ) : todayRows.length === 0 ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-10 text-center text-sm font-semibold",
                isLight
                  ? "border-slate-200 bg-slate-50 text-slate-700"
                  : "border-cyan-800/40 bg-black/25 text-cyan-200/80",
              )}
            >
              Tidak ada tindakan pada tanggal hari ini.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm font-semibold">
                <thead className="sticky top-0 z-10">
                  <tr
                    className={cn(
                      "border-b text-center",
                      isLight
                        ? "border-cyan-200/70 bg-slate-100/95"
                        : "border-cyan-800/40 bg-black/80",
                    )}
                  >
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-cyan-400/95 w-10">
                      No
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-cyan-400/95">
                      Tanggal
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-cyan-400/95 w-24">
                      Time out
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-cyan-400/95 w-24">
                      RM
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-cyan-400/95 min-w-[180px]">
                      Nama pasien
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-cyan-400/95 w-24">
                      Jenis kelamin
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-cyan-400/95 min-w-[180px]">
                      Dokter
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-cyan-400/95 min-w-[180px]">
                      Tindakan
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-cyan-400/95 min-w-[160px]">
                      Ruangan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {todayRows.map((rec, i) => {
                    const raw = rec as unknown as Record<string, unknown>;
                    const jk = resolveJenisKelaminFromRow(raw, null);
                    const dokter = String(rec.dokter ?? "").trim() || "—";
                    const tindakan = String(rec.tindakan ?? "").trim() || "—";
                    const ruangan = String(rec.ruangan ?? "").trim() || "—";
                    return (
                      <tr
                        key={String(rec.id ?? i)}
                        className={cn(
                          "border-b",
                          isLight ? "border-cyan-200/70" : "border-cyan-900/25",
                        )}
                      >
                        <td className="px-2 py-1.5 text-center font-mono text-[12px] tabular-nums text-cyan-500/90">
                          {i + 1}
                        </td>
                        <td className="px-2 py-1.5 text-center font-mono text-[12px] text-cyan-200/95">
                          {String(rec.tanggal ?? "").slice(0, 10) || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-center font-mono text-[12px] text-cyan-200/95">
                          {String(rec.fast_track_time_out ?? "").trim() || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-center font-mono text-[12px] text-cyan-200/95">
                          {displayRm(raw)}
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-cyan-200/95">
                          {normalizeNamaPasien(displayNamaPasien(raw))}
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-cyan-200/95">
                          {formatJenisKelaminDisplay(jk)}
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-cyan-200/95">
                          {dokter}
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-cyan-200/95">
                          {tindakan}
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-cyan-200/95">
                          {ruangan}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

