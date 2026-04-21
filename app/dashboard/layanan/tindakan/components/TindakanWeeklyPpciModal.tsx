"use client";

import { useCallback, useMemo } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { TINDAKAN_SHEET_CELL } from "../lib/tindakanSheetClasses";

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

/** Label singkat untuk KPI header: bagian sebelum koma + prefiks dr. (mis. dr. Deo Idarto). */
function formatDokterKpiShort(full: string): string {
  const raw = String(full ?? "").trim();
  if (!raw) return "—";
  if (/^belum diisi$/i.test(raw)) return raw;
  const first = raw.split(",")[0].trim();
  const withoutDr = first.replace(/^dr\.?\s*/i, "").trim();
  return withoutDr ? `dr. ${withoutDr}` : first;
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
            "flex flex-col gap-3 p-3 sm:p-4",
            "text-slate-900 dark:text-white",
          )}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between relative">
            <div className="flex items-start justify-between w-full lg:w-auto">
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
              
              <DialogClose className="lg:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <X size={20} className="text-slate-500" />
              </DialogClose>
            </div>

            {/* KPI Summary & Chart */}
            {!loading && ppciRows.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 px-3 py-2 border-l-2 sm:border-l-0 sm:border-y border-amber-500/30 bg-amber-500/5 sm:bg-transparent rounded-r-lg sm:rounded-none mx-0 lg:mx-4 flex-1">
                <div className="flex flex-col sm:border-r border-slate-200 dark:border-white/10 sm:pr-6 shrink-0">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/40">Total PPCI</span>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black tabular-nums text-amber-600 dark:text-amber-400 leading-none">
                      {ppciSummary.total}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-tighter">Kasus</span>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-wrap gap-x-5 gap-y-3 items-center">
                  {doctorStats.map(([dr, count]) => {
                    const drName = formatDokterKpiShort(dr);
                    return (
                      <div key={dr} className="flex flex-col min-w-[110px] max-w-[140px] flex-1 sm:flex-initial">
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
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden relative">
                          <div 
                            className={cn(
                              "h-full transition-all duration-700 ease-out rounded-full",
                              count > 5 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : 
                              count === 5 ? "bg-amber-500" : "bg-cyan-500"
                            )}
                            style={{ width: `${Math.min(100, (count / 5) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 self-end lg:self-center">
              <ReportExportActionBar
                className="shrink-0"
                disabled={loading}
                empty={!loading && ppciRows.length === 0}
                fileNameBase={exportFileBase}
                buildHtml={buildExportHtml}
                buildWhatsAppText={buildExportWhatsApp}
              />
              <DialogClose className="hidden lg:flex p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <X size={20} className="text-slate-500" />
              </DialogClose>
            </div>
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
              <table className="w-full min-w-[980px] text-sm font-semibold border-collapse border border-amber-200/65 dark:border-amber-800/50">
                <thead className={cn("sticky top-0 z-10", UI_LAYERS.tableHeader)}>
                  <tr
                    className={cn(
                      "text-center shadow-[0_12px_30px_rgba(245,158,11,0.16)]",
                      "border-amber-200/70 bg-gradient-to-b from-amber-400/85 via-amber-200/65 to-amber-100/40 dark:border-amber-400/55 dark:bg-gradient-to-b dark:from-amber-300/30 dark:via-amber-200/20 dark:to-amber-200/10",
                    )}
                  >
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-10",
                      )}
                    >
                      No
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-24",
                      )}
                    >
                      Tanggal
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-24",
                      )}
                    >
                      RM
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 py-1.5 text-left text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[180px]",
                      )}
                    >
                      Nama pasien
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[12rem]",
                      )}
                    >
                      RS Perujuk / Ket
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-24",
                      )}
                    >
                      JK
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[180px]",
                      )}
                    >
                      Dokter
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[180px]",
                      )}
                    >
                      Tindakan
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 py-1.5 text-left text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[160px]",
                      )}
                    >
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
                      <tr key={String(rec.id ?? i)}>
                        <td
                          className={cn(
                            TINDAKAN_SHEET_CELL,
                            "px-2 py-1.5 text-center font-mono text-[12px] tabular-nums text-cyan-700 dark:text-white",
                          )}
                        >
                          {i + 1}
                        </td>
                        <td
                          className={cn(
                            TINDAKAN_SHEET_CELL,
                            "px-2 py-1.5 text-center font-mono text-[12px] text-slate-800 dark:text-white/90",
                          )}
                        >
                          {String(rec.tanggal ?? "").slice(0, 10) || "—"}
                        </td>
                        <td
                          className={cn(
                            TINDAKAN_SHEET_CELL,
                            "px-2 py-1.5 text-center font-mono text-[12px] text-slate-800 dark:text-white/90",
                          )}
                        >
                          {displayRm(raw)}
                        </td>
                        <td
                          className={cn(
                            TINDAKAN_SHEET_CELL,
                            "px-2 py-1.5 text-left text-[12px] text-slate-800 dark:text-white/90",
                          )}
                        >
                          {normalizeNamaPasien(displayNamaPasien(raw))}
                        </td>
                        <td
                          data-no-row-click="true"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={cn(
                            TINDAKAN_SHEET_CELL,
                            "px-2 py-1 min-w-[12rem] text-center align-middle",
                            "text-amber-800 dark:text-slate-100",
                          )}
                        >
                          <div
                            className={cn(
                              "mx-auto flex w-full min-w-0 items-center justify-center gap-2",
                            )}
                          >
                            <div className="min-w-0 flex-1">
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
                        <td
                          className={cn(
                            TINDAKAN_SHEET_CELL,
                            "px-2 py-1.5 text-center text-[12px] text-slate-800 dark:text-white/90",
                          )}
                        >
                          {formatJenisKelaminDisplay(jk)}
                        </td>
                        <td
                          className={cn(
                            TINDAKAN_SHEET_CELL,
                            "px-2 py-1.5 text-center text-[12px] text-slate-800 dark:text-white/90",
                          )}
                        >
                          <MasterDokterField
                            tindakanId={String(rec.id)}
                            value={String(rec.dokter ?? "")}
                            onSaved={onRecordPatch}
                          />
                        </td>
                        <td
                          className={cn(
                            TINDAKAN_SHEET_CELL,
                            "px-2 py-1.5 text-center text-[12px] text-slate-800 dark:text-white/90",
                          )}
                        >
                          <MasterJenisTindakanField
                            tindakanId={String(rec.id)}
                            value={String(rec.tindakan ?? "")}
                            onSaved={onRecordPatch}
                          />
                        </td>
                        <td
                          className={cn(
                            TINDAKAN_SHEET_CELL,
                            "px-2 py-1.5 text-left text-[12px] text-slate-800 dark:text-white/90",
                          )}
                        >
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
