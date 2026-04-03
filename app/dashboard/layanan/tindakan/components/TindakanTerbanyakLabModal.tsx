"use client";

import { useCallback, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  canonicalDoctorStoredValue,
  type DoctorOption,
} from "@/components/ui/doctor-combobox";
import ReportExportActionBar from "./ReportExportActionBar";
import {
  aggregateLabTerbanyakMatrix,
  hasAnyLainnya,
  LAB_TINDAKAN_ROW_LABELS,
} from "../lib/tindakanTerbanyakLab";
import {
  buildTindakanTerbanyakLabHtml,
  buildTindakanTerbanyakLabWhatsAppText,
} from "../lib/tindakanReportTemplates";

const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "Semua bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

function formatCell(n: number): string {
  return n === 0 ? "—" : String(n);
}

export default function TindakanTerbanyakLabModal({
  open,
  onOpenChange,
  rows,
  loading,
  doctorOptionsMaster,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  loading: boolean;
  doctorOptionsMaster: readonly DoctorOption[];
}) {
  const currentY = new Date().getFullYear();
  const [yearFrom, setYearFrom] = useState(2020);
  const [yearTo, setYearTo] = useState(() =>
    Math.max(2025, currentY),
  );
  const [monthKey, setMonthKey] = useState("0");
  const [filterDokter, setFilterDokter] = useState("");

  const dokterOptions = useMemo(() => {
    const set = new Set<string>();
    const master = doctorOptionsMaster;
    for (const r of rows) {
      const d = String(r.dokter ?? "").trim();
      if (!d) continue;
      const canon =
        master.length > 0 ? canonicalDoctorStoredValue(master, d) : d;
      set.add(canon);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [rows, doctorOptionsMaster]);

  const rowsFiltered = useMemo(() => {
    const master = doctorOptionsMaster;
    const fd = filterDokter.trim();
    if (!fd) return [...rows];
    return rows.filter((r) => {
      const rowD = String(r.dokter ?? "").trim();
      if (!master.length) return rowD === fd;
      return (
        canonicalDoctorStoredValue(master, rowD) ===
        canonicalDoctorStoredValue(master, fd)
      );
    });
  }, [rows, filterDokter, doctorOptionsMaster]);

  const monthOnly = useMemo(() => {
    if (monthKey === "0") return null;
    const n = Number(monthKey);
    return n >= 1 && n <= 12 ? n : null;
  }, [monthKey]);

  const matrix = useMemo(
    () =>
      aggregateLabTerbanyakMatrix(rowsFiltered, {
        yearFrom,
        yearTo,
        monthOnly,
      }),
    [rowsFiltered, yearFrom, yearTo, monthOnly],
  );

  const subtitleLines = useMemo(() => {
    const lines = [
      `Rentang tahun: ${yearFrom}–${yearTo}`,
      monthOnly != null
        ? `Hanya bulan: ${MONTH_OPTIONS.find((m) => m.value === String(monthOnly))?.label ?? String(monthOnly)}`
        : "Semua bulan",
      filterDokter.trim() ? `Dokter: ${filterDokter}` : "Semua dokter",
      `Sumber: ${rowsFiltered.length} baris tindakan (setelah filter dokter)`,
    ];
    return lines;
  }, [yearFrom, yearTo, monthKey, monthOnly, filterDokter, rowsFiltered.length]);

  const buildExportHtml = useCallback(
    () => buildTindakanTerbanyakLabHtml(matrix, subtitleLines),
    [matrix, subtitleLines],
  );

  const buildExportWhatsApp = useCallback(
    () => buildTindakanTerbanyakLabWhatsAppText(matrix, subtitleLines),
    [matrix, subtitleLines],
  );

  const exportFileBase = useMemo(
    () =>
      `laporan-tindakan-terbanyak-lab-${yearFrom}-${yearTo}${monthOnly != null ? `-bulan-${monthOnly}` : ""}`,
    [yearFrom, yearTo, monthOnly],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[95vh] w-[min(100vw-1rem,96vw)] max-w-[min(96vw,92rem)] overflow-hidden p-0 flex flex-col",
          "border-slate-300/60 bg-white/98 backdrop-blur-xl dark:border-violet-500/35 dark:bg-black/85",
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
                <BarChart3
                  className="shrink-0 text-violet-600 dark:text-violet-300"
                  size={22}
                  strokeWidth={2.25}
                  aria-hidden
                />
                Tindakan terbanyak di Laboratorium Kateterisasi
              </DialogTitle>
              <p
                className={cn(
                  "text-[12px] font-semibold leading-snug",
                  "text-slate-600 dark:text-white/85",
                )}
              >
                Frekuensi per jenis tindakan × tahun (data dari kolom tindakan &
                tanggal). Penempatan jenis mengikuti aturan kata kunci — nilai
                yang tidak cocok masuk baris Lainnya bila ada.
              </p>
            </DialogHeader>
            <ReportExportActionBar
              className="shrink-0 sm:pt-0.5"
              disabled={loading}
              empty={!loading && matrix.years.length === 0}
              fileNameBase={exportFileBase}
              buildHtml={buildExportHtml}
              buildWhatsAppText={buildExportWhatsApp}
            />
          </div>

          <div
            className={cn(
              "flex shrink-0 flex-wrap items-end gap-2 rounded-lg border p-2.5",
              "border-violet-200/80 bg-violet-50/50 dark:border-violet-800/40 dark:bg-black/30",
            )}
          >
            <label className="flex w-[5.5rem] flex-col gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  "text-violet-900 dark:text-violet-200/90",
                )}
              >
                Tahun dari
              </span>
              <input
                type="number"
                min={1990}
                max={2100}
                value={yearFrom}
                onChange={(e) =>
                  setYearFrom(
                    Math.min(
                      2100,
                      Math.max(1990, Number(e.target.value) || yearFrom),
                    ),
                  )
                }
                className={cn(
                  "rounded-md border px-2 py-1 text-[13px] font-semibold font-mono",
                  "border-violet-300/80 bg-white text-slate-900 dark:border-white/20 dark:bg-black dark:text-white",
                )}
              />
            </label>
            <label className="flex w-[5.5rem] flex-col gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  "text-violet-900 dark:text-violet-200/90",
                )}
              >
                Tahun sampai
              </span>
              <input
                type="number"
                min={1990}
                max={2100}
                value={yearTo}
                onChange={(e) =>
                  setYearTo(
                    Math.min(
                      2100,
                      Math.max(1990, Number(e.target.value) || yearTo),
                    ),
                  )
                }
                className={cn(
                  "rounded-md border px-2 py-1 text-[13px] font-semibold font-mono",
                  "border-violet-300/80 bg-white text-slate-900 dark:border-white/20 dark:bg-black dark:text-white",
                )}
              />
            </label>
            <label className="flex min-w-[10rem] flex-col gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  "text-violet-900 dark:text-violet-200/90",
                )}
              >
                Bulan (opsional)
              </span>
              <select
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[13px] font-semibold",
                  "border-violet-300/80 bg-white text-slate-900 dark:border-white/20 dark:bg-black dark:text-white",
                )}
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[9rem] flex-col gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  "text-violet-900 dark:text-violet-200/90",
                )}
              >
                Dokter
              </span>
              <select
                value={filterDokter}
                onChange={(e) => setFilterDokter(e.target.value)}
                className={cn(
                  "max-w-[14rem] rounded-md border px-2 py-1 text-[13px] font-semibold",
                  "border-violet-300/80 bg-white text-slate-900 dark:border-white/20 dark:bg-black dark:text-white",
                )}
              >
                <option value="">Semua</option>
                {dokterOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-10 text-center text-sm font-semibold",
                "border-slate-200 bg-slate-50 text-slate-700 dark:border-violet-800/40 dark:bg-black/25 dark:text-white/90",
              )}
            >
              Memuat data…
            </div>
          ) : matrix.years.length === 0 ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-10 text-center text-sm font-semibold",
                "border-slate-200 bg-slate-50 text-slate-700 dark:border-violet-800/40 dark:bg-black/25 dark:text-white/90",
              )}
            >
              Rentang tahun tidak valid atau tidak ada data.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200/80 dark:border-white/15">
              <table className="w-full min-w-[640px] border-separate border-spacing-0 text-center text-[12px] font-semibold">
                <thead className="sticky top-0 z-10">
                  <tr
                    className={cn(
                      "border-b backdrop-blur-md",
                      "border-violet-200/70 bg-gradient-to-b from-violet-400/85 via-violet-200/65 to-violet-100/40 dark:border-violet-400/55 dark:from-violet-300/30 dark:via-violet-200/20 dark:to-violet-200/10",
                    )}
                  >
                    <th
                      rowSpan={2}
                      className="border-b border-r border-violet-300/60 px-2 py-1.5 text-left text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[140px]"
                    >
                      Tindakan
                    </th>
                    <th
                      colSpan={matrix.years.length}
                      className="border-b border-violet-300/60 px-2 py-1 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white"
                    >
                      Tahun
                    </th>
                  </tr>
                  <tr
                    className={cn(
                      "border-b",
                      "border-violet-200/70 bg-violet-100/50 dark:bg-violet-950/40",
                    )}
                  >
                    {matrix.years.map((y) => (
                      <th
                        key={y}
                        className="border-r border-violet-200/50 px-2 py-1 font-mono text-[11px] text-slate-900 dark:text-white last:border-r-0"
                      >
                        {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LAB_TINDAKAN_ROW_LABELS.map((label) => {
                    const arr =
                      matrix.countsByLabel[label] ??
                      matrix.years.map(() => 0);
                    return (
                      <tr
                        key={label}
                        className={cn(
                          "border-b",
                          "border-violet-200/40 dark:border-violet-900/30",
                        )}
                      >
                        <td
                          className={cn(
                            "border-r border-violet-200/40 px-2 py-1.5 text-left text-[11px]",
                            "text-slate-800 dark:text-white/90",
                          )}
                        >
                          {label}
                        </td>
                        {arr.map((c, i) => (
                          <td
                            key={i}
                            className="border-r border-violet-200/30 px-2 py-1.5 font-mono tabular-nums text-slate-800 dark:text-white/90 last:border-r-0"
                          >
                            {formatCell(c)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {hasAnyLainnya(matrix.lainnyaPerYear) ? (
                    <tr
                      className={cn(
                        "border-b",
                        "border-violet-200/40 dark:border-violet-900/30",
                      )}
                    >
                      <td
                        className={cn(
                          "border-r border-violet-200/40 px-2 py-1.5 text-left text-[11px] italic",
                          "text-slate-700 dark:text-white/85",
                        )}
                      >
                        Lainnya
                      </td>
                      {matrix.lainnyaPerYear.map((c, i) => (
                        <td
                          key={i}
                          className="border-r border-violet-200/30 px-2 py-1.5 font-mono tabular-nums text-slate-800 dark:text-white/90 last:border-r-0"
                        >
                          {formatCell(c)}
                        </td>
                      ))}
                    </tr>
                  ) : null}
                  <tr
                    className={cn(
                      "bg-violet-100/70 dark:bg-violet-950/50",
                      "border-t-2 border-violet-400/50 dark:border-violet-600/40",
                    )}
                  >
                    <td
                      className={cn(
                        "border-r border-violet-300/50 px-2 py-1.5 text-left text-[11px] font-extrabold",
                        "text-slate-900 dark:text-white",
                      )}
                    >
                      JUMLAH
                    </td>
                    {matrix.totalsPerYear.map((c, i) => (
                      <td
                        key={i}
                        className="border-r border-violet-300/40 px-2 py-1.5 font-mono text-[12px] font-extrabold tabular-nums text-slate-900 dark:text-white last:border-r-0"
                      >
                        {formatCell(c)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
