"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type JarvisModeStatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  variant?: "admin" | "critical" | "ppci" | "neutral";
  sublines?: string[];
  loading?: boolean;
};

const variantStyles = {
  admin: {
    border: "border-cyan-400/35",
    glow: "shadow-[0_0_24px_rgba(0,224,255,0.12)]",
    icon: "text-cyan-300",
    value: "text-cyan-50",
    label: "text-cyan-200/90",
  },
  neutral: {
    border: "border-white/20",
    glow: "shadow-[0_0_16px_rgba(255,255,255,0.06)]",
    icon: "text-white/80",
    value: "text-white",
    label: "text-white/85",
  },
  ppci: {
    border: "border-amber-400/45",
    glow: "shadow-[0_0_28px_rgba(251,191,36,0.18)]",
    icon: "text-amber-300",
    value: "text-amber-100",
    label: "text-amber-200/90",
  },
  critical: {
    border: "border-rose-400/50",
    glow: "shadow-[0_0_32px_rgba(244,63,94,0.22)]",
    icon: "text-rose-300",
    value: "text-rose-50",
    label: "text-rose-200/90",
  },
} as const;

function JarvisModeStatCardInner({
  label,
  value,
  icon: Icon,
  variant = "admin",
  sublines,
  loading,
}: JarvisModeStatCardProps) {
  const v = variantStyles[variant];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "jarvis-glass relative overflow-hidden rounded-2xl border p-4 sm:p-5",
        "bg-black/35 backdrop-blur-xl",
        v.border,
        v.glow,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-cyan-500/[0.04]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em]",
              v.label,
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "mt-2 font-mono text-3xl sm:text-4xl lg:text-5xl font-bold tabular-nums leading-none",
              v.value,
              loading && "animate-pulse opacity-60",
            )}
          >
            {loading ? "—" : value.toLocaleString("id-ID")}
          </p>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30",
            v.icon,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      {sublines && sublines.length > 0 ? (
        <ul className="relative mt-3 space-y-0.5 border-t border-white/10 pt-2">
          {sublines.slice(0, 3).map((line) => (
            <li
              key={line}
              className="truncate font-mono text-[10px] sm:text-xs text-white/75 dark:text-white/90"
            >
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </motion.article>
  );
}

export default memo(JarvisModeStatCardInner);
