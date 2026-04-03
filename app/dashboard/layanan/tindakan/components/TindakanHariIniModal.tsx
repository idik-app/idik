"use client";

import { useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  displayNamaPasien,
  displayRm,
  formatJenisKelaminDisplay,
  resolveJenisKelaminFromRow,
} from "../lib/displayTindakanRow";
import { normalizeNamaPasien } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import ReportExportActionBar from "./ReportExportActionBar";
import {
  buildTindakanHariIniReportHtml,
  buildTindakanHariIniWhatsAppText,
} from "../lib/tindakanReportTemplates";

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
  themeTone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  loading: boolean;
  themeTone: "cyan" | "emerald";
}) {
  const today = todayWibYmd();
  const todayRows = useMemo(
    () => rows.filter((r) => tanggalKey(r.tanggal) === today),
    [rows, today],
  );

  const tanggalLabel = useMemo(() => {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "long",
    }).format(new Date(`${today}T12:00:00+07:00`));
  }, [today]);

  const buildExportHtml = useCallback(
    () =>
      buildTindakanHariIniReportHtml({
        tanggalIso: today,
        tanggalLabel,
        rows: todayRows,
      }),
    [today, tanggalLabel, todayRows],
  );

  const buildExportWhatsApp = useCallback(
    () => buildTindakanHariIniWhatsAppText(tanggalLabel, todayRows),
    [tanggalLabel, todayRows],
  );

  const exportFileBase = useMemo(
    () => `laporan-tindakan-hari-ini-${today}`,
    [today],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[95vh] w-[min(100vw-1rem,96vw)] max-w-[min(96vw,90rem)] overflow-auto p-0",
          "border-slate-300/60 bg-white/98 backdrop-blur-xl dark:border-cyan-500/35 dark:bg-black/80",
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-3 p-4 sm:p-6",
            "text-slate-900 dark:text-white",
          )}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <DialogHeader className="space-y-1 sm:pr-2">
              <DialogTitle className="text-left font-bold tracking-wide">
                Tindakan hari ini
              </DialogTitle>
              <p
                className={cn(
                  "text-[12px] font-semibold",
                  "text-slate-600 dark:text-white/85",
                )}
              >
                {tanggalLabel}
              </p>
            </DialogHeader>
            <ReportExportActionBar
              className="shrink-0 sm:pt-0.5"
              disabled={loading}
              empty={!loading && todayRows.length === 0}
              fileNameBase={exportFileBase}
              buildHtml={buildExportHtml}
              buildWhatsAppText={buildExportWhatsApp}
            />
          </div>

          {loading ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-10 text-center text-sm font-semibold",
                "border-slate-200 bg-slate-50 text-slate-700 dark:border-cyan-800/40 dark:bg-black/25 dark:text-white/90",
              )}
            >
              Memuat data…
            </div>
          ) : todayRows.length === 0 ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-10 text-center text-sm font-semibold",
                "border-slate-200 bg-slate-50 text-slate-700 dark:border-cyan-800/40 dark:bg-black/25 dark:text-white/90",
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
                      // Header tabel: gradient + backdrop blur agar terlihat lebih elegan.
                      "border-b text-center backdrop-blur-md shadow-[0_12px_30px_rgba(245,158,11,0.16)]",
                      "border-amber-200/70 bg-gradient-to-b from-amber-400/85 via-amber-200/65 to-amber-100/40 dark:border-amber-400/55 dark:bg-gradient-to-b dark:from-amber-300/30 dark:via-amber-200/20 dark:to-amber-200/10",
                    )}
                  >
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-10">
                      No
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white">
                      Tanggal
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-24">
                      Time out
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-24">
                      RM
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[180px]">
                      Nama pasien
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-24">
                      Jenis kelamin
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[180px]">
                      Dokter
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[180px]">
                      Tindakan
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[160px]">
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
                          "border-cyan-200/70 dark:border-cyan-900/25",
                        )}
                      >
                        <td className="px-2 py-1.5 text-center font-mono text-[12px] tabular-nums text-cyan-700 dark:text-white">
                          {i + 1}
                        </td>
                        <td className="px-2 py-1.5 text-center font-mono text-[12px] text-slate-800 dark:text-white/90">
                          {String(rec.tanggal ?? "").slice(0, 10) || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-center font-mono text-[12px] text-slate-800 dark:text-white/90">
                          {String(rec.fast_track_time_out ?? "").trim() || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-center font-mono text-[12px] text-slate-800 dark:text-white/90">
                          {displayRm(raw)}
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-slate-800 dark:text-white/90">
                          {normalizeNamaPasien(displayNamaPasien(raw))}
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-slate-800 dark:text-white/90">
                          {formatJenisKelaminDisplay(jk)}
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-slate-800 dark:text-white/90">
                          {dokter}
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-slate-800 dark:text-white/90">
                          {tindakan}
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-slate-800 dark:text-white/90">
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
