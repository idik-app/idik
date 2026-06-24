"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  autoSleepRemainingMs: number;
  autoSleepMs: number;
  compact?: boolean;
};

function JarvisModeCloseButtonInner({
  onClose,
  autoSleepRemainingMs,
  autoSleepMs,
  compact = false,
}: Props) {
  const progress =
    autoSleepMs > 0
      ? Math.max(0, Math.min(1, autoSleepRemainingMs / autoSleepMs))
      : 1;
  const circumference = 2 * Math.PI * 20;
  const seconds = Math.ceil(autoSleepRemainingMs / 1000);

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClose}
        className={cn(
          "relative flex h-7 w-7 items-center justify-center rounded-md border border-white/20",
          "bg-black/40 text-cyan-100 transition hover:border-cyan-400/45 hover:text-white",
        )}
        aria-label="Tutup JARVIS Mode"
        title={`Tutup (${seconds}s)`}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className={cn(
          "group relative flex h-[72px] w-[72px] flex-col items-center justify-center gap-0.5",
          "rounded-xl border border-white/25 bg-white/[0.08] backdrop-blur-xl",
          "shadow-[0_0_24px_rgba(0,224,255,0.12),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "transition hover:border-cyan-400/50 hover:bg-white/[0.12]",
        )}
        aria-label="Tutup JARVIS Mode (ESC atau gerakkan mouse)"
        title="TUTUP (ESC)"
      >
        <svg
          className="pointer-events-none absolute inset-1 -rotate-90"
          viewBox="0 0 64 64"
          aria-hidden
        >
          <circle
            cx="32"
            cy="32"
            r="20"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2.5"
          />
          <motion.circle
            cx="32"
            cy="32"
            r="20"
            fill="none"
            stroke="rgba(0,224,255,0.9)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: circumference * (1 - progress) }}
            transition={{ duration: 0.25, ease: "linear" }}
          />
        </svg>
        <X className="relative h-5 w-5 text-cyan-100 group-hover:text-white" />
        <span className="relative text-[9px] font-bold uppercase tracking-[0.14em] text-white/90">
          Tutup
        </span>
      </button>
      <p className="max-w-[88px] text-right text-[9px] leading-tight text-white/70 dark:text-white/85">
        CLOSE
        <br />
        <span className="text-cyan-300/90">(or Move Mouse)</span>
      </p>
      <p className="font-mono text-[9px] tabular-nums text-cyan-300/80">
        {seconds}s
      </p>
    </div>
  );
}

export default memo(JarvisModeCloseButtonInner);
