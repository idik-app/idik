"use client";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getTindakanMingguan } from "../actions/getTindakanMingguan";

interface DataPoint {
  day: string;
  total: number;
}

export default function ChartTindakanMingguan() {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    getTindakanMingguan().then(setData);
  }, []);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-cyan-950 rounded-2xl p-4 shadow-lg border border-cyan-700/30">
      <h3 className="text-lg font-semibold text-cyan-400 mb-3">
        Tren Mingguan Tindakan
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <XAxis dataKey="day" stroke="#00FFFF" />
          <YAxis stroke="#00FFFF" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0b1e2d",
              border: "1px solid #00FFFF",
            }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#00FFFF"
            strokeWidth={3}
            dot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
