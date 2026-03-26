// Minimal implementation to satisfy dashboard usage.
"use client";

import { useCallback, useEffect, useState } from "react";

type Stats = Record<string, number>;

function isPublicSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

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
      const { count } = await sb
        .from("tindakan")
        .select("*", { count: "exact", head: true });
      setStats({ Total: count ?? 0 });
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
