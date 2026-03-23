"use client";
import React from "react";

export function PasienHeader({
  total,
  isLive,
}: {
  total: number;
  isLive: boolean;
}) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold text-cyan-400">
        Daftar Pasien <span className="text-sm text-gray-400">({total})</span>
      </h2>
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isLive
            ? "bg-green-500/20 text-green-400 border border-green-500/40"
            : "bg-red-500/20 text-red-400 border border-red-500/40"
        }`}
      >
        {isLive ? "🟢 LIVE DATA" : "🔴 OFFLINE (CACHE)"}
      </span>
    </div>
  );
}
