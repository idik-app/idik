"use client";

import { useCallback, useState } from "react";

function isPublicSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function useTindakanCrud() {
  const [loading, setLoading] = useState(false);

  const updateOne = useCallback(
    async (id: string, updates: any) => {
      if (!isPublicSupabaseConfigured()) return false;
      setLoading(true);
      const mod = await import("@/lib/supabase/supabaseClient");
      const sb: any = mod.supabase as any;
      const { error } = await sb.from("tindakan").update(updates).eq("id", id);
      setLoading(false);
      if (error) throw error;
      return true;
    },
    []
  );

  const deleteOne = useCallback(
    async (id: string) => {
      if (!isPublicSupabaseConfigured()) return false;
      setLoading(true);
      const mod = await import("@/lib/supabase/supabaseClient");
      const sb: any = mod.supabase as any;
      const { error } = await sb.from("tindakan").delete().eq("id", id);
      setLoading(false);
      if (error) throw error;
      return true;
    },
    []
  );

  return { loading, updateOne, deleteOne };
}

