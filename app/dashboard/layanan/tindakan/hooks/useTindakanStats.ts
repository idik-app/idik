// Minimal implementation to satisfy dashboard usage.
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";

type Stats = Record<string, number>;

export function useTindakanStats() {
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(false);

  const refreshStats = useCallback(async () => {
    setLoading(true);
    const { count } = await supabase
      .from("tindakan")
      .select("*", { count: "exact", head: true });
    setStats({ Total: count ?? 0 });
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return { stats, refreshStats, loading };
}
