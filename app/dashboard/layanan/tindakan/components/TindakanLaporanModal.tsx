import { FileSpreadsheet, X, Search, Activity, Users, CheckCircle2, Stethoscope, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { UI_LAYERS, Z_INDEX_VALUES } from "@/lib/ui/layers";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { PasienOption } from "@/components/ui/pasien-combobox";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import type { WireframeTabId } from "../bridge/wireframeDrawerTabs";
import ReportExportActionBar from "./ReportExportActionBar";
import {
  CARA_BAYAR_LABEL_BELUM_TERISI,
  clinicalMatrixAxisMeta,
  type ClinicalDiagnosisMatrixReport,
  weekdaySun0Wib,
  type MonthlyMatrixAgg,
} from "../lib/tindakanBulananMatrix";
import { useTindakanLaporanReport } from "../hooks/useTindakanLaporanReport";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "../../../../../components/ui/popover";

type MatrixPopoverPatient = {
  nama: string;
  no_rm: string;
  dokter: string;
  tindakan?: string;
  diagnosa?: string;
  kategori?: string;
  kesimpulan_laporan?: string;
  plan_medis?: string;
  faktor_risiko?: string;
  tanggal?: string;
  status?: string;
};

type MatrixPopoverState = {
  title: string;
  patients: MatrixPopoverPatient[];
  anchor: HTMLElement;
  rowAxis?: ClinicalDiagnosisMatrixReport["rowAxis"];
} | null;

function MatrixCellPopover({
  state,
  onOpenChange,
}: {
  state: MatrixPopoverState;
  onOpenChange: (open: boolean) => void;
}) {
  const virtualRef = useRef<{ getBoundingClientRect: () => DOMRect }>({
    getBoundingClientRect: () => new DOMRect(0, 0, 0, 0),
  });

  if (state?.anchor) {
    virtualRef.current = state.anchor;
  }

  return (
    <Popover open={Boolean(state)} onOpenChange={onOpenChange}>
      {state ? <PopoverAnchor virtualRef={virtualRef} /> : null}
      <PopoverContent
        className="w-72 p-3 text-[11px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white shadow-xl rounded-xl z-[100060]"
        style={{ zIndex: 100060 }}
        sideOffset={8}
        collisionPadding={12}
      >
        {state ? (
          <>
            <div className="mb-1.5 border-b pb-1 font-bold text-emerald-600 dark:text-emerald-400 border-slate-100 dark:border-white/5">
              {state.title}
            </div>
            <ul className="max-h-40 overflow-auto space-y-1 pr-0.5">
              {state.patients.length > 0 ? (
                state.patients.map((detail, idx) => (
                  <li
                    key={`${detail.no_rm}-${detail.nama}-${idx}`}
                    className="border-b border-slate-100 pb-1.5 pt-1 last:border-0 last:pb-0 dark:border-white/5"
                  >
                    <div className="font-bold text-emerald-700 dark:text-emerald-400">
                      {detail.nama}
                      {detail.tindakan ? ` | ${detail.tindakan}` : ""}
                    </div>
                    <div className="text-[10px] flex flex-wrap gap-x-2 text-slate-500 dark:text-white/70">
                      <span>RM: {detail.no_rm}</span>
                      <span className="font-bold">Dr: {detail.dokter}</span>
                    </div>
                    {state.rowAxis === "diagnosa" && detail.faktor_risiko ? (
                      <div className="text-[10px] italic text-slate-500 dark:text-white/70">
                        FR: {detail.faktor_risiko}
                      </div>
                    ) : null}
                    {state.rowAxis === "faktorRisiko" && detail.diagnosa ? (
                      <div className="text-[10px] italic text-slate-500 dark:text-white/70">
                        Dx: {detail.diagnosa}
                      </div>
                    ) : null}
                    {(detail.diagnosa || detail.kategori) && !state.rowAxis ? (
                      <div className="mt-1 flex flex-wrap gap-1 text-[9px]">
                        {detail.diagnosa ? (
                          <span className="rounded bg-slate-100 px-1 py-0.5 font-medium text-slate-700 dark:bg-white/10 dark:text-white/70">
                            {detail.diagnosa}
                          </span>
                        ) : null}
                        {detail.kategori ? (
                          <span className="rounded bg-emerald-100 px-1 py-0.5 font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                            {detail.kategori}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {detail.tanggal || detail.status ? (
                      <div className="mt-0.5 text-[9px] text-slate-400 dark:text-white/50">
                        {detail.tanggal || "-"} | {detail.status || "-"}
                      </div>
                    ) : null}
                  </li>
                ))
              ) : (
                <li className="py-1 italic text-slate-400 dark:text-white/40">Detail tidak tersedia</li>
              )}
            </ul>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

// --- Components ---

/** Tampilan tabel mini untuk tab Analisis Gabungan — baris bisa diklik untuk buka drawer detail. */
const AnalisisTable = React.memo(
  ({
    rows,
    onOpenDetail,
  }: {
    rows: readonly TindakanJoinResult[];
    /** Tab awal drawer (default `klinis` agar diagnosa/autosave klinis langsung aktif). */
    onOpenDetail?: (
      row: TindakanJoinResult,
      initialTab?: WireframeTabId,
    ) => void;
  }) => {
    const openable = Boolean(onOpenDetail);
    return (
    <div className="flex flex-col">
      <table className="w-full border-collapse text-[11px] text-slate-800 bg-white">
        <thead className="sticky top-0 z-[2] bg-slate-100 border-slate-300">
          <tr>
            <th className="border border-slate-300 px-2 py-1.5 text-left font-bold text-slate-900 bg-slate-100">Tgl</th>
            <th className="border border-slate-300 px-2 py-1.5 text-left font-bold text-slate-900 bg-slate-100">Pasien & Klinis</th>
            <th className="border border-slate-300 px-2 py-1.5 text-left font-bold text-slate-900 bg-slate-100">Tindakan & Kategori</th>
            <th className="border border-slate-300 px-2 py-1.5 text-left font-bold text-slate-900 bg-slate-100">Tim Medis</th>
            <th className="border border-slate-300 px-2 py-1.5 text-left font-bold text-slate-900 bg-slate-100">Administrasi</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((r, idx) => (
              <tr
                key={r.id ? String(r.id) : idx}
                className={cn(
                  "hover:bg-slate-50 border-slate-200",
                  openable && r.id && "cursor-pointer",
                )}
                onClick={() => {
                  if (!onOpenDetail || !r.id) return;
                  onOpenDetail(r, "klinis");
                }}
              >
                <td className="border border-slate-300 px-2 py-1 text-slate-800 bg-white">
                  <div className="text-[10px] font-medium text-slate-500">
                    {r.tanggal ? new Intl.DateTimeFormat("id-ID", { weekday: 'long' }).format(new Date(r.tanggal)) : "-"}
                  </div>
                  <div className="font-bold text-slate-800">
                    {r.tanggal ? new Intl.DateTimeFormat("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(r.tanggal)) : "-"}
                  </div>
                </td>
                <td className="border border-slate-300 px-2 py-1 text-slate-800 bg-white">
                  <div className="font-bold text-emerald-700">{r.nama_pasien || "-"}</div>
                  <div className="text-[10px] text-slate-500">RM: {r.no_rm || "-"}</div>
                  <div className="mt-1 border-t border-slate-150 pt-1">
                    <span className="font-medium text-slate-500">Diag: </span>
                    <span className="font-bold text-slate-700">{r.diagnosa || "-"}</span>
                    {r.faktor_risiko && (
                      <div className="text-[9px] text-slate-400 italic">FR: {r.faktor_risiko}</div>
                    )}
                  </div>
                </td>
                <td className="border border-slate-300 px-2 py-1 text-slate-800 bg-white">
                  <div className="font-bold text-slate-800">{r.tindakan || "-"}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-700">
                      {r.kategori || "TANPA KATEGORI"}
                    </span>
                    {r.severity_level && (
                      <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-800">
                        Sev: {r.severity_level}
                      </span>
                    )}
                    {r.total_kontras && (
                      <span className="rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-800">
                        Contrast: {r.total_kontras}ml
                      </span>
                    )}
                  </div>
                  {r.kesimpulan_laporan && (
                    <div className="mt-1.5 border-t border-slate-150 pt-1 text-[10px] leading-relaxed">
                      <div className="font-bold text-slate-400 uppercase text-[8px] tracking-wider">Kesimpulan:</div>
                      <div className="italic text-slate-600 line-clamp-2">{r.kesimpulan_laporan}</div>
                    </div>
                  )}
                  {r.plan_medis && (
                    <div className="mt-1 text-[10px] leading-relaxed">
                      <div className="font-bold text-emerald-600 uppercase text-[8px] tracking-wider">Plan:</div>
                      <div className="text-emerald-700 line-clamp-1">{r.plan_medis}</div>
                    </div>
                  )}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-slate-800 bg-white">
                  <div className="font-semibold text-slate-800">Dr: {r.dokter || "-"}</div>
                  <div className="mt-1 text-[10px] leading-tight text-slate-500">
                    {r.asisten && <div>As: {r.asisten}</div>}
                    {r.sirkuler && <div>Sir: {r.sirkuler}</div>}
                    {r.logger && <div>Log: {r.logger}</div>}
                  </div>
                </td>
                <td className="border border-slate-300 px-2 py-1 text-slate-800 bg-white">
                  <div className="font-medium text-slate-700">{r.kelas_pembiayaan || r.pembiayaan || "-"}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className={cn(
                      "rounded px-1 py-0.5 text-[9px] font-bold",
                      r.status === "Selesai" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-amber-100 text-amber-800"
                    )}>
                      {r.status || "-"}
                    </span>
                    {r.ruangan && (
                      <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-700">
                        {r.ruangan} {r.cath && `(${r.cath})`}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="p-6 text-center italic opacity-50 text-slate-500">
                Tidak ada data yang cocok dengan kriteria pencarian.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    );
  },
);
AnalisisTable.displayName = "AnalisisTable";

const TableRow = React.memo(
  ({
    label,
    ri,
    activeMatrix,
    formatCell,
    onCellActivate,
  }: {
    label: string;
    ri: number;
    activeMatrix: MonthlyMatrixAgg;
    formatCell: (n: number) => string;
    onCellActivate?: (payload: {
      title: string;
      patients: MatrixPopoverPatient[];
      trigger: HTMLButtonElement;
    }) => void;
  }) => {
    return (
      <tr>
        <th
          scope="row"
          className={cn(
            "sticky left-0 z-[1] border border-slate-300/70 bg-slate-100 px-1.5 py-0.5 text-left font-semibold text-slate-900",
          )}
        >
          {label}
        </th>
        {(activeMatrix.data[ri] ?? []).map((c: number, di: number) => {
          const day = di + 1;
          const wd = weekdaySun0Wib(
            activeMatrix.year,
            activeMatrix.month1to12,
            day,
          );
          const wkend = wd === 0 || wd === 6;
          const detailPasien = activeMatrix.details?.[ri]?.[di] ?? [];

          return (
            <td
              key={di}
              className={cn(
                "border px-0.5 py-0.5 text-center tabular-nums transition-colors text-slate-800 border-slate-300",
                wkend ? "bg-amber-100/50" : "bg-white",
                c > 0 ? "cursor-pointer hover:bg-slate-100 font-bold" : "opacity-40",
              )}
            >
              {c > 0 ? (
                <button
                  type="button"
                  className="h-full w-full focus:outline-none text-[#1B2B44] font-extrabold"
                  onClick={(event) => {
                    onCellActivate?.({
                      title: `${label} - Tgl ${day}`,
                      patients: detailPasien,
                      trigger: event.currentTarget,
                    });
                  }}
                >
                  {formatCell(c)}
                </button>
              ) : (
                formatCell(c)
              )}
            </td>
          );
        })}
        <td className="border border-slate-300 px-1 py-0.5 text-center font-extrabold tabular-nums text-slate-900 bg-slate-100">
          {formatCell(activeMatrix.rowTotals[ri] ?? 0)}
        </td>
      </tr>
    );
  },
);
TableRow.displayName = "TableRow";

const LaporanMatrixTable = React.memo(
  ({
    matrix,
    yAxisHeader,
    onCellActivate,
  }: {
    matrix: MonthlyMatrixAgg;
    yAxisHeader: string;
    onCellActivate?: (payload: {
      title: string;
      patients: MatrixPopoverPatient[];
      trigger: HTMLButtonElement;
    }) => void;
  }) => (
    <table className="w-max min-w-full border-collapse text-[11px] text-slate-800 bg-white">
      <thead>
        <tr className="bg-slate-100 text-slate-900 border-slate-300">
          <th
            rowSpan={2}
            className="sticky left-0 z-[1] border border-slate-300 px-1.5 py-1 text-left font-extrabold bg-slate-100 text-slate-900"
          >
            {yAxisHeader}
          </th>
          <th
            colSpan={matrix.daysInMonth}
            className="border border-slate-300 px-1 py-0.5 text-center font-extrabold bg-slate-100 text-slate-900"
          >
            TANGGAL
          </th>
          <th
            rowSpan={2}
            className="border border-slate-300 px-1.5 py-1 text-center font-extrabold bg-slate-100 text-slate-900"
          >
            JUMLAH
          </th>
        </tr>
        <tr>
          {Array.from({ length: matrix.daysInMonth }, (_, i) => {
            const day = i + 1;
            const wd = weekdaySun0Wib(matrix.year, matrix.month1to12, day);
            const wkend = wd === 0 || wd === 6;
            return (
              <th
                key={day}
                className={cn(
                  "border px-0.5 py-0.5 text-center font-bold tabular-nums border-slate-300 text-slate-900",
                  wkend
                    ? "bg-amber-100/90 text-amber-950"
                    : "bg-slate-50 text-slate-850",
                )}
              >
                {day}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {matrix.rowLabels.map((label: string, ri: number) => (
          <TableRow
            key={label}
            label={label}
            ri={ri}
            activeMatrix={matrix}
            formatCell={formatCell}
            onCellActivate={onCellActivate}
          />
        ))}
        <tr className="bg-slate-100 font-extrabold text-slate-900">
          <th
            scope="row"
            className="sticky left-0 z-[1] border border-slate-300 px-1.5 py-0.5 text-left bg-slate-100 text-slate-900"
          >
            JUMLAH
          </th>
          {matrix.colTotals.map((c: number, di: number) => {
            const day = di + 1;
            const wd = weekdaySun0Wib(matrix.year, matrix.month1to12, day);
            const wkend = wd === 0 || wd === 6;
            return (
              <td
                key={di}
                className={cn(
                  "border px-0.5 py-0.5 text-center tabular-nums border-slate-300",
                  wkend ? "bg-amber-100 text-amber-950" : "bg-slate-50",
                )}
              >
                {formatCell(c)}
              </td>
            );
          })}
          <td className="border border-slate-300 px-1 py-0.5 text-center bg-slate-100 text-slate-900">
            {formatCell(matrix.grandTotal)}
          </td>
        </tr>
      </tbody>
    </table>
  ),
);
LaporanMatrixTable.displayName = "LaporanMatrixTable";

const ClinicalDiagnosisTable = React.memo(
  ({
    report,
    onCellActivate,
  }: {
    report: ClinicalDiagnosisMatrixReport;
    onCellActivate?: (payload: {
      title: string;
      patients: MatrixPopoverPatient[];
      trigger: HTMLButtonElement;
      rowAxis: ClinicalDiagnosisMatrixReport["rowAxis"];
    }) => void;
  }) => {
    const meta = clinicalMatrixAxisMeta(report.rowAxis);
    return (
    <table className="w-max min-w-full border-collapse text-[11px] text-slate-800 bg-white">
      <thead>
        <tr className="bg-slate-100 text-slate-900 border-slate-300">
          <th className="sticky left-0 z-[1] border border-slate-300 px-1.5 py-1 text-left font-extrabold bg-slate-100 text-slate-900">
            {meta.rowHeaderLabel.toUpperCase()}
          </th>
          {report.tindakanLabels.map((label) => (
            <th
              key={label}
              className="border border-slate-300 px-1 py-1 text-center font-extrabold bg-slate-100 text-slate-900"
            >
              {label}
            </th>
          ))}
          <th className="border border-slate-300 px-1.5 py-1 text-center font-extrabold bg-slate-100 text-slate-900">
            JUMLAH
          </th>
        </tr>
      </thead>
      <tbody>
        {report.diagnosaLabels.map((rowLabel, ri) => (
          <tr key={rowLabel}>
            <th
              scope="row"
              className="sticky left-0 z-[1] border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-left font-semibold text-slate-900"
            >
              {rowLabel}
            </th>
            {report.tindakanLabels.map((tindakanLabel, ci) => {
              const count = report.data[ri]?.[ci] ?? 0;
              const cellDetails = report.details[ri]?.[ci] ?? [];
              return (
                <td
                  key={`${rowLabel}:${tindakanLabel}`}
                  className={cn(
                    "border px-0.5 py-0.5 text-center tabular-nums transition-colors text-slate-800 border-slate-300 bg-white",
                    count > 0 && "cursor-pointer hover:bg-slate-100",
                  )}
                >
                  {count > 0 ? (
                    <button
                      type="button"
                      className="h-full w-full font-extrabold text-[#1B2B44] focus:outline-none"
                      onClick={(event) => {
                        onCellActivate?.({
                          title: `${rowLabel} | ${tindakanLabel}`,
                          patients: cellDetails,
                          trigger: event.currentTarget,
                          rowAxis: report.rowAxis,
                        });
                      }}
                    >
                      {count}
                    </button>
                  ) : (
                    ""
                  )}
                </td>
              );
            })}
            <td className="border border-slate-300 px-1 py-0.5 text-center font-extrabold tabular-nums bg-slate-50 text-slate-900">
              {report.rowTotals[ri] ?? 0}
            </td>
          </tr>
        ))}
        <tr className="bg-slate-100 font-extrabold text-slate-900">
          <th
            scope="row"
            className="sticky left-0 z-[1] border border-slate-300 px-1.5 py-0.5 text-left bg-slate-100 text-slate-900"
          >
            JUMLAH
          </th>
          {report.colTotals.map((count, ci) => (
            <td
              key={`total:${report.tindakanLabels[ci] ?? ci}`}
              className="border border-slate-300 px-1 py-0.5 text-center tabular-nums bg-slate-50 text-slate-900"
            >
              {count || ""}
            </td>
          ))}
          <td className="border border-slate-300 px-1 py-0.5 text-center bg-slate-100 text-slate-900">
            {report.grandTotal}
          </td>
        </tr>
      </tbody>
    </table>
    );
  },
);
ClinicalDiagnosisTable.displayName = "ClinicalDiagnosisTable";

function formatCell(n: number): string {
  return n === 0 ? "" : String(n);
}

export default function TindakanLaporanModal({
  open,
  onOpenChange,
  rows,
  loading,
  filterSummaryLines,
  pasienOptions = [],
  initialTab,
  onOpenDetail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  loading: boolean;
  filterSummaryLines: readonly string[];
  /** Master pasien (compact) — laporan cara bayar memakai jenis + kelas dari sini bila baris terhubung. */
  pasienOptions?: readonly PasienOption[];
  initialTab?: "jenis" | "kategori" | "cara" | "analisis" | "diagnosaKlinis";
  /** Buka drawer detail tindakan dari tabel Analisis (tab Klinis untuk isian diagnosa/dll). */
  onOpenDetail?: (
    row: TindakanJoinResult,
    initialTab?: WireframeTabId,
  ) => void;
}) {
  const lastAppliedInitialTabRef = useRef<string | null>(null);
  const {
    tab,
    setTab,
    monthYyyyMm,
    setMonthYyyyMm,
    searchQuery,
    setSearchQuery,
    analisisPage,
    setAnalisisPage,
    resetAnalisisPage,
    ym,
    finalMatrix,
    finalMatrixStatusBatal,
    filteredAnalisisRows,
    paginatedAnalisisRows,
    totalAnalisisPages,
    analisisStats,
    clinicalDiagnosisMatrix,
    clinicalMatrixAxis,
    setClinicalMatrixAxis,
    clinicalMatrixMeta,
    laporanCaraBelumTerisi,
    exportFileBase,
    buildExportHtml,
    buildExportWhatsApp,
    handleDownloadExcel,
    exportEmpty,
    analisisPageSize,
    filters,
    setFilters,
    resetFilters,
    filterOptions,
    activeFiltersCount,
  } = useTindakanLaporanReport({
    rows,
    pasienOptions,
    loading,
    filterSummaryLines,
    enabled: open,
  });

  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  useEffect(() => {
    resetAnalisisPage();
  }, [searchQuery, tab, resetAnalisisPage]);

  useEffect(() => {
    if (!open) {
      lastAppliedInitialTabRef.current = null;
      return;
    }
    if (
      initialTab &&
      lastAppliedInitialTabRef.current !== initialTab
    ) {
      setTab(initialTab);
      lastAppliedInitialTabRef.current = initialTab;
    }
  }, [open, initialTab, setTab]);

  const [matrixPopover, setMatrixPopover] = useState<MatrixPopoverState>(null);

  useEffect(() => {
    setMatrixPopover(null);
  }, [open, tab, monthYyyyMm, searchQuery, clinicalMatrixAxis]);

  const handleMatrixCellActivate = React.useCallback(
    (payload: {
      title: string;
      patients: MatrixPopoverPatient[];
      trigger: HTMLButtonElement;
      rowAxis?: ClinicalDiagnosisMatrixReport["rowAxis"];
    }) => {
      setMatrixPopover({
        title: payload.title,
        patients: payload.patients,
        anchor: payload.trigger,
        rowAxis: payload.rowAxis,
      });
    },
    [],
  );

  const mountPoint = typeof document !== "undefined" ? (document.fullscreenElement as HTMLElement || document.body) : null;

  if (!open || !mountPoint) return null;

  const content = (
    <AnimatePresence>
      <div
        className={cn(
          "fixed inset-0 pointer-events-none",
          UI_LAYERS.drawerPortal
        )}
        style={{ zIndex: Z_INDEX_VALUES.drawerPortal }}
      >
        {/* Backdrop */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          type="button"
          aria-label="Tutup laporan tindakan"
          className="absolute inset-0 bg-[#2D3748]/45 pointer-events-auto"
          onClick={() => onOpenChange(false)}
        />

        {/* Center Container */}
        <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none px-2 sm:px-4">
          <motion.div
            role="dialog"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 400,
              opacity: { duration: 0.15 }
            }}
            className={cn(
              "pointer-events-auto flex h-[85vh] max-h-[85vh] min-w-0 w-full max-w-[92rem] cursor-default flex-col rounded-2xl border antialiased [text-rendering:optimizeLegibility]",
              "border-slate-200 bg-white shadow-[0_24px_56px_rgba(15,23,42,0.3)] dark:border-white/10 dark:bg-[#0c0f17]",
              "font-[family-name:Inter,ui-sans-serif,system-ui,sans-serif]",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 border-b px-4 py-3 border-white/10 bg-gradient-to-r from-[#1B2B44] to-[#2D4A6E] rounded-t-2xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <FileSpreadsheet className="shrink-0 text-emerald-300" size={20} />
                  <span className="font-bold text-white text-sm tracking-wide">Laporan Tindakan Bulanan</span>
                </div>
                <div className="flex items-center gap-2">
                  <ReportExportActionBar
                    className="shrink-0 text-white"
                    disabled={loading || !ym}
                    empty={exportEmpty}
                    fileNameBase={exportFileBase}
                    buildHtml={buildExportHtml}
                    buildWhatsAppText={buildExportWhatsApp}
                    onDownloadExcel={handleDownloadExcel}
                  />
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="rounded-lg border border-white/20 bg-white/10 p-1.5 text-slate-100 hover:border-white/35 hover:bg-white/20 hover:text-white"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 overflow-y-auto bg-slate-50">
              <div
                className={cn(
                  "flex shrink-0 flex-wrap items-center gap-4 rounded-xl border p-2 mb-4 bg-gradient-to-b from-[#E6ECF5] to-[#D3DFF0] border-slate-300 shadow-sm",
                )}
              >
                <div className="flex rounded-lg border border-slate-300 bg-white/90 p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setTab("jenis")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-extrabold transition",
                      tab === "jenis"
                        ? "bg-[#1B2B44] text-white shadow-sm"
                        : "text-slate-600 hover:bg-[#DDE6F2]",
                    )}
                  >
                    Prosedur (Detail)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("kategori")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-extrabold transition",
                      tab === "kategori"
                        ? "bg-[#1B2B44] text-white shadow-sm"
                        : "text-slate-600 hover:bg-[#DDE6F2]",
                    )}
                  >
                    Kategori (Grup)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("cara")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-extrabold transition",
                      tab === "cara"
                        ? "bg-[#1B2B44] text-white shadow-sm"
                        : "text-slate-600 hover:bg-[#DDE6F2]",
                    )}
                  >
                    Cara bayar
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("diagnosaKlinis")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-extrabold transition",
                      tab === "diagnosaKlinis"
                        ? "bg-[#1B2B44] text-white shadow-sm"
                        : "text-slate-600 hover:bg-[#DDE6F2]",
                    )}
                  >
                    Diagnosa Klinis
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("analisis")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-extrabold transition",
                      tab === "analisis"
                        ? "bg-[#1B2B44] text-white shadow-sm"
                        : "text-slate-600 hover:bg-[#DDE6F2]",
                    )}
                  >
                    Analisis Gabungan
                  </button>
                </div>

                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Bulan laporan
                  </span>
                  <input
                    type="month"
                    value={monthYyyyMm}
                    onChange={(e) => setMonthYyyyMm(e.target.value)}
                    className={cn(
                      "rounded-md border px-2 py-1 text-[11px] font-bold font-mono h-7",
                      "border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b2b44]/25",
                    )}
                  />
                </label>

                {/* Filter Popover Dropdown */}
                <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                  <PopoverAnchor>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        Saring Kustom
                      </span>
                      <button
                        type="button"
                        onClick={() => setFilterPopoverOpen(true)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-3 py-1 text-[11px] font-bold h-7 transition",
                          activeFiltersCount > 0
                            ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-[#DDE6F2]"
                        )}
                      >
                        <Activity size={12} />
                        <span>Filter {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ""}</span>
                      </button>
                    </div>
                  </PopoverAnchor>
                  <PopoverContent
                    className="w-[340px] p-3 text-slate-900 dark:text-slate-900 bg-white dark:bg-white border border-slate-300 dark:border-slate-300 shadow-xl rounded-xl z-[100060]"
                    style={{ zIndex: 100060 }}
                    sideOffset={6}
                    align="start"
                  >
                    <div className="flex items-center justify-between border-b pb-2 mb-2 border-slate-200">
                      <h4 className="font-extrabold text-[12px] text-slate-900 flex items-center gap-1.5">
                        <Activity size={14} className="text-[#1B2B44]" /> Multi-Criteria Filter
                      </h4>
                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline"
                        >
                          Reset Semua
                        </button>
                      )}
                    </div>

                    <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1 text-[11px] text-slate-800">
                      {/* Utama: Tindakan & Diagnosa */}
                      <div className="space-y-2">
                        <span className="font-bold text-[10px] uppercase text-slate-500 tracking-wider block">Layanan Utama</span>
                        <div>
                          <label className="block font-bold text-[10px] text-slate-600 mb-1">Tindakan</label>
                          <div className="w-full h-24 overflow-y-auto border border-slate-200 bg-slate-50 text-slate-800 rounded-md p-1.5 space-y-1">
                            {filterOptions.tindakan.map((t) => {
                              const isChecked = filters.tindakan.includes(t);
                              return (
                                <label key={t} className="flex items-center gap-2 cursor-pointer hover:bg-slate-200/60 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-800">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setFilters((prev) => {
                                        const next = isChecked
                                          ? prev.tindakan.filter((x) => x !== t)
                                          : [...prev.tindakan, t];
                                        return { ...prev, tindakan: next };
                                      });
                                    }}
                                    className="rounded border-slate-300 text-[#1B2B44] focus:ring-[#1B2B44]/25 h-3 w-3 cursor-pointer"
                                  />
                                  <span>{t}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="block font-bold text-[10px] text-slate-600 mb-1">Diagnosa</label>
                          <div className="w-full h-24 overflow-y-auto border border-slate-200 bg-slate-50 text-slate-800 rounded-md p-1.5 space-y-1">
                            {filterOptions.diagnosa.map((d) => {
                              const isChecked = filters.diagnosa.includes(d);
                              return (
                                <label key={d} className="flex items-center gap-2 cursor-pointer hover:bg-slate-200/60 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-800">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setFilters((prev) => {
                                        const next = isChecked
                                          ? prev.diagnosa.filter((x) => x !== d)
                                          : [...prev.diagnosa, d];
                                        return { ...prev, diagnosa: next };
                                      });
                                    }}
                                    className="rounded border-slate-300 text-[#1B2B44] focus:ring-[#1B2B44]/25 h-3 w-3 cursor-pointer"
                                  />
                                  <span>{d}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Tim Medis */}
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <span className="font-bold text-[10px] uppercase text-slate-500 tracking-wider block">Tim Medis</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-[10px] text-slate-600 mb-1">Dokter Operator</label>
                            <div className="w-full h-24 overflow-y-auto border border-slate-200 bg-slate-50 text-slate-800 rounded-md p-1.5 space-y-1">
                              {filterOptions.dokter.map((doc) => {
                                const isChecked = filters.dokter.includes(doc);
                                return (
                                  <label key={doc} className="flex items-center gap-2 cursor-pointer hover:bg-slate-200/60 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-800">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        setFilters((prev) => {
                                          const next = isChecked
                                            ? prev.dokter.filter((x) => x !== doc)
                                            : [...prev.dokter, doc];
                                          return { ...prev, dokter: next };
                                        });
                                      }}
                                      className="rounded border-slate-300 text-[#1B2B44] focus:ring-[#1B2B44]/25 h-3 w-3 cursor-pointer"
                                    />
                                    <span className="truncate" title={doc}>{doc}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <label className="block font-bold text-[10px] text-slate-600 mb-1">Asisten</label>
                            <div className="w-full h-24 overflow-y-auto border border-slate-200 bg-slate-50 text-slate-800 rounded-md p-1.5 space-y-1">
                              {filterOptions.asisten.map((as) => {
                                const isChecked = filters.asisten.includes(as);
                                return (
                                  <label key={as} className="flex items-center gap-2 cursor-pointer hover:bg-slate-200/60 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-800">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        setFilters((prev) => {
                                          const next = isChecked
                                            ? prev.asisten.filter((x) => x !== as)
                                            : [...prev.asisten, as];
                                          return { ...prev, asisten: next };
                                        });
                                      }}
                                      className="rounded border-slate-300 text-[#1B2B44] focus:ring-[#1B2B44]/25 h-3 w-3 cursor-pointer"
                                    />
                                    <span className="truncate" title={as}>{as}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dokumen & Lokasi */}
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <span className="font-bold text-[10px] uppercase text-slate-500 tracking-wider block">Administrasi & Lokasi</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-[10px] text-slate-600 mb-1">Ruangan / Lab</label>
                            <div className="w-full h-20 overflow-y-auto border border-slate-200 bg-slate-50 text-slate-800 rounded-md p-1.5 space-y-1">
                              {filterOptions.ruangan.map((r) => {
                                const isChecked = filters.ruangan.includes(r);
                                return (
                                  <label key={r} className="flex items-center gap-2 cursor-pointer hover:bg-slate-200/60 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-800">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        setFilters((prev) => {
                                          const next = isChecked
                                            ? prev.ruangan.filter((x) => x !== r)
                                            : [...prev.ruangan, r];
                                          return { ...prev, ruangan: next };
                                        });
                                      }}
                                      className="rounded border-slate-300 text-[#1B2B44] focus:ring-[#1B2B44]/25 h-3 w-3 cursor-pointer"
                                    />
                                    <span className="truncate" title={r}>{r}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <label className="block font-bold text-[10px] text-slate-600 mb-1">PDF Laporan</label>
                            <select
                              value={filters.hasPdfReport === null ? "semua" : String(filters.hasPdfReport)}
                              onChange={(e) => {
                                const val = e.target.value === "semua" ? null : e.target.value === "true";
                                setFilters((prev) => ({ ...prev, hasPdfReport: val }));
                              }}
                              className="w-full rounded border p-1 bg-white text-slate-900 border-slate-300 font-bold focus:outline-none text-[11px]"
                            >
                              <option value="semua">Semua Dokumen</option>
                              <option value="true">Ada PDF</option>
                              <option value="false">Tidak ada PDF</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Presets Cepat */}
                      <div className="pt-2 border-t border-slate-200">
                        <span className="font-bold text-[10px] uppercase text-slate-500 tracking-wider block mb-1">Preset Cepat</span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { id: "semua", label: "Semua Kasus" },
                            { id: "belum_lengkap", label: "Belum Lengkap" },
                            { id: "kompleks", label: "Kasus Kompleks" },
                            { id: "batal", label: "Tindakan Batal" },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setFilters((prev) => ({ ...prev, statusKelengkapan: item.id as any }))}
                              className={cn(
                                "rounded px-2 py-0.5 text-[9px] font-extrabold border transition-all",
                                filters.statusKelengkapan === item.id
                                  ? "bg-[#1B2B44] text-white border-[#1B2B44]"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                              )}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setFilterPopoverOpen(false)}
                        className="rounded bg-[#1B2B44] hover:bg-[#2D4A6E] text-white font-extrabold px-3 py-1.5 text-[11px] shadow-sm transition-colors"
                      >
                        Selesai
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Search Bar */}
                <div className="flex flex-1 flex-col gap-0.5 min-w-[200px]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Cari Tindakan / Kategori / Diagnosa
                  </span>
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Ketik nama tindakan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(
                        "w-full rounded-md border py-1 pl-8 pr-2 text-[11px] font-bold h-7 focus:outline-none focus:ring-2 focus:ring-[#1b2b44]/25",
                        "border-slate-300 bg-white text-slate-900",
                      )}
                    />
                  </div>
                </div>
              </div>

              {tab === "diagnosaKlinis" ? (
                <div
                  className={cn(
                    "flex shrink-0 flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1 mb-4 bg-gradient-to-b from-[#E6ECF5] to-[#D3DFF0] border-slate-300 shadow-sm",
                  )}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Berdasarkan
                  </span>
                  <div className="flex rounded-lg border border-slate-300 bg-white/90 p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setClinicalMatrixAxis("diagnosa")}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[11px] font-extrabold transition",
                        clinicalMatrixAxis === "diagnosa"
                          ? "bg-[#1B2B44] text-white shadow-sm"
                          : "text-slate-600 hover:bg-[#DDE6F2]",
                      )}
                    >
                      Diagnosa Klinis
                    </button>
                    <button
                      type="button"
                      onClick={() => setClinicalMatrixAxis("faktorRisiko")}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[11px] font-extrabold transition",
                        clinicalMatrixAxis === "faktorRisiko"
                          ? "bg-[#1B2B44] text-white shadow-sm"
                          : "text-slate-600 hover:bg-[#DDE6F2]",
                      )}
                    >
                      Faktor Risiko
                    </button>
                  </div>
                </div>
              ) : null}

              {tab === "cara" && laporanCaraBelumTerisi.count > 0 ? (
                <div
                  role="status"
                  className={cn(
                    "shrink-0 rounded-lg border px-3 py-2 text-[11px] font-semibold leading-snug mb-4",
                    laporanCaraBelumTerisi.strong
                      ? "border-amber-500/80 bg-amber-100/90 text-amber-950 dark:border-amber-400/60 dark:bg-amber-950/50 dark:text-white"
                      : "border-slate-300/80 bg-slate-100/80 text-slate-800 dark:border-white/20 dark:bg-white/10 dark:text-white",
                  )}
                >
                  {laporanCaraBelumTerisi.count} kasus dalam periode ini tidak punya
                  jenis/kelas pembiayaan yang terbaca (kosong di tindakan dan tidak
                  terisi di master pasien, atau tidak terhubung ke master). Mereka
                  masuk baris{" "}
                  <span className="font-extrabold">
                    {CARA_BAYAR_LABEL_BELUM_TERISI}
                  </span>
                  , bukan UMUM. Lengkapi data pasien (jenis pembiayaan + kelas) atau
                  hubungkan kasus ke RM / pasien_id agar laporan akurat.
                  {laporanCaraBelumTerisi.strong ? (
                    <span className="mt-1 block font-extrabold">
                      Proporsi besar — periksa master pasien and tautan kasus.
                    </span>
                  ) : null}
                  {laporanCaraBelumTerisi.rmList.length > 0 ? (
                    <div className="mt-2 border-t border-current/15 pt-2 dark:border-white/15">
                      <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wide opacity-90">
                        RM / pasien (data belum lengkap)
                      </div>
                      <ul
                        className={cn(
                          "max-h-32 space-y-1 overflow-y-auto pr-1 text-left",
                          "scrollbar-thin scrollbar-thumb-slate-400/50 dark:scrollbar-thumb-white/25",
                        )}
                      >
                        {laporanCaraBelumTerisi.rmList.map((item) => (
                          <li
                            key={item.key}
                            className="break-words tabular-nums text-[11px] font-semibold leading-snug"
                          >
                            <span className="font-mono text-emerald-800 dark:text-emerald-300">
                              {item.rmLabel}
                            </span>
                            <span className="text-slate-600 dark:text-white/80">
                              {" "}
                              · {item.nama}
                              {item.kasus > 1 ? (
                                <span className="opacity-80"> ({item.kasus} kasus)</span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {filterSummaryLines.length > 0 ? (
                <ul
                  className={cn(
                    "shrink-0 list-inside list-disc text-[11px] font-semibold mb-4",
                    "text-slate-600 dark:text-white/85",
                  )}
                >
                  {filterSummaryLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}

              <div
                className={cn(
                  "min-h-0 flex-1 rounded-lg border border-slate-200/80 dark:border-white/10 flex flex-col",
                  tab !== "analisis" ? "overflow-auto" : "overflow-hidden"
                )}
              >
                {loading ? (
                  <div className="p-6 text-center text-sm font-semibold text-slate-600 dark:text-white/60">
                    Memuat data…
                  </div>
                ) : !ym || (tab !== "analisis" && tab !== "diagnosaKlinis" && !finalMatrix) ? (
                  <div className="p-6 text-center text-sm font-semibold text-slate-600 dark:text-white/60">
                    Pilih bulan yang valid.
                  </div>
                ) : tab === "diagnosaKlinis" ? (
                  !clinicalDiagnosisMatrix || clinicalDiagnosisMatrix.grandTotal === 0 ? (
                    <div className="p-6 text-center text-sm font-semibold text-slate-600 dark:text-white/60">
                      {clinicalMatrixMeta.emptyMessage}
                    </div>
                  ) : (
                    <div className="overflow-auto">
                      <ClinicalDiagnosisTable
                        report={clinicalDiagnosisMatrix}
                        onCellActivate={handleMatrixCellActivate}
                      />
                    </div>
                  )
                ) : tab === "analisis" ? (
                  <div className="flex flex-col gap-3 flex-1 min-h-0 p-3">
                    {analisisStats && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 shrink-0">
                        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <Users size={12} className="text-[#1B2B44]" />
                            Total Pasien
                          </div>
                          <div className="text-lg font-black tabular-nums text-slate-900">
                            {analisisStats.total}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            Selesai
                          </div>
                          <div className="flex items-baseline gap-2">
                            <div className="text-lg font-black tabular-nums text-slate-900">
                              {analisisStats.selesai}
                            </div>
                            <div className="text-[10px] font-bold text-emerald-600">
                              {analisisStats.successRate}%
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <Stethoscope size={12} className="text-[#1B2B44]" />
                            Top Dokter
                          </div>
                          <div className="truncate text-[11px] font-black text-slate-900" title={analisisStats.topDoctor?.[0]}>
                            {analisisStats.topDoctor?.[0] || "-"}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                            {analisisStats.topDoctor?.[1] || 0} Kasus
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <Activity size={12} className="text-[#1B2B44]" />
                            Insight
                          </div>
                          <div className="text-[10px] font-bold leading-tight text-slate-600">
                            {searchQuery.trim() ? `Filter: "${searchQuery}"` : "Semua data bulan ini"}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="h-[38vh] overflow-auto rounded border border-slate-200 bg-white">
                      <AnalisisTable
                        rows={paginatedAnalisisRows}
                        onOpenDetail={onOpenDetail}
                      />
                    </div>
                    
                    {totalAnalisisPages > 1 && (
                      <div className="flex items-center justify-between border-t border-slate-200/60 p-2 dark:border-white/5 shrink-0">
                        <div className="text-[10px] font-medium text-slate-500 dark:text-white/40">
                          Menampilkan {((analisisPage - 1) * analisisPageSize) + 1} - {Math.min(analisisPage * analisisPageSize, filteredAnalisisRows.length)} dari {filteredAnalisisRows.length} data
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setAnalisisPage(p => Math.max(1, p - 1))}
                            disabled={analisisPage === 1}
                            className="rounded border border-slate-200 p-1 hover:bg-slate-100 disabled:opacity-30 dark:border-white/10 dark:hover:bg-white/5"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <div className="text-[11px] font-bold px-2">
                            {analisisPage} / {totalAnalisisPages}
                          </div>
                          <button
                            onClick={() => setAnalisisPage(p => Math.min(totalAnalisisPages, p + 1))}
                            disabled={analisisPage === totalAnalisisPages}
                            className="rounded border border-slate-200 p-1 hover:bg-slate-100 disabled:opacity-30 dark:border-white/10 dark:hover:bg-white/5"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : finalMatrix ? (
                  <div className="flex flex-col gap-4">
                    {tab === "jenis" && (
                      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm w-fit">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
                            <Users size={14} />
                          </div>
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Prosedur Selesai</div>
                            <div className="text-xs font-black text-slate-800 tabular-nums">{finalMatrix?.grandTotal ?? 0} Pasien</div>
                          </div>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-red-50 p-1.5 text-red-600">
                            <Users size={14} />
                          </div>
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tindakan Batal</div>
                            <div className="text-xs font-black text-slate-800 tabular-nums">{finalMatrixStatusBatal?.grandTotal ?? 0} Pasien</div>
                          </div>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
                            <Users size={14} />
                          </div>
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">Total Pasien</div>
                            <div className="text-xs font-black text-indigo-700 tabular-nums">
                              {(finalMatrix?.grandTotal ?? 0) + (finalMatrixStatusBatal?.grandTotal ?? 0)} Pasien
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <LaporanMatrixTable
                      matrix={finalMatrix}
                      yAxisHeader={
                        tab === "jenis"
                          ? "PROSEDUR (DETAIL)"
                          : tab === "kategori"
                            ? "KATEGORI (GRUP)"
                            : "CARA BAYAR"
                      }
                      onCellActivate={handleMatrixCellActivate}
                    />
                    {tab === "jenis" &&
                    finalMatrixStatusBatal &&
                    finalMatrixStatusBatal.rowLabels.length > 0 ? (
                      <div className="flex flex-col gap-2 border-t border-slate-200/80 pt-4 dark:border-white/10">
                        <h3 className="sticky left-0 text-[11px] font-extrabold uppercase tracking-wide text-red-700 dark:text-red-300">
                          Status Batal / Dibatalkan
                        </h3>
                        <LaporanMatrixTable
                          matrix={finalMatrixStatusBatal}
                          yAxisHeader="STATUS BATAL"
                          onCellActivate={handleMatrixCellActivate}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
        <MatrixCellPopover
          state={matrixPopover}
          onOpenChange={(next) => {
            if (!next) setMatrixPopover(null);
          }}
        />
      </div>
    </AnimatePresence>
  );

  return createPortal(content, mountPoint);
}
