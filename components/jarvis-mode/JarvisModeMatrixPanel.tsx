"use client";

import { memo, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import type { JarvisMatrixPeriod, JarvisMatrixPoint } from "@/lib/jarvis-mode/types";

const PERIODS: { id: JarvisMatrixPeriod; label: string }[] = [
  { id: "harian", label: "Harian" },
  { id: "mingguan", label: "Mingguan" },
  { id: "bulanan", label: "Bulanan" },
];

type Props = {
  daily: JarvisMatrixPoint[];
  weekly: JarvisMatrixPoint[];
  monthly: JarvisMatrixPoint[];
};

function JarvisModeMatrixPanelInner({ daily, weekly, monthly }: Props) {
  const [period, setPeriod] = useState<JarvisMatrixPeriod>("harian");

  const points = useMemo(() => {
    if (period === "mingguan") return weekly;
    if (period === "bulanan") return monthly;
    return daily;
  }, [period, daily, weekly, monthly]);

  const max = Math.max(1, ...points.map((p) => p.value));

  return (
    <section
      className={cn(
        "jarvis-glass flex h-full min-h-[220px] flex-col rounded-2xl border border-cyan-400/30",
        "bg-black/35 p-4 backdrop-blur-xl sm:p-5",
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/90 dark:text-white">
          Matriks Aktivitas
        </h3>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-black/40 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors sm:px-3 sm:text-xs",
                period === p.id
                  ? "bg-cyan-500/25 text-cyan-100"
                  : "text-white/70 hover:text-white dark:text-white/85",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={period}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2 }}
          className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4"
        >
          {points.length === 0 ? (
            <p className="col-span-full self-center text-center text-sm text-white/70 dark:text-white/90">
              Belum ada data untuk periode ini.
            </p>
          ) : (
            points.map((pt) => (
              <div
                key={`${period}-${pt.label}`}
                className="flex flex-col justify-end rounded-xl border border-white/10 bg-black/25 p-2 sm:p-3"
              >
                <div className="mb-2 h-16 sm:h-20 flex items-end">
                  <motion.div
                    className="w-full rounded-t-md bg-gradient-to-t from-cyan-600/80 to-cyan-400/50"
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(8, (pt.value / max) * 100)}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                  />
                </div>
                <p className="truncate text-[10px] font-medium text-white/80 dark:text-white/90">
                  {pt.label}
                </p>
                <p className="font-mono text-lg font-bold tabular-nums text-white">
                  {pt.value}
                </p>
              </div>
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

export default memo(JarvisModeMatrixPanelInner);
