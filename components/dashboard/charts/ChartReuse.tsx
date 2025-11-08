"use client";

import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function ChartReuse() {
  const data = [
    { date: "1/11", reuse: 3 },
    { date: "2/11", reuse: 4 },
    { date: "3/11", reuse: 6 },
    { date: "4/11", reuse: 5 },
    { date: "5/11", reuse: 7 },
  ];

  return (
    <div className="bg-black/40 border border-cyan-500/30 rounded-xl p-4 shadow-lg">
      <p className="text-sm text-cyan-300 mb-2">Tren Reuse Alkes</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <XAxis dataKey="date" stroke="#22d3ee" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="reuse"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={{ fill: "#facc15" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
