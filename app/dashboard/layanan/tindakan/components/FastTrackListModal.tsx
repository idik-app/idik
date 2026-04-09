"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
} from "lucide-react";
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
import {
  canonicalDoctorStoredValue,
  type DoctorOption,
} from "@/components/ui/doctor-combobox";
import ReportExportActionBar from "./ReportExportActionBar";
import { parseFastTrackFotosUrls } from "../lib/fastTrackFotos";
import {
  buildFastTrackReportHtml,
  buildFastTrackWhatsAppText,
  type FastTrackReportFilters,
} from "../lib/tindakanReportTemplates";

function currentMonthYyyyMmWib(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function parseEpochMs(raw: unknown): number | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const d = Date.parse(t);
  return Number.isFinite(d) ? d : null;
}

function formatWaktuDisplay(raw: string | null | undefined): string {
  const t = String(raw ?? "").trim();
  if (!t) return "—";
  const ms = parseEpochMs(t);
  if (ms == null) return t;
  return format(new Date(ms), "d MMM yyyy, HH:mm", { locale: idLocale });
}

function tanggalYyyyMm(raw: unknown): string {
  const t = String(raw ?? "").trim();
  if (t.length >= 7) return t.slice(0, 7);
  return "";
}

export default function FastTrackListModal({
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
  const [monthYyyyMm, setMonthYyyyMm] = useState(currentMonthYyyyMmWib);
  const [filterDokter, setFilterDokter] = useState("");
  const [filterTindakan, setFilterTindakan] = useState("");
  const [igdFrom, setIgdFrom] = useState("");
  const [igdTo, setIgdTo] = useState("");
  const [d2bFrom, setD2bFrom] = useState("");
  const [d2bTo, setD2bTo] = useState("");
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset ke halaman 1 setiap kali filter berubah
  useMemo(() => {
    setCurrentPage(1);
  }, [
    monthYyyyMm,
    filterDokter,
    filterTindakan,
    igdFrom,
    igdTo,
    d2bFrom,
    d2bTo,
  ]);

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

  const tindakanOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const t = String(r.tindakan ?? "").trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  const igdFromMs = igdFrom.trim() ? Date.parse(igdFrom) : null;
  const igdToMs = igdTo.trim() ? Date.parse(igdTo) : null;
  const d2bFromMs = d2bFrom.trim() ? Date.parse(d2bFrom) : null;
  const d2bToMs = d2bTo.trim() ? Date.parse(d2bTo) : null;

  const filteredRows = useMemo(() => {
    const master = doctorOptionsMaster;
    let list = [...rows];

    if (monthYyyyMm.trim()) {
      const prefix = monthYyyyMm.trim();
      list = list.filter((r) => tanggalYyyyMm(r.tanggal) === prefix);
    }

    if (filterDokter.trim()) {
      const fd = filterDokter.trim();
      list = list.filter((r) => {
        const rowD = String(r.dokter ?? "").trim();
        if (!master.length) return rowD === fd;
        return (
          canonicalDoctorStoredValue(master, rowD) ===
          canonicalDoctorStoredValue(master, fd)
        );
      });
    }

    if (filterTindakan.trim()) {
      const ft = filterTindakan.trim();
      list = list.filter((r) => String(r.tindakan ?? "").trim() === ft);
    }

    if (igdFromMs != null && Number.isFinite(igdFromMs)) {
      list = list.filter((r) => {
        const ms = parseEpochMs(r.pasien_datang_igd);
        return ms != null && ms >= igdFromMs;
      });
    }
    if (igdToMs != null && Number.isFinite(igdToMs)) {
      list = list.filter((r) => {
        const ms = parseEpochMs(r.pasien_datang_igd);
        return ms != null && ms <= igdToMs;
      });
    }

    if (d2bFromMs != null && Number.isFinite(d2bFromMs)) {
      list = list.filter((r) => {
        const ms = parseEpochMs(r.door_to_balloon);
        return ms != null && ms >= d2bFromMs;
      });
    }
    if (d2bToMs != null && Number.isFinite(d2bToMs)) {
      list = list.filter((r) => {
        const ms = parseEpochMs(r.door_to_balloon);
        return ms != null && ms <= d2bToMs;
      });
    }

    return list.sort((a, b) => {
      const ta = String(a.tanggal ?? "").trim();
      const tb = String(b.tanggal ?? "").trim();
      const byDate = tb.localeCompare(ta);
      if (byDate !== 0) return byDate;
      return String(b.id ?? "").localeCompare(String(a.id ?? ""));
    });
  }, [
    rows,
    monthYyyyMm,
    filterDokter,
    filterTindakan,
    igdFromMs,
    igdToMs,
    d2bFromMs,
    d2bToMs,
    doctorOptionsMaster,
  ]);

  const reportFilters = useMemo((): FastTrackReportFilters => {
    return {
      monthYyyyMm,
      filterDokter,
      filterTindakan,
      igdFrom,
      igdTo,
      d2bFrom,
      d2bTo,
    };
  }, [
    monthYyyyMm,
    filterDokter,
    filterTindakan,
    igdFrom,
    igdTo,
    d2bFrom,
    d2bTo,
  ]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const buildExportHtml = useCallback(
    () => buildFastTrackReportHtml(filteredRows, reportFilters),
    [filteredRows, reportFilters],
  );

  const buildExportWhatsApp = useCallback(
    () => buildFastTrackWhatsAppText(filteredRows, reportFilters),
    [filteredRows, reportFilters],
  );

  const exportFileBase = useMemo(
    () =>
      `laporan-fast-track-${monthYyyyMm.trim() || "semua"}`,
    [monthYyyyMm],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "h-[98vh] w-[98vw] max-w-[1400px] overflow-hidden p-0 flex flex-col sm:h-[95vh] sm:w-[96vw]",
          "border-slate-300/60 bg-white/98 backdrop-blur-xl dark:border-amber-500/35 dark:bg-black/85",
          "shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
        )}
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-2 p-2 sm:gap-4 sm:p-6",
            "text-slate-900 dark:text-white",
          )}
        >
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-2 dark:border-white/10 sm:pb-3">
            <DialogHeader className="space-y-0.5 text-left sm:space-y-1">
              <DialogTitle className="text-left text-sm font-bold tracking-tight sm:text-xl text-amber-600 dark:text-amber-400">
                Fast-Track (IGD → cathlab)
              </DialogTitle>
              <p
                className={cn(
                  "text-[9px] font-medium leading-tight sm:text-[13px]",
                  "text-slate-500 dark:text-white/60",
                )}
              >
                Monitoring waktu penanganan pasien dari IGD ke Cathlab.
              </p>
            </DialogHeader>
            <ReportExportActionBar
              className="shrink-0 scale-75 origin-left sm:scale-100"
              disabled={loading}
              empty={!loading && filteredRows.length === 0}
              fileNameBase={exportFileBase}
              buildHtml={buildExportHtml}
              buildWhatsAppText={buildExportWhatsApp}
            />
          </div>

          <div className="flex shrink-0 items-center justify-between px-1">
            <button
              onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[11px]",
                "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60",
                "border border-amber-200 dark:border-amber-500/30"
              )}
            >
              <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Filter
              {isFilterCollapsed ? (
                <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              ) : (
                <ChevronUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              )}
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse sm:h-2 sm:w-2" />
              <span className="text-[9px] font-medium text-slate-500 dark:text-white/40 italic sm:text-[10px]">
                {isFilterCollapsed ? "Filter aktif" : "Klik icon untuk tutup"}
              </span>
            </div>
          </div>

          {!isFilterCollapsed && (
            <div
              className={cn(
                "grid shrink-0 grid-cols-1 gap-2 rounded-lg border p-2.5 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end",
                "border-amber-200/80 bg-amber-50/50 dark:border-amber-800/40 dark:bg-black/30",
              )}
            >
              <label className="flex flex-col gap-0.5 lg:min-w-[10rem]">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-amber-900 dark:text-amber-200/90",
                  )}
                >
                  Tahun & bulan
                </span>
                <input
                  type="month"
                  value={monthYyyyMm}
                  onChange={(e) => setMonthYyyyMm(e.target.value)}
                  className={cn(
                    "w-full rounded-md border px-2 py-1 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/60",
                    "border-amber-300/80 bg-white text-slate-900 [color-scheme:light]",
                    "dark:border-white/20 dark:bg-black dark:text-white dark:[color-scheme:dark]",
                  )}
                  aria-label="Pilih tahun dan bulan"
                />
              </label>
              <label className="flex flex-col gap-0.5 lg:min-w-[9rem]">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-amber-900 dark:text-amber-200/90",
                  )}
                >
                  Dokter
                </span>
                <select
                  value={filterDokter}
                  onChange={(e) => setFilterDokter(e.target.value)}
                  className={cn(
                    "w-full rounded-md border px-2 py-1 text-[13px] font-semibold focus:outline-none",
                    "border-amber-300/80 bg-white text-slate-900",
                    "dark:border-white/20 dark:bg-black dark:text-white",
                    "lg:max-w-[14rem]",
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
              <label className="flex flex-col gap-0.5 lg:min-w-[9rem]">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-amber-900 dark:text-amber-200/90",
                  )}
                >
                  Tindakan
                </span>
                <select
                  value={filterTindakan}
                  onChange={(e) => setFilterTindakan(e.target.value)}
                  className={cn(
                    "w-full rounded-md border px-2 py-1 text-[13px] font-semibold focus:outline-none",
                    "border-amber-300/80 bg-white text-slate-900",
                    "dark:border-white/20 dark:bg-black dark:text-white",
                    "lg:max-w-[14rem]",
                  )}
                >
                  <option value="">Semua</option>
                  {tindakanOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-0.5 lg:min-w-[11rem]">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-amber-900 dark:text-amber-200/90",
                  )}
                >
                  IGD — dari
                </span>
                <input
                  type="datetime-local"
                  value={igdFrom}
                  onChange={(e) => setIgdFrom(e.target.value)}
                  className={cn(
                    "w-full rounded-md border px-2 py-1 text-[12px] font-semibold font-mono focus:outline-none",
                    "border-amber-300/80 bg-white text-slate-900",
                    "dark:border-white/20 dark:bg-black dark:text-white",
                  )}
                />
              </label>
              <label className="flex flex-col gap-0.5 lg:min-w-[11rem]">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-amber-900 dark:text-amber-200/90",
                  )}
                >
                  IGD — sampai
                </span>
                <input
                  type="datetime-local"
                  value={igdTo}
                  onChange={(e) => setIgdTo(e.target.value)}
                  className={cn(
                    "w-full rounded-md border px-2 py-1 text-[12px] font-semibold font-mono focus:outline-none",
                    "border-amber-300/80 bg-white text-slate-900",
                    "dark:border-white/20 dark:bg-black dark:text-white",
                  )}
                />
              </label>
              <label className="flex flex-col gap-0.5 lg:min-w-[11rem]">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-amber-900 dark:text-amber-200/90",
                  )}
                >
                  Door-to-balloon — dari
                </span>
                <input
                  type="datetime-local"
                  value={d2bFrom}
                  onChange={(e) => setD2bFrom(e.target.value)}
                  className={cn(
                    "w-full rounded-md border px-2 py-1 text-[12px] font-semibold font-mono focus:outline-none",
                    "border-amber-300/80 bg-white text-slate-900",
                    "dark:border-white/20 dark:bg-black dark:text-white",
                  )}
                />
              </label>
              <label className="flex flex-col gap-0.5 lg:min-w-[11rem]">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-amber-900 dark:text-amber-200/90",
                  )}
                >
                  Door-to-balloon — sampai
                </span>
                <input
                  type="datetime-local"
                  value={d2bTo}
                  onChange={(e) => setD2bTo(e.target.value)}
                  className={cn(
                    "w-full rounded-md border px-2 py-1 text-[12px] font-semibold font-mono focus:outline-none",
                    "border-amber-300/80 bg-white text-slate-900",
                    "dark:border-white/20 dark:bg-black dark:text-white",
                  )}
                />
              </label>
              <div className="flex items-end sm:col-span-2 lg:col-span-1 lg:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setMonthYyyyMm(currentMonthYyyyMmWib());
                    setFilterDokter("");
                    setFilterTindakan("");
                    setIgdFrom("");
                    setIgdTo("");
                    setD2bFrom("");
                    setD2bTo("");
                  }}
                  className={cn(
                    "h-9 w-full rounded-md border px-2.5 text-[12px] font-bold transition sm:h-8 lg:w-auto",
                    "border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
                    "dark:border-white/25 dark:bg-black/40 dark:text-white dark:hover:bg-black/55",
                  )}
                >
                  Reset filter
                </button>
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/30 dark:border-white/10 dark:bg-black/20 sm:rounded-xl">
            <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-amber-500/20 scrollbar-track-transparent">
              <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-[10px] font-semibold sm:min-w-[1300px] sm:text-[12px]">
                <thead className="sticky top-0 z-20">
                  <tr
                    className={cn(
                      "border-b text-center backdrop-blur-md",
                      "border-amber-200/70 bg-gradient-to-b from-amber-400/90 via-amber-300/80 to-amber-200/70 dark:border-amber-400/50 dark:from-amber-400/40 dark:via-amber-300/30 dark:to-amber-200/20",
                    )}
                  >
                    <th className="sticky left-0 top-0 z-30 bg-amber-400 px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 shadow-[1px_0_3px_rgba(0,0,0,0.1)] dark:bg-amber-600 dark:text-white w-8 sm:px-2 sm:py-2.5 sm:text-[11px] sm:w-10">
                      No
                    </th>
                    <th className="px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[80px] sm:px-2 sm:py-2.5 sm:text-[11px] sm:min-w-[120px]">
                      Foto
                    </th>
                    <th className="px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 dark:text-white w-20 sm:px-2 sm:py-2.5 sm:text-[11px] sm:w-24">
                      Tanggal
                    </th>
                    <th className="px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 dark:text-white w-20 sm:px-2 sm:py-2.5 sm:text-[11px] sm:w-24">
                      RM
                    </th>
                    <th className="sticky left-8 top-0 z-30 bg-amber-400 px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 shadow-[1px_0_3px_rgba(0,0,0,0.1)] dark:bg-amber-600 dark:text-white min-w-[130px] sm:left-10 sm:px-2 sm:py-2.5 sm:text-[11px] sm:min-w-[180px]">
                      Nama pasien
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-20">
                      JK
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-28">
                      Lahir
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-14">
                      Umur
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[140px]">
                      Alamat
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[100px]">
                      Telp
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[120px]">
                      Dokter
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[120px]">
                      Tindakan
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[150px]">
                      Pasien tiba IGD
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[150px]">
                      Door-to-balloon
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-24">
                      Total waktu
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={15}
                        className={cn(
                          "px-4 py-8 text-center text-[13px]",
                          "text-slate-600 dark:text-white/85",
                        )}
                      >
                        Tidak ada baris untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((rec, i) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + i;
                      const raw = rec as unknown as Record<string, unknown>;
                      const jk = resolveJenisKelaminFromRow(raw, null);
                      const fotos = parseFastTrackFotosUrls(rec.fast_track_fotos);
                      return (
                        <tr
                          key={String(rec.id ?? globalIndex)}
                          className={cn(
                            "group border-b align-top hover:bg-amber-50/50 dark:hover:bg-amber-900/20",
                            "border-amber-200/50 dark:border-amber-900/30",
                          )}
                        >
                          <td className="sticky left-0 z-10 bg-white px-1 py-1 text-center font-mono tabular-nums text-amber-900 shadow-[1px_0_3px_rgba(0,0,0,0.05)] group-hover:bg-amber-50/50 dark:bg-black dark:text-amber-200/90 dark:group-hover:bg-amber-900/20 sm:px-2 sm:py-2">
                            {globalIndex + 1}
                          </td>
                          <td className="px-1 py-1 sm:px-2 sm:py-2">
                            <div className="flex flex-wrap gap-1">
                              {fotos.length === 0 ? (
                                <span className="text-slate-500 dark:text-white/70">
                                  —
                                </span>
                              ) : (
                                fotos.map((url) => (
                                  <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block shrink-0"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={url}
                                      alt=""
                                      className="h-8 w-8 rounded-md border border-amber-200/80 object-cover dark:border-amber-700/50 sm:h-14 sm:w-14"
                                    />
                                  </a>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-1 py-1 text-center font-mono text-[9px] text-slate-800 dark:text-white/90 sm:px-2 sm:py-2 sm:text-[11px]">
                            {String(rec.tanggal ?? "").slice(0, 10) || "—"}
                          </td>
                          <td className="px-1 py-1 text-center font-mono text-[9px] text-slate-800 dark:text-white/90 sm:px-2 sm:py-2 sm:text-[11px]">
                            {displayRm(raw)}
                          </td>
                          <td className="sticky left-8 z-10 bg-white px-1 py-1 text-[10px] font-bold text-slate-900 shadow-[1px_0_3px_rgba(0,0,0,0.05)] group-hover:bg-amber-50/50 dark:bg-black dark:text-white dark:group-hover:bg-amber-900/20 sm:left-10 sm:px-2 sm:py-2 sm:text-[12px]">
                            {normalizeNamaPasien(displayNamaPasien(raw))}
                          </td>
                          <td className="px-1 py-1 text-center text-[10px] text-slate-800 dark:text-white/90 sm:px-2 sm:py-2 sm:text-[12px]">
                            {formatJenisKelaminDisplay(jk)}
                          </td>
                          <td className="px-1 py-1 text-center font-mono text-[9px] text-slate-800 dark:text-white/90 sm:px-2 sm:py-2 sm:text-[11px]">
                            {String(rec.tgl_lahir ?? "").trim().slice(0, 10) ||
                              "—"}
                          </td>
                          <td className="px-1 py-1 text-center font-mono text-[9px] text-slate-800 dark:text-white/90 sm:px-2 sm:py-2 sm:text-[11px]">
                            {rec.umur != null ? String(rec.umur) : "—"}
                          </td>
                          <td className="px-1 py-1 text-[9px] leading-tight text-slate-800 dark:text-white/90 sm:px-2 sm:py-2 sm:text-[11px] sm:leading-snug">
                            {String(rec.alamat ?? "").trim() || "—"}
                          </td>
                          <td className="px-1 py-1 font-mono text-[9px] text-slate-800 dark:text-white/90 sm:px-2 sm:py-2 sm:text-[11px]">
                            {String(rec.no_telp ?? "").trim() || "—"}
                          </td>
                          <td className="px-1 py-1 text-[10px] text-slate-800 dark:text-white/90 sm:px-2 sm:py-2 sm:text-[12px]">
                            {String(rec.dokter ?? "").trim() || "—"}
                          </td>
                          <td className="px-1 py-1 text-[10px] text-slate-800 dark:text-white/90 sm:px-2 sm:py-2 sm:text-[12px]">
                            {String(rec.tindakan ?? "").trim() || "—"}
                          </td>
                          <td className="px-1 py-1 text-[9px] leading-tight text-slate-800 dark:text-white/90 sm:px-2 sm:py-2 sm:text-[11px] sm:leading-snug">
                            {formatWaktuDisplay(rec.pasien_datang_igd)}
                          </td>
                          <td className="px-1 py-1 text-[9px] leading-tight text-slate-800 dark:text-white/90 sm:px-2 sm:py-2 sm:text-[11px] sm:leading-snug">
                            {formatWaktuDisplay(rec.door_to_balloon)}
                          </td>
                          <td className="px-1 py-1 text-center font-mono text-[9px] text-slate-800 dark:text-white/90 sm:px-2 sm:py-2 sm:text-[11px]">
                            {String(rec.total_waktu_fast_track ?? "").trim() ||
                              "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {loading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-[1px] dark:bg-black/50">
              <div
                className={cn(
                  "rounded-xl border px-8 py-4 text-center text-sm font-bold shadow-xl",
                  "border-amber-200 bg-white text-amber-900 dark:border-amber-500/50 dark:bg-black dark:text-amber-200",
                )}
              >
                Memuat data…
              </div>
            </div>
          )}

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-white/10">
            <p
              className={cn(
                "text-[11px] font-semibold",
                "text-slate-500 dark:text-white/75",
              )}
            >
              Menampilkan {paginatedRows.length} dari {filteredRows.length} baris
              {monthYyyyMm ? ` · bulan ${monthYyyyMm}` : ""}.
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md border transition disabled:opacity-30",
                    "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    "dark:border-white/10 dark:bg-black/40 dark:text-white/80 dark:hover:bg-black/60",
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1 px-2">
                  <select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                    className={cn(
                      "h-8 rounded-md border px-1.5 text-[12px] font-bold focus:outline-none focus:ring-1 focus:ring-amber-500",
                      "border-slate-200 bg-white text-amber-600",
                      "dark:border-white/10 dark:bg-black dark:text-amber-400"
                    )}
                  >
                    {Array.from({ length: totalPages }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                  <span className="text-[12px] font-medium text-slate-400 dark:text-white/40">
                    / {totalPages}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md border transition disabled:opacity-30",
                    "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    "dark:border-white/10 dark:bg-black/40 dark:text-white/80 dark:hover:bg-black/60",
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
