"use client";

import { memo, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  Stethoscope,
  Users,
} from "lucide-react";

import type { PasienOption } from "@/components/ui/pasien-combobox";
import type { TindakanJoinResult } from "@/app/dashboard/layanan/tindakan/bridge/mapping.types";
import ReportExportActionBar from "@/app/dashboard/layanan/tindakan/components/ReportExportActionBar";
import {
  useTindakanLaporanReport,
  type TindakanLaporanTab,
} from "@/app/dashboard/layanan/tindakan/hooks/useTindakanLaporanReport";
import {
  CARA_BAYAR_LABEL_BELUM_TERISI,
  weekdaySun0Wib,
  type MonthlyMatrixAgg,
} from "@/app/dashboard/layanan/tindakan/lib/tindakanBulananMatrix";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UI_LAYERS } from "@/lib/ui/layers";
import { cn } from "@/lib/utils";

import JarvisModeGlassPanel from "./JarvisModeGlassPanel";

type Props = {
  rows: readonly TindakanJoinResult[];
  pasienOptions?: readonly PasienOption[];
  loading?: boolean;
};

function formatCell(n: number): string {
  return n === 0 ? "" : String(n);
}

const TAB_ITEMS: { id: TindakanLaporanTab; label: string }[] = [
  { id: "jenis", label: "Prosedur" },
  { id: "kategori", label: "Kategori" },
  { id: "cara", label: "Bayar" },
  { id: "analisis", label: "Analisis" },
];

function MatrixTable({
  matrix,
  rowHeader,
  roomyRows = false,
}: {
  matrix: MonthlyMatrixAgg;
  rowHeader: string;
  roomyRows?: boolean;
}) {
  const cellPad = roomyRows ? "px-0.5 py-1" : "px-0.5 py-0.5";
  const headRowPad = roomyRows ? "px-1.5 py-1" : "px-1.5 py-0.5";

  return (
    <table className="w-max min-w-full border-collapse text-[8px]">
      <thead>
        <tr className="bg-cyan-950/40">
          <th
            rowSpan={2}
            className="sticky left-0 z-[2] border border-cyan-500/25 bg-[#061018] px-1.5 py-1 text-left text-[9px] font-bold uppercase tracking-wide text-cyan-200"
          >
            {rowHeader}
          </th>
          <th
            colSpan={matrix.daysInMonth}
            className="border border-cyan-500/25 px-1 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white/90"
          >
            Tanggal
          </th>
          <th
            rowSpan={2}
            className="border border-cyan-500/25 px-1.5 py-1 text-center text-[9px] font-bold uppercase text-amber-200"
          >
            Jumlah
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
                  "border border-cyan-500/20 px-0.5 py-0.5 text-center font-mono text-[9px] font-bold tabular-nums text-white/85",
                  wkend && "bg-amber-950/35 text-amber-100/90",
                )}
              >
                {day}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {matrix.rowLabels.map((label, ri) => (
          <tr key={label}>
            <th
              scope="row"
              className={cn(
                "sticky left-0 z-[1] border border-cyan-500/20 bg-[#07121c] text-left font-semibold text-white dark:text-white",
                headRowPad,
                label.includes("PPCI") && "text-amber-200",
              )}
            >
              {label}
            </th>
            {(matrix.data[ri] ?? []).map((c, di) => {
              const day = di + 1;
              const wd = weekdaySun0Wib(
                matrix.year,
                matrix.month1to12,
                day,
              );
              const wkend = wd === 0 || wd === 6;
              const detailPasien = matrix.details?.[ri]?.[di] ?? [];

              return (
                <td
                  key={di}
                  className={cn(
                    "border border-cyan-500/15 text-center font-mono tabular-nums text-white/90",
                    cellPad,
                    wkend && "bg-amber-950/25",
                    c > 0 && "font-bold text-cyan-100",
                  )}
                >
                  {c > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="h-full w-full focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60"
                        >
                          {formatCell(c)}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className={cn(
                          "w-56 border-cyan-500/30 bg-[#0a1520] p-2 text-[10px] text-white",
                          UI_LAYERS.jarvisModePopover,
                        )}
                      >
                        <div className="mb-1 border-b border-cyan-500/20 pb-1 font-bold text-cyan-300">
                          {label} — Tgl {day}
                        </div>
                        <ul className="max-h-28 overflow-y-auto">
                          {detailPasien.length > 0 ? (
                            detailPasien.map((p, pi) => (
                              <li
                                key={pi}
                                className="border-b border-white/10 py-1 last:border-0"
                              >
                                <div className="font-semibold text-cyan-200">
                                  {p.nama} | {p.tindakan || "—"}
                                </div>
                                <div className="text-[9px] text-white/75">
                                  RM: {p.no_rm} · Dr: {p.dokter}
                                </div>
                              </li>
                            ))
                          ) : (
                            <li className="py-1 italic text-white/50">
                              Detail tidak tersedia
                            </li>
                          )}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    formatCell(c)
                  )}
                </td>
              );
            })}
            <td className="border border-cyan-500/20 px-1 py-0.5 text-center font-mono font-bold tabular-nums text-amber-200">
              {formatCell(matrix.rowTotals[ri] ?? 0)}
            </td>
          </tr>
        ))}
        <tr className="bg-cyan-950/50 font-bold">
          <th
            scope="row"
            className={cn(
              "sticky left-0 z-[1] border border-cyan-500/25 bg-[#061018] text-left text-amber-200",
              headRowPad,
            )}
          >
            JUMLAH
          </th>
          {matrix.colTotals.map((c, di) => {
            const day = di + 1;
            const wd = weekdaySun0Wib(matrix.year, matrix.month1to12, day);
            const wkend = wd === 0 || wd === 6;
            return (
              <td
                key={di}
                className={cn(
                  "border border-cyan-500/20 text-center font-mono tabular-nums text-white",
                  cellPad,
                  wkend && "bg-amber-950/30",
                )}
              >
                {formatCell(c)}
              </td>
            );
          })}
          <td className="border border-cyan-500/25 px-1 py-0.5 text-center font-mono font-extrabold tabular-nums text-amber-300">
            {matrix.grandTotal}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function JarvisModeLaporanTindakanInner({
  rows,
  pasienOptions = [],
  loading = false,
}: Props) {
  const report = useTindakanLaporanReport({
    rows,
    pasienOptions,
    loading,
    filterSummaryLines: ["JARVIS Mode — snapshot data Cath Lab"],
  });

  useEffect(() => {
    report.resetAnalisisPage();
  }, [report.searchQuery, report.tab, report.resetAnalisisPage]);

  const handleTabChange = (next: TindakanLaporanTab) => {
    report.setTab(next);
    report.resetAnalisisPage();
  };

  return (
    <JarvisModeGlassPanel
      title="Laporan"
      accent="cyan"
      dragHandle
      className="h-full"
      compact
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-1"
    >
      <div className="flex h-full min-h-0 flex-col gap-1">
        <div className="flex shrink-0 flex-wrap items-center gap-1 rounded border border-cyan-500/20 bg-black/25 p-1">
          <div className="flex flex-wrap rounded border border-cyan-500/25 bg-black/30 p-0.5">
            {TAB_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "rounded px-1 py-0.5 text-[7px] font-extrabold transition",
                  report.tab === item.id
                    ? "bg-cyan-600 text-white"
                    : "text-white/75 hover:bg-white/10 dark:text-white/85",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <input
            type="month"
            value={report.monthYyyyMm}
            onChange={(e) => report.setMonthYyyyMm(e.target.value)}
            className="rounded border border-cyan-500/30 bg-black/40 px-1 py-0.5 font-mono text-[8px] text-white [color-scheme:dark]"
            title="Bulan laporan"
          />

          <div className="relative min-w-[64px] flex-1">
            <Search
              className="pointer-events-none absolute left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-cyan-400/70"
              aria-hidden
            />
            <input
              type="search"
              value={report.searchQuery}
              onChange={(e) => report.setSearchQuery(e.target.value)}
              placeholder="Cari…"
              className="w-full rounded border border-cyan-500/25 bg-black/40 py-0.5 pl-5 pr-1 text-[8px] text-white placeholder:text-white/50"
            />
          </div>

          <ReportExportActionBar
            disabled={loading || !report.ym}
            empty={report.exportEmpty}
            fileNameBase={report.exportFileBase}
            buildHtml={report.buildExportHtml}
            buildWhatsAppText={report.buildExportWhatsApp}
            onDownloadExcel={report.handleDownloadExcel}
            className="shrink-0"
          />
        </div>

        {report.tab === "cara" && report.laporanCaraBelumTerisi.count > 0 ? (
          <div
            role="status"
            className={cn(
              "shrink-0 rounded border px-2 py-1 text-[8px] font-semibold leading-snug text-white dark:text-white",
              report.laporanCaraBelumTerisi.strong
                ? "border-amber-500/60 bg-amber-950/40"
                : "border-cyan-500/25 bg-black/30",
            )}
          >
            {report.laporanCaraBelumTerisi.count} kasus masuk baris{" "}
            <span className="font-extrabold">{CARA_BAYAR_LABEL_BELUM_TERISI}</span>
            , bukan UMUM.
          </div>
        ) : null}

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-cyan-500/20 bg-[#061018]/80",
            report.tab === "analisis" && "jarvis-matrix-scroll overflow-y-auto",
          )}
        >
          <div
            className={cn(
              "min-h-0 flex-1",
              report.tab !== "analisis" &&
                "jarvis-matrix-scroll overflow-x-auto overflow-y-auto",
            )}
          >
          {loading ? (
            <p className="p-3 text-center text-[10px] text-white/70">
              Memuat data…
            </p>
          ) : !report.ym ? (
            <p className="p-3 text-center text-[10px] text-white/70">
              Pilih bulan yang valid.
            </p>
          ) : report.tab === "analisis" ? (
            <div className="flex flex-col gap-1.5 p-1.5">
              {report.analisisStats ? (
                <div className="grid shrink-0 grid-cols-2 gap-1 sm:grid-cols-4">
                  <div className="rounded border border-cyan-500/20 bg-black/30 p-1.5">
                    <div className="flex items-center gap-1 text-[7px] font-bold uppercase text-white/60">
                      <Users className="h-2.5 w-2.5 text-cyan-400" />
                      Total
                    </div>
                    <div className="text-sm font-black tabular-nums text-white">
                      {report.analisisStats.total}
                    </div>
                  </div>
                  <div className="rounded border border-cyan-500/20 bg-black/30 p-1.5">
                    <div className="flex items-center gap-1 text-[7px] font-bold uppercase text-white/60">
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                      Selesai
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-white">
                        {report.analisisStats.selesai}
                      </span>
                      <span className="text-[8px] font-bold text-emerald-400">
                        {report.analisisStats.successRate}%
                      </span>
                    </div>
                  </div>
                  <div className="rounded border border-cyan-500/20 bg-black/30 p-1.5">
                    <div className="flex items-center gap-1 text-[7px] font-bold uppercase text-white/60">
                      <Stethoscope className="h-2.5 w-2.5 text-cyan-400" />
                      Top Dokter
                    </div>
                    <div
                      className="truncate text-[9px] font-bold text-white"
                      title={report.analisisStats.topDoctor?.[0]}
                    >
                      {report.analisisStats.topDoctor?.[0] || "—"}
                    </div>
                  </div>
                  <div className="rounded border border-cyan-500/20 bg-black/30 p-1.5">
                    <div className="flex items-center gap-1 text-[7px] font-bold uppercase text-white/60">
                      <Activity className="h-2.5 w-2.5 text-cyan-400" />
                      Filter
                    </div>
                    <div className="text-[8px] font-semibold text-white/80">
                      {report.searchQuery.trim()
                        ? `"${report.searchQuery}"`
                        : "Semua bulan ini"}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="overflow-x-auto jarvis-matrix-scroll">
                <table className="w-full border-collapse text-[9px]">
                  <thead className="sticky top-0 z-[1] bg-[#061018]">
                    <tr>
                      {["Tgl", "Pasien", "Tindakan", "Dokter", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            className="border border-cyan-500/20 px-1 py-1 text-left font-bold text-white/90"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {report.paginatedAnalisisRows.length > 0 ? (
                      report.paginatedAnalisisRows.map((r, idx) => (
                        <tr
                          key={r.id ? String(r.id) : idx}
                          className="hover:bg-cyan-950/30"
                        >
                          <td className="border border-cyan-500/15 px-1 py-0.5 text-white/85">
                            {r.tanggal
                              ? new Intl.DateTimeFormat("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                }).format(new Date(r.tanggal))
                              : "—"}
                          </td>
                          <td className="border border-cyan-500/15 px-1 py-0.5">
                            <div className="font-bold text-cyan-200">
                              {r.nama_pasien || "—"}
                            </div>
                            <div className="text-[8px] text-white/60">
                              RM: {r.no_rm || "—"}
                            </div>
                          </td>
                          <td className="border border-cyan-500/15 px-1 py-0.5 text-white/90">
                            {r.tindakan || "—"}
                          </td>
                          <td className="border border-cyan-500/15 px-1 py-0.5 text-white/85">
                            {r.dokter || "—"}
                          </td>
                          <td className="border border-cyan-500/15 px-1 py-0.5 text-white/85">
                            {r.status || "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-4 text-center italic text-white/50"
                        >
                          Tidak ada data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {report.totalAnalisisPages > 1 ? (
                <div className="flex shrink-0 items-center justify-between border-t border-cyan-500/20 pt-1">
                  <span className="text-[8px] text-white/60">
                    {((report.analisisPage - 1) * report.analisisPageSize) + 1}
                    –
                    {Math.min(
                      report.analisisPage * report.analisisPageSize,
                      report.filteredAnalisisRows.length,
                    )}{" "}
                    / {report.filteredAnalisisRows.length}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        report.setAnalisisPage((p) => Math.max(1, p - 1))
                      }
                      disabled={report.analisisPage === 1}
                      className="rounded border border-cyan-500/30 p-0.5 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-3 w-3 text-white" />
                    </button>
                    <span className="px-1 text-[9px] font-bold text-white">
                      {report.analisisPage}/{report.totalAnalisisPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        report.setAnalisisPage((p) =>
                          Math.min(report.totalAnalisisPages, p + 1),
                        )
                      }
                      disabled={
                        report.analisisPage === report.totalAnalisisPages
                      }
                      className="rounded border border-cyan-500/30 p-0.5 disabled:opacity-30"
                    >
                      <ChevronRight className="h-3 w-3 text-white" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : !report.finalMatrix ||
            report.finalMatrix.rowLabels.length === 0 ? (
            <p className="p-3 text-center text-[10px] text-white/70">
              Belum ada data pada bulan ini.
            </p>
          ) : (
            <MatrixTable
              matrix={report.finalMatrix}
              rowHeader={report.matrixRowHeader}
              roomyRows={report.finalMatrix.rowLabels.length <= 11}
            />
          )}
          </div>
          {report.tab !== "analisis" &&
          report.finalMatrix &&
          report.finalMatrix.rowLabels.length > 0 ? (
            <div className="shrink-0 border-t border-cyan-500/25 bg-cyan-950/40 px-2 py-0.5 text-[8px] font-semibold text-white/85">
              <span className="text-cyan-200">{report.monthYyyyMm}</span>
              <span className="text-white/50"> · </span>
              Total{" "}
              <span className="font-mono font-bold text-amber-200">
                {report.finalMatrix.grandTotal}
              </span>{" "}
              tindakan
            </div>
          ) : null}
        </div>
      </div>
    </JarvisModeGlassPanel>
  );
}

export default memo(JarvisModeLaporanTindakanInner);
