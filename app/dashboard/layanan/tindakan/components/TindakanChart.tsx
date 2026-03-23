"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { getTindakanMingguan } from "@/app/dashboard/layanan/tindakan/actions/getTindakanMingguan";

const dayToLabel: Record<string, string> = {
  Sen: "Senin",
  Sel: "Selasa",
  Rab: "Rabu",
  Kam: "Kamis",
  Jum: "Jumat",
  Sab: "Sabtu",
  Min: "Minggu",
};

export default function TindakanChart() {
  const [data, setData] = useState<{ name: string; jumlah: number }[]>([]);

  useEffect(() => {
    void getTindakanMingguan().then((points) => {
      setData(
        points.map((p) => ({
          name: dayToLabel[p.day] ?? p.day,
          jumlah: p.total,
        }))
      );
    });
  }, []);

  return (
    <div className="rounded-xl bg-black/40 border border-cyan-900/40 p-4">
      <h2 className="text-cyan-300 font-semibold mb-3 text-sm">
        Aktivitas Mingguan
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <XAxis dataKey="name" stroke="#00FFFF" />
          <YAxis stroke="#00FFFF" />
          <Tooltip cursor={{ fill: "#082f3e" }} />
          <Bar dataKey="jumlah" fill="#00FFFF" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
