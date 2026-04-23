"use client";

import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from "recharts";
import { format } from "date-fns";
import { useFlowSheetStore } from "@/lib/store/useFlowSheetStore";

interface HemodynamicChartProps {
  columns: Date[];
  width: number;
}

export default function HemodynamicChart({ columns, width }: HemodynamicChartProps) {
  const { data } = useFlowSheetStore();

  // Prepare data for Recharts
  const chartData = useMemo(() => {
    return columns.map((col) => {
      const ts = format(col, "yyyy-MM-dd'T'HH:mm:ss");
      return {
        time: format(col, "HH:mm"),
        hr: Number(data["hr"]?.[ts]) || null,
        sys: Number(data["bp_s"]?.[ts]) || null,
        dia: Number(data["bp_d"]?.[ts]) || null,
        map: Number(data["map"]?.[ts]) || null,
      };
    });
  }, [columns, data]);

  return (
    <div className="h-48 w-full bg-zinc-950/50 backdrop-blur-sm border-b border-zinc-800/50 py-4" style={{ width: `${width}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorBp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis 
            dataKey="time" 
            hide 
          />
          <YAxis 
            yAxisId="left"
            domain={[0, 200]} 
            stroke="#52525b" 
            fontSize={10} 
            tickFormatter={(val) => `${val}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", fontSize: "10px" }}
            itemStyle={{ fontSize: "10px", padding: "0" }}
          />
          
          {/* BP Area (Systolic to Diastolic range feel) */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="sys"
            stroke="#60a5fa"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorBp)"
            dot={{ r: 2, fill: "#60a5fa" }}
            name="Systolic"
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="dia"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={0}
            dot={{ r: 2, fill: "#3b82f6" }}
            name="Diastolic"
          />
          
          {/* HR Line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="hr"
            stroke="#f87171"
            strokeWidth={2}
            dot={{ r: 3, fill: "#ef4444" }}
            name="Heart Rate"
          />

          {/* Reference Line for MAP 65 (Critical) */}
          <ReferenceLine yAxisId="left" y={65} stroke="#7f1d1d" strokeDasharray="3 3" label={{ position: 'right', value: 'MAP 65', fill: '#7f1d1d', fontSize: 8 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
