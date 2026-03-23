"use client";
import { useCallback, useEffect, useState } from "react";
import { tindakanRepository } from "../data/tindakanRepository";
import { Tindakan } from "../domain/tindakan";

/** 🧠 useTindakanStats v6.9 — mendukung refreshStats() */
export function useTindakanStats() {
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
  });

  const [trendData, setTrendData] = useState<
    { tanggal: string; count: number }[]
  >([]);

  const [loading, setLoading] = useState(true);

  /** 🔁 Fungsi refresh data manual */
  const refreshStats = useCallback(async () => {
    setLoading(true);
    try {
      const list: Tindakan[] = await tindakanRepository.getAll();
      if (!Array.isArray(list)) throw new Error("Invalid tindakan data");

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let today = 0;
      let week = 0;
      let month = 0;
      const trendMap: Record<string, number> = {};

      for (const t of list) {
        const tanggal = (t as any)?.tanggal ?? (t as any)?.created_at;
        if (!tanggal) continue;
        const d = new Date(tanggal);
        const key = d.toISOString().split("T")[0];

        if (key === todayStr) today++;
        if (d >= startOfWeek) week++;
        if (d >= startOfMonth) month++;
        trendMap[key] = (trendMap[key] || 0) + 1;
      }

      const trend = Object.entries(trendMap)
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([tanggal, count]) => ({ tanggal, count }));

      setStats({ today, week, month, total: list.length });
      setTrendData(trend);
    } catch (err) {
      console.error("❌ Gagal memuat statistik tindakan:", err);
      setStats({ today: 0, week: 0, month: 0, total: 0 });
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 🔄 Auto-load saat mount */
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return { stats, trendData, loading, refreshStats };
}
