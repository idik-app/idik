"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  autoSleepRemainingMs: number;
  autoSleepMs: number;
};

function JarvisModeCloseButtonInner({
  onClose,
  autoSleepRemainingMs,
  autoSleepMs,
}: Props) {
  const progress =
    autoSleepMs > 0
      ? Math.max(0, Math.min(1, autoSleepRemainingMs / autoSleepMs))
      : 1;
  const circumference = 2 * Math.PI * 22;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClose}
        className={cn(
          "group relative flex h-14 w-14 items-center justify-center rounded-full",
          "border border-white/20 bg-black/50 text-white/90 backdrop-blur-md",
          "transition hover:border-cyan-400/50 hover:bg-black/70",
        )}
        aria-label="Tutup JARVIS Mode (ESC)"
        title="Tutup (ESC)"
      >
        <svg
          className="absolute inset-0 -rotate-90"
          width="56"
          height="56"
          viewBox="0 0 56 56"
          aria-hidden
        >
          <circle
            cx="28"
            cy="28"
            r="22"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="3"
          />
          <motion.circle
            cx="28"
            cy="28"
            r="22"
            fill="none"
            stroke="rgba(0,224,255,0.85)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.25, ease: "linear" }}
          />
        </svg>
        <X className="relative h-5 w-5 text-cyan-200 group-hover:text-white" />
      </button>
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 dark:text-white/90">
          Close
        </p>
        <p className="font-mono text-[10px] tabular-nums text-cyan-300/90">
          Auto-sleep {Math.ceil(autoSleepRemainingMs / 1000)}s
        </p>
        <p className="mt-0.5 text-[9px] text-white/60 dark:text-white/75">
          Tekan <kbd className="rounded border border-white/20 px-1">ESC</kbd>
        </p>
      </div>
    </div>
  );
}

export default memo(JarvisModeCloseButtonInner);
