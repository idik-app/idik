"use client";
import { motion, AnimatePresence } from "framer-motion";

interface ToolbarInsightPanelProps {
  show: boolean;
  insightText: string;
}

export default function ToolbarInsightPanel({
  show,
  insightText,
}: ToolbarInsightPanelProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          /** ───────────────────────────────
           *  Tata letak diperkuat:
           *  - relative agar tidak absolute float
           *  - z-index tinggi agar tak tertutup
           *  - max-width adaptif dan wrapping teks
           *  - margin top untuk jarak dari toolbar
           *  - pointer-events-auto agar tidak blok klik lain
           */
          className="relative z-20 mx-auto mt-3 w-full max-w-3xl 
                     px-4 py-2 text-[12px] leading-relaxed
                     text-cyan-100 rounded-lg text-center
                     bg-gradient-to-r from-cyan-900/60 to-gray-900/80
                     border border-yellow-400/30
                     shadow-[0_0_20px_rgba(255,215,0,0.25)]
                     backdrop-blur-md whitespace-pre-line
                     pointer-events-auto"
        >
          {insightText}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
