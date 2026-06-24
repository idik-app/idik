"use client";

import { memo } from "react";
import { motion } from "framer-motion";

import type { JarvisMatrixReportRow } from "@/lib/jarvis-mode/types";
import { cn } from "@/lib/utils";

import JarvisModeGlassPanel from "./JarvisModeGlassPanel";

type Props = {
  rows: JarvisMatrixReportRow[];
};

function MiniBar({ pct }: { pct: number }) {
  return (
    <div className="flex h-8 items-end justify-center gap-0.5">
      {[0.35, 0.65, 1].map((scale, i) => (
        <motion.div
          key={i}
          className="w-2 rounded-t-sm bg-gradient-to-t from-cyan-700/80 to-cyan-400/70"
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(4, pct * scale * 0.28)}px` }}
          transition={{ type: "spring", stiffness: 120, damping: 16, delay: i * 0.04 }}
        />
      ))}
    </div>
  );
}

function Cell({ value, pct }: { value: number; pct: number }) {
  return (
    <td className="border border-white/10 px-2 py-2 text-center align-bottom">
      <MiniBar pct={pct} />
      <p className="mt-1 font-mono text-sm font-bold tabular-nums text-white">
        {value}
      </p>
      <p className="font-mono text-[10px] tabular-nums text-cyan-300/90">
        {pct}%
      </p>
    </td>
  );
}

function JarvisModeMatrixReportInner({ rows }: Props) {
  return (
    <JarvisModeGlassPanel title="Laporan Matrix" accent="cyan">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em] text-white/80 dark:text-white/90">
              <th className="border border-white/10 px-2 py-2 font-semibold">
                Metrik
              </th>
              <th className="border border-white/10 px-2 py-2 text-center font-semibold">
                Harian
              </th>
              <th className="border border-white/10 px-2 py-2 text-center font-semibold">
                Mingguan
              </th>
              <th className="border border-white/10 px-2 py-2 text-center font-semibold">
                Bulanan
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td
                  className={cn(
                    "border border-white/10 px-2 py-2 text-xs font-medium text-white dark:text-white",
                    row.label.includes("PPCI") && "text-amber-200",
                  )}
                >
                  {row.label}
                </td>
                <Cell value={row.harian} pct={row.harianPct} />
                <Cell value={row.mingguan} pct={row.mingguanPct} />
                <Cell value={row.bulanan} pct={row.bulananPct} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </JarvisModeGlassPanel>
  );
}

export default memo(JarvisModeMatrixReportInner);
