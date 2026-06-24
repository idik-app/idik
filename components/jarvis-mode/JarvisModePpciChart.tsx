"use client";

import { memo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { JarvisTrendPoint } from "@/lib/jarvis-mode/types";
import { cn } from "@/lib/utils";

import JarvisModeGlassPanel from "./JarvisModeGlassPanel";

type Period = "harian" | "mingguan" | "bulanan";

type Props = {
  daily: JarvisTrendPoint[];
  weekly: JarvisTrendPoint[];
  monthly: JarvisTrendPoint[];
  period: Period;
  onPeriodChange: (p: Period) => void;
};

const PERIODS: { id: Period; label: string }[] = [
  { id: "harian", label: "Daily" },
  { id: "mingguan", label: "Weekly" },
  { id: "bulanan", label: "Monthly" },
];

function JarvisModePpciChartInner({
  daily,
  weekly,
  monthly,
  period,
  onPeriodChange,
}: Props) {
  const data =
    period === "mingguan" ? weekly : period === "bulanan" ? monthly : daily;

  return (
    <JarvisModeGlassPanel title="Laporan PPCI" accent="amber">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-black/30 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPeriodChange(p.id)}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                period === p.id
                  ? "bg-amber-500/25 text-amber-100"
                  : "text-white/70 hover:text-white dark:text-white/85",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[9px] text-white/75 dark:text-white/90">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Harian
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Mingguan
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Bulanan
          </span>
        </div>
      </div>
      <div className="h-[min(220px,100%)] min-h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 10 }}
              axisLine={{ stroke: "rgba(0,224,255,0.25)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(6,12,20,0.92)",
                border: "1px solid rgba(0,224,255,0.35)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#fbbf24"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#fbbf24", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#fde68a" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </JarvisModeGlassPanel>
  );
}

export default memo(JarvisModePpciChartInner);
