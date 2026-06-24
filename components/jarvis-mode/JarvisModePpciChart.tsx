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
            <LineChart
              data={data}
              margin={{ top: 2, right: 4, left: -22, bottom: 0 }}
            >
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
              <Line
                type="monotone"
                dataKey="value"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: "#fde68a" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </JarvisModeGlassPanel>
  );
}

export default memo(JarvisModePpciChartInner);
