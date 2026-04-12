"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEventBridge } from "@/contexts/EventBridgeContext";
import { Wand2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GlobalExtractionProgress() {
  const { subscribe } = useEventBridge();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"processing" | "success">("processing");
  const [title, setTitle] = useState("Mengekstrak Laporan");

  useEffect(() => {
    const unsubStart = subscribe("extraction:start", (data?: { title?: string }) => {
      setActive(true);
      setProgress(10);
      setStatus("processing");
      setTitle(data?.title || "Mengekstrak Laporan");
    });

    const unsubProgress = subscribe("extraction:progress", (data: { progress: number }) => {
      setProgress(data.progress);
    });

    const unsubEnd = subscribe("extraction:end", () => {
      setStatus("success");
      setProgress(100);
      setTimeout(() => {
        setActive(false);
      }, 1500); // Dipercepat menjadi 1.5 detik agar tidak menutupi layar terlalu lama
    });

    return () => {
      unsubStart();
      unsubProgress();
      unsubEnd();
    };
  }, [subscribe]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed left-1/2 top-4 z-[9999] -translate-x-1/2 w-full max-w-[320px] px-4"
        >
          <div className={cn(
            "relative overflow-hidden rounded-2xl border p-3 shadow-2xl backdrop-blur-md transition-colors duration-500",
            status === "processing" 
              ? "border-cyan-500/30 bg-black/60 shadow-cyan-500/10" 
              : "border-emerald-500/30 bg-black/60 shadow-emerald-500/10"
          )}>
            {/* Background progress bar */}
            <div className="absolute inset-0 z-0">
              <motion.div 
                className={cn(
                  "h-full transition-colors duration-500",
                  status === "processing" ? "bg-cyan-500/5" : "bg-emerald-500/5"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="relative z-10 flex items-center gap-3">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-500",
                status === "processing" ? "bg-cyan-500/20 text-cyan-400" : "bg-emerald-500/20 text-emerald-400"
              )}>
                {status === "processing" ? (
                  <Wand2 size={16} className="animate-pulse" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
              </div>
              
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-white/90">
                  <span>{status === "processing" ? title : "Selesai"}</span>
                  <span className="tabular-nums">{Math.round(progress)}%</span>
                </div>
                
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                  <motion.div 
                    className={cn(
                      "h-full transition-colors duration-500",
                      status === "processing" ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    )}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 20 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
