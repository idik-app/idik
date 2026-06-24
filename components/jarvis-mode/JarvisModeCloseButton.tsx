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
          "jarvis-close-btn jarvis-close-btn--cycle group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          "border border-rose-400/55 bg-gradient-to-br from-rose-500/25 via-[#1a0a12] to-cyan-950/80",
          "text-rose-100",
          "transition hover:border-rose-300 hover:text-white",
        )}
        aria-label="Tutup JARVIS Mode"
        title={`Tutup · auto-sleep ${seconds}s · ESC`}
      >
        <svg
          className="pointer-events-none absolute inset-0 -rotate-90"
          viewBox="0 0 32 32"
          aria-hidden
        >
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.5"
          />
          <motion.circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="rgba(0,224,255,0.75)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 13}
            animate={{
              strokeDashoffset: 2 * Math.PI * 13 * (1 - progress),
            }}
            transition={{ duration: 0.25, ease: "linear" }}
          />
        </svg>
        <span className="jarvis-close-pulse-ring" aria-hidden />
        <span className="jarvis-close-pulse-ring jarvis-close-pulse-ring--delay" aria-hidden />
        <motion.span
          className="absolute inset-0 rounded-full bg-rose-400/20"
          animate={{ opacity: [0.25, 0.55, 0.25], scale: [0.92, 1, 0.92] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
        <X
          className="relative z-[1] h-3.5 w-3.5 transition group-hover:scale-110"
          strokeWidth={2.75}
        />
        <span className="sr-only">Tutup</span>
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
