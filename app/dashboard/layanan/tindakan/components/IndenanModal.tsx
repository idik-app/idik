"use client";
import React from "react";
import { X, ExternalLink, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import ModalWrapper from "@/components/global/ModalWrapper";

interface IndenanModalProps {
  open: boolean;
  onClose: () => void;
}

export default function IndenanModal({ open, onClose }: IndenanModalProps) {
  const SHEET_URL = "https://docs.google.com/spreadsheets/d/1LT16FmSNZht4sIU_B006MqV6wx06MSEqAF2P0tadDG4/edit?gid=428535125#gid=428535125";
  // Convert to embed/preview link for iframe
  const EMBED_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS6_M7X_H_X_f_k_f_f_f_f_f_f_f_f_f_f_f_f_f_f_f_f_f_f_f_f_f/pubhtml?widget=true&headers=false"; 
  // Note: The above EMBED_URL is a placeholder, usually Google Sheets requires "Publish to Web" to get a clean embed link.
  // Given the user provided the edit link, I will show the edit link clearly and try to embed the viewer if possible, 
  // but most often an iframe of an /edit link won't work due to X-Frame-Options.
  // So I will provide a button to open in new tab and maybe a preview if possible.
  const previewUrl = React.useMemo(() => {
    const base = SHEET_URL.split(/[#?]/)[0].replace("/edit", "/preview");
    const gid = SHEET_URL.match(/gid=([0-9]+)/)?.[1];
    return `${base}?rm=minimal&chrome=false&widget=true${gid ? `&gid=${gid}` : ""}`;
  }, [SHEET_URL]);

  if (!open) return null;

  return (
    <ModalWrapper isOpen={open} onClose={onClose} isWide>
      <div className="flex flex-col h-[88vh]">
        {/* Header - More compact */}
        <div className="flex items-center justify-between border-b border-slate-200 p-3 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <CalendarDays size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Jadwal Indenan Pasien
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Data jadwal indenan pasien tahun 2026
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={SHEET_URL}
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

        {/* Content - Removed extra padding and optimized for the iframe */}
        <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-black/20 flex flex-col p-0 sm:p-2">
          <div className="flex-1 rounded-none sm:rounded-xl border-y sm:border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-slate-900 shadow-inner relative">
            <iframe
              src={previewUrl}
              className="absolute inset-0 w-full h-full border-0"
              title="Google Sheets Indenan"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>

        {/* Footer - Minimalist */}
        <div className="border-t border-slate-200 py-1.5 px-3 flex justify-between items-center dark:border-white/10 shrink-0">
          <p className="text-[9px] text-slate-400 italic">
            *Tampilan preview mungkin sedikit tertunda. Gunakan "Buka Penuh" jika tidak muncul.
          </p>
          <button 
            onClick={onClose}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Tutup
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
