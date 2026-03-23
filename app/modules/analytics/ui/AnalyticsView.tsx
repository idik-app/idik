"use client";
/**
 * 📊 AnalyticsView
 * ----------------
 * UI untuk menampilkan insight analitik hasil pembelajaran dan data medis.
 */
import { useEffect, useState } from "react";
import { generateInsight } from "../analyticsEngine";
import { HologramUI } from "@/app/interface/ui/holographic/hologramUI";

export default function AnalyticsView() {
  const [insight, setInsight] = useState<{ total: number; insight: string }>();

  useEffect(() => {
    const sample = [
      { tindakan: "PCI", hasil: "baik" },
      { tindakan: "Stenting", hasil: "baik" },
      { tindakan: "Ablasi", hasil: "komplikasi" },
    ];
    setInsight(generateInsight(sample));
  }, []);

  return (
    <HologramUI>
      <h2 className="text-xl font-bold text-cyan-400 mb-3">
        📈 Analytics Overview
      </h2>
      {insight ? (
        <p className="text-gray-300">
          {insight.insight} (Total: {insight.total})
        </p>
      ) : (
        <p className="text-gray-500">Memproses data...</p>
      )}
    </HologramUI>
  );
}
