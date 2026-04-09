"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, ExternalLink, Calendar, Loader2, Info, CheckCircle2, Zap, ArrowRightCircle, Maximize2 } from "lucide-react";
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
  { label: "MARET", gid: "1730678100", month: 3 },
  { label: "APRIL", gid: "1031262930", month: 4 },
  { label: "MEI", gid: "0", month: 5 },
  { label: "JUNI", gid: "0", month: 6 },
  { label: "JULI", gid: "0", month: 7 },
  { label: "AGUSTUS", gid: "0", month: 8 },
  { label: "SEPTEMBER", gid: "0", month: 9 },
  { label: "OKTOBER", gid: "0", month: 10 },
  { label: "NOVEMBER", gid: "0", month: 11 },
  { label: "DESEMBER", gid: "0", month: 12 },
] as const;

/**
 * AUTO-SCROLL LOGIC (RANGE MINGGU BERJALAN)
 * Fungsi ini menghitung baris mana yang harus ditampilkan berdasarkan tanggal hari ini.
 */
function getSmartWeeklyRange() {
  const now = new Date();
  const day = now.getDate();
  
  // Menggunakan struktur standar grid (sekitar 28 baris per minggu)
  if (day <= 7) return "A1:I28";
  if (day <= 14) return "A29:I56";
  if (day <= 21) return "A57:I84";
  if (day <= 28) return "A85:I112";
  return "A113:I140";
}

export default function JadwalCathModal({ open, onClose }: JadwalCathModalProps) {
  const today = useMemo(() => new Date(), []);
  const [activeTab, setActiveTab] = useState(() => {
    const month = today.getMonth() + 1;
    return (
      JADWAL_CATH_TABS.find((t) => t.month === month) || JADWAL_CATH_TABS[0]
    );
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showStatus, setShowStatus] = useState(false);

  // Jika GID bulan aktif adalah "0", gunakan GID Maret sebagai fallback utama (atau Januari jika ada)
  const currentGid = activeTab.gid !== "0" ? activeTab.gid : "1730678100";
  const currentRange = useMemo(() => getSmartWeeklyRange(), [activeTab, today]);

  const previewUrl = useMemo(() => {
    return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/htmlembed?gid=${currentGid}&range=${currentRange}&widget=false&chrome=false&rm=minimal`;
  }, [currentGid, currentRange]);

  const sheetUrl = useMemo(() => {
    return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=${currentGid}`;
  }, [currentGid]);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      const month = today.getMonth() + 1;
      const currentMonthTab = JADWAL_CATH_TABS.find((t) => t.month === month);
      if (currentMonthTab) setActiveTab(currentMonthTab);
    }
  }, [open, today]);

  useEffect(() => {
    setIsLoading(true);
  }, [activeTab]);

  if (!open) return null;

  return (
    <ModalWrapper 
      onClose={onClose} 
      isWide 
      className="p-0 border-white/10 bg-zinc-950 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden h-[95vh] shadow-2xl max-w-7xl"
    >
      <div className="flex flex-col h-full bg-zinc-950 text-white">
        {/* Header Section */}
        <header className="flex items-center justify-between p-4 sm:p-8 border-b border-white/5 bg-zinc-900/40 backdrop-blur-2xl shrink-0">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-[1.25rem] bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-violet-500/20">
              <Calendar size={20} className="text-white sm:hidden" />
              <Calendar size={28} className="text-white hidden sm:block" />
            </div>
            <div>
              <div className="flex items-center gap-2 sm:gap-3">
                <h2 className="text-sm sm:text-2xl font-black tracking-tight leading-tight">
                  Jadwal Tindakan Cath Lab
                </h2>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-[8px] sm:text-[10px] font-black text-white animate-pulse">
                  AUTO-SYNC
                </span>
              </div>
              <p className="text-[9px] sm:text-xs font-bold text-zinc-400 mt-0.5 sm:mt-1 uppercase tracking-widest flex items-center gap-1 sm:gap-2">
                {activeTab.label} 2026 <ArrowRightCircle size={10} className="text-zinc-600 hidden sm:block" /> 
                <span className="hidden sm:inline">RANGE MINGGU BERJALAN:</span> 
                <span className="text-violet-400">{currentRange}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setShowStatus(!showStatus)}
              className={cn(
                "hidden md:flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                showStatus ? "bg-white text-black border-white" : "bg-zinc-800/50 text-zinc-400 border-white/5 hover:bg-zinc-800"
              )}
            >
              <Info size={16} /> {showStatus ? "Tutup Info" : "Status Tab GID"}
            </button>
            <button 
              onClick={onClose} 
              className="h-9 w-9 sm:h-12 sm:w-12 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-red-500/10 hover:text-red-500 transition-all border border-white/5"
            >
              <X size={20} className="sm:hidden" />
              <X size={24} className="hidden sm:block" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden relative bg-black/20">
          {/* Status Overlay */}
          {showStatus && (
            <div className="absolute left-4 top-4 bottom-4 sm:left-8 sm:top-8 sm:bottom-8 w-64 sm:w-72 bg-zinc-900/95 backdrop-blur-2xl border border-white/10 z-40 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 animate-in slide-in-from-left duration-500 shadow-2xl overflow-y-auto">
              <h3 className="text-[10px] font-black text-zinc-400 mb-6 sm:mb-8 uppercase tracking-[0.3em]">
                Discovery Status 2026
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {JADWAL_CATH_TABS.map((tab) => {
                  const hasGid = tab.gid !== "0";
                  return (
                    <div key={tab.label} className={cn(
                      "flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-[10px] sm:text-[11px] font-bold transition-all",
                      hasGid ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/5 text-zinc-600"
                    )}>
                      {tab.label}
                      {hasGid ? <CheckCircle2 size={14} /> : <div className="h-1.5 w-1.5 rounded-full bg-zinc-800" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Iframe Viewport */}
          <div className="flex-1 p-2 sm:p-8 relative flex flex-col min-h-0">
            <div className="flex-1 rounded-xl sm:rounded-[2.5rem] overflow-hidden border border-white/10 bg-white shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative">
              {isLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950">
                  <div className="relative">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-zinc-800 border-t-violet-500 rounded-full animate-spin" />
                    <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-violet-500 animate-pulse" size={20} />
                  </div>
                  <span className="mt-6 sm:mt-8 text-[10px] sm:text-[11px] font-black text-zinc-400 uppercase tracking-[0.5em] animate-pulse">
                    Syncing Grid...
                  </span>
                </div>
              )}
              <iframe
                key={`${activeTab.label}-${currentGid}-${currentRange}`}
                src={previewUrl}
                onLoad={() => setIsLoading(false)}
                className="w-full h-full border-0"
                title="Google Sheets Jadwal Cath Lab"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
            
            {/* Quick Actions */}
            <div className="absolute bottom-6 right-6 sm:bottom-12 sm:right-12 flex gap-3">
              <a 
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 sm:h-14 px-4 sm:px-8 bg-zinc-900 text-white rounded-lg sm:rounded-[1.25rem] border border-white/10 shadow-2xl flex items-center gap-2 sm:gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
              >
                <Maximize2 size={16} /> <span className="hidden sm:inline">Buka Full Sheet</span><span className="sm:hidden">Full</span>
              </a>
            </div>
          </div>
        </main>

        {/* Custom Navigation */}
        <footer className="p-4 sm:p-8 bg-zinc-900/60 border-t border-white/5 shrink-0">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide justify-start lg:justify-center">
            {JADWAL_CATH_TABS.map((tab) => {
              const m = tab.month;
              const isCurrent = m === (today.getMonth() + 1);
              const isActive = tab.month === activeTab.month;
              
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "shrink-0 relative px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1 sm:gap-2 group",
                    isActive 
                      ? "bg-white text-black shadow-2xl -translate-y-1 sm:-translate-y-2 scale-105" 
                      : "bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10"
                  )}
                >
                  {tab.label.substring(0, 3)}
                  {isCurrent && !isActive && (
                    <span className="absolute top-2 right-2 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-violet-500 rounded-full border border-zinc-900" />
                  )}
                  {isActive && <div className="h-0.5 sm:h-1 w-4 sm:w-6 bg-violet-600 rounded-full animate-bounce" />}
                </button>
              );
            })}
          </div>
        </footer>
      </div>
    </ModalWrapper>
  );
}
