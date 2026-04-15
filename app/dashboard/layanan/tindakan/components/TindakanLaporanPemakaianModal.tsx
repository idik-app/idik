"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { Package, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import ReportExportActionBar from "./ReportExportActionBar";
import { displayNamaPasien, displayRm } from "../lib/displayTindakanRow";
import { normalizeNamaPasien } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import {
  buildPemakaianAlkesReportHtml,
  buildPemakaianAlkesWhatsAppText,
  downloadPemakaianAlkesExcel,
  wrapReportHtmlDocument,
} from "../lib/tindakanReportTemplates";

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
];

const DISTRIBUTOR_NON_KONSOLIDASI_KEYWORDS = [
  "REVASS UTAMA MEDIKA",
  "REVASS",
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

export default function TindakanLaporanPemakaianModal({
  open,
  onOpenChange,
  rows,
  loading,
  filterSummaryLines,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  loading: boolean;
  filterSummaryLines: readonly string[];
}) {
  const [filterKategori, setFilterKategori] = useState<string>("");
  const [filterTanggalFrom, setFilterTanggalFrom] = useState<string>("");
  const [filterTanggalTo, setFilterTanggalTo] = useState<string>("");
  const [filterDokter, setFilterDokter] = useState<string>("");
  const [filterKeterangan, setFilterKeterangan] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const kategoriOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
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
    rows.forEach((r) => {
      const d = (r.dokter || "").trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    let result = rows.filter((r) => {
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
        const d = String(r.tanggal ?? "").slice(0, 10);
        return d >= filterTanggalFrom;
      });
    }

    if (filterTanggalTo) {
      result = result.filter((r) => {
        const d = String(r.tanggal ?? "").slice(0, 10);
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
        return (
          nama.includes(lowerSearch) ||
          rm.includes(lowerSearch) ||
          dokter.includes(lowerSearch)
        );
      });
    }

    return result;
  }, [
    rows,
    filterKategori,
    filterTanggalFrom,
    filterTanggalTo,
    filterDokter,
    filterKeterangan,
    searchTerm,
  ]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filterKategori,
    filterTanggalFrom,
    filterTanggalTo,
    filterDokter,
    filterKeterangan,
  ]);

  const parsePemakaian = useCallback((txt: string) => {
    const lines = txt.split("\n");
    const result: {
      STENT: string[];
      BALLOON: string[];
      ALKES_LAINNYA: string[];
    } = {
      STENT: [],
      BALLOON: [],
      ALKES_LAINNYA: [],
    };

    // Jika format tidak diawali bullet point, coba proses per baris secara langsung
    const hasBullets = txt.includes("•");
    const hasConsolidation = txt.toUpperCase().includes("KONSOLIDASI");

    // Jika tidak ada bullet point, atau ada kata KONSOLIDASI, kita gunakan logika deteksi blok yang lebih agresif
    if (!hasBullets || hasConsolidation) {
      const processedLines = new Set<number>();

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed || processedLines.has(idx)) return;
        const upperLine = trimmed.toUpperCase();

        // Cek apakah baris ini adalah awal dari blok pemakaian
        const isAlkesLine =
          upperLine.startsWith("•") ||
          upperLine.includes("[STENT]") ||
          upperLine.includes("[BALLOON]") ||
          upperLine.includes("[BALLON]") ||
          upperLine.includes("[KONSOLIDASI]") ||
          upperLine.includes("[NON KONSOLIDASI]") ||
          upperLine.includes("STENT") ||
          upperLine.includes("BALLOON") ||
          upperLine.includes("BALLON") ||
          upperLine.includes("SUPRAFLEX") ||
          upperLine.includes("GENOSS") ||
          upperLine.includes("XIENCE") ||
          upperLine.includes("ONYX") ||
          upperLine.includes("PROMUS") ||
          upperLine.includes("SYNERGY") ||
          upperLine.includes("SAPPHIRE") ||
          upperLine.includes("EMERGE") ||
          upperLine.includes("TREK") ||
          upperLine.includes("DIAGNOSA:") ||
          upperLine.includes("NAMA_PASIEN:") ||
          // Tambahan: Jika baris hanya berisi "KONSOLIDASI" atau "NON KONSOLIDASI" tanpa bullet
          upperLine === "KONSOLIDASI" ||
          upperLine === "NON KONSOLIDASI" ||
          // Tambahan: Jika baris berisi LOT/Ukuran/ED (seringkali ini bagian dari blok yang terpisah)
          upperLine.includes("LOT:") ||
          upperLine.includes("UKURAN:") ||
          upperLine.includes("ED:");

        if (isAlkesLine) {
          let cat: "STENT" | "BALLOON" | "ALKES_LAINNYA" = "ALKES_LAINNYA";

          // Cari brand di baris ini ATAU baris-baris sebelumnya (mencari header yang hilang)
          const findCategoryInContext = (startIdx: number) => {
            // 1. Cek baris ini dulu
            const currentLine = lines[startIdx].trim().toUpperCase();
            if (
              currentLine.includes("STENT") ||
              currentLine.includes("XIENCE") ||
              currentLine.includes("ONYX") ||
              currentLine.includes("PROMUS")
            )
              return "STENT";
            if (
              currentLine.includes("BALLOON") ||
              currentLine.includes("BALLON") ||
              currentLine.includes("SAPPHIRE") ||
              currentLine.includes("TREK")
            )
              return "BALLOON";

            // 2. Cek ke atas (mencari nama barang yang mungkin ada di baris sebelumnya)
            for (let k = startIdx - 1; k >= Math.max(0, startIdx - 3); k--) {
              const prevLine = lines[k].trim().toUpperCase();
              if (
                prevLine.includes("STENT") ||
                prevLine.includes("XIENCE") ||
                prevLine.includes("ONYX") ||
                prevLine.includes("PROMUS")
              )
                return "STENT";
              if (
                prevLine.includes("BALLOON") ||
                prevLine.includes("BALLON") ||
                prevLine.includes("SAPPHIRE") ||
                prevLine.includes("TREK")
              )
                return "BALLOON";
              if (prevLine.startsWith("•")) break;
            }

            // 3. Cek ke bawah dalam blok ini
            for (let k = startIdx + 1; k < lines.length; k++) {
              const nextLine = lines[k].trim().toUpperCase();
              if (
                nextLine.startsWith("•") ||
                nextLine.includes("[STENT]") ||
                nextLine.includes("[BALLOON]")
              )
                break;
              if (
                nextLine.includes("STENT") ||
                nextLine.includes("XIENCE") ||
                nextLine.includes("ONYX") ||
                nextLine.includes("PROMUS")
              )
                return "STENT";
              if (
                nextLine.includes("BALLOON") ||
                nextLine.includes("BALLON") ||
                nextLine.includes("SAPPHIRE") ||
                nextLine.includes("TREK")
              )
                return "BALLOON";
            }
            return "ALKES_LAINNYA";
          };

          cat = findCategoryInContext(idx);

          // Ambil baris ini dan baris-baris berikutnya sampai ketemu alkes baru atau baris kosong
          let block = [trimmed];
          processedLines.add(idx);

          for (let j = idx + 1; j < lines.length; j++) {
            const nextTrimmed = lines[j].trim();
            const nextUpper = nextTrimmed.toUpperCase();
            if (!nextTrimmed) break;

            const isNextAlkes =
              nextTrimmed.startsWith("•") ||
              nextUpper.includes("[STENT]") ||
              nextUpper.includes("[BALLOON]") ||
              nextUpper.includes("[BALLON]") ||
              nextUpper.includes("[KONSOLIDASI]") ||
              nextUpper.includes("[NON KONSOLIDASI]") ||
              nextUpper.includes("STENT") ||
              nextUpper.includes("BALLOON") ||
              nextUpper.includes("BALLON") ||
              nextUpper.includes("XIENCE") ||
              nextUpper.includes("ONYX") ||
              nextUpper.includes("PROMUS") ||
              nextUpper.includes("SYNERGY") ||
              nextUpper.includes("SAPPHIRE") ||
              nextUpper.includes("EMERGE") ||
              nextUpper.includes("TREK");

            if (isNextAlkes) break;

            block.push(nextTrimmed);
            processedLines.add(j);
          }

          result[cat].push(block.join("\n"));
        }
      });

      // Jika ada baris yang belum terproses dan bukan baris kosong, masukkan ke ALKES_LAINNYA
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed && !processedLines.has(idx)) {
          result.ALKES_LAINNYA.push(trimmed);
        }
      });

      return result;
    }

    let currentCategory: "STENT" | "BALLOON" | "ALKES_LAINNYA" | null = null;
    let currentBlock: string[] = [];

    const flush = () => {
      if (currentBlock.length > 0) {
        const blockText = currentBlock.join("\n").trim();
        if (blockText) {
          if (currentCategory === "STENT") {
            result.STENT.push(blockText);
          } else if (currentCategory === "BALLOON") {
            result.BALLOON.push(blockText);
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
        const catMatch = trimmed.match(
          /\[(STENT|BALLOON|BALLON|CATHETER|WIRE|GUIDING|ALKES|KATETER)\]/i,
        );
        if (catMatch) {
          const cat = catMatch[1].toUpperCase();
          if (cat === "STENT") {
            currentCategory = "STENT";
          } else if (cat === "BALLOON" || cat === "BALLON") {
            currentCategory = "BALLOON";
          } else {
            currentCategory = "ALKES_LAINNYA";
          }
        } else {
          // Jika tidak ada tag kategori eksplisit, coba infer dari konten baris
          if (
            upperLine.includes("STENT") ||
            upperLine.includes("SUPRAFLEX") ||
            upperLine.includes("GENOSS") ||
            upperLine.includes("XIENCE") ||
            upperLine.includes("ONYX") ||
            upperLine.includes("PROMUS") ||
            upperLine.includes("SYNERGY")
          ) {
            // Khusus GENOSS, pastikan bukan BALLON
            if (upperLine.includes("BALLOON") || upperLine.includes("BALLON")) {
              currentCategory = "BALLOON";
            } else {
              currentCategory = "STENT";
            }
          } else if (
            upperLine.includes("BALLOON") ||
            upperLine.includes("BALLON") ||
            upperLine.includes("SAPPHIRE") ||
            upperLine.includes("EMERGE") ||
            upperLine.includes("TREK")
          ) {
            currentCategory = "BALLOON";
          } else {
            currentCategory = "ALKES_LAINNYA";
          }
        }
        currentBlock.push(line);
      } else if (trimmed !== "" || currentBlock.length > 0) {
        currentBlock.push(line);
      }
    });
    flush();

    return result;
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
            upperLine.trim() === "NON KONSOLIDASI";
          if (!isHeader) return <div key={j}>{line}</div>;

          // Jika baris adalah murni "NON KONSOLIDASI" (baris baru)
          if (upperLine.trim() === "NON KONSOLIDASI") {
            return (
              <div key={j} className="mt-0.5">
                <span className="inline-flex items-center rounded bg-blue-500/10 px-1 py-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400">
                  NON KONSOLIDASI
                </span>
              </div>
            );
          }

          const parts = line.split(/(\[KONSOLIDASI\])/gi);
          return (
            <div key={j} className="flex flex-wrap items-center gap-1">
              {parts.map((part, k) => {
                const upper = part.toUpperCase();
                if (upper === "[KONSOLIDASI]") {
                  return (
                    <span
                      key={k}
                      className="inline-flex items-center rounded bg-emerald-500/10 px-1 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400"
                    >
                      KONSOLIDASI
                    </span>
                  );
                }
                return <span key={k}>{part}</span>;
              })}
            </div>
          );
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={UI_LAYERS.dialogOverlayTop}
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "h-[85vh] max-h-[85vh] w-[95vw] max-w-5xl overflow-hidden p-0 flex flex-col border-slate-300/60 bg-white dark:border-amber-500/35 dark:bg-black rounded-xl focus:outline-none",
          UI_LAYERS.dialogContentTop,
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2 sm:p-3 text-slate-900 dark:text-white overflow-hidden bg-white dark:bg-black">
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between border-b pb-1.5 dark:border-white/10">
            <DialogHeader className="space-y-0 text-left sm:pr-2">
              <DialogTitle className="flex items-center gap-2 text-left text-sm font-bold tracking-wide">
                <Package
                  className="shrink-0 text-amber-600 dark:text-amber-400"
                  size={18}
                  strokeWidth={2.25}
                />
                Laporan Pemakaian Alkes
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-1.5 scale-90 origin-right">
              <ReportExportActionBar
                disabled={loading}
                empty={!loading && filteredRows.length === 0}
                fileNameBase={`laporan-pemakaian-alkes-${new Date().toISOString().slice(0, 10)}`}
                buildHtml={buildExportHtml}
                buildWhatsAppText={buildExportWhatsApp}
                onDownloadExcel={onDownloadExcel}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-end gap-2 rounded-lg border p-1.5 border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-black/30">
            <div className="flex flex-col gap-0.5 w-[200px]">
              <span className="text-[8px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200/90 pl-0.5">
                Cari Pasien / RM / Dokter
              </span>
              <div className="relative">
                <Search
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40"
                  size={10}
                />
                <input
                  type="text"
                  placeholder="Cari..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-amber-300/80 bg-white pl-6 pr-1 py-0.5 text-[11px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-white/20 dark:bg-black dark:text-white dark:placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-0.5 w-[115px]">
              <span className="text-[8px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200/90 pl-0.5">
                Dari
              </span>
              <div className="relative group">
                <input
                  type="date"
                  value={filterTanggalFrom}
                  onClick={(e) => openNativeDatePicker(e.currentTarget)}
                  onChange={(e) => setFilterTanggalFrom(e.target.value)}
                  className="w-full rounded-md border border-amber-300/80 bg-white pl-1.5 pr-6 py-0.5 text-[11px] font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-white/20 dark:bg-black dark:text-white"
                />
                {filterTanggalFrom && (
                  <button
                    type="button"
                    onClick={() => setFilterTanggalFrom("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-0.5 w-[115px]">
              <span className="text-[8px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200/90 pl-0.5">
                Sampai
              </span>
              <div className="relative group">
                <input
                  type="date"
                  value={filterTanggalTo}
                  onClick={(e) => openNativeDatePicker(e.currentTarget)}
                  onChange={(e) => setFilterTanggalTo(e.target.value)}
                  className="w-full rounded-md border border-amber-300/80 bg-white pl-1.5 pr-6 py-0.5 text-[11px] font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-white/20 dark:bg-black dark:text-white"
                />
                {filterTanggalTo && (
                  <button
                    type="button"
                    onClick={() => setFilterTanggalTo("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-0.5 w-[140px]">
              <span className="text-[8px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200/90 pl-0.5">
                Dokter
              </span>
              <select
                value={filterDokter}
                onChange={(e) => setFilterDokter(e.target.value)}
                className="w-full rounded-md border border-amber-300/80 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-900 dark:border-white/20 dark:bg-black dark:text-white"
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
              <span className="text-[8px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200/90 pl-0.5">
                Kategori
              </span>
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="w-full rounded-md border border-amber-300/80 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-900 dark:border-white/20 dark:bg-black dark:text-white"
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
              <span className="text-[8px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200/90 pl-0.5">
                Keterangan
              </span>
              <select
                value={filterKeterangan}
                onChange={(e) => setFilterKeterangan(e.target.value)}
                className="w-full rounded-md border border-amber-300/80 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-900 dark:border-white/20 dark:bg-black dark:text-white"
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

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200/80 dark:border-white/15">
            {loading ? (
              <div className="p-3 text-center text-[11px] font-semibold text-slate-600 dark:text-white/85">
                Memuat data…
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="p-3 text-center text-[11px] font-semibold text-slate-600 dark:text-white/85">
                Tidak ada data pemakaian alkes.
              </div>
            ) : (
              <table className="w-full border-collapse text-[9px]">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-white/10">
                  <tr>
                    <th className="border border-slate-300/70 px-1 py-1 text-left dark:border-white/20 w-[70px]">
                      Tanggal
                    </th>
                    <th className="border border-slate-300/70 px-1 py-1 text-left dark:border-white/20 w-[130px]">
                      Pasien / RM
                    </th>
                    <th className="border border-slate-300/70 px-1 py-1 text-left dark:border-white/20 w-[100px]">
                      Dokter
                    </th>
                    <th className="border border-slate-300/70 px-1 py-1 text-left dark:border-white/20">
                      STENT
                    </th>
                    <th className="border border-slate-300/70 px-1 py-1 text-left dark:border-white/20">
                      BALLOON
                    </th>
                    <th className="border border-slate-300/70 px-1 py-1 text-left dark:border-white/20">
                      ALKES LAINNYA
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {paginatedRows.map((r) => {
                    const rawPemakaian = String(r.pemakaian ?? "");
                    let finalPemakaian = rawPemakaian;
                    const upperPemakaian = rawPemakaian.toUpperCase();

                    // Otomatisasi label di UI berdasarkan kata kunci
                    const hasKonsolidasi =
                      upperPemakaian.includes("[KONSOLIDASI]");
                    const hasNonKonsolidasi =
                      upperPemakaian.includes("[NON KONSOLIDASI]") ||
                      upperPemakaian.includes("NON KONSOLIDASI");

                    const matchKonsolidasi =
                      DISTRIBUTOR_KONSOLIDASI_KEYWORDS.find((k) =>
                        upperPemakaian.includes(k),
                      );
                    const matchNonKonsolidasi =
                      DISTRIBUTOR_NON_KONSOLIDASI_KEYWORDS.find((k) =>
                        upperPemakaian.includes(k),
                      );

                    // Koreksi jika ada label yang salah (misal ONYX tapi tertulis NON KONSOLIDASI)
                    if (matchKonsolidasi) {
                      if (hasNonKonsolidasi) {
                        finalPemakaian = rawPemakaian
                          .replace(/\[NON KONSOLIDASI\]/gi, "[KONSOLIDASI]")
                          .replace(/NON KONSOLIDASI/gi, "[KONSOLIDASI]");
                      } else if (!hasKonsolidasi) {
                        finalPemakaian = rawPemakaian.replace(
                          new RegExp(matchKonsolidasi, "gi"),
                          (m) => `${m} [KONSOLIDASI]`,
                        );
                      }
                    } else if (matchNonKonsolidasi) {
                      if (hasKonsolidasi) {
                        finalPemakaian = rawPemakaian.replace(
                          /\[KONSOLIDASI\]/gi,
                          "\nNON KONSOLIDASI",
                        );
                      } else if (!hasNonKonsolidasi) {
                        finalPemakaian = rawPemakaian.replace(
                          new RegExp(matchNonKonsolidasi, "gi"),
                          (m) => `${m}\nNON KONSOLIDASI`,
                        );
                      }
                    }

                    const parsed = parsePemakaian(finalPemakaian);
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <td className="border border-slate-300/70 px-1 py-0.5 align-top dark:border-white/20">
                          {String(r.tanggal ?? "").slice(0, 10)}
                        </td>
                        <td className="border border-slate-300/70 px-1 py-0.5 align-top dark:border-white/20">
                          <div className="font-bold leading-tight">
                            {normalizeNamaPasien(displayNamaPasien(r as any))}
                          </div>
                          <div className="text-[8px] opacity-70">
                            {displayRm(r as any)}
                          </div>
                        </td>
                        <td className="border border-slate-300/70 px-1 py-0.5 align-top dark:border-white/20 leading-tight">
                          {r.dokter || "—"}
                        </td>
                        <td className="border border-slate-300/70 px-1 py-0.5 align-top dark:border-white/20 whitespace-pre-wrap leading-tight text-[8px]">
                          {formatBlockText(parsed.STENT.join("\n\n"))}
                        </td>
                        <td className="border border-slate-300/70 px-1 py-0.5 align-top dark:border-white/20 whitespace-pre-wrap leading-tight text-[8px]">
                          {formatBlockText(parsed.BALLOON.join("\n\n"))}
                        </td>
                        <td className="border border-slate-300/70 px-1 py-0.5 align-top dark:border-white/20 whitespace-pre-wrap leading-tight text-[8px]">
                          {formatBlockText(parsed.ALKES_LAINNYA.join("\n\n"))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {filteredRows.length > 0 && (
            <div className="flex shrink-0 items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/50 px-2 py-1 dark:border-white/10 dark:bg-white/5">
              <div className="text-[9px] font-medium text-slate-500 dark:text-white/60">
                <span className="font-bold text-slate-900 dark:text-white">
                  {Math.min(
                    (currentPage - 1) * itemsPerPage + 1,
                    filteredRows.length,
                  )}
                </span>
                -
                <span className="font-bold text-slate-900 dark:text-white">
                  {Math.min(currentPage * itemsPerPage, filteredRows.length)}
                </span>
                /
                <span className="font-bold text-slate-900 dark:text-white">
                  {filteredRows.length}
                </span>
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
      </DialogContent>
    </Dialog>
  );
}
