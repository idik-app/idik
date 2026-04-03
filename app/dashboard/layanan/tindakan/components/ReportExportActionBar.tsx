"use client";

import { Download, MessageCircle, Printer } from "lucide-react";
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
  className?: string;
};

export default function ReportExportActionBar({
  disabled = false,
  empty = false,
  fileNameBase,
  buildHtml,
  buildWhatsAppText,
  className,
}: Props) {
  const blocked = disabled || empty;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
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
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-extrabold transition",
          "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
          "dark:border-white/25 dark:bg-black/50 dark:text-white dark:hover:bg-black/70",
          "disabled:cursor-not-allowed disabled:opacity-45",
        )}
        title="Cetak (dialog printer)"
      >
        <Printer size={14} className="shrink-0" strokeWidth={2.25} />
        Cetak
      </button>
      <button
        type="button"
        disabled={blocked}
        onClick={() => downloadReportHtml(fileNameBase, buildHtml())}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-extrabold transition",
          "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
          "dark:border-white/25 dark:bg-black/50 dark:text-white dark:hover:bg-black/70",
          "disabled:cursor-not-allowed disabled:opacity-45",
        )}
        title="Unduh berkas HTML (buka di browser / cetak)"
      >
        <Download size={14} className="shrink-0" strokeWidth={2.25} />
        Unduh
      </button>
      <button
        type="button"
        disabled={blocked}
        onClick={() => openWhatsAppWithText(buildWhatsAppText())}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-extrabold transition",
          "border-emerald-600/70 bg-emerald-600 text-white hover:brightness-110",
          "dark:border-emerald-500/60 dark:bg-emerald-700 dark:text-white",
          "disabled:cursor-not-allowed disabled:opacity-45",
        )}
        title="Buka WhatsApp dengan ringkasan teks (pesan dibatasi panjang)"
      >
        <MessageCircle size={14} className="shrink-0" strokeWidth={2.25} />
        Kirim WA
      </button>
    </div>
  );
}
