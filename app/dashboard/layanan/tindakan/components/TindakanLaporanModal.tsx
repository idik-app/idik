"use client";

import { useCallback, useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PasienOption } from "@/components/ui/pasien-combobox";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import ReportExportActionBar from "./ReportExportActionBar";
import {
  aggregateMonthlyCaraBayar,
  aggregateMonthlyJenisOperasi,
  CARA_BAYAR_LABEL_BELUM_TERISI,
  weekdaySun0Wib,
} from "../lib/tindakanBulananMatrix";
import {
  buildBulananCaraBayarHtml,
  buildBulananJenisOperasiHtml,
  buildBulananMatrixWhatsAppText,
} from "../lib/tindakanReportTemplates";

function currentMonthWibYyyyMm(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

function parseYyyyMm(s: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number.parseInt(m[1]!, 10);
  const mo = Number.parseInt(m[2]!, 10);
  if (mo < 1 || mo > 12) return null;
  return { y, m: mo };
}

function formatCell(n: number): string {
  return n === 0 ? "" : String(n);
}

type ReportTab = "jenis" | "cara";

export default function TindakanLaporanModal({
  open,
  onOpenChange,
  rows,
  loading,
  filterSummaryLines,
  pasienOptions = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  loading: boolean;
  filterSummaryLines: readonly string[];
  /** Master pasien (compact) — laporan cara bayar memakai jenis + kelas dari sini bila baris terhubung. */
  pasienOptions?: readonly PasienOption[];
}) {
  const [tab, setTab] = useState<ReportTab>("jenis");
  const [monthYyyyMm, setMonthYyyyMm] = useState(currentMonthWibYyyyMm);

  const ym = useMemo(() => parseYyyyMm(monthYyyyMm), [monthYyyyMm]);

  const matrixJenis = useMemo(() => {
    if (!ym) return null;
    return aggregateMonthlyJenisOperasi(rows, ym.y, ym.m);
  }, [rows, ym]);

  const matrixCara = useMemo(() => {
    if (!ym) return null;
    return aggregateMonthlyCaraBayar(rows, ym.y, ym.m, {
      pasienOptions,
    });
  }, [rows, ym, pasienOptions]);

  const laporanCaraBelumTerisi = useMemo(() => {
    if (!matrixCara) return { count: 0, strong: false };
    const idx = matrixCara.rowLabels.indexOf(CARA_BAYAR_LABEL_BELUM_TERISI);
    if (idx < 0) return { count: 0, strong: false };
    const count = matrixCara.rowTotals[idx] ?? 0;
    const gt = matrixCara.grandTotal;
    const strong =
      count > 0 && (count >= 5 || (gt > 0 && count / gt >= 0.15));
    return { count, strong };
  }, [matrixCara]);

  const activeMatrix = tab === "jenis" ? matrixJenis : matrixCara;

  const subtitleLines = useMemo(() => {
    const base = [...filterSummaryLines];
    base.push(`Baris tindakan (setelah filter tabel): ${rows.length}`);
    if (pasienOptions.length > 0) {
      base.push(
        "Cara bayar: klasifikasi memakai master pasien (jenis + kelas) bila kasus terhubung ke RM / pasien_id.",
      );
    }
    if (matrixCara) {
      const idx = matrixCara.rowLabels.indexOf(CARA_BAYAR_LABEL_BELUM_TERISI);
      const n = idx >= 0 ? (matrixCara.rowTotals[idx] ?? 0) : 0;
      if (n > 0) {
        base.push(
          `Cara bayar: ${n} kasus tanpa data biaya terklasifikasi → baris ${CARA_BAYAR_LABEL_BELUM_TERISI} (bukan UMUM).`,
        );
      }
    }
    return base;
  }, [filterSummaryLines, rows.length, pasienOptions.length, matrixCara]);

  const buildExportHtml = useCallback(() => {
    if (!activeMatrix) return "";
    return tab === "jenis"
      ? buildBulananJenisOperasiHtml(activeMatrix, subtitleLines)
      : buildBulananCaraBayarHtml(activeMatrix, subtitleLines);
  }, [activeMatrix, tab, subtitleLines]);

  const buildExportWhatsApp = useCallback(() => {
    if (!activeMatrix) return "";
    const title =
      tab === "jenis"
        ? "LAPORAN JENIS OPERASI / TINDAKAN CATHLAB"
        : "LAPORAN CARA BAYAR CATHLAB";
    return buildBulananMatrixWhatsAppText(title, activeMatrix, subtitleLines);
  }, [activeMatrix, tab, subtitleLines]);

  const exportFileBase = useMemo(() => {
    const safe = monthYyyyMm.replace(/[^\d-]/g, "") || "bulan";
    return tab === "jenis"
      ? `laporan-tindakan-jenis-${safe}`
      : `laporan-tindakan-cara-bayar-${safe}`;
  }, [monthYyyyMm, tab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[95vh] w-[min(100vw-1rem,96vw)] max-w-[min(96vw,92rem)] overflow-hidden p-0 flex flex-col",
          "border-slate-300/60 bg-white/98 backdrop-blur-xl dark:border-emerald-800/40 dark:bg-black/85",
        )}
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6",
            "text-slate-900 dark:text-white",
          )}
        >
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <DialogHeader className="space-y-1 text-left sm:pr-2">
              <DialogTitle className="flex items-center gap-2 text-left font-bold tracking-wide">
                <FileSpreadsheet
                  className="shrink-0 text-emerald-600 dark:text-emerald-300"
                  size={22}
                  strokeWidth={2.25}
                  aria-hidden
                />
                Laporan tindakan
              </DialogTitle>
            </DialogHeader>
            <ReportExportActionBar
              className="shrink-0 sm:pt-0.5"
              disabled={loading || !ym}
              empty={!loading && !activeMatrix}
              fileNameBase={exportFileBase}
              buildHtml={buildExportHtml}
              buildWhatsAppText={buildExportWhatsApp}
            />
          </div>

          <div
            className={cn(
              "flex shrink-0 flex-wrap items-center gap-2 rounded-lg border p-2.5",
              "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-black/30",
            )}
          >
            <div className="flex rounded-lg border border-emerald-600/25 bg-white/90 p-0.5 dark:border-white/15 dark:bg-black/40">
              <button
                type="button"
                onClick={() => setTab("jenis")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-extrabold transition",
                  tab === "jenis"
                    ? "bg-emerald-600 text-white dark:bg-emerald-700 dark:text-white"
                    : "text-slate-700 hover:bg-emerald-50 dark:text-white/90 dark:hover:bg-white/10",
                )}
              >
                Jenis operasi
              </button>
              <button
                type="button"
                onClick={() => setTab("cara")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-extrabold transition",
                  tab === "cara"
                    ? "bg-emerald-600 text-white dark:bg-emerald-700 dark:text-white"
                    : "text-slate-700 hover:bg-emerald-50 dark:text-white/90 dark:hover:bg-white/10",
                )}
              >
                Cara bayar
              </button>
            </div>
            <label className="flex flex-col gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  "text-emerald-900 dark:text-emerald-200/90",
                )}
              >
                Bulan laporan
              </span>
              <input
                type="month"
                value={monthYyyyMm}
                onChange={(e) => setMonthYyyyMm(e.target.value)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[13px] font-semibold font-mono",
                  "border-emerald-300/80 bg-white text-slate-900 [color-scheme:light]",
                  "dark:border-white/20 dark:bg-black dark:text-white dark:[color-scheme:dark]",
                )}
              />
            </label>
          </div>

          {tab === "cara" && laporanCaraBelumTerisi.count > 0 ? (
            <div
              role="status"
              className={cn(
                "shrink-0 rounded-lg border px-3 py-2 text-[11px] font-semibold leading-snug",
                laporanCaraBelumTerisi.strong
                  ? "border-amber-500/80 bg-amber-100/90 text-amber-950 dark:border-amber-400/60 dark:bg-amber-950/50 dark:text-white"
                  : "border-slate-300/80 bg-slate-100/80 text-slate-800 dark:border-white/20 dark:bg-white/10 dark:text-white",
              )}
            >
              {laporanCaraBelumTerisi.count} kasus dalam periode ini tidak punya
              jenis/kelas pembiayaan yang terbaca (kosong di tindakan dan tidak
              terisi di master pasien, atau tidak terhubung ke master). Mereka
              masuk baris{" "}
              <span className="font-extrabold">{CARA_BAYAR_LABEL_BELUM_TERISI}</span>
              , bukan UMUM. Lengkapi data pasien (jenis pembiayaan + kelas) atau
              hubungkan kasus ke RM / pasien_id agar laporan akurat.
              {laporanCaraBelumTerisi.strong ? (
                <span className="mt-1 block font-extrabold">
                  Proporsi besar — periksa master pasien dan tautan kasus.
                </span>
              ) : null}
            </div>
          ) : null}

          {filterSummaryLines.length > 0 ? (
            <ul
              className={cn(
                "shrink-0 list-inside list-disc text-[11px] font-semibold",
                "text-slate-600 dark:text-white/85",
              )}
            >
              {filterSummaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200/80 dark:border-white/15">
            {loading ? (
              <div className="p-6 text-center text-sm font-semibold text-slate-600 dark:text-white/85">
                Memuat data…
              </div>
            ) : !ym || !activeMatrix ? (
              <div className="p-6 text-center text-sm font-semibold text-slate-600 dark:text-white/85">
                Pilih bulan yang valid.
              </div>
            ) : (
              <table className="w-max min-w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-white/10">
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-[1] border border-slate-300/70 px-1.5 py-1 text-left font-extrabold dark:border-white/20"
                    >
                      {tab === "jenis" ? "TINDAKAN" : "CARA BAYAR"}
                    </th>
                    <th
                      colSpan={activeMatrix.daysInMonth}
                      className="border border-slate-300/70 px-1 py-0.5 text-center font-extrabold dark:border-white/20"
                    >
                      TANGGAL
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-slate-300/70 px-1.5 py-1 text-center font-extrabold dark:border-white/20"
                    >
                      JUMLAH
                    </th>
                  </tr>
                  <tr>
                    {Array.from({ length: activeMatrix.daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const wd = weekdaySun0Wib(
                        activeMatrix.year,
                        activeMatrix.month1to12,
                        day,
                      );
                      const wkend = wd === 0 || wd === 6;
                      return (
                        <th
                          key={day}
                          className={cn(
                            "border px-0.5 py-0.5 text-center font-bold tabular-nums",
                            "border-slate-300/70 dark:border-white/20",
                            wkend
                              ? "bg-amber-100/90 dark:bg-amber-950/40"
                              : "bg-slate-50/80 dark:bg-black/20",
                          )}
                        >
                          {day}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {activeMatrix.rowLabels.map((label, ri) => (
                    <tr key={label}>
                      <th
                        scope="row"
                        className={cn(
                          "sticky left-0 z-[1] border border-slate-300/70 bg-white px-1.5 py-0.5 text-left font-semibold dark:border-white/20 dark:bg-black/80",
                        )}
                      >
                        {label}
                      </th>
                      {(activeMatrix.data[ri] ?? []).map((c, di) => {
                        const day = di + 1;
                        const wd = weekdaySun0Wib(
                          activeMatrix.year,
                          activeMatrix.month1to12,
                          day,
                        );
                        const wkend = wd === 0 || wd === 6;
                        return (
                          <td
                            key={di}
                            className={cn(
                              "border px-0.5 py-0.5 text-center tabular-nums",
                              "border-slate-300/70 dark:border-white/20 dark:text-white",
                              wkend ? "bg-amber-50/50 dark:bg-amber-950/25" : "",
                            )}
                          >
                            {formatCell(c)}
                          </td>
                        );
                      })}
                      <td className="border border-slate-300/70 px-1 py-0.5 text-center font-extrabold tabular-nums dark:border-white/20 dark:text-white">
                        {formatCell(activeMatrix.rowTotals[ri] ?? 0)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100/90 font-extrabold dark:bg-white/10">
                    <th
                      scope="row"
                      className="sticky left-0 z-[1] border border-slate-300/70 px-1.5 py-0.5 text-left dark:border-white/20"
                    >
                      JUMLAH
                    </th>
                    {activeMatrix.colTotals.map((c, di) => {
                      const day = di + 1;
                      const wd = weekdaySun0Wib(
                        activeMatrix.year,
                        activeMatrix.month1to12,
                        day,
                      );
                      const wkend = wd === 0 || wd === 6;
                      return (
                        <td
                          key={di}
                          className={cn(
                            "border px-0.5 py-0.5 text-center tabular-nums dark:border-white/20",
                            wkend ? "bg-amber-100/80 dark:bg-amber-950/35" : "",
                          )}
                        >
                          {formatCell(c)}
                        </td>
                      );
                    })}
                    <td className="border border-slate-300/70 px-1 py-0.5 text-center dark:border-white/20">
                      {formatCell(activeMatrix.grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
