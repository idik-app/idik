"use client";

import { useState, useEffect, useCallback } from "react";

function isPublicSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function useTindakanData() {

  const [tindakanList, setTindakanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const reload = useCallback(async () => {
    if (!isPublicSupabaseConfigured()) {
      setError(null);
      setTindakanList([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    let data: unknown = null;
    let qErr: unknown = null;
    try {
      const mod = await import("@/lib/supabase/supabaseClient");
      const sb: any = mod.supabase as any;
      const res = await sb
        .from("tindakan")
        .select("*")
        .order("id", { ascending: false }); // FIX HERE
      data = res?.data;
      qErr = res?.error;
    } catch (e: unknown) {
      qErr = e;
    }

    if (qErr) {
      console.error("Error load tindakan:", qErr);
      setError(qErr);
      setTindakanList([]);
    } else {
      setError(null);
      setTindakanList(Array.isArray(data) ? data : []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    tindakanList,
    loading,
    error,
    reload,
  };
}
