"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";

export function useTindakanData() {

  const [tindakanList, setTindakanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const reload = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("tindakan")
      .select("*")
      .order("id", { ascending: false }); // FIX HERE

    if (error) {
      console.error("Error load tindakan:", error);
      setError(error);
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
