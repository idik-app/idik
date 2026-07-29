"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { PasienOption } from "@/components/ui/pasien-combobox";
import { cn } from "@/lib/utils";
import { UI_LAYERS, Z_INDEX_VALUES } from "@/lib/ui/layers";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import type { WireframeTabId } from "../bridge/wireframeDrawerTabs";
import ReportExportActionBar from "./ReportExportActionBar";
import {
  buildPasienReportLookup,
  displayNamaPasien,
  displayRm,
  mergePasienMasterIntoRowForReport,
} from "../lib/displayTindakanRow";
import { normalizeNamaPasien } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import {
  buildPemakaianAlkesReportHtml,
  buildPemakaianAlkesWhatsAppText,
  downloadPemakaianAlkesExcel,
  wrapReportHtmlDocument,
} from "../lib/tindakanReportTemplates";
import { tanggalBarisKeYmdWib } from "../lib/tanggalBarisWib";

// Daftar kata kunci distributor untuk otomatisasi label di UI (antisipasi input manual)
const DISTRIBUTOR_KONSOLIDASI_KEYWORDS = [
  "ANUGRAH ARGON MEDICA",
  "ARGON",
  "TAWADA",
  "DIPA PHARMALAB",
  "DIPA",
  "XIENCE",
  "ONYX",
  "PROMUS",
  "SYNERGY",
  "EMERGE",
  "REVASS UTAMA MEDIKA",
  "REVASS",
];

const DISTRIBUTOR_NON_KONSOLIDASI_KEYWORDS = [
  "WIKATON",
  "TRIPATRIA",
  "GENOSS",
  "SUPRAFLEX",
  "SAPPHIRE",
  "SIMPASS",
];

const KETERANGAN_OPTIONS = [
  "Tidak ada ukuran yang lain",
  "Kasus sulit",
  "Permintaan User",
];

/** Membuka picker tanggal native (Chromium/Edge: klik di area teks ikut membuka kalender). */
function openNativeDatePicker(el: HTMLInputElement) {
  if (typeof el.showPicker !== "function") return;
  try {
    el.showPicker();
  } catch {
    /* gesture / secure context */
  }
}

function getCurrentMonthRangeWib(): { from: string; to: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  if (!y || !m) return { from: "", to: "" };
  const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

export default function TindakanLaporanPemakaianModal({
  open,
  onOpenChange,
  rows,
  loading,
  filterSummaryLines,
  initialFilterTanggalFrom,
  initialFilterTanggalTo,
  initialFilterDokter,
  initialSearchTerm,
  pasienOptions = [],
  onOpenDetail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  loading: boolean;
  filterSummaryLines: readonly string[];
  initialFilterTanggalFrom?: string;
  initialFilterTanggalTo?: string;
  initialFilterDokter?: string;
  initialSearchTerm?: string;
  pasienOptions?: readonly PasienOption[];
  /** Tab awal drawer — default `klinis` dari klik baris agar diagnosa mudah diedit. */
  onOpenDetail?: (
    record: TindakanJoinResult,
    initialTab?: WireframeTabId,
  ) => void;
}) {
  const [filterKategori, setFilterKategori] = useState<string>("");
  const [filterTanggalFrom, setFilterTanggalFrom] = useState<string>(
    () => initialFilterTanggalFrom || getCurrentMonthRangeWib().from,
  );
  const [filterTanggalTo, setFilterTanggalTo] = useState<string>(
    () => initialFilterTanggalTo || getCurrentMonthRangeWib().to,
  );
  const [filterDokter, setFilterDokter] = useState<string>(
    () => initialFilterDokter || "",
  );
  const [filterKeterangan, setFilterKeterangan] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState(() => initialSearchTerm || "");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const pasienLookup = useMemo(
    () => buildPasienReportLookup(pasienOptions),
    [pasienOptions],
  );

  const reportRows = useMemo(
    () =>
      rows.map((r) =>
        mergePasienMasterIntoRowForReport(r, pasienOptions, pasienLookup),
      ),
    [rows, pasienOptions, pasienLookup],
  );

  const kategoriOptions = useMemo(() => {
    const set = new Set<string>();
    reportRows.forEach((r) => {
      const txt = String(r.pemakaian ?? "").trim();
      if (!txt) return;

      // Deteksi tag [KATEGORI]
      const matches = txt.match(
        /\[(STENT|BALLOON|BALLON|CATHETER|WIRE|GUIDING|ALKES|KATETER)\]/gi,
      );
      matches?.forEach((m) => set.add(m.toUpperCase().replace(/[\[\]]/g, "")));

      // Deteksi kata kunci tanpa tag
      const upper = txt.toUpperCase();
      if (upper.includes("STENT") && !upper.includes("[STENT]"))
        set.add("STENT");
      if (
        (upper.includes("BALLOON") || upper.includes("BALLON")) &&
        !upper.includes("[BALLOON]") &&
        !upper.includes("[BALLON]")
      )
        set.add("BALLOON");
    });
    return Array.from(set).sort();
  }, [rows]);

  const doctorOptions = useMemo(() => {
    const set = new Set<string>();
    reportRows.forEach((r) => {
      const d = (r.dokter || "").trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [reportRows]);

  const filteredRows = useMemo(() => {
    // Filter hanya baris yang memiliki data pemakaian alkes
    let result = reportRows.filter((r) => {
      const txt = String(r.pemakaian ?? "").trim();
      return txt !== "";
    });

    if (filterKategori) {
      result = result.filter((r) => {
        const txt = String(r.pemakaian ?? "").trim();
        const cat = filterKategori.toUpperCase();
        const upperTxt = txt.toUpperCase();

        if (cat === "BALLOON") {
          return (
            upperTxt.includes(`[BALLOON]`) ||
            upperTxt.includes(`[BALLON]`) ||
            upperTxt.includes("BALLOON") ||
            upperTxt.includes("BALLON")
          );
        }
        return upperTxt.includes(`[${cat}]`) || upperTxt.includes(cat);
      });
    }

    if (filterTanggalFrom) {
      result = result.filter((r) => {
        const d = tanggalBarisKeYmdWib(r.tanggal);
        return d >= filterTanggalFrom;
      });
    }

    if (filterTanggalTo) {
      result = result.filter((r) => {
        const d = tanggalBarisKeYmdWib(r.tanggal);
        return d <= filterTanggalTo;
      });
    }

    if (filterDokter) {
      result = result.filter((r) => {
        return (r.dokter || "").trim() === filterDokter;
      });
    }

    if (filterKeterangan) {
      result = result.filter((r) => {
        const txt = String(r.pemakaian ?? "").toUpperCase();
        return txt.includes(filterKeterangan.toUpperCase());
      });
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((r) => {
        const nama = normalizeNamaPasien(
          displayNamaPasien(r as any),
        ).toLowerCase();
        const rm = displayRm(r as any).toLowerCase();
        const dokter = (r.dokter || "").toLowerCase();
        const bayar = String(r.kelas_pembiayaan || r.pembiayaan || "").toLowerCase();
        const diagnosa = String(r.diagnosa || "").toLowerCase();
        const pemakaian = String(r.pemakaian || "").toLowerCase();
        return (
          nama.includes(lowerSearch) ||
          rm.includes(lowerSearch) ||
          dokter.includes(lowerSearch) ||
          bayar.includes(lowerSearch) ||
          diagnosa.includes(lowerSearch) ||
          pemakaian.includes(lowerSearch)
        );
      });
    }

    return result;
  }, [
    reportRows,
    filterKategori,
    filterTanggalFrom,
    filterTanggalTo,
    filterDokter,
    filterKeterangan,
    searchTerm,
  ]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const end = startIndex + itemsPerPage;
    console.log('Pagination Debug:', {
      currentPage,
      itemsPerPage,
      startIndex,
      end,
      totalFiltered: filteredRows.length,
      paginatedCount: filteredRows.slice(startIndex, end).length
    });
    return filteredRows.slice(startIndex, end);
  }, [filteredRows, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);

  // Sinkronkan filter dengan kondisi di tabel saat modal dibuka
  useEffect(() => {
    if (open) {
      const range = getCurrentMonthRangeWib();
      // Gunakan filter dari tabel jika ada, jika tidak default ke bulan ini
      setFilterTanggalFrom(initialFilterTanggalFrom || range.from);
      setFilterTanggalTo(initialFilterTanggalTo || range.to);
      setFilterKategori("");
      setFilterDokter(initialFilterDokter || "");
      setFilterKeterangan("");
      setSearchTerm(initialSearchTerm || "");
    }
  }, [
    open,
    initialFilterTanggalFrom,
    initialFilterTanggalTo,
    initialFilterDokter,
    initialSearchTerm,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filterKategori,
    filterTanggalFrom,
    filterTanggalTo,
    filterDokter,
    filterKeterangan,
    itemsPerPage,
  ]);

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
    };

    const hasBullets = txt.includes("•");
    const hasConsolidation = txt.toUpperCase().includes("KONSOLIDASI");

    if (!hasBullets || hasConsolidation) {
      const processedLines = new Set<number>();

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed || processedLines.has(idx)) return;
        const upperLine = trimmed.toUpperCase();

        const isAlkesLine =
          upperLine.startsWith("•") ||
          upperLine.includes("[KONSOLIDASI]") ||
          upperLine.includes("[NON KONSOLIDASI]") ||
          upperLine.includes("KONSOLIDASI") ||
          upperLine.includes("NON KONSOLIDASI") ||
          DISTRIBUTOR_KONSOLIDASI_KEYWORDS.some((k) => upperLine.includes(k)) ||
          DISTRIBUTOR_NON_KONSOLIDASI_KEYWORDS.some((k) =>
            upperLine.includes(k),
          ) ||
          upperLine.includes("LOT:") ||
          upperLine.includes("UKURAN:") ||
          upperLine.includes("ED:");

        if (isAlkesLine) {
          let cat: "KONSOLIDASI" | "NON_KONSOLIDASI" | "ALKES_LAINNYA" =
            "ALKES_LAINNYA";

          const findCategoryInContext = (startIdx: number) => {
            for (let k = startIdx; k >= Math.max(0, startIdx - 3); k--) {
              const checkLine = lines[k].trim().toUpperCase();
              if (
                checkLine.includes("NON KONSOLIDASI") ||
                checkLine.includes("[NON KONSOLIDASI]")
              )
                return "NON_KONSOLIDASI";
              if (
                checkLine.includes("KONSOLIDASI") ||
                checkLine.includes("[KONSOLIDASI]")
              )
                return "KONSOLIDASI";
              if (
                DISTRIBUTOR_NON_KONSOLIDASI_KEYWORDS.some((kw) =>
                  checkLine.includes(kw),
                )
              )
                return "NON_KONSOLIDASI";
              if (
                DISTRIBUTOR_KONSOLIDASI_KEYWORDS.some((kw) =>
                  checkLine.includes(kw),
                )
              )
                return "KONSOLIDASI";
              if (checkLine.startsWith("•") && k < startIdx) break;
            }
            return "ALKES_LAINNYA";
          };

          cat = findCategoryInContext(idx);

          let block = [trimmed];
          processedLines.add(idx);

          for (let j = idx + 1; j < lines.length; j++) {
            const nextTrimmed = lines[j].trim();
            const nextUpper = nextTrimmed.toUpperCase();
            if (!nextTrimmed) break;

            const isNextAlkes =
              nextTrimmed.startsWith("•") ||
              nextUpper.includes("[KONSOLIDASI]") ||
              nextUpper.includes("[NON KONSOLIDASI]") ||
              nextUpper.includes("KONSOLIDASI") ||
              nextUpper.includes("NON KONSOLIDASI") ||
              DISTRIBUTOR_KONSOLIDASI_KEYWORDS.some((k) =>
                nextUpper.includes(k),
              ) ||
              DISTRIBUTOR_NON_KONSOLIDASI_KEYWORDS.some((k) =>
                nextUpper.includes(k),
              );

            if (isNextAlkes) break;

            block.push(nextTrimmed);
            processedLines.add(j);
          }

          result[cat].push(block.join("\n"));
        }
      });

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed && !processedLines.has(idx)) {
          result.ALKES_LAINNYA.push(trimmed);
        }
      });

      // Backward compatibility for report templates
      result.STENT = result.KONSOLIDASI;
      result.BALLOON = result.NON_KONSOLIDASI;

      return result as any;
    }

    let currentCategory:
      | "KONSOLIDASI"
      | "NON_KONSOLIDASI"
      | "ALKES_LAINNYA"
      | null = null;
    let currentBlock: string[] = [];

    const flush = () => {
      if (currentBlock.length > 0) {
        const blockText = currentBlock.join("\n").trim();
        if (blockText) {
          if (currentCategory === "KONSOLIDASI") {
            result.KONSOLIDASI.push(blockText);
          } else if (currentCategory === "NON_KONSOLIDASI") {
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
        if (
          upperLine.includes("NON KONSOLIDASI") ||
          upperLine.includes("[NON KONSOLIDASI]")
        ) {
          currentCategory = "NON_KONSOLIDASI";
        } else if (
          upperLine.includes("KONSOLIDASI") ||
          upperLine.includes("[KONSOLIDASI]")
        ) {
          currentCategory = "KONSOLIDASI";
        } else if (
          DISTRIBUTOR_NON_KONSOLIDASI_KEYWORDS.some((kw) =>
            upperLine.includes(kw),
          )
        ) {
          currentCategory = "NON_KONSOLIDASI";
        } else if (
          DISTRIBUTOR_KONSOLIDASI_KEYWORDS.some((kw) => upperLine.includes(kw))
        ) {
          currentCategory = "KONSOLIDASI";
        } else {
          currentCategory = "ALKES_LAINNYA";
        }
        currentBlock.push(line);
      } else if (trimmed !== "" || currentBlock.length > 0) {
        currentBlock.push(line);
      }
    });
    flush();

    // Backward compatibility for report templates
    result.STENT = result.KONSOLIDASI;
    result.BALLOON = result.NON_KONSOLIDASI;

    return result as any;
  }, []);

  const formatBlockText = (text: string) => {
    if (!text.trim()) return "—";
    return text.split("\n\n").map((block, i) => (
      <div key={i} className="mb-2 last:mb-0">
        {block.split("\n").map((line, j) => {
          const upperLine = line.toUpperCase();
          const isHeader =
            line.startsWith("•") ||
            upperLine.includes("[KONSOLIDASI]") ||
            upperLine.includes("[NON KONSOLIDASI]") ||
            upperLine.trim() === "KONSOLIDASI" ||
            upperLine.trim() === "NON KONSOLIDASI";

          if (!isHeader) return <div key={j}>{line}</div>;

          if (
            upperLine.trim() === "NON KONSOLIDASI" ||
            upperLine.includes("[NON KONSOLIDASI]")
          ) {
            return (
              <div key={j} className="mt-0.5">
                <span className="inline-flex items-center rounded bg-blue-500/10 px-1 py-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400">
                  NON KONSOLIDASI
                </span>
              </div>
            );
          }

          if (
            upperLine.trim() === "KONSOLIDASI" ||
            upperLine.includes("[KONSOLIDASI]")
          ) {
            return (
              <div key={j} className="mt-0.5">
                <span className="inline-flex items-center rounded bg-emerald-500/10 px-1 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                  KONSOLIDASI
                </span>
              </div>
            );
          }

          return <div key={j}>{line}</div>;
        })}
      </div>
    ));
  };

  const buildExportHtml = useCallback(() => {
    const subs = [...filterSummaryLines];
    if (filterTanggalFrom && filterTanggalTo) {
      if (filterTanggalFrom === filterTanggalTo) {
        subs.push(`Tanggal: ${filterTanggalFrom}`);
      } else {
        subs.push(`Periode: ${filterTanggalFrom} s/d ${filterTanggalTo}`);
      }
    } else if (filterTanggalFrom) {
      subs.push(`Dari: ${filterTanggalFrom}`);
    } else if (filterTanggalTo) {
      subs.push(`Sampai: ${filterTanggalTo}`);
    }
    if (filterDokter) subs.push(`Dokter: ${filterDokter}`);
    if (filterKategori) subs.push(`Kategori: ${filterKategori}`);
    if (filterKeterangan) subs.push(`Ket.: ${filterKeterangan}`);
    subs.push(`Total: ${filteredRows.length} baris`);

    return buildPemakaianAlkesReportHtml({
      rows: filteredRows,
      subtitleLines: subs,
      parsePemakaian,
    });
  }, [
    filteredRows,
    filterSummaryLines,
    filterTanggalFrom,
    filterTanggalTo,
    filterDokter,
    filterKategori,
    filterKeterangan,
    parsePemakaian,
  ]);

  const buildExportWhatsApp = useCallback(() => {
    const subs = [...filterSummaryLines];
    if (filterTanggalFrom && filterTanggalTo) {
      if (filterTanggalFrom === filterTanggalTo) {
        subs.push(`Tanggal: ${filterTanggalFrom}`);
      } else {
        subs.push(`Periode: ${filterTanggalFrom} s/d ${filterTanggalTo}`);
      }
    } else if (filterTanggalFrom) {
      subs.push(`Dari: ${filterTanggalFrom}`);
    } else if (filterTanggalTo) {
      subs.push(`Sampai: ${filterTanggalTo}`);
    }
    if (filterDokter) subs.push(`Dokter: ${filterDokter}`);
    if (filterKategori) subs.push(`Kategori: ${filterKategori}`);
    if (filterKeterangan) subs.push(`Ket.: ${filterKeterangan}`);
    subs.push(`Total: ${filteredRows.length} baris`);

    return buildPemakaianAlkesWhatsAppText({
      rows: filteredRows,
      subtitleLines: subs,
      parsePemakaian,
    });
  }, [
    filteredRows,
    filterSummaryLines,
    filterTanggalFrom,
    filterTanggalTo,
    filterDokter,
    filterKategori,
    filterKeterangan,
    parsePemakaian,
  ]);

  const onDownloadExcel = useCallback(() => {
    downloadPemakaianAlkesExcel({
      rows: filteredRows,
      filename: `laporan-pemakaian-alkes-${new Date().toISOString().slice(0, 10)}`,
      parsePemakaian,
    });
  }, [filteredRows, parsePemakaian]);

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
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          type="button"
          aria-label="Tutup laporan pemakaian"
          className="absolute inset-0 bg-[#2D3748]/45 pointer-events-auto"
          onClick={() => onOpenChange(false)}
        />

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
                  <Package className="shrink-0 text-amber-300" size={20} />
                  <span className="font-bold text-white text-sm tracking-wide">Laporan Pemakaian Alkes</span>
                </div>
                <div className="flex items-center gap-2">
                  <ReportExportActionBar
                    disabled={loading}
                    empty={!loading && filteredRows.length === 0}
                    fileNameBase={`laporan-pemakaian-alkes-${new Date().toISOString().slice(0, 10)}`}
                    buildHtml={buildExportHtml}
                    buildWhatsAppText={buildExportWhatsApp}
                    onDownloadExcel={onDownloadExcel}
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
              <div className="flex shrink-0 flex-wrap items-end gap-2 rounded-xl border p-2 border-slate-300 bg-gradient-to-b from-[#E6ECF5] to-[#D3DFF0] shadow-sm mb-4">
                <div className="flex flex-col gap-0.5 w-[200px]">
                  <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 pl-0.5">
                    Cari Pasien / RM / Dokter
                  </span>
                  <div className="relative">
                    <Search
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                      size={10}
                    />
                    <input
                      type="text"
                      placeholder="Cari..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white pl-6 pr-1 py-0.5 text-[11px] font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1b2b44]/20"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 w-[115px]">
                  <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 pl-0.5">
                    Dari
                  </span>
                  <div className="relative group">
                    <input
                      type="date"
                      value={filterTanggalFrom}
                      onClick={(e) => openNativeDatePicker(e.currentTarget)}
                      onChange={(e) => setFilterTanggalFrom(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white pl-1.5 pr-6 py-0.5 text-[11px] font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1b2b44]/20"
                    />
                    {filterTanggalFrom && (
                      <button
                        type="button"
                        onClick={() => setFilterTanggalFrom("")}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 w-[115px]">
                  <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 pl-0.5">
                    Sampai
                  </span>
                  <div className="relative group">
                    <input
                      type="date"
                      value={filterTanggalTo}
                      onClick={(e) => openNativeDatePicker(e.currentTarget)}
                      onChange={(e) => setFilterTanggalTo(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white pl-1.5 pr-6 py-0.5 text-[11px] font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1b2b44]/20"
                    />
                    {filterTanggalTo && (
                      <button
                        type="button"
                        onClick={() => setFilterTanggalTo("")}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 w-[140px]">
                  <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 pl-0.5">
                    Dokter
                  </span>
                  <select
                    value={filterDokter}
                    onChange={(e) => setFilterDokter(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-900 focus:outline-none"
                  >
                    <option value="">Semua Dokter</option>
                    {doctorOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-0.5 w-[120px]">
                  <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 pl-0.5">
                    Kategori
                  </span>
                  <select
                    value={filterKategori}
                    onChange={(e) => setFilterKategori(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-900 focus:outline-none"
                  >
                    <option value="">Semua Alkes</option>
                    {kategoriOptions.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-0.5 w-[120px]">
                  <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500 pl-0.5">
                    Keterangan
                  </span>
                  <select
                    value={filterKeterangan}
                    onChange={(e) => setFilterKeterangan(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-900 focus:outline-none"
                  >
                    <option value="">Semua Ket.</option>
                    {KETERANGAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white mb-4">
                {loading ? (
                  <div className="p-3 text-center text-[11px] font-semibold text-slate-600">
                    Memuat data…
                  </div>
                ) : filteredRows.length === 0 ? (
                  <div className="p-3 text-center text-[11px] font-semibold text-slate-600">
                    Tidak ada data pemakaian alkes.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-[9px] table-fixed text-slate-800 bg-white">
                    <thead className="sticky top-0 z-10 bg-slate-100 border-slate-300">
                      <tr className="bg-slate-100 text-slate-900 border-slate-300">
                        <th className="border border-slate-300 px-1 py-1 text-left w-[30px] shrink-0 bg-slate-100 text-slate-900">
                          NO
                        </th>
                        <th className="border border-slate-300 px-1 py-1 text-left w-[75px] shrink-0 bg-slate-100 text-slate-900">
                          TANGGAL
                        </th>
                        <th className="border border-slate-300 px-1 py-1 text-left w-[130px] shrink-0 bg-slate-100 text-slate-900">
                          PASIEN
                        </th>
                        <th className="border border-slate-300 px-1 py-1 text-left w-[110px] shrink-0 bg-slate-100 text-slate-900">
                          DIAGNOSA
                        </th>
                        <th className="border border-slate-300 px-1 py-1 text-left w-[90px] shrink-0 bg-slate-100 text-slate-900">
                          STATUS
                        </th>
                        <th className="border border-slate-300 px-1 py-1 text-left w-[55px] shrink-0 bg-slate-100 text-slate-900">
                          KASUS
                        </th>
                        <th className="border border-slate-300 px-1 py-1 text-left w-[130px] shrink-0 bg-slate-100 text-slate-900">
                          OPERATOR
                        </th>
                        <th className="border border-slate-300 px-1 py-1 text-left w-[180px] bg-slate-100 text-slate-900">
                          KONSOLIDASI
                        </th>
                        <th className="border border-slate-300 px-1 py-1 text-left w-[90px] shrink-0 bg-slate-100 text-slate-900">
                          Alasan Pakai Konsolidasi
                        </th>
                        <th className="border border-slate-300 px-1 py-1 text-left w-[180px] bg-slate-100 text-slate-900">
                          NON KONSOLIDASI
                        </th>
                        <th className="border border-slate-300 px-1 py-1 text-left w-[90px] shrink-0 bg-slate-100 text-slate-900">
                          Alasan Pakai non Konsolidasi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.map((row, idx) => {
                        const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                        const pemakaian = parsePemakaian(row.pemakaian || "");

                        return (
                          <tr
                            key={row.id ? String(row.id) : idx}
                            className={cn(
                              "hover:bg-slate-50 border-slate-200",
                              onOpenDetail && "cursor-pointer"
                            )}
                            onClick={() => onOpenDetail?.(row, "biaya")}
                          >
                            <td className="border border-slate-300 px-1 py-1 text-slate-800 tabular-nums bg-white">
                              {globalIdx}
                            </td>
                            <td className="border border-slate-300 px-1 py-1 text-slate-500 font-semibold bg-white">
                              {row.tanggal ? tanggalBarisKeYmdWib(row.tanggal) : "—"}
                            </td>
                            <td className="border border-slate-300 px-1 py-1 bg-white">
                              <div className="font-bold text-amber-750">
                                {displayNamaPasien(row as any)}
                              </div>
                              <div className="text-[8px] text-slate-500 tabular-nums">
                                RM: {displayRm(row as any)}
                              </div>
                            </td>
                            <td className="border border-slate-300 px-1 py-1 text-slate-850 truncate font-semibold bg-white" title={row.diagnosa || ""}>
                              {row.diagnosa || "—"}
                            </td>
                            <td className="border border-slate-300 px-1 py-1 bg-white">
                              <span className="rounded bg-slate-100 px-1 py-0.5 font-bold text-slate-700">
                                {row.kelas_pembiayaan || row.pembiayaan || "—"}
                              </span>
                            </td>
                            <td className="border border-slate-300 px-1 py-1 text-slate-800 font-bold uppercase truncate bg-white" title={row.tindakan || ""}>
                              {row.tindakan || "—"}
                            </td>
                            <td className="border border-slate-300 px-1 py-1 text-slate-800 font-semibold truncate bg-white" title={row.dokter || ""}>
                              {row.dokter || "—"}
                            </td>
                            <td className="border border-slate-300 px-1 py-1 text-slate-800 font-medium leading-relaxed bg-white">
                              {formatBlockText(pemakaian.konsolidasiText)}
                            </td>
                            <td className="border border-slate-300 px-1 py-1 italic text-slate-500 leading-snug bg-white">
                              {(row as any).alasan_alkes_konsolidasi || "—"}
                            </td>
                            <td className="border border-slate-300 px-1 py-1 text-slate-800 font-medium leading-relaxed bg-white">
                              {formatBlockText(pemakaian.nonKonsolidasiText)}
                            </td>
                            <td className="border border-slate-300 px-1 py-1 italic text-slate-500 leading-snug bg-white">
                              {(row as any).alasan_alkes_non_konsolidasi || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {filteredRows.length > 0 && (
                <div className="flex shrink-0 items-center justify-between rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="text-[9px] font-medium text-slate-500">
                      <span className="font-bold text-slate-900">
                        {Math.min(
                          (currentPage - 1) * itemsPerPage + 1,
                          filteredRows.length,
                        )}
                      </span>
                      -
                      <span className="font-bold text-slate-900">
                        {Math.min(currentPage * itemsPerPage, filteredRows.length)}
                      </span>
                      /
                      <span className="font-bold text-slate-900">
                        {filteredRows.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 border-l pl-2 border-slate-300">
                      <span className="text-[9px] text-slate-500 font-medium">
                        Baris:
                      </span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-transparent text-[9px] font-bold text-slate-700 dark:text-white focus:outline-none cursor-pointer"
                      >
                        {[10, 25, 50, 100, 250].map((v) => (
                          <option
                            key={v}
                            value={v}
                            className="bg-white dark:bg-black"
                          >
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10"
                    >
                      <ChevronLeft size={12} />
                    </button>

                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = currentPage;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={cn(
                              "flex h-5 min-w-[20px] items-center justify-center rounded border text-[9px] font-bold transition-colors",
                              currentPage === pageNum
                                ? "border-amber-500 bg-amber-500 text-white"
                                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10",
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );

  return createPortal(content, mountPoint);
}
