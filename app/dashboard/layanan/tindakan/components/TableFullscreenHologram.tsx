"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DiagnosticsHUD from "@/components/DiagnosticsHUD";

interface TableFullscreenHologramProps {
  title?: string;
  children: React.ReactNode;
}

/**
 * 🧩 TableFullscreenHologram v1.0
 * Komponen JARVIS Gold-Cyan Hybrid untuk menampilkan tabel dalam mode fullscreen hologram.
 */
export default function TableFullscreenHologram({
  title = "Tabel Data",
  children,
}: TableFullscreenHologramProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Tombol Toggle di Toolbar */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "rounded-full border border-cyan-500/40 text-cyan-400 hover:text-gold-300",
          "hover:bg-cyan-800/40 transition"
        )}
        onClick={() => setIsOpen(true)}
        title="Layar Penuh"
      >
        <Maximize2 size={18} />
      </Button>

      {/* Overlay Hologram */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className={cn(
                "relative w-[95vw] h-[90vh] overflow-hidden rounded-2xl",
                "border border-cyan-500/30 shadow-[0_0_25px_rgba(0,255,255,0.3)]",
                "bg-gradient-to-br from-gray-950 via-gray-900 to-cyan-950"
              )}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-cyan-700/40">
                <h2 className="text-lg font-semibold text-cyan-300 tracking-wide">
                  {title}
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => document.documentElement.requestFullscreen()}
                    className="text-cyan-400 hover:text-gold-300 hover:bg-cyan-800/40 rounded-full"
                    title="Fullscreen Browser"
                  >
                    <Maximize2 size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-full"
                    title="Tutup"
                  >
                    <X size={18} />
                  </Button>
                </div>
              </div>

              {/* Konten Tabel */}
              <div className="relative p-4 overflow-auto h-[calc(90vh-80px)] custom-scroll">
                {children}
              </div>

              {/* DiagnosticsHUD Tetap Aktif */}
              <div className="absolute bottom-3 right-4 scale-90 opacity-80">
                <DiagnosticsHUD module="Tindakan" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
