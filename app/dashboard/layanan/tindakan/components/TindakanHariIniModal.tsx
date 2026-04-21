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
  onRecordPatch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  loading: boolean;
  themeTone: "cyan" | "emerald";
  onRecordPatch?: () => void;
}) {
  const today = todayWibYmd();

  const { pasien: pasienRaw } = useMasterPasien();
  const pasienOptions = useMemo(() => {
    return (pasienRaw || [])
      .map((r: any) => (r && typeof r === "object" ? mapApiPasienRow(r) : null))
      .filter(Boolean) as PasienOption[];
  }, [pasienRaw]);

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

  const { summary, breakdown } = useMemo(() => {
    const total = todayRows.length;
    const roomMap = new Map<string, number>();
    const actionMap = new Map<string, number>();
    
    todayRows.forEach((r) => {
      const rm = String(r.ruangan ?? "Belum diisi").trim();
      const ac = String(r.tindakan ?? "Belum diisi").trim();
      roomMap.set(rm, (roomMap.get(rm) ?? 0) + 1);
      actionMap.set(ac, (actionMap.get(ac) ?? 0) + 1);
    });

    return {
      summary: { total },
      breakdown: {
        rooms: Array.from(roomMap.entries()).sort((a, b) => b[1] - a[1]),
        actions: Array.from(actionMap.entries()).sort((a, b) => b[1] - a[1]),
      },
    };
  }, [todayRows]);

  const buildExportHtml = useCallback(
    () =>
      buildTindakanHariIniReportHtml({
        tanggalIso: today,
        tanggalLabel,
        rows: todayRows,
        pasienOptions,
      }),
    [today, tanggalLabel, todayRows, pasienOptions],
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

              <DialogClose className="lg:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <X size={20} className="text-slate-500" />
              </DialogClose>
            </div>

            {/* KPI Summary */}
            {!loading && todayRows.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 px-3 py-2 border-l-2 sm:border-l-0 sm:border-y border-cyan-500/30 bg-cyan-500/5 sm:bg-transparent rounded-r-lg sm:rounded-none mx-0 lg:mx-4 flex-1">
                <div className="flex flex-col sm:border-r border-slate-200 dark:border-white/10 sm:pr-6 shrink-0">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/40">Total Hari Ini</span>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black tabular-nums text-cyan-600 dark:text-cyan-400 leading-none">
                      {summary.total}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-tighter">Pasien</span>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-wrap gap-x-8 gap-y-3 items-center">
                  {/* Room Breakdown */}
                  <div className="flex flex-col gap-1 min-w-fit flex-1 sm:flex-initial">
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-50">Berdasarkan Ruangan</span>
                    <div className="flex gap-4 flex-wrap">
                      {breakdown.rooms.slice(0, 3).map(([room, count]) => (
                        <div key={room} className="flex items-baseline gap-1.5">
                          <span className="text-[11px] font-black tabular-nums text-cyan-700 dark:text-cyan-300">{count}</span>
                          <span className="text-[10px] font-bold opacity-70 tracking-tight">{room}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Breakdown */}
                  <div className="flex flex-col gap-1 min-w-fit flex-1 sm:flex-initial">
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-50">Tindakan Terbanyak</span>
                    <div className="flex gap-4 flex-wrap">
                      {breakdown.actions.slice(0, 3).map(([action, count]) => (
                        <div key={action} className="flex items-baseline gap-1.5">
                          <span className="text-[11px] font-black tabular-nums text-emerald-600 dark:text-emerald-400">{count}</span>
                          <span className="text-[10px] font-bold opacity-70 tracking-tight">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 self-end lg:self-center">
              <ReportExportActionBar
                className="shrink-0"
                disabled={loading}
                empty={!loading && todayRows.length === 0}
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
                        "px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white",
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
                      Time out
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
                      Jenis kelamin
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
                  {todayRows.map((rec, i) => {
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
                          {String(rec.fast_track_time_out ?? "").trim() || "—"}
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
