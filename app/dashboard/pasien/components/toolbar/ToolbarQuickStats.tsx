"use client";
import { useEffect, useState } from "react";

export function ToolbarQuickStats() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/pasien/stats");
        if (!res.ok) return;

        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error("Failed to load stats:", e);
      }
    }

    load();
  }, []);

  if (!stats) return null;

  const items = [
    { icon: "👥", label: "Total", value: stats.total },
    { icon: "🧍", label: "L", value: stats.laki },
    { icon: "🧍‍♀️", label: "P", value: stats.perempuan },
    { icon: "💳", label: "BPJS", value: stats.bpjs },
    { icon: "💼", label: "Umum", value: stats.umum },
    { icon: "🩺", label: "Asuransi", value: stats.asuransi },
  ];

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-1 px-2 py-1 bg-black/40 border border-cyan-400/40
            rounded-full text-cyan-300 hover:bg-cyan-900/20 cursor-pointer"
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
          <span className="font-bold text-amber-400">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
