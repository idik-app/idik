"use client";
import React from "react";

export default function PasienLiveStatus({
  isLive,
  total,
}: {
  isLive: boolean;
  total?: number;
}) {
  return (
    <div className="flex justify-between items-center px-3 py-2 bg-black/30 border-b border-yellow-500/30">
      <span className="text-cyan-300 text-sm">
        Total Pasien:{" "}
        <span className="font-semibold text-cyan-100">{total ?? 0}</span>
      </span>
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          isLive
            ? "bg-green-500/20 text-green-400 border-green-500/40"
            : "bg-red-500/20 text-red-400 border-red-500/40"
        }`}
      >
        {isLive ? "🟢 LIVE DATA" : "🔴 OFFLINE (CACHE)"}
      </span>
    </div>
  );
}
