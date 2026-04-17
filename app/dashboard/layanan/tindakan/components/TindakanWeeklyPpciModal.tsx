"use client";

import { useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  displayNamaPasien,
  displayRm,
  formatJenisKelaminDisplay,
  resolveJenisKelaminFromRow,
  mapApiPasienRow,
  resolvePasienFromRow,
} from "../lib/displayTindakanRow";
import { normalizeNamaPasien } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import ReportExportActionBar from "./ReportExportActionBar";
import {
  buildTindakanHariIniReportHtml,
  buildTindakanHariIniWhatsAppText,
} from "../lib/tindakanReportTemplates";
import MasterDokterField from "./MasterDokterField";
import MasterJenisTindakanField from "./MasterJenisTindakanField";
import RsPerujukField from "./RsPerujukField";
import KeteranganField from "./KeteranganField";
import { useMasterPasien } from "@/app/hooks/useMasterData";
import { type PasienOption } from "@/components/ui/pasien-combobox";

/** Senin minggu ini (WIB). */
function startOfWeekWibYmd(): string {
  const d = new Date();
  const jkt = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const day = jkt.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = jkt.getDate() - day + (day === 0 ? -6 : 1); // Monday
  jkt.setDate(diff);
  return new Intl.DateTimeFormat("en-CA").format(jkt);
}

/** Minggu minggu ini (WIB). */
function endOfWeekWibYmd(): string {
  const d = new Date();
  const jkt = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const day = jkt.getDay();
  const diff = jkt.getDate() - day + (day === 0 ? 0 : 7); // Sunday
  jkt.setDate(diff);
  return new Intl.DateTimeFormat("en-CA").format(jkt);
}

function extractCalendarDateKey(raw: unknown): string {
  if (raw == null || raw === "") return "";
  return String(raw).slice(0, 10);
}

export default function TindakanWeeklyPpciModal({
  open,
  onOpenChange,
  rows,
  loading,
  onRecordPatch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  loading: boolean;
  onRecordPatch?: () => void;
}) {
  const start = startOfWeekWibYmd();
  const end = endOfWeekWibYmd();

  const { pasien: pasienRaw } = useMasterPasien();
  const pasienOptions = useMemo(() => {
    return (pasienRaw || [])
      .map((r: any) => (r && typeof r === "object" ? mapApiPasienRow(r) : null))
      .filter(Boolean) as PasienOption[];
  }, [pasienRaw]);

  const ppciRows = useMemo(() => {
    return rows.filter((rec) => {
      const t = String(rec.tindakan ?? "").trim().toLowerCase();
      if (!t.includes("ppci")) return false;

      // RS Rujukan pribadi tidak dihitung dalam kuota mingguan
      const rs = String(rec.rs_perujuk ?? "").trim().toLowerCase();
      const ket = String(rec.keterangan ?? "").trim().toLowerCase();
      if (rs.includes("pribadi") || ket.includes("pribadi")) return false;

      const key = extractCalendarDateKey(String(rec.tanggal ?? "").trim());
      return key >= start && key <= end;
    });
  }, [rows, start, end]);

  const rangeLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
    });
    const s = fmt.format(new Date(`${start}T12:00:00+07:00`));
    const e = fmt.format(new Date(`${end}T12:00:00+07:00`));
    return `${s} – ${e}`;
  }, [start, end]);

  const buildExportHtml = useCallback(
    () =>
      buildTindakanHariIniReportHtml({
        tanggalIso: `${start}_${end}`,
        tanggalLabel: `PPCI Minggu Ini (${rangeLabel})`,
        rows: ppciRows,
        pasienOptions,
      }),
    [start, end, rangeLabel, ppciRows, pasienOptions],
  );

  const buildExportWhatsApp = useCallback(
    () => buildTindakanHariIniWhatsAppText(`PPCI Minggu Ini (${rangeLabel})`, ppciRows),
    [rangeLabel, ppciRows],
  );

  const { ppciSummary, doctorStats } = useMemo(() => {
    const total = ppciRows.length;
    const statsMap = new Map<string, number>();
    ppciRows.forEach((r) => {
      const dr = String(r.dokter ?? "Belum diisi").trim();
      statsMap.set(dr, (statsMap.get(dr) ?? 0) + 1);
    });

    const sortedStats = Array.from(statsMap.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );

    return {
      ppciSummary: { total },
      doctorStats: sortedStats,
    };
  }, [ppciRows]);

  const exportFileBase = useMemo(
    () => `laporan-ppci-minggu-ini-${start}-to-${end}`,
    [start, end],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={UI_LAYERS.dialogOverlayTop}
        className={cn(
          "max-h-[92vh] w-[min(100vw-1rem,96vw)] max-w-[min(96vw,85rem)] overflow-auto p-0",
          "border-slate-300/60 bg-white/98 dark:border-cyan-500/35 dark:bg-black/80",
          UI_LAYERS.dialogContentTop
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-2 p-3 sm:p-4",
            "text-slate-900 dark:text-white",
          )}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <DialogHeader className="space-y-1 sm:pr-2">
              <DialogTitle className="text-left font-bold tracking-wide">
                PPCI Minggu Ini
              </DialogTitle>
              <p
                className={cn(
                  "text-[12px] font-semibold text-amber-600 dark:text-amber-400",
                )}
              >
                {rangeLabel}
              </p>
            </DialogHeader>

            {!loading && ppciRows.length > 0 && (
              <div className="flex flex-1 flex-col gap-2 px-3 py-2 border-l-2 border-amber-500/30 bg-amber-500/5 rounded-r-lg mx-2 sm:mx-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="flex flex-col border-r border-slate-200 dark:border-white/10 pr-6">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/40">Total PPCI</span>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black tabular-nums text-amber-600 dark:text-amber-400 leading-none">
                        {ppciSummary.total}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-tighter">Kasus</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-wrap gap-x-5 gap-y-2 items-center">
                    {doctorStats.map(([dr, count]) => {
                      const drName = dr.split(",")[0].replace("dr. ", "").replace("dr ", "");
                      return (
                        <div key={dr} className="flex flex-col min-w-[100px] max-w-[140px]">
                          <div className="flex justify-between items-end mb-0.5">
                            <span className="text-[10px] font-bold truncate opacity-80 dark:text-white/70 tracking-tight" title={dr}>
                              {drName}
                            </span>
                            <span className={cn(
                              "text-[11px] font-black tabular-nums leading-none ml-1",
                              count >= 5 ? "text-amber-600 dark:text-amber-400" : "text-cyan-600 dark:text-cyan-400"
                            )}>
                              {count}
                            </span>
                          </div>
                          {/* Progress Bar / Mini Chart */}
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden relative">
                            <div 
                              className={cn(
                                "h-full transition-all duration-700 ease-out rounded-full",
                                count > 5 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : 
                                count === 5 ? "bg-amber-500" : "bg-cyan-500"
                              )}
                              style={{ width: `${Math.min(100, (count / 5) * 100)}%` }}
                            />
                            {/* Mark for 5 limit */}
                            <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/20 dark:bg-black/20" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <ReportExportActionBar
              className="shrink-0 sm:pt-0.5"
              disabled={loading}
              empty={!loading && ppciRows.length === 0}
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
          ) : ppciRows.length === 0 ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-10 text-center text-sm font-semibold",
                "border-slate-200 bg-slate-50 text-slate-700 dark:border-cyan-800/40 dark:bg-black/25 dark:text-white/90",
              )}
            >
              Tidak ada tindakan PPCI pada minggu ini.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm font-semibold">
                <thead className="sticky top-0 z-10">
                  <tr
                    className={cn(
                      "border-b text-center shadow-[0_12px_30px_rgba(245,158,11,0.16)]",
                      "border-amber-200/70 bg-gradient-to-b from-amber-400/85 via-amber-200/65 to-amber-100/40 dark:border-amber-400/55 dark:bg-gradient-to-b dark:from-amber-300/30 dark:via-amber-200/20 dark:to-amber-200/10",
                    )}
                  >
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-10">
                      No
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-24">
                      Tanggal
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-24">
                      RM
                    </th>
                    <th className="px-2 py-1.5 text-left text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[180px]">
                      Nama pasien
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[150px]">
                      RS Perujuk / Ket
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-24">
                      JK
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[180px]">
                      Dokter
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[180px]">
                      Tindakan
                    </th>
                    <th className="px-2 py-1.5 text-left text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[160px]">
                      Ruangan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ppciRows.map((rec, i) => {
                    const raw = rec as unknown as Record<string, unknown>;
                    const p = resolvePasienFromRow(pasienOptions, raw);
                    const jk = resolveJenisKelaminFromRow(raw, p);
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
                          {displayRm(raw)}
                        </td>
                        <td className="px-2 py-1.5 text-left text-[12px] text-slate-800 dark:text-white/90">
                          {normalizeNamaPasien(displayNamaPasien(raw))}
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-slate-800 dark:text-white/90">
                          <div className="flex items-center justify-center gap-2 max-w-[200px] mx-auto">
                            <div className="flex-1 min-w-0">
                              <RsPerujukField
                                tindakanId={String(rec.id)}
                                value={rec.rs_perujuk}
                                onSaved={onRecordPatch}
                              />
                            </div>
                            <div className="shrink-0">
                              <KeteranganField
                                tindakanId={String(rec.id)}
                                value={rec.keterangan}
                                onSaved={onRecordPatch}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-slate-800 dark:text-white/90">
                          {formatJenisKelaminDisplay(jk)}
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-slate-800 dark:text-white/90">
                          <MasterDokterField
                            tindakanId={String(rec.id)}
                            value={String(rec.dokter ?? "")}
                            onSaved={onRecordPatch}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center text-[12px] text-slate-800 dark:text-white/90">
                          <MasterJenisTindakanField
                            tindakanId={String(rec.id)}
                            value={String(rec.tindakan ?? "")}
                            onSaved={onRecordPatch}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-left text-[12px] text-slate-800 dark:text-white/90">
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
