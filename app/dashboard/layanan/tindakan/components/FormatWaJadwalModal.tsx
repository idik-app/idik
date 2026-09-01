"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, Check, Copy, ExternalLink, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_LAYERS, Z_INDEX_VALUES } from "@/lib/ui/layers";
import { useNotification } from "@/app/contexts/NotificationContext";
import {
  buildJadwalElektifWhatsApp,
  formatTanggalFilterId,
  type JadwalElektifWaRow,
} from "../lib/buildJadwalElektifWhatsApp";
import { extractCalendarDateKey } from "./cells/EditableCells";
import { openWhatsAppWithText } from "../lib/reportExport";

type Props = {
  open: boolean;
  onClose: () => void;
  initialDate?: string;
  rows: JadwalElektifWaRow[];
};

function extractYmd(raw: unknown): string {
  return extractCalendarDateKey(String(raw ?? "").trim()) || String(raw ?? "").trim();
}

export default function FormatWaJadwalModal({
  open,
  onClose,
  initialDate,
  rows,
}: Props) {
  const { show } = useNotification();
  const today = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || today,
  );
  const [startDate, setStartDate] = useState<string>(initialDate || today);
  const [endDate, setEndDate] = useState<string>(initialDate || today);
  const [copied, setCopied] = useState(false);

  // Tanggal yang memiliki pasien beserta jumlah pasien
  const activeDatesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const ymd = extractYmd(r.tanggal);
      if (!ymd) continue;
      const isReady = Boolean(
        String(r.nama_pasien || r.nama || "").trim() ||
          String(r.no_rm || "").trim(),
      );
      if (isReady) {
        counts.set(ymd, (counts.get(ymd) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  // Rows yang terfilter sesuai pilihan tanggal / range
  const filteredRows = useMemo(() => {
    if (dateMode === "single") {
      const target = selectedDate.trim();
      return rows.filter((r) => extractYmd(r.tanggal) === target);
    }
    const from = startDate.trim();
    const to = endDate.trim();
    return rows.filter((r) => {
      const ymd = extractYmd(r.tanggal);
      return ymd >= from && ymd <= to;
    });
  }, [rows, dateMode, selectedDate, startDate, endDate]);

  const dateRangeLabel = useMemo(() => {
    if (dateMode === "single") return undefined;
    return `${formatTanggalFilterId(startDate)} s.d. ${formatTanggalFilterId(endDate)}`;
  }, [dateMode, startDate, endDate]);

  const waText = useMemo(() => {
    return buildJadwalElektifWhatsApp({
      tanggalYmd: dateMode === "single" ? selectedDate : undefined,
      dateRangeLabel,
      rows: filteredRows,
    });
  }, [dateMode, selectedDate, dateRangeLabel, filteredRows]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(waText);
      setCopied(true);
      show({ type: "success", message: "Format WA berhasil disalin ke clipboard!" });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      show({ type: "error", message: "Gagal menyalin teks ke clipboard." });
    }
  };

  const handleOpenWa = () => {
    openWhatsAppWithText(waText);
  };

  const readyCount = filteredRows.filter(
    (r) =>
      String(r.nama_pasien || r.nama || "").trim() ||
      String(r.no_rm || "").trim(),
  ).length;

  const content = (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity",
        UI_LAYERS.dialogContentTop,
      )}
      style={{ zIndex: Z_INDEX_VALUES.dialogContentTop }}
      onClick={onClose}
    >
      <div
        className="flex h-[88vh] max-h-[700px] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-emerald-500/20 bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 border border-white/20">
              <MessageCircle className="h-5 w-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                Format WhatsApp - Jadwal Cath Lab
              </h3>
              <p className="text-[11px] text-emerald-100/90 font-medium">
                Pilih tanggal yang akan di-copy & pratinjau teks pesan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </header>

        {/* Modal Controls Section */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          {/* Mode Switcher & Date Picker */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setDateMode("single")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-bold transition",
                  dateMode === "single"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                )}
              >
                1 Hari
              </button>
              <button
                type="button"
                onClick={() => setDateMode("range")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-bold transition",
                  dateMode === "range"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                )}
              >
                Rentang Tanggal
              </button>
            </div>

            {dateMode === "single" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tanggal:
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || today)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dari:
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value || today)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Sampai:
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value || today)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Quick Date Chips (dates with scheduled patients) */}
          {activeDatesWithCounts.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 [scrollbar-width:thin]">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pilih Cepat:
              </span>
              {activeDatesWithCounts.map(({ date, count }) => {
                const isActive =
                  dateMode === "single" && selectedDate === date;
                const dateParts = date.split("-");
                const label = `${dateParts[2]}/${dateParts[1]}`;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => {
                      setDateMode("single");
                      setSelectedDate(date);
                    }}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition",
                      isActive
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                    )}
                  >
                    <span>{label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[9px] font-extrabold",
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Live WA Format Text Preview */}
        <div className="relative flex flex-1 flex-col min-h-0 p-4 bg-slate-100 dark:bg-slate-950">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Pratinjau Teks (Otomatis Terisi):
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {readyCount} Pasien Siap
            </span>
          </div>

          <textarea
            readOnly
            value={waText}
            className="flex-1 w-full resize-none rounded-xl border border-slate-300 bg-white p-3.5 font-mono text-xs text-slate-800 shadow-inner focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 [scrollbar-width:thin]"
          />
        </div>

        {/* Footer Actions */}
        <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {readyCount === 0
              ? "Tidak ada pasien pada tanggal ini"
              : `${readyCount} pasien siap disalin`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenWa}
              disabled={readyCount === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ExternalLink size={14} />
              <span>Buka WA</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              disabled={readyCount === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40 transition shadow-md"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? "Tersalin!" : "Salin Teks WA"}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
