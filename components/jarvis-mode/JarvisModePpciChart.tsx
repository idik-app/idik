"use client";

import { memo } from "react";
import {
  Area,
  ComposedChart,
  Line,
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
  compact?: boolean;
};

const PERIODS: { id: Period; label: string }[] = [
  { id: "harian", label: "D" },
  { id: "mingguan", label: "W" },
  { id: "bulanan", label: "M" },
];

function JarvisModePpciChartInner({
  daily,
  weekly,
  monthly,
  period,
  onPeriodChange,
  compact = false,
}: Props) {
  const data =
    period === "mingguan" ? weekly : period === "bulanan" ? monthly : daily;

  return (
    <JarvisModeGlassPanel title="PPCI" accent="amber" compact={compact}>
      <div className="flex h-full min-h-0 flex-col gap-1">
        <div className="flex shrink-0 gap-0.5 rounded border border-white/10 bg-black/30 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPeriodChange(p.id)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[8px] font-bold uppercase transition-colors",
                period === p.id
                  ? "bg-amber-500/30 text-amber-100"
                  : "text-white/70 hover:text-white",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 2, right: 4, left: -22, bottom: 0 }}
            >
              <defs>
                <linearGradient id="jarvisPpciFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.42} />
                  <stop offset="85%" stopColor="#fbbf24" stopOpacity={0.04} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
                <filter id="jarvisPpciGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 8 }}
                axisLine={{ stroke: "rgba(0,224,255,0.2)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 8 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={24}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(6,12,20,0.92)",
                  border: "1px solid rgba(0,224,255,0.35)",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: 10,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                fill="url(#jarvisPpciFill)"
                stroke="none"
                isAnimationActive
                animationDuration={900}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#fbbf24"
                strokeWidth={2.25}
                dot={false}
                filter="url(#jarvisPpciGlow)"
                activeDot={{ r: 3.5, fill: "#fde68a", stroke: "#fff", strokeWidth: 1 }}
                isAnimationActive
                animationDuration={1100}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </JarvisModeGlassPanel>
  );
}

export default memo(JarvisModePpciChartInner);
