"use client";

import { Download, FileSpreadsheet, MessageCircle, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  downloadReportHtml,
  openWhatsAppWithText,
  printReportHtml,
} from "../lib/reportExport";

type Props = {
  /** Nonaktifkan saat memuat data. */
  disabled?: boolean;
  /** Nonaktifkan unduh/cetak/WA jika tidak ada baris. */
  empty?: boolean;
  /** Nama file unduhan tanpa ekstensi (mis. `laporan-fast-track-2026-04`). */
  fileNameBase: string;
  buildHtml: () => string;
  buildWhatsAppText: () => string;
  onDownloadExcel?: () => void;
  className?: string;
  /** Label tambahan untuk tombol (opsional, misal "Alkes"). */
  label?: string;
  /** Sembunyikan tombol Unduh & WA (hanya tampilkan tombol utama/Cetak). */
  minimal?: boolean;
};

export default function ReportExportActionBar({
  disabled = false,
  empty = false,
  fileNameBase,
  buildHtml,
  buildWhatsAppText,
  onDownloadExcel,
  className,
  label,
  minimal = false,
}: Props) {
  const blocked = disabled || empty;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1",
        className,
      )}
      role="group"
      aria-label="Ekspor laporan"
    >
      <button
        type="button"
        disabled={blocked}
        onClick={() => printReportHtml(buildHtml())}
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-extrabold transition",
          "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
          "dark:border-white/25 dark:bg-black/50 dark:text-white dark:hover:bg-black/70",
          "disabled:cursor-not-allowed disabled:opacity-45",
          minimal && "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/10"
        )}
        title="Cetak (dialog printer)"
      >
        <Printer size={12} className="shrink-0" strokeWidth={2.25} />
        {label ? `${label}` : "Cetak"}
      </button>

      {onDownloadExcel && (
        <button
          type="button"
          disabled={blocked}
          onClick={onDownloadExcel}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-extrabold transition",
            "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
            "dark:border-white/25 dark:bg-black/50 dark:text-white dark:hover:bg-black/70",
            "disabled:cursor-not-allowed disabled:opacity-45",
          )}
          title="Unduh format Excel (.xlsx)"
        >
          <FileSpreadsheet size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
          Excel
        </button>
      )}

      {!minimal && (
        <>
          <button
            type="button"
            disabled={blocked}
            onClick={() => openWhatsAppWithText(buildWhatsAppText())}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-extrabold transition",
              "border-emerald-600/70 bg-emerald-600 text-white hover:brightness-110",
              "dark:border-emerald-500/60 dark:bg-emerald-700 dark:text-white",
              "disabled:cursor-not-allowed disabled:opacity-45",
            )}
            title="Buka WhatsApp dengan ringkasan teks (pesan dibatasi panjang)"
          >
            <MessageCircle size={12} className="shrink-0" strokeWidth={2.25} />
            WA
          </button>
        </>
      )}
    </div>
  );
}
