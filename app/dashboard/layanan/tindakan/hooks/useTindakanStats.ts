"use client";

import { useCallback, useEffect, useState } from "react";

function isPublicSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function todayWibYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type Stats = Record<string, number>;

export function useTindakanStats() {
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(false);

  const refreshStats = useCallback(async () => {
    if (!isPublicSupabaseConfigured()) {
      setStats({ Total: 0 });
      return;
    }
    setLoading(true);
    try {
      const mod = await import("@/lib/supabase/supabaseClient");
      const sb: any = mod.supabase as any;
      const today = todayWibYmd();

      const { data, error } = await sb
        .from("tindakan")
        .select("status,tanggal");

      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const todayRows = rows.filter((r: any) => {
        const t = r?.tanggal;
        if (t == null || t === "") return false;
        const s = String(t).slice(0, 10);
        return s === today;
      });

      setStats({
        Total: rows.length,
        "Hari ini": todayRows.length,
      });
    } catch {
      setStats({ Total: 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return { stats, refreshStats, loading };
}
