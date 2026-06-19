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
  RotateCcw,
  Calendar,
  X,
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
} from "../lib/displayTindakanRow";
import { normalizeNamaPasien } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import {
  canonicalDoctorStoredValue,
  type DoctorOption,
} from "@/components/ui/doctor-combobox";
import ReportExportActionBar from "./ReportExportActionBar";
import { UI_LAYERS } from "@/lib/ui/layers";
import {
  buildFastTrackReportHtml,
  buildFastTrackWhatsAppText,
  buildPemakaianAlkesReportHtml,
  buildPemakaianAlkesWhatsAppText,
  downloadFastTrackExcel,
  downloadPemakaianAlkesExcel,
  type FastTrackReportFilters,
} from "../lib/tindakanReportTemplates";
import MasterDokterField from "./MasterDokterField";
import MasterJenisTindakanField from "./MasterJenisTindakanField";
import FastTrackPhotoDropzone from "./FastTrackPhotoDropzone";
import { DatetimeLocalPicker } from "@/components/ui/datetime-local-picker";

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
  let normalizedT = t;
  if (t.includes("T") && !t.includes("Z") && !t.includes("+") && !t.match(/-\d{2}:\d{2}$/)) {
    normalizedT = t.replace("T", " ");
  }
  const d = Date.parse(normalizedT);
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

function normalizeDatetimeLocalInput(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  
  const match = t.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
  }

  let normalizedT = t;
  if (t.includes("T") && !t.includes("Z") && !t.includes("+") && !t.match(/-\d{2}:\d{2}$/)) {
    normalizedT = t.replace("T", " ");
  }

  const d = Date.parse(normalizedT);
  if (!Number.isFinite(d)) return "";
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = dt.getFullYear();
  const mo = pad(dt.getMonth() + 1);
  const da = pad(dt.getDate());
  const h = dt.getHours();
  const mi = dt.getMinutes();
  return `${y}-${mo}-${da}T${pad(h)}:${pad(mi)}`;
}

export default function FastTrackListModal({
  open,
  onOpenChange,
  rows,
  loading,
  doctorOptionsMaster,
  onRecordPatch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  loading: boolean;
  doctorOptionsMaster: readonly DoctorOption[];
  onRecordPatch?: () => void;
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
        master.length > 0 ? canonicalDoctorStoredValue([...master], d) : d;
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

  const igdFromMs = parseEpochMs(igdFrom);
  const igdToMs = parseEpochMs(igdTo);
  const d2bFromMs = parseEpochMs(d2bFrom);
  const d2bToMs = parseEpochMs(d2bTo);

  const filteredRows = useMemo(() => {
    const master = doctorOptionsMaster;
    let list = [...rows];

    // Filter default: Hanya PPCI atau yang memiliki data Fast-Track (IGD/D2B) terisi
    list = list.filter((r) => {
      const tindakanStr = String(r.tindakan ?? "").trim().toUpperCase();
      const isPPCI = tindakanStr === "PPCI";
      const hasIgd = Boolean(String(r.pasien_datang_igd ?? "").trim());
      const hasD2b = Boolean(String(r.door_to_balloon ?? "").trim());
      
      // Jika ada filter tindakan manual dari dropdown, gunakan itu (override default)
      if (filterTindakan.trim()) {
        return tindakanStr === filterTindakan.trim().toUpperCase();
      }

      // Tampilkan jika:
      // 1. Tindakannya PPCI
      // 2. ATAU sudah ada data Fast-Track yang terisi (untuk monitoring)
      const isRelevant = isPPCI || hasIgd || hasD2b;
      
      // Jika tidak ada filter bulan, prioritaskan yang BELUM terisi lengkap
      if (!monthYyyyMm.trim() && isRelevant) {
        const isComplete = hasIgd && hasD2b;
        // Jika sudah lengkap, sembunyikan (agar fokus ke yang kosong)
        // KECUALI jika tindakannya PPCI, kita tetap ingin melihatnya jika belum lengkap
        return !isComplete && isPPCI;
      }

      // Jika ada filter bulan, tampilkan hanya PPCI (atau yang sudah ada data FT-nya)
      return isRelevant && isPPCI;
    });

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
          canonicalDoctorStoredValue([...master], rowD) ===
          canonicalDoctorStoredValue([...master], fd)
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

  const parsePemakaian = useCallback((txt: string) => {
    const lines = txt.split("\n");
    const result: {
      KONSOLIDASI: string[];
      NON_KONSOLIDASI: string[];
      ALKES_LAINNYA: string[];
      STENT?: string[];
      BALLOON?: string[];
    } = {
      KONSOLIDASI: [],
      NON_KONSOLIDASI: [],
      ALKES_LAINNYA: [],
      STENT: [],
      BALLOON: [],
    };

    let currentCategory: "STENT" | "BALLOON" | "ALKES_LAINNYA" | null = null;
    let currentBlock: string[] = [];

    const flush = () => {
      if (currentBlock.length > 0) {
        const blockText = currentBlock.join("\n").trim();
        if (blockText) {
          if (currentCategory === "STENT") {
            result.STENT?.push(blockText);
            result.KONSOLIDASI.push(blockText);
          } else if (currentCategory === "BALLOON") {
            result.BALLOON?.push(blockText);
            result.NON_KONSOLIDASI.push(blockText);
          } else {
            result.ALKES_LAINNYA.push(blockText);
          }
        }
        currentBlock = [];
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("•")) {
        flush();
        const upperLine = trimmed.toUpperCase();
        if (upperLine.includes("STENT")) {
          currentCategory = "STENT";
        } else if (upperLine.includes("BALLOON") || upperLine.includes("BALLON")) {
          currentCategory = "BALLOON";
        } else {
          currentCategory = "ALKES_LAINNYA";
        }
        currentBlock.push(line);
      } else if (trimmed !== "" || currentBlock.length > 0) {
        currentBlock.push(line);
      }
    });
    flush();
    return result;
  }, []);

  const buildExportPemakaianHtml = useCallback(() => {
    return buildPemakaianAlkesReportHtml({
      rows: filteredRows,
      subtitleLines: [`Filter: Fast-Track PPCI`, `Total: ${filteredRows.length} baris`],
      parsePemakaian,
    });
  }, [filteredRows, parsePemakaian]);

  const buildExportPemakaianWhatsApp = useCallback(() => {
    return buildPemakaianAlkesWhatsAppText({
      rows: filteredRows,
      subtitleLines: [`Filter: Fast-Track PPCI`, `Total: ${filteredRows.length} baris`],
      parsePemakaian,
    });
  }, [filteredRows, parsePemakaian]);

  const exportFileBase = useMemo(
    () =>
      `laporan-fast-track-${monthYyyyMm.trim() || "semua"}`,
    [monthYyyyMm],
  );

  const onDownloadExcel = useCallback(() => {
    downloadFastTrackExcel(filteredRows, exportFileBase);
  }, [filteredRows, exportFileBase]);

  const onDownloadPemakaianExcel = useCallback(() => {
    downloadPemakaianAlkesExcel({
      rows: filteredRows,
      filename: `pemakaian-alkes-${exportFileBase}`,
      parsePemakaian,
    });
  }, [filteredRows, exportFileBase, parsePemakaian]);

  const patchJson = async (tindakanId: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/tindakan/${encodeURIComponent(tindakanId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
    };
    if (!res.ok || !json.ok) {
      throw new Error(json.message || res.statusText);
    }
  };

  const persistTime = async (
    tindakanId: string,
    field: "pasien_datang_igd" | "door_to_balloon",
    nextValue: string,
    currentRow: TindakanJoinResult
  ) => {
    const t = nextValue.trim();
    const payload = t === "" ? null : t;
    const currentServer = String(currentRow[field] ?? "").trim() || null;
    if (payload === currentServer) return;

    try {
      const updates: Record<string, any> = { [field]: payload };
      // Auto-activate FT if time is filled
      const isFt =
        currentRow.is_fast_track === true ||
        Number(currentRow.is_fast_track) === 1 ||
        String(currentRow.is_fast_track) === "true" ||
        String(currentRow.is_fast_track) === "1";

      if (!isFt && payload) {
        updates.is_fast_track = true;
      }
      await patchJson(tindakanId, updates);

      // Recalculate total time if both are present
      const otherField =
        field === "pasien_datang_igd"
          ? "door_to_balloon"
          : "pasien_datang_igd";
      const otherVal = String(currentRow[otherField] ?? "").trim();
      const t0 =
        field === "pasien_datang_igd" ? payload : otherVal || null;
      const t1 =
        field === "door_to_balloon" ? payload : otherVal || null;

      if (t0 && t1) {
        const ms0 = parseEpochMs(t0);
        const ms1 = parseEpochMs(t1);
        if (ms0 != null && ms1 != null && ms1 >= ms0) {
          const mins = Math.round((ms1 - ms0) / 60_000);
          const nextTotal = String(mins);
          if (nextTotal !== String(currentRow.total_waktu_fast_track ?? "")) {
            await patchJson(tindakanId, { total_waktu_fast_track: nextTotal });
          }
        }
      }
      onRecordPatch?.();
    } catch (e) {
      console.error(`[FastTrackListModal] Failed to persist ${field}`, e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={UI_LAYERS.dialogOverlayTop}
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "h-[98vh] w-[98vw] max-w-[1400px] overflow-hidden p-0 flex flex-col sm:h-[95vh] sm:w-[96vw]",
          "border-slate-300/60 bg-slate-50 dark:border-amber-500/35 dark:bg-[#0f1115]",
          "shadow-2xl ring-1 ring-black/5 dark:ring-white/10",
          UI_LAYERS.dialogContentTop
        )}
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-2 p-2 sm:gap-4 sm:p-6",
            "text-slate-900 dark:text-slate-100",
          )}
        >
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2 dark:border-white/10 sm:pb-3">
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
            <div className="flex items-center gap-2">
              <ReportExportActionBar
                className="shrink-0 scale-75 origin-left sm:scale-100"
                disabled={loading}
                empty={!loading && filteredRows.length === 0}
                fileNameBase={exportFileBase}
                buildHtml={buildExportHtml}
                buildWhatsAppText={buildExportWhatsApp}
                onDownloadExcel={onDownloadExcel}
              />
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="group relative flex h-8 items-center gap-2 overflow-hidden rounded-full bg-slate-800/50 pl-2 pr-3 transition-all hover:bg-red-500/10 hover:ring-1 hover:ring-red-500/30 sm:h-9 sm:pl-3 sm:pr-4"
                aria-label="Tutup"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700/50 text-slate-400 transition-colors group-hover:bg-red-500 group-hover:text-white sm:h-6 sm:w-6">
                  <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-red-400 sm:text-[11px]">
                  Tutup
                </span>
              </button>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between px-1">
            <div className="flex items-center gap-2">
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
              {!isFilterCollapsed && (
                <button
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
                    "flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition sm:px-3 sm:py-1.5 sm:text-[11px]",
                    "bg-rose-100 text-rose-900 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:hover:bg-rose-900/60",
                    "border border-rose-200 dark:border-rose-500/30"
                  )}
                  title="Reset Semua Filter"
                >
                  <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Reset Semua
                </button>
              )}
            </div>
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
                "grid shrink-0 grid-cols-1 gap-x-3 gap-y-2.5 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7",
                "border-slate-200 bg-white dark:border-slate-700 dark:bg-[#161b22]",
              )}
            >
              <label className="flex flex-col gap-1">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-slate-600 dark:text-amber-400/90",
                  )}
                >
                  Tahun & bulan
                </span>
                <div className="relative group">
                  <input
                    type="month"
                    value={monthYyyyMm}
                    onChange={(e) => setMonthYyyyMm(e.target.value)}
                    className={cn(
                      "w-full rounded-md border px-2 py-1.5 pr-8 text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500/60",
                      "border-slate-300 bg-white text-slate-900 [color-scheme:light]",
                      "dark:border-slate-600 dark:bg-black dark:text-white dark:[color-scheme:dark]",
                    )}
                  />
                  {monthYyyyMm !== currentMonthYyyyMmWib() && (
                  <button
                    onClick={() => setMonthYyyyMm(currentMonthYyyyMmWib())}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                  )}
                </div>
              </label>

              <label className="flex flex-col gap-1">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-slate-600 dark:text-amber-400/90",
                  )}
                >
                  Dokter
                </span>
                <div className="relative group">
                  <select
                    value={filterDokter}
                    onChange={(e) => setFilterDokter(e.target.value)}
                    className={cn(
                      "w-full rounded-md border px-2 py-1.5 pr-8 text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500/60 appearance-none",
                      "border-slate-300 bg-white text-slate-900",
                      "dark:border-slate-600 dark:bg-black dark:text-white",
                    )}
                  >
                    <option value="">Semua</option>
                    {dokterOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {filterDokter && (
                  <button
                    onClick={() => setFilterDokter("")}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                  )}
                </div>
              </label>

              <label className="flex flex-col gap-1">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-slate-600 dark:text-amber-400/90",
                  )}
                >
                  Tindakan
                </span>
                <div className="relative group">
                  <select
                    value={filterTindakan}
                    onChange={(e) => setFilterTindakan(e.target.value)}
                    className={cn(
                      "w-full rounded-md border px-2 py-1.5 pr-8 text-[12px] font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500/60 appearance-none",
                      "border-slate-300 bg-white text-slate-900",
                      "dark:border-slate-600 dark:bg-black dark:text-white",
                    )}
                  >
                    <option value="">Semua</option>
                    {tindakanOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {filterTindakan && (
                  <button
                    onClick={() => setFilterTindakan("")}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                  )}
                </div>
              </label>

              <label className="flex flex-col gap-1">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-slate-600 dark:text-amber-400/90",
                  )}
                >
                  IGD — dari
                </span>
                <div className="relative group">
                  <input
                    type="datetime-local"
                    value={igdFrom}
                    onChange={(e) => setIgdFrom(e.target.value)}
                    className={cn(
                      "w-full rounded-md border px-2 py-1.5 pr-8 text-[11px] font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/60 [color-scheme:light] dark:[color-scheme:dark]",
                      "border-slate-300 bg-white text-slate-900",
                      "dark:border-slate-600 dark:bg-black dark:text-white",
                    )}
                  />
                  {igdFrom && (
                    <button
                      onClick={() => setIgdFrom("")}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </label>

              <label className="flex flex-col gap-1">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-slate-600 dark:text-amber-400/90",
                  )}
                >
                  IGD — sampai
                </span>
                <div className="relative group">
                  <input
                    type="datetime-local"
                    value={igdTo}
                    onChange={(e) => setIgdTo(e.target.value)}
                    className={cn(
                      "w-full rounded-md border px-2 py-1.5 pr-8 text-[11px] font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/60 [color-scheme:light] dark:[color-scheme:dark]",
                      "border-slate-300 bg-white text-slate-900",
                      "dark:border-slate-600 dark:bg-black dark:text-white",
                    )}
                  />
                  {igdTo && (
                    <button
                      onClick={() => setIgdTo("")}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </label>

              <label className="flex flex-col gap-1">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-slate-600 dark:text-amber-400/90",
                  )}
                >
                  D2B — dari
                </span>
                <div className="relative group">
                  <input
                    type="datetime-local"
                    value={d2bFrom}
                    onChange={(e) => setD2bFrom(e.target.value)}
                    className={cn(
                      "w-full rounded-md border px-2 py-1.5 pr-8 text-[11px] font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/60 [color-scheme:light] dark:[color-scheme:dark]",
                      "border-slate-300 bg-white text-slate-900",
                      "dark:border-slate-600 dark:bg-black dark:text-white",
                    )}
                  />
                  {d2bFrom && (
                    <button
                      onClick={() => setD2bFrom("")}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </label>

              <label className="flex flex-col gap-1">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    "text-slate-600 dark:text-amber-400/90",
                  )}
                >
                  D2B — sampai
                </span>
                <div className="relative group">
                  <input
                    type="datetime-local"
                    value={d2bTo}
                    onChange={(e) => setD2bTo(e.target.value)}
                    className={cn(
                      "w-full rounded-md border px-2 py-1.5 pr-8 text-[11px] font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/60 [color-scheme:light] dark:[color-scheme:dark]",
                      "border-slate-300 bg-white text-slate-900",
                      "dark:border-slate-600 dark:bg-black dark:text-white",
                    )}
                  />
                  {d2bTo && (
                    <button
                      onClick={() => setD2bTo("")}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </label>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-[#161b22] sm:rounded-xl">
            <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-amber-500/20 scrollbar-track-transparent">
              <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-[10px] font-semibold sm:min-w-[1300px] sm:text-[12px]">
                <thead className="sticky top-0 z-20">
                  <tr
                    className={cn(
                      "border-b text-center backdrop-blur-md",
                      "border-amber-400/50 bg-amber-400 dark:border-amber-500/50 dark:bg-amber-600/90",
                    )}
                  >
                    <th className="sticky left-0 top-0 z-30 bg-inherit px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 border-r border-amber-500/30 dark:text-white w-8 sm:px-2 sm:py-2.5 sm:text-[11px] sm:w-10">
                      No
                    </th>
                    <th className="px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 border-r border-amber-500/30 dark:text-white min-w-[80px] sm:px-2 sm:py-2.5 sm:text-[11px] sm:min-w-[120px]">
                      Foto
                    </th>
                    <th className="px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 border-r border-amber-500/30 dark:text-white w-20 sm:px-2 sm:py-2.5 sm:text-[11px] sm:w-24">
                      Tanggal
                    </th>
                    <th className="px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 border-r border-amber-500/30 dark:text-white w-20 sm:px-2 sm:py-2.5 sm:text-[11px] sm:w-24">
                      RM
                    </th>
                    <th className="sticky left-8 top-0 z-30 bg-inherit px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 border-r border-amber-500/30 dark:text-white min-w-[130px] sm:left-10 sm:px-2 sm:py-2.5 sm:text-[11px] sm:min-w-[180px]">
                      Nama pasien
                    </th>
                    <th className="px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 border-r border-amber-500/30 dark:text-white min-w-[120px] sm:px-2 sm:py-2.5 sm:text-[11px]">
                      Dokter
                    </th>
                    <th className="px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 border-r border-amber-500/30 dark:text-white min-w-[120px] sm:px-2 sm:py-2.5 sm:text-[11px]">
                      Tindakan
                    </th>
                    <th className="px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 border-r border-amber-500/30 dark:text-white min-w-[150px] sm:px-2 sm:py-2.5 sm:text-[11px]">
                      Pasien tiba IGD
                    </th>
                    <th className="px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 border-r border-amber-500/30 dark:text-white min-w-[150px] sm:px-2 sm:py-2.5 sm:text-[11px]">
                      Door-to-balloon
                    </th>
                    <th className="px-1 py-1.5 text-[9px] uppercase tracking-wider text-slate-900 dark:text-white w-24 sm:px-2 sm:py-2.5 sm:text-[11px]">
                      Total waktu
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className={cn(
                          "px-4 py-8 text-center text-[13px]",
                          "text-slate-600 dark:text-slate-400",
                        )}
                      >
                        Tidak ada baris untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((rec, i) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + i;
                      const raw = rec as unknown as Record<string, unknown>;
                      return (
                        <tr
                          key={String(rec.id ?? globalIndex)}
                          className={cn(
                            "group border-b align-top hover:bg-slate-50 dark:hover:bg-slate-800/50",
                            "border-slate-200 dark:border-slate-700",
                          )}
                        >
                          <td className="sticky left-0 z-10 bg-inherit px-1 py-1 text-center font-mono tabular-nums text-slate-600 border-r border-slate-200 dark:text-slate-400 dark:border-slate-700 sm:px-2 sm:py-2">
                            {globalIndex + 1}
                          </td>
                          <td className="px-1 py-1 border-r border-slate-200 dark:border-slate-700 sm:px-2 sm:py-2">
                            <FastTrackPhotoDropzone
                              tindakanId={String(rec.id)}
                              fotosValue={rec.fast_track_fotos}
                              canEdit={true}
                              appearance="table"
                              onSaved={onRecordPatch}
                            />
                          </td>
                          <td className="px-1 py-1 text-center font-mono text-[9px] text-slate-700 border-r border-slate-200 dark:text-slate-300 dark:border-slate-700 sm:px-2 sm:py-2 sm:text-[11px]">
                            {String(rec.tanggal ?? "").slice(0, 10) || "—"}
                          </td>
                          <td className="px-1 py-1 text-center font-mono text-[9px] text-slate-700 border-r border-slate-200 dark:text-slate-300 dark:border-slate-700 sm:px-2 sm:py-2 sm:text-[11px]">
                            {displayRm(raw)}
                          </td>
                          <td className="sticky left-8 z-10 bg-inherit px-1 py-1 text-[10px] font-bold text-slate-900 border-r border-slate-200 dark:text-slate-100 dark:border-slate-700 sm:left-10 sm:px-2 sm:py-2 sm:text-[12px]">
                            {normalizeNamaPasien(displayNamaPasien(raw))}
                          </td>
                          <td className="px-1 py-1 text-[10px] text-slate-700 border-r border-slate-200 dark:text-slate-300 dark:border-slate-700 sm:px-2 sm:py-2 sm:text-[12px]">
                            <MasterDokterField
                              tindakanId={String(rec.id)}
                              value={String(rec.dokter ?? "")}
                              onSaved={onRecordPatch}
                            />
                          </td>
                          <td className="px-1 py-1 text-[10px] text-slate-700 border-r border-slate-200 dark:text-slate-300 dark:border-slate-700 sm:px-2 sm:py-2 sm:text-[12px]">
                            <MasterJenisTindakanField
                              tindakanId={String(rec.id)}
                              value={String(rec.tindakan ?? "")}
                              onSaved={onRecordPatch}
                            />
                          </td>
                          <td className="px-1 py-1 text-[9px] leading-tight text-slate-700 border-r border-slate-200 dark:text-slate-300 dark:border-slate-700 sm:px-2 sm:py-2 sm:text-[11px] sm:leading-snug">
                            <DatetimeLocalPicker
                              appearance="drawer"
                              value={normalizeDatetimeLocalInput(
                                String(rec.pasien_datang_igd ?? "")
                              )}
                              onChange={(v) =>
                                persistTime(
                                  String(rec.id),
                                  "pasien_datang_igd",
                                  v,
                                  rec
                                )
                              }
                            />
                          </td>
                          <td className="px-1 py-1 text-[9px] leading-tight text-slate-700 border-r border-slate-200 dark:text-slate-300 dark:border-slate-700 sm:px-2 sm:py-2 sm:text-[11px] sm:leading-snug">
                            <DatetimeLocalPicker
                              appearance="drawer"
                              value={normalizeDatetimeLocalInput(
                                String(rec.door_to_balloon ?? "")
                              )}
                              onChange={(v) =>
                                persistTime(
                                  String(rec.id),
                                  "door_to_balloon",
                                  v,
                                  rec
                                )
                              }
                            />
                          </td>
                          <td className="px-1 py-1 text-center font-mono text-[9px] text-slate-700 dark:text-slate-300 sm:px-2 sm:py-2 sm:text-[11px]">
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
