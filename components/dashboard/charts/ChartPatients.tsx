"use client";

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function ChartPatients() {
  const data = [
    { day: "Sen", value: 12 },
    { day: "Sel", value: 9 },
    { day: "Rab", value: 14 },
    { day: "Kam", value: 8 },
    { day: "Jum", value: 11 },
  ];

  return (
    <div className="bg-black/40 border border-cyan-500/30 rounded-xl p-4 shadow-lg">
      <p className="text-sm text-cyan-300 mb-2">Pasien per Hari</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="day" stroke="#22d3ee" />
          <Tooltip cursor={{ fill: "rgba(34,211,238,0.1)" }} />
          <Bar dataKey="value" fill="#22d3ee" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
