"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { Package, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import ReportExportActionBar from "./ReportExportActionBar";
import { displayNamaPasien, displayRm } from "../lib/displayTindakanRow";
import { normalizeNamaPasien } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import { wrapReportHtmlDocument } from "../lib/tindakanReportTemplates";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const kategoriOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const txt = String(r.pemakaian ?? "").trim();
      if (!txt) return;
      const matches = txt.match(
        /\[(STENT|BALLOON|BALLON|CATHETER|WIRE|GUIDING|ALKES|KATETER)\]/gi,
      );
      matches?.forEach((m) => set.add(m.toUpperCase().replace(/[\[\]]/g, "")));
    });
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    let result = rows.filter((r) => String(r.pemakaian ?? "").trim() !== "");

    if (filterKategori) {
      result = result.filter((r) => {
        const txt = String(r.pemakaian ?? "").trim();
        const cat = filterKategori.toUpperCase();
        if (cat === "BALLOON") {
          return (
            txt.toUpperCase().includes(`[BALLOON]`) ||
            txt.toUpperCase().includes(`[BALLON]`)
          );
        }
        return txt.toUpperCase().includes(`[${cat}]`);
      });
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((r) => {
        const nama = normalizeNamaPasien(displayNamaPasien(r as any)).toLowerCase();
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
  }, [rows, filterKategori, searchTerm]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterKategori]);

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
          // Jika tidak ada tag, coba infer dari nama barang di baris tersebut
          const upperLine = trimmed.toUpperCase();
          if (
            upperLine.includes("STENT") ||
            upperLine.includes("SUPRAFLEX") ||
            upperLine.includes("GENOSS")
          ) {
            // Khusus GENOSS, pastikan bukan BALLON
            if (upperLine.includes("BALLOON") || upperLine.includes("BALLON")) {
              currentCategory = "BALLOON";
            } else {
              currentCategory = "STENT";
            }
          } else if (
            upperLine.includes("BALLOON") ||
            upperLine.includes("BALLON")
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
          const isHeader = line.startsWith("•");
          if (!isHeader) return <div key={j}>{line}</div>;

          const parts = line.split(/(\[KONSOLIDASI\]|\[NON KONSOLIDASI\])/gi);
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
                if (upper === "[NON KONSOLIDASI]") {
                  return (
                    <span
                      key={k}
                      className="inline-flex items-center rounded bg-amber-500/10 px-1 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400"
                    >
                      NON KONSOLIDASI
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
    const bodyRows = filteredRows
      .map((rec, i) => {
        const raw = rec as unknown as Record<string, unknown>;
        const nama = normalizeNamaPasien(displayNamaPasien(raw));
        const rm = displayRm(raw);
        const parsed = parsePemakaian(String(rec.pemakaian ?? ""));

        const formatBlock = (blocks: string[]) =>
          blocks
            .join("\n\n")
            .replace(/\n/g, "<br/>")
            .replace(
              /\[KONSOLIDASI\]/gi,
              '<strong style="color:#10b981; font-size: 0.8em;">[KONSOLIDASI]</strong>',
            )
            .replace(
              /\[NON KONSOLIDASI\]/gi,
              '<strong style="color:#f59e0b; font-size: 0.8em;">[NON KONSOLIDASI]</strong>',
            );

        return `<tr>
          <td class="num">${i + 1}</td>
          <td class="num">${String(rec.tanggal ?? "").slice(0, 10) || "—"}</td>
          <td><strong>${nama}</strong><br/><small>${rm}</small></td>
          <td>${rec.dokter || "—"}</td>
          <td style="white-space: pre-wrap;">${formatBlock(parsed.STENT) || "—"}</td>
          <td style="white-space: pre-wrap;">${formatBlock(parsed.BALLOON) || "—"}</td>
          <td style="white-space: pre-wrap;">${formatBlock(parsed.ALKES_LAINNYA) || "—"}</td>
        </tr>`;
      })
      .join("\n");

    const table = `<table>
      <thead>
        <tr>
          <th style="width:40px">No</th>
          <th style="width:100px">Tanggal</th>
          <th style="width:180px">Pasien / RM</th>
          <th style="width:150px">Dokter</th>
          <th style="width:200px">STENT</th>
          <th style="width:200px">BALLOON</th>
          <th>ALKES LAINNYA</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows || '<tr><td colspan="7" class="num">Tidak ada data pemakaian.</td></tr>'}
      </tbody>
    </table>`;

    return wrapReportHtmlDocument({
      title: "LAPORAN PEMAKAIAN ALKES (CATHLAB)",
      subtitleLines: [
        ...filterSummaryLines,
        filterKategori ? `Kategori: ${filterKategori}` : "Semua Kategori",
        `Total: ${filteredRows.length} baris`,
      ],
      bodyInnerHtml: table,
    });
  }, [filteredRows, filterSummaryLines, filterKategori, parsePemakaian]);

  const buildExportWhatsApp = useCallback(() => {
    const lines = [
      "*LAPORAN PEMAKAIAN ALKES (CATHLAB)*",
      "",
      ...filterSummaryLines,
      filterKategori ? `Kategori: ${filterKategori}` : "Semua Kategori",
      `Total: ${filteredRows.length} baris`,
      "",
    ];

    filteredRows.slice(0, 20).forEach((r, i) => {
      const raw = r as unknown as Record<string, unknown>;
      const nama = normalizeNamaPasien(displayNamaPasien(raw));
      const tgl = String(r.tanggal ?? "").slice(5, 10); // MM-DD
      const parsed = parsePemakaian(String(r.pemakaian ?? ""));
      const allItems = [
        ...parsed.STENT,
        ...parsed.BALLOON,
        ...parsed.ALKES_LAINNYA,
      ];
      const pemakaian = allItems
        .join(", ")
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ");
      lines.push(`${i + 1}. [${tgl}] ${nama}: ${pemakaian}`);
    });

    if (filteredRows.length > 20) {
      lines.push("", `... +${filteredRows.length - 20} lainnya.`);
    }

    return lines.join("\n");
  }, [filteredRows, filterSummaryLines, filterKategori, parsePemakaian]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[min(100vw-1rem,96vw)] max-w-[min(96vw,92rem)] overflow-hidden p-0 flex flex-col border-slate-300/60 bg-white/98 backdrop-blur-xl dark:border-amber-500/35 dark:bg-black/85">
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6 text-slate-900 dark:text-white">
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <DialogHeader className="space-y-1 text-left sm:pr-2">
              <DialogTitle className="flex items-center gap-2 text-left font-bold tracking-wide">
                <Package
                  className="shrink-0 text-amber-600 dark:text-amber-400"
                  size={22}
                  strokeWidth={2.25}
                />
                Laporan Pemakaian Alkes
              </DialogTitle>
            </DialogHeader>
            <ReportExportActionBar
              disabled={loading}
              empty={!loading && filteredRows.length === 0}
              fileNameBase={`laporan-pemakaian-alkes-${new Date().toISOString().slice(0, 10)}`}
              buildHtml={buildExportHtml}
              buildWhatsAppText={buildExportWhatsApp}
            />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-lg border p-2.5 border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-black/30">
            <div className="flex flex-1 min-w-[200px] flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200/90">
                Cari Pasien / RM / Dokter
              </span>
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Ketik untuk mencari..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-amber-300/80 bg-white pl-8 pr-2 py-1 text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-white/20 dark:bg-black dark:text-white dark:placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200/90">
                Filter Kategori
              </span>
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="rounded-md border border-amber-300/80 bg-white px-2 py-1 text-[13px] font-semibold text-slate-900 dark:border-white/20 dark:bg-black dark:text-white"
              >
                <option value="">Semua Kategori</option>
                {kategoriOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200/80 dark:border-white/15">
            {loading ? (
              <div className="p-6 text-center text-sm font-semibold text-slate-600 dark:text-white/85">
                Memuat data…
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="p-6 text-center text-sm font-semibold text-slate-600 dark:text-white/85">
                Tidak ada data pemakaian alkes.
              </div>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-white/10">
                  <tr>
                    <th className="border border-slate-300/70 px-2 py-2 text-left dark:border-white/20">
                      Tanggal
                    </th>
                    <th className="border border-slate-300/70 px-2 py-2 text-left dark:border-white/20">
                      Pasien / RM
                    </th>
                    <th className="border border-slate-300/70 px-2 py-2 text-left dark:border-white/20">
                      Dokter
                    </th>
                    <th className="border border-slate-300/70 px-2 py-2 text-left dark:border-white/20">
                      STENT
                    </th>
                    <th className="border border-slate-300/70 px-2 py-2 text-left dark:border-white/20">
                      BALLOON
                    </th>
                    <th className="border border-slate-300/70 px-2 py-2 text-left dark:border-white/20">
                      ALKES LAINNYA
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {paginatedRows.map((r) => {
                    const parsed = parsePemakaian(String(r.pemakaian ?? ""));
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <td className="border border-slate-300/70 px-2 py-2 align-top dark:border-white/20">
                          {String(r.tanggal ?? "").slice(0, 10)}
                        </td>
                        <td className="border border-slate-300/70 px-2 py-2 align-top dark:border-white/20">
                          <div className="font-bold">
                            {normalizeNamaPasien(displayNamaPasien(r as any))}
                          </div>
                          <div className="text-[10px] opacity-70">
                            {displayRm(r as any)}
                          </div>
                        </td>
                        <td className="border border-slate-300/70 px-2 py-2 align-top dark:border-white/20">
                          {r.dokter || "—"}
                        </td>
                        <td className="border border-slate-300/70 px-2 py-2 align-top dark:border-white/20 whitespace-pre-wrap leading-relaxed">
                          {formatBlockText(parsed.STENT.join("\n\n"))}
                        </td>
                        <td className="border border-slate-300/70 px-2 py-2 align-top dark:border-white/20 whitespace-pre-wrap leading-relaxed">
                          {formatBlockText(parsed.BALLOON.join("\n\n"))}
                        </td>
                        <td className="border border-slate-300/70 px-2 py-2 align-top dark:border-white/20 whitespace-pre-wrap leading-relaxed">
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
            <div className="flex shrink-0 items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/50 px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
              <div className="text-[12px] font-medium text-slate-500 dark:text-white/60">
                Menampilkan{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {Math.min(
                    (currentPage - 1) * itemsPerPage + 1,
                    filteredRows.length,
                  )}
                </span>{" "}
                sampai{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {Math.min(currentPage * itemsPerPage, filteredRows.length)}
                </span>{" "}
                dari{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {filteredRows.length}
                </span>{" "}
                data
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1">
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
                          "flex h-8 min-w-[32px] items-center justify-center rounded-md border text-[12px] font-bold transition-colors",
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
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
