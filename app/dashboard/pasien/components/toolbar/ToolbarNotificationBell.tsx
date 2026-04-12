"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Bell, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  XCircle, 
  Clock,
  ExternalLink,
  Settings
} from "lucide-react";
import { useNotificationBell } from "@/app/contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

const NOTIF_ICONS = {
  success: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  error: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
  info: <Info className="w-3.5 h-3.5 text-cyan-400" />,
  system: <Settings className="w-3.5 h-3.5 text-slate-400" />,
}

export function ToolbarNotificationBell() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { bellAlerts, clearBellAlert, clearAllBellAlerts } =
    useNotificationBell();

  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    right: number;
  } | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !containerRef.current) {
      setDropdownRect(null);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 12,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inButton = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inButton && !inDropdown) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative p-2 rounded-full border transition-all duration-300 ${
          open 
            ? "border-cyan-400 bg-cyan-900/40 shadow-[0_0_15px_rgba(0,255,255,0.4)]" 
            : "border-cyan-400/40 hover:bg-cyan-900/30"
        }`}
        aria-label={`Notifikasi${bellAlerts.length > 0 ? `, ${bellAlerts.length} baru` : ""}`}
      >
        <Bell className={`w-4 h-4 transition-colors ${open ? "text-white" : "text-cyan-300"}`} />
        {bellAlerts.length > 0 && (
          <span
            className="absolute -top-1 -right-1 bg-amber-400 text-black text-[9px]
                           font-extrabold rounded-full h-4 min-w-[16px] flex items-center justify-center 
                           px-1 shadow-[0_0_8px_rgba(255,215,0,0.6)] animate-pulse"
          >
            {bellAlerts.length > 99 ? "99+" : bellAlerts.length}
          </span>
        )}
      </button>

      {mounted &&
        createPortal(
          <>
            {open && dropdownRect && (
              <div
                ref={dropdownRef}
                style={{
                  position: "fixed",
                  top: dropdownRect.top,
                  right: dropdownRect.right,
                  width: 320,
                  zIndex: 9999,
                }}
                className="max-h-[480px] overflow-hidden flex flex-col
                         bg-[#0a1118]/95 border border-cyan-500/20 rounded-2xl backdrop-blur-xl
                         text-xs text-cyan-100 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_20px_rgba(0,255,255,0.1)]
                         animate-in fade-in slide-in-from-top-4 duration-300"
              >
                {/* Header Dropdown */}
                <div className="p-3.5 border-b border-cyan-500/10 flex items-center justify-between sticky top-0 bg-white/5 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-cyan-500/10">
                      <Bell size={14} className="text-cyan-400" />
                    </div>
                    <span className="font-bold tracking-wide uppercase text-[10px] text-cyan-100">Panel Notifikasi</span>
                  </div>
                  {bellAlerts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearAllBellAlerts()}
                      className="px-2 py-1 rounded hover:bg-rose-500/10 text-[9px] font-bold uppercase tracking-widest text-cyan-400/60 hover:text-rose-400 transition-all"
                    >
                      Bersihkan
                    </button>
                  )}
                </div>

                {/* List Dropdown */}
                <div className="overflow-y-auto p-0 flex-1 divide-y divide-cyan-500/5 custom-scroll">
                  {bellAlerts.length === 0 ? (
                    <div className="py-12 px-6 text-center flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
                        <Bell className="w-5 h-5 text-slate-600" />
                      </div>
                      <p className="text-slate-400 font-medium">Tidak ada notifikasi baru</p>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Sistem Standby</p>
                    </div>
                  ) : (
                    bellAlerts.map((a) => (
                      <div
                        key={a.id}
                        className="p-4 hover:bg-white/5 transition-all flex items-start gap-3 group relative"
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {NOTIF_ICONS[a.type as keyof typeof NOTIF_ICONS] || NOTIF_ICONS.info}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${
                              a.type === 'success' ? 'text-emerald-400/70' :
                              a.type === 'warning' ? 'text-amber-400/70' :
                              a.type === 'error' ? 'text-rose-400/70' :
                              'text-cyan-400/70'
                            }`}>
                              {a.type || 'info'}
                            </span>
                            <div className="flex items-center gap-1 text-[9px] text-slate-500">
                              <Clock size={8} />
                              {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: id })}
                            </div>
                          </div>
                          
                          <p className="text-[12px] leading-relaxed text-slate-300 group-hover:text-cyan-50 transition-colors">
                            {a.message.split('**').map((part, i) => 
                              i % 2 === 1 ? <strong key={i} className="text-cyan-300 font-bold">{part}</strong> : part
                            )}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearBellAlert(a.id);
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
                            aria-label="Hapus"
                            title="Hapus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Dropdown */}
                {bellAlerts.length > 0 && (
                  <div className="p-2 border-t border-cyan-500/10 bg-white/5 text-center">
                    <button className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-500/50 hover:text-cyan-400 transition-colors py-1">
                      Full Activity Log
                    </button>
                  </div>
                )}
              </div>
            )}
          </>,
          document.body,
        )}
    </div>
  );
}
