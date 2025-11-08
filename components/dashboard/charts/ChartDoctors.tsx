"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function ChartDoctors() {
  const data = [
    { name: "Dr. Deo", value: 18 },
    { name: "Dr. Faishal", value: 12 },
    { name: "Dr. Samuel", value: 8 },
    { name: "Dr. Andrianus", value: 6 },
  ];

  const colors = ["#22d3ee", "#38bdf8", "#67e8f9", "#facc15"];

  return (
    <div className="bg-black/40 border border-cyan-500/30 rounded-xl p-4 shadow-lg">
      <p className="text-sm text-cyan-300 mb-2">
        Distribusi Tindakan per Dokter
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={70}
            dataKey="value"
            label
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
