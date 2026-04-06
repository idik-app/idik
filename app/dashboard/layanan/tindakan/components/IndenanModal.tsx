"use client";
import React from "react";
import { X, ExternalLink, CalendarDays, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ModalWrapper from "@/components/global/ModalWrapper";

interface IndenanModalProps {
  open: boolean;
  onClose: () => void;
}

const SPREADSHEET_ID = "1DkFj6f_ITN-QQ89gXrFZ7qxSBpm0SgL1FnfpG6dobfc";

/** 
 * 1. Mapping GID: Memetakan label tab ke GID spreadsheet 
 * GID ini diambil langsung dari struktur internal spreadsheet 1DkFj6f...
 */
const INDENAN_TABS: readonly { label: string; gid: string }[] = [
  { label: "01 Des - 02 Jan 2026", gid: "2029454536" },
  { label: "05 Jan - 30 Jan 2026", gid: "312681018" },
  { label: "02 Feb - 27 Feb 2026", gid: "1197802667" },
  { label: "02 Mar - 27 Mar 2026", gid: "1544771134" },
  { label: "30 Mar - 01 Mei 2026", gid: "1629068862" },
  { label: "04 Mei - 29 Mei 2026", gid: "1569525829" },
  { label: "01 Jun - 26 Jun 2026", gid: "2026323184" },
  { label: "master", gid: "0" },
] as const;

const MASTER_GID = "0";

/** 
 * 2. Update Source URL: Menggunakan htmlembed dan rm=minimal untuk tampilan bersih 
 * widget=false & chrome=false menghilangkan bar navigasi bawaan Google.
 */
function buildPreviewUrl(gid: string) {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/htmlembed?gid=${gid}&widget=false&chrome=false&rm=minimal`;
}

function buildEditUrl(gid: string) {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?usp=drivesdk&gid=${encodeURIComponent(gid)}`;
}

/**
 * 3. Sinkronisasi Awal (Auto-Match): Deteksi bulan untuk tab default
 */
function resolveIndenanDefaultGid(now: Date): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  if (year !== 2026) return MASTER_GID;

  if (month === 1 && day <= 4) return "2029454536";
  if (month === 1) return "312681018";
  if (month === 2) return "1197802667";
  if (month === 3 || month === 4) return "1629068862";
  if (month === 5) return "1569525829";
  if (month === 6) return "2026323184";
  return MASTER_GID;
}

export default function IndenanModal({ open, onClose }: IndenanModalProps) {
  const [activeGid, setActiveGid] = React.useState<string>(() =>
    resolveIndenanDefaultGid(new Date()),
  );
  const [isLoading, setIsLoading] = React.useState(true);

  // Reset loading saat tab berubah
  React.useEffect(() => {
    setIsLoading(true);
  }, [activeGid]);

  React.useEffect(() => {
    if (!open) return;
    setActiveGid(resolveIndenanDefaultGid(new Date()));
  }, [open]);

  const previewUrl = React.useMemo(
    () => buildPreviewUrl(activeGid),
    [activeGid],
  );

  const sheetUrl = React.useMemo(
    () => buildEditUrl(activeGid),
    [activeGid],
  );

  if (!open) return null;

  return (
    <ModalWrapper onClose={onClose} isWide>
      <div className="flex flex-col h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-3 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <CalendarDays size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Jadwal Indenan Pasien
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-white/85 leading-tight">
                Data jadwal indenan pasien tahun 2026 — sinkronisasi otomatis sesuai bulan berjalan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/10 px-3 py-1.5 text-[11px] font-bold text-blue-600 transition hover:bg-blue-600 hover:text-white dark:bg-blue-600/20 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white"
            >
              <ExternalLink size={14} />
              Buka Penuh
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Custom Tab Navigation */}
        <div
          role="tablist"
          aria-label="Periode jadwal indenan"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-slate-100 px-2 py-2 dark:border-white/10 dark:bg-zinc-800/90"
        >
          {INDENAN_TABS.map((tab) => {
            const isActive = tab.gid === activeGid;
            return (
              <button
                key={tab.gid}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveGid(tab.gid)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1.5 text-left text-[11px] transition sm:px-3",
                  isActive
                    ? "bg-white font-bold text-slate-900 shadow-sm dark:bg-white dark:text-slate-900"
                    : "bg-slate-200/90 font-medium text-slate-700 hover:bg-slate-300/90 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content with Loading State */}
        <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-black/20 flex flex-col p-0 sm:p-2 min-h-0">
          <div className="flex-1 rounded-none sm:rounded-xl border-y sm:border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-slate-900 shadow-inner relative min-h-[50vh]">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 animate-pulse">
                  Memuat data spreadsheet...
                </p>
              </div>
            )}
            <iframe
              key={previewUrl}
              src={previewUrl}
              onLoad={() => setIsLoading(false)}
              className="absolute inset-0 w-full h-full border-0"
              title="Google Sheets Indenan"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 py-1.5 px-3 flex justify-between items-center gap-2 dark:border-white/10 shrink-0">
          <p className="text-[9px] text-slate-500 dark:text-white/85 italic">
            *Navigasi bawah Google disembunyikan. Gunakan tab di atas untuk pindah periode.
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
