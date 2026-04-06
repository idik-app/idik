"use client";
import React from "react";
import { X, ExternalLink, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ModalWrapper from "@/components/global/ModalWrapper";

interface JadwalCathModalProps {
  open: boolean;
  onClose: () => void;
}

const SPREADSHEET_ID = "1LT16FmSNZht4sIU_B006MqV6wx06MSEqAF2P0tadDG4";

const JADWAL_CATH_TABS: readonly {
  label: string;
  gid: string;
  month: number;
}[] = [
  { label: "JANUARI", gid: "1170399313", month: 1 },
  { label: "FEBRUARI", gid: "0", month: 2 },
  { label: "MARET", gid: "0", month: 3 },
  { label: "APRIL", gid: "0", month: 4 },
  { label: "MEI", gid: "0", month: 5 },
  { label: "JUNI", gid: "0", month: 6 },
  { label: "JULI", gid: "0", month: 7 },
  { label: "AGUSTUS", gid: "0", month: 8 },
  { label: "SEPTEMBER", gid: "0", month: 9 },
  { label: "OKTOBER", gid: "0", month: 10 },
  { label: "NOVEMBER", gid: "0", month: 11 },
  { label: "DESEMBER", gid: "0", month: 12 },
] as const;

function buildPreviewUrl(gid: string, range?: string) {
  let url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/htmlembed?gid=${gid}&widget=false&chrome=false&rm=minimal`;
  if (range) {
    url += `&range=${range}`;
  }
  return url;
}

function buildEditUrl(gid: string) {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=${gid}`;
}

export default function JadwalCathModal({ open, onClose }: JadwalCathModalProps) {
  // 1. Gunakan objek tab sebagai state agar unik
  const [activeTab, setActiveTab] = React.useState(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    return (
      JADWAL_CATH_TABS.find((t) => t.month === month) || JADWAL_CATH_TABS[0]
    );
  });
  const [isLoading, setIsLoading] = React.useState(true);

  // Reset loading saat tab berubah
  React.useEffect(() => {
    setIsLoading(true);
  }, [activeTab]);

  // 2. Update saat modal dibuka
  React.useEffect(() => {
    if (!open) return;
    const now = new Date();
    const month = now.getMonth() + 1;
    setActiveTab(
      JADWAL_CATH_TABS.find((t) => t.month === month) || JADWAL_CATH_TABS[0],
    );
  }, [open]);

  // 3. Bangun URL berdasarkan activeTab
  const previewUrl = React.useMemo(() => {
    const isApril = activeTab.month === 4;
    const range = isApril ? "A27:I52" : undefined;
    return buildPreviewUrl(activeTab.gid, range);
  }, [activeTab]);

  const sheetUrl = React.useMemo(() => {
    return buildEditUrl(activeTab.gid);
  }, [activeTab]);

  if (!open) return null;

  return (
    <ModalWrapper onClose={onClose} isWide>
      <div className="flex flex-col h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-3 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Jadwal Tindakan Cath Lab
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-white/85 leading-tight">
                Jadwal harian tindakan Cath Lab 2026 — Otomatis memilih bulan & minggu berjalan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600/10 px-3 py-1.5 text-[11px] font-bold text-violet-600 transition hover:bg-violet-600 hover:text-white dark:bg-violet-600/20 dark:text-violet-400 dark:hover:bg-violet-600 dark:hover:text-white"
            >
              <ExternalLink size={14} />
              Buka Penuh
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-50 dark:hover:bg-white/5 dark:hover:text-slate-300"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Month Tabs */}
        <div
          role="tablist"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-slate-100 px-2 py-2 dark:border-white/10 dark:bg-zinc-800/90"
        >
          {JADWAL_CATH_TABS.map((tab) => {
            const isSelected = tab.label === activeTab.label;

            return (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1.5 text-left text-[11px] transition sm:px-3",
                  isSelected
                    ? "bg-white font-bold text-slate-900 shadow-sm dark:bg-white dark:text-slate-900"
                    : "bg-slate-200/90 font-medium text-slate-700 hover:bg-slate-300/90 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-black/20 flex flex-col p-0 sm:p-2 min-h-0">
          <div className="flex-1 rounded-none sm:rounded-xl border-y sm:border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-slate-900 shadow-inner relative min-h-[50vh]">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600 dark:text-violet-400" />
                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 animate-pulse">
                  Memuat jadwal Cath Lab...
                </p>
              </div>
            )}
            <iframe
              key={`${activeTab.label}-${activeTab.gid}`} // PENTING: Memaksa iframe refresh
              src={previewUrl}
              onLoad={() => setIsLoading(false)}
              className="absolute inset-0 w-full h-full border-0"
              title="Google Sheets Jadwal Cath"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 py-1.5 px-3 flex justify-between items-center gap-2 dark:border-white/10 shrink-0">
          <p className="text-[9px] text-slate-500 dark:text-white/85 italic">
            *Tampilan difokuskan pada minggu berjalan. Gunakan "Buka Penuh" untuk edit data.
          </p>
          <button
            onClick={onClose}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 shrink-0"
          >
            Tutup
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
