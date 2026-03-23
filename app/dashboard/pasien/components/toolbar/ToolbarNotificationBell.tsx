"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationBell } from "@/app/contexts/NotificationContext";

export function ToolbarNotificationBell() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    bellAlerts,
    clearBellAlert,
    clearAllBellAlerts,
  } = useNotificationBell();

  const [dropdownRect, setDropdownRect] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => setMounted(true), []);

  // Posisi dropdown saat dibuka (agar align dengan tombol bell)
  useEffect(() => {
    if (!open || !containerRef.current) {
      setDropdownRect(null);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  // Tutup saat klik di luar (dropdown di portal, jadi cek container + dropdown)
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
        className="relative p-2 rounded-full border border-cyan-400/40 hover:bg-cyan-900/40"
        aria-label={`Notifikasi${bellAlerts.length > 0 ? `, ${bellAlerts.length} baru` : ""}`}
      >
        <Bell className="w-4 h-4 text-cyan-300" />
        {bellAlerts.length > 0 && (
          <span
            className="absolute top-0 right-0 bg-amber-400 text-black text-[9px]
                           font-bold rounded-full px-1 min-w-[14px] text-center"
          >
            {bellAlerts.length > 99 ? "99+" : bellAlerts.length}
          </span>
        )}
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && dropdownRect && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onMouseLeave={() => setOpen(false)}
                style={{
                  position: "fixed",
                  top: dropdownRect.top,
                  right: dropdownRect.right,
                  width: 256,
                  zIndex: 9999,
                }}
                className="w-64 max-h-80 overflow-hidden flex flex-col
                         bg-black/90 border border-cyan-400/40 rounded-xl backdrop-blur-md
                         text-xs text-cyan-100 shadow-xl"
              >
                <div className="p-2 border-b border-cyan-400/20 flex items-center justify-between sticky top-0 bg-black/90">
                  <span className="font-semibold">Notifikasi</span>
                  {bellAlerts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearAllBellAlerts()}
                      className="p-1 rounded hover:bg-cyan-500/20 text-amber-400/90 flex items-center gap-1"
                      title="Bersihkan semua"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Bersihkan
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto p-2 space-y-1">
                  {bellAlerts.length === 0 ? (
                    <p className="py-4 text-center text-cyan-400/70">Tidak ada notifikasi</p>
                  ) : (
                    bellAlerts.map((a) => (
                      <div
                        key={a.id}
                        className="p-2 border-b border-cyan-400/20 last:border-none flex items-start justify-between gap-2 group"
                      >
                        <span className="flex-1 min-w-0">{a.message}</span>
                        <button
                          type="button"
                          onClick={() => clearBellAlert(a.id)}
                          className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-cyan-500/20 shrink-0"
                          aria-label="Hapus notifikasi"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
