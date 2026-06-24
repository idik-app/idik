"use client";

import { memo, type ReactNode } from "react";
import { GripHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  accent?: "cyan" | "amber" | "rose" | "neutral";
  dragHandle?: boolean;
  compact?: boolean;
};

const accentBorder = {
  cyan: "border-cyan-400/35 shadow-[0_0_32px_rgba(0,224,255,0.08),inset_0_1px_0_rgba(255,255,255,0.12)]",
  amber: "border-amber-400/40 shadow-[0_0_32px_rgba(251,191,36,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]",
  rose: "border-rose-400/40 shadow-[0_0_32px_rgba(244,63,94,0.12),inset_0_1px_0_rgba(255,255,255,0.1)]",
  neutral:
    "border-white/20 shadow-[0_0_24px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)]",
};

function JarvisModeGlassPanelInner({
  title,
  children,
  className,
  accent = "cyan",
  dragHandle = true,
  compact,
}: Props) {
  return (
    <div
      className={cn(
        "jarvis-glass relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border",
        "bg-white/[0.06] backdrop-blur-xl",
        accentBorder[accent],
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-cyan-500/[0.04]" />
      <header
        className={cn(
          "relative flex shrink-0 items-center justify-between gap-2 border-b border-white/10",
          compact ? "px-2.5 py-1.5" : "px-3 py-2 sm:px-4 sm:py-2.5",
        )}
      >
        <h3
          className={cn(
            "truncate font-semibold uppercase tracking-[0.16em] text-white dark:text-white",
            compact ? "text-[9px]" : "text-[10px] sm:text-[11px]",
          )}
        >
          {title}
        </h3>
        {dragHandle ? (
          <span
            className="jarvis-drag-handle flex cursor-grab items-center text-cyan-300/60 active:cursor-grabbing"
            aria-hidden
          >
            <GripHorizontal className="h-4 w-4" />
          </span>
        ) : null}
      </header>
      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-auto",
          compact ? "p-2.5" : "p-3 sm:p-4",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default memo(JarvisModeGlassPanelInner);
