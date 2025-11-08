"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

export default function InventarisContent() {
  const [data] = useState([
    { nama: "Stent Supraflex", stok: 12, ed: "2026-04", status: "Aman" },
    {
      nama: "Balloon Ryujin",
      stok: 4,
      ed: "2025-12",
      status: "ED &lt; 6 bulan",
    },
    { nama: "Microcatheter", stok: 1, ed: "2025-11", status: "Stok minimum" },
  ]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-cyan-400">
          Inventaris Cathlab
        </h2>
        <p className="text-sm text-gray-400">
          Pemantauan alat dan stok kritis dalam mode <strong>JARVIS</strong>.
        </p>
      </div>

      {/* Summary Section */}
      <div className="bg-gray-800/50 p-4 rounded-2xl shadow-inner">
        <span>
          Beberapa item sudah mendekati <strong>stok minimum</strong> atau{" "}
          <strong>ED &lt; 6 bulan</strong>.
        </span>
      </div>

      {/* Data Table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.map((item, i) => (
          <Card
            key={i}
            className="bg-gray-900/70 border border-cyan-700/40 p-4 rounded-xl hover:shadow-cyan-500/20 transition"
          >
            <h3 className="text-lg font-medium text-gray-100">{item.nama}</h3>
            <p className="text-sm text-gray-400">Stok: {item.stok}</p>
            <p
              className={`text-sm ${
                item.status.includes("ED")
                  ? "text-yellow-400"
                  : "text-green-400"
              }`}
            >
              Status: {item.status}
            </p>
            <p className="text-xs text-gray-500 mt-1">ED: {item.ed}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
