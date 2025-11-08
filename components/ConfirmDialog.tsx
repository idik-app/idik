"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

/* ---------------------------------------------------
   💠 ConfirmDialog – Cathlab JARVIS Mode v3.5.2
   Fix pointer-events + z-index isolate
---------------------------------------------------- */

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/* 🎵 Efek suara ringan */
const playSound = (type: "open" | "confirm" | "cancel") => {
  let soundFile = "";
  switch (type) {
    case "open":
      soundFile = "/sounds/ping-soft.mp3";
      break;
    case "confirm":
      soundFile = "/sounds/zap-low.mp3";
      break;
    case "cancel":
      soundFile = "/sounds/whoosh-close.mp3";
      break;
  }
  const audio = new Audio(soundFile);
  audio.volume = 0.4;
  audio.play().catch(() => {});
};

export default function ConfirmDialog({
  open,
  title = "Konfirmasi",
  message = "Apakah Anda yakin ingin menghapus data ini?",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (open) playSound("open");
  }, [open]);

  return (
    <AnimatePresence mode="wait">
      {open ? (
        <motion.div
          key="overlay"
          className="fixed inset-0 z-[9999] flex items-center justify-center 
                     bg-black/60 backdrop-blur-md"
          style={{
            pointerEvents: open ? "auto" : "none", // ✅ cegah blok klik tabel
            isolation: "isolate",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            key="dialog"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="relative bg-gradient-to-br from-cyan-900/40 to-black/70 
                       border border-cyan-400/40 rounded-2xl p-6 
                       shadow-[0_0_25px_rgba(0,255,255,0.4)] 
                       text-center max-w-sm mx-auto text-cyan-100"
            style={{ pointerEvents: "auto" }}
          >
            <div className="flex justify-center mb-4">
              <AlertTriangle className="text-yellow-400 w-12 h-12 drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]" />
            </div>

            <h2 className="text-lg font-semibold text-yellow-300 mb-2">
              {title}
            </h2>
            <p className="text-cyan-100 text-sm mb-6 leading-relaxed">
              {message}
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  playSound("cancel");
                  onCancel();
                }}
                className="px-4 py-2 rounded-lg text-cyan-300 border border-cyan-500/40 
                           hover:bg-cyan-900/50 hover:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition"
              >
                Batal
              </button>

              <button
                onClick={() => {
                  playSound("confirm");
                  onConfirm();
                }}
                className="px-4 py-2 rounded-lg bg-red-600/70 hover:bg-red-600/90 
                           text-white font-semibold 
                           shadow-[0_0_12px_rgba(255,0,0,0.4)] 
                           hover:shadow-[0_0_18px_rgba(255,0,0,0.6)] transition"
              >
                Ya, Hapus
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
