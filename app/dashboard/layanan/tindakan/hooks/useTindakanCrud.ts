"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";

export function useTindakanCrud() {
  const [loading, setLoading] = useState(false);

  const updateOne = useCallback(
    async (id: string, updates: any) => {
      setLoading(true);
      const { error } = await (supabase as any).from("tindakan").update(updates).eq("id", id);
      setLoading(false);
      if (error) throw error;
      return true;
    },
    []
  );

  const deleteOne = useCallback(
    async (id: string) => {
      setLoading(true);
      const { error } = await supabase.from("tindakan").delete().eq("id", id);
      setLoading(false);
      if (error) throw error;
      return true;
    },
    []
  );

  return { loading, updateOne, deleteOne };
}

